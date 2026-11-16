import { AlertCircle, CheckCircle2, Loader2, Scale } from "lucide-react";
import {
  getCompletedStepCount,
  type ParallelPipelineState,
} from "../utils/parallelStatus";
import { UI_TEXT, type AppLanguage } from "../utils/i18n";

interface ParallelQueryStatusProps {
  language?: AppLanguage;
  state: ParallelPipelineState;
  onOpenModal?: () => void;
}

export function ParallelQueryStatus({
  language = "ar",
  state,
  onOpenModal,
}: ParallelQueryStatusProps) {
  if (state.phase === "idle" || state.steps.length === 0) {
    return null;
  }

  const t = UI_TEXT[language].parallel;
  const { finished, total } = getCompletedStepCount(state.steps);

  const phaseTitle =
    state.phase === "querying"
      ? t.phaseQuerying
      : state.phase === "voting"
      ? t.phaseVoting
      : state.phase === "completed"
      ? t.phaseCompleted
      : t.phaseError;

  return (
    <div
      data-testid="parallel-query-status"
      aria-live="polite"
      className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-semibold text-slate-800">
          {phaseTitle}
        </span>
        <div className="flex items-center gap-3">
          {onOpenModal && (
            <button
              type="button"
              onClick={onOpenModal}
              className="text-xs font-medium text-blue-700 hover:text-blue-800 underline-offset-2 hover:underline whitespace-nowrap"
            >
              {t.openModalBtn}
            </button>
          )}
          <span className="text-xs font-mono tabular-nums text-slate-500">
            {finished} / {total}
          </span>
        </div>
      </div>

      {/* Model processing steps */}
      <ul className="divide-y divide-slate-200/80 border border-slate-200 rounded-lg bg-white">
        {state.steps.map((step) => {
          const statusText =
            step.status === "running"
              ? t.stepRunning
              : step.status === "completed"
              ? t.stepCompleted
              : step.status === "error"
              ? step.error || t.stepError
              : t.stepPending;

          return (
            <li
              key={step.id}
              className="px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-3 text-xs"
            >
              <div className="min-w-0">
                <span className="font-medium text-slate-900">{step.label}</span>
                <span className="text-slate-400 mx-1.5" aria-hidden="true">
                  ·
                </span>
                <span className="font-mono text-slate-500 break-all sm:break-normal">
                  {step.modelId}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {step.status === "running" && (
                  <Loader2
                    className="w-3.5 h-3.5 animate-spin text-blue-700"
                    aria-hidden="true"
                  />
                )}
                {step.status === "completed" && (
                  <CheckCircle2
                    className="w-3.5 h-3.5 text-emerald-600"
                    aria-hidden="true"
                  />
                )}
                {step.status === "error" && (
                  <AlertCircle
                    className="w-3.5 h-3.5 text-red-600"
                    aria-hidden="true"
                  />
                )}
                <span
                  className={
                    step.status === "completed"
                      ? "text-emerald-700 font-medium"
                      : step.status === "error"
                      ? "text-red-700 font-medium"
                      : "text-slate-600"
                  }
                >
                  {statusText}
                </span>
              </div>
            </li>
          );
        })}

        {/* Voting / Consensus step */}
        <li className="px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-3 text-xs bg-slate-50/70">
          <div className="flex items-center gap-2 min-w-0">
            <Scale className="w-3.5 h-3.5 text-slate-600 shrink-0" aria-hidden="true" />
            <span className="font-medium text-slate-800">
              {t.votingRowTitle}
            </span>
          </div>

          <div className="flex items-center gap-1.5 min-w-0">
            {state.phase === "voting" && (
              <>
                <Loader2
                  className="w-3.5 h-3.5 animate-spin text-blue-700 shrink-0"
                  aria-hidden="true"
                />
                <span className="text-blue-700 font-medium">
                  {t.votingComparing}
                </span>
              </>
            )}
            {state.phase === "completed" && (
              <>
                <CheckCircle2
                  className="w-3.5 h-3.5 text-emerald-600 shrink-0"
                  aria-hidden="true"
                />
                <span className="text-emerald-700 font-medium">
                  {state.winnerLabel
                    ? `${t.votingAccepted} (${state.winnerLabel})`
                    : t.votingBestChosen}
                </span>
              </>
            )}
            {state.phase === "querying" && (
              <span className="text-slate-500">{t.votingWaiting}</span>
            )}
            {state.phase === "error" && (
              <span className="text-red-700">{t.votingStopped}</span>
            )}
          </div>
        </li>
      </ul>
    </div>
  );
}
