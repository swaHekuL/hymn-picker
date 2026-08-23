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
  try {
    hymnData = await loadHymns();
  } catch (err) {
    document.getElementById('hymn-cards').innerHTML =
      '<p style="padding:16px;color:#c00;">Could not load hymn data. Please check your connection and reload.</p>';
    return;
  }

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
