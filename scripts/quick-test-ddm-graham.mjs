/**
 * Quick test of DDM and Graham Number for JNJ
 */

import { valuationService } from '../server/services/valuation-service.js';

console.log('\n=== Testing JNJ (Johnson & Johnson) ===\n');

try {
  console.log('[1] Testing Graham Number...');
  const graham = await valuationService.calculateGrahamNumber('JNJ');

  if (graham) {
    console.log('✅ Graham Number Success!');
    console.log(`   IV: $${graham.iv.toFixed(2)}`);
    console.log(`   Current Price: $${graham.currentPrice.toFixed(2)}`);
    console.log(`   EPS: $${graham.eps.toFixed(2)}`);
    console.log(`   BVPS: $${graham.bookValuePerShare.toFixed(2)}`);
    console.log(`   Confidence: ${graham.confidence}`);
  } else {
    console.log('❌ Graham Number returned null');
  }
} catch (e) {
  console.log('❌ Graham Number error:', e.message);
}

console.log('\n[2] Testing DDM...');
try {
  const ddm = await valuationService.calculateDDM('JNJ');

  if (ddm) {
    console.log('✅ DDM Success!');
    console.log(`   IV: $${ddm.iv.toFixed(2)}`);
    console.log(`   Current Price: $${ddm.currentPrice.toFixed(2)}`);
    console.log(`   Annual Dividend: $${ddm.annualDividend.toFixed(2)}`);
    console.log(`   Div Growth Rate: ${(ddm.dividendGrowthRate * 100).toFixed(2)}%`);
    console.log(`   Payout Ratio: ${(ddm.payoutRatio * 100).toFixed(1)}%`);
    console.log(`   Confidence: ${ddm.confidence}`);
    if (ddm.warning) {
      console.log(`   ⚠️ Warning: ${ddm.warning}`);
    }
  } else {
    console.log('❌ DDM returned null');
  }
} catch (e) {
  console.log('❌ DDM error:', e.message);
}

console.log('\n✅ Test complete!\n');
