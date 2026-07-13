import { useNavigate } from 'react-router-dom'
import { useQuickActions } from '../../context/QuickActionsContext'

function ActionButton({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 min-w-[130px] flex items-center gap-2.5 px-4 py-3 bg-surface-container border border-outline-variant hover:border-primary-fixed-dim hover:bg-surface-container-high transition-colors group"
    >
      <span className="material-symbols-outlined text-[18px] text-on-surface-variant group-hover:text-primary-fixed-dim select-none transition-colors">
        {icon}
      </span>
      <span className="text-body-md font-geist text-on-surface">{label}</span>
    </button>
  )
}

export default function QuickActions({ firstProjectId }) {
  const navigate = useNavigate()
  const {
    openCreateProject,
    openCreateTask,
    openInviteMember,
    openCreateNote,
    openCommandPalette,
  } = useQuickActions()

  return (
    <div className="flex flex-wrap gap-gutter">
      <ActionButton icon="create_new_folder" label="Create Project" onClick={openCreateProject} />
      <ActionButton icon="add_task" label="Create Task" onClick={openCreateTask} />
      <ActionButton icon="person_add" label="Invite Member" onClick={openInviteMember} />
      <ActionButton icon="note_add" label="Create Note" onClick={openCreateNote} />
      <ActionButton
        icon="calendar_month"
        label="View Calendar"
        onClick={() => navigate(firstProjectId ? `/projects/${firstProjectId}/calendar` : '/projects')}
      />
      <ActionButton icon="search" label="Search" onClick={openCommandPalette} />
    </div>
  )
}
