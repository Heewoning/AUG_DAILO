import { EmptyMedia, RetroButton, RetroWindow } from '../components/Retro'
import type { ProjectSummary } from '../types'

export const ArchiveScreen = ({
  projects, onOpen, onCreate,
}: { projects: ProjectSummary[]; onOpen: (id: string) => void; onCreate: () => void }) => (
  <main className="screen archive-screen">
    <header className="page-heading archive-heading">
      <div><p className="eyebrow">MY LIFE · FILE EXPLORER</p><h1>지나간 하루도<br /><em>다시 실행할 수 있어요.</em></h1></div>
      <RetroButton onClick={onCreate}>+ NEW DAY</RetroButton>
    </header>
    <RetroWindow title="MY_LIFE / 2026" className="archive-window">
      <div className="explorer-toolbar"><button>←</button><button>→</button><button>↑</button><label>ADDRESS <span>MY LIFE / 2026 / DAYS</span></label><button>⌕</button></div>
      <div className="explorer-body">
        <aside><b>MY LIFE</b><span>▾ 2026</span><span className="active">▣ DAYS</span><span>▣ WORK</span><span>▣ SIDE JOB</span><span>▣ FITNESS</span><span>▣ MEMORIES</span></aside>
        <section>
          <div className="archive-section-title"><b>SAVED DAYS</b><span>{projects.length} FILES</span></div>
          {projects.length ? (
            <div className="archive-grid">
              {projects.map((project) => (
                <button key={project.id} onClick={() => onOpen(project.id)}>
                  <div className="archive-thumb">{project.thumbnail ? <img src={project.thumbnail} alt="" /> : <EmptyMedia compact />}<span>{project.status}</span></div>
                  <b>{project.title}</b><small>{new Date(project.updatedAt).toLocaleDateString('ko-KR')} · {project.clipCount} CLIPS</small><em>{project.mode}</em>
                </button>
              ))}
            </div>
          ) : (
            <div className="archive-empty"><span className="folder-glyph">▰</span><h2>NO FILES FOUND.</h2><p>저장된 하루가 아직 없어요.<br />첫 번째 DAY IN LIFE를 만들어 보세요.</p><RetroButton onClick={onCreate}>CREATE MY FIRST DAY</RetroButton></div>
          )}
        </section>
      </div>
      <footer>{projects.length} OBJECT(S) · LOCAL DEVICE STORAGE</footer>
    </RetroWindow>
  </main>
)
