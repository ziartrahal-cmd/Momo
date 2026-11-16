import { useEffect, useRef, useState } from "react";
import {
  BookmarkPlus,
  Check,
  Loader2,
  Mic,
  MicOff,
  PhoneOff,
  Send,
  Sparkles,
  Volume2,
} from "lucide-react";
import {
  appendTranscriptChunk,
  base64Int16ToFloat32,
  float32ToInt16Base64,
  LIVE_VOICE_OPTIONS,
  resampleFloat32,
  type LiveTranscriptItem,
  type LiveVoiceName,
} from "../utils/audioPcm";
import {
  UI_TEXT,
  VOICE_LABELS_I18N,
  type AppLanguage,
} from "../utils/i18n";

type LiveConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "error";

interface LiveVoicePanelProps {
  language: AppLanguage;
  memoryContext?: string;
  isReflecting?: boolean;
  onSaveTranscriptToNotes: (title: string, content: string) => void;
  onReflectVoiceTranscript?: (transcripts: LiveTranscriptItem[]) => void;
}

export function LiveVoicePanel({
  language,
  memoryContext,
  isReflecting = false,
  onSaveTranscriptToNotes,
  onReflectVoiceTranscript,
}: LiveVoicePanelProps) {
  const t = UI_TEXT[language].voice;
  const voiceLabels = VOICE_LABELS_I18N[language];

  const [status, setStatus] = useState<LiveConnectionState>("idle");
  const [selectedVoice, setSelectedVoice] = useState<LiveVoiceName>("Zephyr");
  const [isMuted, setIsMuted] = useState(false);
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<LiveTranscriptItem[]>([]);
  const [quickText, setQuickText] = useState("");
  const [savedNotice, setSavedNotice] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const muteGainRef = useRef<GainNode | null>(null);
  const nextStartTimeRef = useRef(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const isMutedRef = useRef(false);
  const statusRef = useRef<LiveConnectionState>("idle");
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcripts.length]);

  function stopPlaybackQueue() {
    for (const source of activeSourcesRef.current) {
      try {
        source.stop();
      } catch {
        // Ignore already stopped sources
      }
    }
    activeSourcesRef.current.clear();
    if (outputAudioCtxRef.current && outputAudioCtxRef.current.state !== "closed") {
      nextStartTimeRef.current = outputAudioCtxRef.current.currentTime;
    } else {
      nextStartTimeRef.current = 0;
    }
    setIsModelSpeaking(false);
  }

  function cleanupSession(nextStatus: LiveConnectionState = "idle") {
    stopPlaybackQueue();

    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch {
        // Ignore disconnect error
      }
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }

    if (muteGainRef.current) {
      try {
        muteGainRef.current.disconnect();
      } catch {
        // Ignore disconnect error
      }
      muteGainRef.current = null;
    }

    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }

    if (inputAudioCtxRef.current) {
      const ctx = inputAudioCtxRef.current;
      inputAudioCtxRef.current = null;
      if (ctx.state !== "closed") {
        void ctx.close().catch(() => {});
      }
    }

    if (outputAudioCtxRef.current) {
      const ctx = outputAudioCtxRef.current;
      outputAudioCtxRef.current = null;
      if (ctx.state !== "closed") {
        void ctx.close().catch(() => {});
      }
    }

    if (wsRef.current) {
      const sock = wsRef.current;
      wsRef.current = null;
      sock.onclose = null;
      sock.onerror = null;
      if (
        sock.readyState === WebSocket.OPEN ||
        sock.readyState === WebSocket.CONNECTING
      ) {
        try {
          sock.close();
        } catch {
          // Ignore close error
        }
      }
    }

    statusRef.current = nextStatus;
    setStatus(nextStatus);
  }

  useEffect(() => {
    return () => {
      cleanupSession("idle");
    };
  }, []);

  function scheduleOutputPcmChunk(base64Pcm: string) {
    const outCtx = outputAudioCtxRef.current;
    if (!outCtx || outCtx.state === "closed") return;

    const floatSamples = base64Int16ToFloat32(base64Pcm);
    if (floatSamples.length === 0) return;

    const buffer = outCtx.createBuffer(1, floatSamples.length, 24000);
    buffer.getChannelData(0).set(floatSamples);

    const source = outCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(outCtx.destination);

    const now = outCtx.currentTime;
    const startAt = Math.max(now, nextStartTimeRef.current);
    source.start(startAt);
    nextStartTimeRef.current = startAt + buffer.duration;

    activeSourcesRef.current.add(source);
    setIsModelSpeaking(true);

    source.onended = () => {
      activeSourcesRef.current.delete(source);
      if (activeSourcesRef.current.size === 0) {
        setIsModelSpeaking(false);
      }
    };
  }

  async function handleStartLiveSession() {
    if (status === "connecting" || status === "connected") return;

    setError(null);
    statusRef.current = "connecting";
    setStatus("connecting");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(t.micUnsupported);
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const inputCtx = new AudioContext({ sampleRate: 16000 });
      const outputCtx = new AudioContext({ sampleRate: 24000 });
      if (inputCtx.state === "suspended") await inputCtx.resume();
      if (outputCtx.state === "suspended") await outputCtx.resume();

      inputAudioCtxRef.current = inputCtx;
      outputAudioCtxRef.current = outputCtx;
      nextStartTimeRef.current = outputCtx.currentTime;

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(
        `${protocol}//${window.location.host}/api/live?voice=${encodeURIComponent(
          selectedVoice
        )}&lang=${encodeURIComponent(language)}`
      );
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: "init",
            voice: selectedVoice,
            language,
            memoryContext: memoryContext ?? "",
          })
        );
      };

      const source = inputCtx.createMediaStreamSource(stream);
      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      const silentGain = inputCtx.createGain();
      silentGain.gain.value = 0;
      processorRef.current = processor;
      muteGainRef.current = silentGain;

      processor.onaudioprocess = (event) => {
        if (
          isMutedRef.current ||
          !wsRef.current ||
          wsRef.current.readyState !== WebSocket.OPEN
        ) {
          return;
        }
        const rawSamples = event.inputBuffer.getChannelData(0);
        const targetSamples =
          inputCtx.sampleRate === 16000
            ? rawSamples
            : resampleFloat32(rawSamples, inputCtx.sampleRate, 16000);
        const base64 = float32ToInt16Base64(targetSamples);
        wsRef.current.send(JSON.stringify({ audio: base64 }));
      };

      source.connect(processor);
      processor.connect(silentGain);
      silentGain.connect(inputCtx.destination);

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(String(event.data)) as {
            type?: string;
            data?: string;
            text?: string;
            error?: string;
          };

          if (msg.type === "ready") {
            statusRef.current = "connected";
            setStatus("connected");
          } else if (msg.type === "audio" && msg.data) {
            scheduleOutputPcmChunk(msg.data);
          } else if (msg.type === "input_transcript" && msg.text) {
            setTranscripts((prev) =>
              appendTranscriptChunk(prev, "user", msg.text!)
            );
          } else if (msg.type === "output_transcript" && msg.text) {
            setTranscripts((prev) =>
              appendTranscriptChunk(prev, "model", msg.text!)
            );
          } else if (msg.type === "interrupted") {
            stopPlaybackQueue();
          } else if (msg.type === "error" && msg.error) {
            setError(msg.error);
            cleanupSession("error");
          }
        } catch {
          // Ignore invalid messages
        }
      };

      ws.onerror = () => {
        setError(t.wsError);
        cleanupSession("error");
      };

      ws.onclose = () => {
        const nextStatus: LiveConnectionState =
          statusRef.current === "error" ? "error" : "idle";
        cleanupSession(nextStatus);
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.startError;
      setError(msg);
      cleanupSession("error");
    }
  }

  function handleStopLiveSession() {
    cleanupSession("idle");
    if (transcripts.length >= 2 && onReflectVoiceTranscript) {
      onReflectVoiceTranscript(transcripts);
    }
  }

  function handleSendQuickText(e: React.FormEvent) {
    e.preventDefault();
    const text = quickText.trim();
    if (!text || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }
    wsRef.current.send(JSON.stringify({ text }));
    setTranscripts((prev) => appendTranscriptChunk(prev, "user", text));
    setQuickText("");
  }

  function handleSaveConversation() {
    if (transcripts.length === 0) return;
    const body = transcripts
      .map(
        (item) =>
          `${item.role === "user" ? t.userVoiceLabel : "Rahal Plus"}: ${
            item.text
          }`
      )
      .join("\n\n");
    onSaveTranscriptToNotes(t.defaultTranscriptTitle, body);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 1800);
  }

  const isLive = status === "connected";
  const isConnecting = status === "connecting";

  return (
    <div
      data-testid="live-voice-panel"
      className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col min-h-[460px]"
    >
      {/* Controls Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
            <span>Gemini Live Audio</span>
            <span aria-hidden="true">·</span>
            <span
              className={
                isLive
                  ? "text-emerald-700 font-medium"
                  : status === "error"
                  ? "text-red-700 font-medium"
                  : "text-slate-600"
              }
            >
              {isLive
                ? isModelSpeaking
                  ? t.statusSpeaking
                  : t.statusOpen
                : isConnecting
                ? t.statusConnecting
                : status === "error"
                ? t.statusError
                : t.statusReady}
            </span>
          </div>
          <h2 className="font-display text-lg font-bold text-slate-900">
            {t.title}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <label htmlFor="live-voice-select" className="sr-only">
            {t.voiceSelectAria}
          </label>
          <select
            id="live-voice-select"
            disabled={isLive || isConnecting}
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value as LiveVoiceName)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-700 focus:outline-none min-h-[40px] disabled:opacity-60"
          >
            {LIVE_VOICE_OPTIONS.map((v) => (
              <option key={v.id} value={v.id}>
                {voiceLabels[v.id]}
              </option>
            ))}
          </select>

          {isLive ? (
            <>
              <button
                type="button"
                onClick={() => setIsMuted((prev) => !prev)}
                aria-pressed={isMuted}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap min-h-[40px] ${
                  isMuted
                    ? "bg-amber-50 border-amber-300 text-amber-800"
                    : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                }`}
              >
                {isMuted ? (
                  <>
                    <MicOff className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{t.muted}</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{t.mute}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleStopLiveSession}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors whitespace-nowrap min-h-[40px]"
              >
                <PhoneOff className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{t.endCall}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={isConnecting}
              onClick={handleStartLiveSession}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap min-h-[40px] disabled:opacity-60"
            >
              {isConnecting ? (
                <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
              ) : (
                <Mic className="w-4 h-4 shrink-0" aria-hidden="true" />
              )}
              <span>{isConnecting ? t.connectingBtn : t.startCall}</span>
            </button>
          )}
        </div>
      </div>

      {/* Transcript / Live Conversation Stream */}
      <div className="flex-1 p-4 sm:p-6 space-y-3 overflow-y-auto max-h-[420px]">
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {error}
          </div>
        )}

        {transcripts.length === 0 ? (
          <div className="py-10 max-w-xl mx-auto text-center space-y-2">
            <div className="mx-auto w-11 h-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
              <Volume2 className="w-5 h-5" aria-hidden="true" />
            </div>
            <h3 className="font-display text-base font-semibold text-slate-900">
              {t.emptyTitle}
            </h3>
            <p className="text-sm text-slate-600">{t.emptyDesc}</p>
          </div>
        ) : (
          transcripts.map((item) => (
            <div
              key={item.id}
              className={`p-3.5 rounded-xl border text-sm leading-relaxed ${
                item.role === "user"
                  ? "bg-blue-50/60 border-blue-200/80 text-slate-900"
                  : "bg-slate-50/70 border-slate-200 text-slate-900"
              }`}
            >
              <div className="text-xs font-semibold text-slate-500 mb-1">
                {item.role === "user" ? t.userVoiceLabel : "Rahal Plus"}
              </div>
              <p className="whitespace-pre-wrap break-words">{item.text}</p>
            </div>
          ))
        )}
        <div ref={transcriptEndRef} />
      </div>

      {/* Quick text steer + Save & Analyze footer */}
      <div className="border-t border-slate-200 bg-white p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <form onSubmit={handleSendQuickText} className="flex-1 flex items-center gap-2">
          <label htmlFor="live-quick-text" className="sr-only">
            {t.quickInputLabel}
          </label>
          <input
            id="live-quick-text"
            type="text"
            disabled={!isLive}
            value={quickText}
            onChange={(e) => setQuickText(e.target.value)}
            placeholder={
              isLive ? t.quickPlaceholderLive : t.quickPlaceholderIdle
            }
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none disabled:bg-slate-50 min-h-[40px]"
          />
          <button
            type="submit"
            disabled={!isLive || !quickText.trim()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg disabled:bg-slate-300 whitespace-nowrap min-h-[40px]"
          >
            <Send className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t.send}</span>
          </button>
        </form>

        {transcripts.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {onReflectVoiceTranscript && (
              <button
                type="button"
                disabled={isReflecting}
                onClick={() => onReflectVoiceTranscript(transcripts)}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg whitespace-nowrap min-h-[40px] disabled:opacity-60"
              >
                {isReflecting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                <span>
                  {isReflecting ? t.analyzingTranscript : t.analyzeTranscript}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSaveConversation}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap min-h-[40px]"
            >
              {savedNotice ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                  <span>{t.savedTranscript}</span>
                </>
              ) : (
                <>
                  <BookmarkPlus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{t.saveTranscript}</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
