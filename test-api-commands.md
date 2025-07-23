# API Testing Commands for Alfalyzer

## Quick Test Commands

### 1. Health Check
```bash
# Direct to backend
curl https://crucial-ivonne-alfalyzer-90666a9e.koyeb.app/api/market-data/health | jq

# Through Vercel proxy (production)
curl https://alfalyzerpro4.vercel.app/api/market-data/health | jq
```

### 2. Get Stock Quotes
```bash
# Single stock
curl -X POST https://alfalyzerpro4.vercel.app/api/market-data/quotes/batch \
  -H "Content-Type: application/json" \
  -d '{"symbols": ["AAPL"]}' | jq

# Multiple stocks
curl -X POST https://alfalyzerpro4.vercel.app/api/market-data/quotes/batch \
  -H "Content-Type: application/json" \
  -d '{"symbols": ["AAPL", "MSFT", "GOOGL", "AMZN", "META"]}' | jq

# Format for easy reading
curl -s -X POST https://alfalyzerpro4.vercel.app/api/market-data/quotes/batch \
  -H "Content-Type: application/json" \
  -d '{"symbols": ["AAPL", "MSFT"]}' | \
  jq '.quotes[] | {symbol, price, change, changePercent, provider}'
```

### 3. Test CORS Headers
```bash
curl -I https://alfalyzerpro4.vercel.app/api/market-data/health | grep -i access-control
```

### 4. Test with Authentication (not required but accepted)
```bash
curl -X POST https://alfalyzerpro4.vercel.app/api/market-data/quotes/batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dummy-token" \
  -d '{"symbols": ["AAPL"]}' | jq
```

### 5. Test Error Handling
```bash
# Empty symbols array
curl -X POST https://alfalyzerpro4.vercel.app/api/market-data/quotes/batch \
  -H "Content-Type: application/json" \
  -d '{"symbols": []}' | jq

# Invalid symbol
curl -X POST https://alfalyzerpro4.vercel.app/api/market-data/quotes/batch \
  -H "Content-Type: application/json" \
  -d '{"symbols": ["INVALID_SYMBOL_XXX"]}' | jq

# Missing body
curl -X POST https://alfalyzerpro4.vercel.app/api/market-data/quotes/batch \
  -H "Content-Type: application/json" | jq
```

### 6. Performance Test
```bash
# Time a request
time curl -s -X POST https://alfalyzerpro4.vercel.app/api/market-data/quotes/batch \
  -H "Content-Type: application/json" \
  -d '{"symbols": ["AAPL"]}' > /dev/null

# Multiple requests with timing
for i in {1..5}; do
  echo "Request $i:"
  time curl -s -X POST https://alfalyzerpro4.vercel.app/api/market-data/quotes/batch \
    -H "Content-Type: application/json" \
    -d '{"symbols": ["AAPL"]}' > /dev/null
  sleep 1
done
```

### 7. Watch Live Prices
```bash
# Update every 10 seconds
watch -n 10 'curl -s -X POST https://alfalyzerpro4.vercel.app/api/market-data/quotes/batch \
  -H "Content-Type: application/json" \
  -d "{\"symbols\": [\"AAPL\", \"MSFT\"]}" | \
  jq -r ".quotes[] | \"\(.symbol): $\(.price) (\(.change > 0 ? \"+\" : \"\")\(.change) / \(.changePercent)%)\""'
```

## Browser Console Commands

Open browser console at https://alfalyzerpro4.vercel.app and run:

```javascript
// Test health endpoint
fetch('/api/market-data/health')
  .then(r => r.json())
  .then(console.log)

// Test quotes
fetch('/api/market-data/quotes/batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ symbols: ['AAPL', 'MSFT'] })
})
  .then(r => r.json())
  .then(data => {
    console.table(data.quotes.map(q => ({
      Symbol: q.symbol,
      Price: q.price,
      Change: q.change,
      'Change %': q.changePercent,
      Provider: q.provider
    })))
  })
```

## HTTPie Commands (if installed)

```bash
# Health check
http GET https://alfalyzerpro4.vercel.app/api/market-data/health

# Get quotes
http POST https://alfalyzerpro4.vercel.app/api/market-data/quotes/batch \
  symbols:='["AAPL", "MSFT"]'
```

## Using the Test Scripts

```bash
# Run shell script tests
./test-api-connectivity.sh

# Run Node.js tests
node test-api-integration.js

# Open browser test dashboard
open test-api-browser.html
```

## Expected Response Times

- Health endpoint: 400-600ms
- Single quote: 1.5-2.5s
- Multiple quotes (5 stocks): 2-3s

Note: Response times are slower because the backend fetches real-time data from external APIs.