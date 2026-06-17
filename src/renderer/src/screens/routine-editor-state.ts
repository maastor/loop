import React from 'react'
import { useStore } from '../store'
import { parseNL, scheduleToNL, computeNextRun, MODELS } from '@shared/schedule'
import type { AgentId, Routine, Schedule, ModelId, PermissionMode } from '@shared/types'

export const EDITOR_DAYS: { v: number; l: string }[] = [
  { v: 1, l: 'Mon' },
  { v: 2, l: 'Tue' },
  { v: 3, l: 'Wed' },
  { v: 4, l: 'Thu' },
  { v: 5, l: 'Fri' },
  { v: 6, l: 'Sat' },
  { v: 0, l: 'Sun' }
]

export type NlState = 'idle' | 'ok' | 'bad'

const DEFAULT_SCHEDULE: Schedule = { freq: 'daily', time: '09:00', days: [1], everyHours: 6 }

export function buildRoutineEdits({
  name,
  prompt,
  dir,
  agent,
  model,
  schedule,
  permissionMode,
  grace
}: {
  name: string
  prompt: string
  dir: string
  agent: AgentId
  model: string
  schedule: Schedule
  permissionMode: PermissionMode | ''
  grace: string
}): Omit<Routine, 'id' | 'enabled'> {
  return {
    name: name.trim(),
    prompt: prompt.trim(),
    dir: dir.trim() || '~',
    agent,
    model,
    schedule,
    permissionMode: permissionMode || undefined,
    missedRunGraceMinutes: grace.trim() === '' ? undefined : Math.max(0, +grace || 0)
  }
}

export function useRoutineEditorState({
  routine,
  onClose
}: {
  routine: Routine | null
  onClose: () => void
}): {
  isNew: boolean
  name: string
  setName: React.Dispatch<React.SetStateAction<string>>
  prompt: string
  setPrompt: React.Dispatch<React.SetStateAction<string>>
  dir: string
  setDir: React.Dispatch<React.SetStateAction<string>>
  agent: AgentId
  setAgent: (agent: AgentId) => void
  model: string
  setModel: (model: string) => void
  permissionMode: PermissionMode | ''
  setPermissionMode: React.Dispatch<React.SetStateAction<PermissionMode | ''>>
  grace: string
  setGrace: React.Dispatch<React.SetStateAction<string>>
  schedule: Schedule
  nl: string
  nlState: NlState
  structured: boolean
  setStructured: React.Dispatch<React.SetStateAction<boolean>>
  valid: boolean
  preview: Date | null
  modelDesc: string | undefined
  onNlChange: (value: string) => void
  patchSchedule: (patch: Partial<Schedule>) => void
  toggleDay: (day: number) => void
  chooseDir: () => Promise<void>
  save: () => Promise<void>
} {
  const createRoutine = useStore((s) => s.createRoutine)
  const updateRoutine = useStore((s) => s.updateRoutine)
  const defaultAgent = useStore((s) => s.settings.defaultAgent)
  const isNew = !routine

  const [name, setName] = React.useState(routine ? routine.name : '')
  const [prompt, setPrompt] = React.useState(routine ? routine.prompt : '')
  const [dir, setDir] = React.useState(routine ? routine.dir : '~')
  const [agent, setAgent] = React.useState<AgentId>(routine?.agent ?? defaultAgent)
  const [claudeModel, setClaudeModel] = React.useState<ModelId>(
    routine?.agent === 'claude' && MODELS.some((entry) => entry.id === routine.model)
      ? (routine.model as ModelId)
      : 'sonnet'
  )
  const [codexModel, setCodexModel] = React.useState(
    routine?.agent === 'codex' ? routine.model : 'gpt-5.5'
  )
  // Empty string inherits the global default from Settings.
  const [permissionMode, setPermissionMode] = React.useState<PermissionMode | ''>(
    routine?.permissionMode ?? ''
  )
  const [grace, setGrace] = React.useState<string>(
    routine?.missedRunGraceMinutes != null ? String(routine.missedRunGraceMinutes) : ''
  )
  const [schedule, setSchedule] = React.useState<Schedule>(
    routine ? { ...routine.schedule } : DEFAULT_SCHEDULE
  )
  const [nl, setNl] = React.useState(routine ? scheduleToNL(routine.schedule) : '')
  const [nlState, setNlState] = React.useState<NlState>(routine ? 'ok' : 'idle')
  const [structured, setStructured] = React.useState(false)

  const onNlChange = (value: string): void => {
    setNl(value)
    if (!value.trim()) {
      setNlState('idle')
      return
    }
    const parsed = parseNL(value)
    if (parsed) {
      setSchedule((current) => ({ ...current, ...parsed }))
      setNlState('ok')
    } else {
      setNlState('bad')
    }
  }

  const patchSchedule = (patch: Partial<Schedule>): void => {
    const next = { ...schedule, ...patch }
    setSchedule(next)
    setNl(scheduleToNL(next))
    setNlState('ok')
  }

  const toggleDay = (day: number): void => {
    const days = schedule.days.includes(day)
      ? schedule.days.filter((current) => current !== day)
      : [...schedule.days, day].sort((a, b) => a - b)
    if (days.length === 0) {
      return
    }
    patchSchedule({ days })
  }

  const valid =
    !!name.trim() &&
    !!prompt.trim() &&
    !!(agent === 'claude' ? claudeModel : codexModel).trim() &&
    (nlState !== 'bad' || structured)
  const preview = computeNextRun(schedule, new Date())
  const model = agent === 'claude' ? claudeModel : codexModel
  const setModel = (value: string): void => {
    if (agent === 'claude') {
      setClaudeModel(value as ModelId)
    } else {
      setCodexModel(value)
    }
  }
  const modelDesc =
    agent === 'claude'
      ? MODELS.find((entry) => entry.id === model)?.desc
      : 'Passed to codex exec --model.'

  const chooseDir = async (): Promise<void> => {
    const picked = await window.api.dialog.selectDirectory()
    if (picked) {
      setDir(picked)
    }
  }

  const save = async (): Promise<void> => {
    if (!valid) {
      return
    }
    const edits = buildRoutineEdits({
      name,
      prompt,
      dir,
      agent,
      model,
      schedule,
      permissionMode,
      grace
    })
    await (routine
      ? updateRoutine({ ...routine, ...edits })
      : createRoutine({ ...edits, enabled: true }))
    onClose()
  }

  return {
    isNew,
    name,
    setName,
    prompt,
    setPrompt,
    dir,
    setDir,
    agent,
    setAgent,
    model,
    setModel,
    permissionMode,
    setPermissionMode,
    grace,
    setGrace,
    schedule,
    nl,
    nlState,
    structured,
    setStructured,
    valid,
    preview,
    modelDesc,
    onNlChange,
    patchSchedule,
    toggleDay,
    chooseDir,
    save
  }
}
