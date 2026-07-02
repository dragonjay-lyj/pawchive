// ============================================================
// Client-side translation via DeepLX.
// Config comes from Preferences (translationBaseUrl / translationApiKey).
// Results are cached in localStorage to save API quota.
// ============================================================


const CACHE_KEY = "pawchive_translate_cache";
const MAX_CHUNK = 4500; // DeepL limit is ~5000 chars per request

interface CacheEntry {
  target: string;
  source?: string;    // original text (kept for the history panel)
  translated: string;
  ts: number;
}

function loadCache(): Record<string, CacheEntry> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, CacheEntry>) : {};
  } catch { return {}; }
}

function saveCache(cache: Record<string, CacheEntry>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    try { localStorage.removeItem(CACHE_KEY); } catch {}
  }
}

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return h.toString(36);
}

export type TargetLang = "zh" | "en";

// DeepL target lang codes
const LANG_TAG: Record<TargetLang, string> = {
  zh: "ZH",
  en: "EN",
};

// Detect script majority — enough to skip needless translation
export function detectLangHeuristic(text: string): "zh" | "ja" | "en" | "other" {
  const cjk = (text.match(/[一-鿿]/g) ?? []).length;
  const kana = (text.match(/[぀-ヿ]/g) ?? []).length;
  const latin = (text.match(/[a-zA-Z]/g) ?? []).length;
  if (kana > 5) return "ja";
  if (cjk > 5 && cjk > latin) return "zh";
  if (latin > 5) return "en";
  return "other";
}

// ============================================================
// URL builder per DeepLX spec:
// - {{apiKey}} placeholder is replaced literally.
// - api.deeplx.org: insert token between ".org" and "/translate".
// - Any other host without /translate suffix: append /<key>/translate
//   or just /translate when no key.
// ============================================================
export function buildDeepLXUrl(baseUrl: string, apiKey: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  if (!trimmed) throw new Error("DeepLX baseURL not configured");

  if (trimmed.includes("{{apiKey}}")) {
    if (!apiKey) throw new Error("API key required when using {{apiKey}} placeholder");
    return trimmed.replace(/\{\{apiKey\}\}/g, encodeURIComponent(apiKey));
  }

  // Special: official api.deeplx.org
  try {
    const u = new URL(trimmed);
    if (u.hostname === "api.deeplx.org") {
      return apiKey
        ? `https://api.deeplx.org/${encodeURIComponent(apiKey)}/translate`
        : `https://api.deeplx.org/translate`;
    }
  } catch { /* fall through */ }

  // Generic: append /<key>/translate or /translate
  if (/\/translate($|\?)/.test(trimmed)) return trimmed;
  return apiKey
    ? `${trimmed}/${encodeURIComponent(apiKey)}/translate`
    : `${trimmed}/translate`;
}

function chunkText(text: string): string[] {
  if (text.length <= MAX_CHUNK) return [text];
  const parts: string[] = [];
  let buf = "";
  const sentences = text.split(/(?<=[.!?。！？\n])/);
  for (const s of sentences) {
    if ((buf + s).length > MAX_CHUNK) {
      if (buf) parts.push(buf);
      if (s.length > MAX_CHUNK) {
        for (let i = 0; i < s.length; i += MAX_CHUNK) parts.push(s.slice(i, i + MAX_CHUNK));
        buf = "";
      } else {
        buf = s;
      }
    } else {
      buf += s;
    }
  }
  if (buf) parts.push(buf);
  return parts;
}

async function translateChunk(text: string, target: TargetLang, source?: string): Promise<string> {
  const res = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      source_lang: (source ?? "auto").toUpperCase(),
      target_lang: LANG_TAG[target],
    }),
  });
  if (!res.ok) {
    if (res.status === 503) throw new Error("Translation is not configured yet — ask an admin.");
    const err = await res.json().catch(() => null);
    throw new Error(err?.error ? `${err.error}${err.detail ? `: ${err.detail}` : ""}` : `HTTP ${res.status}`);
  }
  const json = await res.json();
  if (typeof json?.data === "string") return json.data;
  throw new Error("Empty translation response");
}

export interface TranslateResult {
  text: string;
  engine: string;
  cached: boolean;
}

export interface TranslateProgress {
  done: number;
  total: number;
}

export async function translateText(
  text: string,
  target: TargetLang,
  onProgress?: (p: TranslateProgress) => void
): Promise<TranslateResult> {
  const trimmed = text.trim();
  if (!trimmed) return { text: "", engine: "noop", cached: true };

  const key = `${target}:${hash(trimmed)}`;
  const cache = loadCache();
  if (cache[key] && cache[key].target === target) {
    onProgress?.({ done: 1, total: 1 });
    return { text: cache[key].translated, engine: "DeepLX (cached)", cached: true };
  }

  const chunks = chunkText(trimmed);
  const total = chunks.length;
  const parts: string[] = [];
  onProgress?.({ done: 0, total });
  for (let i = 0; i < chunks.length; i++) {
    parts.push(await translateChunk(chunks[i], target));
    onProgress?.({ done: i + 1, total });
  }
  const joined = parts.join("");

  cache[key] = { target, source: trimmed.slice(0, 500), translated: joined, ts: Date.now() };
  saveCache(cache);
  return { text: joined, engine: "DeepLX", cached: false };
}

// ============================================================
// Cache introspection — used by Settings translation history
// ============================================================
export interface TranslationHistoryEntry {
  key: string;
  target: string;
  source: string;
  translated: string;
  ts: number;
}

export function listTranslationHistory(): TranslationHistoryEntry[] {
  const cache = loadCache();
  return Object.entries(cache)
    .map(([key, entry]) => ({
      key,
      target: entry.target,
      source: entry.source ?? "",
      translated: entry.translated,
      ts: entry.ts,
    }))
    .sort((a, b) => b.ts - a.ts);
}

export function translationCacheSize(): { entries: number; bytes: number } {
  const cache = loadCache();
  const entries = Object.keys(cache).length;
  const bytes = new Blob([JSON.stringify(cache)]).size;
  return { entries, bytes };
}

export function clearTranslationCache(): void {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(CACHE_KEY); } catch {}
  try { window.dispatchEvent(new CustomEvent("pawchive:translate-cache-change")); } catch {}
}

export function removeTranslationCacheEntry(key: string): void {
  const cache = loadCache();
  if (!(key in cache)) return;
  delete cache[key];
  saveCache(cache);
  try { window.dispatchEvent(new CustomEvent("pawchive:translate-cache-change")); } catch {}
}

// Strip HTML for cleaner translation, preserving line breaks
export function htmlToPlain(html: string): string {
  return html
    .replace(/<br\s*\/?>(?!\n)/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
