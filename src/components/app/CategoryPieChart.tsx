import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useSession } from '@/context/SessionContext';
import { Category, CATEGORY_INFO } from '@/types/session';

export function CategoryPieChart() {
    const { session } = useSession();

    const categoryCounts = session.uploadedSources.reduce((acc, source) => {
        acc[source.category] = (acc[source.category] || 0) + 1;
        return acc;
    }, {} as Record<Category, number>);

    const data = (Object.entries(categoryCounts) as [Category, number][])
        .map(([category, count]) => ({
            name: CATEGORY_INFO[category].label,
            value: count,
            color: CATEGORY_INFO[category].color,
        }))
        .sort((a, b) => b.value - a.value);

    if (data.length === 0) {
        return null;
    }

    const total = data.reduce((sum, item) => sum + item.value, 0);

    return (
        <div className="p-6 rounded-2xl bg-card shadow-card">
            <h3 className="font-display text-xl mb-4">Category Breakdown</h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                            animationBegin={0}
                            animationDuration={800}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const item = payload[0].payload;
                                    const percentage = ((item.value / total) * 100).toFixed(0);
                                    return (
                                        <div className="bg-popover text-popover-foreground px-3 py-2 rounded-lg shadow-elevated border border-border">
                                            <p className="font-medium">{item.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {item.value} source{item.value !== 1 ? 's' : ''} ({percentage}%)
                                            </p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Legend
                            verticalAlign="bottom"
                            height={36}
                            iconType="circle"
                            iconSize={8}
                            formatter={(value) => (
                                <span className="text-sm text-muted-foreground">{value}</span>
                            )}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
