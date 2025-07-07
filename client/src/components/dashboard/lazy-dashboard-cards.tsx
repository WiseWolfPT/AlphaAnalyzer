/**
 * Lazy Loading Dashboard Cards
 * Optimizes performance by loading cards as they come into view
 */

import { lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Lazy load dashboard cards for better performance
const TopGainersCard = lazy(() => import('./top-gainers-card').then(module => ({ default: module.TopGainersCard })));
const TopLosersCard = lazy(() => import('./top-losers-card').then(module => ({ default: module.TopLosersCard })));
const WatchlistAlertsCard = lazy(() => import('./watchlist-alerts-card').then(module => ({ default: module.WatchlistAlertsCard })));
const PortfolioPerformanceCard = lazy(() => import('./portfolio-performance-card').then(module => ({ default: module.PortfolioPerformanceCard })));
const MarketSentimentCard = lazy(() => import('./market-sentiment-card').then(module => ({ default: module.MarketSentimentCard })));
const EarningsCard = lazy(() => import('./earnings-card').then(module => ({ default: module.EarningsCard })));
const NewsHighlightsCard = lazy(() => import('./news-highlights-card').then(module => ({ default: module.NewsHighlightsCard })));
const SectorPerformanceCard = lazy(() => import('./sector-performance-card').then(module => ({ default: module.SectorPerformanceCard })));

// Loading skeleton for cards
const CardSkeleton = () => (
  <Card className="h-full">
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <div className="h-6 bg-muted rounded animate-pulse w-32" />
        <div className="h-4 bg-muted rounded animate-pulse w-16" />
      </div>
    </CardHeader>
    <CardContent className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex justify-between items-center">
          <div className="space-y-1">
            <div className="h-4 bg-muted rounded animate-pulse w-16" />
            <div className="h-3 bg-muted rounded animate-pulse w-24" />
          </div>
          <div className="text-right space-y-1">
            <div className="h-4 bg-muted rounded animate-pulse w-12" />
            <div className="h-3 bg-muted rounded animate-pulse w-14" />
          </div>
        </div>
      ))}
    </CardContent>
  </Card>
);

interface LazyDashboardCardsProps {
  topGainers?: any[];
  topLosers?: any[];
  isLoading?: boolean;
}

export function LazyDashboardCards({ topGainers, topLosers, isLoading }: LazyDashboardCardsProps) {
  return (
    <>
      {/* Row 1: Market Movers and Alerts */}
      <Suspense fallback={<CardSkeleton />}>
        <TopGainersCard 
          gainersData={topGainers} 
          isLoading={isLoading}
        />
      </Suspense>
      
      <Suspense fallback={<CardSkeleton />}>
        <TopLosersCard 
          losersData={topLosers} 
          isLoading={isLoading}
        />
      </Suspense>
      
      <Suspense fallback={<CardSkeleton />}>
        <WatchlistAlertsCard />
      </Suspense>
      
      <Suspense fallback={<CardSkeleton />}>
        <PortfolioPerformanceCard />
      </Suspense>
      
      {/* Row 2: Sentiment, Earnings, News, Sectors */}
      <Suspense fallback={<CardSkeleton />}>
        <MarketSentimentCard />
      </Suspense>
      
      <Suspense fallback={<CardSkeleton />}>
        <EarningsCard />
      </Suspense>
      
      <Suspense fallback={<CardSkeleton />}>
        <NewsHighlightsCard />
      </Suspense>
      
      <Suspense fallback={<CardSkeleton />}>
        <SectorPerformanceCard />
      </Suspense>
    </>
  );
}