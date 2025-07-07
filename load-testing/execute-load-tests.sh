#!/bin/bash

# ALFALYZER LOAD TESTING EXECUTION SCRIPT
# Comprehensive load testing suite with system monitoring

set -e

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3001}"
LOG_DIR="load-testing/results/$(date +%Y%m%d_%H%M%S)"
SYSTEM_MONITOR_PID=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Ensure load testing tools are installed
check_prerequisites() {
    echo -e "${BLUE}🔍 Checking prerequisites...${NC}"
    
    # Check k6
    if ! command -v k6 &> /dev/null; then
        echo -e "${RED}❌ k6 not found. Installing...${NC}"
        if command -v brew &> /dev/null; then
            brew install k6
        else
            echo "Please install k6: https://k6.io/docs/getting-started/installation/"
            exit 1
        fi
    fi
    
    # Check Artillery
    if ! command -v artillery &> /dev/null; then
        echo -e "${YELLOW}⚠️ Artillery not found. Installing...${NC}"
        npm install -g artillery
    fi
    
    # Check if server is running
    if ! curl -s "${BASE_URL}/health" > /dev/null; then
        echo -e "${RED}❌ Server not responding at ${BASE_URL}${NC}"
        echo "Please start the Alfalyzer server first:"
        echo "npm run dev"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Prerequisites checked${NC}"
}

# Create results directory
setup_logging() {
    mkdir -p "${LOG_DIR}"
    echo -e "${BLUE}📁 Results will be saved to: ${LOG_DIR}${NC}"
    
    # Create test summary file
    cat > "${LOG_DIR}/test-summary.md" << EOF
# Alfalyzer Load Testing Results
**Test Date:** $(date)
**Base URL:** ${BASE_URL}
**Test Duration:** Progressive testing over ~4 hours

## Expected Results Based on Analysis:
- **Rate Limiting:** Will trigger at 10+ users (limits: 5-30 req/min)
- **Database Bottleneck:** SQLite contention at 20-30 concurrent writes
- **Memory Growth:** Linear growth with WebSocket connections
- **Response Times:** Middleware adds 20-50ms base latency

## Test Phases:
1. **Baseline (1 user):** Establish performance baseline
2. **Phase 1 (10 users):** Expect rate limiting to start
3. **Phase 2 (50 users):** Expect severe bottlenecks
4. **Phase 3 (100 users):** Target capacity test
5. **Spike Test (200 users):** Sudden load spike
6. **Soak Test (50 users, 2h):** Memory leak detection

EOF
}

# Monitor system resources during tests
start_system_monitoring() {
    echo -e "${BLUE}📊 Starting system monitoring...${NC}"
    
    # System resource monitoring
    (
        echo "timestamp,cpu_percent,memory_mb,disk_io,network_rx,network_tx" > "${LOG_DIR}/system-metrics.csv"
        while true; do
            timestamp=$(date '+%Y-%m-%d %H:%M:%S')
            
            # Get CPU usage
            cpu=$(top -l 1 | grep "CPU usage" | awk '{print $3}' | sed 's/%//' || echo "0")
            
            # Get memory usage in MB
            memory=$(ps -o pid,rss -p $(pgrep -f "node.*server/index.ts" || echo "0") | tail -1 | awk '{print $2/1024}' || echo "0")
            
            # Basic disk and network (simplified for macOS)
            disk_io="0"
            network_rx="0"
            network_tx="0"
            
            echo "${timestamp},${cpu},${memory},${disk_io},${network_rx},${network_tx}" >> "${LOG_DIR}/system-metrics.csv"
            sleep 10
        done
    ) &
    SYSTEM_MONITOR_PID=$!
    
    # Application-specific monitoring
    (
        echo "timestamp,response_time_ms,active_connections,cache_size_mb,db_queries_sec" > "${LOG_DIR}/app-metrics.csv"
        while true; do
            timestamp=$(date '+%Y-%m-%d %H:%M:%S')
            
            # Test response time
            start_time=$(date +%s%3N)
            curl -s "${BASE_URL}/health" > /dev/null
            end_time=$(date +%s%3N)
            response_time=$((end_time - start_time))
            
            # Placeholder for other metrics (would require app instrumentation)
            active_connections="0"
            cache_size="0"
            db_queries="0"
            
            echo "${timestamp},${response_time},${active_connections},${cache_size},${db_queries}" >> "${LOG_DIR}/app-metrics.csv"
            sleep 15
        done
    ) &
    echo $! > "${LOG_DIR}/app-monitor.pid"
}

