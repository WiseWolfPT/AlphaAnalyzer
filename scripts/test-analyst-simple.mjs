/**
 * Simple test for FMP analyst API
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const FMP_API_KEY = process.env.FMP_API_KEY;
const FMP_BASE_URL = 'https://financialmodelingprep.com';

console.log('Testing FMP Analyst Estimates API...\n');
console.log('API Key loaded:', FMP_API_KEY ? `Yes (${FMP_API_KEY.substring(0, 10)}...)` : 'No');

async function test() {
  try {
    const url = `${FMP_BASE_URL}/api/v3/analyst-estimates/AAPL?apikey=${FMP_API_KEY}`;
    console.log('\nCalling:', url.replace(FMP_API_KEY, 'XXX'));

    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'Accept-Encoding': 'gzip',
      },
    });

    console.log('\nSuccess! Status:', response.status);
    console.log('Data length:', response.data.length);
    console.log('\nFirst 5 estimates:');
    response.data.slice(0, 5).forEach((est, idx) => {
      console.log(`  Year ${idx + 1}: $${est.estimatedEpsAvg.toFixed(2)} (${est.numberAnalystsEstimatedEps} analysts)`);
    });

    // Calculate growth (estimates are in reverse chronological order)
    const currentEps = response.data[4].estimatedEpsAvg; // Current year (2025)
    const futureEps = response.data[0].estimatedEpsAvg;  // Future year (2029)
    const currentYear = new Date(response.data[4].date).getFullYear();
    const futureYear = new Date(response.data[0].date).getFullYear();
    const years = futureYear - currentYear;
    const growth = Math.pow(futureEps / currentEps, 1/years) - 1;
    console.log(`\n${years}-Year EPS CAGR: ${(growth * 100).toFixed(2)}%`);
    console.log(`(${currentYear}: $${currentEps.toFixed(2)} → ${futureYear}: $${futureEps.toFixed(2)})`);

  } catch (error) {
    console.error('\nError!');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
  }
}

test();
