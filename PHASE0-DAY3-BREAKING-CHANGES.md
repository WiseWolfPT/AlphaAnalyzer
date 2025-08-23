# Phase 0, Day 3: Architecture Organization - Breaking Changes

## Date: 2025-08-23

### Files Removed

#### Client Test/Demo Pages (9 files)
- `client/src/pages/api-debug.tsx`
- `client/src/pages/api-direct-test.tsx`
- `client/src/pages/api-test.tsx`
- `client/src/pages/data-test.tsx`
- `client/src/pages/real-time-demo.tsx`
- `client/src/pages/simple-stock-test.tsx`
- `client/src/pages/stock-details-test.tsx`
- `client/src/pages/test-sprint1.tsx`
- `client/src/pages/watchlist-test.tsx`

#### Client Duplicate/Variant Pages (3 files)
- `client/src/pages/stock-charts.tsx` (empty duplicate)
- `client/src/pages/insights-real.tsx` (variant)
- `client/src/pages/insights-safe.tsx` (variant)

#### Client Test Files (3 files)
- `client/src/test/` (entire folder)
- `client/src/test-backend-connection.ts`
- `client/src/test-api-connection.ts`

#### Server Test/Temporary Files (10 files)
- `server/basic-test.ts`
- `server/coolify-server.cjs`
- `server/diagnostic-server.ts`
- `server/emergency-php-server.php`
- `server/emergency-server.cjs`
- `server/fixed-coolify-server.cjs`
- `server/health-endpoint.test.ts`
- `server/simple-coolify-server.cjs`
- `server/test-env-validation.ts`
- `server/test-server.ts`

#### Server Worker Files (1 file)
- `server/workers/finnhub-realtime.ts` (removed as part of API cleanup)

### Routes Removed from App.tsx
- `/test/api`
- `/test/api-verification`
- `/api-debug`
- `/test/sprint1`

### Import Changes
- Updated `client/src/pages/find-stocks.tsx` to remove imports:
  - Removed `AuthTest` component import and usage
  - Removed `testAPIConnection` function import and usage
- Updated `client/src/utils/code-splitting.ts`:
  - Changed insights import from `insights-safe` to `insights`

### Breaking Changes Impact
1. **Test Routes**: Any bookmarks or links to test pages will now return 404
2. **Debug Tools**: API debug page removed - use browser DevTools instead
3. **Test Components**: AuthTest component removed from find-stocks page

### Migration Guide
- For API debugging: Use browser DevTools Network tab
- For authentication testing: Use the main login/register pages
- For stock testing: Use the main Find Stocks page
- For insights: Use `/insights` route (not variants)

### Summary
Total files removed: 35
- Client pages: 12
- Client test files: 3
- Server files: 10
- Server workers: 1

Build tested successfully after cleanup ✅