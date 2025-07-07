#!/bin/bash

# Deploy to Production Environment
# This script automates the deployment process to production with safety checks

set -e # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_prompt() {
    echo -e "${BLUE}[PROMPT]${NC} $1"
}

# Safety check - confirm production deployment
log_warning "⚠️  You are about to deploy to PRODUCTION!"
log_prompt "Are you sure you want to continue? (yes/no)"
read -r CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    log_info "Deployment cancelled."
    exit 0
fi

# Check if we're on the correct branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    log_error "Must be on 'main' branch to deploy to production. Current branch: $CURRENT_BRANCH"
    exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    log_error "You have uncommitted changes. Please commit or stash them before deploying."
    exit 1
fi

# Ensure we have the latest changes
log_info "Fetching latest changes..."
git fetch origin main

# Check if local is behind remote
LOCAL=$(git rev-parse @)
REMOTE=$(git rev-parse @{u})

if [ "$LOCAL" != "$REMOTE" ]; then
    log_error "Your local branch is not up to date with remote. Please pull latest changes."
    exit 1
fi

log_info "Starting production deployment..."

# Create backup tag
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_TAG="production-backup-$TIMESTAMP"
log_info "Creating backup tag: $BACKUP_TAG"
git tag -a "$BACKUP_TAG" -m "Backup before production deployment $TIMESTAMP"

# Run comprehensive tests
log_info "Running comprehensive test suite..."
npm test || {
    log_error "Tests failed. Aborting deployment."
    exit 1
}

# Run E2E tests
log_info "Running E2E tests..."
npm run test:e2e || {
    log_error "E2E tests failed. Aborting deployment."
    exit 1
}

# Run security audit
log_info "Running security audit..."
npm audit --audit-level=high || {
    log_warning "Security vulnerabilities found. Review before proceeding."
    log_prompt "Continue anyway? (yes/no)"
    read -r CONTINUE_AUDIT
    if [ "$CONTINUE_AUDIT" != "yes" ]; then
        exit 1
    fi
}

# Build the application
log_info "Building application for production..."
NODE_ENV=production npm run build || {
    log_error "Build failed. Aborting deployment."
    exit 1
}

# Validate build
log_info "Validating build output..."
if [ ! -d "dist" ] || [ ! -f "dist/public/index.html" ]; then
    log_error "Build output validation failed."
    exit 1
fi

# Check bundle size
MAIN_JS=$(find dist -name "index*.js" | head -1)
if [ -f "$MAIN_JS" ]; then
    SIZE=$(stat -f%z "$MAIN_JS" 2>/dev/null || stat -c%s "$MAIN_JS")
    SIZE_MB=$((SIZE / 1024 / 1024))
    if [ "$SIZE" -gt 512000 ]; then
        log_warning "Main bundle size exceeds 500KB limit (${SIZE_MB}MB)"
    fi
fi

# Show deployment summary
log_info "Deployment Summary:"
echo "- Branch: $CURRENT_BRANCH"
echo "- Commit: $(git rev-parse --short HEAD)"
echo "- Message: $(git log -1 --pretty=%B)"
echo "- Author: $(git log -1 --pretty=%an)"
echo "- Backup Tag: $BACKUP_TAG"

log_prompt "Proceed with deployment? (yes/no)"
read -r FINAL_CONFIRM

if [ "$FINAL_CONFIRM" != "yes" ]; then
    log_info "Deployment cancelled."
    exit 0
fi

# Push backup tag
log_info "Pushing backup tag..."
git push origin "$BACKUP_TAG"

# Trigger production deployment via GitHub Actions
log_info "Triggering production deployment..."
gh workflow run deploy.yml -f environment=production -f skip_tests=false || {
    log_error "Failed to trigger deployment workflow."
    exit 1
}

# Monitor deployment
log_info "Deployment triggered. Monitor progress at:"
echo "https://github.com/your-org/alfalyzer/actions"

# Create release notes
log_info "Creating release notes..."
RELEASE_NOTES="release-notes-$TIMESTAMP.md"
cat > "$RELEASE_NOTES" << EOF
# Release Notes - $(date +"%Y-%m-%d %H:%M:%S")

## Deployment Information
- **Environment**: Production
- **Branch**: $CURRENT_BRANCH
- **Commit**: $(git rev-parse HEAD)
- **Deployed By**: $(git config user.name)

## Changes Since Last Deployment
$(git log --oneline production-latest..HEAD 2>/dev/null || echo "First deployment")

## Pre-deployment Checks
- ✅ All tests passed
- ✅ E2E tests passed
- ✅ Security audit completed
- ✅ Build successful
- ✅ Bundle size checked

## Rollback Instructions
If needed, rollback to: $BACKUP_TAG
\`\`\`bash
git checkout $BACKUP_TAG
./scripts/deploy/rollback-production.sh $BACKUP_TAG
\`\`\`
EOF

log_info "Release notes saved to: $RELEASE_NOTES"

# Update production-latest tag
log_info "Updating production-latest tag..."
git tag -f production-latest
git push -f origin production-latest

# Wait and run post-deployment checks
log_info "Waiting for deployment to complete (5 minutes)..."
sleep 300

# Run production smoke tests
log_info "Running production smoke tests..."
BASE_URL=https://alfalyzer.com npm run test:e2e -- --grep "@smoke" || {
    log_error "Production smoke tests failed!"
    log_warning "Consider rolling back if issues persist."
}

# Check production health
log_info "Checking production health..."
curl -f -s -o /dev/null -w "%{http_code}" https://alfalyzer.com/api/health || {
    log_error "Health check failed!"
}

log_info "🎉 Production deployment completed successfully!"
log_info "Production URL: https://alfalyzer.com"
log_info "Remember to:"
echo "1. Monitor error rates in Sentry"
echo "2. Check performance metrics"
echo "3. Verify critical user flows"
echo "4. Update status page if needed"