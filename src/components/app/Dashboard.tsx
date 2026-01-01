import { useState } from 'react';
import { Plus, Sparkles, FileJson, FolderUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useSession } from '@/context/SessionContext';
import { SourceCard } from './SourceCard';
import { AIConfigPanel } from './AIConfigPanel';
import { UploadWizard } from './UploadWizard';
import { QuickUpload } from './QuickUpload';
import { BulkUploadModal } from './BulkUploadModal';
import { StatsOverview } from './StatsOverview';
import { CategoryPieChart } from './CategoryPieChart';
import { PlatformBarChart } from './PlatformBarChart';
import { InsightsDashboard } from './InsightsDashboard';
import { useToast } from '@/hooks/use-toast';

export function Dashboard() {
  const {
    session,
    removeSource,
    updateNarrative,
    generateInsights,
    exportSession,
    insightsError
  } = useSession();
  const [showUploadWizard, setShowUploadWizard] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [isEditingNarrative, setIsEditingNarrative] = useState(false);
  const { toast } = useToast();

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
    try {
      await generateInsights();
      toast({
        title: "Insights generated",
        description: "AI has analyzed your data and generated insights.",
      });
    } catch {
      // Error is handled in context
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {session.uploadedSources.map((source) => (
              <SourceCard
                key={source.id}
                source={source}
                onRemove={() => removeSource(source.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* AI Configuration */}
      <AIConfigPanel />

      {/* Generate Insights Button */}
      {session.uploadedSources.length > 0 && (
        <div className="flex flex-col items-center gap-3">
          <Button
            size="lg"
            className="rounded-full px-8 gradient-hero border-0"
            onClick={handleGenerateInsights}
            disabled={session.isGeneratingInsights || !session.aiConfig.enabled}
          >
            {session.isGeneratingInsights ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generating Insights...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                {session.analyticsData ? 'Regenerate Insights' : 'Generate AI Insights'}
              </>
            )}
          </Button>

          {!session.aiConfig.enabled && (
            <p className="text-sm text-muted-foreground">
              Enable AI in configuration above to generate real insights
            </p>
          )}

          {insightsError && (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm max-w-md text-center">
              {insightsError}
            </div>
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
