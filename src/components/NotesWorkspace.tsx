import { useMemo, useState } from "react";
import { Check, Copy, Search, Send, Trash2 } from "lucide-react";
import { filterNotes, validateNoteInput, type NoteItem } from "../utils/notes";
import { getIntlLocale, UI_TEXT, type AppLanguage } from "../utils/i18n";
import {
  InlineGeminiHelper,
  type InlineQuickAction,
} from "./InlineGeminiHelper";

interface NotesWorkspaceProps {
  language: AppLanguage;
  memoryContext: string;
  notes: NoteItem[];
  isFormOpen: boolean;
  onToggleForm: (open: boolean) => void;
  onAddNote: (title: string, content: string, source?: string) => void;
  onDeleteNote: (id: string) => void;
  onSendToGemini: (content: string) => void;
}

const INLINE_NOTES_CONFIG: Record<
  AppLanguage,
  {
    title: string;
    subtitle: string;
    placeholder: string;
    primaryAction: string;
    savedNotice: string;
    geminiSourceLabel: string;
    quickActions: InlineQuickAction[];
  }
> = {
  ar: {
    title: "مساعد Gemini للمفكرة والأفكار",
    subtitle:
      "يلخّص ملاحظاتك المحفوظة، يرتّب أفكارك في قوائم خطوات عملية، أو يحوّل أي فكرة إلى ملاحظة منظمة بثلاث لغات.",
    placeholder:
      "مثال: لخّص ملاحظاتي الحالية ورتّب أهم 5 خطوات للتنفيذ هذا الأسبوع...",
    primaryAction: "حفظ كملاحظة جديدة",
    savedNotice: "تم حفظ الملاحظة الجديدة من Gemini في مفكرتك.",
    geminiSourceLabel: "مساعد المفكرة (Gemini)",
    quickActions: [
      {
        label: "تلخيص ملاحظاتي وأهم المهام",
        prompt:
          "اقرأ ملاحظاتي المحفوظة وسياق مشاريعي، ثم لخّص أهم الأفكار واستخرج أبرز 5 خطوات عملية للبدء.",
      },
      {
        label: "تنظيم الأفكار في قائمة مراجعة",
        prompt:
          "حوّل أفكاري وملاحظاتي الحالية إلى قائمة مراجعة منظمة (Checklist) مرتبة حسب الأولوية.",
      },
      {
        label: "ملخص تنفيذي بثلاث لغات",
        prompt:
          "اكتب ملخصاً موجزاً وواضحاً لملاحظاتي ومشروعي بالعربية والإنجليزية والروسية لحفظه كمرجع سريع.",
      },
    ],
  },
  en: {
    title: "Gemini Assistant for Notes",
    subtitle:
      "Summarize your saved notes, turn scattered ideas into clean checklists, or generate structured notes ready to save.",
    placeholder:
      "Example: Summarize my saved notes and highlight the top 5 action items...",
    primaryAction: "Save as New Note",
    savedNotice: "Saved new note from Gemini to your workspace.",
    geminiSourceLabel: "Notes Assistant (Gemini)",
    quickActions: [
      {
        label: "Summarize My Saved Notes",
        prompt:
          "Review my saved notes and project memory, then summarize the key insights and top 5 next action items.",
      },
      {
        label: "Turn Ideas Into Checklist",
        prompt:
          "Organize my current notes and goals into a clear, prioritized checklist I can follow.",
      },
      {
        label: "Trilingual Action Summary",
        prompt:
          "Write a concise trilingual reference summary (Arabic, English, Russian) based on my notes and project focus.",
      },
    ],
  },
  ru: {
    title: "Помощник Gemini для заметок",
    subtitle:
      "Суммаризирует ваши сохранённые заметки, превращает идеи в структурированные чек-листы и сохраняет готовые конспекты.",
    placeholder:
      "Например: сделай выжимку из моих заметок и выдели 5 главных шагов...",
    primaryAction: "Сохранить как заметку",
    savedNotice: "Новая заметка от Gemini сохранена в разделе «Заметки».",
    geminiSourceLabel: "Помощник заметок (Gemini)",
    quickActions: [
      {
        label: "Сводка по моим заметкам",
        prompt:
          "Изучи мои сохранённые заметки и память проектов, сделай краткую сводку и выдели 5 главных шагов.",
      },
      {
        label: "Превратить идеи в чек-лист",
        prompt:
          "Структурируй мои текущие заметки и цели в понятный чек-лист по приоритетам.",
      },
      {
        label: "Памятка на трёх языках",
        prompt:
          "Подготовь краткую справочную памятку по моему проекту на арабском, английском и русском языках.",
      },
    ],
  },
};

