/**
 * Symbol Validation Middleware - P0 Security Fix #2
 *
 * Prevents SQL injection, path traversal, and command injection attacks
 * by strictly validating stock symbol format.
 *
 * Security guarantees:
 * - Only alphanumeric, dots, and hyphens allowed
 * - Maximum 10 characters
 * - Automatic normalization (uppercase, trim)
 * - Fast fail on invalid input
 *
 * Usage:
 * ```typescript
 * import { validateSymbol } from './middleware/validate-symbol';
 *
 * const result = validateSymbol(req.params.symbol);
 * if (!result.valid) {
 *   return res.status(400).json({ error: result.error });
 * }
 * const safeSymbol = result.sanitized;
 * ```
 */

import { logger } from '../lib/logger';

/**
 * Symbol validation result
 */
export interface SymbolValidationResult {
  valid: boolean;
  sanitized?: string;
  error?: string;
}

/**
 * Strict regex for stock symbols:
 * - A-Z (uppercase letters)
 * - 0-9 (numbers)
 * - . (dots, for European markets like EDP.LS)
 * - - (hyphens, for class shares like BRK-B)
 * - Length: 1-10 characters
 *
 * This EXCLUDES dangerous characters:
 * - Quotes (single and double)
 * - SQL operators (semicolon, dashes, slashes, asterisks)
 * - Path traversal (forward and back slashes)
 * - Command injection (pipes, ampersands, dollar signs, backticks, angle brackets, newlines, tabs)
 * - NoSQL operators (braces and brackets)
 * - Whitespace (except trimmed at edges)
 */
const SYMBOL_REGEX = /^[A-Z0-9\-.]{1,10}$/;

/**
 * Validate and sanitize stock symbol
 *
 * @param symbol - Raw symbol input (from user)
 * @returns Validation result with sanitized symbol or error
 */
export function validateSymbol(symbol: any): SymbolValidationResult {
  // Type safety: reject non-string types before coercion
  if (typeof symbol !== 'string') {
    logger.warn('[Security] Non-string symbol rejected', {
      type: typeof symbol,
      value: String(symbol).substring(0, 20)
    });

    return {
      valid: false,
      error: 'Symbol must be a string'
    };
  }

  // Check for control characters BEFORE trimming (detect hidden chars)
  if (/[\x00-\x1F\x7F]/.test(symbol)) {
    logger.warn('[Security] Control characters in symbol rejected', {
      input: symbol.substring(0, 20)
    });

    return {
      valid: false,
      error: 'Invalid symbol format'
    };
  }

  // Normalize: trim whitespace and uppercase
  const trimmed = symbol.toUpperCase().trim();

  // Check if empty after trimming
  if (!trimmed) {
    return {
      valid: false,
      error: 'Symbol is required'
    };
  }

  // Strict format validation
  if (!SYMBOL_REGEX.test(trimmed)) {
    logger.warn('[Security] Invalid symbol format rejected', {
      input: symbol.substring(0, 20), // Log only first 20 chars to avoid log injection
      reason: 'Failed regex validation'
    });

    return {
      valid: false,
      error: 'Invalid symbol format'
    };
  }

  // Additional security checks (defense in depth)

  // Reject if contains null bytes (path traversal variant)
  if (trimmed.includes('\x00')) {
    logger.warn('[Security] Null byte in symbol rejected', {
      input: symbol.substring(0, 20)
    });

    return {
      valid: false,
      error: 'Invalid symbol format'
    };
  }

  // Reject SQL comment patterns (-- or /* or #)
  if (/--|\/\*|\*\/|#/.test(trimmed)) {
    logger.warn('[Security] SQL comment pattern in symbol rejected', {
      input: symbol.substring(0, 20)
    });

    return {
      valid: false,
      error: 'Invalid symbol format'
    };
  }

  // Success: return sanitized symbol
  return {
    valid: true,
    sanitized: trimmed
  };
}

/**
 * Express middleware for symbol validation
 *
 * Usage:
 * ```typescript
 * app.get('/api/stock/:symbol', validateSymbolMiddleware, handler);
 * ```
 */
export function validateSymbolMiddleware(req: any, res: any, next: any): void {
  const symbol = req.params.symbol || req.query.symbol || req.body.symbol;

  if (!symbol) {
    return res.status(400).json({
      error: 'INVALID_SYMBOL',
      message: 'Symbol is required'
    });
  }

  const result = validateSymbol(symbol);

  if (!result.valid) {
    return res.status(400).json({
      error: 'INVALID_SYMBOL',
      message: result.error
    });
  }

  // Replace with sanitized version
  if (req.params.symbol) req.params.symbol = result.sanitized;
  if (req.query.symbol) req.query.symbol = result.sanitized;
  if (req.body.symbol) req.body.symbol = result.sanitized;

  next();
}

/**
 * Validate array of symbols (for batch operations)
 *
 * @param symbols - Array of raw symbols
 * @returns Validation result with sanitized symbols or errors
 */
export function validateSymbols(symbols: any[]): {
  valid: boolean;
  sanitized?: string[];
  errors?: Array<{ symbol: string; error: string }>;
} {
  if (!Array.isArray(symbols)) {
    return {
      valid: false,
      errors: [{ symbol: String(symbols), error: 'Expected array of symbols' }]
    };
  }

  if (symbols.length === 0) {
    return {
      valid: false,
      errors: [{ symbol: '', error: 'At least one symbol required' }]
    };
  }

  if (symbols.length > 100) {
    return {
      valid: false,
      errors: [{ symbol: '', error: 'Maximum 100 symbols per request' }]
    };
  }

  const sanitized: string[] = [];
  const errors: Array<{ symbol: string; error: string }> = [];

  for (const symbol of symbols) {
    const result = validateSymbol(symbol);

    if (result.valid && result.sanitized) {
      sanitized.push(result.sanitized);
    } else {
      errors.push({
        symbol: String(symbol).substring(0, 20),
        error: result.error || 'Invalid symbol'
      });
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, sanitized };
}
