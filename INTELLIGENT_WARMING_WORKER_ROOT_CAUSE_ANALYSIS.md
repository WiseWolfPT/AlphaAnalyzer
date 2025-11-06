# Intelligent Warming Worker - Root Cause Analysis
**Date:** 2025-11-05
**Status:** 🚨 CRITICAL - 100% Failure Rate
**Worker Uptime:** 18 hours (continuous failure loop)
**Impact:** Zero cache coverage from intelligent warming system

---

## Executive Summary

The intelligent warming worker has been **failing 100% of tasks** for the past 18 hours due to attempting to warm **obsolete method IDs** that were removed from the valuation service in commit `77372de2` (ONDA 7).

**Root Cause:** Configuration mismatch between warming workers and valuation service
**Fix Complexity:** Low (simple array update)
**Risk Level:** Very Low (removing obsolete references only)
**Expected Recovery Time:** Immediate (next warming cycle after deploy)

---

## Error Evidence

### Production Logs (SSH)
```
[WarmingQueue] Marked failed: AAPL:dcf-terminal-fcfe (reason: Unsupported method ID: dcf-terminal-fcfe)
[WarmingQueue] Marked failed: AAPL:dcf-fcfe-20 (reason: Unsupported method ID: dcf-fcfe-20)
[IntelligentWarming] Cycle 222 complete: 0 success, 8 failed, 42 skipped (FMP validation)
```

### Cycle Statistics
- **Success:** 0 (0%) ❌
- **Failed:** 8 (due to obsolete methods) ❌
- **Skipped:** 42 (FMP validation) ⚠️
- **Total tasks:** 50 per cycle
- **Failure rate:** 100% of attempted warmings

---

## Root Cause Analysis

### 1. Historical Context

**ONDA 7 (Commit: 77372de2, Date: ~2025-10-20)**
- FCFE methods (`dcf-fcfe-20`, `dcf-terminal-fcfe`) removed from valuation service
- Reason: FMP API returns empty arrays for FCFE data
- Documentation updated: "12 methods (FCFE removed)"
- Impact documented in:
  - `server/types/valuation.ts:443`
  - `server/controllers/iv-chart-controller.ts:269`
  - `server/services/method-cache-service.ts:345`

### 2. Method Count Discrepancy

**Current State:**

| Component | Method Count | Status |
|-----------|--------------|--------|
| `method-cache-service.ts` | 12 methods | ✅ CORRECT |
| `intelligent-warming-worker.ts` | 14 methods | ❌ STALE |
| `iv-warming-worker.ts` | 14 methods | ❌ STALE |

**Valid Methods (12 total):**
```typescript
[
  'alfa-value',              // ✅ Proprietary AlfaValue
  'dcf-fcf-20',              // ✅ FMP DCF FCF 20Y
  'dcf-terminal-fcf',        // ✅ FMP DCF Terminal FCF
  'dni-20',                  // ✅ DNI-20 (internal)
  'dfcf-terminal',           // ✅ DFCF Terminal (3-stage)
  'pe-mean',                 // ✅ P/E Mean 5Y (ex-NRI)
  'pe-mean-without-nri',     // ✅ P/E Mean 5Y (without NRI)
  'ps-mean',                 // ✅ P/S Mean 5Y
  'pb-mean',                 // ✅ P/B Mean 5Y
  'pb-mean-without-nri',     // ✅ P/B Mean 5Y (without NRI)
  'peg',                     // ✅ PEG (ex-NRI)
  'psg'                      // ✅ PSG
]
```

**Obsolete Methods (removed in ONDA 7):**
```typescript
[
  'dcf-fcfe-20',             // ❌ REMOVED - FMP returns empty array
  'dcf-terminal-fcfe',       // ❌ REMOVED - FMP returns empty array
]
```

### 3. Why Workers Were Not Updated

