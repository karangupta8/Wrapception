# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

### Development Commands

```bash
# Install dependencies (using Bun; also works with npm/yarn)
bun install

# Start development server (runs on http://localhost:8080)
bun run dev

# Build for production
bun run build

# Build with development mode
bun run build:dev

# Run ESLint
bun run lint

# Preview production build
bun run preview
```

## Project Overview

**Wrapception** is a React + TypeScript web application that aggregates Year-in-Review summaries from multiple platforms (Spotify Wrapped, Strava, Goodreads, etc.) and uses AI to generate a unified, cross-domain annual life dashboard.

### Key Features

- File/text upload for wrapped data from multiple platforms
- AI extraction and normalization via configured AI provider (OpenAI, etc.)
- Unified dashboard with cross-platform analytics
- Session persistence via localStorage
- Interactive insights and narrative generation
- Configurable AI settings (provider, model, API key)

## Philosophy

Wrapception is built with vibes and purpose. Understand the "why" before modifying the "how":

**On Wrapped Culture**: Every company ships a wrapped. It's brilliant and absurd—a personal retrospective optimized for sharing, filtered through a single platform's lens. But you don't live in one app. Wrapception exists to acknowledge that gap: Your year isn't captured in any single wrap, it's the union of all of them.

**On Vibe Coding**: This app is intentionally not over-architected. We solve the problems in front of us (per-source failure isolation, cost transparency, real-time progress) without designing for futures that may never arrive. The result is honest code that does what it claims—no more, no less.

**On Design Decisions**: Every architectural choice (per-source extraction, IndexedDB storage, template-based prompts) reflects this philosophy. Features are added to solve real problems, not to make the product more "complete." Error messages are actionable. Costs are visible. Privacy is preserved.

See **[docs/PHILOSOPHY.md](docs/PHILOSOPHY.md)** for deeper context on how these ideas shape the codebase.

## Architecture

### High-Level Structure

```
src/
├── pages/              # Route pages (Index, NotFound)
├── components/
│   ├── app/           # App-specific features (Dashboard, Upload, Insights, Charts)
│   ├── landing/       # Marketing pages (Hero, Features)
│   └── ui/            # shadcn/ui primitives (auto-generated from Radix UI)
├── context/           # React Context (SessionContext)
├── services/          # Business logic (aiService for AI interactions)
├── hooks/             # Custom React hooks
├── types/             # TypeScript type definitions
├── lib/               # Utility functions
└── App.tsx            # Root component with routing and providers
```

### State Management: SessionContext

All application state is managed through `SessionContext` (`src/context/SessionContext.tsx`). This is the single source of truth for:

- **Session Data**: Year, uploaded sources with per-source status
- **AI Configuration**: Provider, model, API key (encrypted in secureStore)
- **Generated Content**: Analytics data, insights, narrative summary
- **Loading States**: `isGeneratingInsights` flag
- **Error States**: `insightsError` (message) + `insightsErrorCode` (typed enum)
- **Persistence**: localStorage for metadata, IndexedDB for file content

**Key Operations:**
- `addSource(source)` - Add new upload, store file in IndexedDB if binary
- `removeSource(id)` - Remove source and associated IDB content
- `updateSource(id, updates)` - Partial updates (status, notes, etc.)
- `generateInsights()` - Trigger per-source extraction pipeline
  - Sets sources to `processing` status
  - Per-source failures don't cascade (continue with remaining)
  - Updates to `processed` or `failed` with error message
  - Calls `synthesizeAnalytics` on successful extractions
- `loadDemoData(sources, analytics)` - Load sample data (used by DemoMode)
- `updateAIConfig(partial)` - Update provider/model/apiKey
- `updateNarrative(text)` - User edits narrative summary
- `saveSession()` - Persist session to localStorage (called automatically)
- `resetSession()` - Clear localStorage + IDB + session state

