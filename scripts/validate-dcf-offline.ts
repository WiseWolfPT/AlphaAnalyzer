/**
 * FASE 2 - Offline DCF Validation Script
 *
 * Valida precisão dos cálculos AlfaValue™ comparando:
 * - IV calculado manualmente (baseline formula)
 * - IV calculado pela engine (valuation-service.ts)
 *
 * Tickers validados: AAPL, MSFT, GOOGL, KO
 */

import axios from 'axios';

const FMP_BASE_URL = 'https://financialmodelingprep.com/api';
const FMP_API_KEY = process.env.FMP_API_KEY || '';

// Constants from valuation spec
const CLAMPS = {
  G_1_5: { min: 0.05, max: 0.30 },
  G_6_10: { min: 0.03, max: 0.20 },
  G_11_20: { min: 0.03, max: 0.05 },
  DR: { min: 0.05, max: 0.15 },
  BETA: { min: 0.5, max: 2.5 },
};

const DEFAULTS = {
  RF: 0.0425, // 4.25%
  MRP: 0.055, // 5.5%
  BETA: 1.0,
  G_TERM: { US: 0.04 }, // 4%
};

const SECTOR_GROWTH: Record<string, number> = {
  technology: 0.12,
  software: 0.14,
  healthcare: 0.08,
  financials: 0.06,
  'consumer cyclical': 0.07,
  'consumer defensive': 0.05,
  industrials: 0.06,
};

// Utility functions
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function calculateCAGR(values: number[]): number {
  if (values.length < 2) return 0;
  const startValue = values[0];
  const endValue = values[values.length - 1];
  if (startValue <= 0 || endValue <= 0) return 0;
  const years = values.length - 1;
  return Math.pow(endValue / startValue, 1 / years) - 1;
}

async function fmpGet(endpoint: string): Promise<any> {
  const separator = endpoint.includes('?') ? '&' : '?';
  const url = `${FMP_BASE_URL}${endpoint}${separator}apikey=${FMP_API_KEY}`;
  const response = await axios.get(url, { timeout: 10000 });
  return response.data;
}

interface TickerInputs {
  ticker: string;
  fcf_ttm: number; // Millions USD
  fcf_5y: number[]; // Millions USD
  cash: number; // Millions USD
  debt: number; // Millions USD
  shares: number; // Millions
  beta: number;
  industry: string;
  price: number;
}

interface ManualIVResult {
  ticker: string;
  iv_manual: number;
  inputs: TickerInputs;
  assumptions: {
    g_1_5: number;
    g_6_10: number;
    g_11_20: number;
    discount_rate: number;
    rf: number;
    mrp: number;
    g_sector_mid: number;
    g_term_region: number;
  };
  pv_fcf: number;
  equity_value: number;
}

