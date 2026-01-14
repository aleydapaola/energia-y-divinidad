import type { SubscriptionStatus, BillingInterval, EntitlementType } from '@prisma/client'
import type { PortableTextBlock } from 'sanity'

// ============================================
// MEMBERSHIP TIERS (desde Sanity)
// ============================================

export interface MembershipTier {
  _id: string
  _type: 'membershipTier'
  name: string
  slug: { current: string }
  tierLevel: number
  tagline?: string
  description: PortableTextBlock[]
  icon?: {
    asset: {
      _ref: string
      url: string
    }
    alt?: string
  }
  color?: string
  pricing: {
    monthlyPrice?: number
    monthlyPriceUSD?: number
    yearlyPrice?: number
    yearlyPriceUSD?: number
    yearlyDiscount?: number
  }
  features: Array<{
    feature: string
    description?: string
    included: boolean
  }>
  benefits: {
    premiumContent?: boolean
    liveEvents?: boolean
    recordedEvents?: boolean
    sessionDiscount?: number
    productDiscount?: number
    prioritySupport?: boolean
    privateGroup?: boolean
    monthlyLiveSession?: boolean
    oneOnOneSessionsIncluded?: number
  }
  limitations?: {
    maxDownloadsPerMonth?: number
    maxStorageGB?: number
  }
  trialPeriod?: {
    enabled: boolean
    durationDays?: number
    requiresPaymentMethod?: boolean
  }
  recommendedFor?: string[]
  popularityBadge?: 'none' | 'popular' | 'best_value' | 'recommended'
  displayOrder: number
  ctaButtonText?: string
  active: boolean
  featured?: boolean
  seo?: {
    metaTitle?: string
    metaDescription?: string
  }
}

// ============================================
// MEMBERSHIP POSTS (desde Sanity)
// ============================================

export type PostType =
  | 'editorial'
  | 'audio'
  | 'video'
  | 'resource'
  | 'bts'
  | 'poll'
  | 'qna'
  | 'announcement'
  | 'event'

export interface MembershipPostSanity {
  _id: string
  _type: 'membershipPost'
  _createdAt: string
  _updatedAt: string
  title: string
  slug: { current: string }
  postType: PostType
  excerpt?: string
  content: PortableTextBlock[]
  thumbnail?: {
    asset: {
      _ref: string
      url: string
    }
    alt: string
  }
  videoUrl?: string
  audioFile?: {
    asset: {
      _ref: string
      url: string
    }
  }
  duration?: number
  downloadableFiles?: Array<{
    title: string
    file: {
      asset: {
        _ref: string
        url: string
      }
    }
    description?: string
  }>
  pollOptions?: Array<{
    option: string
  }>
  pollEndsAt?: string
  requiredTier: {
    _ref: string
    _type: 'reference'
  }
  publishedAt: string
  expirationDate?: string
  relatedPosts?: Array<{
    _ref: string
    _type: 'reference'
  }>
  relatedPremiumContent?: Array<{
    _ref: string
    _type: 'reference'
  }>
  pinned: boolean
  allowComments: boolean
  allowLikes: boolean
  seo?: {
    metaTitle?: string
    metaDescription?: string
  }
  published: boolean
}

// ============================================
// MEMBERSHIP POST con ENGAGEMENT (híbrido)
// ============================================

export interface MembershipPostWithEngagement extends MembershipPostSanity {
  // Datos de engagement desde Prisma
  likesCount: number
  commentsCount: number
  viewsCount: number
  userHasLiked: boolean
  pollResults?: {
    option: string
    votes: number
    percentage: number
  }[]
  userPollVote?: number
  requiredTierData?: MembershipTier
}

// ============================================
// COMMENTS
// ============================================

export interface CommentWithAuthor {
  id: string
  content: string
  userId: string
  postId: string
  createdAt: Date
  updatedAt: Date
  user: {
    id: string
    name: string | null
    image: string | null
  }
  likesCount: number
  userHasLiked: boolean
}

// ============================================
// SUBSCRIPTION STATUS
// ============================================

export interface UserSubscription {
  id: string
  userId: string
  membershipTierId: string
  membershipTierName: string
  status: SubscriptionStatus
  billingInterval: BillingInterval
  amount: number
  currency: string
  paymentProvider: string
  stripeSubscriptionId: string | null
  stripeCustomerId: string | null
  nequiSubscriptionId: string | null
  nequiPhoneNumber: string | null
  nequiApprovedAt: Date | null
  startDate: Date
  currentPeriodStart: Date
  currentPeriodEnd: Date
  trialEnd: Date | null
  cancelledAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface MembershipStatus {
  hasActiveMembership: boolean
  subscription: UserSubscription | null
  tier: MembershipTier | null
  canAccessPremiumContent: boolean
  canAccessMembershipPosts: boolean
  daysUntilRenewal: number | null
  isCancelled: boolean
  isInTrial: boolean
}

// ============================================
// ENTITLEMENTS
// ============================================

export interface UserEntitlement {
  id: string
  userId: string
  type: EntitlementType
  resourceId: string
  resourceName: string
  orderId: string | null
  subscriptionId: string | null
  expiresAt: Date | null
  revoked: boolean
  revokedAt: Date | null
  revokedReason: string | null
  sessionsTotal: number | null
  sessionsUsed: number | null
  createdAt: Date
  updatedAt: Date
}

// ============================================
// PREMIUM CONTENT ACCESS
// ============================================

export interface PremiumContentAccess {
  contentId: string
  hasAccess: boolean
  reason: 'membership' | 'purchase' | 'no_access'
  subscription?: UserSubscription
  entitlement?: UserEntitlement
}

// ============================================
// PAYMENT METHODS
// ============================================

export type PaymentRegion = 'colombia' | 'international'

export type PaymentMethodType = 'nequi_recurring' | 'nequi_manual' | 'stripe' | 'paypal'

export interface PaymentMethodInfo {
  type: PaymentMethodType
  label: string
  description: string
  available: boolean
  icon: string
  isRecurring: boolean // Si soporta cobros automáticos recurrentes
  recommended?: boolean // Si es el método recomendado
}

export interface PaymentIntent {
  region: PaymentRegion
  method: PaymentMethodType
  amount: number
  currency: 'COP' | 'USD'
  membershipTierId: string
  billingInterval: BillingInterval
  phoneNumber?: string // Para Nequi (número de celular del usuario)
}

// Información de suscripción de Nequi
export interface NequiSubscription {
  subscriptionId: string // ID retornado por Nequi API
  phoneNumber: string
  status: 'pending' | 'active' | 'cancelled'
  approvedAt?: Date
}

// ============================================
// UI HELPERS
// ============================================

export const POST_TYPE_LABELS: Record<PostType, string> = {
  editorial: 'Artículo',
  audio: 'Audio',
  video: 'Video',
  resource: 'Recurso',
  bts: 'Behind the Scenes',
  poll: 'Encuesta',
  qna: 'Preguntas y Respuestas',
  announcement: 'Anuncio',
  event: 'Evento Exclusivo',
}

export const POST_TYPE_ICONS: Record<PostType, string> = {
  editorial: '📝',
  audio: '🎧',
  video: '🎬',
  resource: '📚',
  bts: '🎭',
  poll: '📊',
  qna: '❓',
  announcement: '📢',
  event: '🗓️',
}
