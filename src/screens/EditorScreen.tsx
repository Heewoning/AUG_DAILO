import { useCallback, useMemo, useState } from 'react'
import { moods, popupSuggestions } from '../data'
import { useVoiceRecorder } from '../hooks/useVoiceRecorder'
import { formatDuration } from '../services/mediaMetadata'
import { ProgressBar, RetroButton, RetroWindow } from '../components/Retro'
import type { DailoClip, DailoProject, EditorTab, Transition, VoiceTrack } from '../types'

interface EditorProps {
  project: DailoProject
  selectedClipId?: string
  saving: boolean
  onSelect: (clipId: string) => void
  onUpdateClip: (clipId: string, patch: Partial<DailoClip>) => void
  onDeleteClip: (clipId: string) => void
  onExport: () => Promise<void>
  exportState?: { percent: number; task: string }
  exportError?: string
  exportReady: boolean
  onSaveExport: () => Promise<void>
  onCloseExport: () => void
}

const tabs: EditorTab[] = ['CLIP', 'TEXT', 'VOICE', 'TRANSITION', 'POPUP']
const tabLabels: Record<EditorTab, string> = {
  CLIP: '기본', TEXT: '자막', VOICE: '내 목소리', TRANSITION: '전환', POPUP: '말풍선',
}
const transitions: Transition[] = ['AUTO', 'HARD CUT', 'FLASH', 'BLACK SCREEN', 'PHONE SCREEN', 'WINDOW POP-UP']

