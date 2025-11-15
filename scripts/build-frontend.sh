#!/bin/bash
# Build Frontend Script
# This script builds the frontend and places output in the public directory
# Run this before committing or deploying

set -e

echo "🎨 Building frontend..."

# Navigate to frontend directory
cd "$(dirname "$0")/../../Aichatinterface"

# Install dependencies
echo "📦 Installing frontend dependencies..."
pnpm install

# Build frontend (outputs to ../puppet-master/public)
echo "🔨 Building frontend..."
pnpm run build

echo "✅ Frontend built successfully!"
echo "📁 Output location: $(pwd)/../puppet-master/public"
echo ""
echo "Next steps:"
echo "  1. Review the build output in puppet-master/public/"
echo "  2. Commit the public directory to the puppet-master repo"
echo "  3. Deploy or build Docker image"
