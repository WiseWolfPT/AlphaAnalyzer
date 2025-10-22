// PATCH FOR calculatePEG() - Returns PEGValuationResponse
/**
 * FASE 3: Calculate PEG Ratio
 * Formula: IV = Fair_PEG × Growth_Rate × EPS_TTM
 * Fair PEG benchmark: 1.5 (market standard)
 *
 * @returns PEGValuationResponse with rich metadata for UI dropdowns
 */
async calculatePEG(ticker: string): Promise<PEGValuationResponse | null> {
  const upperTicker = ticker.toUpperCase();
  const cacheKey = VALUATION_CACHE_KEYS.IV_CALC + upperTicker + ':peg';

  // Check cache
  const cached = await redisCacheService.get<PEGValuationResponse>(cacheKey);
  if (cached) {
    logger.info(`[ValuationService] PEG cache hit for ${upperTicker}`);
    return cached;
  }

  try {
    const FAIR_PEG = 1.5; // Benchmark "fair" PEG ratio (user-editable default)

    // Get growth rate from existing AlfaValue calculation
    const alfaValueData = await this.getAlfaValue(upperTicker);
    const epsGrowthRate = alfaValueData.assumptions.g_1_5; // Use 5y growth rate (decimal)

    // Get current EPS (TTM) - this is EPS without NRI from key metrics
    const keyMetricsTTM = await fmpGet<any[]>(`/api/v3/key-metrics-ttm/${upperTicker}`);
    if (!keyMetricsTTM || !Array.isArray(keyMetricsTTM) || keyMetricsTTM.length === 0) {
      logger.warn(`[ValuationService] No key metrics TTM for ${upperTicker}`);
      return null;
    }

    const epsWithoutNRI = Number(keyMetricsTTM[0].netIncomePerShareTTM || 0);
    if (epsWithoutNRI <= 0) {
      logger.warn(`[ValuationService] Invalid EPS TTM for ${upperTicker}: ${epsWithoutNRI}`);
      return null;
    }

    // Get current market price
    const quote = await this.simpleCacheService.getQuote(upperTicker);
    if (!quote) {
      logger.warn(`[ValuationService] No quote data for ${upperTicker}`);
      return null;
    }
    const currentPrice = quote.price;

    // Calculate P/E ratio without NRI
    const peWithoutNRI = currentPrice / epsWithoutNRI;

    // Calculate PEG ratio: (P/E) / (Growth Rate × 100)
    const pegRatio = peWithoutNRI / (epsGrowthRate * 100);

    // Calculate intrinsic value
    // NOTE: epsGrowthRate is already in decimal form (e.g., 0.1007 for 10.07%)
    // Formula: IV = Fair_PEG × (growthRate × 100) × EPS_TTM
    // Multiplication by 100 converts decimal to percentage for PEG calculation
    // Example: 1.5 × (0.1007 × 100) × 6.13 = 1.5 × 10.07 × 6.13 = $92.59
    const iv = FAIR_PEG * (epsGrowthRate * 100) * epsWithoutNRI;

    if (!isFinite(iv) || iv <= 0) {
      return null;
    }

    logger.info(`[ValuationService] PEG for ${upperTicker}: FairPEG=${FAIR_PEG}, Growth=${(epsGrowthRate*100).toFixed(2)}%, EPS=${epsWithoutNRI.toFixed(2)}, PE=${peWithoutNRI.toFixed(2)}, PEG=${pegRatio.toFixed(2)}, IV=$${iv.toFixed(2)}`);

    const response: PEGValuationResponse = {
      ticker: upperTicker,
      iv,
      currentPrice,
      epsWithoutNRI,
      peWithoutNRI,
      epsGrowthRate,
      pegRatio,
      fairPegRatio: FAIR_PEG,
      confidence: 'MED',
      as_of: new Date().toISOString().split('T')[0],
    };

    // Cache for 24h
    await redisCacheService.set(cacheKey, response, 86400);

    return response;
  } catch (error: any) {
    logger.error(`[ValuationService] Error calculating PEG for ${upperTicker}:`, error.message);
    return null;
  }
}

// ============================================================================

// PATCH FOR calculatePSG() - Returns PSGValuationResponse
/**
 * FASE 3: Calculate PSG Ratio
 * Formula: IV = Fair_PSG × Growth_Rate × Sales_per_Share_TTM
 * Fair PSG benchmark: 0.2 (market standard)
 *
 * @returns PSGValuationResponse with rich metadata for UI dropdowns
 */
