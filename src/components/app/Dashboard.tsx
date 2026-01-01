import { useState } from 'react';
import { Plus, Download, Sparkles, RefreshCw, FileJson } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useSession } from '@/context/SessionContext';
import { SourceCard } from './SourceCard';
import { InsightCard } from './InsightCard';
import { AIConfigPanel } from './AIConfigPanel';
import { UploadWizard } from './UploadWizard';
import { CATEGORY_INFO, Category } from '@/types/session';
import { useToast } from '@/hooks/use-toast';

export function Dashboard() {
  const { session, removeSource, updateInsight, updateNarrative, generateMockInsights, exportSession } = useSession();
  const [showUploadWizard, setShowUploadWizard] = useState(false);
  const [isEditingNarrative, setIsEditingNarrative] = useState(false);
  const { toast } = useToast();

  const categoryCounts = session.uploadedSources.reduce((acc, source) => {
    acc[source.category] = (acc[source.category] || 0) + 1;
    return acc;
  }, {} as Record<Category, number>);

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

  const handleGenerateInsights = () => {
    generateMockInsights();
    toast({
      title: "Insights generated",
      description: session.aiConfig.enabled 
        ? "AI insights have been generated from your uploads."
        : "Mock insights generated. Enable AI for real analysis.",
    });
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
            Export JSON
          </Button>
          <Button onClick={() => setShowUploadWizard(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Wrapped
          </Button>
        </div>
      </div>

      {/* Life Allocation View */}
      {Object.keys(categoryCounts).length > 0 && (
        <div className="p-6 rounded-2xl bg-card shadow-card">
          <h2 className="font-display text-2xl mb-6">Life Allocation</h2>
          <div className="flex flex-wrap gap-3">
            {(Object.entries(categoryCounts) as [Category, number][]).map(([category, count]) => {
              const info = CATEGORY_INFO[category];
              const total = session.uploadedSources.length;
              const percentage = Math.round((count / total) * 100);
              
              return (
                <div 
                  key={category}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border/50"
                >
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: info.color }}
                  />
                  <span className="font-medium">{info.label}</span>
                  <span className="text-muted-foreground text-sm">{percentage}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Uploaded Sources */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl">Uploaded Sources</h2>
        </div>
        
        {session.uploadedSources.length === 0 ? (
          <button 
            onClick={() => setShowUploadWizard(true)}
            className="w-full p-12 rounded-2xl border-2 border-dashed border-border hover:border-primary/30 hover:bg-secondary/30 transition-all text-center group"
          >
            <Plus className="w-12 h-12 mx-auto text-muted-foreground group-hover:text-primary transition-colors mb-4" />
            <p className="text-lg font-medium mb-1">Add your first Wrapped</p>
            <p className="text-muted-foreground">Upload screenshots, PDFs, or paste text from any service</p>
          </button>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {session.uploadedSources.map((source) => (
              <SourceCard 
                key={source.id} 
                source={source} 
                onRemove={() => removeSource(source.id)}
              />
            ))}
            <button 
              onClick={() => setShowUploadWizard(true)}
              className="p-6 rounded-2xl border-2 border-dashed border-border hover:border-primary/30 hover:bg-secondary/30 transition-all flex items-center justify-center gap-2 text-muted-foreground hover:text-primary"
            >
              <Plus className="w-5 h-5" />
              <span>Add More</span>
            </button>
          </div>
        )}
      </div>

      {/* AI Configuration */}
      <AIConfigPanel />

      {/* Generate Insights Button */}
      {session.uploadedSources.length > 0 && (
        <div className="flex justify-center">
          <Button 
            size="lg" 
            className="rounded-full px-8 gradient-hero border-0"
            onClick={handleGenerateInsights}
          >
            <Sparkles className="w-5 h-5 mr-2" />
            {session.aiInsights.length > 0 ? 'Regenerate Insights' : 'Generate Insights'}
          </Button>
        </div>
      )}

      {/* AI Insights */}
      {session.aiInsights.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-accent" />
            <h2 className="font-display text-2xl">AI Insights</h2>
            {!session.aiConfig.enabled && (
              <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                Mock data
              </span>
            )}
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {session.aiInsights.map((insight) => (
              <InsightCard 
                key={insight.id} 
                insight={insight}
                onUpdate={(content) => updateInsight(insight.id, content)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Year Narrative */}
      {session.narrativeSummary && (
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
