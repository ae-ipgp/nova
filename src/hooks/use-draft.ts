import { useCallback, useEffect, useState } from 'react'

function load<T extends object>(storageKey: string, initial: T, enabled: boolean): { value: T; restored: boolean } {
  if (enabled) {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) return { value: { ...initial, ...(JSON.parse(raw) as Partial<T>) }, restored: true }
    } catch {
      /* unreadable draft: start clean */
    }
  }
  return { value: initial, restored: false }
}

/**
 * Unsaved form values survive reloads (HiPER "drafts"). Saved on the device only, restored with a notice,
 * cleared on success or via "Buang draf". Pass `enabled=false` when editing an existing record.
 */
export function useDraft<T extends object>(key: string, initial: T, enabled = true) {
  const storageKey = `nova.draft.${key}`
  const [start] = useState(() => load(storageKey, initial, enabled))
  const [baseline] = useState(() => JSON.stringify(initial))
  const [value, setValue] = useState<T>(start.value)
  const [restored, setRestored] = useState(start.restored)

  useEffect(() => {
    if (!enabled) return
    const serialised = JSON.stringify(value)
    const timer = setTimeout(() => {
      try {
        if (serialised === baseline) localStorage.removeItem(storageKey)
        else localStorage.setItem(storageKey, serialised)
      } catch {
        /* storage unavailable */
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [value, enabled, storageKey, baseline])

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(storageKey)
    } catch {
      /* ignore */
    }
    setRestored(false)
  }, [storageKey])

  const discard = useCallback(() => {
    clear()
    setValue(JSON.parse(baseline) as T)
  }, [clear, baseline])

  return { value, setValue, restored, clear, discard }
}
