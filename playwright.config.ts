import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  expect: {
    timeout: 5_000,
  },
  fullyParallel: false,
  projects: [
    {
      name: 'subscriber-mobile',
      testMatch: /subscriber\.spec\.ts/u,
      use: {
        ...devices['iPhone 13'],
        baseURL: 'http://127.0.0.1:5173',
      },
    },
    {
      name: 'ops-desktop',
      testMatch: /ops\.spec\.ts/u,
      use: {
        baseURL: 'http://127.0.0.1:5174',
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
      command:
        'pnpm --filter @washed/core-api build && PORT=3000 HOST=127.0.0.1 pnpm --filter @washed/core-api dev',
      reuseExistingServer: !process.env['CI'],
      timeout: 120_000,
      url: 'http://127.0.0.1:3000/ready',
    },
    {
      command:
        'PORT=5173 WASHED_CORE_API_URL=http://127.0.0.1:3000 pnpm --filter @washed/subscriber-web dev',
      reuseExistingServer: !process.env['CI'],
      timeout: 30_000,
      url: 'http://127.0.0.1:5173',
    },
    {
      command:
        'PORT=5174 WASHED_CORE_API_URL=http://127.0.0.1:3000 pnpm --filter @washed/ops-web dev',
      reuseExistingServer: !process.env['CI'],
      timeout: 30_000,
      url: 'http://127.0.0.1:5174',
    },
  ],
});
