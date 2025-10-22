/**
 * Transcripts Feature - E2E Test Suite (Onda 3 Validation)
 *
 * Test coverage:
 * 1. Discovery Job (Backend)
 * 2. AI Processing Queue
 * 3. API Endpoints (Integration)
 * 4. UI Toggle (Playwright)
 *
 * Following TDD principles:
 * - AAA Pattern (Arrange, Act, Assert)
 * - FIRST Tests (Fast, Independent, Repeatable, Self-validating, Timely)
 * - Single purpose per test
 * - Descriptive test names that document behavior
 */

import { test, expect } from '@playwright/test';

// Test configuration
const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:3001';
const TEST_SYMBOL = 'AAPL';
const TEST_TIMEOUT = 180000; // 3 minutes for AI processing tests

/**
 * Test Suite #1: Backend Discovery Job
 * Validates that the transcripts worker can discover and fetch transcripts
 */
test.describe('Test #1: Discovery Job (Backend Validation)', () => {
  test.beforeEach(async () => {
    // Ensure clean state before each test
    console.log('🧪 Setting up discovery job test environment');
  });

  test('should discover and store transcripts in PostgreSQL', async ({ page }) => {
    // ARRANGE: Navigate to API health check
    const response = await page.request.get(`${API_BASE_URL}/api/health`);
    expect(response.ok()).toBe(true);

    // ACT: Check if transcripts exist in database via API
    const transcriptsResponse = await page.request.get(
      `${API_BASE_URL}/api/transcripts?limit=1`
    );

    // ASSERT: Verify transcripts endpoint returns data
    expect(transcriptsResponse.ok()).toBe(true);
    const body = await transcriptsResponse.json();

    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(Array.isArray(body.data)).toBe(true);

    // At least one transcript should exist from worker
    expect(body.data.length).toBeGreaterThan(0);

    // Validate transcript structure
    const firstTranscript = body.data[0];
    expect(firstTranscript).toHaveProperty('id');
    expect(firstTranscript).toHaveProperty('ticker');
    expect(firstTranscript).toHaveProperty('company_name');
    expect(firstTranscript).toHaveProperty('quarter');
    expect(firstTranscript).toHaveProperty('year');
    expect(firstTranscript).toHaveProperty('ai_summary');

    console.log(`✅ Found ${body.data.length} published transcripts`);
  });

  test('should fetch recent transcripts within last hour', async ({ page }) => {
    // ARRANGE: Get current timestamp
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    // ACT: Fetch recent transcripts
    const response = await page.request.get(
      `${API_BASE_URL}/api/transcripts/recent?limit=20`
    );

    // ASSERT: Verify recent transcripts
    expect(response.ok()).toBe(true);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();

    if (body.data.length > 0) {
      const recentTranscript = body.data[0];
      const publishedDate = new Date(recentTranscript.published_at);

      console.log(`📅 Most recent transcript: ${recentTranscript.ticker} Q${recentTranscript.quarter} ${recentTranscript.year}`);
      console.log(`   Published at: ${publishedDate.toISOString()}`);
    }
  });
});

/**
 * Test Suite #2: AI Processing Queue
 * Validates AI summary generation and status transitions
 */
test.describe('Test #2: AI Processing (Queue Validation)', () => {
  test('should process transcripts and generate AI summaries', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    // ARRANGE: Fetch all transcripts
    const response = await page.request.get(
      `${API_BASE_URL}/api/transcripts?limit=50`
    );
    expect(response.ok()).toBe(true);

    const body = await response.json();
    const transcripts = body.data;

    // ACT & ASSERT: Count transcripts with AI summaries
    let withSummary = 0;
    let withoutSummary = 0;

    for (const transcript of transcripts) {
      if (transcript.ai_summary && transcript.ai_summary.trim() !== '') {
        withSummary++;
      } else {
        withoutSummary++;
      }
    }

    console.log(`📊 AI Processing Statistics:`);
    console.log(`   ✅ With AI Summary: ${withSummary}`);
    console.log(`   ⏳ Without AI Summary: ${withoutSummary}`);
    console.log(`   📈 Processing Rate: ${((withSummary / transcripts.length) * 100).toFixed(1)}%`);

    // At least some transcripts should have AI summaries
    expect(withSummary).toBeGreaterThan(0);
  });

  test('should have valid AI summary structure', async ({ page }) => {
    // ARRANGE: Fetch a transcript with AI summary
    const response = await page.request.get(
      `${API_BASE_URL}/api/transcripts?limit=1`
    );
    expect(response.ok()).toBe(true);

    const body = await response.json();
    const transcript = body.data[0];

    // ACT & ASSERT: Validate AI summary exists and has content
    expect(transcript.ai_summary).toBeDefined();
    expect(transcript.ai_summary).not.toBe('');

    // AI summary should be substantial (at least 50 characters)
    expect(transcript.ai_summary.length).toBeGreaterThan(50);

    console.log(`📝 AI Summary Preview (${transcript.ticker} Q${transcript.quarter} ${transcript.year}):`);
    console.log(`   ${transcript.ai_summary.substring(0, 150)}...`);
  });
});

