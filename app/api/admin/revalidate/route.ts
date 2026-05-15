import { revalidateTag, revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/revalidate
 *
 * Force revalidation of Next.js cache for Sanity content.
 * Useful when the Sanity webhook fails or content updates don't appear in production.
 */
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (currentUser?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { type = "all", path } = body;

  const revalidated: string[] = [];

  if (type === "all" || type === "lesson" || type === "course") {
    revalidateTag("sanity");
    revalidateTag("course");
    revalidateTag("lesson");
    revalidated.push("tags: sanity, course, lesson");
  }

  if (path) {
    revalidatePath(path);
    revalidated.push(`path: ${path}`);
  }

  console.log(
    `[ADMIN/REVALIDATE] Manual revalidation by ${session.user.email}: ${revalidated.join(", ")}`
  );

  return NextResponse.json({
    success: true,
    revalidated,
    message: "Caché limpiado. Recarga la página en 5-10 segundos.",
  });
}
