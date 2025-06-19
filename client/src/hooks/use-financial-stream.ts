// Real-time Financial Data Streaming Hooks
import { useState, useEffect, useCallback, useRef } from 'react';
import { websocketManager, FinancialDataPoint, ConnectionState } from '@/lib/websocket-manager';

export interface UseFinancialStreamOptions {
  symbols: string[];
  autoConnect?: boolean;
  aggregateData?: boolean;
  bufferSize?: number;
  onData?: (data: FinancialDataPoint) => void;
  onError?: (error: Error) => void;
  onConnectionStateChange?: (states: Map<string, ConnectionState>) => void;
}

export interface UseFinancialStreamReturn {
  data: Map<string, FinancialDataPoint[]>;
  latestData: Map<string, FinancialDataPoint>;
  connectionStates: Map<string, ConnectionState>;
  metrics: Map<string, any>;
  isConnected: boolean;
  subscribe: (symbols: string[]) => void;
  unsubscribe: (symbols: string[]) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
  getBestPrice: (symbol: string) => FinancialDataPoint | null;
  getAggregatedData: (symbol: string) => FinancialDataPoint[];
}

export function useFinancialStream(options: UseFinancialStreamOptions): UseFinancialStreamReturn {
  const {
    symbols,
    autoConnect = true,
    aggregateData = true,
    bufferSize = 100,
    onData,
    onError,
    onConnectionStateChange
  } = options;

  const [data, setData] = useState<Map<string, FinancialDataPoint[]>>(new Map());
  const [latestData, setLatestData] = useState<Map<string, FinancialDataPoint>>(new Map());
  const [connectionStates, setConnectionStates] = useState<Map<string, ConnectionState>>(new Map());
  const [metrics, setMetrics] = useState<Map<string, any>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  
  const bufferRef = useRef<Map<string, FinancialDataPoint[]>>(new Map());
  const isInitialized = useRef(false);

  // Initialize WebSocket manager and event listeners
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    // Data received handler
    const handleDataReceived = (dataPoint: FinancialDataPoint) => {
      const { symbol } = dataPoint;
      
      // Update buffer
      const currentBuffer = bufferRef.current.get(symbol) || [];
      currentBuffer.push(dataPoint);
      
      // Maintain buffer size
      if (currentBuffer.length > bufferSize) {
        currentBuffer.splice(0, currentBuffer.length - bufferSize);
      }
      
      bufferRef.current.set(symbol, currentBuffer);
      
      // Update state
      setData(new Map(bufferRef.current));
      setLatestData(prev => new Map(prev.set(symbol, dataPoint)));
      
      // Call user callback
      onData?.(dataPoint);
    };

    // Connection state change handler
    const handleStateChange = () => {
      const states = websocketManager.getConnectionStates();
      setConnectionStates(new Map(states));
      
      // Update overall connection status
      const hasConnectedSources = Array.from(states.values()).some(
        state => state === ConnectionState.CONNECTED
      );
      setIsConnected(hasConnectedSources);
      
      onConnectionStateChange?.(states);
    };

    // Metrics update handler
    const handleMetricsUpdate = () => {
      const currentMetrics = websocketManager.getMetrics();
      setMetrics(new Map(currentMetrics));
    };

    // Error handler
    const handleError = (sourceId: string, error: Error) => {
      console.error(`WebSocket error from ${sourceId}:`, error);
      onError?.(error);
    };

    // Set up event listeners
    websocketManager.on('dataReceived', handleDataReceived);
    websocketManager.on('stateChanged', handleStateChange);
    websocketManager.on('connected', handleMetricsUpdate);
    websocketManager.on('connectionError', handleError);
    websocketManager.on('connectionLost', (sourceId, event) => {
      handleError(sourceId, new Error(`Connection lost: ${event.reason}`));
    });

    // Auto-connect if enabled
    if (autoConnect) {
      websocketManager.connectAll().catch(error => {
        console.error('Failed to auto-connect:', error);
        onError?.(error);
      });
    }

    // Initial state sync
    handleStateChange();
    handleMetricsUpdate();

    // Cleanup function
    return () => {
      websocketManager.removeAllListeners();
    };
  }, [autoConnect, bufferSize, onData, onError, onConnectionStateChange]);

  // Subscribe to symbols when they change
  useEffect(() => {
    if (symbols.length > 0) {
      websocketManager.subscribeToSymbols(symbols);
    }

    return () => {
      if (symbols.length > 0) {
        websocketManager.unsubscribeFromSymbols(symbols);
      }
    };
  }, [symbols]);

  // Memoized functions
  const subscribe = useCallback((symbolsToSubscribe: string[]) => {
    websocketManager.subscribeToSymbols(symbolsToSubscribe);
  }, []);

  const unsubscribe = useCallback((symbolsToUnsubscribe: string[]) => {
    websocketManager.unsubscribeFromSymbols(symbolsToUnsubscribe);
  }, []);

  const connect = useCallback(async () => {
    await websocketManager.connectAll();
  }, []);

  const disconnect = useCallback(() => {
    websocketManager.disconnectAll();
  }, []);

  const getBestPrice = useCallback((symbol: string): FinancialDataPoint | null => {
    if (aggregateData) {
      const aggregated = websocketManager.getAggregatedData(symbol);
      return aggregated.length > 0 ? aggregated[0] : null;
    }
    
    return latestData.get(symbol) || null;
  }, [aggregateData, latestData]);

  const getAggregatedData = useCallback((symbol: string): FinancialDataPoint[] => {
    return websocketManager.getAggregatedData(symbol);
  }, []);

  return {
    data,
    latestData,
    connectionStates,
    metrics,
    isConnected,
    subscribe,
    unsubscribe,
    connect,
    disconnect,
    getBestPrice,
    getAggregatedData
  };
}

