/**
 * Feature flags configuration
 * These flags control visibility of features across the application
 */

export const features = {
  // Events calendar feature flag
  // Set to true to show events in navigation and enable /eventos pages
  events: process.env.NEXT_PUBLIC_EVENTS_ENABLED === 'true',
} as const

export type FeatureFlags = typeof features
