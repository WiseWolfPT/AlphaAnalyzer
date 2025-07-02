#!/usr/bin/env tsx

/**
 * Connectivity Test Script
 * Tests frontend-backend proxy configuration and API connectivity
 */

import { checkAPIHealth, environment, apiConfig, enhancedFetch } from '../client/src/lib/api-config';

interface TestResult {
  test: string;
  success: boolean;
  responseTime: number;
  error?: string;
  details?: any;
}

class ConnectivityTester {
  private results: TestResult[] = [];

  async runAllTests(): Promise<void> {
    console.log('🧪 Running Frontend-Backend Connectivity Tests\n');
    console.log(`Environment: ${environment.name}`);
    console.log(`API Base: ${environment.apiBase}`);
    console.log(`WS Base: ${environment.wsBase}`);
    console.log(`Config Base URL: ${apiConfig.baseURL}\n`);

    // Test direct backend connection
    await this.testDirectBackend();
    
    // Test proxy connection (if in development)
    if (environment.name === 'development') {
      await this.testProxyConnection();
    }
    
    // Test specific API endpoints
    await this.testAPIEndpoints();
    
    // Test CORS configuration
    await this.testCORS();
    
    // Print summary
    this.printSummary();
  }

  private async testDirectBackend(): Promise<void> {
    const test = 'Direct Backend Connection';
    console.log(`🔍 Testing: ${test}`);
    
    const startTime = Date.now();
    
    try {
      const response = await fetch('http://localhost:3001/api/health', {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      this.results.push({
        test,
        success: true,
        responseTime: Date.now() - startTime,
        details: data
      });
      
      console.log(`✅ ${test}: OK (${Date.now() - startTime}ms)`);
    } catch (error) {
      this.results.push({
        test,
        success: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      console.log(`❌ ${test}: Failed - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async testProxyConnection(): Promise<void> {
    const test = 'Vite Proxy Connection';
    console.log(`🔍 Testing: ${test}`);
    
    const startTime = Date.now();
    
    try {
      const response = await fetch('http://localhost:3000/api/health', {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      this.results.push({
        test,
        success: true,
        responseTime: Date.now() - startTime,
        details: data
      });
      
      console.log(`✅ ${test}: OK (${Date.now() - startTime}ms)`);
    } catch (error) {
      this.results.push({
        test,
        success: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      console.log(`❌ ${test}: Failed - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async testAPIEndpoints(): Promise<void> {
    const endpoints = [
      { name: 'Health Check', path: '/api/health' },
      { name: 'API Info', path: '/api' },
      { name: 'Stocks List', path: '/api/stocks?limit=1' },
      { name: 'Market Indices', path: '/api/market-indices' }
    ];

    for (const endpoint of endpoints) {
      const test = `API Endpoint: ${endpoint.name}`;
      console.log(`🔍 Testing: ${test}`);
      
      const startTime = Date.now();
      
      try {
        const response = await enhancedFetch(endpoint.path, {
          method: 'GET'
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        this.results.push({
          test,
          success: true,
          responseTime: Date.now() - startTime,
          details: Array.isArray(data) ? `Array with ${data.length} items` : typeof data
        });
        
        console.log(`✅ ${test}: OK (${Date.now() - startTime}ms)`);
      } catch (error) {
        this.results.push({
          test,
          success: false,
          responseTime: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        console.log(`❌ ${test}: Failed - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  private async testCORS(): Promise<void> {
    const test = 'CORS Configuration';
    console.log(`🔍 Testing: ${test}`);
    
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${apiConfig.baseURL}/health`, {
        method: 'GET',
        headers: {
          'Origin': 'http://localhost:3000'
        },
        signal: AbortSignal.timeout(5000)
      });

      const corsHeaders = {
        'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
        'access-control-allow-credentials': response.headers.get('access-control-allow-credentials'),
        'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
        'access-control-allow-headers': response.headers.get('access-control-allow-headers')
      };

      this.results.push({
        test,
        success: response.ok,
        responseTime: Date.now() - startTime,
        details: corsHeaders
      });
      
      console.log(`✅ ${test}: OK (${Date.now() - startTime}ms)`);
      console.log(`   CORS Headers:`, corsHeaders);
    } catch (error) {
      this.results.push({
        test,
        success: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      console.log(`❌ ${test}: Failed - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private printSummary(): void {
    console.log('\n📊 Test Results Summary:');
    console.log('=' * 50);
    
    const successful = this.results.filter(r => r.success).length;
    const total = this.results.length;
    const avgResponseTime = this.results.reduce((sum, r) => sum + r.responseTime, 0) / total;
    
    console.log(`Tests Passed: ${successful}/${total} (${Math.round(successful/total * 100)}%)`);
    console.log(`Average Response Time: ${Math.round(avgResponseTime)}ms`);
    
    console.log('\nDetailed Results:');
    this.results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.test}: ${result.responseTime}ms`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      if (result.details) {
        console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
      }
    });

    console.log('\n🔧 Configuration Summary:');
    console.log(`Environment: ${environment.name}`);
    console.log(`API Base URL: ${apiConfig.baseURL}`);
    console.log(`WebSocket URL: ${apiConfig.wsURL}`);
    console.log(`Debug Mode: ${environment.debug}`);
    
    if (successful === total) {
      console.log('\n🎉 All connectivity tests passed! Frontend-Backend communication is working correctly.');
    } else {
      console.log('\n⚠️ Some tests failed. Check the detailed results above for issues.');
    }
  }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new ConnectivityTester();
  tester.runAllTests().catch(error => {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  });
}

export { ConnectivityTester };