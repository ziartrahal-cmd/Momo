import { useEffect } from "react";
import { AlertCircle, CheckCircle2, Loader2, Scale, X } from "lucide-react";
import {
  getCompletedStepCount,
  getModelProgressInfo,
  getVotingProgressInfo,
  type ParallelPipelineState,
  type ProgressTone,
} from "../utils/parallelStatus";
import { UI_TEXT, type AppLanguage } from "../utils/i18n";

interface ModelComparisonModalProps {
  language?: AppLanguage;
  isOpen: boolean;
  state: ParallelPipelineState;
  onClose: () => void;
}

function getBarColorClass(tone: ProgressTone): string {
  switch (tone) {
    case "success":
      return "bg-emerald-600";
    case "error":
      return "bg-red-600";
    case "active":
      return "bg-blue-700";
    default:
      return "bg-slate-300";
  }
}

export function ModelComparisonModal({
  language = "ar",
  isOpen,
  state,
  onClose,
}: ModelComparisonModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || state.phase === "idle" || state.steps.length === 0) {
    return null;
  }

  const t = UI_TEXT[language].parallel;
  const { finished, total } = getCompletedStepCount(state.steps);
  const votingInfo = getVotingProgressInfo(state);

  const votingLabel =
    state.phase === "querying"
      ? t.votingWaiting
      : state.phase === "voting"
      ? t.votingComparing
      : state.phase === "completed"
      ? state.winnerLabel
        ? `${t.votingAccepted} (${state.winnerLabel})`
        : t.votingBestChosen
      : state.errorMessage || t.votingStopped;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="model-comparison-modal-title"
      data-testid="model-comparison-modal"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="model-comparison-modal-title"
              className="font-display text-lg font-bold text-slate-900"
            >
              {t.modalTitle}
            </h2>
            <p className="mt-1 text-xs text-slate-600">{t.modalSubtitle}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t.modalCloseAria}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Side-by-side progress bars for each participating model */}
        <div
          data-testid="model-comparison-bars"
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          {state.steps.map((step) => {
            const info = getModelProgressInfo(step, state.phase);
            const localizedStepLabel =
              step.status === "pending"
                ? t.stepPending
                : step.status === "running"
                ? t.stepRunning
                : step.status === "completed"
                ? state.phase === "voting"
                  ? t.stepReadyVoting
                  : t.stepCompleted
                : step.error || t.stepError;

            return (
              <div
                key={step.id}
                className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {step.label}
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-slate-500 truncate">
                      {step.modelId}
                    </div>
                  </div>
                  <span
                    dir="ltr"
                    className="font-mono text-xs font-medium tabular-nums text-slate-700 shrink-0"
                  >
                    {info.percent}%
                  </span>
                </div>

                <div
                  role="progressbar"
                  aria-label={step.label}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={info.percent}
                  className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200"
                >
                  <div
                    style={{ width: `${info.percent}%` }}
                    className={`h-full rounded-full transition-all duration-300 ${getBarColorClass(
                      info.tone
                    )}`}
                  />
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  {step.status === "running" && (
                    <Loader2
                      className="w-3.5 h-3.5 animate-spin text-blue-700 shrink-0"
                      aria-hidden="true"
                    />
                  )}
                  {step.status === "completed" && (
                    <CheckCircle2
                      className="w-3.5 h-3.5 text-emerald-600 shrink-0"
                      aria-hidden="true"
                    />
                  )}
                  {step.status === "error" && (
                    <AlertCircle
                      className="w-3.5 h-3.5 text-red-600 shrink-0"
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={
                      info.tone === "success"
                        ? "text-emerald-700 font-medium"
                        : info.tone === "error"
                        ? "text-red-700 font-medium"
                        : "text-slate-600"
                    }
                  >
                    {localizedStepLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Overall Voting / Consensus Progress */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 font-semibold text-slate-800">
              <Scale className="w-4 h-4 text-slate-600 shrink-0" aria-hidden="true" />
              <span>{t.votingRowTitle}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600">
              <span>
                <span dir="ltr" className="font-mono tabular-nums">
                  {finished} / {total}
                </span>{" "}
                {t.modelsCountWord}
              </span>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span
                dir="ltr"
                className="font-mono tabular-nums font-medium text-slate-700"
              >
                {votingInfo.percent}%
              </span>
            </div>
          </div>

          <div
            role="progressbar"
            aria-label={t.votingRowTitle}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={votingInfo.percent}
            className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200"
          >
            <div
              style={{ width: `${votingInfo.percent}%` }}
              className={`h-full rounded-full transition-all duration-300 ${getBarColorClass(
                votingInfo.tone
              )}`}
            />
          </div>

          <p
            className={`text-xs ${
              votingInfo.tone === "success"
                ? "text-emerald-700 font-medium"
                : votingInfo.tone === "error"
                ? "text-red-700 font-medium"
                : "text-slate-600"
            }`}
          >
            {votingLabel}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              state.phase === "completed"
                ? "bg-blue-700 text-white hover:bg-blue-800"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {state.phase === "completed" ? t.modalDoneBtn : t.modalBackgroundBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
