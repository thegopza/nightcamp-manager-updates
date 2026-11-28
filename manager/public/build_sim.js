/* Nightcamp SS2 Build Simulator — Full-Screen Playable Game HUD & Floating RPG Windows
 * Matches Nightcamp's actual in-game layout:
 *   - 100% Full-Screen Playable 2.5D World (WASD / Click-to-Move / Shift-Dash / Aimed Skills)
 *   - Top-Left: Nightcamp Character Plate (Avatar, HP/SP, Buff Strip, Saved Build Switcher)
 *   - Top-Center: Live Boss HP + Damage Trail + Armor Break Bar
 *   - Top-Right: Nightcamp Square Icon Menu (C/I/K/B/M/U/Tab/Import/MCP) + Live Minimap
 *   - Bottom-Center: Authentic Nightcamp Hotbar (Q E R F 3 4 5 6 + Cards 7 8) + Cast Bar + Live DPS
 *   - Bottom-Right: AUTO ON/OFF (Z) + Shift Dash + Space Attack Circular Buttons
 *   - Floating Draggable RPG Windows (C/I/K/B/M/U/Tab) + 1-Click Live Import & Plan Export & MCP
 */
(function (root) {
  'use strict';

  const WIKI_CDN = 'https://play.nightcamp.app/wiki';
  const LS_BUILDS_KEY = 'nc.buildSim.builds.v1';
  const LS_ACTIVE_KEY = 'nc.buildSim.activeId.v1';
  const HB_KEYS = ['q', 'e', 'r', 'f', '3', '4', '5', '6'];

  let E = null;
  let idx = null;
  let arena = null;
  let initialized = false;
  let loadingPromise = null;

  const state = {
    builds: [],
    activeId: null,
    build: null,
    stats: null,
    baselineA: null,
    lastInstantSim: null,
    liveHud: null,
    openWin: null,         // null | 'status' | 'equip' | 'skills' | 'cards' | 'boss' | 'buffs' | 'dps'
    winPos: null,          // { left, top } when dragged
    dpsOverlayCollapsed: false,
    targetCat: 'dummy',
    targetId: 'ant_queen',
    targetSearch: '',
    customDummy: { custom: true, isDummy: true, name: 'หุ่นไล่กาฝึกซ้อม (Dummy)', lv: 60, hp: 10000000, def: 0, mdef: 0, el: 'neutral', race: 'formless', boss: true, armBar: 120 },
    env: { night: true, mode: 's2', targetCount: 1, theme: 'poison', bossAttacks: true, godMode: false },
    modal: null,
    keysBound: false,
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
    const file = atlasName === 'h128' ? 'hats128' : atlasName;
    const cols = spec.cols || 1;
    const rows = Math.ceil((spec.n || 1) / cols);
    const col = cellIdx % cols;
    const row = Math.floor(cellIdx / cols);
    const v = idx.meta.atlasV ? `?v=${idx.meta.atlasV}` : '';
    const url = `${WIKI_CDN}/data/wiki_${file}.webp${v}`;
    return `<span class="ncsim-ic ${extraClass}" style="width:${size}px;height:${size}px;background-image:url('${url}');background-size:${cols * size}px ${rows * size}px;background-position:-${col * size}px -${row * size}px;"></span>`;
  }

  function monThumbHtml(mon, size = 36) {
    if (!mon) return '';
    const v = idx && idx.meta && idx.meta.atlasV ? `?v=${idx.meta.atlasV}` : '';
    if (mon.img) return `<img src="${WIKI_CDN}/assets/m/${encodeURIComponent(mon.img)}.webp${v}" style="width:${size}px;height:${size}px;object-fit:contain;" loading="lazy">`;
    if (mon.ic) return atlasIconHtml(mon.ic, size);
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
  // PERSISTENCE & MCP SYNC
  // =========================================================================
  function loadSavedBuilds() {
    let list = [];
    try {
      const raw = localStorage.getItem(LS_BUILDS_KEY);
      if (raw) list = JSON.parse(raw);
    } catch {}
    if (!Array.isArray(list) || !list.length) {
      list = [
        E.createDefaultBuild(idx, 'puppeteer', { id: 'preset_puppeteer_60', name: 'นักเชิดหุ่น Lv.60', lv: 60, jobLv: 35 }),
        E.createDefaultBuild(idx, 'archmage', { id: 'preset_archmage_60', name: 'อาร์คเมจ Lv.60', lv: 60, jobLv: 35 }),
        E.createDefaultBuild(idx, 'paladin', { id: 'preset_paladin_60', name: 'พาลาดิน Lv.60', lv: 60, jobLv: 35 }),
        E.createDefaultBuild(idx, 'lightkeeper', { id: 'preset_lk_60', name: 'ผู้จุดตะเกียง Lv.60', lv: 60, jobLv: 35 }),
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
    fetch('/api/sim/builds', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
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
        toast(`🤖 MCP AI ส่งบิลด์ "${state.build.name}" เข้าสู่สนามแล้ว!`);
      }
    } catch {}
  }

  // =========================================================================
  // INITIALIZATION & FULL-SCREEN GAME SHELL
  // =========================================================================
  async function ensureInit() {
    if (initialized) return true;
    if (loadingPromise) return loadingPromise;
    loadingPromise = (async () => {
      const mount = document.getElementById('ncsim-mount');
      if (!mount) return false;
      mount.innerHTML = `<div style="padding:60px;text-align:center;color:#fde68a;font-weight:800;font-size:15px;">⏳ กำลังเข้าสู่โลกจำลอง Night Camp SS2 (โหลดสไปรต์อาชีพ 46 · บอส 52 · มอน 482 · ไอเทม 2,130 · สกิล 214 · รูน 47 · การ์ด 338)...</div>`;
      E = window.NCSimEngine;
      if (!E) throw new Error('NCSimEngine not loaded');
      const resp = await fetch('/wiki/data.json');
      if (!resp.ok) throw new Error('Failed to load /wiki/data.json');
      const wiki = await resp.json();
      idx = E.createIndex(wiki);
      loadSavedBuilds();
      renderStageShell(mount);

      const canvas = document.getElementById('ncsim-canvas');
      const minimap = document.getElementById('ncsim-minimap');
      arena = new window.NCBuildSimArena(canvas, E, idx, onGameHudTick, minimap);
      window.addEventListener('resize', () => { if (arena && isTabActive()) arena.resize(); });
      bindGameKeyboard();
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
    if (window.__ncBuildSimStandalone) return true;
    const p = document.getElementById('buildsim-pane');
    return !!(p && p.classList.contains('active'));
  }

  function getActiveTarget() {
    return state.targetCat === 'dummy'
      ? E.resolveTarget(idx, state.customDummy)
      : E.resolveTarget(idx, state.targetId);
  }

  function recomputeAll(resetWorld = false) {
    if (!idx || !state.build) return;
    state.stats = E.calcBuildStats(idx, state.build, state.env);
    const target = getActiveTarget();
    state.lastInstantSim = E.simulateFight(idx, state.build, state.targetCat === 'dummy' ? state.customDummy : state.targetId, {
      durationSec: 30, night: state.env.night, mode: state.env.mode,
      targetCount: state.env.targetCount, bossAttacks: state.env.bossAttacks, godMode: state.env.godMode,
    });
    if (arena) arena.setState(state.build, state.stats, target, state.env, resetWorld);
    renderHudTopLeft();
    renderHudTopRight();
    renderHudHotbar();
    renderHudBottomRight();
    renderFloatingWindow();
  }

  function renderStageShell(mount) {
    mount.innerHTML = `
      <div class="ncsim-stage" id="ncsim-stage">
        <div id="ncsim-toast" style="display:none;position:fixed;bottom:22px;right:22px;z-index:130000;background:#161b30;color:#fef3c7;border:1.5px solid #fbbf24;padding:10px 16px;border-radius:11px;font-size:12.5px;font-weight:700;box-shadow:0 10px 30px rgba(0,0,0,0.65);"></div>

        <!-- 100% FULL-SCREEN PLAYABLE GAME CANVAS -->
        <canvas id="ncsim-canvas" class="ncsim-world-canvas"></canvas>

        <!-- TOP-LEFT: NIGHTCAMP CHARACTER PLATE + BUFF STRIP + SAVED BUILDS -->
        <div class="ncsim-hud-tl" id="ncsim-hud-tl"></div>

        <!-- TOP-CENTER: LIVE BOSS HP & ARMOR BREAK BAR -->
        <div class="ncsim-hud-boss" id="ncsim-hud-boss" title="คลิกเพื่อเปิดหน้าต่างเสกบอส / มอนสเตอร์ [M]"></div>

        <!-- TOP-RIGHT: NIGHTCAMP SQUARE MENU BAR + LIVE MINIMAP -->
        <div class="ncsim-hud-tr" id="ncsim-hud-tr"></div>

        <!-- BOTTOM-CENTER: CAST BAR + LIVE DPS PILL + NIGHTCAMP HOTBAR -->
        <div class="ncsim-hud-bc">
          <div class="ncsim-castbar" id="ncsim-castbar">
            <div class="ncsim-castbar-fill" id="ncsim-castbar-fill" style="width:0%;"></div>
            <div class="ncsim-castbar-txt" id="ncsim-castbar-txt"></div>
          </div>
          <div class="ncsim-live-pill-bar">
            <span>⏱ <b id="ncsim-t-sec" style="font-family:monospace;">0.0s</b></span>
            <span>🔥 DPS: <b id="ncsim-t-dps" style="color:#fde047;font-family:monospace;font-size:13px;">0</b></span>
            <span id="ncsim-t-sub" style="color:#94a3b8;font-size:10.5px;">5s: 0 · สูงสุด 0 · คริ 0%</span>
            <button type="button" class="ncsim-btn ncsim-btn-sm" id="ncsim-q-resetdps" style="padding:2px 7px;font-size:10px;" title="รีเซ็ตตัวเลข DPS โดยไม่ย้ายตัวละคร">🧹 รีเซ็ต DPS</button>
            <button type="button" class="ncsim-btn ncsim-btn-sm" id="ncsim-q-respawn" style="padding:2px 7px;font-size:10px;">🔄 เสกใหม่</button>
            <button type="button" class="ncsim-btn ncsim-btn-sm ncsim-btn-gold" id="ncsim-q-revive" style="display:none;padding:2px 8px;font-size:10px;">❤️ ฟื้นคืนชีพ</button>
          </div>
          <div class="ncsim-hotbar" id="ncsim-hotbar"></div>
          <div class="ncsim-hint-strip">WASD เดิน · คลิกพื้นเดิน · คลิกมอนตี · Shift/คลิกขวา แดช · Space ตี · Q E R F 3-6 สกิล · 7-8 การ์ด · Z Auto · C/I/K/B/M/U/Tab เมนู</div>
        </div>

        <!-- BOTTOM-RIGHT: AUTO ON/OFF + SHIFT DASH + SPACE ATTACK -->
        <div class="ncsim-hud-br" id="ncsim-hud-br"></div>

        <!-- FLOATING DRAGGABLE NIGHTCAMP RPG WINDOW -->
        <div id="ncsim-fwin-root"></div>
      </div>
      <div id="ncsim-modal-root"></div>
    `;

    document.getElementById('ncsim-hud-boss').onclick = () => toggleWindow('boss');
    document.getElementById('ncsim-q-resetdps').onclick = () => { if (arena && arena.resetDpsOnly) { arena.resetDpsOnly(); toast('🧹 รีเซ็ตตัวเลข DPS เรียบร้อย!'); } };
    document.getElementById('ncsim-q-respawn').onclick = () => { if (arena) { arena.resetCombat(); toast('🔄 เสกเป้าหมายใหม่เรียบร้อย!'); } };
    document.getElementById('ncsim-q-revive').onclick = () => {
      if (arena && state.stats) {
        arena.hero.dead = false;
        arena.hero.hp = arena.hero.maxHp;
        arena.hero.sp = arena.hero.maxSp;
        toast('❤️ ฟื้นคืนชีพเต็มหลอดแล้ว!');
      }
    };
  }

  // =========================================================================
  // 60 FPS LIGHTWEIGHT LIVE HUD UPDATER
  // =========================================================================
  function onGameHudTick(hud) {
    state.liveHud = hud;

    // Top-left HP / SP / Coins
    const hpFill = document.getElementById('ncsim-hp-fill');
    const hpTxt = document.getElementById('ncsim-hp-txt');
    const spFill = document.getElementById('ncsim-sp-fill');
    const spTxt = document.getElementById('ncsim-sp-txt');
    if (hpFill) hpFill.style.width = `${Math.max(0, Math.min(100, (hud.heroHp / Math.max(1, hud.heroMaxHp)) * 100))}%`;
    if (hpTxt) hpTxt.textContent = `${hud.heroHp.toLocaleString()} / ${hud.heroMaxHp.toLocaleString()}`;
    if (spFill) spFill.style.width = `${Math.max(0, Math.min(100, (hud.heroSp / Math.max(1, hud.heroMaxSp)) * 100))}%`;
    if (spTxt) spTxt.textContent = `${hud.heroSp.toLocaleString()} / ${hud.heroMaxSp.toLocaleString()}`;
    const coinEl = document.getElementById('ncsim-coins-val');
    if (coinEl) coinEl.textContent = hud.coinsCollected.toLocaleString();
    const coordEl = document.getElementById('ncsim-coords-txt');
    if (coordEl) coordEl.textContent = `(${hud.heroX}, ${hud.heroY}) · มอน ${hud.mobCount}`;

    // Revive button visibility
    const revBtn = document.getElementById('ncsim-q-revive');
    if (revBtn) revBtn.style.display = hud.heroDead ? 'inline-flex' : 'none';

    // Top-Center Boss HUD
    const bossEl = document.getElementById('ncsim-hud-boss');
    if (bossEl && hud.boss) {
      const b = hud.boss;
      const elI = E.ELEMENT_INFO[b.el] || E.ELEMENT_INFO.neutral;
      const hpPct = Math.max(0, Math.min(100, (b.hp / Math.max(1, b.maxHp)) * 100));
      const trPct = Math.max(0, Math.min(100, (b.hpTrail / Math.max(1, b.maxHp)) * 100));
      const armPct = b.breakLeft > 0 ? (b.breakLeft / 6) * 100 : (b.arm / Math.max(1, b.maxArm)) * 100;
      bossEl.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;">
          <b style="color:${hud.isDummyTarget ? '#fde68a' : (b.boss ? '#fde047' : '#f1f5f9')};">${hud.isDummyTarget ? '🌾 ' : (b.boss ? '👑 ' : '🎯 ')}${esc(b.name)} Lv.${b.lv}</b>
          <span style="font-size:10.5px;color:${elI.color};font-weight:700;">${esc(elI.th)} · DEF ${b.def} / MDEF ${b.mdef}${b.breakLeft > 0 ? ' · 💥 เกราะแตก!' : ''}</span>
        </div>
        <div class="ncsim-boss-hp-track">
          <div class="ncsim-boss-hp-trail" style="width:${trPct.toFixed(1)}%;"></div>
          <div class="ncsim-boss-hp-fill" style="width:${hpPct.toFixed(1)}%;"></div>
          <div class="ncsim-bar-txt">${b.hp.toLocaleString()} / ${b.maxHp.toLocaleString()} (${Math.round(hpPct)}%)</div>
        </div>
        <div class="ncsim-boss-arm-track">
          <div class="ncsim-boss-arm-fill" style="width:${armPct.toFixed(1)}%;background:${b.breakLeft > 0 ? '#fbbf24' : '#38bdf8'};"></div>
        </div>
      `;
    }

    // Cast bar
    const cb = document.getElementById('ncsim-castbar');
    if (cb) {
      if (hud.castName) {
        cb.style.display = 'block';
        document.getElementById('ncsim-castbar-fill').style.width = `${Math.round(hud.castFrac * 100)}%`;
        document.getElementById('ncsim-castbar-txt').textContent = hud.castName;
      } else cb.style.display = 'none';
    }

    // Bottom live DPS ticker
    const secEl = document.getElementById('ncsim-t-sec');
    if (secEl) secEl.textContent = `${hud.elapsedSec.toFixed(1)}s`;
    const dpsEl = document.getElementById('ncsim-t-dps');
    if (dpsEl) dpsEl.textContent = hud.avgDps.toLocaleString();
    const subEl = document.getElementById('ncsim-t-sub');
    if (subEl) subEl.textContent = `5s: ${hud.curDps.toLocaleString()} · สูงสุด ${(hud.peakDps || 0).toLocaleString()} · คริ ${(hud.critRatePct || 0).toFixed(0)}%`;

    // Live Floating DPS Meter Overlay (Right side below minimap)
    const dmAvg = document.getElementById('ncsim-dm-avg');
    if (dmAvg) dmAvg.textContent = hud.avgDps.toLocaleString();
    const dm5s = document.getElementById('ncsim-dm-5s');
    if (dm5s) dm5s.textContent = hud.curDps.toLocaleString();
    const dmPeak = document.getElementById('ncsim-dm-peak');
    if (dmPeak) dmPeak.textContent = (hud.peakDps || 0).toLocaleString();
    const dmMeta = document.getElementById('ncsim-dm-meta');
    if (dmMeta) dmMeta.textContent = `รวม ${(hud.totalDamage || 0).toLocaleString()} · แรงสุด ${(hud.maxHit || 0).toLocaleString()} · คริ ${(hud.critRatePct || 0).toFixed(1)}%`;
    const dmBars = document.getElementById('ncsim-dm-bars');
    if (dmBars) {
      const br = Array.isArray(hud.breakdown) ? hud.breakdown.slice(0, 5) : [];
      const totD = Math.max(1, hud.totalDamage || 0);
      if (br.length === 0) {
        dmBars.innerHTML = `<div style="font-size:10px;color:#64748b;text-align:center;padding:8px 0;">กด <b>Space</b> หรือ <b>Z (Auto)</b> ตีหุ่นเพื่อวัด DPS สด</div>`;
      } else {
        dmBars.innerHTML = br.map(r => {
          const pct = Math.min(100, (r.totalDmg / totD) * 100);
          const sdps = hud.elapsedSec > 0.2 ? Math.round(r.totalDmg / hud.elapsedSec) : r.totalDmg;
          const col = (E && E.ELEMENT_INFO && E.ELEMENT_INFO[r.el]) ? E.ELEMENT_INFO[r.el].color : '#fbbf24';
          return `<div class="ncsim-dps-bitem"><div class="ncsim-dps-bfill" style="width:${pct.toFixed(1)}%;background:${col};"></div><div class="ncsim-dps-btxt"><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:118px;">${esc(r.name)}</span><span style="font-family:monospace;color:#fde68a;">${sdps.toLocaleString()}/s (${pct.toFixed(0)}%)</span></div></div>`;
        }).join('');
      }
    }

    // Hotbar cooldown overlays
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
    const dashCdEl = document.getElementById('ncsim-dash-cd');
    if (dashCdEl) {
      if (hud.dashCd > 0.05) { dashCdEl.style.display = 'grid'; dashCdEl.textContent = hud.dashCd.toFixed(1); }
      else dashCdEl.style.display = 'none';
    }
  }

  // =========================================================================
  // HUD RENDERERS (TOP-LEFT, TOP-RIGHT, HOTBAR, BOTTOM-RIGHT)
  // =========================================================================
  function renderHudTopLeft() {
    const el = document.getElementById('ncsim-hud-tl');
    if (!el || !state.build || !state.stats) return;
    const b = state.build, st = state.stats;
    const job = idx.jobsById[b.job];

    const buffTags = [];
    for (const pid of (b.buffs.pots || [])) buffTags.push(E.BUFFPOTS[pid] ? E.BUFFPOTS[pid].name.replace(/\(.*\)/, '').trim() : pid);
    if (b.buffs.dish && idx.dishesById[b.buffs.dish]) buffTags.push(`🍲 ${idx.dishesById[b.buffs.dish].n.th}`);
    for (const pt of (b.buffs.party || [])) { const p = E.PARTY_BUFFS.find(x => x.id === pt); if (p) buffTags.push(p.name.split(' ')[0]); }
    for (const s of st.activeSets) buffTags.push(`✨ ${s.name}`);

    el.innerHTML = `
      <div class="ncsim-charplate" id="ncsim-plate-click" title="คลิกเพื่อเปิดหน้าต่างตัวละคร & เสกเลเวล [C]">
        <div class="ncsim-avatar-box">
          ${job ? atlasIconHtml(job.ic, 46) : '🧙'}
          <span class="ncsim-lv-pill">${b.lv}</span>
        </div>
        <div style="flex:1;min-width:165px;display:flex;flex-direction:column;gap:3px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <b style="font-size:12px;color:#fef3c7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:130px;">${esc(b.name)}</b>
            <span style="font-size:10px;color:#fde68a;">${esc(job ? job.n.th : b.job)}</span>
          </div>
          <div class="ncsim-bar-bg">
            <div class="ncsim-bar-hp" id="ncsim-hp-fill" style="width:100%;"></div>
            <div class="ncsim-bar-txt" id="ncsim-hp-txt">${st.maxHp.toLocaleString()} / ${st.maxHp.toLocaleString()}</div>
          </div>
          <div class="ncsim-bar-bg" style="height:11px;">
            <div class="ncsim-bar-sp" id="ncsim-sp-fill" style="width:100%;"></div>
            <div class="ncsim-bar-txt" id="ncsim-sp-txt" style="font-size:9px;">${st.maxSp.toLocaleString()} / ${st.maxSp.toLocaleString()}</div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:10px;color:#cbd5e1;">
            <span>Lv ${b.lv} | Job ${b.jobLv}</span>
            <span>🪙 <b id="ncsim-coins-val" style="color:#fde047;">0</b></span>
          </div>
        </div>
      </div>

      ${buffTags.length ? `<div class="ncsim-buff-strip">${buffTags.slice(0, 6).map(t => `<span class="ncsim-buff-ic">${esc(t)}</span>`).join('')}</div>` : ''}

      <!-- SAVED BUILDS / PARTY SWITCHER (Nightcamp Cream Card List) -->
      <div class="ncsim-build-dock">
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:10.5px;color:#fde68a;font-weight:800;padding:0 2px;">
          <span>📋 คลังบิลด์ (${state.builds.length})</span>
          <div style="display:flex;gap:3px;">
            <button type="button" class="ncsim-btn ncsim-btn-sm" id="ncsim-b-save" style="padding:1px 6px;font-size:10px;" title="บันทึกชื่อบิลด์">💾</button>
            <button type="button" class="ncsim-btn ncsim-btn-sm" id="ncsim-b-new" style="padding:1px 6px;font-size:10px;" title="สร้างบิลด์ใหม่">➕</button>
            <button type="button" class="ncsim-btn ncsim-btn-sm ${state.baselineA ? 'active' : ''}" id="ncsim-b-cmp" style="padding:1px 6px;font-size:10px;" title="ล็อกเป็น Build A เทียบ A vs B">⚖️</button>
          </div>
        </div>
        ${state.builds.slice(0, 5).map(item => {
          const jj = idx.jobsById[item.job];
          return `
            <div class="ncsim-build-row ${item.id === b.id ? 'active' : ''}" data-sw-build="${esc(item.id)}">
              ${jj ? atlasIconHtml(jj.ic, 22) : '🧙'}
              <span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(item.name)}</span>
              <span style="font-size:10px;color:#475569;">Lv ${item.lv}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;

    document.getElementById('ncsim-plate-click').onclick = () => toggleWindow('status');
    document.getElementById('ncsim-b-save').onclick = () => {
      const name = prompt('ตั้งชื่อบิลด์:', state.build.name);
      if (name === null) return;
      state.build.name = name.trim() || state.build.name;
      persistBuilds(); renderHudTopLeft();
      toast(`💾 บันทึก "${state.build.name}" แล้ว`);
    };
    document.getElementById('ncsim-b-new').onclick = () => {
      state.build = E.createDefaultBuild(idx, state.build.job, { id: 'build_' + Date.now().toString(36), lv: state.build.lv });
      persistBuilds(); recomputeAll(true);
      toast('➕ สร้างบิลด์ใหม่เรียบร้อย');
    };
    document.getElementById('ncsim-b-cmp').onclick = () => {
      if (state.baselineA) { state.baselineA = null; toast('ปิดโหมดเทียบ A vs B'); }
      else { state.baselineA = JSON.parse(JSON.stringify(state.build)); toast('📌 ล็อกบิลด์ปัจจุบันเป็น Build A แล้ว! กด Tab ดูผลเทียบ'); }
      renderHudTopLeft();
      if (state.openWin === 'dps') renderFloatingWindow();
    };
    el.querySelectorAll('[data-sw-build]').forEach(row => {
      row.onclick = () => {
        const found = state.builds.find(x => x.id === row.dataset.swBuild);
        if (found) { state.activeId = found.id; state.build = JSON.parse(JSON.stringify(found)); recomputeAll(true); }
      };
    });
  }

  function renderHudTopRight() {
    const el = document.getElementById('ncsim-hud-tr');
    if (!el) return;
    const menus = [
      ['status', '🧙', 'สเตตัส [C]'],
      ['equip', '⚔️', 'อุปกรณ์ [I]'],
      ['skills', '⚡', 'สกิล/รูน [K]'],
      ['cards', '🃏', 'การ์ด [B]'],
      ['boss', '👹', 'เสกบอส [M]'],
      ['buffs', '🧪', 'บัฟ [U]'],
      ['dps', '📊', 'DPS [Tab]'],
    ];
    const themes = Object.entries(window.NC_ARENA_THEMES || {})
      .map(([k, v]) => `<option value="${k}" ${state.env.theme === k ? 'selected' : ''}>🗺️ ${esc(v.name.split(' ')[0])}</option>`).join('');

    const isDummyNow = state.targetCat === 'dummy';
    el.innerHTML = `
      <div class="ncsim-menu-bar">
        ${menus.map(([k, ic, lb]) => `<button type="button" class="ncsim-mbtn ${state.openWin === k ? 'active' : ''}" data-open-win="${k}"><span class="ncsim-mbtn-ic">${ic}</span><span class="ncsim-mbtn-lb">${lb}</span></button>`).join('')}
        <button type="button" class="ncsim-mbtn ${isDummyNow ? 'active' : ''}" id="ncsim-m-dummy" title="เสกหุ่นไล่กาฝึกซ้อม (Training Dummy) ทดสอบ DPS ทันที"><span class="ncsim-mbtn-ic">🌾</span><span class="ncsim-mbtn-lb">หุ่นไล่กา</span></button>
        <button type="button" class="ncsim-mbtn gold" id="ncsim-m-import" title="ดึงตัวละครจากจอเกมจริง"><span class="ncsim-mbtn-ic">📥</span><span class="ncsim-mbtn-lb">จอจริง</span></button>
        <button type="button" class="ncsim-mbtn" id="ncsim-m-mcp" title="ตั้งค่าเชื่อมต่อ MCP AI"><span class="ncsim-mbtn-ic">🤖</span><span class="ncsim-mbtn-lb">MCP AI</span></button>
      </div>
      <div class="ncsim-minimap-box">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:4px;">
          <select class="ncsim-select" id="ncsim-map-sel" style="flex:1;padding:2px 5px;font-size:10.5px;">${themes}</select>
          <button type="button" class="ncsim-btn ncsim-btn-sm ${state.env.night ? 'active' : ''}" id="ncsim-mm-night" style="padding:2px 6px;" title="กลางวัน/กลางคืน">${state.env.night ? '🌙' : '☀️'}</button>
        </div>
        <canvas id="ncsim-minimap" class="ncsim-minimap-canvas" width="182" height="122"></canvas>
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#94a3b8;">
          <span id="ncsim-coords-txt">(950, 825)</span>
          <div style="display:flex;gap:3px;">
            <button type="button" class="ncsim-btn ncsim-btn-sm ${state.env.bossAttacks ? 'active' : ''}" id="ncsim-mm-batk" style="padding:1px 5px;font-size:10px;" title="ให้มอน/บอสเดินมาตี">⚔️</button>
            <button type="button" class="ncsim-btn ncsim-btn-sm ${state.env.godMode ? 'active' : ''}" id="ncsim-mm-god" style="padding:1px 5px;font-size:10px;" title="โหมดอมตะ">🛡️</button>
          </div>
        </div>
      </div>

      <!-- LIVE FLOATING DPS METER & SCARECROW DUMMY PRESETS -->
      <div class="ncsim-dps-panel" id="ncsim-dps-panel">
        <div class="ncsim-dps-head">
          <span>🔥 Live DPS Meter</span>
          <div style="display:flex;gap:3px;">
            <button type="button" class="ncsim-btn ncsim-btn-sm" id="ncsim-dm-rst" style="padding:1px 6px;font-size:9.5px;" title="รีเซ็ต DPS">🧹</button>
            <button type="button" class="ncsim-btn ncsim-btn-sm" id="ncsim-dm-tab" style="padding:1px 6px;font-size:9.5px;" title="เปิดหน้าวิเคราะห์เทียบ A/B [Tab]">📊</button>
            <button type="button" class="ncsim-btn ncsim-btn-sm" id="ncsim-dm-fold" style="padding:1px 6px;font-size:9.5px;" title="ย่อ/ขยาย">${state.dpsOverlayCollapsed ? '▼' : '▲'}</button>
          </div>
        </div>
        <div class="ncsim-dps-big-grid">
          <div class="ncsim-dps-cell"><div class="ncsim-dps-cell-lbl">เฉลี่ย/วิ</div><div class="ncsim-dps-cell-val" id="ncsim-dm-avg">0</div></div>
          <div class="ncsim-dps-cell"><div class="ncsim-dps-cell-lbl">5วิ ล่าสุด</div><div class="ncsim-dps-cell-val" id="ncsim-dm-5s" style="color:#4ade80;">0</div></div>
          <div class="ncsim-dps-cell"><div class="ncsim-dps-cell-lbl">สูงสุด</div><div class="ncsim-dps-cell-val" id="ncsim-dm-peak" style="color:#fb923c;">0</div></div>
        </div>
        ${state.dpsOverlayCollapsed ? '' : `
          <div class="ncsim-dps-meta" id="ncsim-dm-meta">รวม 0 · แรงสุด 0 · คริ 0.0%</div>
          <div class="ncsim-dps-bars" id="ncsim-dm-bars">
            <div style="font-size:10px;color:#64748b;text-align:center;padding:8px 0;">กด <b>Space</b> หรือ <b>Z (Auto)</b> ตีหุ่นเพื่อวัด DPS สด</div>
          </div>
          <div class="ncsim-dummy-presets">
            <button type="button" class="ncsim-btn ncsim-btn-sm ${isDummyNow && state.customDummy.def === 0 && state.env.targetCount === 1 ? 'active' : ''}" id="ncsim-dp-0">🌾 หุ่น 0 DEF</button>
            <button type="button" class="ncsim-btn ncsim-btn-sm ${isDummyNow && state.customDummy.def === 30 && state.env.targetCount === 1 ? 'active' : ''}" id="ncsim-dp-mid">🛡️ หุ่นบอสกลาง</button>
            <button type="button" class="ncsim-btn ncsim-btn-sm ${isDummyNow && state.customDummy.def === 65 && state.env.targetCount === 1 ? 'active' : ''}" id="ncsim-dp-hi">🏰 หุ่นบอสแข็ง</button>
            <button type="button" class="ncsim-btn ncsim-btn-sm ${isDummyNow && state.env.targetCount === 3 ? 'active' : ''}" id="ncsim-dp-aoe">🌾×3 ทดสอบ AoE</button>
          </div>
        `}
      </div>
    `;

    if (arena) arena.setMinimapCanvas(document.getElementById('ncsim-minimap'));

    const spawnDummyPreset = (name, def, mdef, count = 1) => {
      state.targetCat = 'dummy';
      state.customDummy = {
        custom: true, isDummy: true, name, lv: 60, hp: 10000000,
        def, mdef, el: 'neutral', race: 'formless', boss: true, armBar: 120
      };
      state.env.targetCount = count;
      recomputeAll(true);
      toast(`🌾 เสก ${name}${count > 1 ? ` ×${count}` : ''} (DEF ${def} / MDEF ${mdef}) ลงสนามแล้ว!`);
    };

    el.querySelectorAll('[data-open-win]').forEach(btn => { btn.onclick = () => toggleWindow(btn.dataset.openWin); });
    document.getElementById('ncsim-m-dummy').onclick = () => spawnDummyPreset('หุ่นไล่กาฝึกซ้อม (Dummy)', 0, 0, 1);
    document.getElementById('ncsim-m-import').onclick = openLiveImportModal;
    document.getElementById('ncsim-m-mcp').onclick = openMcpModal;
    document.getElementById('ncsim-map-sel').onchange = (ev) => { state.env.theme = ev.target.value; recomputeAll(false); };
    document.getElementById('ncsim-mm-night').onclick = () => { state.env.night = !state.env.night; recomputeAll(false); };
    document.getElementById('ncsim-mm-batk').onclick = () => { state.env.bossAttacks = !state.env.bossAttacks; recomputeAll(false); };
    document.getElementById('ncsim-mm-god').onclick = () => { state.env.godMode = !state.env.godMode; recomputeAll(false); };
    document.getElementById('ncsim-dm-rst').onclick = () => { if (arena && arena.resetDpsOnly) { arena.resetDpsOnly(); toast('🧹 รีเซ็ต DPS Meter แล้ว!'); } };
    document.getElementById('ncsim-dm-tab').onclick = () => toggleWindow('dps');
    document.getElementById('ncsim-dm-fold').onclick = () => { state.dpsOverlayCollapsed = !state.dpsOverlayCollapsed; renderHudTopRight(); };
    const dp0 = document.getElementById('ncsim-dp-0');
    if (dp0) dp0.onclick = () => spawnDummyPreset('หุ่นไล่กาฝึกซ้อม (0 DEF)', 0, 0, 1);
    const dpMid = document.getElementById('ncsim-dp-mid');
    if (dpMid) dpMid.onclick = () => spawnDummyPreset('หุ่นไล่กาบอสกลาง', 30, 25, 1);
    const dpHi = document.getElementById('ncsim-dp-hi');
    if (dpHi) dpHi.onclick = () => spawnDummyPreset('หุ่นไล่กาบอสแข็ง', 65, 50, 1);
    const dpAoe = document.getElementById('ncsim-dp-aoe');
    if (dpAoe) dpAoe.onclick = () => spawnDummyPreset('หุ่นไล่กา AoE', 20, 15, 3);
  }

  function renderHudHotbar() {
    const hbEl = document.getElementById('ncsim-hotbar');
    if (!hbEl || !state.build) return;
    const hb = state.build.hotbar || {};
    const skillsHtml = HB_KEYS.map(k => {
      const sid = hb[k];
      const sk = sid && idx.skillsById[sid];
      return `
        <button type="button" class="ncsim-hb-slot" data-hb-cast="${k}" title="${sk ? `${esc(sk.n.th)} (${sk.mul}% · CD ${sk.cd}s)` : 'ว่าง — ตั้งปุ่มใน [K] สกิล/รูน'}">
          <span class="ncsim-hb-key">${k.toUpperCase()}</span>
          ${sk ? atlasIconHtml(sk.ic, 38) : `<span style="color:#475569;font-size:12px;">—</span>`}
          <span class="ncsim-hb-cd" id="ncsim-hbcd-${k}" style="display:none;"></span>
        </button>
      `;
    }).join('');
    const cardsHtml = [0, 1].map(ci => {
      const cs = state.build.cards.act[ci];
      const card = cs && idx.cardsById[cs.id];
      return `
        <button type="button" class="ncsim-hb-slot card-slot" data-hb-card="${ci}" title="${card ? `🃏 ${esc(card.art.th)} (CD ${card.cd}s)` : 'ช่องการ์ด Active ' + (ci + 1) + ' — ตั้งใน [B]'}">
          <span class="ncsim-hb-key">${ci + 7}</span>
          ${card ? monThumbHtml(idx.monsById[card.id] || card, 36) : `<span style="color:#a855f7;font-size:16px;">🃏</span>`}
          <span class="ncsim-hb-cd" id="ncsim-hbcd-c${ci}" style="display:none;"></span>
        </button>
      `;
    }).join('');

    hbEl.innerHTML = `${skillsHtml}<span style="width:1px;height:34px;background:rgba(245,201,105,0.28);margin:0 2px;"></span>${cardsHtml}`;
    hbEl.querySelectorAll('[data-hb-cast]').forEach(btn => {
      btn.onclick = () => { const sid = state.build.hotbar[btn.dataset.hbCast]; if (sid && arena) arena.castSkillById(sid); };
    });
    hbEl.querySelectorAll('[data-hb-card]').forEach(btn => {
      btn.onclick = () => arena && arena.castCardSlot(Number(btn.dataset.hbCard));
    });
  }

  function renderHudBottomRight() {
    const el = document.getElementById('ncsim-hud-br');
    if (!el) return;
    const isAuto = !!(arena && arena.autoRot);
    el.innerHTML = `
      <div style="display:flex;gap:5px;align-items:center;">
        <button type="button" class="ncsim-auto-pill ${isAuto ? 'on' : ''}" id="ncsim-br-auto">🤖 AUTO ${isAuto ? 'ON' : 'OFF'} [Z]</button>
      </div>
      <div class="ncsim-action-circles">
        <button type="button" class="ncsim-circle-btn ncsim-circle-dash" id="ncsim-br-dash" title="แดชหลบสกิลบอส (Shift / คลิกขวา)">
          <span class="ncsim-circle-lbl">Shift</span>
          <span>💨</span>
          <span class="ncsim-hb-cd" id="ncsim-dash-cd" style="display:none;border-radius:50%;"></span>
        </button>
        <button type="button" class="ncsim-circle-btn ncsim-circle-atk" id="ncsim-br-atk" title="โจมตีปกติ (Space / คลิกมอน)">
          <span class="ncsim-circle-lbl">Space</span>
          <span>⚔️</span>
        </button>
      </div>
    `;
    document.getElementById('ncsim-br-auto').onclick = () => {
      if (!arena) return;
      arena.autoRot = !arena.autoRot;
      renderHudBottomRight();
      toast(arena.autoRot ? '🤖 เปิด Auto-Battle (เดินไล่บอส + หลบวงแดงอัตโนมัติ)' : '🎮 โหมดควบคุมเอง (WASD เดิน · Shift แดช · คลิกตี)');
    };
    document.getElementById('ncsim-br-dash').onclick = () => arena && arena.triggerDash();
    document.getElementById('ncsim-br-atk').onclick = () => arena && arena.castBasic();
  }

  // =========================================================================
  // KEYBOARD CONTROLS (REAL GAMEPLAY: WASD, SHIFT, SPACE, Q-6, 7-8, Z, C/I/K/B/M/U/TAB)
  // =========================================================================
  function bindGameKeyboard() {
    if (state.keysBound) return;
    state.keysBound = true;
    const isTyping = (ev) => ['INPUT', 'TEXTAREA', 'SELECT'].includes((ev.target && ev.target.tagName) || '');

    window.addEventListener('keydown', (ev) => {
      if (!isTabActive() || !arena) return;
      if (ev.key === 'Escape') {
        if (state.modal) { document.getElementById('ncsim-modal-root').innerHTML = ''; state.modal = null; return; }
        if (state.openWin) { state.openWin = null; renderFloatingWindow(); renderHudTopRight(); return; }
        return;
      }
      if (state.modal || isTyping(ev)) return;
      const k = ev.key.toLowerCase();

      // Movement keys
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) {
        ev.preventDefault();
        arena.setKey(k, true);
        if (k === ' ') arena.castBasic();
        return;
      }
      if (k === 'shift') { ev.preventDefault(); arena.triggerDash(); return; }

      // Hotbar skills & cards
      if (HB_KEYS.includes(k)) {
        const sid = state.build && state.build.hotbar && state.build.hotbar[k];
        if (sid) { ev.preventDefault(); arena.castSkillById(sid); }
        return;
      }
      if (k === '7') { ev.preventDefault(); arena.castCardSlot(0); return; }
      if (k === '8') { ev.preventDefault(); arena.castCardSlot(1); return; }
      if (k === 'z') {
        ev.preventDefault();
        arena.autoRot = !arena.autoRot;
        renderHudBottomRight();
        toast(arena.autoRot ? '🤖 AUTO ON' : '🎮 AUTO OFF (บังคับเอง)');
        return;
      }

      // Authentic Nightcamp RPG Window Hotkeys!
      const winMap = { c: 'status', i: 'equip', k: 'skills', b: 'cards', m: 'boss', u: 'buffs', tab: 'dps' };
      if (winMap[k]) { ev.preventDefault(); toggleWindow(winMap[k]); }
    });

    window.addEventListener('keyup', (ev) => {
      if (!arena) return;
      const k = ev.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) {
        arena.setKey(k, false);
      }
    });
  }

  // =========================================================================
  // FLOATING DRAGGABLE NIGHTCAMP RPG WINDOWS (C / I / K / B / M / U / Tab)
  // =========================================================================
  function toggleWindow(winKey) {
    state.openWin = state.openWin === winKey ? null : winKey;
    renderHudTopRight();
    renderFloatingWindow();
  }

  function makeDraggable(winEl, handleEl) {
    handleEl.onmousedown = (ev) => {
      if (ev.target.closest('button')) return;
      const stage = document.getElementById('ncsim-stage');
      const sRect = stage.getBoundingClientRect();
      const wRect = winEl.getBoundingClientRect();
      const offX = ev.clientX - wRect.left;
      const offY = ev.clientY - wRect.top;
      winEl.style.transform = 'none';
      winEl.style.left = (wRect.left - sRect.left) + 'px';
      winEl.style.top = (wRect.top - sRect.top) + 'px';
      const onMove = (me) => {
        const nl = Math.max(8, Math.min(sRect.width - 140, me.clientX - sRect.left - offX));
        const nt = Math.max(8, Math.min(sRect.height - 60, me.clientY - sRect.top - offY));
        winEl.style.left = nl + 'px';
        winEl.style.top = nt + 'px';
        state.winPos = { left: nl, top: nt };
      };
      const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    };
  }

  function renderFloatingWindow() {
    const rootEl = document.getElementById('ncsim-fwin-root');
    if (!rootEl) return;
    if (!state.openWin) { rootEl.innerHTML = ''; return; }

    const titles = {
      status: '🧙 หน้าต่างสเตตัส & เสกเลเวล [C]',
      equip: '⚔️ กระเป๋าอุปกรณ์ & เสกของ (Paper-Doll) [I]',
      skills: '⚡ หน้าต่างสกิล & ช่องรูน (Season 2) [K]',
      cards: '🃏 สมุดการ์ดมอนสเตอร์ (3 Passive · 2 Active) [B]',
      boss: '👹 เสกบอส 52 ตัว / มอนสเตอร์ 482 ตัว & แผนที่ [M]',
      buffs: '🧪 ยาบัฟ · อาหาร · บัฟปาร์ตี้ & กิลด์ [U]',
      dps: '📊 วิเคราะห์ DPS · เทียบ Build A/B · Auto-Optimize & Export [Tab]',
    };
    const posStyle = state.winPos ? `left:${state.winPos.left}px;top:${state.winPos.top}px;transform:none;` : '';

    rootEl.innerHTML = `
      <div class="ncsim-fwin" id="ncsim-fwin" style="${posStyle}">
        <div class="ncsim-fwin-head" id="ncsim-fwin-drag">
          <span>${titles[state.openWin] || ''}</span>
          <button type="button" class="ncsim-btn ncsim-btn-sm" id="ncsim-fwin-close">✕ ปิด [Esc]</button>
        </div>
        <div class="ncsim-fwin-body" id="ncsim-fwin-body"></div>
      </div>
    `;
    document.getElementById('ncsim-fwin-close').onclick = () => { state.openWin = null; renderFloatingWindow(); renderHudTopRight(); };
    makeDraggable(document.getElementById('ncsim-fwin'), document.getElementById('ncsim-fwin-drag'));

    const body = document.getElementById('ncsim-fwin-body');
    if (state.openWin === 'status') renderWinStatus(body);
    else if (state.openWin === 'equip') renderWinEquip(body);
    else if (state.openWin === 'skills') renderWinSkills(body);
    else if (state.openWin === 'cards') renderWinCards(body);
    else if (state.openWin === 'boss') renderWinBoss(body);
    else if (state.openWin === 'buffs') renderWinBuffs(body);
    else if (state.openWin === 'dps') renderWinDps(body);
  }

  function buildHexRadarSvg(stats) {
    const keys = ['str', 'agi', 'vit', 'int', 'dex', 'luk'];
    const labels = ['STR', 'AGI', 'VIT', 'INT', 'DEX', 'LUK'];
    const cx = 58, cy = 58, maxR = 40;
    const pt = (i, frac) => {
      const ang = -Math.PI / 2 + (i * Math.PI * 2) / 6;
      return [cx + Math.cos(ang) * maxR * frac, cy + Math.sin(ang) * maxR * frac];
    };
    const poly = (f) => keys.map((_, i) => pt(i, f).map(n => n.toFixed(1)).join(',')).join(' ');
    const dataPoly = keys.map((k, i) => pt(i, Math.min(1, (stats[k] || 5) / 100)).map(n => n.toFixed(1)).join(',')).join(' ');
    const lbls = labels.map((lb, i) => {
      const [x, y] = pt(i, 1.24);
      return `<text x="${x.toFixed(1)}" y="${(y + 3).toFixed(1)}" text-anchor="middle" font-size="8.5" font-weight="800" fill="#fde68a">${lb}</text>`;
    }).join('');
    return `<svg viewBox="0 0 116 116" width="116" height="116"><polygon points="${poly(1)}" fill="rgba(14,12,26,0.9)" stroke="rgba(245,201,105,0.32)" stroke-width="1"/><polygon points="${poly(0.66)}" fill="none" stroke="rgba(148,163,184,0.2)"/><polygon points="${poly(0.33)}" fill="none" stroke="rgba(148,163,184,0.16)"/><polygon points="${dataPoly}" fill="rgba(245,158,11,0.36)" stroke="#fbbf24" stroke-width="2"/>${lbls}</svg>`;
  }

  function renderWinStatus(body) {
    const b = state.build, st = state.stats;
    const tierNames = { 0: 'Class 0 · เริ่มต้น', 1: 'Class 1', 2: 'Class 2', 3: 'Class 3' };
    const jobGroups = [0, 1, 2, 3].map(t => `<optgroup label="${tierNames[t]}">${(idx.wiki.jobs || []).filter(j => j.tier === t).map(j => `<option value="${esc(j.id)}" ${j.id === b.job ? 'selected' : ''}>${esc(j.n.th)} (${esc(j.n.en)})</option>`).join('')}</optgroup>`).join('');
    const ptColor = st.statPoints.left < 0 ? '#f87171' : '#4ade80';

    body.innerHTML = `
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;background:rgba(12,10,22,0.75);padding:9px;border-radius:10px;border:1px solid rgba(245,201,105,0.25);">
        ${idx.jobsById[b.job] ? atlasIconHtml(idx.jobsById[b.job].ic, 56) : ''}
        <div style="flex:1;min-width:200px;display:flex;flex-direction:column;gap:5px;">
          <select id="ncsim-job-sel" class="ncsim-select" style="width:100%;font-weight:800;">${jobGroups}</select>
          <div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center;">
            <span style="font-size:11px;color:#94a3b8;">เสกเวลไว:</span>
            ${[35, 55, 75, 99].map(L => `<button type="button" class="ncsim-btn ncsim-btn-sm ${b.lv === L ? 'active' : ''}" data-qlv="${L}">Lv.${L}</button>`).join('')}
          </div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div style="background:rgba(12,10,22,0.8);padding:7px 9px;border-radius:8px;">
          <label style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px;"><span>Base Lv</span><b style="color:#fde68a;">${b.lv} / 99</b></label>
          <input type="range" id="ncsim-lv-s" min="1" max="99" value="${b.lv}" style="width:100%;accent-color:#f59e0b;">
        </div>
        <div style="background:rgba(12,10,22,0.8);padding:7px 9px;border-radius:8px;">
          <label style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px;"><span>Job Lv</span><b style="color:#93c5fd;">${b.jobLv} / 50</b></label>
          <input type="range" id="ncsim-jlv-s" min="1" max="50" value="${b.jobLv}" style="width:100%;accent-color:#38bdf8;">
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:11.5px;font-weight:800;color:${ptColor};">แต้มสเตตัสคงเหลือ: ${st.statPoints.left} / ${st.statPoints.total}</span>
        <div style="display:flex;gap:5px;">
          <button type="button" class="ncsim-btn ncsim-btn-sm ${b.sandboxStats ? 'active' : ''}" id="ncsim-s-sbx">🔓 เสกอิสระไม่จำกัดแต้ม</button>
          <button type="button" class="ncsim-btn ncsim-btn-sm" id="ncsim-s-rst">↺ รีเซ็ต</button>
        </div>
      </div>
      <div class="ncsim-stat-wrap">
        <div>${buildHexRadarSvg(st)}</div>
        <div>
          ${E.STAT_KEYS.map(k => {
            const addV = st[k] - b.base[k];
            return `<div class="ncsim-stat-row">
              <b style="color:#fde68a;">${k.toUpperCase()}</b>
              <span style="font-family:monospace;font-weight:800;">${b.base[k]}${addV > 0 ? `<span style="color:#4ade80;">+${addV}</span>` : ''}</span>
              <button type="button" class="ncsim-stat-btn" data-stk="${k}" data-std="-1">−</button>
              <button type="button" class="ncsim-stat-btn" data-stk="${k}" data-std="1">+</button>
              <button type="button" class="ncsim-stat-btn" data-stk="${k}" data-std="10">+10</button>
            </div>`;
          }).join('')}
        </div>
      </div>
      <div class="ncsim-derived-grid">
        <div class="ncsim-dstat"><div class="ncsim-dstat-k">ATK</div><div class="ncsim-dstat-v" style="color:#fde68a;">${st.batk}+${st.watk[1]}</div></div>
        <div class="ncsim-dstat"><div class="ncsim-dstat-k">MATK</div><div class="ncsim-dstat-v" style="color:#7dd3fc;">${st.matk[0]}~${st.matk[1]}</div></div>
        <div class="ncsim-dstat"><div class="ncsim-dstat-k">ASPD</div><div class="ncsim-dstat-v" style="color:#86efac;">${st.aspd} (${st.hitsPerSec}/s)</div></div>
        <div class="ncsim-dstat"><div class="ncsim-dstat-k">CRIT / CDMG</div><div class="ncsim-dstat-v" style="color:#fbbf24;">${st.crit}% / +${st.critDmg}%</div></div>
        <div class="ncsim-dstat"><div class="ncsim-dstat-k">Max HP</div><div class="ncsim-dstat-v" style="color:#fca5a5;">${st.maxHp.toLocaleString()}</div></div>
        <div class="ncsim-dstat"><div class="ncsim-dstat-k">Max SP</div><div class="ncsim-dstat-v" style="color:#93c5fd;">${st.maxSp.toLocaleString()}</div></div>
        <div class="ncsim-dstat"><div class="ncsim-dstat-k">DEF / MDEF</div><div class="ncsim-dstat-v">${st.def}+${st.vdef} / ${st.mdef}+${st.imdef}</div></div>
        <div class="ncsim-dstat"><div class="ncsim-dstat-k">HIT / FLEE</div><div class="ncsim-dstat-v">${st.hit} / ${st.flee}</div></div>
        <div class="ncsim-dstat"><div class="ncsim-dstat-k">Cast / CDR</div><div class="ncsim-dstat-v">${st.castPct}% / -${st.cdr}%</div></div>
        <div class="ncsim-dstat"><div class="ncsim-dstat-k">เจาะเกราะ/เวท</div><div class="ncsim-dstat-v">${st.pen}% / ${st.mpen}%</div></div>
        <div class="ncsim-dstat"><div class="ncsim-dstat-k">ดูดเลือด</div><div class="ncsim-dstat-v">${st.leech}%</div></div>
        <div class="ncsim-dstat"><div class="ncsim-dstat-k">EHP</div><div class="ncsim-dstat-v">${st.ehp.toLocaleString()}</div></div>
      </div>
    `;

    document.getElementById('ncsim-job-sel').onchange = (ev) => {
      const nj = ev.target.value;
      const fresh = E.createDefaultBuild(idx, nj, { id: b.id, name: b.name, lv: b.lv, jobLv: b.jobLv });
      b.job = nj; b.skills = fresh.skills; b.rotation = fresh.rotation; b.hotbar = fresh.hotbar;
      const allowed = E.JOB_WEAPONS[nj] || [];
      const curW = b.equip.weapon && idx.itemsById[b.equip.weapon.id];
      if (!curW || (curW.wt && allowed.length && !allowed.includes(curW.wt))) b.equip.weapon = fresh.equip.weapon;
      persistBuilds(); recomputeAll(false);
    };
    document.getElementById('ncsim-lv-s').oninput = (ev) => { b.lv = Number(ev.target.value) || 1; recomputeAll(false); };
    document.getElementById('ncsim-jlv-s').oninput = (ev) => { b.jobLv = Number(ev.target.value) || 1; recomputeAll(false); };
    body.querySelectorAll('[data-qlv]').forEach(btn => { btn.onclick = () => { b.lv = Number(btn.dataset.qlv); b.jobLv = Math.min(50, b.lv); persistBuilds(); recomputeAll(false); }; });
    document.getElementById('ncsim-s-sbx').onclick = () => { b.sandboxStats = !b.sandboxStats; persistBuilds(); recomputeAll(false); };
    document.getElementById('ncsim-s-rst').onclick = () => { b.base = Object.assign({}, E.START_STATS); persistBuilds(); recomputeAll(false); };
    body.querySelectorAll('[data-stk]').forEach(btn => {
      btn.onclick = () => {
        const k = btn.dataset.stk, d = Number(btn.dataset.std), maxV = b.sandboxStats ? 200 : E.STAT_MAX;
        if (d > 0) {
          for (let i = 0; i < d; i++) {
            if (b.base[k] >= maxV) break;
            if (!b.sandboxStats && (E.statusPointsAt(b.lv) - E.statSpent(b.base)) < E.statCost(b.base[k])) break;
            b.base[k]++;
          }
        } else b.base[k] = Math.max(E.START_STATS[k], b.base[k] + d);
        persistBuilds(); recomputeAll(false);
      };
    });
  }

  function renderWinEquip(body) {
    const b = state.build, st = state.stats;
    const slotsHtml = E.EQUIP_SLOTS.map(slot => {
      const g = b.equip[slot];
      const it = g && idx.itemsById[g.id];
      const gr = g ? E.GRADES[g.g || 0] : null;
      const rCol = it && E.RARITY_INFO[it.r] ? E.RARITY_INFO[it.r].color : '#94a3b8';
      return `
        <button type="button" class="ncsim-eq-slot ${g ? 'g' + (g.g || 0) : ''}" data-eq-slot="${slot}">
          ${it ? atlasIconHtml(it.ic, 36) : `<span style="width:36px;height:36px;border-radius:7px;background:rgba(148,163,184,0.12);display:grid;place-items:center;font-size:15px;color:#64748b;">+</span>`}
          <div class="ncsim-eq-meta">
            <div class="ncsim-eq-slot-lbl">${esc(E.SLOT_LABELS[slot])}</div>
            <div class="ncsim-eq-name" style="color:${it ? rCol : '#64748b'};">${it ? esc(it.n.th) : 'ว่าง (คลิกใส่)'}</div>
            ${g ? `<div class="ncsim-eq-badges">${g.ref > 0 ? `<span class="ncsim-ref-tag">+${g.ref}</span>` : ''}<span style="color:${gr.color};">G${g.g} ${gr.name}</span>${g.rows && g.rows.length ? `<span style="color:#a5f3fc;">◆${g.rows.length}</span>` : ''}</div>` : ''}
          </div>
        </button>
      `;
    }).join('');
    const setTags = [
      ...st.activeSets.map(s => `<span class="ncsim-tag ncsim-tag-gold">✨ ${esc(s.name)} (${s.count}/3) · ${esc(s.pasText || '')}</span>`),
      ...st.activeBossSets.map(s => `<span class="ncsim-tag ncsim-tag-violet">👑 ${esc(s.name)} (${s.count}pc)</span>`),
    ].join(' ');

    body.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">
        <span style="font-size:11.5px;color:#cbd5e1;">คลิกช่องใดก็ได้เพื่อเสกของจาก Wiki (2,130 ชิ้น) พร้อมตีบวก +0..+10 / เกรด G0–G5 / ออฟชัน</span>
        <div style="display:flex;gap:5px;">
          <button type="button" class="ncsim-btn ncsim-btn-sm ncsim-btn-gold" id="ncsim-eq-set">👕 ใส่ยกเซ็ต 3 ชิ้น</button>
          <button type="button" class="ncsim-btn ncsim-btn-sm ncsim-btn-violet" id="ncsim-eq-max">✨ ปรับทุกชิ้น +10 G5</button>
        </div>
      </div>
      <div class="ncsim-paperdoll">${slotsHtml}</div>
      ${setTags ? `<div style="display:flex;flex-wrap:wrap;gap:5px;">${setTags}</div>` : ''}
      ${st.warnings.length ? `<div style="font-size:11px;color:#fca5a5;">⚠️ ${st.warnings.map(esc).join(' · ')}</div>` : ''}
    `;

    body.querySelectorAll('[data-eq-slot]').forEach(btn => { btn.onclick = () => openEquipSlotModal(btn.dataset.eqSlot); });
    document.getElementById('ncsim-eq-set').onclick = openSetPickerModal;
    document.getElementById('ncsim-eq-max').onclick = () => {
      for (const s of E.EQUIP_SLOTS) if (b.equip[s]) { b.equip[s].ref = 10; b.equip[s].g = 5; }
      persistBuilds(); recomputeAll(false);
      toast('✨ ปรับอุปกรณ์ทั้งหมดเป็น +10 G5 ราตรีแล้ว!');
    };
  }

  function renderRunePill(skillId, slotIdx, rObj) {
    const R = rObj && rObj.k && idx.runesByKey[rObj.k];
    if (!R) return `<button type="button" class="ncsim-rune-pill" data-rsk="${esc(skillId)}" data-rsi="${slotIdx}"><span>+ ช่องรูน ${slotIdx + 1}</span><span>💠</span></button>`;
    return `<button type="button" class="ncsim-rune-pill filled" data-rsk="${esc(skillId)}" data-rsi="${slotIdx}"><span style="display:flex;align-items:center;gap:4px;overflow:hidden;">${R.ic && R.ic[rObj.tier - 1] ? atlasIconHtml(R.ic[rObj.tier - 1], 18) : '💠'}<span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(R.n.th)}</span></span><b style="color:#fde68a;">T${rObj.tier}</b></button>`;
  }

  function renderWinSkills(body) {
    const b = state.build;
    const skills = E.getJobSkills(idx, b.job).slice().sort((a, z) => {
      const sc = (s) => (s.type === 'passive' ? 0 : 100) + (s.job === b.job ? 50 : 0) + (b.rotation.includes(s.id) ? 20 : 0);
      return sc(z) - sc(a);
    });
    body.innerHTML = `
      <div class="ncsim-sk-card in-rot" style="border-color:rgba(56,189,248,0.5);">
        <div style="display:flex;justify-content:space-between;font-size:11.5px;"><b style="color:#7dd3fc;">⚔️ รูนตีปกติ (Basic Attack Runes)</b><span style="color:#94a3b8;font-size:10px;">Lv.40 / Lv.70 / Lv.90 (3 ช่อง)</span></div>
        <div class="ncsim-rune-row">${renderRunePill('__basic__', 0, b.basicRunes[0])}${renderRunePill('__basic__', 1, b.basicRunes[1])}${renderRunePill('__basic__', 2, b.basicRunes[2])}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;">
        ${skills.map(sk => {
          const lv = (b.skills && b.skills[sk.id]) || 0;
          const inRot = b.rotation.includes(sk.id);
          const isPas = sk.type === 'passive';
          const rArr = (b.runes && b.runes[sk.id]) || [null, null];
          const rSum = !isPas ? E.computeRuneBundle(idx, rArr, { n: state.env.targetCount, night: state.env.night, hits: sk.hits || 1, dur: sk.dur || 0, cd: sk.cd || 1, splitIn: sk.splitIn || 0 }, state.env.mode).summary : null;
          const boundKey = HB_KEYS.find(k => b.hotbar && b.hotbar[k] === sk.id) || '';
          return `
            <div class="ncsim-sk-card ${inRot ? 'in-rot' : ''}">
              <div style="display:flex;align-items:center;gap:7px;">
                ${atlasIconHtml(sk.ic, 32)}
                <div style="flex:1;min-width:0;">
                  <div style="display:flex;align-items:center;gap:4px;">
                    <b style="font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(sk.n.th)}</b>
                    ${rSum && rSum.isBucketCapped ? `<span class="ncsim-tag ncsim-tag-red">CAP50%</span>` : ''}
                  </div>
                  <div style="font-size:10px;color:#94a3b8;">${isPas ? 'Passive' : `${sk.mul || 0}% · CD ${sk.cd || 0}s`}${rSum && rSum.total !== 1 ? ` · <b style="color:#c084fc;">×${rSum.total.toFixed(2)}</b>` : ''}</div>
                </div>
                <span style="font-size:10.5px;font-family:monospace;color:#fde68a;">Lv.${lv}</span>
              </div>
              <div style="display:flex;align-items:center;gap:5px;">
                <input type="range" min="0" max="${sk.max || 10}" value="${lv}" data-sk-lv="${esc(sk.id)}" style="flex:1;accent-color:#f59e0b;">
                ${!isPas ? `
                  <label style="font-size:10px;display:flex;align-items:center;gap:2px;"><input type="checkbox" data-sk-rot="${esc(sk.id)}" ${inRot ? 'checked' : ''}>Auto</label>
                  <select class="ncsim-select" data-sk-hb="${esc(sk.id)}" style="padding:2px 4px;font-size:10px;width:48px;"><option value="">—</option>${HB_KEYS.map(k => `<option value="${k}" ${boundKey === k ? 'selected' : ''}>${k.toUpperCase()}</option>`).join('')}</select>
                ` : ''}
              </div>
              ${(!isPas && Array.isArray(sk.fit) && sk.fit.length) ? `<div class="ncsim-rune-row">${renderRunePill(sk.id, 0, rArr[0])}${renderRunePill(sk.id, 1, rArr[1])}</div>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;
    body.querySelectorAll('[data-sk-lv]').forEach(inp => { inp.oninput = () => { b.skills[inp.dataset.skLv] = Number(inp.value) || 0; recomputeAll(false); }; });
    body.querySelectorAll('[data-sk-rot]').forEach(chk => {
      chk.onchange = () => {
        const sid = chk.dataset.skRot;
        if (chk.checked && !b.rotation.includes(sid)) b.rotation.push(sid);
        else if (!chk.checked) b.rotation = b.rotation.filter(x => x !== sid);
        persistBuilds(); recomputeAll(false);
      };
    });
    body.querySelectorAll('[data-sk-hb]').forEach(sel => {
      sel.onchange = () => {
        const sid = sel.dataset.skHb, k = sel.value;
        for (const hk of HB_KEYS) if (b.hotbar[hk] === sid) b.hotbar[hk] = null;
        if (k) b.hotbar[k] = sid;
        persistBuilds(); renderHudHotbar();
      };
    });
    body.querySelectorAll('[data-rsk]').forEach(btn => { btn.onclick = () => openRunePickerModal(btn.dataset.rsk, Number(btn.dataset.rsi)); });
  }

  function renderWinCards(body) {
    const b = state.build, st = state.stats;
    const slotHtml = (role, i, cObj) => {
      const card = cObj && idx.cardsById[cObj.id];
      const effTxt = card ? (card.eff || []).map(e => (e.txt && e.txt[0] && e.txt[0].th) || '').filter(Boolean).join(' · ') : '';
      return `
        <div class="ncsim-card-slot" data-crole="${role}" data-cidx="${i}">
          ${card ? monThumbHtml(idx.monsById[card.id] || card, 42) : `<span style="width:42px;height:42px;border-radius:8px;background:rgba(139,92,246,0.16);display:grid;place-items:center;font-size:19px;">🃏</span>`}
          <div style="flex:1;min-width:0;">
            <div style="display:flex;justify-content:space-between;"><b style="font-size:12px;color:${card ? '#f3e8ff' : '#64748b'};">${card ? `${esc(card.mon.th)}${role === 'act' ? ' · ' + esc(card.art.th) : ''}` : `ว่าง — คลิกเลือกการ์ด ${role === 'pas' ? 'Passive' : 'Active'} #${i + 1}`}</b>${card ? `<span class="ncsim-tag ncsim-tag-violet">Lv.${cObj.lv}</span>` : ''}</div>
            <div style="font-size:10.5px;color:#94a3b8;">${card ? esc(role === 'act' ? (card.d && card.d.th) : effTxt) : 'เลือกจากการ์ดทั้ง 338 ใบในคัมภีร์ Wiki'}</div>
          </div>
        </div>
      `;
    };
    body.innerHTML = `
      <b style="font-size:12px;color:#fde68a;">📘 การ์ดติดตัว Passive (3 ช่อง)</b>
      ${[0, 1, 2].map(i => slotHtml('pas', i, b.cards.pas[i])).join('')}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
        <b style="font-size:12px;color:#c084fc;">⚡ การ์ดวิชา Active (2 ช่อง · กดปุ่ม 7, 8)</b>
        <div style="display:flex;gap:4px;">
          ${st.cardPairFam ? `<span class="ncsim-tag ncsim-tag-green">คู่เผ่า CD -10%</span>` : ''}
          ${st.cardPairEl ? `<span class="ncsim-tag ncsim-tag-gold">คู่ธาตุ DMG +30%</span>` : ''}
        </div>
      </div>
      ${[0, 1].map(i => slotHtml('act', i, b.cards.act[i])).join('')}
    `;
    body.querySelectorAll('[data-crole]').forEach(el => { el.onclick = () => openCardPickerModal(el.dataset.crole, Number(el.dataset.cidx)); });
  }

  function renderWinBoss(body) {
    const cats = [
      ['boss', `👑 บอสทั้งหมด (${idx.bosses.length})`],
      ['field_boss', '🔥 Field Boss'],
      ['story_boss', '📖 Story Boss'],
      ['root_boss', '🌳 Root Boss'],
      ['all', `👾 มอนทั้งหมด (${idx.wiki.monsters.length})`],
      ['dummy', '🎯 หุ่นปรับเอง'],
    ];
    let list = idx.wiki.monsters || [];
    if (state.targetCat === 'boss') list = idx.bosses;
    else if (state.targetCat === 'field_boss') list = idx.bosses.filter(m => m.type === 'Boss');
    else if (state.targetCat === 'story_boss') list = idx.bosses.filter(m => m.type === 'Story Boss');
    else if (state.targetCat === 'root_boss') list = idx.bosses.filter(m => m.type === 'Root Boss');
    if (state.targetSearch.trim()) {
      const q = state.targetSearch.trim().toLowerCase();
      list = list.filter(m => (m.id || '').toLowerCase().includes(q) || (m.n && ((m.n.th || '').toLowerCase().includes(q) || (m.n.en || '').toLowerCase().includes(q))));
    }

    body.innerHTML = `
      <div style="display:flex;gap:4px;flex-wrap:wrap;">
        ${cats.map(([k, lb]) => `<button type="button" class="ncsim-btn ncsim-btn-sm ${state.targetCat === k ? 'active' : ''}" data-tcat="${k}">${lb}</button>`).join('')}
      </div>
      ${state.targetCat === 'dummy' ? `
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;background:rgba(12,10,22,0.85);padding:9px;border-radius:9px;">
          <label style="font-size:10.5px;">HP<input type="number" id="ncsim-dm-hp" class="ncsim-input" value="${state.customDummy.hp}" style="width:100%;margin-top:3px;"></label>
          <label style="font-size:10.5px;">DEF<input type="number" id="ncsim-dm-def" class="ncsim-input" value="${state.customDummy.def}" style="width:100%;margin-top:3px;"></label>
          <label style="font-size:10.5px;">MDEF<input type="number" id="ncsim-dm-mdef" class="ncsim-input" value="${state.customDummy.mdef}" style="width:100%;margin-top:3px;"></label>
          <label style="font-size:10.5px;">ธาตุ<select id="ncsim-dm-el" class="ncsim-select" style="width:100%;margin-top:3px;">${E.ELEMENTS.map(e => `<option value="${e}" ${state.customDummy.el === e ? 'selected' : ''}>${E.ELEMENT_INFO[e].th}</option>`).join('')}</select></label>
          <label style="font-size:10.5px;">จำนวน<input type="number" min="1" max="20" id="ncsim-dm-cnt" class="ncsim-input" value="${state.env.targetCount}" style="width:100%;margin-top:3px;"></label>
        </div>
        <button type="button" class="ncsim-btn ncsim-btn-gold" id="ncsim-dm-spawn">🎯 เสกหุ่นทดสอบลงแมพ</button>
      ` : `
        <div style="display:flex;gap:6px;align-items:center;">
          <input type="text" id="ncsim-bs-q" class="ncsim-input" placeholder="🔍 ค้นหาชื่อบอส / มอนสเตอร์..." value="${esc(state.targetSearch)}" style="flex:1;">
          <select id="ncsim-bs-cnt" class="ncsim-select" style="width:90px;">
            ${[1, 2, 3, 5, 8, 12, 20].map(n => `<option value="${n}" ${state.env.targetCount === n ? 'selected' : ''}>เสก ${n} ตัว</option>`).join('')}
          </select>
        </div>
        <div class="ncsim-pick-grid" style="max-height:330px;">
          ${list.slice(0, 90).map(m => `
            <div class="ncsim-pick-item" style="justify-content:space-between;cursor:default;">
              <div style="display:flex;align-items:center;gap:7px;min-width:0;flex:1;">
                ${monThumbHtml(m, 38)}
                <div style="min-width:0;">
                  <div style="font-size:11.5px;font-weight:800;color:${m.boss ? '#fde047' : '#f1f5f9'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.boss ? '👑 ' : ''}${esc(m.n.th)}</div>
                  <div style="font-size:10px;color:#94a3b8;">Lv.${m.lv} · ${(E.ELEMENT_INFO[m.el] || {}).th || m.el} · HP ${(m.hp || 0).toLocaleString()}</div>
                </div>
              </div>
              <div style="display:flex;flex-direction:column;gap:3px;">
                <button type="button" class="ncsim-btn ncsim-btn-sm ncsim-btn-gold" data-sp-rep="${esc(m.id)}" style="padding:2px 7px;font-size:10px;">เสกแทน</button>
                <button type="button" class="ncsim-btn ncsim-btn-sm ncsim-btn-violet" data-sp-add="${esc(m.id)}" style="padding:2px 7px;font-size:10px;">+ เพิ่ม</button>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    `;

    body.querySelectorAll('[data-tcat]').forEach(btn => { btn.onclick = () => { state.targetCat = btn.dataset.tcat; renderFloatingWindow(); }; });
    if (state.targetCat === 'dummy') {
      document.getElementById('ncsim-dm-spawn').onclick = () => {
        state.customDummy.hp = Math.max(100, Number(document.getElementById('ncsim-dm-hp').value) || 500000);
        state.customDummy.def = Math.max(0, Number(document.getElementById('ncsim-dm-def').value) || 0);
        state.customDummy.mdef = Math.max(0, Number(document.getElementById('ncsim-dm-mdef').value) || 0);
        state.customDummy.el = document.getElementById('ncsim-dm-el').value;
        state.env.targetCount = Math.max(1, Math.min(20, Number(document.getElementById('ncsim-dm-cnt').value) || 1));
        recomputeAll(true);
        state.openWin = null; renderFloatingWindow(); renderHudTopRight();
        toast('🎯 เสกหุ่นทดสอบลงกลางแมพแล้ว!');
      };
    } else {
      document.getElementById('ncsim-bs-q').oninput = (ev) => { state.targetSearch = ev.target.value; renderFloatingWindow(); };
      document.getElementById('ncsim-bs-cnt').onchange = (ev) => { state.env.targetCount = Number(ev.target.value) || 1; };
      body.querySelectorAll('[data-sp-rep]').forEach(btn => {
        btn.onclick = () => {
          state.targetId = btn.dataset.spRep;
          recomputeAll(true);
          state.openWin = null; renderFloatingWindow(); renderHudTopRight();
          toast(`👹 เสก ${idx.monsById[state.targetId].n.th} (${state.env.targetCount} ตัว) ลงแมพแล้ว!`);
        };
      });
      body.querySelectorAll('[data-sp-add]').forEach(btn => {
        btn.onclick = () => {
          const tSpec = E.resolveTarget(idx, btn.dataset.spAdd);
          if (arena) arena.spawnTargetGroup(tSpec, state.env.targetCount, true);
          toast(`➕ เสกเพิ่ม ${tSpec.name} (+${state.env.targetCount} ตัว) ลงแมพแล้ว!`);
        };
      });
    }
  }

  function renderWinBuffs(body) {
    const b = state.build;
    const potKeys = ['bless', 'swift', 'guard', 'luck', 'cast'];
    const potLabels = { bless: 'ยาพรศักดิ์สิทธิ์', swift: 'ยาเท้าไว', guard: 'ยาเกราะกาย', luck: 'ยาสรรเสริญโชค', cast: 'ยาเร่งร่าย' };
    body.innerHTML = `
      <div style="background:rgba(12,10,22,0.85);padding:8px;border-radius:9px;">
        <label style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px;"><span>❤️ HP เริ่มต้น (ทดสอบออฟเลือดต่ำ)</span><b style="color:#fca5a5;">${b.hpPct}%</b></label>
        <input type="range" id="ncsim-hp-s" min="10" max="100" value="${b.hpPct}" style="width:100%;accent-color:#ef4444;">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div style="display:flex;flex-direction:column;gap:5px;">
          <b style="font-size:11.5px;color:#fde68a;">🧪 ยาบัฟ (Buff Potions)</b>
          ${potKeys.map(k => {
            const sId = `bp_${k}_s`, lId = `bp_${k}_l`;
            return `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 7px;background:rgba(12,10,22,0.85);border-radius:8px;font-size:11px;">
              <span>${potLabels[k]}</span>
              <div style="display:flex;gap:3px;">
                <button type="button" class="ncsim-btn ncsim-btn-sm ${b.buffs.pots.includes(sId) ? 'active' : ''}" data-pk="${k}" data-pid="${sId}">เล็ก</button>
                <button type="button" class="ncsim-btn ncsim-btn-sm ${b.buffs.pots.includes(lId) ? 'active' : ''}" data-pk="${k}" data-pid="${lId}">ใหญ่</button>
              </div>
            </div>`;
          }).join('')}
          <b style="font-size:11.5px;color:#fde68a;margin-top:4px;">🍲 อาหารบัฟ</b>
          <select id="ncsim-dish-s" class="ncsim-select"><option value="">— ไม่กินอาหาร —</option>${(idx.wiki.life && idx.wiki.life.dishes || []).map(d => `<option value="${esc(d.id)}" ${b.buffs.dish === d.id ? 'selected' : ''}>🍲 ${esc(d.n.th)}</option>`).join('')}</select>
        </div>
        <div style="display:flex;flex-direction:column;gap:5px;">
          <b style="font-size:11.5px;color:#93c5fd;">👥 บัฟปาร์ตี้ &amp; กิลด์</b>
          ${E.PARTY_BUFFS.map(pb => `<button type="button" class="ncsim-btn ncsim-btn-sm ${b.buffs.party.includes(pb.id) ? 'active' : ''}" data-ptid="${pb.id}" style="justify-content:space-between;"><span>${esc(pb.name)}</span><span style="font-size:9.5px;color:#94a3b8;">${esc(pb.tag)}</span></button>`).join('')}
          <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:3px;">
            ${E.GUILD_BUFFS.map(gb => `<button type="button" class="ncsim-btn ncsim-btn-sm ${b.buffs.guild.includes(gb.id) ? 'active' : ''}" data-gbid="${gb.id}">${esc(gb.name)}</button>`).join('')}
          </div>
        </div>
      </div>
    `;
    document.getElementById('ncsim-hp-s').oninput = (ev) => { b.hpPct = Number(ev.target.value) || 100; recomputeAll(false); };
    body.querySelectorAll('[data-pid]').forEach(btn => {
      btn.onclick = () => {
        const k = btn.dataset.pk, id = btn.dataset.pid, had = b.buffs.pots.includes(id);
        b.buffs.pots = b.buffs.pots.filter(x => !x.startsWith(`bp_${k}_`));
        if (!had) b.buffs.pots.push(id);
        persistBuilds(); recomputeAll(false);
      };
    });
    document.getElementById('ncsim-dish-s').onchange = (ev) => { b.buffs.dish = ev.target.value || null; persistBuilds(); recomputeAll(false); };
    body.querySelectorAll('[data-ptid]').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.ptid;
        b.buffs.party = b.buffs.party.includes(id) ? b.buffs.party.filter(x => x !== id) : [...b.buffs.party, id];
        persistBuilds(); recomputeAll(false);
      };
    });
    body.querySelectorAll('[data-gbid]').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.gbid;
        b.buffs.guild = b.buffs.guild.includes(id) ? b.buffs.guild.filter(x => x !== id) : [...b.buffs.guild, id];
        persistBuilds(); recomputeAll(false);
      };
    });
  }

  function renderWinDps(body) {
    const sim = state.lastInstantSim;
    if (!sim) return;
    let cmpHtml = '';
    if (state.baselineA) {
      const cmp = E.compareBuilds(idx, state.baselineA, state.build, state.targetCat === 'dummy' ? state.customDummy : state.targetId, {
        durationSec: 30, night: state.env.night, mode: state.env.mode, targetCount: state.env.targetCount, bossAttacks: state.env.bossAttacks, godMode: state.env.godMode,
      });
      const sign = cmp.dpsDiff >= 0 ? '+' : '';
      const col = cmp.dpsDiff > 0 ? '#4ade80' : (cmp.dpsDiff < 0 ? '#f87171' : '#cbd5e1');
      cmpHtml = `
        <div style="background:rgba(30,58,138,0.28);border:1px solid rgba(96,165,250,0.5);border-radius:10px;padding:9px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <b style="color:#93c5fd;font-size:12px;">⚖️ Build A (${esc(state.baselineA.name)}) vs ปัจจุบัน</b>
            <b style="color:${col};font-family:monospace;font-size:13.5px;">${sign}${cmp.dpsDiff.toLocaleString()} DPS (${sign}${cmp.dpsPct}%)</b>
          </div>
          <div style="font-size:11px;color:#cbd5e1;margin-top:4px;">A: <b>${cmp.A.dps.toLocaleString()}</b> DPS · B: <b style="color:#fde68a;">${cmp.B.dps.toLocaleString()}</b> DPS · EHP ${cmp.ehpDiff >= 0 ? '+' : ''}${cmp.ehpDiff.toLocaleString()}</div>
        </div>
      `;
    }

    body.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">
        <div style="display:flex;gap:4px;">
          <button type="button" class="ncsim-btn ncsim-btn-sm" data-isim="10">⚡ 10s</button>
          <button type="button" class="ncsim-btn ncsim-btn-sm" data-isim="30">⚡ 30s</button>
          <button type="button" class="ncsim-btn ncsim-btn-sm" data-isim="60">⚡ 60s</button>
          <button type="button" class="ncsim-btn ncsim-btn-sm ncsim-btn-gold" data-isim="kill">☠️ จนบอสตาย</button>
        </div>
        <div style="display:flex;gap:5px;">
          <button type="button" class="ncsim-btn ncsim-btn-sm ncsim-btn-gold" id="ncsim-dps-opt">🏆 Auto-Optimize</button>
          <button type="button" class="ncsim-btn ncsim-btn-sm ncsim-btn-emerald" id="ncsim-dps-exp">📤 ส่งออก Plan</button>
        </div>
      </div>
      ${cmpHtml}
      <div class="ncsim-kpi-row">
        <div class="ncsim-kpi"><div class="ncsim-kpi-lbl">🔥 DPS เฉลี่ย (${sim.elapsedSec}s)</div><div class="ncsim-kpi-val">${sim.dps.toLocaleString()}</div><div class="ncsim-kpi-sub">Burst 5s: ${sim.burstDps5s.toLocaleString()}</div></div>
        <div class="ncsim-kpi"><div class="ncsim-kpi-lbl">⏱️ เวลาฆ่าบอส</div><div class="ncsim-kpi-val" style="color:#7dd3fc;">${sim.ttkSec != null ? sim.ttkSec + 's' : '—'}</div><div class="ncsim-kpi-sub">แตกเกราะ ${sim.armorBreaks} ครั้ง</div></div>
        <div class="ncsim-kpi"><div class="ncsim-kpi-lbl">💥 Max Hit</div><div class="ncsim-kpi-val" style="color:#fbbf24;">${sim.maxHit.toLocaleString()}</div><div class="ncsim-kpi-sub">Crit ${sim.critRatePct}% · Hit ${sim.hitRatePct}%</div></div>
        <div class="ncsim-kpi"><div class="ncsim-kpi-lbl">🛡️ การยืนชน</div><div class="ncsim-kpi-val" style="color:${sim.survived ? '#4ade80' : '#f87171'};">${sim.survived ? 'รอด' : 'ตาย'}</div><div class="ncsim-kpi-sub">โดน ${sim.incomingDps}/s · ฮีล ${sim.healPerSec}/s</div></div>
      </div>
      <div style="display:flex;flex-direction:column;gap:5px;">
        <b style="font-size:11.5px;color:#fde68a;">⚔️ สัดส่วนดาเมจต่อสกิล / รูน / การ์ด (เป้า: ${esc(sim.target.name)})</b>
        ${(sim.skillBreakdown || []).slice(0, 8).map(row => {
          const c = (E.ELEMENT_INFO[row.el] || E.ELEMENT_INFO.neutral).color;
          return `<div class="ncsim-bar-row">
            <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:700;">${esc(row.name)}</span>
            <div class="ncsim-bar-track"><div class="ncsim-bar-fill" style="width:${Math.max(2, row.sharePct)}%;background:${c};"></div></div>
            <span style="text-align:right;font-family:monospace;color:#fde68a;">${row.dps.toLocaleString()}/s</span>
            <span style="text-align:right;font-family:monospace;color:#94a3b8;">${row.sharePct}%</span>
          </div>`;
        }).join('')}
      </div>
    `;

    body.querySelectorAll('[data-isim]').forEach(btn => {
      btn.onclick = () => {
        const isKill = btn.dataset.isim === 'kill';
        state.lastInstantSim = E.simulateFight(idx, state.build, state.targetCat === 'dummy' ? state.customDummy : state.targetId, {
          durationSec: isKill ? 300 : Number(btn.dataset.isim), stopOnKill: isKill,
          night: state.env.night, mode: state.env.mode, targetCount: state.env.targetCount,
          bossAttacks: state.env.bossAttacks, godMode: state.env.godMode,
        });
        renderFloatingWindow();
      };
    });
    document.getElementById('ncsim-dps-opt').onclick = openOptimizeModal;
    document.getElementById('ncsim-dps-exp').onclick = openExportPlanModal;
  }

  // =========================================================================
  // MODALS (ITEM PICKER, SET PICKER, RUNE PICKER, CARD PICKER, LIVE IMPORT, OPTIMIZE, EXPORT, MCP)
  // =========================================================================
  function showModal(title, bodyHtml, onMount) {
    state.modal = title;
    const rootEl = document.getElementById('ncsim-modal-root');
    rootEl.innerHTML = `<div class="ncsim-modal-backdrop" id="ncsim-mbg"><div class="ncsim-modal"><div class="ncsim-modal-head"><span>${title}</span><button type="button" class="ncsim-btn ncsim-btn-sm" id="ncsim-mx">✕ ปิด</button></div><div class="ncsim-modal-body" id="ncsim-mbody">${bodyHtml}</div></div></div>`;
    const close = () => { state.modal = null; rootEl.innerHTML = ''; };
    document.getElementById('ncsim-mx').onclick = close;
    document.getElementById('ncsim-mbg').onclick = (ev) => { if (ev.target.id === 'ncsim-mbg') close(); };
    if (onMount) onMount(document.getElementById('ncsim-mbody'), close);
  }

  function openEquipSlotModal(slot) {
    const b = state.build;
    const cur = b.equip[slot] ? JSON.parse(JSON.stringify(b.equip[slot])) : null;
    const wikiSlot = (slot === 'acc1' || slot === 'acc2') ? 'acc' : slot;
    const allowedW = E.JOB_WEAPONS[b.job] || [];
    let onlyJobW = slot === 'weapon', searchQ = '', rarityF = '';

    showModal(`⚔️ ช่อง ${E.SLOT_LABELS[slot]} · เสกไอเทม / ตีบวก / เกรด / ออฟชัน`, `<div></div>`, (body, close) => {
      const draw = () => {
        const curItem = cur && idx.itemsById[cur.id];
        const rowsHtml = cur ? (cur.rows || []).map((r, ri) => `
          <div style="display:flex;gap:5px;align-items:center;">
            <select class="ncsim-select" data-ok="${ri}" style="flex:1;">${Object.entries(E.GEAROPT).map(([ok, ov]) => `<option value="${ok}" ${r.k === ok ? 'selected' : ''}>${esc(ov.th)}</option>`).join('')}</select>
            ${E.GEAROPT[r.k] && E.GEAROPT[r.k].subs ? `<select class="ncsim-select" data-osub="${ri}" style="width:90px;">${E.GEAROPT[r.k].subs.map(sb => `<option value="${sb}" ${r.sub === sb ? 'selected' : ''}>${sb}</option>`).join('')}</select>` : ''}
            <input type="number" class="ncsim-input" data-ov="${ri}" value="${r.v}" style="width:64px;">
            <button type="button" class="ncsim-btn ncsim-btn-sm ncsim-btn-danger" data-odel="${ri}">✕</button>
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
            <div style="background:rgba(32,26,52,0.94);border:1.5px solid ${E.GRADES[cur.g || 0].color};border-radius:11px;padding:10px;display:flex;flex-direction:column;gap:8px;">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
                <div style="display:flex;align-items:center;gap:8px;">
                  ${atlasIconHtml(curItem.ic, 40)}
                  <div><b style="color:${E.GRADES[cur.g || 0].color};">${cur.ref > 0 ? `+${cur.ref} ` : ''}${esc(curItem.n.th)}</b><div style="font-size:10.5px;color:#94a3b8;">Lv.${curItem.lv || 1}${curItem.atk ? ` · ATK ${curItem.atk}` : ''}${curItem.el ? ` · ${E.ELEMENT_INFO[curItem.el].th}` : ''}</div></div>
                </div>
                <div style="display:flex;gap:5px;">
                  <button type="button" class="ncsim-btn ncsim-btn-sm ncsim-btn-danger" id="ncsim-eu-rm">ถอดออก</button>
                  <button type="button" class="ncsim-btn ncsim-btn-sm ncsim-btn-gold" id="ncsim-eu-ok">✓ ใช้งาน</button>
                </div>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <label style="font-size:11px;color:#fde68a;">🔨 ตีบวก: <b>+${cur.ref}</b><input type="range" min="0" max="10" value="${cur.ref}" id="ncsim-eu-ref" style="width:100%;accent-color:#f59e0b;"></label>
                <div><div style="font-size:11px;color:#fde68a;margin-bottom:3px;">✨ เกรด (G0–G5)</div><div style="display:flex;gap:3px;">${E.GRADES.map(gr => `<button type="button" class="ncsim-btn ncsim-btn-sm ${cur.g === gr.g ? 'active' : ''}" data-eug="${gr.g}" style="color:${gr.color};">G${gr.g}</button>`).join('')}</div></div>
              </div>
              <div style="display:flex;flex-direction:column;gap:5px;">
                <div style="display:flex;justify-content:space-between;"><span style="font-size:11px;color:#a5f3fc;font-weight:700;">◆ ออฟชันแถว (สูงสุด 4 แถว)</span>${(cur.rows || []).length < 4 ? `<button type="button" class="ncsim-btn ncsim-btn-sm" id="ncsim-eu-addopt">+ เพิ่มออฟ</button>` : ''}</div>
                ${rowsHtml}
              </div>
            </div>
          ` : ''}
          <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
            <input type="text" class="ncsim-input" id="ncsim-eu-q" placeholder="🔍 ค้นหาไอเทม..." value="${esc(searchQ)}" style="flex:1;">
            <select class="ncsim-select" id="ncsim-eu-rar"><option value="">ทุกระดับหายาก</option>${['common', 'uncommon', 'rare', 'epic', 'legend', 'legendary'].map(r => `<option value="${r}" ${rarityF === r ? 'selected' : ''}>${r}</option>`).join('')}</select>
            ${slot === 'weapon' ? `<label style="font-size:11px;display:flex;align-items:center;gap:4px;"><input type="checkbox" id="ncsim-eu-jw" ${onlyJobW ? 'checked' : ''}> เฉพาะอาชีพนี้</label>` : ''}
            <span style="font-size:11px;color:#94a3b8;">${pool.length} ชิ้น</span>
          </div>
          <div class="ncsim-pick-grid">
            ${pool.slice(0, 120).map(it => `<button type="button" class="ncsim-pick-item" data-pi="${esc(it.id)}">${atlasIconHtml(it.ic, 34)}<div style="min-width:0;flex:1;"><div style="font-size:11.5px;font-weight:700;color:${(E.RARITY_INFO[it.r] && E.RARITY_INFO[it.r].color) || '#e2e8f0'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(it.n.th)}</div><div style="font-size:10px;color:#94a3b8;">Lv.${it.lv || 1}${it.wt ? ` · ${it.wt}` : ''}${it.atk ? ` · ATK ${it.atk}` : ''}</div></div></button>`).join('')}
          </div>
        `;
        if (cur && curItem) {
          document.getElementById('ncsim-eu-rm').onclick = () => { b.equip[slot] = null; persistBuilds(); recomputeAll(false); close(); };
          document.getElementById('ncsim-eu-ok').onclick = () => { b.equip[slot] = cur; persistBuilds(); recomputeAll(false); close(); };
          document.getElementById('ncsim-eu-ref').oninput = (ev) => { cur.ref = Number(ev.target.value) || 0; draw(); };
          body.querySelectorAll('[data-eug]').forEach(btn => { btn.onclick = () => { cur.g = Number(btn.dataset.eug); draw(); }; });
          const addBtn = document.getElementById('ncsim-eu-addopt');
          if (addBtn) addBtn.onclick = () => { cur.rows = cur.rows || []; cur.rows.push({ k: slot === 'weapon' ? 'atk' : 'hpPct', v: 4, tier: 2 }); draw(); };
          body.querySelectorAll('[data-ok]').forEach(sel => { sel.onchange = () => { const ri = Number(sel.dataset.ok), nk = sel.value, df = E.GEAROPT[nk]; cur.rows[ri] = { k: nk, v: df.tiers ? df.tiers[2][1] : 4, tier: 2, sub: df.subs ? df.subs[0] : undefined }; draw(); }; });
          body.querySelectorAll('[data-osub]').forEach(sel => { sel.onchange = () => { cur.rows[Number(sel.dataset.osub)].sub = sel.value; }; });
          body.querySelectorAll('[data-ov]').forEach(inp => { inp.onchange = () => { cur.rows[Number(inp.dataset.ov)].v = Number(inp.value) || 0; }; });
          body.querySelectorAll('[data-odel]').forEach(btn => { btn.onclick = () => { cur.rows.splice(Number(btn.dataset.odel), 1); draw(); }; });
        }
        document.getElementById('ncsim-eu-q').oninput = (ev) => { searchQ = ev.target.value; draw(); };
        document.getElementById('ncsim-eu-rar').onchange = (ev) => { rarityF = ev.target.value; draw(); };
        const jw = document.getElementById('ncsim-eu-jw');
        if (jw) jw.onchange = (ev) => { onlyJobW = ev.target.checked; draw(); };
        body.querySelectorAll('[data-pi]').forEach(btn => {
          btn.onclick = () => { b.equip[slot] = { id: btn.dataset.pi, ref: cur ? cur.ref : 6, g: cur ? cur.g : 2, rows: cur ? cur.rows : [] }; persistBuilds(); recomputeAll(false); close(); };
        });
      };
      draw();
    });
  }

  function openSetPickerModal() {
    const b = state.build;
    const sets = (idx.wiki.equip.sets || []).slice().sort((a, z) => (z.lv || 0) - (a.lv || 0));
    showModal('👕 เลือกใส่ชุดเซ็ต 3 ชิ้นทันที (เสื้อ + กางเกง + ประดับ 1)', `<input type="text" class="ncsim-input" id="ncsim-sp-q" placeholder="🔍 ค้นหาชื่อเซ็ต..." style="width:100%;"><div class="ncsim-pick-grid" id="ncsim-sp-l"></div>`, (body, close) => {
      const draw = (q = '') => {
        const low = q.toLowerCase();
        document.getElementById('ncsim-sp-l').innerHTML = sets.filter(s => !low || (s.n && (s.n.th + ' ' + s.n.en).toLowerCase().includes(low)) || (s.pas && s.pas.th.toLowerCase().includes(low))).map(s => `
          <button type="button" class="ncsim-pick-item" data-ps="${esc(s.id)}" style="flex-direction:column;align-items:flex-start;gap:3px;">
            <div style="display:flex;justify-content:space-between;width:100%;"><b style="color:#fde68a;">${esc(s.n.th)}</b><span class="ncsim-tag">Lv.${s.lv}</span></div>
            <div style="font-size:10px;color:#93c5fd;">3pc: ${esc(s.b3 && s.b3.th)}</div>
            <div style="font-size:10px;color:#86efac;">✨ ${esc(s.pas && s.pas.th)}</div>
          </button>
        `).join('');
        body.querySelectorAll('[data-ps]').forEach(btn => {
          btn.onclick = () => {
            const st = idx.setsById[btn.dataset.ps];
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
      document.getElementById('ncsim-sp-q').oninput = (ev) => draw(ev.target.value);
    });
  }

  function openRunePickerModal(skillId, slotIdx) {
    const b = state.build, isBasic = skillId === '__basic__', sk = !isBasic ? idx.skillsById[skillId] : null;
    const cur = isBasic ? b.basicRunes[slotIdx] : ((b.runes[skillId] || [])[slotIdx] || null);
    let tier = (cur && cur.tier) || 2, rollPct = Math.round(((cur && cur.qb) || 0.1) * 100);
    const eligible = isBasic ? (idx.wiki.runes || []).filter(r => r.on === 'basic' || r.kind === 'proc' || r.kind === 'pierce' || r.kind === 'gun') : (idx.wiki.runes || []).filter(r => !sk || !sk.fit || sk.fit.includes(r.k));

    showModal(`💠 ใส่รูน · ${isBasic ? 'ตีปกติ' : esc(sk.n.th)} ช่อง ${slotIdx + 1}`, `
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;background:rgba(16,12,30,0.9);padding:9px;border-radius:10px;">
        <div style="display:flex;gap:4px;">${[1, 2, 3].map(t => `<button type="button" class="ncsim-btn ncsim-btn-sm ${tier === t ? 'active' : ''}" data-rt="${t}">T${t}</button>`).join('')}</div>
        <label style="display:flex;align-items:center;gap:6px;font-size:11px;flex:1;"><span>Roll:</span><input type="range" min="-25" max="25" value="${rollPct}" id="ncsim-rr" style="flex:1;accent-color:#a855f7;"><b id="ncsim-rrv" style="color:#fde68a;">${rollPct >= 0 ? '+' : ''}${rollPct}%</b></label>
        ${cur ? `<button type="button" class="ncsim-btn ncsim-btn-sm ncsim-btn-danger" id="ncsim-rclr">ถอดรูน</button>` : ''}
      </div>
      <div class="ncsim-pick-grid" id="ncsim-rg"></div>
    `, (body, close) => {
      const draw = () => {
        document.getElementById('ncsim-rg').innerHTML = eligible.map(r => `<button type="button" class="ncsim-pick-item" data-pr="${esc(r.k)}">${r.ic && r.ic[tier - 1] ? atlasIconHtml(r.ic[tier - 1], 32) : '💠'}<div style="min-width:0;flex:1;"><div style="font-size:11.5px;font-weight:800;color:#e9d5ff;">${esc(r.n.th)} T${tier}</div><div style="font-size:10px;color:#94a3b8;">${esc(r.t && r.t[tier - 1] && r.t[tier - 1].th)}</div></div></button>`).join('');
        body.querySelectorAll('[data-pr]').forEach(btn => {
          btn.onclick = () => {
            const obj = { k: btn.dataset.pr, tier, qb: rollPct / 100, qd: rollPct / 100 };
            if (isBasic) b.basicRunes[slotIdx] = obj;
            else { if (!b.runes[skillId]) b.runes[skillId] = [null, null]; b.runes[skillId][slotIdx] = obj; }
            persistBuilds(); recomputeAll(false); close();
          };
        });
      };
      draw();
      body.querySelectorAll('[data-rt]').forEach(btn => { btn.onclick = () => { tier = Number(btn.dataset.rt); body.querySelectorAll('[data-rt]').forEach(x => x.classList.toggle('active', Number(x.dataset.rt) === tier)); draw(); }; });
      document.getElementById('ncsim-rr').oninput = (ev) => { rollPct = Number(ev.target.value) || 0; document.getElementById('ncsim-rrv').textContent = `${rollPct >= 0 ? '+' : ''}${rollPct}%`; };
      const clr = document.getElementById('ncsim-rclr');
      if (clr) clr.onclick = () => { if (isBasic) b.basicRunes[slotIdx] = null; else if (b.runes[skillId]) b.runes[skillId][slotIdx] = null; persistBuilds(); recomputeAll(false); close(); };
    });
  }

  function openCardPickerModal(role, slotIdx) {
    const b = state.build, cur = b.cards[role][slotIdx];
    let lv = (cur && cur.lv) || 5, q = '';
    const otherRole = role === 'pas' ? 'act' : 'pas';
    const blocked = new Set((b.cards[otherRole] || []).filter(Boolean).map(x => x.id));

    showModal(`🃏 เลือกการ์ดมอนสเตอร์ (${role === 'pas' ? 'Passive' : 'Active'} ช่อง ${slotIdx + 1})`, `
      <div style="display:flex;gap:8px;align-items:center;">
        <input type="text" class="ncsim-input" id="ncsim-cq" placeholder="🔍 ค้นหาชื่อมอน / เอฟเฟกต์..." style="flex:1;">
        <label style="display:flex;align-items:center;gap:5px;font-size:11px;color:#fde68a;">Lv:<input type="range" min="1" max="10" value="${lv}" id="ncsim-clv" style="width:85px;"><b id="ncsim-clvv">${lv}</b></label>
        ${cur ? `<button type="button" class="ncsim-btn ncsim-btn-sm ncsim-btn-danger" id="ncsim-cclr">ถอดการ์ด</button>` : ''}
      </div>
      <div class="ncsim-pick-grid" id="ncsim-cg"></div>
    `, (body, close) => {
      const draw = () => {
        const low = q.toLowerCase();
        const list = (idx.wiki.cards || []).filter(c => !blocked.has(c.id) && (!low || c.id.toLowerCase().includes(low) || (c.mon && (c.mon.th + ' ' + c.mon.en).toLowerCase().includes(low)) || (c.eff || []).some(e => e.txt && e.txt[0] && (e.txt[0].th + ' ' + e.txt[0].en).toLowerCase().includes(low))));
        document.getElementById('ncsim-cg').innerHTML = list.slice(0, 120).map(c => `<button type="button" class="ncsim-pick-item" data-pc="${esc(c.id)}">${monThumbHtml(idx.monsById[c.id] || c, 36)}<div style="min-width:0;flex:1;"><div style="font-size:11.5px;font-weight:800;color:#f3e8ff;">${esc(c.mon.th)} Lv.${c.lv}</div><div style="font-size:10px;color:#c084fc;">${role === 'act' ? `⚡ ${esc(c.art.th)} (CD ${c.cd}s)` : esc((c.eff || []).map(e => e.txt && e.txt[0] && e.txt[0].th).filter(Boolean).join(' · '))}</div></div></button>`).join('');
        body.querySelectorAll('[data-pc]').forEach(btn => { btn.onclick = () => { b.cards[role][slotIdx] = { id: btn.dataset.pc, lv }; persistBuilds(); recomputeAll(false); close(); }; });
      };
      draw();
      document.getElementById('ncsim-cq').oninput = (ev) => { q = ev.target.value; draw(); };
      document.getElementById('ncsim-clv').oninput = (ev) => { lv = Number(ev.target.value) || 1; document.getElementById('ncsim-clvv').textContent = lv; };
      const clr = document.getElementById('ncsim-cclr');
      if (clr) clr.onclick = () => { b.cards[role][slotIdx] = null; persistBuilds(); recomputeAll(false); close(); };
    });
  }

  async function openLiveImportModal() {
    showModal('📥 ดึงข้อมูลตัวละครจริงจากจอเกม (Live Import)', `<div style="padding:18px;text-align:center;color:#94a3b8;">⏳ กำลังตรวจสอบจอเกมที่เปิดอยู่...</div>`, async (body, close) => {
      try {
        const res = await fetch('/api/profiles');
        const raw = await res.json();
        const profiles = (Array.isArray(raw) ? raw : (raw.profiles || [])).filter(p => p && p.isRunning && p.debugPort);
        if (!profiles.length) { body.innerHTML = `<div style="color:#fca5a5;">ไม่พบจอเกมที่กำลังเปิดอยู่</div>`; return; }
        body.innerHTML = `
          <div style="font-size:11.5px;color:#cbd5e1;">คลิกจอที่ต้องการดึง <b>ตัวละคร + ของที่ใส่ (ตีบวก/เกรด/ออฟชัน) + รูนทุกสกิล + การ์ดมอน</b> เข้ามาเดินและทดสอบในสนามจริงทันที:</div>
          <div class="ncsim-pick-grid">
            ${profiles.map(p => {
              const ls = p.liveState || {};
              return `<button type="button" class="ncsim-pick-item" data-ipid="${esc(p.id)}" data-ipn="${esc(p.name)}" data-ipp="${esc(p.debugPort)}"><span style="font-size:22px;">🎮</span><div><div style="font-weight:800;color:#fde68a;">${esc(p.name)} · ${esc(ls.charName || p.charName || p.lastCharName || '')}</div><div style="font-size:10.5px;color:#93c5fd;">${esc(ls.charClass || p.lastCharClass || '')} · Lv.${ls.baseLv || '?'}</div></div></button>`;
            }).join('')}
          </div>
        `;
        body.querySelectorAll('[data-ipid]').forEach(btn => {
          btn.onclick = async () => {
            btn.disabled = true; btn.style.opacity = '0.6';
            try {
              const pid = btn.dataset.ipid, dport = btn.dataset.ipp;
              let imported = null;
              const simRes = await fetch(`/api/sim/import-live/${encodeURIComponent(pid)}`, { method: 'POST' }).catch(() => null);
              if (simRes && simRes.ok) { const sj = await simRes.json(); if (sj && sj.ok && sj.build) imported = E.normalizeBuild(idx, sj.build); }
              if (!imported && dport) {
                const evRes = await fetch(`http://127.0.0.1:${encodeURIComponent(dport)}/api/eval`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ code: E.LIVE_IMPORT_EVAL_SNIPPET, timeoutMs: 7000 }),
                });
                const j = await evRes.json();
                if (!j || j.success === false || !j.result || j.result.error) throw new Error((j && (j.error || (j.result && j.result.error))) || 'ดึงข้อมูลไม่สำเร็จ');
                imported = E.importLiveCharacterToBuild(idx, j.result, { id: pid, name: btn.dataset.ipn });
              }
              if (!imported) throw new Error('เชื่อมต่อจอเกมไม่ได้');
              state.build = imported; persistBuilds(); recomputeAll(true); close();
              toast(`📥 นำเข้า "${imported.name}" พร้อมของ/รูน/การ์ดครบชุดแล้ว!`);
            } catch (err) { btn.disabled = false; btn.style.opacity = '1'; toast('❌ ' + err.message, 'err'); }
          };
        });
      } catch (err) { body.innerHTML = `<div style="color:#fca5a5;">❌ ${esc(err.message)}</div>`; }
    });
  }

  function openOptimizeModal() {
    const b = state.build, t = getActiveTarget();
    showModal(`🏆 Auto-Optimize Build vs ${esc(t.name)}`, `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
        <label style="font-size:11px;color:#fde68a;">ตีบวก (+0..+10)<input type="number" id="ncsim-or" min="0" max="10" value="7" class="ncsim-input" style="width:100%;margin-top:3px;"></label>
        <label style="font-size:11px;color:#fde68a;">เกรด (G0–G5)<input type="number" id="ncsim-og" min="0" max="5" value="3" class="ncsim-input" style="width:100%;margin-top:3px;"></label>
        <label style="font-size:11px;color:#fde68a;">รูน (T1–T3)<input type="number" id="ncsim-ort" min="1" max="3" value="2" class="ncsim-input" style="width:100%;margin-top:3px;"></label>
      </div>
      <div style="display:flex;justify-content:flex-end;"><button type="button" class="ncsim-btn ncsim-btn-gold" id="ncsim-orun">⚡ คำนวณจัดของที่แรงที่สุด</button></div>
      <div id="ncsim-oout"></div>
    `, (body, close) => {
      document.getElementById('ncsim-orun').onclick = () => {
        const out = document.getElementById('ncsim-oout');
        out.innerHTML = `<div style="color:#fde68a;">⏳ กำลังค้นหาชุดที่แรงที่สุด...</div>`;
        setTimeout(() => {
          const res = E.optimizeBuild(idx, {
            build: b, targetId: state.targetCat === 'dummy' ? state.customDummy : state.targetId,
            refine: Number(document.getElementById('ncsim-or').value) || 7,
            grade: Number(document.getElementById('ncsim-og').value) || 3,
            runeTier: Number(document.getElementById('ncsim-ort').value) || 2,
            night: state.env.night, targetCount: state.env.targetCount,
          });
          out.innerHTML = `<div style="background:rgba(16,185,129,0.12);border:1px solid rgba(52,211,153,0.45);border-radius:10px;padding:10px;display:flex;flex-direction:column;gap:6px;">
            <div style="display:flex;justify-content:space-between;align-items:center;"><b style="color:#6ee7b7;">DPS: ${res.before.dps.toLocaleString()} → ${res.after.dps.toLocaleString()} (+${res.dpsGainPct}%)</b><button type="button" class="ncsim-btn ncsim-btn-emerald" id="ncsim-oapp">✓ ใช้งานทันที</button></div>
            <div style="font-size:11px;">${res.upgrades.map(u => `<div>• ${esc(u.slot)}: <b style="color:#fde68a;">${esc(u.name)}</b> <span style="color:#4ade80;">(${u.dpsAfter.toLocaleString()} DPS)</span></div>`).join('')}</div>
          </div>`;
          document.getElementById('ncsim-oapp').onclick = () => {
            if (!state.baselineA) state.baselineA = JSON.parse(JSON.stringify(state.build));
            state.build = res.optimizedBuild; persistBuilds(); recomputeAll(true); close();
            toast(`🏆 อัปเดตเป็นบิลด์ Optimized แล้ว (+${res.dpsGainPct}% DPS)!`);
          };
        }, 25);
      };
    });
  }

  function openExportPlanModal() {
    const plan = E.exportBuildToPlanGear(idx, state.build, { planName: `🧪 Sim: ${state.build.name}` });
    showModal('📤 ส่งออกบิลด์เป็น Manager Profile Plan / Set Gear', `
      <div style="display:flex;gap:6px;"><input type="text" class="ncsim-input" id="ncsim-en" value="${esc(plan.name)}" style="flex:1;"><button type="button" class="ncsim-btn ncsim-btn-emerald" id="ncsim-esave">💾 สร้าง Plan ใหม่</button><button type="button" class="ncsim-btn" id="ncsim-ecopy">📋 คัดลอก JSON</button></div>
      <div class="ncsim-code" style="max-height:300px;">${esc(JSON.stringify(plan, null, 2))}</div>
    `, (body, close) => {
      document.getElementById('ncsim-ecopy').onclick = () => { navigator.clipboard.writeText(JSON.stringify(plan, null, 2)); toast('📋 คัดลอก JSON แล้ว'); };
      document.getElementById('ncsim-esave').onclick = async () => {
        const name = document.getElementById('ncsim-en').value.trim() || plan.name;
        try {
          const r = await fetch('/api/plan-profiles', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description: `Build Simulate (${state.build.job} Lv.${state.build.lv})`, plan: { targetClass: state.build.job, statPlan: state.build.base, skillPlan: state.build.skills, gearPlan: { enabled: true, steps: plan.gearSteps }, cards: plan.cards, meta: plan.meta } }),
          });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          close(); toast(`📤 สร้าง Plan "${name}" ใน Manager สำเร็จ!`);
        } catch (err) { toast('❌ ' + err.message, 'err'); }
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
    showModal('🤖 เชื่อมต่อ MCP Server ให้ AI ช่วยออกแบบ Build', `
      <div style="font-size:12px;color:#cbd5e1;">วาง Config ด้านล่างใน Antigravity / Claude Desktop / Cursor เพื่อให้ AI ค้นหาข้อมูล Wiki, จำลองสู้บอส 52 ตัว, ดึงจอเกมจริงมาวิเคราะห์ และส่งบิลด์กลับมาแสดงสดบนสนามนี้:</div>
      <div style="position:relative;"><div class="ncsim-code">${esc(mcpCfg)}</div><button type="button" class="ncsim-btn ncsim-btn-gold ncsim-btn-sm" id="ncsim-mcopy" style="position:absolute;top:8px;right:8px;">📋 คัดลอก</button></div>
    `, () => {
      document.getElementById('ncsim-mcopy').onclick = () => { navigator.clipboard.writeText(mcpCfg); toast('📋 คัดลอก MCP Config แล้ว!'); };
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
