import { forwardRef, useEffect, useMemo, useState } from 'react'
import { resolveSessionMedia } from '../services/mediaSession'
import type { DailoClip } from '../types'

interface ClipVideoProps {
  clip: DailoClip
  poster?: string
  ariaLabel: string
  onError: () => void
  onEnded?: () => void
  onPlay?: () => void
  onReady?: () => void
  onTimeUpdate?: (video: HTMLVideoElement) => void
}

export const ClipVideo = forwardRef<HTMLVideoElement, ClipVideoProps>(({
  clip, poster, ariaLabel, onError, onEnded, onPlay, onReady, onTimeUpdate,
}, ref) => {
  const media = resolveSessionMedia(clip)
  const [attempt, setAttempt] = useState(0)
  const source = useMemo(
    () => media.videoBlob && attempt <= 2 ? URL.createObjectURL(media.videoBlob) : media.mediaUrl,
    [attempt, media.mediaUrl, media.videoBlob],
  )

  useEffect(() => {
    if (!source?.startsWith('blob:') || source === media.mediaUrl) return
    return () => URL.revokeObjectURL(source)
  }, [media.mediaUrl, source])

  return (
    <video
      ref={ref}
      src={source}
      poster={poster}
      controls
      playsInline
      preload="auto"
      aria-label={ariaLabel}
      title="영상을 눌러 재생하거나 멈출 수 있어요"
      onLoadedData={onReady}
      onCanPlay={onReady}
      onPlay={onPlay}
      onError={() => attempt < 2 && media.videoBlob ? setAttempt((current) => current + 1) : onError()}
      onEnded={onEnded}
      onTimeUpdate={(event) => onTimeUpdate?.(event.currentTarget)}
    />
  )
})

ClipVideo.displayName = 'ClipVideo'
