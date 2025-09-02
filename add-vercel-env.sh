#!/bin/bash
# Script to add missing environment variables to Vercel

echo "Adding missing environment variables to Vercel..."

# Add MOCK_MODE (disabled for production)
echo "false" | vercel env add MOCK_MODE production

# Add NEXT_PUBLIC_MOCK_MODE (disabled for production)
echo "false" | vercel env add NEXT_PUBLIC_MOCK_MODE production

# Add ENABLE_REAL_EMAILS 
echo "true" | vercel env add ENABLE_REAL_EMAILS production

echo "✅ Environment variables added successfully!"
echo "🔄 You may need to redeploy for changes to take effect"