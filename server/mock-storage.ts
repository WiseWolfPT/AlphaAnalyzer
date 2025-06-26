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
import { IStorage } from "./storage";

export class MockStorage implements IStorage {
  private stocks: Stock[] = [
    {
      id: 1,
      symbol: "AAPL",
      name: "Apple Inc.",
      price: "201.00",
      change: "4.42",
      changePercent: "2.25",
      marketCap: "$2.8T",
      sector: "Technology",
      industry: "Consumer Electronics",
      eps: "6.13",
      peRatio: "28.5",
      logo: "https://logo.clearbit.com/apple.com",
      lastUpdated: new Date()
    },
    {
      id: 2,
      symbol: "MSFT",
      name: "Microsoft Corporation",
      price: "477.40",
      change: "8.55",
      changePercent: "1.82",
      marketCap: "$2.8T",
      sector: "Technology",
      industry: "Software",
      eps: "11.80",
      peRatio: "32.1",
      logo: "https://logo.clearbit.com/microsoft.com",
      lastUpdated: new Date()
    },
    {
      id: 3,
      symbol: "GOOGL",
      name: "Alphabet Inc.",
      price: "166.64",
      change: "3.21",
      changePercent: "2.30",
      marketCap: "$1.8T",
      sector: "Technology",
      industry: "Internet Services",
      eps: "5.52",
      peRatio: "25.8",
      logo: "https://logo.clearbit.com/google.com",
      lastUpdated: new Date()
    },
    {
      id: 4,
      symbol: "AMZN",
      name: "Amazon.com Inc.",
      price: "178.50",
      change: "4.12",
      changePercent: "2.36",
      marketCap: "$1.7T",
      sector: "Consumer Cyclical",
      industry: "E-Commerce",
      eps: "2.90",
      peRatio: "61.5",
      logo: "https://logo.clearbit.com/amazon.com",
      lastUpdated: new Date()
    },
    {
      id: 5,
      symbol: "TSLA",
      name: "Tesla Inc.",
      price: "245.30",
      change: "-3.45",
      changePercent: "-1.39",
      marketCap: "$780B",
      sector: "Consumer Cyclical",
      industry: "Auto Manufacturers",
      eps: "3.12",
      peRatio: "78.6",
      logo: "https://logo.clearbit.com/tesla.com",
      lastUpdated: new Date()
    },
    {
      id: 6,
      symbol: "META",
      name: "Meta Platforms Inc.",
      price: "512.40",
      change: "8.75",
      changePercent: "1.74",
      marketCap: "$1.3T",
      sector: "Technology",
      industry: "Social Media",
      eps: "14.87",
      peRatio: "34.4",
      logo: "https://logo.clearbit.com/meta.com",
      lastUpdated: new Date()
    },
    {
      id: 7,
      symbol: "NVDA",
      name: "NVIDIA Corporation",
      price: "875.60",
      change: "12.30",
      changePercent: "1.42",
      marketCap: "$2.1T",
      sector: "Technology",
      industry: "Semiconductors",
      eps: "11.93",
      peRatio: "73.4",
      logo: "https://logo.clearbit.com/nvidia.com",
      lastUpdated: new Date()
    },
    {
      id: 8,
      symbol: "JPM",
      name: "JPMorgan Chase & Co.",
      price: "195.80",
      change: "2.15",
      changePercent: "1.11",
      marketCap: "$560B",
      sector: "Financial Services",
      industry: "Banks",
      eps: "15.36",
      peRatio: "12.7",
      logo: "https://logo.clearbit.com/jpmorganchase.com",
      lastUpdated: new Date()
    }
  ];

  private watchlists: Watchlist[] = [];
  private watchlistStocks: WatchlistStock[] = [];
  private intrinsicValues: IntrinsicValue[] = [];
  private earnings: Earnings[] = [];
  private recentSearches: RecentSearch[] = [];

  // Stocks
  async getStocks(limit: number = 50, offset: number = 0): Promise<Stock[]> {
    return this.stocks.slice(offset, offset + limit);
  }

  async getStock(symbol: string): Promise<Stock | undefined> {
    return this.stocks.find(s => s.symbol === symbol);
  }

  async createStock(stock: InsertStock): Promise<Stock> {
    const newStock: Stock = {
      id: this.stocks.length + 1,
      ...stock,
      lastUpdated: new Date()
    };
    this.stocks.push(newStock);
    return newStock;
  }

  async updateStock(symbol: string, stock: Partial<InsertStock>): Promise<Stock | undefined> {
    const index = this.stocks.findIndex(s => s.symbol === symbol);
    if (index !== -1) {
      this.stocks[index] = { ...this.stocks[index], ...stock, lastUpdated: new Date() };
      return this.stocks[index];
    }
    return undefined;
  }

