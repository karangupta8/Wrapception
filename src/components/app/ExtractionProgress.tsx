import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { UploadedSource } from '@/types/session';

interface ExtractionProgressProps {
  source: UploadedSource;
  index: number;
  total: number;
}

export function ExtractionProgress({ source, index, total }: ExtractionProgressProps) {
  const getStatusIcon = () => {
    switch (source.status) {
      case 'processing':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'processed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStatusText = () => {
    switch (source.status) {
      case 'processing':
        return 'Analysing…';
      case 'processed':
        return 'Done';
      case 'failed':
        return 'Failed';
      default:
        return 'Ready';
    }
  };

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-shrink-0">{getStatusIcon()}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium truncate">{source.platformName}</span>
          <span className="text-xs text-muted-foreground">{index + 1} of {total}</span>
        </div>
        {source.status === 'failed' && source.extractionError && (
          <p className="text-xs text-red-600 truncate">{source.extractionError}</p>
        )}
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">{getStatusText()}</span>
    </div>
  );
}
