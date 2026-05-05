import { useState, useEffect } from 'react';
import { AlertCircle, AlertTriangle, Download, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger, type LogStats } from '@/services/logger';

export function DebugPanel() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const updateStats = async () => {
      const newStats = await logger.getStats();
      setStats(newStats);
    };

    updateStats();
    const interval = setInterval(updateStats, 5000); // Refresh every 5s

    return () => clearInterval(interval);
  }, []);

  const handleExport = async () => {
    setIsLoading(true);
    try {
      const logsJson = await logger.exportLogs();
      const blob = new Blob([logsJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wrapception-debug-logs-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = async () => {
    if (confirm('Are you sure? This will delete all logs.')) {
      try {
        await logger.clearLogs();
        setStats(await logger.getStats());
      } catch (err) {
        console.error('Failed to clear logs:', err);
      }
    }
  };

  if (!stats) {
    return null;
  }

  return (
    <div className="bg-card rounded-2xl shadow-card overflow-hidden border border-border">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-muted-foreground" />
          <div className="text-left">
            <h3 className="font-medium text-sm">Debug Panel</h3>
            <p className="text-xs text-muted-foreground">
              {stats.totalLogs} logs
              {stats.errorCount > 0 && ` • ${stats.errorCount} error${stats.errorCount !== 1 ? 's' : ''}`}
              {stats.warningCount > 0 && ` • ${stats.warningCount} warning${stats.warningCount !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 border-t border-border space-y-4">
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Total Logs</p>
              <p className="text-2xl font-bold">{stats.totalLogs}</p>
            </div>

            <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-3">
              <p className="text-xs text-red-600 dark:text-red-400">Errors</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.errorCount}</p>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3">
              <p className="text-xs text-amber-600 dark:text-amber-400">Warnings</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.warningCount}</p>
            </div>

            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Uptime</p>
              <p className="text-sm font-mono text-muted-foreground">
                {stats.newestLog ? new Date(stats.newestLog).toLocaleTimeString() : '—'}
              </p>
            </div>
          </div>

          {/* Alerts */}
          {stats.errorCount > 0 && (
            <div className="flex gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="text-xs text-red-700 dark:text-red-300">
                {stats.errorCount} error{stats.errorCount !== 1 ? 's' : ''} logged. Export logs for debugging.
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleExport}
              disabled={isLoading || stats.totalLogs === 0}
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
            >
              <Download className="w-3 h-3 mr-1" />
              {isLoading ? 'Exporting...' : 'Export'}
            </Button>

            <Button
              onClick={handleClear}
              disabled={stats.totalLogs === 0}
              variant="outline"
              size="sm"
              className="flex-1 text-xs text-destructive hover:text-destructive"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Clear
            </Button>
          </div>

          {/* Info */}
          <div className="text-xs text-muted-foreground bg-secondary/50 rounded-lg p-2">
            <p>Logs are stored locally in your browser and automatically expire after 7 days.</p>
          </div>
        </div>
      )}
    </div>
  );
}
