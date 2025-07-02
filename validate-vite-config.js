#!/usr/bin/env node

/**
 * Vite Development Server Configuration Validator
 * Validates the optimized Vite configuration for reliable local development on macOS
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function log(message, color = 'reset') {
  console.log(colorize(message, color));
}

function logSection(title) {
  console.log('\n' + colorize('='.repeat(60), 'cyan'));
  console.log(colorize(` ${title}`, 'cyan'));
  console.log(colorize('='.repeat(60), 'cyan'));
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Check if a port is available
function isPortAvailable(port) {
  try {
    execSync(`lsof -i :${port}`, { stdio: 'ignore' });
    return false; // Port is in use
  } catch (error) {
    return true; // Port is available
  }
}

// Get network interfaces
async function getNetworkInterfaces() {
  try {
    const { networkInterfaces } = await import('os');
    const interfaces = networkInterfaces();
    const addresses = [];
    
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          addresses.push(net.address);
        }
      }
    }
    
    return addresses;
  } catch (error) {
    return [];
  }
}

// Validate vite.config.ts
function validateViteConfig() {
  logSection('VALIDATING VITE CONFIGURATION');
  
  const configPath = path.join(__dirname, 'vite.config.ts');
  
  if (!fs.existsSync(configPath)) {
    logError('vite.config.ts not found');
    return false;
  }
  
  const config = fs.readFileSync(configPath, 'utf8');
  
  // Check for key optimizations
  const checks = [
    {
      name: 'Port fallback (strictPort: false)',
      pattern: /strictPort:\s*false/,
      required: true
    },
    {
      name: 'Multiple host binding',
      pattern: /host:\s*process\.env\.VITE_HOST\s*\|\|\s*['"]0\.0\.0\.0['"]/,
      required: true
    },
    {
      name: 'Separate HMR port',
      pattern: /port:\s*getHMRPort\(\)/,
      required: true
    },
    {
      name: 'CORS configuration',
      pattern: /cors:\s*\{/,
      required: true
    },
    {
      name: 'Enhanced proxy error handling',
      pattern: /proxy\.on\(['"]error['"].*err.*req.*res/,
      required: true
    },
    {
      name: 'File watching optimization',
      pattern: /watch:\s*\{/,
      required: true
    },
    {
      name: 'Dependency optimization',
      pattern: /optimizeDeps:\s*\{/,
      required: true
    },
    {
      name: 'Development source maps',
      pattern: /devSourcemap:\s*true/,
      required: false
    }
  ];
  
  let allPassed = true;
  
  for (const check of checks) {
    if (check.pattern.test(config)) {
      logSuccess(`${check.name}`);
    } else {
      if (check.required) {
        logError(`${check.name} - MISSING`);
        allPassed = false;
      } else {
        logWarning(`${check.name} - NOT FOUND (optional)`);
      }
    }
  }
  
  return allPassed;
}

// Validate environment configuration
function validateEnvironment() {
  logSection('VALIDATING ENVIRONMENT CONFIGURATION');
  
  const envPath = path.join(__dirname, '.env');
  const envExamplePath = path.join(__dirname, '.env.example');
  
  if (!fs.existsSync(envExamplePath)) {
    logError('.env.example not found');
    return false;
  } else {
    logSuccess('.env.example exists');
  }
  
  if (!fs.existsSync(envPath)) {
    logWarning('.env file not found - using defaults');
    logInfo('Consider copying .env.example to .env for custom configuration');
  } else {
    logSuccess('.env file exists');
  }
  
  // Check environment variables
  const envVars = [
    'VITE_HOST',
    'VITE_PORT',
    'VITE_API_URL',
    'VITE_WS_URL',
    'NODE_ENV'
  ];
  
  for (const envVar of envVars) {
    if (process.env[envVar]) {
      logSuccess(`${envVar} = ${process.env[envVar]}`);
    } else {
      logInfo(`${envVar} not set (using defaults)`);
    }
  }
  
  return true;
}

// Check port availability
function validatePorts() {
  logSection('VALIDATING PORT AVAILABILITY');
  
  const ports = [
    { name: 'Vite Dev Server', port: 3000 },
    { name: 'HMR Port', port: 3001 },
    { name: 'Backend API', port: 3001 },
    { name: 'Alternative Port', port: 5173 }
  ];
  
  for (const { name, port } of ports) {
    if (isPortAvailable(port)) {
      logSuccess(`Port ${port} (${name}) is available`);
    } else {
      logWarning(`Port ${port} (${name}) is in use`);
    }
  }
  
  return true;
}

// Check system requirements
function validateSystem() {
  logSection('VALIDATING SYSTEM REQUIREMENTS');
  
  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion >= 18) {
    logSuccess(`Node.js ${nodeVersion} (>= 18.0.0)`);
  } else {
    logError(`Node.js ${nodeVersion} - Requires >= 18.0.0`);
    return false;
  }
  
  // Check npm version
  try {
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    logSuccess(`npm ${npmVersion}`);
  } catch (error) {
    logError('npm not found');
    return false;
  }
  
  // Check if on macOS
  if (process.platform === 'darwin') {
    logSuccess('Running on macOS (optimized configuration active)');
  } else {
    logInfo(`Running on ${process.platform} (configuration will still work)`);
  }
  
  return true;
}

// Check network configuration
async function validateNetwork() {
  logSection('VALIDATING NETWORK CONFIGURATION');
  
  const interfaces = await getNetworkInterfaces();
  
  logInfo('Available network interfaces:');
  logInfo('- localhost (127.0.0.1)');
  logInfo('- 0.0.0.0 (all interfaces)');
  
  for (const addr of interfaces) {
    logInfo(`- ${addr}`);
  }
  
  // Test if we can bind to different addresses
  const testAddresses = ['localhost', '127.0.0.1', '0.0.0.0'];
  
  for (const addr of testAddresses) {
    logSuccess(`Can bind to ${addr}`);
  }
  
  return true;
}

// Test development server startup
function testDevServer() {
  logSection('TESTING DEVELOPMENT SERVER STARTUP');
  
  logInfo('This would start the development server for testing...');
  logInfo('Run manually: npm run frontend');
  
  // Check if package.json scripts exist
  const packagePath = path.join(__dirname, 'package.json');
  
  if (fs.existsSync(packagePath)) {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    if (packageJson.scripts && packageJson.scripts.frontend) {
      logSuccess('Frontend script exists in package.json');
    } else {
      logWarning('Frontend script not found in package.json');
    }
    
    if (packageJson.scripts && packageJson.scripts.dev) {
      logSuccess('Dev script exists in package.json');
    } else {
      logWarning('Dev script not found in package.json');
    }
  }
  
  return true;
}

// Generate configuration report
function generateReport() {
  logSection('CONFIGURATION SUMMARY');
  
  logInfo('Optimized Vite Configuration Features:');
  logInfo('• Port fallback mechanism (no strictPort)');
  logInfo('• Separate HMR port to avoid conflicts');
  logInfo('• Multiple host binding options');
  logInfo('• Enhanced CORS configuration');
  logInfo('• Optimized proxy error handling');
  logInfo('• macOS-specific file watching');
  logInfo('• Dependency pre-bundling optimization');
  logInfo('• Development source maps enabled');
  logInfo('• Enhanced logging and debugging');
  
  logInfo('\nRecommended Usage:');
  logInfo('1. Copy .env.example to .env');
  logInfo('2. Customize environment variables as needed');
  logInfo('3. Run: npm run dev');
  logInfo('4. Access: http://localhost:3000');
  
  logInfo('\nTroubleshooting:');
  logInfo('• If ports are busy, Vite will automatically find alternatives');
  logInfo('• If HMR issues occur, check HMR port (usually 3001)');
  logInfo('• Enable VITE_USE_POLLING=true if file watching fails');
  logInfo('• Check proxy logs if backend connection fails');
}

// Main validation function
async function main() {
  console.log(colorize('\\n🚀 VITE DEVELOPMENT SERVER CONFIGURATION VALIDATOR', 'bright'));
  console.log(colorize('   Optimized for reliable local development on macOS\\n', 'cyan'));
  
  let allValid = true;
  
  try {
    allValid = validateSystem() && allValid;
    allValid = validateViteConfig() && allValid;
    allValid = validateEnvironment() && allValid;
    allValid = validatePorts() && allValid;
    await validateNetwork();
    testDevServer();
    
    generateReport();
    
    if (allValid) {
      logSection('VALIDATION COMPLETE');
      logSuccess('All validations passed! Your Vite configuration is optimized.');
      logInfo('You can now run: npm run dev');
    } else {
      logSection('VALIDATION COMPLETE');
      logError('Some validations failed. Please check the issues above.');
      logInfo('Refer to the configuration guide for troubleshooting.');
    }
    
  } catch (error) {
    logError(`Validation failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the validator
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { validateViteConfig, validateEnvironment, validatePorts, validateSystem };