import { getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  type User,
} from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";
import {
  buildYouTubeMetadataPayload,
  type YouTubePrivacyStatus,
} from "../utils/publishing";

export const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
];

const SESSION_TOKEN_KEY = "rahal_google_oauth_token_v1";

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);

let isSigningIn = false;
let cachedAccessToken: string | null = loadStoredToken();

export class YouTubeAuthError extends Error {
  isAuthError: boolean;
  statusCode?: number;

  constructor(message: string, isAuthError = false, statusCode?: number) {
    super(message);
    this.name = "YouTubeAuthError";
    this.isAuthError = isAuthError;
    this.statusCode = statusCode;
  }
}

function loadStoredToken(): string | null {
  try {
    const raw = window.sessionStorage.getItem(SESSION_TOKEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { token?: string; expiresAt?: number };
    if (
      typeof parsed.token === "string" &&
      parsed.token.length > 0 &&
      typeof parsed.expiresAt === "number" &&
      Date.now() < parsed.expiresAt
    ) {
      return parsed.token;
    }
    window.sessionStorage.removeItem(SESSION_TOKEN_KEY);
    return null;
  } catch {
    return null;
  }
}

function saveStoredToken(token: string) {
  cachedAccessToken = token;
  try {
    window.sessionStorage.setItem(
      SESSION_TOKEN_KEY,
      JSON.stringify({
        token,
        expiresAt: Date.now() + 50 * 60 * 1000,
      })
    );
  } catch {
    // Ignore storage quota / blocked errors
  }
}

export function clearYouTubeAccessToken() {
  cachedAccessToken = null;
  try {
    window.sessionStorage.removeItem(SESSION_TOKEN_KEY);
  } catch {
    // Ignore storage errors
  }
}

export interface YouTubeChannelSummary {
  id: string;
  title: string;
  customUrl?: string;
  thumbnailUrl?: string;
  subscriberCount?: string;
  videoCount?: string;
  uploadsPlaylistId?: string;
}

export interface YouTubeVideoItem {
  id: string;
  title: string;
  publishedAt: string;
  thumbnailUrl?: string;
  privacyStatus?: string;
  url: string;
}

export function initYouTubeAuth(
  onAuthChange: (state: {
    user: User | null;
    accessToken: string | null;
  }) => void
) {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (isSigningIn) return;
    if (!user) {
      clearYouTubeAccessToken();
      onAuthChange({ user: null, accessToken: null });
      return;
    }
    const token = cachedAccessToken ?? loadStoredToken();
    onAuthChange({ user, accessToken: token });
  });
}

export async function signInWithYouTube(
  preferredEmail?: string | null
): Promise<{
  user: User;
  accessToken: string;
}> {
  isSigningIn = true;
  try {
    const provider = new GoogleAuthProvider();
    for (const scope of YOUTUBE_SCOPES) {
      provider.addScope(scope);
    }

    const hintEmail = preferredEmail?.trim() || auth.currentUser?.email || "";
    if (hintEmail) {
      provider.setCustomParameters({ login_hint: hintEmail });
    }

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new YouTubeAuthError(
        "Could not retrieve Google/YouTube OAuth access token.",
        true
      );
    }
    saveStoredToken(credential.accessToken);
    return { user: result.user, accessToken: credential.accessToken };
  } finally {
    isSigningIn = false;
  }
}

export function getYouTubeAccessToken(): string | null {
  if (!cachedAccessToken) {
    cachedAccessToken = loadStoredToken();
  }
  return cachedAccessToken;
}

export async function signOutYouTube(): Promise<void> {
  clearYouTubeAccessToken();
  await auth.signOut();
}

