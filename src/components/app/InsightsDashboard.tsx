import { TrendingUp, TrendingDown, Minus, Star, Lightbulb, Target, Sparkles, BarChart3 } from 'lucide-react';
import { useSession } from '@/context/SessionContext';
import { CATEGORY_INFO } from '@/types/session';
import {
  selectCharts,
  getChartDimensions,
  resolveCategory,
  categoryLabel,
  categoryColor,
} from '@/services/chartSelector';
import { DynamicChartRenderer } from './DynamicChartRenderer';
import type { ExtractedMetricAI, Highlight, CategoryStats } from '@/services/aiService';

/** Hide bare ordinal numbers like "1" that carry no info standalone. */
function isMeaningfulHighlightMetric(metric: string | undefined): boolean {
  if (!metric) return false;
  const t = metric.trim();
  if (!t) return false;
  if (/^\d{1,2}$/.test(t)) return false;
  return true;
}

/** Normalize a metric or highlight name for fuzzy de-duplication. */
function normalizeName(s: string | undefined): string {
  if (!s) return '';
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\b(top|total|all|the|your|my)\b/g, '')
    .replace(/s\b/g, '') // crude singularisation: "artists" → "artist"
    .replace(/\s+/g, ' ')
    .trim();
}

/** Group metrics that share a name but differ by platform (e.g. region splits). */
interface MetricGroup {
  name: string;
  unit?: string;
  category?: string;
  rows: { value: string | number; platform?: string }[];
}

function groupMetrics(metrics: ExtractedMetricAI[]): MetricGroup[] {
  const groups = new Map<string, MetricGroup>();
  for (const m of metrics) {
    const key = normalizeName(m.name);
    if (!key) continue;
    const existing = groups.get(key);
    if (existing) {
      // Skip exact duplicate value+platform
      const dup = existing.rows.some(
        (r) => String(r.value) === String(m.value) && r.platform === m.platform,
      );
      if (!dup) existing.rows.push({ value: m.value, platform: m.platform });
    } else {
      groups.set(key, {
        name: m.name,
        unit: m.unit,
        category: m.category,
        rows: [{ value: m.value, platform: m.platform }],
      });
    }
  }
  return Array.from(groups.values());
}

/** Dedupe highlights by normalized title — keeps the longest description (most info). */
function dedupeHighlights(highlights: Highlight[]): Highlight[] {
  const byKey = new Map<string, Highlight>();
  for (const h of highlights) {
    if (!h.title?.trim() || !h.description?.trim()) continue;
    const key = normalizeName(h.title);
    const existing = byKey.get(key);
    if (!existing || h.description.length > existing.description.length) {
      byKey.set(key, h);
    }
  }
  return Array.from(byKey.values());
}

/** Filter category insights to entries that map to a known Category enum. */
function filterKnownCategories(breakdown: CategoryStats[]): CategoryStats[] {
  const seen = new Set<string>();
  const result: CategoryStats[] = [];
  for (const cat of breakdown) {
    const known = resolveCategory(cat.category as string);
    if (!known) continue;
    if (seen.has(known)) continue;
    seen.add(known);
    result.push(cat);
  }
  return result;
}

