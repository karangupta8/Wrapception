import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { 
  SessionState, 
  UploadedSource, 
  ExtractedMetric, 
  AIInsight, 
  AIConfig,
  Category 
} from '@/types/session';

const DEFAULT_AI_CONFIG: AIConfig = {
  enabled: false,
  provider: 'openai',
  endpoint: 'https://api.openai.com/v1/chat/completions',
  model: 'gpt-4o-mini',
  headers: {},
  visionSupported: true,
};

const MOCK_INSIGHTS: Omit<AIInsight, 'sourceIds'>[] = [
  { id: '1', content: 'This was a year of deep focus and creative exploration.', isEdited: false },
  { id: '2', content: 'Your fitness patterns show consistent dedication, especially in spring.', category: 'fitness', isEdited: false },
  { id: '3', content: 'Reading and learning took a backseat during high-productivity months.', category: 'reading', isEdited: false },
  { id: '4', content: 'Music choices reflected periods of both calm reflection and energetic creation.', category: 'music', isEdited: false },
];

const DEFAULT_NARRATIVE = `Your year was a tapestry of experiences woven across different aspects of life. The data suggests a balance between productivity and personal growth, with notable peaks in creative output during certain months. This was a year of discovery, challenge, and meaningful progress across the domains you chose to track.`;

interface SessionContextType {
  session: SessionState;
  setYear: (year: number) => void;
  addSource: (source: Omit<UploadedSource, 'id' | 'createdAt' | 'status'>) => void;
  removeSource: (id: string) => void;
  updateSource: (id: string, updates: Partial<UploadedSource>) => void;
  addMetric: (metric: ExtractedMetric) => void;
  updateInsight: (id: string, content: string) => void;
  updateNarrative: (content: string) => void;
  updateAIConfig: (config: Partial<AIConfig>) => void;
  generateMockInsights: () => void;
  resetSession: () => void;
  exportSession: () => string;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>({
    year: new Date().getFullYear(),
    uploadedSources: [],
    extractedMetrics: [],
    aiInsights: [],
    narrativeSummary: '',
    aiConfig: DEFAULT_AI_CONFIG,
  });

  const setYear = useCallback((year: number) => {
    setSession(prev => ({ ...prev, year }));
  }, []);

  const addSource = useCallback((source: Omit<UploadedSource, 'id' | 'createdAt' | 'status'>) => {
    const newSource: UploadedSource = {
      ...source,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      status: 'uploaded',
    };
    setSession(prev => ({
      ...prev,
      uploadedSources: [...prev.uploadedSources, newSource],
    }));
  }, []);

  const removeSource = useCallback((id: string) => {
    setSession(prev => ({
      ...prev,
      uploadedSources: prev.uploadedSources.filter(s => s.id !== id),
      extractedMetrics: prev.extractedMetrics.filter(m => m.sourceId !== id),
    }));
  }, []);

  const updateSource = useCallback((id: string, updates: Partial<UploadedSource>) => {
    setSession(prev => ({
      ...prev,
      uploadedSources: prev.uploadedSources.map(s => 
        s.id === id ? { ...s, ...updates } : s
      ),
    }));
  }, []);

  const addMetric = useCallback((metric: ExtractedMetric) => {
    setSession(prev => ({
      ...prev,
      extractedMetrics: [...prev.extractedMetrics, metric],
    }));
  }, []);

  const updateInsight = useCallback((id: string, content: string) => {
    setSession(prev => ({
      ...prev,
      aiInsights: prev.aiInsights.map(i => 
        i.id === id ? { ...i, content, isEdited: true } : i
      ),
    }));
  }, []);

  const updateNarrative = useCallback((content: string) => {
    setSession(prev => ({ ...prev, narrativeSummary: content }));
  }, []);

  const updateAIConfig = useCallback((config: Partial<AIConfig>) => {
    setSession(prev => ({
      ...prev,
      aiConfig: { ...prev.aiConfig, ...config },
    }));
  }, []);

  const generateMockInsights = useCallback(() => {
    const sourceIds = session.uploadedSources.map(s => s.id);
    const insights: AIInsight[] = MOCK_INSIGHTS.map(insight => ({
      ...insight,
      sourceIds,
    }));
    setSession(prev => ({
      ...prev,
      aiInsights: insights,
      narrativeSummary: DEFAULT_NARRATIVE,
    }));
  }, [session.uploadedSources]);

  const resetSession = useCallback(() => {
    setSession({
      year: new Date().getFullYear(),
      uploadedSources: [],
      extractedMetrics: [],
      aiInsights: [],
      narrativeSummary: '',
      aiConfig: DEFAULT_AI_CONFIG,
    });
  }, []);

  const exportSession = useCallback(() => {
    const exportData = {
      ...session,
      exportedAt: new Date().toISOString(),
      uploadedSources: session.uploadedSources.map(s => ({
        ...s,
        rawContent: s.inputType === 'text' ? s.rawContent : '[File data omitted]',
      })),
    };
    return JSON.stringify(exportData, null, 2);
  }, [session]);

  return (
    <SessionContext.Provider value={{
      session,
      setYear,
      addSource,
      removeSource,
      updateSource,
      addMetric,
      updateInsight,
      updateNarrative,
      updateAIConfig,
      generateMockInsights,
      resetSession,
      exportSession,
    }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
