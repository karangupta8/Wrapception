import { AnalyticsData, CategoryStats } from '@/types/session';

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
  if (data.categoryStats && data.categoryStats.length > 0) {
    const pieData = data.categoryStats.map(stat => ({
      name: stat.label,
      value: stat.count,
      percentage: stat.percentage,
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

  // 2. Trends as line charts
  if (data.trends && data.trends.length > 0) {
    data.trends.forEach((trend, idx) => {
      if (trend.dataPoints && trend.dataPoints.length > 2) {
        charts.push({
          id: `trend-line-${idx}`,
          type: 'line',
          title: trend.title,
          description: trend.description,
          data: {
            metric: trend.metric,
            dataPoints: trend.dataPoints,
          },
        });
      }
    });
  }

  // 3. Radar chart for multi-dimensional comparison
  if (data.categoryStats && data.categoryStats.length >= 3 && data.categoryStats.length <= 8) {
    const hasMultipleDimensions = data.categoryStats.some(stat => stat.unit !== undefined);
    if (hasMultipleDimensions) {
      charts.push({
        id: 'category-radar',
        type: 'radar',
        title: 'Category Comparison',
        description: 'Multi-dimensional view across categories',
        data: data.categoryStats.map(stat => ({
          category: stat.label,
          value: stat.count,
        })),
      });
    }
  }

  // 4. Highlight cards (shown as trend cards in UI)
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
