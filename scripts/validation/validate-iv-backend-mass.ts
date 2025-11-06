#!/usr/bin/env tsx
/**
 * Backend IV Mass Validation
 * Tests 100 stocks (stratified sample) for IV calculation anomalies
 */

interface StockTest {
  symbol: string;
  sector: string;
  expectedMethods?: string[];
}

interface ValidationResult {
  symbol: string;
  sector: string;
  passed: boolean;
  issues: string[];
  response?: any;
}

const PROD_URL = 'http://localhost:3001';

// Test Universe (Stratified by Sector)
const TEST_STOCKS: StockTest[] = [
  // Technology (15)
  { symbol: 'AAPL', sector: 'Technology' },
  { symbol: 'MSFT', sector: 'Technology' },
  { symbol: 'GOOGL', sector: 'Technology' },
  { symbol: 'NVDA', sector: 'Technology', expectedMethods: ['growth-dcf-8y'] },
  { symbol: 'META', sector: 'Technology', expectedMethods: ['growth-dcf-8y'] },
  { symbol: 'TSLA', sector: 'Technology', expectedMethods: ['growth-dcf-8y'] },
  { symbol: 'AMZN', sector: 'Technology', expectedMethods: ['growth-dcf-8y'] },
  { symbol: 'NFLX', sector: 'Technology' },
  { symbol: 'CRM', sector: 'Technology' },
  { symbol: 'ADBE', sector: 'Technology' },
  { symbol: 'ORCL', sector: 'Technology' },
  { symbol: 'INTC', sector: 'Technology' },
  { symbol: 'AMD', sector: 'Technology' },
  { symbol: 'QCOM', sector: 'Technology' },
  { symbol: 'CSCO', sector: 'Technology' },

  // Financials (10)
  { symbol: 'JPM', sector: 'Financials', expectedMethods: ['bank-p-tbv'] },
  { symbol: 'BAC', sector: 'Financials', expectedMethods: ['bank-p-tbv'] },
  { symbol: 'GS', sector: 'Financials', expectedMethods: ['bank-p-tbv'] },
  { symbol: 'MS', sector: 'Financials', expectedMethods: ['bank-p-tbv'] },
  { symbol: 'WFC', sector: 'Financials', expectedMethods: ['bank-p-tbv'] },
  { symbol: 'C', sector: 'Financials', expectedMethods: ['bank-p-tbv'] },
  { symbol: 'USB', sector: 'Financials', expectedMethods: ['bank-p-tbv'] },
  { symbol: 'PNC', sector: 'Financials', expectedMethods: ['bank-p-tbv'] },
  { symbol: 'TFC', sector: 'Financials', expectedMethods: ['bank-p-tbv'] },
  { symbol: 'COF', sector: 'Financials', expectedMethods: ['bank-p-tbv'] },

  // Real Estate / REITs (10)
  { symbol: 'AMT', sector: 'Real Estate', expectedMethods: ['reit-ffo', 'reit-affo'] },
  { symbol: 'PLD', sector: 'Real Estate', expectedMethods: ['reit-ffo', 'reit-affo'] },
  { symbol: 'EQIX', sector: 'Real Estate', expectedMethods: ['reit-ffo', 'reit-affo'] },
  { symbol: 'PSA', sector: 'Real Estate', expectedMethods: ['reit-ffo', 'reit-affo'] },
  { symbol: 'CCI', sector: 'Real Estate', expectedMethods: ['reit-ffo', 'reit-affo'] },
  { symbol: 'DLR', sector: 'Real Estate', expectedMethods: ['reit-ffo', 'reit-affo'] },
  { symbol: 'SPG', sector: 'Real Estate', expectedMethods: ['reit-ffo', 'reit-affo'] },
  { symbol: 'O', sector: 'Real Estate', expectedMethods: ['reit-ffo', 'reit-affo'] },
  { symbol: 'WELL', sector: 'Real Estate', expectedMethods: ['reit-ffo', 'reit-affo'] },
  { symbol: 'AVB', sector: 'Real Estate', expectedMethods: ['reit-ffo', 'reit-affo'] },

  // Healthcare (10)
  { symbol: 'JNJ', sector: 'Healthcare' },
  { symbol: 'UNH', sector: 'Healthcare' },
  { symbol: 'LLY', sector: 'Healthcare' },
  { symbol: 'ABBV', sector: 'Healthcare' },
  { symbol: 'MRK', sector: 'Healthcare' },
  { symbol: 'TMO', sector: 'Healthcare' },
  { symbol: 'ABT', sector: 'Healthcare' },
  { symbol: 'DHR', sector: 'Healthcare' },
  { symbol: 'BMY', sector: 'Healthcare' },
  { symbol: 'AMGN', sector: 'Healthcare' },

  // Consumer (10)
  { symbol: 'WMT', sector: 'Consumer' },
  { symbol: 'PG', sector: 'Consumer' },
  { symbol: 'KO', sector: 'Consumer' },
  { symbol: 'PEP', sector: 'Consumer' },
  { symbol: 'COST', sector: 'Consumer' },
  { symbol: 'HD', sector: 'Consumer' },
  { symbol: 'MCD', sector: 'Consumer' },
  { symbol: 'NKE', sector: 'Consumer' },
  { symbol: 'SBUX', sector: 'Consumer' },
  { symbol: 'TGT', sector: 'Consumer' },

  // Energy (10)
  { symbol: 'XOM', sector: 'Energy' },
  { symbol: 'CVX', sector: 'Energy' },
  { symbol: 'COP', sector: 'Energy' },
  { symbol: 'SLB', sector: 'Energy' },
  { symbol: 'EOG', sector: 'Energy' },
  { symbol: 'PSX', sector: 'Energy' },
  { symbol: 'VLO', sector: 'Energy' },
  { symbol: 'MPC', sector: 'Energy' },
  { symbol: 'OXY', sector: 'Energy' },
  { symbol: 'HAL', sector: 'Energy' },

  // Utilities (10)
  { symbol: 'NEE', sector: 'Utilities' },
  { symbol: 'DUK', sector: 'Utilities' },
  { symbol: 'SO', sector: 'Utilities' },
  { symbol: 'D', sector: 'Utilities' },
  { symbol: 'AEP', sector: 'Utilities' },
  { symbol: 'EXC', sector: 'Utilities' },
  { symbol: 'SRE', sector: 'Utilities' },
  { symbol: 'XEL', sector: 'Utilities' },
  { symbol: 'ED', sector: 'Utilities' },
  { symbol: 'ES', sector: 'Utilities' },

  // Industrials (10)
  { symbol: 'CAT', sector: 'Industrials' },
  { symbol: 'BA', sector: 'Industrials' },
  { symbol: 'GE', sector: 'Industrials' },
  { symbol: 'HON', sector: 'Industrials' },
  { symbol: 'UPS', sector: 'Industrials' },
  { symbol: 'RTX', sector: 'Industrials' },
  { symbol: 'LMT', sector: 'Industrials' },
  { symbol: 'MMM', sector: 'Industrials' },
  { symbol: 'DE', sector: 'Industrials' },
  { symbol: 'EMR', sector: 'Industrials' },

  // Materials (10)
  { symbol: 'LIN', sector: 'Materials' },
  { symbol: 'APD', sector: 'Materials' },
  { symbol: 'SHW', sector: 'Materials' },
  { symbol: 'ECL', sector: 'Materials' },
  { symbol: 'NEM', sector: 'Materials' },
  { symbol: 'FCX', sector: 'Materials' },
  { symbol: 'DOW', sector: 'Materials' },
  { symbol: 'DD', sector: 'Materials' },
  { symbol: 'ALB', sector: 'Materials' },
  { symbol: 'PPG', sector: 'Materials' },

  // Communication (5)
  { symbol: 'DIS', sector: 'Communication' },
  { symbol: 'CMCSA', sector: 'Communication' },
  { symbol: 'T', sector: 'Communication' },
  { symbol: 'VZ', sector: 'Communication' },
  { symbol: 'TMUS', sector: 'Communication' },
];

