import { useEffect, useMemo, useState, useCallback } from 'react';
import { useConfigStore } from '../stores/configStore';
import { useTranslation } from '../i18n';
import { friendlyErrorMessage } from '../utils/friendlyError';
import type { HistoryItem } from '../types/config';
import logoSrc from '../assets/logo.png';

/* ── Permission warning banner ── */
function PermissionWarnings() {
  const contextL1Enabled = useConfigStore((s) => s.config.contextL1Enabled);
  const { t } = useTranslation();
  const [missing, setMissing] = useState<('mic' | 'accessibility')[]>([]);

  useEffect(() => {
    if (!window.electronAPI) return;
    const results: ('mic' | 'accessibility')[] = [];
    const checks: Promise<void>[] = [];

    checks.push(
      window.electronAPI.checkMicPermission().then((s) => {
        if (s !== 'granted') results.push('mic');
      })
    );
    if (contextL1Enabled) {
      checks.push(
        window.electronAPI.checkAccessibility().then((s) => {
          if (s !== 'granted') results.push('accessibility');
        })
      );
    }
    Promise.all(checks).then(() => setMissing(results));
  }, [contextL1Enabled]);

  if (missing.length === 0) return null;

  const items: { key: string; text: string; action: string; onClick: () => void }[] = [];
  if (missing.includes('mic')) {
    items.push({ key: 'mic', text: t('dashboard.permMicNeeded'), action: t('dashboard.permMicAction'), onClick: () => window.electronAPI?.requestMicPermission() });
  }
  if (missing.includes('accessibility')) {
    items.push({ key: 'acc', text: t('dashboard.permAccessibilityNeeded'), action: t('dashboard.permAccessibilityAction'), onClick: () => window.electronAPI?.requestAccessibility() });
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.key} className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-700/40 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 text-[13px]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span>{item.text}</span>
          </div>
          <button onClick={item.onClick} className="flex-shrink-0 px-3 py-1 rounded-lg bg-amber-200/60 dark:bg-amber-700/40 text-amber-900 dark:text-amber-200 text-[12px] font-medium hover:bg-amber-200 dark:hover:bg-amber-700/60 transition-colors">
            {item.action}
          </button>
        </div>
      ))}
    </div>
  );
}

