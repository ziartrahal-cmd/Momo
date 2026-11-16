export type ParallelModelStepStatus = "pending" | "running" | "completed" | "error";

export interface ParallelModelStep {
  id: string;
  label: string;
  modelId: string;
  status: ParallelModelStepStatus;
  error?: string;
}

export type ParallelPhase = "idle" | "querying" | "voting" | "completed" | "error";

export interface ParallelPipelineState {
  phase: ParallelPhase;
  steps: ParallelModelStep[];
  winnerLabel?: string;
  errorMessage?: string;
}

export type ParallelStreamEvent =
  | {
      type: "start";
      models: Array<{ id: string; label: string; modelId: string }>;
    }
  | {
      type: "model_update";
      id: string;
      status: "completed" | "error";
      error?: string;
    }
  | {
      type: "voting";
    }
  | {
      type: "done";
      winnerLabel?: string;
    }
  | {
      type: "error";
      error: string;
    };

export function createInitialParallelState(
  models: Array<{ id: string; label: string; modelId: string }>
): ParallelPipelineState {
  return {
    phase: "querying",
    steps: models.map((m) => ({
      id: m.id,
      label: m.label,
      modelId: m.modelId,
      status: "running",
    })),
  };
}

export function applyParallelEvent(
  state: ParallelPipelineState,
  event: ParallelStreamEvent
): ParallelPipelineState {
  switch (event.type) {
    case "start":
      return createInitialParallelState(event.models);

    case "model_update":
      return {
        ...state,
        steps: state.steps.map((step) =>
          step.id === event.id
            ? { ...step, status: event.status, error: event.error }
            : step
        ),
      };

    case "voting":
      return {
        ...state,
        phase: "voting",
      };

    case "done":
      return {
        ...state,
        phase: "completed",
        winnerLabel: event.winnerLabel,
      };

    case "error":
      return {
        ...state,
        phase: "error",
        errorMessage: event.error,
      };

    default:
      return state;
  }
}

export function getCompletedStepCount(steps: ParallelModelStep[]): {
  finished: number;
  succeeded: number;
  total: number;
} {
  let finished = 0;
  let succeeded = 0;
  for (const step of steps) {
    if (step.status === "completed") {
      finished += 1;
      succeeded += 1;
    } else if (step.status === "error") {
      finished += 1;
    }
  }
  return { finished, succeeded, total: steps.length };
}

export type ProgressTone = "neutral" | "active" | "success" | "error";

export interface ModelProgressInfo {
  percent: number;
  stageLabel: string;
  tone: ProgressTone;
}

export function getModelProgressInfo(
  step: ParallelModelStep,
  phase: ParallelPhase
): ModelProgressInfo {
  switch (step.status) {
    case "pending":
      return { percent: 0, stageLabel: "في الانتظار", tone: "neutral" };
    case "running":
      return {
        percent: 50,
        stageLabel: "جاري توليد الإجابة...",
        tone: "active",
      };
    case "completed":
      return {
        percent: 100,
        stageLabel: phase === "voting" ? "جاهز للترجيح" : "اكتملت الإجابة",
        tone: "success",
      };
    case "error":
      return {
        percent: 100,
        stageLabel: step.error || "تعذر الاستجابة",
        tone: "error",
      };
  }
}

export function getVotingProgressInfo(
  state: ParallelPipelineState
): ModelProgressInfo {
  if (state.phase === "idle") {
    return { percent: 0, stageLabel: "في الانتظار", tone: "neutral" };
  }
  if (state.phase === "querying") {
    const { finished, total } = getCompletedStepCount(state.steps);
    const percent = total > 0 ? Math.round((finished / total) * 50) : 0;
    return {
      percent,
      stageLabel: "بانتظار اكتمال إجابات النماذج",
      tone: "active",
    };
  }
  if (state.phase === "voting") {
    return {
      percent: 80,
      stageLabel: "جاري مقارنة الإجابات واختيار الأنسب...",
      tone: "active",
    };
  }
  if (state.phase === "completed") {
    return {
      percent: 100,
      stageLabel: state.winnerLabel
        ? `تم الاعتماد (${state.winnerLabel})`
        : "اكتمل الترجيح",
      tone: "success",
    };
  }
  return {
    percent: 100,
    stageLabel: state.errorMessage || "توقف التقييم",
    tone: "error",
  };
}
