#!/bin/bash

echo "🚀 Open SEO - Starting development server"
echo "=========================================="

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "⚠️  .env.local file not found"
    echo "📋 Creating .env.local from env.example..."
    cp env.example .env.local
    echo "✅ .env.local created"
    echo "🔧 Please edit .env.local with your Firebase credentials before continuing"
    echo ""
    echo "Required keys:"
    echo "- NEXT_PUBLIC_FIREBASE_* (Firebase config)"
    echo "- FIREBASE_CLIENT_EMAIL (Admin SDK)"
    echo "- FIREBASE_PRIVATE_KEY (Admin SDK)"
    echo ""
    read -p "Press Enter after configuring .env.local..."
fi

echo "📦 Installing dependencies..."
npm install

echo "🔍 Checking configuration..."
# Check essential environment variables
if ! grep -q "NEXT_PUBLIC_FIREBASE_API_KEY=" .env.local; then
    echo "❌ Firebase configuration missing"
    exit 1
fi

echo "✅ Configuration OK"
echo "🌐 Starting development server..."
echo "📱 App will be available at http://localhost:3000"
echo ""

npm run dev
