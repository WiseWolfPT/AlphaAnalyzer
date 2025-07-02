#!/bin/bash

# 🔍 ENVIRONMENT VALIDATOR
# Comprehensive environment detection, validation, and auto-fixing

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

# Environment requirements
readonly MIN_NODE_VERSION="18.0.0"
readonly MIN_NPM_VERSION="8.0.0"
readonly REQUIRED_COMMANDS=("node" "npm" "curl" "git")
readonly OPTIONAL_COMMANDS=("jq" "sqlite3" "python3" "php")

# Settings
AUTO_FIX=false
VERBOSE=false
CHECK_ONLY=false
SKIP_OPTIONAL=false

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1" | tee -a "$LOG_DIR/environment-validator.log"
}

success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_DIR/environment-validator.log"
}

error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$LOG_DIR/environment-validator.log"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$LOG_DIR/environment-validator.log"
}

info() {
    echo -e "${CYAN}ℹ️  $1${NC}" | tee -a "$LOG_DIR/environment-validator.log"
}

debug() {
    if [ "$VERBOSE" = true ]; then
        echo -e "${PURPLE}🔍 $1${NC}" | tee -a "$LOG_DIR/environment-validator.log"
    fi
}

# Banner
show_banner() {
    echo -e "${BOLD}${CYAN}"
    cat << 'EOF'
🔍 ┌─────────────────────────────────────────────┐
   │       ENVIRONMENT VALIDATOR & FIXER        │
   │    Comprehensive Environment Analysis      │
   └─────────────────────────────────────────────┘
EOF
    echo -e "${NC}"
}

# Initialize
init_environment() {
    mkdir -p "$LOG_DIR"
    
    cat > "$LOG_DIR/environment-validator.log" << EOF
# Environment Validator Log
# Started: $(date)
# Script: $0
# Arguments: $*
# Working Directory: $(pwd)

EOF
    
    log "Environment validator initialized"
}

