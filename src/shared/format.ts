import { DAY_NAMES, MONTHS } from './schedule'

export const fmtTime = (d: Date | string): string => {
  d = new Date(d)
  const h = d.getHours()
  const m = d.getMinutes()
  const ap = h >= 12 ? 'PM' : 'AM'
  const hh = h % 12 === 0 ? 12 : h % 12
  return `${hh}:${String(m).padStart(2, '0')} ${ap}`
}

export const fmtDate = (d: Date | string): string => {
  d = new Date(d)
  return `${DAY_NAMES[d.getDay()]}, ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`
}

export const fmtDateTime = (d: Date | string): string => `${fmtDate(d)} · ${fmtTime(d)}`

export const fmtDur = (s: number | null): string => {
  if (s == null) {
    return '—'
  }
  if (s < 60) {
    return `${s}s`
  }
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

export const fmtCost = (c: number | null): string => (c == null ? '—' : `$${c.toFixed(2)}`)

export const fmtTokens = (t: number | null): string =>
  t == null ? '—' : t >= 1000 ? `${Math.round(t / 1000)}k` : String(t)

export const relTime = (d: Date | string, now?: Date): string => {
  const ms = (now || new Date()).getTime() - new Date(d).getTime()
  const min = Math.round(ms / 60000)
  if (min < 1) {
    return 'just now'
  }
  if (min < 60) {
    return `${min}m ago`
  }
  const h = Math.round(min / 60)
  if (h < 24) {
    return `${h}h ago`
  }
  const days = Math.round(h / 24)
  if (days === 1) {
    return 'yesterday'
  }
  return `${days}d ago`
}

export const relUntil = (d: Date | string, now?: Date): string => {
  const ms = new Date(d).getTime() - (now || new Date()).getTime()
  const min = Math.round(ms / 60000)
  if (min < 1) {
    return 'now'
  }
  if (min < 60) {
    return `in ${min}m`
  }
  const h = Math.round(min / 60)
  if (h < 24) {
    return `in ${h}h`
  }
  return `in ${Math.round(h / 24)}d`
}
