import { Router } from 'express';

const router = Router();

// Helper to mask API keys for security
function maskApiKey(key: string | undefined): string {
  if (!key) return 'NOT_FOUND';
  if (key === 'demo' || key === 'YOUR_API_KEY_HERE') return 'PLACEHOLDER';
  if (key.length < 8) return 'INVALID';
  return `${key.substring(0, 4)}...${key.substring(key.length - 4)} (${key.length} chars)`;
}

// Test individual API providers using fetch instead of axios
async function testAlphaVantage(apiKey: string): Promise<any> {
  const startTime = Date.now();
  try {
    const response = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=${apiKey}`,
      { signal: AbortSignal.timeout(10000) }
    );
    
    const latency = Date.now() - startTime;
    const data = await response.json();
    
    if (data['Error Message']) {
      return { 
        status: 'error', 
        httpStatus: response.status,
        message: data['Error Message'],
        latencyMs: latency,
        hint: 'Check if API key is valid'
      };
    }
    if (data.Note) {
      return { 
        status: 'rate_limited', 
        httpStatus: response.status,
        message: data.Note,
        latencyMs: latency,
        hint: 'You have exceeded the rate limit'
      };
    }
    if (data['Global Quote']) {
      const quote = data['Global Quote'];
      return { 
        status: 'success', 
        httpStatus: response.status,
        data: {
          symbol: quote['01. symbol'],
          price: quote['05. price'],
          change: quote['09. change']
        },
        latencyMs: latency
      };
    }
    return { 
      status: 'unknown', 
      httpStatus: response.status,
      data: JSON.stringify(data).substring(0, 100),
      latencyMs: latency
    };
  } catch (error: any) {
    return { 
      status: 'failed', 
      error: error.message,
      latencyMs: Date.now() - startTime,
      hint: 'Check network connectivity'
    };
  }
}

async function testFinnhub(apiKey: string): Promise<any> {
  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=AAPL&token=${apiKey}`,
      { signal: AbortSignal.timeout(5000) }
    );
    const data = await response.json();
    
    if (data && data.c !== undefined) {
      return { status: 'success', data: `Price: ${data.c}` };
    }
    return { status: 'unknown', data };
  } catch (error: any) {
    return { status: 'failed', error: error.message };
  }
}

