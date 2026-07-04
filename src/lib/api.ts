// ============================================================
// Pawchive API 客户端 — 基于 pawchive.st API v1
// 支持公开 API + cookie 认证 API
// ============================================================

import type {
  Creator,
  Post,
  Announcement,
  Fancard,
  Comment,
  PostRevision,
  CreatorProfile,
  LinkedAccount,
  FavoriteCreator,
  FileHashResult,
  PostSearchParams,
} from "./types";

// Server-side: use absolute pawchive.st URL (Next.js server fetch can't resolve relative)
// Client-side: use proxy route (avoids CORS)
const API_BASE =
  typeof window === "undefined"
    ? "https://pawchive.pw/api/v1"
    : "/api/proxy/v1";
const CACHE_TTL = 60_000;

// ---------- Simple in-memory cache ----------
const cache = new Map<string, { data: unknown; ts: number }>();

function cacheGet<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) {
    return entry.data as T;
  }
  cache.delete(key);
  return null;
}

function cacheSet<T>(key: string, data: T): void {
  cache.set(key, { data, ts: Date.now() });
}

// ---------- Session cookie store (synced with localStorage) ----------
let _sessionCookie: string | null = null;

// Init from localStorage on module load (client-side only)
if (typeof window !== "undefined") {
  try { _sessionCookie = localStorage.getItem("pawchive_session"); } catch {}
}

export function setSessionCookie(cookie: string | null) {
  _sessionCookie = cookie;
  if (typeof window !== "undefined") {
    try {
      if (cookie) localStorage.setItem("pawchive_session", cookie);
      else localStorage.removeItem("pawchive_session");
    } catch {}
    try { window.dispatchEvent(new CustomEvent("pawchive:session-change", { detail: !!cookie })); } catch {}
  }
}

export function getSessionCookie(): string | null {
  // Refresh from localStorage in case another tab set it
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("pawchive_session");
      if (stored) _sessionCookie = stored;
    } catch {}
  }
  return _sessionCookie;
}

// ---------- Generic fetch (public, cached) ----------
async function fetchJSON<T>(url: string, cacheKey?: string): Promise<T> {
  if (cacheKey) {
    const cached = cacheGet<T>(cacheKey);
    if (cached) return cached;
  }
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  const data: T = await res.json();
  if (cacheKey) cacheSet(cacheKey, data);
  return data;
}

// ---------- Authenticated fetch ----------
async function fetchAuth<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  };

  // Browsers strip a client-set `Cookie` header. Send the session via a
  // custom header instead; the /api/proxy route translates it into the
  // upstream `Cookie: session=…` on the server side.
  const session = getSessionCookie();
  if (session) {
    headers["X-Pawchive-Session"] = session;
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 302) {
      throw new AuthError("Authentication required. Please set your session cookie in Settings.");
    }
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }

  // For DELETE, may return no content
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

// ============================================================
// Posts (public)
// ============================================================
export async function getRecentPosts(
  params?: PostSearchParams
): Promise<Post[]> {
  const q = params?.q ? `&q=${encodeURIComponent(params.q)}` : "";
  const o = params?.o ?? 0;
  return fetchJSON<Post[]>(
    `${API_BASE}/posts?o=${o}${q}`,
    `posts:${o}:${params?.q ?? ""}`
  );
}

export async function getCreatorPosts(
  service: string,
  creatorId: string,
  params?: PostSearchParams
): Promise<Post[]> {
  const q = params?.q ? `&q=${encodeURIComponent(params.q)}` : "";
  const o = params?.o ?? 0;
  return fetchJSON<Post[]>(
    `${API_BASE}/${service}/user/${creatorId}?o=${o}${q}`,
    `creator_posts:${service}:${creatorId}:${o}`
  );
}

export async function getPost(
  service: string,
  creatorId: string,
  postId: string
): Promise<Post> {
  return fetchJSON<Post>(
    `${API_BASE}/${service}/user/${creatorId}/post/${postId}`,
    `post:${service}:${creatorId}:${postId}`
  );
}

export async function getPostRevisions(
  service: string,
  creatorId: string,
  postId: string
): Promise<PostRevision[]> {
  return fetchJSON<PostRevision[]>(
    `${API_BASE}/${service}/user/${creatorId}/post/${postId}/revisions`
  );
}

// ============================================================
// Creators (public)
// ============================================================
export async function getAllCreators(): Promise<Creator[]> {
  return fetchJSON<Creator[]>(`${API_BASE}/creators`, "creators");
}

export async function getCreatorProfile(
  service: string,
  creatorId: string
): Promise<CreatorProfile> {
  return fetchJSON<CreatorProfile>(
    `${API_BASE}/${service}/user/${creatorId}/profile`,
    `profile:${service}:${creatorId}`
  );
}

export async function getCreatorLinkedAccounts(
  service: string,
  creatorId: string
): Promise<LinkedAccount[]> {
  return fetchJSON<LinkedAccount[]>(
    `${API_BASE}/${service}/user/${creatorId}/links`
  );
}

// ============================================================
// Announcements (public)
// ============================================================
export async function getCreatorAnnouncements(
  service: string,
  creatorId: string
): Promise<Announcement[]> {
  return fetchJSON<Announcement[]>(
    `${API_BASE}/${service}/user/${creatorId}/announcements`
  );
}

