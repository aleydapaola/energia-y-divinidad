import Image from "next/image";
import Link from "next/link";
import { groq } from "next-sanity";

import { prisma } from "@/lib/prisma";
import { client } from "@/sanity/lib/client";

interface SanityCourse {
  _id: string;
  title: string;
  slug: string;
  status: string;
  published: boolean;
  courseType: string;
  coverImage?: string;
  accessCount: number;
}

export default async function AdminCoursesPage() {
  const courses = await client.fetch<SanityCourse[]>(
    groq`*[_type == "course"] | order(displayOrder asc) {
      _id,
      title,
      "slug": slug.current,
      status,
      published,
      courseType,
      "coverImage": coverImage.asset->url
    }`
  );

  const courseIds = (courses ?? []).map((c) => c._id);

  const accessCounts =
    courseIds.length > 0
      ? await prisma.entitlement.groupBy({
          by: ["resourceId"],
          where: {
            type: "COURSE",
            resourceId: { in: courseIds },
            revoked: false,
          },
          _count: { id: true },
        })
      : [];

  const countMap = new Map(accessCounts.map((a) => [a.resourceId, a._count.id]));

  const enriched = (courses ?? []).map((c) => ({
    ...c,
    accessCount: countMap.get(c._id) ?? 0,
  }));

  const statusLabel: Record<string, string> = {
    draft: "Borrador",
    coming_soon: "Próximamente",
    active: "Activo",
    archived: "Archivado",
  };

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600",
    coming_soon: "bg-yellow-100 text-yellow-700",
    active: "bg-green-100 text-green-700",
    archived: "bg-red-100 text-red-600",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-gazeta text-3xl text-[#654177]">Academia — Cursos</h1>
        <p className="text-gray-500 font-dm-sans mt-1">
          Gestiona el acceso de usuarios a cada curso
        </p>
      </div>

      {enriched.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500 font-dm-sans">No hay cursos creados en Sanity todavía.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {enriched.map((course) => (
            <Link
              key={course._id}
              href={`/admin/courses/${course._id}`}
              className="flex items-center gap-4 bg-white rounded-xl border border-gray-200 p-4 hover:border-[#8A4BAF] hover:shadow-sm transition-all"
            >
              {course.coverImage ? (
                <Image
                  src={course.coverImage}
                  alt={course.title}
                  width={80}
                  height={56}
                  className="rounded-lg object-cover w-20 h-14 flex-shrink-0"
                />
              ) : (
                <div className="w-20 h-14 rounded-lg bg-[#f8f0f5] flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">🎓</span>
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-dm-sans font-semibold text-gray-900 truncate">
                    {course.title}
                  </h2>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[course.status] ?? "bg-gray-100 text-gray-600"}`}
                  >
                    {statusLabel[course.status] ?? course.status}
                  </span>
                  {!course.published && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-600">
                      No publicado
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 font-dm-sans mt-0.5">
                  {course.courseType === "simple" ? "Simple" : "Modular"}
                  {course.slug ? ` · /academia/${course.slug}` : ""}
                </p>
              </div>

              <div className="flex-shrink-0 text-right">
                <p className="text-2xl font-bold text-[#4944a4] font-gazeta">
                  {course.accessCount}
                </p>
                <p className="text-xs text-gray-500 font-dm-sans">
                  {course.accessCount === 1 ? "usuario" : "usuarios"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