**Source Statuses:**
- `uploaded` - File received, ready for extraction
- `processing` - Extraction in progress
- `processed` - Successfully extracted
- `failed` - Extraction failed (error message in `extractionError`)

### Routing

Single-page app with minimal routing:
- `/` - Main app (Index page)
- `*` - 404 page (NotFound)

Add custom routes in `App.tsx` before the catch-all route.

### API Path Alias

Imports use `@/` to reference the `src/` directory:
```typescript
import { SessionContext } from '@/context/SessionContext'
import { Button } from '@/components/ui/button'
```

## Component Organization

### App Components (`src/components/app/`)

**Core Workflow:**
- `UploadWizard` - Multi-step file/text upload (category → platform → upload type → preview)
  - Responsive design with mobile-first breakpoints
  - ARIA labels on all interactive elements
  - Keyboard navigation support
- `Dashboard` - Main hub routing uploads, stats, insights, and controls
- `InsightsDashboard` - Display AI-generated insights, narrative, and dynamic charts
- `StatsOverview` - High-level metrics overview from all sources

**Extraction & Validation:**
- `ExtractionProgress` - Real-time per-source progress (Ready → Analysing → Done/Failed)
- `ExtractionValidationPanel` - Review extracted data with confidence, override platform, edit metrics
- `WrapDetectionBadge` - Display detected platform + confidence %
- `AIErrorAlert` - Rich error card with contextual recovery actions

**Analytics & Visualization:**
- `CategoryPieChart` - Category distribution breakdown
- `PlatformBarChart` - Performance per platform
- `DynamicChartRenderer` - Renders Recharts (Pie/Bar/Line/Radar) based on ChartConfig type
- `SourceCard` - Individual source card with status badge and error display

**UX Components:**
- `CostEstimateModal` - Shows estimated cost + time before running extraction
- `DemoMode` - Loads sample data for users to explore without API key
- `QuickUpload` - Drag-drop or click-to-upload for quick additions
- `BulkUploadModal` - Multi-file upload dialog

**Configuration:**
- `AIConfigPanel` - Provider selection, API key input, model choice
  - Vision capability warning for image uploads
  - IndexedDB + localStorage persistence explanation
- `SessionHeader` - Year selector, session controls

### UI Components (`src/components/ui/`)

Pre-built shadcn/ui components (Radix UI based). Import and use directly in feature components:
```typescript
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
```

These are generated from shadcn and should not be manually edited unless fixing specific bugs.

## Types & Schemas

Key types are defined in `src/types/session.ts`:

- `SessionState` - Complete app state shape
- `UploadedSource` - Uploaded file metadata
- `ExtractedMetric` - Normalized data from sources
- `AIInsight` - Generated insights
- `AIConfig` - AI provider configuration
- `AnalyticsData` - Aggregated analytics output

Use Zod schemas for validation at boundaries (file upload, API responses).

## Services Architecture

All business logic is organized in `src/services/`. Services are kept focused and composed together for complex operations.

### AI Service (`src/services/aiService.ts`)

**Per-Source Extraction Pipeline** - Each source extracted independently for reliability and progress tracking:
- `extractSource(source, aiConfig, year)` - Extract metrics from individual source
  - Handles images, PDFs, and text
  - Sends real multimodal content to vision-capable providers
  - Returns `SourceExtraction` with metrics, confidence, and cost
- `synthesizeAnalytics(extractions, aiConfig, year)` - Cross-source synthesis
  - Generates narrative, trends, recommendations
  - Returns `AnalyticsData` with unified insights

**Provider Support**:
- OpenAI (GPT-4o-mini) - Full multimodal with vision
- Anthropic (Claude Haiku) - Full multimodal with vision
- Google Gemini - Native vision support
- Groq / Grok - Text-based fallback
- Custom provider - User-configurable endpoint

**Image/Media Handling**:
- Respects `visionSupported` flag from AIConfig
- Builds proper multimodal content arrays per provider API
- Handles base64 encoding for all provider formats

### Error System (`src/services/errors.ts`)