# Version comparison function
version_compare() {
    local version1=$1
    local version2=$2
    
    # Remove 'v' prefix if present
    version1=${version1#v}
    version2=${version2#v}
    
    # Split versions into components
    IFS='.' read -ra V1 <<< "$version1"
    IFS='.' read -ra V2 <<< "$version2"
    
    # Compare each component
    for i in {0..2}; do
        local v1_part=${V1[i]:-0}
        local v2_part=${V2[i]:-0}
        
        if [ "$v1_part" -gt "$v2_part" ]; then
            return 0  # version1 > version2
        elif [ "$v1_part" -lt "$v2_part" ]; then
            return 1  # version1 < version2
        fi
    done
    
    return 0  # versions are equal
}

# Detect operating system
detect_os() {
    log "Detecting operating system..."
    
    local os_info=""
    
    if [ -f /etc/os-release ]; then
        # Linux
        os_info=$(grep PRETTY_NAME /etc/os-release | cut -d'"' -f2)
        echo "linux"
    elif [ "$(uname)" = "Darwin" ]; then
        # macOS
        local version=$(sw_vers -productVersion 2>/dev/null || echo "Unknown")
        os_info="macOS $version"
        echo "macos"
    elif [ "$(uname)" = "CYGWIN"* ] || [ "$(uname)" = "MINGW"* ]; then
        # Windows (Git Bash, MSYS2, etc.)
        os_info="Windows ($(uname))"
        echo "windows"
    else
        os_info="Unknown ($(uname))"
        echo "unknown"
    fi
    
    info "Operating System: $os_info"
}

# Check Node.js version
check_node_version() {
    log "Checking Node.js installation..."
    
    if ! command -v node >/dev/null 2>&1; then
        error "Node.js is not installed"
        
        if [ "$AUTO_FIX" = true ]; then
            attempt_node_installation
        else
            warning "Install Node.js $MIN_NODE_VERSION or higher from https://nodejs.org/"
        fi
        return 1
    fi
    
    local node_version
    node_version=$(node --version)
    debug "Found Node.js version: $node_version"
    
    if version_compare "$node_version" "$MIN_NODE_VERSION"; then
        success "Node.js version $node_version is compatible (minimum: $MIN_NODE_VERSION)"
        return 0
    else
        error "Node.js version $node_version is too old (minimum: $MIN_NODE_VERSION)"
        
        if [ "$AUTO_FIX" = true ]; then
            attempt_node_upgrade
        else
            warning "Please upgrade Node.js to version $MIN_NODE_VERSION or higher"
        fi
        return 1
    fi
}

# Check npm version
check_npm_version() {
    log "Checking npm installation..."
    
    if ! command -v npm >/dev/null 2>&1; then
        error "npm is not installed"
        
        if [ "$AUTO_FIX" = true ]; then
            attempt_npm_installation
        else
            warning "npm should be installed with Node.js"
        fi
        return 1
    fi
    
    local npm_version
    npm_version=$(npm --version)
    debug "Found npm version: $npm_version"
    
    if version_compare "$npm_version" "$MIN_NPM_VERSION"; then
        success "npm version $npm_version is compatible (minimum: $MIN_NPM_VERSION)"
        return 0
    else
        warning "npm version $npm_version is older than recommended (minimum: $MIN_NPM_VERSION)"
        
        if [ "$AUTO_FIX" = true ]; then
            attempt_npm_upgrade
        else
            warning "Consider upgrading npm: npm install -g npm@latest"
        fi
        return 0  # Don't fail for npm version
    fi
}

# Check required commands
check_required_commands() {
    log "Checking required commands..."
    
    local missing_commands=()
    local failed_count=0
    
    for cmd in "${REQUIRED_COMMANDS[@]}"; do
        if command -v "$cmd" >/dev/null 2>&1; then
            local version=""
            case $cmd in
                "node"|"npm")
                    # Already checked above
                    continue
                    ;;
                "curl")
                    version=$(curl --version 2>/dev/null | head -1 | cut -d' ' -f2 || echo "unknown")
                    ;;
                "git")
                    version=$(git --version 2>/dev/null | cut -d' ' -f3 || echo "unknown")
                    ;;
                *)
                    version="available"
                    ;;
            esac
            
            success "$cmd is available (version: $version)"
        else
            error "$cmd is not available"
            missing_commands+=("$cmd")
            ((failed_count++))
        fi
    done
    
    if [ $failed_count -eq 0 ]; then
        success "All required commands are available"
        return 0
    else
        error "$failed_count required commands are missing: ${missing_commands[*]}"
        
        if [ "$AUTO_FIX" = true ]; then
            attempt_install_missing_commands "${missing_commands[@]}"
        else
            warning "Please install missing commands before proceeding"
        fi
        return 1
    fi
}

# Check optional commands
check_optional_commands() {
    if [ "$SKIP_OPTIONAL" = true ]; then
        info "Skipping optional commands check"
        return 0
    fi
    
    log "Checking optional commands..."
    
    local missing_count=0
    local available_count=0
    
    for cmd in "${OPTIONAL_COMMANDS[@]}"; do
        if command -v "$cmd" >/dev/null 2>&1; then
            local version=""
            case $cmd in
                "jq")
                    version=$(jq --version 2>/dev/null | cut -d'-' -f2 || echo "unknown")
                    ;;
                "sqlite3")
                    version=$(sqlite3 -version 2>/dev/null | cut -d' ' -f1 || echo "unknown")
                    ;;
                "python3")
                    version=$(python3 --version 2>/dev/null | cut -d' ' -f2 || echo "unknown")
                    ;;
                "php")
                    version=$(php --version 2>/dev/null | head -1 | cut -d' ' -f2 || echo "unknown")
                    ;;
                *)
                    version="available"
                    ;;
            esac
            
            success "$cmd is available (version: $version)"
            ((available_count++))
        else
            warning "$cmd is not available (optional)"
            ((missing_count++))
        fi
    done
    
    info "Optional commands: $available_count available, $missing_count missing"
    
    if [ $missing_count -gt 0 ] && [ "$AUTO_FIX" = true ]; then
        info "Auto-fix for optional commands is available but not automatic"
        info "Run with --install-optional to install missing optional commands"
    fi
    
    return 0
}

