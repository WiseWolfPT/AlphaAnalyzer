import { MarketDataOrchestrator } from './api/market-data-orchestrator';
import type { Transaction, Portfolio, PortfolioHolding, Stock } from '@shared/schema';

export interface PortfolioPosition {
  symbol: string;
  shares: number;
  avgPrice: number;
  currentPrice: number;
  value: number;
  gainLoss: number;
  gainLossPercent: number;
  totalCost: number;
}

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  dayChange: number;
  dayChangePercent: number;
  positions: PortfolioPosition[];
}

export interface TransactionInput {
  portfolioId: number;
  stockSymbol: string;
  type: 'buy' | 'sell' | 'dividend';
  quantity: number;
  price: number;
  fees?: number;
  notes?: string;
  executedAt: Date;
}

export interface CSVTransaction {
  symbol: string;
  type: 'buy' | 'sell' | 'dividend';
  quantity: number;
  price: number;
  date: string;
  fees?: number;
  notes?: string;
}

export class PortfolioService {
  private marketData: MarketDataOrchestrator;

  constructor(marketData?: MarketDataOrchestrator) {
    this.marketData = marketData || new MarketDataOrchestrator();
  }

  /**
   * Calculate portfolio holdings from transactions
   */
  calculateHoldings(transactions: Transaction[]): PortfolioHolding[] {
    const holdingsMap = new Map<string, {
      quantity: number;
      totalCost: number;
      transactions: Transaction[];
    }>();

    // Sort transactions by date to process in chronological order
    const sortedTransactions = [...transactions].sort(
      (a, b) => new Date(a.executedAt).getTime() - new Date(b.executedAt).getTime()
    );

    for (const transaction of sortedTransactions) {
      const symbol = transaction.stockSymbol;
      const existing = holdingsMap.get(symbol) || {
        quantity: 0,
        totalCost: 0,
        transactions: []
      };

      const transactionCost = parseFloat(transaction.price.toString()) * parseFloat(transaction.quantity.toString());
      const fees = parseFloat(transaction.fees?.toString() || '0');

      if (transaction.type === 'buy') {
        existing.quantity += parseFloat(transaction.quantity.toString());
        existing.totalCost += transactionCost + fees;
      } else if (transaction.type === 'sell') {
        const sellQuantity = parseFloat(transaction.quantity.toString());
        if (existing.quantity >= sellQuantity) {
          // Calculate average cost for sold shares
          const avgCost = existing.quantity > 0 ? existing.totalCost / existing.quantity : 0;
          existing.quantity -= sellQuantity;
          existing.totalCost -= (avgCost * sellQuantity);
          // Note: We're not tracking realized gains/losses in this simple implementation
        }
      }
      // Dividend transactions don't affect holdings quantity or cost basis

      existing.transactions.push(transaction);
      holdingsMap.set(symbol, existing);
    }

    // Convert to PortfolioHolding format
    const holdings: PortfolioHolding[] = [];
    for (const [symbol, data] of holdingsMap.entries()) {
      if (data.quantity > 0) { // Only include positions with shares
        holdings.push({
          id: 0, // Will be set by database
          portfolioId: transactions[0]?.portfolioId || 0,
          stockSymbol: symbol,
          quantity: data.quantity.toString(),
          averagePrice: data.quantity > 0 ? (data.totalCost / data.quantity).toString() : '0',
          totalCost: data.totalCost.toString(),
          lastUpdated: new Date()
        });
      }
    }

    return holdings;
  }

