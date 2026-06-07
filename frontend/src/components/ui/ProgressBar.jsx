export default function ProgressBar({ value = 0, className = '' }) {
  const pct = Math.min(100, Math.max(0, value))
  return (
    <div className={`w-full h-[2px] bg-surface-container-high ${className}`}>
      <div
        className="h-full bg-primary-fixed-dim transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
