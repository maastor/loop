// renderer/src/screens/Editor.tsx — STUB (Phase A). Worker unit 3 implements the create/edit
// routine sheet: name, ❯ prompt, NL + structured schedule, working dir, model, validation.
// Port from project/app/screens-editor.jsx (EditorSheet).
import React from 'react'
import { useStore } from '../store'
import { Btn, Icon } from '../components'
import { uid } from '@shared/schedule'
import type { Routine } from '@shared/types'

export function Editor({
  routine,
  onClose
}: {
  routine: Routine | null
  onClose: () => void
}): React.JSX.Element {
  const createRoutine = useStore((s) => s.createRoutine)
  const updateRoutine = useStore((s) => s.updateRoutine)
  const isNew = !routine
  const [name, setName] = React.useState(routine ? routine.name : '')

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const save = async (): Promise<void> => {
    if (!name.trim()) return
    if (routine) {
      await updateRoutine({ ...routine, name: name.trim() })
    } else {
      await createRoutine({
        name: name.trim(),
        prompt: 'Describe what Claude Code should do.',
        dir: '~/',
        model: 'sonnet',
        schedule: { freq: 'daily', time: '09:00', days: [], everyHours: 0 }
      })
    }
    onClose()
  }

  return (
    <div
      className="sheet-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="sheet" data-screen-label="Routine editor">
        <div className="sheet-head">
          <div className="sheet-title">{isNew ? 'New routine' : 'Edit routine'}</div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="x" size={15} />
          </button>
        </div>
        <div className="sheet-body">
          <label className="field">
            <span className="field-label mono">name</span>
            <input
              className="input"
              value={name}
              placeholder="Morning issue triage"
              autoFocus
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <div className="stub-note">Editor (unit 3) — full schedule/prompt/dir/model fields. id seed: {uid()}</div>
        </div>
        <div className="sheet-foot">
          <Btn ghost onClick={onClose}>
            Cancel
          </Btn>
          <Btn primary disabled={!name.trim()} onClick={() => void save()}>
            {isNew ? 'Create routine' : 'Save changes'}
          </Btn>
        </div>
      </div>
    </div>
  )
}
