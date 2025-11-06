/**
 * Quick Data Quality Sampler
 *
 * Analyzes 5 representative stocks to validate methodology
 * before running full 50-stock analysis.
 *
 * Uses minimal API calls to test scoring system.
 */

import axios from 'axios';

const FMP_API_KEY = process.env.FMP_API_KEY || '';
const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3';

// 5 representative stocks across market caps
const QUICK_SAMPLE = [
  { symbol: 'AAPL', category: 'Large Cap (Grade A Expected)' },
  { symbol: 'ROKU', category: 'Mid Cap (Grade B Expected)' },
  { symbol: 'CLOV', category: 'Small Cap (Grade C Expected)' },
  { symbol: 'O', category: 'REIT (Grade B Expected)' },
  { symbol: 'RIVN', category: 'Recent IPO (Grade D Expected)' }
];

interface QuickScore {
  symbol: string;
  category: string;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  details: {
    incomeStatementYears: number;
    balanceSheetYears: number;
    cashFlowYears: number;
    ratiosYears: number;
    hasDividends: boolean;
    dataAgeDays: number;
    currentPrice: number | null;
  };
  missingData: string[];
}

async function fetchQuickData(symbol: string): Promise<any> {
  console.log(`📡 Fetching data for ${symbol}...`);

  try {
    // Fetch sequentially with delays to respect 4 req/s limit
    const income = await axios.get(`${FMP_BASE_URL}/income-statement/${symbol}?limit=5&apikey=${FMP_API_KEY}`);
    await new Promise(resolve => setTimeout(resolve, 300)); // 250ms delay

    const balance = await axios.get(`${FMP_BASE_URL}/balance-sheet-statement/${symbol}?limit=5&apikey=${FMP_API_KEY}`);
    await new Promise(resolve => setTimeout(resolve, 300));

    const cash = await axios.get(`${FMP_BASE_URL}/cash-flow-statement/${symbol}?limit=5&apikey=${FMP_API_KEY}`);
    await new Promise(resolve => setTimeout(resolve, 300));

    const ratios = await axios.get(`${FMP_BASE_URL}/ratios/${symbol}?limit=5&apikey=${FMP_API_KEY}`);
    await new Promise(resolve => setTimeout(resolve, 300));

    const profile = await axios.get(`${FMP_BASE_URL}/profile/${symbol}?apikey=${FMP_API_KEY}`);

    return {
      incomeStatement: income.data,
      balanceSheet: balance.data,
      cashFlow: cash.data,
      ratios: ratios.data,
      profile: profile.data?.[0] || null
    };
  } catch (error: any) {
    console.error(`❌ Error fetching ${symbol}:`, error.message);
    return null;
  }
}

