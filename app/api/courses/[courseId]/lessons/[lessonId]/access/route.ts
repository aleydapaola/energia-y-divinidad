import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { canAccessLesson, canAccessCourse, getCourseStartDate } from "@/lib/course-access";
import { client } from "@/sanity/lib/client";

/**
 * GET /api/courses/[courseId]/lessons/[lessonId]/access
 * Verifica si el usuario puede acceder a una lección específica
 * Considera: acceso al curso, drip content, y fechas de módulo
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string; lessonId: string }> }
) {
  try {
    const session = await auth();
    const { courseId, lessonId } = await params;

    if (!courseId || !lessonId) {
      return NextResponse.json({ error: "courseId y lessonId requeridos" }, { status: 400 });
    }

    // Fetch course and lesson data from Sanity
    const courseData = await client.fetch(
      `*[_type == "course" && _id == $courseId][0] {
        _id,
        dripEnabled,
        defaultDripDays,
        courseType,
        "modules": modules[] {
          ...select(
            _type == "reference" => @-> {
              _id,
              unlockDate,
              "lessons": lessons[]-> {
                _id,
                order,
                isFreePreview,
                dripMode,
                dripOffsetDays,
                availableAt
              }
            },
            _type == "courseModuleAssignment" => {
              "_id": coalesce(module->_id, _key),
              "unlockDate": coalesce(unlockDate, module->unlockDate),
              "lessons": select(
                count(lessons) > 0 => lessons[] {
                  "_id": lesson->_id,
                  "order": lesson->order,
                  "isFreePreview": coalesce(isFreePreview, lesson->isFreePreview),
                  "dripMode": coalesce(dripMode, lesson->dripMode),
                  "dripOffsetDays": coalesce(dripOffsetDays, lesson->dripOffsetDays),
                  "availableAt": coalesce(availableAt, lesson->availableAt)
                },
                module->lessons[]-> {
                  _id,
                  order,
                  isFreePreview,
                  dripMode,
                  dripOffsetDays,
                  availableAt
                }
              )
            }
          )
        },
        "simpleLesson": simpleLesson-> {
          _id,
          order,
          isFreePreview,
          "dripMode": coalesce(^.simpleLessonDripMode, dripMode),
          "dripOffsetDays": coalesce(^.simpleLessonDripOffsetDays, dripOffsetDays),
          "availableAt": coalesce(^.simpleLessonAvailableAt, availableAt)
        }
      }`,
      { courseId }
    );

    if (!courseData) {
      return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
    }

    // Find the lesson and its module
    let lesson = null;
    let moduleUnlockDate = null;
    let globalLessonIndex = 0;

    if (courseData.courseType === "simple" && courseData.simpleLesson) {
      if (courseData.simpleLesson._id === lessonId) {
        lesson = courseData.simpleLesson;
        globalLessonIndex = 0;
      }
    } else if (courseData.modules) {
      let currentIndex = 0;
      for (const courseModule of courseData.modules) {
        if (courseModule.lessons) {
          for (const moduleLesson of courseModule.lessons) {
            if (moduleLesson._id === lessonId) {
              lesson = moduleLesson;
              moduleUnlockDate = courseModule.unlockDate;
              globalLessonIndex = currentIndex;
              break;
            }
            currentIndex++;
          }
        }
        if (lesson) {
          break;
        }
      }
    }

    if (!lesson) {
      return NextResponse.json({ error: "Lección no encontrada" }, { status: 404 });
    }

    // Check lesson access
    const accessResult = await canAccessLesson(
      session?.user?.id || null,
      courseId,
      lesson,
      courseData,
      moduleUnlockDate,
      globalLessonIndex
    );

    // Get course access for additional context
    let courseAccess = null;
    if (session?.user?.id) {
      courseAccess = await canAccessCourse(session.user.id, courseId);
    }

    // Get startedAt if user has access
    let startedAt = null;
    if (session?.user?.id && courseAccess?.hasAccess) {
      startedAt = await getCourseStartDate(session.user.id, courseId);
    }

    return NextResponse.json({
      canAccess: accessResult.canAccess,
      reason: accessResult.reason,
      availableAt: accessResult.availableAt?.toISOString() || null,
      courseAccess: courseAccess
        ? {
            hasAccess: courseAccess.hasAccess,
            reason: courseAccess.reason,
          }
        : null,
      startedAt: startedAt?.toISOString() || null,
    });
  } catch (error) {
    console.error("Error checking lesson access:", error);
    return NextResponse.json({ error: "Error al verificar acceso a la lección" }, { status: 500 });
  }
}
