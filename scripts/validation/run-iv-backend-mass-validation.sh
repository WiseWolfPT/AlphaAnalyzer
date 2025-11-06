#!/bin/bash
# Backend IV Mass Validation Runner
# Tests 100 stocks across all sectors for IV calculation anomalies

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "🔍 Backend IV Mass Validation"
echo "=============================="
echo ""

# Check if running on production server
if [ -f "/home/teste 1/dist/server/index.cjs" ]; then
  echo "📍 Environment: PRODUCTION (Hetzner)"
  cd "/home/teste 1"
else
  echo "📍 Environment: LOCAL"
  cd "$PROJECT_ROOT"
fi

# Check if API is running
echo "🔌 Checking API availability..."
if ! curl -s -f http://localhost:3001/api/health > /dev/null 2>&1; then
  echo "❌ ERROR: API is not responding at localhost:3001"
  echo "   Make sure the backend is running (pm2 status alfalyzer)"
  exit 1
fi
echo "✅ API is responding"
echo ""

# Run validation script
echo "🚀 Running validation on 100 stocks..."
echo ""

if command -v tsx &> /dev/null; then
  tsx "$PROJECT_ROOT/scripts/validation/validate-iv-backend-mass.ts"
elif command -v node &> /dev/null && [ -f "$PROJECT_ROOT/node_modules/.bin/tsx" ]; then
  "$PROJECT_ROOT/node_modules/.bin/tsx" "$PROJECT_ROOT/scripts/validation/validate-iv-backend-mass.ts"
else
  echo "❌ ERROR: tsx not found. Install with: npm install -g tsx"
  exit 1
fi
