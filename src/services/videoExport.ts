import type { DailoClip, DailoProject } from '../types'

export interface ExportProgress {
  percent: number
  task: string
}

type CaptureCanvas = HTMLCanvasElement & { captureStream(frameRate?: number): MediaStream }

const delay = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds))

const waitForMedia = (target: EventTarget, eventName: string, timeout = 15_000) =>
  new Promise<void>((resolve, reject) => {
    const finish = () => {
      window.clearTimeout(timer)
      target.removeEventListener(eventName, onReady)
      target.removeEventListener('error', onError)
    }
    const onReady = () => { finish(); resolve() }
    const onError = () => { finish(); reject(new Error('영상 파일을 읽지 못했어요. 다른 클립으로 다시 시도해 주세요.')) }
    const timer = window.setTimeout(() => {
      finish()
      reject(new Error('영상 준비 시간이 너무 오래 걸리고 있어요. 클립 길이를 줄여 다시 시도해 주세요.'))
    }, timeout)
    target.addEventListener(eventName, onReady, { once: true })
    target.addEventListener('error', onError, { once: true })
  })

const seekVideo = async (video: HTMLVideoElement, time: number) => {
  if (Math.abs(video.currentTime - time) < 0.04) return
  const ready = waitForMedia(video, 'seeked')
  video.currentTime = time
  await ready
}

const drawCoveredVideo = (context: CanvasRenderingContext2D, video: HTMLVideoElement, width: number, height: number) => {
  const scale = Math.max(width / video.videoWidth, height / video.videoHeight)
  const drawWidth = video.videoWidth * scale
  const drawHeight = video.videoHeight * scale
  context.drawImage(video, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight)
}

const fitText = (context: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  if (context.measureText(text).width <= maxWidth) return text
  let result = text
  while (result.length > 1 && context.measureText(`${result}…`).width > maxWidth) result = result.slice(0, -1)
  return `${result}…`
}

const drawClipBubble = (context: CanvasRenderingContext2D, clip: DailoClip, width: number, height: number) => {
  const panelWidth = width * 0.78
  const titleHeight = width * 0.075
  const bodyHeight = width * 0.22
  const x = (width - panelWidth) / 2
  const y = height * 0.52

  context.fillStyle = 'rgba(15, 12, 10, .18)'
  context.fillRect(x + 10, y + 12, panelWidth, titleHeight + bodyHeight)
  context.fillStyle = '#f5edda'
  context.fillRect(x, y, panelWidth, titleHeight + bodyHeight)
  context.strokeStyle = '#3d2a21'
  context.lineWidth = Math.max(3, width * 0.006)
  context.strokeRect(x, y, panelWidth, titleHeight + bodyHeight)
  context.fillStyle = '#0a52b8'
  context.fillRect(x, y, panelWidth, titleHeight)
  context.fillStyle = '#fff'
  context.font = `700 ${Math.round(width * 0.035)}px Tahoma, Arial, sans-serif`
  context.fillText(`◷  ${clip.displayTime}`, x + width * 0.025, y + titleHeight * 0.68)

  context.fillStyle = '#25201d'
  context.font = `700 ${Math.round(width * 0.044)}px Arial, sans-serif`
  context.fillText(fitText(context, clip.activity || '오늘의 한 장면', panelWidth - width * 0.08), x + width * 0.04, y + titleHeight + bodyHeight * 0.42)
  const description = clip.caption || clip.voice?.transcript || '이 장면의 이야기를 적어보세요.'
  context.fillStyle = '#665a52'
  context.font = `500 ${Math.round(width * 0.032)}px Arial, sans-serif`
  context.fillText(fitText(context, description, panelWidth - width * 0.08), x + width * 0.04, y + titleHeight + bodyHeight * 0.72)

  context.beginPath()
  context.moveTo(x + panelWidth * 0.72, y + titleHeight + bodyHeight)
  context.lineTo(x + panelWidth * 0.79, y + titleHeight + bodyHeight + width * 0.06)
  context.lineTo(x + panelWidth * 0.83, y + titleHeight + bodyHeight)
  context.closePath()
  context.fillStyle = '#f5edda'
  context.fill()
  context.stroke()

  if (clip.popup.enabled) {
    const popupWidth = width * 0.7
    const popupX = (width - popupWidth) / 2
    const popupY = height * 0.17
    context.fillStyle = '#fff4c9'
    context.fillRect(popupX, popupY, popupWidth, width * 0.19)
    context.strokeRect(popupX, popupY, popupWidth, width * 0.19)
    context.fillStyle = '#0a52b8'
    context.fillRect(popupX, popupY, popupWidth, width * 0.055)
    context.fillStyle = '#fff'
    context.font = `700 ${Math.round(width * 0.027)}px Tahoma, sans-serif`
    context.fillText(clip.popup.title, popupX + width * 0.02, popupY + width * 0.038)
    context.fillStyle = '#25201d'
    context.font = `700 ${Math.round(width * 0.032)}px Arial, sans-serif`
    context.fillText(fitText(context, clip.popup.message, popupWidth - width * 0.08), popupX + width * 0.04, popupY + width * 0.13)
  }
}

