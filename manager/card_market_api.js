// manager/card_market_api.js — Nightcamp Card & Rune Top-Selling Market Tracker + Multi-Map Farm Distributor
//
// Serves BOTH:
//   GET  /api/cards               -> Monster Cards (bl_card_*) catalog + live 7d market velocity/prices + clients + overrides
//   GET  /api/runes               -> Skill Runes (bl_rune_*_1/_2) catalog + live 7d market velocity/prices + clients + overrides
//   POST /api/cards/scan          -> Live nc_market RPC sweep (hot + batched prices)
//   POST /api/runes/scan          -> Live nc_market RPC sweep (hot + batched prices)
//   POST /api/cards/farm-multi    -> Distribute selected screens across selected Card maps + auto-add to CMarket Auto-Sell WL
//   POST /api/runes/farm-multi    -> Distribute selected screens across selected Rune maps + auto-add to CMarket Auto-Sell WL
//   POST /api/cards/restore-plan  -> Restore selected/all screens to their original Plan Script map
//   POST /api/runes/restore-plan  -> Restore selected/all screens to their original Plan Script map

'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const CATALOG_FILE = path.join(DATA_DIR, 'nc_card_rune_catalog.json');
const MARKET_CACHE_FILE = path.join(DATA_DIR, 'nc_card_rune_market_cache.json');
const OVERRIDES_FILE = path.join(DATA_DIR, 'nc_farm_overrides.json');

function safeReadJson(file, fallback) {
  try {
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch (_) {}
  return fallback;
}

function safeWriteJson(file, data) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (_) {}
}

function readJsonBody(req, maxBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    req.on('data', chunk => {
      const s = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk || '');
      size += Buffer.byteLength(s, 'utf8');
      if (size > maxBytes) {
        try { req.destroy(); } catch (_) {}
        return reject(new Error('Payload too large'));
      }
      body += s;
    });
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

