import { forwardRef } from 'react'

const Input = forwardRef(({ icon, error, label, id, className = '', ...props }, ref) => (
  <div className="flex flex-col gap-1">
    {label && (
      <label htmlFor={id} className="text-mono-label font-mono uppercase tracking-widest text-on-surface-variant">
        {label}
      </label>
    )}
    <div className="relative">
      {icon && (
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none select-none">
          {icon}
        </span>
      )}
      <input
        ref={ref}
        id={id}
        className={`w-full bg-surface-container-low border text-on-surface placeholder:text-on-surface-variant text-body-md font-geist px-3 py-2 transition-colors focus:outline-none focus:border-primary-fixed focus:ring-1 focus:ring-primary-fixed disabled:opacity-40 ${icon ? 'pl-10' : ''} ${error ? 'border-error' : 'border-outline-variant'} ${className}`}
        {...props}
      />
    </div>
    {error && (
      <p className="text-mono-label font-mono text-error uppercase tracking-widest">{error}</p>
    )}
  </div>
))

Input.displayName = 'Input'
export default Input
