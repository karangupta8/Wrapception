import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { saveSourceContent, deleteSourceContent, loadAllSourceContent, clearAllSourceContent } from '@/services/storage';
import { clearExpiredCache, clearAllCache } from '@/services/extractionCache';
import {
  SessionState,
  UploadedSource,
  ExtractedMetric,
  AIInsight,
  AIConfig,
  AnalyticsData,
  DEFAULT_AI_CONFIGS,
} from '@/types/session';
import { extractSource, synthesizeAnalytics, type SourceExtraction } from '@/services/aiService';
import { WrapceptionError, toWrapceptionError, type ErrorCode } from '@/services/errors';
import { logger } from '@/services/logger';

const STORAGE_KEY = 'wrapception_session';

// Initialize all provider configs with empty API keys
const getDefaultAIConfigs = (): Record<string, AIConfig> => ({
  openai: {
    provider: 'openai',
    endpoint: DEFAULT_AI_CONFIGS.openai.endpoint!,
    model: DEFAULT_AI_CONFIGS.openai.model!,
    apiKey: '',
    headers: {},
    visionSupported: true,
  },
  anthropic: {
    provider: 'anthropic',
    endpoint: DEFAULT_AI_CONFIGS.anthropic.endpoint!,
    model: DEFAULT_AI_CONFIGS.anthropic.model!,
    apiKey: '',
    headers: {},
    visionSupported: true,
  },
  gemini: {
    provider: 'gemini',
    endpoint: DEFAULT_AI_CONFIGS.gemini.endpoint!,
    model: DEFAULT_AI_CONFIGS.gemini.model!,
    apiKey: '',
    headers: {},
    visionSupported: true,
  },
});

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
      // Migrate: old sessions had aiConfig (singular), new ones have aiConfigs + activeProvider
      if (!parsed.aiConfigs) {
        parsed.aiConfigs = getDefaultAIConfigs();
        parsed.activeProvider = 'openai';
      }
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
    aiConfigs: getDefaultAIConfigs(),
    activeProvider: 'openai',
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
  updateAIConfig: (provider: string, config: Partial<AIConfig>) => void;
  setActiveProvider: (provider: string) => void;
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

  // On mount: restore file content from IndexedDB and cleanup expired cache
  useEffect(() => {
    const missing = session.uploadedSources.filter(
      (s) => s.inputType !== 'text' && s.rawContent === '[File stored in memory]'
    );
    if (missing.length > 0) {
      loadAllSourceContent(missing.map((s) => s.id)).then((contentMap) => {
        if (Object.keys(contentMap).length === 0) return;
        setSession((prev) => ({
          ...prev,
          uploadedSources: prev.uploadedSources.map((s) =>
            contentMap[s.id] ? { ...s, rawContent: contentMap[s.id] } : s
          ),
        }));
      });
    }

    // Clean up expired cache entries
    clearExpiredCache().catch((err) => {
      logger.warn('SessionContext', 'Failed to cleanup extraction cache', {
        error: err instanceof Error ? err.message : String(err),
      });
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

  const updateAIConfig = useCallback((provider: string, config: Partial<AIConfig>) => {
    setSession(prev => ({
      ...prev,
      aiConfigs: {
        ...prev.aiConfigs,
        [provider]: { ...prev.aiConfigs[provider], ...config },
      },
    }));
  }, []);

  const setActiveProvider = useCallback((provider: string) => {
    setSession(prev => ({
      ...prev,
      activeProvider: provider,
    }));
  }, []);

  const generateInsights = useCallback(async () => {
    setInsightsError(null);
    setInsightsErrorCode(null);
    setSession(prev => ({ ...prev, isGeneratingInsights: true }));

    logger.info('SessionContext', `Starting insights generation for ${session.uploadedSources.length} sources`);

    try {
      const { aiConfigs, activeProvider, uploadedSources, year } = session;
      const aiConfig = aiConfigs[activeProvider];

      // Pre-flight validation with typed errors
      if (!aiConfig || !aiConfig.apiKey) {
        throw new WrapceptionError('API key is missing for ' + activeProvider + '.', 'NO_API_KEY');
      }
      if (uploadedSources.length === 0) {
        throw new WrapceptionError('No sources uploaded.', 'NO_SOURCES');
      }

      // Per-source extraction — parallelized for speed, failures are isolated
      const successful: SourceExtraction[] = [];

      // Mark all as processing
      setSession(prev => ({
        ...prev,
        uploadedSources: prev.uploadedSources.map(s => ({
          ...s,
          status: 'processing' as const,
          extractionError: undefined,
        })),
      }));

      logger.info('SessionContext', `Starting parallel extraction of ${uploadedSources.length} sources`);

      // Create all extraction promises
      const extractionPromises = uploadedSources.map(source =>
        extractSource(source, aiConfig, year).then(extraction => ({
          source,
          extraction,
          error: null,
        })).catch(err => ({
          source,
          extraction: null,
          error: toWrapceptionError(err),
        }))
      );

      // Run all in parallel
      const results = await Promise.all(extractionPromises);

      // Process results
      for (const { source, extraction, error } of results) {
        if (extraction && !error) {
          successful.push(extraction);
          logger.info('SessionContext', `Source extracted successfully: ${source.name}`, {
            sourceId: source.id,
            platform: extraction.platformHint.platform,
            confidence: extraction.confidence,
          });

          setSession(prev => ({
            ...prev,
            uploadedSources: prev.uploadedSources.map(s =>
              s.id === source.id ? { ...s, status: 'processed' as const } : s
            ),
          }));
        } else if (error) {
          logger.error('SessionContext', `Source extraction failed: ${source.name}`, {
            sourceId: source.id,
            errorCode: error.code,
            errorMessage: error.message,
          });

          setSession(prev => ({
            ...prev,
            uploadedSources: prev.uploadedSources.map(s =>
              s.id === source.id
                ? { ...s, status: 'failed' as const, extractionError: error.message }
                : s
            ),
          }));

          // If auth error, stop all processing (affects all sources)
          if (
            error.code === 'AI_API_UNAUTHORIZED' ||
            error.code === 'NO_API_KEY' ||
            error.code === 'AI_NOT_ENABLED'
          ) {
            throw error;
          }
        }
      }

      if (successful.length === 0) {
        throw new WrapceptionError(
          'All sources failed to extract. Check errors on each source card.',
          'EXTRACTION_ALL_FAILED',
        );
      }

      logger.info('SessionContext', `Synthesizing analytics from ${successful.length} sources`);
      const analyticsData = await synthesizeAnalytics(successful, aiConfig, year);
      logger.info('SessionContext', 'Analytics synthesis completed', {
        highlights: analyticsData.highlights.length,
        trends: analyticsData.trends.length,
      });

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

      logger.info('SessionContext', 'Insights generation completed successfully');

    } catch (error) {
      const wrapped = toWrapceptionError(error);
      logger.error('SessionContext', 'Insights generation failed', wrapped, {
        errorCode: wrapped.code,
      });

      setInsightsError(wrapped.message);
      setInsightsErrorCode(wrapped.code);
      setSession(prev => ({ ...prev, isGeneratingInsights: false }));
    }
  }, [session]);

  const resetSession = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    clearAllSourceContent();
    clearAllCache().catch((err) => {
      logger.warn('SessionContext', 'Failed to clear extraction cache', {
        error: err instanceof Error ? err.message : String(err),
      });
    });
    setSession({
      year: new Date().getFullYear(),
      uploadedSources: [],
      extractedMetrics: [],
      aiInsights: [],
      narrativeSummary: '',
      aiConfigs: getDefaultAIConfigs(),
      activeProvider: 'openai',
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
      setActiveProvider,
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
