import type { DailoClip } from '../types'

interface SessionMedia {
  mediaUrl: string
  videoBlob?: Blob
}

const selectedMedia = new Map<string, SessionMedia>()

export const rememberSessionMedia = (clipId: string, media: SessionMedia) => {
  selectedMedia.set(clipId, media)
}

export const resolveSessionMedia = (clip: DailoClip): SessionMedia => {
  const remembered = selectedMedia.get(clip.id)
  const mediaUrl = clip.mediaUrl || remembered?.mediaUrl || ''
  const videoBlob = clip.videoBlob || remembered?.videoBlob
  if (mediaUrl || videoBlob) selectedMedia.set(clip.id, { mediaUrl, videoBlob })
  return { mediaUrl, videoBlob }
}

export const forgetSessionMedia = (clipId: string) => {
  selectedMedia.delete(clipId)
}
