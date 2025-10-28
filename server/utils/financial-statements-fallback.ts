/**
 * Financial Statements Fallback System - Sub-Fase 3A
 *
 * Implements Annual → Quarterly → TTM cascade for stocks without annual data.
 *
 * Strategy:
 * 1. Try annual statements first (most reliable, audited)
 * 2. If null/empty, fetch quarterly statements
 * 3. Sum last 4 quarters to get TTM (Trailing Twelve Months) equivalent
 * 4. Return normalized data structure compatible with existing valuation code
 *
 * Critical Rules:
 * - Income Statement: Sum 4 quarters (revenue, expenses, net income)
 * - Balance Sheet: Use MOST RECENT quarter only (point-in-time snapshot)
 * - Cash Flow: Sum 4 quarters (operating CF, capex, FCF)
 * - Handle missing quarters gracefully (min 2 quarters required)
 * - Log when fallback is used for monitoring
 */

import axios from 'axios';
import { logger } from '../lib/logger';

const FMP_BASE_URL = 'https://financialmodelingprep.com';
const FMP_API_KEY = process.env.FMP_API_KEY || '';

/**
 * Statement type enum
 */
export type StatementType = 'income' | 'balance' | 'cashflow';

/**
 * Generic financial statement structure (normalized)
 */
export interface FinancialStatement {
  date: string;
  symbol: string;
  period: 'annual' | 'quarterly' | 'ttm';
  reportedCurrency: string;
  calendarYear: string;

  // Income Statement Fields
  revenue?: number;
  netIncome?: number;
  operatingIncome?: number;
  ebitda?: number;
  eps?: number;
  epsdiluted?: number;
  weightedAverageShsOut?: number;
  weightedAverageShsOutDil?: number;

  // Balance Sheet Fields
  totalAssets?: number;
  totalLiabilities?: number;
  totalDebt?: number;
  netDebt?: number;
  cashAndCashEquivalents?: number;
  shortTermInvestments?: number;
  totalEquity?: number;
  commonStockSharesOutstanding?: number;
  intangibleAssets?: number;
  goodwill?: number;

  // Cash Flow Statement Fields
  operatingCashFlow?: number;
  capitalExpenditure?: number;
  freeCashFlow?: number;

  // Metadata
  source: 'annual' | 'quarterly-ttm';
  quartersUsed?: number;  // For TTM calculations
}

/**
 * Helper: Make FMP API request with error handling
 */
async function fmpGet<T>(endpoint: string, params: Record<string, any> = {}): Promise<T | null> {
  try {
    const url = new URL(endpoint, FMP_BASE_URL);
    url.searchParams.append('apikey', FMP_API_KEY);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    }

    logger.debug(`[FinancialStatementsFallback] FMP API call: ${endpoint}`);
    const response = await axios.get<T>(url.toString(), {
      timeout: 10000,
      headers: {
        'Accept-Encoding': 'gzip',
      },
    });

    return response.data;
  } catch (error: any) {
    logger.error(`[FinancialStatementsFallback] FMP API error (${endpoint}): ${error.message}`);
    return null;
  }
}

/**
 * Fetch annual financial statements (Tier 1)
 */
async function fetchAnnualStatement(
  symbol: string,
  statementType: StatementType,
  limit: number = 5
): Promise<FinancialStatement | null> {
  const endpoints: Record<StatementType, string> = {
    income: `/api/v3/income-statement/${symbol}`,
    balance: `/api/v3/balance-sheet-statement/${symbol}`,
    cashflow: `/api/v3/cash-flow-statement/${symbol}`,
  };

  const endpoint = endpoints[statementType];
  const data = await fmpGet<any[]>(endpoint, { period: 'annual', limit });

  if (!data || !Array.isArray(data) || data.length === 0) {
    logger.info(`[FinancialStatementsFallback] ${symbol}: No annual ${statementType} data available`);
    return null;
  }

  // Take most recent annual statement
  const latest = data[0];

  // Validate critical fields based on statement type
  const isValid = validateStatement(latest, statementType);
  if (!isValid) {
    logger.warn(`[FinancialStatementsFallback] ${symbol}: Annual ${statementType} data invalid (missing critical fields)`);
    return null;
  }

  logger.info(`[FinancialStatementsFallback] ${symbol}: Annual ${statementType} data found (${latest.date})`);

  return {
    ...latest,
    period: 'annual' as const,
    source: 'annual' as const,
  };
}

/**
 * Fetch quarterly financial statements (Tier 2)
 */
