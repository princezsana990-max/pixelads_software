import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '../ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React application error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg-app flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-bg-surface border border-status-danger/30 rounded-2xl p-6 sm:p-8 shadow-dropdown text-center">
            <div className="w-14 h-14 rounded-2xl bg-status-danger/10 text-status-danger flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-fg-primary mb-2">Something went wrong</h2>
            <p className="text-sm text-fg-secondary mb-6">
              An unexpected error occurred in OrderFlow Pro. The application has caught this error to prevent a blank screen.
            </p>
            {this.state.error && (
              <div className="mb-6 p-3 bg-bg-secondary rounded-lg text-left text-xs font-mono text-status-danger overflow-x-auto max-h-32 border border-border">
                {this.state.error.toString()}
              </div>
            )}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                variant="primary"
                onClick={this.handleReset}
                icon={<RefreshCw className="w-4 h-4" />}
                className="w-full sm:w-auto"
              >
                Reload Application
              </Button>
              <Button
                variant="outline"
                onClick={() => (window.location.href = '/dashboard')}
                icon={<Home className="w-4 h-4" />}
                className="w-full sm:w-auto"
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
