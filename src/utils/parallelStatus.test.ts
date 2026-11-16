import test from "node:test";
import assert from "node:assert/strict";
import {
  applyParallelEvent,
  createInitialParallelState,
  getCompletedStepCount,
  getModelProgressInfo,
  getVotingProgressInfo,
} from "./parallelStatus";

const SAMPLE_MODELS = [
  { id: "hydrogen", label: "Gemini 4 Hydrogen", modelId: "gemini-4-hydrogen" },
  { id: "flash-lite", label: "Gemini 3.1 Flash Lite", modelId: "gemini-3.1-flash-lite" },
];

test("createInitialParallelState initializes all models as running", () => {
  const state = createInitialParallelState(SAMPLE_MODELS);
  assert.equal(state.phase, "querying");
  assert.equal(state.steps.length, 2);
  assert.equal(state.steps[0].status, "running");
  assert.equal(state.steps[1].status, "running");
});

test("applyParallelEvent transitions through model updates, voting, and completion", () => {
  let state = createInitialParallelState(SAMPLE_MODELS);
  assert.equal(getVotingProgressInfo(state).percent, 0);

  state = applyParallelEvent(state, {
    type: "model_update",
    id: "hydrogen",
    status: "completed",
  });
  assert.deepEqual(getCompletedStepCount(state.steps), {
    finished: 1,
    succeeded: 1,
    total: 2,
  });
  assert.equal(state.phase, "querying");
  assert.equal(getVotingProgressInfo(state).percent, 25);
  assert.equal(getModelProgressInfo(state.steps[0], state.phase).percent, 100);
  assert.equal(getModelProgressInfo(state.steps[1], state.phase).percent, 50);

  state = applyParallelEvent(state, {
    type: "model_update",
    id: "flash-lite",
    status: "error",
    error: "تعذر الاستجابة",
  });
  assert.deepEqual(getCompletedStepCount(state.steps), {
    finished: 2,
    succeeded: 1,
    total: 2,
  });
  assert.equal(getVotingProgressInfo(state).percent, 50);

  state = applyParallelEvent(state, { type: "voting" });
  assert.equal(state.phase, "voting");
  assert.equal(getVotingProgressInfo(state).percent, 80);
  assert.equal(getModelProgressInfo(state.steps[0], state.phase).stageLabel, "جاهز للترجيح");

  state = applyParallelEvent(state, {
    type: "done",
    winnerLabel: "Gemini 4 Hydrogen",
  });
  assert.equal(state.phase, "completed");
  assert.equal(state.winnerLabel, "Gemini 4 Hydrogen");
  assert.equal(getVotingProgressInfo(state).percent, 100);
});

test("applyParallelEvent handles pipeline-level errors", () => {
  let state = createInitialParallelState(SAMPLE_MODELS);
  state = applyParallelEvent(state, {
    type: "error",
    error: "تعذر التحقق من صلاحية المفتاح",
  });
  assert.equal(state.phase, "error");
  assert.equal(state.errorMessage, "تعذر التحقق من صلاحية المفتاح");
  assert.equal(getVotingProgressInfo(state).tone, "error");
});
