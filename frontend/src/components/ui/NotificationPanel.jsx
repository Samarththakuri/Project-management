import { useEffect, useRef } from 'react'
import useNotificationStore from '../../store/notificationStore'
import { markAsRead, markAllAsRead } from '../../api/notifications.api'

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function NotificationPanel({ onClose }) {
  const panelRef = useRef(null)
  const { notifications, unreadCount, markOneRead, clearAll } = useNotificationStore()

  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  async function handleMarkOne(id) {
    try {
      await markAsRead(id)
      markOneRead(id)
    } catch {
      // fire-and-forget; store update only on success
    }
  }

  async function handleMarkAll() {
    try {
      await markAllAsRead()
      clearAll()
    } catch {}
  }

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 w-80 bg-surface-container border border-outline-variant shadow-xl z-50"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-outline-variant flex items-center justify-between">
        <p className="text-mono-label font-mono text-on-surface uppercase tracking-widest">
          Notifications
        </p>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAll}
            className="text-mono-label font-mono text-primary-fixed-dim hover:text-primary-fixed uppercase tracking-widest transition-colors"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      {notifications.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-mono-label font-mono text-on-surface-variant uppercase tracking-widest">
            No notifications
          </p>
        </div>
      ) : (
        <ul className="max-h-80 overflow-y-auto">
          {notifications.map((n, i) => (
            <li
              key={n._id}
              onClick={() => !n.isRead && handleMarkOne(n._id)}
              className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors
                ${i < notifications.length - 1 ? 'border-b border-outline-variant' : ''}
                ${!n.isRead
                  ? 'bg-surface-container-high border-l-2 border-l-primary-fixed-dim hover:bg-surface-container'
                  : 'hover:bg-surface-container-high'
                }`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-body-md font-geist text-on-surface leading-snug">
                  {n.message}
                </p>
              </div>
              <span className="text-mono-label font-mono text-on-surface-variant flex-shrink-0 mt-0.5">
                {timeAgo(n.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
