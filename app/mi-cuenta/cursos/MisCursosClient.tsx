'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { PurchasedCourseCard } from '@/components/academia'

interface CourseWithProgress {
  course: {
    _id: string
    title: string
    slug: { current: string }
    coverImage?: any
    lessonCount?: number
    totalDuration?: string
  }
  progress: {
    completionPercentage: number
    completedLessons: number
    lastAccessedAt?: string
  }
}

interface MisCursosClientProps {
  courses: CourseWithProgress[]
}

type FilterType = 'all' | 'in_progress' | 'completed' | 'not_started'

export function MisCursosClient({ courses }: MisCursosClientProps) {
  const [filter, setFilter] = useState<FilterType>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Filter courses
  const filteredCourses = courses.filter((item) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (!item.course.title.toLowerCase().includes(query)) {
        return false
      }
    }

    // Status filter
    switch (filter) {
      case 'in_progress':
        return (
          item.progress.completionPercentage > 0 &&
          item.progress.completionPercentage < 100
        )
      case 'completed':
        return item.progress.completionPercentage >= 100
      case 'not_started':
        return item.progress.completionPercentage === 0
      default:
        return true
    }
  })

  // Sort by last accessed (most recent first), then by completion
  const sortedCourses = [...filteredCourses].sort((a, b) => {
    // In progress first
    const aInProgress =
      a.progress.completionPercentage > 0 && a.progress.completionPercentage < 100
    const bInProgress =
      b.progress.completionPercentage > 0 && b.progress.completionPercentage < 100

    if (aInProgress && !bInProgress) return -1
    if (!aInProgress && bInProgress) return 1

    // Then by last accessed
    if (a.progress.lastAccessedAt && b.progress.lastAccessedAt) {
      return (
        new Date(b.progress.lastAccessedAt).getTime() -
        new Date(a.progress.lastAccessedAt).getTime()
      )
    }

    return 0
  })

  // Count by status
  const counts = {
    all: courses.length,
    in_progress: courses.filter(
      (c) =>
        c.progress.completionPercentage > 0 && c.progress.completionPercentage < 100
    ).length,
    completed: courses.filter((c) => c.progress.completionPercentage >= 100).length,
    not_started: courses.filter((c) => c.progress.completionPercentage === 0).length,
  }

  return (
    <div>
      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar en mis cursos..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg font-dm-sans focus:ring-2 focus:ring-[#4944a4] focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
            {[
              { value: 'all', label: 'Todos' },
              { value: 'in_progress', label: 'En progreso' },
              { value: 'completed', label: 'Completados' },
              { value: 'not_started', label: 'Sin empezar' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value as FilterType)}
                className={`px-4 py-2 rounded-lg font-dm-sans text-sm font-medium whitespace-nowrap transition-colors ${
                  filter === option.value
                    ? 'bg-[#4944a4] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {option.label}
                <span className="ml-1.5 opacity-70">
                  ({counts[option.value as FilterType]})
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Course Grid */}
      {sortedCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sortedCourses.map((item) => (
            <PurchasedCourseCard
              key={item.course._id}
              course={item.course}
              progress={item.progress}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500 font-dm-sans">
            No hay cursos que coincidan con tu búsqueda
          </p>
          <button
            onClick={() => {
              setFilter('all')
              setSearchQuery('')
            }}
            className="mt-4 text-[#4944a4] hover:underline font-dm-sans"
          >
            Limpiar filtros
          </button>
        </div>
      )}
    </div>
  )
}
