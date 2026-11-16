import { useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import {
  Calendar,
  Check,
  Copy,
  ExternalLink,
  Film,
  KeyRound,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  fetchYouTubeChannelAndVideos,
  uploadVideoToYouTube,
  YouTubeAuthError,
  type YouTubeChannelSummary,
  type YouTubeVideoItem,
} from "../lib/youtubeAuth";
import { buildPlatformLaunchUrl } from "../utils/platformBundles";
import {
  filterPublishDrafts,
  parseTagsInput,
  validatePublishDraft,
  validateYouTubeUploadInput,
  type DraftStatus,
  type PublishDraft,
  type PublishDraftInput,
  type SocialPlatformId,
  type YouTubePrivacyStatus,
} from "../utils/publishing";
import {
  DRAFT_STATUS_I18N,
  SOCIAL_PLATFORM_LABELS_I18N,
  UI_TEXT,
  type AppLanguage,
} from "../utils/i18n";
import { YouTubeUploadConfirmModal } from "./YouTubeUploadConfirmModal";
import {
  InlineGeminiHelper,
  type InlineQuickAction,
} from "./InlineGeminiHelper";

interface ProviderStatusInfo {
  configured: boolean;
  connected: boolean;
  redirectUri: string;
  requiredEnvVars: string[];
}

interface UnifiedPublishChannelResult {
  platform: SocialPlatformId;
  status: "published" | "ready_manual" | "needs_auth" | "needs_media" | "error";
  detail: string;
  actionUrl: string;
}

type ThirdPartyProvider = "facebook" | "instagram" | "tiktok";

interface PublishingWorkspaceProps {
  language: AppLanguage;
  memoryContext: string;
  googleUser: User | null;
  youtubeAccessToken: string | null;
  isGoogleLoggingIn: boolean;
  googleAuthError: string | null;
  onGoogleLogin: () => Promise<void>;
  onGoogleLogout: () => Promise<void>;
  onYoutubeSessionExpired: () => void;
  drafts: PublishDraft[];
  isDraftFormOpen: boolean;
  onToggleDraftForm: (open: boolean) => void;
  onAddDraft: (input: PublishDraftInput) => void;
  onUpdateDraftStatus: (
    id: string,
    status: DraftStatus,
    publishedUrl?: string
  ) => void;
  onDeleteDraft: (id: string) => void;
  onSendToGemini: (promptText: string) => void;
}

const TARGET_IDS: SocialPlatformId[] = [
  "youtube",
  "google",
  "facebook",
  "instagram",
  "tiktok",
];

const THIRD_PARTY_PORTALS: Array<{
  id: ThirdPartyProvider;
  studioLabel: string;
  studioUrl: string;
}> = [
  {
    id: "facebook",
    studioLabel: "Meta Business Suite",
    studioUrl: "https://business.facebook.com",
  },
  {
    id: "instagram",
    studioLabel: "Instagram",
    studioUrl: "https://www.instagram.com",
  },
  {
    id: "tiktok",
    studioLabel: "TikTok Studio",
    studioUrl: "https://www.tiktok.com/tiktokstudio/upload",
  },
];

const INLINE_PUBLISHING_CONFIG: Record<
  AppLanguage,
  {
    title: string;
    subtitle: string;
    placeholder: string;
    primaryAction: string;
    secondaryAction: string;
    savedDraftNotice: string;
    loadedYoutubeNotice: string;
    quickActions: InlineQuickAction[];
  }
> = {
  ar: {
    title: "مساعد Gemini لنشر القنوات",
    subtitle:
      "اكتب فكرة الفيديو أو المنشور ليصيغ لك عنواناً ووصفاً ووسوماً مناسبة ليوتيوب وفيسبوك وإنستجرام وتيك توك، أو يحوّلها فوراً إلى مسودة.",
    placeholder:
      "مثال: اكتب وصفاً جذاباً لفيديو جديد عن تطبيق Rahal Plus مع وسوم ليوتيوب وتيك توك...",
    primaryAction: "حفظ كمسودة نشر",
    secondaryAction: "تعبئة نموذج يوتيوب",
    savedDraftNotice: "تم حفظ اقتراح Gemini في قائمة مسودات النشر.",
    loadedYoutubeNotice: "تمت تعبئة العنوان والوصف في نموذج رفع يوتيوب.",
    quickActions: [
      {
        label: "عنوان ووصف للفيديو القادم",
        prompt:
          "بناءً على مشاريعي السابقة، اقترح عنواناً جذاباً ووصفاً جاهزاً و5 وسوم لفيديو جديد على YouTube وTikTok.",
      },
      {
        label: "خطة نشر 5 أيام للقنوات",
        prompt:
          "اقترح جدول نشر عملي لخمسة أيام يوزع المحتوى بين YouTube وFacebook وInstagram وTikTok مع فكرة كل منشور.",
      },
      {
        label: "صياغة إعلان بـ 3 لغات",
        prompt:
          "اكتب نص منشور إعلاني قصير ومناسب لإنستجرام وتيك توك بالعربية والإنجليزية والروسية بناءً على مشروعي.",
      },
    ],
  },
  en: {
    title: "Gemini Assistant for Channel Publishing",
    subtitle:
      "Draft titles, captions, hashtags, or weekly publishing schedules tailored to your linked YouTube, Facebook, Instagram, and TikTok channels.",
    placeholder:
      "Example: Write a YouTube title, description, and TikTok caption for my next video...",
    primaryAction: "Save as Publish Draft",
    secondaryAction: "Load to YouTube Form",
    savedDraftNotice: "Gemini suggestion saved to your publishing drafts queue.",
    loadedYoutubeNotice: "Loaded title and description into the YouTube upload form.",
    quickActions: [
      {
        label: "Title & Caption for Next Video",
        prompt:
          "Based on my saved project memory, write a strong video title, description, and 5 hashtags for YouTube and TikTok.",
      },
      {
        label: "5-Day Channel Publishing Plan",
        prompt:
          "Create a practical 5-day posting plan across YouTube, Facebook, Instagram, and TikTok based on my goals.",
      },
      {
        label: "Trilingual Promo Caption",
        prompt:
          "Write a concise announcement caption for Instagram and TikTok in Arabic, English, and Russian for my current project.",
      },
    ],
  },
  ru: {
    title: "Помощник Gemini для публикаций и каналов",
    subtitle:
      "Создавайте заголовки, описания, хэштеги и контент-планы для YouTube, Facebook, Instagram и TikTok с учётом вашей памяти проектов.",
    placeholder:
      "Например: напиши заголовок, описание для YouTube и короткий пост для TikTok...",
    primaryAction: "Сохранить как черновик",
    secondaryAction: "Загрузить в форму YouTube",
    savedDraftNotice: "Предложение Gemini сохранено в очередь публикаций.",
    loadedYoutubeNotice: "Заголовок и описание добавлены в форму загрузки YouTube.",
    quickActions: [
      {
        label: "Заголовок и описание видео",
        prompt:
          "С опорой на мою память проектов предложи цепляющий заголовок, описание и 5 хэштегов для ролика на YouTube и TikTok.",
      },
      {
        label: "План публикаций на 5 дней",
        prompt:
          "Составь практичный план публикаций на 5 дней для YouTube, Facebook, Instagram и TikTok по моему проекту.",
      },
      {
        label: "Анонс на трёх языках",
        prompt:
          "Напиши короткий анонс для Instagram и TikTok сразу на арабском, английском и русском языках.",
      },
    ],
  },
};

export function PublishingWorkspace({
  language,
  memoryContext,
  googleUser,
  youtubeAccessToken,
  isGoogleLoggingIn,
  googleAuthError,
  onGoogleLogin,
  onGoogleLogout,
  onYoutubeSessionExpired,
  drafts,
  isDraftFormOpen,
  onToggleDraftForm,
  onAddDraft,
  onUpdateDraftStatus,
  onDeleteDraft,
  onSendToGemini,
}: PublishingWorkspaceProps) {
  const t = UI_TEXT[language].publishing;
  const draftStatusLabels = DRAFT_STATUS_I18N[language];
  const socialLabels = SOCIAL_PLATFORM_LABELS_I18N[language];
  const inlineCfg = INLINE_PUBLISHING_CONFIG[language];

  const needsYouTubeAuth = !googleUser || !youtubeAccessToken;
  const [ytChannelError, setYtChannelError] = useState<string | null>(null);
  const [isLoadingChannel, setIsLoadingChannel] = useState(false);
  const [channel, setChannel] = useState<YouTubeChannelSummary | null>(null);
  const [videos, setVideos] = useState<YouTubeVideoItem[]>([]);
  const combinedYtError = ytChannelError || googleAuthError;

  // YouTube Upload form state
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploadTags, setUploadTags] = useState("");
  const [privacyStatus, setPrivacyStatus] =
    useState<YouTubePrivacyStatus>("private");
  const [uploadFormError, setUploadFormError] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<{
    id: string;
    url: string;
    title: string;
  } | null>(null);

  // Third-party social providers state (Facebook, Instagram, TikTok)
  const [providers, setProviders] = useState<
    Record<ThirdPartyProvider, ProviderStatusInfo>
  >({
    facebook: {
      configured: false,
      connected: false,
      redirectUri: "",
      requiredEnvVars: ["META_APP_ID", "META_APP_SECRET"],
    },
    instagram: {
      configured: false,
      connected: false,
      redirectUri: "",
      requiredEnvVars: ["META_APP_ID", "META_APP_SECRET"],
    },
    tiktok: {
      configured: false,
      connected: false,
      redirectUri: "",
      requiredEnvVars: ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"],
    },
  });
  const [expandedSetupProvider, setExpandedSetupProvider] =
    useState<ThirdPartyProvider | null>(null);
  const [socialError, setSocialError] = useState<string | null>(null);
  const [copiedRedirect, setCopiedRedirect] = useState<string | null>(null);
  const [fbPostText, setFbPostText] = useState("");
  const [fbPosting, setFbPosting] = useState(false);
  const [fbPostResult, setFbPostResult] = useState<string | null>(null);

  // Inline Gemini action feedback
  const [inlineNotice, setInlineNotice] = useState<string | null>(null);

  // Unified all-channel publisher state
  const [unifiedTitle, setUnifiedTitle] = useState("");
  const [unifiedCaption, setUnifiedCaption] = useState("");
  const [unifiedMediaUrl, setUnifiedMediaUrl] = useState("");
  const [unifiedTargets, setUnifiedTargets] = useState<SocialPlatformId[]>([
    "youtube",
    "google",
    "facebook",
    "instagram",
    "tiktok",
  ]);
  const [isUnifiedPublishing, setIsUnifiedPublishing] = useState(false);
  const [unifiedResults, setUnifiedResults] = useState<
    UnifiedPublishChannelResult[] | null
  >(null);
  const [unifiedError, setUnifiedError] = useState<string | null>(null);
  const [unifiedNotice, setUnifiedNotice] = useState<string | null>(null);

  // Drafts queue state
  const [draftTitle, setDraftTitle] = useState("");
  const [draftCaption, setDraftCaption] = useState("");
  const [draftTargets, setDraftTargets] = useState<SocialPlatformId[]>([
    "youtube",
  ]);
  const [draftScheduledFor, setDraftScheduledFor] = useState("");
  const [draftMediaNote, setDraftMediaNote] = useState("");
  const [draftStatusInput, setDraftStatusInput] =
    useState<DraftStatus>("draft");
  const [draftFormError, setDraftFormError] = useState<string | null>(null);

  const [draftQuery, setDraftQuery] = useState("");
  const [draftTargetFilter, setDraftTargetFilter] = useState<
    SocialPlatformId | "all"
  >("all");
  const [draftStatusFilter, setDraftStatusFilter] = useState<
    DraftStatus | "all"
  >("all");
  const [copiedDraftId, setCopiedDraftId] = useState<string | null>(null);

  async function loadYouTubeData(token: string) {
    setIsLoadingChannel(true);
    setYtChannelError(null);
    try {
      const data = await fetchYouTubeChannelAndVideos(token);
      setChannel(data.channel);
      setVideos(data.videos);
    } catch (err: unknown) {
      if (err instanceof YouTubeAuthError && err.isAuthError) {
        onYoutubeSessionExpired();
      }
      setYtChannelError(
        err instanceof Error
          ? err.message
          : language === "en"
          ? "Could not load YouTube channel data."
          : language === "ru"
          ? "Не удалось загрузить данные канала YouTube."
          : "تعذر جلب بيانات قناة YouTube."
      );
    } finally {
      setIsLoadingChannel(false);
    }
  }

  async function loadProvidersStatus() {
    try {
      const res = await fetch("/api/social/providers/status");
      if (!res.ok) return;
      const data = (await res.json()) as {
        providers?: Record<ThirdPartyProvider, ProviderStatusInfo>;
      };
      if (data.providers) {
        setProviders(data.providers);
      }
    } catch {
      // Non-fatal status check failure
    }
  }

  useEffect(() => {
    if (youtubeAccessToken) {
      void loadYouTubeData(youtubeAccessToken);
    } else {
      setChannel(null);
      setVideos([]);
    }
  }, [youtubeAccessToken]);

  useEffect(() => {
    void loadProvidersStatus();

    const handleOAuthMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (
        !origin.endsWith(".run.app") &&
        !origin.includes("localhost") &&
        origin !== window.location.origin
      ) {
        return;
      }
      if (event.data?.type === "OAUTH_AUTH_SUCCESS") {
        setSocialError(null);
        void loadProvidersStatus();
      } else if (event.data?.type === "OAUTH_AUTH_ERROR") {
        setSocialError(
          typeof event.data.error === "string" && event.data.error
            ? event.data.error
            : language === "en"
            ? "Account linking cancelled or failed."
            : language === "ru"
            ? "Подключение аккаунта отменено или не удалось."
            : "تم إلغاء ربط الحساب أو تعذر إتمامه."
        );
      }
    };
    window.addEventListener("message", handleOAuthMessage);

    return () => {
      window.removeEventListener("message", handleOAuthMessage);
    };
  }, [language]);

  async function handleGoogleYouTubeLogin() {
    setYtChannelError(null);
    await onGoogleLogin();
  }

  async function handleGoogleYouTubeLogout() {
    await onGoogleLogout();
    setChannel(null);
    setVideos([]);
    setYtChannelError(null);
  }

  async function handleRefreshYouTube() {
    if (!youtubeAccessToken) {
      onYoutubeSessionExpired();
      return;
    }
    await loadYouTubeData(youtubeAccessToken);
  }

  function handleRequestUploadConfirm(e: React.FormEvent) {
    e.preventDefault();
    setUploadFormError(null);
    setUploadSuccess(null);

    if (needsYouTubeAuth || !youtubeAccessToken) {
      setUploadFormError(
        language === "en"
          ? "Please sign in with Google first to upload videos to YouTube."
          : language === "ru"
          ? "Сначала войдите через Google, чтобы загружать видео на YouTube."
          : "يرجى تسجيل الدخول بحساب Google أولاً لرفع الفيديو إلى YouTube."
      );
      return;
    }

    const validation = validateYouTubeUploadInput(
      {
        title: uploadTitle,
        description: uploadDesc,
        privacyStatus,
        hasFile: Boolean(videoFile),
        fileSizeBytes: videoFile?.size,
        mimeType: videoFile?.type,
      },
      language
    );

    if (!validation.valid) {
      setUploadFormError(
        validation.error ??
          (language === "en"
            ? "Please check the video upload details."
            : language === "ru"
            ? "Проверьте параметры загружаемого видео."
            : "يرجى التحقق من بيانات الفيديو.")
      );
      return;
    }

    setIsConfirmModalOpen(true);
  }

  async function handleConfirmedYouTubeUpload() {
    if (!youtubeAccessToken || !videoFile) {
      setIsConfirmModalOpen(false);
      onYoutubeSessionExpired();
      setUploadFormError(
        language === "en"
          ? "Session expired. Please sign in with Google again."
          : language === "ru"
          ? "Сессия истекла. Войдите через Google снова."
          : "انتهت جلسة الدخول. أعد تسجيل الدخول بحساب Google ثم حاول مجدداً."
      );
      return;
    }

    setIsUploading(true);
    setUploadFormError(null);
    try {
      const uploaded = await uploadVideoToYouTube({
        accessToken: youtubeAccessToken,
        file: videoFile,
        title: uploadTitle,
        description: uploadDesc,
        tags: parseTagsInput(uploadTags),
        privacyStatus,
      });

      setUploadSuccess(uploaded);
      setIsConfirmModalOpen(false);
      setVideoFile(null);
      setUploadTitle("");
      setUploadDesc("");
      setUploadTags("");
      await loadYouTubeData(youtubeAccessToken);
    } catch (err: unknown) {
      setIsConfirmModalOpen(false);
      if (err instanceof YouTubeAuthError && err.isAuthError) {
        onYoutubeSessionExpired();
      }
      setUploadFormError(
        err instanceof Error
          ? err.message
          : language === "en"
          ? "Failed uploading video to YouTube."
          : language === "ru"
          ? "Не удалось загрузить видео на YouTube."
          : "تعذر رفع الفيديو إلى YouTube."
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function handleConnectSocialProvider(provider: ThirdPartyProvider) {
    setSocialError(null);
    try {
      const res = await fetch(`/api/social/oauth/${provider}/url`);
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setSocialError(
          data.error ??
            (language === "en"
              ? "Could not start account linking."
              : language === "ru"
              ? "Не удалось начать подключение аккаунта."
              : "تعذر بدء عملية الربط.")
        );
        setExpandedSetupProvider(provider);
        return;
      }
      const popup = window.open(
        data.url,
        "oauth_popup",
        "width=600,height=700"
      );
      if (!popup) {
        setSocialError(
          language === "en"
            ? "Please allow popups to complete account linking."
            : language === "ru"
            ? "Разрешите всплывающие окна для завершения авторизации."
            : "يرجى السماح بالنوافذ المنبثقة (Popups) لإتمام ربط الحساب."
        );
      }
    } catch {
      setSocialError(
        language === "en"
          ? "Could not reach server to start linking."
          : language === "ru"
          ? "Не удалось связаться с сервером для подключения."
          : "تعذر الاتصال بالخادم لبدء عملية الربط."
      );
    }
  }

  async function handleDisconnectSocialProvider(provider: ThirdPartyProvider) {
    await fetch(`/api/social/disconnect/${provider}`, { method: "POST" });
    await loadProvidersStatus();
  }

  async function handleCopyText(
    id: string,
    text: string,
    kind: "redirect" | "draft"
  ) {
    try {
      await navigator.clipboard.writeText(text);
      if (kind === "redirect") {
        setCopiedRedirect(id);
        setTimeout(
          () => setCopiedRedirect((p) => (p === id ? null : p)),
          1800
        );
      } else {
        setCopiedDraftId(id);
        setTimeout(() => setCopiedDraftId((p) => (p === id ? null : p)), 1800);
      }
    } catch {
      // Clipboard blocked
    }
  }

  async function handlePublishFacebookPost(e: React.FormEvent) {
    e.preventDefault();
    if (!fbPostText.trim() || fbPosting) return;
    setFbPosting(true);
    setSocialError(null);
    setFbPostResult(null);
    try {
      const res = await fetch("/api/social/publish/facebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: fbPostText }),
      });
      const data = (await res.json()) as {
        postId?: string;
        pageName?: string;
        error?: string;
      };
      if (!res.ok || !data.postId) {
        setSocialError(
          data.error ??
            (language === "en"
              ? "Failed publishing to Facebook."
              : language === "ru"
              ? "Не удалось опубликовать в Facebook."
              : "تعذر النشر على فيسبوك.")
        );
        return;
      }
      setFbPostResult(
        language === "en"
          ? `Published to Facebook page ${data.pageName ?? ""} successfully.`
          : language === "ru"
          ? `Опубликовано на странице Facebook ${data.pageName ?? ""}.`
          : `تم النشر على صفحة ${data.pageName ?? "فيسبوك"} بنجاح.`
      );
      setFbPostText("");
    } catch {
      setSocialError(
        language === "en"
          ? "Could not reach Facebook API."
          : language === "ru"
          ? "Не удалось связаться с API Facebook."
          : "تعذر الاتصال بواجهة فيسبوك."
      );
    } finally {
      setFbPosting(false);
    }
  }

  function handleToggleUnifiedTarget(target: SocialPlatformId) {
    setUnifiedTargets((prev) =>
      prev.includes(target)
        ? prev.filter((item) => item !== target)
        : [...prev, target]
    );
  }

  async function handleUnifiedDispatch(e: React.FormEvent) {
    e.preventDefault();
    setUnifiedError(null);
    setUnifiedNotice(null);

    const check = validatePublishDraft(
      {
        title: unifiedTitle || unifiedCaption.slice(0, 60),
        caption: unifiedCaption || unifiedTitle,
        targets: unifiedTargets,
      },
      language
    );
    if (!check.valid) {
      setUnifiedError(check.error ?? "Invalid campaign input");
      return;
    }

    setIsUnifiedPublishing(true);
    try {
      const res = await fetch("/api/social/publish/unified", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: unifiedTitle,
          message: unifiedCaption,
          mediaUrl: unifiedMediaUrl,
          targets: unifiedTargets,
          googleConnected: Boolean(googleUser),
        }),
      });
      const data = (await res.json()) as {
        results?: UnifiedPublishChannelResult[];
        error?: string;
      };
      if (!res.ok || !Array.isArray(data.results)) {
        setUnifiedError(
          data.error ??
            (language === "en"
              ? "Failed dispatching unified broadcast."
              : language === "ru"
              ? "Не удалось выполнить единую публикацию."
              : "تعذر إرسال النشر الموحد حالياً.")
        );
        return;
      }
      setUnifiedResults(data.results);
    } catch {
      setUnifiedError(
        language === "en"
          ? "Network error while sending unified broadcast."
          : language === "ru"
          ? "Сетевая ошибка при единой публикации."
          : "تعذر الاتصال بالخادم لإرسال النشر الموحد."
      );
    } finally {
      setIsUnifiedPublishing(false);
    }
  }

  function handleSaveUnifiedDraft() {
    setUnifiedError(null);
    const titleVal = unifiedTitle.trim() || unifiedCaption.trim().slice(0, 80);
    const captionVal = unifiedCaption.trim() || unifiedTitle.trim();
    const check = validatePublishDraft(
      {
        title: titleVal,
        caption: captionVal,
        targets: unifiedTargets,
        mediaNote: unifiedMediaUrl,
        status: "ready",
      },
      language
    );
    if (!check.valid) {
      setUnifiedError(check.error ?? "Invalid draft");
      return;
    }

    onAddDraft({
      title: titleVal,
      caption: captionVal,
      targets: unifiedTargets,
      mediaNote: unifiedMediaUrl,
      status: "ready",
    });
    setUnifiedNotice(t.unifiedSavedDraftNotice);
    setTimeout(() => setUnifiedNotice(null), 2600);
  }

  function handleLoadUnifiedToYouTube() {
    const titleVal = unifiedTitle.trim() || unifiedCaption.trim().slice(0, 90);
    const descVal = unifiedCaption.trim() || unifiedTitle.trim();
    if (!titleVal && !descVal) return;
    setUploadTitle(titleVal.slice(0, 100));
    setUploadDesc(descVal);
    setUploadFormError(null);
    document.getElementById("yt-upload-section")?.scrollIntoView({ behavior: "smooth" });
  }

  function handleAdaptUnifiedWithGemini() {
    const channelNames = unifiedTargets
      .map((id) => socialLabels[id].shortLabel)
      .join(", ");
    const baseText = `${unifiedTitle}\n${unifiedCaption}`.trim();
    const prompt =
      language === "en"
        ? `Adapt the following campaign simultaneously for (${channelNames}) with tailored title, caption, hooks, and hashtags per channel:\n${baseText}`
        : language === "ru"
        ? `Адаптируй эту кампанию сразу для (${channelNames}): подготовь заголовок, текст и хэштеги под каждый канал:\n${baseText}`
        : `كيّف الحملة التالية لتناسب النشر المتزامن على (${channelNames}) مع عنوان ووصف ووسوم مخصصة لكل منصة:\n${baseText}`;
    onSendToGemini(prompt);
  }

  function handleToggleDraftTarget(target: SocialPlatformId) {
    setDraftTargets((prev) =>
      prev.includes(target)
        ? prev.filter((item) => item !== target)
        : [...prev, target]
    );
  }

  function handleSubmitDraft(e: React.FormEvent) {
    e.preventDefault();
    const input: PublishDraftInput = {
      title: draftTitle,
      caption: draftCaption,
      targets: draftTargets,
      scheduledFor: draftScheduledFor,
      mediaNote: draftMediaNote,
      status: draftStatusInput,
    };
    const check = validatePublishDraft(input, language);
    if (!check.valid) {
      setDraftFormError(
        check.error ??
          (language === "en"
            ? "Please fill in the required fields."
            : language === "ru"
            ? "Заполните обязательные поля."
            : "يرجى إكمال الحقول المطلوبة.")
      );
      return;
    }

    onAddDraft(input);
    setDraftTitle("");
    setDraftCaption("");
    setDraftTargets(["youtube"]);
    setDraftScheduledFor("");
    setDraftMediaNote("");
    setDraftStatusInput("draft");
    setDraftFormError(null);
    onToggleDraftForm(false);
  }

  function handleLoadDraftToYouTube(draft: PublishDraft) {
    setUploadTitle(draft.title.slice(0, 100));
    setUploadDesc(draft.caption);
    setUploadFormError(null);
    const uploadEl = document.getElementById("yt-upload-section");
    uploadEl?.scrollIntoView({ behavior: "smooth" });
  }

  function handleSaveGeminiReplyAsDraft(replyText: string) {
    const clean = replyText.trim();
    if (!clean) return;
    const lines = clean
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const rawTitle = (lines[0] ?? inlineCfg.title)
      .replace(/^[#*\-\d.\s]+/, "")
      .slice(0, 90)
      .trim();

    onAddDraft({
      title: rawTitle || inlineCfg.title,
      caption: clean,
      targets: ["youtube", "google", "facebook", "instagram", "tiktok"],
      status: "draft",
    });
    setInlineNotice(inlineCfg.savedDraftNotice);
    setTimeout(() => setInlineNotice(null), 2600);
  }

  function handleLoadGeminiReplyToYouTube(replyText: string) {
    const clean = replyText.trim();
    if (!clean) return;
    const lines = clean
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const rawTitle = (lines[0] ?? "")
      .replace(/^[#*\-\d.\s]+/, "")
      .slice(0, 100)
      .trim();

    setUploadTitle(rawTitle);
    setUploadDesc(clean);
    setUploadFormError(null);
    setInlineNotice(inlineCfg.loadedYoutubeNotice);
    setTimeout(() => setInlineNotice(null), 2600);
    const uploadEl = document.getElementById("yt-upload-section");
    uploadEl?.scrollIntoView({ behavior: "smooth" });
  }

  const workspaceContext = useMemo(() => {
    const connectedList: string[] = [];
    if (googleUser?.email) {
      connectedList.push(`Google email active (${googleUser.email})`);
    }
    if (!needsYouTubeAuth && channel) {
      connectedList.push(`YouTube connected (${channel.title})`);
    } else if (!googleUser) {
      connectedList.push("YouTube/Google not signed in yet");
    }
    if (providers.facebook.connected) connectedList.push("Facebook connected");
    if (providers.instagram.connected) connectedList.push("Instagram connected");
    if (providers.tiktok.connected) connectedList.push("TikTok connected");

    const draftTitles = drafts
      .slice(0, 5)
      .map((d) => `- ${d.title} [${d.status}]`)
      .join("\n");

    return [
      `Publishing workspace status: ${connectedList.join(", ")}. Total drafts: ${drafts.length}.`,
      draftTitles ? `Recent drafts:\n${draftTitles}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }, [googleUser, needsYouTubeAuth, channel, providers, drafts]);

  const visibleDrafts = filterPublishDrafts(drafts, {
    targetFilter: draftTargetFilter,
    statusFilter: draftStatusFilter,
    query: draftQuery,
  });

  return (
    <section aria-labelledby="publishing-heading" className="space-y-8">
      <div className="max-w-2xl">
        <h1
          id="publishing-heading"
          className="font-display text-2xl sm:text-3xl font-bold text-slate-900"
        >
          {t.heading}
        </h1>
        <p className="mt-1 text-sm text-slate-600">{t.subheading}</p>
      </div>

      {/* Inline Gemini Assistant for Publishing & Channels */}
      <div className="space-y-2">
        <InlineGeminiHelper
          language={language}
          title={inlineCfg.title}
          subtitle={inlineCfg.subtitle}
          placeholder={inlineCfg.placeholder}
          mode="writing"
          memoryContext={memoryContext}
          workspaceContext={workspaceContext}
          quickActions={inlineCfg.quickActions}
          primaryActionLabel={inlineCfg.primaryAction}
          onUseReply={handleSaveGeminiReplyAsDraft}
          secondaryActionLabel={inlineCfg.secondaryAction}
          onSecondaryAction={handleLoadGeminiReplyToYouTube}
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

      {/* Unified All-Channel Publisher (Google + YouTube + Facebook + Instagram + TikTok) */}
      <div
        data-testid="unified-publisher-card"
        className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900">
              {t.unifiedTitle}
            </h2>
            <p className="mt-1 text-sm text-slate-600">{t.unifiedSubtitle}</p>
          </div>
          {googleUser?.email && (
            <div className="text-xs text-slate-600 shrink-0">
              <span>{t.unifiedActiveGoogleNote} </span>
              <span dir="ltr" className="font-mono text-emerald-700 font-medium">
                {googleUser.email}
              </span>
            </div>
          )}
        </div>

        {/* Channel Status & Selection Strip */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setUnifiedTargets([...TARGET_IDS])}
            className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50/70 border border-blue-200 hover:bg-blue-100 rounded-lg whitespace-nowrap"
          >
            {t.unifiedSelectAll}
          </button>

          {TARGET_IDS.map((targetId) => {
            const active = unifiedTargets.includes(targetId);
            const isConnected =
              targetId === "youtube"
                ? !needsYouTubeAuth
                : targetId === "google"
                ? Boolean(googleUser)
                : providers[targetId].connected;
            return (
              <button
                key={targetId}
                type="button"
                aria-pressed={active}
                onClick={() => handleToggleUnifiedTarget(targetId)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                  active
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span>{socialLabels[targetId].shortLabel}</span>
                <span
                  className={`text-[10px] ${
                    active
                      ? isConnected
                        ? "text-emerald-300"
                        : "text-slate-300"
                      : isConnected
                      ? "text-emerald-700"
                      : "text-slate-400"
                  }`}
                >
                  {isConnected ? "●" : "○"}
                </span>
              </button>
            );
          })}
        </div>

        <form onSubmit={handleUnifiedDispatch} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="unified-title-input"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                {t.unifiedTitleLabel}
              </label>
              <input
                id="unified-title-input"
                type="text"
                value={unifiedTitle}
                onChange={(e) => setUnifiedTitle(e.target.value)}
                placeholder={t.unifiedTitlePlaceholder}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none min-h-[40px]"
              />
            </div>

            <div>
              <label
                htmlFor="unified-media-url"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                {t.unifiedMediaUrlLabel}
              </label>
              <input
                id="unified-media-url"
                type="url"
                dir="ltr"
                value={unifiedMediaUrl}
                onChange={(e) => setUnifiedMediaUrl(e.target.value)}
                placeholder={t.unifiedMediaUrlPlaceholder}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 font-mono focus:border-blue-700 focus:outline-none min-h-[40px]"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="unified-caption-input"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              {t.unifiedCaptionLabel}
            </label>
            <textarea
              id="unified-caption-input"
              rows={2}
              value={unifiedCaption}
              onChange={(e) => setUnifiedCaption(e.target.value)}
              placeholder={t.unifiedCaptionPlaceholder}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
            />
          </div>

          {unifiedError && (
            <p role="alert" className="text-xs text-red-700">
              {unifiedError}
            </p>
          )}

          {unifiedNotice && (
            <div
              role="status"
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-medium text-emerald-800"
            >
              {unifiedNotice}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={isUnifiedPublishing}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg disabled:opacity-60 whitespace-nowrap"
            >
              <Send className="w-3.5 h-3.5" aria-hidden="true" />
              <span>
                {isUnifiedPublishing
                  ? t.unifiedPublishingBtn
                  : t.unifiedPublishNowBtn}
              </span>
            </button>

            <button
              type="button"
              onClick={handleSaveUnifiedDraft}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t.unifiedSaveDraftBtn}</span>
            </button>

            <button
              type="button"
              disabled={!unifiedTitle.trim() && !unifiedCaption.trim()}
              onClick={handleLoadUnifiedToYouTube}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg disabled:opacity-50 whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t.unifiedLoadYoutubeBtn}</span>
            </button>

            <button
              type="button"
              disabled={!unifiedTitle.trim() && !unifiedCaption.trim()}
              onClick={handleAdaptUnifiedWithGemini}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-blue-700 bg-blue-50/70 hover:bg-blue-100 rounded-lg disabled:opacity-50 whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t.unifiedAdaptGeminiBtn}</span>
            </button>
          </div>
        </form>

        {unifiedResults && unifiedResults.length > 0 && (
          <div
            data-testid="unified-publish-results"
            className="pt-3 border-t border-slate-200 space-y-2"
          >
            <div className="text-xs font-semibold text-slate-700">
              {t.unifiedResultsTitle}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {unifiedResults.map((item) => {
                const statusText =
                  item.status === "published"
                    ? t.unifiedStatusPublished
                    : item.status === "ready_manual"
                    ? t.unifiedStatusReadyManual
                    : item.status === "needs_media"
                    ? t.unifiedStatusNeedsMedia
                    : item.status === "error"
                    ? t.unifiedStatusError
                    : t.unifiedStatusNeedsAuth;
                return (
                  <div
                    key={item.platform}
                    className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 flex flex-col justify-between gap-2"
                  >
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-slate-900">
                        {socialLabels[item.platform].shortLabel}
                      </div>
                      <div
                        className={`text-[11px] font-medium ${
                          item.status === "published"
                            ? "text-emerald-700"
                            : item.status === "ready_manual"
                            ? "text-blue-700"
                            : item.status === "error"
                            ? "text-red-700"
                            : "text-slate-600"
                        }`}
                      >
                        {statusText}
                      </div>
                      <p className="text-[11px] text-slate-500 break-words">
                        {item.detail}
                      </p>
                    </div>
                    <a
                      href={buildPlatformLaunchUrl(
                        item.actionUrl,
                        googleUser?.email
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 hover:underline whitespace-nowrap"
                    >
                      <span>{t.unifiedOpenChannel}</span>
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Section 1: YouTube + Google Connected Workspace */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs text-slate-500">
              <span>{t.ytKicker}</span>
              <span aria-hidden="true"> · </span>
              <span
                className={
                  needsYouTubeAuth
                    ? "text-slate-600"
                    : "text-emerald-700 font-medium"
                }
              >
                {needsYouTubeAuth ? t.ytDisconnected : t.ytConnected}
              </span>
            </div>
            <h2 className="mt-1 font-display text-xl font-bold text-slate-900">
              {t.ytTitle}
            </h2>
          </div>

          {needsYouTubeAuth ? (
            <button
              type="button"
              onClick={handleGoogleYouTubeLogin}
              disabled={isGoogleLoggingIn}
              aria-label={t.ytLoginBtn}
              className="inline-flex items-center gap-3 px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-sm font-medium text-slate-800 transition-colors whitespace-nowrap shrink-0 min-h-[44px] disabled:opacity-60"
            >
              <svg
                version="1.1"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 48 48"
                className="w-5 h-5 shrink-0"
                aria-hidden="true"
              >
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
              <span>{isGoogleLoggingIn ? t.ytLoggingIn : t.ytLoginBtn}</span>
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleRefreshYouTube}
                disabled={isLoadingChannel}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    isLoadingChannel ? "animate-spin" : ""
                  }`}
                  aria-hidden="true"
                />
                <span>{t.ytRefresh}</span>
              </button>
              <button
                type="button"
                onClick={handleGoogleYouTubeLogout}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t.ytLogout}</span>
              </button>
            </div>
          )}
        </div>

        {combinedYtError && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {combinedYtError}
          </div>
        )}

        {!needsYouTubeAuth && googleUser && (
          <div className="pt-4 border-t border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {channel?.thumbnailUrl || googleUser.photoURL ? (
                  <img
                    src={channel?.thumbnailUrl || googleUser.photoURL || ""}
                    alt={channel?.title || googleUser.displayName || "Channel"}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-full border border-slate-200 object-cover shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                    <Film className="w-5 h-5 text-slate-500" aria-hidden="true" />
                  </div>
                )}

                <div className="min-w-0">
                  <div className="font-display font-semibold text-slate-900 truncate">
                    {channel?.title ??
                      googleUser.displayName ??
                      t.googleConnected}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    <span>{googleUser.email}</span>
                    {channel?.customUrl && (
                      <>
                        <span aria-hidden="true"> · </span>
                        <span dir="ltr" className="font-mono">
                          {channel.customUrl}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {channel && (
                <div className="flex items-center gap-6 text-xs text-slate-600 shrink-0">
                  <div>
                    <div className="text-slate-400">{t.subscribers}</div>
                    <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-slate-900">
                      {channel.subscriberCount ?? "0"}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">{t.videosCount}</div>
                    <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-slate-900">
                      {channel.videoCount ?? "0"}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {videos.length > 0 && (
              <div className="space-y-2.5">
                <h3 className="text-xs font-semibold text-slate-600">
                  {t.latestVideos}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {videos.map((video) => (
                    <a
                      key={video.id}
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-100 transition-colors overflow-hidden flex flex-col"
                    >
                      {video.thumbnailUrl ? (
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          referrerPolicy="no-referrer"
                          className="w-full aspect-video object-cover bg-slate-200"
                        />
                      ) : (
                        <div className="w-full aspect-video bg-slate-100 flex items-center justify-center">
                          <Film
                            className="w-6 h-6 text-slate-400"
                            aria-hidden="true"
                          />
                        </div>
                      )}
                      <div className="p-3 space-y-1">
                        <div className="text-xs font-medium text-slate-900 line-clamp-2">
                          {video.title}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {video.privacyStatus === "public"
                            ? t.privacyPublic
                            : video.privacyStatus === "unlisted"
                            ? t.privacyUnlisted
                            : t.privacyPrivate}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* YouTube Direct Video Upload Form */}
        <form
          id="yt-upload-section"
          onSubmit={handleRequestUploadConfirm}
          className="pt-5 border-t border-slate-200 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900">
                {t.uploadTitle}
              </h3>
              <p className="text-xs text-slate-500">{t.uploadSubtitle}</p>
            </div>
            <a
              href={buildPlatformLaunchUrl(
                "https://studio.youtube.com",
                googleUser?.email
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:underline whitespace-nowrap"
            >
              <span>{t.openYtStudio}</span>
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="yt-video-file"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                {t.videoFileLabel}
              </label>
              <input
                id="yt-video-file"
                type="file"
                accept="video/*"
                onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 file:me-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-800 hover:file:bg-slate-200"
              />
            </div>

            <div>
              <label
                htmlFor="yt-privacy-select"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                {t.privacyLabel}
              </label>
              <select
                id="yt-privacy-select"
                value={privacyStatus}
                onChange={(e) =>
                  setPrivacyStatus(e.target.value as YouTubePrivacyStatus)
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none min-h-[42px]"
              >
                <option value="private">{t.privacyOptionPrivate}</option>
                <option value="unlisted">{t.privacyOptionUnlisted}</option>
                <option value="public">{t.privacyOptionPublic}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="yt-video-title"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                {t.videoTitleLabel}
              </label>
              <input
                id="yt-video-title"
                type="text"
                maxLength={100}
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder={t.videoTitlePlaceholder}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none min-h-[42px]"
              />
            </div>

            <div>
              <label
                htmlFor="yt-video-tags"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                {t.videoTagsLabel}
              </label>
              <input
                id="yt-video-tags"
                type="text"
                value={uploadTags}
                onChange={(e) => setUploadTags(e.target.value)}
                placeholder={t.videoTagsPlaceholder}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none min-h-[42px]"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="yt-video-desc"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              {t.videoDescLabel}
            </label>
            <textarea
              id="yt-video-desc"
              rows={3}
              value={uploadDesc}
              onChange={(e) => setUploadDesc(e.target.value)}
              placeholder={t.videoDescPlaceholder}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
            />
          </div>

          {uploadFormError && (
            <p role="alert" className="text-sm text-red-700">
              {uploadFormError}
            </p>
          )}

          {uploadSuccess && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-sm text-emerald-900">
              <span>
                {t.uploadSuccessPrefix} "{uploadSuccess.title}"
              </span>
              <a
                href={uploadSuccess.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-emerald-800 underline"
              >
                <span>{t.watchOnYt}</span>
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap min-h-[42px]"
            >
              <Upload className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{t.reviewAndUploadBtn}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Section 2: Facebook, Instagram, TikTok, and Google Business Connections */}
      <div className="space-y-4">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900">
            {t.socialTitle}
          </h2>
          <p className="mt-1 text-sm text-slate-600">{t.socialSubtitle}</p>
        </div>

        {socialError && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {socialError}
          </div>
        )}

        {fbPostResult && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {fbPostResult}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Google card */}
          <article className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4">
            <div>
              <div className="text-xs text-slate-500">
                <span>{t.googleProfileKicker}</span>
                <span aria-hidden="true"> · </span>
                <span
                  className={
                    needsYouTubeAuth
                      ? "text-slate-600"
                      : "text-emerald-700 font-medium"
                  }
                >
                  {needsYouTubeAuth ? t.googleNeedsAuth : t.googleConnected}
                </span>
              </div>
              <h3 className="mt-1 font-display text-lg font-semibold text-slate-900">
                {t.googleCardTitle}
              </h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                {t.googleCardDesc}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              {!googleUser ? (
                <button
                  type="button"
                  onClick={handleGoogleYouTubeLogin}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap"
                >
                  {t.connectGoogleBtn}
                </button>
              ) : (
                <span dir="ltr" className="text-xs font-medium text-emerald-700 truncate max-w-[140px]">
                  {googleUser.email ?? t.accountConnected}
                </span>
              )}

              <a
                href={buildPlatformLaunchUrl(
                  "https://business.google.com",
                  googleUser?.email
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline whitespace-nowrap"
              >
                <span>{t.openPlatform}</span>
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            </div>
          </article>

          {/* Facebook, Instagram, TikTok cards */}
          {THIRD_PARTY_PORTALS.map((item) => {
            const info = providers[item.id];
            const meta = t.thirdPartyMeta[item.id];
            const isSetupExpanded = expandedSetupProvider === item.id;

            return (
              <article
                key={item.id}
                className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="text-xs text-slate-500">
                    <span>{item.studioLabel}</span>
                    <span aria-hidden="true"> · </span>
                    <span
                      className={
                        info.connected
                          ? "text-emerald-700 font-medium"
                          : info.configured
                          ? "text-blue-700 font-medium"
                          : "text-slate-600"
                      }
                    >
                      {info.connected
                        ? t.statusConnected
                        : info.configured
                        ? t.statusReady
                        : t.statusNeedsKeys}
                    </span>
                  </div>

                  <h3 className="font-display text-lg font-semibold text-slate-900">
                    {meta.title}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {meta.subtitle}
                  </p>

                  {isSetupExpanded && info.redirectUri && (
                    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2 text-[11px] text-slate-700">
                      <div className="font-medium text-slate-800">
                        {t.requiredSecrets}
                      </div>
                      <div dir="ltr" className="font-mono text-slate-600">
                        {info.requiredEnvVars.join(", ")}
                      </div>
                      <div className="font-medium text-slate-800">
                        {t.callbackUriLabel}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <code
                          dir="ltr"
                          className="flex-1 truncate font-mono bg-white border border-slate-200 rounded px-2 py-1 text-[10px]"
                        >
                          {info.redirectUri}
                        </code>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyText(
                              item.id,
                              info.redirectUri,
                              "redirect"
                            )
                          }
                          aria-label={`${t.callbackUriLabel} ${meta.title}`}
                          className="p-1.5 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded"
                        >
                          {copiedRedirect === item.id ? (
                            <Check
                              className="w-3 h-3 text-emerald-600"
                              aria-hidden="true"
                            />
                          ) : (
                            <Copy className="w-3 h-3" aria-hidden="true" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  {info.connected ? (
                    <button
                      type="button"
                      onClick={() => handleDisconnectSocialProvider(item.id)}
                      className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors whitespace-nowrap"
                    >
                      {t.disconnectBtn}
                    </button>
                  ) : info.configured ? (
                    <button
                      type="button"
                      onClick={() => handleConnectSocialProvider(item.id)}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap"
                    >
                      {t.connectBtn}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedSetupProvider(
                          isSetupExpanded ? null : item.id
                        )
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
                    >
                      <KeyRound className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{isSetupExpanded ? t.hideSetup : t.showSetup}</span>
                    </button>
                  )}

                  <a
                    href={item.studioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline whitespace-nowrap"
                  >
                    <span>{t.openPortal}</span>
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                  </a>
                </div>
              </article>
            );
          })}
        </div>

        {/* Direct Facebook Page Post Box when connected */}
        {providers.facebook.connected && (
          <form
            onSubmit={handlePublishFacebookPost}
            className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
          >
            <h3 className="font-display text-base font-bold text-slate-900">
              {t.fbPostTitle}
            </h3>
            <textarea
              rows={2}
              value={fbPostText}
              onChange={(e) => setFbPostText(e.target.value)}
              placeholder={t.fbPostPlaceholder}
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!fbPostText.trim() || fbPosting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg disabled:bg-slate-300 whitespace-nowrap"
              >
                <Send className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{fbPosting ? t.fbPublishing : t.fbPublishBtn}</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Section 3: Scheduled Content & Drafts Queue */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900">
              {t.draftsTitle}
            </h2>
            <p className="mt-1 text-sm text-slate-600">{t.draftsSubtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-64">
              <label htmlFor="draft-search-input" className="sr-only">
                {t.draftSearchPlaceholder}
              </label>
              <Search
                className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="draft-search-input"
                type="search"
                value={draftQuery}
                onChange={(e) => setDraftQuery(e.target.value)}
                placeholder={t.draftSearchPlaceholder}
                className="w-full rounded-lg border border-slate-300 bg-white ps-9 pe-3 py-2 text-xs text-slate-900 focus:border-blue-700 focus:outline-none min-h-[38px]"
              />
            </div>

            <select
              aria-label={t.allPlatformsFilter}
              value={draftTargetFilter}
              onChange={(e) =>
                setDraftTargetFilter(e.target.value as SocialPlatformId | "all")
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-700 focus:outline-none min-h-[38px]"
            >
              <option value="all">{t.allPlatformsFilter}</option>
              {TARGET_IDS.map((id) => (
                <option key={id} value={id}>
                  {socialLabels[id].shortLabel}
                </option>
              ))}
            </select>

            <select
              aria-label={t.allStatusesFilter}
              value={draftStatusFilter}
              onChange={(e) =>
                setDraftStatusFilter(e.target.value as DraftStatus | "all")
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-700 focus:outline-none min-h-[38px]"
            >
              <option value="all">{t.allStatusesFilter}</option>
              <option value="draft">{draftStatusLabels.draft}</option>
              <option value="ready">{draftStatusLabels.ready}</option>
              <option value="published">{draftStatusLabels.published}</option>
            </select>
          </div>
        </div>

        {/* Add Draft Form */}
        {isDraftFormOpen && (
          <form
            onSubmit={handleSubmitDraft}
            className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
          >
            <div className="flex items-center justify-between gap-4">
              <h3 className="font-display text-lg font-bold text-slate-900">
                {t.newDraftFormTitle}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setDraftFormError(null);
                  onToggleDraftForm(false);
                }}
                aria-label={t.cancel}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="draft-title-input"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  {t.draftTitleLabel}
                </label>
                <input
                  id="draft-title-input"
                  type="text"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  placeholder={t.draftTitlePlaceholder}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none min-h-[42px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="draft-date-input"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    {t.draftDateLabel}
                  </label>
                  <input
                    id="draft-date-input"
                    type="date"
                    value={draftScheduledFor}
                    onChange={(e) => setDraftScheduledFor(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none min-h-[42px]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="draft-status-select"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    {t.draftStatusLabel}
                  </label>
                  <select
                    id="draft-status-select"
                    value={draftStatusInput}
                    onChange={(e) =>
                      setDraftStatusInput(e.target.value as DraftStatus)
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none min-h-[42px]"
                  >
                    <option value="draft">{draftStatusLabels.draft}</option>
                    <option value="ready">{draftStatusLabels.ready}</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="draft-caption-input"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                {t.draftCaptionLabel}
              </label>
              <textarea
                id="draft-caption-input"
                rows={3}
                value={draftCaption}
                onChange={(e) => setDraftCaption(e.target.value)}
                placeholder={t.draftCaptionPlaceholder}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="block text-sm font-medium text-slate-700 mb-2">
                  {t.draftTargetsLabel}
                </span>
                <div className="flex flex-wrap gap-2">
                  {TARGET_IDS.map((targetId) => {
                    const checked = draftTargets.includes(targetId);
                    return (
                      <button
                        key={targetId}
                        type="button"
                        aria-pressed={checked}
                        onClick={() => handleToggleDraftTarget(targetId)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                          checked
                            ? "bg-blue-700 text-white border-blue-700"
                            : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        {socialLabels[targetId].shortLabel}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label
                  htmlFor="draft-media-note"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  {t.draftMediaLabel}
                </label>
                <input
                  id="draft-media-note"
                  type="text"
                  value={draftMediaNote}
                  onChange={(e) => setDraftMediaNote(e.target.value)}
                  placeholder={t.draftMediaPlaceholder}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none min-h-[42px]"
                />
              </div>
            </div>

            {draftFormError && (
              <p role="alert" className="text-sm text-red-700">
                {draftFormError}
              </p>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDraftFormError(null);
                  onToggleDraftForm(false);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg whitespace-nowrap"
              >
                {t.saveToList}
              </button>
            </div>
          </form>
        )}

        {/* Drafts List or Empty State */}
        {visibleDrafts.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
            <h3 className="font-display text-lg font-semibold text-slate-900">
              {drafts.length === 0
                ? t.emptyDraftsTitle
                : t.emptyFilteredDraftsTitle}
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              {drafts.length === 0
                ? t.emptyDraftsDesc
                : t.emptyFilteredDraftsDesc}
            </p>
            {drafts.length === 0 && !isDraftFormOpen && (
              <button
                type="button"
                onClick={() => onToggleDraftForm(true)}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50/70 border border-blue-200 hover:bg-blue-100 rounded-lg whitespace-nowrap"
              >
                <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{t.addFirstDraftBtn}</span>
              </button>
            )}
          </div>
        ) : (
          <div
            data-testid="publish-drafts-list"
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {visibleDrafts.map((draft) => (
              <article
                key={draft.id}
                className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5">
                        <span
                          className={
                            draft.status === "published"
                              ? "text-emerald-700 font-medium"
                              : draft.status === "ready"
                              ? "text-blue-700 font-medium"
                              : "text-slate-600"
                          }
                        >
                          {draftStatusLabels[draft.status]}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {draft.targets
                            .map((target) => socialLabels[target].shortLabel)
                            .join(" / ")}
                        </span>
                        {draft.scheduledFor && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span
                              dir="ltr"
                              className="inline-flex items-center gap-1 font-mono tabular-nums"
                            >
                              <Calendar
                                className="w-3 h-3"
                                aria-hidden="true"
                              />
                              {draft.scheduledFor}
                            </span>
                          </>
                        )}
                      </div>

                      <h3 className="mt-1 font-display text-lg font-semibold text-slate-900">
                        {draft.title}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteDraft(draft.id)}
                      aria-label={`${t.deleteDraftPrefix} ${draft.title}`}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>

                  <p className="text-sm text-slate-700 whitespace-pre-wrap break-words leading-relaxed">
                    {draft.caption}
                  </p>

                  {draft.mediaNote && (
                    <div className="text-xs text-slate-500">
                      {t.mediaNotePrefix} {draft.mediaNote}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      aria-label={`${t.draftStatusLabel}: ${draft.title}`}
                      value={draft.status}
                      onChange={(e) =>
                        onUpdateDraftStatus(
                          draft.id,
                          e.target.value as DraftStatus
                        )
                      }
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700 focus:border-blue-700 focus:outline-none"
                    >
                      <option value="draft">{draftStatusLabels.draft}</option>
                      <option value="ready">{draftStatusLabels.ready}</option>
                      <option value="published">
                        {draftStatusLabels.published}
                      </option>
                    </select>

                    <button
                      type="button"
                      onClick={() =>
                        handleCopyText(draft.id, draft.caption, "draft")
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100 whitespace-nowrap"
                    >
                      {copiedDraftId === draft.id ? (
                        <>
                          <Check
                            className="w-3.5 h-3.5 text-emerald-600"
                            aria-hidden="true"
                          />
                          <span>{t.copied}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{t.copyText}</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {draft.targets.includes("youtube") && (
                      <button
                        type="button"
                        onClick={() => handleLoadDraftToYouTube(draft)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md whitespace-nowrap"
                      >
                        <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{t.prepareYoutube}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        const targetsText = draft.targets
                          .map((target) => socialLabels[target].shortLabel)
                          .join(", ");
                        const localizedPrompt =
                          language === "en"
                            ? `Suggest an engaging title, description, and hashtags for publishing on (${targetsText}) based on this draft:\nTitle: ${draft.title}\nCaption: ${draft.caption}`
                            : language === "ru"
                            ? `Предложи цепляющий заголовок, описание и хэштеги для публикации в (${targetsText}) на основе этого черновика:\nЗаголовок: ${draft.title}\nТекст: ${draft.caption}`
                            : `اقترح عنوانًا ووصفًا جذابًا ووسومًا مناسبة للنشر على (${targetsText}) بناءً على هذه المسودة:\nالعنوان: ${draft.title}\nالنص: ${draft.caption}`;
                        onSendToGemini(localizedPrompt);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50/70 hover:bg-blue-100 rounded-md whitespace-nowrap"
                    >
                      <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{t.improveGemini}</span>
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <YouTubeUploadConfirmModal
        language={language}
        isOpen={isConfirmModalOpen}
        title={uploadTitle.trim()}
        description={uploadDesc.trim()}
        privacyStatus={privacyStatus}
        fileName={videoFile?.name ?? ""}
        fileSizeBytes={videoFile?.size ?? 0}
        isUploading={isUploading}
        onConfirm={handleConfirmedYouTubeUpload}
        onCancel={() => {
          if (!isUploading) setIsConfirmModalOpen(false);
        }}
      />
    </section>
  );
}
