import { makeId, type DailoClip } from '../types'

const waitForMetadata = (video: HTMLVideoElement) =>
  new Promise<void>((resolve, reject) => {
    video.addEventListener('loadedmetadata', () => resolve(), { once: true })
    video.addEventListener('error', () => reject(new Error('영상을 읽을 수 없습니다.')), { once: true })
  })

const seekVideo = (video: HTMLVideoElement, time: number) =>
  new Promise<void>((resolve) => {
    video.addEventListener('seeked', () => resolve(), { once: true })
    video.currentTime = time
  })

const createThumbnail = async (video: HTMLVideoElement, duration: number) => {
  try {
    await seekVideo(video, Math.min(Math.max(duration * 0.18, 0.05), 2))
    const canvas = document.createElement('canvas')
    canvas.width = 240
    canvas.height = 320
    const context = canvas.getContext('2d')
    if (!context) return ''
    const sourceRatio = video.videoWidth / video.videoHeight
    const targetRatio = canvas.width / canvas.height
    const sourceWidth = sourceRatio > targetRatio ? video.videoHeight * targetRatio : video.videoWidth
    const sourceHeight = sourceRatio > targetRatio ? video.videoHeight : video.videoWidth / targetRatio
    const sourceX = (video.videoWidth - sourceWidth) / 2
    const sourceY = (video.videoHeight - sourceHeight) / 2
    context.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.72)
  } catch {
    return ''
  }
}

export const fileToClip = async (file: File): Promise<DailoClip> => {
  const mediaUrl = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.preload = 'metadata'
  video.muted = true
  video.playsInline = true
  video.src = mediaUrl
  await waitForMetadata(video)
  const duration = Number.isFinite(video.duration) ? video.duration : 0
  const thumbnail = await createThumbnail(video, duration)
  const capturedAt = new Date(file.lastModified || Date.now())

  return {
    id: makeId(),
    name: file.name,
    mediaUrl,
    videoBlob: file,
    thumbnail,
    duration,
    trimStart: 0,
    trimEnd: duration,
    capturedAt: capturedAt.toISOString(),
    displayTime: capturedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    activity: 'NEW MOMENT',
    caption: '',
    mood: 'BUSY',
    energy: 70,
    volume: 100,
    speed: 1,
    transition: 'AUTO',
    popup: {
      enabled: false,
      kind: 'SYSTEM MESSAGE',
      title: 'SYSTEM MESSAGE',
      message: 'LIFE.EXE IS RUNNING...',
      button: 'OK',
    },
  }
}

export const formatDuration = (seconds: number) => {
  if (!Number.isFinite(seconds)) return '00:00'
  const minutes = Math.floor(seconds / 60)
  const rest = Math.floor(seconds % 60)
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}
