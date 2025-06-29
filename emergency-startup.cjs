#!/usr/bin/env node

/**
 * 🔥 EMERGENCY STARTUP SCRIPT - ULTRATHINK PARALLEL EXECUTION
 * 
 * This script implements multiple server startup strategies simultaneously
 * to ensure the Alfalyzer application starts reliably.
 * 
 * Strategies:
 * 1. Main Node.js server (server/index.ts)
 * 2. Emergency Node.js server (server/emergency-server.js)
 * 3. Python HTTP server (server/emergency-python-server.py)
 * 4. PHP built-in server (server/emergency-php-server.php)
 * 5. Static file servers
 * 6. Vite development server
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

// Load environment variables
require('dotenv').config();

class EmergencyStartup {
  constructor() {
    this.servers = [];
    this.runningServers = [];
    this.basePort = parseInt(process.env.PORT) || 3001;
    this.maxAttempts = 5;
    this.startTime = Date.now();
    
    console.log('🔥 EMERGENCY STARTUP - ULTRATHINK PARALLEL EXECUTION');
    console.log('=' * 80);
    console.log(`⚡ Target Port: ${this.basePort}`);
    console.log(`⚡ Max Attempts: ${this.maxAttempts}`);
    console.log(`⚡ Start Time: ${new Date().toISOString()}`);
    console.log('=' * 80);
  }

  // Test if a port is available
  async testPort(port, host = 'localhost') {
    return new Promise((resolve) => {
      const server = require('net').createServer();
      
      server.listen(port, host, () => {
        server.close(() => resolve(true));
      });
      
      server.on('error', () => resolve(false));
    });
  }

  // Test if a server is responding
  async testServerHealth(port, host = 'localhost', path = '/api/health') {
    return new Promise((resolve) => {
      const options = {
        hostname: host,
        port: port,
        path: path,
        method: 'GET',
        timeout: 5000
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            resolve({ success: true, status: res.statusCode, data: response });
          } catch (error) {
            resolve({ success: false, error: 'Invalid JSON response' });
          }
        });
      });

      req.on('error', (error) => {
        resolve({ success: false, error: error.message });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ success: false, error: 'Request timeout' });
      });

      req.end();
    });
  }

  // Start main Node.js server
  async startMainServer() {
    console.log('🚀 STRATEGY 1: Starting main Node.js server...');
    
    return new Promise((resolve) => {
      const server = spawn('npm', ['run', 'backend'], {
        stdio: 'pipe',
        cwd: process.cwd()
      });

      let output = '';
      let hasStarted = false;

      server.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        console.log(`[MAIN] ${text.trim()}`);
        
        // Check for server start indicators
        if ((text.includes('MAIN SERVER ACTIVE') || text.includes('Server is running')) && !hasStarted) {
          hasStarted = true;
          resolve({ success: true, process: server, type: 'main-nodejs' });
        }
      });

      server.stderr.on('data', (data) => {
        const text = data.toString();
        console.log(`[MAIN-ERR] ${text.trim()}`);
      });

      server.on('close', (code) => {
        if (!hasStarted) {
          console.log(`❌ Main server exited with code ${code}`);
          resolve({ success: false, error: `Process exited with code ${code}` });
        }
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!hasStarted) {
          server.kill();
          resolve({ success: false, error: 'Startup timeout' });
        }
      }, 30000);
    });
  }

  // Start emergency Node.js server
  async startEmergencyNodeServer() {
    console.log('🚀 STRATEGY 2: Starting emergency Node.js server...');
    
    return new Promise((resolve) => {
      const server = spawn('node', ['server/emergency-server.cjs'], {
        stdio: 'pipe',
        cwd: process.cwd()
      });

      let hasStarted = false;

      server.stdout.on('data', (data) => {
        const text = data.toString();
        console.log(`[EMERGENCY-JS] ${text.trim()}`);
        
        if (text.includes('EMERGENCY SERVER ACTIVE') && !hasStarted) {
          hasStarted = true;
          resolve({ success: true, process: server, type: 'emergency-nodejs' });
        }
      });

      server.stderr.on('data', (data) => {
        console.log(`[EMERGENCY-JS-ERR] ${data.toString().trim()}`);
      });

      server.on('close', (code) => {
        if (!hasStarted) {
          resolve({ success: false, error: `Process exited with code ${code}` });
        }
      });

      setTimeout(() => {
        if (!hasStarted) {
          server.kill();
          resolve({ success: false, error: 'Startup timeout' });
        }
      }, 15000);
    });
  }

  // Start Python server
  async startPythonServer() {
    console.log('🚀 STRATEGY 3: Starting Python server...');
    
    // Check if Python is available
    if (!fs.existsSync('server/emergency-python-server.py')) {
      return { success: false, error: 'Python server file not found' };
    }

    return new Promise((resolve) => {
      const server = spawn('python3', ['server/emergency-python-server.py'], {
        stdio: 'pipe',
        cwd: process.cwd()
      });

      let hasStarted = false;

      server.stdout.on('data', (data) => {
        const text = data.toString();
        console.log(`[PYTHON] ${text.trim()}`);
        
        if (text.includes('PYTHON EMERGENCY SERVER ACTIVE') && !hasStarted) {
          hasStarted = true;
          resolve({ success: true, process: server, type: 'python' });
        }
      });

      server.stderr.on('data', (data) => {
        console.log(`[PYTHON-ERR] ${data.toString().trim()}`);
      });

      server.on('close', (code) => {
        if (!hasStarted) {
          resolve({ success: false, error: `Process exited with code ${code}` });
        }
      });

      setTimeout(() => {
        if (!hasStarted) {
          server.kill();
          resolve({ success: false, error: 'Startup timeout' });
        }
      }, 15000);
    });
  }

  // Start PHP server
  async startPHPServer() {
    console.log('🚀 STRATEGY 4: Starting PHP server...');
    
    const port = this.basePort + 10; // Use different port to avoid conflicts
    return new Promise((resolve) => {
      const server = spawn('php', ['-S', `localhost:${port}`, 'server/emergency-php-server.php'], {
        stdio: 'pipe',
        cwd: process.cwd()
      });

      let hasStarted = false;

      server.stdout.on('data', (data) => {
        const text = data.toString();
        console.log(`[PHP] ${text.trim()}`);
        
        if (text.includes('started') && !hasStarted) {
          hasStarted = true;
          resolve({ success: true, process: server, type: 'php', port });
        }
      });

      server.stderr.on('data', (data) => {
        const text = data.toString();
        console.log(`[PHP-ERR] ${text.trim()}`);
        
        // PHP server started messages sometimes go to stderr
        if (text.includes('started') && !hasStarted) {
          hasStarted = true;
          resolve({ success: true, process: server, type: 'php', port });
        }
      });

      server.on('close', (code) => {
        if (!hasStarted) {
          resolve({ success: false, error: `Process exited with code ${code}` });
        }
      });

      setTimeout(() => {
        if (!hasStarted) {
          server.kill();
          resolve({ success: false, error: 'Startup timeout' });
        }
      }, 10000);
    });
  }

  // Start Vite development server
  async startViteServer() {
    console.log('🚀 STRATEGY 5: Starting Vite development server...');
    
    return new Promise((resolve) => {
      const server = spawn('npm', ['run', 'frontend'], {
        stdio: 'pipe',
        cwd: process.cwd()
      });

      let hasStarted = false;

      server.stdout.on('data', (data) => {
        const text = data.toString();
        console.log(`[VITE] ${text.trim()}`);
        
        if ((text.includes('Local:') || text.includes('ready in')) && !hasStarted) {
          hasStarted = true;
          resolve({ success: true, process: server, type: 'vite' });
        }
      });

      server.stderr.on('data', (data) => {
        console.log(`[VITE-ERR] ${data.toString().trim()}`);
      });

      server.on('close', (code) => {
        if (!hasStarted) {
          resolve({ success: false, error: `Process exited with code ${code}` });
        }
      });

      setTimeout(() => {
        if (!hasStarted) {
          server.kill();
          resolve({ success: false, error: 'Startup timeout' });
        }
      }, 45000); // Vite can take longer to start
    });
  }

  // Execute all strategies in parallel
  async executeParallelStrategies() {
    console.log('⚡ EXECUTING ALL STRATEGIES IN PARALLEL...');
    
    const strategies = [
      this.startMainServer(),
      this.startEmergencyNodeServer(),
      this.startPythonServer(),
      this.startPHPServer(),
      this.startViteServer()
    ];

    // Race to see which server starts first
    const results = await Promise.allSettled(strategies);
    
    console.log('\n📊 STRATEGY RESULTS:');
    console.log('=' * 50);
    
    results.forEach((result, index) => {
      const strategyName = ['Main Node.js', 'Emergency Node.js', 'Python', 'PHP', 'Vite'][index];
      
      if (result.status === 'fulfilled' && result.value.success) {
        console.log(`✅ ${strategyName}: SUCCESS`);
        this.runningServers.push(result.value);
      } else {
        const error = result.status === 'rejected' ? result.reason : result.value.error;
        console.log(`❌ ${strategyName}: FAILED - ${error}`);
      }
    });

    return this.runningServers;
  }

  // Test all running servers
  async testRunningServers() {
    console.log('\n🧪 TESTING RUNNING SERVERS...');
    console.log('=' * 50);

    const testPromises = this.runningServers.map(async (server) => {
      const port = server.port || this.basePort;
      const testResult = await this.testServerHealth(port);
      
      console.log(`🔍 Testing ${server.type} on port ${port}:`, 
        testResult.success ? '✅ HEALTHY' : `❌ ${testResult.error}`);
      
      return { ...server, healthy: testResult.success, testResult };
    });

    const results = await Promise.all(testPromises);
    return results.filter(server => server.healthy);
  }

  // Main execution function
  async run() {
    try {
      console.log('🎯 Starting emergency server deployment...\n');

      // Execute all strategies in parallel
      const runningServers = await this.executeParallelStrategies();
      
      if (runningServers.length === 0) {
        console.log('\n❌ NO SERVERS STARTED SUCCESSFULLY!');
        console.log('💡 Manual troubleshooting steps:');
        console.log('   1. Check if ports 3001, 3000 are free: lsof -i :3001');
        console.log('   2. Try: npm install');
        console.log('   3. Try: npm run build');
        console.log('   4. Check .env file configuration');
        process.exit(1);
      }

      // Wait a moment for servers to fully initialize
      console.log('\n⏳ Waiting for servers to initialize...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Test the running servers
      const healthyServers = await this.testRunningServers();

      if (healthyServers.length === 0) {
        console.log('\n❌ NO HEALTHY SERVERS FOUND!');
        process.exit(1);
      }

      // Success!
      const duration = Date.now() - this.startTime;
      console.log('\n🎉 SUCCESS! SERVERS ARE RUNNING!');
      console.log('=' * 50);
      console.log(`⏱️  Total startup time: ${duration}ms`);
      console.log(`✅ Healthy servers: ${healthyServers.length}`);
      
      healthyServers.forEach(server => {
        const port = server.port || this.basePort;
        console.log(`🚀 ${server.type.toUpperCase()}: http://localhost:${port}`);
      });

      console.log('\n🌐 Application URLs:');
      console.log(`   Frontend: http://localhost:3000`);
      console.log(`   Backend:  http://localhost:${this.basePort}`);
      console.log(`   Health:   http://localhost:${this.basePort}/api/health`);

      // Keep the process running
      console.log('\n✅ Press Ctrl+C to stop all servers');
      
      // Setup graceful shutdown
      process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down all servers...');
        this.runningServers.forEach(server => {
          if (server.process && server.process.kill) {
            server.process.kill();
          }
        });
        process.exit(0);
      });

    } catch (error) {
      console.error('❌ FATAL ERROR:', error);
      process.exit(1);
    }
  }
}

// Run the emergency startup
const startup = new EmergencyStartup();
startup.run().catch(console.error);