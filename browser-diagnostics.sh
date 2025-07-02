#!/bin/bash

# Browser & Proxy Configuration Diagnostic Script
# Purpose: Diagnose Opera browser connection issues with localhost:3000

echo "🔍 BROWSER & PROXY CONFIGURATION DIAGNOSTICS"
echo "============================================="
echo ""

# Test basic connectivity
echo "1. 🌐 BASIC CONNECTIVITY TESTS"
echo "-----------------------------"

echo "Testing localhost:3000..."
curl -s -o /dev/null -w "HTTP Status: %{http_code}, Total Time: %{time_total}s\n" http://localhost:3000 || echo "❌ localhost:3000 failed"

echo "Testing 127.0.0.1:3000..."
curl -s -o /dev/null -w "HTTP Status: %{http_code}, Total Time: %{time_total}s\n" http://127.0.0.1:3000 || echo "❌ 127.0.0.1:3000 failed"

echo "Testing network interface (192.168.1.151:3000)..."
curl -s -o /dev/null -w "HTTP Status: %{http_code}, Total Time: %{time_total}s\n" http://192.168.1.151:3000 || echo "❌ Network interface failed"

echo ""

# Test DNS resolution
echo "2. 🔍 DNS RESOLUTION TESTS"
echo "-------------------------"

echo "localhost resolution:"
nslookup localhost || echo "❌ localhost DNS lookup failed"

echo ""
echo "127.0.0.1 ping test:"
ping -c 2 127.0.0.1 || echo "❌ Loopback ping failed"

echo ""

# Test different HTTP methods and headers
echo "3. 🔧 HTTP PROTOCOL TESTS"
echo "------------------------"

echo "GET request with verbose headers:"
curl -v http://localhost:3000 2>&1 | head -15

echo ""
echo "Testing with User-Agent (Opera simulation):"
curl -s -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 OPR/105.0.0.0" -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:3000

echo ""

# Check for proxy settings in environment
echo "4. 🔗 PROXY ENVIRONMENT CHECKS"
echo "-----------------------------"

if [ -n "$HTTP_PROXY" ]; then
    echo "HTTP_PROXY set to: $HTTP_PROXY"
else
    echo "✅ No HTTP_PROXY environment variable"
fi

if [ -n "$HTTPS_PROXY" ]; then
    echo "HTTPS_PROXY set to: $HTTPS_PROXY"
else
    echo "✅ No HTTPS_PROXY environment variable"
fi

if [ -n "$http_proxy" ]; then
    echo "http_proxy set to: $http_proxy"
else
    echo "✅ No http_proxy environment variable"
fi

if [ -n "$https_proxy" ]; then
    echo "https_proxy set to: $https_proxy"
else
    echo "✅ No https_proxy environment variable"
fi

echo ""

# Check macOS network settings
echo "5. 🖥️  MACOS NETWORK SETTINGS"
echo "-----------------------------"

echo "Active network interfaces:"
ifconfig | grep -E "^[a-z]|inet " | head -10

echo ""
echo "DNS configuration:"
scutil --dns | grep -E "nameserver|search" | head -5

echo ""

# Check for security software that might block localhost
echo "6. 🔒 SECURITY & FIREWALL CHECKS"
echo "-------------------------------"

echo "macOS firewall status:"
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate 2>/dev/null || echo "Unable to check firewall (requires sudo)"

echo ""

# Port availability check
echo "7. 🔌 PORT AVAILABILITY"
echo "---------------------"

echo "Checking if ports 3000 and 3001 are listening:"
lsof -i :3000 -i :3001 | head -10 || echo "No processes found on ports 3000/3001"

echo ""

# Create browser-specific test URLs
echo "8. 🌐 BROWSER TEST URLS"
echo "---------------------"

echo "Test these URLs in different browsers:"
echo "✅ Primary:    http://localhost:3000"
echo "✅ IP:         http://127.0.0.1:3000"
echo "✅ Network:    http://192.168.1.151:3000"
echo "✅ Backend:    http://localhost:3001/api/health"

echo ""

echo "🚀 OPERA-SPECIFIC TROUBLESHOOTING STEPS:"
echo "========================================"
echo ""
echo "1. CLEAR OPERA CACHE & DATA:"
echo "   - Go to opera://settings/clearBrowserData"
echo "   - Select 'All time' as time range"
echo "   - Check all boxes and clear data"
echo ""
echo "2. DISABLE OPERA VPN:"
echo "   - Click VPN icon in address bar (if visible)"
echo "   - Turn OFF the VPN"
echo "   - Or go to opera://settings/privacy and disable VPN"
echo ""
echo "3. CHECK PROXY SETTINGS:"
echo "   - Go to opera://settings/advanced"
echo "   - Click 'System' section"
echo "   - Open proxy settings"
echo "   - Ensure 'Use a proxy server' is OFF"
echo ""
echo "4. DISABLE AD BLOCKER FOR LOCALHOST:"
echo "   - Go to opera://settings/content/ads"
echo "   - Add 'localhost:3000' to allowed sites"
echo "   - Or disable ad blocker entirely for testing"
echo ""
echo "5. RESET NETWORK SETTINGS:"
echo "   - Go to opera://settings/reset"
echo "   - Or manually reset network settings"
echo ""
echo "6. TRY OPERA DEVELOPER BUILD:"
echo "   - Use Opera Developer or Opera GX"
echo "   - These may have different network stacks"
echo ""

echo "✅ ALTERNATIVE ACCESS METHODS:"
echo "============================="
echo ""
echo "If Opera still doesn't work, try:"
echo "• Use 127.0.0.1:3000 instead of localhost:3000"
echo "• Use your network IP: 192.168.1.151:3000"
echo "• Try Opera in incognito/private mode"
echo "• Use a different browser temporarily"
echo "• Check if Opera Air works better than regular Opera"

echo ""
echo "📋 DIAGNOSTIC COMPLETE"
echo "====================="