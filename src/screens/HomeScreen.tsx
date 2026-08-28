import { useEffect, useState } from 'react'
import { EmptyMedia, ProgressBar, RetroButton, RetroWindow, StatusDialog } from '../components/Retro'
import type { ProjectSummary } from '../types'

interface HomeProps {
  projects: ProjectSummary[]
  onCreate: () => void
  onOpenProject: (id: string) => void
}

export const HomeScreen = ({ projects, onCreate, onOpenProject }: HomeProps) => {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])
  const recent = projects[0]

  return (
    <main className="screen home-screen">
      <div className="home-topline">
        <div><span>LOCAL TIME</span><strong>{now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</strong></div>
        <div><span>TODAY</span><strong>{now.toLocaleDateString('en-CA').replaceAll('-', '.')}</strong></div>
        <span className="system-ready"><i /> SYSTEM READY</span>
      </div>

      <section className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">DAY IN LIFE.EXE</p>
          <h1>오늘 하루를<br /><em>영상으로 남겨요.</em></h1>
          <p className="hero-kicker">내가 찍고, 내가 말하면<br /><strong>DAILO가 보기 좋게 정리해요.</strong></p>
          <RetroButton className="primary-cta" onClick={onCreate}>영상 고르기 <span>→</span></RetroButton>
          <small>영상 선택 → 한 줄 설명 → 저장</small>
        </div>

        <div className="hero-stage">
          <RetroWindow title="내 하루 시작하기.EXE" className="hero-window">
            <EmptyMedia />
            <p className="ready-label">SYSTEM STATUS: <b>준비 완료</b></p>
            <RetroButton onClick={onCreate}>오늘 기록 시작</RetroButton>
          </RetroWindow>
          <div className="hero-popup">
            <StatusDialog title="SYSTEM MESSAGE" message="오늘의 영상을 만들어볼까요?">
              <RetroButton onClick={onCreate}>시작</RetroButton><RetroButton>다음에</RetroButton>
            </StatusDialog>
          </div>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="section-card today-card">
          <div className="section-heading"><div><span>01</span><h2>TODAY'S FILE</h2></div><button aria-label="더보기">•••</button></div>
          {recent ? (
            <button className="recent-project" onClick={() => onOpenProject(recent.id)}>
              {recent.thumbnail ? <img src={recent.thumbnail} alt="최근 프로젝트 썸네일" /> : <EmptyMedia compact />}
              <span><b>{recent.title}</b><small>{recent.mode} · {recent.clipCount} CLIPS</small><em>{new Date(recent.updatedAt).toLocaleDateString('ko-KR')}</em></span>
              <i>→</i>
            </button>
          ) : (
            <button className="empty-project" onClick={onCreate}><b>NO FILES FOUND.</b><span>첫 번째 하루를 실행해 보세요.</span><i>+ CREATE</i></button>
          )}
        </article>

        <article className="section-card process-card">
          <div className="section-heading"><div><span>02</span><h2>HOW IT WORKS</h2></div></div>
          <ol className="process-list">
            <li><i>1</i><span><b>영상 고르기</b><small>오늘 찍은 순간을 골라요</small></span></li>
            <li><i>2</i><span><b>내 목소리</b><small>장면 이야기를 직접 말해요</small></span></li>
            <li><i>3</i><span><b>자동 정리</b><small>자막과 흐름을 자연스럽게 맞춰요</small></span></li>
          </ol>
        </article>

        <article className="section-card status-card">
          <div className="section-heading"><div><span>03</span><h2>THIS MONTH</h2></div></div>
          <div className="stat-row"><span><b>{projects.length}</b><small>DAYS SAVED</small></span><span><b>{projects.reduce((sum, item) => sum + item.clipCount, 0)}</b><small>CLIPS</small></span></div>
          <p>MEMORY SPACE</p><ProgressBar value={Math.min(projects.length * 7 + 12, 92)} />
        </article>
      </section>
    </main>
  )
}
