import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { useSession } from '@/context/SessionContext';

// Vibrant color palette for platforms
const PLATFORM_COLORS = [
    'hsl(235 55% 60%)',
    'hsl(280 60% 60%)',
    'hsl(15 75% 65%)',
    'hsl(160 60% 45%)',
    'hsl(200 70% 55%)',
    'hsl(45 80% 55%)',
    'hsl(0 70% 60%)',
    'hsl(120 50% 50%)',
];

export function PlatformBarChart() {
    const { session } = useSession();

    const platformCounts = session.uploadedSources.reduce((acc, source) => {
        const name = source.platformName.charAt(0).toUpperCase() + source.platformName.slice(1);
        acc[name] = (acc[name] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const data = Object.entries(platformCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8); // Top 8 platforms

    if (data.length === 0) {
        return null;
    }

    return (
        <div className="p-6 rounded-2xl bg-card shadow-card">
            <h3 className="font-display text-xl mb-4">Top Platforms</h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        layout="vertical"
                        margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                    >
                        <XAxis type="number" hide />
                        <YAxis
                            type="category"
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            width={90}
                            tick={{ fontSize: 12, fill: 'hsl(220 15% 45%)' }}
                        />
                        <Tooltip
                            cursor={{ fill: 'hsl(220 15% 95%)' }}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const item = payload[0].payload;
                                    return (
                                        <div className="bg-popover text-popover-foreground px-3 py-2 rounded-lg shadow-elevated border border-border">
                                            <p className="font-medium">{item.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {item.value} upload{item.value !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Bar
                            dataKey="value"
                            radius={[0, 6, 6, 0]}
                            animationDuration={800}
                        >
                            {data.map((_, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={PLATFORM_COLORS[index % PLATFORM_COLORS.length]}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
