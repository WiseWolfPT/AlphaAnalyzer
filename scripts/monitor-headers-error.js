#!/usr/bin/env node

/**
 * Headers Error Monitoring Script
 * Monitors server logs for ERR_HTTP_HEADERS_SENT errors
 */

import axios from 'axios';
import { spawn } from 'child_process';
import chalk from 'chalk';
import notifier from 'node-notifier';

const MONITORING_INTERVAL = 5000; // Check every 5 seconds
const API_URL = process.env.API_URL || 'http://localhost:3001';
const KOYEB_APP_NAME = process.env.KOYEB_APP_NAME || 'alfalyzer';

// Statistics
const stats = {
  startTime: Date.now(),
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  headersErrors: 0,
  lastError: null,
  uptime: 100
};

// Color logging
const log = {
  info: (msg) => console.log(chalk.blue(`[INFO] ${msg}`)),
  success: (msg) => console.log(chalk.green(`[SUCCESS] ${msg}`)),
  warning: (msg) => console.log(chalk.yellow(`[WARNING] ${msg}`)),
  error: (msg) => console.log(chalk.red(`[ERROR] ${msg}`)),
  stats: (msg) => console.log(chalk.cyan(`[STATS] ${msg}`))
};

// Check for headers errors in response
function checkForHeadersError(error) {
  const errorMessage = error?.message || '';
  const responseData = error?.response?.data || {};
  
  return (
    errorMessage.includes('HEADERS_SENT') ||
    errorMessage.includes('headers after they are sent') ||
    responseData.error?.includes('headers') ||
    responseData.message?.includes('headers')
  );
}

// Make test requests
async function makeTestRequest() {
  stats.totalRequests++;
  
  try {
    const response = await axios.get(`${API_URL}/api/health`, {
      timeout: 3000,
      headers: {
        'X-Monitor-Test': 'headers-check'
      }
    });
    
    stats.successfulRequests++;
    return { success: true, data: response.data };
  } catch (error) {
    stats.failedRequests++;
    
    if (checkForHeadersError(error)) {
      stats.headersErrors++;
      stats.lastError = {
        time: new Date().toISOString(),
        message: error.message,
        url: error.config?.url
      };
      
      // Alert on headers error
      log.error(`HEADERS ERROR DETECTED! Count: ${stats.headersErrors}`);
      notifier.notify({
        title: 'Headers Error Alert',
        message: `ERR_HTTP_HEADERS_SENT detected! Count: ${stats.headersErrors}`,
        sound: true
      });
      
      return { success: false, headersError: true, error: error.message };
    }
    
    return { success: false, error: error.message };
  }
}

// Monitor Koyeb logs (if Koyeb CLI is available)
async function monitorKoyebLogs() {
  try {
    const koyeb = spawn('koyeb', ['logs', KOYEB_APP_NAME, '--follow'], {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    koyeb.stdout.on('data', (data) => {
      const log = data.toString();
      if (log.includes('HEADERS_SENT') || log.includes('headers after they are sent')) {
        stats.headersErrors++;
        log.error(`Headers error found in Koyeb logs! Total: ${stats.headersErrors}`);
      }
    });
    
    koyeb.stderr.on('data', (data) => {
      log.warning(`Koyeb CLI stderr: ${data}`);
    });
    
  } catch (error) {
    log.info('Koyeb CLI not available - monitoring via HTTP only');
  }
}

// Stress test with concurrent requests
async function stressTest() {
  log.info('Running stress test with 10 concurrent requests...');
  
  const promises = Array(10).fill(null).map(() => makeTestRequest());
  const results = await Promise.allSettled(promises);
  
  const headersErrors = results.filter(r => 
    r.status === 'fulfilled' && r.value.headersError
  ).length;
  
  if (headersErrors > 0) {
    log.error(`Stress test found ${headersErrors} headers errors!`);
  } else {
    log.success('Stress test completed without headers errors');
  }
}

// Calculate and display statistics
function displayStats() {
  const runtime = Math.floor((Date.now() - stats.startTime) / 1000);
  const successRate = stats.totalRequests > 0 
    ? ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(2)
    : 0;
  
  stats.uptime = stats.totalRequests > 0
    ? ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(2)
    : 100;
  
  console.clear();
  console.log(chalk.bold.white('\n🔍 Headers Error Monitor\n'));
  console.log(chalk.white('─'.repeat(50)));
  
  log.stats(`Runtime: ${runtime}s`);
  log.stats(`Total Requests: ${stats.totalRequests}`);
  log.stats(`Successful: ${stats.successfulRequests}`);
  log.stats(`Failed: ${stats.failedRequests}`);
  log.stats(`Success Rate: ${successRate}%`);
  
  console.log(chalk.white('─'.repeat(50)));
  
  if (stats.headersErrors > 0) {
    log.error(`Headers Errors Detected: ${stats.headersErrors}`);
    if (stats.lastError) {
      log.error(`Last Error: ${stats.lastError.time}`);
      log.error(`Message: ${stats.lastError.message}`);
    }
  } else {
    log.success('No headers errors detected ✓');
  }
  
  console.log(chalk.white('─'.repeat(50)));
  console.log(chalk.gray('Press Ctrl+C to stop monitoring\n'));
}

// Main monitoring loop
async function monitor() {
  // Initial test
  log.info(`Starting headers error monitoring for ${API_URL}`);
  await makeTestRequest();
  
  // Start Koyeb log monitoring
  monitorKoyebLogs();
  
  // Run stress test every minute
  setInterval(stressTest, 60000);
  
  // Regular monitoring
  setInterval(async () => {
    await makeTestRequest();
    displayStats();
  }, MONITORING_INTERVAL);
  
  // Initial display
  displayStats();
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n');
  log.info('Shutting down monitor...');
  
  // Final report
  if (stats.headersErrors > 0) {
    log.error(`Total headers errors detected: ${stats.headersErrors}`);
    log.error('Action required: Check server middleware configuration');
  } else {
    log.success('No headers errors detected during monitoring session');
  }
  
  process.exit(0);
});

// Start monitoring
monitor().catch(error => {
  log.error(`Monitor failed to start: ${error.message}`);
  process.exit(1);
});