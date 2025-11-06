#!/usr/bin/env node
/**
 * AGENT 16: Sector Endpoints Validation Script
 *
 * Tests all 4 sector API endpoints and validates responses.
 */

import axios from 'axios';

const BASE_URL = process.env.TARGET_URL || 'http://localhost:3001';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

async function testEndpoint(name, url, validators) {
  try {
    const startTime = Date.now();
    const response = await axios.get(url);
    const latency = Date.now() - startTime;

    log(colors.cyan, `\n  Testing: ${name}`);
    log(colors.yellow, `  URL: ${url}`);
    log(colors.yellow, `  Latency: ${latency}ms`);

    // Validate response
    for (const validator of validators) {
      try {
        validator(response.data);
        log(colors.green, `    ✓ ${validator.name}`);
      } catch (error) {
        log(colors.red, `    ✗ ${validator.name}: ${error.message}`);
        return false;
      }
    }

    log(colors.green, '  ✓ All validations passed');
    return true;
  } catch (error) {
    log(colors.red, `  ✗ Request failed: ${error.message}`);
    return false;
  }
}

// Validators
const validators = {
  hasTotal: function hasTotal(data) {
    if (!data.total) throw new Error('Missing total field');
    if (data.total !== 11) throw new Error(`Expected 11 sectors, got ${data.total}`);
  },

  hasSectors: function hasSectors(data) {
    if (!Array.isArray(data.sectors)) throw new Error('sectors is not an array');
    if (data.sectors.length === 0) throw new Error('sectors array is empty');
  },

  hasSectorMetadata: function hasSectorMetadata(data) {
    const sector = data.sectors[0];
    const required = ['id', 'name', 'description', 'icon', 'color', 'stockCount'];
    for (const field of required) {
      if (!(field in sector)) throw new Error(`Missing field: ${field}`);
    }
  },

  hasStockCounts: function hasStockCounts(data) {
    const totalStocks = data.sectors.reduce((sum, s) => sum + s.stockCount, 0);
    if (totalStocks < 400) throw new Error(`Expected >400 stocks, got ${totalStocks}`);
  },

  hasSectorDetails: function hasSectorDetails(data) {
    const required = ['id', 'name', 'description', 'stockCount', 'industries', 'topStocks'];
    for (const field of required) {
      if (!(field in data)) throw new Error(`Missing field: ${field}`);
    }
  },

  hasIndustries: function hasIndustries(data) {
    if (!Array.isArray(data.industries)) throw new Error('industries is not an array');
    if (data.industries.length === 0) throw new Error('No industries found');
    const industry = data.industries[0];
    if (!industry.name || !industry.stockCount) {
      throw new Error('Invalid industry structure');
    }
  },

  hasTopStocks: function hasTopStocks(data) {
    if (!Array.isArray(data.topStocks)) throw new Error('topStocks is not an array');
    if (data.topStocks.length === 0) throw new Error('No top stocks found');
  },

  hasPaginationData: function hasPaginationData(data) {
    const required = ['sector', 'page', 'limit', 'total', 'totalPages', 'stocks'];
    for (const field of required) {
      if (!(field in data)) throw new Error(`Missing field: ${field}`);
    }
  },

  hasStockData: function hasStockData(data) {
    if (!Array.isArray(data.stocks)) throw new Error('stocks is not an array');
    if (data.stocks.length === 0) throw new Error('No stocks returned');
    const stock = data.stocks[0];
    if (!stock.symbol || !stock.companyName) {
      throw new Error('Invalid stock structure');
    }
  },

  hasDistributionData: function hasDistributionData(data) {
    if (!data.totalStocks) throw new Error('Missing totalStocks');
    if (!Array.isArray(data.distribution)) throw new Error('distribution is not an array');
  },

  hasDistributionMetrics: function hasDistributionMetrics(data) {
    const item = data.distribution[0];
    const required = ['sector', 'count', 'percentage', 'color'];
    for (const field of required) {
      if (!(field in item)) throw new Error(`Missing field: ${field}`);
    }
  },
};

async function main() {
  log(colors.bold + colors.cyan, '='.repeat(70));
  log(colors.bold + colors.cyan, 'AGENT 16: Sector Endpoints Validation');
  log(colors.bold + colors.cyan, '='.repeat(70));
  log(colors.yellow, `\nTarget: ${BASE_URL}`);

  const tests = [
    {
      name: 'GET /api/sectors (List all sectors)',
      url: `${BASE_URL}/api/sectors`,
      validators: [
        validators.hasTotal,
        validators.hasSectors,
        validators.hasSectorMetadata,
        validators.hasStockCounts,
      ],
    },
    {
      name: 'GET /api/sectors/:sectorId (Tech sector details)',
      url: `${BASE_URL}/api/sectors/information-technology`,
      validators: [
        validators.hasSectorDetails,
        validators.hasIndustries,
        validators.hasTopStocks,
      ],
    },
    {
      name: 'GET /api/sectors/:sectorId/stocks (Paginated stocks)',
      url: `${BASE_URL}/api/sectors/information-technology/stocks?page=1&limit=10`,
      validators: [
        validators.hasPaginationData,
        validators.hasStockData,
      ],
    },
    {
      name: 'GET /api/sectors/distribution (Chart data)',
      url: `${BASE_URL}/api/sectors/distribution`,
      validators: [
        validators.hasDistributionData,
        validators.hasDistributionMetrics,
      ],
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const success = await testEndpoint(test.name, test.url, test.validators);
    if (success) {
      passed++;
    } else {
      failed++;
    }
  }

  // Summary
  log(colors.bold + colors.cyan, '\n' + '='.repeat(70));
  log(colors.bold + colors.cyan, 'SUMMARY');
  log(colors.bold + colors.cyan, '='.repeat(70));
  log(colors.green, `✓ Passed: ${passed}/${tests.length}`);
  if (failed > 0) {
    log(colors.red, `✗ Failed: ${failed}/${tests.length}`);
  }

  if (failed === 0) {
    log(colors.bold + colors.green, '\n✅ All tests passed! Sector endpoints are working correctly.');
  } else {
    log(colors.bold + colors.red, '\n❌ Some tests failed. Please check the errors above.');
    process.exit(1);
  }
}

main();
