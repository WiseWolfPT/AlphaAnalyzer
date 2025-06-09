import type { 
  Stock, 
  InsertStock, 
  Watchlist, 
  InsertWatchlist, 
  WatchlistStock, 
  InsertWatchlistStock, 
  IntrinsicValue, 
  InsertIntrinsicValue, 
  Earnings, 
  InsertEarnings, 
  RecentSearch, 
  InsertRecentSearch 
} from "@shared/schema";
import { 
  stocks, 
  watchlists, 
  watchlistStocks, 
  intrinsicValues, 
  earnings, 
  recentSearches 
} from "@shared/schema";
import { db } from "./db";
import { eq, like, desc, sql, or, and, not, ilike, notInArray } from "drizzle-orm";

export interface IStorage {
  // Stocks
  getStocks(limit?: number, offset?: number): Promise<Stock[]>;
  getStock(symbol: string): Promise<Stock | undefined>;
  createStock(stock: InsertStock): Promise<Stock>;
  updateStock(symbol: string, stock: Partial<InsertStock>): Promise<Stock | undefined>;
  searchStocks(query: string, limit?: number): Promise<Stock[]>;
  getStocksBySector(sector: string): Promise<Stock[]>;

  // Watchlists
  getWatchlists(userId: string): Promise<Watchlist[]>;
  getWatchlist(id: number): Promise<Watchlist | undefined>;
  createWatchlist(watchlist: InsertWatchlist): Promise<Watchlist>;
  updateWatchlist(id: number, watchlist: Partial<InsertWatchlist>): Promise<Watchlist | undefined>;
  deleteWatchlist(id: number): Promise<boolean>;

  // Watchlist Stocks
  getWatchlistStocks(watchlistId: number): Promise<WatchlistStock[]>;
  addStockToWatchlist(watchlistStock: InsertWatchlistStock): Promise<WatchlistStock>;
  removeStockFromWatchlist(watchlistId: number, stockSymbol: string): Promise<boolean>;

  // Intrinsic Values
  getIntrinsicValues(limit?: number): Promise<IntrinsicValue[]>;
  getIntrinsicValue(stockSymbol: string): Promise<IntrinsicValue | undefined>;
  createIntrinsicValue(intrinsicValue: InsertIntrinsicValue): Promise<IntrinsicValue>;
  updateIntrinsicValue(stockSymbol: string, intrinsicValue: Partial<InsertIntrinsicValue>): Promise<IntrinsicValue | undefined>;

  // Earnings
  getEarnings(limit?: number): Promise<Earnings[]>;
  getEarningsForStock(stockSymbol: string): Promise<Earnings[]>;
  createEarning(earning: InsertEarnings): Promise<Earnings>;

