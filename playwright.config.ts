import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  expect: {
    timeout: 5_000,
  },
  fullyParallel: false,
  workers: 1,
  projects: [
    {
      name: 'subscriber-mobile',
      testMatch: /subscriber\.spec\.ts/u,
      use: {
        ...devices['iPhone 13'],
        baseURL: 'http://127.0.0.1:6173',
      },
    },
    {
      name: 'worker-mobile',
      testMatch: /worker\.spec\.ts/u,
      use: {
        ...devices['Pixel 7'],
        baseURL: 'http://127.0.0.1:6174',
      },
    },
    {
      name: 'operator-desktop',
      testMatch: /ops\.spec\.ts/u,
      use: {
        baseURL: 'http://127.0.0.1:6175',
        viewport: { height: 900, width: 1440 },
      },
    },
  ],
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  testDir: './tests/ui',
  timeout: 30_000,
  use: {
    actionTimeout: 10_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'pnpm --filter @washed/subscriber-app exec vite --host 127.0.0.1 --port 6173',
      reuseExistingServer: !process.env['CI'],
      timeout: 30_000,
      url: 'http://127.0.0.1:6173',
    },
    {
      command: 'pnpm --filter @washed/worker-app exec vite --host 127.0.0.1 --port 6174',
      reuseExistingServer: !process.env['CI'],
      timeout: 30_000,
      url: 'http://127.0.0.1:6174',
    },
    {
      command: 'pnpm --filter @washed/operator-console exec vite --host 127.0.0.1 --port 6175',
      reuseExistingServer: !process.env['CI'],
      timeout: 30_000,
      url: 'http://127.0.0.1:6175',
    },
  ],
});
