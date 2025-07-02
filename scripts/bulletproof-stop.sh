#!/bin/bash

# 🛑 BULLETPROOF ALFALYZER STOP
# Advanced shutdown script with graceful termination and cleanup

set -euo pipefail

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly BOLD='\033[1m'
readonly NC='\033[0m'

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly ROOT_DIR="$(dirname "$SCRIPT_DIR")"
readonly LOG_DIR="$ROOT_DIR/logs"
readonly PID_DIR="$ROOT_DIR/pids"
readonly PORT_MANAGER="$SCRIPT_DIR/port-manager.sh"

# Settings
GRACEFUL_TIMEOUT=15
FORCE_KILL=false
CLEANUP_LOGS=false
VERBOSE=false

# Logging functions
log() {
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${BLUE}[$timestamp]${NC} $1" | tee -a "$LOG_DIR/bulletproof-stop.log"
}

success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_DIR/bulletproof-stop.log"
}

error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$LOG_DIR/bulletproof-stop.log"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$LOG_DIR/bulletproof-stop.log"
}

info() {
    echo -e "${CYAN}ℹ️  $1${NC}" | tee -a "$LOG_DIR/bulletproof-stop.log"
}

debug() {
    if [ "$VERBOSE" = true ]; then
        echo -e "${PURPLE}🔍 $1${NC}" | tee -a "$LOG_DIR/bulletproof-stop.log"
    fi
}

# Banner
show_banner() {
    echo -e "${BOLD}${RED}"
    cat << 'EOF'
🛑 ┌─────────────────────────────────────────────┐
   │         BULLETPROOF ALFALYZER STOP          │
   │       Graceful Shutdown & Cleanup           │
   └─────────────────────────────────────────────┘
EOF
    echo -e "${NC}"
}

# Initialize
init_environment() {
    mkdir -p "$LOG_DIR"
    
    # Initialize stop log
    cat > "$LOG_DIR/bulletproof-stop.log" << EOF
# Bulletproof Alfalyzer Stop Log
# Started: $(date)
# Script: $0
# Arguments: $*

EOF
    
    log "Stop script initialized"
}

# Stop service by PID file
stop_service_by_pid() {
    local service_name=$1
    local pid_file="$PID_DIR/${service_name}.pid"
    
    if [ ! -f "$pid_file" ]; then
        info "No PID file found for $service_name"
        return 0
    fi
    
    local pid
    pid=$(cat "$pid_file" 2>/dev/null || echo "")
    
    if [ -z "$pid" ]; then
        warning "Empty PID file for $service_name"
        rm -f "$pid_file"
        return 0
    fi
    
    if ! kill -0 "$pid" 2>/dev/null; then
        info "$service_name process (PID: $pid) already stopped"
        rm -f "$pid_file"
        return 0
    fi
    
    log "Stopping $service_name (PID: $pid)..."
    
    # Send SIGTERM for graceful shutdown
    if kill -TERM "$pid" 2>/dev/null; then
        debug "Sent SIGTERM to $service_name"
        
        # Wait for graceful shutdown
        local count=0
        while kill -0 "$pid" 2>/dev/null && [ $count -lt $GRACEFUL_TIMEOUT ]; do
            sleep 1
            ((count++))
            debug "Waiting for $service_name to stop... (${count}s)"
        done
        
        if ! kill -0 "$pid" 2>/dev/null; then
            success "$service_name stopped gracefully"
            rm -f "$pid_file"
            return 0
        else
            warning "$service_name didn't stop gracefully within ${GRACEFUL_TIMEOUT}s"
        fi
    fi
    
    # Force kill if graceful shutdown failed
    if [ "$FORCE_KILL" = true ]; then
        warning "Force killing $service_name..."
        if kill -KILL "$pid" 2>/dev/null; then
            sleep 2
            if ! kill -0 "$pid" 2>/dev/null; then
                success "$service_name force-killed"
                rm -f "$pid_file"
                return 0
            else
                error "Failed to force-kill $service_name"
                return 1
            fi
        else
            error "Cannot kill $service_name - process may have already exited"
            rm -f "$pid_file"
            return 1
        fi
    else
        warning "$service_name still running (use --force to kill)"
        return 1
    fi
}