# Check project structure
check_project_structure() {
    log "Checking project structure..."
    
    local required_files=(
        "package.json"
        "server/index.ts"
        "client/src/App.tsx"
        "vite.config.ts"
        "tsconfig.json"
    )
    
    local required_dirs=(
        "server"
        "client"
        "client/src"
        "shared"
        "scripts"
    )
    
    local missing_files=()
    local missing_dirs=()
    local failed_count=0
    
    # Check files
    for file in "${required_files[@]}"; do
        if [ -f "$ROOT_DIR/$file" ]; then
            success "Required file exists: $file"
        else
            error "Required file missing: $file"
            missing_files+=("$file")
            ((failed_count++))
        fi
    done
    
    # Check directories
    for dir in "${required_dirs[@]}"; do
        if [ -d "$ROOT_DIR/$dir" ]; then
            success "Required directory exists: $dir"
        else
            error "Required directory missing: $dir"
            missing_dirs+=("$dir")
            ((failed_count++))
        fi
    done
    
    if [ $failed_count -eq 0 ]; then
        success "Project structure is complete"
        return 0
    else
        error "Project structure is incomplete ($failed_count issues)"
        
        if [ "$AUTO_FIX" = true ]; then
            attempt_fix_project_structure "${missing_dirs[@]}" "${missing_files[@]}"
        else
            warning "Please ensure all required files and directories exist"
        fi
        return 1
    fi
}

# Check package.json and dependencies
check_dependencies() {
    log "Checking dependencies..."
    
    if [ ! -f "$ROOT_DIR/package.json" ]; then
        error "package.json not found"
        return 1
    fi
    
    # Validate package.json format
    if ! jq empty "$ROOT_DIR/package.json" >/dev/null 2>&1; then
        error "package.json is not valid JSON"
        return 1
    fi
    
    success "package.json is valid"
    
    # Check if node_modules exists
    if [ -d "$ROOT_DIR/node_modules" ]; then
        local module_count
        module_count=$(find "$ROOT_DIR/node_modules" -maxdepth 1 -type d | wc -l)
        success "node_modules exists with $((module_count - 1)) packages"
        
        # Check for common dependency issues
        local critical_deps=("react" "express" "typescript" "vite")
        for dep in "${critical_deps[@]}"; do
            if [ -d "$ROOT_DIR/node_modules/$dep" ]; then
                debug "Critical dependency available: $dep"
            else
                warning "Critical dependency may be missing: $dep"
            fi
        done
    else
        warning "node_modules directory not found"
        
        if [ "$AUTO_FIX" = true ]; then
            attempt_install_dependencies
        else
            warning "Run 'npm install' to install dependencies"
        fi
        return 1
    fi
    
    return 0
}

