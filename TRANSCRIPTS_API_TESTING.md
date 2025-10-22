# Transcripts API Routes - Testing Guide

**Implementation:** Onda 3 - Task #5 (Fase 4)
**Date:** 2025-10-07
**File:** `/server/routes/transcripts.ts`

## Overview

Three new API endpoints for transcript retrieval:
1. **Latest Transcript** - Get most recent transcript for a symbol
2. **Historical Transcripts** - Get last 5 years (up to 20 transcripts)
3. **Full Transcript** - Get complete transcript with raw content

## Architecture

### Cache Strategy
```
┌─────────────────────────────────────────┐
│  GET /api/transcripts/symbol/AAPL       │
│  (latest)                               │
└───────────┬─────────────────────────────┘
            │
            ▼
    ┌──────────────┐
    │ Redis Cache  │ ← 7 days TTL
    │ ~10KB/symbol │ ← Metadata only
    └──────┬───────┘
           │ miss
           ▼
    ┌──────────────┐
    │ PostgreSQL   │
    │ Latest query │
    └──────────────┘

┌─────────────────────────────────────────┐
│  GET /api/transcripts/symbol/AAPL       │
│  ?history=true                          │
└───────────┬─────────────────────────────┘
            │
            ▼ (no cache)
    ┌──────────────┐
    │ PostgreSQL   │
    │ Direct query │
    │ Last 5 years │
    └──────────────┘
```

### Memory Impact
- **Redis:** 9MB for 914 symbols (3.5% of 256MB)
- **History queries:** Zero Redis footprint
- **Full transcript:** No caching (large payloads)

## API Endpoints

### 1. Latest Transcript

**Endpoint:** `GET /api/transcripts/symbol/:symbol`

**Description:** Get the most recent published transcript for a symbol

**Cache Strategy:** Redis (7 days) → PostgreSQL

**Example Request:**
```bash
# Development
curl -i 'http://localhost:3001/api/transcripts/symbol/AAPL'

# Production
curl -i 'https://128.140.45.28.sslip.io/api/transcripts/symbol/AAPL'
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1234,
    "ticker": "AAPL",
    "company_name": "Apple Inc.",
    "quarter": "Q4",
    "year": 2024,
    "call_date": "2025-01-30",
    "ai_summary": {
      "summary": "Strong revenue growth driven by iPhone 15...",
      "keyInsights": [
        "Revenue up 8% YoY to $119.6B",
        "Services segment grew 16%"
      ],
      "processedAt": "2025-10-07T10:30:00.000Z"
    },
    "published_at": "2025-10-07T09:00:00.000Z",
    "view_count": 142,
    "company_name": "Apple Inc."
  },
  "symbol": "AAPL",
  "timestamp": "2025-10-07T12:34:56.789Z"
}
```

**Error Responses:**

```bash
# 400 Bad Request - Invalid symbol format
curl -i 'http://localhost:3001/api/transcripts/symbol/invalid-symbol-123'

{
  "success": false,
  "error": "INVALID_SYMBOL",
  "message": "Invalid symbol format",
  "timestamp": "2025-10-07T12:34:56.789Z"
}

# 404 Not Found - No transcript available
curl -i 'http://localhost:3001/api/transcripts/symbol/XYZ999'

{
  "success": false,
  "error": "NO_TRANSCRIPT_FOUND",
  "message": "No published transcript found for XYZ999",
  "symbol": "XYZ999",
  "timestamp": "2025-10-07T12:34:56.789Z"
}
```

---

### 2. Historical Transcripts

**Endpoint:** `GET /api/transcripts/symbol/:symbol?history=true`

**Description:** Get last 5 years of transcripts (up to 20)

**Cache Strategy:** Direct PostgreSQL query (no Redis cache)

