import { useState } from "react";
import { useLocation } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  Heart, 
  Search,
  Wifi,
  Clock,
  Star,
  Eye,
  EyeOff,
  MoreVertical,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWatchlists } from "@/hooks/use-watchlist";
import { useCachedBatchQuotes } from "@/hooks/use-cache-data";
import { OptimizedSearchBar } from "@/components/stock/optimized-search-bar";
import { RealtimeStockCard } from "@/components/stock/realtime-stock-card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Mock data for stock names and sectors
const getStockInfo = (symbol: string) => {
  const stockInfo: Record<string, { name: string; sector: string }> = {
    'AAPL': { name: 'Apple Inc.', sector: 'Technology' },
    'MSFT': { name: 'Microsoft Corporation', sector: 'Technology' },
    'GOOGL': { name: 'Alphabet Inc.', sector: 'Technology' },
    'AMZN': { name: 'Amazon.com Inc.', sector: 'Consumer Discretionary' },
    'TSLA': { name: 'Tesla Inc.', sector: 'Consumer Discretionary' },
    'META': { name: 'Meta Platforms Inc.', sector: 'Technology' },
    'NVDA': { name: 'NVIDIA Corporation', sector: 'Technology' },
    'JPM': { name: 'JPMorgan Chase & Co.', sector: 'Financial Services' },
    'V': { name: 'Visa Inc.', sector: 'Financial Services' },
    'WMT': { name: 'Walmart Inc.', sector: 'Consumer Staples' },
  };
  return stockInfo[symbol] || { name: `${symbol} Corporation`, sector: 'Technology' };
};

