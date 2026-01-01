import { AIConfig, UploadedSource, Category, CATEGORY_INFO } from '@/types/session';

// Analytics response structure from AI
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

// Build the system prompt for analytics extraction
function buildSystemPrompt(): string {
    return `You are an analytics expert that extracts structured insights from personal year-in-review data.

You will receive information about a user's uploaded "Wrapped" data from various platforms (Spotify, Strava, Netflix, etc). This may include screenshots of their wrapped summaries, text data, or descriptions.

IMPORTANT: Extract ONLY the data that is ACTUALLY present in the provided content. Do NOT make up or hallucinate any statistics. If you cannot see specific numbers, say so in your response.

Your task is to analyze this data and return a JSON object with the following structure:

{
  "yearSummary": "A 2-3 sentence engaging narrative summary based on the ACTUAL data provided",
  "highlights": [
    {
      "id": "unique-id",
      "title": "Short highlight title based on REAL data",
      "description": "1-2 sentence description of ACTUAL stats",
      "category": "music|fitness|reading|movies|work|productivity|other",
      "metric": "The ACTUAL metric from the data, e.g., '500 hours' or 'Top 1%'"
    }
  ],
  "metrics": [
    {
      "name": "Metric name",
      "value": 1234,
      "unit": "hours|songs|books|miles|etc",
      "category": "category",
      "platform": "Platform name"
    }
  ],
  "trends": [
    {
      "label": "Trend description based on ACTUAL comparison data if available",
      "direction": "up|down|stable",
      "value": "e.g., '25% more than last year' - only if this is REAL data",
      "percentChange": 25,
      "category": "category"
    }
  ],
  "categoryBreakdown": [
    {
      "category": "music",
      "count": 1,
      "topPlatform": "Spotify",
      "keyMetric": "ACTUAL metric from the data",
      "insight": "Short insight based on REAL data"
    }
  ],
  "recommendations": [
    "Forward-looking suggestion based on the ACTUAL data"
  ]
}

CRITICAL Guidelines:
- Extract ONLY REAL metrics visible in the images or text provided
- DO NOT invent statistics, percentages, or comparisons
- If an image is unclear, describe what you can see
- If no specific numbers are visible, focus on qualitative insights
- Keep the tone positive and celebratory
- Return ONLY valid JSON, no markdown or explanation`;
}

// Helper to parse API errors into user-friendly messages
function parseApiError(errorText: string): string {
    try {
        const parsed = JSON.parse(errorText);
        if (parsed.error?.message) {
            const msg = parsed.error.message;
            if (msg.includes('Quota exceeded') || msg.includes('RESOURCE_EXHAUSTED')) {
                return 'API quota exceeded. Please wait a moment and try again, or check your usage at ai.google.dev/usage';
            }
            if (msg.includes('API key not valid') || msg.includes('API_KEY_INVALID')) {
                return 'Invalid API key. Please check your API key in the configuration.';
            }
            if (msg.includes('not found') || msg.includes('NOT_FOUND')) {
                return 'Model not found. Try selecting a different model (e.g., gemini-2.0-flash).';
            }
            // Return first meaningful line
            return msg.split('\n')[0].slice(0, 150);
        }
        return errorText.slice(0, 150);
    } catch {
        return errorText.slice(0, 150);
    }
}

// Build Gemini multimodal content with images
function buildGeminiContent(sources: UploadedSource[], year: number, systemPrompt: string): object[] {
    const parts: object[] = [];

    // Add system prompt and context
    let textContent = `${systemPrompt}\n\n`;
    textContent += `Analyze my ${year} year-in-review data. Here is what I'm sharing:\n\n`;

    // Group sources by category
    const categoryGroups: Record<Category, UploadedSource[]> = {
        music: [], fitness: [], reading: [], movies: [], work: [], productivity: [], other: [],
    };
    sources.forEach(source => categoryGroups[source.category].push(source));

    // Build content with images inline
    for (const [category, categorySources] of Object.entries(categoryGroups)) {
        if (categorySources.length === 0) continue;

        const info = CATEGORY_INFO[category as Category];
        textContent += `\n## ${info.label}\n`;

        for (const source of categorySources) {
            textContent += `\n### ${source.platformName}\n`;

            if (source.inputType === 'text') {
                textContent += source.rawContent + '\n';
            } else if (source.inputType === 'image' && source.rawContent) {
                // Add text description before adding image
                textContent += `[Image from ${source.platformName}`;
                if (source.notes) textContent += ` - Notes: ${source.notes}`;
                textContent += `]\n`;

                // Add the text accumulated so far
                if (textContent.trim()) {
                    parts.push({ text: textContent });
                    textContent = '';
                }

                // Add inline image data
                // rawContent is base64 data URL: "data:image/png;base64,..."
                const base64Match = source.rawContent.match(/^data:([^;]+);base64,(.+)$/);
                if (base64Match) {
                    const mimeType = base64Match[1];
                    const base64Data = base64Match[2];
                    parts.push({
                        inline_data: {
                            mime_type: mimeType,
                            data: base64Data
                        }
                    });
                }
            } else if (source.inputType === 'pdf') {
                textContent += `[PDF file: ${source.fileName || 'document'}`;
                if (source.notes) textContent += ` - Notes: ${source.notes}`;
                textContent += `]\n`;
            }
        }
    }

    // Add any remaining text
    if (textContent.trim()) {
        parts.push({ text: textContent });
    }

    // Add final instruction
    parts.push({
        text: '\n\nBased on the above data and images, extract the analytics and return the JSON response.'
    });

    return parts;
}