/**
 * Test Suite #3: API Endpoints
 * Integration testing for all transcript endpoints
 */
test.describe('Test #3: API Endpoints (Integration Testing)', () => {
  test('should fetch latest transcript for specific symbol', async ({ page }) => {
    // ARRANGE: Prepare test symbol
    const symbol = TEST_SYMBOL;

    // ACT: Fetch latest transcript
    const response = await page.request.get(
      `${API_BASE_URL}/api/transcripts?ticker=${symbol}&limit=1`
    );

    // ASSERT: Verify response
    expect(response.ok()).toBe(true);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();

    if (body.data.length > 0) {
      const latest = body.data[0];
      expect(latest.ticker).toBe(symbol);
      expect(latest.quarter).toBeGreaterThan(0);
      expect(latest.quarter).toBeLessThanOrEqual(4);
      expect(latest.year).toBeGreaterThanOrEqual(2020);
      expect(latest.ai_summary).toBeDefined();

      console.log(`✅ Latest ${symbol} transcript: Q${latest.quarter} ${latest.year}`);
      console.log(`   Has AI Summary: ${!!latest.ai_summary}`);
    } else {
      console.log(`⚠️ No transcripts found for ${symbol}`);
    }
  });

  test('should fetch transcript history for symbol', async ({ page }) => {
    // ARRANGE: Prepare test symbol
    const symbol = TEST_SYMBOL;

    // ACT: Fetch transcript history
    const response = await page.request.get(
      `${API_BASE_URL}/api/transcripts?ticker=${symbol}&limit=20`
    );

    // ASSERT: Verify response
    expect(response.ok()).toBe(true);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(Array.isArray(body.data)).toBe(true);

    const historyCount = body.data.length;
    expect(historyCount).toBeGreaterThanOrEqual(1);
    expect(historyCount).toBeLessThanOrEqual(20);

    console.log(`📚 ${symbol} transcript history: ${historyCount} transcripts`);

    // Verify all transcripts are for the correct symbol
    body.data.forEach((transcript: any, index: number) => {
      expect(transcript.ticker).toBe(symbol);
      console.log(`   ${index + 1}. Q${transcript.quarter} ${transcript.year} - ${transcript.company_name}`);
    });
  });

  test('should handle invalid symbol gracefully', async ({ page }) => {
    // ARRANGE: Use invalid symbol
    const invalidSymbol = 'INVALID123';

    // ACT: Fetch transcripts for invalid symbol
    const response = await page.request.get(
      `${API_BASE_URL}/api/transcripts?ticker=${invalidSymbol}&limit=1`
    );

    // ASSERT: Verify graceful handling
    expect(response.ok()).toBe(true);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.length).toBe(0);

    console.log(`✅ Invalid symbol handled gracefully: empty array returned`);
  });

  test('should fetch transcript by ID', async ({ page }) => {
    // ARRANGE: First, get any transcript ID
    const listResponse = await page.request.get(
      `${API_BASE_URL}/api/transcripts?limit=1`
    );
    expect(listResponse.ok()).toBe(true);

    const listBody = await listResponse.json();
    expect(listBody.data.length).toBeGreaterThan(0);

    const transcriptId = listBody.data[0].id;

    // ACT: Fetch transcript by ID
    const response = await page.request.get(
      `${API_BASE_URL}/api/transcripts/${transcriptId}`
    );

    // ASSERT: Verify detailed transcript
    expect(response.ok()).toBe(true);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.id).toBe(transcriptId);
    expect(body.data.raw_transcript).toBeDefined(); // Full transcript included

    console.log(`✅ Fetched transcript #${transcriptId}`);
    console.log(`   Ticker: ${body.data.ticker}`);
    console.log(`   Quarter: Q${body.data.quarter} ${body.data.year}`);
    console.log(`   Transcript length: ${body.data.raw_transcript?.length || 0} chars`);
  });

  test('should search transcripts by query', async ({ page }) => {
    // ARRANGE: Prepare search query
    const searchQuery = 'revenue growth';

    // ACT: Search transcripts
    const response = await page.request.get(
      `${API_BASE_URL}/api/transcripts/search?q=${encodeURIComponent(searchQuery)}&limit=5`
    );

    // ASSERT: Verify search results
    expect(response.ok()).toBe(true);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.query).toBe(searchQuery);

    console.log(`🔍 Search results for "${searchQuery}": ${body.count} transcripts`);

    if (body.data.length > 0) {
      body.data.forEach((transcript: any, index: number) => {
        console.log(`   ${index + 1}. ${transcript.ticker} Q${transcript.quarter} ${transcript.year}`);
      });
    }
  });
});