async calculatePSG(ticker: string): Promise<PSGValuationResponse | null> {
  const upperTicker = ticker.toUpperCase();
  const cacheKey = VALUATION_CACHE_KEYS.IV_CALC + upperTicker + ':psg';

  // Check cache
  const cached = await redisCacheService.get<PSGValuationResponse>(cacheKey);
  if (cached) {
    logger.info(`[ValuationService] PSG cache hit for ${upperTicker}`);
    return cached;
  }

  try {
    const FAIR_PSG = 0.2; // Benchmark "fair" PSG ratio (user-editable default, conservative)

    // Calculate revenue CAGR (last 3 years)
    const incomeData = await fmpGet<any[]>(`/api/v3/income-statement/${upperTicker}`, {
      period: 'annual',
      limit: 4,
    });

    if (!incomeData || !Array.isArray(incomeData) || incomeData.length < 4) {
      logger.warn(`[ValuationService] Insufficient income data for ${upperTicker}`);
      return null;
    }

    const revenues = incomeData.map(stmt => Number(stmt.revenue || 0)).filter(r => r > 0);
    if (revenues.length < 4) {
      return null;
    }

    // Calculate 3-year CAGR (revenue growth rate)
    const revenueGrowthRate = Math.pow(revenues[0] / revenues[3], 1 / 3) - 1;

    // Get current Sales per Share (TTM)
    const keyMetricsTTM = await fmpGet<any[]>(`/api/v3/key-metrics-ttm/${upperTicker}`);
    if (!keyMetricsTTM || !Array.isArray(keyMetricsTTM) || keyMetricsTTM.length === 0) {
      logger.warn(`[ValuationService] No key metrics TTM for ${upperTicker}`);
      return null;
    }

    const salesPerShare = Number(keyMetricsTTM[0].revenuePerShareTTM || 0);
    if (salesPerShare <= 0) {
      logger.warn(`[ValuationService] Invalid revenue per share TTM for ${upperTicker}: ${salesPerShare}`);
      return null;
    }

    // Get current market price
    const quote = await this.simpleCacheService.getQuote(upperTicker);
    if (!quote) {
      logger.warn(`[ValuationService] No quote data for ${upperTicker}`);
      return null;
    }
    const currentPrice = quote.price;

    // Calculate P/S ratio
    const psRatio = currentPrice / salesPerShare;

    // Calculate PSG ratio: (P/S) / (Growth Rate × 100)
    const psgRatio = psRatio / (revenueGrowthRate * 100);

    // Calculate intrinsic value
    // NOTE: revenueGrowthRate is already in decimal form (e.g., 0.0825 for 8.25%)
    // Formula: IV = Fair_PSG × (CAGR × 100) × Sales_per_Share_TTM
    // Multiplication by 100 converts decimal to percentage for PSG calculation
    // Example: 0.2 × (0.0825 × 100) × 29.45 = 0.2 × 8.25 × 29.45 = $48.59
    const iv = FAIR_PSG * (revenueGrowthRate * 100) * salesPerShare;

    if (!isFinite(iv) || iv <= 0) {
      return null;
    }

    logger.info(`[ValuationService] PSG for ${upperTicker}: FairPSG=${FAIR_PSG}, CAGR=${(revenueGrowthRate*100).toFixed(2)}%, SPS=${salesPerShare.toFixed(2)}, PS=${psRatio.toFixed(2)}, PSG=${psgRatio.toFixed(2)}, IV=$${iv.toFixed(2)}`);

    const response: PSGValuationResponse = {
      ticker: upperTicker,
      iv,
      currentPrice,
      salesPerShare,
      psRatio,
      revenueGrowthRate,
      psgRatio,
      fairPsgRatio: FAIR_PSG,
      confidence: 'MED',
      as_of: new Date().toISOString().split('T')[0],
    };

    // Cache for 24h
    await redisCacheService.set(cacheKey, response, 86400);

    return response;
  } catch (error: any) {
    logger.error(`[ValuationService] Error calculating PSG for ${upperTicker}:`, error.message);
    return null;
  }
}

// ============================================================================
// IMPORTS TO ADD (line 40, after PEValuationResponse):
//   PEGValuationResponse,
//   PSGValuationResponse,
