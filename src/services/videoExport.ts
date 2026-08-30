import type { DailoClip, DailoProject } from '../types'
import { activityTextProvider } from './activityText'

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
  const presentation = activityTextProvider.present(clip.activity)
  const centerY = height * 0.5
  const tagWidth = width * 0.38
  const tagHeight = width * 0.055
  const tagX = (width - tagWidth) / 2
  const tagY = centerY - width * 0.19
  context.fillStyle = 'rgba(8, 32, 73, .92)'
  context.fillRect(tagX, tagY, tagWidth, tagHeight)
  context.strokeStyle = 'rgba(255,255,255,.9)'
  context.lineWidth = Math.max(2, width * 0.003)
  context.strokeRect(tagX, tagY, tagWidth, tagHeight)
  context.fillStyle = '#fff'
  context.textAlign = 'center'
  context.font = `700 ${Math.round(width * 0.022)}px Tahoma, Arial, sans-serif`
  context.fillText(`${clip.activityIcon || presentation.icon}  CLIP_INFO.EXE`, width / 2, tagY + tagHeight * .68)

  context.lineWidth = Math.max(3, width * .006)
  context.strokeStyle = 'rgba(0,0,0,.88)'
  context.fillStyle = '#fff'
  context.font = `300 ${Math.round(width * 0.085)}px Tahoma, Arial, sans-serif`
  context.strokeText(clip.displayTime, width / 2, centerY)
  context.fillText(clip.displayTime, width / 2, centerY)
  context.font = `800 ${Math.round(width * 0.055)}px Arial, sans-serif`
  const korean = fitText(context, clip.activity || '이 장면의 문구를 입력해 주세요', width * .82)
  context.strokeText(korean, width / 2, centerY + width * .075)
  context.fillText(korean, width / 2, centerY + width * .075)
  context.font = `500 ${Math.round(width * 0.03)}px Tahoma, Arial, sans-serif`
  const english = fitText(context, clip.activityEnglish || presentation.english, width * .78)
  context.strokeText(english, width / 2, centerY + width * .125)
  context.fillText(english, width / 2, centerY + width * .125)
  context.textAlign = 'start'

  if (clip.popup.enabled) {
    const popupWidth = width * 0.56
    const popupX = (width - popupWidth) / 2
    const popupY = height * 0.28
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

  if (clip.caption) {
    const captionWidth = width * 0.78
    context.fillStyle = 'rgba(18, 15, 13, .7)'
    context.fillRect((width - captionWidth) / 2, height * 0.86, captionWidth, width * 0.09)
    context.fillStyle = '#fff'
    context.font = `600 ${Math.round(width * 0.031)}px Arial, sans-serif`
    context.textAlign = 'center'
    context.fillText(fitText(context, clip.caption, captionWidth - width * 0.06), width / 2, height * 0.916)
    context.textAlign = 'start'
  }
}

const drawCoverOverlay = (context: CanvasRenderingContext2D, project: DailoProject, width: number, height: number) => {
  const gradient = context.createLinearGradient(0, 0, 0, height)
  gradient.addColorStop(0, 'rgba(0,0,0,.08)')
  gradient.addColorStop(1, 'rgba(0,0,0,.45)')
  context.fillStyle = gradient
  context.fillRect(0, 0, width, height)
  const coverClip = project.clips.find((clip) => clip.id === project.coverClipId) ?? project.clips[0]
  const presentation = activityTextProvider.present(coverClip?.activity ?? '')
  const tagWidth = width * .52
  const tagX = (width - tagWidth) / 2
  const tagY = height * .37
  context.fillStyle = '#0754bc'
  context.fillRect(tagX, tagY, tagWidth, width * 0.065)
  context.strokeStyle = '#fff'
  context.lineWidth = Math.max(2, width * .003)
  context.strokeRect(tagX, tagY, tagWidth, width * .065)
  context.fillStyle = '#fff'
  context.textAlign = 'center'
  context.font = `700 ${Math.round(width * 0.026)}px Tahoma, sans-serif`
  context.fillText(`${presentation.icon}  DAY_IN_LIFE.EXE   ×`, width / 2, tagY + width * .045)
  context.fillStyle = '#fff1a8'
  context.font = `800 ${Math.round(width * 0.025)}px Tahoma, sans-serif`
  context.fillText(project.mode === 'N-JOB DAY' ? 'WORKING 3 JOBS A DAY' : 'RUNNING MY DAY', width / 2, tagY + width * .12)
  context.fillStyle = '#fff'
  context.strokeStyle = 'rgba(24,18,14,.95)'
  context.lineWidth = Math.max(5, width * .009)
  context.textAlign = 'center'
  context.font = `900 ${Math.round(width * 0.09)}px Arial, sans-serif`
  const title = fitText(context, project.coverTitle || '오늘의 하루.EXE', width * .84)
  context.strokeText(title, width / 2, tagY + width * .25)
  context.fillText(title, width / 2, tagY + width * .25)
  context.font = `600 ${Math.round(width * .03)}px Tahoma, sans-serif`
  const english = activityTextProvider.present(project.coverTitle.replace(/\.EXE/gi, '')).english
  context.strokeText(english, width / 2, tagY + width * .32)
  context.fillText(english, width / 2, tagY + width * .32)
  context.textAlign = 'start'
}

const chooseMimeType = () => {
  const safari = /Safari/i.test(navigator.userAgent) && !/Chrome|Chromium|CriOS|Edg/i.test(navigator.userAgent)
  const candidates = safari
    ? ['video/mp4;codecs=h264,aac', 'video/mp4', 'video/webm']
    : ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4;codecs=h264,aac']
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
  canvas.width = 1080
  canvas.height = 1920
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
  const options = mimeType ? { mimeType, videoBitsPerSecond: isMobile ? 8_000_000 : 10_000_000 } : undefined
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
    const coverClip = clips.find((clip) => clip.id === project.coverClipId) ?? clips[0]
    video.src = coverClip.mediaUrl
    if (video.readyState < 1) await waitForMedia(video, 'loadedmetadata')
    await seekVideo(video, coverClip.analysis?.bestMoment ?? Math.min(coverClip.duration * .2, 1))
    recorder.start(400)
    context.fillStyle = '#111'
    context.fillRect(0, 0, canvas.width, canvas.height)
    drawCoveredVideo(context, video, canvas.width, canvas.height)
    drawCoverOverlay(context, project, canvas.width, canvas.height)
    onProgress({ percent: 3, task: '썸네일을 만들고 있어요' })
    await delay(850)

    if (project.fastIntro) {
      for (const clip of clips.slice(0, 6)) {
        video.src = clip.mediaUrl
        if (video.readyState < 1) await waitForMedia(video, 'loadedmetadata')
        await seekVideo(video, clip.analysis?.bestMoment ?? Math.min(clip.duration * .32, Math.max(clip.duration - .1, 0)))
        context.fillStyle = '#fff'
        context.fillRect(0, 0, canvas.width, canvas.height)
        drawCoveredVideo(context, video, canvas.width, canvas.height)
        await delay(140)
      }
    }

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
    onProgress({ percent: 98, task: '고화질 파일을 마무리하고 있어요' })
    await delay(500)
    if (recorder.state === 'recording') {
      recorder.requestData()
      await delay(180)
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
