#!/bin/bash

# 🔧 AUTOMATED TROUBLESHOOTER
# Intelligent problem detection and automated fixing for Alfalyzer

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

# Troubleshooting settings
AUTO_FIX=false
INTERACTIVE=true
VERBOSE=false
DRY_RUN=false

# Issue tracking
ISSUES_FOUND=0
ISSUES_FIXED=0
declare -a ISSUE_LIST=()

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1" | tee -a "$LOG_DIR/auto-troubleshoot.log"
}

success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_DIR/auto-troubleshoot.log"
}

error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$LOG_DIR/auto-troubleshoot.log"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$LOG_DIR/auto-troubleshoot.log"
}

info() {
    echo -e "${CYAN}ℹ️  $1${NC}" | tee -a "$LOG_DIR/auto-troubleshoot.log"
}

debug() {
    if [ "$VERBOSE" = true ]; then
        echo -e "${PURPLE}🔍 $1${NC}" | tee -a "$LOG_DIR/auto-troubleshoot.log"
    fi
}

# Banner
show_banner() {
    echo -e "${BOLD}${CYAN}"
    cat << 'EOF'
🔧 ┌─────────────────────────────────────────────┐
   │        AUTOMATED TROUBLESHOOTER            │
   │    Intelligent Problem Detection & Fix     │
   └─────────────────────────────────────────────┘
EOF
    echo -e "${NC}"
}

# Initialize
init_troubleshooter() {
    mkdir -p "$LOG_DIR"
    
    cat > "$LOG_DIR/auto-troubleshoot.log" << EOF
# Auto-Troubleshooter Log
# Started: $(date)
# Script: $0
# Arguments: $*

EOF
    
    log "Auto-troubleshooter initialized"
}

# Record issue
record_issue() {
    local issue="$1"
    local severity="${2:-medium}"
    
    ISSUE_LIST+=("$severity: $issue")
    ((ISSUES_FOUND++))
    
    case $severity in
        "critical")
            error "CRITICAL: $issue"
            ;;
        "high")
            error "HIGH: $issue"
            ;;
        "medium")
            warning "MEDIUM: $issue"
            ;;
        "low")
            info "LOW: $issue"
            ;;
    esac
}

# Ask for confirmation
ask_for_fix() {
    local issue="$1"
    local fix_description="$2"
    
    if [ "$AUTO_FIX" = true ]; then
        return 0
    fi
    
    if [ "$INTERACTIVE" = false ]; then
        return 1
    fi
    
    echo ""
    echo -e "${YELLOW}Issue found:${NC} $issue"
    echo -e "${CYAN}Proposed fix:${NC} $fix_description"
    echo ""
    
    read -p "Apply this fix? (y/N): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        return 0
    else
        return 1
    fi
}

# Apply fix
apply_fix() {
    local fix_command="$1"
    local fix_description="$2"
    
    if [ "$DRY_RUN" = true ]; then
        info "[DRY RUN] Would execute: $fix_command"
        info "[DRY RUN] Description: $fix_description"
        ((ISSUES_FIXED++))
        return 0
    fi
    
    log "Applying fix: $fix_description"
    debug "Executing: $fix_command"
    
    if eval "$fix_command"; then
        success "Fix applied successfully: $fix_description"
        ((ISSUES_FIXED++))
        return 0
    else
        error "Fix failed: $fix_description"
        return 1
    fi
}

# Issue detection functions

# Check if services are running
check_services_running() {
    log "Checking if services are running..."
    
    local backend_running=false
    local frontend_running=false
    
    # Check backend
    if curl -sf "http://localhost:3001/api/health" >/dev/null 2>&1; then
        backend_running=true
        success "Backend service is running"
    else
        record_issue "Backend service is not running" "high"
        
        if ask_for_fix "Backend not running" "Start backend service"; then
            apply_fix "PORT=3001 tsx --env-file=.env server/index.ts &" "Start backend service"
        fi
    fi
    
    # Check frontend
    if curl -sf "http://localhost:3000" >/dev/null 2>&1; then
        frontend_running=true
        success "Frontend service is running"
    else
        record_issue "Frontend service is not running" "high"
        
        if ask_for_fix "Frontend not running" "Start frontend service"; then
            apply_fix "cd $ROOT_DIR && vite --port 3000 &" "Start frontend service"
        fi
    fi
    
    # If both are down, suggest full startup
    if [ "$backend_running" = false ] && [ "$frontend_running" = false ]; then
        if ask_for_fix "Both services down" "Run bulletproof startup"; then
            apply_fix "$SCRIPT_DIR/bulletproof-start.sh" "Full bulletproof startup"
        fi
    fi
}