export function InsightsDashboard() {
  const { session } = useSession();
  const { analyticsData } = session;

  if (!analyticsData) return null;

  const metricGroups = groupMetrics(analyticsData.metrics || []);
  const highlights = dedupeHighlights(analyticsData.highlights || []);
  const knownCategoryInsights = filterKnownCategories(analyticsData.categoryBreakdown || []);
  const charts = selectCharts(analyticsData);

  return (
    <div className="space-y-8">
      {/* Year Summary */}
      <div className="p-6 md:p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
        <div className="flex items-start gap-3">
          <Sparkles className="w-6 h-6 text-accent shrink-0 mt-1" />
          <div>
            <h3 className="font-display text-xl mb-2">Your Year in Summary</h3>
            <p className="text-base md:text-lg leading-relaxed text-foreground/90">
              {analyticsData.yearSummary}
            </p>
          </div>
        </div>
      </div>

      {/* Charts (only deterministic ones — trend velocity etc.) */}
      {charts.length > 0 && (
        <div>
          <h3 className="font-display text-xl mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-accent" />
            Year-over-Year Momentum
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {charts.map((chart) => {
              const dims = getChartDimensions(chart.type);
              return (
                <div key={chart.id} className={`lg:col-span-${dims.colSpan}`}>
                  <DynamicChartRenderer chart={chart} height={dims.minHeight} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Key Numbers — grouped */}
      {metricGroups.length > 0 && (
        <div>
          <h3 className="font-display text-xl mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-accent" />
            Key Numbers
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {metricGroups.map((group, index) => {
              const knownCat = group.category ? resolveCategory(group.category) : null;
              const dotColor = knownCat
                ? CATEGORY_INFO[knownCat].color
                : categoryColor(group.category ?? '', index);
              const isMulti = group.rows.length > 1;
              const primary = group.rows[0];
              return (
                <div
                  key={`${group.name}-${index}`}
                  className="p-4 rounded-xl bg-card shadow-card border border-border/50"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                    <p className="text-xs text-muted-foreground truncate">{group.name}</p>
                  </div>
                  {isMulti ? (
                    <div className="space-y-1">
                      {group.rows.map((row, ri) => (
                        <div key={ri} className="flex items-baseline justify-between gap-2">
                          <span className="text-xs text-muted-foreground truncate">
                            {row.platform || '—'}
                          </span>
                          <span className="text-base font-display text-foreground tabular-nums">
                            {row.value}
                            {group.unit && (
                              <span className="text-xs font-normal text-muted-foreground ml-1">
                                {group.unit}
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <p className="text-xl font-display text-foreground leading-tight break-words">
                        {primary.value}
                        {group.unit && (
                          <span className="text-sm font-normal text-muted-foreground ml-1">
                            {group.unit}
                          </span>
                        )}
                      </p>
                      {primary.platform && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">{primary.platform}</p>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Highlights — deduped */}
      {highlights.length > 0 && (
        <div>
          <h3 className="font-display text-xl mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-accent" />
            Key Highlights
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {highlights.map((highlight) => {
              const knownCat = highlight.category ? resolveCategory(highlight.category) : null;
              // Only show category badge for known categories — avoids "Artist", "Song" noise
              const showBadge = Boolean(knownCat);
              const label = knownCat ? CATEGORY_INFO[knownCat].label : null;
              const color = knownCat ? CATEGORY_INFO[knownCat].color : 'hsl(220 20% 50%)';
              const showMetric = isMeaningfulHighlightMetric(highlight.metric);
              return (
                <div
                  key={highlight.id}
                  className="p-5 rounded-2xl bg-card shadow-card border border-border/50 hover:shadow-elevated transition-shadow"
                >
                  {showBadge && label && (
                    <span
                      className="inline-block px-2 py-0.5 rounded-full text-xs font-medium text-white mb-3"
                      style={{ backgroundColor: color }}
                    >
                      {label}
                    </span>
                  )}
                  <h4 className="font-medium text-lg mb-2">{highlight.title}</h4>
                  <p className="text-muted-foreground text-sm">{highlight.description}</p>
                  {showMetric && (
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
              const Icon =
                trend.direction === 'up' ? TrendingUp : trend.direction === 'down' ? TrendingDown : Minus;
              const color =
                trend.direction === 'up'
                  ? 'text-green-500'
                  : trend.direction === 'down'
                    ? 'text-red-500'
                    : 'text-muted-foreground';
              const knownCat = trend.category ? resolveCategory(trend.category) : null;
              return (
                <div
                  key={index}
                  className="p-4 rounded-xl bg-card shadow-card border border-border/50 flex items-center gap-4"
                >
                  <div className={`p-2 rounded-lg bg-secondary ${color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{trend.label}</p>
                    <p className="text-sm text-muted-foreground truncate">{trend.value}</p>
                  </div>
                  {typeof trend.percentChange === 'number' && Number.isFinite(trend.percentChange) && (
                    <span className={`text-sm font-display ${color} shrink-0`}>
                      {trend.percentChange > 0 ? '+' : ''}
                      {trend.percentChange}%
                    </span>
                  )}
                  {knownCat && (
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: CATEGORY_INFO[knownCat].color }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Category Insights — only known categories */}
      {knownCategoryInsights.length > 0 && (
        <div>
          <h3 className="font-display text-xl mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-accent" />
            Category Insights
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {knownCategoryInsights.map((cat, idx) => {
              const knownCat = resolveCategory(cat.category as string)!;
              const info = CATEGORY_INFO[knownCat];
              return (
                <div
                  key={`${cat.category}-${idx}`}
                  className="p-4 rounded-xl bg-card shadow-card border border-border/50"
                >
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <div
                      className="w-4 h-4 rounded-full shrink-0"
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