function scoreQuick(symbol: string, category: string, data: any): QuickScore {
  let score = 0;
  const missingData: string[] = [];

  // Financial Statements (30 pts)
  const incomeYears = data.incomeStatement?.length || 0;
  const balanceYears = data.balanceSheet?.length || 0;
  const cashYears = data.cashFlow?.length || 0;

  if (incomeYears >= 5) score += 10;
  else missingData.push(`Income Statement (${incomeYears}/5 years)`);

  if (balanceYears >= 5) score += 10;
  else missingData.push(`Balance Sheet (${balanceYears}/5 years)`);

  if (cashYears >= 5) score += 10;
  else missingData.push(`Cash Flow (${cashYears}/5 years)`);

  // Valuation Metrics (25 pts)
  const ratiosYears = data.ratios?.length || 0;
  if (ratiosYears >= 5) score += 25;
  else {
    score += Math.floor((ratiosYears / 5) * 25);
    missingData.push(`Ratios (${ratiosYears}/5 years)`);
  }

  // Company Profile (15 pts)
  if (data.profile?.sector) score += 5;
  else missingData.push('Sector');

  if (data.profile?.exchange) score += 5;
  else missingData.push('Exchange');

  if (data.profile?.mktCap > 0) score += 5;
  else missingData.push('Market Cap');

  // Dividend Data (15 pts)
  const hasDividends = data.profile?.lastDiv && data.profile.lastDiv > 0;
  if (hasDividends) score += 15;
  else missingData.push('Dividend Data');

  // Recent Data (15 pts)
  let dataAgeDays = 999;
  if (data.incomeStatement?.[0]?.date) {
    const latestDate = new Date(data.incomeStatement[0].date);
    dataAgeDays = Math.floor((Date.now() - latestDate.getTime()) / (1000 * 60 * 60 * 24));

    if (dataAgeDays < 90) score += 10;
    else if (dataAgeDays < 180) score += 5;
    else missingData.push(`Stale Data (${dataAgeDays} days)`);
  }

  if (data.profile?.price > 0) score += 5;
  else missingData.push('Current Price');

  // Grade
  let grade: 'A' | 'B' | 'C' | 'D' | 'F';
  if (score >= 90) grade = 'A';
  else if (score >= 75) grade = 'B';
  else if (score >= 60) grade = 'C';
  else if (score >= 45) grade = 'D';
  else grade = 'F';

  return {
    symbol,
    category,
    score,
    grade,
    details: {
      incomeStatementYears: incomeYears,
      balanceSheetYears: balanceYears,
      cashFlowYears: cashYears,
      ratiosYears,
      hasDividends,
      dataAgeDays,
      currentPrice: data.profile?.price || null
    },
    missingData
  };
}

async function runQuickSample() {
  console.log('🚀 Quick Data Quality Sampler\n');
  console.log('Testing 5 stocks to validate methodology...\n');
  console.log('='.repeat(80) + '\n');

  const results: QuickScore[] = [];

  for (let i = 0; i < QUICK_SAMPLE.length; i++) {
    const { symbol, category } = QUICK_SAMPLE[i];
    console.log(`[${i + 1}/5] Analyzing ${symbol} (${category})`);

    const data = await fetchQuickData(symbol);
    if (data) {
      const score = scoreQuick(symbol, category, data);
      results.push(score);

      console.log(`   Score: ${score.score}/100 (Grade: ${score.grade})`);
      console.log(`   Financial Statements: ${score.details.incomeStatementYears}/${score.details.balanceSheetYears}/${score.details.cashFlowYears} years`);
      console.log(`   Ratios: ${score.details.ratiosYears} years`);
      console.log(`   Dividends: ${score.details.hasDividends ? 'Yes' : 'No'}`);
      console.log(`   Data Age: ${score.details.dataAgeDays} days`);
      console.log(`   Missing: ${score.missingData.length} items\n`);
    }

    // Rate limiting: 2s between stocks
    if (i < QUICK_SAMPLE.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('='.repeat(80) + '\n');
  console.log('📊 QUICK SAMPLE RESULTS\n');

  console.log('| Symbol | Category | Score | Grade | Missing Data |');
  console.log('|--------|----------|-------|-------|--------------|');

  results.forEach(r => {
    console.log(`| ${r.symbol} | ${r.category} | ${r.score} | ${r.grade} | ${r.missingData.length} items |`);
  });

  console.log('\n✅ Validation Complete!\n');

  // Methodology check
  const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
  console.log(`Average Score: ${avgScore.toFixed(1)}/100`);

  const gradeDistribution = {
    A: results.filter(r => r.grade === 'A').length,
    B: results.filter(r => r.grade === 'B').length,
    C: results.filter(r => r.grade === 'C').length,
    D: results.filter(r => r.grade === 'D').length,
    F: results.filter(r => r.grade === 'F').length
  };

  console.log(`Grade Distribution: A=${gradeDistribution.A}, B=${gradeDistribution.B}, C=${gradeDistribution.C}, D=${gradeDistribution.D}, F=${gradeDistribution.F}\n`);

  console.log('📈 Next Steps:');
  console.log('1. Review scores vs expected grades');
  console.log('2. Adjust scoring weights if needed');
  console.log('3. Run full 50-stock analysis: npx tsx scripts/analysis/data-quality-analyzer.ts\n');

  return results;
}

runQuickSample()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