# Check port conflicts
check_port_conflicts() {
    log "Checking for port conflicts..."
    
    local ports=(3000 3001)
    local conflicts=0
    
    for port in "${ports[@]}"; do
        if [ -x "$SCRIPT_DIR/port-manager.sh" ]; then
            if ! "$SCRIPT_DIR/port-manager.sh" check-port "$port" >/dev/null 2>&1; then
                record_issue "Port $port is in use" "medium"
                ((conflicts++))
                
                if ask_for_fix "Port $port conflict" "Clean up port $port"; then
                    apply_fix "$SCRIPT_DIR/port-manager.sh kill-port $port" "Clean up port $port"
                fi
            fi
        else
            # Fallback check
            if nc -z localhost "$port" 2>/dev/null; then
                record_issue "Port $port appears to be in use" "medium"
                ((conflicts++))
            fi
        fi
    done
    
    if [ $conflicts -gt 0 ]; then
        if ask_for_fix "Multiple port conflicts" "Force cleanup all ports"; then
            apply_fix "$SCRIPT_DIR/port-manager.sh cleanup --force" "Force cleanup all ports"
        fi
    else
        success "No port conflicts detected"
    fi
}

# Check environment setup
check_environment() {
    log "Checking environment setup..."
    
    # Check Node.js
    if ! command -v node >/dev/null 2>&1; then
        record_issue "Node.js is not installed" "critical"
        
        if ask_for_fix "Node.js missing" "Install Node.js"; then
            apply_fix "$SCRIPT_DIR/environment-validator.sh --auto-fix" "Install Node.js"
        fi
    else
        local node_version
        node_version=$(node --version)
        success "Node.js $node_version is available"
    fi
    
    # Check npm
    if ! command -v npm >/dev/null 2>&1; then
        record_issue "npm is not installed" "critical"
    else
        success "npm is available"
    fi
    
    # Check package.json
    if [ ! -f "$ROOT_DIR/package.json" ]; then
        record_issue "package.json is missing" "critical"
    else
        success "package.json exists"
    fi
    
    # Check dependencies
    if [ ! -d "$ROOT_DIR/node_modules" ]; then
        record_issue "Dependencies are not installed" "high"
        
        if ask_for_fix "Missing dependencies" "Install dependencies"; then
            apply_fix "cd $ROOT_DIR && npm install" "Install dependencies"
        fi
    else
        success "Dependencies are installed"
    fi
    
    # Check .env file
    if [ ! -f "$ROOT_DIR/.env" ]; then
        record_issue ".env file is missing" "medium"
        
        if [ -f "$ROOT_DIR/.env.example" ]; then
            if ask_for_fix "Missing .env file" "Create .env from .env.example"; then
                apply_fix "cp $ROOT_DIR/.env.example $ROOT_DIR/.env" "Create .env file"
            fi
        fi
    else
        success ".env file exists"
    fi
}

# Check disk space
check_disk_space() {
    log "Checking disk space..."
    
    local available_space
    available_space=$(df -h "$ROOT_DIR" | awk 'NR==2 {print $4}' | tr -d 'G')
    
    if [ "${available_space%.*}" -lt 1 ]; then
        record_issue "Low disk space: ${available_space}G available" "high"
        
        if ask_for_fix "Low disk space" "Clean up temporary files"; then
            apply_fix "rm -rf $ROOT_DIR/node_modules/.cache $ROOT_DIR/dist/* $ROOT_DIR/logs/*.log.*" "Clean temporary files"
        fi
    else
        success "Sufficient disk space: ${available_space}G available"
    fi
}

