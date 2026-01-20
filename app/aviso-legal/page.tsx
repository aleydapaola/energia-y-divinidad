import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import LegalPageContent from '@/components/legal/LegalPageContent'
import { sanityFetch } from '@/sanity/lib/fetch'
import { LEGAL_PAGE_BY_SLUG_QUERY } from '@/sanity/lib/queries'

interface LegalPage {
  _id: string
  title: string
  slug: { current: string }
  pageType: string
  content: any[]
  version: string | null
  lastUpdated: string | null
  seo: {
    metaTitle?: string
    metaDescription?: string
  } | null
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await sanityFetch<LegalPage | null>({
    query: LEGAL_PAGE_BY_SLUG_QUERY,
    params: { slug: 'aviso-legal' },
    tags: ['page', 'legal'],
  })

  return {
    title: page?.seo?.metaTitle || page?.title || 'Aviso Legal',
    description:
      page?.seo?.metaDescription ||
      'Información legal sobre Energía y Divinidad, incluyendo datos del titular y condiciones de uso.',
  }
}

export default async function AvisoLegalPage() {
  const page = await sanityFetch<LegalPage | null>({
    query: LEGAL_PAGE_BY_SLUG_QUERY,
    params: { slug: 'aviso-legal' },
    tags: ['page', 'legal'],
  })

  if (!page) {
    notFound()
  }

  return (
    <>
      <Header session={null} />
      <main className="min-h-screen bg-gradient-to-b from-[#f8f0f5] to-white">
        <div className="container mx-auto px-4 py-16 sm:py-20">
          <LegalPageContent
            title={page.title}
            content={page.content}
            lastUpdated={page.lastUpdated}
            version={page.version}
          />
        </div>
      </main>
      <Footer />
    </>
  )
}