const drawIntro = (context: CanvasRenderingContext2D, width: number, height: number) => {
  context.fillStyle = '#55a9ee'
  context.fillRect(0, 0, width, height)
  context.fillStyle = '#63ad3a'
  context.beginPath()
  context.ellipse(width * 0.25, height * 0.9, width * 0.75, height * 0.35, -0.1, 0, Math.PI * 2)
  context.fill()
  const boxWidth = width * 0.8
  const boxX = (width - boxWidth) / 2
  const boxY = height * 0.34
  context.fillStyle = '#f4ead2'
  context.fillRect(boxX, boxY, boxWidth, width * 0.48)
  context.strokeStyle = '#143a72'
  context.lineWidth = Math.max(3, width * 0.007)
  context.strokeRect(boxX, boxY, boxWidth, width * 0.48)
  context.fillStyle = '#0754bc'
  context.fillRect(boxX, boxY, boxWidth, width * 0.075)
  context.fillStyle = '#fff'
  context.font = `700 ${Math.round(width * 0.031)}px Tahoma, sans-serif`
  context.fillText('오늘의 하루.EXE', boxX + width * 0.025, boxY + width * 0.052)
  context.fillStyle = '#25201d'
  context.textAlign = 'center'
  context.font = `700 ${Math.round(width * 0.052)}px Arial, sans-serif`
  context.fillText('오늘 하루를 시작할까요?', width / 2, boxY + width * 0.23)
  context.fillStyle = '#f7f3e8'
  context.fillRect(width / 2 - width * 0.12, boxY + width * 0.31, width * 0.24, width * 0.085)
  context.strokeRect(width / 2 - width * 0.12, boxY + width * 0.31, width * 0.24, width * 0.085)
  context.font = `700 ${Math.round(width * 0.033)}px Tahoma, sans-serif`
  context.fillText('시작', width / 2, boxY + width * 0.366)
  context.textAlign = 'start'
}

const chooseMimeType = () => {
  const candidates = ['video/mp4;codecs=h264,aac', 'video/webm;codecs=vp8,opus', 'video/webm']
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? ''
}

export const canRenderVideo = () =>
  typeof MediaRecorder !== 'undefined' && 'captureStream' in HTMLCanvasElement.prototype

