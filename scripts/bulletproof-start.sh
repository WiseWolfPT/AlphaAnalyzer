#!/bin/bash

# 🚀 BULLETPROOF ALFALYZER STARTUP
# Advanced startup script with comprehensive error handling, process management,
# and automatic recovery mechanisms

set -euo pipefail

# Colors and formatting
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

# Default configuration
readonly DEFAULT_BACKEND_PORT=3001
readonly DEFAULT_FRONTEND_PORT=3000
readonly MAX_STARTUP_TIME=120
readonly HEALTH_CHECK_INTERVAL=2
readonly MAX_RETRIES=3
readonly RECOVERY_DELAY=5

# Global variables
BACKEND_PORT=$DEFAULT_BACKEND_PORT
FRONTEND_PORT=$DEFAULT_FRONTEND_PORT
STARTUP_MODE="development"
FORCE_CLEANUP=false
VERBOSE=false
DRY_RUN=false
AUTO_RECOVER=true

# Logging functions
log() {
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${BLUE}[$timestamp]${NC} $1" | tee -a "$LOG_DIR/bulletproof-start.log"
}

success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_DIR/bulletproof-start.log"
}

error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$LOG_DIR/bulletproof-start.log"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$LOG_DIR/bulletproof-start.log"
}

info() {
    echo -e "${CYAN}ℹ️  $1${NC}" | tee -a "$LOG_DIR/bulletproof-start.log"
}

debug() {
    if [ "$VERBOSE" = true ]; then
        echo -e "${PURPLE}🔍 $1${NC}" | tee -a "$LOG_DIR/bulletproof-start.log"
    fi
}

# Banner
show_banner() {
    echo -e "${BOLD}${PURPLE}"
    cat << 'EOF'
🚀 ┌─────────────────────────────────────────────┐
   │        BULLETPROOF ALFALYZER STARTUP        │
   │     Advanced Process & Port Management      │
   └─────────────────────────────────────────────┘
EOF
    echo -e "${NC}"
}

# Initialize environment
init_environment() {
    log "Initializing bulletproof startup environment..."
    
    # Create directories
    mkdir -p "$LOG_DIR" "$PID_DIR"
    
    # Initialize log file
    cat > "$LOG_DIR/bulletproof-start.log" << EOF
# Bulletproof Alfalyzer Startup Log
# Started: $(date)
# Script: $0
# Arguments: $*
# Working Directory: $(pwd)
# Environment: $STARTUP_MODE

EOF
    
    # Set process limits
    ulimit -n 4096 2>/dev/null || warning "Could not increase file descriptor limit"
    
    success "Environment initialized"
}

# Environment detection
detect_environment() {
    log "Detecting environment configuration..."
    
    # Check if we're in the right directory
    if [ ! -f "$ROOT_DIR/package.json" ]; then
        error "Not in Alfalyzer project directory. package.json not found."
        exit 1
    fi
    
    # Load environment variables if .env exists
    if [ -f "$ROOT_DIR/.env" ]; then
        debug "Loading environment variables from .env"
        set -a
        # shellcheck source=/dev/null
        source "$ROOT_DIR/.env"
        set +a
        success "Environment variables loaded"
    else
        warning ".env file not found - using defaults"
    fi
    
    # Detect Node.js version
    if command -v node >/dev/null 2>&1; then
        local node_version
        node_version=$(node --version)
        info "Node.js version: $node_version"
        
        # Check minimum version (18.0.0)
        local major_version
        major_version=$(echo "$node_version" | cut -d'.' -f1 | tr -d 'v')
        if [ "$major_version" -lt 18 ]; then
            warning "Node.js version $node_version detected. Recommended: v18.0.0 or higher"
        fi
    else
        error "Node.js not found. Please install Node.js 18.0.0 or higher"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm >/dev/null 2>&1; then
        error "npm not found. Please install npm"
        exit 1
    fi
    
    # Check if dependencies are installed
    if [ ! -d "$ROOT_DIR/node_modules" ]; then
        warning "node_modules not found. Installing dependencies..."
        if [ "$DRY_RUN" = false ]; then
            cd "$ROOT_DIR"
            npm install || {
                error "Failed to install dependencies"
                exit 1
            }
            success "Dependencies installed successfully"
        else
            info "[DRY RUN] Would install dependencies"
        fi
    fi
    
    success "Environment detection completed"
}

