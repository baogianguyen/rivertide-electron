import { useTranslation } from '../i18n';

interface Props {
  onClose?: () => void;
}

export function PrivacyPolicy({ onClose }: Props) {
  const { t } = useTranslation();

  return (
    <div className="text-sm text-surface-700 dark:text-surface-300 space-y-4 leading-relaxed">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-semibold text-surface-900 dark:text-surface-100">Privacy Policy</h2>
        {onClose && (
          <button onClick={onClose} className="text-xs text-surface-400 hover:text-surface-600 transition-colors">
            {t('common.close')}
          </button>
        )}
      </div>
      <p className="text-surface-500 text-xs">Last updated: August 2026</p>

      <section>
        <h3 className="font-medium text-surface-800 dark:text-surface-200 mt-4 mb-1">1. What data we collect and why</h3>
        <p>
          Rivertide processes voice recordings to provide dictation and transcription services. Your audio is sent to an
          external speech-to-text API and a language model API (such as Groq) for post-processing. These providers
          process your audio and text solely to produce the transcription result.
        </p>
      </section>

      <section>
        <h3 className="font-medium text-surface-800 dark:text-surface-200 mt-4 mb-1">2. Where data is stored</h3>
        <p>
          All dictation history, personal dictionary entries, knowledge graph data, and chat history are stored
          <strong> locally on your device</strong> in the application's data directory. We operate no servers and do not
          collect or store any user data ourselves. Audio recordings are saved as WAV files on your local storage, not on
          any remote server.
        </p>
      </section>

      <section>
        <h3 className="font-medium text-surface-800 dark:text-surface-200 mt-4 mb-1">3. Data sent to external APIs</h3>
        <p>
          When you use dictation, the following data is sent to third-party API providers you have configured:
        </p>
        <ul className="list-disc pl-5 space-y-1 mt-2 text-surface-600 dark:text-surface-400">
          <li><strong>Audio recordings</strong> - sent to your configured STT provider for speech recognition</li>
          <li><strong>Transcribed text</strong> - sent to your configured LLM provider for post-processing (filler removal,
          punctuation, tone adjustment) and, when chat is used, for generating responses</li>
        </ul>
        <p className="mt-2">
          These providers may process data in accordance with their own privacy policies. We select providers that do not
          use customer API data for model training.
        </p>
      </section>

      <section>
        <h3 className="font-medium text-surface-800 dark:text-surface-200 mt-4 mb-1">4. What we do NOT collect</h3>
        <ul className="list-disc pl-5 space-y-1 mt-2 text-surface-600 dark:text-surface-400">
          <li>We do not collect usage analytics or telemetry</li>
          <li>We do not track your behavior across apps</li>
          <li>We do not sell or share your data with advertisers</li>
          <li>We do not use your data to train any AI models</li>
          <li>We do not operate cloud servers that store your information</li>
        </ul>
      </section>

      <section>
        <h3 className="font-medium text-surface-800 dark:text-surface-200 mt-4 mb-1">5. Data retention and control</h3>
        <p>
          You have full control over your data through the app's settings:
        </p>
        <ul className="list-disc pl-5 space-y-1 mt-2 text-surface-600 dark:text-surface-400">
          <li>You can disable history saving entirely</li>
          <li>You can set automatic retention periods (1 hour to forever)</li>
          <li>You can clear all local data at any time</li>
          <li>You can delete individual history items</li>
          <li>You can export or download audio recordings before deletion</li>
        </ul>
      </section>

      <section>
        <h3 className="font-medium text-surface-800 dark:text-surface-200 mt-4 mb-1">6. Permissions</h3>
        <p>
          Rivertide requires microphone access for dictation. Optional features may request accessibility permissions
          (for reading selected text) and screen recording permissions (for screen context / OCR). These permissions are
          managed by your operating system and can be revoked at any time through System Settings.
        </p>
      </section>

      <section>
        <h3 className="font-medium text-surface-800 dark:text-surface-200 mt-4 mb-1">7. Changes to this policy</h3>
        <p>
          We may update this Privacy Policy from time to time. Updates will be communicated through the application.
        </p>
      </section>

      <section className="pt-2 border-t border-surface-200 dark:border-surface-700/60">
        <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-1">Contact</h3>
        <p className="text-surface-500 text-xs">
          Questions about this privacy policy? Reach out at{' '}
          <a href="https://www.codethecure.app/contact" target="_blank" rel="noopener noreferrer" className="text-brand-500 hover:text-brand-400 underline underline-offset-2">codethecure.app/contact</a>.
        </p>
      </section>
    </div>
  );
}
