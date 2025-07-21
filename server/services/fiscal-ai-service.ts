// Fiscal.ai API Service
// Free trial: 30 days with full access to financial data
// Docs: https://docs.fiscal.ai/docs/guides/free-trial

import fetch from 'node-fetch';
import { db } from '../db';

interface FiscalAIConfig {
  apiKey: string;
  baseUrl: string;
}

interface FinancialStatement {
  symbol: string;
  period: string;
  reportDate: string;
  revenue: number;
  netIncome: number;
  eps: number;
  grossProfit: number;
  operatingIncome: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  freeCashFlow: number;
}

export class FiscalAIService {
  private config: FiscalAIConfig;
  
  constructor() {
    this.config = {
      apiKey: process.env.FISCAL_AI_API_KEY || '',
      baseUrl: 'https://api.fiscal.ai/v1'
    };
  }
  
  // Check if we have a valid API key
  isConfigured(): boolean {
    return !!this.config.apiKey;
  }
  
  // Fetch income statement
  async getIncomeStatement(symbol: string, period: 'annual' | 'quarterly' = 'quarterly'): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('Fiscal.ai API key not configured');
    }
    
    try {
      const response = await fetch(
        `${this.config.baseUrl}/financials/income-statement/${symbol}?period=${period}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Fiscal.ai API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Cache in database
      this.cacheFinancialData(symbol, 'income_statement', data);
      
      return data;
    } catch (error) {
      console.error('Fiscal.ai income statement error:', error);
      
      // Try to return cached data
      return this.getCachedFinancialData(symbol, 'income_statement');
    }
  }
  
  // Fetch balance sheet
  async getBalanceSheet(symbol: string, period: 'annual' | 'quarterly' = 'quarterly'): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('Fiscal.ai API key not configured');
    }
    
    try {
      const response = await fetch(
        `${this.config.baseUrl}/financials/balance-sheet/${symbol}?period=${period}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Fiscal.ai API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Cache in database
      this.cacheFinancialData(symbol, 'balance_sheet', data);
      
      return data;
    } catch (error) {
      console.error('Fiscal.ai balance sheet error:', error);
      
      // Try to return cached data
      return this.getCachedFinancialData(symbol, 'balance_sheet');
    }
  }
  
  // Fetch cash flow statement
  async getCashFlow(symbol: string, period: 'annual' | 'quarterly' = 'quarterly'): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('Fiscal.ai API key not configured');
    }
    
    try {
      const response = await fetch(
        `${this.config.baseUrl}/financials/cash-flow/${symbol}?period=${period}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Fiscal.ai API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Cache in database
      this.cacheFinancialData(symbol, 'cash_flow', data);
      
      return data;
    } catch (error) {
      console.error('Fiscal.ai cash flow error:', error);
      
      // Try to return cached data
      return this.getCachedFinancialData(symbol, 'cash_flow');
    }
  }
  
  // Get all financial data for a symbol
  async getCompleteFinancials(symbol: string): Promise<{
    incomeStatement: any;
    balanceSheet: any;
    cashFlow: any;
  }> {
    const [incomeStatement, balanceSheet, cashFlow] = await Promise.all([
      this.getIncomeStatement(symbol),
      this.getBalanceSheet(symbol),
      this.getCashFlow(symbol)
    ]);
    
    return {
      incomeStatement,
      balanceSheet,
      cashFlow
    };
  }
  
  // Cache financial data in database
  private cacheFinancialData(symbol: string, type: string, data: any): void {
    try {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO financial_cache 
        (symbol, type, data, updated_at) 
        VALUES (?, ?, ?, ?)
      `);
      
      stmt.run(
        symbol,
        type,
        JSON.stringify(data),
        new Date().toISOString()
      );
    } catch (error) {
      console.error('Error caching financial data:', error);
    }
  }
  
  // Get cached financial data
  private getCachedFinancialData(symbol: string, type: string): any {
    try {
      const stmt = db.prepare(`
        SELECT data FROM financial_cache 
        WHERE symbol = ? AND type = ?
        AND updated_at > datetime('now', '-6 hours')
      `);
      
      const row = stmt.get(symbol, type) as any;
      
      if (row?.data) {
        return JSON.parse(row.data);
      }
    } catch (error) {
      console.error('Error retrieving cached financial data:', error);
    }
    
    return null;
  }
}

// Export singleton instance
export const fiscalAI = new FiscalAIService();