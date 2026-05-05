import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { saveSourceContent, deleteSourceContent, loadAllSourceContent, clearAllSourceContent } from '@/services/storage';
import {
  SessionState,
  UploadedSource,
  ExtractedMetric,
  AIInsight,
  AIConfig,
  AnalyticsData,
} from '@/types/session';
import { extractSource, synthesizeAnalytics, type SourceExtraction } from '@/services/aiService';
import { WrapceptionError, toWrapceptionError, type ErrorCode } from '@/services/errors';

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
  loadDemoData: (sources: UploadedSource[], analyticsData: AnalyticsData) => void;
  insightsError: string | null;
  insightsErrorCode: ErrorCode | null;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>(getInitialSession);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [insightsErrorCode, setInsightsErrorCode] = useState<ErrorCode | null>(null);

  // On mount: restore file content from IndexedDB for sources that lost it during last save
  useEffect(() => {
    const missing = session.uploadedSources.filter(
      (s) => s.inputType !== 'text' && s.rawContent === '[File stored in memory]'
    );
    if (missing.length === 0) return;

    loadAllSourceContent(missing.map((s) => s.id)).then((contentMap) => {
      if (Object.keys(contentMap).length === 0) return;
      setSession((prev) => ({
        ...prev,
        uploadedSources: prev.uploadedSources.map((s) =>
          contentMap[s.id] ? { ...s, rawContent: contentMap[s.id] } : s
        ),
      }));
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    // Persist file content to IndexedDB so it survives page reload
    if (newSource.inputType !== 'text' && newSource.rawContent) {
      saveSourceContent(newSource.id, newSource.rawContent);
    }
    setSession(prev => ({
      ...prev,
      uploadedSources: [...prev.uploadedSources, newSource],
    }));
  }, []);

  const removeSource = useCallback((id: string) => {
    deleteSourceContent(id);
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
    setInsightsErrorCode(null);
    setSession(prev => ({ ...prev, isGeneratingInsights: true }));

    try {
      const { aiConfig, uploadedSources, year } = session;

      // Pre-flight validation with typed errors
      if (!aiConfig.enabled) {
        throw new WrapceptionError('AI is not enabled.', 'AI_NOT_ENABLED');
      }
      if (!aiConfig.apiKey) {
        throw new WrapceptionError('API key is missing.', 'NO_API_KEY');
      }
      if (uploadedSources.length === 0) {
        throw new WrapceptionError('No sources uploaded.', 'NO_SOURCES');
      }

      // Per-source extraction — failures are isolated
      const successful: SourceExtraction[] = [];

      for (const source of uploadedSources) {
        // Mark source as processing
        setSession(prev => ({
          ...prev,
          uploadedSources: prev.uploadedSources.map(s =>
            s.id === source.id ? { ...s, status: 'processing' as const, extractionError: undefined } : s
          ),
        }));

        try {
          const extraction = await extractSource(source, aiConfig, year);
          successful.push(extraction);

          setSession(prev => ({
            ...prev,
            uploadedSources: prev.uploadedSources.map(s =>
              s.id === source.id ? { ...s, status: 'processed' as const } : s
            ),
          }));
        } catch (sourceErr) {
          const wrapped = toWrapceptionError(sourceErr);
          setSession(prev => ({
            ...prev,
            uploadedSources: prev.uploadedSources.map(s =>
              s.id === source.id
                ? { ...s, status: 'failed' as const, extractionError: wrapped.message }
                : s
            ),
          }));
          // Continue with other sources unless it's an auth/key error (affects all)
          if (
            wrapped.code === 'AI_API_UNAUTHORIZED' ||
            wrapped.code === 'NO_API_KEY' ||
            wrapped.code === 'AI_NOT_ENABLED'
          ) {
            throw wrapped;
          }
        }
      }

      if (successful.length === 0) {
        throw new WrapceptionError(
          'All sources failed to extract. Check errors on each source card.',
          'NO_SOURCES',
        );
      }

      const analyticsData = await synthesizeAnalytics(successful, aiConfig, year);

      const aiInsights: AIInsight[] = analyticsData.highlights.map(h => ({
        id: h.id,
        content: `**${h.title}**: ${h.description}`,
        category: h.category,
        sourceIds: uploadedSources.map(s => s.id),
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
      const wrapped = toWrapceptionError(error);
      setInsightsError(wrapped.message);
      setInsightsErrorCode(wrapped.code);
      setSession(prev => ({ ...prev, isGeneratingInsights: false }));
    }
  }, [session]);

  const resetSession = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    clearAllSourceContent();
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

  const loadDemoData = useCallback((sources: UploadedSource[], analyticsData: AnalyticsData) => {
    setSession(prev => ({
      ...prev,
      uploadedSources: sources,
      analyticsData,
      narrativeSummary: analyticsData.yearSummary,
    }));
  }, []);

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
      loadDemoData,
      insightsError,
      insightsErrorCode,
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
