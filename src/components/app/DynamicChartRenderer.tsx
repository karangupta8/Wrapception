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
import { ChartConfig, PieDatum, BarDatum } from '@/services/chartSelector';

const FALLBACK_COLORS = [
  'hsl(280 60% 60%)',
  'hsl(0 70% 60%)',
  'hsl(45 80% 55%)',
  'hsl(200 70% 55%)',
  'hsl(160 60% 45%)',
  'hsl(35 90% 55%)',
  'hsl(220 20% 50%)',
];

interface DynamicChartRendererProps {
  chart: ChartConfig;
  height?: string;
}

export function DynamicChartRenderer({ chart, height = '300px' }: DynamicChartRendererProps) {
  const heightPx = parseInt(height, 10);

  const chartContent = useMemo(() => {
    switch (chart.type) {
      case 'pie': {
        const pieData = chart.data as PieDatum[];
        return (
          <ResponsiveContainer width="100%" height={heightPx}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }: { name: string; percentage: number }) =>
                  `${name} ${percentage}%`
                }
                outerRadius={Math.max(60, heightPx / 3.2)}
                innerRadius={Math.max(30, heightPx / 7)}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, _name, props) => {
                  const pct = (props?.payload as PieDatum)?.percentage;
                  return [`${value.toLocaleString()} (${pct ?? 0}%)`, 'Count'];
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      }

      case 'bar': {
        const barData = chart.data as BarDatum[];
        return (
          <ResponsiveContainer width="100%" height={heightPx}>
            <BarChart
              data={barData}
              margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="name" angle={-30} textAnchor="end" height={80} interval={0} />
              <YAxis />
              <Tooltip formatter={(value: number) => value.toLocaleString()} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {barData.map((entry, index) => (
                  <Cell
                    key={`bar-${index}`}
                    fill={entry.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      }

      case 'line': {
        const lineData = chart.data as { metric: string; dataPoints: Array<{ label: string; value: number }> };
        return (
          <ResponsiveContainer width="100%" height={heightPx}>
            <LineChart data={lineData.dataPoints || []} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(280 60% 60%)"
                strokeWidth={2}
                dot={{ fill: 'hsl(280 60% 60%)', r: 4 }}
                activeDot={{ r: 6 }}
                name={lineData.metric || 'Value'}
              />
            </LineChart>
          </ResponsiveContainer>
        );
      }

      case 'radar':
        return (
          <ResponsiveContainer width="100%" height={heightPx}>
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

      case 'trend': {
        const trendData = chart.data as { title: string; description: string; category?: string };
        return (
          <div className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg border border-border h-full">
            <h4 className="font-semibold text-lg mb-2">{trendData.title}</h4>
            <p className="text-sm text-muted-foreground">{trendData.description}</p>
            {trendData.category && (
              <span className="inline-block mt-3 px-3 py-1 rounded-full bg-primary/10 text-xs font-medium text-primary">
                {trendData.category}
              </span>
            )}
          </div>
        );
      }

      default:
        return <div className="text-muted-foreground text-center">Unknown chart type</div>;
    }
  }, [chart, heightPx]);

  return (
    <div className="w-full">
      <div className="mb-3">
        <h3 className="font-display text-lg">{chart.title}</h3>
        {chart.description && <p className="text-sm text-muted-foreground">{chart.description}</p>}
      </div>
      <div className="bg-white dark:bg-slate-950 rounded-lg border border-border p-4">{chartContent}</div>
    </div>
  );
}
