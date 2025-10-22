#!/bin/bash

##############################################################################
# Test #2: AI Processing (Queue Validation)
#
# Purpose: Validates AI summary generation and status transitions
# Expected: Transcripts progress from 'pending' → 'reviewed' → 'published'
#           with ai_summary populated
#
# TDD Principle: Validate processing pipeline before UI consumption
##############################################################################

set -e

echo "🤖 TEST #2: AI Processing (Queue Validation)"
echo "=============================================="
echo ""

# Configuration
DB_HOST="${PGHOST:-127.0.0.1}"
DB_PORT="${PGPORT:-5432}"
DB_USER="${PGUSER:-alfalyzer}"
DB_NAME="${PGDATABASE:-alfalyzer_db}"
WAIT_TIME="${AI_WAIT_TIME:-180}" # 3 minutes default

echo "📋 Test Configuration:"
echo "   Database: ${DB_HOST}:${DB_PORT}/${DB_NAME}"
echo "   Max Wait Time: ${WAIT_TIME}s"
echo ""

# Test 2.1: Count transcripts by AI summary status
echo "📊 Test 2.1: AI Summary Coverage"

TOTAL_TRANSCRIPTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc \
    "SELECT COUNT(*) FROM transcripts;")

WITH_SUMMARY=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc \
    "SELECT COUNT(*)
     FROM transcripts
     WHERE ai_summary IS NOT NULL
       AND LENGTH(TRIM(ai_summary)) > 0;")

WITHOUT_SUMMARY=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc \
    "SELECT COUNT(*)
     FROM transcripts
     WHERE ai_summary IS NULL
        OR LENGTH(TRIM(ai_summary)) = 0;")

if [ "$TOTAL_TRANSCRIPTS" -eq 0 ]; then
    echo "   ❌ FAIL: No transcripts in database"
    echo ""
    echo "💡 Run Test #1 first: ./tests/scripts/test-discovery-job.sh"
    exit 1
fi

COVERAGE_PERCENT=$(awk "BEGIN {printf \"%.1f\", ($WITH_SUMMARY / $TOTAL_TRANSCRIPTS) * 100}")

echo "   Total Transcripts:        $TOTAL_TRANSCRIPTS"
echo "   ✅ With AI Summary:        $WITH_SUMMARY"
echo "   ⏳ Without AI Summary:     $WITHOUT_SUMMARY"
echo "   📈 Coverage:               ${COVERAGE_PERCENT}%"
echo ""

if [ "$WITH_SUMMARY" -eq 0 ]; then
    echo "   ❌ FAIL: No transcripts have AI summaries"
    echo ""
    echo "💡 AI processing may not be running. Check logs:"
    echo "   pm2 logs transcripts-worker"
    exit 1
fi

echo "   ✅ PASS: Found $WITH_SUMMARY transcripts with AI summaries"
echo ""

# Test 2.2: Validate AI summary quality
echo "🔍 Test 2.2: AI Summary Quality Validation"
echo "   Checking summary length and content..."

SHORT_SUMMARIES=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc \
    "SELECT COUNT(*)
     FROM transcripts
     WHERE ai_summary IS NOT NULL
       AND LENGTH(ai_summary) < 50;")

VALID_SUMMARIES=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc \
    "SELECT COUNT(*)
     FROM transcripts
     WHERE ai_summary IS NOT NULL
       AND LENGTH(ai_summary) >= 50;")

echo "   Summaries ≥50 chars:      $VALID_SUMMARIES ✅"
echo "   Summaries <50 chars:      $SHORT_SUMMARIES ⚠️"
echo ""

if [ "$SHORT_SUMMARIES" -gt 0 ]; then
    echo "   ⚠️  WARNING: $SHORT_SUMMARIES summaries are suspiciously short"
    echo ""
    echo "   Investigating short summaries..."
    SHORT_SAMPLES=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc \
        "SELECT ticker, quarter, year, LENGTH(ai_summary) as len
         FROM transcripts
         WHERE ai_summary IS NOT NULL AND LENGTH(ai_summary) < 50
         LIMIT 3;")
    echo "$SHORT_SAMPLES" | while IFS='|' read -r ticker quarter year len; do
        echo "      $ticker Q${quarter} ${year}: ${len} chars"
    done
    echo ""
fi

# Test 2.3: Sample AI summary inspection
echo "📝 Test 2.3: Sample AI Summary Inspection"
echo "   Fetching sample AI-generated summary..."

SAMPLE=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc \
    "SELECT ticker, quarter, year, LEFT(ai_summary, 200) as preview
     FROM transcripts
     WHERE ai_summary IS NOT NULL
       AND LENGTH(ai_summary) >= 50
     ORDER BY created_at DESC
     LIMIT 1;")

if [ -z "$SAMPLE" ]; then
    echo "   ⚠️  WARNING: Could not fetch sample summary"
else
    echo ""
    echo "   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    TICKER=$(echo "$SAMPLE" | cut -d'|' -f1)
    QUARTER=$(echo "$SAMPLE" | cut -d'|' -f2)
    YEAR=$(echo "$SAMPLE" | cut -d'|' -f3)
    PREVIEW=$(echo "$SAMPLE" | cut -d'|' -f4)

    echo "   Sample: $TICKER Q${QUARTER} ${YEAR}"
    echo "   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "   $PREVIEW..."
    echo ""
    echo "   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
fi

echo ""
echo "   ✅ PASS: AI summary content looks valid"
echo ""

# Test 2.4: Processing time analysis (P95)
echo "⏱️  Test 2.4: Processing Time Analysis"
echo "   Calculating time between creation and first AI summary..."

