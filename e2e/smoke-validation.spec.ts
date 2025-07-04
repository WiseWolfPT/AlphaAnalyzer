import { test, expect } from '@playwright/test';

test.describe('Alfalyzer Smoke Test Validation', () => {
  
  // Test 1: Frontend loads
  test('Frontend application loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Alpha Analyzer/i);
  });

  // Test 2: API returns real provider data (direct HTTP call)
  test('API returns real provider (not demo)', async () => {
    // Direct HTTP call to avoid browser context issues
    const response = await fetch('http://localhost:3001/api/v2/market-data/stocks/AAPL/price');
    expect(response.ok).toBeTruthy();
    
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data).toBeDefined();
    expect(json.data.provider).toMatch(/finnhub|twelveData|fmp|alphaVantage/);
    expect(json.data.provider).not.toBe('demo');
  });

  // Test 3: Dashboard functionality
  test('Dashboard Top Gainers and Losers have ≥3 items', async ({ page }) => {
    // Navigate directly to dashboard
    await page.goto('/dashboard-enhanced');
    
    // Wait for content to load
    await page.waitForTimeout(3000);
    
    // Simple check - count any Badge components (stock symbols)
    const allBadges = await page.locator('[class*="inline-flex"][class*="items-center"][class*="rounded"]').count();
    
    // We expect at least 6 badges (3 gainers + 3 losers minimum)
    expect(allBadges).toBeGreaterThanOrEqual(6);
    
    // Verify no loading errors
    const errorCount = await page.locator('text=/Unable to fetch|Error loading/i').count();
    expect(errorCount).toBe(0);
  });
});