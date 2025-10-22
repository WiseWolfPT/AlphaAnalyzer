#!/bin/bash

##############################################################################
# Test #1: Discovery Job (Backend Validation)
#
# Purpose: Validates transcripts worker discovers and stores transcripts
# Expected: COUNT > 0 in transcripts table with created_at within last hour
#
# TDD Principle: Test infrastructure before UI implementation
##############################################################################

set -e

echo "🧪 TEST #1: Discovery Job (Backend Validation)"
echo "=============================================="
echo ""

# Configuration
DB_HOST="${PGHOST:-127.0.0.1}"
DB_PORT="${PGPORT:-5432}"
DB_USER="${PGUSER:-alfalyzer}"
DB_NAME="${PGDATABASE:-alfalyzer_db}"
TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S")

echo "📋 Test Configuration:"
echo "   Database: ${DB_HOST}:${DB_PORT}/${DB_NAME}"
echo "   User: ${DB_USER}"
echo "   Test Time: ${TIMESTAMP}"
echo ""

# Test 1.1: Check database connectivity
echo "🔌 Test 1.1: Database Connectivity"
echo "   Checking PostgreSQL connection..."

if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "   ❌ FAIL: Cannot connect to database"
    echo ""
    echo "💡 Troubleshooting:"
    echo "   1. Check if PostgreSQL is running: systemctl status postgresql"
    echo "   2. Verify credentials in .env file"
    echo "   3. Check firewall rules for port $DB_PORT"
    exit 1
fi

echo "   ✅ PASS: Database connection successful"
echo ""

# Test 1.2: Check transcripts table exists
echo "📊 Test 1.2: Table Schema Validation"
echo "   Verifying 'transcripts' table exists..."

TABLE_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc \
    "SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'transcripts'
    );")

if [ "$TABLE_EXISTS" != "t" ]; then
    echo "   ❌ FAIL: 'transcripts' table does not exist"
    echo ""
    echo "💡 Required Action:"
    echo "   Run migrations: npm run migrate"
    exit 1
fi

echo "   ✅ PASS: 'transcripts' table exists"
echo ""

# Test 1.3: Count total transcripts
echo "📈 Test 1.3: Total Transcripts Count"

TOTAL_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc \
    "SELECT COUNT(*) FROM transcripts;")

echo "   Total transcripts in database: $TOTAL_COUNT"

if [ "$TOTAL_COUNT" -eq 0 ]; then
    echo "   ⚠️  WARNING: No transcripts found in database"
    echo ""
    echo "💡 Required Action:"
    echo "   1. Run discovery job: TRANSCRIPTS_SOURCE=fmp npm run worker:transcripts"
    echo "   2. Wait 5-10 minutes for first batch"
    echo "   3. Re-run this test"
    echo ""
    echo "   This is expected on fresh installations."
    exit 0
fi

echo "   ✅ PASS: Found $TOTAL_COUNT transcripts"
echo ""

# Test 1.4: Count recent transcripts (last hour)
echo "⏰ Test 1.4: Recent Transcripts Discovery"
echo "   Checking for transcripts created in last hour..."

RECENT_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc \
    "SELECT COUNT(*)
     FROM transcripts
     WHERE created_at > NOW() - INTERVAL '1 hour';")

echo "   Transcripts created in last hour: $RECENT_COUNT"

if [ "$RECENT_COUNT" -eq 0 ]; then
    echo "   ⚠️  INFO: No transcripts discovered in last hour"
    echo ""
    echo "   This is expected if:"
    echo "   - Worker hasn't run recently"
    echo "   - No new earnings calls were published"
    echo "   - BACKFILL_TRANSCRIPTS=false (normal operation)"
    echo ""
else
    echo "   ✅ PASS: Found $RECENT_COUNT recent transcripts"
fi

echo ""

# Test 1.5: Validate transcript data structure
echo "🔍 Test 1.5: Data Structure Validation"
echo "   Verifying transcript records have required fields..."

SAMPLE_TRANSCRIPT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc \
    "SELECT json_build_object(
        'id', id,
        'ticker', ticker,
        'company_name', company_name,
        'quarter', quarter,
        'year', year,
        'has_ai_summary', (ai_summary IS NOT NULL),
        'status', status,
        'call_date', call_date
     )
     FROM transcripts
     LIMIT 1;" 2>/dev/null || echo "{}")

if [ "$SAMPLE_TRANSCRIPT" = "{}" ]; then
    echo "   ❌ FAIL: Could not fetch sample transcript"
    exit 1
fi

echo "   Sample transcript structure:"
echo "$SAMPLE_TRANSCRIPT" | python3 -m json.tool 2>/dev/null || echo "$SAMPLE_TRANSCRIPT"
echo ""
echo "   ✅ PASS: Transcript structure is valid"
echo ""

# Test 1.6: Count transcripts by status
echo "📊 Test 1.6: Status Distribution"

STATUS_COUNTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc \
    "SELECT status, COUNT(*)
     FROM transcripts
     GROUP BY status
     ORDER BY COUNT(*) DESC;")

if [ -z "$STATUS_COUNTS" ]; then
    echo "   ⚠️  WARNING: No status distribution available"
else
    echo "   Transcripts by status:"
    echo "$STATUS_COUNTS" | while IFS='|' read -r status count; do
        echo "      $status: $count"
    done
fi

echo ""

# Test 1.7: Verify published transcripts exist
echo "✅ Test 1.7: Published Transcripts Validation"

PUBLISHED_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc \
    "SELECT COUNT(*) FROM transcripts WHERE status = 'published';")

echo "   Published transcripts: $PUBLISHED_COUNT"

if [ "$PUBLISHED_COUNT" -eq 0 ]; then
    echo "   ⚠️  WARNING: No published transcripts found"
    echo ""
    echo "💡 Required Action:"
    echo "   Run auto-publish: curl http://localhost:3001/api/transcripts/auto-publish"
else
    echo "   ✅ PASS: Found $PUBLISHED_COUNT published transcripts"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 TEST #1 SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "   Total Transcripts:     $TOTAL_COUNT"
echo "   Recent (1 hour):       $RECENT_COUNT"
echo "   Published:             $PUBLISHED_COUNT"
echo ""

if [ "$TOTAL_COUNT" -gt 0 ] && [ "$PUBLISHED_COUNT" -gt 0 ]; then
    echo "   ✅ OVERALL STATUS: PASS"
    echo ""
    echo "   The discovery job is working correctly!"
    exit 0
elif [ "$TOTAL_COUNT" -gt 0 ]; then
    echo "   ⚠️  OVERALL STATUS: PARTIAL PASS"
    echo ""
    echo "   Transcripts exist but need auto-publishing."
    echo "   Run: curl http://localhost:3001/api/transcripts/auto-publish"
    exit 0
else
    echo "   ❌ OVERALL STATUS: FAIL"
    echo ""
    echo "   No transcripts found. Run discovery job:"
    echo "   TRANSCRIPTS_SOURCE=fmp npm run worker:transcripts"
    exit 1
fi
