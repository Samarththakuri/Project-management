const variants = {
  error: 'border-error text-error',
  warning: 'border-[#ffb4ab] text-[#ffb4ab]',
  primary: 'border-primary-fixed-dim text-primary-fixed-dim',
  default: 'border-outline text-on-surface-variant',
}

export default function Badge({ variant = 'default', children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 border text-mono-label font-mono uppercase tracking-widest ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
