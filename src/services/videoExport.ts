import type { DailoClip, DailoProject } from '../types'
import { activityTextProvider } from './activityText'
import { resolveSessionMedia } from './mediaSession'
import { popupPlaybackState, VLOG_OVERLAY } from './vlogOverlay'

export interface ExportProgress {
  percent: number
  task: string
}

type CaptureCanvas = HTMLCanvasElement & { captureStream(frameRate?: number): MediaStream }
type FrameTrack = MediaStreamTrack & { requestFrame?: () => void }

const delay = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds))
const SCENE_OVERLAY_SECONDS = 0.3
const TRANSITION_SECONDS = 0.35

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

const drawTransitionOverlay = (context: CanvasRenderingContext2D, clip: DailoClip, elapsed: number, width: number, height: number) => {
  if (clip.transition === 'HARD CUT' || elapsed >= TRANSITION_SECONDS) return
  const progress = Math.min(Math.max(elapsed / TRANSITION_SECONDS, 0), 1)
  context.save()
  if (clip.transition === 'FLASH') {
    context.fillStyle = `rgba(255,255,255,${.9 * (1 - progress)})`
    context.fillRect(0, 0, width, height)
  } else if (clip.transition === 'PHONE SCREEN') {
    const opening = width * progress
    context.fillStyle = '#050505'
    context.fillRect(0, 0, (width - opening) / 2, height)
    context.fillRect((width + opening) / 2, 0, (width - opening) / 2, height)
  } else if (clip.transition === 'WINDOW POP-UP') {
    context.globalAlpha = 1 - progress
    const panelWidth = width * .7
    const panelHeight = width * .34
    const left = (width - panelWidth) / 2
    const top = (height - panelHeight) / 2
    context.fillStyle = '#f4edda'
    context.fillRect(left, top, panelWidth, panelHeight)
    context.fillStyle = '#0754bc'
    context.fillRect(left, top, panelWidth, width * .06)
    context.strokeStyle = '#fff'
    context.lineWidth = Math.max(2, width * .004)
    context.strokeRect(left, top, panelWidth, panelHeight)
  } else {
    context.fillStyle = `rgba(0,0,0,${.85 * (1 - progress)})`
    context.fillRect(0, 0, width, height)
  }
  context.restore()
}

const fitText = (context: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  if (context.measureText(text).width <= maxWidth) return text
  let result = text
  while (result.length > 1 && context.measureText(`${result}…`).width > maxWidth) result = result.slice(0, -1)
  return `${result}…`
}

const wrapText = (context: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines = 2) => {
  const requestedLines = text.split(/\n/).filter(Boolean)
  const lines: string[] = []
  for (const requested of requestedLines.length ? requestedLines : [text]) {
    let line = ''
    for (const character of Array.from(requested)) {
      if (line && context.measureText(line + character).width > maxWidth) {
        lines.push(line)
        line = character
      } else line += character
    }
    if (line) lines.push(line)
  }
  if (lines.length <= maxLines) return lines
  const visible = lines.slice(0, maxLines)
  visible[maxLines - 1] = fitText(context, lines.slice(maxLines - 1).join(''), maxWidth)
  return visible
}

