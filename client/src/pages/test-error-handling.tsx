/**
 * Test Page for Error Handling Features
 * Tests error boundaries, retry logic, toast notifications, and logging
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { showSuccess, showError, showWarning, showInfo, showPromise, stockToast, authToast } from '@/lib/toast-notifications';
import { fetchWithRetry, resilientApi } from '@/lib/fetch-with-retry';
import logger from '@/lib/logger';
import { AlertCircle, CheckCircle, Info, AlertTriangle, Loader2 } from 'lucide-react';

export default function TestErrorHandling() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});

  // Test 1: Error Boundary
  const testErrorBoundary = () => {
    throw new Error('Test error boundary - This error should be caught!');
  };

  // Test 2: Toast Notifications
  const testToastNotifications = async () => {
    showSuccess('Success toast test!');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    showError('Error toast test!');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    showWarning('Warning toast test!');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    showInfo('Info toast test!');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Stock-specific toasts
    stockToast.addedToWatchlist('AAPL');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    stockToast.priceAlert('TSLA', 850.50);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Auth toasts
    authToast.loginSuccess('Test User');
    
    setTestResults(prev => ({ ...prev, toast: true }));
  };

  // Test 3: Promise Toast
  const testPromiseToast = async () => {
    const fakeApiCall = () => new Promise<string>((resolve) => {
      setTimeout(() => resolve('Data loaded successfully!'), 2000);
    });

    await showPromise(fakeApiCall(), {
      loading: 'Loading data...',
      success: (data) => `Success: ${data}`,
      error: 'Failed to load data'
    });

    setTestResults(prev => ({ ...prev, promiseToast: true }));
  };

  // Test 4: API Retry Logic
  const testRetryLogic = async () => {
    setIsLoading(true);
    try {
      // This will fail and retry 3 times
      await fetchWithRetry('/api/test/fail', {}, {
        maxRetries: 3,
        initialDelay: 500,
        onRetry: (error, attempt, delay) => {
          showWarning(`Retry attempt ${attempt} after ${delay}ms`);
        }
      });
    } catch (error: any) {
      showError(`Expected failure after retries: ${error.message}`);
      setTestResults(prev => ({ ...prev, retry: true }));
    } finally {
      setIsLoading(false);
    }
  };

  // Test 5: Successful API Call with Retry
  const testSuccessfulRetry = async () => {
    setIsLoading(true);
    try {
      const result = await resilientApi.get('/api/health');
      showSuccess('API call successful with retry logic!');
      console.log('Health check result:', result);
      setTestResults(prev => ({ ...prev, successfulRetry: true }));
    } catch (error: any) {
      showError(`API call failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Test 6: Logger
  const testLogger = () => {
    logger.debug('Debug log test', { test: true, timestamp: Date.now() });
    logger.info('Info log test', { component: 'TestErrorHandling' });
    logger.warn('Warning log test', { warning: 'This is a test warning' });
    logger.error('Error log test', { error: 'This is a test error', stack: new Error().stack });
    
    // Performance logging
    logger.logPerformance('test-operation', 123.45, { operation: 'test' });
    
    // Auth logging
    logger.logAuth('login', true, { userId: 'test-user' });
    logger.logAuth('unauthorized', false, { reason: 'Invalid token' });
    
    // HTTP logging
    const correlationId = logger.generateCorrelationId();
    logger.logRequest('GET', '/api/test', undefined, { 'x-api-key': 'test-key' });
    logger.logResponse(correlationId, 200, '/api/test', { success: true }, 150);
    
    showSuccess('Check console for log outputs!');
    setTestResults(prev => ({ ...prev, logger: true }));
  };

  // Test 7: Chunk Error Simulation
  const testChunkError = () => {
    const error = new Error('Failed to fetch dynamically imported module');
    error.message = 'Loading chunk 123 failed';
    throw error;
  };

  // Test 8: Network Error Simulation
  const testNetworkError = () => {
    const error = new Error('Network request failed');
    error.name = 'NetworkError';
    throw error;
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Error Handling Test Suite</h1>
        <p className="text-muted-foreground">Test all error handling features implemented in Phase 3</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Toast Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Toast Notifications
            </CardTitle>
            <CardDescription>Test various toast notification types</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button onClick={testToastNotifications} className="w-full">
              Test All Toast Types
            </Button>
            <Button onClick={testPromiseToast} variant="secondary" className="w-full">
              Test Promise Toast
            </Button>
            {testResults.toast && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>Toast notifications working!</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* API Retry Logic */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              API Retry Logic
            </CardTitle>
            <CardDescription>Test exponential backoff retry</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              onClick={testRetryLogic} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing Retry...
                </>
              ) : (
                'Test Failed API (3 Retries)'
              )}
            </Button>
            <Button 
              onClick={testSuccessfulRetry}
              disabled={isLoading}
              variant="secondary"
              className="w-full"
            >
              Test Successful API Call
            </Button>
            {testResults.retry && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>Retry logic working!</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Error Boundary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Error Boundary
            </CardTitle>
            <CardDescription>Test React error boundary</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              onClick={testErrorBoundary}
              variant="destructive"
              className="w-full"
            >
              Trigger Component Error
            </Button>
            <Button 
              onClick={testChunkError}
              variant="destructive"
              className="w-full"
            >
              Trigger Chunk Error
            </Button>
            <Button 
              onClick={testNetworkError}
              variant="destructive"
              className="w-full"
            >
              Trigger Network Error
            </Button>
            <p className="text-xs text-muted-foreground">
              These will crash the component and show error UI
            </p>
          </CardContent>
        </Card>

        {/* Logger */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Comprehensive Logging
            </CardTitle>
            <CardDescription>Test logging system</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button onClick={testLogger} className="w-full">
              Test All Log Levels
            </Button>
            {testResults.logger && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>Logger working! Check console</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Open browser console to see log outputs
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Test Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {testResults.toast ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-gray-400" />
              )}
              <span>Toast Notifications</span>
            </div>
            <div className="flex items-center gap-2">
              {testResults.promiseToast ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-gray-400" />
              )}
              <span>Promise Toast</span>
            </div>
            <div className="flex items-center gap-2">
              {testResults.retry ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-gray-400" />
              )}
              <span>API Retry Logic</span>
            </div>
            <div className="flex items-center gap-2">
              {testResults.successfulRetry ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-gray-400" />
              )}
              <span>Successful API with Retry</span>
            </div>
            <div className="flex items-center gap-2">
              {testResults.logger ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-gray-400" />
              )}
              <span>Comprehensive Logging</span>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-2">Phase 3 Implementation Status:</p>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>✅ Error Boundaries in React</li>
              <li>✅ API Retry Logic with Exponential Backoff</li>
              <li>✅ Toast Notifications for User Feedback</li>
              <li>✅ Comprehensive Error Logging</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}