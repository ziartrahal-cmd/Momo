import { useEffect, useRef, useState } from "react";
import {
  BookmarkPlus,
  Brain,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Loader2,
  Mic,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { ParallelQueryStatus } from "./ParallelQueryStatus";
import { ModelComparisonTable } from "./ModelComparisonTable";
import { ModelComparisonModal } from "./ModelComparisonModal";
import { LiveVoicePanel } from "./LiveVoicePanel";
import { AssistantMemoryPanel } from "./AssistantMemoryPanel";
import type { ParallelPipelineState } from "../utils/parallelStatus";
import type {
  AssistantTask,
  AssistantTaskKind,
  AssistantTaskStatus,
  AssistantWorkReport,
  MemoryCategory,
  MemoryItem,
  SelfReflectionItem,
} from "../utils/assistantMemory";
import type { LiveTranscriptItem } from "../utils/audioPcm";
import { UI_TEXT, type AppLanguage } from "../utils/i18n";
import type { DirectoryHandleLike } from "../lib/localDeviceSync";
import type {
  LocalStorageServerInfo,
  WorkspaceSnapshotPayload,
} from "../utils/localDeviceStorage";

export type AssistantMode = "general" | "writing" | "coding" | "summarize";
export type QueryStrategy = "single" | "parallel";

export interface ModelCandidateAnswer {
  id: string;
  label: string;
  modelId?: string;
  text: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  winnerLabel?: string;
  candidates?: ModelCandidateAnswer[];
  parallelState?: ParallelPipelineState;
}

interface GeminiWorkspaceProps {
  language: AppLanguage;
  messages: ChatMessage[];
  mode: AssistantMode;
  queryStrategy: QueryStrategy;
  parallelState: ParallelPipelineState;
  isComparisonModalOpen: boolean;
  comparisonModalState: ParallelPipelineState;
  draft: string;
  isLoading: boolean;
  error: string | null;
  memoryContext: string;
  memories: MemoryItem[];
  assistantTasks: AssistantTask[];
  selfReflections: SelfReflectionItem[];
  latestWorkReport: AssistantWorkReport | null;
  isReflecting: boolean;
  executingTaskId: string | null;
  onChangeMode: (mode: AssistantMode) => void;
  onChangeStrategy: (strategy: QueryStrategy) => void;
  onChangeDraft: (text: string) => void;
  onSendMessage: (text?: string) => void;
  onSaveToNotes: (title: string, content: string) => void;
  onOpenComparisonModal: (state: ParallelPipelineState) => void;
  onCloseComparisonModal: () => void;
  onAddMemory: (category: MemoryCategory, summary: string) => void;
  onDeleteMemory: (id: string) => void;
  onAddAssistantTask: (input: {
    title: string;
    details: string;
    kind: AssistantTaskKind;
  }) => void;
  onExecuteAssistantTask: (task: AssistantTask) => void;
  onToggleAssistantTaskStatus: (
    id: string,
    nextStatus: AssistantTaskStatus
  ) => void;
  onDeleteAssistantTask: (id: string) => void;
  onDeleteReflection: (id: string) => void;
  onReflectConversation: () => void;
  onReflectVoiceTranscript: (transcripts: LiveTranscriptItem[]) => void;
  onDismissWorkReport: () => void;
  onOpenPublishingTab: () => void;
  onOpenNotesTab: () => void;
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

export function GeminiWorkspace({
  language,
  messages,
  mode,
  queryStrategy,
  parallelState,
  isComparisonModalOpen,
  comparisonModalState,
  draft,
  isLoading,
  error,
  memoryContext,
  memories,
  assistantTasks,
  selfReflections,
  latestWorkReport,
  isReflecting,
  executingTaskId,
  onChangeMode,
  onChangeStrategy,
  onChangeDraft,
  onSendMessage,
  onSaveToNotes,
  onOpenComparisonModal,
  onCloseComparisonModal,
  onAddMemory,
  onDeleteMemory,
  onAddAssistantTask,
  onExecuteAssistantTask,
  onToggleAssistantTaskStatus,
  onDeleteAssistantTask,
  onDeleteReflection,
  onReflectConversation,
  onReflectVoiceTranscript,
  onDismissWorkReport,
  onOpenPublishingTab,
  onOpenNotesTab,
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
}: GeminiWorkspaceProps) {
  const t = UI_TEXT[language].gemini;

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [expandedCandidates, setExpandedCandidates] = useState<
    Record<string, boolean>
  >({});
  const [interactionChannel, setInteractionChannel] = useState<
    "text" | "voice" | "memory"
  >("text");
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const openTasksCount = assistantTasks.filter(
    (item) => item.status !== "done"
  ).length;

  useEffect(() => {
    if (
      messages.length === 0 &&
      !isLoading &&
      parallelState.phase === "idle"
    ) {
      return;
    }
    const el = scrollContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length, isLoading, parallelState.phase]);

  async function handleCopy(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1800);
    } catch {
      // Clipboard may be blocked in restricted contexts
    }
  }

  function handleSave(id: string, text: string) {
    const firstLine =
      text.split(/\r?\n/)[0].slice(0, 44).trim() || t.defaultNoteTitle;
    onSaveToNotes(firstLine, text);
    setSavedId(id);
    setTimeout(() => setSavedId((prev) => (prev === id ? null : prev)), 1800);
  }

  function toggleCandidates(id: string) {
    setExpandedCandidates((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || isLoading) return;
    onSendMessage();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (draft.trim() && !isLoading) {
        onSendMessage();
      }
    }
  }

  const modeEntries: Array<{ id: AssistantMode; label: string }> = [
    { id: "general", label: t.modes.general },
    { id: "writing", label: t.modes.writing },
    { id: "summarize", label: t.modes.summarize },
    { id: "coding", label: t.modes.coding },
  ];

  return (
    <section aria-labelledby="gemini-heading" className="max-w-4xl mx-auto">
      <div className="mb-6 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="max-w-xl">
          <h1
            id="gemini-heading"
            className="font-display text-2xl sm:text-3xl font-bold text-slate-900"
          >
            {t.heading}
          </h1>
          <p className="mt-1 text-sm text-slate-600">{t.subheading}</p>
        </div>

        <div
          role="group"
          aria-label={t.modeAria}
          className="inline-flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-lg self-start lg:self-end max-w-full overflow-x-auto shrink-0"
        >
          {modeEntries.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onChangeMode(m.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                mode === m.id
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Strategy & Channel Bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label={t.channelAria}
            className="inline-flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-lg max-w-full overflow-x-auto"
          >
            <button
              type="button"
              onClick={() => setInteractionChannel("text")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                interactionChannel === "text"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {t.channels.text}
            </button>
            <button
              type="button"
              onClick={() => setInteractionChannel("voice")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                interactionChannel === "voice"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Mic className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t.channels.voice}</span>
            </button>
            <button
              type="button"
              data-testid="memory-channel-tab"
              onClick={() => setInteractionChannel("memory")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                interactionChannel === "memory"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Brain className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t.channels.memory}</span>
              {(openTasksCount > 0 || memories.length > 0) && (
                <span
                  className={`font-mono tabular-nums text-[11px] ${
                    interactionChannel === "memory"
                      ? "text-slate-300"
                      : "text-slate-400"
                  }`}
                >
                  ({openTasksCount || memories.length})
                </span>
              )}
            </button>
          </div>

          {interactionChannel === "text" && (
            <div
              role="group"
              aria-label={t.strategyAria}
              className="inline-flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-lg"
            >
              <button
                type="button"
                disabled={isLoading}
                onClick={() => onChangeStrategy("single")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  queryStrategy === "single"
                    ? "bg-blue-700 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t.strategies.single}
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => onChangeStrategy("parallel")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  queryStrategy === "parallel"
                    ? "bg-blue-700 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t.strategies.parallel}
              </button>
            </div>
          )}
        </div>

        {interactionChannel === "text" && queryStrategy === "parallel" && (
          <span className="text-xs text-slate-500">
            {t.strategies.parallelHint}
          </span>
        )}
      </div>

      {interactionChannel === "voice" ? (
        <LiveVoicePanel
          language={language}
          memoryContext={memoryContext}
          isReflecting={isReflecting}
          onSaveTranscriptToNotes={onSaveToNotes}
          onReflectVoiceTranscript={onReflectVoiceTranscript}
        />
      ) : interactionChannel === "memory" ? (
        <AssistantMemoryPanel
          language={language}
          memories={memories}
          tasks={assistantTasks}
          reflections={selfReflections}
          executingTaskId={executingTaskId}
          onAddMemory={onAddMemory}
          onDeleteMemory={onDeleteMemory}
          onAddTask={onAddAssistantTask}
          onExecuteTask={onExecuteAssistantTask}
          onToggleTaskStatus={onToggleAssistantTaskStatus}
          onDeleteTask={onDeleteAssistantTask}
          onDeleteReflection={onDeleteReflection}
          localStorageInfo={localStorageInfo}
          nativeDirHandle={nativeDirHandle}
          isSyncingDevice={isSyncingDevice}
          deviceStorageError={deviceStorageError}
          deviceStorageNotice={deviceStorageNotice}
          onConfigureAndConnectDevice={onConfigureAndConnectDevice}
          onDisconnectDevice={onDisconnectDevice}
          onSyncDeviceNow={onSyncDeviceNow}
          onRestoreFromDevice={onRestoreFromDevice}
          onPickNativeFolder={onPickNativeFolder}
          onDownloadBackup={onDownloadBackup}
          onImportBackupSnapshot={onImportBackupSnapshot}
        />
      ) : (
        /* Conversation Container */
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col min-h-[460px]">
          <div
            ref={scrollContainerRef}
            className="flex-1 p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[540px]"
          >
            {messages.length === 0 ? (
              <div className="py-8 max-w-2xl mx-auto text-center">
                <h2 className="font-display text-lg font-semibold text-slate-900">
                  {t.emptyTitle}
                </h2>
                <p className="mt-1.5 text-sm text-slate-600">
                  {t.emptySubtitle}
                </p>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-start">
                  {t.starters.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      disabled={isLoading}
                      onClick={() => {
                        onChangeMode(item.mode);
                        onSendMessage(item.prompt);
                      }}
                      className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-100 hover:border-slate-300 text-start transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                    >
                      <div className="text-sm font-medium text-slate-900">
                        {item.label}
                      </div>
                      <div className="mt-1 text-xs text-slate-600 line-clamp-2">
                        {item.prompt}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isExpanded = Boolean(expandedCandidates[msg.id]);

                return (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-xl border ${
                      msg.role === "user"
                        ? "bg-blue-50/60 border-blue-200/80 text-slate-900"
                        : "bg-slate-50/70 border-slate-200 text-slate-900"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="text-xs font-semibold text-slate-600">
                        <span>
                          {msg.role === "user"
                            ? t.userLabel
                            : t.assistantLabel}
                        </span>
                        {msg.winnerLabel && (
                          <>
                            <span
                              aria-hidden="true"
                              className="mx-1.5 text-slate-400"
                            >
                              ·
                            </span>
                            <span className="font-normal text-slate-500">
                              {msg.winnerLabel}
                            </span>
                          </>
                        )}
                      </div>

                      {msg.role === "model" && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopy(msg.id, msg.text)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-200/60 transition-colors whitespace-nowrap shrink-0"
                            aria-label={t.copy}
                          >
                            {copiedId === msg.id ? (
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
                                <span>{t.copy}</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSave(msg.id, msg.text)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-200/60 transition-colors whitespace-nowrap shrink-0"
                            aria-label={t.saveToNotes}
                          >
                            {savedId === msg.id ? (
                              <>
                                <Check
                                  className="w-3.5 h-3.5 text-emerald-600"
                                  aria-hidden="true"
                                />
                                <span>{t.saved}</span>
                              </>
                            ) : (
                              <>
                                <BookmarkPlus
                                  className="w-3.5 h-3.5"
                                  aria-hidden="true"
                                />
                                <span>{t.saveToNotes}</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {msg.parallelState && (
                      <div className="mb-3">
                        <ParallelQueryStatus
                          language={language}
                          state={msg.parallelState}
                          onOpenModal={() =>
                            onOpenComparisonModal(msg.parallelState!)
                          }
                        />
                      </div>
                    )}

                    <div className="text-sm sm:text-[15px] leading-relaxed whitespace-pre-wrap break-words text-slate-800">
                      {msg.text}
                    </div>

                    {msg.candidates && msg.candidates.length > 1 && (
                      <div className="mt-3 pt-3 border-t border-slate-200/80">
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          onClick={() => toggleCandidates(msg.id)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-800"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                          )}
                          <span>
                            {isExpanded
                              ? t.hideComparison
                              : `${t.showComparison} (${msg.candidates.length})`}
                          </span>
                        </button>

                        {isExpanded && (
                          <ModelComparisonTable
                            language={language}
                            candidates={msg.candidates}
                            winnerLabel={msg.winnerLabel}
                            onSaveCandidateToNotes={onSaveToNotes}
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {parallelState.phase !== "idle" &&
              parallelState.phase !== "completed" && (
                <ParallelQueryStatus
                  language={language}
                  state={parallelState}
                  onOpenModal={() => onOpenComparisonModal(parallelState)}
                />
              )}

            {isLoading && parallelState.phase === "idle" && (
              <div
                aria-live="polite"
                className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-3 text-sm text-slate-600"
              >
                <Loader2
                  className="w-4 h-4 animate-spin text-blue-700 shrink-0"
                  aria-hidden="true"
                />
                <span>{t.loadingReply}</span>
              </div>
            )}

            {isReflecting && (
              <div
                aria-live="polite"
                className="p-3 rounded-lg border border-blue-200 bg-blue-50/70 flex items-center gap-2.5 text-xs font-medium text-blue-800"
              >
                <Loader2
                  className="w-3.5 h-3.5 animate-spin shrink-0"
                  aria-hidden="true"
                />
                <span>{t.reflectingBadge}</span>
              </div>
            )}

            {latestWorkReport && (
              <div
                data-testid="assistant-work-report"
                className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                    <Sparkles className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{t.workReportTitle}</span>
                  </div>
                  <button
                    type="button"
                    onClick={onDismissWorkReport}
                    aria-label={t.dismissReport}
                    className="p-1 text-emerald-700 hover:text-emerald-950 rounded"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>

                {latestWorkReport.memoryComparison && (
                  <p className="text-xs text-slate-800 leading-relaxed">
                    <span className="font-semibold text-slate-900">
                      {t.memoryComparisonLabel}{" "}
                    </span>
                    {latestWorkReport.memoryComparison}
                  </p>
                )}

                {latestWorkReport.completedReport && (
                  <p className="text-xs text-slate-800 leading-relaxed">
                    <span className="font-semibold text-slate-900">
                      {t.completedWorkLabel}{" "}
                    </span>
                    {latestWorkReport.completedReport}
                  </p>
                )}

                {latestWorkReport.selfReflection && (
                  <p className="text-xs text-blue-900 leading-relaxed">
                    <span className="font-semibold">{t.selfNeedsLabel} </span>
                    {latestWorkReport.selfReflection.neededCapability}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setInteractionChannel("memory")}
                    className="px-2.5 py-1 text-xs font-medium text-emerald-900 bg-white border border-emerald-200 hover:bg-emerald-100 rounded-md"
                  >
                    {t.openMemoryTab}
                  </button>

                  {latestWorkReport.artifactsCreated.some(
                    (a) => a.type === "draft"
                  ) && (
                    <button
                      type="button"
                      onClick={onOpenPublishingTab}
                      className="px-2.5 py-1 text-xs font-medium text-blue-800 bg-white border border-blue-200 hover:bg-blue-50 rounded-md"
                    >
                      {t.openPublishingTab}
                    </button>
                  )}

                  {latestWorkReport.artifactsCreated.some(
                    (a) => a.type === "note"
                  ) && (
                    <button
                      type="button"
                      onClick={onOpenNotesTab}
                      className="px-2.5 py-1 text-xs font-medium text-slate-800 bg-white border border-slate-200 hover:bg-slate-100 rounded-md"
                    >
                      {t.openNotesTab}
                    </button>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="p-3.5 rounded-lg border border-red-200 bg-red-50 text-sm text-red-800"
              >
                {error}
              </div>
            )}
          </div>

          {/* Composer */}
          <form
            onSubmit={handleSubmit}
            className="border-t border-slate-200 bg-white p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-end gap-2.5"
          >
            <div className="flex-1">
              <label htmlFor="gemini-prompt-input" className="sr-only">
                {t.inputLabel}
              </label>
              <textarea
                id="gemini-prompt-input"
                rows={2}
                value={draft}
                onChange={(e) => onChangeDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t.inputPlaceholder}
                className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {messages.length >= 2 && (
                <button
                  type="button"
                  disabled={isReflecting || isLoading}
                  onClick={onReflectConversation}
                  className="inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-50 whitespace-nowrap min-h-[44px]"
                >
                  <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{t.analyzeNow}</span>
                </button>
              )}

              <button
                type="submit"
                disabled={!draft.trim() || isLoading}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 min-h-[44px]"
              >
                <Send className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{t.send}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      <ModelComparisonModal
        language={language}
        isOpen={isComparisonModalOpen}
        state={comparisonModalState}
        onClose={onCloseComparisonModal}
      />
    </section>
  );
}
