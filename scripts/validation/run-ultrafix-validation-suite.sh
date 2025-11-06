#!/bin/bash

# ULTRAFIX FASE 3: Master Validation Suite
# Runs all validation tests in sequence and generates comprehensive report

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
RESULTS_DIR="$SCRIPT_DIR/../../validation-results"

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     ULTRAFIX FASE 3: Master Validation Suite                 ║"
echo "║                                                               ║"
echo "║  Phase 1: US Regression Test (~5 min)                        ║"
echo "║  Phase 2: Recovery Validation (~20-30 min)                   ║"
echo "║  Phase 3: Report Generation (~1 min)                         ║"
echo "║                                                               ║"
echo "║  Total ETA: 25-35 minutes                                    ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Create results directory if it doesn't exist
mkdir -p "$RESULTS_DIR"

# Phase 1: US Regression Test
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PHASE 1: US Regression Test"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -f "$RESULTS_DIR/us-regression-results.json" ]; then
  echo "⚠️  Previous US regression results found. Remove? (y/N)"
  read -r response
  if [[ "$response" =~ ^[Yy]$ ]]; then
    rm "$RESULTS_DIR/us-regression-results.json"
    echo "✓ Removed previous results"
  else
    echo "⚠️  Keeping previous results. Skipping US regression test."
    SKIP_US_REGRESSION=true
  fi
fi

if [ "$SKIP_US_REGRESSION" != "true" ]; then
  echo "Starting US regression test..."
  node "$SCRIPT_DIR/validate-us-regression.mjs"
  US_REGRESSION_EXIT=$?

  if [ $US_REGRESSION_EXIT -eq 0 ]; then
    echo "✅ US regression test PASSED"
  else
    echo "⚠️  US regression test completed with warnings"
  fi
else
  echo "ℹ️  Using cached US regression results"
fi

echo ""
sleep 2

# Phase 2: Recovery Validation
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PHASE 2: Recovery Validation (1,045 stocks)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -f "$RESULTS_DIR/ultrafix-recovery-results.json" ]; then
  echo "⚠️  Previous recovery results found. Remove? (y/N)"
  read -r response
  if [[ "$response" =~ ^[Yy]$ ]]; then
    rm "$RESULTS_DIR/ultrafix-recovery-results.json"
    echo "✓ Removed previous results"
  else
    echo "⚠️  Keeping previous results. Skipping recovery validation."
    SKIP_RECOVERY=true
  fi
fi

if [ "$SKIP_RECOVERY" != "true" ]; then
  echo "Starting recovery validation..."
  echo "⏱️  This will take 20-30 minutes. Grab a coffee! ☕"
  echo ""

  node "$SCRIPT_DIR/validate-ultrafix-recovery.mjs"
  RECOVERY_EXIT=$?

  if [ $RECOVERY_EXIT -eq 0 ]; then
    echo "✅ Recovery validation PASSED (≥90% recovery rate)"
  else
    echo "⚠️  Recovery validation completed with warnings"
  fi
else
  echo "ℹ️  Using cached recovery results"
fi

echo ""
sleep 2

# Phase 3: Report Generation
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PHASE 3: Report Generation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if both result files exist
if [ ! -f "$RESULTS_DIR/us-regression-results.json" ]; then
  echo "❌ ERROR: US regression results not found!"
  echo "   Please run: node scripts/validation/validate-us-regression.mjs"
  exit 1
fi

if [ ! -f "$RESULTS_DIR/ultrafix-recovery-results.json" ]; then
  echo "❌ ERROR: Recovery results not found!"
  echo "   Please run: node scripts/validation/validate-ultrafix-recovery.mjs"
  exit 1
fi

echo "Generating comprehensive report..."
node "$SCRIPT_DIR/generate-ultrafix-report.mjs"

if [ -f "ULTRAFIX_FASE_3_VALIDATION_REPORT.md" ]; then
  echo "✅ Report generated successfully"
else
  echo "❌ ERROR: Report generation failed"
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "VALIDATION SUITE COMPLETE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📄 Report: ULTRAFIX_FASE_3_VALIDATION_REPORT.md"
echo "📊 Results:"
echo "   - US Regression: $RESULTS_DIR/us-regression-results.json"
echo "   - Recovery: $RESULTS_DIR/ultrafix-recovery-results.json"
echo ""

# Quick summary from report
if [ -f "ULTRAFIX_FASE_3_VALIDATION_REPORT.md" ]; then
  echo "📈 Quick Summary:"
  grep "Pass rate" "ULTRAFIX_FASE_3_VALIDATION_REPORT.md" | head -1 || echo "   (Summary extraction failed)"
  grep "Recovered stocks" "ULTRAFIX_FASE_3_VALIDATION_REPORT.md" | head -1 || echo "   (Summary extraction failed)"
  grep "Improvement" "ULTRAFIX_FASE_3_VALIDATION_REPORT.md" | head -1 || echo "   (Summary extraction failed)"
fi

echo ""
echo "🎉 All validations complete!"
echo ""
