#!/bin/bash

# Alfalyzer Docker Development Entrypoint
# This script manages multiple access methods in Docker

set -e

echo "🐳 Alfalyzer Docker Development Environment"
echo "==========================================="

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✅${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ️${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

# Function to check if port is available
check_port() {
    local port=$1
    if netstat -ln | grep -q ":$port "; then
        return 1
    else
        return 0
    fi
}

# Function to wait for service
wait_for_service() {
    local port=$1
    local service=$2
    local max_attempts=30
    local attempt=1
    
    print_info "Waiting for $service on port $port..."
    
    while [ $attempt -le $max_attempts ]; do
        if nc -z localhost $port 2>/dev/null; then
            print_status "$service is ready on port $port"
            return 0
        fi
        
        echo -n "."
        sleep 1
        attempt=$((attempt + 1))
    done
    
    print_warning "$service failed to start on port $port after $max_attempts seconds"
    return 1
}

# Function to setup environment
setup_environment() {
    print_info "Setting up Docker environment..."
    
    # Create log directory
    mkdir -p /var/log/alfalyzer
    
    # Set permissions
    chown -R node:node /app /var/log/alfalyzer
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_info "Installing dependencies..."
        npm ci
    fi
    
    print_status "Environment setup complete"
}

# Function to start nginx
start_nginx() {
    print_info "Starting nginx reverse proxy..."
    
    # Test nginx configuration
    nginx -t 2>/dev/null || {
        print_warning "nginx configuration invalid, using default"
        cp /etc/nginx/nginx.conf.default /etc/nginx/nginx.conf
    }
    
    # Start nginx
    nginx -g "daemon off;" &
    local nginx_pid=$!
    
    # Wait for nginx
    if wait_for_service 80 "nginx"; then
        print_status "nginx started (PID: $nginx_pid)"
        return 0
    else
        print_warning "nginx failed to start"
        return 1
    fi
}

# Function to start backend
start_backend() {
    local port=${1:-3001}
    
    print_info "Starting backend on port $port..."
    
    # Set environment variables
    export PORT=$port
    export NODE_ENV=development
    export DOCKER_ENV=true
    
    # Start backend
    npm run backend &
    local backend_pid=$!
    
    # Wait for backend
    if wait_for_service $port "backend"; then
        print_status "Backend started on port $port (PID: $backend_pid)"
        return 0
    else
        print_warning "Backend failed to start on port $port"
        return 1
    fi
}

# Function to start frontend
start_frontend() {
    local port=${1:-3000}
    local config=${2:-}
    
    print_info "Starting frontend on port $port..."
    
    # Choose the right command based on port
    if [ -n "$config" ]; then
        npm run frontend:$port &
    else
        vite --port $port --host 0.0.0.0 &
    fi
    
    local frontend_pid=$!
    
    # Wait for frontend
    if wait_for_service $port "frontend"; then
        print_status "Frontend started on port $port (PID: $frontend_pid)"
        return 0
    else
        print_warning "Frontend failed to start on port $port"
        return 1
    fi
}

# Function to start tunnels
start_tunnels() {
    print_info "Starting tunneling services..."
    
    # Start simple tunnel
    node scripts/simple-tunnel.js start 3000 8090 &
    sleep 2
    
    # Start localtunnel if available
    if command -v lt >/dev/null 2>&1; then
        lt --port 3000 --subdomain alfalyzer-docker &
        print_status "LocalTunnel started"
    fi
    
    print_status "Tunneling services started"
}

# Function to show access information
show_access_info() {
    local container_ip=$(hostname -i | awk '{print $1}')
    
    echo ""
    print_info "🌐 Access Methods:"
    echo "==================="
    echo ""
    echo "🔗 Inside Container:"
    echo "   http://localhost:3000 (main app)"
    echo "   http://localhost:3005 (dev version)"
    echo "   http://localhost:8080 (alt version)"
    echo "   http://localhost:3001/api/health (API)"
    echo ""
    echo "🌍 From Host System:"
    echo "   http://localhost:3000 (main app)"
    echo "   http://localhost:3005 (dev version)"  
    echo "   http://localhost:8080 (alt version)"
    echo "   http://localhost:80 (nginx proxy)"
    echo ""
    echo "🚇 Tunnels:"
    echo "   http://localhost:8090 (simple tunnel)"
    echo ""
    echo "🔧 Management:"
    echo "   http://localhost:8083 (nginx status)"
    echo ""
    echo "📊 Container Info:"
    echo "   Container IP: $container_ip"
    echo "   Environment: $NODE_ENV"
    echo "   Docker Mode: $DOCKER_ENV"
    echo ""
}

# Function to monitor services
monitor_services() {
    print_info "Starting service monitor..."
    
    while true; do
        sleep 30
        
        # Check services
        local services_ok=true
        
        for port in 3000 3001 3005 8080; do
            if ! nc -z localhost $port 2>/dev/null; then
                print_warning "Service on port $port is not responding"
                services_ok=false
            fi
        done
        
        if [ "$services_ok" = true ]; then
            echo -n "."
        else
            print_warning "Some services are down, check logs"
        fi
    done
}

# Main execution
case "${1:-dev}" in
    "dev")
        setup_environment
        start_backend 3001
        start_frontend 3000
        show_access_info
        monitor_services
        ;;
    
    "multi")
        setup_environment
        start_nginx
        start_backend 3001
        start_backend 3002
        start_frontend 3000
        start_frontend 3005
        start_frontend 8080
        start_tunnels
        show_access_info
        monitor_services
        ;;
    
    "minimal")
        setup_environment
        start_backend 3001
        start_frontend 3000
        show_access_info
        
        # Keep container running
        tail -f /dev/null
        ;;
    
    "nginx-only")
        start_nginx
        show_access_info
        
        # Keep nginx running
        wait
        ;;
    
    "backend-only")
        setup_environment
        start_backend 3001
        show_access_info
        
        # Keep backend running
        wait
        ;;
    
    "frontend-only")
        setup_environment
        start_frontend 3000
        show_access_info
        
        # Keep frontend running
        wait
        ;;
    
    "shell"|"bash")
        setup_environment
        show_access_info
        exec /bin/bash
        ;;
    
    "test")
        setup_environment
        
        print_info "Running connectivity tests..."
        
        # Test internal connectivity
        for port in 3000 3001 3005 8080; do
            if check_port $port; then
                print_status "Port $port is available"
            else
                print_warning "Port $port is in use"
            fi
        done
        
        print_info "Test completed"
        ;;
    
    *)
        echo "Alfalyzer Docker Entrypoint"
        echo ""
        echo "Usage: docker run alfalyzer [command]"
        echo ""
        echo "Commands:"
        echo "  dev          - Start development environment (default)"
        echo "  multi        - Start all services with multiple access points"
        echo "  minimal      - Start basic backend + frontend only"
        echo "  nginx-only   - Start only nginx reverse proxy"
        echo "  backend-only - Start only backend API"
        echo "  frontend-only - Start only frontend"
        echo "  shell        - Open interactive shell"
        echo "  test         - Run connectivity tests"
        echo ""
        echo "Examples:"
        echo "  docker run -p 3000:3000 -p 3001:3001 alfalyzer dev"
        echo "  docker run -p 80:80 -p 3000:3000 -p 3001:3001 alfalyzer multi"
        echo ""
        exit 1
        ;;
esac