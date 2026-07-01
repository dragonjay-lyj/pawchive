// ============================================================
// Local Importer submission log — client-side only.
// Upstream pawchive.st doesn't expose a JSON keys endpoint, so
// this is a best-effort record of what *this browser* submitted.
// Session keys are never stored — only service, timestamp, status.
// ============================================================

const KEY = "pawchive_importer_history";
const MAX_ENTRIES = 50;

export interface ImporterHistoryEntry {
  service: string;
  ts: number;
  ok: boolean;
  autoImport: boolean;
  saveKey: boolean;
  message?: string;   // truncated error/success snippet
}

function load(): ImporterHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ImporterHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function save(list: ImporterHistoryEntry[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent("pawchive:importer-history-change"));
  } catch {}
}

export function listImporterHistory(): ImporterHistoryEntry[] {
  return load().sort((a, b) => b.ts - a.ts);
}

export function recordImporterSubmission(entry: Omit<ImporterHistoryEntry, "ts">): void {
  const list = load();
  list.push({ ...entry, ts: Date.now() });
  // Keep only the most recent MAX_ENTRIES
  const trimmed = list.slice(-MAX_ENTRIES);
  save(trimmed);
}

export function clearImporterHistory(): void {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(KEY); } catch {}
  try { window.dispatchEvent(new CustomEvent("pawchive:importer-history-change")); } catch {}
}
