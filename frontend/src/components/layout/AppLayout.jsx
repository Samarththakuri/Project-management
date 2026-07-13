import { Outlet } from 'react-router-dom'
import SideNavBar from './SideNavBar'
import TopNavBar from './TopNavBar'
import { QuickActionsProvider, useQuickActions } from '../../context/QuickActionsContext'

function LayoutShell() {
  const { refreshKey, openCreateProject, openCommandPalette } = useQuickActions()

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <SideNavBar onNewProject={openCreateProject} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopNavBar onOpenSearch={openCommandPalette} />
        <main className="flex-1 overflow-auto p-margin-desktop" key={refreshKey}>
          <Outlet context={{ refreshKey }} />
        </main>
      </div>
    </div>
  )
}

export default function AppLayout() {
  return (
    <QuickActionsProvider>
      <LayoutShell />
    </QuickActionsProvider>
  )
}
