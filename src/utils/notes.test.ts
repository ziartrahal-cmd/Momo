import test from "node:test";
import assert from "node:assert/strict";
import { createNoteItem, filterNotes, validateNoteInput } from "./notes";

test("validateNoteInput requires non-empty content", () => {
  assert.equal(validateNoteInput("", "").valid, false);
  assert.equal(validateNoteInput("عنوان فقط", "   ").valid, false);
  assert.equal(validateNoteInput("", "محتوى صالح").valid, true);
});

test("createNoteItem derives fallback title when title is omitted", () => {
  const note = createNoteItem({
    title: "",
    content: "تلخيص نقاط الاجتماع الأسبوعي\nتفاصيل إضافية",
    source: "Gemini",
  });
  assert.equal(note.title, "تلخيص نقاط الاجتماع الأسبوعي");
  assert.equal(note.source, "Gemini");
  assert.ok(note.id.startsWith("note-"));
});

test("filterNotes matches title or content case-insensitively", () => {
  const n1 = createNoteItem({ title: "أمر برمجي", content: "React TypeScript" });
  const n2 = createNoteItem({ title: "وصفة قهوة", content: "بن محمص" });

  assert.equal(filterNotes([n1, n2], "typescript").length, 1);
  assert.equal(filterNotes([n1, n2], "قهوة").length, 1);
  assert.equal(filterNotes([n1, n2], "").length, 2);
});
