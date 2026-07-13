import { Skeleton } from '../ui'
import WidgetCard, { EmptyState } from './WidgetCard'
import CompletionTrendChart from './charts/CompletionTrendChart'
import TaskDistributionChart from './charts/TaskDistributionChart'
import PriorityBreakdownChart from './charts/PriorityBreakdownChart'

function ChartSkeleton() {
  return (
    <div className="p-5 flex items-end gap-2 h-[232px]">
      {[40, 70, 55, 85, 60, 75, 45].map((h, i) => (
        <Skeleton key={i} className="flex-1" height={`${h}%`} />
      ))}
    </div>
  )
}

const hasData = (arr) => Array.isArray(arr) && arr.some((d) => (d.count ?? d.completed ?? 0) > 0)

export default function AnalyticsSection({ analytics, loading }) {
  return (
    <div>
      <p className="text-mono-label font-mono text-on-surface uppercase tracking-widest mb-4">Analytics</p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
        <WidgetCard title="Completion Trend" icon="trending_up">
          {loading ? (
            <ChartSkeleton />
          ) : !hasData(analytics?.completionTrend) ? (
            <EmptyState icon="show_chart" message="No completions yet" />
          ) : (
            <div className="p-4">
              <CompletionTrendChart data={analytics.completionTrend} />
            </div>
          )}
        </WidgetCard>

        <WidgetCard title="Tasks by Status" icon="donut_small">
          {loading ? (
            <ChartSkeleton />
          ) : !hasData(analytics?.tasksByStatus) ? (
            <EmptyState icon="bar_chart" message="No tasks yet" />
          ) : (
            <div className="p-4">
              <TaskDistributionChart data={analytics.tasksByStatus} />
            </div>
          )}
        </WidgetCard>

        <WidgetCard title="Tasks by Priority" icon="flag">
          {loading ? (
            <ChartSkeleton />
          ) : !hasData(analytics?.tasksByPriority) ? (
            <EmptyState icon="bar_chart" message="No tasks yet" />
          ) : (
            <div className="p-4">
              <PriorityBreakdownChart data={analytics.tasksByPriority} />
            </div>
          )}
        </WidgetCard>
      </div>
    </div>
  )
}
