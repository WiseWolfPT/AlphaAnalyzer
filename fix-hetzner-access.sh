#!/bin/bash

# Alfalyzer Hetzner External Access Fix Script
# Resolves the issue where localhost:3001 works but external IP doesn't

set -e

echo "🔧 ALFALYZER - Fixing External Access on Hetzner VPS"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Server details
SERVER_IP="128.140.45.28"
PORT="3001"

echo "📍 Target: http://$SERVER_IP:$PORT"
echo ""

# Function to check if we're on the server
check_environment() {
    if [[ $(hostname -I 2>/dev/null | grep -c "$SERVER_IP") -gt 0 ]] || [[ -f /home/teste\ 1/.env ]]; then
        echo -e "${GREEN}✅ Running on Hetzner server${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  This script should be run on the Hetzner server${NC}"
        echo "Run: ssh root@$SERVER_IP"
        echo "Then: bash fix-hetzner-access.sh"
        exit 1
    fi
}

# 1. Check UFW firewall status
check_firewall() {
    echo "1️⃣  Checking UFW Firewall Status..."
    echo "--------------------------------"
    
    if command -v ufw &> /dev/null; then
        UFW_STATUS=$(sudo ufw status | head -1)
        echo "UFW Status: $UFW_STATUS"
        
        if [[ $UFW_STATUS == *"inactive"* ]]; then
            echo -e "${YELLOW}⚠️  UFW is inactive. Configuring...${NC}"
            
            # Configure UFW
            sudo ufw allow 22/tcp  # SSH
            sudo ufw allow 80/tcp  # HTTP
            sudo ufw allow 443/tcp # HTTPS
            sudo ufw allow $PORT/tcp # App port
            
            echo "y" | sudo ufw enable
            echo -e "${GREEN}✅ UFW enabled with port $PORT open${NC}"
        else
            # Check if port is allowed
            if sudo ufw status | grep -q "$PORT"; then
                echo -e "${GREEN}✅ Port $PORT is already allowed in UFW${NC}"
            else
                echo -e "${YELLOW}⚠️  Adding port $PORT to UFW...${NC}"
                sudo ufw allow $PORT/tcp
                echo -e "${GREEN}✅ Port $PORT added to UFW${NC}"
            fi
        fi
    else
        echo -e "${YELLOW}⚠️  UFW not installed. Installing...${NC}"
        sudo apt-get update && sudo apt-get install -y ufw
        check_firewall
    fi
    echo ""
}

# 2. Check server binding
check_binding() {
    echo "2️⃣  Checking Server Binding..."
    echo "----------------------------"
    
    # Check what address the server is listening on
    BINDING=$(ss -tlnp | grep ":$PORT" | awk '{print $4}')
    
    if [[ -z "$BINDING" ]]; then
        echo -e "${RED}❌ Server not listening on port $PORT${NC}"
        echo "PM2 status:"
        pm2 status
        return 1
    fi
    
    echo "Current binding: $BINDING"
    
    if [[ $BINDING == *"127.0.0.1:$PORT"* ]] || [[ $BINDING == *"localhost:$PORT"* ]]; then
        echo -e "${RED}❌ Server is only listening on localhost!${NC}"
        echo "This prevents external access."
        return 1
    elif [[ $BINDING == *"0.0.0.0:$PORT"* ]] || [[ $BINDING == *":::$PORT"* ]]; then
        echo -e "${GREEN}✅ Server is listening on all interfaces${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  Unexpected binding: $BINDING${NC}"
        return 1
    fi
}

