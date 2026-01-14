import { createClient, type SanityClient } from 'next-sanity'

// Lazy initialization to avoid build-time errors when env vars are not set
let clientInstance: SanityClient | null = null

function getClient(): SanityClient {
  if (!clientInstance) {
    clientInstance = createClient({
      projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
      dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
      apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-01-01',
      useCdn: process.env.NODE_ENV === 'production',
      perspective: 'published',
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
