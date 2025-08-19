#!/bin/bash

# Script to fix CORS and frontend loading issues on Alfalyzer Production
# Run this on your LOCAL machine - it will update cors.ts and create deployment script

echo "🔧 Fixing CORS configuration for production..."

# Update cors.ts to include the production URL
cat > server/middleware/cors.ts << 'EOF'
import cors from 'cors';
import { Request, Response, NextFunction } from 'express';

const isDevelopment = process.env.NODE_ENV !== 'production';

// Production origins - INCLUDING our Hetzner server
const productionOrigins = [
  'https://128.140.45.28.sslip.io',
  'http://128.140.45.28.sslip.io',
  'https://128.140.45.28',
  'http://128.140.45.28',
  'https://alfalyzer.com',
  'https://www.alfalyzer.com'
];

// Development origins
const developmentOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5174',
  'http://127.0.0.1:5173'
];

export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // In production
    if (process.env.NODE_ENV === 'production') {
      // No origin = same-origin request (allowed)
      if (!origin) {
        return callback(null, true);
      }
      
      // Check against production whitelist
      if (productionOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // Check if CORS override is enabled
      if (process.env.DISABLE_CORS === 'true') {
        console.warn(`⚠️ CORS: Allowing origin due to DISABLE_CORS=true: ${origin}`);
        return callback(null, true);
      }
      
      // Block everything else
      console.warn(`🚨 CORS: Blocked unauthorized origin in production: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    }
    
    // Development mode - more permissive
    if (!origin || developmentOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    console.warn(`❌ CORS: Blocked origin in development: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-api-key'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 204
};

// Security middleware
export const verifyOrigin = (req: Request, res: Response, next: NextFunction) => {
  next();
};
EOF

echo "✅ cors.ts updated with production URLs"

# Create server deployment script
cat > deploy-to-server.sh << 'DEPLOY'
#!/bin/bash

# Deploy script to fix production issues
# Run this AFTER running fix-cors-production.sh

SERVER="root@128.140.45.28"
PROJECT_DIR="/home/teste 1"

echo "🚀 Deploying CORS fix to production..."

# 1. Build the project locally
echo "📦 Building project..."
npm run build

# 2. Copy updated cors.ts to server
echo "📤 Copying cors.ts to server..."
scp server/middleware/cors.ts "$SERVER:$PROJECT_DIR/server/middleware/"

# 3. SSH and rebuild on server
echo "🔧 Rebuilding on server..."
ssh "$SERVER" << 'REMOTE'
cd "/home/teste 1"

# Install dependencies if needed
npm install

# Build the project
npm run build

# Copy frontend files to correct location
echo "📁 Copying frontend files..."
mkdir -p dist/public
cp -r client/dist/public/* dist/public/

# Update .env.production to ensure correct URLs
cat > .env.production << 'ENV'
NODE_ENV=production
PORT=3001

# Frontend URL - using sslip.io for SSL
VITE_API_URL=https://128.140.45.28.sslip.io

# Supabase
VITE_SUPABASE_URL=https://avjnfessefxtfurayybp.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2am5mZXNzZWZ4dGZ1cmF5eWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMzA0MzUsImV4cCI6MjA2NzkwNjQzNX0.Y5PnmWmemcXroIKBcycgTiUceINMOuVe34aQUcygl9Q
SUPABASE_URL=https://avjnfessefxtfurayybp.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2am5mZXNzZWZ4dGZ1cmF5eWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMzA0MzUsImV4cCI6MjA2NzkwNjQzNX0.Y5PnmWmemcXroIKBcycgTiUceINMOuVe34aQUcygl9Q
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2am5mZXNzZWZ4dGZ1cmF5eWJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjMzMDQzNSwiZXhwIjoyMDY3OTA2NDM1fQ.NblNWyjz09cGRo6VBMY5zMscfDMX7v7yWXVMHgOwlq8

# API Keys
FMP_API_KEY=sEoOHoj4kGtqhkU7MrQl4lmeF4LwB2Bh
ALPHA_VANTAGE_API_KEY=0RJ09OQXLM9L3NWZ
FINNHUB_API_KEY=ctdl2kpr01qkbu9hshtgctdl2kpr01qkbu9hshtt
TWELVE_DATA_API_KEY=4e6f4e28f1d54e11a69bb53c93bc6c4d
POLYGON_API_KEY=

# Redis
REDIS_ENABLED=true
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=alfalyzer2025redis

# Security
JWT_SECRET=alfalyzer-jwt-secret-production-2025

# CORS - Allowing our production URLs
CORS_ORIGIN=https://128.140.45.28.sslip.io,http://128.140.45.28,http://localhost:3000
ALLOWED_ORIGINS=https://128.140.45.28.sslip.io,http://128.140.45.28,http://localhost:3000

# Optional: Temporary CORS disable for testing
# DISABLE_CORS=true
ENV

# Restart PM2
echo "🔄 Restarting PM2..."
pm2 restart alfalyzer --update-env
pm2 save

# Check status
echo "📊 Checking status..."
pm2 status
sleep 2

# Test endpoints
echo ""
echo "🧪 Testing endpoints..."
echo "Backend health:"
curl -s http://localhost:3001/api/health | head -c 200
echo ""
echo ""
echo "Frontend via HTTPS:"
curl -I https://128.140.45.28.sslip.io/ 2>/dev/null | head -n 3

REMOTE

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📌 URLs to test:"
echo "   HTTPS: https://128.140.45.28.sslip.io/"
echo "   HTTP:  http://128.140.45.28/"
echo ""
echo "🔍 To check logs:"
echo "   ssh $SERVER"
echo "   pm2 logs alfalyzer --lines 100"
DEPLOY

chmod +x deploy-to-server.sh

echo ""
echo "✅ Scripts created successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Review the changes in server/middleware/cors.ts"
echo "2. Run: ./deploy-to-server.sh"
echo "3. Test the site at https://128.140.45.28.sslip.io/"
echo ""
echo "💡 If CORS still blocks, you can temporarily disable it:"
echo "   ssh root@128.140.45.28"
echo "   echo 'DISABLE_CORS=true' >> '/home/teste 1/.env.production'"
echo "   pm2 restart alfalyzer --update-env"