// ============================================================
// Pawchive API 类型定义 — 基于 pawchive.st API v1
// ============================================================

// --- Creator (创作者) ---
export interface Creator {
  id: string;
  name: string;
  service: ServiceType;
  indexed: number; // Unix timestamp
  updated: number; // Unix timestamp
  favorited: number;
  ever_imported?: boolean;
  public_id?: string;
}

export type ServiceType = "patreon" | "fanbox" | "fantia" | "subscribestar" | "discord" | "gumroad" | "boosty" | "afdian";

// --- Post (帖子) ---
export interface Post {
  id: string;
  user: string; // creator id
  service: ServiceType;
  title: string;
  content?: string;
  substring?: string;
  embed: Record<string, unknown>;
  shared_file: boolean;
  added: string; // ISO date
  published: string; // ISO date
  edited: string; // ISO date
  file: FileAttachment;
  attachments: FileAttachment[];
  preview_state?: "pending" | "scraped";
  has_full?: boolean;
  origin?: string;
  next?: string | null;
  prev?: string | null;
}

export interface FileAttachment {
  name: string;
  path: string; // relative path like /5c/98/5c984d1f...
}

// --- Announcement ---
export interface Announcement {
  service: ServiceType;
  user_id: string;
  hash: string;
  content: string;
  added: string;
}

// --- Fancard (Fanbox) ---
export interface Fancard {
  id: number;
  user_id: string;
  file_id: number;
  hash: string;
  mtime: string;
  ctime: string;
  mime: string;
  ext: string;
  added: string;
  size: number;
  ihash: string | null;
}

// --- Comment ---
export interface Comment {
  id: string;
  parent_id: string | null;
  commenter: string;
  content: string;
  published: string;
  revisions?: CommentRevision[];
}

export interface CommentRevision {
  id: number;
  content: string;
  added: string;
}

// --- Post Revision ---
export interface PostRevision {
  revision_id: number;
  id: string;
  user: string;
  service: ServiceType;
  title: string;
  content: string;
  embed: Record<string, unknown>;
  shared_file: boolean;
  added: string;
  published: string;
  edited: string;
  file: FileAttachment;
  attachments: FileAttachment[];
}

// --- Creator Profile ---
export interface CreatorProfile {
  id: string;
  public_id: string;
  service: ServiceType;
  name: string;
  indexed: string;
  updated: string;
}

// --- Linked Account ---
export interface LinkedAccount {
  id: string;
  public_id: string;
  service: ServiceType;
  name: string;
  indexed: string;
  updated: string;
}

// --- Favorite ---
export interface FavoriteCreator {
  faved_seq: number;
  id: string;
  indexed: string;
  last_imported: string;
  name: string;
  service: ServiceType;
  updated: string;
  // Present for post favorites (upstream may include these)
  user?: string;
  creator_id?: string;
  title?: string;
}

// --- File Hash Lookup ---
export interface FileHashResult {
  id: number;
  hash: string;
  mtime: string;
  ctime: string;
  mime: string;
  ext: string;
  added: string;
  size: number;
  ihash: string | null;
  posts: HashPost[];
  discord_posts: DiscordHashPost[];
}

export interface HashPost {
  file_id: number;
  id: string;
  user: string;
  service: ServiceType;
  title: string;
  substring: string;
  published: string;
  file: FileAttachment;
  attachments: FileAttachment[];
}

export interface DiscordHashPost {
  file_id: number;
  id: string;
  server: string;
  channel: string;
  substring: string;
  published: string;
  embeds: unknown[];
  mentions: unknown[];
  attachments: FileAttachment[];
}

// --- Pagination ---
export interface PaginatedResponse<T> {
  data: T[];
  offset: number;
  hasMore: boolean;
}

// --- Search Params ---
export interface PostSearchParams {
  q?: string;
  o?: number;
}