const drawXpWidget = (context: CanvasRenderingContext2D, clip: DailoClip, elapsed: number, width: number, height: number) => {
  const state = popupPlaybackState(clip, elapsed)
  if (!state.visible) return
  const style = VLOG_OVERLAY.popup
  const popupX = width * style.left
  const popupWidth = width * (1 - style.left - style.right)
  const popupY = height * style.top
  const titleHeight = width * style.titleBarHeight
  const bodyHeight = width * (clip.popup.effect === 'XP CLOCK' ? 0.3 : 0.24)
  const popupHeight = titleHeight + bodyHeight

  context.save()
  context.fillStyle = '#f4edda'
  context.fillRect(popupX, popupY, popupWidth, popupHeight)
  context.strokeStyle = '#fff'
  context.lineWidth = Math.max(3, width * 0.006)
  context.strokeRect(popupX, popupY, popupWidth, popupHeight)
  context.strokeStyle = '#063f94'
  context.lineWidth = Math.max(2, width * 0.004)
  context.strokeRect(popupX - width * .006, popupY - width * .006, popupWidth + width * .012, popupHeight + width * .012)
  context.fillStyle = '#0754bc'
  context.fillRect(popupX, popupY, popupWidth, titleHeight)

  const iconSize = titleHeight * .62
  context.fillStyle = '#f4cf63'
  context.fillRect(popupX + width * .025, popupY + (titleHeight - iconSize) / 2, iconSize, iconSize)
  context.fillStyle = '#fff'
  context.textAlign = 'left'
  context.textBaseline = 'middle'
  context.font = `700 ${Math.round(width * style.titleFont)}px Tahoma, Arial, sans-serif`
  const titleX = popupX + width * .025 + iconSize + width * .025
  context.fillText(fitText(context, clip.popup.title, popupWidth - (titleX - popupX) - titleHeight), titleX, popupY + titleHeight / 2)
  const closeSize = titleHeight * .62
  const closeX = popupX + popupWidth - closeSize - width * .02
  context.fillStyle = '#d54b34'
  context.fillRect(closeX, popupY + (titleHeight - closeSize) / 2, closeSize, closeSize)
  context.fillStyle = '#fff'
  context.textAlign = 'center'
  context.font = `800 ${Math.round(closeSize * .62)}px Tahoma, sans-serif`
  context.fillText('×', closeX + closeSize / 2, popupY + titleHeight / 2)

  const bodyTop = popupY + titleHeight
  const bodyCenter = popupX + popupWidth / 2
  context.fillStyle = '#28211c'
  if (clip.popup.effect === 'XP CLOCK') {
    context.font = `400 ${Math.round(width * .13)}px Tahoma, Arial, sans-serif`
    context.fillText(clip.displayTime, bodyCenter, bodyTop + bodyHeight * .43)
    context.font = `700 ${Math.round(width * .037)}px Tahoma, Arial, sans-serif`
    context.fillText(fitText(context, clip.popup.message, popupWidth * .84), bodyCenter, bodyTop + bodyHeight * .76)
  } else if (clip.popup.effect === 'ENERGY BAR') {
    context.font = `800 ${Math.round(width * style.messageFont)}px Arial, sans-serif`
    context.fillText(fitText(context, clip.popup.message || 'ENERGY CHARGING...', popupWidth * .86), bodyCenter, bodyTop + bodyHeight * .28)
    const trackX = popupX + popupWidth * .08
    const trackY = bodyTop + bodyHeight * .46
    const trackWidth = popupWidth * .84
    const trackHeight = width * .055
    context.fillStyle = '#fff'
    context.fillRect(trackX, trackY, trackWidth, trackHeight)
    context.strokeStyle = '#44372d'
    context.lineWidth = Math.max(2, width * .004)
    context.strokeRect(trackX, trackY, trackWidth, trackHeight)
    const segments = 12
    for (let index = 0; index < segments; index += 1) {
      if ((index + 1) / segments > state.progress) break
      const gap = width * .006
      const segmentWidth = (trackWidth - gap * (segments + 1)) / segments
      context.fillStyle = index > 8 ? '#42a84d' : '#1d5db5'
      context.fillRect(trackX + gap + index * (segmentWidth + gap), trackY + gap, segmentWidth, trackHeight - gap * 2)
    }
    context.fillStyle = '#41362e'
    context.font = `700 ${Math.round(width * .03)}px Tahoma, sans-serif`
    context.fillText(`${Math.round(state.progress * 100)}% · CHARGING`, bodyCenter, bodyTop + bodyHeight * .84)
  } else {
    const warningSize = width * .1
    context.fillStyle = '#f3c84e'
    context.beginPath()
    context.moveTo(popupX + popupWidth * .09, bodyTop + bodyHeight * .77)
    context.lineTo(popupX + popupWidth * .09 + warningSize / 2, bodyTop + bodyHeight * .18)
    context.lineTo(popupX + popupWidth * .09 + warningSize, bodyTop + bodyHeight * .77)
    context.closePath()
    context.fill()
    context.fillStyle = '#33281f'
    context.font = `900 ${Math.round(width * .052)}px Arial, sans-serif`
    context.fillText('!', popupX + popupWidth * .09 + warningSize / 2, bodyTop + bodyHeight * .58)
    context.textAlign = 'left'
    context.font = `800 ${Math.round(width * style.messageFont)}px Arial, sans-serif`
    const messageLines = wrapText(context, clip.popup.message, popupWidth * .64, 2)
    messageLines.forEach((line, index) => context.fillText(line, popupX + popupWidth * .28, bodyTop + bodyHeight * (.4 + index * .25)))
  }
  context.restore()
}