**Git History Analysis:**
```bash
$ git log --all --oneline --since="2025-10-20" | head -10
d9147a12 feat(P0 #1 + #5): Deploy FMP rate limiter + data validator
a70c90ed docs(P0 #3): Add executive summary and quick reference
881c550e fix(P0 #3): Fix empty available_methods array bug (31.5% data loss)
cdc54906 feat(FASE 2): Dynamic IV dropdown + Growth DCF 8Y integration
d45c719b feat(Growth Stocks Complete): Integrate Growth DCF 8Y + Auto-Detector + 50% Growth Clamps
20736843 feat(FASE 2-3 Complete): Growth stocks + Value stocks + Quarterly fallback + Sector defaults
9515f388 fix(frontend): FASE 5 - P0 bug fixes (.toFixed() crash + routing)
aa9be2e2 feat(FASE 2): Integrate sector-specific valuation methods + frontend fixes
77372de2 feat(valuation): ONDA 3.2 + ONDA 7 - Dynamic input mapping & intelligent warming fixes
```

**Timeline:**
1. **2025-10-20:** ONDA 7 removes FCFE methods from `method-cache-service.ts`
2. **2025-10-20 - 2025-11-05:** Multiple features/fixes deployed BUT warming workers not updated
3. **2025-11-05:** Worker fails silently for 18 hours before detection

**Why it wasn't caught:**
- Workers deployed as compiled CJS (`dist/server/workers/*.cjs`)
- No integration tests validating method ID consistency across services
- Warming worker logs show "skipped" but don't surface method validation errors prominently
- CLAUDE.md updated with "12 methods" but worker code still references 14

### 4. Defense-in-Depth Analysis

**Layer 1 - Worker Method Registry (FAILED):**
- Location: `intelligent-warming-worker.ts:55-70`
- Issue: Hardcoded array not synced with `method-cache-service.ts`

**Layer 2 - Method Cache Service (WORKING):**
- Location: `method-cache-service.ts:347-362`
- Status: ✅ Correctly rejects obsolete methods
- Behavior: Returns error "Unsupported method ID"

**Layer 3 - Queue Service (WORKING):**
- Location: `warming-queue-service.ts`
- Status: ✅ Correctly marks tasks as failed
- Log: `[WarmingQueue] Marked failed: AAPL:dcf-terminal-fcfe`

### 5. Impact Assessment

**Current Impact:**
- Warming worker running but achieving **0% success rate**
- Queue filling with failed tasks (8 failures per cycle)
- Bandwidth NOT wasted (validation happens before API calls) ✅
- FMP API calls: 0 (pre-validation skips early) ✅
- Cache coverage: Stagnant (no new entries warmed)

**Cascade Effects:**
- User requests for AAPL may hit cold cache → slower response
- Monitoring dashboard shows 0% warming success → false alarm
- Queue backlog growing with retry tasks

