import { createClient, type SanityClient } from '@sanity/client'

// Lazy initialization to avoid build-time errors when env vars are not set
let clientInstance: SanityClient | null = null

function getClient(): SanityClient {
  if (!clientInstance) {
    if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) {
      throw new Error('Missing NEXT_PUBLIC_SANITY_PROJECT_ID')
    }
    if (!process.env.NEXT_PUBLIC_SANITY_DATASET) {
      throw new Error('Missing NEXT_PUBLIC_SANITY_DATASET')
    }
    clientInstance = createClient({
      projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
      dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
      apiVersion: '2024-01-01',
      useCdn: true,
    })
  }
  return clientInstance
}

export const client = new Proxy({} as SanityClient, {
  get(_, prop) {
    const instance = getClient()
    const value = instance[prop as keyof SanityClient]
    if (typeof value === 'function') {
      return value.bind(instance)
    }
    return value
  },
})
