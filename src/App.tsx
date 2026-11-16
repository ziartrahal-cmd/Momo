import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { Header, type WorkspaceTab } from "./components/Header";
import {
  GeminiWorkspace,
  type AssistantMode,
  type ChatMessage,
  type ModelCandidateAnswer,
  type QueryStrategy,
} from "./components/GeminiWorkspace";
import { INITIAL_PLATFORMS, type PlatformEntry } from "./data/platforms";
import {
  clearYouTubeAccessToken,
  getYouTubeAccessToken,
  initYouTubeAuth,
  signInWithYouTube,
  signOutYouTube,
} from "./lib/youtubeAuth";
import {
  configureLocalStorageFolder,
  disconnectLocalStorageServer,
  downloadSnapshotJsonFile,
  fetchLocalStorageInfo,
  isNativeDirectoryPickerSupported,
  loadSnapshotFromLocalServer,
  pickNativeComputerDirectory,
  syncSnapshotToLocalServer,
  writeSnapshotToNativeDirectory,
  type DirectoryHandleLike,
} from "./lib/localDeviceSync";
import {
  createCustomPlatform,
  toggleFavoriteId,
  type CustomPlatformInput,
} from "./utils/directory";
import { createNoteItem, type NoteItem } from "./utils/notes";
import type { CustomPlatformGroup } from "./utils/platformBundles";
import {
  createPublishDraft,
  type DraftStatus,
  type PublishDraft,
  type PublishDraftInput,
  type SocialPlatformId,
} from "./utils/publishing";
import {
  applyParallelEvent,
  createInitialParallelState,
  type ParallelPipelineState,
  type ParallelStreamEvent,
} from "./utils/parallelStatus";
import {
  buildMemoryPromptContext,
  createAssistantTask,
  mergeMemories,
  updateAssistantTaskStatus,
  type AssistantTask,
  type AssistantTaskKind,
  type AssistantTaskStatus,
  type AssistantWorkReport,
  type MemoryCategory,
  type MemoryItem,
  type SelfReflectionItem,
} from "./utils/assistantMemory";
import type { LiveTranscriptItem } from "./utils/audioPcm";
import {
  buildWorkspaceSnapshotPayload,
  type LocalStorageServerInfo,
  type WorkspaceSnapshotPayload,
} from "./utils/localDeviceStorage";
import {
  getLanguageDir,
  isAppLanguage,
  UI_TEXT,
  type AppLanguage,
} from "./utils/i18n";

const Spatial3DBanner = lazy(() =>
  import("./components/Spatial3DBanner").then((m) => ({
    default: m.Spatial3DBanner,
  }))
);
const PlatformsDirectory = lazy(() =>
  import("./components/PlatformsDirectory").then((m) => ({
    default: m.PlatformsDirectory,
  }))
);
const NotesWorkspace = lazy(() =>
  import("./components/NotesWorkspace").then((m) => ({
    default: m.NotesWorkspace,
  }))
);
const PublishingWorkspace = lazy(() =>
  import("./components/PublishingWorkspace").then((m) => ({
    default: m.PublishingWorkspace,
  }))
);

const FAVORITES_KEY = "smart_workspace_favorites_v1";
const CUSTOM_PLATFORMS_KEY = "smart_workspace_custom_platforms_v1";
const CUSTOM_GROUPS_KEY = "rahal_plus_custom_groups_v1";
const NOTES_KEY = "smart_workspace_notes_v1";
const PUBLISH_DRAFTS_KEY = "smart_workspace_publish_drafts_v1";
const LANGUAGE_KEY = "rahal_plus_lang_v1";
const MEMORIES_KEY = "rahal_plus_memories_v1";
const ASSISTANT_TASKS_KEY = "rahal_plus_tasks_v1";
const SELF_REFLECTIONS_KEY = "rahal_plus_reflections_v1";
const MESSAGES_KEY = "rahal_plus_messages_v1";
const WORK_REPORT_KEY = "rahal_plus_work_report_v1";

const IDLE_PARALLEL_STATE: ParallelPipelineState = {
  phase: "idle",
  steps: [],
};

function loadStoredJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function loadStoredLanguage(): AppLanguage {
  try {
    const raw = window.localStorage.getItem(LANGUAGE_KEY);
    if (isAppLanguage(raw)) return raw;
    return "ar";
  } catch {
    return "ar";
  }
}

