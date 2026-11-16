export type SocialPlatformId =
  | "youtube"
  | "google"
  | "facebook"
  | "instagram"
  | "tiktok";

export type DraftStatus = "draft" | "ready" | "published";

export type YouTubePrivacyStatus = "private" | "unlisted" | "public";

export interface PublishDraft {
  id: string;
  title: string;
  caption: string;
  targets: SocialPlatformId[];
  scheduledFor: string;
  mediaNote: string;
  status: DraftStatus;
  publishedUrl?: string;
  createdAt: number;
}

export interface PublishDraftInput {
  title: string;
  caption: string;
  targets: SocialPlatformId[];
  scheduledFor?: string;
  mediaNote?: string;
  status?: DraftStatus;
}

export interface YouTubeUploadValidationInput {
  title: string;
  description: string;
  privacyStatus: YouTubePrivacyStatus;
  hasFile: boolean;
  fileSizeBytes?: number;
  mimeType?: string;
}

export interface ValidationOutcome {
  valid: boolean;
  error?: string;
}

export const SOCIAL_PLATFORM_META: Record<
  SocialPlatformId,
  { id: SocialPlatformId; label: string; shortLabel: string; url: string }
> = {
  youtube: {
    id: "youtube",
    label: "يوتيوب (YouTube)",
    shortLabel: "YouTube",
    url: "https://studio.youtube.com",
  },
  google: {
    id: "google",
    label: "جوجل (Google)",
    shortLabel: "Google",
    url: "https://business.google.com",
  },
  facebook: {
    id: "facebook",
    label: "فيسبوك (Facebook)",
    shortLabel: "Facebook",
    url: "https://business.facebook.com",
  },
  instagram: {
    id: "instagram",
    label: "إنستجرام (Instagram)",
    shortLabel: "Instagram",
    url: "https://www.instagram.com",
  },
  tiktok: {
    id: "tiktok",
    label: "تيك توك (TikTok)",
    shortLabel: "TikTok",
    url: "https://www.tiktok.com/tiktokstudio/upload",
  },
};

export const DRAFT_STATUS_LABELS: Record<DraftStatus, string> = {
  draft: "مسودة للإضافة لاحقًا",
  ready: "جاهز للنشر",
  published: "تم النشر",
};

export function validatePublishDraft(
  input: PublishDraftInput,
  language: "ar" | "en" | "ru" = "ar"
): ValidationOutcome {
  const title = input.title.trim();
  const caption = input.caption.trim();

  if (!title) {
    return {
      valid: false,
      error:
        language === "en"
          ? "Please enter a title for the video or post."
          : language === "ru"
          ? "Введите заголовок видео или публикации."
          : "يرجى كتابة عنوان للمحتوى أو الفيديو.",
    };
  }
  if (title.length > 120) {
    return {
      valid: false,
      error:
        language === "en"
          ? "Title must not exceed 120 characters."
          : language === "ru"
          ? "Заголовок не должен превышать 120 символов."
          : "العنوان يجب ألا يتجاوز 120 حرفاً.",
    };
  }
  if (!caption) {
    return {
      valid: false,
      error:
        language === "en"
          ? "Please write the description or post caption."
          : language === "ru"
          ? "Введите описание или текст публикации."
          : "يرجى كتابة الوصف أو نص المنشور المراد نشره.",
    };
  }
  if (!Array.isArray(input.targets) || input.targets.length === 0) {
    return {
      valid: false,
      error:
        language === "en"
          ? "Select at least one platform (YouTube, Google, Facebook, Instagram, TikTok)."
          : language === "ru"
          ? "Выберите хотя бы одну платформу (YouTube, Google, Facebook, Instagram, TikTok)."
          : "اختر منصة واحدة على الأقل (يوتيوب، جوجل، فيسبوك، إنستجرام، تيك توك).",
    };
  }

  return { valid: true };
}

export function createPublishDraft(
  input: PublishDraftInput,
  now = Date.now(),
  language: "ar" | "en" | "ru" = "ar"
): PublishDraft {
  const check = validatePublishDraft(input, language);
  if (!check.valid) {
    throw new Error(check.error ?? "Invalid publish draft");
  }

  return {
    id: `draft-${now}-${Math.random().toString(36).slice(2, 7)}`,
    title: input.title.trim(),
    caption: input.caption.trim(),
    targets: Array.from(new Set(input.targets)),
    scheduledFor: input.scheduledFor?.trim() ?? "",
    mediaNote: input.mediaNote?.trim() ?? "",
    status: input.status ?? "draft",
    createdAt: now,
  };
}

