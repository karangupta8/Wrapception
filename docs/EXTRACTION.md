# AI Extraction Service Guide

## A Vibe-Coded Approach

The extraction service is a good example of vibe coding: We didn't design a perfect distributed system. We solved the immediate problems we faced and shipped it.

Problems we had:
- One bad source would break the entire AI call
- No way to know which source failed or how much it cost
- No real-time feedback to users about what was happening
- Risk of hitting token limits with large batches

Solution: **Extract each source independently.** It's not a microservices architecture or a distributed system. It's just... straightforward. One source at a time. If one fails, move to the next. Show the user what's happening. Costs are predictable. Done.

That's vibe coding: Solve the problem directly with tools at hand, not the problem you theoretically might have later.

## Overview

The extraction service (`src/services/aiService.ts`) handles all communication with AI providers. It's built around a **per-source pipeline** where each upload is extracted independently, allowing for failure isolation, progress tracking, and cost control.

## Architecture

### Two-Stage Design

**Stage 1: Per-Source Extraction**
- Each source extracted independently
- Returns metrics, confidence, cost
- Failures don't cascade to other sources

**Stage 2: Cross-Source Synthesis**
- Aggregates metrics from all successful extractions
- Generates narrative, trends, recommendations
- Text-only (cheap compared to vision)

### Why Two Stages?

1. **Reliability**: One source's API error doesn't fail the whole run
2. **Performance**: Parallel extraction possible (can batch per-source calls)
3. **Cost Control**: Know cost per source; soft limits prevent surprises
4. **Progress**: Show real-time status (3 of 5 sources processed)
5. **Resilience**: Users can retry individual failed sources

## Multimodal Content Building

### The Challenge

Different AI providers have different APIs:
- **OpenAI**: Wants `{ type: 'image_url', image_url: { url: 'data:...' } }`
- **Claude**: Wants `{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: '...' } }`
- **Gemini**: Native base64, different auth

### The Solution

Content builders per provider handle the format differences:

```typescript
function buildOpenAIFormat(source, config) {
  const content = [
    { type: 'text', text: promptText },
  ];
  
  if (source.inputType === 'image' && config.visionSupported) {
    content.push({
      type: 'image_url',
      image_url: { url: `data:image/jpeg;base64,${source.rawContent}` },
    });
  }
  
  return { model: config.model, messages: [{ role: 'user', content }] };
}

function buildAnthropicFormat(source, config) {
  const content = [
    { type: 'text', text: promptText },
  ];
  
  if (source.inputType === 'image' && config.visionSupported) {
    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/jpeg',
        data: source.rawContent, // Just the base64, no prefix
      },
    });
  }
  
  return { model: config.model, messages: [{ role: 'user', content }] };
}
```

### Content Types Supported

**Images:**
- `jpg`, `png`, `webp` (compressed to max 1536px @ 85% quality)
- Sent only if `config.visionSupported === true`
- Falls back to text placeholder if not supported

**PDFs:**
- Text extraction first (cheap)
- If parsing fails, render page as image (fallback to vision)
- Only extracted text sent (no file upload)

**Text:**
- Raw text passed directly
- No size limit, but long text costs more tokens

## Prompt Construction

The prompt is built in layers:

```
SYSTEM PROMPT
├─ Universal base instructions
├─ Platform-specific instructions (from template)
└─ Format instructions (JSON structure)

USER CONTENT
├─ Prompt text + platform guidance
├─ Image (if vision-supported)
└─ Context (year, source metadata)
```

Example:

```typescript
const systemPrompt = `
You are extracting year-end summary data from user uploads.
Be precise. Only extract data that is explicitly shown.
Return valid JSON matching the SourceExtraction schema.

${template.instructions} // Platform-specific

Return JSON with this structure:
{
  "metrics": [
    { "label": "...", "value": "...", "unit": "..." }
  ],
  "highlights": [
    { "title": "...", "description": "..." }
  ],
  "confidence": 0.85
}
`;
```

## API Calling

### Supported Providers

| Provider | Endpoint | Vision | Status |
|----------|----------|--------|--------|
| OpenAI | api.openai.com | ✅ GPT-4o-mini | Fully implemented |
| Claude | api.anthropic.com | ✅ Haiku | Fully implemented |
| Gemini | generativelanguage.googleapis.com | ✅ Flash | Implemented |
| Groq | api.groq.com | ❌ Text only | Implemented |
| Grok | api.x.ai | ❌ Text only | Implemented |
| Custom | User-provided | ✅/❌ Configurable | Implemented |

### Request Flow