// In-page extractor: builds complete Nightcamp Cards (338+) & Runes (47×2) catalog with exact map spawn shares
const EXTRACT_CATALOG_JS = `(() => {
  const NC = window.NC;
  if (!NC || !NC.MAPS || !NC.BL || !NC.MATERIALS || typeof NC.mapInfo !== 'function') {
    return { ok: false, error: 'nightcamp-not-ready' };
  }

  const RUNE_CAT_LABELS = {
    proj: '🎯 ยิงไกล/กระสุน',
    attack: '⚔️ โจมตี',
    area: '💥 พื้นที่/AOE',
    melee: '🗡️ ประชิด',
    pet: '🐾 ซัมมอน/สัตว์เลี้ยง',
    buff: '✨ บัฟ/ซัพพอร์ต',
    any: '🔮 ทั่วไป'
  };

  const PAS_LABELS = {
    leech: (v) => 'ดูดเลือด +' + v + '%',
    amp: (v) => 'แรงสกิล +' + v + '%',
    cast: (v) => 'ลดเวลาร่าย +' + v + '%',
    crit: (v) => 'คริ +' + v + '%',
    critd: (v) => 'แรงคริ +' + v + '%',
    dbl: (v) => 'ตีเบิ้ล +' + v + '%',
    boss: (v) => 'ดาเมจบอส +' + v + '%',
    area: (v) => 'พื้นที่สกิล +' + v + '%',
    react: (v) => 'ปฏิกิริยาธาตุ +' + v + '%',
    est: (v) => 'ติดสถานะธาตุ +' + v + '%',
    hp: (v) => 'HP สูงสุด +' + v + '%',
    sp: (v) => 'SP สูงสุด +' + v + '%',
    atk: (v) => 'ATK +' + v + '%',
    matk: (v) => 'MATK +' + v + '%',
    aspd: (v) => 'ASPD +' + v + '%',
    cdr: (v) => 'ลดคูลดาวน์ +' + v + '%',
    res: (v) => 'ต้านทาน +' + v + '%',
    def: (v) => 'DEF +' + v + '%',
    flee: (v) => 'หลบหลีก +' + v + '%',
    spd: (v) => 'วิ่งไว +' + v + '%',
    heal: (v) => 'ฮีลแรง +' + v + '%',
    guard: (v) => 'ลดดาเมจครั้งแรก ' + v + '%',
    dmg: (v) => 'ดาเมจ +' + v + '%'
  };

  const TRIG_LABELS = {
    hit: 'ตีโดน', kill: 'ฆ่ามอน', skill: 'ใช้สกิล', dash: 'พุ่งหลบ',
    first: 'เปิดศึก', far: 'ยิงไกล', low: 'เลือดต่ำ', crowd: 'มอนรุม', hurt: 'โดนตี'
  };
  const EFF_LABELS = {
    status: 'ติดดีบัฟ', vuln: 'เปราะบาง', haste: 'เร่งความเร็ว',
    spirit: 'วิญญาณพุ่ง', burst: 'ระเบิดธาตุ', guard: 'เกราะกันดาเมจ'
  };

  const EL_LABELS = {
    neutral: 'ไร้ธาตุ', fire: 'ไฟ', water: 'น้ำ', wind: 'ลม',
    earth: 'ดิน', poison: 'พิษ', holy: 'ศักดิ์สิทธิ์', shadow: 'ความมืด',
    undead: 'อันเดด', spirit: 'วิญญาณ'
  };

  function decodePassives(sp) {
    const rows = NC.BL_ARTPAS?.rows?.[sp];
    if (!Array.isArray(rows)) return [];
    const out = [];
    for (const r of rows) {
      if (!Array.isArray(r) || r.length < 3) continue;
      if (r[0] === 'A') {
        const k = String(r[1] || '');
        const v = r[2];
        out.push(PAS_LABELS[k] ? PAS_LABELS[k](v) : (k + ' +' + v));
      } else if (r[0] === 'P') {
        const trig = String(r[1] || '');
        const eff = String(r[2] || '');
        const v = r[3];
        const tTh = TRIG_LABELS[trig] || trig;
        const eTh = EFF_LABELS[eff] || EL_LABELS[eff] || eff;
        if (PAS_LABELS[eff]) out.push(tTh + '·' + PAS_LABELS[eff](v));
        else out.push(tTh + ' ➜ ' + eTh + (v != null ? ' +' + v + '%' : ''));
      }
    }
    return out;
  }

  // 1. Scan all farmable maps via NC.mapInfo(mid) -> speciesMaps & runeMaps
  const speciesMaps = {}; // sp -> [ { mapId, mapName, lvText, minLv, maxLv, sharePct, hasBoss, monsterLv } ]
  const runeMaps = {};    // rk -> Map<mapId, { mapId, mapName, lvText, minLv, maxLv, sharePct, hasBoss, monsters: [] }>

  for (const [mid, M] of Object.entries(NC.MAPS)) {
    if (!M || mid === 'camp' || mid === 'homefarm' || mid === 'puppetroom' || M.safe || M.town || M.camp || M.test || M.pvp || M.arena || M.gwar || M.secret) continue;
    let info;
    try { info = NC.mapInfo(mid); } catch (_) { continue; }
    if (!info || !info.mons || info.mons.size === 0) continue;

    let totalW = 0;
    let hasBoss = false;
    let mapMinLv = 999;
    let mapMaxLv = 0;
    const entries = [];
    const bossEntries = [];
    for (const [sp, m] of info.mons.entries()) {
      if (m.boss) {
        hasBoss = true;
        const bLv = Array.isArray(m.lv) ? Number(m.lv[0]) : Number(m.lv || mapMaxLv || 1);
        bossEntries.push({ sp, lv: bLv });
        continue;
      }
      const w = Number(m.w) || 0;
      if (w <= 0) continue;
      totalW += w;
      const lo = Array.isArray(m.lv) ? Number(m.lv[0]) : Number(m.lv || 1);
      const hi = Array.isArray(m.lv) ? Number(m.lv[1]) : Number(m.lv || 1);
      if (lo < mapMinLv) mapMinLv = lo;
      if (hi > mapMaxLv) mapMaxLv = hi;
      entries.push({ sp, w, lo, hi, midLv: Math.round((lo + hi) / 2) });
    }
    if (totalW <= 0 && bossEntries.length === 0) continue;

    const perMapRune = {};
    const addRuneRec = (rk, e, sharePct) => {
      if (!perMapRune[rk]) {
        perMapRune[rk] = {
          mapId: mid,
          mapName: M.name || mid,
          lvText: M.lvText || ('Lv ' + mapMinLv + '–' + mapMaxLv),
          minLv: e.lo,
          maxLv: e.hi,
          mapMinLv,
          mapMaxLv,
          monsterLv: e.midLv,
          sharePct: 0,
          hasBoss,
          monsters: []
        };
      }
      const rec = perMapRune[rk];
      rec.sharePct = Math.round((rec.sharePct + sharePct) * 10) / 10;
      if (e.lo < rec.minLv) rec.minLv = e.lo;
      if (e.hi > rec.maxLv) rec.maxLv = e.hi;
      rec.monsterLv = Math.round((rec.minLv + rec.maxLv) / 2);
      rec.monsters.push({ sp: e.sp, name: NC.MONSTERS?.[e.sp]?.name || e.sp, lv: e.midLv, sharePct });
    };

    // Map Bosses drop 'heavy' (รูนหนัก) at 8% rate!
    for (const b of bossEntries) {
      addRuneRec('heavy', { sp: b.sp, lo: b.lv, hi: b.lv, midLv: b.lv }, 8);
    }

    for (const e of entries) {
      const sharePct = Math.round((e.w / (totalW || 1)) * 1000) / 10;
      if (!speciesMaps[e.sp]) speciesMaps[e.sp] = [];
      speciesMaps[e.sp].push({
        mapId: mid,
        mapName: M.name || mid,
        lvText: M.lvText || ('Lv ' + mapMinLv + '–' + mapMaxLv),
        minLv: e.lo,
        maxLv: e.hi,
        mapMinLv,
        mapMaxLv,
        monsterLv: e.midLv,
        sharePct,
        hasBoss
      });

      const monSpec = NC.SPECIES?.[e.sp] || NC.MONSTERS?.[e.sp] || {};
      if (monSpec.eliteOf) {
        // Elites drop BOTH 'focus' & 'execute' (50/50 at 1% rate)
        addRuneRec('focus', e, sharePct);
        addRuneRec('execute', e, sharePct);
      } else {
        let rk = null;
        try {
          const rf = NC.BL.runeFor({ type: e.sp });
          if (Array.isArray(rf) && rf[0]) rk = rf[0];
        } catch (_) {}
        if (rk) addRuneRec(rk, e, sharePct);
      }
    }

    for (const [rk, rec] of Object.entries(perMapRune)) {
      if (!runeMaps[rk]) runeMaps[rk] = [];
      rec.monsters.sort((a, b) => b.sharePct - a.sharePct);
      runeMaps[rk].push(rec);
    }
  }

  // 2. Build Monster Cards list
  const cards = [];
  const artFams = NC.BL?.arts?.FAM || {};
  for (const [matId, mat] of Object.entries(NC.MATERIALS || {})) {
    if (!matId.startsWith('bl_card_') || !mat) continue;
    const sp = matId.slice('bl_card_'.length);
    const mon = NC.MONSTERS?.[sp] || {};
    const famKey = (typeof NC.BL.familyOf === 'function') ? NC.BL.familyOf(sp) : '';
    const famDef = famKey ? artFams[famKey] : null;
    const maps = (speciesMaps[sp] || []).slice().sort((a, b) => b.sharePct - a.sharePct || a.minLv - b.minLv);
    let minLv = 999, maxLv = 0;
    for (const mp of maps) {
      if (mp.minLv < minLv) minLv = mp.minLv;
      if (mp.maxLv > maxLv) maxLv = mp.maxLv;
    }
    if (minLv === 999) { minLv = 0; maxLv = 0; }
    cards.push({
      id: matId,
      marketKey: 'mat:' + matId,
      kind: 'card',
      species: sp,
      name: mat.name || matId,
      monsterName: mon.name || sp,
      element: mon.element || 'neutral',
      elementLabel: EL_LABELS[mon.element || 'neutral'] || (mon.element || 'ไร้ธาตุ'),
      artFamily: famKey || 'other',
      artName: (Array.isArray(famDef) && famDef[0]) ? famDef[0] : (famKey || 'วิชามอน'),
      artDesc: (Array.isArray(famDef) && famDef[1]) ? famDef[1].replace(/\\{el\\}/g, EL_LABELS[mon.element || 'neutral'] || 'ไร้ธาตุ') : (mat.desc || ''),
      passives: decodePassives(sp),
      minLv,
      maxLv,
      maps
    });
  }

  // 3. Build Skill Runes list (Tier I & Tier II)
  const runes = [];
  for (const [rk, rdef] of Object.entries(NC.BL?.RUNES || {})) {
    if (!rdef) continue;
    const maps = (runeMaps[rk] || []).slice().sort((a, b) => b.sharePct - a.sharePct || a.minLv - b.minLv);
    let minLv = 999, maxLv = 0;
    for (const mp of maps) {
      if (mp.minLv < minLv) minLv = mp.minLv;
      if (mp.maxLv > maxLv) maxLv = mp.maxLv;
    }
    if (minLv === 999) { minLv = 0; maxLv = 0; }
    const cat = rdef.on || 'any';
    const catLabel = RUNE_CAT_LABELS[cat] || '🔮 ทั่วไป';
    const baseName = rdef.n || rk;
    for (const tier of [1, 2]) {
      const roman = tier === 1 ? 'I' : 'II';
      const id = 'bl_rune_' + rk + '_' + tier;
      const tArr = Array.isArray(rdef.t) ? rdef.t : [];
      runes.push({
        id,
        marketKey: 'rune:' + id,
        kind: 'rune',
        runeKey: rk,
        tier,
        name: baseName + ' ' + roman,
        baseName,
        category: cat,
        categoryLabel: catLabel,
        effectText: tArr[tier - 1] || tArr[0] || '',
        craftNote: tier === 2 ? 'หลอมจาก Tier I (3 ชิ้น) · ฟาร์มแมพดรอป Tier I' : '',
        minLv,
        maxLv,
        maps
      });
    }
  }

  return { ok: true, cards, runes, extractedAt: Date.now() };
})()`;

