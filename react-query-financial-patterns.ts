// React Query (TanStack Query) Patterns for Financial Data Fetching
// Tailored for Alfalyzer Architecture

import { 
  useQuery, 
  useMutation, 
  useQueryClient,
  useSuspenseQuery,
  useInfiniteQuery,
  QueryClient,
  QueryErrorResetBoundary,
  useQueryErrorResetBoundary,
  type InfiniteData
} from '@tanstack/react-query'
import { ErrorBoundary } from 'react-error-boundary'
import type { ReactNode } from 'react'

// ============================================
// 1. CACHING STRATEGIES FOR MARKET DATA
// ============================================

// Configure QueryClient with financial data optimizations
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Market data should be fresh for 5 seconds
      staleTime: 5 * 1000,
      // Keep data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed requests with exponential backoff
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus for real-time accuracy
      refetchOnWindowFocus: true,
      // Don't refetch on reconnect if data is fresh
      refetchOnReconnect: 'always',
    },
    mutations: {
      // Retry mutations once
      retry: 1,
    },
  },
})

// Types for financial data
interface MarketData {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume: number
  timestamp: number
}

interface Portfolio {
  id: string
  name: string
  holdings: Holding[]
  totalValue: number
  totalChange: number
  totalChangePercent: number
}

interface Holding {
  id: string
  symbol: string
  quantity: number
  averagePrice: number
  currentPrice: number
  value: number
  change: number
  changePercent: number
}

interface Transaction {
  id: string
  type: 'BUY' | 'SELL'
  symbol: string
  quantity: number
  price: number
  timestamp: number
  portfolioId: string
}

// ============================================
// 2. REAL-TIME DATA SYNCHRONIZATION
// ============================================

// Hook for real-time market data with WebSocket integration
export function useMarketData(symbol: string) {
  const queryClient = useQueryClient()

  // Main query for market data
  const query = useQuery({
    queryKey: ['market', symbol],
    queryFn: async () => {
      const response = await fetch(`/api/market/${symbol}`)
      if (!response.ok) throw new Error('Failed to fetch market data')
      return response.json() as Promise<MarketData>
    },
    // Refetch every 5 seconds for real-time updates
    refetchInterval: 5000,
    // Only refetch when tab is visible
    refetchIntervalInBackground: false,
    // Custom stale time for high-frequency data
    staleTime: 3000,
  })

  // WebSocket subscription for real-time updates
  React.useEffect(() => {
    const ws = new WebSocket(`wss://api.market.com/stream/${symbol}`)

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data) as MarketData
      
      // Update cache with real-time data
      queryClient.setQueryData(['market', symbol], (oldData: MarketData | undefined) => {
        if (!oldData) return data
        // Only update if timestamp is newer
        return data.timestamp > oldData.timestamp ? data : oldData
      })
    }

    return () => ws.close()
  }, [symbol, queryClient])

  return query
}

// Hook for portfolio data with intelligent caching
export function usePortfolio(portfolioId: string) {
  return useQuery({
    queryKey: ['portfolio', portfolioId],
    queryFn: async () => {
      const response = await fetch(`/api/portfolios/${portfolioId}`)
      if (!response.ok) throw new Error('Failed to fetch portfolio')
      return response.json() as Promise<Portfolio>
    },
    // Portfolio data can be stale for 30 seconds
    staleTime: 30 * 1000,
    // Keep in cache for 1 hour
    gcTime: 60 * 60 * 1000,
  })
}

// ============================================
// 3. OPTIMISTIC UPDATES FOR PORTFOLIOS
// ============================================

// Hook for executing trades with optimistic updates
export function useExecuteTrade() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (transaction: Omit<Transaction, 'id' | 'timestamp'>) => {
      const response = await fetch('/api/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction),
      })
      if (!response.ok) throw new Error('Trade execution failed')
      return response.json() as Promise<Transaction>
    },
    // Optimistic update
    onMutate: async (newTransaction) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: ['portfolio', newTransaction.portfolioId] 
      })

      // Snapshot the previous value
      const previousPortfolio = queryClient.getQueryData<Portfolio>([
        'portfolio',
        newTransaction.portfolioId,
      ])

      // Optimistically update portfolio
      queryClient.setQueryData<Portfolio>(
        ['portfolio', newTransaction.portfolioId],
        (old) => {
          if (!old) return old

          // Calculate optimistic changes
          const holding = old.holdings.find(h => h.symbol === newTransaction.symbol)
          const tradeValue = newTransaction.quantity * newTransaction.price

          if (newTransaction.type === 'BUY') {
            if (holding) {
              // Update existing holding
              const newQuantity = holding.quantity + newTransaction.quantity
              const newAveragePrice = 
                (holding.quantity * holding.averagePrice + tradeValue) / newQuantity

              return {
                ...old,
                holdings: old.holdings.map(h =>
                  h.symbol === newTransaction.symbol
                    ? {
                        ...h,
                        quantity: newQuantity,
                        averagePrice: newAveragePrice,
                        value: newQuantity * h.currentPrice,
                      }
                    : h
                ),
                totalValue: old.totalValue + tradeValue,
              }
            } else {
              // Add new holding
              const marketData = queryClient.getQueryData<MarketData>([
                'market',
                newTransaction.symbol,
              ])

              return {
                ...old,
                holdings: [
                  ...old.holdings,
                  {
                    id: `temp-${Date.now()}`,
                    symbol: newTransaction.symbol,
                    quantity: newTransaction.quantity,
                    averagePrice: newTransaction.price,
                    currentPrice: marketData?.price || newTransaction.price,
                    value: tradeValue,
                    change: 0,
                    changePercent: 0,
                  },
                ],
                totalValue: old.totalValue + tradeValue,
              }
            }
          } else {
            // SELL logic
            if (!holding) return old

            const newQuantity = holding.quantity - newTransaction.quantity
            if (newQuantity <= 0) {
              // Remove holding
              return {
                ...old,
                holdings: old.holdings.filter(h => h.symbol !== newTransaction.symbol),
                totalValue: old.totalValue - tradeValue,
              }
            } else {
              // Update holding
              return {
                ...old,
                holdings: old.holdings.map(h =>
                  h.symbol === newTransaction.symbol
                    ? {
                        ...h,
                        quantity: newQuantity,
                        value: newQuantity * h.currentPrice,
                      }
                    : h
                ),
                totalValue: old.totalValue - tradeValue,
              }
            }
          }
        }
      )

      // Return context for rollback
      return { previousPortfolio, portfolioId: newTransaction.portfolioId }
    },
    // Rollback on error
    onError: (err, newTransaction, context) => {
      if (context?.previousPortfolio) {
        queryClient.setQueryData(
          ['portfolio', context.portfolioId],
          context.previousPortfolio
        )
      }
    },
    // Always refetch after settlement
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['portfolio', variables.portfolioId] 
      })
      // Also invalidate transaction history
      queryClient.invalidateQueries({ 
        queryKey: ['transactions', variables.portfolioId] 
      })
    },
  })
}

