import { useEffect, useState } from 'react'
import useAuthStore from '../../store/authStore'
import { getDashboard } from '../../api/dashboard.api'
import SummaryGrid from '../../components/dashboard/SummaryGrid'
import QuickActions from '../../components/dashboard/QuickActions'
import MyTasksList from '../../components/dashboard/MyTasksList'
import UpcomingDeadlines from '../../components/dashboard/UpcomingDeadlines'
import NotificationsWidget from '../../components/dashboard/NotificationsWidget'
import AnalyticsSection from '../../components/dashboard/AnalyticsSection'
import ProjectProgressGrid from '../../components/dashboard/ProjectProgressGrid'
import RecentActivityFeed from '../../components/dashboard/RecentActivityFeed'
import TeamWorkload from '../../components/dashboard/TeamWorkload'
import CalendarPreview from '../../components/dashboard/CalendarPreview'

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    getDashboard()
      .then((res) => {
        if (alive) setData(res.data.data)
      })
      .catch(() => {
        if (alive) setError('Could not load the dashboard. Please try again.')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const firstProjectId = data?.projectProgress?.[0]?._id

  return (
    <div className="max-w-container-max mx-auto flex flex-col gap-8">
      {/* Header */}
      <div>
        <p className="text-mono-label font-mono text-on-surface-variant uppercase tracking-widest mb-1">
          Dashboard
        </p>
        <h1 className="text-headline-lg font-geist text-on-surface">
          {user?.fullName ? `Welcome back, ${user.fullName.split(' ')[0]}.` : 'Overview'}
        </h1>
      </div>

      {error && (
        <div className="px-4 py-3 border border-error bg-error-container/20 text-error text-body-md font-geist">
          {error}
        </div>
      )}

      {/* Quick actions */}
      <QuickActions firstProjectId={firstProjectId} />

      {/* KPI summary */}
      <SummaryGrid summary={data?.summary} loading={loading} />

      {/* My work */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
        <div className="lg:col-span-2">
          <MyTasksList tasks={data?.myTasks} loading={loading} />
        </div>
        <div className="flex flex-col gap-gutter">
          <UpcomingDeadlines deadlines={data?.upcomingDeadlines} loading={loading} />
          <NotificationsWidget notifications={data?.notifications} loading={loading} />
        </div>
      </div>

      {/* Analytics */}
      <AnalyticsSection analytics={data?.analytics} loading={loading} />

      {/* Projects */}
      <ProjectProgressGrid projects={data?.projectProgress} loading={loading} />

      {/* Activity + team */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
        <div className="lg:col-span-2">
          <RecentActivityFeed recentActivity={data?.recentActivity} loading={loading} />
        </div>
        <div className="flex flex-col gap-gutter">
          <TeamWorkload workload={data?.teamWorkload} loading={loading} />
          <CalendarPreview calendar={data?.calendarPreview} loading={loading} />
        </div>
      </div>
    </div>
  )
}
