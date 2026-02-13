import { Metadata } from 'next'

import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { auth } from '@/lib/auth'
import { sanityFetch } from '@/sanity/lib/fetch'
import { COURSES_QUERY } from '@/sanity/lib/queries'

import { AcademiaPageClient } from './AcademiaPageClient'

export const metadata: Metadata = {
  title: 'Academia | Energía y Divinidad',
  description:
    'Cursos y formaciones de sanación, meditación y crecimiento espiritual con Aleyda. Aprende a tu ritmo con acceso de por vida.',
}

interface Course {
  _id: string
  title: string
  slug: { current: string }
  shortDescription?: string
  coverImage?: any
  price: number
  priceUSD: number
  compareAtPrice?: number
  compareAtPriceUSD?: number
  totalDuration?: string
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  courseType: 'simple' | 'modular'
  topics?: string[]
  instructor?: string
  featured?: boolean
}

export default async function AcademiaPage() {
  const session = await auth()

  const courses = await sanityFetch<Course[]>({
    query: COURSES_QUERY,
  })

  return (
    <>
      <Header session={session} />
      <main className="min-h-screen">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-[#654177] to-[#4944a4] text-white py-16 lg:py-24">
          <div className="container mx-auto px-4 text-center">
            <h1 className="font-gazeta text-4xl sm:text-5xl lg:text-6xl text-white mb-6">
              Academia
            </h1>
            <p className="text-white/90 text-lg lg:text-xl font-dm-sans max-w-2xl mx-auto">
              Cursos y formaciones de sanación, meditación y crecimiento espiritual.
              Aprende a tu ritmo con acceso de por vida.
            </p>
          </div>
        </section>

        {/* Catalog Section */}
        <section className="py-12 lg:py-16 bg-[#f8f0f5]">
          <div className="container mx-auto px-4">
            {courses && courses.length > 0 ? (
              <AcademiaPageClient courses={courses} />
            ) : (
              <div className="text-center py-16">
                <p className="text-gray-500 font-dm-sans text-lg mb-4">
                  Próximamente nuevos cursos disponibles
                </p>
                <p className="text-gray-400 font-dm-sans">
                  Suscríbete para recibir novedades
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