// In-page market RPC sweep (hot + batched prices for all requested keys)
function buildMarketSweepJs(keys) {
  return `(async () => {
    const NC = window.NC;
    if (!NC?.Online?.on || typeof NC.Online?.rpc !== 'function') {
      return { ok: false, error: 'offline' };
    }
    const allKeys = ${JSON.stringify(keys)};
    const hotMap = {};
    try {
      const hotRes = await NC.Online.rpc('nc_market', { op: 'hot' });
      const rows = Array.isArray(hotRes?.rows) ? hotRes.rows : (Array.isArray(hotRes?.items) ? hotRes.items : (Array.isArray(hotRes) ? hotRes : []));
      for (const h of rows) {
        if (!h || !h.key) continue;
        hotMap[h.key] = {
          sales: Number(h.sales || h.n || 0),
          avg: Number(h.avg || 0),
          cheapest: Number(h.open?.cheapest || 0),
          pieces: Number(h.open?.pieces || 0),
          listings: Number(h.open?.listings || 0),
          isHot: true
        };
      }
    } catch (_) {}

    const prices = {};
    const BATCH = 80;
    for (let i = 0; i < allKeys.length; i += BATCH) {
      const chunk = allKeys.slice(i, i + BATCH);
      try {
        const pr = await NC.Online.rpc('nc_market', { op: 'prices', keys: chunk });
        const map = pr?.prices || pr?.rows || pr || {};
        if (Array.isArray(map)) {
          for (const row of map) {
            if (row && row.key) prices[row.key] = row;
          }
        } else if (map && typeof map === 'object') {
          for (const [k, v] of Object.entries(map)) {
            if (v && typeof v === 'object') prices[k] = v;
          }
        }
      } catch (_) {}
      await new Promise(r => setTimeout(r, 120));
    }

    return { ok: true, hotMap, prices, scannedAt: Date.now(), keyCount: allKeys.length };
  })()`;
}