# Check environment variables
check_environment_variables() {
    log "Checking environment variables..."
    
    local env_file="$ROOT_DIR/.env"
    local env_example="$ROOT_DIR/.env.example"
    
    if [ -f "$env_file" ]; then
        success ".env file exists"
        
        # Check for critical environment variables
        local critical_vars=("NODE_ENV" "PORT")
        local missing_vars=()
        
        for var in "${critical_vars[@]}"; do
            if grep -q "^$var=" "$env_file" 2>/dev/null; then
                debug "Environment variable defined: $var"
            else
                missing_vars+=("$var")
            fi
        done
        
        if [ ${#missing_vars[@]} -eq 0 ]; then
            success "All critical environment variables are defined"
        else
            warning "Missing environment variables: ${missing_vars[*]}"
        fi
        
        # Check for API keys (optional)
        local api_keys=("ALPHA_VANTAGE_API_KEY" "FINNHUB_API_KEY" "FMP_API_KEY")
        local api_count=0
        
        for key in "${api_keys[@]}"; do
            if grep -q "^$key=" "$env_file" 2>/dev/null; then
                ((api_count++))
            fi
        done
        
        info "API keys configured: $api_count/${#api_keys[@]}"
        
    else
        warning ".env file not found"
        
        if [ -f "$env_example" ]; then
            info ".env.example file exists"
            
            if [ "$AUTO_FIX" = true ]; then
                attempt_create_env_file
            else
                warning "Copy .env.example to .env and configure your API keys"
            fi
        else
            warning "No .env.example file found"
        fi
    fi
    
    return 0
}

# Check port availability
check_port_availability() {
    log "Checking port availability..."
    
    local default_ports=(3000 3001)
    local issues=0
    
    for port in "${default_ports[@]}"; do
        if command -v "$SCRIPT_DIR/port-manager.sh" >/dev/null 2>&1; then
            if "$SCRIPT_DIR/port-manager.sh" check-port "$port" >/dev/null 2>&1; then
                success "Port $port is available"
            else
                warning "Port $port is in use"
                ((issues++))
            fi
        else
            # Fallback check
            if ! nc -z localhost "$port" 2>/dev/null; then
                success "Port $port is available"
            else
                warning "Port $port is in use"
                ((issues++))
            fi
        fi
    done
    
    if [ $issues -eq 0 ]; then
        success "All default ports are available"
    else
        warning "$issues default ports are in use"
        info "Bulletproof startup will find alternative ports automatically"
    fi
    
    return 0
}

# Auto-fix functions
attempt_node_installation() {
    log "Attempting to install Node.js..."
    
    local os_type
    os_type=$(detect_os)
    
    case $os_type in
        "macos")
            if command -v brew >/dev/null 2>&1; then
                info "Installing Node.js via Homebrew..."
                brew install node || warning "Failed to install Node.js via Homebrew"
            else
                warning "Homebrew not available. Please install Node.js manually from https://nodejs.org/"
            fi
            ;;
        "linux")
            if command -v apt-get >/dev/null 2>&1; then
                info "Installing Node.js via apt-get..."
                sudo apt-get update && sudo apt-get install -y nodejs npm || warning "Failed to install Node.js via apt-get"
            elif command -v yum >/dev/null 2>&1; then
                info "Installing Node.js via yum..."
                sudo yum install -y nodejs npm || warning "Failed to install Node.js via yum"
            else
                warning "Package manager not recognized. Please install Node.js manually"
            fi
            ;;
        *)
            warning "Auto-installation not supported for this OS. Please install Node.js manually"
            ;;
    esac
}

attempt_npm_upgrade() {
    log "Attempting to upgrade npm..."
    
    if npm install -g npm@latest; then
        success "npm upgraded successfully"
    else
        warning "Failed to upgrade npm. You may need to run: sudo npm install -g npm@latest"
    fi
}

attempt_install_dependencies() {
    log "Attempting to install dependencies..."
    
    cd "$ROOT_DIR"
    
    if npm install; then
        success "Dependencies installed successfully"
    else
        error "Failed to install dependencies"
        return 1
    fi
}

attempt_create_env_file() {
    log "Attempting to create .env file..."
    
    if [ -f "$ROOT_DIR/.env.example" ]; then
        cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
        success ".env file created from .env.example"
        warning "Please configure your API keys in .env file"
    else
        # Create a basic .env file
        cat > "$ROOT_DIR/.env" << EOF
# Alfalyzer Environment Configuration
NODE_ENV=development
PORT=3001

# API Keys (get these from respective providers)
# ALPHA_VANTAGE_API_KEY=your_key_here
# FINNHUB_API_KEY=your_key_here
# FMP_API_KEY=your_key_here
# TWELVE_DATA_API_KEY=your_key_here

# Database
DATABASE_URL=./dev.db

# Optional: Enable debug logging
# DEBUG=true
EOF
        success "Basic .env file created"
        warning "Please configure your API keys in .env file"
    fi
}

