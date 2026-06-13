import { useEffect, useRef, useState } from 'react'

const PRIORITIES = ['low', 'medium', 'high', 'critical']

export default function BoardFilterBar({ members = [], filters, onChange }) {
  const [searchInput, setSearchInput] = useState(filters.search || '')
  const debounceRef = useRef(null)

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onChange({ ...filters, search: searchInput })
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [searchInput])

  function setPriority(p) {
    const next = filters.priority === p ? '' : p
    onChange({ ...filters, priority: next })
  }

  function setAssignee(id) {
    const next = filters.assignee === id ? '' : id
    onChange({ ...filters, assignee: next })
  }

  const hasFilters = filters.search || filters.priority || filters.assignee

  function clearAll() {
    setSearchInput('')
    onChange({ search: '', priority: '', assignee: '' })
  }

  return (
    <div className="flex flex-wrap items-center gap-3 mb-5 flex-shrink-0">
      {/* Search */}
      <div className="flex items-center gap-2 bg-surface-container border border-outline-variant px-3 py-1.5 w-56">
        <span className="material-symbols-outlined text-[16px] text-on-surface-variant select-none leading-none">
          search
        </span>
        <input
          type="text"
          placeholder="Filter tasks..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="bg-transparent text-body-md font-geist text-on-surface placeholder:text-on-surface-variant focus:outline-none w-full"
        />
        {searchInput && (
          <button onClick={() => setSearchInput('')} className="text-on-surface-variant hover:text-on-surface">
            <span className="material-symbols-outlined text-[14px] select-none leading-none">close</span>
          </button>
        )}
      </div>

      {/* Priority chips */}
      <div className="flex items-center gap-1.5">
        {PRIORITIES.map((p) => (
          <button
            key={p}
            onClick={() => setPriority(p)}
            className={`px-2.5 py-1 text-mono-label font-mono uppercase tracking-widest border transition-colors ${
              filters.priority === p
                ? 'bg-primary-fixed-dim border-primary-fixed-dim text-on-primary-fixed'
                : 'border-outline-variant text-on-surface-variant hover:text-on-surface hover:border-outline'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Assignee filter */}
      {members.length > 0 && (
        <select
          value={filters.assignee || ''}
          onChange={(e) => setAssignee(e.target.value)}
          className="bg-surface-container border border-outline-variant text-body-md font-geist text-on-surface px-3 py-1.5 focus:outline-none"
        >
          <option value="">All assignees</option>
          {members.map((m) => (
            <option key={m.user?._id} value={m.user?._id}>
              {m.user?.fullName || m.user?.username}
            </option>
          ))}
        </select>
      )}

      {/* Clear button */}
      {hasFilters && (
        <button
          onClick={clearAll}
          className="text-mono-label font-mono text-on-surface-variant uppercase tracking-widest hover:text-on-surface transition-colors"
        >
          Clear
        </button>
      )}
    </div>
  )
}
