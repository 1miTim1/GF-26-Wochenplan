import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPlan, isValidEditKey } from '@/app/actions/activities'
import { PlanView } from '@/components/plan-view'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Wochenplan bearbeiten',
  robots: { index: false, follow: false },
}

export default async function EditPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params
  if (!(await isValidEditKey(key))) notFound()
  const { activities, title } = await getPlan()
  return <PlanView activities={activities} title={title} editKey={key} />
}
