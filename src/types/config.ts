/**
 * Central configuration types for OpenType.
 * All persistent settings flow through this type system.
 */

// ─── Constants ──────────────────────────────────────────────────────────────

/** Groq API endpoint (hardcoded) */
export const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

/** Groq model to use for LLM post-processing */
export const GROQ_MODEL = 'openai/gpt-oss-20b';

/** Favourite local Whisper model (GGML format) */
export const WHISPER_MODEL = 'ggml-small.bin';
export const WHISPER_MODEL_DISPLAY = 'Whisper Small (GGML)';
export const WHISPER_MODEL_URL =
  'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin';
export const WHISPER_MODEL_SIZE_MB = 465; // approximate, for progress display

// ─── Tone Rules ─────────────────────────────────────────────────────────────

export type TonePreset = 'professional' | 'casual' | 'technical' | 'friendly' | 'custom';

export interface ToneRule {
  appPattern: string;       // substring match on active window title / app name
  tone: TonePreset;
  customPrompt?: string;    // only used when tone === 'custom'
}

// ─── History ────────────────────────────────────────────────────────────────

export type HistoryRetention = 'forever' | '30d' | '7d' | '24h' | '1h';

export interface HistoryContext {
  // L0: Basic window info (no special permissions)
  appName?: string;
  windowTitle?: string;
  bundleId?: string;           // macOS bundle identifier
  url?: string;                // browser URL if applicable

  // L1: Accessibility data (requires accessibility permission)
  selectedText?: string;       // AXSelectedText
  fieldText?: string;          // AXValue — full content of focused input field
  fieldRole?: string;          // AXRole — TextField, TextArea, WebArea, etc.
  fieldRoleDescription?: string; // AXRoleDescription — "text field", "search field", "text area"
  fieldLabel?: string;           // AXDescription or AXTitle — field's accessible label
  fieldPlaceholder?: string;     // AXPlaceholderValue — "Type a message...", "Search..."
  cursorPosition?: number;       // cursor position (from AXSelectedTextRange when length=0)
  selectionRange?: { location: number; length: number }; // AXSelectedTextRange
  numberOfCharacters?: number;   // AXNumberOfCharacters — total chars in field
  insertionLineNumber?: number;  // AXInsertionPointLineNumber — cursor line number

  // Clipboard
  clipboardText?: string;      // clipboard content at capture time

  // Recent transcriptions (last few for continuity context)
  recentTranscriptions?: string[];

  // OCR: Screen analysis
  screenContext?: string;      // VLM description of screen content
  screenshotPath?: string;     // file path to saved screenshot
  ocrDurationMs?: number;      // how long OCR took

  // Feature flags at capture time
  contextL0Enabled?: boolean;
  contextL1Enabled?: boolean;
  contextOcrEnabled?: boolean;

  // LLM pipeline
  systemPrompt?: string;       // the system prompt sent to LLM
  sttModel?: string;           // STT model name (local whisper)
  llmModel?: string;           // LLM model name (groq)

  // Pipeline timing
  sttDurationMs?: number;      // how long STT took
  llmDurationMs?: number;      // how long LLM post-processing took
}

// ─── Speech Analysis ──────────────────────────────────────────────────────────

/**
 * Cognitive wellness analytics derived from dictation text.
 *
 * ⚠ NOT a medical diagnosis — for personal tracking only.
 * These metrics are heuristic approximations computed via LLM analysis
 * of transcribed speech patterns. They are not clinically validated.
 */
export interface SpeechAnalysis {
  /** Aggregate wellness score 0–100 (higher = better). NOT a medical diagnosis. */
  overallScore: number;

  /** Fluency: filler words, hesitations, smoothness of delivery (0–100) */
  fluency: number;
  /** Lexical diversity: vocabulary richness, type-token ratio (0–100) */
  lexicalDiversity: number;
  /** Syntactic complexity: sentence structure variety (0–100) */
  syntacticComplexity: number;
  /** Coherence: topic maintenance, logical connectors (0–100) */
  coherence: number;
  /** Clarity: self-corrections, articulation precision (0–100) */
  clarity: number;

  /** Detailed breakdown */
  details: {
    fillerWordCount: number;
    repetitionCount: number;
    selfCorrectionCount: number;
    avgSentenceLength: number;
    uniqueWordRatio: number;     // type-token ratio (0–1)
    speakingWpm: number;         // estimated words per minute
    vocabularyLevel: 'basic' | 'intermediate' | 'advanced';
  };

  /** Trend vs personal baseline */
  trend: {
    direction: 'improving' | 'stable' | 'declining' | 'unknown';
    comparisonToBaseline: number; // percentage points vs personal average
  };

  /** Unix timestamp when analysis was performed */
  analyzedAt: number;

