#!/bin/bash

# Browser Testing Script
# Tests localhost:3000 connection across different browsers

echo "🌐 CROSS-BROWSER TESTING SCRIPT"
echo "==============================="
echo ""

# Verify server is running first
echo "1. 🔍 VERIFYING SERVER STATUS"
echo "----------------------------"

SERVER_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [ "$SERVER_STATUS" = "200" ]; then
    echo "✅ Server is running on localhost:3000 (HTTP $SERVER_STATUS)"
else
    echo "❌ Server not responding on localhost:3000 (HTTP $SERVER_STATUS)"
    echo "   Please run 'npm run dev' first"
    exit 1
fi

echo ""

# Test URLs
echo "2. 🧪 URL ACCESSIBILITY TEST"
echo "---------------------------"

URLS=(
    "http://localhost:3000"
    "http://127.0.0.1:3000"
    "http://192.168.1.151:3000"
)

for url in "${URLS[@]}"; do
    echo -n "Testing $url... "
    status=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
    if [ "$status" = "200" ]; then
        echo "✅ HTTP $status"
    else
        echo "❌ HTTP $status"
    fi
done

echo ""

# Launch browsers for manual testing
echo "3. 🚀 LAUNCHING BROWSERS FOR MANUAL TESTING"
echo "------------------------------------------"

echo "Opening URLs in available browsers..."
echo ""

# Safari
if [ -d "/Applications/Safari.app" ]; then
    echo "📱 Opening Safari with localhost:3000..."
    open -a Safari "http://localhost:3000" 2>/dev/null &
    sleep 1
fi

# Chrome (if available)
if [ -d "/Applications/Google Chrome.app" ]; then
    echo "🔵 Opening Chrome with 127.0.0.1:3000..."
    open -a "Google Chrome" "http://127.0.0.1:3000" 2>/dev/null &
    sleep 1
fi

# Edge
if [ -d "/Applications/Microsoft Edge.app" ]; then
    echo "🔷 Opening Edge with network IP..."
    open -a "Microsoft Edge" "http://192.168.1.151:3000" 2>/dev/null &
    sleep 1
fi

# Opera (the problematic one)
if [ -d "/Applications/Opera.app" ]; then
    echo "🔴 Opening Opera with localhost:3000..."
    echo "   ⚠️  This may fail - follow fix guide if it doesn't work"
    open -a Opera "http://localhost:3000" 2>/dev/null &
    sleep 1
fi

# Opera Air (alternative)
if [ -d "/Applications/Opera Air.app" ]; then
    echo "🔴 Opening Opera Air with 127.0.0.1:3000..."
    open -a "Opera Air" "http://127.0.0.1:3000" 2>/dev/null &
    sleep 1
fi

echo ""

# Provide manual testing instructions
echo "4. 📋 MANUAL TESTING CHECKLIST"
echo "-----------------------------"
echo ""
echo "For each browser that opened, verify:"
echo "✅ Page loads completely"
echo "✅ No error messages in address bar"
echo "✅ Interactive elements work"
echo "✅ Network requests succeed (check DevTools)"
echo ""

echo "🚨 OPERA TROUBLESHOOTING:"
echo "========================"
echo ""
echo "If Opera fails to load localhost:3000:"
echo ""
echo "1. 🔧 TRY IP ADDRESS INSTEAD:"
echo "   - Manually navigate to: http://127.0.0.1:3000"
echo "   - Or try: http://192.168.1.151:3000"
echo ""
echo "2. 🔒 CHECK OPERA SETTINGS:"
echo "   - Look for VPN icon in address bar - turn it OFF"
echo "   - Go to opera://settings/privacy - disable VPN"
echo "   - Clear browser data: opera://settings/clearBrowserData"
echo ""
echo "3. 🛡️ DISABLE SECURITY FEATURES:"
echo "   - Temporarily disable ad blocker"
echo "   - Add localhost:3000 to allowed sites"
echo "   - Check proxy settings"
echo ""
echo "4. 🔄 LAST RESORT:"
echo "   - Try Opera incognito mode (Ctrl+Shift+N)"
echo "   - Reset Opera settings: opera://settings/reset"
echo "   - Use different browser for development"
echo ""

echo "📊 RESULTS COMPARISON:"
echo "====================="
echo ""
echo "Expected results:"
echo "✅ Safari:     Should work perfectly"
echo "✅ Chrome:     Should work perfectly"  
echo "✅ Edge:       Should work perfectly"
echo "❌ Opera:      May fail due to VPN/security features"
echo "❓ Opera Air:  May work better than regular Opera"
echo ""

echo "💡 QUICK FIX FOR OPERA:"
echo "======================"
echo ""
echo "Most common solution:"
echo "1. Look for VPN shield icon in Opera's address bar"
echo "2. Click it and turn OFF the VPN"
echo "3. Refresh the page"
echo ""
echo "Alternative:"  
echo "1. Use http://127.0.0.1:3000 instead of localhost:3000"
echo "2. This bypasses Opera's localhost handling issues"
echo ""

echo "🏁 TESTING COMPLETE"
echo "=================="
echo ""
echo "Check each browser window that opened."
echo "If Opera doesn't work, refer to: ./opera-browser-fix-guide.md"