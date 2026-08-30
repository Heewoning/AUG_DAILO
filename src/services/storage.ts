import type { DailoClip, DailoProject, ExportedAsset, ProjectSummary, VoiceTrack } from '../types'
import { activityTextProvider } from './activityText'

const PROJECT_KEY = 'dailo:projects:v1'
const DATABASE = 'dailo-media-v1'
const STORE = 'blobs'
const persistedVoiceVersions = new Map<string, string>()
const persistedExportVersions = new Map<string, string>()

type StoredVoice = Omit<VoiceTrack, 'blob' | 'url'> & { hasBlob: boolean }
type StoredClip = Omit<DailoClip, 'mediaUrl' | 'videoBlob' | 'voice'> & {
  hasVideoBlob: boolean
  voice?: StoredVoice
}
type StoredExport = Omit<ExportedAsset, 'blob' | 'url'> & { hasBlob: boolean }
type StoredProject = Omit<DailoProject, 'clips' | 'exportAsset'> & { clips: StoredClip[]; exportAsset?: StoredExport }

const openDatabase = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

const putBlob = async (key: string, blob: Blob, overwrite = false) => {
  const database = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE, 'readwrite')
    const store = transaction.objectStore(STORE)
    if (overwrite) store.put(blob, key)
    else {
      const request = store.getKey(key)
      request.onsuccess = () => {
        if (request.result === undefined) store.put(blob, key)
      }
    }
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
  database.close()
}

const getBlob = async (key: string) => {
  const database = await openDatabase()
  const blob = await new Promise<Blob | undefined>((resolve, reject) => {
    const request = database.transaction(STORE).objectStore(STORE).get(key)
    request.onsuccess = () => resolve(request.result as Blob | undefined)
    request.onerror = () => reject(request.error)
  })
  database.close()
  return blob
}

const normalizeStoredClip = (value: unknown, index: number): StoredClip | undefined => {
  if (!value || typeof value !== 'object') return undefined
  const clip = value as Partial<StoredClip>
  const capturedAt = typeof clip.capturedAt === 'string' ? clip.capturedAt : new Date().toISOString()
  return {
    ...clip,
    id: typeof clip.id === 'string' ? clip.id : `legacy-clip-${index}`,
    name: typeof clip.name === 'string' ? clip.name : `VIDEO_${index + 1}.MOV`,
    thumbnail: typeof clip.thumbnail === 'string' ? clip.thumbnail : '',
    duration: Number.isFinite(clip.duration) ? Number(clip.duration) : 0,
    trimStart: Number.isFinite(clip.trimStart) ? Number(clip.trimStart) : 0,
    trimEnd: Number.isFinite(clip.trimEnd) ? Number(clip.trimEnd) : Number(clip.duration) || 0,
    capturedAt,
    displayTime: typeof clip.displayTime === 'string' ? clip.displayTime : '--:--',
    activity: typeof clip.activity === 'string' ? clip.activity : '',
    caption: typeof clip.caption === 'string' ? clip.caption : '',
    mood: clip.mood ?? 'BUSY',
    energy: Number.isFinite(clip.energy) ? Number(clip.energy) : 70,
    volume: Number.isFinite(clip.volume) ? Number(clip.volume) : 100,
    speed: Number.isFinite(clip.speed) ? Number(clip.speed) : 1,
    transition: clip.transition ?? 'AUTO',
    popup: clip.popup ?? { enabled: false, kind: 'SYSTEM MESSAGE', title: 'SYSTEM MESSAGE', message: 'LIFE.EXE IS RUNNING...', button: 'OK' },
    hasVideoBlob: Boolean(clip.hasVideoBlob),
  } as StoredClip
}

const normalizeStoredProject = (value: unknown, index: number): StoredProject | undefined => {
  if (!value || typeof value !== 'object') return undefined
  const project = value as Partial<StoredProject>
  const now = new Date().toISOString()
  return {
    ...project,
    id: typeof project.id === 'string' ? project.id : `legacy-project-${index}`,
    title: typeof project.title === 'string' ? project.title : 'MY_DAY_IS_RUNNING.EXE',
    mode: project.mode ?? 'DAY IN LIFE',
    clips: (Array.isArray(project.clips) ? project.clips : []).flatMap((clip, clipIndex) => {
      const normalized = normalizeStoredClip(clip, clipIndex)
      return normalized ? [normalized] : []
    }),
    createdAt: typeof project.createdAt === 'string' ? project.createdAt : now,
    updatedAt: typeof project.updatedAt === 'string' ? project.updatedAt : now,
    status: project.status ?? 'DRAFT',
    preset: project.preset ?? 'RETRO',
    outputLength: project.outputLength ?? 30,
    customTheme: typeof project.customTheme === 'string' ? project.customTheme : '',
    coverTitle: typeof project.coverTitle === 'string' ? project.coverTitle : '오늘의 하루.EXE',
    fastIntro: project.fastIntro ?? true,
  } as StoredProject
}

