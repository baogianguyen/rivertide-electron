import { useTranslation } from '../i18n';

export function ChatPage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-surface-200 dark:border-surface-800/60">
        <h1 className="text-[17px] font-semibold text-surface-900 dark:text-surface-100">
          {t('chat.title')}
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="rt-card p-8 text-center max-w-md w-full">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-500/10 mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-brand-500">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="10" r="3" strokeWidth="1.5"/>
              <path d="M15.5 7.5a1.5 1.5 0 1 1 0-3" strokeWidth="1.2"/>
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-surface-800 dark:text-surface-200">{t('chat.ctaTitle')}</h2>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-2 leading-relaxed">{t('chat.ctaDesc')}</p>
          <div className="flex gap-3 justify-center mt-5">
            <a
              href="https://codethecure.app/signin"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors"
            >
              {t('chat.ctaSignIn')}
            </a>
            <a
              href="https://codethecure.app/signup"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 text-sm font-medium hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
            >
              {t('chat.ctaSignUp')}
            </a>
          </div>
          <div className="mt-6 pt-5 border-t border-surface-200 dark:border-surface-700/60 space-y-3">
            <p className="text-xs text-surface-500 dark:text-surface-400 leading-relaxed">
              {t('chat.ctaComingSoon')}
            </p>
            <p className="text-[11px] text-surface-400 dark:text-surface-500 leading-relaxed">
              {t('chat.ctaPrivacy')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
