/**
 * AGENT 14: Intrinsic Value Validator
 *
 * Defense-in-depth validation layer for all valuation methods.
 * Ensures NO method can return negative or invalid intrinsic values.
 *
 * Design Principles:
 * 1. Fail-safe: Invalid values → null (never negative)
 * 2. Comprehensive: Validates isFinite, sign, reasonableness
 * 3. Observable: Logs all rejections for debugging
 * 4. Configurable: Thresholds can be adjusted per use case
 */

import { logger } from '../lib/logger';

/**
 * Validation configuration with sensible defaults
 */
export interface IVValidationConfig {
  /** Reject negative values (default: true) */
  rejectNegative: boolean;

  /** Reject zero values (default: true) */
  rejectZero: boolean;

  /** Maximum IV as multiple of current price (default: 100x) */
  maxPriceMultiple: number;

  /** Minimum IV as fraction of current price (default: 0.001 = 0.1%) */
  minPriceFraction: number;

  /** Enable warning logs for suspicious values (default: true) */
  enableWarnings: boolean;
}

const DEFAULT_CONFIG: IVValidationConfig = {
  rejectNegative: true,
  rejectZero: true,
  maxPriceMultiple: 100,
  minPriceFraction: 0.001,
  enableWarnings: true,
};

/**
 * Validation result with detailed reasoning
 */
export interface IVValidationResult {
  /** Whether the value passed validation */
  isValid: boolean;

  /** Sanitized value (null if invalid) */
  value: number | null;

  /** Reason for rejection (if invalid) */
  reason?: string;

  /** Severity of issue (if any) */
  severity?: 'ERROR' | 'WARNING';
}

/**
 * Validate an intrinsic value calculation result
 *
 * @param methodName Name of valuation method (e.g., "DDM", "DCF-20 FCF")
 * @param symbol Stock ticker symbol
 * @param value Calculated IV value to validate
 * @param currentPrice Current market price for reasonableness checks
 * @param config Optional validation configuration
 * @returns Validation result with sanitized value
 *
 * @example
 * ```typescript
 * const result = validateIVResult('DDM', 'AAPL', -50.00, 180.00);
 * if (!result.isValid) {
 *   logger.error(`Rejected IV: ${result.reason}`);
 *   return null;
 * }
 * return result.value;
 * ```
 */
export function validateIVResult(
  methodName: string,
  symbol: string,
  value: number | null,
  currentPrice: number,
  config: Partial<IVValidationConfig> = {}
): IVValidationResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Rule 0: Null is always valid (method not applicable)
  if (value === null) {
    return {
      isValid: true,
      value: null,
    };
  }

  // Rule 1: Must be finite (not NaN or Infinity)
  if (!isFinite(value)) {
    const reason = `Non-finite IV value: ${value}`;
    logger.error(`[IV Validator] ${symbol}.${methodName} - ${reason}`);

    return {
      isValid: false,
      value: null,
      reason,
      severity: 'ERROR',
    };
  }

  // Rule 2: Negative values are ALWAYS invalid
  if (cfg.rejectNegative && value < 0) {
    const reason = `Negative IV value: ${value.toFixed(2)}`;
    logger.error(`[IV Validator] ${symbol}.${methodName} - ${reason}`);

    return {
      isValid: false,
      value: null,
      reason,
      severity: 'ERROR',
    };
  }

  // Rule 3: Zero values typically indicate calculation failure
  if (cfg.rejectZero && value === 0) {
    const reason = 'IV value is exactly zero (likely calculation error)';
    logger.warn(`[IV Validator] ${symbol}.${methodName} - ${reason}`);

    return {
      isValid: false,
      value: null,
      reason,
      severity: 'WARNING',
    };
  }

  // Rule 4: Sanity check - extremely high values (>100x price)
  if (value > currentPrice * cfg.maxPriceMultiple) {
    const multiple = (value / currentPrice).toFixed(1);
    const reason = `Unrealistic IV: $${value.toFixed(2)} (${multiple}x price of $${currentPrice.toFixed(2)})`;

    if (cfg.enableWarnings) {
      logger.warn(`[IV Validator] ${symbol}.${methodName} - ${reason}`);
    }

    // Don't reject, but flag for review
    return {
      isValid: true,
      value,
      reason,
      severity: 'WARNING',
    };
  }

  // Rule 5: Sanity check - extremely low values (<0.1% of price)
  if (value > 0 && value < currentPrice * cfg.minPriceFraction) {
    const percent = ((value / currentPrice) * 100).toFixed(3);
    const reason = `Suspiciously low IV: $${value.toFixed(2)} (${percent}% of price $${currentPrice.toFixed(2)})`;

    if (cfg.enableWarnings) {
      logger.warn(`[IV Validator] ${symbol}.${methodName} - ${reason}`);
    }

    // Don't reject, but flag for review
    return {
      isValid: true,
      value,
      reason,
      severity: 'WARNING',
    };
  }

  // All checks passed
  return {
    isValid: true,
    value,
  };
}

/**
 * Validate input value before calculation (pre-validation)
 *
 * @param paramName Parameter name (e.g., "FCF", "EPS", "dividend")
 * @param value Value to validate
 * @param options Validation options
 * @returns True if value is valid for calculation
 *
 * @example
 * ```typescript
 * if (!validateInput('EPS', eps, { allowNegative: false })) {
 *   return null; // Cannot calculate with negative EPS
 * }
 * ```
 */
export function validateInput(
  paramName: string,
  value: number | null | undefined,
  options: {
    allowNegative?: boolean;
    allowZero?: boolean;
    min?: number;
    max?: number;
  } = {}
): boolean {
  // Check for null/undefined
  if (value === null || value === undefined) {
    return false;
  }

  // Check if finite
  if (!isFinite(value)) {
    return false;
  }

  // Check negativity
  if (!options.allowNegative && value < 0) {
    return false;
  }

  // Check zero
  if (!options.allowZero && value === 0) {
    return false;
  }

  // Check min/max bounds
  if (options.min !== undefined && value < options.min) {
    return false;
  }

  if (options.max !== undefined && value > options.max) {
    return false;
  }

  return true;
}

/**
 * Batch validate multiple IV results
 *
 * @param results Array of method results to validate
 * @param currentPrice Current market price
 * @returns Array with invalid results converted to null
 */
export function validateBatchResults(
  results: Array<{
    methodName: string;
    symbol: string;
    value: number | null;
  }>,
  currentPrice: number
): Array<number | null> {
  return results.map((r) => {
    const result = validateIVResult(r.methodName, r.symbol, r.value, currentPrice);
    return result.isValid ? result.value : null;
  });
}

/**
 * Calculate percentage difference between IV and current price
 *
 * @param iv Intrinsic value
 * @param currentPrice Current market price
 * @returns Percentage difference (positive = undervalued, negative = overvalued)
 */
export function calculateUpside(iv: number, currentPrice: number): number {
  if (currentPrice <= 0) return 0;
  return ((iv - currentPrice) / currentPrice) * 100;
}

/**
 * Format IV result for display
 *
 * @param value IV value (can be null)
 * @param precision Decimal places (default: 2)
 * @returns Formatted string
 */
export function formatIV(value: number | null, precision: number = 2): string {
  if (value === null) return 'N/A';
  return `$${value.toFixed(precision)}`;
}
