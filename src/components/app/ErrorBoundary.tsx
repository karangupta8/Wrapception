import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger } from '@/services/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const errorId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.setState({
      error,
      errorInfo,
      errorId,
    });

    // Log to service
    logger.error('ErrorBoundary', `Unhandled error: ${error.message}`, error, {
      errorId,
      componentStack: errorInfo.componentStack,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    });
  };

  handleExportLogs = async () => {
    try {
      const logsJson = await logger.exportLogs();
      const blob = new Blob([logsJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wrapception-logs-${this.state.errorId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export logs:', err);
    }
  };

  handleReset_ = () => {
    try {
      localStorage.removeItem('wrapception_session');
      window.location.reload();
    } catch (err) {
      console.error('Failed to reset session:', err);
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="rounded-2xl bg-card shadow-card border border-destructive/20 p-6 space-y-4">
              {/* Error icon */}
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 mx-auto">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>

              {/* Error heading */}
              <div className="text-center">
                <h1 className="font-display text-2xl mb-2">Something Went Wrong</h1>
                <p className="text-sm text-muted-foreground">
                  An unexpected error occurred. Here are your options:
                </p>
              </div>

              {/* Error details (collapsible) */}
              <details className="text-xs bg-secondary/50 rounded-lg p-3">
                <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground">
                  Error Details (ID: {this.state.errorId})
                </summary>
                <div className="mt-2 space-y-2 text-destructive/80 font-mono text-xs overflow-auto max-h-48">
                  <div>
                    <strong>Message:</strong> {this.state.error?.message}
                  </div>
                  {this.state.errorInfo && (
                    <div>
                      <strong>Component Stack:</strong>
                      <pre className="whitespace-pre-wrap break-words bg-black/20 p-2 rounded mt-1">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>

              {/* Actions */}
              <div className="space-y-3">
                {/* Try again */}
                <Button
                  onClick={this.handleReset}
                  className="w-full"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>

                {/* Export logs */}
                <Button
                  onClick={this.handleExportLogs}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Logs
                </Button>

                {/* Reset session */}
                <Button
                  onClick={this.handleReset_}
                  variant="outline"
                  className="w-full text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Reset Session
                </Button>
              </div>

              {/* Recovery info */}
              <div className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p>
                  <strong>What happened?</strong> An unexpected error in the application. Your data is safely stored
                  in your browser.
                </p>
                <p className="mt-2">
                  <strong>Next steps:</strong> Click "Try Again" to reload the component, or "Reset Session" to start fresh.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
