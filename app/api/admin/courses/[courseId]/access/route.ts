import { randomBytes } from "crypto";

import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getCourseAccessList, grantCourseAccess, revokeCourseAccess } from "@/lib/course-access";
import { sendCourseAccessEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { client } from "@/sanity/lib/client";

interface CourseAccessCourse {
  title: string;
  slug?: string | null;
}

interface GrantAccessResult {
  email: string;
  ok: boolean;
  error?: string;
  user?: {
    id: string;
    name: string | null;
    email: string;
  };
  createdUser?: boolean;
  invitationSent?: boolean;
  emailSent?: boolean;
}

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

function parseEmails(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input
      .flatMap((value) => String(value).split(/[\s,;]+/))
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
  }

  return String(input ?? "")
    .split(/[\s,;]+/)
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

async function grantAccessToEmail(params: {
  email: string;
  name?: unknown;
  courseId: string;
  course: CourseAccessCourse;
}): Promise<GrantAccessResult> {
  const { email, name, courseId, course } = params;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return { email, ok: false, error: "Email inválido" };
  }

  let user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, password: true, emailVerified: true },
  });
  let createdUser = false;
  let setPasswordToken: string | undefined;

  if (!user) {
    setPasswordToken = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const created = await prisma.user.create({
      data: {
        email,
        name: typeof name === "string" && name.trim() ? name.trim() : null,
        password: null,
        emailVerified: null,
      },
      select: { id: true, name: true, email: true, password: true, emailVerified: true },
    });

    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token: setPasswordToken,
        expires,
      },
    });

    user = created;
    createdUser = true;
  } else if (!user.password || !user.emailVerified) {
    await prisma.verificationToken.deleteMany({
      where: { identifier: email },
    });

    setPasswordToken = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.verificationToken.create({
      data: {
        identifier: email,
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

  return {
    email,
    ok: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    createdUser,
    invitationSent: Boolean(setPasswordToken),
    emailSent: emailResult.success,
  };
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
// Body: { email: string, name?: string } o { emails: string[] | string }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { courseId } = await params;
  const { email, emails, name } = await req.json();
  const emailList = Array.from(new Set(parseEmails(emails ?? email)));

  if (emailList.length === 0) {
    return NextResponse.json({ error: "Al menos un email es requerido" }, { status: 400 });
  }

  const course = await client.fetch<CourseAccessCourse | null>(
    `*[_type == "course" && _id == $id][0] {
      title,
      "slug": slug.current
    }`,
    { id: courseId }
  );

  if (!course) {
    return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
  }

  const results: GrantAccessResult[] = [];
  for (const emailAddress of emailList) {
    results.push(await grantAccessToEmail({ email: emailAddress, name, courseId, course }));
  }

  const failed = results.filter((result) => !result.ok);

  if (failed.length > 0 && failed.length === results.length) {
    return NextResponse.json(
      { error: "No se pudo otorgar acceso a ningún email", results },
      { status: 400 }
    );
  }

  const firstSuccess = results.find((result) => result.ok);

  return NextResponse.json({
    ok: true,
    user: firstSuccess?.user,
    createdUser: firstSuccess?.createdUser,
    invitationSent: firstSuccess?.invitationSent,
    emailSent: firstSuccess?.emailSent,
    results,
    total: results.length,
    successCount: results.length - failed.length,
    failedCount: failed.length,
  });
}

// PUT /api/admin/courses/[courseId]/access — reemplazar lista completa de accesos
// Body: { emails: string[] | string }
export async function PUT(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { courseId } = await params;
  const { emails } = await req.json();
  const emailList = Array.from(new Set(parseEmails(emails)));
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const invalidEmails = emailList.filter((email) => !emailRegex.test(email));

  if (invalidEmails.length > 0) {
    return NextResponse.json(
      { error: `Emails inválidos: ${invalidEmails.join(", ")}` },
      { status: 400 }
    );
  }

  const course = await client.fetch<CourseAccessCourse | null>(
    `*[_type == "course" && _id == $id][0] {
      title,
      "slug": slug.current
    }`,
    { id: courseId }
  );

  if (!course) {
    return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
  }

  const currentAccessList = await getCourseAccessList(courseId);
  const desiredEmails = new Set(emailList);
  const results: GrantAccessResult[] = [];

  for (const emailAddress of emailList) {
    results.push(await grantAccessToEmail({ email: emailAddress, courseId, course }));
  }

  const revokedUsers = [];
  for (const entry of currentAccessList) {
    const currentEmail = entry.userEmail?.toLowerCase();
    if (!currentEmail || desiredEmails.has(currentEmail)) {
      continue;
    }

    await revokeCourseAccess({
      userId: entry.userId,
      courseId,
      revokedBy: session.user?.email ?? "admin",
    });
    revokedUsers.push(currentEmail);
  }

  return NextResponse.json({
    ok: true,
    results,
    total: emailList.length,
    successCount: results.filter((result) => result.ok).length,
    failedCount: results.filter((result) => !result.ok).length,
    revokedCount: revokedUsers.length,
    revokedUsers,
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