export async function fetchYouTubeChannelAndVideos(
  accessToken: string
): Promise<{
  channel: YouTubeChannelSummary | null;
  videos: YouTubeVideoItem[];
}> {
  const channelRes = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&mine=true",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!channelRes.ok) {
    const errBody = (await channelRes.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    const isAuthError = channelRes.status === 401;
    if (isAuthError) {
      clearYouTubeAccessToken();
    }
    throw new YouTubeAuthError(
      errBody.error?.message ||
        "Could not load YouTube channel data. Please verify your session.",
      isAuthError,
      channelRes.status
    );
  }

  const channelData = (await channelRes.json()) as {
    items?: Array<{
      id: string;
      snippet?: {
        title?: string;
        customUrl?: string;
        thumbnails?: { default?: { url?: string }; medium?: { url?: string } };
      };
      statistics?: {
        subscriberCount?: string;
        videoCount?: string;
      };
      contentDetails?: {
        relatedPlaylists?: { uploads?: string };
      };
    }>;
  };

  const first = channelData.items?.[0];
  if (!first) {
    return { channel: null, videos: [] };
  }

  const channel: YouTubeChannelSummary = {
    id: first.id,
    title: first.snippet?.title ?? "YouTube Channel",
    customUrl: first.snippet?.customUrl,
    thumbnailUrl:
      first.snippet?.thumbnails?.medium?.url ??
      first.snippet?.thumbnails?.default?.url,
    subscriberCount: first.statistics?.subscriberCount,
    videoCount: first.statistics?.videoCount,
    uploadsPlaylistId: first.contentDetails?.relatedPlaylists?.uploads,
  };

  if (!channel.uploadsPlaylistId) {
    return { channel, videos: [] };
  }

  const videosRes = await fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,status&playlistId=${encodeURIComponent(
      channel.uploadsPlaylistId
    )}&maxResults=8`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!videosRes.ok) {
    return { channel, videos: [] };
  }

  const videosData = (await videosRes.json()) as {
    items?: Array<{
      snippet?: {
        title?: string;
        publishedAt?: string;
        resourceId?: { videoId?: string };
        thumbnails?: { medium?: { url?: string }; default?: { url?: string } };
      };
      status?: { privacyStatus?: string };
    }>;
  };

  const videos: YouTubeVideoItem[] = (videosData.items ?? [])
    .map((item): YouTubeVideoItem | null => {
      const videoId = item.snippet?.resourceId?.videoId;
      if (!videoId) return null;
      return {
        id: videoId,
        title: item.snippet?.title ?? "Untitled Video",
        publishedAt: item.snippet?.publishedAt ?? "",
        thumbnailUrl:
          item.snippet?.thumbnails?.medium?.url ??
          item.snippet?.thumbnails?.default?.url,
        privacyStatus: item.status?.privacyStatus,
        url: `https://www.youtube.com/watch?v=${videoId}`,
      };
    })
    .filter((v): v is YouTubeVideoItem => v !== null);

  return { channel, videos };
}

export async function uploadVideoToYouTube(params: {
  accessToken: string;
  file: File;
  title: string;
  description: string;
  tags: string[];
  privacyStatus: YouTubePrivacyStatus;
}): Promise<{ id: string; url: string; title: string }> {
  const metadata = buildYouTubeMetadataPayload({
    title: params.title,
    description: params.description,
    tags: params.tags,
    privacyStatus: params.privacyStatus,
  });

  const boundary = `rahal_yt_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  const metadataPart =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${params.file.type || "video/mp4"}\r\n\r\n`;

  const closingPart = `\r\n--${boundary}--`;
  const body = new Blob([metadataPart, params.file, closingPart], {
    type: `multipart/related; boundary=${boundary}`,
  });

  const response = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  if (!response.ok) {
    const errData = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    const isAuthError = response.status === 401;
    if (isAuthError) {
      clearYouTubeAccessToken();
    }
    throw new YouTubeAuthError(
      errData.error?.message ||
        "Could not upload video to YouTube. Verify session permissions and file size.",
      isAuthError,
      response.status
    );
  }

  const uploaded = (await response.json()) as {
    id: string;
    snippet?: { title?: string };
  };

  return {
    id: uploaded.id,
    title: uploaded.snippet?.title ?? params.title.trim(),
    url: `https://www.youtube.com/watch?v=${uploaded.id}`,
  };
}
