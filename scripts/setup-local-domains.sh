#!/bin/bash

# Alfalyzer Local Domain Setup Script
# This script sets up local domain aliases for easier access

echo "🔧 Alfalyzer Local Domain Setup"
echo "================================"

# Define the domains to set up
DOMAINS=(
    "127.0.0.1 alfalyzer.local"
    "127.0.0.1 dev.alfalyzer.local"
    "127.0.0.1 api.alfalyzer.local" 
    "127.0.0.1 app.alfalyzer.local"
    "127.0.0.1 admin.alfalyzer.local"
)

HOSTS_FILE="/etc/hosts"
BACKUP_FILE="/etc/hosts.alfalyzer.backup"

# Function to check if running as root/sudo
check_permissions() {
    if [[ $EUID -ne 0 ]]; then
        echo "❌ This script needs to be run with sudo to modify /etc/hosts"
        echo "Usage: sudo bash scripts/setup-local-domains.sh"
        exit 1
    fi
}

# Function to backup hosts file
backup_hosts() {
    if [[ ! -f "$BACKUP_FILE" ]]; then
        echo "📁 Creating backup of hosts file..."
        cp "$HOSTS_FILE" "$BACKUP_FILE"
        echo "✅ Backup created at $BACKUP_FILE"
    else
        echo "📁 Backup already exists at $BACKUP_FILE"
    fi
}

# Function to add domains to hosts file
add_domains() {
    echo ""
    echo "🌐 Adding local domains to $HOSTS_FILE..."
    
    # Add section header
    if ! grep -q "# Alfalyzer Local Development" "$HOSTS_FILE"; then
        echo "" >> "$HOSTS_FILE"
        echo "# Alfalyzer Local Development" >> "$HOSTS_FILE"
    fi
    
    # Add each domain if it doesn't exist
    for domain in "${DOMAINS[@]}"; do
        local domain_name=$(echo "$domain" | awk '{print $2}')
        
        if ! grep -q "$domain_name" "$HOSTS_FILE"; then
            echo "$domain" >> "$HOSTS_FILE"
            echo "✅ Added: $domain"
        else
            echo "⚠️  Domain already exists: $domain_name"
        fi
    done
}

# Function to verify domains
verify_domains() {
    echo ""
    echo "🔍 Verifying domain resolution..."
    
    for domain in "${DOMAINS[@]}"; do
        local domain_name=$(echo "$domain" | awk '{print $2}')
        local resolved_ip=$(dig +short "$domain_name" @127.0.0.1 2>/dev/null || nslookup "$domain_name" 2>/dev/null | grep "Address" | tail -1 | awk '{print $2}' || echo "Failed")
        
        if [[ "$resolved_ip" == "127.0.0.1" ]] || ping -c 1 "$domain_name" &>/dev/null; then
            echo "✅ $domain_name -> 127.0.0.1"
        else
            echo "❌ $domain_name -> Resolution failed"
        fi
    done
}

# Function to show usage instructions
show_usage() {
    echo ""
    echo "📚 Usage Instructions:"
    echo "======================"
    echo ""
    echo "After running this script, you can access Alfalyzer using these URLs:"
    echo ""
    echo "🌐 Main Application:"
    echo "   http://alfalyzer.local:3000"
    echo "   http://app.alfalyzer.local:3000"
    echo ""
    echo "🔧 Development Versions:"
    echo "   http://dev.alfalyzer.local:3005"
    echo "   http://dev.alfalyzer.local:8080"
    echo ""
    echo "🔌 API Access:"
    echo "   http://api.alfalyzer.local:3001/api/health"
    echo "   http://api.alfalyzer.local:3001/api/stocks"
    echo ""
    echo "👨‍💼 Admin Panel (when implemented):"
    echo "   http://admin.alfalyzer.local:3000/admin"
    echo ""
    echo "💡 Start the application with:"
    echo "   npm run dev:multi    # Multiple ports"
    echo "   npm run dev:ultra    # Everything + backup backend"
    echo ""
}

# Function to remove domains (cleanup)
remove_domains() {
    echo ""
    echo "🧹 Removing Alfalyzer domains from hosts file..."
    
    # Create temp file without Alfalyzer entries
    grep -v "alfalyzer.local" "$HOSTS_FILE" > "/tmp/hosts.tmp"
    grep -v "# Alfalyzer Local Development" "/tmp/hosts.tmp" > "/tmp/hosts.clean"
    
    # Replace hosts file
    mv "/tmp/hosts.clean" "$HOSTS_FILE"
    
    echo "✅ Alfalyzer domains removed"
    
    # Restore from backup if available
    if [[ -f "$BACKUP_FILE" ]]; then
        echo "💾 Original backup is still available at $BACKUP_FILE"
    fi
}

# Main execution
case "${1:-install}" in
    "install"|"add"|"setup")
        check_permissions
        backup_hosts
        add_domains
        verify_domains
        show_usage
        ;;
    "remove"|"cleanup"|"uninstall")
        check_permissions
        remove_domains
        ;;
    "verify"|"test"|"check")
        verify_domains
        ;;
    "help"|"-h"|"--help")
        echo "Alfalyzer Local Domain Setup"
        echo ""
        echo "Usage: sudo bash scripts/setup-local-domains.sh [command]"
        echo ""
        echo "Commands:"
        echo "  install   - Set up local domains (default)"
        echo "  remove    - Remove local domains"
        echo "  verify    - Check domain resolution"
        echo "  help      - Show this help"
        ;;
    *)
        echo "❌ Unknown command: $1"
        echo "Use: sudo bash scripts/setup-local-domains.sh help"
        exit 1
        ;;
esac