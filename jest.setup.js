/**
 * Jest Setup File
 * Configures test environment for security tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-security-tests';
process.env.ALPHA_VANTAGE_API_KEY = 'test-alpha-vantage-key';
process.env.FINNHUB_API_KEY = 'test-finnhub-key';
process.env.FMP_API_KEY = 'test-fmp-key';
process.env.TWELVE_DATA_API_KEY = 'test-twelve-data-key';

// Database configuration for tests
process.env.DATABASE_URL = ':memory:'; // SQLite in-memory for tests

// Security configuration for tests
process.env.CSRF_SECRET = 'test-csrf-secret';
process.env.SESSION_SECRET = 'test-session-secret';

// API configuration for tests
process.env.CORS_ORIGIN = 'http://localhost:3000,https://alfalyzer.vercel.app';

// Rate limiting configuration (relaxed for tests)
process.env.RATE_LIMIT_WINDOW_MS = '60000'; // 1 minute
process.env.RATE_LIMIT_MAX = '100';
process.env.RATE_LIMIT_MAX_AUTH = '500';
process.env.RATE_LIMIT_MAX_FINANCIAL = '10';

// Increase timeout for longer tests
jest.setTimeout(30000);

// Mock fetch for API calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    headers: new Headers(),
  })
);

// Mock WebSocket connections
jest.mock('ws', () => ({
  WebSocketServer: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn()
  }))
}));

// Global test cleanup
afterEach(() => {
  jest.clearAllMocks();
});

// Global error handling for tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Console logging control
if (process.env.JEST_VERBOSE !== 'true') {
  global.console = {
    ...console,
    log: jest.fn(), // Mock console.log
    debug: jest.fn(), // Mock console.debug
    info: jest.fn(), // Mock console.info
    warn: jest.fn(), // Keep warnings
    error: jest.fn() // Keep errors for debugging
  };
}