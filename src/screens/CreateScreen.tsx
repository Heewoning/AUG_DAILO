import { useMemo, useRef, useState } from 'react'
import { projectModes } from '../data'
import { formatDuration } from '../services/mediaMetadata'
import { ProgressBar, RetroButton, RetroWindow } from '../components/Retro'
import type { AnalysisProgress, DailoProject, ProjectMode } from '../types'

interface CreateProps {
  project: DailoProject
  loadingFiles: boolean
  analysisProgress?: AnalysisProgress
  onModeChange: (mode: ProjectMode) => void
  onProjectChange: (patch: Partial<DailoProject>) => void
  onFiles: (files: File[]) => Promise<void>
  onRemove: (clipId: string) => void
  onMove: (clipId: string, direction: -1 | 1) => void
  onRetryThumbnail: (clipId: string) => Promise<void>
  onAnalyze: () => Promise<void>
}

const steps = ['테마 고르기', '영상 고르기', '꾸미고 저장']

export const CreateScreen = ({
  project, loadingFiles, analysisProgress, onModeChange, onProjectChange, onFiles, onRemove, onMove, onRetryThumbnail, onAnalyze,
}: CreateProps) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<1 | 2>(project.clips.length ? 2 : 1)
  const [chosenMode, setChosenMode] = useState<ProjectMode>()
  const [selectedId, setSelectedId] = useState<string>()
  const [retryingId, setRetryingId] = useState<string>()
  const [previewFailed, setPreviewFailed] = useState(false)
  const [dragging, setDragging] = useState(false)
  const selected = useMemo(
    () => project.clips.find((clip) => clip.id === selectedId) ?? project.clips[0],
    [project.clips, selectedId],
  )

  const acceptFiles = async (list: FileList | null) => {
    if (!list) return
    const files = Array.from(list).filter((file) => file.type.startsWith('video/'))
    if (files.length) await onFiles(files)
    if (inputRef.current) inputRef.current.value = ''
  }

  const chooseCustom = () => {
    onModeChange('CUSTOM')
    setChosenMode('CUSTOM')
    window.setTimeout(() => document.querySelector<HTMLInputElement>('#custom-theme')?.focus(), 0)
  }

  const choosePreset = (mode: ProjectMode) => {
    onModeChange(mode)
    setChosenMode(mode)
  }

  const goToUpload = () => {
    if (!chosenMode) return
    if (chosenMode === 'CUSTOM' && !(project.customTheme ?? '').trim()) onProjectChange({ customTheme: '나만의 하루' })
    setStep(2)
  }

  const retryThumbnail = async (clipId: string) => {
    setRetryingId(clipId)
    setPreviewFailed(false)
    try {
      await onRetryThumbnail(clipId)
    } finally {
      setRetryingId(undefined)
    }
  }

  return (
    <main className={`screen create-screen create-quest ${step === 1 ? 'create-quest--theme' : ''}`}>
      <nav className="quest-steps" aria-label="영상 만들기 단계">
        {steps.map((label, index) => {
          const number = index + 1
          const active = number === step
          const done = number < step
          return <span key={label} className={active ? 'active' : done ? 'done' : ''}><i>{done ? '✓' : number}</i><b>{label}</b></span>
        })}
      </nav>

      {step === 1 ? (
        <section className="theme-step">
          <header className="quest-heading">
            <span>STEP 01</span>
            <h1>어떤 하루를<br />기록할까요?</h1>
            <p>정답은 없어요. 오늘과 가장 가까운 테마 하나만 골라 주세요.</p>
          </header>
          <div className="simple-mode-grid">
            {projectModes.slice(0, 4).map((item) => (
              <button key={item.mode} className={chosenMode === item.mode ? 'active' : ''} onClick={() => choosePreset(item.mode)}>
                <i>{item.glyph}</i><span><b>{item.label}</b><small>{item.note}</small></span><em>{chosenMode === item.mode ? '✓' : '›'}</em>
              </button>
            ))}
            <button className={`custom-mode-card ${chosenMode === 'CUSTOM' ? 'active' : ''}`} onClick={chooseCustom}>
              <i>+</i><span><b>내가 직접 적기</b><small>나만의 테마를 만들어요</small></span><em>{chosenMode === 'CUSTOM' ? '✓' : '›'}</em>
            </button>
          </div>
          {chosenMode === 'CUSTOM' && (
            <label className="custom-theme-input" htmlFor="custom-theme">
              나의 테마 이름
              <input id="custom-theme" value={project.customTheme ?? ''} maxLength={24} placeholder="예: 친구와 성수동 데이" onChange={(event) => onProjectChange({ customTheme: event.target.value })} />
            </label>
          )}
          <div className="quest-next">
            <p><i>{chosenMode ? '✓' : '1'}</i><span>{chosenMode ? '테마를 골랐어요.' : '테마 하나를 선택해 주세요.'}<br /><small>다음 화면에서 영상을 선택해요.</small></span></p>
            <RetroButton className="primary-cta" onClick={goToUpload} disabled={!chosenMode}>다음 <span>→</span></RetroButton>
          </div>
        </section>
      ) : (
        <section className="upload-step">
          <header className="quest-heading quest-heading--row">
            <div><span>STEP 02</span><h1>오늘 찍은 영상을<br />골라 주세요.</h1></div>
            <button className="back-step" onClick={() => setStep(1)}>← 테마 다시 고르기</button>
          </header>

          <RetroWindow title="내 영상 불러오기.MOV" className="upload-window" tone="brown">
            <div
              className={`drop-zone compact-drop-zone ${dragging ? 'dragging' : ''}`}
              onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => { event.preventDefault(); setDragging(false); void acceptFiles(event.dataTransfer.files) }}
            >
              <input ref={inputRef} type="file" accept="video/*" multiple onChange={(event) => void acceptFiles(event.target.files)} />
              <span className="upload-glyph" aria-hidden="true">＋</span>
              <div><h2>{loadingFiles ? '영상 정보를 확인하는 중...' : '영상 선택하기'}</h2><p>여러 개를 한 번에 골라도 괜찮아요.<br />선택 즉시 아래에서 재생해 볼 수 있어요.</p></div>
              <RetroButton onClick={() => inputRef.current?.click()} disabled={loadingFiles}>{loadingFiles ? '잠시만 기다려 주세요' : '내 영상 고르기'}</RetroButton>
            </div>
          </RetroWindow>

          {project.clips.length > 0 && (
            <section className="clip-review quest-review">
              <div className="section-heading">
                <div><span>{String(project.clips.length).padStart(2, '0')}</span><h2>고른 영상 확인</h2><small>촬영 시간순으로 자동 정리됐어요.</small></div>
                <button onClick={() => inputRef.current?.click()}>+ 더 추가하기</button>
              </div>
              <div className="clip-review__content">
                <div className="upload-preview">
                  {selected?.mediaUrl && !previewFailed && <video key={selected.id} src={selected.mediaUrl} controls playsInline preload="metadata" aria-label={`${selected.name} 미리보기`} onError={() => setPreviewFailed(true)} />}
                  {selected && previewFailed && <button className="media-retry media-retry--preview" onClick={() => void retryThumbnail(selected.id)}><b>영상을 표시하지 못했어요</b><span>↻ 다시 불러오기</span></button>}
                  <span>{selected?.displayTime}</span><b>{selected?.activity || '장면 문구는 다음 단계에서 적어요'}</b>
                </div>
                <div className="thumbnail-grid" aria-label="업로드한 영상 목록">
                  {project.clips.map((clip, index) => (
                    <article key={clip.id} className={clip.id === selected?.id ? 'selected' : ''}>
                      <button className="thumbnail-card" onClick={() => { setSelectedId(clip.id); setPreviewFailed(false) }}>
                        {clip.thumbnail ? <img src={clip.thumbnail} alt={`${clip.name} 대표 장면`} /> : <span className="thumbnail-loading">미리보기를 불러오지 못했어요</span>}
                        <i>{String(index + 1).padStart(2, '0')}</i><em>▶</em>
                      </button>
                      {!clip.thumbnail && <button className="media-retry" disabled={retryingId === clip.id} onClick={() => void retryThumbnail(clip.id)}>{retryingId === clip.id ? '불러오는 중…' : '↻ 다시 불러오기'}</button>}
                      <div><b>{clip.name}</b><small>{clip.displayTime} 촬영 · {formatDuration(clip.duration)}</small><em>{clip.capturedAtSource === 'embedded-metadata' ? '원본 촬영정보' : '파일 날짜 기준'}</em></div>
                      <nav aria-label={`${clip.name} 순서 조절`}>
                        <button onClick={() => onMove(clip.id, -1)} disabled={index === 0}>←</button>
                        <button onClick={() => onMove(clip.id, 1)} disabled={index === project.clips.length - 1}>→</button>
                        <button className="remove" onClick={() => onRemove(clip.id)}>×</button>
                      </nav>
                    </article>
                  ))}
                </div>
              </div>
              <div className="create-footer">
                <p><i>✓</i><span><b>영상 선택 완료</b><small>다음 화면에서 썸네일, 문구와 자막을 꾸며요.</small></span></p>
                <RetroButton className="primary-cta" onClick={() => void onAnalyze()}>꾸미기 시작 <span>→</span></RetroButton>
              </div>
            </section>
          )}
        </section>
      )}

      {analysisProgress && (
        <div className="modal-backdrop" role="status" aria-live="polite">
          <RetroWindow title="영상 정리 중.EXE" className="render-dialog">
            <span className="render-symbol">✓</span><h2>편집 화면을 준비하고 있어요.</h2>
            <p>영상 순서와 편집 화면을 정리하고 있어요.</p>
            <ProgressBar value={(analysisProgress.current / analysisProgress.total) * 100} /><small>{analysisProgress.task}</small>
          </RetroWindow>
        </div>
      )}
    </main>
  )
}
