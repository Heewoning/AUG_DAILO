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
  onFiles: (files: File[]) => Promise<void>
  onRemove: (clipId: string) => void
  onMove: (clipId: string, direction: -1 | 1) => void
  onAnalyze: () => Promise<void>
}

export const CreateScreen = ({
  project, loadingFiles, analysisProgress, onModeChange, onFiles, onRemove, onMove, onAnalyze,
}: CreateProps) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [selectedId, setSelectedId] = useState<string>()
  const [dragging, setDragging] = useState(false)
  const [showAllModes, setShowAllModes] = useState(false)
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

  return (
    <main className="screen create-screen">
      <header className="page-heading">
        <div><p className="eyebrow">새 영상 · 1단계</p><h1>오늘의 영상을<br /><em>골라 주세요.</em></h1></div>
        <p>하루의 분위기를 고른 뒤 영상을 불러오세요.<br />썸네일로 확인하고 바로 편집할 수 있어요.</p>
      </header>

      <section className="create-layout">
        <RetroWindow title="오늘의 테마.EXE" className="mode-window">
          <div className="mode-list">
            {projectModes.slice(0, showAllModes ? projectModes.length : 4).map((item) => (
              <button
                key={item.mode}
                className={project.mode === item.mode ? 'active' : ''}
                onClick={() => onModeChange(item.mode)}
              >
                <i>{item.glyph}</i><span><b>{item.label}</b><small>{item.note}</small></span><em>›</em>
              </button>
            ))}
            <button className="more-modes" onClick={() => setShowAllModes((value) => !value)}>
              <i>+</i><span><b>{showAllModes ? '간단히 보기' : '다른 테마 보기'}</b><small>{showAllModes ? '자주 쓰는 테마만 표시' : '여행, 운동, 공부 등'}</small></span><em>›</em>
            </button>
          </div>
        </RetroWindow>

        <div className="upload-column">
          <RetroWindow title="내 영상 불러오기.MOV" className="upload-window" tone="brown">
            <div
              className={`drop-zone ${dragging ? 'dragging' : ''}`}
              onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => { event.preventDefault(); setDragging(false); void acceptFiles(event.dataTransfer.files) }}
            >
              <input
                ref={inputRef}
                type="file"
                accept="video/*"
                multiple
                onChange={(event) => void acceptFiles(event.target.files)}
              />
              <span className="upload-glyph" aria-hidden="true">↑</span>
              <h2>{loadingFiles ? '썸네일을 만드는 중...' : '오늘 찍은 영상을 골라 주세요'}</h2>
              <p>영상 여러 개를 한 번에 선택할 수 있어요.<br />각 영상은 바로 썸네일과 재생 미리보기를 만듭니다.</p>
              <RetroButton onClick={() => inputRef.current?.click()} disabled={loadingFiles}>
                {loadingFiles ? '불러오는 중...' : '영상 선택하기'}
              </RetroButton>
              <small>MP4 · MOV · WEBM / CAMERA ROLL</small>
            </div>
          </RetroWindow>

          {project.clips.length > 0 && (
            <section className="clip-review">
              <div className="section-heading">
                <div><span>{String(project.clips.length).padStart(2, '0')}</span><h2>선택한 영상</h2></div>
                <button onClick={() => inputRef.current?.click()}>+ 영상 추가</button>
              </div>
              <div className="clip-review__content">
                <div className="upload-preview">
                  {selected?.mediaUrl ? (
                    <video key={selected.id} src={selected.mediaUrl} controls playsInline preload="metadata" aria-label={`${selected.name} 미리보기`} />
                  ) : null}
                  <span>{selected?.displayTime}</span>
                  <b>{selected?.activity}</b>
                </div>
                <div className="thumbnail-grid" aria-label="업로드한 영상 목록">
                  {project.clips.map((clip, index) => (
                    <article key={clip.id} className={clip.id === selected?.id ? 'selected' : ''}>
                      <button className="thumbnail-card" onClick={() => setSelectedId(clip.id)}>
                        {clip.thumbnail ? <img src={clip.thumbnail} alt={`${clip.name} 대표 장면`} /> : <span className="no-thumbnail">VIDEO</span>}
                        <i>{String(index + 1).padStart(2, '0')}</i>
                        <em>▶</em>
                      </button>
                      <div><b>{clip.name}</b><small>{clip.displayTime} · {formatDuration(clip.duration)}</small></div>
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
                <p><i>✓</i><span><b>클립 준비 완료</b><small>AI는 목소리를 만들지 않아요. 내 영상과 내 목소리만 사용합니다.</small></span></p>
                <RetroButton className="primary-cta" onClick={() => void onAnalyze()}>자동으로 정리하고 편집하기 <span>→</span></RetroButton>
              </div>
            </section>
          )}
        </div>
      </section>

      {analysisProgress && (
        <div className="modal-backdrop" role="status" aria-live="polite">
          <RetroWindow title="영상 정리 중.EXE" className="render-dialog">
            <span className="render-symbol">✦</span>
            <h2>영상 편집 화면을 준비하고 있어요.</h2>
            <p>촬영 시간과 장면 흐름을 정리하고 있어요.</p>
            <ProgressBar value={(analysisProgress.current / analysisProgress.total) * 100} />
            <small>{analysisProgress.task}</small>
          </RetroWindow>
        </div>
      )}
    </main>
  )
}
