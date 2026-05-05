import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  LineChart,
  Line,
  RadarChart,
  Radar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { ChartConfig } from '@/services/chartSelector';

const COLORS = [
  'hsl(280 60% 60%)',  // music purple
  'hsl(0 70% 60%)',    // fitness red
  'hsl(45 80% 55%)',   // reading yellow
  'hsl(200 70% 55%)',  // movies blue
  'hsl(160 60% 45%)',  // work teal
  'hsl(35 90% 55%)',   // productivity orange
  'hsl(220 20% 50%)',  // other gray
];

interface DynamicChartRendererProps {
  chart: ChartConfig;
  height?: string;
}

export function DynamicChartRenderer({ chart, height = '300px' }: DynamicChartRendererProps) {
  const chartContent = useMemo(() => {
    switch (chart.type) {
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={parseInt(height)}>
            <PieChart>
              <Pie
                data={chart.data as Array<{ name: string; value: number; percentage: number }>}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name} (${percentage}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {(chart.data as Array<{ name: string; value: number }>).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => value.toLocaleString()} />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={parseInt(height)}>
            <BarChart
              data={chart.data as Array<{ name: string; value: number }>}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="hsl(200 70% 55%)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={parseInt(height)}>
            <LineChart
              data={
                (chart.data as { metric: string; dataPoints: Array<{ label: string; value: number }> })
                  .dataPoints || []
              }
              margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(280 60% 60%)"
                dot={{ fill: 'hsl(280 60% 60%)', r: 4 }}
                activeDot={{ r: 6 }}
                name={
                  (chart.data as { metric: string })?.metric ||
                  'Value'
                }
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'radar':
        return (
          <ResponsiveContainer width="100%" height={parseInt(height)}>
            <RadarChart data={chart.data as Array<{ category: string; value: number }>}>
              <CartesianGrid />
              <XAxis dataKey="category" />
              <YAxis />
              <Radar
                name="Count"
                dataKey="value"
                stroke="hsl(160 60% 45%)"
                fill="hsl(160 60% 45%)"
                fillOpacity={0.6}
              />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        );

      case 'trend':
        const trendData = chart.data as { title: string; description: string; category?: string };
        return (
          <div className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg border border-border">
            <h4 className="font-semibold text-lg mb-2">{trendData.title}</h4>
            <p className="text-sm text-muted-foreground">{trendData.description}</p>
            {trendData.category && (
              <span className="inline-block mt-3 px-3 py-1 rounded-full bg-primary/10 text-xs font-medium text-primary">
                {trendData.category}
              </span>
            )}
          </div>
        );

      default:
        return <div className="text-muted-foreground text-center">Unknown chart type</div>;
    }
  }, [chart, height]);

  return (
    <div className="w-full">
      <div className="mb-3">
        <h3 className="font-display text-lg">{chart.title}</h3>
        {chart.description && (
          <p className="text-sm text-muted-foreground">{chart.description}</p>
        )}
      </div>
      <div className="bg-white dark:bg-slate-950 rounded-lg border border-border p-4">
        {chartContent}
      </div>
    </div>
  );
}
