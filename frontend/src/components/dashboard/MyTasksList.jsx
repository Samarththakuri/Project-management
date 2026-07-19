import { Link } from 'react-router-dom'
import { Badge, Skeleton } from '../ui'
import WidgetCard, { EmptyState } from './WidgetCard'
import { dueLabel, daysUntil, priorityVariant } from '../../utils/format'

function TaskRow({ task, last }) {
  const overdue = daysUntil(task.dueDate) < 0
  return (
    <Link
      to={task.project?._id ? `/projects/${task.project._id}/board` : '#'}
      className={`block px-5 py-3.5 hover:bg-surface-container-high transition-colors ${last ? '' : 'border-b border-outline-variant'}`}
    >
      <div className="flex items-start gap-3">
        <Badge variant={priorityVariant(task.priority)} className="flex-shrink-0 mt-0.5">
          {task.priority}
        </Badge>
        <div className="flex-1 min-w-0">
          <p className="text-body-md font-geist text-on-surface leading-snug truncate">{task.title}</p>
          <p className="text-mono-label font-mono text-on-surface-variant uppercase tracking-widest mt-1 truncate">
            {task.project?.name || 'No project'}
          </p>
        </div>
        {task.dueDate && (
          <span className={`text-mono-label font-mono flex-shrink-0 mt-0.5 ${overdue ? 'text-error' : 'text-on-surface-variant'}`}>
            {dueLabel(task.dueDate)}
          </span>
        )}
      </div>

      {task.commentsCount > 0 && (
        <div className="mt-2 flex items-center gap-4 text-on-surface-variant">
          <span className="flex items-center gap-1 text-mono-label font-mono">
            <span className="material-symbols-outlined text-[13px] select-none leading-none">chat_bubble</span>
            {task.commentsCount}
          </span>
        </div>
      )}
    </Link>
  )
}

export default function MyTasksList({ tasks, loading }) {
  return (
    <WidgetCard
      title="My Tasks"
      headerRight={
        !loading && tasks?.length ? <Badge variant="primary">{tasks.length}</Badge> : null
      }
    >
      {loading ? (
        <div className="divide-y divide-outline-variant">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-5 py-4 flex items-start gap-3">
              <Skeleton className="h-4 w-12" />
              <div className="flex-1 flex flex-col gap-2">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-2.5 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : !tasks?.length ? (
        <EmptyState icon="task_alt" message="No tasks assigned to you" />
      ) : (
        <div>
          {tasks.map((t, i) => (
            <TaskRow key={t._id} task={t} last={i === tasks.length - 1} />
          ))}
        </div>
      )}
    </WidgetCard>
  )
}