const drawClipBubble = (context: CanvasRenderingContext2D, clip: DailoClip, width: number, height: number, showXpTag: boolean, elapsed: number) => {
  const presentation = activityTextProvider.present(clip.activity)
  const centerY = height * VLOG_OVERLAY.scene.centerY
  if (showXpTag) {
    const tagWidth = width * (1 - VLOG_OVERLAY.scene.left - VLOG_OVERLAY.scene.right)
    const tagHeight = width * 0.09
    const tagX = width * VLOG_OVERLAY.scene.left
    const tagY = centerY - width * 0.18
    context.fillStyle = 'rgba(8, 32, 73, .92)'
    context.fillRect(tagX, tagY, tagWidth, tagHeight)
    context.strokeStyle = 'rgba(255,255,255,.9)'
    context.lineWidth = Math.max(2, width * 0.003)
    context.strokeRect(tagX, tagY, tagWidth, tagHeight)
    context.fillStyle = '#fff'
    context.textAlign = 'center'
    context.font = `700 ${Math.round(width * 0.042)}px Tahoma, Arial, sans-serif`
    context.fillText(`${clip.activityIcon || presentation.icon}  CLIP_INFO.EXE`, width / 2, tagY + tagHeight * .68)
  }

  context.lineWidth = Math.max(3, width * .006)
  context.strokeStyle = 'rgba(0,0,0,.88)'
  context.fillStyle = '#fff'
  context.font = `300 ${Math.round(width * VLOG_OVERLAY.scene.timeFont)}px Tahoma, Arial, sans-serif`
  context.strokeText(clip.displayTime, width / 2, centerY)
  context.fillText(clip.displayTime, width / 2, centerY)
  const koreanSize = Math.round(width * VLOG_OVERLAY.scene.koreanFont)
  context.font = `800 ${koreanSize}px Arial, sans-serif`
  const koreanLines = wrapText(context, clip.activity || '이 장면의 문구를 입력해 주세요', width * (1 - VLOG_OVERLAY.scene.left - VLOG_OVERLAY.scene.right), 2)
  const koreanStartY = centerY + width * .12
  koreanLines.forEach((line, index) => {
    const lineY = koreanStartY + index * koreanSize * .96
    context.strokeText(line, width / 2, lineY)
    context.fillText(line, width / 2, lineY)
  })
  const englishSize = Math.round(width * VLOG_OVERLAY.scene.englishFont)
  context.font = `500 ${englishSize}px Tahoma, Arial, sans-serif`
  const english = fitText(context, clip.activityEnglishEdited ? clip.activityEnglish ?? '' : presentation.english, width * .78)
  const englishY = koreanStartY + koreanLines.length * koreanSize * .96 + englishSize * .45
  context.strokeText(english, width / 2, englishY)
  context.fillText(english, width / 2, englishY)
  context.textAlign = 'start'

  drawXpWidget(context, clip, elapsed, width, height)

  if (clip.caption) {
    const captionWidth = width * (1 - VLOG_OVERLAY.caption.left - VLOG_OVERLAY.caption.right)
    const captionSize = Math.round(width * VLOG_OVERLAY.caption.font)
    context.font = `600 ${captionSize}px Arial, sans-serif`
    const captionLines = wrapText(context, clip.caption, captionWidth - width * 0.06, 2)
    const captionHeight = width * (captionLines.length > 1 ? .13 : .09)
    const captionTop = height - height * VLOG_OVERLAY.caption.bottom - captionHeight
    context.fillStyle = 'rgba(18, 15, 13, .7)'
    context.fillRect((width - captionWidth) / 2, captionTop, captionWidth, captionHeight)
    context.fillStyle = '#fff'
    context.textAlign = 'center'
    captionLines.forEach((line, index) => context.fillText(line, width / 2, captionTop + captionSize * (1.45 + index * 1.15)))
    context.textAlign = 'start'
  }
}

