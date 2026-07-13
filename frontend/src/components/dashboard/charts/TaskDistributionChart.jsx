import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import { CHART, axisTick, STATUS_COLORS } from './chartTheme.js'
import ChartTooltip from './ChartTooltip'

const STATUS_LABEL = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
}
const ORDER = ['todo', 'in_progress', 'review', 'done']

// Tasks by status. Category is on the axis (identity is never color-alone);
// severity/status hue is a secondary encoding.
export default function TaskDistributionChart({ data }) {
  const map = new Map((data || []).map((d) => [d.status, d.count]))
  const rows = ORDER.map((s) => ({
    status: s,
    label: STATUS_LABEL[s],
    count: map.get(s) || 0,
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={rows} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid stroke={CHART.grid} strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: CHART.grid }} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
        <Tooltip content={<ChartTooltip unit="tasks" />} cursor={{ fill: CHART.grid, fillOpacity: 0.3 }} />
        <Bar dataKey="count" radius={[2, 2, 0, 0]} maxBarSize={48}>
          {rows.map((r) => (
            <Cell key={r.status} fill={STATUS_COLORS[r.status]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
