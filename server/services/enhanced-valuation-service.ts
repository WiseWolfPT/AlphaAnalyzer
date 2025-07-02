import type { 
  ValuationModelType, 
  ValuationParameters, 
  DCFParameters, 
  DDMParameters,
  PEMultipleParameters,
  PEGParameters,
  GrahamParameters,
  AssetBasedParameters,
  RevenueMultipleParameters,
  EBITDAMultipleParameters,
  EnhancedValuationResult,
  ValuationModel,
  ValuationSummary,
  ValuationClassification 
} from "@shared/schema";

/**
 * Enhanced Valuation Service
 * Implements multiple valuation models with sensitivity analysis
 */
export class EnhancedValuationService {
  
  // ENHANCED DCF MODEL WITH SENSITIVITY ANALYSIS
  /**
   * Calculate intrinsic value using Enhanced Discounted Cash Flow model
   * Includes two-stage growth model and sensitivity analysis
   */
  calculateDCF(params: DCFParameters, currentPrice: number): ValuationModel {
    const {
      eps,
      growthRate,
      terminalGrowthRate = 3, // Long-term GDP growth
      horizon,
      requiredReturn,
      marginOfSafety,
      peMultiple
    } = params;

    // Convert percentages to decimals
    const g1 = growthRate / 100; // High growth rate
    const g2 = terminalGrowthRate / 100; // Terminal growth rate
    const r = requiredReturn / 100; // Required return
    const safety = marginOfSafety / 100; // Margin of safety

    // Stage 1: High growth period (explicit forecast)
    let totalPV = 0;
    for (let year = 1; year <= horizon; year++) {
      const futureEPS = eps * Math.pow(1 + g1, year);
      const pv = futureEPS / Math.pow(1 + r, year);
      totalPV += pv;
    }

    // Stage 2: Terminal value (stable growth)
    const terminalEPS = eps * Math.pow(1 + g1, horizon) * (1 + g2);
    const terminalPE = peMultiple || Math.min(15, 1 / g2); // Conservative PE for terminal value
    const terminalValue = terminalEPS * terminalPE;
    const terminalPV = terminalValue / Math.pow(1 + r, horizon);

    // Total intrinsic value
    const intrinsicValue = (totalPV + terminalPV) * (1 - safety);

    // Sensitivity analysis - calculate range
    const sensitivityFactors = [0.8, 0.9, 1.0, 1.1, 1.2]; // ±20% sensitivity
    const sensitivityValues = sensitivityFactors.map(factor => {
      const adjustedGrowth = g1 * factor;
      let adjTotalPV = 0;
      
      for (let year = 1; year <= horizon; year++) {
        const futureEPS = eps * Math.pow(1 + adjustedGrowth, year);
        const pv = futureEPS / Math.pow(1 + r, year);
        adjTotalPV += pv;
      }
      
      const adjTerminalEPS = eps * Math.pow(1 + adjustedGrowth, horizon) * (1 + g2);
      const adjTerminalValue = adjTerminalEPS * terminalPE;
      const adjTerminalPV = adjTerminalValue / Math.pow(1 + r, horizon);
      
      return (adjTotalPV + adjTerminalPV) * (1 - safety);
    });

    const lowEstimate = Math.min(...sensitivityValues);
    const highEstimate = Math.max(...sensitivityValues);
    
    // Calculate confidence score based on input quality
    const confidenceScore = this.calculateConfidenceScore('dcf', {
      hasEPS: eps > 0,
      growthReasonable: growthRate >= 0 && growthRate <= 50,
      horizonReasonable: horizon >= 3 && horizon <= 15,
      returnReasonable: requiredReturn >= 5 && requiredReturn <= 25
    });

    // Determine valuation classification
    const deltaPercent = ((intrinsicValue / currentPrice) - 1) * 100;
    const valuation = this.classifyValuation(deltaPercent);

    return {
      id: 0, // Will be set by database
      stockSymbol: '', // Will be set by caller
      modelType: 'dcf',
      intrinsicValue: Number(intrinsicValue.toFixed(2)),
      currentPrice: Number(currentPrice.toFixed(2)),
      valuation,
      deltaPercent: Number(deltaPercent.toFixed(2)),
      confidenceScore: Number(confidenceScore.toFixed(2)),
      parameters: JSON.stringify(params),
      lowEstimate: Number(lowEstimate.toFixed(2)),
      highEstimate: Number(highEstimate.toFixed(2)),
      calculatedAt: new Date(),
      lastUpdated: new Date()
    };
  }

