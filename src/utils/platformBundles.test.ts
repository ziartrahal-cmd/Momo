import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { INITIAL_PLATFORMS } from "../data/platforms.ts";
import {
  buildPlatformLaunchUrl,
  buildUnifiedHandoffPacket,
  createCustomPlatformGroup,
  getSuitePlatforms,
  PLATFORM_SUITES,
  resolvePlatformsByIds,
  togglePlatformInSelection,
  validateCustomGroupInput,
} from "./platformBundles.ts";

describe("Unified Platform Bundles & Custom Groups", () => {
  it("provides 4 coordinated suites with valid platform references", () => {
    assert.equal(PLATFORM_SUITES.length, 4);

    for (const suite of PLATFORM_SUITES) {
      const resolved = getSuitePlatforms(suite.id, INITIAL_PLATFORMS);
      assert.ok(resolved.length >= 6, `Suite ${suite.id} has platforms`);
      assert.ok(suite.labels.ar.name.length > 0);
      assert.ok(suite.labels.en.name.length > 0);
      assert.ok(suite.labels.ru.name.length > 0);
    }
  });

  it("resolves deduplicated platforms preserving requested order", () => {
    const resolved = resolvePlatformsByIds(INITIAL_PLATFORMS, [
      "youtube",
      "facebook",
      "youtube",
      "non-existent-id",
      "tiktok",
    ]);
    assert.deepEqual(
      resolved.map((p) => p.id),
      ["youtube", "facebook", "tiktok"]
    );
  });

  it("toggles platform selection cleanly", () => {
    const added = togglePlatformInSelection(["gemini"], "youtube");
    assert.deepEqual(added, ["gemini", "youtube"]);
    const removed = togglePlatformInSelection(added, "gemini");
    assert.deepEqual(removed, ["youtube"]);
  });

  it("validates custom groups require name and at least 2 platforms", () => {
    assert.equal(validateCustomGroupInput("", ["gemini", "youtube"], "en").valid, false);
    assert.equal(validateCustomGroupInput("My Group", ["gemini"], "en").valid, false);
    assert.equal(validateCustomGroupInput("My Group", ["gemini", "youtube"], "ru").valid, true);
  });

  it("attaches authuser for Google/YouTube links when Google email is signed in", () => {
    assert.equal(
      buildPlatformLaunchUrl("https://studio.youtube.com", "user@gmail.com"),
      "https://studio.youtube.com/?authuser=user%40gmail.com"
    );
    assert.equal(
      buildPlatformLaunchUrl("https://www.instagram.com", "user@gmail.com"),
      "https://www.instagram.com/"
    );
    assert.equal(
      buildPlatformLaunchUrl("https://gemini.google.com", null),
      "https://gemini.google.com"
    );
  });

  it("creates custom platform group and builds handoff packet with Google account", () => {
    const group = createCustomPlatformGroup(
      {
        name: "Creator Stack",
        platformIds: ["gemini", "youtube", "instagram", "youtube"],
      },
      "en",
      1700000000000
    );
    assert.equal(group.name, "Creator Stack");
    assert.deepEqual(group.platformIds, ["gemini", "youtube", "instagram"]);

    const platforms = resolvePlatformsByIds(INITIAL_PLATFORMS, group.platformIds);
    const packet = buildUnifiedHandoffPacket({
      suiteName: group.name,
      goal: "Launch weekly AI recap",
      platforms,
      googleAccountEmail: "creator@gmail.com",
    });
    assert.ok(packet.includes("Creator Stack"));
    assert.ok(packet.includes("creator@gmail.com"));
    assert.ok(packet.includes("authuser=creator%40gmail.com"));
    assert.ok(packet.includes("https://www.instagram.com"));
  });
});
