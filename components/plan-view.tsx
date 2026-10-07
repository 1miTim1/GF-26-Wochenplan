'use client'

import { Download, Moon, Plus, Sun } from 'lucide-react'
import Link from 'next/link'
import { useRef, useState, useTransition } from 'react'
import { updatePlanTitle } from '@/app/actions/activities'
import { ActivityDialog, type DialogState } from '@/components/activity-dialog'
import { PlanGrid, PlanLegend } from '@/components/plan-grid'
import { ShareLinks } from '@/components/share-links'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Activity } from '@/lib/db/schema'
import { PLAN_THEMES, type PlanTheme } from '@/lib/plan'

type Props = { activities: Activity[]; title: string; editKey?: string }

export function PlanView({ activities, title, editKey }: Props) {
  const [theme, setTheme] = useState<PlanTheme>('light')
  const [dialog, setDialog] = useState<DialogState>(null)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const exportRef = useRef<HTMLDivElement>(null)
  const isEditor = Boolean(editKey)
  const colors = PLAN_THEMES[theme]

  async function handleDownload() {
    if (!exportRef.current) return
    setDownloading(true)
    setDownloadError(null)
    try {
      const { toPng } = await import('html-to-image')
      const dataUrl = await toPng(exportRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: colors.background,
      })
      const link = document.createElement('a')
      link.download = `${slugify(title)}-${theme === 'light' ? 'hell' : 'dunkel'}.png`
      link.href = dataUrl
      link.click()
    } catch {
      setDownloadError('Das Bild konnte nicht erstellt werden. Bitte erneut versuchen.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[1500px] flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
      <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">
            {isEditor ? 'Bearbeitungsmodus' : 'Freizeit-Programm'}
          </p>
          {editKey ? <TitleEditor editKey={editKey} title={title} /> : (
            <h1 className="font-serif text-4xl font-semibold text-balance md:text-5xl">{title}</h1>
          )}
          <p className="max-w-xl text-muted-foreground text-pretty">
            {isEditor
              ? 'Klicke auf einen Block, um ihn zu bearbeiten, oder auf ein leeres Feld, um etwas einzutragen.'
              : 'Das ganze Programm der Woche auf einen Blick. Lade dir den Plan als Bild aufs Handy.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Farbschema des Plans" className="flex rounded-lg border bg-card p-0.5">
            <Button
              variant={theme === 'light' ? 'secondary' : 'ghost'}
              size="sm"
              aria-pressed={theme === 'light'}
              onClick={() => setTheme('light')}
            >
              <Sun aria-hidden="true" />
              Hell
            </Button>
            <Button
              variant={theme === 'dark' ? 'secondary' : 'ghost'}
              size="sm"
              aria-pressed={theme === 'dark'}
              onClick={() => setTheme('dark')}
            >
              <Moon aria-hidden="true" />
              Dunkel
            </Button>
          </div>
          <Button variant={isEditor ? 'outline' : 'default'} onClick={handleDownload} disabled={downloading}>
            <Download aria-hidden="true" />
            {downloading ? 'Wird erstellt…' : `Als Bild (${theme === 'light' ? 'hell' : 'dunkel'})`}
          </Button>
          {isEditor ? (
            <Button onClick={() => setDialog({ mode: 'create', day: 0, startTime: '09:00', endTime: '10:00' })}>
              <Plus aria-hidden="true" />
              Hinzufügen
            </Button>
          ) : null}
        </div>
      </header>

      {downloadError ? (
        <p role="alert" className="text-sm text-destructive">
          {downloadError}
        </p>
      ) : null}

      {editKey ? <ShareLinks editKey={editKey} /> : null}

      <div
        className="flex flex-col gap-4 rounded-2xl border p-3 md:p-5"
        style={{ backgroundColor: colors.background, borderColor: colors.line }}
      >
        <div className="overflow-x-auto">
          <div className="min-w-[1000px]">
            <PlanGrid
              activities={activities}
              theme={theme}
              onSelectActivity={isEditor ? (activity) => setDialog({ mode: 'edit', activity }) : undefined}
              onSelectEmpty={
                isEditor ? (slot) => setDialog({ mode: 'create', ...slot }) : undefined
              }
            />
          </div>
        </div>
        {isEditor ? <PlanLegend theme={theme} /> : null}
      </div>

      {isEditor ? (
        <p className="text-sm text-muted-foreground">
          <Link href="/" className="underline underline-offset-4 hover:text-foreground">
            Ansicht für Teilnehmer öffnen
          </Link>
        </p>
      ) : null}

      <div aria-hidden="true" className="pointer-events-none fixed top-0 left-[-10000px]">
        <div
          ref={exportRef}
          className="flex flex-col gap-6 font-sans"
          style={{ width: 1600, padding: 48, backgroundColor: colors.background }}
        >
          <div className="flex items-end justify-between">
            <h2 className="font-serif text-[44px] font-semibold leading-none" style={{ color: colors.title }}>
              {title}
            </h2>
            <p className="text-[15px] font-medium uppercase tracking-widest" style={{ color: colors.muted }}>
              Freizeit-Programm
            </p>
          </div>
          <PlanGrid activities={activities} theme={theme} />
        </div>
      </div>

      {editKey ? <ActivityDialog state={dialog} editKey={editKey} onClose={() => setDialog(null)} /> : null}
    </main>
  )
}

function TitleEditor({ editKey, title }: { editKey: string; title: string }) {
  const [value, setValue] = useState(title)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const changed = value.trim() !== title

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    startTransition(async () => {
      const result = await updatePlanTitle(editKey, value)
      setError(result.ok ? null : result.error)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <label htmlFor="plan-title" className="sr-only">
          Titel des Plans
        </label>
        <Input
          id="plan-title"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          maxLength={80}
          className="h-auto border-transparent bg-transparent px-0 font-serif text-4xl font-semibold shadow-none hover:border-input focus-visible:px-2 md:text-5xl dark:bg-transparent"
        />
        {changed ? (
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? 'Speichert…' : 'Titel speichern'}
          </Button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  )
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'wochenplan'
  )
}