export function filterPublishDrafts(
  drafts: PublishDraft[],
  options: {
    targetFilter: SocialPlatformId | "all";
    statusFilter: DraftStatus | "all";
    query: string;
  }
): PublishDraft[] {
  const q = options.query.trim().toLowerCase();

  return drafts.filter((item) => {
    if (
      options.targetFilter !== "all" &&
      !item.targets.includes(options.targetFilter)
    ) {
      return false;
    }
    if (options.statusFilter !== "all" && item.status !== options.statusFilter) {
      return false;
    }
    if (!q) return true;

    const haystack = `${item.title} ${item.caption} ${item.mediaNote}`.toLowerCase();
    return haystack.includes(q);
  });
}

export function parseTagsInput(raw: string): string[] {
  if (!raw.trim()) return [];
  const seen = new Set<string>();
  const result: string[] = [];

  for (const part of raw.split(/[,،\n]+/)) {
    const clean = part.trim();
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(clean.slice(0, 40));
    if (result.length >= 15) break;
  }

  return result;
}

export function validateYouTubeUploadInput(
  input: YouTubeUploadValidationInput,
  language: "ar" | "en" | "ru" = "ar"
): ValidationOutcome {
  if (!input.hasFile) {
    return {
      valid: false,
      error:
        language === "en"
          ? "Please select a video file from your device first."
          : language === "ru"
          ? "Сначала выберите видеофайл с устройства."
          : "يرجى اختيار ملف فيديو من جهازك أولاً.",
    };
  }
  if (
    input.mimeType &&
    !input.mimeType.startsWith("video/") &&
    input.mimeType !== "application/octet-stream"
  ) {
    return {
      valid: false,
      error:
        language === "en"
          ? "The selected file is not a valid video for YouTube upload."
          : language === "ru"
          ? "Выбранный файл не является видео для загрузки на YouTube."
          : "الملف المحدد ليس ملف فيديو صالحاً للرفع إلى YouTube.",
    };
  }
  if (typeof input.fileSizeBytes === "number" && input.fileSizeBytes <= 0) {
    return {
      valid: false,
      error:
        language === "en"
          ? "The selected video file is empty."
          : language === "ru"
          ? "Выбранный видеофайл пуст."
          : "ملف الفيديو فارغ ولا يمكن رفعه.",
    };
  }

  const title = input.title.trim();
  if (!title) {
    return {
      valid: false,
      error:
        language === "en"
          ? "Please enter the YouTube video title."
          : language === "ru"
          ? "Введите название видео для YouTube."
          : "يرجى كتابة عنوان الفيديو على YouTube.",
    };
  }
  if (title.length > 100) {
    return {
      valid: false,
      error:
        language === "en"
          ? "YouTube video title must be 100 characters or less."
          : language === "ru"
          ? "Название видео для YouTube не должно превышать 100 символов."
          : "عنوان الفيديو على YouTube يجب ألا يتجاوز 100 حرف.",
    };
  }
  if (input.description.trim().length > 5000) {
    return {
      valid: false,
      error:
        language === "en"
          ? "Video description must be 5000 characters or less."
          : language === "ru"
          ? "Описание видео не должно превышать 5000 символов."
          : "وصف الفيديو يجب ألا يتجاوز 5000 حرف.",
    };
  }
  if (
    input.privacyStatus !== "private" &&
    input.privacyStatus !== "unlisted" &&
    input.privacyStatus !== "public"
  ) {
    return {
      valid: false,
      error:
        language === "en"
          ? "Invalid privacy status selected."
          : language === "ru"
          ? "Выбран некорректный статус доступа."
          : "حالة الخصوصية المحددة غير صالحة.",
    };
  }

  return { valid: true };
}

export function buildYouTubeMetadataPayload(input: {
  title: string;
  description: string;
  tags: string[];
  privacyStatus: YouTubePrivacyStatus;
}) {
  return {
    snippet: {
      title: input.title.trim(),
      description: input.description.trim(),
      ...(input.tags.length > 0 ? { tags: input.tags } : {}),
    },
    status: {
      privacyStatus: input.privacyStatus,
    },
  };
}
