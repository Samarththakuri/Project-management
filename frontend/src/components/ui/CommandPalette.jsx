import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { searchAll } from '../../api/search.api'

// Flatten grouped results into a single navigable list with section headers.
function buildItems(quickActions, results, query) {
  const items = []
  if (!query.trim()) {
    items.push({ type: 'header', label: 'Quick Actions' })
    quickActions.forEach((a) => items.push({ type: 'action', ...a }))
    return items
  }
  const { projects = [], tasks = [], members = [] } = results || {}
  if (projects.length) {
    items.push({ type: 'header', label: 'Projects' })
    projects.forEach((p) =>
      items.push({ type: 'result', icon: 'folder', label: p.name, to: `/projects/${p._id}` }),
    )
  }
  if (tasks.length) {
    items.push({ type: 'header', label: 'Tasks' })
    tasks.forEach((t) =>
      items.push({
        type: 'result',
        icon: 'task_alt',
        label: t.title,
        hint: t.project?.name,
        to: t.project?._id ? `/projects/${t.project._id}/board` : '#',
      }),
    )
  }
  if (members.length) {
    items.push({ type: 'header', label: 'Members' })
    members.forEach((m) =>
      items.push({ type: 'result', icon: 'person', label: m.fullName || m.username, hint: m.email }),
    )
  }
  return items
}

export default function CommandPalette({ isOpen, onClose, quickActions = [] }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setResults(null)
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [isOpen])

  // Debounced global search.
  useEffect(() => {
    if (!isOpen) return
    const term = query.trim()
    if (!term) {
      setResults(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const t = setTimeout(() => {
      searchAll(term)
        .then((res) => setResults(res.data.data))
        .catch(() => setResults(null))
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(t)
  }, [query, isOpen])

  const items = useMemo(() => buildItems(quickActions, results, query), [quickActions, results, query])
  // Positions (indexes into `items`) of the selectable rows, in order.
  const selectablePositions = useMemo(
    () => items.map((it, pos) => (it.type === 'header' ? -1 : pos)).filter((p) => p !== -1),
    [items],
  )
  const selectable = selectablePositions.map((pos) => items[pos])

  useEffect(() => setActive(0), [items.length])

  function runItem(item) {
    if (!item) return
    if (item.type === 'action') {
      onClose()
      item.onSelect?.()
    } else if (item.type === 'result' && item.to) {
      onClose()
      navigate(item.to)
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, selectable.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      runItem(selectable[active])
    }
  }

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4" onKeyDown={onKeyDown}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-container border border-outline-variant w-full max-w-xl shadow-2xl">
        <div className="absolute -top-px -left-px w-3 h-3 border-t-2 border-l-2 border-primary-fixed-dim" />
        <div className="absolute -top-px -right-px w-3 h-3 border-t-2 border-r-2 border-primary-fixed-dim" />

        <div className="flex items-center gap-3 px-4 py-3 border-b border-outline-variant">
          <span className="material-symbols-outlined text-[20px] text-on-surface-variant select-none">search</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, tasks, members…"
            className="flex-1 bg-transparent outline-none text-body-lg font-geist text-on-surface placeholder:text-on-surface-variant"
          />
          {loading && (
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant animate-spin select-none">progress_activity</span>
          )}
          <kbd className="text-mono-label font-mono text-on-surface-variant border border-outline-variant px-1.5 py-0.5">ESC</kbd>
        </div>

        <div className="max-h-[52vh] overflow-y-auto py-1">
          {query.trim() && !loading && selectable.length === 0 && (
            <p className="px-4 py-8 text-center text-body-md font-geist text-on-surface-variant">
              No results for “{query}”
            </p>
          )}
          {items.map((item, i) => {
            if (item.type === 'header') {
              return (
                <p
                  key={`h-${i}`}
                  className="px-4 pt-3 pb-1 text-mono-label font-mono text-on-surface-variant uppercase tracking-widest"
                >
                  {item.label}
                </p>
              )
            }
            const idx = selectablePositions.indexOf(i)
            const isActive = idx === active
            return (
              <button
                key={`i-${i}`}
                onMouseEnter={() => setActive(idx)}
                onClick={() => runItem(item)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isActive ? 'bg-surface-container-high' : ''}`}
              >
                <span className={`material-symbols-outlined text-[18px] select-none ${isActive ? 'text-primary-fixed-dim' : 'text-on-surface-variant'}`}>
                  {item.icon}
                </span>
                <span className="text-body-md font-geist text-on-surface truncate flex-1">{item.label}</span>
                {item.hint && (
                  <span className="text-mono-label font-mono text-on-surface-variant uppercase truncate max-w-[40%]">
                    {item.hint}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>,
    document.body,
  )
}