const drawCoverOverlay = (context: CanvasRenderingContext2D, project: DailoProject, width: number, height: number) => {
  const gradient = context.createLinearGradient(0, 0, 0, height)
  gradient.addColorStop(0, 'rgba(0,0,0,.08)')
  gradient.addColorStop(1, 'rgba(0,0,0,.45)')
  context.fillStyle = gradient
  context.fillRect(0, 0, width, height)
  const coverClip = project.clips[0]
  const presentation = activityTextProvider.present(coverClip?.activity ?? '')
  const style = VLOG_OVERLAY.cover
  const safeCenterX = width * (style.left + (1 - style.left - style.right) / 2)
  const tagWidth = width * (1 - style.left - style.right)
  const tagX = width * style.left
  const tagY = height * style.tagTop
  context.fillStyle = '#0754bc'
  context.fillRect(tagX, tagY, tagWidth, width * style.tagHeight)
  context.strokeStyle = '#fff'
  context.lineWidth = Math.max(2, width * .003)
  context.strokeRect(tagX, tagY, tagWidth, width * style.tagHeight)
  context.fillStyle = '#fff'
  context.textAlign = 'center'
  context.font = `700 ${Math.round(width * style.tagFont)}px Tahoma, sans-serif`
  context.fillText(fitText(context, `${presentation.icon}  DAY_IN_LIFE.EXE   ×`, tagWidth - width * .08), safeCenterX, tagY + width * .068)
  context.fillStyle = '#fff1a8'
  context.font = `800 ${Math.round(width * style.kickerFont)}px Tahoma, sans-serif`
  context.fillText(project.mode === 'N-JOB DAY' ? 'WORKING 3 JOBS A DAY' : 'RUNNING MY DAY', safeCenterX, tagY + width * .16)
  context.fillStyle = '#fff'
  context.strokeStyle = 'rgba(24,18,14,.95)'
  context.lineWidth = Math.max(5, width * .009)
  context.textAlign = 'center'
  const minimumTitleSize = Math.round(width * style.titleMinFont)
  let titleSize = Math.max(minimumTitleSize, Math.round(width * style.titleFont * ((project.coverFontScale ?? 100) / 100)))
  context.font = `900 ${titleSize}px Arial, sans-serif`
  while (titleSize > minimumTitleSize && wrapText(context, project.coverTitle || '오늘의 하루.EXE', width * .72, 99).length > 3) {
    titleSize -= 2
    context.font = `900 ${titleSize}px Arial, sans-serif`
  }
  const titleLines = wrapText(context, project.coverTitle || '오늘의 하루.EXE', width * .72, 3)
  const firstLineY = tagY + width * (titleLines.length > 1 ? .27 : .33)
  titleLines.forEach((line, index) => {
    const y = firstLineY + index * titleSize * 1.02
    context.strokeText(line, safeCenterX, y)
    context.fillText(line, safeCenterX, y)
  })
  context.font = `600 ${Math.round(width * style.englishFont)}px Tahoma, sans-serif`
  const english = activityTextProvider.present(project.coverTitle.replace(/\.EXE/gi, '')).english
  const englishY = firstLineY + titleLines.length * titleSize * 1.02 + width * .025
  const fittedEnglish = fitText(context, english, width * .68)
  context.strokeText(fittedEnglish, safeCenterX, englishY)
  context.fillText(fittedEnglish, safeCenterX, englishY)
  context.textAlign = 'start'
}

const chooseMimeType = () => {
  const safari = /Safari/i.test(navigator.userAgent) && !/Chrome|Chromium|CriOS|Edg/i.test(navigator.userAgent)
  const prefersGalleryMp4 = safari || /Android/i.test(navigator.userAgent)
  const candidates = prefersGalleryMp4
    ? ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp8,opus', 'video/webm']
    : ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4;codecs=h264,aac']
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? ''
}

