#!/bin/bash

# 🔧 BULLETPROOF PORT MANAGER
# Advanced port management, conflict resolution, and process cleanup

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly ROOT_DIR="$(dirname "$SCRIPT_DIR")"
readonly LOG_DIR="$ROOT_DIR/logs"
readonly PID_DIR="$ROOT_DIR/pids"

# Default ports
readonly DEFAULT_BACKEND_PORT=3001
readonly DEFAULT_FRONTEND_PORT=3000
readonly DEFAULT_VITE_HMR_PORT=24678

# Port ranges
readonly PORT_RANGE_START=3000
readonly PORT_RANGE_END=3010
readonly SAFE_PORTS=(3000 3001 3002 3003 5000 5001 8000 8080 8081 9000)

# Process patterns to search for
readonly PROCESS_PATTERNS=(
    "tsx.*server/index.ts"
    "vite.*--port"
    "node.*server"
    "npm.*dev"
    "concurrently"
)

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1" | tee -a "$LOG_DIR/port-manager.log"
}

success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_DIR/port-manager.log"
}

error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$LOG_DIR/port-manager.log"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$LOG_DIR/port-manager.log"
}

info() {
    echo -e "${CYAN}ℹ️  $1${NC}" | tee -a "$LOG_DIR/port-manager.log"
}

# Initialize directories
init_directories() {
    mkdir -p "$LOG_DIR" "$PID_DIR"
    
    # Clean old logs (keep last 7 days)
    find "$LOG_DIR" -name "*.log" -mtime +7 -delete 2>/dev/null || true
    
    # Initialize log file
    touch "$LOG_DIR/port-manager.log"
    log "Port Manager initialized at $(date)"
}

# Check if port is in use
is_port_in_use() {
    local port=$1
    
    # Check using multiple methods for reliability
    if command -v lsof >/dev/null 2>&1; then
        lsof -i ":$port" >/dev/null 2>&1
    elif command -v netstat >/dev/null 2>&1; then
        netstat -an | grep ":$port " >/dev/null 2>&1
    elif command -v ss >/dev/null 2>&1; then
        ss -tuln | grep ":$port " >/dev/null 2>&1
    else
        # Fallback: try to bind to port
        if command -v nc >/dev/null 2>&1; then
            ! nc -z localhost "$port" 2>/dev/null
        else
            # Last resort: use built-in TCP test
            timeout 1 bash -c "echo >/dev/tcp/localhost/$port" 2>/dev/null
        fi
    fi
}

# Get process using port
get_port_process() {
    local port=$1
    
    if command -v lsof >/dev/null 2>&1; then
        lsof -i ":$port" 2>/dev/null | awk 'NR>1 {print $2, $1}' | head -1
    elif command -v netstat >/dev/null 2>&1; then
        netstat -tlnp 2>/dev/null | grep ":$port " | awk '{print $7}' | cut -d'/' -f1,2 | head -1
    elif command -v ss >/dev/null 2>&1; then
        ss -tlnp | grep ":$port " | awk '{print $6}' | cut -d',' -f2 | head -1
    else
        echo "unknown unknown"
    fi
}

# Find available port
find_available_port() {
    local start_port=${1:-$PORT_RANGE_START}
    local end_port=${2:-$PORT_RANGE_END}
    
    for port in $(seq "$start_port" "$end_port"); do
        if ! is_port_in_use "$port"; then
            echo "$port"
            return 0
        fi
    done
    
    # Try safe ports if range is exhausted
    for port in "${SAFE_PORTS[@]}"; do
        if ! is_port_in_use "$port"; then
            echo "$port"
            return 0
        fi
    done
    
    # Generate random port as last resort
    local random_port
    for _ in {1..10}; do
        random_port=$((RANDOM % 10000 + 10000))
        if ! is_port_in_use "$random_port"; then
            echo "$random_port"
            return 0
        fi
    done
    
    return 1
}

