import { Link } from 'react-router-dom'

// Shared widget shell: bordered surface + mono-label header with optional
// trailing icon, action link, or arbitrary node.
export default function WidgetCard({
  title,
  icon,
  action,
  actionTo,
  onAction,
  headerRight,
  className = '',
  bodyClassName = '',
  children,
}) {
  return (
    <div className={`bg-surface-container border border-outline-variant flex flex-col ${className}`}>
      <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between flex-shrink-0">
        <p className="text-mono-label font-mono text-on-surface uppercase tracking-widest">{title}</p>
        <div className="flex items-center gap-3">
          {headerRight}
          {action && actionTo && (
            <Link
              to={actionTo}
              className="text-mono-label font-mono text-primary-fixed-dim hover:text-primary-fixed uppercase tracking-widest transition-colors"
            >
              {action}
            </Link>
          )}
          {action && onAction && (
            <button
              onClick={onAction}
              className="text-mono-label font-mono text-primary-fixed-dim hover:text-primary-fixed uppercase tracking-widest transition-colors"
            >
              {action}
            </button>
          )}
          {icon && (
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant select-none leading-none">
              {icon}
            </span>
          )}
        </div>
      </div>
      <div className={`flex-1 ${bodyClassName}`}>{children}</div>
    </div>
  )
}

// Consistent empty-state block for widget bodies.
export function EmptyState({ icon = 'inbox', message }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 px-5 text-center">
      <span className="material-symbols-outlined text-[28px] text-outline select-none">{icon}</span>
      <p className="text-body-md font-geist text-on-surface-variant">{message}</p>
    </div>
  )
}
