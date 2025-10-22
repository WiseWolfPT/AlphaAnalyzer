# FASE 3 Backend Fix - Route Configuration Error

**Date:** 2025-10-20
**Priority:** CRITICAL 🔥
**Estimated Fix Time:** 2 minutes
**Estimated Deploy Time:** 5 minutes

---

## THE BUG

**File:** `/server/routes/market-data.ts`
**Line:** 2375

**Current (WRONG):**
```typescript
router.get("/iv/:ticker/chart", authService, getIVChart);
```

**Problem:** The router is already mounted at `/api/iv` in `server/routes.ts:225`:
```typescript
app.use("/api/iv", marketDataRouter);
```

This creates a **double `/iv` prefix**:
- **Current endpoint:** `/api/iv/iv/:ticker/chart` ❌
- **Expected endpoint:** `/api/iv/:ticker/chart` ✅
- **Frontend calls:** `/api/iv/AAPL/chart?based_on=fcf` ✅

---

## THE FIX

### Change #1: Chart Endpoint (CRITICAL)

**File:** `/server/routes/market-data.ts`
**Line:** 2375

```diff
-router.get("/iv/:ticker/chart", authService, getIVChart);
+router.get("/:ticker/chart", authService, getIVChart);
```

**Effect:** Removes duplicate `/iv` prefix

---

### Change #2: Macro Endpoint (REVIEW NEEDED)

**File:** `/server/routes/market-data.ts`
**Line:** 2381

**Current:**
```typescript
router.get("/macro/multiplier", authService, getMacroMultiplierController);
```

**Creates endpoint:** `/api/iv/macro/multiplier`

**Question:** Should this be `/api/iv/macro/multiplier` or `/api/macro/multiplier`?

**Options:**
1. **Keep as-is** if frontend expects `/api/iv/macro/multiplier`
2. **Move to separate router** mounted at `/api/macro` in routes.ts
3. **Remove `/macro` prefix** if it should be `/api/iv/multiplier`

**Recommendation:** Check if any frontend code calls this endpoint. If not actively used, consider Option 2 for better REST architecture.

---

## VERIFICATION BEFORE FIX

### Test Current Bug (404 Expected)

```bash
# Test 1: Chart endpoint (404)
curl -i 'https://128.140.45.28.sslip.io/api/iv/AAPL/chart?based_on=fcf'

# Expected response:
# HTTP/1.1 404 Not Found
# {"success":false,"error":{"code":"NOT_FOUND_ERROR","message":"Route GET /api/iv/AAPL/chart not found"}}

# Test 2: Main endpoint (should work - no changes needed)
curl -i 'https://128.140.45.28.sslip.io/api/iv/AAPL/main'

# Expected: 200 OK with AlfaValue data
```

---

## APPLY FIX LOCALLY

```bash
# 1. Navigate to project
cd "/Users/antoniofrancisco/Documents/teste 1"

# 2. Open file in editor
code server/routes/market-data.ts

# 3. Find line 2375 (CTRL+G → 2375)

# 4. Change:
# FROM: router.get("/iv/:ticker/chart", authService, getIVChart);
# TO:   router.get("/:ticker/chart", authService, getIVChart);

# 5. Save file (CMD+S)
```

---

## LOCAL TESTING

```bash
# 1. Build server
npm run build:server

# 2. Start dev environment
npm run dev

# 3. In another terminal, test endpoints
curl 'http://localhost:3001/api/iv/AAPL/main'
# Should return 200 with IV data

curl 'http://localhost:3001/api/iv/AAPL/chart?based_on=fcf&exclude_nri=false'
# Should return 200 with methods array (10+ methods)

# 4. Test frontend
open http://localhost:3000/intrinsic-value?symbol=AAPL
# Click "Show All Methods" button
# Verify chart renders with gauge and bars
```

---

## DEPLOYMENT STEPS

### Method 1: tar+scp (Recommended - Most Reliable)

```bash
# 1. Build locally
npm run build:server

# 2. Create tarball
cd dist
tar czf /tmp/server-dist.tar.gz server/
cd ..

# 3. Upload to server
scp /tmp/server-dist.tar.gz root@128.140.45.28:/tmp/

# 4. Extract on server (clean deployment)
ssh root@128.140.45.28 'cd "/home/teste 1/dist" && rm -rf server && tar xzf /tmp/server-dist.tar.gz'

# 5. Restart PM2
ssh root@128.140.45.28 "pm2 restart alfalyzer --update-env"

# 6. Verify deployment timestamp
ssh root@128.140.45.28 "ls -lh '/home/teste 1/dist/server/index.cjs'"
# Should show today's date and time
```

