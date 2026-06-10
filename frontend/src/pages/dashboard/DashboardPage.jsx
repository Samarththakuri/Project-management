import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Avatar, ProgressBar } from '../../components/ui'
import useAuthStore from '../../store/authStore'
import { getProjects } from '../../api/projects.api'
import { getProjectDashboard } from '../../api/dashboard.api'

function useCountUp(target, duration = 1200) {
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

function KpiCard({ label, value, unit, icon, accent }) {
  const count = useCountUp(value)
  return (
    <div className="bg-surface-container border border-outline-variant p-6 flex flex-col gap-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-outline-variant" />
      <div className="flex items-center justify-between">
        <p className="text-mono-label font-mono text-on-surface-variant uppercase tracking-widest">
          {label}
        </p>
        <span
          className={`material-symbols-outlined text-[20px] select-none ${accent ? 'text-primary-fixed-dim' : 'text-on-surface-variant'}`}
        >
          {icon}
        </span>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-headline-lg font-geist text-on-surface tabular-nums">{count}</span>
        {unit && (
          <span className="text-mono-label font-mono text-on-surface-variant uppercase tracking-widest mb-1">
            {unit}
          </span>
        )}
      </div>
    </div>
  )
}

const MOCK_ACTIVITY = [
  {
    id: 1,
    user: 'Ada L.',
    action: 'moved task',
    target: 'Auth middleware',
    detail: 'to In Progress',
    time: '2m ago',
    icon: 'swap_horiz',
  },
  {
    id: 2,
    user: 'You',
    action: 'created task',
    target: 'API rate limiting',
    detail: '',
    time: '14m ago',
    icon: 'add_circle',
  },
  {
    id: 3,
    user: 'Ravi K.',
    action: 'completed',
    target: 'DB schema migration',
    detail: '',
    time: '1h ago',
    icon: 'check_circle',
  },
  {
    id: 4,
    user: 'Maya S.',
    action: 'commented on',
    target: 'CI pipeline setup',
    detail: '',
    time: '3h ago',
    icon: 'chat_bubble',
  },
  {
    id: 5,
    user: 'Ada L.',
    action: 'added member',
    target: 'Project Alpha',
    detail: '',
    time: '5h ago',
    icon: 'person_add',
  },
]

const MOCK_QUEUE = [
  { id: 'TK-042', title: 'Implement JWT refresh rotation', priority: 'error', status: 'todo' },
  { id: 'TK-038', title: 'Add pagination to /tasks endpoint', priority: 'warning', status: 'in_progress' },
  { id: 'TK-031', title: 'Write integration tests for auth flow', priority: 'default', status: 'todo' },
  { id: 'TK-027', title: 'Update API docs for v2 endpoints', priority: 'default', status: 'todo' },
]

const MOCK_SCHEDULE = [
  { time: '10:00', label: 'Sprint review — Alpha team', accent: true },
  { time: '14:00', label: 'Architecture discussion', accent: false },
  { time: '16:30', label: 'Deploy window: staging', accent: true },
]

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const [projects, setProjects] = useState([])
  const [kpis, setKpis] = useState({ todoTasks: 0, inProgressTasks: 0, overdueTasks: 0, completedTasks: 0 })

  useEffect(() => {
    getProjects()
      .then(async (res) => {
        const fetched = res.data.data || []
        setProjects(fetched)
        if (!fetched.length) return
        const results = await Promise.allSettled(fetched.map((p) => getProjectDashboard(p._id)))
        const totals = results.reduce(
          (acc, r) => {
            if (r.status !== 'fulfilled') return acc
            const d = r.value.data.data
            return {
              todoTasks: acc.todoTasks + d.todoTasks,
              inProgressTasks: acc.inProgressTasks + d.inProgressTasks,
              overdueTasks: acc.overdueTasks + d.overdueTasks,
              completedTasks: acc.completedTasks + d.completedTasks,
            }
          },
          { todoTasks: 0, inProgressTasks: 0, overdueTasks: 0, completedTasks: 0 },
        )
        setKpis(totals)
      })
      .catch(() => {})
  }, [])

  return (
    <div className="max-w-container-max mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-mono-label font-mono text-on-surface-variant uppercase tracking-widest mb-1">
          Dashboard
        </p>
        <h1 className="text-headline-lg font-geist text-on-surface">
          {user?.fullName ? `Welcome back, ${user.fullName.split(' ')[0]}.` : 'Overview'}
        </h1>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-gutter mb-8">
        <KpiCard label="Open Tasks" value={kpis.todoTasks} icon="radio_button_unchecked" />
        <KpiCard label="In Progress" value={kpis.inProgressTasks} icon="timelapse" accent />
        <KpiCard label="Overdue" value={kpis.overdueTasks} icon="warning" />
        <KpiCard label="Completed" value={kpis.completedTasks} icon="check_circle" />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-3 gap-gutter">
        {/* Recent Activity — spans 2 cols */}
        <div className="col-span-2 bg-surface-container border border-outline-variant">
          <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between">
            <p className="text-mono-label font-mono text-on-surface uppercase tracking-widest">
              Recent Activity
            </p>
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant select-none">
              history
            </span>
          </div>
          <ul>
            {MOCK_ACTIVITY.map((item, i) => (
              <li
                key={item.id}
                className={`flex items-start gap-4 px-5 py-3.5 ${i < MOCK_ACTIVITY.length - 1 ? 'border-b border-outline-variant' : ''}`}
              >
                <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center bg-surface-container-high mt-0.5">
                  <span className="material-symbols-outlined text-[15px] text-on-surface-variant select-none">
                    {item.icon}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-body-md font-geist text-on-surface">
                    <span className="text-primary-fixed-dim">{item.user}</span>{' '}
                    <span className="text-on-surface-variant">{item.action}</span>{' '}
                    <span className="font-medium">{item.target}</span>{' '}
                    {item.detail && (
                      <span className="text-on-surface-variant">{item.detail}</span>
                    )}
                  </p>
                </div>
                <span className="text-mono-label font-mono text-on-surface-variant flex-shrink-0">
                  {item.time}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Right column: Your Queue + Today's Schedule */}
        <div className="flex flex-col gap-gutter">
          {/* Your Queue */}
          <div className="bg-surface-container border border-outline-variant flex-1">
            <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between">
              <p className="text-mono-label font-mono text-on-surface uppercase tracking-widest">
                Your Queue
              </p>
              <Badge variant="primary">{MOCK_QUEUE.length}</Badge>
            </div>
            <ul>
              {MOCK_QUEUE.map((task, i) => (
                <li
                  key={task.id}
                  className={`flex items-start gap-3 px-5 py-3 ${i < MOCK_QUEUE.length - 1 ? 'border-b border-outline-variant' : ''}`}
                >
                  <Badge variant={task.priority} className="flex-shrink-0 mt-0.5">
                    {task.id}
                  </Badge>
                  <p className="text-body-md font-geist text-on-surface leading-snug">
                    {task.title}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {/* Today's Schedule */}
          <div className="bg-surface-container border border-outline-variant">
            <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between">
              <p className="text-mono-label font-mono text-on-surface uppercase tracking-widest">
                Today's Schedule
              </p>
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant select-none">
                calendar_today
              </span>
            </div>
            <ul>
              {MOCK_SCHEDULE.map((item, i) => (
                <li
                  key={i}
                  className={`flex items-center gap-4 px-5 py-3 ${i < MOCK_SCHEDULE.length - 1 ? 'border-b border-outline-variant' : ''}`}
                >
                  <span className="text-mono-label font-mono text-on-surface-variant flex-shrink-0 w-10">
                    {item.time}
                  </span>
                  <div
                    className={`w-0.5 h-8 flex-shrink-0 ${item.accent ? 'bg-primary-fixed-dim' : 'bg-outline-variant'}`}
                  />
                  <p className="text-body-md font-geist text-on-surface">{item.label}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Projects overview */}
      {projects.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <p className="text-mono-label font-mono text-on-surface uppercase tracking-widest">
              Active Projects
            </p>
            <Link
              to="/projects"
              className="text-mono-label font-mono text-primary-fixed-dim hover:text-primary-fixed uppercase tracking-widest transition-colors"
            >
              View All
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-gutter">
            {projects.slice(0, 3).map((p) => (
              <Link
                key={p._id}
                to={`/projects/${p._id}`}
                className="bg-surface-container border border-outline-variant p-5 hover:border-primary-fixed-dim hover:bg-surface-container-high transition-colors group"
              >
                <p className="text-headline-sm font-geist text-on-surface mb-1">{p.name}</p>
                <p className="text-body-md font-geist text-on-surface-variant line-clamp-2 mb-4">
                  {p.description || 'No description'}
                </p>
                <ProgressBar value={0} />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