# Stop monitoring
stop_system_monitoring() {
    echo -e "${BLUE}🛑 Stopping system monitoring...${NC}"
    if [ ! -z "$SYSTEM_MONITOR_PID" ]; then
        kill $SYSTEM_MONITOR_PID 2>/dev/null || true
    fi
    
    if [ -f "${LOG_DIR}/app-monitor.pid" ]; then
        kill $(cat "${LOG_DIR}/app-monitor.pid") 2>/dev/null || true
        rm "${LOG_DIR}/app-monitor.pid"
    fi
}

# Execute k6 progressive load tests
run_k6_tests() {
    echo -e "${GREEN}🚀 Starting k6 Progressive Load Tests...${NC}"
    echo -e "${YELLOW}⚠️ These tests will run for ~3 hours total${NC}"
    
    # Set environment variables for k6
    export BASE_URL
    
    # Run the comprehensive test suite
    k6 run \
        --out json="${LOG_DIR}/k6-results.json" \
        --summary-export="${LOG_DIR}/k6-summary.json" \
        load-testing/k6-load-test-suite.js \
        > "${LOG_DIR}/k6-console-output.log" 2>&1
    
    echo -e "${GREEN}✅ k6 tests completed${NC}"
}

# Execute Artillery advanced scenarios
run_artillery_tests() {
    echo -e "${GREEN}🎯 Starting Artillery Advanced Scenarios...${NC}"
    
    # Run specific bottleneck tests
    artillery run \
        --output "${LOG_DIR}/artillery-results.json" \
        load-testing/artillery-advanced-scenarios.yml \
        > "${LOG_DIR}/artillery-console-output.log" 2>&1
    
    # Generate HTML report
    artillery report \
        "${LOG_DIR}/artillery-results.json" \
        --output "${LOG_DIR}/artillery-report.html"
    
    echo -e "${GREEN}✅ Artillery tests completed${NC}"
}

# Database performance specific tests
run_database_stress_test() {
    echo -e "${GREEN}🗃️ Running SQLite Database Stress Test...${NC}"
    
    # Test concurrent database operations
    cat > "${LOG_DIR}/db-stress-test.js" << 'EOF'
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  scenarios: {
    db_writes: {
      executor: 'constant-vus',
      vus: 20,
      duration: '5m',
      exec: 'writeOperations',
    },
    db_reads: {
      executor: 'constant-vus', 
      vus: 30,
      duration: '5m',
      exec: 'readOperations',
    },
  },
};

export function writeOperations() {
  // Simulate operations that write to database
  const response = http.get(`${__ENV.BASE_URL}/api/stocks/search?q=test${Math.random()}`);
  check(response, {
    'db_write_success': (r) => r.status === 200 || r.status === 429,
  });
}

export function readOperations() {
  // Simulate read-heavy operations
  const symbols = ['AAPL', 'MSFT', 'GOOGL'];
  const symbol = symbols[Math.floor(Math.random() * symbols.length)];
  const response = http.get(`${__ENV.BASE_URL}/api/stocks/${symbol}`);
  check(response, {
    'db_read_success': (r) => r.status === 200 || r.status === 429,
  });
}
EOF

    k6 run \
        --out json="${LOG_DIR}/db-stress-results.json" \
        "${LOG_DIR}/db-stress-test.js"
    
    echo -e "${GREEN}✅ Database stress test completed${NC}"
}

# WebSocket load testing
run_websocket_tests() {
    echo -e "${GREEN}🔌 Running WebSocket Load Test...${NC}"
    
    cat > "${LOG_DIR}/websocket-test.js" << 'EOF'
import ws from 'k6/ws';
import { check } from 'k6';

export let options = {
  scenarios: {
    websocket_connections: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '5m', target: 50 },
        { duration: '1m', target: 0 },
      ],
    },
  },
};

export default function () {
  const url = `ws://localhost:3001`;
  const params = { tags: { test_type: 'websocket' } };

  const response = ws.connect(url, params, function (socket) {
    socket.on('open', () => {
      console.log('WebSocket connection opened');
      
      // Send subscription message
      socket.send(JSON.stringify({
        action: 'subscribe',
        symbols: ['AAPL', 'MSFT']
      }));
    });

    socket.on('message', (data) => {
      check(data, {
        'message_received': (msg) => msg.length > 0,
      });
    });

    socket.on('close', () => {
      console.log('WebSocket connection closed');
    });

    socket.on('error', (e) => {
      console.log('WebSocket error:', e.error);
    });

    // Keep connection alive for testing
    setTimeout(() => {
      socket.close();
    }, 30000);
  });

  check(response, {
    'websocket_connected': (r) => r && r.status === 101,
  });
}
EOF

    k6 run \
        --out json="${LOG_DIR}/websocket-results.json" \
        "${LOG_DIR}/websocket-test.js" || echo "WebSocket test may have failed (expected if WS disabled)"
    
    echo -e "${GREEN}✅ WebSocket test completed${NC}"
}

