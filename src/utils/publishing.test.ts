import test from "node:test";
import assert from "node:assert/strict";
import {
  buildYouTubeMetadataPayload,
  createPublishDraft,
  filterPublishDrafts,
  parseTagsInput,
  validatePublishDraft,
  validateYouTubeUploadInput,
} from "./publishing";

test("validatePublishDraft enforces title, caption, and at least one target platform", () => {
  assert.equal(
    validatePublishDraft({
      title: "   ",
      caption: "محتوى تجريبي",
      targets: ["youtube"],
    }).valid,
    false
  );

  assert.equal(
    validatePublishDraft({
      title: "فيديو جديد",
      caption: "   ",
      targets: ["youtube"],
    }).valid,
    false
  );

  assert.equal(
    validatePublishDraft({
      title: "فيديو جديد",
      caption: "تفاصيل الفيديو",
      targets: [],
    }).valid,
    false
  );

  assert.equal(
    validatePublishDraft({
      title: "فيديو تعريفي",
      caption: "شرح مبسط للمشروع",
      targets: ["youtube", "tiktok", "instagram"],
    }).valid,
    true
  );
});

test("createPublishDraft deduplicates targets and filterPublishDrafts filters accurately", () => {
  const first = createPublishDraft(
    {
      title: "حلقة يوتيوب الأولى",
      caption: "مراجعة شاملة للأدوات",
      targets: ["youtube", "youtube", "facebook"],
      status: "ready",
    },
    1000
  );
  assert.deepEqual(first.targets, ["youtube", "facebook"]);
  assert.equal(first.status, "ready");

  const second = createPublishDraft(
    {
      title: "ريلز إنستجرام وتيك توك",
      caption: "لقطات سريعة من الكواليس",
      targets: ["instagram", "tiktok"],
      status: "draft",
      mediaNote: "مقطع عمودي 9:16",
    },
    2000
  );

  const tiktokOnly = filterPublishDrafts([first, second], {
    targetFilter: "tiktok",
    statusFilter: "all",
    query: "",
  });
  assert.equal(tiktokOnly.length, 1);
  assert.equal(tiktokOnly[0].id, second.id);

  const searchMatch = filterPublishDrafts([first, second], {
    targetFilter: "all",
    statusFilter: "draft",
    query: "عمودي",
  });
  assert.equal(searchMatch.length, 1);
  assert.equal(searchMatch[0].id, second.id);
});

test("parseTagsInput splits Arabic and English commas and deduplicates", () => {
  const tags = parseTagsInput("ذكاء اصطناعي, AI، برمجة, ai, شرح");
  assert.deepEqual(tags, ["ذكاء اصطناعي", "AI", "برمجة", "شرح"]);
});

test("validateYouTubeUploadInput and buildYouTubeMetadataPayload validate video upload fields", () => {
  assert.equal(
    validateYouTubeUploadInput({
      title: "فيديو تجريبي",
      description: "وصف",
      privacyStatus: "private",
      hasFile: false,
    }).valid,
    false
  );

  assert.equal(
    validateYouTubeUploadInput({
      title: "فيديو تجريبي",
      description: "وصف",
      privacyStatus: "private",
      hasFile: true,
      fileSizeBytes: 1024,
      mimeType: "image/png",
    }).valid,
    false
  );

  assert.equal(
    validateYouTubeUploadInput({
      title: "أ".repeat(101),
      description: "وصف",
      privacyStatus: "private",
      hasFile: true,
      fileSizeBytes: 1024,
      mimeType: "video/mp4",
    }).valid,
    false
  );

  assert.equal(
    validateYouTubeUploadInput({
      title: "شرح ربط القنوات",
      description: "تفاصيل العمل",
      privacyStatus: "unlisted",
      hasFile: true,
      fileSizeBytes: 204800,
      mimeType: "video/mp4",
    }).valid,
    true
  );

  const payload = buildYouTubeMetadataPayload({
    title: "  شرح ربط القنوات  ",
    description: "  تفاصيل العمل  ",
    tags: ["يوتيوب", "شروحات"],
    privacyStatus: "unlisted",
  });

  assert.deepEqual(payload, {
    snippet: {
      title: "شرح ربط القنوات",
      description: "تفاصيل العمل",
      tags: ["يوتيوب", "شروحات"],
    },
    status: {
      privacyStatus: "unlisted",
    },
  });
});
