/**
 * DCF (Discounted Cash Flow) Calculator
 * Professional implementation for intrinsic value calculation
 * Phase 7: Advanced Features
 */

export interface DCFInputs {
  // Current data
  currentPrice: number;
  sharesOutstanding: number;
  
  // Free Cash Flow data
  freeCashFlow: number; // Current FCF
  fcfHistory?: number[]; // Historical FCF for trend analysis
  
  // Growth assumptions
  growthRate: number; // Growth rate for next 5-10 years (%)
  terminalGrowthRate: number; // Terminal/perpetual growth rate (%)
  projectionYears: number; // Number of years to project (typically 5-10)
  
  // Discount rate
  discountRate: number; // WACC or required rate of return (%)
  
  // Additional metrics
  totalDebt?: number;
  cashAndEquivalents?: number;
  marginOfSafety?: number; // Margin of safety (%)
}

export interface DCFResult {
  // Per share values
  intrinsicValuePerShare: number;
  currentPrice: number;
  
  // Valuation metrics
  upside: number; // Percentage upside/downside
  marginOfSafety: number;
  recommendation: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell';
  
  // Detailed calculations
  projectedCashFlows: number[];
  presentValueOfCashFlows: number;
  terminalValue: number;
  presentValueOfTerminalValue: number;
  enterpriseValue: number;
  equityValue: number;
  
  // Sensitivity analysis
  sensitivityAnalysis?: {
    growthRate: Record<string, number>;
    discountRate: Record<string, number>;
  };
}

/**
 * Calculate intrinsic value using DCF model with Free Cash Flow
 */
export function calculateDCF(inputs: DCFInputs): DCFResult {
  const {
    currentPrice,
    sharesOutstanding,
    freeCashFlow,
    growthRate,
    terminalGrowthRate,
    projectionYears,
    discountRate,
    totalDebt = 0,
    cashAndEquivalents = 0,
    marginOfSafety = 25
  } = inputs;

  // Convert percentages to decimals
  const g = growthRate / 100;
  const tg = terminalGrowthRate / 100;
  const r = discountRate / 100;
  const mos = marginOfSafety / 100;

  // Step 1: Project future cash flows
  const projectedCashFlows: number[] = [];
  let currentFCF = freeCashFlow;
  
  for (let year = 1; year <= projectionYears; year++) {
    currentFCF = currentFCF * (1 + g);
    projectedCashFlows.push(currentFCF);
  }

  // Step 2: Calculate present value of projected cash flows
  let presentValueOfCashFlows = 0;
  for (let year = 1; year <= projectionYears; year++) {
    const discountFactor = Math.pow(1 + r, year);
    presentValueOfCashFlows += projectedCashFlows[year - 1] / discountFactor;
  }

  // Step 3: Calculate terminal value (Gordon Growth Model)
  const lastProjectedFCF = projectedCashFlows[projectedCashFlows.length - 1];
  const terminalValue = (lastProjectedFCF * (1 + tg)) / (r - tg);
  
  // Step 4: Calculate present value of terminal value
  const terminalDiscountFactor = Math.pow(1 + r, projectionYears);
  const presentValueOfTerminalValue = terminalValue / terminalDiscountFactor;

  // Step 5: Calculate enterprise value
  const enterpriseValue = presentValueOfCashFlows + presentValueOfTerminalValue;

  // Step 6: Calculate equity value (Enterprise Value - Debt + Cash)
  const equityValue = enterpriseValue - totalDebt + cashAndEquivalents;

  // Step 7: Calculate intrinsic value per share
  const intrinsicValuePerShare = equityValue / sharesOutstanding;

  // Step 8: Apply margin of safety
  const intrinsicValueWithMoS = intrinsicValuePerShare * (1 - mos);

  // Step 9: Calculate upside/downside
  const upside = ((intrinsicValuePerShare - currentPrice) / currentPrice) * 100;

  // Step 10: Generate recommendation
  let recommendation: DCFResult['recommendation'];
  if (upside > 50) {
    recommendation = 'Strong Buy';
  } else if (upside > 20) {
    recommendation = 'Buy';
  } else if (upside > -10) {
    recommendation = 'Hold';
  } else if (upside > -30) {
    recommendation = 'Sell';
  } else {
    recommendation = 'Strong Sell';
  }

  // Step 11: Sensitivity analysis (optional)
  const sensitivityAnalysis = calculateSensitivity(
    inputs,
    intrinsicValuePerShare
  );

  return {
    intrinsicValuePerShare,
    currentPrice,
    upside,
    marginOfSafety: ((intrinsicValuePerShare - currentPrice) / intrinsicValuePerShare) * 100,
    recommendation,
    projectedCashFlows,
    presentValueOfCashFlows,
    terminalValue,
    presentValueOfTerminalValue,
    enterpriseValue,
    equityValue,
    sensitivityAnalysis
  };
}

/**
 * Perform sensitivity analysis on key variables
 */
