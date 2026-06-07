import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar, Badge, ProgressBar } from '../../components/ui'
import { getProjects } from '../../api/projects.api'

export default function ProjectsPage() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    getProjects()
      .then((res) => setProjects(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="max-w-container-max mx-auto">
      <div className="mb-8">
        <p className="text-mono-label font-mono text-on-surface-variant uppercase tracking-widest mb-1">
          Workspace
        </p>
        <h1 className="text-headline-lg font-geist text-on-surface">Projects</h1>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-gutter">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-surface-container border border-outline-variant p-5 h-44 animate-pulse"
            />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 border-2 border-outline-variant flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-on-surface-variant text-[32px] select-none">
              folder_open
            </span>
          </div>
          <p className="text-headline-sm font-geist text-on-surface mb-2">No projects yet</p>
          <p className="text-body-md font-geist text-on-surface-variant">
            Click "New Project" in the sidebar to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-gutter">
          {projects.map((project) => (
            <ProjectCard key={project._id} project={project} />
          ))}
        </div>
      )}
    </div>
  )
}

function ProjectCard({ project }) {
  return (
    <Link
      to={`/projects/${project._id}`}
      className="bg-surface-container border border-outline-variant p-5 flex flex-col gap-4 hover:border-primary-fixed-dim hover:bg-surface-container-high transition-colors group relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-outline-variant group-hover:border-primary-fixed-dim transition-colors" />

      <div>
        <p className="text-headline-sm font-geist text-on-surface mb-1 line-clamp-1">
          {project.name}
        </p>
        <p className="text-body-md font-geist text-on-surface-variant line-clamp-2">
          {project.description || 'No description'}
        </p>
      </div>

      <div className="flex-1" />

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-mono-label font-mono text-on-surface-variant uppercase tracking-widest">
            Progress
          </span>
          <span className="text-mono-label font-mono text-on-surface-variant">0%</span>
        </div>
        <ProgressBar value={0} />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex -space-x-1">
          {(project.members || []).slice(0, 4).map((m, i) => (
            <Avatar
              key={i}
              src={m.user?.avatar}
              name={m.user?.fullName || ''}
              size="sm"
              className="border border-surface-container"
            />
          ))}
          {(project.members || []).length > 4 && (
            <div className="w-7 h-7 bg-surface-container-high border border-outline-variant flex items-center justify-center">
              <span className="text-mono-label font-mono text-on-surface-variant">
                +{(project.members || []).length - 4}
              </span>
            </div>
          )}
        </div>
        <span className="text-mono-label font-mono text-on-surface-variant">
          {(project.members || []).length}{' '}
          {(project.members || []).length === 1 ? 'member' : 'members'}
        </span>
      </div>
    </Link>
  )
}
