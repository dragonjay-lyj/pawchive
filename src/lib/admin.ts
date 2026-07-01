// ============================================================
// Admin session — client shim over /api/admin/*.
// Session lives in an httpOnly cookie; we cache the boolean
// in sessionStorage for snappy UI but always trust the API.
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

export async function tryAdminLogin(user: string, pass: string): Promise<boolean> {
  try {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user, pass }),
    });
    if (!res.ok) {
      setCache(false);
      fireChange();
      return false;
    }
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

export async function changeAdminPassword(
  currentPass: string,
  newPass: string,
  newUser?: string,
): Promise<{ ok: true; user: string } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/admin/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPass, newPass, newUser }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.ok) {
      return { ok: false, error: json?.error ?? `status-${res.status}` };
    }
    return { ok: true, user: json.user };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "network" };
  }
}

export async function adminLogout(): Promise<void> {
  try {
    await fetch("/api/admin/logout", { method: "POST" });
  } catch {}
  setCache(false);
  fireChange();
}
