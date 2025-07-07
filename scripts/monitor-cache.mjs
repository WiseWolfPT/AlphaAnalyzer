#!/usr/bin/env node

/**
 * CACHE MONITORING SCRIPT
 * Real-time monitoring of the cache system performance
 */

import { setTimeout } from 'timers/promises';

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';
const REFRESH_INTERVAL = parseInt(process.env.REFRESH_INTERVAL) || 5000; // 5 seconds

let previousStats = null;

function clearScreen() {
  process.stdout.write('\x1Bc');
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatNumber(num) {
  return new Intl.NumberFormat().format(num);
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

function getChangeIndicator(current, previous) {
  if (!previous) return '';
  const diff = current - previous;
  if (diff > 0) return ` ↗️ (+${diff})`;
  if (diff < 0) return ` ↘️ (${diff})`;
  return ' ➡️';
}

async function fetchCacheStats() {
  try {
    const response = await fetch(`${SERVER_URL}/api/admin/cache/stats`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    return { error: error.message };
  }
}

async function fetchWarmingProgress() {
  try {
    const response = await fetch(`${SERVER_URL}/api/admin/cache/warm/progress`);
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    return null;
  }
}

function displayHeader() {
  const now = new Date().toLocaleString();
  console.log('🚀 ALFALYZER CACHE MONITOR');
  console.log('=' .repeat(50));
  console.log(`📅 ${now} | 🔄 Refresh: ${REFRESH_INTERVAL/1000}s`);
  console.log('');
}

function displayOverview(stats) {
  const { global, performance } = stats;
  
  console.log('📊 CACHE OVERVIEW');
  console.log('-'.repeat(30));
  console.log(`🎯 Hit Rate:        ${global.hitRate}`);
  console.log(`📈 Total Requests:  ${formatNumber(global.totalRequests)}${getChangeIndicator(global.totalRequests, previousStats?.global?.totalRequests)}`);
  console.log(`✅ Cache Hits:      ${formatNumber(global.hits)}${getChangeIndicator(global.hits, previousStats?.global?.hits)}`);
  console.log(`❌ Cache Misses:    ${formatNumber(global.misses)}${getChangeIndicator(global.misses, previousStats?.global?.misses)}`);
  console.log(`💾 API Calls Saved: ${formatNumber(global.apiCallsSaved)}`);
  console.log(`⏱️  Uptime:         ${formatUptime(global.uptime)}`);
  console.log('');
}

function displayProviders(stats) {
  const { redis, memory } = stats;
  
  console.log('🔧 CACHE PROVIDERS');
  console.log('-'.repeat(30));
  
  // Redis Status
  const redisStatus = redis.connected ? '🟢 Connected' : '🔴 Disconnected';
  console.log(`Redis:    ${redisStatus}`);
  if (redis.connected) {
    console.log(`  └ Keys:     ${formatNumber(redis.keyCount)}`);
    console.log(`  └ Memory:   ${formatBytes(redis.memoryUsed)}`);
    console.log(`  └ Commands: ${formatNumber(redis.totalCommands)} (${redis.failedCommands} failed)`);
  }
  
  // Memory Status
  console.log(`Memory:   🟢 Active`);
  console.log(`  └ Entries:  ${formatNumber(memory.totalEntries)}`);
  console.log(`  └ Hit Rate: ${memory.hitRate}`);
  console.log(`  └ Usage:    ${memory.memoryUsage?.percentage || 'N/A'}`);
  console.log(`  └ Evictions: ${formatNumber(memory.evictions)}`);
  console.log('');
}

function displayCacheTypes(stats) {
  const { global } = stats;
  
  if (!global.byType || Object.keys(global.byType).length === 0) {
    return;
  }
  
  console.log('📋 CACHE BY TYPE');
  console.log('-'.repeat(30));
  
  const sortedTypes = Object.entries(global.byType)
    .sort(([,a], [,b]) => b.count - a.count)
    .slice(0, 8); // Show top 8 types
  
  for (const [type, data] of sortedTypes) {
    const hitRate = data.hits + data.misses > 0 
      ? Math.round((data.hits / (data.hits + data.misses)) * 100)
      : 0;
    
    console.log(`${type.replace(/_/g, ' ').toUpperCase()}:`);
    console.log(`  └ Count: ${data.count} | Hits: ${data.hits} | Rate: ${hitRate}%`);
  }
  console.log('');
}

function displayWarming(warmingData) {
  if (!warmingData || !warmingData.isWarming) {
    return;
  }
  
  console.log('🔥 CACHE WARMING');
  console.log('-'.repeat(30));
  console.log(`Status:   ${warmingData.isWarming ? '🔄 In Progress' : '✅ Complete'}`);
  console.log(`Progress: ${warmingData.progress}/${warmingData.total} (${warmingData.percentage}%)`);
  
  // Progress bar
  const barLength = 20;
  const filled = Math.round((warmingData.percentage / 100) * barLength);
  const empty = barLength - filled;
  const progressBar = '█'.repeat(filled) + '░'.repeat(empty);
  console.log(`[${progressBar}] ${warmingData.percentage}%`);
  console.log('');
}

function displayFooter() {
  console.log('🎮 CONTROLS');
  console.log('-'.repeat(20));
  console.log('Press Ctrl+C to exit');
  console.log('');
  console.log('🔗 ENDPOINTS');
  console.log('-'.repeat(20));
  console.log(`Stats:   ${SERVER_URL}/api/admin/cache/stats`);
  console.log(`Health:  ${SERVER_URL}/api/admin/cache/health`);
  console.log(`Warm:    POST ${SERVER_URL}/api/admin/cache/warm`);
  console.log(`Clear:   DELETE ${SERVER_URL}/api/admin/cache/clear`);
}

async function displayStats() {
  clearScreen();
  
  const [stats, warmingData] = await Promise.all([
    fetchCacheStats(),
    fetchWarmingProgress()
  ]);
  
  displayHeader();
  
  if (stats.error) {
    console.log('❌ ERROR CONNECTING TO CACHE');
    console.log('-'.repeat(30));
    console.log(`Error: ${stats.error}`);
    console.log(`URL: ${SERVER_URL}`);
    console.log('');
    console.log('Make sure the server is running and accessible.');
    return;
  }
  
  displayOverview(stats);
  displayProviders(stats);
  displayCacheTypes(stats);
  displayWarming(warmingData);
  displayFooter();
  
  // Store for comparison in next iteration
  previousStats = stats;
}

async function startMonitoring() {
  console.log(`🚀 Starting cache monitor for ${SERVER_URL}`);
  console.log(`🔄 Refresh interval: ${REFRESH_INTERVAL/1000} seconds`);
  console.log('');
  
  // Initial display
  await displayStats();
  
  // Set up refresh interval
  const interval = setInterval(async () => {
    await displayStats();
  }, REFRESH_INTERVAL);
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    clearInterval(interval);
    clearScreen();
    console.log('👋 Cache monitor stopped.');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    clearInterval(interval);
    process.exit(0);
  });
}

// Start monitoring if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startMonitoring().catch(error => {
    console.error('❌ Monitor failed:', error);
    process.exit(1);
  });
}

export { startMonitoring, displayStats };