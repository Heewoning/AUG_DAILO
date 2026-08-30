import { EmptyMedia, RetroButton, RetroWindow } from '../components/Retro'
import type { DailoProject, ProjectSummary } from '../types'

interface ArchiveProps {
  projects: ProjectSummary[]
  selectedProject?: DailoProject
  onOpen: (id: string) => void
  onClose: () => void
  onCreate: () => void
}

export const ArchiveScreen = ({ projects, selectedProject, onOpen, onClose, onCreate }: ArchiveProps) => {
  const savedVlogs = projects.filter((project) => project.status === 'EXPORTED')
  return (
    <main className="screen archive-screen simple-archive">
      <header className="page-heading archive-heading">
        <div><p className="eyebrow">MY VLOG ARCHIVE</p><h1>완성한 하루를<br /><em>다시 꺼내 봐요.</em></h1></div>
        <RetroButton onClick={onCreate}>+ 새 영상</RetroButton>
      </header>
      <RetroWindow title="내 브이로그 / 2026" className="archive-window">
        <div className="archive-section-title"><b>완성한 브이로그</b><span>{savedVlogs.length}개</span></div>
        {savedVlogs.length ? (
          <div className="archive-grid vlog-grid">
            {savedVlogs.map((project) => (
              <button key={project.id} onClick={() => onOpen(project.id)}>
                <div className="archive-thumb">{project.thumbnail ? <img src={project.thumbnail} alt="" /> : <EmptyMedia compact />}<span>▶ PLAY</span></div>
                <b>{project.title}</b><small>{new Date(project.updatedAt).toLocaleDateString('ko-KR')} · {project.clipCount}개 장면</small><em>{project.mode}</em>
              </button>
            ))}
          </div>
        ) : (
          <div className="archive-empty"><span className="folder-glyph">▰</span><h2>아직 완성한 영상이 없어요.</h2><p>영상을 만들고 ‘영상 저장하기’까지 완료하면<br />이곳에 브이로그가 기록됩니다.</p><RetroButton onClick={onCreate}>첫 브이로그 만들기</RetroButton></div>
        )}
      </RetroWindow>

      {selectedProject && (
        <div className="modal-backdrop archive-player-backdrop">
          <RetroWindow title={selectedProject.exportAsset?.fileName ?? 'MY_VLOG.EXE'} className="archive-player" tools={<button onClick={onClose}>×</button>}>
            {selectedProject.exportAsset?.url ? (
              <video src={selectedProject.exportAsset.url} controls playsInline autoPlay />
            ) : (
              <div className="legacy-vlog"><b>이전 버전에서 만든 기록이에요.</b><p>완성 영상 파일이 없어 재생할 수 없지만 원본 프로젝트는 안전하게 보관되어 있어요.</p></div>
            )}
            <footer><div><b>{selectedProject.coverTitle || selectedProject.title}</b><small>{new Date(selectedProject.updatedAt).toLocaleDateString('ko-KR')} · {selectedProject.clips.length}개 장면</small></div><RetroButton onClick={onClose}>닫기</RetroButton></footer>
          </RetroWindow>
        </div>
      )}
    </main>
  )
}
