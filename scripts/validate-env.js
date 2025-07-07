#!/usr/bin/env node

// Wave 4: Environment Validation Script
// Ensures all required environment variables are present for different deployment scenarios

const fs = require('fs');
const path = require('path');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Environment variable requirements by deployment type
const envRequirements = {
  development: {
    required: [
      'NODE_ENV',
      'PORT'
    ],
    optional: [
      'FINNHUB_API_KEY',
      'ALPHA_VANTAGE_API_KEY',
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY'
    ],
    description: 'Development environment - minimal requirements'
  },
  
  production: {
    required: [
      // Core
      'NODE_ENV',
      'PORT',
      
      // Database
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_KEY',
      'DATABASE_URL',
      
      // Financial APIs (at least one required)
      'FINNHUB_API_KEY',
      
      // Security
      'JWT_SECRET',
      'ALLOWED_ORIGINS',
      
      // Frontend build
      'VITE_BACKEND_URL'
    ],
    optional: [
      'ALPHA_VANTAGE_API_KEY',
      'FMP_API_KEY',
      'TWELVE_DATA_API_KEY',
      'POLYGON_API_KEY',
      'OPENAI_API_KEY',
      'STRIPE_SECRET_KEY',
      'REDIS_URL',
      'SENTRY_AUTH_TOKEN',
      'VITE_SENTRY_DSN',
      'VITE_GA_MEASUREMENT_ID'
    ],
    description: 'Production environment - full requirements'
  },
  
  testing: {
    required: [
      'NODE_ENV',
      'JWT_SECRET'
    ],
    optional: [
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY'
    ],
    description: 'Testing environment - minimal for CI/CD'
  }
};

// Security checks
const securityChecks = [
  {
    name: 'API Keys not using demo values',
    check: (env) => {
      const demoValues = ['demo', 'test', 'your-key-here', 'sk_test_'];
      const apiKeys = [
        'FINNHUB_API_KEY',
        'ALPHA_VANTAGE_API_KEY', 
        'FMP_API_KEY',
        'TWELVE_DATA_API_KEY',
        'POLYGON_API_KEY',
        'OPENAI_API_KEY'
      ];
      
      for (const key of apiKeys) {
        if (env[key] && demoValues.some(demo => env[key].includes(demo))) {
          return { pass: false, message: `${key} appears to be using a demo/test value` };
        }
      }
      return { pass: true };
    }
  },
  
  {
    name: 'JWT Secret minimum length',
    check: (env) => {
      if (env.JWT_SECRET && env.JWT_SECRET.length < 32) {
        return { pass: false, message: 'JWT_SECRET should be at least 32 characters long' };
      }
      return { pass: true };
    }
  },
  
  {
    name: 'No VITE_ prefix on server-side secrets',
    check: (env) => {
      const serverSecrets = [
        'SUPABASE_SERVICE_KEY',
        'FINNHUB_API_KEY',
        'ALPHA_VANTAGE_API_KEY',
        'FMP_API_KEY',
        'TWELVE_DATA_API_KEY',
        'POLYGON_API_KEY',
        'OPENAI_API_KEY',
        'STRIPE_SECRET_KEY',
        'JWT_SECRET'
      ];
      
      for (const secret of serverSecrets) {
        if (env[secret] && secret.startsWith('VITE_')) {
          return { pass: false, message: `${secret} should not have VITE_ prefix (exposes to client)` };
        }
      }
      return { pass: true };
    }
  },
  
  {
    name: 'Production URLs use HTTPS',
    check: (env) => {
      if (env.NODE_ENV === 'production') {
        const urlVars = ['VITE_SUPABASE_URL', 'VITE_BACKEND_URL', 'DATABASE_URL'];
        for (const urlVar of urlVars) {
          if (env[urlVar] && !env[urlVar].startsWith('https://') && !env[urlVar].startsWith('postgresql://')) {
            return { pass: false, message: `${urlVar} should use HTTPS in production` };
          }
        }
      }
      return { pass: true };
    }
  }
];

// Load environment variables
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  const env = { ...process.env };
  
  // Load .env file if it exists
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    const lines = envFile.split('\n');
    
    for (const line of lines) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const [, key, value] = match;
        env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
      }
    }
  }
  
  return env;
}