export function NotesWorkspace({
  language,
  memoryContext,
  notes,
  isFormOpen,
  onToggleForm,
  onAddNote,
  onDeleteNote,
  onSendToGemini,
}: NotesWorkspaceProps) {
  const t = UI_TEXT[language].notes;
  const intlLocale = getIntlLocale(language);
  const inlineCfg = INLINE_NOTES_CONFIG[language];

  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [inlineNotice, setInlineNotice] = useState<string | null>(null);

  const visibleNotes = filterNotes(notes, query);

  const workspaceContext = useMemo(() => {
    if (notes.length === 0) {
      return "User currently has 0 saved notes in the Notes workspace.";
    }
    const snippets = notes
      .slice(0, 6)
      .map(
        (n, idx) =>
          `${idx + 1}. ${n.title}: ${n.content
            .replace(/\s+/g, " ")
            .slice(0, 180)}`
      )
      .join("\n");
    return `Saved notes in workspace (${notes.length} total):\n${snippets}`;
  }, [notes]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validation = validateNoteInput(title, content);
    if (!validation.valid) {
      setFormError(
        validation.error ??
          (language === "en"
            ? "Please enter the note content."
            : language === "ru"
            ? "Введите текст заметки."
            : "يرجى إدخال نص الملاحظة.")
      );
      return;
    }

    onAddNote(title, content);
    setTitle("");
    setContent("");
    setFormError(null);
    onToggleForm(false);
  }

  function handleSaveGeminiNote(replyText: string) {
    const clean = replyText.trim();
    if (!clean) return;
    const firstLine =
      clean
        .split(/\r?\n/)[0]
        .replace(/^[#*\-\d.\s]+/, "")
        .slice(0, 60)
        .trim() || inlineCfg.title;
    onAddNote(firstLine, clean, inlineCfg.geminiSourceLabel);
    setInlineNotice(inlineCfg.savedNotice);
    setTimeout(() => setInlineNotice(null), 2600);
  }

  async function handleCopy(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1800);
    } catch {
      // Ignore clipboard denial
    }
  }

  function formatDate(iso: string): string {
    try {
      return new Intl.DateTimeFormat(intlLocale, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  }

  return (
    <section
      aria-labelledby="notes-heading"
      className="max-w-4xl mx-auto space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1
            id="notes-heading"
            className="font-display text-2xl sm:text-3xl font-bold text-slate-900"
          >
            {t.heading}
          </h1>
          <p className="mt-1 text-sm text-slate-600">{t.subheading}</p>
        </div>

        <div className="relative w-full sm:w-72">
          <label htmlFor="notes-search" className="sr-only">
            {t.searchPlaceholder}
          </label>
          <Search
            className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            id="notes-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full rounded-lg border border-slate-300 bg-white ps-10 pe-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none min-h-[42px]"
          />
        </div>
      </div>

      {/* Inline Gemini Assistant for Notes */}
      <div className="space-y-2">
        <InlineGeminiHelper
          language={language}
          title={inlineCfg.title}
          subtitle={inlineCfg.subtitle}
          placeholder={inlineCfg.placeholder}
          mode="summarize"
          memoryContext={memoryContext}
          workspaceContext={workspaceContext}
          quickActions={inlineCfg.quickActions}
          primaryActionLabel={inlineCfg.primaryAction}
          onUseReply={handleSaveGeminiNote}
        />
        {inlineNotice && (
          <div
            role="status"
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-medium text-emerald-800"
          >
            {inlineNotice}
          </div>
        )}
      </div>

      {/* Add Note Form */}
      {isFormOpen && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
        >
          <h2 className="font-display text-base font-semibold text-slate-900">
            {t.formTitle}
          </h2>

          <div>
            <label
              htmlFor="note-title-input"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              {t.titleLabel}
            </label>
            <input
              id="note-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.titlePlaceholder}
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none min-h-[42px]"
            />
          </div>

          <div>
            <label
              htmlFor="note-content-input"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              {t.contentLabel}
            </label>
            <textarea
              id="note-content-input"
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t.contentPlaceholder}
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
            />
          </div>

          {formError && (
            <p role="alert" className="text-sm text-red-700">
              {formError}
            </p>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                onToggleForm(false);
              }}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap"
            >
              {t.saveNote}
            </button>
          </div>
        </form>
      )}

      {/* Notes List */}
      {visibleNotes.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <h2 className="font-display text-lg font-semibold text-slate-900">
            {notes.length === 0 ? t.emptyTitle : t.emptySearchTitle}
          </h2>
          <p className="mt-1.5 text-sm text-slate-600">
            {notes.length === 0 ? t.emptyDesc : t.emptySearchDesc}
          </p>
          {notes.length === 0 && !isFormOpen && (
            <button
              type="button"
              onClick={() => onToggleForm(true)}
              className="mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap"
            >
              {t.addFirstNote}
            </button>
          )}
        </div>
      ) : (
        <div data-testid="notes-list" className="space-y-4">
          {visibleNotes.map((note) => (
            <article
              key={note.id}
              className="bg-white border border-slate-200 rounded-xl p-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="min-w-0">
                  <h2 className="font-display text-base font-semibold text-slate-900 truncate">
                    {note.title}
                  </h2>
                  <div className="mt-0.5 text-xs text-slate-500 tabular-nums">
                    <span>{formatDate(note.createdAt)}</span>
                    {note.source && (
                      <>
                        <span aria-hidden="true"> · </span>
                        <span>{note.source}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopy(note.id, note.content)}
                    aria-label={`${t.copy}: ${note.title}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
                  >
                    {copiedId === note.id ? (
                      <>
                        <Check
                          className="w-3.5 h-3.5 text-emerald-600"
                          aria-hidden="true"
                        />
                        <span>{t.copied}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{t.copy}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => onSendToGemini(note.content)}
                    aria-label={`${t.useInGemini}: ${note.title}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50/80 hover:bg-blue-100 rounded-lg transition-colors whitespace-nowrap"
                  >
                    <Send className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{t.useInGemini}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteNote(note.id)}
                    aria-label={`${t.deleteNotePrefix} ${note.title}`}
                    className="p-2 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <p className="mt-3 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {note.content}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
