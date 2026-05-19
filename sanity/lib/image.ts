import createImageUrlBuilder from '@sanity/image-url'
import type { Image } from 'sanity'

const imageBuilder = createImageUrlBuilder({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '81jpalr2',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
})

export const urlForImage = (source: Image) => {
  return imageBuilder.image(source).auto('format').fit('max')
}

// Alias for convenience
export const urlFor = (source: any) => {
  return imageBuilder.image(source).auto('format').fit('max')
}