**Example Request:**
```bash
# Development
curl -i 'http://localhost:3001/api/transcripts/symbol/AAPL?history=true'

# Production
curl -i 'https://128.140.45.28.sslip.io/api/transcripts/symbol/AAPL?history=true'
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1234,
      "ticker": "AAPL",
      "company_name": "Apple Inc.",
      "quarter": "Q4",
      "year": 2024,
      "call_date": "2025-01-30",
      "ai_summary": {...},
      "published_at": "2025-10-07T09:00:00.000Z",
      "view_count": 142
    },
    {
      "id": 1233,
      "ticker": "AAPL",
      "company_name": "Apple Inc.",
      "quarter": "Q3",
      "year": 2024,
      "call_date": "2024-10-31",
      "ai_summary": {...},
      "published_at": "2024-11-01T09:00:00.000Z",
      "view_count": 89
    }
    // ... up to 20 transcripts
  ],
  "count": 20,
  "symbol": "AAPL",
  "period": "last_5_years",
  "timestamp": "2025-10-07T12:34:56.789Z"
}
```

**Error Responses:**

```bash
# 404 Not Found - No historical transcripts
curl -i 'http://localhost:3001/api/transcripts/symbol/NEWCO?history=true'

{
  "success": false,
  "error": "NO_TRANSCRIPTS_FOUND",
  "message": "No historical transcripts found for NEWCO",
  "symbol": "NEWCO",
  "timestamp": "2025-10-07T12:34:56.789Z"
}
```

---

### 3. Full Transcript (with Raw Content)

**Endpoint:** `GET /api/transcripts/symbol/:symbol/full`

**Query Parameters:**
- `quarter` (required): Q1, Q2, Q3, or Q4
- `year` (required): 2020-2025

**Description:** Get complete transcript including raw content (large payload)

**Cache Strategy:** No caching (content too large)

**Example Request:**
```bash
# Development
curl -i 'http://localhost:3001/api/transcripts/symbol/AAPL/full?quarter=Q4&year=2024'

# Production
curl -i 'https://128.140.45.28.sslip.io/api/transcripts/symbol/AAPL/full?quarter=Q4&year=2024'
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1234,
    "ticker": "AAPL",
    "company_name": "Apple Inc.",
    "quarter": "Q4",
    "year": 2024,
    "call_date": "2025-01-30",
    "raw_transcript": "OPERATOR: Good day, and welcome to the Apple Q4 2024 Earnings Conference Call...",
    "ai_summary": {...},
    "published_at": "2025-10-07T09:00:00.000Z",
    "view_count": 142,
    "status": "published",
    "created_at": "2025-10-07T08:00:00.000Z",
    "metadata": {...}
  },
  "symbol": "AAPL",
  "quarter": "Q4",
  "year": 2024,
  "timestamp": "2025-10-07T12:34:56.789Z"
}
```

**Error Responses:**

```bash
# 400 Bad Request - Missing parameters
curl -i 'http://localhost:3001/api/transcripts/symbol/AAPL/full'

{
  "success": false,
  "error": "INVALID_PARAMETERS",
  "message": "Quarter must be Q1, Q2, Q3, or Q4",
  "timestamp": "2025-10-07T12:34:56.789Z"
}

# 400 Bad Request - Invalid quarter
curl -i 'http://localhost:3001/api/transcripts/symbol/AAPL/full?quarter=Q5&year=2024'

{
  "success": false,
  "error": "INVALID_PARAMETERS",
  "message": "Quarter must be Q1, Q2, Q3, or Q4",
  "timestamp": "2025-10-07T12:34:56.789Z"
}

# 404 Not Found - Transcript doesn't exist
curl -i 'http://localhost:3001/api/transcripts/symbol/AAPL/full?quarter=Q1&year=2020'

{
  "success": false,
  "error": "TRANSCRIPT_NOT_FOUND",
  "message": "No transcript found for AAPL Q1 2020",
  "symbol": "AAPL",
  "quarter": "Q1",
  "year": 2020,
  "timestamp": "2025-10-07T12:34:56.789Z"
}
```

---

### 4. Cache Statistics (Bonus Endpoint)

**Endpoint:** `GET /api/transcripts/cache/stats`

**Description:** Get Redis cache statistics for monitoring

