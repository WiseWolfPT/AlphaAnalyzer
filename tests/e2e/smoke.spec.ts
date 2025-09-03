import { test, expect } from '@playwright/test';

const routes = [
  { path: '/compare', waitFor: 'h1:has-text("Compare Stocks")' },
  { path: '/find-stocks', waitFor: 'h1:has-text("Find Stocks")' },
  { path: '/stock/AAPL', waitFor: 'h1:has-text("AAPL")' },
  { path: '/intrinsic-value?symbol=AAPL', waitFor: 'h1:has-text("Intrinsic Value Calculator")' },
];

for (const { path, waitFor } of routes) {
  test(`smoke: ${path}`, async ({ page, baseURL }) => {
    const failed: Array<{ status: number; url: string }> = [];
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    page.on('response', (resp) => {
      const status = resp.status();
      if (status >= 400) failed.push({ status, url: resp.url() });
    });

    const url = `${baseURL}${path}`;
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded' });
    expect(resp?.status(), `HTTP status for ${url}`).toBeLessThan(400);
    await page.waitForSelector(waitFor, { timeout: 30_000 });

    await page.screenshot({ path: `.playwright-mcp/smoke-${encodeURIComponent(path)}.png`, fullPage: true });

    // Fail test if there are critical 5xx or specific known-noisy 404s beyond allowlist
    const critical = failed.filter(f => f.status >= 500);
    expect(critical, `5xx responses on ${path}: ${JSON.stringify(critical, null, 2)}`).toHaveLength(0);
  });
}

