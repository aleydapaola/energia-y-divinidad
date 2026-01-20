import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { prisma } from '@/lib/prisma'
import { revalidateSanityDocument } from '@/lib/sanity/revalidate'

interface SanityWebhookPayload {
  _id: string
  _type: string
  _rev: string
  slug?: { current: string }
}

/**
 * Verify HMAC-SHA256 signature from Sanity webhook
 */
function verifySignature(body: string, signature: string | null): boolean {
  const secret = process.env.SANITY_WEBHOOK_SECRET
  if (!secret || !signature) return false

  const hmac = createHmac('sha256', secret)
  hmac.update(body)
  const expectedSignature = hmac.digest('hex')

  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
  } catch {
    return false
  }
}

/**
 * POST /api/webhooks/sanity
 *
 * Handle Sanity webhook events for ISR revalidation
 *
 * Triggers:
 * - Document created
 * - Document updated
 * - Document deleted
 *
 * Sanity sends:
 * - Header 'sanity-webhook-signature': HMAC-SHA256 signature
 * - Header 'sanity-operation': create | update | delete
 * - Body: { _id, _type, _rev, slug }
 */
export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('sanity-webhook-signature')

  // 1. Verify signature
  if (!verifySignature(body, signature)) {
    console.error('[WEBHOOK/SANITY] Invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // 2. Parse payload
  let payload: SanityWebhookPayload
  try {
    payload = JSON.parse(body)
  } catch {
    console.error('[WEBHOOK/SANITY] Invalid JSON payload')
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Validate required fields
  if (!payload._id || !payload._type || !payload._rev) {
    console.error('[WEBHOOK/SANITY] Missing required fields in payload')
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Get operation from header (create, update, delete)
  const operation = request.headers.get('sanity-operation') || 'update'

  // 3. Generate unique eventId for idempotency
  const eventId = `sanity_${payload._id}_${payload._rev}`

  // 4. Idempotency check
  const existingEvent = await prisma.webhookEvent.findUnique({
    where: { eventId },
  })

  if (existingEvent?.processed) {
    console.log(`[WEBHOOK/SANITY] Event ${eventId} already processed`)
    return NextResponse.json({ received: true, processed: false })
  }

  // 5. Register event as received
  await prisma.webhookEvent.upsert({
    where: { eventId },
    create: {
      provider: 'sanity',
      eventId,
      eventType: `${payload._type}.${operation}`,
      payload: payload as object,
      processed: false,
    },
    update: {},
  })

  // 6. Process revalidation
  try {
    await revalidateSanityDocument({
      documentId: payload._id,
      documentType: payload._type,
      operation,
      slug: payload.slug?.current,
    })

    // 7. Mark as processed
    await prisma.webhookEvent.update({
      where: { eventId },
      data: {
        processed: true,
        processedAt: new Date(),
      },
    })

    console.log(`[WEBHOOK/SANITY] Successfully processed ${payload._type}.${operation}`)
    return NextResponse.json({ received: true, processed: true })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[WEBHOOK/SANITY] Error processing:`, error)

    await prisma.webhookEvent.update({
      where: { eventId },
      data: {
        failed: true,
        errorMessage,
        retryCount: { increment: 1 },
      },
    })

    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}
