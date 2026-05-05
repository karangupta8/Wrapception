import { AnalyticsData } from '@/types/session';

export const SAMPLE_ANALYTICS_DATA: AnalyticsData = {
  generatedAt: new Date(),
  yearSummary: 'Your 2025 was defined by a healthy blend of entertainment, fitness, and creative work. You streamed 847 songs across all platforms while maintaining a consistent gym routine and contributing significantly to open-source projects. Reading and learning were secondary but meaningful pursuits.',
  highlights: [
    {
      id: '1',
      title: 'Music Discovery Champion',
      description: 'You explored 312 unique artists across Spotify, discovering 128 new artists this year. Your top genre evolved from indie rock to synthwave mid-year.',
      category: 'music',
    },
    {
      id: '2',
      title: 'Fitness Milestone Achieved',
      description: '156 workouts completed with 847 km total distance. Your longest run was 21.3 km. Average weekly distance increased 34% from Q1 to Q4.',
      category: 'fitness',
    },
    {
      id: '3',
      title: 'Open Source Contributor',
      description: '847 commits across 12 repositories. Most active in TypeScript and Python. You helped 34 new contributors get started.',
      category: 'work',
    },
    {
      id: '4',
      title: 'Literary Explorer',
      description: 'You finished 18 books this year, averaging 312 pages per month. Fiction dominated 67% of your reads.',
      category: 'reading',
    },
  ],
  trends: [
    {
      label: 'Fitness Progression',
      direction: 'up' as const,
      value: '24 km/week average',
      percentChange: 200,
      category: 'fitness',
    },
    {
      label: 'Music Listening',
      direction: 'stable' as const,
      value: '847 streams',
      category: 'music',
    },
    {
      label: 'Reading Consistency',
      direction: 'up' as const,
      value: '18 books',
      percentChange: 45,
      category: 'reading',
    },
  ],
  categoryBreakdown: [
    {
      category: 'music',
      count: 312,
      topPlatform: 'Spotify',
      keyMetric: '847 streams',
      insight: 'You explored 312 unique artists, shifting from indie rock to synthwave mid-year.',
    },
    {
      category: 'fitness',
      count: 156,
      topPlatform: 'Strava',
      keyMetric: '847 km',
      insight: 'Your running discipline increased 200% from Jan to Dec, averaging 24 km per week.',
    },
    {
      category: 'work',
      count: 847,
      topPlatform: 'GitHub',
      keyMetric: '12 repos',
      insight: 'Maintained an active contribution streak with 847 commits across TypeScript and Python.',
    },
    {
      category: 'reading',
      count: 18,
      topPlatform: 'Goodreads',
      keyMetric: '5,616 pages',
      insight: 'You completed 18 books with an average rating of 3.8/5, favoring science fiction.',
    },
  ],
  metrics: [
    {
      name: 'Top Artist',
      value: 'The 1975',
      category: 'music',
      platform: 'Spotify',
    },
    {
      name: 'Total Streams',
      value: 1247,
      unit: 'streams',
      category: 'music',
      platform: 'Spotify',
    },
    {
      name: 'Longest Run',
      value: '21.3 km',
      category: 'fitness',
      platform: 'Strava',
    },
    {
      name: 'Total Distance',
      value: 847,
      unit: 'km',
      category: 'fitness',
      platform: 'Strava',
    },
    {
      name: 'Most Active Repository',
      value: 'claude-code',
      category: 'work',
      platform: 'GitHub',
    },
    {
      name: 'Top Language',
      value: 'TypeScript',
      category: 'work',
      platform: 'GitHub',
    },
    {
      name: 'Books Completed',
      value: 18,
      category: 'reading',
      platform: 'Goodreads',
    },
    {
      name: 'Favorite Genre',
      value: 'Science Fiction',
      category: 'reading',
      platform: 'Goodreads',
    },
  ],
  recommendations: [
    'Your fitness discipline is impressive — consider training for a half marathon in 2026',
    'You gravitated toward synthwave this year — explore similar artists in the synthpop and electronic genres',
    'Open source contributions spiked in Q3 — that momentum could sustain a 1000+ commit year in 2026',
  ],
};

export const SAMPLE_SOURCES = [
  {
    id: 'demo-spotify',
    category: 'music' as const,
    platformName: 'Spotify Wrapped',
    inputType: 'image' as const,
    rawContent: '[Sample image data - Spotify Wrapped screenshot]',
    fileName: 'spotify-wrapped-2025.png',
    notes: 'Your annual Spotify summary with streaming stats',
    createdAt: new Date(),
    status: 'processed' as const,
  },
  {
    id: 'demo-strava',
    category: 'fitness' as const,
    platformName: 'Strava Year Summary',
    inputType: 'pdf' as const,
    rawContent: '[Sample PDF data - Strava annual report]',
    fileName: 'strava-2025-summary.pdf',
    notes: 'Running and cycling distance, pace, elevation',
    createdAt: new Date(),
    status: 'processed' as const,
  },
  {
    id: 'demo-github',
    category: 'work' as const,
    platformName: 'GitHub Contributions',
    inputType: 'text' as const,
    rawContent: `GitHub Contribution Summary 2025:
Total commits: 847
Repositories: 12
Languages: TypeScript (45%), Python (28%), Go (15%), Other (12%)
Top repository: claude-code with 234 commits
Collaborators helped: 34
Pull requests reviewed: 156
Issues opened: 45
Issues closed: 67
Most active month: September with 98 commits
Contribution streak: 156 days
Stars received: 42`,
    notes: 'Auto-exported from GitHub API',
    createdAt: new Date(),
    status: 'processed' as const,
  },
  {
    id: 'demo-goodreads',
    category: 'reading' as const,
    platformName: 'Goodreads Year in Books',
    inputType: 'text' as const,
    rawContent: `Goodreads 2025 Reading Summary:
Books read: 18
Pages read: 5,616
Average rating: 3.8/5
Fiction: 12 books (67%)
Non-fiction: 6 books (33%)
Top genres: Science Fiction, Fantasy, Mystery
Highest rated: "The Three-Body Problem" (5 stars)
Lowest rated: "Ready Player Two" (2 stars)
Average pages per book: 312
Longest book: 687 pages
Shortest book: 156 pages
DNF (Did Not Finish): 2 books`,
    notes: 'Your reading accomplishments this year',
    createdAt: new Date(),
    status: 'processed' as const,
  },
];
