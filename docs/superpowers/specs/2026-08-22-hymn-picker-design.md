# Hymn Picker — Design Spec
*Created: 2026-08-22*

## Overview

A Progressive Web App (PWA) that suggests 3 or 4 LDS hymns for a Sunday sacrament meeting. Runs entirely in the browser, works offline, and is installed on iOS via Safari's "Add to Home Screen." Hosted on Cloudflare Pages, source in GitHub.

---

## Tech Stack

- **Language:** Vanilla HTML, CSS, JavaScript — no framework, no build step
- **Hosting:** Cloudflare Pages (connected to GitHub repo; auto-deploys on push)
- **Offline:** Service worker caches all assets on first load
- **Persistence:** Browser localStorage for user settings

---

## Hymn Data

**File:** `hymns.json`

Two top-level arrays: `classic` (the 1985 hymnal, 341 hymns) and `new2024` (hymns released in the 2024 revised hymnal rollout).

Each hymn object:
```json
{ "number": 169, "title": "As Now We Take the Sacrament", "tags": ["sacrament"] }
```

**Tags:** `sacrament`, `easter`, `christmas`, `thanksgiving`, `patriotic`, `mothersfathers`, `general`

- Hymns can carry multiple tags (e.g. a hymn tagged both `sacrament` and `easter`)
- The sacrament pool is all hymns carrying the `sacrament` tag (classic hymns 169–196 plus any new 2024 sacrament hymns)
- New 2024 hymns use the same tag schema and the same number field (string, e.g. `"N1"` or actual assigned number if known)

---

## UI Layout

Single page, mobile-first, top to bottom:

### Settings Strip (always visible)
- **Hymns toggle:** Pill toggle — `3` | `4`
- **2024 hymns toggle:** Switch — "Include 2024 hymns"
- **Theme selector:** Dropdown — None, Easter, Christmas, Thanksgiving, 4th of July, Mother's & Father's Day

### Hymn Cards (3 or 4, stacked)

| Slot | Label (3-hymn mode) | Label (4-hymn mode) | Sacrament forced | Theme checkbox |
|------|---------------------|---------------------|-----------------|----------------|
| 1 | Opening | Opening | No | Yes |
| 2 | Sacrament | Sacrament | Yes — always draws from sacrament pool | No |
| 3 | Closing | Intermediate | No | Yes |
| 4 | — (hidden) | Closing | No | Yes |

Each card displays:
- Slot label (Opening / Sacrament / Intermediate / Closing)
- Hymn number + title (large text)
- Lock icon (right side) — tap to lock/unlock
- "Theme" checkbox (below title) — except Slot 2

### Reshuffle Button
Full-width button at the bottom. On first load the app auto-generates an initial suggestion set without requiring a tap.

---

## Selection Logic

### Pool construction
1. Start with classic hymns
2. If "Include 2024 hymns" is on, add `new2024` hymns to the pool
3. Split pool:
   - **Sacrament pool:** all hymns tagged `sacrament`
   - **General pool:** all hymns not tagged `sacrament`
4. If a theme is selected, the relevant theme-tagged subset of the general pool is available as the **theme pool**

### Slot filling (on reshuffle)
- Locked slots are skipped — hymn unchanged
- **Slot 2:** draws randomly from sacrament pool (respects 2024 toggle)
- **Slots 1, 3, 4:**
  - If "theme" checkbox is checked AND a theme is selected → draw from theme pool
  - Otherwise → draw from full general pool
- No hymn may appear more than once in the same suggestion set

### Edge case — insufficient theme hymns
If the theme pool has fewer hymns than the number of theme-checked slots, remaining theme slots fall back to the general pool. A small inline notice is shown: *"Not enough [Theme] hymns — some slots used general pool."*

---

## PWA & Offline

- **Manifest:** `manifest.json` — app name, icon, `display: standalone`, theme color
- **Service worker:** `sw.js` — caches all static assets (HTML, CSS, JS, JSON, icons) on install; serves from cache first; fetches updates in background
- **Update flow:** Service worker detects new version silently; app reloads to latest on next open
- **iOS install:** User opens in Safari → Share → Add to Home Screen → app icon appears, opens full-screen with no browser chrome

---

## Settings Persistence (localStorage)

Saved automatically on every change, restored on load:
- Number of hymns (3 or 4)
- Include 2024 hymns (true/false)
- Selected theme
- Per-slot theme checkbox state
- Per-slot lock state and locked hymn (number + title)

---

## File Structure

```
/
├── index.html
├── style.css
├── app.js
├── hymns.json
├── sw.js
├── manifest.json
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

---

## Out of Scope

- User accounts or server-side logic
- Audio playback or lyrics
- Links to Gospel Library
- History of past suggestions
- Favorites/exclusions list
