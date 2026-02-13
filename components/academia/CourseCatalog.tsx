'use client'

import { Search, Filter, X } from 'lucide-react'
import { useState, useMemo } from 'react'

import { CourseCard } from './CourseCard'

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
  moduleCount?: number
  lessonCount?: number
  featured?: boolean
  topics?: string[]
}

interface CourseCatalogProps {
  courses: Course[]
  currency?: 'COP' | 'USD'
}

const difficultyOptions = [
  { value: 'all', label: 'Todos los niveles' },
  { value: 'beginner', label: 'Principiante' },
  { value: 'intermediate', label: 'Intermedio' },
  { value: 'advanced', label: 'Avanzado' },
]

export function CourseCatalog({ courses, currency = 'COP' }: CourseCatalogProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)

  // Extract unique topics from courses
  const allTopics = useMemo(() => {
    const topics = new Set<string>()
    courses.forEach((course) => {
      course.topics?.forEach((topic) => topics.add(topic))
    })
    return Array.from(topics).sort()
  }, [courses])

  const [selectedTopics, setSelectedTopics] = useState<string[]>([])

  // Filter courses
  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch =
          course.title.toLowerCase().includes(query) ||
          course.shortDescription?.toLowerCase().includes(query) ||
          course.topics?.some((t) => t.toLowerCase().includes(query))

        if (!matchesSearch) {return false}
      }

      // Difficulty filter
      if (difficultyFilter !== 'all' && course.difficulty !== difficultyFilter) {
        return false
      }

      // Topic filter
      if (
        selectedTopics.length > 0 &&
        !selectedTopics.some((topic) => course.topics?.includes(topic))
      ) {
        return false
      }

      return true
    })
  }, [courses, searchQuery, difficultyFilter, selectedTopics])

  // Sort: featured first, then by displayOrder
  const sortedCourses = useMemo(() => {
    return [...filteredCourses].sort((a, b) => {
      if (a.featured && !b.featured) {return -1}
      if (!a.featured && b.featured) {return 1}
      return 0
    })
  }, [filteredCourses])

  const toggleTopic = (topic: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topic)
        ? prev.filter((t) => t !== topic)
        : [...prev, topic]
    )
  }

  const clearFilters = () => {
    setSearchQuery('')
    setDifficultyFilter('all')
    setSelectedTopics([])
  }

  const hasActiveFilters =
    searchQuery || difficultyFilter !== 'all' || selectedTopics.length > 0

  return (
    <div>
      {/* Search and Filters Bar */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar cursos..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg font-dm-sans focus:ring-2 focus:ring-[#4944a4] focus:border-transparent"
            />
          </div>

          {/* Difficulty Select */}
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg font-dm-sans focus:ring-2 focus:ring-[#4944a4] focus:border-transparent"
          >
            {difficultyOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Filter Toggle (Mobile) */}
          {allTopics.length > 0 && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg font-dm-sans hover:bg-gray-50 transition-colors md:hidden"
            >
              <Filter className="h-5 w-5" />
              Temas
              {selectedTopics.length > 0 && (
                <span className="bg-[#4944a4] text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {selectedTopics.length}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Topics Filter (Desktop) */}
        {allTopics.length > 0 && (
          <div className="hidden md:flex flex-wrap gap-2 mt-4">
            {allTopics.map((topic) => (
              <button
                key={topic}
                onClick={() => toggleTopic(topic)}
                className={`px-3 py-1.5 rounded-full text-sm font-dm-sans transition-colors ${
                  selectedTopics.includes(topic)
                    ? 'bg-[#4944a4] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {topic}
              </button>
            ))}
          </div>
        )}

        {/* Topics Filter (Mobile - Expandable) */}
        {showFilters && allTopics.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 md:hidden">
            {allTopics.map((topic) => (
              <button
                key={topic}
                onClick={() => toggleTopic(topic)}
                className={`px-3 py-1.5 rounded-full text-sm font-dm-sans transition-colors ${
                  selectedTopics.includes(topic)
                    ? 'bg-[#4944a4] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {topic}
              </button>
            ))}
          </div>
        )}

        {/* Active Filters / Clear */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-500 font-dm-sans">
              {sortedCourses.length}{' '}
              {sortedCourses.length === 1 ? 'curso encontrado' : 'cursos encontrados'}
            </p>
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-sm text-[#4944a4] hover:underline font-dm-sans"
            >
              <X className="h-4 w-4" />
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Course Grid */}
      {sortedCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedCourses.map((course) => (
            <CourseCard key={course._id} course={course} currency={currency} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-gray-500 font-dm-sans text-lg mb-4">
            No se encontraron cursos con esos criterios
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-[#4944a4] hover:underline font-dm-sans"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}
    </div>
  )
}