  async searchStocks(query: string, limit: number = 10): Promise<Stock[]> {
    const searchTerm = query.toLowerCase();
    return this.stocks
      .filter(s => 
        s.symbol.toLowerCase().includes(searchTerm) || 
        s.name.toLowerCase().includes(searchTerm)
      )
      .slice(0, limit);
  }

  async getStocksBySector(sector: string): Promise<Stock[]> {
    return this.stocks.filter(s => s.sector === sector);
  }

  // Watchlists
  async getWatchlists(userId: string): Promise<Watchlist[]> {
    return this.watchlists.filter(w => w.userId === userId);
  }

  async getWatchlist(id: number): Promise<Watchlist | undefined> {
    return this.watchlists.find(w => w.id === id);
  }

  async createWatchlist(watchlist: InsertWatchlist): Promise<Watchlist> {
    const newWatchlist: Watchlist = {
      id: this.watchlists.length + 1,
      ...watchlist,
      createdAt: new Date()
    };
    this.watchlists.push(newWatchlist);
    return newWatchlist;
  }

  async updateWatchlist(id: number, watchlist: Partial<InsertWatchlist>): Promise<Watchlist | undefined> {
    const index = this.watchlists.findIndex(w => w.id === id);
    if (index !== -1) {
      this.watchlists[index] = { ...this.watchlists[index], ...watchlist };
      return this.watchlists[index];
    }
    return undefined;
  }

  async deleteWatchlist(id: number): Promise<boolean> {
    const index = this.watchlists.findIndex(w => w.id === id);
    if (index !== -1) {
      this.watchlists.splice(index, 1);
      return true;
    }
    return false;
  }

  // Watchlist Stocks
  async getWatchlistStocks(watchlistId: number): Promise<WatchlistStock[]> {
    return this.watchlistStocks.filter(ws => ws.watchlistId === watchlistId);
  }

  async addStockToWatchlist(watchlistStock: InsertWatchlistStock): Promise<WatchlistStock> {
    const newWatchlistStock: WatchlistStock = {
      id: this.watchlistStocks.length + 1,
      ...watchlistStock,
      addedAt: new Date()
    };
    this.watchlistStocks.push(newWatchlistStock);
    return newWatchlistStock;
  }

  async removeStockFromWatchlist(watchlistId: number, stockSymbol: string): Promise<boolean> {
    const index = this.watchlistStocks.findIndex(
      ws => ws.watchlistId === watchlistId && ws.stockSymbol === stockSymbol
    );
    if (index !== -1) {
      this.watchlistStocks.splice(index, 1);
      return true;
    }
    return false;
  }

  // Intrinsic Values
  async getIntrinsicValues(limit: number = 50): Promise<IntrinsicValue[]> {
    return this.intrinsicValues.slice(0, limit);
  }

  async getIntrinsicValue(stockSymbol: string): Promise<IntrinsicValue | undefined> {
    return this.intrinsicValues.find(iv => iv.stockSymbol === stockSymbol);
  }

  async createIntrinsicValue(intrinsicValue: InsertIntrinsicValue): Promise<IntrinsicValue> {
    const newIntrinsicValue: IntrinsicValue = {
      id: this.intrinsicValues.length + 1,
      ...intrinsicValue,
      calculatedAt: new Date()
    };
    this.intrinsicValues.push(newIntrinsicValue);
    return newIntrinsicValue;
  }

  async updateIntrinsicValue(stockSymbol: string, intrinsicValue: Partial<InsertIntrinsicValue>): Promise<IntrinsicValue | undefined> {
    const index = this.intrinsicValues.findIndex(iv => iv.stockSymbol === stockSymbol);
    if (index !== -1) {
      this.intrinsicValues[index] = { ...this.intrinsicValues[index], ...intrinsicValue };
      return this.intrinsicValues[index];
    }
    return undefined;
  }

  // Earnings
  async getEarnings(limit: number = 50): Promise<Earnings[]> {
    return this.earnings.slice(0, limit);
  }

  async getEarningsForStock(stockSymbol: string): Promise<Earnings[]> {
    return this.earnings.filter(e => e.stockSymbol === stockSymbol);
  }

  async createEarning(earning: InsertEarnings): Promise<Earnings> {
    const newEarning: Earnings = {
      id: this.earnings.length + 1,
      ...earning
    };
    this.earnings.push(newEarning);
    return newEarning;
  }

  // Recent Searches
  async getRecentSearches(userId: string, limit: number = 5): Promise<RecentSearch[]> {
    return this.recentSearches
      .filter(rs => rs.userId === userId)
      .sort((a, b) => b.searchedAt.getTime() - a.searchedAt.getTime())
      .slice(0, limit);
  }

  async addRecentSearch(search: InsertRecentSearch): Promise<RecentSearch> {
    const newSearch: RecentSearch = {
      id: this.recentSearches.length + 1,
      ...search,
      searchedAt: new Date()
    };
    this.recentSearches.push(newSearch);
    return newSearch;
  }
}