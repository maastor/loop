import React from 'react'

export type IconName =
  | 'routines'
  | 'calendar'
  | 'history'
  | 'plus'
  | 'play'
  | 'pause'
  | 'chevL'
  | 'chevR'
  | 'chevD'
  | 'folder'
  | 'edit'
  | 'trash'
  | 'x'
  | 'check'
  | 'alert'
  | 'file'
  | 'commit'
  | 'pr'
  | 'label'
  | 'terminal'
  | 'clock'
  | 'spark'
  | 'grid'
  | 'rows'
  | 'table'
  | 'settings'

const PATHS: Record<IconName, React.ReactNode> = {
  routines: (
    <g>
      <rect x="2" y="2.5" width="12" height="11" rx="2" />
      <path d="M5 6.2l1.8 1.8L5 9.8" />
      <path d="M8.5 10h2.8" />
    </g>
  ),
  calendar: (
    <g>
      <rect x="2" y="3" width="12" height="11" rx="2" />
      <path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" />
    </g>
  ),
  history: (
    <g>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.8V8l2.3 1.6" />
    </g>
  ),
  plus: <path d="M8 3v10M3 8h10" />,
  play: <path d="M5 3.5l7 4.5-7 4.5z" />,
  pause: <path d="M5.5 3.5v9M10.5 3.5v9" />,
  chevL: <path d="M10 3l-5 5 5 5" />,
  chevR: <path d="M6 3l5 5-5 5" />,
  chevD: <path d="M3 6l5 5 5-5" />,
  folder: (
    <path d="M2 4.5c0-.8.7-1.5 1.5-1.5h3l1.5 2h4.5c.8 0 1.5.7 1.5 1.5v6c0 .8-.7 1.5-1.5 1.5h-9C2.7 14 2 13.3 2 12.5z" />
  ),
  edit: (
    <g>
      <path d="M11.5 2.5l2 2L6 12l-2.7.7L4 10z" />
    </g>
  ),
  trash: (
    <g>
      <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 9h5.8l.6-9" />
    </g>
  ),
  x: <path d="M4 4l8 8M12 4l-8 8" />,
  check: <path d="M3 8.5l3.5 3.5L13 5" />,
  alert: (
    <g>
      <path d="M8 2L1.8 13h12.4z" />
      <path d="M8 6.5v3M8 11.2v.1" />
    </g>
  ),
  file: (
    <g>
      <path d="M4 1.5h5l3 3v10H4z" />
      <path d="M9 1.5v3h3" />
    </g>
  ),
  commit: (
    <g>
      <circle cx="8" cy="8" r="2.5" />
      <path d="M1.5 8h4M10.5 8h4" />
    </g>
  ),
  pr: (
    <g>
      <circle cx="4.5" cy="3.5" r="1.8" />
      <circle cx="4.5" cy="12.5" r="1.8" />
      <circle cx="11.5" cy="12.5" r="1.8" />
      <path d="M4.5 5.3v5.4M11.5 10.7V7c0-1.5-1-2.5-2.5-2.5H8" />
    </g>
  ),
  label: (
    <g>
      <path d="M2 7.5V3a1 1 0 011-1h4.5L14 8.5 8.5 14z" />
      <circle cx="5.5" cy="5.5" r="1" fill="currentColor" stroke="none" />
    </g>
  ),
  terminal: (
    <g>
      <path d="M3.5 5.5L6 8l-2.5 2.5" />
      <path d="M8 10.5h4.5" />
    </g>
  ),
  clock: (
    <g>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.8V8l2.3 1.6" />
    </g>
  ),
  spark: (
    <path d="M8 1.5v4M8 10.5v4M1.5 8h4M10.5 8h4M3.5 3.5l2.6 2.6M9.9 9.9l2.6 2.6M12.5 3.5L9.9 6.1M6.1 9.9l-2.6 2.6" />
  ),
  grid: (
    <g>
      <rect x="2" y="2" width="5" height="5" rx="1" />
      <rect x="9" y="2" width="5" height="5" rx="1" />
      <rect x="2" y="9" width="5" height="5" rx="1" />
      <rect x="9" y="9" width="5" height="5" rx="1" />
    </g>
  ),
  rows: (
    <g>
      <path d="M2 4h12M2 8h12M2 12h12" />
    </g>
  ),
  table: (
    <g>
      <rect x="2" y="2.5" width="12" height="11" rx="1.5" />
      <path d="M2 6h12M2 9.7h12M6.5 6v7.5" />
    </g>
  ),
  settings: (
    <g>
      <circle cx="8" cy="8" r="2.2" />
      <path d="M8 1.5v1.8M8 12.7v1.8M14.5 8h-1.8M3.3 8H1.5M12.6 3.4l-1.3 1.3M4.7 11.3l-1.3 1.3M12.6 12.6l-1.3-1.3M4.7 4.7L3.4 3.4" />
    </g>
  )
}

export function Icon({
  name,
  size = 16,
  style = {}
}: {
  name: IconName
  size?: number
  style?: React.CSSProperties
}): React.JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }}
    >
      {PATHS[name]}
    </svg>
  )
}
