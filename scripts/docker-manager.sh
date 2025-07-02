#!/bin/bash

# Alfalyzer Docker Management Script
# Simplified Docker operations for multiple access methods

echo "🐳 Alfalyzer Docker Manager"
echo "============================"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

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

print_docker() {
    echo -e "${PURPLE}🐳${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose >/dev/null 2>&1; then
        print_warning "docker-compose not found. Using 'docker compose' instead."
        alias docker-compose='docker compose'
    fi
}

# Function to build images
build_images() {
    print_info "Building Alfalyzer Docker images..."
    
    # Build development image
    docker build -t alfalyzer:dev --target multi-access .
    
    # Build production image
    docker build -t alfalyzer:prod --target production .
    
    print_status "Docker images built successfully"
}

# Function to start development environment
start_dev() {
    print_docker "Starting development environment..."
    
    docker-compose up -d alfalyzer-dev
    
    # Wait for services to be ready
    sleep 10
    
    print_status "Development environment started"
    show_access_urls "dev"
}

# Function to start minimal environment
start_minimal() {
    print_docker "Starting minimal development environment..."
    
    docker-compose --profile minimal up -d alfalyzer-minimal
    
    sleep 5
    
    print_status "Minimal environment started"
    show_access_urls "minimal"
}

# Function to start production environment
start_prod() {
    print_docker "Starting production environment..."
    
    docker-compose --profile production up -d alfalyzer-prod
    
    sleep 10
    
    print_status "Production environment started"
    show_access_urls "prod"
}

# Function to start services separately
start_services() {
    print_docker "Starting backend and frontend services separately..."
    
    docker-compose --profile services up -d alfalyzer-backend alfalyzer-frontend
    
    sleep 10
    
    print_status "Services started"
    show_access_urls "services"
}

# Function to show access URLs
show_access_urls() {
    local env=${1:-dev}
    
    echo ""
    print_info "🌐 Access URLs ($env environment):"
    echo "======================================="
    
    case $env in
        "dev")
            echo ""
            echo "📱 Main Application:"
            echo "   http://localhost:3000"
            echo "   http://localhost (nginx proxy)"
            echo ""
            echo "🔧 Development Versions:"
            echo "   http://localhost:3005"
            echo "   http://localhost:8080"
            echo ""
            echo "🔌 API Access:"
            echo "   http://localhost:3001/api/health"
            echo "   http://localhost:8082 (nginx API only)"
            echo ""
            echo "🚇 Tunnels:"
            echo "   http://localhost:8090 (simple tunnel)"
            echo ""
            echo "📊 Management:"
            echo "   http://localhost:8083 (nginx status)"
            ;;
        "minimal")
            echo ""
            echo "📱 Application: http://localhost:3010"
            echo "🔌 API: http://localhost:3011/api/health"
            ;;
        "prod")
            echo ""
            echo "🚀 Production: http://localhost:8000"
            echo "🔌 API: http://localhost:8001/api/health"
            ;;
        "services")
            echo ""
            echo "🔧 Frontend: http://localhost:3020"
            echo "🔌 Backend: http://localhost:3021/api/health"
            ;;
    esac
    
    echo ""
}

# Function to show status
show_status() {
    print_info "📊 Docker Container Status:"
    echo "============================"
    
    docker-compose ps
    
    echo ""
    print_info "🔗 Running Containers:"
    docker ps --filter "name=alfalyzer" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
}

# Function to show logs
show_logs() {
    local service=${1:-alfalyzer-dev}
    
    print_info "📋 Logs for $service:"
    echo "======================"
    
    docker-compose logs -f --tail=50 "$service"
}

# Function to stop services
stop_services() {
    local profile=${1:-}
    
    print_info "Stopping Alfalyzer services..."
    
    if [ -n "$profile" ]; then
        docker-compose --profile "$profile" down
    else
        docker-compose down
    fi
    
    print_status "Services stopped"
}

# Function to clean up
cleanup() {
    print_info "Cleaning up Docker resources..."
    
    # Stop all containers
    docker-compose down -v
    
    # Remove images
    docker rmi alfalyzer:dev alfalyzer:prod 2>/dev/null || true
    
    # Remove unused resources
    docker system prune -f
    
    print_status "Cleanup completed"
}

