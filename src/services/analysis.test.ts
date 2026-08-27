import { describe, expect, it } from 'vitest'
import { BrowserMetadataAnalysisProvider } from './analysis'
import { createProject, type DailoClip } from '../types'

const makeClip = (overrides: Partial<DailoClip> = {}): DailoClip => ({
  id: 'clip-1', name: 'office-coffee.mov', mediaUrl: 'blob:test', thumbnail: 'data:image/jpeg;base64,test',
  duration: 8, trimStart: 0, trimEnd: 8, capturedAt: '2026-08-27T09:30:00+09:00',
  displayTime: '09:30 AM', activity: 'NEW MOMENT', caption: '', mood: 'BUSY', energy: 70,
  volume: 100, speed: 1, transition: 'AUTO',
  popup: { enabled: false, kind: 'SYSTEM MESSAGE', title: 'SYSTEM MESSAGE', message: 'RUNNING', button: 'OK' },
  ...overrides,
})

describe('BrowserMetadataAnalysisProvider', () => {
  it('structures clip metadata into an editable analysis result', async () => {
    const provider = new BrowserMetadataAnalysisProvider()
    const result = await provider.analyzeClip(makeClip(), 0, 1)
    expect(result.source).toBe('browser-metadata')
    expect(result.bestMoment).toBeGreaterThan(0)
    expect(result.quality).toBeGreaterThan(0.5)
    expect(result.transitionCandidates).toContain('FLASH')
  })

  it('sorts clips and suggests activities without generating a voice', async () => {
    const provider = new BrowserMetadataAnalysisProvider()
    const project = createProject('N-JOB DAY')
    project.clips = [
      makeClip({ id: 'night', name: 'gym.mov', capturedAt: '2026-08-27T21:00:00+09:00' }),
      makeClip({ id: 'morning', name: 'coffee.mov', capturedAt: '2026-08-27T08:00:00+09:00' }),
    ]
    const organized = await provider.organizeProject(project)
    expect(organized.clips.map((clip) => clip.id)).toEqual(['morning', 'night'])
    expect(organized.clips[0].activity).toBe('MORNING COFFEE')
    expect(organized.clips.every((clip) => clip.voice === undefined)).toBe(true)
  })
})