# Pre-flight checks
pre_flight_checks() {
    log "Running pre-flight checks..."
    
    local checks_passed=0
    local total_checks=6
    
    # Check 1: Package.json validation
    if jq empty "$ROOT_DIR/package.json" >/dev/null 2>&1; then
        success "package.json is valid JSON"
        ((checks_passed++))
    else
        error "package.json is invalid JSON"
    fi
    
    # Check 2: Required files exist
    local required_files=("server/index.ts" "client/src/App.tsx" "vite.config.ts")
    local files_exist=true
    
    for file in "${required_files[@]}"; do
        if [ -f "$ROOT_DIR/$file" ]; then
            debug "Required file exists: $file"
        else
            error "Required file missing: $file"
            files_exist=false
        fi
    done
    
    if [ "$files_exist" = true ]; then
        success "All required files exist"
        ((checks_passed++))
    fi
    
    # Check 3: Port availability
    if "$PORT_MANAGER" check-port "$BACKEND_PORT" >/dev/null 2>&1; then
        success "Backend port $BACKEND_PORT is available"
        ((checks_passed++))
    else
        warning "Backend port $BACKEND_PORT is in use"
        # Try to find alternative
        if command -v "$PORT_MANAGER" >/dev/null 2>&1; then
            local alt_port
            alt_port=$("$PORT_MANAGER" find-port 3001 3020)
            if [ -n "$alt_port" ]; then
                warning "Alternative backend port available: $alt_port"
                BACKEND_PORT=$alt_port
                ((checks_passed++))
            fi
        fi
    fi
    
    if "$PORT_MANAGER" check-port "$FRONTEND_PORT" >/dev/null 2>&1; then
        success "Frontend port $FRONTEND_PORT is available"
        ((checks_passed++))
    else
        warning "Frontend port $FRONTEND_PORT is in use"
        # Try to find alternative
        if command -v "$PORT_MANAGER" >/dev/null 2>&1; then
            local alt_port
            alt_port=$("$PORT_MANAGER" find-port 3000 3020)
            if [ -n "$alt_port" ]; then
                warning "Alternative frontend port available: $alt_port"
                FRONTEND_PORT=$alt_port
                ((checks_passed++))
            fi
        fi
    fi
    
    # Check 4: Database file
    if [ -f "$ROOT_DIR/dev.db" ]; then
        # Check if it's a valid SQLite database
        if command -v sqlite3 >/dev/null 2>&1; then
            if sqlite3 "$ROOT_DIR/dev.db" ".tables" >/dev/null 2>&1; then
                success "Database file is valid"
                ((checks_passed++))
            else
                warning "Database file exists but may be corrupted"
            fi
        else
            warning "Database file exists (cannot validate - sqlite3 not available)"
            ((checks_passed++))
        fi
    else
        info "Database file doesn't exist (will be created)"
        ((checks_passed++))
    fi
    
    # Check 5: Disk space
    local available_space
    available_space=$(df -h "$ROOT_DIR" | awk 'NR==2 {print $4}' | tr -d 'G')
    if [ "${available_space%.*}" -gt 1 ]; then
        success "Sufficient disk space available (${available_space}G)"
        ((checks_passed++))
    else
        warning "Low disk space: ${available_space}G available"
    fi
    
    # Summary
    local pass_rate
    pass_rate=$((checks_passed * 100 / total_checks))
    
    if [ $checks_passed -eq $total_checks ]; then
        success "All pre-flight checks passed ($checks_passed/$total_checks)"
    elif [ $pass_rate -ge 80 ]; then
        warning "Most pre-flight checks passed ($checks_passed/$total_checks) - $pass_rate%"
    else
        error "Pre-flight checks failed ($checks_passed/$total_checks) - $pass_rate%"
        if [ "$AUTO_RECOVER" = false ]; then
            exit 1
        fi
    fi
}

