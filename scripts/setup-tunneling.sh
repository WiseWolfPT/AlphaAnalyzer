#!/bin/bash

# Alfalyzer Local Tunneling Setup Script
# This script sets up various tunneling solutions for accessing the local development server

echo "🚇 Alfalyzer Local Tunneling Setup"
echo "=================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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

print_tunnel() {
    echo -e "${PURPLE}🚇${NC} $1"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
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

# Function to install ngrok
install_ngrok() {
    local os=$(detect_os)
    
    print_info "Installing ngrok..."
    
    case $os in
        "macos")
            if command_exists brew; then
                brew install ngrok/ngrok/ngrok
            else
                print_warning "Homebrew not found. Installing ngrok manually..."
                curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
                echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
                sudo apt update && sudo apt install ngrok
            fi
            ;;
        "linux")
            curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
            echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
            sudo apt update && sudo apt install ngrok
            ;;
        *)
            print_error "Unsupported OS for automatic ngrok installation"
            print_info "Please install ngrok manually from https://ngrok.com/download"
            return 1
            ;;
    esac
    
    if command_exists ngrok; then
        print_status "ngrok installed successfully"
        return 0
    else
        print_error "Failed to install ngrok"
        return 1
    fi
}

# Function to install localtunnel
install_localtunnel() {
    print_info "Installing localtunnel..."
    
    if command_exists npm; then
        npm install -g localtunnel
        
        if command_exists lt; then
            print_status "localtunnel installed successfully"
            return 0
        else
            print_error "Failed to install localtunnel"
            return 1
        fi
    else
        print_error "npm not found. Please install Node.js first"
        return 1
    fi
}

