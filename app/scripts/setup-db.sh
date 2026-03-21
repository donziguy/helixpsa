#!/bin/bash

# HelixPSA Database Setup Script

set -e

echo "🐘 Setting up HelixPSA database..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Start PostgreSQL and PgBouncer containers
echo "🚀 Starting PostgreSQL and PgBouncer containers..."
docker-compose up -d

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 10

# Test connection
echo "🔍 Testing database connection..."
if ! docker-compose exec postgres pg_isready -U helixpsa -d helixpsa > /dev/null 2>&1; then
    echo "❌ PostgreSQL is not ready yet. Waiting longer..."
    sleep 15
fi

# Generate and push schema
echo "📋 Generating Drizzle schema..."
npm run db:generate

echo "🚀 Pushing schema to database..."
npm run db:push

# Seed the database
echo "🌱 Seeding database with sample data..."
npm run db:seed

echo "✅ Database setup complete!"
echo ""
echo "📊 Database is ready with:"
echo "  - PostgreSQL running on localhost:5432"
echo "  - PgBouncer running on localhost:6432 (recommended for app)"
echo "  - Sample organizations, users, clients, and tickets"
echo ""
echo "🔧 You can manage the database with:"
echo "  - npm run db:studio  (Drizzle Studio)"
echo "  - docker-compose logs postgres  (view logs)"
echo "  - docker-compose down  (stop containers)"