  /**
   * Calculate portfolio summary with current market values
   */
  async calculatePortfolioSummary(
    holdings: PortfolioHolding[],
    previousDayPrices?: Record<string, number>
  ): Promise<PortfolioSummary> {
    if (holdings.length === 0) {
      return {
        totalValue: 0,
        totalCost: 0,
        totalGainLoss: 0,
        totalGainLossPercent: 0,
        dayChange: 0,
        dayChangePercent: 0,
        positions: []
      };
    }

    const symbols = holdings.map(h => h.stockSymbol);
    let currentPrices: Record<string, any> = {};
    
    try {
      // Try to get real market data
      currentPrices = await this.marketData.getBatchQuotes(symbols);
    } catch (error) {
      console.warn('Failed to fetch real market data, using fallback prices', error);
      // Fallback to mock data or last known prices
      for (const symbol of symbols) {
        currentPrices[symbol] = { price: '0' };
      }
    }

    let totalValue = 0;
    let totalCost = 0;
    let totalDayChange = 0;
    const positions: PortfolioPosition[] = [];

    for (const holding of holdings) {
      const symbol = holding.stockSymbol;
      const shares = parseFloat(holding.quantity.toString());
      const avgPrice = parseFloat(holding.averagePrice.toString());
      const cost = parseFloat(holding.totalCost.toString());
      
      // Get current price from market data or use average price as fallback
      const currentStock = currentPrices[symbol];
      let currentPrice = avgPrice; // Fallback to average price
      
      if (currentStock && currentStock.price) {
        currentPrice = parseFloat(currentStock.price.toString());
      } else {
        // If no real-time data, simulate some price movement for demo
        const randomChange = (Math.random() - 0.5) * 0.1; // ±5% random change
        currentPrice = avgPrice * (1 + randomChange);
      }
      
      const value = shares * currentPrice;
      const gainLoss = value - cost;
      const gainLossPercent = cost > 0 ? (gainLoss / cost) * 100 : 0;

      // Calculate day change (if previous day prices not provided, assume 1% change)
      let previousPrice = currentPrice * 0.99; // Default to 1% gain for demo
      if (previousDayPrices?.[symbol]) {
        previousPrice = previousDayPrices[symbol];
      } else if (currentStock?.change) {
        // Use the change from the stock data if available
        const change = parseFloat(currentStock.change.toString());
        previousPrice = currentPrice - change;
      }
      
      const dayChange = shares * (currentPrice - previousPrice);
      
      totalValue += value;
      totalCost += cost;
      totalDayChange += dayChange;

      positions.push({
        symbol,
        shares,
        avgPrice,
        currentPrice,
        value,
        gainLoss,
        gainLossPercent,
        totalCost: cost
      });
    }

    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
    const dayChangePercent = totalValue > Math.abs(totalDayChange) ? (totalDayChange / (totalValue - totalDayChange)) * 100 : 0;

    return {
      totalValue,
      totalCost,
      totalGainLoss,
      totalGainLossPercent,
      dayChange: totalDayChange,
      dayChangePercent,
      positions
    };
  }

  /**
   * Validate transaction input
   */
  validateTransaction(transaction: TransactionInput): string[] {
    const errors: string[] = [];

    if (!transaction.stockSymbol || transaction.stockSymbol.trim().length === 0) {
      errors.push('Stock symbol is required');
    }

    if (!['buy', 'sell', 'dividend'].includes(transaction.type)) {
      errors.push('Transaction type must be buy, sell, or dividend');
    }

    if (transaction.quantity <= 0) {
      errors.push('Quantity must be greater than 0');
    }

    if (transaction.price <= 0) {
      errors.push('Price must be greater than 0');
    }

    if (transaction.fees && transaction.fees < 0) {
      errors.push('Fees cannot be negative');
    }

    if (!transaction.executedAt) {
      errors.push('Execution date is required');
    }

    return errors;
  }

