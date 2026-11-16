import type { PlatformEntry } from "../data/platforms";
import type { AppLanguage } from "./i18n";
import type { SocialPlatformId } from "./publishing";

export type SuiteId =
  | "all-in-one"
  | "social-blast"
  | "media-studio"
  | "dev-research";

export interface PlatformSuiteDefinition {
  id: SuiteId;
  platformIds: string[];
  publishTargets: SocialPlatformId[];
  labels: Record<
    AppLanguage,
    {
      name: string;
      tagline: string;
      workflowSummary: string;
    }
  >;
}

export interface CustomPlatformGroup {
  id: string;
  name: string;
  platformIds: string[];
  createdAt: number;
}

export interface OrchestratedPlatformStep {
  platformId: string;
  platformName: string;
  roleInChain: string;
  tailoredPrompt: string;
  actionUrl: string;
}

export interface OrchestrationPlanResult {
  suiteName: string;
  summary: string;
  sharedMasterBrief: string;
  platformSteps: OrchestratedPlatformStep[];
  unifiedDraft: {
    title: string;
    caption: string;
    targets: SocialPlatformId[];
  } | null;
  checklistNote: {
    title: string;
    content: string;
  } | null;
}

export const PLATFORM_SUITES: PlatformSuiteDefinition[] = [
  {
    id: "all-in-one",
    platformIds: [
      "gemini",
      "chatgpt",
      "claude",
      "perplexity",
      "midjourney",
      "runway",
      "elevenlabs",
      "youtube",
      "youtube-studio",
      "google-business",
      "facebook",
      "meta-business",
      "instagram",
      "tiktok",
      "tiktok-studio",
    ],
    publishTargets: ["youtube", "google", "facebook", "instagram", "tiktok"],
    labels: {
      ar: {
        name: "المنظومة الشاملة (كل المنصات معاً)",
        tagline: "ذكاء اصطناعي + إنتاج مرئي وصوتي + نشر موحد عبر 5 قنوات",
        workflowSummary:
          "تخطيط الفكرة عبر Gemini/ChatGPT/Claude، إنتاج الصور والفيديو والصوت، ثم النشر المتزامن على YouTube وGoogle وFacebook وInstagram وTikTok.",
      },
      en: {
        name: "All-in-One Unified Pipeline",
        tagline: "AI council + media creation + 5-channel synchronized publishing",
        workflowSummary:
          "Strategize with Gemini/ChatGPT/Claude, produce visuals/video/audio, and broadcast across YouTube, Google, Facebook, Instagram, and TikTok together.",
      },
      ru: {
        name: "Единая система (все платформы вместе)",
        tagline: "ИИ-модели + видео/аудио-продакшн + публикация в 5 каналов",
        workflowSummary:
          "План в Gemini/ChatGPT/Claude, создание визуала, видео и озвучки, затем синхронный выпуск в YouTube, Google, Facebook, Instagram и TikTok.",
      },
    },
  },
  {
    id: "social-blast",
    platformIds: [
      "youtube",
      "youtube-studio",
      "google-business",
      "facebook",
      "meta-business",
      "instagram",
      "tiktok",
      "tiktok-studio",
      "x-twitter",
      "linkedin",
      "threads",
      "snapchat",
      "pinterest",
    ],
    publishTargets: ["youtube", "google", "facebook", "instagram", "tiktok"],
    labels: {
      ar: {
        name: "مجموعة السوشيال والنشر الموحد",
        tagline: "جوجل + يوتيوب + فيسبوك + إنستجرام + تيك توك + الشبكات الاجتماعية",
        workflowSummary:
          "محتوى واحد يتكيّف تلقائياً لكل منصة نشر واستوديو إدارة صفحات مع جدول نشر متزامن.",
      },
      en: {
        name: "Social Media Broadcast Group",
        tagline: "Google + YouTube + Facebook + Instagram + TikTok + Social Studios",
        workflowSummary:
          "Adapt one core campaign across every connected social network and creator studio simultaneously.",
      },
      ru: {
        name: "Группа соцсетей и публикаций",
        tagline: "Google + YouTube + Facebook + Instagram + TikTok + соцсети",
        workflowSummary:
          "Единая кампания с адаптацией форматов под все подключённые соцсети и студии авторов.",
      },
    },
  },
  {
    id: "media-studio",
    platformIds: [
      "gemini",
      "midjourney",
      "firefly",
      "sora",
      "runway",
      "elevenlabs",
      "suno",
      "youtube-studio",
      "tiktok-studio",
    ],
    publishTargets: ["youtube", "instagram", "tiktok"],
    labels: {
      ar: {
        name: "مجموعة الإنتاج المرئي والصوتي",
        tagline: "سيناريو + صور + فيديو + تعليق صوتي وموسيقى + تصدير",
        workflowSummary:
          "سلسلة إنتاج متصلة من كتابة السكربت والصور المصغرة وتوليد المشاهد والصوت حتى التصدير للاستوديو.",
      },
      en: {
        name: "AI Media & Video Studio",
        tagline: "Script + Art + Motion + Voiceover & Music + Studio Export",
        workflowSummary:
          "Connected creation chain from script and thumbnails to AI video scenes, voiceover, and studio upload.",
      },
      ru: {
        name: "Студия видео, фото и звука",
        tagline: "Сценарий + арт + видео + озвучка и музыка + загрузка",
        workflowSummary:
          "Сквозной цикл от сценария и обложек до генерации видео, озвучки и подготовки в студиях.",
      },
    },
  },
  {
    id: "dev-research",
    platformIds: [
      "gemini",
      "claude",
      "chatgpt",
      "deepseek",
      "perplexity",
      "notebooklm",
      "cursor",
      "github-copilot",
      "replit",
    ],
    publishTargets: ["google", "youtube"],
    labels: {
      ar: {
        name: "مجموعة البحث والبرمجة العميقة",
        tagline: "بحث موثق بالمصادر + مقارنة نماذج + تطوير واختبار الكود",
        workflowSummary:
          "ربط محركات البحث العلمي والدفاتر الذكية مع محررات الأكواد والنماذج التحليلية في خط عمل واحد.",
      },
      en: {
        name: "Research & Engineering Sync",
        tagline: "Verified research + multi-model reasoning + coding workspace",
        workflowSummary:
          "Bridge source-grounded research tools and notebooks directly into coding IDEs and architectural review.",
      },
      ru: {
        name: "Группа исследований и разработки",
        tagline: "Поиск с источниками + анализ моделей + разработка кода",
        workflowSummary:
          "Связка научного поиска и записных книжек с редакторами кода и архитектурным анализом.",
      },
    },
  },
];