async function fetchTickerInputs(ticker: string): Promise<TickerInputs | null> {
  try {
    console.log(`\n📊 Fetching data for ${ticker}...`);

    // Fetch profile
    const profileData = await fmpGet(`/v3/profile/${ticker}`);
    if (!profileData || !Array.isArray(profileData) || profileData.length === 0) {
      console.error(`❌ No profile data for ${ticker}`);
      return null;
    }
    const profile = profileData[0];

    // Fetch cash flow (last 5 years)
    const cashFlowData = await fmpGet(`/v3/cash-flow-statement/${ticker}?limit=5`);
    if (!cashFlowData || !Array.isArray(cashFlowData) || cashFlowData.length === 0) {
      console.error(`❌ No cash flow data for ${ticker}`);
      return null;
    }

    // Fetch balance sheet (latest)
    const balanceSheetData = await fmpGet(`/v3/balance-sheet-statement/${ticker}?limit=1`);
    if (!balanceSheetData || !Array.isArray(balanceSheetData) || balanceSheetData.length === 0) {
      console.error(`❌ No balance sheet data for ${ticker}`);
      return null;
    }

    // Extract inputs
    const fcf_5y = cashFlowData
      .map((stmt: any) => {
        const fcf = stmt.freeCashFlow || (stmt.operatingCashFlow || 0) - (stmt.capitalExpenditure || 0);
        return fcf / 1_000_000; // Convert to millions
      })
      .reverse(); // Order from oldest to newest

    const latestCashFlow = cashFlowData[0];
    const latestBalanceSheet = balanceSheetData[0];

    const fcf_ttm = (latestCashFlow.freeCashFlow ||
      (latestCashFlow.operatingCashFlow || 0) - (latestCashFlow.capitalExpenditure || 0)) / 1_000_000;

    const cash = ((latestBalanceSheet.cashAndCashEquivalents || 0) +
      (latestBalanceSheet.shortTermInvestments || 0)) / 1_000_000;

    const debt = (latestBalanceSheet.totalDebt || 0) / 1_000_000;

    // Fetch shares from quote endpoint (FMP balance sheet doesn't include shares)
    const quoteData = await fmpGet(`/v3/quote/${ticker}`);
    let shares = 0;
    if (quoteData && Array.isArray(quoteData) && quoteData[0]?.sharesOutstanding) {
      shares = quoteData[0].sharesOutstanding / 1_000_000;
    } else {
      // Fallback: estimate from market cap / price
      shares = profile.mktCap / profile.price / 1_000_000;
    }

    const beta = clamp(profile.beta || DEFAULTS.BETA, CLAMPS.BETA.min, CLAMPS.BETA.max);
    const industry = profile.industry || 'Unknown';
    const price = profile.price || 0;

    console.log(`✅ Data collected for ${ticker}`);
    console.log(`   FCF TTM: $${fcf_ttm.toFixed(2)}M`);
    console.log(`   FCF 5Y: [${fcf_5y.map(v => v.toFixed(0)).join(', ')}]M`);
    console.log(`   Cash: $${cash.toFixed(2)}M`);
    console.log(`   Debt: $${debt.toFixed(2)}M`);
    console.log(`   Shares: ${shares.toFixed(2)}M`);
    console.log(`   Beta: ${beta.toFixed(2)}`);
    console.log(`   Industry: ${industry}`);
    console.log(`   Price: $${price.toFixed(2)}`);

    return {
      ticker,
      fcf_ttm,
      fcf_5y,
      cash,
      debt,
      shares,
      beta,
      industry,
      price,
    };
  } catch (error: any) {
    console.error(`❌ Error fetching ${ticker}:`, error.message);
    return null;
  }
}

function calculateManualIV(inputs: TickerInputs, rf: number = DEFAULTS.RF, mrp: number = DEFAULTS.MRP): ManualIVResult {
  const { ticker, fcf_ttm, fcf_5y, cash, debt, shares, beta, industry } = inputs;

  // Step 1: Calculate g_1_5
  const g1_5_raw = calculateCAGR(fcf_5y);
  const g1_5 = clamp(g1_5_raw, CLAMPS.G_1_5.min, CLAMPS.G_1_5.max);

  // Step 2: Calculate g_sector_mid
  const industryLower = industry.toLowerCase();
  let g_sector_mid = 0.06; // Default 6%
  for (const [key, value] of Object.entries(SECTOR_GROWTH)) {
    if (industryLower.includes(key)) {
      g_sector_mid = value;
      break;
    }
  }

  // Step 3: Calculate g_6_10
  const decay = g1_5 < 0.08 ? 0.70 : 0.50;
  const g6_10 = clamp(
    0.6 * (g1_5 * decay) + 0.4 * g_sector_mid,
    CLAMPS.G_6_10.min,
    CLAMPS.G_6_10.max
  );

  // Step 4: Calculate g_11_20
  const g_term_region = DEFAULTS.G_TERM.US;
  const base = lerp(g6_10, g_term_region, 0.7);
  const g11_20 = clamp(
    base,
    Math.max(0.03, g_term_region - 0.01),
    Math.min(0.05, g_term_region + 0.01)
  );

  // Step 5: Calculate discount rate (CAPM)
  const dr = clamp(rf + beta * mrp, CLAMPS.DR.min, CLAMPS.DR.max);

  // Step 6: Project FCF (20 years, mid-year discounting)
  let pv_fcf = 0;
  let currentFCF = fcf_ttm;

  for (let year = 1; year <= 20; year++) {
    let growthRate: number;
    if (year <= 5) {
      growthRate = g1_5;
    } else if (year <= 10) {
      growthRate = g6_10;
    } else {
      growthRate = g11_20;
    }

    currentFCF *= (1 + growthRate);
    const discountFactor = Math.pow(1 + dr, year - 0.5); // Mid-year discounting
    pv_fcf += currentFCF / discountFactor;
  }

  // Step 7: Calculate equity value and IV
  const equity_value = pv_fcf + cash - debt;
  const iv_manual = equity_value / shares;

  return {
    ticker,
    iv_manual,
    inputs,
    assumptions: {
      g_1_5: g1_5,
      g_6_10: g6_10,
      g_11_20: g11_20,
      discount_rate: dr,
      rf,
      mrp,
      g_sector_mid,
      g_term_region,
    },
    pv_fcf,
    equity_value,
  };
}

