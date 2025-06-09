import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { StockSearch } from "@/components/stock/stock-search";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings, Filter, Download, Calculator } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Stock, IntrinsicValue } from "@shared/schema";

interface IntrinsicCalculation {
  stockSymbol: string;
  intrinsicValue: string;
  currentPrice: string;
  valuation: string;
  deltaPercent: string;
  eps: string;
  growthRate: string;
  peMultiple: string;
  requiredReturn: string;
  marginOfSafety: string;
  futureEPS: string;
  futurePrice: string;
  presentValue: string;
}

export default function IntrinsicValuePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [calculation, setCalculation] = useState<IntrinsicCalculation | null>(null);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Form state
  const [eps, setEps] = useState("");
  const [growthRate, setGrowthRate] = useState(10);
  const [horizon, setHorizon] = useState(10);
  const [peMultiple, setPeMultiple] = useState("");
  const [requiredReturn, setRequiredReturn] = useState(15);
  const [marginOfSafety, setMarginOfSafety] = useState([25]);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch stocks
  const { data: stocks, isLoading: stocksIsLoading } = useQuery({
    queryKey: ["stocks"],
    queryFn: async () => {
      const response = await fetch("/api/stocks?limit=50");
      return response.json();
    },
  });

  // Fetch intrinsic values
  const { data: intrinsicValues } = useQuery({
    queryKey: ["intrinsic-values"],
    queryFn: async () => {
      const response = await fetch("/api/intrinsic-values?limit=50");
      return response.json();
    },
  });

  // Search stocks
  const { data: searchResults = [] } = useQuery({
    queryKey: ["stocks", "search", searchQuery],
    queryFn: async () => {
      const response = await fetch(`/api/stocks/search?q=${encodeURIComponent(searchQuery)}&limit=10`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    enabled: searchQuery.length > 0,
  });

  // Calculate mutation
  const calculateMutation = useMutation({
    mutationFn: async (params: any) => {
      const response = await apiRequest("POST", "/api/intrinsic-values/calculate", params);
      return response.json();
    },
    onSuccess: (data) => {
      setCalculation(data);
      queryClient.invalidateQueries({ queryKey: ["intrinsic-values"] });
    },
    onError: () => {
      toast({
        title: "Calculation Failed",
        description: "Unable to calculate intrinsic value",
        variant: "destructive",
      });
    },
  });

  // Debounced calculation effect
  useEffect(() => {
    if (selectedStock && eps && !debounceTimeout) {
      const timeout = setTimeout(() => {
        calculateMutation.mutate({
          stockSymbol: selectedStock.symbol,
          eps: parseFloat(eps),
          growthRate,
          horizon,
          peMultiple: peMultiple ? parseFloat(peMultiple) : undefined,
          requiredReturn,
          marginOfSafety: marginOfSafety[0],
        });
      }, 400);
      setDebounceTimeout(timeout);
    }

    return () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
        setDebounceTimeout(null);
      }
    };
  }, [selectedStock, eps, growthRate, horizon, peMultiple, requiredReturn, marginOfSafety]);

  const getValuationBadge = (valuation: string, deltaPercent: string) => {
    if (valuation === "undervalued") {
      return <Badge className="bg-positive text-white">Undervalued</Badge>;
    } else if (valuation === "overvalued") {
      return <Badge className="bg-negative text-white">Overvalued</Badge>;
    } else {
      return <Badge className="bg-neutral text-black">Neutral</Badge>;
    }
  };

  const getValuationBorder = (valuation: string) => {
    if (valuation === "undervalued") return "border-positive";
    if (valuation === "overvalued") return "border-negative";
    return "border-neutral";
  };

  const handleStockClick = (stock: Stock & { intrinsicValue?: IntrinsicValue }) => {
    setSelectedStock(stock);
    if (stock.eps) {
      setEps(stock.eps);
    }
    if (stock.peRatio) {
      setPeMultiple(stock.peRatio);
    }
    setIsCalculatorOpen(true);
  };

  const saveAssumptions = () => {
    if (selectedStock) {
      const assumptions = {
        eps,
        growthRate,
        horizon,
        peMultiple,
        requiredReturn,
        marginOfSafety: marginOfSafety[0],
      };
      localStorage.setItem(`assumptions_${selectedStock.symbol}`, JSON.stringify(assumptions));
      toast({
        title: "Assumptions Saved",
        description: `Saved assumptions for ${selectedStock.symbol}`,
      });
    }
  };

  // Filter stocks with calculated intrinsic values
  const stocksWithIntrinsicValues = stocks?.map(stock => {
    const intrinsicValue = intrinsicValues?.find(iv => iv.stockSymbol === stock.symbol);
    return { ...stock, intrinsicValue };
  }).filter(stock => stock.intrinsicValue);

  // Apply filters
  const filteredStocks = stocksWithIntrinsicValues?.filter(stock => {
    if (selectedFilter === "undervalued") {
      return stock.intrinsicValue?.valuation === "undervalued";
    }
    if (selectedFilter === "overvalued") {
      return stock.intrinsicValue?.valuation === "overvalued";
    }
    if (selectedFilter === "neutral") {
      return stock.intrinsicValue?.valuation === "neutral";
    }
    return true;
  });

  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Calculator className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Intrinsic Value Calculator</h1>
                <p className="text-muted-foreground">Evaluate stocks using the proven Adam Khoo valuation method</p>
              </div>
            </div>
              <div className="flex gap-3 flex-wrap">
                <StockSearch 
                  onSearch={setSearchQuery}
                  searchResults={searchResults || []}
                  onStockSelect={handleStockClick}
                  placeholder="Search stocks..."
                />
                <Button variant="outline" onClick={() => setIsAdvancedOpen(true)} className="whitespace-nowrap">
                  <Settings className="w-4 h-4 mr-2" />
                  Use Advanced
                </Button>
              </div>
            </div>

            {/* Filter Chips */}
            <div className="flex gap-2 flex-wrap items-center justify-start">
              <Button 
                variant={selectedFilter === "all" ? "default" : "outline"} 
                size="sm"
                onClick={() => setSelectedFilter("all")}
              >
                All Stocks
              </Button>
              <Button 
                variant={selectedFilter === "undervalued" ? "default" : "outline"} 
                size="sm"
                onClick={() => setSelectedFilter("undervalued")}
                className={cn(
                  selectedFilter === "undervalued" 
                    ? "bg-positive text-white" 
                    : "border-positive text-positive hover:bg-positive hover:text-white"
                )}
              >
                <Filter className="w-3 h-3 mr-1" />
                Undervalued Only
              </Button>
              <Button 
                variant={selectedFilter === "overvalued" ? "default" : "outline"} 
                size="sm"
                onClick={() => setSelectedFilter("overvalued")}
                className={cn(
                  selectedFilter === "overvalued" 
                    ? "bg-negative text-white" 
                    : "border-negative text-negative hover:bg-negative hover:text-white"
                )}
              >
                Overvalued
              </Button>
              <Button 
                variant={selectedFilter === "neutral" ? "default" : "outline"} 
                size="sm"
                onClick={() => setSelectedFilter("neutral")}
                className={cn(
                  selectedFilter === "neutral" 
                    ? "bg-neutral text-black" 
                    : "border-neutral text-neutral hover:bg-neutral hover:text-black"
                )}
              >
                Neutral
              </Button>
            </div>

            {/* Stock Cards Grid */}
            {stocksIsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {Array.from({ length: 25 }).map((_, i) => (
                  <Card key={i} className="p-4">
                    <Skeleton className="h-4 w-12 mb-2" />
                    <Skeleton className="h-3 w-24 mb-4" />
                    <Skeleton className="h-3 w-16 mb-2" />
                    <Skeleton className="h-3 w-20 mb-2" />
                    <Skeleton className="h-3 w-18" />
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {filteredStocks?.slice(0, 25).map((stock) => (
                  <Card 
                    key={stock.symbol} 
                    className={cn(
                      "cursor-pointer hover:shadow-lg transition-all border-2",
                      getValuationBorder(stock.intrinsicValue?.valuation || "neutral")
                    )}
                    onClick={() => handleStockClick(stock)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {stock.logo && (
                            <img src={stock.logo} alt={stock.name} className="w-6 h-6 rounded" />
                          )}
                          <div>
                            <CardTitle className="text-sm font-semibold">{stock.symbol}</CardTitle>
                            <p className="text-xs text-muted-foreground truncate max-w-[120px]">{stock.name}</p>
                          </div>
                        </div>
                        {stock.intrinsicValue && getValuationBadge(stock.intrinsicValue.valuation, stock.intrinsicValue.deltaPercent)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Price</span>
                        <span className="font-medium">${stock.price}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Market Cap</span>
                        <span className="font-medium">{stock.marketCap}</span>
                      </div>
                      {stock.intrinsicValue && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Intrinsic Value</span>
                            <span className="font-medium">${stock.intrinsicValue.intrinsicValue}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Upside</span>
                            <span className={cn(
                              "font-medium",
                              parseFloat(stock.intrinsicValue.deltaPercent) > 3 ? "text-positive" :
                              parseFloat(stock.intrinsicValue.deltaPercent) < -3 ? "text-negative" :
                              "text-neutral"
                            )}>
                              {parseFloat(stock.intrinsicValue.deltaPercent) > 0 ? '+' : ''}{stock.intrinsicValue.deltaPercent}%
                            </span>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Advanced Mode Dialog */}
            <Dialog open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Advanced Intrinsic Value Settings</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  {/* Quick Presets */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Quick Presets</Label>
                    <div className="flex gap-3">
                      <Button variant="outline" size="sm">Conservative</Button>
                      <Button variant="outline" size="sm">Base Case</Button>
                      <Button variant="outline" size="sm">Aggressive</Button>
                    </div>
                  </div>

                  {/* Manual CAGR by intervals */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Growth Rate by Period</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Years 1-5 (%)</Label>
                        <Input placeholder="15" type="number" />
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Years 6-10 (%)</Label>
                        <Input placeholder="8" type="number" />
                      </div>
                    </div>
                  </div>

                  {/* Discount rate */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Discount Rate (10-20%)</Label>
                    <Slider 
                      value={[requiredReturn]} 
                      onValueChange={(value) => setRequiredReturn(value[0])}
                      max={20}
                      min={10}
                      step={0.5}
                      className="w-full"
                    />
                    <div className="text-sm text-muted-foreground text-center">{requiredReturn}%</div>
                  </div>

                  {/* Save presets */}
                  <div className="flex gap-3 pt-4 border-t">
                    <Button onClick={saveAssumptions}>
                      Save Presets
                    </Button>
                    <Button variant="outline">
                      Load Saved
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Stock Calculator Side Panel */}
            <Dialog open={isCalculatorOpen} onOpenChange={setIsCalculatorOpen}>
              <DialogContent className="max-w-md">
                {selectedStock && (
                  <>
                    <DialogHeader>
                      <div className="flex items-center gap-3">
                        {selectedStock.logo && (
                          <img src={selectedStock.logo} alt={selectedStock.name} className="w-8 h-8 rounded" />
                        )}
                        <div>
                          <DialogTitle>{selectedStock.symbol}</DialogTitle>
                          <p className="text-sm text-muted-foreground">{selectedStock.name}</p>
                          <p className="text-lg font-semibold">${selectedStock.price}</p>
                        </div>
                      </div>
                    </DialogHeader>

                    <div className="space-y-6">
                      <Tabs defaultValue="earnings">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="earnings">Earnings (Khoo)</TabsTrigger>
                          <TabsTrigger value="fcf">Free Cash Flow</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="earnings" className="space-y-4">
                          {/* Form inputs */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-sm">EPS (TTM)</Label>
                              <Input
                                type="number"
                                value={eps}
                                onChange={(e) => setEps(e.target.value)}
                                placeholder="6.13"
                                step="0.01"
                              />
                            </div>
                            <div>
                              <Label className="text-sm">Growth Rate (%)</Label>
                              <Input
                                type="number"
                                value={growthRate}
                                onChange={(e) => setGrowthRate(parseFloat(e.target.value) || 0)}
                                max={20}
                                min={0}
                                step="0.1"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-sm">Horizon (Years)</Label>
                              <Input
                                type="number"
                                value={horizon}
                                onChange={(e) => setHorizon(parseInt(e.target.value) || 10)}
                                min={1}
                                max={20}
                              />
                            </div>
                            <div>
                              <Label className="text-sm">PE Multiple</Label>
                              <Input
                                type="number"
                                value={peMultiple}
                                onChange={(e) => setPeMultiple(e.target.value)}
                                max={35}
                                min={1}
                                step="0.1"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-sm">Required Return (%)</Label>
                              <Input
                                type="number"
                                value={requiredReturn}
                                onChange={(e) => setRequiredReturn(parseFloat(e.target.value) || 15)}
                                min={5}
                                max={30}
                                step="0.1"
                              />
                            </div>
                            <div>
                              <Label className="text-sm">Margin of Safety ({marginOfSafety[0]}%)</Label>
                              <Slider
                                value={marginOfSafety}
                                onValueChange={setMarginOfSafety}
                                max={50}
                                min={0}
                                step={1}
                              />
                            </div>
                          </div>

                          {/* Results */}
                          {calculation && (
                            <div className="space-y-3 p-4 bg-muted rounded-lg">
                              <h3 className="font-semibold text-sm">Results (400ms debounced)</h3>
                              <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                  <span className="text-muted-foreground">Future EPS</span>
                                  <p className="font-medium">${calculation.futureEPS}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Future Price</span>
                                  <p className="font-medium">${calculation.futurePrice}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Present Value</span>
                                  <p className="font-medium">${calculation.presentValue}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Intrinsic Value</span>
                                  <p className="font-medium">${calculation.intrinsicValue}</p>
                                </div>
                              </div>
                              <div className="flex items-center justify-between pt-2 border-t">
                                <span className="font-medium text-sm">Delta</span>
                                <div className="flex items-center gap-2">
                                  <span className={cn(
                                    "font-bold text-sm",
                                    parseFloat(calculation.deltaPercent) > 3 ? "text-positive" :
                                    parseFloat(calculation.deltaPercent) < -3 ? "text-negative" :
                                    "text-neutral"
                                  )}>
                                    {parseFloat(calculation.deltaPercent) > 0 ? '+' : ''}{calculation.deltaPercent}%
                                  </span>
                                  {getValuationBadge(calculation.valuation, calculation.deltaPercent)}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex gap-2 pt-2">
                            <Button size="sm" onClick={saveAssumptions}>
                              Save Assumptions
                            </Button>
                            <Button variant="outline" size="sm">
                              <Download className="w-3 h-3 mr-1" />
                              Export PDF
                            </Button>
                          </div>
                        </TabsContent>

                        <TabsContent value="fcf" className="space-y-4">
                          <div className="p-6 text-center text-muted-foreground">
                            <Calculator className="w-8 h-8 mx-auto mb-3 opacity-50" />
                            <p className="text-sm">Free Cash Flow valuation placeholder</p>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}