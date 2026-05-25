"use client";

import { useEffect, useRef } from "react";

interface LessonVideoProps {
  videoUrl: string;
  lessonId: string;
  initialPosition?: number;
  onEnd?: () => void;
  onProgress?: (watchedSeconds: number, position: number) => void;
}

// YouTube IFrame API types
interface YTPlayerEvent {
  data: number;
  target: YTPlayer;
}

interface YTPlayer {
  destroy: () => void;
  getCurrentTime: () => number;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
}

interface YTPlayerOptions {
  videoId: string;
  playerVars?: {
    autoplay?: number;
    modestbranding?: number;
    rel?: number;
    start?: number;
  };
  events?: {
    onReady?: () => void;
    onStateChange?: (event: YTPlayerEvent) => void;
  };
}

interface YTNamespace {
  Player: new (elementId: string, options: YTPlayerOptions) => YTPlayer;
  PlayerState: {
    ENDED: number;
    PLAYING: number;
    PAUSED: number;
    BUFFERING: number;
    CUED: number;
  };
}

declare global {
  interface Window {
    YT: YTNamespace;
    onYouTubeIframeAPIReady: () => void;
  }
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/, // Just the ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

function extractVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match ? match[1] : null;
}

export function LessonVideo({
  videoUrl,
  lessonId,
  initialPosition = 0,
  onEnd,
  onProgress,
}: LessonVideoProps) {
  const playerRef = useRef<YTPlayer | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastNativeProgressRef = useRef(0);

  const videoId = extractYouTubeId(videoUrl);
  const vimeoId = extractVimeoId(videoUrl);

  useEffect(() => {
    if (!videoId) {
      return;
    }

    // Load YouTube IFrame API
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const initPlayer = () => {
      if (playerRef.current) {
        playerRef.current.destroy();
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
          onReady: () => {
            /* player ready */
          },
          onStateChange: (event: YTPlayerEvent) => {
            if (event.data === window.YT.PlayerState.ENDED && onEnd) {
              onEnd();
            }

            // Track progress while playing
            if (event.data === window.YT.PlayerState.PLAYING && onProgress) {
              progressIntervalRef.current = setInterval(() => {
                if (playerRef.current) {
                  const currentTime = Math.floor(playerRef.current.getCurrentTime());
                  onProgress(currentTime, currentTime);
                }
              }, 10000); // Report every 10 seconds
            } else {
              if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
              }
            }
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [videoId, lessonId, initialPosition, onEnd, onProgress]);

  if (vimeoId) {
    return (
      <div className="aspect-video bg-black">
        <iframe
          src={`https://player.vimeo.com/video/${vimeoId}?autoplay=0`}
          title="Video de la lección"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    );
  }

  if (!videoId) {
    return (
      <div className="aspect-video bg-black">
        <video
          src={videoUrl}
          controls
          preload="metadata"
          className="h-full w-full"
          onTimeUpdate={(event) => {
            const currentTime = Math.floor(event.currentTarget.currentTime);
            if (currentTime - lastNativeProgressRef.current >= 10) {
              lastNativeProgressRef.current = currentTime;
              onProgress?.(currentTime, currentTime);
            }
          }}
          onEnded={(event) => {
            const currentTime = Math.floor(event.currentTarget.currentTime);
            onProgress?.(currentTime, currentTime);
            onEnd?.();
          }}
        >
          <track kind="captions" />
        </video>
      </div>
    );
  }

  return (
    <div className="aspect-video bg-black">
      <div id={`yt-player-${lessonId}`} className="w-full h-full" />
    </div>
  );
}
