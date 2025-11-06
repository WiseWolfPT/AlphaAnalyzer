/**
 * Materials Deep Dive - Analyze WHY methods are failing
 */

import axios from 'axios';

const API_BASE = 'https://128.140.45.28.sslip.io';
const FMP_API_KEY = process.env.FMP_API_KEY || '';

// Test 3 representative Materials stocks
const TEST_STOCKS = ['LIN', 'APD', 'FCX'];

async function analyzeStock(ticker: string) {
  console.log('\n' + '='.repeat(80));
  console.log(`ANALYZING: ${ticker}`);
  console.log('='.repeat(80));

  // 1. Get IV chart response
  const ivResponse = await axios.get(`${API_BASE}/api/iv/${ticker}/chart`, {
    timeout: 30000,
    validateStatus: () => true,
  });

  if (ivResponse.status !== 200) {
    console.log(`❌ HTTP ${ivResponse.status}: ${ivResponse.data?.error || 'Unknown error'}`);
    return;
  }

  const ivData = ivResponse.data;
  console.log(`\n✅ HTTP 200 - ${ivData.methods?.length || 0} methods, ${ivData.failedMethods?.length || 0} failed`);

  // 2. Categorize failures
  console.log('\n📊 FAILURE BREAKDOWN:');
  console.log('-'.repeat(80));

  const failuresByReason = ivData.failedMethods?.reduce((acc: any, f: any) => {
    acc[f.reason] = acc[f.reason] || [];
    acc[f.reason].push(f.method_id);
    return acc;
  }, {});

  Object.entries(failuresByReason || {}).forEach(([reason, methods]: [string, any]) => {
    console.log(`\n${reason}:`);
    methods.forEach((m: string) => console.log(`  - ${m}`));
  });

  // 3. Fetch raw FMP data to verify
  console.log('\n\n🔍 RAW FMP DATA CHECK:');
  console.log('-'.repeat(80));

  try {
    // Check profile
    const profileUrl = `https://financialmodelingprep.com/api/v3/profile/${ticker}?apikey=${FMP_API_KEY}`;
    const profileRes = await axios.get(profileUrl, { timeout: 10000 });
    const profile = profileRes.data?.[0];
    console.log(`\n✅ Profile: sector=${profile?.sector}, industry=${profile?.industry}`);

    // Check financial statements (TTM)
    const incomeUrl = `https://financialmodelingprep.com/api/v3/income-statement/${ticker}?period=annual&limit=1&apikey=${FMP_API_KEY}`;
    const incomeRes = await axios.get(incomeUrl, { timeout: 10000 });
    const income = incomeRes.data?.[0];
    console.log(`\n💰 Income Statement:`);
    console.log(`   Net Income: ${income?.netIncome ? (income.netIncome / 1e6).toFixed(2) + 'M' : 'NULL'}`);
    console.log(`   Revenue: ${income?.revenue ? (income.revenue / 1e6).toFixed(2) + 'M' : 'NULL'}`);
    console.log(`   EPS: ${income?.eps || 'NULL'}`);

    // Check cash flow (TTM)
    const cfUrl = `https://financialmodelingprep.com/api/v3/cash-flow-statement/${ticker}?period=annual&limit=1&apikey=${FMP_API_KEY}`;
    const cfRes = await axios.get(cfUrl, { timeout: 10000 });
    const cf = cfRes.data?.[0];
    console.log(`\n💵 Cash Flow Statement:`);
    console.log(`   FCF: ${cf?.freeCashFlow ? (cf.freeCashFlow / 1e6).toFixed(2) + 'M' : 'NULL'}`);
    console.log(`   OCF: ${cf?.operatingCashFlow ? (cf.operatingCashFlow / 1e6).toFixed(2) + 'M' : 'NULL'}`);

    // Check balance sheet
    const bsUrl = `https://financialmodelingprep.com/api/v3/balance-sheet-statement/${ticker}?period=annual&limit=1&apikey=${FMP_API_KEY}`;
    const bsRes = await axios.get(bsUrl, { timeout: 10000 });
    const bs = bsRes.data?.[0];
    console.log(`\n📈 Balance Sheet:`);
    console.log(`   Total Debt: ${bs?.totalDebt ? (bs.totalDebt / 1e6).toFixed(2) + 'M' : 'NULL'}`);
    console.log(`   Cash: ${bs?.cashAndCashEquivalents ? (bs.cashAndCashEquivalents / 1e6).toFixed(2) + 'M' : 'NULL'}`);
    console.log(`   Total Equity: ${bs?.totalStockholdersEquity ? (bs.totalStockholdersEquity / 1e6).toFixed(2) + 'M' : 'NULL'}`);

    // Check historical ratios
    const ratiosUrl = `https://financialmodelingprep.com/api/v3/ratios/${ticker}?period=annual&limit=5&apikey=${FMP_API_KEY}`;
    const ratiosRes = await axios.get(ratiosUrl, { timeout: 10000 });
    const ratios = ratiosRes.data;
    console.log(`\n📊 Historical Ratios (5Y):`);
    if (ratios && ratios.length > 0) {
      console.log(`   P/E ratios: ${ratios.map((r: any) => r.priceEarningsRatio?.toFixed(2) || 'N/A').join(', ')}`);
      console.log(`   P/B ratios: ${ratios.map((r: any) => r.priceToBookRatio?.toFixed(2) || 'N/A').join(', ')}`);
      console.log(`   P/S ratios: ${ratios.map((r: any) => r.priceToSalesRatio?.toFixed(2) || 'N/A').join(', ')}`);
    } else {
      console.log('   No historical ratios available');
    }

    // Check dividend history
    const divUrl = `https://financialmodelingprep.com/api/v3/historical-price-full/stock_dividend/${ticker}?apikey=${FMP_API_KEY}`;
    const divRes = await axios.get(divUrl, { timeout: 10000 });
    const divs = divRes.data?.historical;
    console.log(`\n💸 Dividends:`);
    if (divs && divs.length > 0) {
      const recentDivs = divs.slice(0, 4);
      console.log(`   Recent (4): ${recentDivs.map((d: any) => d.dividend?.toFixed(4) || 'N/A').join(', ')}`);
    } else {
      console.log('   No dividend history');
    }

  } catch (error: any) {
    console.error(`\n❌ FMP API error: ${error.message}`);
  }
}

async function main() {
  console.log('='.repeat(80));
  console.log('MATERIALS SECTOR DEEP DIVE');
  console.log('Testing 3 representative stocks: LIN, APD, FCX');
  console.log('='.repeat(80));

  for (const ticker of TEST_STOCKS) {
    await analyzeStock(ticker);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
  }

  console.log('\n\n' + '='.repeat(80));
  console.log('DIAGNOSIS SUMMARY');
  console.log('='.repeat(80));
  console.log(`
If Materials stocks show:
  - NULL FCF → DCF methods fail (expected)
  - NULL dividends → DDM/Dividend methods fail (expected)
  - NULL historical P/E → P/E Mean fails (expected)
  - Sector = Materials → REIT methods fail (correct behavior)

Root Cause Options:
  1. API DATA GAP: FMP has incomplete financial data for Materials sector
  2. CALCULATION BUG: Our valuation logic fails on cyclical/industrial stocks
  3. EXPECTED BEHAVIOR: Materials legitimately have fewer valuation methods

Next Step: Compare with a passing stock (e.g., AAPL) to establish baseline.
  `);
}

main().catch(console.error);
