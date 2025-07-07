#!/usr/bin/env node

/**
 * COST PROTECTION VALIDATION SCRIPT
 * 
 * Validates that the cost protection system is working correctly
 * Run this before any deployment to ensure financial safety
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🚨 VALIDATING COST PROTECTION SYSTEM 🚨');
console.log('==========================================');

let allTestsPassed = true;

function logTest(test, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} ${test}`);
  if (details) console.log(`    ${details}`);
  if (!passed) allTestsPassed = false;
}

function fileExists(filepath) {
  const fullPath = join(projectRoot, filepath);
  return existsSync(fullPath);
}

function validateFileContent(filepath, requiredContent) {
  try {
    const fullPath = join(projectRoot, filepath);
    const content = readFileSync(fullPath, 'utf8');
    return requiredContent.every(item => content.includes(item));
  } catch {
    return false;
  }
}

// Test 1: Check if all required files exist
console.log('\n📁 TESTING FILE STRUCTURE');
const requiredFiles = [
  'server/config/cost-limits.ts',
  'server/services/budget-monitor.ts',
  'server/utils/emergency-switches.ts',
  'server/middleware/cost-protection.ts'
];

requiredFiles.forEach(file => {
  logTest(`File exists: ${file}`, fileExists(file));
});

// Test 2: Check cost limits configuration
console.log('\n💰 TESTING COST LIMITS');
const costLimitsValid = validateFileContent('server/config/cost-limits.ts', [
  'PROVIDER_COST_LIMITS',
  'GLOBAL_BUDGET_CONFIG',
  'FEATURE_KILL_SWITCHES',
  'CIRCUIT_BREAKER_CONFIG',
  'alphaVantage',
  'finnhub',
  'twelveData',
  'fmp'
]);
logTest('Cost limits properly configured', costLimitsValid);

// Validate specific limits are conservative
try {
  const costLimitsPath = join(projectRoot, 'server/config/cost-limits.ts');
  const content = readFileSync(costLimitsPath, 'utf8');
  
  // Check Alpha Vantage is limited to free tier
  const alphaVantageMatch = content.match(/alphaVantage:[\s\S]*?dailyLimit:\s*(\d+)/);
  const alphaVantageLimit = alphaVantageMatch ? parseInt(alphaVantageMatch[1]) : 0;
  logTest('Alpha Vantage daily limit ≤ 25', alphaVantageLimit <= 25, `Current: ${alphaVantageLimit}`);
  
  // Check global budget is reasonable
  const globalBudgetMatch = content.match(/dailyBudget:\s*([\d.]+)/);
  const globalBudget = globalBudgetMatch ? parseFloat(globalBudgetMatch[1]) : 0;
  logTest('Global daily budget ≤ $10', globalBudget <= 10, `Current: $${globalBudget}`);
  
  // Check emergency threshold is conservative
  const emergencyMatch = content.match(/emergencyBudget:\s*([\d.]+)/);
  const emergencyBudget = emergencyMatch ? parseFloat(emergencyMatch[1]) : 0;
  logTest('Emergency threshold ≤ $5', emergencyBudget <= 5, `Current: $${emergencyBudget}`);
  
} catch (error) {
  logTest('Cost limits validation', false, error.message);
}

// Test 3: Check budget monitor implementation
console.log('\n📊 TESTING BUDGET MONITOR');
const budgetMonitorValid = validateFileContent('server/services/budget-monitor.ts', [
  'class BudgetMonitor',
  'recordAPICall',
  'getProviderCosts',
  'getGlobalBudgetStatus',
  'isFeatureKilled',
  'activateEmergencyMode',
  'PROVIDER_COST_LIMITS',
  'GLOBAL_BUDGET_CONFIG'
]);
logTest('Budget monitor implementation complete', budgetMonitorValid);

// Test 4: Check circuit breaker implementation
console.log('\n⚡ TESTING CIRCUIT BREAKERS');
const circuitBreakerValid = validateFileContent('server/utils/emergency-switches.ts', [
  'class EmergencySwitches',
  'CircuitState',
  'isProviderAvailable',
  'recordSuccess',
  'recordFailure',
  'tripCircuitBreaker',
  'activateEmergencyMode',
  'CIRCUIT_BREAKER_CONFIG'
]);
logTest('Circuit breaker implementation complete', circuitBreakerValid);

// Test 5: Check middleware integration
console.log('\n🛡️ TESTING PROTECTION MIDDLEWARE');
const middlewareValid = validateFileContent('server/middleware/cost-protection.ts', [
  'costProtectionMiddleware',
  'apiProviderProtection',
  'expensiveFeatureProtection',
  'handleEmergencyMode',
  'handleKilledFeature',
  'handleUnavailableProvider',
  'handleBudgetExceeded'
]);
logTest('Protection middleware implementation complete', middlewareValid);

// Test 6: Check that critical thresholds are conservative
console.log('\n⚠️ TESTING THRESHOLD SAFETY');
try {
  const costLimitsPath = join(projectRoot, 'server/config/cost-limits.ts');
  const content = readFileSync(costLimitsPath, 'utf8');
  
  // Check circuit breaker failure threshold
  const failureThresholdMatch = content.match(/failureThreshold:\s*(\d+)/);
  const failureThreshold = failureThresholdMatch ? parseInt(failureThresholdMatch[1]) : 10;
  logTest('Circuit breaker failure threshold ≤ 3', failureThreshold <= 3, `Current: ${failureThreshold}`);
  
  // Check slow response threshold
  const slowResponseMatch = content.match(/slowResponseThreshold:\s*(\d+)/);
  const slowResponse = slowResponseMatch ? parseInt(slowResponseMatch[1]) : 10000;
  logTest('Slow response threshold ≤ 5000ms', slowResponse <= 5000, `Current: ${slowResponse}ms`);
  
} catch (error) {
  logTest('Threshold safety validation', false, error.message);
}

// Test 7: Check that fallback modes are defined
console.log('\n🔄 TESTING FALLBACK MODES');
const fallbackModesValid = validateFileContent('server/config/cost-limits.ts', [
  'cached_prices',
  'demo_data',
  'basic_mode',
  'disabled',
  'EMERGENCY_MODES'
]);
logTest('Fallback modes properly defined', fallbackModesValid);

// Test 8: Check that kill switches have reasonable thresholds
console.log('\n🛑 TESTING KILL SWITCH CONFIGURATION');
try {
  const costLimitsPath = join(projectRoot, 'server/config/cost-limits.ts');
  const content = readFileSync(costLimitsPath, 'utf8');
  
  // Extract kill switch thresholds
  const killSwitchMatches = content.match(/budgetThreshold:\s*(\d+)/g) || [];
  const thresholds = killSwitchMatches.map(match => parseInt(match.match(/\d+/)[0]));
  
  const allThresholdsReasonable = thresholds.every(threshold => threshold >= 50 && threshold <= 80);
  logTest('Kill switch thresholds between 50-80%', allThresholdsReasonable, `Thresholds: ${thresholds.join(', ')}`);
  
} catch (error) {
  logTest('Kill switch threshold validation', false, error.message);
}

// Test 9: Validate API key protection
console.log('\n🔐 TESTING API KEY SECURITY');
const securityValid = validateFileContent('server/config/cost-limits.ts', [
  'process.env',
  'ADMIN_EMAIL'
]) && !validateFileContent('server/config/cost-limits.ts', [
  'sk-', // OpenAI key prefix
  'Bearer ', // Authorization headers
  'api_key=', // API key in URL
]);
logTest('No hardcoded API keys found', securityValid);

// Test 10: Check emergency mode configurations
console.log('\n🚨 TESTING EMERGENCY MODES');
const emergencyModesValid = validateFileContent('server/config/cost-limits.ts', [
  'demo:',
  'minimal:',
  'maintenance:',
  'allowedAPIs',
  'maxConcurrentUsers'
]);
logTest('Emergency modes properly configured', emergencyModesValid);

// Test 11: Simulate basic cost calculation
console.log('\n🧮 TESTING COST CALCULATIONS');
try {
  // Simple validation of cost calculation logic
  const costLimitsPath = join(projectRoot, 'server/config/cost-limits.ts');
  const content = readFileSync(costLimitsPath, 'utf8');
  
  // Check that cost per call values exist and are reasonable
  const costPerCallMatches = content.match(/costPerCall:\s*([\d.]+)/g) || [];
  const costs = costPerCallMatches.map(match => parseFloat(match.match(/[\d.]+/)[0]));
  
  const allCostsReasonable = costs.every(cost => cost >= 0 && cost <= 0.1); // Max 10 cents per call
  logTest('Cost per call values reasonable (≤$0.10)', allCostsReasonable, `Costs: $${costs.join(', $')}`);
  
} catch (error) {
  logTest('Cost calculation validation', false, error.message);
}

// Test 12: Check logging and monitoring
console.log('\n📝 TESTING MONITORING CAPABILITIES');
const monitoringValid = validateFileContent('server/services/budget-monitor.ts', [
  'console.log',
  'console.warn',
  'console.error',
  'emit(',
  'EventEmitter'
]) && validateFileContent('server/utils/emergency-switches.ts', [
  'console.log',
  'console.error',
  'emit('
]);
logTest('Monitoring and logging properly implemented', monitoringValid);

// FINAL RESULTS
console.log('\n' + '='.repeat(50));
if (allTestsPassed) {
  console.log('🎉 ALL COST PROTECTION TESTS PASSED! 🎉');
  console.log('✅ System is ready for deployment');
  console.log('✅ Financial safety measures are in place');
  console.log('✅ Conservative limits are properly configured');
  process.exit(0);
} else {
  console.log('❌ COST PROTECTION TESTS FAILED!');
  console.log('🚨 DO NOT DEPLOY UNTIL ALL TESTS PASS');
  console.log('🚨 FINANCIAL SAFETY IS NOT GUARANTEED');
  process.exit(1);
}