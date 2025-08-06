#!/bin/bash

# Monitor Load Test Script for Alfalyzer
# Monitors Redis, Database, and Server metrics during load testing

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Configuration
REDIS_HOST="128.140.45.28"
REDIS_PASSWORD="${REDIS_PASSWORD}"
API_URL="http://jsg00k40sgo0k4swsoc4gcsg.128.140.45.28.sslip.io"
MONITOR_INTERVAL=5  # seconds
LOG_FILE="load-test-monitor.log"

echo -e "${BLUE}===== ALFALYZER LOAD TEST MONITOR =====${NC}"
echo -e "${BLUE}Starting monitoring at $(date)${NC}"
echo "Monitoring interval: ${MONITOR_INTERVAL} seconds"
echo "Log file: ${LOG_FILE}"
echo ""

# Create log file header
echo "Timestamp,Redis_Memory_MB,Redis_Keys,DB_Size_MB,API_Response_MS,Cache_Hit_Rate,Active_Connections" > $LOG_FILE

# Function to get Redis metrics
get_redis_metrics() {
    if [ -z "$REDIS_PASSWORD" ]; then
        echo -e "${RED}Error: REDIS_PASSWORD not set${NC}"
        return 1
    fi
    
    REDIS_INFO=$(redis-cli -h $REDIS_HOST -a "$REDIS_PASSWORD" --no-auth-warning INFO memory 2>/dev/null || echo "ERROR")
    
    if [ "$REDIS_INFO" == "ERROR" ]; then
        echo "0,0"
        return
    fi
    
    MEMORY_MB=$(echo "$REDIS_INFO" | grep "used_memory:" | cut -d: -f2 | tr -d '\r' | awk '{printf "%.2f", $1/1024/1024}')
    KEYS=$(redis-cli -h $REDIS_HOST -a "$REDIS_PASSWORD" --no-auth-warning DBSIZE 2>/dev/null | cut -d' ' -f2 || echo "0")
    
    echo "${MEMORY_MB:-0},${KEYS:-0}"
}

# Function to get database size
get_db_size() {
    if [ -z "$DATABASE_URL" ]; then
        echo "0"
        return
    fi
    
    DB_SIZE=$(psql "$DATABASE_URL" -t -c "SELECT pg_database_size(current_database())/1024/1024 as mb;" 2>/dev/null | tr -d ' ' || echo "0")
    echo "${DB_SIZE:-0}"
}

# Function to test API response time
test_api_response() {
    START_TIME=$(date +%s%3N)
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${API_URL}/api/health" 2>/dev/null || echo "000")
    END_TIME=$(date +%s%3N)
    
    if [ "$HTTP_CODE" == "200" ]; then
        RESPONSE_TIME=$((END_TIME - START_TIME))
        echo "$RESPONSE_TIME"
    else
        echo "9999"  # Error response
    fi
}

# Function to get cache hit rate
get_cache_hit_rate() {
    CACHE_STATUS=$(curl -s --max-time 5 "${API_URL}/api/cache/status" 2>/dev/null || echo "{}")
    HIT_RATE=$(echo "$CACHE_STATUS" | grep -o '"hitRate":[0-9.]*' | cut -d: -f2 || echo "0")
    echo "${HIT_RATE:-0}"
}

# Function to get active connections
get_active_connections() {
    # Try to get from API health endpoint
    HEALTH=$(curl -s --max-time 5 "${API_URL}/api/health" 2>/dev/null || echo "{}")
    CONNECTIONS=$(echo "$HEALTH" | grep -o '"activeConnections":[0-9]*' | cut -d: -f2 || echo "0")
    echo "${CONNECTIONS:-0}"
}