async function fetchQuarterlyStatements(
  symbol: string,
  statementType: StatementType,
  limit: number = 4
): Promise<any[] | null> {
  const endpoints: Record<StatementType, string> = {
    income: `/api/v3/income-statement/${symbol}`,
    balance: `/api/v3/balance-sheet-statement/${symbol}`,
    cashflow: `/api/v3/cash-flow-statement/${symbol}`,
  };

  const endpoint = endpoints[statementType];
  const data = await fmpGet<any[]>(endpoint, { period: 'quarter', limit });

  if (!data || !Array.isArray(data) || data.length < 2) {
    logger.info(`[FinancialStatementsFallback] ${symbol}: Insufficient quarterly ${statementType} data (need 2+, got ${data?.length || 0})`);
    return null;
  }

  logger.info(`[FinancialStatementsFallback] ${symbol}: Quarterly ${statementType} data found (${data.length} quarters)`);
  return data;
}

/**
 * Validate statement has critical fields
 */
function validateStatement(statement: any, type: StatementType): boolean {
  if (!statement || typeof statement !== 'object') return false;

  switch (type) {
    case 'income':
      // Must have revenue OR netIncome
      return (statement.revenue != null && statement.revenue !== 0) ||
             (statement.netIncome != null);

    case 'balance':
      // Must have totalAssets OR totalEquity
      return (statement.totalAssets != null && statement.totalAssets !== 0) ||
             (statement.totalEquity != null);

    case 'cashflow':
      // Must have operatingCashFlow OR freeCashFlow
      return (statement.operatingCashFlow != null) ||
             (statement.freeCashFlow != null);

    default:
      return false;
  }
}

/**
 * Convert quarterly statements to TTM (Trailing Twelve Months)
 *
 * Rules:
 * - Income Statement: Sum last 4 quarters (cumulative)
 * - Balance Sheet: Use most recent quarter only (point-in-time)
 * - Cash Flow: Sum last 4 quarters (cumulative)
 */
function convertQuarterlyToTTM(
  quarters: any[],
  statementType: StatementType
): FinancialStatement {
  if (quarters.length === 0) {
    throw new Error('[FinancialStatementsFallback] Cannot convert empty quarters to TTM');
  }

  const mostRecent = quarters[0];

  // Balance sheet: Use most recent quarter only (snapshot)
  if (statementType === 'balance') {
    logger.info(`[FinancialStatementsFallback] ${mostRecent.symbol}: Balance sheet TTM = most recent quarter (${mostRecent.date})`);
    return {
      ...mostRecent,
      period: 'ttm' as const,
      source: 'quarterly-ttm' as const,
      quartersUsed: 1,
    };
  }

  // Income/Cash Flow: Sum quarters (use as many as available, up to 4)
  const quartersToSum = quarters.slice(0, Math.min(4, quarters.length));
  const summedFields: Record<string, number> = {};

  // Fields to sum for income statement
  const incomeFields = [
    'revenue',
    'netIncome',
    'operatingIncome',
    'ebitda',
    'costOfRevenue',
    'grossProfit',
    'operatingExpenses',
    'interestExpense',
    'incomeTaxExpense',
  ];

  // Fields to sum for cash flow statement
  const cashflowFields = [
    'operatingCashFlow',
    'capitalExpenditure',
    'freeCashFlow',
    'netCashProvidedByOperatingActivities',
    'netCashUsedForInvestingActivites',
    'netCashUsedProvidedByFinancingActivities',
  ];

  const fieldsToSum = statementType === 'income' ? incomeFields : cashflowFields;

  // Sum each field across quarters
  for (const field of fieldsToSum) {
    const values = quartersToSum
      .map(q => Number(q[field]))
      .filter(v => isFinite(v));

    if (values.length > 0) {
      summedFields[field] = values.reduce((sum, v) => sum + v, 0);
    }
  }

  // Handle shares: Take weighted average (most recent quarter is most reliable)
  const sharesFields = ['weightedAverageShsOut', 'weightedAverageShsOutDil', 'commonStockSharesOutstanding'];
  for (const field of sharesFields) {
    if (mostRecent[field] != null) {
      summedFields[field] = Number(mostRecent[field]);
    }
  }

  // Calculate EPS if we have net income and shares
  if (summedFields.netIncome != null && summedFields.weightedAverageShsOutDil != null && summedFields.weightedAverageShsOutDil > 0) {
    summedFields.epsdiluted = summedFields.netIncome / summedFields.weightedAverageShsOutDil;
  }
  if (summedFields.netIncome != null && summedFields.weightedAverageShsOut != null && summedFields.weightedAverageShsOut > 0) {
    summedFields.eps = summedFields.netIncome / summedFields.weightedAverageShsOut;
  }

  logger.info(`[FinancialStatementsFallback] ${mostRecent.symbol}: ${statementType} TTM calculated from ${quartersToSum.length} quarters`);

  return {
    date: mostRecent.date,
    symbol: mostRecent.symbol,
    period: 'ttm' as const,
    reportedCurrency: mostRecent.reportedCurrency || 'USD',
    calendarYear: mostRecent.calendarYear || new Date(mostRecent.date).getFullYear().toString(),
    source: 'quarterly-ttm' as const,
    quartersUsed: quartersToSum.length,
    ...summedFields,
  };
}

