import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CATEGORY_LABELS_I18N,
  DRAFT_STATUS_I18N,
  getIntlLocale,
  getLanguageDir,
  isAppLanguage,
  LANGUAGE_OPTIONS,
  MEMORY_CATEGORY_I18N,
  TASK_KIND_I18N,
  TASK_STATUS_I18N,
  UI_TEXT,
} from "./i18n.ts";

describe("Trilingual i18n dictionary (Arabic, English, Russian)", () => {
  it("supports ar, en, and ru with accurate direction and locale", () => {
    assert.equal(LANGUAGE_OPTIONS.length, 3);
    assert.equal(getLanguageDir("ar"), "rtl");
    assert.equal(getLanguageDir("en"), "ltr");
    assert.equal(getLanguageDir("ru"), "ltr");
    assert.equal(getIntlLocale("ar"), "ar-EG");
    assert.equal(getIntlLocale("en"), "en-US");
    assert.equal(getIntlLocale("ru"), "ru-RU");
    assert.equal(isAppLanguage("ru"), true);
    assert.equal(isAppLanguage("fr"), false);
  });

  it("provides full key parity across all sections for ar, en, and ru", () => {
    const langs = ["ar", "en", "ru"] as const;
    const arKeys = Object.keys(UI_TEXT.ar);

    for (const lang of langs) {
      assert.deepEqual(Object.keys(UI_TEXT[lang]), arKeys);
      assert.deepEqual(Object.keys(UI_TEXT[lang].header), Object.keys(UI_TEXT.ar.header));
      assert.deepEqual(
        Object.keys(UI_TEXT[lang].header.googleAuth),
        Object.keys(UI_TEXT.ar.header.googleAuth)
      );
      assert.deepEqual(
        Object.keys(UI_TEXT[lang].publishing),
        Object.keys(UI_TEXT.ar.publishing)
      );
      assert.deepEqual(
        Object.keys(UI_TEXT[lang].directory),
        Object.keys(UI_TEXT.ar.directory)
      );
      assert.deepEqual(
        Object.keys(UI_TEXT[lang].directory.orchestrator),
        Object.keys(UI_TEXT.ar.directory.orchestrator)
      );
      assert.deepEqual(Object.keys(UI_TEXT[lang].notes), Object.keys(UI_TEXT.ar.notes));
      assert.equal(UI_TEXT[lang].gemini.starters.length, 4);
      assert.equal(Object.keys(CATEGORY_LABELS_I18N[lang]).length, 8);
      assert.equal(Object.keys(MEMORY_CATEGORY_I18N[lang]).length, 4);
      assert.equal(Object.keys(TASK_KIND_I18N[lang]).length, 4);
      assert.equal(Object.keys(TASK_STATUS_I18N[lang]).length, 3);
      assert.equal(Object.keys(DRAFT_STATUS_I18N[lang]).length, 3);
    }
  });
});
