#!/bin/bash

# Load environment variables from secure file
if [ ! -f .env.production ]; then
    echo "Error: .env.production file not found!"
    echo "Please create .env.production with all required environment variables"
    exit 1
fi

# Source the environment file
source .env.production

# Start the production server
echo "Starting production server with environment from .env.production..."
npx tsx server/index.ts