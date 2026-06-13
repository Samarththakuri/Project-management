import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getProjectCalendar } from '../../api/tasks.api'
import { Badge, Avatar } from '../../components/ui'

const PRIORITY_VARIANT = {
  critical: 'error',
  high: 'error',
  medium: 'warning',
  low: 'default',
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function buildCalendarDays(year, month) {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const days = []
  // pad start
  for (let i = 0; i < first.getDay(); i++) {
    days.push(null)
  }
  for (let d = 1; d <= last.getDate(); d++) {
    days.push(new Date(year, month, d))
  }
  // pad end to complete last row
  while (days.length % 7 !== 0) days.push(null)
  return days
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/* ---- Task detail popover ---- */
function TaskPopover({ task, onClose }) {
  const avatarSrc = task.assignee?.avatar?.url ?? task.assignee?.avatar ?? null

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 sm:inset-auto sm:right-6 sm:bottom-6 z-50 w-full sm:w-80 bg-surface-container-low border border-outline-variant shadow-2xl p-5 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={PRIORITY_VARIANT[task.priority] || 'default'}>
              {task.priority}
            </Badge>
            <Badge
              variant={
                task.status === 'in_progress'
                  ? 'primary'
                  : task.status === 'done'
                  ? 'default'
                  : 'default'
              }
            >
              {task.status.replace(/_/g, ' ')}
            </Badge>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface flex-shrink-0">
            <span className="material-symbols-outlined text-[18px] select-none">close</span>
          </button>
        </div>

        <h3 className="text-headline-sm font-geist text-on-surface">{task.title}</h3>

        {task.description && (
          <p className="text-body-md font-geist text-on-surface-variant leading-relaxed">
            {task.description}
          </p>
        )}

        {task.dueDate && (
          <div>
            <p className="text-mono-label font-mono text-on-surface-variant uppercase tracking-widest mb-1">
              Due
            </p>
            <p className="text-body-md font-geist text-on-surface">
              {new Date(task.dueDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
        )}

        {task.assignee && (
          <div className="flex items-center gap-3">
            <Avatar src={avatarSrc} name={task.assignee.fullName || task.assignee.username || ''} size="sm" />
            <p className="text-body-md font-geist text-on-surface">
              {task.assignee.fullName || task.assignee.username}
            </p>
          </div>
        )}
      </div>
    </>
  )
}

/* ---- Main Calendar Page ---- */
export default function CalendarView() {
  const { projectId } = useParams()
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState(null)

  useEffect(() => {
    setLoading(true)
    const from = new Date(year, month, 1).toISOString()
    const to = new Date(year, month + 1, 0, 23, 59, 59, 999).toISOString()
    getProjectCalendar(projectId, from, to)
      .then((res) => setTasks(res.data.data || []))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false))
  }, [projectId, year, month])

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11) }
    else setMonth((m) => m - 1)
  }

  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0) }
    else setMonth((m) => m + 1)
  }

  const calDays = buildCalendarDays(year, month)

  function tasksForDay(day) {
    if (!day) return []
    return tasks.filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), day))
  }

  return (
    <div className="max-w-container-max mx-auto flex flex-col">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-shrink-0">
        <div>
          <p className="text-mono-label font-mono text-on-surface-variant uppercase tracking-widest mb-1">
            Calendar
          </p>
          <h1 className="text-headline-md font-geist text-on-surface">
            Task Due Dates
          </h1>
        </div>

        {/* Month navigation */}
        <div className="flex items-center gap-3">
          <button
            onClick={prevMonth}
            className="text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[20px] select-none">chevron_left</span>
          </button>
          <p className="text-body-lg font-geist text-on-surface w-36 text-center">
            {MONTH_NAMES[month]} {year}
          </p>
          <button
            onClick={nextMonth}
            className="text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[20px] select-none">chevron_right</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <p className="text-mono-label font-mono text-on-surface-variant uppercase tracking-widest animate-pulse">
            Loading calendar...
          </p>
        </div>
      ) : (
        <div className="flex-1">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-2 text-center text-mono-label font-mono text-on-surface-variant uppercase tracking-widest">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 border-l border-t border-outline-variant">
            {calDays.map((day, i) => {
              const dayTasks = tasksForDay(day)
              const isToday = day && isSameDay(day, today)
              return (
                <div
                  key={i}
                  className="border-r border-b border-outline-variant min-h-[96px] p-2 flex flex-col gap-1"
                >
                  {day && (
                    <>
                      <span
                        className={`text-mono-label font-mono self-start mb-1 w-6 h-6 flex items-center justify-center ${
                          isToday
                            ? 'bg-primary-fixed-dim text-on-primary-fixed'
                            : 'text-on-surface-variant'
                        }`}
                      >
                        {day.getDate()}
                      </span>
                      {dayTasks.slice(0, 3).map((task) => (
                        <button
                          key={task._id}
                          onClick={() => setSelectedTask(task)}
                          className={`w-full text-left px-1.5 py-0.5 text-mono-label font-mono truncate transition-opacity hover:opacity-80 ${
                            task.priority === 'critical' || task.priority === 'high'
                              ? 'bg-error-container text-on-error-container'
                              : task.priority === 'medium'
                              ? 'bg-secondary-container text-on-secondary-container'
                              : 'bg-surface-container-high text-on-surface-variant'
                          }`}
                        >
                          {task.title}
                        </button>
                      ))}
                      {dayTasks.length > 3 && (
                        <span className="text-mono-label font-mono text-on-surface-variant px-1">
                          +{dayTasks.length - 3} more
                        </span>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Task detail popover */}
      {selectedTask && (
        <TaskPopover task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}
    </div>
  )
}