export const canRenderVideo = () =>
  typeof MediaRecorder !== 'undefined' && 'captureStream' in HTMLCanvasElement.prototype

export const renderProject = async (
  project: DailoProject,
  onProgress: (progress: ExportProgress) => void,
  safeMode = false,
): Promise<{ blob: Blob; extension: 'mp4' | 'webm'; skippedCount: number }> => {
  if (!canRenderVideo()) throw new Error('이 기기에서는 영상 합성을 지원하지 않아요. 최신 Safari 또는 Chrome으로 열어주세요.')
  const clips = project.clips.filter((clip) => {
    const media = resolveSessionMedia(clip)
    return media.videoBlob || media.mediaUrl
  })
  if (!clips.length) throw new Error('저장할 영상 클립이 없어요.')

  const isMobile = window.matchMedia('(max-width: 900px)').matches || /Android|iPhone|iPad/i.test(navigator.userAgent)
  const canvas = document.createElement('canvas') as CaptureCanvas
  canvas.width = safeMode ? 720 : 1080
  canvas.height = safeMode ? 1280 : 1920
  const frameRate = safeMode ? 20 : isMobile ? 24 : 30
  const context = canvas.getContext('2d', { alpha: false })
  if (!context) throw new Error('영상 화면을 준비하지 못했어요.')

  const manualStream = canvas.captureStream(0)
  const manualTrack = manualStream.getVideoTracks()[0] as FrameTrack | undefined
  const canvasStream = manualTrack?.requestFrame ? manualStream : canvas.captureStream(frameRate)
  if (canvasStream !== manualStream) manualStream.getTracks().forEach((track) => track.stop())
  const forceFrame = () => {
    try { (canvasStream.getVideoTracks()[0] as FrameTrack | undefined)?.requestFrame?.() } catch { /* automatic frame capture remains active */ }
  }
  const audioContext = new AudioContext()
  await audioContext.resume()
  const audioDestination = audioContext.createMediaStreamDestination()
  const video = document.createElement('video')
  video.playsInline = true
  video.preload = 'auto'
  video.style.cssText = 'position:fixed;width:1px;height:1px;left:-10px;bottom:0;opacity:.001;pointer-events:none'
  document.body.append(video)
  const temporaryUrls = new Set<string>()
  const clipSources = new Map<string, string>()
  const sourceFor = (clip: DailoClip, refresh = false) => {
    const media = resolveSessionMedia(clip)
    if (!media.videoBlob) return media.mediaUrl
    const current = clipSources.get(clip.id)
    if (current && !refresh) return current
    if (current) { URL.revokeObjectURL(current); temporaryUrls.delete(current) }
    const url = URL.createObjectURL(media.videoBlob)
    temporaryUrls.add(url)
    clipSources.set(clip.id, url)
    return url
  }
  const loadClip = async (clip: DailoClip) => {
    const load = async (refresh = false) => {
      video.pause()
      video.removeAttribute('src')
      video.load()
      video.src = sourceFor(clip, refresh)
      video.load()
      await waitForMedia(video, 'loadedmetadata', 20_000)
      if (video.readyState < 2) await waitForMedia(video, 'loadeddata', 20_000)
    }
    try {
      await load()
    } catch (error) {
      if (!resolveSessionMedia(clip).videoBlob) throw error
      await load(true)
    }
  }
  const playClip = async (startAt: number, endAt: number) => {
    let lastError: unknown
    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (attempt > 0 || video.ended || video.currentTime >= endAt - .02) {
        video.pause()
        await seekVideo(video, startAt)
        await delay(60)
      }
      try {
        await video.play()
        if (!video.paused && !video.ended) return
      } catch (error) {
        lastError = error
        if (video.ended || video.currentTime >= endAt - .02 || video.currentTime > startAt + .05) return
      }
      if (attempt === 1) video.muted = true
    }
    throw lastError instanceof Error ? lastError : new Error('클립 재생을 시작하지 못했어요.')
  }
  const videoSource = audioContext.createMediaElementSource(video)
  const videoGain = audioContext.createGain()
  videoSource.connect(videoGain).connect(audioDestination)
  const combinedStream = new MediaStream([...canvasStream.getVideoTracks(), ...audioDestination.stream.getAudioTracks()])
  const mimeType = chooseMimeType()
  const options = mimeType ? { mimeType, videoBitsPerSecond: safeMode ? 4_500_000 : isMobile ? 8_000_000 : 10_000_000 } : undefined
  let recorder: MediaRecorder
  try {
    recorder = new MediaRecorder(combinedStream, options)
  } catch {
    recorder = new MediaRecorder(canvasStream, options)
  }
  const chunks: Blob[] = []
  let markChunkReady: (() => void) | undefined
  const chunkReady = new Promise<void>((resolve) => { markChunkReady = resolve })
  recorder.ondataavailable = (event) => {
    if (!event.data.size) return
    chunks.push(event.data)
    markChunkReady?.()
    markChunkReady = undefined
  }
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
    const renderableClips: DailoClip[] = []
    for (const [index, clip] of clips.entries()) {
      try {
        await loadClip(clip)
        await seekVideo(video, clip.analysis?.bestMoment ?? Math.min(clip.duration * .32, Math.max(clip.duration - .1, 0)))
        context.fillStyle = '#111'
        context.fillRect(0, 0, canvas.width, canvas.height)
        drawCoveredVideo(context, video, canvas.width, canvas.height)
        drawCoverOverlay(context, project, canvas.width, canvas.height)
        forceFrame()
        renderableClips.push(clip)
        await delay(200)
      } catch {
        // A disconnected source is skipped so the remaining day can still be saved.
      }
      onProgress({ percent: Math.max(2, Math.round(((index + 1) / clips.length) * 5)), task: `${index + 1}번째 커버 장면을 확인하고 있어요` })
    }
    if (!renderableClips.length) throw new Error('읽을 수 있는 원본 영상이 없어요. 클립에서 원본을 다시 선택해 주세요.')

    let renderedSeconds = 0
    for (const [index, clip] of renderableClips.entries()) {
      const remainingSeconds = project.outputLength - renderedSeconds
      if (remainingSeconds <= 0) break
      try {
        await loadClip(clip)
      } catch {
        continue
      }
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

      await playClip(startAt, endAt)
      const frameStartedAt = performance.now()
      await new Promise<void>((resolve, reject) => {
        const frame = () => {
          context.fillStyle = '#111'
          context.fillRect(0, 0, canvas.width, canvas.height)
          drawCoveredVideo(context, video, canvas.width, canvas.height)
          const elapsedOutputSeconds = Math.max(video.currentTime - startAt, 0) / clip.speed
          drawTransitionOverlay(context, clip, elapsedOutputSeconds, canvas.width, canvas.height)
          drawClipBubble(context, clip, canvas.width, canvas.height, elapsedOutputSeconds <= SCENE_OVERLAY_SECONDS, elapsedOutputSeconds)
          forceFrame()
          const clipProgress = Math.min((video.currentTime - startAt) / Math.max(endAt - startAt, 0.1), 1)
          onProgress({
            percent: Math.round(5 + ((index + clipProgress) / renderableClips.length) * 92),
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
      await Promise.race([chunkReady, delay(1_200)])
      if (!chunks.length) {
        context.fillStyle = 'rgba(0,0,0,.001)'
        context.fillRect(0, 0, 1, 1)
        forceFrame()
        await delay(500)
        recorder.requestData()
        await delay(500)
      }
    }
    recorder.stop()
    const blob = await completed
    const skippedCount = clips.length - renderableClips.length
    onProgress({ percent: 100, task: skippedCount ? `${skippedCount}개 원본을 제외하고 영상을 완성했어요.` : '영상이 완성됐어요. 저장 버튼을 눌러주세요.' })
    return { blob, extension: recorder.mimeType.includes('mp4') ? 'mp4' : 'webm', skippedCount }
  } finally {
    video.pause()
    video.remove()
    canvasStream.getTracks().forEach((track) => track.stop())
    combinedStream.getTracks().forEach((track) => track.stop())
    if (recorder.state !== 'inactive') recorder.stop()
    temporaryUrls.forEach((url) => URL.revokeObjectURL(url))
    await audioContext.close().catch(() => undefined)
  }
}