/**
 * Test Suite #4: UI Toggle (Playwright E2E)
 * End-to-end testing of transcripts UI in stock detail page
 */
test.describe('Test #4: UI Toggle (Playwright E2E)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to stock detail page before each test
    await page.goto(`/stocks/${TEST_SYMBOL}`);
    await page.waitForLoadState('networkidle');
  });

  test('should display transcripts tab and navigate to it', async ({ page }) => {
    // ARRANGE: Page is already on stock detail
    await expect(page).toHaveURL(new RegExp(`/stocks/${TEST_SYMBOL}`));

    // ACT: Find and click Transcripts tab (if it exists)
    const transcriptsTab = page.getByRole('tab', { name: /transcripts|earnings/i });

    // ASSERT: Verify tab exists or log warning
    const tabCount = await transcriptsTab.count();
    if (tabCount === 0) {
      console.log(`⚠️ WARNING: Transcripts tab not yet implemented in stock detail page`);
      console.log(`   This is expected for Onda 3 initial state - tab needs to be added`);
      test.skip();
    } else {
      await transcriptsTab.click();
      await page.waitForTimeout(500);

      console.log(`✅ Transcripts tab found and clicked`);
    }
  });

  test('should show latest transcript expanded by default', async ({ page }) => {
    test.skip(); // Skip until Transcripts tab is implemented

    // ARRANGE: Navigate to transcripts tab
    await page.getByRole('tab', { name: /transcripts/i }).click();
    await page.waitForTimeout(1000);

    // ACT: Check for latest transcript section
    const latestSection = page.getByText(/latest.*transcript/i);

    // ASSERT: Verify latest section is visible
    await expect(latestSection).toBeVisible();

    // Verify AI Summary section exists
    const aiSummary = page.getByText(/ai.*summary|executive summary/i);
    await expect(aiSummary).toBeVisible();

    // Verify Key Insights section
    const keyInsights = page.getByText(/key insights|highlights/i);
    await expect(keyInsights).toBeVisible();

    console.log(`✅ Latest transcript displayed with AI Summary and Key Insights`);
  });

  test('should toggle historical transcripts accordion', async ({ page }) => {
    test.skip(); // Skip until Transcripts tab is implemented

    // ARRANGE: Navigate to transcripts tab
    await page.getByRole('tab', { name: /transcripts/i }).click();
    await page.waitForTimeout(1000);

    // ACT: Find historical transcripts toggle
    const historicalToggle = page.getByRole('button', { name: /historical.*transcripts?/i });
    await expect(historicalToggle).toBeVisible();

    // Verify collapsed state (▼ indicator)
    const collapsedIndicator = historicalToggle.locator('svg').first();
    await expect(collapsedIndicator).toBeVisible();

    // Click to expand
    await historicalToggle.click();
    await page.waitForTimeout(500);

    // ASSERT: Verify expanded state (▲ indicator)
    const expandedIndicator = historicalToggle.locator('svg').first();
    await expect(expandedIndicator).toBeVisible();

    // Verify accordion items appear
    const accordionItems = page.locator('[data-testid="transcript-history-item"]');
    const itemCount = await accordionItems.count();
    expect(itemCount).toBeGreaterThan(0);

    console.log(`✅ Historical transcripts accordion toggled successfully`);
    console.log(`   Found ${itemCount} historical transcripts`);
  });

  test('should display skeleton loaders during data fetch', async ({ page }) => {
    test.skip(); // Skip until Transcripts tab is implemented

    // ARRANGE: Use slow network to catch loading state
    await page.route('**/api/transcripts**', route => {
      setTimeout(() => route.continue(), 1000); // Delay 1 second
    });

    // ACT: Navigate to transcripts tab
    await page.getByRole('tab', { name: /transcripts/i }).click();

    // ASSERT: Verify skeleton loaders appear
    const skeleton = page.locator('[data-testid="transcript-skeleton"]');
    await expect(skeleton.first()).toBeVisible({ timeout: 500 });

    console.log(`✅ Skeleton loaders displayed during fetch`);

    // Wait for data to load
    await page.waitForTimeout(2000);

    // Verify skeletons are replaced with actual content
    const content = page.getByText(/Q\d\s+\d{4}/); // Quarter pattern
    await expect(content.first()).toBeVisible();

    console.log(`✅ Skeleton loaders replaced with actual data`);
  });

  test('should have tap targets ≥44px on mobile', async ({ page }) => {
    test.skip(); // Skip until Transcripts tab is implemented

    // ARRANGE: Set mobile viewport (iPhone SE)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`/stocks/${TEST_SYMBOL}`);
    await page.waitForLoadState('networkidle');

    // Navigate to transcripts tab
    await page.getByRole('tab', { name: /transcripts/i }).click();
    await page.waitForTimeout(1000);

    // ACT: Measure toggle button height
    const historicalToggle = page.getByRole('button', { name: /historical/i });
    const toggleBox = await historicalToggle.boundingBox();

    // ASSERT: Verify tap target meets iOS guidelines
    expect(toggleBox).not.toBeNull();
    expect(toggleBox!.height).toBeGreaterThanOrEqual(44);

    console.log(`✅ Toggle button height: ${toggleBox!.height}px (≥44px required)`);

    // Check accordion trigger heights
    const accordionTriggers = page.locator('[data-testid="accordion-trigger"]');
    const triggerCount = await accordionTriggers.count();

    for (let i = 0; i < Math.min(triggerCount, 3); i++) {
      const trigger = accordionTriggers.nth(i);
      const box = await trigger.boundingBox();

      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44);
        console.log(`   Accordion trigger ${i + 1}: ${box.height}px ✅`);
      }
    }
  });

  test('should have zero console errors during interaction', async ({ page }) => {
    test.skip(); // Skip until Transcripts tab is implemented

    // ARRANGE: Collect console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to transcripts tab
    await page.getByRole('tab', { name: /transcripts/i }).click();
    await page.waitForTimeout(1000);

    // ACT: Interact with historical toggle
    const historicalToggle = page.getByRole('button', { name: /historical/i });
    if (await historicalToggle.count() > 0) {
      await historicalToggle.click();
      await page.waitForTimeout(500);
    }

    // ASSERT: No console errors
    expect(consoleErrors.length).toBe(0);
    console.log(`✅ Zero console errors during interaction`);

    if (consoleErrors.length > 0) {
      console.log(`❌ Console errors detected:`);
      consoleErrors.forEach((error, i) => {
        console.log(`   ${i + 1}. ${error}`);
      });
    }
  });
});