# Kill process by PID with timeout
kill_process_safe() {
    local pid=$1
    local name=${2:-"process"}
    local timeout=${3:-10}
    
    if ! kill -0 "$pid" 2>/dev/null; then
        success "Process $name (PID: $pid) already terminated"
        return 0
    fi
    
    info "Terminating $name (PID: $pid) gracefully..."
    
    # Try SIGTERM first
    if kill -TERM "$pid" 2>/dev/null; then
        local count=0
        while kill -0 "$pid" 2>/dev/null && [ $count -lt $timeout ]; do
            sleep 1
            ((count++))
        done
        
        if ! kill -0 "$pid" 2>/dev/null; then
            success "Process $name terminated gracefully"
            return 0
        fi
    fi
    
    warning "Process $name didn't respond to SIGTERM, using SIGKILL..."
    
    # Force kill if SIGTERM failed
    if kill -KILL "$pid" 2>/dev/null; then
        sleep 2
        if ! kill -0 "$pid" 2>/dev/null; then
            success "Process $name force-killed"
            return 0
        else
            error "Failed to kill process $name (PID: $pid)"
            return 1
        fi
    else
        error "Cannot kill process $name (PID: $pid) - permission denied or process doesn't exist"
        return 1
    fi
}

# Clean up processes by pattern
cleanup_processes_by_pattern() {
    local pattern=$1
    local process_name=${2:-"matching process"}
    
    info "Searching for processes matching: $pattern"
    
    local pids
    if command -v pgrep >/dev/null 2>&1; then
        pids=$(pgrep -f "$pattern" 2>/dev/null || true)
    else
        pids=$(ps aux | grep -E "$pattern" | grep -v grep | awk '{print $2}' || true)
    fi
    
    if [ -z "$pids" ]; then
        info "No $process_name found"
        return 0
    fi
    
    local count=0
    for pid in $pids; do
        if [ -n "$pid" ] && [ "$pid" != "$$" ]; then
            kill_process_safe "$pid" "$process_name" 10
            ((count++))
        fi
    done
    
    success "Cleaned up $count $process_name"
}

# Clean up port
cleanup_port() {
    local port=$1
    local force=${2:-false}
    
    if ! is_port_in_use "$port"; then
        success "Port $port is already free"
        return 0
    fi
    
    info "Port $port is in use, investigating..."
    
    local process_info
    process_info=$(get_port_process "$port")
    
    if [ "$process_info" = "unknown unknown" ]; then
        warning "Cannot identify process using port $port"
        if [ "$force" = true ]; then
            warning "Force cleanup requested but cannot identify process"
        fi
        return 1
    fi
    
    local pid process_name
    pid=$(echo "$process_info" | awk '{print $1}')
    process_name=$(echo "$process_info" | awk '{print $2}')
    
    if [ -z "$pid" ] || [ "$pid" = "-" ]; then
        warning "Cannot get PID for process using port $port"
        return 1
    fi
    
    info "Port $port is used by $process_name (PID: $pid)"
    
    # Check if it's one of our processes
    local is_our_process=false
    for pattern in "${PROCESS_PATTERNS[@]}"; do
        if ps -p "$pid" -o command= 2>/dev/null | grep -qE "$pattern"; then
            is_our_process=true
            break
        fi
    done
    
    if [ "$is_our_process" = true ] || [ "$force" = true ]; then
        info "Cleaning up process using port $port..."
        kill_process_safe "$pid" "$process_name" 15
        
        # Verify port is free
        sleep 2
        if ! is_port_in_use "$port"; then
            success "Port $port is now free"
            return 0
        else
            error "Port $port is still in use after cleanup"
            return 1
        fi
    else
        warning "Port $port is used by external process: $process_name (PID: $pid)"
        warning "Use --force to kill external processes"
        return 1
    fi
}

