import { useState } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import type { AssistantMode } from "./GeminiWorkspace";
import type { AppLanguage } from "../utils/i18n";

export interface InlineQuickAction {
  label: string;
  prompt: string;
}

interface InlineGeminiHelperProps {
  language: AppLanguage;
  title: string;
  subtitle: string;
  placeholder: string;
  mode: AssistantMode;
  memoryContext: string;
  workspaceContext?: string;
  quickActions: InlineQuickAction[];
  primaryActionLabel?: string;
  onUseReply?: (reply: string) => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: (reply: string) => void;
}

const HELPER_TEXT: Record<
  AppLanguage,
  {
    askBtn: string;
    thinking: string;
    replyLabel: string;
    clear: string;
    errorFallback: string;
  }
> = {
  ar: {
    askBtn: "اسأل Gemini",
    thinking: "جاري التفكير...",
    replyLabel: "اقتراح المساعد الشخصي",
    clear: "مسح",
    errorFallback: "تعذر الاتصال بمساعد Gemini حالياً.",
  },
  en: {
    askBtn: "Ask Gemini",
    thinking: "Thinking...",
    replyLabel: "Assistant Suggestion",
    clear: "Clear",
    errorFallback: "Could not reach Gemini right now.",
  },
  ru: {
    askBtn: "Спросить Gemini",
    thinking: "Думаю...",
    replyLabel: "Ответ помощника",
    clear: "Очистить",
    errorFallback: "Не удалось связаться с Gemini.",
  },
};

export function InlineGeminiHelper({
  language,
  title,
  subtitle,
  placeholder,
  mode,
  memoryContext,
  workspaceContext,
  quickActions,
  primaryActionLabel,
  onUseReply,
  secondaryActionLabel,
  onSecondaryAction,
}: InlineGeminiHelperProps) {
  const t = HELPER_TEXT[language];
  const [prompt, setPrompt] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runQuery(textToSend: string) {
    const clean = textToSend.trim();
    if (!clean || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const combinedMemory = [memoryContext, workspaceContext]
        .filter(Boolean)
        .join("\n\n");

      const res = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          language,
          memoryContext: combinedMemory,
          messages: [{ role: "user", text: clean }],
        }),
      });

      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok || !data.reply) {
        setError(data.error ?? t.errorFallback);
        return;
      }

      setReply(data.reply);
    } catch {
      setError(t.errorFallback);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void runQuery(prompt);
  }

  return (
    <div
      data-testid="inline-gemini-helper"
      className="bg-white border border-slate-200 rounded-xl p-5 space-y-3.5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Sparkles className="w-4 h-4 text-blue-700 shrink-0" aria-hidden="true" />
            <span>{title}</span>
          </div>
          <p className="mt-0.5 text-xs text-slate-600">{subtitle}</p>
        </div>

        {reply && (
          <button
            type="button"
            onClick={() => {
              setReply(null);
              setError(null);
            }}
            className="text-xs text-slate-500 hover:text-slate-800 whitespace-nowrap"
          >
            {t.clear}
          </button>
        )}
      </div>

      {/* Quick actions */}
      {quickActions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <button
              key={action.label}
              type="button"
              disabled={isLoading}
              onClick={() => {
                setPrompt(action.prompt);
                void runQuery(action.prompt);
              }}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Ask form */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
      >
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none min-h-[40px]"
        />
        <button
          type="submit"
          disabled={!prompt.trim() || isLoading}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg disabled:bg-slate-300 whitespace-nowrap min-h-[40px]"
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" aria-hidden="true" />
          ) : (
            <Send className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          )}
          <span>{isLoading ? t.thinking : t.askBtn}</span>
        </button>
      </form>

      {error && (
        <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {reply && (
        <div className="rounded-lg border border-blue-200/80 bg-blue-50/50 p-3.5 space-y-3">
          <div className="text-[11px] font-semibold text-blue-800">
            {t.replyLabel}
          </div>
          <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
            {reply}
          </div>
          {(onUseReply || onSecondaryAction) && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {onUseReply && primaryActionLabel && (
                <button
                  type="button"
                  onClick={() => onUseReply(reply)}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg whitespace-nowrap"
                >
                  {primaryActionLabel}
                </button>
              )}
              {onSecondaryAction && secondaryActionLabel && (
                <button
                  type="button"
                  onClick={() => onSecondaryAction(reply)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg whitespace-nowrap"
                >
                  {secondaryActionLabel}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
