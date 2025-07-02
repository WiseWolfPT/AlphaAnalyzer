# 🔧 Alfalyzer Troubleshooting Guide

This comprehensive guide provides solutions for common connectivity issues and startup problems with the Alfalyzer development environment.

## 🚀 Quick Solutions

### Issue: Services Won't Start
```bash
# Try the bulletproof startup system
npm run dev

# If that fails, force cleanup and retry
npm run dev:force

# For verbose debugging
npm run dev:verbose
```

### Issue: Port Conflicts
```bash
# Check port status
npm run port:check

# Clean up port conflicts
npm run port:cleanup

# Force cleanup (including external processes)
npm run port:cleanup:force
```

### Issue: Health Check Failures
```bash
# Quick health check
npm run health

# Detailed health analysis
npm run health:detailed

# Trigger auto-recovery
npm run recover
```

## 📋 Diagnostic Commands

### Quick Status Check
```bash
npm run status
```

### Full Diagnostic
```bash
npm run debug
```

### Environment Validation
```bash
scripts/environment-validator.sh
scripts/environment-validator.sh --auto-fix
```

### Comprehensive Troubleshooting
```bash
npm run troubleshoot
```

## 🔍 Common Issues and Solutions

### 1. Port Already in Use

**Symptoms:**
- Error: `EADDRINUSE: address already in use`
- Cannot access http://localhost:3000 or http://localhost:3001

**Quick Fix:**
```bash
npm run port:cleanup:force
npm run dev
```

**Manual Fix:**
```bash
# Find processes using the ports
lsof -i :3000
lsof -i :3001

# Kill specific processes
kill -9 <PID>

# Or use our port manager
scripts/port-manager.sh cleanup --force
```

### 2. Node.js/npm Version Issues

**Symptoms:**
- `node: command not found`
- `npm: command not found`
- Version compatibility errors

**Solution:**
```bash
# Check current versions
node --version
npm --version

# Install Node.js 18+ from https://nodejs.org/
# Or use environment validator
scripts/environment-validator.sh --auto-fix
```

### 3. Dependencies Not Installed

**Symptoms:**
- `Cannot find module` errors
- `node_modules` directory missing

**Solution:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Or use environment validator
scripts/environment-validator.sh --auto-fix
```

### 4. Environment Variables Missing

**Symptoms:**
- API calls failing
- Database connection errors
- Missing `.env` file warnings

**Solution:**
```bash
# Check environment
scripts/environment-validator.sh

# Create .env file from example
cp .env.example .env

# Edit .env with your API keys
nano .env
```

### 5. Database Issues

**Symptoms:**
- `SQLITE_CANTOPEN` errors
- Database locked errors
- Missing tables

**Solution:**
```bash
# Reset database
rm dev.db
npm run db:push

# Check database health
npm run health:detailed
```

### 6. Proxy/CORS Issues

**Symptoms:**
- API calls blocked by CORS
- Proxy errors in browser console
- Network request failures

**Solution:**
```bash
# Test connectivity
npm run test:connectivity

# Check proxy configuration
npm run debug

# Restart with force cleanup
npm run restart:force
```

### 7. Memory/Performance Issues

**Symptoms:**
- Slow startup
- High memory usage
- Frequent crashes

**Solution:**
```bash
# Check system resources
npm run health:metrics

# Clean restart
npm run stop:clean
npm run dev

# Monitor system health
scripts/port-manager.sh watch
```

## 🛠️ Advanced Troubleshooting

### Manual Process Management

**Check Running Processes:**
```bash
# List all Alfalyzer processes
ps aux | grep -E "(tsx|vite|node)" | grep -v grep

# Kill all development processes
pkill -f "tsx.*server"
pkill -f "vite.*port"
```

**Process Cleanup:**
```bash
# Use our bulletproof stop script
npm run stop:force

# Manual cleanup
scripts/port-manager.sh cleanup --force
```

### Network Debugging

**Test Backend Connection:**
```bash
# Direct backend test
curl http://localhost:3001/api/health

# Detailed health check
curl http://localhost:3001/api/health/detailed | jq .
```

**Test Frontend Connection:**
```bash
# Frontend test
curl http://localhost:3000

# Proxy test
curl http://localhost:3000/api/health
```

**Test Connectivity:**
```bash
# Run connectivity tests
scripts/connectivity-test.ts

