/**
 * Socket.IO Service for Real-time Broadcasting
 * Broadcasts price updates from cache updates
 */

import { Server } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../lib/logger';
// Events can be added from cache updates when needed

export class SocketIOService {
  private io: SocketIOServer | null = null;
  private static instance: SocketIOService;
  
  private constructor() {}
  
  static getInstance(): SocketIOService {
    if (!SocketIOService.instance) {
      SocketIOService.instance = new SocketIOService();
    }
    return SocketIOService.instance;
  }
  
  /**
   * Initialize Socket.IO server
   */
  initialize(server: Server): void {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? ['https://128.140.45.28.sslip.io', 'https://alfalyzer.vercel.app']
          : ['http://localhost:3000', 'http://localhost:8080', 'http://localhost:5173'],
        methods: ['GET', 'POST'],
        credentials: true
      },
      path: '/socket.io/',
      transports: ['websocket', 'polling']
    });
    
    this.setupEventListeners();
    this.setupClientConnections();
    
    logger.info('🔌 Socket.IO service initialized');
  }
  
  /**
   * Setup event listeners (placeholder for future cache update hooks)
   */
  private setupEventListeners(): void {
    // Placeholder for future cache update hooks
  }
  
  /**
   * Setup client connection handlers
   */
  private setupClientConnections(): void {
    if (!this.io) return;
    
    this.io.on('connection', (socket) => {
      logger.info(`👤 Client connected: ${socket.id}`);
      
      // Send initial connection success message
      socket.emit('connected', {
        message: 'Connected to Alfalyzer real-time updates',
        timestamp: Date.now()
      });
      
      // Handle client subscription to specific symbols
      socket.on('subscribe', (symbols: string[]) => {
        logger.info(`📊 Client ${socket.id} subscribed to: ${symbols.join(', ')}`);
        
        // Join rooms for each symbol
        symbols.forEach(symbol => {
          socket.join(`quote:${symbol}`);
        });
        
        socket.emit('subscribed', {
          symbols,
          message: 'Successfully subscribed to updates',
          timestamp: Date.now()
        });
      });
      
      // Handle unsubscribe
      socket.on('unsubscribe', (symbols: string[]) => {
        logger.info(`🔕 Client ${socket.id} unsubscribed from: ${symbols.join(', ')}`);
        
        symbols.forEach(symbol => {
          socket.leave(`quote:${symbol}`);
        });
        
        socket.emit('unsubscribed', {
          symbols,
          message: 'Successfully unsubscribed',
          timestamp: Date.now()
        });
      });
      
      // Handle disconnection
      socket.on('disconnect', () => {
        logger.info(`👋 Client disconnected: ${socket.id}`);
      });
    });
  }
  
  /**
   * Broadcast quote update to subscribed clients
   */
  broadcastQuoteUpdate(data: any): void {
    if (!this.io) return;
    
    const { symbol, data: quoteData, timestamp } = data;
    
    logger.debug(`📡 Broadcasting update for ${symbol}: price=${quoteData.price}`);
    
    // Emit to room for specific symbol
    this.io.to(`quote:${symbol}`).emit('quote-update', {
      symbol,
      ...quoteData,
      timestamp
    });
    
    // Also emit to general updates channel
    this.io.emit('market-update', {
      type: 'quote',
      symbol,
      data: quoteData,
      timestamp
    });
  }
  
  /**
   * Broadcast batch updates
   */
  broadcastBatchUpdate(quotes: any[]): void {
    if (!this.io) return;
    
    logger.debug(`📡 Broadcasting batch update for ${quotes.length} quotes`);
    
    // Emit to general updates channel
    this.io.emit('batch-update', {
      type: 'quotes',
      count: quotes.length,
      data: quotes,
      timestamp: Date.now()
    });
    
    // Also emit individual updates to specific rooms
    quotes.forEach(quote => {
      this.io!.to(`quote:${quote.symbol}`).emit('quote-update', {
        ...quote,
        timestamp: Date.now()
      });
    });
  }
  
  /**
   * Get connection statistics
   */
  getStats(): any {
    if (!this.io) return { connected: false };
    
    const sockets = this.io.sockets.sockets;
    
    return {
      connected: true,
      clientCount: sockets.size,
      clients: Array.from(sockets.entries()).map(([id, socket]) => ({
        id,
        connected: socket.connected,
        rooms: Array.from(socket.rooms)
      }))
    };
  }
}

// Export singleton instance
export const socketIOService = SocketIOService.getInstance();
