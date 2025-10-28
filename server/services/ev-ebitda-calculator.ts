/**
 * AGENT 1E: EV/EBITDA Calculator
 *
 * Core calculation logic for EV/EBITDA valuation methods
 * Implements historical, sector, and forward methodologies
 */

import { EVEBITDAValuationResponse, ValuationConfidence } from '../types/valuation';
import { logger } from '../lib/logger';
import { isEVEBITDAApplicable, getSectorEVEBITDABenchmark } from './ev-ebitda-methods';

/**
 * Calculate EBITDA from income statement components
 * Formula: EBITDA = Net Income + Interest Expense + Taxes + Depreciation & Amortization
 */
export function calculateEBITDA(
  netIncome: number,
  interestExpense: number,
  taxes: number,
  depreciationAndAmortization: number
): number {
  return netIncome + Math.abs(interestExpense) + Math.abs(taxes) + Math.abs(depreciationAndAmortization);
}

/**
 * Calculate Enterprise Value
 * Formula: EV = Market Cap + Total Debt - Cash & Cash Equivalents
 */
export function calculateEnterpriseValue(
  marketCap: number,
  totalDebt: number,
  cash: number
): number {
  return marketCap + totalDebt - cash;
}

/**
 * Calculate mean EV/EBITDA ratio from historical data
 * Filters outliers (ratios outside 2-50x range)
 */
export function calculateMeanEVEBITDA(ratios: number[]): number | null {
  // Filter outliers (negative, zero, or extreme multiples)
  const filtered = ratios.filter(r => r > 2 && r < 50 && isFinite(r));

  if (filtered.length < 3) {
    return null; // Need at least 3 years of valid data
  }

  const sum = filtered.reduce((acc, val) => acc + val, 0);
  return sum / filtered.length;
}

/**
 * Calculate historical EV/EBITDA ratios for past 5 years
 * Requires historical income statement and balance sheet data
 */
export async function calculateHistoricalEVEBITDA(
  fmpGet: <T>(endpoint: string, params?: Record<string, any>) => Promise<T | null>,
  ticker: string,
  currentPrice: number,
  sharesOutstanding: number
): Promise<number[] | null> {
  try {
    // Fetch 5 years of income statements
    const incomeData = await fmpGet<any[]>(`/api/v3/income-statement/${ticker}`, {
      period: 'annual',
      limit: 5,
    });

    // Fetch 5 years of balance sheets
    const balanceSheetData = await fmpGet<any[]>(`/api/v3/balance-sheet-statement/${ticker}`, {
      period: 'annual',
      limit: 5,
    });

    // Fetch historical prices (to calculate market cap at each point)
    const historicalPrices = await fmpGet<any>(`/api/v3/historical-price-full/${ticker}`, {
      limit: 5 * 252, // ~5 years of trading days
    });

    if (!incomeData || !balanceSheetData || incomeData.length < 3 || balanceSheetData.length < 3) {
      return null;
    }

    const ratios: number[] = [];

    for (let i = 0; i < Math.min(incomeData.length, balanceSheetData.length); i++) {
      const income = incomeData[i];
      const balance = balanceSheetData.find((b: any) => b.date === income.date);

      if (!balance) continue;

      // Calculate EBITDA
      const netIncome = Number(income.netIncome || 0);
      const interestExpense = Number(income.interestExpense || 0);
      const taxes = Number(income.incomeTaxExpense || 0);
      const depAmort = Number(income.depreciationAndAmortization || 0);

      const ebitda = calculateEBITDA(netIncome, interestExpense, taxes, depAmort);

      if (ebitda <= 0) continue; // Skip negative EBITDA years

      // Calculate Enterprise Value
      // For historical EV, we need price at that date
      // Simplified: use current shares outstanding (assumes no major dilution)
      const date = income.date;
      let historicalPrice = currentPrice; // Fallback to current price

      if (historicalPrices && historicalPrices.historical) {
        const priceAtDate = historicalPrices.historical.find((p: any) =>
          p.date === date || p.date.startsWith(date.substring(0, 7)) // Match year-month
        );
        if (priceAtDate) {
          historicalPrice = Number(priceAtDate.close);
        }
      }

      const historicalMarketCap = historicalPrice * sharesOutstanding * 1_000_000; // Convert to USD
      const totalDebt = Number(balance.totalDebt || 0);
      const cash = Number(balance.cashAndCashEquivalents || 0) + Number(balance.shortTermInvestments || 0);

      const ev = calculateEnterpriseValue(historicalMarketCap, totalDebt, cash);
      const evEbitdaRatio = ev / (ebitda * 1_000_000); // Convert EBITDA to USD

      ratios.push(evEbitdaRatio);
    }

    return ratios.length >= 3 ? ratios : null;
  } catch (error: any) {
    logger.error(`[EVEBITDACalculator] Error calculating historical EV/EBITDA for ${ticker}:`, error.message);
    return null;
  }
}

/**
 * Main calculation function for EV/EBITDA valuation
 * Returns null if method not applicable (Financials, REITs, negative EBITDA)
 */
