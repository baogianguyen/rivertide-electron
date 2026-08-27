import { useTranslation } from '../i18n';

interface Props {
  onClose?: () => void;
}

export function TermsOfService({ onClose }: Props) {
  const { t } = useTranslation();

  return (
    <div className="text-sm text-surface-700 dark:text-surface-300 space-y-4 leading-relaxed">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-semibold text-surface-900 dark:text-surface-100">Terms of Service</h2>
        {onClose && (
          <button onClick={onClose} className="text-xs text-surface-400 hover:text-surface-600 transition-colors">
            {t('common.close')}
          </button>
        )}
      </div>
      <p className="text-surface-500 text-xs">Last updated: August 2026</p>

      <section>
        <h3 className="font-medium text-surface-800 dark:text-surface-200 mt-4 mb-1">1. Acceptance of Terms</h3>
        <p>
          By using Rivertide, you agree to these Terms of Service. If you do not agree, do not use the application.
        </p>
      </section>

      <section>
        <h3 className="font-medium text-surface-800 dark:text-surface-200 mt-4 mb-1">2. Description of Service</h3>
        <p>
          Rivertide is a voice dictation and AI assistant desktop application that:
        </p>
        <ul className="list-disc pl-5 space-y-1 mt-2 text-surface-600 dark:text-surface-400">
          <li>Converts speech to text using a local Whisper model (offline) or third-party API providers</li>
          <li>Processes and polishes transcribed text using language models</li>
          <li>Provides a knowledge graph for personal information storage</li>
          <li>Offers an AI chat interface that may access your knowledge graph</li>
        </ul>
      </section>

      <section>
        <h3 className="font-medium text-surface-800 dark:text-surface-200 mt-4 mb-1">3. User Responsibilities</h3>
        <ul className="list-disc pl-5 space-y-1 mt-2 text-surface-600 dark:text-surface-400">
          <li>You are responsible for providing your own API keys for third-party services (if used)</li>
          <li>You must comply with the terms of service of any API providers you configure</li>
          <li>You should not dictate sensitive information you are not comfortable sharing with API providers</li>
          <li>You are responsible for maintaining the confidentiality of your API keys</li>
        </ul>
      </section>

      <section>
        <h3 className="font-medium text-surface-800 dark:text-surface-200 mt-4 mb-1">4. Third-Party Services</h3>
        <p>
          Rivertide acts as a client to third-party API services. Your use of these services is subject to their
          respective terms.
        </p>
      </section>

      <section>
        <h3 className="font-medium text-surface-800 dark:text-surface-200 mt-4 mb-1">5. Medical Disclaimer</h3>
        <p className="text-surface-600 dark:text-surface-400 bg-amber-50 dark:bg-amber-900/10 border border-amber-200/60 dark:border-amber-700/30 rounded-lg px-4 py-3">
          <strong className="text-surface-800 dark:text-surface-200">Important:</strong> Rivertide is not a medical device
          and has not been evaluated by the FDA or any other regulatory body. It is a productivity tool designed to help
          with medical documentation and task management. It does not provide medical advice, diagnosis, or treatment.
          Always consult your healthcare provider for medical decisions. Never rely solely on AI-generated summaries or
          suggestions for critical health decisions.
        </p>
      </section>

      <section>
        <h3 className="font-medium text-surface-800 dark:text-surface-200 mt-4 mb-1">6. Limitation of Liability</h3>
        <p>
          Rivertide is provided "as is" without warranty of any kind. The developers shall not be liable for any damages
          arising from the use or inability to use the application, including but not limited to data loss, transcription
          errors, or reliance on AI-generated content.
        </p>
      </section>

      <section>
        <h3 className="font-medium text-surface-800 dark:text-surface-200 mt-4 mb-1">7. Intellectual Property</h3>
        <p>
          Rivertide is an open-source application. The code is publicly available. Your data, including transcriptions,
          dictionary entries, knowledge graph facts, and settings, belongs to you.
        </p>
      </section>

      <section>
        <h3 className="font-medium text-surface-800 dark:text-surface-200 mt-4 mb-1">8. Changes to Terms</h3>
        <p>
          We may update these terms. Continued use after changes constitutes acceptance of the new terms.
        </p>
      </section>
    </div>
  );
}
