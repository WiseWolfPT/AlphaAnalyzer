import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap?: number;
  volume?: number;
  high?: number;
  low?: number;
  open?: number;
  timestamp?: number;
  provider?: string;
}

interface SocketQuotesOptions {
  symbols?: string[];
  onQuoteUpdate?: (quote: Quote) => void;
  enabled?: boolean;
}

export function useSocketQuotes(options: SocketQuotesOptions = {}) {
  const { symbols = [], onQuoteUpdate, enabled = true } = options;
  const [quotes, setQuotes] = useState<Map<string, Quote>>(new Map());
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const quotesMapRef = useRef<Map<string, Quote>>(new Map());

  // Initialize socket connection
  useEffect(() => {
    if (!enabled) return;

    // For development, don't specify a URL to use the default path
    // This will make Socket.IO client use the current origin with /socket.io path
    // which will be proxied by Vite to the backend
    const socketUrl = import.meta.env.DEV 
      ? undefined  // Let Socket.IO use default path (will be proxied)
      : (import.meta.env.VITE_API_URL || window.location.origin);
    
    console.log('🔌 Connecting to Socket.IO server at:', socketUrl || 'default path (/socket.io)');

    const socket = io(socketUrl || '/', {
      path: '/socket.io/',
      transports: ['polling', 'websocket'], // Start with polling, then upgrade
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      withCredentials: true,
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('✅ Socket.IO connected:', socket.id);
      setConnected(true);
      setError(null);
      
      // Subscribe to symbols if any
      if (symbols.length > 0) {
        console.log('📊 Subscribing to symbols:', symbols);
        socket.emit('subscribe', symbols);
      }
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket.IO disconnected');
      setConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('🔴 Socket.IO connection error:', err.message);
      setError(`Connection error: ${err.message}`);
    });

    // Quote update handlers
    socket.on('batch-update', (data: any) => {
      console.log(`📡 Received batch update with ${data.data?.length || 0} quotes`);
      
      if (data.data && Array.isArray(data.data)) {
        const newQuotesMap = new Map(quotesMapRef.current);
        
        data.data.forEach((quote: Quote) => {
          newQuotesMap.set(quote.symbol, {
            ...quote,
            timestamp: data.timestamp || Date.now()
          });
          
          // Call individual update callback if provided
          if (onQuoteUpdate) {
            onQuoteUpdate(quote);
          }
        });
        
        quotesMapRef.current = newQuotesMap;
        setQuotes(new Map(newQuotesMap));
      }
    });

    socket.on('quote-update', (data: Quote) => {
      console.log(`📈 Received quote update for ${data.symbol}: $${data.price}`);
      
      const newQuotesMap = new Map(quotesMapRef.current);
      newQuotesMap.set(data.symbol, data);
      quotesMapRef.current = newQuotesMap;
      setQuotes(new Map(newQuotesMap));
      
      if (onQuoteUpdate) {
        onQuoteUpdate(data);
      }
    });

    socket.on('market-update', (data: any) => {
      console.log('🌐 Received market update:', data.type, data.symbol);
      
      if (data.type === 'quote' && data.data) {
        const newQuotesMap = new Map(quotesMapRef.current);
        newQuotesMap.set(data.symbol, {
          ...data.data,
          symbol: data.symbol,
          timestamp: data.timestamp || Date.now()
        });
        quotesMapRef.current = newQuotesMap;
        setQuotes(new Map(newQuotesMap));
        
        if (onQuoteUpdate) {
          onQuoteUpdate(data.data);
        }
      }
    });

    return () => {
      console.log('🔌 Cleaning up Socket.IO connection');
      if (socket) {
        socket.disconnect();
      }
    };
  }, [enabled]); // Only re-run if enabled changes

  // Subscribe/unsubscribe to symbols
  useEffect(() => {
    if (socketRef.current && socketRef.current.connected && symbols.length > 0) {
      console.log('📊 Updating subscription to symbols:', symbols);
      socketRef.current.emit('subscribe', symbols);
    }
  }, [symbols.join(',')]); // Re-run when symbols change

  // Get quote for a specific symbol
  const getQuote = useCallback((symbol: string): Quote | undefined => {
    return quotesMapRef.current.get(symbol);
  }, []);

  // Get all quotes as array
  const getAllQuotes = useCallback((): Quote[] => {
    return Array.from(quotesMapRef.current.values());
  }, []);

  // Force reconnect
  const reconnect = useCallback(() => {
    if (socketRef.current) {
      console.log('🔄 Forcing Socket.IO reconnection');
      socketRef.current.connect();
    }
  }, []);

  return {
    quotes,
    connected,
    error,
    getQuote,
    getAllQuotes,
    reconnect,
    socket: socketRef.current,
  };
}