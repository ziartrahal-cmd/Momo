import test from "node:test";
import assert from "node:assert/strict";
import {
  buildComparisonColumns,
  countParagraphs,
  countWords,
} from "./comparison";

test("countWords and countParagraphs handle Arabic and multi-line text accurately", () => {
  assert.equal(countWords(""), 0);
  assert.equal(countWords("   "), 0);
  assert.equal(countWords("مرحباً بكم في الاختبار"), 4);

  assert.equal(countParagraphs(""), 0);
  assert.equal(countParagraphs("سطر أول\n\nسطر ثانٍ\nسطر ثالث"), 3);
});

test("buildComparisonColumns derives deterministic metrics and role labels", () => {
  const cols = buildComparisonColumns(
    [
      {
        id: "hydrogen",
        label: "Gemini 4 Hydrogen",
        modelId: "gemini-4-hydrogen",
        text: "إجابة أولى مختصرة\nمع نقطة إضافية",
      },
      {
        id: "flash-lite",
        label: "Gemini 3.1 Flash Lite",
        text: "إجابة ثانية",
      },
    ],
    "Gemini 4 Hydrogen"
  );

  assert.equal(cols.length, 2);
  assert.equal(cols[0].wordCount, 6);
  assert.equal(cols[0].paragraphCount, 2);
  assert.equal(cols[0].roleLabel, "الإجابة المعتمدة");
  assert.equal(cols[0].modelId, "gemini-4-hydrogen");

  assert.equal(cols[1].wordCount, 2);
  assert.equal(cols[1].paragraphCount, 1);
  assert.equal(cols[1].roleLabel, "مشارك في الترجيح");
  assert.equal(cols[1].modelId, "gemini-3.1-flash-lite");
});
