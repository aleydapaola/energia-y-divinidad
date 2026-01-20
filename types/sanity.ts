/**
 * Sanity Reusable Object Types
 *
 * Tipos TypeScript para los objetos reutilizables de Sanity.
 * Estos tipos corresponden a los schemas en sanity/schemas/objects/
 */

// ============================================
// PRICING
// ============================================
export interface SanityPricing {
  _type?: 'pricing'
  price: number
  priceUSD: number
  compareAtPrice?: number
  compareAtPriceUSD?: number
  memberDiscount: number
  isFree: boolean
}

// ============================================
// MEMBERSHIP ACCESS
// ============================================
export interface SanityMembershipTierRef {
  _id: string
  name: string
  tierLevel?: number
  slug?: { current: string }
}

export interface SanityMembershipAccess {
  _type?: 'membershipAccess'
  includedInMembership: boolean
  membershipTiers?: SanityMembershipTierRef[]
  memberOnlyPurchase: boolean
}

// ============================================
// SEO
// ============================================
export interface SanitySeo {
  _type?: 'seo'
  metaTitle?: string
  metaDescription?: string
  ogImageUrl?: string
  ogImage?: {
    asset?: {
      _ref: string
      url?: string
    }
  }
}

// ============================================
// COVER IMAGE
// ============================================
export interface SanityCoverImage {
  _type?: 'coverImage'
  asset?: {
    _id: string
    _ref?: string
    url: string
    metadata?: {
      dimensions?: {
        width: number
        height: number
      }
      lqip?: string
    }
  }
  alt?: string
  caption?: string
  hotspot?: {
    x: number
    y: number
    height: number
    width: number
  }
  crop?: {
    top: number
    bottom: number
    left: number
    right: number
  }
}

// ============================================
// VIDEO EMBED
// ============================================
export interface SanityVideoEmbed {
  _type?: 'videoEmbed'
  url: string
  title?: string
  caption?: string
}

// ============================================
// DISPLAY SETTINGS
// ============================================
export interface SanityDisplaySettings {
  _type?: 'displaySettings'
  published: boolean
  featured: boolean
  displayOrder: number
  publishedAt?: string
}

// ============================================
// NORMALIZED TYPES (for query results)
// ============================================

/**
 * Normalized pricing fields from queries
 * These are the flattened fields returned by coalesce projections
 */
export interface NormalizedPricing {
  price?: number
  priceUSD?: number
  compareAtPrice?: number
  compareAtPriceUSD?: number
  memberDiscount?: number
  isFree?: boolean
}

/**
 * Normalized membership access fields from queries
 * These are the flattened fields returned by coalesce projections
 */
export interface NormalizedMembershipAccess {
  includedInMembership: boolean
  memberOnlyPurchase: boolean
  membershipTiers?: SanityMembershipTierRef[]
}

/**
 * Helper to check if user has access based on membership
 */
export function hasAccessViasMembership(
  membershipAccess: NormalizedMembershipAccess | null,
  userTierId?: string | null
): boolean {
  if (!membershipAccess) return false
  if (!membershipAccess.includedInMembership) return false
  if (!userTierId) return false

  // If no specific tiers are defined, all members have access
  if (!membershipAccess.membershipTiers || membershipAccess.membershipTiers.length === 0) {
    return true
  }

  // Check if user's tier is in the allowed list
  return membershipAccess.membershipTiers.some((tier) => tier._id === userTierId)
}