async function testFMP(apiKey: string): Promise<any> {
  try {
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/quote/AAPL?apikey=${apiKey}`,
      { signal: AbortSignal.timeout(5000) }
    );
    const data = await response.json();
    
    if (data && Array.isArray(data) && data.length > 0) {
      return { status: 'success', data: `Price: ${data[0].price}` };
    }
    if (data['Error Message']) {
      return { status: 'error', message: data['Error Message'] };
    }
    return { status: 'unknown', data };
  } catch (error: any) {
    return { status: 'failed', error: error.message };
  }
}

// Main diagnostic endpoint
router.get('/', async (req, res) => {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    platform: process.platform,
    nodeVersion: process.version,
    
    // Koyeb specific checks
    koyebInfo: {
      IS_KOYEB: !!process.env.KOYEB_SERVICE_NAME,
      KOYEB_SERVICE_NAME: process.env.KOYEB_SERVICE_NAME || 'NOT_ON_KOYEB',
      KOYEB_SERVICE_ID: process.env.KOYEB_SERVICE_ID || 'NOT_ON_KOYEB',
      KOYEB_APP_NAME: process.env.KOYEB_APP_NAME || 'NOT_ON_KOYEB',
      KOYEB_REGION: process.env.KOYEB_REGION || 'NOT_ON_KOYEB'
    },
    
    // Environment variables check
    envVars: {
      PORT: process.env.PORT || 'NOT_SET',
      NODE_ENV: process.env.NODE_ENV || 'NOT_SET',
      CORS_ORIGIN: process.env.CORS_ORIGIN || 'NOT_SET',
      
      // API Keys (masked for security)
      ALPHA_VANTAGE_API_KEY: maskApiKey(process.env.ALPHA_VANTAGE_API_KEY),
      FINNHUB_API_KEY: maskApiKey(process.env.FINNHUB_API_KEY),
      FMP_API_KEY: maskApiKey(process.env.FMP_API_KEY),
      
      // Database
      DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT_SET',
      
      // Supabase
      SUPABASE_URL: process.env.SUPABASE_URL || 'NOT_SET',
      SUPABASE_ANON_KEY: maskApiKey(process.env.SUPABASE_ANON_KEY),
      SUPABASE_SERVICE_KEY: maskApiKey(process.env.SUPABASE_SERVICE_KEY),
    },
    
    // API Tests (will be populated)
    apiTests: {} as any,
    
    // Summary
    summary: {
      totalEnvVars: 0,
      configuredApis: [] as string[],
      workingApis: [] as string[],
      failedApis: [] as string[],
      recommendations: [] as string[],
      criticalIssues: [] as string[]
    }
  };

  // Count configured environment variables
  const envVarKeys = Object.keys(diagnostics.envVars);
  diagnostics.summary.totalEnvVars = envVarKeys.filter(
    key => diagnostics.envVars[key as keyof typeof diagnostics.envVars] !== 'NOT_SET' && 
           diagnostics.envVars[key as keyof typeof diagnostics.envVars] !== 'NOT_FOUND'
  ).length;

  // Test each API if configured
  const apiTests = [];

  if (process.env.ALPHA_VANTAGE_API_KEY) {
    diagnostics.summary.configuredApis.push('Alpha Vantage');
    apiTests.push(
      testAlphaVantage(process.env.ALPHA_VANTAGE_API_KEY).then(result => {
        diagnostics.apiTests.alphaVantage = result;
        if (result.status === 'success') {
          diagnostics.summary.workingApis.push('Alpha Vantage');
        } else {
          diagnostics.summary.failedApis.push('Alpha Vantage');
        }
      })
    );
  }

  if (process.env.FINNHUB_API_KEY) {
    diagnostics.summary.configuredApis.push('Finnhub');
    apiTests.push(
      testFinnhub(process.env.FINNHUB_API_KEY).then(result => {
        diagnostics.apiTests.finnhub = result;
        if (result.status === 'success') {
          diagnostics.summary.workingApis.push('Finnhub');
        } else {
          diagnostics.summary.failedApis.push('Finnhub');
        }
      })
    );
  }

  if (process.env.FMP_API_KEY) {
    diagnostics.summary.configuredApis.push('FMP');
    apiTests.push(
      testFMP(process.env.FMP_API_KEY).then(result => {
        diagnostics.apiTests.fmp = result;
        if (result.status === 'success') {
          diagnostics.summary.workingApis.push('FMP');
        } else {
          diagnostics.summary.failedApis.push('FMP');
        }
      })
    );
  }

  // Wait for all API tests to complete
  await Promise.all(apiTests);

  // Add recommendations based on findings
  const recommendations = [];
  
  if (diagnostics.summary.configuredApis.length === 0) {
    recommendations.push('No API keys are configured. Please set environment variables on Koyeb.');
  }
  
  if (diagnostics.summary.failedApis.length > 0) {
    recommendations.push(`The following APIs failed: ${diagnostics.summary.failedApis.join(', ')}`);
  }
  
  if (!process.env.DATABASE_URL) {
    recommendations.push('DATABASE_URL is not set. Database operations will fail.');
  }
  
  if (process.env.NODE_ENV !== 'production' && req.hostname !== 'localhost') {
    recommendations.push('NODE_ENV should be set to "production" on Koyeb.');
  }

  diagnostics.summary.recommendations = recommendations;

  // Send response
  res.json(diagnostics);
});

// Simpler health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    koyeb: !!process.env.KOYEB_SERVICE_NAME
  });
});

// Ultra-simple test to check if the backend can make external requests
router.get('/test-connectivity', async (req, res) => {
  const tests = [];
  
  // Test Yahoo Finance (no API key needed)
  try {
    const yahooStart = Date.now();
    const yahooResponse = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/AAPL', {
      signal: AbortSignal.timeout(5000)
    });
    const yahooLatency = Date.now() - yahooStart;
    const yahooData = await yahooResponse.json();
    
    tests.push({
      service: 'Yahoo Finance',
      status: yahooResponse.ok ? 'success' : 'failed',
      latencyMs: yahooLatency,
      data: yahooData?.chart?.result?.[0]?.meta?.regularMarketPrice || null
    });
  } catch (error: any) {
    tests.push({
      service: 'Yahoo Finance',
      status: 'error',
      error: error.message
    });
  }
  
  // Test Google (simple connectivity check)
  try {
    const googleStart = Date.now();
    const googleResponse = await fetch('https://www.google.com/robots.txt', {
      signal: AbortSignal.timeout(3000)
    });
    const googleLatency = Date.now() - googleStart;
    
    tests.push({
      service: 'Google',
      status: googleResponse.ok ? 'success' : 'failed',
      latencyMs: googleLatency
    });
  } catch (error: any) {
    tests.push({
      service: 'Google',
      status: 'error',
      error: error.message
    });
  }
  
  const allSuccess = tests.every(t => t.status === 'success');
  
  res.json({
    timestamp: new Date().toISOString(),
    koyeb: !!process.env.KOYEB_SERVICE_NAME,
    tests,
    summary: allSuccess ? 'All connectivity tests passed' : 'Some connectivity tests failed',
    recommendation: allSuccess ? 
      'External connectivity is working. If API calls still fail, check API keys and rate limits.' :
      'External connectivity issues detected. This could be a network/firewall issue on the hosting platform.'
  });
});

export default router;