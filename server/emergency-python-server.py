#!/usr/bin/env python3

"""
EMERGENCY PYTHON SERVER - ULTRATHINK PARALLEL EXECUTION

This Python server provides an alternative HTTP server implementation
to serve the Alfalyzer application when Node.js servers fail.
"""

import http.server
import socketserver
import json
import os
import sys
from pathlib import Path
from urllib.parse import urlparse, parse_qs
import threading
import time

class AlfalyzerHandler(http.server.SimpleHTTPRequestHandler):
    """Custom handler for Alfalyzer emergency server"""
    
    def __init__(self, *args, **kwargs):
        # Set the directory to serve files from
        self.base_path = Path(__file__).parent.parent
        self.dist_path = self.base_path / "dist" / "public"
        self.client_public = self.base_path / "client" / "public"
        
        # Determine serving directory
        if self.dist_path.exists():
            os.chdir(self.dist_path)
            print(f"📁 Serving from: {self.dist_path}")
        elif self.client_public.exists():
            os.chdir(self.client_public)
            print(f"📁 Serving from: {self.client_public}")
        else:
            # Create temporary directory with basic files
            temp_dir = self.base_path / "temp_public"
            temp_dir.mkdir(exist_ok=True)
            self.create_basic_files(temp_dir)
            os.chdir(temp_dir)
            print(f"📁 Serving from temporary: {temp_dir}")
            
        super().__init__(*args, **kwargs)
    
    def create_basic_files(self, temp_dir):
        """Create basic HTML files for emergency serving"""
        index_content = """
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Alfalyzer - Emergency Python Server</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; background: #f0f0f0; }
                .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; }
                .status { color: #28a745; font-weight: bold; }
                .api-test { margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 4px; }
                button { background: #007bff; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; }
                button:hover { background: #0056b3; }
                pre { background: #e9ecef; padding: 10px; border-radius: 4px; overflow-x: auto; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🐍 Alfalyzer - Emergency Python Server</h1>
                <p class="status">Status: ACTIVE</p>
                <p>Emergency Python HTTP server is running successfully!</p>
                <p>Time: <span id="time"></span></p>
                
                <div class="api-test">
                    <h3>API Test</h3>
                    <button onclick="testAPI()">Test /api/health</button>
                    <button onclick="testStocks()">Test /api/stocks</button>
                    <div id="api-result"></div>
                </div>
                
                <div class="api-test">
                    <h3>Server Information</h3>
                    <pre id="server-info">
Python Version: """ + sys.version + """
Server: Python HTTP Server (Emergency Mode)
Directory: """ + str(Path.cwd()) + """
                    </pre>
                </div>
            </div>
            
            <script>
                // Update time
                function updateTime() {
                    document.getElementById('time').textContent = new Date().toISOString();
                }
                updateTime();
                setInterval(updateTime, 1000);
                
                // Test API endpoints
                async function testAPI() {
                    try {
                        const response = await fetch('/api/health');
                        const data = await response.json();
                        document.getElementById('api-result').innerHTML = 
                            '<h4>✅ API Health Response:</h4><pre>' + JSON.stringify(data, null, 2) + '</pre>';
                    } catch (error) {
                        document.getElementById('api-result').innerHTML = 
                            '<h4>❌ API Health Error:</h4><pre>' + error.message + '</pre>';
                    }
                }
                
                async function testStocks() {
                    try {
                        const response = await fetch('/api/stocks');
                        const data = await response.json();
                        document.getElementById('api-result').innerHTML = 
                            '<h4>✅ Stocks API Response:</h4><pre>' + JSON.stringify(data, null, 2) + '</pre>';
                    } catch (error) {
                        document.getElementById('api-result').innerHTML = 
                            '<h4>❌ Stocks API Error:</h4><pre>' + error.message + '</pre>';
                    }
                }
                
                console.log('🐍 Emergency Python server is active');
                console.log('Time:', new Date().toISOString());
            </script>
        </body>
        </html>
        """
        
        with open(temp_dir / "index.html", "w") as f:
            f.write(index_content)
    
    def do_GET(self):
        """Handle GET requests"""
        parsed_path = urlparse(self.path)
        
        # Handle API routes
        if parsed_path.path.startswith('/api/'):
            self.handle_api_request(parsed_path)
        else:
            # Serve static files
            if parsed_path.path == '/' or parsed_path.path == '':
                self.path = '/index.html'
            super().do_GET()
    
    def handle_api_request(self, parsed_path):
        """Handle API requests"""
        path = parsed_path.path
        
        # Set CORS headers
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
        
        if path == '/api/health':
            response = {
                'status': 'healthy',
                'server': 'emergency-python-server',
                'timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
                'python_version': sys.version,
                'platform': sys.platform
            }
        elif path == '/api/stocks':
            response = {
                'message': 'Emergency Python server active',
                'data': [
                    {'symbol': 'AAPL', 'price': 150.25, 'change': '+2.15'},
                    {'symbol': 'GOOGL', 'price': 2800.50, 'change': '-5.75'},
                    {'symbol': 'MSFT', 'price': 300.75, 'change': '+1.25'},
                    {'symbol': 'TSLA', 'price': 800.90, 'change': '+12.45'}
                ],
                'timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
                'source': 'python-emergency-server'
            }
        else:
            self.send_response(404)
            response = {
                'error': 'API endpoint not found',
                'path': path,
                'server': 'emergency-python-server'
            }
        
        self.wfile.write(json.dumps(response, indent=2).encode())
    
    def do_OPTIONS(self):
        """Handle OPTIONS requests for CORS"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

def try_port(port, host='127.0.0.1'):
    """Try to bind to a specific port and host"""
    try:
        with socketserver.TCPServer((host, port), AlfalyzerHandler) as httpd:
            return True
    except OSError:
        return False

def find_available_port(start_port=3001, host='127.0.0.1'):
    """Find an available port starting from start_port"""
    for port in range(start_port, start_port + 10):
        if try_port(port, host):
            return port
    return None

def start_server():
    """Start the Python emergency server with multiple binding strategies"""
    print("🐍 EMERGENCY PYTHON SERVER - ULTRATHINK PARALLEL EXECUTION")
    print("=" * 60)
    
    # Try different ports and hosts
    strategies = [
        (3001, '127.0.0.1'),
        (3001, 'localhost'),
        (3001, '0.0.0.0'),
        (8080, '127.0.0.1'),
        (8080, 'localhost'),
        (8080, '0.0.0.0'),
        (3000, '127.0.0.1'),
        (5000, '127.0.0.1'),
    ]
    
    for port, host in strategies:
        try:
            print(f"🔄 Trying {host}:{port}...")
            
            # Test if port is available
            if not try_port(port, host):
                print(f"❌ Port {port} on {host} is not available")
                continue
            
            # Start the server
            with socketserver.TCPServer((host, port), AlfalyzerHandler) as httpd:
                print(f"🚀 PYTHON EMERGENCY SERVER ACTIVE!")
                print(f"📱 Local:    http://localhost:{port}")
                print(f"🌐 Network:  http://{host}:{port}")
                print(f"🔧 API:      http://localhost:{port}/api/health")
                print(f"🔧 Stocks:   http://localhost:{port}/api/stocks")
                print("=" * 60)
                print("✅ Server is ready to accept connections")
                print("Press Ctrl+C to stop the server")
                
                try:
                    httpd.serve_forever()
                except KeyboardInterrupt:
                    print("\n🛑 Server stopping...")
                    break
                    
        except OSError as e:
            print(f"❌ Failed to bind to {host}:{port} - {e}")
            continue
        except Exception as e:
            print(f"❌ Unexpected error: {e}")
            continue
    
    print("❌ All binding strategies failed!")
    sys.exit(1)

if __name__ == "__main__":
    try:
        start_server()
    except KeyboardInterrupt:
        print("\n👋 Goodbye!")
    except Exception as e:
        print(f"❌ Fatal error: {e}")
        sys.exit(1)