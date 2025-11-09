#!/bin/bash

# Coverage Tracking System Setup Script
# This script automates the complete setup process

echo "🚀 Coverage Tracking System - Automated Setup"
echo "============================================================"

# Load environment variables from .env.local
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | grep -v '^$' | xargs)
fi

# Check for required environment variables
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  echo "❌ Error: NEXT_PUBLIC_SUPABASE_URL not set in .env.local"
  exit 1
fi

echo "✅ Environment loaded"
echo ""

# Step 1: Database migrations
echo "📦 Step 1: Database Migrations"
echo "------------------------------------------------------------"
echo "⚠️  Migrations must be run manually in Supabase SQL Editor"
echo ""
echo "Please complete these steps:"
echo "1. Go to: https://supabase.com/dashboard"
echo "2. Navigate to: SQL Editor → New Query"
echo "3. Run migration files in order:"
echo "   a. supabase/migrations/20250129000000_coverage_tracking_tables.sql"
echo "   b. supabase/migrations/20250129000001_coverage_calculation_function.sql"
echo ""
read -p "Press ENTER when migrations are complete..."
echo "✅ Migrations completed"
echo ""

# Step 2: Check if service role key is available
echo "📦 Step 2: County Data Seeding"
echo "------------------------------------------------------------"

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "⚠️  SUPABASE_SERVICE_ROLE_KEY not found in .env.local"
  echo ""
  echo "To run automated seeding, add your service role key:"
  echo "1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api"
  echo "2. Copy the 'service_role' key"
  echo "3. Add to .env.local: SUPABASE_SERVICE_ROLE_KEY=your_key_here"
  echo "4. Re-run this script"
  echo ""
  echo "Or manually insert county data via SQL Editor"
  exit 1
fi

# Run county seeding
echo "🌱 Seeding county data..."
node scripts/seed-county-data.mjs

if [ $? -eq 0 ]; then
  echo "✅ County data seeded successfully"
else
  echo "❌ County seeding failed. Check error messages above."
  exit 1
fi
echo ""

# Step 3: Enrich resources
echo "📦 Step 3: Resource Enrichment"
echo "------------------------------------------------------------"
echo "🔄 Adding county FIPS to existing resources..."
node scripts/enrich-resources-with-county.mjs

if [ $? -eq 0 ]; then
  echo "✅ Resources enriched successfully"
else
  echo "❌ Resource enrichment failed. Check error messages above."
  exit 1
fi
echo ""

# Step 4: Calculate coverage
echo "📦 Step 4: Coverage Calculation"
echo "------------------------------------------------------------"
echo "📊 Triggering initial coverage calculation..."
echo "⚠️  This step requires an authenticated admin session"
echo ""
echo "Please complete this step manually:"
echo "1. Start your dev server: npm run dev"
echo "2. Log in as an admin user"
echo "3. Go to: http://localhost:3000/admin/coverage-map"
echo "4. Click 'Recalculate All Metrics'"
echo ""
read -p "Press ENTER when coverage calculation is complete..."
echo "✅ Coverage calculated"
echo ""

# Summary
echo "============================================================"
echo "🎉 Coverage Tracking System Setup Complete!"
echo "============================================================"
echo ""
echo "✅ Database migrations: Complete"
echo "✅ County data: Seeded"
echo "✅ Resources: Enriched with county data"
echo "✅ Coverage metrics: Calculated"
echo ""
echo "📍 Next steps:"
echo "   1. Visit: http://localhost:3000/admin/coverage-map"
echo "   2. Explore the coverage dashboard"
echo "   3. Generate reports and export data"
echo "   4. Add more counties as needed"
echo ""
echo "📚 Documentation: COVERAGE_TRACKING_SETUP.md"
echo ""
