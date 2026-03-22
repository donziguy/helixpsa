#!/bin/bash

# HelixPSA Database Reset Script
# Resets the database and reseeds with fresh realistic data

echo "🔄 HelixPSA Database Reset"
echo "=========================="

# Check if we're in the right directory
if [ ! -f "drizzle.config.ts" ]; then
    echo "❌ Error: Please run this script from the app directory"
    exit 1
fi

# Run database migration to ensure schema is up to date
echo "📋 Running migrations..."
npm run db:migrate

if [ $? -ne 0 ]; then
    echo "❌ Migration failed!"
    exit 1
fi

echo "✅ Migrations complete"

# Run the reset and reseed
echo "🌱 Resetting and reseeding database..."
npx tsx src/db/seed-enhanced.ts reset

if [ $? -eq 0 ]; then
    echo "✅ Database reset and reseed completed successfully!"
    echo ""
    echo "📊 Database now contains:"
    echo "  - 2 Organizations (Prime ITS, TechFlow MSP)"
    echo "  - 5 Users (3 at Prime ITS, 2 at TechFlow)" 
    echo "  - 20 Clients with realistic company names"
    echo "  - 50 Tickets with varied priorities and statuses"
    echo "  - 200+ Time Entries across all tickets"
    echo "  - Contacts and Notes for comprehensive testing"
    echo ""
    echo "🔐 Login credentials:"
    echo "  - cory@primeits.com / password123 (Admin)"
    echo "  - mike@primeits.com / password123 (Technician)"
    echo "  - jake@primeits.com / password123 (Technician)"
    echo "  - admin@techflow.com / password123 (Admin)"
    echo "  - tech@techflow.com / password123 (Technician)"
else
    echo "❌ Database reset and reseed failed!"
    exit 1
fi