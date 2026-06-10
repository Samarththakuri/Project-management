import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Avatar, Badge, ProgressBar, Button } from '../../components/ui'
import { getProjectById, getMembers, addMember, updateMemberRole, removeMember } from '../../api/projects.api'
import { getProjectTasks } from '../../api/tasks.api'
import useAuthStore from '../../store/authStore'

export default function ProjectOverviewPage() {
  const { projectId } = useParams()
  const { user } = useAuthStore()
  const [project, setProject] = useState(null)
  const [members, setMembers] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [myRole, setMyRole] = useState(null)

  // Add member form state
  const [addingMember, setAddingMember] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)

  function fetchData() {
    return Promise.all([
      getProjectById(projectId),
      getMembers(projectId),
      getProjectTasks(projectId),
    ])
      .then(([pRes, mRes, tRes]) => {
        const fetchedMembers = mRes.data.data || []
        setProject(pRes.data.data)
        setMembers(fetchedMembers)
        setTasks(tRes.data.data || [])
        const me = fetchedMembers.find((m) => m.user?._id === user?._id)
        setMyRole(me?.role || null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchData()
  }, [projectId])

  const isAdmin = myRole === 'admin'
  const canManageMembers = myRole === 'admin' || myRole === 'project_admin'

  async function handleInvite(e) {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviteLoading(true)
    setInviteError('')
    try {
      await addMember(projectId, { email: inviteEmail.trim() })
      setInviteEmail('')
      setAddingMember(false)
      const mRes = await getMembers(projectId)
      const updated = mRes.data.data || []
      setMembers(updated)
    } catch (err) {
      setInviteError(err?.response?.data?.message || 'Failed to add member')
    } finally {
      setInviteLoading(false)
    }
  }

  async function handleRoleChange(memberId, newRole) {
    try {
      await updateMemberRole(projectId, memberId, { role: newRole })
      setMembers((prev) =>
        prev.map((m) => (m._id === memberId ? { ...m, role: newRole } : m)),
      )
    } catch {}
  }

  async function handleRemoveMember(memberId) {
    try {
      await removeMember(projectId, memberId)
      setMembers((prev) => prev.filter((m) => m._id !== memberId))
    } catch {}
  }

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

        {/* Team — row-span-2 */}
        <div className="row-span-2 bg-surface-container border border-outline-variant flex flex-col">
          <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between flex-shrink-0">
            <p className="text-mono-label font-mono text-on-surface uppercase tracking-widest">
              Team
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="primary">{members.length}</Badge>
              {canManageMembers && (
                <button
                  onClick={() => { setAddingMember((v) => !v); setInviteError('') }}
                  className="text-on-surface-variant hover:text-on-surface transition-colors"
                  title="Add member"
                >
                  <span className="material-symbols-outlined text-[18px] select-none">
                    person_add
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Invite form */}
          {addingMember && (
            <form onSubmit={handleInvite} className="px-5 py-3 border-b border-outline-variant flex flex-col gap-2 flex-shrink-0">
              <input
                autoFocus
                type="email"
                placeholder="Email address..."
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full bg-transparent text-body-md font-geist text-on-surface placeholder:text-on-surface-variant border border-outline-variant px-3 py-2 focus:outline-none focus:border-primary-fixed"
              />
              {inviteError && (
                <p className="text-mono-label font-mono text-error uppercase tracking-widest">
                  {inviteError}
                </p>
              )}
              <div className="flex items-center gap-2">
                <Button type="submit" size="sm" disabled={inviteLoading}>
                  {inviteLoading ? 'Adding…' : 'Add'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setAddingMember(false); setInviteEmail(''); setInviteError('') }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {/* Member list */}
          <ul className="overflow-y-auto flex-1">
            {members.map((m, i) => {
              const isSelf = m.user?._id === user?._id
              const isThisAdmin = m.role === 'admin'
              return (
                <li
                  key={m._id || i}
                  className={`flex items-center gap-3 px-5 py-3 ${i < members.length - 1 ? 'border-b border-outline-variant' : ''}`}
                >
                  <Avatar src={m.user?.avatar} name={m.user?.fullName || ''} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-body-md font-geist text-on-surface truncate">
                      {m.user?.fullName || m.user?.username || 'Unknown'}
                      {isSelf && (
                        <span className="text-on-surface-variant text-mono-label font-mono ml-1">(you)</span>
                      )}
                    </p>
                    {/* Role display / change */}
                    {isAdmin && !isSelf && !isThisAdmin ? (
                      <select
                        value={m.role}
                        onChange={(e) => handleRoleChange(m._id, e.target.value)}
                        className="mt-0.5 bg-transparent text-mono-label font-mono text-on-surface-variant uppercase tracking-widest border-none focus:outline-none cursor-pointer"
                      >
                        <option value="member">MEMBER</option>
                        <option value="project_admin">PROJECT_ADMIN</option>
                      </select>
                    ) : (
                      <p className="text-mono-label font-mono text-on-surface-variant uppercase tracking-widest">
                        {m.role}
                      </p>
                    )}
                  </div>
                  {/* Remove button — admin only, not self, not another admin */}
                  {isAdmin && !isSelf && !isThisAdmin && (
                    <button
                      onClick={() => handleRemoveMember(m._id)}
                      className="text-on-surface-variant hover:text-error transition-colors flex-shrink-0"
                      title="Remove member"
                    >
                      <span className="material-symbols-outlined text-[16px] select-none">
                        person_remove
                      </span>
                    </button>
                  )}
                </li>
              )
            })}
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
