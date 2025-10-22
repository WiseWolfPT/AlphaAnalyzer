# 📋 FASE 2 - Daily Run Validation Plan

**Scheduled**: 2025-10-14 06:00 UTC (Daily Valuation Update)
**Validation**: 2025-10-14 06:15 UTC (15 min after run)
**Status**: ⏰ **WAITING FOR SCHEDULED RUN**

---

## 🎯 What Will Be Validated

### 1. **Worker Metrics** (Expected: 70-85% success rate)
- `calculated + failed = total` (sanity check)
- Success rate ≥ 70%
- No double-counting (metrics bug from Round 2)

### 2. **Alarm System** (3 triggers implemented)
- ✅ **Daily Update OK**: metrics valid + success ≥ 70%
- ⚠️ **SUCCESS_RATE_BELOW_TARGET**: success < 70%
- 🔴 **METRICS_SANITY_FAILED**: calculated + failed ≠ total
- 🔴 **CACHE_INVALIDATION_SUSPECT**: 0/N keys existed before DEL

### 3. **Cache Invalidation** (Round 2 fix)
- ~100 `DEL iv:calc:*` operations in logs
- Keys existed before deletion (delExistsHit > 0)
- New calculations after invalidation

### 4. **Shares Cascade** (Round 4 lookback)
- `[Shares]` tier logs visible (warn for failures)
- Date context in success logs
- 70-85% discovery rate expected

### 5. **Endpoint Spot-Checks**
- AAPL: numeric IV + shares_m
- MSFT: numeric IV + shares_m
- GOOGL: numeric IV + shares_m

---

## 🛠️ Pre-Run Setup (COMPLETED)

### ✅ Deployed Components
- [x] Round 4 bundle (lookback + warn logs)
- [x] Alarm system (3 triggers)
- [x] Worker restarted (PM2 online, 27MB)

### ✅ Logs Cleaned
```bash
ssh root@128.140.45.28 "pm2 flush valuation-updater"
# Result: ✅ Logs flushed at 2025-10-14 02:52 UTC
```

### ✅ Monitoring Script Created
- **Path**: `scripts/monitoring/validate-daily-run.sh`
- **Features**: 8 automated checks + consolidated report
- **Permissions**: chmod +x applied
- **Usage**: `./scripts/monitoring/validate-daily-run.sh 128.140.45.28`

---

## 📊 Validation Commands (06:15 UTC)

### Option A: Automated Script (Recommended)
```bash
cd /Users/antoniofrancisco/Documents/teste\ 1
./scripts/monitoring/validate-daily-run.sh 128.140.45.28
```

**Script Output:**
- ✅ Daily Update metrics (calculated/failed/total)
- ✅ Alarm status (OK/WARNING/CRITICAL)
- ✅ Cache invalidation check (~100 DEL operations)
- ✅ Endpoint spot-checks (3 tickers)
- ✅ Metrics consistency validation
- ✅ Success rate validation (≥70% target)
- ✅ Consolidated report with recommendations

### Option B: Manual Commands

#### 1. Extract Metrics Summary
```bash
ssh root@128.140.45.28 "pm2 logs valuation-updater --lines 200 --nostream | grep -A 10 'DAILY Update Summary'"
```

**Expected Output:**
```
📊 DAILY Update Summary:
   ├─ Duration: 187s
   ├─ RF Updated: ✅
   ├─ IVs Calculated: 78/100 (78.0%)
   ├─ IVs Failed/Invalid: 22
   └─ Status: ✅ Success
```

#### 2. Check Alarm Status
```bash
ssh root@128.140.45.28 "pm2 logs valuation-updater --lines 400 --nostream | egrep 'ALARM|Daily Update OK'"
```

**Possible Outputs:**

**A) Success (Expected):**
```
✅ Daily Update OK: 78/100 (78%), metrics valid (78+22=100)
```

**B) Warning:**
```
⚠️ [ALARM] SUCCESS_RATE_BELOW_TARGET: 65/100 (65%) < 70%
```