Typed error handling with user-friendly messages:
- `WrapceptionError` class with code, severity, message
- `ErrorCode` enum: `NO_API_KEY`, `AI_NOT_ENABLED`, `AI_API_UNAUTHORIZED`, `AI_API_RATE_LIMIT`, `AI_API_SERVER_ERROR`, `AI_API_NETWORK`, `AI_API_TIMEOUT`, `AI_RESPONSE_INVALID`, `PDF_PARSE_FAILED`, `IMAGE_TOO_LARGE`, `PROVIDER_NOT_VISION`, `COST_LIMIT_EXCEEDED`
- `getErrorDetail(code)` - Maps code to user-friendly message + action
- `toWrapceptionError(unknown)` - Wraps any error with proper typing

**Usage in SessionContext**:
- Per-source extraction failures don't cascade
- Error surfaced as `insightsError` + `insightsErrorCode` in context
- `AIErrorAlert` component displays rich error UI with recovery actions

### Platform Detection (`src/services/platformDetector.ts`)

Identifies platform from multiple signals (highest confidence wins):
- **Filename patterns**: 40+ regex patterns across categories
  - Spotify: `wrapped`, `2025`, `spotify`
  - Strava: `strava`, `year`, `summary`
  - GitHub: `contributions`, `github`, `commits`
  - etc.
- **Content keywords**: Extracted from raw text/PDF
  - Music keywords: `"artists"`, `"streams"`, `"playlist"`
  - Fitness keywords: `"km"`, `"elevation"`, `"pace"`
  - Reading keywords: `"books"`, `"pages"`, `"rating"`
- **AI refinement**: Vision model confirms/corrects hint via prompt

### Prompt Templates (`src/services/promptTemplates.ts`)

Platform-specific extraction instructions layered on universal base prompt:
- 10 templates: Spotify, Strava, GitHub, Goodreads, YouTube, Duolingo, Apple Music, Letterboxd, LinkedIn, Generic
- Each template has:
  - `matches(hint)` - Confidence function
  - `instructions` - Platform-specific extraction guidelines
  - `expectedMetrics` - List of metrics to extract
  - `exampleOutput` - Few-shot example for context
- `selectTemplate(hint)` - Chooses best match, falls back to generic
- `buildTemplatePrompt()` - Constructs system prompt with platform guidance

### Content Extraction (`src/services/contentExtractor.ts`)

Prepares media for AI consumption:
- `compressImage(blob, maxDim=1536, quality=85)` - Reduces file size for cost
- `extractTextFromPDF(blob)` - Uses pdfjs-dist for text-based PDFs
- `pdfPageToImage(blob, pageNum)` - Fallback for scanned PDFs (render as image)
- Returns base64-encoded content for API submission

### Chart Selector (`src/services/chartSelector.ts`)

Deterministic rules for chart type selection based on data shape:
- `selectCharts(analyticsData)` - Returns array of `ChartConfig`
- Rules:
  - 2-8 categories → PieChart
  - 7+ categories → BarChart
  - Trends with 3+ points → LineChart
  - 3-8 dimensional comparison → RadarChart
  - Highlights → Trend cards
- `getChartDimensions(type)` - Grid span and min-height for layout

### Data Persistence (`src/services/storage.ts`)

IndexedDB wrapper for large file content:
- `saveSourceContent(sourceId, base64Content)` - Store in IDB
- `loadSourceContent(sourceId)` - Retrieve file data
- `deleteSourceContent(sourceId)` - Clean up storage
- `loadAllSourceContent(ids)` - Batch load on app mount
- `clearAllSourceContent()` - Nuclear option on reset

**Why IndexedDB**:
- localStorage has 5MB limit; files break this easily
- IndexedDB supports ~50MB per origin
- File content survives page reload + browser session
- Separate from session JSON storage

### Secure Storage (`src/services/secureStore.ts`)

