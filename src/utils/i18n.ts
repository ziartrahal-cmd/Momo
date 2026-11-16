import type { PlatformCategory } from "../data/platforms";
import type {
  AssistantTaskKind,
  AssistantTaskStatus,
  MemoryCategory,
} from "./assistantMemory";
import type { DraftStatus, SocialPlatformId } from "./publishing";
import type { LiveVoiceName } from "./audioPcm";

export type AppLanguage = "ar" | "en" | "ru";

export interface LanguageOption {
  id: AppLanguage;
  shortLabel: string;
  nativeName: string;
  dir: "rtl" | "ltr";
  intlLocale: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  {
    id: "ar",
    shortLabel: "عربي",
    nativeName: "العربية",
    dir: "rtl",
    intlLocale: "ar-EG",
  },
  {
    id: "en",
    shortLabel: "EN",
    nativeName: "English",
    dir: "ltr",
    intlLocale: "en-US",
  },
  {
    id: "ru",
    shortLabel: "RU",
    nativeName: "Русский",
    dir: "ltr",
    intlLocale: "ru-RU",
  },
];

export function isAppLanguage(value: unknown): value is AppLanguage {
  return value === "ar" || value === "en" || value === "ru";
}

export function getLanguageDir(lang: AppLanguage): "rtl" | "ltr" {
  return lang === "ar" ? "rtl" : "ltr";
}

export function getIntlLocale(lang: AppLanguage): string {
  switch (lang) {
    case "en":
      return "en-US";
    case "ru":
      return "ru-RU";
    default:
      return "ar-EG";
  }
}

export const CATEGORY_LABELS_I18N: Record<
  AppLanguage,
  Record<PlatformCategory, string>
> = {
  ar: {
    chat: "كتابة ومحادثة",
    image: "صور وفنون",
    video: "فيديو وحركة",
    coding: "برمجة وتطوير",
    audio: "صوت وموسيقى",
    research: "بحث علمي وتحليل",
    social: "التواصل والنشر",
    web: "منصات الويب",
  },
  en: {
    chat: "Writing & Chat",
    image: "Images & Art",
    video: "Video & Motion",
    coding: "Coding & Dev",
    audio: "Audio & Music",
    research: "Research & Analysis",
    social: "Social & Publishing",
    web: "Web Platforms",
  },
  ru: {
    chat: "Текст и чат",
    image: "Фото и арт",
    video: "Видео и анимация",
    coding: "Код и разработка",
    audio: "Аудио и музыка",
    research: "Поиск и аналитика",
    social: "Соцсети и публикации",
    web: "Веб-платформы",
  },
};

export const MEMORY_CATEGORY_I18N: Record<
  AppLanguage,
  Record<MemoryCategory, string>
> = {
  ar: {
    project: "مشروع",
    preference: "تفضيل",
    goal: "هدف",
    fact: "معلومة",
  },
  en: {
    project: "Project",
    preference: "Preference",
    goal: "Goal",
    fact: "Fact",
  },
  ru: {
    project: "Проект",
    preference: "Предпочтение",
    goal: "Цель",
    fact: "Факт",
  },
};

export const TASK_KIND_I18N: Record<
  AppLanguage,
  Record<AssistantTaskKind, string>
> = {
  ar: {
    draft_post: "إعداد محتوى نشر",
    save_note: "توثيق في المفكرة",
    research: "تحليل ومتابعة",
    self_improve: "تطوير ذاتي",
  },
  en: {
    draft_post: "Draft Social Post",
    save_note: "Save to Notes",
    research: "Research & Follow-up",
    self_improve: "Self-Improvement",
  },
  ru: {
    draft_post: "Черновик публикации",
    save_note: "Сохранить в заметки",
    research: "Анализ и задача",
    self_improve: "Саморазвитие",
  },
};

export const TASK_STATUS_I18N: Record<
  AppLanguage,
  Record<AssistantTaskStatus, string>
> = {
  ar: {
    pending: "قيد الانتظار",
    in_progress: "جاري التنفيذ",
    done: "تم الإنجاز",
  },
  en: {
    pending: "Pending",
    in_progress: "In Progress",
    done: "Completed",
  },
  ru: {
    pending: "В ожидании",
    in_progress: "Выполняется",
    done: "Выполнено",
  },
};

export const VOICE_LABELS_I18N: Record<
  AppLanguage,
  Record<LiveVoiceName, string>
> = {
  ar: {
    Zephyr: "Zephyr (متوازن وواضح)",
    Kore: "Kore (هادئ وناعم)",
    Puck: "Puck (حيوي وسريع)",
    Charon: "Charon (عميق ورسمي)",
    Fenrir: "Fenrir (دافئ وعملي)",
  },
  en: {
    Zephyr: "Zephyr (Balanced & Clear)",
    Kore: "Kore (Calm & Soft)",
    Puck: "Puck (Lively & Fast)",
    Charon: "Charon (Deep & Formal)",
    Fenrir: "Fenrir (Warm & Practical)",
  },
  ru: {
    Zephyr: "Zephyr (Ровный и чёткий)",
    Kore: "Kore (Спокойный и мягкий)",
    Puck: "Puck (Живой и быстрый)",
    Charon: "Charon (Глубокий и деловой)",
    Fenrir: "Fenrir (Тёплый и практичный)",
  },
};

export const DRAFT_STATUS_I18N: Record<
  AppLanguage,
  Record<DraftStatus, string>
> = {
  ar: {
    draft: "مسودة للإضافة لاحقًا",
    ready: "جاهز للنشر",
    published: "تم النشر",
  },
  en: {
    draft: "Draft for Later",
    ready: "Ready to Publish",
    published: "Published",
  },
  ru: {
    draft: "Черновик на потом",
    ready: "Готово к публикации",
    published: "Опубликовано",
  },
};

export const SOCIAL_PLATFORM_LABELS_I18N: Record<
  AppLanguage,
  Record<SocialPlatformId, { label: string; shortLabel: string }>
> = {
  ar: {
    youtube: { label: "يوتيوب (YouTube)", shortLabel: "YouTube" },
    google: { label: "جوجل (Google)", shortLabel: "Google" },
    facebook: { label: "فيسبوك (Facebook)", shortLabel: "Facebook" },
    instagram: { label: "إنستجرام (Instagram)", shortLabel: "Instagram" },
    tiktok: { label: "تيك توك (TikTok)", shortLabel: "TikTok" },
  },
  en: {
    youtube: { label: "YouTube", shortLabel: "YouTube" },
    google: { label: "Google", shortLabel: "Google" },
    facebook: { label: "Facebook", shortLabel: "Facebook" },
    instagram: { label: "Instagram", shortLabel: "Instagram" },
    tiktok: { label: "TikTok", shortLabel: "TikTok" },
  },
  ru: {
    youtube: { label: "YouTube", shortLabel: "YouTube" },
    google: { label: "Google", shortLabel: "Google" },
    facebook: { label: "Facebook", shortLabel: "Facebook" },
    instagram: { label: "Instagram", shortLabel: "Instagram" },
    tiktok: { label: "TikTok", shortLabel: "TikTok" },
  },
};

