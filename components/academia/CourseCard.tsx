'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Clock, BookOpen, Users } from 'lucide-react'
import { urlFor } from '@/sanity/lib/image'
import { AddToCartButton } from '@/components/cart/AddToCartButton'
import { formatPrice } from '@/lib/stores/cart-store'

interface CourseCardProps {
  course: {
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
    moduleCount?: number
    lessonCount?: number
    featured?: boolean
  }
  currency?: 'COP' | 'USD'
  showAddToCart?: boolean
}

const difficultyLabels = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
}

const difficultyColors = {
  beginner: 'bg-green-100 text-green-700',
  intermediate: 'bg-yellow-100 text-yellow-700',
  advanced: 'bg-red-100 text-red-700',
}

export function CourseCard({
  course,
  currency = 'COP',
  showAddToCart = true,
}: CourseCardProps) {
  const price = currency === 'COP' ? course.price : course.priceUSD
  const compareAtPrice =
    currency === 'COP' ? course.compareAtPrice : course.compareAtPriceUSD
  const hasDiscount = compareAtPrice && compareAtPrice > price

  const discountPercentage = hasDiscount
    ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
    : 0

  return (
    <article className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden flex flex-col h-full">
      {/* Image */}
      <Link
        href={`/academia/${course.slug.current}`}
        className="relative block aspect-video overflow-hidden"
      >
        {course.coverImage ? (
          <Image
            src={urlFor(course.coverImage).width(640).height(360).url()}
            alt={course.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#8A4BAF]/20 to-[#4944a4]/20 flex items-center justify-center">
            <BookOpen className="h-16 w-16 text-[#8A4BAF]/40" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {course.featured && (
            <span className="bg-[#8A4BAF] text-white text-xs font-dm-sans font-semibold px-2.5 py-1 rounded-full">
              Destacado
            </span>
          )}
          {hasDiscount && (
            <span className="bg-red-500 text-white text-xs font-dm-sans font-semibold px-2.5 py-1 rounded-full">
              -{discountPercentage}%
            </span>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        {/* Meta info */}
        <div className="flex items-center gap-3 text-xs text-gray-500 font-dm-sans mb-3">
          {course.totalDuration && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {course.totalDuration}
            </span>
          )}
          {course.lessonCount && course.lessonCount > 0 && (
            <span className="flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5" />
              {course.lessonCount} {course.lessonCount === 1 ? 'lección' : 'lecciones'}
            </span>
          )}
          {course.difficulty && (
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${difficultyColors[course.difficulty]}`}
            >
              {difficultyLabels[course.difficulty]}
            </span>
          )}
        </div>

        {/* Title */}
        <Link href={`/academia/${course.slug.current}`}>
          <h3 className="font-gazeta text-lg text-[#654177] group-hover:text-[#8A4BAF] transition-colors line-clamp-2 mb-2">
            {course.title}
          </h3>
        </Link>

        {/* Description */}
        {course.shortDescription && (
          <p className="text-gray-600 text-sm font-dm-sans line-clamp-2 mb-4 flex-1">
            {course.shortDescription}
          </p>
        )}

        {/* Price and CTA */}
        <div className="mt-auto pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-baseline gap-2">
              <span className="font-gazeta text-xl text-[#4944a4]">
                {formatPrice(price, currency)}
              </span>
              {hasDiscount && (
                <span className="text-gray-400 text-sm line-through font-dm-sans">
                  {formatPrice(compareAtPrice, currency)}
                </span>
              )}
            </div>
          </div>

          {showAddToCart && (
            <AddToCartButton
              course={course}
              variant="primary"
              className="w-full"
            />
          )}
        </div>
      </div>
    </article>
  )
}
