// HTTP interceptor for logging all requests and responses
import logger from './logger';

export interface InterceptorConfig {
  logRequests: boolean;
  logResponses: boolean;
  logHeaders: boolean;
  measurePerformance: boolean;
}

class HttpInterceptor {
  private config: InterceptorConfig;
  private originalFetch: typeof fetch;

  constructor(config: Partial<InterceptorConfig> = {}) {
    this.config = {
      logRequests: true,
      logResponses: true,
      logHeaders: true,
      measurePerformance: true,
      ...config,
    };
    
    this.originalFetch = window.fetch.bind(window);
    this.setupInterceptor();
  }

  private setupInterceptor(): void {
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const startTime = performance.now();
      const url = input instanceof Request ? input.url : input.toString();
      const method = init?.method || 'GET';
      
      let correlationId: string | undefined;
      
      // Log request
      if (this.config.logRequests) {
        const headers = this.config.logHeaders ? this.extractHeaders(init?.headers) : undefined;
        correlationId = logger.logRequest(method, url, init?.body, headers);
      }
      
      try {
        const response = await this.originalFetch(input, init);
        const duration = performance.now() - startTime;
        
        // Clone response to read body without consuming it
        const clonedResponse = response.clone();
        
        // Log response
        if (this.config.logResponses && correlationId) {
          let responseData: any;
          
          try {
            const contentType = response.headers.get('content-type');
            if (contentType?.includes('application/json')) {
              responseData = await clonedResponse.json();
            } else {
              responseData = await clonedResponse.text();
            }
          } catch {
            responseData = '[Unable to parse response]';
          }
          
          logger.logResponse(
            correlationId,
            response.status,
            url,
            responseData,
            this.config.measurePerformance ? duration : undefined
          );
          
          // Log specific auth errors
          if (response.status === 401) {
            logger.error('🚨 Authentication Error (401)', {
              url,
              method,
              status: 401,
              headers: this.extractHeaders(response.headers),
              correlationId,
            });
          }
          
          // Log CORS errors
          if (response.status === 0 || response.type === 'opaque') {
            logger.error('🚨 Possible CORS Error', {
              url,
              method,
              responseType: response.type,
              correlationId,
            });
          }
        }
        
        return response;
      } catch (error) {
        const duration = performance.now() - startTime;
        
        // Log network errors
        logger.error('🚨 Network Error', {
          url,
          method,
          error: error instanceof Error ? error.message : String(error),
          duration,
          correlationId,
        });
        
        throw error;
      }
    };
  }

  private extractHeaders(headers?: HeadersInit): Record<string, string> | undefined {
    if (!headers) return undefined;
    
    const result: Record<string, string> = {};
    
    if (headers instanceof Headers) {
      headers.forEach((value, key) => {
        result[key] = value;
      });
    } else if (Array.isArray(headers)) {
      headers.forEach(([key, value]) => {
        result[key] = value;
      });
    } else {
      Object.assign(result, headers);
    }
    
    return result;
  }

  updateConfig(config: Partial<InterceptorConfig>): void {
    Object.assign(this.config, config);
  }

  disable(): void {
    window.fetch = this.originalFetch;
  }
}

// Create and export singleton instance
const httpInterceptor = new HttpInterceptor();
export default httpInterceptor;

// Axios-like interceptor for better compatibility
export function setupAxiosInterceptor(axiosInstance: any): void {
  // Request interceptor
  axiosInstance.interceptors.request.use(
    (config: any) => {
      const correlationId = logger.generateCorrelationId();
      config.metadata = { startTime: performance.now(), correlationId };
      
      logger.logRequest(
        config.method?.toUpperCase() || 'GET',
        config.url,
        config.data,
        config.headers
      );
      
      return config;
    },
    (error: any) => {
      logger.error('Request setup error', { error: error.message });
      return Promise.reject(error);
    }
  );
  
  // Response interceptor
  axiosInstance.interceptors.response.use(
    (response: any) => {
      const duration = performance.now() - response.config.metadata?.startTime;
      
      logger.logResponse(
        response.config.metadata?.correlationId,
        response.status,
        response.config.url,
        response.data,
        duration
      );
      
      return response;
    },
    (error: any) => {
      const duration = performance.now() - error.config?.metadata?.startTime;
      
      if (error.response) {
        logger.logResponse(
          error.config?.metadata?.correlationId,
          error.response.status,
          error.config?.url,
          error.response.data,
          duration
        );
        
        if (error.response.status === 401) {
          logger.error('🚨 Auth Error in Axios', {
            url: error.config?.url,
            status: 401,
            data: error.response.data,
          });
        }
      } else {
        logger.error('🚨 Network Error in Axios', {
          url: error.config?.url,
          message: error.message,
          duration,
        });
      }
      
      return Promise.reject(error);
    }
  );
}