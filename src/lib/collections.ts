// ============================================================
// User-defined favorite collections (Bento groups)
// Persisted to localStorage only — API doesn't expose groups
// ============================================================

export type FavoriteRef =
  | { kind: "creator"; service: string; id: string }
  | { kind: "post"; service: string; creatorId: string; postId: string };

export interface Collection {
  id: string;
  name: string;
  color: string; // hex or css color
  emoji?: string;
  cover?: string;   // URL or data URL — overrides preview grid when set
  items: FavoriteRef[];
  createdAt: number;
}

const KEY = "pawchive_collections";

function loadRaw(): Collection[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Collection[];
  } catch { return []; }
}

function saveRaw(list: Collection[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent("pawchive:collections-change"));
  } catch {}
}

export function listCollections(): Collection[] {
  return loadRaw();
}

export function createCollection(name: string, color = "#D0BCFF", emoji?: string): Collection {
  const list = loadRaw();
  const c: Collection = {
    id: crypto.randomUUID(),
    name: name.trim() || "Untitled",
    color,
    emoji,
    items: [],
    createdAt: Date.now(),
  };
  list.push(c);
  saveRaw(list);
  return c;
}

export function renameCollection(id: string, name: string): void {
  const list = loadRaw();
  const c = list.find((x) => x.id === id);
  if (!c) return;
  c.name = name.trim() || c.name;
  saveRaw(list);
}

export function updateCollectionStyle(
  id: string,
  patch: { color?: string; emoji?: string | null; cover?: string | null },
): void {
  const list = loadRaw();
  const c = list.find((x) => x.id === id);
  if (!c) return;
  if (patch.color !== undefined) c.color = patch.color;
  if (patch.emoji !== undefined) {
    c.emoji = patch.emoji ? patch.emoji.slice(0, 8) : undefined;
  }
  if (patch.cover !== undefined) {
    c.cover = patch.cover ? patch.cover : undefined;
  }
  saveRaw(list);
}

export function deleteCollection(id: string): void {
  saveRaw(loadRaw().filter((c) => c.id !== id));
}

function sameRef(a: FavoriteRef, b: FavoriteRef): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "creator" && b.kind === "creator") {
    return a.service === b.service && a.id === b.id;
  }
  if (a.kind === "post" && b.kind === "post") {
    return a.service === b.service && a.creatorId === b.creatorId && a.postId === b.postId;
  }
  return false;
}

export function addItemToCollection(id: string, item: FavoriteRef): void {
  const list = loadRaw();
  const c = list.find((x) => x.id === id);
  if (!c) return;
  if (c.items.some((i) => sameRef(i, item))) return;
  c.items.push(item);
  saveRaw(list);
}

export function removeItemFromCollection(id: string, item: FavoriteRef): void {
  const list = loadRaw();
  const c = list.find((x) => x.id === id);
  if (!c) return;
  c.items = c.items.filter((i) => !sameRef(i, item));
  saveRaw(list);
}

export function collectionsContaining(item: FavoriteRef): string[] {
  return loadRaw()
    .filter((c) => c.items.some((i) => sameRef(i, item)))
    .map((c) => c.id);
}

export function reorderCollections(orderedIds: string[]): void {
  const map = new Map(loadRaw().map((c) => [c.id, c]));
  const next: Collection[] = [];
  for (const id of orderedIds) {
    const c = map.get(id);
    if (c) { next.push(c); map.delete(id); }
  }
  // Append any not present in orderedIds (safety)
  for (const c of map.values()) next.push(c);
  saveRaw(next);
}
