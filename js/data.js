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
