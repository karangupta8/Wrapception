import { AlertTriangle, WifiOff, KeyRound, Clock, RefreshCw, ShieldAlert, ServerCrash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type ErrorCode, getErrorDetail } from '@/services/errors';

interface AIErrorAlertProps {
  code: ErrorCode;
  /** Raw technical message shown in collapsed details */
  rawMessage?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

const ICON_MAP: Partial<Record<ErrorCode, React.ComponentType<{ className?: string }>>> = {
  NO_API_KEY: KeyRound,
  AI_NOT_ENABLED: KeyRound,
  AI_API_UNAUTHORIZED: ShieldAlert,
  AI_API_RATE_LIMIT: Clock,
  AI_API_NETWORK: WifiOff,
  AI_API_TIMEOUT: Clock,
  AI_API_SERVER_ERROR: ServerCrash,
};

export function AIErrorAlert({ code, rawMessage, onRetry, onDismiss }: AIErrorAlertProps) {
  const detail = getErrorDetail(code);
  const Icon = ICON_MAP[code] ?? AlertTriangle;

  const scrollToTarget = () => {
    if (!detail.actionTarget) return;
    const id = detail.actionTarget === 'ai-config' ? 'ai-config-panel' : 'upload-section';
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="w-full max-w-lg mx-auto rounded-2xl border border-destructive/30 bg-destructive/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 p-4">
        <div className="p-2 rounded-lg bg-destructive/10 shrink-0">
          <Icon className="w-5 h-5 text-destructive" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-destructive">{detail.title}</p>
          <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{detail.description}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-muted-foreground hover:text-foreground shrink-0 text-lg leading-none mt-0.5"
            aria-label="Dismiss error"
          >
            ×
          </button>
        )}
      </div>

      {/* Actions */}
      {(detail.action || onRetry) && (
        <div className="flex items-center gap-2 px-4 pb-4">
          {detail.action && detail.actionTarget && (
            <Button size="sm" variant="outline" onClick={scrollToTarget}>
              {detail.action}
            </Button>
          )}
          {onRetry && (
            <Button size="sm" variant="ghost" onClick={onRetry}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Try again
            </Button>
          )}
        </div>
      )}

      {/* Collapsible raw detail for debugging */}
      {rawMessage && (
        <details className="border-t border-destructive/20">
          <summary className="px-4 py-2 text-xs text-muted-foreground cursor-pointer select-none hover:text-foreground">
            Technical details
          </summary>
          <pre className="px-4 pb-3 text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap break-all">
            {rawMessage}
          </pre>
        </details>
      )}
    </div>
  );
}