**C) Critical:**
```
🔴 [ALARM] METRICS_SANITY_FAILED: 85+20 != 100
🔴 [ALARM] CACHE_INVALIDATION_SUSPECT: 0/100 iv:calc:* keys existed
```

#### 3. Validate Cache Invalidation
```bash
ssh root@128.140.45.28 "pm2 logs valuation-updater --lines 400 --nostream | grep -c 'DEL.*iv:calc:'"
```

**Expected**: ~100 (one per ticker in hot set)

**Sample deleted keys:**
```bash
ssh root@128.140.45.28 "pm2 logs valuation-updater --lines 400 --nostream | grep 'iv:calc:' | head -3"
```

#### 4. Spot-Check Endpoints
```bash
# AAPL
ssh root@128.140.45.28 "curl -s http://127.0.0.1:3001/api/iv/AAPL/main | jq -c '{ticker, iv, shares_m: .inputs.shares_m, price}'"

# MSFT
ssh root@128.140.45.28 "curl -s http://127.0.0.1:3001/api/iv/MSFT/main | jq -c '{ticker, iv, shares_m: .inputs.shares_m, price}'"

# GOOGL
ssh root@128.140.45.28 "curl -s http://127.0.0.1:3001/api/iv/GOOGL/main | jq -c '{ticker, iv, shares_m: .inputs.shares_m, price}'"
```

**Expected**: All return numeric `iv` and `shares_m`

#### 5. Check Shares Cascade Logs
```bash
ssh root@128.140.45.28 "pm2 logs valuation-updater --lines 500 --nostream | grep '\[Shares\]' | head -20"
```

**Expected Pattern:**
```
[WARN] AAPL: key-metrics returned 5 records but all had shares ≤ 0
[WARN] AAPL: key-metrics-ttm returned 1 records but all had shares ≤ 0
[WARN] AAPL: balance-sheet returned 5 records but all had shares ≤ 0
[INFO] AAPL: income-statement (2024-09-30) → 15408.09M
```

---

## ✅ Success Criteria

### Tier 1: MUST PASS (Critical)
- [x] Metrics consistent: `calculated + failed = total`
- [x] No double-counting detected
- [x] Cache invalidation working (~100 DEL operations)
- [x] Worker completed without crashes

### Tier 2: SHOULD PASS (Target)
- [ ] Success rate ≥ 70%
- [ ] Alarm status: "Daily Update OK"
- [ ] Endpoint spot-checks: 3/3 successful
- [ ] Shares cascade logs visible

### Tier 3: NICE TO HAVE (Optimal)
- [ ] Success rate ≥ 80%
- [ ] All tickers with IV > 0 (no negative IVs)
- [ ] Duration < 5 minutes
- [ ] No FMP API errors

---

## ⚠️ Failure Scenarios & Actions

### Scenario 1: Metrics Sanity Failed
**Symptom**: `🔴 [ALARM] METRICS_SANITY_FAILED: 85+20 != 100`

**Root Cause**: Double-counting in exception handlers (Round 2 bug regression)

**Action**:
1. Review `counted` flag implementation
2. Check for new exception handlers without `counted` check
3. Verify `if (!counted)` logic in all error paths

### Scenario 2: Success Rate Below Target
**Symptom**: `⚠️ [ALARM] SUCCESS_RATE_BELOW_TARGET: 65/100 (65%) < 70%`

**Root Cause**: Shares cascade still struggling with certain tickers

**Action**:
1. Analyze `[Shares]` logs for common failure patterns
2. Check which tier succeeds most often (optimize order?)
3. Identify ticker categories failing (e.g., international, small-cap)
4. Consider additional tier or FMP endpoint

### Scenario 3: Cache Invalidation Suspect
**Symptom**: `🔴 [ALARM] CACHE_INVALIDATION_SUSPECT: 0/100 iv:calc:* keys existed`

**Root Cause**: Keys were already deleted or never created

