export type AppView = 'home' | 'create' | 'editor' | 'archive' | 'profile'

export type ProjectMode =
  | 'DAY IN LIFE'
  | 'N-JOB DAY'
  | 'WORK DAY'
  | 'WEEKEND'
  | 'TRAVEL'
  | 'FITNESS'
  | 'STUDY'
  | 'CUSTOM'

export type Mood = 'BUSY' | 'PRODUCTIVE' | 'TIRED' | 'HAPPY' | 'COZY' | 'CALM'
export type EditorTab = 'COVER' | 'CLIP' | 'TEXT' | 'TRANSITION' | 'POPUP'
export type Transition = 'AUTO' | 'HARD CUT' | 'FLASH' | 'BLACK SCREEN' | 'PHONE SCREEN' | 'WINDOW POP-UP'

export interface VoiceTrack {
  blob?: Blob
  url?: string
  duration: number
  transcript: string
  volume: number
  fadeIn: boolean
  fadeOut: boolean
  createdAt: string
}

export interface ExportedAsset {
  blob?: Blob
  url?: string
  fileName: string
  mimeType: string
  createdAt: string
}

export interface ClipAnalysis {
  sceneType: 'MORNING' | 'WORK' | 'LUNCH' | 'AFTER WORK' | 'SIDE JOB' | 'NIGHT' | 'LIFE'
  quality: number
  bestMoment: number
  confidence: number
  transitionCandidates: Transition[]
  source: 'browser-metadata'
}

export interface PopupConfig {
  enabled: boolean
  kind: 'SYSTEM MESSAGE' | 'WARNING' | 'ACHIEVEMENT'
  title: string
  message: string
  button: string
}

export interface DailoClip {
  id: string
  name: string
  mediaUrl: string
  videoBlob?: Blob
  thumbnail: string
  duration: number
  trimStart: number
  trimEnd: number
  capturedAt: string
  capturedAtSource?: 'embedded-metadata' | 'file-date'
  displayTime: string
  activity: string
  activityEnglish?: string
  activityEnglishEdited?: boolean
  activityIcon?: string
  caption: string
  mood: Mood
  energy: number
  volume: number
  speed: number
  transition: Transition
  popup: PopupConfig
  voice?: VoiceTrack
  analysis?: ClipAnalysis
}

export interface DailoProject {
  id: string
  title: string
  mode: ProjectMode
  clips: DailoClip[]
  createdAt: string
  updatedAt: string
  status: 'DRAFT' | 'READY' | 'EXPORTED'
  preset: 'COZY' | 'FAST' | 'FUNNY' | 'EDITORIAL' | 'RETRO' | 'N-JOB' | 'MINIMAL'
  outputLength: 15 | 30 | 45 | 60 | 90
  customTheme: string
  coverClipId?: string
  coverTitle: string
  coverFontScale: number
  fastIntro: boolean
  exportAsset?: ExportedAsset
}

export interface ProjectSummary {
  id: string
  title: string
  mode: ProjectMode
  clipCount: number
  createdAt: string
  updatedAt: string
  status: DailoProject['status']
  thumbnail: string
}

export interface AnalysisProgress {
  current: number
  total: number
  task: string
}

export const makeId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`

export const createProject = (mode: ProjectMode = 'DAY IN LIFE'): DailoProject => {
  const now = new Date().toISOString()
  return {
    id: makeId(),
    title: 'MY_DAY_IS_RUNNING.EXE',
    mode,
    clips: [],
    createdAt: now,
    updatedAt: now,
    status: 'DRAFT',
    preset: mode === 'N-JOB DAY' ? 'N-JOB' : 'RETRO',
    outputLength: 30,
    customTheme: '',
    coverTitle: '오늘의 하루.EXE',
    coverFontScale: 100,
    fastIntro: true,
  }
}
