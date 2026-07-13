// Card-styled tooltip matching the widget surfaces.
export default function ChartTooltip({ active, payload, label, unit = '' }) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="bg-surface-container border border-outline-variant px-3 py-2">
      {label !== undefined && (
        <p className="text-mono-label font-mono text-on-surface-variant uppercase tracking-widest mb-1">
          {label}
        </p>
      )}
      {payload.map((p, i) => (
        <p key={i} className="text-body-md font-geist text-on-surface tabular-nums">
          {p.value}
          {unit ? ` ${unit}` : ''}
        </p>
      ))}
    </div>
  )
}
