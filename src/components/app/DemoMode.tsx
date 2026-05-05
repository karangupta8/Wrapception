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
  const { session, loadDemoData, setYear, resetSession } = useSession();

  useEffect(() => {
    // Load demo data on mount
    // Set year to 2025
    setYear(2025);

    // Prepare sources with processed status
    const processedSources = SAMPLE_SOURCES.map((source) => ({
      ...source,
      status: 'processed' as const,
    }));

    // Load demo data into session
    loadDemoData(processedSources, SAMPLE_ANALYTICS_DATA);
  }, [setYear, loadDemoData]);

  const handleExit = () => {
    resetSession();
    onExit();
  };

  return (
    <div className="relative">
      {/* Demo Mode Banner */}
      <div className="sticky top-0 z-50 bg-amber-50 border-b border-amber-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-900">Demo Mode — No API Key Required</p>
              <p className="text-sm text-amber-700">
                See how Wrapception unwraps your wraps. All wraps, one year.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleExit}
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
