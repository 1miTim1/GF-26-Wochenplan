'use client'

import { Check, Copy, Eye, Pencil } from 'lucide-react'
import { useState, useSyncExternalStore } from 'react'
import { Button } from '@/components/ui/button'

const subscribe = () => () => {}

function useOrigin() {
  return useSyncExternalStore(
    subscribe,
    () => window.location.origin,
    () => '',
  )
}

export function ShareLinks({ editKey }: { editKey: string }) {
  const origin = useOrigin()
  const links = [
    { id: 'view', label: 'Link zum Ansehen', hint: 'Für alle Teilnehmer', icon: Eye, url: `${origin}/` },
    { id: 'edit', label: 'Link zum Bearbeiten', hint: 'Nur für das Team – nicht weitergeben', icon: Pencil, url: `${origin}/bearbeiten/${editKey}` },
  ]

  return (
    <section aria-labelledby="share-heading" className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <h2 id="share-heading" className="text-sm font-semibold">
        Links teilen
      </h2>
      <div className="grid gap-3 md:grid-cols-2">
        {links.map((link) => (
          <LinkRow key={link.id} {...link} />
        ))}
      </div>
    </section>
  )
}

function LinkRow({ label, hint, icon: Icon, url }: { label: string; hint: string; icon: typeof Eye; url: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-muted/60 p-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm font-medium">{label}</span>
          <span className="text-xs text-muted-foreground">{hint}</span>
          <span className="break-all font-mono text-xs text-muted-foreground sm:truncate sm:break-normal">{url}</span>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={copy}
        aria-label={`${label} kopieren`}
        className="w-full shrink-0 sm:w-auto"
      >
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        {copied ? 'Kopiert' : 'Kopieren'}
      </Button>
    </div>
  )
}
