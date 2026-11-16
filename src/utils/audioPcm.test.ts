import test from "node:test";
import assert from "node:assert/strict";
import {
  appendTranscriptChunk,
  base64Int16ToFloat32,
  float32ToInt16Base64,
  isValidLiveVoice,
  resampleFloat32,
} from "./audioPcm";

test("float32ToInt16Base64 and base64Int16ToFloat32 roundtrip audio samples within PCM tolerance", () => {
  const original = new Float32Array([0, 0.5, -0.5, 1, -1, 0.25]);
  const encoded = float32ToInt16Base64(original);
  const decoded = base64Int16ToFloat32(encoded);

  assert.equal(decoded.length, original.length);
  for (let i = 0; i < original.length; i++) {
    assert.ok(
      Math.abs(decoded[i] - original[i]) < 0.001,
      `Sample ${i} mismatch: ${decoded[i]} vs ${original[i]}`
    );
  }
});

test("resampleFloat32 converts 48kHz audio down to 16kHz preserving approximate duration", () => {
  const input = new Float32Array(480);
  for (let i = 0; i < input.length; i++) {
    input[i] = Math.sin((i / 480) * Math.PI * 2);
  }
  const resampled = resampleFloat32(input, 48000, 16000);
  assert.equal(resampled.length, 160);
});

test("appendTranscriptChunk merges consecutive chunks of the same speaker and splits speaker turns", () => {
  let list = appendTranscriptChunk([], "user", "ازيك");
  list = appendTranscriptChunk(list, "user", "عامل ايه");
  list = appendTranscriptChunk(list, "model", "أهلاً بك! كيف أساعدك اليوم؟");

  assert.equal(list.length, 2);
  assert.equal(list[0].role, "user");
  assert.equal(list[0].text, "ازيك عامل ايه");
  assert.equal(list[1].role, "model");
});

test("isValidLiveVoice validates supported Gemini Live voices", () => {
  assert.equal(isValidLiveVoice("Zephyr"), true);
  assert.equal(isValidLiveVoice("Kore"), true);
  assert.equal(isValidLiveVoice("InvalidVoice"), false);
  assert.equal(isValidLiveVoice(null), false);
});