  // DIVIDEND DISCOUNT MODEL
  /**
   * Calculate intrinsic value using Dividend Discount Model
   * Best for dividend-paying stocks with consistent dividend history
   */
  calculateDDM(params: DDMParameters, currentPrice: number): ValuationModel {
    const {
      currentDividend,
      dividendGrowthRate,
      requiredReturn,
      marginOfSafety
    } = params;

    const g = dividendGrowthRate / 100;
    const r = requiredReturn / 100;
    const safety = marginOfSafety / 100;

    if (r <= g) {
      throw new Error('Required return must be greater than dividend growth rate for DDM');
    }

    // Gordon Growth Model: V = D1 / (r - g)
    const nextDividend = currentDividend * (1 + g);
    const intrinsicValue = (nextDividend / (r - g)) * (1 - safety);

    // Sensitivity analysis on growth rate
    const growthSensitivity = [-0.02, -0.01, 0, 0.01, 0.02]; // ±2% growth sensitivity
    const sensitivityValues = growthSensitivity.map(adjustment => {
      const adjGrowth = g + adjustment;
      if (r <= adjGrowth) return intrinsicValue; // Skip invalid scenarios
      const adjNextDividend = currentDividend * (1 + adjGrowth);
      return (adjNextDividend / (r - adjGrowth)) * (1 - safety);
    }).filter(val => val > 0);

    const lowEstimate = Math.min(...sensitivityValues);
    const highEstimate = Math.max(...sensitivityValues);

    const confidenceScore = this.calculateConfidenceScore('ddm', {
      hasDividend: currentDividend > 0,
      growthReasonable: dividendGrowthRate >= 0 && dividendGrowthRate <= 15,
      returnReasonable: requiredReturn >= 5 && requiredReturn <= 20,
      spreadReasonable: (requiredReturn - dividendGrowthRate) >= 2
    });

    const deltaPercent = ((intrinsicValue / currentPrice) - 1) * 100;
    const valuation = this.classifyValuation(deltaPercent);

    return {
      id: 0,
      stockSymbol: '',
      modelType: 'ddm',
      intrinsicValue: intrinsicValue.toFixed(2),
      currentPrice: currentPrice.toFixed(2),
      valuation,
      deltaPercent: deltaPercent.toFixed(2),
      confidenceScore: confidenceScore.toFixed(2),
      parameters: JSON.stringify(params),
      lowEstimate: lowEstimate.toFixed(2),
      highEstimate: highEstimate.toFixed(2),
      calculatedAt: new Date(),
      lastUpdated: new Date()
    };
  }

  // P/E MULTIPLE VALUATION
  /**
   * Calculate intrinsic value using P/E multiple analysis
   * Compares current P/E to industry and peer averages
   */
  calculatePEMultiple(params: PEMultipleParameters, currentPrice: number): ValuationModel {
    const {
      currentEPS,
      industryPE,
      peerPEs,
      marginOfSafety
    } = params;

    const safety = marginOfSafety / 100;

    // Calculate average peer P/E
    const averagePeerPE = peerPEs.length > 0 ? 
      peerPEs.reduce((sum, pe) => sum + pe, 0) / peerPEs.length : industryPE;

    // Use conservative estimate between industry and peer average
    const fairPE = Math.min(industryPE, averagePeerPE);
    const intrinsicValue = (currentEPS * fairPE) * (1 - safety);

    // Sensitivity analysis using different P/E ratios
    const peSensitivity = [0.8, 0.9, 1.0, 1.1, 1.2]; // ±20% P/E sensitivity
    const sensitivityValues = peSensitivity.map(factor => 
      (currentEPS * fairPE * factor) * (1 - safety)
    );

    const lowEstimate = Math.min(...sensitivityValues);
    const highEstimate = Math.max(...sensitivityValues);

    const confidenceScore = this.calculateConfidenceScore('pe_multiple', {
      hasEPS: currentEPS > 0,
      hasIndustryData: industryPE > 0,
      hasPeerData: peerPEs.length >= 3,
      peReasonable: fairPE >= 5 && fairPE <= 50
    });

    const deltaPercent = ((intrinsicValue / currentPrice) - 1) * 100;
    const valuation = this.classifyValuation(deltaPercent);

    return {
      id: 0,
      stockSymbol: '',
      modelType: 'pe_multiple',
      intrinsicValue: intrinsicValue.toFixed(2),
      currentPrice: currentPrice.toFixed(2),
      valuation,
      deltaPercent: deltaPercent.toFixed(2),
      confidenceScore: confidenceScore.toFixed(2),
      parameters: JSON.stringify(params),
      lowEstimate: lowEstimate.toFixed(2),
      highEstimate: highEstimate.toFixed(2),
      calculatedAt: new Date(),
      lastUpdated: new Date()
    };
  }

