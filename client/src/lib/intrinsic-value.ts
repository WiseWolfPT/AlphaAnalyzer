/**
 * Intrinsic Value Calculation utilities
 * Implements the Adam Khoo method for stock valuation
 */

export interface IntrinsicValueParams {
  eps: number;
  growthRate: number; // as percentage (e.g., 10 for 10%)
  horizon: number; // years
  peMultiple: number;
  requiredReturn: number; // as percentage (e.g., 15 for 15%)
  marginOfSafety: number; // as percentage (e.g., 25 for 25%)
}

export interface IntrinsicValueResult {
  futureEPS: number;
  futurePrice: number;
  presentValue: number;
  intrinsicValue: number;
  deltaPercent: number;
  valuation: 'undervalued' | 'neutral' | 'overvalued';
}

/**
 * Calculate intrinsic value using the Adam Khoo method
 */
export function calculateIntrinsicValue(
  currentPrice: number,
  params: IntrinsicValueParams
): IntrinsicValueResult {
  const {
    eps,
    growthRate,
    horizon,
    peMultiple,
    requiredReturn,
    marginOfSafety
  } = params;

  // Convert percentages to decimals
  const growthRateDecimal = Math.min(growthRate, 20) / 100; // Cap at 20%
  const requiredReturnDecimal = requiredReturn / 100;
  const marginOfSafetyDecimal = marginOfSafety / 100;

  // Step 1: Calculate Future EPS
  // Future EPS = EPS * (1 + growth rate)^years
  const futureEPS = eps * Math.pow(1 + growthRateDecimal, horizon);

  // Step 2: Calculate Future Price
  // Future Price = Future EPS * PE Multiple
  const futurePrice = futureEPS * peMultiple;

  // Step 3: Calculate Present Value
  // Present Value = Future Price / (1 + required return)^years
  const presentValue = futurePrice / Math.pow(1 + requiredReturnDecimal, horizon);

  // Step 4: Calculate Intrinsic Value
  // Intrinsic Value = Present Value * (1 - margin of safety)
  const intrinsicValue = presentValue * (1 - marginOfSafetyDecimal);

  // Step 5: Calculate Delta Percentage
  // Delta % = (Intrinsic Value / Current Price - 1) * 100
  const deltaPercent = (intrinsicValue / currentPrice - 1) * 100;

  // Step 6: Determine Valuation
  let valuation: 'undervalued' | 'neutral' | 'overvalued';
  if (deltaPercent <= -3) {
    valuation = 'undervalued';
  } else if (deltaPercent >= 3) {
    valuation = 'overvalued';
  } else {
    valuation = 'neutral';
  }

  return {
    futureEPS,
    futurePrice,
    presentValue,
    intrinsicValue,
    deltaPercent,
    valuation
  };
}

/**
 * Calculate optimal PE multiple based on growth rate and current PE
 */
export function calculateOptimalPE(
  currentPE: number | null,
  growthRate: number
): number {
  const defaultPE = 15;
  const maxPE = 35;
  
  if (!currentPE) return defaultPE;
  
  // PE should be min of: current PE, 2x growth rate, or 35 (max)
  return Math.min(currentPE, 2 * growthRate, maxPE);
}

/**
 * Validate input parameters for intrinsic value calculation
 */
export function validateIntrinsicValueParams(
  params: Partial<IntrinsicValueParams>
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!params.eps || params.eps <= 0) {
    errors.push("EPS must be a positive number");
  }

  if (params.growthRate !== undefined && (params.growthRate < 0 || params.growthRate > 50)) {
    errors.push("Growth rate must be between 0% and 50%");
  }

  if (params.horizon !== undefined && (params.horizon < 1 || params.horizon > 20)) {
    errors.push("Horizon must be between 1 and 20 years");
  }

  if (params.peMultiple !== undefined && (params.peMultiple <= 0 || params.peMultiple > 100)) {
    errors.push("PE Multiple must be between 0 and 100");
  }

  if (params.requiredReturn !== undefined && (params.requiredReturn < 5 || params.requiredReturn > 30)) {
    errors.push("Required return must be between 5% and 30%");
  }

  if (params.marginOfSafety !== undefined && (params.marginOfSafety < 0 || params.marginOfSafety > 50)) {
    errors.push("Margin of safety must be between 0% and 50%");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get color class for valuation badge
 */
export function getValuationColor(valuation: string): string {
  switch (valuation) {
    case 'undervalued':
      return 'bg-positive text-white';
    case 'overvalued':
      return 'bg-negative text-white';
    case 'neutral':
      return 'bg-neutral text-black';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

/**
 * Get border color class for valuation
 */
export function getValuationBorderColor(valuation: string): string {
  switch (valuation) {
    case 'undervalued':
      return 'border-positive';
    case 'overvalued':
      return 'border-negative';
    case 'neutral':
      return 'border-neutral';
    default:
      return 'border-border';
  }
}

/**
 * Format currency values for display
 */
export function formatCurrency(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format percentage values for display
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

/**
 * Calculate compound annual growth rate (CAGR)
 */
export function calculateCAGR(
  beginningValue: number,
  endingValue: number,
  periods: number
): number {
  return (Math.pow(endingValue / beginningValue, 1 / periods) - 1) * 100;
}

/**
 * Calculate the fair value price target based on intrinsic value
 */
export function calculateFairValueTarget(
  intrinsicValue: number,
  marginOfSafety: number
): number {
  return intrinsicValue / (1 - marginOfSafety / 100);
}