# Generate summary report
generate_summary() {
    echo ""
    echo -e "${BOLD}${CYAN}📊 ENVIRONMENT VALIDATION SUMMARY${NC}"
    echo "============================================"
    echo ""
    
    # Re-run quick checks for summary
    local node_ok=false
    local npm_ok=false
    local deps_ok=false
    local structure_ok=false
    
    if command -v node >/dev/null 2>&1 && version_compare "$(node --version)" "$MIN_NODE_VERSION"; then
        node_ok=true
    fi
    
    if command -v npm >/dev/null 2>&1; then
        npm_ok=true
    fi
    
    if [ -d "$ROOT_DIR/node_modules" ]; then
        deps_ok=true
    fi
    
    if [ -f "$ROOT_DIR/package.json" ] && [ -f "$ROOT_DIR/server/index.ts" ]; then
        structure_ok=true
    fi
    
    # Summary table
    echo -e "${CYAN}Component Status:${NC}"
    echo -e "  Node.js:     $([ "$node_ok" = true ] && echo "${GREEN}✅ Ready${NC}" || echo "${RED}❌ Issue${NC}")"
    echo -e "  npm:         $([ "$npm_ok" = true ] && echo "${GREEN}✅ Ready${NC}" || echo "${RED}❌ Issue${NC}")"
    echo -e "  Dependencies:$([ "$deps_ok" = true ] && echo "${GREEN}✅ Ready${NC}" || echo "${YELLOW}⚠️  Missing${NC}")"
    echo -e "  Structure:   $([ "$structure_ok" = true ] && echo "${GREEN}✅ Ready${NC}" || echo "${RED}❌ Issue${NC}")"
    
    echo ""
    echo -e "${CYAN}Recommendations:${NC}"
    
    if [ "$node_ok" = true ] && [ "$npm_ok" = true ] && [ "$deps_ok" = true ] && [ "$structure_ok" = true ]; then
        echo -e "  ${GREEN}🎉 Environment is ready for development!${NC}"
        echo -e "  ${GREEN}   Run: npm run dev${NC}"
    else
        echo -e "  ${YELLOW}⚠️  Some issues need to be addressed${NC}"
        
        if [ "$node_ok" = false ]; then
            echo -e "     • Install Node.js $MIN_NODE_VERSION or higher"
        fi
        
        if [ "$deps_ok" = false ]; then
            echo -e "     • Run: npm install"
        fi
        
        if [ "$AUTO_FIX" = false ]; then
            echo -e "     • Re-run with --auto-fix to attempt automatic fixes"
        fi
    fi
    
    echo ""
    echo -e "${CYAN}Next Steps:${NC}"
    echo -e "  Detailed Health Check: ${YELLOW}npm run health:check${NC}"
    echo -e "  Start Development:     ${YELLOW}npm run dev${NC}"
    echo -e "  Troubleshooting:       ${YELLOW}npm run troubleshoot${NC}"
    echo ""
}

# Show usage
show_usage() {
    echo -e "${BOLD}Environment Validator & Fixer${NC}"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --auto-fix           Attempt to automatically fix issues"
    echo "  --check-only         Only check environment, don't suggest fixes"
    echo "  --skip-optional      Skip optional command checks"
    echo "  --verbose            Enable verbose debug output"
    echo "  --help               Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                   # Check environment"
    echo "  $0 --auto-fix        # Check and attempt to fix issues"
    echo "  $0 --verbose         # Detailed output"
    echo "  $0 --check-only      # Quick check without suggestions"
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
            --check-only)
                CHECK_ONLY=true
                shift
                ;;
            --skip-optional)
                SKIP_OPTIONAL=true
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

# Main validation function
main() {
    # Parse arguments
    parse_arguments "$@"
    
    # Show banner
    show_banner
    
    # Initialize
    init_environment
    
    # Detect OS
    local os_type
    os_type=$(detect_os)
    
    # Run checks
    local failed_checks=0
    
    # Core system checks
    check_node_version || ((failed_checks++))
    check_npm_version || ((failed_checks++))
    check_required_commands || ((failed_checks++))
    check_optional_commands
    
    # Project-specific checks
    check_project_structure || ((failed_checks++))
    check_dependencies || ((failed_checks++))
    check_environment_variables
    check_port_availability
    
    # Generate summary
    generate_summary
    
    # Exit with appropriate code
    if [ $failed_checks -eq 0 ]; then
        success "Environment validation completed successfully"
        exit 0
    else
        warning "Environment validation completed with $failed_checks issues"
        exit 1
    fi
}

# Execute main function
main "$@"