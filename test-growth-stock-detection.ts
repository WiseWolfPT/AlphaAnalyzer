/**
 * Test Growth Stock Detection
 * Validates the isGrowthStock() implementation
 */

import { isGrowthStock, getGrowthStockReason, getGrowthStockDetails } from './server/utils/stock-classifier';

console.log('=== Growth Stock Detection Tests ===\n');

// Test 1: High-growth tech stock (NVDA-like)
console.log('Test 1: High-growth tech stock (NVDA-like)');
const test1 = {
  beta: 1.8,
  epsGrowth: 0.40,  // 40% EPS growth
  revenueGrowth: 0.35,  // 35% revenue growth
  sector: 'Technology'
};
console.log('Input:', test1);
console.log('Is Growth Stock:', isGrowthStock(test1.beta, test1.epsGrowth, test1.revenueGrowth, test1.sector));
console.log('Reason:', getGrowthStockReason(test1.beta, test1.epsGrowth, test1.revenueGrowth, test1.sector));
console.log('');

// Test 2: Moderate growth stock (meets 2 criteria)
console.log('Test 2: Moderate growth stock (meets 2 criteria)');
const test2 = {
  beta: 1.6,
  epsGrowth: 0.22,  // 22% EPS growth
  revenueGrowth: 0.10,  // 10% revenue growth
  sector: 'Consumer Cyclical'
};
console.log('Input:', test2);
console.log('Is Growth Stock:', isGrowthStock(test2.beta, test2.epsGrowth, test2.revenueGrowth, test2.sector));
console.log('Reason:', getGrowthStockReason(test2.beta, test2.epsGrowth, test2.revenueGrowth, test2.sector));
console.log('');

// Test 3: Value stock (fails criteria)
console.log('Test 3: Value stock (fails criteria)');
const test3 = {
  beta: 0.8,
  epsGrowth: 0.05,  // 5% EPS growth
  revenueGrowth: 0.03,  // 3% revenue growth
  sector: 'Utilities'
};
console.log('Input:', test3);
console.log('Is Growth Stock:', isGrowthStock(test3.beta, test3.epsGrowth, test3.revenueGrowth, test3.sector));
console.log('Reason:', getGrowthStockReason(test3.beta, test3.epsGrowth, test3.revenueGrowth, test3.sector));
console.log('');

// Test 4: Tech stock with borderline metrics
console.log('Test 4: Tech stock with borderline metrics (relaxed classification)');
const test4 = {
  beta: 1.3,
  epsGrowth: 0.18,  // 18% EPS growth
  revenueGrowth: 0.13,  // 13% revenue growth
  sector: 'Technology'
};
console.log('Input:', test4);
console.log('Is Growth Stock:', isGrowthStock(test4.beta, test4.epsGrowth, test4.revenueGrowth, test4.sector));
console.log('Reason:', getGrowthStockReason(test4.beta, test4.epsGrowth, test4.revenueGrowth, test4.sector));
console.log('');

// Test 5: Full details for TSLA-like stock
console.log('Test 5: Full details for TSLA-like stock');
const test5 = {
  beta: 2.0,
  epsGrowth: 0.35,  // 35% EPS growth
  revenueGrowth: 0.30,  // 30% revenue growth
  sector: 'Consumer Cyclical'
};
console.log('Input:', test5);
const details = getGrowthStockDetails(test5.beta, test5.epsGrowth, test5.revenueGrowth, test5.sector);
console.log('Full Details:', JSON.stringify(details, null, 2));
console.log('');

// Test 6: Handle null/undefined gracefully
console.log('Test 6: Handle null/undefined sector');
const test6 = {
  beta: 1.7,
  epsGrowth: 0.25,
  revenueGrowth: 0.20,
  sector: undefined
};
console.log('Input:', test6);
console.log('Is Growth Stock:', isGrowthStock(test6.beta, test6.epsGrowth, test6.revenueGrowth, test6.sector));
console.log('Reason:', getGrowthStockReason(test6.beta, test6.epsGrowth, test6.revenueGrowth, test6.sector));
console.log('');

console.log('=== All Tests Complete ===');
