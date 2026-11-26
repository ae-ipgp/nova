import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

/** Gives every build its own service-worker cache name, so old caches are dropped after a release. */
const stampServiceWorker = (): Plugin => ({
  name: 'stamp-sw',
  apply: 'build',
  closeBundle() {
    const file = 'dist/sw.js'
    if (!existsSync(file)) return
    writeFileSync(file, readFileSync(file, 'utf8').replace("'nova-v1'", `'nova-${Date.now().toString(36)}'`))
  },
})

export default defineConfig({
  plugins: [react(), tailwindcss(), stampServiceWorker()],
  build: {
    // Fonts must stay real files: the Content-Security-Policy (font-src 'self') blocks data: URIs.
    assetsInlineLimit: (file: string) => (file.endsWith('.woff2') || file.endsWith('.woff') ? false : undefined),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    css: false,
  },
})
