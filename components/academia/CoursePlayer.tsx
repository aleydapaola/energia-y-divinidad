"use client";

import { PortableText } from "@portabletext/react";
import { Award, CheckCircle2, ChevronLeft, ClipboardList, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { getCourseHref, type CourseSlug } from "@/lib/course-slug";

import { CourseProgressBar } from "./CourseProgressBar";
import { LessonList } from "./LessonList";
import { LessonResources } from "./LessonResources";
import { LessonVideo } from "./LessonVideo";

import type { PortableTextBlock } from "@portabletext/types";

interface Resource {
  _key: string;
  title: string;
  resourceType: "pdf" | "audio" | "video" | "link" | "powerpoint" | "image" | "other";
  file?: { asset: { url: string } };
  fileUrl?: string;
  fileName?: string;
  externalUrl?: string;
  description?: string;
}

interface LessonContentBlock {
  _key: string;
  blockType: "text" | "video" | "audio" | "image" | "resource";
  title?: string;
  text?: PortableTextBlock[];
  videoUrl?: string;
  audioFileUrl?: string;
  audioFileName?: string;
  imageUrl?: string;
  imageAlt?: string;
  caption?: string;
  resource?: Resource;
}

interface LessonSubmodule {
  _key: string;
  title: string;
  description?: string;
  blocks?: LessonContentBlock[];
}

interface Lesson {
  _id: string;
  title: string;
  description?: string;
  lessonType: "video" | "live" | "text";
  videoUrl?: string;
  videoDuration?: string;
  liveSession?: {
    recordingUrl?: string;
  };
  content?: PortableTextBlock[];
  resources?: Resource[];
  submodules?: LessonSubmodule[];
  completed?: boolean;
  quizId?: string;
  requiresQuizToComplete?: boolean;
}

interface Module {
  _id: string;
  title: string;
  description?: string;
  unlockDate?: string;
  lessons: Lesson[];
}

interface QuizCertificateInfo {
  hasCertificate?: boolean;
  finalQuizId?: string;
  requiresFinalQuizToComplete?: boolean;
  hasPassedFinalQuiz?: boolean;
  existingCertificateId?: string;
}

interface CoursePlayerProps {
  course: {
    _id: string;
    title: string;
    slug: CourseSlug;
    courseType: "simple" | "modular";
  };
  modules: Module[];
  currentLesson: Lesson;
  progress: {
    completionPercentage: number;
    completedLessons: string[];
  };
  onLessonComplete: (lessonId: string) => void;
  onLessonSelect: (lessonId: string) => void;
  onProgressUpdate: (lessonId: string, watchedSeconds: number, position: number) => void;
  dripEnabled?: boolean;
  defaultDripDays?: number;
  startedAt?: Date;
  quizCertificateInfo?: QuizCertificateInfo;
}

export function CoursePlayer({
  course,
  modules,
  currentLesson,
  progress,
  onLessonComplete,
  onLessonSelect,
  onProgressUpdate,
  dripEnabled,
  defaultDripDays,
  startedAt,
  quizCertificateInfo,
}: CoursePlayerProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Flatten lessons for navigation
  const allLessons = modules.flatMap((m) =>
    m.lessons.map((l) => ({ ...l, moduleId: m._id, moduleTitle: m.title }))
  );

  const currentIndex = allLessons.findIndex((l) => l._id === currentLesson._id);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;
  const currentModuleIndex = modules.findIndex((m) =>
    m.lessons.some((lesson) => lesson._id === currentLesson._id)
  );
  const currentModule = currentModuleIndex >= 0 ? modules[currentModuleIndex] : null;
  const currentLessonIndexInModule = currentModule
    ? currentModule.lessons.findIndex((lesson) => lesson._id === currentLesson._id)
    : 0;
  const courseHref = getCourseHref(course.slug);
  const topBarTitle = currentModule?.title || currentLesson.title;
  const currentVideoUrl = currentLesson.videoUrl || currentLesson.liveSession?.recordingUrl;
  const isMediaLesson = currentLesson.lessonType === "video" || currentLesson.lessonType === "live";
  const hasSubmodules = Boolean(currentLesson.submodules?.length);

  const handleSelectLesson = (lessonId: string) => {
    onLessonSelect(lessonId);
    setSidebarOpen(false);

    window.setTimeout(() => {
      document.getElementById(`lesson-${lessonId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
  };

  const handleLessonComplete = (lessonId: string) => {
    if (!progress.completedLessons.includes(lessonId)) {
      onLessonComplete(lessonId);
    }
  };

  const handleMarkComplete = () => {
    handleLessonComplete(currentLesson._id);
    // Auto-advance to next lesson
    if (nextLesson) {
      handleSelectLesson(nextLesson._id);
    }
  };

  const renderContentBlock = (block: LessonContentBlock, index: number) => {
    const blockId = `${currentLesson._id}-${block._key || index}`;

    return (
      <div key={block._key || index} className="space-y-3">
        {block.title && (
          <h4 className="font-dm-sans text-lg font-semibold text-[#654177]">{block.title}</h4>
        )}

        {block.blockType === "text" && block.text && (
          <div className="prose prose-lg max-w-none overflow-hidden font-dm-sans prose-headings:text-[#654177] prose-a:text-[#4944a4]">
            <PortableText value={block.text} />
          </div>
        )}

        {block.blockType === "video" && block.videoUrl && (
          <div className="overflow-hidden rounded-lg bg-black shadow-sm">
            <LessonVideo
              videoUrl={block.videoUrl}
              lessonId={blockId}
              onEnd={() => handleLessonComplete(currentLesson._id)}
              onProgress={(seconds, position) =>
                onProgressUpdate(currentLesson._id, seconds, position)
              }
            />
          </div>
        )}

        {block.blockType === "audio" && block.audioFileUrl && (
          <div className="rounded-lg border border-[#e7ded7] bg-white p-4">
            <audio src={block.audioFileUrl} controls preload="metadata" className="w-full" />
          </div>
        )}

        {block.blockType === "image" && block.imageUrl && (
          <figure className="overflow-hidden rounded-lg border border-[#e7ded7] bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={block.imageUrl}
              alt={block.imageAlt || block.title || ""}
              className="max-h-[620px] w-full object-contain"
            />
          </figure>
        )}

        {block.blockType === "resource" && block.resource && (
          <LessonResources resources={[block.resource]} />
        )}

        {block.caption && (
          <p className="font-dm-sans text-sm italic text-[#654177]/70">{block.caption}</p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f8f5f2] lg:flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky inset-y-0 left-0 top-0 z-50 h-screen w-[86vw] max-w-80 transform bg-white shadow-lg transition-transform duration-300 lg:w-80 lg:max-w-none lg:transform-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Sidebar Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 z-10">
          <div className="flex items-center justify-between mb-4">
            <Link
              href={courseHref}
              className="flex items-center gap-2 text-gray-600 hover:text-[#4944a4] font-dm-sans text-sm"
            >
              <ChevronLeft className="h-4 w-4" />
              Volver al curso
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <h2 className="font-gazeta text-lg text-[#654177] line-clamp-2">{course.title}</h2>

          <CourseProgressBar percentage={progress.completionPercentage} />
        </div>

        {/* Lesson List */}
        <div className="overflow-y-auto h-[calc(100vh-180px)]">
          <LessonList
            modules={modules}
            currentLessonId={currentLesson._id}
            completedLessons={progress.completedLessons}
            onLessonSelect={handleSelectLesson}
            dripEnabled={dripEnabled}
            defaultDripDays={defaultDripDays}
            startedAt={startedAt}
            courseId={course._id}
          />
        </div>
      </aside>

      {/* Main Content */}
      <main className="min-w-0 flex-1">
        {/* Top Bar */}
        <div className="sticky top-0 z-30 grid min-h-16 grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] items-center gap-2 border-b border-[#e7ded7] bg-white/95 px-3 py-3 backdrop-blur sm:gap-4 lg:px-6">
          <div className="z-10 flex items-center gap-1 sm:gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-gray-600 hover:text-[#4944a4] lg:hidden"
              aria-label="Abrir menú"
            >
              <Menu className="h-6 w-6" />
            </button>
            <Link
              href={courseHref}
              className="hidden items-center gap-2 rounded-md px-2 py-2 font-dm-sans text-sm text-gray-600 transition-colors hover:bg-[#f8f5f2] hover:text-[#4944a4] sm:flex"
            >
              <ChevronLeft className="h-4 w-4" />
              Volver al curso
            </Link>
          </div>

          <div className="min-w-0 px-1 text-center sm:px-6">
            <p className="truncate font-dm-sans text-base font-bold text-[#654177] sm:text-lg">
              {course.title}
            </p>
            <h2 className="truncate font-dm-sans text-xs font-medium uppercase tracking-[0.12em] text-[#a690b0]">
              {topBarTitle}
            </h2>
          </div>

          <div className="z-10 flex justify-end">
            <Link
              href="/"
              className="hidden flex-shrink-0 items-center sm:flex"
              aria-label="Inicio"
            >
              <Image
                src="/images/EnergiaDinividadHeading.png"
                alt="Energía y Divinidad"
                width={136}
                height={34}
                className="h-7 w-auto lg:h-8"
                priority
              />
            </Link>
          </div>
        </div>

        {/* Module Content */}
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <header className="mb-8 border-b border-[#e7ded7] pb-6">
            <p className="font-dm-sans text-xs uppercase tracking-[0.18em] text-[#a690b0]">
              {currentModule ? `Módulo ${currentModuleIndex + 1}` : "Lección"}
            </p>
            <h1 className="mt-2 font-gazeta text-3xl text-[#654177] lg:text-4xl">
              {currentLesson.title}
            </h1>
            {currentLesson.description ? (
              <p className="mt-4 max-w-3xl whitespace-pre-line font-dm-sans text-base leading-7 text-[#654177]/80">
                {currentLesson.description}
              </p>
            ) : currentModule?.description ? (
              <p className="mt-4 max-w-3xl whitespace-pre-line font-dm-sans text-base leading-7 text-[#654177]/80">
                {currentModule.description}
              </p>
            ) : null}
          </header>

          <div className="space-y-12">
            {hasSubmodules ? (
              currentLesson.submodules?.map((submodule, submoduleIndex) => (
                <section
                  id={`lesson-${currentLesson._id}-submodule-${submodule._key}`}
                  key={submodule._key}
                  className="scroll-mt-24 border-b border-[#e7ded7] pb-10"
                >
                  <div className="mb-6">
                    <p className="font-dm-sans text-xs uppercase tracking-[0.14em] text-[#a690b0]">
                      {currentModule
                        ? `${currentModuleIndex + 1}.${currentLessonIndexInModule + 1}.${submoduleIndex + 1}`
                        : `${submoduleIndex + 1}`}
                    </p>
                    <h2 className="mt-1 font-gazeta text-2xl text-[#654177] lg:text-3xl">
                      {submodule.title}
                    </h2>
                    {submodule.description && (
                      <p className="mt-3 max-w-3xl whitespace-pre-line font-dm-sans text-base leading-7 text-[#654177]/80">
                        {submodule.description}
                      </p>
                    )}
                  </div>

                  <div className="space-y-8">
                    {submodule.blocks?.map((block, blockIndex) =>
                      renderContentBlock(block, blockIndex)
                    )}
                  </div>
                </section>
              ))
            ) : (
              <section id={`lesson-${currentLesson._id}`} className="scroll-mt-24">
                {isMediaLesson && (
                  <div className="mb-6 overflow-hidden rounded-lg bg-black shadow-sm">
                    {currentVideoUrl ? (
                      <LessonVideo
                        key={currentLesson._id}
                        videoUrl={currentVideoUrl}
                        lessonId={currentLesson._id}
                        onEnd={() => handleLessonComplete(currentLesson._id)}
                        onProgress={(seconds, position) =>
                          onProgressUpdate(currentLesson._id, seconds, position)
                        }
                      />
                    ) : (
                      <div className="flex min-h-40 items-center justify-center bg-white px-6 py-10 text-center sm:min-h-48">
                        <span className="font-dm-sans text-sm text-[#654177]/70">
                          El video de esta lección no está disponible todavía
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {currentLesson.content && (
                  <div className="prose prose-lg mb-8 max-w-none overflow-hidden font-dm-sans prose-headings:text-[#654177] prose-a:text-[#4944a4]">
                    <PortableText value={currentLesson.content} />
                  </div>
                )}

                {currentLesson.resources && currentLesson.resources.length > 0 && (
                  <LessonResources resources={currentLesson.resources} />
                )}
              </section>
            )}

            <div className="flex justify-end border-b border-[#e7ded7] pb-10">
              <button
                onClick={() => handleLessonComplete(currentLesson._id)}
                disabled={progress.completedLessons.includes(currentLesson._id)}
                className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 font-dm-sans text-sm font-semibold transition-colors ${
                  progress.completedLessons.includes(currentLesson._id)
                    ? "bg-green-50 text-green-700"
                    : "bg-[#4944a4] text-white hover:bg-[#3d3a8a]"
                }`}
              >
                <CheckCircle2 className="h-4 w-4" />
                {progress.completedLessons.includes(currentLesson._id)
                  ? "Lección completada"
                  : "Marcar lección completada"}
              </button>
            </div>

            {currentLesson.quizId && (
              <div className="rounded-lg border border-[#8A4BAF]/20 bg-[#8A4BAF]/5 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#8A4BAF]/10">
                    <ClipboardList className="h-5 w-5 text-[#8A4BAF]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-dm-sans font-medium text-[#654177]">Quiz de la lección</p>
                    <p className="font-dm-sans text-sm text-gray-600">
                      {currentLesson.requiresQuizToComplete
                        ? "Completa el quiz para marcar esta lección como terminada"
                        : "Pon a prueba tus conocimientos"}
                    </p>
                  </div>
                  <a
                    href={`${courseHref}/quiz/${currentLesson.quizId}?courseId=${course._id}&lessonId=${currentLesson._id}`}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-[#8A4BAF] px-4 py-2 font-dm-sans font-semibold text-white transition-colors hover:bg-[#7a3f9e]"
                  >
                    Tomar Quiz
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Course Completion / Certificate CTA */}
          {progress.completionPercentage >= 100 && quizCertificateInfo?.hasCertificate && (
            <div className="mt-8 p-6 bg-gradient-to-r from-[#8A4BAF]/10 to-[#4944a4]/10 border border-[#8A4BAF]/30 rounded-xl">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[#8A4BAF]/20 rounded-full">
                  <Award className="h-8 w-8 text-[#8A4BAF]" />
                </div>
                <div className="flex-1">
                  <p className="font-gazeta text-lg text-[#654177]">
                    {quizCertificateInfo.existingCertificateId
                      ? "¡Certificado disponible!"
                      : quizCertificateInfo.requiresFinalQuizToComplete &&
                          !quizCertificateInfo.hasPassedFinalQuiz
                        ? "Completa el examen final"
                        : "¡Felicitaciones! Puedes obtener tu certificado"}
                  </p>
                  <p className="font-dm-sans text-sm text-[#654177]/80">
                    {quizCertificateInfo.existingCertificateId
                      ? "Descarga tu certificado de completación"
                      : quizCertificateInfo.requiresFinalQuizToComplete &&
                          !quizCertificateInfo.hasPassedFinalQuiz
                        ? "Aprueba el examen final para obtener tu certificado"
                        : "Has completado todos los requisitos del curso"}
                  </p>
                </div>
                {quizCertificateInfo.existingCertificateId ? (
                  <a
                    href={`/api/certificates/${quizCertificateInfo.existingCertificateId}/download`}
                    className="flex items-center gap-2 bg-[#8A4BAF] hover:bg-[#7a3f9e] text-white font-dm-sans font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    Descargar
                  </a>
                ) : quizCertificateInfo.requiresFinalQuizToComplete &&
                  quizCertificateInfo.finalQuizId &&
                  !quizCertificateInfo.hasPassedFinalQuiz ? (
                  <a
                    href={`${courseHref}/quiz/${quizCertificateInfo.finalQuizId}?courseId=${course._id}`}
                    className="flex items-center gap-2 bg-[#8A4BAF] hover:bg-[#7a3f9e] text-white font-dm-sans font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    Tomar Examen
                  </a>
                ) : (
                  <a
                    href="/mi-cuenta/cursos"
                    className="flex items-center gap-2 bg-[#8A4BAF] hover:bg-[#7a3f9e] text-white font-dm-sans font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    Ver Certificado
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between gap-4">
              {/* Previous */}
              {prevLesson ? (
                <button
                  onClick={() => onLessonSelect(prevLesson._id)}
                  className="flex items-center gap-2 text-gray-600 hover:text-[#4944a4] font-dm-sans text-sm"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Anterior</span>
                </button>
              ) : (
                <div />
              )}

              {/* Mark Complete / Next */}
              <button
                onClick={handleMarkComplete}
                className="flex items-center gap-2 bg-[#4944a4] hover:bg-[#3d3a8a] text-white font-dm-sans font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                {progress.completedLessons.includes(currentLesson._id)
                  ? nextLesson
                    ? "Siguiente Lección"
                    : "Completado"
                  : nextLesson
                    ? "Completar y Continuar"
                    : "Marcar como Completado"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
