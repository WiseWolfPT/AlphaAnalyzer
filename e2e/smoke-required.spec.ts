import { test, expect } from '@playwright/test';

test.describe('Alfalyzer Required Smoke Tests', () => {
  
  // Test 1: Basic functionality - Landing page works
  test('Landing page loads successfully', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Alpha Analyzer/i);
    await expect(page.getByText('Análise Fundamental')).toBeVisible();
  });

  // Test 2: API returns real provider (not demo)
  test('API returns real provider data', async ({ page }) => {
    // Use page.request to make API call within browser context
    const response = await page.request.get('http://localhost:3001/api/v2/market-data/stocks/AAPL/price');
    
    expect(response.ok()).toBeTruthy();
    
    const json = await response.json();
    
    // Verify success response
    expect(json).toHaveProperty('success', true);
    expect(json).toHaveProperty('data');
    
    const data = json.data;
    
    // Verify provider matches real provider pattern
    expect(data.provider).toMatch(/finnhub|twelveData|fmp|alphaVantage/);
    expect(data.provider).not.toBe('demo');
    
    // Verify price data
    expect(data.symbol).toBe('AAPL');
    expect(data.price).toBeGreaterThan(0);
  });

  // Test 3: Enhanced dashboard has stock cards
  test('Dashboard shows Top Gainers and Losers with ≥3 items', async ({ page }) => {
    await page.goto('/dashboard-enhanced');
    
    // Wait for page to fully load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000); // Give time for data to load
    
    // Check Top Gainers card exists and has items
    const gainersTitle = page.getByText('Top Gainers Today');
    await expect(gainersTitle).toBeVisible({ timeout: 10000 });
    
    // Count items with stock badges (more reliable selector)
    const gainersStockBadges = page.locator('[class*="border-green-300"][class*="text-green-700"]');
    await expect(gainersStockBadges).toHaveCount(5, { timeout: 10000 }); // We show top 5
    const gainersCount = await gainersStockBadges.count();
    expect(gainersCount).toBeGreaterThanOrEqual(3);
    
    // Check Top Losers card exists and has items
    const losersTitle = page.getByText('Top Losers Today');
    await expect(losersTitle).toBeVisible({ timeout: 10000 });
    
    // Count items with stock badges
    const losersStockBadges = page.locator('[class*="border-red-300"][class*="text-red-700"]');
    await expect(losersStockBadges).toHaveCount(5, { timeout: 10000 }); // We show top 5
    const losersCount = await losersStockBadges.count();
    expect(losersCount).toBeGreaterThanOrEqual(3);
  });
});