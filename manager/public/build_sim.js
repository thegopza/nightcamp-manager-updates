/* Nightcamp SS2 Build Simulator — Interactive Manager Tab UI (window.NCBuildSim)
 * Features:
 *   - Authentic Nightcamp RPG Paper-Doll, Status Hex Radar, Skill/Rune/Card Book & Hotbar
 *   - 60 FPS 2D Boss Arena Canvas with full Skill & Rune VFX (build_sim_arena.js)
 *   - 1-Click Live Character Import from any running Manager screen
 *   - 1-Click Export Build to Manager Profile Plan / Set Gear
 *   - Build A vs Build B Live Comparison & Auto-Optimizer
 *   - MCP Server Config & AI Push Sync
 */
(function (root) {
  'use strict';

  const WIKI_CDN = 'https://play.nightcamp.app/wiki';
  const LS_BUILDS_KEY = 'nc.buildSim.builds.v1';
  const LS_ACTIVE_KEY = 'nc.buildSim.activeId.v1';
  const HB_KEYS = ['q', 'e', 'r', 'f', '3', '4', '5', '6'];

  let E = null;       // window.NCSimEngine
  let idx = null;     // indexed wiki data
  let arena = null;   // NCBuildSimArena instance
  let initialized = false;
  let loadingPromise = null;

  const state = {
    builds: [],
    activeId: null,
    build: null,
    stats: null,
    baselineA: null,       // snapshot build for Compare A vs B
    lastInstantSim: null,  // deterministic simulateFight() result
    liveHud: null,         // live telemetry from 2D Arena
    rightTab: 'skills',    // 'skills' | 'cards' | 'buffs'
    targetCat: 'boss',     // 'boss' | 'field_boss' | 'story_boss' | 'root_boss' | 'all' | 'dummy'
    targetId: 'ant_queen',
    targetSearch: '',
    customDummy: { custom: true, name: 'หุ่นทดสอบ (Custom Dummy)', lv: 65, hp: 500000, def: 30, mdef: 25, el: 'neutral', race: 'formless', boss: true, armBar: 120 },
    env: { night: true, mode: 's2', targetCount: 1, theme: 'woods', bossAttacks: true, godMode: false },
    modal: null,
    keyBound: false,
    lastPushTs: 0,
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function atlasIconHtml(ic, size = 32, extraClass = '') {
    if (!idx || !Array.isArray(ic) || ic.length < 2) {
      return `<span class="ncsim-ic ${extraClass}" style="width:${size}px;height:${size}px;background:rgba(148,163,184,0.14);display:inline-grid;place-items:center;font-size:${Math.round(size * 0.5)}px;">✦</span>`;
    }
    const [atlasName, cellIdx] = ic;
    const spec = idx.meta && idx.meta.atlas && idx.meta.atlas[atlasName];
    if (!spec) return `<span class="ncsim-ic" style="width:${size}px;height:${size}px;"></span>`;
    const cols = spec.cols || 1;
    const rows = Math.ceil((spec.n || 1) / cols);
    const col = cellIdx % cols;
    const row = Math.floor(cellIdx / cols);
    const bgW = cols * size;
    const bgH = rows * size;
    const v = idx.meta.atlasV ? `?v=${idx.meta.atlasV}` : '';
    const url = `${WIKI_CDN}/data/wiki_${atlasName}.webp${v}`;
    return `<span class="ncsim-ic ${extraClass}" style="width:${size}px;height:${size}px;background-image:url('${url}');background-size:${bgW}px ${bgH}px;background-position:-${col * size}px -${row * size}px;"></span>`;
  }

  function monThumbHtml(mon, size = 34) {
    if (!mon) return '';
    if (mon.ic) return atlasIconHtml(mon.ic, size);
    const v = idx && idx.meta && idx.meta.atlasV ? `?v=${idx.meta.atlasV}` : '';
    if (mon.img) return `<img src="${WIKI_CDN}/assets/m/${encodeURIComponent(mon.img)}.webp${v}" style="width:${size}px;height:${size}px;object-fit:contain;" loading="lazy">`;
    return `<span style="font-size:${Math.round(size * 0.6)}px;">🎯</span>`;
  }

  function toast(msg, kind = 'info') {
    if (typeof window.showToast === 'function') {
      try { window.showToast(msg, kind === 'err' ? 'error' : 'success'); return; } catch {}
    }
    const el = document.getElementById('ncsim-toast');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    el.style.borderColor = kind === 'err' ? '#f87171' : '#fbbf24';
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { el.style.display = 'none'; }, 3400);
  }

  // =========================================================================
  // PERSISTENCE (LocalStorage + Optional /api/sim/builds Sync)
  // =========================================================================
  function loadSavedBuilds() {
    let list = [];
    try {
      const raw = localStorage.getItem(LS_BUILDS_KEY);
      if (raw) list = JSON.parse(raw);
    } catch {}
    if (!Array.isArray(list) || !list.length) {
      list = [
        E.createDefaultBuild(idx, 'puppeteer', { id: 'preset_puppeteer_60', name: '🎭 นักเชิดหุ่น Lv.60 (Preset)', lv: 60, jobLv: 35 }),
        E.createDefaultBuild(idx, 'archmage', { id: 'preset_archmage_60', name: '⚡ อาร์คเมจ Lv.60 (Preset)', lv: 60, jobLv: 35 }),
        E.createDefaultBuild(idx, 'paladin', { id: 'preset_paladin_60', name: '🛡️ พาลาดิน Lv.60 (Preset)', lv: 60, jobLv: 35 }),
        E.createDefaultBuild(idx, 'lightkeeper', { id: 'preset_lk_60', name: '🏮 ผู้จุดตะเกียง Lv.60 (Preset)', lv: 60, jobLv: 35 }),
      ];
    }
    state.builds = list.map(b => E.normalizeBuild(idx, b));
    const savedActive = localStorage.getItem(LS_ACTIVE_KEY);
    const found = state.builds.find(b => b.id === savedActive) || state.builds[0];
    state.activeId = found.id;
    state.build = JSON.parse(JSON.stringify(found));
  }

  function persistBuilds() {
    const i = state.builds.findIndex(b => b.id === state.build.id);
    if (i >= 0) state.builds[i] = JSON.parse(JSON.stringify(state.build));
    else state.builds.unshift(JSON.parse(JSON.stringify(state.build)));
    state.activeId = state.build.id;
    try {
      localStorage.setItem(LS_BUILDS_KEY, JSON.stringify(state.builds));
      localStorage.setItem(LS_ACTIVE_KEY, state.activeId);
    } catch {}
    // Best-effort sync to backend /api/sim/builds if available
    fetch('/api/sim/builds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ build: state.build }),
    }).catch(() => {});
  }

  async function pollMcpUiPush() {
    if (!initialized) return;
    try {
      const r = await fetch('/api/sim/ui-push');
      if (!r.ok) return;
      const d = await r.json();
      if (d && d.ts && d.ts > state.lastPushTs && d.build) {
        state.lastPushTs = d.ts;
        state.build = E.normalizeBuild(idx, d.build);
        if (d.targetId && idx.monsById[d.targetId]) state.targetId = d.targetId;
        persistBuilds();
        recomputeAll(true);
        toast(`🤖 MCP AI ส่งบิลด์ "${state.build.name}" เข้าสู่ Simulator แล้ว!`);
      }
    } catch {}
  }

  // =========================================================================
  // INITIALIZATION
  // =========================================================================
  async function ensureInit() {
    if (initialized) return true;
    if (loadingPromise) return loadingPromise;
    loadingPromise = (async () => {
      const mount = document.getElementById('ncsim-mount');
      if (!mount) return false;
      mount.innerHTML = `<div style="padding:48px;text-align:center;color:#fde68a;font-weight:700;">⏳ กำลังโหลดฐานข้อมูล Night Camp SS2 Wiki (มอน 482 · ไอเทม 2,130 · สกิล 214 · รูน 47 · การ์ด 338)...</div>`;
      E = window.NCSimEngine;
      if (!E) throw new Error('NCSimEngine not loaded');
      const resp = await fetch('/wiki/data.json');
      if (!resp.ok) throw new Error('Failed to load /wiki/data.json');
      const wiki = await resp.json();
      idx = E.createIndex(wiki);
      loadSavedBuilds();
      renderShell(mount);

      const canvas = document.getElementById('ncsim-canvas');
      arena = new window.NCBuildSimArena(canvas, E, idx, onArenaHudTick);
      window.addEventListener('resize', () => { if (arena && isTabActive()) arena.resize(); });
      bindHotkeys();
      recomputeAll(true);
      arena.start();
      setInterval(() => { if (isTabActive()) pollMcpUiPush(); }, 4000);
      initialized = true;
      return true;
    })().catch(err => {
      const mount = document.getElementById('ncsim-mount');
      if (mount) mount.innerHTML = `<div style="padding:32px;color:#fca5a5;">❌ โหลด Build Simulate ไม่สำเร็จ: ${esc(err.message)}</div>`;
      loadingPromise = null;
      return false;
    });
    return loadingPromise;
  }

  function isTabActive() {
    const p = document.getElementById('buildsim-pane');
    return !!(p && p.classList.contains('active'));
  }

  function getActiveTarget() {
    if (state.targetCat === 'dummy') return E.resolveTarget(idx, state.customDummy);
    return E.resolveTarget(idx, state.targetId);
  }

  function recomputeAll(resetArena = false) {
    if (!idx || !state.build) return;
    state.stats = E.calcBuildStats(idx, state.build, state.env);
    const target = getActiveTarget();
    state.lastInstantSim = E.simulateFight(idx, state.build, state.targetCat === 'dummy' ? state.customDummy : state.targetId, {
      durationSec: 30,
      night: state.env.night,
      mode: state.env.mode,
      targetCount: state.env.targetCount,
      bossAttacks: state.env.bossAttacks,
      godMode: state.env.godMode,
    });
    if (arena) arena.setState(state.build, state.stats, target, state.env, resetArena);
    renderTopbarSelect();
    renderLeftPanel();
    renderCenterBarAndAnalytics();
    renderRightPanel();
    renderHotbar();
  }

  function onArenaHudTick(hud) {
    state.liveHud = hud;
    // Fast lightweight DOM updates for live DPS & Hotbar CDs (no full re-render!)
    const liveDpsEl = document.getElementById('ncsim-live-dps');
    if (liveDpsEl) liveDpsEl.textContent = hud.avgDps.toLocaleString();
    const curDpsEl = document.getElementById('ncsim-cur-dps');
    if (curDpsEl) curDpsEl.textContent = `5s: ${hud.curDps.toLocaleString()} · ฆ่า ${hud.kills} · แตก ${hud.armorBreaks}`;
    const timerEl = document.getElementById('ncsim-arena-timer');
    if (timerEl) timerEl.textContent = `${hud.elapsedSec.toFixed(1)}s`;

    // Update hotbar CD overlays
    for (const hk of HB_KEYS) {
      const sid = state.build && state.build.hotbar && state.build.hotbar[hk];
      const ov = document.getElementById(`ncsim-hbcd-${hk}`);
      if (!ov) continue;
      const cd = sid ? (hud.skillCds[sid] || 0) : 0;
      if (cd > 0.05) { ov.style.display = 'grid'; ov.textContent = cd.toFixed(1); }
      else ov.style.display = 'none';
    }
    for (let i = 0; i < 2; i++) {
      const ov = document.getElementById(`ncsim-hbcd-c${i}`);
      if (!ov) continue;
      const cd = hud.cardCds[i] || 0;
      if (cd > 0.05) { ov.style.display = 'grid'; ov.textContent = cd.toFixed(1); }
      else ov.style.display = 'none';
    }
  }

  function bindHotkeys() {
    if (state.keyBound) return;
    state.keyBound = true;
    window.addEventListener('keydown', (ev) => {
      if (!isTabActive() || !arena || state.modal) return;
      const tag = (ev.target && ev.target.tagName) || '';
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      const k = ev.key.toLowerCase();
      if (HB_KEYS.includes(k)) {
        const sid = state.build && state.build.hotbar && state.build.hotbar[k];
        if (sid) { ev.preventDefault(); arena.castSkillById(sid); }
      } else if (k === '7') { ev.preventDefault(); arena.castCardSlot(0); }
      else if (k === '8') { ev.preventDefault(); arena.castCardSlot(1); }
      else if (k === ' ') { ev.preventDefault(); arena.castBasic(); }
      else if (k === 'z') {
        ev.preventDefault();
        arena.autoRot = !arena.autoRot;
        renderArenaControls();
        toast(arena.autoRot ? '🤖 เปิด Auto-Rotation' : '🖐️ โหมดกดสกิลเอง (Manual)');
      }
    });
  }

  // =========================================================================
  // MAIN SHELL LAYOUT
  // =========================================================================
  function renderShell(mount) {
    mount.innerHTML = `
      <div class="ncsim-root">
        <div id="ncsim-toast" style="display:none;position:fixed;bottom:22px;right:22px;z-index:130000;background:#1a152d;color:#fef3c7;border:1.5px solid #fbbf24;padding:10px 16px;border-radius:11px;font-size:12.5px;font-weight:700;box-shadow:0 10px 30px rgba(0,0,0,0.6);"></div>

        <!-- TOP TOOLBAR -->
        <div class="ncsim-topbar">
          <div class="ncsim-topbar-group">
            <div class="ncsim-brand">
              <div class="ncsim-brand-badge">🧪</div>
              <div>
                <div class="ncsim-brand-title">Night Camp SS2 · Build Simulate Arena</div>
                <div class="ncsim-brand-sub">เสกเลเวล · เสกของ/รูน/การ์ดครบ Wiki · เสกบอส 52 ตัวทดสอบสกิล &amp; DPS เรียลไทม์ + MCP AI</div>
              </div>
            </div>
            <select id="ncsim-build-select" class="ncsim-select" style="min-width:190px;font-weight:700;"></select>
            <button type="button" class="ncsim-btn ncsim-btn-sm" id="ncsim-btn-save" title="บันทึกบิลด์นี้">💾 บันทึก</button>
            <button type="button" class="ncsim-btn ncsim-btn-sm" id="ncsim-btn-new" title="สร้างบิลด์ใหม่">➕ ใหม่</button>
            <button type="button" class="ncsim-btn ncsim-btn-sm" id="ncsim-btn-dup" title="คัดลอกบิลด์">📋 ซ้ำ</button>
            <button type="button" class="ncsim-btn ncsim-btn-sm ncsim-btn-danger" id="ncsim-btn-del" title="ลบบิลด์นี้">🗑️</button>
          </div>
          <div class="ncsim-topbar-group">
            <button type="button" class="ncsim-btn ncsim-btn-sky" id="ncsim-btn-import-live">📥 ดึงจากจอเกมจริง</button>
            <button type="button" class="ncsim-btn ncsim-btn-gold" id="ncsim-btn-optimize">🏆 Auto-Optimize</button>
            <button type="button" class="ncsim-btn" id="ncsim-btn-compare">⚖️ เทียบ A vs B</button>
            <button type="button" class="ncsim-btn ncsim-btn-emerald" id="ncsim-btn-export-plan">📤 ส่งออก Plan</button>
            <button type="button" class="ncsim-btn ncsim-btn-violet" id="ncsim-btn-mcp">🤖 เชื่อมต่อ MCP</button>
          </div>
        </div>

        <!-- 3-COLUMN WORKSPACE -->
        <div class="ncsim-grid">
          <!-- LEFT: CHARACTER SHEET & PAPER-DOLL EQUIPMENT -->
          <div style="display:flex;flex-direction:column;gap:10px;" id="ncsim-left-col"></div>

          <!-- CENTER: BOSS SUMMONER + 2D ARENA + HOTBAR + DPS ANALYTICS -->
          <div style="display:flex;flex-direction:column;gap:10px;">
            <div class="ncsim-win">
              <div class="ncsim-win-head">
                <span>👹 เสกบอส &amp; สนามทดสอบ (Boss Summoner)</span>
                <div style="display:flex;gap:5px;align-items:center;" id="ncsim-env-toggles"></div>
              </div>
              <div class="ncsim-win-body" style="gap:8px;">
                <div id="ncsim-boss-bar"></div>
                <div class="ncsim-arena-shell">
                  <canvas id="ncsim-canvas" class="ncsim-arena-canvas"></canvas>
                  <div class="ncsim-arena-controls" id="ncsim-arena-controls"></div>
                </div>
                <div class="ncsim-hotbar" id="ncsim-hotbar"></div>
              </div>
            </div>

            <div class="ncsim-win">
              <div class="ncsim-win-head">
                <span>📊 วิเคราะห์ดาเมจ &amp; ผลจำลองการต่อสู้ (DPS Analytics)</span>
                <div style="display:flex;gap:5px;" id="ncsim-instant-btns"></div>
              </div>
              <div class="ncsim-win-body" id="ncsim-analytics-body"></div>
            </div>
          </div>

          <!-- RIGHT: SKILLS / RUNES / CARDS / BUFFS -->
          <div class="ncsim-win" id="ncsim-right-col"></div>
        </div>
      </div>
      <div id="ncsim-modal-root"></div>
    `;

    // Wire topbar buttons
    document.getElementById('ncsim-build-select').onchange = (ev) => {
      const found = state.builds.find(b => b.id === ev.target.value);
      if (found) {
        state.activeId = found.id;
        state.build = JSON.parse(JSON.stringify(found));
        recomputeAll(true);
      }
    };
    document.getElementById('ncsim-btn-save').onclick = () => {
      const name = prompt('ตั้งชื่อบิลด์:', state.build.name);
      if (name === null) return;
      state.build.name = name.trim() || state.build.name;
      persistBuilds();
      renderTopbarSelect();
      toast(`💾 บันทึกบิลด์ "${state.build.name}" แล้ว`);
    };
    document.getElementById('ncsim-btn-new').onclick = () => {
      const nb = E.createDefaultBuild(idx, state.build.job, { id: 'build_' + Date.now().toString(36), lv: state.build.lv });
      state.build = nb;
      persistBuilds();
      recomputeAll(true);
      toast('➕ สร้างบิลด์ใหม่เรียบร้อย');
    };
    document.getElementById('ncsim-btn-dup').onclick = () => {
      const cp = JSON.parse(JSON.stringify(state.build));
      cp.id = 'build_' + Date.now().toString(36);
      cp.name = cp.name + ' (Copy)';
      state.build = cp;
      persistBuilds();
      recomputeAll(false);
      toast('📋 คัดลอกบิลด์แล้ว');
    };
    document.getElementById('ncsim-btn-del').onclick = () => {
      if (state.builds.length <= 1) { toast('ต้องเหลืออย่างน้อย 1 บิลด์', 'err'); return; }
      if (!confirm(`ลบบิลด์ "${state.build.name}" ?`)) return;
      state.builds = state.builds.filter(b => b.id !== state.build.id);
      state.build = JSON.parse(JSON.stringify(state.builds[0]));
      state.activeId = state.build.id;
      localStorage.setItem(LS_BUILDS_KEY, JSON.stringify(state.builds));
      recomputeAll(true);
      toast('🗑️ ลบบิลด์แล้ว');
    };
    document.getElementById('ncsim-btn-import-live').onclick = openLiveImportModal;
    document.getElementById('ncsim-btn-optimize').onclick = openOptimizeModal;
    document.getElementById('ncsim-btn-compare').onclick = () => {
      if (state.baselineA) {
        state.baselineA = null;
        toast('ปิดโหมดเทียบ A vs B');
      } else {
        state.baselineA = JSON.parse(JSON.stringify(state.build));
        toast('📌 ล็อกบิลด์ปัจจุบันเป็น Build A แล้ว! ลองเปลี่ยนของ/รูน/การ์ดเพื่อเทียบสด');
      }
      renderCenterBarAndAnalytics();
    };
    document.getElementById('ncsim-btn-export-plan').onclick = openExportPlanModal;
    document.getElementById('ncsim-btn-mcp').onclick = openMcpModal;
  }

  function renderTopbarSelect() {
    const sel = document.getElementById('ncsim-build-select');
    if (!sel) return;
    sel.innerHTML = state.builds.map(b => `<option value="${esc(b.id)}" ${b.id === state.build.id ? 'selected' : ''}>${esc(b.name)}</option>`).join('');
    const cmpBtn = document.getElementById('ncsim-btn-compare');
    if (cmpBtn) {
      cmpBtn.classList.toggle('active', !!state.baselineA);
      cmpBtn.textContent = state.baselineA ? '⚖️ เทียบ A vs B (เปิดอยู่)' : '⚖️ เทียบ A vs B';
    }
  }

  // =========================================================================
  // LEFT COLUMN: CHARACTER SHEET + PAPER-DOLL + HEX RADAR + DERIVED STATS
  // =========================================================================
  function buildHexRadarSvg(stats) {
    const keys = ['str', 'agi', 'vit', 'int', 'dex', 'luk'];
    const labels = ['STR', 'AGI', 'VIT', 'INT', 'DEX', 'LUK'];
    const cx = 56, cy = 56, maxR = 38;
    const pt = (i, frac) => {
      const ang = -Math.PI / 2 + (i * Math.PI * 2) / 6;
      return [cx + Math.cos(ang) * maxR * frac, cy + Math.sin(ang) * maxR * frac];
    };
    const poly = (frac) => keys.map((_, i) => pt(i, frac).map(n => n.toFixed(1)).join(',')).join(' ');
    const dataPoly = keys.map((k, i) => pt(i, Math.min(1, (stats[k] || 5) / 100)).map(n => n.toFixed(1)).join(',')).join(' ');
    const lbls = labels.map((lb, i) => {
      const [x, y] = pt(i, 1.25);
      return `<text x="${x.toFixed(1)}" y="${(y + 3).toFixed(1)}" text-anchor="middle" font-size="8.5" font-weight="800" fill="#fde68a">${lb}</text>`;
    }).join('');
    return `
      <svg viewBox="0 0 112 112" width="110" height="110">
        <polygon points="${poly(1)}" fill="rgba(14,12,26,0.9)" stroke="rgba(245,201,105,0.28)" stroke-width="1"/>
        <polygon points="${poly(0.66)}" fill="none" stroke="rgba(148,163,184,0.18)" stroke-width="0.8"/>
        <polygon points="${poly(0.33)}" fill="none" stroke="rgba(148,163,184,0.15)" stroke-width="0.8"/>
        <polygon points="${dataPoly}" fill="rgba(245,158,11,0.34)" stroke="#fbbf24" stroke-width="1.8"/>
        ${lbls}
      </svg>
    `;
  }

  function renderLeftPanel() {
    const col = document.getElementById('ncsim-left-col');
    if (!col || !state.build || !state.stats) return;
    const b = state.build;
    const st = state.stats;
    const curJob = idx.jobsById[b.job];

    // Group 46 jobs by tier
    const tierNames = { 0: 'Class 0 · เริ่มต้น', 1: 'Class 1 · คลาสหนึ่ง', 2: 'Class 2 · คลาสสอง', 3: 'Class 3 · คลาสสาม' };
    const jobGroups = [0, 1, 2, 3].map(t => {
      const opts = (idx.wiki.jobs || []).filter(j => j.tier === t)
        .map(j => `<option value="${esc(j.id)}" ${j.id === b.job ? 'selected' : ''}>${esc(j.n.th)} (${esc(j.n.en)})</option>`).join('');
      return `<optgroup label="${tierNames[t]}">${opts}</optgroup>`;
    }).join('');

    // Paper-doll 9 slots
    const paperdollHtml = E.EQUIP_SLOTS.map(slot => {
      const g = b.equip[slot];
      const it = g && idx.itemsById[g.id];
      const gr = g ? E.GRADES[g.g || 0] : null;
      const gCls = g ? `g${g.g || 0}` : '';
      const rCol = it && E.RARITY_INFO[it.r] ? E.RARITY_INFO[it.r].color : '#94a3b8';
      return `
        <button type="button" class="ncsim-eq-slot ${gCls}" data-eq-slot="${slot}" title="คลิกเพื่อเปลี่ยนไอเทม / ตีบวก / ออฟชัน">
          ${it ? atlasIconHtml(it.ic, 32) : `<span style="width:32px;height:32px;border-radius:6px;background:rgba(148,163,184,0.1);display:grid;place-items:center;font-size:14px;color:#64748b;">+</span>`}
          <div class="ncsim-eq-meta">
            <div class="ncsim-eq-slot-lbl">${esc(E.SLOT_LABELS[slot])}</div>
            <div class="ncsim-eq-name" style="color:${it ? rCol : '#64748b'}">${it ? esc(it.n.th) : 'ว่าง'}</div>
            ${g ? `<div class="ncsim-eq-badges">
              ${g.ref > 0 ? `<span class="ncsim-ref-tag">+${g.ref}</span>` : ''}
              <span class="ncsim-g-tag" style="color:${gr.color};">G${g.g}</span>
              ${(g.rows && g.rows.length) ? `<span style="color:#a5f3fc;">◆${g.rows.length}</span>` : ''}
            </div>` : ''}
          </div>
        </button>
      `;
    }).join('');

    // Active set badges
    const setTags = [
      ...st.activeSets.map(s => `<span class="ncsim-tag ncsim-tag-gold">✨ ${esc(s.name)} (${s.count}/3)</span>`),
      ...st.activeBossSets.map(s => `<span class="ncsim-tag ncsim-tag-violet">👑 ${esc(s.name)} (${s.count}pc)</span>`),
    ].join(' ');

    // Stat rows
    const statRowsHtml = E.STAT_KEYS.map(k => {
      const baseV = b.base[k];
      const addV = st[k] - baseV;
      return `
        <div class="ncsim-stat-row">
          <span class="ncsim-stat-key">${k.toUpperCase()}</span>
          <span class="ncsim-stat-val">${baseV}${addV > 0 ? `<span style="color:#4ade80;">+${addV}</span>` : ''}</span>
          <button type="button" class="ncsim-stat-btn" data-st-k="${k}" data-st-d="-1">−</button>
          <button type="button" class="ncsim-stat-btn" data-st-k="${k}" data-st-d="1">+</button>
          <button type="button" class="ncsim-stat-btn" data-st-k="${k}" data-st-d="10" title="เพิ่ม +10">+10</button>
        </div>
      `;
    }).join('');

    const ptColor = st.statPoints.left < 0 ? '#f87171' : '#4ade80';

    col.innerHTML = `
      <!-- CHARACTER & CONJURE LEVEL -->
      <div class="ncsim-win">
        <div class="ncsim-win-head">
          <span>🧙 ตัวละคร &amp; เสกเลเวล</span>
          <div style="display:flex;gap:3px;">
            ${[35, 55, 75, 99].map(L => `<button type="button" class="ncsim-btn ncsim-btn-sm ${b.lv === L ? 'active' : ''}" data-quick-lv="${L}">Lv.${L}</button>`).join('')}
          </div>
        </div>
        <div class="ncsim-win-body">
          <div class="ncsim-hero-card">
            <div class="ncsim-hero-avatar">${curJob ? atlasIconHtml(curJob.ic, 58) : '🧙'}</div>
            <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:5px;">
              <select id="ncsim-job-select" class="ncsim-select" style="width:100%;font-weight:800;">${jobGroups}</select>
              <div style="font-size:10.5px;color:#94a3b8;">
                สายอาชีพ: <b style="color:#fde68a;">${E.getJobLineage(idx, b.job).map(j => idx.jobsById[j].n.th).join(' → ')}</b>
              </div>
            </div>
          </div>
          <div class="ncsim-lv-row">
            <div class="ncsim-lv-box">
              <label><span>Base Lv</span><b style="color:#fde68a;">${b.lv} / 99</b></label>
              <input type="range" id="ncsim-lv-slider" min="1" max="99" value="${b.lv}">
            </div>
            <div class="ncsim-lv-box">
              <label><span>Job Lv</span><b style="color:#93c5fd;">${b.jobLv} / 50</b></label>
              <input type="range" id="ncsim-jlv-slider" min="1" max="50" value="${b.jobLv}">
            </div>
          </div>
        </div>
      </div>

      <!-- PAPER-DOLL EQUIPMENT -->
      <div class="ncsim-win">
        <div class="ncsim-win-head">
          <span>⚔️ อุปกรณ์สวมใส่ (Paper-Doll)</span>
          <div style="display:flex;gap:4px;">
            <button type="button" class="ncsim-btn ncsim-btn-sm" id="ncsim-btn-set-picker">👕 ใส่ยกเซ็ต</button>
            <button type="button" class="ncsim-btn ncsim-btn-sm" id="ncsim-btn-all-max" title="ปรับทุกชิ้นเป็น +10 เกรด G5">✨ +10 G5</button>
          </div>
        </div>
        <div class="ncsim-win-body">
          <div class="ncsim-paperdoll">${paperdollHtml}</div>
          ${setTags ? `<div style="display:flex;flex-wrap:wrap;gap:4px;">${setTags}</div>` : ''}
          ${st.warnings.length ? `<div style="font-size:10.5px;color:#fca5a5;background:rgba(153,27,27,0.22);border:1px solid rgba(248,113,113,0.3);border-radius:7px;padding:5px 7px;">⚠️ ${st.warnings.map(esc).join(' · ')}</div>` : ''}
        </div>
      </div>

      <!-- STATUS WINDOW (C) + DERIVED COMBAT STATS -->
      <div class="ncsim-win">
        <div class="ncsim-win-head">
          <span>📊 หน้าต่างสเตตัส (Status)</span>
          <div style="display:flex;gap:4px;align-items:center;">
            <span style="font-size:10.5px;color:${ptColor};font-family:monospace;">แต้ม: ${st.statPoints.left}/${st.statPoints.total}</span>
            <button type="button" class="ncsim-btn ncsim-btn-sm ${b.sandboxStats ? 'active' : ''}" id="ncsim-btn-sandbox" title="ปลดล็อกเสกสเตตัสอิสระไม่จำกัดแต้ม">🔓 อิสระ</button>
            <button type="button" class="ncsim-btn ncsim-btn-sm" id="ncsim-btn-reset-stat" title="รีเซ็ตสเตตัสกลับ 5">↺</button>
          </div>
        </div>
        <div class="ncsim-win-body">
          <div class="ncsim-stat-wrap">
            <div>${buildHexRadarSvg(st)}</div>
            <div class="ncsim-stat-rows">${statRowsHtml}</div>
          </div>
          <div class="ncsim-derived-grid">
            <div class="ncsim-dstat"><div class="ncsim-dstat-k">ATK (กายภาพ)</div><div class="ncsim-dstat-v" style="color:#fde68a;">${st.batk}+${st.watk[1]}</div></div>
            <div class="ncsim-dstat"><div class="ncsim-dstat-k">MATK (เวท)</div><div class="ncsim-dstat-v" style="color:#7dd3fc;">${st.matk[0]}~${st.matk[1]}</div></div>
            <div class="ncsim-dstat"><div class="ncsim-dstat-k">ASPD / ตีต่อวิ</div><div class="ncsim-dstat-v" style="color:#86efac;">${st.aspd} (${st.hitsPerSec}/s)</div></div>
            <div class="ncsim-dstat"><div class="ncsim-dstat-k">Max HP</div><div class="ncsim-dstat-v" style="color:#fca5a5;">${st.maxHp.toLocaleString()}</div></div>
            <div class="ncsim-dstat"><div class="ncsim-dstat-k">Max SP</div><div class="ncsim-dstat-v" style="color:#93c5fd;">${st.maxSp.toLocaleString()}</div></div>
            <div class="ncsim-dstat"><div class="ncsim-dstat-k">CRIT / CDMG</div><div class="ncsim-dstat-v" style="color:#fbbf24;">${st.crit}% / +${st.critDmg}%</div></div>
            <div class="ncsim-dstat"><div class="ncsim-dstat-k">DEF / VDEF</div><div class="ncsim-dstat-v">${st.def} + ${st.vdef}</div></div>
            <div class="ncsim-dstat"><div class="ncsim-dstat-k">MDEF / IMDEF</div><div class="ncsim-dstat-v">${st.mdef} + ${st.imdef}</div></div>
            <div class="ncsim-dstat"><div class="ncsim-dstat-k">HIT / FLEE</div><div class="ncsim-dstat-v">${st.hit} / ${st.flee}</div></div>
            <div class="ncsim-dstat"><div class="ncsim-dstat-k">Cast / CDR</div><div class="ncsim-dstat-v">${st.castPct}% / -${st.cdr}%</div></div>
            <div class="ncsim-dstat"><div class="ncsim-dstat-k">เจาะเกราะ/เวท</div><div class="ncsim-dstat-v">${st.pen}% / ${st.mpen}%</div></div>
            <div class="ncsim-dstat"><div class="ncsim-dstat-k">EHP / ดูดเลือด</div><div class="ncsim-dstat-v">${st.ehp.toLocaleString()} / ${st.leech}%</div></div>
          </div>
        </div>
      </div>
    `;

    // Wire Left Panel events
    document.getElementById('ncsim-job-select').onchange = (ev) => {
      const newJob = ev.target.value;
      const fresh = E.createDefaultBuild(idx, newJob, { id: b.id, name: b.name, lv: b.lv, jobLv: b.jobLv });
      b.job = newJob;
      b.skills = fresh.skills;
      b.rotation = fresh.rotation;
      b.hotbar = fresh.hotbar;
      // Swap weapon if current weapon doesn't fit new job
      const allowed = E.JOB_WEAPONS[newJob] || [];
      const curW = b.equip.weapon && idx.itemsById[b.equip.weapon.id];
      if (!curW || (curW.wt && allowed.length && !allowed.includes(curW.wt))) {
        b.equip.weapon = fresh.equip.weapon;
      }
      persistBuilds();
      recomputeAll(true);
    };
    document.getElementById('ncsim-lv-slider').oninput = (ev) => {
      b.lv = Number(ev.target.value) || 1;
      recomputeAll(false);
    };
    document.getElementById('ncsim-jlv-slider').oninput = (ev) => {
      b.jobLv = Number(ev.target.value) || 1;
      recomputeAll(false);
    };
    col.querySelectorAll('[data-quick-lv]').forEach(btn => {
      btn.onclick = () => { b.lv = Number(btn.dataset.quickLv); b.jobLv = b.lv >= 50 ? 50 : Math.min(50, b.lv); persistBuilds(); recomputeAll(false); };
    });
    col.querySelectorAll('[data-eq-slot]').forEach(btn => {
      btn.onclick = () => openEquipSlotModal(btn.dataset.eqSlot);
    });
    document.getElementById('ncsim-btn-set-picker').onclick = openSetPickerModal;
    document.getElementById('ncsim-btn-all-max').onclick = () => {
      for (const s of E.EQUIP_SLOTS) {
        if (b.equip[s]) { b.equip[s].ref = 10; b.equip[s].g = 5; }
      }
      persistBuilds();
      recomputeAll(false);
      toast('✨ ปรับของสวมใส่ทั้งหมดเป็น +10 เกรด G5 ราตรี!');
    };
    document.getElementById('ncsim-btn-sandbox').onclick = () => {
      b.sandboxStats = !b.sandboxStats;
      persistBuilds();
      recomputeAll(false);
    };
    document.getElementById('ncsim-btn-reset-stat').onclick = () => {
      b.base = Object.assign({}, E.START_STATS);
      persistBuilds();
      recomputeAll(false);
    };
    col.querySelectorAll('[data-st-k]').forEach(btn => {
      btn.onclick = () => {
        const k = btn.dataset.stK;
        const delta = Number(btn.dataset.stD);
        const maxV = b.sandboxStats ? 200 : E.STAT_MAX;
        if (delta > 0) {
          for (let i = 0; i < delta; i++) {
            if (b.base[k] >= maxV) break;
            if (!b.sandboxStats) {
              const left = E.statusPointsAt(b.lv) - E.statSpent(b.base);
              if (left < E.statCost(b.base[k])) break;
            }
            b.base[k]++;
          }
        } else {
          b.base[k] = Math.max(E.START_STATS[k], b.base[k] + delta);
        }
        persistBuilds();
        recomputeAll(false);
      };
    });
  }

  // =========================================================================
  // CENTER COLUMN: BOSS SUMMONER + ARENA CONTROLS + HOTBAR + DPS ANALYTICS
  // =========================================================================
  function getFilteredMonsters() {
    let list = idx.wiki.monsters || [];
    if (state.targetCat === 'boss') list = idx.bosses;
    else if (state.targetCat === 'field_boss') list = idx.bosses.filter(m => m.type === 'Boss');
    else if (state.targetCat === 'story_boss') list = idx.bosses.filter(m => m.type === 'Story Boss');
    else if (state.targetCat === 'root_boss') list = idx.bosses.filter(m => m.type === 'Root Boss');
    if (state.targetSearch.trim()) {
      const q = state.targetSearch.trim().toLowerCase();
      list = list.filter(m => (m.id && m.id.toLowerCase().includes(q)) || (m.n && ((m.n.th && m.n.th.toLowerCase().includes(q)) || (m.n.en && m.n.en.toLowerCase().includes(q)))));
    }
    return list;
  }

  function renderArenaControls() {
    const bar = document.getElementById('ncsim-arena-controls');
    if (!bar || !arena) return;
    bar.innerHTML = `
      <div style="display:flex;gap:5px;align-items:center;flex-wrap:wrap;">
        <button type="button" class="ncsim-btn ncsim-btn-sm ${arena.playing ? 'ncsim-btn-gold' : ''}" id="ncsim-ar-play">${arena.playing ? '⏸ หยุด' : '▶ เล่นต่อ'}</button>
        <button type="button" class="ncsim-btn ncsim-btn-sm ${arena.autoRot ? 'active' : ''}" id="ncsim-ar-auto" title="คีย์ลัด Z">🤖 Auto-Rot: ${arena.autoRot ? 'ON' : 'OFF'}</button>
        ${[1, 2, 4].map(sp => `<button type="button" class="ncsim-btn ncsim-btn-sm ${arena.speed === sp ? 'active' : ''}" data-ar-spd="${sp}">${sp}x</button>`).join('')}
        <button type="button" class="ncsim-btn ncsim-btn-sm" id="ncsim-ar-reset">🔄 เสกใหม่</button>
      </div>
      <div style="display:flex;gap:10px;align-items:center;font-size:11.5px;">
        <span style="color:#94a3b8;">⏱ <b id="ncsim-arena-timer" style="color:#e2e8f0;font-family:monospace;">0.0s</b></span>
        <span style="color:#94a3b8;">Live DPS: <b id="ncsim-live-dps" style="color:#fde047;font-family:monospace;font-size:14px;">0</b></span>
        <span id="ncsim-cur-dps" style="font-size:10.5px;color:#94a3b8;"></span>
      </div>
    `;
    document.getElementById('ncsim-ar-play').onclick = () => { arena.playing = !arena.playing; renderArenaControls(); };
    document.getElementById('ncsim-ar-auto').onclick = () => { arena.autoRot = !arena.autoRot; renderArenaControls(); };
    document.getElementById('ncsim-ar-reset').onclick = () => { arena.resetCombat(); toast('🔄 เสกบอสใหม่เรียบร้อย!'); };
    bar.querySelectorAll('[data-ar-spd]').forEach(btn => {
      btn.onclick = () => { arena.speed = Number(btn.dataset.arSpd); renderArenaControls(); };
    });
  }

  function renderHotbar() {
    const hbEl = document.getElementById('ncsim-hotbar');
    if (!hbEl || !state.build) return;
    const hb = state.build.hotbar || {};
    const slotsHtml = HB_KEYS.map(k => {
      const sid = hb[k];
      const sk = sid && idx.skillsById[sid];
      return `
        <button type="button" class="ncsim-hb-slot" data-hb-cast="${k}" title="${sk ? `${esc(sk.n.th)} (${sk.mul}% · CD ${sk.cd}s)` : 'ว่าง — ตั้งค่าที่แผงสกิลขวา'}">
          <span class="ncsim-hb-key">${k.toUpperCase()}</span>
          ${sk ? atlasIconHtml(sk.ic, 38) : `<span style="color:#475569;font-size:12px;">—</span>`}
          <span class="ncsim-hb-cd" id="ncsim-hbcd-${k}" style="display:none;"></span>
        </button>
      `;
    }).join('');

    const cardSlotsHtml = [0, 1].map(ci => {
      const cs = state.build.cards.act[ci];
      const card = cs && idx.cardsById[cs.id];
      return `
        <button type="button" class="ncsim-hb-slot card-slot" data-hb-card="${ci}" title="${card ? `🃏 ${esc(card.art.th)} (CD ${card.cd}s)` : 'ช่องการ์ดกดใช้ ' + (ci + 1)}">
          <span class="ncsim-hb-key">${ci + 7}</span>
          ${card ? monThumbHtml(idx.monsById[card.id] || card, 36) : `<span style="color:#a855f7;font-size:15px;">🃏</span>`}
          <span class="ncsim-hb-cd" id="ncsim-hbcd-c${ci}" style="display:none;"></span>
        </button>
      `;
    }).join('');

    hbEl.innerHTML = `
      <button type="button" class="ncsim-hb-slot basic-slot" id="ncsim-hb-basic" title="โจมตีปกติ (Space)">
        <span class="ncsim-hb-key">SPC</span>
        <span style="font-size:20px;">⚔️</span>
      </button>
      ${slotsHtml}
      <span style="width:1px;height:32px;background:rgba(245,201,105,0.25);margin:0 2px;"></span>
      ${cardSlotsHtml}
    `;
    document.getElementById('ncsim-hb-basic').onclick = () => arena && arena.castBasic();
    hbEl.querySelectorAll('[data-hb-cast]').forEach(btn => {
      btn.onclick = () => {
        const sid = state.build.hotbar[btn.dataset.hbCast];
        if (sid && arena) arena.castSkillById(sid);
      };
    });
    hbEl.querySelectorAll('[data-hb-card]').forEach(btn => {
      btn.onclick = () => arena && arena.castCardSlot(Number(btn.dataset.hbCard));
    });
  }

  function renderCenterBarAndAnalytics() {
    // 1. Env Toggles in Boss Summoner header
    const envEl = document.getElementById('ncsim-env-toggles');
    if (envEl) {
      envEl.innerHTML = `
        <button type="button" class="ncsim-btn ncsim-btn-sm ${state.env.night ? 'active' : ''}" id="ncsim-tog-night">${state.env.night ? '🌙 กลางคืน' : '☀️ กลางวัน'}</button>
        <button type="button" class="ncsim-btn ncsim-btn-sm ${state.env.bossAttacks ? 'active' : ''}" id="ncsim-tog-batk" title="เปิดให้บอสโจมตีกลับเพื่อทดสอบการยืนชน">⚔️ บอสตีกลับ</button>
        <button type="button" class="ncsim-btn ncsim-btn-sm ${state.env.godMode ? 'active' : ''}" id="ncsim-tog-god" title="โหมดอมตะไม่ตาย">🛡️ อมตะ</button>
        <button type="button" class="ncsim-btn ncsim-btn-sm ${state.env.mode === 's2' ? 'active' : ''}" id="ncsim-tog-s2" title="Season 2 Cap (+50% bucket / +50% proc)">S2 Cap: ${state.env.mode === 's2' ? 'ON' : 'OFF'}</button>
      `;
      document.getElementById('ncsim-tog-night').onclick = () => { state.env.night = !state.env.night; recomputeAll(false); };
      document.getElementById('ncsim-tog-batk').onclick = () => { state.env.bossAttacks = !state.env.bossAttacks; recomputeAll(false); };
      document.getElementById('ncsim-tog-god').onclick = () => { state.env.godMode = !state.env.godMode; recomputeAll(false); };
      document.getElementById('ncsim-tog-s2').onclick = () => { state.env.mode = state.env.mode === 's2' ? 'offline' : 's2'; recomputeAll(false); };
    }

    // 2. Boss Summoner Bar
    const bossBar = document.getElementById('ncsim-boss-bar');
    if (bossBar) {
      const cats = [
        ['boss', `👑 บอสทั้งหมด (${idx.bosses.length})`],
        ['field_boss', '🔥 Field Boss'],
        ['story_boss', '📖 Story Boss'],
        ['root_boss', '🌳 Root Boss'],
        ['all', `👾 มอนทั้งหมด (${idx.wiki.monsters.length})`],
        ['dummy', '🎯 หุ่นปรับเอง'],
      ];
      const mons = getFilteredMonsters();
      const targetOpts = mons.slice(0, 200).map(m => `<option value="${esc(m.id)}" ${m.id === state.targetId ? 'selected' : ''}>${m.boss ? '👑 ' : ''}${esc(m.n.th)} · Lv.${m.lv} (${(E.ELEMENT_INFO[m.el] || {}).th || m.el} · HP ${(m.hp || 0).toLocaleString()})</option>`).join('');
      const themes = Object.entries(window.NC_ARENA_THEMES || {}).map(([k, v]) => `<option value="${k}" ${state.env.theme === k ? 'selected' : ''}>🗺️ ${esc(v.name)}</option>`).join('');

      bossBar.innerHTML = `
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px;">
          ${cats.map(([k, lbl]) => `<button type="button" class="ncsim-btn ncsim-btn-sm ${state.targetCat === k ? 'active' : ''}" data-tcat="${k}">${lbl}</button>`).join('')}
        </div>
        ${state.targetCat === 'dummy' ? `
          <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:5px;background:rgba(12,10,22,0.8);padding:7px;border-radius:8px;border:1px solid rgba(245,201,105,0.22);">
            <label style="font-size:10px;color:#94a3b8;">HP<input type="number" class="ncsim-input" id="ncsim-dm-hp" value="${state.customDummy.hp}" style="width:100%;margin-top:2px;"></label>
            <label style="font-size:10px;color:#94a3b8;">DEF<input type="number" class="ncsim-input" id="ncsim-dm-def" value="${state.customDummy.def}" style="width:100%;margin-top:2px;"></label>
            <label style="font-size:10px;color:#94a3b8;">MDEF<input type="number" class="ncsim-input" id="ncsim-dm-mdef" value="${state.customDummy.mdef}" style="width:100%;margin-top:2px;"></label>
            <label style="font-size:10px;color:#94a3b8;">ธาตุ<select class="ncsim-select" id="ncsim-dm-el" style="width:100%;margin-top:2px;">${E.ELEMENTS.map(e => `<option value="${e}" ${state.customDummy.el === e ? 'selected' : ''}>${E.ELEMENT_INFO[e].th}</option>`).join('')}</select></label>
            <label style="font-size:10px;color:#94a3b8;">จำนวนตัว<input type="number" min="1" max="10" class="ncsim-input" id="ncsim-t-cnt" value="${state.env.targetCount}" style="width:100%;margin-top:2px;"></label>
          </div>
        ` : `
          <div style="display:grid;grid-template-columns:130px 1fr 78px 135px;gap:5px;">
            <input type="text" class="ncsim-input" id="ncsim-t-search" placeholder="🔍 ค้นหามอน/บอส..." value="${esc(state.targetSearch)}">
            <select class="ncsim-select" id="ncsim-t-select">${targetOpts}</select>
            <select class="ncsim-select" id="ncsim-t-cnt" title="จำนวนมอนในสนาม">
              ${[1, 2, 3, 4, 5, 6, 8, 10].map(n => `<option value="${n}" ${state.env.targetCount === n ? 'selected' : ''}>${n} ตัว</option>`).join('')}
            </select>
            <select class="ncsim-select" id="ncsim-theme-sel">${themes}</select>
          </div>
        `}
      `;

      bossBar.querySelectorAll('[data-tcat]').forEach(btn => {
        btn.onclick = () => {
          state.targetCat = btn.dataset.tcat;
          if (state.targetCat !== 'dummy') {
            const list = getFilteredMonsters();
            if (list.length && !list.some(m => m.id === state.targetId)) state.targetId = list[0].id;
          }
          recomputeAll(true);
        };
      });
      if (state.targetCat === 'dummy') {
        document.getElementById('ncsim-dm-hp').onchange = (ev) => { state.customDummy.hp = Math.max(100, Number(ev.target.value) || 500000); recomputeAll(true); };
        document.getElementById('ncsim-dm-def').onchange = (ev) => { state.customDummy.def = Math.max(0, Number(ev.target.value) || 0); recomputeAll(false); };
        document.getElementById('ncsim-dm-mdef').onchange = (ev) => { state.customDummy.mdef = Math.max(0, Number(ev.target.value) || 0); recomputeAll(false); };
        document.getElementById('ncsim-dm-el').onchange = (ev) => { state.customDummy.el = ev.target.value; recomputeAll(false); };
        document.getElementById('ncsim-t-cnt').onchange = (ev) => { state.env.targetCount = Math.max(1, Math.min(10, Number(ev.target.value) || 1)); recomputeAll(true); };
      } else {
        document.getElementById('ncsim-t-search').oninput = (ev) => {
          state.targetSearch = ev.target.value;
          const list = getFilteredMonsters();
          const sel = document.getElementById('ncsim-t-select');
          if (sel) sel.innerHTML = list.slice(0, 200).map(m => `<option value="${esc(m.id)}" ${m.id === state.targetId ? 'selected' : ''}>${m.boss ? '👑 ' : ''}${esc(m.n.th)} · Lv.${m.lv} (${(E.ELEMENT_INFO[m.el] || {}).th || m.el} · HP ${(m.hp || 0).toLocaleString()})</option>`).join('');
        };
        document.getElementById('ncsim-t-select').onchange = (ev) => { state.targetId = ev.target.value; recomputeAll(true); };
        document.getElementById('ncsim-t-cnt').onchange = (ev) => { state.env.targetCount = Number(ev.target.value) || 1; recomputeAll(true); };
        document.getElementById('ncsim-theme-sel').onchange = (ev) => { state.env.theme = ev.target.value; if (arena) arena.env.theme = ev.target.value; };
      }
    }

    renderArenaControls();

    // 3. Instant Sim Buttons
    const instBtns = document.getElementById('ncsim-instant-btns');
    if (instBtns) {
      instBtns.innerHTML = `
        <button type="button" class="ncsim-btn ncsim-btn-sm" data-isim="10">⚡ 10s</button>
        <button type="button" class="ncsim-btn ncsim-btn-sm" data-isim="30">⚡ 30s</button>
        <button type="button" class="ncsim-btn ncsim-btn-sm" data-isim="60">⚡ 60s</button>
        <button type="button" class="ncsim-btn ncsim-btn-sm ncsim-btn-gold" data-isim="kill">☠️ จนบอสตาย</button>
      `;
      instBtns.querySelectorAll('[data-isim]').forEach(btn => {
        btn.onclick = () => {
          const v = btn.dataset.isim;
          const isKill = v === 'kill';
          state.lastInstantSim = E.simulateFight(idx, state.build, state.targetCat === 'dummy' ? state.customDummy : state.targetId, {
            durationSec: isKill ? 300 : Number(v),
            stopOnKill: isKill,
            night: state.env.night,
            mode: state.env.mode,
            targetCount: state.env.targetCount,
            bossAttacks: state.env.bossAttacks,
            godMode: state.env.godMode,
          });
          renderAnalyticsBody();
          toast(`⚡ คำนวณการสู้ (${isKill ? 'จนบอสตาย' : v + ' วิ'}) เสร็จสิ้น: ${state.lastInstantSim.dps.toLocaleString()} DPS`);
        };
      });
    }
    renderAnalyticsBody();
  }

  function renderAnalyticsBody() {
    const body = document.getElementById('ncsim-analytics-body');
    const sim = state.lastInstantSim;
    if (!body || !sim) return;

    // Build A vs B comparison block (if locked)
    let cmpHtml = '';
    if (state.baselineA) {
      const cmp = E.compareBuilds(idx, state.baselineA, state.build, state.targetCat === 'dummy' ? state.customDummy : state.targetId, {
        durationSec: 30, night: state.env.night, mode: state.env.mode, targetCount: state.env.targetCount, bossAttacks: state.env.bossAttacks, godMode: state.env.godMode,
      });
      const sign = cmp.dpsDiff >= 0 ? '+' : '';
      const col = cmp.dpsDiff > 0 ? '#4ade80' : (cmp.dpsDiff < 0 ? '#f87171' : '#cbd5e1');
      cmpHtml = `
        <div class="ncsim-compare-box">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <b style="color:#93c5fd;font-size:12px;">⚖️ เทียบ Build A (${esc(state.baselineA.name)}) vs Build B (ปัจจุบัน)</b>
            <span style="font-size:13px;font-weight:900;color:${col};font-family:monospace;">${sign}${cmp.dpsDiff.toLocaleString()} DPS (${sign}${cmp.dpsPct}%)</span>
          </div>
          <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:11px;color:#cbd5e1;">
            <span>A: <b>${cmp.A.dps.toLocaleString()}</b> DPS (TTK ${cmp.A.ttkSec || '—'}s)</span>
            <span>B: <b style="color:#fde68a;">${cmp.B.dps.toLocaleString()}</b> DPS (TTK ${cmp.B.ttkSec || '—'}s)</span>
            <span>EHP: <b style="color:${cmp.ehpDiff >= 0 ? '#4ade80' : '#f87171'};">${cmp.ehpDiff >= 0 ? '+' : ''}${cmp.ehpDiff.toLocaleString()}</b></span>
            <span>CRIT: <b>${cmp.statDiffs.crit >= 0 ? '+' : ''}${cmp.statDiffs.crit}%</b></span>
            <span>ASPD: <b>${cmp.statDiffs.aspd >= 0 ? '+' : ''}${cmp.statDiffs.aspd}</b></span>
          </div>
        </div>
      `;
    }

    // Skill Breakdown bars
    const barsHtml = (sim.skillBreakdown || []).slice(0, 8).map(row => {
      const c = (E.ELEMENT_INFO[row.el] || E.ELEMENT_INFO.neutral).color;
      return `
        <div class="ncsim-bar-row">
          <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:700;" title="${esc(row.name)}">${esc(row.name)}</span>
          <div class="ncsim-bar-track"><div class="ncsim-bar-fill" style="width:${Math.max(2, row.sharePct)}%;background:${c};"></div></div>
          <span style="text-align:right;font-family:monospace;color:#fde68a;">${row.dps.toLocaleString()}/s</span>
          <span style="text-align:right;font-family:monospace;color:#94a3b8;">${row.sharePct}%</span>
        </div>
      `;
    }).join('');

    // DPS Sparkline SVG
    const series = sim.dpsSeries || [];
    let sparkSvg = '';
    if (series.length > 2) {
      const maxD = Math.max(10, ...series.map(p => p.dps));
      const pts = series.map((p, i) => `${((i / (series.length - 1)) * 420).toFixed(1)},${(44 - (p.dps / maxD) * 38).toFixed(1)}`).join(' ');
      sparkSvg = `
        <div style="background:rgba(10,10,20,0.75);border:1px solid rgba(148,163,184,0.16);border-radius:8px;padding:6px 8px;">
          <div style="display:flex;justify-content:space-between;font-size:10px;color:#94a3b8;margin-bottom:3px;">
            <span>📈 กราฟ DPS รายวินาที (${sim.elapsedSec}s)</span>
            <span>พีค: ${maxD.toLocaleString()} / วิ</span>
          </div>
          <svg viewBox="0 0 420 48" style="width:100%;height:46px;display:block;">
            <polyline fill="none" stroke="#fbbf24" stroke-width="2" points="${pts}"/>
          </svg>
        </div>
      `;
    }

    body.innerHTML = `
      ${cmpHtml}
      <div class="ncsim-kpi-row">
        <div class="ncsim-kpi">
          <div class="ncsim-kpi-lbl">🔥 DPS เฉลี่ย (${sim.elapsedSec}s)</div>
          <div class="ncsim-kpi-val">${sim.dps.toLocaleString()}</div>
          <div class="ncsim-kpi-sub">Burst 5s: ${sim.burstDps5s.toLocaleString()}</div>
        </div>
        <div class="ncsim-kpi">
          <div class="ncsim-kpi-lbl">⏱️ เวลาฆ่าบอส (TTK)</div>
          <div class="ncsim-kpi-val" style="color:#7dd3fc;">${sim.ttkSec != null ? sim.ttkSec + 's' : '—'}</div>
          <div class="ncsim-kpi-sub">ฆ่าได้ ${sim.kills} ตัว · แตก ${sim.armorBreaks}</div>
        </div>
        <div class="ncsim-kpi">
          <div class="ncsim-kpi-lbl">💥 Max Hit / Crit</div>
          <div class="ncsim-kpi-val" style="color:#fbbf24;">${sim.maxHit.toLocaleString()}</div>
          <div class="ncsim-kpi-sub">Crit ${sim.critRatePct}% · Hit ${sim.hitRatePct}%</div>
        </div>
        <div class="ncsim-kpi">
          <div class="ncsim-kpi-lbl">🛡️ การยืนชน (Sustain)</div>
          <div class="ncsim-kpi-val" style="color:${sim.survived ? '#4ade80' : '#f87171'};">${sim.survived ? 'รอด' : 'ตาย'}</div>
          <div class="ncsim-kpi-sub">โดน ${sim.incomingDps}/s · ฮีล ${sim.healPerSec}/s</div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:5px;">
        <div style="font-size:11px;font-weight:800;color:#fde68a;">⚔️ สัดส่วนดาเมจแยกตามสกิล / รูน / การ์ด</div>
        ${barsHtml || '<div style="color:#64748b;font-size:11px;">ไม่มีสกิลโจมตีในโรเตชัน</div>'}
      </div>
      ${sparkSvg}
    `;
  }

  // =========================================================================
  // RIGHT COLUMN: SKILLS & RUNES · MONSTER CARDS · BUFFS & FOOD
  // =========================================================================
  function renderRightPanel() {
    const col = document.getElementById('ncsim-right-col');
    if (!col || !state.build) return;
    const tabs = [
      ['skills', '⚡ สกิล & รูน'],
      ['cards', '🃏 การ์ดมอน'],
      ['buffs', '🧪 บัฟ & อาหาร'],
    ];

    let inner = '';
    if (state.rightTab === 'skills') inner = renderSkillsRunesTab();
    else if (state.rightTab === 'cards') inner = renderCardsTab();
    else inner = renderBuffsTab();

    col.innerHTML = `
      <div class="ncsim-subtabs">
        ${tabs.map(([k, lbl]) => `<button type="button" class="ncsim-subtab ${state.rightTab === k ? 'active' : ''}" data-rtab="${k}">${lbl}</button>`).join('')}
      </div>
      <div class="ncsim-win-body">${inner}</div>
    `;

    col.querySelectorAll('[data-rtab]').forEach(btn => {
      btn.onclick = () => { state.rightTab = btn.dataset.rtab; renderRightPanel(); };
    });

    if (state.rightTab === 'skills') wireSkillsRunesTab(col);
    else if (state.rightTab === 'cards') wireCardsTab(col);
    else wireBuffsTab(col);
  }

  function renderRunePill(skillId, slotIdx, rObj) {
    const R = rObj && rObj.k && idx.runesByKey[rObj.k];
    if (!R) {
      return `<button type="button" class="ncsim-rune-pill" data-rune-sk="${esc(skillId)}" data-rune-si="${slotIdx}"><span>+ ช่องรูน ${slotIdx + 1}</span><span>💠</span></button>`;
    }
    const qPct = Math.round(((rObj.qb || 0)) * 100);
    return `
      <button type="button" class="ncsim-rune-pill filled" data-rune-sk="${esc(skillId)}" data-rune-si="${slotIdx}" title="${esc(R.n.th)} T${rObj.tier} (Roll ${qPct >= 0 ? '+' : ''}${qPct}%)">
        <span style="display:flex;align-items:center;gap:4px;min-width:0;overflow:hidden;">
          ${R.ic && R.ic[rObj.tier - 1] ? atlasIconHtml(R.ic[rObj.tier - 1], 18) : '💠'}
          <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(R.n.th)}</span>
        </span>
        <span style="font-weight:900;color:#fde68a;">T${rObj.tier}</span>
      </button>
    `;
  }

  function renderSkillsRunesTab() {
    const b = state.build;
    const skills = E.getJobSkills(idx, b.job);

    // Basic Attack Runes (2 slots: Lv.40 / Lv.70)
    const basicHtml = `
      <div class="ncsim-sk-card in-rot" style="border-color:rgba(56,189,248,0.48);">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <b style="font-size:11.5px;color:#7dd3fc;">⚔️ รูนตีปกติ (Basic Attack Runes)</b>
          <span style="font-size:10px;color:#94a3b8;">ปลดช่อง 1: Lv.40 · ช่อง 2: Lv.70</span>
        </div>
        <div class="ncsim-rune-row">
          ${renderRunePill('__basic__', 0, b.basicRunes[0])}
          ${renderRunePill('__basic__', 1, b.basicRunes[1])}
        </div>
      </div>
    `;

    // Order: active skills of current job first, then inherited actives, then passives
    const sorted = skills.slice().sort((a, z) => {
      const score = (s) => (s.type === 'passive' ? 0 : 100) + (s.job === b.job ? 50 : 0) + (b.rotation.includes(s.id) ? 20 : 0);
      return score(z) - score(a);
    });

    const listHtml = sorted.map(sk => {
      const lv = (b.skills && b.skills[sk.id]) || 0;
      const inRot = b.rotation.includes(sk.id);
      const isPas = sk.type === 'passive';
      const rArr = (b.runes && b.runes[sk.id]) || [null, null];
      const rSum = !isPas ? E.computeRuneBundle(idx, rArr, { n: state.env.targetCount, night: state.env.night, hits: sk.hits || 1, dur: sk.dur || 0, cd: sk.cd || 1, splitIn: sk.splitIn || 0 }, state.env.mode).summary : null;
      const elI = E.ELEMENT_INFO[sk.el || 'neutral'] || E.ELEMENT_INFO.neutral;
      const boundKey = HB_KEYS.find(k => b.hotbar && b.hotbar[k] === sk.id) || '';

      return `
        <div class="ncsim-sk-card ${inRot ? 'in-rot' : ''}">
          <div class="ncsim-sk-top">
            ${atlasIconHtml(sk.ic, 32)}
            <div style="flex:1;min-width:0;">
              <div style="display:flex;align-items:center;gap:4px;">
                <b style="font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(sk.n.th)}</b>
                <span class="ncsim-tag" style="color:${elI.color};">${isPas ? 'Passive' : `${sk.mul || 0}%`}</span>
                ${rSum && rSum.isBucketCapped ? `<span class="ncsim-tag ncsim-tag-red" title="โบนัสรูนเกินเพดาน Season 2 (+50%)">CAP 50%</span>` : ''}
              </div>
              <div style="font-size:10px;color:#94a3b8;">
                ${esc(idx.jobsById[sk.job].n.th)}${!isPas ? ` · CD ${sk.cd || 0}s · ${sk.hits || 1} ฮิต` : ''}
                ${rSum && rSum.total !== 1 ? ` · รูน <b style="color:#c084fc;">×${rSum.total.toFixed(2)}</b>` : ''}
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:4px;">
              <span style="font-size:10.5px;font-family:monospace;color:#fde68a;">Lv.${lv}/${sk.max || 10}</span>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;">
            <input type="range" min="0" max="${sk.max || 10}" value="${lv}" data-sk-lv="${esc(sk.id)}" style="flex:1;accent-color:#f59e0b;">
            ${!isPas ? `
              <label style="font-size:10.5px;display:flex;align-items:center;gap:3px;cursor:pointer;color:${inRot ? '#fde68a' : '#94a3b8'};">
                <input type="checkbox" data-sk-rot="${esc(sk.id)}" ${inRot ? 'checked' : ''}> Auto
              </label>
              <select class="ncsim-select" data-sk-hb="${esc(sk.id)}" style="padding:2px 4px;font-size:10px;width:54px;" title="ผูกปุ่ม Hotbar">
                <option value="">Key</option>
                ${HB_KEYS.map(k => `<option value="${k}" ${boundKey === k ? 'selected' : ''}>${k.toUpperCase()}</option>`).join('')}
              </select>
            ` : ''}
          </div>
          ${(!isPas && Array.isArray(sk.fit) && sk.fit.length) ? `
            <div class="ncsim-rune-row">
              ${renderRunePill(sk.id, 0, rArr[0])}
              ${renderRunePill(sk.id, 1, rArr[1])}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    return `<div class="ncsim-scroll">${basicHtml}${listHtml}</div>`;
  }

  function wireSkillsRunesTab(col) {
    const b = state.build;
    col.querySelectorAll('[data-sk-lv]').forEach(inp => {
      inp.oninput = () => {
        b.skills[inp.dataset.skLv] = Number(inp.value) || 0;
        recomputeAll(false);
      };
    });
    col.querySelectorAll('[data-sk-rot]').forEach(chk => {
      chk.onchange = () => {
        const sid = chk.dataset.skRot;
        if (chk.checked && !b.rotation.includes(sid)) b.rotation.push(sid);
        else if (!chk.checked) b.rotation = b.rotation.filter(x => x !== sid);
        persistBuilds();
        recomputeAll(false);
      };
    });
    col.querySelectorAll('[data-sk-hb]').forEach(sel => {
      sel.onchange = () => {
        const sid = sel.dataset.skHb;
        const k = sel.value;
        for (const hk of HB_KEYS) if (b.hotbar[hk] === sid) b.hotbar[hk] = null;
        if (k) b.hotbar[k] = sid;
        persistBuilds();
        renderHotbar();
      };
    });
    col.querySelectorAll('[data-rune-sk]').forEach(btn => {
      btn.onclick = () => openRunePickerModal(btn.dataset.runeSk, Number(btn.dataset.runeSi));
    });
  }

  function renderCardsTab() {
    const b = state.build;
    const st = state.stats;
    const renderSlot = (role, i, cObj) => {
      const card = cObj && idx.cardsById[cObj.id];
      const effTxt = card ? (card.eff || []).map(e => (e.txt && e.txt[0] && e.txt[0].th) || '').filter(Boolean).join(' · ') : '';
      return `
        <div class="ncsim-card-slot" data-card-role="${role}" data-card-idx="${i}">
          ${card ? monThumbHtml(idx.monsById[card.id] || card, 40) : `<span style="width:40px;height:40px;border-radius:8px;background:rgba(139,92,246,0.14);display:grid;place-items:center;font-size:18px;">🃏</span>`}
          <div style="flex:1;min-width:0;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:4px;">
              <b style="font-size:11.5px;color:${card ? '#f3e8ff' : '#64748b'};">${card ? `${esc(card.mon.th)}${role === 'act' ? ` · ${esc(card.art.th)}` : ''}` : `ว่าง — คลิกใส่การ์ด ${role === 'pas' ? 'Passive' : 'Active'} #${i + 1}`}</b>
              ${card ? `<span class="ncsim-tag ncsim-tag-violet">Lv.${cObj.lv}</span>` : ''}
            </div>
            <div style="font-size:10px;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${card ? esc(role === 'act' ? (card.d && card.d.th) : effTxt) : 'เลือกจากการ์ดมอนสเตอร์ทั้ง 338 ใบใน Wiki'}
            </div>
          </div>
        </div>
      `;
    };

    return `
      <div class="ncsim-scroll">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <b style="font-size:11.5px;color:#fde68a;">📘 การ์ดติดตัว Passive (3 ช่อง)</b>
          <span style="font-size:10px;color:#94a3b8;">ไม่ซ้ำกับการ์ดกดใช้</span>
        </div>
        ${[0, 1, 2].map(i => renderSlot('pas', i, b.cards.pas[i])).join('')}

        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
          <b style="font-size:11.5px;color:#c084fc;">⚡ การ์ดวิชา Active (2 ช่อง · ปุ่ม 7, 8)</b>
          <div style="display:flex;gap:4px;">
            ${st.cardPairFam ? `<span class="ncsim-tag ncsim-tag-green">คู่เผ่า CD -10%</span>` : ''}
            ${st.cardPairEl ? `<span class="ncsim-tag ncsim-tag-gold">คู่ธาตุ DMG +30%</span>` : ''}
          </div>
        </div>
        ${[0, 1].map(i => renderSlot('act', i, b.cards.act[i])).join('')}
      </div>
    `;
  }

  function wireCardsTab(col) {
    col.querySelectorAll('[data-card-role]').forEach(el => {
      el.onclick = () => openCardPickerModal(el.dataset.cardRole, Number(el.dataset.cardIdx));
    });
  }

  function renderBuffsTab() {
    const b = state.build;
    const potKeys = ['bless', 'swift', 'guard', 'luck', 'cast'];
    const potLabels = { bless: 'ยาพรศักดิ์สิทธิ์', swift: 'ยาเท้าไว', guard: 'ยาเกราะกาย', luck: 'ยาสรรเสริญโชค', cast: 'ยาเร่งร่าย' };
    const potsHtml = potKeys.map(k => {
      const sId = `bp_${k}_s`, lId = `bp_${k}_l`;
      const hasS = b.buffs.pots.includes(sId), hasL = b.buffs.pots.includes(lId);
      return `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 8px;background:rgba(14,12,26,0.85);border-radius:8px;border:1px solid rgba(148,163,184,0.16);">
          <span style="font-size:11px;font-weight:700;">🧪 ${potLabels[k]}</span>
          <div style="display:flex;gap:4px;">
            <button type="button" class="ncsim-btn ncsim-btn-sm ${hasS ? 'active' : ''}" data-pot-k="${k}" data-pot-id="${sId}">เล็ก</button>
            <button type="button" class="ncsim-btn ncsim-btn-sm ${hasL ? 'active' : ''}" data-pot-k="${k}" data-pot-id="${lId}">ใหญ่</button>
          </div>
        </div>
      `;
    }).join('');

    const dishesHtml = `
      <select class="ncsim-select" id="ncsim-dish-sel" style="width:100%;">
        <option value="">— ไม่กินอาหาร —</option>
        ${(idx.wiki.life && idx.wiki.life.dishes || []).map(d => {
          const bt = Object.entries(d.buff || {}).map(([k, v]) => `${k.toUpperCase()} +${v}`).join(' · ');
          return `<option value="${esc(d.id)}" ${b.buffs.dish === d.id ? 'selected' : ''}>🍲 ${esc(d.n.th)} (${bt})</option>`;
        }).join('')}
      </select>
    `;

    const partyHtml = E.PARTY_BUFFS.map(pb => {
      const on = b.buffs.party.includes(pb.id);
      return `<button type="button" class="ncsim-btn ncsim-btn-sm ${on ? 'active' : ''}" data-pt-id="${pb.id}" style="justify-content:space-between;width:100%;"><span>${esc(pb.name)}</span><span style="color:#94a3b8;font-size:10px;">${esc(pb.tag)}</span></button>`;
    }).join('');

    const guildHtml = E.GUILD_BUFFS.map(gb => {
      const on = b.buffs.guild.includes(gb.id);
      return `<button type="button" class="ncsim-btn ncsim-btn-sm ${on ? 'active' : ''}" data-gb-id="${gb.id}">${esc(gb.name)} (${esc(gb.tag)})</button>`;
    }).join('');

    return `
      <div class="ncsim-scroll">
        <div style="background:rgba(14,12,26,0.85);padding:7px 9px;border-radius:9px;border:1px solid rgba(148,163,184,0.18);">
          <label style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px;"><span>❤️ HP เริ่มต้น (ทดสอบออฟเลือดต่ำ)</span><b style="color:#fca5a5;">${b.hpPct}%</b></label>
          <input type="range" id="ncsim-hp-slider" min="10" max="100" value="${b.hpPct}" style="width:100%;accent-color:#ef4444;">
        </div>
        <b style="font-size:11.5px;color:#fde68a;">🧪 ยาบัฟ (Buff Potions)</b>
        ${potsHtml}
        <b style="font-size:11.5px;color:#fde68a;margin-top:4px;">🍲 อาหารบัฟ (Life Dishes)</b>
        ${dishesHtml}
        <b style="font-size:11.5px;color:#93c5fd;margin-top:4px;">👥 บัฟปาร์ตี้ (Priest / Bard / Tank)</b>
        <div style="display:flex;flex-direction:column;gap:4px;">${partyHtml}</div>
        <b style="font-size:11.5px;color:#c084fc;margin-top:4px;">🏰 บัฟกิลด์ (Guild Buffs)</b>
        <div style="display:flex;flex-wrap:wrap;gap:4px;">${guildHtml}</div>
      </div>
    `;
  }

  function wireBuffsTab(col) {
    const b = state.build;
    document.getElementById('ncsim-hp-slider').oninput = (ev) => { b.hpPct = Number(ev.target.value) || 100; recomputeAll(false); };
    col.querySelectorAll('[data-pot-id]').forEach(btn => {
      btn.onclick = () => {
        const k = btn.dataset.potK, id = btn.dataset.potId;
        const had = b.buffs.pots.includes(id);
        b.buffs.pots = b.buffs.pots.filter(x => !x.startsWith(`bp_${k}_`));
        if (!had) b.buffs.pots.push(id);
        persistBuilds(); recomputeAll(false);
      };
    });
    document.getElementById('ncsim-dish-sel').onchange = (ev) => { b.buffs.dish = ev.target.value || null; persistBuilds(); recomputeAll(false); };
    col.querySelectorAll('[data-pt-id]').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.ptId;
        if (b.buffs.party.includes(id)) b.buffs.party = b.buffs.party.filter(x => x !== id);
        else b.buffs.party.push(id);
        persistBuilds(); recomputeAll(false);
      };
    });
    col.querySelectorAll('[data-gb-id]').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.gbId;
        if (b.buffs.guild.includes(id)) b.buffs.guild = b.buffs.guild.filter(x => x !== id);
        else b.buffs.guild.push(id);
        persistBuilds(); recomputeAll(false);
      };
    });
  }

  // =========================================================================
  // MODALS: EQUIPMENT PICKER & CUSTOMIZER, SET PICKER, RUNE PICKER, CARD PICKER,
  //         LIVE IMPORT, AUTO-OPTIMIZE, EXPORT PLAN, MCP CONFIG
  // =========================================================================
  function showModal(title, bodyHtml, onMount) {
    state.modal = title;
    const rootEl = document.getElementById('ncsim-modal-root');
    rootEl.innerHTML = `
      <div class="ncsim-modal-backdrop" id="ncsim-modal-bg">
        <div class="ncsim-modal">
          <div class="ncsim-modal-head">
            <span>${title}</span>
            <button type="button" class="ncsim-btn ncsim-btn-sm" id="ncsim-modal-x">✕ ปิด</button>
          </div>
          <div class="ncsim-modal-body" id="ncsim-modal-body">${bodyHtml}</div>
        </div>
      </div>
    `;
    const close = () => { state.modal = null; rootEl.innerHTML = ''; };
    document.getElementById('ncsim-modal-x').onclick = close;
    document.getElementById('ncsim-modal-bg').onclick = (ev) => { if (ev.target.id === 'ncsim-modal-bg') close(); };
    if (onMount) onMount(document.getElementById('ncsim-modal-body'), close);
  }

  function openEquipSlotModal(slot) {
    const b = state.build;
    const cur = b.equip[slot] ? JSON.parse(JSON.stringify(b.equip[slot])) : null;
    const wikiSlot = (slot === 'acc1' || slot === 'acc2') ? 'acc' : slot;
    const allowedW = E.JOB_WEAPONS[b.job] || [];
    let onlyJobW = slot === 'weapon';
    let searchQ = '';
    let rarityF = '';

    showModal(`⚔️ ช่อง ${E.SLOT_LABELS[slot]} · เสกไอเทม / ตีบวก / ออฟชัน`, `<div id="ncsim-eq-mwrap"></div>`, (body, close) => {
      const draw = () => {
        const curItem = cur && idx.itemsById[cur.id];
        const rowsHtml = cur ? (cur.rows || []).map((r, ri) => `
          <div style="display:flex;gap:5px;align-items:center;">
            <select class="ncsim-select" data-opt-k="${ri}" style="flex:1;">
              ${Object.entries(E.GEAROPT).map(([ok, ov]) => `<option value="${ok}" ${r.k === ok ? 'selected' : ''}>${esc(ov.th)}</option>`).join('')}
            </select>
            ${E.GEAROPT[r.k] && E.GEAROPT[r.k].subs ? `
              <select class="ncsim-select" data-opt-sub="${ri}" style="width:92px;">
                ${E.GEAROPT[r.k].subs.map(sb => `<option value="${sb}" ${r.sub === sb ? 'selected' : ''}>${sb}</option>`).join('')}
              </select>
            ` : ''}
            <input type="number" class="ncsim-input" data-opt-v="${ri}" value="${r.v}" style="width:66px;">
            <button type="button" class="ncsim-btn ncsim-btn-sm ncsim-btn-danger" data-opt-del="${ri}">✕</button>
          </div>
        `).join('') : '';

        const pool = (idx.itemsBySlot[wikiSlot] || []).filter(it => {
          if (slot === 'weapon' && onlyJobW && allowedW.length && it.wt && !allowedW.includes(it.wt)) return false;
          if (rarityF && it.r !== rarityF) return false;
          if (searchQ) {
            const q = searchQ.toLowerCase();
            if (!((it.id || '').toLowerCase().includes(q) || (it.n && ((it.n.th || '').toLowerCase().includes(q) || (it.n.en || '').toLowerCase().includes(q))) || (it.wt || '').toLowerCase().includes(q))) return false;
          }
          return true;
        }).sort((a, z) => (z.lv || 0) - (a.lv || 0) || (z.atk || 0) - (a.atk || 0));

        body.innerHTML = `
          ${cur && curItem ? `
            <div style="background:rgba(32,26,52,0.92);border:1.5px solid ${E.GRADES[cur.g || 0].color};border-radius:11px;padding:10px;display:flex;flex-direction:column;gap:8px;">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
                <div style="display:flex;align-items:center;gap:8px;">
                  ${atlasIconHtml(curItem.ic, 40)}
                  <div>
                    <b style="font-size:13px;color:${E.GRADES[cur.g || 0].color};">${cur.ref > 0 ? `+${cur.ref} ` : ''}${esc(curItem.n.th)}</b>
                    <div style="font-size:10.5px;color:#94a3b8;">Lv.${curItem.lv || 1}${curItem.atk ? ` · ATK ${curItem.atk}` : ''}${curItem.el ? ` · ธาตุ ${E.ELEMENT_INFO[curItem.el].th}` : ''} · ${Object.entries(curItem.st || {}).map(([k, v]) => `${k.toUpperCase()} +${v}`).join(' · ')}</div>
                  </div>
                </div>
                <div style="display:flex;gap:5px;">
                  <button type="button" class="ncsim-btn ncsim-btn-sm ncsim-btn-danger" id="ncsim-eq-unequip">ถอดออก</button>
                  <button type="button" class="ncsim-btn ncsim-btn-sm ncsim-btn-gold" id="ncsim-eq-apply">✓ ใช้งานชิ้นนี้</button>
                </div>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:center;">
                <div>
                  <label style="font-size:11px;color:#fde68a;display:flex;justify-content:space-between;"><span>🔨 ตีบวก (Refine)</span><b>+${cur.ref}</b></label>
                  <input type="range" min="0" max="10" value="${cur.ref}" id="ncsim-eq-ref" style="width:100%;accent-color:#f59e0b;">
                </div>
                <div>
                  <div style="font-size:11px;color:#fde68a;margin-bottom:3px;">✨ เกรดไอเทม (Grade G0–G5)</div>
                  <div style="display:flex;gap:3px;">
                    ${E.GRADES.map(gr => `<button type="button" class="ncsim-btn ncsim-btn-sm ${cur.g === gr.g ? 'active' : ''}" data-eq-g="${gr.g}" style="color:${gr.color};">G${gr.g}</button>`).join('')}
                  </div>
                </div>
              </div>
              <div style="display:flex;flex-direction:column;gap:5px;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <span style="font-size:11px;font-weight:700;color:#a5f3fc;">◆ ออฟชันแถว (Gear Options · สูงสุด 4 แถว)</span>
                  ${(cur.rows || []).length < 4 ? `<button type="button" class="ncsim-btn ncsim-btn-sm" id="ncsim-opt-add">+ เพิ่มแถวออฟ</button>` : ''}
                </div>
                ${rowsHtml}
              </div>
            </div>
          ` : ''}

          <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
            <input type="text" class="ncsim-input" id="ncsim-eq-q" placeholder="🔍 ค้นหาชื่อไอเทม / ประเภท..." value="${esc(searchQ)}" style="flex:1;min-width:180px;">
            <select class="ncsim-select" id="ncsim-eq-rar">
              <option value="">ทุกระดับหายาก</option>
              ${['common', 'uncommon', 'rare', 'epic', 'legend', 'legendary'].map(r => `<option value="${r}" ${rarityF === r ? 'selected' : ''}>${r}</option>`).join('')}
            </select>
            ${slot === 'weapon' ? `<label style="font-size:11px;display:flex;align-items:center;gap:4px;"><input type="checkbox" id="ncsim-eq-jobw" ${onlyJobW ? 'checked' : ''}> เฉพาะอาวุธอาชีพนี้</label>` : ''}
            <span style="font-size:11px;color:#94a3b8;">พบ ${pool.length} ชิ้น</span>
          </div>
          <div class="ncsim-pick-grid">
            ${pool.slice(0, 120).map(it => {
              const rCol = (E.RARITY_INFO[it.r] && E.RARITY_INFO[it.r].color) || '#e2e8f0';
              return `
                <button type="button" class="ncsim-pick-item" data-pick-item="${esc(it.id)}">
                  ${atlasIconHtml(it.ic, 34)}
                  <div style="min-width:0;flex:1;">
                    <div style="font-size:11.5px;font-weight:700;color:${rCol};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(it.n.th)}</div>
                    <div style="font-size:10px;color:#94a3b8;">Lv.${it.lv || 1}${it.wt ? ` · ${it.wt}` : ''}${it.atk ? ` · ATK ${it.atk}` : ''}${it.el ? ` · ${E.ELEMENT_INFO[it.el].th}` : ''}</div>
                  </div>
                </button>
              `;
            }).join('')}
          </div>
        `;

        if (cur && curItem) {
          document.getElementById('ncsim-eq-unequip').onclick = () => { b.equip[slot] = null; persistBuilds(); recomputeAll(false); close(); };
          document.getElementById('ncsim-eq-apply').onclick = () => { b.equip[slot] = cur; persistBuilds(); recomputeAll(false); close(); };
          document.getElementById('ncsim-eq-ref').oninput = (ev) => { cur.ref = Number(ev.target.value) || 0; draw(); };
          body.querySelectorAll('[data-eq-g]').forEach(btn => { btn.onclick = () => { cur.g = Number(btn.dataset.eqG); draw(); }; });
          const addBtn = document.getElementById('ncsim-opt-add');
          if (addBtn) addBtn.onclick = () => { cur.rows = cur.rows || []; cur.rows.push({ k: slot === 'weapon' ? 'atk' : 'hpPct', v: 4, tier: 2 }); draw(); };
          body.querySelectorAll('[data-opt-k]').forEach(sel => {
            sel.onchange = () => {
              const ri = Number(sel.dataset.optK);
              const nk = sel.value;
              const def = E.GEAROPT[nk];
              cur.rows[ri] = { k: nk, v: def.tiers ? def.tiers[2][1] : 4, tier: 2, sub: def.subs ? def.subs[0] : undefined };
              draw();
            };
          });
          body.querySelectorAll('[data-opt-sub]').forEach(sel => { sel.onchange = () => { cur.rows[Number(sel.dataset.optSub)].sub = sel.value; }; });
          body.querySelectorAll('[data-opt-v]').forEach(inp => { inp.onchange = () => { cur.rows[Number(inp.dataset.optV)].v = Number(inp.value) || 0; }; });
          body.querySelectorAll('[data-opt-del]').forEach(btn => { btn.onclick = () => { cur.rows.splice(Number(btn.dataset.optDel), 1); draw(); }; });
        }
        document.getElementById('ncsim-eq-q').oninput = (ev) => { searchQ = ev.target.value; draw(); };
        document.getElementById('ncsim-eq-rar').onchange = (ev) => { rarityF = ev.target.value; draw(); };
        const jw = document.getElementById('ncsim-eq-jobw');
        if (jw) jw.onchange = (ev) => { onlyJobW = ev.target.checked; draw(); };
        body.querySelectorAll('[data-pick-item]').forEach(btn => {
          btn.onclick = () => {
            const picked = { id: btn.dataset.pickItem, ref: cur ? cur.ref : 5, g: cur ? cur.g : 2, rows: cur ? cur.rows : [] };
            b.equip[slot] = picked;
            persistBuilds();
            recomputeAll(false);
            close();
          };
        });
      };
      draw();
    });
  }

  function openSetPickerModal() {
    const b = state.build;
    const sets = (idx.wiki.equip.sets || []).slice().sort((a, z) => (z.lv || 0) - (a.lv || 0));
    showModal('👕 เลือกสวมใส่ชุดเซ็ต 3 ชิ้นทันที (เสื้อ + กางเกง + ประดับ 1)', `
      <input type="text" class="ncsim-input" id="ncsim-set-q" placeholder="🔍 ค้นหาชื่อเซ็ต / เอฟเฟกต์..." style="width:100%;">
      <div class="ncsim-pick-grid" id="ncsim-set-list"></div>
    `, (body, close) => {
      const draw = (q = '') => {
        const low = q.toLowerCase();
        const filtered = sets.filter(s => !low || (s.n && ((s.n.th || '').toLowerCase().includes(low) || (s.n.en || '').toLowerCase().includes(low))) || (s.pas && (s.pas.th || '').toLowerCase().includes(low)));
        document.getElementById('ncsim-set-list').innerHTML = filtered.map(s => `
          <button type="button" class="ncsim-pick-item" data-pick-set="${esc(s.id)}" style="flex-direction:column;align-items:flex-start;gap:4px;">
            <div style="display:flex;justify-content:space-between;width:100%;">
              <b style="font-size:12px;color:#fde68a;">${esc(s.n.th)}</b>
              <span class="ncsim-tag">Lv.${s.lv}</span>
            </div>
            <div style="font-size:10px;color:#93c5fd;">3pc: ${esc(s.b3 && s.b3.th)}</div>
            <div style="font-size:10px;color:#86efac;">✨ ${esc(s.pas && s.pas.th)}</div>
          </button>
        `).join('');
        body.querySelectorAll('[data-pick-set]').forEach(btn => {
          btn.onclick = () => {
            const st = idx.setsById[btn.dataset.pickSet];
            if (!st) return;
            for (const pid of st.pcs) {
              const it = idx.itemsById[pid];
              if (!it) continue;
              if (it.s === 'top') b.equip.top = { id: pid, ref: 6, g: 2, rows: [] };
              else if (it.s === 'pants') b.equip.pants = { id: pid, ref: 6, g: 2, rows: [] };
              else if (it.s === 'acc') b.equip.acc1 = { id: pid, ref: 6, g: 2, rows: [] };
            }
            persistBuilds(); recomputeAll(false); close();
            toast(`👕 สวมใส่เซ็ต "${st.n.th}" ครบ 3 ชิ้นแล้ว!`);
          };
        });
      };
      draw();
      document.getElementById('ncsim-set-q').oninput = (ev) => draw(ev.target.value);
    });
  }

  function openRunePickerModal(skillId, slotIdx) {
    const b = state.build;
    const isBasic = skillId === '__basic__';
    const sk = !isBasic ? idx.skillsById[skillId] : null;
    const cur = isBasic ? b.basicRunes[slotIdx] : ((b.runes[skillId] || [])[slotIdx] || null);
    let tier = (cur && cur.tier) || 2;
    let rollPct = Math.round(((cur && cur.qb) || 0.1) * 100);

    const eligible = isBasic
      ? (idx.wiki.runes || []).filter(r => r.kind === 'proc' || r.kind === 'pierce' || r.kind === 'gun')
      : (idx.wiki.runes || []).filter(r => !sk || !sk.fit || sk.fit.includes(r.k));

    showModal(`💠 ใส่รูน · ${isBasic ? 'ตีปกติ (Basic)' : esc(sk.n.th)} ช่อง ${slotIdx + 1}`, `
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;background:rgba(16,12,30,0.9);padding:9px;border-radius:10px;border:1px solid rgba(192,132,252,0.35);">
        <div style="display:flex;gap:4px;align-items:center;">
          <span style="font-size:11px;color:#e9d5ff;">ระดับรูน:</span>
          ${[1, 2, 3].map(t => `<button type="button" class="ncsim-btn ncsim-btn-sm ${tier === t ? 'active' : ''}" data-rt="${t}">Tier ${t}</button>`).join('')}
        </div>
        <label style="display:flex;align-items:center;gap:6px;font-size:11px;color:#e9d5ff;flex:1;">
          <span>คุณภาพ Roll:</span>
          <input type="range" min="-25" max="25" value="${rollPct}" id="ncsim-r-roll" style="flex:1;accent-color:#a855f7;">
          <b id="ncsim-r-roll-v" style="width:42px;color:#fde68a;">${rollPct >= 0 ? '+' : ''}${rollPct}%</b>
        </label>
        ${cur ? `<button type="button" class="ncsim-btn ncsim-btn-sm ncsim-btn-danger" id="ncsim-r-clear">ถอดรูน</button>` : ''}
      </div>
      <div class="ncsim-pick-grid" id="ncsim-rune-grid"></div>
    `, (body, close) => {
      const drawGrid = () => {
        document.getElementById('ncsim-rune-grid').innerHTML = eligible.map(r => `
          <button type="button" class="ncsim-pick-item" data-pick-rune="${esc(r.k)}">
            ${r.ic && r.ic[tier - 1] ? atlasIconHtml(r.ic[tier - 1], 32) : '💠'}
            <div style="min-width:0;flex:1;">
              <div style="font-size:11.5px;font-weight:800;color:#e9d5ff;">${esc(r.n.th)} <span style="color:#fde68a;">T${tier}</span></div>
              <div style="font-size:10px;color:#94a3b8;">${esc(r.t && r.t[tier - 1] && r.t[tier - 1].th)}</div>
            </div>
          </button>
        `).join('');
        body.querySelectorAll('[data-pick-rune]').forEach(btn => {
          btn.onclick = () => {
            const obj = { k: btn.dataset.pickRune, tier, qb: rollPct / 100, qd: rollPct / 100 };
            if (isBasic) b.basicRunes[slotIdx] = obj;
            else {
              if (!b.runes[skillId]) b.runes[skillId] = [null, null];
              b.runes[skillId][slotIdx] = obj;
            }
            persistBuilds(); recomputeAll(false); close();
          };
        });
      };
      drawGrid();
      body.querySelectorAll('[data-rt]').forEach(btn => {
        btn.onclick = () => {
          tier = Number(btn.dataset.rt);
          body.querySelectorAll('[data-rt]').forEach(x => x.classList.toggle('active', Number(x.dataset.rt) === tier));
          drawGrid();
        };
      });
      document.getElementById('ncsim-r-roll').oninput = (ev) => {
        rollPct = Number(ev.target.value) || 0;
        document.getElementById('ncsim-r-roll-v').textContent = `${rollPct >= 0 ? '+' : ''}${rollPct}%`;
      };
      const clr = document.getElementById('ncsim-r-clear');
      if (clr) clr.onclick = () => {
        if (isBasic) b.basicRunes[slotIdx] = null;
        else if (b.runes[skillId]) b.runes[skillId][slotIdx] = null;
        persistBuilds(); recomputeAll(false); close();
      };
    });
  }

  function openCardPickerModal(role, slotIdx) {
    const b = state.build;
    const cur = b.cards[role][slotIdx];
    let lv = (cur && cur.lv) || 5;
    let q = '';

    showModal(`🃏 เลือกการ์ดมอนสเตอร์ (${role === 'pas' ? 'Passive' : 'Active'} ช่อง ${slotIdx + 1})`, `
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <input type="text" class="ncsim-input" id="ncsim-c-q" placeholder="🔍 ค้นหาชื่อมอน / เอฟเฟกต์ / ธาตุ..." style="flex:1;">
        <label style="display:flex;align-items:center;gap:5px;font-size:11px;color:#fde68a;">
          <span>Card Lv:</span>
          <input type="range" min="1" max="10" value="${lv}" id="ncsim-c-lv" style="width:90px;accent-color:#a855f7;">
          <b id="ncsim-c-lv-v">Lv.${lv}</b>
        </label>
        ${cur ? `<button type="button" class="ncsim-btn ncsim-btn-sm ncsim-btn-danger" id="ncsim-c-clear">ถอดการ์ด</button>` : ''}
      </div>
      <div class="ncsim-pick-grid" id="ncsim-card-grid"></div>
    `, (body, close) => {
      const otherRole = role === 'pas' ? 'act' : 'pas';
      const blocked = new Set((b.cards[otherRole] || []).filter(Boolean).map(x => x.id));
      const draw = () => {
        const low = q.toLowerCase();
        const list = (idx.wiki.cards || []).filter(c => {
          if (blocked.has(c.id)) return false;
          if (!low) return true;
          const effStr = (c.eff || []).map(e => (e.txt && e.txt[0] && (e.txt[0].th + ' ' + e.txt[0].en)) || '').join(' ').toLowerCase();
          return c.id.toLowerCase().includes(low) || (c.mon && (c.mon.th + ' ' + c.mon.en).toLowerCase().includes(low)) || (c.art && c.art.th.toLowerCase().includes(low)) || effStr.includes(low);
        });
        document.getElementById('ncsim-card-grid').innerHTML = list.slice(0, 120).map(c => {
          const effTxt = (c.eff || []).map(e => (e.txt && e.txt[0] && e.txt[0].th) || '').filter(Boolean).join(' · ');
          return `
            <button type="button" class="ncsim-pick-item" data-pick-card="${esc(c.id)}">
              ${monThumbHtml(idx.monsById[c.id] || c, 36)}
              <div style="min-width:0;flex:1;">
                <div style="font-size:11.5px;font-weight:800;color:#f3e8ff;">${esc(c.mon.th)} <span style="color:#94a3b8;font-size:10px;">Lv.${c.lv}</span></div>
                <div style="font-size:10px;color:#c084fc;">${role === 'act' ? `⚡ ${esc(c.art.th)} (CD ${c.cd}s)` : esc(effTxt)}</div>
              </div>
            </button>
          `;
        }).join('');
        body.querySelectorAll('[data-pick-card]').forEach(btn => {
          btn.onclick = () => {
            b.cards[role][slotIdx] = { id: btn.dataset.pickCard, lv };
            persistBuilds(); recomputeAll(false); close();
          };
        });
      };
      draw();
      document.getElementById('ncsim-c-q').oninput = (ev) => { q = ev.target.value; draw(); };
      document.getElementById('ncsim-c-lv').oninput = (ev) => { lv = Number(ev.target.value) || 1; document.getElementById('ncsim-c-lv-v').textContent = `Lv.${lv}`; };
      const clr = document.getElementById('ncsim-c-clear');
      if (clr) clr.onclick = () => { b.cards[role][slotIdx] = null; persistBuilds(); recomputeAll(false); close(); };
    });
  }

  // 1-CLICK LIVE CHARACTER IMPORT (Works on currently running Manager with ZERO restart!)
  async function openLiveImportModal() {
    showModal('📥 ดึงข้อมูลตัวละครจริงจากจอเกม (Live Import)', `<div style="padding:18px;text-align:center;color:#94a3b8;">⏳ กำลังตรวจสอบจอเกมที่เปิดอยู่...</div>`, async (body, close) => {
      try {
        const res = await fetch('/api/profiles');
        const raw = await res.json();
        const profiles = (Array.isArray(raw) ? raw : (raw.profiles || [])).filter(p => p && p.isRunning && p.debugPort);
        if (!profiles.length) {
          body.innerHTML = `<div style="padding:18px;text-align:center;color:#fca5a5;">ไม่พบจอเกมที่กำลังเปิดอยู่ (เปิดจอเกมในแท็บรายชื่อจอก่อนแล้วค่อยกดดึง)</div>`;
          return;
        }
        body.innerHTML = `
          <div style="font-size:11.5px;color:#cbd5e1;">เลือกจอที่ต้องการดึง <b>เลเวล + อาชีพ + สเตตัส + ของสวมใส่ (ตีบวก/เกรด/ออฟชัน) + รูนทุกสกิล + การ์ดมอน</b> เข้ามาจำลองทันที:</div>
          <div class="ncsim-pick-grid">
            ${profiles.map(p => {
              const ls = p.liveState || {};
              const cname = ls.charName || p.charName || p.lastCharName || p.name;
              const jname = ls.charClass || p.lastCharClass || p.charClass || '';
              const lv = ls.baseLv || '?';
              return `
                <button type="button" class="ncsim-pick-item" data-imp-pid="${esc(p.id)}" data-imp-pname="${esc(p.name)}" data-imp-port="${esc(p.debugPort)}">
                  <span style="font-size:22px;">🎮</span>
                  <div style="min-width:0;flex:1;">
                    <div style="font-size:12px;font-weight:800;color:#fde68a;">${esc(p.name)} · ${esc(cname)}</div>
                    <div style="font-size:10.5px;color:#93c5fd;">${esc(jname)} · Lv.${lv}</div>
                  </div>
                </button>
              `;
            }).join('')}
          </div>
        `;
        body.querySelectorAll('[data-imp-pid]').forEach(btn => {
          btn.onclick = async () => {
            btn.disabled = true;
            btn.style.opacity = '0.6';
            try {
              const pid = btn.dataset.impPid;
              const dport = btn.dataset.impPort;
              let imported = null;
              // 1. Try Manager /api/sim/import-live/:id first
              const simRes = await fetch(`/api/sim/import-live/${encodeURIComponent(pid)}`, { method: 'POST' }).catch(() => null);
              if (simRes && simRes.ok) {
                const sj = await simRes.json();
                if (sj && sj.ok && sj.build) imported = E.normalizeBuild(idx, sj.build);
              }
              // 2. Zero-downtime direct local debugPort fallback (works immediately without Manager restart!)
              if (!imported && dport) {
                const evRes = await fetch(`http://127.0.0.1:${encodeURIComponent(dport)}/api/eval`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ code: E.LIVE_IMPORT_EVAL_SNIPPET, timeoutMs: 7000 }),
                });
                const j = await evRes.json();
                if (!j || j.success === false || !j.result || j.result.error) {
                  throw new Error((j && (j.error || (j.result && j.result.error))) || 'ดึงข้อมูลจากจอเกมไม่สำเร็จ');
                }
                imported = E.importLiveCharacterToBuild(idx, j.result, { id: pid, name: btn.dataset.impPname });
              }
              if (!imported) throw new Error('ไม่สามารถเชื่อมต่อจอเกมได้');
              state.build = imported;
              persistBuilds();
              recomputeAll(true);
              close();
              toast(`📥 นำเข้า "${imported.name}" พร้อมของ/รูน/การ์ดครบชุดแล้ว!`);
            } catch (err) {
              btn.disabled = false; btn.style.opacity = '1';
              toast('❌ ' + err.message, 'err');
            }
          };
        });
      } catch (err) {
        body.innerHTML = `<div style="color:#fca5a5;">❌ โหลดรายชื่อจอไม่สำเร็จ: ${esc(err.message)}</div>`;
      }
    });
  }

  function openOptimizeModal() {
    const b = state.build;
    const t = getActiveTarget();
    showModal(`🏆 Auto-Optimize Build vs ${esc(t.name)}`, `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
        <label style="font-size:11px;color:#fde68a;">ระดับตีบวกเป้าหมาย<input type="number" id="ncsim-opt-ref" min="0" max="10" value="7" class="ncsim-input" style="width:100%;margin-top:3px;"></label>
        <label style="font-size:11px;color:#fde68a;">เกรดไอเทม (G0–G5)<input type="number" id="ncsim-opt-g" min="0" max="5" value="3" class="ncsim-input" style="width:100%;margin-top:3px;"></label>
        <label style="font-size:11px;color:#fde68a;">ระดับรูน (T1–T3)<input type="number" id="ncsim-opt-rt" min="1" max="3" value="2" class="ncsim-input" style="width:100%;margin-top:3px;"></label>
      </div>
      <div style="display:flex;justify-content:flex-end;">
        <button type="button" class="ncsim-btn ncsim-btn-gold" id="ncsim-opt-run">⚡ คำนวณจัดของที่แรงที่สุด</button>
      </div>
      <div id="ncsim-opt-out"></div>
    `, (body, close) => {
      document.getElementById('ncsim-opt-run').onclick = () => {
        const out = document.getElementById('ncsim-opt-out');
        out.innerHTML = `<div style="color:#fde68a;font-size:12px;">⏳ กำลังค้นหาอาวุธ ชุดเซ็ต หมวก โล่ ประดับ รูน และการ์ดที่ DPS สูงสุด...</div>`;
        setTimeout(() => {
          const res = E.optimizeBuild(idx, {
            build: b,
            targetId: state.targetCat === 'dummy' ? state.customDummy : state.targetId,
            refine: Number(document.getElementById('ncsim-opt-ref').value) || 7,
            grade: Number(document.getElementById('ncsim-opt-g').value) || 3,
            runeTier: Number(document.getElementById('ncsim-opt-rt').value) || 2,
            night: state.env.night,
            targetCount: state.env.targetCount,
          });
          out.innerHTML = `
            <div style="background:rgba(16,185,129,0.12);border:1px solid rgba(52,211,153,0.45);border-radius:10px;padding:10px;display:flex;flex-direction:column;gap:7px;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <b style="color:#6ee7b7;font-size:13px;">DPS: ${res.before.dps.toLocaleString()} → ${res.after.dps.toLocaleString()} (+${res.dpsGainPct}%)</b>
                <button type="button" class="ncsim-btn ncsim-btn-emerald" id="ncsim-opt-apply">✓ ใช้งานบิลด์นี้ทันที</button>
              </div>
              <div style="display:flex;flex-direction:column;gap:3px;font-size:11px;">
                ${res.upgrades.map(u => `<div>• <span style="color:#94a3b8;">${esc(u.slot)}:</span> <b style="color:#fde68a;">${esc(u.name)}</b> <span style="color:#4ade80;">(${u.dpsAfter.toLocaleString()} DPS)</span></div>`).join('')}
              </div>
            </div>
          `;
          document.getElementById('ncsim-opt-apply').onclick = () => {
            if (!state.baselineA) state.baselineA = JSON.parse(JSON.stringify(state.build));
            state.build = res.optimizedBuild;
            persistBuilds();
            recomputeAll(true);
            close();
            toast(`🏆 อัปเดตเป็นบิลด์ Optimized แล้ว (+${res.dpsGainPct}% DPS)!`);
          };
        }, 30);
      };
    });
  }

  function openExportPlanModal() {
    const plan = E.exportBuildToPlanGear(idx, state.build, { planName: `🧪 Sim: ${state.build.name}` });
    showModal('📤 ส่งออกบิลด์เป็น Manager Profile Plan / Set Gear', `
      <div style="font-size:11.5px;color:#cbd5e1;">ส่งออกรายการอุปกรณ์ (ข้ามแว่นตา/ผ้าคลุมตามกติกา Set Gear), รูนสกิล, รูนตีปกติ และการ์ดมอนสเตอร์ (แยก Passive/Active ไม่ซ้ำกัน) รวม <b>${plan.gearSteps.length} ขั้นตอน</b>:</div>
      <div style="display:flex;gap:6px;">
        <input type="text" class="ncsim-input" id="ncsim-exp-name" value="${esc(plan.name)}" style="flex:1;">
        <button type="button" class="ncsim-btn ncsim-btn-emerald" id="ncsim-exp-save">💾 สร้าง Plan ใหม่ใน Manager</button>
        <button type="button" class="ncsim-btn" id="ncsim-exp-copy">📋 คัดลอก JSON</button>
      </div>
      <div class="ncsim-code" style="max-height:300px;">${esc(JSON.stringify(plan, null, 2))}</div>
    `, (body, close) => {
      document.getElementById('ncsim-exp-copy').onclick = () => {
        navigator.clipboard.writeText(JSON.stringify(plan, null, 2));
        toast('📋 คัดลอก Plan JSON ลงคลิปบอร์ดแล้ว');
      };
      document.getElementById('ncsim-exp-save').onclick = async () => {
        const name = document.getElementById('ncsim-exp-name').value.trim() || plan.name;
        try {
          const r = await fetch('/api/plan-profiles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name,
              description: `สร้างจาก Build Simulate (${state.build.job} Lv.${state.build.lv})`,
              plan: {
                targetClass: state.build.job,
                statPlan: state.build.base,
                skillPlan: state.build.skills,
                gearPlan: { enabled: true, steps: plan.gearSteps },
                cards: plan.cards,
                meta: plan.meta,
              },
            }),
          });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          close();
          toast(`📤 สร้าง Profile Plan "${name}" ใน Manager สำเร็จ!`);
        } catch (err) {
          toast('❌ ส่งออก Plan ไม่สำเร็จ: ' + err.message, 'err');
        }
      };
    });
  }

  function openMcpModal() {
    const mcpCfg = JSON.stringify({
      mcpServers: {
        'nightcamp-build-sim': {
          command: 'node',
          args: ['D:\\MyProject\\Nightcamp\\mcp\\build-sim-mcp.js'],
          env: { NC_MANAGER_URL: 'http://127.0.0.1:3891' },
        },
      },
    }, null, 2);

    const tools = [
      ['nc_wiki_search', 'ค้นหา มอนสเตอร์/บอส/ไอเทม/เซ็ต/สกิล/รูน/การ์ด/อาชีพ ทั้งหมดจาก Wiki'],
      ['nc_wiki_get_entity', 'ดึงข้อมูลละเอียดเต็มรูปแบบของบอส ไอเทม สกิล รูน หรือการ์ด'],
      ['nc_sim_calc_stats', 'คำนวณสเตตัสเต็มของบิลด์ (ATK/MATK/HP/CRIT/ASPD/EHP/Set/Card)'],
      ['nc_sim_fight', 'จำลองการสู้บอสตัวไหนก็ได้ (ทั้ง 52 บอส / 482 มอน) รายงาน DPS, TTK, Breakdown'],
      ['nc_sim_compare_builds', 'เปรียบเทียบ Build A vs Build B แบบละเอียด'],
      ['nc_sim_optimize_build', 'ให้ AI Auto-Optimize อาวุธ เซ็ต รูน และการ์ด เพื่อ DPS สูงสุด'],
      ['nc_sim_list_live_characters', 'ดูรายชื่อตัวละครจริงที่เปิดอยู่ใน Manager ตอนนี้'],
      ['nc_sim_import_live_character', 'ดึงบิลด์ตัวละครจริงจากจอเกมมาวิเคราะห์และปรับปรุงให้เก่งขึ้น'],
      ['nc_sim_push_to_ui', 'ส่งบิลด์ที่ AI ออกแบบขึ้นหน้าจอ Build Simulate ทันที'],
      ['nc_sim_save_build', 'บันทึกบิลด์ลงคลัง Build Simulate'],
      ['nc_sim_export_plan', 'แปลงบิลด์เป็น Manager Profile Plan / Set Gear พร้อมให้บอททำตาม'],
    ];

    showModal('🤖 เชื่อมต่อ MCP Server ให้ AI ช่วยออกแบบ Build (อิงฐานข้อมูล Wiki 100%)', `
      <div style="font-size:12px;color:#cbd5e1;">
        คัดลอกการตั้งค่าด้านล่างไปวางใน <b>Antigravity / Claude Desktop / Cursor MCP Config</b> เพื่อให้ AI เข้าถึงฐานข้อมูล Wiki Night Camp SS2, จำลองดาเมจกับบอสทุกตัว, ดึงตัวละครจริงมาวิเคราะห์ และส่งบิลด์กลับมาแสดงบนหน้านี้ได้ทันที:
      </div>
      <div style="position:relative;">
        <div class="ncsim-code">${esc(mcpCfg)}</div>
        <button type="button" class="ncsim-btn ncsim-btn-gold ncsim-btn-sm" id="ncsim-mcp-copy" style="position:absolute;top:8px;right:8px;">📋 คัดลอก Config</button>
      </div>
      <div style="font-size:11.5px;font-weight:800;color:#fde68a;">🛠️ เครื่องมือ MCP ที่ AI ใช้งานได้ (11 Tools):</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;max-height:220px;overflow-y:auto;">
        ${tools.map(([n, d]) => `
          <div style="background:rgba(14,12,26,0.9);border:1px solid rgba(139,92,246,0.28);border-radius:8px;padding:6px 8px;">
            <div style="font-family:monospace;font-size:11px;font-weight:800;color:#c4b5fd;">${esc(n)}</div>
            <div style="font-size:10px;color:#94a3b8;margin-top:2px;">${esc(d)}</div>
          </div>
        `).join('')}
      </div>
    `, () => {
      document.getElementById('ncsim-mcp-copy').onclick = () => {
        navigator.clipboard.writeText(mcpCfg);
        toast('📋 คัดลอก MCP Config เรียบร้อย!');
      };
    });
  }

  root.NCBuildSim = {
    onTabShown() {
      ensureInit().then(ok => {
        if (ok && arena) {
          setTimeout(() => arena.resize(), 40);
          pollMcpUiPush();
        }
      });
    },
    getState() { return state; },
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