// ============================================
// 4. ERROR BOUNDARIES
// ============================================

// Financial data error boundary component
export function FinancialDataErrorBoundary({ children }: { children: ReactNode }) {
  const { reset } = useQueryErrorResetBoundary()

  return (
    <ErrorBoundary
      onReset={reset}
      fallbackRender={({ error, resetErrorBoundary }) => (
        <div className="error-container p-4 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            Market Data Error
          </h2>
          <p className="text-red-600 mb-4">
            {error.message || 'Unable to fetch market data. Please try again.'}
          </p>
          <button
            onClick={resetErrorBoundary}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  )
}

// Wrapper with QueryErrorResetBoundary for isolated error handling
export function MarketDataSection({ children }: { children: ReactNode }) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <FinancialDataErrorBoundary>
          <React.Suspense fallback={<MarketDataSkeleton />}>
            {children}
          </React.Suspense>
        </FinancialDataErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  )
}

// ============================================
// 5. TYPESCRIPT INTEGRATION
// ============================================

// Type-safe query hooks with proper error handling
export function useMarketDataSuspense(symbol: string) {
  return useSuspenseQuery({
    queryKey: ['market', symbol],
    queryFn: async (): Promise<MarketData> => {
      const response = await fetch(`/api/market/${symbol}`)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to fetch market data')
      }
      return response.json()
    },
    // Throw errors to nearest boundary
    throwOnError: true,
  })
}

// Infinite query for transaction history
export function useTransactionHistory(portfolioId: string) {
  return useInfiniteQuery({
    queryKey: ['transactions', portfolioId],
    queryFn: async ({ pageParam = 0 }): Promise<{
      transactions: Transaction[]
      nextCursor: number | null
    }> => {
      const response = await fetch(
        `/api/portfolios/${portfolioId}/transactions?cursor=${pageParam}&limit=20`
      )
      if (!response.ok) throw new Error('Failed to fetch transactions')
      return response.json()
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
    // Keep pages in cache for 5 minutes
    staleTime: 5 * 60 * 1000,
  })
}

// Prefetch market data for better UX
export function usePrefetchMarketData() {
  const queryClient = useQueryClient()

  return (symbols: string[]) => {
    symbols.forEach(symbol => {
      queryClient.prefetchQuery({
        queryKey: ['market', symbol],
        queryFn: async () => {
          const response = await fetch(`/api/market/${symbol}`)
          if (!response.ok) throw new Error('Failed to prefetch market data')
          return response.json()
        },
        // Only prefetch if data is older than 1 minute
        staleTime: 60 * 1000,
      })
    })
  }
}

// ============================================
// USAGE EXAMPLES
// ============================================

// Example: Market data component with error boundary
function MarketDataDisplay({ symbol }: { symbol: string }) {
  const { data } = useMarketDataSuspense(symbol)

  return (
    <div className="market-data">
      <h3>{data.symbol}</h3>
      <p className="price">${data.price.toFixed(2)}</p>
      <p className={`change ${data.change >= 0 ? 'positive' : 'negative'}`}>
        {data.change >= 0 ? '+' : ''}{data.change.toFixed(2)} 
        ({data.changePercent.toFixed(2)}%)
      </p>
    </div>
  )
}

// Example: Portfolio with optimistic updates
function PortfolioView({ portfolioId }: { portfolioId: string }) {
  const { data: portfolio } = usePortfolio(portfolioId)
  const executeTrade = useExecuteTrade()

  const handleTrade = async (transaction: Omit<Transaction, 'id' | 'timestamp'>) => {
    try {
      await executeTrade.mutateAsync(transaction)
      // Success notification
    } catch (error) {
      // Error notification - optimistic update already rolled back
    }
  }

  return (
    <div className="portfolio">
      {/* Portfolio content */}
    </div>
  )
}

// Loading skeleton for market data
function MarketDataSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
      <div className="h-6 bg-gray-200 rounded w-1/2"></div>
    </div>
  )
}