export interface UiDictionary {
  header: {
    navAria: string;
    mobileNavAria: string;
    langAria: string;
    tabs: {
      chat: string;
      publishing: string;
      publishingMobile: string;
      directory: string;
      directoryMobile: string;
      notes: string;
    };
    primary: {
      addSite: string;
      newNote: string;
      newDraft: string;
      newChat: string;
    };
    googleAuth: {
      loginBtn: string;
      loggingIn: string;
      logoutAria: string;
      accountAria: string;
    };
  };
  footer: {
    brandLine: string;
    externalNote: string;
  };
  gemini: {
    heading: string;
    subheading: string;
    modeAria: string;
    modes: Record<"general" | "writing" | "summarize" | "coding", string>;
    channelAria: string;
    channels: {
      text: string;
      voice: string;
      memory: string;
    };
    strategyAria: string;
    strategies: {
      single: string;
      parallel: string;
      parallelHint: string;
    };
    emptyTitle: string;
    emptySubtitle: string;
    starters: Array<{
      label: string;
      prompt: string;
      mode: "general" | "writing" | "coding" | "summarize";
    }>;
    userLabel: string;
    assistantLabel: string;
    copy: string;
    copied: string;
    saveToNotes: string;
    saved: string;
    showComparison: string;
    hideComparison: string;
    loadingReply: string;
    reflectingBadge: string;
    workReportTitle: string;
    memoryComparisonLabel: string;
    completedWorkLabel: string;
    selfNeedsLabel: string;
    openMemoryTab: string;
    openPublishingTab: string;
    openNotesTab: string;
    dismissReport: string;
    inputLabel: string;
    inputPlaceholder: string;
    send: string;
    analyzeNow: string;
    defaultNoteTitle: string;
  };
  voice: {
    title: string;
    statusSpeaking: string;
    statusOpen: string;
    statusConnecting: string;
    statusError: string;
    statusReady: string;
    voiceSelectAria: string;
    mute: string;
    muted: string;
    endCall: string;
    startCall: string;
    connectingBtn: string;
    emptyTitle: string;
    emptyDesc: string;
    userVoiceLabel: string;
    quickInputLabel: string;
    quickPlaceholderLive: string;
    quickPlaceholderIdle: string;
    send: string;
    saveTranscript: string;
    savedTranscript: string;
    analyzeTranscript: string;
    analyzingTranscript: string;
    defaultTranscriptTitle: string;
    micUnsupported: string;
    wsError: string;
    startError: string;
  };
  memoryPanel: {
    title: string;
    subtitle: string;
    statsMemories: string;
    statsOpenTasks: string;
    statsDoneTasks: string;
    memoriesTitle: string;
    addMemoryBtn: string;
    memoryPlaceholder: string;
    memoryCategoryAria: string;
    allCategories: string;
    noMemories: string;
    deleteMemoryAria: string;
    tasksTitle: string;
    addTaskBtn: string;
    taskTitlePlaceholder: string;
    taskDetailsPlaceholder: string;
    taskFilterAll: string;
    executeNow: string;
    executing: string;
    markDone: string;
    reopenTask: string;
    deleteTaskAria: string;
    noTasks: string;
    linkedDraftNotice: string;
    linkedNoteNotice: string;
    reflectionsTitle: string;
    neededCapabilityLabel: string;
    noReflections: string;
    deleteReflectionAria: string;
    saveBtn: string;
    cancelBtn: string;
  };
  parallel: {
    phaseQuerying: string;
    phaseVoting: string;
    phaseCompleted: string;
    phaseError: string;
    openModalBtn: string;
    stepRunning: string;
    stepCompleted: string;
    stepError: string;
    stepPending: string;
    stepReadyVoting: string;
    votingRowTitle: string;
    votingComparing: string;
    votingAccepted: string;
    votingBestChosen: string;
    votingWaiting: string;
    votingStopped: string;
    modalTitle: string;
    modalSubtitle: string;
    modalCloseAria: string;
    modelsCountWord: string;
    modalDoneBtn: string;
    modalBackgroundBtn: string;
    tableCriterion: string;
    tableWords: string;
    tableChars: string;
    tableParagraphs: string;
    tableAnswer: string;
    tableActions: string;
    winnerRole: string;
    participantRole: string;
  };
  publishing: {
    heading: string;
    subheading: string;
    ytKicker: string;
    ytConnected: string;
    ytDisconnected: string;
    ytTitle: string;
    ytLoginBtn: string;
    ytLoggingIn: string;
    ytRefresh: string;
    ytLogout: string;
    subscribers: string;
    videosCount: string;
    latestVideos: string;
    privacyPublic: string;
    privacyUnlisted: string;
    privacyPrivate: string;
    uploadTitle: string;
    uploadSubtitle: string;
    openYtStudio: string;
    videoFileLabel: string;
    privacyLabel: string;
    privacyOptionPrivate: string;
    privacyOptionUnlisted: string;
    privacyOptionPublic: string;
    videoTitleLabel: string;
    videoTitlePlaceholder: string;
    videoTagsLabel: string;
    videoTagsPlaceholder: string;
    videoDescLabel: string;
    videoDescPlaceholder: string;
    uploadSuccessPrefix: string;
    watchOnYt: string;
    reviewAndUploadBtn: string;
    socialTitle: string;
    socialSubtitle: string;
    googleProfileKicker: string;
    googleConnected: string;
    googleNeedsAuth: string;
    googleCardTitle: string;
    googleCardDesc: string;
    connectGoogleBtn: string;
    accountConnected: string;
    openPlatform: string;
    statusConnected: string;
    statusReady: string;
    statusNeedsKeys: string;
    requiredSecrets: string;
    callbackUriLabel: string;
    disconnectBtn: string;
    connectBtn: string;
    hideSetup: string;
    showSetup: string;
    openPortal: string;
    fbPostTitle: string;
    fbPostPlaceholder: string;
    fbPublishing: string;
    fbPublishBtn: string;
    draftsTitle: string;
    draftsSubtitle: string;
    draftSearchPlaceholder: string;
    allPlatformsFilter: string;
    allStatusesFilter: string;
    newDraftFormTitle: string;
    draftTitleLabel: string;
    draftTitlePlaceholder: string;
    draftDateLabel: string;
    draftStatusLabel: string;
    draftCaptionLabel: string;
    draftCaptionPlaceholder: string;
    draftTargetsLabel: string;
    draftMediaLabel: string;
    draftMediaPlaceholder: string;
    cancel: string;
    saveToList: string;
    emptyDraftsTitle: string;
    emptyFilteredDraftsTitle: string;
    emptyDraftsDesc: string;
    emptyFilteredDraftsDesc: string;
    addFirstDraftBtn: string;
    mediaNotePrefix: string;
    copyText: string;
    copied: string;
    prepareYoutube: string;
    improveGemini: string;
    confirmModalTitle: string;
    confirmModalDesc: string;
    confirmTitleLabel: string;
    confirmPrivacyLabel: string;
    confirmFileLabel: string;
    confirmDescLabel: string;
    confirmUploadBtn: string;
    confirmUploadingBtn: string;
    thirdPartyMeta: Record<
      "facebook" | "instagram" | "tiktok",
      { title: string; subtitle: string }
    >;
    deleteDraftPrefix: string;
    unifiedTitle: string;
    unifiedSubtitle: string;
    unifiedSelectAll: string;
    unifiedTitleLabel: string;
    unifiedTitlePlaceholder: string;
    unifiedCaptionLabel: string;
    unifiedCaptionPlaceholder: string;
    unifiedMediaUrlLabel: string;
    unifiedMediaUrlPlaceholder: string;
    unifiedPublishNowBtn: string;
    unifiedPublishingBtn: string;
    unifiedSaveDraftBtn: string;
    unifiedLoadYoutubeBtn: string;
    unifiedAdaptGeminiBtn: string;
    unifiedResultsTitle: string;
    unifiedStatusPublished: string;
    unifiedStatusReadyManual: string;
    unifiedStatusNeedsAuth: string;
    unifiedStatusNeedsMedia: string;
    unifiedStatusError: string;
    unifiedOpenChannel: string;
    unifiedSavedDraftNotice: string;
    unifiedActiveGoogleNote: string;
  };
  directory: {
    heading: string;
    subheading: string;
    searchPlaceholder: string;
    allTab: string;
    favoritesTab: string;
    emptyTitle: string;
    emptyFavDesc: string;
    emptySearchDesc: string;
    resetFiltersBtn: string;
    openSite: string;
    modalTitle: string;
    siteNameLabel: string;
    siteNamePlaceholder: string;
    siteUrlLabel: string;
    siteCategoryLabel: string;
    siteDescLabel: string;
    siteDescPlaceholder: string;
    cancel: string;
    saveSite: string;
    pinFavoritePrefix: string;
    unpinFavoritePrefix: string;
    deletePlatformPrefix: string;
    orchestrator: {
      title: string;
      subtitle: string;
      presetsLabel: string;
      customGroupsLabel: string;
      createGroupBtn: string;
      cancelBtn: string;
      groupNameLabel: string;
      groupNamePlaceholder: string;
      selectPlatformsHint: string;
      saveGroupBtn: string;
      selectedPlatformsCount: string;
      goalLabel: string;
      goalPlaceholder: string;
      runPipelineBtn: string;
      runningPipelineBtn: string;
      masterBriefTitle: string;
      stepsTitle: string;
      copyPrompt: string;
      copiedPrompt: string;
      openPlatform: string;
      pushToPublishingBtn: string;
      pushedPublishingNotice: string;
      saveNoteBtn: string;
      savedNoteNotice: string;
      sendToGeminiBtn: string;
      deleteGroupPrefix: string;
      togglePlatformPrefix: string;
    };
  };
  notes: {
    heading: string;
    subheading: string;
    searchPlaceholder: string;
    formTitle: string;
    titleLabel: string;
    titlePlaceholder: string;
    contentLabel: string;
    contentPlaceholder: string;
    cancel: string;
    saveNote: string;
    emptyTitle: string;
    emptySearchTitle: string;
    emptyDesc: string;
    emptySearchDesc: string;
    addFirstNote: string;
    copy: string;
    copied: string;
    useInGemini: string;
    deleteNotePrefix: string;
  };
}

