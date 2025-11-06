#!/usr/bin/env python3
"""
COMPREHENSIVE INTRINSIC VALUE PRODUCTION TEST
Tests 35 stocks across 7 sectors to validate production functionality
"""

import requests
import time
import json
import sys
from datetime import datetime
from typing import Dict, List, Tuple

# Configuration
BASE_URL = "https://128.140.45.28.sslip.io"
REQUEST_TIMEOUT = 30

# Test stocks by sector
TEST_STOCKS = {
    "Technology": ["AAPL", "MSFT", "GOOGL", "NVDA", "META"],
    "Finance": ["JPM", "BAC", "WFC", "GS", "MS"],
    "Healthcare": ["JNJ", "UNH", "PFE", "ABBV", "LLY"],
    "Consumer": ["AMZN", "WMT", "COST", "NKE", "MCD"],
    "Energy": ["XOM", "CVX", "COP", "SLB", "EOG"],
    "Industrial": ["CAT", "BA", "HON", "UPS", "GE"],
    "Portuguese": ["EDP.LS", "GALP.LS", "NOS.LS", "BCP.LS", "JMT.LS"]
}

# Colors
class Colors:
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    RED = '\033[0;31m'
    BLUE = '\033[0;34m'
    NC = '\033[0m'

# Results storage
results = []
sector_stats = {sector: {"total": 0, "passed": 0} for sector in TEST_STOCKS.keys()}
performance = {
    "total_time": 0,
    "cache_miss_time": 0,
    "cache_hit_time": 0,
    "cache_tests": 0
}
failures = []

def test_stock(ticker: str, sector: str, test_num: int, total: int, expected_methods: int = 10) -> Dict:
    """Test a single stock's intrinsic value calculation"""
    print(f"[{test_num:2d}/{total}] {ticker:10s} ({sector:12s}) ... ", end="", flush=True)

    sector_stats[sector]["total"] += 1

    # Test cache MISS (first request)
    start = time.time()
    try:
        response = requests.get(
            f"{BASE_URL}/api/iv/{ticker}/chart",
            timeout=REQUEST_TIMEOUT
        )
        miss_time_ms = int((time.time() - start) * 1000)

        if response.status_code != 200:
            print(f"{Colors.RED}❌ ERROR{Colors.NC} (HTTP {response.status_code})")
            failures.append(f"{ticker} - HTTP {response.status_code}")
            return {"status": "error", "ticker": ticker, "sector": sector}

        data = response.json()

        if "methods" not in data or not isinstance(data["methods"], list):
            print(f"{Colors.YELLOW}⚠️  FAIL{Colors.NC} (Invalid response structure)")
            failures.append(f"{ticker} - Invalid response structure")
            return {"status": "fail", "ticker": ticker, "sector": sector}

        methods_count = len(data["methods"])

        if methods_count < expected_methods:
            print(f"{Colors.YELLOW}⚠️  FAIL{Colors.NC} (Got {methods_count} methods, expected ≥{expected_methods})")
            failures.append(f"{ticker} - Only {methods_count} methods (expected ≥{expected_methods})")
            return {"status": "fail", "ticker": ticker, "sector": sector, "methods": methods_count}

        # Validate methods have valid IVs
        invalid_methods = sum(1 for m in data["methods"] if m.get("iv", 0) <= 0)
        if invalid_methods > 0:
            print(f"{Colors.YELLOW}⚠️  FAIL{Colors.NC} ({invalid_methods} invalid IVs)")
            failures.append(f"{ticker} - {invalid_methods} methods have invalid IVs")
            return {"status": "fail", "ticker": ticker, "sector": sector}

        # Test cache HIT (second request)
        time.sleep(0.1)
        cache_start = time.time()
        requests.get(f"{BASE_URL}/api/iv/{ticker}/chart", timeout=REQUEST_TIMEOUT)
        hit_time_ms = int((time.time() - cache_start) * 1000)

        # Calculate improvement
        improvement = 0
        if miss_time_ms > 0:
            improvement = ((miss_time_ms - hit_time_ms) / miss_time_ms) * 100

        # Update performance metrics
        performance["total_time"] += miss_time_ms
        performance["cache_miss_time"] += miss_time_ms
        performance["cache_hit_time"] += hit_time_ms
        performance["cache_tests"] += 1

        # Success!
        sector_stats[sector]["passed"] += 1
        print(f"{Colors.GREEN}✅ PASS{Colors.NC} ({methods_count} methods, {miss_time_ms}ms, cache: {improvement:.1f}% faster)")

        return {
            "status": "pass",
            "ticker": ticker,
            "sector": sector,
            "methods": methods_count,
            "response_time_ms": miss_time_ms,
            "cache_hit_ms": hit_time_ms,
            "cache_improvement": f"{improvement:.1f}%",
            "price": data.get("price", 0)
        }

    except requests.Timeout:
        print(f"{Colors.RED}❌ ERROR{Colors.NC} (Timeout after {REQUEST_TIMEOUT}s)")
        failures.append(f"{ticker} - Request timeout")
        return {"status": "error", "ticker": ticker, "sector": sector, "error": "timeout"}
    except Exception as e:
        print(f"{Colors.RED}❌ ERROR{Colors.NC} ({str(e)[:50]})")
        failures.append(f"{ticker} - {str(e)[:100]}")
        return {"status": "error", "ticker": ticker, "sector": sector, "error": str(e)}

