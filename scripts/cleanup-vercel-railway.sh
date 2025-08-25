#!/bin/bash

# Script to clean up Vercel and Railway references
# Keeps Hetzner-only deployment

echo "🧹 Cleaning up Vercel and Railway references..."

# Remove Vercel/Railway specific files
echo "Removing Vercel/Railway specific files..."
rm -f vercel.json
rm -f railway.toml
rm -f railway-server.js
rm -f fly.toml
rm -f render.yaml
rm -f netlify.toml
rm -rf .vercel
rm -rf spa-test
rm -rf test-deploy

# Remove scripts related to Vercel
echo "Removing Vercel-related scripts..."
rm -f scripts/remove-vercel-env.js
rm -f scripts/verify-vercel-proxy.js
rm -f scripts/fix-vercel-proxy.sh
rm -f scripts/vercel-401-checklist.sh
rm -f scripts/vercel-preview.sh

# Remove deploy scripts for other platforms
rm -f deploy-vercel*.sh
rm -f deploy-railway*.sh
rm -f *vercel*.cjs
rm -f *vercel*.js
rm -f *railway*.js

# Keep only Hetzner-related workflows
echo "Cleaning GitHub workflows..."
cd .github/workflows/
rm -f deploy-production.yml  # Old one with Vercel
rm -f deploy-staging.yml     # Staging with Vercel
rm -f ci.yml                  # Old CI
rm -f security-audit.yml     # Has Vercel references
rm -f test-401-solution.yml  # Vercel specific
# Keep: deploy.yml (updated for Hetzner) and keep-alive.yml
cd ../..

echo "✅ Cleanup complete!"
echo ""
echo "Remaining deployment files:"
echo "- .github/workflows/deploy.yml (Hetzner CI/CD)"
echo "- scripts/deploy-production.sh (Hetzner deployment)"
echo "- deploy-hetzner.sh (if exists)"
echo ""
echo "The project is now Hetzner-only! 🚀"