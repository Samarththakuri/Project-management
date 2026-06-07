import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }) {
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className={`relative bg-surface-container border border-outline-variant w-full ${maxWidth} shadow-2xl`}>
        {/* corner accents */}
        <div className="absolute -top-px -left-px w-3 h-3 border-t-2 border-l-2 border-primary-fixed-dim" />
        <div className="absolute -top-px -right-px w-3 h-3 border-t-2 border-r-2 border-primary-fixed-dim" />
        <div className="absolute -bottom-px -left-px w-3 h-3 border-b-2 border-l-2 border-primary-fixed-dim" />
        <div className="absolute -bottom-px -right-px w-3 h-3 border-b-2 border-r-2 border-primary-fixed-dim" />

        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
          <h2 className="text-headline-sm font-geist text-on-surface">{title}</h2>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface transition-colors"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[20px] select-none">close</span>
          </button>
        </div>

        <div className="p-6">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