# Function to display metrics
display_metrics() {
    local TIMESTAMP=$1
    local REDIS_MEM=$2
    local REDIS_KEYS=$3
    local DB_SIZE=$4
    local API_RESPONSE=$5
    local CACHE_HIT=$6
    local CONNECTIONS=$7
    
    echo -e "\n${GREEN}=== Metrics at $(date '+%H:%M:%S') ===${NC}"
    
    # Redis metrics
    echo -e "${BLUE}Redis:${NC}"
    echo -e "  Memory: ${REDIS_MEM} MB"
    echo -e "  Keys: ${REDIS_KEYS}"
    
    # Database metrics
    echo -e "${BLUE}Database:${NC}"
    echo -e "  Size: ${DB_SIZE} MB"
    
    # API metrics
    echo -e "${BLUE}API:${NC}"
    if [ "$API_RESPONSE" -eq 9999 ]; then
        echo -e "  Response: ${RED}ERROR${NC}"
    elif [ "$API_RESPONSE" -gt 1000 ]; then
        echo -e "  Response: ${YELLOW}${API_RESPONSE}ms${NC}"
    else
        echo -e "  Response: ${GREEN}${API_RESPONSE}ms${NC}"
    fi
    echo -e "  Cache Hit Rate: ${CACHE_HIT}%"
    echo -e "  Active Connections: ${CONNECTIONS}"
    
    # Warnings
    if (( $(echo "$REDIS_MEM > 200" | bc -l) )); then
        echo -e "\n${YELLOW}⚠️  WARNING: Redis memory approaching limit (${REDIS_MEM}/256 MB)${NC}"
    fi
    
    if (( $(echo "$DB_SIZE > 400" | bc -l) )); then
        echo -e "${YELLOW}⚠️  WARNING: Database size approaching limit (${DB_SIZE}/500 MB)${NC}"
    fi
    
    if [ "$API_RESPONSE" -gt 2000 ]; then
        echo -e "${RED}⚠️  WARNING: API response time degraded (${API_RESPONSE}ms)${NC}"
    fi
}

# Function to generate summary report
generate_summary() {
    echo -e "\n${BLUE}===== LOAD TEST SUMMARY =====${NC}"
    echo -e "Test ended at $(date)"
    echo ""
    
    # Calculate averages from log file
    if [ -f "$LOG_FILE" ]; then
        AVG_REDIS=$(awk -F',' 'NR>1 {sum+=$2; count++} END {if(count>0) printf "%.2f", sum/count; else print "0"}' $LOG_FILE)
        MAX_REDIS=$(awk -F',' 'NR>1 {if($2>max) max=$2} END {print max+0}' $LOG_FILE)
        AVG_RESPONSE=$(awk -F',' 'NR>1 && $5<9999 {sum+=$5; count++} END {if(count>0) printf "%.0f", sum/count; else print "0"}' $LOG_FILE)
        MAX_RESPONSE=$(awk -F',' 'NR>1 && $5<9999 {if($5>max) max=$5} END {print int(max)+0}' $LOG_FILE)
        AVG_CACHE_HIT=$(awk -F',' 'NR>1 {sum+=$6; count++} END {if(count>0) printf "%.1f", sum/count; else print "0"}' $LOG_FILE)
        ERROR_COUNT=$(awk -F',' 'NR>1 {if($5==9999) count++} END {print count+0}' $LOG_FILE)
        
        echo -e "${GREEN}Redis Memory:${NC}"
        echo -e "  Average: ${AVG_REDIS} MB"
        echo -e "  Maximum: ${MAX_REDIS} MB"
        echo ""
        
        echo -e "${GREEN}API Response Time:${NC}"
        echo -e "  Average: ${AVG_RESPONSE}ms"
        echo -e "  Maximum: ${MAX_RESPONSE}ms"
        echo -e "  Errors: ${ERROR_COUNT}"
        echo ""
        
        echo -e "${GREEN}Cache Performance:${NC}"
        echo -e "  Average Hit Rate: ${AVG_CACHE_HIT}%"
    fi
}

# Trap to handle script termination
trap 'generate_summary; exit 0' INT TERM

# Main monitoring loop
echo -e "${GREEN}Starting continuous monitoring... Press Ctrl+C to stop${NC}"
echo ""

ITERATION=0
while true; do
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Collect metrics
    REDIS_METRICS=$(get_redis_metrics)
    REDIS_MEM=$(echo "$REDIS_METRICS" | cut -d',' -f1)
    REDIS_KEYS=$(echo "$REDIS_METRICS" | cut -d',' -f2)
    DB_SIZE=$(get_db_size)
    API_RESPONSE=$(test_api_response)
    CACHE_HIT=$(get_cache_hit_rate)
    CONNECTIONS=$(get_active_connections)
    
    # Log to file
    echo "${TIMESTAMP},${REDIS_MEM},${REDIS_KEYS},${DB_SIZE},${API_RESPONSE},${CACHE_HIT},${CONNECTIONS}" >> $LOG_FILE
    
    # Display every 3rd iteration (every 15 seconds) to reduce noise
    if [ $((ITERATION % 3)) -eq 0 ]; then
        display_metrics "$TIMESTAMP" "$REDIS_MEM" "$REDIS_KEYS" "$DB_SIZE" "$API_RESPONSE" "$CACHE_HIT" "$CONNECTIONS"
    fi
    
    ITERATION=$((ITERATION + 1))
    sleep $MONITOR_INTERVAL
done