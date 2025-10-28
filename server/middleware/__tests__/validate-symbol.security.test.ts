/**
 * SECURITY TEST: Symbol Validation - SQL Injection & Path Traversal Prevention
 *
 * P0 Fix #2: Comprehensive validation to prevent:
 * - SQL injection attacks
 * - Path traversal attacks
 * - Command injection
 * - NoSQL injection
 * - Invalid formats
 *
 * TDD RED PHASE: These tests WILL FAIL until implementation is complete
 */

import { describe, it, expect } from 'vitest';
import { validateSymbol, type SymbolValidationResult } from '../validate-symbol';

describe('Symbol Validation Security - P0 Fix #2', () => {
  describe('SQL Injection Prevention', () => {
    it('should reject SQL injection with quotes', () => {
      const malicious = ["AAPL'; DROP TABLE stocks--", "MSFT'; DELETE FROM users--", "' OR '1'='1"];

      malicious.forEach(symbol => {
        const result = validateSymbol(symbol);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid symbol format');
        expect(result.sanitized).toBeUndefined();
      });
    });

    it('should reject SQL injection with comments', () => {
      const malicious = ['AAPL--', 'MSFT/*comment*/', 'GOOGL#comment'];

      malicious.forEach(symbol => {
        const result = validateSymbol(symbol);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should reject SQL injection with UNION/SELECT', () => {
      const malicious = ['AAPL UNION SELECT', 'MSFT; SELECT * FROM'];

      malicious.forEach(symbol => {
        const result = validateSymbol(symbol);
        expect(result.valid).toBe(false);
      });
    });

    it('should reject SQL injection with semicolons', () => {
      const result = validateSymbol('AAPL;DELETE');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid symbol format');
    });
  });

  describe('Path Traversal Prevention', () => {
    it('should reject path traversal attempts', () => {
      const malicious = ['../../etc/passwd', '../../../root', '....//....//etc'];

      malicious.forEach(symbol => {
        const result = validateSymbol(symbol);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should reject encoded path traversal', () => {
      const malicious = ['%2e%2e%2f', '..%252f', '..%c0%af'];

      malicious.forEach(symbol => {
        const result = validateSymbol(symbol);
        expect(result.valid).toBe(false);
      });
    });

    it('should reject null bytes', () => {
      const result = validateSymbol('AAPL\x00');
      expect(result.valid).toBe(false);
    });
  });

  describe('Command Injection Prevention', () => {
    it('should reject shell metacharacters', () => {
      const malicious = ['AAPL|cat', 'MSFT&rm', 'GOOGL`id`', 'TSLA$(whoami)'];

      malicious.forEach(symbol => {
        const result = validateSymbol(symbol);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid symbol format');
      });
    });

    it('should reject newlines and control characters', () => {
      const malicious = ['AAPL\n', 'MSFT\r', 'GOOGL\t'];

      malicious.forEach(symbol => {
        const result = validateSymbol(symbol);
        expect(result.valid).toBe(false);
      });
    });
  });

  describe('NoSQL Injection Prevention', () => {
    it('should reject MongoDB operators', () => {
      const malicious = ['{"$gt": ""}', '{"$ne": null}', '{$where: "1==1"}'];

      malicious.forEach(symbol => {
        const result = validateSymbol(symbol);
        expect(result.valid).toBe(false);
      });
    });

    it('should reject JSON-like structures', () => {
      const result = validateSymbol('{"symbol": "AAPL"}');
      expect(result.valid).toBe(false);
    });
  });

  describe('Format Validation', () => {
    it('should accept valid stock symbols', () => {
      const valid = ['AAPL', 'MSFT', 'GOOGL', 'BRK-B', 'BRK.B', 'EDP.LS', 'SAP.DE'];

      valid.forEach(symbol => {
        const result = validateSymbol(symbol);
        expect(result.valid).toBe(true);
        expect(result.sanitized).toBeDefined();
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject empty or whitespace-only symbols', () => {
      const invalidWithMessage = [
        { input: '', expectedError: 'Symbol must be a string' },
        { input: '   ', expectedError: 'Symbol is required' },
        { input: '\t', expectedError: 'Invalid symbol format' }, // Control char
        { input: '\n', expectedError: 'Invalid symbol format' }  // Control char
      ];

      invalidWithMessage.forEach(({ input, expectedError }) => {
        const result = validateSymbol(input as any);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should reject symbols with spaces', () => {
      const result = validateSymbol('AAPL MSFT');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid symbol format');
    });

    it('should reject symbols longer than 10 characters', () => {
      const result = validateSymbol('VERYLONGSYMBOL123');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid symbol format');
    });

    it('should normalize to uppercase', () => {
      const result = validateSymbol('aapl');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('AAPL');
    });

    it('should trim whitespace', () => {
      const result = validateSymbol('  AAPL  ');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('AAPL');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null safely', () => {
      const result = validateSymbol(null as any);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Symbol must be a string');
    });

    it('should handle undefined safely', () => {
      const result = validateSymbol(undefined as any);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Symbol must be a string');
    });

    it('should handle numbers safely', () => {
      const result = validateSymbol(123 as any);
      expect(result.valid).toBe(false);
    });

    it('should handle objects safely', () => {
      const result = validateSymbol({ symbol: 'AAPL' } as any);
      expect(result.valid).toBe(false);
    });

    it('should handle arrays safely', () => {
      const result = validateSymbol(['AAPL'] as any);
      expect(result.valid).toBe(false);
    });
  });

  describe('Performance', () => {
    it('should validate 1000 symbols in under 100ms', () => {
      const start = Date.now();

      for (let i = 0; i < 1000; i++) {
        validateSymbol('AAPL');
      }

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100);
    });

    it('should not block on malicious input', () => {
      const malicious = 'A'.repeat(10000); // Very long string
      const start = Date.now();

      const result = validateSymbol(malicious);

      const duration = Date.now() - start;
      expect(result.valid).toBe(false);
      expect(duration).toBeLessThan(10); // Should fail fast
    });
  });
});
