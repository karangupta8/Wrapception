import { AnalyticsData, CATEGORY_INFO, Category } from '@/types/session';

export interface ChartConfig {
  id: string;
  type: 'pie' | 'bar' | 'line' | 'radar' | 'trend';
  title: string;
  description?: string;
  data: unknown;
}

export interface PieDatum {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

export interface BarDatum {
  name: string;
  value: number;
  color: string;
}

const KNOWN_CATEGORIES = Object.keys(CATEGORY_INFO) as Category[];

/** Try to resolve any string to a known category (case-insensitive, partial match). */
function resolveCategory(raw: string | undefined): Category | null {
  if (!raw) return null;
  const lower = raw.toLowerCase().trim();
  if (KNOWN_CATEGORIES.includes(lower as Category)) return lower as Category;
  // Common aliases
  const aliases: Record<string, Category> = {
    audio: 'music',
    listening: 'music',
    songs: 'music',
    health: 'fitness',
    workout: 'fitness',
    running: 'fitness',
    books: 'reading',
    learning: 'reading',
    film: 'movies',
    tv: 'movies',
    coding: 'work',
    github: 'work',
    productivity: 'productivity',
  };
  if (aliases[lower]) return aliases[lower];
  for (const alias of Object.keys(aliases)) {
    if (lower.includes(alias)) return aliases[alias];
  }
  return null;
}

function categoryLabel(raw: string): string {
  const known = resolveCategory(raw);
  if (known) return CATEGORY_INFO[known].label;
  // Capitalize first letter of unknown categories
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function categoryColor(raw: string, fallbackIndex: number): string {
  const known = resolveCategory(raw);
  if (known) return CATEGORY_INFO[known].color;
  const palette = [
    'hsl(280 60% 60%)',
    'hsl(0 70% 60%)',
    'hsl(45 80% 55%)',
    'hsl(200 70% 55%)',
    'hsl(160 60% 45%)',
    'hsl(35 90% 55%)',
    'hsl(220 20% 50%)',
    'hsl(320 50% 60%)',
    'hsl(110 50% 50%)',
    'hsl(250 60% 65%)',
  ];
  return palette[fallbackIndex % palette.length];
}

export function selectCharts(data: AnalyticsData): ChartConfig[] {
  const charts: ChartConfig[] = [];

  // Category distribution chart intentionally omitted — AI categoryBreakdown
  // is too unreliable (often returns regions, topics, or non-categories).
  // The Category Insights section handles known categories with proper labels.

  // Trend velocity bar — show direction-aware percentChange when available
  const trendsWithChange = (data.trends || []).filter(
    (t) => typeof t.percentChange === 'number' && Number.isFinite(t.percentChange),
  );
  if (trendsWithChange.length >= 2) {
    charts.push({
      id: 'trend-velocity',
      type: 'bar',
      title: 'Year-over-Year Momentum',
      description: 'Where you grew, held steady, or pulled back',
      data: trendsWithChange.map((t, idx) => ({
        name: t.label,
        value: t.direction === 'down' ? -Math.abs(t.percentChange!) : Math.abs(t.percentChange!),
        color: categoryColor(t.category ?? '', idx),
      })) as BarDatum[],
    });
  }

  return charts;
}

export function getChartDimensions(type: ChartConfig['type']): {
  colSpan: 1 | 2 | 3;
  minHeight: string;
} {
  switch (type) {
    case 'pie':
      return { colSpan: 1, minHeight: '320px' };
    case 'radar':
      return { colSpan: 1, minHeight: '350px' };
    case 'line':
      return { colSpan: 2, minHeight: '300px' };
    case 'bar':
      return { colSpan: 2, minHeight: '320px' };
    case 'trend':
      return { colSpan: 1, minHeight: '200px' };
    default:
      return { colSpan: 1, minHeight: '250px' };
  }
}

export { resolveCategory, categoryLabel, categoryColor };
