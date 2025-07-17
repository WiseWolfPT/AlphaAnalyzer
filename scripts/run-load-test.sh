#!/bin/bash

# Alfalyzer Load Testing Script
# Runs comprehensive load tests with k6

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
API_URL="${API_URL:-http://localhost:3001}"
RESULTS_DIR="./load-test-results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo -e "${BLUE}🚀 Alfalyzer Load Testing Suite${NC}"
echo -e "${BLUE}================================${NC}"

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}❌ k6 is not installed${NC}"
    echo -e "${YELLOW}Installing k6...${NC}"
    
    # Install k6 based on OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install k6
        else
            echo -e "${RED}Please install Homebrew first: https://brew.sh${NC}"
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        sudo gpg -k
        sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
        echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
        sudo apt-get update
        sudo apt-get install k6
    else
        echo -e "${RED}Unsupported OS. Please install k6 manually: https://k6.io/docs/getting-started/installation/${NC}"
        exit 1
    fi
fi

# Create results directory
mkdir -p "$RESULTS_DIR"

echo -e "${GREEN}✅ k6 is installed${NC}"
echo -e "${BLUE}Base URL: $BASE_URL${NC}"
echo -e "${BLUE}API URL: $API_URL${NC}"
echo ""

# Function to run a specific test
run_test() {
    local test_name="$1"
    local test_file="$2"
    local extra_options="$3"
    
    echo -e "${YELLOW}🧪 Running $test_name...${NC}"
    
    local output_file="$RESULTS_DIR/${test_name}_${TIMESTAMP}.json"
    local summary_file="$RESULTS_DIR/${test_name}_${TIMESTAMP}_summary.txt"
    
    # Run k6 test with JSON output and summary
    k6 run \
        --out json="$output_file" \
        --summary-export="$summary_file" \
        -e BASE_URL="$BASE_URL" \
        -e API_URL="$API_URL" \
        $extra_options \
        "$test_file"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $test_name completed successfully${NC}"
        echo -e "${GREEN}Results saved to: $output_file${NC}"
        echo -e "${GREEN}Summary saved to: $summary_file${NC}"
    else
        echo -e "${RED}❌ $test_name failed${NC}"
        return 1
    fi
    
    echo ""
}

# Function to check backend health
check_backend() {
    echo -e "${YELLOW}🔍 Checking backend health...${NC}"
    
    if curl -sf "$API_URL/api/health" > /dev/null; then
        echo -e "${GREEN}✅ Backend is healthy${NC}"
    else
        echo -e "${RED}❌ Backend is not responding at $API_URL${NC}"
        echo -e "${YELLOW}Please start the backend server before running load tests${NC}"
        exit 1
    fi
    echo ""
}

# Function to analyze results
analyze_results() {
    echo -e "${BLUE}📊 Load Test Analysis${NC}"
    echo -e "${BLUE}====================${NC}"
    
    # Find the most recent test results
    local latest_result=$(ls -t "$RESULTS_DIR"/*.json 2>/dev/null | head -1)
    local latest_summary=$(ls -t "$RESULTS_DIR"/*_summary.txt 2>/dev/null | head -1)
    
    if [ -n "$latest_summary" ]; then
        echo -e "${GREEN}Latest test summary:${NC}"
        cat "$latest_summary"
        echo ""
    fi
    
    if [ -n "$latest_result" ]; then
        echo -e "${GREEN}Key metrics from latest test:${NC}"
        
        # Extract key metrics using jq if available
        if command -v jq &> /dev/null; then
            echo "Analyzing detailed metrics..."
            
            # Calculate some basic stats
            local total_requests=$(grep -c '"type":"Point"' "$latest_result" || echo "0")
            local error_requests=$(grep '"metric":"http_req_failed"' "$latest_result" | grep '"value":1' | wc -l || echo "0")
            
            echo "Total requests: $total_requests"
            echo "Failed requests: $error_requests"
            
            if [ "$total_requests" -gt 0 ]; then
                local error_rate=$(echo "scale=2; $error_requests * 100 / $total_requests" | bc -l 2>/dev/null || echo "0")
                echo "Error rate: ${error_rate}%"
            fi
        else
            echo -e "${YELLOW}Install jq for detailed metrics analysis: brew install jq${NC}"
        fi
        
        echo ""
    fi
}

# Main menu
show_menu() {
    echo -e "${BLUE}Select test type:${NC}"
    echo "1) Quick Test (50 users, 5 minutes)"
    echo "2) Standard Load Test (200 users, 15 minutes)"
    echo "3) Stress Test (500 users, 20 minutes)"
    echo "4) All Tests (Sequential)"
    echo "5) Custom Test"
    echo "6) Analyze Previous Results"
    echo "7) Exit"
    echo ""
    read -p "Choose option (1-7): " choice
}

# Check prerequisites
check_backend

# Show menu and handle selection
while true; do
    show_menu
    
    case $choice in
        1)
            echo -e "${YELLOW}Running Quick Test...${NC}"
            run_test "quick_test" "./k6-load-test.js" "--vus 50 --duration 5m"
            ;;
        2)
            echo -e "${YELLOW}Running Standard Load Test...${NC}"
            run_test "standard_load" "./k6-load-test.js"
            ;;
        3)
            echo -e "${YELLOW}Running Stress Test...${NC}"
            run_test "stress_test" "./k6-load-test.js" "--vus 500 --duration 20m"
            ;;
        4)
            echo -e "${YELLOW}Running All Tests...${NC}"
            run_test "quick_test" "./k6-load-test.js" "--vus 50 --duration 5m"
            sleep 30  # Cool down between tests
            run_test "standard_load" "./k6-load-test.js"
            sleep 60  # Cool down between tests
            run_test "stress_test" "./k6-load-test.js" "--vus 500 --duration 20m"
            echo -e "${GREEN}🎉 All tests completed!${NC}"
            ;;
        5)
            read -p "Enter number of virtual users: " vus
            read -p "Enter test duration (e.g., 10m, 300s): " duration
            run_test "custom_test" "./k6-load-test.js" "--vus $vus --duration $duration"
            ;;
        6)
            analyze_results
            ;;
        7)
            echo -e "${GREEN}Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid option. Please choose 1-7.${NC}"
            ;;
    esac
    
    echo ""
    read -p "Press Enter to continue..."
    echo ""
done