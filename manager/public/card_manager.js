// PmheeNC Nightcamp Manager — Dual-Icon Top-Selling Card & Rune Market Tracker + Multi-Map Farm Distributor
// Icon #1 (#cd-tab): 🃏 Monster Cards (/api/cards)
// Icon #2 (#rn-tab): 🔮 Skill Runes   (/api/runes)
(function () {
  'use strict';

  const BASE = typeof API_BASE === 'string' ? API_BASE : '';

  const CARD_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<rect x="4" y="3" width="13" height="18" rx="2.5" fill="rgba(251,191,36,0.16)"/>' +
    '<path d="M17 6h1.5A2.5 2.5 0 0 1 21 8.5v10a2.5 2.5 0 0 1-2.5 2.5H9"/>' +
    '<path d="M10.5 7.5l1.3 2.6 2.9.4-2.1 2 .5 2.9-2.6-1.4-2.6 1.4.5-2.9-2.1-2 2.9-.4 1.3-2.6z" fill="currentColor" stroke="none"/>' +
    '</svg>';

  const RUNE_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<polygon points="12 2 20 7.5 18 19.5 12 22 6 19.5 4 7.5" fill="rgba(168,85,247,0.18)"/>' +
    '<path d="M12 6.2v11.6M8.6 9.5l3.4-3.3 3.4 3.3M8.8 14.5l3.2 3.3 3.2-3.3"/>' +
    '<circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>' +
    '</svg>';

  const esc = s =>
    String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  const toast = (t, k) => (typeof window.showToast === 'function' ? window.showToast(t, k) : console.log('[MarketFarm]', t));
  const fmt = n => (n == null || isNaN(n) || Number(n) <= 0 ? '—' : Math.round(Number(n)).toLocaleString('th-TH'));

  function calcLevelGapMult(playerLv, monLv) {
    const pLv = Number(playerLv) || 1;
    const mLv = Number(monLv) || 1;
    if (!mLv) return 1;
    const diff = Math.abs(pLv - mLv);
    if (diff <= 4) return 1.0;
    if (diff <= 7) return 0.7;
    if (diff <= 14) return 0.4;
    if (diff <= 23) return 0.2;
    return 0.05;
  }

  function formatGapBadge(mult) {
    const pct = Math.round(mult * 100);
    if (mult >= 0.99) return `<span style="color:#34d399;font-weight:700;">✅ ดรอป ${pct}%</span>`;
    if (mult >= 0.69) return `<span style="color:#facc15;font-weight:700;">🟡 ดรอป ${pct}%</span>`;
    if (mult >= 0.39) return `<span style="color:#fb923c;font-weight:700;">⚠️ ห่างเวล ดรอป ${pct}%</span>`;
    return `<span style="color:#f87171;font-weight:700;">🔴 ห่างเวลมาก ดรอป ${pct}%</span>`;
  }

  function timeAgo(ts) {
    if (!ts) return 'ยังไม่ซิงค์';
    const sec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (sec < 60) return `${sec} วินาทีที่แล้ว`;
    if (sec < 3600) return `${Math.floor(sec / 60)} นาทีที่แล้ว`;
    return `${Math.floor(sec / 3600)} ชม.ที่แล้ว`;
  }

  const modeStates = {
    card: {
      items: [], clients: [], overrides: {}, summary: {}, scanning: false, lastFullSweepAt: 0,
      search: '', sort: 'turnover_desc', filter: 'traded', minLv: null, maxLv: null,
      selectedIds: new Set(), selectedMaps: new Map(), selectedProfileIds: new Set(), profilesInit: false
    },
    rune: {
      items: [], clients: [], overrides: {}, summary: {}, scanning: false, lastFullSweepAt: 0,
      search: '', sort: 'turnover_desc', filter: 'tier1', minLv: null, maxLv: null,
      selectedIds: new Set(), selectedMaps: new Map(), selectedProfileIds: new Set(), profilesInit: false
    }
  };

  let activeMode = 'card'; // 'card' | 'rune'
  let isOpen = false;
  let farmPanelOpen = false;
  let pollTimer = null;
  let iconCatalog = null;
  let iconCatalogLoading = false;
  const cardIconMap = new Map();
  const runeIconMap = new Map();

  function ensureIconCatalog() {
    if (iconCatalog || iconCatalogLoading) return;
    iconCatalogLoading = true;
    fetch('nightcamp_gear_catalog.json?v=nc2.3.38', { cache: 'no-cache' })
      .then(r => (r.ok ? r.json() : null))
      .then(cat => {
        if (!cat || !cat.atlas) return;
        iconCatalog = cat;
        for (const c of (cat.cards || [])) {
          if (c && c.id) cardIconMap.set(c.id, c.ic || c.cardIc || null);
          if (c && c.mon) cardIconMap.set('bl_card_' + c.mon, c.ic || c.cardIc || null);
        }
        for (const r of (cat.runes || [])) {
          if (r && r.k && r.ic) runeIconMap.set(r.k, r.ic);
        }
        if (isOpen) renderList();
      })
      .catch(() => {})
      .finally(() => { iconCatalogLoading = false; });
  }

  function renderCatalogSprite(ic, size) {
    if (!ic || !Array.isArray(ic) || ic.length < 2 || !iconCatalog || !iconCatalog.atlas) return '';
    const kind = ic[0];
    const idx = Number(ic[1]);
    const m = iconCatalog.atlas[kind];
    if (!m || !Number.isFinite(idx) || idx < 0) return '';
    const k = size / m.cell;
    const rows = Math.ceil(m.n / m.cols);
    const v = iconCatalog.atlasV ? `?v=${encodeURIComponent(iconCatalog.atlasV)}` : '';
    const file = `wiki/atlases/wiki_${kind === 'h128' ? 'hats128' : kind}.webp${v}`;
    const bx = -((idx % m.cols) * m.cell * k);
    const by = -(Math.floor(idx / m.cols) * m.cell * k);
    const bw = m.cols * m.cell * k;
    const bh = rows * m.cell * k;
    return `<i style="display:inline-block;width:${size}px;height:${size}px;flex-shrink:0;border-radius:6px;background:rgba(2,6,23,0.72) url('${file}') ${bx}px ${by}px/${bw}px ${bh}px no-repeat;"></i>`;
  }

  function getItemSpriteHtml(it) {
    if (!iconCatalog) { ensureIconCatalog(); return ''; }
    if (activeMode === 'rune') {
      const m = String(it.id || '').match(/^bl_rune_(.+)_([123])$/);
      const rk = it.runeKey || (m ? m[1] : '');
      const tierIdx = Math.max(0, Math.min(2, (Number(it.tier) || (m ? Number(m[2]) : 1)) - 1));
      const ric = runeIconMap.get(rk);
      const ic = Array.isArray(ric) && Array.isArray(ric[0]) ? (ric[tierIdx] || ric[0]) : ric;
      return renderCatalogSprite(ic, 30);
    }
    const ic = cardIconMap.get(it.id) || (it.monId ? cardIconMap.get('bl_card_' + it.monId) : null);
    return renderCatalogSprite(ic, 30);
  }

  const curState = () => modeStates[activeMode];
  const apiUrl = (mode, suffix = '') => `${BASE}/api/${mode === 'rune' ? 'runes' : 'cards'}${suffix}`;

  const CARD_FILTERS = [
    { key: 'all', label: 'ทั้งหมด' },
    { key: 'traded', label: '🔥 มีขายใน 24ชม.' },
    { key: '100k', label: '💎 แสน+ (≥100k)' },
    { key: 'hot', label: '⚡ TOP HOT' }
  ];

  const RUNE_FILTERS = [
    { key: 'all', label: 'ทั้งหมด' },
    { key: 'tier1', label: '🔮 Tier I (ดรอปมอน)' },
    { key: 'traded', label: '🔥 มีขายใน 24ชม.' },
    { key: 'tier2', label: '✨ Tier II (หลอม)' },
    { key: 'tier3', label: '🌟 Tier III (ขั้นสูงสุด)' },
    { key: '100k', label: '💎 แสน+ (≥100k)' },
    { key: 'cat:basic', label: '🗡️ ตีปกติ' },
    { key: 'cat:proj', label: '🎯 ยิงไกล' },
    { key: 'cat:attack', label: '⚔️ โจมตี' },
    { key: 'cat:area', label: '💥 พื้นที่/AOE' },
    { key: 'cat:melee', label: '🗡️ ประชิด' },
    { key: 'cat:buff', label: '✨ บัฟ/ซัพ' }
  ];

  function ensureDom() {
    if (!document.getElementById('cd-tab')) {
      const btn = document.createElement('button');
      btn.id = 'cd-tab';
      btn.type = 'button';
      btn.className = 'cd-tab';
      btn.title = '🃏 เช็คราคาการ์ดขายดี & เปลี่ยนแมพฟาร์ม (Nightcamp Cards)';
      btn.innerHTML = CARD_SVG + '<span class="cd-tab-badge" id="cd-tab-badge"></span>';
      btn.addEventListener('click', () => openDrawer('card'));
      document.body.appendChild(btn);
    }

    if (!document.getElementById('rn-tab')) {
      const btnR = document.createElement('button');
      btnR.id = 'rn-tab';
      btnR.type = 'button';
      btnR.className = 'rn-tab';
      btnR.title = '🔮 เช็คราคารูนขายดี & เปลี่ยนแมพฟาร์ม (Nightcamp Runes)';
      btnR.innerHTML = RUNE_SVG + '<span class="rn-tab-badge" id="rn-tab-badge"></span>';
      btnR.addEventListener('click', () => openDrawer('rune'));
      document.body.appendChild(btnR);
    }

    if (!document.getElementById('cd-scrim')) {
      const scrim = document.createElement('div');
      scrim.id = 'cd-scrim';
      scrim.className = 'cd-scrim';
      scrim.addEventListener('click', closeDrawer);
      document.body.appendChild(scrim);
    }

    if (!document.getElementById('cd-drawer')) {
      const drawer = document.createElement('aside');
      drawer.id = 'cd-drawer';
      drawer.className = 'cd-drawer';
      drawer.innerHTML = `
        <div class="cd-head" id="cd-head">
          <div class="cd-head-icon" id="cd-head-icon">${CARD_SVG}</div>
          <div class="cd-head-text">
            <h3 id="cd-head-title">เช็คราคาการ์ด & เปลี่ยนแมพฟาร์ม</h3>
            <p id="cd-head-sub">ติ๊กเลือกได้หลายรายการเพื่อเฉลี่ยจอฟาร์มอัตโนมัติ · ซิงค์ยอดขายปิดจริง 7 วันจากตลาดกลาง Nightcamp</p>
          </div>
          <div class="cd-head-actions">
            <button type="button" class="cd-btn-farm-multi" id="cd-btn-open-farm" style="display:none;">
              🗺️ เปลี่ยนแมพฟาร์ม (<span id="cd-sel-count">0</span>)
            </button>
            <button type="button" class="cd-btn-scan" id="cd-btn-scan">🔄 เช็คราคา</button>
            <button type="button" class="cd-btn-close" id="cd-btn-close" title="ปิด">✕</button>
          </div>
        </div>
        <div class="cd-body">
          <div class="cd-kpi-grid" id="cd-kpi-grid"></div>
          <div class="cd-toolbar">
            <input type="text" class="cd-search" id="cd-search-input" placeholder="🔍 ค้นหาชื่อการ์ด/รูน, มอนสเตอร์, แมพ, หรือความสามารถ..." autocomplete="off">
            <select class="cd-sort" id="cd-sort-select">
              <option value="turnover_desc">💰 มูลค่าขายรวม 24ชม. (ราคา × ยอด/วัน)</option>
              <option value="velocity_desc">🔥 ขายออกถี่สุด (เฉลี่ย/ชม. · 24ชม.)</option>
              <option value="price_desc">💎 ราคาเฉลี่ย 24ชม. สูงสุด</option>
              <option value="last_desc">⚡ ราคาขายล่าสุดสูงสุด</option>
              <option value="lv_asc">📊 เลเวลน้อย → มาก</option>
            </select>
          </div>
          <div class="cd-lv-row">
            <span class="cd-lv-label">🎯 เลเวลแมพ/มอน:</span>
            <input type="number" id="cd-lv-min" class="cd-lv-input" placeholder="ต่ำสุด" min="1" max="99">
            <span style="color:#64748b;">–</span>
            <input type="number" id="cd-lv-max" class="cd-lv-input" placeholder="สูงสุด" min="1" max="99">
            <button type="button" class="cd-lv-chip" data-lv="1-25">1-25</button>
            <button type="button" class="cd-lv-chip" data-lv="26-45">26-45</button>
            <button type="button" class="cd-lv-chip" data-lv="46-65">46-65</button>
            <button type="button" class="cd-lv-chip" data-lv="66-99">66+</button>
            <button type="button" class="cd-lv-chip cd-lv-clear" id="cd-lv-clear" title="ล้างช่วงเลเวล">✕</button>
            <span class="cd-count-pill" id="cd-filtered-count">0 รายการ</span>
          </div>
          <div class="cd-filters" id="cd-filter-chips"></div>
          <div class="cd-active-banner" id="cd-active-banner" style="display:none;"></div>
          <div class="cd-list" id="cd-items-list"></div>
        </div>
      `;
      document.body.appendChild(drawer);

      document.getElementById('cd-btn-close').onclick = closeDrawer;
      document.getElementById('cd-btn-scan').onclick = () => triggerScan(false);
      document.getElementById('cd-btn-open-farm').onclick = () => openFarmPanel();

      const searchEl = document.getElementById('cd-search-input');
      searchEl.addEventListener('input', () => { curState().search = searchEl.value; renderList(); });

      const sortEl = document.getElementById('cd-sort-select');
      sortEl.addEventListener('change', () => { curState().sort = sortEl.value; renderList(); });

      const minEl = document.getElementById('cd-lv-min');
      const maxEl = document.getElementById('cd-lv-max');
      const syncLv = () => {
        curState().minLv = minEl.value ? Number(minEl.value) : null;
        curState().maxLv = maxEl.value ? Number(maxEl.value) : null;
        renderList();
      };
      minEl.addEventListener('input', syncLv);
      maxEl.addEventListener('input', syncLv);
      document.getElementById('cd-lv-clear').onclick = () => {
        minEl.value = ''; maxEl.value = ''; syncLv();
      };
      drawer.querySelectorAll('.cd-lv-chip[data-lv]').forEach(ch => {
        ch.onclick = () => {
          const [lo, hi] = ch.dataset.lv.split('-').map(Number);
          minEl.value = lo; maxEl.value = hi; syncLv();
        };
      });
    }

    if (!document.getElementById('cd-farm-modal')) {
      const modal = document.createElement('div');
      modal.id = 'cd-farm-modal';
      modal.className = 'cd-farm-modal';
      modal.innerHTML = `
        <div class="cd-fm-head">
          <div>
            <h4 id="cd-fm-title">⚖️ เฉลี่ยกระจายจอไปฟาร์มอัตโนมัติ</h4>
            <p id="cd-fm-sub">แบ่งจอไปฟาร์มเท่าๆ กัน + เพิ่มการ์ด/รูนประจำแมพเข้า Auto-Sell ตลาดกลางอัตโนมัติ (ล็อกรูนท็อป 90%+)</p>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <button type="button" class="cd-btn-scan" id="cd-fm-scan-sel">🔄 เช็คราคาที่เลือก</button>
            <button type="button" class="cd-btn-close" id="cd-fm-close">✕</button>
          </div>
        </div>
        <div class="cd-fm-body">
          <div class="cd-fm-selections" id="cd-fm-selections"></div>
          <div class="cd-fm-clients-bar">
            <span style="font-weight:700;color:#e2e8f0;font-size:12.5px;">🖥️ เลือกจอที่จะนำมาเฉลี่ยฟาร์ม (Plan Script อัปสเตตัส/ซื้อยา/Auto-Sell/Set Gear ยังทำงานปกติ):</span>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;">
              <button type="button" class="cd-fm-pill" id="cd-fm-sel-online">✅ เฉพาะจอออนไลน์</button>
              <button type="button" class="cd-fm-pill" id="cd-fm-sel-all">☑️ เลือกทุกจอ</button>
              <button type="button" class="cd-fm-pill" id="cd-fm-sel-none">⬜ ล้างที่เลือก</button>
            </div>
          </div>
          <div class="cd-fm-clients-grid" id="cd-fm-clients-grid"></div>
        </div>
        <div class="cd-fm-foot">
          <button type="button" class="cd-fm-go" id="cd-fm-apply">🚀 เฉลี่ยจอไปฟาร์มทันที</button>
          <button type="button" class="cd-fm-restore" id="cd-fm-restore">↩️ คืนแมพตาม Plan เดิม</button>
        </div>
      `;
      document.body.appendChild(modal);

      document.getElementById('cd-fm-close').onclick = closeFarmPanel;
      document.getElementById('cd-fm-scan-sel').onclick = () => triggerScan(true);
      document.getElementById('cd-fm-sel-online').onclick = () => {
        const st = curState();
        st.selectedProfileIds.clear();
        for (const c of st.clients) if (c.online || c.isRunning) st.selectedProfileIds.add(c.id);
        renderFarmPanel();
      };
      document.getElementById('cd-fm-sel-all').onclick = () => {
        const st = curState();
        st.selectedProfileIds.clear();
        for (const c of st.clients) st.selectedProfileIds.add(c.id);
        renderFarmPanel();
      };
      document.getElementById('cd-fm-sel-none').onclick = () => {
        curState().selectedProfileIds.clear();
        renderFarmPanel();
      };
      document.getElementById('cd-fm-apply').onclick = applyFarmDistribution;
      document.getElementById('cd-fm-restore').onclick = () => restorePlan(Array.from(curState().selectedProfileIds));
    }
  }

  function updateTabBadges() {
    for (const mode of ['card', 'rune']) {
      const badge = document.getElementById(mode === 'rune' ? 'rn-tab-badge' : 'cd-tab-badge');
      if (!badge) continue;
      const st = modeStates[mode];
      const farmCount = Object.values(st.overrides || {}).filter(ov => ov && ov.kind === mode).length;
      if (farmCount > 0) {
        badge.textContent = String(farmCount);
        badge.classList.add('has-farm');
      } else if (st.summary?.tradedCount > 0) {
        badge.textContent = String(st.summary.tradedCount);
        badge.classList.remove('has-farm');
      } else {
        badge.textContent = '';
      }
    }
  }

  async function fetchMode(mode, silent = false) {
    try {
      const res = await fetch(apiUrl(mode)).then(r => r.json());
      if (!res || !res.success) return;
      const st = modeStates[mode];
      st.items = Array.isArray(res.items) ? res.items : [];
      st.clients = Array.isArray(res.clients) ? res.clients : [];
      st.overrides = res.overrides || {};
      st.summary = res.summary || {};
      st.scanning = Boolean(res.scanning);
      st.lastFullSweepAt = Number(res.lastFullSweepAt || 0);
      if (!st.profilesInit && st.clients.length > 0) {
        st.profilesInit = true;
        for (const c of st.clients) {
          if (c.online || c.isRunning) st.selectedProfileIds.add(c.id);
        }
      }
      updateTabBadges();
      if (isOpen && activeMode === mode) {
        renderAll();
      }
    } catch (e) {
      if (!silent) toast(`โหลดข้อมูลไม่สำเร็จ: ${e.message}`, 'error');
    }
  }

  async function triggerScan(selectedOnly = false) {
    const mode = activeMode;
    const st = modeStates[mode];
    const btn = document.getElementById('cd-btn-scan');
    const btnSel = document.getElementById('cd-fm-scan-sel');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ กำลังสแกนตลาด...'; }
    if (btnSel) { btnSel.disabled = true; btnSel.textContent = '⏳ สแกน...'; }
    try {
      const ids = selectedOnly ? Array.from(st.selectedIds) : [];
      const res = await fetch(apiUrl(mode, '/scan'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, all: !selectedOnly })
      }).then(r => r.json());
      if (res && res.success) {
        st.items = Array.isArray(res.items) ? res.items : st.items;
        st.clients = Array.isArray(res.clients) ? res.clients : st.clients;
        st.overrides = res.overrides || st.overrides;
        st.summary = res.summary || st.summary;
        st.lastFullSweepAt = Number(res.lastFullSweepAt || Date.now());
        toast(`✅ ซิงค์ราคาตลาดกลาง Nightcamp (${res.scanResult?.scannedCount || st.items.length} รายการ) สำเร็จ!`, 'success');
        updateTabBadges();
        renderAll();
      } else {
        toast(`⚠️ สแกนราคาไม่สำเร็จ: ${res?.scanResult?.error || res?.error || 'ไม่มีจอออนไลน์'}`, 'warning');
      }
    } catch (e) {
      toast(`❌ ข้อผิดพลาด: ${e.message}`, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '🔄 เช็คราคา'; }
      if (btnSel) { btnSel.disabled = false; btnSel.textContent = '🔄 เช็คราคาที่เลือก'; }
    }
  }

  function openDrawer(mode) {
    ensureDom();
    // Close Party drawer if currently open so left drawers never overlap
    try {
      document.body.classList.remove('pt-open');
      const ptDr = document.getElementById('pt-drawer');
      if (ptDr) ptDr.classList.remove('open');
      const ptSc = document.getElementById('pt-scrim');
      if (ptSc) ptSc.classList.remove('open');
    } catch (_) {}
    activeMode = mode === 'rune' ? 'rune' : 'card';
    isOpen = true;
    document.body.classList.add('cd-open');
    document.body.classList.toggle('rn-mode', activeMode === 'rune');

    const st = curState();
    document.getElementById('cd-head-icon').innerHTML = activeMode === 'rune' ? RUNE_SVG : CARD_SVG;
    document.getElementById('cd-head-title').textContent = activeMode === 'rune'
      ? 'เช็คราคารูน & เปลี่ยนแมพฟาร์ม (Runes)'
      : 'เช็คราคาการ์ด & เปลี่ยนแมพฟาร์ม (Cards)';
    document.getElementById('cd-head-sub').textContent = activeMode === 'rune'
      ? 'ติ๊กเลือกได้หลายรูนเพื่อเฉลี่ยจอฟาร์มอัตโนมัติ · ซิงค์ยอดขาย 24 ชม. จริง (เฉลี่ย/ชม. และ /วัน) + เรทดรอปตามช่วงเลเวล'
      : 'ติ๊กเลือกได้หลายการ์ดเพื่อเฉลี่ยจอฟาร์มอัตโนมัติ · ซิงค์ยอดขาย 24 ชม. จริง (เฉลี่ย/ชม. และ /วัน) + เรทดรอปตามช่วงเลเวล';

    document.getElementById('cd-search-input').value = st.search || '';
    document.getElementById('cd-sort-select').value = st.sort || 'turnover_desc';
    document.getElementById('cd-lv-min').value = st.minLv != null ? st.minLv : '';
    document.getElementById('cd-lv-max').value = st.maxLv != null ? st.maxLv : '';

    renderAll();
    fetchMode(activeMode, false);
    if (!pollTimer) {
      pollTimer = setInterval(() => {
        if (isOpen) fetchMode(activeMode, true);
      }, 18000);
    }
  }

  function closeDrawer() {
    isOpen = false;
    farmPanelOpen = false;
    document.body.classList.remove('cd-open', 'rn-mode', 'cd-farm-open');
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  }

  function openFarmPanel(preselectItemId = null, preselectMapId = null) {
    const st = curState();
    if (preselectItemId) {
      st.selectedIds.add(preselectItemId);
      if (preselectMapId) st.selectedMaps.set(preselectItemId, preselectMapId);
    }
    if (st.selectedIds.size === 0) {
      toast('กรุณาติ๊กเลือกอย่างน้อย 1 รายการก่อนครับ', 'warning');
      return;
    }
    farmPanelOpen = true;
    document.body.classList.add('cd-farm-open');
    renderFarmPanel();
  }

  function closeFarmPanel() {
    farmPanelOpen = false;
    document.body.classList.remove('cd-farm-open');
  }

  function getFilteredItems() {
    const st = curState();
    const q = String(st.search || '').trim().toLowerCase();
    const minLv = st.minLv;
    const maxLv = st.maxLv;
    const flt = st.filter || 'all';

    let list = (st.items || []).filter(it => {
      const q24 = Number(it.soldQty24h ?? 0);
      const effPrice = Number(it.avgPrice24h || it.displayPrice || it.medianPrice || it.lastPrice || 0);
      if (flt === 'traded' && !(q24 > 0)) return false;
      if (flt === '100k' && !(Math.max(effPrice, it.lastPrice || 0) >= 100000)) return false;
      if (flt === 'hot' && !it.isHot) return false;
      if (flt === 'tier1' && it.tier !== 1) return false;
      if (flt === 'tier2' && it.tier !== 2) return false;
      if (flt === 'tier3' && it.tier !== 3) return false;
      if (flt.startsWith('cat:') && it.category !== flt.slice(4)) return false;

      if (minLv != null || maxLv != null) {
        const maps = Array.isArray(it.maps) ? it.maps : [];
        if (maps.length === 0) return false;
        const okMap = maps.some(m => {
          const lo = m.minLv || 1, hi = m.maxLv || lo;
          if (minLv != null && hi < minLv) return false;
          if (maxLv != null && lo > maxLv) return false;
          return true;
        });
        if (!okMap) return false;
      }

      if (q) {
        const hay = [
          it.name, it.id, it.monsterName, it.artName, it.artDesc, it.effectText, it.categoryLabel,
          ...(it.passives || []),
          ...(it.maps || []).map(m => `${m.mapName} ${m.mapId}`)
        ].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const sort = st.sort || 'turnover_desc';
    list.sort((a, b) => {
      const aQ24 = Number(a.soldQty24h ?? 0), bQ24 = Number(b.soldQty24h ?? 0);
      const aT24 = Number(a.turnover24h ?? 0), bT24 = Number(b.turnover24h ?? 0);
      const aP = Number(a.avgPrice24h || a.displayPrice || a.medianPrice || 0);
      const bP = Number(b.avgPrice24h || b.displayPrice || b.medianPrice || 0);
      if (sort === 'turnover_desc') return (bT24 - aT24) || (bQ24 - aQ24) || (bP - aP) || ((b.turnover7d || 0) - (a.turnover7d || 0));
      if (sort === 'velocity_desc') return (bQ24 - aQ24) || (bP - aP) || ((b.soldQty7d || 0) - (a.soldQty7d || 0));
      if (sort === 'price_desc') return (bP - aP) || (bQ24 - aQ24);
      if (sort === 'last_desc') return ((b.lastPrice || 0) - (a.lastPrice || 0)) || (bQ24 - aQ24);
      if (sort === 'lv_asc') return ((a.minLv || 999) - (b.minLv || 999)) || (bT24 - aT24);
      return 0;
    });
    return list;
  }

  function renderAll() {
    renderKpi();
    renderFilters();
    renderActiveBanner();
    renderList();
    if (farmPanelOpen) renderFarmPanel();
  }

  function renderKpi() {
    const st = curState();
    const s = st.summary || {};
    const unit = activeMode === 'rune' ? 'ชิ้น' : 'ใบ';
    const label = activeMode === 'rune' ? 'รูน' : 'การ์ด';
    const kpiEl = document.getElementById('cd-kpi-grid');
    if (!kpiEl) return;

    const tv = s.topVelocity;
    const tp = s.topPrice;
    const activeMaps = Array.from(new Set(
      Object.values(st.overrides || {}).filter(o => o && o.kind === activeMode).map(o => o.mapName)
    ));

    kpiEl.innerHTML = `
      <div class="cd-kpi">
        <div class="cd-kpi-lbl">${label}ที่มีซื้อขาย (24 ชม.)</div>
        <div class="cd-kpi-val">${fmt(s.tradedCount24h ?? s.tradedCount ?? 0)} / ${fmt(s.totalItems || st.items.length)} ${unit}</div>
        <div class="cd-kpi-sub">ซิงค์ล่าสุด ${esc(timeAgo(st.lastFullSweepAt))}</div>
      </div>
      <div class="cd-kpi">
        <div class="cd-kpi-lbl">ขายออกถี่สุด (24 ชม.)</div>
        <div class="cd-kpi-val">${tv ? esc(tv.name) : '—'}</div>
        <div class="cd-kpi-sub">${tv ? `⚡ ${tv.avgSoldPerHour} ${unit}/ชม. (${tv.soldQty24h ?? tv.avgSoldPerDay}/วัน) · ${fmt(tv.avgPrice24h || tv.displayPrice || tv.medianPrice)}g` : 'กดเช็คราคาเพื่อซิงค์'}</div>
      </div>
      <div class="cd-kpi">
        <div class="cd-kpi-lbl">ราคาเฉลี่ย 24 ชม. สูงสุด</div>
        <div class="cd-kpi-val">${tp ? esc(tp.name) : '—'}</div>
        <div class="cd-kpi-sub">${tp ? `💎 เฉลี่ย ${fmt(tp.avgPrice24h || tp.displayPrice || tp.medianPrice)}g · ${tp.avgSoldPerHour ?? 0} ${unit}/ชม. (${tp.soldQty24h ?? 0}/วัน)` : '—'}</div>
      </div>
      <div class="cd-kpi">
        <div class="cd-kpi-lbl">จอที่ฟาร์มแมพ${label}</div>
        <div class="cd-kpi-val">${s.farmingClientsCount || 0} จอ</div>
        <div class="cd-kpi-sub">${activeMaps.length ? '📍 ' + esc(activeMaps.slice(0, 2).join(', ')) : 'ยังไม่กำหนดแมพฟาร์ม'}</div>
      </div>
    `;
  }

  function renderFilters() {
    const st = curState();
    const chipsEl = document.getElementById('cd-filter-chips');
    if (!chipsEl) return;
    const defs = activeMode === 'rune' ? RUNE_FILTERS : CARD_FILTERS;
    const selCount = st.selectedIds.size;
    chipsEl.innerHTML = defs.map(f =>
      `<button type="button" class="cd-chip ${st.filter === f.key ? 'active' : ''}" data-flt="${esc(f.key)}">${esc(f.label)}</button>`
    ).join('') + (selCount > 0 ? `<button type="button" class="cd-chip cd-chip-clear" id="cd-clear-sel">✕ ล้างที่เลือก (${selCount})</button>` : '');

    chipsEl.querySelectorAll('.cd-chip[data-flt]').forEach(btn => {
      btn.onclick = () => { st.filter = btn.dataset.flt; renderFilters(); renderList(); };
    });
    const clr = document.getElementById('cd-clear-sel');
    if (clr) clr.onclick = () => { st.selectedIds.clear(); renderFilters(); renderList(); updateMultiBtn(); };
    updateMultiBtn();
  }

  function updateMultiBtn() {
    const st = curState();
    const btn = document.getElementById('cd-btn-open-farm');
    const cnt = document.getElementById('cd-sel-count');
    if (!btn || !cnt) return;
    const label = activeMode === 'rune' ? 'รูน' : 'การ์ด';
    if (st.selectedIds.size > 0) {
      btn.style.display = 'inline-flex';
      cnt.textContent = `${st.selectedIds.size} ${label}`;
    } else {
      btn.style.display = 'none';
    }
  }

  function renderActiveBanner() {
    const st = curState();
    const banner = document.getElementById('cd-active-banner');
    if (!banner) return;
    const active = Object.entries(st.overrides || {}).filter(([, o]) => o && o.kind === activeMode);
    if (active.length === 0) {
      banner.style.display = 'none';
      return;
    }
    const maps = Array.from(new Set(active.map(([, o]) => `${o.mapName}${o.lvText ? ' ' + o.lvText : ''}`)));
    banner.style.display = 'flex';
    banner.innerHTML = `
      <div style="flex:1;min-width:0;">
        🗺️ กำลังฟาร์มแมพ${activeMode === 'rune' ? 'รูน' : 'การ์ด'} <b>${active.length} จอ</b> (${esc(maps.join(', '))}) · Plan Script อัปสเตตัส/ซื้อยา/Auto-Sell ยังทำงานปกติ
      </div>
      <button type="button" class="cd-btn-restore-all" id="cd-btn-restore-all">↩️ คืนแมพตาม Plan ทุกจอ</button>
    `;
    document.getElementById('cd-btn-restore-all').onclick = () => restorePlan([]);
  }

  function renderList() {
    const st = curState();
    const listEl = document.getElementById('cd-items-list');
    const countEl = document.getElementById('cd-filtered-count');
    if (!listEl) return;

    const items = getFilteredItems();
    const unit = activeMode === 'rune' ? 'ชิ้น' : 'ใบ';
    if (countEl) countEl.textContent = `${items.length} / ${st.items.length} ${unit}`;

    if (items.length === 0) {
      listEl.innerHTML = `<div class="cd-empty">ไม่พบรายการที่ตรงเงื่อนไข — ลองกด <b>🔄 เช็คราคา</b> หรือเปลี่ยนตัวกรอง</div>`;
      return;
    }

    const html = items.slice(0, 120).map(it => {
      const checked = st.selectedIds.has(it.id);
      const q24 = Number(it.soldQty24h ?? 0);
      const perHr = Number(it.avgSoldPerHour ?? (q24 / 24)).toFixed(2);
      const priceVal = Number(it.avgPrice24h || it.displayPrice || it.medianPrice || 0);
      const priceLbl = it.avgPrice24h > 0 ? '💰 เฉลี่ย 24ชม.' : '💰 ราคากลาง';
      const isExpensive = Math.max(priceVal, it.lastPrice || 0) >= 100000;
      const velText = q24 > 0
        ? `⚡ ${perHr} ${unit}/ชม. (${q24}/วัน)`
        : (it.soldQty7d > 0 ? `⚡ 0/ชม. (0/วัน)` : `⚡ 0 ${unit}/ชม. (0/วัน)`);
      const mapsHtml = (it.maps || []).slice(0, 4).map(m =>
        `<button type="button" class="cd-map-pill" data-item-id="${esc(it.id)}" data-map-id="${esc(m.mapId)}" title="คลิกเพื่อฟาร์มแมพนี้">
          🗺️ ${esc(m.mapName)} <span class="cd-map-lv">Lv.${m.minLv}-${m.maxLv}</span> <span class="cd-map-share">${m.sharePct}%</span>${m.hasBoss ? ' 👑' : ''}
        </button>`
      ).join('') || `<span class="cd-no-map">ไม่พบแมพดรอปปกติ</span>`;

      const descLine = activeMode === 'rune'
        ? `${esc(it.categoryLabel || '')} · ${esc(it.effectText || '')}${it.craftNote ? ` <span style="color:#c4b5fd;">(${esc(it.craftNote)})</span>` : ''}`
        : `⚡ วิชา: <b>${esc(it.artName)}</b>${it.passives?.length ? ` · <span style="color:#7dd3fc;">${esc(it.passives.join(' · '))}</span>` : ''} · มอน: ${esc(it.monsterName)}`;

      const spriteHtml = getItemSpriteHtml(it);
      const badgeHtml = activeMode === 'rune'
        ? `<div style="display:flex;flex-direction:column;align-items:center;gap:3px;">${spriteHtml}<span class="cd-type-badge rune-tier-${it.tier}" style="${spriteHtml ? 'min-width:34px;padding:2px 5px;font-size:9.5px;' : ''}">T${it.tier}</span></div>`
        : `<div style="display:flex;flex-direction:column;align-items:center;gap:3px;">${spriteHtml}<span class="cd-type-badge card-el" style="${spriteHtml ? 'min-width:38px;padding:2px 5px;font-size:9.5px;' : ''}">${esc(it.elementLabel || 'การ์ด')}</span></div>`;

      return `
        <div class="cd-card-row ${checked ? 'selected' : ''} ${isExpensive ? 'high-val' : ''}" data-row-id="${esc(it.id)}">
          <label class="cd-row-check">
            <input type="checkbox" class="cd-item-cb" data-id="${esc(it.id)}" ${checked ? 'checked' : ''}>
          </label>
          <div class="cd-row-icon">${badgeHtml}</div>
          <div class="cd-row-main">
            <div class="cd-row-title">
              <span class="cd-item-name">${esc(it.name)}</span>
              ${it.isHot ? '<span class="cd-hot-pill">🔥 TOP HOT</span>' : ''}
              ${isExpensive ? '<span class="cd-100k-pill">💎 แสน+</span>' : ''}
              ${it.farmingCount > 0 ? `<span class="cd-farm-pill">🟢 กำลังฟาร์ม ${it.farmingCount} จอ</span>` : ''}
            </div>
            <div class="cd-row-desc">${descLine}</div>
            <div class="cd-row-maps">${mapsHtml}</div>
          </div>
          <div class="cd-row-price">
            ${it.lowestPrice > 0 ? `<div class="cd-open-price">วางขายต่ำสุด ${fmt(it.lowestPrice)}g (${it.listedCount} ${unit})</div>` : (it.lastPrice > 0 ? `<div class="cd-open-price">ขายล่าสุด ${fmt(it.lastPrice)}g</div>` : '<div class="cd-open-price">ยังไม่มีประวัติขาย</div>')}
            <div class="cd-med-box">
              <span>${priceLbl}</span>
              <b>${priceVal > 0 ? fmt(priceVal) + ' g' : '—'}</b>
            </div>
            <div class="cd-vel-box" ${q24 === 0 ? 'style="opacity:0.6;"' : ''}>
              <span>${velText}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    listEl.innerHTML = html;

    listEl.querySelectorAll('.cd-item-cb').forEach(cb => {
      cb.onchange = () => {
        const id = cb.dataset.id;
        if (cb.checked) st.selectedIds.add(id);
        else st.selectedIds.delete(id);
        cb.closest('.cd-card-row')?.classList.toggle('selected', cb.checked);
        renderFilters();
        updateMultiBtn();
        if (farmPanelOpen) renderFarmPanel();
      };
    });

    listEl.querySelectorAll('.cd-map-pill').forEach(btn => {
      btn.onclick = () => {
        openFarmPanel(btn.dataset.itemId, btn.dataset.mapId);
        renderFilters();
        renderList();
      };
    });
  }

  function renderFarmPanel() {
    const st = curState();
    const itemById = new Map((st.items || []).map(x => [x.id, x]));
    const selList = Array.from(st.selectedIds).map(id => itemById.get(id)).filter(Boolean);
    const chosenProfiles = st.clients.filter(c => st.selectedProfileIds.has(c.id));
    const label = activeMode === 'rune' ? 'รูน' : 'การ์ด';

    document.getElementById('cd-fm-title').textContent = `⚖️ เลือก ${selList.length} ${label} — เฉลี่ยกระจาย ${chosenProfiles.length} จอไปฟาร์มอัตโนมัติ`;
    document.getElementById('cd-fm-apply').textContent = `🚀 เฉลี่ย ${chosenProfiles.length} จอ ไปฟาร์ม ${selList.length} ${label}ที่เลือกทันที`;
    document.getElementById('cd-fm-apply').disabled = selList.length === 0 || chosenProfiles.length === 0;

    // Preview round-robin distribution
    const buckets = selList.map(() => []);
    const assignedByProfile = new Map();
    chosenProfiles.forEach((c, idx) => {
      if (selList.length === 0) return;
      const bi = idx % selList.length;
      buckets[bi].push(c);
      const it = selList[bi];
      const mapId = st.selectedMaps.get(it.id) || it.maps?.[0]?.mapId || '';
      const mapObj = it.maps?.find(m => m.mapId === mapId) || it.maps?.[0] || null;
      assignedByProfile.set(c.id, { item: it, mapObj });
    });

    const selBox = document.getElementById('cd-fm-selections');
    selBox.innerHTML = selList.map((it, idx) => {
      const chosenMapId = st.selectedMaps.get(it.id) || it.maps?.[0]?.mapId || '';
      if (chosenMapId && !st.selectedMaps.has(it.id)) st.selectedMaps.set(it.id, chosenMapId);
      const opts = (it.maps || []).map(m =>
        `<option value="${esc(m.mapId)}" ${m.mapId === chosenMapId ? 'selected' : ''}>🗺️ ${esc(m.mapName)} · Lv.${m.minLv}-${m.maxLv} (มอนดรอป ${m.sharePct}%)${m.hasBoss ? ' 👑บอส' : ''}</option>`
      ).join('') || '<option value="">ไม่พบแมพดรอป</option>';
      const names = buckets[idx].map(c => c.charName || c.name).join(', ');
      return `
        <div class="cd-fm-sel-row">
          <div class="cd-fm-sel-name">${activeMode === 'rune' ? '🔮' : '🃏'} ${esc(it.name)}</div>
          <select class="cd-fm-map-sel" data-id="${esc(it.id)}">${opts}</select>
          <span class="cd-fm-bucket">🟢 แบ่ง ${buckets[idx].length} จอ${names ? ` (${esc(names.slice(0, 26))}${names.length > 26 ? '…' : ''})` : ''}</span>
          <button type="button" class="cd-fm-rm" data-rm="${esc(it.id)}" title="นำออก">✕</button>
        </div>
      `;
    }).join('');

    selBox.querySelectorAll('.cd-fm-map-sel').forEach(sel => {
      sel.onchange = () => { st.selectedMaps.set(sel.dataset.id, sel.value); renderFarmPanel(); };
    });
    selBox.querySelectorAll('.cd-fm-rm').forEach(btn => {
      btn.onclick = () => {
        st.selectedIds.delete(btn.dataset.rm);
        if (st.selectedIds.size === 0) closeFarmPanel();
        renderAll();
      };
    });

    const grid = document.getElementById('cd-fm-clients-grid');
    grid.innerHTML = (st.clients || []).map(c => {
      const checked = st.selectedProfileIds.has(c.id);
      const asn = assignedByProfile.get(c.id);
      const monLv = asn?.mapObj?.monsterLv || asn?.mapObj?.minLv || 0;
      const gapHtml = (asn && monLv) ? formatGapBadge(calcLevelGapMult(c.level, monLv)) : '';
      return `
        <label class="cd-fm-client ${checked ? 'checked' : ''} ${c.online ? 'online' : 'offline'}">
          <input type="checkbox" class="cd-fm-cl-cb" data-pid="${esc(c.id)}" ${checked ? 'checked' : ''}>
          <div class="cd-fm-cl-info">
            <div class="cd-fm-cl-top">
              <b>${esc(c.charName)}</b> <span style="color:#94a3b8;">(${esc(c.name)})</span>
              <span class="cd-fm-lv">Lv.${c.level}</span>
              <span style="font-size:10px;color:${c.online ? '#34d399' : '#64748b'};">${c.online ? '🟢 ออนไลน์' : '⚪ ออฟไลน์'}</span>
            </div>
            <div class="cd-fm-cl-cur">📍 ตอนนี้: ${esc(c.mapName || c.mapId || '—')}</div>
            ${asn ? `<div class="cd-fm-cl-next">➜ จะไป: <b>${esc(asn.mapObj?.mapName || '—')}</b> (${esc(asn.item.name)}) · ${gapHtml}</div>` : ''}
            ${checked ? `<div class="cd-fm-cl-wl">🏷️ Auto-Sell ตลาดกลางอัตโนมัติ (ล็อกรูนท็อป 90%+)</div>` : ''}
          </div>
        </label>
      `;
    }).join('');

    grid.querySelectorAll('.cd-fm-cl-cb').forEach(cb => {
      cb.onchange = () => {
        if (cb.checked) st.selectedProfileIds.add(cb.dataset.pid);
        else st.selectedProfileIds.delete(cb.dataset.pid);
        renderFarmPanel();
      };
    });
  }

  async function applyFarmDistribution() {
    const st = curState();
    const selections = Array.from(st.selectedIds).map(id => {
      const it = st.items.find(x => x.id === id);
      const mapId = st.selectedMaps.get(id) || it?.maps?.[0]?.mapId || '';
      return { id, mapId };
    }).filter(x => x.mapId);
    const profileIds = Array.from(st.selectedProfileIds);
    if (!selections.length || !profileIds.length) return;

    const btn = document.getElementById('cd-fm-apply');
    btn.disabled = true;
    btn.textContent = '⏳ กำลังสั่งย้ายแมพ & เพิ่ม WL ตลาดกลาง...';
    try {
      const res = await fetch(apiUrl(activeMode, '/farm-multi'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selections, profileIds })
      }).then(r => r.json());
      if (res && res.success) {
        toast(`✅ ส่ง ${res.assignedCount} จอไปฟาร์ม ${res.slotsCount} แมพ + เพิ่มเข้า Auto-Sell ตลาดกลางเรียบร้อย!`, 'success');
        await fetchMode(activeMode, true);
        closeFarmPanel();
      } else {
        toast(`⚠️ ล้มเหลว: ${res?.error || 'unknown'}`, 'error');
      }
    } catch (e) {
      toast(`❌ ข้อผิดพลาด: ${e.message}`, 'error');
    } finally {
      btn.disabled = false;
      renderFarmPanel();
    }
  }

  async function restorePlan(profileIds = []) {
    try {
      const res = await fetch(apiUrl(activeMode, '/restore-plan'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileIds })
      }).then(r => r.json());
      if (res && res.success) {
        toast(`↩️ คืนแมพตาม Plan เดิมเรียบร้อย (${res.restoredCount} จอ)`, 'success');
        await fetchMode(activeMode, true);
      }
    } catch (e) {
      toast(`❌ ข้อผิดพลาด: ${e.message}`, 'error');
    }
  }

  function init() {
    ensureDom();
    // Pre-fetch both modes quietly for badge counts
    setTimeout(() => { fetchMode('card', true); fetchMode('rune', true); }, 1500);
    window.NightcampMarketFarm = { openCards: () => openDrawer('card'), openRunes: () => openDrawer('rune'), close: closeDrawer };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
