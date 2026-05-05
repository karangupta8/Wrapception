import { useState } from 'react';
import { Plus, Sparkles, FileJson, FolderUp, Loader2, AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useSession } from '@/context/SessionContext';
import { SourceCard } from './SourceCard';
import { AIConfigPanel } from './AIConfigPanel';
import { AIErrorAlert } from './AIErrorAlert';
import { UploadWizard } from './UploadWizard';
import { QuickUpload } from './QuickUpload';
import { BulkUploadModal } from './BulkUploadModal';
import { StatsOverview } from './StatsOverview';
import { CategoryPieChart } from './CategoryPieChart';
import { PlatformBarChart } from './PlatformBarChart';
import { InsightsDashboard } from './InsightsDashboard';
import { ExtractionProgress } from './ExtractionProgress';
import { ExtractionValidationPanel } from './ExtractionValidationPanel';
import { useToast } from '@/hooks/use-toast';

export function Dashboard() {
  const {
    session,
    removeSource,
    updateNarrative,
    generateInsights,
    exportSession,
    insightsError,
    insightsErrorCode,
  } = useSession();
  const [showUploadWizard, setShowUploadWizard] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [isEditingNarrative, setIsEditingNarrative] = useState(false);
  const [errorDismissed, setErrorDismissed] = useState(false);
  const { toast } = useToast();

  const hasFailedSources = session.uploadedSources.some((s) => s.status === 'failed');
  const hasProcessingSources = session.uploadedSources.some((s) => s.status === 'processing');

  const handleExport = () => {
    const data = exportSession();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wrapception-${session.year}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Exported successfully",
      description: "Your Wrapception has been downloaded as JSON.",
    });
  };

  const handleGenerateInsights = async () => {
    setErrorDismissed(false);
    try {
      await generateInsights();
      toast({
        title: 'Insights generated',
        description: 'AI has analysed your data and generated insights.',
      });
    } catch {
      // Error surfaced via insightsError / insightsErrorCode from context
    }
  };

  if (showUploadWizard) {
    return (
      <UploadWizard
        onComplete={() => setShowUploadWizard(false)}
        onCancel={() => setShowUploadWizard(false)}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Bulk Upload Modal */}
      <BulkUploadModal open={showBulkUpload} onOpenChange={setShowBulkUpload} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl md:text-5xl">Your {session.year}</h1>
          <p className="text-muted-foreground mt-1">
            {session.uploadedSources.length} source{session.uploadedSources.length !== 1 ? 's' : ''} uploaded
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleExport} disabled={session.uploadedSources.length === 0}>
            <FileJson className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={() => setShowBulkUpload(true)}>
            <FolderUp className="w-4 h-4 mr-2" />
            Bulk Upload
          </Button>
          <Button onClick={() => setShowUploadWizard(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Wizard
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <StatsOverview />

      {/* Quick Upload + Charts Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick Upload */}
        <QuickUpload className="lg:col-span-1" />

        {/* Charts */}
        {session.uploadedSources.length > 0 && (
          <>
            <CategoryPieChart />
            <PlatformBarChart />
          </>
        )}
      </div>

      {/* Uploaded Sources */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl">Uploaded Sources</h2>
        </div>

        {session.uploadedSources.length === 0 ? (
          <div className="p-8 rounded-2xl border-2 border-dashed border-border text-center">
            <p className="text-muted-foreground">
              Use Quick Add above or the Bulk Upload button to get started
            </p>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {session.uploadedSources.map((source) => (
                <SourceCard
                  key={source.id}
                  source={source}
                  onRemove={() => removeSource(source.id)}
                />
              ))}
            </div>

            {/* Extraction Validation Panels */}
            {session.uploadedSources.some(s => s.status === 'processed' || s.status === 'failed') && (
              <div className="space-y-3">
                <h3 className="font-display text-lg">Extraction Details</h3>
                <div className="grid gap-3">
                  {session.uploadedSources
                    .filter(s => s.status === 'processed' || s.status === 'failed')
                    .map((source) => {
                      // Note: In a full implementation, these would come from extraction results
                      // For now, showing the validation panel structure
                      return (
                        <ExtractionValidationPanel
                          key={source.id}
                          source={source}
                          onRetry={() => handleGenerateInsights()}
                        />
                      );
                    })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* AI Configuration */}
      <AIConfigPanel />

      {/* Generate Insights Button + Error */}
      {session.uploadedSources.length > 0 && (
        <div id="ai-config-panel" className="flex flex-col items-center gap-4">
          {/* Per-source progress detail */}
          {session.isGeneratingInsights && (
            <div className="w-full bg-card border border-border rounded-xl p-4">
              <p className="text-sm font-medium mb-3">Extraction Progress</p>
              <div className="space-y-1">
                {session.uploadedSources.map((source, idx) => (
                  <ExtractionProgress
                    key={source.id}
                    source={source}
                    index={idx}
                    total={session.uploadedSources.length}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Partial-failure notice (some succeeded, some failed) */}
          {!session.isGeneratingInsights && hasFailedSources && session.analyticsData && (
            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Some sources failed — insights based on {session.uploadedSources.filter(s => s.status === 'processed').length} successful source(s).
            </div>
          )}

          {/* All-succeeded notice */}
          {!session.isGeneratingInsights && !hasFailedSources && session.analyticsData && (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 border border-green-200 rounded-xl px-4 py-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              All {session.uploadedSources.length} source(s) analysed successfully.
            </div>
          )}

          <Button
            size="lg"
            className="rounded-full px-8 gradient-hero border-0"
            onClick={handleGenerateInsights}
            disabled={session.isGeneratingInsights}
          >
            {session.isGeneratingInsights ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generating Insights…
              </>
            ) : session.analyticsData ? (
              <>
                <RotateCcw className="w-5 h-5 mr-2" />
                Regenerate Insights
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Generate AI Insights
              </>
            )}
          </Button>

          {!session.aiConfig.enabled && !insightsError && (
            <p className="text-sm text-muted-foreground text-center">
              Enable AI in the configuration panel above to generate insights.
            </p>
          )}

          {/* Rich error card */}
          {insightsError && insightsErrorCode && !errorDismissed && (
            <AIErrorAlert
              code={insightsErrorCode}
              rawMessage={insightsError}
              onRetry={handleGenerateInsights}
              onDismiss={() => setErrorDismissed(true)}
            />
          )}
        </div>
      )}

      {/* AI-Generated Insights Dashboard */}
      {session.analyticsData && <InsightsDashboard />}

      {/* Year Narrative (editable) */}
      {session.narrativeSummary && !session.analyticsData && (
        <div className="p-6 rounded-2xl bg-card shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl">Your Year in Words</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditingNarrative(!isEditingNarrative)}
            >
              {isEditingNarrative ? 'Done' : 'Edit'}
            </Button>
          </div>

          {isEditingNarrative ? (
            <Textarea
              value={session.narrativeSummary}
              onChange={(e) => updateNarrative(e.target.value)}
              rows={6}
              className="resize-none"
            />
          ) : (
            <p className="text-lg leading-relaxed text-foreground/90">
              {session.narrativeSummary}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
