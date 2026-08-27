import { useMemo, useState } from 'react';
import { useConfigStore } from '../stores/configStore';
import { useTranslation } from '../i18n';
import { SpeechAnalysis } from '../types/config';

// ─── Helpers ─────────────────────────────────────────────────────────────

function scoreColor(s: number): string {
  if (s >= 70) return 'text-emerald-600 dark:text-emerald-400';
  if (s >= 40) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function scoreBg(s: number): string {
  if (s >= 70) return 'bg-emerald-500';
  if (s >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

function trendArrow(d: string): string {
  if (d === 'improving') return '↑';
  if (d === 'declining') return '↓';
  return '→';
}

function trendColor(d: string): string {
  if (d === 'improving') return 'text-emerald-600 dark:text-emerald-400';
  if (d === 'declining') return 'text-red-600 dark:text-red-400';
  return 'text-surface-400';
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateFull(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// ─── Analytics Page ──────────────────────────────────────────────────────

export function AnalyticsPage({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const history = useConfigStore((s) => s.config.history);
  const voiceAnalyticsEnabled = useConfigStore((s) => s.config.voiceAnalyticsEnabled);
  const { t } = useTranslation();

  const analyses = useMemo(() => {
    return history
      .filter((h): h is typeof h & { analysis: SpeechAnalysis } => !!h.analysis && h.analysis.analyzedAt > 0)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [history]);

  const dictationCount = history.length;
  const recent30 = analyses.slice(0, 30);
  const overallScore = analyses.length ? Math.round(avg(analyses.map((a) => a.analysis.overallScore))) : 0;
  const avgFluency = analyses.length ? Math.round(avg(analyses.map((a) => a.analysis.fluency))) : 0;
  const avgLexical = analyses.length ? Math.round(avg(analyses.map((a) => a.analysis.lexicalDiversity))) : 0;
  const avgSyntax = analyses.length ? Math.round(avg(analyses.map((a) => a.analysis.syntacticComplexity))) : 0;
  const avgCoherence = analyses.length ? Math.round(avg(analyses.map((a) => a.analysis.coherence))) : 0;
  const avgClarity = analyses.length ? Math.round(avg(analyses.map((a) => a.analysis.clarity))) : 0;

  const trendDir = analyses.length >= 2
    ? analyses[0].analysis.overallScore > analyses[analyses.length - 1].analysis.overallScore + 5
      ? 'improving'
      : analyses[0].analysis.overallScore < analyses[analyses.length - 1].analysis.overallScore - 5
        ? 'declining'
        : 'stable'
    : 'unknown';

  // Per-app breakdown
  const perApp = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const a of analyses) {
      const app = a.sourceApp || 'Unknown';
      const list = map.get(app) || [];
      list.push(a.analysis.overallScore);
      map.set(app, list);
    }
    return Array.from(map.entries())
      .map(([app, scores]) => ({ app, avg: Math.round(avg(scores)), count: scores.length }))
      .sort((a, b) => b.count - a.count);
  }, [analyses]);

  // SVG chart dimensions
  const CHART_W = 640;
  const CHART_H = 240;
  const PAD = { top: 20, right: 20, bottom: 30, left: 36 };

  const chartData = useMemo(() => {
    const pts = recent30.slice().reverse(); // oldest → newest
    if (!pts.length) return null;
    const minScore = 0;
    const maxScore = 100;
    const plotW = CHART_W - PAD.left - PAD.right;
    const plotH = CHART_H - PAD.top - PAD.bottom;

    const points = pts.map((p, i) => ({
      x: PAD.left + (i / Math.max(pts.length - 1, 1)) * plotW,
      y: PAD.top + plotH - ((p.analysis.overallScore - minScore) / (maxScore - minScore)) * plotH,
      score: p.analysis.overallScore,
      date: formatDate(p.timestamp),
      dateFull: formatDateFull(p.timestamp),
    }));

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

    // Y-axis ticks
    const yTicks = [0, 25, 50, 75, 100];
    const yTicksPos = yTicks.map((v) => ({
      value: v,
      y: PAD.top + plotH - ((v - minScore) / (maxScore - minScore)) * plotH,
    }));

    return { points, linePath, yTicksPos, plotW, plotH };
  }, [recent30]);

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!voiceAnalyticsEnabled) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-12">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-surface-300 dark:text-surface-600">
          <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
        </svg>
        <div className="text-center">
          <p className="text-lg font-semibold text-surface-800 dark:text-surface-200">{t('analytics.disabled')}</p>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1 max-w-xs">{t('analytics.disabledDesc')}</p>
          <button
            onClick={() => onNavigate?.('settings')}
            className="mt-3 px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors"
          >
            {t('analytics.goToSettings')}
          </button>
        </div>
      </div>
    );
  }

  if (dictationCount < 5) {
    if (dictationCount > 0) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-12">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-surface-300 dark:text-surface-600">
            <path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>
          </svg>
          <div className="text-center">
            <p className="text-lg font-semibold text-surface-800 dark:text-surface-200">{t('analytics.noData')}</p>
            <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">{t('analytics.goToDictation')}</p>
            <button
              onClick={() => onNavigate?.('dictation')}
              className="mt-3 px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors"
            >
              Dictate
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-12">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-surface-300 dark:text-surface-600">
          <path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>
        </svg>
        <div className="text-center">
          <p className="text-lg font-semibold text-surface-800 dark:text-surface-200">{t('analytics.noData')}</p>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">{t('analytics.goToDictation')}</p>
        </div>
      </div>
    );
  }

  const metrics = [
    { key: 'fluency', label: t('analytics.metrics.fluency'), value: avgFluency },
    { key: 'lexicalDiversity', label: t('analytics.metrics.lexicalDiversity'), value: avgLexical },
    { key: 'syntacticComplexity', label: t('analytics.metrics.syntacticComplexity'), value: avgSyntax },
    { key: 'coherence', label: t('analytics.metrics.coherence'), value: avgCoherence },
    { key: 'clarity', label: t('analytics.metrics.clarity'), value: avgClarity },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">

        {/* Disclaimer */}
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl px-5 py-3 flex items-start gap-3">
          <span className="text-amber-600 dark:text-amber-400 text-lg shrink-0 mt-0.5">⚠</span>
          <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
            {t('analytics.disclaimer')}
          </p>
        </div>

        {/* Hero Score */}
        <div className="rt-card p-8 flex items-center gap-8">
          <div className="text-center">
            <div className={`text-5xl font-bold font-mono ${scoreColor(overallScore)}`}>
              {overallScore}
            </div>
            <div className="text-xs text-surface-400 mt-1 font-medium">
              {t('analytics.overallScore')}
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-surface-700 dark:text-surface-300">{t('analytics.trend')}</span>
              <span className={`text-lg ${trendColor(trendDir)}`}>
                {trendArrow(trendDir)} {t(`analytics.${trendDir}`)}
              </span>
            </div>
            <div className="w-full h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${scoreBg(overallScore)}`} style={{ width: `${overallScore}%` }} />
            </div>
          </div>
        </div>

        {/* Trend Chart */}
        <div className="rt-card p-6">
          <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-4">{t('analytics.trend')}</h3>
          {chartData ? (
            <div className="relative overflow-x-auto">
              <svg width={CHART_W} height={CHART_H} className="w-full" style={{ minWidth: '320px' }}>
                {/* Zone backgrounds */}
                <rect x={PAD.left} y={PAD.top} width={chartData.plotW} height={chartData.plotH * 0.3} fill="rgba(239,68,68,0.04)" />
                <rect x={PAD.left} y={PAD.top + chartData.plotH * 0.3} width={chartData.plotW} height={chartData.plotH * 0.4} fill="rgba(245,158,11,0.03)" />
                <rect x={PAD.left} y={PAD.top + chartData.plotH * 0.7} width={chartData.plotW} height={chartData.plotH * 0.3} fill="rgba(16,185,129,0.04)" />

                {/* Y-axis gridlines + labels */}
                {chartData.yTicksPos.map((tick) => (
                  <g key={tick.value}>
                    <line x1={PAD.left} y1={tick.y} x2={CHART_W - PAD.right} y2={tick.y} stroke="currentColor" className="text-surface-200 dark:text-surface-700" strokeWidth="1" />
                    <text x={PAD.left - 8} y={tick.y + 4} textAnchor="end" className="text-[11px] fill-surface-400" fontSize="11">{tick.value}</text>
                  </g>
                ))}

                {/* Zone labels */}
                <text x={CHART_W - PAD.right - 4} y={PAD.top + chartData.plotH * 0.15 + 4} textAnchor="end" className="text-[10px] fill-red-300 dark:fill-red-500/40" fontSize="10">Low</text>
                <text x={CHART_W - PAD.right - 4} y={PAD.top + chartData.plotH * 0.5 + 4} textAnchor="end" className="text-[10px] fill-amber-300 dark:fill-amber-500/40" fontSize="10">Moderate</text>
                <text x={CHART_W - PAD.right - 4} y={PAD.top + chartData.plotH * 0.85 + 4} textAnchor="end" className="text-[10px] fill-emerald-300 dark:fill-emerald-500/40" fontSize="10">Good</text>

                {/* Line */}
                <path d={chartData.linePath} fill="none" stroke="#034f46" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

                {/* Dots + hover targets */}
                {chartData.points.map((p, i) => (
                  <g key={i}>
                    <circle
                      cx={p.x} cy={p.y} r={4}
                      fill="#034f46"
                      stroke="#fff"
                      strokeWidth="2"
                      className="dark:stroke-surface-900"
                    />
                    {/* Invisible wider hit target */}
                    <circle
                      cx={p.x} cy={p.y} r={12}
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredIdx(i)}
                      onMouseLeave={() => setHoveredIdx(null)}
                    />
                  </g>
                ))}

                {/* Last-point label */}
                {chartData.points.length > 0 && (
                  <text x={chartData.points[chartData.points.length - 1].x + 8} y={chartData.points[chartData.points.length - 1].y + 4} className="text-[12px] fill-brand-500 font-semibold" fontSize="12">
                    {chartData.points[chartData.points.length - 1].score}
                  </text>
                )}

                {/* Tooltip */}
                {hoveredIdx !== null && chartData.points[hoveredIdx] && (
                  <>
                    <line
                      x1={chartData.points[hoveredIdx].x} y1={PAD.top}
                      x2={chartData.points[hoveredIdx].x} y2={CHART_H - PAD.bottom}
                      stroke="#034f46" strokeWidth="1" strokeDasharray="3,3" opacity="0.4"
                    />
                    <rect
                      x={chartData.points[hoveredIdx].x - 36}
                      y={chartData.points[hoveredIdx].y - 28}
                      width={72} height={20} rx={4}
                      fill="#034f46"
                    />
                    <text
                      x={chartData.points[hoveredIdx].x}
                      y={chartData.points[hoveredIdx].y - 14}
                      textAnchor="middle"
                      fill="#fff"
                      fontSize="11"
                      fontWeight="600"
                    >
                      {chartData.points[hoveredIdx].score} — {chartData.points[hoveredIdx].date}
                    </text>
                  </>
                )}
              </svg>
            </div>
          ) : (
            <p className="text-sm text-surface-400 text-center py-8">{t('analytics.noAnalysesYet')}</p>
          )}
        </div>

        {/* Metric Gauges */}
        <div className="space-y-3">
          {metrics.map((m) => (
            <div key={m.key} className="rt-card px-5 py-3.5 flex items-center gap-4">
              <span className="text-sm font-medium text-surface-700 dark:text-surface-300 w-36 shrink-0">{m.label}</span>
              <div className="flex-1 h-3 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${m.value}%`,
                    background: m.value >= 70
                      ? '#10b981'
                      : m.value >= 40
                        ? '#f59e0b'
                        : '#ef4444',
                  }}
                />
              </div>
              <span className={`text-sm font-mono font-semibold w-10 text-right ${scoreColor(m.value)}`}>{m.value}</span>
            </div>
          ))}
        </div>

        {/* Per-App Breakdown */}
        {perApp.length > 1 && (
          <div className="rt-card p-6">
            <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-4">{t('analytics.perApp')}</h3>
            <div className="space-y-2.5">
              {perApp.map(({ app, avg: val, count }) => (
                <div key={app} className="flex items-center gap-3">
                  <span className="text-xs text-surface-600 dark:text-surface-400 w-28 truncate shrink-0">{app}</span>
                  <div className="flex-1 h-2.5 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${val >= 70 ? 'bg-emerald-500' : val >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${val}%` }} />
                  </div>
                  <span className="text-xs font-mono text-surface-500 w-16 text-right">{val} ({count})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Analyses Table */}
        <div className="rt-card p-6">
          <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-4">{t('analytics.recentAnalyses')}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-surface-400 dark:text-surface-500 border-b border-surface-100 dark:border-surface-800">
                  <th className="text-left font-medium pb-2 pr-3">{t('analytics.date')}</th>
                  <th className="text-left font-medium pb-2 pr-3">{t('analytics.score')}</th>
                  <th className="text-left font-medium pb-2 pr-3">{t('analytics.metrics.fluency')}</th>
                  <th className="text-left font-medium pb-2 pr-3">{t('analytics.metrics.lexicalDiversity')}</th>
                  <th className="text-left font-medium pb-2 pr-3">{t('analytics.metrics.syntacticComplexity')}</th>
                  <th className="text-left font-medium pb-2 pr-3">{t('analytics.metrics.coherence')}</th>
                  <th className="text-left font-medium pb-2 pr-3">{t('analytics.metrics.clarity')}</th>
                  <th className="text-left font-medium pb-2">{t('analytics.details.wpm')}</th>
                </tr>
              </thead>
              <tbody>
                {analyses.slice(0, 20).map((a) => (
                  <tr key={a.id} className="border-b border-surface-50 dark:border-surface-800/50 hover:bg-surface-50 dark:hover:bg-surface-850 transition-colors">
                    <td className="py-2.5 pr-3 text-surface-600 dark:text-surface-400 whitespace-nowrap">{formatDateFull(a.timestamp)}</td>
                    <td className={`py-2.5 pr-3 font-mono font-semibold ${scoreColor(a.analysis.overallScore)}`}>{a.analysis.overallScore}</td>
                    <td className="py-2.5 pr-3 text-surface-600 dark:text-surface-400">{a.analysis.fluency}</td>
                    <td className="py-2.5 pr-3 text-surface-600 dark:text-surface-400">{a.analysis.lexicalDiversity}</td>
                    <td className="py-2.5 pr-3 text-surface-600 dark:text-surface-400">{a.analysis.syntacticComplexity}</td>
                    <td className="py-2.5 pr-3 text-surface-600 dark:text-surface-400">{a.analysis.coherence}</td>
                    <td className="py-2.5 pr-3 text-surface-600 dark:text-surface-400">{a.analysis.clarity}</td>
                    <td className="py-2.5 text-surface-600 dark:text-surface-400">{a.analysis.details.speakingWpm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