# Check memory usage
check_memory_usage() {
    log "Checking memory usage..."
    
    # Check if any Node.js processes are consuming too much memory
    local high_memory_pids
    high_memory_pids=$(ps aux | awk '$4 > 10 && /node/ {print $2, $4"%"}' | head -5)
    
    if [ -n "$high_memory_pids" ]; then
        warning "High memory usage detected in Node.js processes:"
        echo "$high_memory_pids" | while read -r pid memory; do
            warning "  PID $pid using $memory memory"
        done
        
        record_issue "High memory usage detected" "medium"
        
        if ask_for_fix "High memory usage" "Restart services to free memory"; then
            apply_fix "$SCRIPT_DIR/bulletproof-stop.sh && sleep 5 && $SCRIPT_DIR/bulletproof-start.sh" "Restart services"
        fi
    else
        success "Memory usage is normal"
    fi
}

# Check log files for errors
check_log_errors() {
    log "Checking log files for errors..."
    
    local log_files=("$LOG_DIR/backend.log" "$LOG_DIR/frontend.log")
    local error_count=0
    
    for log_file in "${log_files[@]}"; do
        if [ -f "$log_file" ]; then
            local errors
            errors=$(tail -50 "$log_file" | grep -i -E "(error|exception|failed|fatal)" | wc -l)
            
            if [ "$errors" -gt 0 ]; then
                record_issue "Found $errors recent errors in $(basename "$log_file")" "medium"
                ((error_count++))
                
                debug "Recent errors in $log_file:"
                tail -20 "$log_file" | grep -i -E "(error|exception|failed|fatal)" | head -5 | while read -r line; do
                    debug "  $line"
                done
            fi
        fi
    done
    
    if [ $error_count -eq 0 ]; then
        success "No recent errors found in log files"
    elif ask_for_fix "Errors in log files" "Archive current logs and restart"; then
        apply_fix "$SCRIPT_DIR/bulletproof-stop.sh --cleanup-logs && $SCRIPT_DIR/bulletproof-start.sh" "Archive logs and restart"
    fi
}

# Check API connectivity
check_api_connectivity() {
    log "Checking API connectivity..."
    
    if [ -x "$SCRIPT_DIR/connectivity-test.ts" ]; then
        if "$SCRIPT_DIR/connectivity-test.ts" >/dev/null 2>&1; then
            success "API connectivity test passed"
        else
            record_issue "API connectivity test failed" "medium"
            
            if ask_for_fix "API connectivity issues" "Run connectivity diagnostics"; then
                apply_fix "$SCRIPT_DIR/connectivity-test.ts" "Run connectivity diagnostics"
            fi
        fi
    else
        info "API connectivity test script not available"
    fi
}

# Check database
check_database() {
    log "Checking database..."
    
    if [ -f "$ROOT_DIR/dev.db" ]; then
        # Check if database is accessible
        if command -v sqlite3 >/dev/null 2>&1; then
            if sqlite3 "$ROOT_DIR/dev.db" ".tables" >/dev/null 2>&1; then
                success "Database is accessible"
            else
                record_issue "Database file is corrupted" "high"
                
                if ask_for_fix "Corrupted database" "Reset database"; then
                    apply_fix "rm $ROOT_DIR/dev.db && cd $ROOT_DIR && npm run db:push" "Reset database"
                fi
            fi
        else
            warning "sqlite3 not available, cannot validate database"
        fi
    else
        record_issue "Database file is missing" "medium"
        
        if ask_for_fix "Missing database" "Initialize database"; then
            apply_fix "cd $ROOT_DIR && npm run db:push" "Initialize database"
        fi
    fi
}

# Main troubleshooting function
run_troubleshooting() {
    log "Starting comprehensive troubleshooting..."
    
    # Core system checks
    check_environment
    check_disk_space
    check_memory_usage
    
    # Service checks
    check_services_running
    check_port_conflicts
    check_api_connectivity
    
    # Data checks
    check_database
    check_log_errors
}

