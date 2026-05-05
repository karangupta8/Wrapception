import { z } from 'zod';
import { AIConfig, UploadedSource, Category, CATEGORY_INFO } from '@/types/session';
import { WrapceptionError, fromHttpStatus, toWrapceptionError } from './errors';
import { detectFromFilename, detectFromContent, type PlatformHint } from './platformDetector';
import { selectTemplate, buildTemplatePrompt } from './promptTemplates';
import { compressImage, extractTextFromPDF, pdfFirstPageToImage } from './contentExtractor';
import { logger } from './logger';
import { getCachedExtraction, cacheExtraction, hashContent, clearExpiredCache } from './extractionCache';

// ─── Validation schemas & metrics ────────────────────────────────────────────

interface CallMetrics {
  promptTokens: number;
  completionTokens: number;
  model: string;
  provider: string;
  latencyMs: number;
  timestamp: number;
}

interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const ExtractedMetricAISchema = z.object({
  name: z.string(),
  value: z.union([z.string(), z.number()]),
  unit: z.string().optional(),
  category: z.string().optional(),
  platform: z.string().optional(),
});

const AnalyticsDataSchema = z.object({
  yearSummary: z.string(),
  highlights: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      category: z.string().optional(),
      metric: z.string().optional(),
      icon: z.string().optional(),
    })
  ),
  metrics: z.array(ExtractedMetricAISchema),
  trends: z.array(
    z.object({
      label: z.string(),
      direction: z.enum(['up', 'down', 'stable']),
      value: z.string(),
      percentChange: z.number().optional(),
      category: z.string().optional(),
    })
  ),
  categoryBreakdown: z.array(
    z.object({
      category: z.enum(['music', 'fitness', 'reading', 'movies', 'work', 'productivity', 'other']),
      count: z.number(),
      topPlatform: z.string().optional(),
      keyMetric: z.string().optional(),
      insight: z.string(),
    })
  ),
  recommendations: z.array(z.string()),
  generatedAt: z.date().optional(),
});

// ─── Public response types ───────────────────────────────────────────────────

export interface Highlight {
  id: string;
  title: string;
  description: string;
  category?: Category;
  metric?: string;
  icon?: string;
}

export interface Trend {
  label: string;
  direction: 'up' | 'down' | 'stable';
  value: string;
  percentChange?: number;
  category?: Category;
}

export interface CategoryStats {
  category: Category;
  count: number;
  topPlatform?: string;
  keyMetric?: string;
  insight: string;
}

export interface ExtractedMetricAI {
  name: string;
  value: string | number;
  unit?: string;
  category?: Category;
  platform?: string;
}

export interface AnalyticsData {
  yearSummary: string;
  highlights: Highlight[];
  metrics: ExtractedMetricAI[];
  trends: Trend[];
  categoryBreakdown: CategoryStats[];
  recommendations: string[];
  generatedAt: Date;
}

/** Result of extracting one source */
export interface SourceExtraction {
  sourceId: string;
  platformHint: PlatformHint;
  templateId: string;
  analyticsData: AnalyticsData;
  confidence: number; // 0–1
  warnings: string[];
  cost?: {
    promptTokens: number;
    completionTokens: number;
    estimatedUsd: number;
  };
}

// ─── Internal content types ───────────────────────────────────────────────────

type OpenAITextItem = { type: 'text'; text: string };
type OpenAIImageItem = { type: 'image_url'; image_url: { url: string; detail: 'high' } };
type OpenAIContentItem = OpenAITextItem | OpenAIImageItem;

type AnthropicTextItem = { type: 'text'; text: string };
type AnthropicImageItem = { type: 'image'; source: { type: 'base64'; media_type: string; data: string } };
type AnthropicContentItem = AnthropicTextItem | AnthropicImageItem;

// ─── Retry logic ──────────────────────────────────────────────────────────────

