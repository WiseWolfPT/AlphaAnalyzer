import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './scripts/validation',
  timeout: 60_000,
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'validation-results/report' }],
    ['json', { outputFile: 'validation-results/test-results.json' }]
  ],
  use: {
    baseURL: process.env.TARGET_URL || 'https://128.140.45.28.sslip.io',
    headless: true,
    ignoreHTTPSErrors: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 15000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  outputDir: 'validation-results/test-artifacts',
  webServer: process.env.WEB_SERVER
    ? {
        command: 'npm run dev',
        port: 3000,
        reuseExistingServer: true,
        timeout: 120_000,
      }
    : undefined,
});

