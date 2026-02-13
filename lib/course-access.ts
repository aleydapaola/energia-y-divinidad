/**
 * Course Access Library
 * Handles access control and entitlements for academy courses
 */

import { EntitlementType } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import { client } from '@/sanity/lib/client'
import { COURSE_BY_SLUG_QUERY, COURSES_BY_IDS_QUERY } from '@/sanity/lib/queries'

// Types
export interface CourseAccessResult {
  hasAccess: boolean
  reason: 'purchase' | 'membership' | 'free' | 'no_access'
  entitlement?: {
    id: string
    expiresAt: Date | null
  }
}

// Drip Content Types
export type DripMode = 'immediate' | 'offset' | 'fixed'

export interface LessonWithDrip {
  _id: string
  order?: number
  isFreePreview?: boolean
  dripMode?: DripMode
  dripOffsetDays?: number
  availableAt?: string
}

export interface CourseWithDrip {
  _id: string
  dripEnabled?: boolean
  defaultDripDays?: number
}

export interface LessonAccessResult {
  canAccess: boolean
  reason: 'available' | 'drip_locked' | 'module_locked' | 'no_course_access' | 'free_preview'
  availableAt?: Date
}

export interface CourseWithProgress {
  courseId: string
  courseTitle: string
  courseSlug: string
  coverImage?: any
  completionPercentage: number
  startedAt: Date
  lastAccessedAt: Date
  completedAt?: Date | null
}

/**
 * Check if a user has access to a course
 */
export async function canAccessCourse(
  userId: string,
  courseId: string
): Promise<CourseAccessResult> {
  // 1. Check for direct purchase entitlement
  const entitlement = await prisma.entitlement.findFirst({
    where: {
      userId,
      type: EntitlementType.COURSE,
      resourceId: courseId,
      revoked: false,
      OR: [
        { expiresAt: null }, // Perpetual access
        { expiresAt: { gt: new Date() } }, // Not expired
      ],
    },
    select: {
      id: true,
      expiresAt: true,
    },
  })

  if (entitlement) {
    return {
      hasAccess: true,
      reason: 'purchase',
      entitlement: {
        id: entitlement.id,
        expiresAt: entitlement.expiresAt,
      },
    }
  }

  // 2. Check for membership access
  // Get course from Sanity to check if it's included in membership
  const course = await client.fetch(
    `*[_type == "course" && _id == $id][0] {
      includedInMembership,
      membershipTiers[]-> { _id }
    }`,
    { id: courseId }
  )

  if (course?.includedInMembership) {
    // Check if user has an active membership
    const membership = await prisma.subscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        currentPeriodEnd: { gt: new Date() },
      },
    })

    if (membership) {
      // If course specifies specific tiers, check if user's tier is included
      if (course.membershipTiers && course.membershipTiers.length > 0) {
        const tierIds = course.membershipTiers.map((t: { _id: string }) => t._id)
        if (tierIds.includes(membership.membershipTierId)) {
          return { hasAccess: true, reason: 'membership' }
        }
      } else {
        // No specific tiers - any membership gives access
        return { hasAccess: true, reason: 'membership' }
      }
    }
  }

  // 3. Check if course is free (price = 0)
  const coursePrice = await client.fetch(
    `*[_type == "course" && _id == $id][0] { price }`,
    { id: courseId }
  )

  if (coursePrice?.price === 0) {
    return { hasAccess: true, reason: 'free' }
  }

  return { hasAccess: false, reason: 'no_access' }
}

/**
 * Get all courses a user has purchased (with progress)
 */
