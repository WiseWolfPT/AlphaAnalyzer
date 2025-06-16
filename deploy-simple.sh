#!/bin/bash

# Simple Deployment Script
# This script demonstrates how to set up and run the deployment workflow

echo "🚀 Alpha Analyzer Deployment Workflow"
echo "===================================="
echo ""

# Check if environment variables are set
if [ -z "$GIT_REPO" ] || [ -z "$VERCEL_TOKEN" ] || [ -z "$VERCEL_PROJECT_ID" ] || [ -z "$VERCEL_ORG_ID" ]; then
    echo "❌ Missing required environment variables!"
    echo ""
    echo "Please set the following environment variables:"
    echo "  export GIT_REPO=\"https://github.com/username/repo.git\""
    echo "  export VERCEL_TOKEN=\"your-vercel-token\""
    echo "  export VERCEL_PROJECT_ID=\"your-project-id\""
    echo "  export VERCEL_ORG_ID=\"your-org-id\""
    echo ""
    echo "You can copy setup-env.template to setup-env.sh and customize it:"
    echo "  cp setup-env.template setup-env.sh"
    echo "  # Edit setup-env.sh with your values"
    echo "  source setup-env.sh"
    echo ""
    exit 1
fi

echo "✅ Environment variables detected"
echo "📦 Repository: $GIT_REPO"
echo "🔧 Project ID: $VERCEL_PROJECT_ID"
echo ""

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed or not in PATH"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js available: $(node --version)"
echo ""

# Run the deployment workflow
echo "🚀 Starting deployment workflow..."
echo ""

node FINAL_DEPLOY.js