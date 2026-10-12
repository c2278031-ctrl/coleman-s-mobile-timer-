import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  // Relative assets work at both / and /repository-name/ on static hosts.
  // An explicit deployment path can also be supplied with --base=/repo/.
  base: './',
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.test.{ts,tsx}'],
    clearMocks: true,
  },
})
