import { describe, expect, it } from 'vitest'
import { apiErrorMessage, retryAfterFromError } from './errors'

describe('apiErrorMessage', () => {
  it('prefers the API-supplied message', () => {
    const err = {
      response: { data: { message: 'User with email already exists' } },
      message: 'Request failed with status code 409',
    }

    expect(apiErrorMessage(err)).toBe('User with email already exists')
  })

  it('falls back to Error.message for a non-Axios rejection', () => {
    expect(apiErrorMessage(new TypeError('x is not a function'))).toBe(
      'x is not a function',
    )
  })

  it('falls back to the default when nothing is available', () => {
    expect(apiErrorMessage(undefined)).toBe('Something went wrong')
    expect(apiErrorMessage({})).toBe('Something went wrong')
  })

  it('honours a custom fallback', () => {
    expect(apiErrorMessage(null, 'Could not load projects')).toBe(
      'Could not load projects',
    )
  })
})

describe('retryAfterFromError', () => {
  it('reads retryAfterSeconds from a 429 payload', () => {
    const err = {
      response: { data: { errors: [{ retryAfterSeconds: 42 }] } },
    }

    expect(retryAfterFromError(err)).toBe(42)
  })

  it('returns 0 when the field is missing, zero or not a number', () => {
    expect(retryAfterFromError({})).toBe(0)
    expect(retryAfterFromError({ response: { data: { errors: [] } } })).toBe(0)
    expect(
      retryAfterFromError({
        response: { data: { errors: [{ retryAfterSeconds: 0 }] } },
      }),
    ).toBe(0)
    expect(
      retryAfterFromError({
        response: { data: { errors: [{ retryAfterSeconds: '30' }] } },
      }),
    ).toBe(0)
  })
})
