/**
 * DCF Calculator Card Component
 * Phase 7: Advanced DCF valuation with real data integration
 */

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  AlertCircle,
  Info,
  BarChart3,
  Activity,
  Target,
  ChevronRight
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  calculateDCF, 
  calculateDCFScenarios,
  DEFAULT_DCF_SCENARIOS,
  formatLargeNumber,
  type DCFInputs,
  type DCFResult,
  type DCFScenario
} from '@/lib/dcf-calculator';

interface DCFCalculatorCardProps {
  symbol: string;
  currentPrice: number;
  onCalculate?: (result: DCFResult) => void;
}

export function DCFCalculatorCard({ symbol, currentPrice, onCalculate }: DCFCalculatorCardProps) {
  // State for DCF inputs
  const [growthRate, setGrowthRate] = useState(10);
  const [terminalGrowth, setTerminalGrowth] = useState(3);
  const [discountRate, setDiscountRate] = useState(10);
  const [marginOfSafety, setMarginOfSafety] = useState(25);
  const [projectionYears, setProjectionYears] = useState(10);
  
  // State for results
  const [dcfResult, setDcfResult] = useState<DCFResult | null>(null);
  const [scenarios, setScenarios] = useState<DCFScenario[]>([]);
  const [activeTab, setActiveTab] = useState('calculator');
  
  // Fetch DCF data from API
  const { data: dcfData, isLoading, error } = useQuery({
    queryKey: [`/api/market-data/dcf/${symbol}`],
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Auto-populate suggested values when data loads
  useEffect(() => {
    if (dcfData) {
      if (dcfData.suggestedGrowthRate) setGrowthRate(dcfData.suggestedGrowthRate);
      if (dcfData.suggestedTerminalGrowth) setTerminalGrowth(dcfData.suggestedTerminalGrowth);
      if (dcfData.suggestedDiscountRate) setDiscountRate(dcfData.suggestedDiscountRate);
    }
  }, [dcfData]);

  // Calculate DCF when inputs change
  const handleCalculate = () => {
    if (!dcfData) return;

    const inputs: DCFInputs = {
      currentPrice,
      sharesOutstanding: dcfData.sharesOutstanding || 1000000000, // Default 1B if not available
      freeCashFlow: dcfData.freeCashFlow || 0,
      fcfHistory: dcfData.fcfHistory?.map((h: any) => h.freeCashFlow),
      growthRate,
      terminalGrowthRate: terminalGrowth,
      projectionYears,
      discountRate,
      totalDebt: dcfData.totalDebt || 0,
      cashAndEquivalents: dcfData.cashAndEquivalents || 0,
      marginOfSafety
    };

    const result = calculateDCF(inputs);
    setDcfResult(result);

    // Calculate scenarios
    const scenarioResults = calculateDCFScenarios(inputs, DEFAULT_DCF_SCENARIOS);
    setScenarios(scenarioResults);

    // Callback
    if (onCalculate) {
      onCalculate(result);
    }
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Format percentage
  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  // Get recommendation color
  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'Strong Buy': return 'bg-green-600 text-white';
      case 'Buy': return 'bg-green-500 text-white';
      case 'Hold': return 'bg-yellow-500 text-white';
      case 'Sell': return 'bg-red-500 text-white';
      case 'Strong Sell': return 'bg-red-600 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  // Prepare chart data
  const projectionChartData = dcfResult ? 
    dcfResult.projectedCashFlows.map((cf, index) => ({
      year: `Year ${index + 1}`,
      cashFlow: cf / 1000000, // Convert to millions
      presentValue: cf / Math.pow(1 + discountRate/100, index + 1) / 1000000
    })) : [];

  const scenarioChartData = scenarios.map(scenario => ({
    name: scenario.name,
    intrinsicValue: scenario.result?.intrinsicValuePerShare || 0,
    currentPrice: currentPrice,
    upside: scenario.result?.upside || 0
  }));

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center space-x-2">
            <Calculator className="w-6 h-6 animate-spin" />
            <span>Loading financial data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !dcfData) {
    return (
      <Card>
        <CardContent className="p-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load financial data for {symbol}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              DCF Valuation Analysis
            </CardTitle>
            <CardDescription>
              Free Cash Flow based intrinsic value calculation
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            {symbol}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="calculator">Calculator</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
            <TabsTrigger value="sensitivity">Sensitivity</TabsTrigger>
          </TabsList>

          {/* Calculator Tab */}
          <TabsContent value="calculator" className="space-y-6 mt-6">
            {/* Key Metrics Display */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-3 bg-secondary/30 rounded-lg">
                <div className="text-xs text-muted-foreground">Current FCF</div>
                <div className="text-lg font-bold">
                  {formatLargeNumber(dcfData.freeCashFlow || 0)}
                </div>
              </div>
              <div className="p-3 bg-secondary/30 rounded-lg">
                <div className="text-xs text-muted-foreground">FCF Growth (3Y)</div>
                <div className="text-lg font-bold">
                  {dcfData.fcfCAGR?.toFixed(1) || '0'}%
                </div>
              </div>
              <div className="p-3 bg-secondary/30 rounded-lg">
                <div className="text-xs text-muted-foreground">P/E Ratio</div>
                <div className="text-lg font-bold">
                  {dcfData.peRatio?.toFixed(1) || 'N/A'}
                </div>
              </div>
              <div className="p-3 bg-secondary/30 rounded-lg">
                <div className="text-xs text-muted-foreground">ROIC</div>
                <div className="text-lg font-bold">
                  {(dcfData.roic * 100)?.toFixed(1) || '0'}%
                </div>
              </div>
            </div>

            {/* Input Sliders */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Growth Rate (Years 1-{projectionYears})
                  </Label>
                  <span className="text-sm font-medium">{growthRate}%</span>
                </div>
                <Slider
                  value={[growthRate]}
                  onValueChange={(value) => setGrowthRate(value[0])}
                  min={0}
                  max={30}
                  step={0.5}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="flex items-center gap-1">
                    <Activity className="h-3 w-3" />
                    Terminal Growth Rate
                  </Label>
                  <span className="text-sm font-medium">{terminalGrowth}%</span>
                </div>
                <Slider
                  value={[terminalGrowth]}
                  onValueChange={(value) => setTerminalGrowth(value[0])}
                  min={0}
                  max={5}
                  step={0.5}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="flex items-center gap-1">
                    <Percent className="h-3 w-3" />
                    Discount Rate (WACC)
                  </Label>
                  <span className="text-sm font-medium">{discountRate}%</span>
                </div>
                <Slider
                  value={[discountRate]}
                  onValueChange={(value) => setDiscountRate(value[0])}
                  min={5}
                  max={20}
                  step={0.5}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    Margin of Safety
                  </Label>
                  <span className="text-sm font-medium">{marginOfSafety}%</span>
                </div>
                <Slider
                  value={[marginOfSafety]}
                  onValueChange={(value) => setMarginOfSafety(value[0])}
                  min={0}
                  max={50}
                  step={5}
                  className="w-full"
                />
              </div>
            </div>

            <Button 
              onClick={handleCalculate}
              className="w-full bg-gradient-to-r from-teya-green via-teya-green-dark to-teya-green hover:from-teya-green-dark hover:via-teya-green hover:to-teya-green-dark text-rich-black font-semibold"
            >
              Calculate Intrinsic Value
            </Button>
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results" className="space-y-6 mt-6">
            {dcfResult ? (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {/* Main Result */}
                  <div className="text-center p-6 bg-gradient-to-br from-secondary/20 to-secondary/5 rounded-xl">
                    <div className="text-sm text-muted-foreground mb-2">Intrinsic Value</div>
                    <div className="text-4xl font-bold text-primary mb-4">
                      {formatCurrency(dcfResult.intrinsicValuePerShare)}
                    </div>
                    <div className="flex items-center justify-center gap-4">
                      <div>
                        <div className="text-xs text-muted-foreground">Current Price</div>
                        <div className="text-lg font-semibold">{formatCurrency(currentPrice)}</div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-xs text-muted-foreground">Upside/Downside</div>
                        <div className={`text-lg font-semibold ${dcfResult.upside >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatPercent(dcfResult.upside)}
                        </div>
                      </div>
                    </div>
                    <Badge 
                      className={`mt-4 ${getRecommendationColor(dcfResult.recommendation)}`}
                    >
                      {dcfResult.recommendation}
                    </Badge>
                  </div>

                  {/* Detailed Breakdown */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold">Valuation Breakdown</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-sm text-muted-foreground">PV of Cash Flows</span>
                        <span className="text-sm font-medium">
                          {formatLargeNumber(dcfResult.presentValueOfCashFlows)}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-sm text-muted-foreground">Terminal Value</span>
                        <span className="text-sm font-medium">
                          {formatLargeNumber(dcfResult.terminalValue)}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-sm text-muted-foreground">PV of Terminal Value</span>
                        <span className="text-sm font-medium">
                          {formatLargeNumber(dcfResult.presentValueOfTerminalValue)}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-sm text-muted-foreground">Enterprise Value</span>
                        <span className="text-sm font-medium">
                          {formatLargeNumber(dcfResult.enterpriseValue)}
                        </span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-sm font-semibold">Equity Value</span>
                        <span className="text-sm font-bold text-primary">
                          {formatLargeNumber(dcfResult.equityValue)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Cash Flow Projections Chart */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Projected Cash Flows</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={projectionChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                        <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                        <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                        <RechartsTooltip 
                          contentStyle={{ 
                            backgroundColor: '#1F2937', 
                            border: '1px solid #374151',
                            borderRadius: '8px'
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="cashFlow" 
                          stroke="#10b981" 
                          fill="#10b981" 
                          fillOpacity={0.3}
                          name="Projected FCF ($M)"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="presentValue" 
                          stroke="#3b82f6" 
                          fill="#3b82f6" 
                          fillOpacity={0.3}
                          name="Present Value ($M)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calculator className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Configure parameters and calculate to see results</p>
              </div>
            )}
          </TabsContent>

          {/* Scenarios Tab */}
          <TabsContent value="scenarios" className="space-y-6 mt-6">
            {scenarios.length > 0 ? (
              <div className="space-y-6">
                {/* Scenario Comparison Chart */}
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={scenarioChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                    <RechartsTooltip 
                      formatter={(value: any) => formatCurrency(value)}
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="intrinsicValue" fill="#10b981" name="Intrinsic Value" />
                    <Bar dataKey="currentPrice" fill="#ef4444" name="Current Price" />
                  </BarChart>
                </ResponsiveContainer>

                {/* Scenario Details */}
                <div className="space-y-3">
                  {scenarios.map((scenario, index) => (
                    <div key={index} className="p-4 bg-secondary/20 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{scenario.name}</h4>
                        <Badge 
                          variant="outline"
                          className={scenario.result && scenario.result.upside > 0 ? 'border-green-600' : 'border-red-600'}
                        >
                          {scenario.result ? formatPercent(scenario.result.upside) : 'N/A'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Growth: </span>
                          <span className="font-medium">{scenario.inputs.growthRate}%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Discount: </span>
                          <span className="font-medium">{scenario.inputs.discountRate}%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Terminal: </span>
                          <span className="font-medium">{scenario.inputs.terminalGrowthRate}%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Value: </span>
                          <span className="font-medium">
                            {scenario.result ? formatCurrency(scenario.result.intrinsicValuePerShare) : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Calculate DCF to see scenario analysis</p>
              </div>
            )}
          </TabsContent>

          {/* Sensitivity Tab */}
          <TabsContent value="sensitivity" className="space-y-6 mt-6">
            {dcfResult?.sensitivityAnalysis ? (
              <div className="space-y-6">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Sensitivity analysis shows how intrinsic value changes with different assumptions
                  </AlertDescription>
                </Alert>

                {/* Growth Rate Sensitivity */}
                <div>
                  <h4 className="text-sm font-semibold mb-3">Growth Rate Sensitivity</h4>
                  <div className="space-y-2">
                    {Object.entries(dcfResult.sensitivityAnalysis.growthRate).map(([rate, value]) => (
                      <div key={rate} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-12">{rate}</span>
                        <Progress 
                          value={(value / Math.max(...Object.values(dcfResult.sensitivityAnalysis!.growthRate))) * 100}
                          className="flex-1"
                        />
                        <span className="text-sm font-medium w-20 text-right">
                          {formatCurrency(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Discount Rate Sensitivity */}
                <div>
                  <h4 className="text-sm font-semibold mb-3">Discount Rate Sensitivity</h4>
                  <div className="space-y-2">
                    {Object.entries(dcfResult.sensitivityAnalysis.discountRate).map(([rate, value]) => (
                      <div key={rate} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-12">{rate}</span>
                        <Progress 
                          value={(value / Math.max(...Object.values(dcfResult.sensitivityAnalysis!.discountRate))) * 100}
                          className="flex-1"
                        />
                        <span className="text-sm font-medium w-20 text-right">
                          {formatCurrency(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Calculate DCF to see sensitivity analysis</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}