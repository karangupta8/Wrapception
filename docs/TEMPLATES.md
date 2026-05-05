# Platform Templates Guide

## The Core Idea

Every platform's "wrap" is different. Spotify shows streams and artists. Strava shows distance and pace. GitHub shows commits. Goodreads shows books. They all claim to summarize your year, but they're all extracting different signals from different data sources.

**That's the point.** Each wrap tells a true story about a different part of your life. Templates exist because these stories are incomparable—Spotify's metrics don't make sense as Strava metrics.

Wrapception's template system acknowledges this: Each platform needs its own extraction logic. Not because we're being fancy—because we're being honest about what the data actually means.

## Overview

Wrapception uses platform-specific prompt templates to extract the right metrics from any "wrap" data. Templates are patterns and instructions that tell the AI what to look for and how to structure the output.

This guide explains how to understand the template system and add support for new platforms.

## Architecture

### Components

**Platform Detection** (`src/services/platformDetector.ts`):
- Identifies which platform data came from
- Uses filename patterns + content keywords
- Returns `PlatformHint` with `{ platform, category, confidence }`

**Template Selection** (`src/services/promptTemplates.ts`):
- Matches hint to best template
- Falls back to generic if no match
- Templates layer platform-specific guidance on universal base prompt

**Extraction** (`src/services/aiService.ts`):
- Builds multimodal content with compressed images/PDFs
- Injects template instructions into prompt
- Returns metrics + confidence score

### Flow

```
Upload → Detect Platform → Select Template → Build Prompt → Call AI → Extract Metrics
```

## Current Templates (10 Platforms)

| Template | Category | Looks For |
|----------|----------|-----------|
| `spotify` | music | Top artists, streams, genres, listening patterns |
| `strava` | fitness | Distance, pace, elevation, activity type |
| `github` | work | Commits, languages, repositories, contributions |
| `goodreads` | reading | Books, pages, ratings, genres, DNF books |
| `youtube` | entertainment | Watch time, favorite channels, video themes |
| `duolingo` | productivity | Lessons, streak, languages, XP |
| `apple-music` | music | Top songs, playlists, repeat artists |
| `letterboxd` | entertainment | Movies watched, ratings, favorite directors |
| `linkedin` | work | Job history, skills, connections, endorsements |
| `generic` | *any* | Fallback for unknown platforms |

## Adding a New Template

### Step 1: Create the Template

Edit `src/services/promptTemplates.ts`:

```typescript
const myNewTemplate: PromptTemplate = {
  id: 'my-platform',
  
  // Matching function - when should we use this?
  matches: (hint) => {
    return (
      hint.platform === 'my-platform' ||
      (hint.source === 'filename' && hint.confidence >= 0.8)
    );
  },
  
  // Which category does this belong to?
  category: 'music', // or fitness, reading, movies, work, productivity, other
  
  // Platform-specific extraction guidance
  instructions: `
    You are extracting data from a My Platform Year Summary.
    
    Look for these key metrics:
    - Total items consumed/used (e.g., total songs, miles)
    - Top item/category (e.g., artist, running route)
    - Most common pattern (e.g., genre, activity type)
    - Engagement metric (e.g., hours, streak days)
    
    Prioritize:
    1. Quantifiable numbers (streams, duration, distance)
    2. Named entities (artist names, route names)
    3. Comparative insights (most vs least, increase/decrease)
    4. Patterns or habits
    
    Do NOT invent data. Only extract what's explicitly shown.
  `,
  
  // Example output shape (helps AI understand format)
  exampleOutput: {
    highlights: [
      {
        title: 'Top Item',
        description: 'You consumed X units of [Item], your favorite this year.',
        category: 'music',
      },
    ],
    metrics: [
      { label: 'Total Units', value: 1000, unit: 'items' },
      { label: 'Top Category', value: 'Genre A', unit: '' },
    ],
  },
  
  // What metrics should we expect?
  // Used for validation and chart selection
  expectedMetrics: [
    'Total Units',
    'Top Category',
    'Average per Month',
    'Peak Activity',
  ],
};
```

### Step 2: Add to Template List

In `selectTemplate()`:

```typescript
const TEMPLATES: PromptTemplate[] = [
  spotifyTemplate,
  stravaTemplate,
  // ... existing templates
  myNewTemplate, // Add here
  genericTemplate, // Always last (fallback)
];

export function selectTemplate(hint: PlatformHint): PromptTemplate {
  for (const template of TEMPLATES) {
    if (template.matches(hint)) {
      return template;
    }
  }
  // Fallback to generic (always matches)
  return genericTemplate;
}
```

### Step 3: Add Platform Patterns (Optional)

In `src/services/platformDetector.ts`:

