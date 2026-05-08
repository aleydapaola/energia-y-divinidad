import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { groq } from "next-sanity";

import { getCourseAccessList } from "@/lib/course-access";
import { client } from "@/sanity/lib/client";

import { CourseAccessManager } from "./CourseAccessManager";

interface Props {
  params: Promise<{ courseId: string }>;
}

export default async function AdminCourseAccessPage({ params }: Props) {
  const { courseId } = await params;

  const course = await client.fetch(
    groq`*[_type == "course" && _id == $id][0] {
      _id,
      title,
      "slug": slug.current,
      status,
      published,
      "coverImage": coverImage.asset->url
    }`,
    { id: courseId }
  );

  if (!course) {
    notFound();
  }

  const accessList = await getCourseAccessList(courseId);

  const statusLabel: Record<string, string> = {
    draft: "Borrador",
    coming_soon: "Próximamente",
    active: "Activo",
    archived: "Archivado",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/courses"
          className="p-2 text-gray-500 hover:text-[#8A4BAF] hover:bg-[#f8f0f5] rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="font-gazeta text-3xl text-[#654177]">{course.title}</h1>
          <p className="text-sm text-gray-500 font-dm-sans mt-0.5">
            {statusLabel[course.status] ?? course.status}
            {!course.published && " · No publicado"}
            {course.slug && ` · /academia/${course.slug}`}
          </p>
        </div>
      </div>

      <CourseAccessManager
        courseId={courseId}
        courseTitle={course.title}
        initialAccessList={accessList}
      />
    </div>
  );
}
