import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class DebugErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          backgroundColor: 'white',
          color: 'black',
          padding: '20px',
          fontFamily: 'monospace',
          minHeight: '100vh'
        }}>
          <h1>Error in Alfalyzer</h1>
          <pre style={{ color: 'red' }}>
            {this.state.error?.toString()}
          </pre>
          <p>Stack trace:</p>
          <pre style={{ fontSize: '12px' }}>
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}