import { useConfigStore } from '../../stores/configStore';
import { Toggle } from '../../components/ui';
import { useTranslation } from '../../i18n';

export function AdvancedSettings() {
  const { config, set } = useConfigStore();
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <Toggle
        checked={config.llmPostProcessing}
        onChange={(v) => set('llmPostProcessing', v)}
        label={t('settings.advanced.llmPostProcessing')}
        description={t('settings.advanced.llmPostProcessingDesc')}
      />

      {config.llmPostProcessing && (<>
      <Toggle
        checked={config.fillerWordRemoval}
        onChange={(v) => set('fillerWordRemoval', v)}
        label={t('settings.advanced.fillerRemoval')}
        description={t('settings.advanced.fillerDesc')}
      />

      <Toggle
        checked={config.repetitionElimination}
        onChange={(v) => set('repetitionElimination', v)}
        label={t('settings.advanced.repetition')}
        description={t('settings.advanced.repetitionDesc')}
      />

      <Toggle
        checked={config.selfCorrectionDetection}
        onChange={(v) => set('selfCorrectionDetection', v)}
        label={t('settings.advanced.selfCorrection')}
        description={t('settings.advanced.selfCorrectionDesc')}
      />

      <Toggle
        checked={config.autoFormatting}
        onChange={(v) => set('autoFormatting', v)}
        label={t('settings.advanced.autoFormat')}
        description={t('settings.advanced.autoFormatDesc')}
      />
      </>)}

      <Toggle
        checked={config.knowledgeGraphEnabled}
        onChange={(v) => set('knowledgeGraphEnabled', v)}
        label={t('settings.advanced.knowledgeGraphTitle')}
        description={t('settings.advanced.knowledgeGraphDesc')}
      />
      {config.knowledgeGraphEnabled && (
        <div className="flex items-center gap-2 pl-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500 shrink-0">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <span className="text-xs text-emerald-600 dark:text-emerald-400">{t('settings.advanced.knowledgeGraphPrivacy')}</span>
        </div>
      )}

      <Toggle
        checked={config.voiceAnalyticsEnabled}
        onChange={(v) => set('voiceAnalyticsEnabled', v)}
        label={t('settings.advanced.voiceAnalytics')}
        description={t('settings.advanced.voiceAnalyticsDesc')}
      />
    </div>
  );
}
