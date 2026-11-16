import type {
  LocalStorageServerInfo,
  WorkspaceSnapshotPayload,
} from "../utils/localDeviceStorage";

export interface DirectoryHandleLike {
  name: string;
  getFileHandle: (
    name: string,
    options?: { create?: boolean }
  ) => Promise<{
    createWritable: () => Promise<{
      write: (data: string) => Promise<void>;
      close: () => Promise<void>;
    }>;
  }>;
}

export function isNativeDirectoryPickerSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "showDirectoryPicker" in window &&
    typeof (window as unknown as { showDirectoryPicker?: unknown })
      .showDirectoryPicker === "function"
  );
}

export async function pickNativeComputerDirectory(): Promise<DirectoryHandleLike> {
  const picker = (
    window as unknown as {
      showDirectoryPicker?: (opts?: {
        id?: string;
        mode?: "read" | "readwrite";
      }) => Promise<DirectoryHandleLike>;
    }
  ).showDirectoryPicker;

  if (!picker) {
    throw new Error("NATIVE_PICKER_UNAVAILABLE");
  }

  return picker({ id: "rahal-plus-data", mode: "readwrite" });
}

export async function writeSnapshotToNativeDirectory(
  dirHandle: DirectoryHandleLike,
  snapshot: WorkspaceSnapshotPayload
): Promise<string[]> {
  const files: Array<[string, unknown]> = [
    ["workspace-state.json", snapshot],
    ["memories.json", snapshot.memories],
    ["tasks.json", snapshot.assistantTasks],
    ["notes.json", snapshot.notes],
    ["drafts.json", snapshot.publishDrafts],
    [
      "platforms.json",
      {
        customPlatforms: snapshot.customPlatforms,
        customGroups: snapshot.customGroups,
        favorites: snapshot.favorites,
      },
    ],
  ];

  const written: string[] = [];
  for (const [fileName, data] of files) {
    const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
    written.push(fileName);
  }
  return written;
}

export async function fetchLocalStorageInfo(): Promise<LocalStorageServerInfo> {
  const res = await fetch("/api/local-storage/info");
  if (!res.ok) {
    throw new Error("Failed to load local storage server info");
  }
  return (await res.json()) as LocalStorageServerInfo;
}

export async function configureLocalStorageFolder(params: {
  folderPath?: string;
  presetId?: string;
  connected?: boolean;
  migrateExisting?: boolean;
}): Promise<LocalStorageServerInfo> {
  const res = await fetch("/api/local-storage/configure", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = (await res.json()) as LocalStorageServerInfo & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || "Could not configure storage folder");
  }
  return data;
}

export async function disconnectLocalStorageServer(): Promise<LocalStorageServerInfo> {
  const res = await fetch("/api/local-storage/disconnect", {
    method: "POST",
  });
  if (!res.ok) {
    throw new Error("Could not disconnect local storage server");
  }
  return (await res.json()) as LocalStorageServerInfo;
}

export async function syncSnapshotToLocalServer(
  snapshot: WorkspaceSnapshotPayload,
  createBackup = false
): Promise<{
  ok: boolean;
  storageDir: string;
  savedAt: string;
  files: LocalStorageServerInfo["files"];
}> {
  const res = await fetch("/api/local-storage/state", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ snapshot, createBackup }),
  });
  const data = (await res.json()) as {
    ok?: boolean;
    storageDir?: string;
    savedAt?: string;
    files?: LocalStorageServerInfo["files"];
    error?: string;
  };
  if (!res.ok || !data.ok || !data.storageDir || !data.savedAt) {
    throw new Error(data.error || "Failed writing workspace data to folder");
  }
  return {
    ok: true,
    storageDir: data.storageDir,
    savedAt: data.savedAt,
    files: data.files ?? [],
  };
}

export async function loadSnapshotFromLocalServer(): Promise<{
  exists: boolean;
  snapshot: WorkspaceSnapshotPayload | null;
  storageDir: string;
}> {
  const res = await fetch("/api/local-storage/state");
  if (!res.ok) {
    throw new Error("Failed reading workspace data from folder");
  }
  return (await res.json()) as {
    exists: boolean;
    snapshot: WorkspaceSnapshotPayload | null;
    storageDir: string;
  };
}

export function downloadSnapshotJsonFile(snapshot: WorkspaceSnapshotPayload) {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  anchor.href = url;
  anchor.download = `rahal-plus-backup-${stamp}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