# Stop all services
stop_all_services() {
    log "Stopping all Alfalyzer services..."
    
    local services=("backend" "frontend")
    local stopped_count=0
    
    for service in "${services[@]}"; do
        if stop_service_by_pid "$service"; then
            ((stopped_count++))
        fi
    done
    
    success "Stopped $stopped_count/${#services[@]} services"
}

# Comprehensive cleanup using port manager
comprehensive_cleanup() {
    log "Running comprehensive cleanup..."
    
    if [ -x "$PORT_MANAGER" ]; then
        if [ "$FORCE_KILL" = true ]; then
            "$PORT_MANAGER" cleanup --force
        else
            "$PORT_MANAGER" cleanup
        fi
        success "Port manager cleanup completed"
    else
        warning "Port manager not available - doing manual cleanup"
        manual_cleanup
    fi
}

# Manual cleanup as fallback
manual_cleanup() {
    log "Running manual process cleanup..."
    
    # Common process patterns
    local patterns=(
        "tsx.*server/index.ts"
        "vite.*--port"
        "node.*server"
        "npm.*dev"
        "concurrently"
    )
    
    for pattern in "${patterns[@]}"; do
        debug "Looking for processes matching: $pattern"
        
        local pids
        if command -v pgrep >/dev/null 2>&1; then
            pids=$(pgrep -f "$pattern" 2>/dev/null || true)
        else
            pids=$(ps aux | grep -E "$pattern" | grep -v grep | awk '{print $2}' || true)
        fi
        
        if [ -n "$pids" ]; then
            for pid in $pids; do
                if [ -n "$pid" ] && [ "$pid" != "$$" ]; then
                    debug "Found process PID: $pid"
                    
                    if [ "$FORCE_KILL" = true ]; then
                        kill -KILL "$pid" 2>/dev/null || true
                    else
                        kill -TERM "$pid" 2>/dev/null || true
                    fi
                fi
            done
            info "Cleaned up processes matching: $pattern"
        fi
    done
}

