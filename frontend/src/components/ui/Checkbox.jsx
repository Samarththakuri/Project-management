import { forwardRef } from 'react'

const Checkbox = forwardRef(({ label, id, className = '', ...props }, ref) => (
  <label htmlFor={id} className="inline-flex items-center gap-2 cursor-pointer select-none group">
    <div className="relative w-4 h-4 flex-shrink-0">
      <input
        ref={ref}
        id={id}
        type="checkbox"
        className="peer absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
        {...props}
      />
      <div
        className={`w-4 h-4 border border-outline-variant bg-surface-container-low peer-checked:bg-primary-fixed-dim peer-checked:border-primary-fixed-dim peer-focus:ring-1 peer-focus:ring-primary-fixed transition-colors ${className}`}
      />
      <svg
        className="absolute inset-0 w-full h-full p-[3px] opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity"
        viewBox="0 0 10 10"
        fill="none"
      >
        <path d="M1.5 5L4 7.5L8.5 2.5" stroke="#002022" strokeWidth="1.8" strokeLinecap="square" />
      </svg>
    </div>
    {label && <span className="text-body-md text-on-surface">{label}</span>}
  </label>
))

Checkbox.displayName = 'Checkbox'
export default Checkbox
