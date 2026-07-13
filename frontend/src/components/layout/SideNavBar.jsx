import { NavLink } from 'react-router-dom'
import { Button } from '../ui'

const NAV_LINKS = [
  { to: '/dashboard', icon: 'grid_view', label: 'Dashboard' },
  { to: '/projects', icon: 'folder', label: 'Projects' },
]

const FOOTER_LINKS = [
  { to: '/settings', icon: 'settings', label: 'Settings' },
]

const base = 'flex items-center gap-3 px-4 py-2.5 text-body-md font-geist transition-colors duration-150 border-r-2'
const active = 'bg-on-primary-fixed-variant border-primary-fixed-dim text-primary-fixed-dim'
const inactive = 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-variant'

function NavItem({ to, icon, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `${base} ${isActive ? active : inactive}`}
    >
      <span className="material-symbols-outlined text-[20px] select-none leading-none">{icon}</span>
      {label}
    </NavLink>
  )
}

export default function SideNavBar({ onNewProject }) {
  return (
    <aside className="w-sidebar-width flex-shrink-0 bg-surface-container-low border-r border-outline-variant flex flex-col h-screen">
      {/* Brand */}
      <div className="px-4 py-5 border-b border-outline-variant">
        <p className="text-headline-sm font-geist text-on-surface leading-tight">Project Camp</p>
        <p className="text-mono-label font-mono text-on-surface-variant uppercase tracking-widest mt-1">
          Technical Operations
        </p>
      </div>

      {/* New Project CTA */}
      <div className="px-4 py-4 border-b border-outline-variant">
        <Button variant="primary" size="sm" className="w-full" onClick={onNewProject}>
          <span className="material-symbols-outlined text-[16px] select-none leading-none">add</span>
          New Project
        </Button>
      </div>

      {/* Main nav */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {NAV_LINKS.map(({ to, icon, label }) => (
          <NavItem key={to} to={to} icon={icon} label={label} />
        ))}
      </nav>

      {/* Footer nav */}
      <div className="py-2 border-t border-outline-variant">
        {FOOTER_LINKS.map(({ to, icon, label }) => (
          <NavItem key={to} to={to} icon={icon} label={label} />
        ))}
      </div>
    </aside>
  )
}
