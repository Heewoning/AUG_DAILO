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
          <p className="eyebrow">RETRO DAY IN LIFE · AI VLOG APP</p>
          <h1>RUN<br />YOUR <em>DAY.</em></h1>
          <p className="hero-kicker">내가 찍고, 내가 말하고,<br /><strong>AI가 편집하는 나의 하루.</strong></p>
          <RetroButton className="primary-cta" onClick={onCreate}>CREATE VLOG <span>→</span></RetroButton>
          <small>NO EDITING SKILLS NEEDED · AUTO SAVE ON</small>
        </div>

        <div className="hero-stage">
          <div className="orbit-label orbit-label--one">OFFICE.EXE</div>
          <div className="orbit-label orbit-label--two">SIDEJOB.EXE</div>
          <RetroWindow title="DAY_IN_LIFE.EXE" className="hero-window">
            <EmptyMedia />
            <p className="ready-label">SYSTEM STATUS: <b>READY</b></p>
            <RetroButton onClick={onCreate}>START MY DAY</RetroButton>
          </RetroWindow>
          <div className="hero-popup">
            <StatusDialog title="SYSTEM MESSAGE" message="Would you like to run your day?">
              <RetroButton onClick={onCreate}>YES</RetroButton><RetroButton>CANCEL</RetroButton>
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
            <li><i>1</i><span><b>SHOOT</b><small>오늘의 짧은 순간을 찍어요</small></span></li>
            <li><i>2</i><span><b>SPEAK</b><small>내 목소리로 이야기를 남겨요</small></span></li>
            <li><i>3</i><span><b>AI EDIT</b><small>자막과 흐름을 자동으로 맞춰요</small></span></li>
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
