import type { Category } from '@/types/session';
import type { PlatformHint } from './platformDetector';

export interface PromptTemplate {
  id: string;
  name: string;
  category: Category;
  /** Matches function — returns true if this template should handle the hint */
  matches: (hint: PlatformHint) => boolean;
  /** Additional extraction instructions appended to the base system prompt */
  instructions: string;
  /** Metric names the AI should look for — used for validation & chart selection */
  expectedMetrics: string[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function platformIs(names: string[]) {
  return (hint: PlatformHint) =>
    hint.platform !== null &&
    names.some((n) => hint.platform!.toLowerCase().includes(n.toLowerCase()));
}

// ─── Templates ──────────────────────────────────────────────────────────────

export const TEMPLATES: PromptTemplate[] = [
  // ── SPOTIFY ─────────────────────────────────────────────────────────────
  {
    id: 'spotify',
    name: 'Spotify Wrapped',
    category: 'music',
    matches: platformIs(['spotify']),
    instructions: `
This is a Spotify Wrapped summary. Look specifically for:
- Total minutes streamed (or hours)
- Total streams / songs played
- Top 5 artists (in order)
- Top 5 songs (in order)
- Top genre or genres
- Listening personality / audio aura description (if present)
- Top podcast (if present)
- "Top X%" listener badge for any artist
- Daylist moods or listening patterns
- Country or global ranking
Extract exact artist names, song titles, and numbers as they appear. Do not invent missing data.`,
    expectedMetrics: ['minutes streamed', 'top artist', 'top song', 'top genre', 'streams'],
  },

  // ── APPLE MUSIC ─────────────────────────────────────────────────────────
  {
    id: 'apple-music',
    name: 'Apple Music Replay',
    category: 'music',
    matches: platformIs(['apple music', 'apple music replay']),
    instructions: `
This is an Apple Music Replay summary. Look for:
- Total listening hours
- Top artist(s) with play counts
- Top albums and songs with play counts
- Top genres
- Days/months with highest listening
Extract exact numbers and artist/song names.`,
    expectedMetrics: ['listening hours', 'top artist', 'top song', 'top album', 'play count'],
  },

  // ── YOUTUBE / YOUTUBE MUSIC ─────────────────────────────────────────────
  {
    id: 'youtube',
    name: 'YouTube Recap',
    category: 'movies',
    matches: platformIs(['youtube']),
    instructions: `
This is a YouTube or YouTube Music recap. Look for:
- Total watch time (hours/days)
- Top videos or creators watched
- Most-watched categories
- Total videos watched count
- Subscriptions added
- Comments posted
- Liked videos count
Extract actual numbers and creator/video names.`,
    expectedMetrics: ['watch hours', 'top creator', 'videos watched', 'top category'],
  },

  // ── STRAVA ──────────────────────────────────────────────────────────────
  {
    id: 'strava',
    name: 'Strava Year in Sport',
    category: 'fitness',
    matches: platformIs(['strava']),
    instructions: `
This is a Strava Year in Sport summary. Look for:
- Total distance (km or miles — note the unit)
- Total elevation gain (m or ft)
- Total moving time (hours)
- Total number of activities
- Activity type breakdown (runs, rides, swims, walks, etc.)
- Longest single activity
- Most active month
- Personal records (PRs) set
- Kudos received
- Total followers/following gained
Extract exact numbers and preserve units.`,
    expectedMetrics: ['total distance', 'elevation gain', 'total activities', 'moving time', 'longest activity'],
  },

  // ── GARMIN ──────────────────────────────────────────────────────────────
  {
    id: 'garmin',
    name: 'Garmin Year in Review',
    category: 'fitness',
    matches: platformIs(['garmin']),
    instructions: `
This is a Garmin Year in Review. Look for:
- Total steps
- Total distance
- Active minutes
- Sleep averages
- Heart rate data (resting, max)
- Body Battery data
- Stress score data
- Activities completed
Extract exact numbers.`,
    expectedMetrics: ['total steps', 'total distance', 'active minutes', 'sleep hours'],
  },

  // ── GOODREADS ───────────────────────────────────────────────────────────
  {
    id: 'goodreads',
    name: 'Goodreads Year in Review',
    category: 'reading',
    matches: platformIs(['goodreads']),
    instructions: `
This is a Goodreads Year in Review. Look for:
- Total books read
- Total pages read
- Average rating given
- Top-rated book
- Shortest and longest book
- Genres read
- Reading challenge goal vs. actual
- Most-read author
Extract exact counts, titles, and author names.`,
    expectedMetrics: ['books read', 'pages read', 'average rating', 'reading goal'],
  },

  // ── DUOLINGO ────────────────────────────────────────────────────────────
  {
    id: 'duolingo',
    name: 'Duolingo Year in Review',
    category: 'reading',
    matches: platformIs(['duolingo']),
    instructions: `
This is a Duolingo Year in Review. Look for:
- Day streak (current and longest)
- Total XP earned
- Lessons completed
- Languages studied
- League placement or ranking
- Minutes/hours studied
- Words learned
Extract exact numbers.`,
    expectedMetrics: ['day streak', 'total XP', 'lessons completed', 'languages studied'],
  },

  // ── LETTERBOXD ──────────────────────────────────────────────────────────
  {
    id: 'letterboxd',
    name: 'Letterboxd Year in Review',
    category: 'movies',
    matches: platformIs(['letterboxd']),
    instructions: `
This is a Letterboxd Year in Review. Look for:
- Total films logged
- Total hours watched
- Average rating
- Top genres
- Favorite films (by rating or most logged)
- Directors watched
- Countries of origin
- Oldest and newest film watched
- Films with 5-star ratings
Extract exact film titles, director names, and numbers.`,
    expectedMetrics: ['films logged', 'hours watched', 'average rating', 'top genre'],
  },

  // ── GITHUB ──────────────────────────────────────────────────────────────
  {
    id: 'github',
    name: 'GitHub Year',
    category: 'work',
    matches: platformIs(['github']),
    instructions: `
This is a GitHub contributions or year in review summary. Look for:
- Total contributions (commits + PRs + issues + reviews)
- Commits count
- Pull requests opened and merged
- Issues opened
- Code reviews
- Repositories created or contributed to
- Top programming languages
- Longest streak (days)
- Stars earned on projects
Extract exact numbers and language names.`,
    expectedMetrics: ['total contributions', 'commits', 'pull requests', 'top language', 'streak days'],
  },

  // ── LINKEDIN ────────────────────────────────────────────────────────────
  {
    id: 'linkedin',
    name: 'LinkedIn Year in Review',
    category: 'work',
    matches: platformIs(['linkedin']),
    instructions: `
This is a LinkedIn Year in Review or profile stats page. Look for:
- Profile views count
- Post impressions
- Search appearances
- New connections count
- Reactions received on posts
- Comments received
- Job applications or views
Extract exact numbers.`,
    expectedMetrics: ['profile views', 'post impressions', 'new connections', 'search appearances'],
  },

  // ── GENERIC (always matches as last resort) ────────────────────────────
  {
    id: 'generic',
    name: 'Generic Wrap',
    category: 'other',
    matches: () => true,
    instructions: `
This is a year-in-review wrapped summary from a digital service. Extract everything you can see:
- Any statistics, counts, or numbers
- Top items (songs, articles, activities, etc.)
- Rankings or percentages
- Time-based metrics (hours, minutes, days)
- Streak data
- Achievement or milestone badges
- Any text labels paired with numbers
Be thorough — capture every metric visible, even if you are not sure what platform it is from.`,
    expectedMetrics: [],
  },
];

export function selectTemplate(hint: PlatformHint): PromptTemplate {
  for (const template of TEMPLATES) {
    if (template.id !== 'generic' && template.matches(hint)) {
      return template;
    }
  }
  return TEMPLATES[TEMPLATES.length - 1]; // generic fallback
}

export function buildTemplatePrompt(template: PromptTemplate): string {
  return `You are an analytics expert extracting structured data from a personal year-in-review "Wrapped" summary.

Platform: ${template.name}
${template.instructions}

CRITICAL rules:
- Extract ONLY metrics ACTUALLY visible in the provided content (image, text, or PDF).
- Do NOT hallucinate or invent any numbers, names, or statistics.
- If a value is not clearly visible or readable, omit it or note it as unclear.
- Preserve exact numbers (e.g. "52,384 minutes", not "about 52K minutes").
- Keep the tone positive and celebratory.

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "yearSummary": "2-3 sentence engaging narrative from the ACTUAL data",
  "highlights": [
    { "id": "h1", "title": "...", "description": "...", "category": "${template.category}", "metric": "exact value if present" }
  ],
  "metrics": [
    { "name": "metric name", "value": 1234, "unit": "hours|songs|books|miles|etc", "category": "${template.category}", "platform": "${template.name}" }
  ],
  "trends": [
    { "label": "trend description", "direction": "up|down|stable", "value": "description", "percentChange": null, "category": "${template.category}" }
  ],
  "categoryBreakdown": [
    { "category": "${template.category}", "count": 1, "topPlatform": "${template.name}", "keyMetric": "main stat", "insight": "short insight" }
  ],
  "recommendations": ["suggestion based on actual data"]
}`;
}
