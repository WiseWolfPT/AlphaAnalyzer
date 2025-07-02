import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  TrendingUp, 
  TrendingDown, 
  Calculator, 
  Target,
  BarChart3,
  PieChart,
  DollarSign,
  Info,
  AlertTriangle,
  CheckCircle,
  BookOpen,
  Lightbulb,
  Activity
} from "lucide-react";
import type { EnhancedValuationResult, ValuationModel, ValuationModelType } from "@shared/schema";
import { cn } from "@/lib/utils";

interface EnhancedValuationDashboardProps {
  symbol: string;
  companyName: string;
  currentPrice: number;
  valuationData: EnhancedValuationResult;
  onRecalculate?: () => void;
  className?: string;
}

export function EnhancedValuationDashboard({
  symbol,
  companyName,
  currentPrice,
  valuationData,
  onRecalculate,
  className
}: EnhancedValuationDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedModel, setSelectedModel] = useState<ValuationModelType | null>(null);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    if (!valuationData || !valuationData.consensus || !valuationData.models) {
      return {
        consensusValue: 0,
        safetyMargin: 0,
        confidenceLevel: 0,
        upside: 0,
        modelCount: 0,
        agreementRate: 0
      };
    }

    const { consensus, models } = valuationData;
    const safetyMargin = consensus.value && currentPrice ? 
      ((consensus.value - currentPrice) / currentPrice) * 100 : 0;
    const confidenceLevel = (consensus.confidence || 0) * 100;
    
    // Calculate price target probability
    const modelsSayingUndervalued = models.filter(m => m.valuation === 'undervalued').length;
    const upside = consensus.value && currentPrice ? 
      Math.max(0, ((consensus.value - currentPrice) / currentPrice) * 100) : 0;
    
    return {
      consensusValue: consensus.value || 0,
      safetyMargin,
      confidenceLevel,
      upside,
      modelCount: models.length,
      agreementRate: models.length > 0 ? (modelsSayingUndervalued / models.length) * 100 : 0
    };
  }, [valuationData, currentPrice]);

  return (
    <div className={cn("w-full space-y-6", className)}>
      {/* Header Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">{symbol} Valuation Analysis</CardTitle>
              <p className="text-muted-foreground">{companyName}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">${currentPrice.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Current Price</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Target className="h-5 w-5 text-blue-500" />
                <span className="font-semibold">Consensus Value</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                ${summaryMetrics.consensusValue.toFixed(2)}
              </p>
              <p className={cn(
                "text-sm",
                summaryMetrics.safetyMargin > 0 ? "text-green-600" : "text-red-600"
              )}>
                {summaryMetrics.safetyMargin > 0 ? "+" : ""}{summaryMetrics.safetyMargin.toFixed(1)}% vs Current
              </p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="font-semibold">Confidence</span>
              </div>
              <Progress value={summaryMetrics.confidenceLevel} className="mb-2" />
              <p className="text-sm text-muted-foreground">
                {summaryMetrics.confidenceLevel.toFixed(0)}% Confidence
              </p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <BarChart3 className="h-5 w-5 text-purple-500" />
                <span className="font-semibold">Models</span>
              </div>
              <p className="text-2xl font-bold">{summaryMetrics.modelCount}</p>
              <p className="text-sm text-muted-foreground">
                {summaryMetrics.agreementRate.toFixed(0)}% Agree Undervalued
              </p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <span className="font-semibold">Upside</span>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {summaryMetrics.upside.toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground">Potential Return</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Valuation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="sensitivity" className="hidden md:block">Sensitivity</TabsTrigger>
          <TabsTrigger value="education">Learn</TabsTrigger>
          <TabsTrigger value="scenarios" className="hidden md:block">Scenarios</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Valuation Summary Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Valuation Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Consensus Range */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Valuation Range</span>
                      <span className="text-sm text-muted-foreground">
                        ${valuationData.ranges.bearish.toFixed(2)} - ${valuationData.ranges.bullish.toFixed(2)}
                      </span>
                    </div>
                    <div className="relative">
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-red-400 via-yellow-400 to-green-400 h-3 rounded-full"
                          style={{ width: '100%' }}
                        />
                      </div>
                      <div 
                        className="absolute top-0 w-1 h-3 bg-blue-600 rounded"
                        style={{ 
                          left: `${Math.max(0, Math.min(100, ((currentPrice - valuationData.ranges.bearish) / (valuationData.ranges.bullish - valuationData.ranges.bearish)) * 100))}%`
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Bearish</span>
                      <span>Current: ${currentPrice}</span>
                      <span>Bullish</span>
                    </div>
                  </div>

                  {/* Classification */}
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Classification:</span>
                    <Badge variant={
                      valuationData.consensus.classification === 'undervalued' ? 'default' :
                      valuationData.consensus.classification === 'overvalued' ? 'destructive' : 'secondary'
                    }>
                      {valuationData.consensus.classification.toUpperCase()}
                    </Badge>
                  </div>

                  {/* Value Spread */}
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Value Spread:</span>
                    <span className="text-sm">±{valuationData.consensus.spread.toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Key Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Key Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Safety Margin</p>
                      <p className={cn(
                        "text-lg font-bold",
                        summaryMetrics.safetyMargin > 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {summaryMetrics.safetyMargin.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Risk Score</p>
                      <p className="text-lg font-bold">
                        {(100 - summaryMetrics.confidenceLevel).toFixed(0)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Price Target</p>
                      <p className="text-lg font-bold text-blue-600">
                        ${summaryMetrics.consensusValue.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Model Agreement</p>
                      <p className="text-lg font-bold">
                        {summaryMetrics.agreementRate.toFixed(0)}%
                      </p>
                    </div>
                  </div>

                  {/* Action Recommendations */}
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-2">Investment Recommendation</h4>
                    {summaryMetrics.safetyMargin > 20 && summaryMetrics.confidenceLevel > 70 && (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm">Strong Buy - High confidence, significant undervaluation</span>
                      </div>
                    )}
                    {summaryMetrics.safetyMargin > 10 && summaryMetrics.confidenceLevel > 60 && summaryMetrics.safetyMargin <= 20 && (
                      <div className="flex items-center gap-2 text-blue-600">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-sm">Buy - Moderate undervaluation with good confidence</span>
                      </div>
                    )}
                    {Math.abs(summaryMetrics.safetyMargin) <= 10 && (
                      <div className="flex items-center gap-2 text-yellow-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm">Hold - Fair value, monitor for better entry</span>
                      </div>
                    )}
                    {summaryMetrics.safetyMargin < -10 && (
                      <div className="flex items-center gap-2 text-red-600">
                        <TrendingDown className="h-4 w-4" />
                        <span className="text-sm">Overvalued - Consider selling or avoiding</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Models Summary Table */}
          <Card>
            <CardHeader>
              <CardTitle>Model Results Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Model</th>
                      <th className="text-right py-2">Intrinsic Value</th>
                      <th className="text-right py-2">Upside/Downside</th>
                      <th className="text-center py-2">Classification</th>
                      <th className="text-right py-2">Confidence</th>
                      <th className="text-center py-2">Range</th>
                    </tr>
                  </thead>
                  <tbody>
                    {valuationData.models.map((model, index) => {
                      const upside = ((model.intrinsicValue - currentPrice) / currentPrice) * 100;
                      return (
                        <tr key={index} className="border-b hover:bg-muted/50 cursor-pointer"
                            onClick={() => setSelectedModel(model.modelType)}>
                          <td className="py-3 font-medium">{getModelDisplayName(model.modelType)}</td>
                          <td className="text-right py-3 font-mono">${model.intrinsicValue.toFixed(2)}</td>
                          <td className={cn(
                            "text-right py-3 font-medium",
                            upside > 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {upside > 0 ? "+" : ""}{upside.toFixed(1)}%
                          </td>
                          <td className="text-center py-3">
                            <Badge variant={
                              model.valuation === 'undervalued' ? 'default' :
                              model.valuation === 'overvalued' ? 'destructive' : 'secondary'
                            } size="sm">
                              {model.valuation}
                            </Badge>
                          </td>
                          <td className="text-right py-3">
                            <div className="flex items-center justify-end gap-2">
                              <Progress value={(model.confidenceScore || 0) * 100} className="w-16 h-2" />
                              <span className="text-sm">{((model.confidenceScore || 0) * 100).toFixed(0)}%</span>
                            </div>
                          </td>
                          <td className="text-center py-3 text-sm text-muted-foreground">
                            ${(model.lowEstimate || 0).toFixed(0)} - ${(model.highEstimate || 0).toFixed(0)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Individual Models Tab */}
        <TabsContent value="models" className="space-y-6">
          <div className="grid gap-6">
            {valuationData.models.map((model, index) => (
              <ModelDetailCard key={index} model={model} currentPrice={currentPrice} />
            ))}
          </div>
        </TabsContent>

        {/* Sensitivity Analysis Tab */}
        <TabsContent value="sensitivity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sensitivity Analysis</CardTitle>
              <p className="text-muted-foreground">
                How valuation changes with key parameter variations
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Value Range Visualization */}
                <div>
                  <h4 className="font-semibold mb-4">Value Distribution</h4>
                  <div className="space-y-3">
                    {valuationData.models.map((model, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{getModelDisplayName(model.modelType)}</span>
                          <span className="text-muted-foreground">
                            ${(model.lowEstimate || 0).toFixed(0)} - ${(model.highEstimate || 0).toFixed(0)}
                          </span>
                        </div>
                        <div className="relative">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full opacity-60"
                              style={{ width: '100%' }}
                            />
                          </div>
                          <div 
                            className="absolute top-0 w-1 h-2 bg-blue-800 rounded"
                            style={{ 
                              left: `${((model.intrinsicValue - (model.lowEstimate || 0)) / ((model.highEstimate || 0) - (model.lowEstimate || 0))) * 100}%`
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Key Assumptions Impact */}
                <Separator />
                <div>
                  <h4 className="font-semibold mb-4">Key Assumption Sensitivity</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Growth Rate ±5%</span>
                        <span className="text-sm font-medium">±15-25% Value Impact</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Required Return ±2%</span>
                        <span className="text-sm font-medium">±10-20% Value Impact</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">P/E Multiple ±3x</span>
                        <span className="text-sm font-medium">±15-30% Value Impact</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">EPS Accuracy ±10%</span>
                        <span className="text-sm font-medium">±10% Value Impact</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Terminal Growth ±1%</span>
                        <span className="text-sm font-medium">±5-15% Value Impact</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Margin of Safety</span>
                        <span className="text-sm font-medium">Direct Impact</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Education Tab */}
        <TabsContent value="education" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Valuation Methods
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-sm">Discounted Cash Flow (DCF)</h4>
                    <p className="text-xs text-muted-foreground">
                      Projects future cash flows and discounts to present value. Best for stable, profitable companies.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Dividend Discount Model (DDM)</h4>
                    <p className="text-xs text-muted-foreground">
                      Values stock based on dividend payments. Ideal for consistent dividend-paying companies.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">P/E Multiple</h4>
                    <p className="text-xs text-muted-foreground">
                      Compares price-to-earnings ratio with industry peers. Quick relative valuation method.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Benjamin Graham Formula</h4>
                    <p className="text-xs text-muted-foreground">
                      Classic value investing approach considering growth and bond yields. Conservative method.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Investment Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Diversify Models</p>
                      <p className="text-xs text-muted-foreground">
                        Use multiple valuation methods for more reliable estimates
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Consider Quality</p>
                      <p className="text-xs text-muted-foreground">
                        Higher confidence scores indicate more reliable valuations
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Mind the Spread</p>
                      <p className="text-xs text-muted-foreground">
                        Large value spreads indicate higher uncertainty
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Regular Updates</p>
                      <p className="text-xs text-muted-foreground">
                        Recalculate valuations with fresh earnings data
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Model Explanations */}
          <Card>
            <CardHeader>
              <CardTitle>When to Use Each Model</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold">Growth Companies</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 mt-2">
                      <li>• DCF with high growth assumptions</li>
                      <li>• Revenue multiples for early stage</li>
                      <li>• PEG ratio for growth vs. valuation</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold">Value Stocks</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 mt-2">
                      <li>• Benjamin Graham formula</li>
                      <li>• Asset-based valuation</li>
                      <li>• P/E multiple comparison</li>
                    </ul>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold">Dividend Stocks</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 mt-2">
                      <li>• Dividend Discount Model</li>
                      <li>• Conservative DCF approach</li>
                      <li>• Yield-based comparisons</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold">Cyclical Companies</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 mt-2">
                      <li>• Normalized earnings approach</li>
                      <li>• EBITDA multiples</li>
                      <li>• Through-cycle analysis</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scenarios Tab */}
        <TabsContent value="scenarios" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">Bull Case</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      ${valuationData.ranges.bullish.toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">Target Price</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p><strong>Assumptions:</strong></p>
                    <ul className="text-muted-foreground space-y-1">
                      <li>• Higher growth rates achieved</li>
                      <li>• Premium valuation multiples</li>
                      <li>• Favorable market conditions</li>
                      <li>• Strong execution on strategy</li>
                    </ul>
                  </div>
                  <div className="text-center">
                    <p className="text-green-600 font-medium">
                      {(((valuationData.ranges.bullish - currentPrice) / currentPrice) * 100).toFixed(1)}% Upside
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-blue-600">Base Case</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      ${valuationData.consensus.value.toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">Consensus Value</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p><strong>Assumptions:</strong></p>
                    <ul className="text-muted-foreground space-y-1">
                      <li>• Current trends continue</li>
                      <li>• Market-average multiples</li>
                      <li>• Steady execution of plans</li>
                      <li>• Normal market conditions</li>
                    </ul>
                  </div>
                  <div className="text-center">
                    <p className="text-blue-600 font-medium">
                      {(((valuationData.consensus.value - currentPrice) / currentPrice) * 100).toFixed(1)}% Return
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Bear Case</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">
                      ${valuationData.ranges.bearish.toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">Downside Target</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p><strong>Assumptions:</strong></p>
                    <ul className="text-muted-foreground space-y-1">
                      <li>• Growth challenges emerge</li>
                      <li>• Compressed valuation multiples</li>
                      <li>• Economic headwinds</li>
                      <li>• Execution risks materialize</li>
                    </ul>
                  </div>
                  <div className="text-center">
                    <p className="text-red-600 font-medium">
                      {(((valuationData.ranges.bearish - currentPrice) / currentPrice) * 100).toFixed(1)}% Downside
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-center gap-4">
        <Button onClick={onRecalculate} variant="outline" className="w-full sm:w-auto">
          <Calculator className="h-4 w-4 mr-2" />
          Recalculate
        </Button>
        <Button variant="default" className="w-full sm:w-auto">
          <Target className="h-4 w-4 mr-2" />
          Set Price Alert
        </Button>
      </div>
    </div>
  );
}

// Individual Model Detail Component
function ModelDetailCard({ 
  model, 
  currentPrice 
}: { 
  model: ValuationModel; 
  currentPrice: number;
}) {
  const upside = ((model.intrinsicValue - currentPrice) / currentPrice) * 100;
  const parameters = model.parameters ? JSON.parse(model.parameters) : {};

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            {getModelDisplayName(model.modelType)}
          </CardTitle>
          <Badge variant={
            model.valuation === 'undervalued' ? 'default' :
            model.valuation === 'overvalued' ? 'destructive' : 'secondary'
          }>
            {model.valuation}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Intrinsic Value</p>
              <p className="text-2xl font-bold">${model.intrinsicValue.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Upside/Downside</p>
              <p className={cn(
                "text-lg font-bold",
                upside > 0 ? "text-green-600" : "text-red-600"
              )}>
                {upside > 0 ? "+" : ""}{upside.toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Confidence Score</p>
              <div className="flex items-center gap-2">
                <Progress value={(model.confidenceScore || 0) * 100} className="flex-1" />
                <span className="text-sm font-medium">{((model.confidenceScore || 0) * 100).toFixed(0)}%</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Value Range</p>
              <p className="text-sm">
                ${(model.lowEstimate || 0).toFixed(2)} - ${(model.highEstimate || 0).toFixed(2)}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Key Parameters</p>
            <div className="space-y-1 text-sm">
              {Object.entries(parameters).slice(0, 4).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                  <span className="font-medium">
                    {typeof value === 'number' ? 
                      (key.includes('Rate') || key.includes('Return') ? `${value}%` : value.toFixed(2)) : 
                      String(value)
                    }
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Utility function to get display names for models
function getModelDisplayName(modelType: ValuationModelType): string {
  const names = {
    'dcf': 'Discounted Cash Flow',
    'ddm': 'Dividend Discount Model',
    'pe_multiple': 'P/E Multiple',
    'peg': 'PEG Ratio',
    'graham': 'Benjamin Graham',
    'asset_based': 'Asset-Based',
    'revenue_multiple': 'Revenue Multiple',
    'ebitda_multiple': 'EBITDA Multiple'
  };
  return names[modelType] || modelType.toUpperCase();
}