export type ErrorCode =
  | 'AI_NOT_ENABLED'
  | 'NO_API_KEY'
  | 'NO_SOURCES'
  | 'PROVIDER_NOT_VISION'
  | 'AI_API_UNAUTHORIZED'
  | 'AI_API_RATE_LIMIT'
  | 'AI_API_SERVER_ERROR'
  | 'AI_API_NETWORK'
  | 'AI_API_TIMEOUT'
  | 'AI_RESPONSE_INVALID'
  | 'AI_RESPONSE_INVALID_JSON'
  | 'PDF_PARSE_FAILED'
  | 'TOKEN_BUDGET_EXCEEDED'
  | 'SYNTHESIS_NO_DATA'
  | 'EXTRACTION_ALL_FAILED'
  | 'UNKNOWN';

export interface ErrorDetail {
  title: string;
  description: string;
  /** Short label for the action button. Omit if no action needed. */
  action?: string;
  /** Which UI element to scroll into view when action clicked. */
  actionTarget?: 'ai-config' | 'upload';
}

export class WrapceptionError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly recoverable: boolean = true,
  ) {
    super(message);
    this.name = 'WrapceptionError';
  }
}

const ERROR_DETAILS: Record<ErrorCode, ErrorDetail> = {
  AI_NOT_ENABLED: {
    title: 'AI not enabled',
    description: 'Enable AI processing in the configuration panel and add your API key.',
    action: 'Open AI Config',
    actionTarget: 'ai-config',
  },
  NO_API_KEY: {
    title: 'API key missing',
    description: 'Your API key is empty. Open AI Configuration and paste your key.',
    action: 'Open AI Config',
    actionTarget: 'ai-config',
  },
  NO_SOURCES: {
    title: 'No wraps uploaded',
    description: 'Upload at least one wrapped screenshot, PDF, or text before generating insights.',
    action: 'Upload a wrap',
    actionTarget: 'upload',
  },
  PROVIDER_NOT_VISION: {
    title: 'Provider cannot analyse images',
    description:
      'Your current AI provider does not support image input. Switch to OpenAI GPT-4o, Google Gemini, or Anthropic Claude 3+ — or paste your wrap data as text.',
    action: 'Open AI Config',
    actionTarget: 'ai-config',
  },
  AI_API_UNAUTHORIZED: {
    title: 'Invalid API key (401)',
    description:
      'The AI provider rejected your key. Double-check it for typos and make sure it has the correct permissions.',
    action: 'Open AI Config',
    actionTarget: 'ai-config',
  },
  AI_API_RATE_LIMIT: {
    title: 'Rate limit reached (429)',
    description:
      'You have hit your API rate limit. Wait a minute and try again, or check your usage quota on the provider dashboard.',
  },
  AI_API_SERVER_ERROR: {
    title: 'AI provider error (5xx)',
    description:
      'The AI provider returned a server error. This is usually temporary — try again in a moment or switch to a different model.',
  },
  AI_API_NETWORK: {
    title: 'Network error',
    description:
      'Could not reach the AI provider. Check your internet connection and verify the endpoint URL in AI Configuration.',
    action: 'Open AI Config',
    actionTarget: 'ai-config',
  },
  AI_API_TIMEOUT: {
    title: 'Request timed out',
    description:
      'The AI provider took too long to respond. Try again with fewer images, or switch to a faster model (e.g. GPT-4o-mini, Gemini Flash).',
  },
  AI_RESPONSE_INVALID: {
    title: 'Unexpected AI response',
    description:
      'The AI did not return valid data. Try regenerating — if the issue persists, switch models or check your system prompt.',
  },
  AI_RESPONSE_INVALID_JSON: {
    title: 'Invalid data from AI',
    description:
      'The AI response contained invalid metrics. Try again with fewer or simpler sources.',
  },
  PDF_PARSE_FAILED: {
    title: 'Could not read PDF',
    description:
      'Text extraction from this PDF failed. Try exporting it as a PNG image from your app, or copy-paste the text manually.',
    action: 'Upload text instead',
    actionTarget: 'upload',
  },
  TOKEN_BUDGET_EXCEEDED: {
    title: 'Request too large',
    description:
      'Combining all your wraps would exceed the token limit. Remove some sources and try again.',
    action: 'Remove a wrap',
    actionTarget: 'upload',
  },
  SYNTHESIS_NO_DATA: {
    title: 'No data extracted',
    description:
      'All source extractions failed. Check your API key, internet connection, and try again with different sources.',
    action: 'Open AI Config',
    actionTarget: 'ai-config',
  },
  EXTRACTION_ALL_FAILED: {
    title: 'Extraction failed',
    description:
      'All sources failed extraction. Check your API key and try again.',
    action: 'Open AI Config',
    actionTarget: 'ai-config',
  },
  UNKNOWN: {
    title: 'Something went wrong',
    description: 'An unexpected error occurred. Check the browser console for details.',
  },
};

export function getErrorDetail(code: ErrorCode): ErrorDetail {
  return ERROR_DETAILS[code] ?? ERROR_DETAILS.UNKNOWN;
}

/** Classify an HTTP status code into a WrapceptionError. */
export function fromHttpStatus(status: number, bodyText: string, provider: string): WrapceptionError {
  if (status === 401 || status === 403) {
    return new WrapceptionError(
      `${provider}: authentication failed (${status})`,
      'AI_API_UNAUTHORIZED',
    );
  }
  if (status === 429) {
    return new WrapceptionError(`${provider}: rate limited (429)`, 'AI_API_RATE_LIMIT');
  }
  if (status >= 500) {
    return new WrapceptionError(`${provider}: server error (${status})`, 'AI_API_SERVER_ERROR');
  }
  // Attempt to extract a human-readable message from the body
  let detail = bodyText.slice(0, 200);
  try {
    const parsed = JSON.parse(bodyText);
    const msg: string =
      parsed.error?.message || parsed.message || parsed.detail || '';
    if (msg) detail = msg.split('\n')[0].slice(0, 200);
  } catch {
    // ignore
  }
  return new WrapceptionError(`${provider}: ${detail}`, 'UNKNOWN');
}

/** Wrap an unknown thrown value in a WrapceptionError. */
export function toWrapceptionError(err: unknown): WrapceptionError {
  if (err instanceof WrapceptionError) return err;
  if (err instanceof TypeError && err.message.toLowerCase().includes('fetch')) {
    return new WrapceptionError(err.message, 'AI_API_NETWORK');
  }
  if (err instanceof Error) {
    // Heuristic classification from message text
    const msg = err.message.toLowerCase();
    if (msg.includes('timeout') || msg.includes('timed out')) {
      return new WrapceptionError(err.message, 'AI_API_TIMEOUT');
    }
    return new WrapceptionError(err.message, 'UNKNOWN');
  }
  return new WrapceptionError(String(err), 'UNKNOWN');
}
