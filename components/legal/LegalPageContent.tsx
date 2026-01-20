import { Calendar } from 'lucide-react'
import PortableTextRenderer from '@/components/blog/PortableTextRenderer'

interface LegalPageContentProps {
  title: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any[]
  lastUpdated?: string | null
  version?: string | null
}

export default function LegalPageContent({
  title,
  content,
  lastUpdated,
  version,
}: LegalPageContentProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  return (
    <article className="max-w-4xl mx-auto">
      {/* Header */}
      <header className="mb-10 pb-8 border-b border-[#8A4BAF]/10">
        <h1 className="font-gazeta text-4xl sm:text-5xl text-[#4b316c] mb-4">
          {title}
        </h1>

        <div className="flex flex-wrap items-center gap-4 text-sm text-[#654177]">
          {lastUpdated && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Última actualización: {formatDate(lastUpdated)}</span>
            </div>
          )}
          {version && (
            <div className="px-3 py-1 bg-[#8A4BAF]/10 rounded-full text-[#8A4BAF] font-medium">
              Versión {version}
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="font-dm-sans">
        <PortableTextRenderer content={content} />
      </div>
    </article>
  )
}
