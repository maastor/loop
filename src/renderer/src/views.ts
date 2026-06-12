// renderer/src/views.ts — navigation model + shared screen prop contracts.
// This is the integration contract every screen (and App) agrees on.

export type View =
  | { screen: 'routines' }
  | { screen: 'routine'; routineId: string }
  | { screen: 'calendar' }
  | { screen: 'history' }
  | { screen: 'run'; runId: string; from?: View }
  | { screen: 'settings' }

export type Nav = (v: View) => void

/** Props passed to every screen. Screens read routines/runs from the store directly. */
export type ScreenProps = {
  nav: Nav
  now: Date
  /** Open the create/edit routine sheet. Pass a routineId to edit, omit to create. */
  openEditor: (routineId?: string) => void
}
