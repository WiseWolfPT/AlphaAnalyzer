#!/usr/bin/env node

/**
 * Alfalyzer Simple Tunnel Implementation
 * A lightweight tunneling solution for local development
 * This creates a simple HTTP proxy tunnel for accessing the local dev server
 */

const http = require('http');
const net = require('net');
const crypto = require('crypto');
const url = require('url');

class SimpleTunnel {
    constructor(options = {}) {
        this.localPort = options.localPort || 3000;
        this.tunnelPort = options.tunnelPort || 8090;
        this.host = options.host || '0.0.0.0';
        this.tunnelId = crypto.randomBytes(8).toString('hex');
        this.connections = new Set();
    }

    start() {
        return new Promise((resolve, reject) => {
            // Create the tunnel server
            this.server = http.createServer((req, res) => {
                // Add CORS headers for development
                const headers = {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
                    'X-Tunnel-Id': this.tunnelId,
                    'X-Tunnel-Target': `localhost:${this.localPort}`
                };

                // Handle OPTIONS requests
                if (req.method === 'OPTIONS') {
                    res.writeHead(200, headers);
                    res.end();
                    return;
                }

                // Check if local server is available
                this.checkLocalServer()
                    .then(() => {
                        // Proxy the request to local server
                        this.proxyRequest(req, res, headers);
                    })
                    .catch(() => {
                        // Local server not available, return error page
                        this.sendErrorPage(res, 'Local Development Server Not Available');
                    });
            });

            // Track connections for graceful shutdown
            this.server.on('connection', (socket) => {
                this.connections.add(socket);
                socket.on('close', () => {
                    this.connections.delete(socket);
                });
            });

            // Start listening
            this.server.listen(this.tunnelPort, this.host, (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log(`🚇 Simple Tunnel started!`);
                    console.log(`📱 Local: http://localhost:${this.localPort}`);
                    console.log(`🌐 Tunnel: http://${this.host}:${this.tunnelPort}`);
                    console.log(`🔗 Tunnel ID: ${this.tunnelId}`);
                    resolve();
                }
            });
        });
    }

    proxyRequest(req, res, headers) {
        const options = {
            hostname: 'localhost',
            port: this.localPort,
            path: req.url,
            method: req.method,
            headers: {
                ...req.headers,
                'host': `localhost:${this.localPort}`
            }
        };

        const proxy = http.request(options, (proxyRes) => {
            // Add tunnel headers
            Object.keys(headers).forEach(key => {
                res.setHeader(key, headers[key]);
            });

            // Copy response headers from local server
            Object.keys(proxyRes.headers).forEach(key => {
                res.setHeader(key, proxyRes.headers[key]);
            });

            res.writeHead(proxyRes.statusCode);
            proxyRes.pipe(res);
        });

        proxy.on('error', (err) => {
            console.error(`Proxy error: ${err.message}`);
            this.sendErrorPage(res, 'Connection to local server failed');
        });

        // Pipe request data
        req.pipe(proxy);
    }

    checkLocalServer() {
        return new Promise((resolve, reject) => {
            const socket = new net.Socket();
            
            socket.setTimeout(1000);
            
            socket.on('connect', () => {
                socket.destroy();
                resolve();
            });
            
            socket.on('timeout', () => {
                socket.destroy();
                reject(new Error('Timeout'));
            });
            
            socket.on('error', (err) => {
                reject(err);
            });
            
            socket.connect(this.localPort, 'localhost');
        });
    }

    sendErrorPage(res, message) {
        const errorHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Alfalyzer Tunnel - Service Unavailable</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex; 
            justify-content: center; 
            align-items: center; 
            height: 100vh; 
            margin: 0; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .container { 
            text-align: center; 
            padding: 2rem;
            background: rgba(255,255,255,0.1);
            border-radius: 10px;
            backdrop-filter: blur(10px);
        }
        .error-code { 
            font-size: 4rem; 
            margin: 0; 
            opacity: 0.8;
        }
        .message { 
            font-size: 1.2rem; 
            margin: 1rem 0; 
        }
        .details { 
            font-size: 0.9rem; 
            opacity: 0.8; 
            margin-top: 2rem;
        }
        .retry-btn {
            background: rgba(255,255,255,0.2);
            border: 1px solid rgba(255,255,255,0.3);
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 5px;
            cursor: pointer;
            margin-top: 1rem;
        }
        .retry-btn:hover {
            background: rgba(255,255,255,0.3);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="error-code">🚇</div>
        <div class="message">${message}</div>
        <div class="details">
            <p>Tunnel ID: ${this.tunnelId}</p>
            <p>Target: localhost:${this.localPort}</p>
            <p>Make sure your Alfalyzer development server is running:</p>
            <code>npm run dev</code>
        </div>
        <button class="retry-btn" onclick="location.reload()">Retry Connection</button>
    </div>
    <script>
        // Auto-retry every 5 seconds
        setTimeout(() => location.reload(), 5000);
    </script>
</body>
</html>`;
        
        res.writeHead(503, {
            'Content-Type': 'text/html',
            'X-Tunnel-Id': this.tunnelId,
            'Retry-After': '5'
        });
        res.end(errorHtml);
    }

    stop() {
        return new Promise((resolve) => {
            if (this.server) {
                // Close all connections
                for (const socket of this.connections) {
                    socket.destroy();
                }
                
                this.server.close(() => {
                    console.log('🚇 Simple Tunnel stopped');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    getStatus() {
        return {
            tunnelId: this.tunnelId,
            localPort: this.localPort,
            tunnelPort: this.tunnelPort,
            host: this.host,
            isRunning: this.server && this.server.listening,
            connections: this.connections.size
        };
    }
}

// CLI Interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const command = args[0] || 'start';
    
    const tunnel = new SimpleTunnel({
        localPort: parseInt(args[1]) || 3000,
        tunnelPort: parseInt(args[2]) || 8090,
        host: args[3] || '0.0.0.0'
    });

    switch (command) {
        case 'start':
            console.log('🚇 Starting Alfalyzer Simple Tunnel...');
            console.log(`Target: localhost:${tunnel.localPort}`);
            console.log(`Tunnel: ${tunnel.host}:${tunnel.tunnelPort}`);
            console.log('');
            
            tunnel.start()
                .then(() => {
                    console.log('✅ Tunnel is ready!');
                    console.log('');
                    console.log('📊 Access Methods:');
                    console.log(`   Local:    http://localhost:${tunnel.localPort}`);
                    console.log(`   Tunnel:   http://${tunnel.host}:${tunnel.tunnelPort}`);
                    console.log(`   Network:  http://<your-ip>:${tunnel.tunnelPort}`);
                    console.log('');
                    console.log('💡 Share the tunnel URL with others to access your local development server');
                    console.log('Press Ctrl+C to stop the tunnel');
                })
                .catch((err) => {
                    console.error('❌ Failed to start tunnel:', err.message);
                    process.exit(1);
                });
            
            // Graceful shutdown
            process.on('SIGINT', () => {
                console.log('\n🛑 Shutting down tunnel...');
                tunnel.stop().then(() => {
                    process.exit(0);
                });
            });
            
            process.on('SIGTERM', () => {
                tunnel.stop().then(() => {
                    process.exit(0);
                });
            });
            break;

        case 'status':
            console.log('Simple Tunnel Status:');
            console.log(JSON.stringify(tunnel.getStatus(), null, 2));
            break;

        case 'help':
        default:
            console.log('Alfalyzer Simple Tunnel');
            console.log('');
            console.log('Usage: node scripts/simple-tunnel.js [command] [local_port] [tunnel_port] [host]');
            console.log('');
            console.log('Commands:');
            console.log('  start   - Start the tunnel (default)');
            console.log('  status  - Show tunnel status');
            console.log('  help    - Show this help');
            console.log('');
            console.log('Examples:');
            console.log('  node scripts/simple-tunnel.js start 3000 8090');
            console.log('  node scripts/simple-tunnel.js start 3005 8091 0.0.0.0');
            console.log('');
            console.log('Default: local_port=3000, tunnel_port=8090, host=0.0.0.0');
            break;
    }
}

module.exports = SimpleTunnel;