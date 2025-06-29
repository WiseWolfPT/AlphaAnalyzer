<?php
/**
 * EMERGENCY PHP SERVER - ULTRATHINK PARALLEL EXECUTION
 * 
 * This PHP built-in server provides another fallback option
 * to serve the Alfalyzer application when other servers fail.
 * 
 * Usage: php -S localhost:3001 emergency-php-server.php
 */

// Set CORS headers for all requests
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Get the requested URI
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Handle API routes
if (strpos($requestUri, '/api/') === 0) {
    handleApiRequest($requestUri);
    exit();
}

// Serve static files
handleStaticFiles($requestUri);

function handleApiRequest($path) {
    header('Content-Type: application/json');
    
    switch ($path) {
        case '/api/health':
            $response = [
                'status' => 'healthy',
                'server' => 'emergency-php-server',
                'timestamp' => date('c'),
                'php_version' => PHP_VERSION,
                'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'PHP Built-in Server'
            ];
            break;
            
        case '/api/stocks':
            $response = [
                'message' => 'Emergency PHP server active',
                'data' => [
                    ['symbol' => 'AAPL', 'price' => 150.25, 'change' => '+2.15'],
                    ['symbol' => 'GOOGL', 'price' => 2800.50, 'change' => '-5.75'],
                    ['symbol' => 'MSFT', 'price' => 300.75, 'change' => '+1.25'],
                    ['symbol' => 'TSLA', 'price' => 800.90, 'change' => '+12.45'],
                    ['symbol' => 'NVDA', 'price' => 450.30, 'change' => '+8.90']
                ],
                'timestamp' => date('c'),
                'source' => 'php-emergency-server'
            ];
            break;
            
        case '/api/csrf-token':
            $response = [
                'csrfToken' => bin2hex(random_bytes(32)),
                'timestamp' => date('c'),
                'server' => 'emergency-php-server'
            ];
            break;
            
        default:
            http_response_code(404);
            $response = [
                'error' => 'API endpoint not found',
                'path' => $path,
                'server' => 'emergency-php-server'
            ];
            break;
    }
    
    echo json_encode($response, JSON_PRETTY_PRINT);
}

function handleStaticFiles($path) {
    // Paths to check for static files
    $basePath = dirname(__DIR__);
    $possiblePaths = [
        $basePath . '/dist/public',
        $basePath . '/client/public',
        $basePath . '/client/dist'
    ];
    
    // Default to serving index.html for root requests
    if ($path === '/' || $path === '') {
        $path = '/index.html';
    }
    
    // Try to find the file in possible locations
    foreach ($possiblePaths as $baseDir) {
        $fullPath = $baseDir . $path;
        if (file_exists($fullPath) && is_file($fullPath)) {
            serveStaticFile($fullPath);
            return;
        }
    }
    
    // If no static file found, serve emergency HTML
    if ($path === '/index.html' || $path === '/') {
        serveEmergencyHtml();
    } else {
        // Return 404 for other missing files
        http_response_code(404);
        echo "404 - File not found: " . htmlspecialchars($path);
    }
}

function serveStaticFile($filePath) {
    $mimeType = getMimeType($filePath);
    header('Content-Type: ' . $mimeType);
    
    // Add caching headers for static assets
    if (strpos($mimeType, 'text/html') === false) {
        header('Cache-Control: public, max-age=3600');
    }
    
    readfile($filePath);
}

function getMimeType($filePath) {
    $extension = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
    
    $mimeTypes = [
        'html' => 'text/html',
        'htm' => 'text/html',
        'css' => 'text/css',
        'js' => 'application/javascript',
        'json' => 'application/json',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'gif' => 'image/gif',
        'svg' => 'image/svg+xml',
        'ico' => 'image/x-icon',
        'woff' => 'font/woff',
        'woff2' => 'font/woff2',
        'ttf' => 'font/ttf',
        'lottie' => 'application/json'
    ];
    
    return $mimeTypes[$extension] ?? 'application/octet-stream';
}

