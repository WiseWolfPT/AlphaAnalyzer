import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    const errorCount = parseInt(localStorage.getItem('errorCount') || '0') + 1;
    localStorage.setItem('errorCount', errorCount.toString());
    
    return {
      hasError: true,
      error,
      errorInfo: null,
      errorCount
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('Error caught by boundary:', error, errorInfo);
    }
    
    // Update state with error details
    this.setState({
      error,
      errorInfo
    });

    // TODO: Send error to logging service (e.g., Sentry)
  }

  handleReset = () => {
    // Reset error count if successful
    localStorage.setItem('errorCount', '0');
    
    // Reset state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    });
    
    // Reload the page
    window.location.reload();
  };

  handleGoHome = () => {
    // Reset error state and navigate home
    localStorage.setItem('errorCount', '0');
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-2xl w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-2xl">Oops! Something went wrong</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertDescription>
                  We encountered an unexpected error. This could be due to:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Network connectivity issues</li>
                    <li>Server temporarily unavailable</li>
                    <li>Too many requests at once</li>
                  </ul>
                </AlertDescription>
              </Alert>

              {/* Show error details in development */}
              {import.meta.env.DEV && this.state.error && (
                <div className="bg-muted p-4 rounded-lg">
                  <p className="font-mono text-sm text-muted-foreground mb-2">
                    {this.state.error.message}
                  </p>
                  {this.state.errorInfo && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        Stack trace
                      </summary>
                      <pre className="mt-2 overflow-auto">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* Error frequency warning */}
              {this.state.errorCount > 2 && (
                <Alert>
                  <AlertDescription>
                    You've encountered this error {this.state.errorCount} times. 
                    Try clearing your browser cache or using a different browser.
                  </AlertDescription>
                </Alert>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 justify-center">
                <Button 
                  onClick={this.handleReset}
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </Button>
                <Button 
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="gap-2"
                >
                  <Home className="w-4 h-4" />
                  Go Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}