**Example Request:**
```bash
# Development
curl -i 'http://localhost:3001/api/transcripts/cache/stats'

# Production
curl -i 'https://128.140.45.28.sslip.io/api/transcripts/cache/stats'
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "redisKeys": 914,
    "memoryUsage": "9.12MB",
    "ttl": "7 days"
  },
  "timestamp": "2025-10-07T12:34:56.789Z"
}
```

---

## Testing Checklist

### Latest Transcript Endpoint

```bash
# ✅ Valid request - returns latest transcript
curl -i 'http://localhost:3001/api/transcripts/symbol/AAPL'

# ✅ Valid request - with hyphenated symbol
curl -i 'http://localhost:3001/api/transcripts/symbol/BRK-B'

# ❌ Invalid symbol format (should return 400)
curl -i 'http://localhost:3001/api/transcripts/symbol/invalid-symbol-123'

# ❌ Symbol doesn't exist (should return 404)
curl -i 'http://localhost:3001/api/transcripts/symbol/NOTFOUND'

# ✅ Lowercase symbol (should auto-uppercase)
curl -i 'http://localhost:3001/api/transcripts/symbol/aapl'
```

### Historical Transcripts Endpoint

```bash
# ✅ Valid history request - returns array
curl -i 'http://localhost:3001/api/transcripts/symbol/AAPL?history=true'

# ✅ Valid history request - popular symbol
curl -i 'http://localhost:3001/api/transcripts/symbol/GOOGL?history=true'

# ❌ No historical data available (should return 404)
curl -i 'http://localhost:3001/api/transcripts/symbol/NEWCO?history=true'

# ✅ History flag with different cases
curl -i 'http://localhost:3001/api/transcripts/symbol/MSFT?history=TRUE'
curl -i 'http://localhost:3001/api/transcripts/symbol/MSFT?history=True'
```

### Full Transcript Endpoint

```bash
# ✅ Valid full transcript request
curl -i 'http://localhost:3001/api/transcripts/symbol/AAPL/full?quarter=Q4&year=2024'

# ✅ Different quarters
curl -i 'http://localhost:3001/api/transcripts/symbol/AAPL/full?quarter=Q3&year=2024'
curl -i 'http://localhost:3001/api/transcripts/symbol/AAPL/full?quarter=Q2&year=2024'
curl -i 'http://localhost:3001/api/transcripts/symbol/AAPL/full?quarter=Q1&year=2024'

# ❌ Missing parameters (should return 400)
curl -i 'http://localhost:3001/api/transcripts/symbol/AAPL/full'
curl -i 'http://localhost:3001/api/transcripts/symbol/AAPL/full?quarter=Q4'
curl -i 'http://localhost:3001/api/transcripts/symbol/AAPL/full?year=2024'

# ❌ Invalid quarter (should return 400)
curl -i 'http://localhost:3001/api/transcripts/symbol/AAPL/full?quarter=Q5&year=2024'
curl -i 'http://localhost:3001/api/transcripts/symbol/AAPL/full?quarter=INVALID&year=2024'

# ❌ Invalid year (should return 400)
curl -i 'http://localhost:3001/api/transcripts/symbol/AAPL/full?quarter=Q4&year=2019'
curl -i 'http://localhost:3001/api/transcripts/symbol/AAPL/full?quarter=Q4&year=2030'

# ❌ Transcript doesn't exist (should return 404)
curl -i 'http://localhost:3001/api/transcripts/symbol/AAPL/full?quarter=Q1&year=2020'

# ✅ Lowercase quarter (should auto-uppercase)
curl -i 'http://localhost:3001/api/transcripts/symbol/AAPL/full?quarter=q4&year=2024'
```

### Cache Statistics Endpoint

```bash
# ✅ Get cache stats
curl -i 'http://localhost:3001/api/transcripts/cache/stats'
```

---

## Performance Expectations

### Latest Transcript (Cached)
- **Cold start:** ~200ms (PostgreSQL query + cache write)
- **Warm cache:** <50ms (Redis hit)
- **Memory:** ~10KB per symbol

