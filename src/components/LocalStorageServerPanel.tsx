import { useRef, useState } from "react";
import {
  CheckCircle2,
  Download,
  FolderOpen,
  FolderPlus,
  HardDrive,
  RefreshCw,
  Server,
  Unplug,
  Upload,
} from "lucide-react";
import type { DirectoryHandleLike } from "../lib/localDeviceSync";
import {
  formatByteSize,
  validateStorageFolderPath,
  type LocalStorageServerInfo,
  type WorkspaceSnapshotPayload,
} from "../utils/localDeviceStorage";
import { getIntlLocale, type AppLanguage } from "../utils/i18n";

interface LocalStorageServerPanelProps {
  language: AppLanguage;
  serverInfo: LocalStorageServerInfo | null;
  nativeDirHandle: DirectoryHandleLike | null;
  isBusy: boolean;
  error: string | null;
  notice: string | null;
  onConfigureAndConnect: (params: {
    folderPath?: string;
    presetId?: string;
    migrateExisting?: boolean;
  }) => Promise<void>;
  onDisconnect: () => Promise<void>;
  onSyncNow: (createBackup: boolean) => Promise<void>;
  onRestoreFromServer: () => Promise<void>;
  onPickNativeFolder: () => Promise<void>;
  onDownloadBackup: () => void;
  onImportBackupSnapshot: (snapshot: WorkspaceSnapshotPayload) => Promise<void>;
}

const COPY: Record<
  AppLanguage,
  {
    title: string;
    subtitle: string;
    statusConnected: string;
    statusDisconnected: string;
    activeFolderLabel: string;
    lastSyncLabel: string;
    presetsLabel: string;
    customPathLabel: string;
    customPathPlaceholder: string;
    migrateLabel: string;
    connectBtn: string;
    reconnectBtn: string;
    disconnectBtn: string;
    syncNowBtn: string;
    restoreBtn: string;
    pickPcFolderBtn: string;
    nativeLinkedPrefix: string;
    downloadJsonBtn: string;
    importJsonBtn: string;
    filesHeader: string;
    fileColName: string;
    fileColSize: string;
    fileColUpdated: string;
    noFilesYet: string;
    invalidJsonError: string;
  }
> = {
  ar: {
    title: "ذاكرة الجهاز وفولدر التخزين المحلي والسيرفر",
    subtitle:
      "اختر مكان حفظ ذاكرة البرنامج وملاحظاتك ومهامك وقنواتك على الجهاز هنا، مع إنشاء فولدر مخصص وسيرفر مزامنة محلي تلقائي.",
    statusConnected: "متصل بسيرفر التخزين المحلي — المزامنة التلقائية نشطة",
    statusDisconnected: "غير مربوط بعد — اختر مكان الفولدر ثم اضغط ربط وتفعيل",
    activeFolderLabel: "مسار الفولدر النشط على الجهاز:",
    lastSyncLabel: "آخر حفظ فعلي:",
    presetsLabel: "أماكن جاهزة على الجهاز:",
    customPathLabel: "أو اكتب مسار فولدر مخصص على الكمبيوتر:",
    customPathPlaceholder: "مثال: ~/RahalPlusData أو D:\\RahalMemory",
    migrateLabel: "نقل الملفات المحفوظة سابقاً إلى الفولدر الجديد",
    connectBtn: "إنشاء الفولدر وتشغيل السيرفر",
    reconnectBtn: "تغيير المسار وتطبيق الفولدر",
    disconnectBtn: "إيقاف المزامنة",
    syncNowBtn: "حفظ ومزامنة الآن",
    restoreBtn: "استرجاع من الفولدر",
    pickPcFolderBtn: "اختيار فولدر من الكمبيوتر مباشرة",
    nativeLinkedPrefix: "مربوط مباشرة بفولدر الجهاز:",
    downloadJsonBtn: "تصدير ملف JSON",
    importJsonBtn: "استيراد نسخة",
    filesHeader: "الملفات الحقيقية المحفوظة داخل الفولدر",
    fileColName: "اسم الملف",
    fileColSize: "الحجم",
    fileColUpdated: "آخر تحديث",
    noFilesYet:
      "لم تُكتب ملفات بعد داخل هذا الفولدر. اضغط «إنشاء الفولدر وتشغيل السيرفر» ثم «حفظ ومزامنة الآن».",
    invalidJsonError: "ملف النسخة الاحتياطية غير صالح أو تالف.",
  },
  en: {
    title: "Device Memory & Local Storage Folder Server",
    subtitle:
      "Choose exactly where Rahal Plus stores its memory, tasks, notes, and channel data on this computer inside a dedicated folder and local sync server.",
    statusConnected: "Connected to Local Folder Server — Auto-sync active",
    statusDisconnected: "Not connected yet — Choose a folder and start local sync",
    activeFolderLabel: "Active Folder on Machine:",
    lastSyncLabel: "Last Disk Sync:",
    presetsLabel: "Quick Machine Locations:",
    customPathLabel: "Or specify a custom folder path:",
    customPathPlaceholder: "Example: ~/RahalPlusData or D:\\RahalMemory",
    migrateLabel: "Copy existing saved files to the new folder",
    connectBtn: "Create Folder & Connect Server",
    reconnectBtn: "Switch Folder Path",
    disconnectBtn: "Pause Sync",
    syncNowBtn: "Sync & Snapshot Now",
    restoreBtn: "Restore from Folder",
    pickPcFolderBtn: "Pick Native PC Folder",
    nativeLinkedPrefix: "Linked directly to PC folder:",
    downloadJsonBtn: "Export JSON",
    importJsonBtn: "Import JSON",
    filesHeader: "Files stored inside your folder",
    fileColName: "File",
    fileColSize: "Size",
    fileColUpdated: "Updated",
    noFilesYet:
      "No files written to this folder yet. Connect the folder and click Sync to write all workspace files.",
    invalidJsonError: "Invalid JSON backup file.",
  },
  ru: {
    title: "Память на компьютере и локальный сервер хранения",
    subtitle:
      "Выберите папку на устройстве, где будут храниться память ассистента, задачи, заметки и настройки платформ через выделенный локальный сервер.",
    statusConnected: "Подключено к локальному серверу — автосинхронизация активна",
    statusDisconnected: "Не подключено — выберите папку и запустите сохранение",
    activeFolderLabel: "Текущая папка на устройстве:",
    lastSyncLabel: "Последняя запись:",
    presetsLabel: "Быстрый выбор папки:",
    customPathLabel: "Или укажите свой путь к папке:",
    customPathPlaceholder: "Например: ~/RahalPlusData или D:\\RahalMemory",
    migrateLabel: "Перенести текущие файлы в новую папку",
    connectBtn: "Создать папку и подключить сервер",
    reconnectBtn: "Сменить папку",
    disconnectBtn: "Приостановить",
    syncNowBtn: "Синхронизировать сейчас",
    restoreBtn: "Загрузить из папки",
    pickPcFolderBtn: "Выбрать папку на ПК",
    nativeLinkedPrefix: "Прямое подключение к папке ПК:",
    downloadJsonBtn: "Экспорт JSON",
    importJsonBtn: "Импорт JSON",
    filesHeader: "Файлы внутри выбранной папки",
    fileColName: "Файл",
    fileColSize: "Размер",
    fileColUpdated: "Обновлён",
    noFilesYet: "Файлы ещё не записаны. Подключите папку и нажмите синхронизацию.",
    invalidJsonError: "Неверный формат файла резервной копии JSON.",
  },
};

