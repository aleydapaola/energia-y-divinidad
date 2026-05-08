import { NextResponse } from "next/server";
import { groq } from "next-sanity";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { client } from "@/sanity/lib/client";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (user?.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const courses = await client.fetch(groq`*[_type == "course"] | order(displayOrder asc) {
    _id,
    title,
    "slug": slug.current,
    status,
    published,
    courseType,
    "coverImage": coverImage.asset->url
  }`);

  if (!courses || courses.length === 0) {
    return NextResponse.json([]);
  }

  const courseIds = courses.map((c: { _id: string }) => c._id);

  const accessCounts = await prisma.entitlement.groupBy({
    by: ["resourceId"],
    where: {
      type: "COURSE",
      resourceId: { in: courseIds },
      revoked: false,
    },
    _count: { id: true },
  });

  const countMap = new Map(accessCounts.map((a) => [a.resourceId, a._count.id]));

  return NextResponse.json(
    courses.map((c: any) => ({
      ...c,
      accessCount: countMap.get(c._id) ?? 0,
    }))
  );
}
