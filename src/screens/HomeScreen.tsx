import { RetroButton, RetroWindow } from '../components/Retro'
import type { ProjectSummary } from '../types'

interface HomeProps {
  projects: ProjectSummary[]
  onCreate: () => void
  onOpenProject: (id: string) => void
}

const DayLauncherArt = () => (
  <div className="day-launcher-art" aria-hidden="true">
    <div className="launcher-sky"><i /><i /><i /></div>
    <div className="launcher-person"><span /><b /></div>
    <div className="launcher-files"><span>☕<small>COFFEE</small></span><span>▣<small>WORK</small></span><span>★<small>MY TIME</small></span></div>
    <div className="launcher-taskbar"><b>시작</b><span>오늘 하루.EXE</span><time>READY</time></div>
  </div>
)

export const HomeScreen = ({ projects, onCreate, onOpenProject }: HomeProps) => {
  const recent = projects[0]
  return (
    <main className="screen simple-home">
      <section className="simple-hero">
        <div className="hero-copy">
          <p className="eyebrow">DAY IN LIFE.EXE</p>
          <h1>오늘을 찍고,<br /><em>내 목소리로 남겨요.</em></h1>
          <p className="hero-kicker">어려운 편집은 필요 없어요.<br />한 단계씩 따라오면 영상이 완성돼요.</p>
          <RetroButton className="primary-cta" onClick={onCreate}>영상 만들기 시작 <span>→</span></RetroButton>
          <ol className="home-mini-steps"><li><i>1</i>테마</li><li><i>2</i>영상</li><li><i>3</i>꾸미기</li><li><i>4</i>저장</li></ol>
          <button className="mobile-continue-day" disabled={!recent} onClick={() => recent && onOpenProject(recent.id)}>
            <i>▣</i><span><b>지난 영상 이어서</b><small>{recent ? `${recent.title} · ${recent.clipCount}개 클립` : '아직 이어서 만들 영상이 없어요'}</small></span><em>→</em>
          </button>
        </div>

        <div className="simple-hero-window">
          <RetroWindow title="내 하루 시작하기.EXE" className="hero-window">
            <DayLauncherArt />
            <div className="launcher-ready"><span><i /> SYSTEM READY</span><small>위의 ‘영상 만들기 시작’을 눌러 주세요.</small></div>
          </RetroWindow>
        </div>
      </section>

      {recent && (
        <section className="continue-day">
          <div><span>CONTINUE</span><b>지난 영상 이어서</b><small>{new Date(recent.updatedAt).toLocaleDateString('ko-KR')} · {recent.clipCount}개 클립</small></div>
          <RetroButton onClick={() => onOpenProject(recent.id)}>이어 만들기</RetroButton>
        </section>
      )}
    </main>
  )
}
