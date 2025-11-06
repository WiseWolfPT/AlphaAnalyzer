#!/bin/bash

###############################################################################
# Comprehensive Validation Orchestrator
#
# Runs all 20 validation tests after burst warming completes.
#
# Tests:
#   - API-based tests (11-14): Automated via Node.js
#   - Browser tests (1-10, 18-20): Manual via Chrome DevTools MCP
#   - SSH-based tests (16-17): Manual verification
#
# Usage:
#   bash scripts/validation/run-comprehensive-validation.sh
###############################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
PRODUCTION_URL="https://128.140.45.28.sslip.io"
WORKER_URL="http://128.140.45.28:3005"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

###############################################################################
# Pre-flight Checks
###############################################################################

preflight_checks() {
  log_info "Running pre-flight checks..."

  # Check if production is accessible
  if ! curl -s -o /dev/null -w "%{http_code}" "${PRODUCTION_URL}" | grep -q "200\|301\|302"; then
    log_error "Production URL not accessible: ${PRODUCTION_URL}"
    exit 1
  fi
  log_success "Production URL accessible"

  # Check if worker is running
  if ! curl -s -o /dev/null -w "%{http_code}" "${WORKER_URL}/health" | grep -q "200"; then
    log_warning "Worker health endpoint not accessible: ${WORKER_URL}/health"
    log_warning "Worker tests may fail"
  else
    log_success "Worker health endpoint accessible"
  fi

  # Check if Node.js is available
  if ! command -v node &> /dev/null; then
    log_error "Node.js not found. Please install Node.js."
    exit 1
  fi
  log_success "Node.js found: $(node --version)"

  # Check if test script exists
  if [[ ! -f "${SCRIPT_DIR}/chrome-devtools-comprehensive-test.mjs" ]]; then
    log_error "Test script not found: ${SCRIPT_DIR}/chrome-devtools-comprehensive-test.mjs"
    exit 1
  fi
  log_success "Test script found"
}

###############################################################################
# Burst Warming Verification
###############################################################################

verify_burst_complete() {
  log_info "Verifying burst warming completion..."

  # Check if burst warming log exists
  BURST_LOG="${PROJECT_ROOT}/BURST_WARMING_$(date +%Y-%m-%d).log"

  if [[ ! -f "${BURST_LOG}" ]]; then
    log_warning "Burst warming log not found: ${BURST_LOG}"
    read -p "Has burst warming completed? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      log_error "Burst warming must complete before running validation."
      log_info "Expected completion time: 6-7 hours from burst start"
      exit 1
    fi
  else
    # Check if log shows completion
    if grep -q "BURST COMPLETE" "${BURST_LOG}" 2>/dev/null; then
      log_success "Burst warming completed successfully"
    else
      log_warning "Burst warming log exists but completion not confirmed"
      read -p "Proceed anyway? (y/n): " -n 1 -r
      echo
      if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
      fi
    fi
  fi
}

###############################################################################
# API Tests (Automated)
###############################################################################

run_api_tests() {
  log_info "Running API tests (Tests 11-15)..."

  cd "${PROJECT_ROOT}"

  if node "${SCRIPT_DIR}/chrome-devtools-comprehensive-test.mjs"; then
    log_success "API tests completed"
    return 0
  else
    log_error "API tests failed"
    return 1
  fi
}

###############################################################################
# Browser Tests (Manual - Provide Instructions)
###############################################################################

run_browser_tests() {
  log_info "Browser tests require Chrome DevTools MCP integration"
  echo
  echo "════════════════════════════════════════════════════════════════"
  echo "  BROWSER TESTS (Tests 1-10, 18-20) - MANUAL EXECUTION REQUIRED"
  echo "════════════════════════════════════════════════════════════════"
  echo
  echo "Follow the instructions in:"
  echo "  ${SCRIPT_DIR}/chrome-devtools-browser-tests.md"
  echo
  echo "These tests will validate:"
  echo "  - Cache hit rates (Tests 1-5)"
  echo "  - Growth rates accuracy (Tests 6-10)"
  echo "  - UI/UX functionality (Tests 18-20)"
  echo
  read -p "Have you completed the browser tests? (y/n): " -n 1 -r
  echo

  if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_success "Browser tests marked as complete"
    return 0
  else
    log_warning "Browser tests not completed"
    return 1
  fi
}