  // PEG RATIO ANALYSIS
  /**
   * Calculate intrinsic value using PEG ratio analysis
   * PEG = P/E ratio / Growth rate. Fair value when PEG = 1
   */
  calculatePEG(params: PEGParameters, currentPrice: number): ValuationModel {
    const {
      currentPE,
      growthRate,
      marginOfSafety
    } = params;

    const safety = marginOfSafety / 100;

    // Fair P/E should equal growth rate for PEG = 1
    const fairPE = growthRate;
    const currentEPS = currentPrice / currentPE;
    const intrinsicValue = (currentEPS * fairPE) * (1 - safety);

    // Sensitivity analysis on growth rate estimates
    const growthSensitivity = [0.8, 0.9, 1.0, 1.1, 1.2];
    const sensitivityValues = growthSensitivity.map(factor => {
      const adjGrowthRate = growthRate * factor;
      const adjFairPE = adjGrowthRate;
      return (currentEPS * adjFairPE) * (1 - safety);
    });

    const lowEstimate = Math.min(...sensitivityValues);
    const highEstimate = Math.max(...sensitivityValues);

    const confidenceScore = this.calculateConfidenceScore('peg', {
      hasGrowth: growthRate > 0,
      hasPE: currentPE > 0,
      growthReasonable: growthRate >= 5 && growthRate <= 50,
      peReasonable: currentPE >= 5 && currentPE <= 100
    });

    const deltaPercent = ((intrinsicValue / currentPrice) - 1) * 100;
    const valuation = this.classifyValuation(deltaPercent);

    return {
      id: 0,
      stockSymbol: '',
      modelType: 'peg',
      intrinsicValue: intrinsicValue.toFixed(2),
      currentPrice: currentPrice.toFixed(2),
      valuation,
      deltaPercent: deltaPercent.toFixed(2),
      confidenceScore: confidenceScore.toFixed(2),
      parameters: JSON.stringify(params),
      lowEstimate: lowEstimate.toFixed(2),
      highEstimate: highEstimate.toFixed(2),
      calculatedAt: new Date(),
      lastUpdated: new Date()
    };
  }

  // BENJAMIN GRAHAM FORMULA
  /**
   * Calculate intrinsic value using Benjamin Graham's formula
   * V = EPS × (8.5 + 2g) × 4.4 / Y
   * Where g = expected growth rate, Y = AAA corporate bond yield
   */
  calculateGraham(params: GrahamParameters, currentPrice: number): ValuationModel {
    const {
      eps,
      expectedGrowthRate,
      aaaCorpBondYield,
      marginOfSafety
    } = params;

    const safety = marginOfSafety / 100;
    const growthRate = Math.min(expectedGrowthRate, 20); // Graham capped growth at 20%

    // Graham Formula: V = EPS × (8.5 + 2g) × 4.4 / Y
    const intrinsicValue = (eps * (8.5 + 2 * growthRate) * 4.4 / aaaCorpBondYield) * (1 - safety);

    // Sensitivity analysis on growth rate
    const growthSensitivity = [0.8, 0.9, 1.0, 1.1, 1.2];
    const sensitivityValues = growthSensitivity.map(factor => {
      const adjGrowth = Math.min(growthRate * factor, 20);
      return (eps * (8.5 + 2 * adjGrowth) * 4.4 / aaaCorpBondYield) * (1 - safety);
    });

    const lowEstimate = Math.min(...sensitivityValues);
    const highEstimate = Math.max(...sensitivityValues);

    const confidenceScore = this.calculateConfidenceScore('graham', {
      hasEPS: eps > 0,
      hasYield: aaaCorpBondYield > 0,
      growthReasonable: expectedGrowthRate >= 0 && expectedGrowthRate <= 20,
      yieldReasonable: aaaCorpBondYield >= 1 && aaaCorpBondYield <= 15
    });

    const deltaPercent = ((intrinsicValue / currentPrice) - 1) * 100;
    const valuation = this.classifyValuation(deltaPercent);

    return {
      id: 0,
      stockSymbol: '',
      modelType: 'graham',
      intrinsicValue: intrinsicValue.toFixed(2),
      currentPrice: currentPrice.toFixed(2),
      valuation,
      deltaPercent: deltaPercent.toFixed(2),
      confidenceScore: confidenceScore.toFixed(2),
      parameters: JSON.stringify(params),
      lowEstimate: lowEstimate.toFixed(2),
      highEstimate: highEstimate.toFixed(2),
      calculatedAt: new Date(),
      lastUpdated: new Date()
    };
  }

