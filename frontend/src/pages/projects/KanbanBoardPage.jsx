import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  DndContext,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { KanbanCard, Badge, Avatar, Button, Input } from "../../components/ui";
import BoardFilterBar from "../../components/ui/BoardFilterBar";
import {
  getProjectTasks,
  createTask,
  updateTask,
  updateSubtask,
  reorderTasks,
  deleteTask,
} from "../../api/tasks.api";
import { getMembers } from "../../api/projects.api";
import {
  getTaskComments,
  createComment,
  updateComment,
  deleteComment,
} from "../../api/comments.api";
import useAuthStore from "../../store/authStore";

const COLUMNS = [
  { id: "todo", label: "Todo", icon: "radio_button_unchecked" },
  { id: "in_progress", label: "In Progress", icon: "pending" },
  { id: "review", label: "In Review", icon: "rate_review" },
  { id: "done", label: "Done", icon: "check_circle" },
];

const PRIORITY_OPTIONS = ["low", "medium", "high", "critical"];

/* ---- Sortable card wrapper ---- */
function SortableCard({ task, onClick }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task._id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
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
  );
}

/* ---- Column ---- */
function Column({ column, tasks, onCardClick, onAddTask, canAddTask }) {
  const [adding, setAdding] = useState(false);
  const { setNodeRef } = useDroppable({
    id: column.id,
  });
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm({
    resolver: zodResolver(
      z.object({
        title: z.string().min(1),
        priority: z.string().optional(),
        dueDate: z.string().optional(),
      }),
    ),
  });

  async function submit(data) {
    await onAddTask(
      column.id,
      data.title,
      data.priority || "medium",
      data.dueDate || null,
    );
    reset();
    setAdding(false);
  }

  return (
    <div ref={setNodeRef} className="flex flex-col w-72 flex-shrink-0">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="material-symbols-outlined text-[16px] text-on-surface-variant select-none">
          {column.icon}
        </span>
        <p className="text-mono-label font-mono text-on-surface uppercase tracking-widest flex-1">
          {column.label}
        </p>
        <span className="text-mono-label font-mono text-on-surface-variant">
          {tasks.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 flex-1">
        <SortableContext
          items={tasks.map((t) => t._id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <SortableCard key={task._id} task={task} onClick={onCardClick} />
          ))}
        </SortableContext>
      </div>

      {/* Add Task (todo column, admin/project_admin only) */}
      {column.id === "todo" && canAddTask && (
        <div className="mt-3">
          {adding ? (
            <form
              onSubmit={handleSubmit(submit)}
              className="bg-surface-container border border-outline-variant p-3 flex flex-col gap-2"
            >
              <input
                autoFocus
                placeholder="Task title..."
                className="w-full bg-transparent text-body-md font-geist text-on-surface placeholder:text-on-surface-variant focus:outline-none"
                {...register("title")}
              />
              <select
                className="w-full bg-surface-container-high border border-outline-variant text-body-md font-geist text-on-surface px-2 py-1 focus:outline-none"
                {...register("priority")}
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p} className="bg-surface-container">
                    {p}
                  </option>
                ))}
              </select>
              <input
                type="date"
                className="w-full bg-surface-container-high border border-outline-variant text-body-md font-geist text-on-surface px-2 py-1 focus:outline-none"
                {...register("dueDate")}
              />
              <div className="flex items-center gap-2">
                <Button type="submit" size="sm" disabled={isSubmitting}>
                  Add
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAdding(false);
                    reset();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high border border-dashed border-outline-variant transition-colors"
            >
              <span className="material-symbols-outlined text-[16px] select-none">
                add
              </span>
              <span className="text-mono-label font-mono uppercase tracking-widest">
                Add Task
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ---- Task Detail Drawer ---- */
function TaskDrawer({ task, onClose, onUpdate, onDelete, projectId, isPrivileged }) {
  const { user } = useAuthStore();
  const [subtasks, setSubtasks] = useState(task?.subTasks || []);
  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    setSubtasks(task?.subTasks || []);
  }, [task]);

  useEffect(() => {
    if (!task?._id) return;
    setComments([]);
    getTaskComments(projectId, task._id)
      .then((res) => setComments(res.data.data || []))
      .catch(() => {});
  }, [task?._id, projectId]);

  async function toggleSubtask(subtask) {
    try {
      await updateSubtask(projectId, task._id, subtask._id, {
        isCompleted: !subtask.isCompleted,
      });
      setSubtasks((prev) =>
        prev.map((s) =>
          s._id === subtask._id ? { ...s, isCompleted: !s.isCompleted } : s,
        ),
      );
    } catch {}
  }

  async function handleAddComment() {
    const content = commentInput.trim();
    if (!content || submittingComment) return;
    setSubmittingComment(true);
    try {
      const res = await createComment(projectId, task._id, { content });
      setComments((prev) => [...prev, res.data.data]);
      setCommentInput("");
    } catch {} finally {
      setSubmittingComment(false);
    }
  }

  async function handleEditComment(commentId) {
    const content = editContent.trim();
    if (!content) return;
    try {
      const res = await updateComment(projectId, task._id, commentId, { content });
      setComments((prev) =>
        prev.map((c) => (c._id === commentId ? res.data.data : c)),
      );
      setEditingId(null);
      setEditContent("");
    } catch {}
  }

  async function handleDeleteComment(commentId) {
    try {
      await deleteComment(projectId, task._id, commentId);
      setComments((prev) => prev.filter((c) => c._id !== commentId));
    } catch {}
  }

  const priorityVariant = {
    high: "error",
    critical: "error",
    medium: "warning",
    low: "default",
    normal: "default",
  };

  if (!task) return null;

  const avatarSrc = task.assignee?.avatar?.url ?? task.assignee?.avatar ?? null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-[400px] bg-surface-container-low border-l border-outline-variant flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
          <div className="flex items-center gap-3">
            <Badge variant={priorityVariant[task.priority] || "default"}>
              {task.priority || "medium"}
            </Badge>
            <span className="text-mono-label font-mono text-on-surface-variant">
              TK-
              {String(task._id || "")
                .slice(-4)
                .toUpperCase()}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[20px] select-none">
              close
            </span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {/* Title + status */}
          <div>
            <h2 className="text-headline-sm font-geist text-on-surface mb-2">
              {task.title}
            </h2>
            <Badge
              variant={
                task.status === "in_progress"
                  ? "primary"
                  : task.status === "review"
                    ? "warning"
                    : task.status === "done"
                      ? "default"
                      : "default"
              }
            >
              {task.status.replace(/_/g, " ")}
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
                  src={avatarSrc}
                  name={
                    task.assignee?.fullName || task.assignee?.username || ""
                  }
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
                {new Date(task.dueDate).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
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
                  {subtasks.filter((s) => s.isCompleted).length}/
                  {subtasks.length}
                </span>
              </div>
              <ul className="flex flex-col gap-2">
                {subtasks.map((subtask) => (
                  <li key={subtask._id} className="flex items-center gap-3">
                    <button
                      onClick={() => toggleSubtask(subtask)}
                      className={`w-4 h-4 flex-shrink-0 border flex items-center justify-center transition-colors ${subtask.isCompleted ? "bg-primary-fixed-dim border-primary-fixed-dim" : "border-outline-variant bg-surface-container-low"}`}
                    >
                      {subtask.isCompleted && (
                        <svg
                          className="w-full h-full p-[3px]"
                          viewBox="0 0 10 10"
                          fill="none"
                        >
                          <path
                            d="M1.5 5L4 7.5L8.5 2.5"
                            stroke="#002022"
                            strokeWidth="1.8"
                            strokeLinecap="square"
                          />
                        </svg>
                      )}
                    </button>
                    <p
                      className={`text-body-md font-geist ${subtask.isCompleted ? "text-on-surface-variant line-through" : "text-on-surface"}`}
                    >
                      {subtask.title}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Comments */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-mono-label font-mono text-on-surface-variant uppercase tracking-widest">
                Comments
              </p>
              {comments.length > 0 && (
                <span className="text-mono-label font-mono text-on-surface-variant">
                  {comments.length}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-3">
              {comments.map((comment) => {
                const isOwn = comment.createdBy?._id === user?._id;
                const canModify = isOwn || isPrivileged;
                const commenterAvatar =
                  comment.createdBy?.avatar?.url ?? comment.createdBy?.avatar ?? null;

                return (
                  <div
                    key={comment._id}
                    className="p-3 bg-surface-container border border-outline-variant"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar
                        src={commenterAvatar}
                        name={comment.createdBy?.username || ""}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-mono-label font-mono text-on-surface-variant">
                            {comment.createdBy?.username}
                          </span>
                          <span className="text-mono-label font-mono text-on-surface-variant opacity-60 flex-shrink-0">
                            {new Date(comment.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>

                        {editingId === comment._id ? (
                          <div className="flex flex-col gap-2">
                            <textarea
                              autoFocus
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.ctrlKey && e.key === "Enter") handleEditComment(comment._id);
                                if (e.key === "Escape") { setEditingId(null); setEditContent(""); }
                              }}
                              rows={2}
                              className="w-full bg-surface-container-high border border-outline-variant text-body-md font-geist text-on-surface p-2 focus:outline-none focus:border-primary resize-none"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditComment(comment._id)}
                                className="text-mono-label font-mono text-primary uppercase tracking-widest hover:opacity-80"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => { setEditingId(null); setEditContent(""); }}
                                className="text-mono-label font-mono text-on-surface-variant uppercase tracking-widest hover:opacity-80"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-body-md font-geist text-on-surface break-words">
                            {comment.content}
                          </p>
                        )}
                      </div>

                      {canModify && editingId !== comment._id && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => { setEditingId(comment._id); setEditContent(comment.content); }}
                            className="text-on-surface-variant hover:text-on-surface transition-colors"
                          >
                            <span className="material-symbols-outlined text-[16px] select-none">edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteComment(comment._id)}
                            className="text-on-surface-variant hover:text-error transition-colors"
                          >
                            <span className="material-symbols-outlined text-[16px] select-none">delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* New comment input */}
              <div className="flex flex-col gap-2">
                <textarea
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.ctrlKey && e.key === "Enter") handleAddComment();
                  }}
                  placeholder="Add a comment... (Ctrl+Enter to submit)"
                  rows={2}
                  className="w-full bg-surface-container border border-outline-variant text-body-md font-geist text-on-surface placeholder:text-on-surface-variant p-3 focus:outline-none focus:border-primary resize-none"
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleAddComment}
                    disabled={!commentInput.trim() || submittingComment}
                  >
                    Comment
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Delete Task */}
          <div className="pt-4 border-t border-outline-variant">
            <Button
              variant="danger"
              onClick={async () => {
                try {
                  await deleteTask(projectId, task._id);
                  onDelete(task._id);
                  onClose();
                } catch (err) {
                  console.error(err);
                }
              }}
            >
              Delete Task
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---- Main Board Page ---- */
export default function KanbanBoardPage() {
  const { projectId } = useParams();
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [activeTask, setActiveTask] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [canAddTask, setCanAddTask] = useState(false);
  const [filters, setFilters] = useState({ search: '', priority: '', assignee: '' });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function load() {
    setLoading(true);
    Promise.all([getProjectTasks(projectId), getMembers(projectId)])
      .then(([tRes, mRes]) => {
        setTasks(tRes.data.data || []);
        const fetchedMembers = mRes.data.data || [];
        setMembers(fetchedMembers);
        const me = fetchedMembers.find((m) => m.user?._id === user?._id);
        const role = me?.role;
        setCanAddTask(role === "admin" || role === "project_admin");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [projectId]);

  const visibleTasks = tasks.filter((t) => {
    if (filters.search && !t.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.priority && t.priority !== filters.priority) return false;
    if (filters.assignee && t.assignee?._id !== filters.assignee) return false;
    return true;
  });

  const byStatus = (status) => visibleTasks.filter((t) => t.status === status);

  async function handleAddTask(status, title, priority, dueDate) {
    try {
      const payload = { title, status, priority };
      if (dueDate) payload.dueDate = new Date(dueDate).toISOString();
      const res = await createTask(projectId, payload);
      setTasks((prev) => [...prev, res.data.data]);
    } catch {}
  }

  function handleDragStart(event) {
    setActiveTask(tasks.find((t) => t._id === event.active.id) || null);
  }
  function handleDeleteTask(taskId) {
    setTasks((prev) => prev.filter((t) => t._id !== taskId));
  }

  async function handleDragEnd(event) {
    const { active, over } = event;
    setActiveTask(null);
    if (!over || active.id === over.id) return;

    const draggedTask = tasks.find((t) => t._id === active.id);
    const overTask = tasks.find((t) => t._id === over.id);

    if (!draggedTask) return;

    if (overTask && draggedTask.status !== overTask.status) {
      // Cross-column: update status
      const newStatus = overTask.status;
      setTasks((prev) =>
        prev.map((t) =>
          t._id === active.id ? { ...t, status: newStatus } : t,
        ),
      );
      try {
        await updateTask(projectId, active.id, { status: newStatus });
      } catch {
        load();
      }
    } else if (overTask && draggedTask.status === overTask.status) {
      // Within-column: reorder
      let reordered;
      setTasks((prev) => {
        const same = prev.filter((t) => t.status === draggedTask.status);
        const other = prev.filter((t) => t.status !== draggedTask.status);
        const oldIdx = same.findIndex((t) => t._id === active.id);
        const newIdx = same.findIndex((t) => t._id === over.id);
        const sorted = arrayMove(same, oldIdx, newIdx);
        reordered = sorted.map((t, i) => ({ taskId: t._id, order: i }));
        return [...other, ...sorted];
      });
      try {
        if (reordered) await reorderTasks(projectId, reordered);
      } catch {}
    } else {
      // Dropped on a column droppable (empty column)
      const columnId = over.id;
      if (
        COLUMNS.some((c) => c.id === columnId) &&
        draggedTask.status !== columnId
      ) {
        setTasks((prev) =>
          prev.map((t) =>
            t._id === active.id ? { ...t, status: columnId } : t,
          ),
        );
        try {
          await updateTask(projectId, active.id, { status: columnId });
        } catch {
          load();
        }
      }
    }
  }

  function handleTaskUpdate(updatedTask) {
    setTasks((prev) =>
      prev.map((t) => (t._id === updatedTask._id ? updatedTask : t)),
    );
    setSelectedTask(updatedTask);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-mono-label font-mono text-on-surface-variant uppercase tracking-widest animate-pulse">
          Loading board...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-container-max mx-auto h-full flex flex-col">
      {/* Header */}
      <div className="mb-6 flex-shrink-0">
        <p className="text-mono-label font-mono text-on-surface-variant uppercase tracking-widest mb-1">
          Kanban Board
        </p>
        <h1 className="text-headline-md font-geist text-on-surface">
          Task Board
        </h1>
      </div>

      {/* Filter bar */}
      <BoardFilterBar members={members} filters={filters} onChange={setFilters} />

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
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
              canAddTask={canAddTask}
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
          onDelete={handleDeleteTask}
          projectId={projectId}
          isPrivileged={canAddTask}
        />
      )}
    </div>
  );
}
