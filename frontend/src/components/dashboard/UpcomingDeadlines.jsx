import { Link } from 'react-router-dom'
import { Badge, Skeleton } from '../ui'
import WidgetCard, { EmptyState } from './WidgetCard'
import { shortDate, priorityVariant } from '../../utils/format'

function DeadlineRow({ item, last }) {
  const urgent = item.daysRemaining <= 1
  return (
    <Link
      to={item.project?._id ? `/projects/${item.project._id}/board` : '#'}
      className={`flex items-center gap-4 px-5 py-3 hover:bg-surface-container-high transition-colors ${last ? '' : 'border-b border-outline-variant'}`}
    >
      <div className="flex flex-col items-center justify-center w-11 flex-shrink-0">
        <span className={`text-headline-sm font-geist tabular-nums leading-none ${urgent ? 'text-error' : 'text-on-surface'}`}>
          {item.daysRemaining}
        </span>
        <span className="text-mono-label font-mono text-on-surface-variant uppercase mt-0.5">
          {item.daysRemaining === 1 ? 'day' : 'days'}
        </span>
      </div>
      <div className={`w-0.5 h-9 flex-shrink-0 ${urgent ? 'bg-error' : 'bg-primary-fixed-dim'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-body-md font-geist text-on-surface leading-snug truncate">{item.title}</p>
        <p className="text-mono-label font-mono text-on-surface-variant uppercase tracking-widest mt-0.5 truncate">
          {item.project?.name} · {shortDate(item.dueDate)}
        </p>
      </div>
      <Badge variant={priorityVariant(item.priority)} className="flex-shrink-0">
        {item.priority}
      </Badge>
    </Link>
  )
}

export default function UpcomingDeadlines({ deadlines, loading }) {
  return (
    <WidgetCard title="Upcoming Deadlines" icon="event_upcoming">
      {loading ? (
        <div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-outline-variant last:border-0">
              <Skeleton className="h-9 w-11" />
              <div className="flex-1 flex flex-col gap-2">
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-2.5 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : !deadlines?.length ? (
        <EmptyState icon="event_available" message="No upcoming deadlines" />
      ) : (
        <div>
          {deadlines.map((d, i) => (
            <DeadlineRow key={d._id} item={d} last={i === deadlines.length - 1} />
          ))}
        </div>
      )}
    </WidgetCard>
  )
}
