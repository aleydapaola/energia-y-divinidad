import { randomBytes } from "crypto";

import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getCourseAccessList, grantCourseAccess, revokeCourseAccess } from "@/lib/course-access";
import { sendCourseAccessEmail } from "@/lib/email";
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
  const { email, name } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Email requerido" }, { status: 400 });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(normalizedEmail)) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  }

  const course = await client.fetch(
    `*[_type == "course" && _id == $id][0] {
      title,
      "slug": slug.current
    }`,
    { id: courseId }
  );

  if (!course) {
    return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
  }

  let user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, name: true, email: true, password: true, emailVerified: true },
  });
  let createdUser = false;
  let setPasswordToken: string | undefined;

  if (!user) {
    setPasswordToken = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const created = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: typeof name === "string" && name.trim() ? name.trim() : null,
        password: null,
        emailVerified: null,
      },
      select: { id: true, name: true, email: true, password: true, emailVerified: true },
    });

    await prisma.verificationToken.create({
      data: {
        identifier: normalizedEmail,
        token: setPasswordToken,
        expires,
      },
    });

    user = created;
    createdUser = true;
  } else if (!user.password || !user.emailVerified) {
    await prisma.verificationToken.deleteMany({
      where: { identifier: normalizedEmail },
    });

    setPasswordToken = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.verificationToken.create({
      data: {
        identifier: normalizedEmail,
        token: setPasswordToken,
        expires,
      },
    });
  }

  await grantCourseAccess({
    userId: user.id,
    courseId,
    courseName: course.title,
  });

  const emailResult = await sendCourseAccessEmail({
    email: user.email,
    name: user.name || "Usuario",
    courseTitle: course.title,
    courseSlug: course.slug,
    setPasswordToken,
  });

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    createdUser,
    invitationSent: Boolean(setPasswordToken),
    emailSent: emailResult.success,
  });
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