// Validate environment
function validateEnvironment(envType = 'development') {
  console.log(`${colors.cyan}🔍 Validating ${envType} environment...${colors.reset}\n`);
  
  const env = loadEnv();
  const requirements = envRequirements[envType];
  
  if (!requirements) {
    console.log(`${colors.red}❌ Unknown environment type: ${envType}${colors.reset}`);
    return false;
  }
  
  console.log(`${colors.blue}📋 ${requirements.description}${colors.reset}\n`);
  
  let hasErrors = false;
  let hasWarnings = false;
  
  // Check required variables
  console.log(`${colors.green}Required variables:${colors.reset}`);
  for (const variable of requirements.required) {
    if (!env[variable]) {
      console.log(`  ${colors.red}❌ ${variable} - MISSING (required)${colors.reset}`);
      hasErrors = true;
    } else {
      console.log(`  ${colors.green}✅ ${variable} - OK${colors.reset}`);
    }
  }
  
  // Check optional variables
  console.log(`\n${colors.yellow}Optional variables:${colors.reset}`);
  for (const variable of requirements.optional) {
    if (!env[variable]) {
      console.log(`  ${colors.yellow}⚠️  ${variable} - Not set (optional)${colors.reset}`);
      hasWarnings = true;
    } else {
      console.log(`  ${colors.green}✅ ${variable} - OK${colors.reset}`);
    }
  }
  
  // Run security checks
  console.log(`\n${colors.magenta}Security checks:${colors.reset}`);
  for (const check of securityChecks) {
    const result = check.check(env);
    if (result.pass) {
      console.log(`  ${colors.green}✅ ${check.name}${colors.reset}`);
    } else {
      console.log(`  ${colors.red}❌ ${check.name} - ${result.message}${colors.reset}`);
      hasErrors = true;
    }
  }
  
  // Financial API availability check
  console.log(`\n${colors.blue}Financial API providers:${colors.reset}`);
  const apis = [
    { name: 'Finnhub', key: 'FINNHUB_API_KEY', priority: 'primary' },
    { name: 'Alpha Vantage', key: 'ALPHA_VANTAGE_API_KEY', priority: 'secondary' },
    { name: 'FMP', key: 'FMP_API_KEY', priority: 'optional' },
    { name: 'Twelve Data', key: 'TWELVE_DATA_API_KEY', priority: 'optional' },
    { name: 'Polygon', key: 'POLYGON_API_KEY', priority: 'optional' }
  ];
  
  let hasApiProvider = false;
  for (const api of apis) {
    if (env[api.key]) {
      console.log(`  ${colors.green}✅ ${api.name} (${api.priority})${colors.reset}`);
      hasApiProvider = true;
    } else {
      console.log(`  ${colors.yellow}⚠️  ${api.name} (${api.priority}) - Not configured${colors.reset}`);
    }
  }
  
  if (!hasApiProvider && envType === 'production') {
    console.log(`  ${colors.red}❌ At least one financial API provider is required for production${colors.reset}`);
    hasErrors = true;
  }
  
  // Summary
  console.log(`\n${colors.cyan}📊 Validation Summary:${colors.reset}`);
  if (hasErrors) {
    console.log(`${colors.red}❌ Validation failed - Missing required environment variables${colors.reset}`);
    console.log(`${colors.yellow}💡 Copy .env.example to .env and fill in the required values${colors.reset}`);
    return false;
  } else if (hasWarnings) {
    console.log(`${colors.yellow}⚠️  Validation passed with warnings - Some optional variables are missing${colors.reset}`);
    console.log(`${colors.green}✅ Environment is ready for ${envType}${colors.reset}`);
    return true;
  } else {
    console.log(`${colors.green}✅ All checks passed - Environment is fully configured for ${envType}${colors.reset}`);
    return true;
  }
}

// Main execution
if (require.main === module) {
  const envType = process.argv[2] || process.env.NODE_ENV || 'development';
  const isValid = validateEnvironment(envType);
  process.exit(isValid ? 0 : 1);
}

module.exports = { validateEnvironment, loadEnv };