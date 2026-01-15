'use client'

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
} from 'lucide-react'

interface Resource {
  _key: string
  title: string
  resourceType: 'pdf' | 'audio' | 'video' | 'link' | 'powerpoint' | 'image' | 'other'
  file?: { asset: { url: string } }
  externalUrl?: string
  description?: string
}

interface LessonResourcesProps {
  resources: Resource[]
}

const resourceIcons = {
  pdf: FileText,
  audio: Music,
  video: Video,
  link: LinkIcon,
  powerpoint: Presentation,
  image: FileImage,
  other: File,
}

const resourceLabels = {
  pdf: 'PDF',
  audio: 'Audio',
  video: 'Video',
  link: 'Enlace',
  powerpoint: 'Presentación',
  image: 'Imagen',
  other: 'Archivo',
}

export function LessonResources({ resources }: LessonResourcesProps) {
  if (!resources || resources.length === 0) {
    return null
  }

  return (
    <div className="bg-gray-50 rounded-xl p-6">
      <h3 className="font-gazeta text-lg text-[#654177] mb-4">
        Recursos de la Lección
      </h3>

      <div className="space-y-3">
        {resources.map((resource) => {
          const Icon = resourceIcons[resource.resourceType]
          const url = resource.file?.asset?.url || resource.externalUrl
          const isExternal = !resource.file?.asset?.url && resource.externalUrl

          if (!url) return null

          return (
            <a
              key={resource._key}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              download={!isExternal ? true : undefined}
              className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200 hover:border-[#4944a4] hover:shadow-sm transition-all group"
            >
              <div className="flex-shrink-0 p-2.5 bg-[#4944a4]/10 rounded-lg text-[#4944a4] group-hover:bg-[#4944a4] group-hover:text-white transition-colors">
                <Icon className="h-5 w-5" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-dm-sans font-medium text-gray-900 truncate">
                  {resource.title}
                </p>
                {resource.description && (
                  <p className="text-sm text-gray-500 font-dm-sans truncate">
                    {resource.description}
                  </p>
                )}
                <span className="text-xs text-gray-400 font-dm-sans">
                  {resourceLabels[resource.resourceType]}
                </span>
              </div>

              <div className="flex-shrink-0 text-gray-400 group-hover:text-[#4944a4]">
                {isExternal ? (
                  <ExternalLink className="h-5 w-5" />
                ) : (
                  <Download className="h-5 w-5" />
                )}
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}
