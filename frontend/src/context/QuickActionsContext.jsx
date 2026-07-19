import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Modal, Button, Input, Textarea, Select } from '../components/ui'
import CommandPalette from '../components/ui/CommandPalette'
import { getProjects, createProject, addMember } from '../api/projects.api'
import { createTask } from '../api/tasks.api'

const QuickActionsContext = createContext(null)

// eslint-disable-next-line react-refresh/only-export-components
export function useQuickActions() {
  const ctx = useContext(QuickActionsContext)
  if (!ctx) throw new Error('useQuickActions must be used within QuickActionsProvider')
  return ctx
}

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]
const ROLES = [
  { value: 'member', label: 'Member' },
  { value: 'project_admin', label: 'Project Admin' },
  { value: 'admin', label: 'Admin' },
]

function ErrorBox({ children }) {
  if (!children) return null
  return (
    <div className="mb-4 px-4 py-3 border border-error bg-error-container/20 text-error text-body-md font-geist">
      {children}
    </div>
  )
}

function CreateProjectModal({ onClose, onDone }) {
  const [form, setForm] = useState({ name: '', description: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!form.name.trim()) return setErr('Project name is required')
    setBusy(true); setErr('')
    try {
      await createProject(form)
      onDone()
      onClose()
    } catch (e2) {
      setErr(e2.response?.data?.message || 'Failed to create project')
    } finally { setBusy(false) }
  }

  return (
    <Modal isOpen onClose={onClose} title="New Project" maxWidth="max-w-lg">
      <ErrorBox>{err}</ErrorBox>
      <form onSubmit={submit} className="flex flex-col gap-5">
        <Input label="Project Name" icon="folder" placeholder="e.g. Platform v3"
          value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Textarea label="Description" rows={3} placeholder="What is this project about?"
          value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-outline-variant">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create Project'}</Button>
        </div>
      </form>
    </Modal>
  )
}

function ProjectSelect({ projects, value, onChange }) {
  return (
    <Select
      label="Project"
      placeholder="Select a project"
      options={projects.map((p) => ({ value: p._id, label: p.name }))}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

function CreateTaskModal({ onClose, onDone, projects }) {
  const [form, setForm] = useState(() => ({
    project: projects[0]?._id || '',
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
  }))
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!form.project) return setErr('Select a project')
    if (!form.title.trim()) return setErr('Task title is required')
    setBusy(true); setErr('')
    try {
      await createTask(form.project, {
        title: form.title,
        description: form.description || undefined,
        priority: form.priority,
        dueDate: form.dueDate || undefined,
      })
      onDone()
      onClose()
    } catch (e2) {
      setErr(e2.response?.data?.message || 'Failed to create task')
    } finally { setBusy(false) }
  }

  return (
    <Modal isOpen onClose={onClose} title="New Task" maxWidth="max-w-lg">
      <ErrorBox>{err}</ErrorBox>
      {!projects.length ? (
        <p className="text-body-md font-geist text-on-surface-variant">Create a project first.</p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-5">
          <ProjectSelect projects={projects} value={form.project} onChange={(v) => setForm({ ...form, project: v })} />
          <Input label="Title" icon="task_alt" placeholder="What needs doing?"
            value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Textarea label="Description" rows={2}
            value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Priority" options={PRIORITIES} value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })} />
            <Input label="Due Date" type="date"
              value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-outline-variant">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create Task'}</Button>
          </div>
        </form>
      )}
    </Modal>
  )
}

function InviteMemberModal({ onClose, onDone, projects }) {
  const [form, setForm] = useState(() => ({ project: projects[0]?._id || '', email: '', role: 'member' }))
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!form.project) return setErr('Select a project')
    if (!form.email.trim()) return setErr('Email is required')
    setBusy(true); setErr('')
    try {
      await addMember(form.project, { email: form.email, role: form.role })
      onDone()
      onClose()
    } catch (e2) {
      setErr(e2.response?.data?.message || 'Failed to add member')
    } finally { setBusy(false) }
  }

  return (
    <Modal isOpen onClose={onClose} title="Invite Member" maxWidth="max-w-lg">
      <ErrorBox>{err}</ErrorBox>
      {!projects.length ? (
        <p className="text-body-md font-geist text-on-surface-variant">Create a project first.</p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-5">
          <ProjectSelect projects={projects} value={form.project} onChange={(v) => setForm({ ...form, project: v })} />
          <Input label="Email" icon="mail" type="email" placeholder="teammate@company.com"
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Select label="Role" options={ROLES} value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })} />
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-outline-variant">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? 'Adding…' : 'Add Member'}</Button>
          </div>
        </form>
      )}
    </Modal>
  )
}

export function QuickActionsProvider({ children }) {
  const [open, setOpen] = useState(null) // 'project' | 'task' | 'invite' | null
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [projects, setProjects] = useState([])
  const [refreshKey, setRefreshKey] = useState(0)

  const loadProjects = useCallback(() => {
    getProjects()
      .then((res) => setProjects(res.data.data || []))
      .catch(() => {})
  }, [])

  useEffect(() => { loadProjects() }, [loadProjects])

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
    loadProjects()
  }, [loadProjects])

  // Global ⌘K / Ctrl+K shortcut.
  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const value = useMemo(
    () => ({
      refreshKey,
      projects,
      openCreateProject: () => setOpen('project'),
      openCreateTask: () => setOpen('task'),
      openInviteMember: () => setOpen('invite'),
      openCommandPalette: () => setPaletteOpen(true),
    }),
    [refreshKey, projects],
  )

  const quickActions = [
    { icon: 'create_new_folder', label: 'Create Project', onSelect: () => setOpen('project') },
    { icon: 'add_task', label: 'Create Task', onSelect: () => setOpen('task') },
    { icon: 'person_add', label: 'Invite Member', onSelect: () => setOpen('invite') },
  ]

  const close = () => setOpen(null)

  return (
    <QuickActionsContext.Provider value={value}>
      {children}
      {open === 'project' && <CreateProjectModal onClose={close} onDone={refresh} />}
      {open === 'task' && <CreateTaskModal onClose={close} onDone={refresh} projects={projects} />}
      {open === 'invite' && <InviteMemberModal onClose={close} onDone={refresh} projects={projects} />}
      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} quickActions={quickActions} />
    </QuickActionsContext.Provider>
  )
}
