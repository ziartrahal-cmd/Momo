import { useState } from "react";
import {
  CheckCircle2,
  Circle,
  Loader2,
  Play,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  filterAssistantTasks,
  type AssistantTask,
  type AssistantTaskKind,
  type AssistantTaskStatus,
  type MemoryCategory,
  type MemoryItem,
  type SelfReflectionItem,
} from "../utils/assistantMemory";
import {
  MEMORY_CATEGORY_I18N,
  TASK_KIND_I18N,
  TASK_STATUS_I18N,
  UI_TEXT,
  type AppLanguage,
} from "../utils/i18n";
import type { DirectoryHandleLike } from "../lib/localDeviceSync";
import type {
  LocalStorageServerInfo,
  WorkspaceSnapshotPayload,
} from "../utils/localDeviceStorage";
import { LocalStorageServerPanel } from "./LocalStorageServerPanel";

interface AssistantMemoryPanelProps {
  language: AppLanguage;
  memories: MemoryItem[];
  tasks: AssistantTask[];
  reflections: SelfReflectionItem[];
  executingTaskId: string | null;
  onAddMemory: (category: MemoryCategory, summary: string) => void;
  onDeleteMemory: (id: string) => void;
  onAddTask: (input: {
    title: string;
    details: string;
    kind: AssistantTaskKind;
  }) => void;
  onExecuteTask: (task: AssistantTask) => void;
  onToggleTaskStatus: (id: string, nextStatus: AssistantTaskStatus) => void;
  onDeleteTask: (id: string) => void;
  onDeleteReflection: (id: string) => void;
  localStorageInfo: LocalStorageServerInfo | null;
  nativeDirHandle: DirectoryHandleLike | null;
  isSyncingDevice: boolean;
  deviceStorageError: string | null;
  deviceStorageNotice: string | null;
  onConfigureAndConnectDevice: (params: {
    folderPath?: string;
    presetId?: string;
    migrateExisting?: boolean;
  }) => Promise<void>;
  onDisconnectDevice: () => Promise<void>;
  onSyncDeviceNow: (createBackup: boolean) => Promise<void>;
  onRestoreFromDevice: () => Promise<void>;
  onPickNativeFolder: () => Promise<void>;
  onDownloadBackup: () => void;
  onImportBackupSnapshot: (snapshot: WorkspaceSnapshotPayload) => Promise<void>;
}

