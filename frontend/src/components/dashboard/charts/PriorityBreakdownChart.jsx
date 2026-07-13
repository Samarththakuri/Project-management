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
import { CHART, axisTick, PRIORITY_COLORS } from './chartTheme.js'
import ChartTooltip from './ChartTooltip'

const ORDER = ['low', 'medium', 'high', 'critical']
const LABEL = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' }

// Tasks by priority. Severity hue + axis label (never color-alone).
export default function PriorityBreakdownChart({ data }) {
  const map = new Map((data || []).map((d) => [d.priority, d.count]))
  const rows = ORDER.map((p) => ({ priority: p, label: LABEL[p], count: map.get(p) || 0 }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={rows} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid stroke={CHART.grid} strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: CHART.grid }} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
        <Tooltip content={<ChartTooltip unit="tasks" />} cursor={{ fill: CHART.grid, fillOpacity: 0.3 }} />
        <Bar dataKey="count" radius={[2, 2, 0, 0]} maxBarSize={48}>
          {rows.map((r) => (
            <Cell key={r.priority} fill={PRIORITY_COLORS[r.priority]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
