const COLORS = [
  'bg-on-primary-fixed-variant text-primary-fixed',
  'bg-on-secondary-fixed-variant text-secondary-fixed',
  'bg-on-tertiary-fixed-variant text-tertiary-fixed',
  'bg-error-container text-on-error-container',
]

function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '?'
}

function colorFor(name = '') {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return COLORS[h % COLORS.length]
}

const sizes = {
  sm: 'w-6 h-6 text-[9px]',
  md: 'w-8 h-8 text-[11px]',
  lg: 'w-10 h-10 text-xs',
  xl: 'w-12 h-12 text-sm',
}

export default function Avatar({ src, name = '', size = 'md', className = '' }) {
  const sizeClass = sizes[size] ?? sizes.md

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`object-cover grayscale hover:grayscale-0 transition-all duration-200 ${sizeClass} ${className}`}
      />
    )
  }

  return (
    <div
      className={`flex items-center justify-center font-mono font-medium select-none flex-shrink-0 ${colorFor(name)} ${sizeClass} ${className}`}
      title={name}
    >
      {initials(name)}
    </div>
  )
}
