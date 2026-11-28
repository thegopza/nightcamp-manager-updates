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
    basic: '🗡️ ตีปกติ (Basic)',
    proj: '🎯 ยิงไกล/กระสุน',
    attack: '⚔️ โจมตี',
    area: '💥 พื้นที่/AOE',
    melee: '🗡️ ประชิด',
    pet: '🐾 ซัมมอน/สัตว์เลี้ยง',
    buff: '✨ บัฟ/ซัพพอร์ต',
    any: '🔮 ทั่วไป'
  };

  const LOW_LIFE_RUNES = ['boil', 'lastgasp', 'bloodsip', 'bloodward', 'bloodseal'];
  const LOW_LIFE_TYPES = new Set([
    'bat', 'bat_crimson', 'bat_king', 'echo_bat', 'fire_bat', 'kite_bat', 'kite_bat_crimson', 'mother_bat',
    'mosquito', 'mud_leech', 'mud_leech_red', 'root_crawler_crimson', 'fire_imp', 'imp_blue', 'lava_imp',
    'blast_imp', 'vial_imp', 'vial_imp_gold', 'baphomet', 'baphomet_root'
  ]);
  const PROJ_NEW_RUNES = ['farshot', 'focusfire', 'cluster', 'boomerang', 'rapidbounce'];
  const PROJ_NEW_FAMS = new Set(['shoot', 'split', 'wave']);
  const BASIC_AA_RUNES = ['tempo', 'rend', 'splash', 'charge', 'skillrhythm', 'leech'];
  const DAILY_DUN_RUNES = ['thornstab', 'deepcut', 'woundburst', 'bloodspread', 'woundsip', 'thornmantle'];

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
      if (LOW_LIFE_TYPES.has(b.sp)) {
        for (const lrk of LOW_LIFE_RUNES) {
          addRuneRec(lrk, { sp: b.sp, lo: b.lv, hi: b.lv, midLv: b.lv }, 8);
        }
      }
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
      const famKey = (typeof NC.BL.familyOf === 'function') ? NC.BL.familyOf(e.sp) : '';
      if (monSpec.eliteOf) {
        // Elites drop 'focus' & 'execute' AND the 6 Basic Attack Runes (AA_DROP)!
        addRuneRec('focus', e, sharePct);
        addRuneRec('execute', e, sharePct);
        for (const aark of BASIC_AA_RUNES) {
          addRuneRec(aark, e, sharePct);
        }
      } else {
        let rk = null;
        try {
          const rf = NC.BL.runeFor({ type: e.sp });
          if (Array.isArray(rf) && rf[0]) rk = rf[0];
        } catch (_) {}
        if (rk) addRuneRec(rk, e, sharePct);
      }
      // Low-life runes drop from blood/demon monsters (LOW_DROP)
      if (LOW_LIFE_TYPES.has(e.sp) || (monSpec.eliteOf && LOW_LIFE_TYPES.has(monSpec.eliteOf))) {
        for (const lrk of LOW_LIFE_RUNES) {
          addRuneRec(lrk, e, sharePct);
        }
      }
      // Projectile runes drop from shoot / split / wave monster families (PROJ_DROP)
      const baseFam = famKey || ((monSpec.eliteOf && typeof NC.BL.familyOf === 'function') ? NC.BL.familyOf(monSpec.eliteOf) : '');
      if (PROJ_NEW_FAMS.has(baseFam)) {
        for (const prk of PROJ_NEW_RUNES) {
          addRuneRec(prk, e, sharePct);
        }
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

  // Daily Dungeon Runes (โพรงเนื้อหนาม flesh_d)
  for (const ddrk of DAILY_DUN_RUNES) {
    if (!runeMaps[ddrk]) {
      runeMaps[ddrk] = [{
        mapId: 'flesh_d',
        mapName: 'โพรงเนื้อหนาม (ดันเจี้ยนรายวัน)',
        lvText: 'Lv 60–99',
        minLv: 60,
        maxLv: 99,
        mapMinLv: 60,
        mapMaxLv: 99,
        monsterLv: 75,
        sharePct: 100,
        hasBoss: true,
        monsters: [
          { sp: 'fl_eye', name: 'ตาเนื้อหนาม', lv: 65, sharePct: 35 },
          { sp: 'fl_sac', name: 'ถุงน้ำดีหนาม', lv: 75, sharePct: 35 },
          { sp: 'fl_crawler', name: 'หนอนเอ็นกระดูก', lv: 85, sharePct: 30 }
        ]
      }];
    }
  }

  // 3. Build Skill Runes list (Tier I, Tier II & Tier III)
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
    for (const tier of [1, 2, 3]) {
      const roman = tier === 1 ? 'I' : (tier === 2 ? 'II' : 'III');
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
        craftNote: tier === 2 ? 'หลอมจาก Tier I (3 ชิ้น) · ฟาร์มแมพดรอป Tier I' : (tier === 3 ? 'หลอมจาก Tier II (3 ชิ้น) · ขั้นสูงสุด' : ''),
        minLv,
        maxLv,
        maps
      });
    }
  }

  return { ok: true, cards, runes, extractedAt: Date.now() };
})()`;

// In-page market RPC sweep (hot + batched 7d prices + REAL 24h chart D/H stats for every active item)
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
          n: Number(h.n || h.sales || 0),
          avg: Number(h.avg || 0),
          before: Number(h.before || 0),
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
      await new Promise(r => setTimeout(r, 90));
    }

    // Phase 2: Fetch TRUE 24-hour ('24h') chart metrics (n, sales, avg, lo, hi, last)
    // Skip keys whose lastAt > 24h ago (mathematically 0 in 24h) and reuse hotMap for items already in hot!
    const cutoff24h = Date.now() - (24 * 3600 * 1000) - 60000;
    const charts24h = {};
    const needChartKeys = [];

    for (const k of allKeys) {
      const p = prices[k];
      const h = hotMap[k];
      const pSales = p ? Number(p.sales || p.pieces || p.n || 0) : 0;
      const pLastAt = p ? Number(p.lastAt || 0) : 0;
      if (h && Number(h.n || h.sales || 0) > 0) {
        charts24h[k] = {
          n: Number(h.n || h.sales || 0),
          sales: Number(h.sales || h.n || 0),
          avg: Number(h.avg || 0),
          lo: Number(p?.low || 0),
          hi: Number(p?.high || 0),
          last: Number(p?.last || h.avg || 0),
          lastAt: pLastAt
        };
        continue;
      }
      if (pSales <= 0 || (pLastAt > 0 && pLastAt < cutoff24h)) {
        charts24h[k] = { n: 0, sales: 0, avg: 0, lo: 0, hi: 0, last: Number(p?.last || 0), lastAt: pLastAt };
        continue;
      }
      needChartKeys.push(k);
    }

    // Prioritize highest-value / highest-volume items first
    needChartKeys.sort((a, b) => {
      const pa = prices[a] || {}, pb = prices[b] || {};
      const ta = Number(pa.sales || 0) * Number(pa.median || pa.last || 0);
      const tb = Number(pb.sales || 0) * Number(pb.median || pb.last || 0);
      return tb - ta;
    });

    const C_CONC = 4;
    let rateLimitedHits = 0;
    let failedKeys = [];
    const fetchOneChart = async (k) => {
      const ch = await NC.Online.rpc('nc_market', { op: 'chart', key: k, range: '24h' });
      if (ch && typeof ch === 'object') {
        charts24h[k] = {
          n: Number(ch.n || ch.sales || 0),
          sales: Number(ch.sales || ch.n || 0),
          avg: Number(ch.avg || 0),
          lo: Number(ch.lo || 0),
          hi: Number(ch.hi || 0),
          last: Number(ch.last || 0),
          lastAt: Number(ch.lastAt || 0)
        };
        return true;
      }
      return false;
    };

    for (let i = 0; i < needChartKeys.length; i += C_CONC) {
      const batch = needChartKeys.slice(i, i + C_CONC);
      let batchHadErr = false;
      await Promise.all(batch.map(async (k) => {
        try {
          await fetchOneChart(k);
        } catch (_) {
          batchHadErr = true;
          rateLimitedHits++;
          failedKeys.push(k);
        }
      }));
      if (i + C_CONC < needChartKeys.length) {
        await new Promise(r => setTimeout(r, batchHadErr ? 950 : 210));
      }
    }

    // Single gentle retry pass for any keys that hit transient burst rate-limit
    if (failedKeys.length > 0) {
      await new Promise(r => setTimeout(r, 1200));
      for (let i = 0; i < failedKeys.length; i += 2) {
        const batch = failedKeys.slice(i, i + 2);
        await Promise.all(batch.map(async (k) => {
          try { await fetchOneChart(k); } catch (_) {}
        }));
        if (i + 2 < failedKeys.length) await new Promise(r => setTimeout(r, 380));
      }
    }

    return { ok: true, hotMap, prices, charts24h, active24hChecked: needChartKeys.length, rateLimitedHits, scannedAt: Date.now(), keyCount: allKeys.length };
  })()`;
}