export function resolvePlatformsByIds(
  allPlatforms: PlatformEntry[],
  ids: string[]
): PlatformEntry[] {
  const byId = new Map(allPlatforms.map((p) => [p.id, p]));
  const result: PlatformEntry[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) continue;
    const match = byId.get(id);
    if (match) {
      seen.add(id);
      result.push(match);
    }
  }
  return result;
}

export function getSuitePlatforms(
  suiteId: SuiteId,
  allPlatforms: PlatformEntry[]
): PlatformEntry[] {
  const suite = PLATFORM_SUITES.find((s) => s.id === suiteId);
  if (!suite) return [];
  return resolvePlatformsByIds(allPlatforms, suite.platformIds);
}

export function togglePlatformInSelection(
  currentIds: string[],
  platformId: string
): string[] {
  if (currentIds.includes(platformId)) {
    return currentIds.filter((id) => id !== platformId);
  }
  return [...currentIds, platformId];
}

export function validateCustomGroupInput(
  name: string,
  platformIds: string[],
  language: AppLanguage = "ar"
): { valid: boolean; error?: string } {
  const cleanName = name.trim();
  if (!cleanName) {
    return {
      valid: false,
      error:
        language === "en"
          ? "Please enter a name for this merged group."
          : language === "ru"
          ? "Введите название для объединённой группы."
          : "يرجى كتابة اسم للمجموعة المدمجة.",
    };
  }
  if (cleanName.length > 60) {
    return {
      valid: false,
      error:
        language === "en"
          ? "Group name must be 60 characters or less."
          : language === "ru"
          ? "Название группы не должно превышать 60 символов."
          : "اسم المجموعة يجب ألا يتجاوز 60 حرفاً.",
    };
  }
  if (!Array.isArray(platformIds) || platformIds.length < 2) {
    return {
      valid: false,
      error:
        language === "en"
          ? "Select at least 2 platforms to merge them into a working group."
          : language === "ru"
          ? "Выберите минимум 2 платформы для объединения в группу."
          : "اختر منصتين على الأقل لدمجهما معاً في مجموعة عمل واحدة.",
    };
  }
  return { valid: true };
}

export function createCustomPlatformGroup(
  input: { name: string; platformIds: string[] },
  language: AppLanguage = "ar",
  now = Date.now()
): CustomPlatformGroup {
  const uniqueIds = Array.from(new Set(input.platformIds.filter(Boolean)));
  const check = validateCustomGroupInput(input.name, uniqueIds, language);
  if (!check.valid) {
    throw new Error(check.error ?? "Invalid custom platform group");
  }
  return {
    id: `grp-${now}-${Math.random().toString(36).slice(2, 7)}`,
    name: input.name.trim(),
    platformIds: uniqueIds,
    createdAt: now,
  };
}

export function buildPlatformLaunchUrl(
  rawUrl: string,
  googleAccountEmail?: string | null
): string {
  const email = googleAccountEmail?.trim();
  if (!email) return rawUrl;

  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();
    const isGoogleHost =
      host === "google.com" ||
      host.endsWith(".google.com") ||
      host === "youtube.com" ||
      host.endsWith(".youtube.com");

    if (isGoogleHost && !parsed.searchParams.has("authuser")) {
      parsed.searchParams.set("authuser", email);
    }
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

export function buildUnifiedHandoffPacket(params: {
  suiteName: string;
  goal: string;
  platforms: PlatformEntry[];
  googleAccountEmail?: string | null;
}): string {
  const header = `Unified Pipeline: ${params.suiteName}`;
  const goalLine = `Goal: ${params.goal.trim()}`;
  const accountLine = params.googleAccountEmail
    ? `Active Google Account: ${params.googleAccountEmail}`
    : "";
  const list = params.platforms
    .map(
      (p, i) =>
        `${i + 1}. ${p.name} (${p.category}) -> ${buildPlatformLaunchUrl(
          p.url,
          params.googleAccountEmail
        )}`
    )
    .join("\n");

  return [header, goalLine, accountLine, "Connected Platforms:", list]
    .filter(Boolean)
    .join("\n");
}
