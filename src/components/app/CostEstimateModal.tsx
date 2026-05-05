import { AlertCircle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { UploadedSource } from '@/types/session';

interface CostEstimateModalProps {
  open: boolean;
  sources: UploadedSource[];
  onConfirm: () => void;
  onCancel: () => void;
}

// Rough pricing estimates (in USD) for common AI providers
const PRICING = {
  vision_image: 0.01, // GPT-4o-mini image analysis
  text_extraction: 0.001, // Token estimates for PDF/text extraction
  synthesis: 0.005, // Cross-source synthesis
};

function estimateCost(sources: UploadedSource[]): { usd: number; minutes: number } {
  let baseCost = 0;
  let imageCount = 0;
  let pdfCount = 0;
  let textCount = 0;

  sources.forEach(source => {
    if (source.inputType === 'image') {
      imageCount++;
      baseCost += PRICING.vision_image;
    } else if (source.inputType === 'pdf') {
      pdfCount++;
      baseCost += PRICING.text_extraction * 2; // First attempt text, then image fallback
    } else {
      textCount++;
      baseCost += PRICING.text_extraction;
    }
  });

  // Add synthesis cost (roughly proportional to number of sources)
  baseCost += PRICING.synthesis * Math.min(sources.length, 5);

  // Estimate time: ~2-3 seconds per image, ~1 second per text, +5 seconds synthesis
  const estimatedSeconds =
    imageCount * 2.5 +
    (pdfCount + textCount) * 1 +
    5;

  return {
    usd: Math.round(baseCost * 100) / 100, // Round to cents
    minutes: Math.ceil(estimatedSeconds / 60),
  };
}

export function CostEstimateModal({
  open,
  sources,
  onConfirm,
  onCancel,
}: CostEstimateModalProps) {
  const { usd, minutes } = estimateCost(sources);
  const imageCount = sources.filter(s => s.inputType === 'image').length;
  const pdfCount = sources.filter(s => s.inputType === 'pdf').length;
  const textCount = sources.filter(s => s.inputType === 'text').length;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Estimate Cost & Time
          </DialogTitle>
          <DialogDescription>
            Review the estimated cost and time before running AI extraction
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Source Breakdown */}
          <div className="bg-secondary/50 rounded-lg p-3 text-sm space-y-1">
            <p className="font-medium">Sources to analyze:</p>
            <div className="text-muted-foreground space-y-0.5 ml-2">
              {imageCount > 0 && <p>• {imageCount} image(s)</p>}
              {pdfCount > 0 && <p>• {pdfCount} PDF(s)</p>}
              {textCount > 0 && <p>• {textCount} text entry/entries</p>}
            </div>
          </div>

          {/* Cost Display */}
          <div className="border border-border rounded-lg p-4 bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Estimated Cost:</span>
                <span className="text-2xl font-bold text-green-600">
                  ${usd.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Estimated Time:</span>
                <span className="text-lg font-medium">
                  ~{minutes === 1 ? 'less than a minute' : `${minutes} minute${minutes !== 1 ? 's' : ''}`}
                </span>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <p className="font-medium mb-0.5">This is an estimate</p>
              <p>Actual costs may vary based on response length and provider pricing.</p>
            </div>
          </div>

          {/* Security Note */}
          <div className="text-xs text-muted-foreground bg-secondary/30 rounded p-2">
            🔒 Your data is sent to the configured AI provider. See your AI configuration for details.
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white border-0"
          >
            Proceed (${usd.toFixed(2)})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
