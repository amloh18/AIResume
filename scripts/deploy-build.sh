#!/bin/bash

# Deployment build script for Appwrite
# This script ensures all dependencies are properly installed before building

set -e

echo "🚀 Starting deployment build..."

# Clean install dependencies
echo "📦 Installing dependencies..."
npm ci --prefer-offline --no-audit

# Verify critical dependencies are installed
echo "🔍 Verifying critical dependencies..."
npm list tailwindcss postcss autoprefixer

# Build the application
echo "🏗️ Building application..."
npm run build

echo "✅ Build completed successfully!"