async function validateStock(test: StockTest): Promise<ValidationResult> {
  const issues: string[] = [];

  try {
    const response = await fetch(`${PROD_URL}/api/iv/${test.symbol}`);

    // 1. HTTP 200 response
    if (response.status !== 200) {
      issues.push(`HTTP ${response.status} (expected 200)`);
      return { symbol: test.symbol, sector: test.sector, passed: false, issues };
    }

    const data = await response.json();

    // 2. Valid JSON structure
    if (!data || typeof data !== 'object') {
      issues.push('Invalid JSON structure');
      return { symbol: test.symbol, sector: test.sector, passed: false, issues, response: data };
    }

    // 3. Zero NULL method_id values
    if (data.methods && Array.isArray(data.methods)) {
      const nullMethodIds = data.methods.filter((m: any) => m.method_id === null || m.method_id === undefined);
      if (nullMethodIds.length > 0) {
        issues.push(`${nullMethodIds.length} methods with NULL method_id`);
      }
    }

    // 4. Methods array length between 8-16
    if (!data.methods || !Array.isArray(data.methods)) {
      issues.push('Missing methods array');
    } else if (data.methods.length < 8 || data.methods.length > 16) {
      issues.push(`Methods count ${data.methods.length} (expected 8-16)`);
    }

    // 5. At least 1 method has non-null IV value
    if (data.methods && Array.isArray(data.methods)) {
      const hasValidIV = data.methods.some((m: any) =>
        m.intrinsicValue !== null &&
        m.intrinsicValue !== undefined &&
        typeof m.intrinsicValue === 'number' &&
        m.intrinsicValue > 0
      );
      if (!hasValidIV) {
        issues.push('No methods with valid IV value > 0');
      }
    }

    // 6. Sector-specific method validation
    if (test.expectedMethods && data.methods && Array.isArray(data.methods)) {
      const methodIds = data.methods.map((m: any) => m.method_id).filter(Boolean);
      const missingMethods = test.expectedMethods.filter(expected => !methodIds.includes(expected));

      if (missingMethods.length > 0) {
        issues.push(`Missing sector methods: ${missingMethods.join(', ')}`);
      }
    }

    return {
      symbol: test.symbol,
      sector: test.sector,
      passed: issues.length === 0,
      issues,
      response: data
    };

  } catch (error) {
    issues.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
    return { symbol: test.symbol, sector: test.sector, passed: false, issues };
  }
}

