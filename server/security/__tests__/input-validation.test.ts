/**
 * Security Input Validation Tests
 *
 * Test suite for all input validation functions.
 * Validates protection against:
 * - SQL injection
 * - Redis key injection
 * - Path traversal
 * - Memory exhaustion
 * - Log injection
 */

import { describe, it, expect } from 'vitest';
import {
  validateSymbol,
  validateTTL,
  requireEnv,
  sanitizeLogInput,
  SYMBOL_REGEX
} from '../input-validation';

describe('validateSymbol', () => {
  describe('Valid symbols', () => {
    it('should accept standard ticker symbols', () => {
      expect(validateSymbol('AAPL')).toBe('AAPL');
      expect(validateSymbol('MSFT')).toBe('MSFT');
      expect(validateSymbol('GOOGL')).toBe('GOOGL');
    });

    it('should accept symbols with hyphens', () => {
      expect(validateSymbol('BRK-B')).toBe('BRK-B');
      expect(validateSymbol('BF-A')).toBe('BF-A');
    });

    it('should accept symbols with dots', () => {
      expect(validateSymbol('BRK.B')).toBe('BRK.B');
      expect(validateSymbol('BF.A')).toBe('BF.A');
    });

    it('should normalize to uppercase', () => {
      expect(validateSymbol('aapl')).toBe('AAPL');
      expect(validateSymbol('MsFt')).toBe('MSFT');
    });

    it('should trim whitespace', () => {
      expect(validateSymbol('  AAPL  ')).toBe('AAPL');
      expect(validateSymbol('\tMSFT\n')).toBe('MSFT');
    });

    it('should accept symbols with numbers', () => {
      expect(validateSymbol('GOOGL1')).toBe('GOOGL1');
      expect(validateSymbol('ABC123')).toBe('ABC123');
    });
  });

  describe('Invalid symbols - Security threats', () => {
    it('should reject SQL injection attempts', () => {
      expect(() => validateSymbol("AAPL'; DROP TABLE")).toThrow('INVALID_SYMBOL');
      expect(() => validateSymbol("AAPL\" OR 1=1--")).toThrow('INVALID_SYMBOL');
      expect(() => validateSymbol("'; DELETE FROM")).toThrow('INVALID_SYMBOL');
      expect(() => validateSymbol('AAPL`')).toThrow('INVALID_SYMBOL');
    });

    it('should reject path traversal attempts', () => {
      expect(() => validateSymbol('../../etc/passwd')).toThrow('INVALID_SYMBOL');
      expect(() => validateSymbol('../../../etc')).toThrow('INVALID_SYMBOL');
      expect(() => validateSymbol('..\\..\\windows')).toThrow('INVALID_SYMBOL');
      expect(() => validateSymbol('/etc/passwd')).toThrow('INVALID_SYMBOL');
    });

    it('should reject Redis key injection attempts', () => {
      expect(() => validateSymbol('AAPL\nmalicious')).toThrow('INVALID_SYMBOL');
      expect(() => validateSymbol('AAPL\rmalicious')).toThrow('INVALID_SYMBOL');
      expect(() => validateSymbol('AAPL:malicious')).toThrow('INVALID_SYMBOL');
    });

    it('should reject control characters', () => {
      expect(() => validateSymbol('AAPL\x00')).toThrow('INVALID_SYMBOL');
      expect(() => validateSymbol('AAPL\x1F')).toThrow('INVALID_SYMBOL');
      expect(() => validateSymbol('\x00AAPL')).toThrow('INVALID_SYMBOL');
    });

    it('should reject empty or null symbols', () => {
      expect(() => validateSymbol('')).toThrow('INVALID_SYMBOL');
      expect(() => validateSymbol('   ')).toThrow('INVALID_SYMBOL');
      expect(() => validateSymbol(null)).toThrow('INVALID_SYMBOL');
      expect(() => validateSymbol(undefined)).toThrow('INVALID_SYMBOL');
    });

    it('should reject symbols that are too long', () => {
      expect(() => validateSymbol('TOOLONGSYMBOL123')).toThrow('INVALID_SYMBOL');
      expect(() => validateSymbol('A'.repeat(11))).toThrow('INVALID_SYMBOL');
    });

    it('should reject special characters not allowed', () => {
      expect(() => validateSymbol('AAPL@')).toThrow('INVALID_SYMBOL');
      expect(() => validateSymbol('AAPL#')).toThrow('INVALID_SYMBOL');
      expect(() => validateSymbol('AAPL$')).toThrow('INVALID_SYMBOL');
      expect(() => validateSymbol('AAPL%')).toThrow('INVALID_SYMBOL');
      expect(() => validateSymbol('AAPL&')).toThrow('INVALID_SYMBOL');
      expect(() => validateSymbol('AAPL*')).toThrow('INVALID_SYMBOL');
      expect(() => validateSymbol('AAPL(')).toThrow('INVALID_SYMBOL');
      expect(() => validateSymbol('AAPL)')).toThrow('INVALID_SYMBOL');
    });
  });
});