# Generate report
generate_report() {
    echo ""
    echo -e "${BOLD}${CYAN}📋 TROUBLESHOOTING REPORT${NC}"
    echo "==========================================="
    echo ""
    echo -e "${CYAN}Summary:${NC}"
    echo -e "  Issues Found: ${YELLOW}$ISSUES_FOUND${NC}"
    echo -e "  Issues Fixed: ${GREEN}$ISSUES_FIXED${NC}"
    echo -e "  Success Rate: $([ $ISSUES_FOUND -eq 0 ] && echo "${GREEN}100%" || echo "$((ISSUES_FIXED * 100 / ISSUES_FOUND))%")${NC}"
    echo ""
    
    if [ ${#ISSUE_LIST[@]} -gt 0 ]; then
        echo -e "${CYAN}Issues Detected:${NC}"
        for issue in "${ISSUE_LIST[@]}"; do
            local severity=$(echo "$issue" | cut -d':' -f1)
            local description=$(echo "$issue" | cut -d':' -f2-)
            
            case $severity in
                "critical")
                    echo -e "  ${RED}🔴 CRITICAL:${NC}$description"
                    ;;
                "high")
                    echo -e "  ${RED}🟠 HIGH:${NC}$description"
                    ;;
                "medium")
                    echo -e "  ${YELLOW}🟡 MEDIUM:${NC}$description"
                    ;;
                "low")
                    echo -e "  ${GREEN}🟢 LOW:${NC}$description"
                    ;;
            esac
        done
        echo ""
    fi
    
    echo -e "${CYAN}Recommendations:${NC}"
    
    if [ $ISSUES_FOUND -eq 0 ]; then
        echo -e "  ${GREEN}🎉 No issues detected! System appears healthy.${NC}"
        echo -e "     Run: ${YELLOW}npm run dev${NC}"
    elif [ $ISSUES_FIXED -eq $ISSUES_FOUND ]; then
        echo -e "  ${GREEN}🎉 All issues have been fixed!${NC}"
        echo -e "     Run: ${YELLOW}npm run dev${NC}"
    else
        echo -e "  ${YELLOW}⚠️  Some issues remain unresolved${NC}"
        echo -e "     Consider running: ${YELLOW}npm run troubleshoot --auto-fix${NC}"
        echo -e "     Or check: ${YELLOW}TROUBLESHOOTING_GUIDE.md${NC}"
    fi
    
    echo ""
    echo -e "${CYAN}Next Steps:${NC}"
    echo -e "  Health Check:     ${YELLOW}npm run health:detailed${NC}"
    echo -e "  Start Services:   ${YELLOW}npm run dev${NC}"
    echo -e "  Monitor Status:   ${YELLOW}npm run status${NC}"
    echo -e "  View Logs:        ${YELLOW}npm run logs${NC}"
    echo ""
    
    # Save report to file
    {
        echo "# Troubleshooting Report - $(date)"
        echo "Issues Found: $ISSUES_FOUND"
        echo "Issues Fixed: $ISSUES_FIXED"
        echo ""
        echo "## Issues:"
        for issue in "${ISSUE_LIST[@]}"; do
            echo "- $issue"
        done
    } > "$LOG_DIR/troubleshooting-report.txt"
    
    info "Report saved to: $LOG_DIR/troubleshooting-report.txt"
}

# Show usage
show_usage() {
    echo -e "${BOLD}Automated Troubleshooter${NC}"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --auto-fix           Automatically fix all detected issues"
    echo "  --non-interactive    Don't prompt for confirmation"
    echo "  --verbose            Enable verbose debug output"
    echo "  --dry-run            Show what would be done without executing"
    echo "  --help               Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                   # Interactive troubleshooting"
    echo "  $0 --auto-fix        # Automatic fixing"
    echo "  $0 --dry-run         # Preview actions"
    echo "  $0 --verbose         # Detailed output"
    echo ""
}

# Parse arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --auto-fix)
                AUTO_FIX=true
                shift
                ;;
            --non-interactive)
                INTERACTIVE=false
                shift
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

# Main execution
main() {
    # Parse arguments
    parse_arguments "$@"
    
    # Show banner
    show_banner
    
    # Initialize
    init_troubleshooter
    
    # Run troubleshooting
    run_troubleshooting
    
    # Generate report
    generate_report
    
    # Exit with appropriate code
    if [ $ISSUES_FOUND -eq 0 ] || [ $ISSUES_FIXED -eq $ISSUES_FOUND ]; then
        success "Troubleshooting completed successfully"
        exit 0
    else
        warning "Some issues remain unresolved"
        exit 1
    fi
}

# Execute main function
main "$@"