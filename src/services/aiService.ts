import { AIConfig, UploadedSource, Category, CATEGORY_INFO } from '@/types/session';
import { WrapceptionError, fromHttpStatus, toWrapceptionError } from './errors';
import { detectFromFilename, detectFromContent, type PlatformHint } from './platformDetector';
import { selectTemplate, buildTemplatePrompt } from './promptTemplates';
import { compressImage, extractTextFromPDF, pdfFirstPageToImage } from './contentExtractor';
import { logger } from './logger';

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
}

// ─── Internal content types ───────────────────────────────────────────────────

type OpenAITextItem = { type: 'text'; text: string };
type OpenAIImageItem = { type: 'image_url'; image_url: { url: string; detail: 'high' } };
type OpenAIContentItem = OpenAITextItem | OpenAIImageItem;

type AnthropicTextItem = { type: 'text'; text: string };
type AnthropicImageItem = { type: 'image'; source: { type: 'base64'; media_type: string; data: string } };
type AnthropicContentItem = AnthropicTextItem | AnthropicImageItem;

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
): Promise<string> {
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
  return data.candidates[0].content.parts[0].text;
}

async function callOpenAI(
  config: AIConfig,
  systemPrompt: string,
  textContent: string | null,
  imageDataUrl: string | null,
  platformName: string,
  year: number,
): Promise<string> {
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
  return data.choices[0].message.content;
}

async function callAnthropic(
  config: AIConfig,
  systemPrompt: string,
  textContent: string | null,
  imageDataUrl: string | null,
  platformName: string,
  year: number,
): Promise<string> {
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
  return data.content[0].text;
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

async function callProvider(
  config: AIConfig,
  systemPrompt: string,
  textContent: string | null,
  imageDataUrl: string | null,
  platformName: string,
  year: number,
): Promise<string> {
  switch (config.provider) {
    case 'gemini':
      return callGemini(config, systemPrompt, textContent, imageDataUrl, platformName, year);
    case 'anthropic':
      return callAnthropic(config, systemPrompt, textContent, imageDataUrl, platformName, year);
    case 'openai':
    case 'groq':
    case 'grok':
    case 'custom':
      return callOpenAI(config, systemPrompt, textContent, imageDataUrl, platformName, year);
    default:
      throw new WrapceptionError(`Unsupported provider: ${config.provider}`, 'UNKNOWN');
  }
}

/** Extract analytics from a single source. Safe to call concurrently. */
export async function extractSource(
  source: UploadedSource,
  config: AIConfig,
  year: number,
): Promise<SourceExtraction> {
  const warnings: string[] = [];

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

  // Call AI
  const rawResponse = await callProvider(
    config,
    systemPrompt,
    textContent,
    imageDataUrl,
    platformHint.platform ?? source.platformName,
    year,
  );

  const analyticsData = parseAnalyticsResponse(rawResponse);

  // Estimate confidence: more metrics = higher confidence
  const metricCount = analyticsData.metrics.length + analyticsData.highlights.length;
  const confidence = Math.min(1, metricCount / Math.max(template.expectedMetrics.length, 3));

  logger.info('aiService', `Extraction completed: ${source.name}`, {
    sourceId: source.id,
    platform: platformHint.platform,
    confidence: confidence.toFixed(2),
    metricsExtracted: metricCount,
    warnings: warnings.length,
  });

  return {
    sourceId: source.id,
    platformHint,
    templateId: template.id,
    analyticsData,
    confidence,
    warnings,
  };
}

// ─── Cross-source synthesis ───────────────────────────────────────────────────

/**
 * Synthesise multiple per-source extractions into a unified AnalyticsData.
 * For a single source, returns it directly (no extra AI call).
 */
export async function synthesizeAnalytics(
  extractions: SourceExtraction[],
  config: AIConfig,
  year: number,
): Promise<AnalyticsData> {
  if (extractions.length === 0) {
    throw new WrapceptionError('No successful extractions to synthesise', 'NO_SOURCES');
  }

  logger.info('aiService', `Synthesizing ${extractions.length} extractions`, {
    platforms: extractions.map((e) => e.platformHint.platform).join(', '),
  });

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
  });

  // Build a summary prompt with all extracted data for cross-domain narrative
  const summaryContext = extractions
    .map((e) => {
      const data = e.analyticsData;
      const metricsText = data.metrics
        .slice(0, 5)
        .map((m) => `${m.name}: ${m.value}${m.unit ? ' ' + m.unit : ''}`)
        .join(', ');
      return `${e.platformHint.platform ?? 'Unknown'}: ${data.yearSummary} Key stats: ${metricsText || 'see highlights'}`;
    })
    .join('\n');

  const crossDomainPrompt = `You are synthesising year-in-review data from multiple platforms into a single unified narrative.

${year} Year Data:
${summaryContext}

Write a cohesive 2-3 sentence cross-domain year summary that connects insights across ALL platforms (e.g. how fitness correlated with music or work habits). Be specific, use real numbers. Return ONLY valid JSON:
{ "yearSummary": "...", "recommendations": ["cross-domain recommendation 1", "recommendation 2", "recommendation 3"] }`;

  let crossNarrative = { yearSummary: '', recommendations: [] as string[] };

  try {
    logger.debug('aiService', 'Calling AI for cross-domain synthesis');
    const raw = await callProvider(config, '', crossDomainPrompt, null, 'combined', year);
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      crossNarrative.yearSummary = parsed.yearSummary ?? '';
      crossNarrative.recommendations = parsed.recommendations ?? [];
    }
    logger.debug('aiService', 'Cross-domain synthesis completed');
  } catch (err) {
    logger.warn('aiService', 'Cross-domain synthesis failed, using fallback', {
      error: err instanceof Error ? err.message : String(err),
    });
    // Fallback: use first source's summary
    crossNarrative.yearSummary = extractions[0].analyticsData.yearSummary;
    crossNarrative.recommendations = allRecs.slice(0, 3);
  }

  return {
    yearSummary: crossNarrative.yearSummary || extractions[0].analyticsData.yearSummary,
    highlights: allHighlights,
    metrics: allMetrics,
    trends: allTrends,
    categoryBreakdown: allBreakdown,
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
