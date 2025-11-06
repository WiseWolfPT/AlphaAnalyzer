#!/bin/bash
#
# Run IV Sector Coverage Validation
#
# Usage:
#   ./scripts/validation/run-iv-validation.sh [URL]
#
# Examples:
#   ./scripts/validation/run-iv-validation.sh                                    # Production
#   ./scripts/validation/run-iv-validation.sh http://localhost:3001              # Local
#

set -e

TARGET_URL="${1:-https://128.140.45.28.sslip.io}"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  IV Sector Coverage Validation Runner                          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Target: $TARGET_URL"
echo ""

# Ensure we're in project root
cd "$(dirname "$0")/../.."

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Compile TypeScript
echo "Compiling validation script..."
npx tsx scripts/validation/validate-iv-sector-coverage.ts

echo ""
echo "✅ Validation complete! Check validation-results/ for detailed reports."