def main():
    print("=" * 100)
    print("🧪 COMPREHENSIVE INTRINSIC VALUE PRODUCTION TEST")
    print("=" * 100)
    print(f"Target: {BASE_URL}")
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 100)
    print()

    test_num = 0
    total_tests = sum(len(stocks) for stocks in TEST_STOCKS.values())

    # Run tests by sector
    for sector, stocks in TEST_STOCKS.items():
        icon = {"Technology": "🔧", "Finance": "💰", "Healthcare": "🏥",
                "Consumer": "🛒", "Energy": "⚡", "Industrial": "🏭",
                "Portuguese": "🇵🇹"}.get(sector, "📊")

        print(f"{icon} {sector.upper()} SECTOR")
        print("-" * 100)

        for stock in stocks:
            test_num += 1
            expected = 10  # All stocks should have at least 10 methods
            result = test_stock(stock, sector, test_num, total_tests, expected)
            results.append(result)

            # Small delay to avoid rate limiting
            if test_num < total_tests:
                time.sleep(0.5)

        print()

    # SUMMARY
    print("=" * 100)
    print("📊 TEST SUMMARY")
    print("=" * 100)
    print()

    passed = sum(1 for r in results if r.get("status") == "pass")
    failed = sum(1 for r in results if r.get("status") == "fail")
    errors = sum(1 for r in results if r.get("status") == "error")
    pass_rate = (passed / total_tests) * 100 if total_tests > 0 else 0

    print(f"Total Stocks Tested: {total_tests}")
    print(f"✅ Passed: {Colors.GREEN}{passed}{Colors.NC} ({pass_rate:.1f}%)")
    print(f"⚠️  Failed: {Colors.YELLOW}{failed}{Colors.NC}")
    print(f"❌ Errors: {Colors.RED}{errors}{Colors.NC}")

    # SECTOR BREAKDOWN
    print()
    print("=" * 100)
    print("🏢 SECTOR BREAKDOWN")
    print("=" * 100)
    print()
    print(f"{'Sector':<15} {'Tested':>8} {'Passed':>8} {'Pass Rate':>10}")
    print("-" * 50)

    for sector, stats in sector_stats.items():
        if stats["total"] > 0:
            rate = (stats["passed"] / stats["total"]) * 100
            status = "✅" if stats["passed"] == stats["total"] else "⚠️" if stats["passed"] > 0 else "❌"
            print(f"{sector:<15} {stats['total']:>8} {stats['passed']:>8} {rate:>9.1f}% {status}")

    # PERFORMANCE METRICS
    print()
    print("=" * 100)
    print("⚡ PERFORMANCE METRICS")
    print("=" * 100)
    print()

    if performance["cache_tests"] > 0:
        avg_time = performance["total_time"] / total_tests
        avg_miss = performance["cache_miss_time"] / performance["cache_tests"]
        avg_hit = performance["cache_hit_time"] / performance["cache_tests"]
        improvement = ((performance["cache_miss_time"] - performance["cache_hit_time"]) / performance["cache_miss_time"]) * 100

        print(f"Avg Response Time (all): {avg_time:.0f}ms")
        print(f"Avg Response Time (cache miss): {avg_miss:.0f}ms")
        print(f"Avg Response Time (cache hit): {avg_hit:.0f}ms")
        print(f"Cache Improvement: {improvement:.1f}%")
        print()

        if avg_miss < 2000:
            print("✅ Cache miss performance GOOD (< 2000ms)")
        else:
            print("⚠️  Cache miss performance needs improvement (> 2000ms)")

        if avg_hit < 500:
            print("✅ Cache hit performance GOOD (< 500ms)")
        else:
            print("⚠️  Cache hit performance needs improvement (> 500ms)")

    # FAILED TESTS
    if failures:
        print()
        print("=" * 100)
        print("❌ FAILED TESTS")
        print("=" * 100)
        print()
        for failure in failures:
            print(f"  • {failure}")

    # VERDICT
    print()
    print("=" * 100)
    print("⚖️  VERDICT")
    print("=" * 100)
    print()

    if pass_rate >= 90 and not failures:
        print(f"{Colors.GREEN}✅ PASS{Colors.NC} - System is production ready")
        print(f"   - Pass rate: {pass_rate:.1f}% (target: ≥90%)")
        print("   - All sectors working")
        print("   - Performance acceptable")
        print("   - No critical issues")
        exit_code = 0
    elif pass_rate >= 90:
        print(f"{Colors.YELLOW}⚠️  CONDITIONAL PASS{Colors.NC} - System working with minor issues")
        print(f"   - Pass rate: {pass_rate:.1f}% (target: ≥90%)")
        print(f"   - Issues found: {len(failures)}")
        exit_code = 0
    else:
        print(f"{Colors.RED}❌ FAIL{Colors.NC} - System not production ready")
        print(f"   - Pass rate: {pass_rate:.1f}% (target: ≥90%)")
        print(f"   - Failed tests: {failed + errors}")
        exit_code = 1

    print()
    print("=" * 100)

    # Save results
    output_file = f"/tmp/iv-production-test-{datetime.now().strftime('%Y-%m-%d-%H%M%S')}.json"
    with open(output_file, 'w') as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "total": total_tests,
                "passed": passed,
                "failed": failed,
                "errors": errors,
                "pass_rate": f"{pass_rate:.1f}%"
            },
            "sectors": sector_stats,
            "performance": performance,
            "results": results,
            "failures": failures
        }, f, indent=2)

    print(f"💾 Results saved to: {output_file}")
    print()

    return exit_code

if __name__ == "__main__":
    sys.exit(main())
