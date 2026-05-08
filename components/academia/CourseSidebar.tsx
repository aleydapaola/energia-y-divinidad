"use client";

import { Play, Users, Shield, Clock, Lock } from "lucide-react";
import Link from "next/link";

interface CourseSidebarProps {
  course: {
    _id: string;
    title: string;
    slug: { current: string };
    totalDuration?: string;
    lessonCount?: number;
    includedInMembership?: boolean;
    membershipTiers?: { _id: string; name: string }[];
  };
  currency?: "COP" | "USD";
  hasAccess?: boolean;
  hasMembership?: boolean;
}

export function CourseSidebar({
  course,
  hasAccess = false,
  hasMembership = false,
}: CourseSidebarProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 sticky top-24">
      {/* Price */}
      <div className="mb-6">
        {hasAccess ? (
          <div className="flex items-center gap-2 text-green-600 font-dm-sans font-semibold">
            <Shield className="h-5 w-5" />
            Ya tienes acceso
          </div>
        ) : hasMembership && course.includedInMembership ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[#8A4BAF] font-dm-sans font-semibold">
              <Users className="h-5 w-5" />
              Incluido en tu membresía
            </div>
            <p className="text-sm text-gray-500 font-dm-sans">
              Accede directamente con tu membresía activa
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-gray-500 font-dm-sans">
            <Lock className="h-5 w-5" />
            Acceso restringido
          </div>
        )}
      </div>

      {/* CTA */}
      {hasAccess || (hasMembership && course.includedInMembership) ? (
        <Link
          href={`/academia/${course.slug.current}/reproducir`}
          className="w-full flex items-center justify-center gap-2 bg-[#4944a4] hover:bg-[#3d3a8a] text-white font-dm-sans font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          <Play className="h-5 w-5" />
          Acceder al Curso
        </Link>
      ) : (
        <div className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-500 font-dm-sans font-semibold py-3 px-6 rounded-lg cursor-not-allowed">
          <Lock className="h-5 w-5" />
          Acceso por invitación
        </div>
      )}

      {/* Membership upsell */}
      {!hasAccess && !hasMembership && course.includedInMembership && (
        <div className="mt-4 p-4 bg-[#f8f0f5] rounded-lg">
          <p className="text-sm text-[#654177] font-dm-sans mb-2">
            <Users className="inline h-4 w-4 mr-1" />
            Este curso está incluido en la membresía
          </p>
          <Link
            href="/membresia"
            className="text-sm text-[#4944a4] hover:underline font-dm-sans font-medium"
          >
            Ver planes de membresía
          </Link>
        </div>
      )}

      {/* Divider */}
      <hr className="my-6 border-gray-200" />

      {/* Course Info */}
      <div className="space-y-4">
        <h4 className="font-dm-sans font-semibold text-gray-900">Este curso incluye:</h4>

        <ul className="space-y-3 font-dm-sans text-sm text-gray-600">
          {course.totalDuration && (
            <li className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-[#8A4BAF]" />
              {course.totalDuration} de contenido
            </li>
          )}
          {course.lessonCount && course.lessonCount > 0 && (
            <li className="flex items-center gap-3">
              <Play className="h-5 w-5 text-[#8A4BAF]" />
              {course.lessonCount} {course.lessonCount === 1 ? "lección" : "lecciones"}
            </li>
          )}
          <li className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-[#8A4BAF]" />
            Acceso de por vida
          </li>
        </ul>
      </div>
    </div>
  );
}
