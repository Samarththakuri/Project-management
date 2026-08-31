import { describe, expect, it } from 'vitest'
import {
  actionIcon,
  avatarUrl,
  daysUntil,
  dueLabel,
  healthColor,
  healthLabel,
  humanizeAction,
  priorityVariant,
  shortDate,
  timeAgo,
} from './format'

// Offsets from "now" rather than fixed timestamps, so the suite is not sensitive
// to the machine's timezone or to the date it happens to run on.
const agoBy = (ms) => new Date(Date.now() - ms)

const SEC = 1000
const MIN = 60 * SEC
const HOUR = 60 * MIN
const DAY = 24 * HOUR

// Midnight-aligned, because daysUntil() measures from the start of today.
const midnightOffsetBy = (days) => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + days)
  return d
}

describe('timeAgo', () => {
  it('returns an empty string for empty input', () => {
    expect(timeAgo(null)).toBe('')
    expect(timeAgo(undefined)).toBe('')
    expect(timeAgo('')).toBe('')
  })

  it('collapses anything under a minute to "just now"', () => {
    expect(timeAgo(agoBy(30 * SEC))).toBe('just now')
  })

  it('formats minutes, hours, days and weeks', () => {
    expect(timeAgo(agoBy(5 * MIN))).toBe('5m ago')
    expect(timeAgo(agoBy(3 * HOUR))).toBe('3h ago')
    expect(timeAgo(agoBy(3 * DAY))).toBe('3d ago')
    expect(timeAgo(agoBy(14 * DAY))).toBe('2w ago')
  })

  it('falls back to a calendar date beyond about a month', () => {
    const result = timeAgo(agoBy(200 * DAY))

    expect(result).not.toMatch(/ago|just now/)
    expect(result.length).toBeGreaterThan(0)
  })
})

describe('daysUntil', () => {
  it('returns null for empty input', () => {
    expect(daysUntil(null)).toBeNull()
  })

  it('counts whole days from the start of today', () => {
    expect(daysUntil(midnightOffsetBy(0))).toBe(0)
    expect(daysUntil(midnightOffsetBy(1))).toBe(1)
    expect(daysUntil(midnightOffsetBy(7))).toBe(7)
  })

  it('goes negative for past dates', () => {
    expect(daysUntil(midnightOffsetBy(-3))).toBe(-3)
  })
})

describe('dueLabel', () => {
  it('labels today, tomorrow, future and overdue', () => {
    expect(dueLabel(midnightOffsetBy(0))).toBe('Today')
    expect(dueLabel(midnightOffsetBy(1))).toBe('Tomorrow')
    expect(dueLabel(midnightOffsetBy(4))).toBe('4d left')
    expect(dueLabel(midnightOffsetBy(-2))).toBe('2d overdue')
  })

  it('returns an empty string when there is no due date', () => {
    expect(dueLabel(null)).toBe('')
  })
})

describe('shortDate', () => {
  it('returns an empty string for empty input', () => {
    expect(shortDate(undefined)).toBe('')
  })

  it('formats a date without a year', () => {
    const result = shortDate('2026-07-13T00:00:00.000Z')

    expect(result).toBeTruthy()
    expect(result).not.toMatch(/2026/)
  })
})

describe('avatarUrl', () => {
  it('accepts a plain string url', () => {
    expect(avatarUrl('https://cdn.example.com/a.png')).toBe(
      'https://cdn.example.com/a.png',
    )
  })

  it('accepts the object shape stored on the user model', () => {
    expect(avatarUrl({ url: 'https://cdn.example.com/b.png' })).toBe(
      'https://cdn.example.com/b.png',
    )
  })

  it('treats the placehold.co default as "no avatar"', () => {
    expect(avatarUrl({ url: 'https://placehold.co/200x200' })).toBeUndefined()
  })

  it('returns undefined for missing input', () => {
    expect(avatarUrl(null)).toBeUndefined()
    expect(avatarUrl({})).toBeUndefined()
  })
})

describe('humanizeAction', () => {
  it('maps known activity actions to verb phrases', () => {
    expect(humanizeAction('task.created')).toBe('created a task in')
    expect(humanizeAction('member.role_changed')).toBe('changed a role in')
  })

  it('degrades gracefully for an unknown action', () => {
    expect(humanizeAction('widget.frobnicated')).toBe('widget frobnicated')
    expect(humanizeAction(undefined)).toBe('did something in')
  })
})

describe('actionIcon', () => {
  it('maps known actions and falls back to bolt', () => {
    expect(actionIcon('task.created')).toBe('add_task')
    expect(actionIcon('nope')).toBe('bolt')
  })
})

describe('priorityVariant', () => {
  it('maps every task priority', () => {
    expect(priorityVariant('critical')).toBe('error')
    expect(priorityVariant('high')).toBe('warning')
    expect(priorityVariant('medium')).toBe('primary')
    expect(priorityVariant('low')).toBe('default')
    expect(priorityVariant(undefined)).toBe('default')
  })
})

describe('project health', () => {
  it('maps health states to colours and labels', () => {
    expect(healthColor('red')).toBe('bg-error')
    expect(healthColor('yellow')).toBe('bg-[#d9a441]')
    expect(healthColor('green')).toBe('bg-primary-fixed-dim')

    expect(healthLabel('red')).toBe('At risk')
    expect(healthLabel('yellow')).toBe('Watch')
    expect(healthLabel('green')).toBe('On track')
  })
})
