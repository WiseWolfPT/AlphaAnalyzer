import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { StockSearch } from "@/components/stock/stock-search";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { 
  Calculator, 
  TrendingUp, 
  Target, 
  BarChart3,
  PieChart,
  Activity,
  DollarSign,
  Percent,
  ArrowUp,
  ArrowDown,
  Info
} from "lucide-react";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { motion } from "framer-motion";
import type { Stock } from "@shared/schema";

interface ValuationResult {
  method: string;
  value: number;
  description: string;
  confidence: number;
}

interface IntrinsicCalculation {
  currentPrice: number;
  intrinsicValue: number;
  discount: number;
  isUndervalued: boolean;
  methods: ValuationResult[];
}

export default function IntrinsicValue() {
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculation, setCalculation] = useState<IntrinsicCalculation | null>(null);

  // Manual calculation inputs
  const [eps, setEps] = useState("6.13");
  const [growthRate, setGrowthRate] = useState(8);
  const [discountRate, setDiscountRate] = useState(10);
  const [terminalGrowth, setTerminalGrowth] = useState(3);
  const [years, setYears] = useState(10);

  const { data: searchResults } = useQuery<Stock[]>({
    queryKey: [`/api/stocks/search?q=${encodeURIComponent(searchQuery)}`],
    enabled: searchQuery.length > 0,
  });

  const calculateIntrinsicValue = (stock: Stock) => {
    setIsCalculating(true);
    
    // Simulate calculation delay
    setTimeout(() => {
      const currentPrice = parseFloat(stock.price);
      const epsValue = parseFloat(stock.eps || eps);
      
      // Different valuation methods
      const dcfValue = calculateDCF(epsValue, growthRate, discountRate, terminalGrowth, years);
      const peValue = calculatePE(epsValue, 15); // Conservative P/E of 15
      const pegValue = calculatePEG(epsValue, growthRate);
      
      const methods: ValuationResult[] = [
        {
          method: "DCF (10-year)",
          value: dcfValue,
          description: "Discounted Cash Flow model",
          confidence: 85
        },
        {
          method: "P/E Valuation",
          value: peValue,
          description: "Price-to-Earnings based",
          confidence: 70
        },
        {
          method: "PEG Ratio",
          value: pegValue,
          description: "PEG-adjusted valuation",
          confidence: 75
        }
      ];

      // Average intrinsic value (weighted by confidence)
      const totalWeight = methods.reduce((sum, m) => sum + m.confidence, 0);
      const weightedValue = methods.reduce((sum, m) => sum + (m.value * m.confidence), 0) / totalWeight;
      
      const discount = ((currentPrice - weightedValue) / weightedValue) * 100;
      
      setCalculation({
        currentPrice,
        intrinsicValue: weightedValue,
        discount,
        isUndervalued: discount < 0,
        methods
      });
      
      setIsCalculating(false);
    }, 1500);
  };

  const calculateDCF = (eps: number, growth: number, discount: number, terminal: number, years: number): number => {
    let totalValue = 0;
    let currentEps = eps;
    
    // Growth phase
    for (let i = 1; i <= years; i++) {
      currentEps *= (1 + growth / 100);
      totalValue += currentEps / Math.pow(1 + discount / 100, i);
    }
    
    // Terminal value
    const terminalValue = (currentEps * (1 + terminal / 100)) / (discount / 100 - terminal / 100);
    totalValue += terminalValue / Math.pow(1 + discount / 100, years);
    
    return totalValue;
  };

  const calculatePE = (eps: number, peRatio: number): number => {
    return eps * peRatio;
  };

  const calculatePEG = (eps: number, growth: number): number => {
    const fairPE = growth * 1.2; // PEG ratio of 1.2
    return eps * fairPE;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  // Pie chart data
  const pieData = calculation ? [
    {
      name: 'Undervalued',
      value: calculation.isUndervalued ? Math.abs(calculation.discount) : 0,
      color: '#10b981'
    },
    {
      name: 'Fair Value',
      value: calculation.isUndervalued ? 100 - Math.abs(calculation.discount) : Math.abs(calculation.discount),
      color: '#f59e0b'
    },
    {
      name: 'Overvalued',
      value: calculation.isUndervalued ? 0 : 100 - Math.abs(calculation.discount),
      color: '#ef4444'
    }
  ] : [];

  // Bar chart data for methods comparison
  const barData = calculation?.methods.map(method => ({
    name: method.method,
    value: method.value,
    current: calculation.currentPrice
  })) || [];

  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Calculator className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Intrinsic Value Calculator</h1>
              <p className="text-muted-foreground">Calculate the true worth of any stock with advanced valuation methods</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl">
            <StockSearch 
              onSearch={setSearchQuery}
              searchResults={searchResults || []}
              onStockSelect={(stock) => {
                setSelectedStock(stock);
                calculateIntrinsicValue(stock);
              }}
              placeholder="Search for a stock to analyze..."
            />
          </div>
        </div>

        {selectedStock && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Stock Header */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                      <span className="font-bold text-primary">{selectedStock.symbol.charAt(0)}</span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{selectedStock.symbol}</h2>
                      <p className="text-muted-foreground">{selectedStock.name}</p>
                      <Badge variant="secondary">{selectedStock.sector}</Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold">{formatCurrency(parseFloat(selectedStock.price))}</div>
                    <div className={`flex items-center gap-1 ${
                      parseFloat(selectedStock.changePercent) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {parseFloat(selectedStock.changePercent) >= 0 ? 
                        <ArrowUp className="h-4 w-4" /> : 
                        <ArrowDown className="h-4 w-4" />
                      }
                      <span>{selectedStock.changePercent}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Calculation Results */}
            {isCalculating ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-16 h-16 mx-auto mb-4"
                  >
                    <Calculator className="w-full h-full text-primary" />
                  </motion.div>
                  <h3 className="text-lg font-semibold mb-2">Calculating Intrinsic Value...</h3>
                  <p className="text-muted-foreground mb-4">Analyzing financial data and running valuation models</p>
                  <Progress value={75} className="max-w-xs mx-auto" />
                </CardContent>
              </Card>
            ) : calculation && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Valuation Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Valuation Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Current vs Intrinsic */}
                    <div className="text-center">
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="p-4 bg-secondary/30 rounded-lg">
                          <div className="text-sm text-muted-foreground">Current Price</div>
                          <div className="text-2xl font-bold">{formatCurrency(calculation.currentPrice)}</div>
                        </div>
                        <div className="p-4 bg-primary/10 rounded-lg">
                          <div className="text-sm text-muted-foreground">Intrinsic Value</div>
                          <div className="text-2xl font-bold text-primary">{formatCurrency(calculation.intrinsicValue)}</div>
                        </div>
                      </div>
                      
                      {/* Discount/Premium */}
                      <div className={`text-center p-4 rounded-lg ${
                        calculation.isUndervalued 
                          ? 'bg-green-500/10 border border-green-500/20' 
                          : 'bg-red-500/10 border border-red-500/20'
                      }`}>
                        <div className={`text-2xl font-bold ${
                          calculation.isUndervalued ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatPercentage(Math.abs(calculation.discount))}
                        </div>
                        <div className="text-sm">
                          {calculation.isUndervalued ? 'Potential Upside' : 'Premium to Fair Value'}
                        </div>
                      </div>
                    </div>

                    {/* Pie Chart */}
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            innerRadius={40}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: any) => [`${value.toFixed(1)}%`, '']}
                          />
                          <Legend />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Valuation Methods */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Valuation Methods
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {calculation.methods.map((method, index) => (
                      <motion.div
                        key={method.method}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{method.method}</div>
                            <div className="text-sm text-muted-foreground">{method.description}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{formatCurrency(method.value)}</div>
                            <div className="text-xs text-muted-foreground">{method.confidence}% confidence</div>
                          </div>
                        </div>
                        <Progress value={method.confidence} className="h-1" />
                      </motion.div>
                    ))}

                    {/* Methods Comparison Chart */}
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                          <XAxis 
                            dataKey="name" 
                            tick={{ fontSize: 10, fill: '#9CA3AF' }}
                            angle={-45}
                            textAnchor="end"
                            height={60}
                          />
                          <YAxis 
                            tick={{ fontSize: 10, fill: '#9CA3AF' }}
                            tickFormatter={(value) => `$${value}`}
                          />
                          <Tooltip 
                            formatter={(value: any, name: string) => [
                              formatCurrency(value), 
                              name === 'value' ? 'Intrinsic Value' : 'Current Price'
                            ]}
                            labelStyle={{ color: '#1F2937' }}
                            contentStyle={{ 
                              backgroundColor: '#1F2937', 
                              border: '1px solid #374151',
                              borderRadius: '8px'
                            }}
                          />
                          <Legend />
                          <Bar 
                            dataKey="value" 
                            fill="#10b981" 
                            name="Intrinsic Value"
                            radius={[2, 2, 0, 0]}
                          />
                          <Bar 
                            dataKey="current" 
                            fill="#ef4444" 
                            name="Current Price"
                            radius={[2, 2, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Manual Calculator */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Manual Calculator
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="dcf" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="dcf">DCF Model</TabsTrigger>
                    <TabsTrigger value="pe">P/E Valuation</TabsTrigger>
                    <TabsTrigger value="advanced">Advanced</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="dcf" className="space-y-4 mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="eps">EPS (TTM)</Label>
                        <Input
                          id="eps"
                          type="number"
                          value={eps}
                          onChange={(e) => setEps(e.target.value)}
                          step="0.01"
                        />
                      </div>
                      <div>
                        <Label>Growth Rate: {growthRate}%</Label>
                        <Slider
                          value={[growthRate]}
                          onValueChange={(value) => setGrowthRate(value[0])}
                          max={30}
                          min={0}
                          step={0.5}
                        />
                      </div>
                      <div>
                        <Label>Discount Rate: {discountRate}%</Label>
                        <Slider
                          value={[discountRate]}
                          onValueChange={(value) => setDiscountRate(value[0])}
                          max={20}
                          min={5}
                          step={0.5}
                        />
                      </div>
                    </div>
                    <Button 
                      onClick={() => selectedStock && calculateIntrinsicValue(selectedStock)}
                      className="w-full bg-gradient-to-r from-chartreuse via-chartreuse-dark to-chartreuse hover:from-chartreuse-dark hover:via-chartreuse hover:to-chartreuse-dark text-rich-black font-semibold shadow-lg shadow-chartreuse/30 hover:shadow-chartreuse/50 hover:scale-105 transition-all duration-300 border-0"
                    >
                      Recalculate
                    </Button>
                  </TabsContent>
                  
                  <TabsContent value="pe" className="space-y-4 mt-6">
                    <div className="text-center py-8 text-muted-foreground">
                      <PieChart className="w-8 h-8 mx-auto mb-3 opacity-50" />
                      <p>P/E valuation model coming soon</p>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="advanced" className="space-y-4 mt-6">
                    <div className="text-center py-8 text-muted-foreground">
                      <TrendingUp className="w-8 h-8 mx-auto mb-3 opacity-50" />
                      <p>Advanced models coming soon</p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Empty State */}
        {!selectedStock && (
          <Card>
            <CardContent className="p-12 text-center">
              <Calculator className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Start Your Analysis</h3>
              <p className="text-muted-foreground mb-6">
                Search for a stock above to calculate its intrinsic value using advanced valuation models
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-md mx-auto">
                <div className="text-center">
                  <DollarSign className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <div className="text-sm font-medium">DCF Analysis</div>
                </div>
                <div className="text-center">
                  <Percent className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <div className="text-sm font-medium">Multiple Methods</div>
                </div>
                <div className="text-center">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <div className="text-sm font-medium">Real-time Data</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}