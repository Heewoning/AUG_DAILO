import { useCallback, useEffect, useState } from 'react'
import './App.css'
import { BottomNav, LogoMark, RetroButton, RetroWindow } from './components/Retro'
import { ArchiveScreen } from './screens/ArchiveScreen'
import { CreateScreen } from './screens/CreateScreen'
import { EditorScreen } from './screens/EditorScreen'
import { HomeScreen } from './screens/HomeScreen'
import { ProfileScreen } from './screens/ProfileScreen'
import { analysisProvider } from './services/analysis'
import { fileToClip } from './services/mediaMetadata'
import { countRecordedSeconds, listProjects, loadProject, saveProject } from './services/storage'
import { canRenderVideo, renderProject, type ExportProgress } from './services/videoExport'
import { createProject, type AnalysisProgress, type AppView, type DailoClip, type DailoProject, type ProjectMode, type ProjectSummary } from './types'

const download = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 2_000)
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
  const [toast, setToast] = useState<string>()
  const [startup, setStartup] = useState(() => sessionStorage.getItem('dailo:booted') !== 'yes')

  useEffect(() => {
    if (!startup) return
    sessionStorage.setItem('dailo:booted', 'yes')
    const timer = window.setTimeout(() => setStartup(false), 1250)
    return () => window.clearTimeout(timer)
  }, [startup])

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
      const clips: DailoClip[] = []
      for (const file of files) clips.push(await fileToClip(file))
      setProject((current) => ({ ...current, clips: [...current.clips, ...clips], updatedAt: new Date().toISOString() }))
      setSelectedClipId((current) => current ?? clips[0]?.id)
      setToast(`${clips.length}개의 영상 썸네일을 만들었어요.`)
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
      await saveProject(organized)
      setProjects(listProjects())
      setView('editor')
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

  const exportVideo = useCallback(async () => {
    setExportError(undefined)
    setExportState({ percent: 1, task: '렌더링 엔진 확인 중' })
    try {
      if (!canRenderVideo()) throw new Error('이 브라우저는 합성 영상 내보내기를 지원하지 않아요. 최신 Safari 또는 Chrome에서 다시 시도해 주세요.')
      const result = await renderProject(project, setExportState)
      const fileDate = new Date().toLocaleDateString('en-CA').replaceAll('-', '')
      download(result.blob, `DAY_IN_LIFE_${fileDate}.${result.extension}`)
      const exported = { ...project, status: 'EXPORTED' as const, updatedAt: new Date().toISOString() }
      setProject(exported)
      await saveProject(exported)
      setProjects(listProjects())
    } catch (error) {
      setExportState(undefined)
      setExportError(error instanceof Error ? error.message : '영상 내보내기에 실패했습니다. 원본 클립은 안전합니다.')
    }
  }, [project])

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
          onDeleteClip={removeClip}
          onExport={exportVideo}
          exportState={exportState}
          exportError={exportError}
          onCloseExport={() => { setExportState(undefined); setExportError(undefined) }}
        />
      )}
      {view === 'archive' && <ArchiveScreen projects={projects} onOpen={(id) => void openProject(id)} onCreate={startNew} />}
      {view === 'profile' && <ProfileScreen projects={projects} recordedSeconds={recordedSeconds} />}

      <BottomNav current={view} onChange={changeView} />
      {toast && <div className="toast"><span>i</span>{toast}</div>}
      {startup && (
        <div className="boot-screen">
          <RetroWindow title="SYSTEM_STARTUP.EXE">
            <LogoMark /><h1>LIFE.EXE</h1><p>오늘 하루를 불러오는 중...</p><div className="boot-blocks">{Array.from({ length: 12 }, (_, index) => <i key={index} />)}</div><b>100%</b>
          </RetroWindow>
        </div>
      )}
    </div>
  )
}

export default App
