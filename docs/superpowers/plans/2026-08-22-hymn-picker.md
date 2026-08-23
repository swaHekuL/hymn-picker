# Hymn Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a vanilla JS PWA that suggests 3–4 LDS hymns for Sunday sacrament meeting, with per-slot theme checkboxes, slot locking, and offline support, hosted on Cloudflare Pages.

**Architecture:** Fully static client-side app — no server, no build step. All hymn data lives in `hymns.json` fetched at runtime. JavaScript is split into focused ES modules (`data.js`, `selector.js`, `storage.js`, `ui.js`) wired by `app.js` as the entry point. Cloudflare Pages auto-deploys from the GitHub repo on every push.

**Tech Stack:** HTML5, CSS3, Vanilla JavaScript (ES Modules), JSON, PWA Service Worker, Cloudflare Pages, GitHub

**Spec:** `docs/superpowers/specs/2026-08-22-hymn-picker-design.md`

## Global Constraints

- No build step — all files served as-is; no bundler, no transpilation
- ES Modules via `<script type="module">` throughout
- iOS Safari PWA required: `apple-mobile-web-app-capable`, `apple-touch-icon`, `display: standalone`
- Cloudflare Pages: build command = (empty), output directory = `/`
- Slot indices: 0 = Opening, 1 = Sacrament (always), 2 = Intermediate/Closing, 3 = Closing (4-hymn only)
- No external JS dependencies (no jQuery, no frameworks)
- Theme option values in HTML match keys in `THEME_TAG_MAP` in `data.js` exactly

---

### Task 1: Repository & Cloudflare Pages Setup

**Files:**
- Create: `.gitignore`

**Interfaces:**
- Produces: GitHub remote `origin`, Cloudflare Pages project auto-deploying from `main`

- [ ] **Step 1: Initialize git repo**

Run in PowerShell from the project root (`c:\Users\lthaw\Documents\Personal Projects\Hymn Picker`):
```powershell
git init
git branch -M main
```

- [ ] **Step 2: Create .gitignore**

Create `.gitignore`:
```
.DS_Store
Thumbs.db
*.log
node_modules/
```

- [ ] **Step 3: Initial commit**

```powershell
git add .gitignore
git commit -m "chore: init repo"
```

- [ ] **Step 4: Create GitHub repo and push**

If `gh` CLI is available:
```powershell
gh repo create hymn-picker --public --source=. --remote=origin --push
```

If not, create the repo manually at github.com/new (name: `hymn-picker`, public), then:
```powershell
git remote add origin https://github.com/YOUR_USERNAME/hymn-picker.git
git push -u origin main
```

- [ ] **Step 5: Connect Cloudflare Pages**

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → Pages → Create a project
2. Connect to Git → authorize GitHub → select `hymn-picker`
3. Build settings:
   - Framework preset: **None**
   - Build command: *(leave blank)*
   - Build output directory: `/`
4. Click **Save and Deploy**
5. After deploy: Pages project Settings → Custom domains → add your domain

- [ ] **Step 6: Verify pipeline**

The deploy will 404 (no `index.html` yet). That's expected. Confirm in the Cloudflare dashboard that the deployment pipeline ran and completed — the green checkmark means pushes will auto-deploy going forward.

---

### Task 2: PWA Shell — HTML, Manifest, CSS, Icons

**Files:**
- Create: `index.html`
- Create: `manifest.json`
- Create: `style.css`
- Create: `icons/icon-192.png`
- Create: `icons/icon-512.png`

**Interfaces:**
- Produces all DOM IDs and classes consumed by JS tasks:
  - `#hymns-toggle` with `.pill-btn[data-value]` children
  - `#include-new` (checkbox)
  - `#theme-select` (select) — option values: `""`, `"Easter"`, `"Christmas"`, `"Thanksgiving"`, `"4th of July"`, `"mothersfathers"`
  - `#theme-warning` (div, starts hidden)
  - `#hymn-cards` (section, populated by `ui.js`)
  - `#reshuffle-btn` (button)

- [ ] **Step 1: Create manifest.json**

