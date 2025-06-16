#!/bin/bash

# Deploy via API script wrapper
cd "/Users/antoniofrancisco/Documents/teste 1"

# Make sure we have node in path
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:$PATH"

echo "🚀 Starting deployment process..."
echo "Working directory: $(pwd)"

# Execute the deployment script
node deploy_via_api.mjs