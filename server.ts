import "dotenv/config";
import express from "express";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  GoogleGenAI,
  Modality,
  Type,
  type LiveServerMessage,
} from "@google/genai";
import { WebSocket, WebSocketServer } from "ws";
import {
  expandHomeDirectory,
  validateStorageFolderPath,
  type LocalStorageServerInfo,
  type StorageFileEntry,
  type StoragePresetOption,
  type WorkspaceSnapshotPayload,
} from "./src/utils/localDeviceStorage";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type AssistantMode = "general" | "writing" | "coding" | "summarize";

interface ChatTurn {
  role: "user" | "model";
  text: string;
}

const MODE_INSTRUCTIONS: Record<AssistantMode, string> = {
  general:
    "أنت مساعد عملي واضح ومباشر تجيب باللغة العربية السلسة ما لم يطلب المستخدم لغة أخرى. قدّم إجابات دقيقة وعملية بدون مبالغة.",
  writing:
    "أنت محرر وصائغ نصوص محترف. ساعد المستخدم في كتابة المقالات والرسائل وتحسين صياغة الأوامر والنصوص بأسلوب عربي واضح ومترابط.",
  coding:
    "أنت مهندس برمجيات خبير. اشرح الحلول البرمجية بوضوح واكتب شيفرة برمجية نظيفة وعملية مع توضيح الخطوات بإيجاز.",
  summarize:
    "أنت مختص في تلخيص المعلومات وتنظيم الأفكار. حوّل النصوص والموضوعات المعقدة إلى نقاط مركزة وواضحة وسهلة المراجعة.",
};

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function mapGeminiError(err: unknown): { statusCode: number; error: string } {
  const message = err instanceof Error ? err.message : String(err);
  const status =
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    typeof (err as { status?: unknown }).status === "number"
      ? (err as { status: number }).status
      : undefined;

  if (
    status === 429 ||
    message.includes("429") ||
    message.includes("RESOURCE_EXHAUSTED")
  ) {
    return {
      statusCode: 429,
      error: "تم تجاوز حد الطلبات المؤقت للخدمة. انتظر قليلاً ثم أعد المحاولة.",
    };
  }
  if (
    status === 403 ||
    status === 400 ||
    message.includes("403") ||
    message.includes("400") ||
    message.includes("API_KEY_INVALID") ||
    message.includes("PERMISSION_DENIED")
  ) {
    return {
      statusCode: 403,
      error:
        "تعذر التحقق من صلاحية مفتاح Gemini في إعدادات Secrets الخاصة بالمشروع.",
    };
  }
  return {
    statusCode: 500,
    error: "حدث خطأ أثناء الاتصال بخدمة Gemini. يرجى المحاولة مرة أخرى.",
  };
}

function sanitizeChatMessages(rawMessages: unknown): ChatTurn[] {
  if (!Array.isArray(rawMessages)) return [];
  return rawMessages
    .filter(
      (item): item is ChatTurn =>
        typeof item === "object" &&
        item !== null &&
        ((item as ChatTurn).role === "user" ||
          (item as ChatTurn).role === "model") &&
        typeof (item as ChatTurn).text === "string" &&
        (item as ChatTurn).text.trim().length > 0
    )
    .slice(-20);
}

type AppLanguage = "ar" | "en" | "ru";

function sanitizeLanguage(raw: unknown): AppLanguage {
  if (raw === "en" || raw === "ru") return raw;
  return "ar";
}

const LANGUAGE_DIRECTIVES: Record<AppLanguage, string> = {
  ar: "أجب باللغة العربية الواضحة ما لم يطلب المستخدم لغة أخرى في رسالته.",
  en: "Respond in clear, natural English unless the user explicitly writes or asks for another language.",
  ru: "Отвечай на ясном, естественном русском языке, если пользователь явно не попросит другой язык.",
};

function buildSystemInstruction(
  baseInstruction: string,
  rawMemoryContext: unknown,
  language: AppLanguage = "ar"
): string {
  const parts = [baseInstruction, LANGUAGE_DIRECTIVES[language]];
  if (typeof rawMemoryContext === "string") {
    const trimmed = rawMemoryContext.trim().slice(0, 2000);
    if (trimmed) {
      parts.push(
        `User Personal Memory & Past Projects Context (compare with previous context and execute practically when helpful):\n${trimmed}`
      );
    }
  }
  return parts.join("\n\n");
}

type PublishPlatformTarget =
  | "youtube"
  | "google"
  | "facebook"
  | "instagram"
  | "tiktok";

function sanitizePublishTargets(raw: unknown): PublishPlatformTarget[] {
  if (!Array.isArray(raw)) return ["youtube"];
  const allowed = new Set<PublishPlatformTarget>([
    "youtube",
    "google",
    "facebook",
    "instagram",
    "tiktok",
  ]);
  const valid = raw.filter(
    (item): item is PublishPlatformTarget =>
      typeof item === "string" && allowed.has(item as PublishPlatformTarget)
  );
  return valid.length > 0 ? Array.from(new Set(valid)) : ["youtube"];
}

type SocialProviderId = "facebook" | "instagram" | "tiktok";

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  const result: Record<string, string> = {};
  for (const pair of cookieHeader.split(";")) {
    const idx = pair.indexOf("=");
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    if (!key) continue;
    try {
      result[key] = decodeURIComponent(val);
    } catch {
      result[key] = val;
    }
  }
  return result;
}

function getBaseAppUrl(): string {
  const configured = process.env.APP_URL?.trim();
  if (configured && configured !== "MY_APP_URL") {
    return configured.replace(/\/+$/, "");
  }
  const port = Number(process.env.PORT) || 3000;
  return `http://localhost:${port}`;
}

function getSocialRedirectUri(provider: SocialProviderId): string {
  return `${getBaseAppUrl()}/auth/social/${provider}/callback`;
}

function isSocialProviderConfigured(provider: SocialProviderId): boolean {
  if (provider === "tiktok") {
    return Boolean(
      process.env.TIKTOK_CLIENT_KEY?.trim() &&
        process.env.TIKTOK_CLIENT_SECRET?.trim()
    );
  }
  return Boolean(
    process.env.META_APP_ID?.trim() && process.env.META_APP_SECRET?.trim()
  );
}

function isSocialProviderConnected(
  req: express.Request,
  provider: SocialProviderId
): boolean {
  const cookies = parseCookies(req.headers.cookie);
  return Boolean(cookies[`social_token_${provider}`]);
}

interface LocalStorageConfigRecord {
  storageDir: string;
  connected: boolean;
  lastSyncedAt: string | null;
}

const STORAGE_CONFIG_FILE = path.resolve(__dirname, ".rahal-storage-config.json");
const DEFAULT_LOCAL_STORAGE_DIR = path.resolve(__dirname, "rahal-plus-data");

function getStoragePresetOptions(): StoragePresetOption[] {
  const home = os.homedir();
  return [
    {
      id: "project",
      label: "Workspace Folder",
      path: DEFAULT_LOCAL_STORAGE_DIR,
    },
    {
      id: "home",
      label: "Home ~/RahalPlusData",
      path: path.join(home, "RahalPlusData"),
    },
    {
      id: "documents",
      label: "Documents ~/Documents/RahalPlusData",
      path: path.join(home, "Documents", "RahalPlusData"),
    },
    {
      id: "desktop",
      label: "Desktop ~/Desktop/RahalPlusData",
      path: path.join(home, "Desktop", "RahalPlusData"),
    },
  ];
}

