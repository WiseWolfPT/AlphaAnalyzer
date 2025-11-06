/**
 * APD Specific Investigation - "Insufficient historical data" error
 */

import axios from 'axios';

const API_BASE = 'https://128.140.45.28.sslip.io';
const FMP_API_KEY = process.env.FMP_API_KEY || '';

async function investigateAPD() {
  console.log('='.repeat(80));
  console.log('APD (Air Products & Chemicals) - "Insufficient Data" Investigation');
  console.log('='.repeat(80));

  // 1. Get IV chart response
  console.log('\n1️⃣  IV Chart Response:');
  console.log('-'.repeat(80));
  const ivRes = await axios.get(`${API_BASE}/api/iv/APD/chart`, { timeout: 30000 });
  console.log(`Status: ${ivRes.status}`);
  console.log(`Methods: ${ivRes.data.methods.length} success, ${ivRes.data.failedMethods.length} failed`);

  console.log(`\n✅ Successful:`);
  ivRes.data.methods.forEach((m: any) => console.log(`  - ${m.method_id}`));

  console.log(`\n❌ Failed:`);
  ivRes.data.failedMethods.forEach((f: any) => console.log(`  - ${f.method_id}: ${f.reason}`));

  // 2. Check FMP historical ratios
  console.log('\n\n2️⃣  FMP Historical Ratios (5Y):');
  console.log('-'.repeat(80));
  const ratiosUrl = `https://financialmodelingprep.com/api/v3/ratios/APD?period=annual&limit=5&apikey=${FMP_API_KEY}`;
  const ratiosRes = await axios.get(ratiosUrl, { timeout: 10000 });
  console.log(`Retrieved ${ratiosRes.data.length} years of ratio data`);

  if (ratiosRes.data.length > 0) {
    console.log(`\nYears available:`);
    ratiosRes.data.forEach((r: any, i: number) => {
      console.log(`  ${i + 1}. ${r.date} (${r.period})`);
    });

    console.log(`\nP/E Ratios:`);
    ratiosRes.data.forEach((r: any) => {
      console.log(`  ${r.date}: ${r.priceEarningsRatio?.toFixed(2) || 'NULL'}`);
    });

    console.log(`\nP/B Ratios:`);
    ratiosRes.data.forEach((r: any) => {
      console.log(`  ${r.date}: ${r.priceToBookRatio?.toFixed(2) || 'NULL'}`);
    });

    console.log(`\nP/S Ratios:`);
    ratiosRes.data.forEach((r: any) => {
      console.log(`  ${r.date}: ${r.priceToSalesRatio?.toFixed(2) || 'NULL'}`);
    });
  }

  // 3. Check balance sheet availability
  console.log('\n\n3️⃣  Balance Sheet Availability:');
  console.log('-'.repeat(80));
  const bsUrl = `https://financialmodelingprep.com/api/v3/balance-sheet-statement/APD?period=annual&limit=5&apikey=${FMP_API_KEY}`;
  const bsRes = await axios.get(bsUrl, { timeout: 10000 });
  console.log(`Retrieved ${bsRes.data.length} years of balance sheet data`);

  if (bsRes.data.length > 0) {
    console.log(`\nYears available:`);
    bsRes.data.forEach((bs: any, i: number) => {
      console.log(`  ${i + 1}. ${bs.date} - Total Assets: ${(bs.totalAssets / 1e9).toFixed(2)}B`);
    });
  }

  // 4. Check cash flow availability
  console.log('\n\n4️⃣  Cash Flow Availability:');
  console.log('-'.repeat(80));
  const cfUrl = `https://financialmodelingprep.com/api/v3/cash-flow-statement/APD?period=annual&limit=5&apikey=${FMP_API_KEY}`;
  const cfRes = await axios.get(cfUrl, { timeout: 10000 });
  console.log(`Retrieved ${cfRes.data.length} years of cash flow data`);

  if (cfRes.data.length > 0) {
    console.log(`\nYears available:`);
    cfRes.data.forEach((cf: any, i: number) => {
      console.log(`  ${i + 1}. ${cf.date} - FCF: ${(cf.freeCashFlow / 1e9).toFixed(2)}B`);
    });
  }

  // 5. Check FMP DCF endpoint
  console.log('\n\n5️⃣  FMP DCF Endpoint (used by dcf-fcf-20):');
  console.log('-'.repeat(80));
  try {
    const dcfUrl = `https://financialmodelingprep.com/api/v3/discounted-cash-flow/APD?apikey=${FMP_API_KEY}`;
    const dcfRes = await axios.get(dcfUrl, { timeout: 10000 });
    console.log(`Response: ${JSON.stringify(dcfRes.data, null, 2)}`);
  } catch (error: any) {
    console.log(`❌ Error: ${error.message}`);
  }

  // 6. Check FMP Advanced DCF endpoint
  console.log('\n\n6️⃣  FMP Advanced DCF Endpoint (used by dcf-terminal-fcf):');
  console.log('-'.repeat(80));
  try {
    const advDcfUrl = `https://financialmodelingprep.com/api/v4/advanced_discounted_cash_flow?symbol=APD&apikey=${FMP_API_KEY}`;
    const advDcfRes = await axios.get(advDcfUrl, { timeout: 10000 });
    console.log(`Response length: ${JSON.stringify(advDcfRes.data).length} chars`);
    if (Array.isArray(advDcfRes.data) && advDcfRes.data.length > 0) {
      console.log(`Years of projections: ${advDcfRes.data.length}`);
    } else {
      console.log(`⚠️  Empty or non-array response`);
    }
  } catch (error: any) {
    console.log(`❌ Error: ${error.message}`);
  }

  // DIAGNOSIS
  console.log('\n\n🔍 DIAGNOSIS:');
  console.log('='.repeat(80));
  console.log(`
If APD shows:
  - 5+ years of ratios available → Historical multiple methods SHOULD work
  - 5+ years of balance sheet → AlfaValue SHOULD work
  - Empty FMP DCF response → dcf-fcf-20 failure is EXPECTED (API data gap)
  - Empty Advanced DCF → dcf-terminal-fcf failure is EXPECTED (API data gap)

Root Cause:
  - If historical ratios exist but methods fail → CALCULATION BUG (fixable)
  - If FMP DCF endpoints empty → API DATA GAP (accept limitation)
  `);
}

investigateAPD().catch(console.error);
