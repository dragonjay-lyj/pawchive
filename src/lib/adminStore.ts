// ============================================================
// Admin credential store — server-only.
// Persists overrides to .data/admin.json so that admin password
// changes survive restarts. Falls back to env vars, then defaults.
// ============================================================

import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const STORE_DIR = path.join(process.cwd(), ".data");
const STORE_FILE = path.join(STORE_DIR, "admin.json");

interface StoredAdmin {
  user: string;
  salt: string;      // hex
  hash: string;      // hex, scrypt N=16384
  updatedAt: number;
}

function envUser(): string {
  return process.env.PAWCHIVE_ADMIN_USER || "admin";
}
function envPass(): string {
  return process.env.PAWCHIVE_ADMIN_PASS || "admin";
}

async function readStored(): Promise<StoredAdmin | null> {
  try {
    const raw = await fs.readFile(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw) as StoredAdmin;
    if (parsed?.user && parsed?.salt && parsed?.hash) return parsed;
    return null;
  } catch { return null; }
}

async function writeStored(rec: StoredAdmin): Promise<void> {
  await fs.mkdir(STORE_DIR, { recursive: true });
  await fs.writeFile(STORE_FILE, JSON.stringify(rec, null, 2), { mode: 0o600 });
}

function hashPass(pass: string, salt: Buffer): Buffer {
  return scryptSync(pass, salt, 32);
}

function makeStored(user: string, pass: string): StoredAdmin {
  const salt = randomBytes(16);
  const hash = hashPass(pass, salt);
  return {
    user,
    salt: salt.toString("hex"),
    hash: hash.toString("hex"),
    updatedAt: Date.now(),
  };
}

export async function verifyAdminCredentials(user: string, pass: string): Promise<boolean> {
  const stored = await readStored();
  if (stored) {
    if (user !== stored.user) return false;
    const salt = Buffer.from(stored.salt, "hex");
    const expected = Buffer.from(stored.hash, "hex");
    const actual = hashPass(pass, salt);
    if (actual.length !== expected.length) return false;
    try { return timingSafeEqual(actual, expected); } catch { return false; }
  }
  // Fallback to env / defaults — timing-safe comparison
  const okUser = timingSafeEqual(Buffer.from(user), Buffer.from(envUser()));
  const okPass = timingSafeEqual(Buffer.from(pass), Buffer.from(envPass()));
  return okUser && okPass;
}

export async function getAdminUsername(): Promise<string> {
  const stored = await readStored();
  return stored?.user ?? envUser();
}

export async function updateAdminPassword(
  currentPass: string,
  newPass: string,
  newUser?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const stored = await readStored();
  const currentUser = stored?.user ?? envUser();

  const currentOk = await verifyAdminCredentials(currentUser, currentPass);
  if (!currentOk) return { ok: false, error: "current-password-wrong" };

  if (!newPass || newPass.length < 4) return { ok: false, error: "new-password-too-short" };

  const nextUser = (newUser?.trim() || currentUser).trim();
  const rec = makeStored(nextUser, newPass);
  try {
    await writeStored(rec);
  } catch (e: unknown) {
    return { ok: false, error: `write-failed: ${e instanceof Error ? e.message : "unknown"}` };
  }
  return { ok: true };
}
