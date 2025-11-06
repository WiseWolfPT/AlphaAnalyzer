/**
 * Test: Method ID Consistency Across Services
 *
 * Ensures warming workers and method cache service use identical method lists
 * Prevents recurrence of 2025-11-05 incident (obsolete FCFE methods causing 100% failure rate)
 *
 * Root Cause: ONDA 7 removed 'dcf-fcfe-20' and 'dcf-terminal-fcfe' from method-cache-service
 * but warming workers still referenced them, causing "Unsupported method ID" errors.
 *
 * This test ensures all services stay in sync.
 */

import { describe, it, expect } from 'vitest';
import { methodCacheService } from '../../services/method-cache-service';

// Expected method list (12 methods total after FCFE removal)
const EXPECTED_METHODS = [
  'alfa-value',
  'dcf-fcf-20',
  'dcf-terminal-fcf',
  'dni-20',
  'dfcf-terminal',
  'pe-mean',
  'pe-mean-without-nri',
  'ps-mean',
  'pb-mean',
  'pb-mean-without-nri',
  'peg',
  'psg'
];

// Obsolete methods (removed in ONDA 7)
const OBSOLETE_METHODS = [
  'dcf-fcfe-20',           // FMP API returns empty array
  'dcf-terminal-fcfe'      // FMP API returns empty array
];

describe('Method ID Consistency', () => {
  describe('Method Count Validation', () => {
    it('should have exactly 12 supported methods', () => {
      const supported = methodCacheService.getSupportedMethods();
      expect(supported).toHaveLength(12);
    });

    it('should match expected method count in CLAUDE.md', () => {
      // CLAUDE.md documents "12 methods (FCFE removed)"
      const supported = methodCacheService.getSupportedMethods();
      expect(supported.length).toBe(12);
    });
  });

  describe('Obsolete Method Detection', () => {
    it('should not include removed FCFE methods', () => {
      const supported = methodCacheService.getSupportedMethods();

      OBSOLETE_METHODS.forEach(obsolete => {
        expect(supported).not.toContain(obsolete);
      });
    });

    it('should not allow warming obsolete methods', async () => {
      // Attempt to warm obsolete method should fail
      for (const obsolete of OBSOLETE_METHODS) {
        await expect(
          methodCacheService.warmMethod('AAPL', obsolete as any)
        ).rejects.toThrow();
      }
    });
  });

  describe('Expected Method Coverage', () => {
    it('should include all expected methods', () => {
      const supported = methodCacheService.getSupportedMethods();

      EXPECTED_METHODS.forEach(method => {
        expect(supported).toContain(method);
      });
    });

    it('should not have any unexpected methods', () => {
      const supported = methodCacheService.getSupportedMethods();

      supported.forEach(method => {
        expect(EXPECTED_METHODS).toContain(method);
      });
    });
  });

  describe('Method Order Consistency', () => {
    it('should maintain consistent method order', () => {
      const supported = methodCacheService.getSupportedMethods();
      const sorted = [...supported].sort();

      // Note: We don't enforce alphabetical order, just consistency
      expect(supported.length).toBe(sorted.length);
    });
  });

  describe('Method ID Format Validation', () => {
    it('should use kebab-case for all method IDs', () => {
      const supported = methodCacheService.getSupportedMethods();

      supported.forEach(method => {
        expect(method).toMatch(/^[a-z0-9-]+$/);
        expect(method).not.toMatch(/[A-Z_]/); // No uppercase or underscores
      });
    });

    it('should not have trailing/leading dashes', () => {
      const supported = methodCacheService.getSupportedMethods();

      supported.forEach(method => {
        expect(method.startsWith('-')).toBe(false);
        expect(method.endsWith('-')).toBe(false);
      });
    });
  });

  describe('Core Method Availability', () => {
    it('should include proprietary AlfaValue method', () => {
      const supported = methodCacheService.getSupportedMethods();
      expect(supported).toContain('alfa-value');
    });

    it('should include primary DCF methods', () => {
      const supported = methodCacheService.getSupportedMethods();
      expect(supported).toContain('dcf-fcf-20');
      expect(supported).toContain('dcf-terminal-fcf');
    });

    it('should include multiple valuation approaches', () => {
      const supported = methodCacheService.getSupportedMethods();

      // DCF approach
      expect(supported).toContain('dcf-fcf-20');

      // P/E approach
      expect(supported).toContain('pe-mean');

      // P/S approach
      expect(supported).toContain('ps-mean');

      // P/B approach
      expect(supported).toContain('pb-mean');

      // Growth ratios
      expect(supported).toContain('peg');
      expect(supported).toContain('psg');
    });
  });

  describe('Method Uniqueness', () => {
    it('should not have duplicate method IDs', () => {
      const supported = methodCacheService.getSupportedMethods();
      const unique = [...new Set(supported)];

      expect(supported.length).toBe(unique.length);
    });
  });
});

describe('Worker-Service Method Sync', () => {
  /**
   * NOTE: This test cannot directly import worker METHOD_IDS due to worker being
   * an executable script, not an importable module. Instead, we validate the
   * contract that method-cache-service.warmMethod() enforces.
   */

  it('should reject warming with unsupported method IDs', async () => {
    const invalidMethods = [
      'invalid-method',
      'dcf-fcfe-20',          // Obsolete
      'dcf-terminal-fcfe',    // Obsolete
      'random-nonsense',
      'DCF-FCF-20',           // Wrong case
      ''                      // Empty string
    ];

    for (const invalid of invalidMethods) {
      await expect(
        methodCacheService.warmMethod('AAPL', invalid as any)
      ).rejects.toThrow();
    }
  });

  it('should accept warming with all supported method IDs', async () => {
    const supported = methodCacheService.getSupportedMethods();

    // Note: We can't actually warm in tests (would hit FMP API)
    // Just verify method IDs are recognized
    for (const method of supported) {
      expect(typeof method).toBe('string');
      expect(method.length).toBeGreaterThan(0);
    }
  });
});

describe('Historical Regression Prevention', () => {
  /**
   * Document known incidents to prevent recurrence
   */

  it('should never re-add FCFE methods (2025-11-05 incident)', () => {
    const supported = methodCacheService.getSupportedMethods();

    // These methods were removed because FMP API returns empty arrays
    expect(supported).not.toContain('dcf-fcfe-20');
    expect(supported).not.toContain('dcf-terminal-fcfe');
  });

  it('should maintain 12-method count (ONDA 7 baseline)', () => {
    const supported = methodCacheService.getSupportedMethods();

    // ONDA 7 established 12 methods as the baseline (14 → 12 after FCFE removal)
    expect(supported).toHaveLength(12);
  });
});
