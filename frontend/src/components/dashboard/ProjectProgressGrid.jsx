import { Link } from 'react-router-dom'
import { Avatar, Badge, ProgressBar, Skeleton } from '../ui'
import { EmptyState } from './WidgetCard'
import {
  avatarUrl,
  healthColor,
  healthLabel,
  humanizeAction,
  priorityVariant,
  shortDate,
  timeAgo,
} from '../../utils/format'

function ProjectCard({ p }) {
  return (
    <Link
      to={`/projects/${p._id}`}
      className="bg-surface-container border border-outline-variant p-5 hover:border-primary-fixed-dim hover:bg-surface-container-high transition-colors group flex flex-col"
    >
      <div className="flex items-start justify-between gap-3 mb-1">
        <p className="text-headline-sm font-geist text-on-surface truncate">{p.name}</p>
        <div className="flex items-center gap-1.5 flex-shrink-0" title={healthLabel(p.health)}>
          <span className={`w-2 h-2 rounded-full ${healthColor(p.health)}`} />
          <span className="text-mono-label font-mono text-on-surface-variant uppercase tracking-widest">
            {healthLabel(p.health)}
          </span>
        </div>
      </div>

      <p className="text-body-md font-geist text-on-surface-variant line-clamp-2 mb-4 min-h-[2.5rem]">
        {p.description || 'No description'}
      </p>

      <div className="flex items-center justify-between mb-1.5">
        <span className="text-mono-label font-mono text-on-surface-variant uppercase tracking-widest">
          {p.completedTasks}/{p.totalTasks} tasks
        </span>
        <span className="text-mono-label font-mono text-primary-fixed-dim tabular-nums">{p.progress}%</span>
      </div>
      <ProgressBar value={p.progress} className="mb-4" />

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge variant={priorityVariant(p.priority)}>{p.priority}</Badge>
          {p.overdueTasks > 0 && <Badge variant="error">{p.overdueTasks} overdue</Badge>}
        </div>
        {p.dueDate && (
          <span className="text-mono-label font-mono text-on-surface-variant flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px] select-none leading-none">flag</span>
            {shortDate(p.dueDate)}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-outline-variant mt-auto">
        <div className="flex items-center -space-x-1.5">
          {(p.members || []).slice(0, 4).map((m) => (
            <div key={m._id} className="ring-1 ring-surface-container">
              <Avatar src={avatarUrl(m.avatar)} name={m.fullName || m.username} size="sm" />
            </div>
          ))}
          {p.memberCount > 4 && (
            <span className="w-6 h-6 flex items-center justify-center bg-surface-container-high text-mono-label font-mono text-on-surface-variant ring-1 ring-surface-container">
              +{p.memberCount - 4}
            </span>
          )}
        </div>
        {p.latestActivity && (
          <span className="text-mono-label font-mono text-on-surface-variant truncate max-w-[50%] text-right">
            {humanizeAction(p.latestActivity.action).split(' ').slice(0, 2).join(' ')} · {timeAgo(p.latestActivity.createdAt)}
          </span>
        )}
      </div>
    </Link>
  )
}

export default function ProjectProgressGrid({ projects, loading }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-mono-label font-mono text-on-surface uppercase tracking-widest">Active Projects</p>
        <Link
          to="/projects"
          className="text-mono-label font-mono text-primary-fixed-dim hover:text-primary-fixed uppercase tracking-widest transition-colors"
        >
          View All
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-gutter">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-surface-container border border-outline-variant p-5 flex flex-col gap-3">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-[2px] w-full" />
              <Skeleton className="h-6 w-2/3" />
            </div>
          ))}
        </div>
      ) : !projects?.length ? (
        <div className="bg-surface-container border border-outline-variant">
          <EmptyState icon="folder_open" message="No projects yet — create one to get started" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-gutter">
          {projects.map((p) => (
            <ProjectCard key={p._id} p={p} />
          ))}
        </div>
      )}
    </div>
  )
}