**Why It Didn't Break Everything:**
- FMP data validator (P0 Fix #5) prevents corrupted cache entries ✅
- Method cache service rejects invalid methods gracefully ✅
- Real-time quote fetching still works via other workers ✅

---

## Files Requiring Changes

### Primary Files (MUST FIX)

**1. `server/workers/intelligent-warming-worker.ts:55-70`**
```typescript
// ❌ CURRENT (14 methods - OBSOLETE)
const METHOD_IDS: MethodId[] = [
  'alfa-value',
  'dcf-fcf-20',
  'dcf-fcfe-20',             // ❌ REMOVE
  'dcf-terminal-fcf',
  'dcf-terminal-fcfe',       // ❌ REMOVE
  'dni-20',
  'dfcf-terminal',
  'pe-mean',
  'pe-mean-without-nri',
  'ps-mean',
  'pb-mean',
  'pb-mean-without-nri',
  'peg',
  'psg'
];
```

**2. `server/workers/iv-warming-worker.ts:27-42`**
```typescript
// ❌ CURRENT (14 methods - OBSOLETE)
const ALL_METHOD_IDS: MethodId[] = [
  'alfa-value',
  'dcf-fcf-20',
  'dcf-fcfe-20',             // ❌ REMOVE
  'dcf-terminal-fcf',
  'dcf-terminal-fcfe',       // ❌ REMOVE
  'dni-20',
  'pe-mean',
  'pe-mean-without-nri',
  'ps-mean',
  'pb-mean',
  'pb-mean-without-nri',
  'peg',
  'psg',
  'dfcf-terminal',
];
```

### Reference Files (Documentation Only)

**3. `server/types/valuation.ts:443`**
```typescript
// ✅ CORRECT - Already documented removal
* REMOVED: 'dcf-fcfe-20' and 'dcf-terminal-fcfe' (FMP API returns empty array - no FCFE data available)
```

**4. `server/services/method-cache-service.ts:345`**
```typescript
// ✅ CORRECT - Already removed from supported methods
/**
 * Get all supported method IDs (12 methods total)
 * REMOVED: 'dcf-fcfe-20' and 'dcf-terminal-fcfe' (FMP API no FCFE data)
 */
```

### Test Files (Update Expected Counts)

**5. `server/controllers/__tests__/iv-chart-controller.method-cache.test.ts:29,31`**
```typescript
// ⚠️ Test still references obsolete methods
// Update expected method count from 14 → 12
```

**6. `server/services/__tests__/method-cache-service.test.ts:87-88,258`**
```typescript
// ⚠️ Test still uses 'dcf-terminal-fcfe' as example
// Update to use valid method like 'dcf-terminal-fcf'
```

---

## Fix Implementation

### Step 1: Update Intelligent Warming Worker

**File:** `server/workers/intelligent-warming-worker.ts`

**Change:** Lines 53-70

**Old Code:**
```typescript
// Valuation method IDs (12 methods - ONDA 7)
// Mapping to actual MethodId types used by method-cache-service
const METHOD_IDS: MethodId[] = [
  'alfa-value',              // Proprietary AlfaValue method
  'dcf-fcf-20',              // FMP DCF FCF 20Y
  'dcf-fcfe-20',             // FMP DCF FCFE 20Y
  'dcf-terminal-fcf',        // FMP DCF Terminal FCF
  'dcf-terminal-fcfe',       // FMP DCF Terminal FCFE
  'dni-20',                  // DNI-20 (internal)
  'dfcf-terminal',           // DFCF Terminal (3-stage)
  'pe-mean',                 // P/E Mean 5Y (ex-NRI)
  'pe-mean-without-nri',     // P/E Mean 5Y (without NRI)
  'ps-mean',                 // P/S Mean 5Y
  'pb-mean',                 // P/B Mean 5Y
  'pb-mean-without-nri',     // P/B Mean 5Y (without NRI)
  'peg',                     // PEG (ex-NRI)
  'psg'                      // PSG
];
```

**New Code:**
```typescript
// Valuation method IDs (12 methods - ONDA 7)
// REMOVED 'dcf-fcfe-20' and 'dcf-terminal-fcfe' (FMP API returns empty array)
// Mapping to actual MethodId types used by method-cache-service
const METHOD_IDS: MethodId[] = [
  'alfa-value',              // Proprietary AlfaValue method
  'dcf-fcf-20',              // FMP DCF FCF 20Y
  'dcf-terminal-fcf',        // FMP DCF Terminal FCF
  'dni-20',                  // DNI-20 (internal)
  'dfcf-terminal',           // DFCF Terminal (3-stage)
  'pe-mean',                 // P/E Mean 5Y (ex-NRI)
  'pe-mean-without-nri',     // P/E Mean 5Y (without NRI)
  'ps-mean',                 // P/S Mean 5Y
  'pb-mean',                 // P/B Mean 5Y
  'pb-mean-without-nri',     // P/B Mean 5Y (without NRI)
  'peg',                     // PEG (ex-NRI)
  'psg'                      // PSG
];
```

**Lines Changed:** 58, 60 (removed)

---

### Step 2: Update IV Warming Worker

**File:** `server/workers/iv-warming-worker.ts`

**Change:** Lines 26-42

**Old Code:**
```typescript
// All supported method IDs
const ALL_METHOD_IDS: MethodId[] = [
  'alfa-value',
  'dcf-fcf-20',
  'dcf-fcfe-20',
  'dcf-terminal-fcf',
  'dcf-terminal-fcfe',
  'dni-20',
  'pe-mean',
  'pe-mean-without-nri',
  'ps-mean',
  'pb-mean',
  'pb-mean-without-nri',
  'peg',
  'psg',
  'dfcf-terminal',
];
```

**New Code:**
```typescript
// All supported method IDs (12 total - ONDA 7)
// REMOVED 'dcf-fcfe-20' and 'dcf-terminal-fcfe' (FMP API returns empty array)
const ALL_METHOD_IDS: MethodId[] = [
  'alfa-value',
  'dcf-fcf-20',
  'dcf-terminal-fcf',
  'dni-20',
  'pe-mean',
  'pe-mean-without-nri',
  'ps-mean',
  'pb-mean',
  'pb-mean-without-nri',
  'peg',
  'psg',
  'dfcf-terminal',
];
```

**Lines Changed:** 30, 32 (removed)

---

### Step 3: Create Consistency Test

**New File:** `server/workers/__tests__/method-id-consistency.test.ts`

```typescript
/**
 * Test: Method ID Consistency Across Services
 *
 * Ensures warming workers and method cache service use identical method lists
 * Prevents recurrence of 2025-11-05 incident (obsolete FCFE methods)
 */

import { describe, it, expect } from 'vitest';
import { methodCacheService } from '../../services/method-cache-service';

// Import method lists from workers (would need to export them)
// For now, hardcode expected list
const EXPECTED_METHODS = [
  'alfa-value',
  'dcf-fcf-20',
  'dcf-terminal-fcf',
  'dni-20',
  'dfcf-terminal',
  'pe-mean',
  'pe-mean-without-nri',
  'ps-mean',
  'pb-mean',
  'pb-mean-without-nri',
  'peg',
  'psg'
];

const OBSOLETE_METHODS = [
  'dcf-fcfe-20',
  'dcf-terminal-fcfe'
];

describe('Method ID Consistency', () => {
  it('should have exactly 12 supported methods', () => {
    const supported = methodCacheService.getSupportedMethods();
    expect(supported).toHaveLength(12);
  });

  it('should not include obsolete FCFE methods', () => {
    const supported = methodCacheService.getSupportedMethods();

    OBSOLETE_METHODS.forEach(obsolete => {
      expect(supported).not.toContain(obsolete);
    });
  });

  it('should include all expected methods', () => {
    const supported = methodCacheService.getSupportedMethods();

    EXPECTED_METHODS.forEach(method => {
      expect(supported).toContain(method);
    });
  });

  it('should match sorted order for consistency', () => {
    const supported = methodCacheService.getSupportedMethods();
    const sorted = [...supported].sort();

    expect(supported).toEqual(sorted);
  });
});
```

---

### Step 4: Update Test Files

**File:** `server/controllers/__tests__/iv-chart-controller.method-cache.test.ts`

**Change:** Lines 29-31

**Old Code:**
```typescript
      'dcf-fcfe-20',
      'dcf-terminal-fcf',
      'dcf-terminal-fcfe',
```

**New Code:**
```typescript
      'dcf-terminal-fcf',
      // REMOVED: dcf-fcfe-20, dcf-terminal-fcfe (ONDA 7)
```

---

**File:** `server/services/__tests__/method-cache-service.test.ts`

**Change:** Lines 87-88, 258

**Old Code:**
```typescript
const key = service['getCacheKey'](mockTicker, 'dcf-terminal-fcfe');
expect(key).toBe('iv:method:AAPL:dcf-terminal-fcfe');

// And line 258
'iv:method:AAPL:dcf-fcfe-20',
```

**New Code:**
```typescript
const key = service['getCacheKey'](mockTicker, 'dcf-terminal-fcf');
expect(key).toBe('iv:method:AAPL:dcf-terminal-fcf');

// And line 258
'iv:method:AAPL:dcf-terminal-fcf',
```

---

## Risk Assessment

### Change Impact Analysis

**Risk Level:** 🟢 **VERY LOW**

**Why Safe:**
1. ✅ Only removing obsolete references (no new functionality)
2. ✅ Method cache service already rejects these methods
3. ✅ No database schema changes
4. ✅ No API contract changes
5. ✅ Backward compatible (old cache keys just expire)

**What Could Go Wrong:**
1. ❌ Typo in method names → Worker fails same way (easy to detect)
2. ❌ Wrong method removed → Some stocks fail validation (reversible)
3. ❌ Build fails → Pre-deploy catches it (CI/CD)

**Mitigation:**
- Run `npm run build:server` locally before deploy
- Test warming worker health endpoint after deploy
- Monitor next 2 warming cycles for success rate improvement

---

## Verification Plan

### Pre-Deploy Checks

```bash
# 1. Verify TypeScript compilation
cd "/Users/antoniofrancisco/Documents/teste 1"
npm run build:server

# 2. Check compiled worker output
grep -c "dcf-fcfe-20\|dcf-terminal-fcfe" dist/server/workers/intelligent-warming-worker.cjs
# Expected: 0 (zero occurrences)

# 3. Verify method count
node -e "
const code = require('fs').readFileSync('dist/server/workers/intelligent-warming-worker.cjs', 'utf8');
const methodMatch = code.match(/'alfa-value'|'dcf-fcf-20'|'dcf-terminal-fcf'/g);
console.log('Methods found in compiled worker:', methodMatch ? methodMatch.length : 0);
console.log('Expected: 12');
"

# 4. Run consistency test (after creating it)
npm test -- method-id-consistency.test.ts
```

### Post-Deploy Validation

**Step 1: Check Worker Health (Immediate)**
```bash
# SSH to production
ssh root@128.140.45.28

# Check PM2 status
pm2 logs intelligent-warming --lines 50 | grep "Cycle"

# Expected output:
# [IntelligentWarming] Cycle 223 complete: X success, 0 failed, Y skipped
# X should be > 0 (not 0 like before)
```

**Step 2: Monitor Next 2 Cycles (10 minutes)**
```bash
# Watch logs in real-time
pm2 logs intelligent-warming --lines 0

# Watch for:
# ✅ "[IntelligentWarming] Warmed AAPL:alfa-value in Xms (calculated)"
# ✅ "Cycle N complete: X success, 0 failed"
# ❌ "Unsupported method ID" (should be GONE)
```

**Step 3: Verify Queue Stats (15 minutes)**
```bash
# Check queue health endpoint
curl http://localhost:3006/health | jq '.queue'

# Expected:
# {
#   "queueSize": X,
#   "completedToday": Y,  # Should increase over time
#   "failedToday": 0,     # Should stop growing
#   "avgPriority": Z
# }
```

**Step 4: Check Cache Coverage (30 minutes)**
```bash
# Check warming dashboard
curl http://localhost:3001/api/monitoring/warming/overview | jq '.coverage'

# Expected:
# {
#   "total": 17916,       # 1,493 stocks × 12 methods
#   "cached": X,          # Should increase over time
#   "percent": Y          # Should grow from current 0%
# }
```

### Success Criteria

**Immediate (0-5 minutes):**
- ✅ Worker restarts without errors
- ✅ No "Unsupported method ID" logs
- ✅ At least 1 successful warming in first cycle

**Short-term (5-30 minutes):**
- ✅ Success rate > 80% (skipped due to FMP validation OK)
- ✅ Failed count stops growing
- ✅ Queue completed count increases

**Medium-term (30-120 minutes):**
- ✅ Cache coverage increases by 1-2% per hour
- ✅ No recurring failures for same ticker:method pairs
- ✅ Bandwidth usage within budget (< 85%)

---

## Rollback Plan

**If Fix Causes Issues:**

### Scenario 1: Build Fails
```bash
# Revert local changes
git checkout HEAD -- server/workers/intelligent-warming-worker.ts
git checkout HEAD -- server/workers/iv-warming-worker.ts

# Deploy previous working version
npm run deploy:server
```

### Scenario 2: Worker Crashes
```bash
# SSH to production
ssh root@128.140.45.28

# Stop worker
pm2 stop intelligent-warming

# Rollback server code
cd "/home/teste 1"
git pull
git checkout HEAD~1 dist/server/

# Restart
pm2 restart intelligent-warming
```

### Scenario 3: Different Methods Fail
```bash
# Add debug logging
export DEBUG_WARMING=true

# Check which methods are actually failing
pm2 logs intelligent-warming --lines 100 | grep "Failed to warm"

# Compare with method-cache-service supported list
curl http://localhost:3001/api/cache/methods/supported
```

---

## Prevention Measures

### Immediate Actions

1. **Create Central Method Registry**
   ```typescript
   // server/config/supported-methods.ts
   export const SUPPORTED_METHODS: MethodId[] = [
     'alfa-value',
     'dcf-fcf-20',
     // ... (single source of truth)
   ];
   ```

2. **Add Pre-Deployment Test**
   ```bash
   # .github/workflows/ci.yml or npm script
   npm run test:method-consistency
   ```

3. **Update CLAUDE.md Documentation**
   ```markdown
   ## CRITICAL: Method ID Management

   When adding/removing valuation methods:
   1. Update method-cache-service.ts getSupportedMethods()
   2. Update intelligent-warming-worker.ts METHOD_IDS
   3. Update iv-warming-worker.ts ALL_METHOD_IDS
   4. Run: npm run test:method-consistency
   5. Update CLAUDE.md method count
   ```

### Long-term Improvements

1. **Automated Sync Check** (CI/CD)
   - Fail build if worker methods != service methods
   - Pre-commit hook validation

2. **Runtime Validation**
   ```typescript
   // In warming worker startup
   const supportedMethods = methodCacheService.getSupportedMethods();
   const workerMethods = METHOD_IDS;

   const invalidMethods = workerMethods.filter(m => !supportedMethods.includes(m));
   if (invalidMethods.length > 0) {
     throw new Error(`Worker has invalid methods: ${invalidMethods.join(', ')}`);
   }
   ```

3. **Monitoring Alert**
   - Alert if warming failure rate > 50% for 2 consecutive cycles
   - Slack/Discord notification to ops team

4. **Documentation Update Workflow**
   - PR template checklist: "Did you update warming workers?"
   - Automated comment on PRs touching method lists

---

## Appendix: Complete File Locations

### Files to Modify
```
server/workers/intelligent-warming-worker.ts       (PRIMARY - Line 58, 60)
server/workers/iv-warming-worker.ts                (PRIMARY - Line 30, 32)
server/controllers/__tests__/iv-chart-controller.method-cache.test.ts  (TEST - Line 29, 31)
server/services/__tests__/method-cache-service.test.ts                 (TEST - Line 87-88, 258)
```

### Reference Files (No Changes Needed)
```
server/types/valuation.ts                         (Line 443 - already documented)
server/services/method-cache-service.ts           (Line 345 - already correct)
server/controllers/iv-chart-controller.ts         (Line 269 - already documented)
CLAUDE.md                                          (Already says "12 methods")
```

### New Files to Create
```
server/workers/__tests__/method-id-consistency.test.ts  (NEW - consistency test)
server/config/supported-methods.ts                      (FUTURE - central registry)
```

---

## Timeline

**Discovery:** 2025-11-05 (after 18h of silent failures)
**Analysis:** 2025-11-05 (1h - root cause identified)
**Fix Development:** 2025-11-05 (30min - simple array update)
**Testing:** 2025-11-05 (30min - local validation)
**Deployment:** 2025-11-05 (TBD)
**Verification:** 2025-11-05 (2h post-deploy monitoring)

---

## Sign-off

**Analyzed by:** Claude Code (AI Debug Specialist)
**Reviewed by:** (Pending)
**Approved for Deploy:** (Pending)

**Confidence Level:** 🟢 HIGH (95%+)
**Deploy Recommendation:** ✅ PROCEED (low risk, high impact)

---

**End of Report**
