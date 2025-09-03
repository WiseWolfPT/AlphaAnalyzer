import { defineConfig } from '@playwright/test';

export default defineConfig({
  timeout: 60_000,
  reporter: [['list'], ['html', { outputFolder: '.playwright-report' }]],
  use: {
    baseURL: process.env.TARGET_URL || 'http://localhost:3000',
    headless: true,
    ignoreHTTPSErrors: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  webServer: process.env.WEB_SERVER
    ? {
        command: 'npm run dev',
        port: 3000,
        reuseExistingServer: true,
        timeout: 120_000,
      }
    : undefined,
});

