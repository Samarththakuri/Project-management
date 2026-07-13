import { Link } from 'react-router-dom'
import { Skeleton } from '../ui'
import WidgetCard, { EmptyState } from './WidgetCard'
import { priorityVariant } from '../../utils/format'

const DOT = {
  error: 'bg-error',
  warning: 'bg-[#d9a441]',
  primary: 'bg-primary-fixed-dim',
  default: 'bg-outline',
}

function Group({ label, items }) {
  if (!items?.length) return null
  return (
    <div className="px-5 py-3 border-b border-outline-variant last:border-0">
      <p className="text-mono-label font-mono text-on-surface-variant uppercase tracking-widest mb-2">{label}</p>
      <ul className="flex flex-col gap-2">
        {items.map((t) => (
          <li key={t._id}>
            <Link
              to={t.project?._id ? `/projects/${t.project._id}/calendar` : '#'}
              className="flex items-center gap-2.5 group"
            >
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${DOT[priorityVariant(t.priority)]}`} />
              <span className="text-body-md font-geist text-on-surface truncate group-hover:text-primary-fixed-dim transition-colors">
                {t.title}
              </span>
              <span className="text-mono-label font-mono text-on-surface-variant uppercase truncate ml-auto flex-shrink-0">
                {t.project?.name}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function CalendarPreview({ calendar, loading }) {
  const total =
    (calendar?.today?.length || 0) + (calendar?.tomorrow?.length || 0) + (calendar?.thisWeek?.length || 0)

  return (
    <WidgetCard title="Calendar" icon="calendar_month">
      {loading ? (
        <div className="px-5 py-4 flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-full" />
          ))}
        </div>
      ) : total === 0 ? (
        <EmptyState icon="event_available" message="Nothing due this week" />
      ) : (
        <div>
          <Group label="Today" items={calendar.today} />
          <Group label="Tomorrow" items={calendar.tomorrow} />
          <Group label="This Week" items={calendar.thisWeek} />
        </div>
      )}
    </WidgetCard>
  )
}