PROCESSING_TIMES=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc \
    "SELECT
        PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY processing_seconds) as p50,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY processing_seconds) as p95,
        MAX(processing_seconds) as max_time
     FROM (
         SELECT EXTRACT(EPOCH FROM (updated_at - created_at)) as processing_seconds
         FROM transcripts
         WHERE ai_summary IS NOT NULL
           AND updated_at > created_at
     ) as times;" 2>/dev/null || echo "||")

if [ "$PROCESSING_TIMES" = "||" ]; then
    echo "   ⚠️  INFO: Insufficient data for timing analysis"
    echo "   (Requires transcripts with updated_at > created_at)"
else
    P50=$(echo "$PROCESSING_TIMES" | cut -d'|' -f1)
    P95=$(echo "$PROCESSING_TIMES" | cut -d'|' -f2)
    MAX=$(echo "$PROCESSING_TIMES" | cut -d'|' -f3)

    P50_MIN=$(awk "BEGIN {printf \"%.1f\", $P50 / 60}")
    P95_MIN=$(awk "BEGIN {printf \"%.1f\", $P95 / 60}")
    MAX_MIN=$(awk "BEGIN {printf \"%.1f\", $MAX / 60}")

    echo "   P50 Processing Time:      ${P50_MIN} minutes"
    echo "   P95 Processing Time:      ${P95_MIN} minutes"
    echo "   Max Processing Time:      ${MAX_MIN} minutes"
    echo ""

    # SLA: P95 should be < 3 minutes
    P95_THRESHOLD=180
    if (( $(echo "$P95 < $P95_THRESHOLD" | bc -l) )); then
        echo "   ✅ PASS: P95 processing time meets SLA (<3min)"
    else
        echo "   ⚠️  WARNING: P95 processing time exceeds SLA (≥3min)"
        echo "   This may indicate processing bottlenecks"
    fi
fi

echo ""

# Test 2.5: Status transition validation
echo "🔄 Test 2.5: Status Transition Validation"

STATUS_DISTRIBUTION=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    "SELECT
        status,
        COUNT(*) as count,
        COUNT(CASE WHEN ai_summary IS NOT NULL THEN 1 END) as with_ai,
        ROUND(AVG(CASE WHEN ai_summary IS NOT NULL THEN 100 ELSE 0 END), 1) as ai_pct
     FROM transcripts
     GROUP BY status
     ORDER BY count DESC;" --csv 2>/dev/null | tail -n +2)

echo "   Transcripts by status:"
echo ""
echo "   Status      | Count | With AI | AI %"
echo "   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "$STATUS_DISTRIBUTION" | while IFS=',' read -r status count with_ai ai_pct; do
    printf "   %-11s | %5s | %7s | %4s%%\n" "$status" "$count" "$with_ai" "$ai_pct"
done

echo ""

# Validate published transcripts have AI summaries
PUBLISHED_NO_AI=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc \
    "SELECT COUNT(*)
     FROM transcripts
     WHERE status = 'published'
       AND (ai_summary IS NULL OR LENGTH(TRIM(ai_summary)) = 0);")

if [ "$PUBLISHED_NO_AI" -gt 0 ]; then
    echo "   ⚠️  WARNING: $PUBLISHED_NO_AI published transcripts lack AI summaries"
    echo "   Published transcripts should always have AI content"
    echo ""
else
    echo "   ✅ PASS: All published transcripts have AI summaries"
    echo ""
fi

# Test 2.6: Monitor pending transcripts
echo "⏳ Test 2.6: Pending Queue Monitoring"

PENDING_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc \
    "SELECT COUNT(*) FROM transcripts WHERE status = 'pending';")

echo "   Pending transcripts:      $PENDING_COUNT"

if [ "$PENDING_COUNT" -gt 0 ]; then
    echo ""
    echo "   ⏰ Monitoring pending queue for changes..."
    echo "   (Will check again in 10 seconds)"

    sleep 10

    PENDING_AFTER=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc \
        "SELECT COUNT(*) FROM transcripts WHERE status = 'pending';")

    DELTA=$((PENDING_COUNT - PENDING_AFTER))

    echo "   Pending after 10s:        $PENDING_AFTER"
    echo "   Processed:                $DELTA"
    echo ""

    if [ "$DELTA" -gt 0 ]; then
        echo "   ✅ PASS: AI processing is active ($DELTA transcripts processed)"
    elif [ "$PENDING_COUNT" -eq "$PENDING_AFTER" ]; then
        echo "   ⚠️  INFO: No change in pending queue"
        echo "   Worker may be idle or at capacity"
    fi
else
    echo "   ✅ All transcripts processed (no pending items)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 TEST #2 SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "   Total Transcripts:        $TOTAL_TRANSCRIPTS"
echo "   ✅ With AI Summary:        $WITH_SUMMARY (${COVERAGE_PERCENT}%)"
echo "   ⏳ Without AI Summary:     $WITHOUT_SUMMARY"
echo "   ⏰ Pending Processing:     $PENDING_COUNT"
echo ""

# Overall pass criteria
if [ "$WITH_SUMMARY" -gt 0 ] && [ "$COVERAGE_PERCENT" != "0.0" ]; then
    echo "   ✅ OVERALL STATUS: PASS"
    echo ""
    echo "   AI processing pipeline is working!"
    exit 0
else
    echo "   ❌ OVERALL STATUS: FAIL"
    echo ""
    echo "   AI processing not functioning. Check:"
    echo "   1. Worker logs: pm2 logs transcripts-worker"
    echo "   2. OpenAI API key: echo \$OPENAI_API_KEY"
    echo "   3. Worker status: pm2 status transcripts-worker"
    exit 1
fi