export async function getUserCourses(userId: string): Promise<CourseWithProgress[]> {
  // Get all course entitlements for the user
  const entitlements = await prisma.entitlement.findMany({
    where: {
      userId,
      type: EntitlementType.COURSE,
      revoked: false,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: {
      resourceId: true,
      resourceName: true,
    },
  })

  if (entitlements.length === 0) {
    return []
  }

  const courseIds = entitlements.map((e) => e.resourceId)

  // Get courses from Sanity
  const courses = await client.fetch(COURSES_BY_IDS_QUERY, { ids: courseIds })

  // Get progress for each course
  const progress = await prisma.courseProgress.findMany({
    where: {
      userId,
      courseId: { in: courseIds },
    },
  })

  const progressMap = new Map(progress.map((p) => [p.courseId, p]))

  // Combine course data with progress
  return courses.map((course: any) => {
    const courseProgress = progressMap.get(course._id)
    return {
      courseId: course._id,
      courseTitle: course.title,
      courseSlug: course.slug?.current,
      coverImage: course.coverImage,
      completionPercentage: courseProgress?.completionPercentage
        ? Number(courseProgress.completionPercentage)
        : 0,
      startedAt: courseProgress?.startedAt || new Date(),
      lastAccessedAt: courseProgress?.lastAccessedAt || new Date(),
      completedAt: courseProgress?.completedAt,
    }
  })
}

/**
 * Create entitlement for a purchased course
 */
export async function createCourseEntitlement(params: {
  userId: string
  courseId: string
  courseName: string
  orderId: string
}): Promise<void> {
  const { userId, courseId, courseName, orderId } = params

  // Check if entitlement already exists (idempotency)
  const existing = await prisma.entitlement.findFirst({
    where: {
      userId,
      type: EntitlementType.COURSE,
      resourceId: courseId,
      orderId,
    },
  })

  if (existing) {
    console.log(`Course entitlement already exists for user ${userId}, course ${courseId}`)
    return
  }

  await prisma.entitlement.create({
    data: {
      userId,
      type: EntitlementType.COURSE,
      resourceId: courseId,
      resourceName: courseName,
      orderId,
      expiresAt: null, // Perpetual access
    },
  })

  // Initialize course progress
  await prisma.courseProgress.upsert({
    where: {
      userId_courseId: { userId, courseId },
    },
    create: {
      userId,
      courseId,
      completionPercentage: 0,
    },
    update: {
      // If progress already exists, don't reset it
    },
  })

  console.log(`Created course entitlement for user ${userId}, course ${courseId}`)
}

/**
 * Update lesson progress
 */
export async function updateLessonProgress(params: {
  userId: string
  courseId: string
  lessonId: string
  watchedSeconds?: number
  lastPosition?: number
  completed?: boolean
}): Promise<void> {
  const { userId, courseId, lessonId, watchedSeconds, lastPosition, completed } = params

  // Get or create course progress
  const courseProgress = await prisma.courseProgress.upsert({
    where: {
      userId_courseId: { userId, courseId },
    },
    create: {
      userId,
      courseId,
      completionPercentage: 0,
    },
    update: {
      lastAccessedAt: new Date(),
    },
  })

  // Update lesson progress
  await prisma.lessonProgress.upsert({
    where: {
      courseProgressId_lessonId: {
        courseProgressId: courseProgress.id,
        lessonId,
      },
    },
    create: {
      courseProgressId: courseProgress.id,
      lessonId,
      watchedSeconds: watchedSeconds || 0,
      lastPosition: lastPosition || 0,
      completed: completed || false,
      completedAt: completed ? new Date() : null,
    },
    update: {
      watchedSeconds: watchedSeconds,
      lastPosition: lastPosition,
      completed: completed,
      completedAt: completed ? new Date() : undefined,
    },
  })

  // Recalculate course completion percentage if lesson was marked complete
  if (completed) {
    await recalculateCourseProgress(userId, courseId)
  }
}

/**
 * Recalculate course completion percentage
 */
async function recalculateCourseProgress(userId: string, courseId: string): Promise<void> {
  // Get course structure from Sanity
  const course = await client.fetch(
    `*[_type == "course" && _id == $id][0] {
      courseType,
      "simpleLesson": simpleLesson-> { _id },
      "modules": modules[]-> {
        "lessons": lessons[]-> { _id }
      }
    }`,
    { id: courseId }
  )

  let totalLessons = 0
  const lessonIds: string[] = []

  if (course.courseType === 'simple' && course.simpleLesson) {
    totalLessons = 1
    lessonIds.push(course.simpleLesson._id)
  } else if (course.modules) {
    for (const courseModule of course.modules) {
      if (courseModule.lessons) {
        totalLessons += courseModule.lessons.length
        lessonIds.push(...courseModule.lessons.map((l: { _id: string }) => l._id))
      }
    }
  }

  if (totalLessons === 0) {return}

  // Get completed lessons count
  const courseProgress = await prisma.courseProgress.findUnique({
    where: {
      userId_courseId: { userId, courseId },
    },
    include: {
      lessonProgress: {
        where: {
          lessonId: { in: lessonIds },
          completed: true,
        },
      },
    },
  })

  if (!courseProgress) {return}

  const completedLessons = courseProgress.lessonProgress.length
  const percentage = Math.round((completedLessons / totalLessons) * 100)

  await prisma.courseProgress.update({
    where: { id: courseProgress.id },
    data: {
      completionPercentage: percentage,
      completedAt: percentage === 100 ? new Date() : null,
    },
  })
}

/**
 * Get lesson progress for a course
 */
export async function getLessonProgress(
  userId: string,
  courseId: string
): Promise<Map<string, { completed: boolean; watchedSeconds: number; lastPosition: number }>> {
  const courseProgress = await prisma.courseProgress.findUnique({
    where: {
      userId_courseId: { userId, courseId },
    },
    include: {
      lessonProgress: true,
    },
  })

  const progressMap = new Map<
    string,
    { completed: boolean; watchedSeconds: number; lastPosition: number }
  >()

  if (courseProgress) {
    for (const lp of courseProgress.lessonProgress) {
      progressMap.set(lp.lessonId, {
        completed: lp.completed,
        watchedSeconds: lp.watchedSeconds,
        lastPosition: lp.lastPosition,
      })
    }
  }

  return progressMap
}

/**
 * Calculate drip availability date for a lesson
 */
export function calculateDripAvailability(
  lesson: LessonWithDrip,
  course: CourseWithDrip,
  startedAt: Date,
  globalLessonIndex: number
): Date | null {
  // If drip is not enabled, lesson is immediately available
  if (!course.dripEnabled) {
    return null
  }

  const dripMode = lesson.dripMode || 'immediate'

  switch (dripMode) {
    case 'immediate':
      return null

    case 'fixed':
      if (lesson.availableAt) {
        return new Date(lesson.availableAt)
      }
      return null

    case 'offset':
      if (lesson.dripOffsetDays !== undefined && lesson.dripOffsetDays !== null) {
        const availableDate = new Date(startedAt)
        availableDate.setDate(availableDate.getDate() + lesson.dripOffsetDays)
        return availableDate
      }
      // Fallback to default drip days based on lesson order
      if (course.defaultDripDays) {
        const availableDate = new Date(startedAt)
        availableDate.setDate(availableDate.getDate() + course.defaultDripDays * globalLessonIndex)
        return availableDate
      }
      return null

    default:
      // If no dripMode is set but drip is enabled, use default days
      if (course.defaultDripDays) {
        const availableDate = new Date(startedAt)
        availableDate.setDate(availableDate.getDate() + course.defaultDripDays * globalLessonIndex)
        return availableDate
      }
      return null
  }
}

/**
 * Check if a user can access a specific lesson
 * Takes into account drip content, module unlock dates, and course access
 */
export async function canAccessLesson(
  userId: string | null,
  courseId: string,
  lesson: LessonWithDrip,
  course: CourseWithDrip,
  moduleUnlockDate?: string | null,
  globalLessonIndex: number = 0
): Promise<LessonAccessResult> {
  // 1. Free preview lessons are always accessible
  if (lesson.isFreePreview) {
    return { canAccess: true, reason: 'free_preview' }
  }

  // 2. Check course access (requires userId)
  if (!userId) {
    return { canAccess: false, reason: 'no_course_access' }
  }

  const courseAccess = await canAccessCourse(userId, courseId)
  if (!courseAccess.hasAccess) {
    return { canAccess: false, reason: 'no_course_access' }
  }

  // 3. Check module unlock date
  if (moduleUnlockDate) {
    const unlockDate = new Date(moduleUnlockDate)
    if (unlockDate > new Date()) {
      return { canAccess: false, reason: 'module_locked', availableAt: unlockDate }
    }
  }

  // 4. Check drip content
  if (!course.dripEnabled) {
    return { canAccess: true, reason: 'available' }
  }

  // Get user's course progress to determine startedAt
  const courseProgress = await prisma.courseProgress.findUnique({
    where: {
      userId_courseId: { userId, courseId },
    },
    select: {
      startedAt: true,
    },
  })

  // If no progress exists, create one and use current date as startedAt
  const startedAt = courseProgress?.startedAt || new Date()

  // Calculate availability
  const availableAt = calculateDripAvailability(lesson, course, startedAt, globalLessonIndex)

  if (availableAt && availableAt > new Date()) {
    return { canAccess: false, reason: 'drip_locked', availableAt }
  }

  return { canAccess: true, reason: 'available' }
}

/**
 * Get user's course start date (or create progress if not exists)
 */
export async function getCourseStartDate(userId: string, courseId: string): Promise<Date> {
  const courseProgress = await prisma.courseProgress.upsert({
    where: {
      userId_courseId: { userId, courseId },
    },
    create: {
      userId,
      courseId,
      completionPercentage: 0,
    },
    update: {},
    select: {
      startedAt: true,
    },
  })

  return courseProgress.startedAt
}
