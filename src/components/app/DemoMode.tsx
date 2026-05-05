import { useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession } from '@/context/SessionContext';
import { Dashboard } from './Dashboard';
import { SAMPLE_ANALYTICS_DATA, SAMPLE_SOURCES } from '@/data/sampleAnalytics';

interface DemoModeProps {
  onExit: () => void;
}

export function DemoMode({ onExit }: DemoModeProps) {
  const { session, loadDemoData, setYear } = useSession();

  useEffect(() => {
    // Only load demo data once on mount
    if (session.uploadedSources.length === 0) {
      // Set year to 2025
      setYear(2025);

      // Prepare sources with processed status
      const processedSources = SAMPLE_SOURCES.map((source) => ({
        ...source,
        status: 'processed' as const,
      }));

      // Load demo data into session
      loadDemoData(processedSources, SAMPLE_ANALYTICS_DATA);
    }
  }, [session.uploadedSources.length, setYear, loadDemoData]);

  return (
    <div className="relative">
      {/* Demo Mode Banner */}
      <div className="sticky top-0 z-50 bg-amber-50 border-b border-amber-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-900">Demo Mode</p>
              <p className="text-sm text-amber-700">
                Explore Wrapception with sample data. No API key needed.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onExit}
            className="text-amber-600 hover:text-amber-700 hover:bg-amber-100"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Dashboard with Demo Data */}
      <div className="pt-8">
        <Dashboard />
      </div>
    </div>
  );
}
