#!/bin/bash

# HETZNER SERVER SETUP - STEP 1: FIREWALL CONFIGURATION
# This script configures UFW firewall for production security

echo "🔒 Configuring UFW Firewall for Alfalyzer Production"
echo "======================================================="

# Update package list
echo "📦 Updating package list..."
sudo apt update

# Install UFW if not present
echo "📦 Installing UFW..."
sudo apt install -y ufw

# Set default policies
echo "🛡️ Setting default firewall policies..."
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (important to do this first!)
echo "🔓 Allowing SSH access..."
sudo ufw allow ssh
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
echo "🌐 Allowing HTTP and HTTPS..."
sudo ufw allow http
sudo ufw allow https
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow Node.js port (internal only)
echo "🚀 Allowing Node.js port 3001 (localhost only)..."
# Note: This is for internal access only - Nginx will proxy to this
sudo ufw allow from 127.0.0.1 to any port 3001

# Redis should only be accessible locally
echo "💾 Configuring Redis access (localhost only)..."
sudo ufw allow from 127.0.0.1 to any port 6379

# Enable firewall
echo "✅ Enabling firewall..."
sudo ufw --force enable

# Show status
echo "📊 Firewall status:"
sudo ufw status verbose

echo ""
echo "✅ Firewall configuration complete!"
echo "Next step: Run 02-setup-nginx-ssl.sh to configure HTTPS"