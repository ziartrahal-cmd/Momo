import { useMemo, useState } from "react";
import { ExternalLink, Search, Star, Trash2, X } from "lucide-react";
import type { PlatformCategory, PlatformEntry } from "../data/platforms";
import {
  filterPlatforms,
  getHostname,
  validatePlatformInput,
  type CategoryFilter,
  type CustomPlatformInput,
} from "../utils/directory";
import {
  CATEGORY_LABELS_I18N,
  UI_TEXT,
  type AppLanguage,
} from "../utils/i18n";
import {
  buildPlatformLaunchUrl,
  type CustomPlatformGroup,
} from "../utils/platformBundles";
import type { PublishDraftInput } from "../utils/publishing";
import {
  InlineGeminiHelper,
  type InlineQuickAction,
} from "./InlineGeminiHelper";
import { UnifiedPlatformOrchestrator } from "./UnifiedPlatformOrchestrator";

interface PlatformsDirectoryProps {
  language: AppLanguage;
  memoryContext: string;
  googleAccountEmail?: string | null;
  platforms: PlatformEntry[];
  favorites: string[];
  customGroups: CustomPlatformGroup[];
  isAddModalOpen: boolean;
  onCloseAddModal: () => void;
  onToggleFavorite: (id: string) => void;
  onAddCustomPlatform: (input: CustomPlatformInput) => void;
  onDeleteCustomPlatform: (id: string) => void;
  onAddCustomGroup: (group: CustomPlatformGroup) => void;
  onDeleteCustomGroup: (id: string) => void;
  onPushDraftToPublishing: (draft: PublishDraftInput) => void;
  onSaveToNotes: (title: string, content: string) => void;
  onSendToGemini: (promptText: string) => void;
}

const INLINE_DIRECTORY_CONFIG: Record<
  AppLanguage,
  {
    title: string;
    subtitle: string;
    placeholder: string;
    primaryAction: string;
    savedNotice: string;
    quickActions: InlineQuickAction[];
  }
> = {
  ar: {
    title: "مساعد Gemini لدليل المنصات",
    subtitle:
      "اسأل المساعد عن أفضل المنصات والأدوات من الدليل لمشروعك الحالي أو قارن بين أدوات الفيديو والبرمجة والتسويق.",
    placeholder:
      "مثال: ما أفضل 3 منصات من الدليل لمشروعي في النشر وصناعة المحتوى؟",
    primaryAction: "حفظ التوصية في المفكرة",
    savedNotice: "تم حفظ توصية المنصات في المفكرة.",
    quickActions: [
      {
        label: "أفضل المنصات لمشروعي",
        prompt:
          "بناءً على مشاريعي السابقة والمنصات الموجودة في الدليل، ما أفضل 4 منصات يجب أن أعتمد عليها يومياً ولماذا؟",
      },
      {
        label: "سير عمل للسوشيال والفيديو",
        prompt:
          "اقترح خطة أدوات متكاملة من منصات الفيديو والسوشيال ميديا في الدليل للعمل على يوتيوب وفيسبوك وإنستجرام وتيك توك.",
      },
      {
        label: "مقارنة أدوات الذكاء في الدليل",
        prompt:
          "قارن باختصار بين أدوات الذكاء الاصطناعي والبحث والبرمجة في هذا الدليل من حيث أفضل استخدام لكل أداة.",
      },
    ],
  },
  en: {
    title: "Gemini Assistant for Platforms Directory",
    subtitle:
      "Ask Gemini to pick the right platforms from the directory for your project or compare AI, social, and video tools.",
    placeholder:
      "Example: Which 3 platforms in the directory best fit my content workflow?",
    primaryAction: "Save Recommendation to Notes",
    savedNotice: "Platform recommendation saved to Notes.",
    quickActions: [
      {
        label: "Best Platforms for My Project",
        prompt:
          "Based on my saved project memory and the directory list, recommend the top 4 platforms I should rely on daily and why.",
      },
      {
        label: "Social & Video Tool Stack",
        prompt:
          "Suggest a practical tool stack from the directory for managing YouTube, Facebook, Instagram, and TikTok content.",
      },
      {
        label: "Compare Top AI Tools Here",
        prompt:
          "Briefly compare the AI writing, coding, and video tools in this directory by their best use case.",
      },
    ],
  },
  ru: {
    title: "Помощник Gemini по каталогу платформ",
    subtitle:
      "Спросите Gemini, какие сервисы из каталога лучше подойдут для вашего проекта, или сравните инструменты для видео, кода и соцсетей.",
    placeholder:
      "Например: какие 3 платформы из каталога лучше всего подойдут для моего проекта?",
    primaryAction: "Сохранить подборку в заметки",
    savedNotice: "Подборка платформ сохранена в заметках.",
    quickActions: [
      {
        label: "Лучшие платформы для проекта",
        prompt:
          "С учётом моей памяти проектов и списка каталога порекомендуй 4 лучшие платформы на каждый день и объясни выбор.",
      },
      {
        label: "Связка для соцсетей и видео",
        prompt:
          "Подбери удобную связку инструментов из каталога для работы с YouTube, Facebook, Instagram и TikTok.",
      },
      {
        label: "Сравнить ИИ-инструменты",
        prompt:
          "Кратко сравни инструменты ИИ, поиска и разработки из каталога по их главным задачам.",
      },
    ],
  },
};

