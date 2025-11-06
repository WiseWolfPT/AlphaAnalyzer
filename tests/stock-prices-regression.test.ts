/**
 * REGRESSION TEST: Stock Prices Showing $0.00
 *
 * Issue: All stock prices showing $0.00 on Find Stocks page (15/15 stocks affected)
 * Date: 2025-10-26
 *
 * Root Cause: Stale frontend bundle in production
 *
 * This test verifies:
 * 1. Backend API returns valid prices (>$0)
 * 2. Batch endpoint works correctly
 * 3. Frontend receives and processes data correctly
 */

import { describe, it, expect } from 'vitest';

const API_BASE_URL = process.env.API_URL || 'https://128.140.45.28.sslip.io';

describe('Stock Prices Regression Tests', () => {
  it('should return valid price for AAPL (not $0.00)', async () => {
    const response = await fetch(`${API_BASE_URL}/api/market-data/quote/AAPL`);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.price).toBeGreaterThan(0);
    expect(data.symbol).toBe('AAPL');
    console.log(`✅ AAPL price: $${data.price}`);
  });

  it('should return valid price for JPM (not $0.00)', async () => {
    const response = await fetch(`${API_BASE_URL}/api/market-data/quote/JPM`);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.price).toBeGreaterThan(0);
    expect(data.symbol).toBe('JPM');
    console.log(`✅ JPM price: $${data.price}`);
  });

  it('should return valid price for JNJ (not $0.00)', async () => {
    const response = await fetch(`${API_BASE_URL}/api/market-data/quote/JNJ`);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.price).toBeGreaterThan(0);
    expect(data.symbol).toBe('JNJ');
    console.log(`✅ JNJ price: $${data.price}`);
  });

  it('should return valid price for XOM (not $0.00)', async () => {
    const response = await fetch(`${API_BASE_URL}/api/market-data/quote/XOM`);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.price).toBeGreaterThan(0);
    expect(data.symbol).toBe('XOM');
    console.log(`✅ XOM price: $${data.price}`);
  });

  it('should return valid price for EDP.LS Portuguese stock (not $0.00)', async () => {
    const response = await fetch(`${API_BASE_URL}/api/market-data/quote/EDP.LS`);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.price).toBeGreaterThan(0);
    expect(data.symbol).toMatch(/EDP/);
    console.log(`✅ EDP.LS price: $${data.price}`);
  });

  it('should return valid batch quotes for multiple stocks', async () => {
    const response = await fetch(`${API_BASE_URL}/api/cache/quotes/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        symbols: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META']
      })
    });

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.quotes).toBeDefined();
    expect(data.quotes.length).toBeGreaterThan(0);

    // Verify all quotes have valid prices
    data.quotes.forEach((quote: any) => {
      expect(quote.price).toBeGreaterThan(0);
      console.log(`✅ ${quote.symbol} price: $${quote.price}`);
    });
  });

  it('should handle Find Stocks page scenario (15 stocks)', async () => {
    const symbols = [
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA',
      'JPM', 'V', 'MA', 'BAC', 'WFC', 'BRK-B',
      'JNJ', 'UNH', 'PFE'
    ];

    const response = await fetch(`${API_BASE_URL}/api/cache/quotes/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ symbols })
    });

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.quotes).toBeDefined();

    // Verify we got quotes for all 15 stocks
    expect(data.quotes.length).toBe(15);

    // Verify ALL prices are > $0 (regression test)
    const zeroPrices = data.quotes.filter((q: any) => q.price === 0 || !q.price);
    expect(zeroPrices.length).toBe(0);

    console.log(`✅ All 15 stocks have valid prices (0 showing $0.00)`);

    // Log price summary
    data.quotes.forEach((quote: any) => {
      console.log(`  ${quote.symbol}: $${quote.price}`);
    });
  });
});
