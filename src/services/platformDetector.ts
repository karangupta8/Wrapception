import type { Category } from '@/types/session';

export interface PlatformHint {
  platform: string | null;
  category: Category | null;
  confidence: 'high' | 'medium' | 'low';
  source: 'filename' | 'content' | 'user';
}

const NO_MATCH: PlatformHint = {
  platform: null,
  category: null,
  confidence: 'low',
  source: 'filename',
};

interface PatternEntry {
  pattern: RegExp;
  platform: string;
  category: Category;
}

// All known filename patterns. Order matters — first match wins.
const PLATFORM_PATTERNS: PatternEntry[] = [
  // Music
  { pattern: /spotify/i, platform: 'Spotify', category: 'music' },
  { pattern: /apple.?music|replay/i, platform: 'Apple Music', category: 'music' },
  { pattern: /youtube.?music/i, platform: 'YouTube Music', category: 'music' },
  { pattern: /soundcloud/i, platform: 'SoundCloud', category: 'music' },
  { pattern: /tidal/i, platform: 'Tidal', category: 'music' },
  { pattern: /deezer/i, platform: 'Deezer', category: 'music' },
  { pattern: /last\.?fm/i, platform: 'Last.fm', category: 'music' },

  // Fitness
  { pattern: /strava/i, platform: 'Strava', category: 'fitness' },
  { pattern: /garmin/i, platform: 'Garmin', category: 'fitness' },
  { pattern: /peloton/i, platform: 'Peloton', category: 'fitness' },
  { pattern: /nike.?run/i, platform: 'Nike Run Club', category: 'fitness' },
  { pattern: /apple.?fitness|activity/i, platform: 'Apple Fitness', category: 'fitness' },
  { pattern: /whoop/i, platform: 'Whoop', category: 'fitness' },
  { pattern: /oura/i, platform: 'Oura', category: 'fitness' },

  // Reading
  { pattern: /goodreads/i, platform: 'Goodreads', category: 'reading' },
  { pattern: /storygraph/i, platform: 'StoryGraph', category: 'reading' },
  { pattern: /kindle/i, platform: 'Kindle', category: 'reading' },
  { pattern: /audible/i, platform: 'Audible', category: 'reading' },
  { pattern: /pocket/i, platform: 'Pocket', category: 'reading' },
  { pattern: /kobo/i, platform: 'Kobo', category: 'reading' },
  { pattern: /libby/i, platform: 'Libby', category: 'reading' },
  { pattern: /duolingo/i, platform: 'Duolingo', category: 'reading' },

  // Movies & TV
  { pattern: /letterboxd/i, platform: 'Letterboxd', category: 'movies' },
  { pattern: /trakt/i, platform: 'Trakt', category: 'movies' },
  { pattern: /netflix/i, platform: 'Netflix', category: 'movies' },
  { pattern: /imdb/i, platform: 'IMDb', category: 'movies' },
  { pattern: /plex/i, platform: 'Plex', category: 'movies' },
  { pattern: /reelgood/i, platform: 'Reelgood', category: 'movies' },

  // Work / Coding
  { pattern: /github/i, platform: 'GitHub', category: 'work' },
  { pattern: /gitlab/i, platform: 'GitLab', category: 'work' },
  { pattern: /chatgpt|openai/i, platform: 'ChatGPT', category: 'work' },
  { pattern: /cursor/i, platform: 'Cursor', category: 'work' },
  { pattern: /copilot/i, platform: 'GitHub Copilot', category: 'work' },
  { pattern: /wakatime/i, platform: 'WakaTime', category: 'work' },
  { pattern: /linear/i, platform: 'Linear', category: 'work' },

  // Productivity
  { pattern: /notion/i, platform: 'Notion', category: 'productivity' },
  { pattern: /todoist/i, platform: 'Todoist', category: 'productivity' },
  { pattern: /obsidian/i, platform: 'Obsidian', category: 'productivity' },
  { pattern: /things/i, platform: 'Things 3', category: 'productivity' },
  { pattern: /raycast/i, platform: 'Raycast', category: 'productivity' },
  { pattern: /rescuetime/i, platform: 'RescueTime', category: 'productivity' },
  { pattern: /toggl/i, platform: 'Toggl', category: 'productivity' },
];

// Keyword scan of raw text content for platforms
const CONTENT_KEYWORDS: PatternEntry[] = [
  { pattern: /spotify wrapped|top artist|minutes streamed|streaming/i, platform: 'Spotify', category: 'music' },
  { pattern: /apple music replay/i, platform: 'Apple Music', category: 'music' },
  { pattern: /strava.*year|year.*sport|miles run|elevation gain/i, platform: 'Strava', category: 'fitness' },
  { pattern: /goodreads.*read|books you read|pages read/i, platform: 'Goodreads', category: 'reading' },
  { pattern: /github.*contributions|contribution graph/i, platform: 'GitHub', category: 'work' },
  { pattern: /letterboxd.*films|films you logged/i, platform: 'Letterboxd', category: 'movies' },
  { pattern: /duolingo.*streak|day streak|XP earned/i, platform: 'Duolingo', category: 'reading' },
  { pattern: /youtube.*watch.*hours|hours.*watched/i, platform: 'YouTube', category: 'movies' },
];

/** Detect platform from a filename string. */
export function detectFromFilename(fileName: string): PlatformHint {
  const name = fileName.toLowerCase();
  for (const entry of PLATFORM_PATTERNS) {
    if (entry.pattern.test(name)) {
      return {
        platform: entry.platform,
        category: entry.category,
        confidence: 'high',
        source: 'filename',
      };
    }
  }
  return { ...NO_MATCH };
}

/** Detect platform from raw text content (text-type sources). */
export function detectFromContent(content: string): PlatformHint {
  for (const entry of CONTENT_KEYWORDS) {
    if (entry.pattern.test(content)) {
      return {
        platform: entry.platform,
        category: entry.category,
        confidence: 'medium',
        source: 'content',
      };
    }
  }
  return { ...NO_MATCH, source: 'content' };
}

/** Merge multiple hints, preferring higher confidence. */
export function mergeHints(...hints: PlatformHint[]): PlatformHint {
  const ranked: Record<string, number> = { high: 3, medium: 2, low: 1 };
  return hints.reduce((best, current) =>
    ranked[current.confidence] > ranked[best.confidence] ? current : best
  );
}

/** All known platform names (for autocomplete). */
export const ALL_PLATFORMS = PLATFORM_PATTERNS.map((p) => p.platform);