### Method 2: npm script (Simpler but check timestamp)

```bash
# 1. Build and deploy
npm run deploy:server

# 2. Verify deployment
ssh root@128.140.45.28 "ls -lh '/home/teste 1/dist/server/index.cjs'"

# 3. Check file size (should be ~1-2MB, not 288 bytes)
# If 288 bytes → rsync failed, use Method 1 instead
```

---

## POST-DEPLOYMENT VALIDATION

### Test 1: Chart Endpoint (200 Expected)

```bash
curl -i 'https://128.140.45.28.sslip.io/api/iv/AAPL/chart?based_on=fcf&exclude_nri=false'

# Expected response:
# HTTP/1.1 200 OK
# Content-Type: application/json
#
# {
#   "ticker": "AAPL",
#   "price": 252.29,
#   "methods": [
#     { "name": "AlfaValue™", "iv": 125.44, ... },
#     { "name": "DCF (FCF)", "iv": 130.50, ... },
#     // ... 10+ methods total
#   ],
#   "recommended_method": "AlfaValue™",
#   "confidence": "MED",
#   "as_of": "2025-10-20",
#   "metadata": {
#     "methods_count": 10,
#     "categories": ["Proprietary", "DCF", "Multiples", "Growth"],
#     "calculation_time_ms": 850
#   }
# }
```

### Test 2: Frontend Integration

```bash
# Open production site
open https://128.140.45.28.sslip.io/intrinsic-value?symbol=AAPL
```

**Manual Checklist:**
- [ ] Page loads without errors
- [ ] AlfaValueHeader shows IV: $125.44
- [ ] "Compare All Valuation Methods" card is visible
- [ ] "Show All Methods" button exists (outline style)
- [ ] Click "Show All Methods"
- [ ] Button changes to green "Hide Methods"
- [ ] DCF Base Metric selector appears (default: FCF)
- [ ] Loading spinner shows briefly
- [ ] ValuationGauge renders (180° arc with 5 zones)
- [ ] Methods Summary card shows count (10+)
- [ ] ValuationMethodsChart renders (horizontal bars)
- [ ] Green bars for undervalued methods
- [ ] Red bars for overvalued methods
- [ ] Black line at current price ($252.29)
- [ ] Green dashed line highlighting AlfaValue™
- [ ] Hover over bar shows tooltip
- [ ] Change selector to "OCF" - chart refetches
- [ ] Change selector to "NI" - chart refetches
- [ ] Click "Hide Methods" - collapses smoothly
- [ ] No console errors in DevTools

### Test 3: Different Stocks

```bash
# Test with MSFT
curl -i 'https://128.140.45.28.sslip.io/api/iv/MSFT/chart?based_on=fcf'

# Test with GOOGL
curl -i 'https://128.140.45.28.sslip.io/api/iv/GOOGL/chart?based_on=fcf'
```

**Frontend:** Navigate to each stock and click "Show All Methods"

---

## ROLLBACK PLAN (If Issues Occur)

```bash
# Quick rollback using git
ssh root@128.140.45.28
cd "/home/teste 1"

# Check recent commits
git log --oneline -5

# Rollback to previous commit
scripts/rollback/rollback.sh HEAD~1

# Or rollback to specific commit
scripts/rollback/rollback.sh <commit-hash>
```

**Note:** Frontend gracefully degrades - if backend fails, the "Compare All Methods" card simply won't render.

---

## MONITORING POST-DEPLOYMENT

### Check PM2 Logs

```bash
ssh root@128.140.45.28 "pm2 logs alfalyzer --lines 50"

# Look for:
# [IVChart] Generating chart for AAPL (based_on: fcf)
# [IVChart] Macro multiplier: 1.000 (neutral)
# [IVChart] Successfully generated 10 methods

# No errors like:
# [ERROR] Route not found
# [ERROR] Failed to calculate valuation
```

### Check Error Rate

```bash
# Monitor for 5 minutes after deployment
ssh root@128.140.45.28 "pm2 logs alfalyzer | grep -i error"

# Should see NO new errors related to /api/iv/
```

### Performance Check

