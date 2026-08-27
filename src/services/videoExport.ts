import type { DailoClip, DailoProject } from '../types'

export interface ExportProgress {
  percent: number
  task: string
}

const waitFor = (target: EventTarget, event: string) => new Promise<void>((resolve, reject) => {
  target.addEventListener(event, () => resolve(), { once: true })
  target.addEventListener('error', () => reject(new Error('미디어를 불러오지 못했습니다.')), { once: true })
})

const delay = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds))

const drawContainedVideo = (context: CanvasRenderingContext2D, video: HTMLVideoElement, width: number, height: number) => {
  const scale = Math.max(width / video.videoWidth, height / video.videoHeight)
  const drawWidth = video.videoWidth * scale
  const drawHeight = video.videoHeight * scale
  context.drawImage(video, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight)
}

const drawOverlay = (context: CanvasRenderingContext2D, clip: DailoClip, width: number, height: number) => {
  context.fillStyle = 'rgba(20, 15, 12, 0.64)'
  context.fillRect(52, height - 250, width - 104, 148)
  context.fillStyle = '#f6d36b'
  context.font = '700 54px ui-monospace, monospace'
  context.fillText(clip.displayTime, 84, height - 176)
  context.fillStyle = '#fffaf0'
  context.font = '700 42px Arial, sans-serif'
  context.fillText(clip.activity, 84, height - 120)
  if (clip.caption) {
    context.textAlign = 'center'
    context.fillStyle = '#fffaf0'
    context.font = '600 36px Arial, sans-serif'
    context.fillText(clip.caption.slice(0, 38), width / 2, height - 52)
    context.textAlign = 'start'
  }
  if (clip.popup.enabled) {
    const popupWidth = width - 180
    const x = 90
    const y = height * 0.22
    context.fillStyle = '#f8eed5'
    context.strokeStyle = '#3d2d24'
    context.lineWidth = 8
    context.fillRect(x, y, popupWidth, 420)
    context.strokeRect(x, y, popupWidth, 420)
    context.fillStyle = '#174d9b'
    context.fillRect(x, y, popupWidth, 76)
    context.fillStyle = '#fff'
    context.font = '700 34px ui-monospace, monospace'
    context.fillText(clip.popup.title, x + 28, y + 51)
    context.fillStyle = '#e6ad18'
    context.font = '80px Arial, sans-serif'
    context.fillText('!', x + 70, y + 230)
    context.fillStyle = '#241b17'
    context.font = '700 36px ui-monospace, monospace'
    context.fillText(clip.popup.message.slice(0, 30), x + 170, y + 205)
    context.strokeRect(width / 2 - 90, y + 310, 180, 62)
    context.fillText(clip.popup.button, width / 2 - 25, y + 353)
  }
}

const drawIntro = (context: CanvasRenderingContext2D, width: number, height: number) => {
  context.fillStyle = '#f6efdE'
  context.fillRect(0, 0, width, height)
  context.fillStyle = '#f4cf63'
  context.fillRect(70, 80, width - 140, height - 160)
  context.fillStyle = '#174d9b'
  context.fillRect(110, height * 0.3, width - 220, 82)
  context.fillStyle = '#fff'
  context.font = '700 38px ui-monospace, monospace'
  context.fillText('SYSTEM MESSAGE', 142, height * 0.3 + 54)
  context.fillStyle = '#fff8e9'
  context.fillRect(110, height * 0.3 + 82, width - 220, 430)
  context.strokeStyle = '#3d2d24'
  context.lineWidth = 8
  context.strokeRect(110, height * 0.3, width - 220, 512)
  context.fillStyle = '#241b17'
  context.textAlign = 'center'
  context.font = '700 64px ui-monospace, monospace'
  context.fillText('DAY IN LIFE.EXE', width / 2, height * 0.3 + 240)
  context.font = '36px Arial, sans-serif'
  context.fillText('Would you like to start?', width / 2, height * 0.3 + 316)
  context.strokeRect(width / 2 - 110, height * 0.3 + 360, 220, 74)
  context.font = '700 34px ui-monospace, monospace'
  context.fillText('YES', width / 2, height * 0.3 + 410)
  context.textAlign = 'start'
}