export const EditorScreen = ({
  project, selectedClipId, saving, onSelect, onUpdateClip, onDeleteClip, onExport, exportState, exportError,
  exportReady, onSaveExport, onCloseExport,
}: EditorProps) => {
  const [tab, setTab] = useState<EditorTab>('CLIP')
  const [showAssistant, setShowAssistant] = useState(false)
  const selected = useMemo(
    () => project.clips.find((clip) => clip.id === selectedClipId) ?? project.clips[0],
    [project.clips, selectedClipId],
  )
  const finishVoice = useCallback((voice: VoiceTrack) => {
    if (!selected) return
    onUpdateClip(selected.id, { voice, caption: voice.transcript || selected.caption })
  }, [onUpdateClip, selected])
  const recorder = useVoiceRecorder(finishVoice)

  if (!selected) return <main className="screen"><p>편집할 클립이 없습니다.</p></main>

  const updatePopup = (patch: Partial<DailoClip['popup']>) =>
    onUpdateClip(selected.id, { popup: { ...selected.popup, ...patch } })

  return (
    <main className="editor-screen">
      <header className="editor-header">
        <div className="editor-title"><span className="mini-logo">D</span><div><b>{project.title}</b><small>{project.mode} · {project.clips.length} CLIPS</small></div></div>
        <span className={`save-state ${saving ? 'saving' : ''}`}><i />{saving ? 'SAVING...' : 'SAVED'}</span>
        <div className="editor-header__actions">
          <button className="ai-button" onClick={() => setShowAssistant((value) => !value)}>✦ 편집 도움</button>
          <RetroButton onClick={() => void onExport()}>영상 만들기 <span>↗</span></RetroButton>
        </div>
      </header>

      <div className="editor-workspace">
        <aside className="clip-sidebar">
          <header><span>내 영상 클립</span><b>{project.clips.length}</b></header>
          <div className="clip-sidebar__list">
            {project.clips.map((clip, index) => (
              <article key={clip.id} className={`clip-sidebar-card ${clip.id === selected.id ? 'active' : ''}`}>
                <button className="clip-sidebar-card__select" onClick={() => onSelect(clip.id)}>
                  <em>{String(index + 1).padStart(2, '0')}</em>
                  {clip.thumbnail ? <img src={clip.thumbnail} alt={`${clip.name} 대표 장면`} /> : <i>VIDEO</i>}
                  <span><b>{clip.displayTime}</b><small>{clip.name}</small></span>
                </button>
                <div className="clip-sidebar-card__fields">
                  <label><span>시간</span><input aria-label={`${index + 1}번 클립 시간`} value={clip.displayTime} onChange={(event) => onUpdateClip(clip.id, { displayTime: event.target.value })} /></label>
                  <label className="clip-copy-field"><span>장면 문구</span><input aria-label={`${index + 1}번 클립 문구`} value={clip.activity} placeholder="예: 퇴근 후 카페" onChange={(event) => onUpdateClip(clip.id, { activity: event.target.value })} /></label>
                  <button className="clip-record-shortcut" onClick={() => { onSelect(clip.id); setTab('VOICE') }}>● 설명 녹음</button>
                </div>
              </article>
            ))}
          </div>
        </aside>

        <section className="preview-column">
          <div className="preview-label"><span>LIVE PREVIEW · 9:16</span><span>{formatDuration(selected.duration)}</span></div>
          <div className="phone-preview">
            <video key={selected.id} src={selected.mediaUrl} controls playsInline preload="metadata" />
            <div className="video-gradient" />
            <div className="clip-speech-preview">
              <header>◷ {selected.displayTime}</header>
              <div><b>{selected.activity || '이 장면의 문구를 입력해 주세요'}</b>{(selected.caption || selected.voice?.transcript) && <p>{selected.caption || selected.voice?.transcript}</p>}</div>
            </div>
            {selected.popup.enabled && (
              <RetroWindow title={selected.popup.title} className="video-popup">
                <div><span className="warning-icon">!</span><b>{selected.popup.message}</b></div>
                <RetroButton>{selected.popup.button}</RetroButton>
              </RetroWindow>
            )}
          </div>
          <div className="preview-meta"><span>PREVIEW QUALITY · PROXY</span><span>1080 × 1920 EXPORT</span></div>
        </section>

        <aside className="inspector">
          <header><span>CLIP_{String(project.clips.indexOf(selected) + 1).padStart(2, '0')}.MOV</span><button>×</button></header>
          <nav className="tool-tabs" aria-label="편집 도구">
            {tabs.map((item) => <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{tabLabels[item]}</button>)}
          </nav>

          {tab === 'CLIP' && (
            <div className="inspector-panel">
              <label>시간<input value={selected.displayTime} onChange={(event) => onUpdateClip(selected.id, { displayTime: event.target.value })} /></label>
              <label>장면 문구<input value={selected.activity} onChange={(event) => onUpdateClip(selected.id, { activity: event.target.value })} /></label>
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

          {tab === 'TEXT' && (
            <div className="inspector-panel">
              <label>자막<textarea rows={5} value={selected.caption} placeholder="내 목소리에서 만든 자막이 여기에 표시돼요." onChange={(event) => onUpdateClip(selected.id, { caption: event.target.value })} /></label>
              <div className="info-box"><i>i</i><p><b>VOICE → CAPTION</b><br />VOICE 탭에서 녹음하면 지원 브라우저에서 음성을 인식해 자막으로 자동 입력합니다.</p></div>
              <label>자막 스타일<select><option>레트로 자막</option><option>심플</option><option>타자기</option><option>에디토리얼</option></select></label>
            </div>
          )}

          {tab === 'VOICE' && (
            <div className="inspector-panel voice-panel">
              <div className="user-voice-only"><span>●</span><div><b>내 목소리만 사용해요</b><small>USER VOICE ONLY</small></div></div>
              {recorder.recording ? (
                <div className="recording-card"><span>RECORDING...</span><b>{recorder.seconds.toFixed(1)}s</b><div className="waveform">{Array.from({ length: 28 }, (_, index) => <i key={index} />)}</div><p>{recorder.transcript || '말씀해 주세요. 내 목소리를 듣고 있어요.'}</p><RetroButton onClick={recorder.stop}>■ STOP & SAVE</RetroButton></div>
              ) : (
                <button className="record-button" onClick={() => void recorder.start()}><span>●</span><b>내 목소리 녹음하기</b><small>RECORD VOICE MEMO</small></button>
              )}
              {!recorder.transcriptionAvailable && <p className="support-note">이 브라우저는 실시간 음성 인식을 지원하지 않습니다. 녹음은 저장되며 자막은 직접 입력할 수 있어요.</p>}
              {selected.voice && (
                <div className="saved-voice">
                  <div><b>MY_VOICE_{Math.round(selected.voice.duration)}S</b><small>{selected.voice.transcript || '자막 없음'}</small></div>
                  {selected.voice.url && <audio src={selected.voice.url} controls />}
                  <label>VOICE VOLUME <span>{selected.voice.volume}%</span><input type="range" min="0" max="100" value={selected.voice.volume} onChange={(event) => onUpdateClip(selected.id, { voice: { ...selected.voice!, volume: Number(event.target.value) } })} /></label>
                  <button onClick={() => onUpdateClip(selected.id, { voice: undefined })}>녹음 삭제</button>
                </div>
              )}
              <ol className="voice-flow"><li><i>1</i>내가 말하기</li><li><i>2</i>AI 음성 인식</li><li><i>3</i>자막 + 영상 싱크</li></ol>
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
          <p><b>이 장면을 어떻게 편집할까요?</b><br />AI는 내 목소리를 만들지 않고, 영상의 흐름과 자막 싱크만 도와줘요.</p>
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
            {exportReady && <RetroButton className="save-export-button" onClick={() => void onSaveExport()}>영상 저장하기</RetroButton>}
            {(exportError || exportReady) && <button className="plain-close" onClick={onCloseExport}>닫기</button>}
          </RetroWindow>
        </div>
      )}
    </main>
  )
}
