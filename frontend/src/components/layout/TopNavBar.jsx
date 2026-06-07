import { NavLink, useMatch } from 'react-router-dom'
import { Avatar } from '../ui'
import useAuthStore from '../../store/authStore'

export default function TopNavBar() {
  const user = useAuthStore((s) => s.user)
  const projectMatch = useMatch('/projects/:projectId/*')
  const projectId = projectMatch?.params?.projectId

  const tabs = projectId
    ? [
        { to: `/projects/${projectId}`, label: 'Overview', end: true },
        { to: `/projects/${projectId}/board`, label: 'Board', end: false },
      ]
    : []

  return (
    <header className="h-14 flex-shrink-0 bg-surface-container-low/80 backdrop-blur-md border-b border-outline-variant flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Left: project sub-nav tabs (only inside a project) */}
      <nav className="flex items-center h-full">
        {tabs.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center h-full px-4 text-body-md font-geist border-b-2 transition-colors ${
                isActive
                  ? 'border-primary-fixed-dim text-on-surface'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Right: controls */}
      <div className="flex items-center gap-3 ml-auto">
        {/* Cmd+K pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 border border-outline-variant text-on-surface-variant cursor-default select-none">
          <span className="material-symbols-outlined text-[15px] select-none leading-none">search</span>
          <span className="text-mono-label font-mono">⌘K</span>
        </div>

        {/* Notifications */}
        <button
          className="text-on-surface-variant hover:text-on-surface transition-colors"
          aria-label="Notifications"
        >
          <span className="material-symbols-outlined text-[20px] select-none leading-none">
            notifications
          </span>
        </button>

        {/* User avatar */}
        <Avatar
          src={user?.avatar}
          name={user?.fullName ?? user?.username ?? ''}
          size="md"
        />
      </div>
    </header>
  )
}
