import { useMemo, useState } from "react";
import {
  BookmarkPlus,
  Check,
  Copy,
  ExternalLink,
  Layers,
  Loader2,
  Plus,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import type { PlatformEntry } from "../data/platforms";
import { UI_TEXT, type AppLanguage } from "../utils/i18n";
import {
  buildPlatformLaunchUrl,
  createCustomPlatformGroup,
  getSuitePlatforms,
  PLATFORM_SUITES,
  resolvePlatformsByIds,
  togglePlatformInSelection,
  validateCustomGroupInput,
  type CustomPlatformGroup,
  type OrchestrationPlanResult,
  type SuiteId,
} from "../utils/platformBundles";
import type { PublishDraftInput } from "../utils/publishing";

interface UnifiedPlatformOrchestratorProps {
  language: AppLanguage;
  memoryContext: string;
  googleAccountEmail?: string | null;
  platforms: PlatformEntry[];
  customGroups: CustomPlatformGroup[];
  onAddCustomGroup: (group: CustomPlatformGroup) => void;
  onDeleteCustomGroup: (id: string) => void;
  onPushDraftToPublishing: (draft: PublishDraftInput) => void;
  onSaveToNotes: (title: string, content: string) => void;
  onSendToGemini: (promptText: string) => void;
}

export function UnifiedPlatformOrchestrator({
  language,
  memoryContext,
  googleAccountEmail,
  platforms,
  customGroups,
  onAddCustomGroup,
  onDeleteCustomGroup,
  onPushDraftToPublishing,
  onSaveToNotes,
  onSendToGemini,
}: UnifiedPlatformOrchestratorProps) {
  const t = UI_TEXT[language].directory.orchestrator;

  const [selectedTarget, setSelectedTarget] = useState<string>("suite:all-in-one");
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [builderIds, setBuilderIds] = useState<string[]>([
    "gemini",
    "youtube",
    "facebook",
    "instagram",
    "tiktok",
  ]);
  const [builderError, setBuilderError] = useState<string | null>(null);

  const [goal, setGoal] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [plan, setPlan] = useState<OrchestrationPlanResult | null>(null);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const activeBundle = useMemo(() => {
    if (selectedTarget.startsWith("custom:")) {
      const gid = selectedTarget.slice(7);
      const custom = customGroups.find((g) => g.id === gid);
      if (custom) {
        return {
          name: custom.name,
          description: `${custom.platformIds.length} ${t.selectedPlatformsCount}`,
          platforms: resolvePlatformsByIds(platforms, custom.platformIds),
        };
      }
    }

    const suiteId = (
      selectedTarget.startsWith("suite:")
        ? selectedTarget.slice(6)
        : "all-in-one"
    ) as SuiteId;
    const suite =
      PLATFORM_SUITES.find((s) => s.id === suiteId) ?? PLATFORM_SUITES[0];
    return {
      name: suite.labels[language].name,
      description: suite.labels[language].workflowSummary,
      platforms: getSuitePlatforms(suite.id, platforms),
    };
  }, [selectedTarget, customGroups, platforms, language, t.selectedPlatformsCount]);

  function handleSaveCustomGroup(e: React.FormEvent) {
    e.preventDefault();
    const check = validateCustomGroupInput(groupName, builderIds, language);
    if (!check.valid) {
      setBuilderError(check.error ?? "Invalid group");
      return;
    }

    const created = createCustomPlatformGroup(
      { name: groupName, platformIds: builderIds },
      language
    );
    onAddCustomGroup(created);
    setSelectedTarget(`custom:${created.id}`);
    setGroupName("");
    setBuilderError(null);
    setIsBuilderOpen(false);
  }

  async function handleRunPipeline(e: React.FormEvent) {
    e.preventDefault();
    const cleanGoal = goal.trim();
    if (!cleanGoal || isRunning || activeBundle.platforms.length === 0) return;

    setIsRunning(true);
    setRunError(null);
    setActionNotice(null);

    try {
      const response = await fetch("/api/workflows/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: cleanGoal,
          suiteName: activeBundle.name,
          platforms: activeBundle.platforms.map((p) => ({
            id: p.id,
            name: p.name,
            category: p.category,
            url: buildPlatformLaunchUrl(p.url, googleAccountEmail),
          })),
          language,
          memoryContext,
          googleAccountEmail: googleAccountEmail ?? "",
        }),
      });

      const data = (await response.json()) as OrchestrationPlanResult & {
        error?: string;
      };
      if (!response.ok || !data.summary) {
        setRunError(
          data.error ??
            (language === "en"
              ? "Could not orchestrate this platform group."
              : language === "ru"
              ? "Не удалось согласовать работу этой группы платформ."
              : "تعذر تنسيق هذه المجموعة من المنصات حالياً.")
        );
        return;
      }

      setPlan(data);
    } catch {
      setRunError(
        language === "en"
          ? "Network error while contacting the orchestrator."
          : language === "ru"
          ? "Ошибка сети при обращении к серверу."
          : "تعذر الاتصال بالخادم لتشغيل المجموعة المدمجة."
      );
    } finally {
      setIsRunning(false);
    }
  }

  async function handleCopy(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 1800);
    } catch {
      // Clipboard blocked
    }
  }

  function handlePushDraft() {
    if (!plan) return;
    if (plan.unifiedDraft) {
      onPushDraftToPublishing({
        title: plan.unifiedDraft.title,
        caption: plan.unifiedDraft.caption,
        targets: plan.unifiedDraft.targets,
        status: "ready",
      });
    } else {
      onPushDraftToPublishing({
        title: `${plan.suiteName}`.slice(0, 100),
        caption: plan.sharedMasterBrief || plan.summary,
        targets: ["youtube", "google", "facebook", "instagram", "tiktok"],
        status: "draft",
      });
    }
    setActionNotice(t.pushedPublishingNotice);
    setTimeout(() => setActionNotice(null), 2600);
  }

  function handleSavePlanNote() {
    if (!plan) return;
    if (plan.checklistNote) {
      onSaveToNotes(plan.checklistNote.title, plan.checklistNote.content);
    } else {
      const stepsText = plan.platformSteps
        .map((s) => `- ${s.platformName}: ${s.roleInChain}\n  ${s.tailoredPrompt}`)
        .join("\n\n");
      onSaveToNotes(
        plan.suiteName,
        `${plan.summary}\n\n${plan.sharedMasterBrief}\n\n${stepsText}`.trim()
      );
    }
    setActionNotice(t.savedNoteNotice);
    setTimeout(() => setActionNotice(null), 2600);
  }

  return (
    <div
      data-testid="unified-platform-orchestrator"
      className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1 max-w-2xl">
          <div className="flex items-center gap-2 text-blue-800">
            <Layers className="w-4 h-4 shrink-0" aria-hidden="true" />
            <h2 className="font-display text-lg font-bold text-slate-900">
              {t.title}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {t.subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setBuilderError(null);
            setIsBuilderOpen((prev) => !prev);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-blue-700 bg-blue-50/80 border border-blue-200 hover:bg-blue-100 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start"
        >
          {isBuilderOpen ? (
            <>
              <X className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t.cancelBtn}</span>
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t.createGroupBtn}</span>
            </>
          )}
        </button>
      </div>

      {/* Custom Group Builder */}
      {isBuilderOpen && (
        <form
          onSubmit={handleSaveCustomGroup}
          className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-4"
        >
          <div>
            <label
              htmlFor="custom-group-name"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              {t.groupNameLabel}
            </label>
            <input
              id="custom-group-name"
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder={t.groupNamePlaceholder}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none min-h-[40px]"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-700">
              <span>{t.selectPlatformsHint}</span>
              <span className="font-mono tabular-nums text-blue-700">
                {builderIds.length}
              </span>
            </div>
            <div className="max-h-44 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-2 bg-white border border-slate-200 rounded-lg">
              {platforms.map((p) => {
                const selected = builderIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={selected}
                    aria-label={`${t.togglePlatformPrefix} ${p.name}`}
                    onClick={() =>
                      setBuilderIds((prev) =>
                        togglePlatformInSelection(prev, p.id)
                      )
                    }
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-md border text-start truncate transition-colors ${
                      selected
                        ? "bg-blue-700 text-white border-blue-700"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>

          {builderError && (
            <p role="alert" className="text-xs text-red-700">
              {builderError}
            </p>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setBuilderError(null);
                setIsBuilderOpen(false);
              }}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg whitespace-nowrap"
            >
              {t.cancelBtn}
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg whitespace-nowrap"
            >
              {t.saveGroupBtn}
            </button>
          </div>
        </form>
      )}

      {/* Suite Selector + Custom Groups */}
      <div className="space-y-3">
        <div className="text-xs font-semibold text-slate-600">{t.presetsLabel}</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {PLATFORM_SUITES.map((suite) => {
            const key = `suite:${suite.id}`;
            const active = selectedTarget === key;
            const label = suite.labels[language];
            const memberCount = getSuitePlatforms(suite.id, platforms).length;
            return (
              <button
                key={suite.id}
                type="button"
                aria-pressed={active}
                onClick={() => setSelectedTarget(key)}
                className={`p-3 rounded-lg border text-start transition-colors flex flex-col justify-between gap-1.5 ${
                  active
                    ? "bg-blue-50/70 border-blue-700 text-slate-900"
                    : "bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900">
                    {label.name}
                  </span>
                  <span className="font-mono tabular-nums text-[11px] text-slate-500 shrink-0">
                    {memberCount}
                  </span>
                </div>
                <span className="text-[11px] text-slate-600 line-clamp-2">
                  {label.tagline}
                </span>
              </button>
            );
          })}
        </div>

        {customGroups.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="text-xs font-semibold text-slate-600">
              {t.customGroupsLabel}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {customGroups.map((group) => {
                const key = `custom:${group.id}`;
                const active = selectedTarget === key;
                return (
                  <div
                    key={group.id}
                    className={`inline-flex items-center rounded-lg border overflow-hidden ${
                      active
                        ? "border-blue-700 bg-blue-50/70"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSelectedTarget(key)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-900 hover:bg-slate-50 whitespace-nowrap"
                    >
                      {group.name}{" "}
                      <span className="font-mono tabular-nums text-slate-500">
                        ({group.platformIds.length})
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedTarget === key) {
                          setSelectedTarget("suite:all-in-one");
                        }
                        onDeleteCustomGroup(group.id);
                      }}
                      aria-label={`${t.deleteGroupPrefix} ${group.name}`}
                      className="px-2 py-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 border-s border-slate-200"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Active Merged Bundle Preview + Google Account binding */}
      <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3.5 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-slate-800">
            {activeBundle.name} —{" "}
            <span className="font-mono tabular-nums text-blue-700">
              {activeBundle.platforms.length}
            </span>{" "}
            {t.selectedPlatformsCount}
          </span>
          {googleAccountEmail && (
            <span dir="ltr" className="font-mono text-[11px] text-emerald-700">
              {googleAccountEmail}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-600">{activeBundle.description}</p>
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {activeBundle.platforms.map((p) => (
            <a
              key={p.id}
              href={buildPlatformLaunchUrl(p.url, googleAccountEmail)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-700 rounded-md transition-colors whitespace-nowrap"
            >
              <span>{p.name}</span>
              <ExternalLink className="w-3 h-3 text-slate-400" aria-hidden="true" />
            </a>
          ))}
        </div>
      </div>

      {/* Orchestration Goal Input */}
      <form onSubmit={handleRunPipeline} className="space-y-3">
        <div>
          <label
            htmlFor="orchestrator-goal-input"
            className="block text-xs font-semibold text-slate-700 mb-1"
          >
            {t.goalLabel}
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="orchestrator-goal-input"
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder={t.goalPlaceholder}
              className="flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none min-h-[42px]"
            />
            <button
              type="submit"
              disabled={!goal.trim() || isRunning}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg disabled:bg-slate-300 whitespace-nowrap shrink-0 min-h-[42px]"
            >
              {isRunning ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="w-4 h-4" aria-hidden="true" />
              )}
              <span>{isRunning ? t.runningPipelineBtn : t.runPipelineBtn}</span>
            </button>
          </div>
        </div>
      </form>

      {runError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800"
        >
          {runError}
        </div>
      )}

      {/* Orchestration Result */}
      {plan && (
        <div
          data-testid="orchestration-plan-result"
          className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-4"
        >
          <div className="space-y-2">
            <p className="text-sm text-slate-800 leading-relaxed">{plan.summary}</p>

            {plan.sharedMasterBrief && (
              <div className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    {t.masterBriefTitle}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy("master", plan.sharedMasterBrief)}
                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded"
                  >
                    {copiedKey === "master" ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" aria-hidden="true" />
                        <span>{t.copiedPrompt}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" aria-hidden="true" />
                        <span>{t.copyPrompt}</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {plan.sharedMasterBrief}
                </p>
              </div>
            )}
          </div>

          {plan.platformSteps.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-800">{t.stepsTitle}</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {plan.platformSteps.map((step, idx) => (
                  <div
                    key={`${step.platformId}-${idx}`}
                    className="rounded-lg border border-slate-200 bg-white p-3.5 flex flex-col justify-between gap-2.5"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display text-sm font-bold text-slate-900">
                          {step.platformName}
                        </span>
                        {step.actionUrl && (
                          <a
                            href={buildPlatformLaunchUrl(
                              step.actionUrl,
                              googleAccountEmail
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 hover:underline whitespace-nowrap"
                          >
                            <span>{t.openPlatform}</span>
                            <ExternalLink className="w-3 h-3" aria-hidden="true" />
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-slate-600">{step.roleInChain}</p>
                      {step.tailoredPrompt && (
                        <p className="mt-1.5 rounded border border-slate-100 bg-slate-50 p-2 text-[11px] text-slate-800 whitespace-pre-wrap">
                          {step.tailoredPrompt}
                        </p>
                      )}
                    </div>

                    {step.tailoredPrompt && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(`step-${idx}`, step.tailoredPrompt)
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded"
                        >
                          {copiedKey === `step-${idx}` ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" aria-hidden="true" />
                              <span>{t.copiedPrompt}</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" aria-hidden="true" />
                              <span>{t.copyPrompt}</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cross-Workspace Handoff Actions */}
          <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePushDraft}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg whitespace-nowrap"
            >
              <Send className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t.pushToPublishingBtn}</span>
            </button>

            <button
              type="button"
              onClick={handleSavePlanNote}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg whitespace-nowrap"
            >
              <BookmarkPlus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t.saveNoteBtn}</span>
            </button>

            <button
              type="button"
              onClick={() =>
                onSendToGemini(
                  `${plan.suiteName}\n${plan.summary}\n\n${plan.sharedMasterBrief}`
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t.sendToGeminiBtn}</span>
            </button>
          </div>

          {actionNotice && (
            <div
              role="status"
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800"
            >
              {actionNotice}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