export function LocalStorageServerPanel({
  language,
  serverInfo,
  nativeDirHandle,
  isBusy,
  error,
  notice,
  onConfigureAndConnect,
  onDisconnect,
  onSyncNow,
  onRestoreFromServer,
  onPickNativeFolder,
  onDownloadBackup,
  onImportBackupSnapshot,
}: LocalStorageServerPanelProps) {
  const t = COPY[language];
  const intlLocale = getIntlLocale(language);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [folderInput, setFolderInput] = useState(
    serverInfo?.storageDir ?? ""
  );
  const [migrateExisting, setMigrateExisting] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);

  const effectivePath = folderInput || serverInfo?.storageDir || "";
  const isConnected = Boolean(serverInfo?.connected);

  async function handleSubmitFolder(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    const check = validateStorageFolderPath(effectivePath, language);
    if (!check.valid) {
      setLocalError(check.error ?? "Invalid path");
      return;
    }
    await onConfigureAndConnect({
      folderPath: check.normalizedPath,
      migrateExisting,
    });
  }

  async function handleSelectPreset(presetId: string, presetPath: string) {
    setLocalError(null);
    setFolderInput(presetPath);
    await onConfigureAndConnect({
      presetId,
      migrateExisting,
    });
  }

  async function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLocalError(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as WorkspaceSnapshotPayload;
      if (!parsed || typeof parsed !== "object" || parsed.version !== 1) {
        setLocalError(t.invalidJsonError);
        return;
      }
      await onImportBackupSnapshot(parsed);
    } catch {
      setLocalError(t.invalidJsonError);
    }
  }

  return (
    <div
      data-testid="local-device-storage-panel"
      className="bg-white border border-slate-200 rounded-xl p-5 space-y-5"
    >
      {/* Header & Connection Status */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="space-y-1 max-w-2xl">
          <div className="flex items-center gap-2 text-blue-800">
            <HardDrive className="w-4 h-4 shrink-0" aria-hidden="true" />
            <h3 className="font-display text-base sm:text-lg font-bold text-slate-900">
              {t.title}
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {t.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium shrink-0">
          {isConnected ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-700">
              <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{t.statusConnected}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-slate-600">
              <Server className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{t.statusDisconnected}</span>
            </span>
          )}
        </div>
      </div>

      {/* Active Server Folder Info */}
      {serverInfo && (
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 space-y-1.5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-slate-700">
              {t.activeFolderLabel}
            </span>
            {serverInfo.lastSyncedAt && (
              <span className="text-slate-500">
                {t.lastSyncLabel}{" "}
                <span className="font-mono tabular-nums text-slate-800">
                  {new Date(serverInfo.lastSyncedAt).toLocaleString(intlLocale)}
                </span>
              </span>
            )}
          </div>
          <div
            dir="ltr"
            data-testid="active-storage-dir"
            className="font-mono text-xs text-slate-900 break-all"
          >
            {serverInfo.storageDir}
          </div>
          {nativeDirHandle && (
            <div className="text-emerald-700 font-medium pt-0.5">
              {t.nativeLinkedPrefix}{" "}
              <span dir="ltr" className="font-mono">
                {nativeDirHandle.name}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Quick Presets */}
      {serverInfo && serverInfo.presets.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-700">
            {t.presetsLabel}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {serverInfo.presets.map((preset) => {
              const active = serverInfo.storageDir === preset.path;
              return (
                <button
                  key={preset.id}
                  type="button"
                  disabled={isBusy}
                  onClick={() => void handleSelectPreset(preset.id, preset.path)}
                  className={`p-2.5 rounded-lg border text-start transition-colors ${
                    active
                      ? "bg-blue-50/80 border-blue-700 text-slate-900"
                      : "bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <div className="text-xs font-semibold truncate">
                    {preset.label}
                  </div>
                  <div
                    dir="ltr"
                    className="mt-0.5 text-[11px] font-mono text-slate-500 truncate"
                  >
                    {preset.path}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Custom Folder Form + Native Picker */}
      <form onSubmit={handleSubmitFolder} className="space-y-3">
        <label
          htmlFor="local-storage-folder-input"
          className="block text-xs font-semibold text-slate-700"
        >
          {t.customPathLabel}
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            id="local-storage-folder-input"
            type="text"
            dir="ltr"
            value={effectivePath}
            onChange={(e) => setFolderInput(e.target.value)}
            placeholder={t.customPathPlaceholder}
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs sm:text-sm font-mono text-slate-900 focus:border-blue-700 focus:outline-none min-h-[42px]"
          />
          <button
            type="submit"
            disabled={isBusy}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg disabled:bg-slate-300 whitespace-nowrap shrink-0 min-h-[42px]"
          >
            <FolderPlus className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{isConnected ? t.reconnectBtn : t.connectBtn}</span>
          </button>
        </div>

        <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            checked={migrateExisting}
            onChange={(e) => setMigrateExisting(e.target.checked)}
            className="rounded border-slate-300 text-blue-700"
          />
          <span>{t.migrateLabel}</span>
        </label>
      </form>

      {/* Direct Sync, Native Folder Picker & Backup Controls */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
        <button
          type="button"
          disabled={isBusy}
          onClick={() => void onSyncNow(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg disabled:opacity-50 whitespace-nowrap"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isBusy ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          <span>{t.syncNowBtn}</span>
        </button>

        <button
          type="button"
          disabled={isBusy}
          onClick={() => void onPickNativeFolder()}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-800 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg disabled:opacity-50 whitespace-nowrap"
        >
          <FolderOpen className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{t.pickPcFolderBtn}</span>
        </button>

        {serverInfo?.hasSavedState && (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => void onRestoreFromServer()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg disabled:opacity-50 whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t.restoreBtn}</span>
          </button>
        )}

        <button
          type="button"
          onClick={onDownloadBackup}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{t.downloadJsonBtn}</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={(e) => void handleFileImport(e)}
          className="sr-only"
          aria-label={t.importJsonBtn}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg whitespace-nowrap"
        >
          <Upload className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{t.importJsonBtn}</span>
        </button>

        {isConnected && (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => void onDisconnect()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-700 bg-red-50/70 border border-red-200 hover:bg-red-100 rounded-lg whitespace-nowrap"
          >
            <Unplug className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t.disconnectBtn}</span>
          </button>
        )}
      </div>

      {(localError || error) && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800"
        >
          {localError || error}
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800"
        >
          {notice}
        </div>
      )}

      {/* Disk Files Table */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-700">
          {t.filesHeader}
        </div>

        {!serverInfo || serverInfo.files.length === 0 ? (
          <p className="text-xs text-slate-500 py-1">{t.noFilesYet}</p>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table
              data-testid="local-storage-files-table"
              className="w-full text-xs text-start"
            >
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3 font-semibold text-start">
                    {t.fileColName}
                  </th>
                  <th className="py-2 px-3 font-semibold text-end">
                    {t.fileColSize}
                  </th>
                  <th className="py-2 px-3 font-semibold text-end">
                    {t.fileColUpdated}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {serverInfo.files.map((file) => (
                  <tr key={file.name} className="hover:bg-slate-50/60">
                    <td
                      dir="ltr"
                      className="py-2 px-3 font-mono text-slate-900 whitespace-nowrap"
                    >
                      {file.name}
                    </td>
                    <td
                      dir="ltr"
                      className="py-2 px-3 font-mono tabular-nums text-slate-600 text-end whitespace-nowrap"
                    >
                      {formatByteSize(file.sizeBytes)}
                    </td>
                    <td className="py-2 px-3 font-mono tabular-nums text-slate-500 text-end whitespace-nowrap">
                      {new Date(file.updatedAt).toLocaleTimeString(intlLocale, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
