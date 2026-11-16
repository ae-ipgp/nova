import { AppError } from './errors'

/** Minimal surface of GoogleAppsScript.Lock.Lock used here (injectable for tests). */
export interface LockLike {
  tryLock(timeoutInMillis: number): boolean
  releaseLock(): void
}

export class BusyError extends AppError {
  constructor() {
    super('BUSY', 'Sistem sedang sibuk. Sila cuba sebentar lagi.')
    this.name = 'BusyError'
  }
}

/**
 * Runs `fn` while holding the script-wide lock. This is NO.VA's replacement for
 * a database transaction: every read-check-write that must be atomic (reference
 * number issuance, unique checks, status transitions) runs inside it.
 */
export function withLock<T>(lock: LockLike, fn: () => T, timeoutMs = 10_000): T {
  if (!lock.tryLock(timeoutMs)) throw new BusyError()
  try {
    return fn()
  } finally {
    lock.releaseLock()
  }
}
