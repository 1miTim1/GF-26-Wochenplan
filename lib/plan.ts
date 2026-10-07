import type { Activity } from '@/lib/db/schema'

export const DAYS = [
  { short: 'So', long: 'Sonntag' },
  { short: 'Mo', long: 'Montag' },
  { short: 'Di', long: 'Dienstag' },
  { short: 'Mi', long: 'Mittwoch' },
  { short: 'Do', long: 'Donnerstag' },
  { short: 'Fr', long: 'Freitag' },
  { short: 'Sa', long: 'Samstag' },
] as const

type Swatch = { bg: string; text: string }

export const CATEGORIES: Record<string, { label: string; light: Swatch; dark: Swatch }> = {
  andacht: {
    label: 'Andacht & Godi',
    light: { bg: '#DCD3F2', text: '#34265E' },
    dark: { bg: '#3D3268', text: '#E6DFFB' },
  },
  essen: {
    label: 'Essen',
    light: { bg: '#CDE7D6', text: '#1D4A31' },
    dark: { bg: '#22493A', text: '#D2F0DD' },
  },
  dienst: {
    label: 'Küchenteam & Dienste',
    light: { bg: '#F8D8C6', text: '#76321A' },
    dark: { bg: '#6E3624', text: '#FCDCCB' },
  },
  programm: {
    label: 'Programm',
    light: { bg: '#F5E3AE', text: '#654A0B' },
    dark: { bg: '#5E4B17', text: '#F8E8B7' },
  },
  sport: {
    label: 'Spiel & Sport',
    light: { bg: '#C6E2EE', text: '#134A5E' },
    dark: { bg: '#1C4B5D', text: '#CFECF7' },
  },
  highlight: {
    label: 'Highlights',
    light: { bg: '#F3C8D6', text: '#77203F' },
    dark: { bg: '#6B2442', text: '#FAD4E1' },
  },
  freizeit: {
    label: 'Chill & Seminar',
    light: { bg: '#E6DCC8', text: '#56462A' },
    dark: { bg: '#4B4231', text: '#EFE5CF' },
  },
  ruhe: {
    label: 'Nachtruhe',
    light: { bg: '#D3D9E8', text: '#2B3654' },
    dark: { bg: '#2A3352', text: '#D9E0F1' },
  },
}

export type CategoryKey = keyof typeof CATEGORIES

export function isCategory(value: string): value is CategoryKey {
  return Object.hasOwn(CATEGORIES, value)
}

export function getCategory(value: string) {
  return isCategory(value) ? CATEGORIES[value] : CATEGORIES.programm
}

export type PlanTheme = 'light' | 'dark'

export const PLAN_THEMES: Record<
  PlanTheme,
  { background: string; line: string; headerBg: string; headerText: string; timeBg: string; timeText: string; empty: string; title: string; muted: string }
> = {
  light: {
    background: '#FBF9F4',
    line: '#E4DED2',
    headerBg: '#2E4A3D',
    headerText: '#F7F3EA',
    timeBg: '#EFEADF',
    timeText: '#2F3A33',
    empty: '#FFFFFF',
    title: '#1E2B25',
    muted: '#6B6A60',
  },
  dark: {
    background: '#111714',
    line: '#27312C',
    headerBg: '#1F2D26',
    headerText: '#EDE7DA',
    timeBg: '#18211D',
    timeText: '#CFC9BB',
    empty: '#141B17',
    title: '#F2ECE0',
    muted: '#9C978B',
  },
}

export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

export function toMinutes(time: string) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function fromMinutes(total: number) {
  const clamped = Math.min(total, 23 * 60 + 59)
  const h = Math.floor(clamped / 60)
  const m = clamped % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function effectiveEnd(activity: Pick<Activity, 'startTime' | 'endTime'>) {
  return activity.endTime ?? fromMinutes(toMinutes(activity.startTime) + 30)
}

export function effectiveEndDay(activity: Pick<Activity, 'day' | 'endDay'>) {
  return Math.max(activity.endDay ?? activity.day, activity.day)
}

export type PlacedActivity = {
  activity: Activity
  rowStart: number
  rowEnd: number
  dayStart: number
  dayEnd: number
}

export function buildGrid(activities: Activity[]) {
  const times = new Set<string>()
  for (const activity of activities) {
    times.add(activity.startTime)
    times.add(effectiveEnd(activity))
  }
  if (times.size < 2) {
    for (let h = 8; h <= 22; h++) times.add(fromMinutes(h * 60))
  }

  const boundaries = [...times].sort()
  const rows = boundaries.slice(0, -1)
  const occupied = rows.map(() => DAYS.map(() => false))

  const placed: PlacedActivity[] = activities.map((activity) => {
    const rowStart = boundaries.indexOf(activity.startTime)
    const rowEnd = boundaries.indexOf(effectiveEnd(activity))
    const dayStart = activity.day
    const dayEnd = effectiveEndDay(activity)
    for (let r = rowStart; r < rowEnd; r++) {
      for (let d = dayStart; d <= dayEnd; d++) occupied[r][d] = true
    }
    return { activity, rowStart, rowEnd, dayStart, dayEnd }
  })

  const empty: { row: number; day: number }[] = []
  rows.forEach((_, row) => {
    DAYS.forEach((_, day) => {
      if (!occupied[row][day]) empty.push({ row, day })
    })
  })

  return { boundaries, rows, placed, empty }
}