const readAll = (): StoredProject[] => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(PROJECT_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap((project, index) => {
      const normalized = normalizeStoredProject(project, index)
      return normalized ? [normalized] : []
    })
  } catch {
    return []
  }
}

const toStoredClip = (clip: DailoClip): StoredClip => {
  const { mediaUrl: _mediaUrl, videoBlob, voice, ...metadata } = clip
  return {
    ...metadata,
    hasVideoBlob: Boolean(videoBlob),
    voice: voice
      ? {
          duration: voice.duration,
          transcript: voice.transcript,
          volume: voice.volume,
          fadeIn: voice.fadeIn,
          fadeOut: voice.fadeOut,
          createdAt: voice.createdAt,
          hasBlob: Boolean(voice.blob),
        }
      : undefined,
  }
}

export const saveProject = async (project: DailoProject) => {
  const { exportAsset, ...projectMetadata } = project
  const stored: StoredProject = {
    ...projectMetadata,
    clips: project.clips.map(toStoredClip),
    exportAsset: exportAsset ? {
      fileName: exportAsset.fileName,
      mimeType: exportAsset.mimeType,
      createdAt: exportAsset.createdAt,
      hasBlob: Boolean(exportAsset.blob),
    } : undefined,
  }
  const projects = readAll().filter((item) => item.id !== project.id)
  localStorage.setItem(PROJECT_KEY, JSON.stringify([stored, ...projects].slice(0, 30)))

  await Promise.all(project.clips.flatMap((clip) => {
    const writes: Promise<void>[] = []
    if (clip.videoBlob) writes.push(putBlob(`${project.id}:${clip.id}:video`, clip.videoBlob))
    const voiceKey = `${project.id}:${clip.id}:voice`
    if (clip.voice?.blob && persistedVoiceVersions.get(voiceKey) !== clip.voice.createdAt) {
      writes.push(putBlob(voiceKey, clip.voice.blob, true).then(() => {
        persistedVoiceVersions.set(voiceKey, clip.voice!.createdAt)
      }))
    }
    return writes
  }))
  const exportKey = `${project.id}:export`
  if (exportAsset?.blob && persistedExportVersions.get(exportKey) !== exportAsset.createdAt) {
    await putBlob(exportKey, exportAsset.blob, true)
    persistedExportVersions.set(exportKey, exportAsset.createdAt)
  }
}

const hydrateClip = async (projectId: string, clip: StoredClip): Promise<DailoClip> => {
  const videoBlob = clip.hasVideoBlob ? await getBlob(`${projectId}:${clip.id}:video`) : undefined
  const voiceBlob = clip.voice?.hasBlob ? await getBlob(`${projectId}:${clip.id}:voice`) : undefined
  const { hasVideoBlob: _hasVideoBlob, voice, ...metadata } = clip
  const presentation = activityTextProvider.present(metadata.activity || '')
  return {
    ...metadata,
    activityEnglish: metadata.activityEnglish || presentation.english,
    activityIcon: metadata.activityIcon || presentation.icon,
    mediaUrl: videoBlob ? URL.createObjectURL(videoBlob) : '',
    videoBlob,
    voice: voice
      ? {
          duration: voice.duration,
          transcript: voice.transcript,
          volume: voice.volume,
          fadeIn: voice.fadeIn,
          fadeOut: voice.fadeOut,
          createdAt: voice.createdAt,
          blob: voiceBlob,
          url: voiceBlob ? URL.createObjectURL(voiceBlob) : undefined,
        }
      : undefined,
  }
}

export const loadProject = async (id: string): Promise<DailoProject | undefined> => {
  const project = readAll().find((item) => item.id === id)
  if (!project) return undefined
  const clips = await Promise.all(project.clips.map((clip) => hydrateClip(project.id, clip)))
  const exportBlob = project.exportAsset?.hasBlob ? await getBlob(`${project.id}:export`) : undefined
  return {
    ...project,
    customTheme: project.customTheme ?? '',
    coverTitle: project.coverTitle ?? '오늘의 하루.EXE',
    fastIntro: project.fastIntro ?? true,
    clips,
    exportAsset: project.exportAsset ? {
      fileName: project.exportAsset.fileName,
      mimeType: project.exportAsset.mimeType,
      createdAt: project.exportAsset.createdAt,
      blob: exportBlob,
      url: exportBlob ? URL.createObjectURL(exportBlob) : undefined,
    } : undefined,
  }
}

export const listProjects = (): ProjectSummary[] =>
  readAll().map((project) => ({
    id: project.id,
    title: project.coverTitle || project.customTheme || project.title,
    mode: project.mode,
    clipCount: project.clips.length,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    status: project.status,
    thumbnail: project.clips.find((clip) => clip.id === project.coverClipId)?.thumbnail ?? project.clips[0]?.thumbnail ?? '',
  }))

export const countRecordedSeconds = () =>
  readAll().reduce((total, project) => total + project.clips.reduce(
    (sum, clip) => sum + Math.max(clip.trimEnd - clip.trimStart, 0),
    0,
  ), 0)
