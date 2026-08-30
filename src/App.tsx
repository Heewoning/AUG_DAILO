import { useCallback, useEffect, useState } from 'react'
import './App.css'
import { BottomNav, LogoMark, RetroButton } from './components/Retro'
import { ArchiveScreen } from './screens/ArchiveScreen'
import { CreateScreen } from './screens/CreateScreen'
import { EditorScreen } from './screens/EditorScreen'
import { HomeScreen } from './screens/HomeScreen'
import { ProfileScreen } from './screens/ProfileScreen'
import { analysisProvider } from './services/analysis'
import { createClipThumbnail, fileToClip } from './services/mediaMetadata'
import { countRecordedSeconds, listProjects, loadProject, saveProject } from './services/storage'
import { canRenderVideo, renderProject, type ExportProgress } from './services/videoExport'
import { createProject, type AnalysisProgress, type AppView, type DailoClip, type DailoProject, type ProjectMode, type ProjectSummary } from './types'

const download = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.style.display = 'none'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 2_000)
}

interface ExportedVideo {
  blob: Blob
  fileName: string
}

function App() {
  const [view, setView] = useState<AppView>('home')
  const [project, setProject] = useState<DailoProject>(() => createProject())
  const [projects, setProjects] = useState<ProjectSummary[]>(() => listProjects())
  const [selectedClipId, setSelectedClipId] = useState<string>()
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress>()
  const [saving, setSaving] = useState(false)
  const [exportState, setExportState] = useState<ExportProgress>()
  const [exportError, setExportError] = useState<string>()
  const [exportedVideo, setExportedVideo] = useState<ExportedVideo>()
  const [archiveProject, setArchiveProject] = useState<DailoProject>()
  const [toast, setToast] = useState<string>()

  useEffect(() => {
    if (!project.clips.length) return
    const timer = window.setTimeout(() => {
      setSaving(true)
      saveProject({ ...project, updatedAt: new Date().toISOString() })
        .then(() => {
          setProjects(listProjects())
          setSaving(false)
        })
        .catch(() => {
          setSaving(false)
          setToast('저장 공간이 부족해 일부 원본을 저장하지 못했어요.')
        })
    }, 700)
    return () => window.clearTimeout(timer)
  }, [project])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(undefined), 3600)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [view])

  const startNew = useCallback(() => {
    setProject(createProject())
    setSelectedClipId(undefined)
    setView('create')
  }, [])

  const openProject = useCallback(async (id: string) => {
    setToast('저장된 영상 파일을 불러오는 중...')
    const loaded = await loadProject(id)
    if (!loaded) {
      setToast('프로젝트를 찾을 수 없습니다.')
      return
    }
    setProject(loaded)
    setSelectedClipId(loaded.clips[0]?.id)
    setView('editor')
    setToast(undefined)
  }, [])

  const onFiles = useCallback(async (files: File[]) => {
    setLoadingFiles(true)
    try {
      let loadedCount = 0
      const thumbnailQueue: DailoClip[] = []
      for (let index = 0; index < files.length; index += 2) {
        const results = await Promise.allSettled(files.slice(index, index + 2).map((file) => fileToClip(file, { thumbnail: false })))
        const batch = results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : [])
        if (!batch.length) continue
        loadedCount += batch.length
        thumbnailQueue.push(...batch)
        setProject((current) => ({ ...current, clips: [...current.clips, ...batch], updatedAt: new Date().toISOString() }))
        setSelectedClipId((current) => current ?? batch[0]?.id)
        setLoadingFiles(false)
      }
      if (!loadedCount) throw new Error('선택한 영상을 읽지 못했어요. 다른 파일로 다시 시도해 주세요.')
      setToast(`${loadedCount}개의 영상을 바로 불러왔어요.`)
      void (async () => {
        for (const clip of thumbnailQueue) {
          try {
            const thumbnail = await createClipThumbnail(clip.mediaUrl, clip.duration)
            if (thumbnail) setProject((current) => ({
              ...current,
              clips: current.clips.map((item) => item.id === clip.id ? { ...item, thumbnail } : item),
            }))
          } catch {
            // Preview playback remains available even if iOS cannot seek a thumbnail immediately.
          }
        }
      })()
    } catch (error) {
      setToast(error instanceof Error ? error.message : '영상을 불러오지 못했습니다.')
    } finally {
      setLoadingFiles(false)
    }
  }, [])

  const removeClip = useCallback((clipId: string) => {
    setProject((current) => {
      const removed = current.clips.find((clip) => clip.id === clipId)
      if (removed?.mediaUrl) URL.revokeObjectURL(removed.mediaUrl)
      return { ...current, clips: current.clips.filter((clip) => clip.id !== clipId) }
    })
    setSelectedClipId(undefined)
  }, [])

  const moveClip = useCallback((clipId: string, direction: -1 | 1) => {
    setProject((current) => {
      const clips = [...current.clips]
      const index = clips.findIndex((clip) => clip.id === clipId)
      const next = index + direction
      if (index < 0 || next < 0 || next >= clips.length) return current
      const [moved] = clips.splice(index, 1)
      clips.splice(next, 0, moved)
      return { ...current, clips, updatedAt: new Date().toISOString() }
    })
  }, [])

  const analyze = useCallback(async () => {
    if (!project.clips.length) return
    setAnalysisProgress({ current: 0, total: project.clips.length, task: '분석 엔진 시작 중' })
    try {
      const organized = await analysisProvider.organizeProject(project, setAnalysisProgress)
      setProject(organized)
      setSelectedClipId(organized.clips[0]?.id)
      setView('editor')
      saveProject(organized)
        .then(() => setProjects(listProjects()))
        .catch(() => setToast('편집 화면은 준비됐어요. 저장 공간을 확인해 주세요.'))
    } catch (error) {
      setToast(error instanceof Error ? error.message : '클립 정리 중 문제가 생겼어요. 다시 시도해 주세요.')
    } finally {
      setAnalysisProgress(undefined)
    }
  }, [project])

  const updateClip = useCallback((clipId: string, patch: Partial<DailoClip>) => {
    setProject((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      clips: current.clips.map((clip) => clip.id === clipId ? { ...clip, ...patch } : clip),
    }))
  }, [])

  const updateProject = useCallback((patch: Partial<DailoProject>) => {
    setProject((current) => ({ ...current, ...patch, updatedAt: new Date().toISOString() }))
  }, [])

  const exportVideo = useCallback(async () => {
    setExportError(undefined)
    setExportedVideo(undefined)
    setExportState({ percent: 1, task: '렌더링 엔진 확인 중' })
    try {
      if (!canRenderVideo()) throw new Error('이 브라우저는 합성 영상 내보내기를 지원하지 않아요. 최신 Safari 또는 Chrome에서 다시 시도해 주세요.')
      const result = await renderProject(project, setExportState)
      const fileDate = new Date().toLocaleDateString('en-CA').replaceAll('-', '')
      setExportedVideo({ blob: result.blob, fileName: `DAY_IN_LIFE_${fileDate}.${result.extension}` })
      const asset = {
        blob: result.blob,
        url: URL.createObjectURL(result.blob),
        fileName: `DAY_IN_LIFE_${fileDate}.${result.extension}`,
        mimeType: result.blob.type,
        createdAt: new Date().toISOString(),
      }
      const exported = { ...project, exportAsset: asset, status: 'EXPORTED' as const, updatedAt: new Date().toISOString() }
      setProject(exported)
      saveProject(exported)
        .then(() => setProjects(listProjects()))
        .catch(() => setToast('영상은 완성됐어요. 프로젝트 자동 저장만 확인해 주세요.'))
    } catch (error) {
      setExportState(undefined)
      setExportError(error instanceof Error ? error.message : '영상 내보내기에 실패했습니다. 원본 클립은 안전합니다.')
    }
  }, [project])

  const saveExportedVideo = useCallback(async () => {
    if (!exportedVideo) return
    const file = new File([exportedVideo.blob], exportedVideo.fileName, { type: exportedVideo.blob.type })
    try {
      const picker = (window as Window & { showDirectoryPicker?: () => Promise<any> }).showDirectoryPicker
      if (picker) {
        const root = await picker()
        const folder = await root.getDirectoryHandle('DAILO', { create: true })
        const handle = await folder.getFileHandle(exportedVideo.fileName, { create: true })
        const writer = await handle.createWritable()
        await writer.write(exportedVideo.blob)
        await writer.close()
        setToast('선택한 위치의 DAILO 폴더에 저장했어요.')
      } else if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'DAILO — 오늘의 영상' })
        setToast('공유 메뉴에서 “비디오 저장”을 선택해 주세요.')
      } else {
        download(exportedVideo.blob, exportedVideo.fileName)
        setToast('다운로드 폴더에 고화질 영상을 저장했어요.')
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      download(exportedVideo.blob, exportedVideo.fileName)
      setToast('다운로드 폴더에 영상을 저장했어요.')
    }
  }, [exportedVideo])

  const openArchiveProject = useCallback(async (id: string) => {
    setToast('완성된 브이로그를 불러오는 중...')
    const loaded = await loadProject(id)
    if (!loaded) {
      setToast('저장된 브이로그를 찾을 수 없어요.')
      return
    }
    setArchiveProject(loaded)
    setToast(undefined)
  }, [])

  const changeView = (next: AppView) => {
    if (next === 'create') startNew()
    else setView(next)
  }

  const recordedSeconds = countRecordedSeconds()

  return (
    <div className={`app-shell ${view === 'editor' ? 'app-shell--editor' : ''}`}>
      {view !== 'editor' && (
        <header className="site-header">
          <button className="brand" onClick={() => setView('home')}><LogoMark /><span><b>DAILO</b><small>DAY IN LIFE.EXE</small></span></button>
          <p>YOUR ORDINARY DAY,<br /><b>EDITED DIFFERENTLY.</b></p>
          <RetroButton onClick={startNew}>+ NEW PROJECT</RetroButton>
        </header>
      )}

      {view === 'home' && <HomeScreen projects={projects} onCreate={startNew} onOpenProject={(id) => void openProject(id)} />}
      {view === 'create' && (
        <CreateScreen
          project={project}
          loadingFiles={loadingFiles}
          analysisProgress={analysisProgress}
          onModeChange={(mode: ProjectMode) => setProject((current) => ({ ...current, mode, preset: mode === 'N-JOB DAY' ? 'N-JOB' : current.preset }))}
          onProjectChange={updateProject}
          onFiles={onFiles}
          onRemove={removeClip}
          onMove={moveClip}
          onAnalyze={analyze}
        />
      )}
      {view === 'editor' && (
        <EditorScreen
          project={project}
          selectedClipId={selectedClipId}
          saving={saving}
          onSelect={setSelectedClipId}
          onUpdateClip={updateClip}
          onUpdateProject={updateProject}
          onOpenArchive={() => setView('archive')}
          onDeleteClip={removeClip}
          onExport={exportVideo}
          exportState={exportState}
          exportError={exportError}
          exportReady={Boolean(exportedVideo)}
          onSaveExport={saveExportedVideo}
          onCloseExport={() => { setExportState(undefined); setExportError(undefined); setExportedVideo(undefined) }}
        />
      )}
      {view === 'archive' && <ArchiveScreen projects={projects} selectedProject={archiveProject} onOpen={(id) => void openArchiveProject(id)} onClose={() => setArchiveProject(undefined)} onCreate={startNew} />}
      {view === 'profile' && <ProfileScreen projects={projects} recordedSeconds={recordedSeconds} />}

      <BottomNav current={view} onChange={changeView} />
      {toast && <div className="toast"><span>i</span>{toast}</div>}
    </div>
  )
}

export default App
