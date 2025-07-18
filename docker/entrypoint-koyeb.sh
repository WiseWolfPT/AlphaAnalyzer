#!/bin/sh

# Simple production entrypoint for Koyeb
set -e

echo "🚀 Starting Alfalyzer on Koyeb..."

# Ensure we're in the app directory
cd /app

# Build the frontend if needed
if [ ! -d "dist" ]; then
    echo "Building frontend..."
    npm run build:client
fi

# Start the backend server
echo "Starting server on port ${PORT:-3001}..."
exec npm run backend