**Possible Causes**:
- TTL expired naturally before invalidation
- Previous run failed to create cache entries
- Cache key pattern mismatch

**Action**:
1. Check if previous daily run completed successfully
2. Verify cache TTLs (iv:calc should be 24h)
3. Test cache creation manually: curl endpoint → check Redis GET

### Scenario 4: Endpoints Return Null IV
**Symptom**: Spot-checks show `{"iv": null, "shares_m": null}`

**Root Cause**: Cache still contains old values from Round 3

**Action**:
1. Invalidate cache manually: `redis-cli DEL iv:calc:AAPL iv:calc:MSFT`
2. Re-test endpoints
3. If still null, check worker logs for calculation errors

---

## 📈 Expected Outcomes

### Best Case (90% confidence)
```
✅ Daily Update OK: 78/100 (78%), metrics valid (78+22=100)
✅ Cache invalidation: 100 DEL operations detected
✅ Endpoints: 3/3 returning numeric IV
✅ Shares cascade: 78% discovery rate (Tier 4 most common)
```

### Realistic Case (80% confidence)
```
⚠️ [ALARM] SUCCESS_RATE_BELOW_TARGET: 68/100 (68%) < 70%
✅ Metrics valid (68+32=100)
✅ Cache invalidation: 100 DEL operations
✅ Endpoints: 3/3 returning numeric IV
```

**Interpretation**: Close to target, acceptable. Monitor next runs.

### Worst Case (10% probability)
```
🔴 [ALARM] METRICS_SANITY_FAILED: 85+20 != 100
🔴 [ALARM] CACHE_INVALIDATION_SUSPECT: 0/100 keys existed
❌ Endpoints: 0/3 successful (all null)
```

**Interpretation**: Critical regression. Investigate immediately.

---

## 📝 Validation Report Template

After running validation, document results:

```markdown
# FASE 2 - Daily Run Validation Report

**Date**: 2025-10-14 06:15 UTC
**Run**: Daily valuation update (06:00 UTC)

## Metrics
- Calculated: X/100
- Failed: Y
- Total: 100
- Success Rate: Z%
- Consistency: ✅ Valid / ❌ Invalid

## Alarm Status
- Status: OK / WARNING / CRITICAL
- Message: [copy from logs]

## Cache Invalidation
- DEL operations: N (expected: ~100)
- Keys existed: M (expected: >0)

## Endpoints
- AAPL: ✅ / ❌
- MSFT: ✅ / ❌
- GOOGL: ✅ / ❌

## Overall
- Status: ✅ PASS / ⚠️ WARNING / 🔴 CRITICAL
- Notes: [any observations]

## Recommendations
[if issues found]
```

---

## 🔄 Next Steps After Validation

### If All Checks Pass
1. ✅ Document results in validation report
2. ✅ Update FASE2_ROUND4_VALIDATION.md with production metrics
3. ✅ Mark FASE 2 as **PRODUCTION-STABLE**
4. ⏭️ Move to FASE 3 or next priority

### If Warnings Detected
1. ⚠️ Document warning details
2. 🔍 Analyze failure patterns
3. 🛠️ Plan Round 5 corrections (if needed)
4. 📊 Monitor next 2-3 daily runs for trends

### If Critical Issues Detected
1. 🔴 Halt further work on FASE 2
2. 🐛 Debug root cause immediately
3. 🔧 Implement hotfix (Round 5)
4. 🧪 Re-validate before resuming

---

## 📚 Related Documentation

- `FASE2_DEPLOYMENT_REPORT.md` - Original FASE 2 completion
- `FASE2_ROUND4_FINAL.md` - Round 4 implementation (lookback + alarms)
- `FASE2_ROUND4_VALIDATION.md` - Round 4 endpoint validation (6/6 tickers)
- `scripts/monitoring/validate-daily-run.sh` - Automated validation script

---

**Prepared By**: Claude Sonnet 4.5 + Codex
**Date**: 2025-10-14 02:55 UTC
**Next Action**: Execute validation at 06:15 UTC