```typescript
async function extractSource(source, config, year) {
  // 1. Validate preconditions
  if (!config.enabled) throw new WrapceptionError(..., 'AI_NOT_ENABLED');
  if (!config.apiKey) throw new WrapceptionError(..., 'NO_API_KEY');
  
  // 2. Detect platform
  const hint = platformDetector.detectFromFilename(source.fileName);
  
  // 3. Select template
  const template = selectTemplate(hint);
  
  // 4. Prepare content
  let content = source.rawContent;
  if (source.inputType === 'image') {
    const compressed = await compressImage(source.rawContent);
    content = compressed;
  }
  if (source.inputType === 'pdf') {
    try {
      content = await extractTextFromPDF(source.rawContent);
    } catch {
      // Fallback: render as image
      content = await pdfPageToImage(source.rawContent, 0);
      source.inputType = 'image';
    }
  }
  
  // 5. Build prompt
  const prompt = buildTemplatePrompt(template, content, year);
  
  // 6. Build provider-specific request
  const requestBody = buildProviderFormat(source, config, prompt);
  
  // 7. Call API
  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });
  
  // 8. Handle errors
  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 401) {
      throw new WrapceptionError(errorText, 'AI_API_UNAUTHORIZED');
    }
    if (response.status === 429) {
      throw new WrapceptionError(errorText, 'AI_API_RATE_LIMIT');
    }
    // ... handle other status codes
  }
  
  // 9. Parse response
  const data = await response.json();
  const extraction = parseSourceExtraction(data);
  
  // 10. Validate & return
  return {
    ...extraction,
    detectedPlatform: template.id,
    confidence: calculateConfidence(extraction, template.expectedMetrics),
  };
}
```

## Response Parsing

The AI returns JSON with metrics and highlights:

```json
{
  "metrics": [
    { "label": "Total Streams", "value": "1247", "unit": "songs" }
  ],
  "highlights": [
    { "title": "Top Artist", "description": "The 1975 dominated your year" }
  ],
  "confidence": 0.92
}
```

Parsing:

```typescript
function parseSourceExtraction(response) {
  // Extract JSON from response (AI might wrap it in text)
  const jsonMatch = response.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new WrapceptionError(
      'No JSON found in response',
      'AI_RESPONSE_INVALID'
    );
  }
  
  const parsed = JSON.parse(jsonMatch[0]);
  
  // Validate shape
  if (!Array.isArray(parsed.metrics)) {
    throw new WrapceptionError(
      'Invalid response format',
      'AI_RESPONSE_INVALID'
    );
  }
  
  return parsed;
}
```

## Cross-Source Synthesis

After all sources extracted, synthesize insights:

```typescript
async function synthesizeAnalytics(extractions, config, year) {
  // Aggregate metrics
  const allMetrics = extractions.flatMap(e => e.metrics);
  const trends = identifyTrends(allMetrics);
  const correlations = findCorrelations(extractions);
  
  // Generate narrative
  const narrative = await callAI({
    prompt: `
      User's year: ${year}
      Sources analyzed: ${extractions.map(e => e.detectedPlatform).join(', ')}
      
      Key metrics:
      ${allMetrics.map(m => `- ${m.label}: ${m.value} ${m.unit}`).join('\n')}
      
      Write a 2-3 sentence narrative summary of their year.
    `,
  });
  
  return {
    yearSummary: narrative,
    trends,
    recommendations: generateRecommendations(correlations),
    metrics: allMetrics,
    // ...
  };
}
```

## Cost Estimation

Costs estimated based on source types:

```typescript
function estimateCost(sources) {
  let cost = 0;
  
  for (const source of sources) {
    if (source.inputType === 'image') {
      cost += 0.01; // ~$0.01 per vision image
    } else if (source.inputType === 'pdf') {
      cost += 0.002; // Text extraction + image fallback
    } else {
      cost += 0.001; // Text-only extraction
    }
  }
  
  // Add synthesis cost
  cost += 0.005 * Math.min(sources.length, 5);
  
  return cost; // Returns USD
}
```

## Error Handling

**Recoverable (per-source):**
- Image too large → Compress and retry
- PDF parse failed → Try image rendering
- Low confidence → Show warning, let user edit

**Fatal (stop pipeline):**
- No API key
- API key invalid (401)
- Provider not vision-capable but user uploaded image

**Retryable:**
- Network timeout → Retry with exponential backoff
- Rate limit (429) → Wait and retry
- Temporary server error (5xx) → Retry once

## Testing Extraction

### Unit Test Example

```typescript
test('extractSource handles image properly', async () => {
  const source = {
    id: '1',
    inputType: 'image',
    rawContent: 'base64...',
    platformName: 'Spotify',
  };
  
  const config = {
    enabled: true,
    provider: 'openai',
    apiKey: 'sk-...',
    visionSupported: true,
  };
  
  const result = await extractSource(source, config, 2025);
  
  expect(result.metrics.length).toBeGreaterThan(0);
  expect(result.confidence).toBeGreaterThanOrEqual(0.5);
  expect(result.detectedPlatform).toBeDefined();
});
```

### Manual Testing

1. Upload sample image
2. Watch network tab for API call
3. Check request body for proper multimodal format
4. Verify response parsing

## Debugging Tips

1. **Check request shape**: `buildOpenAIFormat()` vs `buildAnthropicFormat()`
2. **Verify API key**: `config.apiKey` present and valid
3. **Check vision support**: `config.visionSupported === true` for images
4. **Review error code**: `insightsErrorCode` in context tells you exact failure
5. **Inspect response**: Check what AI actually returned before parsing

## Related Files

- Main service: `src/services/aiService.ts`
- Templates: `src/services/promptTemplates.ts`
- Content prep: `src/services/contentExtractor.ts`
- Error handling: `src/services/errors.ts`
- Integration: `src/context/SessionContext.tsx:generateInsights()`
