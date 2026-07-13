// Reusable loading placeholder. Zero-radius, tonal pulse — matches the
// Obsidian Precision "no shadows, 1px borders" language.
export default function Skeleton({ className = '', width, height }) {
  return (
    <div
      className={`bg-surface-container-high animate-pulse ${className}`}
      style={{ width, height }}
    />
  )
}

/** A stack of skeleton text lines. */
export function SkeletonLines({ count = 3, className = '' }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-3" width={i === count - 1 ? '60%' : '100%'} />
      ))}
    </div>
  )
}
