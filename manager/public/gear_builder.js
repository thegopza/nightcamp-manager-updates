// ============================================================================
// NIGHTCAMP VISUAL SET GEAR BUILDER (v2.2.0)
// plan.gearPlan = { enabled, startClass, reserveCoins, steps: [...] }
// Per-Slot Priority Lock: slots satisfied by Set Gear are locked against
// Smart Gear, Auto-Sell, Auto-Store & Party Share; unconfigured slots keep
// using Smart Gear automatically.
// ============================================================================
(function () {
  'use strict';

  const LEFT_SLOTS = [
    { key: 'hat', label: 'หมวก', icon: '🎩' },
    { key: 'glasses', label: 'แว่นตา', icon: '🕶️' },
    { key: 'top', label: 'เสื้อเกราะ', icon: '👕' },
    { key: 'pants', label: 'กางเกง', icon: '👖' },
    { key: 'cape', label: 'ผ้าคลุม', icon: '🧣' }
  ];
  const RIGHT_SLOTS = [
    { key: 'weapon', label: 'อาวุธ', icon: '⚔️' },
    { key: 'shield', label: 'โล่', icon: '🛡️' },
    { key: 'acc1', label: 'ประดับ 1', icon: '💍' },
    { key: 'acc2', label: 'ประดับ 2', icon: '📿' }
  ];
  const ALL_SLOTS = LEFT_SLOTS.concat(RIGHT_SLOTS);
  const SLOT_LABEL = Object.fromEntries(ALL_SLOTS.map(s => [s.key, `${s.icon} ${s.label}`]));

  const RARITY_META = {
    common: { label: 'ทั่วไป', color: '#cbd5e1', badge: '⚪' },
    rare: { label: 'หายาก', color: '#60a5fa', badge: '🔵' },
    epic: { label: 'มหากาพย์', color: '#c084fc', badge: '🟣' },
    legend: { label: 'ตำนาน', color: '#fbbf24', badge: '🟡' }
  };

  const GRADE_OPTIONS = [
    [0, 'G0 ด้าน+'],
    [1, 'G1 เรียบ+'],
    [2, 'G2 ใส+'],
    [3, 'G3 แวววาว+'],
    [4, 'G4 แสงจันทร์+']
  ];

  const OPT_FILTERS = [
    ['', 'ไม่จำกัดออปชัน'],
    ['leech', 'ดูดเลือด (leech)'],
    ['atk', 'ATK เพิ่ม (atk)'],
    ['matk', 'MATK เพิ่ม (matk)'],
    ['pen', 'เจาะเกราะ (pen)'],
    ['crit', 'คริติคอล (crit)'],
    ['skill', 'เสริมสกิล (skill)'],
    ['cdr', 'ลดคูลดาวน์ (cdr)'],
    ['cast', 'ลดร่าย (cast)'],
    ['stat', 'สเตตัส (stat)'],
    ['hpPct', 'HP% (hpPct)'],
    ['spPct', 'SP% (spPct)']
  ];

  // Fallback map if an older catalog is cached; live catalog provides authoritative `jobWeapons` & `jobShields` for all 46 jobs.
  const FALLBACK_JOB_WEAPONS = {
    traveler: ['sword', 'gsword', 'spear', 'axe', 'staff', 'orb', 'bow', 'dagger', 'mace', 'lance'],
    knight: ['sword', 'gsword', 'spear', 'axe'],
    paladin: ['mace', 'sword', 'gsword', 'spear', 'axe'],
    dawnwarden: ['mace', 'sword', 'gsword', 'spear', 'axe'],
    dragonknight: ['lance', 'sword', 'gsword', 'spear', 'axe'],
    dragonbound: ['lance', 'sword', 'gsword', 'spear', 'axe'],
    swordmaster: ['dsword', 'sword', 'gsword', 'spear', 'axe'],
    starblade: ['dsword', 'sword', 'gsword', 'spear', 'axe'],
    berserker: ['gaxe', 'hammer', 'sword', 'gsword', 'spear', 'axe'],
    bloodmoon: ['gaxe', 'hammer', 'sword', 'gsword', 'spear', 'axe'],
    mage: ['staff', 'orb'],
    archmage: ['staff', 'orb'],
    astral: ['staff', 'orb'],
    firemage: ['staff', 'orb'],
    starcore: ['staff', 'orb'],
    icemage: ['staff', 'orb'],
    winterlord: ['staff', 'orb'],
    warlock: ['lantern', 'staff', 'orb'],
    hexlord: ['lantern', 'staff', 'orb'],
    archer: ['bow'],
    ranger: ['xbow', 'bow'],
    moonsniper: ['xbow', 'bow'],
    wolfhunter: ['bow'],
    packalpha: ['bow'],
    bard: ['instrument', 'whip', 'bow'],
    maestro: ['instrument', 'whip', 'bow'],
    gunslinger: ['pistol', 'shotgun', 'bow'],
    outlaw: ['pistol', 'shotgun', 'bow'],
    rogue: ['dagger', 'sword'],
    assassin: ['katar', 'dagger', 'sword'],
    eclipse: ['katar', 'dagger', 'sword'],
    shinobi: ['huuma', 'dagger', 'sword'],
    shadowlord: ['huuma', 'dagger', 'sword'],
    reaper: ['scythe', 'sickle', 'dagger', 'sword'],
    harvester: ['scythe', 'sickle', 'dagger', 'sword'],
    puppeteer: ['puppet', 'wire', 'dagger', 'sword'],
    showmaster: ['puppet', 'wire', 'dagger', 'sword'],
    priest: ['staff', 'mace'],
    bishop: ['book', 'staff', 'mace'],
    starsaint: ['book', 'staff', 'mace'],
    monk: ['knuckle', 'qstaff', 'staff', 'mace'],
    meteorfist: ['knuckle', 'qstaff', 'staff', 'mace'],
    lightkeeper: ['torch', 'staff', 'mace'],
    beacon: ['torch', 'staff', 'mace'],
    wisp: ['bell', 'staff', 'mace'],
    starshepherd: ['bell', 'staff', 'mace']
  };

  const PRESETS = {
    puppeteer_lv40: {
      label: '🎎 นักเชิดหุ่น (Lv.40+ ฟาร์มคุ้ม)',
      startClass: 'puppeteer',
      reserveCoins: 50000,
      steps: [
        { id: 'sg_pp_wpn1', type: 'buy_equip', slot: 'weapon', mode: 'exact', itemId: 'pp_foxtails', itemName: 'ไม้เชิดหุ่นหางจิ้งจอก', minGrade: 1, minRefine: 0, requiredOpt: '', minLevel: 44, minCoins: 0, maxBuyPrice: 2500 },
        { id: 'sg_pp_hat1', type: 'buy_equip', slot: 'hat', mode: 'exact', itemId: 'hat_hc_misc_cat', itemName: 'แมวดำหลับบนหัว', minGrade: 0, minRefine: 0, requiredOpt: '', minLevel: 38, minCoins: 0, maxBuyPrice: 1800 },
        { id: 'sg_pp_top1', type: 'buy_equip', slot: 'top', mode: 'exact', itemId: 'top_of_rg_courier', itemName: 'เสื้อบุรุษไปรษณีย์ป่า', minGrade: 0, minRefine: 0, requiredOpt: '', minLevel: 42, minCoins: 0, maxBuyPrice: 1500 },
        { id: 'sg_pp_pants1', type: 'buy_equip', slot: 'pants', mode: 'exact', itemId: 'pants_of_rg_courier', itemName: 'กางเกงบุรุษไปรษณีย์ป่า', minGrade: 0, minRefine: 0, requiredOpt: '', minLevel: 42, minCoins: 0, maxBuyPrice: 1500 },
        { id: 'sg_pp_rune1', type: 'buy_rune', runeKind: 'execute', tier: 1, skillId: 'pp_dance', skillSlot: 0, minQualityPct: 0, minLevel: 20, minCoins: 0, maxBuyPrice: 8000 },
        { id: 'sg_pp_rune2', type: 'buy_rune', runeKind: 'heavy', tier: 1, skillId: 'pp_dance', skillSlot: 1, minQualityPct: 0, minLevel: 20, minCoins: 0, maxBuyPrice: 9000 },
        { id: 'sg_pp_rune3', type: 'buy_rune', runeKind: 'apierce', tier: 1, skillId: 'pp_theatre', skillSlot: 0, minQualityPct: 0, minLevel: 20, minCoins: 0, maxBuyPrice: 9000 },
        { id: 'sg_pp_card1', type: 'buy_card', monType: 'skeleton', cardName: 'การ์ดโครงกระดูกทหาร', equipMode: 'pas', slotIndex: 0, minLevel: 20, minCoins: 0, maxBuyPrice: 15000 },
        { id: 'sg_pp_card2', type: 'buy_card', monType: 'ghost', cardName: 'การ์ดผีดวงไฟ', equipMode: 'pas', slotIndex: 1, minLevel: 20, minCoins: 0, maxBuyPrice: 15000 },
        { id: 'sg_pp_card3', type: 'buy_card', monType: 'hedgehog', cardName: 'การ์ดเม่นแตกตัว', equipMode: 'act', slotIndex: 0, minLevel: 20, minCoins: 0, maxBuyPrice: 15000 },
        { id: 'sg_pp_wpn2', type: 'buy_equip', slot: 'weapon', mode: 'exact', itemId: 'pp_antqueen', itemName: 'ไม้เชิดหุ่นนางพญามด (Legend)', minGrade: 1, minRefine: 0, requiredOpt: '', minLevel: 46, minCoins: 0, maxBuyPrice: 45000 }
      ]
    },
    archmage_lv40: {
      label: '🔮 อาร์คเมจ (Lv.40+ สายสายฟ้า/สามธาตุ)',
      startClass: 'archmage',
      reserveCoins: 50000,
      steps: [
        { id: 'sg_am_wpn', type: 'buy_equip', slot: 'weapon', mode: 'flex', wtype: 'staff', itemName: 'คทา Lv.40+ (หายากขึ้นไป)', minItemLv: 40, minRarity: 'rare', minGrade: 1, minRefine: 0, minLevel: 40, minCoins: 0, maxBuyPrice: 8000 },
        { id: 'sg_am_top', type: 'buy_equip', slot: 'top', mode: 'flex', itemName: 'เสื้อเกราะ Lv.38+ (หายากขึ้นไป)', minItemLv: 38, minRarity: 'rare', minGrade: 0, minRefine: 0, minLevel: 38, minCoins: 0, maxBuyPrice: 3000 },
        { id: 'sg_am_pants', type: 'buy_equip', slot: 'pants', mode: 'flex', itemName: 'กางเกง Lv.38+ (หายากขึ้นไป)', minItemLv: 38, minRarity: 'rare', minGrade: 0, minRefine: 0, minLevel: 38, minCoins: 0, maxBuyPrice: 3000 },
        { id: 'sg_am_rune1', type: 'buy_rune', runeKind: 'heavy', tier: 1, skillId: 'am_chain', skillSlot: 0, minQualityPct: 0, minLevel: 25, minCoins: 0, maxBuyPrice: 10000 },
        { id: 'sg_am_rune2', type: 'buy_rune', runeKind: 'wpierce', tier: 1, skillId: 'am_chain', skillSlot: 1, minQualityPct: 0, minLevel: 25, minCoins: 0, maxBuyPrice: 12000 }
      ]
    },
    paladin_lv40: {
      label: '🛡️ พาลาดิน (Lv.40+ แทงก์/ดาบโล่)',
      startClass: 'paladin',
      reserveCoins: 50000,
      steps: [
        { id: 'sg_pal_wpn', type: 'buy_equip', slot: 'weapon', mode: 'flex', wtype: 'sword', itemName: 'ดาบมือเดียว Lv.40+ (หายากขึ้นไป)', minItemLv: 40, minRarity: 'rare', minGrade: 1, minRefine: 0, minLevel: 40, minCoins: 0, maxBuyPrice: 8000 },
        { id: 'sg_pal_top', type: 'buy_equip', slot: 'top', mode: 'flex', itemName: 'เสื้อเกราะ Lv.38+ (หายากขึ้นไป)', minItemLv: 38, minRarity: 'rare', minGrade: 0, minRefine: 0, minLevel: 38, minCoins: 0, maxBuyPrice: 3000 },
        { id: 'sg_pal_pants', type: 'buy_equip', slot: 'pants', mode: 'flex', itemName: 'กางเกง Lv.38+ (หายากขึ้นไป)', minItemLv: 38, minRarity: 'rare', minGrade: 0, minRefine: 0, minLevel: 38, minCoins: 0, maxBuyPrice: 3000 }
      ]
    },
    bishop_lv40: {
      label: '✨ บิชอป (Lv.40+ พระซัพพอร์ต)',
      startClass: 'bishop',
      reserveCoins: 50000,
      steps: [
        { id: 'sg_bi_wpn', type: 'buy_equip', slot: 'weapon', mode: 'flex', wtype: 'book', itemName: 'คัมภีร์ Lv.40+ (หายากขึ้นไป)', minItemLv: 40, minRarity: 'rare', minGrade: 0, minRefine: 0, minLevel: 40, minCoins: 0, maxBuyPrice: 6000 },
        { id: 'sg_bi_top', type: 'buy_equip', slot: 'top', mode: 'flex', itemName: 'เสื้อ Lv.38+ (หายากขึ้นไป)', minItemLv: 38, minRarity: 'rare', minGrade: 0, minRefine: 0, minLevel: 38, minCoins: 0, maxBuyPrice: 3000 },
        { id: 'sg_bi_pants', type: 'buy_equip', slot: 'pants', mode: 'flex', itemName: 'กางเกง Lv.38+ (หายากขึ้นไป)', minItemLv: 38, minRarity: 'rare', minGrade: 0, minRefine: 0, minLevel: 38, minCoins: 0, maxBuyPrice: 3000 }
      ]
    },
    bard_lv40: {
      label: '🎵 นักกวี (Lv.40+ บัฟ+ดาเมจ)',
      startClass: 'bard',
      reserveCoins: 50000,
      steps: [
        { id: 'sg_bd_wpn', type: 'buy_equip', slot: 'weapon', mode: 'flex', wtype: 'instrument', itemName: 'เครื่องดนตรี Lv.40+ (หายากขึ้นไป)', minItemLv: 40, minRarity: 'rare', minGrade: 0, minRefine: 0, minLevel: 40, minCoins: 0, maxBuyPrice: 8000 },
        { id: 'sg_bd_top', type: 'buy_equip', slot: 'top', mode: 'flex', itemName: 'เสื้อ Lv.38+ (หายากขึ้นไป)', minItemLv: 38, minRarity: 'rare', minGrade: 0, minRefine: 0, minLevel: 38, minCoins: 0, maxBuyPrice: 3000 },
        { id: 'sg_bd_pants', type: 'buy_equip', slot: 'pants', mode: 'flex', itemName: 'กางเกง Lv.38+ (หายากขึ้นไป)', minItemLv: 38, minRarity: 'rare', minGrade: 0, minRefine: 0, minLevel: 38, minCoins: 0, maxBuyPrice: 3000 }
      ]
    }
  };

  let catalog = null;
  let catalogPromise = null;
  let modal = null;
  let snapshot = null;
  let activePanel = 'weapon'; // slot key | 'basic_runes' | 'runes' | 'cards'
  let equipPickMode = 'exact'; // 'exact' | 'flex'
  let onlyClassFit = true;
  let searchQ = '';
  let basicRuneTargetSlot = 0; // 0 (Lv.40) | 1 (Lv.70)
  let basicRuneTargetTier = 1;
  let runeTargetSkillId = '';
  let runeTargetSlot = 0;
  let runeTargetTier = 1;
  let cardTargetMode = 'pas'; // 'pas' | 'act' | 'learn_only'
  let cardTargetSlot = 0;
  let cardTargetLevel = 1; // 1..10

  const DEFAULT_BASIC_UNIVERSAL_FITS = [
    'arc', 'wildfire', 'frostbite', 'venom', 'shade', 'trap',
    'spmeteor', 'spthunder', 'spfrost', 'spquake', 'spmagnus', 'spwhirl', 'splord', 'spshadow',
    'tempo', 'rend', 'splash', 'charge', 'skillrhythm', 'leech'
  ];
  const DEFAULT_BASIC_GUN_FITS = ['grenade', 'ricochet', 'hollow', 'duel', 'dragon', 'barrel', 'recoil'];
  const DEFAULT_BASIC_FIRE_FITS = ['lavapool', 'flarejump', 'minimeteor', 'firefan'];
  const DEFAULT_GUN_JOBS = ['gunslinger', 'outlaw'];
  const DEFAULT_FIRE_JOBS = ['firemage', 'starcore'];

  function getBasicRuneMeta(cat) {
    const br = (cat && cat.basicRunes) || {};
    const slotLvs = (Array.isArray(br.slotLvs) && br.slotLvs.length >= 2) ? br.slotLvs : [40, 70, 90];
    return {
      id: br.id || 'bl_basic',
      slot0Lv: Number(slotLvs[0]) || 40,
      slot1Lv: Number(slotLvs[1]) || 70,
      slot2Lv: Number(slotLvs[2]) || 90,
      universalSet: new Set(Array.isArray(br.universalFits) && br.universalFits.length ? br.universalFits : DEFAULT_BASIC_UNIVERSAL_FITS),
      gunSet: new Set(Array.isArray(br.gunFits) && br.gunFits.length ? br.gunFits : DEFAULT_BASIC_GUN_FITS),
      fireSet: new Set(Array.isArray(br.fireFits) && br.fireFits.length ? br.fireFits : DEFAULT_BASIC_FIRE_FITS),
      gunJobs: new Set(Array.isArray(br.gunJobs) && br.gunJobs.length ? br.gunJobs : DEFAULT_GUN_JOBS),
      fireJobs: new Set(Array.isArray(br.fireJobs) && br.fireJobs.length ? br.fireJobs : DEFAULT_FIRE_JOBS)
    };
  }

  function clampCardTargetLevel(v) {
    return Math.max(1, Math.min(10, Math.floor(Number(v) || 1)));
  }

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => 'sg_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
  const plan = () => (typeof activeEditingPlan !== 'undefined' ? activeEditingPlan : null);

  function gp() {
    const p = plan();
    if (!p) return null;
    if (!p.gearPlan || typeof p.gearPlan !== 'object') {
      p.gearPlan = { enabled: true, startClass: 'traveler', reserveCoins: 50000, steps: [] };
    }
    if (p.gearPlan.enabled === undefined) p.gearPlan.enabled = true;
    if (p.gearPlan.reserveCoins === undefined) p.gearPlan.reserveCoins = 50000;
    if (!Array.isArray(p.gearPlan.steps)) p.gearPlan.steps = [];
    return p.gearPlan;
  }

  function renderAtlasIcon(ic, size, fallbackHtml) {
    if (!ic || !Array.isArray(ic) || ic.length < 2 || !catalog || !catalog.atlas) {
      return fallbackHtml;
    }
    const kind = ic[0];
    const idx = Number(ic[1]);
    const m = catalog.atlas[kind];
    if (!m || !Number.isFinite(idx) || idx < 0) return fallbackHtml;
    const k = size / m.cell;
    const rows = Math.ceil(m.n / m.cols);
    const v = catalog.atlasV ? `?v=${encodeURIComponent(catalog.atlasV)}` : '';
    const file = `wiki/atlases/wiki_${kind === 'h128' ? 'hats128' : kind}.webp${v}`;
    const bx = -((idx % m.cols) * m.cell * k);
    const by = -(Math.floor(idx / m.cols) * m.cell * k);
    const bw = m.cols * m.cell * k;
    const bh = rows * m.cell * k;
    return `<i style="display:inline-block;width:${size}px;height:${size}px;flex-shrink:0;background:url('${file}') ${bx}px ${by}px/${bw}px ${bh}px no-repeat;image-rendering:auto;"></i>`;
  }

  function getRuneTierIc(r, tier) {
    if (!r || !r.ic) return null;
    if (Array.isArray(r.ic) && Array.isArray(r.ic[0])) {
      const idx = Math.max(0, Math.min(r.ic.length - 1, (Number(tier) || 1) - 1));
      return r.ic[idx] || r.ic[0] || null;
    }
    return Array.isArray(r.ic) ? r.ic : null;
  }

  function getAllowedWeaponTypesForClasses(classIds, cat) {
    const out = new Set();
    const map = (cat && cat.jobWeapons) || FALLBACK_JOB_WEAPONS;
    for (const c of (classIds || [])) {
      const key = String(c || '').toLowerCase();
      const arr = map[key] || FALLBACK_JOB_WEAPONS[key] || [];
      arr.forEach(w => out.add(w));
    }
    return out;
  }

  function getEffectiveFilterClasses() {
    const g = gp();
    const sc = String(g?.startClass || '').toLowerCase();
    const planClasses = getPlanTargetClassIds();
    if (sc && sc !== 'traveler') return [sc];
    return planClasses;
  }

  function canClassesEquipShield(classIds, cat) {
    if (!classIds || !classIds.length) return true;
    const map = (cat && cat.jobShields) || null;
    if (!map) return true;
    // Check highest target class (e.g. class3 -> class2 -> class1)
    const primary = String(classIds[classIds.length - 1] || '').toLowerCase();
    if (primary && Object.prototype.hasOwnProperty.call(map, primary)) {
      return Boolean(map[primary]);
    }
    return classIds.some(c => map[String(c || '').toLowerCase()] !== false);
  }

  async function loadCatalog() {
    if (catalog) return catalog;
    if (!catalogPromise) {
      catalogPromise = fetch('nightcamp_gear_catalog.json?v=nc2.3.38', { cache: 'no-cache' })
        .then(r => r.ok ? r.json() : null)
        .catch(() => null)
        .then(data => {
          catalog = data || { items: [], runes: [], cards: [], wtypes: {}, skills: [] };
          return catalog;
        });
    }
    return catalogPromise;
  }

  function getPlanTargetClassIds() {
    const p = plan() || {};
    const out = [];
    if (p.class1Target) out.push(String(p.class1Target).toLowerCase());
    if (p.class2Target) out.push(String(p.class2Target).toLowerCase());
    if (p.class3Target) out.push(String(p.class3Target).toLowerCase());
    return out;
  }

  function getClassOptions() {
    const p = plan() || {};
    const opts = [{ id: 'traveler', label: '🌱 นักเดินทาง (เริ่มตั้งแต่ต้น)' }];
    if (p.class1Target) opts.push({ id: p.class1Target, label: `⚔️ คลาส 1: ${p.class1Target}` });
    if (p.class2Target) opts.push({ id: p.class2Target, label: `🌟 คลาส 2: ${p.class2Target}` });
    if (p.class3Target) opts.push({ id: p.class3Target, label: `👑 คลาส 3: ${p.class3Target}` });
    return opts;
  }

  function getLatestEquipStepForSlot(slotKey) {
    const g = gp();
    if (!g) return null;
    let found = null;
    for (const s of g.steps) {
      if (s && s.type === 'buy_equip' && s.slot === slotKey) found = s;
    }
    return found;
  }

  function getLatestForgeForSlot(slotKey) {
    const g = gp();
    if (!g) return { grade: 0, refine: 0 };
    let grade = 0;
    let refine = 0;
    for (const s of g.steps) {
      if (!s || s.slot !== slotKey) continue;
      if (s.type === 'buy_equip') {
        grade = Math.max(grade, Number(s.minGrade) || 0);
        refine = Math.max(refine, Number(s.minRefine) || 0);
      } else if (s.type === 'polish') {
        grade = Math.max(grade, Number(s.targetGrade) || 0);
      } else if (s.type === 'refine') {
        refine = Math.max(refine, Number(s.targetRefine) || 0);
      }
    }
    return { grade, refine };
  }

  function buildModal() {
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'gear-builder-modal';
    modal.className = 'gb-backdrop';
    modal.innerHTML = `
      <div class="gb-card nc-gb-card">
        <div class="gb-head">
          <div>
            <h3>🛡️ จัดเซ็ตอุปกรณ์อัตโนมัติ (Nightcamp Set Gear)</h3>
            <small>🔒 ล็อกเฉพาะช่องที่ตั้งค่าไว้ (ช่องอื่นยังใช้ Smart Gear อัตโนมัติ) · 🏦 เบิกเงินจากคลังร่วมให้อัตโนมัติโดยเหลือเงินสำรองไว้เสมอ · 🔍 สแกนตลาดกลางก่อนวาร์ปกลับค่าย ไม่เสียเวลาเดินฟรี</small>
          </div>
          <button type="button" class="gb-x" id="gb-close-x">✕</button>
        </div>

        <div class="gb-start nc-gb-topbar">
          <label class="nc-gb-chk"><input type="checkbox" id="gb-enabled"> เปิดใช้ Set Gear</label>
          <label>เริ่มทำงานเมื่อ:
            <select id="gb-start-class"></select>
          </label>
          <label>🏦 กันเงินสำรอง (ตัว+คลัง):
            <input type="number" id="gb-reserve-coins" min="0" step="5000" value="50000" class="nc-gb-num"> g
          </label>
          <div class="nc-gb-presets">
            <select id="gb-preset-select">
              <option value="">✨ โหลดพรีเซ็ตแนะนำตามอาชีพ...</option>
              ${Object.entries(PRESETS).map(([k, v]) => `<option value="${esc(k)}">${esc(v.label)}</option>`).join('')}
            </select>
            <button type="button" class="btn btn-secondary btn-sm" id="gb-apply-preset">โหลด</button>
            <button type="button" class="btn btn-secondary btn-sm" id="gb-clear-all" style="color:#fca5a5;">ล้างคิว</button>
          </div>
        </div>

        <div class="gb-main">
          <div class="nc-gb-board-wrap">
            <div class="gb-board nc-gb-board" id="gb-board"></div>
            <div class="nc-gb-special-row" id="gb-special-row"></div>
          </div>
          <div class="gb-picker" id="gb-picker"></div>
        </div>

        <div class="gb-steps-head">
          <b>📋 ลำดับการทำงาน Set Gear (<span id="gb-step-count">0</span> ขั้นตอน)</b>
          <small>บอทเช็คของในกระเป๋า/คลังก่อน (ใส่ฟรีทันที) ➔ ถ้ายังไม่มีจะสแกนตลาดกลางตามงบสูงสุด ➔ ถอนคลังร่วมมาซื้อและสวมใส่ + ล็อกช่องให้อัตโนมัติ</small>
        </div>
        <div class="gb-steps" id="gb-steps"></div>

        <div class="gb-foot">
          <button type="button" class="btn btn-secondary" id="gb-cancel">ยกเลิก</button>
          <button type="button" class="btn btn-success" id="gb-save">💾 บันทึก Set Gear</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener('click', e => {
      if (e.target === modal) close(false);
    });
    modal.querySelector('#gb-close-x').onclick = () => close(false);
    modal.querySelector('#gb-cancel').onclick = () => close(false);
    modal.querySelector('#gb-save').onclick = () => close(true);

    modal.querySelector('#gb-enabled').onchange = e => {
      const g = gp();
      if (g) g.enabled = Boolean(e.target.checked);
    };
    modal.querySelector('#gb-start-class').onchange = e => {
      const g = gp();
      if (g) {
        g.startClass = e.target.value;
        renderBoard();
        renderPicker();
      }
    };
    modal.querySelector('#gb-reserve-coins').onchange = e => {
      const g = gp();
      if (g) g.reserveCoins = Math.max(0, Math.floor(Number(e.target.value) || 0));
    };
    modal.querySelector('#gb-apply-preset').onclick = () => {
      const key = modal.querySelector('#gb-preset-select').value;
      const preset = PRESETS[key];
      if (!preset) return;
      const g = gp();
      if (!g) return;
      if (g.steps.length > 0 && !confirm(`แทนที่คิว Set Gear เดิมด้วยพรีเซ็ต "${preset.label}" ใช่ไหม?`)) return;
      g.enabled = true;
      g.startClass = preset.startClass;
      g.reserveCoins = preset.reserveCoins;
      g.steps = JSON.parse(JSON.stringify(preset.steps));
      renderAll();
    };
    modal.querySelector('#gb-clear-all').onclick = () => {
      const g = gp();
      if (!g || g.steps.length === 0) return;
      if (!confirm('ล้างรายการ Set Gear ทั้งหมดในแผนนี้ใช่ไหม?')) return;
      g.steps = [];
      renderAll();
    };

    return modal;
  }

  function renderBoard() {
    const g = gp();
    const board = modal.querySelector('#gb-board');
    const special = modal.querySelector('#gb-special-row');
    if (!g || !board) return;

    const slotCardHtml = (s) => {
      const step = getLatestEquipStepForSlot(s.key);
      const forge = getLatestForgeForSlot(s.key);
      const activeCls = activePanel === s.key ? 'active' : '';
      const filledCls = step ? 'filled' : '';
      let title = 'ยังไม่ได้ตั้ง (Smart Gear)';
      let subBadge = '';
      let iconHtml = `<span style="font-size:18px;">${s.icon}</span>`;
      if (step) {
        title = step.itemName || step.itemId || (step.mode === 'flex' ? `${step.wtype || s.label} Lv.${step.minItemLv || 1}+` : s.label);
        const parts = [];
        if (forge.grade > 0) parts.push(`G${forge.grade}`);
        if (forge.refine > 0) parts.push(`+${forge.refine}`);
        if (step.maxBuyPrice > 0) parts.push(`≤${Number(step.maxBuyPrice).toLocaleString()}g`);
        subBadge = parts.join(' · ');
        if (step.itemId && catalog && Array.isArray(catalog.items)) {
          const itemMeta = catalog.items.find(x => x.id === step.itemId);
          if (itemMeta && itemMeta.ic) {
            iconHtml = renderAtlasIcon(itemMeta.ic, 28, iconHtml);
          }
        }
      }
      return `
        <div class="gb-slot ${filledCls} ${activeCls}" data-panel="${esc(s.key)}">
          <div class="gb-slot-icon">${iconHtml}</div>
          <div class="gb-slot-text">
            <small>${esc(s.label)} ${step ? '<span style="color:#4ade80;">🔒</span>' : ''}</small>
            <b style="${step ? 'color:#f8fafc;' : ''}">${esc(title)}</b>
            ${subBadge ? `<small style="color:#fbbf24;">${esc(subBadge)}</small>` : ''}
          </div>
        </div>
      `;
    };

    const effClasses = getEffectiveFilterClasses();
    const targetClasses = getPlanTargetClassIds();
    const classTitle = effClasses[effClasses.length - 1] || targetClasses[targetClasses.length - 1] || 'traveler';
    const classThName = (catalog && catalog.jobs && catalog.jobs[classTitle]?.name) || '';
    board.innerHTML = `
      <div class="gb-col">${LEFT_SLOTS.map(slotCardHtml).join('')}</div>
      <div class="gb-figure nc-gb-center">
        <div class="nc-gb-avatar-badge">🛡️</div>
        <div class="nc-gb-class-name">${esc(classThName || classTitle.toUpperCase())}</div>
        ${classThName ? `<div style="font-size:10px;color:#94a3b8;margin-top:-2px;">${esc(classTitle.toUpperCase())}</div>` : ''}
        <div class="nc-gb-lock-note">คลิกช่องเพื่อเลือกของ<br>ช่องที่ตั้งไว้จะ <b>🔒 ล็อก</b><br>ไม่ให้ Smart Gear ทับ</div>
      </div>
      <div class="gb-col">${RIGHT_SLOTS.map(slotCardHtml).join('')}</div>
    `;

    const basicRuneCount = g.steps.filter(s => s && s.type === 'buy_rune' && s.skillId === 'bl_basic').length;
    const runeCount = g.steps.filter(s => s && s.type === 'buy_rune' && s.skillId !== 'bl_basic').length;
    const cardCount = g.steps.filter(s => s && s.type === 'buy_card').length;
    special.innerHTML = `
      <div class="gb-slot ${basicRuneCount > 0 ? 'filled' : ''} ${activePanel === 'basic_runes' ? 'active' : ''}" data-panel="basic_runes">
        <div class="gb-slot-icon"><span style="font-size:18px;">⚔️</span></div>
        <div class="gb-slot-text">
          <small>รูนตีปกติ (Basic Attack)</small>
          <b style="${basicRuneCount > 0 ? 'color:#7dd3fc;' : ''}">${basicRuneCount > 0 ? `ตั้งไว้ ${basicRuneCount}/2 รูน` : 'คลิกเพื่อเพิ่มรูนตีปกติ'}</b>
        </div>
      </div>
      <div class="gb-slot ${runeCount > 0 ? 'filled' : ''} ${activePanel === 'runes' ? 'active' : ''}" data-panel="runes">
        <div class="gb-slot-icon"><span style="font-size:18px;">🔮</span></div>
        <div class="gb-slot-text">
          <small>รูนสกิล (Rune Socket)</small>
          <b style="${runeCount > 0 ? 'color:#e9d5ff;' : ''}">${runeCount > 0 ? `ตั้งไว้ ${runeCount} รูน` : 'คลิกเพื่อเพิ่มรูนสกิล'}</b>
        </div>
      </div>
      <div class="gb-slot ${cardCount > 0 ? 'filled' : ''} ${activePanel === 'cards' ? 'active' : ''}" data-panel="cards">
        <div class="gb-slot-icon"><span style="font-size:18px;">🃏</span></div>
        <div class="gb-slot-text">
          <small>การ์ดวิชามอน (Lv.1–10)</small>
          <b style="${cardCount > 0 ? 'color:#fde68a;' : ''}">${cardCount > 0 ? `ตั้งไว้ ${cardCount} การ์ด` : 'คลิกเพื่อเพิ่มการ์ดพาสซีฟ/วิชามอน'}</b>
        </div>
      </div>
    `;

    board.querySelectorAll('[data-panel]').forEach(el => {
      el.onclick = () => {
        activePanel = el.dataset.panel;
        searchQ = '';
        renderBoard();
        renderPicker();
      };
    });
    special.querySelectorAll('[data-panel]').forEach(el => {
      el.onclick = () => {
        activePanel = el.dataset.panel;
        searchQ = '';
        renderBoard();
        renderPicker();
      };
    });
  }

  function renderPicker() {
    const box = modal.querySelector('#gb-picker');
    if (!box) return;
    const cat = catalog || { items: [], runes: [], cards: [], wtypes: {}, skills: [] };
    const planClasses = getPlanTargetClassIds();
    const effClasses = getEffectiveFilterClasses();

    if (activePanel === 'basic_runes') {
      const bm = getBasicRuneMeta(cat);
      const planObj = plan() || {};
      const hasPlanClasses = planClasses.length > 0;
      const hasC2OrC3 = Boolean(planObj.class2Target || planObj.class3Target);
      const showGun = !hasPlanClasses || planClasses.some(c => bm.gunJobs.has(c)) || (!hasC2OrC3 && planClasses.includes('archer'));
      const showFire = !hasPlanClasses || planClasses.some(c => bm.fireJobs.has(c)) || (!hasC2OrC3 && planClasses.includes('mage'));

      const badgeForBasicRune = (r) => {
        if (bm.gunSet.has(r.k)) {
          const wHint = r.gun === 'pistol' ? ' · ปืนพก' : (r.gun === 'shotgun' ? ' · ลูกซอง' : '');
          return `<span style="font-size:10px;color:#fbbf24;background:rgba(245,158,11,0.16);border:1px solid rgba(245,158,11,0.35);border-radius:4px;padding:0 5px;margin-left:4px;">เฉพาะสายปืน${wHint}</span>`;
        }
        if (bm.fireSet.has(r.k)) {
          const wHint = r.wield === 'staff' ? ' · คทา' : (r.wield === 'orb' ? ' · ออร์บ' : '');
          return `<span style="font-size:10px;color:#fb923c;background:rgba(249,115,22,0.16);border:1px solid rgba(249,115,22,0.35);border-radius:4px;padding:0 5px;margin-left:4px;">เฉพาะจอมเวทไฟ${wHint}</span>`;
        }
        return `<span style="font-size:10px;color:#7dd3fc;background:rgba(14,165,233,0.14);border:1px solid rgba(56,189,248,0.3);border-radius:4px;padding:0 5px;margin-left:4px;">ทุกอาชีพ</span>`;
      };

      box.innerHTML = `
        <div class="gb-picker-title"><b>⚔️ เพิ่มรูนตีปกติ (ซื้อตลาดกลาง + ฝังลงช่องตีปกติอัตโนมัติ)</b></div>
        <div style="font-size:11px;color:#94a3b8;margin-bottom:6px;line-height:1.4;">
          คัดกรองเฉพาะรูนที่ใส่ใน <b style="color:#7dd3fc;">รูนตีปกติ</b> ได้จริงเท่านั้น (ช่อง 1 ปลดที่ตัวละคร Lv.${bm.slot0Lv} · ช่อง 2 ปลดที่ Lv.${bm.slot1Lv} · ช่อง 3 ปลดที่ Lv.${bm.slot2Lv})
        </div>
        <div class="nc-gb-mini-grid">
          <label>ช่องรูนตีปกติ:
            <select id="gb-basic-rune-slot" class="gb-search">
              <option value="0" ${basicRuneTargetSlot === 0 ? 'selected' : ''}>ช่อง 1 (ปลด Lv.${bm.slot0Lv})</option>
              <option value="1" ${basicRuneTargetSlot === 1 ? 'selected' : ''}>ช่อง 2 (ปลด Lv.${bm.slot1Lv})</option>
              <option value="2" ${basicRuneTargetSlot === 2 ? 'selected' : ''}>ช่อง 3 (ปลด Lv.${bm.slot2Lv})</option>
            </select>
          </label>
          <label>ขั้นรูน:
            <select id="gb-basic-rune-tier" class="gb-search">
              <option value="1" ${basicRuneTargetTier === 1 ? 'selected' : ''}>ขั้น I+</option>
              <option value="2" ${basicRuneTargetTier === 2 ? 'selected' : ''}>ขั้น II+</option>
              <option value="3" ${basicRuneTargetTier === 3 ? 'selected' : ''}>ขั้น III</option>
            </select>
          </label>
        </div>
        <input type="text" id="gb-search-input" class="gb-search" placeholder="ค้นหารูนตีปกติ เช่น รูนสายฟ้าแตก, รูนไฟลาม, รูนเงาตีซ้ำ, รูนดาบพายุหมุน..." value="${esc(searchQ)}">
        <div class="gb-list" id="gb-picker-list"></div>
      `;

      const updateBasicRuneList = () => {
        const listEl = box.querySelector('#gb-picker-list');
        if (!listEl) return;
        const qLow = searchQ.trim().toLowerCase();
        const basicRunesList = (cat.runes || []).filter(r => {
          if (!r || !r.k) return false;
          const isUniv = bm.universalSet.has(r.k);
          const isGun = bm.gunSet.has(r.k);
          const isFire = bm.fireSet.has(r.k);
          if (!isUniv && !(showGun && isGun) && !(showFire && isFire)) return false;
          if (qLow && !(`${r.name} ${r.k} ${(r.t || []).join(' ')}`).toLowerCase().includes(qLow)) return false;
          return true;
        });
        listEl.innerHTML = basicRunesList.length === 0
          ? '<div class="gb-empty">ไม่พบรูนตีปกติที่ตรงกับคำค้นหา</div>'
          : basicRunesList.map(r => `
            <div class="gb-item">
              <div class="gb-item-icon">${renderAtlasIcon(getRuneTierIc(r, basicRuneTargetTier), 28, '⚔️')}</div>
              <div class="gb-item-body">
                <b style="color:#bae6fd;">${esc(r.name)} <small style="color:#94a3b8;">(${esc(r.k)})</small>${badgeForBasicRune(r)}</b>
                <small>${esc((r.t && r.t[Math.max(0, basicRuneTargetTier - 1)]) || '')}</small>
              </div>
              <button type="button" class="gb-pick" data-add-basic-rune="${esc(r.k)}">+ เพิ่ม</button>
            </div>
          `).join('');
        listEl.querySelectorAll('[data-add-basic-rune]').forEach(btn => {
          btn.onclick = () => {
            const g = gp();
            if (!g) return;
            const rk = btn.dataset.addBasicRune;
            const isAllowed = bm.universalSet.has(rk) || (showGun && bm.gunSet.has(rk)) || (showFire && bm.fireSet.has(rk));
            if (!isAllowed) return;
            const rMeta = (cat.runes || []).find(x => x.k === rk);
            const unlockLv = basicRuneTargetSlot === 0 ? bm.slot0Lv : bm.slot1Lv;
            g.steps.push({
              id: uid(),
              type: 'buy_rune',
              runeKind: rk,
              itemName: `${rMeta ? rMeta.name : rk} (ขั้น ${'I'.repeat(basicRuneTargetTier)})`,
              tier: basicRuneTargetTier,
              skillId: bm.id,
              skillSlot: basicRuneTargetSlot,
              minQualityPct: 0,
              minLevel: unlockLv,
              minCoins: 0,
              maxBuyPrice: 12000
            });
            renderBoard();
            renderSteps();
          };
        });
      };

      box.querySelector('#gb-basic-rune-slot').onchange = e => { basicRuneTargetSlot = Math.max(0, Math.min(1, Number(e.target.value) || 0)); };
      box.querySelector('#gb-basic-rune-tier').onchange = e => { basicRuneTargetTier = Math.max(1, Math.min(3, Number(e.target.value) || 1)); updateBasicRuneList(); };
      box.querySelector('#gb-search-input').oninput = e => { searchQ = e.target.value; updateBasicRuneList(); };
      updateBasicRuneList();
      return;
    }

    if (activePanel === 'runes') {
      const classSkills = (cat.skills || []).filter(s => s && s.id !== 'bl_basic' && !s.isBasic && (!planClasses.length || planClasses.includes(String(s.job || '').toLowerCase()) || !s.job));
      const activeSkills = classSkills.filter(s => s.fits && s.fits.length > 0);
      if (!runeTargetSkillId || !activeSkills.some(s => s.id === runeTargetSkillId)) {
        const pref = activeSkills.find(s => s.kind === 'active' && planClasses.includes(String(s.job || '').toLowerCase())) || activeSkills[0];
        runeTargetSkillId = pref ? pref.id : '';
      }
      const selSk = activeSkills.find(s => s.id === runeTargetSkillId) || null;
      const fitSet = new Set(selSk ? selSk.fits : []);

      box.innerHTML = `
        <div class="gb-picker-title"><b>🔮 เพิ่มรูนสกิล (ซื้อตลาดกลาง + ฝังลงสกิลอัตโนมัติ)</b></div>
        <div class="nc-gb-mini-grid">
          <label>สกิลเป้าหมาย:
            <select id="gb-rune-skill" class="gb-search">
              ${activeSkills.map(s => `<option value="${esc(s.id)}" ${s.id === runeTargetSkillId ? 'selected' : ''}>${esc(s.name)} (${esc(s.job || 'ทั่วไป')})</option>`).join('')}
            </select>
          </label>
          <label>ช่องรูน:
            <select id="gb-rune-slot" class="gb-search">
              <option value="0" ${runeTargetSlot === 0 ? 'selected' : ''}>ช่อง 1 (ปลด Lv.${selSk ? selSk.slot0Lv : 5})</option>
              <option value="1" ${runeTargetSlot === 1 ? 'selected' : ''}>ช่อง 2 (ปลด Lv.${selSk ? selSk.slot1Lv : 10})</option>
            </select>
          </label>
          <label>ขั้นรูน:
            <select id="gb-rune-tier" class="gb-search">
              <option value="1" ${runeTargetTier === 1 ? 'selected' : ''}>ขั้น I+</option>
              <option value="2" ${runeTargetTier === 2 ? 'selected' : ''}>ขั้น II+</option>
              <option value="3" ${runeTargetTier === 3 ? 'selected' : ''}>ขั้น III</option>
            </select>
          </label>
        </div>
        <input type="text" id="gb-search-input" class="gb-search" placeholder="ค้นหารูน เช่น รูนหนัก, รูนประหาร, รูนก้อง, รูนเจาะเกราะ..." value="${esc(searchQ)}">
        <div class="gb-list" id="gb-picker-list"></div>
      `;

      const updateSkillRuneList = () => {
        const listEl = box.querySelector('#gb-picker-list');
        if (!listEl) return;
        const qLow = searchQ.trim().toLowerCase();
        const runesList = (cat.runes || []).filter(r => {
          if (selSk && !fitSet.has(r.k)) return false;
          if (qLow && !(`${r.name} ${r.k} ${(r.t || []).join(' ')}`).toLowerCase().includes(qLow)) return false;
          return true;
        });
        listEl.innerHTML = runesList.length === 0
          ? '<div class="gb-empty">ไม่พบรูนที่เข้ากับสกิลนี้</div>'
          : runesList.map(r => `
            <div class="gb-item">
              <div class="gb-item-icon">${renderAtlasIcon(getRuneTierIc(r, runeTargetTier), 28, '🔮')}</div>
              <div class="gb-item-body">
                <b style="color:#e9d5ff;">${esc(r.name)} <small style="color:#94a3b8;">(${esc(r.k)})</small></b>
                <small>${esc((r.t && r.t[Math.max(0, runeTargetTier - 1)]) || '')}</small>
              </div>
              <button type="button" class="gb-pick" data-add-rune="${esc(r.k)}">+ เพิ่ม</button>
            </div>
          `).join('');
        listEl.querySelectorAll('[data-add-rune]').forEach(btn => {
          btn.onclick = () => {
            const g = gp();
            if (!g || !runeTargetSkillId) return;
            const rk = btn.dataset.addRune;
            const rMeta = (cat.runes || []).find(x => x.k === rk);
            g.steps.push({
              id: uid(),
              type: 'buy_rune',
              runeKind: rk,
              itemName: `${rMeta ? rMeta.name : rk} (ขั้น ${'I'.repeat(runeTargetTier)})`,
              tier: runeTargetTier,
              skillId: runeTargetSkillId,
              skillSlot: runeTargetSlot,
              minQualityPct: 0,
              minLevel: 20,
              minCoins: 0,
              maxBuyPrice: 12000
            });
            renderBoard();
            renderSteps();
          };
        });
      };

      box.querySelector('#gb-rune-skill').onchange = e => { runeTargetSkillId = e.target.value; renderPicker(); };
      box.querySelector('#gb-rune-slot').onchange = e => { runeTargetSlot = Number(e.target.value) || 0; };
      box.querySelector('#gb-rune-tier').onchange = e => { runeTargetTier = Number(e.target.value) || 1; updateSkillRuneList(); };
      box.querySelector('#gb-search-input').oninput = e => { searchQ = e.target.value; updateSkillRuneList(); };
      updateSkillRuneList();
      return;
    }

    if (activePanel === 'cards') {
      box.innerHTML = `
        <div class="gb-picker-title"><b>🃏 เพิ่มการ์ดวิชามอน (ซื้อตลาดกลาง + เรียน/อัปเลเวล 1–10 + ติดตั้งช่องอัตโนมัติ)</b></div>
        <div class="nc-gb-mini-grid">
          <label>วิธีติดตั้ง:
            <select id="gb-card-mode" class="gb-search">
              <option value="pas" ${cardTargetMode === 'pas' ? 'selected' : ''}>✨ ใส่ช่องพาสซีฟ (ได้โบนัสถาวร)</option>
              <option value="act" ${cardTargetMode === 'act' ? 'selected' : ''}>⚡ ใส่ช่องวิชามอนกดใช้ (7/8)</option>
              <option value="learn_only" ${cardTargetMode === 'learn_only' ? 'selected' : ''}>📖 เรียนเก็บลงสมุดอย่างเดียว</option>
            </select>
          </label>
          <label>ช่องที่ใส่:
            <select id="gb-card-slot" class="gb-search" ${cardTargetMode === 'learn_only' ? 'disabled' : ''}>
              <option value="0" ${cardTargetSlot === 0 ? 'selected' : ''}>ช่อง #1</option>
              <option value="1" ${cardTargetSlot === 1 ? 'selected' : ''}>ช่อง #2</option>
              ${cardTargetMode === 'pas' ? `<option value="2" ${cardTargetSlot === 2 ? 'selected' : ''}>ช่อง #3</option>` : ''}
            </select>
          </label>
          <label>จำกัดระดับ (Lv.1–10):
            <select id="gb-card-target-lv" class="gb-search">
              ${[1,2,3,4,5,6,7,8,9,10].map(lv => `<option value="${lv}" ${cardTargetLevel === lv ? 'selected' : ''}>Lv.${lv}${lv === 1 ? ' (1 ใบ)' : lv === 10 ? ' (ตัน)' : ''}</option>`).join('')}
            </select>
          </label>
        </div>
        <div style="font-size:10.5px;color:#94a3b8;margin-bottom:5px;">
          💡 การ์ดใช้ซ้ำเพื่ออัปเลเวลได้สูงสุด <b style="color:#fde68a;">Lv.10 (ตัน)</b> · บอทจะซื้อและกดใช้ให้ครบตามเลเวลเป้าหมายแล้วหยุดซื้อให้อัตโนมัติ
        </div>
        <input type="text" id="gb-search-input" class="gb-search" placeholder="ค้นหาการ์ด หรือเอฟเฟกต์ เช่น ตีเบิ้ล, ดูดเลือด, คูลดาวน์, คริ, หุ่นร้อยเชือก..." value="${esc(searchQ)}">
        <div class="gb-list" id="gb-picker-list"></div>
      `;

      const updateCardList = () => {
        const listEl = box.querySelector('#gb-picker-list');
        if (!listEl) return;
        const qLow = searchQ.trim().toLowerCase();
        const cardsList = (cat.cards || []).filter(c => {
          if (!qLow) return true;
          return (`${c.name} ${c.mon} ${(c.pas || []).join(' ')} ${c.act || ''}`).toLowerCase().includes(qLow);
        }).slice(0, 80);
        listEl.innerHTML = cardsList.length === 0
          ? '<div class="gb-empty">ไม่พบการ์ดที่ค้นหา</div>'
          : cardsList.map(c => `
            <div class="gb-item">
              <div class="gb-item-icon">${renderAtlasIcon(c.ic || c.cardIc, 28, c.boss ? '👑' : '🃏')}</div>
              <div class="gb-item-body">
                <b style="color:${c.boss ? '#fbbf24' : '#e2e8f0'};">${esc(c.name)} ${c.boss ? '<span style="font-size:10px;color:#f59e0b;">[BOSS]</span>' : ''}</b>
                <small style="color:#86efac;">${esc((c.pas || []).join(' · '))}</small>
                ${c.act ? `<small style="display:block;color:#93c5fd;">วิชา: ${esc(c.act)}</small>` : ''}
              </div>
              <button type="button" class="gb-pick" data-add-card="${esc(c.mon)}">+ เพิ่ม</button>
            </div>
          `).join('');
        listEl.querySelectorAll('[data-add-card]').forEach(btn => {
          btn.onclick = () => {
            const g = gp();
            if (!g) return;
            const mon = btn.dataset.addCard;
            const cMeta = (cat.cards || []).find(x => x.mon === mon);
            g.steps.push({
              id: uid(),
              type: 'buy_card',
              monType: mon,
              cardName: cMeta ? cMeta.name : `bl_card_${mon}`,
              equipMode: cardTargetMode,
              slotIndex: cardTargetSlot,
              targetLevel: clampCardTargetLevel(cardTargetLevel),
              minLevel: 20,
              minCoins: 0,
              maxBuyPrice: 25000
            });
            renderBoard();
            renderSteps();
          };
        });
      };

      box.querySelector('#gb-card-mode').onchange = e => { cardTargetMode = e.target.value; renderPicker(); };
      box.querySelector('#gb-card-slot').onchange = e => { cardTargetSlot = Number(e.target.value) || 0; };
      box.querySelector('#gb-card-target-lv').onchange = e => { cardTargetLevel = clampCardTargetLevel(e.target.value); };
      box.querySelector('#gb-search-input').oninput = e => { searchQ = e.target.value; updateCardList(); };
      updateCardList();
      return;
    }

    // Equipment slot picker (Exact OR Flex mode)
    const rawSlot = (activePanel === 'acc1' || activePanel === 'acc2') ? 'acc' : activePanel;
    const allowedWtSet = getAllowedWeaponTypesForClasses(effClasses.length ? effClasses : planClasses, cat);
    const allowedWtLabels = Array.from(allowedWtSet).map(w => cat.wtypes?.[w]?.name || w);
    const shieldAllowed = rawSlot !== 'shield' || canClassesEquipShield(effClasses.length ? effClasses : planClasses, cat);

    if (equipPickMode === 'flex') {
      const wtEntries = Object.entries(cat.wtypes || {});
      const orderedWtEntries = allowedWtSet.size > 0
        ? [
            ...wtEntries.filter(([k]) => allowedWtSet.has(k)),
            ...wtEntries.filter(([k]) => !allowedWtSet.has(k))
          ]
        : wtEntries;
      const wtOpts = orderedWtEntries.map(([k, v]) => {
        const mark = allowedWtSet.has(k) ? '✅ ' : '';
        return `<option value="${esc(k)}">${mark}${esc(v.name || k)} (${esc(k)})</option>`;
      }).join('');
      const defaultWt = Array.from(allowedWtSet)[0] || '';
      box.innerHTML = `
        <div class="gb-picker-title" style="display:flex;justify-content:space-between;align-items:center;">
          <b>🎲 โหมดยืดหยุ่น (Flex): ${esc(SLOT_LABEL[activePanel] || activePanel)}</b>
          <button type="button" class="btn btn-secondary btn-sm" id="gb-mode-exact">🎯 สลับไประบุชื่อไอเทม</button>
        </div>
        ${!shieldAllowed ? '<div style="font-size:11px;color:#fbbf24;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.35);border-radius:8px;padding:6px 8px;">⚠️ อาชีพเป้าหมายในแผนนี้ถือโล่ไม่ได้ในเกม (เฉพาะอาชีพที่ถือโล่ได้และใช้อาวุธมือเดียว)</div>' : ''}
        <div class="nc-gb-flex-form">
          ${rawSlot === 'weapon' ? `<label>ชนิดอาวุธ: <select id="gb-flex-wt" class="gb-search"><option value="">ทุกชนิดที่อาชีพใส่ได้</option>${wtOpts}</select></label>` : ''}
          <label>Lv. ไอเทมขั้นต่ำ: <input type="number" id="gb-flex-lv" class="gb-search" min="0" max="99" value="40"></label>
          <label>ระดับความหายากขั้นต่ำ:
            <select id="gb-flex-rar" class="gb-search">
              <option value="common">⚪ ทั่วไป (Common)+</option>
              <option value="rare" selected>🔵 หายาก (Rare)+</option>
              <option value="epic">🟣 มหากาพย์ (Epic)+</option>
              <option value="legend">🟡 ตำนาน (Legend)</option>
            </select>
          </label>
          <label>เกรดขัดขั้นต่ำ:
            <select id="gb-flex-grade" class="gb-search">
              ${GRADE_OPTIONS.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join('')}
            </select>
          </label>
          <label>งบสูงสุด (g): <input type="number" id="gb-flex-price" class="gb-search" min="100" step="500" value="5000"></label>
          <button type="button" class="btn btn-success" id="gb-flex-add">+ เพิ่มขั้นตอน Flex ลงคิว</button>
        </div>
      `;
      if (rawSlot === 'weapon' && defaultWt) {
        const sel = box.querySelector('#gb-flex-wt');
        if (sel) sel.value = defaultWt;
      }
      box.querySelector('#gb-mode-exact').onclick = () => { equipPickMode = 'exact'; renderPicker(); };
      box.querySelector('#gb-flex-add').onclick = () => {
        const g = gp();
        if (!g) return;
        const wt = rawSlot === 'weapon' ? (box.querySelector('#gb-flex-wt')?.value || '') : '';
        const minItemLv = Math.max(0, Number(box.querySelector('#gb-flex-lv')?.value) || 0);
        const minRarity = box.querySelector('#gb-flex-rar')?.value || 'rare';
        const minGrade = Number(box.querySelector('#gb-flex-grade')?.value) || 0;
        const maxBuyPrice = Math.max(100, Number(box.querySelector('#gb-flex-price')?.value) || 5000);
        const wtLabel = wt && cat.wtypes?.[wt]?.name ? cat.wtypes[wt].name : (SLOT_LABEL[activePanel] || activePanel);
        g.steps.push({
          id: uid(),
          type: 'buy_equip',
          slot: activePanel,
          mode: 'flex',
          wtype: wt,
          minItemLv,
          minRarity,
          minGrade,
          minRefine: 0,
          requiredOpt: '',
          itemName: `${wtLabel} Lv.${minItemLv}+ (${RARITY_META[minRarity]?.label || minRarity}+)`,
          minLevel: Math.max(1, minItemLv),
          minCoins: 0,
          maxBuyPrice
        });
        renderBoard();
        renderSteps();
      };
      return;
    }

    box.innerHTML = `
      <div class="gb-picker-title" style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
        <b>🎯 เลือกไอเทม: ${esc(SLOT_LABEL[activePanel] || activePanel)}</b>
        <button type="button" class="btn btn-secondary btn-sm" id="gb-mode-flex">🎲 โหมดยืดหยุ่น (Flex)</button>
      </div>
      ${!shieldAllowed ? '<div style="font-size:11px;color:#fbbf24;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.35);border-radius:8px;padding:6px 8px;">⚠️ อาชีพเป้าหมายในแผนนี้ถือโล่ไม่ได้ในเกม (เฉพาะอาชีพที่ถือโล่ได้และใช้อาวุธมือเดียว)</div>' : ''}
      <input type="text" id="gb-search-input" class="gb-search" placeholder="ค้นหาชื่อไอเทม, ชนิดอาวุธ, รหัส, หรือสกิลที่เสริม..." value="${esc(searchQ)}">
      ${rawSlot === 'weapon' && allowedWtSet.size > 0 ? `<label class="gb-only"><input type="checkbox" id="gb-only-fit" ${onlyClassFit ? 'checked' : ''}> แสดงเฉพาะอาวุธที่อาชีพในแผนใช้ได้ (${esc(allowedWtLabels.join(', '))})</label>` : ''}
      <div class="gb-list" id="gb-picker-list"></div>
    `;

    const matchesItemQuery = (it, qLow) => {
      if (!qLow) return true;
      const wtName = (it.wt && cat.wtypes?.[it.wt]?.name) || '';
      return (`${it.name} ${it.id} ${wtName} ${it.wt || ''} ${it.wsk || ''} ${it.abil || ''}`).toLowerCase().includes(qLow);
    };

    const updateEquipList = () => {
      const listEl = box.querySelector('#gb-picker-list');
      if (!listEl) return;
      const qLow = searchQ.trim().toLowerCase();
      const list = (cat.items || []).filter(it => {
        if (it.slot !== rawSlot) return false;
        if (onlyClassFit && rawSlot === 'weapon' && allowedWtSet.size > 0 && it.wt && !allowedWtSet.has(it.wt)) return false;
        return matchesItemQuery(it, qLow);
      }).slice(0, 80);

      if (list.length === 0) {
        let emptyHtml = '<div class="gb-empty">ไม่พบไอเทมในหมวดนี้';
        if (qLow) {
          if (onlyClassFit && rawSlot === 'weapon' && allowedWtSet.size > 0) {
            const otherWpnCount = (cat.items || []).filter(it => it.slot === 'weapon' && matchesItemQuery(it, qLow)).length;
            if (otherWpnCount > 0) {
              emptyHtml += `<div style="margin-top:8px;color:#fbbf24;">พบ <b>${otherWpnCount}</b> รายการในอาวุธอาชีพอื่น</div><button type="button" class="btn btn-secondary btn-sm" id="gb-show-all-wpn" style="margin-top:6px;">🔓 แสดงอาวุธทุกชนิด</button>`;
            }
          }
          // Check if item exists in another equipment slot
          const otherSlots = new Map();
          for (const it of (cat.items || [])) {
            if (it.slot === rawSlot) continue;
            if (matchesItemQuery(it, qLow)) {
              const targetPanel = it.slot === 'acc' ? 'acc1' : it.slot;
              otherSlots.set(targetPanel, (otherSlots.get(targetPanel) || 0) + 1);
            }
          }
          if (otherSlots.size > 0) {
            const btns = Array.from(otherSlots.entries()).map(([sp, cnt]) =>
              `<button type="button" class="btn btn-secondary btn-sm" data-jump-slot="${esc(sp)}" style="margin:3px;">${esc(SLOT_LABEL[sp] || sp)} (${cnt})</button>`
            ).join('');
            emptyHtml += `<div style="margin-top:8px;color:#7dd3fc;">พบในช่องอื่น:</div><div style="margin-top:4px;display:flex;flex-wrap:wrap;justify-content:center;gap:4px;">${btns}</div>`;
          }
        }
        emptyHtml += '</div>';
        listEl.innerHTML = emptyHtml;
        const showAllBtn = listEl.querySelector('#gb-show-all-wpn');
        if (showAllBtn) {
          showAllBtn.onclick = () => {
            onlyClassFit = false;
            const cb = box.querySelector('#gb-only-fit');
            if (cb) cb.checked = false;
            updateEquipList();
          };
        }
        listEl.querySelectorAll('[data-jump-slot]').forEach(btn => {
          btn.onclick = () => {
            activePanel = btn.dataset.jumpSlot;
            renderBoard();
            renderPicker();
          };
        });
        return;
      }

      listEl.innerHTML = list.map(it => {
        const rm = RARITY_META[it.rar] || RARITY_META.common;
        const attrs = [];
        attrs.push(`Lv.${it.lv || 0}`);
        if (it.atk) attrs.push(`ATK ${it.atk}`);
        if (it.matk) attrs.push(`MATK ${it.matk}`);
        if (it.def) attrs.push(`DEF ${it.def}`);
        if (it.mdef) attrs.push(`MDEF ${it.mdef}`);
        if (it.el) attrs.push(`ธาตุ ${it.el}`);
        if (it.wt && cat.wtypes?.[it.wt]?.name) attrs.push(cat.wtypes[it.wt].name);
        const iconHtml = renderAtlasIcon(it.ic, 28, rm.badge);
        return `
          <div class="gb-item">
            <div class="gb-item-icon" style="border:1px solid ${rm.color}55;">${iconHtml}</div>
            <div class="gb-item-body">
              <b style="color:${rm.color};">${esc(it.name)}</b>
              <div class="gb-attrs">${attrs.map(a => `<span>${esc(a)}</span>`).join('')}</div>
              ${it.wsk ? `<small style="color:#86efac;display:block;">✨ ${esc(it.wsk)}</small>` : ''}
              ${it.abil ? `<small style="color:#fde68a;display:block;">⚡ ${esc(it.abil)}</small>` : ''}
            </div>
            <button type="button" class="gb-pick" data-add-item="${esc(it.id)}">+ เพิ่ม</button>
          </div>
        `;
      }).join('');

      listEl.querySelectorAll('[data-add-item]').forEach(btn => {
        btn.onclick = () => {
          const g = gp();
          if (!g) return;
          const id = btn.dataset.addItem;
          const it = (cat.items || []).find(x => x.id === id);
          if (!it) return;
          const defPrice = it.rar === 'legend' ? 45000 : (it.rar === 'epic' ? 12000 : (it.rar === 'rare' ? 3000 : 1200));
          g.steps.push({
            id: uid(),
            type: 'buy_equip',
            slot: activePanel,
            mode: 'exact',
            itemId: it.id,
            itemName: it.name,
            minGrade: 0,
            minRefine: 0,
            requiredOpt: '',
            minLevel: Math.max(1, Number(it.lv) || 1),
            minCoins: 0,
            maxBuyPrice: defPrice
          });
          renderBoard();
          renderSteps();
        };
      });
    };

    box.querySelector('#gb-mode-flex').onclick = () => { equipPickMode = 'flex'; renderPicker(); };
    box.querySelector('#gb-search-input').oninput = e => { searchQ = e.target.value; updateEquipList(); };
    const fitCb = box.querySelector('#gb-only-fit');
    if (fitCb) fitCb.onchange = e => { onlyClassFit = e.target.checked; updateEquipList(); };
    updateEquipList();
  }

  function renderSteps() {
    const g = gp();
    const listEl = modal.querySelector('#gb-steps');
    const countEl = modal.querySelector('#gb-step-count');
    if (!g || !listEl) return;
    if (countEl) countEl.textContent = String(g.steps.length);

    if (g.steps.length === 0) {
      listEl.innerHTML = '<div class="gb-empty">ยังไม่มีขั้นตอน Set Gear — คลิกเลือกช่องทางซ้าย หรือเลือก "พรีเซ็ตแนะนำตามอาชีพ" ด้านบนได้เลย!</div>';
      return;
    }

    const cat = catalog || { items: [], runes: [], skills: [], cards: [] };
    const bm = getBasicRuneMeta(cat);
    listEl.innerHTML = g.steps.map((s, idx) => {
      const isBasicRune = s.type === 'buy_rune' && (s.skillId === 'bl_basic' || s.skillId === bm.id);
      let icon = s.type === 'buy_equip' ? '⚔️' : (isBasicRune ? '⚔️' : s.type === 'buy_rune' ? '🔮' : s.type === 'buy_card' ? '🃏' : s.type === 'polish' ? '✨' : '🔨');
      if (s.type === 'buy_equip' && s.itemId) {
        const im = (cat.items || []).find(x => x.id === s.itemId);
        if (im && im.ic) icon = renderAtlasIcon(im.ic, 26, icon);
      } else if (s.type === 'buy_rune' && s.runeKind) {
        const rm = (cat.runes || []).find(x => x.k === s.runeKind);
        const ric = getRuneTierIc(rm, s.tier || 1);
        if (ric) icon = renderAtlasIcon(ric, 26, icon);
      } else if (s.type === 'buy_card' && s.monType) {
        const cm = (cat.cards || []).find(x => x.mon === s.monType);
        if (cm && (cm.ic || cm.cardIc)) icon = renderAtlasIcon(cm.ic || cm.cardIc, 26, icon);
      }
      let title = '';
      let extraHtml = '';

      if (s.type === 'buy_equip') {
        title = `<b>${esc(SLOT_LABEL[s.slot] || s.slot)}</b>: ${esc(s.itemName || s.itemId || 'Flex')} <small>(${s.mode === 'flex' ? 'Flex' : esc(s.itemId || '')})</small>`;
        extraHtml = `
          <div class="gb-step-opts">
            <select data-idx="${idx}" data-field="minGrade" class="gb-opt-type">
              ${GRADE_OPTIONS.map(([v, l]) => `<option value="${v}" ${(Number(s.minGrade) || 0) === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}
            </select>
            <select data-idx="${idx}" data-field="minRefine" class="gb-opt-type">
              ${[0,1,2,3,4,5,6,7,8,9,10].map(r => `<option value="${r}" ${(Number(s.minRefine) || 0) === r ? 'selected' : ''}>${r === 0 ? 'ตีบวกไม่จำกัด' : `+${r} ขึ้นไป`}</option>`).join('')}
            </select>
            <select data-idx="${idx}" data-field="requiredOpt" class="gb-opt-type">
              ${OPT_FILTERS.map(([v, l]) => `<option value="${esc(v)}" ${(s.requiredOpt || '') === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}
            </select>
            <button type="button" class="gb-card-btn" data-add-polish="${idx}" title="เพิ่มขั้นตอนขัดเกรดที่ป๋าหมูหริ่ง">+ ขัดเกรด</button>
            <button type="button" class="gb-card-btn" data-add-refine="${idx}" title="เพิ่มขั้นตอนตีบวกที่ป๋าหมูหริ่ง">+ ตีบวก</button>
          </div>
        `;
      } else if (s.type === 'buy_rune') {
        const rName = (cat.runes || []).find(r => r.k === s.runeKind)?.name || s.runeKind;
        const tierNum = Math.max(1, Math.min(3, Number(s.tier) || 1));
        const slotIdx = Math.max(0, Math.min(isBasicRune ? 2 : 1, Number(s.skillSlot) || 0));
        if (isBasicRune) {
          const unlockLv = slotIdx === 0 ? bm.slot0Lv : (slotIdx === 1 ? bm.slot1Lv : bm.slot2Lv);
          title = `<span style="color:#7dd3fc;">[รูนตีปกติ]</span> <b>${esc(rName)} ขั้น ${'I'.repeat(tierNum)}</b> ➔ ช่อง ${slotIdx + 1} <small style="color:#94a3b8;">(ปลด Lv.${unlockLv})</small>`;
          extraHtml = `
            <div class="gb-step-opts">
              <select data-idx="${idx}" data-field="skillSlot" class="gb-opt-type">
                <option value="0" ${slotIdx === 0 ? 'selected' : ''}>ช่อง 1 (Lv.${bm.slot0Lv})</option>
                <option value="1" ${slotIdx === 1 ? 'selected' : ''}>ช่อง 2 (Lv.${bm.slot1Lv})</option>
                <option value="2" ${slotIdx === 2 ? 'selected' : ''}>ช่อง 3 (Lv.${bm.slot2Lv})</option>
              </select>
              <select data-idx="${idx}" data-field="tier" class="gb-opt-type">
                <option value="1" ${tierNum === 1 ? 'selected' : ''}>ขั้น I+</option>
                <option value="2" ${tierNum === 2 ? 'selected' : ''}>ขั้น II+</option>
                <option value="3" ${tierNum === 3 ? 'selected' : ''}>ขั้น III</option>
              </select>
              <span>คุณภาพขั้นต่ำ:</span>
              <input type="number" data-idx="${idx}" data-field="minQualityPct" min="0" max="100" value="${Number(s.minQualityPct) || 0}" style="width:52px;" class="gb-opt-type"> %
            </div>
          `;
        } else {
          const sName = (cat.skills || []).find(sk => sk.id === s.skillId)?.name || s.skillId;
          title = `<b>รูน ${esc(rName)} ขั้น ${'I'.repeat(tierNum)}</b> ➔ ฝังสกิล <b>${esc(sName)}</b> (ช่อง ${slotIdx + 1})`;
          extraHtml = `
            <div class="gb-step-opts">
              <select data-idx="${idx}" data-field="tier" class="gb-opt-type">
                <option value="1" ${tierNum === 1 ? 'selected' : ''}>ขั้น I+</option>
                <option value="2" ${tierNum === 2 ? 'selected' : ''}>ขั้น II+</option>
                <option value="3" ${tierNum === 3 ? 'selected' : ''}>ขั้น III</option>
              </select>
              <span>คุณภาพขั้นต่ำ:</span>
              <input type="number" data-idx="${idx}" data-field="minQualityPct" min="0" max="100" value="${Number(s.minQualityPct) || 0}" style="width:52px;" class="gb-opt-type"> %
            </div>
          `;
        }
      } else if (s.type === 'buy_card') {
        const cName = s.cardName || (cat.cards || []).find(c => c.mon === s.monType)?.name || s.monType;
        const modeTxt = s.equipMode === 'act' ? `วิชามอน #${(Number(s.slotIndex) || 0) + 1}` : (s.equipMode === 'learn_only' ? 'เรียนลงสมุด' : `พาสซีฟ #${(Number(s.slotIndex) || 0) + 1}`);
        const targetLv = clampCardTargetLevel(s.targetLevel);
        title = `<b>การ์ด ${esc(cName)}</b> ➔ ${esc(modeTxt)} <small style="color:#fde68a;">(เป้า Lv.${targetLv}${targetLv >= 10 ? ' ตัน' : ''})</small>`;
        extraHtml = `
          <div class="gb-step-opts">
            <span>จำกัดระดับการ์ด:</span>
            <select data-idx="${idx}" data-field="targetLevel" class="gb-opt-type">
              ${[1,2,3,4,5,6,7,8,9,10].map(lv => `<option value="${lv}" ${targetLv === lv ? 'selected' : ''}>Lv.${lv}${lv === 1 ? ' (1 ใบ)' : lv === 10 ? ' (ตัน)' : ''}</option>`).join('')}
            </select>
          </div>
        `;
      } else if (s.type === 'polish') {
        title = `<b>✨ ขัดเกรด ${esc(SLOT_LABEL[s.slot] || s.slot)}</b> ➔ เป้า G${Number(s.targetGrade) || 2}`;
        extraHtml = `
          <div class="gb-step-opts">
            <span>เป้าเกรด:</span>
            <select data-idx="${idx}" data-field="targetGrade" class="gb-opt-type">
              ${[1,2,3,4].map(gVal => `<option value="${gVal}" ${(Number(s.targetGrade) || 2) === gVal ? 'selected' : ''}>G${gVal}</option>`).join('')}
            </select>
            <label style="margin:0;display:inline-flex;align-items:center;gap:4px;"><input type="checkbox" data-idx="${idx}" data-bool="useSeal" ${s.useSeal ? 'checked' : ''}> ใช้ตราผนึก</label>
          </div>
        `;
      } else if (s.type === 'refine') {
        title = `<b>🔨 ตีบวก ${esc(SLOT_LABEL[s.slot] || s.slot)}</b> ➔ เป้า +${Number(s.targetRefine) || 3}`;
        extraHtml = `
          <div class="gb-step-opts">
            <span>เป้าตีบวก:</span>
            <select data-idx="${idx}" data-field="targetRefine" class="gb-opt-type">
              ${[1,2,3,4,5,6,7,8,9,10].map(rVal => `<option value="${rVal}" ${(Number(s.targetRefine) || 3) === rVal ? 'selected' : ''}>+${rVal}${rVal >= 9 ? ' (ใช้หินกันแตก)' : ''}</option>`).join('')}
            </select>
          </div>
        `;
      }

      const priceField = (s.type === 'polish' || s.type === 'refine') ? 'maxSpend' : 'maxBuyPrice';
      const priceLabel = (s.type === 'polish' || s.type === 'refine') ? 'งบสูงสุด' : 'ซื้อไม่เกิน';
      const priceVal = Number(s[priceField]) || 0;

      return `
        <div class="gb-step">
          <div class="gb-step-no">${idx + 1}</div>
          <div class="gb-step-icon">${icon}</div>
          <div class="gb-step-body">
            <div class="gb-step-title">${title}</div>
            ${extraHtml}
          </div>
          <div class="gb-conds">
            <label class="gb-lv">Lv.≥ <input type="number" data-idx="${idx}" data-field="minLevel" min="1" max="99" value="${Number(s.minLevel) || 1}"></label>
            <label class="gb-zeny">${priceLabel} <input type="number" data-idx="${idx}" data-field="${priceField}" min="0" step="500" value="${priceVal}"> g</label>
          </div>
          <div class="gb-step-btns">
            <button type="button" data-move="${idx}:-1" ${idx === 0 ? 'disabled' : ''}>▲</button>
            <button type="button" data-move="${idx}:1" ${idx === g.steps.length - 1 ? 'disabled' : ''}>▼</button>
            <button type="button" class="gb-del" data-del="${idx}">✕</button>
          </div>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('[data-field]').forEach(el => {
      el.onchange = () => {
        const i = Number(el.dataset.idx);
        const f = el.dataset.field;
        if (!g.steps[i]) return;
        const isNum = el.type === 'number' || ['minGrade', 'minRefine', 'targetGrade', 'targetRefine', 'minLevel', 'maxBuyPrice', 'maxSpend', 'minQualityPct', 'targetLevel', 'tier', 'skillSlot'].includes(f);
        let val = isNum ? Math.max(0, Math.floor(Number(el.value) || 0)) : el.value;
        if (f === 'targetLevel') val = clampCardTargetLevel(val);
        else if (f === 'tier') val = Math.max(1, Math.min(3, val || 1));
        else if (f === 'skillSlot') {
          const maxSlot = (g.steps[i].type === 'buy_rune' && (g.steps[i].skillId === 'bl_basic' || g.steps[i].skillId === bm.id)) ? 2 : 1;
          val = Math.max(0, Math.min(maxSlot, val || 0));
        }
        g.steps[i][f] = val;
        if (f === 'skillSlot' && g.steps[i].type === 'buy_rune' && (g.steps[i].skillId === 'bl_basic' || g.steps[i].skillId === bm.id)) {
          const reqUnlock = val === 0 ? bm.slot0Lv : (val === 1 ? bm.slot1Lv : bm.slot2Lv);
          if ((Number(g.steps[i].minLevel) || 0) < reqUnlock) g.steps[i].minLevel = reqUnlock;
        }
        renderBoard();
        if (['targetLevel', 'tier', 'skillSlot', 'targetGrade', 'targetRefine'].includes(f)) {
          renderSteps();
        }
      };
    });
    listEl.querySelectorAll('[data-bool]').forEach(el => {
      el.onchange = () => {
        const i = Number(el.dataset.idx);
        if (g.steps[i]) g.steps[i][el.dataset.bool] = Boolean(el.checked);
      };
    });
    listEl.querySelectorAll('[data-move]').forEach(btn => {
      btn.onclick = () => {
        const [i, dir] = btn.dataset.move.split(':').map(Number);
        const j = i + dir;
        if (j < 0 || j >= g.steps.length) return;
        const tmp = g.steps[i];
        g.steps[i] = g.steps[j];
        g.steps[j] = tmp;
        renderSteps();
      };
    });
    listEl.querySelectorAll('[data-del]').forEach(btn => {
      btn.onclick = () => {
        const i = Number(btn.dataset.del);
        g.steps.splice(i, 1);
        renderBoard();
        renderSteps();
      };
    });
    listEl.querySelectorAll('[data-add-polish]').forEach(btn => {
      btn.onclick = () => {
        const i = Number(btn.dataset.addPolish);
        const src = g.steps[i];
        if (!src) return;
        g.steps.splice(i + 1, 0, {
          id: uid(),
          type: 'polish',
          slot: src.slot,
          itemId: src.mode === 'exact' ? (src.itemId || '') : '',
          targetGrade: 2,
          useSeal: false,
          minLevel: Number(src.minLevel) || 20,
          minCoins: 0,
          maxSpend: 10000
        });
        renderBoard();
        renderSteps();
      };
    });
    listEl.querySelectorAll('[data-add-refine]').forEach(btn => {
      btn.onclick = () => {
        const i = Number(btn.dataset.addRefine);
        const src = g.steps[i];
        if (!src) return;
        g.steps.splice(i + 1, 0, {
          id: uid(),
          type: 'refine',
          slot: src.slot,
          itemId: src.mode === 'exact' ? (src.itemId || '') : '',
          targetRefine: 3,
          useSafety: true,
          minLevel: Number(src.minLevel) || 20,
          minCoins: 0,
          maxSpend: 10000
        });
        renderBoard();
        renderSteps();
      };
    });
  }

  function renderTopBar() {
    const g = gp();
    if (!g || !modal) return;
    modal.querySelector('#gb-enabled').checked = g.enabled !== false;
    modal.querySelector('#gb-reserve-coins').value = Number(g.reserveCoins ?? 50000);
    const sel = modal.querySelector('#gb-start-class');
    const opts = getClassOptions();
    sel.innerHTML = opts.map(o => `<option value="${esc(o.id)}">${esc(o.label)}</option>`).join('');
    sel.value = opts.some(o => o.id === g.startClass) ? g.startClass : 'traveler';
  }

  function renderAll() {
    renderTopBar();
    renderBoard();
    renderPicker();
    renderSteps();
  }

  async function open() {
    if (!plan()) return;
    gp();
    snapshot = JSON.stringify(plan().gearPlan);
    buildModal();
    modal.style.display = 'flex';
    modal.querySelector('#gb-picker').innerHTML = '<div class="gb-empty">⏳ กำลังโหลดฐานข้อมูลไอเทม รูน และการ์ด Nightcamp...</div>';
    renderTopBar();
    renderBoard();
    renderSteps();
    await loadCatalog();
    renderBoard();
    renderPicker();
    renderSteps();
  }

  function close(save) {
    if (!save && snapshot && plan()) {
      plan().gearPlan = JSON.parse(snapshot);
    }
    if (save && typeof markPlanDirty === 'function') {
      markPlanDirty(true);
    }
    snapshot = null;
    if (modal) modal.style.display = 'none';
    updateBadge();
  }

  function updateBadge() {
    const badge = document.getElementById('plan-gear-count-badge');
    if (!badge || !plan()) return;
    const g = plan().gearPlan;
    const n = (g && Array.isArray(g.steps)) ? g.steps.length : 0;
    const on = g && g.enabled !== false && n > 0;
    badge.textContent = on ? `${n} รายการ` : (n > 0 ? `${n} (ปิด)` : '0 รายการ');
    badge.style.background = on ? 'rgba(245, 158, 11, 0.35)' : 'rgba(148, 163, 184, 0.25)';
  }

  window.openGearBuilderModal = open;
  window.updateGearBuilderBadge = updateBadge;
  document.addEventListener('click', e => {
    if (e.target && e.target.closest('#btn-open-gear-builder')) {
      open();
    }
  });
})();
