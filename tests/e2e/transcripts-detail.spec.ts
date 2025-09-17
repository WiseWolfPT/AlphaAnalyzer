import { test, expect } from '@playwright/test';

test.describe('Transcripts Detail Page', () => {
  test('navigates from list and renders summary + transcript', async ({ page }) => {
    test.setTimeout(45_000);

    // Try via UI list first
    await page.goto('/transcripts');
    await expect(page.getByText('Earnings Transcripts')).toBeVisible();

    // Wait briefly for list fetch
    await page.waitForTimeout(1000);

    const readButtons = page.getByRole('button', { name: /read transcript/i });
    const count = await readButtons.count();

    if (count > 0) {
      await readButtons.first().click();
    } else {
      // Fallback to API: fetch first transcript id (use current origin)
      const base = page.url().startsWith('http')
        ? new URL(page.url())
        : new URL(process.env.TARGET_URL || 'http://localhost:3000');
      const res = await page.request.get(new URL('/api/transcripts?limit=1', base.origin).toString());
      expect(res.ok()).toBe(true);
      const body = await res.json();
      const id = body?.data?.[0]?.id;
      expect(id, 'expected at least one published transcript in API').toBeTruthy();
      await page.goto(`/transcript/${id}`);
    }

    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/transcript\/(\d+)$/);

    // Header and transcript tab
    await expect(page.getByText('Full Earnings Call Transcript')).toBeVisible();

    // Ensure transcript content area is present (paragraphs or fallback text)
    const transcriptContent = page.locator('text=Transcript not available.');
    const hasFallback = await transcriptContent.count();
    if (hasFallback === 0) {
      // Expect at least one paragraph rendered
      const paragraphs = page.locator('main .prose p');
      await expect(paragraphs.first()).toBeVisible();
    }

    // Summary tab
    await page.getByRole('tab', { name: /summary/i }).click();
    await expect(page.getByText('Executive Summary')).toBeVisible();
    // Accept either real summary or fallback message
    const summaryFallback = page.getByText('Summary not available yet.');
    const hasSummaryFallback = await summaryFallback.count();
    if (hasSummaryFallback === 0) {
      // Should have some text content
      const summaryPara = page.locator('main .prose p');
      await expect(summaryPara.first()).toBeVisible();
    }

    // Metrics/Financial Highlights tab should render container
    await page.getByRole('tab', { name: /metrics/i }).click();
    await expect(page.getByText('Financial Highlights')).toBeVisible();

    // AI Insights panel present
    await expect(page.getByText('AI Insights')).toBeVisible();
  });
});
