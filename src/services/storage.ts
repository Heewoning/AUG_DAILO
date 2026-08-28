import type { DailoClip, DailoProject, ProjectSummary, VoiceTrack } from '../types'

const PROJECT_KEY = 'dailo:projects:v1'
const DATABASE = 'dailo-media-v1'
const STORE = 'blobs'
const persistedVoiceVersions = new Map<string, string>()

type StoredVoice = Omit<VoiceTrack, 'blob' | 'url'> & { hasBlob: boolean }
type StoredClip = Omit<DailoClip, 'mediaUrl' | 'videoBlob' | 'voice'> & {
  hasVideoBlob: boolean
  voice?: StoredVoice
}
type StoredProject = Omit<DailoProject, 'clips'> & { clips: StoredClip[] }

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

const readAll = (): StoredProject[] => {
  try {
    return JSON.parse(localStorage.getItem(PROJECT_KEY) ?? '[]') as StoredProject[]
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
  const stored: StoredProject = { ...project, clips: project.clips.map(toStoredClip) }
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
}

const hydrateClip = async (projectId: string, clip: StoredClip): Promise<DailoClip> => {
  const videoBlob = clip.hasVideoBlob ? await getBlob(`${projectId}:${clip.id}:video`) : undefined
  const voiceBlob = clip.voice?.hasBlob ? await getBlob(`${projectId}:${clip.id}:voice`) : undefined
  const { hasVideoBlob: _hasVideoBlob, voice, ...metadata } = clip
  return {
    ...metadata,
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
  return { ...project, clips }
}

export const listProjects = (): ProjectSummary[] =>
  readAll().map((project) => ({
    id: project.id,
    title: project.title,
    mode: project.mode,
    clipCount: project.clips.length,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    status: project.status,
    thumbnail: project.clips[0]?.thumbnail ?? '',
  }))

export const countRecordedSeconds = () =>
  readAll().reduce((total, project) => total + project.clips.reduce(
    (sum, clip) => sum + Math.max(clip.trimEnd - clip.trimStart, 0),
    0,
  ), 0)
