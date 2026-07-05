// ============================================================
// Admin status — checks /api/admin/status via Supabase.
// Cached in sessionStorage for snappy UI.
// ============================================================

const CACHE_KEY = "pawchive_admin_session";

function fireChange() {
  try { window.dispatchEvent(new CustomEvent("pawchive:admin-change")); } catch {}
}

export function isAdmin(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(CACHE_KEY) === "1";
  } catch { return false; }
}

function setCache(v: boolean) {
  try {
    if (v) sessionStorage.setItem(CACHE_KEY, "1");
    else sessionStorage.removeItem(CACHE_KEY);
  } catch {}
}

export async function refreshAdminStatus(): Promise<boolean> {
  try {
    const res = await fetch("/api/admin/status", { cache: "no-store" });
    const json = await res.json();
    const ok = !!json.ok;
    setCache(ok);
    fireChange();
    return ok;
  } catch {
    setCache(false);
    fireChange();
    return false;
  }
}

export async function adminLogout(): Promise<void> {
  try {
    await fetch("/api/admin/logout", { method: "POST" });
  } catch {}
  setCache(false);
  fireChange();
}
