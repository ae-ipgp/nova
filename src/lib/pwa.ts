import { useSyncExternalStore } from 'react'

/** Service-worker update detection and the "install as app" prompt. */
interface InstallEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let updateAvailable = false
let installEvent: InstallEvent | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const subscribe = (l: () => void) => (listeners.add(l), () => listeners.delete(l))

export function initPwa(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    installEvent = e as InstallEvent
    emit()
  })
  window.addEventListener('appinstalled', () => {
    installEvent = null
    emit()
  })
  window.addEventListener('load', () => {
    const hadController = Boolean(navigator.serviceWorker.controller)
    navigator.serviceWorker
      .register('/sw.js')
      .then(() => {
        // A new worker taking over an already-controlled page means a new release is live.
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (hadController) {
            updateAvailable = true
            emit()
          }
        })
      })
      .catch(() => {
        /* installation is optional; the site works without it */
      })
  })
}

export const useUpdateAvailable = (): boolean => useSyncExternalStore(subscribe, () => updateAvailable, () => false)
export const useCanInstall = (): boolean => useSyncExternalStore(subscribe, () => installEvent !== null, () => false)

export async function promptInstall(): Promise<void> {
  if (!installEvent) return
  await installEvent.prompt()
  installEvent = null
  emit()
}

/** "Kemas kini": drop the app-file caches and reload so the newest version is used. */
export async function refreshApp(): Promise<void> {
  try {
    const keys = await caches.keys()
    await Promise.all(keys.map((k) => caches.delete(k)))
  } catch {
    /* no cache API */
  }
  window.location.reload()
}
