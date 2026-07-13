import { useEffect, useState } from 'react'
import { Skeleton } from '../ui'

function useCountUp(target, duration = 1000) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    let start = 0
    const step = target / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= target) {
        setCount(target)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration])
  return count
}

function KpiTile({ label, value, icon, accent, tone }) {
  const count = useCountUp(value)
  const toneClass =
    tone === 'error' ? 'text-error' : tone === 'warn' ? 'text-[#d9a441]' : accent ? 'text-primary-fixed-dim' : 'text-on-surface-variant'
  return (
    <div className="bg-surface-container border border-outline-variant p-5 flex flex-col gap-3 relative overflow-hidden group hover:border-primary-fixed-dim transition-colors">
      <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-outline-variant group-hover:border-primary-fixed-dim transition-colors" />
      <div className="flex items-center justify-between">
        <p className="text-mono-label font-mono text-on-surface-variant uppercase tracking-widest">{label}</p>
        <span className={`material-symbols-outlined text-[18px] select-none ${toneClass}`}>{icon}</span>
      </div>
      <span className="text-headline-lg font-geist text-on-surface tabular-nums">{count}</span>
    </div>
  )
}

const TILES = [
  { key: 'openTasks', label: 'Open Tasks', icon: 'radio_button_unchecked', accent: true },
  { key: 'tasksDueToday', label: 'Due Today', icon: 'today' },
  { key: 'overdueTasks', label: 'Overdue', icon: 'warning', tone: 'error' },
  { key: 'tasksInReview', label: 'In Review', icon: 'rate_review', tone: 'warn' },
  { key: 'completedTasks', label: 'Completed', icon: 'check_circle' },
  { key: 'activeProjects', label: 'Active Projects', icon: 'folder_open', accent: true },
  { key: 'criticalTasks', label: 'Critical', icon: 'priority_high', tone: 'error' },
  { key: 'unreadNotifications', label: 'Unread', icon: 'notifications' },
]

export default function SummaryGrid({ summary, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-gutter">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-surface-container border border-outline-variant p-5 flex flex-col gap-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-12" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-gutter">
      {TILES.map((t) => (
        <KpiTile
          key={t.key}
          label={t.label}
          value={summary?.[t.key] ?? 0}
          icon={t.icon}
          accent={t.accent}
          tone={t.tone}
        />
      ))}
    </div>
  )
}
