#!/bin/bash

# Hetzner + Coolify Setup Script for Alfalyzer
# This script automates the entire setup process

set -e  # Exit on error

echo "🚀 Alfalyzer - Hetzner + Coolify Setup Script"
echo "=============================================="
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Set the server IP directly
SERVER_IP=128.140.45.28

echo "📌 Setting up server at: $SERVER_IP"
echo ""

# Step 1: Initial SSH connection
echo "📡 Step 1: Connecting to server..."
echo "When prompted, enter 'yes' to add the server to known hosts"
echo "Then enter the root password from Hetzner Cloud Console"
echo ""
echo "Press Enter to continue..."
read

ssh root@$SERVER_IP << 'ENDSSH'
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

# Get Coolify URL
echo ""
echo "✅ Coolify installation complete!"
echo ""
echo "🌐 Access Coolify at: http://$(hostname -I | awk '{print $1}'):8000"
echo ""
echo "📝 Default credentials:"
echo "   Email: admin@coolify.io"
echo "   Password: password"
echo ""
echo "⚠️  IMPORTANT: Change the password immediately after first login!"
echo ""

# Create alfalyzer user
echo "👤 Creating alfalyzer user..."
useradd -m -s /bin/bash alfalyzer
usermod -aG docker alfalyzer

echo "✅ Server setup complete!"
ENDSSH

echo ""
print_status "Initial setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Access Coolify at: http://$SERVER_IP:8000"
echo "2. Login with: admin@coolify.io / password"
echo "3. Change the admin password immediately"
echo "4. Connect your GitHub account"
echo "5. Add the Alfalyzer repository"
echo ""
echo "🔒 Security setup (run these after login):"
echo "   - Set up SSH key authentication"
echo "   - Disable root login"
echo "   - Configure firewall (ufw)"
echo ""
echo "Need help? Check the deployment guide!"