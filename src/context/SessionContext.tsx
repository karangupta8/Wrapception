import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  SessionState,
  UploadedSource,
  ExtractedMetric,
  AIInsight,
  AIConfig,
  AnalyticsData,
} from '@/types/session';
import { generateAIInsights } from '@/services/aiService';

const STORAGE_KEY = 'wrapception_session';

const DEFAULT_AI_CONFIG: AIConfig = {
  enabled: false,
  provider: 'openai',
  endpoint: 'https://api.openai.com/v1/chat/completions',
  model: 'gpt-4o-mini',
  apiKey: '',
  headers: {},
  visionSupported: true,
};

const getInitialSession = (): SessionState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Restore dates
      if (parsed.uploadedSources) {
        parsed.uploadedSources = parsed.uploadedSources.map((s: UploadedSource) => ({
          ...s,
          createdAt: new Date(s.createdAt),
        }));
      }
      // Restore analytics date
      if (parsed.analyticsData?.generatedAt) {
        parsed.analyticsData.generatedAt = new Date(parsed.analyticsData.generatedAt);
      }
      // Ensure new fields exist
      parsed.analyticsData = parsed.analyticsData || null;
      parsed.isGeneratingInsights = false;
      return parsed;
    }
  } catch (e) {
    console.error('Failed to load session from storage:', e);
  }

  return {
    year: new Date().getFullYear(),
    uploadedSources: [],
    extractedMetrics: [],
    aiInsights: [],
    narrativeSummary: '',
    aiConfig: DEFAULT_AI_CONFIG,
    analyticsData: null,
    isGeneratingInsights: false,
  };
};

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
  saveSession: () => void;
  generateInsights: () => Promise<void>;
  resetSession: () => void;
  exportSession: () => string;
  insightsError: string | null;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>(getInitialSession);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  const saveSession = useCallback(() => {
    try {
      // Don't store raw file content to avoid localStorage limits
      const toStore = {
        ...session,
        isGeneratingInsights: false, // Never persist loading state
        uploadedSources: session.uploadedSources.map(s => ({
          ...s,
          rawContent: s.inputType === 'text' ? s.rawContent : '[File stored in memory]',
        })),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch (e) {
      console.error('Failed to save session:', e);
    }
  }, [session]);

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

  const generateInsights = useCallback(async () => {
    setInsightsError(null);

    // Set loading state
    setSession(prev => ({ ...prev, isGeneratingInsights: true }));

    try {
      const currentSession = session;

      if (!currentSession.aiConfig.enabled) {
        throw new Error('AI is not enabled. Please enable AI and configure your API key.');
      }

      if (!currentSession.aiConfig.apiKey) {
        throw new Error('API key is required. Please enter your API key in AI Configuration.');
      }

      if (currentSession.uploadedSources.length === 0) {
        throw new Error('No sources to analyze. Please upload some data first.');
      }

      const analyticsData = await generateAIInsights(
        currentSession.aiConfig,
        currentSession.uploadedSources,
        currentSession.year
      );

      // Convert analytics to insights format for backward compatibility
      const aiInsights: AIInsight[] = analyticsData.highlights.map(h => ({
        id: h.id,
        content: `**${h.title}**: ${h.description}`,
        category: h.category,
        sourceIds: currentSession.uploadedSources.map(s => s.id),
        isEdited: false,
      }));

      setSession(prev => ({
        ...prev,
        isGeneratingInsights: false,
        analyticsData,
        aiInsights,
        narrativeSummary: analyticsData.yearSummary,
      }));

    } catch (error) {
      console.error('Failed to generate insights:', error);
      setInsightsError(error instanceof Error ? error.message : 'Failed to generate insights');
      setSession(prev => ({ ...prev, isGeneratingInsights: false }));
    }
  }, [session]);

  const resetSession = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSession({
      year: new Date().getFullYear(),
      uploadedSources: [],
      extractedMetrics: [],
      aiInsights: [],
      narrativeSummary: '',
      aiConfig: DEFAULT_AI_CONFIG,
      analyticsData: null,
      isGeneratingInsights: false,
    });
    setInsightsError(null);
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
      saveSession,
      generateInsights,
      resetSession,
      exportSession,
      insightsError,
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
