import { useState } from "react";
import { BookmarkPlus, Check, Copy } from "lucide-react";
import {
  buildComparisonColumns,
  type ComparisonCandidateInput,
} from "../utils/comparison";
import { UI_TEXT, type AppLanguage } from "../utils/i18n";

interface ModelComparisonTableProps {
  language?: AppLanguage;
  candidates: ComparisonCandidateInput[];
  winnerLabel?: string;
  onSaveCandidateToNotes?: (title: string, content: string) => void;
}

export function ModelComparisonTable({
  language = "ar",
  candidates,
  winnerLabel,
  onSaveCandidateToNotes,
}: ModelComparisonTableProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const t = UI_TEXT[language].parallel;
  const g = UI_TEXT[language].gemini;
  const columns = buildComparisonColumns(candidates, winnerLabel);

  if (columns.length === 0) {
    return null;
  }

  async function handleCopy(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1800);
    } catch {
      // Clipboard may be blocked in restricted contexts
    }
  }

  function handleSave(id: string, label: string, text: string) {
    if (!onSaveCandidateToNotes) return;
    onSaveCandidateToNotes(label, text);
    setSavedId(id);
    setTimeout(() => setSavedId((prev) => (prev === id ? null : prev)), 1800);
  }

  return (
    <div
      data-testid="model-comparison-table"
      className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white"
    >
      <table className="w-full min-w-[540px] border-collapse text-start text-xs">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th
              scope="col"
              className="w-28 px-3.5 py-2.5 font-semibold text-slate-600 align-top text-start"
            >
              {t.tableCriterion}
            </th>
            {columns.map((col) => {
              const isWinner = Boolean(winnerLabel && winnerLabel === col.label);
              return (
                <th
                  key={col.id}
                  scope="col"
                  className="px-3.5 py-2.5 font-semibold text-slate-900 border-s border-slate-200 align-top text-start"
                >
                  <div className="text-xs font-semibold text-slate-900">
                    {col.label}
                  </div>
                  <div className="mt-0.5 text-[11px] font-normal text-slate-500">
                    <span className="font-mono">{col.modelId}</span>
                    <span aria-hidden="true"> · </span>
                    <span>{isWinner ? t.winnerRole : t.participantRole}</span>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-200">
          <tr>
            <th
              scope="row"
              className="px-3.5 py-2.5 font-medium text-slate-600 bg-slate-50/50 text-start"
            >
              {t.tableWords}
            </th>
            {columns.map((col) => (
              <td
                key={col.id}
                className="px-3.5 py-2.5 text-slate-800 font-mono tabular-nums border-s border-slate-200"
              >
                {col.wordCount}
              </td>
            ))}
          </tr>

          <tr>
            <th
              scope="row"
              className="px-3.5 py-2.5 font-medium text-slate-600 bg-slate-50/50 text-start"
            >
              {t.tableChars}
            </th>
            {columns.map((col) => (
              <td
                key={col.id}
                className="px-3.5 py-2.5 text-slate-800 font-mono tabular-nums border-s border-slate-200"
              >
                {col.charCount}
              </td>
            ))}
          </tr>

          <tr>
            <th
              scope="row"
              className="px-3.5 py-2.5 font-medium text-slate-600 bg-slate-50/50 text-start"
            >
              {t.tableParagraphs}
            </th>
            {columns.map((col) => (
              <td
                key={col.id}
                className="px-3.5 py-2.5 text-slate-800 font-mono tabular-nums border-s border-slate-200"
              >
                {col.paragraphCount}
              </td>
            ))}
          </tr>

          <tr>
            <th
              scope="row"
              className="px-3.5 py-3 font-medium text-slate-600 bg-slate-50/50 align-top text-start"
            >
              {t.tableAnswer}
            </th>
            {columns.map((col) => (
              <td
                key={col.id}
                className="px-3.5 py-3 text-slate-800 border-s border-slate-200 align-top"
              >
                <div className="whitespace-pre-wrap leading-relaxed text-[13px]">
                  {col.text}
                </div>
              </td>
            ))}
          </tr>

          <tr>
            <th
              scope="row"
              className="px-3.5 py-2.5 font-medium text-slate-600 bg-slate-50/50 text-start"
            >
              {t.tableActions}
            </th>
            {columns.map((col) => (
              <td
                key={col.id}
                className="px-3.5 py-2.5 border-s border-slate-200"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(col.id, col.text)}
                    aria-label={`${g.copy} ${col.label}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap"
                  >
                    {copiedId === col.id ? (
                      <>
                        <Check
                          className="w-3.5 h-3.5 text-emerald-600"
                          aria-hidden="true"
                        />
                        <span>{g.copied}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{g.copy}</span>
                      </>
                    )}
                  </button>

                  {onSaveCandidateToNotes && (
                    <button
                      type="button"
                      onClick={() => handleSave(col.id, col.label, col.text)}
                      aria-label={`${g.saveToNotes} ${col.label}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors whitespace-nowrap"
                    >
                      {savedId === col.id ? (
                        <>
                          <Check
                            className="w-3.5 h-3.5 text-emerald-600"
                            aria-hidden="true"
                          />
                          <span>{g.saved}</span>
                        </>
                      ) : (
                        <>
                          <BookmarkPlus
                            className="w-3.5 h-3.5"
                            aria-hidden="true"
                          />
                          <span>{g.saveToNotes}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
