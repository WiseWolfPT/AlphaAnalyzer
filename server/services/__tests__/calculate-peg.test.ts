import { describe, it, expect, beforeAll } from 'vitest';
import type { PEGValuationResponse } from '../../types/valuation';
import { ValuationService } from '../valuation-service';

describe('calculatePEG() Refactor - TDD', () => {
  let valuationService: ValuationService;

  beforeAll(() => {
    valuationService = new ValuationService();
  });

  it('should return PEGValuationResponse object, not primitive number', async () => {
    const result = await valuationService.calculatePEG('AAPL');

    // Should be object, not number
    expect(typeof result).toBe('object');
    expect(result).not.toBeNull();
  });

  it('should include all required fields', async () => {
    const result = await valuationService.calculatePEG('AAPL');

    expect(result).toHaveProperty('ticker', 'AAPL');
    expect(result).toHaveProperty('iv');
    expect(result).toHaveProperty('currentPrice');
    expect(result).toHaveProperty('epsWithoutNRI');
    expect(result).toHaveProperty('peWithoutNRI');
    expect(result).toHaveProperty('epsGrowthRate');
    expect(result).toHaveProperty('pegRatio');
    expect(result).toHaveProperty('fairPegRatio', 1.5);
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('as_of');
  });

  it('should calculate IV correctly (matches old formula)', async () => {
    const result = await valuationService.calculatePEG('AAPL');

    // IV should be: Fair PEG (1.5) * (Growth Rate * 100) * EPS
    const expectedIV = 1.5 * (result.epsGrowthRate * 100) * result.epsWithoutNRI;
    expect(result.iv).toBeCloseTo(expectedIV, 2);
  });

  it('should have PE ratio = currentPrice / epsWithoutNRI', async () => {
    const result = await valuationService.calculatePEG('AAPL');

    const expectedPE = result.currentPrice / result.epsWithoutNRI;
    expect(result.peWithoutNRI).toBeCloseTo(expectedPE, 2);
  });

  it('should have PEG ratio = PE / (Growth * 100)', async () => {
    const result = await valuationService.calculatePEG('AAPL');

    const expectedPEG = result.peWithoutNRI / (result.epsGrowthRate * 100);
    expect(result.pegRatio).toBeCloseTo(expectedPEG, 2);
  });

  it('should return null for invalid ticker', async () => {
    const result = await valuationService.calculatePEG('INVALID_TICKER_XYZ');
    expect(result).toBeNull();
  });

  it('should have confidence level', async () => {
    const result = await valuationService.calculatePEG('AAPL');

    expect(['LOW', 'MED', 'HIGH']).toContain(result?.confidence);
  });

  it('should have valid as_of date format (YYYY-MM-DD)', async () => {
    const result = await valuationService.calculatePEG('AAPL');

    expect(result?.as_of).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