  // ASSET-BASED VALUATION
  /**
   * Calculate intrinsic value based on book value and assets
   * Useful for asset-heavy companies or liquidation scenarios
   */
  calculateAssetBased(params: AssetBasedParameters, currentPrice: number): ValuationModel {
    const {
      bookValue,
      tangibleBookValue,
      adjustments,
      marginOfSafety
    } = params;

    const safety = marginOfSafety / 100;

    // Use tangible book value + adjustments as base
    const adjustedBookValue = tangibleBookValue + adjustments;
    const intrinsicValue = adjustedBookValue * (1 - safety);

    // Sensitivity analysis on book value adjustments
    const adjustmentSensitivity = [0.8, 0.9, 1.0, 1.1, 1.2];
    const sensitivityValues = adjustmentSensitivity.map(factor => 
      (tangibleBookValue + adjustments * factor) * (1 - safety)
    );

    const lowEstimate = Math.min(...sensitivityValues);
    const highEstimate = Math.max(...sensitivityValues);

    const confidenceScore = this.calculateConfidenceScore('asset_based', {
      hasBookValue: bookValue > 0,
      hasTangibleBV: tangibleBookValue > 0,
      reasonableAdjustments: Math.abs(adjustments) <= bookValue * 0.5
    });

    const deltaPercent = ((intrinsicValue / currentPrice) - 1) * 100;
    const valuation = this.classifyValuation(deltaPercent);

    return {
      id: 0,
      stockSymbol: '',
      modelType: 'asset_based',
      intrinsicValue: intrinsicValue.toFixed(2),
      currentPrice: currentPrice.toFixed(2),
      valuation,
      deltaPercent: deltaPercent.toFixed(2),
      confidenceScore: confidenceScore.toFixed(2),
      parameters: JSON.stringify(params),
      lowEstimate: lowEstimate.toFixed(2),
      highEstimate: highEstimate.toFixed(2),
      calculatedAt: new Date(),
      lastUpdated: new Date()
    };
  }

