import type { Mood, ProjectMode } from './types'

export const projectModes: Array<{ mode: ProjectMode; label: string; note: string; glyph: string }> = [
  { mode: 'DAY IN LIFE', label: '하루 기록', note: '오늘의 모든 순간', glyph: '◫' },
  { mode: 'N-JOB DAY', label: 'N잡 데이', note: '여러 개의 하루를 한 편에', glyph: '⌘' },
  { mode: 'WORK DAY', label: '출근하는 날', note: '출근부터 퇴근까지', glyph: '▣' },
  { mode: 'WEEKEND', label: '주말', note: '느린 주말의 기록', glyph: '☀' },
  { mode: 'TRAVEL', label: '여행', note: '움직이는 하루', glyph: '✦' },
  { mode: 'FITNESS', label: '운동', note: '나만의 운동 루틴', glyph: '◆' },
  { mode: 'STUDY', label: '공부', note: '집중의 시간', glyph: '▤' },
  { mode: 'CUSTOM', label: '직접 만들기', note: '나만의 흐름', glyph: '+' },
]

export const moods: Mood[] = ['BUSY', 'PRODUCTIVE', 'TIRED', 'HAPPY', 'COZY', 'CALM']

export const popupSuggestions = [
  'OFFICE.EXE HAS STARTED.',
  'COFFEE LEVEL: 12%',
  'SIDEJOB.EXE IS RUNNING...',
  'ENERGY LEVEL: 4%',
  'WORKDAY.EXE COMPLETED.',
]
