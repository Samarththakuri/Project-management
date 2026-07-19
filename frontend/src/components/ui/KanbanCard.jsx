import { Badge, Avatar } from '.'

const priorityVariant = { high: 'error', critical: 'error', medium: 'warning', low: 'default', normal: 'default' }

export default function KanbanCard({ task, onClick, dragListeners, dragAttributes, isDragging }) {
  return (
    <div
      onClick={onClick}
      className={`bg-surface-container-high border border-outline-variant p-4 cursor-pointer select-none transition-all duration-150 hover:-translate-y-[2px] hover:border-primary-fixed hover:shadow-[0_0_0_1px_theme(colors.primary-fixed/30%)] ${isDragging ? 'opacity-50 rotate-1' : ''}`}
      {...dragListeners}
      {...dragAttributes}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <Badge variant={priorityVariant[task.priority] || 'default'}>
          {task.priority || 'medium'}
        </Badge>
        <span className="text-mono-label font-mono text-on-surface-variant flex-shrink-0">
          TK-{String(task._id || '').slice(-4).toUpperCase()}
        </span>
      </div>

      <p className="text-body-md font-geist text-on-surface leading-snug mb-3">{task.title}</p>

      <div className="flex items-center justify-between">
        <span />
        {task.assignee && (
          <Avatar
            src={task.assignee?.avatar?.url ?? task.assignee?.avatar ?? null}
            name={task.assignee?.fullName || task.assignee?.username || ''}
            size="sm"
          />
        )}
      </div>
    </div>
  )
}
