import type { Activity } from '@/lib/db/schema'
import { CATEGORIES, DAYS, PLAN_THEMES, type PlanTheme, buildGrid, effectiveEnd, getCategory } from '@/lib/plan'

type PlanGridProps = {
  activities: Activity[]
  theme: PlanTheme
  onSelectActivity?: (activity: Activity) => void
  onSelectEmpty?: (slot: { day: number; startTime: string; endTime: string }) => void
}

export function PlanGrid({ activities, theme, onSelectActivity, onSelectEmpty }: PlanGridProps) {
  const colors = PLAN_THEMES[theme]
  const { boundaries, rows, placed, empty } = buildGrid(activities)
  const interactive = Boolean(onSelectActivity)

  return (
    <div
      role="table"
      aria-label="Wochenplan"
      className="grid w-full overflow-hidden rounded-xl"
      style={{
        gridTemplateColumns: '76px repeat(7, minmax(0, 1fr))',
        gridTemplateRows: `44px repeat(${rows.length}, minmax(40px, auto))`,
        gap: 1,
        padding: 1,
        backgroundColor: colors.line,
      }}
    >
      <div style={{ gridColumn: 1, gridRow: 1, backgroundColor: colors.headerBg }} aria-hidden="true" />
      {DAYS.map((day, index) => (
        <div
          key={day.long}
          role="columnheader"
          className="flex items-center justify-center text-[14px] font-semibold tracking-wide"
          style={{ gridColumn: index + 2, gridRow: 1, backgroundColor: colors.headerBg, color: colors.headerText }}
        >
          {day.long}
        </div>
      ))}

      {rows.map((time, row) => (
        <div
          key={time}
          role="rowheader"
          className="flex items-center justify-center text-[13px] font-semibold tabular-nums"
          style={{ gridColumn: 1, gridRow: row + 2, backgroundColor: colors.timeBg, color: colors.timeText }}
        >
          {time}
        </div>
      ))}

      {empty.map(({ row, day }) =>
        onSelectEmpty ? (
          <button
            key={`empty-${row}-${day}`}
            type="button"
            onClick={() => onSelectEmpty({ day, startTime: boundaries[row], endTime: boundaries[row + 1] })}
            aria-label={`Programmpunkt am ${DAYS[day].long} um ${boundaries[row]} hinzufügen`}
            className="group flex items-center justify-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            style={{ gridColumn: day + 2, gridRow: row + 2, backgroundColor: colors.empty, color: colors.muted }}
          >
            <span className="text-lg leading-none opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              +
            </span>
          </button>
        ) : (
          <div
            key={`empty-${row}-${day}`}
            aria-hidden="true"
            style={{ gridColumn: day + 2, gridRow: row + 2, backgroundColor: colors.empty }}
          />
        ),
      )}

      {placed.map(({ activity, rowStart, rowEnd, dayStart, dayEnd }) => {
        const swatch = getCategory(activity.category)[theme]
        const tall = rowEnd - rowStart >= 2
        const style = {
          gridColumn: `${dayStart + 2} / ${dayEnd + 3}`,
          gridRow: `${rowStart + 2} / ${rowEnd + 2}`,
          backgroundColor: swatch.bg,
          color: swatch.text,
        }
        const content = (
          <>
            <span className="text-[13.5px] font-semibold leading-tight text-balance">{activity.title}</span>
            {activity.description ? (
              <span className="text-[12px] leading-snug opacity-85 text-balance">{activity.description}</span>
            ) : null}
            {tall ? (
              <span className="mt-0.5 text-[12px] font-medium tabular-nums opacity-75">
                {activity.startTime}–{effectiveEnd(activity)}
              </span>
            ) : null}
          </>
        )
        const className = 'flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 text-center'

        return interactive ? (
          <button
            key={activity.id}
            type="button"
            onClick={() => onSelectActivity?.(activity)}
            aria-label={`${activity.title} bearbeiten`}
            className={`${className} outline-none transition-[filter] hover:brightness-95 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring dark:hover:brightness-110`}
            style={style}
          >
            {content}
          </button>
        ) : (
          <div key={activity.id} role="cell" className={className} style={style}>
            {content}
          </div>
        )
      })}
    </div>
  )
}

export function PlanLegend({ theme }: { theme: PlanTheme }) {
  const colors = PLAN_THEMES[theme]
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Legende">
      {Object.entries(CATEGORIES).map(([key, category]) => (
        <li key={key} className="flex items-center gap-2 text-[13px]" style={{ color: colors.muted }}>
          <span className="size-3 rounded-sm" style={{ backgroundColor: category[theme].bg }} aria-hidden="true" />
          {category.label}
        </li>
      ))}
    </ul>
  )
}