function calculateSensitivity(
  baseInputs: DCFInputs,
  baseIntrinsicValue: number
): DCFResult['sensitivityAnalysis'] {
  const growthRateSensitivity: Record<string, number> = {};
  const discountRateSensitivity: Record<string, number> = {};

  // Test different growth rates (-2% to +2%)
  for (let delta = -2; delta <= 2; delta += 0.5) {
    const adjustedGrowth = baseInputs.growthRate + delta;
    if (adjustedGrowth > 0 && adjustedGrowth < 30) {
      const result = calculateDCF({
        ...baseInputs,
        growthRate: adjustedGrowth
      });
      growthRateSensitivity[`${adjustedGrowth.toFixed(1)}%`] = result.intrinsicValuePerShare;
    }
  }

  // Test different discount rates (-2% to +2%)
  for (let delta = -2; delta <= 2; delta += 0.5) {
    const adjustedDiscount = baseInputs.discountRate + delta;
    if (adjustedDiscount > 5 && adjustedDiscount < 20) {
      const result = calculateDCF({
        ...baseInputs,
        discountRate: adjustedDiscount
      });
      discountRateSensitivity[`${adjustedDiscount.toFixed(1)}%`] = result.intrinsicValuePerShare;
    }
  }

  return {
    growthRate: growthRateSensitivity,
    discountRate: discountRateSensitivity
  };
}

/**
 * Calculate Weighted Average Cost of Capital (WACC)
 * Simplified version for demonstration
 */
export function calculateWACC(
  marketCap: number,
  totalDebt: number,
  costOfEquity: number, // Required return for equity holders (%)
  costOfDebt: number, // Interest rate on debt (%)
  taxRate: number = 21 // Corporate tax rate (%)
): number {
  const totalValue = marketCap + totalDebt;
  const equityWeight = marketCap / totalValue;
  const debtWeight = totalDebt / totalValue;
  
  const afterTaxCostOfDebt = costOfDebt * (1 - taxRate / 100);
  
  return (equityWeight * costOfEquity) + (debtWeight * afterTaxCostOfDebt);
}

/**
 * Estimate growth rate based on historical data
 */
export function estimateGrowthRate(historicalFCF: number[]): number {
  if (historicalFCF.length < 2) return 0;

  // Calculate year-over-year growth rates
  const growthRates: number[] = [];
  for (let i = 1; i < historicalFCF.length; i++) {
    if (historicalFCF[i - 1] > 0) {
      const growth = ((historicalFCF[i] - historicalFCF[i - 1]) / historicalFCF[i - 1]) * 100;
      growthRates.push(growth);
    }
  }

  if (growthRates.length === 0) return 0;

  // Calculate average growth rate
  const avgGrowth = growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;

  // Cap growth rate at reasonable levels
  return Math.min(Math.max(avgGrowth, -20), 30);
}

/**
 * Calculate multiple DCF scenarios
 */
export interface DCFScenario {
  name: string;
  inputs: Partial<DCFInputs>;
  result?: DCFResult;
}

export function calculateDCFScenarios(
  baseInputs: DCFInputs,
  scenarios: DCFScenario[]
): DCFScenario[] {
  return scenarios.map(scenario => ({
    ...scenario,
    result: calculateDCF({
      ...baseInputs,
      ...scenario.inputs
    })
  }));
}

/**
 * Default DCF scenarios for analysis
 */
export const DEFAULT_DCF_SCENARIOS: Omit<DCFScenario, 'result'>[] = [
  {
    name: 'Conservative',
    inputs: {
      growthRate: 5,
      terminalGrowthRate: 2,
      discountRate: 12,
      marginOfSafety: 30
    }
  },
  {
    name: 'Base Case',
    inputs: {
      growthRate: 10,
      terminalGrowthRate: 3,
      discountRate: 10,
      marginOfSafety: 25
    }
  },
  {
    name: 'Optimistic',
    inputs: {
      growthRate: 15,
      terminalGrowthRate: 4,
      discountRate: 8,
      marginOfSafety: 20
    }
  }
];

/**
 * Format large numbers for display
 */
export function formatLargeNumber(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1e12) {
    return `${sign}$${(absValue / 1e12).toFixed(2)}T`;
  } else if (absValue >= 1e9) {
    return `${sign}$${(absValue / 1e9).toFixed(2)}B`;
  } else if (absValue >= 1e6) {
    return `${sign}$${(absValue / 1e6).toFixed(2)}M`;
  } else if (absValue >= 1e3) {
    return `${sign}$${(absValue / 1e3).toFixed(2)}K`;
  } else {
    return `${sign}$${absValue.toFixed(2)}`;
  }
}

/**
 * Validate DCF inputs
 */
export function validateDCFInputs(inputs: Partial<DCFInputs>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!inputs.freeCashFlow || inputs.freeCashFlow <= 0) {
    errors.push('Free Cash Flow must be positive');
  }

  if (!inputs.sharesOutstanding || inputs.sharesOutstanding <= 0) {
    errors.push('Shares outstanding must be positive');
  }

  if (inputs.growthRate !== undefined && (inputs.growthRate < -50 || inputs.growthRate > 100)) {
    errors.push('Growth rate must be between -50% and 100%');
  }

  if (inputs.terminalGrowthRate !== undefined && (inputs.terminalGrowthRate < 0 || inputs.terminalGrowthRate > 5)) {
    errors.push('Terminal growth rate should be between 0% and 5%');
  }

  if (inputs.discountRate !== undefined && (inputs.discountRate < 5 || inputs.discountRate > 30)) {
    errors.push('Discount rate should be between 5% and 30%');
  }

  if (inputs.projectionYears !== undefined && (inputs.projectionYears < 3 || inputs.projectionYears > 20)) {
    errors.push('Projection years should be between 3 and 20');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}