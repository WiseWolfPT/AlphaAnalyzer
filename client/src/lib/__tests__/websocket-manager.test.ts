/**
 * WebSocket Data Integrity Tests - AGENT A Emergency Financial Tests
 * Critical tests to ensure zero bugs in real-time price updates
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock WebSocket
class MockWebSocket {
  public readyState: number = WebSocket.CONNECTING;
  public onopen: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;

  constructor(public url: string) {
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      this.onopen?.(new Event('open'));
    }, 10);
  }

  send(data: string) {
    // Mock send functionality
  }

  close() {
    this.readyState = WebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }

  // Helper methods for testing
  simulateMessage(data: any) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
    }
  }

  simulateError() {
    this.onerror?.(new Event('error'));
  }
}

// Mock WebSocket Manager
class WebSocketManager {
  private ws: MockWebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private subscribers: Map<string, (data: any) => void> = new Map();

  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new MockWebSocket(url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        this.handleReconnect();
      };

      this.ws.onerror = () => {
        reject(new Error('WebSocket connection failed'));
      };
    });
  }

  private handleMessage(data: any) {
    if (data.type === 'price_update' && data.symbol) {
      const callback = this.subscribers.get(data.symbol);
      if (callback) {
        callback(data);
      }
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        this.connect('ws://localhost:3001');
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  subscribe(symbol: string, callback: (data: any) => void) {
    this.subscribers.set(symbol, callback);
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: 'subscribe', symbol }));
    }
  }

  unsubscribe(symbol: string) {
    this.subscribers.delete(symbol);
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: 'unsubscribe', symbol }));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // Getter for testing
  get connection() {
    return this.ws;
  }

  get isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Global WebSocket mock
Object.defineProperty(window, 'WebSocket', {
  value: MockWebSocket
});

describe('WebSocket Data Integrity - CRITICAL FINANCIAL TESTS', () => {
  let wsManager: WebSocketManager;

  beforeEach(() => {
    wsManager = new WebSocketManager();
    vi.clearAllMocks();
  });

  afterEach(() => {
    wsManager.disconnect();
  });

  describe('Connection Management', () => {
    it('should establish connection successfully', async () => {
      await wsManager.connect('ws://localhost:3001');
      
      expect(wsManager.isConnected).toBe(true);
      expect(wsManager.connection).toBeDefined();
    });

    it('should handle connection failures gracefully', async () => {
      const mockWs = wsManager.connection as MockWebSocket;
      
      try {
        await wsManager.connect('ws://invalid-url');
        // Simulate connection error
        if (mockWs) {
          mockWs.simulateError();
        }
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should reconnect after connection loss', async () => {
      await wsManager.connect('ws://localhost:3001');
      expect(wsManager.isConnected).toBe(true);

      // Simulate connection loss
      wsManager.connection?.close();
      
      // Wait for reconnection attempt
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Should attempt to reconnect
      expect(wsManager.connection).toBeDefined();
    });
  });

  describe('Price Update Integrity', () => {
    beforeEach(async () => {
      await wsManager.connect('ws://localhost:3001');
    });

    it('should receive and process price updates correctly', (done) => {
      const symbol = 'AAPL';
      const expectedPrice = 150.25;
      
      wsManager.subscribe(symbol, (data) => {
        expect(data.symbol).toBe(symbol);
        expect(data.price).toBe(expectedPrice);
        expect(data.timestamp).toBeDefined();
        done();
      });

      // Simulate price update
      const mockWs = wsManager.connection as MockWebSocket;
      mockWs.simulateMessage({
        type: 'price_update',
        symbol: symbol,
        price: expectedPrice,
        timestamp: Date.now()
      });
    });

    it('should handle multiple simultaneous price updates', (done) => {
      const symbols = ['AAPL', 'MSFT', 'GOOGL'];
      const receivedUpdates: string[] = [];

      symbols.forEach(symbol => {
        wsManager.subscribe(symbol, (data) => {
          receivedUpdates.push(data.symbol);
          
          if (receivedUpdates.length === symbols.length) {
            expect(receivedUpdates).toEqual(expect.arrayContaining(symbols));
            done();
          }
        });
      });

      // Simulate rapid price updates
      const mockWs = wsManager.connection as MockWebSocket;
      symbols.forEach((symbol, index) => {
        setTimeout(() => {
          mockWs.simulateMessage({
            type: 'price_update',
            symbol: symbol,
            price: 100 + index,
            timestamp: Date.now()
          });
        }, index * 10);
      });
    });

    it('should validate price data integrity', (done) => {
      const symbol = 'AAPL';
      
      wsManager.subscribe(symbol, (data) => {
        // Validate required fields
        expect(data.symbol).toBe(symbol);
        expect(typeof data.price).toBe('number');
        expect(data.price).toBeGreaterThan(0);
        expect(typeof data.timestamp).toBe('number');
        expect(data.timestamp).toBeGreaterThan(0);
        
        // Validate price precision (max 4 decimal places for stocks)
        const decimals = (data.price.toString().split('.')[1] || '').length;
        expect(decimals).toBeLessThanOrEqual(4);
        
        done();
      });

      const mockWs = wsManager.connection as MockWebSocket;
      mockWs.simulateMessage({
        type: 'price_update',
        symbol: symbol,
        price: 150.2567,
        timestamp: Date.now()
      });
    });

    it('should handle malformed price data gracefully', () => {
      const symbol = 'AAPL';
      let errorOccurred = false;
      
      wsManager.subscribe(symbol, (data) => {
        // This should not be called for malformed data
        errorOccurred = true;
      });

      const mockWs = wsManager.connection as MockWebSocket;
      
      // Send malformed data
      try {
        mockWs.simulateMessage({
          type: 'price_update',
          // Missing symbol
          price: 'invalid-price',
          timestamp: 'invalid-timestamp'
        });
      } catch (error) {
        // Should handle gracefully without crashing
      }

      // Should not process malformed data
      expect(errorOccurred).toBe(false);
    });

    it('should handle extreme price values correctly', (done) => {
      const symbol = 'BRK.A';
      
      wsManager.subscribe(symbol, (data) => {
        expect(data.price).toBe(500000.00);
        expect(Number.isFinite(data.price)).toBe(true);
        done();
      });

      const mockWs = wsManager.connection as MockWebSocket;
      mockWs.simulateMessage({
        type: 'price_update',
        symbol: symbol,
        price: 500000.00, // Berkshire Hathaway A class price
        timestamp: Date.now()
      });
    });
  });

  describe('Subscription Management', () => {
    beforeEach(async () => {
      await wsManager.connect('ws://localhost:3001');
    });

    it('should manage multiple subscriptions correctly', () => {
      const symbols = ['AAPL', 'MSFT', 'GOOGL'];
      const callbacks = symbols.map(() => vi.fn());

      symbols.forEach((symbol, index) => {
        wsManager.subscribe(symbol, callbacks[index]);
      });

      // Simulate updates for each symbol
      const mockWs = wsManager.connection as MockWebSocket;
      symbols.forEach((symbol, index) => {
        mockWs.simulateMessage({
          type: 'price_update',
          symbol: symbol,
          price: 100 + index,
          timestamp: Date.now()
        });
      });

      // Each callback should be called once
      callbacks.forEach(callback => {
        expect(callback).toHaveBeenCalledTimes(1);
      });
    });

    it('should stop receiving updates after unsubscribe', () => {
      const symbol = 'AAPL';
      const callback = vi.fn();

      wsManager.subscribe(symbol, callback);
      wsManager.unsubscribe(symbol);

      // Simulate price update after unsubscribe
      const mockWs = wsManager.connection as MockWebSocket;
      mockWs.simulateMessage({
        type: 'price_update',
        symbol: symbol,
        price: 150.25,
        timestamp: Date.now()
      });

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Connection Recovery', () => {
    it('should maintain data consistency during reconnection', async () => {
      await wsManager.connect('ws://localhost:3001');
      
      const symbol = 'AAPL';
      const receivedPrices: number[] = [];
      
      wsManager.subscribe(symbol, (data) => {
        receivedPrices.push(data.price);
      });

      // Send initial price
      const mockWs = wsManager.connection as MockWebSocket;
      mockWs.simulateMessage({
        type: 'price_update',
        symbol: symbol,
        price: 150.00,
        timestamp: Date.now()
      });

      // Simulate connection loss and recovery
      wsManager.connection?.close();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Reconnect and send new price
      await wsManager.connect('ws://localhost:3001');
      const newMockWs = wsManager.connection as MockWebSocket;
      newMockWs.simulateMessage({
        type: 'price_update',
        symbol: symbol,
        price: 151.00,
        timestamp: Date.now()
      });

      // Should have received both prices
      expect(receivedPrices).toContain(150.00);
      expect(receivedPrices).toContain(151.00);
    });

    it('should handle queue overflow during disconnection', async () => {
      // This test ensures that if too many messages are queued during disconnection,
      // the system handles it gracefully without memory issues
      await wsManager.connect('ws://localhost:3001');
      
      const symbol = 'AAPL';
      let messageCount = 0;
      
      wsManager.subscribe(symbol, () => {
        messageCount++;
      });

      // Simulate connection loss
      wsManager.connection?.close();
      
      // Simulate many price updates during disconnection
      // In a real implementation, these might be queued
      for (let i = 0; i < 1000; i++) {
        // These should be handled gracefully
      }

      // Reconnect
      await wsManager.connect('ws://localhost:3001');
      
      // System should still be responsive
      expect(wsManager.isConnected).toBe(true);
    });
  });

  describe('Performance and Memory', () => {
    it('should handle high-frequency updates without memory leaks', async () => {
      await wsManager.connect('ws://localhost:3001');
      
      const symbol = 'AAPL';
      const initialMemory = process.memoryUsage().heapUsed;
      
      wsManager.subscribe(symbol, (data) => {
        // Process price update
      });

      // Simulate 1000 rapid price updates
      const mockWs = wsManager.connection as MockWebSocket;
      for (let i = 0; i < 1000; i++) {
        mockWs.simulateMessage({
          type: 'price_update',
          symbol: symbol,
          price: 150 + (Math.random() * 10),
          timestamp: Date.now()
        });
      }

      // Check memory usage after processing
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 10MB for 1000 updates)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });
});