async function fetchEngineIV(ticker: string): Promise<any | null> {
  try {
    // Try localhost first, fallback to production
    let url = `http://localhost:3001/api/market-data/iv/${ticker}/main`;

    try {
      const response = await axios.get(url, { timeout: 5000 });
      return response.data;
    } catch {
      // Fallback to production (requires API key)
      console.log(`⚠️  Localhost not available, skipping engine comparison`);
      return null;
    }
  } catch (error: any) {
    console.error(`❌ Error fetching engine IV for ${ticker}:`, error.message);
    return null;
  }
}

function generateReport(manualResult: ManualIVResult, engineResult: any | null): string {
  const { ticker, iv_manual, inputs, assumptions, pv_fcf, equity_value } = manualResult;

  let report = `\n${'='.repeat(80)}\n`;
  report += `### ${ticker} - Validação DCF\n`;
  report += `${'='.repeat(80)}\n`;

  // Inputs
  report += `\n**Inputs:**\n`;
  report += `- FCF TTM: $${inputs.fcf_ttm.toFixed(2)}M\n`;
  report += `- FCF 5Y: [${inputs.fcf_5y.map(v => v.toFixed(0)).join(', ')}]M\n`;
  report += `- FCF 5Y CAGR: ${(calculateCAGR(inputs.fcf_5y) * 100).toFixed(2)}%\n`;
  report += `- Cash: $${inputs.cash.toFixed(2)}M\n`;
  report += `- Debt: $${inputs.debt.toFixed(2)}M\n`;
  report += `- Shares: ${inputs.shares.toFixed(2)}M\n`;
  report += `- Beta: ${inputs.beta.toFixed(2)}\n`;
  report += `- Industry: ${inputs.industry}\n`;
  report += `- Current Price: $${inputs.price.toFixed(2)}\n`;

  // Assumptions (Manual)
  report += `\n**Assumptions (Manual Calculation):**\n`;
  report += `- g1_5: ${(assumptions.g_1_5 * 100).toFixed(2)}%\n`;
  report += `- g6_10: ${(assumptions.g_6_10 * 100).toFixed(2)}%\n`;
  report += `- g11_20: ${(assumptions.g_11_20 * 100).toFixed(2)}%\n`;
  report += `- DR: ${(assumptions.discount_rate * 100).toFixed(2)}%\n`;
  report += `- RF: ${(assumptions.rf * 100).toFixed(2)}%\n`;
  report += `- MRP: ${(assumptions.mrp * 100).toFixed(2)}%\n`;
  report += `- g_sector_mid: ${(assumptions.g_sector_mid * 100).toFixed(2)}%\n`;
  report += `- g_term_region: ${(assumptions.g_term_region * 100).toFixed(2)}%\n`;

  // Valuation
  report += `\n**Valuation (Manual):**\n`;
  report += `- PV of FCF (20y): $${pv_fcf.toFixed(2)}M\n`;
  report += `- Equity Value: $${equity_value.toFixed(2)}M\n`;
  report += `- IV (Manual): $${iv_manual.toFixed(2)}\n`;

  if (engineResult) {
    const iv_engine = engineResult.iv;
    const error_pct = Math.abs(iv_engine - iv_manual) / iv_manual * 100;

    report += `- IV (Engine): $${iv_engine.toFixed(2)}\n`;
    report += `- Erro: ${error_pct.toFixed(2)}%\n`;

    // Status
    const discount_pct = ((iv_manual - inputs.price) / inputs.price) * 100;
    let status = 'fair';
    if (discount_pct >= 5) status = 'undervalued';
    else if (discount_pct <= -5) status = 'overvalued';

    report += `- Discount vs Price: ${discount_pct.toFixed(2)}%\n`;
    report += `- Status: ${status}\n`;

    // Avaliação
    report += `\n**Avaliação:**\n`;
    if (error_pct <= 3) {
      report += `✅ Excelente - Erro ≤ 3%\n`;
    } else if (error_pct <= 10) {
      report += `⚠️  Aceitável - Erro entre 3-10% (verificar assumptions)\n`;
    } else {
      report += `🔴 Problema - Erro > 10% (investigar fórmulas)\n`;
    }

    // Red Flags
    const redFlags: string[] = [];
    if (assumptions.g_1_5 === CLAMPS.G_1_5.min || assumptions.g_1_5 === CLAMPS.G_1_5.max) {
      redFlags.push(`g1_5 no floor/ceiling (${(assumptions.g_1_5 * 100).toFixed(2)}%) → clamp forçado`);
    }
    if (assumptions.discount_rate === CLAMPS.DR.min || assumptions.discount_rate === CLAMPS.DR.max) {
      redFlags.push(`DR no min/max (${(assumptions.discount_rate * 100).toFixed(2)}%) → beta/RF/MRP extremos`);
    }
    if (inputs.fcf_ttm <= 0 || inputs.fcf_5y.some(v => v <= 0)) {
      redFlags.push('FCF negativo detectado → baixa confiabilidade do modelo DCF');
    }

    if (redFlags.length > 0) {
      report += `\n**Red Flags:**\n`;
      redFlags.forEach(flag => report += `- ${flag}\n`);
    }
  } else {
    const discount_pct = ((iv_manual - inputs.price) / inputs.price) * 100;
    let status = 'fair';
    if (discount_pct >= 5) status = 'undervalued';
    else if (discount_pct <= -5) status = 'overvalued';

    report += `- Discount vs Price: ${discount_pct.toFixed(2)}%\n`;
    report += `- Status: ${status}\n`;

    report += `\n**Avaliação:**\n`;
    report += `⚠️  Engine não disponível - apenas validação manual\n`;
  }

  report += `\n${'='.repeat(80)}\n`;
  return report;
}

