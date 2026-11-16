import type { PlatformCategory, PlatformEntry } from "../data/platforms";

export type CategoryFilter = PlatformCategory | "all" | "favorites";

export interface CustomPlatformInput {
  name: string;
  url: string;
  category: PlatformCategory;
  description?: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  normalizedUrl?: string;
}

export function validatePlatformInput(
  input: CustomPlatformInput,
  language: "ar" | "en" | "ru" = "ar"
): ValidationResult {
  const trimmedName = input.name.trim();
  if (!trimmedName) {
    return {
      valid: false,
      error:
        language === "en"
          ? "Please enter the website or platform name."
          : language === "ru"
          ? "Введите название сайта или платформы."
          : "يرجى كتابة اسم الموقع أو المنصة.",
    };
  }
  if (trimmedName.length > 60) {
    return {
      valid: false,
      error:
        language === "en"
          ? "Platform name must not exceed 60 characters."
          : language === "ru"
          ? "Название платформы не должно превышать 60 символов."
          : "اسم المنصة يجب ألا يتجاوز 60 حرفاً.",
    };
  }

  const rawUrl = input.url.trim();
  if (!rawUrl) {
    return {
      valid: false,
      error:
        language === "en"
          ? "Please enter the platform URL."
          : language === "ru"
          ? "Введите ссылку (URL) платформы."
          : "يرجى إدخال رابط الموقع.",
    };
  }

  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(rawUrl) && !/^https?:\/\//i.test(rawUrl)) {
    return {
      valid: false,
      error:
        language === "en"
          ? "URL must start with http:// or https://"
          : language === "ru"
          ? "Ссылка должна начинаться с http:// или https://"
          : "يجب أن يبدأ الرابط بـ http:// أو https://",
    };
  }

  const candidate = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return {
        valid: false,
        error:
          language === "en"
            ? "URL must start with http:// or https://"
            : language === "ru"
            ? "Ссылка должна начинаться с http:// или https://"
            : "يجب أن يبدأ الرابط بـ http:// أو https://",
      };
    }
    if (!parsed.hostname.includes(".")) {
      return {
        valid: false,
        error:
          language === "en"
            ? "Please enter a valid domain such as example.com"
            : language === "ru"
            ? "Введите корректный домен, например example.com"
            : "يرجى إدخال نطاق موقع صحيح مثل example.com",
      };
    }
    return { valid: true, normalizedUrl: parsed.toString() };
  } catch {
    return {
      valid: false,
      error:
        language === "en"
          ? "Invalid URL format."
          : language === "ru"
          ? "Некорректный формат ссылки."
          : "صيغة الرابط غير صالحة.",
    };
  }
}

export function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function toggleFavoriteId(favorites: string[], id: string): string[] {
  if (favorites.includes(id)) {
    return favorites.filter((item) => item !== id);
  }
  return [...favorites, id];
}

export function filterPlatforms(
  platforms: PlatformEntry[],
  options: {
    query: string;
    category: CategoryFilter;
    favorites: string[];
  }
): PlatformEntry[] {
  const normalizedQuery = options.query.trim().toLowerCase();

  return platforms.filter((platform) => {
    if (options.category === "favorites") {
      if (!options.favorites.includes(platform.id)) {
        return false;
      }
    } else if (options.category !== "all" && platform.category !== options.category) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystack = `${platform.name} ${platform.company} ${platform.description} ${platform.url}`.toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}

export function createCustomPlatform(
  input: CustomPlatformInput,
  idPrefix = "custom"
): PlatformEntry {
  const validation = validatePlatformInput(input);
  if (!validation.valid || !validation.normalizedUrl) {
    throw new Error(validation.error ?? "Invalid platform input");
  }

  const cleanDesc =
    input.description?.trim() || `رابط مخصص إلى ${getHostname(validation.normalizedUrl)}.`;

  return {
    id: `${idPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: input.name.trim(),
    company: getHostname(validation.normalizedUrl),
    category: input.category,
    url: validation.normalizedUrl,
    description: cleanDesc,
    isCustom: true,
  };
}