// Hook for individual symbol real-time data
export function useSymbolStream(symbol: string) {
  const {
    latestData,
    connectionStates,
    isConnected,
    getBestPrice,
    getAggregatedData
  } = useFinancialStream({
    symbols: [symbol],
    autoConnect: true
  });

  const symbolData = latestData.get(symbol);
  const historicalData = getAggregatedData(symbol);
  const bestPrice = getBestPrice(symbol);

  return {
    data: symbolData,
    historicalData,
    bestPrice,
    connectionStates,
    isConnected,
    // Computed values
    priceChange: symbolData?.change || 0,
    priceChangePercent: symbolData?.changePercent || 0,
    volume: symbolData?.volume || 0,
    lastUpdate: symbolData?.timestamp || 0
  };
}

// Hook for multiple symbols with optimized rendering
export function useMultiSymbolStream(symbols: string[]) {
  const {
    latestData,
    connectionStates,
    isConnected,
    subscribe,
    unsubscribe
  } = useFinancialStream({
    symbols,
    autoConnect: true,
    bufferSize: 50 // Smaller buffer for multiple symbols
  });

  // Convert to array format for easier rendering
  const symbolsData = symbols.map(symbol => ({
    symbol,
    data: latestData.get(symbol),
    isStreaming: latestData.has(symbol)
  }));

  const connectedSourcesCount = Array.from(connectionStates.values())
    .filter(state => state === ConnectionState.CONNECTED).length;

  return {
    symbolsData,
    connectionStates,
    isConnected,
    connectedSourcesCount,
    subscribe,
    unsubscribe,
    // Utility functions
    getSymbolData: (symbol: string) => latestData.get(symbol),
    hasData: (symbol: string) => latestData.has(symbol)
  };
}

// Hook for connection health monitoring
export function useConnectionHealth() {
  const [connectionStates, setConnectionStates] = useState<Map<string, ConnectionState>>(new Map());
  const [metrics, setMetrics] = useState<Map<string, any>>(new Map());
  const [healthScore, setHealthScore] = useState(0);

  useEffect(() => {
    const updateHealth = () => {
      const states = websocketManager.getConnectionStates();
      const currentMetrics = websocketManager.getMetrics();
      
      setConnectionStates(new Map(states));
      setMetrics(new Map(currentMetrics));
      
      // Calculate health score (0-100)
      const totalSources = states.size;
      if (totalSources === 0) {
        setHealthScore(0);
        return;
      }
      
      const connectedSources = Array.from(states.values())
        .filter(state => state === ConnectionState.CONNECTED).length;
      
      const baseScore = (connectedSources / totalSources) * 100;
      
      // Factor in error rates and latency
      let adjustedScore = baseScore;
      currentMetrics.forEach(metric => {
        if (metric.errorRate > 0.1) adjustedScore *= 0.9; // Penalty for high error rate
        if (metric.latency > 1000) adjustedScore *= 0.95; // Penalty for high latency
      });
      
      setHealthScore(Math.round(adjustedScore));
    };

    websocketManager.on('stateChanged', updateHealth);
    websocketManager.on('connected', updateHealth);
    websocketManager.on('disconnected', updateHealth);
    
    updateHealth(); // Initial calculation
    
    const interval = setInterval(updateHealth, 5000); // Update every 5 seconds

    return () => {
      clearInterval(interval);
      websocketManager.removeListener('stateChanged', updateHealth);
      websocketManager.removeListener('connected', updateHealth);
      websocketManager.removeListener('disconnected', updateHealth);
    };
  }, []);

  const getSourceHealth = (sourceId: string) => {
    const state = connectionStates.get(sourceId);
    const metric = metrics.get(sourceId);
    
    if (!state || !metric) return null;
    
    return {
      state,
      latency: metric.latency,
      errorRate: metric.errorRate,
      uptime: metric.uptime,
      messageCount: metric.messageCount,
      lastMessageTime: metric.lastMessageTime
    };
  };

  return {
    connectionStates,
    metrics,
    healthScore,
    getSourceHealth,
    totalSources: connectionStates.size,
    connectedSources: Array.from(connectionStates.values())
      .filter(state => state === ConnectionState.CONNECTED).length,
    failedSources: Array.from(connectionStates.values())
      .filter(state => state === ConnectionState.FAILED).length
  };
}