import { readSound } from './prefs'

/** Optional tiny feedback tones (off by default). Synthesised, so there are no audio files to load. */
type Tone = 'click' | 'success' | 'error'
const PATTERNS: Record<Tone, [number, number][]> = {
  click: [[880, 0.04]],
  success: [[660, 0.08], [990, 0.12]],
  error: [[330, 0.14], [247, 0.18]],
}

let ctx: AudioContext | null = null

export function playSound(tone: Tone): void {
  try {
    if (!readSound()) return
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    ctx ??= new AC()
    let t = ctx.currentTime
    for (const [freq, dur] of PATTERNS[tone]) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = freq
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.06, t)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t)
      osc.stop(t + dur)
      t += dur
    }
  } catch {
    /* sound is a nicety; never break the app for it */
  }
}