function normalizeTitleKey(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export default function App() {
  const [language, setLanguage] = useState<AppLanguage>(() =>
    loadStoredLanguage()
  );
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("chat");

  // Global Google Email Login state (shared across Header, Directory & Publishing)
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [youtubeAccessToken, setYoutubeAccessToken] = useState<string | null>(
    () => getYouTubeAccessToken()
  );
  const [isGoogleLoggingIn, setIsGoogleLoggingIn] = useState(false);
  const [googleAuthError, setGoogleAuthError] = useState<string | null>(null);

  // Directory state
  const [favorites, setFavorites] = useState<string[]>(() =>
    loadStoredJson<string[]>(FAVORITES_KEY, ["gemini", "youtube", "google"])
  );
  const [customPlatforms, setCustomPlatforms] = useState<PlatformEntry[]>(() =>
    loadStoredJson<PlatformEntry[]>(CUSTOM_PLATFORMS_KEY, [])
  );
  const [customGroups, setCustomGroups] = useState<CustomPlatformGroup[]>(() =>
    loadStoredJson<CustomPlatformGroup[]>(CUSTOM_GROUPS_KEY, [])
  );
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Notes state
  const [notes, setNotes] = useState<NoteItem[]>(() =>
    loadStoredJson<NoteItem[]>(NOTES_KEY, [])
  );
  const [isNoteFormOpen, setIsNoteFormOpen] = useState(false);

  // Publishing drafts state
  const [publishDrafts, setPublishDrafts] = useState<PublishDraft[]>(() =>
    loadStoredJson<PublishDraft[]>(PUBLISH_DRAFTS_KEY, [])
  );
  const [isDraftFormOpen, setIsDraftFormOpen] = useState(false);

  // Personal assistant persistent memory, tasks, and self-reflections
  const [memories, setMemories] = useState<MemoryItem[]>(() =>
    loadStoredJson<MemoryItem[]>(MEMORIES_KEY, [])
  );
  const [assistantTasks, setAssistantTasks] = useState<AssistantTask[]>(() =>
    loadStoredJson<AssistantTask[]>(ASSISTANT_TASKS_KEY, [])
  );
  const [selfReflections, setSelfReflections] = useState<SelfReflectionItem[]>(
    () => loadStoredJson<SelfReflectionItem[]>(SELF_REFLECTIONS_KEY, [])
  );
  const [latestWorkReport, setLatestWorkReport] =
    useState<AssistantWorkReport | null>(() =>
      loadStoredJson<AssistantWorkReport | null>(WORK_REPORT_KEY, null)
    );
  const [isReflecting, setIsReflecting] = useState(false);
  const [executingTaskId, setExecutingTaskId] = useState<string | null>(null);

  // Gemini chat state
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    loadStoredJson<ChatMessage[]>(MESSAGES_KEY, [])
  );
  const [mode, setMode] = useState<AssistantMode>("general");
  const [queryStrategy, setQueryStrategy] = useState<QueryStrategy>("single");
  const [parallelState, setParallelState] =
    useState<ParallelPipelineState>(IDLE_PARALLEL_STATE);
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);
  const [modalStateOverride, setModalStateOverride] =
    useState<ParallelPipelineState | null>(null);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // Local device & server folder storage state
  const [localStorageInfo, setLocalStorageInfo] =
    useState<LocalStorageServerInfo | null>(null);
  const [nativeDirHandle, setNativeDirHandle] =
    useState<DirectoryHandleLike | null>(null);
  const [isSyncingDevice, setIsSyncingDevice] = useState(false);
  const [deviceStorageError, setDeviceStorageError] = useState<string | null>(
    null
  );
  const [deviceStorageNotice, setDeviceStorageNotice] = useState<string | null>(
    null
  );

  // Subscribe to Firebase Google authentication state globally
  useEffect(() => {
    const unsubscribe = initYouTubeAuth(({ user, accessToken }) => {
      setGoogleUser(user);
      setYoutubeAccessToken(accessToken);
    });
    return unsubscribe;
  }, []);

  // Load Local Storage Server folder info on mount (and hydrate if connected & browser empty)
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const info = await fetchLocalStorageInfo();
        if (!active) return;
        setLocalStorageInfo(info);

        if (info.connected && info.hasSavedState) {
          const hasBrowserData =
            memories.length > 0 ||
            assistantTasks.length > 0 ||
            notes.length > 0 ||
            publishDrafts.length > 0 ||
            messages.length > 0;
          if (!hasBrowserData) {
            const loaded = await loadSnapshotFromLocalServer();
            if (!active || !loaded.exists || !loaded.snapshot) return;
            applySnapshotToState(loaded.snapshot);
          }
        }
      } catch {
        // Non-fatal if offline
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync HTML lang/dir attributes and persist language choice
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = getLanguageDir(language);
    try {
      window.localStorage.setItem(LANGUAGE_KEY, language);
    } catch {
      // Ignore storage errors
    }
  }, [language]);

  useEffect(() => {
    try {
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch {
      // Ignore storage errors
    }
  }, [favorites]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        CUSTOM_PLATFORMS_KEY,
        JSON.stringify(customPlatforms)
      );
    } catch {
      // Ignore storage errors
    }
  }, [customPlatforms]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        CUSTOM_GROUPS_KEY,
        JSON.stringify(customGroups)
      );
    } catch {
      // Ignore storage errors
    }
  }, [customGroups]);

  useEffect(() => {
    try {
      window.localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    } catch {
      // Ignore storage errors
    }
  }, [notes]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        PUBLISH_DRAFTS_KEY,
        JSON.stringify(publishDrafts)
      );
    } catch {
      // Ignore storage errors
    }
  }, [publishDrafts]);

  useEffect(() => {
    try {
      window.localStorage.setItem(MEMORIES_KEY, JSON.stringify(memories));
    } catch {
      // Ignore storage errors
    }
  }, [memories]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        ASSISTANT_TASKS_KEY,
        JSON.stringify(assistantTasks)
      );
    } catch {
      // Ignore storage errors
    }
  }, [assistantTasks]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        SELF_REFLECTIONS_KEY,
        JSON.stringify(selfReflections)
      );
    } catch {
      // Ignore storage errors
    }
  }, [selfReflections]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        MESSAGES_KEY,
        JSON.stringify(messages.slice(-40))
      );
    } catch {
      // Ignore storage errors
    }
  }, [messages]);

  useEffect(() => {
    try {
      if (latestWorkReport) {
        window.localStorage.setItem(
          WORK_REPORT_KEY,
          JSON.stringify(latestWorkReport)
        );
      } else {
        window.localStorage.removeItem(WORK_REPORT_KEY);
      }
    } catch {
      // Ignore storage errors
    }
  }, [latestWorkReport]);

  const allPlatforms = useMemo(
    () => [...customPlatforms, ...INITIAL_PLATFORMS],
    [customPlatforms]
  );

  const memoryContext = useMemo(() => {
    const base = buildMemoryPromptContext({
      memories,
      tasks: assistantTasks,
      reflections: selfReflections,
      draftsCount: publishDrafts.length,
      notesCount: notes.length,
    });
    if (googleUser?.email) {
      return `${base}\nActive signed-in Google account email: ${googleUser.email}`;
    }
    return base;
  }, [
    memories,
    assistantTasks,
    selfReflections,
    publishDrafts.length,
    notes.length,
    googleUser?.email,
  ]);

  const currentSnapshotPayload = useMemo(
    () =>
      buildWorkspaceSnapshotPayload({
        activeEmail: googleUser?.email ?? null,
        language,
        memories,
        assistantTasks,
        selfReflections,
        latestWorkReport,
        notes,
        publishDrafts,
        customPlatforms,
        customGroups,
        favorites,
        messages,
      }),
    [
      googleUser?.email,
      language,
      memories,
      assistantTasks,
      selfReflections,
      latestWorkReport,
      notes,
      publishDrafts,
      customPlatforms,
      customGroups,
      favorites,
      messages,
    ]
  );

  function applySnapshotToState(snapshot: WorkspaceSnapshotPayload) {
    if (Array.isArray(snapshot.memories)) setMemories(snapshot.memories);
    if (Array.isArray(snapshot.assistantTasks))
      setAssistantTasks(snapshot.assistantTasks);
    if (Array.isArray(snapshot.selfReflections))
      setSelfReflections(snapshot.selfReflections);
    if (snapshot.latestWorkReport !== undefined)
      setLatestWorkReport(snapshot.latestWorkReport);
    if (Array.isArray(snapshot.notes)) setNotes(snapshot.notes);
    if (Array.isArray(snapshot.publishDrafts))
      setPublishDrafts(snapshot.publishDrafts);
    if (Array.isArray(snapshot.customPlatforms))
      setCustomPlatforms(snapshot.customPlatforms);
    if (Array.isArray(snapshot.customGroups))
      setCustomGroups(snapshot.customGroups);
    if (Array.isArray(snapshot.favorites)) setFavorites(snapshot.favorites);
    if (Array.isArray(snapshot.messages)) setMessages(snapshot.messages);
  }

  // Auto-sync workspace state to connected local server folder & native PC folder
  useEffect(() => {
    if (!localStorageInfo?.connected && !nativeDirHandle) return;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          if (localStorageInfo?.connected) {
            const res = await syncSnapshotToLocalServer(
              currentSnapshotPayload,
              false
            );
            setLocalStorageInfo((prev) =>
              prev
                ? {
                    ...prev,
                    connected: true,
                    dirExists: true,
                    hasSavedState: true,
                    storageDir: res.storageDir,
                    lastSyncedAt: res.savedAt,
                    files: res.files,
                  }
                : prev
            );
          }
          if (nativeDirHandle) {
            await writeSnapshotToNativeDirectory(
              nativeDirHandle,
              currentSnapshotPayload
            );
          }
        } catch {
          // Silent background sync retry on next change
        }
      })();
    }, 700);
    return () => window.clearTimeout(timer);
  }, [currentSnapshotPayload, localStorageInfo?.connected, nativeDirHandle]);

  async function handleConfigureAndConnectDevice(params: {
    folderPath?: string;
    presetId?: string;
    migrateExisting?: boolean;
  }) {
    setIsSyncingDevice(true);
    setDeviceStorageError(null);
    setDeviceStorageNotice(null);
    try {
      const updatedInfo = await configureLocalStorageFolder({
        ...params,
        connected: true,
      });
      const synced = await syncSnapshotToLocalServer(
        currentSnapshotPayload,
        true
      );
      setLocalStorageInfo({
        ...updatedInfo,
        connected: true,
        dirExists: true,
        hasSavedState: true,
        storageDir: synced.storageDir,
        lastSyncedAt: synced.savedAt,
        files: synced.files,
      });
      setDeviceStorageNotice(
        language === "en"
          ? `Connected & saved all files inside: ${synced.storageDir}`
          : language === "ru"
          ? `Папка создана и все данные сохранены: ${synced.storageDir}`
          : `تم إنشاء الفولدر وتشغيل السيرفر وحفظ كل البيانات في: ${synced.storageDir}`
      );
    } catch (err) {
      setDeviceStorageError(
        err instanceof Error
          ? err.message
          : language === "en"
          ? "Could not connect local storage folder."
          : language === "ru"
          ? "Не удалось подключить папку хранения."
          : "تعذر إنشاء أو ربط فولدر التخزين."
      );
    } finally {
      setIsSyncingDevice(false);
    }
  }

  async function handleDisconnectDevice() {
    setIsSyncingDevice(true);
    setDeviceStorageError(null);
    setDeviceStorageNotice(null);
    try {
      const info = await disconnectLocalStorageServer();
      setLocalStorageInfo(info);
      setNativeDirHandle(null);
    } catch (err) {
      setDeviceStorageError(
        err instanceof Error ? err.message : "Failed to disconnect"
      );
    } finally {
      setIsSyncingDevice(false);
    }
  }

  async function handleSyncDeviceNow(createBackup: boolean) {
    setIsSyncingDevice(true);
    setDeviceStorageError(null);
    setDeviceStorageNotice(null);
    try {
      const synced = await syncSnapshotToLocalServer(
        currentSnapshotPayload,
        createBackup
      );
      if (nativeDirHandle) {
        await writeSnapshotToNativeDirectory(
          nativeDirHandle,
          currentSnapshotPayload
        );
      }
      setLocalStorageInfo((prev) =>
        prev
          ? {
              ...prev,
              connected: true,
              dirExists: true,
              hasSavedState: true,
              storageDir: synced.storageDir,
              lastSyncedAt: synced.savedAt,
              files: synced.files,
            }
          : prev
      );
      setDeviceStorageNotice(
        language === "en"
          ? `Synced ${synced.files.length} files to ${synced.storageDir}`
          : language === "ru"
          ? `Синхронизировано файлов (${synced.files.length}) в ${synced.storageDir}`
          : `تم حفظ ومزامنة ${synced.files.length} ملفات داخل ${synced.storageDir}`
      );
    } catch (err) {
      setDeviceStorageError(
        err instanceof Error ? err.message : "Failed syncing files"
      );
    } finally {
      setIsSyncingDevice(false);
    }
  }

  async function handleRestoreFromDevice() {
    setIsSyncingDevice(true);
    setDeviceStorageError(null);
    setDeviceStorageNotice(null);
    try {
      const loaded = await loadSnapshotFromLocalServer();
      if (!loaded.exists || !loaded.snapshot) {
        setDeviceStorageError(
          language === "en"
            ? "No saved workspace state file found inside this folder yet."
            : language === "ru"
            ? "В этой папке ещё нет сохранённого файла состояния."
            : "لا يوجد ملف بيانات محفوظ داخل هذا الفولدر بعد."
        );
        return;
      }
      applySnapshotToState(loaded.snapshot);
      setDeviceStorageNotice(
        language === "en"
          ? `Restored workspace data from ${loaded.storageDir}`
          : language === "ru"
          ? `Данные восстановлены из ${loaded.storageDir}`
          : `تم استرجاع كل الذاكرة والبيانات من: ${loaded.storageDir}`
      );
    } catch (err) {
      setDeviceStorageError(
        err instanceof Error ? err.message : "Failed restoring from folder"
      );
    } finally {
      setIsSyncingDevice(false);
    }
  }

  async function handlePickNativeFolder() {
    setDeviceStorageError(null);
    setDeviceStorageNotice(null);
    if (!isNativeDirectoryPickerSupported()) {
      setDeviceStorageError(
        language === "en"
          ? "Direct browser folder picker is unavailable in this browser. Use the Local Folder Server presets or custom path above."
          : language === "ru"
          ? "Прямой выбор папки в браузере недоступен. Используйте выбор пути локального сервера выше."
          : "منتقي مجلدات المتصفح المباشر غير متاح هنا. استخدم اختيار مسار الفولدر على السيرفر المحلي بالأعلى."
      );
      return;
    }

    setIsSyncingDevice(true);
    try {
      const handle = await pickNativeComputerDirectory();
      const written = await writeSnapshotToNativeDirectory(
        handle,
        currentSnapshotPayload
      );
      setNativeDirHandle(handle);
      setDeviceStorageNotice(
        language === "en"
          ? `Linked PC folder "${handle.name}" and wrote ${written.length} files.`
          : language === "ru"
          ? `Папка ПК "${handle.name}" подключена, записано файлов: ${written.length}.`
          : `تم ربط فولدر جهازك "${handle.name}" وكتابة ${written.length} ملفات مباشرة.`
      );
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      setDeviceStorageError(
        language === "en"
          ? "Browser blocked direct PC folder access inside this embedded frame. Use the Local Server Folder option above or open in a standalone browser window."
          : language === "ru"
          ? "Встроенное окно ограничивает прямой доступ к диску. Используйте локальный сервер папки выше или откройте приложение в отдельном окне."
          : "المتصفح يقيد فتح الفولدر مباشرة داخل نافذة المعاينة المدمجة — استخدم اختيار فولدر السيرفر المحلي بالأعلى وسيحفظ مباشرة على الجهاز."
      );
    } finally {
      setIsSyncingDevice(false);
    }
  }

  function handleDownloadBackup() {
    downloadSnapshotJsonFile(currentSnapshotPayload);
  }

  async function handleImportBackupSnapshot(snapshot: WorkspaceSnapshotPayload) {
    applySnapshotToState(snapshot);
    setDeviceStorageError(null);
    if (localStorageInfo?.connected) {
      await syncSnapshotToLocalServer(snapshot, true).catch(() => undefined);
    }
    setDeviceStorageNotice(
      language === "en"
        ? "Imported workspace backup successfully."
        : language === "ru"
        ? "Резервная копия успешно импортирована."
        : "تم استيراد نسخة البيانات والذاكرة بنجاح."
    );
  }

  async function handleGoogleLogin() {
    if (isGoogleLoggingIn) return;
    setIsGoogleLoggingIn(true);
    setGoogleAuthError(null);
    try {
      const { user, accessToken } = await signInWithYouTube(googleUser?.email);
      setGoogleUser(user);
      setYoutubeAccessToken(accessToken);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : language === "en"
          ? "Google sign-in could not be completed."
          : language === "ru"
          ? "Не удалось выполнить вход через Google."
          : "تعذر إتمام تسجيل الدخول بحساب جوجل.";
      setGoogleAuthError(msg);
    } finally {
      setIsGoogleLoggingIn(false);
    }
  }

  async function handleGoogleLogout() {
    setGoogleAuthError(null);
    await signOutYouTube();
    setGoogleUser(null);
    setYoutubeAccessToken(null);
  }

  function handleYoutubeSessionExpired() {
    clearYouTubeAccessToken();
    setYoutubeAccessToken(null);
  }

  function handlePrimaryAction() {
    if (activeTab === "directory") {
      setIsAddModalOpen(true);
    } else if (activeTab === "notes") {
      setIsNoteFormOpen(true);
    } else if (activeTab === "publishing") {
      setIsDraftFormOpen(true);
    } else {
      setMessages([]);
      setChatError(null);
      setParallelState(IDLE_PARALLEL_STATE);
      setIsComparisonModalOpen(false);
      setModalStateOverride(null);
      setDraft("");
    }
  }

  function handleToggleFavorite(id: string) {
    setFavorites((prev) => toggleFavoriteId(prev, id));
  }

  function handleAddCustomPlatform(input: CustomPlatformInput) {
    const newItem = createCustomPlatform(input);
    setCustomPlatforms((prev) => [newItem, ...prev]);
  }

  function handleDeleteCustomPlatform(id: string) {
    setCustomPlatforms((prev) => prev.filter((item) => item.id !== id));
    setFavorites((prev) => prev.filter((favId) => favId !== id));
  }

  function handleAddCustomGroup(group: CustomPlatformGroup) {
    setCustomGroups((prev) => [group, ...prev]);
  }

  function handleDeleteCustomGroup(id: string) {
    setCustomGroups((prev) => prev.filter((g) => g.id !== id));
  }

  function handleAddNote(title: string, content: string, source?: string) {
    const note = createNoteItem({ title, content, source });
    setNotes((prev) => [note, ...prev]);
  }

  function handleDeleteNote(id: string) {
    setNotes((prev) => prev.filter((item) => item.id !== id));
  }

  function handleSendNoteToGemini(content: string) {
    setDraft(content);
    setActiveTab("chat");
  }

  function handleAddPublishDraft(input: PublishDraftInput) {
    const draftItem = createPublishDraft(input);
    setPublishDrafts((prev) => [draftItem, ...prev]);
  }

  function handleUpdatePublishDraftStatus(
    id: string,
    status: DraftStatus,
    publishedUrl?: string
  ) {
    setPublishDrafts((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status, ...(publishedUrl ? { publishedUrl } : {}) }
          : item
      )
    );
  }

  function handleDeletePublishDraft(id: string) {
    setPublishDrafts((prev) => prev.filter((item) => item.id !== id));
  }

  function handleAddMemory(category: MemoryCategory, summary: string) {
    setMemories((prev) => mergeMemories(prev, [{ category, summary }]));
  }

  function handleDeleteMemory(id: string) {
    setMemories((prev) => prev.filter((m) => m.id !== id));
  }

  function handleAddAssistantTask(input: {
    title: string;
    details: string;
    kind: AssistantTaskKind;
  }) {
    const task = createAssistantTask(input);
    setAssistantTasks((prev) => [task, ...prev]);
  }

  function handleToggleAssistantTaskStatus(
    id: string,
    nextStatus: AssistantTaskStatus
  ) {
    setAssistantTasks((prev) => updateAssistantTaskStatus(prev, id, nextStatus));
  }

  function handleDeleteAssistantTask(id: string) {
    setAssistantTasks((prev) => prev.filter((t) => t.id !== id));
  }

  function handleDeleteReflection(id: string) {
    setSelfReflections((prev) => prev.filter((r) => r.id !== id));
  }

  async function runAssistantReflection(
    conversationTurns: Array<{ role: "user" | "model"; text: string }>
  ) {
    if (conversationTurns.length === 0 || isReflecting) return;
    setIsReflecting(true);

    try {
      const response = await fetch("/api/assistant/reflect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language,
          conversation: conversationTurns.slice(-10),
          existingMemories: memories.slice(0, 12),
          existingTasks: assistantTasks.slice(0, 10),
          selfReflections: selfReflections.slice(0, 6),
        }),
      });

      if (!response.ok) return;

      const data = (await response.json()) as {
        memoryComparison?: string;
        completedReport?: string;
        newMemories?: Array<{ category: MemoryCategory; summary: string }>;
        newTasks?: Array<{
          title: string;
          details: string;
          kind: AssistantTaskKind;
          autoExecuteNow: boolean;
        }>;
        deliverableDraft?: {
          title: string;
          caption: string;
          targets: SocialPlatformId[];
        } | null;
        deliverableNote?: {
          title: string;
          content: string;
        } | null;
        selfReflection?: {
          insight: string;
          neededCapability: string;
        } | null;
      };

      const addedMemories = Array.isArray(data.newMemories)
        ? data.newMemories
        : [];
      if (addedMemories.length > 0) {
        setMemories((prev) => mergeMemories(prev, addedMemories));
      }

      const artifactsCreated: Array<{ type: "draft" | "note"; title: string }> =
        [];

      if (data.deliverableDraft?.title && data.deliverableDraft?.caption) {
        const draftKey = normalizeTitleKey(data.deliverableDraft.title);
        const alreadyExists = publishDrafts.some(
          (d) => normalizeTitleKey(d.title) === draftKey
        );
        if (!alreadyExists) {
          const createdDraft = createPublishDraft({
            title: data.deliverableDraft.title,
            caption: data.deliverableDraft.caption,
            targets: data.deliverableDraft.targets,
            status: "draft",
          });
          setPublishDrafts((prev) => [createdDraft, ...prev]);
          artifactsCreated.push({
            type: "draft",
            title: createdDraft.title,
          });
        }
      }

      if (data.deliverableNote?.title && data.deliverableNote?.content) {
        const noteKey = normalizeTitleKey(data.deliverableNote.title);
        const alreadyExists = notes.some(
          (n) => normalizeTitleKey(n.title) === noteKey
        );
        if (!alreadyExists) {
          const createdNote = createNoteItem({
            title: data.deliverableNote.title,
            content: data.deliverableNote.content,
            source: "Rahal Plus",
          });
          setNotes((prev) => [createdNote, ...prev]);
          artifactsCreated.push({
            type: "note",
            title: createdNote.title,
          });
        }
      }

      const incomingTasks = Array.isArray(data.newTasks) ? data.newTasks : [];
      let createdTasksCount = 0;
      if (incomingTasks.length > 0) {
        const existingTitleKeys = new Set(
          assistantTasks.map((t) => normalizeTitleKey(t.title))
        );
        const toPrepend: AssistantTask[] = [];

        for (const item of incomingTasks) {
          const cleanTitle = item.title?.trim();
          if (!cleanTitle) continue;
          const titleKey = normalizeTitleKey(cleanTitle);
          if (existingTitleKeys.has(titleKey)) continue;
          existingTitleKeys.add(titleKey);

          const linkedArtifact =
            item.kind === "draft_post"
              ? artifactsCreated.find((a) => a.type === "draft")
              : item.kind === "save_note"
              ? artifactsCreated.find((a) => a.type === "note")
              : artifactsCreated[0];

          const isDoneNow = Boolean(
            item.autoExecuteNow && (linkedArtifact || data.completedReport)
          );

          toPrepend.push(
            createAssistantTask({
              title: cleanTitle,
              details: item.details ?? "",
              kind: item.kind ?? "research",
              status: isDoneNow ? "done" : "pending",
              ...(isDoneNow && data.completedReport
                ? { resultSummary: data.completedReport }
                : {}),
              ...(isDoneNow && linkedArtifact
                ? {
                    linkedArtifactType: linkedArtifact.type,
                    linkedArtifactTitle: linkedArtifact.title,
                  }
                : {}),
            })
          );
        }

        if (toPrepend.length > 0) {
          createdTasksCount = toPrepend.length;
          setAssistantTasks((prev) => [...toPrepend, ...prev]);
        }
      }

      if (data.selfReflection?.insight) {
        const insightKey = normalizeTitleKey(data.selfReflection.insight);
        const dup = selfReflections.some(
          (r) => normalizeTitleKey(r.insight) === insightKey
        );
        if (!dup) {
          const nextReflection: SelfReflectionItem = {
            id: `ref-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            insight: data.selfReflection.insight,
            neededCapability: data.selfReflection.neededCapability,
            createdAt: Date.now(),
          };
          setSelfReflections((prev) => [nextReflection, ...prev].slice(0, 20));
        }
      }

      if (
        data.memoryComparison ||
        data.completedReport ||
        artifactsCreated.length > 0 ||
        createdTasksCount > 0 ||
        addedMemories.length > 0
      ) {
        setLatestWorkReport({
          id: `rep-${Date.now()}`,
          memoryComparison: data.memoryComparison ?? "",
          completedReport: data.completedReport ?? "",
          createdTasksCount,
          addedMemoriesCount: addedMemories.length,
          artifactsCreated,
          ...(data.selfReflection ? { selfReflection: data.selfReflection } : {}),
          createdAt: Date.now(),
        });
      }
    } catch {
      // Non-fatal reflection error
    } finally {
      setIsReflecting(false);
    }
  }

  async function handleExecuteAssistantTask(task: AssistantTask) {
    if (executingTaskId) return;
    setExecutingTaskId(task.id);
    setAssistantTasks((prev) =>
      updateAssistantTaskStatus(prev, task.id, "in_progress")
    );

    try {
      const response = await fetch("/api/assistant/execute-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language,
          task: {
            title: task.title,
            details: task.details,
            kind: task.kind,
          },
          memoryContext,
        }),
      });

      const data = (await response.json()) as {
        resultSummary?: string;
        deliverableDraft?: {
          title: string;
          caption: string;
          targets: SocialPlatformId[];
        } | null;
        deliverableNote?: {
          title: string;
          content: string;
        } | null;
        error?: string;
      };

      if (!response.ok || !data.resultSummary) {
        setAssistantTasks((prev) =>
          updateAssistantTaskStatus(prev, task.id, "pending")
        );
        return;
      }

      let linkedArtifactType: "draft" | "note" | undefined;
      let linkedArtifactTitle: string | undefined;

      if (data.deliverableDraft?.title && data.deliverableDraft?.caption) {
        const draftKey = normalizeTitleKey(data.deliverableDraft.title);
        const existing = publishDrafts.find(
          (d) => normalizeTitleKey(d.title) === draftKey
        );
        if (!existing) {
          const newDraft = createPublishDraft({
            title: data.deliverableDraft.title,
            caption: data.deliverableDraft.caption,
            targets: data.deliverableDraft.targets,
            status: "draft",
          });
          setPublishDrafts((prev) => [newDraft, ...prev]);
          linkedArtifactType = "draft";
          linkedArtifactTitle = newDraft.title;
        } else {
          linkedArtifactType = "draft";
          linkedArtifactTitle = existing.title;
        }
      }

      if (data.deliverableNote?.title && data.deliverableNote?.content) {
        const noteKey = normalizeTitleKey(data.deliverableNote.title);
        const existing = notes.find(
          (n) => normalizeTitleKey(n.title) === noteKey
        );
        if (!existing) {
          const newNote = createNoteItem({
            title: data.deliverableNote.title,
            content: data.deliverableNote.content,
            source: "Rahal Plus",
          });
          setNotes((prev) => [newNote, ...prev]);
          if (!linkedArtifactType) {
            linkedArtifactType = "note";
            linkedArtifactTitle = newNote.title;
          }
        } else if (!linkedArtifactType) {
          linkedArtifactType = "note";
          linkedArtifactTitle = existing.title;
        }
      }

      setAssistantTasks((prev) =>
        updateAssistantTaskStatus(prev, task.id, "done", {
          resultSummary: data.resultSummary,
          linkedArtifactType,
          linkedArtifactTitle,
        })
      );
    } catch {
      setAssistantTasks((prev) =>
        updateAssistantTaskStatus(prev, task.id, "pending")
      );
    } finally {
      setExecutingTaskId(null);
    }
  }

  async function runParallelQuery(
    nextMessages: ChatMessage[]
  ): Promise<ChatMessage[] | null> {
    let latestState = createInitialParallelState([
      { id: "hydrogen", label: "Gemini 4 Hydrogen", modelId: "gemini-4-hydrogen" },
      {
        id: "flash-lite",
        label: "Gemini 3.1 Flash Lite",
        modelId: "gemini-3.1-flash-lite",
      },
    ]);
    setParallelState(latestState);
    setModalStateOverride(null);
    setIsComparisonModalOpen(true);

    const response = await fetch("/api/gemini/parallel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        language,
        memoryContext,
        messages: nextMessages.map((m) => ({ role: m.role, text: m.text })),
      }),
    });

    if (!response.ok || !response.body) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      const msg =
        data.error ??
        (language === "en"
          ? "Could not reach Gemini service. Please try again."
          : language === "ru"
          ? "Не удалось получить ответ от сервиса Gemini. Попробуйте снова."
          : "تعذر الحصول على رد من خدمة Gemini. حاول مرة أخرى.");
      latestState = applyParallelEvent(latestState, { type: "error", error: msg });
      setParallelState(latestState);
      setChatError(msg);
      return null;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finalMessages: ChatMessage[] | null = null;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";

      for (const frame of frames) {
        const line = frame
          .split("\n")
          .find((l) => l.startsWith("data: "));
        if (!line) continue;

        const raw = line.slice(6).trim();
        if (!raw) continue;

        const event = JSON.parse(raw) as ParallelStreamEvent & {
          reply?: string;
          candidates?: ModelCandidateAnswer[];
        };

        latestState = applyParallelEvent(latestState, event);
        setParallelState(latestState);

        if (event.type === "done" && event.reply) {
          const modelMsg: ChatMessage = {
            id: `model-${Date.now()}`,
            role: "model",
            text: event.reply,
            winnerLabel: event.winnerLabel,
            candidates: event.candidates,
            parallelState: latestState,
          };
          finalMessages = [...nextMessages, modelMsg];
          setMessages(finalMessages);
        } else if (event.type === "error") {
          setChatError(event.error);
        }
      }
    }

    return finalMessages;
  }

  async function handleSendMessage(overrideText?: string) {
    const text = (overrideText ?? draft).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text,
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    if (!overrideText) {
      setDraft("");
    }
    setChatError(null);
    setIsLoading(true);

    let updatedMessages: ChatMessage[] | null = null;

    try {
      if (queryStrategy === "parallel") {
        updatedMessages = await runParallelQuery(nextMessages);
      } else {
        setParallelState(IDLE_PARALLEL_STATE);
        const response = await fetch("/api/gemini/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode,
            language,
            memoryContext,
            messages: nextMessages.map((m) => ({ role: m.role, text: m.text })),
          }),
        });

        const data = (await response.json()) as {
          reply?: string;
          error?: string;
        };
        if (!response.ok || !data.reply) {
          setChatError(
            data.error ??
              (language === "en"
                ? "Could not reach Gemini service. Please try again."
                : language === "ru"
                ? "Не удалось получить ответ от сервиса Gemini. Попробуйте снова."
                : "تعذر الحصول على رد من خدمة Gemini. حاول مرة أخرى.")
          );
          return;
        }

        const modelMsg: ChatMessage = {
          id: `model-${Date.now()}`,
          role: "model",
          text: data.reply,
        };
        updatedMessages = [...nextMessages, modelMsg];
        setMessages(updatedMessages);
      }
    } catch {
      setChatError(
        language === "en"
          ? "Network error while contacting the server. Check your connection and try again."
          : language === "ru"
          ? "Ошибка сети при обращении к серверу. Проверьте подключение и попробуйте снова."
          : "تعذر الاتصال بالخادم. تأكد من اتصالك بالإنترنت وحاول مرة أخرى."
      );
    } finally {
      setIsLoading(false);
    }

    if (updatedMessages && updatedMessages.length >= 2) {
      void runAssistantReflection(
        updatedMessages.map((m) => ({ role: m.role, text: m.text }))
      );
    }
  }

  function handleReflectVoiceTranscript(transcripts: LiveTranscriptItem[]) {
    const turns = transcripts
      .filter((item) => item.text.trim().length > 0)
      .map((item) => ({ role: item.role, text: item.text.trim() }));
    if (turns.length === 0) return;
    void runAssistantReflection(turns);
  }

  const footerText = UI_TEXT[language].footer;

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F8FC] text-slate-900">
      <Header
        language={language}
        onChangeLanguage={setLanguage}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onPrimaryAction={handlePrimaryAction}
        draftsCount={publishDrafts.length}
        notesCount={notes.length}
        platformsCount={allPlatforms.length}
        googleUser={googleUser}
        isGoogleLoggingIn={isGoogleLoggingIn}
        onGoogleLogin={() => void handleGoogleLogin()}
        onGoogleLogout={() => void handleGoogleLogout()}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-5 sm:py-7">
        <Suspense
          fallback={
            <div
              aria-hidden="true"
              className="mb-6 rounded-2xl bg-[#0B1120] border border-slate-800/80 min-h-[220px] sm:min-h-[248px]"
            />
          }
        >
          <Spatial3DBanner
            language={language}
            activeEmail={googleUser?.email ?? null}
            platformsCount={allPlatforms.length}
            draftsCount={publishDrafts.length}
            notesCount={notes.length}
            onJumpToDirectory={() => setActiveTab("directory")}
            onJumpToPublishing={() => setActiveTab("publishing")}
          />
        </Suspense>

        <div key={activeTab} className="workspace-panel-enter">
          {activeTab === "chat" && (
            <GeminiWorkspace
              language={language}
              messages={messages}
              mode={mode}
              queryStrategy={queryStrategy}
              parallelState={parallelState}
              isComparisonModalOpen={isComparisonModalOpen}
              comparisonModalState={modalStateOverride ?? parallelState}
              draft={draft}
              isLoading={isLoading}
              error={chatError}
              memoryContext={memoryContext}
              memories={memories}
              assistantTasks={assistantTasks}
              selfReflections={selfReflections}
              latestWorkReport={latestWorkReport}
              isReflecting={isReflecting}
              executingTaskId={executingTaskId}
              onChangeMode={setMode}
              onChangeStrategy={(s) => {
                setQueryStrategy(s);
                if (s === "single") {
                  setParallelState(IDLE_PARALLEL_STATE);
                  setIsComparisonModalOpen(false);
                  setModalStateOverride(null);
                }
              }}
              onChangeDraft={setDraft}
              onSendMessage={handleSendMessage}
              onSaveToNotes={(title, content) =>
                handleAddNote(title, content, "Rahal Plus")
              }
              onOpenComparisonModal={(state) => {
                setModalStateOverride(state);
                setIsComparisonModalOpen(true);
              }}
              onCloseComparisonModal={() => {
                setIsComparisonModalOpen(false);
                setModalStateOverride(null);
              }}
              onAddMemory={handleAddMemory}
              onDeleteMemory={handleDeleteMemory}
              onAddAssistantTask={handleAddAssistantTask}
              onExecuteAssistantTask={handleExecuteAssistantTask}
              onToggleAssistantTaskStatus={handleToggleAssistantTaskStatus}
              onDeleteAssistantTask={handleDeleteAssistantTask}
              onDeleteReflection={handleDeleteReflection}
              onReflectConversation={() =>
                void runAssistantReflection(
                  messages.map((m) => ({ role: m.role, text: m.text }))
                )
              }
              onReflectVoiceTranscript={handleReflectVoiceTranscript}
              onDismissWorkReport={() => setLatestWorkReport(null)}
              onOpenPublishingTab={() => setActiveTab("publishing")}
              onOpenNotesTab={() => setActiveTab("notes")}
              localStorageInfo={localStorageInfo}
              nativeDirHandle={nativeDirHandle}
              isSyncingDevice={isSyncingDevice}
              deviceStorageError={deviceStorageError}
              deviceStorageNotice={deviceStorageNotice}
              onConfigureAndConnectDevice={handleConfigureAndConnectDevice}
              onDisconnectDevice={handleDisconnectDevice}
              onSyncDeviceNow={handleSyncDeviceNow}
              onRestoreFromDevice={handleRestoreFromDevice}
              onPickNativeFolder={handlePickNativeFolder}
              onDownloadBackup={handleDownloadBackup}
              onImportBackupSnapshot={handleImportBackupSnapshot}
            />
          )}

          {activeTab === "publishing" && (
            <Suspense
              fallback={
                <div
                  aria-busy="true"
                  className="rounded-xl border border-slate-200 bg-white p-8 min-h-[360px]"
                />
              }
            >
              <PublishingWorkspace
                language={language}
                memoryContext={memoryContext}
                googleUser={googleUser}
                youtubeAccessToken={youtubeAccessToken}
                isGoogleLoggingIn={isGoogleLoggingIn}
                googleAuthError={googleAuthError}
                onGoogleLogin={handleGoogleLogin}
                onGoogleLogout={handleGoogleLogout}
                onYoutubeSessionExpired={handleYoutubeSessionExpired}
                drafts={publishDrafts}
                isDraftFormOpen={isDraftFormOpen}
                onToggleDraftForm={setIsDraftFormOpen}
                onAddDraft={handleAddPublishDraft}
                onUpdateDraftStatus={handleUpdatePublishDraftStatus}
                onDeleteDraft={handleDeletePublishDraft}
                onSendToGemini={handleSendNoteToGemini}
              />
            </Suspense>
          )}

          {activeTab === "directory" && (
            <Suspense
              fallback={
                <div
                  aria-busy="true"
                  className="rounded-xl border border-slate-200 bg-white p-8 min-h-[360px]"
                />
              }
            >
              <PlatformsDirectory
                language={language}
                memoryContext={memoryContext}
                googleAccountEmail={googleUser?.email ?? null}
                platforms={allPlatforms}
                favorites={favorites}
                customGroups={customGroups}
                isAddModalOpen={isAddModalOpen}
                onCloseAddModal={() => setIsAddModalOpen(false)}
                onToggleFavorite={handleToggleFavorite}
                onAddCustomPlatform={handleAddCustomPlatform}
                onDeleteCustomPlatform={handleDeleteCustomPlatform}
                onAddCustomGroup={handleAddCustomGroup}
                onDeleteCustomGroup={handleDeleteCustomGroup}
                onPushDraftToPublishing={handleAddPublishDraft}
                onSaveToNotes={(title, content) =>
                  handleAddNote(title, content, "Platforms Directory")
                }
                onSendToGemini={handleSendNoteToGemini}
              />
            </Suspense>
          )}

          {activeTab === "notes" && (
            <Suspense
              fallback={
                <div
                  aria-busy="true"
                  className="rounded-xl border border-slate-200 bg-white p-8 min-h-[360px]"
                />
              }
            >
              <NotesWorkspace
                language={language}
                memoryContext={memoryContext}
                notes={notes}
                isFormOpen={isNoteFormOpen}
                onToggleForm={setIsNoteFormOpen}
                onAddNote={(title, content, source) =>
                  handleAddNote(title, content, source)
                }
                onDeleteNote={handleDeleteNote}
                onSendToGemini={handleSendNoteToGemini}
              />
            </Suspense>
          )}
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>{footerText.brandLine}</span>
          <span>{footerText.externalNote}</span>
        </div>
      </footer>
    </div>
  );
}
