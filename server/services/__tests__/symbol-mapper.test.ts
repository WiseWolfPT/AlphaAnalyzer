/**
 * Symbol Mapper Service Tests
 *
 * Tests for exchange suffix normalization and symbol mapping
 */

import { SymbolMapperService } from '../symbol-mapper-service';

describe('SymbolMapperService', () => {
  let mapper: SymbolMapperService;

  beforeEach(() => {
    mapper = new SymbolMapperService();
  });

  describe('normalizeFmpSymbol', () => {
    test('should normalize Portuguese stocks (hyphen to dot)', () => {
      expect(mapper.normalizeFmpSymbol('JMT-LS')).toBe('JMT.LS');
      expect(mapper.normalizeFmpSymbol('EDP-LS')).toBe('EDP.LS');
      expect(mapper.normalizeFmpSymbol('GALP-LS')).toBe('GALP.LS');
      expect(mapper.normalizeFmpSymbol('NOS-LS')).toBe('NOS.LS');
      expect(mapper.normalizeFmpSymbol('ALTRI-LS')).toBe('ALTRI.LS');
    });

    test('should normalize London stocks', () => {
      expect(mapper.normalizeFmpSymbol('BP-L')).toBe('BP.L');
      expect(mapper.normalizeFmpSymbol('HSBA-L')).toBe('HSBA.L');
      expect(mapper.normalizeFmpSymbol('ULVR-L')).toBe('ULVR.L');
    });

    test('should normalize Paris stocks', () => {
      expect(mapper.normalizeFmpSymbol('MC-PA')).toBe('MC.PA');
      expect(mapper.normalizeFmpSymbol('OR-PA')).toBe('OR.PA');
      expect(mapper.normalizeFmpSymbol('SAN-PA')).toBe('SAN.PA');
    });

    test('should normalize German stocks', () => {
      expect(mapper.normalizeFmpSymbol('SAP-DE')).toBe('SAP.DE');
      expect(mapper.normalizeFmpSymbol('SIE-DE')).toBe('SIE.DE');
      expect(mapper.normalizeFmpSymbol('VOW3-DE')).toBe('VOW3.DE');
    });

    test('should normalize Swiss stocks', () => {
      expect(mapper.normalizeFmpSymbol('NESN-SW')).toBe('NESN.SW');
      expect(mapper.normalizeFmpSymbol('ROG-SW')).toBe('ROG.SW');
      expect(mapper.normalizeFmpSymbol('NOVN-SW')).toBe('NOVN.SW');
    });

    test('should handle US stocks without modification', () => {
      expect(mapper.normalizeFmpSymbol('AAPL')).toBe('AAPL');
      expect(mapper.normalizeFmpSymbol('MSFT')).toBe('MSFT');
      expect(mapper.normalizeFmpSymbol('GOOGL')).toBe('GOOGL');
      expect(mapper.normalizeFmpSymbol('AMZN')).toBe('AMZN');
    });

    test('should handle already normalized symbols (dot notation)', () => {
      expect(mapper.normalizeFmpSymbol('JMT.LS')).toBe('JMT.LS');
      expect(mapper.normalizeFmpSymbol('BP.L')).toBe('BP.L');
      expect(mapper.normalizeFmpSymbol('SAP.DE')).toBe('SAP.DE');
    });

    test('should handle empty/invalid symbols gracefully', () => {
      expect(mapper.normalizeFmpSymbol('')).toBe('');
      expect(mapper.normalizeFmpSymbol('INVALID-XX')).toBe('INVALID-XX');
    });

    test('should handle numeric tickers', () => {
      expect(mapper.normalizeFmpSymbol('VOW3-DE')).toBe('VOW3.DE');
      expect(mapper.normalizeFmpSymbol('600519-SS')).toBe('600519-SS'); // Chinese stock (not supported)
    });
  });

  describe('getAlternativeSymbols', () => {
    test('should provide alternatives for Portuguese stocks', () => {
      const alternatives = mapper.getAlternativeSymbols('JMT-LS');
      expect(alternatives).toContain('JMT.LS');
      expect(alternatives).toContain('JMT');
      expect(alternatives.length).toBeGreaterThanOrEqual(2);
    });

    test('should provide alternatives for German stocks (with Frankfurt fallback)', () => {
      const alternatives = mapper.getAlternativeSymbols('SAP-DE');
      expect(alternatives).toContain('SAP.DE');
      expect(alternatives).toContain('SAP.F'); // Frankfurt alternative
    });

    test('should return single symbol for US stocks (no alternatives)', () => {
      const alternatives = mapper.getAlternativeSymbols('AAPL');
      expect(alternatives).toEqual(['AAPL']);
    });

    test('should not include duplicates', () => {
      const alternatives = mapper.getAlternativeSymbols('JMT-LS');
      const uniqueAlternatives = [...new Set(alternatives)];
      expect(alternatives.length).toBe(uniqueAlternatives.length);
    });

    test('should handle already normalized symbols', () => {
      const alternatives = mapper.getAlternativeSymbols('JMT.LS');
      expect(alternatives).toContain('JMT.LS');
      expect(alternatives).toContain('JMT');
    });
  });

  describe('getExchangeInfo', () => {
    test('should return exchange info for Portuguese stocks', () => {
      const info = mapper.getExchangeInfo('JMT-LS');
      expect(info).not.toBeNull();
      expect(info?.region).toBe('Portugal');
      expect(info?.currency).toBe('EUR');
      expect(info?.fmpSuffix).toBe('.LS');
    });

    test('should return exchange info for London stocks', () => {
      const info = mapper.getExchangeInfo('BP-L');
      expect(info).not.toBeNull();
      expect(info?.region).toBe('United Kingdom');
      expect(info?.currency).toBe('GBP');
    });

    test('should return null for US stocks', () => {
      const info = mapper.getExchangeInfo('AAPL');
      expect(info).toBeNull();
    });

    test('should return null for unknown exchanges', () => {
      const info = mapper.getExchangeInfo('INVALID-XX');
      expect(info).toBeNull();
    });

    test('should handle dot notation symbols', () => {
      const info = mapper.getExchangeInfo('JMT.LS');
      expect(info).not.toBeNull();
      expect(info?.region).toBe('Portugal');
    });
  });

  describe('isUsStock', () => {
    test('should identify US stocks', () => {
      expect(mapper.isUsStock('AAPL')).toBe(true);
      expect(mapper.isUsStock('MSFT')).toBe(true);
      expect(mapper.isUsStock('GOOGL')).toBe(true);
    });

    test('should reject European stocks', () => {
      expect(mapper.isUsStock('JMT-LS')).toBe(false);
      expect(mapper.isUsStock('JMT.LS')).toBe(false);
      expect(mapper.isUsStock('BP-L')).toBe(false);
      expect(mapper.isUsStock('SAP.DE')).toBe(false);
    });
  });

  describe('getDisplaySymbol', () => {
    test('should convert dot notation to hyphen for display', () => {
      expect(mapper.getDisplaySymbol('JMT.LS')).toBe('JMT-LS');
      expect(mapper.getDisplaySymbol('BP.L')).toBe('BP-L');
      expect(mapper.getDisplaySymbol('SAP.DE')).toBe('SAP-DE');
    });

    test('should keep US stocks unchanged', () => {
      expect(mapper.getDisplaySymbol('AAPL')).toBe('AAPL');
      expect(mapper.getDisplaySymbol('MSFT')).toBe('MSFT');
    });

    test('should handle already hyphenated symbols', () => {
      expect(mapper.getDisplaySymbol('JMT-LS')).toBe('JMT-LS');
    });
  });

  describe('Edge Cases', () => {
    test('should handle lowercase input gracefully', () => {
      // Note: normalizeFmpSymbol doesn't auto-uppercase
      // Frontend should uppercase before calling backend
      expect(mapper.normalizeFmpSymbol('jmt-ls')).toBe('jmt-ls');
    });

    test('should handle mixed case input', () => {
      expect(mapper.normalizeFmpSymbol('JmT-Ls')).toBe('JmT-Ls');
    });

    test('should handle symbols with numbers', () => {
      expect(mapper.normalizeFmpSymbol('VOW3-DE')).toBe('VOW3.DE');
      expect(mapper.normalizeFmpSymbol('NESN-SW')).toBe('NESN.SW');
    });

    test('should handle very long tickers', () => {
      expect(mapper.normalizeFmpSymbol('VERYLONGTICKER-LS')).toBe('VERYLONGTICKER.LS');
    });

    test('should handle special characters (reject gracefully)', () => {
      expect(mapper.normalizeFmpSymbol('JMT@LS')).toBe('JMT@LS'); // Invalid format, unchanged
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle batch normalization', () => {
      const symbols = ['JMT-LS', 'EDP-LS', 'AAPL', 'MSFT', 'BP-L'];
      const normalized = symbols.map(s => mapper.normalizeFmpSymbol(s));

      expect(normalized).toEqual(['JMT.LS', 'EDP.LS', 'AAPL', 'MSFT', 'BP.L']);
    });

    test('should handle round-trip conversion', () => {
      const original = 'JMT-LS';
      const normalized = mapper.normalizeFmpSymbol(original);
      const display = mapper.getDisplaySymbol(normalized);

      expect(display).toBe(original);
    });

    test('should provide consistent alternatives ordering', () => {
      const alternatives1 = mapper.getAlternativeSymbols('JMT-LS');
      const alternatives2 = mapper.getAlternativeSymbols('JMT-LS');

      expect(alternatives1).toEqual(alternatives2);
    });
  });

  describe('Performance', () => {
    test('should handle large batches efficiently', () => {
      const symbols = Array.from({ length: 1000 }, (_, i) =>
        i % 2 === 0 ? `STOCK${i}-LS` : `STOCK${i}`
      );

      const start = Date.now();
      symbols.forEach(s => mapper.normalizeFmpSymbol(s));
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100); // Should complete in <100ms
    });
  });
});