export const renderProject = async (
  project: DailoProject,
  onProgress: (progress: ExportProgress) => void,
): Promise<{ blob: Blob; extension: 'mp4' | 'webm' }> => {
  if (!canRenderVideo()) throw new Error('이 기기에서는 영상 합성을 지원하지 않아요. 최신 Safari 또는 Chrome으로 열어주세요.')
  const clips = project.clips.filter((clip) => clip.mediaUrl)
  if (!clips.length) throw new Error('저장할 영상 클립이 없어요.')

  const isMobile = window.matchMedia('(max-width: 900px)').matches || /Android|iPhone|iPad/i.test(navigator.userAgent)
  const canvas = document.createElement('canvas') as CaptureCanvas
  canvas.width = isMobile ? 720 : 1080
  canvas.height = isMobile ? 1280 : 1920
  const frameRate = isMobile ? 24 : 30
  const context = canvas.getContext('2d', { alpha: false })
  if (!context) throw new Error('영상 화면을 준비하지 못했어요.')

  const canvasStream = canvas.captureStream(frameRate)
  const audioContext = new AudioContext()
  await audioContext.resume()
  const audioDestination = audioContext.createMediaStreamDestination()
  const video = document.createElement('video')
  video.playsInline = true
  video.preload = 'auto'
  const videoSource = audioContext.createMediaElementSource(video)
  const videoGain = audioContext.createGain()
  videoSource.connect(videoGain).connect(audioDestination)
  const combinedStream = new MediaStream([...canvasStream.getVideoTracks(), ...audioDestination.stream.getAudioTracks()])
  const mimeType = chooseMimeType()
  const options = mimeType ? { mimeType, videoBitsPerSecond: isMobile ? 3_000_000 : 5_000_000 } : undefined
  let recorder: MediaRecorder
  try {
    recorder = new MediaRecorder(combinedStream, options)
  } catch {
    recorder = new MediaRecorder(canvasStream, options)
  }
  const chunks: Blob[] = []
  recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data) }
  const completed = new Promise<Blob>((resolve, reject) => {
    recorder.onerror = () => reject(new Error('영상 파일을 만드는 중 문제가 생겼어요.'))
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: recorder.mimeType })
      if (!blob.size) reject(new Error('완성된 영상이 비어 있어요. 다시 시도해 주세요.'))
      else resolve(blob)
    }
  })

  try {
    recorder.start(400)
    drawIntro(context, canvas.width, canvas.height)
    onProgress({ percent: 3, task: '첫 화면을 만들고 있어요' })
    await delay(700)

    let renderedSeconds = 0
    for (const [index, clip] of clips.entries()) {
      const remainingSeconds = project.outputLength - renderedSeconds
      if (remainingSeconds <= 0) break
      video.src = clip.mediaUrl
      if (video.readyState < 1) await waitForMedia(video, 'loadedmetadata')
      const startAt = Math.min(Math.max(clip.trimStart, 0), Math.max(video.duration - 0.05, 0))
      await seekVideo(video, startAt)
      video.playbackRate = clip.speed
      videoGain.gain.value = clip.volume / 100
      const requestedEnd = Math.min(clip.trimEnd || video.duration, video.duration)
      const endAt = Math.min(requestedEnd, startAt + remainingSeconds * clip.speed)
      const outputDuration = Math.max((endAt - startAt) / clip.speed, 0.1)

      if (clip.voice?.blob) {
        try {
          const voiceBuffer = await audioContext.decodeAudioData(await clip.voice.blob.arrayBuffer())
          const voiceSource = audioContext.createBufferSource()
          const voiceGain = audioContext.createGain()
          voiceSource.buffer = voiceBuffer
          voiceGain.gain.value = clip.voice.volume / 100
          voiceSource.connect(voiceGain).connect(audioDestination)
          voiceSource.start()
        } catch {
          // The video still exports when a device cannot decode a recorded memo format.
        }
      }

      await video.play()
      const frameStartedAt = performance.now()
      await new Promise<void>((resolve, reject) => {
        const frame = () => {
          context.fillStyle = '#111'
          context.fillRect(0, 0, canvas.width, canvas.height)
          drawCoveredVideo(context, video, canvas.width, canvas.height)
          drawClipBubble(context, clip, canvas.width, canvas.height)
          const clipProgress = Math.min((video.currentTime - startAt) / Math.max(endAt - startAt, 0.1), 1)
          onProgress({
            percent: Math.round(5 + ((index + clipProgress) / clips.length) * 92),
            task: `${index + 1}번째 장면을 만들고 있어요`,
          })
          if (video.currentTime >= endAt || video.ended) resolve()
          else if (performance.now() - frameStartedAt > outputDuration * 1000 + 12_000) reject(new Error('영상 재생이 멈췄어요. 해당 클립을 확인해 주세요.'))
          else requestAnimationFrame(frame)
        }
        requestAnimationFrame(frame)
      })
      video.pause()
      renderedSeconds += outputDuration
    }
    recorder.stop()
    const blob = await completed
    onProgress({ percent: 100, task: '영상이 완성됐어요. 저장 버튼을 눌러주세요.' })
    return { blob, extension: recorder.mimeType.includes('mp4') ? 'mp4' : 'webm' }
  } finally {
    video.pause()
    canvasStream.getTracks().forEach((track) => track.stop())
    combinedStream.getTracks().forEach((track) => track.stop())
    if (recorder.state !== 'inactive') recorder.stop()
    await audioContext.close().catch(() => undefined)
  }
}