/**
 * Main function: Fetch financial statements with Annual → Quarterly → TTM fallback
 *
 * @param symbol Stock ticker symbol
 * @param statementType Type of statement ('income', 'balance', 'cashflow')
 * @returns FinancialStatement or null if all sources fail
 *
 * @example
 * // Typical usage in valuation-service.ts
 * const income = await fetchFinancialStatementsWithFallback('AAPL', 'income');
 * if (income) {
 *   const netIncome = income.netIncome;
 *   const isFromQuarterly = income.source === 'quarterly-ttm';
 * }
 */
export async function fetchFinancialStatementsWithFallback(
  symbol: string,
  statementType: StatementType
): Promise<FinancialStatement | null> {
  const upperSymbol = symbol.toUpperCase();

  logger.info(`[FinancialStatementsFallback] ${upperSymbol}: Starting ${statementType} cascade (Annual → Quarterly → TTM)`);

  // Tier 1: Try annual statements first (most reliable)
  const annual = await fetchAnnualStatement(upperSymbol, statementType);
  if (annual) {
    logger.info(`[FinancialStatementsFallback] ${upperSymbol}: ✅ Annual ${statementType} data available (source: annual)`);
    return annual;
  }

  // Tier 2: Fallback to quarterly statements
  logger.info(`[FinancialStatementsFallback] ${upperSymbol}: Annual ${statementType} unavailable, trying quarterly...`);
  const quarterly = await fetchQuarterlyStatements(upperSymbol, statementType);

  if (!quarterly || quarterly.length < 2) {
    logger.warn(`[FinancialStatementsFallback] ${upperSymbol}: ❌ No ${statementType} data available (annual: null, quarterly: ${quarterly?.length || 0})`);
    return null;
  }

  // Tier 3: Convert quarterly to TTM
  try {
    const ttm = convertQuarterlyToTTM(quarterly, statementType);
    logger.info(`[FinancialStatementsFallback] ${upperSymbol}: ✅ ${statementType} TTM calculated from ${ttm.quartersUsed} quarters (source: quarterly-ttm)`);
    return ttm;
  } catch (error: any) {
    logger.error(`[FinancialStatementsFallback] ${upperSymbol}: ❌ TTM conversion failed: ${error.message}`);
    return null;
  }
}

/**
 * Batch fetch multiple statement types with fallback
 * Useful for comprehensive data collection in one call
 *
 * @example
 * const statements = await fetchAllStatementsWithFallback('AAPL');
 * console.log(statements.income?.revenue);
 * console.log(statements.balance?.totalDebt);
 * console.log(statements.cashflow?.freeCashFlow);
 */
export async function fetchAllStatementsWithFallback(symbol: string): Promise<{
  income: FinancialStatement | null;
  balance: FinancialStatement | null;
  cashflow: FinancialStatement | null;
}> {
  logger.info(`[FinancialStatementsFallback] ${symbol}: Batch fetching all statements with fallback`);

  const [income, balance, cashflow] = await Promise.all([
    fetchFinancialStatementsWithFallback(symbol, 'income'),
    fetchFinancialStatementsWithFallback(symbol, 'balance'),
    fetchFinancialStatementsWithFallback(symbol, 'cashflow'),
  ]);

  const summary = {
    income: income ? `${income.source} (${income.date})` : 'unavailable',
    balance: balance ? `${balance.source} (${balance.date})` : 'unavailable',
    cashflow: cashflow ? `${cashflow.source} (${cashflow.date})` : 'unavailable',
  };

  logger.info(`[FinancialStatementsFallback] ${symbol}: Batch fetch complete:`, summary);

  return { income, balance, cashflow };
}

/**
 * Get statement data quality metadata
 * Useful for determining confidence levels in valuation
 */
export function getStatementQuality(statement: FinancialStatement | null): {
  hasData: boolean;
  source: 'annual' | 'quarterly-ttm' | 'none';
  confidence: 'HIGH' | 'MED' | 'LOW';
  quartersUsed?: number;
} {
  if (!statement) {
    return {
      hasData: false,
      source: 'none',
      confidence: 'LOW',
    };
  }

  if (statement.source === 'annual') {
    return {
      hasData: true,
      source: 'annual',
      confidence: 'HIGH',
    };
  }

  // Quarterly TTM - confidence depends on quarters used
  const quartersUsed = statement.quartersUsed || 0;
  let confidence: 'HIGH' | 'MED' | 'LOW' = 'MED';

  if (quartersUsed === 4) {
    confidence = 'HIGH';  // Full year TTM is reliable
  } else if (quartersUsed >= 2) {
    confidence = 'MED';   // Partial year is less reliable
  } else {
    confidence = 'LOW';   // Single quarter is not ideal
  }

  return {
    hasData: true,
    source: 'quarterly-ttm',
    confidence,
    quartersUsed,
  };
}
