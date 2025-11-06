/**
 * ETF False Positive Regression Tests
 *
 * This file permanently tracks stocks that were incorrectly classified as ETFs.
 * When a false positive is discovered:
 * 1. Add a test case here with the GitHub issue number
 * 2. Run tests to confirm it's now fixed
 * 3. Keep the test permanently to prevent regression
 *
 * Created: 2025-10-29 (FASE 3)
 */

import { describe, it, expect } from 'vitest';
import { isETF, getETFReason } from '../utils/stock-classifier';

describe('ETF False Positive Regression Tests', () => {
  describe('Historical False Positives - Fixed in FASE 1', () => {
    it('NFLX should never be classified as ETF (Fixed: 2025-10-29)', () => {
      // Netflix was incorrectly flagged as ETF due to overly broad pattern matching
      // Root cause: Name pattern "NFLX" matched ETF provider + indicator incorrectly
      // Fix: Enhanced known ETF list to use explicit 140+ ticker list instead of broad patterns
      expect(isETF('NFLX')).toBe(false);

      const reason = getETFReason('NFLX');
      expect(reason).toBeNull();
    });
  });

  describe('Known Good Stocks - Should Never Be ETFs', () => {
    /**
     * These are well-known legitimate stocks that should NEVER be classified as ETFs.
     * If any of these fail, there's a critical bug in the detection logic.
     */
    const knownGoodStocks = [
      'AAPL',  // Apple Inc.
      'MSFT',  // Microsoft Corporation
      'GOOGL', // Alphabet Inc. Class A
      'GOOG',  // Alphabet Inc. Class C
      'AMZN',  // Amazon.com Inc.
      'TSLA',  // Tesla Inc.
      'META',  // Meta Platforms Inc.
      'NVDA',  // NVIDIA Corporation
      'BRK.B', // Berkshire Hathaway Inc. Class B
      'JPM',   // JPMorgan Chase & Co.
      'JNJ',   // Johnson & Johnson
      'V',     // Visa Inc.
      'WMT',   // Walmart Inc.
      'PG',    // Procter & Gamble Company
      'MA',    // Mastercard Incorporated
      'UNH',   // UnitedHealth Group Incorporated
      'HD',    // The Home Depot Inc.
      'BAC',   // Bank of America Corporation
      'DIS',   // The Walt Disney Company
      'NFLX',  // Netflix Inc. (former false positive)
      'ADBE',  // Adobe Inc.
      'CRM',   // Salesforce Inc.
      'CSCO',  // Cisco Systems Inc.
      'PEP',   // PepsiCo Inc.
      'TMO',   // Thermo Fisher Scientific Inc.
    ];

    it.each(knownGoodStocks)(
      '%s should never be classified as ETF',
      (ticker) => {
        const result = isETF(ticker);
        expect(result).toBe(false);

        const reason = getETFReason(ticker);
        expect(reason).toBeNull();
      }
    );
  });

  describe('Known ETFs - Should Always Be Detected', () => {
    /**
     * These are confirmed ETFs that should ALWAYS be classified correctly.
     * If any of these fail, there's a critical bug in the detection logic.
     */
    const knownETFs = [
      'SPY',   // SPDR S&P 500 ETF Trust
      'QQQ',   // Invesco QQQ Trust
      'IWM',   // iShares Russell 2000 ETF
      'VTI',   // Vanguard Total Stock Market ETF
      'VOO',   // Vanguard S&P 500 ETF
      'GLD',   // SPDR Gold Shares
      'ARKK',  // ARK Innovation ETF
      'TLT',   // iShares 20+ Year Treasury Bond ETF
      'EFA',   // iShares MSCI EAFE ETF
      'AGG',   // iShares Core U.S. Aggregate Bond ETF
    ];

    it.each(knownETFs)(
      '%s should always be classified as ETF',
      (ticker) => {
        const result = isETF(ticker);
        expect(result).toBe(true);

        const reason = getETFReason(ticker);
        expect(reason).toBeTruthy();
      }
    );
  });

  describe('Edge Cases - Ambiguous Tickers', () => {
    /**
     * These tickers could potentially be confused but should be classified correctly.
     */
    it('BRK.B (Berkshire Hathaway B shares) should not be ETF despite dot notation', () => {
      expect(isETF('BRK.B')).toBe(false);
    });

    it('O (Realty Income REIT) should not be ETF despite being single letter', () => {
      expect(isETF('O')).toBe(false);
    });

    it('T (AT&T) should not be ETF despite being single letter', () => {
      expect(isETF('T')).toBe(false);
    });

    it('F (Ford) should not be ETF despite being single letter', () => {
      expect(isETF('F')).toBe(false);
    });
  });

  describe('Future False Positive Tracking', () => {
    /**
     * Template for adding new false positive cases:
     *
     * it('TICKER should not be ETF (GitHub Issue #XXX)', () => {
     *   expect(isETF('TICKER')).toBe(false);
     *   expect(getETFReason('TICKER')).toBeNull();
     * });
     */

    it('Placeholder test - add false positives as they are discovered', () => {
      // This ensures the test suite doesn't fail when empty
      expect(true).toBe(true);
    });

    // Add new false positives here as they're discovered
  });
});
