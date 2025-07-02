#!/bin/bash

# ⚡ ALFALYZER QUICK START
# One-command deployment for immediate development

echo "⚡ ALFALYZER QUICK START"
echo "======================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}Starting Alfalyzer in quick mode...${NC}"

# Change to project root
cd "$(dirname "$0")/.."

# Quick cleanup
echo -e "${YELLOW}Quick cleanup...${NC}"
pkill -f "vite|tsx" 2>/dev/null || true
rm -f *.pid 2>/dev/null || true

# Start services
echo -e "${YELLOW}Starting services...${NC}"
npm run dev &

# Wait a moment
sleep 5

# Quick health check
echo -e "${YELLOW}Testing services...${NC}"
sleep 10

if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is running${NC}"
else
    echo "⚠️  Backend may still be starting..."
fi

if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is running${NC}"
else
    echo "⚠️  Frontend may still be starting..."
fi

echo ""
echo -e "${GREEN}🎉 ALFALYZER STARTED!${NC}"
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend:  http://localhost:3001"
echo ""
echo "To stop: Ctrl+C or run ./scripts/stop-deploy.sh"
echo "For full diagnostics: ./scripts/health-check.sh"

# Keep script running to show logs
wait