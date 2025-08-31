import { useState } from "react";
import { useLocation } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, PieChart, Activity, TrendingUp, TrendingDown, 
  Target, DollarSign, Percent, Plus, ExternalLink, Wifi,
  Briefcase, Trash2, Calendar, FileText, Edit, Check, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePortfolioManager, type Transaction } from "@/contexts/portfolio-manager";
import { useCachedBatchQuotes } from "@/hooks/use-cache-data";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

// Transaction dialog component
function TransactionDialog({ onSubmit }: { onSubmit: (transaction: any) => void }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    symbol: '',
    type: 'buy' as 'buy' | 'sell' | 'dividend',
    shares: 0,
    price: 0,
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      date: new Date(formData.date).toISOString()
    });
    setOpen(false);
    // Reset form
    setFormData({
      symbol: '',
      type: 'buy',
      shares: 0,
      price: 0,
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-teya-green via-teya-green-dark to-teya-green hover:from-teya-green-dark hover:via-teya-green hover:to-teya-green-dark text-rich-black font-semibold">
          <Plus className="h-4 w-4 mr-2" />
          Add Transaction
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
          <DialogDescription>
            Record a buy, sell, or dividend transaction for your portfolio.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="symbol">Stock Symbol</Label>
            <Input
              id="symbol"
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
              placeholder="AAPL"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="type">Transaction Type</Label>
            <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buy">Buy</SelectItem>
                <SelectItem value="sell">Sell</SelectItem>
                <SelectItem value="dividend">Dividend</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="shares">
                {formData.type === 'dividend' ? 'Amount' : 'Shares'}
              </Label>
              <Input
                id="shares"
                type="number"
                step="0.01"
                value={formData.shares}
                onChange={(e) => setFormData({ ...formData, shares: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="price">
                {formData.type === 'dividend' ? 'Per Share' : 'Price'}
              </Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add any notes..."
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Transaction</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Portfolio selector component
function PortfolioSelector() {
  const { portfolios, activePortfolioId, setActivePortfolio, createPortfolio, deletePortfolio } = usePortfolioManager();
  const [isCreating, setIsCreating] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState('');

  const handleCreate = () => {
    if (newPortfolioName.trim()) {
      createPortfolio(newPortfolioName.trim());
      setNewPortfolioName('');
      setIsCreating(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Briefcase className="h-5 w-5 text-muted-foreground" />
      <Select value={activePortfolioId || ''} onValueChange={setActivePortfolio}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select Portfolio" />
        </SelectTrigger>
        <SelectContent>
          {portfolios.map(portfolio => (
            <SelectItem key={portfolio.id} value={portfolio.id}>
              {portfolio.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {isCreating ? (
        <div className="flex items-center gap-2">
          <Input
            value={newPortfolioName}
            onChange={(e) => setNewPortfolioName(e.target.value)}
            placeholder="Portfolio name"
            className="w-[150px]"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <Button size="icon" variant="ghost" onClick={handleCreate}>
            <Check className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => {
            setIsCreating(false);
            setNewPortfolioName('');
          }}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setIsCreating(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New
        </Button>
      )}
      
      {activePortfolioId && portfolios.length > 1 && (
        <Button
          size="icon"
          variant="ghost"
          onClick={() => {
            if (confirm('Are you sure you want to delete this portfolio?')) {
              deletePortfolio(activePortfolioId);
            }
          }}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      )}
    </div>
  );
}

// Enhanced holding component with P&L
function PortfolioHolding({ holding, currentPrice }: { holding: any; currentPrice: number }) {
  const [, setLocation] = useLocation();
  
  const currentValue = currentPrice * holding.shares;
  const gainLoss = currentValue - holding.totalCost;
  const gainLossPercent = holding.totalCost > 0 ? (gainLoss / holding.totalCost) * 100 : 0;
  const isPositive = gainLoss >= 0;

  return (
    <div 
      className="flex items-center justify-between p-4 hover:bg-secondary/50 rounded-lg cursor-pointer transition-colors group border"
      onClick={() => setLocation(`/stock/${holding.symbol}`)}
    >
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
          <span className="text-sm font-medium text-primary">{holding.symbol.charAt(0)}</span>
        </div>
        <div>
          <div className="text-label group-hover:text-primary transition-colors">
            {holding.symbol}
          </div>
          <div className="text-caption">
            {holding.shares.toFixed(2)} shares @ ${holding.avgPrice.toFixed(2)}
          </div>
        </div>
      </div>
      <div className="text-right flex items-center space-x-3">
        <div>
          <div className="text-metric">
            ${currentValue.toFixed(2)}
          </div>
          <div className={cn(
            "text-caption",
            isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          )}>
            {isPositive ? "+" : ""}${gainLoss.toFixed(2)} ({isPositive ? "+" : ""}{gainLossPercent.toFixed(2)}%)
          </div>
        </div>
        <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </div>
  );
}

// Transaction list component
function TransactionList({ transactions, onDelete }: { transactions: Transaction[]; onDelete: (id: string) => void }) {
  return (
    <div className="space-y-2">
      {transactions.map(txn => (
        <div key={txn.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
          <div className="flex items-center gap-4">
            <Badge variant={txn.type === 'buy' ? 'default' : txn.type === 'sell' ? 'destructive' : 'secondary'}>
              {txn.type.toUpperCase()}
            </Badge>
            <div>
              <div className="font-medium">{txn.symbol}</div>
              <div className="text-sm text-muted-foreground">
                {txn.type === 'dividend' 
                  ? `$${(txn.shares * txn.price).toFixed(2)} total`
                  : `${txn.shares} shares @ $${txn.price.toFixed(2)}`
                }
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-sm font-medium">
                ${(txn.shares * txn.price).toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">
                {format(new Date(txn.date), 'MMM dd, yyyy')}
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Delete this transaction?')) {
                  onDelete(txn.id);
                }
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PortfoliosEnhanced() {
  const { 
    activePortfolio, 
    addTransaction, 
    deleteTransaction,
    getPortfolioStats,
    portfolios,
    createPortfolio
  } = usePortfolioManager();
  
  // Create default portfolio if none exists
  if (portfolios.length === 0) {
    createPortfolio('My Portfolio');
  }

  // Get all symbols from the active portfolio
  const portfolioSymbols = activePortfolio 
    ? Object.keys(activePortfolio.holdings)
    : [];
  
  // Get real-time quotes for portfolio stocks
  const { data: quotesData, isLoading } = useCachedBatchQuotes(portfolioSymbols, {
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (!activePortfolio) {
    return (
      <MainLayout>
        <div className="container mx-auto px-6 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-bold mb-2">No Portfolio Selected</h2>
              <p className="text-muted-foreground mb-4">Create or select a portfolio to get started</p>
              <PortfolioSelector />
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // Calculate portfolio metrics with real prices
  const holdings = Object.values(activePortfolio.holdings);
  let totalValue = 0;
  let totalCost = 0;
  let totalDividends = 0;

  holdings.forEach(holding => {
    const quote = quotesData?.quotes?.find(q => q.symbol === holding.symbol);
    const currentPrice = quote?.price || holding.avgPrice;
    totalValue += currentPrice * holding.shares;
    totalCost += holding.totalCost;
  });

  activePortfolio.transactions.forEach(txn => {
    if (txn.type === 'dividend') {
      totalDividends += txn.shares * txn.price;
    }
  });

  const totalGainLoss = totalValue - totalCost;
  const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
  const totalReturn = totalGainLoss + totalDividends;
  const totalReturnPercent = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0;

  // Calculate daily change
  let dayChange = 0;
  let dayChangePercent = 0;
  holdings.forEach(holding => {
    const quote = quotesData?.quotes?.find(q => q.symbol === holding.symbol);
    if (quote) {
      dayChange += (quote.change || 0) * holding.shares;
      dayChangePercent += ((quote.changePercent || 0) * holding.shares * quote.price) / totalValue;
    }
  });

  // Generate performance chart data
  const generatePerformanceData = () => {
    const data = [];
    let currentVal = totalCost;
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Simulate portfolio growth
      const change = (Math.random() - 0.48) * (currentVal * 0.02);
      currentVal = Math.max(currentVal + change, totalCost * 0.9);
      
      data.push({
        date: date.toLocaleDateString(),
        value: parseFloat(currentVal.toFixed(2))
      });
    }
    
    // Add current value as last point
    data[data.length - 1].value = totalValue;
    
    return data;
  };

  const performanceData = generatePerformanceData();

  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Portfolio Management</h1>
              <p className="text-muted-foreground">Track your investments and performance</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <PortfolioSelector />
            <TransactionDialog onSubmit={addTransaction} />
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="holdings">Holdings</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6">
            {/* Portfolio Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card className="bg-card/50 backdrop-blur-sm border border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-muted-foreground">Total Value</span>
                  </div>
                  <div className="text-2xl font-bold">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div className={cn(
                    "text-sm font-medium",
                    dayChange >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {dayChange >= 0 ? '+' : ''}${dayChange.toFixed(2)} ({dayChangePercent.toFixed(2)}%) today
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-card/50 backdrop-blur-sm border border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-muted-foreground">Unrealized P&L</span>
                  </div>
                  <div className={cn(
                    "text-2xl font-bold",
                    totalGainLoss >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {totalGainLoss >= 0 ? '+' : ''}${Math.abs(totalGainLoss).toFixed(2)}
                  </div>
                  <div className={cn(
                    "text-sm",
                    totalGainLossPercent >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {totalGainLossPercent >= 0 ? '+' : ''}{totalGainLossPercent.toFixed(2)}%
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-sm border border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-purple-500" />
                    <span className="text-sm text-muted-foreground">Total Cost</span>
                  </div>
                  <div className="text-2xl font-bold">${totalCost.toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground">Investment basis</div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-sm border border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Percent className="h-4 w-4 text-amber-500" />
                    <span className="text-sm text-muted-foreground">Dividends</span>
                  </div>
                  <div className="text-2xl font-bold text-green-600">${totalDividends.toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground">Total received</div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-sm border border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-4 w-4 text-cyan-500" />
                    <span className="text-sm text-muted-foreground">Total Return</span>
                  </div>
                  <div className={cn(
                    "text-2xl font-bold",
                    totalReturn >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {totalReturn >= 0 ? '+' : ''}${Math.abs(totalReturn).toFixed(2)}
                  </div>
                  <div className={cn(
                    "text-sm",
                    totalReturnPercent >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {totalReturnPercent >= 0 ? '+' : ''}{totalReturnPercent.toFixed(2)}% with divs
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Portfolio Performance (30 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={performanceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <defs>
                        <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 10, fill: '#9CA3AF' }}
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                        }}
                      />
                      <YAxis 
                        tick={{ fontSize: 10, fill: '#9CA3AF' }}
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip 
                        formatter={(value: any) => [`$${value.toLocaleString()}`, 'Portfolio Value']}
                        contentStyle={{ 
                          backgroundColor: '#1F2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#10b981" 
                        strokeWidth={3}
                        fill="url(#portfolioGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="holdings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Current Holdings</CardTitle>
              </CardHeader>
              <CardContent>
                {holdings.length > 0 ? (
                  <div className="space-y-3">
                    {holdings.map((holding) => {
                      const quote = quotesData?.quotes?.find(q => q.symbol === holding.symbol);
                      const currentPrice = quote?.price || holding.avgPrice;
                      return (
                        <PortfolioHolding 
                          key={holding.symbol} 
                          holding={holding}
                          currentPrice={currentPrice}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No holdings yet. Add transactions to build your portfolio.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="transactions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Transaction History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activePortfolio.transactions.length > 0 ? (
                  <TransactionList 
                    transactions={activePortfolio.transactions.sort((a, b) => 
                      new Date(b.date).getTime() - new Date(a.date).getTime()
                    )}
                    onDelete={deleteTransaction}
                  />
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No transactions yet. Start by adding your first transaction.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="performance" className="space-y-6">
            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Best Performers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {holdings
                      .map(holding => {
                        const quote = quotesData?.quotes?.find(q => q.symbol === holding.symbol);
                        const currentPrice = quote?.price || holding.avgPrice;
                        const gainPercent = ((currentPrice - holding.avgPrice) / holding.avgPrice) * 100;
                        return { ...holding, currentPrice, gainPercent };
                      })
                      .sort((a, b) => b.gainPercent - a.gainPercent)
                      .slice(0, 3)
                      .map((holding) => (
                        <div key={holding.symbol} className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
                          <div>
                            <div className="font-bold">{holding.symbol}</div>
                            <div className="text-sm text-muted-foreground">{holding.shares.toFixed(2)} shares</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-green-600">+{holding.gainPercent.toFixed(1)}%</div>
                            <div className="text-sm text-muted-foreground">${holding.currentPrice.toFixed(2)}</div>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Portfolio Composition</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {holdings
                      .map(holding => {
                        const quote = quotesData?.quotes?.find(q => q.symbol === holding.symbol);
                        const currentPrice = quote?.price || holding.avgPrice;
                        const value = currentPrice * holding.shares;
                        const weight = (value / totalValue) * 100;
                        return { symbol: holding.symbol, weight };
                      })
                      .sort((a, b) => b.weight - a.weight)
                      .slice(0, 5)
                      .map((item) => (
                        <div key={item.symbol} className="flex items-center justify-between">
                          <span className="text-sm font-medium">{item.symbol}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-secondary rounded-full h-2">
                              <div 
                                className="bg-primary h-2 rounded-full"
                                style={{ width: `${item.weight}%` }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground w-12 text-right">
                              {item.weight.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Transaction Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Buys</span>
                      <span className="font-medium">
                        {activePortfolio.transactions.filter(t => t.type === 'buy').length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Sells</span>
                      <span className="font-medium">
                        {activePortfolio.transactions.filter(t => t.type === 'sell').length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Dividends Received</span>
                      <span className="font-medium">
                        {activePortfolio.transactions.filter(t => t.type === 'dividend').length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avg Position Size</span>
                      <span className="font-medium">
                        ${holdings.length > 0 ? (totalValue / holdings.length).toFixed(0) : '0'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}