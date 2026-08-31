import { makeId, type DailoClip } from '../types'

const formatCapturedTime = (date: Date) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`

const readBoxHeader = async (file: File, offset: number) => {
  const buffer = await file.slice(offset, Math.min(offset + 16, file.size)).arrayBuffer()
  if (buffer.byteLength < 8) return undefined
  const view = new DataView(buffer)
  let size = view.getUint32(0)
  const type = String.fromCharCode(...new Uint8Array(buffer, 4, 4))
  let headerSize = 8
  if (size === 1 && buffer.byteLength >= 16) {
    const largeSize = view.getBigUint64(8)
    if (largeSize > BigInt(Number.MAX_SAFE_INTEGER)) return undefined
    size = Number(largeSize)
    headerSize = 16
  } else if (size === 0) size = file.size - offset
  if (size < headerSize) return undefined
  return { type, size, headerSize }
}

const quickTimeDate = (seconds: bigint | number) => {
  const value = typeof seconds === 'bigint' ? Number(seconds) : seconds
  const milliseconds = (value - 2_082_844_800) * 1000
  const date = new Date(milliseconds)
  const latest = Date.now() + 24 * 60 * 60 * 1000
  return Number.isFinite(milliseconds) && date.getFullYear() >= 2000 && date.getTime() <= latest ? date : undefined
}

const readMovieHeaderDate = async (file: File) => {
  let offset = 0
  for (let boxes = 0; offset + 8 <= file.size && boxes < 64; boxes += 1) {
    const box = await readBoxHeader(file, offset)
    if (!box) break
    if (box.type === 'moov') {
      let childOffset = offset + box.headerSize
      const boxEnd = Math.min(offset + box.size, file.size)
      for (let children = 0; childOffset + 8 <= boxEnd && children < 128; children += 1) {
        const child = await readBoxHeader(file, childOffset)
        if (!child) break
        if (child.type === 'mvhd') {
          const payload = await file.slice(childOffset + child.headerSize, childOffset + child.headerSize + 20).arrayBuffer()
          if (payload.byteLength < 8) return undefined
          const view = new DataView(payload)
          return view.getUint8(0) === 1 && payload.byteLength >= 12
            ? quickTimeDate(view.getBigUint64(4))
            : quickTimeDate(view.getUint32(4))
        }
        childOffset += child.size
      }
      break
    }
    offset += box.size
  }
  return undefined
}

export const readCapturedAt = async (file: File) => {
  if (/\.(mp4|mov|m4v)$/i.test(file.name) || /video\/(mp4|quicktime|x-m4v)/i.test(file.type)) {
    try {
      const embedded = await readMovieHeaderDate(file)
      if (embedded) return { date: embedded, source: 'embedded-metadata' as const }
    } catch {
      // Some shared or edited files strip the movie header date. File date remains the safest fallback.
    }
  }
  return { date: new Date(file.lastModified || Date.now()), source: 'file-date' as const }
}

const waitForMetadata = (video: HTMLVideoElement) =>
  new Promise<void>((resolve, reject) => {
    if (video.readyState >= 1) return resolve()
    const timer = window.setTimeout(() => reject(new Error('영상 정보를 불러오는 시간이 너무 길어요.')), 12_000)
    video.addEventListener('loadedmetadata', () => { window.clearTimeout(timer); resolve() }, { once: true })
    video.addEventListener('error', () => { window.clearTimeout(timer); reject(new Error('영상을 읽을 수 없습니다.')) }, { once: true })
  })

const seekVideo = (video: HTMLVideoElement, time: number) =>
  new Promise<void>((resolve) => {
    const finish = () => {
      window.clearTimeout(timer)
      video.removeEventListener('seeked', finish)
      resolve()
    }
    const timer = window.setTimeout(finish, 1_500)
    video.addEventListener('seeked', finish, { once: true })
    video.currentTime = time
  })

const createThumbnail = async (video: HTMLVideoElement, duration: number) => {
  const canvas = document.createElement('canvas')
  canvas.width = 180
  canvas.height = 320
  const context = canvas.getContext('2d')
  if (!context || !video.videoWidth || !video.videoHeight) return ''
  const sourceRatio = video.videoWidth / video.videoHeight
  const targetRatio = canvas.width / canvas.height
  const sourceWidth = sourceRatio > targetRatio ? video.videoHeight * targetRatio : video.videoWidth
  const sourceHeight = sourceRatio > targetRatio ? video.videoHeight : video.videoWidth / targetRatio
  const sourceX = (video.videoWidth - sourceWidth) / 2
  const sourceY = (video.videoHeight - sourceHeight) / 2
  const moments = [duration * .18, duration * .5, .05]
  let lastThumbnail = ''
  for (const moment of moments) {
    try {
      await seekVideo(video, Math.min(Math.max(moment, .02), Math.max(duration - .02, .02)))
      context.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height)
      lastThumbnail = canvas.toDataURL('image/jpeg', 0.7)
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
      let brightness = 0
      for (let index = 0; index < pixels.length; index += 160) brightness += pixels[index] + pixels[index + 1] + pixels[index + 2]
      if (brightness / Math.max(pixels.length / 160, 1) > 18) return lastThumbnail
    } catch {
      // Try another moment; some mobile codecs cannot seek to the first requested frame.
    }
  }
  return lastThumbnail
}

export const createClipThumbnail = async (mediaUrl: string, duration: number) => {
  const video = document.createElement('video')
  video.preload = 'auto'
  video.muted = true
  video.playsInline = true
  video.src = mediaUrl
  video.load()
  await waitForMetadata(video)
  const thumbnail = await createThumbnail(video, duration)
  video.removeAttribute('src')
  video.load()
  return thumbnail
}

export const fileToClip = async (file: File, options: { thumbnail?: boolean } = {}): Promise<DailoClip> => {
  const mediaUrl = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.preload = 'auto'
  video.muted = true
  video.playsInline = true
  video.src = mediaUrl
  const [, captured] = await Promise.all([waitForMetadata(video), readCapturedAt(file)])
  const duration = Number.isFinite(video.duration) ? video.duration : 0
  const thumbnail = options.thumbnail === false ? '' : await createThumbnail(video, duration)
  const capturedAt = captured.date
  video.removeAttribute('src')
  video.load()

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
    capturedAtSource: captured.source,
    displayTime: formatCapturedTime(capturedAt),
    activity: '',
    activityEnglish: '',
    activityIcon: '✦',
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
