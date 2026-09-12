import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end configuration.
 *
 * Deliberately Chromium-only and single-worker: these specs drive one shared app whose state
 * lives in `localStorage`, so parallel workers would fight over it. Cross-browser coverage
 * buys little for an offline-first SPA whose only exotic API is the File System Access API,
 * which is Chromium-only anyway.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5199/gantt/',
    trace: 'retain-on-failure',
    viewport: { width: 1440, height: 900 },
  },
  // Locally this drives the system Chrome, so the suite runs without the ~300MB
  // `playwright install` download. CI sets PLAYWRIGHT_CHANNEL='' to use the bundled browser.
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: process.env['PLAYWRIGHT_CHANNEL'] === '' ? undefined : 'chrome',
      },
    },
  ],
  webServer: {
    command: 'npx vite --port 5199 --strictPort',
    url: 'http://localhost:5199/gantt/',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
