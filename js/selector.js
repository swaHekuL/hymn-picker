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