export function DashboardPage({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const history = useConfigStore((s) => s.config.history) || [];
  const globalHotkey = useConfigStore((s) => s.config.globalHotkey);
  const { t } = useTranslation();
  const [version, setVersion] = useState('');
  const [updateMsg, setUpdateMsg] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

  useEffect(() => {
    window.electronAPI?.getVersion?.().then((v) => setVersion(v || '1.0.0')).catch(() => setVersion('1.0.0'));
  }, []);
  // Default to 1.0.0 if not in Electron
  if (!window.electronAPI && !version) setVersion('1.0.0');

  // Real updater check
  const handleCheckUpdate = useCallback(() => {
    if (!window.electronAPI || checking) {
      setUpdateMsg('Coming soon');
      setTimeout(() => setUpdateMsg(null), 2000);
      return;
    }
    setChecking(true);
    setUpdateMsg(t('dashboard.checking'));
    const timeout = setTimeout(() => {
      setUpdateMsg(null);
      setChecking(false);
    }, 15000);
    window.electronAPI.checkForUpdates()
      .then(() => {
        clearTimeout(timeout);
        setUpdateMsg(null);
        setChecking(false);
      })
      .catch(() => {
        clearTimeout(timeout);
        setUpdateMsg(t('dashboard.upToDate'));
        setChecking(false);
        setTimeout(() => setUpdateMsg(null), 2000);
      });
  }, [t, checking]);

  // Stats — computed from history (single pass)
  const stats = useMemo(() => {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 3600 * 1000;

    let totalWords = 0;
    let totalDictationMs = 0;
    let weekWords = 0;
    let weekDictationMs = 0;

    for (const item of history) {
      if (item.error && !item.processedText) continue;
      totalWords += item.wordCount || 0;
      totalDictationMs += item.durationMs || 0;
      if (item.timestamp >= weekAgo) {
        weekWords += item.wordCount || 0;
        weekDictationMs += item.durationMs || 0;
      }
    }

    const totalDictationSec = Math.round(totalDictationMs / 1000);
    const totalDictationMin = Math.round(totalDictationSec / 60);
    const totalHr = Math.floor(totalDictationMin / 60);
    const totalMin = totalDictationMin % 60;

    const typingMinutes = totalWords / 40;
    const savedMinutes = Math.max(0, Math.round(typingMinutes - totalDictationMin));

    const weekDictationMin = weekDictationMs / 60000;
    const avgWPM = weekDictationMin > 0.1 ? Math.round(weekWords / weekDictationMin) : 0;

    return { totalWords, totalHr, totalMin, totalDictationMin, savedMinutes, avgWPM };
  }, [history]);

  const hasStats = stats.totalWords > 0 || stats.totalDictationMin > 0 || stats.avgWPM > 0;

  const recentItems: HistoryItem[] = history.slice(0, 3);

  const hotkey = (globalHotkey || 'CommandOrControl+Shift+Space')
    .replace('CommandOrControl', window.electronAPI?.platform === 'darwin' ? 'Cmd' : 'Ctrl')
    .replace(/\+/g, ' + ');

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-8 space-y-6 max-w-[800px]">

          {/* ── Permission warnings ── */}
          <PermissionWarnings />

          {/* ── Hero ── */}
          <div className="rt-card p-6 overflow-hidden relative">
            {/* Glassmorphic texture overlay */}
            <div className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden">
              <div className="absolute inset-0 opacity-[0.35] dark:opacity-[0.2]"
                style={{
                  background: `
                    radial-gradient(ellipse at 20% 50%, rgba(16,185,129,0.12) 0%, transparent 50%),
                    radial-gradient(ellipse at 80% 30%, rgba(59,130,246,0.10) 0%, transparent 50%),
                    radial-gradient(ellipse at 50% 80%, rgba(139,92,246,0.08) 0%, transparent 50%)
                  `,
                  filter: 'blur(40px)',
                }}
              />
            </div>
            {/* Subtle logo watermark */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-36 h-36 opacity-[0.07] dark:opacity-[0.1] pointer-events-none">
              <img src={logoSrc} className="w-full h-full object-contain" alt="" />
            </div>
            <div className="relative z-10 flex items-start gap-5">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0">
                <img src={logoSrc} className="w-10 h-10 rounded-lg" alt="" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-[22px] font-bold text-surface-900 dark:text-surface-100 tracking-tight leading-tight">
                  {t('dashboard.heroTitle')}
                </h1>
                <p className="mt-1.5 text-sm text-surface-500 dark:text-surface-400 leading-relaxed">
                  {t('dashboard.heroSubtitle', { hotkey: '' })}
                  <kbd className="rt-keycap mx-1.5 align-middle">{hotkey}</kbd>
                </p>
              </div>
            </div>
          </div>

          {/* ── Stats ── */}
          {hasStats && (
            <div className="rt-card overflow-hidden !p-0 relative">
              {/* Large logo watermark spanning the card */}
              <div className="absolute inset-0 flex items-center justify-end pointer-events-none overflow-hidden">
                <img
                  src={logoSrc}
                  className="w-48 h-48 object-contain opacity-[0.08] dark:opacity-[0.12] mr-4"
                  alt=""
                />
              </div>
              <div className="relative z-10 grid grid-cols-2">
                <StatCell
                  label={t('dashboard.totalTime')}
                  value={stats.totalHr > 0 ? `${stats.totalHr} ${t('dashboard.hr')} ${stats.totalMin} ${t('dashboard.min')}` : `${stats.totalMin} ${t('dashboard.min')}`}
                />
                <StatCell
                  label={t('dashboard.totalWords')}
                  value={stats.totalWords >= 1000 ? `${(stats.totalWords / 1000).toFixed(1)}K` : `${stats.totalWords}`}
                  unit={t('dashboard.wordsUnit')}
                  border={`border-l ${STAT_BORDER}`}
                />
                <StatCell
                  label={t('dashboard.timeSaved')}
                  value={stats.savedMinutes > 60 ? `${Math.floor(stats.savedMinutes / 60)} ${t('dashboard.hr')} ${stats.savedMinutes % 60} ${t('dashboard.min')}` : `${stats.savedMinutes} ${t('dashboard.min')}`}
                  border={`border-t ${STAT_BORDER}`}
                />
                <StatCell
                  label={t('dashboard.avgSpeed')}
                  value={`${stats.avgWPM}`}
                  unit="WPM"
                  border={`border-l border-t ${STAT_BORDER}`}
                />
              </div>
            </div>
          )}

          {/* ── Recent transcriptions ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-surface-800 dark:text-surface-200">{t('dashboard.recent')}</h2>
              {recentItems.length > 0 && onNavigate && (
                <button
                  onClick={() => onNavigate('history')}
                  className="text-[13px] text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 transition-colors"
                >
                  {t('dashboard.viewAll')} →
                </button>
              )}
            </div>

            {recentItems.length > 0 ? (
              <div className="rt-card overflow-hidden !p-0">
                {recentItems.map((item, idx) => (
                  <RecentItem
                    key={item.id}
                    item={item}
                    expanded={idx === 0}
                    isLast={idx === recentItems.length - 1}
                    onClick={() => setSelectedItem(item)}
                  />
                ))}
                {onNavigate && (
                  <button
                    onClick={() => onNavigate('history')}
                    className="w-full py-3 text-center text-[13px] text-surface-500 hover:bg-surface-50 dark:hover:bg-surface-850 transition-colors border-t border-surface-100 dark:border-surface-800/50"
                  >
                    {t('dashboard.viewAll')} →
                  </button>
                )}
              </div>
            ) : (
              <div className="rt-card py-10 flex flex-col items-center gap-3">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-surface-300 dark:text-surface-500"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                <p className="text-sm text-surface-400 dark:text-surface-500">{t('dashboard.noRecent')}</p>
                {onNavigate && (
                  <button
                    onClick={() => onNavigate('dictation')}
                    className="mt-1 px-4 py-1.5 text-xs font-medium text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10 rounded-lg hover:bg-brand-100 dark:hover:bg-brand-500/20 transition-colors"
                  >
                    {t('dashboard.startDictation')}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="px-8 py-3 border-t border-surface-100 dark:border-surface-800/30 flex items-center justify-between text-[11px] text-surface-400 dark:text-surface-500 flex-shrink-0">
        <span>Rivertide {version || ''}</span>
        <div className="relative flex items-center gap-2">
          <button
            onClick={handleCheckUpdate}
            disabled={checking}
            className={`text-brand-500 hover:text-brand-400 transition-colors ${checking ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {checking ? t('dashboard.checking') : t('dashboard.checkUpdate')}
          </button>
          {updateMsg && (
            <span
              className="text-brand-500 text-[10px] font-medium animate-fade-in"
            >
              {updateMsg}
            </span>
          )}
        </div>
      </div>

      {/* ── Detail modal ── */}
      {selectedItem && (
        <DetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  );
}

/* ── Stat cell (inside the unified stats card) ── */
const STAT_BORDER = 'border-dashed border-surface-200 dark:border-surface-700/60';
function StatCell({ label, value, unit, border }: { label: string; value: string; unit?: string; border?: string }) {
  return (
    <div className={`px-6 py-5 ${border || ''}`}>
      <div className="text-[11px] text-surface-400 dark:text-surface-500 mb-2 font-medium">
        {label}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="rt-stat-value text-2xl">{value}</span>
        {unit && <span className="text-[13px] text-surface-400 dark:text-surface-500 font-medium">{unit}</span>}
      </div>
    </div>
  );
}

/* ── Recent transcription item ── */
function RecentItem({ item, expanded, isLast, onClick }: { item: HistoryItem; expanded: boolean; isLast: boolean; onClick: () => void }) {
  const { t } = useTranslation();
  const text = item.processedText || item.rawText || (item.error ? friendlyErrorMessage(item.error, t).title : '');
  const ago = formatTimeAgo(item.timestamp, t);
  const dur = item.durationMs ? formatDuration(item.durationMs) : '';

  const iconEl = getAppIcon(item.sourceApp);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-center gap-3.5 px-5 transition-colors hover:bg-surface-50 dark:hover:bg-surface-850 hover:ring-1 hover:ring-brand-500/10 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset outline-none
        ${expanded ? 'py-5' : 'py-3.5'}
        ${!isLast ? 'border-b border-surface-100 dark:border-surface-800/50' : ''}
        ${item.error ? 'border-l-2 border-l-red-400' : ''}`}
    >
      <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-brand-400">
        {iconEl}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`${expanded ? 'text-[14px] line-clamp-2' : 'text-[13px] truncate'} ${item.error ? 'text-red-500' : 'text-surface-700 dark:text-surface-300'}`}>
          {text}
        </p>
        <div className="flex items-center gap-2 mt-1 text-[11px] text-surface-400">
          {item.sourceApp && <span>{item.sourceApp}</span>}
          {item.sourceApp && <span className="opacity-40">·</span>}
          <span>{ago}</span>
        </div>
      </div>
      {dur && (
        <span className="flex-shrink-0 text-[13px] text-surface-400 font-mono">{dur}</span>
      )}
    </button>
  );
}

/* ── Detail modal ── */
function DetailModal({ item, onClose }: { item: HistoryItem; onClose: () => void }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async (text: string) => {
    try {
      if (window.electronAPI) await window.electronAPI.writeClipboard(text);
      else await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const text = item.processedText || item.rawText || '';
  const ago = formatTimeAgo(item.timestamp, t);
  const dur = item.durationMs ? formatDuration(item.durationMs) : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-surface-900 rounded-2xl shadow-xl w-[440px] max-h-[70vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 dark:border-surface-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-brand-400">
              {getAppIcon(item.sourceApp)}
            </div>
            <div>
              <div className="text-sm font-medium text-surface-800 dark:text-surface-200">
                {item.sourceApp || t('history.detailTitle')}
              </div>
              <div className="text-[11px] text-surface-400">{ago}{dur ? ` · ${dur}` : ''}</div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 flex items-center justify-center text-surface-400 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {item.processedText && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-surface-400 mb-2">{t('history.finalOutput')}</div>
              <p className="text-[14px] text-surface-800 dark:text-surface-200 leading-relaxed whitespace-pre-wrap">{item.processedText}</p>
            </div>
          )}
          {item.rawText && item.processedText && item.rawText !== item.processedText && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-surface-400 mb-2">{t('history.rawTranscription')}</div>
              <p className="text-[13px] text-surface-500 leading-relaxed whitespace-pre-wrap">{item.rawText}</p>
            </div>
          )}
          {item.error && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-red-400 mb-2">{friendlyErrorMessage(item.error, t).title}</div>
              <p className="text-[13px] text-red-500">{friendlyErrorMessage(item.error, t).detail}</p>
            </div>
          )}
        </div>

        {text && (
          <div className="px-6 py-3 border-t border-surface-100 dark:border-surface-800 flex justify-end">
            <button
              onClick={() => handleCopy(text)}
              className="px-4 py-1.5 rounded-lg bg-surface-100 dark:bg-surface-800 text-[13px] text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
            >
              {copied ? t('recording.copied') : t('recording.copy')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Helpers ── */
function getAppIcon(sourceApp?: string): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="22"/>
    </svg>
  );
}

function formatDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatTimeAgo(ts: number, t: (key: string, params?: Record<string, any>) => string): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('history.justNow');
  if (mins < 60) return t('history.mAgo', { n: mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t('history.hAgo', { n: hrs });
  const days = Math.floor(hrs / 24);
  if (days === 1) return t('history.yesterday');
  return `${days}d`;
}
