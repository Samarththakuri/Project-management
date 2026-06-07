import { forwardRef } from 'react'

const variants = {
  primary: 'bg-primary-fixed text-on-primary-fixed hover:bg-primary-fixed-dim',
  secondary:
    'bg-surface-container-high text-on-surface border border-outline-variant hover:bg-surface-container-highest',
  ghost: 'bg-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-variant',
}

const sizes = {
  sm: 'px-3 py-1.5 text-mono-label font-mono uppercase tracking-widest',
  md: 'px-4 py-2 text-body-md font-geist',
  lg: 'px-5 py-2.5 text-body-lg font-geist',
}

const Button = forwardRef(
  ({ variant = 'primary', size = 'md', className = '', children, ...props }, ref) => (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-2 font-medium transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  ),
)

Button.displayName = 'Button'
export default Button
