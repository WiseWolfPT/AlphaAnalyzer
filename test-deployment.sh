#!/bin/bash

# Test AlphaAnalyzer Deployment
# This script tests both Koyeb and Vercel deployments

echo "🔍 Testing AlphaAnalyzer Deployments"
echo "===================================="

# Function to test URL
test_url() {
    local url=$1
    local name=$2
    
    echo ""
    echo "Testing $name..."
    echo "URL: $url"
    
    # Test HTTP response
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [ "$response" = "200" ]; then
        echo "✅ HTTP Status: $response - OK"
        
        # Check for common issues
        content=$(curl -s "$url" | head -n 100)
        
        # Check if we're getting HTML
        if [[ "$content" == *"<html"* ]] || [[ "$content" == *"<!DOCTYPE"* ]]; then
            echo "✅ HTML content detected"
        else
            echo "⚠️  Warning: No HTML content detected"
        fi
        
        # Check for React root element
        if [[ "$content" == *'id="root"'* ]]; then
            echo "✅ React root element found"
        else
            echo "❌ React root element not found"
        fi
        
        # Check for black screen indicators
        if [[ "$content" == *"alfalyzer-loading"* ]]; then
            echo "✅ Loading indicator present"
        fi
        
    else
        echo "❌ HTTP Status: $response - Failed"
    fi
}

# Test Koyeb deployment
echo "1. Testing Koyeb Backend + Frontend"
test_url "https://alphaanalyzer-wisewolfpt.koyeb.app" "Koyeb"

# Test API health endpoint
echo ""
echo "2. Testing API Health Endpoint"
api_response=$(curl -s "https://alphaanalyzer-wisewolfpt.koyeb.app/api/health")
if [[ "$api_response" == *"status"* ]] && [[ "$api_response" == *"ok"* ]]; then
    echo "✅ API is healthy: $api_response"
else
    echo "❌ API health check failed"
fi

# If Vercel URL is provided, test it too
if [ -n "$1" ]; then
    echo ""
    echo "3. Testing Vercel Frontend"
    test_url "$1" "Vercel"
fi

echo ""
echo "===================================="
echo "📊 Test Summary"
echo ""
echo "💡 Tips:"
echo "- If you see 'black screen', check browser console for errors"
echo "- Ensure all environment variables are configured"
echo "- Check that Service Worker is not causing issues"
echo ""
echo "🔗 Useful URLs:"
echo "- Koyeb Dashboard: https://app.koyeb.com/apps/alphaanalyzer"
echo "- Vercel Dashboard: https://vercel.com/dashboard"