  /**
   * Fixed sentinel – always "NOT_A_DIAGNOSIS".
   * Present on every analysis object as a runtime reminder.
   */
  disclaimer: 'NOT_A_DIAGNOSIS';
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  rawText: string;
  processedText: string;
  durationMs: number;
  sourceApp?: string;
  windowTitle?: string;
  language?: string;
  wordCount: number;
  audioPath?: string;        // file path to saved WAV audio
  error?: string;            // error message if transcription failed
  context?: HistoryContext;   // full pipeline context for detail view
  analysis?: SpeechAnalysis;  // cognitive wellness analysis (async, may be absent initially)
}

// ─── Dictionary Entry ───────────────────────────────────────────────────────

export interface DictionaryEntry {
  word: string;
  source: 'manual' | 'auto-llm' | 'auto-diff';
  addedAt?: number;  // Unix timestamp ms
}

// ─── Knowledge Graph ─────────────────────────────────────────

export interface KnowledgeNode {
  id: string;
  label: string;
  content: string;
  category: string;
  source: 'manual' | 'auto-llm';
  createdAt: number;
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// ─── Full App Config ────────────────────────────────────────────────────────

export interface AppConfig {
  // Speech-to-Text
  localWhisperModelDownloaded: boolean;  // has the local whisper model been downloaded?
  /** @deprecated Will be removed after first migration, only used to track legacy state */
  sttProvider: string;
  /** @deprecated Will be removed after first migration */
  providers: Record<string, { apiKey: string; baseUrl: string; sttModel: string; llmModel: string }>;

  // LLM (Groq only)
  groqApiKey: string;

  // General
  theme: 'system' | 'dark' | 'light';
  uiLanguage: string;           // 'auto', 'en', 'zh'
  launchOnStartup: boolean;
  inputMode: 'push-to-talk' | 'toggle';
  alsoWriteClipboard: boolean;

  // Hotkey
  globalHotkey: string;
  pushToTalkKey: string;
  pasteLastKey: string;

  // Audio
  selectedMicrophoneId: string;    // '' = default
  soundEnabled: boolean;           // play beep on recording start/stop
  muteSystemAudio: boolean;        // mute system audio during recording (macOS)

  // Tone Rules
  toneRules: ToneRule[];
  defaultTone: TonePreset;

  // Privacy
  historyEnabled: boolean;
  historyRetention: HistoryRetention;

  // Advanced
  llmPostProcessing: boolean;    // master switch: enable LLM post-processing of STT output
  autoFormatting: boolean;
  selfCorrectionDetection: boolean;
  fillerWordRemoval: boolean;
  repetitionElimination: boolean;

  // Context Awareness
  contextL0Enabled: boolean;       // L0: active window metadata
  contextL1Enabled: boolean;       // L1: selected text via Accessibility
  contextOcrEnabled: boolean;      // Screen OCR via VLM
  contextOcrModel: string;         // VLM model for OCR (still used by legacy users)

  // Auto-learning
  autoLearnDictionary: boolean;    // auto-add corrected terms to dictionary

  // Knowledge graph auto-extraction
  knowledgeGraphEnabled: boolean;  // auto-extract knowledge graph facts from dictations

  // Voice analytics
  voiceAnalyticsEnabled: boolean;  // enable speech analysis and wellness tracking

  // Onboarding
  onboardingCompleted: boolean;    // has the user completed first-time onboarding?

  // Personal dictionary
  personalDictionary: DictionaryEntry[];

  // Knowledge graph
  knowledgeGraph: KnowledgeNode[];

  // History data
  history: HistoryItem[];
}

export const DEFAULT_CONFIG: AppConfig = {
  localWhisperModelDownloaded: false,
  sttProvider: 'local',
  providers: {},

  groqApiKey: '',

  theme: 'light',
  uiLanguage: 'auto',
  launchOnStartup: false,
  inputMode: 'toggle',
  alsoWriteClipboard: false,

  globalHotkey: 'CommandOrControl+Shift+Space',
  pushToTalkKey: 'CommandOrControl+Shift+R',
  pasteLastKey: 'CommandOrControl+Shift+V',

  selectedMicrophoneId: '',
  soundEnabled: true,
  muteSystemAudio: true,

  toneRules: [
    { appPattern: 'gmail', tone: 'professional' },
    { appPattern: 'outlook', tone: 'professional' },
    { appPattern: 'slack', tone: 'casual' },
    { appPattern: 'discord', tone: 'friendly' },
    { appPattern: 'vscode', tone: 'technical' },
    { appPattern: 'code', tone: 'technical' },
    { appPattern: 'terminal', tone: 'technical' },
    { appPattern: 'wechat', tone: 'casual' },
  ],
  defaultTone: 'professional',

  historyEnabled: true,
  historyRetention: 'forever',

  llmPostProcessing: true,
  autoFormatting: true,
  selfCorrectionDetection: true,
  fillerWordRemoval: true,
  repetitionElimination: true,

  contextL0Enabled: false,
  contextL1Enabled: false,
  contextOcrEnabled: false,
  contextOcrModel: '',

  autoLearnDictionary: true,
  knowledgeGraphEnabled: true,
  voiceAnalyticsEnabled: true,
  onboardingCompleted: false,

  personalDictionary: [],

  knowledgeGraph: [],

  history: [],
};