const chooseMimeType = () => {
  const candidates = ['video/mp4;codecs=h264,aac', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? ''
}

export const canRenderVideo = () =>
  typeof MediaRecorder !== 'undefined' && 'captureStream' in HTMLCanvasElement.prototype

export const renderProject = async (
  project: DailoProject,
  onProgress: (progress: ExportProgress) => void,
): Promise<{ blob: Blob; extension: 'mp4' | 'webm' }> => {
  if (!canRenderVideo()) throw new Error('이 브라우저의 영상 렌더링 엔진을 사용할 수 없습니다.')
  const clips = project.clips.filter((clip) => clip.mediaUrl)
  if (!clips.length) throw new Error('내보낼 영상 클립이 없습니다.')

  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1920
  const context = canvas.getContext('2d')
  if (!context) throw new Error('렌더링 캔버스를 만들 수 없습니다.')
  const canvasStream = canvas.captureStream(30)
  const audioContext = new AudioContext()
  await audioContext.resume()
  const audioDestination = audioContext.createMediaStreamDestination()
  const video = document.createElement('video')
  video.playsInline = true
  video.preload = 'auto'
  const videoSource = audioContext.createMediaElementSource(video)
  const videoGain = audioContext.createGain()
  videoSource.connect(videoGain).connect(audioDestination)
  const stream = new MediaStream([...canvasStream.getVideoTracks(), ...audioDestination.stream.getAudioTracks()])
  const mimeType = chooseMimeType()
  const recorder = mimeType
    ? new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6_000_000 })
    : new MediaRecorder(stream)
  const chunks: Blob[] = []
  recorder.ondataavailable = (event) => event.data.size && chunks.push(event.data)
  const completed = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType }))
  })
  recorder.start(500)
  drawIntro(context, canvas.width, canvas.height)
  onProgress({ percent: 3, task: 'DAY IN LIFE.EXE 인트로 추가 중' })
  await delay(950)

  for (const [index, clip] of clips.entries()) {
    video.src = clip.mediaUrl
    await waitFor(video, 'loadedmetadata')
    video.currentTime = Math.min(clip.trimStart, Math.max(video.duration - 0.05, 0))
    await waitFor(video, 'seeked')
    video.playbackRate = clip.speed
    videoGain.gain.value = clip.volume / 100
    const endAt = Math.min(clip.trimEnd || video.duration, video.duration)
    let voice: HTMLAudioElement | undefined
    if (clip.voice?.url) {
      voice = new Audio(clip.voice.url)
      const voiceSource = audioContext.createMediaElementSource(voice)
      const voiceGain = audioContext.createGain()
      voiceGain.gain.value = clip.voice.volume / 100
      voiceSource.connect(voiceGain).connect(audioDestination)
      void voice.play()
    }
    await video.play()
    await new Promise<void>((resolve) => {
      const frame = () => {
        context.fillStyle = '#120f0d'
        context.fillRect(0, 0, canvas.width, canvas.height)
        drawContainedVideo(context, video, canvas.width, canvas.height)
        drawOverlay(context, clip, canvas.width, canvas.height)
        const clipProgress = Math.min((video.currentTime - clip.trimStart) / Math.max(endAt - clip.trimStart, 0.1), 1)
        onProgress({
          percent: Math.round(5 + ((index + clipProgress) / clips.length) * 92),
          task: `${clip.activity} 렌더링 중`,
        })
        if (video.currentTime >= endAt || video.ended) resolve()
        else requestAnimationFrame(frame)
      }
      requestAnimationFrame(frame)
    })
    video.pause()
    voice?.pause()
  }
  recorder.stop()
  const blob = await completed
  canvasStream.getTracks().forEach((track) => track.stop())
  await audioContext.close()
  onProgress({ percent: 100, task: 'DAY COMPLETE — 파일 저장 준비 완료' })
  return { blob, extension: recorder.mimeType.includes('mp4') ? 'mp4' : 'webm' }
}
