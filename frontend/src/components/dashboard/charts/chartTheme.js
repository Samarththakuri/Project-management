// Shared Recharts theming so every chart reads as one system in the
// Obsidian Precision palette: teal data, recessive grid/axes, mono labels,
// zero-radius, no shadows. Constants only — the tooltip lives in ChartTooltip.jsx.

export const CHART = {
  teal: '#00dbe9', // primary-fixed-dim — the single data hue
  tealBright: '#7df4ff', // primary-fixed
  grid: '#3b494b', // outline-variant
  axis: '#849495', // outline — recessive axis ink
  surface: '#201f1f', // surface-container — tooltip bg
  ink: '#e5e2e1', // on-surface — tooltip text
  muted: '#b9cacb', // on-surface-variant
}

// Status is a state palette (label always present on the axis, never color-alone).
export const STATUS_COLORS = {
  todo: '#849495',
  in_progress: '#00dbe9',
  review: '#d9a441',
  done: '#7df4ff',
}

// Priority severity palette (also axis-labelled).
export const PRIORITY_COLORS = {
  low: '#849495',
  medium: '#00dbe9',
  high: '#d9a441',
  critical: '#ffb4ab',
}

export const axisTick = {
  fill: CHART.axis,
  fontSize: 10,
  fontFamily: '"JetBrains Mono", monospace',
  letterSpacing: '0.05em',
}
