const SLOT_LABELS = {
  3: ['Opening', 'Sacrament', 'Closing'],
  4: ['Opening', 'Sacrament', 'Intermediate', 'Closing']
};

const THEME_DISPLAY_MAP = {
  'Easter': 'Easter',
  'Christmas': 'Christmas',
  'Thanksgiving': 'Thanksgiving',
  '4th of July': '4th of July',
  'mothersfathers': "Mother's & Father's Day"
};

export function renderCards(hymns, lockedSlots, themeChecked, hymnsCount) {
  const container = document.getElementById('hymn-cards');
  const labels = SLOT_LABELS[hymnsCount] ?? SLOT_LABELS[3];

  container.innerHTML = '';

  hymns.forEach((hymn, i) => {
    const slot = document.createElement('div');
    slot.className = 'hymn-slot';
    slot.setAttribute('data-slot', i);

    // Slot label
    const label = document.createElement('div');
    label.className = 'slot-label';
    if (i === 1) label.classList.add('sacrament');
    label.textContent = labels[i];

    // Lock button
    const lockBtn = document.createElement('button');
    lockBtn.className = 'lock-btn';
    lockBtn.setAttribute('data-slot', i);
    const isLocked = !!lockedSlots[i];
    lockBtn.textContent = isLocked ? '🔒' : '🔓';
    lockBtn.setAttribute('type', 'button');
    lockBtn.setAttribute('aria-label', `${isLocked ? 'Unlock' : 'Lock'} this hymn`);

    // Header with label and lock
    const header = document.createElement('div');
    header.className = 'card-header';
    header.appendChild(label);
    header.appendChild(lockBtn);

    slot.appendChild(header);

    // Card
    const card = document.createElement('div');
    card.className = 'hymn-card';
    if (lockedSlots[i]) card.classList.add('locked');
    card.setAttribute('data-slot', i);

    const number = document.createElement('div');
    number.className = 'hymn-number';
    number.textContent = `#${hymn ? hymn.number : '—'}`;

    const title = document.createElement('div');
    title.className = 'hymn-title';
    title.textContent = hymn ? hymn.title : 'No hymn found';

    const hymnInfo = document.createElement('div');
    hymnInfo.className = 'hymn-info';
    hymnInfo.appendChild(number);
    hymnInfo.appendChild(title);
    card.appendChild(hymnInfo);

    slot.appendChild(card);

    // Theme checkbox (not for Sacrament slot)
    if (i !== 1) {
      const themeCheckLabel = document.createElement('label');
      themeCheckLabel.className = 'theme-check';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'theme-checkbox';
      checkbox.setAttribute('data-slot', i);
      checkbox.checked = themeChecked[i] || false;

      themeCheckLabel.appendChild(checkbox);
      themeCheckLabel.appendChild(document.createTextNode(' Theme'));

      slot.appendChild(themeCheckLabel);
    }

    container.appendChild(slot);
  });
}

export function showThemeWarning(theme) {
  const warningEl = document.getElementById('theme-warning');
  const displayName = THEME_DISPLAY_MAP[theme] || theme;
  warningEl.textContent = `Not enough ${displayName} hymns — some slots used the general pool.`;
  warningEl.classList.remove('hidden');
}

export function hideThemeWarning() {
  const warningEl = document.getElementById('theme-warning');
  warningEl.classList.add('hidden');
}
