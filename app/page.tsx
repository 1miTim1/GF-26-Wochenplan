import { getPlan } from '@/app/actions/activities'
import { PlanView } from '@/components/plan-view'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const { activities, title } = await getPlan()
  return <PlanView activities={activities} title={title} />
}