  // REVENUE MULTIPLE VALUATION
  /**
   * Calculate intrinsic value using revenue multiples
   * Useful for growth companies with minimal or negative earnings
   */
  calculateRevenueMultiple(params: RevenueMultipleParameters, currentPrice: number): ValuationModel {
    const {
      revenue,
      industryRevenueMultiple,
      peerMultiples,
      marginOfSafety
    } = params;

    const safety = marginOfSafety / 100;

    // Use average of industry and peer multiples
    const averagePeerMultiple = peerMultiples.length > 0 ?
      peerMultiples.reduce((sum, multiple) => sum + multiple, 0) / peerMultiples.length : industryRevenueMultiple;

    const fairMultiple = (industryRevenueMultiple + averagePeerMultiple) / 2;
    const intrinsicValue = (revenue * fairMultiple) * (1 - safety);

    // Sensitivity analysis on revenue multiples
    const multipleSensitivity = [0.8, 0.9, 1.0, 1.1, 1.2];
    const sensitivityValues = multipleSensitivity.map(factor =>
      (revenue * fairMultiple * factor) * (1 - safety)
    );

    const lowEstimate = Math.min(...sensitivityValues);
    const highEstimate = Math.max(...sensitivityValues);

    const confidenceScore = this.calculateConfidenceScore('revenue_multiple', {
      hasRevenue: revenue > 0,
      hasIndustryData: industryRevenueMultiple > 0,
      hasPeerData: peerMultiples.length >= 3,
      multipleReasonable: fairMultiple >= 0.5 && fairMultiple <= 20
    });

    const deltaPercent = ((intrinsicValue / currentPrice) - 1) * 100;
    const valuation = this.classifyValuation(deltaPercent);

    return {
      id: 0,
      stockSymbol: '',
      modelType: 'revenue_multiple',
      intrinsicValue: intrinsicValue.toFixed(2),
      currentPrice: currentPrice.toFixed(2),
      valuation,
      deltaPercent: deltaPercent.toFixed(2),
      confidenceScore: confidenceScore.toFixed(2),
      parameters: JSON.stringify(params),
      lowEstimate: lowEstimate.toFixed(2),
      highEstimate: highEstimate.toFixed(2),
      calculatedAt: new Date(),
      lastUpdated: new Date()
    };
  }

  // EBITDA MULTIPLE VALUATION
  /**
   * Calculate intrinsic value using EBITDA multiples
   * Common for mature companies and M&A analysis
   */
  calculateEBITDAMultiple(params: EBITDAMultipleParameters, currentPrice: number): ValuationModel {
    const {
      ebitda,
      industryEVEBITDA,
      peerMultiples,
      netDebt,
      marginOfSafety
    } = params;

    const safety = marginOfSafety / 100;

    // Use average of industry and peer EV/EBITDA multiples
    const averagePeerMultiple = peerMultiples.length > 0 ?
      peerMultiples.reduce((sum, multiple) => sum + multiple, 0) / peerMultiples.length : industryEVEBITDA;

    const fairMultiple = (industryEVEBITDA + averagePeerMultiple) / 2;
    
    // Enterprise Value = EBITDA × Multiple
    // Equity Value = Enterprise Value - Net Debt
    const enterpriseValue = ebitda * fairMultiple;
    const equityValue = enterpriseValue - netDebt;
    const intrinsicValue = equityValue * (1 - safety);

    // Sensitivity analysis on EBITDA multiples
    const multipleSensitivity = [0.8, 0.9, 1.0, 1.1, 1.2];
    const sensitivityValues = multipleSensitivity.map(factor => {
      const adjEV = ebitda * fairMultiple * factor;
      const adjEquityValue = adjEV - netDebt;
      return adjEquityValue * (1 - safety);
    });

    const lowEstimate = Math.min(...sensitivityValues);
    const highEstimate = Math.max(...sensitivityValues);

    const confidenceScore = this.calculateConfidenceScore('ebitda_multiple', {
      hasEBITDA: ebitda > 0,
      hasIndustryData: industryEVEBITDA > 0,
      hasPeerData: peerMultiples.length >= 3,
      multipleReasonable: fairMultiple >= 3 && fairMultiple <= 25,
      positiveEquityValue: equityValue > 0
    });

    const deltaPercent = ((intrinsicValue / currentPrice) - 1) * 100;
    const valuation = this.classifyValuation(deltaPercent);

    return {
      id: 0,
      stockSymbol: '',
      modelType: 'ebitda_multiple',
      intrinsicValue: intrinsicValue.toFixed(2),
      currentPrice: currentPrice.toFixed(2),
      valuation,
      deltaPercent: deltaPercent.toFixed(2),
      confidenceScore: confidenceScore.toFixed(2),
      parameters: JSON.stringify(params),
      lowEstimate: lowEstimate.toFixed(2),
      highEstimate: highEstimate.toFixed(2),
      calculatedAt: new Date(),
      lastUpdated: new Date()
    };
  }

