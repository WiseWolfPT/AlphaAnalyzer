import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription } from './alert';
import { AlertTriangle } from 'lucide-react';
import { Button } from './button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Alert className="m-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            <div>Algo deu errado. Por favor, tente novamente.</div>
            {this.state.error && (
              <details className="text-xs text-muted-foreground">
                <summary>Detalhes do erro</summary>
                <pre className="mt-2 whitespace-pre-wrap">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <Button onClick={this.handleReset} size="sm">
              Tentar Novamente
            </Button>
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}