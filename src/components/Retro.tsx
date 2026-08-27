import type { ButtonHTMLAttributes, PropsWithChildren, ReactNode } from 'react'
import type { AppView } from '../types'

export const LogoMark = () => (
  <span className="logo-mark" aria-hidden="true">
    <span />
    <i />
  </span>
)

interface RetroWindowProps extends PropsWithChildren {
  title: string
  className?: string
  tools?: ReactNode
  tone?: 'blue' | 'brown' | 'yellow'
}

export const RetroWindow = ({ title, className = '', tools, tone = 'blue', children }: RetroWindowProps) => (
  <section className={`retro-window retro-window--${tone} ${className}`}>
    <header className="retro-titlebar">
      <span className="retro-titlebar__title"><LogoMark />{title}</span>
      <span className="retro-titlebar__tools">{tools ?? <><i>_</i><i>□</i><i className="close">×</i></>}</span>
    </header>
    <div className="retro-window__body">{children}</div>
  </section>
)

export const RetroButton = ({ className = '', children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button className={`retro-button ${className}`} {...props}>{children}</button>
)

export const ProgressBar = ({ value }: { value: number }) => (
  <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
    <span style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }} />
  </div>
)

const navItems: Array<{ view: AppView; icon: string; label: string }> = [
  { view: 'home', icon: '⌂', label: 'HOME' },
  { view: 'create', icon: '+', label: 'CREATE' },
  { view: 'archive', icon: '▣', label: 'ARCHIVE' },
  { view: 'profile', icon: '○', label: 'PROFILE' },
]

export const BottomNav = ({ current, onChange }: { current: AppView; onChange: (view: AppView) => void }) => (
  <nav className="bottom-nav" aria-label="주요 메뉴">
    {navItems.map((item) => (
      <button
        key={item.view}
        className={current === item.view ? 'active' : ''}
        onClick={() => onChange(item.view)}
        aria-current={current === item.view ? 'page' : undefined}
      >
        <span aria-hidden="true">{item.icon}</span>
        {item.label}
      </button>
    ))}
  </nav>
)

export const EmptyMedia = ({ compact = false }: { compact?: boolean }) => (
  <div className={`empty-media ${compact ? 'empty-media--compact' : ''}`} aria-hidden="true">
    <span className="empty-media__sun" />
    <span className="empty-media__desk" />
    <span className="empty-media__cup" />
  </div>
)

export const StatusDialog = ({
  icon = '!', title, message, children,
}: PropsWithChildren<{ icon?: string; title: string; message: string }>) => (
  <RetroWindow title={title} className="status-dialog">
    <div className="status-dialog__content">
      <span className="warning-icon" aria-hidden="true">{icon}</span>
      <p>{message}</p>
    </div>
    {children && <div className="status-dialog__actions">{children}</div>}
  </RetroWindow>
)