# Comprehensive cleanup
full_cleanup() {
    local force=${1:-false}
    
    log "Starting comprehensive cleanup..."
    
    # Clean up by process patterns
    for pattern in "${PROCESS_PATTERNS[@]}"; do
        cleanup_processes_by_pattern "$pattern" "development server"
    done
    
    # Clean up specific ports
    local ports_to_clean=($DEFAULT_BACKEND_PORT $DEFAULT_FRONTEND_PORT $DEFAULT_VITE_HMR_PORT)
    
    for port in "${ports_to_clean[@]}"; do
        cleanup_port "$port" "$force"
    done
    
    # Clean up PID files
    if [ -d "$PID_DIR" ]; then
        info "Cleaning up PID files..."
        rm -f "$PID_DIR"/*.pid 2>/dev/null || true
        success "PID files cleaned"
    fi
    
    # Clean up any remaining orphaned processes
    info "Checking for orphaned Node.js processes..."
    local node_pids
    node_pids=$(pgrep -f "node.*alfalyzer" 2>/dev/null || pgrep -f "tsx.*server" 2>/dev/null || true)
    
    if [ -n "$node_pids" ]; then
        warning "Found potential orphaned processes: $node_pids"
        for pid in $node_pids; do
            if [ "$pid" != "$$" ]; then
                kill_process_safe "$pid" "orphaned Node.js process" 5
            fi
        done
    fi
    
    success "Comprehensive cleanup completed"
}

# Port availability report
port_report() {
    log "Generating port availability report..."
    
    echo -e "\n${PURPLE}📊 PORT AVAILABILITY REPORT${NC}"
    echo "================================"
    
    # Check default ports
    local default_ports=($DEFAULT_BACKEND_PORT $DEFAULT_FRONTEND_PORT $DEFAULT_VITE_HMR_PORT)
    
    echo -e "\n${CYAN}Default Ports:${NC}"
    for port in "${default_ports[@]}"; do
        if is_port_in_use "$port"; then
            local process_info
            process_info=$(get_port_process "$port")
            echo -e "  Port $port: ${RED}IN USE${NC} - $process_info"
        else
            echo -e "  Port $port: ${GREEN}AVAILABLE${NC}"
        fi
    done
    
    # Check safe ports
    echo -e "\n${CYAN}Safe Port Alternatives:${NC}"
    local available_safe_ports=()
    for port in "${SAFE_PORTS[@]}"; do
        if ! is_port_in_use "$port"; then
            available_safe_ports+=("$port")
        fi
    done
    
    if [ ${#available_safe_ports[@]} -eq 0 ]; then
        echo -e "  ${RED}No safe ports available${NC}"
    else
        echo -e "  ${GREEN}Available: ${available_safe_ports[*]}${NC}"
    fi
    
    # Suggest next available ports
    echo -e "\n${CYAN}Next Available Ports:${NC}"
    local backend_port frontend_port
    backend_port=$(find_available_port 3001 3020)
    frontend_port=$(find_available_port 3000 3020)
    
    if [ -n "$backend_port" ]; then
        echo -e "  Backend: ${GREEN}$backend_port${NC}"
    else
        echo -e "  Backend: ${RED}No ports available in 3001-3020 range${NC}"
    fi
    
    if [ -n "$frontend_port" ]; then
        echo -e "  Frontend: ${GREEN}$frontend_port${NC}"
    else
        echo -e "  Frontend: ${RED}No ports available in 3000-3020 range${NC}"
    fi
    
    # Show running processes
    echo -e "\n${CYAN}Development Processes:${NC}"
    local found_processes=false
    
    for pattern in "${PROCESS_PATTERNS[@]}"; do
        local pids
        if command -v pgrep >/dev/null 2>&1; then
            pids=$(pgrep -f "$pattern" 2>/dev/null || true)
        else
            pids=$(ps aux | grep -E "$pattern" | grep -v grep | awk '{print $2}' || true)
        fi
        
        if [ -n "$pids" ]; then
            found_processes=true
            for pid in $pids; do
                local cmd
                cmd=$(ps -p "$pid" -o command= 2>/dev/null | cut -c1-60 || echo "Unknown")
                echo -e "  PID $pid: $cmd"
            done
        fi
    done
    
    if [ "$found_processes" = false ]; then
        echo -e "  ${GREEN}No active development processes${NC}"
    fi
    
    echo ""
}

# Watch ports for changes
watch_ports() {
    local duration=${1:-60}
    local interval=${2:-5}
    
    log "Watching ports for $duration seconds (checking every $interval seconds)..."
    
    local end_time
    end_time=$(($(date +%s) + duration))
    
    while [ $(date +%s) -lt $end_time ]; do
        clear
        echo -e "${PURPLE}🔍 PORT MONITOR${NC} - $(date)"
        echo "================================"
        
        port_report
        
        echo -e "\n${CYAN}Watching... (Ctrl+C to stop)${NC}"
        sleep "$interval"
    done
    
    success "Port monitoring completed"
}

# Reserve ports
reserve_ports() {
    local backend_port=${1:-$DEFAULT_BACKEND_PORT}
    local frontend_port=${2:-$DEFAULT_FRONTEND_PORT}
    
    log "Reserving ports: Backend=$backend_port, Frontend=$frontend_port"
    
    # Clean up ports first
    cleanup_port "$backend_port" false
    cleanup_port "$frontend_port" false
    
    # Create reservation files
    local reservation_file="$PID_DIR/port-reservations.txt"
    {
        echo "# Port reservations created at $(date)"
        echo "BACKEND_PORT=$backend_port"
        echo "FRONTEND_PORT=$frontend_port"
        echo "RESERVED_BY=$$"
        echo "RESERVED_AT=$(date +%s)"
    } > "$reservation_file"
    
    success "Ports reserved and saved to $reservation_file"
}

# Load port reservations
load_reservations() {
    local reservation_file="$PID_DIR/port-reservations.txt"
    
    if [ -f "$reservation_file" ]; then
        # shellcheck source=/dev/null
        source "$reservation_file" 2>/dev/null || true
        echo "BACKEND_PORT=${BACKEND_PORT:-$DEFAULT_BACKEND_PORT}"
        echo "FRONTEND_PORT=${FRONTEND_PORT:-$DEFAULT_FRONTEND_PORT}"
    else
        echo "BACKEND_PORT=$DEFAULT_BACKEND_PORT"
        echo "FRONTEND_PORT=$DEFAULT_FRONTEND_PORT"
    fi
}

# Show usage
show_usage() {
    echo -e "${PURPLE}🔧 BULLETPROOF PORT MANAGER${NC}"
    echo "================================"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  cleanup                     - Clean up all development processes and ports"
    echo "  cleanup --force            - Force cleanup including external processes"
    echo "  report                      - Show port availability report"
    echo "  watch [duration] [interval] - Watch ports for changes (default: 60s, 5s interval)"
    echo "  reserve [backend] [frontend]- Reserve specific ports"
    echo "  load-reservations          - Load saved port reservations"
    echo "  find-port [start] [end]    - Find next available port in range"
    echo "  check-port <port>          - Check if specific port is available"
    echo "  kill-port <port>           - Kill process using specific port"
    echo "  help                       - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 cleanup                 # Clean up all processes"
    echo "  $0 report                  # Show port status"
    echo "  $0 watch 120 10            # Watch for 2 minutes, check every 10 seconds"
    echo "  $0 reserve 3001 3000       # Reserve specific ports"
    echo "  $0 check-port 3001         # Check if port 3001 is available"
    echo "  $0 kill-port 3001          # Kill process using port 3001"
    echo ""
}

# Main function
main() {
    init_directories
    
    case "${1:-help}" in
        "cleanup")
            full_cleanup "${2:-false}"
            ;;
        "report")
            port_report
            ;;
        "watch")
            watch_ports "${2:-60}" "${3:-5}"
            ;;
        "reserve")
            reserve_ports "${2:-$DEFAULT_BACKEND_PORT}" "${3:-$DEFAULT_FRONTEND_PORT}"
            ;;
        "load-reservations")
            load_reservations
            ;;
        "find-port")
            find_available_port "${2:-$PORT_RANGE_START}" "${3:-$PORT_RANGE_END}"
            ;;
        "check-port")
            if [ -z "${2:-}" ]; then
                error "Port number required"
                exit 1
            fi
            if is_port_in_use "$2"; then
                echo "Port $2 is IN USE"
                exit 1
            else
                echo "Port $2 is AVAILABLE"
                exit 0
            fi
            ;;
        "kill-port")
            if [ -z "${2:-}" ]; then
                error "Port number required"
                exit 1
            fi
            cleanup_port "$2" "${3:-false}"
            ;;
        "help"|"--help"|"-h")
            show_usage
            ;;
        *)
            error "Unknown command: $1"
            show_usage
            exit 1
            ;;
    esac
}

# Handle script interruption
trap 'error "Port manager interrupted"; exit 1' INT TERM

# Execute main function with all arguments
main "$@"