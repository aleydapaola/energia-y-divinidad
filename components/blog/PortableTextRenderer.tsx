'use client'

import { PortableText, PortableTextComponents } from '@portabletext/react'
import Image from 'next/image'
import { Info, AlertTriangle, Lightbulb, AlertCircle, Play, Pause } from 'lucide-react'
import { useRef, useState, useEffect } from 'react'

// Video Embed Component
function VideoEmbed({ value }: { value: { url: string; title?: string; caption?: string } }) {
  const { url, title, caption } = value

  // Extract YouTube video ID
  const getYouTubeId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    return match && match[2].length === 11 ? match[2] : null
  }

  // Extract Vimeo video ID
  const getVimeoId = (url: string): string | null => {
    const regExp = /vimeo\.com\/(?:.*\/)?(\d+)/
    const match = url.match(regExp)
    return match ? match[1] : null
  }

  const youtubeId = getYouTubeId(url)
  const vimeoId = getVimeoId(url)

  if (youtubeId) {
    return (
      <figure className="my-8">
        <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-lg bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1`}
            title={title || 'Video de YouTube'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>
        {caption && (
          <figcaption className="text-center text-sm text-gray-500 mt-3 italic">
            {caption}
          </figcaption>
        )}
      </figure>
    )
  }

  if (vimeoId) {
    return (
      <figure className="my-8">
        <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-lg bg-black">
          <iframe
            src={`https://player.vimeo.com/video/${vimeoId}`}
            title={title || 'Video de Vimeo'}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>
        {caption && (
          <figcaption className="text-center text-sm text-gray-500 mt-3 italic">
            {caption}
          </figcaption>
        )}
      </figure>
    )
  }

  // Fallback for other video URLs (direct mp4, etc.)
  return (
    <figure className="my-8">
      <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-lg bg-black">
        <video
          src={url}
          controls
          className="absolute inset-0 w-full h-full"
          title={title}
        >
          Tu navegador no soporta el elemento de video.
        </video>
      </div>
      {caption && (
        <figcaption className="text-center text-sm text-gray-500 mt-3 italic">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}

// Audio Player Component for Blog
function BlogAudioPlayer({ value }: {
  value: {
    audioType: 'external' | 'file'
    externalUrl?: string
    audioFile?: { asset: { url: string } }
    title?: string
    caption?: string
    duration?: string
  }
}) {
  const { audioType, externalUrl, audioFile, title, caption, duration } = value
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => setCurrentTime(audio.currentTime)
    const updateDuration = () => setAudioDuration(audio.duration)
    const handleEnded = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', updateDuration)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio) return

    const newTime = parseFloat(e.target.value)
    audio.currentTime = newTime
    setCurrentTime(newTime)
  }

  const formatTime = (time: number): string => {
    if (!isFinite(time)) return '0:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Handle external URLs (Spotify, SoundCloud, etc.)
  if (audioType === 'external' && externalUrl) {
    // Spotify embed
    if (externalUrl.includes('spotify.com')) {
      const spotifyUri = externalUrl
        .replace('https://open.spotify.com/', 'https://open.spotify.com/embed/')
        .split('?')[0]

      return (
        <figure className="my-8">
          <iframe
            src={spotifyUri}
            width="100%"
            height="152"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="rounded-xl"
            title={title || 'Spotify'}
          />
          {caption && (
            <figcaption className="text-center text-sm text-gray-500 mt-3 italic">
              {caption}
            </figcaption>
          )}
        </figure>
      )
    }

    // SoundCloud embed
    if (externalUrl.includes('soundcloud.com')) {
      return (
        <figure className="my-8">
          <iframe
            width="100%"
            height="166"
            scrolling="no"
            frameBorder="no"
            allow="autoplay"
            src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(externalUrl)}&color=%238A4BAF&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`}
            className="rounded-xl"
            title={title || 'SoundCloud'}
          />
          {caption && (
            <figcaption className="text-center text-sm text-gray-500 mt-3 italic">
              {caption}
            </figcaption>
          )}
        </figure>
      )
    }

    // Generic external audio URL
    return (
      <figure className="my-8">
        <div className="bg-gradient-to-br from-[#f8f0f5] to-white rounded-xl shadow-lg p-6 border border-[#8A4BAF]/20">
          <audio ref={audioRef} src={externalUrl} preload="metadata" />

          <div className="flex items-center gap-4">
            <button
              onClick={togglePlay}
              className="p-3 bg-[#8A4BAF] hover:bg-[#654177] text-white rounded-full shadow-lg transition-all"
              title={isPlaying ? 'Pausar' : 'Reproducir'}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6 ml-0.5" />
              )}
            </button>

            <div className="flex-1">
              {title && <p className="font-medium text-[#654177] mb-2">{title}</p>}
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max={audioDuration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  className="flex-1 h-2 bg-[#8A4BAF]/20 rounded-lg appearance-none cursor-pointer accent-[#8A4BAF]"
                />
                <span className="text-sm text-gray-500 min-w-[80px] text-right">
                  {formatTime(currentTime)} / {duration || formatTime(audioDuration)}
                </span>
              </div>
            </div>
          </div>
        </div>
        {caption && (
          <figcaption className="text-center text-sm text-gray-500 mt-3 italic">
            {caption}
          </figcaption>
        )}
      </figure>
    )
  }

  // Handle uploaded audio files
  if (audioType === 'file' && audioFile?.asset?.url) {
    return (
      <figure className="my-8">
        <div className="bg-gradient-to-br from-[#f8f0f5] to-white rounded-xl shadow-lg p-6 border border-[#8A4BAF]/20">
          <audio ref={audioRef} src={audioFile.asset.url} preload="metadata" />

          <div className="flex items-center gap-4">
            <button
              onClick={togglePlay}
              className="p-3 bg-[#8A4BAF] hover:bg-[#654177] text-white rounded-full shadow-lg transition-all"
              title={isPlaying ? 'Pausar' : 'Reproducir'}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6 ml-0.5" />
              )}
            </button>

            <div className="flex-1">
              {title && <p className="font-medium text-[#654177] mb-2">{title}</p>}
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max={audioDuration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  className="flex-1 h-2 bg-[#8A4BAF]/20 rounded-lg appearance-none cursor-pointer accent-[#8A4BAF]"
                />
                <span className="text-sm text-gray-500 min-w-[80px] text-right">
                  {formatTime(currentTime)} / {duration || formatTime(audioDuration)}
                </span>
              </div>
            </div>
          </div>
        </div>
        {caption && (
          <figcaption className="text-center text-sm text-gray-500 mt-3 italic">
            {caption}
          </figcaption>
        )}
      </figure>
    )
  }

  return null
}

// Callout Component
function Callout({ value }: { value: { type: string; text: string } }) {
  const { type, text } = value

  const styles: Record<string, { bg: string; border: string; icon: React.ReactNode; title: string }> = {
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: <Info className="w-5 h-5 text-blue-500" />,
      title: 'Información',
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
      title: 'Advertencia',
    },
    tip: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: <Lightbulb className="w-5 h-5 text-green-500" />,
      title: 'Consejo',
    },
    important: {
      bg: 'bg-[#f8f0f5]',
      border: 'border-[#8A4BAF]/30',
      icon: <AlertCircle className="w-5 h-5 text-[#8A4BAF]" />,
      title: 'Importante',
    },
  }

  const style = styles[type] || styles.info

  return (
    <div className={`my-6 p-4 rounded-xl border ${style.bg} ${style.border}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{style.icon}</div>
        <div>
          <p className="font-medium text-gray-800 mb-1">{style.title}</p>
          <p className="text-gray-600">{text}</p>
        </div>
      </div>
    </div>
  )
}

// Image Component
function BlogImage({ value }: { value: { asset: { url: string }; alt?: string; caption?: string } }) {
  const { asset, alt, caption } = value

  return (
    <figure className="my-8">
      <div className="relative w-full rounded-xl overflow-hidden shadow-lg">
        <Image
          src={asset.url}
          alt={alt || 'Imagen del artículo'}
          width={1200}
          height={675}
          className="w-full h-auto object-cover"
        />
      </div>
      {caption && (
        <figcaption className="text-center text-sm text-gray-500 mt-3 italic">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}

// Portable Text Components Configuration
const components: PortableTextComponents = {
  block: {
    h2: ({ children }) => (
      <h2 className="font-gazeta text-3xl sm:text-4xl text-[#8A4BAF] mt-12 mb-6">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="font-gazeta text-2xl text-[#654177] mt-10 mb-4">
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="font-gazeta text-xl text-[#654177] mt-8 mb-3">
        {children}
      </h4>
    ),
    normal: ({ children }) => (
      <p className="text-gray-700 leading-relaxed mb-6">
        {children}
      </p>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-[#8A4BAF] pl-6 my-8 italic text-gray-600 text-lg">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <ul className="list-disc list-inside space-y-2 mb-6 text-gray-700">
        {children}
      </ul>
    ),
    number: ({ children }) => (
      <ol className="list-decimal list-inside space-y-2 mb-6 text-gray-700">
        {children}
      </ol>
    ),
  },
  listItem: {
    bullet: ({ children }) => <li className="ml-4">{children}</li>,
    number: ({ children }) => <li className="ml-4">{children}</li>,
  },
  marks: {
    strong: ({ children }) => <strong className="font-semibold text-gray-800">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    code: ({ children }) => (
      <code className="bg-gray-100 text-[#8A4BAF] px-2 py-0.5 rounded text-sm font-mono">
        {children}
      </code>
    ),
    link: ({ children, value }) => (
      <a
        href={value?.href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[#4944a4] hover:text-[#3d3a8a] underline underline-offset-2"
      >
        {children}
      </a>
    ),
  },
  types: {
    image: BlogImage,
    callout: Callout,
    videoEmbed: VideoEmbed,
    audioEmbed: BlogAudioPlayer,
  },
}

interface PortableTextRendererProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any[]
}

export default function PortableTextRenderer({ content }: PortableTextRendererProps) {
  return (
    <div className="prose prose-lg max-w-none">
      <PortableText value={content} components={components} />
    </div>
  )
}
