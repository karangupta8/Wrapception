import { AnalyticsData } from '@/types/session';

export interface ChartConfig {
  id: string;
  type: 'pie' | 'bar' | 'line' | 'radar' | 'trend';
  title: string;
  description?: string;
  data: unknown;
}

export function selectCharts(data: AnalyticsData): ChartConfig[] {
  const charts: ChartConfig[] = [];

  // 1. Category distribution pie chart
  if (data.categoryBreakdown && data.categoryBreakdown.length > 0) {
    const pieData = data.categoryBreakdown.map(stat => ({
      name: stat.category,
      value: stat.count,
    }));

    // Only show pie if we have 2-8 categories
    if (pieData.length >= 2 && pieData.length <= 8) {
      charts.push({
        id: 'category-pie',
        type: 'pie',
        title: 'Distribution by Category',
        description: 'How your year breaks down across categories',
        data: pieData,
      });
    }

    // Show horizontal bar chart for more categories (7+)
    if (pieData.length > 8) {
      charts.push({
        id: 'category-bar',
        type: 'bar',
        title: 'Category Breakdown',
        description: 'Total count by category',
        data: pieData,
      });
    }
  }

  // 2. Trends as trend cards
  if (data.trends && data.trends.length > 0) {
    data.trends.forEach((trend, idx) => {
      charts.push({
        id: `trend-${idx}`,
        type: 'trend',
        title: trend.label,
        description: trend.value,
        data: {
          title: trend.label,
          description: trend.value,
          direction: trend.direction,
          category: trend.category,
        },
      });
    });
  }

  // 3. Highlight cards (shown as trend cards in UI)
  if (data.highlights && data.highlights.length > 0) {
    data.highlights.forEach((highlight, idx) => {
      charts.push({
        id: `highlight-${idx}`,
        type: 'trend',
        title: highlight.title,
        description: highlight.description,
        data: {
          title: highlight.title,
          description: highlight.description,
          category: highlight.category,
        },
      });
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
      return { colSpan: 1, minHeight: '300px' };
    case 'radar':
      return { colSpan: 1, minHeight: '350px' };
    case 'line':
      return { colSpan: 2, minHeight: '300px' };
    case 'bar':
      return { colSpan: 2, minHeight: '300px' };
    case 'trend':
      return { colSpan: 1, minHeight: '200px' };
    default:
      return { colSpan: 1, minHeight: '250px' };
  }
}
