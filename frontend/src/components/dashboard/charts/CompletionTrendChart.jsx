import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { CHART, axisTick } from './chartTheme.js'
import ChartTooltip from './ChartTooltip'
import { shortDate } from '../../../utils/format'

// Weekly completed-task trend. Single teal series — the title names it, so no legend.
export default function CompletionTrendChart({ data }) {
  const rows = (data || []).map((d) => ({ label: shortDate(d.week), completed: d.completed }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={rows} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="completionFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART.teal} stopOpacity={0.35} />
            <stop offset="100%" stopColor={CHART.teal} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={CHART.grid} strokeDasharray="2 4" vertical={false} />
        <XAxis
          dataKey="label"
          tick={axisTick}
          tickLine={false}
          axisLine={{ stroke: CHART.grid }}
        />
        <YAxis
          tick={axisTick}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          width={32}
        />
        <Tooltip
          content={<ChartTooltip unit="done" />}
          cursor={{ stroke: CHART.axis, strokeDasharray: '2 2' }}
        />
        <Area
          type="monotone"
          dataKey="completed"
          stroke={CHART.teal}
          strokeWidth={2}
          fill="url(#completionFill)"
          dot={false}
          activeDot={{ r: 4, fill: CHART.tealBright, stroke: 'none' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
