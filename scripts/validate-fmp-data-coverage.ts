/**
 * FMP Data Coverage Validation Script
 *
 * Tests FMP API data availability for all 14 Intrinsic Value calculation methods
 * across a diverse sample of 10 stocks covering different sectors and market caps.
 *
 * Deliverables:
 * 1. Data Coverage Matrix (CSV)
 * 2. Test Results (JSON)
 * 3. Gap Analysis Report (Markdown)
 * 4. Sector-Specific Findings (Markdown)
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const FMP_API_KEY = process.env.FMP_API_KEY || 'sEoOHoj4kGtqhkU7MrQl4lmeF4LwB2Bh';
const FMP_BASE_URL = 'https://financialmodelingprep.com';

// Test stock universe - diverse sectors and types
const TEST_STOCKS = [
  { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', type: 'Large Cap Tech' },
  { symbol: 'JPM', name: 'JPMorgan Chase', sector: 'Financials', type: 'Large Cap Financial' },
  { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', type: 'Large Cap Healthcare' },
  { symbol: 'XOM', name: 'Exxon Mobil', sector: 'Energy', type: 'Large Cap Energy' },
  { symbol: 'NEE', name: 'NextEra Energy', sector: 'Utilities', type: 'Large Cap Utility' },
  { symbol: 'AMT', name: 'American Tower', sector: 'Real Estate', type: 'REIT' },
  { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Technology', type: 'High Growth Tech' },
  { symbol: 'KO', name: 'Coca-Cola', sector: 'Consumer Staples', type: 'Consumer Defensive' },
  { symbol: 'BA', name: 'Boeing', sector: 'Industrials', type: 'Industrial Cyclical' },
  { symbol: 'WMT', name: 'Walmart', sector: 'Retail', type: 'Large Cap Retail' },
];

// 14 Valuation Methods mapped to FMP endpoints
const VALUATION_METHODS = [
  {
    name: 'AlfaValue™',
    method_id: 'alfa-value',
    category: 'proprietary',
    required_data: ['fcf', 'revenue_growth', 'roic', 'wacc', 'beta', 'shares'],
    endpoints: [
      '/api/v3/cash-flow-statement/:symbol',
      '/api/v3/key-metrics/:symbol',
      '/api/v3/profile/:symbol',
      '/api/v3/balance-sheet-statement/:symbol',
    ],
  },
  {
    name: 'DCF-20 FCF FMP',
    method_id: 'dcf-fcf-20',
    category: 'dcf',
    required_data: ['fcf_20y', 'discount_rate', 'cash', 'debt', 'shares'],
    endpoints: [
      '/api/v3/cash-flow-statement/:symbol',
      '/api/v3/discounted-cash-flow/:symbol',
      '/api/v3/balance-sheet-statement/:symbol',
    ],
  },
  {
    name: 'DCF-20 FCFE FMP',
    method_id: 'dcf-fcfe-20',
    category: 'dcf',
    required_data: ['fcfe', 'discount_rate', 'cash', 'debt', 'shares'],
    endpoints: [
      '/api/v4/advanced_levered_discounted_cash_flow',
      '/api/v3/cash-flow-statement/:symbol',
      '/api/v3/balance-sheet-statement/:symbol',
    ],
  },
  {
    name: 'DCF Terminal FCF',
    method_id: 'dcf-terminal-fcf',
    category: 'dcf',
    required_data: ['fcf_terminal', 'terminal_growth', 'wacc'],
    endpoints: [
      '/api/v3/cash-flow-statement/:symbol',
      '/api/v3/discounted-cash-flow/:symbol',
    ],
  },
  {
    name: 'DCF Terminal FCFE',
    method_id: 'dcf-terminal-fcfe',
    category: 'dcf',
    required_data: ['fcfe_terminal', 'terminal_growth', 'wacc'],
    endpoints: [
      '/api/v4/advanced_levered_discounted_cash_flow',
    ],
  },
  {
    name: 'DNI-20 NI',
    method_id: 'dni-20',
    category: 'dcf',
    required_data: ['net_income', 'ni_growth', 'discount_rate', 'cash', 'debt', 'shares'],
    endpoints: [
      '/api/v3/income-statement/:symbol',
      '/api/v3/balance-sheet-statement/:symbol',
      '/api/v3/key-metrics/:symbol',
    ],
  },
  {
    name: 'P/E Mean 5y',
    method_id: 'pe-mean',
    category: 'multiples',
    required_data: ['pe_ratio_5y', 'eps_ttm'],
    endpoints: [
      '/api/v3/ratios/:symbol',
      '/api/v3/key-metrics-ttm/:symbol',
    ],
  },
  {
    name: 'P/S Mean 5y',
    method_id: 'ps-mean',
    category: 'multiples',
    required_data: ['ps_ratio_5y', 'revenue_per_share_ttm'],
    endpoints: [
      '/api/v3/ratios/:symbol',
      '/api/v3/key-metrics-ttm/:symbol',
    ],
  },
  {
    name: 'P/B Mean 5y',
    method_id: 'pb-mean',
    category: 'multiples',
    required_data: ['pb_ratio_5y', 'book_value_per_share_ttm'],
    endpoints: [
      '/api/v3/ratios/:symbol',
      '/api/v3/key-metrics-ttm/:symbol',
    ],
  },
  {
    name: 'PEG Ratio',
    method_id: 'peg',
    category: 'growth',
    required_data: ['pe_ratio', 'eps_growth_rate'],
    endpoints: [
      '/api/v3/ratios/:symbol',
      '/api/v3/financial-growth/:symbol',
      '/api/v3/key-metrics-ttm/:symbol',
    ],
  },
  {
    name: 'PSG Ratio',
    method_id: 'psg',
    category: 'growth',
    required_data: ['ps_ratio', 'revenue_growth_rate'],
    endpoints: [
      '/api/v3/ratios/:symbol',
      '/api/v3/financial-growth/:symbol',
      '/api/v3/income-statement/:symbol',
    ],
  },
  {
    name: 'P/E without NRI',
    method_id: 'pe-mean-without-nri',
    category: 'multiples',
    required_data: ['pe_ratio_5y', 'eps_adjusted', 'special_items'],
    endpoints: [
      '/api/v3/ratios/:symbol',
      '/api/v3/income-statement/:symbol',
    ],
  },
  {
    name: 'P/B without NRI',
    method_id: 'pb-mean-without-nri',
    category: 'multiples',
    required_data: ['pb_ratio_5y', 'book_value_adjusted'],
    endpoints: [
      '/api/v3/ratios/:symbol',
      '/api/v3/balance-sheet-statement/:symbol',
    ],
  },
  {
    name: 'DFCF Terminal',
    method_id: 'dfcf-terminal',
    category: 'dcf',
    required_data: ['fcf_3stage', 'terminal_growth', 'wacc'],
    endpoints: [
      '/api/v3/cash-flow-statement/:symbol',
      '/api/v3/discounted-cash-flow/:symbol',
    ],
  },
];

// FMP endpoint tests
interface EndpointTest {
  endpoint: string;
  status: 'success' | 'failed' | 'partial';
  data_quality: 'complete' | 'incomplete' | 'missing';
  response_size: number;
  latest_date?: string;
  field_coverage?: Record<string, boolean>;
  error?: string;
}

interface StockTestResult {
  symbol: string;
  name: string;
  sector: string;
  type: string;
  endpoint_tests: EndpointTest[];
  overall_coverage: number;
  data_freshness_days: number;
}

interface MethodCoverage {
  method_name: string;
  method_id: string;
  category: string;
  required_endpoints: string[];
  availability: 'full' | 'partial' | 'missing';
  missing_data?: string[];
  stocks_covered: number;
  stocks_partial: number;
  stocks_missing: number;
}

// Helper: Make FMP API request
async function fmpGet<T>(endpoint: string, symbol?: string): Promise<{ data: T | null; error?: string }> {
  try {
    const url = endpoint.includes(':symbol') && symbol
      ? endpoint.replace(':symbol', symbol)
      : endpoint;

    const fullUrl = `${FMP_BASE_URL}${url}?apikey=${FMP_API_KEY}&limit=5`;

    console.log(`Testing: ${fullUrl.replace(FMP_API_KEY, 'API_KEY')}`);

    const response = await axios.get<T>(fullUrl, {
      timeout: 15000,
      headers: { 'Accept-Encoding': 'gzip' },
    });

    return { data: response.data };
  } catch (error: any) {
    return {
      data: null,
      error: error.response?.status === 404 ? '404_NOT_FOUND' : error.message,
    };
  }
}

// Test endpoint for a stock
async function testEndpoint(endpoint: string, symbol: string): Promise<EndpointTest> {
  const result = await fmpGet<any>(endpoint, symbol);

  if (!result.data) {
    return {
      endpoint,
      status: 'failed',
      data_quality: 'missing',
      response_size: 0,
      error: result.error,
    };
  }

  // Analyze data quality
  const dataArray = Array.isArray(result.data) ? result.data : [result.data];
  const firstItem = dataArray[0] || {};

  // Check field coverage
  const fieldCoverage: Record<string, boolean> = {};
  const criticalFields = [
    'date', 'freeCashFlow', 'netIncome', 'revenue', 'totalDebt',
    'cashAndCashEquivalents', 'priceEarningsRatio', 'priceToBookRatio',
    'priceToSalesRatio', 'eps', 'bookValuePerShare', 'revenuePerShare',
  ];

  criticalFields.forEach(field => {
    fieldCoverage[field] = firstItem[field] !== undefined && firstItem[field] !== null;
  });

  const coveredFields = Object.values(fieldCoverage).filter(Boolean).length;
  const dataQuality = coveredFields > 0 ? (coveredFields >= criticalFields.length * 0.7 ? 'complete' : 'incomplete') : 'missing';

  return {
    endpoint,
    status: dataArray.length > 0 ? 'success' : 'partial',
    data_quality: dataQuality,
    response_size: dataArray.length,
    latest_date: firstItem.date || firstItem.calendarYear || undefined,
    field_coverage: fieldCoverage,
  };
}

// Test all endpoints for a stock
async function testStock(stock: typeof TEST_STOCKS[0]): Promise<StockTestResult> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing ${stock.symbol} - ${stock.name} (${stock.sector})`);
  console.log('='.repeat(60));

  const allEndpoints = new Set<string>();
  VALUATION_METHODS.forEach(m => m.endpoints.forEach(e => allEndpoints.add(e)));

  const endpointTests: EndpointTest[] = [];

  for (const endpoint of Array.from(allEndpoints)) {
    const test = await testEndpoint(endpoint, stock.symbol);
    endpointTests.push(test);

    console.log(
      `  ${test.status === 'success' ? '✅' : test.status === 'partial' ? '⚠️' : '❌'} ` +
      `${endpoint.replace(':symbol', stock.symbol)} - ` +
      `${test.data_quality} (${test.response_size} records)`
    );

    // Rate limiting: wait 300ms between requests (max 4 req/s)
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  const successfulTests = endpointTests.filter(t => t.status === 'success').length;
  const overallCoverage = (successfulTests / endpointTests.length) * 100;

  // Calculate data freshness
  const latestDates = endpointTests
    .map(t => t.latest_date)
    .filter(Boolean)
    .map(d => new Date(d!));

  const mostRecentDate = latestDates.length > 0 ? new Date(Math.max(...latestDates.map(d => d.getTime()))) : new Date();
  const dataFreshnessDays = Math.floor((Date.now() - mostRecentDate.getTime()) / (1000 * 60 * 60 * 24));

  console.log(`\nOverall Coverage: ${overallCoverage.toFixed(1)}%`);
  console.log(`Data Freshness: ${dataFreshnessDays} days old`);

  return {
    symbol: stock.symbol,
    name: stock.name,
    sector: stock.sector,
    type: stock.type,
    endpoint_tests: endpointTests,
    overall_coverage: overallCoverage,
    data_freshness_days: dataFreshnessDays,
  };
}

// Analyze method coverage across all stocks
function analyzeMethodCoverage(stockResults: StockTestResult[]): MethodCoverage[] {
  return VALUATION_METHODS.map(method => {
    let stocksCovered = 0;
    let stocksPartial = 0;
    let stocksMissing = 0;
    const missingData: string[] = [];

    stockResults.forEach(stock => {
      const requiredEndpoints = method.endpoints;
      const endpointResults = requiredEndpoints.map(ep =>
        stock.endpoint_tests.find(t => t.endpoint === ep)
      );

      const allSuccess = endpointResults.every(r => r?.status === 'success' && r?.data_quality === 'complete');
      const someSuccess = endpointResults.some(r => r?.status === 'success');
      const allFailed = endpointResults.every(r => r?.status === 'failed');

      if (allSuccess) {
        stocksCovered++;
      } else if (someSuccess) {
        stocksPartial++;

        // Track missing data points
        endpointResults.forEach(r => {
          if (r?.status === 'failed' || r?.data_quality !== 'complete') {
            missingData.push(`${stock.symbol}: ${r?.endpoint || 'unknown'}`);
          }
        });
      } else if (allFailed) {
        stocksMissing++;
        missingData.push(`${stock.symbol}: All endpoints failed`);
      }
    });

    const availability: 'full' | 'partial' | 'missing' =
      stocksCovered === stockResults.length ? 'full' :
      stocksCovered > 0 || stocksPartial > 0 ? 'partial' :
      'missing';

    return {
      method_name: method.name,
      method_id: method.method_id,
      category: method.category,
      required_endpoints: method.endpoints,
      availability,
      missing_data: missingData.length > 0 ? missingData : undefined,
      stocks_covered: stocksCovered,
      stocks_partial: stocksPartial,
      stocks_missing: stocksMissing,
    };
  });
}

// Generate CSV coverage matrix
function generateCoverageMatrix(methodCoverage: MethodCoverage[]): string {
  const headers = ['Method', 'Category', 'Availability', 'Stocks Covered', 'Stocks Partial', 'Stocks Missing', 'Required Endpoints'];
  const rows = methodCoverage.map(m => [
    m.method_name,
    m.category,
    m.availability === 'full' ? '✅ Full' : m.availability === 'partial' ? '⚠️ Partial' : '❌ Missing',
    m.stocks_covered.toString(),
    m.stocks_partial.toString(),
    m.stocks_missing.toString(),
    m.required_endpoints.join('; '),
  ]);

  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

// Generate gap analysis report
function generateGapAnalysisReport(methodCoverage: MethodCoverage[], stockResults: StockTestResult[]): string {
  const report: string[] = [];

  report.push('# FMP Data Coverage - Gap Analysis Report\n');
  report.push(`Generated: ${new Date().toISOString()}\n`);
  report.push('## Executive Summary\n');

  const fullCoverage = methodCoverage.filter(m => m.availability === 'full').length;
  const partialCoverage = methodCoverage.filter(m => m.availability === 'partial').length;
  const missingCoverage = methodCoverage.filter(m => m.availability === 'missing').length;

  report.push(`- **Full Coverage:** ${fullCoverage}/14 methods (${((fullCoverage / 14) * 100).toFixed(1)}%)`);
  report.push(`- **Partial Coverage:** ${partialCoverage}/14 methods (${((partialCoverage / 14) * 100).toFixed(1)}%)`);
  report.push(`- **Missing Coverage:** ${missingCoverage}/14 methods (${((missingCoverage / 14) * 100).toFixed(1)}%)\n`);

  report.push('## Methods with Issues\n');

  methodCoverage
    .filter(m => m.availability !== 'full')
    .forEach(m => {
      report.push(`### ${m.method_name} (${m.method_id})\n`);
      report.push(`- **Status:** ${m.availability === 'partial' ? '⚠️ Partial Coverage' : '❌ No Coverage'}`);
      report.push(`- **Stocks Covered:** ${m.stocks_covered}/10`);
      report.push(`- **Stocks Partial:** ${m.stocks_partial}/10`);
      report.push(`- **Stocks Missing:** ${m.stocks_missing}/10\n`);

      if (m.missing_data) {
        report.push('**Missing Data:**');
        m.missing_data.slice(0, 5).forEach(d => report.push(`- ${d}`));
        if (m.missing_data.length > 5) {
          report.push(`- ... and ${m.missing_data.length - 5} more\n`);
        }
        report.push('');
      }

      report.push('**Required Endpoints:**');
      m.required_endpoints.forEach(ep => report.push(`- ${ep}`));
      report.push('');
    });

  report.push('## Sector-Specific Findings\n');

  const sectorCoverage: Record<string, { total: number; success: number }> = {};
  stockResults.forEach(stock => {
    if (!sectorCoverage[stock.sector]) {
      sectorCoverage[stock.sector] = { total: 0, success: 0 };
    }
    sectorCoverage[stock.sector].total += stock.endpoint_tests.length;
    sectorCoverage[stock.sector].success += stock.endpoint_tests.filter(t => t.status === 'success').length;
  });

  Object.entries(sectorCoverage).forEach(([sector, data]) => {
    const coverage = (data.success / data.total) * 100;
    report.push(`- **${sector}:** ${coverage.toFixed(1)}% coverage (${data.success}/${data.total} endpoints)`);
  });

  report.push('\n## Data Freshness\n');
  stockResults.forEach(stock => {
    const freshness = stock.data_freshness_days === 0 ? 'Today' : `${stock.data_freshness_days} days old`;
    report.push(`- **${stock.symbol}:** ${freshness}`);
  });

  return report.join('\n');
}

// Main execution
async function main() {
  console.log('FMP Data Coverage Validation');
  console.log('============================\n');
  console.log(`Testing ${TEST_STOCKS.length} stocks across ${VALUATION_METHODS.length} valuation methods\n`);

  const stockResults: StockTestResult[] = [];

  // Test each stock
  for (const stock of TEST_STOCKS) {
    const result = await testStock(stock);
    stockResults.push(result);

    // Wait between stocks to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('Analyzing method coverage...');
  console.log(`${'='.repeat(60)}\n`);

  const methodCoverage = analyzeMethodCoverage(stockResults);

  // Generate deliverables
  const outputDir = path.join(process.cwd(), 'validation-results');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 1. Coverage Matrix CSV
  const csvMatrix = generateCoverageMatrix(methodCoverage);
  fs.writeFileSync(path.join(outputDir, 'fmp-coverage-matrix.csv'), csvMatrix);
  console.log('✅ Generated: fmp-coverage-matrix.csv');

  // 2. Test Results JSON
  const jsonResults = {
    timestamp: new Date().toISOString(),
    stock_results: stockResults,
    method_coverage: methodCoverage,
    summary: {
      total_methods: VALUATION_METHODS.length,
      full_coverage: methodCoverage.filter(m => m.availability === 'full').length,
      partial_coverage: methodCoverage.filter(m => m.availability === 'partial').length,
      missing_coverage: methodCoverage.filter(m => m.availability === 'missing').length,
    },
  };
  fs.writeFileSync(
    path.join(outputDir, 'fmp-test-results.json'),
    JSON.stringify(jsonResults, null, 2)
  );
  console.log('✅ Generated: fmp-test-results.json');

  // 3. Gap Analysis Report
  const gapReport = generateGapAnalysisReport(methodCoverage, stockResults);
  fs.writeFileSync(path.join(outputDir, 'fmp-gap-analysis.md'), gapReport);
  console.log('✅ Generated: fmp-gap-analysis.md');

  console.log(`\nAll validation results saved to: ${outputDir}`);
  console.log('\nSummary:');
  console.log(`- Full Coverage: ${jsonResults.summary.full_coverage}/14 methods`);
  console.log(`- Partial Coverage: ${jsonResults.summary.partial_coverage}/14 methods`);
  console.log(`- Missing Coverage: ${jsonResults.summary.missing_coverage}/14 methods`);
}

main().catch(error => {
  console.error('Validation failed:', error);
  process.exit(1);
});
