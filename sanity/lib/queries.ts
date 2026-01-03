import { groq } from 'next-sanity'

// Eventos
export const EVENTS_QUERY = groq`*[_type == "event" && published == true] | order(eventDate asc)`

export const EVENT_BY_SLUG_QUERY = groq`*[_type == "event" && slug.current == $slug][0]`

export const UPCOMING_EVENTS_QUERY = groq`*[
  _type == "event" &&
  published == true &&
  eventDate > now() &&
  status == "upcoming"
] | order(eventDate asc)[0...6]`

// Sesiones 1:1
export const SESSIONS_QUERY = groq`*[_type == "session" && published == true && status == "active"] | order(displayOrder asc)`

export const SESSION_BY_SLUG_QUERY = groq`*[_type == "session" && slug.current == $slug][0]`

export const FEATURED_SESSIONS_QUERY = groq`*[
  _type == "session" &&
  published == true &&
  status == "active" &&
  featured == true
] | order(displayOrder asc)[0...3]`

// Blog Posts
export const BLOG_POSTS_QUERY = groq`*[_type == "blogPost" && published == true] | order(publishedAt desc)`

export const BLOG_POST_BY_SLUG_QUERY = groq`*[_type == "blogPost" && slug.current == $slug][0]{
  ...,
  "relatedPosts": relatedPosts[]->{
    _id,
    title,
    slug,
    excerpt,
    mainImage,
    publishedAt
  }
}`

export const FEATURED_BLOG_POSTS_QUERY = groq`*[
  _type == "blogPost" &&
  published == true &&
  featured == true
] | order(publishedAt desc)[0...3]`

// Productos
export const PRODUCTS_QUERY = groq`*[_type == "product" && published == true && status == "active"] | order(displayOrder asc)`

export const PRODUCT_BY_SLUG_QUERY = groq`*[_type == "product" && slug.current == $slug][0]{
  ...,
  "relatedProducts": relatedProducts[]->{
    _id,
    title,
    slug,
    shortDescription,
    images,
    price,
    priceUSD
  }
}`

export const FEATURED_PRODUCTS_QUERY = groq`*[
  _type == "product" &&
  published == true &&
  status == "active" &&
  featured == true
] | order(displayOrder asc)[0...4]`

// Contenido Premium
export const PREMIUM_CONTENT_QUERY = groq`*[_type == "premiumContent" && published == true] | order(releaseDate desc)`

export const PREMIUM_CONTENT_BY_SLUG_QUERY = groq`*[_type == "premiumContent" && slug.current == $slug][0]`

export const FEATURED_PREMIUM_CONTENT_QUERY = groq`*[
  _type == "premiumContent" &&
  published == true &&
  featured == true &&
  releaseDate <= now()
] | order(displayOrder asc)[0...6]`

// Niveles de Membresía
export const MEMBERSHIP_TIERS_QUERY = groq`*[_type == "membershipTier" && active == true] | order(displayOrder asc)`

export const MEMBERSHIP_TIER_BY_SLUG_QUERY = groq`*[_type == "membershipTier" && slug.current == $slug][0]`

// Páginas
export const PAGES_QUERY = groq`*[_type == "page" && published == true]`

export const PAGE_BY_SLUG_QUERY = groq`*[_type == "page" && slug.current == $slug][0]`

export const MENU_PAGES_QUERY = groq`*[
  _type == "page" &&
  published == true &&
  showInMenu == true
] | order(menuOrder asc)`

export const FOOTER_PAGES_QUERY = groq`*[
  _type == "page" &&
  published == true &&
  showInFooter == true
] | order(footerColumn asc)`
