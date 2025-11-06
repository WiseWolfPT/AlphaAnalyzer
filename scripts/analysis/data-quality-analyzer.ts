/**
 * Data Quality Analyzer for Stock Universe
 *
 * Analyzes data completeness and quality across the entire stock universe
 * to identify which stocks have sufficient data for accurate IV calculations.
 *
 * Part of comprehensive QA testing for Alfalyzer platform.
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const FMP_API_KEY = process.env.FMP_API_KEY || '';
const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3';

interface DataQualityScore {
  ticker: string;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  breakdown: {
    financialStatements: number;
    valuationMetrics: number;
    companyProfile: number;
    dividendData: number;
    recentData: number;
  };
  missingData: string[];
  dataAgeDays: number;
  methodsAffected: string[];
  recommendation: string;
  rawData?: any;
}

interface StockSample {
  category: 'large-cap' | 'mid-cap' | 'small-cap' | 'reit' | 'recent-ipo';
  symbols: string[];
}

// Sample stocks for deep analysis
const SAMPLE_STOCKS: StockSample[] = [
  {
    category: 'large-cap',
    symbols: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK-B', 'JPM', 'V']
  },
  {
    category: 'mid-cap',
    symbols: ['ROKU', 'DOCU', 'TWLO', 'SNAP', 'ZM', 'NET', 'DDOG', 'SNOW', 'CRWD', 'ZS']
  },
  {
    category: 'small-cap',
    symbols: ['CLOV', 'WISH', 'RIDE', 'GOEV', 'WKHS', 'BLNK', 'CHPT', 'QS', 'PLUG', 'FCEL']
  },
  {
    category: 'reit',
    symbols: ['AMT', 'PLD', 'CCI', 'EQIX', 'PSA', 'O', 'SPG', 'WELL', 'AVB', 'EQR']
  },
  {
    category: 'recent-ipo',
    symbols: ['RIVN', 'LCID', 'COIN', 'HOOD', 'RBLX', 'ABNB', 'DASH', 'CPNG', 'NU', 'GRAB']
  }
];

/**
 * Fetch all data for a single stock
 */
async function fetchStockData(symbol: string): Promise<any> {
  console.log(`\n🔍 Fetching data for ${symbol}...`);

  const data: any = {
    symbol,
    fetchedAt: new Date().toISOString()
  };

  try {
    // Financial Statements (5 years)
    const [incomeStatement, balanceSheet, cashFlow] = await Promise.all([
      axios.get(`${FMP_BASE_URL}/income-statement/${symbol}?limit=5&apikey=${FMP_API_KEY}`),
      axios.get(`${FMP_BASE_URL}/balance-sheet-statement/${symbol}?limit=5&apikey=${FMP_API_KEY}`),
      axios.get(`${FMP_BASE_URL}/cash-flow-statement/${symbol}?limit=5&apikey=${FMP_API_KEY}`)
    ]);

    data.incomeStatement = incomeStatement.data;
    data.balanceSheet = balanceSheet.data;
    data.cashFlow = cashFlow.data;

    // Ratios & Metrics
    const [ratios, metrics, growth] = await Promise.all([
      axios.get(`${FMP_BASE_URL}/ratios/${symbol}?limit=5&apikey=${FMP_API_KEY}`),
      axios.get(`${FMP_BASE_URL}/key-metrics/${symbol}?limit=5&apikey=${FMP_API_KEY}`),
      axios.get(`${FMP_BASE_URL}/financial-growth/${symbol}?limit=5&apikey=${FMP_API_KEY}`)
    ]);

    data.ratios = ratios.data;
    data.metrics = metrics.data;
    data.growth = growth.data;

    // Company Profile
    const profile = await axios.get(`${FMP_BASE_URL}/profile/${symbol}?apikey=${FMP_API_KEY}`);
    data.profile = profile.data?.[0] || null;

    // Dividends
    const dividends = await axios.get(
      `${FMP_BASE_URL}/historical-price-full/stock_dividend/${symbol}?apikey=${FMP_API_KEY}`
    );
    data.dividends = dividends.data;

    // Quote (current price)
    const quote = await axios.get(`${FMP_BASE_URL}/quote/${symbol}?apikey=${FMP_API_KEY}`);
    data.quote = quote.data?.[0] || null;

    console.log(`✅ Successfully fetched data for ${symbol}`);
    return data;

  } catch (error: any) {
    console.error(`❌ Error fetching data for ${symbol}:`, error.message);
    return data;
  }
}

