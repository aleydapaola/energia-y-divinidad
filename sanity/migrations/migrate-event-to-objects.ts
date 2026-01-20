/**
 * Migración: event → objetos reutilizables
 *
 * Este script migra los eventos existentes para usar los nuevos objetos:
 * - pricing: Agrupa price, priceUSD, memberDiscount en un objeto
 * - membershipAccess: Agrupa includedInMembership, requiresMembership, membershipTiers
 *
 * Ejecutar con:
 * cd sanity && npx sanity exec migrations/migrate-event-to-objects.ts --with-user-token
 *
 * Para producción:
 * cd sanity && npx sanity exec migrations/migrate-event-to-objects.ts --with-user-token --dataset production
 */

import { getCliClient } from 'sanity/cli'

interface LegacyEvent {
  _id: string
  title?: string
  price?: number
  priceUSD?: number
  memberDiscount?: number
  includedInMembership?: boolean
  requiresMembership?: boolean
  membershipTiers?: Array<{ _ref: string }>
  pricing?: {
    _type: string
    price?: number
    priceUSD?: number
  }
  membershipAccess?: {
    _type: string
    includedInMembership?: boolean
  }
}

const client = getCliClient()

async function migrateEvents() {
  console.log('🔍 Buscando eventos para migrar...')

  const events = await client.fetch<LegacyEvent[]>(`*[_type == "event"]`)
  console.log(`📦 Encontrados ${events.length} eventos`)

  let migratedCount = 0
  let skippedCount = 0
  let errorCount = 0

  for (const event of events) {
    const patch = client.patch(event._id)
    let hasChanges = false

    // Verificar si ya tiene el objeto pricing migrado
    const alreadyHasPricing = event.pricing?._type === 'pricing'
    const alreadyHasMembershipAccess = event.membershipAccess?._type === 'membershipAccess'

    // Migrar pricing si hay campos legacy y no está migrado
    if (!alreadyHasPricing && (event.price !== undefined || event.priceUSD !== undefined)) {
      patch.set({
        pricing: {
          _type: 'pricing',
          price: event.price || 0,
          priceUSD: event.priceUSD || 0,
          compareAtPrice: undefined,
          compareAtPriceUSD: undefined,
          memberDiscount: event.memberDiscount || 0,
          isFree: (event.price === 0 && event.priceUSD === 0) || false,
        },
      })
      hasChanges = true
    }

    // Migrar membershipAccess si hay campos legacy y no está migrado
    if (
      !alreadyHasMembershipAccess &&
      (event.includedInMembership !== undefined || event.requiresMembership !== undefined)
    ) {
      patch.set({
        membershipAccess: {
          _type: 'membershipAccess',
          includedInMembership: event.includedInMembership || false,
          membershipTiers: event.membershipTiers || [],
          memberOnlyPurchase: event.requiresMembership && !event.includedInMembership,
        },
      })
      hasChanges = true
    }

    if (hasChanges) {
      try {
        await patch.commit()
        console.log(`✓ Migrado: ${event.title || event._id}`)
        migratedCount++
      } catch (error) {
        console.error(`✗ Error migrando ${event._id}:`, error)
        errorCount++
      }
    } else {
      console.log(`⏭ Omitido (ya migrado o sin campos legacy): ${event.title || event._id}`)
      skippedCount++
    }
  }

  console.log('\n📊 Resumen de migración:')
  console.log(`   ✓ Migrados: ${migratedCount}`)
  console.log(`   ⏭ Omitidos: ${skippedCount}`)
  console.log(`   ✗ Errores: ${errorCount}`)
  console.log('\n✅ Migración completada!')
}

migrateEvents().catch(console.error)
