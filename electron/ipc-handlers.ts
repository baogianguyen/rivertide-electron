import { app, ipcMain, clipboard, globalShortcut, systemPreferences, screen, shell } from 'electron';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { state, isMac } from './app-state';
import { errMsg } from './utils';
import { registerShortcuts, toggleRecording } from './shortcut-manager';
import { restartFnMonitor } from './fn-monitor';
import { schedulePostPipelineExtraction, recordTypedText } from './auto-dict';
import { schedulePostPipelineKG } from './knowledge-graph-extractor';
import { restoreSystemAudio } from './audio-control';
import { GROQ_MODEL } from '../src/types/config';

// ─── Module state ───────────────────────────────────────────────────────────

let pipelineRunning = false;
let pipelineStartedAt = 0;
const PIPELINE_TIMEOUT_MS = 60_000;

export function setupIPC() {
  // ─── Config ──────────────────────────────────────────────────────────────
  ipcMain.handle('config:get', (_e, key: string) => state.configStore!.get(key as any));
  ipcMain.handle('config:set', (event, key: string, val: any) => {
    state.configStore!.set(key as any, val);
    if (key === 'launchOnStartup') {
      app.setLoginItemSettings({ openAtLogin: !!val });
    }
    if (key === 'history') {
      const senderId = event.sender.id;
      for (const win of [state.mainWindow, state.overlayWindow]) {
        if (win && !win.isDestroyed() && win.webContents.id !== senderId) {
          win.webContents.send('config:history-updated', val);
        }
      }
    }
    return true;
  });
  ipcMain.handle('config:getAll', () => state.configStore!.getAll());

  // ─── Whisper Model Management ────────────────────────────────────────────

  ipcMain.handle('whisper:isDownloaded', () => {
    return state.sttService!.getWhisperService().isModelDownloaded();
  });

  ipcMain.handle('whisper:isDownloading', () => {
    return state.sttService!.getWhisperService().isDownloading();
  });

  ipcMain.handle('whisper:modelSize', () => {
    return state.sttService!.getWhisperService().modelFileSize();
  });

  ipcMain.handle('whisper:isBinaryAvailable', () => {
    return state.sttService!.getWhisperService().isBinaryAvailable();
  });

  ipcMain.handle('whisper:startDownload', async (event) => {
    const ws = state.sttService!.getWhisperService();
    try {
      await ws.downloadModel((percent) => {
        // Broadcast progress to all windows
        const msg = { type: 'whisper:downloadProgress', percent };
        state.mainWindow?.webContents.send('whisper:download-progress', percent);
        state.overlayWindow?.webContents.send('whisper:download-progress', percent);
      });
      // Update config to mark model as downloaded
      state.configStore!.set('localWhisperModelDownloaded' as any, true);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle('whisper:cancelDownload', () => {
    state.sttService!.getWhisperService().cancelDownload();
    return true;
  });

  // ─── Media file storage ─────────────────────────────────────────────────

  const mediaDir = path.join(app.getPath('userData'), 'media');
  if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });

  const mediaDirResolved = path.resolve(mediaDir);
  function assertMediaPath(filePath: string): string {
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(mediaDirResolved + path.sep) && resolved !== mediaDirResolved) {
      throw new Error('Access denied: path outside media directory');
    }
    return resolved;
  }

  ipcMain.handle('media:save', (_e, filename: string, base64: string) => {
    const safeName = path.basename(filename);
    const filePath = path.join(mediaDir, safeName);
    assertMediaPath(filePath);
    fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
    return filePath;
  });

  ipcMain.handle('media:read', (_e, filePath: string) => {
    try {
      assertMediaPath(filePath);
      if (!fs.existsSync(filePath)) return null;
      return fs.readFileSync(filePath).toString('base64');
    } catch { return null; }
  });

  ipcMain.handle('media:delete', (_e, filePath: string) => {
    try { assertMediaPath(filePath); if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
    return true;
  });

  // ─── Microphone permission ──────────────────────────────────────────────
  ipcMain.handle('mic:checkPermission', async () => {
    if (isMac) return systemPreferences.getMediaAccessStatus('microphone');
    return 'granted';
  });

  ipcMain.handle('mic:requestPermission', async () => {
    if (isMac) return systemPreferences.askForMediaAccess('microphone');
    return true;
  });

  // ─── Shortcuts ──────────────────────────────────────────────────────────
  ipcMain.handle('shortcuts:reregister', () => {
    restartFnMonitor(toggleRecording, registerShortcuts);
    registerShortcuts();
    return true;
  });

  ipcMain.handle('shortcuts:suspend', () => {
    globalShortcut.unregisterAll();
    state.shortcutsSuspended = true;
    return true;
  });

  ipcMain.handle('shortcuts:resume', () => {
    state.shortcutsSuspended = false;
    registerShortcuts();
    return true;
  });

  // ─── STT ────────────────────────────────────────────────────────────────
  ipcMain.handle('stt:transcribe', async (_e, buf: ArrayBuffer, opts?: { language?: string }) => {
    try {
      const text = await state.sttService!.transcribe(Buffer.from(buf), state.configStore!.getAll(), opts);
      return { success: true, text };
    } catch (e) {
      return { success: false, error: errMsg(e) };
    }
  });

  // STT test
  ipcMain.handle('stt:testConnection', async () => {
    try {
      return await state.sttService!.testConnection();
    } catch (e) {
      return { success: false, error: errMsg(e) };
    }
  });

  // ─── Pipeline ───────────────────────────────────────────────────────────

  // Resolve context: wait for contextPromise + ocrPromise, merge OCR results
  async function resolveContext() {
    if (state.contextPromise) {
      try { await state.contextPromise; } catch {}
      state.contextPromise = null;
    }
    if (state.ocrPromise) {
      try {
        const ocrResult = await state.ocrPromise;
        if (ocrResult) {
          state.lastCapturedContext.screenContext = ocrResult.text;
          state.lastCapturedContext.screenshotDataUrl = ocrResult.screenshot;
          state.lastCapturedContext.ocrDurationMs = ocrResult.durationMs;
        }
      } catch (e) {
        console.error('[OCR] await error:', errMsg(e));
      }
      state.ocrPromise = null;
    }
    return state.lastCapturedContext;
  }

  function sendPhase(phase: string) {
    const wc = state.overlayWindow?.webContents;
    if (wc && !wc.isDestroyed()) wc.send('pipeline:phase', phase);
  }

  ipcMain.handle('pipeline:process', async (_e, buf: ArrayBuffer) => {
    if (pipelineRunning && Date.now() - pipelineStartedAt > PIPELINE_TIMEOUT_MS) {
      console.warn('[Pipeline] force-unlocking stale pipeline');
      pipelineRunning = false;
    }
    if (pipelineRunning) return { success: false, rawText: '', processedText: '', error: 'Pipeline busy' };
    pipelineRunning = true;
    pipelineStartedAt = Date.now();
    const cfg = state.configStore!.getAll();

    let sttDurationMs = 0;
    let llmDurationMs = 0;

    try {
      let raw: string;
      let ctx: import('./context-capture').CapturedContext;

      // ── Batch mode (local Whisper) ──
      sendPhase('stt');
      console.log('[Pipeline] Local Whisper STT');
      const sttStart = Date.now();
      const [sttText, resolvedCtx] = await Promise.all([
        state.sttService!.transcribe(Buffer.from(buf), cfg),
        resolveContext(),
      ]);
      raw = sttText;
      ctx = resolvedCtx;
      sttDurationMs = Date.now() - sttStart;
      console.log('[Pipeline] STT done in', sttDurationMs, 'ms:', raw.slice(0, 100));

      // Send STT text to overlay
      const overlayWC = state.overlayWindow?.webContents;
      if (overlayWC && !overlayWC.isDestroyed() && raw.trim()) {
        overlayWC.send('pipeline:stt-delta', { delta: raw, accumulated: raw });
      }

      if (!raw.trim()) {
        state.isRecording = false;
        sendPhase('done');
        return {
          success: true, rawText: '', processedText: '', skipped: true,
          sttModel: 'Local Whisper', llmModel: GROQ_MODEL,
          sttDurationMs, llmDurationMs,
        };
      }

      let processedText = raw;
      let systemPromptUsed = '';

      if (cfg.llmPostProcessing) {
        sendPhase('llm');
        console.log('[Pipeline] LLM via Groq');
        const llmStart = Date.now();
        try {
          const llmResult = await state.llmService!.process(raw, cfg, ctx);
          processedText = llmResult.text;
          systemPromptUsed = llmResult.systemPrompt;
          schedulePostPipelineExtraction(raw, processedText, cfg);
          schedulePostPipelineKG(raw, processedText, cfg);
        } catch (e) {
          console.warn('[Pipeline] LLM failed, falling back to raw STT:', errMsg(e));
          processedText = raw;
        }
        llmDurationMs = Date.now() - llmStart;
      }

      state.isRecording = false;
      sendPhase('done');

      return {
        success: true,
        rawText: raw,
        processedText,
        systemPrompt: systemPromptUsed,
        sttModel: 'Local Whisper',
        llmModel: GROQ_MODEL,
        sttDurationMs, llmDurationMs,
      };
    } catch (e) {
      state.isRecording = false;
      sendPhase('done');
      return {
        success: false, rawText: '', processedText: '', error: errMsg(e),
        sttModel: 'Local Whisper', llmModel: GROQ_MODEL,
        sttDurationMs, llmDurationMs,
      };
    } finally {
      pipelineRunning = false;
    }
  });

  // ─── LLM ────────────────────────────────────────────────────────────────
  ipcMain.handle('llm:process', async (_e, text: string, ctx?: Record<string, unknown>) => {
    try {
      const result = await state.llmService!.process(text, state.configStore!.getAll(), ctx);
      return { success: true, text: result.text };
    } catch (e) {
      return { success: false, error: errMsg(e) };
    }
  });

  ipcMain.handle('llm:rewrite', async (_e, text: string, instruction: string) => {
    try {
      const result = await state.llmService!.rewrite(text, instruction, state.configStore!.getAll());
      return { success: true, text: result };
    } catch (e) {
      return { success: false, error: errMsg(e) };
    }
  });

  // ─── Speech Analysis ────────────────────────────────────────────────────
  ipcMain.handle('analysis:analyze', async (_e, params: {
    rawText: string;
    processedText: string;
    durationMs: number;
  }) => {
    try {
      const cfg = state.configStore!.getAll();
      if (!cfg.llmPostProcessing) {
        return { success: true, data: null };
      }
      const analysis = await state.llmService!.analyzeSpeech(
        params.rawText,
        params.processedText,
        params.durationMs,
        cfg,
      );
      return { success: true, data: analysis };
    } catch (e) {
      return { success: false, error: errMsg(e) };
    }
  });

  // ─── Chat ──────────────────────────────────────────────────────────────
  ipcMain.handle('chat:send', async (_e, message: string, history: Array<{ role: 'user' | 'assistant'; content: string }>) => {
    try {
      const cfg = state.configStore!.getAll();
      const kg = cfg.knowledgeGraph || [];
      const response = await state.llmService!.chat(
        [...history, { role: 'user', content: message }],
        cfg,
        kg,
      );
      return { success: true, response };
    } catch (e) {
      return { success: false, error: errMsg(e) };
    }
  });

  const chatHistoryPath = path.join(app.getPath('userData'), 'chat-history.json');

  ipcMain.handle('chat:history:save', async (_e, messages: Array<unknown>) => {
    try {
      fs.writeFileSync(chatHistoryPath, JSON.stringify(messages, null, 2));
      return { success: true };
    } catch (e) {
      return { success: false, error: errMsg(e) };
    }
  });

  ipcMain.handle('chat:history:load', async () => {
    try {
      if (!fs.existsSync(chatHistoryPath)) return [];
      const raw = fs.readFileSync(chatHistoryPath, 'utf-8');
      return JSON.parse(raw);
    } catch {
      return [];
    }
  });

  // ─── Groq API test ──────────────────────────────────────────────────────
  ipcMain.handle('groq:testConnection', async () => {
    try {
      const cfg = state.configStore!.getAll();
      if (!cfg.groqApiKey) throw new Error('Groq API key not configured');
      const msg = await state.llmService!.testConnection(cfg);
      return { success: true, message: msg };
    } catch (e) {
      return { success: false, error: errMsg(e) };
    }
  });

  // ─── Clipboard ──────────────────────────────────────────────────────────
  ipcMain.handle('clipboard:write', (_e, text: string) => { clipboard.writeText(text); return true; });

  // ─── Type at cursor ─────────────────────────────────────────────────────
  ipcMain.handle('text:typeAtCursor', async (_e, text: string) => {
    let prevClipboard = '';
    let pasted = false;
    try {
      prevClipboard = clipboard.readText();
      clipboard.writeText(text);
      await new Promise((r) => setTimeout(r, 50));

      if (isMac) {
        const bid = (state.lastCapturedContext?.bundleId || '').replace(/[^a-zA-Z0-9._-]/g, '');
        const targetApp = (state.lastCapturedContext?.appName || '').replace(/[^a-zA-Z0-9 ._-]/g, '');
        if (bid) {
          try {
            execSync(`osascript -e 'tell application id "${bid}" to activate'`, { timeout: 1500 });
            await new Promise((r) => setTimeout(r, 120));
          } catch {
            if (targetApp) {
              try {
                execSync(`osascript -e 'tell application "${targetApp}" to activate'`, { timeout: 1500 });
                await new Promise((r) => setTimeout(r, 120));
              } catch {}
            }
          }
        }
      }

      if (isMac) {
        execSync(`osascript -e 'tell application "System Events" to keystroke "v" using command down'`);
      } else if (process.platform === 'win32') {
        execSync(`powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^v')"`);
      } else {
        try { execSync('xdotool key ctrl+v'); } catch { execSync('xsel --clipboard --output | xargs -0 xdotool type --'); }
      }
      pasted = true;

      recordTypedText(text);
      return { success: true };
    } catch (e) {
      return { success: false, error: errMsg(e) };
    } finally {
      if (pasted) {
        setTimeout(() => {
          try { if (clipboard.readText() === text) clipboard.writeText(prevClipboard); } catch {}
        }, 500);
      } else {
        try { clipboard.writeText(prevClipboard); } catch {}
      }
    }
  });

  // ─── Window controls ────────────────────────────────────────────────────
  ipcMain.handle('window:minimize', () => state.mainWindow?.minimize());
  ipcMain.handle('window:maximize', () => {
    state.mainWindow?.isMaximized() ? state.mainWindow.unmaximize() : state.mainWindow?.maximize();
  });
  ipcMain.handle('window:close', () => state.mainWindow?.hide());
  ipcMain.handle('window:hideOverlay', () => {
    if (state.isRecording) state.isRecording = false;
    const ACTIVATE_SUPPRESS_MS = 600;
    state.suppressActivateUntil = Date.now() + ACTIVATE_SUPPRESS_MS;
    if (!state.overlayWindow) return;
    state.overlayWindow.setOpacity(0);
    if (isMac) app.hide();
    const display = screen.getPrimaryDisplay();
    const { x: dX, y: dY, width: dW, height: dH } = display.workArea;
    const pillW = 140, pillH = 40;
    state.overlayWindow.setBounds({
      width: pillW, height: pillH,
      x: dX + Math.round((dW - pillW) / 2),
      y: dY + dH - pillH - 8,
    });
  });
  ipcMain.handle('window:resizeOverlay', (_e, w: number, h: number) => {
    if (!state.overlayWindow) return;
    const overlayBounds = state.overlayWindow.getBounds();
    const display = screen.getDisplayNearestPoint({ x: overlayBounds.x, y: overlayBounds.y });
    const { x: dX, y: dY, width: dW, height: dH } = display.workArea;
    state.overlayWindow.setBounds({
      width: w, height: h,
      x: dX + Math.round((dW - w) / 2),
      y: dY + dH - h - 8,
    });
  });

  // ─── Auto updater ────────────────────────────────────────────────────────
  ipcMain.handle('updater:check', () => {
    const { checkForUpdatesNow } = require('./auto-updater');
    return checkForUpdatesNow();
  });
  ipcMain.handle('updater:download', () => {
    const { downloadUpdateNow } = require('./auto-updater');
    return downloadUpdateNow();
  });
  ipcMain.handle('updater:install', () => {
    const { quitAndInstallUpdate } = require('./auto-updater');
    quitAndInstallUpdate();
  });
  ipcMain.handle('updater:getVersion', () => app.getVersion());

  // ─── Context awareness ───────────────────────────────────────────────────
  ipcMain.handle('context:getLastContext', () => resolveContext());

  ipcMain.handle('context:checkAccessibility', () => {
    if (!isMac) return 'granted';
    return systemPreferences.isTrustedAccessibilityClient(false) ? 'granted' : 'not-determined';
  });

  ipcMain.handle('context:requestAccessibility', () => {
    if (!isMac) return true;
    return systemPreferences.isTrustedAccessibilityClient(true);
  });

  // ─── Shell: Show item in folder ───────────────────────────────────
  ipcMain.handle('shell:showItemInFolder', (_e, filePath: string) => {
    try {
      shell.showItemInFolder(filePath);
      return { success: true };
    } catch (e) {
      return { success: false, error: errMsg(e) };
    }
  });
}
