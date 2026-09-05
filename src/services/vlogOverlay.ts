import type { DailoClip } from '../types'

export const VLOG_OVERLAY = {
  cover: {
    left: 0.08,
    right: 0.12,
    tagTop: 0.37,
    tagHeight: 0.1,
    tagFont: 0.042,
    kickerFont: 0.04,
    titleFont: 0.18,
    titleMinFont: 0.05,
    englishFont: 0.04,
  },
  scene: {
    left: 0.09,
    right: 0.13,
    centerY: 0.5,
    timeFont: 0.15,
    koreanFont: 0.075,
    englishFont: 0.04,
  },
  caption: {
    left: 0.1,
    right: 0.14,
    bottom: 0.12,
    font: 0.042,
  },
  popup: {
    left: 0.09,
    right: 0.13,
    top: 0.12,
    titleBarHeight: 0.095,
    titleFont: 0.038,
    messageFont: 0.045,
  },
} as const

export const popupStartAt = (clip: DailoClip) => Math.max(clip.popup.startAt ?? 0.35, 0)
export const popupDuration = (clip: DailoClip) => Math.max(clip.popup.duration ?? 1.6, 0.3)

export const popupPlaybackState = (clip: DailoClip, elapsedSeconds: number) => {
  const start = popupStartAt(clip)
  const duration = popupDuration(clip)
  const progress = Math.min(Math.max((elapsedSeconds - start) / duration, 0), 1)
  return {
    visible: clip.popup.enabled && elapsedSeconds >= start && elapsedSeconds <= start + duration,
    progress,
  }
}
