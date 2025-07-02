# 🚀 Alfalyzer Multiple Access Solutions Guide

This comprehensive guide provides multiple reliable ways to access the Alfalyzer application during development. These solutions ensure you always have backup methods to connect to your local development server.

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Multiple Port Access](#multiple-port-access)
3. [Local Domain Aliases](#local-domain-aliases)
4. [Reverse Proxy Setup](#reverse-proxy-setup)
5. [Tunneling Solutions](#tunneling-solutions)
6. [Docker Environment](#docker-environment)
7. [Network Interface Binding](#network-interface-binding)
8. [Troubleshooting](#troubleshooting)
9. [Emergency Access Methods](#emergency-access-methods)

## 🚀 Quick Start

### Basic Development Server
```bash
# Standard development (single port)
npm run dev

# Multiple ports development
npm run dev:multi

# Ultra development (everything + backup backend)
npm run dev:ultra
```

### Docker Quick Start
```bash
# Docker development environment
npm run docker:dev

# Docker minimal environment
npm run docker:minimal
```

### Tunneling Quick Start
```bash
# Simple built-in tunnel
npm run tunnel:simple

# ngrok tunnel
npm run tunnel:ngrok

# Multiple tunnels
npm run tunnel:multi
```

## 🌐 Multiple Port Access

The application is configured to run on multiple ports simultaneously for maximum reliability.

### Available Ports

| Port | Service | Description |
|------|---------|-------------|
| 3000 | Frontend (Primary) | Main Vite development server |
| 3001 | Backend API | Express server with all API endpoints |
| 3005 | Frontend (Secondary) | Alternative Vite server |
| 8080 | Frontend (Tertiary) | Third Vite server option |
| 3002 | Backend (Backup) | Backup Express server |

### Configuration Files

- **Main Config**: `vite.config.ts` (port 3000)
- **Port 3005**: `vite.config.port3005.ts`
- **Port 8080**: `vite.config.port8080.ts`

### NPM Scripts

```bash
# Individual frontends
npm run frontend:3000    # Primary frontend
npm run frontend:3005    # Secondary frontend  
npm run frontend:8080    # Tertiary frontend

# Individual backends
npm run backend          # Primary backend (port 3001)
npm run backend:3002     # Backup backend (port 3002)

# Combined environments
npm run dev:multi        # All frontends + primary backend
npm run dev:ultra        # Everything including backup backend
```

### Access URLs
- http://localhost:3000 (Primary)
- http://localhost:3005 (Secondary)
- http://localhost:8080 (Tertiary)
- http://localhost:3001/api/health (API Health Check)

## 🏠 Local Domain Aliases

Set up friendly local domains for easier access and professional development URLs.

### Available Domains
- `alfalyzer.local` → Main application
- `dev.alfalyzer.local` → Development version
- `api.alfalyzer.local` → API access
- `app.alfalyzer.local` → Application alias
- `admin.alfalyzer.local` → Admin panel (future)

### Setup Instructions

#### macOS/Linux
```bash
# Automatic setup
sudo bash scripts/setup-local-domains.sh

# Manual verification
sudo bash scripts/setup-local-domains.sh verify

# Remove domains
sudo bash scripts/setup-local-domains.sh remove
```

#### Windows
```batch
REM Run as Administrator
scripts\setup-local-domains.bat
```

### Access URLs After Setup
- http://alfalyzer.local:3000
- http://dev.alfalyzer.local:3005
- http://api.alfalyzer.local:3001/api/health
- http://app.alfalyzer.local:3000

## 🔀 Reverse Proxy Setup

Nginx reverse proxy provides load balancing, failover, and additional access methods.

### Features
- **Load Balancing**: Distributes traffic across multiple frontend servers
- **Failover**: Automatic failover to backup servers
- **Rate Limiting**: API rate limiting and security
- **WebSocket Support**: Real-time data connections
- **Static Caching**: Optimized asset delivery

### Setup Instructions

```bash
# Install and configure nginx
bash scripts/setup-nginx-proxy.sh

# Start nginx only
bash scripts/setup-nginx-proxy.sh start

# Check configuration
bash scripts/setup-nginx-proxy.sh test

# View status
bash scripts/setup-nginx-proxy.sh status
```

### Proxy Access Points

| Port | Service | Description |
|------|---------|-------------|
| 80 | Main Proxy | Load balanced access to all frontends |
| 8081 | Dev Proxy | Development-specific proxy |
| 8082 | API Proxy | API-only access with CORS |
| 8083 | Status Page | Load balancer status and metrics |

### Access URLs
- http://alfalyzer.local/ (Load balanced)
- http://dev.alfalyzer.local:8081/ (Development)
- http://api.alfalyzer.local:8082/ (API only)
- http://localhost:8083/ (Status page)

## 🚇 Tunneling Solutions

Multiple tunneling options for remote access and external testing.

### Available Tunneling Methods

#### 1. Simple Built-in Tunnel
```bash
# Start simple tunnel
npm run tunnel:simple

# Custom ports
node scripts/simple-tunnel.js start 3000 8090

# Access tunnel
# http://localhost:8090 (or http://<your-ip>:8090)
```

#### 2. ngrok Integration
```bash
# Install ngrok
bash scripts/setup-tunneling.sh install-ngrok

# Start ngrok tunnel
npm run tunnel:ngrok

# Custom subdomain
bash scripts/setup-tunneling.sh ngrok 3000 my-subdomain
```

#### 3. LocalTunnel
```bash
# Install localtunnel
bash scripts/setup-tunneling.sh install-localtunnel

# Start localtunnel
npm run tunnel:lt

# Custom subdomain
bash scripts/setup-tunneling.sh localtunnel 3000 my-app
```

#### 4. SSH Tunnel
```bash
# Create SSH reverse tunnel
bash scripts/setup-tunneling.sh ssh-tunnel user@remote-server.com 8080 3000
```

### Multiple Tunnels
```bash
# Start multiple tunneling solutions
npm run tunnel:multi

# Check tunnel status
npm run tunnel:status

# Stop all tunnels
npm run tunnel:stop
```

### Tunnel Management
```bash
# Create tunnel manager (one-time setup)
bash scripts/setup-tunneling.sh manager

# Use tunnel manager
bash scripts/tunnel-manager.sh start    # Start ngrok
bash scripts/tunnel-manager.sh dev      # Start localtunnel
bash scripts/tunnel-manager.sh multi    # Start multiple
bash scripts/tunnel-manager.sh status   # Show status
bash scripts/tunnel-manager.sh stop     # Stop all
```

## 🐳 Docker Environment

Containerized development environment with multiple access methods.

### Docker Services

#### Development Environment
```bash
# Build images
npm run docker:build

# Start full development environment
npm run docker:dev

# Start minimal environment
npm run docker:minimal

# Start production environment
npm run docker:prod
```

#### Service Management
```bash
# View status
npm run docker:status

# View logs
npm run docker:logs

# Open container shell
npm run docker:shell

# Stop services
npm run docker:stop

# Complete cleanup
npm run docker:cleanup
```

### Docker Compose Profiles

#### Default Profile (Development)
```bash
docker-compose up -d alfalyzer-dev
```
**Ports**: 3000, 3001, 3005, 8080, 8090, 80, 8081, 8082, 8083

#### Minimal Profile
```bash
docker-compose --profile minimal up -d
```
**Ports**: 3010 (frontend), 3011 (backend)

#### Production Profile
```bash
docker-compose --profile production up -d
```
**Ports**: 8000 (nginx), 8001 (application)

#### Services Profile (Separate Backend/Frontend)
```bash
docker-compose --profile services up -d
```
**Ports**: 3020 (frontend), 3021 (backend)

### Docker Access URLs

#### Development Environment
- http://localhost:3000 (Primary app)
- http://localhost:3005 (Dev app)
- http://localhost:8080 (Alt app)
- http://localhost:80 (Nginx proxy)
- http://localhost:8090 (Simple tunnel)
- http://localhost:8083 (Status page)
- http://localhost:9090 (Docker monitor)

#### Container Management
```bash
# Advanced Docker operations
bash scripts/docker-manager.sh build     # Build images
bash scripts/docker-manager.sh dev       # Start development
bash scripts/docker-manager.sh services  # Start separate services
bash scripts/docker-manager.sh shell     # Container shell
bash scripts/docker-manager.sh backup    # Backup data
bash scripts/docker-manager.sh restore   # Restore data
```

## 🌐 Network Interface Binding

The application is configured to bind to multiple network interfaces for maximum accessibility.

### Binding Strategy

The server automatically tries multiple binding strategies:

1. **IPv4 Loopback** (`127.0.0.1`)
2. **Localhost** (`localhost`)
3. **All Interfaces** (`0.0.0.0`)
4. **Default** (system default)

### Alternative Ports

If the primary ports are unavailable, the system automatically tries:
- 3001, 3002, 8080, 8081, 5000, 5001

### Network Access

#### Local Network Access
When bound to `0.0.0.0`, the application is accessible from other devices on your network:
- http://`<your-ip>`:3000
- http://`<your-ip>`:3001/api/health

#### Find Your IP Address
```bash
# macOS/Linux
ifconfig | grep inet

# Windows
ipconfig

# Or use the built-in network detection
npm run access:test
```

## 🔧 Troubleshooting

### Common Issues and Solutions

#### Port Already in Use
```bash
# Check what's using a port
lsof -i :3000

# Kill process on port
sudo lsof -ti :3000 | xargs kill -9

# Try alternative ports
npm run frontend:3005
npm run frontend:8080
```

#### Cannot Connect to Server
```bash
# Test connectivity
npm run access:test

# Check all services
bash scripts/docker-manager.sh status

# Restart everything
npm run dev:ultra
```

#### Domain Resolution Issues
```bash
# Verify local domains
sudo bash scripts/setup-local-domains.sh verify

# Flush DNS cache (macOS)
sudo dscacheutil -flushcache

# Flush DNS cache (Windows)
ipconfig /flushdns
```

#### Nginx Configuration Issues
```bash
# Test nginx configuration
bash scripts/setup-nginx-proxy.sh test

# Restart nginx
bash scripts/setup-nginx-proxy.sh restart

# Check nginx status
bash scripts/setup-nginx-proxy.sh status
```

#### Tunnel Connection Problems
```bash
# Check tunnel status
npm run tunnel:status

# Stop and restart tunnels
npm run tunnel:stop
npm run tunnel:multi

# Use simple tunnel as fallback
npm run tunnel:simple
```

#### Docker Issues
```bash
# Check Docker status
docker info

# Rebuild containers
npm run docker:cleanup
npm run docker:build
npm run docker:dev

# View container logs
npm run docker:logs
```

### Emergency Access Methods

If all else fails, use these emergency methods:

#### 1. Emergency Servers
```bash
# Emergency Node.js server
npm run emergency

# Emergency Python server (if Python available)
npm run emergency:python

# Emergency PHP server (if PHP available)
npm run emergency:php
```

#### 2. Simple Static Server
```bash
# Build and serve static files
npm run build
python3 -m http.server 8000 --directory dist/public
```

#### 3. Direct File Access
```bash
# Open built application directly
open dist/public/index.html
```

## 📊 Access Method Summary

### Primary Methods (Recommended)
1. **Standard Development**: `npm run dev` → http://localhost:3000
2. **Multi-Port Development**: `npm run dev:multi` → Multiple ports
3. **Docker Development**: `npm run docker:dev` → Containerized
4. **Nginx Proxy**: http://alfalyzer.local → Load balanced

### Secondary Methods (Backup)
1. **Alternative Ports**: :3005, :8080
2. **Tunneling**: ngrok, localtunnel, simple tunnel
3. **Local Domains**: alfalyzer.local, dev.alfalyzer.local
4. **Docker Minimal**: Lightweight container

### Emergency Methods (Last Resort)
1. **Emergency Servers**: Node.js, Python, PHP fallbacks
2. **Static File Server**: Direct file serving
3. **Manual Port Testing**: Custom port binding
4. **Network Interface Fallback**: Multiple IP binding

## 🎯 Best Practices

### Development Workflow
1. **Start with Standard**: `npm run dev`
2. **Use Multi-Port for Testing**: `npm run dev:multi`
3. **Docker for Isolation**: `npm run docker:dev`
4. **Tunnels for External Access**: `npm run tunnel:ngrok`

### Testing Access Methods
```bash
# Test all access methods
npm run access:test

# Test Docker environment
npm run docker:status

# Test tunnels
npm run tunnel:status

# Test nginx proxy
bash scripts/setup-nginx-proxy.sh status
```

### Monitoring and Maintenance
- **Docker Monitor**: http://localhost:9090 (when using Docker)
- **Nginx Status**: http://localhost:8083/nginx_status
- **Health Checks**: All environments include /api/health endpoints
- **Log Monitoring**: `npm run docker:logs` or check individual service logs

## 📝 Configuration Files Reference

### Vite Configurations
- `vite.config.ts` - Main configuration (port 3000)
- `vite.config.port3005.ts` - Secondary configuration
- `vite.config.port8080.ts` - Tertiary configuration

### Nginx Configuration
- `nginx/alfalyzer.conf` - Complete nginx setup

### Docker Configuration
- `Dockerfile` - Multi-stage Docker build
- `docker-compose.yml` - Orchestration configuration
- `docker/entrypoint.sh` - Development entrypoint
- `docker/entrypoint-prod.sh` - Production entrypoint

### Scripts
- `scripts/setup-local-domains.sh` - Local domain setup
- `scripts/setup-nginx-proxy.sh` - Nginx proxy setup
- `scripts/setup-tunneling.sh` - Tunneling solutions
- `scripts/docker-manager.sh` - Docker management
- `scripts/simple-tunnel.js` - Built-in tunnel

### Package.json Scripts
All commands are available as npm scripts with consistent naming:
- `dev:*` - Development environments
- `frontend:*` - Frontend-specific commands
- `backend:*` - Backend-specific commands
- `tunnel:*` - Tunneling commands
- `docker:*` - Docker commands

---

## 🚀 Quick Reference Card

### Essential Commands
```bash
# Basic development
npm run dev

# Multiple access development  
npm run dev:multi

# Docker development
npm run docker:dev

# Setup local domains (one-time)
sudo bash scripts/setup-local-domains.sh

# Setup nginx proxy (one-time)
bash scripts/setup-nginx-proxy.sh

# Start tunneling
npm run tunnel:ngrok

# Emergency access
npm run emergency
```

### Primary Access URLs
- http://localhost:3000 - Main application
- http://localhost:3001/api/health - API health check
- http://alfalyzer.local:3000 - Local domain
- http://localhost:80 - Nginx proxy
- http://localhost:8090 - Simple tunnel

### Support and Troubleshooting
1. Check `npm run access:test`
2. Try alternative ports (:3005, :8080)
3. Use Docker fallback: `npm run docker:minimal`
4. Emergency servers: `npm run emergency`
5. Check this guide for detailed solutions

---

**Created by Claude Sonnet 4 as part of the Alfalyzer Alternative Access Solutions implementation.**