# Function to start ngrok tunnel
start_ngrok_tunnel() {
    local port=${1:-3000}
    local subdomain=${2:-}
    
    if ! command_exists ngrok; then
        print_warning "ngrok not found. Installing..."
        install_ngrok || return 1
    fi
    
    print_tunnel "Starting ngrok tunnel on port $port..."
    
    # Check if ngrok is already running
    if pgrep ngrok > /dev/null; then
        print_warning "ngrok is already running. Stopping previous instance..."
        pkill ngrok
        sleep 2
    fi
    
    # Start ngrok tunnel
    if [[ -n "$subdomain" ]]; then
        ngrok http --subdomain="$subdomain" "$port" &
    else
        ngrok http "$port" &
    fi
    
    # Wait for ngrok to start
    sleep 3
    
    # Get tunnel URL
    local tunnel_url=$(curl -s http://127.0.0.1:4040/api/tunnels | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    for tunnel in data['tunnels']:
        if tunnel['proto'] == 'https':
            print(tunnel['public_url'])
            break
except:
    pass
")
    
    if [[ -n "$tunnel_url" ]]; then
        print_status "ngrok tunnel active: $tunnel_url"
        echo "$tunnel_url" > /tmp/alfalyzer_ngrok_url.txt
        return 0
    else
        print_error "Failed to start ngrok tunnel"
        return 1
    fi
}

# Function to start localtunnel
start_localtunnel() {
    local port=${1:-3000}
    local subdomain=${2:-alfalyzer-dev}
    
    if ! command_exists lt; then
        print_warning "localtunnel not found. Installing..."
        install_localtunnel || return 1
    fi
    
    print_tunnel "Starting localtunnel on port $port..."
    
    # Kill any existing localtunnel
    pkill -f "lt --port" 2>/dev/null
    sleep 1
    
    # Start localtunnel
    lt --port "$port" --subdomain "$subdomain" > /tmp/alfalyzer_lt.log 2>&1 &
    
    # Wait for localtunnel to start
    sleep 5
    
    # Get tunnel URL from log
    local tunnel_url=$(grep -o 'https://[^[:space:]]*' /tmp/alfalyzer_lt.log | head -1)
    
    if [[ -n "$tunnel_url" ]]; then
        print_status "localtunnel active: $tunnel_url"
        echo "$tunnel_url" > /tmp/alfalyzer_lt_url.txt
        return 0
    else
        print_error "Failed to start localtunnel"
        return 1
    fi
}

# Function to create a simple SSH tunnel
create_ssh_tunnel() {
    local remote_host=${1:-}
    local remote_port=${2:-8080}
    local local_port=${3:-3000}
    
    if [[ -z "$remote_host" ]]; then
        print_error "Remote host is required for SSH tunnel"
        print_info "Usage: $0 ssh-tunnel user@remote-host [remote_port] [local_port]"
        return 1
    fi
    
    print_tunnel "Creating SSH tunnel to $remote_host..."
    
    # Create reverse SSH tunnel
    ssh -R "$remote_port:localhost:$local_port" -N "$remote_host" &
    local ssh_pid=$!
    
    # Save PID for cleanup
    echo "$ssh_pid" > /tmp/alfalyzer_ssh_tunnel.pid
    
    print_status "SSH tunnel created (PID: $ssh_pid)"
    print_info "Access via: http://$remote_host:$remote_port"
    
    return 0
}

# Function to start multiple tunnels
start_multiple_tunnels() {
    print_info "Starting multiple tunneling solutions..."
    
    # Start ngrok for main port
    start_ngrok_tunnel 3000 "alfalyzer-main" &
    
    # Start localtunnel for dev port
    start_localtunnel 3005 "alfalyzer-dev" &
    
    # Wait for both to start
    sleep 5
    
    print_status "Multiple tunnels started"
    show_tunnel_status
}

# Function to show tunnel status
show_tunnel_status() {
    echo ""
    print_info "🚇 Active Tunnels:"
    echo "==================="
    
    # Check ngrok
    if pgrep ngrok > /dev/null; then
        local ngrok_url=$(cat /tmp/alfalyzer_ngrok_url.txt 2>/dev/null || echo "Unknown")
        print_status "ngrok: $ngrok_url"
        print_info "  → Dashboard: http://127.0.0.1:4040"
    else
        print_warning "ngrok: Not running"
    fi
    
    # Check localtunnel
    if pgrep -f "lt --port" > /dev/null; then
        local lt_url=$(cat /tmp/alfalyzer_lt_url.txt 2>/dev/null || echo "Unknown")
        print_status "localtunnel: $lt_url"
    else
        print_warning "localtunnel: Not running"
    fi
    
    # Check SSH tunnel
    if [[ -f /tmp/alfalyzer_ssh_tunnel.pid ]]; then
        local ssh_pid=$(cat /tmp/alfalyzer_ssh_tunnel.pid)
        if kill -0 "$ssh_pid" 2>/dev/null; then
            print_status "SSH tunnel: Active (PID: $ssh_pid)"
        else
            print_warning "SSH tunnel: Not running"
            rm -f /tmp/alfalyzer_ssh_tunnel.pid
        fi
    else
        print_warning "SSH tunnel: Not configured"
    fi
    
    echo ""
    print_info "📱 Local Access:"
    echo "   http://localhost:3000 (main)"
    echo "   http://localhost:3005 (dev)"
    echo "   http://localhost:8080 (alt)"
}

# Function to stop all tunnels
stop_tunnels() {
    print_info "Stopping all tunnels..."
    
    # Stop ngrok
    if pgrep ngrok > /dev/null; then
        pkill ngrok
        print_status "Stopped ngrok"
    fi
    
    # Stop localtunnel
    if pgrep -f "lt --port" > /dev/null; then
        pkill -f "lt --port"
        print_status "Stopped localtunnel"
    fi
    
    # Stop SSH tunnel
    if [[ -f /tmp/alfalyzer_ssh_tunnel.pid ]]; then
        local ssh_pid=$(cat /tmp/alfalyzer_ssh_tunnel.pid)
        if kill -0 "$ssh_pid" 2>/dev/null; then
            kill "$ssh_pid"
            print_status "Stopped SSH tunnel"
        fi
        rm -f /tmp/alfalyzer_ssh_tunnel.pid
    fi
    
    # Clean up temp files
    rm -f /tmp/alfalyzer_*_url.txt /tmp/alfalyzer_lt.log
    
    print_status "All tunnels stopped"
}

# Function to show available tunneling options
show_tunneling_options() {
    echo ""
    print_info "🚇 Available Tunneling Solutions:"
    echo "=================================="
    echo ""
    
    # Check ngrok
    if command_exists ngrok; then
        print_status "ngrok: Installed ✓"
        echo "   Features: HTTPS, custom domains, dashboard"
        echo "   Usage: $0 ngrok [port] [subdomain]"
    else
        print_warning "ngrok: Not installed"
        echo "   Install: $0 install-ngrok"
    fi
    
    echo ""
    
    # Check localtunnel
    if command_exists lt; then
        print_status "localtunnel: Installed ✓"
        echo "   Features: Free, custom subdomains"
        echo "   Usage: $0 localtunnel [port] [subdomain]"
    else
        print_warning "localtunnel: Not installed"
        echo "   Install: $0 install-localtunnel"
    fi
    
    echo ""
    
    # SSH tunnel
    if command_exists ssh; then
        print_status "SSH tunnel: Available ✓"
        echo "   Features: Secure, requires remote server"
        echo "   Usage: $0 ssh-tunnel user@remote-host [remote_port] [local_port]"
    else
        print_warning "SSH tunnel: SSH not available"
    fi
    
    echo ""
    print_info "💡 Quick Start:"
    echo "   $0 ngrok           # Start ngrok on port 3000"
    echo "   $0 localtunnel     # Start localtunnel on port 3000"
    echo "   $0 multi           # Start multiple tunnels"
    echo "   $0 status          # Show tunnel status"
    echo "   $0 stop            # Stop all tunnels"
}

# Function to create a tunnel management script
create_tunnel_manager() {
    local script_path="scripts/tunnel-manager.sh"
    
    cat > "$script_path" << 'EOF'
#!/bin/bash
# Alfalyzer Tunnel Manager
# Quick access to tunnel management

case "${1:-status}" in
    "start"|"ngrok")
        bash scripts/setup-tunneling.sh ngrok 3000
        ;;
    "dev")
        bash scripts/setup-tunneling.sh localtunnel 3005
        ;;
    "multi")
        bash scripts/setup-tunneling.sh multi
        ;;
    "status")
        bash scripts/setup-tunneling.sh status
        ;;
    "stop")
        bash scripts/setup-tunneling.sh stop
        ;;
    *)
        echo "Alfalyzer Tunnel Manager"
        echo "Usage: $0 [start|dev|multi|status|stop]"
        echo ""
        echo "Commands:"
        echo "  start   - Start ngrok tunnel (port 3000)"
        echo "  dev     - Start localtunnel (port 3005)"
        echo "  multi   - Start multiple tunnels"
        echo "  status  - Show tunnel status"
        echo "  stop    - Stop all tunnels"
        ;;