function readLocalStorageConfig(): LocalStorageConfigRecord {
  try {
    if (fs.existsSync(STORAGE_CONFIG_FILE)) {
      const raw = fs.readFileSync(STORAGE_CONFIG_FILE, "utf8");
      const parsed = JSON.parse(raw) as Partial<LocalStorageConfigRecord>;
      if (typeof parsed.storageDir === "string" && parsed.storageDir.trim()) {
        return {
          storageDir: path.resolve(parsed.storageDir.trim()),
          connected: Boolean(parsed.connected),
          lastSyncedAt:
            typeof parsed.lastSyncedAt === "string" ? parsed.lastSyncedAt : null,
        };
      }
    }
  } catch {
    // Fall back to default config
  }
  return {
    storageDir: DEFAULT_LOCAL_STORAGE_DIR,
    connected: false,
    lastSyncedAt: null,
  };
}

function writeLocalStorageConfig(config: LocalStorageConfigRecord) {
  fs.writeFileSync(STORAGE_CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");
}

function listStorageFiles(dirPath: string): StorageFileEntry[] {
  try {
    if (!fs.existsSync(dirPath)) return [];
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const files: StorageFileEntry[] = [];
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
      const full = path.join(dirPath, entry.name);
      const stat = fs.statSync(full);
      files.push({
        name: entry.name,
        sizeBytes: stat.size,
        updatedAt: stat.mtime.toISOString(),
      });
    }
    return files.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

function buildLocalStorageInfo(): LocalStorageServerInfo {
  const cfg = readLocalStorageConfig();
  const dirExists = fs.existsSync(cfg.storageDir);
  const files = dirExists ? listStorageFiles(cfg.storageDir) : [];
  const hasSavedState = files.some((f) => f.name === "workspace-state.json");
  return {
    connected: cfg.connected,
    storageDir: cfg.storageDir,
    dirExists,
    presets: getStoragePresetOptions(),
    files,
    hasSavedState,
    lastSyncedAt: cfg.lastSyncedAt,
  };
}

function writeSnapshotFilesToDisk(
  targetDir: string,
  snapshot: WorkspaceSnapshotPayload,
  createBackup: boolean
) {
  fs.mkdirSync(targetDir, { recursive: true });
  const filePayloads: Array<[string, unknown]> = [
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
    ["conversations.json", snapshot.messages],
  ];

  for (const [fileName, data] of filePayloads) {
    const dest = path.join(targetDir, fileName);
    const tmp = `${dest}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
    fs.renameSync(tmp, dest);
  }

  if (createBackup) {
    const snapshotsDir = path.join(targetDir, "snapshots");
    fs.mkdirSync(snapshotsDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFile = path.join(snapshotsDir, `backup-${stamp}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(snapshot, null, 2), "utf8");
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "4mb" }));

  app.get("/api/social/providers/status", (req, res) => {
    const providers: SocialProviderId[] = ["facebook", "instagram", "tiktok"];
    const status = Object.fromEntries(
      providers.map((provider) => [
        provider,
        {
          configured: isSocialProviderConfigured(provider),
          connected: isSocialProviderConnected(req, provider),
          redirectUri: getSocialRedirectUri(provider),
          requiredEnvVars:
            provider === "tiktok"
              ? ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"]
              : ["META_APP_ID", "META_APP_SECRET"],
        },
      ])
    );
    res.json({ providers: status });
  });

  app.get("/api/social/oauth/:provider/url", (req, res) => {
    const provider = req.params.provider as SocialProviderId;
    if (
      provider !== "facebook" &&
      provider !== "instagram" &&
      provider !== "tiktok"
    ) {
      res.status(400).json({ error: "منصة غير مدعومة." });
      return;
    }

    const redirectUri = getSocialRedirectUri(provider);
    if (!isSocialProviderConfigured(provider)) {
      const envHelp =
        provider === "tiktok"
          ? "TIKTOK_CLIENT_KEY و TIKTOK_CLIENT_SECRET"
          : "META_APP_ID و META_APP_SECRET";
      res.status(400).json({
        error: `يرجى إضافة مفاتيح ${envHelp} في إعدادات Secrets وتسجيل رابط العودة: ${redirectUri}`,
        redirectUri,
      });
      return;
    }

    const state = `${provider}_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    if (provider === "tiktok") {
      const params = new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY!,
        scope: "user.info.basic,video.publish,video.upload",
        response_type: "code",
        redirect_uri: redirectUri,
        state,
      });
      res.json({
        url: `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`,
      });
      return;
    }

    const scope =
      provider === "instagram"
        ? "instagram_basic,instagram_content_publish,pages_show_list"
        : "pages_show_list,pages_manage_posts,pages_read_engagement";

    const params = new URLSearchParams({
      client_id: process.env.META_APP_ID!,
      redirect_uri: redirectUri,
      state,
      scope,
      response_type: "code",
    });

    res.json({
      url: `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`,
    });
  });

  app.get(
    ["/auth/social/:provider/callback", "/auth/social/:provider/callback/"],
    async (req, res) => {
      const provider = req.params.provider as SocialProviderId;
      const sendPopupError = (message: string, statusCode = 400) => {
        res.status(statusCode).send(`
          <html lang="ar" dir="rtl">
            <body style="font-family: sans-serif; padding: 24px; text-align: center;">
              <script>
                if (window.opener) {
                  window.opener.postMessage({
                    type: 'OAUTH_AUTH_ERROR',
                    provider: ${JSON.stringify(provider)},
                    error: ${JSON.stringify(message)}
                  }, '*');
                  window.close();
                }
              </script>
              <p>${message.replace(/[<>&"]/g, "")}</p>
            </body>
          </html>
        `);
      };

      const oauthError =
        typeof req.query.error_description === "string"
          ? req.query.error_description.trim()
          : typeof req.query.error === "string"
          ? req.query.error.trim()
          : "";

      if (oauthError) {
        sendPopupError(oauthError, 400);
        return;
      }

      const code =
        typeof req.query.code === "string" ? req.query.code.trim() : "";

      if (
        (provider !== "facebook" &&
          provider !== "instagram" &&
          provider !== "tiktok") ||
        !code
      ) {
        sendPopupError("Missing OAuth authorization code.", 400);
        return;
      }

      const redirectUri = getSocialRedirectUri(provider);

      try {
        let accessToken = "";

        if (provider === "tiktok") {
          const tokenRes = await fetch(
            "https://open.tiktokapis.com/v2/oauth/token/",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                client_key: process.env.TIKTOK_CLIENT_KEY ?? "",
                client_secret: process.env.TIKTOK_CLIENT_SECRET ?? "",
                code,
                grant_type: "authorization_code",
                redirect_uri: redirectUri,
              }),
            }
          );
          const tokenData = (await tokenRes.json()) as {
            access_token?: string;
            error_description?: string;
          };
          if (!tokenRes.ok || !tokenData.access_token) {
            throw new Error(
              tokenData.error_description || "TikTok token exchange failed"
            );
          }
          accessToken = tokenData.access_token;
        } else {
          const params = new URLSearchParams({
            client_id: process.env.META_APP_ID ?? "",
            client_secret: process.env.META_APP_SECRET ?? "",
            redirect_uri: redirectUri,
            code,
          });
          const tokenRes = await fetch(
            `https://graph.facebook.com/v21.0/oauth/access_token?${params.toString()}`
          );
          const tokenData = (await tokenRes.json()) as {
            access_token?: string;
            error?: { message?: string };
          };
          if (!tokenRes.ok || !tokenData.access_token) {
            throw new Error(
              tokenData.error?.message || "Meta token exchange failed"
            );
          }
          accessToken = tokenData.access_token;
        }

        res.cookie(`social_token_${provider}`, accessToken, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
          maxAge: 1000 * 60 * 60 * 24 * 7,
        });

        res.send(`
          <html lang="ar" dir="rtl">
            <body style="font-family: sans-serif; padding: 24px; text-align: center;">
              <script>
                if (window.opener) {
                  window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', provider: ${JSON.stringify(
                    provider
                  )} }, '*');
                  window.close();
                } else {
                  window.location.href = '/';
                }
              </script>
              <p>تم ربط الحساب بنجاح. يمكنك إغلاق هذه النافذة الآن.</p>
            </body>
          </html>
        `);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "OAuth error";
        sendPopupError(`OAuth callback failed: ${msg}`, 500);
      }
    }
  );

  app.post("/api/social/disconnect/:provider", (req, res) => {
    const provider = req.params.provider as SocialProviderId;
    if (
      provider !== "facebook" &&
      provider !== "instagram" &&
      provider !== "tiktok"
    ) {
      res.status(400).json({ error: "منصة غير مدعومة." });
      return;
    }
    res.clearCookie(`social_token_${provider}`, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });
    res.json({ disconnected: true });
  });

  app.post("/api/social/publish/facebook", async (req, res) => {
    const cookies = parseCookies(req.headers.cookie);
    const userToken = cookies.social_token_facebook;
    if (!userToken) {
      res.status(401).json({ error: "يرجى ربط حساب فيسبوك أولاً." });
      return;
    }

    const body = req.body as { message?: unknown };
    const message =
      typeof body.message === "string" ? body.message.trim() : "";
    if (!message) {
      res.status(400).json({ error: "يرجى كتابة نص المنشور." });
      return;
    }

    try {
      const pagesRes = await fetch(
        `https://graph.facebook.com/v21.0/me/accounts?access_token=${encodeURIComponent(
          userToken
        )}`
      );
      const pagesData = (await pagesRes.json()) as {
        data?: Array<{ id: string; name: string; access_token: string }>;
        error?: { message?: string };
      };
      const firstPage = pagesData.data?.[0];
      if (!firstPage) {
        res.status(400).json({
          error:
            pagesData.error?.message ||
            "لم يتم العثور على صفحة فيسبوك مرتبطة بصلاحية النشر.",
        });
        return;
      }

      const publishRes = await fetch(
        `https://graph.facebook.com/v21.0/${encodeURIComponent(
          firstPage.id
        )}/feed`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            access_token: firstPage.access_token,
          }),
        }
      );
      const publishData = (await publishRes.json()) as {
        id?: string;
        error?: { message?: string };
      };
      if (!publishRes.ok || !publishData.id) {
        res.status(502).json({
          error: publishData.error?.message || "تعذر النشر على صفحة فيسبوك.",
        });
        return;
      }
      res.json({ postId: publishData.id, pageName: firstPage.name });
    } catch {
      res.status(500).json({ error: "تعذر الاتصال بواجهة Facebook Graph API." });
    }
  });

  app.post("/api/social/publish/unified", async (req, res) => {
    const body = req.body as {
      title?: unknown;
      message?: unknown;
      mediaUrl?: unknown;
      targets?: unknown;
      googleConnected?: unknown;
    };

    const message =
      typeof body.message === "string" ? body.message.trim() : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const mediaUrl =
      typeof body.mediaUrl === "string" ? body.mediaUrl.trim() : "";
    const targets = sanitizePublishTargets(body.targets);
    const googleConnected = Boolean(body.googleConnected);

    if (!message && !title) {
      res.status(400).json({ error: "Please enter a title or caption." });
      return;
    }

    const combinedText = title && message ? `${title}\n\n${message}` : message || title;
    const cookies = parseCookies(req.headers.cookie);

    const results = await Promise.all(
      targets.map(async (target) => {
        if (target === "facebook") {
          const fbToken = cookies.social_token_facebook;
          if (!fbToken) {
            return {
              platform: target,
              status: "needs_auth",
              detail: "Facebook OAuth not connected yet",
              actionUrl: "https://business.facebook.com",
            };
          }
          try {
            const pagesRes = await fetch(
              `https://graph.facebook.com/v21.0/me/accounts?access_token=${encodeURIComponent(
                fbToken
              )}`
            );
            const pagesData = (await pagesRes.json()) as {
              data?: Array<{ id: string; name: string; access_token: string }>;
              error?: { message?: string };
            };
            const firstPage = pagesData.data?.[0];
            if (!firstPage) {
              return {
                platform: target,
                status: "error",
                detail: pagesData.error?.message || "No publishable Facebook Page found",
                actionUrl: "https://business.facebook.com",
              };
            }
            const pubRes = await fetch(
              `https://graph.facebook.com/v21.0/${encodeURIComponent(firstPage.id)}/feed`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  message: combinedText,
                  access_token: firstPage.access_token,
                }),
              }
            );
            const pubData = (await pubRes.json()) as {
              id?: string;
              error?: { message?: string };
            };
            if (!pubRes.ok || !pubData.id) {
              return {
                platform: target,
                status: "error",
                detail: pubData.error?.message || "Failed to post on Facebook Page",
                actionUrl: "https://business.facebook.com",
              };
            }
            return {
              platform: target,
              status: "published",
              detail: `${firstPage.name} (${pubData.id})`,
              actionUrl: `https://www.facebook.com/${pubData.id}`,
            };
          } catch {
            return {
              platform: target,
              status: "error",
              detail: "Network error reaching Facebook Graph API",
              actionUrl: "https://business.facebook.com",
            };
          }
        }

        if (target === "instagram") {
          const igToken = cookies.social_token_instagram;
          if (!igToken) {
            return {
              platform: target,
              status: "needs_auth",
              detail: "Instagram OAuth not connected yet",
              actionUrl: "https://www.instagram.com",
            };
          }
          if (!mediaUrl || !/^https?:\/\//i.test(mediaUrl)) {
            return {
              platform: target,
              status: "needs_media",
              detail: "Instagram API requires a public image/video URL",
              actionUrl: "https://business.facebook.com",
            };
          }
          try {
            const acctRes = await fetch(
              `https://graph.facebook.com/v21.0/me/accounts?fields=instagram_business_account{id,username}&access_token=${encodeURIComponent(
                igToken
              )}`
            );
            const acctData = (await acctRes.json()) as {
              data?: Array<{
                instagram_business_account?: { id: string; username?: string };
              }>;
              error?: { message?: string };
            };
            const igAcct = acctData.data?.find(
              (item) => item.instagram_business_account?.id
            )?.instagram_business_account;
            if (!igAcct) {
              return {
                platform: target,
                status: "error",
                detail: acctData.error?.message || "No linked Instagram Business Account found",
                actionUrl: "https://www.instagram.com",
              };
            }
            const isVideo = /\.(mp4|mov|webm)(\?|$)/i.test(mediaUrl);
            const containerPayload: Record<string, string> = {
              caption: combinedText,
              access_token: igToken,
              ...(isVideo
                ? { media_type: "REELS", video_url: mediaUrl }
                : { image_url: mediaUrl }),
            };
            const createRes = await fetch(
              `https://graph.facebook.com/v21.0/${encodeURIComponent(igAcct.id)}/media`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(containerPayload),
              }
            );
            const createData = (await createRes.json()) as {
              id?: string;
              error?: { message?: string };
            };
            if (!createRes.ok || !createData.id) {
              return {
                platform: target,
                status: "error",
                detail: createData.error?.message || "Failed creating Instagram media container",
                actionUrl: "https://www.instagram.com",
              };
            }
            const publishRes = await fetch(
              `https://graph.facebook.com/v21.0/${encodeURIComponent(igAcct.id)}/media_publish`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  creation_id: createData.id,
                  access_token: igToken,
                }),
              }
            );
            const publishData = (await publishRes.json()) as {
              id?: string;
              error?: { message?: string };
            };
            if (!publishRes.ok || !publishData.id) {
              return {
                platform: target,
                status: "error",
                detail: publishData.error?.message || "Failed publishing Instagram media",
                actionUrl: "https://www.instagram.com",
              };
            }
            return {
              platform: target,
              status: "published",
              detail: `@${igAcct.username ?? igAcct.id} (${publishData.id})`,
              actionUrl: "https://www.instagram.com",
            };
          } catch {
            return {
              platform: target,
              status: "error",
              detail: "Network error reaching Instagram Graph API",
              actionUrl: "https://www.instagram.com",
            };
          }
        }

        if (target === "youtube") {
          return {
            platform: target,
            status: googleConnected ? "ready_manual" : "needs_auth",
            detail: googleConnected
              ? "Google/YouTube connected — ready for video file upload"
              : "Sign in with Google to upload to YouTube",
            actionUrl: "https://studio.youtube.com",
          };
        }

        if (target === "tiktok") {
          const ttConnected = Boolean(cookies.social_token_tiktok);
          return {
            platform: target,
            status: ttConnected ? "ready_manual" : "needs_auth",
            detail: ttConnected
              ? "TikTok OAuth connected — ready in TikTok Studio"
              : "Connect TikTok OAuth or open TikTok Studio",
            actionUrl: "https://www.tiktok.com/tiktokstudio/upload",
          };
        }

        return {
          platform: target,
          status: googleConnected ? "ready_manual" : "needs_auth",
          detail: googleConnected
            ? "Google account active — ready for Business Profile"
            : "Sign in with Google above",
          actionUrl: "https://business.google.com",
        };
      })
    );

    res.json({ results });
  });

  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const body = req.body as {
        messages?: unknown;
        mode?: unknown;
        memoryContext?: unknown;
        language?: unknown;
      };

      const sanitizedMessages = sanitizeChatMessages(body.messages);
      if (sanitizedMessages.length === 0) {
        res.status(400).json({ error: "الرجاء إرسال رسالة صالحة." });
        return;
      }

      const mode: AssistantMode =
        typeof body.mode === "string" && body.mode in MODE_INSTRUCTIONS
          ? (body.mode as AssistantMode)
          : "general";
      const language = sanitizeLanguage(body.language);

      const ai = getGeminiClient();
      if (!ai) {
        res.status(503).json({
          error:
            "خدمة Gemini غير مهيأة حالياً. يرجى التأكد من إعداد مفتاح GEMINI_API_KEY في إعدادات المشروع.",
        });
        return;
      }

      const contents = sanitizedMessages.map((m) => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents,
        config: {
          systemInstruction: buildSystemInstruction(
            MODE_INSTRUCTIONS[mode],
            body.memoryContext,
            language
          ),
        },
      });

      const reply = response.text?.trim();
      if (!reply) {
        res.status(502).json({
          error: "لم يصل رد نصي من النموذج. حاول إعادة صياغة الطلب.",
        });
        return;
      }

      res.json({ reply });
    } catch (err: unknown) {
      const mapped = mapGeminiError(err);
      console.error("Gemini API error:", mapped.statusCode, err);
      res.status(mapped.statusCode).json({ error: mapped.error });
    }
  });

  app.post("/api/gemini/parallel", async (req, res) => {
    const body = req.body as {
      messages?: unknown;
      mode?: unknown;
      memoryContext?: unknown;
      language?: unknown;
    };
    const sanitizedMessages = sanitizeChatMessages(body.messages);

    if (sanitizedMessages.length === 0) {
      res.status(400).json({ error: "الرجاء إرسال رسالة صالحة." });
      return;
    }

    const mode: AssistantMode =
      typeof body.mode === "string" && body.mode in MODE_INSTRUCTIONS
        ? (body.mode as AssistantMode)
        : "general";
    const language = sanitizeLanguage(body.language);

    const systemInstruction = buildSystemInstruction(
      MODE_INSTRUCTIONS[mode],
      body.memoryContext,
      language
    );

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error:
          "خدمة Gemini غير مهيأة حالياً. يرجى التأكد من إعداد مفتاح GEMINI_API_KEY في إعدادات المشروع.",
      });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");

    const sendEvent = (payload: Record<string, unknown>) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    const models = [
      { id: "hydrogen", label: "Gemini 4 Hydrogen", modelId: "gemini-4-hydrogen" },
      {
        id: "flash-lite",
        label: "Gemini 3.1 Flash Lite",
        modelId: "gemini-3.1-flash-lite",
      },
    ];

    sendEvent({ type: "start", models });

    const contents = sanitizedMessages.map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    }));

    const candidates: Array<{
      id: string;
      label: string;
      modelId: string;
      text: string;
    }> = [];
    let firstError: string | null = null;

    await Promise.allSettled(
      models.map(async (m) => {
        try {
          const result = await ai.models.generateContent({
            model: m.modelId,
            contents,
            config: {
              systemInstruction,
            },
          });
          const text = result.text?.trim();
          if (!text) {
            throw new Error("Empty model response");
          }
          candidates.push({
            id: m.id,
            label: m.label,
            modelId: m.modelId,
            text,
          });
          sendEvent({ type: "model_update", id: m.id, status: "completed" });
        } catch (err: unknown) {
          const mapped = mapGeminiError(err);
          if (!firstError) {
            firstError = mapped.error;
          }
          sendEvent({
            type: "model_update",
            id: m.id,
            status: "error",
            error:
              language === "en"
                ? "Response failed"
                : language === "ru"
                ? "Ошибка ответа"
                : "تعذر الاستجابة",
          });
        }
      })
    );

    if (candidates.length === 0) {
      sendEvent({
        type: "error",
        error:
          firstError ??
          (language === "en"
            ? "Error connecting to Gemini service. Please try again."
            : language === "ru"
            ? "Ошибка подключения к сервису Gemini. Повторите попытку."
            : "حدث خطأ أثناء الاتصال بخدمة Gemini. يرجى المحاولة مرة أخرى."),
      });
      res.end();
      return;
    }

    sendEvent({ type: "voting" });

    if (candidates.length === 1) {
      sendEvent({
        type: "done",
        reply: candidates[0].text,
        winnerLabel: candidates[0].label,
        candidates,
      });
      res.end();
      return;
    }

    try {
      const lastUserPrompt =
        sanitizedMessages[sanitizedMessages.length - 1]?.text ?? "";
      const targetLangText =
        language === "en"
          ? "English"
          : language === "ru"
          ? "Russian"
          : "Arabic";
      const judgePrompt = [
        `Original user question:\n${lastUserPrompt}`,
        `\nAnswer 1 (${candidates[0].label}):\n${candidates[0].text}`,
        `\nAnswer 2 (${candidates[1].label}):\n${candidates[1].text}`,
        `\nCompare both answers carefully and write the clearest, most accurate unified final response in ${targetLangText}, combining the strongest points without mentioning any judging process.`,
      ].join("\n");

      const judgeResponse = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: judgePrompt,
        config: {
          systemInstruction,
        },
      });

      const finalReply = judgeResponse.text?.trim() || candidates[0].text;
      sendEvent({
        type: "done",
        reply: finalReply,
        winnerLabel:
          language === "en"
            ? "Combined Best Answer"
            : language === "ru"
            ? "Лучший объединённый ответ"
            : "خلاصة الترجيح بين النموذجين",
        candidates,
      });
    } catch {
      sendEvent({
        type: "done",
        reply: candidates[0].text,
        winnerLabel: candidates[0].label,
        candidates,
      });
    }

    res.end();
  });

  app.post("/api/assistant/reflect", async (req, res) => {
    try {
      const body = req.body as {
        conversation?: unknown;
        existingMemories?: unknown;
        existingTasks?: unknown;
        selfReflections?: unknown;
        language?: unknown;
      };
      const language = sanitizeLanguage(body.language);

      const conversation = sanitizeChatMessages(body.conversation);
      if (conversation.length === 0) {
        res.status(400).json({ error: "لا يوجد حوار لتحليله." });
        return;
      }

      const ai = getGeminiClient();
      if (!ai) {
        res.status(503).json({
          error:
            "خدمة Gemini غير مهيأة حالياً. يرجى التأكد من إعداد مفتاح GEMINI_API_KEY.",
        });
        return;
      }

      const memoriesText = Array.isArray(body.existingMemories)
        ? body.existingMemories
            .slice(0, 12)
            .map((m) =>
              typeof m === "object" && m !== null && "summary" in m
                ? `- ${String((m as { summary?: unknown }).summary ?? "")}`
                : ""
            )
            .filter(Boolean)
            .join("\n")
        : "";

      const tasksText = Array.isArray(body.existingTasks)
        ? body.existingTasks
            .slice(0, 10)
            .map((t) =>
              typeof t === "object" && t !== null && "title" in t
                ? `- ${String((t as { title?: unknown }).title ?? "")} [${String(
                    (t as { status?: unknown }).status ?? "pending"
                  )}]`
                : ""
            )
            .filter(Boolean)
            .join("\n")
        : "";

      const reflectionsText = Array.isArray(body.selfReflections)
        ? body.selfReflections
            .slice(0, 6)
            .map((r) =>
              typeof r === "object" && r !== null && "insight" in r
                ? `- ${String((r as { insight?: unknown }).insight ?? "")}`
                : ""
            )
            .filter(Boolean)
            .join("\n")
        : "";

      const transcript = conversation
        .slice(-10)
        .map((turn) => `${turn.role === "user" ? "المستخدم" : "المساعد"}: ${turn.text}`)
        .join("\n");

      const outputLanguageName =
        language === "en" ? "English" : language === "ru" ? "Russian (Русский)" : "Arabic (العربية)";

      const prompt = [
        `أنت المساعد الشخصي الذكي للمستخدم داخل تطبيق Rahal Plus (الذي يضم: مساحة الدردشة، جدول النشر للقنوات يوتيوب/فيسبوك/إنستجرام/تيك توك، المفكرة، والذاكرة الشخصية). اكتب جميع الحقول النصية في النتيجة بلغة: ${outputLanguageName}.`,
        memoriesText
          ? `الذاكرة السابقة للمستخدم:\n${memoriesText}`
          : "الذاكرة السابقة للمستخدم: لا توجد عناصر مسجلة بعد.",
        tasksText ? `المهام المسجلة سابقاً:\n${tasksText}` : "",
        reflectionsText ? `ملاحظات التطوير الذاتي السابقة:\n${reflectionsText}` : "",
        `المحادثة الحالية:\n${transcript}`,
        "المطلوب بصراحة ودقة بدون مبالغة:",
        "1. قارن ما يقوله المستخدم الآن بما في ذاكرته السابقة (memoryComparison) واذكر أي ربط بمشروع أو فكرة قديمة.",
        "2. استخرج حقائق/مشاريع/تفضيلات/أهداف جديدة تستحق الحفظ الدائم في الذاكرة (newMemories) بدون تكرار ما هو موجود.",
        "3. أنشئ لنفسك مهام عملية واضحة (newTasks) بحد أقصى 3 مهام غير مكررة؛ واجعل autoExecuteNow=true للمهام التي نفذتها الآن وأنتجت لها مخرجاً.",
        "4. إذا كان السياق يناسب تجهيز مسودة نشر على السوشيال ميديا أو يوتيوب، أنتج deliverableDraft جاهزة للنشر.",
        "5. إذا كان السياق يناسب توثيق خطة أو أفكار أو ملخص مشروع، أنتج deliverableNote لحفظها في المفكرة.",
        "6. اكتب تأملاً ذاتياً (selfReflection) عمّا تحتاجه أنت كمساعد لتطوير أدائك مع هذا المستخدم وما المعلومة أو الربط الذي ينقصك.",
        "7. اكتب تقريرك الموجز للمستخدم (completedReport) يوضح ماذا أنشأت من مهام وماذا أنجزت فعلاً في التطبيق.",
      ]
        .filter(Boolean)
        .join("\n\n");

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              memoryComparison: { type: Type.STRING },
              completedReport: { type: Type.STRING },
              newMemories: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING },
                    summary: { type: Type.STRING },
                  },
                  required: ["category", "summary"],
                },
              },
              newTasks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    details: { type: Type.STRING },
                    kind: { type: Type.STRING },
                    autoExecuteNow: { type: Type.BOOLEAN },
                  },
                  required: ["title", "details", "kind", "autoExecuteNow"],
                },
              },
              deliverableDraft: {
                type: Type.OBJECT,
                nullable: true,
                properties: {
                  title: { type: Type.STRING },
                  caption: { type: Type.STRING },
                  targets: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ["title", "caption", "targets"],
              },
              deliverableNote: {
                type: Type.OBJECT,
                nullable: true,
                properties: {
                  title: { type: Type.STRING },
                  content: { type: Type.STRING },
                },
                required: ["title", "content"],
              },
              selfReflection: {
                type: Type.OBJECT,
                nullable: true,
                properties: {
                  insight: { type: Type.STRING },
                  neededCapability: { type: Type.STRING },
                },
                required: ["insight", "neededCapability"],
              },
            },
            required: [
              "memoryComparison",
              "completedReport",
              "newMemories",
              "newTasks",
            ],
          },
        },
      });

      const rawText = response.text?.trim();
      if (!rawText) {
        res.status(502).json({ error: "تعذر استلام تحليل المساعد." });
        return;
      }

      const parsed = JSON.parse(rawText) as {
        memoryComparison?: string;
        completedReport?: string;
        newMemories?: Array<{ category?: string; summary?: string }>;
        newTasks?: Array<{
          title?: string;
          details?: string;
          kind?: string;
          autoExecuteNow?: boolean;
        }>;
        deliverableDraft?: {
          title?: string;
          caption?: string;
          targets?: string[];
        } | null;
        deliverableNote?: {
          title?: string;
          content?: string;
        } | null;
        selfReflection?: {
          insight?: string;
          neededCapability?: string;
        } | null;
      };

      const validMemoryCats = new Set(["project", "preference", "goal", "fact"]);
      const validTaskKinds = new Set([
        "draft_post",
        "save_note",
        "research",
        "self_improve",
      ]);

      const newMemories = Array.isArray(parsed.newMemories)
        ? parsed.newMemories
            .filter((m) => typeof m?.summary === "string" && m.summary.trim().length > 3)
            .slice(0, 4)
            .map((m) => ({
              category: validMemoryCats.has(m.category ?? "")
                ? (m.category as "project" | "preference" | "goal" | "fact")
                : "fact",
              summary: m.summary!.trim(),
            }))
        : [];

      const newTasks = Array.isArray(parsed.newTasks)
        ? parsed.newTasks
            .filter((t) => typeof t?.title === "string" && t.title.trim().length > 2)
            .slice(0, 3)
            .map((t) => ({
              title: t.title!.trim(),
              details: typeof t.details === "string" ? t.details.trim() : "",
              kind: validTaskKinds.has(t.kind ?? "")
                ? (t.kind as "draft_post" | "save_note" | "research" | "self_improve")
                : "research",
              autoExecuteNow: Boolean(t.autoExecuteNow),
            }))
        : [];

      const deliverableDraft =
        parsed.deliverableDraft &&
        typeof parsed.deliverableDraft.title === "string" &&
        parsed.deliverableDraft.title.trim() &&
        typeof parsed.deliverableDraft.caption === "string" &&
        parsed.deliverableDraft.caption.trim()
          ? {
              title: parsed.deliverableDraft.title.trim(),
              caption: parsed.deliverableDraft.caption.trim(),
              targets: sanitizePublishTargets(parsed.deliverableDraft.targets),
            }
          : null;

      const deliverableNote =
        parsed.deliverableNote &&
        typeof parsed.deliverableNote.title === "string" &&
        parsed.deliverableNote.title.trim() &&
        typeof parsed.deliverableNote.content === "string" &&
        parsed.deliverableNote.content.trim()
          ? {
              title: parsed.deliverableNote.title.trim(),
              content: parsed.deliverableNote.content.trim(),
            }
          : null;

      const selfReflection =
        parsed.selfReflection &&
        typeof parsed.selfReflection.insight === "string" &&
        parsed.selfReflection.insight.trim()
          ? {
              insight: parsed.selfReflection.insight.trim(),
              neededCapability:
                typeof parsed.selfReflection.neededCapability === "string" &&
                parsed.selfReflection.neededCapability.trim()
                  ? parsed.selfReflection.neededCapability.trim()
                  : language === "en"
                  ? "Clarify target platforms and priorities"
                  : language === "ru"
                  ? "Уточнить приоритеты и целевые платформы"
                  : "توضيح الأولويات والمنصات المستهدفة",
            }
          : null;

      res.json({
        memoryComparison:
          typeof parsed.memoryComparison === "string"
            ? parsed.memoryComparison.trim()
            : "",
        completedReport:
          typeof parsed.completedReport === "string"
            ? parsed.completedReport.trim()
            : "",
        newMemories,
        newTasks,
        deliverableDraft,
        deliverableNote,
        selfReflection,
      });
    } catch (err: unknown) {
      const mapped = mapGeminiError(err);
      console.error("Assistant reflect error:", mapped.statusCode, err);
      res.status(mapped.statusCode).json({ error: mapped.error });
    }
  });

  app.post("/api/assistant/execute-task", async (req, res) => {
    try {
      const body = req.body as {
        task?: {
          title?: unknown;
          details?: unknown;
          kind?: unknown;
        };
        memoryContext?: unknown;
        language?: unknown;
      };
      const language = sanitizeLanguage(body.language);
      const outputLanguageName =
        language === "en" ? "English" : language === "ru" ? "Russian (Русский)" : "Arabic (العربية)";

      const title =
        typeof body.task?.title === "string" ? body.task.title.trim() : "";
      const details =
        typeof body.task?.details === "string" ? body.task.details.trim() : "";
      const kind =
        typeof body.task?.kind === "string" ? body.task.kind.trim() : "research";

      if (!title) {
        res.status(400).json({ error: "بيانات المهمة غير مكتملة." });
        return;
      }

      const ai = getGeminiClient();
      if (!ai) {
        res.status(503).json({
          error:
            "خدمة Gemini غير مهيأة حالياً. يرجى التأكد من إعداد مفتاح GEMINI_API_KEY.",
        });
        return;
      }

      const mem =
        typeof body.memoryContext === "string"
          ? body.memoryContext.trim().slice(0, 1800)
          : "";

      const prompt = [
        `أنت المساعد الشخصي للمستخدم في Rahal Plus. نفّذ المهمة التالية وأنتج مخرجاً عملياً جاهزاً بلغة: ${outputLanguageName}.`,
        mem ? `ذاكرة وسياق المستخدم:\n${mem}` : "",
        `عنوان المهمة: ${title}\nنوع المهمة: ${kind}\nالتفاصيل: ${details || "غير محددة"}`,
        "أرجع JSON فيه: resultSummary (ملخص دقيق لما أنجزته في سطرين)، و deliverableDraft إن كانت المهمة من نوع نشر أو محتوى سوشيال، و deliverableNote إن كانت المهمة خطة أو بحثاً أو تطويراً ذاتياً.",
      ]
        .filter(Boolean)
        .join("\n\n");

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              resultSummary: { type: Type.STRING },
              deliverableDraft: {
                type: Type.OBJECT,
                nullable: true,
                properties: {
                  title: { type: Type.STRING },
                  caption: { type: Type.STRING },
                  targets: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ["title", "caption", "targets"],
              },
              deliverableNote: {
                type: Type.OBJECT,
                nullable: true,
                properties: {
                  title: { type: Type.STRING },
                  content: { type: Type.STRING },
                },
                required: ["title", "content"],
              },
            },
            required: ["resultSummary"],
          },
        },
      });

      const rawText = response.text?.trim();
      if (!rawText) {
        res.status(502).json({ error: "تعذر تنفيذ المهمة عبر النموذج." });
        return;
      }

      const parsed = JSON.parse(rawText) as {
        resultSummary?: string;
        deliverableDraft?: {
          title?: string;
          caption?: string;
          targets?: string[];
        } | null;
        deliverableNote?: {
          title?: string;
          content?: string;
        } | null;
      };

      const deliverableDraft =
        parsed.deliverableDraft &&
        typeof parsed.deliverableDraft.title === "string" &&
        parsed.deliverableDraft.title.trim() &&
        typeof parsed.deliverableDraft.caption === "string" &&
        parsed.deliverableDraft.caption.trim()
          ? {
              title: parsed.deliverableDraft.title.trim(),
              caption: parsed.deliverableDraft.caption.trim(),
              targets: sanitizePublishTargets(parsed.deliverableDraft.targets),
            }
          : null;

      const deliverableNote =
        parsed.deliverableNote &&
        typeof parsed.deliverableNote.title === "string" &&
        parsed.deliverableNote.title.trim() &&
        typeof parsed.deliverableNote.content === "string" &&
        parsed.deliverableNote.content.trim()
          ? {
              title: parsed.deliverableNote.title.trim(),
              content: parsed.deliverableNote.content.trim(),
            }
          : null;

      res.json({
        resultSummary:
          typeof parsed.resultSummary === "string" && parsed.resultSummary.trim()
            ? parsed.resultSummary.trim()
            : language === "en"
            ? `Task completed: ${title}`
            : language === "ru"
            ? `Задача выполнена: ${title}`
            : `تم تنفيذ المهمة: ${title}`,
        deliverableDraft,
        deliverableNote,
      });
    } catch (err: unknown) {
      const mapped = mapGeminiError(err);
      console.error("Execute task error:", mapped.statusCode, err);
      res.status(mapped.statusCode).json({ error: mapped.error });
    }
  });

  app.post("/api/workflows/orchestrate", async (req, res) => {
    try {
      const body = req.body as {
        goal?: unknown;
        suiteName?: unknown;
        platforms?: unknown;
        language?: unknown;
        memoryContext?: unknown;
        googleAccountEmail?: unknown;
      };

      const language = sanitizeLanguage(body.language);
      const goal = typeof body.goal === "string" ? body.goal.trim() : "";
      const suiteName =
        typeof body.suiteName === "string" ? body.suiteName.trim() : "Unified Suite";
      const googleEmail =
        typeof body.googleAccountEmail === "string"
          ? body.googleAccountEmail.trim()
          : "";

      const rawPlatforms = Array.isArray(body.platforms)
        ? body.platforms
            .filter(
              (p): p is {
                id: string;
                name: string;
                category?: string;
                url?: string;
              } =>
                typeof p === "object" &&
                p !== null &&
                typeof (p as { id?: unknown }).id === "string" &&
                typeof (p as { name?: unknown }).name === "string"
            )
            .slice(0, 18)
        : [];

      if (!goal || rawPlatforms.length === 0) {
        res.status(400).json({
          error:
            language === "en"
              ? "Please enter a goal and select at least one platform."
              : language === "ru"
              ? "Введите цель и выберите хотя бы одну платформу."
              : "يرجى إدخال الهدف واختيار منصة واحدة على الأقل.",
        });
        return;
      }

      const ai = getGeminiClient();
      if (!ai) {
        res.status(503).json({
          error:
            "خدمة Gemini غير مهيأة حالياً. يرجى التأكد من إعداد مفتاح GEMINI_API_KEY.",
        });
        return;
      }

      const outputLanguageName =
        language === "en"
          ? "English"
          : language === "ru"
          ? "Russian (Русский)"
          : "Arabic (العربية)";

      const platformListText = rawPlatforms
        .map(
          (p, i) =>
            `${i + 1}. id=${p.id} | name=${p.name} | category=${
              p.category ?? "general"
            } | url=${p.url ?? ""}`
        )
        .join("\n");

      const mem =
        typeof body.memoryContext === "string"
          ? body.memoryContext.trim().slice(0, 1600)
          : "";

      const prompt = [
        `You are the unified cross-platform orchestrator inside Rahal Plus. Write all user-facing fields in ${outputLanguageName}.`,
        googleEmail ? `Signed-in Google Account: ${googleEmail}` : "",
        mem ? `User Project Memory:\n${mem}` : "",
        `Selected Integrated Group: ${suiteName}`,
        `User Unified Goal: ${goal}`,
        `Platforms merged in this group:\n${platformListText}`,
        `Return JSON combining ALL selected platforms so they work together as ONE cohesive pipeline:`,
        `- summary: concise explanation of how these platforms connect end-to-end for this goal.`,
        `- sharedMasterBrief: one master prompt/brief that carries consistent messaging across all platforms.`,
        `- platformSteps: an entry for every listed platform id with its exact roleInChain and a ready-to-paste tailoredPrompt specific to that platform's strengths.`,
        `- unifiedDraft: a multi-channel draft ready for YouTube, Google, Facebook, Instagram, and TikTok.`,
        `- checklistNote: a structured note summarizing the group workflow for the user's Notes.`,
      ]
        .filter(Boolean)
        .join("\n\n");

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              sharedMasterBrief: { type: Type.STRING },
              platformSteps: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    platformId: { type: Type.STRING },
                    platformName: { type: Type.STRING },
                    roleInChain: { type: Type.STRING },
                    tailoredPrompt: { type: Type.STRING },
                  },
                  required: [
                    "platformId",
                    "platformName",
                    "roleInChain",
                    "tailoredPrompt",
                  ],
                },
              },
              unifiedDraft: {
                type: Type.OBJECT,
                nullable: true,
                properties: {
                  title: { type: Type.STRING },
                  caption: { type: Type.STRING },
                  targets: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ["title", "caption", "targets"],
              },
              checklistNote: {
                type: Type.OBJECT,
                nullable: true,
                properties: {
                  title: { type: Type.STRING },
                  content: { type: Type.STRING },
                },
                required: ["title", "content"],
              },
            },
            required: ["summary", "sharedMasterBrief", "platformSteps"],
          },
        },
      });

      const rawText = response.text?.trim();
      if (!rawText) {
        res.status(502).json({ error: "Empty response from orchestrator." });
        return;
      }

      const parsed = JSON.parse(rawText) as {
        summary?: string;
        sharedMasterBrief?: string;
        platformSteps?: Array<{
          platformId?: string;
          platformName?: string;
          roleInChain?: string;
          tailoredPrompt?: string;
        }>;
        unifiedDraft?: {
          title?: string;
          caption?: string;
          targets?: string[];
        } | null;
        checklistNote?: {
          title?: string;
          content?: string;
        } | null;
      };

      const urlMap = new Map(rawPlatforms.map((p) => [p.id, p.url ?? ""]));
      const nameMap = new Map(rawPlatforms.map((p) => [p.id, p.name]));

      const platformSteps = Array.isArray(parsed.platformSteps)
        ? parsed.platformSteps
            .filter((s) => typeof s?.platformId === "string" || typeof s?.platformName === "string")
            .map((s) => {
              const pid = typeof s.platformId === "string" ? s.platformId : "";
              return {
                platformId: pid,
                platformName:
                  (typeof s.platformName === "string" && s.platformName.trim()) ||
                  nameMap.get(pid) ||
                  pid,
                roleInChain:
                  typeof s.roleInChain === "string" ? s.roleInChain.trim() : "",
                tailoredPrompt:
                  typeof s.tailoredPrompt === "string"
                    ? s.tailoredPrompt.trim()
                    : "",
                actionUrl: urlMap.get(pid) ?? "",
              };
            })
        : [];

      const unifiedDraft =
        parsed.unifiedDraft &&
        typeof parsed.unifiedDraft.title === "string" &&
        parsed.unifiedDraft.title.trim() &&
        typeof parsed.unifiedDraft.caption === "string" &&
        parsed.unifiedDraft.caption.trim()
          ? {
              title: parsed.unifiedDraft.title.trim(),
              caption: parsed.unifiedDraft.caption.trim(),
              targets: sanitizePublishTargets(parsed.unifiedDraft.targets),
            }
          : null;

      const checklistNote =
        parsed.checklistNote &&
        typeof parsed.checklistNote.title === "string" &&
        parsed.checklistNote.title.trim() &&
        typeof parsed.checklistNote.content === "string" &&
        parsed.checklistNote.content.trim()
          ? {
              title: parsed.checklistNote.title.trim(),
              content: parsed.checklistNote.content.trim(),
            }
          : null;

      res.json({
        suiteName,
        summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "",
        sharedMasterBrief:
          typeof parsed.sharedMasterBrief === "string"
            ? parsed.sharedMasterBrief.trim()
            : "",
        platformSteps,
        unifiedDraft,
        checklistNote,
      });
    } catch (err: unknown) {
      const mapped = mapGeminiError(err);
      console.error("Orchestrate error:", mapped.statusCode, err);
      res.status(mapped.statusCode).json({ error: mapped.error });
    }
  });

  app.get("/api/local-storage/info", (_req, res) => {
    res.json(buildLocalStorageInfo());
  });

  app.post("/api/local-storage/configure", (req, res) => {
    const body = req.body as {
      folderPath?: unknown;
      presetId?: unknown;
      connected?: unknown;
      migrateExisting?: unknown;
      language?: unknown;
    };

    const lang = sanitizeLanguage(body.language);
    const presets = getStoragePresetOptions();
    let candidatePath = "";

    if (typeof body.presetId === "string" && body.presetId.trim()) {
      const matched = presets.find((p) => p.id === body.presetId);
      if (matched) {
        candidatePath = matched.path;
      }
    }

    if (!candidatePath && typeof body.folderPath === "string") {
      candidatePath = body.folderPath;
    }

    if (!candidatePath) {
      candidatePath = readLocalStorageConfig().storageDir;
    }

    const check = validateStorageFolderPath(candidatePath, lang);
    if (!check.valid || !check.normalizedPath) {
      res.status(400).json({ error: check.error || "Invalid folder path." });
      return;
    }

    const expanded = expandHomeDirectory(check.normalizedPath, os.homedir());
    const resolvedDir = path.resolve(expanded);
    const prevCfg = readLocalStorageConfig();

    try {
      fs.mkdirSync(resolvedDir, { recursive: true });
      fs.accessSync(resolvedDir, fs.constants.W_OK);

      if (
        body.migrateExisting === true &&
        prevCfg.storageDir !== resolvedDir &&
        fs.existsSync(path.join(prevCfg.storageDir, "workspace-state.json"))
      ) {
        const prevRaw = fs.readFileSync(
          path.join(prevCfg.storageDir, "workspace-state.json"),
          "utf8"
        );
        const parsed = JSON.parse(prevRaw) as WorkspaceSnapshotPayload;
        writeSnapshotFilesToDisk(resolvedDir, parsed, false);
      }

      const nextCfg: LocalStorageConfigRecord = {
        storageDir: resolvedDir,
        connected: body.connected !== false,
        lastSyncedAt: prevCfg.lastSyncedAt,
      };
      writeLocalStorageConfig(nextCfg);
      res.json(buildLocalStorageInfo());
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json({
        error: `Cannot create or write to folder "${resolvedDir}": ${msg}`,
      });
    }
  });

  app.post("/api/local-storage/disconnect", (_req, res) => {
    const prev = readLocalStorageConfig();
    writeLocalStorageConfig({
      storageDir: prev.storageDir,
      connected: false,
      lastSyncedAt: prev.lastSyncedAt,
    });
    res.json(buildLocalStorageInfo());
  });

  app.get("/api/local-storage/state", (_req, res) => {
    const cfg = readLocalStorageConfig();
    const stateFile = path.join(cfg.storageDir, "workspace-state.json");
    if (!fs.existsSync(stateFile)) {
      res.json({ exists: false, snapshot: null, storageDir: cfg.storageDir });
      return;
    }
    try {
      const raw = fs.readFileSync(stateFile, "utf8");
      const snapshot = JSON.parse(raw) as WorkspaceSnapshotPayload;
      res.json({ exists: true, snapshot, storageDir: cfg.storageDir });
    } catch {
      res.status(500).json({ error: "Failed reading saved workspace state file." });
    }
  });

  app.put("/api/local-storage/state", (req, res) => {
    const body = req.body as {
      snapshot?: WorkspaceSnapshotPayload;
      createBackup?: boolean;
    };
    if (!body?.snapshot || typeof body.snapshot !== "object") {
      res.status(400).json({ error: "Missing workspace snapshot payload." });
      return;
    }

    const cfg = readLocalStorageConfig();
    try {
      const snapshot: WorkspaceSnapshotPayload = {
        ...body.snapshot,
        version: 1,
        savedAt: new Date().toISOString(),
      };
      writeSnapshotFilesToDisk(
        cfg.storageDir,
        snapshot,
        Boolean(body.createBackup)
      );

      writeLocalStorageConfig({
        storageDir: cfg.storageDir,
        connected: true,
        lastSyncedAt: snapshot.savedAt,
      });

      res.json({
        ok: true,
        storageDir: cfg.storageDir,
        savedAt: snapshot.savedAt,
        files: listStorageFiles(cfg.storageDir),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: `Failed writing local folder files: ${msg}` });
    }
  });

  const isProd = process.env.NODE_ENV === "production";
  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      const indexFile = path.join(distPath, "index.html");
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send("Build output not found.");
      }
    });
  }

  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });
  const allowedVoices = new Set(["Zephyr", "Kore", "Puck", "Charon", "Fenrir"]);

  server.on("upgrade", (request, socket, head) => {
    try {
      const url = new URL(request.url ?? "/", "http://localhost");
      if (url.pathname === "/api/live") {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit("connection", ws, request);
        });
      } else {
        socket.destroy();
      }
    } catch {
      socket.destroy();
    }
  });

  wss.on("connection", (clientWs, request) => {
    const ai = getGeminiClient();
    if (!ai) {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(
          JSON.stringify({
            type: "error",
            error:
              "خدمة Gemini غير مهيأة حالياً. يرجى التأكد من إعداد مفتاح GEMINI_API_KEY في Secrets.",
          })
        );
      }
      clientWs.close();
      return;
    }

    let voiceName = "Zephyr";
    let sessionLang: AppLanguage = "ar";
    try {
      const reqUrl = new URL(request.url ?? "/", "http://localhost");
      const requestedVoice = reqUrl.searchParams.get("voice");
      if (requestedVoice && allowedVoices.has(requestedVoice)) {
        voiceName = requestedVoice;
      }
      sessionLang = sanitizeLanguage(reqUrl.searchParams.get("lang"));
    } catch {
      // Fallback to Zephyr / ar
    }

    const sendJson = (payload: Record<string, unknown>) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify(payload));
      }
    };

    let sessionPromise: Promise<Awaited<ReturnType<typeof ai.live.connect>> | null> | null =
      null;
    let initTimer: ReturnType<typeof setTimeout> | null = null;

    const startLiveSession = (memoryContext?: string, languageOverride?: AppLanguage) => {
      if (sessionPromise) return sessionPromise;
      if (initTimer) {
        clearTimeout(initTimer);
        initTimer = null;
      }

      const activeLang = languageOverride ?? sessionLang;
      const baseLiveInstruction =
        "You are the user's personal live voice assistant inside Rahal Plus. Speak naturally in Arabic, English, or Russian matching the user's language, remember their saved projects and goals, compare with past notes when helpful, and give concise practical responses.";

      sessionPromise = ai.live
        .connect({
          model: "gemini-3.8-live",
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName },
              },
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            systemInstruction: buildSystemInstruction(
              baseLiveInstruction,
              memoryContext,
              activeLang
            ),
          },
          callbacks: {
            onopen: () => {
              sendJson({ type: "ready", voice: voiceName });
            },
            onmessage: (message: LiveServerMessage) => {
              const content = message.serverContent;
              if (content?.inputTranscription?.text) {
                sendJson({
                  type: "input_transcript",
                  text: content.inputTranscription.text,
                });
              }
              if (content?.outputTranscription?.text) {
                sendJson({
                  type: "output_transcript",
                  text: content.outputTranscription.text,
                });
              }
              for (const part of content?.modelTurn?.parts ?? []) {
                if (part.inlineData?.data) {
                  sendJson({ type: "audio", data: part.inlineData.data });
                }
              }
              if (content?.interrupted) {
                sendJson({ type: "interrupted" });
              }
              if (content?.turnComplete) {
                sendJson({ type: "turn_complete" });
              }
            },
            onerror: (err: unknown) => {
              const mapped = mapGeminiError(err);
              sendJson({ type: "error", error: mapped.error });
            },
            onclose: () => {
              sendJson({ type: "closed" });
            },
          },
        })
        .catch((err: unknown) => {
          const mapped = mapGeminiError(err);
          sendJson({ type: "error", error: mapped.error });
          clientWs.close();
          return null;
        });

      return sessionPromise;
    };

    initTimer = setTimeout(() => {
      void startLiveSession();
    }, 350);

    clientWs.on("message", (raw) => {
      try {
        const parsed = JSON.parse(raw.toString()) as {
          type?: string;
          voice?: string;
          language?: string;
          memoryContext?: string;
          audio?: string;
          text?: string;
        };

        if (parsed.type === "init" && !sessionPromise) {
          if (parsed.voice && allowedVoices.has(parsed.voice)) {
            voiceName = parsed.voice;
          }
          const initLang = parsed.language
            ? sanitizeLanguage(parsed.language)
            : sessionLang;
          void startLiveSession(parsed.memoryContext, initLang);
          return;
        }

        const activePromise = sessionPromise ?? startLiveSession();
        activePromise.then((session) => {
          if (!session) return;
          if (typeof parsed.audio === "string" && parsed.audio.length > 0) {
            session.sendRealtimeInput({
              audio: { data: parsed.audio, mimeType: "audio/pcm;rate=16000" },
            });
          } else if (typeof parsed.text === "string" && parsed.text.trim()) {
            session.sendRealtimeInput({
              text: parsed.text.trim(),
            });
          }
        });
      } catch {
        // Ignore malformed websocket frames
      }
    });

    clientWs.on("close", () => {
      if (initTimer) {
        clearTimeout(initTimer);
        initTimer = null;
      }
      sessionPromise?.then((session) => {
        try {
          session?.close();
        } catch {
          // Ignore close errors
        }
      });
    });
  });

  const port = Number(process.env.PORT) || 3000;
  server.listen(port, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