# Process cleanup
cleanup_processes() {
    log "Cleaning up existing processes..."
    
    if [ "$FORCE_CLEANUP" = true ]; then
        if [ "$DRY_RUN" = false ]; then
            "$PORT_MANAGER" cleanup --force
        else
            info "[DRY RUN] Would force cleanup all processes"
        fi
    else
        if [ "$DRY_RUN" = false ]; then
            "$PORT_MANAGER" cleanup
        else
            info "[DRY RUN] Would cleanup development processes"
        fi
    fi
    
    success "Process cleanup completed"
}

# Start backend service
start_backend() {
    log "Starting backend service on port $BACKEND_PORT..."
    
    if [ "$DRY_RUN" = true ]; then
        info "[DRY RUN] Would start backend with: PORT=$BACKEND_PORT tsx --env-file=.env server/index.ts"
        return 0
    fi
    
    cd "$ROOT_DIR"
    
    # Start backend in background
    PORT=$BACKEND_PORT tsx --env-file=.env server/index.ts > "$LOG_DIR/backend.log" 2>&1 &
    local backend_pid=$!
    
    # Save PID
    echo $backend_pid > "$PID_DIR/backend.pid"
    
    debug "Backend started with PID: $backend_pid"
    
    # Wait for backend to be ready
    local attempts=0
    local max_attempts=$((MAX_STARTUP_TIME / HEALTH_CHECK_INTERVAL))
    
    while [ $attempts -lt $max_attempts ]; do
        if curl -sf "http://localhost:$BACKEND_PORT/api/health" >/dev/null 2>&1; then
            success "Backend is ready and responding on port $BACKEND_PORT"
            return 0
        fi
        
        # Check if process is still running
        if ! kill -0 $backend_pid 2>/dev/null; then
            error "Backend process died unexpectedly"
            if [ -f "$LOG_DIR/backend.log" ]; then
                error "Last few lines from backend log:"
                tail -10 "$LOG_DIR/backend.log" | while read -r line; do
                    error "  $line"
                done
            fi
            return 1
        fi
        
        debug "Waiting for backend... (attempt $((attempts + 1))/$max_attempts)"
        sleep $HEALTH_CHECK_INTERVAL
        ((attempts++))
    done
    
    error "Backend failed to start within $MAX_STARTUP_TIME seconds"
    return 1
}

# Start frontend service
start_frontend() {
    log "Starting frontend service on port $FRONTEND_PORT..."
    
    if [ "$DRY_RUN" = true ]; then
        info "[DRY RUN] Would start frontend with: vite --port $FRONTEND_PORT"
        return 0
    fi
    
    cd "$ROOT_DIR"
    
    # Start frontend in background
    vite --port "$FRONTEND_PORT" > "$LOG_DIR/frontend.log" 2>&1 &
    local frontend_pid=$!
    
    # Save PID
    echo $frontend_pid > "$PID_DIR/frontend.pid"
    
    debug "Frontend started with PID: $frontend_pid"
    
    # Wait for frontend to be ready
    local attempts=0
    local max_attempts=$((MAX_STARTUP_TIME / HEALTH_CHECK_INTERVAL))
    
    while [ $attempts -lt $max_attempts ]; do
        if curl -sf "http://localhost:$FRONTEND_PORT" >/dev/null 2>&1; then
            success "Frontend is ready and responding on port $FRONTEND_PORT"
            return 0
        fi
        
        # Check if process is still running
        if ! kill -0 $frontend_pid 2>/dev/null; then
            error "Frontend process died unexpectedly"
            if [ -f "$LOG_DIR/frontend.log" ]; then
                error "Last few lines from frontend log:"
                tail -10 "$LOG_DIR/frontend.log" | while read -r line; do
                    error "  $line"
                done
            fi
            return 1
        fi
        
        debug "Waiting for frontend... (attempt $((attempts + 1))/$max_attempts)"
        sleep $HEALTH_CHECK_INTERVAL
        ((attempts++))
    done
    
    error "Frontend failed to start within $MAX_STARTUP_TIME seconds"
    return 1
}