API key encryption with optional passphrase:
- `encryptApiKey(apiKey, passphrase?)` - AES-GCM encryption via SubtleCrypto
- `decryptApiKey(encrypted, passphrase?)` - Decryption
- Default: sessionStorage (cleared on tab close)
- Optional: localStorage with passphrase for persistence

**Why encryption**:
- Mitigates XSS attacks reading localStorage directly
- Passphrase adds extra layer of protection
- sessionStorage default means keys are never persisted by default
- User can opt-in to persistence with encryption

## AI Extraction Pipeline

Understanding the end-to-end flow from upload to insights:

```
User Upload
    ↓
[UploadWizard collects: category, platform, inputType, rawContent]
    ↓
SessionContext.addSource()
    ├─ Stores binary file in IndexedDB (images, PDFs)
    └─ Creates UploadedSource with status='uploaded'
    ↓
[Dashboard shows SourceCard with status badge]
    ↓
User clicks "Generate AI Insights"
    ↓
CostEstimateModal.show()
    ├─ Calculates cost based on source types
    └─ Shows estimated time + $ before proceeding
    ↓
User confirms cost → SessionContext.generateInsights()
    ├─ For each source:
    │   ├─ Update source.status → 'processing'
    │   ├─ platformDetector.detectFromFilename/Content(source)
    │   ├─ promptTemplates.selectTemplate(hint)
    │   ├─ contentExtractor.compressImage() or extractTextFromPDF()
    │   ├─ aiService.extractSource(source, config, hint)
    │   │   ├─ buildTemplatePrompt(template)
    │   │   ├─ buildMultimodalContent(source, config.provider)
    │   │   ├─ callProvider(content, model, apiKey)
    │   │   └─ return SourceExtraction (metrics, confidence, cost)
    │   ├─ Update source.status → 'processed' OR 'failed'
    │   └─ [ExtractionProgress shows per-source status]
    │
    ├─ Batch successful extractions
    ├─ aiService.synthesizeAnalytics(extractions, config, year)
    │   ├─ Correlate metrics across sources
    │   ├─ Generate narrative (year-in-review)
    │   ├─ Identify trends and recommendations
    │   └─ return AnalyticsData
    │
    ├─ SessionContext sets analyticsData
    └─ [InsightsDashboard renders with dynamic charts]
```

**Error Handling per Source**:
- Individual source failure doesn't stop pipeline
- Failed source marked with `status='failed'` + `extractionError` message
- User can retry failed source or skip
- Only successfully extracted sources included in synthesis

**Cost Control**:
- Images compressed to max 1536px (reduces vision API cost)
- PDFs attempt text extraction first (cheaper than vision)
- Soft limit: warn if >10 sources or estimated >$0.50
- User sees cost before committing

## Development Workflow

### Adding a New Feature

1. **Component**: Create in `src/components/app/` if app-specific, `src/components/landing/` if marketing
2. **Type**: Add types to `src/types/session.ts` if part of session state
3. **State**: Use `useSession()` hook to access/modify SessionContext
4. **Service**: Extract business logic to `src/services/` if AI or external API involved

### Key Patterns

- **Immutability**: Use spread operator for state updates (SessionContext models this)
- **Error Handling**: Catch errors in `generateInsights()` and display user-friendly messages
- **Validation**: Use Zod for form inputs and API responses
- **Components**: Keep under 300 lines; extract sub-components if needed

### Data Persistence Strategy

**localStorage** (`wrapception_session`):
- Stores session metadata (year, sources list, AI config, analytics)
- Text inputs are fully preserved
- Binary files marked as `[File stored in memory]` (content in IndexedDB)
- Loading state never persisted (always reset to `false`)
- ~5MB limit per origin

**IndexedDB** (`wrapception` database):
- Stores large file content (images, PDFs as base64)
- Per-source key: `{sourceId}`
- Accessed on app mount to restore file content
- ~50MB limit per origin
- Survives localStorage clears

