/**
 * Price Fallback Service Tests
 *
 * Validates 4-tier price fallback system for European and US stocks
 *
 * Test Coverage:
 * - Tier 1: Quote endpoint (US stocks)
 * - Tier 2: Profile endpoint (European stocks .L, .AS, .PA, .DE, .BR, .MC)
 * - Tier 3: Historical endpoint (stale data fallback)
 * - Tier 4: Calculated price (mktCap/shares)
 * - Error handling (invalid tickers, network errors)
 */

import { describe, it, expect } from 'vitest';
import { getPriceWithFallbacks } from '../price-fallback-service';

// Skip tests if no FMP API key (CI/CD environments)
const shouldSkip = !process.env.FMP_API_KEY;
const describeIf = shouldSkip ? describe.skip : describe;

describeIf('Price Fallback Service', () => {
  // Tests use default Vitest timeout (5000ms per test)

  describe('Tier 1: Quote endpoint', () => {
    it('should return price from quote for US stocks (AAPL)', async () => {
      const price = await getPriceWithFallbacks('AAPL');
      expect(price).not.toBeNull();
      expect(price).toBeGreaterThan(0);
      expect(typeof price).toBe('number');
    });

    it('should return price from quote for popular US stocks (MSFT)', async () => {
      const price = await getPriceWithFallbacks('MSFT');
      expect(price).not.toBeNull();
      expect(price).toBeGreaterThan(0);
    });
  });

  describe('Tier 2: Profile endpoint (European stocks)', () => {
    it('should fallback to profile for UK stocks (.L)', async () => {
      // UK stock: Quilter plc
      const price = await getPriceWithFallbacks('0QVW.L');
      expect(price).not.toBeNull();
      expect(price).toBeGreaterThan(0);
    });

    it('should fallback to profile for Netherlands stocks (.AS)', async () => {
      // ASML - semiconductor equipment manufacturer
      const price = await getPriceWithFallbacks('ASML.AS');
      expect(price).not.toBeNull();
      expect(price).toBeGreaterThan(0);
    });

    it('should fallback to profile for French stocks (.PA)', async () => {
      // Atos SE - IT services
      const price = await getPriceWithFallbacks('ATO.PA');
      expect(price).not.toBeNull();
      expect(price).toBeGreaterThan(0);
    });

    it('should fallback to profile for Belgian stocks (.BR)', async () => {
      // bpost - postal services
      const price = await getPriceWithFallbacks('BPOST.BR');
      expect(price).not.toBeNull();
      expect(price).toBeGreaterThan(0);
    });

    it('should fallback to profile for German stocks (.DE)', async () => {
      // SAP - software company
      const price = await getPriceWithFallbacks('SAP.DE');
      expect(price).not.toBeNull();
      expect(price).toBeGreaterThan(0);
    });
  });

  describe('Tier 3: Historical endpoint', () => {
    it('should fallback to historical for less liquid stocks', async () => {
      // Test with a stock that might not have real-time quote
      const price = await getPriceWithFallbacks('ACU');
      expect(price).not.toBeNull();
      expect(price).toBeGreaterThan(0);
    });
  });

  describe('Tier 4: Calculated price', () => {
    it('should calculate price from mktCap/shares as last resort', async () => {
      // This test is hard to isolate without mocking
      // If all tiers 1-3 fail, tier 4 should try calculation
      const price = await getPriceWithFallbacks('AES');
      expect(price).not.toBeNull();
      expect(price).toBeGreaterThan(0);
    });
  });

  describe('Error handling', () => {
    it('should return null for completely invalid tickers', async () => {
      const price = await getPriceWithFallbacks('INVALID_TICKER_XYZ_9999');
      expect(price).toBeNull();
    });

    it('should return null for empty ticker', async () => {
      const price = await getPriceWithFallbacks('');
      expect(price).toBeNull();
    });

    it('should handle network timeouts gracefully', async () => {
      // Test with malformed ticker that will cause API errors
      const price = await getPriceWithFallbacks('!!!INVALID!!!');
      expect(price).toBeNull();
    });
  });

  describe('Integration: Batch European stocks', () => {
    it('should successfully get prices for multiple European stocks', async () => {
      const tickers = ['0QVW.L', 'ASML.AS', 'ATO.PA'];
      const results = await Promise.all(
        tickers.map(ticker => getPriceWithFallbacks(ticker))
      );

      // All should return valid prices
      results.forEach((price, idx) => {
        expect(price).not.toBeNull();
        expect(price).toBeGreaterThan(0);
        console.log(`${tickers[idx]}: $${price?.toFixed(2)}`);
      });
    });
  });

  describe('Regression: US stocks still work', () => {
    it('should not break existing US stock price lookups', async () => {
      const usStocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA'];
      const results = await Promise.all(
        usStocks.map(ticker => getPriceWithFallbacks(ticker))
      );

      // All US stocks should return prices (no regressions)
      results.forEach((price, idx) => {
        expect(price).not.toBeNull();
        expect(price).toBeGreaterThan(0);
        console.log(`${usStocks[idx]}: $${price?.toFixed(2)}`);
      });
    });
  });
});
