import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  expect: {
    timeout: 5_000,
  },
  fullyParallel: false,
  workers: 1,
  projects: [
    // Modern flagship target — iPhone 15/16/17 logical viewport (393×852).
    // The user's iPhone 17 simulator is 393×852; iPhone 17 Pro is 402×874.
    // We design at this size and verify it scales up cleanly.
    {
      name: 'subscriber-mobile',
      testMatch:
        /(subscriber|subscriber-visit|subscriber-returning|onboarding|screenshot|screenshot-iphone17)\.spec\.ts/u,
      use: {
        ...devices['iPhone 15 Pro'],
        baseURL: 'http://127.0.0.1:6173',
        viewport: { width: 393, height: 852 },
      },
    },
    // Smallest currently-supported viewport — iPhone SE 3rd gen (375×667).
    // The layout floor: still sold by Apple and common in emerging markets.
    // Playwright's named "iPhone SE" device is the 2016 1st-gen (320×568)
    // which Apple no longer sells, so we override the viewport explicitly.
    {
      name: 'subscriber-iphone-se',
      testMatch: /(onboarding|screenshot|subscriber-visit)\.spec\.ts/u,
      use: {
        ...devices['iPhone SE'],
        baseURL: 'http://127.0.0.1:6173',
        viewport: { width: 375, height: 667 },
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
