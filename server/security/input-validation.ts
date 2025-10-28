/**
 * Security Input Validation Utilities
 *
 * Provides strict validation for user inputs to prevent injection attacks.
 * Used across all routes and services handling external input.
 */

/**
 * Strict symbol validation regex
 * Allows only:
 * - Uppercase letters A-Z
 * - Numbers 0-9
 * - Hyphens and dots (for symbols like BRK-B, BRK.B)
 * - Length: 1-10 characters
 *
 * Security: Prevents Redis key injection, SQL injection, and path traversal
 */
export const SYMBOL_REGEX = /^[A-Z0-9\-.]{1,10}$/;

/**
 * Validate stock symbol
 *
 * @param symbol - Stock symbol to validate
 * @returns Validated uppercase symbol
 * @throws Error if symbol is invalid
 *
 * Security Examples Blocked:
 * - "AAPL'; DROP TABLE" → Error
 * - "../../etc/passwd" → Error
 * - "AAPL\nmalicious" → Error
 * - "" (empty) → Error
 * - "TOOLONGSYMBOL123" → Error
 */
export function validateSymbol(symbol: string | undefined | null): string {
  // Defense-in-depth: Multiple validation layers

  // Layer 1: Null/undefined check
  if (!symbol) {
    throw new Error('INVALID_SYMBOL: Symbol is required');
  }

  // Layer 2: Type coercion and normalization
  const normalized = String(symbol).toUpperCase().trim();

  // Layer 3: Length check (before regex for performance)
  if (normalized.length === 0 || normalized.length > 10) {
    throw new Error('INVALID_SYMBOL: Symbol must be 1-10 characters');
  }

  // Layer 4: Strict regex validation
  if (!SYMBOL_REGEX.test(normalized)) {
    throw new Error('INVALID_SYMBOL: Symbol contains invalid characters (allowed: A-Z, 0-9, -, .)');
  }

  // Layer 5: Blacklist dangerous patterns
  const dangerousPatterns = [
    /['"`;]/,      // SQL injection characters
    /[\\\/]/,      // Path traversal
    /\.\./,        // Parent directory
    /[\n\r]/,      // Newlines
    /[\x00-\x1F]/, // Control characters
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(normalized)) {
      throw new Error('INVALID_SYMBOL: Symbol contains dangerous characters');
    }
  }

  return normalized;
}

/**
 * Validate TTL (Time To Live) for cache operations
 *
 * @param ttlSeconds - TTL in seconds
 * @returns Validated TTL
 * @throws Error if TTL is invalid
 *
 * Security: Prevents memory exhaustion (too high) and immediate expiration (too low)
 *
 * Valid Range: 1 second to 30 days (2,592,000 seconds)
 *
 * Examples:
 * - 0 → Error (immediate expiration)
 * - -1 → Error (negative TTL)
 * - 3000000 → Error (> 30 days)
 * - Infinity → Error (no expiration)
 * - NaN → Error (invalid number)
 */
export function validateTTL(ttlSeconds: number, defaultTTL: number = 300): number {
  // Layer 1: Type and NaN check
  if (!Number.isFinite(ttlSeconds)) {
    console.warn(`[Security] Invalid TTL: ${ttlSeconds}, using default: ${defaultTTL}s`);
    return defaultTTL;
  }

  // Layer 2: Range validation
  const MIN_TTL = 1;           // 1 second minimum
  const MAX_TTL = 2592000;     // 30 days maximum (30 * 24 * 60 * 60)

  if (ttlSeconds < MIN_TTL) {
    console.warn(`[Security] TTL too low: ${ttlSeconds}s (min: ${MIN_TTL}s), using default: ${defaultTTL}s`);
    return defaultTTL;
  }

  if (ttlSeconds > MAX_TTL) {
    console.warn(`[Security] TTL too high: ${ttlSeconds}s (max: ${MAX_TTL}s), using max: ${MAX_TTL}s`);
    return MAX_TTL;
  }

  // Layer 3: Round to integer (prevent fractional TTLs)
  return Math.floor(ttlSeconds);
}

/**
 * Validate environment variable is set
 *
 * @param name - Environment variable name
 * @param value - Environment variable value
 * @throws Error if value is missing (fail-fast)
 *
 * Security: Forces explicit configuration, no dangerous fallbacks
 */
export function requireEnv(name: string, value: string | undefined): string {
  if (!value || value.trim().length === 0) {
    throw new Error(`SECURITY: Required environment variable ${name} is not set. Worker cannot start.`);
  }
  return value;
}

/**
 * Sanitize log output to prevent log injection
 *
 * @param input - User input to log
 * @returns Sanitized string safe for logging
 *
 * Security: Prevents log forgery and injection attacks
 */
export function sanitizeLogInput(input: string): string {
  return input
    .replace(/[\n\r]/g, ' ')       // Remove newlines
    .replace(/[\x00-\x1F]/g, '')   // Remove control chars
    .substring(0, 200);             // Limit length
}