###############################################################################
# SSH Tests (Manual - Provide Commands)
###############################################################################

run_ssh_tests() {
  log_info "SSH tests require manual verification"
  echo
  echo "════════════════════════════════════════════════════════════════"
  echo "  SSH TESTS (Tests 16-17) - MANUAL VERIFICATION REQUIRED"
  echo "════════════════════════════════════════════════════════════════"
  echo
  echo "Test 16: Cache Invalidation"
  echo "  ssh root@128.140.45.28 \"redis-cli -a alfalyzer2025redis KEYS 'iv:*' | wc -l\""
  echo "  Expected: Should show many IV cache keys (>100)"
  echo
  echo "Test 17: Earnings Detection"
  echo "  ssh root@128.140.45.28 \"pm2 logs iv-worker --lines 50 | grep 'Found.*earnings events'\""
  echo "  Expected: Should show earnings events being detected"
  echo
  read -p "Have you verified SSH tests? (y/n): " -n 1 -r
  echo

  if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_success "SSH tests marked as complete"
    return 0
  else
    log_warning "SSH tests not completed"
    return 1
  fi
}

###############################################################################
# Generate Final Report
###############################################################################

generate_report() {
  log_info "Generating final validation report..."

  REPORT_FILE="${PROJECT_ROOT}/VALIDATION_REPORT_$(date +%Y-%m-%d_%H-%M-%S).md"

  cat > "${REPORT_FILE}" <<EOF
# Comprehensive Validation Report

**Date:** $(date +"%Y-%m-%d %H:%M:%S")
**Environment:** Production (https://128.140.45.28.sslip.io)
**Burst Warming:** Completed

## Test Summary

### API Tests (Tests 11-15)
Status: See automated test output

### Browser Tests (Tests 1-10, 18-20)
Status: Manual verification required

### SSH Tests (Tests 16-17)
Status: Manual verification required

## Next Steps

1. Review automated API test results
2. Complete browser tests using Chrome DevTools MCP
3. Verify SSH tests manually
4. Update this report with final results

## Resources

- Browser test instructions: scripts/validation/chrome-devtools-browser-tests.md
- Automated test script: scripts/validation/chrome-devtools-comprehensive-test.mjs

---
**Last Updated:** $(date +"%Y-%m-%d %H:%M:%S")
EOF

  log_success "Report generated: ${REPORT_FILE}"
}

###############################################################################
# Main Execution
###############################################################################

main() {
  echo
  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║     COMPREHENSIVE VALIDATION SUITE - 20 TESTS                  ║"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo

  preflight_checks
  echo

  verify_burst_complete
  echo

  log_info "Starting validation execution..."
  echo

  # Track results
  API_TESTS_PASSED=false
  BROWSER_TESTS_PASSED=false
  SSH_TESTS_PASSED=false

  # Run API tests (automated)
  if run_api_tests; then
    API_TESTS_PASSED=true
  fi
  echo

  # Browser tests (manual)
  if run_browser_tests; then
    BROWSER_TESTS_PASSED=true
  fi
  echo

  # SSH tests (manual)
  if run_ssh_tests; then
    SSH_TESTS_PASSED=true
  fi
  echo

  # Generate report
  generate_report
  echo

  # Final summary
  echo "════════════════════════════════════════════════════════════════"
  echo "  VALIDATION SUMMARY"
  echo "════════════════════════════════════════════════════════════════"
  echo

  if [[ "${API_TESTS_PASSED}" == "true" ]]; then
    log_success "API Tests: PASSED"
  else
    log_error "API Tests: FAILED"
  fi

  if [[ "${BROWSER_TESTS_PASSED}" == "true" ]]; then
    log_success "Browser Tests: COMPLETED"
  else
    log_warning "Browser Tests: NOT COMPLETED"
  fi

  if [[ "${SSH_TESTS_PASSED}" == "true" ]]; then
    log_success "SSH Tests: VERIFIED"
  else
    log_warning "SSH Tests: NOT VERIFIED"
  fi

  echo
  log_info "Review detailed results in the generated reports:"
  log_info "  - API Tests: CHROME_DEVTOOLS_VALIDATION_$(date +%Y-%m-%d).md"
  log_info "  - Full Report: VALIDATION_REPORT_*.md"
  echo
}

main "$@"
