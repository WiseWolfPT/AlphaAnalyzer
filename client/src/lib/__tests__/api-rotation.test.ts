import { APIRotation } from '../api-rotation';
import type { APIProvider } from '../api-rotation';

// Mock fetch
global.fetch = jest.fn();

describe('APIRotation', () => {
  let apiRotation: APIRotation;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  const mockProviders: APIProvider[] = [
    {
      name: 'Provider1',
      endpoint: 'https://api1.example.com',
      rateLimit: { requests: 5, window: 60000 },
      priority: 1,
    },
    {
      name: 'Provider2',
      endpoint: 'https://api2.example.com',
      rateLimit: { requests: 10, window: 60000 },
      priority: 2,
    },
    {
      name: 'Provider3',
      endpoint: 'https://api3.example.com',
      rateLimit: { requests: 100, window: 60000 },
      priority: 3,
    },
  ];

  beforeEach(() => {
    apiRotation = new APIRotation(mockProviders);
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Provider Selection', () => {
    it('should select providers by priority', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'success' }),
      } as Response);

      const result = await apiRotation.request('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api1.example.com/test',
        expect.any(Object)
      );
      expect(result).toEqual({ data: 'success' });
    });

    it('should fallback to next provider on failure', async () => {
      // First provider fails
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      // Second provider succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'success from provider2' }),
      } as Response);

      const result = await apiRotation.request('/test');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'https://api1.example.com/test',
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'https://api2.example.com/test',
        expect.any(Object)
      );
      expect(result).toEqual({ data: 'success from provider2' });
    });

    it('should throw error when all providers fail', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(apiRotation.request('/test')).rejects.toThrow(
        'All API providers failed'
      );

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('Rate Limiting', () => {
    it('should respect rate limits', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: 'success' }),
      } as Response);

      // Make requests up to the rate limit
      for (let i = 0; i < 5; i++) {
        await apiRotation.request('/test');
      }

      expect(mockFetch).toHaveBeenCalledTimes(5);
      expect(mockFetch).toHaveBeenLastCalledWith(
        'https://api1.example.com/test',
        expect.any(Object)
      );

      // Next request should use provider 2 due to rate limit
      await apiRotation.request('/test');

      expect(mockFetch).toHaveBeenCalledTimes(6);
      expect(mockFetch).toHaveBeenLastCalledWith(
        'https://api2.example.com/test',
        expect.any(Object)
      );
    });

    it('should reset rate limits after window expires', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: 'success' }),
      } as Response);

      // Exhaust provider 1 rate limit
      for (let i = 0; i < 5; i++) {
        await apiRotation.request('/test');
      }

      // Fast forward past rate limit window
      jest.advanceTimersByTime(61000);

      // Should use provider 1 again
      await apiRotation.request('/test');

      expect(mockFetch).toHaveBeenLastCalledWith(
        'https://api1.example.com/test',
        expect.any(Object)
      );
    });
  });

  describe('Request Options', () => {
    it('should pass through request options', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'success' }),
      } as Response);

      const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: 'data' }),
      };

      await apiRotation.request('/test', options);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api1.example.com/test',
        expect.objectContaining(options)
      );
    });

    it('should add timeout to requests', async () => {
      // Mock a hanging request
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const timeoutPromise = apiRotation.request('/test', {}, 1000);

      jest.advanceTimersByTime(1001);

      await expect(timeoutPromise).rejects.toThrow('Request timeout');
    });
  });

  describe('Error Handling', () => {
    it('should handle HTTP error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      } as Response);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'success' }),
      } as Response);

      const result = await apiRotation.request('/test');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ data: 'success' });
    });

    it('should mark provider as unhealthy after consecutive failures', async () => {
      // Make provider 1 fail 3 times
      for (let i = 0; i < 3; i++) {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: 'success from provider2' }),
        } as Response);
        await apiRotation.request('/test');
      }

      // Next request should skip provider 1
      mockFetch.mockClear();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'success' }),
      } as Response);

      await apiRotation.request('/test');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api2.example.com/test',
        expect.any(Object)
      );
    });
  });

  describe('Statistics', () => {
    it('should track provider statistics', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: 'success' }),
        } as Response)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: 'success' }),
        } as Response);

      await apiRotation.request('/test');
      await apiRotation.request('/test');

      const stats = apiRotation.getStatistics();

      expect(stats.Provider1.requests).toBe(2);
      expect(stats.Provider1.successes).toBe(1);
      expect(stats.Provider1.failures).toBe(1);
      expect(stats.Provider1.successRate).toBe(0.5);
      expect(stats.Provider2.requests).toBe(1);
      expect(stats.Provider2.successes).toBe(1);
      expect(stats.Provider2.successRate).toBe(1);
    });

    it('should calculate average response times', async () => {
      let resolveResponse: (value: Response) => void;
      mockFetch.mockImplementation(() => {
        return new Promise((resolve) => {
          resolveResponse = resolve;
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({ data: 'success' }),
            } as Response);
          }, 100);
        });
      });

      const startTime = Date.now();
      await apiRotation.request('/test');
      const endTime = Date.now();

      const stats = apiRotation.getStatistics();
      const responseTime = stats.Provider1.avgResponseTime;

      expect(responseTime).toBeGreaterThanOrEqual(90);
      expect(responseTime).toBeLessThanOrEqual(endTime - startTime + 10);
    });
  });
});