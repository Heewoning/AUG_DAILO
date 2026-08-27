import type { AnalysisProgress, ClipAnalysis, DailoClip, DailoProject } from '../types'

export interface ClipAnalysisProvider {
  readonly id: string
  analyzeClip(clip: DailoClip, position: number, total: number): Promise<ClipAnalysis>
  organizeProject(project: DailoProject, onProgress?: (progress: AnalysisProgress) => void): Promise<DailoProject>
}

const activityFrom = (clip: DailoClip) => {
  const hour = new Date(clip.capturedAt).getHours()
  const normalized = clip.name.toLowerCase()
  if (/coffee|cafe|latte|커피|카페/.test(normalized)) return 'MORNING COFFEE'
  if (/gym|run|workout|운동|헬스/.test(normalized)) return 'WORKOUT'
  if (/lunch|food|meal|점심|밥/.test(normalized)) return 'LUNCH BREAK'
  if (/office|work|회사|출근/.test(normalized)) return 'OFFICE'
  if (hour < 9) return 'MORNING ROUTINE'
  if (hour < 12) return 'GOING TO WORK'
  if (hour < 14) return 'LUNCH BREAK'
  if (hour < 18) return 'OFFICE'
  if (hour < 21) return 'AFTER WORK'
  return 'WIND DOWN'
}

const sceneFrom = (date: string, position: number, total: number): ClipAnalysis['sceneType'] => {
  const hour = new Date(date).getHours()
  if (hour < 10) return 'MORNING'
  if (hour < 12) return 'WORK'
  if (hour < 14) return 'LUNCH'
  if (hour < 18) return 'WORK'
  if (hour < 21) return position > total * 0.65 ? 'SIDE JOB' : 'AFTER WORK'
  return 'NIGHT'
}

export class BrowserMetadataAnalysisProvider implements ClipAnalysisProvider {
  readonly id = 'browser-metadata-v1'

  async analyzeClip(clip: DailoClip, position: number, total: number): Promise<ClipAnalysis> {
    const usefulDuration = Math.max(clip.duration - 0.6, 0)
    const bestMoment = Math.min(Math.max(usefulDuration * 0.32, 0), Math.max(clip.duration - 0.3, 0))
    const quality = clip.thumbnail ? 0.82 : 0.58
    return {
      sceneType: sceneFrom(clip.capturedAt, position, total),
      quality,
      bestMoment,
      confidence: 0.72,
      transitionCandidates: position === 0 ? ['FLASH', 'HARD CUT'] : ['AUTO', 'WINDOW POP-UP'],
      source: 'browser-metadata',
    }
  }

  async organizeProject(project: DailoProject, onProgress?: (progress: AnalysisProgress) => void) {
    const ordered = [...project.clips].sort(
      (first, second) => new Date(first.capturedAt).getTime() - new Date(second.capturedAt).getTime(),
    )
    const clips: DailoClip[] = []
    for (const [index, clip] of ordered.entries()) {
      onProgress?.({ current: index + 1, total: ordered.length, task: `CLIP_${String(index + 1).padStart(2, '0')}.MOV 분석 중` })
      const analysis = await this.analyzeClip(clip, index, ordered.length)
      clips.push({
        ...clip,
        activity: clip.activity === 'NEW MOMENT' ? activityFrom(clip) : clip.activity,
        mood: analysis.sceneType === 'NIGHT' ? 'TIRED' : analysis.sceneType === 'MORNING' ? 'COZY' : 'BUSY',
        energy: Math.max(8, Math.round(94 - (index / Math.max(ordered.length - 1, 1)) * 76)),
        trimStart: Math.min(0.25, clip.duration * 0.05),
        trimEnd: Math.max(Math.min(clip.duration - 0.25, clip.duration), 0),
        analysis,
      })
      await new Promise((resolve) => setTimeout(resolve, 140))
    }
    return { ...project, clips, status: 'READY' as const, updatedAt: new Date().toISOString() }
  }
}

export const analysisProvider: ClipAnalysisProvider = new BrowserMetadataAnalysisProvider()
