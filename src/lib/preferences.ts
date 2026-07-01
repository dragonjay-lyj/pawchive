// ============================================================
// User preferences — persisted to localStorage
// ============================================================

export type Theme = "dark" | "darker" | "midnight" | "custom";
export type Rating = 0 | 1 | 2; // 0=SFW, 1=R-15, 2=R-18
export type FontChoice = "sans" | "serif" | "mono";
export type RadiusScale = "default" | "rounded" | "sharp";

export interface Preferences {
  theme: Theme;
  nsfw: boolean;
  hiResImages: boolean;
  contentRating: Rating;
  blurThumbnails: boolean;
  safeSearch: boolean;
  accentColor: string | null;      // custom primary hex, null = use theme default
  aiSearchEndpoint: string;         // POST endpoint for smart search; empty = fallback
  autoTranslate: boolean;           // auto-show translate button on foreign content
  translationBaseUrl: string;       // DeepLX base URL (may contain {{apiKey}})
  translationApiKey: string;        // DeepLX API key
  fontChoice: FontChoice;           // body font family override
  radiusScale: RadiusScale;         // global border-radius scale
}

export const DEFAULT_PREFS: Preferences = {
  theme: "dark",
  nsfw: true,
  hiResImages: true,
  contentRating: 2,
  blurThumbnails: false,
  safeSearch: true,
  accentColor: null,
  aiSearchEndpoint: "",
  autoTranslate: true,
  translationBaseUrl: "https://api.deeplx.org",
  translationApiKey: "",
  fontChoice: "sans",
  radiusScale: "default",
};

const KEY = "pawchive_prefs";

export function loadPrefs(): Preferences {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return { ...DEFAULT_PREFS, ...parsed };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(prefs: Preferences): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
    applyTheme(prefs.theme);
    applyBlur(prefs.blurThumbnails);
    applyAccent(prefs.accentColor);
    applyFont(prefs.fontChoice);
    applyRadius(prefs.radiusScale);
    window.dispatchEvent(new CustomEvent("pawchive:prefs-change", { detail: prefs }));
  } catch {}
}

export function updatePref<K extends keyof Preferences>(key: K, value: Preferences[K]): Preferences {
  const cur = loadPrefs();
  const next = { ...cur, [key]: value };
  savePrefs(next);
  return next;
}

export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.theme = theme;
}

export function applyBlur(blur: boolean): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.blurThumbs = blur ? "on" : "off";
}

// Derive an "on-primary" (contrasting fg) from a hex accent color.
function contrastFg(hex: string): string {
  const m = hex.replace("#", "");
  const n = m.length === 3
    ? m.split("").map((c) => c + c).join("")
    : m.slice(0, 6);
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#1a1520" : "#ffffff";
}

export function applyAccent(color: string | null): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (color) {
    root.style.setProperty("--color-primary", color);
    root.style.setProperty("--color-on-primary", contrastFg(color));
  } else {
    root.style.removeProperty("--color-primary");
    root.style.removeProperty("--color-on-primary");
  }
}

export function applyFont(font: FontChoice): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.font = font;
}

export function applyRadius(radius: RadiusScale): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.radius = radius;
}

// Call this once from a client boot component
export function bootstrapPrefs(): void {
  const p = loadPrefs();
  applyTheme(p.theme);
  applyBlur(p.blurThumbnails);
  applyAccent(p.accentColor);
  applyFont(p.fontChoice);
  applyRadius(p.radiusScale);
}
