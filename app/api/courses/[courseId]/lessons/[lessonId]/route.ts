import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { canAccessCourse } from "@/lib/course-access";
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