export default function WatchlistsV2() {
  const [, setLocation] = useLocation();
  const {
    watchlists,
    isLoading,
    createWatchlist,
    renameWatchlist,
    deleteWatchlist,
    addSymbolToWatchlist,
    removeSymbolFromWatchlist,
    isSymbolInWatchlist,
    getDefaultWatchlist
  } = useWatchlists();

  const [selectedWatchlistId, setSelectedWatchlistId] = useState<string>(
    getDefaultWatchlist()?.id || 'default'
  );
  const [newWatchlistName, setNewWatchlistName] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isAddStockDialogOpen, setIsAddStockDialogOpen] = useState(false);
  const [useRealtime, setUseRealtime] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedWatchlist = watchlists.find(w => w.id === selectedWatchlistId) || getDefaultWatchlist();
  const watchlistSymbols = selectedWatchlist?.symbols || [];

  // Get quotes for all stocks in selected watchlist
  const { data: quotesData, isLoading: quotesLoading, refetch } = useCachedBatchQuotes(watchlistSymbols, {
    enabled: watchlistSymbols.length > 0,
    refetchInterval: useRealtime ? 30000 : undefined, // Refresh every 30 seconds if realtime
  });

  const handleCreateWatchlist = () => {
    if (newWatchlistName.trim()) {
      const newWatchlist = createWatchlist(newWatchlistName);
      setSelectedWatchlistId(newWatchlist.id);
      setNewWatchlistName("");
      setIsCreateDialogOpen(false);
    }
  };

  const handleRenameWatchlist = () => {
    if (selectedWatchlist && newWatchlistName.trim()) {
      renameWatchlist(selectedWatchlist.id, newWatchlistName);
      setNewWatchlistName("");
      setIsRenameDialogOpen(false);
    }
  };

  const handleDeleteWatchlist = () => {
    if (selectedWatchlist && selectedWatchlist.id !== 'default') {
      deleteWatchlist(selectedWatchlist.id);
      setSelectedWatchlistId(getDefaultWatchlist()?.id || 'default');
    }
  };

  const handleAddStock = (symbol: string) => {
    if (selectedWatchlist) {
      addSymbolToWatchlist(selectedWatchlist.id, symbol);
      setIsAddStockDialogOpen(false);
    }
  };

  const handleRemoveStock = (symbol: string) => {
    if (selectedWatchlist) {
      removeSymbolFromWatchlist(selectedWatchlist.id, symbol);
    }
  };

  const calculateTotalChange = () => {
    if (!quotesData?.quotes) return { value: 0, percent: 0 };
    
    const total = quotesData.quotes.reduce((sum, quote) => {
      const changePercent = quote?.changePercent || 0;
      return sum + changePercent;
    }, 0);
    
    const avgPercent = quotesData.quotes.length > 0 ? total / quotesData.quotes.length : 0;
    
    return {
      value: total,
      percent: avgPercent
    };
  };

  const totalChange = calculateTotalChange();

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Eye className="w-8 h-8 text-teya-green" />
              Watchlists
            </h1>
            <p className="text-muted-foreground">
              Track your favorite stocks in organized lists
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={useRealtime ? 'default' : 'outline'}
              size="sm"
              onClick={() => setUseRealtime(!useRealtime)}
              className={useRealtime ? 'bg-teya-green hover:bg-teya-green-dark text-black' : ''}
            >
              <Wifi className="w-4 h-4" />
              <span className="ml-1 hidden sm:inline">Real-time</span>
            </Button>
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-teya-green hover:bg-teya-green-dark text-black"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Watchlist
            </Button>
          </div>
        </div>

        {/* Watchlist Tabs */}
        <Tabs value={selectedWatchlistId} onValueChange={setSelectedWatchlistId}>
          <div className="flex items-center justify-between mb-4">
            <TabsList className="grid grid-cols-auto gap-1">
              {watchlists.map(watchlist => (
                <TabsTrigger key={watchlist.id} value={watchlist.id}>
                  {watchlist.name}
                  {watchlist.symbols.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {watchlist.symbols.length}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {selectedWatchlist && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => {
                    setNewWatchlistName(selectedWatchlist.name);
                    setIsRenameDialogOpen(true);
                  }}>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  {selectedWatchlist.id !== 'default' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={handleDeleteWatchlist}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {watchlists.map(watchlist => (
            <TabsContent key={watchlist.id} value={watchlist.id}>
              <div className="space-y-4">
                {/* Summary Card */}
                <Card className="border-teya-green/20">
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Stocks</p>
                        <p className="text-2xl font-bold">{watchlist.symbols.length}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Daily Change</p>
                        <p className={cn(
                          "text-2xl font-bold flex items-center gap-1",
                          totalChange.percent >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {totalChange.percent >= 0 ? (
                            <TrendingUp className="w-5 h-5" />
                          ) : (
                            <TrendingDown className="w-5 h-5" />
                          )}
                          {totalChange.percent >= 0 ? '+' : ''}{totalChange.percent.toFixed(2)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Last Updated</p>
                        <p className="text-sm flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {new Date().toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Add Stock Section */}
                <Card className="border-teya-green/20">
                  <CardHeader>
                    <CardTitle className="text-lg">Add Stocks to Watchlist</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <OptimizedSearchBar
                      allStocks={[
                        'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA',
                        'JPM', 'V', 'WMT', 'JNJ', 'PG', 'UNH', 'MA', 'HD',
                        'DIS', 'BAC', 'ADBE', 'NFLX', 'CRM', 'PFE', 'TMO', 'CSCO'
                      ].map(symbol => ({
                        symbol,
                        name: getStockInfo(symbol).name,
                        sector: getStockInfo(symbol).sector
                      }))}
                      onStockSelect={handleAddStock}
                      placeholder="Search and add stocks to this watchlist..."
                    />
                  </CardContent>
                </Card>

                {/* Stocks Grid/List */}
                {watchlist.symbols.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="p-12 text-center">
                      <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No stocks in this watchlist</h3>
                      <p className="text-muted-foreground mb-4">
                        Start adding stocks to track their performance
                      </p>
                      <Button
                        onClick={() => setIsAddStockDialogOpen(true)}
                        className="bg-teya-green hover:bg-teya-green-dark text-black"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Your First Stock
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {watchlist.symbols.map(symbol => {
                      const quote = quotesData?.quotes?.find(q => q.symbol === symbol);
                      const info = getStockInfo(symbol);
                      
                      return (
                        <RealtimeStockCard
                          key={symbol}
                          symbol={symbol}
                          companyName={info.name}
                          industry={info.sector}
                          sector={info.sector}
                          onRemove={() => handleRemoveStock(symbol)}
                          showRemoveButton
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Create Watchlist Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Watchlist</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="watchlist-name">Watchlist Name</Label>
                <Input
                  id="watchlist-name"
                  value={newWatchlistName}
                  onChange={(e) => setNewWatchlistName(e.target.value)}
                  placeholder="e.g., Tech Stocks, Value Picks..."
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateWatchlist()}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateWatchlist}
                className="bg-teya-green hover:bg-teya-green-dark text-black"
                disabled={!newWatchlistName.trim()}
              >
                Create Watchlist
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Rename Watchlist Dialog */}
        <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename Watchlist</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="rename-watchlist">New Name</Label>
                <Input
                  id="rename-watchlist"
                  value={newWatchlistName}
                  onChange={(e) => setNewWatchlistName(e.target.value)}
                  placeholder="Enter new name..."
                  onKeyDown={(e) => e.key === 'Enter' && handleRenameWatchlist()}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleRenameWatchlist}
                className="bg-teya-green hover:bg-teya-green-dark text-black"
                disabled={!newWatchlistName.trim()}
              >
                Rename
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}