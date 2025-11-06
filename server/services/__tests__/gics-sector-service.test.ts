/**
 * AGENT 16: GICS Sector Service Tests
 *
 * Test suite for GICSSectorService functionality.
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { GICSSectorService } from '../gics-sector-service';
import { Sector } from '../../../shared/types/sectors';

describe('GICSSectorService', () => {
  let service: GICSSectorService;

  beforeAll(async () => {
    service = new GICSSectorService();
    await service.initialize();
  });

  describe('initialization', () => {
    test('should initialize successfully', () => {
      expect(service.isInitialized()).toBe(true);
    });

    test('should have loaded stocks', () => {
      const totalCount = service.getTotalStockCount();
      expect(totalCount).toBeGreaterThan(0);
      console.log(`Total stocks loaded: ${totalCount}`);
    });
  });

  describe('sector mapping', () => {
    test('should have all 11 GICS sectors (excluding Other)', () => {
      const distribution = service.getSectorDistribution();
      const sectors = Object.keys(distribution).filter(s => s !== Sector.OTHER);

      // Should have 11 standard GICS sectors
      expect(sectors.length).toBeGreaterThanOrEqual(11);
    });

    test('should get sector for known tech stock', () => {
      const sector = service.getSectorForStock('AAPL');
      expect(sector).toBe(Sector.INFORMATION_TECHNOLOGY);
    });

    test('should get sector for known financial stock', () => {
      const sector = service.getSectorForStock('JPM');
      expect(sector).toBe(Sector.FINANCIALS);
    });

    test('should return Other for unknown stock', () => {
      const sector = service.getSectorForStock('UNKNOWNXYZ');
      expect(sector).toBe(Sector.OTHER);
    });
  });

  describe('stock retrieval', () => {
    test('should get stocks in Information Technology sector', () => {
      const stocks = service.getStocksBySector(Sector.INFORMATION_TECHNOLOGY);
      expect(stocks.length).toBeGreaterThan(0);
      expect(stocks).toContain('AAPL');
      expect(stocks).toContain('MSFT');
      console.log(`Tech sector stocks: ${stocks.length}`);
    });

    test('should get stocks in Financials sector', () => {
      const stocks = service.getStocksBySector(Sector.FINANCIALS);
      expect(stocks.length).toBeGreaterThan(0);
      expect(stocks).toContain('JPM');
      console.log(`Financials sector stocks: ${stocks.length}`);
    });

    test('should filter stocks that can calculate IV', () => {
      const allStocks = service.getStocksBySector(Sector.INFORMATION_TECHNOLOGY);
      const stocksWithIV = service.getStocksBySectorWithIV(Sector.INFORMATION_TECHNOLOGY);

      expect(stocksWithIV.length).toBeLessThanOrEqual(allStocks.length);
      console.log(`Tech stocks with IV: ${stocksWithIV.length}/${allStocks.length}`);
    });
  });

  describe('stock data', () => {
    test('should get full stock data for AAPL', () => {
      const data = service.getStockData('AAPL');
      expect(data).toBeDefined();
      expect(data?.symbol).toBe('AAPL');
      expect(data?.companyName).toBeTruthy();
      expect(data?.sector).toBe(Sector.INFORMATION_TECHNOLOGY);
    });

    test('should return undefined for unknown stock', () => {
      const data = service.getStockData('UNKNOWNXYZ');
      expect(data).toBeUndefined();
    });
  });

  describe('sector distribution', () => {
    test('should calculate sector distribution', () => {
      const distribution = service.getSectorDistribution();

      // Should have counts for all sectors
      expect(Object.keys(distribution).length).toBeGreaterThan(0);

      // All counts should be non-negative
      for (const [sector, count] of Object.entries(distribution)) {
        expect(count).toBeGreaterThanOrEqual(0);
      }

      console.log('Sector distribution:', distribution);
    });

    test('should have high-priority sectors', () => {
      const highPriority = service.getHighPrioritySectors();
      expect(highPriority).toContain(Sector.INFORMATION_TECHNOLOGY);
      expect(highPriority).toContain(Sector.COMMUNICATION_SERVICES);
      expect(highPriority).toContain(Sector.CONSUMER_DISCRETIONARY);
    });

    test('should have medium-priority sectors', () => {
      const mediumPriority = service.getMediumPrioritySectors();
      expect(mediumPriority).toContain(Sector.FINANCIALS);
      expect(mediumPriority).toContain(Sector.HEALTHCARE);
    });

    test('should have low-priority sectors', () => {
      const lowPriority = service.getLowPrioritySectors();
      expect(lowPriority).toContain(Sector.ENERGY);
      expect(lowPriority).toContain(Sector.UTILITIES);
    });
  });

  describe('stock existence checks', () => {
    test('should confirm AAPL exists', () => {
      expect(service.hasStock('AAPL')).toBe(true);
    });

    test('should confirm JPM exists', () => {
      expect(service.hasStock('JPM')).toBe(true);
    });

    test('should confirm unknown stock does not exist', () => {
      expect(service.hasStock('UNKNOWNXYZ')).toBe(false);
    });
  });

  describe('IV-capable stocks', () => {
    test('should get all stocks with IV capability', () => {
      const stocksWithIV = service.getStocksWithIV();
      expect(stocksWithIV.length).toBeGreaterThan(0);
      console.log(`Total stocks with IV: ${stocksWithIV.length}`);
    });
  });

  describe('sector statistics', () => {
    test('should calculate correct total stock count', () => {
      const totalCount = service.getTotalStockCount();
      const distribution = service.getSectorDistribution();

      const sumOfSectors = Object.values(distribution).reduce((sum, count) => sum + count, 0);
      expect(totalCount).toBe(sumOfSectors);
    });
  });
});
