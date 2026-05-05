import { useState } from 'react';
import { ChevronDown, ChevronUp, RefreshCw, Edit2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UploadedSource, ExtractedMetricAI } from '@/types/session';
import { WrapDetectionBadge } from './WrapDetectionBadge';

interface ExtractionValidationPanelProps {
  source: UploadedSource;
  detectedPlatform?: string;
  confidence?: number;
  metrics?: ExtractedMetricAI[];
  onRetry?: () => void;
  onPlatformOverride?: (platform: string) => void;
  onMetricsEdit?: (metrics: ExtractedMetricAI[]) => void;
}

export function ExtractionValidationPanel({
  source,
  detectedPlatform,
  confidence = 0,
  metrics = [],
  onRetry,
  onPlatformOverride,
  onMetricsEdit,
}: ExtractionValidationPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingPlatform, setIsEditingPlatform] = useState(false);
  const [platformOverride, setPlatformOverride] = useState(detectedPlatform || '');
  const [isEditingMetrics, setIsEditingMetrics] = useState(false);
  const [editedMetrics, setEditedMetrics] = useState<ExtractedMetricAI[]>(metrics);

  const handlePlatformSave = () => {
    if (platformOverride && onPlatformOverride) {
      onPlatformOverride(platformOverride);
    }
    setIsEditingPlatform(false);
  };

  const handleMetricsSave = () => {
    if (onMetricsEdit) {
      onMetricsEdit(editedMetrics);
    }
    setIsEditingMetrics(false);
  };

  const handleMetricChange = (index: number, field: 'label' | 'value', val: string) => {
    const updated = [...editedMetrics];
    updated[index] = {
      ...updated[index],
      [field]: val,
    };
    setEditedMetrics(updated);
  };

  if (source.status !== 'processed' && source.status !== 'failed') {
    return null;
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/50 transition-colors"
      >
        <div className="text-left">
          <p className="font-medium">{source.platformName}</p>
          <p className="text-sm text-muted-foreground">Extraction validation</p>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-border px-4 py-4 space-y-4">
          {/* Platform Detection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Detected Platform</p>
              {source.status === 'processed' && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditingPlatform(!isEditingPlatform)}
                  className="h-6 px-2"
                >
                  {isEditingPlatform ? <X className="w-3 h-3" /> : <Edit2 className="w-3 h-3" />}
                </Button>
              )}
            </div>

            {isEditingPlatform ? (
              <div className="flex gap-2">
                <Input
                  value={platformOverride}
                  onChange={(e) => setPlatformOverride(e.target.value)}
                  placeholder="Enter platform name"
                  className="h-8 text-sm"
                />
                <Button
                  size="sm"
                  onClick={handlePlatformSave}
                  className="h-8 px-3"
                >
                  <Save className="w-3 h-3 mr-1" />
                  Save
                </Button>
              </div>
            ) : (
              <WrapDetectionBadge
                detectedPlatform={detectedPlatform}
                confidence={confidence}
              />
            )}
          </div>

          {/* Confidence Indicator */}
          {source.status === 'processed' && (
            <div>
              <p className="text-sm font-medium mb-2">Extraction Confidence</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      confidence >= 0.85
                        ? 'bg-green-500'
                        : confidence >= 0.6
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                    }`}
                    style={{ width: `${confidence * 100}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {Math.round(confidence * 100)}%
                </span>
              </div>
            </div>
          )}

          {/* Metrics */}
          {metrics.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Extracted Metrics ({metrics.length})</p>
                {source.status === 'processed' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditingMetrics(!isEditingMetrics)}
                    className="h-6 px-2"
                  >
                    {isEditingMetrics ? <X className="w-3 h-3" /> : <Edit2 className="w-3 h-3" />}
                  </Button>
                )}
              </div>

              {isEditingMetrics ? (
                <div className="space-y-2">
                  {editedMetrics.map((metric, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        value={metric.label}
                        onChange={(e) => handleMetricChange(idx, 'label', e.target.value)}
                        placeholder="Metric name"
                        className="h-8 text-sm flex-1"
                      />
                      <Input
                        value={String(metric.value)}
                        onChange={(e) => handleMetricChange(idx, 'value', e.target.value)}
                        placeholder="Value"
                        className="h-8 text-sm flex-1"
                      />
                    </div>
                  ))}
                  <Button
                    size="sm"
                    onClick={handleMetricsSave}
                    className="h-8 w-full"
                  >
                    <Save className="w-3 h-3 mr-1" />
                    Save Changes
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {editedMetrics.map((metric, idx) => (
                    <div key={idx} className="p-2 rounded bg-secondary/50 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">{metric.label}</span>
                        <span className="text-muted-foreground">{metric.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Retry Button */}
          {source.status === 'failed' && onRetry && (
            <Button
              size="sm"
              onClick={onRetry}
              className="w-full"
              variant="outline"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry Extraction
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
