'use client'

import { useRef, useState, useEffect } from 'react'

interface AudioPlayerProps {
  audioUrl: string
  title: string
  coverImage?: string
}

export default function AudioPlayer({ audioUrl, title, coverImage }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => setCurrentTime(audio.currentTime)
    const updateDuration = () => setDuration(audio.duration)
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

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio) return

    const newVolume = parseFloat(e.target.value)
    audio.volume = newVolume
    setVolume(newVolume)
  }

  const formatTime = (time: number): string => {
    if (!isFinite(time)) return '0:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="bg-gradient-to-br from-[#FFF8F0] to-white rounded-2xl shadow-2xl p-6 md:p-8 border border-[#d4a574]/30">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Cover Image (opcional) */}
      {coverImage && (
        <div className="mb-6 text-center">
          <div className="inline-block relative w-48 h-48 rounded-full overflow-hidden shadow-xl">
            <img
              src={coverImage}
              alt={title}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="mb-6">
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-2 bg-[#d4a574]/30 rounded-lg appearance-none cursor-pointer accent-[#a87819]"
        />
        <div className="flex justify-between mt-2 font-sans text-sm text-gray-600">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-6 mb-6">
        {/* Backward 10s */}
        <button
          onClick={() => {
            if (audioRef.current) {
              audioRef.current.currentTime = Math.max(0, currentTime - 10)
            }
          }}
          className="p-2 hover:bg-[#a87819]/10 rounded-full transition-colors"
          title="Retroceder 10s"
        >
          <svg className="w-6 h-6 text-[#a87819]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
          </svg>
        </button>

        {/* Play/Pause */}
        <button
          onClick={togglePlay}
          className="p-4 bg-gradient-to-br from-[#a87819] to-[#d4a574] hover:from-[#8b6414] hover:to-[#b86f5d] text-white rounded-full shadow-lg transition-all transform hover:scale-105"
          title={isPlaying ? 'Pausar' : 'Reproducir'}
        >
          {isPlaying ? (
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Forward 10s */}
        <button
          onClick={() => {
            if (audioRef.current) {
              audioRef.current.currentTime = Math.min(duration, currentTime + 10)
            }
          }}
          className="p-2 hover:bg-[#a87819]/10 rounded-full transition-colors"
          title="Adelantar 10s"
        >
          <svg className="w-6 h-6 text-[#a87819]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
          </svg>
        </button>
      </div>

      {/* Volume Control */}
      <div className="flex items-center gap-3">
        <svg className="w-5 h-5 text-[#a87819]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
        </svg>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={handleVolumeChange}
          className="flex-1 h-2 bg-[#d4a574]/30 rounded-lg appearance-none cursor-pointer accent-[#a87819]"
        />
        <span className="font-sans text-sm text-gray-600 w-12 text-right">
          {Math.round(volume * 100)}%
        </span>
      </div>
    </div>
  )
}