export function calculateEVEBITDAValuation(
  ticker: string,
  currentPrice: number,
  sector: string,
  enterpriseValue: number,
  ebitda: number,
  benchmarkEVEBITDA: number,
  benchmarkType: 'historical' | 'sector' | 'forward',
  marketCap: number,
  totalDebt: number,
  cash: number,
  sharesOutstanding: number,
  netIncome: number,
  interestExpense: number,
  taxes: number,
  depreciationAndAmortization: number,
  historicalEVEBITDA?: number[]
): EVEBITDAValuationResponse | null {
  // Check if EV/EBITDA is applicable
  if (!isEVEBITDAApplicable(sector)) {
    logger.warn(`[EVEBITDACalculator] EV/EBITDA not applicable for ${ticker} (sector: ${sector})`);
    return {
      ticker,
      iv: null,
      currentPrice,
      enterpriseValue,
      ebitda,
      currentEVEBITDA: 0,
      benchmarkEVEBITDA: 0,
      benchmarkType,
      sector,
      marketCap,
      totalDebt,
      cashAndEquivalents: cash,
      netIncome,
      interestExpense,
      taxes,
      depreciationAndAmortization,
      historicalEVEBITDA,
      confidence: 'LOW',
      error: 'NOT_APPLICABLE',
      message: `EV/EBITDA not applicable for ${sector}. Use P/TBV for Financials or FFO/AFFO for REITs.`,
      as_of: new Date().toISOString().split('T')[0],
    };
  }

  // Check for negative EBITDA
  if (ebitda <= 0) {
    logger.warn(`[EVEBITDACalculator] Negative EBITDA for ${ticker}: ${ebitda}`);
    return {
      ticker,
      iv: null,
      currentPrice,
      enterpriseValue,
      ebitda,
      currentEVEBITDA: 0,
      benchmarkEVEBITDA: 0,
      benchmarkType,
      sector,
      marketCap,
      totalDebt,
      cashAndEquivalents: cash,
      netIncome,
      interestExpense,
      taxes,
      depreciationAndAmortization,
      historicalEVEBITDA,
      confidence: 'LOW',
      error: 'NEGATIVE_EBITDA',
      message: 'EV/EBITDA not applicable for companies with negative EBITDA',
      as_of: new Date().toISOString().split('T')[0],
    };
  }

  // Calculate current EV/EBITDA ratio
  const currentEVEBITDA = enterpriseValue / (ebitda * 1_000_000);

  // Calculate implied intrinsic value using benchmark multiple
  // Formula: IV = (EBITDA × Benchmark_EV/EBITDA - Net Debt) / Shares
  const impliedEV = ebitda * 1_000_000 * benchmarkEVEBITDA;
  const netDebt = totalDebt - cash;
  const impliedMarketCap = impliedEV - netDebt;
  const intrinsicValue = impliedMarketCap / (sharesOutstanding * 1_000_000);

  // Validate IV
  if (!isFinite(intrinsicValue) || intrinsicValue <= 0) {
    logger.warn(`[EVEBITDACalculator] Invalid IV for ${ticker}: ${intrinsicValue}`);
    return {
      ticker,
      iv: null,
      currentPrice,
      enterpriseValue,
      ebitda,
      currentEVEBITDA,
      benchmarkEVEBITDA,
      benchmarkType,
      sector,
      marketCap,
      totalDebt,
      cashAndEquivalents: cash,
      netIncome,
      interestExpense,
      taxes,
      depreciationAndAmortization,
      historicalEVEBITDA,
      confidence: 'LOW',
      error: 'INVALID_CALCULATION',
      message: 'Valuation calculation resulted in invalid intrinsic value',
      as_of: new Date().toISOString().split('T')[0],
    };
  }

  // Determine confidence level
  let confidence: ValuationConfidence = 'MED'; // Default

  if (benchmarkType === 'historical' && historicalEVEBITDA && historicalEVEBITDA.length >= 5) {
    confidence = 'HIGH'; // High confidence with 5+ years of data
  } else if (benchmarkType === 'sector') {
    confidence = 'MED'; // Medium confidence with sector benchmark
  } else if (benchmarkType === 'forward') {
    confidence = 'HIGH'; // High confidence with analyst estimates
  }

  // Downgrade confidence if current EV/EBITDA is extreme outlier
  if (Math.abs(currentEVEBITDA - benchmarkEVEBITDA) / benchmarkEVEBITDA > 1.0) {
    // More than 100% deviation
    confidence = 'LOW';
  }

  logger.info(
    `[EVEBITDACalculator] ${ticker} (${benchmarkType}): ` +
    `EV=${(enterpriseValue / 1_000_000).toFixed(0)}M, ` +
    `EBITDA=${ebitda.toFixed(0)}M, ` +
    `Current=${currentEVEBITDA.toFixed(1)}x, ` +
    `Benchmark=${benchmarkEVEBITDA.toFixed(1)}x, ` +
    `IV=$${intrinsicValue.toFixed(2)}`
  );

  return {
    ticker,
    iv: intrinsicValue,
    currentPrice,
    enterpriseValue,
    ebitda,
    currentEVEBITDA,
    benchmarkEVEBITDA,
    benchmarkType,
    sector,
    marketCap,
    totalDebt,
    cashAndEquivalents: cash,
    netIncome,
    interestExpense,
    taxes,
    depreciationAndAmortization,
    historicalEVEBITDA,
    confidence,
    as_of: new Date().toISOString().split('T')[0],
  };
}
