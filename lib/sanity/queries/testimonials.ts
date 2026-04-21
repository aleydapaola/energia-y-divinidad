import { sanityFetch } from '@/sanity/lib/fetch'

export interface Testimonial {
  _id: string
  quote: string
  authorName: string
  role: string
  countryEmoji?: string
  initials: string
  accentColor: 'violet' | 'blue'
  published: boolean
  displayOrder: number
}

const testimonialFields = `
  _id,
  quote,
  authorName,
  role,
  countryEmoji,
  initials,
  accentColor,
  published,
  displayOrder
`

export function getPublishedTestimonials(): Promise<Testimonial[]> {
  const query = `
    *[_type == "testimonial" && published == true] | order(displayOrder asc) {
      ${testimonialFields}
    }
  `

  return sanityFetch({ query, tags: ['testimonials'] })
}

export async function getRandomTestimonials(count: number = 3): Promise<Testimonial[]> {
  const all = await getPublishedTestimonials()
  if (all.length <= count) {return all}

  // Fisher-Yates shuffle and take first `count` items
  const shuffled = [...all]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, count)
}