// Call Gemini API with vision support
async function callGeminiWithVision(
    config: AIConfig,
    sources: UploadedSource[],
    year: number,
    systemPrompt: string
): Promise<string> {
    const baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    const url = `${baseUrl}/models/${config.model}:generateContent?key=${config.apiKey}`;

    const parts = buildGeminiContent(sources, year, systemPrompt);

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
                temperature: 0.7,
                responseMimeType: 'application/json',
            },
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(parseApiError(errorText));
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

// Build text-only message for non-vision APIs
function buildTextMessage(sources: UploadedSource[], year: number): string {
    let message = `Analyze my ${year} year-in-review data:\n\n`;

    const categoryGroups: Record<Category, UploadedSource[]> = {
        music: [], fitness: [], reading: [], movies: [], work: [], productivity: [], other: [],
    };
    sources.forEach(source => categoryGroups[source.category].push(source));

    for (const [category, categorySources] of Object.entries(categoryGroups)) {
        if (categorySources.length === 0) continue;
        const info = CATEGORY_INFO[category as Category];
        message += `## ${info.label}\n`;

        for (const source of categorySources) {
            message += `\n### ${source.platformName}\n`;
            if (source.inputType === 'text') {
                message += source.rawContent + '\n';
            } else {
                message += `[${source.inputType.toUpperCase()} file: ${source.fileName || 'uploaded'}]\n`;
                if (source.notes) message += `Notes: ${source.notes}\n`;
            }
        }
        message += '\n';
    }

    return message;
}

// Call OpenAI-compatible API
async function callOpenAIFormat(config: AIConfig, systemPrompt: string, userMessage: string): Promise<string> {
    const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`,
            ...config.headers,
        },
        body: JSON.stringify({
            model: config.model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage },
            ],
            temperature: 0.7,
            response_format: { type: 'json_object' },
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(parseApiError(errorText));
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

// Call Anthropic API
async function callAnthropicFormat(config: AIConfig, systemPrompt: string, userMessage: string): Promise<string> {
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
            messages: [{ role: 'user', content: userMessage }],
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(parseApiError(errorText));
    }

    const data = await response.json();
    return data.content[0].text;
}

// Parse AI response to AnalyticsData
function parseAnalyticsResponse(rawResponse: string): AnalyticsData {
    try {
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON found in response');

        const parsed = JSON.parse(jsonMatch[0]);

        return {
            yearSummary: parsed.yearSummary || 'Your year was full of interesting moments.',
            highlights: (parsed.highlights || []).map((h: Highlight, i: number) => ({
                ...h,
                id: h.id || `highlight-${i}`,
            })),
            metrics: parsed.metrics || [],
            trends: parsed.trends || [],
            categoryBreakdown: parsed.categoryBreakdown || [],
            recommendations: parsed.recommendations || [],
            generatedAt: new Date(),
        };
    } catch (error) {
        console.error('Failed to parse AI response:', error, rawResponse);
        throw new Error('Failed to parse AI response. The AI may have returned invalid data.');
    }
}

// Main function to generate insights
export async function generateAIInsights(
    config: AIConfig,
    sources: UploadedSource[],
    year: number
): Promise<AnalyticsData> {
    if (!config.apiKey) {
        throw new Error('API key is required');
    }
    if (sources.length === 0) {
        throw new Error('No sources to analyze');
    }

    const systemPrompt = buildSystemPrompt();
    let rawResponse: string;

    // Use vision-enabled call for Gemini (supports images)
    if (config.provider === 'gemini') {
        rawResponse = await callGeminiWithVision(config, sources, year, systemPrompt);
    } else {
        // Text-only for other providers
        const userMessage = buildTextMessage(sources, year);

        switch (config.provider) {
            case 'openai':
            case 'groq':
            case 'grok':
            case 'custom':
                rawResponse = await callOpenAIFormat(config, systemPrompt, userMessage);
                break;
            case 'anthropic':
                rawResponse = await callAnthropicFormat(config, systemPrompt, userMessage);
                break;
            default:
                throw new Error(`Unsupported provider: ${config.provider}`);
        }
    }

    return parseAnalyticsResponse(rawResponse);
}