/** Retry a function with exponential backoff for transient errors. */
async function withRetry<T>(
  fn: () => Promise<T>,
  sourceId?: string,
  config: RetryConfig = { maxAttempts: 3, baseDelayMs: 500, maxDelayMs: 5000 },
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;

      const isRetryable =
        err instanceof Error &&
        (err.message.includes('timeout') ||
          err.message.includes('429') ||
          err.message.includes('5') ||
          err.message.includes('ECONNREFUSED') ||
          err.message.includes('Failed to fetch'));

      if (!isRetryable || attempt === config.maxAttempts) {
        throw err;
      }

      const delay = Math.min(config.baseDelayMs * Math.pow(2, attempt - 1), config.maxDelayMs);
      logger.debug('aiService', `Retry attempt ${attempt}/${config.maxAttempts} after ${delay}ms`, {
        sourceId,
        error: lastError.message,
      });

      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastError || new Error('Retry failed');
}

// ─── Content preparation ──────────────────────────────────────────────────────

/**
 * Resolve a source's raw content into a string suitable for the AI prompt,
 * handling image compression and PDF text extraction.
 */
async function prepareContent(source: UploadedSource): Promise<{
  textContent: string | null;
  imageDataUrl: string | null;
  warnings: string[];
}> {
  const warnings: string[] = [];

  if (source.inputType === 'text') {
    return { textContent: source.rawContent, imageDataUrl: null, warnings };
  }

  if (source.inputType === 'image') {
    if (!source.rawContent || source.rawContent.startsWith('[')) {
      warnings.push('Image content not available — file may have been lost on page reload.');
      return { textContent: null, imageDataUrl: null, warnings };
    }
    try {
      const compressed = await compressImage(source.rawContent);
      return { textContent: null, imageDataUrl: compressed, warnings };
    } catch {
      warnings.push('Image compression failed; using original.');
      return { textContent: null, imageDataUrl: source.rawContent, warnings };
    }
  }

  if (source.inputType === 'pdf') {
    if (!source.rawContent || source.rawContent.startsWith('[')) {
      warnings.push('PDF content not available — file may have been lost on page reload.');
      return { textContent: null, imageDataUrl: null, warnings };
    }
    try {
      const text = await extractTextFromPDF(source.rawContent);
      if (text.trim().length < 50) {
        // Likely a scanned PDF — render first page as image
        warnings.push('PDF appears to be scanned (no text found). Using first page as image.');
        try {
          const imageUrl = await pdfFirstPageToImage(source.rawContent);
          return { textContent: null, imageDataUrl: imageUrl, warnings };
        } catch {
          warnings.push('Could not render scanned PDF as image.');
          return { textContent: null, imageDataUrl: null, warnings };
        }
      }
      return { textContent: text, imageDataUrl: null, warnings };
    } catch (err) {
      if (err instanceof WrapceptionError) throw err;
      warnings.push(`PDF extraction failed: ${err instanceof Error ? err.message : String(err)}`);
      return { textContent: null, imageDataUrl: null, warnings };
    }
  }

  return { textContent: null, imageDataUrl: null, warnings };
}

// ─── Per-provider callers ──────────────────────────────────────────────────

async function callGemini(
  config: AIConfig,
  systemPrompt: string,
  textContent: string | null,
  imageDataUrl: string | null,
  platformName: string,
  year: number,
): Promise<{ content: string; metrics: CallMetrics }> {
  const startTime = Date.now();
  const parts: object[] = [];
  let textBuffer = `${systemPrompt}\n\nAnalyze my ${year} ${platformName} wrap:\n\n`;

  if (textContent) {
    textBuffer += textContent;
  }

  if (imageDataUrl) {
    textBuffer += `\n[Image from ${platformName}]\n`;
    parts.push({ text: textBuffer });
    textBuffer = '';
    const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      parts.push({ inline_data: { mime_type: match[1], data: match[2] } });
    }
  }

  textBuffer += '\n\nReturn only valid JSON.';
  parts.push({ text: textBuffer });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { temperature: 0.7, responseMimeType: 'application/json' },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw fromHttpStatus(response.status, body, 'Gemini');
  }

  const data = await response.json();
  const latencyMs = Date.now() - startTime;
  const usageData = data.usageMetadata || {};

  const metrics: CallMetrics = {
    promptTokens: usageData.promptTokenCount || 0,
    completionTokens: usageData.candidatesTokenCount || 0,
    model: config.model,
    provider: 'gemini',
    latencyMs,
    timestamp: Date.now(),
  };

  return {
    content: data.candidates[0].content.parts[0].text,
    metrics,
  };
}

