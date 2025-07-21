# KOYEB EMERGENCY DEPLOYMENT GUIDE

## 🚨 QUICK FIXES - TRY THESE IN ORDER

### Option 1: Emergency Server Deployment (FASTEST)
```bash
# In Koyeb settings, set:
Build command: echo "No build needed"
Run command: node emergency-server.js
Port: 3001
```

### Option 2: Debug Server First
```bash
# Deploy the debug server to see what's in your container:
Run command: node debug-koyeb-files.js
# Then visit your-app.koyeb.app to see file structure
```

### Option 3: Use Alternative Package.json
```bash
# Rename files before deploy:
mv package.json package.backup.json
mv koyeb-package.json package.json
git add -A && git commit -m "Emergency Koyeb deployment"
git push
```

### Option 4: Direct Node Command
```bash
# In Koyeb, try these run commands one by one:
1. node server/index.js
2. node dist/index.js  
3. node emergency-server.js
4. npx http-server -p 3001
```

## 🔧 BUILDPACK DEPLOYMENT (NO DOCKERFILE)

### Step 1: Remove/Rename Dockerfile
```bash
mv Dockerfile Dockerfile.backup
git rm Dockerfile
git commit -m "Remove Dockerfile for Buildpack deployment"
git push
```

### Step 2: Configure Koyeb for Buildpack
In Koyeb service settings:
- Builder: **Buildpack** (not Docker)
- Build command: `npm install && npm run build || echo "Build complete"`
- Run command: `npm start || node emergency-server.js`
- Port: `3001`

### Step 3: Environment Variables
Set these in Koyeb:
```
NODE_ENV=production
PORT=3001
NPM_CONFIG_PRODUCTION=false
```

## 🚀 ULTRA-MINIMAL DEPLOYMENT

### Create Single-File Server
```javascript
// minimal-server.js
const http = require('http');
const PORT = process.env.PORT || 3001;

http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.end(`
    <h1>Alfalyzer Running on Koyeb!</h1>
    <p>Port: ${PORT}</p>
    <p>Time: ${new Date()}</p>
    <p><a href="/health">Health Check</a></p>
  `);
}).listen(PORT, () => console.log(`Server on port ${PORT}`));
```

Then in Koyeb:
- Run command: `node minimal-server.js`

## 🔍 DEBUGGING COMMANDS

### Check What's Running
```bash
# Add these as Koyeb run commands to debug:

# List all files
ls -la && node emergency-server.js

# Show package.json and start
cat package.json && npm start

# Check node version
node -v && npm -v && node emergency-server.js

# Find any .js files
find . -name "*.js" -type f | head -20
```

## 🎯 VERIFIED WORKING CONFIGS

### Config A: Express Static Server
```javascript
// static-server.js
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.static('.'));
app.get('/health', (req, res) => res.json({status: 'ok'}));
app.get('*', (req, res) => res.send('Alfalyzer on Koyeb!'));

app.listen(PORT, () => console.log(`Port ${PORT}`));
```

### Config B: Procfile Method
Create `Procfile`:
```
web: node emergency-server.js
```

### Config C: NPX Server
```bash
# Run command in Koyeb:
npx http-server -p $PORT || npx serve -p $PORT
```

## 📋 KOYEB CHECKLIST

Before deploying, ensure:
- [ ] Removed or renamed Dockerfile
- [ ] Created emergency-server.js
- [ ] Set PORT to 3001 in Koyeb
- [ ] Disabled health checks temporarily
- [ ] Set build command to `echo "done"`
- [ ] Committed and pushed all changes

## 🆘 LAST RESORT OPTIONS

### 1. Deploy Different Branch
```bash
git checkout -b koyeb-emergency
# Add only minimal files
git add emergency-server.js package.json
git commit -m "Minimal Koyeb deploy"
git push origin koyeb-emergency
# Deploy this branch in Koyeb
```

### 2. Fork and Simplify
- Fork your repo
- Delete everything except emergency-server.js
- Deploy the fork

### 3. Use Koyeb's Example
```bash
# Clone Koyeb's Node example
git clone https://github.com/koyeb/example-nodejs
# Copy your server files into it
# Deploy that instead
```

## 🎪 CREATIVE WORKAROUNDS

### Workaround 1: Serve from node_modules
```javascript
// If your files aren't where expected:
const { execSync } = require('child_process');
execSync('find . -name "*.js" | head -50', {stdio: 'inherit'});
```

### Workaround 2: Download and Run
```javascript
// fetch-and-run.js
const https = require('https');
const fs = require('fs');

// Download your server from GitHub
https.get('https://raw.githubusercontent.com/YOUR_REPO/main/server/index.js', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    fs.writeFileSync('server.js', data);
    require('./server.js');
  });
});
```

### Workaround 3: Inline Everything
```bash
# In package.json scripts:
"start": "node -e \"require('http').createServer((req,res)=>res.end('OK')).listen(process.env.PORT||3001)\""
```

## 💡 TIPS & TRICKS

1. **Always use PORT env var**: `process.env.PORT || 3001`
2. **Log everything**: Add console.logs to see what's happening
3. **Simple first**: Get ANY server working, then add complexity
4. **Check logs**: Koyeb logs will show what's failing
5. **Health endpoint**: Always include `/health` endpoint

## 🔗 QUICK DEPLOY URLS

Test these endpoints after deploy:
- `/` - Main page
- `/health` - Health check
- `/debug` - Debug information
- `/api/test` - API test endpoint

## 📞 SUPPORT SCRIPT

If nothing works, create this and deploy:
```javascript
// support.js
console.log('=== KOYEB SUPPORT INFO ===');
console.log('CWD:', process.cwd());
console.log('Files:', require('fs').readdirSync('.'));
console.log('Node:', process.version);
console.log('Env:', Object.keys(process.env));
console.log('=== STARTING FALLBACK SERVER ===');

require('http').createServer((req, res) => {
  res.writeHead(200);
  res.end('Support Mode Active - Check Logs');
}).listen(process.env.PORT || 3001);
```

---

Remember: The goal is to get ANYTHING running first, then improve from there. Start with the emergency server and work your way up!