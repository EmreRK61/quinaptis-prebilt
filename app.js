(function () {
  // ================= VIEWPORT HEIGHT FIX =================
  // iOS PWA (Add-to-Home-Screen standalone) reports a wrong viewport height
  // on initial launch — causing a blue gap at the bottom. Recomputing after
  // a few paints (and on resize / visibility changes) matches the real pixels.
  function setAppHeight() {
    // Prefer the larger of visualViewport.height and innerHeight — on iOS
    // PWA these can differ, and we want the app to extend to the true
    // physical screen edge (not stop short of the home indicator).
    const vv = window.visualViewport ? window.visualViewport.height : 0;
    const ih = window.innerHeight || 0;
    const h = Math.max(vv, ih) || window.screen.height || 800;
    document.documentElement.style.setProperty('--app-height', h + 'px');
    // Force reflow so iOS recalculates layout immediately
    document.documentElement.offsetHeight;
  }
  setAppHeight();
  requestAnimationFrame(setAppHeight);
  [50, 150, 300, 600, 1000, 1500, 2500].forEach(ms => setTimeout(setAppHeight, ms));
  window.addEventListener('resize', setAppHeight);
  window.addEventListener('orientationchange', () => {
    setAppHeight();
    setTimeout(setAppHeight, 200);
  });
  window.addEventListener('pageshow', setAppHeight);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      setAppHeight();
      setTimeout(setAppHeight, 100);
    }
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', setAppHeight);
  }

  const screens = document.querySelectorAll('.screen');
  const modals  = document.querySelectorAll('.modal');

  const LIGHT_SCREENS = new Set(['main', 'inbound', 'selection', 'po-list', 'doc-header', 'process-item', 'selected-items']);
  function syncBodyBg(id) {
    if (LIGHT_SCREENS.has(id)) {
      document.body.setAttribute('data-screen-bg', 'light');
    } else {
      document.body.removeAttribute('data-screen-bg');
    }
  }

  // ================= NAVIGATION =================
  function go(id) {
    const target = [...screens].find(s => s.dataset.screen === id);
    if (!target) return;
    screens.forEach(s => s.classList.remove('active'));
    target.classList.add('active');
    syncBodyBg(id);
    closeAllModals();
    closeCalendar();
    history.replaceState(null, '', '#' + id);
    window.scrollTo({ top: 0 });
  }

  function openModal(id) {
    const m = [...modals].find(x => x.dataset.modalId === id);
    if (!m) return;
    m.classList.add('open');
    // Reset scroll position every time so reopening always starts at the top
    m.querySelectorAll('.modal-body-scroll, .modal-body').forEach(el => { el.scrollTop = 0; });
  }

  function closeAllModals() {
    modals.forEach(m => m.classList.remove('open'));
    closeAllDropdowns();
  }

  function closeAllDropdowns() {
    document.querySelectorAll('[data-dropdown].open').forEach(d => d.classList.remove('open'));
  }

  function closeModalById(id) {
    const m = [...modals].find(x => x.dataset.modalId === id);
    if (m) m.classList.remove('open');
  }

  // ================= VARIANTS =================
  let pendingVariantAction = null;

  function loadVariants() {
    try {
      return JSON.parse(localStorage.getItem('prebilt.variants') || '[]');
    } catch (err) { return []; }
  }
  function saveVariants(list) {
    try { localStorage.setItem('prebilt.variants', JSON.stringify(list)); } catch (err) {}
  }

  const STAR_OUTLINE = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 3 14.7 9 21 9.6 16.3 14 17.8 20.5 12 17.1 6.2 20.5 7.7 14 3 9.6 9.3 9"></polygon></svg>';
  const STAR_FILLED  = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 3 14.7 9 21 9.6 16.3 14 17.8 20.5 12 17.1 6.2 20.5 7.7 14 3 9.6 9.3 9"></polygon></svg>';
  const TRASH_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 20 7"></polyline><path d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7"></path><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>';

  function escHtml(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  function renderVariants() {
    const list = loadVariants();
    const container = document.querySelector('[data-variants-list]');
    const empty = document.querySelector('[data-variants-empty]');
    if (!container) return;
    if (!list.length) {
      container.innerHTML = '';
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    let html = '';
    list.forEach((v, i) => {
      const starSvg = v.isDefault ? STAR_FILLED : STAR_OUTLINE;
      const starTip = v.isDefault ? 'Unfavorite' : 'Favorite';
      html += '<div class="variant-row" data-variant-row="' + i + '">';
      html += '  <div class="variant-info">';
      html += '    <div class="variant-name">' + escHtml(v.name) + '</div>';
      html += '    <div class="variant-desc">' + escHtml(v.desc || '') + '</div>';
      html += '  </div>';
      html += '  <div class="variant-actions">';
      html += '    <button class="variant-icon-btn variant-star" data-variant-star="' + i + '" aria-label="' + starTip + '">';
      html += '      ' + starSvg;
      html += '      <span class="tip">' + starTip + '</span>';
      html += '    </button>';
      html += '    <button class="variant-icon-btn variant-delete" data-variant-delete="' + i + '" aria-label="Delete">';
      html += '      ' + TRASH_SVG;
      html += '      <span class="tip">Delete</span>';
      html += '    </button>';
      html += '  </div>';
      html += '  <div class="variant-chevron">&rsaquo;</div>';
      html += '</div>';
    });
    container.innerHTML = html;
  }

  function applyVariant(v) {
    const po = document.querySelector('[data-field-po]');
    const vd = document.querySelector('[data-field-vendor]');
    const dd = document.querySelector('[data-date-display]');
    if (po) po.value = v.po || '';
    if (vd) vd.value = v.vendor || '';
    if (dd) dd.value = v.date || '';
  }

  // Auto-apply default variant when landing on Selection screen (optional)
  function applyDefaultIfAny() {
    const list = loadVariants();
    const def = list.find(v => v.isDefault);
    if (def) applyVariant(def);
  }

  // ================= PO LIST =================
  const PO_DATA = [
    { number: '4500000000', vendor: 'VENDOR1', vendorName: 'Demo Vendor 1', date: '23.03.2026' },
    { number: '4500000405', vendor: 'VENDOR2', vendorName: 'Demo Vendor 2', date: '27.03.2026' }
  ];

  const CHEVRON_R_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"></polyline></svg>';

  // Filters from selection screen submission
  let poListFilter = { po: '', vendor: '' };

  function filterPoRows(filter) {
    const po = (filter.po || '').trim().toLowerCase();
    const vendor = (filter.vendor || '').trim().toUpperCase();
    const free = (filter.free || '').trim().toLowerCase();
    return PO_DATA.filter(row => {
      if (po && row.number.toLowerCase() !== po) return false;
      if (vendor && row.vendor !== vendor) return false;
      if (free) {
        const hay = (row.number + ' ' + row.vendor + ' ' + row.vendorName + ' ' + row.date).toLowerCase();
        if (!hay.includes(free)) return false;
      }
      return true;
    });
  }

  function renderPoList(selectionFilter) {
    if (selectionFilter) poListFilter = selectionFilter;
    const listEl = document.querySelector('[data-po-list]');
    const emptyEl = document.querySelector('[data-po-empty]');
    const countEl = document.querySelector('[data-po-count]');
    const freeInput = document.querySelector('[data-po-filter]');
    if (!listEl) return;

    const free = freeInput ? freeInput.value : '';
    const rows = filterPoRows({ ...poListFilter, free });
    if (countEl) countEl.textContent = rows.length;

    if (!rows.length) {
      listEl.innerHTML = '';
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;

    let html = '';
    rows.forEach(r => {
      html += '<div class="po-row" data-po-row="' + escHtml(r.number) + '">';
      html += '  <div class="po-row-main">';
      html += '    <div class="po-row-label">Purchase order number</div>';
      html += '    <div class="po-row-number">' + escHtml(r.number) + '</div>';
      html += '    <div class="po-row-grid">';
      html += '      <div class="po-row-field"><div class="po-row-label">Vendor</div><div class="po-row-value">' + escHtml(r.vendor) + '</div></div>';
      html += '      <div class="po-row-field"><div class="po-row-label">Vendor name</div><div class="po-row-value">' + escHtml(r.vendorName) + '</div></div>';
      html += '    </div>';
      html += '    <div class="po-row-field"><div class="po-row-label">Document Date</div><div class="po-row-value">' + escHtml(r.date) + '</div></div>';
      html += '  </div>';
      html += '  <div class="po-row-chevron">' + CHEVRON_R_SVG + '</div>';
      html += '</div>';
    });
    listEl.innerHTML = html;
  }

  // ================= DOC HEADER =================
  let docHeaderOrigin = 'selection';

  function openDocHeader(row, origin) {
    docHeaderOrigin = origin || 'selection';
    // New PO selected: reset cart so we don't mix items across POs
    if (currentPo !== (row.number || '')) {
      cartItems = [];
    }
    currentPo = row.number || '';
    const poEl = document.querySelector('[data-doc-po]');
    const vendorEl = document.querySelector('[data-doc-vendor]');
    if (poEl) poEl.textContent = row.number || '';
    if (vendorEl) vendorEl.textContent = row.vendor || '';
    go('doc-header');
  }

  // ================= TOAST =================
  let toastTimer = null;
  function showToast(msg) {
    let toast = document.querySelector('.app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'app-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  // ================= SELECTED ITEMS (cart) =================
  let currentPo = '';
  let cartItems = [];
  let editIndex = null;

  function enterProcessItem(opts) {
    opts = opts || {};
    const qtyInput = document.querySelector('[data-pi-input-qty]');
    const batchInput = document.querySelector('[data-pi-input-batch]');
    const storageValEl = document.querySelector('[data-pi-select-value]');
    const piBackBtn = document.querySelector('[data-pi-back]');
    const errMsg = document.querySelector('[data-pi-qty-error]');

    if (qtyInput) {
      qtyInput.classList.remove('error');
      qtyInput.value = '';
    }
    if (batchInput) batchInput.value = '';
    if (errMsg) errMsg.hidden = true;

    if (typeof opts.editIdx === 'number' && cartItems[opts.editIdx]) {
      const it = cartItems[opts.editIdx];
      editIndex = opts.editIdx;
      if (qtyInput) qtyInput.value = it.qty || '';
      if (batchInput) batchInput.value = it.batch || '';
      if (storageValEl && it.storage) storageValEl.textContent = it.storage;
      // Sync the .selected class in dropdown
      document.querySelectorAll('[data-pi-select-option]').forEach(li => {
        li.classList.toggle('selected', li.getAttribute('data-pi-select-option') === it.storage);
      });
      if (piBackBtn) piBackBtn.dataset.goto = 'selected-items';
    } else {
      editIndex = null;
      if (piBackBtn) piBackBtn.dataset.goto = 'doc-header';
    }
    go('process-item');
  }

  function renderSelectedItems() {
    const poEl = document.querySelector('[data-si-po]');
    if (poEl) poEl.textContent = currentPo || '';
    // Always start with summary collapsed
    const sumToggle = document.querySelector('[data-si-summary-toggle]');
    const sumEl = document.querySelector('[data-si-summary]');
    if (sumToggle) sumToggle.setAttribute('aria-expanded', 'false');
    if (sumEl) sumEl.hidden = true;
    const listEl = document.querySelector('[data-si-list]');
    if (!listEl) return;
    let html = '';
    cartItems.forEach((it, idx) => {
      html += '<div class="si-row" data-si-row="' + idx + '">';
      html += '  <div class="si-row-main">';
      html += '    <div class="si-row-top"><div class="si-row-label">Item</div><div class="si-row-value">' + escHtml(it.item) + '</div></div>';
      html += '    <div class="si-row-grid">';
      html += '      <div class="si-row-field"><div class="si-row-label">Material</div><div class="si-row-value">' + escHtml(it.material) + '</div></div>';
      html += '      <div class="si-row-field"><div class="si-row-label">Description</div><div class="si-row-value">' + escHtml(it.desc) + '</div></div>';
      html += '      <div class="si-row-field"><div class="si-row-label">Quantity</div><div class="si-row-value">' + escHtml(it.qty) + '</div></div>';
      html += '      <div class="si-row-field"><div class="si-row-label">Base Unit</div><div class="si-row-value">' + escHtml(it.unit) + '</div></div>';
      html += '    </div>';
      html += '  </div>';
      html += '  <div class="si-row-chevron">' + CHEVRON_R_SVG + '</div>';
      html += '</div>';
    });
    listEl.innerHTML = html;
  }

  // ================= CALENDAR =================
  const MONTHS = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  const YEAR_MIN = 0;
  const YEAR_MAX = 4000;

  // Calendar state
  let calState = {
    view: 'days',      // 'days' | 'months' | 'years'
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
    selected: null,    // { y, m, d } | null
    yearPage: 0        // start year of year grid
  };

  function clampYear(y) {
    return Math.max(YEAR_MIN, Math.min(YEAR_MAX, y));
  }

  function daysInMonth(y, m) {
    return new Date(y, m + 1, 0).getDate();
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function fmtDate(d) {
    return pad(d.d) + '.' + pad(d.m + 1) + '.' + pad(d.y).padStart(4, '0');
  }

  // ISO week number
  function weekNum(y, m, d) {
    const date = new Date(Date.UTC(y, m, d));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  }

  function openCalendar() {
    const cal = document.querySelector('[data-calendar]');
    if (!cal) return;
    if (calState.selected) {
      calState.year = calState.selected.y;
      calState.month = calState.selected.m;
    }
    calState.view = 'days';
    cal.hidden = false;
    renderCalendar();
  }

  function closeCalendar() {
    const cal = document.querySelector('[data-calendar]');
    if (cal) cal.hidden = true;
  }

  function toggleCalendar() {
    const cal = document.querySelector('[data-calendar]');
    if (!cal) return;
    if (cal.hidden) openCalendar();
    else closeCalendar();
  }

  function renderCalendar() {
    const monthBtn = document.querySelector('[data-cal-title-month]');
    const yearBtn  = document.querySelector('[data-cal-title-year]');
    const body     = document.querySelector('[data-cal-body]');

    if (calState.view === 'days') {
      monthBtn.textContent = MONTHS[calState.month];
      monthBtn.style.display = '';
      yearBtn.textContent = calState.year;
      yearBtn.classList.remove('single');
      renderDays(body);
    } else if (calState.view === 'months') {
      monthBtn.style.display = 'none';
      yearBtn.textContent = calState.year;
      yearBtn.classList.add('single');
      renderMonths(body);
    } else if (calState.view === 'years') {
      monthBtn.style.display = 'none';
      const start = calState.yearPage;
      const end = Math.min(YEAR_MAX, start + 19);
      yearBtn.textContent = start + ' - ' + end;
      yearBtn.classList.add('single');
      renderYears(body);
    }
  }

  function renderDays(body) {
    const y = calState.year, m = calState.month;
    const firstDow = new Date(y, m, 1).getDay(); // 0 = Sun
    const dim = daysInMonth(y, m);
    const prevDim = daysInMonth(y, m - 1);

    let html = '<div class="cal-days">';
    html += '<div></div>'; // top-left week label placeholder
    for (let i = 0; i < 7; i++) {
      html += '<div class="cal-dow">' + DOW[i] + '</div>';
    }

    // Up to 6 rows
    let dayCounter = 1;
    let nextDayCounter = 1;
    for (let row = 0; row < 6; row++) {
      // compute week number for this row based on first in-month day of row
      let rowYear = y, rowMonth = m, rowDay = null;
      for (let col = 0; col < 7; col++) {
        const cellIdx = row * 7 + col;
        if (cellIdx < firstDow) continue;
        const dayVal = cellIdx - firstDow + 1;
        if (dayVal >= 1 && dayVal <= dim) {
          rowDay = dayVal;
          break;
        }
      }
      // if this row is entirely prev-month, compute week from first prev-month day in row
      if (rowDay === null) {
        // row is either fully prev month or fully next month
        const firstCellIdx = row * 7;
        if (firstCellIdx < firstDow) {
          // prev month
          rowYear = (m === 0) ? y - 1 : y;
          rowMonth = (m === 0) ? 11 : m - 1;
          rowDay = prevDim - firstDow + firstCellIdx + 1;
        } else {
          // next month
          rowYear = (m === 11) ? y + 1 : y;
          rowMonth = (m === 11) ? 0 : m + 1;
          rowDay = (row * 7 - firstDow + 1) - dim;
        }
      }
      const wk = weekNum(rowYear, rowMonth, rowDay);
      html += '<div class="cal-wknum">' + wk + '</div>';

      for (let col = 0; col < 7; col++) {
        const cellIdx = row * 7 + col;
        let cellY = y, cellM = m, cellD, out = false;
        if (cellIdx < firstDow) {
          cellM = m - 1; cellY = y;
          if (cellM < 0) { cellM = 11; cellY = y - 1; }
          cellD = prevDim - firstDow + cellIdx + 1;
          out = true;
        } else if (cellIdx - firstDow + 1 > dim) {
          cellM = m + 1; cellY = y;
          if (cellM > 11) { cellM = 0; cellY = y + 1; }
          cellD = cellIdx - firstDow + 1 - dim;
          out = true;
        } else {
          cellD = cellIdx - firstDow + 1;
        }

        const sel = calState.selected &&
                    calState.selected.y === cellY &&
                    calState.selected.m === cellM &&
                    calState.selected.d === cellD;

        html += '<div class="cal-day' + (out ? ' out' : '') + (sel ? ' selected' : '') + '"'
             +  ' data-cal-day="' + cellY + ',' + cellM + ',' + cellD + '">'
             +  cellD + '</div>';
      }

      // Stop if we've rendered all days and are well into next month
      const lastCellIdx = row * 7 + 6;
      if (lastCellIdx - firstDow + 1 > dim + 7) break;
    }

    html += '</div>';
    body.innerHTML = html;
  }

  function renderMonths(body) {
    let html = '<div class="cal-months">';
    for (let i = 0; i < 12; i++) {
      const sel = (i === calState.month) ? ' selected' : '';
      html += '<div class="cal-cell' + sel + '" data-cal-month="' + i + '">' + MONTHS[i] + '</div>';
    }
    html += '</div>';
    body.innerHTML = html;
  }

  function renderYears(body) {
    const start = calState.yearPage;
    let html = '<div class="cal-years">';
    for (let i = 0; i < 20; i++) {
      const yy = start + i;
      if (yy > YEAR_MAX) break;
      const sel = (yy === calState.year) ? ' selected' : '';
      html += '<div class="cal-cell' + sel + '" data-cal-year="' + yy + '">' + pad(yy).padStart(4, '0') + '</div>';
    }
    html += '</div>';
    body.innerHTML = html;
  }

  function calPrev() {
    if (calState.view === 'days') {
      calState.month--;
      if (calState.month < 0) {
        if (calState.year > YEAR_MIN) { calState.month = 11; calState.year--; }
        else calState.month = 0;
      }
    } else if (calState.view === 'months') {
      calState.year = clampYear(calState.year - 1);
    } else if (calState.view === 'years') {
      calState.yearPage = Math.max(YEAR_MIN, calState.yearPage - 20);
    }
    renderCalendar();
  }

  function calNext() {
    if (calState.view === 'days') {
      calState.month++;
      if (calState.month > 11) {
        if (calState.year < YEAR_MAX) { calState.month = 0; calState.year++; }
        else calState.month = 11;
      }
    } else if (calState.view === 'months') {
      calState.year = clampYear(calState.year + 1);
    } else if (calState.view === 'years') {
      if (calState.yearPage + 20 <= YEAR_MAX) calState.yearPage += 20;
    }
    renderCalendar();
  }

  function selectDay(y, m, d) {
    calState.selected = { y: y, m: m, d: d };
    calState.year = y;
    calState.month = m;
    const disp = document.querySelector('[data-date-display]');
    if (disp) {
      const s = fmtDate({ y: y, m: m, d: d });
      disp.value = s + ' - ' + s;
    }
    closeCalendar();
  }

  // ---- Date input · digits-only typing + auto-format ----
  function isValidDMY(d, m1, y) {
    if (m1 < 1 || m1 > 12) return false;
    if (d < 1 || d > 31) return false;
    if (y < 0 || y > 4000) return false;
    const dim = new Date(y, m1, 0).getDate();
    if (d > dim) return false;
    return true;
  }
  function expandYY(yy) { return yy < 50 ? 2000 + yy : 1900 + yy; }
  function fmtD(d, m1, y) {
    return pad(d) + '.' + pad(m1) + '.' + String(y).padStart(4, '0');
  }
  function parseDateInput(raw) {
    const digits = (raw || '').replace(/\D/g, '');
    if (digits.length === 6) {
      const d = +digits.slice(0,2), m1 = +digits.slice(2,4), y = expandYY(+digits.slice(4,6));
      if (isValidDMY(d, m1, y)) {
        const s = fmtD(d, m1, y);
        return { text: s + ' - ' + s, sel: { y: y, m: m1 - 1, d: d } };
      }
    } else if (digits.length === 8) {
      const d = +digits.slice(0,2), m1 = +digits.slice(2,4), y = +digits.slice(4,8);
      if (isValidDMY(d, m1, y)) {
        const s = fmtD(d, m1, y);
        return { text: s + ' - ' + s, sel: { y: y, m: m1 - 1, d: d } };
      }
    } else if (digits.length === 12) {
      const d1 = +digits.slice(0,2), m1a = +digits.slice(2,4), y1 = expandYY(+digits.slice(4,6));
      const d2 = +digits.slice(6,8), m1b = +digits.slice(8,10), y2 = expandYY(+digits.slice(10,12));
      if (isValidDMY(d1, m1a, y1) && isValidDMY(d2, m1b, y2)) {
        return { text: fmtD(d1, m1a, y1) + ' - ' + fmtD(d2, m1b, y2), sel: { y: y1, m: m1a - 1, d: d1 } };
      }
    } else if (digits.length === 16) {
      const d1 = +digits.slice(0,2), m1a = +digits.slice(2,4), y1 = +digits.slice(4,8);
      const d2 = +digits.slice(8,10), m1b = +digits.slice(10,12), y2 = +digits.slice(12,16);
      if (isValidDMY(d1, m1a, y1) && isValidDMY(d2, m1b, y2)) {
        return { text: fmtD(d1, m1a, y1) + ' - ' + fmtD(d2, m1b, y2), sel: { y: y1, m: m1a - 1, d: d1 } };
      }
    }
    return null;
  }

  (function wireDateInput() {
    const el = document.querySelector('[data-date-display]');
    if (!el) return;
    let lastGood = el.value;
    el.addEventListener('focus', () => {
      el.select();
    });
    el.addEventListener('keydown', e => {
      if (e.ctrlKey || e.metaKey) return;
      const allow = ['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown',
                     'Home','End','Tab','Enter'];
      if (allow.includes(e.key)) {
        if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
        return;
      }
      if (!/^\d$/.test(e.key)) {
        e.preventDefault();
      }
    });
    el.addEventListener('blur', () => {
      const v = el.value.trim();
      if (v === '') { lastGood = ''; return; }
      const digitsOnly = /^\d+$/.test(v);
      const parsed = parseDateInput(v);
      if (parsed) {
        el.value = parsed.text;
        calState.selected = parsed.sel;
        calState.year = parsed.sel.y;
        calState.month = parsed.sel.m;
        lastGood = el.value;
      } else if (digitsOnly) {
        // user typed digits but not 6/8/12/16 — keep raw digits
        lastGood = el.value;
      } else if (/^\d{2}\.\d{2}\.\d{4}\s*-\s*\d{2}\.\d{2}\.\d{4}$/.test(v)) {
        lastGood = el.value;
      } else {
        el.value = lastGood;
      }
    });
  })();

  // Initial calendar state when demo loads
  (function initCal() {
    const today = new Date();
    calState.year = today.getFullYear();
    calState.month = today.getMonth();
    calState.yearPage = Math.floor(calState.year / 20) * 20;
  })();

  // ================= EVENT DELEGATION =================
  // PO list · live filter input + Process Item numeric qty filter
  document.addEventListener('input', (e) => {
    if (e.target && e.target.matches && e.target.matches('[data-po-filter]')) {
      renderPoList();
    }
    if (e.target && e.target.matches && e.target.matches('[data-pi-input-qty]')) {
      const cleaned = e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
      if (cleaned !== e.target.value) e.target.value = cleaned;
      if (e.target.value.trim()) {
        e.target.classList.remove('error');
        const errMsg = document.querySelector('[data-pi-qty-error]');
        if (errMsg) errMsg.hidden = true;
      }
    }
  });

  // Selection screen · Enter key submits (from PO/Vendor fields)
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    if (!e.target || !e.target.matches) return;
    if (e.target.matches('[data-field-po], [data-field-vendor]')) {
      e.preventDefault();
      const btn = document.querySelector('[data-select-submit]');
      if (btn) btn.click();
    }
  });

  document.addEventListener('click', e => {
    // Calendar toggle
    if (e.target.closest('[data-date-toggle]')) {
      e.preventDefault();
      e.stopPropagation();
      toggleCalendar();
      return;
    }

    // Calendar internal clicks (don't fall through)
    const cal = e.target.closest('[data-calendar]');
    if (cal) {
      if (e.target.closest('[data-cal-prev]')) { e.preventDefault(); calPrev(); return; }
      if (e.target.closest('[data-cal-next]')) { e.preventDefault(); calNext(); return; }
      if (e.target.closest('[data-cal-title-month]')) {
        e.preventDefault();
        calState.view = 'months';
        renderCalendar();
        return;
      }
      if (e.target.closest('[data-cal-title-year]')) {
        e.preventDefault();
        calState.view = 'years';
        calState.yearPage = Math.floor(calState.year / 20) * 20;
        renderCalendar();
        return;
      }
      const dayEl = e.target.closest('[data-cal-day]');
      if (dayEl) {
        e.preventDefault();
        const [y, m, d] = dayEl.dataset.calDay.split(',').map(Number);
        selectDay(y, m, d);
        return;
      }
      const mEl = e.target.closest('[data-cal-month]');
      if (mEl) {
        e.preventDefault();
        calState.month = parseInt(mEl.dataset.calMonth, 10);
        calState.view = 'days';
        renderCalendar();
        return;
      }
      const yEl = e.target.closest('[data-cal-year]');
      if (yEl) {
        e.preventDefault();
        calState.year = parseInt(yEl.dataset.calYear, 10);
        calState.view = 'months';
        renderCalendar();
        return;
      }
      return;
    }

    // Dropdown toggle
    const ddToggle = e.target.closest('[data-dropdown-toggle]');
    if (ddToggle) {
      e.preventDefault();
      e.stopPropagation();
      const dd = ddToggle.closest('[data-dropdown]');
      const wasOpen = dd.classList.contains('open');
      closeAllDropdowns();
      if (!wasOpen) dd.classList.add('open');
      return;
    }

    const ddOption = e.target.closest('[data-dropdown-option]');
    if (ddOption) {
      e.preventDefault();
      const dd = ddOption.closest('[data-dropdown]');
      const val = ddOption.dataset.dropdownOption;
      const valEl = dd.querySelector('[data-dropdown-value]');
      if (valEl) valEl.textContent = val;
      dd.querySelectorAll('[data-dropdown-option]').forEach(o => o.classList.remove('selected'));
      ddOption.classList.add('selected');
      dd.classList.remove('open');
      return;
    }

    // Close dropdowns on outside click (modals stay open)
    if (!e.target.closest('[data-dropdown]')) {
      closeAllDropdowns();
    }

    const gotoEl = e.target.closest('[data-goto]');
    if (gotoEl) {
      e.preventDefault();
      go(gotoEl.dataset.goto);
      return;
    }

    const modalEl = e.target.closest('[data-modal]');
    if (modalEl) {
      e.preventDefault();
      openModal(modalEl.dataset.modal);
      return;
    }

    if (e.target.closest('[data-logoff-yes]')) {
      e.preventDefault();
      go('welcome');
      return;
    }

    if (e.target.closest('[data-close-modal]')) {
      e.preventDefault();
      closeAllModals();
      return;
    }

    // Selection screen · Select button validation
    if (e.target.closest('[data-select-submit]')) {
      e.preventDefault();
      const po = (document.querySelector('[data-field-po]')?.value || '').trim();
      const vendor = (document.querySelector('[data-field-vendor]')?.value || '').trim().toUpperCase();
      const poOk = po === '' || PO_DATA.some(r => r.number === po);
      const vendorOk = vendor === '' || PO_DATA.some(r => r.vendor === vendor);
      if (!poOk || !vendorOk) {
        openModal('messages');
        return;
      }
      const matches = filterPoRows({ po, vendor });
      if (matches.length === 1) {
        // Exact single match: skip list, go straight to doc header
        openDocHeader(matches[0], 'selection');
      } else {
        renderPoList({ po, vendor });
        go('po-list');
      }
      return;
    }

    // PO list · click a PO row -> doc header
    const poRow = e.target.closest('[data-po-row]');
    if (poRow) {
      e.preventDefault();
      const number = poRow.getAttribute('data-po-row');
      const row = PO_DATA.find(r => r.number === number);
      if (row) openDocHeader(row, 'po-list');
      return;
    }

    // Doc header · back button
    if (e.target.closest('[data-doc-back]')) {
      e.preventDefault();
      go(docHeaderOrigin || 'selection');
      return;
    }

    // Doc header · continue -> process item (fresh entry)
    if (e.target.closest('[data-doc-continue]')) {
      e.preventDefault();
      enterProcessItem({});
      return;
    }

    // Selected-items · click row -> edit in process-item
    const siRow = e.target.closest('[data-si-row]');
    if (siRow) {
      e.preventDefault();
      const idx = parseInt(siRow.dataset.siRow, 10);
      enterProcessItem({ editIdx: idx });
      return;
    }

    // Process item · more (placeholder)
    if (e.target.closest('[data-pi-more]')) {
      e.preventDefault();
      return;
    }

    // Doc header / process item · capture image/signature (placeholder)
    if (e.target.closest('[data-doc-capture]')) {
      e.preventDefault();
      return;
    }

    // Process item · storage location dropdown toggle
    const piSelToggle = e.target.closest('[data-pi-select-toggle]');
    if (piSelToggle) {
      e.preventDefault();
      const sel = piSelToggle.closest('[data-pi-select]');
      const list = sel.querySelector('.pi-select-list');
      const open = sel.classList.toggle('open');
      if (list) list.hidden = !open;
      return;
    }

    // Process item · storage location option pick
    const piOpt = e.target.closest('[data-pi-select-option]');
    if (piOpt) {
      e.preventDefault();
      const val = piOpt.getAttribute('data-pi-select-option');
      const sel = piOpt.closest('[data-pi-select]');
      const valEl = sel.querySelector('[data-pi-select-value]');
      if (valEl) valEl.textContent = val;
      sel.querySelectorAll('.pi-select-list li').forEach(li => li.classList.remove('selected'));
      piOpt.classList.add('selected');
      sel.classList.remove('open');
      const list = sel.querySelector('.pi-select-list');
      if (list) list.hidden = true;
      return;
    }

    // Process item · Save -> add to cart, go to selected-items
    if (e.target.closest('[data-pi-save]')) {
      e.preventDefault();
      const qtyInput = document.querySelector('[data-pi-input-qty]');
      const storageEl = document.querySelector('[data-pi-select-value]');
      const qty = (qtyInput?.value || '').trim();
      if (!qty || !/^[0-9]+(\.[0-9]+)?$/.test(qty) || parseFloat(qty) <= 0) {
        if (qtyInput) {
          qtyInput.classList.add('error');
          qtyInput.focus();
        }
        const errMsg = document.querySelector('[data-pi-qty-error]');
        if (errMsg) errMsg.hidden = false;
        showToast('Error found in input data');
        return;
      }
      const item = (document.querySelector('[data-pi-item]')?.textContent || '').trim();
      const material = (document.querySelector('[data-pi-material]')?.textContent || '').trim();
      const desc = (document.querySelector('[data-pi-desc]')?.textContent || '').trim();
      const unit = (document.querySelector('[data-pi-unit]')?.textContent || '').trim();
      const storage = storageEl ? storageEl.textContent.trim() : '';
      const batch = (document.querySelector('[data-pi-input-batch]')?.value || '').trim();
      const entry = { item, material, desc, qty, unit, storage, batch };
      if (editIndex !== null && cartItems[editIndex]) {
        cartItems[editIndex] = entry;
        editIndex = null;
      } else {
        cartItems.push(entry);
      }
      // Clear inputs so next Save is a fresh entry
      qtyInput.value = '';
      const batchInput = document.querySelector('[data-pi-input-batch]');
      if (batchInput) batchInput.value = '';
      // Reset back-btn target to doc-header (next process-item visit defaults
      // to fresh-entry behaviour unless explicitly re-entered via row click)
      const piBackBtn = document.querySelector('[data-pi-back]');
      if (piBackBtn) piBackBtn.dataset.goto = 'doc-header';
      renderSelectedItems();
      go('selected-items');
      return;
    }

    // Selected-items · summary toggle
    const siSumToggle = e.target.closest('[data-si-summary-toggle]');
    if (siSumToggle) {
      e.preventDefault();
      const expanded = siSumToggle.getAttribute('aria-expanded') !== 'false';
      siSumToggle.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      const sum = document.querySelector('[data-si-summary]');
      if (sum) sum.hidden = expanded;
      return;
    }

    // Selected-items · Post -> generate material doc, remove PO, show messages
    if (e.target.closest('[data-si-post]')) {
      e.preventDefault();
      if (!cartItems.length) return;
      // Generate a 10-digit "material document number" starting with 5
      const materialDoc = '5' + Math.floor(1000000000 + Math.random() * 9000000000).toString().slice(0, 9);
      // Remove the posted PO from in-memory list (resets on page refresh)
      const poIdx = PO_DATA.findIndex(r => r.number === currentPo);
      if (poIdx >= 0) PO_DATA.splice(poIdx, 1);
      // Reset state for next demo run
      cartItems = [];
      currentPo = '';
      editIndex = null;
      renderSelectedItems();
      renderPoList();
      // Update messages modal content -> success
      const msgText = document.querySelector('[data-msg-text]');
      const msgBadge = document.querySelector('[data-msg-badge]');
      if (msgText) msgText.textContent = 'Material document ' + materialDoc + ' posted';
      if (msgBadge) {
        msgBadge.textContent = 'S';
        msgBadge.classList.remove('msg-badge-error');
        msgBadge.classList.add('msg-badge-success');
      }
      go('selection');
      openModal('messages');
      return;
    }

    // Selected-items · more menu toggle
    if (e.target.closest('[data-si-more]')) {
      e.preventDefault();
      const menu = document.querySelector('[data-si-more-menu]');
      if (menu) menu.hidden = !menu.hidden;
      return;
    }

    // Selected-items · Add New Item -> fresh process-item
    if (e.target.closest('[data-si-add-new]')) {
      e.preventDefault();
      const menu = document.querySelector('[data-si-more-menu]');
      if (menu) menu.hidden = true;
      enterProcessItem({});
      return;
    }

    // Selected-items · Empty Basket -> clear cart, go back to doc-header
    if (e.target.closest('[data-si-empty]')) {
      e.preventDefault();
      const menu = document.querySelector('[data-si-more-menu]');
      if (menu) menu.hidden = true;
      cartItems = [];
      renderSelectedItems();
      go('doc-header');
      return;
    }

    // Close more-menu when clicking outside
    const moreMenu = document.querySelector('[data-si-more-menu]');
    if (moreMenu && !moreMenu.hidden) {
      const moreWrap = moreMenu.closest('.si-more-wrap');
      if (moreWrap && !moreWrap.contains(e.target)) {
        moreMenu.hidden = true;
      }
    }

    // Close pi-select dropdown on outside click
    document.querySelectorAll('[data-pi-select].open').forEach(sel => {
      if (!sel.contains(e.target)) {
        sel.classList.remove('open');
        const list = sel.querySelector('.pi-select-list');
        if (list) list.hidden = true;
      }
    });

    // PO list · summary toggle
    const sumToggle = e.target.closest('[data-po-summary-toggle]');
    if (sumToggle) {
      e.preventDefault();
      const expanded = sumToggle.getAttribute('aria-expanded') !== 'false';
      sumToggle.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      const sum = document.querySelector('[data-po-summary]');
      if (sum) sum.hidden = expanded;
      return;
    }

    // Selection screen · Open variants list
    if (e.target.closest('[data-open-variants]')) {
      e.preventDefault();
      renderVariants();
      openModal('variants');
      return;
    }

    // Variants list · star toggle (favorite/unfavorite)
    const starBtn = e.target.closest('[data-variant-star]');
    if (starBtn) {
      e.preventDefault();
      e.stopPropagation();
      const idx = parseInt(starBtn.dataset.variantStar, 10);
      const list = loadVariants();
      if (!list[idx]) return;
      if (list[idx].isDefault) {
        // Unfavorite immediately (no confirm)
        list[idx].isDefault = false;
        saveVariants(list);
        renderVariants();
      } else {
        pendingVariantAction = { type: 'default', index: idx };
        const nameEl = document.querySelector('[data-modal-id="confirmDefault"] [data-confirm-name]');
        if (nameEl) nameEl.textContent = list[idx].name;
        openModal('confirmDefault');
      }
      return;
    }

    // Variants list · delete
    const delBtn = e.target.closest('[data-variant-delete]');
    if (delBtn) {
      e.preventDefault();
      e.stopPropagation();
      const idx = parseInt(delBtn.dataset.variantDelete, 10);
      const list = loadVariants();
      if (!list[idx]) return;
      pendingVariantAction = { type: 'delete', index: idx };
      const nameEl = document.querySelector('[data-modal-id="confirmDelete"] [data-confirm-name]');
      if (nameEl) nameEl.textContent = list[idx].name;
      openModal('confirmDelete');
      return;
    }

    // Confirm Default OK
    if (e.target.closest('[data-confirm-default-ok]')) {
      e.preventDefault();
      if (pendingVariantAction && pendingVariantAction.type === 'default') {
        const list = loadVariants();
        list.forEach(v => v.isDefault = false);
        if (list[pendingVariantAction.index]) list[pendingVariantAction.index].isDefault = true;
        saveVariants(list);
        renderVariants();
      }
      pendingVariantAction = null;
      closeModalById('confirmDefault');
      return;
    }

    // Confirm Delete OK
    if (e.target.closest('[data-confirm-delete-ok]')) {
      e.preventDefault();
      if (pendingVariantAction && pendingVariantAction.type === 'delete') {
        const list = loadVariants();
        list.splice(pendingVariantAction.index, 1);
        saveVariants(list);
        renderVariants();
      }
      pendingVariantAction = null;
      closeModalById('confirmDelete');
      return;
    }

    // Variant row click (not on buttons) → load into form
    const row = e.target.closest('[data-variant-row]');
    if (row) {
      e.preventDefault();
      const idx = parseInt(row.dataset.variantRow, 10);
      const list = loadVariants();
      if (list[idx]) applyVariant(list[idx]);
      closeAllModals();
      return;
    }

    // Selection screen · Save variant button (disk icon)
    if (e.target.closest('[data-save-variant]')) {
      e.preventDefault();
      const nameEl = document.querySelector('[data-variant-name]');
      const descEl = document.querySelector('[data-variant-desc]');
      const privEl = document.querySelector('[data-variant-private]');
      const defEl  = document.querySelector('[data-variant-default]');
      if (nameEl) nameEl.value = '';
      if (descEl) descEl.value = '';
      if (privEl) privEl.checked = false;
      if (defEl)  defEl.checked = false;
      openModal('variant');
      setTimeout(() => nameEl && nameEl.focus(), 80);
      return;
    }

    // Variant modal · Save
    if (e.target.closest('[data-variant-save]')) {
      e.preventDefault();
      const name = (document.querySelector('[data-variant-name]')?.value || '').trim();
      const desc = (document.querySelector('[data-variant-desc]')?.value || '').trim();
      const isPrivate = !!document.querySelector('[data-variant-private]')?.checked;
      const isDefault = !!document.querySelector('[data-variant-default]')?.checked;
      if (!name) { return; }
      const po = (document.querySelector('[data-field-po]')?.value || '').trim();
      const vendor = (document.querySelector('[data-field-vendor]')?.value || '').trim();
      const date = (document.querySelector('[data-date-display]')?.value || '').trim();
      const variant = { name, desc, isPrivate, isDefault, po, vendor, date, saved: Date.now() };
      try {
        const stored = JSON.parse(localStorage.getItem('prebilt.variants') || '[]');
        if (isDefault) stored.forEach(v => v.isDefault = false);
        const existing = stored.findIndex(v => v.name === name);
        if (existing >= 0) stored[existing] = variant;
        else stored.push(variant);
        localStorage.setItem('prebilt.variants', JSON.stringify(stored));
      } catch (err) {}
      closeAllModals();
      return;
    }

    // Selection title · 4 clicks opens debug modal
    const debugTitle = e.target.closest('[data-debug-title]');
    if (debugTitle) {
      const now = Date.now();
      if (!debugTitle._clicks || now - debugTitle._lastClick > 1500) {
        debugTitle._clicks = 0;
      }
      debugTitle._clicks++;
      debugTitle._lastClick = now;
      if (debugTitle._clicks >= 4) {
        debugTitle._clicks = 0;
        const page = debugTitle.dataset.debugPage || 'oPage1000';
        const pageEl = document.querySelector('[data-debug-page-value]');
        if (pageEl) pageEl.textContent = page;
        openModal('debug');
      }
      return;
    }

    // Selection screen · Reset/Undo button (clears all fields)
    if (e.target.closest('[data-reset-form]')) {
      e.preventDefault();
      const poInput = document.querySelector('[data-field-po]');
      const vdInput = document.querySelector('[data-field-vendor]');
      const dateDisp = document.querySelector('[data-date-display]');
      if (poInput) poInput.value = '';
      if (vdInput) vdInput.value = '';
      if (dateDisp) {
        dateDisp.value = '';
      }
      calState.selected = null;
      closeCalendar();
      return;
    }
  });

  // ================= EDGE-SWIPE BACK GESTURE =================
  (function initEdgeSwipe() {
    const EDGE_ZONE = 24;          // px from left edge where gesture starts
    const TRIGGER_THRESHOLD = 80;  // px horizontal travel to arm back
    const MAX_VERTICAL = 40;       // px — more vertical than this cancels
    const MAX_INDICATOR_X = 110;   // cap for how far the pill slides with finger

    let startX = 0, startY = 0;
    let tracking = false, active = false;
    let indicator = null;

    function ensureIndicator() {
      if (indicator) return indicator;
      indicator = document.createElement('div');
      indicator.className = 'edge-swipe-indicator';
      indicator.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>';
      document.body.appendChild(indicator);
      return indicator;
    }

    function getBackTarget() {
      const openModal = document.querySelector('.modal.open');
      if (openModal) return null; // modals should close via their own X, not back-swipe
      const activeScreen = document.querySelector('.screen.active');
      if (!activeScreen) return null;
      const backBtn = activeScreen.querySelector('.back-btn[data-goto]');
      return backBtn ? backBtn.dataset.goto : null;
    }

    function resetIndicator(animate) {
      if (!indicator) return;
      if (animate) {
        indicator.classList.add('snap-back');
        setTimeout(() => {
          if (!indicator) return;
          indicator.classList.remove('snap-back');
          indicator.style.transform = '';
          indicator.style.opacity = '';
          indicator.classList.remove('armed');
        }, 260);
      } else {
        indicator.style.transform = '';
        indicator.style.opacity = '';
        indicator.classList.remove('armed');
        indicator.classList.remove('snap-back');
      }
    }

    document.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      if (t.clientX > EDGE_ZONE) return;
      if (!getBackTarget()) return;
      startX = t.clientX;
      startY = t.clientY;
      tracking = true;
      active = false;
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (!tracking) return;
      const t = e.touches[0];
      const dx = t.clientX - startX;
      const dy = Math.abs(t.clientY - startY);
      if (!active) {
        if (dy > MAX_VERTICAL) { tracking = false; return; }
        if (dx < 6) return;
        active = true;
        ensureIndicator();
      }
      if (dx < 0) return;
      const ind = indicator;
      const travelled = Math.min(dx, MAX_INDICATOR_X);
      const progress = Math.min(1, dx / TRIGGER_THRESHOLD);
      ind.style.transform = `translate(${travelled - 50}px, -50%)`;
      ind.style.opacity = String(Math.max(0.15, progress));
      if (progress >= 1) ind.classList.add('armed');
      else ind.classList.remove('armed');
    }, { passive: true });

    function endGesture() {
      if (!tracking) return;
      tracking = false;
      if (!active || !indicator) { active = false; return; }
      const armed = indicator.classList.contains('armed');
      if (armed) {
        const target = getBackTarget();
        resetIndicator(true);
        if (target) go(target);
      } else {
        resetIndicator(true);
      }
      active = false;
    }
    document.addEventListener('touchend', endGesture, { passive: true });
    document.addEventListener('touchcancel', endGesture, { passive: true });
  })();

  // Pre-render PO list (kept for first navigation after submit)
  renderPoList({ po: '', vendor: '' });

  // On every page load / refresh: always start on welcome screen, clear any
  // deep-link hash so URL doesn't carry previous state.
  if (location.hash) {
    history.replaceState(null, '', location.pathname + location.search);
  }
  go('welcome');
})();
