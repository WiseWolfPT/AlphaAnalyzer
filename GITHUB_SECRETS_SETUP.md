# 🔐 GitHub Secrets Setup for Alfalyzer Deployment

## Prerequisites
1. Access to your GitHub repository settings
2. SSH access to your Hetzner server (128.140.45.28)

## Step 1: Navigate to GitHub Secrets
1. Go to your GitHub repository
2. Click on **Settings** tab
3. In the left sidebar, click **Secrets and variables** > **Actions**
4. Click **New repository secret** for each secret below

## Step 2: Add Required Secrets

### SSH Access Secrets

#### 1. SSH_PRIVATE_KEY
Generate or use existing SSH key:
```bash
# If you need to generate a new key:
ssh-keygen -t ed25519 -C "github-actions@alfalyzer" -f ~/.ssh/alfalyzer_deploy

# Copy the private key content:
cat ~/.ssh/alfalyzer_deploy
```
**Value**: Copy the entire private key including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`

#### 2. SSH_KNOWN_HOSTS
**Value**: Copy this entire block:
```
|1|wnZKtmgVtZPtDtMR8Df1OqyG1hc=|Rmge+H/Ktltt4gqSpGich1L8Ymg= ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQCQabE9B52X5cbaIXzfZgmlOn231lgTYpC2l+F35Ijk7Q2cWAxlZTgmdMAaEG2rFt+7brRQtlFDZRXRagjFYD73ID0LmrMabHFE5pXBReu6RDF1ZsubB0aBYGGt6eGbbZNNgBdwVx9rJ6mBB3E22z9Xh2tLJGktzaoUYVsmaLKLAH8I7x6GqcrVaXNCdTRpqcHcq1G+R1jCNgOX/1/oOYB9OcRoXpflZOgBpU6AkxiAaVqsUSzXE0hsJur/ey7IublyWpge/ODhPKcvgv4+g0nEv7ZHiR4+N2ESo/2WGkbP9761wxzI9wbC7ZEMxWbP+2FpTVgWt4Zv3tg7TwQeK82byVJlE+Mieoa8ffcDlCX724gd0HwU64U17VG5ksDyWn8x2sNBoRg12FAPWBAmY6Au01x4RPtiAroevCfmm3A/I+tRKB75vq+kq+UGoUiB53LQ4vDGrd4wpqFZWy4x7kV8lbISM56M1pQoJudzlIB6AG8OWI1eMsg0R8zihB+DhkU=
|1|VjCoZaJTgVmDe8A0Mgmog4T15io=|7cKQiOBupdy7LukZscqpA9EMhDk= ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBJIRr/VzWsrZjV1NaN7NhDEQhj6ILJvv6swfTSFX7ZxJOacaZkrWJwDhv669kFxWh8DV112ojM97ku2XKnXO1i0=
|1|M5J1CudnrxDVIbxt5M+MwkcSbmA=|djDsnNZ4W9/7zRTvJErm9UvbaQo= ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIC1zy/79d/fiMvsFexxFggDO/RjWFf2azgmeUlQoOZ8w
```

### Application Secrets

#### 3. VITE_SUPABASE_URL
**Value**: `https://avjnfessefxtfurayybp.supabase.co`

#### 4. VITE_SUPABASE_ANON_KEY
**Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2am5mZXNzZWZ4dGZ1cmF5eWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMzA0MzUsImV4cCI6MjA2NzkwNjQzNX0.Y5PnmWmemcXroIKBcycgTiUceINMOuVe34aQUcygl9Q`

#### 5. VITE_BACKEND_URL
**Value**: `https://128.140.45.28.sslip.io`

#### 6. VITE_SENTRY_DSN (Optional)
**Value**: Leave empty or add your Sentry DSN if you have one

#### 7. VITE_GA_MEASUREMENT_ID (Optional)
**Value**: Leave empty or add your Google Analytics ID if you have one

## Step 3: Add SSH Key to Server
If you generated a new SSH key, add the public key to the server:

```bash
# Copy public key
cat ~/.ssh/alfalyzer_deploy.pub

# SSH into server and add to authorized_keys
ssh root@128.140.45.28
echo "YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
```

## Step 4: Test Deployment

After adding all secrets:

1. Make a small change to trigger deployment:
```bash
echo "# Deploy trigger $(date)" >> README.md
git add README.md
git commit -m "ci: trigger first automated deployment"
git push origin main
```

2. Monitor the deployment:
- Go to the **Actions** tab in your GitHub repository
- Watch the "Build, Test & Deploy" workflow
- Check each step for success

## Verification Checklist

- [ ] All 7 secrets added to GitHub repository
- [ ] SSH key added to server's authorized_keys (if new key)
- [ ] Test commit pushed to trigger deployment
- [ ] GitHub Actions workflow running
- [ ] Deployment successful
- [ ] Production site accessible at https://128.140.45.28.sslip.io

## Troubleshooting

### SSH Connection Failed
- Verify SSH_PRIVATE_KEY is correctly formatted
- Check SSH_KNOWN_HOSTS matches server fingerprint
- Ensure SSH key is in server's authorized_keys

### Build Failed
- Check build logs in GitHub Actions
- Verify all environment variables are set
- Check for TypeScript or lint errors locally

### Deployment Failed
- Check PM2 logs on server: `pm2 logs alfalyzer`
- Verify nginx is running: `systemctl status nginx`
- Check server disk space: `df -h`

---
Created: 2025-08-24
Status: Ready for implementation