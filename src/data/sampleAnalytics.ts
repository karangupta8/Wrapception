import { AnalyticsData, Highlight, Trend, CategoryStats } from '@/types/session';

export const SAMPLE_ANALYTICS_DATA: AnalyticsData = {
  generatedAt: new Date(),
  yearSummary: 'Your 2025 was defined by a healthy blend of entertainment, fitness, and creative work. You streamed 847 songs across all platforms while maintaining a consistent gym routine and contributing significantly to open-source projects. Reading and learning were secondary but meaningful pursuits.',
  highlights: [
    {
      id: '1',
      title: 'Music Discovery Champion',
      description: 'You explored 312 unique artists across Spotify, discovering 128 new artists this year. Your top genre evolved from indie rock to synthwave mid-year.',
      category: 'music',
      sourceIds: ['demo-spotify'],
    },
    {
      id: '2',
      title: 'Fitness Milestone Achieved',
      description: '156 workouts completed with 847 km total distance. Your longest run was 21.3 km. Average weekly distance increased 34% from Q1 to Q4.',
      category: 'fitness',
      sourceIds: ['demo-strava'],
    },
    {
      id: '3',
      title: 'Open Source Contributor',
      description: '847 commits across 12 repositories. Most active in TypeScript and Python. You helped 34 new contributors get started.',
      category: 'work',
      sourceIds: ['demo-github'],
    },
    {
      id: '4',
      title: 'Literary Explorer',
      description: 'You finished 18 books this year, averaging 312 pages per month. Fiction dominated 67% of your reads.',
      category: 'reading',
      sourceIds: ['demo-goodreads'],
    },
  ],
  trends: [
    {
      id: 't1',
      title: 'Fitness Progression',
      description: 'Weekly running distance steadily increased from 8 km average in Jan to 24 km in Dec',
      metric: 'Weekly Distance (km)',
      dataPoints: [
        { label: 'Jan', value: 8 },
        { label: 'Feb', value: 9 },
        { label: 'Mar', value: 11 },
        { label: 'Apr', value: 13 },
        { label: 'May', value: 15 },
        { label: 'Jun', value: 18 },
        { label: 'Jul', value: 20 },
        { label: 'Aug', value: 21 },
        { label: 'Sep', value: 22 },
        { label: 'Oct', value: 23 },
        { label: 'Nov', value: 24 },
        { label: 'Dec', value: 24 },
      ],
    },
  ],
  categoryStats: [
    {
      category: 'music',
      label: 'Music & Audio',
      count: 312,
      unit: 'unique artists',
      percentage: 35,
    },
    {
      category: 'fitness',
      label: 'Fitness & Health',
      count: 156,
      unit: 'workouts',
      percentage: 28,
    },
    {
      category: 'work',
      label: 'Work / Coding / AI',
      count: 847,
      unit: 'commits',
      percentage: 22,
    },
    {
      category: 'reading',
      label: 'Reading & Learning',
      count: 18,
      unit: 'books',
      percentage: 15,
    },
  ],
  metrics: [
    {
      id: 'm1',
      label: 'Top Artist',
      value: 'The 1975',
      category: 'music',
      sourceId: 'demo-spotify',
    },
    {
      id: 'm2',
      label: 'Streams This Year',
      value: '1,247',
      category: 'music',
      sourceId: 'demo-spotify',
    },
    {
      id: 'm3',
      label: 'Longest Run',
      value: '21.3 km',
      category: 'fitness',
      sourceId: 'demo-strava',
    },
    {
      id: 'm4',
      label: 'Total Distance',
      value: '847 km',
      category: 'fitness',
      sourceId: 'demo-strava',
    },
    {
      id: 'm5',
      label: 'Most Active Repo',
      value: 'claude-code',
      category: 'work',
      sourceId: 'demo-github',
    },
    {
      id: 'm6',
      label: 'Top Language',
      value: 'TypeScript',
      category: 'work',
      sourceId: 'demo-github',
    },
    {
      id: 'm7',
      label: 'Books Read',
      value: '18',
      category: 'reading',
      sourceId: 'demo-goodreads',
    },
    {
      id: 'm8',
      label: 'Favorite Genre',
      value: 'Science Fiction',
      category: 'reading',
      sourceId: 'demo-goodreads',
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
