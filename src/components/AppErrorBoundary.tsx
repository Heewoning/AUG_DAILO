import { Component, type ErrorInfo, type PropsWithChildren } from 'react'

interface State {
  failed: boolean
}

export class AppErrorBoundary extends Component<PropsWithChildren, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('DAILO 화면 오류', error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="app-error-screen">
        <section>
          <header>SYSTEM MESSAGE <b>×</b></header>
          <div><span>!</span><h1>화면을 다시 불러올게요.</h1><p>영상과 작성한 내용은 안전하게 저장되어 있어요.</p><button onClick={() => window.location.reload()}>다시 열기</button></div>
        </section>
      </main>
    )
  }
}

