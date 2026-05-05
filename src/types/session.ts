export type InputType = 'image' | 'pdf' | 'text';

export type Category =
  | 'music'
  | 'fitness'
  | 'reading'
  | 'movies'
  | 'work'
  | 'productivity'
  | 'other';

export interface UploadedSource {
  id: string;
  category: Category;
  platformName: string;
  inputType: InputType;
  rawContent: string; // base64 for files, text for text
  fileName?: string;
  notes?: string;
  createdAt: Date;
  status: 'uploaded' | 'processing' | 'processed' | 'failed';
  extractionError?: string;
}

export interface ExtractedMetric {
  sourceId: string;
  metricName: string;
  metricValue: string | number;
  unit?: string;
  confidenceScore?: number;
  // NEW: Explainability fields
  evidence?: string;
  confidence?: number;
  alternativeValues?: string[];
}

export interface AIInsight {
  id: string;
  content: string;
  category?: Category;
  sourceIds: string[];
  isEdited: boolean;
}

export interface AIConfig {
  provider: string;
  endpoint: string;
  model: string;
  apiKey: string;
  headers: Record<string, string>;
  visionSupported: boolean;
}

export interface AIProvider {
  id: string;
  name: string;
  models: Array<{ id: string; name: string }>;
  defaultModel: string;
  visionSupported: boolean;
}

// Import analytics types from aiService
import type { AnalyticsData, Highlight, Trend, CategoryStats, ExtractedMetricAI, SourceExtraction } from '@/services/aiService';

// Re-export for convenience
export type { AnalyticsData, Highlight, Trend, CategoryStats, ExtractedMetricAI, SourceExtraction };

export interface SessionState {
  year: number;
  uploadedSources: UploadedSource[];
  extractedMetrics: ExtractedMetric[];
  aiInsights: AIInsight[];
  narrativeSummary: string;
  aiConfigs: Record<string, AIConfig>; // Multiple provider configs
  activeProvider: string; // Which provider is currently active
  analyticsData: AnalyticsData | null;
  isGeneratingInsights: boolean;
}

export const CATEGORY_INFO: Record<Category, { label: string; icon: string; color: string }> = {
  music: { label: 'Music & Audio', icon: 'Music', color: 'hsl(280 60% 60%)' },
  fitness: { label: 'Fitness & Health', icon: 'Heart', color: 'hsl(0 70% 60%)' },
  reading: { label: 'Reading & Learning', icon: 'BookOpen', color: 'hsl(45 80% 55%)' },
  movies: { label: 'Movies & TV', icon: 'Film', color: 'hsl(200 70% 55%)' },
  work: { label: 'Work / Coding / AI', icon: 'Code', color: 'hsl(160 60% 45%)' },
  productivity: { label: 'Productivity', icon: 'Zap', color: 'hsl(35 90% 55%)' },
  other: { label: 'Other', icon: 'Layers', color: 'hsl(220 20% 50%)' },
};

export const PLATFORM_SUGGESTIONS: Record<Category, string[]> = {
  music: ['Spotify', 'Apple Music', 'YouTube Music', 'SoundCloud', 'Tidal', 'Deezer'],
  fitness: ['Strava', 'Garmin', 'Apple Fitness', 'Peloton', 'Nike Run Club', 'Whoop'],
  reading: ['Goodreads', 'StoryGraph', 'Kindle', 'Audible', 'Libby', 'Kobo'],
  movies: ['Letterboxd', 'Trakt', 'JustWatch', 'IMDb', 'Plex', 'Netflix'],
  work: ['GitHub', 'ChatGPT', 'Cursor', 'Notion', 'Linear', 'VS Code', 'Copilot'],
  productivity: ['Notion', 'Todoist', 'Things 3', 'Obsidian', 'Roam', 'Raycast'],
  other: ['Custom'],
};

// Vision-capable AI providers with latest models (May 2026)
export const AI_PROVIDERS: Record<string, AIProvider> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o (Latest, Most Capable)' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Fast & Cheap)' },
    ],
    defaultModel: 'gpt-4o-mini',
    visionSupported: true,
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet (Latest)' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku (Fast & Cheap)' },
      { id: 'claude-3-opus-20250219', name: 'Claude 3 Opus (Most Capable)' },
    ],
    defaultModel: 'claude-3-5-haiku-20241022',
    visionSupported: true,
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    models: [
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Latest)' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
    ],
    defaultModel: 'gemini-2.0-flash',
    visionSupported: true,
  },
};

// Provider-specific configs for API calls
export const DEFAULT_AI_CONFIGS: Record<string, Partial<AIConfig>> = {
  openai: {
    provider: 'openai',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
    visionSupported: true,
  },
  anthropic: {
    provider: 'anthropic',
    endpoint: 'https://api.anthropic.com/v1/messages',
    model: 'claude-3-5-haiku-20241022',
    visionSupported: true,
  },
  gemini: {
    provider: 'gemini',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    model: 'gemini-2.0-flash',
    visionSupported: true,
  },
};