**Why Split**:
- Keeps localStorage small and fast
- Supports large files without quota errors
- Files survive session even if localStorage cleared
- API keys can be encrypted in sessionStorage (cleared on tab close)

**Clearing Data**:
- `resetSession()` clears both localStorage and IndexedDB
- User can manually clear via browser DevTools

## Build & Deployment

- **Dev Server**: Vite on port 8080 with hot reload
- **Build Output**: `dist/` directory (SPA ready for static hosting)
- **Targets**: Vercel, Netlify, GitHub Pages, S3, etc.

Build uses SWC (via `@vitejs/plugin-react-swc`) for fast compilation.

## Git Conventions

Follow [git-workflow.md](~/.claude/rules/common/git-workflow.md):

**Commit Format:**
```
<type>: <description>

<optional body>
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`

**Example:**
```
feat: Add AI insights generation with cross-platform analysis

- Integrate with configured AI provider
- Extract and normalize metrics from uploaded sources
- Generate narrative summary and highlights

Closes #42
```

## Code Quality

- **TypeScript**: Strict mode enabled; use explicit types for public APIs
- **ESLint**: Run `bun run lint` before committing
- **Test Coverage**: Aim for 80%+ (use TDD workflow via tdd-guide agent)
- **Style**: Tailwind for styling; follow shadcn/ui patterns for components

No hardcoded secrets; use environment variables (`process.env.*`) for API keys, endpoints, etc.

## Common Tasks

### Run dev server
```bash
bun run dev
```

### Build production
```bash
bun run build
```

### Check for lint issues
```bash
bun run lint
```

### Add new UI component
```bash
npx shadcn-ui@latest add <component>
```

### Add a new platform template
1. Edit `src/services/promptTemplates.ts`:
   ```typescript
   const myPlatformTemplate: PromptTemplate = {
     id: 'my-platform',
     matches: (hint) => hint.platform === 'my-platform' && hint.confidence >= 0.6,
     category: 'music', // or appropriate category
     instructions: 'Look for: [metric1], [metric2], [specific guidance]',
     exampleOutput: { /* example AnalyticsData shape */ },
     expectedMetrics: ['metric1', 'metric2'],
   };
   ```
2. Add to `TEMPLATES` array in `selectTemplate()`
3. Test with sample data from that platform

### Debug SessionContext & State
```javascript
// In browser console:
localStorage.getItem('wrapception_session') // View session JSON
sessionStorage.keys() // Check for encrypted API key

// IndexedDB inspection:
// DevTools → Application → IndexedDB → wrapception
```

### Debug AI Extraction
1. Set breakpoint in `aiService.ts:extractSource()`
2. Check `SourceExtraction` output: `{ metrics, confidence, detectedPlatform }`
3. Review error messages: `ErrorCode` enum in `errors.ts`
4. Check prompt building: `promptTemplates.buildTemplatePrompt()`

## Documentation

Comprehensive guides are available in `docs/`:

- **[ERRORS.md](docs/ERRORS.md)** - Error handling system, error codes, user messages
- **[TEMPLATES.md](docs/TEMPLATES.md)** - Platform templates, adding new platforms
- **[EXTRACTION.md](docs/EXTRACTION.md)** - AI extraction service, multimodal content, API calling

## Resources

### Framework & Libraries
- **Vite Docs**: https://vitejs.dev/
- **React**: https://react.dev
- **React Router**: https://reactrouter.com/
- **shadcn/ui**: https://ui.shadcn.com/
- **Tailwind CSS**: https://tailwindcss.com/
- **Recharts**: https://recharts.org/

### AI & Data
- **OpenAI API**: https://platform.openai.com/docs
- **Claude API**: https://docs.anthropic.com
- **Google Gemini**: https://ai.google.dev
- **pdfjs**: https://mozilla.github.io/pdf.js/

### Storage & Security
- **Web Storage API**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API
- **IndexedDB**: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- **SubtleCrypto**: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto

---

**Last Updated**: May 2026 (Sprint 2.5 - Mobile & Accessibility)