# Generate comprehensive report
generate_report() {
    echo -e "${BLUE}📊 Generating comprehensive report...${NC}"
    
    cat > "${LOG_DIR}/load-test-report.html" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Alfalyzer Load Testing Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; }
        .critical { background-color: #ffebee; border-color: #f44336; }
        .warning { background-color: #fff3e0; border-color: #ff9800; }
        .success { background-color: #e8f5e8; border-color: #4caf50; }
        .metric { display: inline-block; margin: 10px; padding: 10px; background: #f5f5f5; }
        pre { background: #f5f5f5; padding: 10px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>🔍 Alfalyzer Load Testing Report</h1>
    <p><strong>Generated:</strong> $(date)</p>
    <p><strong>Base URL:</strong> ${BASE_URL}</p>
    
    <div class="section warning">
        <h2>⚠️ Expected Issues (Based on Architecture Analysis)</h2>
        <ul>
            <li><strong>Rate Limiting:</strong> System limits of 5-30 req/min will cause throttling at 10+ users</li>
            <li><strong>SQLite Bottleneck:</strong> Database contention expected at 20-30 concurrent operations</li>
            <li><strong>Memory Growth:</strong> Linear memory usage with WebSocket connections</li>
            <li><strong>Middleware Latency:</strong> 15+ middleware layers add 20-50ms base latency</li>
        </ul>
    </div>
    
    <div class="section">
        <h2>📈 Test Results Summary</h2>
        <p>Detailed results available in:</p>
        <ul>
            <li>k6-results.json - Complete k6 metrics</li>
            <li>artillery-report.html - Artillery visual report</li>
            <li>system-metrics.csv - System resource usage</li>
            <li>app-metrics.csv - Application performance metrics</li>
        </ul>
    </div>
    
    <div class="section">
        <h2>🎯 Key Findings</h2>
        <p><em>Update this section with actual test results</em></p>
        
        <div class="metric">
            <h3>Response Times</h3>
            <p>Check k6-summary.json for percentiles</p>
        </div>
        
        <div class="metric">
            <h3>Error Rates</h3>
            <p>Expected: High due to rate limiting</p>
        </div>
        
        <div class="metric">
            <h3>Bottlenecks</h3>
            <p>Primary: Rate limiting, Secondary: SQLite</p>
        </div>
    </div>
    
    <div class="section critical">
        <h2>🚨 Recommendations</h2>
        <ol>
            <li><strong>Increase Rate Limits:</strong> Current limits too restrictive for production</li>
            <li><strong>Database Optimization:</strong> Consider PostgreSQL for concurrent load</li>
            <li><strong>Caching Strategy:</strong> Expand cache TTLs and implement Redis</li>
            <li><strong>Middleware Optimization:</strong> Review necessity of all middleware layers</li>
            <li><strong>Load Balancing:</strong> Horizontal scaling will be necessary</li>
        </ol>
    </div>
</body>
</html>
EOF

    echo -e "${GREEN}✅ Report generated: ${LOG_DIR}/load-test-report.html${NC}"
}

# Main execution function
main() {
    echo -e "${BLUE}🚀 ALFALYZER LOAD TESTING SUITE${NC}"
    echo -e "${BLUE}===================================${NC}"
    
    # Setup
    check_prerequisites
    setup_logging
    
    # Start monitoring
    start_system_monitoring
    
    # Trap to ensure cleanup on exit
    trap 'stop_system_monitoring' EXIT
    
    echo -e "${YELLOW}Starting progressive load testing...${NC}"
    echo -e "${YELLOW}This will take approximately 4 hours to complete.${NC}"
    read -p "Continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Test cancelled."
        exit 0
    fi
    
    # Execute test phases
    echo -e "${GREEN}Phase 1: k6 Progressive Load Tests${NC}"
    run_k6_tests
    
    echo -e "${GREEN}Phase 2: Artillery Advanced Scenarios${NC}"
    run_artillery_tests
    
    echo -e "${GREEN}Phase 3: Database Stress Test${NC}"
    run_database_stress_test
    
    echo -e "${GREEN}Phase 4: WebSocket Load Test${NC}"
    run_websocket_tests
    
    # Generate final report
    generate_report
    
    echo -e "${GREEN}🎉 Load testing completed!${NC}"
    echo -e "${BLUE}Results available in: ${LOG_DIR}${NC}"
    echo -e "${BLUE}Open the HTML report: ${LOG_DIR}/load-test-report.html${NC}"
}

# Execute main function
main "$@"