  // Recent Searches
  getRecentSearches(userId: string, limit?: number): Promise<RecentSearch[]>;
  addRecentSearch(search: InsertRecentSearch): Promise<RecentSearch>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    // Initialize database with default data if empty
    this.initializeDatabase();
  }

  private async initializeDatabase() {
    try {
      // Check if stocks table has data
      const existingStocks = await db.select().from(stocks).limit(1);
      
      if (existingStocks.length === 0) {
        // Initialize with default stocks
        await this.seedDefaultData();
      }
    } catch (error) {
      console.error("Database initialization error:", error);
    }
  }

  private async seedDefaultData() {
    const defaultStocks = [
      { symbol: "AAPL", name: "Apple Inc.", price: "175.43", change: "2.34", changePercent: "1.35", marketCap: "$2.7T", sector: "Technology", eps: "6.13", peRatio: "28.6", logo: "https://logo.clearbit.com/apple.com" },
      { symbol: "MSFT", name: "Microsoft Corporation", price: "378.85", change: "-1.23", changePercent: "-0.32", marketCap: "$2.8T", sector: "Technology", eps: "9.65", peRatio: "39.2", logo: "https://logo.clearbit.com/microsoft.com" },
      { symbol: "GOOGL", name: "Alphabet Inc.", price: "141.28", change: "0.89", changePercent: "0.63", marketCap: "$1.8T", sector: "Technology", eps: "5.61", peRatio: "25.2", logo: "https://logo.clearbit.com/google.com" },
      { symbol: "AMZN", name: "Amazon.com Inc.", price: "142.56", change: "3.45", changePercent: "2.48", marketCap: "$1.5T", sector: "Consumer Discretionary", eps: "0.98", peRatio: "145.5", logo: "https://logo.clearbit.com/amazon.com" },
      { symbol: "TSLA", name: "Tesla Inc.", price: "248.79", change: "-5.67", changePercent: "-2.23", marketCap: "$792B", sector: "Automotive", eps: "4.73", peRatio: "52.6", logo: "https://logo.clearbit.com/tesla.com" },
      { symbol: "NVDA", name: "NVIDIA Corporation", price: "875.28", change: "12.34", changePercent: "1.43", marketCap: "$2.2T", sector: "Technology", eps: "12.96", peRatio: "67.5", logo: "https://logo.clearbit.com/nvidia.com" },
      { symbol: "META", name: "Meta Platforms Inc.", price: "494.32", change: "10.42", changePercent: "2.15", marketCap: "$1.3T", sector: "Technology", eps: "14.87", peRatio: "33.2", logo: "https://logo.clearbit.com/meta.com" },
      { symbol: "BRK.B", name: "Berkshire Hathaway Inc.", price: "432.18", change: "3.58", changePercent: "0.84", marketCap: "$954B", sector: "Financial Services", eps: "22.55", peRatio: "19.2", logo: "https://logo.clearbit.com/berkshirehathaway.com" },
    ];

    // Insert stocks
    for (const stockData of defaultStocks) {
      await db.insert(stocks).values({
        ...stockData,
        lastUpdated: new Date(),
      }).onConflictDoNothing();
    }

    // Insert intrinsic values
    const intrinsicValuesData = [
      { stockSymbol: "AAPL", intrinsicValue: "185.50", currentPrice: "175.43", valuation: "undervalued", deltaPercent: "5.74", eps: "6.13", growthRate: "8.00", peMultiple: "25.0", requiredReturn: "15.00", marginOfSafety: "25.00", futureEPS: "13.24", futurePrice: "331.00", presentValue: "247.33" },
      { stockSymbol: "MSFT", intrinsicValue: "320.45", currentPrice: "378.85", valuation: "overvalued", deltaPercent: "-15.42", eps: "9.65", growthRate: "6.50", peMultiple: "28.0", requiredReturn: "15.00", marginOfSafety: "25.00", futureEPS: "18.27", futurePrice: "511.56", presentValue: "427.27" },
      { stockSymbol: "GOOGL", intrinsicValue: "155.80", currentPrice: "141.28", valuation: "undervalued", deltaPercent: "10.28", eps: "5.61", growthRate: "12.00", peMultiple: "22.0", requiredReturn: "15.00", marginOfSafety: "25.00", futureEPS: "17.37", futurePrice: "382.14", presentValue: "207.73" },
      { stockSymbol: "AMZN", intrinsicValue: "165.20", currentPrice: "142.56", valuation: "undervalued", deltaPercent: "15.89", eps: "0.98", growthRate: "18.00", peMultiple: "35.0", requiredReturn: "15.00", marginOfSafety: "25.00", futureEPS: "5.15", futurePrice: "180.25", presentValue: "220.27" },
      { stockSymbol: "TSLA", intrinsicValue: "195.30", currentPrice: "248.79", valuation: "overvalued", deltaPercent: "-21.51", eps: "4.73", growthRate: "15.00", peMultiple: "35.0", requiredReturn: "15.00", marginOfSafety: "25.00", futureEPS: "19.12", futurePrice: "669.20", presentValue: "260.40" },
      { stockSymbol: "NVDA", intrinsicValue: "650.80", currentPrice: "875.28", valuation: "overvalued", deltaPercent: "-25.65", eps: "12.96", growthRate: "20.00", peMultiple: "35.0", requiredReturn: "15.00", marginOfSafety: "25.00", futureEPS: "79.65", futurePrice: "2787.75", presentValue: "867.73" },
      { stockSymbol: "META", intrinsicValue: "420.15", currentPrice: "494.32", valuation: "overvalued", deltaPercent: "-15.00", eps: "14.87", growthRate: "10.00", peMultiple: "28.0", requiredReturn: "15.00", marginOfSafety: "25.00", futureEPS: "38.57", futurePrice: "1079.96", presentValue: "560.20" },
      { stockSymbol: "BRK.B", intrinsicValue: "445.20", currentPrice: "432.18", valuation: "neutral", deltaPercent: "3.01", eps: "22.55", growthRate: "5.00", peMultiple: "18.0", requiredReturn: "15.00", marginOfSafety: "25.00", futureEPS: "36.74", futurePrice: "661.32", presentValue: "594.27" }
    ];

    for (const data of intrinsicValuesData) {
      await db.insert(intrinsicValues).values({
        ...data,
        calculatedAt: new Date(),
      }).onConflictDoNothing();
    }
  }

  // Stocks
  async getStocks(limit = 50, offset = 0): Promise<Stock[]> {
    return await db.select().from(stocks).limit(limit).offset(offset);
  }

  async getStock(symbol: string): Promise<Stock | undefined> {
    const [stock] = await db.select().from(stocks).where(eq(stocks.symbol, symbol));
    return stock || undefined;
  }

  async createStock(stockData: InsertStock): Promise<Stock> {
    const [stock] = await db
      .insert(stocks)
      .values({
        ...stockData,
        lastUpdated: new Date(),
      })
      .returning();
    return stock;
  }

  async updateStock(symbol: string, stockData: Partial<InsertStock>): Promise<Stock | undefined> {
    const [stock] = await db
      .update(stocks)
      .set({ ...stockData, lastUpdated: new Date() })
      .where(eq(stocks.symbol, symbol))
      .returning();
    return stock || undefined;
  }

  async searchStocks(query: string, limit = 10): Promise<Stock[]> {
    if (!query.trim()) return [];
    
    const searchTerm = query.toLowerCase().trim();
    
    // Get all matching stocks and sort them by relevance
    const results = await db
      .select()
      .from(stocks)
      .where(
        or(
          ilike(stocks.symbol, `%${searchTerm}%`),
          ilike(stocks.name, `%${searchTerm}%`)
        )
      );
    
    // Sort results by relevance: exact symbol match first, then symbol starts with, then name starts with, then contains
    const sortedResults = results.sort((a: Stock, b: Stock) => {
      const aSymbol = a.symbol.toLowerCase();
      const aName = a.name.toLowerCase();
      const bSymbol = b.symbol.toLowerCase();
      const bName = b.name.toLowerCase();
      
      // Exact symbol match gets highest priority
      if (aSymbol === searchTerm && bSymbol !== searchTerm) return -1;
      if (bSymbol === searchTerm && aSymbol !== searchTerm) return 1;
      
      // Symbol starts with search term
      if (aSymbol.startsWith(searchTerm) && !bSymbol.startsWith(searchTerm)) return -1;
      if (bSymbol.startsWith(searchTerm) && !aSymbol.startsWith(searchTerm)) return 1;
      
      // Name starts with search term
      if (aName.startsWith(searchTerm) && !bName.startsWith(searchTerm)) return -1;
      if (bName.startsWith(searchTerm) && !aName.startsWith(searchTerm)) return 1;
      
      // Both contain the term, sort alphabetically
      return aSymbol.localeCompare(bSymbol);
    });
    
    return sortedResults.slice(0, limit);
  }

  async getStocksBySector(sector: string): Promise<Stock[]> {
    return await db.select().from(stocks).where(eq(stocks.sector, sector));
  }

  // Watchlists
  async getWatchlists(userId: string): Promise<Watchlist[]> {
    return await db.select().from(watchlists).where(eq(watchlists.userId, userId));
  }

  async getWatchlist(id: number): Promise<Watchlist | undefined> {
    const [watchlist] = await db.select().from(watchlists).where(eq(watchlists.id, id));
    return watchlist || undefined;
  }

  async createWatchlist(watchlistData: InsertWatchlist): Promise<Watchlist> {
    const [watchlist] = await db
      .insert(watchlists)
      .values({
        ...watchlistData,
        createdAt: new Date(),
      })
      .returning();
    return watchlist;
  }

  async updateWatchlist(id: number, watchlistData: Partial<InsertWatchlist>): Promise<Watchlist | undefined> {
    const [watchlist] = await db
      .update(watchlists)
      .set(watchlistData)
      .where(eq(watchlists.id, id))
      .returning();
    return watchlist || undefined;
  }

  async deleteWatchlist(id: number): Promise<boolean> {
    const result = await db.delete(watchlists).where(eq(watchlists.id, id));
    return result.rowCount > 0;
  }

  // Watchlist Stocks
  async getWatchlistStocks(watchlistId: number): Promise<WatchlistStock[]> {
    return await db.select().from(watchlistStocks).where(eq(watchlistStocks.watchlistId, watchlistId));
  }

  async addStockToWatchlist(watchlistStockData: InsertWatchlistStock): Promise<WatchlistStock> {
    const [watchlistStock] = await db
      .insert(watchlistStocks)
      .values({
        ...watchlistStockData,
        addedAt: new Date(),
      })
      .returning();
    return watchlistStock;
  }

  async removeStockFromWatchlist(watchlistId: number, stockSymbol: string): Promise<boolean> {
    const result = await db
      .delete(watchlistStocks)
      .where(
        sql`${watchlistStocks.watchlistId} = ${watchlistId} AND ${watchlistStocks.stockSymbol} = ${stockSymbol}`
      );
    return result.rowCount > 0;
  }

  // Intrinsic Values
  async getIntrinsicValues(limit = 50): Promise<IntrinsicValue[]> {
    return await db.select().from(intrinsicValues).limit(limit).orderBy(desc(intrinsicValues.calculatedAt));
  }

  async getIntrinsicValue(stockSymbol: string): Promise<IntrinsicValue | undefined> {
    const [intrinsicValue] = await db.select().from(intrinsicValues).where(eq(intrinsicValues.stockSymbol, stockSymbol));
    return intrinsicValue || undefined;
  }

  async createIntrinsicValue(intrinsicValueData: InsertIntrinsicValue): Promise<IntrinsicValue> {
    const [intrinsicValue] = await db
      .insert(intrinsicValues)
      .values({
        ...intrinsicValueData,
        calculatedAt: new Date(),
      })
      .returning();
    return intrinsicValue;
  }

  async updateIntrinsicValue(stockSymbol: string, intrinsicValueData: Partial<InsertIntrinsicValue>): Promise<IntrinsicValue | undefined> {
    const [intrinsicValue] = await db
      .update(intrinsicValues)
      .set({ ...intrinsicValueData, calculatedAt: new Date() })
      .where(eq(intrinsicValues.stockSymbol, stockSymbol))
      .returning();
    return intrinsicValue || undefined;
  }

  // Earnings
  async getEarnings(limit = 50): Promise<Earnings[]> {
    return await db.select().from(earnings).limit(limit).orderBy(desc(earnings.date));
  }

  async getEarningsForStock(stockSymbol: string): Promise<Earnings[]> {
    return await db.select().from(earnings).where(eq(earnings.stockSymbol, stockSymbol)).orderBy(desc(earnings.date));
  }

  async createEarning(earningData: InsertEarnings): Promise<Earnings> {
    const [earning] = await db
      .insert(earnings)
      .values({
        ...earningData,
        estimatedEPS: earningData.estimatedEPS || null,
        estimatedRevenue: earningData.estimatedRevenue || null,
        actualEPS: earningData.actualEPS || null,
        actualRevenue: earningData.actualRevenue || null,
      })
      .returning();
    return earning;
  }

  // Recent Searches
  async getRecentSearches(userId: string, limit = 5): Promise<RecentSearch[]> {
    return await db
      .select()
      .from(recentSearches)
      .where(eq(recentSearches.userId, userId))
      .orderBy(desc(recentSearches.searchedAt))
      .limit(limit);
  }

  async addRecentSearch(searchData: InsertRecentSearch): Promise<RecentSearch> {
    const [search] = await db
      .insert(recentSearches)
      .values({
        ...searchData,
        searchedAt: new Date(),
      })
      .returning();
    return search;
  }
}

export const storage = new DatabaseStorage();