async function callOpenAI(
  config: AIConfig,
  systemPrompt: string,
  textContent: string | null,
  imageDataUrl: string | null,
  platformName: string,
  year: number,
): Promise<{ content: string; metrics: CallMetrics }> {
  const startTime = Date.now();
  const userContent: string | OpenAIContentItem[] =
    config.visionSupported && imageDataUrl
      ? [
          { type: 'text', text: `Analyze my ${year} ${platformName} wrap:` },
          { type: 'image_url', image_url: { url: imageDataUrl, detail: 'high' } },
          ...(textContent ? [{ type: 'text', text: textContent } as OpenAITextItem] : []),
        ]
      : `Analyze my ${year} ${platformName} wrap:\n\n${textContent ?? '[No content available]'}`;

  const body: Record<string, unknown> = {
    model: config.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    temperature: 0.7,
  };

  if (config.provider === 'openai' || config.provider === 'groq') {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
      ...config.headers,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const bodyText = await response.text();
    throw fromHttpStatus(response.status, bodyText, config.provider);
  }

  const data = await response.json();
  const latencyMs = Date.now() - startTime;

  const metrics: CallMetrics = {
    promptTokens: data.usage?.prompt_tokens || 0,
    completionTokens: data.usage?.completion_tokens || 0,
    model: config.model,
    provider: config.provider,
    latencyMs,
    timestamp: Date.now(),
  };

  return {
    content: data.choices[0].message.content,
    metrics,
  };
}

async function callAnthropic(
  config: AIConfig,
  systemPrompt: string,
  textContent: string | null,
  imageDataUrl: string | null,
  platformName: string,
  year: number,
): Promise<{ content: string; metrics: CallMetrics }> {
  const startTime = Date.now();
  const userContent: string | AnthropicContentItem[] =
    config.visionSupported && imageDataUrl
      ? (() => {
          const items: AnthropicContentItem[] = [
            { type: 'text', text: `Analyze my ${year} ${platformName} wrap:` },
          ];
          const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            items.push({ type: 'image', source: { type: 'base64', media_type: match[1], data: match[2] } });
          }
          if (textContent) items.push({ type: 'text', text: textContent });
          return items;
        })()
      : `Analyze my ${year} ${platformName} wrap:\n\n${textContent ?? '[No content available]'}`;

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      ...config.headers,
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    }),
  });

  if (!response.ok) {
    const bodyText = await response.text();
    throw fromHttpStatus(response.status, bodyText, 'Anthropic');
  }

  const data = await response.json();
  const latencyMs = Date.now() - startTime;

  const metrics: CallMetrics = {
    promptTokens: data.usage?.input_tokens || 0,
    completionTokens: data.usage?.output_tokens || 0,
    model: config.model,
    provider: 'anthropic',
    latencyMs,
    timestamp: Date.now(),
  };

  return {
    content: data.content[0].text,
    metrics,
  };
}

// ─── Response parsing ─────────────────────────────────────────────────────────

function parseAnalyticsResponse(rawResponse: string): AnalyticsData {
  const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new WrapceptionError(
      'No JSON found in AI response',
      'AI_RESPONSE_INVALID',
    );
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new WrapceptionError('AI returned malformed JSON', 'AI_RESPONSE_INVALID');
  }

  return {
    yearSummary: (parsed.yearSummary as string) || 'Your year was full of interesting moments.',
    highlights: ((parsed.highlights as Highlight[]) || []).map((h, i) => ({
      ...h,
      id: h.id || `highlight-${i}`,
    })),
    metrics: (parsed.metrics as ExtractedMetricAI[]) || [],
    trends: (parsed.trends as Trend[]) || [],
    categoryBreakdown: (parsed.categoryBreakdown as CategoryStats[]) || [],
    recommendations: (parsed.recommendations as string[]) || [],
    generatedAt: new Date(),
  };
}

