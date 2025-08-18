#!/bin/bash

# Quick Hetzner Status Check (run locally)

SERVER_IP="128.140.45.28"
PORT="3001"

echo "🔍 ALFALYZER HETZNER STATUS CHECK"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Ping test
echo "1️⃣  Ping Test..."
if ping -c 1 -W 2 $SERVER_IP > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is reachable${NC}"
else
    echo -e "${RED}❌ Cannot ping server${NC}"
    exit 1
fi

# 2. Port scan
echo ""
echo "2️⃣  Port Scan..."
if command -v nc &> /dev/null; then
    if nc -zv -w 3 $SERVER_IP $PORT 2>&1 | grep -q "succeeded\|connected"; then
        echo -e "${GREEN}✅ Port $PORT is OPEN${NC}"
    else
        echo -e "${RED}❌ Port $PORT is CLOSED or filtered${NC}"
    fi
else
    echo "Using telnet for port check..."
    if timeout 3 telnet $SERVER_IP $PORT 2>&1 | grep -q "Connected"; then
        echo -e "${GREEN}✅ Port $PORT is OPEN${NC}"
    else
        echo -e "${RED}❌ Port $PORT is CLOSED or filtered${NC}"
    fi
fi

# 3. HTTP test
echo ""
echo "3️⃣  HTTP Test..."
echo -n "Testing http://$SERVER_IP:$PORT... "

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 http://$SERVER_IP:$PORT/ 2>/dev/null)

if [[ "$HTTP_CODE" == "200" ]] || [[ "$HTTP_CODE" == "304" ]]; then
    echo -e "${GREEN}✅ HTTP $HTTP_CODE - Frontend is accessible!${NC}"
elif [[ "$HTTP_CODE" == "000" ]]; then
    echo -e "${RED}❌ Connection timeout - Port likely blocked${NC}"
else
    echo -e "${YELLOW}⚠️  HTTP $HTTP_CODE - Unexpected response${NC}"
fi

# 4. API health check
echo ""
echo "4️⃣  API Health Check..."
API_RESPONSE=$(curl -s --connect-timeout 5 http://$SERVER_IP:$PORT/api/health 2>/dev/null)

if [[ "$API_RESPONSE" == *"ok"* ]] || [[ "$API_RESPONSE" == *"healthy"* ]]; then
    echo -e "${GREEN}✅ API is responding${NC}"
    echo "Response: $API_RESPONSE"
elif [[ -z "$API_RESPONSE" ]]; then
    echo -e "${RED}❌ No response from API${NC}"
else
    echo -e "${YELLOW}⚠️  API response: $API_RESPONSE${NC}"
fi

# 5. Summary
echo ""
echo "📊 SUMMARY"
echo "=========="

if [[ "$HTTP_CODE" == "200" ]] || [[ "$HTTP_CODE" == "304" ]]; then
    echo -e "${GREEN}✅ ALFALYZER IS ACCESSIBLE!${NC}"
    echo ""
    echo "🎉 You can access your app at:"
    echo "   http://$SERVER_IP:$PORT"
    echo ""
    echo "Dashboard: http://$SERVER_IP:$PORT/dashboard"
    echo "API: http://$SERVER_IP:$PORT/api/health"
else
    echo -e "${RED}❌ ALFALYZER IS NOT ACCESSIBLE EXTERNALLY${NC}"
    echo ""
    echo "🔧 TO FIX THIS:"
    echo "1. SSH into server: ssh root@$SERVER_IP"
    echo "2. Run the fix script:"
    echo "   cd /home/teste\\ 1/"
    echo "   wget https://raw.githubusercontent.com/your-repo/main/fix-hetzner-access.sh"
    echo "   bash fix-hetzner-access.sh"
    echo ""
    echo "Or copy the local script:"
    echo "   scp fix-hetzner-access.sh root@$SERVER_IP:/home/teste\\ 1/"
    echo "   ssh root@$SERVER_IP"
    echo "   cd /home/teste\\ 1/"
    echo "   bash fix-hetzner-access.sh"
fi

echo ""
echo "🔍 Quick SSH commands to diagnose on server:"
echo "ssh root@$SERVER_IP"
echo "sudo ufw status"
echo "ss -tlnp | grep $PORT"
echo "pm2 status"
echo "pm2 logs --lines 20"