export function AssistantMemoryPanel({
  language,
  memories,
  tasks,
  reflections,
  executingTaskId,
  onAddMemory,
  onDeleteMemory,
  onAddTask,
  onExecuteTask,
  onToggleTaskStatus,
  onDeleteTask,
  onDeleteReflection,
  localStorageInfo,
  nativeDirHandle,
  isSyncingDevice,
  deviceStorageError,
  deviceStorageNotice,
  onConfigureAndConnectDevice,
  onDisconnectDevice,
  onSyncDeviceNow,
  onRestoreFromDevice,
  onPickNativeFolder,
  onDownloadBackup,
  onImportBackupSnapshot,
}: AssistantMemoryPanelProps) {
  const t = UI_TEXT[language].memoryPanel;
  const catLabels = MEMORY_CATEGORY_I18N[language];
  const kindLabels = TASK_KIND_I18N[language];
  const statusLabels = TASK_STATUS_I18N[language];

  const [memoryFilter, setMemoryFilter] = useState<MemoryCategory | "all">("all");
  const [isMemoryFormOpen, setIsMemoryFormOpen] = useState(false);
  const [newMemoryCat, setNewMemoryCat] = useState<MemoryCategory>("project");
  const [newMemorySummary, setNewMemorySummary] = useState("");

  const [taskFilter, setTaskFilter] = useState<AssistantTaskStatus | "all">("all");
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDetails, setNewTaskDetails] = useState("");
  const [newTaskKind, setNewTaskKind] = useState<AssistantTaskKind>("research");

  const visibleMemories =
    memoryFilter === "all"
      ? memories
      : memories.filter((m) => m.category === memoryFilter);

  const visibleTasks = filterAssistantTasks(tasks, taskFilter);
  const openTasksCount = tasks.filter((item) => item.status !== "done").length;
  const doneTasksCount = tasks.filter((item) => item.status === "done").length;

  function handleSaveMemory(e: React.FormEvent) {
    e.preventDefault();
    const clean = newMemorySummary.trim();
    if (clean.length < 4) return;
    onAddMemory(newMemoryCat, clean);
    setNewMemorySummary("");
    setIsMemoryFormOpen(false);
  }

  function handleSaveTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    onAddTask({
      title: newTaskTitle.trim(),
      details: newTaskDetails.trim(),
      kind: newTaskKind,
    });
    setNewTaskTitle("");
    setNewTaskDetails("");
    setIsTaskFormOpen(false);
  }

  return (
    <div data-testid="assistant-memory-panel" className="space-y-6">
      {/* Summary Header Strip */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="font-display text-lg font-bold text-slate-900">
            {t.title}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-600">{t.subtitle}</p>
        </div>

        <div className="grid grid-cols-3 gap-4 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100 shrink-0">
          <div>
            <div className="text-[11px] text-slate-500">{t.statsMemories}</div>
            <div className="mt-0.5 font-mono text-lg font-bold tabular-nums text-slate-900">
              {memories.length}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500">{t.statsOpenTasks}</div>
            <div className="mt-0.5 font-mono text-lg font-bold tabular-nums text-blue-700">
              {openTasksCount}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500">{t.statsDoneTasks}</div>
            <div className="mt-0.5 font-mono text-lg font-bold tabular-nums text-emerald-700">
              {doneTasksCount}
            </div>
          </div>
        </div>
      </div>

      {/* Section 0: Local Device & Server Folder Storage */}
      <LocalStorageServerPanel
        language={language}
        serverInfo={localStorageInfo}
        nativeDirHandle={nativeDirHandle}
        isBusy={isSyncingDevice}
        error={deviceStorageError}
        notice={deviceStorageNotice}
        onConfigureAndConnect={onConfigureAndConnectDevice}
        onDisconnect={onDisconnectDevice}
        onSyncNow={onSyncDeviceNow}
        onRestoreFromServer={onRestoreFromDevice}
        onPickNativeFolder={onPickNativeFolder}
        onDownloadBackup={onDownloadBackup}
        onImportBackupSnapshot={onImportBackupSnapshot}
      />

      {/* Section 1: Persistent Memories */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-base font-bold text-slate-900">
            {t.memoriesTitle}
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label={t.memoryCategoryAria}
              value={memoryFilter}
              onChange={(e) =>
                setMemoryFilter(e.target.value as MemoryCategory | "all")
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-blue-700 focus:outline-none min-h-[36px]"
            >
              <option value="all">{t.allCategories}</option>
              {(Object.keys(catLabels) as MemoryCategory[]).map((cat) => (
                <option key={cat} value={cat}>
                  {catLabels[cat]}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setIsMemoryFormOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors whitespace-nowrap min-h-[36px]"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{t.addMemoryBtn}</span>
            </button>
          </div>
        </div>

        {isMemoryFormOpen && (
          <form
            onSubmit={handleSaveMemory}
            className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
          >
            <select
              aria-label={t.memoryCategoryAria}
              value={newMemoryCat}
              onChange={(e) => setNewMemoryCat(e.target.value as MemoryCategory)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 min-h-[40px]"
            >
              {(Object.keys(catLabels) as MemoryCategory[]).map((cat) => (
                <option key={cat} value={cat}>
                  {catLabels[cat]}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={newMemorySummary}
              onChange={(e) => setNewMemorySummary(e.target.value)}
              placeholder={t.memoryPlaceholder}
              className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none min-h-[40px]"
            />
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={newMemorySummary.trim().length < 4}
                className="px-3.5 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg disabled:bg-slate-300 whitespace-nowrap min-h-[40px]"
              >
                {t.saveBtn}
              </button>
              <button
                type="button"
                onClick={() => setIsMemoryFormOpen(false)}
                className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-200/70 hover:bg-slate-200 rounded-lg whitespace-nowrap min-h-[40px]"
              >
                {t.cancelBtn}
              </button>
            </div>
          </form>
        )}

        {visibleMemories.length === 0 ? (
          <p className="text-sm text-slate-500 py-3">{t.noMemories}</p>
        ) : (
          <ul
            data-testid="assistant-memories-list"
            className="divide-y divide-slate-200 border border-slate-200 rounded-lg"
          >
            {visibleMemories.map((mem) => (
              <li
                key={mem.id}
                className="px-4 py-3 flex items-start justify-between gap-3 bg-white first:rounded-t-lg last:rounded-b-lg"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="text-[11px] font-semibold text-blue-700">
                    {catLabels[mem.category]}
                  </div>
                  <p className="text-sm text-slate-800 break-words">
                    {mem.summary}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteMemory(mem.id)}
                  aria-label={t.deleteMemoryAria}
                  className="p-2 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Section 2: Autonomous Assistant Tasks */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-base font-bold text-slate-900">
            {t.tasksTitle}
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label={t.taskFilterAll}
              value={taskFilter}
              onChange={(e) =>
                setTaskFilter(e.target.value as AssistantTaskStatus | "all")
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-blue-700 focus:outline-none min-h-[36px]"
            >
              <option value="all">{t.taskFilterAll}</option>
              <option value="pending">{statusLabels.pending}</option>
              <option value="in_progress">{statusLabels.in_progress}</option>
              <option value="done">{statusLabels.done}</option>
            </select>

            <button
              type="button"
              onClick={() => setIsTaskFormOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors whitespace-nowrap min-h-[36px]"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{t.addTaskBtn}</span>
            </button>
          </div>
        </div>

        {isTaskFormOpen && (
          <form
            onSubmit={handleSaveTask}
            className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder={t.taskTitlePlaceholder}
                className="sm:col-span-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none min-h-[40px]"
              />
              <select
                value={newTaskKind}
                onChange={(e) =>
                  setNewTaskKind(e.target.value as AssistantTaskKind)
                }
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 min-h-[40px]"
              >
                {(Object.keys(kindLabels) as AssistantTaskKind[]).map((k) => (
                  <option key={k} value={k}>
                    {kindLabels[k]}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              rows={2}
              value={newTaskDetails}
              onChange={(e) => setNewTaskDetails(e.target.value)}
              placeholder={t.taskDetailsPlaceholder}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsTaskFormOpen(false)}
                className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-200/70 hover:bg-slate-200 rounded-lg"
              >
                {t.cancelBtn}
              </button>
              <button
                type="submit"
                disabled={!newTaskTitle.trim()}
                className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg disabled:bg-slate-300"
              >
                {t.saveBtn}
              </button>
            </div>
          </form>
        )}

        {visibleTasks.length === 0 ? (
          <p className="text-sm text-slate-500 py-3">{t.noTasks}</p>
        ) : (
          <div data-testid="assistant-tasks-list" className="space-y-3">
            {visibleTasks.map((task) => {
              const isExecuting = executingTaskId === task.id;
              const isDone = task.status === "done";

              return (
                <article
                  key={task.id}
                  className="rounded-lg border border-slate-200 bg-slate-50/40 p-4 space-y-2.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-1.5">
                        <span
                          className={
                            isDone
                              ? "text-emerald-700 font-semibold"
                              : task.status === "in_progress"
                              ? "text-blue-700 font-semibold"
                              : "text-amber-700 font-semibold"
                          }
                        >
                          {statusLabels[task.status]}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{kindLabels[task.kind]}</span>
                      </div>
                      <h4 className="font-display text-sm sm:text-base font-semibold text-slate-900">
                        {task.title}
                      </h4>
                      {task.details && (
                        <p className="text-xs sm:text-sm text-slate-600">
                          {task.details}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {!isDone && (
                        <button
                          type="button"
                          disabled={Boolean(executingTaskId)}
                          onClick={() => onExecuteTask(task)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg disabled:bg-slate-300 whitespace-nowrap min-h-[36px]"
                        >
                          {isExecuting ? (
                            <Loader2
                              className="w-3.5 h-3.5 animate-spin shrink-0"
                              aria-hidden="true"
                            />
                          ) : (
                            <Play className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          )}
                          <span>{isExecuting ? t.executing : t.executeNow}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          onToggleTaskStatus(
                            task.id,
                            isDone ? "pending" : "done"
                          )
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg whitespace-nowrap min-h-[36px]"
                      >
                        {isDone ? (
                          <>
                            <Circle className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>{t.reopenTask}</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2
                              className="w-3.5 h-3.5 text-emerald-600"
                              aria-hidden="true"
                            />
                            <span>{t.markDone}</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteTask(task.id)}
                        aria-label={t.deleteTaskAria}
                        className="p-2 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {task.resultSummary && (
                    <div className="rounded-md border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs text-emerald-950 space-y-1">
                      <p>{task.resultSummary}</p>
                      {task.linkedArtifactTitle && (
                        <p className="font-medium text-emerald-800">
                          {task.linkedArtifactType === "draft"
                            ? t.linkedDraftNotice
                            : t.linkedNoteNotice}{" "}
                          {task.linkedArtifactTitle}
                        </p>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 3: Self-Improvement & Assistant Needs */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-700 shrink-0" aria-hidden="true" />
          <h3 className="font-display text-base font-bold text-slate-900">
            {t.reflectionsTitle}
          </h3>
        </div>

        {reflections.length === 0 ? (
          <p className="text-sm text-slate-500 py-2">{t.noReflections}</p>
        ) : (
          <ul className="space-y-2.5">
            {reflections.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 flex items-start justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <p className="text-sm text-slate-800">{item.insight}</p>
                  <p className="text-xs text-blue-800 font-medium">
                    {t.neededCapabilityLabel} {item.neededCapability}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteReflection(item.id)}
                  aria-label={t.deleteReflectionAria}
                  className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg shrink-0"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
