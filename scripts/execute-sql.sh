#!/bin/bash

# Execute SQL directly via Supabase REST API

# Load environment
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | grep -v '^$' | xargs)
fi

SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}"
SUPABASE_KEY="${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}"

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
  echo "❌ Missing Supabase credentials"
  exit 1
fi

# Extract project ID from URL
PROJECT_ID=$(echo $SUPABASE_URL | sed 's|https://||' | sed 's|\.supabase\.co||')

echo "🚀 Executing coverage tracking migrations..."
echo "Project: $PROJECT_ID"

# Read the migration SQL
SQL_FILE="supabase/migrations/combined_coverage_tracking.sql"

if [ ! -f "$SQL_FILE" ]; then
  echo "❌ Migration file not found: $SQL_FILE"
  exit 1
fi

echo "📄 Reading migration file..."
SQL_CONTENT=$(cat "$SQL_FILE")

# Try to execute via Supabase query endpoint
echo "📡 Sending to Supabase..."

# Use the query endpoint (requires service role key for DDL)
curl -X POST "https://${PROJECT_ID}.supabase.co/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$SQL_CONTENT" | jq -Rs .)}" \
  -v

echo ""
echo "✅ Migration execution attempted"
echo "⚠️  Note: DDL execution may require service_role key"
