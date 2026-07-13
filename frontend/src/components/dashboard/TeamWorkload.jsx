import { Avatar, Skeleton } from '../ui'
import WidgetCard, { EmptyState } from './WidgetCard'
import { avatarUrl } from '../../utils/format'

function MemberRow({ row, max, last }) {
  const user = row.user || {}
  const name = user.fullName || user.username || 'Unknown'
  const pct = max > 0 ? Math.round((row.open / max) * 100) : 0
  return (
    <li className={`flex items-center gap-3 px-5 py-3 ${last ? '' : 'border-b border-outline-variant'}`}>
      <Avatar src={avatarUrl(user.avatar)} name={name} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <p className="text-body-md font-geist text-on-surface truncate">{name}</p>
          <span className="text-mono-label font-mono text-on-surface-variant tabular-nums flex-shrink-0">
            {row.open} open{row.overdue > 0 ? ` · ${row.overdue} overdue` : ''}
          </span>
        </div>
        <div className="w-full h-[2px] bg-surface-container-high">
          <div
            className={`h-full transition-all duration-300 ${row.overdue > 0 ? 'bg-error' : 'bg-primary-fixed-dim'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </li>
  )
}

export default function TeamWorkload({ workload, loading }) {
  const rows = workload?.tasksPerMember || []
  const maxOpen = rows.reduce((m, r) => Math.max(m, r.open), 0)

  return (
    <WidgetCard
      title="Team Workload"
      headerRight={
        !loading && workload?.blockedTasks > 0 ? (
          <span className="text-mono-label font-mono text-error uppercase tracking-widest">
            {workload.blockedTasks} blocked
          </span>
        ) : null
      }
    >
      {loading ? (
        <ul>
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="flex items-center gap-3 px-5 py-3.5 border-b border-outline-variant last:border-0">
              <Skeleton className="h-6 w-6" />
              <div className="flex-1 flex flex-col gap-2">
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-[2px] w-full" />
              </div>
            </li>
          ))}
        </ul>
      ) : !rows.length ? (
        <EmptyState icon="groups" message="No assigned work yet" />
      ) : (
        <ul>
          {rows.slice(0, 6).map((row, i) => (
            <MemberRow key={row._id} row={row} max={maxOpen} last={i === Math.min(rows.length, 6) - 1} />
          ))}
        </ul>
      )}
    </WidgetCard>
  )
}
