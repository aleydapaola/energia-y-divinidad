import { revalidateTag, revalidatePath } from 'next/cache'
import { syncMembershipPost } from '@/lib/membership-posts'

export interface RevalidateParams {
  documentId: string
  documentType: string
  operation: string
  slug?: string
}

/**
 * Document type to cache tags mapping
 * These tags are used by sanityFetch() and invalidated on content changes
 */
const DOCUMENT_TAG_MAP: Record<string, string[]> = {
  event: ['event'],
  course: ['course'],
  courseLesson: ['course', 'lesson'],
  courseModule: ['course'],
  courseResource: ['course'],
  sessionConfig: ['session'],
  bookingSettings: ['session', 'booking'],
  membershipTier: ['membership'],
  membershipPost: ['membership-post'],
  page: ['page'],
  blogPost: ['blog'],
  product: ['product'],
  premiumContent: ['premium'],
  freeContent: ['free-content'],
  discountCode: ['discount'],
}

/**
 * Document type to static paths mapping
 * These paths are always revalidated when the document type changes
 */
const DOCUMENT_PATH_MAP: Record<string, string[]> = {
  event: ['/', '/eventos'],
  course: ['/', '/academia'],
  sessionConfig: ['/sesiones'],
  membershipTier: ['/membresia'],
  blogPost: ['/blog'],
  product: ['/tienda'],
}

/**
 * Get slug-specific paths for a document type
 */
function getSlugPaths(documentType: string, slug: string): string[] {
  switch (documentType) {
    case 'event':
      return [`/eventos/${slug}`]
    case 'course':
      return [`/academia/${slug}`, `/academia/${slug}/reproducir`]
    case 'courseLesson':
      // Lessons are nested under courses, we revalidate via tags
      return []
    case 'page':
      // Handle both custom pages and legal pages
      return [`/${slug}`]
    case 'blogPost':
      return [`/blog/${slug}`]
    case 'product':
      return [`/tienda/${slug}`]
    default:
      return []
  }
}

/**
 * Handle database synchronization for specific document types
 */
async function handleDatabaseSync(params: RevalidateParams): Promise<void> {
  const { documentId, documentType, operation, slug } = params

  // MembershipPost: Sync to Prisma for engagement tracking
  if (documentType === 'membershipPost' && slug && operation !== 'delete') {
    try {
      await syncMembershipPost(documentId, slug)
      console.log(`[REVALIDATE] MembershipPost synced: ${documentId}`)
    } catch (error) {
      console.error(`[REVALIDATE] MembershipPost sync failed:`, error)
      // Don't throw - revalidation succeeded, sync is secondary
    }
  }

  // Note: Events do NOT need database sync
  // Event availability is computed from SeatAllocation table, not Sanity's availableSpots
}

/**
 * Revalidate cached content when a Sanity document changes
 *
 * Uses both revalidateTag() for broad cache invalidation
 * and revalidatePath() for specific route regeneration
 */
export async function revalidateSanityDocument(params: RevalidateParams): Promise<void> {
  const { documentId, documentType, operation, slug } = params

  console.log(`[REVALIDATE] Processing ${documentType} (${operation}) - ID: ${documentId}`)

  // 1. Always revalidate the base 'sanity' tag
  revalidateTag('sanity')

  // 2. Revalidate document-specific tags
  const tags = DOCUMENT_TAG_MAP[documentType] || []
  for (const tag of tags) {
    revalidateTag(tag)
    console.log(`[REVALIDATE] Tag invalidated: ${tag}`)
  }

  // 3. Revalidate specific paths (for homepage sections, etc.)
  const paths = DOCUMENT_PATH_MAP[documentType] || []
  for (const path of paths) {
    revalidatePath(path)
    console.log(`[REVALIDATE] Path invalidated: ${path}`)
  }

  // 4. Handle slug-specific path revalidation
  if (slug) {
    const slugPaths = getSlugPaths(documentType, slug)
    for (const path of slugPaths) {
      revalidatePath(path)
      console.log(`[REVALIDATE] Slug path invalidated: ${path}`)
    }
  }

  // 5. Handle database sync for specific document types
  await handleDatabaseSync(params)

  console.log(`[REVALIDATE] Completed for ${documentType} (${operation})`)
}
