export type View =
  | { screen: 'routines' }
  | { screen: 'routine'; routineId: string }
  | { screen: 'calendar' }
  | { screen: 'history' }
  | { screen: 'run'; runId: string; from?: View }
  | { screen: 'settings' }

export type Nav = (v: View) => void

export type ScreenProps = {
  nav: Nav
  now: Date
  openEditor: (routineId?: string) => void
}
