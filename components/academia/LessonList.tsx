"use client";

import {
  ChevronDown,
  ChevronUp,
  PlayCircle,
  FileText,
  Video,
  Check,
  Clock,
  ClipboardList,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { calculateDripAvailability, type DripMode } from "@/lib/course-access";

interface Lesson {
  _id: string;
  title: string;
  order?: number;
  lessonType: "video" | "live" | "text";
  videoDuration?: string;
  isFreePreview?: boolean;
  dripMode?: DripMode;
  dripOffsetDays?: number;
  availableAt?: string;
  quizId?: string;
  requiresQuizToComplete?: boolean;
}

interface Module {
  _id: string;
  title: string;
  unlockDate?: string;
  lessons: Lesson[];
}

interface LessonListProps {
  modules: Module[];
  currentLessonId: string;
  completedLessons: string[];
  onLessonSelect: (lessonId: string) => void;
  dripEnabled?: boolean;
  defaultDripDays?: number;
  startedAt?: Date | null;
  courseId?: string;
}

function formatDaysUntil(date: Date): string {
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return "Disponible";
  }
  if (diffDays === 1) {
    return "Mañana";
  }
  if (diffDays < 7) {
    return `${diffDays} días`;
  }

  return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

const lessonTypeIcons = {
  video: PlayCircle,
  live: Video,
  text: FileText,
};

function getInitialExpandedModules(modules: Module[], currentModuleId?: string): string[] {
  if (currentModuleId) {
    return [currentModuleId];
  }

  if (modules[0]?._id) {
    return [modules[0]._id];
  }

  return [];
}

export function LessonList({
  modules,
  currentLessonId,
  completedLessons,
  onLessonSelect,
  dripEnabled = false,
  defaultDripDays,
  startedAt,
  courseId,
}: LessonListProps) {
  const currentModuleId = useMemo(
    () =>
      modules.find((courseModule) =>
        courseModule.lessons.some((lesson) => lesson._id === currentLessonId)
      )?._id,
    [modules, currentLessonId]
  );
  const [expandedModules, setExpandedModules] = useState<string[]>(
    getInitialExpandedModules(modules, currentModuleId)
  );

  useEffect(() => {
    if (!currentModuleId) {
      return;
    }

    setExpandedModules((prev) =>
      prev.includes(currentModuleId) ? prev : [...prev, currentModuleId]
    );
  }, [currentModuleId]);

  // Calculate drip availability for all lessons
  const lessonAvailability = useMemo(() => {
    const availability = new Map<string, Date | null>();

    if (!dripEnabled) {
      return availability;
    }

    const courseData = { _id: courseId || "", dripEnabled, defaultDripDays };
    const effectiveStartedAt = startedAt || new Date();

    let globalIndex = 0;
    for (const courseModule of modules) {
      const moduleUnlockDate = courseModule.unlockDate ? new Date(courseModule.unlockDate) : null;

      for (const lesson of courseModule.lessons) {
        if (moduleUnlockDate && moduleUnlockDate > new Date()) {
          availability.set(lesson._id, moduleUnlockDate);
        } else {
          const availableAt = calculateDripAvailability(
            lesson,
            courseData,
            effectiveStartedAt,
            globalIndex
          );
          availability.set(lesson._id, availableAt);
        }
        globalIndex++;
      }
    }

    return availability;
  }, [dripEnabled, courseId, defaultDripDays, startedAt, modules]);

  const isDripLocked = (lessonId: string, isFreePreview?: boolean): boolean => {
    if (isFreePreview) {
      return false;
    }
    if (!dripEnabled) {
      return false;
    }
    const availableAt = lessonAvailability.get(lessonId);
    return availableAt !== null && availableAt !== undefined && availableAt > new Date();
  };

  const getDripAvailableAt = (lessonId: string): Date | null => {
    const availableAt = lessonAvailability.get(lessonId);
    if (availableAt && availableAt > new Date()) {
      return availableAt;
    }
    return null;
  };

  const handleLessonClick = (lesson: Lesson) => {
    if (isDripLocked(lesson._id, lesson.isFreePreview)) {
      return;
    }
    onLessonSelect(lesson._id);
  };

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) =>
      prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId]
    );
  };

  return (
    <div className="space-y-2 p-3">
      {modules.map((courseModule, moduleIndex) => {
        const isExpanded = expandedModules.includes(courseModule._id);
        const hasActiveLesson = courseModule.lessons.some(
          (lesson) => lesson._id === currentLessonId
        );

        return (
          <div
            key={courseModule._id}
            className={`overflow-hidden rounded-lg border transition-colors ${
              hasActiveLesson ? "border-[#4944a4]/25 bg-[#4944a4]/5" : "border-gray-200 bg-white"
            }`}
          >
            {/* Module Header */}
            <button
              type="button"
              onClick={() => toggleModule(courseModule._id)}
              className="flex w-full items-center justify-between gap-3 bg-gray-50 px-3 py-3 text-left transition-colors hover:bg-gray-100"
              aria-expanded={isExpanded}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium font-dm-sans ${
                    hasActiveLesson ? "bg-[#4944a4] text-white" : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {moduleIndex + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="truncate font-dm-sans text-sm font-semibold text-gray-800">
                    {courseModule.title}
                  </h3>
                  <p className="font-dm-sans text-xs text-gray-500">
                    {courseModule.lessons.length}{" "}
                    {courseModule.lessons.length === 1 ? "lección" : "lecciones"}
                  </p>
                </div>
              </div>

              {isExpanded ? (
                <ChevronUp className="h-4 w-4 flex-shrink-0 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-400" />
              )}
            </button>

            {/* Lessons */}
            {isExpanded && (
              <div className="divide-y divide-gray-100">
                {courseModule.lessons.map((lesson, lessonIndex) => {
                  const Icon = lessonTypeIcons[lesson.lessonType];
                  const isActive = lesson._id === currentLessonId;
                  const isCompleted = completedLessons.includes(lesson._id);
                  const dripLocked = isDripLocked(lesson._id, lesson.isFreePreview);
                  const dripAvailableAt = getDripAvailableAt(lesson._id);
                  let lessonButtonClass = "hover:bg-gray-50 border-l-4 border-transparent";
                  let indicatorClass = "bg-gray-100 text-gray-400";
                  let titleClass = "text-gray-700";

                  if (dripLocked) {
                    lessonButtonClass = "opacity-60 cursor-not-allowed";
                    indicatorClass = "bg-amber-100 text-amber-600";
                    titleClass = "text-gray-500";
                  } else if (isActive) {
                    lessonButtonClass = "bg-[#4944a4]/10 border-l-4 border-[#4944a4]";
                    indicatorClass = "bg-[#4944a4] text-white";
                    titleClass = "text-[#4944a4] font-medium";
                  } else if (isCompleted) {
                    indicatorClass = "bg-green-500 text-white";
                    titleClass = "text-gray-500";
                  }

                  let StatusIcon = Icon;
                  if (dripLocked) {
                    StatusIcon = Clock;
                  } else if (isCompleted) {
                    StatusIcon = Check;
                  }

                  return (
                    <button
                      key={lesson._id}
                      onClick={() => handleLessonClick(lesson)}
                      disabled={dripLocked}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${lessonButtonClass}`}
                    >
                      {/* Completion/Icon indicator */}
                      <div
                        className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${indicatorClass}`}
                      >
                        <StatusIcon className="h-3.5 w-3.5" />
                      </div>

                      {/* Lesson info */}
                      <div className="flex-1 min-w-0">
                        <p className={`font-dm-sans text-sm truncate ${titleClass}`}>
                          {moduleIndex + 1}.{lessonIndex + 1} {lesson.title}
                        </p>
                        {dripLocked && dripAvailableAt ? (
                          <p className="text-xs text-amber-600 font-dm-sans">
                            {formatDaysUntil(dripAvailableAt)}
                          </p>
                        ) : (
                          <div className="flex items-center gap-2">
                            {lesson.videoDuration && (
                              <span className="text-xs text-gray-400 font-dm-sans">
                                {lesson.videoDuration}
                              </span>
                            )}
                            {lesson.quizId && (
                              <span className="inline-flex items-center gap-1 text-xs text-[#8A4BAF] font-dm-sans">
                                <ClipboardList className="h-3 w-3" />
                                Quiz
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
