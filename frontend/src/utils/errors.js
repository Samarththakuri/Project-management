// Shared error helpers. Not every rejection is an Axios error — a thrown
// TypeError or an aborted request has no `response`, so always fall through to
// Error.message before the generic fallback.

/** Best available human-readable message for a caught error. */
export function apiErrorMessage(err, fallback = 'Something went wrong') {
  return err?.response?.data?.message || err?.message || fallback
}

/** Seconds the server asked us to wait, from a 429 `errors: [{ retryAfterSeconds }]`. */
export function retryAfterFromError(err) {
  const seconds = err?.response?.data?.errors?.[0]?.retryAfterSeconds
  return typeof seconds === 'number' && seconds > 0 ? seconds : 0
}
