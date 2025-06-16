#!/bin/bash

# Auto-deploy script - commits changes and triggers deployment
echo "🚀 Auto-deploying changes..."

# Add all changes
git add .

# Commit with timestamp
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")
git commit -m "auto-deploy: webapp updates $TIMESTAMP

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to trigger auto-deployment
git push origin main

echo "✅ Changes pushed - Vercel will auto-deploy"
echo "🌐 Check your Vercel dashboard for deployment status"