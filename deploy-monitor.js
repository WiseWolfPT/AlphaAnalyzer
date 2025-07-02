#!/usr/bin/env node

/**
 * ALFALYZER DEPLOY MONITOR
 * Automated system to monitor and fix deployment issues
 * Created by coordinated agents to ensure stable deployments
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
const MAX_RESTART_ATTEMPTS = 3;
const LOG_FILE = path.join(__dirname, 'deploy-monitor.log');

class DeployMonitor {
  constructor() {
    this.processes = new Map();
    this.restartAttempts = new Map();
    this.healthChecks = new Map();
    this.logFile = fs.createWriteStream(LOG_FILE, { flags: 'a' });
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    console.log(logMessage.trim());
    this.logFile.write(logMessage);
  }

  async startMonitoring() {
    this.log('🚀 Alfalyzer Deploy Monitor Started');
    
    // Start health checks
    this.startHealthChecks();
    
    // Monitor processes
    this.monitorProcesses();
    
    // Setup graceful shutdown
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }

  startHealthChecks() {
    setInterval(() => {
      this.checkServerHealth();
      this.checkClientHealth();
      this.checkDatabaseHealth();
    }, HEALTH_CHECK_INTERVAL);
  }

  async checkServerHealth() {
    try {
      const response = await fetch('http://localhost:3001/api/health');
      if (!response.ok) {
        this.log('❌ Server health check failed');
        this.restartService('server');
      } else {
        this.log('✅ Server health check passed');
      }
    } catch (error) {
      this.log(`❌ Server health check error: ${error.message}`);
      this.restartService('server');
    }
  }

  async checkClientHealth() {
    try {
      const response = await fetch('http://localhost:3000');
      if (!response.ok) {
        this.log('❌ Client health check failed');
        this.restartService('client');
      } else {
        this.log('✅ Client health check passed');
      }
    } catch (error) {
      this.log(`❌ Client health check error: ${error.message}`);
      this.restartService('client');
    }
  }

  async checkDatabaseHealth() {
    try {
      const dbPath = path.join(__dirname, 'dev.db');
      if (!fs.existsSync(dbPath)) {
        this.log('❌ Database file missing');
        this.runCommand('npm run db:setup');
      } else {
        this.log('✅ Database health check passed');
      }
    } catch (error) {
      this.log(`❌ Database health check error: ${error.message}`);
    }
  }

  async restartService(service) {
    const attempts = this.restartAttempts.get(service) || 0;
    
    if (attempts >= MAX_RESTART_ATTEMPTS) {
      this.log(`🚨 Max restart attempts reached for ${service}`);
      return;
    }

    this.log(`🔄 Restarting ${service} (attempt ${attempts + 1})`);
    this.restartAttempts.set(service, attempts + 1);

    // Kill existing process
    if (this.processes.has(service)) {
      this.processes.get(service).kill();
    }

    // Start new process
    setTimeout(() => {
      this.startService(service);
    }, 5000);
  }

  startService(service) {
    let command, args;
    
    switch (service) {
      case 'server':
        command = 'npm';
        args = ['run', 'backend'];
        break;
      case 'client':
        command = 'npm';
        args = ['run', 'frontend'];
        break;
      default:
        this.log(`❌ Unknown service: ${service}`);
        return;
    }

    const process = spawn(command, args, {
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'development' }
    });

    process.stdout.on('data', (data) => {
      this.log(`[${service}] ${data.toString().trim()}`);
    });

    process.stderr.on('data', (data) => {
      this.log(`[${service}] ERROR: ${data.toString().trim()}`);
    });

    process.on('exit', (code) => {
      this.log(`[${service}] Process exited with code ${code}`);
      this.processes.delete(service);
    });

    this.processes.set(service, process);
  }

  monitorProcesses() {
    setInterval(() => {
      ['server', 'client'].forEach(service => {
        if (!this.processes.has(service)) {
          this.log(`⚠️ ${service} process not running, starting...`);
          this.startService(service);
        }
      });
    }, 10000);
  }

  runCommand(command) {
    return new Promise((resolve, reject) => {
      const child = spawn('bash', ['-c', command], { stdio: 'pipe' });
      
      child.on('exit', (code) => {
        if (code === 0) {
          this.log(`✅ Command completed: ${command}`);
          resolve();
        } else {
          this.log(`❌ Command failed: ${command}`);
          reject(new Error(`Command failed with code ${code}`));
        }
      });
    });
  }

  shutdown() {
    this.log('🛑 Shutting down deploy monitor...');
    
    // Kill all processes
    this.processes.forEach((process, service) => {
      this.log(`Stopping ${service}...`);
      process.kill();
    });

    // Close log file
    this.logFile.end();
    
    process.exit(0);
  }
}

// Start monitoring if run directly
if (require.main === module) {
  const monitor = new DeployMonitor();
  monitor.startMonitoring().catch(console.error);
}

module.exports = DeployMonitor;