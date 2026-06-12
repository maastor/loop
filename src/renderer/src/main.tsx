import './theme.css'
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { useStore, subscribeToDataChanges, subscribeToUpdateStatus } from './store'

// Last-resort visibility for otherwise-silent failures in the renderer.
window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason)
})
window.addEventListener('error', (e) => {
  console.error('Uncaught error:', e.error ?? e.message)
})

function Root(): React.JSX.Element {
  const loaded = useStore((s) => s.loaded)
  const loadError = useStore((s) => s.loadError)
  React.useEffect(() => {
    void useStore.getState().load()
    const unsub = subscribeToDataChanges()
    const unsubUpdate = subscribeToUpdateStatus()
    return () => {
      unsub()
      unsubUpdate()
    }
  }, [])
  if (!loaded) {
    return <div style={{ padding: 40, color: 'var(--text-3)' }}>Loading…</div>
  }
  if (loadError) {
    return (
      <div style={{ padding: 40, color: 'var(--red)', fontFamily: 'var(--mono)' }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Couldn&apos;t load Loop</div>
        <div style={{ color: 'var(--text-3)', fontSize: 12 }}>{loadError}</div>
        <button
          type="button"
          className="btn btn-sm"
          style={{ marginTop: 14 }}
          onClick={() => void useStore.getState().load()}
        >
          Retry
        </button>
      </div>
    )
  }
  return <App />
}

const rootEl = document.getElementById('root')
if (!rootEl) {
  throw new Error('Root element not found')
}
createRoot(rootEl).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
