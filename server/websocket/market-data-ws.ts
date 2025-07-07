import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { parse } from 'url';
import { supabaseDb } from '../db/supabase-db';
import { ServerMarketDataService } from '../services/market-data-service';
import { env } from '../config/env';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
  subscribedSymbols?: Set<string>;
}

interface WSMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping';
  symbols?: string[];
}

interface WSResponse {
  type: 'quote' | 'error' | 'pong' | 'subscribed' | 'unsubscribed';
  data?: any;
  error?: string;
  timestamp: string;
}

export class MarketDataWebSocketServer {
  private wss: WebSocketServer;
  private clients: Map<string, AuthenticatedWebSocket> = new Map();
  private marketDataService: ServerMarketDataService;
  private updateInterval: NodeJS.Timer | null = null;
  private symbolSubscribers: Map<string, Set<string>> = new Map(); // symbol -> Set of client IDs

  constructor(server: Server) {
    this.marketDataService = new ServerMarketDataService();
    
    // Create WebSocket server
    this.wss = new WebSocketServer({
      server,
      path: '/ws/market-data',
      verifyClient: this.verifyClient.bind(this)
    });

    this.setupWebSocketServer();
    this.startHeartbeat();
    this.startMarketDataUpdates();
  }

  private async verifyClient(info: any, cb: (result: boolean, code?: number, message?: string) => void) {
    try {
      const { query } = parse(info.req.url || '', true);
      const token = query.token as string;

      if (!token) {
        cb(false, 401, 'Unauthorized: No token provided');
        return;
      }

      // Verify JWT token
      jwt.verify(token, env.JWT_SECRET, (err, decoded) => {
        if (err) {
          cb(false, 401, 'Unauthorized: Invalid token');
          return;
        }
        
        // Attach user ID to the request for later use
        info.req.userId = (decoded as any).id;
        cb(true);
      });
    } catch (error) {
      console.error('WebSocket verification error:', error);
      cb(false, 500, 'Internal Server Error');
    }
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: AuthenticatedWebSocket, request: any) => {
      const userId = request.userId;
      const clientId = `${userId}-${Date.now()}`;
      
      console.log(`📡 WebSocket client connected: ${clientId}`);
      
      // Setup client
      ws.userId = userId;
      ws.isAlive = true;
      ws.subscribedSymbols = new Set();
      
      // Store client
      this.clients.set(clientId, ws);
      
      // Send welcome message
      this.sendToClient(ws, {
        type: 'connected',
        data: { clientId, userId },
        timestamp: new Date().toISOString()
      });
      
      // Handle messages
      ws.on('message', (data) => this.handleMessage(clientId, ws, data));
      
      // Handle pong
      ws.on('pong', () => {
        ws.isAlive = true;
      });
      
      // Handle close
      ws.on('close', () => {
        console.log(`📡 WebSocket client disconnected: ${clientId}`);
        this.removeClient(clientId);
      });
      
      // Handle error
      ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
        this.removeClient(clientId);
      });
    });
  }

  private handleMessage(clientId: string, ws: AuthenticatedWebSocket, data: any) {
    try {
      const message: WSMessage = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'subscribe':
          this.handleSubscribe(clientId, ws, message.symbols || []);
          break;
          
        case 'unsubscribe':
          this.handleUnsubscribe(clientId, ws, message.symbols || []);
          break;
          
        case 'ping':
          this.sendToClient(ws, {
            type: 'pong',
            timestamp: new Date().toISOString()
          });
          break;
          
        default:
          this.sendToClient(ws, {
            type: 'error',
            error: 'Unknown message type',
            timestamp: new Date().toISOString()
          });
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
      this.sendToClient(ws, {
        type: 'error',
        error: 'Invalid message format',
        timestamp: new Date().toISOString()
      });
    }
  }

  private handleSubscribe(clientId: string, ws: AuthenticatedWebSocket, symbols: string[]) {
    const validSymbols = symbols
      .filter(s => s && typeof s === 'string')
      .map(s => s.toUpperCase())
      .slice(0, 20); // Limit to 20 symbols per client
    
    for (const symbol of validSymbols) {
      // Add to client's subscriptions
      ws.subscribedSymbols?.add(symbol);
      
      // Add to symbol subscribers
      if (!this.symbolSubscribers.has(symbol)) {
        this.symbolSubscribers.set(symbol, new Set());
      }
      this.symbolSubscribers.get(symbol)?.add(clientId);
    }
    
    console.log(`📊 Client ${clientId} subscribed to: ${validSymbols.join(', ')}`);
    
    this.sendToClient(ws, {
      type: 'subscribed',
      data: { symbols: validSymbols },
      timestamp: new Date().toISOString()
    });
    
    // Send initial quotes for subscribed symbols
    this.sendInitialQuotes(ws, validSymbols);
  }

  private handleUnsubscribe(clientId: string, ws: AuthenticatedWebSocket, symbols: string[]) {
    const validSymbols = symbols
      .filter(s => s && typeof s === 'string')
      .map(s => s.toUpperCase());
    
    for (const symbol of validSymbols) {
      // Remove from client's subscriptions
      ws.subscribedSymbols?.delete(symbol);
      
      // Remove from symbol subscribers
      this.symbolSubscribers.get(symbol)?.delete(clientId);
      
      // Clean up empty sets
      if (this.symbolSubscribers.get(symbol)?.size === 0) {
        this.symbolSubscribers.delete(symbol);
      }
    }
    
    console.log(`📊 Client ${clientId} unsubscribed from: ${validSymbols.join(', ')}`);
    
    this.sendToClient(ws, {
      type: 'unsubscribed',
      data: { symbols: validSymbols },
      timestamp: new Date().toISOString()
    });
  }

  private async sendInitialQuotes(ws: AuthenticatedWebSocket, symbols: string[]) {
    for (const symbol of symbols) {
      try {
        const quote = await this.marketDataService.getRealTimeQuote(symbol);
        if (quote) {
          this.sendToClient(ws, {
            type: 'quote',
            data: {
              symbol: quote.symbol,
              price: quote.price,
              change: quote.change,
              changePercent: quote.changePercent,
              volume: quote.volume,
              high: quote.high,
              low: quote.low,
              open: quote.open,
              previousClose: quote.previousClose,
              timestamp: quote.lastUpdated.toISOString()
            },
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error(`Error fetching initial quote for ${symbol}:`, error);
      }
    }
  }

  private startMarketDataUpdates() {
    // Update quotes every 5 seconds for subscribed symbols
    this.updateInterval = setInterval(async () => {
      const symbolsToUpdate = Array.from(this.symbolSubscribers.keys());
      
      if (symbolsToUpdate.length === 0) {
        return;
      }
      
      console.log(`📈 Updating ${symbolsToUpdate.length} symbols...`);
      
      for (const symbol of symbolsToUpdate) {
        try {
          const quote = await this.marketDataService.getRealTimeQuote(symbol);
          if (quote) {
            // Send to all subscribers of this symbol
            const subscribers = this.symbolSubscribers.get(symbol);
            if (subscribers) {
              const quoteData = {
                type: 'quote' as const,
                data: {
                  symbol: quote.symbol,
                  price: quote.price,
                  change: quote.change,
                  changePercent: quote.changePercent,
                  volume: quote.volume,
                  high: quote.high,
                  low: quote.low,
                  open: quote.open,
                  previousClose: quote.previousClose,
                  timestamp: quote.lastUpdated.toISOString()
                },
                timestamp: new Date().toISOString()
              };
              
              for (const clientId of subscribers) {
                const client = this.clients.get(clientId);
                if (client && client.readyState === WebSocket.OPEN) {
                  this.sendToClient(client, quoteData);
                }
              }
            }
          }
        } catch (error) {
          console.error(`Error updating quote for ${symbol}:`, error);
        }
        
        // Small delay between API calls to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }, 5000); // Update every 5 seconds
  }

  private startHeartbeat() {
    // Ping clients every 30 seconds
    setInterval(() => {
      this.clients.forEach((ws, clientId) => {
        if (!ws.isAlive) {
          console.log(`💔 Terminating inactive client: ${clientId}`);
          ws.terminate();
          this.removeClient(clientId);
          return;
        }
        
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
  }

  private removeClient(clientId: string) {
    const client = this.clients.get(clientId);
    if (client) {
      // Remove from all symbol subscriptions
      for (const [symbol, subscribers] of this.symbolSubscribers) {
        subscribers.delete(clientId);
        if (subscribers.size === 0) {
          this.symbolSubscribers.delete(symbol);
        }
      }
      
      // Remove client
      this.clients.delete(clientId);
    }
  }

  private sendToClient(ws: WebSocket, data: WSResponse) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  public shutdown() {
    console.log('🛑 Shutting down WebSocket server...');
    
    // Clear intervals
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    // Close all connections
    this.clients.forEach((ws) => {
      ws.close(1000, 'Server shutting down');
    });
    
    // Close server
    this.wss.close();
  }
}

export default MarketDataWebSocketServer;