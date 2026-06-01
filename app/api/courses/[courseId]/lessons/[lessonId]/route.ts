import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { canAccessCourse, canAccessLesson } from "@/lib/course-access";
import { sanityFetch } from "@/sanity/lib/fetch";
import { LESSON_BY_ID_QUERY } from "@/sanity/lib/queries";

/**
 * GET /api/courses/[courseId]/lessons/[lessonId]
 * Returns full lesson data for an authenticated user with course access.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ courseId: string; lessonId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { courseId, lessonId } = await params;

    const access = await canAccessCourse(session.user.id, courseId);
    if (!access.hasAccess) {
      return NextResponse.json({ error: "Sin acceso al curso" }, { status: 403 });
    }

    const courseData = await sanityFetch<any>({
      query: `*[_type == "course" && _id == $courseId][0] {
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
      params: { courseId },
      tags: ["course"],
    });

    let courseLesson = null;
    let moduleUnlockDate = null;
    let globalLessonIndex = 0;

    if (courseData?.courseType === "simple" && courseData.simpleLesson?._id === lessonId) {
      courseLesson = courseData.simpleLesson;
    } else if (courseData?.modules) {
      let currentIndex = 0;
      for (const courseModule of courseData.modules) {
        for (const moduleLesson of courseModule.lessons || []) {
          if (moduleLesson._id === lessonId) {
            courseLesson = moduleLesson;
            moduleUnlockDate = courseModule.unlockDate;
            globalLessonIndex = currentIndex;
            break;
          }
          currentIndex++;
        }
        if (courseLesson) {
          break;
        }
      }
    }

    if (!courseLesson) {
      return NextResponse.json({ error: "Lección no encontrada en este curso" }, { status: 404 });
    }

    const lessonAccess = await canAccessLesson(
      session.user.id,
      courseId,
      courseLesson,
      courseData,
      moduleUnlockDate,
      globalLessonIndex
    );

    if (!lessonAccess.canAccess) {
      return NextResponse.json(
        {
          error: "Lección bloqueada",
          reason: lessonAccess.reason,
          availableAt: lessonAccess.availableAt?.toISOString() || null,
        },
        { status: 403 }
      );
    }

    const lesson = await sanityFetch<unknown>({
      query: LESSON_BY_ID_QUERY,
      params: { id: lessonId },
      tags: ["lesson"],
    });

    if (!lesson) {
      return NextResponse.json({ error: "Lección no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ lesson });
  } catch (error) {
    console.error("Error fetching lesson:", error);
    return NextResponse.json({ error: "Error al obtener la lección" }, { status: 500 });
  }
}