function createCardMarketService(deps = {}) {
  const loadProfiles = deps.loadProfiles || (() => []);
  const evalProfilePort = deps.evalProfilePort || (async () => null);
  const queryProfileState = deps.queryProfileState || (async () => null);

  let catalog = safeReadJson(CATALOG_FILE, { cards: [], runes: [], extractedAt: 0 });
  let marketCache = safeReadJson(MARKET_CACHE_FILE, { hotMap: {}, prices: {}, lastFullSweepAt: 0 });
  let overrides = safeReadJson(OVERRIDES_FILE, {});
  let scanning = false;
  let sweepTimer = null;

  function getOnlineProfiles() {
    const profiles = loadProfiles() || [];
    return profiles.filter(p => p && p.debugPort);
  }

  async function pickHealthyPort() {
    const list = getOnlineProfiles();
    for (const p of list) {
      try {
        const r = await evalProfilePort(p.debugPort, `Boolean(window.NC?.Online?.on && window.NC?.game?.player && window.NC?.MAPS)`, 3500);
        if (r === true || r?.result === true) return p.debugPort;
      } catch (_) {}
    }
    return list[0]?.debugPort || null;
  }

  async function ensureCatalog(force = false) {
    if (!force && catalog.cards?.length > 50 && catalog.runes?.length > 20) return catalog;
    const port = await pickHealthyPort();
    if (!port) return catalog;
    try {
      const res = await evalProfilePort(port, EXTRACT_CATALOG_JS, 15000);
      const data = res?.result || res;
      if (data && data.ok && Array.isArray(data.cards) && Array.isArray(data.runes)) {
        catalog = { cards: data.cards, runes: data.runes, extractedAt: data.extractedAt || Date.now() };
        safeWriteJson(CATALOG_FILE, catalog);
      }
    } catch (_) {}
    return catalog;
  }

  async function scanMarket(opts = {}) {
    if (scanning) return { ok: false, error: 'already-scanning' };
    scanning = true;
    try {
      await ensureCatalog(Boolean(opts.refreshCatalog));
      const port = await pickHealthyPort();
      if (!port) return { ok: false, error: 'no-online-client' };

      const targetKind = opts.kind || 'all';
      const customIds = Array.isArray(opts.ids) && opts.ids.length > 0 ? new Set(opts.ids.map(String)) : null;
      const keys = [];
      if (targetKind === 'all' || targetKind === 'card') {
        for (const c of (catalog.cards || [])) {
          if (customIds && !customIds.has(c.id)) continue;
          keys.push(c.marketKey || ('mat:' + c.id));
        }
      }
      if (targetKind === 'all' || targetKind === 'rune') {
        for (const r of (catalog.runes || [])) {
          if (customIds && !customIds.has(r.id)) continue;
          keys.push(r.marketKey || ('rune:' + r.id));
        }
      }
      if (keys.length === 0) return { ok: false, error: 'empty-catalog' };

      const raw = await evalProfilePort(port, buildMarketSweepJs(keys), 45000);
      const res = raw?.result || raw;
      if (!res || !res.ok) return { ok: false, error: res?.error || 'scan-failed' };

      marketCache.hotMap = Object.assign({}, marketCache.hotMap || {}, res.hotMap || {});
      marketCache.prices = Object.assign({}, marketCache.prices || {}, res.prices || {});
      if (!customIds) marketCache.lastFullSweepAt = res.scannedAt || Date.now();
      safeWriteJson(MARKET_CACHE_FILE, marketCache);
      return { ok: true, scannedCount: keys.length, scannedAt: res.scannedAt || Date.now() };
    } catch (e) {
      return { ok: false, error: String(e?.message || e) };
    } finally {
      scanning = false;
    }
  }

  function enrichItems(kind) {
    const rawList = kind === 'rune' ? (catalog.runes || []) : (catalog.cards || []);
    const hotMap = marketCache.hotMap || {};
    const prices = marketCache.prices || {};

    // Count how many profiles currently have an override pointing to each item / map
    const mapFarmerCount = {};
    const itemFarmerCount = {};
    for (const ov of Object.values(overrides || {})) {
      if (!ov || !ov.mapId) continue;
      mapFarmerCount[ov.mapId] = (mapFarmerCount[ov.mapId] || 0) + 1;
      for (const iid of (ov.itemIds || [])) {
        itemFarmerCount[iid] = (itemFarmerCount[iid] || 0) + 1;
      }
    }

    return rawList.map(it => {
      const mKey = it.marketKey || ((kind === 'rune' ? 'rune:' : 'mat:') + it.id);
      const pr = prices[mKey] || {};
      const hot = hotMap[mKey] || null;
      const soldQty7d = Number(pr.sales || pr.pieces || pr.n || hot?.sales || 0);
      const medianPrice = Number(pr.median || hot?.avg || 0);
      const lastPrice = Number(pr.last || medianPrice || 0);
      const lowPrice = Number(pr.low || 0);
      const highPrice = Number(pr.high || 0);
      const lowestPrice = Number(hot?.cheapest || pr.cheapest || 0);
      const listedCount = Number(hot?.pieces || hot?.listings || 0);
      const avgSoldPerDay = Math.round((soldQty7d / 7) * 100) / 100;
      const avgSoldPerHour = Math.round((soldQty7d / 168) * 100) / 100;
      const turnover7d = Math.round(soldQty7d * (medianPrice || lastPrice || 0));

      return {
        ...it,
        soldQty7d,
        avgSoldPerDay,
        avgSoldPerHour,
        medianPrice,
        lastPrice,
        lowPrice,
        highPrice,
        lowestPrice,
        listedCount,
        turnover7d,
        isHot: Boolean(hot?.isHot),
        farmingCount: itemFarmerCount[it.id] || 0
      };
    });
  }

  async function buildClientsSnapshot() {
    const profiles = loadProfiles() || [];
    const out = [];
    for (const p of profiles) {
      let st = null;
      if (p.debugPort) {
        try { st = await queryProfileState(p); } catch (_) {}
      }
      const ov = overrides[p.id] || null;
      out.push({
        id: p.id,
        name: p.name || p.id,
        charName: st?.charName || p.lastCharName || p.name || p.id,
        charClass: st?.charClass || p.lastCharClass || '',
        jobId: st?.jobId || '',
        level: Number(st?.baseLv || p.lastBaseLv || 1),
        online: Boolean(p.debugPort && st && st.screenPhase === 'in_game'),
        isRunning: Boolean(p.debugPort && st),
        isBotRunning: Boolean(st?.isBotRunning),
        mapId: st?.mapId || '',
        mapName: st?.map || st?.mapName || '',
        channel: st?.channel || null,
        targetMap: st?.targetFarmMap || '',
        override: ov
      });
    }
    return out;
  }

  async function applyMultiFarm(kind, payload) {
    const selections = Array.isArray(payload.selections) ? payload.selections : [];
    const profileIds = Array.isArray(payload.profileIds) ? payload.profileIds.map(String).filter(Boolean) : [];
    if (selections.length === 0) return { success: false, error: 'กรุณาเลือกอย่างน้อย 1 รายการ' };
    if (profileIds.length === 0) return { success: false, error: 'กรุณาเลือกจอเกมอย่างน้อย 1 จอ' };

    await ensureCatalog(false);
    const allItems = kind === 'rune' ? (catalog.runes || []) : (catalog.cards || []);
    const itemById = new Map(allItems.map(x => [x.id, x]));

    // Build validated selection slots (each has mapId, itemIds, rules)
    const slots = [];
    for (const sel of selections) {
      if (!sel || !sel.id) continue;
      const item = itemById.get(String(sel.id));
      const mapId = String(sel.mapId || item?.maps?.[0]?.mapId || '').trim();
      if (!mapId) continue;
      const mapObj = item?.maps?.find(m => m.mapId === mapId) || item?.maps?.[0] || null;
      const rules = [];
      if (item) {
        // If Tier II rune selected, also whitelist Tier I (the actual monster drop!)
        if (kind === 'rune' && item.tier === 2 && item.runeKey) {
          rules.push({
            itemId: `bl_rune_${item.runeKey}_1`,
            itemName: `${item.baseName} I`,
            kind: 'rune',
            minQty: 1,
            sellMode: 'single'
          });
        }
        rules.push({
          itemId: item.id,
          itemName: item.name,
          kind: kind === 'rune' ? 'rune' : 'mat',
          minQty: 1,
          sellMode: kind === 'rune' ? 'single' : 'all'
        });
      }
      slots.push({
        itemId: String(sel.id),
        itemName: item?.name || String(sel.id),
        mapId,
        mapName: mapObj?.mapName || mapId,
        lvText: mapObj?.lvText || '',
        rules
      });
    }
    if (slots.length === 0) return { success: false, error: 'ไม่พบแมพที่สามารถฟาร์มได้จากรายการที่เลือก' };

    // Also include ALL other valuable cards/runes that drop on the same map in the auto-sell WL!
    for (const slot of slots) {
      const seenIds = new Set(slot.rules.map(r => r.itemId));
      const enrichedCards = enrichItems('card');
      const enrichedRunes = enrichItems('rune');
      for (const c of enrichedCards) {
        if (seenIds.has(c.id)) continue;
        if (c.medianPrice >= 50000 && c.maps?.some(m => m.mapId === slot.mapId)) {
          slot.rules.push({ itemId: c.id, itemName: c.name, kind: 'mat', minQty: 1, sellMode: 'all' });
          seenIds.add(c.id);
        }
      }
      for (const r of enrichedRunes) {
        if (r.tier !== 1 || seenIds.has(r.id)) continue;
        if (r.medianPrice >= 50000 && r.maps?.some(m => m.mapId === slot.mapId)) {
          slot.rules.push({ itemId: r.id, itemName: r.name, kind: 'rune', minQty: 1, sellMode: 'single' });
          seenIds.add(r.id);
        }
      }
    }

    // Evenly distribute profileIds across slots (round-robin)
    const profiles = loadProfiles() || [];
    const profileById = new Map(profiles.map(p => [String(p.id), p]));
    const applied = [];

    for (let i = 0; i < profileIds.length; i++) {
      const pid = profileIds[i];
      const slot = slots[i % slots.length];
      const prof = profileById.get(pid);
      overrides[pid] = {
        kind,
        mapId: slot.mapId,
        mapName: slot.mapName,
        lvText: slot.lvText,
        itemIds: [slot.itemId],
        itemNames: [slot.itemName],
        rules: slot.rules,
        updatedAt: Date.now()
      };

      let evalOk = false;
      let addedRules = [];
      if (prof && prof.debugPort) {
        try {
          const r = await evalProfilePort(
            prof.debugPort,
            `window.__setCardRuneFarmOverride ? window.__setCardRuneFarmOverride(${JSON.stringify(slot.mapId)}, ${JSON.stringify(slot.mapName)}, ${JSON.stringify(slot.rules)}) : { ok: false, error: 'no-helper' }`,
            8000
          );
          const data = r?.result || r;
          evalOk = Boolean(data && data.ok);
          addedRules = Array.isArray(data?.addedRules) ? data.addedRules : [];
        } catch (_) {}
      }
      applied.push({
        profileId: pid,
        profileName: prof?.name || pid,
        mapId: slot.mapId,
        mapName: slot.mapName,
        itemName: slot.itemName,
        onlineApplied: evalOk,
        addedRulesCount: addedRules.length
      });
    }

    safeWriteJson(OVERRIDES_FILE, overrides);
    return {
      success: true,
      kind,
      assignedCount: applied.length,
      slotsCount: slots.length,
      applied
    };
  }

  async function restorePlan(payload = {}) {
    const targetIds = Array.isArray(payload.profileIds) && payload.profileIds.length > 0
      ? payload.profileIds.map(String)
      : Object.keys(overrides || {});
    const kindFilter = payload.kind || null;
    const profiles = loadProfiles() || [];
    const profileById = new Map(profiles.map(p => [String(p.id), p]));
    const restored = [];

    for (const pid of targetIds) {
      const ov = overrides[pid];
      if (kindFilter && ov && ov.kind && ov.kind !== kindFilter) continue;
      delete overrides[pid];
      const prof = profileById.get(pid);
      let ok = false;
      if (prof && prof.debugPort) {
        try {
          const r = await evalProfilePort(
            prof.debugPort,
            `window.__clearCardRuneFarmOverride ? window.__clearCardRuneFarmOverride() : { ok: false }`,
            8000
          );
          ok = Boolean((r?.result || r)?.ok);
        } catch (_) {}
      }
      restored.push({ profileId: pid, ok });
    }

    safeWriteJson(OVERRIDES_FILE, overrides);
    return { success: true, restoredCount: restored.length, restored };
  }

  async function buildListResponse(kind) {
    await ensureCatalog(false);
    // If never scanned yet and an online screen exists, trigger initial live sweep immediately!
    if (!marketCache.lastFullSweepAt && !scanning) {
      const port = await pickHealthyPort();
      if (port) await scanMarket({ kind: 'all' });
    }
    const items = enrichItems(kind);
    const clients = await buildClientsSnapshot();
    const activeOverrides = Object.entries(overrides || {}).filter(([, ov]) => ov && ov.kind === kind);

    const traded = items.filter(x => x.soldQty7d > 0);
    const topVelocity = traded.slice().sort((a, b) => b.soldQty7d - a.soldQty7d)[0] || null;
    const topPrice = traded.slice().sort((a, b) => b.medianPrice - a.medianPrice)[0] || null;
    const topTurnover = traded.slice().sort((a, b) => b.turnover7d - a.turnover7d)[0] || null;

    return {
      success: true,
      kind,
      items,
      cards: kind === 'card' ? items : [],
      runes: kind === 'rune' ? items : [],
      clients,
      overrides,
      scanning,
      lastFullSweepAt: marketCache.lastFullSweepAt || 0,
      summary: {
        totalItems: items.length,
        tradedCount: traded.length,
        farmingClientsCount: activeOverrides.length,
        topVelocity: topVelocity ? { id: topVelocity.id, name: topVelocity.name, soldQty7d: topVelocity.soldQty7d, avgSoldPerDay: topVelocity.avgSoldPerDay, medianPrice: topVelocity.medianPrice } : null,
        topPrice: topPrice ? { id: topPrice.id, name: topPrice.name, medianPrice: topPrice.medianPrice, soldQty7d: topPrice.soldQty7d } : null,
        topTurnover: topTurnover ? { id: topTurnover.id, name: topTurnover.name, turnover7d: topTurnover.turnover7d, medianPrice: topTurnover.medianPrice, soldQty7d: topTurnover.soldQty7d } : null
      }
    };
  }

  async function handleRoute(req, res, pathname, sendJSON) {
    const isCard = pathname === '/api/cards' || pathname.startsWith('/api/cards/');
    const isRune = pathname === '/api/runes' || pathname.startsWith('/api/runes/');
    if (!isCard && !isRune) return false;
    const kind = isRune ? 'rune' : 'card';

    try {
      if (req.method === 'GET' && (pathname === '/api/cards' || pathname === '/api/runes')) {
        const data = await buildListResponse(kind);
        sendJSON(data);
        return true;
      }

      if (req.method === 'POST' && (pathname === '/api/cards/scan' || pathname === '/api/runes/scan')) {
        const body = await readJsonBody(req).catch(() => ({}));
        const scanRes = await scanMarket({
          kind: body.all ? 'all' : kind,
          ids: Array.isArray(body.ids) ? body.ids : null,
          refreshCatalog: Boolean(body.refreshCatalog)
        });
        const fresh = await buildListResponse(kind);
        sendJSON({ ...fresh, scanResult: scanRes });
        return true;
      }

      if (req.method === 'POST' && (pathname === '/api/cards/farm-multi' || pathname === '/api/runes/farm-multi')) {
        const body = await readJsonBody(req);
        const result = await applyMultiFarm(kind, body);
        sendJSON(result, result.success ? 200 : 400);
        return true;
      }

      if (req.method === 'POST' && (pathname === '/api/cards/restore-plan' || pathname === '/api/runes/restore-plan')) {
        const body = await readJsonBody(req).catch(() => ({}));
        const result = await restorePlan({ ...body, kind: body.all ? null : kind });
        sendJSON(result);
        return true;
      }
    } catch (e) {
      sendJSON({ success: false, error: String(e?.message || e) }, 500);
      return true;
    }

    return false;
  }

  function start() {
    if (sweepTimer) return;
    // Initial background sync 8s after boot + every 10 minutes
    setTimeout(() => {
      ensureCatalog(false).then(() => {
        if (!marketCache.lastFullSweepAt || (Date.now() - marketCache.lastFullSweepAt) > 10 * 60 * 1000) {
          scanMarket({ kind: 'all' }).catch(() => {});
        }
      }).catch(() => {});
    }, 8000);
    sweepTimer = setInterval(() => {
      scanMarket({ kind: 'all' }).catch(() => {});
    }, 10 * 60 * 1000);
  }

  function stop() {
    if (sweepTimer) { clearInterval(sweepTimer); sweepTimer = null; }
  }

  return { start, stop, handleRoute, ensureCatalog, scanMarket, buildListResponse, applyMultiFarm, restorePlan };
}

module.exports = { createCardMarketService };
