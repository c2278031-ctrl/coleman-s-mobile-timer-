import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173/mobile-time-tracker/',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'mobile-chromium', use: { browserName: 'chromium', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: 'desktop-chromium', use: { browserName: 'chromium', viewport: { width: 1280, height: 900 } } },
  ],
  webServer: [{
    command: 'npm run preview -- --port 4173 --strictPort --base=/mobile-time-tracker/',
    url: 'http://127.0.0.1:4173/mobile-time-tracker/',
    reuseExistingServer: false,
  }, {
    // Test-only fixture imports the same engine; it is excluded from the production bundle.
    command: 'npm run dev -- --port 5174 --strictPort',
    url: 'http://127.0.0.1:5174/e2e/fixtures/timer.html',
    reuseExistingServer: false,
  }],
})