export function PlatformsDirectory({
  language,
  memoryContext,
  googleAccountEmail,
  platforms,
  favorites,
  customGroups,
  isAddModalOpen,
  onCloseAddModal,
  onToggleFavorite,
  onAddCustomPlatform,
  onDeleteCustomPlatform,
  onAddCustomGroup,
  onDeleteCustomGroup,
  onPushDraftToPublishing,
  onSaveToNotes,
  onSendToGemini,
}: PlatformsDirectoryProps) {
  const t = UI_TEXT[language].directory;
  const catLabels = CATEGORY_LABELS_I18N[language];
  const inlineCfg = INLINE_DIRECTORY_CONFIG[language];

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [inlineNotice, setInlineNotice] = useState<string | null>(null);

  const [siteName, setSiteName] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [siteCategory, setSiteCategory] = useState<PlatformCategory>("web");
  const [siteDescription, setSiteDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const filterTabs: Array<{ id: CategoryFilter; label: string }> = [
    { id: "all", label: t.allTab },
    { id: "favorites", label: t.favoritesTab },
    { id: "chat", label: catLabels.chat },
    { id: "image", label: catLabels.image },
    { id: "video", label: catLabels.video },
    { id: "coding", label: catLabels.coding },
    { id: "audio", label: catLabels.audio },
    { id: "research", label: catLabels.research },
    { id: "social", label: catLabels.social },
    { id: "web", label: catLabels.web },
  ];

  const visiblePlatforms = filterPlatforms(platforms, {
    query,
    category,
    favorites,
  });

  const workspaceContext = useMemo(() => {
    const favNames = platforms
      .filter((p) => favorites.includes(p.id))
      .map((p) => p.name)
      .slice(0, 8);
    const catalogLines = platforms
      .slice(0, 24)
      .map((p) => `- ${p.name} [${catLabels[p.category]}]`)
      .join("\n");

    return [
      `Directory platforms count: ${platforms.length}. Pinned favorites: ${
        favNames.length > 0 ? favNames.join(", ") : "none"
      }.`,
      `Available platforms:\n${catalogLines}`,
    ].join("\n");
  }, [platforms, favorites, catLabels]);

  function handleResetFilters() {
    setQuery("");
    setCategory("all");
  }

  function handleCloseModal() {
    setFormError(null);
    onCloseAddModal();
  }

  function handleSaveGeminiReply(reply: string) {
    const clean = reply.trim();
    if (!clean) return;
    const firstLine =
      clean
        .split(/\r?\n/)[0]
        .replace(/^[#*\-\d.\s]+/, "")
        .slice(0, 60)
        .trim() || inlineCfg.title;
    onSaveToNotes(firstLine, clean);
    setInlineNotice(inlineCfg.savedNotice);
    setTimeout(() => setInlineNotice(null), 2600);
  }

  function handleSubmitCustom(e: React.FormEvent) {
    e.preventDefault();
    const validation = validatePlatformInput(
      {
        name: siteName,
        url: siteUrl,
        category: siteCategory,
        description: siteDescription,
      },
      language
    );

    if (!validation.valid) {
      setFormError(
        validation.error ??
          (language === "en"
            ? "Please verify your inputs."
            : language === "ru"
            ? "Проверьте введённые данные."
            : "يرجى التحقق من البيانات المدخلة.")
      );
      return;
    }

    onAddCustomPlatform({
      name: siteName,
      url: validation.normalizedUrl ?? siteUrl,
      category: siteCategory,
      description: siteDescription,
    });

    setSiteName("");
    setSiteUrl("");
    setSiteCategory("web");
    setSiteDescription("");
    setFormError(null);
    onCloseAddModal();
  }

  return (
    <section aria-labelledby="directory-heading" className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1
            id="directory-heading"
            className="font-display text-2xl sm:text-3xl font-bold text-slate-900"
          >
            {t.heading}
          </h1>
          <p className="mt-1 text-sm text-slate-600">{t.subheading}</p>
        </div>

        <div className="relative w-full md:w-80">
          <label htmlFor="platform-search" className="sr-only">
            {t.searchPlaceholder}
          </label>
          <Search
            className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            id="platform-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full rounded-lg border border-slate-300 bg-white ps-10 pe-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none min-h-[42px]"
          />
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div
        role="tablist"
        aria-label={t.siteCategoryLabel}
        className="flex items-center gap-1.5 overflow-x-auto sm:overflow-visible sm:flex-wrap pb-2 sm:pb-0"
      >
        {filterTabs.map((tab) => {
          const isActive = category === tab.id;
          const count =
            tab.id === "all"
              ? platforms.length
              : tab.id === "favorites"
              ? favorites.length
              : platforms.filter((p) => p.category === tab.id).length;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setCategory(tab.id)}
              className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 min-h-[38px] ${
                isActive
                  ? "bg-blue-700 text-white border-blue-700"
                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <span>{tab.label}</span>{" "}
              <span
                className={`tabular-nums ${
                  isActive ? "text-blue-100" : "text-slate-400"
                }`}
              >
                ({count})
              </span>
            </button>
          );
        })}
      </div>

      {/* Unified Multi-Platform Orchestrator */}
      <UnifiedPlatformOrchestrator
        language={language}
        memoryContext={memoryContext}
        googleAccountEmail={googleAccountEmail}
        platforms={platforms}
        customGroups={customGroups}
        onAddCustomGroup={onAddCustomGroup}
        onDeleteCustomGroup={onDeleteCustomGroup}
        onPushDraftToPublishing={onPushDraftToPublishing}
        onSaveToNotes={onSaveToNotes}
        onSendToGemini={onSendToGemini}
      />

      {/* Inline Gemini Assistant for Platforms Directory */}
      <div className="space-y-2">
        <InlineGeminiHelper
          language={language}
          title={inlineCfg.title}
          subtitle={inlineCfg.subtitle}
          placeholder={inlineCfg.placeholder}
          mode="general"
          memoryContext={memoryContext}
          workspaceContext={workspaceContext}
          quickActions={inlineCfg.quickActions}
          primaryActionLabel={inlineCfg.primaryAction}
          onUseReply={handleSaveGeminiReply}
        />
        {inlineNotice && (
          <div
            role="status"
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-medium text-emerald-800"
          >
            {inlineNotice}
          </div>
        )}
      </div>

      {/* Results Grid or Empty State */}
      {visiblePlatforms.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <h2 className="font-display text-lg font-semibold text-slate-900">
            {t.emptyTitle}
          </h2>
          <p className="mt-1.5 text-sm text-slate-600">
            {category === "favorites" && favorites.length === 0
              ? t.emptyFavDesc
              : t.emptySearchDesc}
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="mt-4 px-4 py-2 text-sm font-medium text-blue-700 border border-blue-200 bg-blue-50/70 rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap"
          >
            {t.resetFiltersBtn}
          </button>
        </div>
      ) : (
        <div
          data-testid="platforms-grid"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {visiblePlatforms.map((platform) => {
            const isFav = favorites.includes(platform.id);
            const hostname = getHostname(platform.url);

            return (
              <article
                key={platform.id}
                className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4 hover:border-slate-300 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs text-slate-500 truncate">
                        <span>{catLabels[platform.category]}</span>
                        <span aria-hidden="true"> · </span>
                        <span className="font-mono">{hostname}</span>
                      </div>
                      <h2 className="mt-1 font-display text-lg font-semibold text-slate-900 truncate">
                        {platform.name}
                      </h2>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onToggleFavorite(platform.id)}
                        aria-pressed={isFav}
                        aria-label={`${
                          isFav ? t.unpinFavoritePrefix : t.pinFavoritePrefix
                        } ${platform.name}`}
                        className={`p-2 rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center ${
                          isFav
                            ? "text-amber-600 bg-amber-50 hover:bg-amber-100"
                            : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <Star
                          className="w-4 h-4"
                          fill={isFav ? "currentColor" : "none"}
                          aria-hidden="true"
                        />
                      </button>

                      {platform.isCustom && (
                        <button
                          type="button"
                          onClick={() => onDeleteCustomPlatform(platform.id)}
                          aria-label={`${t.deletePlatformPrefix} ${platform.name}`}
                          className="p-2 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">
                    {platform.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-500 truncate">
                    {platform.company}
                  </span>

                  <a
                    href={buildPlatformLaunchUrl(platform.url, googleAccountEmail)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50/70 hover:bg-blue-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    <span>{t.openSite}</span>
                    <ExternalLink
                      className="w-3.5 h-3.5 shrink-0"
                      aria-hidden="true"
                    />
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Add Custom Platform Modal */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-platform-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between gap-4 mb-5">
              <h2
                id="add-platform-title"
                className="font-display text-lg font-bold text-slate-900"
              >
                {t.modalTitle}
              </h2>
              <button
                type="button"
                onClick={handleCloseModal}
                aria-label={t.cancel}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSubmitCustom} className="space-y-4">
              <div>
                <label
                  htmlFor="custom-site-name"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  {t.siteNameLabel}
                </label>
                <input
                  id="custom-site-name"
                  type="text"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder={t.siteNamePlaceholder}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none min-h-[42px]"
                />
              </div>

              <div>
                <label
                  htmlFor="custom-site-url"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  {t.siteUrlLabel}
                </label>
                <input
                  id="custom-site-url"
                  type="text"
                  dir="ltr"
                  value={siteUrl}
                  onChange={(e) => setSiteUrl(e.target.value)}
                  placeholder="https://github.com"
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 font-mono focus:border-blue-700 focus:outline-none min-h-[42px]"
                />
              </div>

              <div>
                <label
                  htmlFor="custom-site-category"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  {t.siteCategoryLabel}
                </label>
                <select
                  id="custom-site-category"
                  value={siteCategory}
                  onChange={(e) =>
                    setSiteCategory(e.target.value as PlatformCategory)
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none min-h-[42px]"
                >
                  {(
                    Object.keys(catLabels) as Array<keyof typeof catLabels>
                  ).map((key) => (
                    <option key={key} value={key}>
                      {catLabels[key]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="custom-site-desc"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  {t.siteDescLabel}
                </label>
                <input
                  id="custom-site-desc"
                  type="text"
                  value={siteDescription}
                  onChange={(e) => setSiteDescription(e.target.value)}
                  placeholder={t.siteDescPlaceholder}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none min-h-[42px]"
                />
              </div>

              {formError && (
                <p role="alert" className="text-sm text-red-700">
                  {formError}
                </p>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap"
                >
                  {t.saveSite}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