# Monitor network
npm run port:watch
```

### Log Analysis

**View Logs:**
```bash
# Backend logs
npm run logs

# Frontend logs
npm run logs:frontend

# All logs
npm run logs:all

# Specific log files
tail -f logs/bulletproof-start.log
tail -f logs/port-manager.log
```

**Log Locations:**
- `logs/backend.log` - Backend service logs
- `logs/frontend.log` - Frontend service logs
- `logs/bulletproof-start.log` - Startup script logs
- `logs/port-manager.log` - Port management logs
- `logs/environment-validator.log` - Environment validation logs

## 🔄 Recovery Procedures

### Complete System Reset

1. **Stop All Services:**
   ```bash
   npm run stop:force
   ```

2. **Clean Up Ports:**
   ```bash
   npm run port:cleanup:force
   ```

3. **Validate Environment:**
   ```bash
   scripts/environment-validator.sh --auto-fix
   ```

4. **Reinstall Dependencies:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

5. **Start Fresh:**
   ```bash
   npm run dev:force
   ```

### Emergency Fallback Servers

If the main system fails completely:

```bash
# Node.js emergency server
npm run emergency:js

# Python emergency server
npm run emergency:python

# PHP emergency server
npm run emergency:php
```

## 📊 Monitoring and Maintenance

### Continuous Monitoring

**Health Monitoring:**
```bash
# Watch port status
npm run port:watch

# Monitor health metrics
watch -n 5 'npm run health:quick'

# System monitoring
npm run health:metrics
```

**Performance Monitoring:**
```bash
# Check system resources
npm run health:detailed

# Monitor process performance
top -p $(pgrep -f "tsx.*server")
```

### Preventive Maintenance

**Daily:**
- Run `npm run status` to check system health
- Monitor log files for errors

**Weekly:**
- Run `npm run troubleshoot` for comprehensive check
- Clean up old log files: `find logs -name "*.log.*" -mtime +7 -delete`

**Monthly:**
- Update dependencies: `npm update`
- Validate environment: `scripts/environment-validator.sh`

## 🆘 Emergency Contacts and Resources

### Getting Help

1. **Check Logs First:**
   ```bash
   npm run debug
   ```

2. **Run Full Diagnostics:**
   ```bash
   npm run troubleshoot
   ```

3. **Environment Validation:**
   ```bash
   scripts/environment-validator.sh --verbose
   ```

### Useful Resources

- **Node.js Documentation:** https://nodejs.org/docs/
- **Vite Documentation:** https://vitejs.dev/guide/
- **Express.js Documentation:** https://expressjs.com/
- **React Documentation:** https://react.dev/

### Debug Information Collection

Before reporting issues, collect this information:

```bash
# System information
echo "OS: $(uname -a)"
echo "Node: $(node --version)"
echo "npm: $(npm --version)"

# Environment status
npm run debug > debug-output.txt

# Health status
npm run health:detailed > health-output.txt

# Log files
tar -czf logs-backup.tar.gz logs/
```

## 🔧 Custom Fixes

### Create Custom Recovery Script

Create a file `my-fix.sh`:
```bash
#!/bin/bash
echo "🔄 Running custom recovery..."

# Your custom fix steps here
npm run stop:force
npm run port:cleanup:force
sleep 5
npm run dev:force

echo "✅ Custom recovery complete"
```

### Environment-Specific Configurations

**Development:**
```bash
export NODE_ENV=development
export DEBUG=true
npm run dev:verbose
```

**Production:**
```bash
export NODE_ENV=production
npm run build
npm run start
```

## 📈 Performance Optimization

### Memory Optimization

```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
npm run dev
```

### Port Optimization

```bash
# Use alternative ports if defaults are busy
npm run dev -- --backend-port 3002 --frontend-port 3001
```

### Build Optimization

```bash
# Clean build
rm -rf dist/
npm run build

# Analyze bundle size
npm run build -- --analyze
```

---

## 🎯 Success Indicators

Your environment is healthy when:

- ✅ `npm run status` shows all green
- ✅ `npm run health` returns `"status": "healthy"`
- ✅ Both http://localhost:3000 and http://localhost:3001 are accessible
- ✅ No errors in browser console
- ✅ API calls work correctly

---

*This troubleshooting guide is continuously updated. For the latest version, check the project repository.*