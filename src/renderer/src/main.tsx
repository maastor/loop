import './theme.css'
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { useStore, subscribeToDataChanges } from './store'

function Root(): React.JSX.Element {
  const loaded = useStore((s) => s.loaded)
  React.useEffect(() => {
    void useStore.getState().load()
    const unsub = subscribeToDataChanges()
    return unsub
  }, [])
  if (!loaded) {
    return <div style={{ padding: 40, color: 'var(--text-3)' }}>Loading…</div>
  }
  return <App />
}

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Root element not found')
createRoot(rootEl).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
