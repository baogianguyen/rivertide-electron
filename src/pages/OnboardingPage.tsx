import { useState, useEffect } from 'react';
import { useConfigStore } from '../stores/configStore';
import { PrivacyPolicy } from '../components/PrivacyPolicy';
import { TermsOfService } from '../components/TermsOfService';
import logoSrc from '../assets/logo.png';

type Step = 'welcome' | 'name' | 'diagnosis' | 'found' | 'legal' | 'done' | 'personalizing';

export function OnboardingPage({ onComplete }: { onComplete: () => void }) {
  const set = useConfigStore((s) => s.set);
  const addKnowledgeNode = useConfigStore((s) => s.addKnowledgeNode);

  const [step, setStep] = useState<Step>('welcome');
  const [name, setName] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [diagnosisStage, setDiagnosisStage] = useState('');
  const [howFound, setHowFound] = useState('');
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedTos, setAcceptedTos] = useState(false);
  const [acknowledgedData, setAcknowledgedData] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTos, setShowTos] = useState(false);

  const canProceed = () => {
    switch (step) {
      case 'welcome': return true;
      case 'name': return name.trim().length > 0;
      case 'diagnosis': return true;
      case 'found': return true;
      case 'legal': return acceptedPrivacy && acceptedTos && acknowledgedData;
      case 'done': return true;
      case 'personalizing': return false;
    }
  };

  const handleNext = () => {
    if (!canProceed()) return;
    if (step === 'welcome') setStep('name');
    else if (step === 'name') setStep('diagnosis');
    else if (step === 'diagnosis') setStep('found');
    else if (step === 'found') setStep('legal');
    else if (step === 'legal') handleComplete();
  };

  // When done step's "Get Started" is clicked, show personalizing delay
  const handleGetStarted = () => {
    setStep('personalizing');
  };

  // After 3 seconds on personalizing, complete
  useEffect(() => {
    if (step === 'personalizing') {
      const timer = setTimeout(() => handleComplete(), 3000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const handleComplete = () => {
    if (name.trim()) {
      addKnowledgeNode({
        label: 'Preferred Name',
        content: `The user prefers to be called "${name.trim()}" by Rivertide.`,
        category: 'personal',
        source: 'manual',
      });
    }
    if (diagnosis.trim()) {
      const stageText = diagnosisStage.trim() ? ` (${diagnosisStage.trim()})` : '';
      addKnowledgeNode({
        label: 'Health Condition',
        content: `Diagnosed with ${diagnosis.trim()}${stageText}.`,
        category: 'health',
        source: 'manual',
      });
    }
    if (howFound.trim()) {
      addKnowledgeNode({
        label: 'How Found Rivertide',
        content: `Heard about Rivertide via: ${howFound.trim()}.`,
        category: 'other',
        source: 'manual',
      });
    }

    set('onboardingCompleted', true);
    onComplete();
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-surface-50 to-surface-100 dark:from-surface-950 dark:to-surface-900">
      {/* Privacy/ToS Modals */}
      {showPrivacy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowPrivacy(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-surface-900 rounded-2xl shadow-xl border border-surface-200 dark:border-surface-800 w-[560px] max-h-[75vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <PrivacyPolicy onClose={() => setShowPrivacy(false)} />
          </div>
        </div>
      )}
      {showTos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowTos(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-surface-900 rounded-2xl shadow-xl border border-surface-200 dark:border-surface-800 w-[560px] max-h-[75vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <TermsOfService onClose={() => setShowTos(false)} />
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className="px-8 pt-6">
        <div className="flex items-center gap-2 mb-1">
          <img src={logoSrc} className="w-5 h-5 rounded" alt="" />
          <span className="text-sm font-bold text-surface-900 dark:text-surface-100 tracking-tight">Rivertide</span>
        </div>
        <div className="flex gap-1 mt-4">
          {['welcome', 'name', 'diagnosis', 'found', 'legal'].map((s) => {
            const stepIndex = ['welcome', 'name', 'diagnosis', 'found', 'legal'].indexOf(s);
            const currentIndex = ['welcome', 'name', 'diagnosis', 'found', 'legal'].indexOf(step as string);
            const filled = stepIndex <= currentIndex || (step === 'done');
            const active = stepIndex === currentIndex;
            return (
              <div
                key={s}
                className={`flex-1 h-1 rounded-full transition-all duration-500 ${
                  filled ? 'bg-brand-500' : 'bg-surface-200 dark:bg-surface-700'
                } ${active ? 'shadow-sm shadow-brand-500/30' : ''}`}
              />
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="w-full max-w-md">
          {step === 'welcome' && (
            <div className="text-center space-y-6 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center mx-auto border border-brand-500/10">
                <img src={logoSrc} className="w-10 h-10 rounded" alt="" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100 tracking-tight">
                  Welcome to Rivertide
                </h1>
                <p className="text-sm text-surface-500 dark:text-surface-400 mt-3 leading-relaxed">
                  Your personal voice assistant designed to help you manage the cognitive load of treatment.
                  Let's get to know each other so I can give you better, more personalized responses.
                </p>
              </div>
              {/* Privacy disclaimer */}
              <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20 rounded-xl px-5 py-4 text-left space-y-2.5">
                <div className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-600 dark:text-emerald-400 shrink-0">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide">Your Privacy</span>
                </div>
                <p className="text-[13px] text-emerald-900 dark:text-emerald-200 leading-relaxed">
                  All transcription, data storage, and audio recordings remain <strong>100% local</strong> and are never stored on our servers.
                </p>
                <p className="text-[12px] text-emerald-700 dark:text-emerald-300/80 leading-relaxed">
                  The only cloud interactions occur during AI chat and optional LLM text polishing, both of which can be disabled in Settings.
                  AI chat history and dictations are strictly stored locally. Please note that AI can make mistakes.
                </p>
              </div>
            </div>
          )}

          {step === 'name' && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
                  What should I call you?
                </h2>
                <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
                  Your first name, a nickname, whatever feels right.
                </p>
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex"
                className="w-full px-4 py-3 rounded-xl bg-white dark:bg-surface-800 text-surface-800 dark:text-surface-200 border border-surface-200 dark:border-surface-700/60 focus:outline-none focus:ring-2 focus:ring-brand-500/30 text-sm placeholder-surface-400 dark:placeholder-surface-500"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleNext()}
              />
            </div>
          )}

          {step === 'diagnosis' && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
                  Anything about your health you'd like to share?
                </h2>
                <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
                  This helps me personalize responses and track what matters to you. <em>Optional.</em>
                </p>
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="e.g. Breast cancer, ADHD, diabetes..."
                  className="w-full px-4 py-3 rounded-xl bg-white dark:bg-surface-800 text-surface-800 dark:text-surface-200 border border-surface-200 dark:border-surface-700/60 focus:outline-none focus:ring-2 focus:ring-brand-500/30 text-sm placeholder-surface-400 dark:placeholder-surface-500"
                  autoFocus
                />
                <input
                  type="text"
                  value={diagnosisStage}
                  onChange={(e) => setDiagnosisStage(e.target.value)}
                  placeholder="Stage (optional)"
                  className="w-full px-4 py-3 rounded-xl bg-white dark:bg-surface-800 text-surface-800 dark:text-surface-200 border border-surface-200 dark:border-surface-700/60 focus:outline-none focus:ring-2 focus:ring-brand-500/30 text-sm placeholder-surface-400 dark:placeholder-surface-500"
                />
              </div>
            </div>
          )}

          {step === 'found' && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
                  How did you hear about Rivertide?
                </h2>
                <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
                  Helps us understand where our community finds us. <em>Optional.</em>
                </p>
              </div>
              <input
                type="text"
                value={howFound}
                onChange={(e) => setHowFound(e.target.value)}
                placeholder="e.g. Doctor recommended, online search, friend..."
                className="w-full px-4 py-3 rounded-xl bg-white dark:bg-surface-800 text-surface-800 dark:text-surface-200 border border-surface-200 dark:border-surface-700/60 focus:outline-none focus:ring-2 focus:ring-brand-500/30 text-sm placeholder-surface-400 dark:placeholder-surface-500"
                autoFocus
              />
            </div>
          )}

          {step === 'legal' && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
                  One last thing
                </h2>
                <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
                  Please review and accept the following before we start.
                </p>
              </div>

              <div className="space-y-3 bg-white dark:bg-surface-850 rounded-xl border border-surface-200 dark:border-surface-700/60 p-4">
                {/* Privacy Policy */}
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={acceptedPrivacy}
                    onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-surface-300 dark:border-surface-600 text-brand-500 focus:ring-brand-500/30"
                  />
                  <div className="flex-1">
                    <span className="text-sm text-surface-700 dark:text-surface-300">
                      I have read and accept the{' '}
                      <button
                        onClick={(e) => { e.preventDefault(); setShowPrivacy(true); }}
                        className="text-brand-500 hover:text-brand-400 underline underline-offset-2"
                      >
                        Privacy Policy
                      </button>
                    </span>
                  </div>
                </label>

                {/* Terms of Service */}
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={acceptedTos}
                    onChange={(e) => setAcceptedTos(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-surface-300 dark:border-surface-600 text-brand-500 focus:ring-brand-500/30"
                  />
                  <div className="flex-1">
                    <span className="text-sm text-surface-700 dark:text-surface-300">
                      I have read and accept the{' '}
                      <button
                        onClick={(e) => { e.preventDefault(); setShowTos(true); }}
                        className="text-brand-500 hover:text-brand-400 underline underline-offset-2"
                      >
                        Terms of Service
                      </button>
                    </span>
                  </div>
                </label>

                {/* Data Acknowledgement */}
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={acknowledgedData}
                    onChange={(e) => setAcknowledgedData(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-surface-300 dark:border-surface-600 text-brand-500 focus:ring-brand-500/30"
                  />
                  <div className="flex-1">
                    <span className="text-sm text-surface-700 dark:text-surface-300">
                      I understand that all transcription, data storage, and audio recordings remain 100% local and are never stored on Rivertide servers.
                      The only cloud interactions are AI chat (optional) and LLM text polishing (can be disabled in Settings).
                      AI chat history and dictations are stored strictly locally, not on any server.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center space-y-6 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mx-auto border border-emerald-500/10">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100 tracking-tight">
                  You're all set{name ? `, ${name.trim()}` : ''}!
                </h1>
                <p className="text-sm text-surface-500 dark:text-surface-400 mt-3 leading-relaxed">
                  Everything you shared is saved to your personal knowledge. You can edit or delete
                  anything anytime. Press <kbd className="inline-block mx-0.5 px-1.5 py-0.5 bg-white dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded text-[11px] font-mono shadow-sm">{window.electronAPI?.platform === 'darwin' ? 'Cmd+Shift+Space' : 'Ctrl+Shift+Space'}</kbd> to start dictating.
                </p>
              </div>
            </div>
          )}

          {step === 'personalizing' && (
            <div className="text-center space-y-6 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center mx-auto border border-brand-500/10">
                <svg className="animate-spin text-brand-500" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeDasharray="31.4 31.4" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-surface-900 dark:text-surface-100 tracking-tight">
                  Personalizing your experience...
                </h1>
                <p className="text-sm text-surface-500 dark:text-surface-400 mt-3 leading-relaxed">
                  Setting up your knowledge graph and preferences.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer with navigation */}
      <div className="px-8 py-6 flex items-center justify-between">
        <div className="text-xs text-surface-400">
          {(step === 'welcome' || step === 'personalizing') ? '' : `${['welcome', 'name', 'diagnosis', 'found', 'legal'].indexOf(step as string) + 1} of 5`}
        </div>
        <div className="flex gap-3">
          {(step !== 'done' && step !== 'personalizing') && (
            <>
              {step !== 'welcome' && (
                <button
                  onClick={() => {
                    const steps: Step[] = ['welcome', 'name', 'diagnosis', 'found', 'legal'];
                    const idx = steps.indexOf(step);
                    setStep(steps[Math.max(0, idx - 1)]);
                  }}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                >
                  Back
                </button>
              )}
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  canProceed()
                    ? 'bg-brand-500 text-white hover:bg-brand-600 shadow-sm shadow-brand-500/20'
                    : 'bg-surface-200 dark:bg-surface-700 text-surface-400 dark:text-surface-500 cursor-not-allowed'
                }`}
              >
                Continue
              </button>
            </>
          )}
          {step === 'done' && (
            <button
              onClick={handleGetStarted}
              className="px-8 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 shadow-sm shadow-brand-500/20 transition-all"
            >
              Get Started
            </button>
          )}
          {step === 'personalizing' && (
            <button
              disabled
              className="px-8 py-2.5 rounded-xl bg-brand-500/60 text-white text-sm font-medium cursor-not-allowed"
            >
              <span className="flex items-center gap-2">
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" strokeDasharray="31.4 31.4" strokeLinecap="round"/>
                </svg>
                Personalizing your experience...
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
