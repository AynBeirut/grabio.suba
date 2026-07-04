#!/bin/bash

# AI Builder - Quick Setup Script
# This script sets up the development environment

echo "🚀 Setting up AI Builder development environment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker found"

# Start Docker services
echo "🐳 Starting PostgreSQL and Redis containers..."
if command -v docker-compose &> /dev/null; then
    docker-compose -f docker-compose.dev.yml up -d
else
    docker compose -f docker-compose.dev.yml up -d
fi

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    
    # Update DATABASE_URL for Docker PostgreSQL
    if [[ "$OSTYPE" == "darwin"* ]] || [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sed -i.bak 's|DATABASE_URL=".*"|DATABASE_URL="postgresql://postgres:password@localhost:5432/aibuilder?schema=public"|' .env
        rm .env.bak
    fi
    
    echo "⚠️  IMPORTANT: Update .env with your API keys:"
    echo "   - NEXTAUTH_SECRET (run: openssl rand -base64 32)"
    echo "   - GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET"
    echo "   - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET"
    echo "   - OPENAI_API_KEY, ANTHROPIC_API_KEY, DEEPSEEK_API_KEY"
fi

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npx prisma generate

# Run migrations
echo "🗄️  Running database migrations..."
npx prisma migrate dev --name init

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Update .env with your OAuth credentials"
echo "   2. Run: npm run dev"
echo "   3. Visit: http://localhost:3000"
echo ""
echo "📚 Useful commands:"
echo "   - npm run dev          Start development server"
echo "   - npx prisma studio    Open database GUI"
echo "   - docker-compose -f docker-compose.dev.yml logs    View logs"
echo "   - docker-compose -f docker-compose.dev.yml down    Stop services"
echo ""
