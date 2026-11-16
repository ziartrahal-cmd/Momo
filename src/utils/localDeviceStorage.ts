import type { PlatformEntry } from "../data/platforms";
import type {
  AssistantTask,
  AssistantWorkReport,
  MemoryItem,
  SelfReflectionItem,
} from "./assistantMemory";
import type { AppLanguage } from "./i18n";
import type { NoteItem } from "./notes";
import type { CustomPlatformGroup } from "./platformBundles";
import type { PublishDraft } from "./publishing";

export interface StoredChatTurn {
  id: string;
  role: "user" | "model";
  text: string;
  winnerLabel?: string;
}

export interface WorkspaceSnapshotPayload {
  version: 1;
  savedAt: string;
  activeEmail: string | null;
  language: AppLanguage;
  memories: MemoryItem[];
  assistantTasks: AssistantTask[];
  selfReflections: SelfReflectionItem[];
  latestWorkReport: AssistantWorkReport | null;
  notes: NoteItem[];
  publishDrafts: PublishDraft[];
  customPlatforms: PlatformEntry[];
  customGroups: CustomPlatformGroup[];
  favorites: string[];
  messages: StoredChatTurn[];
}

export interface StorageFileEntry {
  name: string;
  sizeBytes: number;
  updatedAt: string;
}

export interface StoragePresetOption {
  id: string;
  label: string;
  path: string;
}

export interface LocalStorageServerInfo {
  connected: boolean;
  storageDir: string;
  dirExists: boolean;
  presets: StoragePresetOption[];
  files: StorageFileEntry[];
  hasSavedState: boolean;
  lastSyncedAt: string | null;
}

const PATH_ERRORS: Record<
  AppLanguage,
  {
    empty: string;
    tooLong: string;
    invalidChars: string;
    unsafeRoot: string;
  }
> = {
  ar: {
    empty: "يرجى إدخال مسار الفولدر على الجهاز.",
    tooLong: "مسار الفولدر طويل جداً (الحد الأقصى 240 حرفاً).",
    invalidChars: "المسار يحتوي على رموز غير صالحة.",
    unsafeRoot: "يرجى اختيار مجلد مخصص وليس مسار النظام الرئيسي مباشرة.",
  },
  en: {
    empty: "Please enter a storage folder path.",
    tooLong: "Folder path is too long (maximum 240 characters).",
    invalidChars: "Folder path contains invalid characters.",
    unsafeRoot: "Please pick a dedicated folder rather than a root or OS system directory.",
  },
  ru: {
    empty: "Укажите путь к папке на компьютере.",
    tooLong: "Путь слишком длинный (максимум 240 символов).",
    invalidChars: "Путь содержит недопустимые символы.",
    unsafeRoot: "Выберите отдельную папку, а не корневой или системный каталог.",
  },
};

const BLOCKED_EXACT_PATHS = new Set([
  "/",
  "\\",
  "/etc",
  "/usr",
  "/bin",
  "/sbin",
  "/var",
  "/system",
  "/windows",
  "c:",
  "c:\\",
  "c:/",
  "c:\\windows",
  "c:/windows",
]);

export function validateStorageFolderPath(
  rawPath: string,
  language: AppLanguage = "ar"
): { valid: boolean; normalizedPath?: string; error?: string } {
  const msgs = PATH_ERRORS[language];
  const trimmed = rawPath.trim();

  if (!trimmed) {
    return { valid: false, error: msgs.empty };
  }
  if (trimmed.length > 240) {
    return { valid: false, error: msgs.tooLong };
  }
  if (trimmed.includes("\0") || /[<>"|?*]/.test(trimmed)) {
    return { valid: false, error: msgs.invalidChars };
  }

  const lower = trimmed.toLowerCase().replace(/\/+$/, "").replace(/\\+$/, "") || "/";
  if (BLOCKED_EXACT_PATHS.has(lower) || lower === "~") {
    return { valid: false, error: msgs.unsafeRoot };
  }

  return { valid: true, normalizedPath: trimmed };
}

export function expandHomeDirectory(rawPath: string, homeDir: string): string {
  const clean = rawPath.trim();
  if (clean === "~") return homeDir;
  if (clean.startsWith("~/") || clean.startsWith("~\\")) {
    const rest = clean.slice(2);
    const sep = homeDir.includes("\\") ? "\\" : "/";
    return `${homeDir.replace(/[\\/]+$/, "")}${sep}${rest}`;
  }
  return clean;
}

export function formatByteSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function buildWorkspaceSnapshotPayload(input: {
  activeEmail?: string | null;
  language: AppLanguage;
  memories: MemoryItem[];
  assistantTasks: AssistantTask[];
  selfReflections: SelfReflectionItem[];
  latestWorkReport: AssistantWorkReport | null;
  notes: NoteItem[];
  publishDrafts: PublishDraft[];
  customPlatforms: PlatformEntry[];
  customGroups: CustomPlatformGroup[];
  favorites: string[];
  messages: StoredChatTurn[];
}): WorkspaceSnapshotPayload {
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    activeEmail: input.activeEmail?.trim() || null,
    language: input.language,
    memories: input.memories,
    assistantTasks: input.assistantTasks,
    selfReflections: input.selfReflections,
    latestWorkReport: input.latestWorkReport,
    notes: input.notes,
    publishDrafts: input.publishDrafts,
    customPlatforms: input.customPlatforms,
    customGroups: input.customGroups,
    favorites: input.favorites,
    messages: input.messages.slice(-40).map((m) => ({
      id: m.id,
      role: m.role,
      text: m.text,
      ...(m.winnerLabel ? { winnerLabel: m.winnerLabel } : {}),
    })),
  };
}
