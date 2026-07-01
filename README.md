# Pawchive

Community frontend redesign for [pawchive.st](https://pawchive.st), a public archive of Patreon / Fanbox / Fantia / SubscribeStar / Discord / Gumroad / Boosty / 爱发电 creators.

Content is served from the upstream `pawchive.st/api/v1` — this repo is a fresh Next.js 16 UI layer with i18n, DeepLX translation, and admin-gated site settings.

## Stack

- Next.js 16 App Router (Turbopack) · React server + client components
- TypeScript · Tailwind CSS v4 · custom design tokens (5-layer visual system)
- No database — user preferences live in localStorage; admin credentials in `.data/admin.json` (scrypt-hashed, gitignored)

## Getting started

```bash
npm install
npm run dev
# open http://localhost:3000
```

Production:

```bash
npm run build
npm start
```

## Features

**Core browsing**
- Home feed with Load More pagination (step 50)
- Browse page: platform / file-format filters, grid/waterfall/list views, mobile bottom-drawer filters
- Search: standard keyword, advanced (platforms + file types + date range), creators, AI smart-search (POST endpoint configurable)
- Creator profile: banner + avatar with graceful fallback, Fluent stat bar, MD3 fancards (Fanbox only), infinite-scrolling Recent Works
- Announcement timeline with month-grouped folding + Markdown rendering
- Post detail: image gallery with built-in lightbox (Esc / arrows / +/- zoom / drag pan / thumbnail strip), description below the main image, favorite / flag / prev-next / revisions / comments (with per-comment translate)
- Favorites: creator + post lists with inline remove, Bento **Collections** (drag-reorder, emoji, accent color, custom cover image)
- Hash Lookup: SHA-256 → related posts + Discord matches

**Locale & translation**
- English + 简体中文, auto-detected from Accept-Language and `cf-ipcountry` / `x-vercel-ip-country` headers on first render, persisted via cookie + localStorage
- Post description and comment translation via **DeepLX** (configurable base URL with `{{apiKey}}` placeholder; `api.deeplx.org` gets special path handling per the DeepLX spec)
- Client-side translation cache with progress indicator, entry-level removal, JSON export, and full clear

**Personalisation (per-user, localStorage)**
- 4 themes (Dark / Darker / Midnight / Custom accent) + custom primary color picker
- Font family: sans / serif display / mono
- Corner radius scale: default / rounded / sharp
- Content rating slider (SFW / R-15 / R-18), NSFW toggle, thumbnail blur, safe search

**Admin (site-wide, `.data/admin.json`)**
- Only admin can edit DeepLX endpoint, AI search endpoint, and change credentials
- Login via `/api/admin/login`, HMAC-signed httpOnly session cookie (8h)
- Change credentials via `/api/admin/password` (scrypt hashed, salt per user)

## Configuration

Optional environment variables (see below for defaults):

| Var | Purpose | Default |
| --- | --- | --- |
| `PAWCHIVE_ADMIN_USER` | Fallback admin username when `.data/admin.json` does not exist | `admin` |
| `PAWCHIVE_ADMIN_PASS` | Fallback admin password | `admin` |
| `PAWCHIVE_ADMIN_SECRET` | HMAC signing key for admin session cookies | `pawchive-admin-dev-secret-change-me` |

Once an admin signs in and changes credentials in Settings → Admin, the values are hashed into `.data/admin.json` and the environment fallback stops being used.

**In production you must set `PAWCHIVE_ADMIN_SECRET` to a long random string, otherwise session tokens can be forged.**

## Project structure

```
src/
  app/
    _components/           # shared client + server components
    api/
      admin/               # login / logout / status / password
      auth/proxy/          # login iframe proxy
      proxy/               # upstream pawchive.st/api/v1 proxy (CORS)
    [service]/user/[id]/…  # creator + post pages
    browse/ search/ creators/ favorites/ hash-lookup/ settings/
    layout.tsx page.tsx globals.css not-found.tsx
  lib/
    api.ts                 # typed pawchive.st API client + cache
    types.ts
    utils.ts
    preferences.ts         # localStorage prefs (theme, font, radius, translation config, …)
    admin.ts               # client-side admin session shim
    adminStore.ts          # server-side scrypt store (.data/admin.json)
    collections.ts         # Bento collections
    translate.ts           # DeepLX client + cache
    markdown.ts            # tiny Markdown renderer (for announcements)
    i18n/
      dict.ts              # en + zh dictionary
      provider.tsx         # I18nProvider + useI18n()
      server.ts            # SSR locale detection
```

## Notes

- The upstream `/api/v1/posts?q=` endpoint doesn't actually filter — Pawchive scans recent posts locally and matches on title/content/substring, up to a 1000-post auto-scan cap. Creator index does support real filtering because `/creators` returns the full list.
- Admin gating is UI-level; anyone with access to `.data/admin.json` on the server can extract the salt + hash. Use filesystem permissions accordingly.
- Content is served from the upstream `img.pawchive.st` (thumbnails) and `file.pawchive.st` (originals) via helpers in `src/lib/api.ts`.

## License

This is a community reskin — content and API ownership belongs to pawchive.st.
