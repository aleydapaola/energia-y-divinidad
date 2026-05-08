import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getCourseAccessList, grantCourseAccess, revokeCourseAccess } from "@/lib/course-access";
import { prisma } from "@/lib/prisma";
import { client } from "@/sanity/lib/client";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") {
    return null;
  }
  return session;
}

// GET /api/admin/courses/[courseId]/access — lista usuarios con acceso
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { courseId } = await params;
  const list = await getCourseAccessList(courseId);
  return NextResponse.json(list);
}

// POST /api/admin/courses/[courseId]/access — otorgar acceso
// Body: { email: string }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { courseId } = await params;
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Email requerido" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true },
  });

  if (!user) {
    return NextResponse.json(
      { error: "No existe ningún usuario registrado con ese email" },
      { status: 404 }
    );
  }

  const course = await client.fetch(`*[_type == "course" && _id == $id][0] { title }`, {
    id: courseId,
  });

  if (!course) {
    return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
  }

  await grantCourseAccess({
    userId: user.id,
    courseId,
    courseName: course.title,
  });

  return NextResponse.json({ ok: true, user });
}

// DELETE /api/admin/courses/[courseId]/access — revocar acceso
// Body: { userId: string }
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { courseId } = await params;
  const { userId } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: "userId requerido" }, { status: 400 });
  }

  await revokeCourseAccess({
    userId,
    courseId,
    revokedBy: session.user?.email ?? "admin",
  });

  return NextResponse.json({ ok: true });
}
