import { Component, type ReactNode } from 'react'

export class Boundary extends Component<{ children: ReactNode; resetKey: string }, { err: Error | null }> {
  state = { err: null as Error | null }

  static getDerivedStateFromError(err: Error) {
    return { err }
  }

  componentDidCatch(err: Error) {
    const stale = /dynamically imported module|Importing a module script failed|Failed to fetch/i.test(err.message)
    if (stale && !sessionStorage.getItem('dm:reloaded')) {
      sessionStorage.setItem('dm:reloaded', '1')
      window.location.reload()
    }
  }

  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.err) this.setState({ err: null })
  }

  render() {
    if (!this.state.err) return this.props.children
    return (
      <div className="page narrow">
        <h1>Something broke on this page</h1>
        <p>The rest of the site still works. Reloading usually fixes it.</p>
        <button type="button" className="btn primary" onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    )
  }
}
