#!/bin/bash

# Circle CV App - Vercel Deployment Script
# This script automates the deployment process to Vercel

set -e  # Exit on any error

echo "🚀 Circle CV App - Vercel Deployment Script"
echo "============================================="

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed. Installing..."
    npm install -g vercel
    echo "✅ Vercel CLI installed successfully"
else
    echo "✅ Vercel CLI is already installed"
fi

# Check if user is logged in to Vercel
if ! vercel whoami &> /dev/null; then
    echo "❌ Not logged in to Vercel. Please login..."
    vercel login
else
    echo "✅ Already logged in to Vercel"
fi

# Run build to ensure everything is working
echo "🔨 Building the application..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed. Please fix the issues before deploying."
    exit 1
fi

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod

if [ $? -eq 0 ]; then
    echo "🎉 Deployment successful!"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Set up environment variables in Vercel dashboard"
    echo "2. Configure MongoDB Atlas connection"
    echo "3. Set up Firebase project"
    echo "4. Configure payment providers (Stripe/Polar)"
    echo "5. Test all functionality"
    echo ""
    echo "📚 See DEPLOYMENT_READY_FINAL.md for detailed instructions"
else
    echo "❌ Deployment failed. Please check the error messages above."
    exit 1
fi
