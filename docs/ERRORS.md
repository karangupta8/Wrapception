# Error Handling Guide

## Overview

Wrapception uses a typed error system that maps specific error codes to user-friendly messages and recovery actions. This guide explains how to understand, debug, and extend error handling.

## Error System Architecture

### ErrorCode Enum

Defined in `src/services/errors.ts`, error codes are categorized by severity:

**Configuration Errors:**
- `AI_NOT_ENABLED` - User hasn't enabled AI
- `NO_API_KEY` - API key not provided
- `PROVIDER_NOT_VISION` - Selected provider doesn't support vision (image upload)

**Authentication Errors:**
- `AI_API_UNAUTHORIZED` - API key invalid or expired
- `AI_API_RATE_LIMIT` - Too many requests to AI provider

**Server Errors:**
- `AI_API_SERVER_ERROR` - Provider returned 5xx error
- `AI_API_NETWORK` - Network failure (timeout, connection refused)
- `AI_API_TIMEOUT` - Request took too long

**Response Errors:**
- `AI_RESPONSE_INVALID` - Provider returned invalid JSON or unexpected format

**Data Errors:**
- `PDF_PARSE_FAILED` - PDF extraction couldn't extract text
- `IMAGE_TOO_LARGE` - Image exceeds size limit before compression
- `COST_LIMIT_EXCEEDED` - Estimated cost exceeds user's soft limit

## User-Facing Error Messages

The `AIErrorAlert` component renders rich error UI:

```typescript
// Example: User sees this when API key is invalid
<AIErrorAlert
  code="AI_API_UNAUTHORIZED"
  rawMessage="Invalid API key for model gpt-4o-mini"
  onRetry={handleRetry}
  onDismiss={handleDismiss}
/>
```

Displays:
- **Icon**: Red alert circle
- **Title**: "Authentication Failed"
- **Description**: "Your API key is invalid or has expired"
- **Action**: "Update API Key" button linking to AIConfigPanel
- **Details**: Collapsible raw error message for debugging

## Per-Source Failure Isolation

Key behavior: **One failed source doesn't stop the pipeline**

In `SessionContext.generateInsights()`:
```typescript
for (const source of uploadedSources) {
  try {
    const extraction = await extractSource(source, ...);
    // Success: mark as 'processed'
  } catch (sourceErr) {
    const wrapped = toWrapceptionError(sourceErr);
    // Failure: mark as 'failed' with error message
    if (isFatal(wrapped)) throw; // Auth/config errors are fatal
  }
}
```

**Recoverable (per-source failure):**
- PDF parse failed → User can retry just that source
- Image too large → Compress and retry
- Low confidence extraction → User can edit metrics

**Fatal (stop pipeline):**
- No API key → Can't continue
- API key unauthorized → All sources will fail
- Provider not vision-capable but image uploaded → Can't continue

## Adding New Error Codes

1. **Add to enum** in `src/services/errors.ts`:
   ```typescript
   export type ErrorCode = 
     | 'MY_NEW_ERROR'
     | /* existing codes */
   ```

2. **Map to user message** in `getErrorDetail()`:
   ```typescript
   case 'MY_NEW_ERROR':
     return {
       title: 'Friendly Title',
       description: 'What happened and why',
       action: 'Suggested user action',
       severity: 'error' | 'warning' | 'info',
     };
   ```

3. **Throw in service**:
   ```typescript
   if (badCondition) {
     throw new WrapceptionError(
       'Technical details for logs',
       'MY_NEW_ERROR',
       'error' // severity
     );
   }
   ```

4. **Handle in UI**:
   - `Dashboard.tsx` shows `AIErrorAlert` if `insightsError` is set
   - Per-source errors shown in `SourceCard` with inline message

## Common Error Scenarios

### Scenario: "Invalid API Key"
1. User enters wrong key or copy-paste error
2. `callOpenAIFormat()` gets 401 response
3. Wrapped as `WrapceptionError(..., 'AI_API_UNAUTHORIZED')`
4. `generateInsights()` catches, throws to context
5. `Dashboard` shows `AIErrorAlert` with "Update API Key" action
6. User clicks action → Focus moves to `AIConfigPanel`

### Scenario: "PDF won't extract"
1. Scanned PDF (image-only, no text)
2. `contentExtractor.extractTextFromPDF()` returns empty string
3. Throws `WrapceptionError(..., 'PDF_PARSE_FAILED')`
4. Source marked `status='failed'`, `extractionError='...'`
5. `ExtractionValidationPanel` shows error message
6. User can:
   - Retry (fallback to image rendering)
   - Skip source (extract only processed sources)
   - Edit manually (if vision API supports it)

### Scenario: "Network timeout"
1. User on slow connection or provider down
2. Fetch timeout (no response for 30s)
3. Wrapped as `WrapceptionError(..., 'AI_API_TIMEOUT')`
4. Per-source: mark as failed
5. User sees error with "Retry" button
6. Clicking retry tries the same source again

## Testing Error Paths

### Unit Testing
```typescript
import { toWrapceptionError, WrapceptionError } from '@/services/errors';

test('unknown error gets mapped', () => {
  const err = new Error('Random error');
  const wrapped = toWrapceptionError(err);
  expect(wrapped.code).toBe('UNKNOWN');
});

test('WrapceptionError preserves code', () => {
  const err = new WrapceptionError('msg', 'NO_API_KEY');
  expect(err.code).toBe('NO_API_KEY');
});
```

### Manual Testing
1. Disable API key in AIConfigPanel
2. Try to generate insights
3. Should show `AI_NOT_ENABLED` error
4. Click "Enable AI" in error card
5. Should navigate to config panel

## Debugging Tips

1. **Check browser console** for full stack traces
2. **Look at `insightsError` + `insightsErrorCode`** in React DevTools
3. **Review per-source `extractionError`** in SourceCard/ValidationPanel
4. **Check network tab** for actual API responses
5. **Use `logger` service** (future Sprint 3) to trace extraction flow

## Related Files

- Implementation: `src/services/errors.ts`
- UI display: `src/components/app/AIErrorAlert.tsx`
- Integration: `src/context/SessionContext.tsx` (generateInsights)
- Per-source: `src/components/app/SourceCard.tsx` (shows extractionError)
