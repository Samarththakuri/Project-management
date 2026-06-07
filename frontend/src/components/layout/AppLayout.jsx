import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import SideNavBar from './SideNavBar'
import TopNavBar from './TopNavBar'
import { Modal, Button, Input, Textarea } from '../ui'
import { createProject } from '../../api/projects.api'

const schema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
})

function CreateProjectModal({ isOpen, onClose, onCreated }) {
  const [serverError, setServerError] = useState('')
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) })

  async function onSubmit(data) {
    setServerError('')
    try {
      await createProject(data)
      reset()
      onCreated()
      onClose()
    } catch (err) {
      setServerError(err.response?.data?.message || 'Failed to create project')
    }
  }

  function handleClose() {
    reset()
    setServerError('')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="New Project" maxWidth="max-w-lg">
      {serverError && (
        <div className="mb-4 px-4 py-3 border border-error bg-error-container/20 text-error text-body-md font-geist">
          {serverError}
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <Input
          id="name"
          label="Project Name"
          placeholder="e.g. Platform v3"
          icon="folder"
          error={errors.name?.message}
          {...register('name')}
        />
        <Textarea
          id="description"
          label="Description"
          placeholder="What is this project about?"
          rows={3}
          {...register('description')}
        />
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-outline-variant">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Project'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default function AppLayout() {
  const [createProjectOpen, setCreateProjectOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <SideNavBar onNewProject={() => setCreateProjectOpen(true)} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopNavBar />
        <main className="flex-1 overflow-auto p-margin-desktop" key={refreshKey}>
          <Outlet context={{ refreshKey }} />
        </main>
      </div>

      <CreateProjectModal
        isOpen={createProjectOpen}
        onClose={() => setCreateProjectOpen(false)}
        onCreated={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  )
}