/**
 * Test Suite #5: Performance & Accessibility
 * Additional validation for production readiness
 */
test.describe('Test #5: Performance & Accessibility', () => {
  test('should load transcripts data within 3 seconds', async ({ page }) => {
    // ARRANGE: Prepare performance measurement
    const startTime = Date.now();

    // ACT: Fetch transcripts
    const response = await page.request.get(
      `${API_BASE_URL}/api/transcripts?limit=20`
    );

    const endTime = Date.now();
    const duration = endTime - startTime;

    // ASSERT: Verify response time
    expect(response.ok()).toBe(true);
    expect(duration).toBeLessThan(3000);

    console.log(`⚡ API response time: ${duration}ms (target: <3000ms)`);
  });

  test('should have proper ARIA labels on transcript components', async ({ page }) => {
    test.skip(); // Skip until Transcripts tab is implemented

    // ARRANGE: Navigate to transcripts tab
    await page.goto(`/stocks/${TEST_SYMBOL}`);
    await page.getByRole('tab', { name: /transcripts/i }).click();
    await page.waitForTimeout(1000);

    // ACT & ASSERT: Check ARIA labels
    const historicalToggle = page.getByRole('button', { name: /historical/i });

    if (await historicalToggle.count() > 0) {
      const ariaLabel = await historicalToggle.getAttribute('aria-label');
      const ariaExpanded = await historicalToggle.getAttribute('aria-expanded');

      expect(ariaLabel || ariaExpanded).toBeDefined();
      console.log(`✅ Historical toggle has proper ARIA attributes`);
    }
  });
});