# Health check both services
health_check() {
    log "Performing comprehensive health check..."
    
    local backend_healthy=false
    local frontend_healthy=false
    
    # Check backend
    if curl -sf "http://localhost:$BACKEND_PORT/api/health" >/dev/null 2>&1; then
        backend_healthy=true
        success "Backend health check passed"
    else
        error "Backend health check failed"
    fi
    
    # Check frontend
    if curl -sf "http://localhost:$FRONTEND_PORT" >/dev/null 2>&1; then
        frontend_healthy=true
        success "Frontend health check passed"
    else
        error "Frontend health check failed"
    fi
    
    # Test API proxy (if frontend is healthy)
    if [ "$frontend_healthy" = true ]; then
        if curl -sf "http://localhost:$FRONTEND_PORT/api/health" >/dev/null 2>&1; then
            success "API proxy health check passed"
        else
            warning "API proxy may not be working correctly"
        fi
    fi
    
    if [ "$backend_healthy" = true ] && [ "$frontend_healthy" = true ]; then
        success "All services are healthy"
        return 0
    else
        error "Some services failed health checks"
        return 1
    fi
}

# Recovery mechanism
auto_recovery() {
    local attempt=$1
    
    warning "Attempting auto-recovery (attempt $attempt/$MAX_RETRIES)..."
    
    # Stop any running processes
    cleanup_processes
    
    # Wait before retry
    sleep $RECOVERY_DELAY
    
    # Find new ports if needed
    local new_backend_port new_frontend_port
    new_backend_port=$("$PORT_MANAGER" find-port 3001 3020)
    new_frontend_port=$("$PORT_MANAGER" find-port 3000 3020)
    
    if [ -n "$new_backend_port" ] && [ -n "$new_frontend_port" ]; then
        BACKEND_PORT=$new_backend_port
        FRONTEND_PORT=$new_frontend_port
        info "Using alternative ports: Backend=$BACKEND_PORT, Frontend=$FRONTEND_PORT"
    else
        error "Could not find alternative ports for recovery"
        return 1
    fi
    
    # Try to start services again
    if start_backend && start_frontend; then
        success "Auto-recovery successful"
        return 0
    else
        error "Auto-recovery failed"
        return 1
    fi
}

# Main startup sequence
main_startup() {
    log "Starting main startup sequence..."
    
    local attempt=1
    
    while [ $attempt -le $MAX_RETRIES ]; do
        log "Startup attempt $attempt/$MAX_RETRIES"
        
        # Start services
        if start_backend && start_frontend; then
            # Health check
            if health_check; then
                success "Startup completed successfully!"
                return 0
            else
                warning "Services started but health check failed"
            fi
        else
            error "Failed to start services"
        fi
        
        # Auto-recovery if enabled and not the last attempt
        if [ "$AUTO_RECOVER" = true ] && [ $attempt -lt $MAX_RETRIES ]; then
            if auto_recovery $attempt; then
                success "Recovery successful, continuing..."
                return 0
            fi
        fi
        
        ((attempt++))
    done
    
    error "Startup failed after $MAX_RETRIES attempts"
    return 1
}

# Show final status
show_final_status() {
    echo ""
    echo -e "${BOLD}${GREEN}🎉 ALFALYZER STARTUP COMPLETE${NC}"
    echo "=================================="
    echo ""
    echo -e "${CYAN}Services:${NC}"
    echo -e "  Frontend: ${GREEN}http://localhost:$FRONTEND_PORT${NC}"
    echo -e "  Backend:  ${GREEN}http://localhost:$BACKEND_PORT${NC}"
    echo -e "  API:      ${GREEN}http://localhost:$BACKEND_PORT/api${NC}"
    echo ""
    echo -e "${CYAN}Management:${NC}"
    echo -e "  Logs:     ${YELLOW}$LOG_DIR/${NC}"
    echo -e "  PIDs:     ${YELLOW}$PID_DIR/${NC}"
    echo -e "  Stop:     ${YELLOW}$SCRIPT_DIR/bulletproof-stop.sh${NC}"
    echo ""
    echo -e "${CYAN}Quick Commands:${NC}"
    echo -e "  Health:   ${YELLOW}curl http://localhost:$BACKEND_PORT/api/health${NC}"
    echo -e "  Logs:     ${YELLOW}tail -f $LOG_DIR/backend.log${NC}"
    echo -e "  Monitor:  ${YELLOW}$PORT_MANAGER watch${NC}"
    echo ""
}

