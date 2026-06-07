import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { KanbanCard, Badge, Avatar, Button, Input, Textarea, Select, Checkbox } from '../../components/ui'
import {
  getProjectTasks,
  createTask,
  updateTask,
  updateSubtask,
} from '../../api/tasks.api'

const COLUMNS = [
  { id: 'todo', label: 'Todo', icon: 'radio_button_unchecked' },
  { id: 'in_progress', label: 'In Progress', icon: 'pending' },
  { id: 'done', label: 'Done', icon: 'check_circle' },
]

const addTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  priority: z.string().optional(),
})

/* ---- Sortable card wrapper ---- */
function SortableCard({ task, onClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task._id,
  })
  const style = { transform: CSS.Transform.toString(transform), transition }
  return (
    <div ref={setNodeRef} style={style}>
      <KanbanCard
        task={task}
        onClick={() => onClick(task)}
        dragListeners={listeners}
        dragAttributes={attributes}
        isDragging={isDragging}
      />
    </div>
  )
}

/* ---- Column ---- */
function Column({ column, tasks, onCardClick, onAddTask }) {
  const [adding, setAdding] = useState(false)
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(z.object({ title: z.string().min(1) })),
  })

  async function submit(data) {
    await onAddTask(column.id, data.title)
    reset()
    setAdding(false)
  }

  return (
    <div className="flex flex-col w-72 flex-shrink-0">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="material-symbols-outlined text-[16px] text-on-surface-variant select-none">
          {column.icon}
        </span>
        <p className="text-mono-label font-mono text-on-surface uppercase tracking-widest flex-1">
          {column.label}
        </p>
        <span className="text-mono-label font-mono text-on-surface-variant">{tasks.length}</span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 flex-1">
        <SortableContext items={tasks.map((t) => t._id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableCard key={task._id} task={task} onClick={onCardClick} />
          ))}
        </SortableContext>
      </div>

      {/* Add Task button (only on todo column) */}
      {column.id === 'todo' && (
        <div className="mt-3">
          {adding ? (
            <form onSubmit={handleSubmit(submit)} className="bg-surface-container border border-outline-variant p-3 flex flex-col gap-2">
              <input
                autoFocus
                placeholder="Task title..."
                className="w-full bg-transparent text-body-md font-geist text-on-surface placeholder:text-on-surface-variant focus:outline-none"
                {...register('title')}
              />
              <div className="flex items-center gap-2">
                <Button type="submit" size="sm" disabled={isSubmitting}>
                  Add
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => { setAdding(false); reset() }}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high border border-dashed border-outline-variant transition-colors"
            >
              <span className="material-symbols-outlined text-[16px] select-none">add</span>
              <span className="text-mono-label font-mono uppercase tracking-widest">Add Task</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* ---- Task Detail Drawer ---- */
function TaskDrawer({ task, onClose, onUpdate, projectId }) {
  const [editing, setEditing] = useState(false)
  const [subtasks, setSubtasks] = useState(task?.subTasks || [])

  useEffect(() => {
    setSubtasks(task?.subTasks || [])
  }, [task])

  async function toggleSubtask(subtask) {
    try {
      const res = await updateSubtask(projectId, task._id, subtask._id, {
        isCompleted: !subtask.isCompleted,
      })
      setSubtasks((prev) =>
        prev.map((s) =>
          s._id === subtask._id ? { ...s, isCompleted: !s.isCompleted } : s,
        ),
      )
    } catch {}
  }

  const priorityVariant = { high: 'error', medium: 'warning', low: 'default', normal: 'default' }

  if (!task) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-[400px] bg-surface-container-low border-l border-outline-variant flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
          <div className="flex items-center gap-3">
            <Badge variant={priorityVariant[task.priority] || 'default'}>
              {task.priority || 'normal'}
            </Badge>
            <span className="text-mono-label font-mono text-on-surface-variant">
              TK-{String(task._id || '').slice(-4).toUpperCase()}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[20px] select-none">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {/* Title */}
          <div>
            <h2 className="text-headline-sm font-geist text-on-surface mb-2">{task.title}</h2>
            <Badge
              variant={task.status === 'in_progress' ? 'primary' : task.status === 'done' ? 'default' : 'default'}
            >
              {task.status.replace('_', ' ')}
            </Badge>
          </div>

          {/* Description */}
          {task.description && (
            <div>
              <p className="text-mono-label font-mono text-on-surface-variant uppercase tracking-widest mb-2">
                Description
              </p>
              <p className="text-body-md font-geist text-on-surface leading-relaxed">
                {task.description}
              </p>
            </div>
          )}

          {/* Assignee */}
          {task.assignee && (
            <div>
              <p className="text-mono-label font-mono text-on-surface-variant uppercase tracking-widest mb-2">
                Assignee
              </p>
              <div className="flex items-center gap-3">
                <Avatar
                  src={task.assignee?.avatar}
                  name={task.assignee?.fullName || ''}
                  size="md"
                />
                <p className="text-body-md font-geist text-on-surface">
                  {task.assignee?.fullName || task.assignee?.username}
                </p>
              </div>
            </div>
          )}

          {/* Due date */}
          {task.dueDate && (
            <div>
              <p className="text-mono-label font-mono text-on-surface-variant uppercase tracking-widest mb-2">
                Due Date
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

          {/* Subtasks */}
          {subtasks.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-mono-label font-mono text-on-surface-variant uppercase tracking-widest">
                  Subtasks
                </p>
                <span className="text-mono-label font-mono text-on-surface-variant">
                  {subtasks.filter((s) => s.isCompleted).length}/{subtasks.length}
                </span>
              </div>
              <ul className="flex flex-col gap-2">
                {subtasks.map((subtask) => (
                  <li key={subtask._id} className="flex items-center gap-3">
                    <button
                      onClick={() => toggleSubtask(subtask)}
                      className={`w-4 h-4 flex-shrink-0 border flex items-center justify-center transition-colors ${subtask.isCompleted ? 'bg-primary-fixed-dim border-primary-fixed-dim' : 'border-outline-variant bg-surface-container-low'}`}
                    >
                      {subtask.isCompleted && (
                        <svg className="w-full h-full p-[3px]" viewBox="0 0 10 10" fill="none">
                          <path d="M1.5 5L4 7.5L8.5 2.5" stroke="#002022" strokeWidth="1.8" strokeLinecap="square" />
                        </svg>
                      )}
                    </button>
                    <p
                      className={`text-body-md font-geist ${subtask.isCompleted ? 'text-on-surface-variant line-through' : 'text-on-surface'}`}
                    >
                      {subtask.title}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

/* ---- Main Board Page ---- */
export default function KanbanBoardPage() {
  const { projectId } = useParams()
  const [tasks, setTasks] = useState([])
  const [activeTask, setActiveTask] = useState(null)
  const [selectedTask, setSelectedTask] = useState(null)
  const [loading, setLoading] = useState(true)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function load() {
    setLoading(true)
    getProjectTasks(projectId)
      .then((res) => setTasks(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [projectId])

  const byStatus = (status) => tasks.filter((t) => t.status === status)

  async function handleAddTask(status, title) {
    try {
      const res = await createTask(projectId, { title, status })
      setTasks((prev) => [...prev, res.data.data])
    } catch {}
  }

  function handleDragStart(event) {
    setActiveTask(tasks.find((t) => t._id === event.active.id) || null)
  }

  async function handleDragEnd(event) {
    const { active, over } = event
    setActiveTask(null)
    if (!over || active.id === over.id) return

    const activeTask = tasks.find((t) => t._id === active.id)
    const overTask = tasks.find((t) => t._id === over.id)

    if (!activeTask) return

    if (overTask && activeTask.status !== overTask.status) {
      const newStatus = overTask.status
      setTasks((prev) =>
        prev.map((t) => (t._id === active.id ? { ...t, status: newStatus } : t)),
      )
      try {
        await updateTask(projectId, active.id, { status: newStatus })
      } catch {
        load()
      }
    } else if (overTask && activeTask.status === overTask.status) {
      setTasks((prev) => {
        const same = prev.filter((t) => t.status === activeTask.status)
        const other = prev.filter((t) => t.status !== activeTask.status)
        const oldIdx = same.findIndex((t) => t._id === active.id)
        const newIdx = same.findIndex((t) => t._id === over.id)
        return [...other, ...arrayMove(same, oldIdx, newIdx)]
      })
    } else {
      const columnId = over.id
      if (COLUMNS.some((c) => c.id === columnId) && activeTask.status !== columnId) {
        setTasks((prev) =>
          prev.map((t) => (t._id === active.id ? { ...t, status: columnId } : t)),
        )
        try {
          await updateTask(projectId, active.id, { status: columnId })
        } catch {
          load()
        }
      }
    }
  }

  function handleTaskUpdate(updatedTask) {
    setTasks((prev) => prev.map((t) => (t._id === updatedTask._id ? updatedTask : t)))
    setSelectedTask(updatedTask)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-mono-label font-mono text-on-surface-variant uppercase tracking-widest animate-pulse">
          Loading board...
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-container-max mx-auto h-full flex flex-col">
      {/* Header */}
      <div className="mb-6 flex-shrink-0">
        <p className="text-mono-label font-mono text-on-surface-variant uppercase tracking-widest mb-1">
          Kanban Board
        </p>
        <h1 className="text-headline-md font-geist text-on-surface">Task Board</h1>
      </div>

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-gutter overflow-x-auto flex-1 pb-4">
          {COLUMNS.map((col) => (
            <Column
              key={col.id}
              column={col}
              tasks={byStatus(col.id)}
              onCardClick={setSelectedTask}
              onAddTask={handleAddTask}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? <KanbanCard task={activeTask} isDragging /> : null}
        </DragOverlay>
      </DndContext>

      {/* Task Detail Drawer */}
      {selectedTask && (
        <TaskDrawer
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleTaskUpdate}
          projectId={projectId}
        />
      )}
    </div>
  )
}