export const UI_TEXT: Record<AppLanguage, UiDictionary> = {
  ar: {
    header: {
      navAria: "التنقل الرئيسي",
      mobileNavAria: "التنقل على الجوال",
      langAria: "اختيار لغة الواجهة",
      tabs: {
        chat: "مساعد Gemini",
        publishing: "النشر والقنوات",
        publishingMobile: "النشر",
        directory: "دليل المنصات",
        directoryMobile: "المنصات",
        notes: "المفكرة",
      },
      primary: {
        addSite: "إضافة موقع",
        newNote: "ملاحظة جديدة",
        newDraft: "مسودة نشر جديدة",
        newChat: "محادثة جديدة",
      },
      googleAuth: {
        loginBtn: "دخول بحساب Google",
        loggingIn: "جاري الدخول...",
        logoutAria: "تسجيل الخروج من حساب Google",
        accountAria: "حساب Google النشط",
      },
    },
    footer: {
      brandLine: "Rahal Plus — مساعدك الشخصي وربط القنوات",
      externalNote: "تُفتح المنصات الخارجية في مواقعها الرسمية بشكل مستقل",
    },
    gemini: {
      heading: "مساعدك الشخصي في Rahal Plus",
      subheading:
        "يتذكر مشاريعك السابقة، يقارن أفكارك، ينشئ لنفسه مهاماً وينفذها، ويدعم المحادثة النصية والصوتية المباشرة بالعربية والإنجليزية والروسية.",
      modeAria: "وضع المساعد",
      modes: {
        general: "محادثة عامة",
        writing: "صياغة وتعديل",
        summarize: "تلخيص وتنظيم",
        coding: "مساعدة برمجية",
      },
      channelAria: "نوع المحادثة",
      channels: {
        text: "محادثة نصية",
        voice: "محادثة صوتية مباشرة",
        memory: "الذاكرة والمهام",
      },
      strategyAria: "أسلوب المعالجة",
      strategies: {
        single: "نموذج واحد (سريع)",
        parallel: "استعلام متوازٍ وترجيح الأفضل",
        parallelHint:
          "يستعلم بالتوازي من Gemini 4 Hydrogen وGemini 3.1 Flash Lite ثم يرجّح الإجابة الأنسب",
      },
      emptyTitle: "تحدث مع مساعدك الشخصي",
      emptySubtitle:
        "أخبره عن مشروعك أو خطتك، وسيتذكر التفاصيل ويقارنها مع ما سبق وينشئ مهاماً ويعمل عليها:",
      starters: [
        {
          label: "متابعة مشروعي الحالي",
          prompt:
            "عايز أبدأ تجهيز محتوى جديد لقناة يوتيوب وتيك توك عن مشروعي، افتكر خطتي واقترح مهام الأسبوع وابدأ في تجهيز أول مسودة.",
          mode: "general",
        },
        {
          label: "كتابة خطة أسبوعية منظمة",
          prompt:
            "اكتب لي خطة أسبوعية عملية لتنظيم وقتي بين العمل وصناعة المحتوى في 5 نقاط واضحة.",
          mode: "general",
        },
        {
          label: "تحسين صياغة منشور بثلاث لغات",
          prompt:
            "ساعدني في صياغة منشور احترافي باللغة العربية والإنجليزية والروسية للإعلان عن مشروعي الجديد.",
          mode: "writing",
        },
        {
          label: "تحويل فكرة إلى خطوات عملية",
          prompt:
            "لدي فكرة لتطوير تواجدي الرقمي؛ ما هي أبسط 4 خطوات للبدء وتوثيقها كمهام؟",
          mode: "summarize",
        },
      ],
      userLabel: "أنت",
      assistantLabel: "Rahal Plus",
      copy: "نسخ",
      copied: "تم النسخ",
      saveToNotes: "حفظ في المفكرة",
      saved: "تم الحفظ",
      showComparison: "عرض جدول المقارنة بين النماذج",
      hideComparison: "إخفاء جدول المقارنة بين النماذج",
      loadingReply: "جاري التفكير وإعداد الرد عبر Gemini...",
      reflectingBadge: "جاري تحليل الحوار وتحديث الذاكرة والمهام...",
      workReportTitle: "تقرير المساعد الشخصي (ما تذكره وما أنجزه)",
      memoryComparisonLabel: "المقارنة بالذاكرة السابقة:",
      completedWorkLabel: "ما أنجزه المساعد الآن:",
      selfNeedsLabel: "تطوير ذاتي واحتياج المساعد:",
      openMemoryTab: "فتح الذاكرة والمهام",
      openPublishingTab: "عرض في النشر والقنوات",
      openNotesTab: "عرض في المفكرة",
      dismissReport: "إخفاء التقرير",
      inputLabel: "اكتب رسالتك إلى المساعد",
      inputPlaceholder: "تحدث عن فكرتك أو مشروعك ليبدأ المساعد في تحليله وتنفيذ مهامه...",
      send: "إرسال",
      analyzeNow: "تحليل وإنشاء مهام",
      defaultNoteTitle: "ملاحظة من Rahal Plus",
    },
    voice: {
      title: "محادثة صوتية حية مع Rahal Plus",
      statusSpeaking: "يتحدث المساعد الآن...",
      statusOpen: "المحادثة المباشرة مفتوحة — يمكنك التحدث الآن",
      statusConnecting: "جاري فتح الاتصال الصوتي...",
      statusError: "توقف الاتصال",
      statusReady: "جاهز لبدء محادثة صوتية مباشرة",
      voiceSelectAria: "اختيار نبرة الصوت",
      mute: "كتم الميكروفون",
      muted: "الميكروفون مكتوم",
      endCall: "إنهاء المحادثة",
      startCall: "بدء محادثة صوتية مباشرة",
      connectingBtn: "جاري الاتصال...",
      emptyTitle: "تحدث مباشرة بدون كتابة",
      emptyDesc:
        "اضغط على «بدء محادثة صوتية مباشرة» واسمح بالوصول للميكروفون. المساعد يتذكر مشاريعك السابقة أثناء الحوار الصوتي ويمكنه تحليل الكلام وإنشاء مهام.",
      userVoiceLabel: "أنت (صوتي)",
      quickInputLabel: "إرسال رسالة نصية أثناء المكالمة",
      quickPlaceholderLive: "أرسل كلمة أو رابطاً سريعاً أثناء المحادثة الصوتية...",
      quickPlaceholderIdle: "ابدأ المحادثة الصوتية لتفعيل الإرسال النصي المباشر",
      send: "إرسال",
      saveTranscript: "حفظ نص الحوار",
      savedTranscript: "تم الحفظ في المفكرة",
      analyzeTranscript: "تحليل الحوار وتنفيذ المهام",
      analyzingTranscript: "جاري تحليل الحوار...",
      defaultTranscriptTitle: "محادثة صوتية مباشرة",
      micUnsupported: "المتصفح الحالي لا يدعم الوصول إلى الميكروفون.",
      wsError: "تعذر فتح اتصال المحادثة الصوتية المباشرة مع الخادم.",
      startError: "تعذر تشغيل الميكروفون أو بدء المحادثة المباشرة.",
    },
    memoryPanel: {
      title: "الذاكرة الشخصية والمهام الذاتية للمساعد",
      subtitle:
        "يحفظ المساعد هنا كل ما تتفقان عليه، يبتكر لنفسه مهاماً، ينفذها فعلياً داخل مساحة العمل، ويقيّم ما يحتاجه لتطوير أدائه.",
      statsMemories: "عناصر الذاكرة",
      statsOpenTasks: "مهام قيد التنفيذ",
      statsDoneTasks: "مهام منجزة",
      memoriesTitle: "ما يتذكره المساعد عنك وعن مشاريعك",
      addMemoryBtn: "إضافة للذاكرة",
      memoryPlaceholder: "مثال: مشروعي الأساسي هو قناة تقنية وتعليمية",
      memoryCategoryAria: "تصنيف الذاكرة",
      allCategories: "الكل",
      noMemories:
        "لم تُسجَّل ذاكرة شخصية بعد. تحدث مع المساعد أو أضف معلومة عن مشروعك ليبدأ في ربط الأفكار ومقارنتها.",
      deleteMemoryAria: "حذف عنصر من الذاكرة",
      tasksTitle: "مهام المساعد الذاتية والأعمال المنجزة",
      addTaskBtn: "إضافة مهمة للمساعد",
      taskTitlePlaceholder: "عنوان المهمة...",
      taskDetailsPlaceholder: "تفاصيل التنفيذ المطلوبة...",
      taskFilterAll: "كل المهام",
      executeNow: "تنفيذ المهمة الآن",
      executing: "جاري التنفيذ...",
      markDone: "تحديد كمنجز",
      reopenTask: "إعادة فتح",
      deleteTaskAria: "حذف المهمة",
      noTasks:
        "لا توجد مهام مسجلة حالياً. عند حديثك مع المساعد سيقترح وينشئ مهاماً ويعرض نتائج تنفيذها هنا.",
      linkedDraftNotice: "تم إنشاء مسودة نشر:",
      linkedNoteNotice: "تم حفظ ملاحظة:",
      reflectionsTitle: "تأملات التطوير الذاتي واحتياجات المساعد",
      neededCapabilityLabel: "ما يحتاجه المساعد لتطوير أدائه:",
      noReflections:
        "سيضيف المساعد هنا ملاحظاته الذاتية حول ما يحتاجه من بيانات أو أدوات ليخدمك بشكل أفضل.",
      deleteReflectionAria: "حذف ملاحظة التطوير",
      saveBtn: "حفظ",
      cancelBtn: "إلغاء",
    },
    parallel: {
      phaseQuerying: "استعلام متوازٍ عبر نماذج Gemini المتاحة",
      phaseVoting: "مرحلة الترجيح واختيار الإجابة الأنسب",
      phaseCompleted: "اكتمل التقييم والترجيح",
      phaseError: "تعذر إكمال المعالجة المتوازية",
      openModalBtn: "عرض نافذة التقدم",
      stepRunning: "جاري التحليل...",
      stepCompleted: "اكتملت الإجابة",
      stepError: "تعذر الاستجابة",
      stepPending: "في الانتظار",
      stepReadyVoting: "جاهز للترجيح",
      votingRowTitle: "المراجعة والترجيح النهائي",
      votingComparing: "جاري مقارنة الإجابات...",
      votingAccepted: "تم الاعتماد",
      votingBestChosen: "تم اختيار النتيجة الأنسب",
      votingWaiting: "بانتظار اكتمال النماذج",
      votingStopped: "توقف التقييم",
      modalTitle: "تقدم التصويت والمقارنة بين النماذج",
      modalSubtitle:
        "متابعة فورية لمشاركة كل نموذج في الاستعلام المتوازي قبل اعتماد الإجابة النهائية.",
      modalCloseAria: "إغلاق نافذة تقدم المقارنة",
      modelsCountWord: "نماذج",
      modalDoneBtn: "عرض النتيجة النهائية",
      modalBackgroundBtn: "إغلاق ومتابعة في الخلفية",
      tableCriterion: "معيار المقارنة",
      tableWords: "عدد الكلمات",
      tableChars: "عدد الأحرف",
      tableParagraphs: "عدد الفقرات",
      tableAnswer: "نص الإجابة",
      tableActions: "إجراءات",
      winnerRole: "الإجابة المعتمدة",
      participantRole: "مشارك في الترجيح",
    },
    publishing: {
      heading: "ربط القنوات والنشر",
      subheading:
        "اربط حسابك في جوجل (Google) وقناة YouTube لرفع الفيديوهات مباشرة، وتابع ربط فيسبوك وإنستجرام وتيك توك مع تنظيم مسودات النشر المستقبلية.",
      ytKicker: "Google · YouTube Data API",
      ytConnected: "متصل وجاهز للرفع",
      ytDisconnected: "غير متصل بعد",
      ytTitle: "ربط حساب جوجل وقناة يوتيوب",
      ytLoginBtn: "تسجيل الدخول عبر Google لربط YouTube",
      ytLoggingIn: "جاري تسجيل الدخول...",
      ytRefresh: "تحديث القناة",
      ytLogout: "تسجيل الخروج",
      subscribers: "المشتركون",
      videosCount: "الفيديوهات",
      latestVideos: "أحدث الفيديوهات على قناتك",
      privacyPublic: "عام",
      privacyUnlisted: "غير مدرج",
      privacyPrivate: "خاص",
      uploadTitle: "رفع فيديو جديد مباشرة إلى YouTube",
      uploadSubtitle:
        "اختر ملف الفيديو وأدخل العنوان والوصف؛ ستظهر نافذة تأكيد قبل الرفع الفعلي.",
      openYtStudio: "فتح YouTube Studio",
      videoFileLabel: "ملف الفيديو",
      privacyLabel: "حالة الخصوصية عند النشر",
      privacyOptionPrivate: "خاص (Private — مرئي لك فقط)",
      privacyOptionUnlisted: "غير مدرج (Unlisted — عبر الرابط فقط)",
      privacyOptionPublic: "عام (Public — نشر للجميع)",
      videoTitleLabel: "عنوان الفيديو",
      videoTitlePlaceholder: "مثال: شرح عملي لاستخدام الأدوات الذكية",
      videoTagsLabel: "الكلمات المفتاحية (اختياري، مفصولة بفاصلة)",
      videoTagsPlaceholder: "مثال: شروحات، تقنية، يوتيوب",
      videoDescLabel: "وصف الفيديو",
      videoDescPlaceholder: "اكتب وصف الفيديو والروابط المهمة للمشاهدين...",
      uploadSuccessPrefix: "تم رفع",
      watchOnYt: "مشاهدة على YouTube",
      reviewAndUploadBtn: "مراجعة ورفع الفيديو إلى YouTube",
      socialTitle: "منصات التواصل الاجتماعي المرتبطة بالنشر",
      socialSubtitle:
        "تواصل مع جوجل، فيسبوك، إنستجرام، وتيك توك. تعمل المنصات الخارجية عبر الربط المباشر عند تفعيل مفاتيح المطور أو عبر بوابات النشر الرسمية.",
      googleProfileKicker: "Google Profile",
      googleConnected: "حساب جوجل متصل",
      googleNeedsAuth: "يتطلب الدخول",
      googleCardTitle: "جوجل (Google)",
      googleCardDesc:
        "يستخدم نفس ربط Google المعتمد أعلاه مع وصول سريع لملف النشاط التجاري والبحث.",
      connectGoogleBtn: "ربط حساب Google",
      accountConnected: "متصل بالحساب",
      openPlatform: "فتح المنصة",
      statusConnected: "متصل",
      statusReady: "جاهز للربط",
      statusNeedsKeys: "يتطلب مفاتيح المطور",
      requiredSecrets: "المتغيرات المطلوبة في Secrets:",
      callbackUriLabel: "رابط العودة (Callback URI):",
      disconnectBtn: "قطع الاتصال",
      connectBtn: "ربط الحساب",
      hideSetup: "إخفاء الإعداد",
      showSetup: "إعداد الربط",
      openPortal: "فتح البوابة",
      fbPostTitle: "نشر منشور مباشر على صفحة فيسبوك المرتبطة",
      fbPostPlaceholder: "اكتب نص المنشور لصفحة فيسبوك...",
      fbPublishing: "جاري النشر...",
      fbPublishBtn: "نشر على فيسبوك",
      draftsTitle: "قائمة الأعمال والمسودات المستقبلية",
      draftsSubtitle:
        "احتفظ هنا بكل الفيديوهات والمنشورات التي تنوي إضافتها أو نشرها لاحقًا عبر يوتيوب والسوشيال ميديا.",
      draftSearchPlaceholder: "ابحث في المسودات...",
      allPlatformsFilter: "جميع المنصات",
      allStatusesFilter: "كل الحالات",
      newDraftFormTitle: "إضافة عمل أو منشور جديد للقائمة",
      draftTitleLabel: "عنوان الفيديو أو المنشور",
      draftTitlePlaceholder: "مثال: فيديو مراجعة مشروع الأسبوع",
      draftDateLabel: "الموعد المخطط (اختياري)",
      draftStatusLabel: "الحالة",
      draftCaptionLabel: "الوصف أو نص المنشور",
      draftCaptionPlaceholder: "اكتب الوصف أو الكلمات المفتاحية أو فكرة المقطع...",
      draftTargetsLabel: "المنصات المستهدفة",
      draftMediaLabel: "ملاحظة الملف أو المونتاج (اختياري)",
      draftMediaPlaceholder: "مثال: ملف MP4 1080p في مجلد الفيديوهات",
      cancel: "إلغاء",
      saveToList: "حفظ في القائمة",
      emptyDraftsTitle: "لا توجد مسودات نشر بعد",
      emptyFilteredDraftsTitle: "لا توجد مسودات مطابقة للتصفية",
      emptyDraftsDesc:
        "أضف الفيديوهات والمنشورات التي تجهزها ليوتيوب أو فيسبوك وإنستجرام وتيك توك لمتابعتها بسهولة.",
      emptyFilteredDraftsDesc: "جرّب تغيير كلمة البحث أو تصفية المنصة والحالة.",
      addFirstDraftBtn: "إضافة أول مسودة نشر",
      mediaNotePrefix: "ملف / ملاحظة:",
      copyText: "نسخ النص",
      copied: "تم النسخ",
      prepareYoutube: "تجهيز لليوتيوب",
      improveGemini: "تحسين عبر Gemini",
      confirmModalTitle: "تأكيد نشر الفيديو على YouTube",
      confirmModalDesc:
        "سيتم رفع هذا الملف مباشرة إلى قناتك المرتبطة على YouTube بالإعدادات التالية:",
      confirmTitleLabel: "العنوان",
      confirmPrivacyLabel: "حالة الخصوصية",
      confirmFileLabel: "ملف الفيديو",
      confirmDescLabel: "الوصف",
      confirmUploadBtn: "تأكيد الرفع إلى YouTube",
      confirmUploadingBtn: "جاري الرفع...",
      thirdPartyMeta: {
        facebook: {
          title: "فيسبوك (Facebook)",
          subtitle: "نشر المنشورات وإدارة صفحات Meta Business",
        },
        instagram: {
          title: "إنستجرام (Instagram)",
          subtitle: "نشر Reels والصور عبر حساب الأعمال المرتبط",
        },
        tiktok: {
          title: "تيك توك (TikTok)",
          subtitle: "رفع المقاطع القصيرة عبر TikTok Content Posting",
        },
      },
      deleteDraftPrefix: "حذف المسودة:",
      unifiedTitle: "مركز النشر الموحد (كل القنوات في خطوة واحدة)",
      unifiedSubtitle:
        "ادمج جوجل ويوتيوب وفيسبوك وإنستجرام وتيك توك في منشور واحد متزامن، أو وزّع النص على جميع القنوات بضغطة واحدة.",
      unifiedSelectAll: "تحديد كل القنوات (5)",
      unifiedTitleLabel: "عنوان الحملة أو الفيديو",
      unifiedTitlePlaceholder: "مثال: إطلاق التحديث الجديد من تطبيقنا",
      unifiedCaptionLabel: "النص الموحد للمنشور",
      unifiedCaptionPlaceholder: "اكتب الرسالة أو الوصف الذي سيُنشر عبر القنوات المختارة...",
      unifiedMediaUrlLabel: "رابط الصورة أو الفيديو العام لإنستجرام (اختياري)",
      unifiedMediaUrlPlaceholder: "https://example.com/media/clip.mp4",
      unifiedPublishNowBtn: "نشر موحد عبر القنوات المتصلة",
      unifiedPublishingBtn: "جاري النشر المتزامن...",
      unifiedSaveDraftBtn: "حفظ كمسودة موحدة",
      unifiedLoadYoutubeBtn: "تجهيز في رفع يوتيوب",
      unifiedAdaptGeminiBtn: "تكييف النص لكل منصة عبر Gemini",
      unifiedResultsTitle: "حالة النشر المتزامن لكل منصة:",
      unifiedStatusPublished: "تم النشر مباشرة",
      unifiedStatusReadyManual: "متصل وجاهز في البوابة",
      unifiedStatusNeedsAuth: "يتطلب ربط الحساب",
      unifiedStatusNeedsMedia: "يتطلب رابط وسائط عام",
      unifiedStatusError: "تعذر النشر",
      unifiedOpenChannel: "فتح القناة",
      unifiedSavedDraftNotice: "تم حفظ الحملة الموحدة في قائمة المسودات.",
      unifiedActiveGoogleNote: "حساب جوجل النشط:",
    },
    directory: {
      heading: "دليل المنصات والأدوات",
      subheading:
        "تنظيم سريع للوصول إلى المواقع الرسمية لكل منصة في تبويب مستقل، مع إمكانية تثبيت المفضلة أو إضافة مواقعك الخاصة.",
      searchPlaceholder: "ابحث باسم المنصة أو الشركة...",
      allTab: "الكل",
      favoritesTab: "المفضلة",
      emptyTitle: "لا توجد منصات مطابقة",
      emptyFavDesc:
        "لم تقم بتثبيت أي منصة في المفضلة بعد. اضغط على علامة النجمة في أي بطاقة لإضافتها هنا.",
      emptySearchDesc: "جرّب تعديل كلمة البحث أو اختيار فئة أخرى.",
      resetFiltersBtn: "عرض جميع المنصات",
      openSite: "فتح الموقع",
      modalTitle: "إضافة موقع جديد للدليل",
      siteNameLabel: "اسم الموقع أو المنصة",
      siteNamePlaceholder: "مثال: GitHub",
      siteUrlLabel: "الرابط (URL)",
      siteCategoryLabel: "التصنيف",
      siteDescLabel: "وصف مختصر (اختياري)",
      siteDescPlaceholder: "وصف سريع لاستخدام الموقع",
      cancel: "إلغاء",
      saveSite: "حفظ الموقع",
      pinFavoritePrefix: "تثبيت في المفضلة:",
      unpinFavoritePrefix: "إزالة من المفضلة:",
      deletePlatformPrefix: "حذف المنصة:",
      orchestrator: {
        title: "منسّق المنصات المدمجة (الكل معاً أو مجموعات مترابطة)",
        subtitle:
          "شغّل جميع المنصات كمنظومة واحدة متكاملة أو اجمع أي منصات معاً في مجموعة عمل واحدة ينسّق بينها Gemini تلقائياً.",
        presetsLabel: "مجموعات مدمجة جاهزة",
        customGroupsLabel: "مجموعاتك المخصصة",
        createGroupBtn: "دمج مجموعة مخصصة",
        cancelBtn: "إلغاء",
        groupNameLabel: "اسم المجموعة المدمجة",
        groupNamePlaceholder: "مثال: فريق إنتاج الفيديو والنشر اليومي",
        selectPlatformsHint: "اختر منصتين أو أكثر لدمجها في مجموعة واحدة:",
        saveGroupBtn: "حفظ المجموعة المدمجة",
        selectedPlatformsCount: "منصة مدمجة في هذه المجموعة",
        goalLabel: "هدف التشغيل الموحد لهذه المجموعة",
        goalPlaceholder:
          "مثال: إطلاق فيديو تعريفي عن مشروعنا وتوزيعه من التصميم والسكربت حتى النشر على يوتيوب وفيسبوك وإنستجرام وتيك توك...",
        runPipelineBtn: "تشغيل المجموعة كمنظومة واحدة",
        runningPipelineBtn: "جاري تنسيق المنصات معاً...",
        masterBriefTitle: "الملخص الموحد المشترك بين كل المنصات",
        stepsTitle: "دور كل منصة والأمر المخصص لها داخل السلسلة",
        copyPrompt: "نسخ الأمر",
        copiedPrompt: "تم النسخ",
        openPlatform: "فتح",
        pushToPublishingBtn: "إرسال للقنوات والنشر",
        pushedPublishingNotice: "تمت إضافة مسودة النشر الموحدة إلى تبويب النشر والقنوات.",
        saveNoteBtn: "حفظ الخطة في المفكرة",
        savedNoteNotice: "تم حفظ خطة المجموعة في المفكرة.",
        sendToGeminiBtn: "متابعة في محادثة Gemini",
        deleteGroupPrefix: "حذف المجموعة:",
        togglePlatformPrefix: "تحديد منصة للدمج:",
      },
    },
    notes: {
      heading: "المفكرة والأوامر المحفوظة",
      subheading:
        "احفظ نصوصك وأفكارك وردود Gemini هنا محلياً على متصفحك لنسخها أو إرسالها للمساعد لاحقاً.",
      searchPlaceholder: "ابحث في الملاحظات...",
      formTitle: "إضافة ملاحظة جديدة",
      titleLabel: "العنوان (اختياري)",
      titlePlaceholder: "مثال: صيغة تلخيص المقالات",
      contentLabel: "المحتوى",
      contentPlaceholder: "اكتب الملاحظة أو النص هنا...",
      cancel: "إلغاء",
      saveNote: "حفظ الملاحظة",
      emptyTitle: "المفكرة فارغة حالياً",
      emptySearchTitle: "لا توجد نتائج مطابقة",
      emptyDesc:
        "أضف أول ملاحظة لك أو احفظ أي رد من محادثة Gemini للرجوع إليه لاحقاً.",
      emptySearchDesc: "جرّب البحث بكلمة مختلفة.",
      addFirstNote: "إضافة أول ملاحظة",
      copy: "نسخ",
      copied: "تم النسخ",
      useInGemini: "استخدام في Gemini",
      deleteNotePrefix: "حذف الملاحظة:",
    },
  },

  en: {
    header: {
      navAria: "Primary navigation",
      mobileNavAria: "Mobile navigation",
      langAria: "Interface language",
      tabs: {
        chat: "Gemini Assistant",
        publishing: "Publishing & Channels",
        publishingMobile: "Publish",
        directory: "Platforms Directory",
        directoryMobile: "Platforms",
        notes: "Notes",
      },
      primary: {
        addSite: "Add Platform",
        newNote: "New Note",
        newDraft: "New Post Draft",
        newChat: "New Chat",
      },
      googleAuth: {
        loginBtn: "Google Sign-In",
        loggingIn: "Signing in...",
        logoutAria: "Sign out of Google account",
        accountAria: "Signed-in Google account",
      },
    },
    footer: {
      brandLine: "Rahal Plus — Personal AI Assistant & Channel Hub",
      externalNote: "External platforms open independently on their official sites",
    },
    gemini: {
      heading: "Your Personal Rahal Plus Assistant",
      subheading:
        "Remembers your past projects, compares new ideas with history, creates and executes its own workspace tasks, and supports live voice & text in Arabic, English, and Russian.",
      modeAria: "Assistant Mode",
      modes: {
        general: "General Chat",
        writing: "Writing & Editing",
        summarize: "Summarize & Plan",
        coding: "Coding Help",
      },
      channelAria: "Conversation Channel",
      channels: {
        text: "Text Chat",
        voice: "Live Voice",
        memory: "Memory & Tasks",
      },
      strategyAria: "Processing Strategy",
      strategies: {
        single: "Single Model (Fast)",
        parallel: "Parallel Query & Vote",
        parallelHint:
          "Queries Gemini 4 Hydrogen & Gemini 3.1 Flash Lite in parallel, then picks the best answer",
      },
      emptyTitle: "Talk with your personal assistant",
      emptySubtitle:
        "Share your project or plan — it remembers context, compares against past goals, creates tasks, and builds drafts:",
      starters: [
        {
          label: "Continue my current project",
          prompt:
            "I want to prepare new content for my YouTube and TikTok channels about my project. Recall my plan, suggest tasks, and draft the first post.",
          mode: "general",
        },
        {
          label: "Build a structured weekly plan",
          prompt:
            "Write a practical weekly schedule balancing product work and content creation in 5 clear points.",
          mode: "general",
        },
        {
          label: "Draft a trilingual launch post",
          prompt:
            "Help me write a concise launch announcement in Arabic, English, and Russian for my new project.",
          mode: "writing",
        },
        {
          label: "Turn an idea into action tasks",
          prompt:
            "I have an idea to grow my social presence; what are the 4 simplest steps to start and log as tasks?",
          mode: "summarize",
        },
      ],
      userLabel: "You",
      assistantLabel: "Rahal Plus",
      copy: "Copy",
      copied: "Copied",
      saveToNotes: "Save to Notes",
      saved: "Saved",
      showComparison: "Show model comparison table",
      hideComparison: "Hide model comparison table",
      loadingReply: "Thinking and preparing response via Gemini...",
      reflectingBadge: "Analyzing conversation, updating memory & tasks...",
      workReportTitle: "Personal Assistant Report (Memory & Work Done)",
      memoryComparisonLabel: "Comparison with memory:",
      completedWorkLabel: "Completed actions:",
      selfNeedsLabel: "Self-improvement & assistant needs:",
      openMemoryTab: "Open Memory & Tasks",
      openPublishingTab: "View in Publishing",
      openNotesTab: "View in Notes",
      dismissReport: "Dismiss",
      inputLabel: "Message your assistant",
      inputPlaceholder:
        "Share an idea or project update so your assistant remembers, compares, and creates tasks...",
      send: "Send",
      analyzeNow: "Analyze & Create Tasks",
      defaultNoteTitle: "Note from Rahal Plus",
    },
    voice: {
      title: "Live Voice Conversation with Rahal Plus",
      statusSpeaking: "Assistant is speaking...",
      statusOpen: "Live conversation active — speak naturally",
      statusConnecting: "Opening live voice connection...",
      statusError: "Connection stopped",
      statusReady: "Ready for live voice conversation",
      voiceSelectAria: "Select assistant voice",
      mute: "Mute Mic",
      muted: "Mic Muted",
      endCall: "End Call",
      startCall: "Start Live Voice",
      connectingBtn: "Connecting...",
      emptyTitle: "Speak naturally without typing",
      emptyDesc:
        "Click Start Live Voice and allow microphone access. Your assistant recalls your saved projects during voice calls and can convert the discussion into tasks.",
      userVoiceLabel: "You (Voice)",
      quickInputLabel: "Send quick text during call",
      quickPlaceholderLive: "Send a quick word or link during the voice call...",
      quickPlaceholderIdle: "Start a voice call to enable live text hints",
      send: "Send",
      saveTranscript: "Save Transcript",
      savedTranscript: "Saved to Notes",
      analyzeTranscript: "Analyze & Create Tasks",
      analyzingTranscript: "Analyzing conversation...",
      defaultTranscriptTitle: "Live Voice Conversation",
      micUnsupported: "Your browser does not support microphone capture.",
      wsError: "Failed to open live voice WebSocket connection.",
      startError: "Could not access microphone or start live conversation.",
    },
    memoryPanel: {
      title: "Personal Memory & Autonomous Assistant Tasks",
      subtitle:
        "Your assistant persists what you tell it across sessions, sets its own tasks, generates real drafts and notes, and tracks what it needs to improve.",
      statsMemories: "Memories",
      statsOpenTasks: "Open Tasks",
      statsDoneTasks: "Completed Tasks",
      memoriesTitle: "Remembered Projects, Goals & Preferences",
      addMemoryBtn: "Add Memory",
      memoryPlaceholder: "Example: My main project is a multilingual tech channel",
      memoryCategoryAria: "Memory category",
      allCategories: "All",
      noMemories:
        "No personal memories recorded yet. Chat with the assistant or add a memory manually.",
      deleteMemoryAria: "Delete memory item",
      tasksTitle: "Assistant Self-Assigned Tasks & Deliverables",
      addTaskBtn: "Add Task",
      taskTitlePlaceholder: "Task title...",
      taskDetailsPlaceholder: "Execution details...",
      taskFilterAll: "All Tasks",
      executeNow: "Execute Now",
      executing: "Executing...",
      markDone: "Mark Done",
      reopenTask: "Reopen",
      deleteTaskAria: "Delete task",
      noTasks:
        "No tasks yet. As you talk with Rahal Plus, it will create and execute tasks here.",
      linkedDraftNotice: "Created publish draft:",
      linkedNoteNotice: "Saved note:",
      reflectionsTitle: "Self-Reflection & Capability Needs",
      neededCapabilityLabel: "What the assistant needs next:",
      noReflections:
        "Self-reflection notes about what the assistant needs to serve you better will appear here.",
      deleteReflectionAria: "Delete reflection item",
      saveBtn: "Save",
      cancelBtn: "Cancel",
    },
    parallel: {
      phaseQuerying: "Parallel query across available Gemini models",
      phaseVoting: "Evaluating & selecting the strongest answer",
      phaseCompleted: "Evaluation & consensus complete",
      phaseError: "Parallel processing failed",
      openModalBtn: "View Progress Window",
      stepRunning: "Analyzing...",
      stepCompleted: "Response ready",
      stepError: "Failed",
      stepPending: "Pending",
      stepReadyVoting: "Ready for vote",
      votingRowTitle: "Final Review & Voting",
      votingComparing: "Comparing candidate answers...",
      votingAccepted: "Selected",
      votingBestChosen: "Best result selected",
      votingWaiting: "Waiting for models to finish",
      votingStopped: "Evaluation stopped",
      modalTitle: "Model Voting & Parallel Progress",
      modalSubtitle:
        "Real-time progress of each participating model before finalizing the response.",
      modalCloseAria: "Close comparison progress modal",
      modelsCountWord: "models",
      modalDoneBtn: "View Final Result",
      modalBackgroundBtn: "Close & Continue in Background",
      tableCriterion: "Metric",
      tableWords: "Words",
      tableChars: "Characters",
      tableParagraphs: "Paragraphs",
      tableAnswer: "Answer",
      tableActions: "Actions",
      winnerRole: "Selected Winner",
      participantRole: "Participant",
    },
    publishing: {
      heading: "Channels & Publishing",
      subheading:
        "Link your Google & YouTube account to upload videos directly, manage Facebook, Instagram, and TikTok OAuth connections, and organize upcoming content drafts.",
      ytKicker: "Google · YouTube Data API",
      ytConnected: "Connected & Ready",
      ytDisconnected: "Not Connected",
      ytTitle: "Link Google Account & YouTube Channel",
      ytLoginBtn: "Sign in with Google to Link YouTube",
      ytLoggingIn: "Signing in...",
      ytRefresh: "Refresh Channel",
      ytLogout: "Sign Out",
      subscribers: "Subscribers",
      videosCount: "Videos",
      latestVideos: "Latest Videos on Your Channel",
      privacyPublic: "Public",
      privacyUnlisted: "Unlisted",
      privacyPrivate: "Private",
      uploadTitle: "Upload Video Directly to YouTube",
      uploadSubtitle:
        "Select a video file and enter title and description; a confirmation dialog appears before uploading.",
      openYtStudio: "Open YouTube Studio",
      videoFileLabel: "Video File",
      privacyLabel: "Privacy Status",
      privacyOptionPrivate: "Private (Visible only to you)",
      privacyOptionUnlisted: "Unlisted (Anyone with the link)",
      privacyOptionPublic: "Public (Visible to everyone)",
      videoTitleLabel: "Video Title",
      videoTitlePlaceholder: "Example: Weekly project walkthrough",
      videoTagsLabel: "Tags (optional, comma-separated)",
      videoTagsPlaceholder: "Example: tutorials, tech, youtube",
      videoDescLabel: "Video Description",
      videoDescPlaceholder: "Write your video description and key links...",
      uploadSuccessPrefix: "Uploaded",
      watchOnYt: "Watch on YouTube",
      reviewAndUploadBtn: "Review & Upload to YouTube",
      socialTitle: "Connected Social Publishing Platforms",
      socialSubtitle:
        "Connect Google, Facebook, Instagram, and TikTok via direct OAuth when developer keys are configured, or launch official publishing portals.",
      googleProfileKicker: "Google Profile",
      googleConnected: "Google Connected",
      googleNeedsAuth: "Sign-in Required",
      googleCardTitle: "Google",
      googleCardDesc:
        "Uses your Google sign-in above with quick access to Business Profile and Search.",
      connectGoogleBtn: "Connect Google",
      accountConnected: "Connected",
      openPlatform: "Open Platform",
      statusConnected: "Connected",
      statusReady: "Ready to Link",
      statusNeedsKeys: "Requires App Keys",
      requiredSecrets: "Required Secrets:",
      callbackUriLabel: "Callback URI:",
      disconnectBtn: "Disconnect",
      connectBtn: "Connect Account",
      hideSetup: "Hide Setup",
      showSetup: "Setup OAuth",
      openPortal: "Open Portal",
      fbPostTitle: "Publish Directly to Connected Facebook Page",
      fbPostPlaceholder: "Write a post for your Facebook Page...",
      fbPublishing: "Publishing...",
      fbPublishBtn: "Publish to Facebook",
      draftsTitle: "Upcoming Content & Drafts Queue",
      draftsSubtitle:
        "Keep every video and post you plan to add or publish later across YouTube and social media.",
      draftSearchPlaceholder: "Search drafts...",
      allPlatformsFilter: "All Platforms",
      allStatusesFilter: "All Statuses",
      newDraftFormTitle: "Add New Content Draft",
      draftTitleLabel: "Video or Post Title",
      draftTitlePlaceholder: "Example: Weekly project recap video",
      draftDateLabel: "Planned Date (optional)",
      draftStatusLabel: "Status",
      draftCaptionLabel: "Description or Post Caption",
      draftCaptionPlaceholder: "Write caption, hashtags, or script notes...",
      draftTargetsLabel: "Target Platforms",
      draftMediaLabel: "File or Editing Note (optional)",
      draftMediaPlaceholder: "Example: 1080p MP4 in Exports folder",
      cancel: "Cancel",
      saveToList: "Save to Queue",
      emptyDraftsTitle: "No publish drafts yet",
      emptyFilteredDraftsTitle: "No matching drafts found",
      emptyDraftsDesc:
        "Add upcoming videos and posts for YouTube, Facebook, Instagram, and TikTok.",
      emptyFilteredDraftsDesc: "Try changing your search query or filters.",
      addFirstDraftBtn: "Add First Draft",
      mediaNotePrefix: "File / Note:",
      copyText: "Copy Text",
      copied: "Copied",
      prepareYoutube: "Load to YouTube",
      improveGemini: "Refine with Gemini",
      confirmModalTitle: "Confirm YouTube Video Upload",
      confirmModalDesc:
        "This video file will be uploaded directly to your linked YouTube channel with these settings:",
      confirmTitleLabel: "Title",
      confirmPrivacyLabel: "Privacy",
      confirmFileLabel: "Video File",
      confirmDescLabel: "Description",
      confirmUploadBtn: "Confirm Upload to YouTube",
      confirmUploadingBtn: "Uploading...",
      thirdPartyMeta: {
        facebook: {
          title: "Facebook",
          subtitle: "Publish posts and manage Meta Business Pages",
        },
        instagram: {
          title: "Instagram",
          subtitle: "Publish Reels and posts via linked Business account",
        },
        tiktok: {
          title: "TikTok",
          subtitle: "Upload short videos via TikTok Content Posting",
        },
      },
      deleteDraftPrefix: "Delete draft:",
      unifiedTitle: "Unified All-Channel Publisher",
      unifiedSubtitle:
        "Combine Google, YouTube, Facebook, Instagram, and TikTok into one synchronized broadcast composer or adapt content across every selected channel.",
      unifiedSelectAll: "Select All 5 Channels",
      unifiedTitleLabel: "Campaign or Video Title",
      unifiedTitlePlaceholder: "Example: Launching our new Rahal Plus release",
      unifiedCaptionLabel: "Unified Post Caption",
      unifiedCaptionPlaceholder: "Write the shared message for all selected platforms...",
      unifiedMediaUrlLabel: "Public Image/Video URL for Instagram (optional)",
      unifiedMediaUrlPlaceholder: "https://example.com/media/clip.mp4",
      unifiedPublishNowBtn: "Publish Together to Connected Channels",
      unifiedPublishingBtn: "Dispatching to channels...",
      unifiedSaveDraftBtn: "Save Unified Draft",
      unifiedLoadYoutubeBtn: "Load into YouTube Upload",
      unifiedAdaptGeminiBtn: "Adapt for Every Channel via Gemini",
      unifiedResultsTitle: "Per-Channel Dispatch Status:",
      unifiedStatusPublished: "Published Live",
      unifiedStatusReadyManual: "Connected & Studio Ready",
      unifiedStatusNeedsAuth: "Sign-In / OAuth Required",
      unifiedStatusNeedsMedia: "Needs Public Media URL",
      unifiedStatusError: "Failed",
      unifiedOpenChannel: "Open Channel",
      unifiedSavedDraftNotice: "Unified multi-channel draft saved to your queue.",
      unifiedActiveGoogleNote: "Active Google Login:",
    },
    directory: {
      heading: "Platforms & Tools Directory",
      subheading:
        "Quick access to official AI and social media platforms in separate tabs, with favorites and custom links.",
      searchPlaceholder: "Search by platform or company...",
      allTab: "All",
      favoritesTab: "Favorites",
      emptyTitle: "No matching platforms",
      emptyFavDesc:
        "No favorites pinned yet. Click the star icon on any platform card to pin it here.",
      emptySearchDesc: "Try a different keyword or select another category.",
      resetFiltersBtn: "Show All Platforms",
      openSite: "Open Site",
      modalTitle: "Add New Platform to Directory",
      siteNameLabel: "Platform Name",
      siteNamePlaceholder: "Example: GitHub",
      siteUrlLabel: "URL",
      siteCategoryLabel: "Category",
      siteDescLabel: "Short Description (optional)",
      siteDescPlaceholder: "Brief note about this platform",
      cancel: "Cancel",
      saveSite: "Save Platform",
      pinFavoritePrefix: "Pin to favorites:",
      unpinFavoritePrefix: "Remove from favorites:",
      deletePlatformPrefix: "Delete platform:",
      orchestrator: {
        title: "Unified Platform Orchestrator (All-in-One or Merged Groups)",
        subtitle:
          "Run all platforms together as one integrated system or bundle any custom group of platforms into a single Gemini-coordinated pipeline.",
        presetsLabel: "Pre-Integrated Suites",
        customGroupsLabel: "Your Custom Merged Groups",
        createGroupBtn: "Merge Custom Group",
        cancelBtn: "Cancel",
        groupNameLabel: "Merged Group Name",
        groupNamePlaceholder: "Example: Daily Video & Social Broadcast Stack",
        selectPlatformsHint: "Select 2 or more platforms to merge into one working group:",
        saveGroupBtn: "Save Merged Group",
        selectedPlatformsCount: "platforms merged in this group",
        goalLabel: "Shared Goal for This Integrated Group",
        goalPlaceholder:
          "Example: Turn our latest update into a script, AI visuals, YouTube video, and Facebook/Instagram/TikTok posts...",
        runPipelineBtn: "Run Group as Unified System",
        runningPipelineBtn: "Coordinating platforms...",
        masterBriefTitle: "Shared Master Brief Across All Platforms",
        stepsTitle: "Synchronized Role & Tailored Prompt per Platform",
        copyPrompt: "Copy Prompt",
        copiedPrompt: "Copied",
        openPlatform: "Open",
        pushToPublishingBtn: "Send to Publishing Queue",
        pushedPublishingNotice: "Added unified multi-channel draft to Channels & Publishing.",
        saveNoteBtn: "Save Pipeline to Notes",
        savedNoteNotice: "Saved group workflow to Notes.",
        sendToGeminiBtn: "Continue in Gemini Chat",
        deleteGroupPrefix: "Delete group:",
        togglePlatformPrefix: "Toggle platform in group:",
      },
    },
    notes: {
      heading: "Notes & Saved Prompts",
      subheading:
        "Store prompts, ideas, and Gemini responses locally in your browser to copy or send back anytime.",
      searchPlaceholder: "Search notes...",
      formTitle: "Add New Note",
      titleLabel: "Title (optional)",
      titlePlaceholder: "Example: Article summary prompt",
      contentLabel: "Content",
      contentPlaceholder: "Write your note or text here...",
      cancel: "Cancel",
      saveNote: "Save Note",
      emptyTitle: "Your notes are empty",
      emptySearchTitle: "No matching notes",
      emptyDesc:
        "Add your first note or save any response from Gemini for quick reuse.",
      emptySearchDesc: "Try searching with another keyword.",
      addFirstNote: "Add First Note",
      copy: "Copy",
      copied: "Copied",
      useInGemini: "Send to Gemini",
      deleteNotePrefix: "Delete note:",
    },
  },

  ru: {
    header: {
      navAria: "Основная навигация",
      mobileNavAria: "Мобильная навигация",
      langAria: "Язык интерфейса",
      tabs: {
        chat: "Ассистент Gemini",
        publishing: "Публикации и каналы",
        publishingMobile: "Каналы",
        directory: "Каталог платформ",
        directoryMobile: "Платформы",
        notes: "Заметки",
      },
      primary: {
        addSite: "Добавить сайт",
        newNote: "Новая заметка",
        newDraft: "Новый черновик",
        newChat: "Новый чат",
      },
      googleAuth: {
        loginBtn: "Войти с Google",
        loggingIn: "Вход...",
        logoutAria: "Выйти из аккаунта Google",
        accountAria: "Активный аккаунт Google",
      },
    },
    footer: {
      brandLine: "Rahal Plus — персональный ИИ-помощник и центр каналов",
      externalNote:
        "Внешние платформы открываются независимо на своих официальных сайтах",
    },
    gemini: {
      heading: "Персональный помощник Rahal Plus",
      subheading:
        "Помнит ваши прошлые проекты, сравнивает идеи, сам ставит и выполняет задачи и общается текстом и голосом на арабском, английском и русском языках.",
      modeAria: "Режим помощника",
      modes: {
        general: "Общий чат",
        writing: "Редактура и текст",
        summarize: "Сводка и план",
        coding: "Помощь с кодом",
      },
      channelAria: "Режим общения",
      channels: {
        text: "Текстовый чат",
        voice: "Живой голос",
        memory: "Память и задачи",
      },
      strategyAria: "Стратегия обработки",
      strategies: {
        single: "Одна модель (быстро)",
        parallel: "Параллельный запрос и выбор лучшего",
        parallelHint:
          "Запрашивает Gemini 4 Hydrogen и Gemini 3.1 Flash Lite параллельно и выбирает лучший ответ",
      },
      emptyTitle: "Поговорите с личным помощником",
      emptySubtitle:
        "Расскажите о своём проекте или плане — помощник запомнит детали, сравнит с прошлым опытом, создаст задачи и подготовит черновики:",
      starters: [
        {
          label: "Продолжить текущий проект",
          prompt:
            "Хочу подготовить новый контент для YouTube и TikTok по моему проекту. Вспомни мой план, предложи задачи и сделай первый черновик.",
          mode: "general",
        },
        {
          label: "План на неделю",
          prompt:
            "Составь практичный недельный план, чтобы совмещать разработку и создание контента, в 5 чётких пунктах.",
          mode: "general",
        },
        {
          label: "Пост на трёх языках",
          prompt:
            "Помоги написать короткий анонс моего проекта на арабском, английском и русском языках.",
          mode: "writing",
        },
        {
          label: "Превратить идею в задачи",
          prompt:
            "У меня есть идея для развития присутствия в соцсетях; какие 4 простых шага стоит сделать и записать в задачи?",
          mode: "summarize",
        },
      ],
      userLabel: "Вы",
      assistantLabel: "Rahal Plus",
      copy: "Копировать",
      copied: "Скопировано",
      saveToNotes: "В заметки",
      saved: "Сохранено",
      showComparison: "Показать таблицу сравнения моделей",
      hideComparison: "Скрыть таблицу сравнения моделей",
      loadingReply: "Анализирую и готовлю ответ через Gemini...",
      reflectingBadge: "Анализирую диалог, обновляю память и задачи...",
      workReportTitle: "Отчёт личного помощника (память и выполненное)",
      memoryComparisonLabel: "Сравнение с прошлой памятью:",
      completedWorkLabel: "Что помощник уже сделал:",
      selfNeedsLabel: "Саморазвитие и потребности помощника:",
      openMemoryTab: "Открыть память и задачи",
      openPublishingTab: "Открыть в публикациях",
      openNotesTab: "Открыть в заметках",
      dismissReport: "Скрыть отчёт",
      inputLabel: "Сообщение помощнику",
      inputPlaceholder:
        "Опишите идею или задачу — помощник проанализирует, запомнит и начнёт работу...",
      send: "Отправить",
      analyzeNow: "Разобрать и создать задачи",
      defaultNoteTitle: "Заметка от Rahal Plus",
    },
    voice: {
      title: "Живой голосовой разговор с Rahal Plus",
      statusSpeaking: "Помощник говорит...",
      statusOpen: "Голосовая связь открыта — можете говорить",
      statusConnecting: "Подключаю голосовой канал...",
      statusError: "Связь прервана",
      statusReady: "Готов к живому голосовому разговору",
      voiceSelectAria: "Выбор голоса помощника",
      mute: "Выкл. микрофон",
      muted: "Микрофон выкл.",
      endCall: "Завершить",
      startCall: "Начать голосовой чат",
      connectingBtn: "Подключение...",
      emptyTitle: "Общайтесь голосом без набора текста",
      emptyDesc:
        "Нажмите «Начать голосовой чат» и разрешите доступ к микрофону. Помощник помнит ваши проекты во время разговора и может создать задачи по итогам беседы.",
      userVoiceLabel: "Вы (голос)",
      quickInputLabel: "Быстрый текст во время звонка",
      quickPlaceholderLive: "Отправьте слово или ссылку во время разговора...",
      quickPlaceholderIdle: "Начните голосовой чат, чтобы отправлять текст",
      send: "Отправить",
      saveTranscript: "Сохранить диалог",
      savedTranscript: "Сохранено в заметки",
      analyzeTranscript: "Разобрать и создать задачи",
      analyzingTranscript: "Анализирую диалог...",
      defaultTranscriptTitle: "Живой голосовой разговор",
      micUnsupported: "Ваш браузер не поддерживает запись с микрофона.",
      wsError: "Не удалось установить голосовое WebSocket-соединение.",
      startError: "Не удалось включить микрофон или начать разговор.",
    },
    memoryPanel: {
      title: "Личная память и автономные задачи помощника",
      subtitle:
        "Помощник сохраняет контекст ваших проектов, ставит себе задачи, создаёт черновики и заметки и отмечает, чего ему не хватает для развития.",
      statsMemories: "Записей в памяти",
      statsOpenTasks: "Открытых задач",
      statsDoneTasks: "Выполнено",
      memoriesTitle: "Что помощник помнит о вас и ваших проектах",
      addMemoryBtn: "Добавить в память",
      memoryPlaceholder: "Например: мой главный проект — канал о технологиях",
      memoryCategoryAria: "Категория памяти",
      allCategories: "Все",
      noMemories:
        "Память пока пуста. Поговорите с помощником или добавьте факт о проекте вручную.",
      deleteMemoryAria: "Удалить запись памяти",
      tasksTitle: "Задачи помощника и выполненная работа",
      addTaskBtn: "Добавить задачу",
      taskTitlePlaceholder: "Название задачи...",
      taskDetailsPlaceholder: "Подробности выполнения...",
      taskFilterAll: "Все задачи",
      executeNow: "Выполнить сейчас",
      executing: "Выполняю...",
      markDone: "Готово",
      reopenTask: "Открыть снова",
      deleteTaskAria: "Удалить задачу",
      noTasks:
        "Задач пока нет. В ходе общения помощник сам сформирует задачи и покажет результаты здесь.",
      linkedDraftNotice: "Создан черновик публикации:",
      linkedNoteNotice: "Сохранена заметка:",
      reflectionsTitle: "Самоанализ и потребности помощника",
      neededCapabilityLabel: "Что нужно помощнику дальше:",
      noReflections:
        "Здесь будут появляться выводы помощника о том, какие данные или функции помогут ему работать лучше.",
      deleteReflectionAria: "Удалить запись самоанализа",
      saveBtn: "Сохранить",
      cancelBtn: "Отмена",
    },
    parallel: {
      phaseQuerying: "Параллельный запрос к моделям Gemini",
      phaseVoting: "Оценка и выбор лучшего ответа",
      phaseCompleted: "Оценка и выбор завершены",
      phaseError: "Ошибка параллельной обработки",
      openModalBtn: "Окно прогресса",
      stepRunning: "Анализ...",
      stepCompleted: "Ответ готов",
      stepError: "Ошибка",
      stepPending: "Ожидание",
      stepReadyVoting: "Готово к оценке",
      votingRowTitle: "Итоговая проверка и выбор",
      votingComparing: "Сравниваю ответы моделей...",
      votingAccepted: "Выбрано",
      votingBestChosen: "Выбран лучший ответ",
      votingWaiting: "Ожидание завершения моделей",
      votingStopped: "Оценка остановлена",
      modalTitle: "Прогресс голосования и сравнения моделей",
      modalSubtitle:
        "Ход участия каждой модели в параллельном запросе перед финальным ответом.",
      modalCloseAria: "Закрыть окно прогресса",
      modelsCountWord: "моделей",
      modalDoneBtn: "Показать итог",
      modalBackgroundBtn: "Свернуть в фон",
      tableCriterion: "Критерий",
      tableWords: "Слов",
      tableChars: "Символов",
      tableParagraphs: "Абзацев",
      tableAnswer: "Текст ответа",
      tableActions: "Действия",
      winnerRole: "Итоговый выбор",
      participantRole: "Участник",
    },
    publishing: {
      heading: "Каналы и публикации",
      subheading:
        "Подключите Google и YouTube для прямой загрузки видео, настройте OAuth для Facebook, Instagram и TikTok и ведите очередь будущих публикаций.",
      ytKicker: "Google · YouTube Data API",
      ytConnected: "Подключено и готово",
      ytDisconnected: "Не подключено",
      ytTitle: "Аккаунт Google и канал YouTube",
      ytLoginBtn: "Войти через Google и подключить YouTube",
      ytLoggingIn: "Вход...",
      ytRefresh: "Обновить канал",
      ytLogout: "Выйти",
      subscribers: "Подписчики",
      videosCount: "Видео",
      latestVideos: "Последние видео на канале",
      privacyPublic: "Открытое",
      privacyUnlisted: "По ссылке",
      privacyPrivate: "Личное",
      uploadTitle: "Прямая загрузка видео на YouTube",
      uploadSubtitle:
        "Выберите видеофайл и заполните название и описание; перед отправкой появится окно подтверждения.",
      openYtStudio: "Открыть YouTube Studio",
      videoFileLabel: "Видеофайл",
      privacyLabel: "Доступ при публикации",
      privacyOptionPrivate: "Личное (Private — только вы)",
      privacyOptionUnlisted: "По ссылке (Unlisted)",
      privacyOptionPublic: "Открытое (Public — для всех)",
      videoTitleLabel: "Название видео",
      videoTitlePlaceholder: "Например: Обзор проекта за неделю",
      videoTagsLabel: "Теги (необязательно, через запятую)",
      videoTagsPlaceholder: "Например: обзор, технологии, youtube",
      videoDescLabel: "Описание видео",
      videoDescPlaceholder: "Добавьте описание и полезные ссылки...",
      uploadSuccessPrefix: "Загружено видео",
      watchOnYt: "Смотреть на YouTube",
      reviewAndUploadBtn: "Проверить и загрузить на YouTube",
      socialTitle: "Подключённые социальные сети",
      socialSubtitle:
        "Подключите Google, Facebook, Instagram и TikTok через OAuth при наличии ключей разработчика или открывайте официальные студии.",
      googleProfileKicker: "Google Profile",
      googleConnected: "Google подключён",
      googleNeedsAuth: "Требуется вход",
      googleCardTitle: "Google",
      googleCardDesc:
        "Использует ваш вход Google выше с быстрым переходом к профилю компании и поиску.",
      connectGoogleBtn: "Подключить Google",
      accountConnected: "Подключено",
      openPlatform: "Открыть",
      statusConnected: "Подключено",
      statusReady: "Готово к подключению",
      statusNeedsKeys: "Нужны ключи приложения",
      requiredSecrets: "Необходимые переменные в Secrets:",
      callbackUriLabel: "Callback URI:",
      disconnectBtn: "Отключить",
      connectBtn: "Подключить аккаунт",
      hideSetup: "Скрыть",
      showSetup: "Настройка OAuth",
      openPortal: "Открыть студию",
      fbPostTitle: "Прямая публикация на странице Facebook",
      fbPostPlaceholder: "Введите текст публикации для Facebook...",
      fbPublishing: "Публикация...",
      fbPublishBtn: "Опубликовать в Facebook",
      draftsTitle: "Очередь будущих публикаций и черновиков",
      draftsSubtitle:
        "Храните здесь видео и посты, которые планируете выпустить позже на YouTube и в соцсетях.",
      draftSearchPlaceholder: "Поиск по черновикам...",
      allPlatformsFilter: "Все платформы",
      allStatusesFilter: "Все статусы",
      newDraftFormTitle: "Новый черновик публикации",
      draftTitleLabel: "Название видео или поста",
      draftTitlePlaceholder: "Например: Итоги недели",
      draftDateLabel: "Планируемая дата (необязательно)",
      draftStatusLabel: "Статус",
      draftCaptionLabel: "Описание или текст поста",
      draftCaptionPlaceholder: "Введите описание, хэштеги или идею ролика...",
      draftTargetsLabel: "Целевые платформы",
      draftMediaLabel: "Файл или заметка по монтажу (необязательно)",
      draftMediaPlaceholder: "Например: MP4 1080p в папке Exports",
      cancel: "Отмена",
      saveToList: "Сохранить в очередь",
      emptyDraftsTitle: "Пока нет черновиков",
      emptyFilteredDraftsTitle: "Подходящих черновиков нет",
      emptyDraftsDesc:
        "Добавляйте видео и посты для YouTube, Facebook, Instagram и TikTok.",
      emptyFilteredDraftsDesc: "Попробуйте изменить запрос или фильтры.",
      addFirstDraftBtn: "Добавить первый черновик",
      mediaNotePrefix: "Файл / заметка:",
      copyText: "Копировать текст",
      copied: "Скопировано",
      prepareYoutube: "Подготовить для YouTube",
      improveGemini: "Улучшить через Gemini",
      confirmModalTitle: "Подтверждение загрузки на YouTube",
      confirmModalDesc:
        "Этот видеофайл будет загружен напрямую на ваш связанный канал YouTube со следующими параметрами:",
      confirmTitleLabel: "Название",
      confirmPrivacyLabel: "Доступ",
      confirmFileLabel: "Файл",
      confirmDescLabel: "Описание",
      confirmUploadBtn: "Подтвердить загрузку на YouTube",
      confirmUploadingBtn: "Загрузка...",
      thirdPartyMeta: {
        facebook: {
          title: "Facebook",
          subtitle: "Публикации и управление страницами Meta Business",
        },
        instagram: {
          title: "Instagram",
          subtitle: "Публикация Reels и фото через бизнес-аккаунт",
        },
        tiktok: {
          title: "TikTok",
          subtitle: "Загрузка коротких роликов через TikTok Content Posting",
        },
      },
      deleteDraftPrefix: "Удалить черновик:",
      unifiedTitle: "Единый центр публикаций (все каналы вместе)",
      unifiedSubtitle:
        "Объедините Google, YouTube, Facebook, Instagram и TikTok в одном окне одновременной публикации или адаптируйте текст под каждый канал.",
      unifiedSelectAll: "Выбрать все 5 каналов",
      unifiedTitleLabel: "Заголовок кампании или видео",
      unifiedTitlePlaceholder: "Например: Запуск обновления Rahal Plus",
      unifiedCaptionLabel: "Общий текст публикации",
      unifiedCaptionPlaceholder: "Введите описание или сообщение для выбранных платформ...",
      unifiedMediaUrlLabel: "Публичная ссылка на фото/видео для Instagram (опционально)",
      unifiedMediaUrlPlaceholder: "https://example.com/media/clip.mp4",
      unifiedPublishNowBtn: "Опубликовать одновременно во все подключённые каналы",
      unifiedPublishingBtn: "Отправка по каналам...",
      unifiedSaveDraftBtn: "Сохранить единый черновик",
      unifiedLoadYoutubeBtn: "Загрузить в форму YouTube",
      unifiedAdaptGeminiBtn: "Адаптировать под каналы через Gemini",
      unifiedResultsTitle: "Статус отправки по каналам:",
      unifiedStatusPublished: "Опубликовано",
      unifiedStatusReadyManual: "Подключено и готово в студии",
      unifiedStatusNeedsAuth: "Требуется вход / OAuth",
      unifiedStatusNeedsMedia: "Нужна ссылка на медиафайл",
      unifiedStatusError: "Ошибка",
      unifiedOpenChannel: "Открыть канал",
      unifiedSavedDraftNotice: "Единый черновик сохранён в очередь публикаций.",
      unifiedActiveGoogleNote: "Активный аккаунт Google:",
    },
    directory: {
      heading: "Каталог платформ и инструментов",
      subheading:
        "Быстрый доступ к официальным сайтам ИИ и социальных сетей в отдельной вкладке, с избранным и своими ссылками.",
      searchPlaceholder: "Поиск по названию или компании...",
      allTab: "Все",
      favoritesTab: "Избранное",
      emptyTitle: "Платформы не найдены",
      emptyFavDesc:
        "В избранном пока пусто. Нажмите на звёздочку на карточке, чтобы закрепить платформу.",
      emptySearchDesc: "Попробуйте другой запрос или категорию.",
      resetFiltersBtn: "Показать все платформы",
      openSite: "Открыть сайт",
      modalTitle: "Добавить новую платформу",
      siteNameLabel: "Название платформы",
      siteNamePlaceholder: "Например: GitHub",
      siteUrlLabel: "Ссылка (URL)",
      siteCategoryLabel: "Категория",
      siteDescLabel: "Краткое описание (необязательно)",
      siteDescPlaceholder: "Короткое описание назначения",
      cancel: "Отмена",
      saveSite: "Сохранить",
      pinFavoritePrefix: "Добавить в избранное:",
      unpinFavoritePrefix: "Убрать из избранного:",
      deletePlatformPrefix: "Удалить платформу:",
      orchestrator: {
        title: "Объединённый оркестратор платформ (все сразу или по группам)",
        subtitle:
          "Запускайте все платформы как единый конвейер или соберите собственную группу сервисов под управление Gemini.",
        presetsLabel: "Готовые объединённые наборы",
        customGroupsLabel: "Ваши объединённые группы",
        createGroupBtn: "Создать свою группу",
        cancelBtn: "Отмена",
        groupNameLabel: "Название объединённой группы",
        groupNamePlaceholder: "Например: Связка для видео и ежедневного постинга",
        selectPlatformsHint: "Выберите 2 и более платформы для объединения:",
        saveGroupBtn: "Сохранить группу",
        selectedPlatformsCount: "платформ объединено в группе",
        goalLabel: "Общая цель для этой группы платформ",
        goalPlaceholder:
          "Например: превратить идею в сценарий, визуал, ролик на YouTube и посты в Facebook, Instagram и TikTok...",
        runPipelineBtn: "Запустить группу как единую систему",
        runningPipelineBtn: "Согласование платформ...",
        masterBriefTitle: "Общий бриф для всех платформ группы",
        stepsTitle: "Роль и готовый промпт для каждой платформы",
        copyPrompt: "Копировать промпт",
        copiedPrompt: "Скопировано",
        openPlatform: "Открыть",
        pushToPublishingBtn: "Отправить в публикации",
        pushedPublishingNotice: "Единый черновик добавлен в раздел «Публикации и каналы».",
        saveNoteBtn: "Сохранить план в заметки",
        savedNoteNotice: "План группы сохранён в заметках.",
        sendToGeminiBtn: "Продолжить в чате Gemini",
        deleteGroupPrefix: "Удалить группу:",
        togglePlatformPrefix: "Выбрать платформу для группы:",
      },
    },
    notes: {
      heading: "Заметки и сохранённые промпты",
      subheading:
        "Сохраняйте тексты, идеи и ответы Gemini локально в браузере для быстрого копирования и отправки помощнику.",
      searchPlaceholder: "Поиск в заметках...",
      formTitle: "Новая заметка",
      titleLabel: "Заголовок (необязательно)",
      titlePlaceholder: "Например: Шаблон сводки статей",
      contentLabel: "Содержимое",
      contentPlaceholder: "Введите текст заметки...",
      cancel: "Отмена",
      saveNote: "Сохранить заметку",
      emptyTitle: "Заметок пока нет",
      emptySearchTitle: "Совпадений не найдено",
      emptyDesc:
        "Создайте первую заметку или сохраните любой ответ Gemini.",
      emptySearchDesc: "Попробуйте другое ключевое слово.",
      addFirstNote: "Добавить первую заметку",
      copy: "Копировать",
      copied: "Скопировано",
      useInGemini: "Отправить в Gemini",
      deleteNotePrefix: "Удалить заметку:",
    },
  },
};