// ─── Per-source extraction ────────────────────────────────────────────────────

/** Estimate cost from token usage. */
function estimateTokenCost(metrics: CallMetrics): number {
  const priceTables: Record<string, Record<string, [number, number]>> = {
    openai: {
      'gpt-4o': [0.005, 0.015],
      'gpt-4-turbo': [0.01, 0.03],
      'gpt-4o-mini': [0.00015, 0.0006],
    },
    anthropic: {
      'claude-3-5-sonnet-20241022': [0.003, 0.015],
      'claude-3-5-haiku-20241022': [0.00080, 0.0024],
      'claude-3-opus-20250219': [0.015, 0.075],
    },
    gemini: {
      'gemini-2.0-flash': [0.000075, 0.0003],
      'gemini-1.5-flash': [0.000075, 0.0003],
      'gemini-1.5-pro': [0.00125, 0.005],
    },
  };

  const [inputPrice, outputPrice] = priceTables[metrics.provider]?.[metrics.model] || [0, 0];
  return (metrics.promptTokens * inputPrice + metrics.completionTokens * outputPrice) / 1000;
}

async function callProvider(
  config: AIConfig,
  systemPrompt: string,
  textContent: string | null,
  imageDataUrl: string | null,
  platformName: string,
  year: number,
): Promise<{ content: string; metrics: CallMetrics; estimatedUsd: number }> {
  let result: { content: string; metrics: CallMetrics };

  switch (config.provider) {
    case 'gemini':
      result = await callGemini(config, systemPrompt, textContent, imageDataUrl, platformName, year);
      break;
    case 'anthropic':
      result = await callAnthropic(config, systemPrompt, textContent, imageDataUrl, platformName, year);
      break;
    case 'openai':
    case 'groq':
    case 'grok':
    case 'custom':
      result = await callOpenAI(config, systemPrompt, textContent, imageDataUrl, platformName, year);
      break;
    default:
      throw new WrapceptionError(`Unsupported provider: ${config.provider}`, 'UNKNOWN');
  }

  return {
    ...result,
    estimatedUsd: estimateTokenCost(result.metrics),
  };
}

/** Estimate tokens for synthesis prompt (rough estimate). */
function estimateTokensForSynthesis(extractionCount: number): number {
  // Each extraction adds ~200 tokens of context
  const dataTokens = extractionCount * 200;
  // Synthesis prompt itself ~500 tokens
  const promptTokens = 500;
  // Expected response ~1000 tokens
  const responseTokens = 1000;

  return dataTokens + promptTokens + responseTokens;
}

/** Compute confidence score based on multiple signals. */
function computeConfidence(
  analyticsData: AnalyticsData,
  platformHint: PlatformHint,
  validationPassed: boolean,
  contentLength: number,
): number {
  let score = 0.8; // Base score

  // Platform detection confidence
  score *= platformHint.confidence === 'high' ? 1.0 : platformHint.confidence === 'medium' ? 0.85 : 0.7;

  // Metric count (expect 3-8 for good platform match)
  const metricCount = analyticsData.metrics.length + analyticsData.highlights.length;
  score *= metricCount >= 3 && metricCount <= 8 ? 1.0 : metricCount > 8 ? 0.9 : 0.7;

  // Validation passed
  score *= validationPassed ? 1.0 : 0.5;

  // Source content length (more detail = more confidence)
  score *= Math.min(contentLength / 5000, 1.0);

  return Math.max(0, Math.min(1, score));
}

