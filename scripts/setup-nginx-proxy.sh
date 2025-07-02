#!/bin/bash

# Alfalyzer Nginx Reverse Proxy Setup Script
# This script sets up nginx as a reverse proxy for local development

echo "🔧 Alfalyzer Nginx Reverse Proxy Setup"
echo "======================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ️${NC} $1"
}

# Function to detect operating system
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    else
        echo "unknown"
    fi
}

# Function to check if nginx is installed
check_nginx() {
    if command -v nginx &> /dev/null; then
        local version=$(nginx -v 2>&1 | cut -d'/' -f2)
        print_status "Nginx is installed (version: $version)"
        return 0
    else
        print_warning "Nginx is not installed"
        return 1
    fi
}

# Function to install nginx
install_nginx() {
    local os=$(detect_os)
    
    print_info "Installing nginx..."
    
    case $os in
        "macos")
            if command -v brew &> /dev/null; then
                brew install nginx
            else
                print_error "Homebrew not found. Please install Homebrew first:"
                echo "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
                return 1
            fi
            ;;
        "linux")
            if command -v apt-get &> /dev/null; then
                sudo apt-get update && sudo apt-get install -y nginx
            elif command -v yum &> /dev/null; then
                sudo yum install -y nginx
            elif command -v dnf &> /dev/null; then
                sudo dnf install -y nginx
            else
                print_error "Package manager not found. Please install nginx manually."
                return 1
            fi
            ;;
        *)
            print_error "Unsupported operating system: $OSTYPE"
            return 1
            ;;
    esac
    
    if check_nginx; then
        print_status "Nginx installed successfully"
    else
        print_error "Failed to install nginx"
        return 1
    fi
}

# Function to setup nginx configuration
setup_nginx_config() {
    local os=$(detect_os)
    local nginx_conf_dir
    local nginx_available_dir
    local nginx_enabled_dir
    
    # Determine nginx directories based on OS
    case $os in
        "macos")
            if [[ -d "/opt/homebrew/etc/nginx" ]]; then
                nginx_conf_dir="/opt/homebrew/etc/nginx"
            elif [[ -d "/usr/local/etc/nginx" ]]; then
                nginx_conf_dir="/usr/local/etc/nginx"
            else
                print_error "Could not find nginx configuration directory"
                return 1
            fi
            nginx_available_dir="$nginx_conf_dir/sites-available"
            nginx_enabled_dir="$nginx_conf_dir/sites-enabled"
            ;;
        "linux")
            nginx_conf_dir="/etc/nginx"
            nginx_available_dir="$nginx_conf_dir/sites-available"
            nginx_enabled_dir="$nginx_conf_dir/sites-enabled"
            ;;
        *)
            print_error "Unsupported operating system"
            return 1
            ;;
    esac
    
    print_info "Setting up nginx configuration..."
    
    # Create sites-available and sites-enabled directories if they don't exist
    sudo mkdir -p "$nginx_available_dir"
    sudo mkdir -p "$nginx_enabled_dir"
    
    # Copy our configuration
    sudo cp "$(dirname "$0")/../nginx/alfalyzer.conf" "$nginx_available_dir/alfalyzer"
    
    # Create symbolic link to enable the site
    if [[ -L "$nginx_enabled_dir/alfalyzer" ]]; then
        print_warning "Alfalyzer configuration already enabled"
    else
        sudo ln -s "$nginx_available_dir/alfalyzer" "$nginx_enabled_dir/alfalyzer"
        print_status "Alfalyzer configuration enabled"
    fi
    
    # Update main nginx.conf to include sites-enabled
    local main_conf="$nginx_conf_dir/nginx.conf"
    if ! grep -q "sites-enabled" "$main_conf"; then
        print_info "Updating main nginx configuration..."
        
        # Backup original config
        sudo cp "$main_conf" "$main_conf.alfalyzer.backup"
        
        # Add include directive
        sudo sed -i.bak '/http {/a\
    include '"$nginx_enabled_dir"'/*;' "$main_conf"
        
        print_status "Main nginx configuration updated"
    else
        print_info "Main nginx configuration already includes sites-enabled"
    fi
}

# Function to test nginx configuration
test_nginx_config() {
    print_info "Testing nginx configuration..."
    
    if sudo nginx -t; then
        print_status "Nginx configuration is valid"
        return 0
    else
        print_error "Nginx configuration has errors"
        return 1
    fi
}

# Function to start/restart nginx
start_nginx() {
    local os=$(detect_os)
    
    print_info "Starting nginx..."
    
    case $os in
        "macos")
            if brew services list | grep -q "nginx.*started"; then
                brew services restart nginx
                print_status "Nginx restarted"
            else
                brew services start nginx
                print_status "Nginx started"
            fi
            ;;
        "linux")
            if systemctl is-active --quiet nginx; then
                sudo systemctl restart nginx
                print_status "Nginx restarted"
            else
                sudo systemctl start nginx
                sudo systemctl enable nginx
                print_status "Nginx started and enabled"
            fi
            ;;
    esac
}