```bash
# Measure response time
time curl -s 'https://128.140.45.28.sslip.io/api/iv/AAPL/chart?based_on=fcf' > /dev/null

# Expected: 0.8s - 1.5s (first call)
# Expected: 0.05s - 0.2s (cached call)
```

---

## ADDITIONAL FIXES (OPTIONAL)

### Fix: Macro Multiplier Endpoint (If Needed)

**If frontend needs `/api/macro/multiplier` (not `/api/iv/macro/multiplier`):**

1. Create new router in `server/routes/macro-routes.ts`:
```typescript
import { Router } from 'express';
import { getMacroMultiplierController } from '../controllers/macro-controller';
import { authService } from '../middleware/auth-middleware';

const router = Router();

router.get('/multiplier', authService, getMacroMultiplierController);

export default router;
```

2. Register in `server/routes.ts`:
```typescript
import macroRouter from './routes/macro-routes';
app.use('/api/macro', macroRouter);
```

3. Remove line 2381 from `server/routes/market-data.ts`

**OR** if endpoint should be `/api/iv/multiplier` (without `/macro`):

```diff
-router.get("/macro/multiplier", authService, getMacroMultiplierController);
+router.get("/multiplier", authService, getMacroMultiplierController);
```

---

## DOCUMENTATION UPDATES

After successful deployment, update these files:

1. **CLAUDE.md** - Add section:
```markdown
## FASE 3 Features (2025-10-20)

### Valuation Methods Chart
- **Endpoint:** GET /api/iv/:ticker/chart
- **Query Params:**
  - `based_on`: fcf | ocf | ni (default: fcf)
  - `exclude_nri`: boolean (default: false)
- **Returns:** 10+ valuation methods with macro adjustment
- **Cache:** 1 hour staleTime, 2 hours gcTime
```

2. **API_DOCUMENTATION.md** (if exists) - Add endpoint spec

3. **CHANGELOG.md** - Add entry:
```markdown
## [2025-10-20] FASE 3 - Valuation Methods Chart

### Added
- `/api/iv/:ticker/chart` endpoint - Returns 10+ valuation methods
- Macro multiplier integration for all IVs
- Support for FCF/OCF/NI base metrics (GAP #3)
- Confidence scoring for methods
- Category grouping (Proprietary, DCF, Multiples, Growth)

### Fixed
- Route path configuration (removed duplicate /iv prefix)
```

---

## SUCCESS CRITERIA

✅ All criteria must pass:

1. **API Response:**
   - [ ] `GET /api/iv/AAPL/chart?based_on=fcf` returns 200
   - [ ] Response contains `methods` array with 10+ items
   - [ ] Response contains `ticker`, `price`, `confidence`, `as_of`
   - [ ] Each method has: `name`, `iv`, `category`, `description`, `formula`, `confidence`

2. **Frontend Rendering:**
   - [ ] "Compare All Methods" card is visible
   - [ ] "Show All Methods" button works (toggle)
   - [ ] DCF Base Metric selector works (FCF/OCF/NI)
   - [ ] ValuationGauge renders correctly
   - [ ] ValuationMethodsChart renders with bars
   - [ ] Tooltips show on hover
   - [ ] No console errors

3. **Performance:**
   - [ ] Initial chart load < 2s
   - [ ] Cached chart load < 200ms
   - [ ] Selector change < 1s
   - [ ] No memory leaks (check DevTools Memory)

4. **Cross-Browser:**
   - [ ] Chrome/Edge (Chromium) ✅
   - [ ] Firefox ✅
   - [ ] Safari ✅
   - [ ] Mobile Safari ✅

5. **Multiple Stocks:**
   - [ ] AAPL works ✅
   - [ ] MSFT works ✅
   - [ ] GOOGL works ✅
   - [ ] Invalid ticker shows proper error

---

## CONTACTS

**If deployment fails:**
- Check PM2 logs: `pm2 logs alfalyzer --lines 100`
- Check server status: `pm2 status`
- Check disk space: `df -h`
- Check process memory: `pm2 monit`

**If frontend fails:**
- Open DevTools Console (F12)
- Check Network tab for failed requests
- Verify bundle loaded: Check Sources tab for `intrinsic-value-*.js`
- Clear browser cache: CMD+SHIFT+R (Mac) or CTRL+F5 (Windows)

---

**Fix Prepared By:** Claude (QA Engineer)
**Fix Date:** 2025-10-20
**Deployment Status:** ⏳ PENDING APPLICATION
**Risk Level:** LOW (simple 1-line change, no breaking changes)