function serveEmergencyHtml() {
    header('Content-Type: text/html');
    ?>
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Alfalyzer - Emergency PHP Server</title>
        <style>
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh; display: flex; align-items: center; justify-content: center;
            }
            .container { 
                max-width: 800px; background: white; padding: 40px; border-radius: 12px; 
                box-shadow: 0 10px 25px rgba(0,0,0,0.1); margin: 20px;
            }
            h1 { color: #333; margin-bottom: 10px; }
            .status { color: #28a745; font-weight: bold; font-size: 1.2em; }
            .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 30px 0; }
            .info-card { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff; }
            .api-test { margin: 20px 0; padding: 20px; background: #e9ecef; border-radius: 8px; }
            button { 
                background: #007bff; color: white; padding: 10px 20px; border: none; 
                border-radius: 6px; cursor: pointer; margin: 5px; font-size: 14px;
                transition: background-color 0.2s;
            }
            button:hover { background: #0056b3; }
            pre { background: #f8f9fa; padding: 15px; border-radius: 6px; overflow-x: auto; font-size: 13px; }
            .timestamp { color: #666; font-style: italic; }
            .server-badge { 
                display: inline-block; background: #28a745; color: white; 
                padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-left: 10px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🐘 Alfalyzer - Emergency PHP Server <span class="server-badge">PHP <?php echo PHP_VERSION; ?></span></h1>
            <p class="status">Status: ACTIVE & READY</p>
            <p class="timestamp">Server Time: <span id="time"><?php echo date('Y-m-d H:i:s T'); ?></span></p>
            
            <div class="info-grid">
                <div class="info-card">
                    <h3>🚀 Server Info</h3>
                    <p><strong>Server:</strong> PHP Built-in Server</p>
                    <p><strong>Mode:</strong> Emergency Fallback</p>
                    <p><strong>Port:</strong> <?php echo $_SERVER['SERVER_PORT'] ?? 'N/A'; ?></p>
                </div>
                
                <div class="info-card">
                    <h3>🔧 Quick Links</h3>
                    <p><a href="/api/health">Health Check</a></p>
                    <p><a href="/api/stocks">Sample Stocks Data</a></p>
                    <p><a href="/api/csrf-token">CSRF Token</a></p>
                </div>
            </div>
            
            <div class="api-test">
                <h3>🧪 API Testing</h3>
                <button onclick="testAPI('/api/health')">Test Health API</button>
                <button onclick="testAPI('/api/stocks')">Test Stocks API</button>
                <button onclick="testAPI('/api/csrf-token')">Test CSRF Token</button>
                <div id="api-result"></div>
            </div>
            
            <div class="api-test">
                <h3>📊 System Information</h3>
                <pre id="system-info">
PHP Version: <?php echo PHP_VERSION; ?>

Server Software: <?php echo $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown'; ?>

Document Root: <?php echo $_SERVER['DOCUMENT_ROOT'] ?? dirname(__FILE__); ?>

Request Time: <?php echo date('c'); ?>

Server Address: <?php echo $_SERVER['SERVER_ADDR'] ?? 'N/A'; ?>:<?php echo $_SERVER['SERVER_PORT'] ?? 'N/A'; ?>
                </pre>
            </div>
        </div>
        
        <script>
            // Update time every second
            function updateTime() {
                document.getElementById('time').textContent = new Date().toLocaleString();
            }
            setInterval(updateTime, 1000);
            
            // Test API endpoints
            async function testAPI(endpoint) {
                const resultDiv = document.getElementById('api-result');
                resultDiv.innerHTML = '<p>🔄 Testing ' + endpoint + '...</p>';
                
                try {
                    const response = await fetch(endpoint);
                    const data = await response.json();
                    const status = response.ok ? '✅' : '❌';
                    
                    resultDiv.innerHTML = 
                        '<h4>' + status + ' ' + endpoint + ' Response (Status: ' + response.status + '):</h4>' +
                        '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
                } catch (error) {
                    resultDiv.innerHTML = 
                        '<h4>❌ ' + endpoint + ' Error:</h4>' +
                        '<pre>Error: ' + error.message + '</pre>';
                }
            }
            
            console.log('🐘 Emergency PHP server is active');
            console.log('Server time:', new Date().toISOString());
            console.log('PHP Version: <?php echo PHP_VERSION; ?>');
            
            // Auto-test health endpoint on load
            setTimeout(() => testAPI('/api/health'), 1000);
        </script>
    </body>
    </html>
    <?php
}
?>