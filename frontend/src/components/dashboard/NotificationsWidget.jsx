import { useState } from 'react'
import { Skeleton } from '../ui'
import WidgetCard, { EmptyState } from './WidgetCard'
import { markAsRead, markAllAsRead } from '../../api/notifications.api'
import useNotificationStore from '../../store/notificationStore'
import { timeAgo } from '../../utils/format'

export default function NotificationsWidget({ notifications, loading }) {
  // Locally-read ids layered over the server prop — no prop-to-state copy.
  const [readIds, setReadIds] = useState(() => new Set())
  const markOneRead = useNotificationStore((s) => s.markOneRead)
  const clearAll = useNotificationStore((s) => s.clearAll)

  const items = (notifications || []).map((n) => ({
    ...n,
    isRead: n.isRead || readIds.has(n._id),
  }))
  const unread = items.filter((n) => !n.isRead).length

  async function readOne(n) {
    if (n.isRead) return
    setReadIds((prev) => new Set(prev).add(n._id))
    markOneRead(n._id)
    try {
      await markAsRead(n._id)
    } catch {
      // non-critical
    }
  }

  async function readAll() {
    setReadIds(new Set(items.map((n) => n._id)))
    clearAll()
    try {
      await markAllAsRead()
    } catch {
      // non-critical
    }
  }

  return (
    <WidgetCard
      title="Notifications"
      headerRight={
        !loading && unread > 0 ? (
          <button
            onClick={readAll}
            className="text-mono-label font-mono text-primary-fixed-dim hover:text-primary-fixed uppercase tracking-widest transition-colors"
          >
            Mark all read
          </button>
        ) : null
      }
    >
      {loading ? (
        <div className="px-5 py-4 flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-full" />
          ))}
        </div>
      ) : !items.length ? (
        <EmptyState icon="notifications_off" message="No notifications" />
      ) : (
        <ul>
          {items.map((n, i) => (
            <li
              key={n._id}
              onClick={() => readOne(n)}
              className={`px-5 py-3 flex items-start gap-3 cursor-pointer hover:bg-surface-container-high transition-colors ${i < items.length - 1 ? 'border-b border-outline-variant' : ''}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${n.isRead ? 'bg-transparent' : 'bg-primary-fixed-dim'}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-body-md font-geist leading-snug ${n.isRead ? 'text-on-surface-variant' : 'text-on-surface'}`}>
                  {n.message}
                </p>
                <p className="text-mono-label font-mono text-on-surface-variant uppercase tracking-widest mt-0.5">
                  {timeAgo(n.createdAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  )
}