```json
{
  "name": "Hymn Picker",
  "short_name": "Hymns",
  "description": "LDS sacrament meeting hymn suggester",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1a4d8f",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 2: Generate icons**

Create `icons/` directory. Then run this Node.js script to generate both PNGs (requires Node, which ships with `npx`):

```powershell
npx --yes canvas-png-generator 2>$null
```

If that fails, use this self-contained approach — create `icons/make-icons.html`, open it in Chrome, and click "Download" for each size:

```html
<!DOCTYPE html>
<html>
<body>
<canvas id="c"></canvas>
<script>
function makeIcon(size) {
  const c = document.getElementById('c');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1a4d8f';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.15);
  ctx.fill();
  ctx.fillStyle = 'white';
  ctx.font = `bold ${size * 0.55}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('♪', size / 2, size / 2);
  const a = document.createElement('a');
  a.download = `icon-${size}.png`;
  a.href = c.toDataURL();
  a.click();
}
makeIcon(192);
setTimeout(() => makeIcon(512), 500);
</script>
</body>
</html>
```

Save the downloaded `icon-192.png` and `icon-512.png` to the `icons/` folder.

- [ ] **Step 3: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="Hymn Picker">
  <link rel="manifest" href="manifest.json">
  <link rel="apple-touch-icon" href="icons/icon-192.png">
  <title>Hymn Picker</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header class="app-header">
    <h1>Hymn Picker</h1>
  </header>

  <main class="app-main">
    <section class="settings-panel">
      <div class="settings-row">
        <span class="settings-label">Hymns</span>
        <div class="pill-toggle" id="hymns-toggle" role="group" aria-label="Number of hymns">
          <button class="pill-btn active" data-value="3">3</button>
          <button class="pill-btn" data-value="4">4</button>
        </div>
      </div>

      <div class="settings-row">
        <label class="toggle-row" for="include-new">
          <span>Include 2024 hymns</span>
          <div class="switch-wrap">
            <input type="checkbox" id="include-new" role="switch">
            <span class="switch-track"></span>
          </div>
        </label>
      </div>

      <div class="settings-row">
        <label for="theme-select" class="settings-label">Theme</label>
        <select id="theme-select">
          <option value="">None</option>
          <option value="Easter">Easter</option>
          <option value="Christmas">Christmas</option>
          <option value="Thanksgiving">Thanksgiving</option>
          <option value="4th of July">4th of July</option>
          <option value="mothersfathers">Mother's &amp; Father's Day</option>
        </select>
      </div>
    </section>

    <div id="theme-warning" class="theme-warning hidden" role="alert"></div>

    <section id="hymn-cards" class="hymn-cards" aria-label="Suggested hymns">
      <!-- Populated by js/ui.js -->
    </section>

    <button id="reshuffle-btn" class="reshuffle-btn" type="button">Reshuffle</button>
  </main>

  <script>
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }
  </script>
  <script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 4: Create style.css**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --blue: #1a4d8f;
  --blue-light: #e8f0fb;
  --text: #1a1a1a;
  --text-muted: #666;
  --card-bg: #fff;
  --card-shadow: 0 2px 8px rgba(0,0,0,0.1);
  --radius: 12px;
  --spacing: 16px;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #f0f4fa;
  color: var(--text);
  min-height: 100dvh;
  padding-bottom: env(safe-area-inset-bottom);
}

.app-header {
  background: var(--blue);
  color: white;
  padding: 16px var(--spacing);
  padding-top: calc(16px + env(safe-area-inset-top));
  text-align: center;
}
.app-header h1 { font-size: 1.4rem; font-weight: 700; letter-spacing: 0.02em; }

.app-main { padding: var(--spacing); max-width: 480px; margin: 0 auto; }

/* ── Settings ── */
.settings-panel {
  background: var(--card-bg);
  border-radius: var(--radius);
  box-shadow: var(--card-shadow);
  padding: var(--spacing);
  margin-bottom: var(--spacing);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.settings-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.settings-label { font-size: 0.95rem; }

/* Pill toggle */
.pill-toggle {
  display: flex;
  border: 2px solid var(--blue);
  border-radius: 999px;
  overflow: hidden;
}
.pill-btn {
  background: none; border: none;
  padding: 6px 20px; font-size: 0.95rem;
  cursor: pointer; color: var(--blue);
  transition: background 0.15s, color 0.15s;
}
.pill-btn.active { background: var(--blue); color: white; }

/* Toggle switch */
.toggle-row {
  display: flex; align-items: center;
  justify-content: space-between; width: 100%; cursor: pointer;
}
.switch-wrap { position: relative; }
.switch-wrap input[type="checkbox"] {
  opacity: 0; width: 0; height: 0; position: absolute;
}
.switch-track {
  display: block; width: 44px; height: 26px;
  background: #ccc; border-radius: 999px;
  transition: background 0.2s; cursor: pointer;
  position: relative;
}
.switch-track::after {
  content: ''; position: absolute;
  top: 3px; left: 3px;
  width: 20px; height: 20px;
  background: white; border-radius: 50%;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
}
.switch-wrap input:checked + .switch-track { background: var(--blue); }
.switch-wrap input:checked + .switch-track::after { transform: translateX(18px); }

/* Theme select */
#theme-select {
  border: 1.5px solid #ccc; border-radius: 8px;
  padding: 6px 10px; font-size: 0.9rem;
  background: white; color: var(--text); min-width: 150px;
}

