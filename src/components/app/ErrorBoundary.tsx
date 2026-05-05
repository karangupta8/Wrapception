import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, RefreshCw, Download, Trash2 } from 'lucide-react';
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

  handleReload = () => {
    window.location.reload();
  };

  handleTryAgain = () => {
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
                {/* Reload page — primary action, fixes context/HMR issues */}
                <Button
                  onClick={this.handleReload}
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reload Page
                </Button>

                {/* Soft retry — re-renders children without reload */}
                <Button
                  onClick={this.handleTryAgain}
                  variant="outline"
                  className="w-full"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Try Without Reloading
                </Button>

                <div className="flex gap-2">
                  {/* Export logs */}
                  <Button
                    onClick={this.handleExportLogs}
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Export Logs
                  </Button>

                  {/* Reset session */}
                  <Button
                    onClick={this.handleReset_}
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Reset Session
                  </Button>
                </div>
              </div>

              {/* Recovery info */}
              <div className="text-xs text-muted-foreground bg-secondary/50 rounded-lg p-3 space-y-1">
                <p>Your session data is stored locally and safe.</p>
                <p className="text-muted-foreground/60">
                  "Reload Page" fixes most errors. "Reset Session" clears all data and starts fresh.
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