# Function to enter container shell
shell() {
    local container=${1:-alfalyzer-dev}
    
    print_info "Opening shell in $container..."
    
    if docker ps --format '{{.Names}}' | grep -q "^$container$"; then
        docker exec -it "$container" /bin/bash
    else
        print_error "Container $container is not running"
        print_info "Available containers:"
        docker ps --filter "name=alfalyzer" --format "{{.Names}}"
    fi
}

# Function to update and rebuild
update() {
    print_info "Updating and rebuilding containers..."
    
    # Stop services
    docker-compose down
    
    # Rebuild images
    build_images
    
    # Start services
    start_dev
    
    print_status "Update completed"
}

# Function to backup data
backup() {
    local backup_dir="./backups/$(date +%Y%m%d_%H%M%S)"
    
    print_info "Creating backup..."
    
    mkdir -p "$backup_dir"
    
    # Backup volumes
    docker run --rm -v alfalyzer_db:/data -v "$(pwd)/$backup_dir":/backup alpine tar czf /backup/db.tar.gz -C /data .
    docker run --rm -v alfalyzer_logs:/data -v "$(pwd)/$backup_dir":/backup alpine tar czf /backup/logs.tar.gz -C /data .
    
    print_status "Backup created at $backup_dir"
}

# Function to restore data
restore() {
    local backup_path=${1:-}
    
    if [ -z "$backup_path" ]; then
        print_error "Please provide backup path"
        print_info "Usage: $0 restore /path/to/backup"
        exit 1
    fi
    
    print_info "Restoring from $backup_path..."
    
    # Stop services
    docker-compose down
    
    # Restore volumes
    if [ -f "$backup_path/db.tar.gz" ]; then
        docker run --rm -v alfalyzer_db:/data -v "$backup_path":/backup alpine tar xzf /backup/db.tar.gz -C /data
        print_status "Database restored"
    fi
    
    if [ -f "$backup_path/logs.tar.gz" ]; then
        docker run --rm -v alfalyzer_logs:/data -v "$backup_path":/backup alpine tar xzf /backup/logs.tar.gz -C /data
        print_status "Logs restored"
    fi
    
    print_status "Restore completed"
}

# Function to run tests
test_containers() {
    print_info "Running container tests..."
    
    # Test development container
    docker run --rm alfalyzer:dev test
    
    # Test production container
    docker run --rm alfalyzer:prod health
    
    print_status "Container tests completed"
}

# Main execution
check_docker

case "${1:-help}" in
    "build")
        build_images
        ;;
    "dev"|"start")
        start_dev
        ;;
    "minimal")
        start_minimal
        ;;
    "prod"|"production")
        start_prod
        ;;
    "services")
        start_services
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs "$2"
        ;;
    "stop")
        stop_services "$2"
        ;;
    "restart")
        stop_services
        start_dev
        ;;
    "shell")
        shell "$2"
        ;;
    "cleanup")
        cleanup
        ;;
    "update")
        update
        ;;
    "backup")
        backup
        ;;
    "restore")
        restore "$2"
        ;;
    "test")
        test_containers
        ;;
    "help"|"-h"|"--help")
        echo "Alfalyzer Docker Manager"
        echo ""
        echo "Usage: bash scripts/docker-manager.sh [command] [options]"
        echo ""
        echo "Environment Commands:"
        echo "  dev          - Start full development environment (default)"
        echo "  minimal      - Start minimal development environment"
        echo "  prod         - Start production environment"
        echo "  services     - Start backend and frontend separately"
        echo ""
        echo "Management Commands:"
        echo "  build        - Build Docker images"
        echo "  status       - Show container status"
        echo "  logs [name]  - Show logs for container"
        echo "  stop [profile] - Stop services"
        echo "  restart      - Restart development environment"
        echo "  shell [name] - Open shell in container"
        echo "  cleanup      - Remove all containers and images"
        echo "  update       - Update and rebuild containers"
        echo ""
        echo "Data Commands:"
        echo "  backup       - Backup container data"
        echo "  restore <path> - Restore from backup"
        echo "  test         - Run container tests"
        echo ""
        echo "Examples:"
        echo "  $0 dev                    # Start development environment"
        echo "  $0 logs alfalyzer-dev     # Show development logs"
        echo "  $0 shell alfalyzer-dev    # Open shell in dev container"
        echo "  $0 stop production        # Stop production environment"
        echo ""
        ;;
    *)
        print_error "Unknown command: $1"
        echo "Use: bash scripts/docker-manager.sh help"
        exit 1
        ;;
esac