/**
 * Calculate data quality score (0-100)
 */
function scoreDataCompleteness(symbol: string, fmpData: any): DataQualityScore {
  let totalScore = 0;
  const missingData: string[] = [];
  const methodsAffected: string[] = [];

  // A. Financial Statements (30 points)
  let financialStatementsScore = 0;

  if (fmpData.incomeStatement?.length >= 5) {
    financialStatementsScore += 10;
  } else {
    missingData.push(`Income Statement (${fmpData.incomeStatement?.length || 0}/5 years)`);
    methodsAffected.push('DCF', 'P/E Ratio', 'EV/Revenue');
  }

  if (fmpData.balanceSheet?.length >= 5) {
    financialStatementsScore += 10;
  } else {
    missingData.push(`Balance Sheet (${fmpData.balanceSheet?.length || 0}/5 years)`);
    methodsAffected.push('Book Value', 'Net Asset Value');
  }

  if (fmpData.cashFlow?.length >= 5) {
    financialStatementsScore += 10;
  } else {
    missingData.push(`Cash Flow (${fmpData.cashFlow?.length || 0}/5 years)`);
    methodsAffected.push('Free Cash Flow', 'OCF-Based DCF');
  }

  totalScore += financialStatementsScore;

  // B. Valuation Metrics (25 points)
  let valuationMetricsScore = 0;

  if (fmpData.ratios?.length >= 5) {
    valuationMetricsScore += 15;
  } else {
    missingData.push(`Ratios (${fmpData.ratios?.length || 0}/5 years)`);
    methodsAffected.push('Historical P/E', 'P/S Ratio', 'P/B Ratio');
  }

  // Check for FCF in metrics or cash flow
  const hasFCF = fmpData.metrics?.some((m: any) => m.freeCashFlowPerShare != null) ||
                 fmpData.cashFlow?.some((c: any) => c.freeCashFlow != null);

  if (hasFCF && fmpData.metrics?.length >= 5) {
    valuationMetricsScore += 5;
  } else {
    missingData.push('Free Cash Flow (5 years)');
    methodsAffected.push('FCF-based DCF', 'FCF Yield');
  }

  if (fmpData.growth?.length > 0) {
    valuationMetricsScore += 5;
  } else {
    missingData.push('Growth Rates');
    methodsAffected.push('Growth-adjusted DCF');
  }

  totalScore += valuationMetricsScore;

  // C. Company Profile (15 points)
  let companyProfileScore = 0;

  if (fmpData.profile?.sector) {
    companyProfileScore += 5;
  } else {
    missingData.push('Sector Classification');
  }

  if (fmpData.profile?.exchange) {
    companyProfileScore += 5;
  } else {
    missingData.push('Exchange Listing');
  }

  if (fmpData.profile?.mktCap && fmpData.profile.mktCap > 0) {
    companyProfileScore += 5;
  } else {
    missingData.push('Market Cap');
  }

  totalScore += companyProfileScore;

  // D. Dividend Data (15 points)
  let dividendDataScore = 0;

  const dividendHistory = fmpData.dividends?.historical || [];
  if (dividendHistory.length >= 20) { // ~5 years quarterly
    dividendDataScore += 10;
  } else if (dividendHistory.length > 0) {
    dividendDataScore += 5;
    missingData.push(`Dividend History (${dividendHistory.length}/20 quarters)`);
  } else {
    missingData.push('Dividend History (0 records)');
    methodsAffected.push('Dividend Discount Model', 'Gordon Growth Model');
  }

  if (fmpData.profile?.lastDiv && fmpData.profile.lastDiv > 0) {
    dividendDataScore += 5;
  } else {
    missingData.push('Current Dividend Yield');
  }

  totalScore += dividendDataScore;

  // E. Recent Data (15 points)
  let recentDataScore = 0;

  if (fmpData.incomeStatement?.[0]?.date) {
    const latestDate = new Date(fmpData.incomeStatement[0].date);
    const daysSinceLatest = Math.floor(
      (Date.now() - latestDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLatest < 90) {
      recentDataScore += 10;
    } else if (daysSinceLatest < 180) {
      recentDataScore += 5;
      missingData.push(`Stale Data (${daysSinceLatest} days old)`);
    } else {
      missingData.push(`Very Stale Data (${daysSinceLatest} days old)`);
      methodsAffected.push('All methods (outdated fundamentals)');
    }
  } else {
    missingData.push('No Financial Statement Dates');
  }

  if (fmpData.quote?.price && fmpData.quote.price > 0) {
    recentDataScore += 5;
  } else {
    missingData.push('Current Stock Price');
  }

  totalScore += recentDataScore;

  // Calculate data age
  let dataAgeDays = 999;
  if (fmpData.incomeStatement?.[0]?.date) {
    const latestDate = new Date(fmpData.incomeStatement[0].date);
    dataAgeDays = Math.floor((Date.now() - latestDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Determine grade
  let grade: 'A' | 'B' | 'C' | 'D' | 'F';
  if (totalScore >= 90) grade = 'A';
  else if (totalScore >= 75) grade = 'B';
  else if (totalScore >= 60) grade = 'C';
  else if (totalScore >= 45) grade = 'D';
  else grade = 'F';

  // Generate recommendation
  let recommendation: string;
  if (grade === 'A') {
    recommendation = 'Excellent - All 12+ valuation methods should work reliably';
  } else if (grade === 'B') {
    recommendation = 'Good - 8-10 methods should work, minor gaps acceptable';
  } else if (grade === 'C') {
    recommendation = 'Acceptable - 6-8 methods workable, consider data enrichment';
  } else if (grade === 'D') {
    recommendation = 'Poor - <6 methods reliable, prioritize for data fixes';
  } else {
    recommendation = 'Insufficient - Exclude from IV calculations or mark "Limited Data"';
  }

  // Remove duplicates from methodsAffected
  const uniqueMethodsAffected = [...new Set(methodsAffected)];

  return {
    ticker: symbol,
    score: totalScore,
    grade,
    breakdown: {
      financialStatements: financialStatementsScore,
      valuationMetrics: valuationMetricsScore,
      companyProfile: companyProfileScore,
      dividendData: dividendDataScore,
      recentData: recentDataScore
    },
    missingData,
    dataAgeDays,
    methodsAffected: uniqueMethodsAffected,
    recommendation,
    rawData: fmpData
  };
}

/**
 * Main analysis function
 */
async function analyzeDataQuality() {
  console.log('🚀 Starting Data Quality Analysis for Stock Universe\n');
  console.log('=' .repeat(80));

  const results: DataQualityScore[] = [];
  const outputDir = path.join(process.cwd(), 'scripts', 'analysis', 'output');

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Flatten all sample stocks
  const allSymbols = SAMPLE_STOCKS.flatMap(s => s.symbols);
  console.log(`📊 Analyzing ${allSymbols.length} sample stocks across 5 categories\n`);

  // Analyze each stock with rate limiting (4 req/s FMP limit)
  for (let i = 0; i < allSymbols.length; i++) {
    const symbol = allSymbols[i];
    console.log(`\n[${i + 1}/${allSymbols.length}] Analyzing ${symbol}...`);

    try {
      // Fetch data
      const stockData = await fetchStockData(symbol);

      // Calculate score
      const score = scoreDataCompleteness(symbol, stockData);
      results.push(score);

      console.log(`📈 Score: ${score.score}/100 (Grade: ${score.grade})`);
      console.log(`📅 Data Age: ${score.dataAgeDays} days`);
      console.log(`⚠️  Missing: ${score.missingData.length} items`);

      // Rate limiting: 8 API calls per stock, max 4 req/s
      // Wait 2 seconds between stocks
      if (i < allSymbols.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

    } catch (error: any) {
      console.error(`❌ Failed to analyze ${symbol}:`, error.message);
      results.push({
        ticker: symbol,
        score: 0,
        grade: 'F',
        breakdown: {
          financialStatements: 0,
          valuationMetrics: 0,
          companyProfile: 0,
          dividendData: 0,
          recentData: 0
        },
        missingData: ['Complete data fetch failure'],
        dataAgeDays: 999,
        methodsAffected: ['All methods'],
        recommendation: 'Critical Error - Unable to fetch data'
      });
    }
  }

  console.log('\n\n' + '='.repeat(80));
  console.log('📊 ANALYSIS COMPLETE\n');

  // Generate summary statistics
  const summary = generateSummary(results);
  console.log(summary);

  // Save results
  saveResults(results, outputDir);

  return results;
}

/**
 * Generate summary statistics
 */
function generateSummary(results: DataQualityScore[]): string {
  const gradeCount = {
    A: results.filter(r => r.grade === 'A').length,
    B: results.filter(r => r.grade === 'B').length,
    C: results.filter(r => r.grade === 'C').length,
    D: results.filter(r => r.grade === 'D').length,
    F: results.filter(r => r.grade === 'F').length
  };

  const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;

  const commonGaps = findCommonGaps(results);

  let summary = '\n📊 DATA QUALITY SUMMARY\n';
  summary += '='.repeat(80) + '\n\n';

  summary += `Total Stocks Analyzed: ${results.length}\n`;
  summary += `Average Quality Score: ${avgScore.toFixed(1)}/100\n\n`;

  summary += 'Grade Distribution:\n';
  summary += `  A (90-100): ${gradeCount.A} stocks (${(gradeCount.A / results.length * 100).toFixed(1)}%)\n`;
  summary += `  B (75-89):  ${gradeCount.B} stocks (${(gradeCount.B / results.length * 100).toFixed(1)}%)\n`;
  summary += `  C (60-74):  ${gradeCount.C} stocks (${(gradeCount.C / results.length * 100).toFixed(1)}%)\n`;
  summary += `  D (45-59):  ${gradeCount.D} stocks (${(gradeCount.D / results.length * 100).toFixed(1)}%)\n`;
  summary += `  F (<45):    ${gradeCount.F} stocks (${(gradeCount.F / results.length * 100).toFixed(1)}%)\n\n`;

  summary += 'Most Common Data Gaps:\n';
  commonGaps.slice(0, 10).forEach((gap, i) => {
    summary += `  ${i + 1}. ${gap.type}: ${gap.count} stocks (${(gap.count / results.length * 100).toFixed(1)}%)\n`;
  });

  return summary;
}

/**
 * Find most common data gaps
 */
function findCommonGaps(results: DataQualityScore[]): Array<{type: string, count: number}> {
  const gapMap = new Map<string, number>();

  results.forEach(r => {
    r.missingData.forEach(gap => {
      gapMap.set(gap, (gapMap.get(gap) || 0) + 1);
    });
  });

  return Array.from(gapMap.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Save results to files
 */
function saveResults(results: DataQualityScore[], outputDir: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];

  // Save full JSON
  const jsonPath = path.join(outputDir, `data-quality-analysis-${timestamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
  console.log(`\n✅ Full results saved to: ${jsonPath}`);

  // Save CSV summary (without raw data)
  const csvPath = path.join(outputDir, `data-quality-summary-${timestamp}.csv`);
  const csvContent = generateCSV(results);
  fs.writeFileSync(csvPath, csvContent);
  console.log(`✅ CSV summary saved to: ${csvPath}`);

  // Save markdown report
  const mdPath = path.join(outputDir, `DATA_QUALITY_REPORT_${timestamp}.md`);
  const mdContent = generateMarkdownReport(results);
  fs.writeFileSync(mdPath, mdContent);
  console.log(`✅ Markdown report saved to: ${mdPath}`);
}

/**
 * Generate CSV content
 */
function generateCSV(results: DataQualityScore[]): string {
  let csv = 'Ticker,Score,Grade,Financial Statements,Valuation Metrics,Company Profile,Dividend Data,Recent Data,Data Age (Days),Missing Data Count,Methods Affected,Recommendation\n';

  results.forEach(r => {
    csv += `${r.ticker},${r.score},${r.grade},${r.breakdown.financialStatements},${r.breakdown.valuationMetrics},${r.breakdown.companyProfile},${r.breakdown.dividendData},${r.breakdown.recentData},${r.dataAgeDays},${r.missingData.length},${r.methodsAffected.length},"${r.recommendation}"\n`;
  });

  return csv;
}

/**
 * Generate comprehensive markdown report
 */
function generateMarkdownReport(results: DataQualityScore[]): string {
  const timestamp = new Date().toISOString();
  const summary = generateSummary(results);

  let md = `# Data Quality Analysis Report\n\n`;
  md += `**Generated:** ${timestamp}\n`;
  md += `**Stocks Analyzed:** ${results.length}\n\n`;
  md += `---\n\n`;

  md += summary + '\n\n';

  md += `## Detailed Breakdown by Category\n\n`;

  SAMPLE_STOCKS.forEach(category => {
    md += `### ${category.category.toUpperCase()}\n\n`;
    md += `| Ticker | Score | Grade | Missing Data | Methods Affected | Recommendation |\n`;
    md += `|--------|-------|-------|--------------|------------------|----------------|\n`;

    category.symbols.forEach(symbol => {
      const result = results.find(r => r.ticker === symbol);
      if (result) {
        md += `| ${result.ticker} | ${result.score} | ${result.grade} | ${result.missingData.length} items | ${result.methodsAffected.length} methods | ${result.recommendation} |\n`;
      }
    });

    md += `\n`;
  });

  md += `## Recommendations\n\n`;
  md += `### Immediate Actions (1 week)\n`;
  md += `1. Add quarterly fallback for stocks with annual-only data\n`;
  md += `2. Implement sector-average defaults for missing ratios\n`;
  md += `3. Add "data freshness" warnings for >90 day old data\n`;
  md += `4. Flag stocks with Grade D/F as "Limited Data Available"\n\n`;

  md += `### Medium-term Actions (1 month)\n`;
  md += `1. Integrate alternative data sources for small caps\n`;
  md += `2. Build proprietary growth rate estimators for recent IPOs\n`;
  md += `3. Add consensus estimates integration (analyst forecasts)\n`;
  md += `4. Manual data entry for high-priority stocks with gaps\n\n`;

  md += `### Long-term Actions (3 months)\n`;
  md += `1. Machine learning models to estimate missing fundamental data\n`;
  md += `2. Multi-source data aggregation (Quandl, IEX Cloud, Alpha Vantage)\n`;
  md += `3. Automated data quality monitoring and alerting\n`;
  md += `4. User-contributed data validation system\n\n`;

  return md;
}

// Run analysis
if (require.main === module) {
  analyzeDataQuality()
    .then(() => {
      console.log('\n✅ Analysis complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Analysis failed:', error);
      process.exit(1);
    });
}

export { analyzeDataQuality, scoreDataCompleteness, DataQualityScore };
