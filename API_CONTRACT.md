# Alfalyzer API Contract Documentation

## Overview

This document defines the working API contract between the Alfalyzer frontend and backend as verified on 2025-07-23.

### Endpoints

- **Frontend**: https://alfalyzerpro4.vercel.app
- **Backend**: https://crucial-ivonne-alfalyzer-90666a9e.coolify.app
- **Proxy**: Vercel automatically proxies `/api/*` requests to the backend

### Authentication

- **NOT REQUIRED** for market data endpoints
- Backend accepts requests without authentication tokens
- Frontend may send auth tokens for future features, but they're not validated for market data

### CORS Configuration

The backend properly supports CORS with:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization, X-Auth-Token, X-Requested-With, Accept`
- `Access-Control-Allow-Credentials: true`

## Working Endpoints

### 1. Health Check

**Endpoint**: `GET /api/market-data/health`

**Response**:
```json
{
  "status": "healthy",
  "hasRealData": true,
  "cacheSize": 0,
  "providers": {
    "alphaVantage": true,
    "finnhub": true,
    "fmp": true,
    "fiscalAI": true
  },
  "rateLimit": {
    "type": "per-ip",
    "callsPerMinute": 10,
    "minIntervalMs": 1000,
    "currentIp": "78.137.205.18",
    "currentIpUsage": 0,
    "windowResetTime": null
  },
  "cache": {
    "enabled": true,
    "durationMs": 60000,
    "currentSize": 0
  }
}
```

### 2. Batch Quotes

**Endpoint**: `POST /api/market-data/quotes/batch`

**Request Body**:
```json
{
  "symbols": ["AAPL", "MSFT", "GOOGL"]
}
```

**Response**:
```json
{
  "quotes": [
    {
      "symbol": "AAPL",
      "price": 214.4,
      "change": 1.92,
      "changePercent": 0.9036,
      "high": 214.95,
      "low": 212.2301,
      "open": 213.14,
      "previousClose": 212.48,
      "volume": 46404072,
      "provider": "alpha_vantage",
      "timestamp": 1753290922.643,
      "_cached": false,
      "_timestamp": 1753290922.643
    }
  ],
  "errors": {},
  "timestamp": 1753290922846,
  "_timestamp": 1753290922.846,
  "provider": "alpha_vantage"
}
```

### 3. Search (NOT IMPLEMENTED)

**Endpoint**: `GET /api/market-data/search?q=QUERY`

**Status**: Returns 404 - This endpoint is not implemented in the backend yet.

## Request/Response Formats

### Common Headers

All requests should include:
```
Content-Type: application/json
```

### Error Responses

Error responses follow this format:
```json
{
  "error": "Error message",
  "message": "Detailed error description",
  "statusCode": 400
}
```

## Rate Limiting

- Type: Per-IP rate limiting
- Limit: 10 calls per minute
- Min interval: 1000ms between requests
- No 429 responses observed during testing

## Performance Metrics

Based on testing (2025-07-23):
- Health endpoint: ~400-600ms response time
- Batch quotes (1 symbol): ~1.5-2.5s response time
- Batch quotes (3 symbols): ~2-3s response time

## Frontend Implementation Notes

The frontend (`market-data-client.ts`) implements:
1. Automatic fallback to mock data when backend is unavailable
2. Retry logic with exponential backoff
3. Proper error handling with user-friendly messages
4. Support for both cached and direct API endpoints
5. Vercel proxy header injection when deployed

## Testing

### Manual Testing with cURL

```bash
# Health check
curl https://alfalyzerpro4.vercel.app/api/market-data/health

# Batch quotes
curl -X POST https://alfalyzerpro4.vercel.app/api/market-data/quotes/batch \
  -H "Content-Type: application/json" \
  -d '{"symbols": ["AAPL", "MSFT"]}'
```

### Automated Testing

Use the provided test scripts:
- `test-api-connectivity.sh` - Bash script for command-line testing
- `test-api-integration.js` - JavaScript test suite for browser or Node.js

## Known Issues

1. Search endpoint returns 404 (not implemented)
2. Response times are slow (1-3 seconds) due to real-time API calls
3. No WebSocket support for real-time updates yet
4. Market overview endpoint status unknown (not tested)

## Recommendations

1. Implement the search endpoint in the backend
2. Add caching layer to improve response times
3. Implement WebSocket support for real-time price updates
4. Add request/response logging for debugging
5. Consider implementing API key rotation to avoid rate limits
6. Add health check monitoring to detect backend issues early

## Data Providers

The backend successfully integrates with:
- **Alpha Vantage**: Primary provider for stock quotes
- **Finnhub**: Backup provider
- **FMP (Financial Modeling Prep)**: Additional backup
- **Fiscal AI**: Alternative data source

All providers are reported as active in the health check.