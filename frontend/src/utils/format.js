// Shared formatting helpers for dashboard widgets.

const DAY_MS = 24 * 60 * 60 * 1000

/** Relative "time ago" string from a date-ish value. */
export function timeAgo(value) {
  if (!value) return ''
  const then = new Date(value).getTime()
  const diff = Date.now() - then
  const sec = Math.round(diff / 1000)
  if (sec < 60) return 'just now'
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.round(hr / 24)
  if (day < 7) return `${day}d ago`
  const wk = Math.round(day / 7)
  if (wk < 5) return `${wk}w ago`
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** Whole days from today until the given due date (can be negative). */
export function daysUntil(value) {
  if (!value) return null
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  return Math.ceil((new Date(value).getTime() - start.getTime()) / DAY_MS)
}

/** Human label for a days-remaining count. */
export function dueLabel(value) {
  const d = daysUntil(value)
  if (d === null) return ''
  if (d < 0) return `${Math.abs(d)}d overdue`
  if (d === 0) return 'Today'
  if (d === 1) return 'Tomorrow'
  return `${d}d left`
}

/** Short calendar date, e.g. "Jul 13". */
export function shortDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** Extract a usable avatar URL, ignoring the placeholder default. */
export function avatarUrl(avatar) {
  const url = typeof avatar === 'string' ? avatar : avatar?.url
  if (!url || url.includes('placehold')) return undefined
  return url
}

const ACTION_VERBS = {
  'project.created': 'created project',
  'project.updated': 'updated project',
  'project.deleted': 'deleted project',
  'member.added': 'added a member to',
  'member.removed': 'removed a member from',
  'member.role_changed': 'changed a role in',
  'task.created': 'created a task in',
  'task.updated': 'updated a task in',
  'task.deleted': 'deleted a task in',
  'subtask.created': 'added a subtask in',
  'subtask.completed': 'completed a subtask in',
  'note.created': 'added a note in',
  'note.updated': 'updated a note in',
  'note.deleted': 'deleted a note in',
  'comment.created': 'commented in',
  'comment.updated': 'edited a comment in',
  'comment.deleted': 'deleted a comment in',
}

/** Human-readable verb phrase for an activity action. */
export function humanizeAction(action) {
  return ACTION_VERBS[action] || action?.replace(/[._]/g, ' ') || 'did something in'
}

const ACTION_ICONS = {
  'project.created': 'create_new_folder',
  'member.added': 'person_add',
  'member.removed': 'person_remove',
  'member.role_changed': 'admin_panel_settings',
  'task.created': 'add_task',
  'task.updated': 'edit',
  'task.deleted': 'delete',
  'subtask.created': 'checklist',
  'subtask.completed': 'check_circle',
  'note.created': 'sticky_note_2',
  'comment.created': 'chat_bubble',
}

/** Material Symbol name for an activity action. */
export function actionIcon(action) {
  return ACTION_ICONS[action] || 'bolt'
}

/** Map a task priority to a Badge variant. */
export function priorityVariant(priority) {
  if (priority === 'critical') return 'error'
  if (priority === 'high') return 'warning'
  if (priority === 'medium') return 'primary'
  return 'default'
}

/** Map a project health/risk to its status-dot color class.
 *  Teal = on track, amber = watch, error = at risk. The amber is used only for
 *  small status dots (the palette has no distinct warning hue). */
export function healthColor(health) {
  if (health === 'red') return 'bg-error'
  if (health === 'yellow') return 'bg-[#d9a441]'
  return 'bg-primary-fixed-dim'
}

/** Human label for a health state. */
export function healthLabel(health) {
  if (health === 'red') return 'At risk'
  if (health === 'yellow') return 'Watch'
  return 'On track'
}
