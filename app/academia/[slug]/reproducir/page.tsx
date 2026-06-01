import { Metadata } from "next";
import { redirect, notFound } from "next/navigation";

import { auth } from "@/lib/auth";
import {
  canAccessCourse,
  getCourseStartDate,
  calculateDripAvailability,
} from "@/lib/course-access";
import { sanityFetch } from "@/sanity/lib/fetch";
import { COURSE_BY_SLUG_QUERY, LESSON_BY_ID_QUERY } from "@/sanity/lib/queries";

import { CoursePlayerClient } from "./CoursePlayerClient";

interface ReproducirPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lesson?: string }>;
}

function decodeSlugParam(slug: string) {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

export async function generateMetadata({ params }: ReproducirPageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = decodeSlugParam(rawSlug);
  const course = await sanityFetch<any>({
    query: COURSE_BY_SLUG_QUERY,
    params: { slug },
  });

  if (!course) {
    return { title: "Curso no encontrado" };
  }

  return {
    title: `${course.title} - Reproducir | Academia`,
    robots: "noindex, nofollow", // Private content
  };
}

export default async function ReproducirPage({ params, searchParams }: ReproducirPageProps) {
  const { slug: rawSlug } = await params;
  const slug = decodeSlugParam(rawSlug);
  const encodedSlug = encodeURIComponent(slug);
  const { lesson: lessonIdParam } = await searchParams;

  // Check authentication
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/auth/signin?callbackUrl=/academia/${encodedSlug}/reproducir`);
  }

  // Fetch course
  const course = await sanityFetch<any>({
    query: COURSE_BY_SLUG_QUERY,
    params: { slug },
  });

  if (!course) {
    notFound();
  }

  // Check access
  const access = await canAccessCourse(session.user.id, course._id);

  if (!access.hasAccess) {
    redirect(`/academia/${encodedSlug}`);
  }

  // Build modules array for the player
  let modules: any[] = [];

  if (course.courseType === "simple" && course.simpleLesson) {
    // For simple courses, create a single module with the lesson
    modules = [
      {
        _id: "main",
        title: "Contenido",
        lessons: [course.simpleLesson],
      },
    ];
  } else if (course.modules) {
    modules = course.modules.map((m: any) => ({
      ...m,
      lessons: (m.lessons || []).filter((l: any) => l.published !== false),
    }));
  }

  // Get all lessons flat
  const allLessons = modules.flatMap((m) => m.lessons || []);

  if (allLessons.length === 0) {
    redirect(`/academia/${encodedSlug}`);
  }

  // Get user's course start date for drip calculations
  const startedAt = await getCourseStartDate(session.user.id, course._id);

  // Helper function to check if a lesson is locked by module date or drip rules
  const getLessonAvailableAt = (
    lesson: any,
    globalIndex: number,
    moduleUnlockDate?: string | null
  ): Date | null => {
    if (lesson.isFreePreview) {
      return null;
    }

    if (moduleUnlockDate) {
      const unlockDate = new Date(moduleUnlockDate);
      if (unlockDate > new Date()) {
        return unlockDate;
      }
    }

    if (!course.dripEnabled) {
      return null;
    }

    return calculateDripAvailability(
      lesson,
      { _id: course._id, dripEnabled: course.dripEnabled, defaultDripDays: course.defaultDripDays },
      startedAt,
      globalIndex
    );
  };

  const isLessonLocked = (
    lesson: any,
    globalIndex: number,
    moduleUnlockDate?: string | null
  ): boolean => {
    const availableAt = getLessonAvailableAt(lesson, globalIndex, moduleUnlockDate);
    return availableAt !== null && availableAt > new Date();
  };

  // Find first available lesson (not drip locked)
  const findFirstAvailableLesson = (): string | null => {
    let globalIndex = 0;
    for (const courseModule of modules) {
      for (const lesson of courseModule.lessons || []) {
        if (!isLessonLocked(lesson, globalIndex, courseModule.unlockDate)) {
          return lesson._id;
        }
        globalIndex++;
      }
    }
    return null;
  };

  // Determine current lesson
  let currentLessonId: string | null | undefined = lessonIdParam;

  if (!currentLessonId || !allLessons.find((l: any) => l._id === currentLessonId)) {
    // Default to first available lesson
    currentLessonId = findFirstAvailableLesson();
    if (!currentLessonId) {
      redirect(`/academia/${encodedSlug}`);
    }
  } else {
    // Check if requested lesson is drip locked
    let globalIndex = 0;
    let foundLesson = null;
    for (const courseModule of modules) {
      for (const lesson of courseModule.lessons || []) {
        if (lesson._id === currentLessonId) {
          foundLesson = { lesson, globalIndex, moduleUnlockDate: courseModule.unlockDate };
          break;
        }
        globalIndex++;
      }
      if (foundLesson) {
        break;
      }
    }

    if (
      foundLesson &&
      isLessonLocked(foundLesson.lesson, foundLesson.globalIndex, foundLesson.moduleUnlockDate)
    ) {
      // Lesson is drip locked, redirect to first available
      currentLessonId = findFirstAvailableLesson();
      if (!currentLessonId) {
        redirect(`/academia/${encodedSlug}`);
      }
    }
  }

  // Fetch full lesson data
  const currentLesson = await sanityFetch<any>({
    query: LESSON_BY_ID_QUERY,
    params: { id: currentLessonId },
  });

  if (!currentLesson) {
    redirect(`/academia/${encodedSlug}`);
  }

  return (
    <CoursePlayerClient
      course={{
        _id: course._id,
        title: course.title,
        slug: course.slug,
        courseType: course.courseType,
        dripEnabled: course.dripEnabled,
        defaultDripDays: course.defaultDripDays,
      }}
      modules={modules}
      initialLesson={currentLesson}
      userId={session.user.id}
      startedAt={startedAt}
    />
  );
}
