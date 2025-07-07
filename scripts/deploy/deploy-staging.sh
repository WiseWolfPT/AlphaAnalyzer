#!/bin/bash

# Deploy to Staging Environment
# This script automates the deployment process to staging

set -e # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Check if we're on the correct branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "develop" ]; then
    log_error "Must be on 'develop' branch to deploy to staging. Current branch: $CURRENT_BRANCH"
    exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    log_error "You have uncommitted changes. Please commit or stash them before deploying."
    exit 1
fi

log_info "Starting deployment to staging..."

# Run tests
log_info "Running tests..."
npm test -- --passWithNoTests || {
    log_error "Tests failed. Aborting deployment."
    exit 1
}

# Run linting
log_info "Running linting..."
npm run lint:check || {
    log_error "Linting failed. Please fix issues before deploying."
    exit 1
}

# Run type checking
log_info "Running TypeScript check..."
npm run check || {
    log_error "TypeScript check failed. Please fix type errors before deploying."
    exit 1
}

# Build the application
log_info "Building application..."
NODE_ENV=production npm run build || {
    log_error "Build failed. Aborting deployment."
    exit 1
}

# Check build output
if [ ! -d "dist" ] || [ ! -f "dist/public/index.html" ]; then
    log_error "Build output validation failed. Missing dist directory or index.html"
    exit 1
fi

# Get the latest from remote
log_info "Pulling latest changes..."
git pull origin develop

# Push to remote
log_info "Pushing to remote..."
git push origin develop

# Trigger GitHub Actions workflow
log_info "Deployment triggered via GitHub Actions"
log_info "Check deployment progress at: https://github.com/your-org/alfalyzer/actions"

# Wait for deployment to complete (optional)
log_info "Waiting for deployment to complete..."
sleep 30

# Run smoke tests against staging
log_info "Running smoke tests against staging..."
BASE_URL=https://staging.alfalyzer.com npm run test:e2e -- --grep "@smoke" || {
    log_warning "Smoke tests failed. Please check staging environment."
}

log_info "Deployment to staging completed successfully!"
log_info "Staging URL: https://staging.alfalyzer.com"