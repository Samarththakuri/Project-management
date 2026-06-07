import { forwardRef, useEffect, useRef } from 'react'

const Textarea = forwardRef(({ label, id, error, className = '', ...props }, ref) => {
  const innerRef = useRef(null)
  const resolvedRef = ref ?? innerRef

  useEffect(() => {
    const el = resolvedRef.current
    if (!el) return
    const resize = () => {
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }
    el.addEventListener('input', resize)
    resize()
    return () => el.removeEventListener('input', resize)
  }, [resolvedRef])

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-mono-label font-mono uppercase tracking-widest text-on-surface-variant">
          {label}
        </label>
      )}
      <textarea
        ref={resolvedRef}
        id={id}
        rows={3}
        className={`w-full bg-surface-container-low border text-on-surface placeholder:text-on-surface-variant text-body-md font-geist px-3 py-2 resize-none overflow-hidden transition-colors focus:outline-none focus:border-primary-fixed focus:ring-1 focus:ring-primary-fixed disabled:opacity-40 ${error ? 'border-error' : 'border-outline-variant'} ${className}`}
        {...props}
      />
      {error && (
        <p className="text-mono-label font-mono text-error uppercase tracking-widest">{error}</p>
      )}
    </div>
  )
})

Textarea.displayName = 'Textarea'
export default Textarea
