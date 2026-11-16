import test from "node:test";
import assert from "node:assert/strict";
import {
  buildWorkspaceSnapshotPayload,
  expandHomeDirectory,
  formatByteSize,
  validateStorageFolderPath,
} from "./localDeviceStorage";

test("validateStorageFolderPath accepts safe custom and preset paths", () => {
  assert.deepEqual(validateStorageFolderPath("~/RahalPlusData", "ar"), {
    valid: true,
    normalizedPath: "~/RahalPlusData",
  });
  assert.deepEqual(validateStorageFolderPath("./rahal-plus-data", "en"), {
    valid: true,
    normalizedPath: "./rahal-plus-data",
  });
});

test("validateStorageFolderPath rejects empty, unsafe root, and invalid chars", () => {
  const empty = validateStorageFolderPath("   ", "en");
  assert.equal(empty.valid, false);
  assert.ok(empty.error?.includes("enter"));

  const root = validateStorageFolderPath("/", "ar");
  assert.equal(root.valid, false);

  const winRoot = validateStorageFolderPath("C:\\Windows", "ru");
  assert.equal(winRoot.valid, false);

  const badChars = validateStorageFolderPath("/tmp/bad*folder", "en");
  assert.equal(badChars.valid, false);
});

test("expandHomeDirectory expands tilde paths safely", () => {
  assert.equal(
    expandHomeDirectory("~/Documents/RahalPlus", "/home/user"),
    "/home/user/Documents/RahalPlus"
  );
  assert.equal(
    expandHomeDirectory("/opt/rahal-data", "/home/user"),
    "/opt/rahal-data"
  );
});

test("formatByteSize formats bytes cleanly", () => {
  assert.equal(formatByteSize(512), "512 B");
  assert.equal(formatByteSize(2048), "2.0 KB");
  assert.equal(formatByteSize(1024 * 1024 * 2), "2.00 MB");
});

test("buildWorkspaceSnapshotPayload caps messages to 40 and captures activeEmail", () => {
  const messages = Array.from({ length: 50 }, (_, idx) => ({
    id: `m-${idx}`,
    role: (idx % 2 === 0 ? "user" : "model") as "user" | "model",
    text: `Turn ${idx}`,
  }));

  const snapshot = buildWorkspaceSnapshotPayload({
    activeEmail: "creator@gmail.com",
    language: "ar",
    memories: [],
    assistantTasks: [],
    selfReflections: [],
    latestWorkReport: null,
    notes: [],
    publishDrafts: [],
    customPlatforms: [],
    customGroups: [],
    favorites: ["youtube"],
    messages,
  });

  assert.equal(snapshot.version, 1);
  assert.equal(snapshot.activeEmail, "creator@gmail.com");
  assert.equal(snapshot.messages.length, 40);
  assert.equal(snapshot.messages[0]?.id, "m-10");
});
