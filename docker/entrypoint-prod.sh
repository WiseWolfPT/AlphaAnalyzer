#!/bin/bash

# Alfalyzer Docker Production Entrypoint
# Optimized for production deployment

set -e

echo "🚀 Alfalyzer Production Environment"
echo "==================================="

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✅${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ️${NC} $1"
}

# Function to setup production environment
setup_production() {
    print_info "Setting up production environment..."
    
    # Create necessary directories
    mkdir -p /var/log/alfalyzer /var/log/nginx
    
    # Set proper permissions
    chown -R node:node /app /var/log/alfalyzer
    
    # Set production environment
    export NODE_ENV=production
    export DOCKER_ENV=true
    
    print_status "Production environment ready"
}

# Function to start nginx
start_nginx() {
    print_info "Starting nginx..."
    
    # Test configuration
    nginx -t
    
    # Start nginx
    nginx -g "daemon off;" &
    
    print_status "nginx started"
}

# Function to start application
start_application() {
    print_info "Starting Alfalyzer application..."
    
    # Start the application
    npm start &
    
    print_status "Application started"
}

# Function to health check
health_check() {
    print_info "Performing health check..."
    
    # Wait for application to be ready
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:3001/api/health >/dev/null 2>&1; then
            print_status "Application is healthy"
            return 0
        fi
        
        sleep 1
        attempt=$((attempt + 1))
    done
    
    echo "❌ Health check failed"
    return 1
}

# Function to show production info
show_production_info() {
    echo ""
    print_info "🚀 Production Access:"
    echo "====================="
    echo ""
    echo "🌐 Application: http://localhost/"
    echo "🔌 API: http://localhost/api/"
    echo "💚 Health: http://localhost/api/health"
    echo ""
    echo "📊 Status: Production Ready"
    echo "🔒 Security: Enhanced"
    echo "⚡ Performance: Optimized"
    echo ""
}

# Graceful shutdown
graceful_shutdown() {
    print_info "Shutting down gracefully..."
    
    # Stop nginx
    nginx -s quit
    
    # Stop application
    pkill -TERM node
    
    print_status "Shutdown complete"
    exit 0
}

# Set up signal handlers
trap graceful_shutdown SIGTERM SIGINT

# Main execution
case "${1:-start}" in
    "start")
        setup_production
        start_nginx
        start_application
        health_check
        show_production_info
        
        # Keep container running
        wait
        ;;
    
    "health")
        health_check
        ;;
    
    "nginx-only")
        setup_production
        start_nginx
        show_production_info
        wait
        ;;
    
    "app-only")
        setup_production
        start_application
        health_check
        show_production_info
        wait
        ;;
    
    *)
        echo "Alfalyzer Production Entrypoint"
        echo ""
        echo "Usage: docker run alfalyzer:prod [command]"
        echo ""
        echo "Commands:"
        echo "  start      - Start full production environment (default)"
        echo "  health     - Run health check only"
        echo "  nginx-only - Start only nginx"
        echo "  app-only   - Start only application"
        echo ""
        exit 1
        ;;
esac