  // MONTE CARLO SIMULATION FOR VALUE UNCERTAINTY
  /**
   * Run Monte Carlo simulation to estimate value distribution
   * Useful for understanding valuation uncertainty
   */
  runMonteCarloSimulation(
    modelType: ValuationModelType,
    baseParams: ValuationParameters,
    currentPrice: number,
    iterations: number = 1000
  ): { mean: number; stdDev: number; percentiles: { p10: number; p25: number; p50: number; p75: number; p90: number } } {
    const values: number[] = [];

    for (let i = 0; i < iterations; i++) {
      // Add random variation to key parameters (±10%)
      const perturbedParams = this.perturbParameters(modelType, baseParams);
      
      let result: ValuationModel;
      switch (modelType) {
        case 'dcf':
          result = this.calculateDCF(perturbedParams as DCFParameters, currentPrice);
          break;
        case 'ddm':
          result = this.calculateDDM(perturbedParams as DDMParameters, currentPrice);
          break;
        case 'pe_multiple':
          result = this.calculatePEMultiple(perturbedParams as PEMultipleParameters, currentPrice);
          break;
        case 'peg':
          result = this.calculatePEG(perturbedParams as PEGParameters, currentPrice);
          break;
        case 'graham':
          result = this.calculateGraham(perturbedParams as GrahamParameters, currentPrice);
          break;
        case 'asset_based':
          result = this.calculateAssetBased(perturbedParams as AssetBasedParameters, currentPrice);
          break;
        case 'revenue_multiple':
          result = this.calculateRevenueMultiple(perturbedParams as RevenueMultipleParameters, currentPrice);
          break;
        case 'ebitda_multiple':
          result = this.calculateEBITDAMultiple(perturbedParams as EBITDAMultipleParameters, currentPrice);
          break;
        default:
          throw new Error(`Unsupported model type: ${modelType}`);
      }
      
      values.push(result.intrinsicValue);
    }

    // Calculate statistics
    values.sort((a, b) => a - b);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return {
      mean,
      stdDev,
      percentiles: {
        p10: values[Math.floor(0.1 * values.length)],
        p25: values[Math.floor(0.25 * values.length)],
        p50: values[Math.floor(0.5 * values.length)],
        p75: values[Math.floor(0.75 * values.length)],
        p90: values[Math.floor(0.9 * values.length)]
      }
    };
  }

  // UTILITY METHODS

  private perturbParameters(modelType: ValuationModelType, params: ValuationParameters): ValuationParameters {
    // Add random variation (±10%) to key parameters for Monte Carlo simulation
    const perturbValue = (value: number, maxVariation: number = 0.1): number => {
      const variation = (Math.random() - 0.5) * 2 * maxVariation;
      return Math.max(0, value * (1 + variation));
    };

    switch (modelType) {
      case 'dcf':
        const dcfParams = params as DCFParameters;
        return {
          ...dcfParams,
          growthRate: perturbValue(dcfParams.growthRate),
          requiredReturn: perturbValue(dcfParams.requiredReturn, 0.05),
          eps: perturbValue(dcfParams.eps, 0.15)
        };
      
      case 'ddm':
        const ddmParams = params as DDMParameters;
        return {
          ...ddmParams,
          dividendGrowthRate: perturbValue(ddmParams.dividendGrowthRate),
          currentDividend: perturbValue(ddmParams.currentDividend, 0.05)
        };

      // Add other model perturbations as needed
      default:
        return params;
    }
  }

  private calculateConfidenceScore(modelType: ValuationModelType, checks: Record<string, boolean>): number {
    const totalChecks = Object.keys(checks).length;
    const passedChecks = Object.values(checks).filter(Boolean).length;
    
    let baseScore = passedChecks / totalChecks;
    
    // Adjust based on model reliability
    const modelReliability = {
      'dcf': 0.9,
      'ddm': 0.85,
      'pe_multiple': 0.8,
      'peg': 0.75,
      'graham': 0.8,
      'asset_based': 0.7,
      'revenue_multiple': 0.6,
      'ebitda_multiple': 0.75
    };

    return Math.min(1.0, baseScore * (modelReliability[modelType] || 0.7));
  }

  private classifyValuation(deltaPercent: number): ValuationClassification {
    if (deltaPercent <= -10) return 'overvalued';
    if (deltaPercent >= 10) return 'undervalued';
    return 'neutral';
  }