async function main() {
  console.log('🚀 FASE 2 - Validação Offline de DCF (AlfaValue™)');
  console.log('Data: 2025-10-14\n');

  if (!FMP_API_KEY) {
    console.error('❌ FMP_API_KEY não encontrado em .env');
    process.exit(1);
  }

  const tickers = ['AAPL', 'MSFT', 'GOOGL', 'KO'];
  let fullReport = '';

  // Fetch market context (RF, MRP)
  console.log('📡 Fetching market context...');
  let rf = DEFAULTS.RF;
  let mrp = DEFAULTS.MRP;

  try {
    const treasuryData = await fmpGet('/stable/treasury-rates');
    if (treasuryData && Array.isArray(treasuryData) && treasuryData.length > 0) {
      rf = Number(treasuryData[0].year10) / 100;
      console.log(`✅ US 10Y Treasury (RF): ${(rf * 100).toFixed(2)}%`);
    }
  } catch (error) {
    console.log(`⚠️  Using default RF: ${(rf * 100).toFixed(2)}%`);
  }

  try {
    const mrpData = await fmpGet('/stable/market-risk-premium');
    if (mrpData && Array.isArray(mrpData)) {
      const us = mrpData.find((item: any) => item.country.includes('United States'));
      if (us?.totalEquityRiskPremium) {
        mrp = Number(us.totalEquityRiskPremium) / 100;
        console.log(`✅ Market Risk Premium: ${(mrp * 100).toFixed(2)}%`);
      }
    }
  } catch (error) {
    console.log(`⚠️  Using default MRP: ${(mrp * 100).toFixed(2)}%`);
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('Market Context:');
  console.log(`- US 10Y Treasury (RF): ${(rf * 100).toFixed(2)}%`);
  console.log(`- Market Risk Premium: ${(mrp * 100).toFixed(2)}%`);
  console.log(`- Terminal Growth (US): ${(DEFAULTS.G_TERM.US * 100).toFixed(2)}%`);
  console.log(`${'='.repeat(80)}\n`);

  // Process each ticker
  for (const ticker of tickers) {
    const inputs = await fetchTickerInputs(ticker);
    if (!inputs) {
      fullReport += `\n❌ ${ticker}: Failed to fetch inputs\n`;
      continue;
    }

    // Calculate manual IV
    const manualResult = calculateManualIV(inputs, rf, mrp);

    // Try to fetch engine IV
    const engineResult = await fetchEngineIV(ticker);

    // Generate report
    const report = generateReport(manualResult, engineResult);
    fullReport += report;

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Save full report
  const fs = await import('fs');
  const reportPath = '/Users/antoniofrancisco/Documents/teste 1/FASE2_DCF_VALIDATION_REPORT.md';
  fs.writeFileSync(reportPath, fullReport);
  console.log(`\n✅ Relatório completo salvo em: ${reportPath}`);
  console.log(fullReport);
}

main().catch(console.error);
