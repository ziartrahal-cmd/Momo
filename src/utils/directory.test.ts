import test from "node:test";
import assert from "node:assert/strict";
import { INITIAL_PLATFORMS } from "../data/platforms";
import {
  createCustomPlatform,
  filterPlatforms,
  getHostname,
  toggleFavoriteId,
  validatePlatformInput,
} from "./directory";

test("validatePlatformInput rejects empty name or invalid url", () => {
  const missingName = validatePlatformInput({
    name: "   ",
    url: "https://example.com",
    category: "web",
  });
  assert.equal(missingName.valid, false);

  const missingUrl = validatePlatformInput({
    name: "My Site",
    url: "",
    category: "web",
  });
  assert.equal(missingUrl.valid, false);

  const badHost = validatePlatformInput({
    name: "My Site",
    url: "notadomain",
    category: "web",
  });
  assert.equal(badHost.valid, false);
});

test("validatePlatformInput normalizes https scheme when missing", () => {
  const result = validatePlatformInput({
    name: "OpenAI",
    url: "openai.com",
    category: "chat",
  });
  assert.equal(result.valid, true);
  assert.equal(result.normalizedUrl, "https://openai.com/");
  assert.equal(getHostname(result.normalizedUrl!), "openai.com");
});

test("toggleFavoriteId adds and removes platform ids idempotently", () => {
  const added = toggleFavoriteId([], "gemini");
  assert.deepEqual(added, ["gemini"]);

  const addedSecond = toggleFavoriteId(added, "youtube");
  assert.deepEqual(addedSecond, ["gemini", "youtube"]);

  const removed = toggleFavoriteId(addedSecond, "gemini");
  assert.deepEqual(removed, ["youtube"]);
});

test("filterPlatforms filters by category, query, and favorites", () => {
  const midjourneyOnly = filterPlatforms(INITIAL_PLATFORMS, {
    query: "midjourney",
    category: "all",
    favorites: [],
  });
  assert.equal(midjourneyOnly.length, 1);
  assert.equal(midjourneyOnly[0].id, "midjourney");

  const webOnly = filterPlatforms(INITIAL_PLATFORMS, {
    query: "",
    category: "web",
    favorites: [],
  });
  assert.equal(webOnly.length, 3);

  const favOnly = filterPlatforms(INITIAL_PLATFORMS, {
    query: "",
    category: "favorites",
    favorites: ["gemini", "youtube"],
  });
  assert.equal(favOnly.length, 2);

  const socialOnly = filterPlatforms(INITIAL_PLATFORMS, {
    query: "",
    category: "social",
    favorites: [],
  });
  assert.ok(socialOnly.some((item) => item.id === "instagram"));
  assert.ok(socialOnly.some((item) => item.id === "tiktok"));
});

test("createCustomPlatform builds valid custom platform object", () => {
  const item = createCustomPlatform({
    name: "مدونتي",
    url: "https://myblog.example.org/posts",
    category: "web",
  });
  assert.equal(item.isCustom, true);
  assert.equal(item.name, "مدونتي");
  assert.equal(item.company, "myblog.example.org");
  assert.ok(item.id.startsWith("custom-"));
});
