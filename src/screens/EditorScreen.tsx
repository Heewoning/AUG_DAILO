import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { moods, popupSuggestions } from '../data'
import { formatDuration } from '../services/mediaMetadata'
import { activityTextProvider } from '../services/activityText'
import { resolveSessionMedia } from '../services/mediaSession'
import { ProgressBar, RetroButton, RetroWindow } from '../components/Retro'
import { ClipVideo } from '../components/ClipVideo'
import type { DailoClip, DailoProject, EditorTab, Transition } from '../types'

interface EditorProps {
  project: DailoProject
  selectedClipId?: string
  saving: boolean
  onSelect: (clipId: string) => void
  onUpdateClip: (clipId: string, patch: Partial<DailoClip>) => void
  onUpdateProject: (patch: Partial<DailoProject>) => void
  onOpenArchive: () => void
  onDeleteClip: (clipId: string) => void
  onReplaceMedia: (clipId: string, file: File) => Promise<void>
  onExport: () => Promise<void>
  exportState?: { percent: number; task: string }
  exportError?: string
  exportReady: boolean
  onSaveExport: () => Promise<void>
  onShareExport: () => Promise<void>
  onCloseExport: () => void
  exportPreviewUrl?: string
}

const tabs: EditorTab[] = ['COVER', 'CLIP', 'TRANSITION', 'POPUP']
const tabLabels: Record<EditorTab, string> = {
  COVER: '썸네일', CLIP: '장면·자막', TEXT: '자막', TRANSITION: '전환', POPUP: '말풍선',
}
const transitions: Transition[] = ['AUTO', 'HARD CUT', 'FLASH', 'BLACK SCREEN', 'PHONE SCREEN', 'WINDOW POP-UP']
const transitionClassName = (transition: Transition) => transition.toLowerCase().replaceAll(' ', '-')
export const EditorScreen = ({
  project, selectedClipId, saving, onSelect, onUpdateClip, onDeleteClip, onReplaceMedia, onExport, exportState, exportError,
  exportReady, onSaveExport, onShareExport, onCloseExport, exportPreviewUrl, onUpdateProject, onOpenArchive,
}: EditorProps) => {
  const [tab, setTab] = useState<EditorTab>('COVER')
  const [showAssistant, setShowAssistant] = useState(false)
  const [previewAll, setPreviewAll] = useState(false)
  const [previewIndex, setPreviewIndex] = useState(0)
  const [coverMontageIndex, setCoverMontageIndex] = useState(0)
  const [previewFailed, setPreviewFailed] = useState(false)
  const [sceneOverlayVersion, setSceneOverlayVersion] = useState(0)
  const [translating, setTranslating] = useState(false)
  const [translationNotice, setTranslationNotice] = useState<string>()
  const [visualViewportHeight, setVisualViewportHeight] = useState<number>()
  const previewVideoRef = useRef<HTMLVideoElement>(null)
  const selected = useMemo(
    () => project.clips.find((clip) => clip.id === selectedClipId) ?? project.clips[0],
    [project.clips, selectedClipId],
  )
  useEffect(() => {
    if (!previewAll || !previewVideoRef.current) return
    const video = previewVideoRef.current
    const clip = project.clips[previewIndex]
    if (!clip) return
    const play = () => {
      video.currentTime = Math.min(clip.trimStart, Math.max(video.duration - .05, 0))
      void video.play().catch(() => undefined)
    }
    if (video.readyState >= 1) play()
    else video.addEventListener('loadedmetadata', play, { once: true })
    return () => video.removeEventListener('loadedmetadata', play)
  }, [previewAll, previewIndex, project.clips])

  useEffect(() => {
    if (tab !== 'COVER' || project.clips.length < 2) return
    const timer = window.setInterval(() => setCoverMontageIndex((index) => (index + 1) % project.clips.length), 200)
    return () => window.clearInterval(timer)
  }, [project.clips.length, tab])

  useEffect(() => {
    const viewport = window.visualViewport
    const updateHeight = () => setVisualViewportHeight(Math.round(viewport?.height ?? window.innerHeight))
    updateHeight()
    viewport?.addEventListener('resize', updateHeight)
    window.addEventListener('resize', updateHeight)
    return () => {
      viewport?.removeEventListener('resize', updateHeight)
      window.removeEventListener('resize', updateHeight)
    }
  }, [])

  if (!selected) return <main className="screen"><p>편집할 클립이 없습니다.</p></main>

  const updatePopup = (patch: Partial<DailoClip['popup']>) =>
    onUpdateClip(selected.id, { popup: { ...selected.popup, ...patch } })

  const updateActivity = (clip: DailoClip, activity: string) => {
    const presentation = activityTextProvider.present(activity)
    setTranslationNotice(undefined)
    onUpdateClip(clip.id, { activity, activityEnglish: presentation.english, activityEnglishEdited: false, activityIcon: presentation.icon })
  }

  const translateSelectedActivity = async () => {
    if (!selected.activity.trim() || translating) return
    setTranslationNotice(undefined)

    const local = activityTextProvider.present(selected.activity)
    if (local.english) {
      onUpdateClip(selected.id, { activityEnglish: local.english, activityEnglishEdited: true, activityIcon: local.icon })
      setTranslationNotice('자주 쓰는 표현으로 번역했어요.')
      return
    }

    setTranslating(true)
    const result = await activityTextProvider.translate(selected.activity)
    if (result.english) {
      onUpdateClip(selected.id, { activityEnglish: result.english, activityEnglishEdited: true, activityIcon: result.icon })
      setTranslationNotice(result.source === 'browser' ? '기기 내 번역으로 완성했어요.' : '자주 쓰는 표현으로 번역했어요.')
    } else {
      setTranslationNotice('이 기기에서는 해당 문장의 자동 번역을 지원하지 않아요. 영문을 직접 입력해 주세요.')
    }
    setTranslating(false)
  }

  const replaceMedia = async (input: HTMLInputElement) => {
    const file = input.files?.[0]
    if (!file) return
    setPreviewFailed(false)
    await onReplaceMedia(activePreviewClip.id, file)
    input.value = ''
  }

  const presentationFor = (clip: DailoClip) => {
    const automatic = activityTextProvider.present(clip.activity)
    return {
      english: clip.activityEnglishEdited ? clip.activityEnglish ?? '' : automatic.english,
      icon: automatic.icon,
    }
  }

  const selectedPresentation = presentationFor(selected)
  const previewClip = tab === 'COVER' ? project.clips[coverMontageIndex % project.clips.length] ?? project.clips[0] : selected
  const activePreviewClip = previewAll ? project.clips[previewIndex] ?? selected : previewClip
  const activePreviewMedia = resolveSessionMedia(activePreviewClip)
  const activePreviewMissing = !activePreviewMedia.mediaUrl && !activePreviewMedia.videoBlob
  const previewPresentation = presentationFor(activePreviewClip)
  const coverEnglish = activityTextProvider.present(project.coverTitle.replace(/\.EXE/gi, '')).english
  const coverTitleLength = Array.from(project.coverTitle.replace(/\s/g, '')).length || 1
  const requestedCoverSize = 42 * ((project.coverFontScale ?? 100) / 100)
  const fittedCoverSize = Math.max(10, Math.min(requestedCoverSize, requestedCoverSize * Math.min(1, 24 / coverTitleLength)))

  const advancePreview = () => {
    if (!previewAll) return
    if (previewIndex < project.clips.length - 1) {
      const next = previewIndex + 1
      setPreviewFailed(false)
      setPreviewIndex(next)
      onSelect(project.clips[next].id)
    } else setPreviewAll(false)
  }

  const startPreview = () => {
    const video = previewVideoRef.current
    if (video) void video.play().catch(() => undefined)
    setPreviewFailed(false)
    setTab('CLIP')
    setPreviewIndex(0)
    setPreviewAll(true)
    onSelect(project.clips[0].id)
  }

  return (
    <main className={`editor-screen ${tab === 'COVER' ? 'editor-screen--cover' : ''}`} style={{ '--editor-viewport-height': `${visualViewportHeight ?? window.innerHeight}px` } as CSSProperties}>
      <header className="editor-header">
        <div className="editor-title"><span className="mini-logo">D</span><div><b>{project.title}</b><small>{project.customTheme || project.mode} · {project.clips.length} CLIPS</small></div></div>
        <span className={`save-state ${saving ? 'saving' : ''}`}><i />{saving ? 'SAVING...' : 'SAVED'}</span>
        <div className="editor-header__actions">
          <button className="archive-shortcut" onClick={onOpenArchive}>내 영상</button>
          <button className="ai-button" onClick={() => setShowAssistant((value) => !value)}>✦ 편집 도움</button>
          <RetroButton onClick={() => void onExport()}>영상 만들기 <span>↗</span></RetroButton>
        </div>
      </header>

      <nav className="editor-quest-bar" aria-label="꾸미기 진행 단계">
        <span className={project.coverTitle.trim() ? 'done' : 'active'}><i>{project.coverTitle.trim() ? '✓' : '1'}</i>썸네일</span>
        <span className={project.clips.some((clip) => clip.activity) ? 'done' : ''}><i>2</i>장면 꾸미기</span>
        <span><i>3</i>영상 저장</span>
      </nav>

      <div className="editor-workspace">
        <aside className="clip-sidebar">
          <header><span>내 영상 클립</span><b>{project.clips.length}</b></header>
          <div className="clip-sidebar__list">
            {project.clips.map((clip, index) => (
              <article key={clip.id} className={`clip-sidebar-card ${clip.id === selected.id ? 'active' : ''}`}>
                <button className="clip-sidebar-card__select" onClick={() => { setPreviewAll(false); setPreviewFailed(false); onSelect(clip.id) }}>
                  <em>{String(index + 1).padStart(2, '0')}</em>
                  {clip.thumbnail ? <img src={clip.thumbnail} alt={`${clip.name} 대표 장면`} /> : <i>VIDEO</i>}
                  <span><b>{clip.displayTime}</b><small>{clip.name}</small></span>
                </button>
                <div className="clip-sidebar-card__fields">
                  <label><span>촬영 시간 · 자동</span><input aria-label={`${index + 1}번 클립 시간`} value={clip.displayTime} onChange={(event) => onUpdateClip(clip.id, { displayTime: event.target.value })} /></label>
                  <label className="clip-copy-field"><span>장면 문구</span><input aria-label={`${index + 1}번 클립 문구`} value={clip.activity} placeholder="예: 퇴근 후 카페" onChange={(event) => updateActivity(clip, event.target.value)} /><small className="auto-english">{presentationFor(clip).icon} EN · {presentationFor(clip).english}</small></label>
                </div>
              </article>
            ))}
          </div>
        </aside>

        <section className="preview-column">
          <div className="preview-label"><span>9:16 · 영상을 눌러 재생</span><button className={previewAll ? 'active' : ''} onClick={() => previewAll ? setPreviewAll(false) : startPreview()}>{previewAll ? `■ 미리보기 중 ${previewIndex + 1}/${project.clips.length}` : '▶ 전체 브이로그 미리보기'}</button></div>
          <div className="phone-preview">
            {tab === 'COVER' && !previewAll ? (activePreviewClip.thumbnail ? <img className="cover-montage-frame" src={activePreviewClip.thumbnail} alt={`${coverMontageIndex + 1}번 커버 장면`} /> : <div className="cover-montage-missing">CLIP {coverMontageIndex + 1}</div>) : !previewFailed && !activePreviewMissing && <ClipVideo ref={previewVideoRef} key={`${activePreviewClip.id}-${previewAll ? previewIndex : 'single'}`} clip={activePreviewClip} poster={activePreviewClip.thumbnail || undefined} ariaLabel={`${activePreviewClip.name} 장면 미리보기`} onReady={() => setPreviewFailed(false)} onError={() => setPreviewFailed(true)} onEnded={advancePreview} onPlay={() => setSceneOverlayVersion((version) => version + 1)} onTimeUpdate={(video) => { if (previewAll && video.currentTime >= activePreviewClip.trimEnd) advancePreview() }} />}
            {(previewFailed || activePreviewMissing) && <div className="media-recovery-panel editor-media-retry"><b>원본 영상이 필요해요</b><p>같은 파일을 다시 골라 주세요.<br />작성한 문구는 유지돼요.</p><label>원본 다시 선택<input type="file" accept="video/*" onChange={(event) => void replaceMedia(event.currentTarget)} /></label><button onClick={() => { setPreviewFailed(false); onDeleteClip(activePreviewClip.id) }}>클립 삭제</button></div>}
            <div className="video-gradient" />
            {tab !== 'COVER' && <div key={`${activePreviewClip.id}-${activePreviewClip.transition}-${sceneOverlayVersion}`} className={`preview-transition preview-transition--${transitionClassName(activePreviewClip.transition)}`} />}
            {(tab === 'COVER' || tab === 'POPUP') && <div className="reels-safe-guide"><span>REELS SAFE AREA</span></div>}
            {tab === 'COVER' ? (
              <div className="reference-cover-overlay">
                <span className="xp-cover-tag"><i>{previewPresentation.icon}</i><em>DAY_IN_LIFE.EXE</em><b>×</b></span>
                <small>{project.mode === 'N-JOB DAY' ? 'WORKING 3 JOBS A DAY' : 'RUNNING MY DAY'}</small>
                <h2 style={{ fontSize: `${fittedCoverSize}px` }}>{project.coverTitle || '오늘의 하루'}</h2>
                <p>{coverEnglish}</p>
              </div>
            ) : (
              <div className="reference-scene-overlay">
                <span key={`${activePreviewClip.id}-${sceneOverlayVersion}`} className="xp-scene-tag xp-scene-tag--brief"><i>{activePreviewClip.activityIcon || previewPresentation.icon}</i><em>CLIP_INFO.EXE</em><b>×</b></span>
                <div className="scene-overlay-copy">
                  <time>{activePreviewClip.displayTime}</time>
                  <strong>{activePreviewClip.activity || '이 장면의 문구를 입력해 주세요'}</strong>
                  <small>{previewPresentation.english}</small>
                </div>
              </div>
            )}
            {activePreviewClip.caption && tab !== 'COVER' && <p className="manual-video-caption">{activePreviewClip.caption}</p>}
            {activePreviewClip.popup.enabled && tab !== 'COVER' && (
              <RetroWindow title={activePreviewClip.popup.title} className="video-popup compact-video-popup">
                <div><span className="warning-icon">!</span><b>{activePreviewClip.popup.message}</b></div>
                <RetroButton>{activePreviewClip.popup.button}</RetroButton>
              </RetroWindow>
            )}
          </div>
          <div className="preview-meta"><span>미리보기 화질 · 가볍게</span><span>저장 화질 · 1080 × 1920</span></div>
        </section>

        <aside className="inspector">
          <header><span>CLIP_{String(project.clips.indexOf(selected) + 1).padStart(2, '0')}.MOV</span><button>×</button></header>
          <p className="mobile-tool-title">편집 도구 <small>아래 메뉴를 눌러 바로 수정하세요.</small></p>
          <nav className="tool-tabs" aria-label="편집 도구">
            {tabs.map((item) => <button key={item} className={tab === item ? 'active' : ''} onClick={() => { setPreviewFailed(false); setTab(item) }}>{tabLabels[item]}</button>)}
          </nav>

          {tab === 'COVER' && (
            <div className="inspector-panel cover-panel">
              <div className="panel-guide"><i>1</i><p><b>영상의 첫 화면을 골라요</b><br />선택한 사진 뒤에 빠른 장면들이 이어집니다.</p></div>
              <label>썸네일 제목<textarea rows={2} value={project.coverTitle} maxLength={40} placeholder={'예: 서진이의 하루\nDAY VLOG'} onChange={(event) => onUpdateProject({ coverTitle: event.target.value })} /><small className="field-help">Enter를 누르면 원하는 위치에서 줄을 바꿀 수 있어요.</small></label>
              <label>제목 글자 크기 <span>{project.coverFontScale ?? 100}%</span><input type="range" min="35" max="115" step="5" value={project.coverFontScale ?? 100} onChange={(event) => onUpdateProject({ coverFontScale: Number(event.target.value) })} /></label>
              <p className="suggestion-label">0.2초 커버 슬라이드 · 전체 장면 자동 포함</p>
              <div className="cover-montage-strip">
                {project.clips.map((clip, index) => <span key={clip.id} className={coverMontageIndex === index ? 'active' : ''}>{clip.thumbnail ? <img src={clip.thumbnail} alt={`${index + 1}번 커버 장면`} /> : <i>VIDEO</i>}<b>{index + 1}</b></span>)}
              </div>
              <div className="cover-montage-status"><i>✓</i><span><b>모든 장면이 커버에 들어가요</b><small>각 장면이 0.2초씩 순서대로 반복됩니다.</small></span></div>
            </div>
          )}

          {tab === 'CLIP' && (
            <div className="inspector-panel">
              <label>촬영 시간 <span>AUTO</span><input aria-label="선택한 클립 시간" value={selected.displayTime} onChange={(event) => onUpdateClip(selected.id, { displayTime: event.target.value })} /><small className="field-help">영상 선택 시 촬영 정보와 자동 연동돼요.</small></label>
              <label>장면 문구<input aria-label="선택한 클립 문구" value={selected.activity} placeholder="예: 다이소 출근" onChange={(event) => updateActivity(selected, event.target.value)} /></label>
              <div className="translation-preview translation-editor"><i>{selectedPresentation.icon}</i><label><small>ENGLISH · 자동 번역 또는 직접 입력</small><input aria-label="영어 자막" value={selectedPresentation.english} placeholder="영문 자막 (선택)" onChange={(event) => { setTranslationNotice(undefined); onUpdateClip(selected.id, { activityEnglish: event.target.value, activityEnglishEdited: true }) }} /></label><button disabled={!selected.activity.trim() || translating} onClick={() => void translateSelectedActivity()}>{translating ? '번역 중...' : '자동 번역'}</button>{translationNotice && <small className="translation-notice">{translationNotice}</small>}</div>
              <label className="manual-caption-field">화면 아래 자막 · 선택<textarea rows={2} value={selected.caption} placeholder="필요할 때만 추가로 적어 주세요." onChange={(event) => onUpdateClip(selected.id, { caption: event.target.value })} /></label>
              <details className="advanced-tools">
                <summary>상세 편집 열기</summary>
                <div className="field-row"><label>시작 위치<input type="number" min="0" max={selected.trimEnd} step="0.1" value={selected.trimStart} onChange={(event) => onUpdateClip(selected.id, { trimStart: Number(event.target.value) })} /></label><label>끝 위치<input type="number" min={selected.trimStart} max={selected.duration} step="0.1" value={selected.trimEnd.toFixed(1)} onChange={(event) => onUpdateClip(selected.id, { trimEnd: Number(event.target.value) })} /></label></div>
                <label>재생 속도<select value={selected.speed} onChange={(event) => onUpdateClip(selected.id, { speed: Number(event.target.value) })}>{[0.5, 0.75, 1, 1.25, 1.5, 2, 3].map((value) => <option key={value} value={value}>{value}x</option>)}</select></label>
                <label>원본 소리 <span>{selected.volume}%</span><input type="range" min="0" max="100" value={selected.volume} onChange={(event) => onUpdateClip(selected.id, { volume: Number(event.target.value) })} /></label>
                <label>오늘의 기분<div className="choice-grid">{moods.map((mood) => <button key={mood} className={selected.mood === mood ? 'active' : ''} onClick={() => onUpdateClip(selected.id, { mood })}>{mood}</button>)}</div></label>
                <label>에너지 <span>{selected.energy}%</span><input type="range" min="0" max="100" value={selected.energy} onChange={(event) => onUpdateClip(selected.id, { energy: Number(event.target.value) })} /></label>
                <button className="danger-action" onClick={() => onDeleteClip(selected.id)}>이 클립 삭제</button>
              </details>
            </div>
          )}

          {tab === 'TRANSITION' && (
            <div className="inspector-panel">
              <p className="panel-intro">다음 클립으로 넘어가는 방식을 선택하세요.</p>
              <div className="transition-list">{transitions.map((transition) => <button key={transition} className={selected.transition === transition ? 'active' : ''} onClick={() => onUpdateClip(selected.id, { transition })}><i>{transition === 'PHONE SCREEN' ? '▯' : transition === 'FLASH' ? '✦' : '↗'}</i><span><b>{transition}</b><small>{transition === 'PHONE SCREEN' ? '검정 휴대폰 화면을 감지해 연결' : '빠르고 자연스러운 장면 전환'}</small></span></button>)}</div>
            </div>
          )}

          {tab === 'POPUP' && (
            <div className="inspector-panel">
              <label className="toggle-field"><span>SHOW POPUP<small>장면 위에 레트로 메시지 표시</small></span><input type="checkbox" checked={selected.popup.enabled} onChange={(event) => updatePopup({ enabled: event.target.checked })} /></label>
              <label>TITLE<select value={selected.popup.kind} onChange={(event) => updatePopup({ kind: event.target.value as DailoClip['popup']['kind'], title: event.target.value })}><option>SYSTEM MESSAGE</option><option>WARNING</option><option>ACHIEVEMENT</option></select></label>
              <label>MESSAGE<textarea rows={4} value={selected.popup.message} onChange={(event) => updatePopup({ message: event.target.value.toUpperCase() })} /></label>
              <label>BUTTON<input value={selected.popup.button} onChange={(event) => updatePopup({ button: event.target.value.toUpperCase() })} /></label>
              <p className="suggestion-label">QUICK MESSAGE</p><div className="suggestions">{popupSuggestions.map((message) => <button key={message} onClick={() => updatePopup({ enabled: true, message })}>{message}</button>)}</div>
            </div>
          )}
        </aside>
      </div>

      <section className="timeline-area">
        <header><span>TIMELINE · {formatDuration(project.clips.reduce((sum, clip) => sum + Math.max(clip.trimEnd - clip.trimStart, 0), 0))}</span><span>− &nbsp; ◉ &nbsp; +</span></header>
        <div className="timeline-track">
          {project.clips.map((clip, index) => (
            <button key={clip.id} onClick={() => onSelect(clip.id)} className={clip.id === selected.id ? 'active' : ''} style={{ flexGrow: Math.max(clip.trimEnd - clip.trimStart, 1) }}>
              {clip.thumbnail && <img src={clip.thumbnail} alt="" />}
              <span>{String(index + 1).padStart(2, '0')} · {clip.activity}</span>
              {clip.voice && <i className="voice-dot">VOICE</i>}
            </button>
          ))}
        </div>
      </section>

      {showAssistant && (
        <RetroWindow title="AI_EDIT_ASSISTANT.EXE" className="assistant-window" tools={<button onClick={() => setShowAssistant(false)}>×</button>}>
            <p><b>이 장면을 어떻게 편집할까요?</b><br />장면 길이와 전환만 도와드려요. 내가 쓴 문구는 바꾸지 않아요.</p>
          <button onClick={() => { onUpdateClip(selected.id, { transition: 'FLASH' }); setShowAssistant(false) }}>첫 장면을 더 빠르게</button>
          <button onClick={() => { updatePopup({ enabled: true, message: 'ENERGY LEVEL: 4%' }); setShowAssistant(false) }}>상황에 맞는 팝업</button>
          <button onClick={() => { onUpdateClip(selected.id, { trimEnd: Math.min(selected.trimStart + 2.5, selected.duration) }); setShowAssistant(false) }}>이 장면을 더 짧게</button>
        </RetroWindow>
      )}

      {(exportState || exportError) && (
        <div className="modal-backdrop" role="status" aria-live="polite">
          <RetroWindow title={exportError ? 'SYSTEM ERROR' : 'EXPORT_DAY.EXE'} className="render-dialog">
            <span className="render-symbol">{exportError ? '!' : '▣'}</span>
            <h2>{exportError ? '영상 만들기에 실패했어요' : exportReady ? '오늘의 영상이 완성됐어요' : '영상을 만들고 있어요'}</h2>
            <p>{exportError ?? exportState?.task}</p>
            {!exportError && <ProgressBar value={exportState?.percent ?? 0} />}
            {!exportError && <small>{exportState?.percent ?? 0}% · 브라우저를 닫지 마세요.</small>}
            {exportReady && exportPreviewUrl && <video className="export-result-preview" src={exportPreviewUrl} controls playsInline preload="metadata" />}
            {exportReady && <div className="export-save-actions"><RetroButton className="save-export-button" onClick={() => void onSaveExport()}>DAILO 폴더 저장</RetroButton><RetroButton className="share-export-button" onClick={() => void onShareExport()}>갤러리로 보내기</RetroButton></div>}
            {exportReady && <p className="save-help">폴더 선택이 열리면 저장 위치를 고르세요. 그 안에 DAILO 폴더가 생겨요.<br />인앱 브라우저·iPhone은 ‘갤러리로 보내기’에서 비디오 저장을 선택해 주세요.</p>}
            {(exportError || exportReady) && <button className="plain-close" onClick={onCloseExport}>닫기</button>}
          </RetroWindow>
        </div>
      )}
    </main>
  )
}
