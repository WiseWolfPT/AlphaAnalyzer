/**
 * Stock Classifier Tests - ETF Detection
 *
 * Tests for comprehensive ETF detection logic covering:
 * - False positives (NFLX bug - P0 critical)
 * - Known ETFs (SPY, QQQ, ARKK)
 * - Known stocks (AAPL, MSFT, TSLA)
 * - Edge cases (suffix detection, name patterns)
 */

import { isETF, getETFReason, CompanyProfile } from '../stock-classifier';

describe('Stock Classifier - ETF Detection', () => {
  describe('NFLX False Positive Bug (P0 Critical)', () => {
    test('NFLX should be identified as a STOCK, not ETF (without profile)', () => {
      // Without company profile (suffix/list check only)
      expect(isETF('NFLX')).toBe(false);
    });

    test('NFLX should be a STOCK (with correct stock profile)', () => {
      const netflixProfile: CompanyProfile = {
        type: 'stock',
        isEtf: false,
        companyName: 'Netflix Inc',
        sector: 'Communication Services',
        industry: 'Entertainment',
      };

      expect(isETF('NFLX', netflixProfile)).toBe(false);
    });

    test('NFLX should be a STOCK even with "common stock" type', () => {
      // FMP sometimes returns type="common stock" which should NOT trigger ETF
      const netflixProfile: CompanyProfile = {
        type: 'common stock',
        isEtf: false,
        companyName: 'Netflix Inc',
      };

      expect(isETF('NFLX', netflixProfile)).toBe(false);
    });

    test('NFLX should not match generic "trust" or "fund" keywords', () => {
      // Even if FMP mistakenly includes these words, company name should not trigger
      const netflixProfile: CompanyProfile = {
        type: 'stock',
        isEtf: false,
        companyName: 'Netflix Inc',
      };

      expect(isETF('NFLX', netflixProfile)).toBe(false);
      expect(getETFReason('NFLX', netflixProfile)).toBeNull();
    });
  });

  describe('Known ETFs (Should Return True)', () => {
    test('SPY should be identified as ETF (S&P 500)', () => {
      expect(isETF('SPY')).toBe(true);
      expect(getETFReason('SPY')).toBe('Known ETF list (140+ popular ETFs)');
    });

    test('QQQ should be identified as ETF (Nasdaq 100)', () => {
      expect(isETF('QQQ')).toBe(true);
      expect(getETFReason('QQQ')).toBe('Known ETF list (140+ popular ETFs)');
    });

    test('ARKK should be identified as ETF (ARK Innovation)', () => {
      expect(isETF('ARKK')).toBe(true);
      expect(getETFReason('ARKK')).toBe('Known ETF list (140+ popular ETFs)');
    });

    test('VTI should be identified as ETF (Vanguard Total Stock Market)', () => {
      expect(isETF('VTI')).toBe(true);
    });

    test('IWM should be identified as ETF (Russell 2000)', () => {
      expect(isETF('IWM')).toBe(true);
    });
  });

  describe('Known Stocks (Should Return False)', () => {
    test('AAPL should be identified as stock', () => {
      expect(isETF('AAPL')).toBe(false);
    });

    test('MSFT should be identified as stock', () => {
      expect(isETF('MSFT')).toBe(false);
    });

    test('TSLA should be identified as stock', () => {
      expect(isETF('TSLA')).toBe(false);
    });

    test('GOOGL should be identified as stock', () => {
      expect(isETF('GOOGL')).toBe(false);
    });

    test('AMZN should be identified as stock', () => {
      expect(isETF('AMZN')).toBe(false);
    });
  });

  describe('Edge Cases - Suffix Detection', () => {
    test('Should detect .ETF suffix', () => {
      expect(isETF('TEST.ETF')).toBe(true);
      expect(getETFReason('TEST.ETF')).toContain('suffix');
    });

    test('Should detect -ETF suffix', () => {
      expect(isETF('EXAMPLE-ETF')).toBe(true);
      expect(getETFReason('EXAMPLE-ETF')).toContain('suffix');
    });

    test('Should detect .ETP suffix', () => {
      expect(isETF('FUND.ETP')).toBe(true);
    });

    test('Should detect _ETF suffix', () => {
      expect(isETF('TEST_ETF')).toBe(true);
    });
  });

  describe('Edge Cases - Profile Type Detection', () => {
    test('Should detect explicit isEtf=true flag', () => {
      const etfProfile: CompanyProfile = {
        type: 'unknown',
        isEtf: true,
        companyName: 'Some Fund',
      };

      expect(isETF('TEST', etfProfile)).toBe(true);
      expect(getETFReason('TEST', etfProfile)).toContain('isEtf flag');
    });

    test('Should detect type=etf', () => {
      const etfProfile: CompanyProfile = {
        type: 'etf',
        isEtf: false,
        companyName: 'Some Fund',
      };

      expect(isETF('TEST', etfProfile)).toBe(true);
      expect(getETFReason('TEST', etfProfile)).toContain('type=etf');
    });

    test('Should NOT flag generic "fund" without ETF context', () => {
      // Company name is "XYZ Corporation", not an ETF name pattern
      const corporateProfile: CompanyProfile = {
        type: 'stock',
        isEtf: false,
        companyName: 'XYZ Corporation',
      };

      expect(isETF('XYZ', corporateProfile)).toBe(false);
    });

    test('Should NOT flag "trust" in company name without ETF provider', () => {
      // "Trust Bank" is a bank, not an ETF
      const bankProfile: CompanyProfile = {
        type: 'stock',
        isEtf: false,
        companyName: 'Trust Bank Corporation',
      };

      expect(isETF('BANK', bankProfile)).toBe(false);
    });
  });

  describe('Edge Cases - Name Pattern Detection', () => {
    test('Should detect ETF with provider + indicator', () => {
      const vanguardETF: CompanyProfile = {
        type: 'stock', // Even if type is wrong
        isEtf: false,
        companyName: 'Vanguard Total Market Index Fund ETF',
      };

      expect(isETF('TEST', vanguardETF)).toBe(true);
    });

    test('Should require BOTH provider AND indicator for name match', () => {
      // Only "fund" without provider = NOT ETF
      const corporateFund: CompanyProfile = {
        type: 'stock',
        isEtf: false,
        companyName: 'Corporate Pension Fund',
      };

      expect(isETF('CORP', corporateFund)).toBe(false);
    });

    test('Should require BOTH provider AND indicator (provider only)', () => {
      // Only "ishares" without indicator = NOT ETF
      const isharesStock: CompanyProfile = {
        type: 'stock',
        isEtf: false,
        companyName: 'iShares Technology Corporation',
      };

      expect(isETF('TECH', isharesStock)).toBe(false);
    });
  });

  describe('Real-World Edge Cases', () => {
    test('Bank with "trust" in name should NOT be ETF', () => {
      const trustBank: CompanyProfile = {
        type: 'stock',
        isEtf: false,
        companyName: 'Northern Trust Corporation',
        sector: 'Financial Services',
        industry: 'Banks',
      };

      expect(isETF('NTRS', trustBank)).toBe(false);
    });

    test('Mutual fund company stock should NOT be ETF', () => {
      const mutualFundCompany: CompanyProfile = {
        type: 'stock',
        isEtf: false,
        companyName: 'T. Rowe Price Group Inc',
        sector: 'Financial Services',
        industry: 'Asset Management',
      };

      expect(isETF('TROW', mutualFundCompany)).toBe(false);
    });

    test('Real estate trust (REIT) should NOT be ETF', () => {
      const reit: CompanyProfile = {
        type: 'stock',
        isEtf: false,
        companyName: 'Realty Income Corporation',
        sector: 'Real Estate',
        industry: 'REIT',
      };

      expect(isETF('O', reit)).toBe(false);
    });
  });
});
