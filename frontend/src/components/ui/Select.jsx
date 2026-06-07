import { forwardRef } from 'react'

const Select = forwardRef(({ options = [], placeholder, label, id, error, className = '', ...props }, ref) => (
  <div className="flex flex-col gap-1">
    {label && (
      <label htmlFor={id} className="text-mono-label font-mono uppercase tracking-widest text-on-surface-variant">
        {label}
      </label>
    )}
    <div className="relative">
      <select
        ref={ref}
        id={id}
        className={`w-full appearance-none bg-surface-container-low border text-on-surface text-body-md font-geist px-3 py-2 pr-8 transition-colors focus:outline-none focus:border-primary-fixed focus:ring-1 focus:ring-primary-fixed cursor-pointer disabled:opacity-40 ${error ? 'border-error' : 'border-outline-variant'} ${className}`}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-surface-container text-on-surface">
            {opt.label}
          </option>
        ))}
      </select>
      <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none select-none">
        expand_more
      </span>
    </div>
    {error && (
      <p className="text-mono-label font-mono text-error uppercase tracking-widest">{error}</p>
    )}
  </div>
))

Select.displayName = 'Select'
export default Select