# Clean up PID files
cleanup_pid_files() {
    log "Cleaning up PID files..."
    
    if [ -d "$PID_DIR" ]; then
        local count=0
        for pid_file in "$PID_DIR"/*.pid; do
            if [ -f "$pid_file" ]; then
                debug "Removing PID file: $(basename "$pid_file")"
                rm -f "$pid_file"
                ((count++))
            fi
        done
        
        if [ $count -gt 0 ]; then
            success "Removed $count PID files"
        else
            info "No PID files to clean up"
        fi
    else
        info "PID directory doesn't exist"
    fi
}

# Clean up log files
cleanup_log_files() {
    if [ "$CLEANUP_LOGS" = false ]; then
        return 0
    fi
    
    log "Cleaning up log files..."
    
    if [ -d "$LOG_DIR" ]; then
        local log_files=("backend.log" "frontend.log" "port-manager.log")
        local count=0
        
        for log_file in "${log_files[@]}"; do
            local file_path="$LOG_DIR/$log_file"
            if [ -f "$file_path" ]; then
                # Archive the log file instead of deleting
                local timestamp
                timestamp=$(date '+%Y%m%d_%H%M%S')
                mv "$file_path" "${file_path}.${timestamp}" 2>/dev/null || rm -f "$file_path"
                ((count++))
                debug "Archived log file: $log_file"
            fi
        done
        
        if [ $count -gt 0 ]; then
            success "Archived $count log files"
        else
            info "No log files to clean up"
        fi
    fi
}

# Verify shutdown
verify_shutdown() {
    log "Verifying shutdown..."
    
    local backend_port=3001
    local frontend_port=3000
    local issues=0
    
    # Check if ports are still in use
    if "$PORT_MANAGER" check-port "$backend_port" >/dev/null 2>&1; then
        success "Backend port $backend_port is free"
    else
        warning "Backend port $backend_port is still in use"
        ((issues++))
    fi
    
    if "$PORT_MANAGER" check-port "$frontend_port" >/dev/null 2>&1; then
        success "Frontend port $frontend_port is free"
    else
        warning "Frontend port $frontend_port is still in use"
        ((issues++))
    fi
    
    # Check for remaining processes
    local remaining_processes=0
    local patterns=(
        "tsx.*server/index.ts"
        "vite.*--port"
    )
    
    for pattern in "${patterns[@]}"; do
        local pids
        pids=$(pgrep -f "$pattern" 2>/dev/null || true)
        if [ -n "$pids" ]; then
            ((remaining_processes++))
            warning "Process still running matching: $pattern (PIDs: $pids)"
        fi
    done
    
    if [ $issues -eq 0 ] && [ $remaining_processes -eq 0 ]; then
        success "Clean shutdown verified"
        return 0
    else
        warning "Shutdown verification found $issues port issues and $remaining_processes remaining processes"
        return 1
    fi
}

# Show final status
show_final_status() {
    echo ""
    echo -e "${BOLD}${GREEN}🎯 ALFALYZER SHUTDOWN COMPLETE${NC}"
    echo "===================================="
    echo ""
    echo -e "${CYAN}Status:${NC}"
    
    # Port status
    local backend_free frontend_free
    if "$PORT_MANAGER" check-port 3001 >/dev/null 2>&1; then
        backend_free="${GREEN}Free${NC}"
    else
        backend_free="${RED}In Use${NC}"
    fi
    
    if "$PORT_MANAGER" check-port 3000 >/dev/null 2>&1; then
        frontend_free="${GREEN}Free${NC}"
    else
        frontend_free="${RED}In Use${NC}"
    fi
    
    echo -e "  Backend Port (3001):  $backend_free"
    echo -e "  Frontend Port (3000): $frontend_free"
    
    # Process status
    local active_processes=0
    if pgrep -f "tsx.*server" >/dev/null 2>&1; then
        ((active_processes++))
    fi
    if pgrep -f "vite.*--port" >/dev/null 2>&1; then
        ((active_processes++))
    fi
    
    if [ $active_processes -eq 0 ]; then
        echo -e "  Active Processes:     ${GREEN}None${NC}"
    else
        echo -e "  Active Processes:     ${YELLOW}$active_processes${NC}"
    fi
    
    echo ""
    echo -e "${CYAN}Next Steps:${NC}"
    echo -e "  Start again:   ${YELLOW}$SCRIPT_DIR/bulletproof-start.sh${NC}"
    echo -e "  Port status:   ${YELLOW}$PORT_MANAGER report${NC}"
    echo -e "  Force cleanup: ${YELLOW}$PORT_MANAGER cleanup --force${NC}"
    echo ""
}

# Show usage
show_usage() {
    echo -e "${BOLD}Bulletproof Alfalyzer Stop${NC}"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --force              Force kill processes (SIGKILL instead of SIGTERM)"
    echo "  --timeout SECONDS    Graceful shutdown timeout (default: $GRACEFUL_TIMEOUT)"
    echo "  --cleanup-logs       Archive/cleanup log files"
    echo "  --verbose            Enable verbose debug output"
    echo "  --help               Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                   # Graceful shutdown"
    echo "  $0 --force           # Force kill all processes"
    echo "  $0 --verbose         # Detailed output"
    echo "  $0 --cleanup-logs    # Clean up logs after shutdown"
    echo ""
}

# Parse arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --force)
                FORCE_KILL=true
                shift
                ;;
            --timeout)
                GRACEFUL_TIMEOUT="$2"
                shift 2
                ;;
            --cleanup-logs)
                CLEANUP_LOGS=true
                shift
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            --help|-h)
                show_usage
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
}

# Main execution
main() {
    # Parse arguments
    parse_arguments "$@"
    
    # Show banner
    show_banner
    
    # Initialize
    init_environment
    
    # Stop services
    stop_all_services
    
    # Comprehensive cleanup
    comprehensive_cleanup
    
    # Clean up files
    cleanup_pid_files
    cleanup_log_files
    
    # Verify shutdown
    if verify_shutdown; then
        success "All services stopped successfully"
    else
        warning "Some issues detected during shutdown"
        
        if [ "$FORCE_KILL" = false ]; then
            warning "Consider using --force for complete cleanup"
        fi
    fi
    
    # Show final status
    show_final_status
}

# Execute main function
main "$@"