function createCardMarketService(deps = {}) {
  const loadProfiles = deps.loadProfiles || (() => []);
  const evalProfilePort = deps.evalProfilePort || (async () => null);
  const queryProfileState = deps.queryProfileState || (async () => null);

  let catalog = safeReadJson(CATALOG_FILE, { cards: [], runes: [], extractedAt: 0 });
  let marketCache = safeReadJson(MARKET_CACHE_FILE, { hotMap: {}, prices: {}, charts24h: {}, lastFullSweepAt: 0 });
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

  function enrichRuneMapsFromWiki(runesList) {
    try {
      const wikiPath = path.join(__dirname, 'public', 'wiki', 'data.json');
      if (!fs.existsSync(wikiPath)) return runesList;
      const wiki = JSON.parse(fs.readFileSync(wikiPath, 'utf8'));
      const mapByTh = new Map();
      for (const mp of (wiki.maps || [])) {
        const thName = mp?.n?.th || mp?.n?.en || mp?.id;
        if (thName) mapByTh.set(thName, mp);
      }
      const wikiRuneByKey = new Map((wiki.runes || []).map(r => [r.k, r]));
      for (const r of runesList) {
        if (Array.isArray(r.maps) && r.maps.length > 0) continue;
        const wr = wikiRuneByKey.get(r.runeKey);
        if (!wr || !Array.isArray(wr.drops) || wr.drops.length === 0) continue;
        const perMap = new Map();
        for (const d of wr.drops) {
          // d = [monId, chance, lv, monNameObj, mapNameObjs]
          const monId = d[0];
          const monLv = Number(d[2]) || 1;
          const monName = d[3]?.th || d[3]?.en || monId;
          const mapNames = Array.isArray(d[4]) ? d[4] : [];
          for (const mnObj of mapNames) {
            const mName = mnObj?.th || mnObj?.en || '';
            if (!mName) continue;
            const wMap = mapByTh.get(mName);
            const mapId = wMap?.id || mName;
            let rec = perMap.get(mapId);
            if (!rec) {
              rec = {
                mapId,
                mapName: mName,
                lvText: wMap?.lv ? `Lv ${wMap.lv}` : `Lv ${monLv}`,
                minLv: monLv,
                maxLv: monLv,
                mapMinLv: monLv,
                mapMaxLv: monLv,
                monsterLv: monLv,
                sharePct: 25,
                hasBoss: false,
                monsters: []
              };
              perMap.set(mapId, rec);
            }
            if (monLv < rec.minLv) rec.minLv = monLv;
            if (monLv > rec.maxLv) rec.maxLv = monLv;
            rec.monsters.push({ sp: monId, name: monName, lv: monLv, sharePct: 25 });
          }
        }
        const builtMaps = Array.from(perMap.values()).sort((a, b) => a.minLv - b.minLv);
        if (builtMaps.length > 0) {
          r.maps = builtMaps;
          r.minLv = Math.min(...builtMaps.map(m => m.minLv));
          r.maxLv = Math.max(...builtMaps.map(m => m.maxLv));
        }
      }
    } catch (_) {}
    return runesList;
  }

  async function ensureCatalog(force = false) {
    if (!force && catalog.cards?.length >= 338 && catalog.runes?.length >= 231) return catalog;
    const port = await pickHealthyPort();
    if (!port) return catalog;
    try {
      const res = await evalProfilePort(port, EXTRACT_CATALOG_JS, 15000);
      const data = res?.result || res;
      if (data && data.ok && Array.isArray(data.cards) && Array.isArray(data.runes)) {
        const enrichedRunes = enrichRuneMapsFromWiki(data.runes);
        catalog = { cards: data.cards, runes: enrichedRunes, extractedAt: data.extractedAt || Date.now() };
        safeWriteJson(CATALOG_FILE, catalog);
      }
    } catch (_) {}
    return catalog;
  }

  const EXTRACT_FULL_GAMEDATA_JS = `(() => {
    const NC = window.NC;
    if (!NC || !NC.BL || !NC.ITEMS || !NC.MATERIALS || !NC.SKILLS) {
      return { ok: false, error: 'nightcamp-not-ready' };
    }
    const runes = {};
    for (const [k, r] of Object.entries(NC.BL.RUNES || {})) {
      if (!r) continue;
      runes[k] = {
        k,
        n: r.n || k,
        on: r.on || 'any',
        el: r.el || null,
        t: Array.isArray(r.t) ? r.t.slice() : [],
        extra: r.extra, kVal: r.k, s: r.s, d: r.d, c: r.c, dk: r.dk, n2: r.n2, at: r.at, hi: r.hi, hp: r.hp,
        roll: r.roll || null,
        proc: Boolean(r.proc),
        gun: Boolean(r.gun),
        ice: r.ice || null,
        wield: r.wield || null
      };
    }
    const rkeys = Array.isArray(NC.BL.RKEYS) ? NC.BL.RKEYS.slice() : Object.keys(runes);
    const skillFits = {};
    for (const [sid, sk] of Object.entries(NC.SKILLS || {})) {
      if (!sk || sk.hidden) continue;
      try {
        const kinds = typeof NC.BL.kindsOf === 'function' ? NC.BL.kindsOf(sid) : [];
        const fit = typeof NC.BL.fits === 'function' ? rkeys.filter(rk => NC.BL.fits(sid, rk)) : [];
        skillFits[sid] = { kinds, fit };
      } catch (_) {}
    }
    const basicSk = NC.SKILLS?.bl_basic || {};
    const basicSlotLvs = Array.isArray(basicSk.runeLv) && basicSk.runeLv.length > 0 ? basicSk.runeLv.slice() : [40, 70, 90];
    const items = {};
    for (const [id, it] of Object.entries(NC.ITEMS || {})) {
      if (!it || !id) continue;
      const wtype = (typeof NC.wtypeOf === 'function' && it.slot === 'weapon') ? NC.wtypeOf(it) : (it.wtype || it.wt || undefined);
      items[id] = {
        id,
        name: it.name || id,
        slot: it.slot || '',
        h: it.twoHand ? 2 : 1,
        lv: Number(it.lvReq || it.level || it.lv || it.reqLv || 1),
        rar: it.rarity || it.rar || 'common',
        wt: wtype || undefined,
        el: it.element || it.el || undefined,
        atk: Array.isArray(it.dmg) ? Math.round((Number(it.dmg[0] || 0) + Number(it.dmg[1] || 0)) / 2) : (it.atk || undefined),
        stats: it.stats || {},
        desc: it.desc || '',
        set: it.of?.set || it.set || undefined,
        abil: typeof it.abilText === 'string' ? it.abilText : (typeof it.abil === 'string' ? it.abil : undefined),
        wsk: it.wskillText || undefined
      };
    }
    const outfitSets = {};
    for (const [sid, s] of Object.entries(NC.OUTFITS?.sets || {})) {
      if (!s || !sid) continue;
      const pcs = [s.items?.top, s.items?.pants, s.acc].filter(Boolean);
      const pEntry = NC.SetFx?.S?.[sid];
      outfitSets[sid] = {
        id: sid,
        n: s.name || sid,
        line: s.line || 'hv',
        g: Number(s.grade || 3),
        lv: Number(s.lv || 60),
        pcs,
        pas: Array.isArray(pEntry) ? String(pEntry[0] || '') : ''
      };
    }
    const materials = {};
    for (const [id, mt] of Object.entries(NC.MATERIALS || {})) {
      if (!mt || !id) continue;
      materials[id] = {
        id,
        name: mt.name || id,
        price: Number(mt.price || mt.p || 0),
        desc: mt.desc || '',
        rare: Boolean(mt.rare),
        kindTh: mt.kindTh || ''
      };
    }
    const monsters = {};
    for (const [id, m] of Object.entries(NC.MONSTERS || {})) {
      if (!m || !id) continue;
      monsters[id] = {
        id,
        name: m.name || id,
        lv: Number(m.lv || 1),
        el: m.element || 'neutral',
        race: m.race || '',
        boss: Boolean(m.boss || m.story || m.root),
        hp: Number(m.hp || 0)
      };
    }
    return {
      ok: true,
      rkeys,
      runes,
      skillFits,
      basicSlotLvs,
      items,
      outfitSets,
      materials,
      monsters
    };
  })()`;

  async function syncLiveGameDataToCatalogs() {
    await ensureCatalog(true);
    const port = await pickHealthyPort();
    if (!port) return { success: false, error: 'no-online-client' };
    const raw = await evalProfilePort(port, EXTRACT_FULL_GAMEDATA_JS, 25000);
    const live = raw?.result || raw;
    if (!live || !live.ok) {
      return { success: false, error: live?.error || 'extract-failed' };
    }

    const EN_RUNE_NAMES = {
      boil: 'Blood Boil Rune',
      lastgasp: 'Last Gasp Rune',
      bloodsip: 'Wounded Thirst Rune',
      bloodward: 'Blood Ward Rune',
      bloodseal: 'Blood Seal Rune',
      farshot: 'Farshot Rune',
      focusfire: 'Focus Fire Rune',
      cluster: 'Cluster Shard Rune',
      boomerang: 'Boomerang Rune',
      rapidbounce: 'Rapid Ricochet Rune',
      tempo: 'Tempo Rune',
      rend: 'Deep Rend Rune',
      splash: 'Splash Rune',
      charge: 'Power Charge Rune',
      skillrhythm: 'Skill Rhythm Rune',
      leech: 'Life Leech Rune',
      thornstab: 'Thorn Stab Rune',
      deepcut: 'Deep Cut Rune',
      woundburst: 'Wound Burst Rune',
      bloodspread: 'Blood Spread Rune',
      woundsip: 'Wound Sip Rune',
      thornmantle: 'Thorn Mantle Rune'
    };

    // 1. Update manager/public/nightcamp_gear_catalog.json
    let gearAddedRunes = 0, gearAddedItems = 0;
    const gearCatPath = path.join(__dirname, 'public', 'nightcamp_gear_catalog.json');
    if (fs.existsSync(gearCatPath)) {
      const g = JSON.parse(fs.readFileSync(gearCatPath, 'utf8'));
      const existingRuneMap = new Map((g.runes || []).map(r => [r.k, r]));
      for (const rk of live.rkeys) {
        const lr = live.runes[rk];
        if (!lr) continue;
        if (existingRuneMap.has(rk)) {
          const er = existingRuneMap.get(rk);
          er.name = lr.n || er.name;
          er.on = lr.on || er.on;
          if (Array.isArray(lr.t) && lr.t.length > 0) er.t = lr.t;
        } else {
          g.runes.push({
            k: rk,
            name: lr.n,
            on: lr.on,
            t: lr.t,
            ic: [null, null, null]
          });
          gearAddedRunes++;
        }
      }
      if (g.basicRunes) {
        g.basicRunes.slotLvs = live.basicSlotLvs || [40, 70, 90];
        const aaKeys = live.rkeys.filter(rk => live.runes[rk]?.on === 'basic');
        const uni = new Set([...(g.basicRunes.universalFits || []), ...aaKeys]);
        g.basicRunes.universalFits = Array.from(uni);
      }
      for (const sk of (g.skills || [])) {
        const lf = live.skillFits[sk.id];
        if (lf) {
          if (Array.isArray(lf.kinds) && lf.kinds.length > 0) sk.kinds = lf.kinds;
          if (Array.isArray(lf.fit) && lf.fit.length > 0) {
            sk.fit = lf.fit;
            sk.fits = lf.fit;
          }
        }
      }
      const existingItemMap = new Map((g.items || []).map(it => [it.id, it]));
      for (const [id, lit] of Object.entries(live.items || {})) {
        if (existingItemMap.has(id)) {
          const ex = existingItemMap.get(id);
          if (lit.lv > 1 && (!ex.lv || ex.lv === 1)) ex.lv = lit.lv;
          if (lit.wt && !ex.wt) ex.wt = lit.wt;
          if (lit.atk && !ex.atk) ex.atk = lit.atk;
          if (lit.set && !ex.set) ex.set = lit.set;
          if (lit.abil && typeof lit.abil === 'string' && (!ex.abil || typeof ex.abil !== 'string')) ex.abil = lit.abil;
          continue;
        }
        if (!['weapon', 'shield', 'hat', 'glasses', 'top', 'pants', 'gloves', 'boots', 'cape', 'acc'].includes(lit.slot)) continue;
        g.items.push({
          id: lit.id,
          name: lit.name,
          slot: lit.slot,
          h: lit.h,
          lv: lit.lv,
          rar: lit.rar,
          ...(lit.wt ? { wt: lit.wt } : {}),
          ...(lit.el ? { el: lit.el } : {}),
          ...(lit.atk ? { atk: lit.atk } : {}),
          stats: lit.stats || {},
          ...(lit.set ? { set: lit.set } : {}),
          ...(lit.wsk ? { wsk: lit.wsk } : {}),
          ...(lit.abil ? { abil: lit.abil } : {})
        });
        gearAddedItems++;
      }
      g.generatedAt = new Date().toISOString();
      fs.writeFileSync(gearCatPath, JSON.stringify(g), 'utf8');
    }

    // 2. Update manager/public/wiki/data.json and nightcamp-wiki/data.json
    let wikiAddedRunes = 0, wikiAddedItems = 0, wikiAddedMats = 0;
    const wikiPaths = [
      path.join(__dirname, 'public', 'wiki', 'data.json'),
      path.join(__dirname, '..', 'nightcamp-wiki', 'data.json')
    ];
    const catRuneByKey = new Map();
    for (const r of (catalog.runes || [])) {
      if (r.tier === 1) catRuneByKey.set(r.runeKey, r);
    }

    for (const wp of wikiPaths) {
      if (!fs.existsSync(wp)) continue;
      const w = JSON.parse(fs.readFileSync(wp, 'utf8'));
      if (w.meta && w.meta.on && !w.meta.on.basic) {
        w.meta.on.basic = { en: 'Basic Attack', th: 'ตีปกติ' };
      }
      const wRuneMap = new Map((w.runes || []).map(r => [r.k, r]));
      for (const rk of live.rkeys) {
        const lr = live.runes[rk];
        if (!lr) continue;
        const catR = catRuneByKey.get(rk);
        const builtDrops = (catR?.maps || []).slice(0, 12).map(mp => {
          const m0 = (mp.monsters && mp.monsters[0]) || { sp: mp.mapId, name: mp.mapName, lv: mp.minLv || 1 };
          return [
            m0.sp,
            0.0015,
            m0.lv || mp.minLv || 1,
            { en: m0.name, th: m0.name },
            [{ en: mp.mapName, th: mp.mapName }]
          ];
        });
        const numObj = {};
        if (lr.extra) numObj.extra = lr.extra;
        if (lr.kVal) numObj.k = lr.kVal;
        if (lr.s) numObj.s = lr.s;
        if (lr.d) numObj.d = lr.d;
        if (lr.c) numObj.c = lr.c;
        if (lr.dk) numObj.dk = lr.dk;
        if (lr.n2) numObj.n2 = lr.n2;
        if (lr.at) numObj.at = lr.at;
        if (lr.hi) numObj.hi = lr.hi;
        if (lr.hp) numObj.hp = lr.hp;
        if (lr.roll) numObj.roll = lr.roll;

        if (wRuneMap.has(rk)) {
          const wr = wRuneMap.get(rk);
          if (wr.n && (wr.n.th === wr.n.en || !wr.n.th) && lr.n) {
            wr.n.th = lr.n;
          }
          if (Array.isArray(lr.t) && lr.t.length === 3) {
            wr.t = wr.t.map((tobj, idx) => ({
              en: tobj?.en || lr.t[idx],
              th: lr.t[idx] || tobj?.th || tobj?.en
            }));
          }
          if ((!wr.drops || wr.drops.length === 0) && builtDrops.length > 0) {
            wr.drops = builtDrops;
          }
          if (Object.keys(numObj).length > 0 && (!wr.num || Object.keys(wr.num).length === 0)) {
            wr.num = numObj;
          }
        } else {
          w.runes.push({
            k: rk,
            kind: lr.gun ? 'gun' : (lr.proc ? 'proc' : 'skill'),
            on: lr.on || 'any',
            el: lr.el || null,
            n: { en: EN_RUNE_NAMES[rk] || lr.n || rk, th: lr.n || rk },
            t: (lr.t || []).map(txt => ({ en: txt, th: txt })),
            num: numObj,
            drops: builtDrops,
            ic: [null, null, null]
          });
          if (wp === wikiPaths[0]) wikiAddedRunes++;
        }
      }
      for (const sk of (w.skills || [])) {
        const lf = live.skillFits[sk.id];
        if (lf) {
          if (Array.isArray(lf.kinds) && lf.kinds.length > 0) sk.kinds = lf.kinds;
          if (Array.isArray(lf.fit) && lf.fit.length > 0) sk.fit = lf.fit;
        }
      }
      const wEqItems = w.equip?.items || [];
      const wEqMap = new Map(wEqItems.map(x => [x.id, x]));
      for (const [id, lit] of Object.entries(live.items || {})) {
        if (wEqMap.has(id)) {
          const ex = wEqMap.get(id);
          if (lit.lv > 1 && (!ex.lv || ex.lv === 1)) ex.lv = lit.lv;
          if (lit.wt && !ex.wt) ex.wt = lit.wt;
          if (lit.atk && !ex.atk) ex.atk = lit.atk;
          if (lit.set && !ex.set) ex.set = lit.set;
          if (lit.abil && typeof lit.abil === 'string') ex.ab = { en: lit.abil, th: lit.abil };
          continue;
        }
        if (!['weapon', 'shield', 'hat', 'glasses', 'top', 'pants', 'gloves', 'boots', 'cape', 'acc'].includes(lit.slot)) continue;
        wEqItems.push({
          id: lit.id,
          n: { en: lit.name, th: lit.name },
          s: lit.slot,
          r: lit.rar,
          lv: lit.lv,
          d: { en: lit.desc || '', th: lit.desc || '' },
          st: lit.stats || {},
          src: { t: id.startsWith('top_fl_') || id.startsWith('pants_fl_') || id.startsWith('acc_fl_') || id.startsWith('dw_') ? 'world' : 'forge' },
          ...(lit.set ? { set: lit.set } : {}),
          ...(lit.wt ? { wt: lit.wt } : {}),
          ...(lit.atk ? { atk: lit.atk } : {}),
          ...(lit.el ? { el: lit.el } : {}),
          ...(lit.abil ? { ab: { en: lit.abil, th: lit.abil } } : {})
        });
        if (wp === wikiPaths[0]) wikiAddedItems++;
      }
      const wSets = w.equip?.sets || [];
      const wSetIds = new Set(wSets.map(x => x.id));
      for (const [sid, s] of Object.entries(live.outfitSets || {})) {
        if (wSetIds.has(sid)) continue;
        wSets.push({
          id: s.id,
          n: { en: s.n, th: s.n },
          line: s.line,
          g: s.g,
          lv: s.lv,
          pcs: s.pcs,
          b2: { en: '2-piece line bonus', th: 'ครบ 2 ชิ้น: โบนัสสายอาชีพ' },
          b3: { en: '3-piece set bonus', th: 'ครบ 3 ชิ้น: โบนัสเซ็ต' },
          pas: { en: s.pas || '', th: s.pas || '' }
        });
      }
      const wMatList = w.materials || [];
      const wMatIds = new Set(wMatList.map(x => x.id));
      for (const [id, lmt] of Object.entries(live.materials || {})) {
        if (wMatIds.has(id)) continue;
        wMatList.push({
          id: lmt.id,
          n: { en: lmt.name, th: lmt.name },
          p: lmt.price,
          d: { en: lmt.desc || '', th: lmt.desc || '' },
          rare: lmt.rare,
          life: false,
          from: null,
          ic: null,
          drops: []
        });
        if (wp === wikiPaths[0]) wikiAddedMats++;
      }
      fs.writeFileSync(wp, JSON.stringify(w), 'utf8');
    }

    return {
      success: true,
      liveRunesTotal: live.rkeys.length,
      catalogRunesTotal: catalog.runes?.length || 0,
      catalogCardsTotal: catalog.cards?.length || 0,
      gearAddedRunes,
      gearAddedItems,
      wikiAddedRunes,
      wikiAddedItems,
      wikiAddedMats
    };
  }

  async function scanMarket(opts = {}) {
    if (opts.refreshCatalog) {
      await ensureCatalog(true).catch(() => {});
    }
    if (scanning) return { ok: false, error: 'already-scanning' };
    scanning = true;
    try {
      await ensureCatalog(false);
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

      const raw = await evalProfilePort(port, buildMarketSweepJs(keys), 90000);
      const res = raw?.result || raw;
      if (!res || !res.ok) return { ok: false, error: res?.error || 'scan-failed' };

      marketCache.hotMap = Object.assign({}, marketCache.hotMap || {}, res.hotMap || {});
      marketCache.prices = Object.assign({}, marketCache.prices || {}, res.prices || {});
      marketCache.charts24h = Object.assign({}, marketCache.charts24h || {}, res.charts24h || {});
      if (!customIds) marketCache.lastFullSweepAt = res.scannedAt || Date.now();
      safeWriteJson(MARKET_CACHE_FILE, marketCache);
      return { ok: true, scannedCount: keys.length, active24hChecked: res.active24hChecked || 0, scannedAt: res.scannedAt || Date.now() };
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
    const charts24h = marketCache.charts24h || {};

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
      const ch24 = charts24h[mKey] || null;

      const soldQty7d = Number(pr.sales || pr.pieces || pr.n || 0);
      const soldQty24h = ch24
        ? Number(ch24.n || ch24.sales || 0)
        : (hot ? Number(hot.n || hot.sales || 0) : 0);

      const avgPrice24h = Number(ch24?.avg || hot?.avg || 0);
      const medianPrice = Number(pr.median || avgPrice24h || 0);
      const displayPrice = avgPrice24h || medianPrice || Number(pr.last || 0);
      const lastPrice = Number(ch24?.last || pr.last || displayPrice || 0);
      const lowPrice = Number(ch24?.lo || pr.low || 0);
      const highPrice = Number(ch24?.hi || pr.high || 0);
      const lowestPrice = Number(hot?.cheapest || pr.cheapest || 0);
      const listedCount = Number(hot?.pieces || hot?.listings || 0);

      // True 24-hour (D/H) velocity: pieces per day (last 24h) & pieces per hour (last 24h / 24)
      const avgSoldPerDay = soldQty24h;
      const avgSoldPerHour = Math.round((soldQty24h / 24) * 100) / 100;
      const turnover24h = Math.round(soldQty24h * (avgPrice24h || lastPrice || medianPrice || 0));
      const turnover7d = Math.round(soldQty7d * (medianPrice || lastPrice || 0));

      return {
        ...it,
        soldQty24h,
        soldQty7d,
        avgSoldPerDay,
        avgSoldPerHour,
        avgPrice24h,
        displayPrice,
        medianPrice,
        lastPrice,
        lowPrice,
        highPrice,
        lowestPrice,
        listedCount,
        turnover24h,
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
        if (Math.max(c.avgPrice24h || 0, c.medianPrice || 0) >= 50000 && c.maps?.some(m => m.mapId === slot.mapId)) {
          slot.rules.push({ itemId: c.id, itemName: c.name, kind: 'mat', minQty: 1, sellMode: 'all' });
          seenIds.add(c.id);
        }
      }
      for (const r of enrichedRunes) {
        if (r.tier !== 1 || seenIds.has(r.id)) continue;
        if (Math.max(r.avgPrice24h || 0, r.medianPrice || 0) >= 50000 && r.maps?.some(m => m.mapId === slot.mapId)) {
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
    // If never scanned yet OR cache doesn't have 24h chart metrics yet, trigger live sweep!
    const hasCharts24h = marketCache.charts24h && Object.keys(marketCache.charts24h).length > 0;
    if ((!marketCache.lastFullSweepAt || !hasCharts24h) && !scanning) {
      const port = await pickHealthyPort();
      if (port) await scanMarket({ kind: 'all' });
    }
    const items = enrichItems(kind);
    const clients = await buildClientsSnapshot();
    const activeOverrides = Object.entries(overrides || {}).filter(([, ov]) => ov && ov.kind === kind);

    const traded24h = items.filter(x => x.soldQty24h > 0);
    const tradedAny = traded24h.length > 0 ? traded24h : items.filter(x => x.soldQty7d > 0);
    const topVelocity = tradedAny.slice().sort((a, b) => (b.soldQty24h - a.soldQty24h) || (b.avgPrice24h - a.avgPrice24h))[0] || null;
    const topPrice = tradedAny.slice().sort((a, b) => (b.displayPrice - a.displayPrice) || (b.soldQty24h - a.soldQty24h))[0] || null;
    const topTurnover = tradedAny.slice().sort((a, b) => (b.turnover24h - a.turnover24h) || (b.soldQty24h - a.soldQty24h))[0] || null;

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
        tradedCount: traded24h.length,
        tradedCount24h: traded24h.length,
        tradedCount7d: items.filter(x => x.soldQty7d > 0).length,
        farmingClientsCount: activeOverrides.length,
        topVelocity: topVelocity ? {
          id: topVelocity.id,
          name: topVelocity.name,
          soldQty24h: topVelocity.soldQty24h,
          avgSoldPerDay: topVelocity.avgSoldPerDay,
          avgSoldPerHour: topVelocity.avgSoldPerHour,
          avgPrice24h: topVelocity.avgPrice24h,
          displayPrice: topVelocity.displayPrice,
          medianPrice: topVelocity.medianPrice
        } : null,
        topPrice: topPrice ? {
          id: topPrice.id,
          name: topPrice.name,
          avgPrice24h: topPrice.avgPrice24h,
          displayPrice: topPrice.displayPrice,
          medianPrice: topPrice.medianPrice,
          soldQty24h: topPrice.soldQty24h,
          avgSoldPerHour: topPrice.avgSoldPerHour
        } : null,
        topTurnover: topTurnover ? {
          id: topTurnover.id,
          name: topTurnover.name,
          turnover24h: topTurnover.turnover24h,
          displayPrice: topTurnover.displayPrice,
          soldQty24h: topTurnover.soldQty24h
        } : null
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

      if (req.method === 'POST' && pathname === '/api/runes/sync-gamedata') {
        const syncRes = await syncLiveGameDataToCatalogs();
        sendJSON(syncRes, syncRes.success ? 200 : 500);
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