describe('validateTTL', () => {
  describe('Valid TTLs', () => {
    it('should accept TTL within valid range', () => {
      expect(validateTTL(60)).toBe(60);           // 1 minute
      expect(validateTTL(300)).toBe(300);         // 5 minutes
      expect(validateTTL(3600)).toBe(3600);       // 1 hour
      expect(validateTTL(86400)).toBe(86400);     // 1 day
      expect(validateTTL(2592000)).toBe(2592000); // 30 days
    });

    it('should round fractional TTLs to integers', () => {
      expect(validateTTL(60.5)).toBe(60);
      expect(validateTTL(299.9)).toBe(299);
      expect(validateTTL(3600.1)).toBe(3600);
    });

    it('should accept minimum TTL (1 second)', () => {
      expect(validateTTL(1)).toBe(1);
    });

    it('should accept maximum TTL (30 days)', () => {
      expect(validateTTL(2592000)).toBe(2592000);
    });
  });

  describe('Invalid TTLs - Security threats', () => {
    it('should reject zero TTL (immediate expiration)', () => {
      expect(validateTTL(0, 300)).toBe(300); // Returns default
    });

    it('should reject negative TTLs', () => {
      expect(validateTTL(-1, 300)).toBe(300);
      expect(validateTTL(-100, 300)).toBe(300);
    });

    it('should cap TTLs above 30 days (memory exhaustion)', () => {
      expect(validateTTL(3000000, 300)).toBe(2592000); // Capped to max
      expect(validateTTL(Infinity, 300)).toBe(300);    // Returns default
    });

    it('should handle NaN gracefully', () => {
      expect(validateTTL(NaN, 300)).toBe(300);
    });

    it('should handle very large numbers', () => {
      // Number.MAX_VALUE is finite but > max, so should cap to max (2592000)
      expect(validateTTL(Number.MAX_VALUE, 300)).toBe(2592000); // Capped to max
    });
  });
});

describe('requireEnv', () => {
  it('should return value if set', () => {
    expect(requireEnv('TEST_VAR', 'test-value')).toBe('test-value');
  });

  it('should throw if value is undefined', () => {
    expect(() => requireEnv('TEST_VAR', undefined)).toThrow('SECURITY');
    expect(() => requireEnv('TEST_VAR', undefined)).toThrow('TEST_VAR');
  });

  it('should throw if value is empty string', () => {
    expect(() => requireEnv('TEST_VAR', '')).toThrow('SECURITY');
    expect(() => requireEnv('TEST_VAR', '   ')).toThrow('SECURITY');
  });
});

describe('sanitizeLogInput', () => {
  it('should remove newlines', () => {
    expect(sanitizeLogInput('line1\nline2')).toBe('line1 line2');
    expect(sanitizeLogInput('line1\rline2')).toBe('line1 line2');
    expect(sanitizeLogInput('line1\r\nline2')).toBe('line1  line2');
  });

  it('should remove control characters', () => {
    expect(sanitizeLogInput('test\x00malicious')).toBe('testmalicious');
    expect(sanitizeLogInput('test\x1Fmalicious')).toBe('testmalicious');
  });

  it('should limit length to 200 characters', () => {
    const longString = 'A'.repeat(300);
    expect(sanitizeLogInput(longString)).toHaveLength(200);
  });

  it('should handle normal strings unchanged', () => {
    expect(sanitizeLogInput('Normal log message')).toBe('Normal log message');
    expect(sanitizeLogInput('AAPL stock price: $150.25')).toBe('AAPL stock price: $150.25');
  });
});

describe('SYMBOL_REGEX', () => {
  it('should match valid patterns', () => {
    expect(SYMBOL_REGEX.test('AAPL')).toBe(true);
    expect(SYMBOL_REGEX.test('BRK-B')).toBe(true);
    expect(SYMBOL_REGEX.test('BRK.B')).toBe(true);
    expect(SYMBOL_REGEX.test('ABC123')).toBe(true);
  });

  it('should reject invalid patterns', () => {
    expect(SYMBOL_REGEX.test('AAPL; DROP')).toBe(false);
    expect(SYMBOL_REGEX.test('../etc')).toBe(false);
    expect(SYMBOL_REGEX.test('AAPL\n')).toBe(false);
    expect(SYMBOL_REGEX.test('')).toBe(false);
    expect(SYMBOL_REGEX.test('TOOLONGSYMBOL123')).toBe(false);
  });
});
