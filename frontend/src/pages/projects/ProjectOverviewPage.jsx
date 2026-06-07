import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Avatar, Badge, ProgressBar, Button } from '../../components/ui'
import { getProjectById, getMembers } from '../../api/projects.api'
import { getProjectTasks } from '../../api/tasks.api'

export default function ProjectOverviewPage() {
  const { projectId } = useParams()
  const [project, setProject] = useState(null)
  const [members, setMembers] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getProjectById(projectId),
      getMembers(projectId),
      getProjectTasks(projectId),
    ])
      .then(([pRes, mRes, tRes]) => {
        setProject(pRes.data.data)
        setMembers(mRes.data.data || [])
        setTasks(tRes.data.data || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [projectId])

  if (loading) {
    return (
      <div className="max-w-container-max mx-auto grid grid-cols-3 gap-gutter">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={`bg-surface-container border border-outline-variant animate-pulse ${i === 0 ? 'col-span-2 h-48' : 'h-48'}`}
          />
        ))}
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-body-md font-geist text-on-surface-variant">Project not found.</p>
      </div>
    )
  }

  const done = tasks.filter((t) => t.status === 'done').length
  const total = tasks.length
  const progress = total > 0 ? Math.round((done / total) * 100) : 0
  const priorityTasks = tasks.filter((t) => t.status !== 'done').slice(0, 5)
  const recentMembers = members.slice(0, 8)

  return (
    <div className="max-w-container-max mx-auto">
      {/* Project header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-mono-label font-mono text-on-surface-variant uppercase tracking-widest mb-1">
              Project
            </p>
            <h1 className="text-headline-lg font-geist text-on-surface">{project.name}</h1>
            {project.description && (
              <p className="text-body-lg font-geist text-on-surface-variant mt-2 max-w-xl">
                {project.description}
              </p>
            )}
          </div>
          <Link to={`/projects/${projectId}/board`}>
            <Button>
              <span className="material-symbols-outlined text-[16px] select-none leading-none">
                view_kanban
              </span>
              Open Board
            </Button>
          </Link>
        </div>

        {/* Progress + avatars */}
        <div className="flex items-center gap-6 mt-4">
          <div className="flex-1 max-w-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-mono-label font-mono text-on-surface-variant uppercase tracking-widest">
                Progress
              </span>
              <span className="text-mono-label font-mono text-on-surface-variant">
                {progress}%
              </span>
            </div>
            <ProgressBar value={progress} />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5">
              {recentMembers.map((m, i) => (
                <Avatar
                  key={i}
                  src={m.user?.avatar}
                  name={m.user?.fullName || ''}
                  size="sm"
                  className="border-2 border-background"
                />
              ))}
            </div>
            <span className="text-mono-label font-mono text-on-surface-variant">
              {members.length} {members.length === 1 ? 'member' : 'members'}
            </span>
          </div>
        </div>
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-3 grid-rows-2 gap-gutter">
        {/* Priority Tasks — spans 2 cols */}
        <div className="col-span-2 bg-surface-container border border-outline-variant">
          <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between">
            <p className="text-mono-label font-mono text-on-surface uppercase tracking-widest">
              Priority Tasks
            </p>
            <Link
              to={`/projects/${projectId}/board`}
              className="text-mono-label font-mono text-primary-fixed-dim hover:text-primary-fixed uppercase tracking-widest transition-colors"
            >
              View Board
            </Link>
          </div>
          {priorityTasks.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-on-surface-variant text-body-md font-geist">
              No open tasks
            </div>
          ) : (
            <ul>
              {priorityTasks.map((task, i) => (
                <li
                  key={task._id}
                  className={`flex items-center gap-4 px-5 py-3.5 ${i < priorityTasks.length - 1 ? 'border-b border-outline-variant' : ''}`}
                >
                  <Badge
                    variant={
                      task.priority === 'high'
                        ? 'error'
                        : task.priority === 'medium'
                          ? 'warning'
                          : 'default'
                    }
                    className="flex-shrink-0"
                  >
                    {task.priority || 'normal'}
                  </Badge>
                  <p className="flex-1 text-body-md font-geist text-on-surface">{task.title}</p>
                  <Badge
                    variant={task.status === 'in_progress' ? 'primary' : 'default'}
                    className="flex-shrink-0"
                  >
                    {task.status.replace('_', ' ')}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Team */}
        <div className="row-span-2 bg-surface-container border border-outline-variant">
          <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between">
            <p className="text-mono-label font-mono text-on-surface uppercase tracking-widest">
              Team
            </p>
            <Badge variant="primary">{members.length}</Badge>
          </div>
          <ul className="overflow-y-auto max-h-[340px]">
            {members.map((m, i) => (
              <li
                key={i}
                className={`flex items-center gap-3 px-5 py-3 ${i < members.length - 1 ? 'border-b border-outline-variant' : ''}`}
              >
                <Avatar src={m.user?.avatar} name={m.user?.fullName || ''} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-body-md font-geist text-on-surface truncate">
                    {m.user?.fullName || m.user?.username || 'Unknown'}
                  </p>
                  <p className="text-mono-label font-mono text-on-surface-variant uppercase tracking-widest">
                    {m.role}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Task Stats */}
        <div className="col-span-2 bg-surface-container border border-outline-variant p-5">
          <p className="text-mono-label font-mono text-on-surface uppercase tracking-widest mb-4">
            Task Overview
          </p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Todo', value: tasks.filter((t) => t.status === 'todo').length, icon: 'radio_button_unchecked' },
              { label: 'In Progress', value: tasks.filter((t) => t.status === 'in_progress').length, icon: 'pending' },
              { label: 'Done', value: tasks.filter((t) => t.status === 'done').length, icon: 'check_circle' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-surface-container-high border border-outline-variant p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-[16px] text-on-surface-variant select-none">
                    {stat.icon}
                  </span>
                  <span className="text-mono-label font-mono text-on-surface-variant uppercase tracking-widest">
                    {stat.label}
                  </span>
                </div>
                <p className="text-headline-md font-geist text-on-surface tabular-nums">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
