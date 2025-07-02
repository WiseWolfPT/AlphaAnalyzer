# 🚀 Alfalyzer Deployment Scripts

Comprehensive deployment automation and testing system for Alfalyzer development environment.

## 📋 Available Scripts

### 🚀 Main Deployment
```bash
./scripts/dev-deploy.sh
```
**Ultra-reliable deployment script** that:
- ✅ Cleans up existing processes
- ✅ Validates dependencies and environment
- ✅ Starts backend and frontend with health checks
- ✅ Implements retry logic and error recovery
- ✅ Runs comprehensive tests
- ✅ Sets up monitoring

**Features:**
- Multiple binding strategies (127.0.0.1, localhost, 0.0.0.0)
- Alternative port fallback (3001, 3002, 8080, etc.)
- Emergency server activation if all else fails
- Real-time health monitoring
- Comprehensive logging

### ⚡ Quick Start
```bash
./scripts/quick-start.sh
```
**Fast deployment** for immediate development:
- Minimal cleanup and setup
- Uses npm run dev
- Quick health verification
- Perfect for rapid iteration

### 🛑 Stop Services
```bash
./scripts/stop-deploy.sh
```
**Graceful shutdown** of all services:
- Kills processes by PID files
- Force cleanup by port numbers
- Removes temporary files

### 🏥 Health Check
```bash
./scripts/health-check.sh
```
**Comprehensive system diagnostics**:
- ✅ Service accessibility and response times
- ✅ Process monitoring and memory usage
- ✅ File system integrity
- ✅ Database connectivity
- ✅ Log file analysis
- ✅ Network connectivity tests
- ✅ Performance metrics

### 🧪 Test Suite
```bash
./scripts/test-suite.sh
```
**Complete testing framework** covering:
- ✅ Basic connectivity tests
- ✅ API endpoint validation
- ✅ Frontend proxy functionality
- ✅ Database operations
- ✅ Authentication flows
- ✅ Real-time data services
- ✅ Performance benchmarks
- ✅ Security compliance
- ✅ Integration testing
- ✅ Error recovery

### 📊 Monitoring
```bash
./scripts/monitor-deploy.sh
```
**Real-time monitoring dashboard**:
- Live service status
- Process monitoring with memory usage
- Request counting
- Error tracking
- Auto-refresh every 5 seconds

## 🎯 Usage Scenarios

### 🆕 First Time Setup
```bash
# 1. Full deployment with all checks
./scripts/dev-deploy.sh

# 2. Verify everything is working
./scripts/test-suite.sh

# 3. Monitor in real-time
./scripts/monitor-deploy.sh
```

### 🔄 Daily Development
```bash
# Quick start for development
./scripts/quick-start.sh

# Check health when needed
./scripts/health-check.sh

# Stop when done
./scripts/stop-deploy.sh
```

### 🐛 Troubleshooting
```bash
# 1. Stop everything
./scripts/stop-deploy.sh

# 2. Full diagnostic
./scripts/health-check.sh

# 3. Full deployment with recovery
./scripts/dev-deploy.sh

# 4. Comprehensive testing
./scripts/test-suite.sh
```

## 📊 Script Outputs

### ✅ Success Indicators
- **Green checkmarks (✅)**: Tests passed, services healthy
- **Blue info (ℹ️)**: General information
- **Response times**: Under 2s backend, under 3s frontend

### ⚠️ Warning Indicators  
- **Yellow warnings (⚠️)**: Non-critical issues
- **Slow response times**: Over threshold but functional
- **Missing optional files**: Won't break functionality

### ❌ Error Indicators
- **Red X marks (❌)**: Critical failures
- **Failed health checks**: Services not responding
- **Process failures**: Unable to start services

## 🔧 Configuration

### Environment Variables
Create `.env` file in project root:
```env
NODE_ENV=development
DATABASE_URL=./dev.db
PORT=3001
FRONTEND_PORT=3000

# API Keys (optional for development)
ALPHA_VANTAGE_API_KEY=your_key_here
FINNHUB_API_KEY=your_key_here
FMP_API_KEY=your_key_here
TWELVE_DATA_API_KEY=your_key_here
```

### Port Configuration
Default ports can be changed by modifying script variables:
- Backend: `BACKEND_PORT=3001`
- Frontend: `FRONTEND_PORT=3000`

### Timeout Settings
Adjust timeouts in scripts:
- Health check timeout: `HEALTH_CHECK_TIMEOUT=60`
- Test timeout: `TEST_TIMEOUT=10`
- Max retries: `MAX_RETRIES=3`

## 🔍 Logs and Debugging

### Log Files
- `backend.log`: Backend server logs
- `frontend.log`: Frontend server logs
- `backend.pid`: Backend process ID
- `frontend.pid`: Frontend process ID

### Debugging Commands
```bash
# View real-time backend logs
tail -f backend.log

# View real-time frontend logs  
tail -f frontend.log

# Check process status
ps aux | grep -E "(vite|tsx)"

# Check port usage
lsof -i :3000
lsof -i :3001
```

## 🚨 Emergency Recovery

If scripts fail completely, use emergency servers:
```bash
# Node.js emergency server
node server/emergency-server.cjs

# Python emergency server  
python3 server/emergency-python-server.py

# PHP emergency server
php -S localhost:3001 server/emergency-php-server.php
```

## 📈 Performance Expectations

### Optimal Performance
- Backend response: < 1 second
- Frontend load: < 2 seconds  
- Memory usage: < 500MB per process
- Test suite: 90%+ pass rate

### Acceptable Performance
- Backend response: < 2 seconds
- Frontend load: < 3 seconds
- Memory usage: < 1GB per process
- Test suite: 75%+ pass rate

## 🔄 Continuous Integration

Scripts are designed for CI/CD integration:
```bash
# CI Pipeline example
./scripts/dev-deploy.sh && ./scripts/test-suite.sh
```

Exit codes:
- `0`: Success
- `1`: Failure
- Script outputs are CI-friendly with clear pass/fail indicators

## 📞 Support

If deployment fails:
1. Check logs in `backend.log` and `frontend.log`
2. Run `./scripts/health-check.sh` for diagnostics
3. Try `./scripts/stop-deploy.sh` then `./scripts/dev-deploy.sh`
4. Use emergency servers as last resort

## 🎨 Customization

Scripts can be customized by editing:
- Port numbers and timeouts
- Test scenarios and expectations
- Recovery strategies
- Monitoring intervals

All scripts use consistent color coding and logging for easy maintenance and debugging.