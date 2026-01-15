import { client } from './client'

interface SanityFetchOptions<T> {
  query: string
  params?: Record<string, any>
  tags?: string[]
}

/**
 * Fetch data from Sanity with caching support
 */
export async function sanityFetch<T>({
  query,
  params = {},
  tags = [],
}: SanityFetchOptions<T>): Promise<T> {
  try {
    const result = await client.fetch<T>(query, params, {
      cache: process.env.NODE_ENV === 'production' ? 'force-cache' : 'no-store',
      next: {
        tags: ['sanity', ...tags],
      },
    })

    return result
  } catch (error) {
    console.error('Sanity fetch error:', error)
    throw error
  }
}
