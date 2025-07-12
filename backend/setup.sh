#!/bin/bash

# DataDex Backend Setup Script
echo "🚀 Setting up DataDex Backend"
echo "============================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm version: $(npm --version)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚙️  Creating .env file from template..."
    cp .env.example .env
    echo "📝 Please edit .env file with your configuration:"
    echo "   - IPFS_PROJECT_ID and IPFS_PROJECT_SECRET (for Infura IPFS)"
    echo "   - MARKETPLACE_CONTRACT_ADDRESS (your deployed contract address)"
    echo "   - Other settings as needed"
else
    echo "✅ .env file already exists"
fi

# Create uploads directory if it doesn't exist
if [ ! -d "uploads" ]; then
    echo "📁 Creating uploads directory..."
    mkdir uploads
    touch uploads/.gitkeep
else
    echo "✅ uploads directory already exists"
fi

echo ""
echo "🎉 Backend setup completed!"
echo ""
echo "🚀 To start the server:"
echo "   npm start        # Production mode"
echo "   npm run dev      # Development mode with nodemon"
echo ""
echo "🏥 Health check: http://localhost:3001/health"
echo "📋 API docs: http://localhost:3001/api"
echo ""
echo "📝 Don't forget to:"
echo "   1. Configure your .env file"
echo "   2. Deploy the smart contracts"
echo "   3. Update MARKETPLACE_CONTRACT_ADDRESS in .env"