```typescript
const PLATFORM_PATTERNS: Record<string, RegExp[]> = {
  spotify: [
    /wrapped/i,
    /2025|2024|2023/i,
    /spotify/i,
  ],
  'my-platform': [
    /myplatform|my-platform|my_platform/i,
    /year.{0,5}(summary|review|wrap)/i,
    // Add more patterns
  ],
  // ... existing patterns
};
```

## Template Design Best Practices

### Do's

✅ **Be specific about what to extract**
- "Top 5 artists (name and play count)" not just "top artists"

✅ **Provide examples**
- Show one real example input + expected output

✅ **List expected metrics upfront**
- Helps validate extraction and select chart types

✅ **Mention data quality**
- "Only extract numbers shown, not calculated estimates"

✅ **Handle edge cases**
- "If no [item] is shown, don't invent; skip this metric"

### Don'ts

❌ **Generic catch-all prompts**
- "Extract any interesting data" → Gets random metrics

❌ **Platform-agnostic instructions**
- Templates exist because platforms differ; use specificity

❌ **Ambiguous metrics**
- "Top thing" not "Top [specific thing]"

❌ **Inventing data**
- Never ask AI to estimate or fill gaps

## Testing Your Template

### Manual Testing

1. Find sample data from the platform
2. Create test source with that data
3. Temporarily set `confidence: 0.99` in detector
4. Run extraction and check metrics

```typescript
// In browser console, after upload:
const source = useSession().session.uploadedSources[0];
console.log(source); // Check platform detected correctly
```

### What to Verify

- [ ] Platform correctly detected (matching works)
- [ ] All expected metrics extracted
- [ ] Confidence score is realistic (0.6-0.99)
- [ ] Values are reasonable (not hallucinated)
- [ ] Category is correct
- [ ] Chart renders appropriately

### Debugging Bad Extraction

1. Check detector output: Is `detectedPlatform` correct?
2. Check template selected: Is `selectTemplate()` picking the right one?
3. Check prompt: Did `buildTemplatePrompt()` include instructions?
4. Check AI response: Is `extractSource()` parsing JSON correctly?
5. Check confidence: If low (<0.6), metrics might be unreliable

## Real-World Example: Adding Strava Template

```typescript
const stravaTemplate: PromptTemplate = {
  id: 'strava',
  matches: (hint) =>
    hint.platform === 'strava' ||
    (hint.category === 'fitness' && 
     hint.source === 'filename' && 
     hint.confidence >= 0.7),
  
  category: 'fitness',
  
  instructions: `
    You are extracting metrics from a Strava Year in Sport summary.
    Strava tracks running, cycling, swimming, and other activities.
    
    Primary metrics to extract:
    - Total distance (km or miles, note the unit)
    - Total time (hours or minutes)
    - Total activities (number of runs/rides)
    - Most common activity type (running, cycling, etc.)
    - Average distance per activity
    - Personal records (longest run, fastest pace, highest elevation)
    - Elevation climbed (total meters)
    - Most active month
    
    Format numbers precisely:
    - Distance: include unit (km/miles) and decimal
    - Time: prefer hours for readability
    - Pace: min/km or min/mile with unit
    
    If data is missing, skip that metric (don't estimate).
  `,
  
  exampleOutput: {
    highlights: [
      {
        title: '156 Workouts Completed',
        description: 'You stayed consistent with an average of 3 activities per week.',
        category: 'fitness',
      },
    ],
    metrics: [
      { label: 'Total Distance', value: 847, unit: 'km' },
      { label: 'Total Time', value: 89, unit: 'hours' },
      { label: 'Longest Run', value: 21.3, unit: 'km' },
      { label: 'Most Active Month', value: 'September' },
    ],
  },
  
  expectedMetrics: [
    'Total Distance',
    'Total Time',
    'Total Activities',
    'Longest Run',
    'Most Active Month',
    'Average Pace',
  ],
};
```

## Integration with Demo Data

The `src/data/sampleAnalytics.ts` file contains sample outputs for demo mode. When adding a template, consider adding sample data:

```typescript
export const SAMPLE_SOURCES = [
  {
    platformName: 'My Platform',
    rawContent: '...actual sample data...',
    // ...
  },
];
```

## Future Enhancements

- **Caching**: Cache extraction results by content hash
- **Version history**: Support different formats per year
- **Community templates**: Let users contribute templates
- **A/B testing**: Test multiple templates on ambiguous data
- **Confidence refinement**: Use cross-source validation

## Related Files

- Templates: `src/services/promptTemplates.ts`
- Detection: `src/services/platformDetector.ts`
- Extraction: `src/services/aiService.ts:extractSource()`
- Sample data: `src/data/sampleAnalytics.ts`
- UI for validation: `src/components/app/ExtractionValidationPanel.tsx`
