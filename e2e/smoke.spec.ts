import { test, expect } from '@playwright/test';

test.describe('Alfalyzer Smoke Tests', () => {
  
  // Test 1: Login → redirect to /find-stocks
  test('Login redirects to find-stocks page', async ({ page }) => {
    // Go to landing page
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Click Beta Login button (simulates instant login)
    await page.getByRole('button', { name: 'Beta Login' }).click();
    
    // Should redirect to find-stocks
    await expect(page).toHaveURL(/.*\/find-stocks/, { timeout: 10000 });
    
    // Verify page loaded - look for the search functionality
    await expect(page.getByText('Search for stocks')).toBeVisible();
  });

  // Test 2: GET /api/v2/market-data/stocks/AAPL/price returns real provider
  test('API returns real provider (not demo)', async ({ request }) => {
    // Make request directly to backend port
    const response = await request.get('http://localhost:3001/api/v2/market-data/stocks/AAPL/price');
    
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    
    // Verify we have price data
    expect(data).toHaveProperty('symbol', 'AAPL');
    expect(data).toHaveProperty('price');
    expect(typeof data.price).toBe('number');
    expect(data.price).toBeGreaterThan(0);
    
    // Verify provider is real (not demo)
    expect(data).toHaveProperty('provider');
    expect(data.provider).not.toBe('demo');
    expect(['finnhub', 'twelve-data', 'fmp', 'alpha-vantage']).toContain(data.provider);
  });

  // Test 3: Top Gainers/Losers load without errors and show ≥3 items
  test('Dashboard Top Gainers and Losers load successfully', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard-enhanced');
    
    // Wait for Top Gainers card to load
    const gainersCard = page.locator('text=Top Gainers Today').locator('..');
    await expect(gainersCard).toBeVisible();
    
    // Wait for data to load (no loading skeletons)
    await expect(gainersCard.locator('.animate-pulse')).toHaveCount(0, { timeout: 10000 });
    
    // Count gainer items (should have at least 3)
    const gainersItems = gainersCard.locator('[role="button"]');
    const gainersCount = await gainersItems.count();
    expect(gainersCount).toBeGreaterThanOrEqual(3);
    
    // Wait for Top Losers card to load
    const losersCard = page.locator('text=Top Losers Today').locator('..');
    await expect(losersCard).toBeVisible();
    
    // Wait for data to load (no loading skeletons)
    await expect(losersCard.locator('.animate-pulse')).toHaveCount(0, { timeout: 10000 });
    
    // Count loser items (should have at least 3)
    const losersItems = losersCard.locator('[role="button"]');
    const losersCount = await losersItems.count();
    expect(losersCount).toBeGreaterThanOrEqual(3);
    
    // Verify no error alerts
    await expect(page.locator('text=Unable to fetch real-time data')).toHaveCount(0);
  });
});