'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface ReplayVideoPlayerProps {
  videoUrl: string
  eventId: string
  bookingId: string
  initialPosition?: number
  eventTitle: string
}

// Helper functions
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {return match[1]}
  }
  return null
}

function extractVimeoId(url: string): string | null {
  const pattern = /vimeo\.com\/(?:video\/)?(\d+)/
  const match = url.match(pattern)
  return match ? match[1] : null
}

function getVideoType(url: string): 'youtube' | 'vimeo' | 'native' {
  if (extractYouTubeId(url)) {return 'youtube'}
  if (extractVimeoId(url)) {return 'vimeo'}
  return 'native'
}

export function ReplayVideoPlayer({
  videoUrl,
  eventId,
  bookingId,
  initialPosition = 0,
  eventTitle,
}: ReplayVideoPlayerProps) {
  const [totalWatched, setTotalWatched] = useState(0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastReportedRef = useRef(0)

  const videoType = getVideoType(videoUrl)
  const youtubeId = extractYouTubeId(videoUrl)
  const vimeoId = extractVimeoId(videoUrl)

  // Report progress to API
  const reportProgress = useCallback(
    async (seconds: number, position: number) => {
      // Only report if significant change (at least 5 seconds)
      if (Math.abs(seconds - lastReportedRef.current) < 5) {return}
      lastReportedRef.current = seconds

      try {
        await fetch(`/api/events/${eventId}/replay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId,
            watchedSeconds: seconds,
            lastPosition: position,
          }),
        })
      } catch (error) {
        console.error('Error reporting progress:', error)
      }
    },
    [eventId, bookingId]
  )

  // YouTube Player
  useEffect(() => {
    if (videoType !== 'youtube' || !youtubeId) {return}

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any

    // Load YouTube IFrame API
    if (!win.YT) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      const firstScriptTag = document.getElementsByTagName('script')[0]
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
    }

    const initPlayer = () => {
      if (playerRef.current) {
        playerRef.current.destroy()
      }

      playerRef.current = new win.YT.Player('replay-player', {
        videoId: youtubeId,
        playerVars: {
          autoplay: 0,
          modestbranding: 1,
          rel: 0,
          start: initialPosition,
        },
        events: {
          onReady: () => {
            // Player ready
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onStateChange: (event: any) => {
            if (event.data === win.YT.PlayerState.PLAYING) {
              // Start progress tracking
              progressIntervalRef.current = setInterval(() => {
                if (playerRef.current) {
                  const currentTime = Math.floor(playerRef.current.getCurrentTime())
                  setTotalWatched((prev) => Math.max(prev, currentTime))
                  reportProgress(Math.max(totalWatched, currentTime), currentTime)
                }
              }, 30000) // Report every 30 seconds
            } else {
              // Stop tracking and report final position
              if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current)
                progressIntervalRef.current = null
              }
              if (playerRef.current) {
                const currentTime = Math.floor(playerRef.current.getCurrentTime())
                const maxWatched = Math.max(totalWatched, currentTime)
                setTotalWatched(maxWatched)
                reportProgress(maxWatched, currentTime)
              }
            }
          },
        },
      })
    }

    if (win.YT && win.YT.Player) {
      initPlayer()
    } else {
      win.onYouTubeIframeAPIReady = initPlayer
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
      if (playerRef.current) {
        // Report final progress before destroying
        const currentTime = Math.floor(playerRef.current.getCurrentTime())
        const maxWatched = Math.max(totalWatched, currentTime)
        reportProgress(maxWatched, currentTime)
        playerRef.current.destroy()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoType, youtubeId, initialPosition])

  // Vimeo Player (simple iframe)
  if (videoType === 'vimeo' && vimeoId) {
    return (
      <div className="aspect-video bg-black rounded-lg overflow-hidden">
        <iframe
          src={`https://player.vimeo.com/video/${vimeoId}?autoplay=0`}
          title={eventTitle}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    )
  }

  // YouTube Player
  if (videoType === 'youtube' && youtubeId) {
    return (
      <div className="aspect-video bg-black rounded-lg overflow-hidden">
        <div id="replay-player" className="w-full h-full" />
      </div>
    )
  }

  // Native video (fallback)
  return (
    <div className="aspect-video bg-black rounded-lg overflow-hidden">
      <video
        src={videoUrl}
        controls
        className="w-full h-full"
        onTimeUpdate={(e) => {
          const video = e.currentTarget
          const currentTime = Math.floor(video.currentTime)
          setTotalWatched((prev) => Math.max(prev, currentTime))
        }}
        onPause={(e) => {
          const video = e.currentTarget
          const currentTime = Math.floor(video.currentTime)
          reportProgress(Math.max(totalWatched, currentTime), currentTime)
        }}
        onEnded={(e) => {
          const video = e.currentTarget
          const currentTime = Math.floor(video.currentTime)
          reportProgress(Math.max(totalWatched, currentTime), currentTime)
        }}
      >
        <track kind="captions" />
      </video>
    </div>
  )
}