### Historical Transcripts
- **Query time:** 200-300ms (PostgreSQL direct)
- **Memory:** Zero Redis impact
- **Results:** Up to 20 transcripts (last 5 years)

### Full Transcript
- **Query time:** 300-500ms (PostgreSQL with large content)
- **Memory:** Zero Redis cache (too large)
- **Payload size:** 50-200KB typical

---

## Integration Examples

### Frontend Usage (React/TypeScript)

```typescript
// Latest transcript
const getLatestTranscript = async (symbol: string) => {
  const response = await fetch(`/api/transcripts/symbol/${symbol}`);
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message);
  }

  return data.data;
};

// Historical transcripts
const getHistoricalTranscripts = async (symbol: string) => {
  const response = await fetch(`/api/transcripts/symbol/${symbol}?history=true`);
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message);
  }

  return data.data; // Array of transcripts
};

// Full transcript
const getFullTranscript = async (
  symbol: string,
  quarter: string,
  year: number
) => {
  const response = await fetch(
    `/api/transcripts/symbol/${symbol}/full?quarter=${quarter}&year=${year}`
  );
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message);
  }

  return data.data;
};
```

---

## Monitoring & Debugging

### Check Cache Hit Rate
```bash
# Get cache statistics
curl 'http://localhost:3001/api/transcripts/cache/stats'

# Expected output:
# - redisKeys: Number of cached symbols
# - memoryUsage: Total Redis memory used (~9MB for 914 symbols)
# - ttl: Cache expiration (7 days)
```

### Verify Cache Population
```bash
# Request same symbol multiple times
curl 'http://localhost:3001/api/transcripts/symbol/AAPL'  # Cache miss (~200ms)
curl 'http://localhost:3001/api/transcripts/symbol/AAPL'  # Cache hit (<50ms)
curl 'http://localhost:3001/api/transcripts/symbol/AAPL'  # Cache hit (<50ms)

# Check server logs for cache hit/miss messages:
# ✅ Transcript cache hit for AAPL
# 📡 Transcript cache miss for AAPL, fetching from PostgreSQL
```

### Database Queries
```bash
# Verify PostgreSQL connection
ssh root@128.140.45.28
cd '/home/teste 1'
node scripts/monitoring/check-pg.mjs

# Check transcripts table
PGHOST=127.0.0.1 PGPORT=5432 PGUSER=alfalyzer PGPASSWORD=*** PGDATABASE=alfalyzer_db \
  psql -c "SELECT ticker, quarter, year, status FROM transcripts WHERE ticker = 'AAPL' ORDER BY year DESC, quarter DESC LIMIT 5;"
```

---

## Error Handling Summary

| Status Code | Error Code | Description |
|-------------|-----------|-------------|
| 200 | - | Success |
| 400 | INVALID_SYMBOL | Symbol format validation failed |
| 400 | INVALID_PARAMETERS | Missing or invalid query parameters |
| 404 | NO_TRANSCRIPT_FOUND | No latest transcript available |
| 404 | NO_TRANSCRIPTS_FOUND | No historical transcripts available |
| 404 | TRANSCRIPT_NOT_FOUND | Specific transcript doesn't exist |
| 500 | TRANSCRIPT_FETCH_ERROR | Database or cache error |
| 500 | CACHE_STATS_ERROR | Failed to retrieve cache statistics |

---

## Next Steps

1. **Frontend Integration**: Update stock detail pages to use new endpoints
2. **Performance Testing**: Verify <50ms latency for cached requests
3. **Monitoring**: Add Prometheus metrics for cache hit rates
4. **Documentation**: Update API docs with new endpoints

---

## Implementation Files

- **Routes:** `/server/routes/transcripts.ts` (lines 328-570)
- **Cache Service:** `/server/services/transcript-cache-service.ts`
- **PostgreSQL Repo:** `/server/repositories/transcripts-pg.ts`
- **Tests:** This document (curl commands)

---

**Status:** ✅ READY FOR TESTING
**Author:** Backend Architect (Claude)
**Date:** 2025-10-07
