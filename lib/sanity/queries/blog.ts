import { groq } from 'next-sanity'
import { client } from '@/sanity/lib/client'

// Types
export interface BlogPost {
  _id: string
  _type: 'blogPost'
  title: string
  slug: {
    current: string
  }
  author?: {
    name: string
    bio?: string
    image?: {
      asset: {
        url: string
      }
    }
  }
  excerpt: string
  mainImage: {
    asset: {
      _id: string
      url: string
    }
    alt?: string
    caption?: string
  }
  categories?: string[]
  tags?: string[]
  content: PortableTextBlock[]
  isPremium: boolean
  membershipTiers?: {
    _id: string
    name: string
  }[]
  readingTime?: number
  relatedPosts?: BlogPostPreview[]
  relatedSessions?: {
    _id: string
    title: string
    slug: { current: string }
    shortDescription: string
    mainImage: {
      asset: { url: string }
      alt?: string
    }
  }[]
  relatedEvents?: {
    _id: string
    title: string
    slug: { current: string }
    excerpt: string
    mainImage: {
      asset: { url: string }
      alt?: string
    }
    eventDate: string
  }[]
  publishedAt: string
  updatedAt?: string
  featured: boolean
  seo?: {
    metaTitle?: string
    metaDescription?: string
    keywords?: string[]
  }
  published: boolean
}

export interface BlogPostPreview {
  _id: string
  title: string
  slug: { current: string }
  excerpt: string
  mainImage: {
    asset: { url: string }
    alt?: string
  }
  publishedAt: string
  categories?: string[]
  readingTime?: number
  isPremium?: boolean
  featured?: boolean
}

// Portable Text Block Types
export interface PortableTextBlock {
  _key: string
  _type: string
  children?: {
    _key: string
    _type: string
    text?: string
    marks?: string[]
  }[]
  style?: string
  markDefs?: {
    _key: string
    _type: string
    href?: string
  }[]
  // Image block
  asset?: {
    _id: string
    url: string
  }
  alt?: string
  caption?: string
  // Callout block
  type?: 'info' | 'warning' | 'tip' | 'important'
  text?: string
  // Video embed
  url?: string
  title?: string
  // Audio embed
  audioType?: 'external' | 'file'
  externalUrl?: string
  audioFile?: {
    asset: {
      url: string
    }
  }
  duration?: string
}

// GROQ Queries
export const BLOG_POSTS_QUERY = groq`
  *[_type == "blogPost" && published == true] | order(publishedAt desc) {
    _id,
    title,
    slug,
    excerpt,
    "mainImage": mainImage {
      asset-> {
        _id,
        url
      },
      alt,
      caption
    },
    categories,
    readingTime,
    publishedAt,
    isPremium,
    featured
  }
`

export const BLOG_POSTS_BY_CATEGORY_QUERY = groq`
  *[_type == "blogPost" && published == true && $category in categories] | order(publishedAt desc) {
    _id,
    title,
    slug,
    excerpt,
    "mainImage": mainImage {
      asset-> {
        _id,
        url
      },
      alt,
      caption
    },
    categories,
    readingTime,
    publishedAt,
    isPremium,
    featured
  }
`

export const BLOG_POST_BY_SLUG_QUERY = groq`
  *[_type == "blogPost" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    "author": author {
      name,
      bio,
      "image": image {
        asset-> {
          url
        }
      }
    },
    excerpt,
    "mainImage": mainImage {
      asset-> {
        _id,
        url
      },
      alt,
      caption
    },
    categories,
    tags,
    content[] {
      ...,
      _type == "image" => {
        ...,
        asset-> {
          _id,
          url
        }
      },
      _type == "audioEmbed" => {
        ...,
        "audioFile": audioFile {
          asset-> {
            url
          }
        }
      }
    },
    isPremium,
    "membershipTiers": membershipTiers[]-> {
      _id,
      name
    },
    readingTime,
    "relatedPosts": relatedPosts[]-> {
      _id,
      title,
      slug,
      excerpt,
      "mainImage": mainImage {
        asset-> {
          url
        },
        alt
      },
      publishedAt,
      categories,
      readingTime,
      isPremium
    },
    "relatedSessions": relatedSessions[]-> {
      _id,
      title,
      slug,
      shortDescription,
      "mainImage": mainImage {
        asset-> {
          url
        },
        alt
      }
    },
    "relatedEvents": relatedEvents[]-> {
      _id,
      title,
      slug,
      excerpt,
      "mainImage": mainImage {
        asset-> {
          url
        },
        alt
      },
      eventDate
    },
    publishedAt,
    updatedAt,
    featured,
    seo,
    published
  }
`

export const FEATURED_BLOG_POSTS_QUERY = groq`
  *[_type == "blogPost" && published == true && featured == true] | order(publishedAt desc)[0...3] {
    _id,
    title,
    slug,
    excerpt,
    "mainImage": mainImage {
      asset-> {
        _id,
        url
      },
      alt,
      caption
    },
    categories,
    readingTime,
    publishedAt,
    isPremium,
    featured
  }
`

export const LATEST_BLOG_POSTS_QUERY = groq`
  *[_type == "blogPost" && published == true] | order(publishedAt desc)[0...$limit] {
    _id,
    title,
    slug,
    excerpt,
    "mainImage": mainImage {
      asset-> {
        _id,
        url
      },
      alt,
      caption
    },
    categories,
    readingTime,
    publishedAt,
    isPremium,
    featured
  }
`

// Fetch functions
export async function getBlogPosts(): Promise<BlogPostPreview[]> {
  return client.fetch(BLOG_POSTS_QUERY)
}

export async function getBlogPostsByCategory(category: string): Promise<BlogPostPreview[]> {
  return client.fetch(BLOG_POSTS_BY_CATEGORY_QUERY, { category })
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  return client.fetch(BLOG_POST_BY_SLUG_QUERY, { slug })
}

export async function getFeaturedBlogPosts(): Promise<BlogPostPreview[]> {
  return client.fetch(FEATURED_BLOG_POSTS_QUERY)
}

export async function getLatestBlogPosts(limit: number = 6): Promise<BlogPostPreview[]> {
  return client.fetch(LATEST_BLOG_POSTS_QUERY, { limit })
}

// Get all unique categories from published posts
export const BLOG_CATEGORIES_QUERY = groq`
  *[_type == "blogPost" && published == true].categories[]
`

export async function getBlogCategories(): Promise<string[]> {
  const categories = await client.fetch<string[]>(BLOG_CATEGORIES_QUERY)
  // Remove duplicates and nulls
  return [...new Set(categories.filter(Boolean))]
}
