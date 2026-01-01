import { useEffect, useState } from 'react';
import { FileStack, Layers, Globe, Sparkles } from 'lucide-react';
import { useSession } from '@/context/SessionContext';
import { Category } from '@/types/session';

interface StatItemProps {
    icon: React.ReactNode;
    label: string;
    value: number;
    color: string;
    delay?: number;
}

function StatItem({ icon, label, value, color, delay = 0 }: StatItemProps) {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        const timer = setTimeout(() => {
            const duration = 800;
            const stepTime = 20;
            const steps = duration / stepTime;
            const increment = value / steps;
            let current = 0;

            const interval = setInterval(() => {
                current += increment;
                if (current >= value) {
                    setDisplayValue(value);
                    clearInterval(interval);
                } else {
                    setDisplayValue(Math.floor(current));
                }
            }, stepTime);

            return () => clearInterval(interval);
        }, delay);

        return () => clearTimeout(timer);
    }, [value, delay]);

    return (
        <div className="p-5 rounded-2xl bg-card shadow-card border border-border/50 hover:shadow-elevated transition-shadow">
            <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ backgroundColor: `${color}20` }}
            >
                <div style={{ color }}>{icon}</div>
            </div>
            <div className="font-display text-3xl mb-1">{displayValue}</div>
            <div className="text-sm text-muted-foreground">{label}</div>
        </div>
    );
}

export function StatsOverview() {
    const { session } = useSession();

    const totalSources = session.uploadedSources.length;

    const categories = new Set(session.uploadedSources.map(s => s.category));
    const categoriesCount = categories.size;

    const platforms = new Set(session.uploadedSources.map(s => s.platformName));
    const platformsCount = platforms.size;

    const insightsCount = session.aiInsights.length;

    const stats: StatItemProps[] = [
        {
            icon: <FileStack className="w-5 h-5" />,
            label: 'Total Sources',
            value: totalSources,
            color: 'hsl(235 45% 55%)',
            delay: 0,
        },
        {
            icon: <Layers className="w-5 h-5" />,
            label: 'Categories',
            value: categoriesCount,
            color: 'hsl(280 60% 60%)',
            delay: 100,
        },
        {
            icon: <Globe className="w-5 h-5" />,
            label: 'Platforms',
            value: platformsCount,
            color: 'hsl(160 60% 45%)',
            delay: 200,
        },
        {
            icon: <Sparkles className="w-5 h-5" />,
            label: 'Insights',
            value: insightsCount,
            color: 'hsl(15 75% 65%)',
            delay: 300,
        },
    ];

    if (totalSources === 0) {
        return null;
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat) => (
                <StatItem key={stat.label} {...stat} />
            ))}
        </div>
    );
}