/* ── Theme warning ── */
.theme-warning {
  background: #fff8e1; border: 1px solid #f9a825;
  border-radius: 8px; padding: 10px 14px;
  font-size: 0.85rem; color: #795548;
  margin-bottom: var(--spacing);
}
.hidden { display: none !important; }

/* ── Hymn cards ── */
.hymn-cards { display: flex; flex-direction: column; gap: 12px; margin-bottom: var(--spacing); }

.hymn-card {
  background: var(--card-bg);
  border-radius: var(--radius);
  box-shadow: var(--card-shadow);
  padding: 14px var(--spacing);
  border-left: 4px solid transparent;
  transition: border-color 0.15s;
}
.hymn-card.locked { border-left-color: var(--blue); }

.card-header {
  display: flex; align-items: center;
  justify-content: space-between; margin-bottom: 8px;
}
.slot-label {
  font-size: 0.78rem; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.08em; color: var(--blue);
}
.slot-label.sacrament { color: #6d3a1f; }

.lock-btn {
  background: none; border: none; font-size: 1.2rem;
  cursor: pointer; padding: 2px 6px; border-radius: 6px; line-height: 1;
}
.lock-btn:active { background: #eee; }

.hymn-info {
  display: flex; align-items: baseline;
  gap: 10px; margin-bottom: 10px;
}
.hymn-number {
  font-size: 1rem; font-weight: 700;
  color: var(--text-muted); min-width: 36px; flex-shrink: 0;
}
.hymn-title { font-size: 1.05rem; font-weight: 600; line-height: 1.3; }

.theme-check {
  display: flex; align-items: center;
  gap: 6px; font-size: 0.85rem;
  color: var(--text-muted); cursor: pointer;
}
.theme-check input { accent-color: var(--blue); width: 16px; height: 16px; }

/* ── Reshuffle button ── */
.reshuffle-btn {
  width: 100%; padding: 16px;
  font-size: 1.1rem; font-weight: 700;
  background: var(--blue); color: white;
  border: none; border-radius: var(--radius);
  cursor: pointer; letter-spacing: 0.03em;
  transition: opacity 0.15s;
}
.reshuffle-btn:active { opacity: 0.8; }
```

- [ ] **Step 5: Commit and push**

```powershell
git add index.html manifest.json style.css icons/
git commit -m "feat: PWA shell — HTML, manifest, CSS, icons"
git push
```

- [ ] **Step 6: Verify on device**

Wait ~60 seconds for Cloudflare Pages to deploy. Visit your domain in Safari on your iPhone. You should see the styled app shell — settings panel, empty hymn area, Reshuffle button. No hymns yet (JS not wired) but layout should look correct.

---

### Task 3: Hymn Data — hymns.json

**Files:**
- Create: `hymns.json`

**Interfaces:**
- Produces: `{ classic: Hymn[], new2024: Hymn[] }` consumed by `js/data.js`
- `Hymn = { number: number | string, title: string, tags: string[] }`

**Tag taxonomy:**
| Tag | Meaning |
|-----|---------|
| `"sacrament"` | Sacrament-themed (classic hymns 169–196 + new) — exclusive pool for Slot 2 |
| `"easter"` | Resurrection / Easter |
| `"christmas"` | Christmas / Christ's birth |
| `"thanksgiving"` | Gratitude / Thanksgiving |
| `"patriotic"` | 4th of July / national hymns (classic 338–341) |
| `"mothersfathers"` | Family, mothers, fathers |
| `"general"` | Everything else |

Hymns may carry multiple tags, e.g. `["sacrament", "easter"]`.

- [ ] **Step 1: Research sources**

- Classic hymnal (341 hymns): churchofjesuschrist.org/music/library/hymns
- 2024 new hymns: Gospel Library app → Hymns → New Hymns section
- Sacrament section: classic hymns 169–196
- Patriotic section: classic hymns 338–341

- [ ] **Step 2: Create hymns.json with complete data**

File structure (populate all entries from research):
```json
{
  "classic": [
    { "number": 1, "title": "The Morning Breaks", "tags": ["general"] },
    { "number": 2, "title": "The Spirit of God", "tags": ["general"] },
    ...
    { "number": 169, "title": "As Now We Take the Sacrament", "tags": ["sacrament"] },
    { "number": 170, "title": "God, Our Father, Hear Us Pray", "tags": ["sacrament"] },
    { "number": 171, "title": "With Humble Heart", "tags": ["sacrament"] },
    { "number": 172, "title": "In Humility, Our Savior", "tags": ["sacrament"] },
    { "number": 173, "title": "While of These Emblems We Partake", "tags": ["sacrament"] },
    { "number": 174, "title": "While of These Emblems We Partake", "tags": ["sacrament"] },
    { "number": 175, "title": "O God, the Eternal Father", "tags": ["sacrament"] },
    { "number": 176, "title": "'Tis Sweet to Sing the Matchless Love", "tags": ["sacrament"] },
    { "number": 177, "title": "'Tis Sweet to Sing the Matchless Love", "tags": ["sacrament"] },
    { "number": 178, "title": "O Lord of Hosts", "tags": ["sacrament"] },
    { "number": 179, "title": "Again, Our Dear Redeeming Lord", "tags": ["sacrament"] },
    { "number": 180, "title": "Father in Heaven, We Do Believe", "tags": ["sacrament"] },
    { "number": 181, "title": "Jesus of Nazareth, Savior and King", "tags": ["sacrament"] },
    { "number": 182, "title": "We'll Sing All Hail to Jesus' Name", "tags": ["sacrament"] },
    { "number": 183, "title": "In Remembrance of Thy Suffering", "tags": ["sacrament"] },
    { "number": 184, "title": "Upon the Cross of Calvary", "tags": ["sacrament"] },
    { "number": 185, "title": "Reverently and Meekly Now", "tags": ["sacrament"] },
    { "number": 186, "title": "Again We Meet Around the Board", "tags": ["sacrament"] },
    { "number": 187, "title": "God Loved Us, So He Sent His Son", "tags": ["sacrament"] },
    { "number": 188, "title": "Thy Will, O Lord, Be Done", "tags": ["sacrament"] },
    { "number": 189, "title": "O Thou, Before the World Began", "tags": ["sacrament"] },
    { "number": 190, "title": "In Fasting We Approach Thee", "tags": ["sacrament"] },
    { "number": 191, "title": "Behold the Great Redeemer Die", "tags": ["sacrament", "easter"] },
    { "number": 192, "title": "He Died! The Great Redeemer Died", "tags": ["sacrament", "easter"] },
    { "number": 193, "title": "I Stand All Amazed", "tags": ["sacrament"] },
    { "number": 194, "title": "There Is a Green Hill Far Away", "tags": ["sacrament", "easter"] },
    { "number": 195, "title": "To Thee, O God, We Consecrate", "tags": ["sacrament"] },
    { "number": 196, "title": "Jesus Once of Humble Birth", "tags": ["sacrament"] },
    ...
    { "number": 201, "title": "Joy to the World", "tags": ["christmas"] },
    { "number": 202, "title": "Far, Far Away on Judea's Plains", "tags": ["christmas"] },
    { "number": 203, "title": "Angels We Have Heard on High", "tags": ["christmas"] },
    ...
    { "number": 338, "title": "America the Beautiful", "tags": ["patriotic"] },
    { "number": 339, "title": "My Country, 'Tis of Thee", "tags": ["patriotic"] },
    { "number": 340, "title": "The Star-Spangled Banner", "tags": ["patriotic"] },
    { "number": 341, "title": "God Save the King", "tags": ["patriotic"] }
  ],
  "new2024": [
    { "number": "new-001", "title": "...", "tags": ["general"] }
  ]
}
```

- [ ] **Step 3: Verify sacrament pool in browser**

Serve locally with `npx serve . -p 3000` and open http://localhost:3000. In the browser console:
```javascript
fetch('./hymns.json')
  .then(r => r.json())
  .then(d => {
    const sac = d.classic.filter(h => h.tags.includes('sacrament'));
    console.log('Sacrament count:', sac.length);
    console.assert(sac.length >= 20, 'Expected at least 20 sacrament hymns');
    console.log(sac.map(h => `${h.number} - ${h.title}`).join('\n'));
  });
```

- [ ] **Step 4: Verify theme pools**

```javascript
fetch('./hymns.json')
  .then(r => r.json())
  .then(d => {
    const themes = ['easter', 'christmas', 'thanksgiving', 'patriotic', 'mothersfathers'];
    themes.forEach(t => {
      const count = d.classic.filter(h => h.tags.includes(t)).length;
      console.log(`${t}: ${count} hymns`);
      console.assert(count >= 3, `${t} pool too small`);
    });
    console.log('Total classic hymns:', d.classic.length);
    console.assert(d.classic.length === 341, 'Expected 341 classic hymns');
  });
```

- [ ] **Step 5: Commit**

```powershell
git add hymns.json
git commit -m "feat: complete hymn dataset with theme tags"
git push
```

---

### Task 4: Data & Selector Modules

**Files:**
- Create: `js/data.js`
- Create: `js/selector.js`

**Interfaces:**
- Consumes: `./hymns.json`
- Produces from `data.js`:
  - `loadHymns()` → `Promise<{ classic: Hymn[], new2024: Hymn[] }>`
  - `buildPool(data, includeNew2024: boolean)` → `Hymn[]`
  - `getSacramentPool(pool: Hymn[])` → `Hymn[]`
  - `getGeneralPool(pool: Hymn[])` → `Hymn[]`
  - `getThemePool(pool: Hymn[], theme: string)` → `Hymn[]`
- Produces from `selector.js`:
  - `selectHymns(config)` → `{ hymns: (Hymn|null)[], themeWarning: boolean }`
  - `config`: `{ hymnsCount: number, includeNew2024: boolean, theme: string, themeChecked: Record<number,boolean>, lockedHymns: Record<number,Hymn|null>, hymnData: object }`

- [ ] **Step 1: Create js/data.js**

```javascript
let hymnData = null;

export async function loadHymns() {
  if (hymnData) return hymnData;
  const res = await fetch('./hymns.json');
  hymnData = await res.json();
  return hymnData;
}

export function buildPool(data, includeNew2024) {
  const hymns = [...data.classic];
  if (includeNew2024) hymns.push(...data.new2024);
  return hymns;
}

export function getSacramentPool(pool) {
  return pool.filter(h => h.tags.includes('sacrament'));
}

export function getGeneralPool(pool) {
  return pool.filter(h => !h.tags.includes('sacrament'));
}

const THEME_TAG_MAP = {
  'Easter': 'easter',
  'Christmas': 'christmas',
  'Thanksgiving': 'thanksgiving',
  '4th of July': 'patriotic',
  'mothersfathers': 'mothersfathers'
};

export function getThemePool(pool, theme) {
  const tag = THEME_TAG_MAP[theme];
  if (!tag) return [];
  return pool.filter(h => !h.tags.includes('sacrament') && h.tags.includes(tag));
}
```

- [ ] **Step 2: Create js/selector.js**

```javascript
import { buildPool, getSacramentPool, getGeneralPool, getThemePool } from './data.js';

function pickRandom(pool, exclude) {
  const available = pool.filter(h => !exclude.some(e => e.number === h.number));
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

export function selectHymns({ hymnsCount, includeNew2024, theme, themeChecked, lockedHymns, hymnData }) {
  const pool = buildPool(hymnData, includeNew2024);
  const sacramentPool = getSacramentPool(pool);
  const generalPool = getGeneralPool(pool);
  const themePool = theme ? getThemePool(pool, theme) : [];

  const result = new Array(hymnsCount).fill(null);
  const used = [];
  let themeWarning = false;

  // Pre-populate locked slots
  for (let i = 0; i < hymnsCount; i++) {
    if (lockedHymns[i]) {
      result[i] = lockedHymns[i];
      used.push(lockedHymns[i]);
    }
  }

  // Fill Slot 2 (index 1) — always sacrament
  if (!result[1]) {
    const pick = pickRandom(sacramentPool, used);
    if (pick) { result[1] = pick; used.push(pick); }
  }

  // Fill remaining slots
  for (let i = 0; i < hymnsCount; i++) {
    if (i === 1 || result[i]) continue;
    const wantTheme = themeChecked[i] && theme && themePool.length > 0;
    let pick = null;
    if (wantTheme) {
      pick = pickRandom(themePool, used);
      if (!pick) { themeWarning = true; pick = pickRandom(generalPool, used); }
    } else {
      pick = pickRandom(generalPool, used);
    }
    if (pick) { result[i] = pick; used.push(pick); }
  }

  return { hymns: result, themeWarning };
}
```

- [ ] **Step 3: Verify pool construction in browser console**

Serve locally (`npx serve . -p 3000`), open http://localhost:3000, then in the console:
```javascript
import('./js/data.js').then(async m => {
  const data = await m.loadHymns();
  const pool = m.buildPool(data, false);
  console.assert(pool.length === 341, 'Classic pool should be 341');
  const sacPool = m.getSacramentPool(pool);
  console.assert(sacPool.length >= 20, 'Sacrament pool too small');
  const easterPool = m.getThemePool(pool, 'Easter');
  console.assert(easterPool.length >= 3, 'Easter pool too small');
  const xmasPool = m.getThemePool(pool, 'Christmas');
  console.assert(xmasPool.length >= 3, 'Christmas pool too small');
  console.log('All pool checks passed');
});
```

- [ ] **Step 4: Verify selector in browser console**

```javascript
Promise.all([import('./js/selector.js'), import('./js/data.js')])
  .then(async ([sel, data]) => {
    const hymnData = await data.loadHymns();
    const r = sel.selectHymns({
      hymnsCount: 4,
      includeNew2024: false,
      theme: 'Easter',
      themeChecked: { 0: true, 2: false, 3: true },
      lockedHymns: {},
      hymnData
    });
    const hymns = r.hymns;
    console.assert(hymns.length === 4, 'Should return 4 hymns');
    console.assert(hymns[1].tags.includes('sacrament'), 'Slot 2 must be sacrament');
    console.assert(hymns[0].tags.includes('easter'), 'Slot 1 theme checkbox → easter hymn');
    const nums = hymns.map(h => h.number);
    console.assert(new Set(nums).size === 4, 'No duplicate hymns');
    console.log('Selector checks passed:', hymns.map(h => `${h.number} - ${h.title}`));
  });
```

- [ ] **Step 5: Commit**

```powershell
git add js/data.js js/selector.js
git commit -m "feat: hymn pool and selection logic"
git push
```

---

### Task 5: Storage Module

**Files:**
- Create: `js/storage.js`

**Interfaces:**
- Produces:
  - `saveSettings(settings: Settings)` → `void`
  - `loadSettings()` → `Settings | null`
  - `Settings`: `{ hymnsCount: number, includeNew2024: boolean, theme: string, themeChecked: Record<number,boolean>, lockedHymns: Record<number, Hymn|null> }`

- [ ] **Step 1: Create js/storage.js**

```javascript
const KEY = 'hymnpicker_v1';

export function saveSettings(settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Private browsing may block localStorage — silently degrade
  }
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Verify round-trip in browser console**

```javascript
import('./js/storage.js').then(m => {
  const settings = {
    hymnsCount: 4,
    includeNew2024: true,
    theme: 'Christmas',
    themeChecked: { 0: true, 2: false, 3: false },
    lockedHymns: { 0: { number: 1, title: 'The Morning Breaks', tags: ['general'] } }
  };
  m.saveSettings(settings);
  const loaded = m.loadSettings();
  console.assert(loaded.hymnsCount === 4, 'hymnsCount preserved');
  console.assert(loaded.theme === 'Christmas', 'theme preserved');
  console.assert(loaded.lockedHymns[0].title === 'The Morning Breaks', 'locked hymn preserved');
  console.log('Storage round-trip OK');
});
```

- [ ] **Step 3: Commit**

```powershell
git add js/storage.js
git commit -m "feat: localStorage settings persistence"
git push
```

---

### Task 6: UI Rendering Module

**Files:**
- Create: `js/ui.js`

**Interfaces:**
- Consumes: `#hymn-cards`, `#theme-warning` from `index.html`
- Produces:
  - `renderCards(hymns: (Hymn|null)[], lockedSlots: Record<number,Hymn|null>, themeChecked: Record<number,boolean>, hymnsCount: number)` → `void`
  - `showThemeWarning(theme: string)` → `void`
  - `hideThemeWarning()` → `void`
  - DOM output: `.hymn-card[data-slot]`, `.lock-btn[data-slot]`, `.theme-checkbox[data-slot]`

- [ ] **Step 1: Create js/ui.js**

```javascript
const LABELS_3 = ['Opening', 'Sacrament', 'Closing'];
const LABELS_4 = ['Opening', 'Sacrament', 'Intermediate', 'Closing'];

function getSlotLabel(index, hymnsCount) {
  return hymnsCount === 3 ? LABELS_3[index] : LABELS_4[index];
}

export function renderCards(hymns, lockedSlots, themeChecked, hymnsCount) {
  const container = document.getElementById('hymn-cards');
  container.innerHTML = '';

  hymns.forEach((hymn, i) => {
    const isSacrament = i === 1;
    const isLocked = !!lockedSlots[i];
    const label = getSlotLabel(i, hymnsCount);

    const card = document.createElement('div');
    card.className = 'hymn-card' + (isLocked ? ' locked' : '');
    card.dataset.slot = i;

    card.innerHTML = `
      <div class="card-header">
        <span class="slot-label${isSacrament ? ' sacrament' : ''}">${label}</span>
        <button class="lock-btn" data-slot="${i}" aria-label="${isLocked ? 'Unlock' : 'Lock'} this hymn">
          ${isLocked ? '🔒' : '🔓'}
        </button>
      </div>
      <div class="hymn-info">
        <span class="hymn-number">${hymn ? hymn.number : '—'}</span>
        <span class="hymn-title">${hymn ? hymn.title : 'No hymn found'}</span>
      </div>
      ${!isSacrament ? `
        <label class="theme-check">
          <input type="checkbox" class="theme-checkbox" data-slot="${i}"${themeChecked[i] ? ' checked' : ''}>
          Theme
        </label>` : ''}
    `;

    container.appendChild(card);
  });
}

export function showThemeWarning(theme) {
  const labels = {
    'Easter': 'Easter',
    'Christmas': 'Christmas',
    'Thanksgiving': 'Thanksgiving',
    '4th of July': '4th of July',
    'mothersfathers': "Mother's & Father's Day"
  };
  const el = document.getElementById('theme-warning');
  el.textContent = `Not enough ${labels[theme] || theme} hymns — some slots used the general pool.`;
  el.classList.remove('hidden');
}

export function hideThemeWarning() {
  document.getElementById('theme-warning').classList.add('hidden');
}
```

- [ ] **Step 2: Manual render test in browser**

In the console at http://localhost:3000:
```javascript
import('./js/ui.js').then(m => {
  const hymns = [
    { number: 1, title: 'The Morning Breaks', tags: ['general'] },
    { number: 169, title: 'As Now We Take the Sacrament', tags: ['sacrament'] },
    { number: 201, title: 'Joy to the World', tags: ['christmas'] }
  ];
  m.renderCards(hymns, { 0: { number: 1, title: 'The Morning Breaks', tags: ['general'] } }, { 0: true, 2: false }, 3);
  // Verify in DevTools: 3 cards in #hymn-cards
  // Card 0: has 🔒, blue left border (locked class), no "Sacrament" label color
  // Card 1: has "Sacrament" label in brown, no theme checkbox
  // Card 2: has unchecked theme checkbox
  m.showThemeWarning('Christmas');
  // Verify #theme-warning is visible with "Not enough Christmas hymns" text
  m.hideThemeWarning();
  // Verify #theme-warning is hidden again
});
```

- [ ] **Step 3: Commit**

```powershell
git add js/ui.js
git commit -m "feat: UI card rendering module"
git push
```

---

### Task 7: App Entry & Event Wiring

**Files:**
- Create: `js/app.js`

**Interfaces:**
- Consumes: `loadHymns` from `./data.js`, `selectHymns` from `./selector.js`, `renderCards`, `showThemeWarning`, `hideThemeWarning` from `./ui.js`, `saveSettings`, `loadSettings` from `./storage.js`
- Produces: Fully interactive running application

- [ ] **Step 1: Create js/app.js**

```javascript
import { loadHymns } from './data.js';
import { selectHymns } from './selector.js';
import { renderCards, showThemeWarning, hideThemeWarning } from './ui.js';
import { saveSettings, loadSettings } from './storage.js';

const DEFAULT = {
  hymnsCount: 3,
  includeNew2024: false,
  theme: '',
  themeChecked: { 0: false, 2: false, 3: false },
  lockedHymns: {}
};

let state = { ...DEFAULT, themeChecked: { ...DEFAULT.themeChecked }, lockedHymns: {} };
let hymnData = null;
let currentHymns = [];

function getSettings() {
  return {
    hymnsCount: state.hymnsCount,
    includeNew2024: state.includeNew2024,
    theme: state.theme,
    themeChecked: { ...state.themeChecked },
    lockedHymns: { ...state.lockedHymns }
  };
}

function reshuffle() {
  const { hymns, themeWarning } = selectHymns({ ...getSettings(), hymnData });
  currentHymns = hymns;
  renderCards(hymns, state.lockedHymns, state.themeChecked, state.hymnsCount);
  themeWarning && state.theme ? showThemeWarning(state.theme) : hideThemeWarning();
  saveSettings(getSettings());
}

function toggleLock(slotIndex) {
  if (state.lockedHymns[slotIndex]) {
    delete state.lockedHymns[slotIndex];
  } else if (currentHymns[slotIndex]) {
    state.lockedHymns[slotIndex] = currentHymns[slotIndex];
  }
  renderCards(currentHymns, state.lockedHymns, state.themeChecked, state.hymnsCount);
  saveSettings(getSettings());
}

function setHymnsCount(count) {
  state.hymnsCount = count;
  if (count === 3 && state.lockedHymns[3]) delete state.lockedHymns[3];
  document.querySelectorAll('#hymns-toggle .pill-btn').forEach(btn => {
    btn.classList.toggle('active', Number(btn.dataset.value) === count);
  });
  reshuffle();
}

async function init() {
  hymnData = await loadHymns();

  const saved = loadSettings();
  if (saved) {
    state.hymnsCount = saved.hymnsCount ?? DEFAULT.hymnsCount;
    state.includeNew2024 = saved.includeNew2024 ?? DEFAULT.includeNew2024;
    state.theme = saved.theme ?? DEFAULT.theme;
    state.themeChecked = saved.themeChecked ?? { ...DEFAULT.themeChecked };
    state.lockedHymns = saved.lockedHymns ?? {};

    document.querySelectorAll('#hymns-toggle .pill-btn').forEach(btn => {
      btn.classList.toggle('active', Number(btn.dataset.value) === state.hymnsCount);
    });
    document.getElementById('include-new').checked = state.includeNew2024;
    document.getElementById('theme-select').value = state.theme;
  }

  reshuffle();

  document.getElementById('hymns-toggle').addEventListener('click', e => {
    const btn = e.target.closest('.pill-btn');
    if (btn) setHymnsCount(Number(btn.dataset.value));
  });

  document.getElementById('include-new').addEventListener('change', e => {
    state.includeNew2024 = e.target.checked;
    reshuffle();
  });

  document.getElementById('theme-select').addEventListener('change', e => {
    state.theme = e.target.value;
    if (!state.theme) state.themeChecked = { 0: false, 2: false, 3: false };
    reshuffle();
  });

  document.getElementById('reshuffle-btn').addEventListener('click', reshuffle);

  document.getElementById('hymn-cards').addEventListener('click', e => {
    const btn = e.target.closest('.lock-btn');
    if (btn) toggleLock(Number(btn.dataset.slot));
  });

  document.getElementById('hymn-cards').addEventListener('change', e => {
    if (e.target.classList.contains('theme-checkbox')) {
      const slot = Number(e.target.dataset.slot);
      state.themeChecked[slot] = e.target.checked;
      renderCards(currentHymns, state.lockedHymns, state.themeChecked, state.hymnsCount);
      saveSettings(getSettings());
    }
  });
}

init();
```

- [ ] **Step 2: End-to-end manual test (3-hymn mode)**

Open http://localhost:3000. Verify:
1. App loads showing 3 cards: Opening, Sacrament, Closing
2. Sacrament card hymn number is between 169–196
3. Tap Reshuffle — 3 new hymns appear; Sacrament slot always stays 169–196
4. Tap the 🔓 on Opening — it becomes 🔒 and card gets a blue left border
5. Tap Reshuffle — Opening stays the same; Sacrament and Closing change
6. Tap 🔒 again — unlocks; next Reshuffle changes all 3

- [ ] **Step 3: End-to-end manual test (4-hymn mode + theme)**

1. Tap "4" pill — 4 cards appear: Opening, Sacrament, Intermediate, Closing
2. Select "Christmas" in Theme dropdown
3. Check the "Theme" box on Opening card
4. Tap Reshuffle — Opening card should be a Christmas-tagged hymn
5. Uncheck Theme on Opening, check Theme on Closing, Reshuffle — Closing should be Christmas
6. Reload page — settings, lock state, and theme should all be restored exactly

- [ ] **Step 4: Commit**

```powershell
git add js/app.js
git commit -m "feat: app entry, event wiring, full interactive behavior"
git push
```

---

### Task 8: Service Worker

**Files:**
- Create: `sw.js`

**Note:** Service workers require HTTPS to activate. They will silently do nothing on `http://localhost`. Test offline behavior after deploying to Cloudflare Pages (which provides HTTPS automatically).

- [ ] **Step 1: Create sw.js**

```javascript
const CACHE = 'hymnpicker-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/manifest.json',
  '/hymns.json',
  '/js/app.js',
  '/js/data.js',
  '/js/selector.js',
  '/js/storage.js',
  '/js/ui.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
```

- [ ] **Step 2: Commit and push**

```powershell
git add sw.js
git commit -m "feat: service worker for offline support"
git push
```

- [ ] **Step 3: Verify offline on live site**

After Cloudflare Pages deploys (~60 seconds):
1. Open your domain in Chrome on desktop
2. DevTools → Application → Service Workers — confirm `hymnpicker-v1` shows as activated
3. DevTools → Network → throttle to "Offline"
4. Reload — app should load fully from cache
5. On iPhone: open in Safari → Share → Add to Home Screen → launch from home screen → works full-screen with no browser chrome

---

*Self-review notes:*
- *Spec coverage: all features covered across tasks 1–8*
- *`themeChecked` keys, `lockedHymns` shape, and `selectHymns` config are consistent across tasks 4, 5, 6, 7*
- *`THEME_TAG_MAP` key `'mothersfathers'` matches the `<option value="mothersfathers">` in index.html*
- *`showThemeWarning` resolves `'mothersfathers'` to display-friendly "Mother's & Father's Day"*
- *Slot label logic (3-hymn: Opening/Sacrament/Closing, 4-hymn: Opening/Sacrament/Intermediate/Closing) consistent in ui.js and spec*
