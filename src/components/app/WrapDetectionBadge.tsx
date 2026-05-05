import { Badge } from '@/components/ui/badge';

interface WrapDetectionBadgeProps {
  detectedPlatform?: string;
  confidence?: number;
  className?: string;
}

export function WrapDetectionBadge({
  detectedPlatform,
  confidence = 0,
  className = '',
}: WrapDetectionBadgeProps) {
  if (!detectedPlatform) {
    return null;
  }

  const getConfidenceColor = () => {
    if (confidence >= 0.85) return 'bg-green-100 text-green-700';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  const getConfidenceLabel = () => {
    if (confidence >= 0.85) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge variant="outline" className="text-xs">
        {detectedPlatform}
      </Badge>
      <span className={`text-xs px-2 py-1 rounded-md font-medium ${getConfidenceColor()}`}>
        {getConfidenceLabel()} ({Math.round(confidence * 100)}%)
      </span>
    </div>
  );
}