// ============================================================
// Fancards - Fanbox only (public)
// ============================================================
export async function getCreatorFancards(
  service: string,
  creatorId: string
): Promise<Fancard[]> {
  return fetchJSON<Fancard[]>(
    `${API_BASE}/${service}/user/${creatorId}/fancards`
  );
}

// ============================================================
// Comments (public)
// ============================================================
export async function getPostComments(
  service: string,
  creatorId: string,
  postId: string
): Promise<Comment[]> {
  return fetchJSON<Comment[]>(
    `${API_BASE}/${service}/user/${creatorId}/post/${postId}/comments`
  );
}

// ============================================================
// File Search (public)
// ============================================================
export async function searchFileByHash(
  fileHash: string
): Promise<FileHashResult> {
  return fetchJSON<FileHashResult>(`${API_BASE}/search_hash/${fileHash}`);
}

// ============================================================
// Favorites (requires auth)
// ============================================================
export async function getAccountFavorites(
  type: "post" | "artist"
): Promise<FavoriteCreator[]> {
  return fetchAuth<FavoriteCreator[]>(
    `${API_BASE}/account/favorites?type=${type}`
  );
}

export async function addFavoritePost(
  service: string,
  creatorId: string,
  postId: string
): Promise<void> {
  await fetchAuth(
    `${API_BASE}/favorites/post/${service}/${creatorId}/${postId}`,
    { method: "POST" }
  );
}

export async function removeFavoritePost(
  service: string,
  creatorId: string,
  postId: string
): Promise<void> {
  await fetchAuth(
    `${API_BASE}/favorites/post/${service}/${creatorId}/${postId}`,
    { method: "DELETE" }
  );
}

export async function addFavoriteCreator(
  service: string,
  creatorId: string
): Promise<void> {
  await fetchAuth(
    `${API_BASE}/favorites/creator/${service}/${creatorId}`,
    { method: "POST" }
  );
}

export async function removeFavoriteCreator(
  service: string,
  creatorId: string
): Promise<void> {
  await fetchAuth(
    `${API_BASE}/favorites/creator/${service}/${creatorId}`,
    { method: "DELETE" }
  );
}

// ============================================================
// Post Flagging (requires auth)
// ============================================================
export async function flagPost(
  service: string,
  creatorId: string,
  postId: string
): Promise<void> {
  await fetchAuth(
    `${API_BASE}/${service}/user/${creatorId}/post/${postId}/flag`,
    { method: "POST" }
  );
}

export async function checkPostFlag(
  service: string,
  creatorId: string,
  postId: string
): Promise<boolean> {
  try {
    await fetchAuth(
      `${API_BASE}/${service}/user/${creatorId}/post/${postId}/flag`
    );
    return true;
  } catch {
    return false;
  }
}

// ============================================================
// Misc — App version (public, plain text)
// ============================================================
export async function getAppVersion(): Promise<string> {
  const cached = cacheGet<string>("app_version");
  if (cached) return cached;
  const res = await fetch(`${API_BASE}/app_version`, {
    headers: { Accept: "text/plain" },
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const text = (await res.text()).trim();
  cacheSet("app_version", text);
  return text;
}

// ============================================================
// Helpers — Image URLs
// ============================================================
export function getThumbnailUrl(post: Post): string {
  if (post.file?.path) return getThumbUrl(post.file.path);
  if (post.attachments?.[0]?.path) return getThumbUrl(post.attachments[0].path);
  return "/placeholder.jpg";
}

export function getThumbUrl(path: string): string {
  if (!path) return "/placeholder.jpg";
  return `https://img.pawchive.pw/thumbnail/data${path}`;
}

export function getFileUrl(path: string): string {
  if (!path) return "/placeholder.jpg";
  return `https://file.pawchive.pw/data${path}`;
}

export function getCreatorAvatarUrl(service: string, creatorId: string): string {
  return `https://pawchive.pw/icons/${service}/${creatorId}`;
}

export function getCreatorBannerUrl(service: string, creatorId: string): string {
  return `https://pawchive.pw/banners/${service}/${creatorId}`;
}

export function getPostCoverUrl(post: Post): string {
  if (post.file?.path) return getThumbUrl(post.file.path);
  if (post.attachments?.[0]?.path) return getThumbUrl(post.attachments[0].path);
  return "/placeholder.jpg";
}

export function getServiceColor(service: string): string {
  const colors: Record<string, string> = {
    patreon: "#FF424D",
    fanbox: "#4A90D9",
    fantia: "#FF6FB5",
    subscribestar: "#35C759",
    discord: "#5865F2",
    gumroad: "#FF90E8",
    boosty: "#F15A29",
    afdian: "#946CE6",
  };
  return colors[service] || "#6B7280";
}

export function getServiceLabel(service: string): string {
  const labels: Record<string, string> = {
    patreon: "Patreon",
    fanbox: "Fanbox",
    fantia: "Fantia",
    subscribestar: "SubscribeStar",
    discord: "Discord",
    gumroad: "Gumroad",
    boosty: "Boosty",
    afdian: "爱发电",
  };
  return labels[service] || service;
}
