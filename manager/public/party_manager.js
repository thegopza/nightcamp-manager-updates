// PmheeNC Nightcamp Manager — Party & Co-op Quest Sync Drawer (crown tab + topbar button).
(function () {
  'use strict';
  const API = (typeof API_BASE === 'string' ? API_BASE : '') + '/api/parties';
  const LOOT = {
    personal: '🎒 ใครเจอคนนั้นได้',
    turn: '🔄 ผลัดกันรับ',
    'round-robin': '🎲 สุ่มให้สมาชิก',
    leader: '👑 หัวตี้เก็บ'
  };
  const EXP = {
    'even-share': '⚖️ แบ่งเท่ากัน (ด้ายเชิด ดรอป +5%)',
    individual: '⚔️ ต่างคนต่างได้'
  };
  const GROUP = {
    g: '🤝 เกาะกลุ่ม (เดินเควส/ด้ายแดง)',
    s: '🏃 แยกตีอิสระ'
  };
  const AUTO_MODE_OPTS = [
    { value: 'auto', label: '✨ อัตโนมัติ (ตามอาชีพ)' },
    { value: 'farm', label: '⚔️ ฟาร์ม / ตีมอนปกติ' },
    { value: 'support_fight', label: '✨ ซัพ + ช่วยตี' },
    { value: 'support_only', label: '🛡️ ซัพอย่างเดียว (ไม่ใช้สกิลตี)' }
  ];
  const AUTO_MODE_LABEL = AUTO_MODE_OPTS.reduce((acc, o) => { acc[o.value] = o.label; return acc; }, {});
  const CROWN = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 7.5l4.2 3.6L12 4l4.8 7.1L21 7.5l-1.8 10.2H4.8L3 7.5zm2 12.2h14v1.8H5v-1.8z"/></svg>';
  const CROWN_SM = CROWN.replace('<svg', '<svg width="16" height="16"');
  const HAND_ON_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 11V6a1.5 1.5 0 0 0-3 0v4"/><path d="M15 10V4.5a1.5 1.5 0 0 0-3 0V10"/><path d="M12 9.5V5.5a1.5 1.5 0 0 0-3 0V11"/><path d="M9 11V7.5a1.5 1.5 0 0 0-3 0V15a6 6 0 0 0 6 6h2a5 5 0 0 0 5-5v-5a1.5 1.5 0 0 0-3 0"/></svg>';
  const HAND_OFF_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 11V6a1.5 1.5 0 0 0-3 0v4" opacity="0.72"/><path d="M15 10V4.5a1.5 1.5 0 0 0-3 0V10" opacity="0.72"/><path d="M12 9.5V5.5a1.5 1.5 0 0 0-3 0V11" opacity="0.72"/><path d="M9 11V7.5a1.5 1.5 0 0 0-3 0V15a6 6 0 0 0 6 6h2a5 5 0 0 0 5-5v-5a1.5 1.5 0 0 0-3 0" opacity="0.72"/><line x1="3.5" y1="3.5" x2="20.5" y2="20.5" stroke="#ef4444" stroke-width="2.6"/><line x1="20.5" y1="3.5" x2="3.5" y2="20.5" stroke="#ef4444" stroke-width="2.6"/></svg>';

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = (t, k) => (typeof window.showToast === 'function' ? window.showToast(t, k) : console.log('[Party]', t));
  const hue = s => { let h = 0; for (const c of String(s || '?')) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
  const initial = s => (String(s || '?').trim()[0] || '?').toUpperCase();
  const setText = (el, txt) => { if (el && el.textContent !== String(txt)) el.textContent = String(txt); };
  const setHtml = (el, html) => { if (el && el.innerHTML !== html) el.innerHTML = html; };

  let data = { parties: [], clients: [], maxMembers: 5 };
  let open = false, pollTimer = null, busy = false, pointerDown = false, pendingRender = false;
  const collapsedParties = new Set();
  let pickerState = { mode: 'leader', partyId: null };

  function resolveMemberAvatarUrl(profileId) {
    if (typeof window.getNightcampProfileAvatarUrl === 'function') {
      return window.getNightcampProfileAvatarUrl(profileId) || '';
    }
    try {
      const prof = (typeof currentProfiles !== 'undefined' && Array.isArray(currentProfiles))
        ? currentProfiles.find(x => String(x.id) === String(profileId))
        : null;
      const liveUrl = prof?.liveState?.portrait;
      if (liveUrl && liveUrl.startsWith('data:image/')) return liveUrl;
      const cached = localStorage.getItem('nc_portrait_' + profileId);
      if (cached && cached.startsWith('data:image/')) return cached;
    } catch (_) {}
    return '';
  }

  function build() {
    const tab = document.createElement('button');
    tab.className = 'pt-tab'; tab.id = 'pt-tab'; tab.type = 'button';
    tab.title = 'ปาร์ตี้ Nightcamp (สูงสุด 5 คน)'; tab.setAttribute('aria-label', 'เปิดหน้าจัดปาร์ตี้');
    tab.innerHTML = CROWN + '<span class="pt-tab-badge" id="pt-tab-badge"></span>';
    const scrim = document.createElement('div'); scrim.className = 'pt-scrim'; scrim.id = 'pt-scrim';
    const drawer = document.createElement('aside');
    drawer.className = 'pt-drawer'; drawer.id = 'pt-drawer'; drawer.setAttribute('aria-label', 'จัดปาร์ตี้ Nightcamp');
    drawer.innerHTML = `
      <header class="pt-head">
        <div class="pt-head-icon">${CROWN}</div>
        <div><h2>ปาร์ตี้ Nightcamp</h2><p>จัดตี้สูงสุด 5 คน · ซิงค์แชนแนลคนน้อยสุด & เดินเควสพร้อมกันในรัศมีด้ายแดง</p></div>
        <button class="pt-close" id="pt-close" type="button" aria-label="ปิด">✕</button>
      </header>
      <div class="pt-body" id="pt-body"></div>
      <footer class="pt-foot">
        <button class="pt-add" id="pt-add" type="button">➕ เพิ่มตี้ (สูงสุด 5 คน)</button>
        <div class="pt-foot-hint">💡 ตัวละครจะเริ่มรวมตี้ทันทีเมื่อออกจาก <b>"ห้องหุ่นไม้ (Lv.1)"</b> เข้าสู่แมพกลางแจ้ง (Lv.2+)<br>คนเลเวลสูงกว่าจะวาร์ปลงมาช่วยเพื่อนที่เควสแมพต่ำกว่าและเกาะกลุ่มในรัศมีด้ายแดง (600px) อัตโนมัติ</div>
      </footer>
      <section class="pt-picker" id="pt-picker" hidden>
        <div class="pt-picker-head">
          <button class="pt-iconbtn" id="pt-pick-back" type="button" aria-label="กลับ">←</button>
          <h3 id="pt-picker-title">เลือกหัวตี้</h3>
        </div>
        <input class="pt-search" id="pt-search" type="search" placeholder="ค้นหาชื่อจอ / ชื่อตัวละคร" autocomplete="off">
        <div class="pt-pick-list" id="pt-pick-list"></div>
      </section>`;
    document.body.append(tab, scrim, drawer);

    tab.addEventListener('click', () => setOpen(true));
    scrim.addEventListener('click', () => setOpen(false));
    drawer.querySelector('#pt-close').addEventListener('click', () => setOpen(false));
    drawer.querySelector('#pt-add').addEventListener('click', () => openPicker({ mode: 'leader', partyId: null }));
    drawer.querySelector('#pt-pick-back').addEventListener('click', closePicker);
    drawer.querySelector('#pt-search').addEventListener('input', renderPicker);
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape' || !open) return;
      if (!document.getElementById('pt-picker').hidden) closePicker(); else setOpen(false);
    });
    drawer.addEventListener('pointerdown', () => { pointerDown = true; });
    window.addEventListener('pointerup', () => {
      if (!pointerDown) return;
      pointerDown = false;
      if (pendingRender) { pendingRender = false; render(); }
    });
    window.addEventListener('pointercancel', () => {
      if (!pointerDown) return;
      pointerDown = false;
      if (pendingRender) { pendingRender = false; render(); }
    });
    drawer.querySelector('#pt-body').addEventListener('change', onChange);
    drawer.querySelector('#pt-body').addEventListener('click', onClick);
    drawer.querySelector('#pt-pick-list').addEventListener('click', e => {
      const b = e.target.closest('[data-pick]');
      if (!b) return;
      if (pickerState.mode === 'member' && pickerState.partyId) {
        addMemberToParty(pickerState.partyId, b.dataset.pick);
      } else {
        createParty(b.dataset.pick);
      }
    });
  }

  function setOpen(v) {
    open = v;
    if (v) document.body.classList.remove('pm-open', 'gd-open', 'hw-open', 'cd-open');
    document.body.classList.toggle('pt-open', v);
    clearInterval(pollTimer);
    if (v) { load(); pollTimer = setInterval(load, 4000); }
    else { closePicker(); pollTimer = setInterval(load, 10000); }
  }
  window.openPartyDrawer = () => setOpen(true);
  window.refreshPartyManagerData = () => load();

  async function api(path, body) {
    const res = await fetch(API + path, body === undefined ? undefined : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => ({ success: false, error: 'HTTP ' + res.status }));
    if (j && Array.isArray(j.parties)) {
      data = j;
      window.__partyManagerData = j;
      if (typeof window.onPartyDataUpdated === 'function') {
        try { window.onPartyDataUpdated(j); } catch (_) {}
      }
      if (pointerDown && body === undefined) pendingRender = true;
      else render();
    }
    return j;
  }

  async function load() {
    if (busy || pointerDown) return;
    try { await api(''); } catch (e) { /* Manager restarting */ }
  }

  function buildFollowOptions(m, p) {
    const isCoopMode = (p && p.expMode !== 'individual');
    const opts = [
      { value: 'none', label: isCoopMode ? '🤝 เกาะกลุ่มช่วยเควส (ด้ายแดง)' : '⚔️ แยกตีอิสระ' },
      { value: 'leader', label: '👑 เกาะติดหัวตี้' }
    ];
    for (const other of (p && p.members) || []) {
      if (!other || other.id === m.id) continue;
      const nm = other.charName || other.profileName || other.id;
      opts.push({ value: 'member:' + other.id, label: '👣 เกาะติด ' + nm });
    }
    return opts;
  }

  function createMemberRowEl(m, p, isLeader) {
    const pid = p.id;
    const row = document.createElement('div');
    row.className = 'pt-row' + (isLeader ? ' leader' : '');
    row.dataset.rowKey = isLeader ? 'leader:' + m.id : 'member:' + m.id;
    const autoModeHtml = AUTO_MODE_OPTS.map(o => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('');
    row.innerHTML = `
      <div class="pt-row-top">
        <div class="pt-ava" data-act="inspect-char" data-id="${esc(m.id)}" title="คลิกเพื่อดูข้อมูลตัวละคร / อุปกรณ์ / กระเป๋า" style="cursor:pointer; position:relative; overflow:hidden;"></div>
        <div class="pt-who" data-act="inspect-char" data-id="${esc(m.id)}" title="คลิกเพื่อดูข้อมูลตัวละคร / อุปกรณ์ / กระเป๋า" style="cursor:pointer;">
          <div class="pt-name"><span class="pt-name-txt"></span><span class="pt-lv" hidden></span><span class="pt-noloot-tag" hidden>ไม่เก็บของ</span></div>
          <div class="pt-sub"></div>
        </div>
        <span class="pt-status"></span>
        ${isLeader ? '' : `<button class="pt-rm" type="button" title="เอาออกจากตี้" data-act="remove" data-party="${esc(pid)}" data-id="${esc(m.id)}">✕</button>`}
      </div>
      <div class="pt-row-controls">
        <button class="pt-noloot" type="button" data-act="toggle-noloot" data-party="${esc(pid)}" data-id="${esc(m.id)}"></button>
        <select class="pt-automode-select" data-set="memberAutoMode" data-party="${esc(pid)}" data-member="${esc(m.id)}" title="ปรับโหมดฟาร์ม / ซัพพอร์ตรายบุคคล (เลือก 'ซัพอย่างเดียว' เพื่อไม่เปลืองมานาใช้สกิลดาเมจ)">${autoModeHtml}</select>
        ${isLeader ? '' : `<select class="pt-follow-select" data-set="memberFollow" data-party="${esc(pid)}" data-member="${esc(m.id)}" title="เลือกโหมดร่วมกลุ่มด้ายแดง / เดินตาม"></select>`}
      </div>`;
    patchMemberRowEl(row, m, p, isLeader);
    return row;
  }

  function patchMemberRowEl(row, m, p, isLeader) {
    const pid = p.id;
    const displayName = m.charName || m.profileName || '?';
    const sub = [m.profileName, m.mapName ? m.mapName + (m.channel ? ' · CH ' + m.channel : '') : null].filter(Boolean).join(' · ');
    const ava = row.querySelector('.pt-ava');
    if (ava) {
      ava.dataset.id = String(m.id);
      const h = String(hue(displayName));
      if (ava.style.getPropertyValue('--pt-h') !== h) ava.style.setProperty('--pt-h', h);
      const portraitUrl = resolveMemberAvatarUrl(m.id);
      if (portraitUrl) {
        const crownBadge = isLeader
          ? `<span style="position:absolute;right:-1px;bottom:-1px;background:#f59e0b;color:#0f172a;border-radius:999px;width:13px;height:13px;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:900;box-shadow:0 1px 4px rgba(0,0,0,0.6);">👑</span>`
          : '';
        setHtml(ava, `<img src="${esc(portraitUrl)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block;">${crownBadge}`);
      } else if (isLeader) {
        setHtml(ava, CROWN_SM);
      } else {
        setText(ava, initial(displayName));
      }
    }
    const whoEl = row.querySelector('.pt-who');
    if (whoEl) whoEl.dataset.id = String(m.id);
    const nameTxt = row.querySelector('.pt-name-txt');
    setText(nameTxt, displayName);
    const lvEl = row.querySelector('.pt-lv');
    if (lvEl) {
      if (m.level) {
        lvEl.hidden = false;
        setText(lvEl, 'Lv.' + m.level);
      } else {
        lvEl.hidden = true;
      }
    }
    const isNoLoot = Boolean(m.noLoot || (Array.isArray(p.noLootIds) && p.noLootIds.includes(String(m.id))));
    const noLootTag = row.querySelector('.pt-noloot-tag');
    if (noLootTag) {
      noLootTag.hidden = !isNoLoot;
    }
    const noLootBtn = row.querySelector('.pt-noloot');
    if (noLootBtn) {
      if (noLootBtn.dataset.party !== String(pid)) noLootBtn.dataset.party = String(pid);
      if (noLootBtn.dataset.id !== String(m.id)) noLootBtn.dataset.id = String(m.id);
      noLootBtn.dataset.noloot = isNoLoot ? '1' : '0';
      noLootBtn.dataset.name = displayName;
      const nextNlCls = 'pt-noloot' + (isNoLoot ? ' is-off' : '');
      if (noLootBtn.className !== nextNlCls) noLootBtn.className = nextNlCls;
      setHtml(noLootBtn, isNoLoot ? HAND_OFF_SVG : HAND_ON_SVG);
      const nlTitle = isNoLoot
        ? `กากบาทที่มือ: "${displayName}" ไม่เก็บของ (ฟาร์มและตีอย่างเดียว · คลิกเพื่อกลับมาเก็บของปกติ)`
        : `เก็บของปกติ: คลิกให้เป็นกากบาทที่มือ เพื่อสั่งให้ "${displayName}" ไม่เก็บของ (ตีอย่างเดียว)`;
      if (noLootBtn.title !== nlTitle) noLootBtn.title = nlTitle;
    }
    setText(row.querySelector('.pt-sub'), sub);
    const autoSel = row.querySelector('.pt-automode-select');
    if (autoSel) {
      if (autoSel.dataset.party !== String(pid)) autoSel.dataset.party = String(pid);
      if (autoSel.dataset.member !== String(m.id)) autoSel.dataset.member = String(m.id);
      const curAuto = AUTO_MODE_LABEL[m.autoFarmMode] ? m.autoFarmMode : 'auto';
      const isBusySel = window.PmUiGuard ? window.PmUiGuard.isSelectBusy(autoSel) : (document.activeElement === autoSel);
      if (!isBusySel && autoSel.value !== curAuto) autoSel.value = curAuto;
      autoSel.classList.toggle('is-sup-only', curAuto === 'support_only');
      autoSel.classList.toggle('is-sup-fight', curAuto === 'support_fight');
      autoSel.classList.toggle('is-farm', curAuto === 'farm');
    }
    const followSel = row.querySelector('.pt-follow-select');
    if (followSel) {
      if (followSel.dataset.party !== String(pid)) followSel.dataset.party = String(pid);
      if (followSel.dataset.member !== String(m.id)) followSel.dataset.member = String(m.id);
      const opts = buildFollowOptions(m, p);
      const curMode = opts.some(o => o.value === m.followMode) ? m.followMode : 'none';
      if (window.PmUiGuard) {
        window.PmUiGuard.syncSelect(followSel, opts.map(o => ({ value: o.value, text: o.label })), curMode);
      } else {
        const sig = opts.map(o => o.value + ':' + o.label).join('|');
        if (document.activeElement !== followSel) {
          if (followSel.dataset.optSig !== sig) {
            followSel.dataset.optSig = sig;
            followSel.innerHTML = opts.map(o => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('');
          }
          if (followSel.value !== curMode) followSel.value = curMode;
        }
      }
      followSel.classList.toggle('is-following', curMode !== 'none' || p.expMode !== 'individual');
    }
    const st = row.querySelector('.pt-status');
    if (st) {
      const allPartyMembers = [p.leader].concat(p.members || []).filter(Boolean);
      const sameMapCount = allPartyMembers.filter(x => x.mapName && m.mapName && x.mapName === m.mapName && (!x.channel || !m.channel || x.channel === m.channel)).length;
      const isTogetherWithTeammate = !isLeader && sameMapCount >= 2 && !/ค่ายกลางป่า|ห้องหุ่น/i.test(String(m.mapName || ''));
      const effStatus = isTogetherWithTeammate ? 'joined' : (m.status || '');
      const effText = isTogetherWithTeammate
        ? (m.mapName === p.leader?.mapName ? 'อยู่ด้วยกัน' : 'ช่วยเควสตี้')
        : (/ห้องหุ่น/i.test(String(m.mapName || '')) ? 'กำลังพ้นห้องหุ่น Lv.1' : (m.statusText || ''));
      const nextCls = 'pt-status ' + effStatus;
      if (st.className !== nextCls) st.className = nextCls;
      setText(st, effText);
    }
    const rmBtn = row.querySelector('.pt-rm');
    if (rmBtn) {
      if (rmBtn.dataset.party !== String(pid)) rmBtn.dataset.party = String(pid);
      if (rmBtn.dataset.id !== String(m.id)) rmBtn.dataset.id = String(m.id);
    }
  }

  function computePartyQuestSyncSummary(p) {
    const all = [p.leader].concat(p.members || []).filter(Boolean);
    const outdoor = all.filter(x => x.mapName && !/ค่ายกลางป่า|แปลงสวน|ห้องหุ่น|เมืองหลวง/i.test(String(x.mapName)));
    if (!outdoor.length) {
      const inTutorial = all.filter(x => /ห้องหุ่น/i.test(String(x.mapName || '')));
      if (inTutorial.length) {
        return `⏳ รอตัวละครออกจาก "ห้องหุ่นไม้ (Lv.1)" (${inTutorial.length} ตัว) แล้วจะรวมตี้เข้าแมพกลางแจ้งทันที`;
      }
      return `🏕️ สมาชิกกำลังเตรียมตัวอยู่ในค่ายแคมป์ — เมื่อออกแมพกลางแจ้งจะรวมกลุ่มที่แชนแนลคนน้อยสุดอัตโนมัติ`;
    }
    // Lowest level member on an outdoor map is the Co-op Quest Anchor
    const sorted = outdoor.slice().sort((a, b) => ((Number(a.level) || 99) - (Number(b.level) || 99)));
    const anchor = sorted[0];
    const chTxt = anchor.channel ? ` · CH ${anchor.channel}` : '';
    const onSameMap = outdoor.filter(x => x.mapName === anchor.mapName && (!anchor.channel || x.channel === anchor.channel)).length;
    if (p.expMode === 'individual') {
      return `⚔️ โหมดแยกกันฟาร์ม: สมาชิกอยู่คนละจุดแต่รับโบนัสปาร์ตี้ร่วมกัน`;
    }
    return `🤝 จุดรวมตี้ช่วยเควส: <b>${esc(anchor.mapName)}${esc(chTxt)}</b> (เกาะกลุ่มด้ายแดง ${onSameMap}/${all.length} คน · ช่วย ${esc(anchor.charName || anchor.profileName)} Lv.${anchor.level || 1})`;
  }

  function createCardEl(p) {
    const opt = (map, cur) => Object.keys(map).map(k => `<option value="${k}" ${k === cur ? 'selected' : ''}>${esc(map[k])}</option>`).join('');
    const el = document.createElement('article');
    el.className = 'pt-card';
    el.dataset.party = String(p.id);
    el.innerHTML = `
      <div class="pt-card-top">
        <span class="pt-card-title"></span>
        <span class="pt-count"></span>
        <button class="pt-iconbtn pt-add-member-btn" type="button" title="เลือกสมาชิกเข้าตี้เอง" data-act="pick-member" data-party="${esc(p.id)}">➕</button>
        <button class="pt-iconbtn" type="button" title="รวมทีมด้ายแดง (เรียกสมาชิกทุกคนมาเกาะกลุ่มช่วยเควส)" data-act="summon" data-party="${esc(p.id)}">⤓</button>
        <button class="pt-iconbtn danger" type="button" title="ยุบตี้" data-act="delete" data-party="${esc(p.id)}">🗑</button>
      </div>
      <div class="pt-coop-banner" style="margin:6px 0;padding:6px 9px;border-radius:7px;background:rgba(16,185,129,0.11);border:1px solid rgba(52,211,153,0.35);color:#a7f3d0;font-size:10.5px;line-height:1.45;"></div>
      <div class="pt-leader-box"></div>
      <button class="pt-expand-bar" type="button" data-act="toggle-members" data-party="${esc(p.id)}" aria-expanded="true">
        <span class="pt-expand-summary"></span>
        <span class="pt-expand-label"></span>
      </button>
      <div class="pt-members-wrap">
        <div class="pt-members"></div>
        <button class="pt-row pt-slot" type="button" data-act="pick-member" data-party="${esc(p.id)}" hidden>
          <div class="pt-ava">+</div>
          <div class="pt-who pt-slot-text"></div>
          <span class="pt-slot-cta">+ เลือกคนเข้าตี้</span>
        </button>
      </div>
      <div class="pt-modes">
        <div class="pt-field"><label for="pt-loot-${esc(p.id)}">กติกาของดรอป</label>
          <select id="pt-loot-${esc(p.id)}" data-set="lootMode" data-party="${esc(p.id)}">${opt(LOOT, LOOT[p.lootMode] ? p.lootMode : 'personal')}</select></div>
        <div class="pt-field"><label for="pt-exp-${esc(p.id)}">กติกา EXP</label>
          <select id="pt-exp-${esc(p.id)}" data-set="expMode" data-party="${esc(p.id)}">${opt(EXP, EXP[p.expMode] ? p.expMode : 'even-share')}</select></div>
        <div class="pt-field" style="grid-column:1 / -1;"><label for="pt-grp-${esc(p.id)}">ออโต้ในตี้</label>
          <select id="pt-grp-${esc(p.id)}" data-set="groupMode" data-party="${esc(p.id)}">${opt(GROUP, GROUP[p.groupMode] ? p.groupMode : 'g')}</select></div>
      </div>
      <div class="pt-toggles">
        <label class="pt-toggle"><input type="checkbox" data-set="syncMap" data-party="${esc(p.id)}" ${p.syncMap ? 'checked' : ''}>ซิงค์แมพ + CH คนน้อยสุด</label>
        <label class="pt-toggle"><input type="checkbox" data-set="autoFill" data-party="${esc(p.id)}" ${p.autoFill ? 'checked' : ''}>เติมสมาชิกอัตโนมัติ (5 คน)</label>
        <label class="pt-toggle" title="สแกนอุปกรณ์ในกระเป๋าของทุกคนในตี้ หากอีกตัวใส่ดีกว่า (ตาม Smart Gear) จะล็อกกันขายและเทรดส่งให้กันอัตโนมัติ (เฉพาะไอดีพรีเมียม Lv.20+)"><input type="checkbox" data-set="shareGear" data-party="${esc(p.id)}" ${p.shareGear ? 'checked' : ''}>🎁 แชร์ของ Smart Gear อัตโนมัติในตี้</label>
      </div>
      <div class="pt-gearshare-bar">
        <button class="pt-gearshare-btn" type="button" data-act="share-gear-now" data-party="${esc(p.id)}">🎁 เช็ค &amp; เทรดของ Smart Gear ในตี้ตอนนี้</button>
        <div class="pt-gearshare-note" hidden></div>
      </div>
      <div class="pt-notes" hidden></div>`;
    patchCardEl(el, p);
    return el;
  }

  function patchCardEl(cardEl, p) {
    const effMax = Math.min(5, Number(p.max) || 5);
    const full = p.count >= effMax;
    const slots = Math.max(0, effMax - p.count);
    const isExpanded = !collapsedParties.has(String(p.id));

    setText(cardEl.querySelector('.pt-card-title'), 'ตี้ ' + p.index);
    const cnt = cardEl.querySelector('.pt-count');
    if (cnt) {
      const nextCls = 'pt-count' + (full ? ' full' : '');
      if (cnt.className !== nextCls) cnt.className = nextCls;
      setText(cnt, p.count + '/' + effMax);
    }
    const addMemberBtn = cardEl.querySelector('.pt-add-member-btn');
    if (addMemberBtn) {
      addMemberBtn.hidden = full;
    }

    const coopBanner = cardEl.querySelector('.pt-coop-banner');
    if (coopBanner) {
      setHtml(coopBanner, computePartyQuestSyncSummary(p));
    }

    // Leader row (always visible)
    const leaderBox = cardEl.querySelector('.pt-leader-box');
    if (leaderBox && p.leader) {
      let leaderRow = leaderBox.firstElementChild;
      const leaderKey = 'leader:' + p.leader.id;
      if (leaderRow && leaderRow.dataset && leaderRow.dataset.rowKey === leaderKey) {
        patchMemberRowEl(leaderRow, p.leader, p, true);
      } else {
        leaderBox.innerHTML = '';
        leaderBox.appendChild(createMemberRowEl(p.leader, p, true));
      }
    }

    // Expand/collapse toggle bar for non-leader members
    const membersList = p.members || [];
    const maxFollowers = Math.max(0, effMax - 1);
    const joinedCnt = membersList.filter(m => m.status === 'joined' || m.status === 'apart').length;
    const pendingCnt = membersList.length - joinedCnt;
    const summaryParts = [`👥 ลูกทีม ${membersList.length}/${maxFollowers} คน`];
    if (joinedCnt > 0) summaryParts.push(`ในตี้ ${joinedCnt}`);
    if (pendingCnt > 0) summaryParts.push(`รอเข้าตี้ ${pendingCnt}`);
    if (slots > 0) summaryParts.push(`ว่าง ${slots} ที่`);

    const expandBar = cardEl.querySelector('.pt-expand-bar');
    if (expandBar) {
      if (expandBar.getAttribute('aria-expanded') !== String(isExpanded)) {
        expandBar.setAttribute('aria-expanded', String(isExpanded));
      }
      expandBar.classList.toggle('open', isExpanded);
      setText(expandBar.querySelector('.pt-expand-summary'), summaryParts.join(' · '));
      setText(expandBar.querySelector('.pt-expand-label'), isExpanded ? 'ซ่อนลูกทีม ▲' : 'ดูรายชื่อ ▼');
    }

    const membersWrap = cardEl.querySelector('.pt-members-wrap');
    if (membersWrap) {
      membersWrap.hidden = !isExpanded;
    }

    // Reconcile non-leader member rows in-place
    const membersBox = cardEl.querySelector('.pt-members');
    if (membersBox) {
      const desired = membersList.map(m => ({ m, isLeader: false }));
      const existingByKey = new Map();
      Array.from(membersBox.children).forEach(ch => {
        if (ch.dataset && ch.dataset.rowKey) existingByKey.set(ch.dataset.rowKey, ch);
      });
      const nextNodes = desired.map(({ m, isLeader }) => {
        const key = 'member:' + m.id;
        let row = existingByKey.get(key);
        if (row) {
          patchMemberRowEl(row, m, p, isLeader);
          existingByKey.delete(key);
        } else {
          row = createMemberRowEl(m, p, isLeader);
        }
        return row;
      });
      existingByKey.forEach(stale => stale.remove());
      nextNodes.forEach((node, idx) => {
        if (membersBox.children[idx] !== node) membersBox.insertBefore(node, membersBox.children[idx] || null);
      });
    }

    // Empty slots row (clickable to manually add members)
    const slotRow = cardEl.querySelector('.pt-slot');
    if (slotRow) {
      if (slots > 0) {
        slotRow.hidden = false;
        setText(slotRow.querySelector('.pt-slot-text'), `ว่าง ${slots} ที่${p.autoFill ? ' · ระบบเติมอัตโนมัติ หรือคลิกเพื่อเลือกเอง' : ' · คลิกเพื่อเลือกสมาชิกเข้าตี้'}`);
      } else {
        slotRow.hidden = true;
      }
    }

    const isSelBusy = el => window.PmUiGuard ? window.PmUiGuard.isSelectBusy(el) : (document.activeElement === el);
    const expSel = cardEl.querySelector('select[data-set="expMode"]');
    const effExp = EXP[p.expMode] ? p.expMode : 'even-share';
    if (expSel && !isSelBusy(expSel) && expSel.value !== effExp) expSel.value = effExp;
    const lootSel = cardEl.querySelector('select[data-set="lootMode"]');
    const effLoot = LOOT[p.lootMode] ? p.lootMode : 'personal';
    if (lootSel && !isSelBusy(lootSel) && lootSel.value !== effLoot) lootSel.value = effLoot;
    const grpSel = cardEl.querySelector('select[data-set="groupMode"]');
    const effGrp = GROUP[p.groupMode] ? p.groupMode : 'g';
    if (grpSel && !isSelBusy(grpSel) && grpSel.value !== effGrp) grpSel.value = effGrp;

    const syncCb = cardEl.querySelector('input[data-set="syncMap"]');
    if (syncCb && syncCb.checked !== Boolean(p.syncMap)) syncCb.checked = Boolean(p.syncMap);
    const fillCb = cardEl.querySelector('input[data-set="autoFill"]');
    if (fillCb && fillCb.checked !== Boolean(p.autoFill)) fillCb.checked = Boolean(p.autoFill);
    const shareCb = cardEl.querySelector('input[data-set="shareGear"]');
    if (shareCb && shareCb.checked !== Boolean(p.shareGear)) shareCb.checked = Boolean(p.shareGear);

    const shareBtn = cardEl.querySelector('.pt-gearshare-btn');
    if (shareBtn) {
      shareBtn.disabled = Boolean(p.sharingGear);
      setText(shareBtn, p.sharingGear ? '⏳ กำลังสแกน & เทรดของในตี้...' : '🎁 เช็ค & เทรดของ Smart Gear ในตี้ตอนนี้');
    }
    const shareNoteEl = cardEl.querySelector('.pt-gearshare-note');
    if (shareNoteEl) {
      if (p.lastGearShareNote) {
        shareNoteEl.hidden = false;
        setText(shareNoteEl, p.lastGearShareNote);
      } else {
        shareNoteEl.hidden = true;
        setText(shareNoteEl, '');
      }
    }

    // Notes & Outsider kick alert
    const notesBox = cardEl.querySelector('.pt-notes');
    if (notesBox) {
      const notesList = (p.notes || []).slice();
      const outsiders = Array.isArray(p.outsiders) ? p.outsiders : [];
      if (notesList.length || outsiders.length) {
        notesBox.hidden = false;
        let notesHtml = notesList.map(n => `<div class="pt-note">${esc(n)}</div>`).join('');
        if (outsiders.length) {
          notesHtml += `<div class="pt-note" style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:4px;padding:5px 8px;background:rgba(239,68,68,0.14);border:1px solid rgba(248,113,113,0.45);border-radius:6px;">` +
            `<span style="color:#fca5a5;font-weight:700;">👤 คนนอกในตี้: ${esc(outsiders.join(', '))}</span>` +
            `<button type="button" data-act="kick-outsiders" data-party="${esc(p.id)}" style="padding:3px 9px;border:1px solid #f87171;border-radius:5px;background:#dc2626;color:#fff;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;">👢 เตะคนนอก</button>` +
            `</div>`;
        }
        setHtml(notesBox, notesHtml);
      } else {
        notesBox.hidden = true;
        setHtml(notesBox, '');
      }
    }
  }

  function render() {
    const badge = document.getElementById('pt-tab-badge');
    if (badge) setText(badge, data.parties.length ? String(data.parties.length) : '');
    const body = document.getElementById('pt-body');
    if (!body) return;

    if (!data.parties.length) {
      if (!body.querySelector('.pt-empty')) {
        body.innerHTML = `<div class="pt-empty">ยังไม่มีปาร์ตี้<br>กด <b>➕ เพิ่มตี้ (สูงสุด 5 คน)</b> ด้านล่างเพื่อเลือกหัวตี้</div>`;
      }
    } else {
      const emptyEl = body.querySelector('.pt-empty');
      if (emptyEl) emptyEl.remove();

      const existingCards = new Map();
      Array.from(body.querySelectorAll('.pt-card')).forEach(el => {
        existingCards.set(el.dataset.party, el);
      });

      const nextCards = data.parties.map(p => {
        const key = String(p.id);
        let cardEl = existingCards.get(key);
        if (cardEl) {
          patchCardEl(cardEl, p);
          existingCards.delete(key);
        } else {
          cardEl = createCardEl(p);
        }
        return cardEl;
      });

      existingCards.forEach(stale => stale.remove());
      nextCards.forEach((cardEl, idx) => {
        if (body.children[idx] !== cardEl) body.insertBefore(cardEl, body.children[idx] || null);
      });
    }

    const free = data.clients.filter(c => !c.assigned);
    const add = document.getElementById('pt-add');
    if (add) {
      add.disabled = !free.length;
      add.title = free.length ? '' : 'ทุกจออยู่ในตี้แล้ว';
    }
    const picker = document.getElementById('pt-picker');
    if (picker && !picker.hidden) renderPicker();
  }

  function openPicker(opts) {
    pickerState = Object.assign({ mode: 'leader', partyId: null }, opts || {});
    const pk = document.getElementById('pt-picker');
    pk.hidden = false;
    const s = document.getElementById('pt-search'); s.value = ''; renderPicker(); setTimeout(() => s.focus(), 50);
  }
  function closePicker() {
    const pk = document.getElementById('pt-picker');
    if (pk) pk.hidden = true;
    pickerState = { mode: 'leader', partyId: null };
  }

  function createPickBtn(c) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.pick = String(c.id);
    btn.innerHTML = `
      <div class="pt-ava" style="position:relative;overflow:hidden;"></div>
      <div class="pt-who">
        <div class="pt-name"><span class="pt-name-txt"></span><span class="pt-lv" hidden></span></div>
        <div class="pt-sub"></div>
      </div>
      <span class="pt-go"></span>`;
    patchPickBtn(btn, c);
    return btn;
  }

  function patchPickBtn(btn, c) {
    const nextCls = 'pt-pick' + (c.online ? '' : ' off');
    if (btn.className !== nextCls) btn.className = nextCls;
    const displayName = c.charName || c.name || '?';
    const ava = btn.querySelector('.pt-ava');
    if (ava) {
      const h = String(hue(displayName));
      if (ava.style.getPropertyValue('--pt-h') !== h) ava.style.setProperty('--pt-h', h);
      const portraitUrl = resolveMemberAvatarUrl(c.id);
      if (portraitUrl) {
        setHtml(ava, `<img src="${esc(portraitUrl)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block;">`);
      } else {
        setText(ava, initial(displayName));
      }
    }
    setText(btn.querySelector('.pt-name-txt'), displayName);
    const lv = btn.querySelector('.pt-lv');
    if (lv) {
      if (c.level) {
        lv.hidden = false;
        setText(lv, 'Lv.' + c.level);
      } else {
        lv.hidden = true;
      }
    }
    const sub = [
      c.name,
      c.online ? (c.mapName ? c.mapName + (c.channel ? ' · CH ' + c.channel : '') : 'ออนไลน์') : 'ออฟไลน์',
      c.inGameParty ? 'มีตี้ในเกมอยู่แล้ว' : null
    ].filter(Boolean).join(' · ');
    setText(btn.querySelector('.pt-sub'), sub);
    setText(btn.querySelector('.pt-go'), pickerState.mode === 'member' ? '+ เพิ่มเข้าตี้' : 'เลือก →');
  }

  function renderPicker() {
    const titleEl = document.getElementById('pt-picker-title');
    const targetParty = pickerState.mode === 'member' && pickerState.partyId
      ? data.parties.find(p => String(p.id) === String(pickerState.partyId))
      : null;
    if (titleEl) {
      if (targetParty) {
        const effMax = Math.min(5, Number(targetParty.max) || 5);
        const slots = Math.max(0, effMax - targetParty.count);
        setText(titleEl, `เพิ่มสมาชิกเข้าตี้ ${targetParty.index} (ว่าง ${slots} ที่)`);
      } else {
        setText(titleEl, 'เลือกหัวตี้');
      }
    }
    const leaderLv = targetParty && targetParty.leader && typeof targetParty.leader.level === 'number' ? targetParty.leader.level : null;
    const q = (document.getElementById('pt-search').value || '').trim().toLowerCase();
    const list = data.clients
      .filter(c => !c.assigned)
      .filter(c => !q || String(c.name).toLowerCase().includes(q) || String(c.charName || '').toLowerCase().includes(q))
      .sort((a, b) => {
        if (b.online !== a.online) return b.online - a.online;
        if (leaderLv != null && typeof a.level === 'number' && typeof b.level === 'number') {
          const da = Math.abs(a.level - leaderLv), db = Math.abs(b.level - leaderLv);
          if (da !== db) return da - db;
        }
        return ((b.level || 0) - (a.level || 0)) || String(a.name).localeCompare(String(b.name));
      });
    const el = document.getElementById('pt-pick-list');
    if (!el) return;

    if (!list.length) {
      if (!el.querySelector('.pt-empty')) {
        el.innerHTML = `<div class="pt-empty">ไม่มีจอที่ว่าง — ทุกจออยู่ในตี้แล้ว</div>`;
      }
      return;
    }
    const emptyEl = el.querySelector('.pt-empty');
    if (emptyEl) emptyEl.remove();

    const existing = new Map();
    Array.from(el.querySelectorAll('.pt-pick')).forEach(b => existing.set(b.dataset.pick, b));
    const nextBtns = list.map(c => {
      const key = String(c.id);
      let btn = existing.get(key);
      if (btn) {
        patchPickBtn(btn, c);
        existing.delete(key);
      } else {
        btn = createPickBtn(c);
      }
      return btn;
    });
    existing.forEach(stale => stale.remove());
    nextBtns.forEach((btn, idx) => {
      if (el.children[idx] !== btn) el.insertBefore(btn, el.children[idx] || null);
    });
  }

  async function createParty(leaderId) {
    busy = true;
    try {
      const r = await api('', { leaderId });
      if (r.success === false) toast(r.error || 'เพิ่มตี้ไม่สำเร็จ', 'error');
      else { toast('สร้างปาร์ตี้แล้ว · กำลังดึงสมาชิกเข้าตี้และซิงค์เควส/แชนแนลเดียวกัน', 'success'); closePicker(); }
    } finally { busy = false; }
  }

  async function addMemberToParty(partyId, profileId) {
    busy = true;
    try {
      collapsedParties.delete(String(partyId));
      const r = await api('/' + encodeURIComponent(partyId) + '/add-member', { profileId, followMode: 'leader' });
      if (r.success === false) {
        toast(r.error || 'เพิ่มสมาชิกไม่สำเร็จ', 'error');
        return;
      }
      const updatedParty = (data.parties || []).find(p => String(p.id) === String(partyId));
      const effMax = Math.min(5, Number(updatedParty?.max) || 5);
      const freeLeft = (data.clients || []).some(c => !c.assigned);
      toast('เพิ่มสมาชิกเข้าตี้แล้ว · กำลังซิงค์เข้าแชนแนลและแมพเควสตี้', 'success');
      if (!updatedParty || updatedParty.count >= effMax || !freeLeft) {
        closePicker();
      } else {
        renderPicker();
      }
    } finally { busy = false; }
  }

  async function onChange(e) {
    const t = e.target; if (!t.dataset.set) return;
    busy = true;
    try {
      let payload;
      if (t.dataset.set === 'memberFollow') {
        payload = { memberFollow: { profileId: t.dataset.member, mode: t.value } };
      } else if (t.dataset.set === 'memberAutoMode') {
        payload = { memberAutoMode: { profileId: t.dataset.member, mode: t.value } };
      } else {
        const v = t.type === 'checkbox' ? t.checked : t.value;
        payload = { [t.dataset.set]: v };
      }
      const r = await api('/' + encodeURIComponent(t.dataset.party) + '/settings', payload);
      if (r.success === false) toast(r.error || 'บันทึกไม่สำเร็จ', 'error');
      else if (t.dataset.set === 'memberFollow') {
        toast('อัปเดตโหมดเดินตี้ของสมาชิกแล้ว', 'success');
      } else if (t.dataset.set === 'memberAutoMode') {
        toast('ปรับโหมดฟาร์ม/ซัพเป็น "' + (AUTO_MODE_LABEL[t.value] || t.value) + '" แล้ว', 'success');
      } else if (t.dataset.set === 'shareGear') {
        toast(t.checked ? '🎁 เปิดแชร์ของ Smart Gear อัตโนมัติในตี้แล้ว' : 'ปิดแชร์ของ Smart Gear อัตโนมัติในตี้แล้ว', 'success');
      } else if (t.dataset.set === 'expMode') {
        toast('อัปเดตกติกา EXP ปาร์ตี้เป็น "' + (EXP[t.value] || t.value) + '" แล้ว', 'success');
      } else if (t.dataset.set === 'lootMode') {
        toast('อัปเดตกติกาของดรอปเป็น "' + (LOOT[t.value] || t.value) + '" แล้ว', 'success');
      } else if (t.dataset.set === 'groupMode') {
        toast('อัปเดตออโต้ในตี้เป็น "' + (GROUP[t.value] || t.value) + '" แล้ว', 'success');
      }
    } finally { busy = false; t.blur(); }
  }

  async function onClick(e) {
    const b = e.target.closest('[data-act]'); if (!b) return;
    if (b.dataset.act === 'inspect-char' && b.dataset.id) {
      if (typeof window.openNightcampCharacterModal === 'function') {
        window.openNightcampCharacterModal(b.dataset.id);
      } else if (typeof window.openCharacterModal === 'function') {
        window.openCharacterModal(b.dataset.id);
      }
      return;
    }
    const rawPid = String(b.dataset.party || '');
    const pid = encodeURIComponent(rawPid);
    if (b.dataset.act === 'toggle-noloot' && b.dataset.id) {
      const curNoLoot = b.dataset.noloot === '1';
      const wantNoLoot = !curNoLoot;
      const charName = b.dataset.name || b.dataset.id;
      busy = true;
      try {
        const r = rawPid
          ? await api('/' + pid + '/settings', { memberNoLoot: { profileId: b.dataset.id, noLoot: wantNoLoot } })
          : await api('/toggle-noloot', { profileId: b.dataset.id, noLoot: wantNoLoot });
        if (r.success === false) {
          toast(r.error || 'สลับโหมดเก็บของไม่สำเร็จ', 'error');
        } else {
          toast(
            wantNoLoot
              ? `🚫✋ ตั้งค่า "${charName}" ไม่เก็บของ (ฟาร์มและตีอย่างเดียว)`
              : `✋ ตั้งค่า "${charName}" กลับมาเก็บของตามปกติแล้ว`,
            'success'
          );
        }
      } finally { busy = false; }
      return;
    }
    if (b.dataset.act === 'toggle-members') {
      if (collapsedParties.has(rawPid)) collapsedParties.delete(rawPid);
      else collapsedParties.add(rawPid);
      render();
      return;
    }
    if (b.dataset.act === 'pick-member') {
      collapsedParties.delete(rawPid);
      openPicker({ mode: 'member', partyId: rawPid });
      return;
    }
    if (b.dataset.act === 'delete') {
      if (!confirm('ยุบตี้นี้? สมาชิกทุกจอจะออกจากปาร์ตี้ในเกม')) return;
      collapsedParties.delete(rawPid);
      const r = await api('/' + pid + '/delete', {});
      toast(r.success === false ? (r.error || 'ยุบตี้ไม่สำเร็จ') : 'ยุบตี้แล้ว', r.success === false ? 'error' : 'success');
    } else if (b.dataset.act === 'remove') {
      const r = await api('/' + pid + '/remove-member', { profileId: b.dataset.id });
      toast(r.success === false ? (r.error || 'เอาออกไม่สำเร็จ') : 'เอาออกจากตี้แล้ว (กด + เลือกคนเข้าตี้ เพื่อดึงกลับได้ตลอด)', r.success === false ? 'error' : 'success');
    } else if (b.dataset.act === 'kick-outsiders') {
      const r = await api('/' + pid + '/kick-outsiders', {});
      const kickedTxt = Array.isArray(r.kicked) && r.kicked.length ? ('เตะคนนอกออกแล้ว: ' + r.kicked.join(', ')) : 'ตรวจสอบและเคลียร์ช่องปาร์ตี้แล้ว';
      toast(r.success === false ? (r.error || 'เตะคนนอกไม่สำเร็จ') : kickedTxt, r.success === false ? 'error' : 'success');
    } else if (b.dataset.act === 'share-gear-now') {
      b.disabled = true;
      busy = true;
      try {
        const r = await api('/' + pid + '/share-gear-now', {});
        const msg = (r && r.shareResult && r.shareResult.message) || r.error || 'ตรวจสอบของในตี้เรียบร้อยแล้ว';
        toast(msg, r.success === false ? 'error' : 'success');
      } finally {
        busy = false;
        b.disabled = false;
      }
    } else if (b.dataset.act === 'summon') {
      const r = await api('/' + pid + '/summon', {});
      toast(r.success === false ? (r.error || 'รวมทีมไม่สำเร็จ') : 'สั่งรวมกลุ่มด้ายแดง & ซิงค์แมพเควสตี้แล้ว', r.success === false ? 'error' : 'success');
    }
  }

  function init() { build(); setOpen(false); load(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
