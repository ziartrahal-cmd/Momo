import test from "node:test";
import assert from "node:assert/strict";
import {
  buildMemoryPromptContext,
  createAssistantTask,
  filterAssistantTasks,
  mergeMemories,
  updateAssistantTaskStatus,
} from "./assistantMemory";

test("mergeMemories adds unique memories and updates duplicates without duplication", () => {
  const initial = mergeMemories(
    [],
    [{ category: "project", summary: "ربط قناة يوتيوب لنشر الفيديوهات" }],
    1000
  );
  assert.equal(initial.length, 1);

  const merged = mergeMemories(
    initial,
    [
      { category: "project", summary: "  ربط قناة يوتيوب لنشر الفيديوهات  " },
      { category: "preference", summary: "يفضل التحدث باللهجة المصرية البسيطة" },
    ],
    2000
  );
  assert.equal(merged.length, 2);
  assert.equal(merged[0].category, "preference");
  assert.equal(merged[1].updatedAt, 2000);
});

test("createAssistantTask, updateAssistantTaskStatus, and filterAssistantTasks manage lifecycle cleanly", () => {
  const t1 = createAssistantTask(
    {
      title: "تجهيز وصف فيديو Rahal Plus",
      details: "كتابة وصف متكامل ووسوم لليوتيوب",
      kind: "draft_post",
    },
    1000
  );
  assert.equal(t1.status, "pending");

  const t2 = createAssistantTask(
    {
      title: "حفظ خطة المحتوى الأسبوعية",
      details: "تلخيص الأفكار في المفكرة",
      kind: "save_note",
      status: "done",
      resultSummary: "تمت إضافة الخطة إلى المفكرة",
    },
    2000
  );

  const pendingOnly = filterAssistantTasks([t1, t2], "pending");
  assert.equal(pendingOnly.length, 1);
  assert.equal(pendingOnly[0].id, t1.id);

  const updated = updateAssistantTaskStatus(
    [t1, t2],
    t1.id,
    "done",
    {
      resultSummary: "تم إنشاء مسودة النشر",
      linkedArtifactType: "draft",
      linkedArtifactTitle: "إطلاق Rahal Plus",
    },
    3000
  );
  assert.equal(filterAssistantTasks(updated, "done").length, 2);
  assert.equal(updated[0].linkedArtifactType, "draft");
  assert.equal(updated[0].completedAt, 3000);
});

test("buildMemoryPromptContext formats remembered facts, tasks, and workspace counts", () => {
  const memories = mergeMemories(
    [],
    [{ category: "goal", summary: "زيادة النشر على تيك توك وإنستجرام" }],
    1000
  );
  const task = createAssistantTask(
    {
      title: "اقتراح 3 أفكار Reels",
      details: "أفكار قصيرة",
      kind: "research",
    },
    1000
  );

  const context = buildMemoryPromptContext({
    memories,
    tasks: [task],
    reflections: [
      {
        id: "r1",
        insight: "المستخدم يركز على الفيديوهات القصيرة",
        neededCapability: "تحضير نصوص مختصرة وجاهزة للنشر",
        createdAt: 1000,
      },
    ],
    draftsCount: 2,
    notesCount: 4,
  });

  assert.ok(context.includes("زيادة النشر على تيك توك وإنستجرام"));
  assert.ok(context.includes("اقتراح 3 أفكار Reels"));
  assert.ok(context.includes("2 مسودة نشر مجدولة"));
});