# Function to show access URLs
show_access_urls() {
    echo ""
    print_info "🌐 Nginx Reverse Proxy Access URLs:"
    echo "========================================"
    echo ""
    echo "📱 Main Application (Load Balanced):"
    echo "   http://alfalyzer.local/"
    echo "   http://app.alfalyzer.local/"
    echo "   http://localhost/"
    echo ""
    echo "🔧 Development Server:"
    echo "   http://dev.alfalyzer.local:8081/"
    echo "   http://localhost:8081/"
    echo ""
    echo "🔌 API Only:"
    echo "   http://api.alfalyzer.local:8082/"
    echo "   http://localhost:8082/api/health"
    echo ""
    echo "📊 Load Balancer Status:"
    echo "   http://localhost:8083/"
    echo "   http://localhost:8083/nginx_status"
    echo ""
    echo "💡 Features:"
    echo "   ✓ Load balancing across multiple frontend ports"
    echo "   ✓ API failover (3001 → 3002)"
    echo "   ✓ Rate limiting and security headers"
    echo "   ✓ WebSocket support"
    echo "   ✓ Static asset caching"
    echo ""
}

# Function to show status
show_status() {
    echo ""
    print_info "📊 System Status:"
    echo "=================="
    
    # Check nginx status
    if pgrep nginx > /dev/null; then
        print_status "Nginx is running"
    else
        print_warning "Nginx is not running"
    fi
    
    # Check application ports
    local ports=(3000 3001 3005 8080)
    for port in "${ports[@]}"; do
        if lsof -i :$port > /dev/null 2>&1; then
            print_status "Port $port is active"
        else
            print_warning "Port $port is not active"
        fi
    done
    
    echo ""
    print_info "🔧 Management Commands:"
    echo "   Start Alfalyzer: npm run dev:multi"
    echo "   Stop Nginx: sudo nginx -s quit"
    echo "   Reload Nginx: sudo nginx -s reload"
    echo "   Test Config: sudo nginx -t"
}

# Function to cleanup/remove configuration
cleanup() {
    local os=$(detect_os)
    
    print_info "Removing Alfalyzer nginx configuration..."
    
    case $os in
        "macos")
            if [[ -d "/opt/homebrew/etc/nginx" ]]; then
                nginx_conf_dir="/opt/homebrew/etc/nginx"
            elif [[ -d "/usr/local/etc/nginx" ]]; then
                nginx_conf_dir="/usr/local/etc/nginx"
            fi
            ;;
        "linux")
            nginx_conf_dir="/etc/nginx"
            ;;
    esac
    
    # Remove symlink
    if [[ -L "$nginx_conf_dir/sites-enabled/alfalyzer" ]]; then
        sudo rm "$nginx_conf_dir/sites-enabled/alfalyzer"
        print_status "Removed enabled configuration"
    fi
    
    # Remove configuration file
    if [[ -f "$nginx_conf_dir/sites-available/alfalyzer" ]]; then
        sudo rm "$nginx_conf_dir/sites-available/alfalyzer"
        print_status "Removed configuration file"
    fi
    
    # Restart nginx
    start_nginx
    
    print_status "Cleanup completed"
}

# Main execution
case "${1:-install}" in
    "install"|"setup")
        if ! check_nginx; then
            install_nginx || exit 1
        fi
        setup_nginx_config || exit 1
        test_nginx_config || exit 1
        start_nginx || exit 1
        show_access_urls
        show_status
        ;;
    "start"|"restart")
        start_nginx
        show_status
        ;;
    "test"|"check")
        test_nginx_config
        ;;
    "status")
        show_status
        ;;
    "urls"|"info")
        show_access_urls
        ;;
    "cleanup"|"remove"|"uninstall")
        cleanup
        ;;
    "help"|"-h"|"--help")
        echo "Alfalyzer Nginx Reverse Proxy Setup"
        echo ""
        echo "Usage: bash scripts/setup-nginx-proxy.sh [command]"
        echo ""
        echo "Commands:"
        echo "  install   - Install and configure nginx (default)"
        echo "  start     - Start/restart nginx"
        echo "  test      - Test nginx configuration"
        echo "  status    - Show system status"
        echo "  urls      - Show access URLs"
        echo "  cleanup   - Remove Alfalyzer configuration"
        echo "  help      - Show this help"
        ;;
    *)
        print_error "Unknown command: $1"
        echo "Use: bash scripts/setup-nginx-proxy.sh help"
        exit 1
        ;;
esac