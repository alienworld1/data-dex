#!/bin/bash

# DataDex Backend Test Script
echo "🧪 Testing DataDex Backend API"
echo "================================"

# Test health endpoint
echo "🏥 Testing health endpoint..."
curl -s http://localhost:3001/health | jq . || echo "Health endpoint failed"
echo ""

# Test API info endpoint
echo "📋 Testing API info endpoint..."
curl -s http://localhost:3001/api | jq . || echo "API info endpoint failed"
echo ""

# Test IPFS status
echo "🔗 Testing IPFS status endpoint..."
curl -s http://localhost:3001/api/upload/status | jq . || echo "IPFS status endpoint failed"
echo ""

# Test platform stats
echo "📊 Testing platform stats endpoint..."
curl -s http://localhost:3001/api/aptos/platform-stats | jq . || echo "Platform stats endpoint failed"
echo ""

# Test network info
echo "🌐 Testing network info endpoint..."
curl -s http://localhost:3001/api/aptos/network-info | jq . || echo "Network info endpoint failed"
echo ""

echo "✅ API tests completed!"
