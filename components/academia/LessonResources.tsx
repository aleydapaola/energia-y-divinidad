"use client";

import {
  FileText,
  Music,
  Video,
  Link as LinkIcon,
  FileImage,
  File,
  Download,
  ExternalLink,
  Presentation,
} from "lucide-react";

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

interface LessonResourcesProps {
  resources: Resource[];
}

const resourceIcons = {
  pdf: FileText,
  audio: Music,
  video: Video,
  link: LinkIcon,
  powerpoint: Presentation,
  image: FileImage,
  other: File,
};

const resourceLabels = {
  pdf: "PDF",
  audio: "Audio",
  video: "Video",
  link: "Enlace",
  powerpoint: "Presentación",
  image: "Imagen",
  other: "Archivo",
};

export function LessonResources({ resources }: LessonResourcesProps) {
  if (!resources || resources.length === 0) {
    return null;
  }

  return (
    <section className="rounded-lg border border-[#e7ded7] bg-white p-4 sm:p-5">
      <h3 className="font-gazeta text-lg text-[#654177] mb-4">Recursos de la Lección</h3>

      <div className="space-y-3">
        {resources.map((resource, index) => {
          const Icon = resourceIcons[resource.resourceType];
          const fileUrl = resource.fileUrl || resource.file?.asset?.url;
          const url = fileUrl || resource.externalUrl;
          const isExternal = !fileUrl && !!resource.externalUrl;

          if (!url) {
            return null;
          }

          return (
            <div
              key={resource._key || `${resource.title}-${index}`}
              className="overflow-hidden rounded-lg border border-gray-200 bg-[#fbfaf8]"
            >
              <div className="flex items-center gap-3 p-3 sm:p-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-[#4944a4]/10 text-[#4944a4]">
                  <Icon className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-dm-sans font-medium text-gray-900">
                    {resource.title}
                  </p>
                  {resource.description && (
                    <p className="line-clamp-2 font-dm-sans text-sm text-gray-500">
                      {resource.description}
                    </p>
                  )}
                  <span className="font-dm-sans text-xs text-gray-400">
                    {resourceLabels[resource.resourceType]}
                  </span>
                </div>

                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={!isExternal ? resource.fileName || true : undefined}
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-[#4944a4]/10 hover:text-[#4944a4]"
                  aria-label={isExternal ? "Abrir recurso" : "Descargar recurso"}
                >
                  {isExternal ? (
                    <ExternalLink className="h-5 w-5" />
                  ) : (
                    <Download className="h-5 w-5" />
                  )}
                </a>
              </div>

              {fileUrl && resource.resourceType === "audio" && (
                <div className="border-t border-gray-200 bg-white p-3">
                  <audio src={fileUrl} controls preload="metadata" className="w-full" />
                </div>
              )}

              {fileUrl && resource.resourceType === "video" && (
                <div className="border-t border-gray-200 bg-black">
                  <video
                    src={fileUrl}
                    controls
                    preload="metadata"
                    className="aspect-video w-full"
                  />
                </div>
              )}

              {fileUrl && resource.resourceType === "pdf" && (
                <div className="border-t border-gray-200 bg-white">
                  <iframe src={fileUrl} title={resource.title} className="h-[420px] w-full" />
                </div>
              )}

              {fileUrl && resource.resourceType === "image" && (
                <div className="border-t border-gray-200 bg-white p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={fileUrl}
                    alt={resource.title}
                    className="max-h-[520px] w-full rounded-md object-contain"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
