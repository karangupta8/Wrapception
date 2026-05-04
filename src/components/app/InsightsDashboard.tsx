import { TrendingUp, TrendingDown, Minus, Star, Lightbulb, Target, Sparkles, BarChart3 } from 'lucide-react';
import { useSession } from '@/context/SessionContext';
import { CATEGORY_INFO, Category } from '@/types/session';

export function InsightsDashboard() {
    const { session } = useSession();
    const { analyticsData } = session;

    if (!analyticsData) {
        return null;
    }

    return (
        <div className="space-y-6">
            {/* Year Summary */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
                <div className="flex items-start gap-3">
                    <Sparkles className="w-6 h-6 text-accent shrink-0 mt-1" />
                    <div>
                        <h3 className="font-display text-xl mb-2">Your Year in Summary</h3>
                        <p className="text-lg leading-relaxed text-foreground/90">
                            {analyticsData.yearSummary}
                        </p>
                    </div>
                </div>
            </div>

            {/* Extracted Metrics Grid */}
            {analyticsData.metrics.length > 0 && (
                <div>
                    <h3 className="font-display text-xl mb-4 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-accent" />
                        Extracted Metrics
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {analyticsData.metrics.map((metric, index) => {
                            const categoryInfo = metric.category ? CATEGORY_INFO[metric.category] : null;
                            return (
                                <div
                                    key={index}
                                    className="p-4 rounded-xl bg-card shadow-card border border-border/50"
                                >
                                    {categoryInfo && (
                                        <div
                                            className="w-2 h-2 rounded-full mb-2"
                                            style={{ backgroundColor: categoryInfo.color }}
                                        />
                                    )}
                                    <p className="text-xs text-muted-foreground mb-1 truncate">{metric.name}</p>
                                    <p className="text-xl font-display text-foreground leading-tight">
                                        {metric.value}
                                        {metric.unit && (
                                            <span className="text-sm font-normal text-muted-foreground ml-1">
                                                {metric.unit}
                                            </span>
                                        )}
                                    </p>
                                    {metric.platform && (
                                        <p className="text-xs text-muted-foreground mt-1 truncate">{metric.platform}</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Highlights Grid */}
            {analyticsData.highlights.length > 0 && (
                <div>
                    <h3 className="font-display text-xl mb-4 flex items-center gap-2">
                        <Star className="w-5 h-5 text-accent" />
                        Key Highlights
                    </h3>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {analyticsData.highlights.map((highlight) => {
                            const categoryInfo = highlight.category ? CATEGORY_INFO[highlight.category] : null;
                            return (
                                <div
                                    key={highlight.id}
                                    className="p-5 rounded-2xl bg-card shadow-card border border-border/50 hover:shadow-elevated transition-shadow"
                                >
                                    {categoryInfo && (
                                        <span
                                            className="inline-block px-2 py-0.5 rounded-full text-xs font-medium text-white mb-3"
                                            style={{ backgroundColor: categoryInfo.color }}
                                        >
                                            {categoryInfo.label}
                                        </span>
                                    )}
                                    <h4 className="font-medium text-lg mb-2">{highlight.title}</h4>
                                    <p className="text-muted-foreground text-sm">{highlight.description}</p>
                                    {highlight.metric && (
                                        <p className="mt-3 text-2xl font-display text-primary">{highlight.metric}</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Trends */}
            {analyticsData.trends.length > 0 && (
                <div>
                    <h3 className="font-display text-xl mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-accent" />
                        Trends
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                        {analyticsData.trends.map((trend, index) => {
                            const Icon = trend.direction === 'up' ? TrendingUp :
                                trend.direction === 'down' ? TrendingDown : Minus;
                            const color = trend.direction === 'up' ? 'text-green-500' :
                                trend.direction === 'down' ? 'text-red-500' : 'text-muted-foreground';
                            const categoryInfo = trend.category ? CATEGORY_INFO[trend.category] : null;

                            return (
                                <div
                                    key={index}
                                    className="p-4 rounded-xl bg-card shadow-card border border-border/50 flex items-center gap-4"
                                >
                                    <div className={`p-2 rounded-lg bg-secondary ${color}`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium">{trend.label}</p>
                                        <p className="text-sm text-muted-foreground">{trend.value}</p>
                                    </div>
                                    {categoryInfo && (
                                        <span
                                            className="w-3 h-3 rounded-full shrink-0"
                                            style={{ backgroundColor: categoryInfo.color }}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Category Breakdown */}
            {analyticsData.categoryBreakdown.length > 0 && (
                <div>
                    <h3 className="font-display text-xl mb-4 flex items-center gap-2">
                        <Target className="w-5 h-5 text-accent" />
                        Category Insights
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                        {analyticsData.categoryBreakdown.map((cat) => {
                            const info = CATEGORY_INFO[cat.category];
                            return (
                                <div
                                    key={cat.category}
                                    className="p-4 rounded-xl bg-card shadow-card border border-border/50"
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <div
                                            className="w-4 h-4 rounded-full"
                                            style={{ backgroundColor: info.color }}
                                        />
                                        <h4 className="font-medium">{info.label}</h4>
                                        {cat.topPlatform && (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                                                {cat.topPlatform}
                                            </span>
                                        )}
                                    </div>
                                    {cat.keyMetric && (
                                        <p className="text-2xl font-display text-primary mb-2">{cat.keyMetric}</p>
                                    )}
                                    <p className="text-sm text-muted-foreground">{cat.insight}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Recommendations */}
            {analyticsData.recommendations.length > 0 && (
                <div>
                    <h3 className="font-display text-xl mb-4 flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-accent" />
                        Recommendations for Next Year
                    </h3>
                    <div className="space-y-3">
                        {analyticsData.recommendations.map((rec, index) => (
                            <div
                                key={index}
                                className="p-4 rounded-xl bg-secondary/50 border border-border/50 flex items-start gap-3"
                            >
                                <span className="w-6 h-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-sm font-medium shrink-0">
                                    {index + 1}
                                </span>
                                <p className="text-foreground/90">{rec}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
