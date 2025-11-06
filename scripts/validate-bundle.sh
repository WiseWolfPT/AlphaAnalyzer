#!/bin/bash
set -e

echo "🔍 Validating bundle before deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Check bundle exists
if [ ! -f dist/server/index.cjs ]; then
  echo -e "${RED}❌ Bundle not found.${NC} Run 'npm run build:server' first."
  exit 1
fi

echo "✓ Bundle found: dist/server/index.cjs"

# 2. Check bundle size (should be reasonable)
SIZE=$(wc -c < dist/server/index.cjs)
SIZE_MB=$(echo "scale=2; $SIZE/1048576" | bc)

if [ $SIZE -gt 5000000 ]; then  # 5MB limit
  echo -e "${YELLOW}⚠️  Bundle unusually large (${SIZE_MB}MB).${NC} Check for bundled dependencies."
  echo "   Expected: 50-200KB for external packages configuration"
else
  echo "✓ Bundle size OK: ${SIZE_MB}MB"
fi

# 3. Check for risky import patterns
echo "Checking for ESM/CJS import issues..."

# Check for .default imports that might fail
RISKY_DEFAULT=$(grep -c "import_lru_cache\.default\|import_msgpack\.default" dist/server/index.cjs || true)
if [ $RISKY_DEFAULT -gt 0 ]; then
  echo -e "${RED}❌ Found risky .default imports ($RISKY_DEFAULT occurrences)${NC}"
  echo "   This will cause: TypeError: X.default is not a constructor"
  echo ""
  echo "   Problematic lines:"
  grep -n "import_lru_cache\.default\|import_msgpack\.default" dist/server/index.cjs | head -5
  echo ""
  echo "   Fix: Use named imports instead of default imports"
  echo "   Example: import { LRUCache } from 'lru-cache'"
  exit 1
fi

echo "✓ No risky .default imports found"

# 4. Check for known problematic packages
echo "Validating external package usage..."

# Packages that MUST use named imports
declare -a NAMED_ONLY_PACKAGES=(
  "lru-cache"
  "@msgpack/msgpack"
)

for pkg in "${NAMED_ONLY_PACKAGES[@]}"; do
  # Check if package is used
  if grep -q "require(\"$pkg\")" dist/server/index.cjs; then
    # Check if used correctly (should see .encode, .decode, .LRUCache etc)
    if grep -q "__toESM.*require(\"$pkg\")" dist/server/index.cjs; then
      echo -e "${RED}❌ Package '$pkg' uses default import (will fail)${NC}"
      echo "   Fix: import { LRUCache } from '$pkg'  (named import)"
      exit 1
    fi
    echo "✓ Package '$pkg' imported correctly"
  fi
done

# 5. Test server can start (dry run)
echo "Testing server startup (dry run)..."

# Create a test that imports the bundle and validates critical imports
TEST_FILE=$(mktemp)
cat > "$TEST_FILE" << 'EOF'
try {
  // Test that bundle can be required without crashing
  const server = require('./dist/server/index.cjs');
  console.log('✓ Server bundle loads successfully');
  process.exit(0);
} catch (error) {
  console.error('❌ Server bundle failed to load:');
  console.error(error.message);
  console.error(error.stack);
  process.exit(1);
}
EOF

# Run test with 5 second timeout
if timeout 5 node "$TEST_FILE" 2>&1; then
  echo "✓ Server bundle loads without errors"
else
  echo -e "${RED}❌ Server failed startup test${NC}"
  rm "$TEST_FILE"
  exit 1
fi

rm "$TEST_FILE"

# 6. Verify workers can be loaded
echo "Validating worker bundles..."

for worker in price-worker transcripts-worker earnings-monitor intelligent-warming-worker iv-warming-worker; do
  if [ -f "dist/server/workers/${worker}.cjs" ]; then
    echo "✓ Worker found: ${worker}.cjs"
  else
    echo -e "${YELLOW}⚠️  Worker missing: ${worker}.cjs${NC}"
  fi
done

# 7. Summary
echo ""
echo -e "${GREEN}✅ Bundle validation passed${NC}"
echo ""
echo "Safe to deploy with:"
echo "  npm run deploy:server"
echo "  OR"
echo "  npm run deploy:full"
