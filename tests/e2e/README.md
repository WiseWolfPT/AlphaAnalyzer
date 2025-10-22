# E2E Test Suite - Transcripts Feature

## Quick Start

### Run All Tests (Full Validation)

```bash
# 1. Start dev server (in separate terminal)
npm run dev

# 2. Run complete test suite
./tests/scripts/run-all-tests.sh
```

**Expected Output:**
```
✅ Test #1: Discovery Job - PASSED
✅ Test #2: AI Processing - PASSED
✅ Test #3: API Endpoints - PASSED
✅ Test #4: UI Toggle - PASSED

Success Rate: 100%
```

---

## Individual Tests

### Test #1: Discovery Job (Backend)

**Purpose:** Validates transcripts worker discovers and stores transcripts in PostgreSQL

```bash
./tests/scripts/test-discovery-job.sh
```

**Checks:**
- ✅ Database connectivity
- ✅ Transcripts table schema
- ✅ Total transcript count
- ✅ Published transcripts exist
- ✅ Data structure validity

**No Prerequisites:** Database only (no server required)

---

### Test #2: AI Processing (Queue)

**Purpose:** Validates AI summary generation and status transitions

```bash
./tests/scripts/test-ai-processing.sh
```

**Checks:**
- ✅ AI summary coverage (target: >80%)
- ✅ Summary quality (≥50 chars)
- ✅ Status transitions (pending → reviewed → published)
- ✅ Processing queue monitoring

**No Prerequisites:** Database only (no server required)

---

### Test #3: API Endpoints (Integration)

**Purpose:** Validates all transcript API endpoints return correct data

```bash
# 1. Start server first
npm run dev

# 2. Run API tests
./tests/scripts/test-api-endpoints.sh
```

**Checks:**
- ✅ Health endpoint responding
- ✅ Recent transcripts list
- ✅ Latest transcript by symbol
- ✅ Transcript history
- ✅ Invalid symbol handling
- ✅ Search functionality
- ✅ Transcript detail by ID
- ✅ Cache statistics

**Prerequisites:** Dev server running on port 3001

---

### Test #4: UI Toggle (Playwright E2E)

**Purpose:** End-to-end validation of Transcripts UI in stock detail page

```bash
# 1. Start server first
npm run dev

# 2. Run Playwright tests
npx playwright test tests/e2e/transcripts-onda3.spec.ts
```

**Checks:**
- ✅ Tab navigation
- ✅ Latest transcript display
- ✅ Historical accordion toggle
- ✅ Skeleton loaders
- ✅ Mobile tap targets (≥44px)
- ✅ Zero console errors

**Prerequisites:** Dev server running + Playwright installed

---

## Test Results

See detailed results in: `/tests/e2e/transcripts.spec.md`

**Latest Run (2025-10-06):**
- Backend Tests: ✅ 2/2 PASSED
- API Tests: ⚠️ Pending (server not running)
- UI Tests: ⚠️ Pending (server not running)

---

## TDD Architecture

### Test Pyramid

```
      /\      E2E (Playwright)
     /  \     UI behavior, user flows
    /____\
   /      \   Integration (API)
  /________\  Endpoint contracts, data validation
 /          \
/____________\ Unit (Backend)
                Discovery, AI processing, DB queries
```

### AAA Pattern

Each test follows:

1. **Arrange:** Set up test data and environment
2. **Act:** Execute the operation
3. **Assert:** Verify expected outcomes

### Example

```typescript
test('should fetch latest transcript for symbol', async ({ page }) => {
  // ARRANGE: Prepare test symbol
  const symbol = 'AAPL';

  // ACT: Fetch latest transcript
  const response = await page.request.get(
    `${API_URL}/api/transcripts/symbol/${symbol}`
  );

  // ASSERT: Verify response
  expect(response.ok()).toBe(true);
  const body = await response.json();
  expect(body.data.ticker).toBe(symbol);
});
```

---

## Environment Setup

### Database (Required for Tests #1-2)

```bash
# Set PostgreSQL credentials
export PGHOST=127.0.0.1
export PGPORT=5432
export PGUSER=alfalyzer
export PGPASSWORD=changeme
export PGDATABASE=alfalyzer_db
```

### Dev Server (Required for Tests #3-4)

```bash
# Start both frontend and backend
npm run dev

# Verify server is running
curl http://localhost:3001/api/health
```

### Playwright (Required for Test #4)

```bash
# Install Playwright browsers
npx playwright install

# Run in headed mode (for debugging)
npx playwright test --headed tests/e2e/transcripts-onda3.spec.ts
```

---

## Troubleshooting

### Test #1 Fails: "Cannot connect to database"

```bash
# Check PostgreSQL is running
systemctl status postgresql  # Linux
brew services list           # macOS

# Verify credentials
psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -c "SELECT 1;"
```

### Test #3 Fails: "API is not responding"

```bash
# Check if server is running
lsof -i :3001

# Start dev server
npm run dev

# Wait for startup message
# "Server running on http://localhost:3001"
```

### Test #4 Fails: "Transcripts tab not found"

This is expected if the UI component is not yet integrated. Check:

```bash
# Verify TranscriptSection is imported
grep -n "TranscriptSection" client/src/pages/stock-detail.tsx

# Should show:
# 39: import { TranscriptSection } from "@/components/transcripts/transcript-section";
# 502: <TranscriptSection symbol={symbol} />
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_DB: alfalyzer_db
          POSTGRES_USER: alfalyzer
          POSTGRES_PASSWORD: changeme
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install

      - name: Run backend tests
        run: |
          ./tests/scripts/test-discovery-job.sh
          ./tests/scripts/test-ai-processing.sh

      - name: Start dev server
        run: npm run dev &

      - name: Wait for server
        run: npx wait-on http://localhost:3001/api/health

      - name: Run API tests
        run: ./tests/scripts/test-api-endpoints.sh

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npx playwright test tests/e2e/transcripts-onda3.spec.ts

      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-results
          path: tests/e2e/transcripts.spec.md
```

---

## Contributing

### Adding New Tests

1. **Create test file:** `tests/e2e/feature-name.spec.ts`
2. **Follow AAA pattern:** Arrange-Act-Assert
3. **Use descriptive names:** `test('should do something specific', ...)`
4. **Add to master runner:** Update `run-all-tests.sh`
5. **Document results:** Update test report

### Test Naming Convention

```typescript
// ✅ GOOD: Descriptive, behavior-focused
test('should display AI summary when transcript has content', ...)

// ❌ BAD: Implementation-focused, vague
test('test AI summary', ...)
```

### Code Review Checklist

- [ ] Tests follow AAA pattern
- [ ] Test names describe behavior (not implementation)
- [ ] Each test has single, clear purpose
- [ ] Tests are independent (can run in any order)
- [ ] Assertions are specific (not generic `toBeTrue()`)
- [ ] Error messages are helpful for debugging

---

## Resources

- **Test Report:** `/tests/e2e/transcripts.spec.md`
- **Test Scripts:** `/tests/scripts/`
- **Playwright Config:** `playwright.config.ts`
- **TDD Guide:** https://martinfowler.com/bliki/TestDrivenDevelopment.html

---

**Last Updated:** 2025-10-06
**Test Coverage:** Backend 100%, API/UI pending server startup
**Framework:** Playwright + Bash Scripts