/** Extract analytics from a single source. Safe to call concurrently. */
export async function extractSource(
  source: UploadedSource,
  config: AIConfig,
  year: number,
): Promise<SourceExtraction> {
  const warnings: string[] = [];
  let callMetrics: CallMetrics | undefined;

  logger.debug('aiService', `Starting extraction for ${source.name}`, { sourceId: source.id, type: source.inputType });

  // Detect platform
  const filenameHint = detectFromFilename(source.fileName ?? source.platformName);
  const contentHint =
    source.inputType === 'text' ? detectFromContent(source.rawContent) : filenameHint;
  const platformHint = filenameHint.confidence !== 'low' ? filenameHint : contentHint;

  // Override with user-specified platform if detection failed
  if (!platformHint.platform) {
    platformHint.platform = source.platformName;
    platformHint.category = source.category;
    platformHint.confidence = 'medium';
  }

  logger.debug('aiService', `Platform detected: ${platformHint.platform}`, {
    sourceId: source.id,
    confidence: platformHint.confidence,
  });

  // Select template
  const template = selectTemplate(platformHint);
  const systemPrompt = buildTemplatePrompt(template);

  // Check cache before extraction
  const contentHash = await hashContent(source.rawContent);
  const cached = await getCachedExtraction(contentHash, template.id, config.provider);
  if (cached) {
    logger.info('aiService', 'Cache hit for extraction', {
      sourceId: source.id,
      template: template.id,
      platform: platformHint.platform,
    });
    return cached;
  }

  // Prepare content
  const { textContent, imageDataUrl, warnings: contentWarnings } = await prepareContent(source);
  warnings.push(...contentWarnings);

  // Warn if image source but provider doesn't support vision
  if (imageDataUrl && !config.visionSupported) {
    warnings.push(
      `${config.provider} does not support images. Only text context will be used. Switch to a vision-capable provider for better results.`,
    );
  }

  logger.debug('aiService', `Calling ${config.provider} for extraction`, {
    sourceId: source.id,
    model: config.model,
    hasImage: !!imageDataUrl,
    hasText: !!textContent,
  });

  // Call AI with retry logic
  let rawResponse: string;
  let estimatedUsd: number;
  let validationPassed = false;

  try {
    const result = await withRetry(
      () =>
        callProvider(
          config,
          systemPrompt,
          textContent,
          imageDataUrl,
          platformHint.platform ?? source.platformName,
          year,
        ),
      source.id,
    );

    rawResponse = result.content;
    callMetrics = result.metrics;
    estimatedUsd = result.estimatedUsd;
  } catch (err) {
    throw toWrapceptionError(err);
  }

  // Parse and validate response
  const analyticsData = parseAnalyticsResponse(rawResponse);

  try {
    AnalyticsDataSchema.parse(analyticsData);
    validationPassed = true;
  } catch (validationErr) {
    logger.warn('aiService', 'Validation failed on extraction response', {
      sourceId: source.id,
      error: validationErr instanceof Error ? validationErr.message : String(validationErr),
    });
    warnings.push('Data validation warning: some metrics may be inaccurate.');
  }

  // Compute confidence from multiple signals
  const confidence = computeConfidence(analyticsData, platformHint, validationPassed, source.rawContent.length);

  logger.info('aiService', `Extraction completed: ${source.name}`, {
    sourceId: source.id,
    platform: platformHint.platform,
    confidence: confidence.toFixed(2),
    metricsExtracted: analyticsData.metrics.length,
    warnings: warnings.length,
    cost: estimatedUsd?.toFixed(4),
  });

  const extraction: SourceExtraction = {
    sourceId: source.id,
    platformHint,
    templateId: template.id,
    analyticsData,
    confidence,
    warnings,
    cost: callMetrics
      ? {
          promptTokens: callMetrics.promptTokens,
          completionTokens: callMetrics.completionTokens,
          estimatedUsd,
        }
      : undefined,
  };

  // Cache the result
  await cacheExtraction(contentHash, template.id, config.provider, extraction).catch((err) => {
    logger.warn('aiService', 'Failed to cache extraction', {
      sourceId: source.id,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  return extraction;
}

// ─── Cross-source synthesis ───────────────────────────────────────────────────

/**
 * Synthesise multiple per-source extractions into a unified AnalyticsData.
 * For a single source, returns it directly (no extra AI call).
 * Throws explicit error if synthesis fails (no silent fallback).
 */
export async function synthesizeAnalytics(
  extractions: SourceExtraction[],
  config: AIConfig,
  year: number,
): Promise<AnalyticsData> {
  if (extractions.length === 0) {
    throw new WrapceptionError('No successful extractions to synthesise', 'SYNTHESIS_NO_DATA');
  }

  logger.info('aiService', `Synthesizing ${extractions.length} extractions`, {
    platforms: extractions.map((e) => e.platformHint.platform).join(', '),
  });

  // Check token budget for synthesis
  const estimatedTokens = estimateTokensForSynthesis(extractions.length);
  const MAX_TOKENS = 100000;
  if (estimatedTokens > MAX_TOKENS) {
    throw new WrapceptionError(
      `Synthesis would use ${estimatedTokens} tokens. Limit is ${MAX_TOKENS}. Remove some sources and try again.`,
      'TOKEN_BUDGET_EXCEEDED',
    );
  }

  if (extractions.length === 1) {
    logger.debug('aiService', 'Single source synthesis - returning direct extraction');
    return extractions[0].analyticsData;
  }

  // Aggregate all metrics, highlights, trends
  const allMetrics = extractions.flatMap((e) => e.analyticsData.metrics);
  const allHighlights = extractions.flatMap((e) =>
    e.analyticsData.highlights.map((h, i) => ({ ...h, id: `${e.sourceId}-h${i}` })),
  );
  const allTrends = extractions.flatMap((e) => e.analyticsData.trends);
  const allBreakdown = extractions.flatMap((e) => e.analyticsData.categoryBreakdown);
  const allRecs = extractions.flatMap((e) => e.analyticsData.recommendations);

  logger.debug('aiService', 'Aggregated extraction data', {
    totalMetrics: allMetrics.length,
    totalHighlights: allHighlights.length,
    totalTrends: allTrends.length,
    estimatedTokens,
  });

  // Build a richer, structured context for cross-domain synthesis
  const summaryContext = extractions
    .map((e) => {
      const data = e.analyticsData;
      const metricsText = data.metrics
        .slice(0, 8)
        .map((m) => `${m.name}=${m.value}${m.unit ? ' ' + m.unit : ''}`)
        .join('; ');
      const highlightsText = data.highlights
        .slice(0, 3)
        .map((h) => `"${h.title}: ${h.description}"`)
        .join(' | ');
      const trendsText = data.trends
        .slice(0, 3)
        .map((t) => `${t.label} ${t.direction}${t.percentChange ? ` ${t.percentChange}%` : ''}`)
        .join(', ');
      return `[${e.platformHint.platform ?? 'Unknown'}]
  Summary: ${data.yearSummary}
  Metrics: ${metricsText || '(none)'}
  Highlights: ${highlightsText || '(none)'}
  Trends: ${trendsText || '(none)'}`;
    })
    .join('\n\n');

  const crossDomainPrompt = `You are a year-in-review writer synthesising data from ${extractions.length} platforms into ONE unified narrative for ${year}.

DATA:
${summaryContext}

WRITE:
1. yearSummary — 3-4 sentences. Cite at least 3 specific numbers from the data above. Make a non-obvious cross-domain connection (e.g. how listening volume tracked with workouts, or how reading correlated with quieter weeks). DO NOT use phrases like "balanced lifestyle", "self-improvement and exploration", "diverse engagement", or any generic platitudes. Be concrete, observational, and a little dry — like a friend who actually paid attention.

2. recommendations — exactly 3 items. Each MUST:
   - Reference specific data above (a number, platform, artist, book, etc.)
   - Be actionable and unusual (not "set a reading goal" or "explore similar music")
   - Connect TWO domains where possible (e.g. "your top artist X averages 120 BPM — try them on your next run")
   AVOID: generic motivational advice, "consider exploring", "try setting goals", anything that could apply to anyone.

Return ONLY valid JSON, no markdown fences:
{ "yearSummary": "...", "recommendations": ["...", "...", "..."] }`;

  logger.debug('aiService', 'Calling AI for cross-domain synthesis');

  let crossNarrative: { yearSummary: string; recommendations: string[] };

  try {
    const result = await withRetry(
      () => callProvider(config, '', crossDomainPrompt, null, 'combined', year),
    );

    const raw = result.content;
    const match = raw.match(/\{[\s\S]*\}/);

    if (!match) {
      throw new WrapceptionError(
        'AI synthesis did not return valid JSON',
        'AI_RESPONSE_INVALID_JSON',
      );
    }

    const parsed = JSON.parse(match[0]);
    crossNarrative = {
      yearSummary: parsed.yearSummary ?? '',
      recommendations: parsed.recommendations ?? [],
    };

    if (!crossNarrative.yearSummary) {
      throw new WrapceptionError(
        'AI synthesis returned empty summary',
        'AI_RESPONSE_INVALID_JSON',
      );
    }

    logger.info('aiService', 'Cross-domain synthesis completed', {
      summaryLength: crossNarrative.yearSummary.length,
      recommendations: crossNarrative.recommendations.length,
      cost: result.estimatedUsd?.toFixed(4),
    });
  } catch (err) {
    const wrappedErr = toWrapceptionError(err);
    logger.error('aiService', 'Cross-domain synthesis failed', {
      error: wrappedErr.message,
      code: wrappedErr.code,
    });
    throw wrappedErr;
  }

  // De-duplicate metrics by normalised name+platform so the UI doesn't show
  // near-duplicates like "Total Listening Time" and "Minutes Listened" from the
  // same platform.
  const metricsByKey = new Map<string, ExtractedMetricAI>();
  for (const m of allMetrics) {
    const key = `${(m.name ?? '').toLowerCase().trim()}|${(m.platform ?? '').toLowerCase().trim()}`;
    if (!metricsByKey.has(key)) metricsByKey.set(key, m);
  }

  // De-duplicate categoryBreakdown by category (sum counts, keep first insight)
  const breakdownByCategory = new Map<string, typeof allBreakdown[number]>();
  for (const b of allBreakdown) {
    const existing = breakdownByCategory.get(b.category);
    if (!existing) {
      breakdownByCategory.set(b.category, { ...b });
    } else {
      breakdownByCategory.set(b.category, {
        ...existing,
        count: (existing.count || 0) + (b.count || 0),
      });
    }
  }

  return {
    yearSummary: crossNarrative.yearSummary,
    highlights: allHighlights,
    metrics: Array.from(metricsByKey.values()),
    trends: allTrends,
    categoryBreakdown: Array.from(breakdownByCategory.values()),
    recommendations: crossNarrative.recommendations.length > 0 ? crossNarrative.recommendations : allRecs,
    generatedAt: new Date(),
  };
}

// ─── Legacy batch function (kept for backward compat during refactor) ─────────

/** @deprecated Use extractSource + synthesizeAnalytics instead. */
export async function generateAIInsights(
  config: AIConfig,
  sources: UploadedSource[],
  year: number,
): Promise<AnalyticsData> {
  if (!config.apiKey) throw new WrapceptionError('API key is required', 'NO_API_KEY');
  if (sources.length === 0) throw new WrapceptionError('No sources to analyze', 'NO_SOURCES');

  const extractions: SourceExtraction[] = [];
  for (const source of sources) {
    try {
      const extraction = await extractSource(source, config, year);
      extractions.push(extraction);
    } catch (err) {
      throw toWrapceptionError(err);
    }
  }

  return synthesizeAnalytics(extractions, config, year);
}
