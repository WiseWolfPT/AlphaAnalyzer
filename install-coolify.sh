#!/bin/bash

# Simple Coolify installation for Alfalyzer
echo "🚀 Installing Coolify on your Hetzner server..."
echo ""
echo "📝 Server Details:"
echo "   IP: 128.140.45.28"
echo "   Password: jMNTjAAddKRmAgaRVMk7"
echo ""
echo "Connecting to server and installing Coolify..."
echo ""

ssh root@128.140.45.28 'bash -s' << 'EOF'
# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install required packages
echo "📦 Installing required packages..."
apt install -y curl wget git

# Install Docker
echo "🐳 Installing Docker..."
curl -fsSL https://get.docker.com | sh

# Install Coolify
echo "🚀 Installing Coolify..."
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash

# Show access info
echo ""
echo "✅ =========================================="
echo "✅ Coolify installation complete!"
echo "✅ =========================================="
echo ""
echo "🌐 Access Coolify at: http://128.140.45.28:8000"
echo ""
echo "📝 Default credentials:"
echo "   Email: admin@coolify.io"
echo "   Password: password"
echo ""
echo "⚠️  IMPORTANT: Change the password immediately!"
echo ""
EOF