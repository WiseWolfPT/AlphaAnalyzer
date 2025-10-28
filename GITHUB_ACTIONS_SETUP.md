# 🚀 GitHub Actions CI/CD Setup Instructions

## Required GitHub Secrets

To enable automated deployment, add these secrets to your GitHub repository:

### 1. Navigate to GitHub Repository Settings
```
Your Repository → Settings → Secrets and variables → Actions → New repository secret
```

### 2. Add the Following Secrets

#### SSH_PRIVATE_KEY
```bash
# Get your private key content:
cat ~/.ssh/id_rsa

# Copy the entire output including:
-----BEGIN RSA PRIVATE KEY-----
[key content]
-----END RSA PRIVATE KEY-----
```

#### SSH_KNOWN_HOSTS
```bash
# Get the server fingerprint:
ssh-keyscan -H 128.140.45.28

# Copy the output (will look like):
|1|base64string==|anotherbase64string== ssh-rsa AAAAB3...
```

#### VITE_SUPABASE_URL
```
Your Supabase project URL
Example: https://avjnfessefxtfurayybp.supabase.co
```

#### VITE_SUPABASE_ANON_KEY
```
Your Supabase anonymous key
Example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Triggering Deployment

### Automatic Deployment
Push to main branch:
```bash
git push origin main
```

### Manual Deployment
1. Go to Actions tab in GitHub
2. Select "Build, Test & Deploy" workflow
3. Click "Run workflow"
4. Select branch and click "Run workflow"

## Monitoring Deployment

### View Progress
1. Go to Actions tab
2. Click on the running workflow
3. Watch real-time logs

### Check Results
- ✅ Green checkmark = Success
- ❌ Red X = Failed (check logs)
- 🟡 Yellow circle = In progress

## Deployment Workflow

The workflow will:
1. **Test & Build** - Run tests and build application
2. **Security Scan** - Check for vulnerabilities
3. **Deploy to Hetzner** - Push to production server
4. **Post-Deploy Tests** - Verify deployment
5. **Performance Tests** - Run Lighthouse checks

## Manual Deployment Alternative

If GitHub Actions isn't set up yet:
```bash
# Use the deployment script
./scripts/deploy-production.sh

# Or deploy manually
ssh root@128.140.45.28
cd "/home/teste 1"
git pull origin main
npm ci --production
npm run build
pm2 restart alfalyzer
```

## Troubleshooting

### SSH Key Issues
```bash
# Test SSH connection locally
ssh -i ~/.ssh/id_rsa root@128.140.45.28 "echo 'Connected'"
```

### Secret Format Issues
- Ensure no extra spaces or newlines
- Use raw text, not base64 encoded
- Include full key headers/footers

### Deployment Failures
Check the Actions logs for:
- Build errors
- SSH connection failures
- PM2 restart issues

## Success Indicators

✅ **Deployment successful when:**
- Workflow shows green checkmark
- Site loads at https://128.140.45.28.sslip.io
- Health check passes
- No errors in PM2 logs

---

**Created**: 2025-08-24
**Phase**: 15 - CI/CD & Deployment