  // COMPREHENSIVE VALUATION ANALYSIS
  /**
   * Calculate all applicable valuation models for a stock
   * Returns comprehensive analysis with consensus value
   */
  async calculateComprehensiveValuation(
    symbol: string,
    stockData: any, // Stock fundamental data
    marketData: any // Market/peer data
  ): Promise<EnhancedValuationResult> {
    const models: ValuationModel[] = [];
    const currentPrice = stockData.currentPrice;

    try {
      // DCF Model (always applicable if EPS > 0)
      if (stockData.eps > 0) {
        const dcfParams: DCFParameters = {
          eps: stockData.eps,
          growthRate: stockData.growthRate || 10,
          horizon: 10,
          requiredReturn: 12,
          marginOfSafety: 25,
          peMultiple: stockData.peRatio
        };
        const dcfResult = this.calculateDCF(dcfParams, currentPrice);
        dcfResult.stockSymbol = symbol;
        models.push(dcfResult);
      }

      // DDM Model (for dividend-paying stocks)
      if (stockData.dividendYield && stockData.dividendYield > 0) {
        const ddmParams: DDMParameters = {
          currentDividend: stockData.dividend || (currentPrice * stockData.dividendYield / 100),
          dividendGrowthRate: stockData.dividendGrowthRate || 5,
          requiredReturn: 10,
          marginOfSafety: 20
        };
        const ddmResult = this.calculateDDM(ddmParams, currentPrice);
        ddmResult.stockSymbol = symbol;
        models.push(ddmResult);
      }

      // P/E Multiple Model
      if (stockData.eps > 0 && marketData.industryPE) {
        const peParams: PEMultipleParameters = {
          currentEPS: stockData.eps,
          industryPE: marketData.industryPE,
          peerPEs: marketData.peerPEs || [],
          marginOfSafety: 20
        };
        const peResult = this.calculatePEMultiple(peParams, currentPrice);
        peResult.stockSymbol = symbol;
        models.push(peResult);
      }

      // Add other models based on available data...

    } catch (error) {
      console.error(`Error calculating valuation models for ${symbol}:`, error);
    }

    // Calculate consensus and summary
    const summary = this.calculateValuationSummary(symbol, models, currentPrice);
    
    return {
      symbol,
      currentPrice,
      models,
      summary,
      consensus: {
        value: summary.consensusValue || 0,
        classification: summary.consensusValuation || 'neutral',
        confidence: summary.consensusConfidence || 0,
        spread: summary.valueSpread || 0
      },
      ranges: {
        bullish: summary.bullishValue || 0,
        bearish: summary.bearishValue || 0,
        mostLikely: summary.consensusValue || 0
      }
    };
  }

  private calculateValuationSummary(symbol: string, models: ValuationModel[], currentPrice: number): ValuationSummary {
    if (models.length === 0) {
      return {
        id: 0,
        stockSymbol: symbol,
        consensusValue: null,
        consensusValuation: null,
        consensusConfidence: null,
        modelCount: 0,
        valueSpread: null,
        bullishValue: null,
        bearishValue: null,
        currentPrice,
        marketCap: null,
        lastUpdated: new Date()
      };
    }

    const values = models.map(m => parseFloat(m.intrinsicValue));
    const confidenceWeightedValue = models.reduce((sum, model) => 
      sum + (parseFloat(model.intrinsicValue) * (parseFloat(model.confidenceScore) || 0.5)), 0
    ) / models.reduce((sum, model) => sum + (parseFloat(model.confidenceScore) || 0.5), 0);

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    const consensusValue = confidenceWeightedValue;
    const deltaPercent = ((consensusValue / currentPrice) - 1) * 100;
    const consensusValuation = this.classifyValuation(deltaPercent);
    const consensusConfidence = models.reduce((sum, model) => sum + (parseFloat(model.confidenceScore) || 0), 0) / models.length;

    return {
      id: 0,
      stockSymbol: symbol,
      consensusValue: consensusValue.toFixed(2),
      consensusValuation,
      consensusConfidence: consensusConfidence.toFixed(2),
      modelCount: models.length,
      valueSpread: stdDev.toFixed(2),
      bullishValue: Math.max(...values).toFixed(2),
      bearishValue: Math.min(...values).toFixed(2),
      currentPrice: currentPrice.toFixed(2),
      marketCap: null,
      lastUpdated: new Date()
    };
  }
}

export const enhancedValuationService = new EnhancedValuationService();