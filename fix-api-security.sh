#!/bin/bash

# Script to fix API security middleware
echo "Fixing API security middleware..."

# Add our URL to allowed origins list (line 143 in the allowedOrigins array)
sed -i "143a\\    'https://128.140.45.28.sslip.io'," server/middleware/api-security.ts
sed -i "144a\\    'http://128.140.45.28.sslip.io'," server/middleware/api-security.ts

echo "Added URLs to allowed origins list"

# Restart PM2
pm2 restart alfalyzer --update-env

echo "Server restarted. Waiting for it to initialize..."
sleep 5

# Test endpoint
echo "Testing endpoint..."
curl -s 'http://localhost:3001/api/market-data/quotes/batch?symbols=AAPL' | jq '.quotes[0].symbol'

echo "Fix complete!"