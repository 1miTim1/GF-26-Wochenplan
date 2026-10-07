'use client'

import { useState, useTransition } from 'react'
import { deleteActivity, saveActivity } from '@/app/actions/activities'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Activity } from '@/lib/db/schema'
import { CATEGORIES, DAYS, effectiveEnd, effectiveEndDay } from '@/lib/plan'

export type DialogState =
  | { mode: 'create'; day: number; startTime: string; endTime: string }
  | { mode: 'edit'; activity: Activity }
  | null

const selectClass =
  'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30'

type Props = { state: DialogState; editKey: string; onClose: () => void }

export function ActivityDialog({ state, editKey, onClose }: Props) {
  return (
    <Dialog open={state !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {state ? (
          <ActivityForm
            key={state.mode === 'edit' ? state.activity.id : `new-${state.day}-${state.startTime}`}
            state={state}
            editKey={editKey}
            onClose={onClose}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function ActivityForm({ state, editKey, onClose }: { state: NonNullable<DialogState>; editKey: string; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const activity = state.mode === 'edit' ? state.activity : null
  const initialDay = activity ? activity.day : state.mode === 'create' ? state.day : 0
  const [day, setDay] = useState(initialDay)
  const [endDay, setEndDay] = useState(activity ? effectiveEndDay(activity) : initialDay)

  const defaultStart = activity ? activity.startTime : state.mode === 'create' ? state.startTime : '09:00'
  const defaultEnd = activity ? effectiveEnd(activity) : state.mode === 'create' ? state.endTime : '10:00'

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    startTransition(async () => {
      const result = await saveActivity(editKey, formData)
      if (result.ok) onClose()
      else setError(result.error)
    })
  }

  function handleDelete() {
    if (!activity) return
    startTransition(async () => {
      const result = await deleteActivity(editKey, activity.id)
      if (result.ok) onClose()
      else setError(result.error)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle className="font-serif text-xl">
          {activity ? 'Programmpunkt bearbeiten' : 'Neuer Programmpunkt'}
        </DialogTitle>
        <DialogDescription>Änderungen sind sofort für alle Teilnehmer sichtbar.</DialogDescription>
      </DialogHeader>

      {activity ? <input type="hidden" name="id" value={activity.id} /> : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Titel</Label>
        <Input id="title" name="title" required maxLength={120} defaultValue={activity?.title ?? ''} placeholder="z. B. Geländespiel" />
      </div>

      <div className="flex gap-4">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="day">Von Tag</Label>
          <select
            id="day"
            name="day"
            value={day}
            onChange={(event) => {
              const next = Number(event.target.value)
              setDay(next)
              if (endDay < next) setEndDay(next)
            }}
            className={selectClass}
          >
            {DAYS.map((d, index) => (
              <option key={d.long} value={index}>
                {d.long}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="endDay">Bis Tag</Label>
          <select
            id="endDay"
            name="endDay"
            value={endDay}
            onChange={(event) => setEndDay(Number(event.target.value))}
            className={selectClass}
          >
            {DAYS.map((d, index) =>
              index >= day ? (
                <option key={d.long} value={index}>
                  {d.long}
                </option>
              ) : null,
            )}
          </select>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="startTime">Beginn</Label>
          <Input id="startTime" name="startTime" type="time" required defaultValue={defaultStart} />
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="endTime">Ende</Label>
          <Input id="endTime" name="endTime" type="time" required defaultValue={defaultEnd} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="category">Kategorie (Farbe)</Label>
        <select id="category" name="category" defaultValue={activity?.category ?? 'programm'} className={selectClass}>
          {Object.entries(CATEGORIES).map(([key, category]) => (
            <option key={key} value={key}>
              {category.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Zusatz (optional)</Label>
        <Textarea
          id="description"
          name="description"
          maxLength={300}
          rows={2}
          defaultValue={activity?.description ?? ''}
          placeholder="z. B. Pizzasuppe oder JET & BICK"
        />
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <DialogFooter className="gap-2 sm:justify-between">
        {activity ? (
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={isPending}>
            Löschen
          </Button>
        ) : (
          <span className="hidden sm:block" />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Speichert…' : 'Speichern'}
          </Button>
        </div>
      </DialogFooter>
    </form>
  )
}
