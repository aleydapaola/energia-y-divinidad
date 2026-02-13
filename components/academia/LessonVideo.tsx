'use client'

import { useEffect, useRef, useState } from 'react'

interface LessonVideoProps {
  videoUrl: string
  lessonId: string
  initialPosition?: number
  onEnd?: () => void
  onProgress?: (watchedSeconds: number, position: number) => void
}

// YouTube IFrame API types
interface YTPlayerEvent {
  data: number
  target: YTPlayer
}

interface YTPlayer {
  destroy: () => void
  getCurrentTime: () => number
  playVideo: () => void
  pauseVideo: () => void
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
}

interface YTPlayerOptions {
  videoId: string
  playerVars?: {
    autoplay?: number
    modestbranding?: number
    rel?: number
    start?: number
  }
  events?: {
    onReady?: () => void
    onStateChange?: (event: YTPlayerEvent) => void
  }
}

interface YTNamespace {
  Player: new (elementId: string, options: YTPlayerOptions) => YTPlayer
  PlayerState: {
    ENDED: number
    PLAYING: number
    PAUSED: number
    BUFFERING: number
    CUED: number
  }
}

declare global {
  interface Window {
    YT: YTNamespace
    onYouTubeIframeAPIReady: () => void
  }
}

/**
 * Extract YouTube video ID from various URL formats
 */
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/, // Just the ID
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      return match[1]
    }
  }

  return null
}

export function LessonVideo({
  videoUrl,
  lessonId,
  initialPosition = 0,
  onEnd,
  onProgress,
}: LessonVideoProps) {
  const [isReady, setIsReady] = useState(false)
  const playerRef = useRef<YTPlayer | null>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const videoId = extractYouTubeId(videoUrl)

  useEffect(() => {
    if (!videoId) {return}

    // Load YouTube IFrame API
    if (!window.YT) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      const firstScriptTag = document.getElementsByTagName('script')[0]
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
    }

    const initPlayer = () => {
      if (playerRef.current) {
        playerRef.current.destroy()
      }

      playerRef.current = new window.YT.Player(`yt-player-${lessonId}`, {
        videoId,
        playerVars: {
          autoplay: 0,
          modestbranding: 1,
          rel: 0,
          start: initialPosition,
        },
        events: {
          onReady: () => setIsReady(true),
          onStateChange: (event: YTPlayerEvent) => {
            if (event.data === window.YT.PlayerState.ENDED && onEnd) {
              onEnd()
            }

            // Track progress while playing
            if (event.data === window.YT.PlayerState.PLAYING && onProgress) {
              progressIntervalRef.current = setInterval(() => {
                if (playerRef.current) {
                  const currentTime = Math.floor(playerRef.current.getCurrentTime())
                  onProgress(currentTime, currentTime)
                }
              }, 10000) // Report every 10 seconds
            } else {
              if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current)
              }
            }
          },
        },
      })
    }

    if (window.YT && window.YT.Player) {
      initPlayer()
    } else {
      window.onYouTubeIframeAPIReady = initPlayer
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
      if (playerRef.current) {
        playerRef.current.destroy()
      }
    }
  }, [videoId, lessonId, initialPosition, onEnd, onProgress])

  if (!videoId) {
    return (
      <div className="aspect-video bg-gray-900 flex items-center justify-center">
        <p className="text-white/50 font-dm-sans">Video no disponible</p>
      </div>
    )
  }

  return (
    <div className="aspect-video bg-black">
      <div id={`yt-player-${lessonId}`} className="w-full h-full" />
    </div>
  )
}
