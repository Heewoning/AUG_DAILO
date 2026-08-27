import { ProgressBar, RetroWindow } from '../components/Retro'
import type { ProjectSummary } from '../types'

export const ProfileScreen = ({ projects, recordedSeconds }: { projects: ProjectSummary[]; recordedSeconds: number }) => {
  const clipCount = projects.reduce((sum, project) => sum + project.clipCount, 0)
  const favoriteMode = projects.reduce<Record<string, number>>((counts, project) => {
    counts[project.mode] = (counts[project.mode] ?? 0) + 1
    return counts
  }, {})
  const topMode = Object.entries(favoriteMode).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'DAY IN LIFE'

  return (
    <main className="screen profile-screen">
      <header className="page-heading"><div><p className="eyebrow">USER PROFILE · MONTHLY LOG</p><h1>바쁘게 보낸 하루를<br /><em>경쟁 없이 돌아봐요.</em></h1></div></header>
      <section className="profile-grid">
        <RetroWindow title="MY_PROFILE.EXE" className="profile-card">
          <div className="avatar-disk"><span>☺</span></div><h2>DAILO USER</h2><p>EVERYDAY LIFE IS WORTH RECORDING.</p><span className="system-ready"><i /> LOCAL DATA ONLY</span>
        </RetroWindow>
        <div className="profile-stats">
          <article><span>01</span><b>{projects.length}</b><small>TOTAL DAYS</small><p>기록한 하루</p></article>
          <article><span>02</span><b>{clipCount}</b><small>TOTAL CLIPS</small><p>담아둔 순간</p></article>
          <article><span>03</span><b>{Math.round(recordedSeconds / 60)}</b><small>MINUTES</small><p>영상 기록 시간</p></article>
        </div>
        <RetroWindow title="MONTHLY_STATUS.LOG" className="monthly-log">
          <div><span>MOST USED MODE</span><b>{topMode}.EXE</b></div>
          <div><span>MEMORY</span><b>{projects.length ? 'KEEP GOING!' : 'READY TO START'}</b></div>
          <label>THIS MONTH'S LOG <em>{Math.min(projects.length * 12, 100)}%</em><ProgressBar value={Math.min(projects.length * 12, 100)} /></label>
          <p>이 숫자는 생산성 점수가 아니라, 당신이 지나온 시간을 천천히 돌아보기 위한 기록이에요.</p>
        </RetroWindow>
      </section>
    </main>
  )
}
