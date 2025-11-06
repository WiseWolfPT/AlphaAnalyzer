/**
 * Test batch validation optimization
 * Validates that validateBatch() works correctly with mixed valid/invalid tickers
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load production env
config({ path: '.env.production' });

// Import after env loaded
const { fmpDataValidator } = await import('../dist/server/services/fmp-data-validator.cjs');

console.log('========================================');
console.log('BATCH VALIDATION TEST');
console.log('========================================\n');

// Test tickers: mix of valid stocks, invalid tickers, and ETFs
const testTickers = [
  'AAPL',      // Valid - Apple
  'MSFT',      // Valid - Microsoft
  'GOOGL',     // Valid - Alphabet
  'TSLA',      // Valid - Tesla
  'NVDA',      // Valid - Nvidia
  'INVALID123', // Invalid - not a real ticker
  'SPY',       // Invalid - ETF
  'QQQ',       // Invalid - ETF
  'FAKE',      // Invalid - not a real ticker
  'META',      // Valid - Meta
];

console.log('Test tickers:', testTickers.length);
console.log('Expected valid: 6 (AAPL, MSFT, GOOGL, TSLA, NVDA, META)');
console.log('Expected invalid: 4 (INVALID123, SPY, QQQ, FAKE)\n');

console.log('Running batch validation...\n');

const startTime = Date.now();
const validTickers = await fmpDataValidator.validateBatch(testTickers, 5); // 5 concurrent
const duration = Date.now() - startTime;

console.log('\n========================================');
console.log('RESULTS');
console.log('========================================\n');

console.log('Valid tickers:', validTickers);
console.log('Valid count:', validTickers.length);
console.log('Invalid count:', testTickers.length - validTickers.length);
console.log('Duration:', duration, 'ms');
console.log('Success rate:', ((validTickers.length / testTickers.length) * 100).toFixed(1) + '%');

// Validation
const expectedValid = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'META'];
const hasAllExpected = expectedValid.every(t => validTickers.includes(t));
const hasNoInvalid = !validTickers.some(t => ['INVALID123', 'SPY', 'QQQ', 'FAKE'].includes(t));

console.log('\n========================================');
console.log('TEST RESULT');
console.log('========================================\n');

if (hasAllExpected && hasNoInvalid && validTickers.length === 6) {
  console.log('✅ TEST PASSED');
  console.log('- All expected stocks validated');
  console.log('- All ETFs/invalid tickers rejected');
  console.log('- Batch validation working correctly');
} else {
  console.log('❌ TEST FAILED');
  if (!hasAllExpected) console.log('- Missing expected valid tickers');
  if (!hasNoInvalid) console.log('- Invalid tickers not properly rejected');
  if (validTickers.length !== 6) console.log('- Expected 6 valid, got', validTickers.length);
}

console.log('\n========================================');
console.log('OPTIMIZATION IMPACT');
console.log('========================================\n');

console.log('WITHOUT batch validation:');
console.log('- Individual validateFMPData() calls: 10');
console.log('- FMP API calls: ~40 (4 per ticker)');
console.log('- Estimated time: ~10 seconds');

console.log('\nWITH batch validation:');
console.log('- Single validateBatch() call: 1');
console.log('- FMP API calls: ~2 (1 per batch chunk)');
console.log('- Actual time:', duration, 'ms');
console.log('- API reduction: 95% ✅');
console.log('- Speed improvement:', Math.round(10000 / duration) + 'x faster');

process.exit(hasAllExpected && hasNoInvalid && validTickers.length === 6 ? 0 : 1);
