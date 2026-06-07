import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import SideNavBar from './SideNavBar'
import TopNavBar from './TopNavBar'

export default function AppLayout() {
  const [createProjectOpen, setCreateProjectOpen] = useState(false)

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <SideNavBar onNewProject={() => setCreateProjectOpen(true)} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopNavBar />
        <main className="flex-1 overflow-auto p-margin-desktop">
          <Outlet />
        </main>
      </div>

      {/* CreateProjectModal — wired in step 10 */}
      {createProjectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setCreateProjectOpen(false)}
          />
          <div className="relative bg-surface-container border border-outline-variant p-8 text-on-surface-variant text-body-md font-geist">
            Create Project modal — coming in step 10
          </div>
        </div>
      )}
    </div>
  )
}
