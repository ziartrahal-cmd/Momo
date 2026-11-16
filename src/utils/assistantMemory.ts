export type MemoryCategory = "project" | "preference" | "goal" | "fact";

export interface MemoryItem {
  id: string;
  category: MemoryCategory;
  summary: string;
  createdAt: number;
  updatedAt: number;
}

export type AssistantTaskStatus = "pending" | "in_progress" | "done";
export type AssistantTaskKind =
  | "draft_post"
  | "save_note"
  | "research"
  | "self_improve";

export interface AssistantTask {
  id: string;
  title: string;
  details: string;
  kind: AssistantTaskKind;
  status: AssistantTaskStatus;
  resultSummary?: string;
  linkedArtifactType?: "draft" | "note";
  linkedArtifactTitle?: string;
  createdAt: number;
  completedAt?: number;
}

export interface SelfReflectionItem {
  id: string;
  insight: string;
  neededCapability: string;
  createdAt: number;
}

export interface AssistantWorkReport {
  id: string;
  memoryComparison: string;
  completedReport: string;
  createdTasksCount: number;
  addedMemoriesCount: number;
  artifactsCreated: Array<{ type: "draft" | "note"; title: string }>;
  selfReflection?: {
    insight: string;
    neededCapability: string;
  };
  createdAt: number;
}

export const MEMORY_CATEGORY_LABELS: Record<MemoryCategory, string> = {
  project: "مشروع",
  preference: "تفضيل",
  goal: "هدف",
  fact: "معلومة",
};

export const TASK_KIND_LABELS: Record<AssistantTaskKind, string> = {
  draft_post: "إعداد محتوى نشر",
  save_note: "توثيق في المفكرة",
  research: "تحليل ومتابعة",
  self_improve: "تطوير ذاتي",
};

export const TASK_STATUS_LABELS: Record<AssistantTaskStatus, string> = {
  pending: "قيد الانتظار",
  in_progress: "جاري التنفيذ",
  done: "تم الإنجاز",
};

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function mergeMemories(
  existing: MemoryItem[],
  incoming: Array<{ category: MemoryCategory; summary: string }>,
  now = Date.now()
): MemoryItem[] {
  const result = [...existing];

  for (const item of incoming) {
    const cleanSummary = item.summary.trim().replace(/\s+/g, " ");
    if (!cleanSummary || cleanSummary.length < 4) continue;

    const normalized = normalizeText(cleanSummary);
    const duplicateIdx = result.findIndex(
      (m) => normalizeText(m.summary) === normalized
    );

    if (duplicateIdx >= 0) {
      result[duplicateIdx] = {
        ...result[duplicateIdx],
        category: item.category,
        updatedAt: now,
      };
    } else {
      result.unshift({
        id: `mem-${now}-${Math.random().toString(36).slice(2, 7)}`,
        category: item.category,
        summary: cleanSummary.slice(0, 220),
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  return result.slice(0, 40);
}

export function createAssistantTask(
  input: {
    title: string;
    details: string;
    kind: AssistantTaskKind;
    status?: AssistantTaskStatus;
    resultSummary?: string;
    linkedArtifactType?: "draft" | "note";
    linkedArtifactTitle?: string;
  },
  now = Date.now()
): AssistantTask {
  const title = input.title.trim();
  if (!title) {
    throw new Error("يرجى كتابة عنوان المهمة.");
  }

  const status = input.status ?? "pending";
  return {
    id: `task-${now}-${Math.random().toString(36).slice(2, 7)}`,
    title: title.slice(0, 140),
    details: input.details.trim().slice(0, 500),
    kind: input.kind,
    status,
    ...(input.resultSummary ? { resultSummary: input.resultSummary.trim() } : {}),
    ...(input.linkedArtifactType
      ? { linkedArtifactType: input.linkedArtifactType }
      : {}),
    ...(input.linkedArtifactTitle
      ? { linkedArtifactTitle: input.linkedArtifactTitle }
      : {}),
    createdAt: now,
    ...(status === "done" ? { completedAt: now } : {}),
  };
}

export function updateAssistantTaskStatus(
  tasks: AssistantTask[],
  id: string,
  status: AssistantTaskStatus,
  updates?: {
    resultSummary?: string;
    linkedArtifactType?: "draft" | "note";
    linkedArtifactTitle?: string;
  },
  now = Date.now()
): AssistantTask[] {
  return tasks.map((task) => {
    if (task.id !== id) return task;
    return {
      ...task,
      status,
      ...(updates?.resultSummary ? { resultSummary: updates.resultSummary } : {}),
      ...(updates?.linkedArtifactType
        ? { linkedArtifactType: updates.linkedArtifactType }
        : {}),
      ...(updates?.linkedArtifactTitle
        ? { linkedArtifactTitle: updates.linkedArtifactTitle }
        : {}),
      completedAt: status === "done" ? now : undefined,
    };
  });
}

export function filterAssistantTasks(
  tasks: AssistantTask[],
  statusFilter: AssistantTaskStatus | "all"
): AssistantTask[] {
  if (statusFilter === "all") return tasks;
  return tasks.filter((t) => t.status === statusFilter);
}

export function buildMemoryPromptContext(options: {
  memories: MemoryItem[];
  tasks: AssistantTask[];
  reflections: SelfReflectionItem[];
  draftsCount: number;
  notesCount: number;
}): string {
  const lines: string[] = [];

  if (options.memories.length > 0) {
    lines.push("ما تتذكره عن المستخدم ومشاريعه السابقة:");
    for (const mem of options.memories.slice(0, 12)) {
      lines.push(`- [${MEMORY_CATEGORY_LABELS[mem.category]}] ${mem.summary}`);
    }
  }

  const openTasks = options.tasks.filter((t) => t.status !== "done");
  const doneTasks = options.tasks.filter((t) => t.status === "done");

  if (openTasks.length > 0) {
    lines.push("\nمهام المساعد المفتوحة حاليًا:");
    for (const t of openTasks.slice(0, 6)) {
      lines.push(`- ${t.title} (${TASK_KIND_LABELS[t.kind]})`);
    }
  }

  if (doneTasks.length > 0) {
    lines.push("\nأعمال أنجزها المساعد مؤخرًا:");
    for (const t of doneTasks.slice(0, 4)) {
      lines.push(`- ${t.title}${t.resultSummary ? `: ${t.resultSummary}` : ""}`);
    }
  }

  if (options.reflections.length > 0) {
    lines.push("\nملاحظات التطوير الذاتي للمساعد:");
    for (const r of options.reflections.slice(0, 4)) {
      lines.push(`- ${r.insight} (الاحتياج: ${r.neededCapability})`);
    }
  }

  lines.push(
    `\nحالة مساحة العمل: ${options.draftsCount} مسودة نشر مجدولة، و${options.notesCount} ملاحظة محفوظة.`
  );

  return lines.join("\n").slice(0, 1800);
}
