'use client'

interface YouTubePlayerProps {
  url: string
  title: string
}

export default function YouTubePlayer({ url, title }: YouTubePlayerProps) {
  // Extraer el ID del video de YouTube de diferentes formatos de URL
  const getYouTubeId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    return match && match[2].length === 11 ? match[2] : null
  }

  const videoId = getYouTubeId(url)

  if (!videoId) {
    return (
      <div className="bg-gray-100 rounded-lg p-8 text-center">
        <p className="font-sans text-gray-600">
          No se pudo cargar el video. URL inválida.
        </p>
      </div>
    )
  }

  return (
    <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-2xl bg-black">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 w-full h-full"
      />
    </div>
  )
}
