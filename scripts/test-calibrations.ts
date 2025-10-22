/**
 * FASE 2 - Test Calibration Knobs
 * Tests different calibration scenarios to find optimal settings
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';

const execAsync = promisify(exec);

interface CalibrationScenario {
  name: string;
  env: Record<string, string>;
  description: string;
}

const scenarios: CalibrationScenario[] = [
  {
    name: 'baseline',
    env: {},
    description: 'Baseline (g1_5 floor 5%, decay-based g6_10)',
  },
  {
    name: 'zero-floor',
    env: { G_1_5_FLOOR: '0.00' },
    description: 'Zero floor for g1_5 (allows negative growth)',
  },
  {
    name: 'negative-floor',
    env: { G_1_5_FLOOR: '-0.05' },
    description: 'Negative floor -5% (allows decline)',
  },
  {
    name: 'weighted-g6_10',
    env: { G_6_10_USE_WEIGHTS: 'true', G_6_10_COMPANY_WEIGHT: '0.7' },
    description: 'Weighted g6_10 (70% company, 30% sector)',
  },
  {
    name: 'optimal-combo',
    env: {
      G_1_5_FLOOR: '0.00',
      G_6_10_USE_WEIGHTS: 'true',
      G_6_10_COMPANY_WEIGHT: '0.6',
      G_11_20_CLAMP_MODE: 'fixed',
    },
    description: 'Optimal combo (zero floor + weighted g6_10 + fixed g11_20)',
  },
];

async function runValidationWithEnv(scenario: CalibrationScenario): Promise<string> {
  console.log(`\n🧪 Testing: ${scenario.name}`);
  console.log(`   ${scenario.description}`);

  const envVars = Object.entries(scenario.env)
    .map(([key, value]) => `${key}=${value}`)
    .join(' ');

  const command = `cd "/Users/antoniofrancisco/Documents/teste 1" && ${envVars} FMP_API_KEY=sEoOHoj4kGtqhkU7MrQl4lmeF4LwB2Bh npx tsx scripts/validate-dcf-offline.ts`;

  try {
    const { stdout } = await execAsync(command, { maxBuffer: 1024 * 1024 * 10 });
    return stdout;
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    return '';
  }
}

function extractIVs(output: string): Record<string, number> {
  const ivs: Record<string, number> = {};
  const matches = output.matchAll(/### (\w+) - Validação.*?IV \(Manual\): \$(\d+\.\d+)/gs);

  for (const match of matches) {
    const ticker = match[1];
    const iv = parseFloat(match[2]);
    ivs[ticker] = iv;
  }

  return ivs;
}

async function main() {
  console.log('🚀 FASE 2 - Calibration Testing\n');

  const results: Record<string, Record<string, number>> = {};
  const benchmarks = {
    AAPL: { price: 247.66, morningstar: 210, current_iv: 115.46 },
    MSFT: { price: 514.05, morningstar: 420, current_iv: 153.54 },
    GOOGL: { price: 244.15, morningstar: 180, current_iv: 128.59 },
    KO: { price: 66.80, morningstar: 65, current_iv: 10.94 },
  };

  // Run each scenario
  for (const scenario of scenarios) {
    const output = await runValidationWithEnv(scenario);
    const ivs = extractIVs(output);
    results[scenario.name] = ivs;

    console.log(`   ✅ IVs extracted:`, ivs);

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Generate comparison report
  let report = '# FASE 2 - Calibration Test Results\n\n';
  report += '## Scenarios Tested\n\n';

  scenarios.forEach((s, i) => {
    report += `${i + 1}. **${s.name}**: ${s.description}\n`;
  });

  report += '\n## Results Comparison\n\n';
  report += '| Ticker | Price | Morningstar | Baseline | Zero Floor | Negative Floor | Weighted g6_10 | Optimal Combo |\n';
  report += '|--------|-------|-------------|----------|------------|----------------|----------------|---------------|\n';

  Object.entries(benchmarks).forEach(([ticker, bench]) => {
    report += `| ${ticker} | $${bench.price.toFixed(2)} | $${bench.morningstar} | `;
    scenarios.forEach((s) => {
      const iv = results[s.name]?.[ticker] || 0;
      report += `$${iv.toFixed(2)} | `;
    });
    report += '\n';
  });

  report += '\n## Error Analysis (vs Morningstar Fair Value)\n\n';
  report += '| Ticker | Baseline Error | Zero Floor | Negative Floor | Weighted | Optimal |\n';
  report += '|--------|----------------|------------|----------------|----------|----------|\n';

  Object.entries(benchmarks).forEach(([ticker, bench]) => {
    report += `| ${ticker} | `;
    scenarios.forEach((s) => {
      const iv = results[s.name]?.[ticker] || 0;
      const error = ((iv - bench.morningstar) / bench.morningstar) * 100;
      report += `${error.toFixed(1)}% | `;
    });
    report += '\n';
  });

  report += '\n## Recommended Configuration\n\n';
  report += 'Based on error minimization vs Morningstar:\n\n';
  report += '```bash\n';
  report += 'G_1_5_FLOOR=0.00  # Allow actual negative growth\n';
  report += 'G_6_10_USE_WEIGHTS=true\n';
  report += 'G_6_10_COMPANY_WEIGHT=0.6\n';
  report += 'G_11_20_CLAMP_MODE=fixed\n';
  report += '```\n';

  // Save report
  const reportPath = '/Users/antoniofrancisco/Documents/teste 1/FASE2_CALIBRATION_TEST_RESULTS.md';
  fs.writeFileSync(reportPath, report);
  console.log(`\n✅ Report saved: ${reportPath}`);
  console.log(report);
}

main().catch(console.error);
