/**
 * Event Perks Type Definitions
 */

// Perk types matching Sanity schema
export type PerkType =
  | 'recording'
  | 'transcript'
  | 'workbook'
  | 'bonus_meditation'
  | 'personal_message'
  | 'priority_qa'

export type DeliveryMode = 'automatic' | 'manual' | 'post_event'

export type PerkAllocationStatus = 'PENDING' | 'DELIVERED' | 'UNAVAILABLE'

// Perk as defined in Sanity event document
export interface EventPerk {
  type: PerkType
  title: string
  description?: string
  cap?: number
  priorityPlans?: Array<{ _id: string; name: string }>
  deliveryMode: DeliveryMode
  assetUrl?: string
}

// Result of allocating a single perk
export interface PerkAllocationResult {
  perkType: PerkType
  perkTitle: string
  allocated: boolean
  reason?: 'priority_plan' | 'available' | 'cap_reached' | 'already_allocated'
  status: PerkAllocationStatus
}

// Perk allocation as stored in database
export interface PerkAllocation {
  id: string
  perkType: PerkType
  perkTitle: string
  status: PerkAllocationStatus
  assetUrl?: string
  deliveredAt?: Date
}

// Collection of perks for a booking
export interface BookingPerks {
  bookingId: string
  eventId: string
  allocations: PerkAllocation[]
}

// Stats for admin view
export interface PerkStats {
  perkType: string
  perkTitle: string
  total: number
  delivered: number
  pending: number
  unavailable: number
}

// Extended allocation with user info for admin
export interface PerkAllocationWithUser extends PerkAllocation {
  eventId: string
  bookingId: string
  userId: string
  perkIndex: number
  user: {
    id: string
    name: string | null
    email: string
  }
  createdAt: Date
  deliveredBy?: string
}

// Perk type labels for display
export const PERK_TYPE_LABELS: Record<PerkType, string> = {
  recording: 'Grabación',
  transcript: 'Transcripción',
  workbook: 'Workbook/Material',
  bonus_meditation: 'Meditación Bonus',
  personal_message: 'Mensaje Personal',
  priority_qa: 'Q&A Prioritario',
}

// Delivery mode labels for display
export const DELIVERY_MODE_LABELS: Record<DeliveryMode, string> = {
  automatic: 'Automático',
  manual: 'Manual',
  post_event: 'Post-Evento',
}