esac
EOF
    
    chmod +x "$script_path"
    print_status "Created tunnel manager at $script_path"
}

# Main execution
case "${1:-help}" in
    "install-ngrok")
        install_ngrok
        ;;
    "install-localtunnel")
        install_localtunnel
        ;;
    "install-all")
        install_ngrok
        install_localtunnel
        ;;
    "ngrok")
        start_ngrok_tunnel "${2:-3000}" "${3:-}"
        ;;
    "localtunnel"|"lt")
        start_localtunnel "${2:-3000}" "${3:-alfalyzer-dev}"
        ;;
    "ssh-tunnel"|"ssh")
        create_ssh_tunnel "$2" "$3" "$4"
        ;;
    "multi"|"all")
        start_multiple_tunnels
        ;;
    "status")
        show_tunnel_status
        ;;
    "stop"|"kill")
        stop_tunnels
        ;;
    "options"|"list")
        show_tunneling_options
        ;;
    "manager")
        create_tunnel_manager
        ;;
    "help"|"-h"|"--help")
        echo "Alfalyzer Local Tunneling Setup"
        echo ""
        echo "Usage: bash scripts/setup-tunneling.sh [command] [options]"
        echo ""
        echo "Commands:"
        echo "  install-ngrok      - Install ngrok"
        echo "  install-localtunnel - Install localtunnel"
        echo "  install-all        - Install all tunneling tools"
        echo "  ngrok [port] [subdomain] - Start ngrok tunnel"
        echo "  localtunnel [port] [subdomain] - Start localtunnel"
        echo "  ssh-tunnel user@host [rport] [lport] - Create SSH tunnel"
        echo "  multi              - Start multiple tunnels"
        echo "  status             - Show tunnel status"
        echo "  stop               - Stop all tunnels"
        echo "  options            - Show available options"
        echo "  manager            - Create tunnel manager script"
        echo "  help               - Show this help"
        echo ""
        echo "Examples:"
        echo "  $0 ngrok                    # Start ngrok on port 3000"
        echo "  $0 ngrok 3005 my-subdomain # Start ngrok on port 3005 with subdomain"
        echo "  $0 localtunnel 3000         # Start localtunnel on port 3000"
        echo "  $0 ssh-tunnel user@server.com 8080 3000 # SSH tunnel"
        echo ""
        ;;
    *)
        print_error "Unknown command: $1"
        echo "Use: bash scripts/setup-tunneling.sh help"
        exit 1
        ;;
esac