# 3. Fix server binding
fix_binding() {
    echo ""
    echo "3️⃣  Fixing Server Binding..."
    echo "-------------------------"
    
    cd /home/teste\ 1/
    
    # Check if HOST is set in .env
    if grep -q "^HOST=" .env; then
        echo "Found HOST in .env, updating..."
        sed -i 's/^HOST=.*/HOST=0.0.0.0/' .env
    else
        echo "Adding HOST=0.0.0.0 to .env..."
        echo "HOST=0.0.0.0" >> .env
    fi
    
    # Also check the server code
    if grep -q "127.0.0.1\|localhost" server/index.ts 2>/dev/null; then
        echo -e "${YELLOW}⚠️  Found localhost references in server code${NC}"
        echo "Checking server/index.ts for binding configuration..."
        
        # Create a backup
        cp server/index.ts server/index.ts.backup
        
        # Update the listen call to use 0.0.0.0 in production
        cat > /tmp/server-fix.js << 'EOF'
const fs = require('fs');
const content = fs.readFileSync('server/index.ts', 'utf8');

// Fix app.listen to bind to 0.0.0.0 in production
const fixed = content.replace(
    /app\.listen\(([^,]+),\s*\(\)/g,
    'app.listen($1, "0.0.0.0", ()'
).replace(
    /app\.listen\(([^,]+),\s*'[^']*',/g,
    'app.listen($1, "0.0.0.0",'
).replace(
    /app\.listen\(([^,]+),\s*"[^"]*",/g,
    'app.listen($1, "0.0.0.0",'
);

// If no host specified, add it
if (!fixed.includes('app.listen') || !fixed.includes('0.0.0.0')) {
    console.log('Warning: Could not automatically fix binding. Manual intervention needed.');
} else {
    fs.writeFileSync('server/index.ts', fixed);
    console.log('Updated server binding to 0.0.0.0');
}
EOF
        node /tmp/server-fix.js
    fi
    
    # Restart PM2
    echo "Restarting PM2..."
    pm2 restart all --update-env
    
    sleep 3
    
    # Verify the fix
    if check_binding; then
        echo -e "${GREEN}✅ Binding fixed successfully${NC}"
    else
        echo -e "${RED}❌ Binding fix failed. Manual intervention needed.${NC}"
        echo "Please check server/index.ts and ensure it binds to 0.0.0.0"
    fi
}

# 4. Check iptables (alternative to UFW)
check_iptables() {
    echo ""
    echo "4️⃣  Checking iptables rules..."
    echo "----------------------------"
    
    # Check if there are any DROP rules for our port
    if sudo iptables -L INPUT -n | grep -q "DROP.*dpt:$PORT"; then
        echo -e "${RED}❌ Found DROP rule for port $PORT${NC}"
        echo "Removing..."
        sudo iptables -D INPUT -p tcp --dport $PORT -j DROP 2>/dev/null || true
    fi
    
    # Check if there's an ACCEPT rule
    if ! sudo iptables -L INPUT -n | grep -q "ACCEPT.*dpt:$PORT"; then
        echo -e "${YELLOW}⚠️  Adding ACCEPT rule for port $PORT${NC}"
        sudo iptables -I INPUT -p tcp --dport $PORT -j ACCEPT
        echo -e "${GREEN}✅ iptables rule added${NC}"
    else
        echo -e "${GREEN}✅ iptables already has ACCEPT rule for port $PORT${NC}"
    fi
}

# 5. Test connectivity
test_connectivity() {
    echo ""
    echo "5️⃣  Testing Connectivity..."
    echo "------------------------"
    
    # Test localhost
    echo -n "Testing localhost:$PORT... "
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/ | grep -q "200\|304"; then
        echo -e "${GREEN}✅ Works${NC}"
    else
        echo -e "${RED}❌ Failed${NC}"
    fi
    
    # Test external IP
    echo -n "Testing $SERVER_IP:$PORT... "
    if timeout 5 curl -s -o /dev/null -w "%{http_code}" http://$SERVER_IP:$PORT/ | grep -q "200\|304"; then
        echo -e "${GREEN}✅ Works - PROBLEM SOLVED!${NC}"
        return 0
    else
        echo -e "${RED}❌ Still not accessible externally${NC}"
        return 1
    fi
}

# 6. Check Hetzner Cloud Firewall
check_cloud_firewall() {
    echo ""
    echo "6️⃣  Hetzner Cloud Firewall Check..."
    echo "---------------------------------"
    echo -e "${YELLOW}⚠️  IMPORTANT: Check Hetzner Cloud Console${NC}"
    echo "1. Go to: https://console.hetzner.cloud/"
    echo "2. Select your server"
    echo "3. Go to 'Firewalls' tab"
    echo "4. Ensure port $PORT is allowed for TCP"
    echo "5. If using Cloud Firewall, add rule:"
    echo "   - Protocol: TCP"
    echo "   - Port: $PORT"
    echo "   - Source: 0.0.0.0/0 (or restrict as needed)"
}

# 7. Additional diagnostics
additional_diagnostics() {
    echo ""
    echo "7️⃣  Additional Diagnostics..."
    echo "---------------------------"
    
    echo "Network interfaces:"
    ip addr show | grep -E "inet |UP"
    
    echo ""
    echo "All listening ports:"
    ss -tlnp | grep LISTEN
    
    echo ""
    echo "PM2 status:"
    pm2 status
    
    echo ""
    echo "Last PM2 logs:"
    pm2 logs --lines 10 --nostream
}

# Main execution
main() {
    check_environment
    
    check_firewall
    
    if ! check_binding; then
        fix_binding
    fi
    
    check_iptables
    
    if ! test_connectivity; then
        check_cloud_firewall
        additional_diagnostics
        
        echo ""
        echo "🔍 TROUBLESHOOTING SUMMARY"
        echo "========================="
        echo ""
        echo "If still not working, check:"
        echo "1. Hetzner Cloud Firewall (web console)"
        echo "2. Server logs: pm2 logs"
        echo "3. System logs: journalctl -u pm2-root -n 50"
        echo "4. Network routing: traceroute $SERVER_IP"
        echo ""
        echo "Manual fix for binding:"
        echo "1. Edit: nano /home/teste\\ 1/server/index.ts"
        echo "2. Find: app.listen(port"
        echo "3. Change to: app.listen(port, '0.0.0.0'"
        echo "4. Save and run: pm2 restart all"
    else
        echo ""
        echo "🎉 SUCCESS!"
        echo "=========="
        echo -e "${GREEN}✅ Your Alfalyzer is now accessible at:${NC}"
        echo "   http://$SERVER_IP:$PORT"
        echo ""
        echo "Next steps:"
        echo "1. Set up HTTPS with Nginx"
        echo "2. Configure domain name"
        echo "3. Install Redis (currently using mock)"
    fi
}

# Run main function
main