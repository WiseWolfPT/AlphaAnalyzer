import { test, expect } from '@playwright/test';

test.describe('Alfalyzer Smoke Tests - Simplified', () => {
  
  // Test 1: Landing page loads successfully
  test('Landing page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Alpha Analyzer/i);
    
    // Check for key elements
    const heroText = page.getByText('Análise Fundamental');
    await expect(heroText).toBeVisible();
  });

  // Test 2: Can navigate to find-stocks page
  test('Find stocks page loads', async ({ page }) => {
    await page.goto('/find-stocks');
    
    // Check for the page title
    const pageTitle = page.getByRole('heading', { name: /Find Stocks/i });
    await expect(pageTitle).toBeVisible();
    
    // Check for search input
    const searchInput = page.getByPlaceholder('Search stocks by symbol, name, or sector...');
    await expect(searchInput).toBeVisible();
  });

  // Test 3: Dashboard loads with cards
  test('Dashboard loads with investment cards', async ({ page }) => {
    await page.goto('/dashboard-enhanced');
    
    // Check for at least one investment card
    const cards = page.locator('.card, [class*="card"]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });
});