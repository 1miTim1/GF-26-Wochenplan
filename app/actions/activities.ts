'use server'

import { timingSafeEqual } from 'node:crypto'
import { asc, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { activities, planSettings } from '@/lib/db/schema'
import { DAYS, TIME_PATTERN, effectiveEnd, effectiveEndDay, isCategory, toMinutes } from '@/lib/plan'

export type ActionResult = { ok: true } | { ok: false; error: string }

async function getSettings() {
  const [row] = await db.select().from(planSettings).where(eq(planSettings.id, 1)).limit(1)
  return row ?? null
}

export async function isValidEditKey(key: unknown) {
  if (typeof key !== 'string' || key.length === 0 || key.length > 200) return false
  const settings = await getSettings()
  if (!settings) return false
  const expected = Buffer.from(settings.editKey)
  const given = Buffer.from(key)
  return expected.length === given.length && timingSafeEqual(expected, given)
}

export async function getPlan() {
  const [rows, settings] = await Promise.all([
    db.select().from(activities).orderBy(asc(activities.day), asc(activities.startTime)),
    getSettings(),
  ])
  return { activities: rows, title: settings?.title ?? 'Wochenplan' }
}

function readText(formData: FormData, key: string, max: number) {
  const value = formData.get(key)
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, max)
}

function parseActivity(formData: FormData) {
  const day = Number(formData.get('day'))
  const endDayRaw = Number(formData.get('endDay'))
  const startTime = readText(formData, 'startTime', 5)
  const endTime = readText(formData, 'endTime', 5)
  const title = readText(formData, 'title', 120)
  const description = readText(formData, 'description', 300)
  const category = readText(formData, 'category', 30)

  if (!Number.isInteger(day) || day < 0 || day > 6) return { error: 'Bitte einen gültigen Tag wählen.' }
  const endDay = Number.isInteger(endDayRaw) && endDayRaw >= day && endDayRaw <= 6 ? endDayRaw : day
  if (!TIME_PATTERN.test(startTime)) return { error: 'Bitte eine gültige Startzeit angeben.' }
  if (!TIME_PATTERN.test(endTime)) return { error: 'Bitte eine gültige Endzeit angeben.' }
  if (toMinutes(endTime) <= toMinutes(startTime)) return { error: 'Die Endzeit muss nach der Startzeit liegen.' }
  if (!title) return { error: 'Bitte einen Titel angeben.' }
  if (!isCategory(category)) return { error: 'Bitte eine gültige Kategorie wählen.' }

  return {
    data: {
      day,
      endDay,
      startTime,
      endTime,
      title,
      description: description || null,
      category,
    },
  }
}

function revalidatePlan() {
  revalidatePath('/', 'layout')
}

export async function saveActivity(editKey: string, formData: FormData): Promise<ActionResult> {
  if (!(await isValidEditKey(editKey))) return { ok: false, error: 'Keine Berechtigung zum Bearbeiten.' }

  const parsed = parseActivity(formData)
  if ('error' in parsed) return { ok: false, error: parsed.error ?? 'Ungültige Eingabe.' }

  const rawId = formData.get('id')
  const id = rawId ? Number(rawId) : null
  if (id !== null && (!Number.isInteger(id) || id <= 0)) return { ok: false, error: 'Ungültiger Eintrag.' }

  try {
    const existing = await db.select().from(activities)
    const { data } = parsed
    const start = toMinutes(data.startTime)
    const end = toMinutes(data.endTime)
    const conflict = existing.find((other) => {
      if (other.id === id) return false
      const daysOverlap = data.day <= effectiveEndDay(other) && other.day <= data.endDay
      const timesOverlap = start < toMinutes(effectiveEnd(other)) && toMinutes(other.startTime) < end
      return daysOverlap && timesOverlap
    })
    if (conflict) {
      return {
        ok: false,
        error: `Überschneidet sich mit „${conflict.title}“ (${DAYS[conflict.day].long}, ${conflict.startTime}–${effectiveEnd(conflict)}).`,
      }
    }

    if (id !== null) {
      await db.update(activities).set(data).where(eq(activities.id, id))
    } else {
      await db.insert(activities).values(data)
    }
  } catch {
    return { ok: false, error: 'Speichern fehlgeschlagen. Bitte erneut versuchen.' }
  }

  revalidatePlan()
  return { ok: true }
}

export async function deleteActivity(editKey: string, id: number): Promise<ActionResult> {
  if (!(await isValidEditKey(editKey))) return { ok: false, error: 'Keine Berechtigung zum Bearbeiten.' }
  if (!Number.isInteger(id) || id <= 0) return { ok: false, error: 'Ungültiger Eintrag.' }
  try {
    await db.delete(activities).where(eq(activities.id, id))
  } catch {
    return { ok: false, error: 'Löschen fehlgeschlagen. Bitte erneut versuchen.' }
  }
  revalidatePlan()
  return { ok: true }
}

export async function updatePlanTitle(editKey: string, title: string): Promise<ActionResult> {
  if (!(await isValidEditKey(editKey))) return { ok: false, error: 'Keine Berechtigung zum Bearbeiten.' }
  const clean = typeof title === 'string' ? title.trim().slice(0, 80) : ''
  if (!clean) return { ok: false, error: 'Bitte einen Titel angeben.' }
  try {
    await db.update(planSettings).set({ title: clean }).where(eq(planSettings.id, 1))
  } catch {
    return { ok: false, error: 'Speichern fehlgeschlagen.' }
  }
  revalidatePlan()
  return { ok: true }
}
