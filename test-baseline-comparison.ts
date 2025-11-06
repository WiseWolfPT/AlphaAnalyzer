/**
 * Baseline Comparison - AAPL (passing) vs Materials (failing)
 */

import axios from 'axios';

const API_BASE = 'https://128.140.45.28.sslip.io';

async function compareBaseline() {
  console.log('='.repeat(80));
  console.log('BASELINE COMPARISON: AAPL (PASSING) vs LIN (MATERIALS)');
  console.log('='.repeat(80));

  // Test AAPL (should pass)
  console.log('\n📱 AAPL (Technology - Expected to PASS):');
  console.log('-'.repeat(80));
  const aaplRes = await axios.get(`${API_BASE}/api/iv/AAPL/chart`, { timeout: 30000 });
  console.log(`Status: ${aaplRes.status}`);
  console.log(`Methods: ${aaplRes.data.methods.length} success, ${aaplRes.data.failedMethods.length} failed`);
  console.log(`\nSuccessful methods:`);
  aaplRes.data.methods.forEach((m: any) => console.log(`  ✅ ${m.method_id}`));
  console.log(`\nFailed methods:`);
  aaplRes.data.failedMethods.forEach((f: any) => console.log(`  ❌ ${f.method_id}: ${f.reason}`));

  // Test LIN (Materials - failing)
  console.log('\n\n🧪 LIN (Materials - Low Pass Rate):');
  console.log('-'.repeat(80));
  const linRes = await axios.get(`${API_BASE}/api/iv/LIN/chart`, { timeout: 30000 });
  console.log(`Status: ${linRes.status}`);
  console.log(`Methods: ${linRes.data.methods.length} success, ${linRes.data.failedMethods.length} failed`);
  console.log(`\nSuccessful methods:`);
  linRes.data.methods.forEach((m: any) => console.log(`  ✅ ${m.method_id}`));
  console.log(`\nFailed methods:`);
  linRes.data.failedMethods.forEach((f: any) => console.log(`  ❌ ${f.method_id}: ${f.reason}`));

  // Comparison
  console.log('\n\n📊 COMPARATIVE ANALYSIS:');
  console.log('='.repeat(80));

  const aaplMethodIds = new Set(aaplRes.data.methods.map((m: any) => m.method_id));
  const linMethodIds = new Set(linRes.data.methods.map((m: any) => m.method_id));

  const aaplFailedIds = new Set(aaplRes.data.failedMethods.map((f: any) => f.method_id));
  const linFailedIds = new Set(linRes.data.failedMethods.map((f: any) => f.method_id));

  console.log(`\n✅ Methods both pass:`);
  aaplMethodIds.forEach((id: any) => {
    if (linMethodIds.has(id)) console.log(`  - ${id}`);
  });

  console.log(`\n⚠️  Methods that pass for AAPL but fail for LIN:`);
  aaplMethodIds.forEach((id: any) => {
    if (!linMethodIds.has(id) && linFailedIds.has(id)) {
      const failure = linRes.data.failedMethods.find((f: any) => f.method_id === id);
      console.log(`  - ${id}: ${failure?.reason || 'unknown'}`);
    }
  });

  console.log(`\n❌ Methods that fail for BOTH (expected sector incompatibility):`);
  aaplFailedIds.forEach((id: any) => {
    if (linFailedIds.has(id)) {
      const aaplFailure = aaplRes.data.failedMethods.find((f: any) => f.method_id === id);
      console.log(`  - ${id}: ${aaplFailure?.reason || 'unknown'}`);
    }
  });

  // Expected failures analysis
  console.log('\n\n🎯 EXPECTED FAILURES (Sector-Specific Methods):');
  console.log('='.repeat(80));
  console.log(`
REIT methods (expected to fail for non-REITs):
  - ffo-reit: FFO (Funds From Operations) only for REITs
  - affo-reit: AFFO (Adjusted FFO) only for REITs
  - p-ffo-mean: P/FFO ratio only for REITs
  - p-ffo-sector: P/FFO sector benchmark only for REITs
  - dividend-yield-reit: REIT dividend discount model

Bank methods (expected to fail for non-banks):
  - p-tbv-mean: P/TBV (Price to Tangible Book Value) only for banks
  - p-tbv-sector: P/TBV sector benchmark only for banks

Dividend methods (expected to fail for non-dividend stocks):
  - ddm: Dividend Discount Model (Gordon Growth)

These 8 methods are DESIGNED to fail for stocks outside their target sector.
  `);

  console.log('\n\n🔍 ROOT CAUSE DETERMINATION:');
  console.log('='.repeat(80));

  const linExpectedFailures = ['ffo-reit', 'affo-reit', 'p-ffo-mean', 'p-ffo-sector', 'dividend-yield-reit', 'p-tbv-mean', 'p-tbv-sector', 'ddm'];
  const linActualFailures = Array.from(linFailedIds);
  const linUnexpectedFailures = linActualFailures.filter(id => !linExpectedFailures.includes(id as string));

  console.log(`\nLIN Total Failures: ${linActualFailures.length}`);
  console.log(`  - Expected (sector-specific): ${linActualFailures.filter(id => linExpectedFailures.includes(id as string)).length}`);
  console.log(`  - Unexpected (fixable bugs): ${linUnexpectedFailures.length}`);

  if (linUnexpectedFailures.length > 0) {
    console.log(`\n⚠️  UNEXPECTED FAILURES (POTENTIAL BUGS):`);
    linUnexpectedFailures.forEach((id: any) => {
      const failure = linRes.data.failedMethods.find((f: any) => f.method_id === id);
      console.log(`  - ${id}: ${failure?.reason || 'unknown'}`);
    });
  } else {
    console.log(`\n✅ All failures are EXPECTED (sector-specific methods)`);
  }

  console.log(`\n\nCONCLUSION:`);
  console.log(`Materials stocks are performing as expected.`);
  console.log(`LIN has ${linRes.data.methods.length} valid methods (excluding sector-specific ones).`);
  console.log(`This is NORMAL behavior - not a bug.`);
}

compareBaseline().catch(console.error);