# Show usage
show_usage() {
    echo -e "${BOLD}Bulletproof Alfalyzer Startup${NC}"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --backend-port PORT    Backend port (default: $DEFAULT_BACKEND_PORT)"
    echo "  --frontend-port PORT   Frontend port (default: $DEFAULT_FRONTEND_PORT)"
    echo "  --mode MODE           Startup mode: development|production (default: development)"
    echo "  --force-cleanup       Force cleanup of all processes, including external ones"
    echo "  --no-auto-recover     Disable automatic recovery on failure"
    echo "  --max-retries N       Maximum startup retry attempts (default: $MAX_RETRIES)"
    echo "  --timeout SECONDS     Maximum startup time per service (default: $MAX_STARTUP_TIME)"
    echo "  --verbose             Enable verbose debug output"
    echo "  --dry-run             Show what would be done without executing"
    echo "  --help                Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Standard startup"
    echo "  $0 --force-cleanup --verbose         # Force cleanup with debug output"
    echo "  $0 --backend-port 3002 --frontend-port 3001  # Use specific ports"
    echo "  $0 --dry-run                         # Preview actions without executing"
    echo ""
}

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --backend-port)
                BACKEND_PORT="$2"
                shift 2
                ;;
            --frontend-port)
                FRONTEND_PORT="$2"
                shift 2
                ;;
            --mode)
                STARTUP_MODE="$2"
                shift 2
                ;;
            --force-cleanup)
                FORCE_CLEANUP=true
                shift
                ;;
            --no-auto-recover)
                AUTO_RECOVER=false
                shift
                ;;
            --max-retries)
                MAX_RETRIES="$2"
                shift 2
                ;;
            --timeout)
                MAX_STARTUP_TIME="$2"
                shift 2
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
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

# Cleanup handler
cleanup_on_exit() {
    warning "Startup interrupted - cleaning up..."
    
    # Kill processes if they were started
    if [ -f "$PID_DIR/backend.pid" ]; then
        local backend_pid
        backend_pid=$(cat "$PID_DIR/backend.pid")
        if kill -0 "$backend_pid" 2>/dev/null; then
            kill "$backend_pid" 2>/dev/null || true
        fi
        rm -f "$PID_DIR/backend.pid"
    fi
    
    if [ -f "$PID_DIR/frontend.pid" ]; then
        local frontend_pid
        frontend_pid=$(cat "$PID_DIR/frontend.pid")
        if kill -0 "$frontend_pid" 2>/dev/null; then
            kill "$frontend_pid" 2>/dev/null || true
        fi
        rm -f "$PID_DIR/frontend.pid"
    fi
    
    error "Startup cancelled"
    exit 1
}

# Main execution
main() {
    # Parse arguments
    parse_arguments "$@"
    
    # Set up interrupt handler
    trap cleanup_on_exit INT TERM
    
    # Show banner
    show_banner
    
    # Initialize
    init_environment
    
    # Detect environment
    detect_environment
    
    # Pre-flight checks
    pre_flight_checks
    
    # Cleanup existing processes
    cleanup_processes
    
    # Main startup
    if main_startup; then
        show_final_status
        
        if [ "$DRY_RUN" = false ]; then
            # Keep script running to monitor processes
            log "Monitoring services... (Ctrl+C to stop)"
            while true; do
                sleep 30
                if ! health_check >/dev/null 2>&1; then
                    warning "Health check failed - services may have stopped"
                    if [ "$AUTO_RECOVER" = true ]; then
                        warning "Attempting auto-recovery..."
                        if main_startup; then
                            success "Auto-recovery successful"
                        else
                            error "Auto-recovery failed - manual intervention required"
                            break
                        fi
                    else
                        break
                    fi
                fi
            done
        else
            info "[DRY RUN] Startup simulation completed"
        fi
    else
        error "Startup failed - check logs for details"
        exit 1
    fi
}

# Execute main function
main "$@"