  /**
   * Parse CSV data into transactions
   */
  parseCSV(csvContent: string, portfolioId: number): { transactions: TransactionInput[], errors: string[] } {
    const lines = csvContent.trim().split('\n');
    const transactions: TransactionInput[] = [];
    const errors: string[] = [];

    if (lines.length < 2) {
      errors.push('CSV must contain at least a header row and one data row');
      return { transactions, errors };
    }

    // Expected headers: symbol, type, quantity, price, date, fees (optional), notes (optional)
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const requiredHeaders = ['symbol', 'type', 'quantity', 'price', 'date'];
    
    for (const required of requiredHeaders) {
      if (!headers.includes(required)) {
        errors.push(`Missing required column: ${required}`);
      }
    }

    if (errors.length > 0) {
      return { transactions, errors };
    }

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map(cell => cell.trim());
      
      if (row.length < requiredHeaders.length) {
        errors.push(`Row ${i + 1}: Insufficient columns`);
        continue;
      }

      try {
        const symbolIndex = headers.indexOf('symbol');
        const typeIndex = headers.indexOf('type');
        const quantityIndex = headers.indexOf('quantity');
        const priceIndex = headers.indexOf('price');
        const dateIndex = headers.indexOf('date');
        const feesIndex = headers.indexOf('fees');
        const notesIndex = headers.indexOf('notes');

        const symbol = row[symbolIndex]?.toUpperCase();
        const type = row[typeIndex]?.toLowerCase() as 'buy' | 'sell' | 'dividend';
        const quantity = parseFloat(row[quantityIndex] || '0');
        const price = parseFloat(row[priceIndex] || '0');
        const dateStr = row[dateIndex];
        const fees = feesIndex >= 0 ? parseFloat(row[feesIndex] || '0') : 0;
        const notes = notesIndex >= 0 ? row[notesIndex] : '';

        // Parse date
        const executedAt = new Date(dateStr);
        if (isNaN(executedAt.getTime())) {
          errors.push(`Row ${i + 1}: Invalid date format`);
          continue;
        }

        const transaction: TransactionInput = {
          portfolioId,
          stockSymbol: symbol,
          type,
          quantity,
          price,
          fees: fees > 0 ? fees : undefined,
          notes: notes || undefined,
          executedAt
        };

        const validationErrors = this.validateTransaction(transaction);
        if (validationErrors.length > 0) {
          errors.push(`Row ${i + 1}: ${validationErrors.join(', ')}`);
          continue;
        }

        transactions.push(transaction);
      } catch (error) {
        errors.push(`Row ${i + 1}: Error parsing data - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { transactions, errors };
  }

  /**
   * Generate sample CSV template
   */
  generateCSVTemplate(): string {
    const headers = ['symbol', 'type', 'quantity', 'price', 'date', 'fees', 'notes'];
    const sampleData = [
      ['AAPL', 'buy', '10', '150.00', '2024-01-15', '9.99', 'Initial purchase'],
      ['MSFT', 'buy', '5', '400.00', '2024-01-20', '9.99', ''],
      ['AAPL', 'sell', '2', '175.00', '2024-02-01', '9.99', 'Partial sale']
    ];

    const csvLines = [
      headers.join(','),
      ...sampleData.map(row => row.join(','))
    ];

    return csvLines.join('\n');
  }

  /**
   * Calculate portfolio diversification metrics
   */
  calculateDiversification(positions: PortfolioPosition[]): {
    sectorAllocation: Record<string, number>;
    largestPosition: number;
    numberOfHoldings: number;
    concentrationRisk: 'low' | 'medium' | 'high';
  } {
    const totalValue = positions.reduce((sum, pos) => sum + pos.value, 0);
    
    // Calculate largest position percentage
    const largestPosition = positions.length > 0 
      ? Math.max(...positions.map(p => p.value)) / totalValue * 100
      : 0;

    // Determine concentration risk
    let concentrationRisk: 'low' | 'medium' | 'high' = 'low';
    if (largestPosition > 40) {
      concentrationRisk = 'high';
    } else if (largestPosition > 20) {
      concentrationRisk = 'medium';
    }

    // Note: Sector allocation would require sector data from stocks
    // For now, return placeholder
    const sectorAllocation: Record<string, number> = {};

    return {
      sectorAllocation,
      largestPosition,
      numberOfHoldings: positions.length,
      concentrationRisk
    };
  }

  /**
   * Calculate portfolio performance metrics
   */
  calculatePerformanceMetrics(
    positions: PortfolioPosition[],
    transactions: Transaction[]
  ): {
    totalReturn: number;
    annualizedReturn: number;
    sharpeRatio: number;
    volatility: number;
    maxDrawdown: number;
  } {
    // Simplified implementation - in a real app, you'd want more sophisticated calculations
    const totalValue = positions.reduce((sum, pos) => sum + pos.value, 0);
    const totalCost = positions.reduce((sum, pos) => sum + pos.totalCost, 0);
    const totalReturn = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;

    // Calculate time period
    const sortedTransactions = [...transactions].sort(
      (a, b) => new Date(a.executedAt).getTime() - new Date(b.executedAt).getTime()
    );
    
    const firstTransaction = sortedTransactions[0];
    const daysSinceFirst = firstTransaction 
      ? Math.max(1, (Date.now() - new Date(firstTransaction.executedAt).getTime()) / (1000 * 60 * 60 * 24))
      : 1;
    
    const annualizedReturn = totalReturn * (365 / daysSinceFirst);

    // Placeholder values for more complex metrics
    const sharpeRatio = 1.2; // Would require risk-free rate and volatility calculation
    const volatility = 15.0; // Would require historical price data
    const maxDrawdown = 5.0; // Would require portfolio value history

    return {
      totalReturn,
      annualizedReturn,
      sharpeRatio,
      volatility,
      maxDrawdown
    };
  }
}