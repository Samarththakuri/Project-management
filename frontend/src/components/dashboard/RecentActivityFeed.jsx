import { useState } from 'react'
import { Avatar, Skeleton } from '../ui'
import WidgetCard, { EmptyState } from './WidgetCard'
import { getDashboardActivity } from '../../api/dashboard.api'
import { timeAgo, humanizeAction, actionIcon, avatarUrl } from '../../utils/format'

function ActivityRow({ item, last }) {
  const actor = item.actor || {}
  const name = actor.fullName || actor.username || 'Someone'
  return (
    <li className={`flex items-start gap-3 px-5 py-3.5 ${last ? '' : 'border-b border-outline-variant'}`}>
      <div className="relative flex-shrink-0 mt-0.5">
        <Avatar src={avatarUrl(actor.avatar)} name={name} size="sm" />
        <span className="absolute -bottom-1 -right-1 w-4 h-4 flex items-center justify-center bg-surface-container-high border border-outline-variant">
          <span className="material-symbols-outlined text-[11px] text-on-surface-variant select-none leading-none">
            {actionIcon(item.action)}
          </span>
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-body-md font-geist text-on-surface leading-snug">
          <span className="text-primary-fixed-dim">{name}</span>{' '}
          <span className="text-on-surface-variant">{humanizeAction(item.action)}</span>{' '}
          <span className="font-medium">{item.project?.name || ''}</span>
        </p>
      </div>
      <span className="text-mono-label font-mono text-on-surface-variant flex-shrink-0 mt-0.5">
        {timeAgo(item.createdAt)}
      </span>
    </li>
  )
}

export default function RecentActivityFeed({ recentActivity, loading, className = '' }) {
  const [items, setItems] = useState(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  // Initialize local state from the dashboard payload on first data arrival.
  const list = items ?? recentActivity?.activities ?? []
  const canLoadMore = items ? hasMore : recentActivity?.hasMore

  async function loadMore() {
    const next = page + 1
    setLoadingMore(true)
    try {
      const res = await getDashboardActivity(next, 12)
      const data = res.data.data
      setItems([...(list || []), ...(data.activities || [])])
      setPage(next)
      setHasMore(data.hasMore)
    } catch {
      // swallow — non-critical
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <WidgetCard title="Recent Activity" icon="history" className={className}>
      {loading ? (
        <ul>
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="flex items-start gap-3 px-5 py-3.5 border-b border-outline-variant last:border-0">
              <Skeleton className="h-6 w-6" />
              <Skeleton className="h-3 flex-1" />
              <Skeleton className="h-3 w-10" />
            </li>
          ))}
        </ul>
      ) : !list.length ? (
        <EmptyState icon="history" message="No recent activity" />
      ) : (
        <>
          <ul>
            {list.map((item, i) => (
              <ActivityRow key={item._id || i} item={item} last={i === list.length - 1 && !canLoadMore} />
            ))}
          </ul>
          {canLoadMore && (
            <div className="px-5 py-3 border-t border-outline-variant">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="text-mono-label font-mono text-primary-fixed-dim hover:text-primary-fixed uppercase tracking-widest transition-colors disabled:opacity-50"
              >
                {loadingMore ? 'Loading…' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}
    </WidgetCard>
  )
}