async function runValidation() {
  console.log('BACKEND MASS VALIDATION');
  console.log('=======================');

  const startTime = Date.now();

  // Run validations in parallel (batches of 10 to avoid overwhelming server)
  const batchSize = 10;
  const results: ValidationResult[] = [];

  for (let i = 0; i < TEST_STOCKS.length; i += batchSize) {
    const batch = TEST_STOCKS.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(validateStock));
    results.push(...batchResults);

    // Brief pause between batches
    if (i + batchSize < TEST_STOCKS.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  const executionTime = ((Date.now() - startTime) / 1000).toFixed(1);

  // Calculate statistics
  const passCount = results.filter(r => r.passed).length;
  const passRate = ((passCount / results.length) * 100).toFixed(0);

  // Sector breakdown
  const sectorStats = new Map<string, { passed: number; total: number }>();
  results.forEach(r => {
    const stat = sectorStats.get(r.sector) || { passed: 0, total: 0 };
    stat.total++;
    if (r.passed) stat.passed++;
    sectorStats.set(r.sector, stat);
  });

  console.log(`PASS RATE: ${passCount}/100 (${passRate}%)`);
  console.log(`EXECUTION TIME: ${executionTime} seconds\n`);

  console.log('SECTOR BREAKDOWN:');
  const sectorOrder = [
    'Technology', 'Financials', 'Real Estate', 'Healthcare', 'Consumer',
    'Energy', 'Utilities', 'Industrials', 'Materials', 'Communication'
  ];

  sectorOrder.forEach(sector => {
    const stat = sectorStats.get(sector);
    if (stat) {
      const sectorPassRate = ((stat.passed / stat.total) * 100).toFixed(0);
      console.log(`- ${sector}: ${stat.passed}/${stat.total} (${sectorPassRate}%)`);
    }
  });

  // List failures
  const failures = results.filter(r => !r.passed);
  if (failures.length > 0) {
    console.log('\nFAILURES:');
    failures.forEach((f, idx) => {
      console.log(`${idx + 1}. ${f.symbol} (${f.sector}):`);
      f.issues.forEach(issue => console.log(`   - ${issue}`));
    });

    // Top issues summary
    console.log('\nTOP ISSUES:');
    const issueCategories = {
      nullMethodId: [] as string[],
      missingSectorMethods: [] as string[],
      httpErrors: [] as string[],
      noValidIV: [] as string[],
      wrongMethodCount: [] as string[]
    };

    failures.forEach(f => {
      f.issues.forEach(issue => {
        if (issue.includes('NULL method_id')) issueCategories.nullMethodId.push(f.symbol);
        if (issue.includes('Missing sector methods')) issueCategories.missingSectorMethods.push(f.symbol);
        if (issue.includes('HTTP')) issueCategories.httpErrors.push(f.symbol);
        if (issue.includes('No methods with valid IV')) issueCategories.noValidIV.push(f.symbol);
        if (issue.includes('Methods count')) issueCategories.wrongMethodCount.push(f.symbol);
      });
    });

    if (issueCategories.nullMethodId.length > 0) {
      console.log(`- NULL method_id: ${issueCategories.nullMethodId.length} stocks [${issueCategories.nullMethodId.slice(0, 5).join(', ')}${issueCategories.nullMethodId.length > 5 ? '...' : ''}]`);
    }
    if (issueCategories.missingSectorMethods.length > 0) {
      console.log(`- Missing sector methods: ${issueCategories.missingSectorMethods.length} stocks [${issueCategories.missingSectorMethods.slice(0, 5).join(', ')}${issueCategories.missingSectorMethods.length > 5 ? '...' : ''}]`);
    }
    if (issueCategories.httpErrors.length > 0) {
      console.log(`- HTTP errors: ${issueCategories.httpErrors.length} stocks [${issueCategories.httpErrors.slice(0, 5).join(', ')}${issueCategories.httpErrors.length > 5 ? '...' : ''}]`);
    }
    if (issueCategories.noValidIV.length > 0) {
      console.log(`- No valid IV: ${issueCategories.noValidIV.length} stocks [${issueCategories.noValidIV.slice(0, 5).join(', ')}${issueCategories.noValidIV.length > 5 ? '...' : ''}]`);
    }
    if (issueCategories.wrongMethodCount.length > 0) {
      console.log(`- Wrong method count: ${issueCategories.wrongMethodCount.length} stocks [${issueCategories.wrongMethodCount.slice(0, 5).join(', ')}${issueCategories.wrongMethodCount.length > 5 ? '...' : ''}]`);
    }
  } else {
    console.log('\n✅ ALL GOOD - No failures detected');
  }

  // Exit with appropriate code
  process.exit(passCount >= 95 ? 0 : 1);
}

runValidation().catch(console.error);
