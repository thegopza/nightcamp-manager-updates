/* Nightcamp SS2 Build Simulator — Core Calibrated Combat Engine (UMD: Browser + Node)
 * Single source of truth shared by:
 *   1. Manager Browser UI (window.NCSimEngine)
 *   2. Manager REST API (manager/sim_api.js)
 *   3. Standalone MCP Server (mcp/build-sim-mcp.js)
 * Anchored 100% to manager/public/wiki/data.json + Nightcamp SS2 exact formulas.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.NCSimEngine = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // =========================================================================
  // 1. EXACT NIGHTCAMP SS2 CONSTANTS & TABLES
  // =========================================================================
  const START_STATS = { str: 5, agi: 5, vit: 5, int: 5, dex: 5, luk: 5 };
  const STAT_KEYS = ['str', 'agi', 'vit', 'int', 'dex', 'luk'];
  const STAT_MAX = 99;
  const LV_MAX = 99;
  const JOB_MAX = 50;

  function statusPointsAt(lv) {
    const Lmax = Math.max(1, Math.min(LV_MAX, lv | 0));
    let n = 48;
    for (let L = 2; L <= Lmax; L++) n += Math.floor((L - 1) / 5) + 3;
    return n;
  }

  function statCost(x) {
    return Math.floor((Math.max(1, x | 0) - 1) / 10) + 2;
  }

  function statSpent(base) {
    let total = 0;
    for (const k of STAT_KEYS) {
      const start = START_STATS[k];
      const cur = Math.max(start, Math.min(STAT_MAX, (base && base[k]) || start));
      for (let v = start; v < cur; v++) total += statCost(v);
    }
    return total;
  }

  const ELEMENTS = ['neutral', 'fire', 'water', 'wind', 'earth', 'poison', 'holy', 'shadow', 'ghost', 'undead'];
  const ELEMENT_INFO = {
    neutral: { th: 'ไม่มีธาตุ', en: 'Neutral', color: '#d8cfbf' },
    water: { th: 'น้ำ', en: 'Water', color: '#5aa9ff' },
    earth: { th: 'ดิน', en: 'Earth', color: '#c08a4a' },
    fire: { th: 'ไฟ', en: 'Fire', color: '#ff7a3d' },
    wind: { th: 'ลม', en: 'Wind', color: '#7fd67a' },
    poison: { th: 'พิษ', en: 'Poison', color: '#b36ee0' },
    holy: { th: 'ศักดิ์สิทธิ์', en: 'Holy', color: '#ffe07a' },
    shadow: { th: 'มืด', en: 'Shadow', color: '#8a78d8' },
    ghost: { th: 'วิญญาณ', en: 'Ghost', color: '#bfeaf5' },
    undead: { th: 'อมตะ', en: 'Undead', color: '#9fb38f' },
  };
  const ELEMENT_TABLE = [
    [100, 100, 100, 100, 100, 100, 100, 100, 25, 100],
    [100, 25, 100, 150, 50, 100, 75, 100, 100, 100],
    [100, 100, 25, 50, 150, 100, 75, 100, 100, 100],
    [100, 50, 150, 25, 100, 100, 75, 100, 100, 125],
    [100, 175, 50, 100, 25, 100, 75, 100, 100, 100],
    [100, 100, 125, 125, 125, 0, 75, 50, 100, -25],
    [100, 100, 100, 100, 100, 100, 0, 125, 100, 150],
    [100, 100, 100, 100, 100, 50, 125, 0, 100, -25],
    [25, 100, 100, 100, 100, 100, 75, 75, 125, 100],
    [100, 100, 100, 100, 100, 50, 100, 0, 100, 0],
  ];

  function elementMod(atkEl, defEl) {
    const i = ELEMENTS.indexOf((atkEl || 'neutral').toLowerCase());
    const j = ELEMENTS.indexOf((defEl || 'neutral').toLowerCase());
    if (i < 0 || j < 0) return 1;
    return Math.max(0, ELEMENT_TABLE[i][j] / 100);
  }

  const ASPD_CAP = 2.5;
  const ASPD_STAT = { agi: 0.004, dex: 0.001, cap: 1.5 };
  function aspdShown(wAspd, mul) {
    return Math.min(190, Math.round(200 - 50 / (((wAspd) || 1) * (mul || 1))));
  }

  // Exact [hpPerLv, spPerLv, maxJob] from NC.JOBS (all 46 jobs)
  const JOBS_HPSP = {
    traveler: [5, 2, 10], knight: [7, 2.5, 50], mage: [4.5, 6, 50], archer: [4.5, 3, 50],
    rogue: [5.5, 2.5, 50], priest: [4.5, 5.5, 50], paladin: [8.5, 3, 50], dragonknight: [8, 2.5, 50],
    archmage: [4, 7.5, 50], warlock: [4.5, 7, 50], ranger: [5.5, 3.5, 50], wolfhunter: [6, 3.5, 50],
    assassin: [6.5, 3, 50], shinobi: [6, 3.5, 50], bishop: [5, 7, 50], monk: [7.5, 4, 50],
    swordmaster: [7, 4, 50], berserker: [8, 2.5, 50], firemage: [4, 7.5, 50], icemage: [4.5, 7, 50],
    bard: [5, 4.5, 50], gunslinger: [5, 3.5, 50], reaper: [6.5, 3, 50], puppeteer: [5.5, 4, 50],
    lightkeeper: [6, 6, 50], wisp: [4.5, 7, 50], dawnwarden: [9.5, 3.3, 50], dragonbound: [9, 2.8, 50],
    starblade: [7.7, 4.4, 50], starcore: [4.4, 8.3, 50], winterlord: [5, 7.7, 50], astral: [4.4, 8.3, 50],
    hexlord: [5, 7.7, 50], bloodmoon: [9, 2.8, 50], moonsniper: [6, 3.9, 50], packalpha: [6.6, 3.9, 50],
    maestro: [5.5, 5, 50], outlaw: [5.5, 3.9, 50], eclipse: [7.2, 3.3, 50], shadowlord: [6.6, 3.9, 50],
    harvester: [7.2, 3.3, 50], showmaster: [6, 4.4, 50], starsaint: [5.5, 7.7, 50], meteorfist: [8.2, 4.4, 50],
    beacon: [6.6, 6.6, 50], starshepherd: [5, 7.7, 50],
  };

  // Exact weapon type properties (all 30 weapon types)
  const WTYPES_META = {
    sword: { aspd: 1.0, style: 'swing', hitK: 1.25 },
    lance: { aspd: 1.0, style: 'thrust', hitK: 1.05 },
    axe: { aspd: 0.9, style: 'swing', hitK: 1.15 },
    hammer: { aspd: 0.9, style: 'smash', hitK: 1.7 },
    gsword: { aspd: 0.78, style: 'swing', hitK: 2.2 },
    bow: { aspd: 1.0, ranged: true, style: 'arrow', hitK: 1.0 },
    dagger: { aspd: 1.35, style: 'swing', hitK: 1.0 },
    staff: { aspd: 1.05, magic: true, style: 'bolt', matkMul: 0.45, hitK: 1.0 },
    lantern: { aspd: 1.05, magic: true, style: 'bolt', matkMul: 0.5, hitK: 1.0 },
    qstaff: { aspd: 1.15, style: 'thrust', hitK: 1.05 },
    dsword: { aspd: 1.2, style: 'swing', hitK: 1.1 },
    orb: { aspd: 1.08, magic: true, style: 'bolt', matkMul: 0.5, hitK: 1.0 },
    gaxe: { aspd: 0.85, style: 'smash', hitK: 1.9 },
    mace: { aspd: 0.95, style: 'swing', hitK: 1.3 },
    spear: { aspd: 1.05, style: 'thrust', hitK: 1.05 },
    scythe: { aspd: 0.9, style: 'swing', hitK: 1.8 },
    sickle: { aspd: 1.4, style: 'swing', hitK: 1.0 },
    katar: { aspd: 1.2, style: 'swing', hitK: 1.05 },
    knuckle: { aspd: 1.4, style: 'swing', hitK: 1.0 },
    book: { aspd: 1.0, magic: true, style: 'bolt', matkMul: 0.45, hitK: 1.0 },
    instrument: { aspd: 1.0, ranged: true, style: 'bolt', hitK: 1.0 },
    whip: { aspd: 1.05, ranged: true, style: 'swing', hitK: 1.2 },
    pistol: { aspd: 1.3, ranged: true, style: 'bolt', hitK: 1.0, gun: 'pistol' },
    shotgun: { aspd: 0.8, ranged: true, style: 'bolt', hitK: 1.3, gun: 'shotgun' },
    bell: { aspd: 1.0, magic: true, style: 'bolt', matkMul: 0.5, hitK: 1.0 },
    puppet: { aspd: 1.05, style: 'bolt', hitK: 1.05 },
    wire: { aspd: 1.3, style: 'thrust', hitK: 1.05 },
    torch: { aspd: 1.0, style: 'swing', hitK: 1.4 },
    xbow: { aspd: 0.85, ranged: true, style: 'arrow', hitK: 1.2 },
    huuma: { aspd: 0.9, ranged: true, style: 'throw', hitK: 1.5 },
  };

  // Exact allowed weapon types per job (all 46 jobs)
  const JOB_WEAPONS = {
    traveler: ['sword', 'gsword', 'spear', 'axe', 'staff', 'orb', 'bow', 'dagger', 'mace', 'lance'],
    knight: ['sword', 'gsword', 'spear', 'axe'],
    mage: ['staff', 'orb'],
    archer: ['bow'],
    rogue: ['dagger', 'sword'],
    priest: ['staff', 'mace'],
    paladin: ['mace', 'sword', 'gsword', 'spear', 'axe'],
    dragonknight: ['lance', 'sword', 'gsword', 'spear', 'axe'],
    archmage: ['staff', 'orb'],
    warlock: ['lantern', 'staff', 'orb'],
    ranger: ['xbow', 'bow'],
    wolfhunter: ['bow'],
    assassin: ['katar', 'dagger', 'sword'],
    shinobi: ['huuma', 'dagger', 'sword'],
    bishop: ['book', 'staff', 'mace'],
    monk: ['knuckle', 'qstaff', 'staff', 'mace'],
    swordmaster: ['dsword', 'sword', 'gsword', 'spear', 'axe'],
    berserker: ['gaxe', 'hammer', 'sword', 'gsword', 'spear', 'axe'],
    firemage: ['staff', 'orb'],
    icemage: ['staff', 'orb'],
    bard: ['instrument', 'whip', 'bow'],
    gunslinger: ['pistol', 'shotgun', 'bow'],
    reaper: ['scythe', 'sickle', 'dagger', 'sword'],
    puppeteer: ['puppet', 'wire', 'dagger', 'sword'],
    lightkeeper: ['torch', 'staff', 'mace'],
    wisp: ['bell', 'staff', 'mace'],
    dawnwarden: ['mace', 'sword', 'gsword', 'spear', 'axe'],
    dragonbound: ['lance', 'sword', 'gsword', 'spear', 'axe'],
    starblade: ['dsword', 'sword', 'gsword', 'spear', 'axe'],
    starcore: ['staff', 'orb'],
    winterlord: ['staff', 'orb'],
    astral: ['staff', 'orb'],
    hexlord: ['lantern', 'staff', 'orb'],
    bloodmoon: ['gaxe', 'hammer', 'sword', 'gsword', 'spear', 'axe'],
    moonsniper: ['xbow', 'bow'],
    packalpha: ['bow'],
    maestro: ['instrument', 'whip', 'bow'],
    outlaw: ['pistol', 'shotgun', 'bow'],
    eclipse: ['katar', 'dagger', 'sword'],
    shadowlord: ['huuma', 'dagger', 'sword'],
    harvester: ['scythe', 'sickle', 'dagger', 'sword'],
    showmaster: ['puppet', 'wire', 'dagger', 'sword'],
    starsaint: ['book', 'staff', 'mace'],
    meteorfist: ['knuckle', 'qstaff', 'staff', 'mace'],
    beacon: ['torch', 'staff', 'mace'],
    starshepherd: ['bell', 'staff', 'mace'],
  };

  const JOB_SHIELD_SET = new Set([
    'traveler', 'knight', 'mage', 'rogue', 'priest', 'paladin', 'dragonknight', 'archmage',
    'warlock', 'assassin', 'shinobi', 'bishop', 'monk', 'swordmaster', 'berserker', 'firemage',
    'icemage', 'puppeteer', 'lightkeeper', 'wisp', 'dawnwarden', 'dragonbound', 'starblade',
    'starcore', 'winterlord', 'astral', 'hexlord', 'bloodmoon', 'eclipse', 'shadowlord',
    'showmaster', 'starsaint', 'meteorfist', 'beacon', 'starshepherd',
  ]);

  const GRADES = [
    { g: 0, key: 'g0', name: 'ด้าน', en: 'MATTE', color: '#ece6d8', rgb: '236,230,216' },
    { g: 1, key: 'g1', name: 'เงา', en: 'GLOSSY', color: '#7fe07a', rgb: '127,224,122' },
    { g: 2, key: 'g2', name: 'วาว', en: 'SHINY', color: '#6fb6ff', rgb: '111,182,255' },
    { g: 3, key: 'g3', name: 'แวววาว', en: 'GLEAMING', color: '#c792ff', rgb: '199,146,255' },
    { g: 4, key: 'g4', name: 'เจิดจ้า', en: 'BRILLIANT', color: '#ffc94d', rgb: '255,201,77' },
    { g: 5, key: 'g5', name: 'ราตรี', en: 'NIGHT', color: '#ff4f86', rgb: '255,79,134' },
  ];

  const RARITY_INFO = {
    common: { th: 'ทั่วไป', color: '#cbd5e1', g: 1 },
    uncommon: { th: 'ดี', color: '#4ade80', g: 1 },
    rare: { th: 'หายาก', color: '#60a5fa', g: 2 },
    epic: { th: 'มหากาพย์', color: '#c084fc', g: 3 },
    legendary: { th: 'ตำนาน', color: '#fbbf24', g: 4 },
  };

  const EQUIP_SLOTS = ['hat', 'glasses', 'weapon', 'shield', 'top', 'pants', 'cape', 'acc1', 'acc2'];
  const SLOT_LABELS = {
    hat: 'หมวก', glasses: 'แว่นตา', weapon: 'อาวุธ', shield: 'โล่',
    top: 'เสื้อ', pants: 'กางเกง', cape: 'ผ้าคลุม', acc1: 'ประดับ 1', acc2: 'ประดับ 2',
  };

  const GEAROPT = {
    atk: { th: 'พลังโจมตี %', on: 'W', tiers: [[1, 2], [2, 3], [3, 4]] },
    matk: { th: 'MATK %', on: 'W', tiers: [[1, 2], [2, 3], [3, 4]] },
    crit: { th: 'คริติคอล %', on: 'W', tiers: [[2, 2], [3, 3], [4, 4]] },
    critDmg: { th: 'คริแรง %', on: 'W', tiers: [[2, 3], [4, 5], [6, 8]], cap: 100 },
    aspd: { th: 'ตีเร็ว %', on: 'WA', tiers: [[2, 3], [4, 5], [5, 6]] },
    pen: { th: 'เจาะเกราะ %', on: 'W', tiers: [[2, 3], [3, 5], [5, 6]], cap: 50 },
    mpen: { th: 'เจาะเวท %', on: 'W', tiers: [[2, 3], [3, 5], [5, 6]], cap: 50 },
    boss: { th: 'แรงกับบอส %', on: 'W', tiers: [[2, 3], [3, 5], [5, 6]] },
    leech: { th: 'ดูดเลือด %', on: 'W', tiers: [[1, 1], [1, 1], [2, 2]], cap: 10 },
    acd: { th: 'ดีเลย์หลังร่าย -%', on: 'WA', tiers: [[1, 2], [2, 3], [4, 4]], cap: 50 },
    cast: { th: 'ร่ายไว %', on: 'WA', tiers: [[1, 2], [2, 3], [4, 4]], cap: 30 },
    cdr: { th: 'คูลดาวน์ -%', on: 'WA', tiers: [[1, 1], [2, 2], [3, 3]], cap: 60 },
    spCost: { th: 'ประหยัด SP %', on: 'WA', tiers: [[1, 2], [2, 3], [4, 4]], cap: 70 },
    lowDmg: { th: 'แรงตอนเลือดต่ำ %', on: 'WA', tiers: [[2, 3], [3, 5], [5, 6]], cap: 30 },
    hit: { th: 'ความแม่น', on: 'W', tiers: [[2, 3], [3, 5], [5, 6]] },
    stat: { th: 'สเตตัส', on: 'WDHA', tiers: [[1, 1], [2, 2], [2, 3]], subs: ['str', 'agi', 'vit', 'int', 'dex', 'luk'], cap: 10 },
    elDmg: { th: 'ธาตุแรงขึ้น %', on: 'W', tiers: [[2, 2], [3, 4], [4, 5]], subs: ['water', 'earth', 'fire', 'wind', 'poison', 'holy', 'shadow', 'ghost', 'undead'] },
    race: { th: 'แรงกับเผ่า %', on: 'W', tiers: [[3, 4], [5, 6], [7, 8]], subs: ['plant', 'brute', 'insect', 'undead', 'spirit', 'formless', 'dragon'] },
    el: { th: 'แรงกับธาตุ %', on: 'W', tiers: [[3, 4], [5, 6], [7, 8]], subs: ['water', 'earth', 'fire', 'wind', 'poison', 'shadow', 'ghost', 'undead'] },
    hpPct: { th: 'HP %', on: 'DHA', tiers: [[1, 2], [2, 2], [3, 3]] },
    spPct: { th: 'SP %', on: 'DHA', tiers: [[1, 2], [2, 2], [3, 3]] },
    hpReg: { th: 'ฟื้น HP %', on: 'DA', tiers: [[2, 3], [4, 4], [5, 5]] },
    spReg: { th: 'ฟื้น SP %', on: 'DA', tiers: [[2, 3], [4, 4], [5, 5]] },
    flee: { th: 'FLEE', on: 'DHA', tiers: [[2, 3], [3, 4], [5, 6]], cap: 50 },
    pdodge: { th: 'หลบสมบูรณ์ %', on: 'HA', tiers: [[1, 1], [1, 1], [2, 2]], cap: 10 },
    resBoss: { th: 'ต้านบอส %', on: 'DA', tiers: [[1, 2], [3, 3], [4, 4]], cap: 30 },
    resEl: { th: 'ต้านธาตุ %', on: 'DHA', tiers: [[2, 3], [4, 5], [5, 6]], subs: ['water', 'earth', 'fire', 'wind', 'poison', 'shadow', 'ghost', 'undead'], cap: 50 },
    spd: { th: 'วิ่งเร็ว %', on: 'DA', tiers: [[1, 1], [1, 1], [2, 2]] },
    proc: { th: 'ร่ายเวทอัตโนมัติ %', on: 'W', tiers: [[1, 1], [2, 2], [2, 2]], subs: ['windline', 'lightning', 'spores', 'bats', 'icespikes', 'firepillar', 'fireballs', 'crescent'] },
  };

  const BUFFPOTS = {
    bp_bless_s: { id: 'bp_bless_s', kind: 'bless', size: 's', name: 'ยาพรศักดิ์สิทธิ์ (เล็ก)', mods: { str: 5, int: 5, dex: 5 }, what: 'STR/INT/DEX +5' },
    bp_bless_l: { id: 'bp_bless_l', kind: 'bless', size: 'l', name: 'ยาพรศักดิ์สิทธิ์ (ใหญ่)', mods: { str: 10, int: 10, dex: 10 }, what: 'STR/INT/DEX +10' },
    bp_swift_s: { id: 'bp_swift_s', kind: 'swift', size: 's', name: 'ยาเท้าไว (เล็ก)', mods: { agi: 5, spd: 10 }, what: 'AGI +5 · วิ่ง +10%' },
    bp_swift_l: { id: 'bp_swift_l', kind: 'swift', size: 'l', name: 'ยาเท้าไว (ใหญ่)', mods: { agi: 10, spd: 20 }, what: 'AGI +10 · วิ่ง +20%' },
    bp_guard_s: { id: 'bp_guard_s', kind: 'guard', size: 's', name: 'ยาเกราะกาย (เล็ก)', mods: { vit: 5, def: 10 }, what: 'VIT +5 · DEF +10' },
    bp_guard_l: { id: 'bp_guard_l', kind: 'guard', size: 'l', name: 'ยาเกราะกาย (ใหญ่)', mods: { vit: 10, def: 20 }, what: 'VIT +10 · DEF +20' },
    bp_luck_s: { id: 'bp_luck_s', kind: 'luck', size: 's', name: 'ยาสรรเสริญโชค (เล็ก)', mods: { luk: 15, critDmg: 6 }, what: 'LUK +15 · คริแรง +6%' },
    bp_luck_l: { id: 'bp_luck_l', kind: 'luck', size: 'l', name: 'ยาสรรเสริญโชค (ใหญ่)', mods: { luk: 25, critDmg: 10 }, what: 'LUK +25 · คริแรง +10%' },
    bp_cast_s: { id: 'bp_cast_s', kind: 'cast', size: 's', name: 'ยาเร่งร่าย (เล็ก)', mods: { cast: 18 }, what: 'ร่ายไว +18%' },
    bp_cast_l: { id: 'bp_cast_l', kind: 'cast', size: 'l', name: 'ยาเร่งร่าย (ใหญ่)', mods: { cast: 30 }, what: 'ร่ายไว +30%' },
  };

  const GUILD_BUFFS = [
    { id: 'gb_rally', name: 'ไฟฮึกเหิม', mods: { atk: 3, matk: 3 }, tag: 'ATK / MATK +3%' },
    { id: 'gb_stone', name: 'ใจหิน', mods: { taken: 4 }, tag: 'รับดาเมจ -4%' },
    { id: 'gb_warm', name: 'ไออุ่นกองไฟ', mods: { hpReg: 20, spReg: 20 }, tag: 'ฟื้น HP/SP +20%' },
    { id: 'gb_feet', name: 'เท้าไฟ', mods: { spd: 5 }, tag: 'เดินเร็ว +5%' },
  ];

  const PARTY_BUFFS = [
    { id: 'pt_bless', name: 'พรพระ (Blessing Lv.10)', mods: { str: 10, int: 10, dex: 10 }, tag: 'STR/INT/DEX +10' },
    { id: 'pt_agi', name: 'เร่งความเร็ว (Agi Lv.10)', mods: { agi: 10, spd: 20 }, tag: 'AGI +10 · วิ่ง +20%' },
    { id: 'pt_gloria', name: 'กลอเรีย (Gloria Lv.5)', mods: { luk: 25, critDmg: 10 }, tag: 'LUK +25 · คริแรง +10%' },
    { id: 'pt_suff', name: 'เร่งร่าย (Suffragium)', mods: { cast: 30 }, tag: 'ร่ายไว +30%' },
    { id: 'pt_bard_tempo', name: 'เพลงเร่งจังหวะ (Bard Tempo)', mods: { aspd: 15, cdr: 12 }, tag: 'ASPD +15% · CDR -12%' },
    { id: 'pt_bard_stars', name: 'เพลงหมู่ดาว (Bard Stars)', mods: { atk: 12, matk: 12, crit: 8 }, tag: 'ATK/MATK +12% · CRIT +8%' },
    { id: 'pt_tank_curse', name: 'แทงก์เจาะเกราะ (Provoke/Debuff)', mods: { targetDefRed: 20, targetDmgTaken: 12 }, tag: 'มอนเกราะ -20% · โดนแรง +12%' },
  ];

  // Exact SET_PASSIVES (all 80 outfit sets from NC.SET_PASSIVES)
  const SET_PASSIVES = {
    hv_tin: [{ t: 'shieldLow', at: 30, pct: 15, cd: 60 }],
    hv_boar: [{ t: 'charge', pct: 40 }],
    hv_bark: [{ t: 'still', taken: 10, regen: 1 }],
    hv_shell: [{ t: 'reflect', pct: 8 }],
    hv_camp: [{ t: 'nightTaken', pct: 8 }],
    lt_scout: [{ t: 'mods', spd: 10 }],
    lt_bat: [{ t: 'leech', pct: 2, night: true }],
    lt_fox: [{ t: 'mods', crit: 10, pdodge: 6 }],
    lt_bee: [{ t: 'aspd', v: 5 }, { t: 'status', st: 'poison', chance: 5 }],
    lt_crow: [],
    mg_novice: [{ t: 'mods', spReg: 20 }],
    mg_mush: [{ t: 'proc', fx: 'spores', chance: 8, mul: 0.8 }],
    mg_moth: [{ t: 'night', night: 6 }],
    mg_leaf: [{ t: 'mods', heal: 20 }],
    mg_candle: [{ t: 'mods', spCost: 30 }],
    rg_trail: [{ t: 'mods', spd: 10 }],
    rg_frog: [{ t: 'resist', el: 'water', pct: 15 }],
    rg_wolf: [{ t: 'vsRace', race: 'brute', pct: 12 }],
    rg_camp: [],
    rg_fly: [{ t: 'mods', hit: 20 }, { t: 'aspd', v: 3 }],
    hv_iron: [{ t: 'mods', taken: 10, def: 6 }],
    hv_stone: [{ t: 'mods', def: 10, taken: 8 }],
    hv_bear: [{ t: 'every', n: 4, fx: 'holyburst', mul: 1.2, heal: 3 }],
    hv_beetle: [{ t: 'raceTaken', race: 'insect', pct: 20 }],
    hv_forge: [{ t: 'mods', atk: 10 }, { t: 'resist', el: 'fire', pct: 15 }],
    lt_raccoon: [],
    lt_snake: [{ t: 'status', st: 'poison', chance: 8 }, { t: 'vsPoisoned', pct: 15 }],
    lt_shadow: [{ t: 'opener', pct: 40 }],
    lt_lizard: [{ t: 'resist', el: 'fire', pct: 20 }, { t: 'mods', pdodge: 6 }],
    lt_cat: [{ t: 'aspd', v: 6 }, { t: 'mods', crit: 6 }],
    mg_star: [{ t: 'night', night: 8 }],
    mg_ink: [{ t: 'mods', cdr: 10 }],
    mg_potion: [{ t: 'mods', hpReg: 50 }],
    mg_slime: [{ t: 'gelShield', chance: 10, pct: 5 }],
    mg_cloud: [{ t: 'mods', el_water: 20, el_wind: 20 }],
    rg_fisher: [], rg_miner: [],
    rg_herbal: [{ t: 'mods', heal: 10 }],
    rg_courier: [{ t: 'mods', spd: 16 }],
    rg_climber: [{ t: 'resist', el: 'wind', pct: 15 }, { t: 'mods', flee: 10 }],
    hv_owl: [{ t: 'night', night: 10 }],
    hv_crystal: [{ t: 'mods', mdef: 16, taken: 6 }],
    hv_ember: [{ t: 'status', st: 'burn', chance: 10 }, { t: 'resist', el: 'water', pct: 20 }],
    hv_turtle: [{ t: 'shell', at: 40, pct: 60, dur: 3, cd: 90 }],
    hv_stag: [{ t: 'killHeal', pct: 2 }],
    lt_night: [{ t: 'night', night: 12 }],
    lt_panther: [{ t: 'mods', critDmg: 40 }, { t: 'opener', pct: 20 }],
    lt_firefly: [{ t: 'vsEl', els: ['shadow'], pct: 15 }, { t: 'night', night: 5 }],
    lt_spider: [{ t: 'slowHit', chance: 10 }],
    lt_mantis: [{ t: 'mods', critDmg: 50 }],
    mg_tide: [{ t: 'mods', el_water: 10 }],
    mg_bloom: [{ t: 'mods', heal: 30 }],
    mg_rune: [{ t: 'mods', skill: 16, spCost: 16 }],
    mg_clock: [{ t: 'mods', cdr: 16 }],
    mg_frost: [{ t: 'mods', el_water: 10 }],
    rg_elk: [{ t: 'vsBig', pct: 10 }],
    rg_ranger: [{ t: 'mods', pet: 30 }],
    rg_navigator: [{ t: 'night', night: 8 }, { t: 'mods', hit: 20 }],
    rg_falcon: [{ t: 'mods', pet: 40 }],
    rg_polar: [{ t: 'resist', el: 'water', pct: 25 }],
    hv_moon: [{ t: 'mods', hpPct: 16 }, { t: 'nightRegen', pct: 0.5 }],
    hv_wyrm: [{ t: 'mods', taken: 16 }, { t: 'proc', fx: 'breath', chance: 5, mul: 1.5, st: 'burn' }],
    hv_nebula: [{ t: 'starfall', every: 8, mul: 2 }],
    hv_aurora: [{ t: 'block', every: 20 }],
    hv_guardian: [{ t: 'revive', pct: 0, cd: 300 }],
    lt_phantom: [{ t: 'mods', pdodge: 16 }],
    lt_storm: [{ t: 'every', n: 5, fx: 'lightning', mul: 1.5, st: 'shock' }],
    lt_thorn: [{ t: 'reflect', pct: 12 }],
    lt_ghostcat: [{ t: 'revive', pct: 30, cd: 540 }],
    lt_gold: [],
    mg_dream: [{ t: 'status', st: 'shock', chance: 8 }],
    mg_phoenix: [{ t: 'revive', pct: 50, cd: 600 }],
    mg_spirit: [{ t: 'mods', heal: 40, hpReg: 60 }],
    mg_void: [{ t: 'mods', skill: 24 }],
    mg_prism: [{ t: 'mods', el_fire: 16, el_water: 16, el_wind: 16, el_earth: 16, el_holy: 16, el_shadow: 16, el_poison: 16, el_ghost: 16 }],
    rg_voyager: [{ t: 'pierce', pct: 25 }],
    rg_legend: [{ t: 'vsBig', pct: 15 }],
    rg_moonwalk: [{ t: 'night', night: 10 }, { t: 'mods', spd: 10 }],
    rg_campking: [],
    rg_windwalk: [{ t: 'mods', spd: 20 }, { t: 'aspd', v: 5 }],
  };

  const BOSS_SETS_FX = {
    bat_king: { stats: { agi: 3, flee: 6 }, fx: [{ t: 'leech', pct: 3, night: true }, { t: 'every', n: 6, fx: 'bats', mul: 0.9 }] },
    mushking: { stats: { int: 4, sp: 60 }, fx: [{ t: 'proc', fx: 'spores', chance: 8, mul: 1.2 }, { t: 'mods', el_poison: 50 }] },
    ant_queen: { stats: { vit: 4, hp: 300 }, fx: [{ t: 'summon', kind: 'ant', chance: 5, dur: 10, max: 3 }, { t: 'mods', taken: 12 }] },
    crypt_lord: { stats: { int: 4, mdef: 6 }, fx: [{ t: 'status', st: 'curse', chance: 8 }] },
    lava_dragon: { stats: { str: 5, def: 4 }, fx: [{ t: 'every', n: 8, fx: 'breath', mul: 2.5, st: 'burn' }, { t: 'resist', el: 'fire', pct: 30 }] },
  };

  // =========================================================================
  // 2. SEASON 2 RUNE CALCULATOR (EXACT PORT OF wiki/calc.js)
  // =========================================================================
  function runeRolled(R, key, x, qb, qd) {
    const roll = R && R.num && R.num.roll;
    if (!roll || !(x > 0 || x < 0)) return x;
    const f = key === roll.bonus ? 1 + (qb || 0) : key === roll.bad ? 1 - (qd || 0) : null;
    if (f == null) return x;
    return (key === roll.bonus ? roll.bonusMode : roll.badMode) === 'mul' ? x * f : 1 + (x - 1) * f;
  }

  function runeEffect(R, tier, sc) {
    if (!R) return { b: 1, p: 1, x: 0, xf: 0, cd: 1, pr: 0 };
    const N = R.num || {};
    const i = Math.max(0, Math.min(2, (tier || 1) - 1));
    const v = (key) => (N[key] ? runeRolled(R, key, N[key][i], sc.qb || 0, sc.qd || 0) : undefined);
    const H = () => Math.max(1, sc.hits || 1);
    const n = Math.max(1, sc.n || 1);
    const o = { b: 1, p: 1, x: 0, xf: 0, cd: 1, pr: 0, key: R.k, el: R.el || null };
    switch (R.k) {
      case 'split':
        if (sc.splitIn) { o.p = v('k') * (sc.splitIn + N.extra[i]) / sc.splitIn; }
        else { o.p = v('k'); o.x = sc.splitAll ? N.extra[i] : Math.min(N.extra[i], n - 1); }
        break;
      case 'pierce': o.p = v('k'); break;
      case 'bounce': o.x = Math.min(N.n2[i], n - 1) * v('k') / H(); break;
      case 'echo': {
        const k = v('k'), Dd = Math.max(0, sc.dur || 0);
        const ovO = Dd > 0 ? Math.max(0, Math.min(Dd, 1.8) - 0.6) / Dd : 0;
        const ovE = Dd > 0 ? Math.min(Dd, 1.2) / Dd : 1;
        o.x = 1 - (1 - k) * (ovO + ovE);
        break;
      }
      case 'wide': o.p = v('k'); break;
      case 'focus': o.b = v('k'); break;
      case 'linger': o.xf = N.d[i] * v('k') / H(); break;
      case 'haste': o.p = v('dk'); o.cd = 1 / v('c'); o.cdScale = v('c'); break;
      case 'heavy': o.b = v('k'); o.acdScale = v('c'); break;
      case 'blood': o.b = v('k'); o.hpCost = v('hp'); break;
      case 'execute': { const at = N.at[i], k = v('k'); o.b = 1 / ((1 - at) + at / k); o.execAt = at; o.execK = k; break; }
      case 'corrode': o.xf = v('k') / H(); break;
      case 'curse': {
        const f = sc.cd != null && sc.cd < 5 ? 1 : (H() - 1) / H();
        o.b = 1 + (v('k') - 1) * f;
        o.curseK = v('k');
        break;
      }
      case 'skyfall': o.xf = N.n2[i] * v('k') / H(); break;
      case 'rush': o.b = v('k'); break;
      case 'ambush': o.b = 1 + (v('k') - 1) / H(); break;
      case 'moonrite': if (sc.night) o.b = v('k'); else o.p = v('dk'); break;
      case 'apierce': o.apierce = (N.v ? N.v[i] : 0) * (1 + (sc.qb || 0)); o.none = true; break;
      case 'wpierce': o.wpierce = (N.v ? N.v[i] : 0) * (1 + (sc.qb || 0)); o.none = true; break;
      default:
        if (N.share) {
          const s = v('share');
          const alone = N.alone == null ? 1 : N.alone;
          o.pr = n > 1 ? s : s * alone;
          o.gun = R.kind === 'gun';
        } else {
          o.none = true;
        }
    }
    return o;
  }

  function runeTotal(list, mode, meta) {
    let bonus = 0, bmul = 1, p = 1, x = 0, xf = 0, cd = 1, pr = 0, gpr = 0;
    let apierce = 0, wpierce = 0, cdScale = 1, acdScale = 1;
    for (const o of list) {
      if (!o) continue;
      bonus += (o.b || 1) - 1;
      bmul *= (o.b || 1);
      p *= (o.p || 1);
      x += (o.x || 0);
      xf += (o.xf || 0);
      cd *= (o.cd || 1);
      if (o.cdScale) cdScale *= o.cdScale;
      if (o.acdScale) acdScale *= o.acdScale;
      if (o.apierce) apierce += o.apierce;
      if (o.wpierce) wpierce += o.wpierce;
      if (o.gun) gpr += (o.pr || 0);
      else pr += (o.pr || 0);
    }
    const bucket = (meta && meta.bucket) || 0.5;
    const procCap = (meta && meta.procCap) || 0.5;
    const gunCap = meta && meta.gunCap ? Math.max(...Object.values(meta.gunCap)) : 0.4;
    if (mode === 'offline') {
      return {
        hitFactor: bmul * p,
        extraFactor: 1 + x,
        flatExtra: xf,
        cdFactor: cd,
        cdScale,
        acdScale,
        procBonus: pr + gpr,
        apierce,
        wpierce,
        cappedBonus: bonus,
        total: (bmul * p * (1 + x) + xf) * cd * (1 + pr + gpr),
      };
    }
    const cappedBonus = Math.min(bucket, bonus);
    const H = (1 + cappedBonus) * p;
    const procBonus = Math.min(procCap, pr + Math.min(gunCap, gpr));
    return {
      hitFactor: H,
      extraFactor: 1 + x,
      flatExtra: xf,
      cdFactor: cd,
      cdScale,
      acdScale,
      procBonus,
      apierce,
      wpierce,
      cappedBonus,
      rawBonus: bonus,
      isBucketCapped: bonus > bucket + 0.001,
      isProcCapped: (pr + Math.min(gunCap, gpr)) > procCap + 0.001,
      total: (H * (1 + x) + xf) * cd * (1 + procBonus),
    };
  }

  // =========================================================================
  // 3. WIKI DATA INDEXER & QUERIES
  // =========================================================================
  function parseSetBonusText(txt) {
    // Parse "HP +4% · VIT +1" / "ATK +6% · CRIT +4%" into stat mods object
    const out = {};
    if (!txt) return out;
    const str = typeof txt === 'string' ? txt : (txt.en || txt.th || '');
    const parts = str.split(/[·•,]/);
    for (const raw of parts) {
      const s = raw.trim();
      const m = s.match(/([A-Za-zก-ฮ\s]+?)\s*([+\-−])\s*(\d+(?:\.\d+)?)(%)?/);
      if (!m) continue;
      const keyRaw = m[1].trim().toLowerCase();
      const sign = m[2] === '+' ? 1 : -1;
      const val = parseFloat(m[3]) * sign;
      const pct = !!m[4];
      if (keyRaw === 'hp' || keyRaw === 'maxhp') out[pct ? 'hpPct' : 'hp'] = (out[pct ? 'hpPct' : 'hp'] || 0) + val;
      else if (keyRaw === 'sp' || keyRaw === 'maxsp') out[pct ? 'spPct' : 'sp'] = (out[pct ? 'spPct' : 'sp'] || 0) + val;
      else if (['str', 'agi', 'vit', 'int', 'dex', 'luk', 'def', 'mdef', 'hit', 'flee'].includes(keyRaw)) out[keyRaw] = (out[keyRaw] || 0) + val;
      else if (keyRaw === 'atk') out[pct ? 'atkPct' : 'atk'] = (out[pct ? 'atkPct' : 'atk'] || 0) + val;
      else if (keyRaw === 'matk') out[pct ? 'matkPct' : 'matk'] = (out[pct ? 'matkPct' : 'matk'] || 0) + val;
      else if (keyRaw.includes('crit dmg') || keyRaw.includes('คริแรง')) out.critDmg = (out.critDmg || 0) + val;
      else if (keyRaw.includes('crit') || keyRaw.includes('คริ')) out.crit = (out.crit || 0) + val;
      else if (keyRaw.includes('aspd') || keyRaw.includes('ตีเร็ว')) out.aspd = (out.aspd || 0) + val;
      else if (keyRaw.includes('cdr') || keyRaw.includes('คูลดาวน์')) out.cdr = (out.cdr || 0) + Math.abs(val);
      else if (keyRaw.includes('cast') || keyRaw.includes('ร่าย')) out.cast = (out.cast || 0) + Math.abs(val);
      else if (keyRaw.includes('skill') || keyRaw.includes('สกิล')) out.skill = (out.skill || 0) + val;
      else if (keyRaw.includes('spd') || keyRaw.includes('speed') || keyRaw.includes('เดิน')) out.spd = (out.spd || 0) + val;
      else if (keyRaw.includes('heal') || keyRaw.includes('ฮีล')) out.heal = (out.heal || 0) + val;
    }
    return out;
  }

  function createIndex(wiki) {
    const idx = {
      wiki,
      meta: wiki.meta || { bucket: 0.5, procCap: 0.5, gunCap: { pistol: 0.4, shotgun: 0.4 } },
      jobsById: Object.create(null),
      skillsById: Object.create(null),
      skillsByJob: Object.create(null),
      runesByKey: Object.create(null),
      cardsById: Object.create(null),
      itemsById: Object.create(null),
      itemsBySlot: Object.create(null),
      setsById: Object.create(null),
      bsetsById: Object.create(null),
      bsetByItemId: Object.create(null),
      monsById: Object.create(null),
      bosses: [],
      dishesById: Object.create(null),
      itemSetId: Object.create(null),
    };

    for (const j of (wiki.jobs || [])) idx.jobsById[j.id] = j;
    for (const s of (wiki.skills || [])) {
      idx.skillsById[s.id] = s;
      if (!idx.skillsByJob[s.job]) idx.skillsByJob[s.job] = [];
      idx.skillsByJob[s.job].push(s);
    }
    for (const r of (wiki.runes || [])) idx.runesByKey[r.k] = r;
    for (const c of (wiki.cards || [])) idx.cardsById[c.id] = c;
    for (const it of ((wiki.equip && wiki.equip.items) || [])) {
      idx.itemsById[it.id] = it;
      const sl = it.s || 'other';
      if (!idx.itemsBySlot[sl]) idx.itemsBySlot[sl] = [];
      idx.itemsBySlot[sl].push(it);
    }
    for (const st of ((wiki.equip && wiki.equip.sets) || [])) {
      st._b2Mods = parseSetBonusText(st.b2);
      st._b3Mods = parseSetBonusText(st.b3);
      idx.setsById[st.id] = st;
      for (const pid of (st.pcs || [])) idx.itemSetId[pid] = st.id;
    }
    for (const bs of ((wiki.equip && wiki.equip.bsets) || [])) {
      idx.bsetsById[bs.boss] = bs;
      if (bs.hat) idx.bsetByItemId[bs.hat] = bs.boss;
      if (bs.acc) idx.bsetByItemId[bs.acc] = bs.boss;
      for (const wid of (bs.w || [])) idx.bsetByItemId[wid] = bs.boss;
    }
    for (const m of (wiki.monsters || [])) {
      idx.monsById[m.id] = m;
      if (m.boss) idx.bosses.push(m);
    }
    idx.bosses.sort((a, b) => (a.lv || 0) - (b.lv || 0));
    for (const d of ((wiki.life && wiki.life.dishes) || [])) idx.dishesById[d.id] = d;

    return idx;
  }

  function getJobLineage(idx, jobId) {
    const chain = [];
    const seen = new Set();
    let cur = jobId || 'traveler';
    while (cur && !seen.has(cur) && idx.jobsById[cur]) {
      seen.add(cur);
      chain.unshift(cur);
      cur = idx.jobsById[cur].from || '';
    }
    if (!chain.length) chain.push('traveler');
    return chain;
  }

  function getJobSkills(idx, jobId) {
    const lineage = getJobLineage(idx, jobId);
    const list = [];
    const seen = new Set();
    for (const jid of lineage) {
      for (const sk of (idx.skillsByJob[jid] || [])) {
        if (!seen.has(sk.id)) {
          seen.add(sk.id);
          list.push(sk);
        }
      }
    }
    return list;
  }

  // =========================================================================
  // 4. BUILD MODEL & DEFAULTS
  // =========================================================================
  function createDefaultBuild(idx, jobId = 'puppeteer', opts = {}) {
    const jid = idx.jobsById[jobId] ? jobId : 'puppeteer';
    const lv = Math.max(1, Math.min(LV_MAX, opts.lv || 60));
    const jmeta = JOBS_HPSP[jid] || [5.5, 4, 50];
    const jobLv = Math.max(1, Math.min(jmeta[2], opts.jobLv || Math.min(35, jmeta[2])));

    // Smart stat distribution by class archetype
    const allowedW = JOB_WEAPONS[jid] || ['sword'];
    const primaryW = allowedW[0];
    const wMeta = WTYPES_META[primaryW] || {};
    const isMagic = !!wMeta.magic;
    const isRanged = !!wMeta.ranged;
    const isTank = ['knight', 'paladin', 'dawnwarden', 'dragonknight', 'dragonbound', 'berserker', 'bloodmoon'].includes(jid);

    const base = { str: 5, agi: 5, vit: 5, int: 5, dex: 5, luk: 5 };
    const weights = isMagic
      ? { int: 0.55, dex: 0.25, vit: 0.15, agi: 0.05 }
      : isRanged
        ? { dex: 0.45, agi: 0.25, luk: 0.15, vit: 0.15 }
        : isTank
          ? { str: 0.35, vit: 0.40, dex: 0.15, agi: 0.10 }
          : { str: 0.42, agi: 0.25, dex: 0.18, vit: 0.10, luk: 0.05 };
    let pts = statusPointsAt(lv);
    let guard = 0;
    while (pts >= 2 && guard++ < 500) {
      let bestK = null, bestScore = -1;
      for (const k of STAT_KEYS) {
        const w = weights[k] || 0;
        if (w <= 0 || base[k] >= STAT_MAX) continue;
        const c = statCost(base[k]);
        if (c > pts) continue;
        const target = Math.min(STAT_MAX, 5 + Math.round(lv * w * 1.45));
        const deficit = target - base[k];
        if (deficit > bestScore) { bestScore = deficit; bestK = k; }
      }
      if (!bestK) break;
      pts -= statCost(base[bestK]);
      base[bestK]++;
    }

    // Auto-pick best level-appropriate weapon + set for default preview
    const equip = {};
    for (const s of EQUIP_SLOTS) equip[s] = null;
    const candWeapons = (idx.itemsBySlot.weapon || [])
      .filter(it => allowedW.includes(it.wt) && (it.lv || 1) <= lv)
      .sort((a, b) => ((b.atk || 0) + ((b.st && b.st.matk) || 0) + (b.lv || 0) * 2) - ((a.atk || 0) + ((a.st && a.st.matk) || 0) + (a.lv || 0) * 2));
    if (candWeapons[0]) equip.weapon = { id: candWeapons[0].id, ref: 5, g: 2, rows: [] };

    const wantLine = isMagic ? 'mg' : isTank ? 'hv' : isRanged ? 'rg' : 'lt';
    const candSets = (idx.wiki.equip.sets || [])
      .filter(s => s.line === wantLine && (s.lv || 1) <= lv)
      .sort((a, b) => (b.lv || 0) - (a.lv || 0));
    if (candSets[0]) {
      for (const pid of candSets[0].pcs) {
        const it = idx.itemsById[pid];
        if (!it) continue;
        if (it.s === 'top') equip.top = { id: pid, ref: 4, g: 1, rows: [] };
        else if (it.s === 'pants') equip.pants = { id: pid, ref: 4, g: 1, rows: [] };
        else if (it.s === 'acc') equip.acc1 = { id: pid, ref: 4, g: 1, rows: [] };
      }
    }
    if (JOB_SHIELD_SET.has(jid)) {
      const sh = (idx.itemsBySlot.shield || []).filter(i => (i.lv || 1) <= lv).sort((a, b) => (b.lv || 0) - (a.lv || 0))[0];
      if (sh) equip.shield = { id: sh.id, ref: 4, g: 1, rows: [] };
    }
    const hat = (idx.itemsBySlot.hat || []).filter(i => (i.lv || 1) <= lv).sort((a, b) => (b.lv || 0) - (a.lv || 0))[0];
    if (hat) equip.hat = { id: hat.id, ref: 4, g: 1, rows: [] };

    // Auto-select top active skills & passives
    const jobSkills = getJobSkills(idx, jid);
    const skills = {};
    const rotation = [];
    const hotbar = { q: null, e: null, r: null, f: null, '3': null, '4': null, '5': null, '6': null };
    const hbKeys = ['q', 'e', 'r', 'f', '3', '4', '5', '6'];
    const atkSkills = jobSkills.filter(s => s.type !== 'passive' && s.type !== 'buff' && s.type !== 'heal' && (s.mul || 0) > 0)
      .sort((a, b) => ((b.job === jid ? 1000 : 0) + (b.mul || 0) * (b.hits || 1)) - ((a.job === jid ? 1000 : 0) + (a.mul || 0) * (a.hits || 1)));
    let hbi = 0;
    for (const sk of atkSkills.slice(0, 6)) {
      skills[sk.id] = sk.max || 10;
      if (hbi < 4) rotation.push(sk.id);
      if (hbi < hbKeys.length) hotbar[hbKeys[hbi++]] = sk.id;
    }
    for (const sk of jobSkills.filter(s => s.type === 'passive')) {
      skills[sk.id] = sk.max || 10;
    }

    return {
      id: opts.id || ('build_' + Date.now().toString(36)),
      name: opts.name || `${(idx.jobsById[jid] && idx.jobsById[jid].n && idx.jobsById[jid].n.th) || jid} Lv.${lv}`,
      job: jid,
      lv,
      jobLv,
      sandboxStats: false,
      base,
      equip,
      skills,
      rotation,
      hotbar,
      runes: {},        // { [skillId]: [ { k, tier, qb, qd }, { k, tier, qb, qd } ] }
      basicRunes: [null, null],
      cards: {
        pas: [null, null, null], // each: { id, lv } or null
        act: [null, null],       // each: { id, lv } or null
      },
      buffs: {
        pots: [],     // ['bp_bless_l', 'bp_swift_l', ...]
        dish: null,   // 'fd_carrot_stew'
        guild: [],    // ['gb_rally']
        party: [],    // ['pt_bless']
      },
      hpPct: 100,
    };
  }

  function normalizeSlotGear(g) {
    if (!g) return null;
    if (typeof g === 'string') return { id: g, ref: 0, g: 0, rows: [] };
    if (!g.id) return null;
    return {
      id: String(g.id),
      ref: Math.max(0, Math.min(10, Number(g.ref) || 0)),
      g: Math.max(0, Math.min(5, Number(g.g) || 0)),
      rows: Array.isArray(g.rows) ? g.rows.filter(r => r && r.k).map(r => ({
        k: String(r.k),
        v: Number(r.v) || 0,
        tier: Math.max(0, Math.min(2, Number(r.tier) || 0)),
        sub: r.sub ? String(r.sub) : undefined,
      })) : [],
    };
  }

  function normalizeRuneSlot(r) {
    if (!r) return null;
    if (typeof r === 'string') {
      const parts = r.split(':');
      if (!parts[0]) return null;
      return {
        k: parts[0],
        tier: Math.max(1, Math.min(3, Number(parts[1]) || 1)),
        qb: Number(parts[2]) || 0,
        qd: Number(parts[3]) || 0,
      };
    }
    if (!r.k) return null;
    return {
      k: String(r.k),
      tier: Math.max(1, Math.min(3, Number(r.tier) || 1)),
      qb: Math.max(-0.25, Math.min(0.25, Number(r.qb) || 0)),
      qd: Math.max(-0.25, Math.min(0.25, Number(r.qd) || 0)),
    };
  }

  function normalizeCardSlot(c) {
    if (!c) return null;
    if (typeof c === 'string') return { id: c, lv: 1 };
    if (!c.id) return null;
    return { id: String(c.id), lv: Math.max(1, Math.min(10, Number(c.lv) || 1)) };
  }

  function normalizeBuild(idx, raw) {
    const def = createDefaultBuild(idx, (raw && raw.job) || 'puppeteer', { lv: (raw && raw.lv) || 60 });
    if (!raw || typeof raw !== 'object') return def;
    const b = {
      id: raw.id || def.id,
      name: raw.name || def.name,
      job: idx.jobsById[raw.job] ? raw.job : def.job,
      lv: Math.max(1, Math.min(LV_MAX, Number(raw.lv) || def.lv)),
      jobLv: Math.max(1, Math.min(JOB_MAX, Number(raw.jobLv) || def.jobLv)),
      sandboxStats: !!raw.sandboxStats,
      base: Object.assign({}, START_STATS),
      equip: {},
      skills: Object.assign({}, raw.skills || def.skills),
      rotation: Array.isArray(raw.rotation) ? raw.rotation.filter(id => idx.skillsById[id]) : def.rotation,
      hotbar: Object.assign({ q: null, e: null, r: null, f: null, '3': null, '4': null, '5': null, '6': null }, raw.hotbar || def.hotbar),
      runes: {},
      basicRunes: [null, null],
      cards: { pas: [null, null, null], act: [null, null] },
      buffs: {
        pots: Array.isArray(raw.buffs && raw.buffs.pots) ? raw.buffs.pots.slice() : [],
        dish: (raw.buffs && raw.buffs.dish) || null,
        guild: Array.isArray(raw.buffs && raw.buffs.guild) ? raw.buffs.guild.slice() : [],
        party: Array.isArray(raw.buffs && raw.buffs.party) ? raw.buffs.party.slice() : [],
      },
      hpPct: Math.max(1, Math.min(100, Number(raw.hpPct != null ? raw.hpPct : 100))),
    };
    for (const k of STAT_KEYS) {
      b.base[k] = Math.max(1, Math.min(b.sandboxStats ? 250 : STAT_MAX, Number(raw.base && raw.base[k]) || START_STATS[k]));
    }
    for (const s of EQUIP_SLOTS) {
      const slotRaw = raw.equip && raw.equip[s] !== undefined ? raw.equip[s] : null;
      b.equip[s] = normalizeSlotGear(slotRaw);
    }
    if (raw.runes && typeof raw.runes === 'object') {
      for (const [sid, arr] of Object.entries(raw.runes)) {
        if (!Array.isArray(arr)) continue;
        b.runes[sid] = [normalizeRuneSlot(arr[0]), normalizeRuneSlot(arr[1])];
      }
    }
    if (Array.isArray(raw.basicRunes)) {
      b.basicRunes = [normalizeRuneSlot(raw.basicRunes[0]), normalizeRuneSlot(raw.basicRunes[1])];
    }
    if (raw.cards) {
      for (let i = 0; i < 3; i++) b.cards.pas[i] = normalizeCardSlot(raw.cards.pas && raw.cards.pas[i]);
      for (let i = 0; i < 2; i++) b.cards.act[i] = normalizeCardSlot(raw.cards.act && raw.cards.act[i]);
    }
    return b;
  }

  // =========================================================================
  // 5. EXACT STAT DERIVATION (CALIBRATED AGAINST LIVE NIGHTCAMP ENGINE)
  // =========================================================================
  function getItemRefineGrade(item) {
    if (!item) return 1;
    if (item.g >= 1 && item.g <= 4) return item.g;
    const ri = RARITY_INFO[item.r];
    return ri ? ri.g : 1;
  }

  function calcRefineBonus(item, ref) {
    const r = Math.max(0, Math.min(10, ref | 0));
    if (!item || r <= 0) return { atk: 0, matk: 0, def: 0, mdef: 0, hp: 0 };
    const g = getItemRefineGrade(item);
    const over = Math.max(0, r - 6);
    if (item.s === 'weapon') {
      const wMeta = WTYPES_META[item.wt] || {};
      const flat = Math.round(r * (2 + g * 1.5) + over * (3 + g * 2));
      return {
        atk: wMeta.magic ? Math.round(flat * 0.5) : flat,
        matk: wMeta.magic ? flat : Math.round(flat * 0.35),
        def: 0, mdef: 0, hp: 0,
      };
    }
    const defAdd = Math.round(r * (0.8 + g * 0.45) + over * (1 + g * 0.5));
    const mdefAdd = Math.round(r * (0.4 + g * 0.25) + over * 0.5);
    const hpAdd = over > 0 ? over * 20 * g : 0;
    return { atk: 0, matk: 0, def: defAdd, mdef: mdefAdd, hp: hpAdd };
  }

  function applyModBag(bag, m) {
    if (!m || typeof m !== 'object') return;
    for (const [k, rawV] of Object.entries(m)) {
      const v = Number(rawV) || 0;
      if (!v) continue;
      if (k.startsWith('el_')) {
        const el = k.slice(3);
        bag.elDmg[el] = (bag.elDmg[el] || 0) + v;
      } else if (k.startsWith('rel_')) {
        const el = k.slice(4);
        bag.resist[el] = Math.min(75, (bag.resist[el] || 0) + v);
      } else if (k.startsWith('vsEl_')) {
        const el = k.slice(5);
        bag.vsEl[el] = (bag.vsEl[el] || 0) + v;
      } else if (k.startsWith('vsRace_')) {
        const rc = k.slice(7);
        bag.vsRace[rc] = (bag.vsRace[rc] || 0) + v;
      } else if (k.startsWith('sk_')) {
        const sid = k.slice(3);
        bag.skillBonus[sid] = (bag.skillBonus[sid] || 0) + v;
      } else {
        bag[k] = (bag[k] || 0) + v;
      }
    }
  }

  function applyCardEffect(bag, eff, cardLv, card) {
    if (!eff || !eff.key) return;
    // Card Lv.1..10 scales passive effect smoothly (+6% per level above 1 -> 1.54x at Lv.10)
    const lvScale = 1 + (Math.max(1, cardLv || 1) - 1) * 0.06;
    const rawVal = Number(eff.val) || 0;
    const val = Math.round(rawVal * lvScale * 10) / 10;
    const sub = eff.sub ? String(eff.sub).toLowerCase() : '';

    if (eff.kind === 'A') {
      switch (eff.key) {
        case 'amp':
          if (sub && ELEMENTS.includes(sub)) bag.elDmg[sub] = (bag.elDmg[sub] || 0) + val;
          else bag.skill = (bag.skill || 0) + val;
          break;
        case 'critd': case 'critDmg': case 'cdmg': bag.critDmg = (bag.critDmg || 0) + val; break;
        case 'dbl': bag.dbl = (bag.dbl || 0) + val; break;
        case 'boss': bag.bossDmg = (bag.bossDmg || 0) + val; break;
        case 'cast': bag.cast = (bag.cast || 0) + val; break;
        case 'cdr': bag.cdr = (bag.cdr || 0) + val; break;
        case 'sp': bag.spCost = (bag.spCost || 0) + val; break;
        case 'hp': bag.hpPct = (bag.hpPct || 0) + val; break;
        case 'leech': bag.leech = (bag.leech || 0) + val; break;
        case 'res': if (sub) bag.resist[sub] = (bag.resist[sub] || 0) + val; break;
        case 'react': bag.skill = (bag.skill || 0) + val * 0.4; break;
        case 'area': break;
        case 'atk': bag.atkPct = (bag.atkPct || 0) + val; break;
        case 'matk': bag.matkPct = (bag.matkPct || 0) + val; break;
        case 'crit': bag.crit = (bag.crit || 0) + val; break;
        case 'aspd': bag.aspd = (bag.aspd || 0) + val; break;
        case 'pen': bag.pen = (bag.pen || 0) + val; break;
        case 'mpen': bag.mpen = (bag.mpen || 0) + val; break;
        default:
          if (eff.txt && eff.txt[0]) applyModBag(bag, parseSetBonusText(eff.txt[0].en || eff.txt[0].th));
      }
      return;
    }

    // kind === 'P' (Triggered Proc on hit/skill/dash/first/kill/hurt/crowd/low)
    const trigChanceMap = { hit: 12, far: 12, skill: 22, dash: 10, first: 6, kill: 5, hurt: 10, crowd: 15, low: 15 };
    const trigCh = trigChanceMap[eff.trig] || 10;
    const uptimeK = Math.min(0.65, trigCh / 28);
    switch (eff.key) {
      case 'dmg':
      case 'burst':
      case 'spirit':
        bag.procs.push({
          fx: `card_${eff.key}`,
          label: (card && card.mon && card.mon.th) || eff.key,
          chance: trigCh,
          mul: Math.max(0.25, Math.min(2.5, val / 100)),
          el: (card && card.el) || 'neutral',
        });
        break;
      case 'vuln':
        bag.targetDmgTaken = (bag.targetDmgTaken || 0) + Math.round(val * uptimeK * 10) / 10;
        break;
      case 'haste':
        bag.aspd = (bag.aspd || 0) + Math.round(val * uptimeK * 10) / 10;
        break;
      case 'guard':
        bag.taken = (bag.taken || 0) + Math.round(val * uptimeK * 10) / 10;
        break;
      case 'heal':
        bag.hpReg = (bag.hpReg || 0) + Math.round(val * uptimeK * 15);
        break;
      case 'status':
        // Minor DoT proc contribution
        bag.procs.push({ fx: `status_${sub || 'burn'}`, chance: trigCh, mul: 0.35, el: sub === 'poison' ? 'poison' : 'fire' });
        break;
    }
  }

  function calcBuildStats(idx, rawBuild, env = {}) {
    const b = normalizeBuild(idx, rawBuild);
    const night = !!env.night;
    const hpPct = b.hpPct != null ? b.hpPct : 100;
    const jmeta = JOBS_HPSP[b.job] || [5.5, 4, 50];
    const warnings = [];

    const bonus = {
      str: 0, agi: 0, vit: 0, int: 0, dex: 0, luk: 0,
      hp: 0, sp: 0, hpPct: 0, spPct: 0,
      atk: 0, matk: 0, atkPct: 0, matkPct: 0,
      def: 0, mdef: 0, hit: 0, flee: 0, pdodge: 0,
      crit: 0, critDmg: 0, aspd: 0, spd: 0,
      cast: 0, cdr: 0, acd: 0, spCost: 0,
      skill: 0, allDmg: 0, pen: 0, mpen: 0, bossDmg: 0, lowDmg: 0,
      leech: 0, taken: 0, heal: 0, hpReg: 0, spReg: 0,
      pet: 0, dbl: 0, vsBig: 0, targetDefRed: 0, targetDmgTaken: 0,
      elDmg: {}, vsEl: {}, vsRace: {}, resist: {}, skillBonus: {},
      procs: [], everyProcs: [],
    };

    // 1. Equipment Base Stats + Refine + Grade G5 Night + Gear Options
    let weaponItem = null;
    let wMeta = { aspd: 1.0, style: 'swing', hitK: 1.0 };
    let weaponAtkBase = 0;
    let weaponMatkBase = 0;
    let atkElement = 'neutral';
    let armorElement = 'neutral';
    let g5Count = 0;
    const setCounts = Object.create(null);
    const bsetCounts = Object.create(null);
    const allowedWeapons = JOB_WEAPONS[b.job] || [];

    for (const slot of EQUIP_SLOTS) {
      const g = b.equip[slot];
      if (!g || !g.id) continue;
      const it = idx.itemsById[g.id];
      if (!it) { warnings.push(`ไม่พบไอเทม ${g.id} ในช่อง ${slot}`); continue; }
      if (it.lv && it.lv > b.lv) warnings.push(`${(it.n && it.n.th) || it.id} ต้องการ Lv.${it.lv} (ตัวละคร Lv.${b.lv})`);
      if (slot === 'weapon') {
        weaponItem = it;
        if (it.wt && WTYPES_META[it.wt]) wMeta = WTYPES_META[it.wt];
        if (it.wt && allowedWeapons.length && !allowedWeapons.includes(it.wt)) {
          warnings.push(`อาชีพนี้ปกติไม่ได้ถืออาวุธประเภท ${it.wt}`);
        }
        weaponAtkBase = it.atk || 0;
        if (it.el) atkElement = it.el;
        if (wMeta.magic) weaponMatkBase = Math.round((it.atk || 0) * 1.15);
        if (it.wsk && typeof it.wsk === 'object') {
          for (const [sid, pct] of Object.entries(it.wsk)) {
            bonus.skillBonus[sid] = (bonus.skillBonus[sid] || 0) + (Number(pct) || 0);
          }
        }
      }
      if (slot === 'shield' && !JOB_SHIELD_SET.has(b.job)) {
        warnings.push(`อาชีพนี้ปกติไม่ได้ถือโล่`);
      }
      if (slot === 'top' && it.el) armorElement = it.el;

      // Item static stats (`it.st`)
      if (it.st) {
        for (const [sk, sv] of Object.entries(it.st)) {
          const v = Number(sv) || 0;
          if (!v) continue;
          if (sk === 'skill') bonus.skill += v <= 2 ? v * 100 : v;
          else if (sk === 'atk') bonus.atk += v;
          else if (sk === 'matk') bonus.matk += v;
          else if (sk === 'hpPct') bonus.hpPct += v;
          else if (sk === 'spPct') bonus.spPct += v;
          else if (sk in bonus && typeof bonus[sk] === 'number') bonus[sk] += v;
        }
      }

      // Refine bonus
      const rb = calcRefineBonus(it, g.ref);
      weaponAtkBase += slot === 'weapon' ? rb.atk : 0;
      weaponMatkBase += slot === 'weapon' ? rb.matk : 0;
      bonus.def += rb.def;
      bonus.mdef += rb.mdef;
      bonus.hp += rb.hp;

      // Grade G5 Night bonus (+4% damage & +3% guard at night per G5 piece)
      if (g.g >= 5) {
        g5Count++;
        if (night) { bonus.allDmg += 4; bonus.taken += 2; }
      }

      // Gear Option rows
      for (const row of (g.rows || [])) {
        const rv = Number(row.v) || 0;
        if (!rv) continue;
        switch (row.k) {
          case 'atk': bonus.atkPct += rv; break;
          case 'matk': bonus.matkPct += rv; break;
          case 'crit': bonus.crit += rv; break;
          case 'critDmg': bonus.critDmg += rv; break;
          case 'aspd': case 'aspdAcc': bonus.aspd += rv; break;
          case 'pen': bonus.pen += rv; break;
          case 'mpen': bonus.mpen += rv; break;
          case 'boss': bonus.bossDmg += rv; break;
          case 'leech': bonus.leech += rv; break;
          case 'acd': bonus.acd += rv; break;
          case 'cast': bonus.cast += rv; break;
          case 'cdr': bonus.cdr += rv; break;
          case 'spCost': bonus.spCost += rv; break;
          case 'lowDmg': bonus.lowDmg += rv; break;
          case 'hit': bonus.hit += rv; break;
          case 'flee': bonus.flee += rv; break;
          case 'pdodge': bonus.pdodge += rv; break;
          case 'hpPct': bonus.hpPct += rv; break;
          case 'spPct': bonus.spPct += rv; break;
          case 'hpReg': bonus.hpReg += rv; break;
          case 'spReg': bonus.spReg += rv; break;
          case 'heal': bonus.heal += rv; break;
          case 'spd': bonus.spd += rv; break;
          case 'resBoss': bonus.taken += rv * 0.5; break;
          case 'stat': if (row.sub && STAT_KEYS.includes(row.sub)) bonus[row.sub] += rv; break;
          case 'elDmg': if (row.sub) bonus.elDmg[row.sub] = (bonus.elDmg[row.sub] || 0) + rv; break;
          case 'race': if (row.sub) bonus.vsRace[row.sub] = (bonus.vsRace[row.sub] || 0) + rv; break;
          case 'el': if (row.sub) bonus.vsEl[row.sub] = (bonus.vsEl[row.sub] || 0) + rv; break;
          case 'resEl': if (row.sub) bonus.resist[row.sub] = (bonus.resist[row.sub] || 0) + rv; break;
          case 'skill': if (row.sub) bonus.skillBonus[row.sub] = (bonus.skillBonus[row.sub] || 0) + rv; break;
          case 'proc': bonus.procs.push({ fx: row.sub || 'lightning', chance: rv, mul: 1.0 }); break;
        }
      }

      // Count Outfit Sets & Boss Sets (dedupe identical item IDs for 3pc check)
      const sid = idx.itemSetId[it.id];
      if (sid) {
        if (!setCounts[sid]) setCounts[sid] = new Set();
        setCounts[sid].add(it.id);
      }
      const bsid = idx.bsetByItemId[it.id];
      if (bsid) {
        if (!bsetCounts[bsid]) bsetCounts[bsid] = new Set();
        const role = it.s === 'weapon' ? 'w' : it.s;
        bsetCounts[bsid].add(role);
      }
    }

    // 2. Active Outfit Sets (2pc & 3pc + Passive!)
    const activeSets = [];
    for (const [sid, pieceSet] of Object.entries(setCounts)) {
      const cnt = pieceSet.size;
      const st = idx.setsById[sid];
      if (!st || cnt < 2) continue;
      activeSets.push({ id: sid, name: st.n && st.n.th, count: cnt, has3pc: cnt >= 3, pasText: st.pas && st.pas.th });
      applyModBag(bonus, st._b2Mods);
      if (cnt >= 3) {
        applyModBag(bonus, st._b3Mods);
        const fxList = SET_PASSIVES[sid] || [];
        for (const fx of fxList) {
          if (fx.t === 'mods') applyModBag(bonus, fx);
          else if (fx.t === 'aspd') bonus.aspd += fx.v || 0;
          else if (fx.t === 'night' && night) bonus.allDmg += fx.night || 0;
          else if (fx.t === 'nightTaken' && night) bonus.taken += fx.pct || 0;
          else if (fx.t === 'leech' && (!fx.night || night)) bonus.leech += fx.pct || 0;
          else if (fx.t === 'vsRace') bonus.vsRace[fx.race] = (bonus.vsRace[fx.race] || 0) + (fx.pct || 0);
          else if (fx.t === 'vsEl') for (const el of (fx.els || [])) bonus.vsEl[el] = (bonus.vsEl[el] || 0) + (fx.pct || 0);
          else if (fx.t === 'vsBig') bonus.vsBig += fx.pct || 0;
          else if (fx.t === 'resist') bonus.resist[fx.el] = (bonus.resist[fx.el] || 0) + (fx.pct || 0);
          else if (fx.t === 'proc') bonus.procs.push(fx);
          else if (fx.t === 'every') bonus.everyProcs.push(fx);
          else if (fx.t === 'starfall') bonus.procs.push({ fx: 'starfall', every: fx.every, mul: fx.mul });
        }
      }
    }

    // 3. Active Boss Sets (2+ roles of hat / acc / weapon)
    const activeBossSets = [];
    for (const [bsid, roleSet] of Object.entries(bsetCounts)) {
      if (roleSet.size < 2) continue;
      const bs = idx.bsetsById[bsid];
      const bfx = BOSS_SETS_FX[bsid];
      activeBossSets.push({ id: bsid, name: bs && bs.n && bs.n.th, count: roleSet.size, text: bs && bs.text && bs.text.th });
      if (bfx) {
        applyModBag(bonus, bfx.stats);
        for (const fx of (bfx.fx || [])) {
          if (fx.t === 'mods') applyModBag(bonus, fx);
          else if (fx.t === 'leech' && (!fx.night || night)) bonus.leech += fx.pct || 0;
          else if (fx.t === 'resist') bonus.resist[fx.el] = (bonus.resist[fx.el] || 0) + (fx.pct || 0);
          else if (fx.t === 'proc') bonus.procs.push(fx);
          else if (fx.t === 'every') bonus.everyProcs.push(fx);
        }
      }
    }

    // 4. Passive Skills (Universal + Job-Specific)
    for (const [sid, slvRaw] of Object.entries(b.skills || {})) {
      const slv = Math.max(0, Number(slvRaw) || 0);
      if (slv <= 0) continue;
      const sk = idx.skillsById[sid];
      if (!sk || sk.type !== 'passive') continue;
      // Known core passives
      if (sid === 'mastery') { bonus.atk += slv * 3; bonus.matk += slv * 3; }
      else if (sid === 'body') { bonus.hpPct += slv * 2; bonus.def += slv; }
      else if (sid === 'mind') { bonus.spPct += slv * 3; bonus.spReg += slv * 4; }
      else if (sid === 'ro_double') { bonus.dbl += Math.min(50, slv * 5); }
      else if (sid === 'ro_dagger' || sid === 'kn_sword' || sid === 'kn_spear' || sid === 'pr_macemastery' || sid === 'ar_owl') {
        bonus.atk += slv * 4; bonus.hit += slv * 2;
      } else if (sid === 'mg_stormheart' || sid === 'mg_increase' || sid === 'am_arcaneflux') {
        bonus.matkPct += slv * 2; bonus.cast += slv * 1.5;
      } else if (sid === 'pp_strings' || sid === 'pp_edge' || sid === 'pp_soulstring') {
        bonus.atkPct += slv * 1.8; bonus.skill += slv * 2;
      } else if (sid === 'pal_faith' || sid === 'kn_ironskin') {
        bonus.hpPct += slv * 2.5; bonus.def += slv * 2;
      } else if (sid === 'as_katar' || sid === 'ro_vital') {
        bonus.crit += slv * 2; bonus.critDmg += slv * 3;
      } else {
        // Generic passive contribution parsed from English description
        const desc = (sk.d && (sk.d.en || sk.d.th)) || '';
        if (/ATK/i.test(desc)) bonus.atkPct += slv * 1.2;
        if (/MATK|magic/i.test(desc)) bonus.matkPct += slv * 1.2;
        if (/CRIT/i.test(desc)) bonus.crit += slv * 1.2;
        if (/HP/i.test(desc)) bonus.hpPct += slv * 1.5;
        if (/DEF/i.test(desc)) bonus.def += slv * 1.2;
        if (/ASPD|speed/i.test(desc)) bonus.aspd += slv * 1.0;
        if (/cooldown|CD/i.test(desc)) bonus.cdr += slv * 0.8;
      }
    }

    // 5. Monster Art Cards (3 Passive slots + pairFam / pairEl check on 2 Active slots)
    const usedPasIds = new Set();
    for (const cSlot of (b.cards.pas || [])) {
      if (!cSlot || !cSlot.id || usedPasIds.has(cSlot.id)) continue;
      usedPasIds.add(cSlot.id);
      const card = idx.cardsById[cSlot.id];
      if (!card) continue;
      for (const eff of (card.eff || [])) applyCardEffect(bonus, eff, cSlot.lv, card);
    }
    const act0 = b.cards.act[0] && idx.cardsById[b.cards.act[0].id];
    const act1 = b.cards.act[1] && idx.cardsById[b.cards.act[1].id];
    const cardPairFam = !!(act0 && act1 && act0.race && act0.race === act1.race);
    const cardPairEl = !!(act0 && act1 && act0.el && act0.el === act1.el);

    // 6. Buff Potions, Food Dish, Guild Buffs, Party Buffs (BuffPot doesn't stack with matching Party Buff!)
    const activePartySet = new Set(b.buffs.party || []);
    const activePotKinds = new Set();
    for (const pid of (b.buffs.pots || [])) {
      const bp = BUFFPOTS[pid];
      if (!bp || activePotKinds.has(bp.kind)) continue;
      // Don't double-stack with Priest party buffs of the same kind
      if (bp.kind === 'bless' && activePartySet.has('pt_bless')) continue;
      if (bp.kind === 'swift' && activePartySet.has('pt_agi')) continue;
      if (bp.kind === 'luck' && activePartySet.has('pt_gloria')) continue;
      if (bp.kind === 'cast' && activePartySet.has('pt_suff')) continue;
      activePotKinds.add(bp.kind);
      applyModBag(bonus, bp.mods);
    }
    if (b.buffs.dish && idx.dishesById[b.buffs.dish]) {
      const dish = idx.dishesById[b.buffs.dish];
      if (dish.buff) {
        for (const [dk, dv] of Object.entries(dish.buff)) {
          if (dk === 'atk') bonus.atk += dv;
          else if (dk === 'matk') bonus.matk += dv;
          else if (dk === 'hp') bonus.hp += dv;
          else if (dk === 'sp') bonus.sp += dv;
          else if (dk === 'crit') bonus.crit += dv;
          else if (dk === 'aspd') bonus.aspd += dv;
          else if (dk in bonus && typeof bonus[dk] === 'number') bonus[dk] += dv;
        }
      }
    }
    for (const gid of (b.buffs.guild || [])) {
      const gb = GUILD_BUFFS.find(x => x.id === gid);
      if (gb) applyModBag(bonus, gb.mods);
    }
    for (const pid of (b.buffs.party || [])) {
      const pb = PARTY_BUFFS.find(x => x.id === pid);
      if (pb) applyModBag(bonus, pb.mods);
    }

    // 7. Apply Caps & Final Derived Stats (Exact Nightcamp Formulas!)
    const str = Math.round(b.base.str + bonus.str);
    const agi = Math.round(b.base.agi + bonus.agi);
    const vit = Math.round(b.base.vit + bonus.vit);
    const intS = Math.round(b.base.int + bonus.int);
    const dex = Math.round(b.base.dex + bonus.dex);
    const luk = Math.round(b.base.luk + bonus.luk);

    // Low-HP bonus applies dynamically based on hpPct
    const lowMult = hpPct <= 35 ? Math.min(30, bonus.lowDmg) : 0;

    // Exact BATK (Melee vs Ranged)
    const isRanged = !!wMeta.ranged;
    const isMagic = !!wMeta.magic;
    const batkRaw = isRanged
      ? (dex + Math.pow(Math.floor(dex / 10), 2) + Math.floor(str / 5) + Math.floor(luk / 5))
      : (str + Math.pow(Math.floor(str / 10), 2) + Math.floor(dex / 5) + Math.floor(luk / 5));
    const atkMul = 1 + (bonus.atkPct || 0) / 100;
    const batk = Math.round((batkRaw + bonus.atk) * atkMul);

    // Weapon ATK range (calibrated: min ~0.82*wAtk .. max ~1.05*wAtk)
    const wMin = weaponItem ? Math.max(1, Math.round(weaponAtkBase * 0.85 * atkMul)) : 1;
    const wMax = weaponItem ? Math.max(wMin, Math.round(weaponAtkBase * 1.12 * atkMul)) : 1;

    // Exact MATK range
    const matkMul = 1 + (bonus.matkPct || 0) / 100;
    const baseMatkMin = intS + Math.pow(Math.floor(intS / 7), 2) + bonus.matk + Math.round(weaponMatkBase * 0.85);
    const baseMatkMax = intS + Math.pow(Math.floor(intS / 5), 2) + bonus.matk + Math.round(weaponMatkBase * 1.12);
    const matk = [Math.round(baseMatkMin * matkMul), Math.round(baseMatkMax * matkMul)];

    // Exact MaxHP & MaxSP calibrated to nakedTests (Lv.1=126, Lv.50=492/402/896, Lv.99=1360)
    const hpBase = 115 + b.lv * jmeta[0] + b.lv * (b.lv - 1) * 0.008 + Math.max(0, b.lv - 50) * 4.8;
    const maxHp = Math.round((hpBase * (1 + vit * 0.01) + bonus.hp) * (1 + (bonus.hpPct || 0) / 100));
    const spBase = 10 + b.lv * jmeta[1] + b.jobLv * 1.1 + Math.max(0, b.lv - 50) * 1.25;
    const maxSp = Math.round((spBase * (1 + intS * 0.01) + bonus.sp) * (1 + (bonus.spPct || 0) / 100));

    // Exact DEF / VDEF / MDEF / IMDEF
    const def = Math.round(bonus.def);
    const vdef = Math.floor(vit * 0.5 + (vit * vit) / 200);
    const mdef = Math.round(bonus.mdef);
    const imdef = Math.floor(intS * 0.5);

    // Exact HIT / FLEE / CRIT / PDODGE
    const hit = Math.round(b.lv + dex + bonus.hit);
    const flee = Math.round(b.lv + agi + Math.min(50, bonus.flee));
    const crit = Math.max(1, Math.min(100, Math.round(1 + Math.round(luk * 0.3) + bonus.crit)));
    const critDmg = Math.min(150, Math.round(bonus.critDmg));
    const pdodge = Math.min(35, 1 + Math.floor(luk / 10) + Math.round(bonus.pdodge));

    // Exact ASPD & Hits/sec
    const statAspd = Math.min(ASPD_STAT.cap, agi * ASPD_STAT.agi + dex * ASPD_STAT.dex);
    const aspdMul = Math.min(ASPD_CAP, (1 + statAspd) * (1 + (bonus.aspd || 0) / 100));
    const aspd = aspdShown(wMeta.aspd || 1, aspdMul);
    const hitsPerSec = Math.min(5.0, 50 / Math.max(10, 200 - aspd));

    // Cast / CDR / ACD / SkillMul / Pierces
    const castRed = Math.min(60, Math.round(bonus.cast));
    const castPct = Math.max(15, Math.round(100 - dex * 0.45 - intS * 0.1 - castRed));
    const cdr = Math.min(60, Math.round(bonus.cdr));
    const acd = Math.min(50, Math.round(bonus.acd));
    const pen = Math.min(50, Math.round(bonus.pen));
    const mpen = Math.min(50, Math.round(bonus.mpen));
    const leech = Math.min(10, Math.round(bonus.leech * 10) / 10);
    const taken = Math.min(75, Math.round(bonus.taken));
    const skillMul = 1 + (bonus.skill || 0) / 100;

    // Regen & EHP
    const hpRegen = Math.round((1 + maxHp * 0.004 + vit * 0.05) * (1 + bonus.hpReg / 100) * 100) / 100;
    const spRegen = Math.round((0.5 + maxSp * 0.006 + intS * 0.06) * (1 + bonus.spReg / 100) * 100) / 100;
    const defMit = def / (def + 100);
    const ehp = Math.round(maxHp / Math.max(0.15, (1 - defMit) * (1 - taken / 100)));

    const totalPts = statusPointsAt(b.lv);
    const spentPts = statSpent(b.base);

    return {
      lv: b.lv,
      job: b.job,
      jobLv: b.jobLv,
      str, agi, vit, int: intS, dex, luk,
      base: b.base,
      batk,
      watk: [wMin, wMax],
      atkDisplay: `${batk} + ${wMin}~${wMax}`,
      totalAtkAvg: batk + (wMin + wMax) / 2,
      matk,
      matkAvg: (matk[0] + matk[1]) / 2,
      maxHp, maxSp,
      def, vdef, mdef, imdef,
      hit, flee, crit, critDmg, pdodge,
      aspd, aspdMul: Math.round(aspdMul * 1000) / 1000,
      hitsPerSec: Math.round(hitsPerSec * 100) / 100,
      castPct, castRed, cdr, acd, pen, mpen,
      leech, taken, skillMul: Math.round(skillMul * 100) / 100,
      allDmg: Math.round((bonus.allDmg + lowMult) * 10) / 10,
      bossDmg: Math.round(bonus.bossDmg),
      vsBig: Math.round(bonus.vsBig),
      dbl: Math.min(60, Math.round(bonus.dbl)),
      spd: Math.round(bonus.spd),
      hpRegen, spRegen, ehp,
      atkElement, armorElement,
      wtype: (weaponItem && weaponItem.wt) || 'unarmed',
      wMeta, isMagic, isRanged,
      g5Count,
      elDmg: bonus.elDmg,
      vsEl: bonus.vsEl,
      vsRace: bonus.vsRace,
      resist: bonus.resist,
      skillBonus: bonus.skillBonus,
      procs: bonus.procs,
      everyProcs: bonus.everyProcs,
      targetDefRed: bonus.targetDefRed,
      targetDmgTaken: bonus.targetDmgTaken,
      activeSets,
      activeBossSets,
      cardPairFam,
      cardPairEl,
      statPoints: { total: totalPts, spent: spentPts, left: totalPts - spentPts },
      warnings,
    };
  }

  // =========================================================================
  // 6. MONSTER / BOSS TARGET BUILDER & HIT EVALUATION
  // =========================================================================
  function resolveTarget(idx, targetCfg) {
    if (targetCfg && targetCfg.custom) {
      return {
        id: 'custom_dummy',
        isDummy: true,
        name: targetCfg.name || 'หุ่นไล่กาฝึกซ้อม (Training Dummy)',
        lv: Number(targetCfg.lv) || 60,
        hp: Math.max(100, Number(targetCfg.hp) || 10000000),
        atk: [Number(targetCfg.atkMin) || 0, Number(targetCfg.atkMax) || 0],
        def: targetCfg.def != null ? Math.max(0, Number(targetCfg.def)) : 25,
        mdef: targetCfg.mdef != null ? Math.max(0, Number(targetCfg.mdef)) : 20,
        hit: Number(targetCfg.hit) || 85,
        flee: targetCfg.flee != null ? Math.max(0, Number(targetCfg.flee)) : 0,
        el: targetCfg.el || 'neutral',
        atkEl: targetCfg.atkEl || targetCfg.el || 'neutral',
        race: targetCfg.race || 'formless',
        type: 'Dummy',
        boss: targetCfg.boss !== false,
        arm: targetCfg.arm || 'flesh',
        armBar: Number(targetCfg.armBar) || 120,
        img: null,
        ic: null,
      };
    }
    const id = typeof targetCfg === 'string' ? targetCfg : (targetCfg && targetCfg.id);
    const m = idx.monsById[id] || idx.monsById.ant_queen || idx.bosses[0] || idx.wiki.monsters[0];
    return {
      id: m.id,
      name: (m.n && m.n.th) || m.id,
      nameEn: (m.n && m.n.en) || m.id,
      lv: m.lv || 1,
      hp: Math.max(1, m.hp || 1000),
      atk: Array.isArray(m.atk) ? m.atk : [10, 15],
      def: Number(m.def) || 0,
      mdef: Number(m.mdef) || 0,
      hit: Number(m.hit) || (m.lv || 1) + 10,
      flee: Number(m.flee) || Math.round((m.lv || 1) * 0.7),
      el: m.el || 'neutral',
      atkEl: m.atkEl || m.el || 'neutral',
      race: m.race || 'brute',
      type: m.type || 'Field',
      boss: !!m.boss,
      arm: m.arm || 'flesh',
      armBar: Number(m.armBar) || (m.boss ? 120 : 40),
      img: m.img || m.id,
      ic: m.ic || null,
    };
  }

  function calcSkillMul(skill, lv) {
    // wiki `skill.mul` is the max-level total multiplier % (e.g. 520 means 520% at max level)
    const maxLv = Math.max(1, skill.max || 10);
    const curLv = Math.max(1, Math.min(maxLv, lv || maxLv));
    const fullPct = Number(skill.mul) || 120;
    // Scales smoothly from ~55% of full at Lv.1 up to 100% at maxLv
    const frac = maxLv <= 1 ? 1 : (0.55 + 0.45 * ((curLv - 1) / (maxLv - 1)));
    return (fullPct / 100) * frac;
  }

  function calcHitChance(playerHit, targetFlee) {
    return Math.max(0.25, Math.min(1.0, (80 + (playerHit - targetFlee * 0.7)) / 100));
  }

  function calcDefReduction(defVal, piercePct, isBroken) {
    const eff = Math.max(0, defVal * (1 - Math.min(0.85, (piercePct || 0) / 100)) * (isBroken ? 0.5 : 1));
    return 100 / (100 + eff * 1.45);
  }

  function computeRuneBundle(idx, runeSlots, sc, mode) {
    const effects = [];
    for (const rSlot of (runeSlots || [])) {
      if (!rSlot || !rSlot.k) continue;
      const R = idx.runesByKey[rSlot.k];
      if (!R) continue;
      effects.push(runeEffect(R, rSlot.tier || 1, Object.assign({}, sc, { qb: rSlot.qb || 0, qd: rSlot.qd || 0 })));
    }
    return { effects, summary: runeTotal(effects, mode || 's2', idx.meta) };
  }

  // Evaluate one expected or stochastic hit (used by BOTH deterministic sim & live 2D Arena!)
  function evalDamageAction(idx, stats, build, action, target, env, rng) {
    const mode = (env && env.mode) || 's2';
    const night = !!(env && env.night);
    const targetCount = Math.max(1, (env && env.targetCount) || 1);
    const isBroken = !!(env && env.broken);
    const isStochastic = typeof rng === 'function';
    const rand = isStochastic ? rng : () => 0.5;

    const kind = action.kind || 'phys'; // 'phys' | 'magic' | 'basic' | 'card'
    const isMagic = kind === 'magic' || (kind === 'basic' && stats.isMagic) || (kind === 'card' && stats.matkAvg > stats.totalAtkAvg);
    const el = action.el || (kind === 'basic' ? stats.atkElement : 'neutral') || 'neutral';

    // Runes for this action
    const runeList = action.runeSlots || [];
    const runeBundle = computeRuneBundle(idx, runeList, {
      n: targetCount,
      night,
      hits: action.hits || 1,
      dur: action.dur || 0,
      cd: action.cd || 1,
      splitIn: action.splitIn || 0,
      splitAll: targetCount === 1 && !action.far,
    }, mode);
    const rs = runeBundle.summary;

    // Base Attack Power
    let basePower;
    if (isMagic) {
      const mMin = stats.matk[0], mMax = stats.matk[1];
      basePower = (mMin + (mMax - mMin) * rand());
      if (kind === 'basic') basePower *= (stats.wMeta.matkMul || 0.45);
    } else {
      const wMin = stats.watk[0], wMax = stats.watk[1];
      basePower = stats.batk + (wMin + (wMax - wMin) * rand());
      if (kind === 'basic') basePower *= (stats.wMeta.hitK || 1);
    }

    // Skill multiplier + weapon skill boost + general skillMul
    const skBoost = action.skillId ? (1 + (stats.skillBonus[action.skillId] || 0) / 100) : 1;
    const rawMul = (action.mul || 1) * (kind === 'basic' ? 1 : stats.skillMul) * skBoost;

    // Elemental, Race, Boss, AllDmg multipliers
    const elMod = elementMod(el, target.el);
    const elBonus = 1 + ((stats.elDmg[el] || 0) / 100);
    const vsElBonus = 1 + ((stats.vsEl[target.el] || 0) / 100);
    const vsRaceBonus = 1 + ((stats.vsRace[target.race] || 0) / 100);
    const bossBonus = target.boss ? (1 + (stats.bossDmg + stats.vsBig) / 100) : 1;
    const allBonus = 1 + (stats.allDmg || 0) / 100;
    const debuffBonus = 1 + (stats.targetDmgTaken || 0) / 100;
    const breakBonus = isBroken ? 1.30 : 1.0;

    // Hit / Miss & Crit
    const hitChance = isMagic ? 1.0 : calcHitChance(stats.hit, target.flee);
    const critChance = isMagic ? Math.min(0.45, (stats.crit * 0.4) / 100) : Math.min(0.95, stats.crit / 100);
    const critMult = 1.5 * (1 + (stats.critDmg || 0) / 100);

    // Defense Mitigation with Armor/Ward Pierce
    const defBase = isMagic ? target.mdef : target.def;
    const effTargetDef = Math.max(0, defBase * (1 - (stats.targetDefRed || 0) / 100));
    const totalPierce = isMagic ? (stats.mpen + rs.wpierce) : (stats.pen + rs.apierce);
    const defFactor = calcDefReduction(effTargetDef, totalPierce, isBroken);
    const critDefFactor = calcDefReduction(effTargetDef * 0.4, totalPierce, isBroken);

    // Double Attack on basic phys hits
    const dblFactor = (kind === 'basic' && !isMagic && stats.dbl > 0) ? (1 + (stats.dbl / 100) * 0.85) : 1;

    // Compute per-cast damage
    let miss = false;
    let crit = false;
    let dmg;

    // AoE hit count multiplier
    const isAoe = !!(action.aoe || (action.kinds && action.kinds.includes('area')));
    const aoeTargets = isAoe ? Math.min(targetCount, 6) : 1;
    const runeMultPerTarget = (rs.hitFactor * rs.extraFactor + rs.flatExtra) * (1 + rs.procBonus);

    if (isStochastic) {
      if (!isMagic && rand() > hitChance) {
        miss = true;
        dmg = 0;
      } else {
        crit = rand() < critChance;
        const mit = crit ? critDefFactor : defFactor;
        const cMul = crit ? critMult : 1;
        const raw = basePower * rawMul * mit * cMul * elMod * elBonus * vsElBonus * vsRaceBonus * bossBonus * allBonus * debuffBonus * breakBonus * dblFactor * runeMultPerTarget;
        dmg = Math.max(1, Math.round(raw));
      }
    } else {
      const avgMitCrit = (1 - critChance) * defFactor + critChance * critDefFactor * critMult;
      const raw = basePower * rawMul * hitChance * avgMitCrit * elMod * elBonus * vsElBonus * vsRaceBonus * bossBonus * allBonus * debuffBonus * breakBonus * dblFactor * runeMultPerTarget;
      dmg = Math.max(1, Math.round(raw));
    }

    // Total damage across AoE targets (single-target skills still get bounce/split extra hits from runeMultPerTarget!)
    const totalDmg = miss ? 0 : Math.round(dmg * aoeTargets);

    return {
      dmg,
      totalDmg,
      aoeTargets,
      miss,
      crit,
      el,
      elMod,
      hitChance,
      critChance,
      runeSummary: rs,
      runeEffects: runeBundle.effects,
      armBreakDmg: miss ? 0 : Math.max(2, Math.round((action.hits || 1) * (kind === 'basic' ? 4 : 9) * (isBroken ? 0 : 1))),
    };
  }

  // =========================================================================
  // 7. DETERMINISTIC COMBAT & BOSS FIGHT SIMULATOR (0.1s TIMELINE)
  // =========================================================================
  function makeRng(seed) {
    let s = (seed | 0) || 133791;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function simulateFight(idx, rawBuild, targetCfg, simOpts = {}) {
    const build = normalizeBuild(idx, rawBuild);
    const env = {
      night: !!simOpts.night,
      mode: simOpts.mode || 's2',
      targetCount: Math.max(1, Math.min(10, Number(simOpts.targetCount) || 1)),
    };
    const stats = calcBuildStats(idx, build, env);
    const target = resolveTarget(idx, targetCfg);
    const maxDur = Math.max(5, Math.min(300, Number(simOpts.durationSec) || 60));
    const stopOnKill = !!simOpts.stopOnKill;
    const bossAttacks = simOpts.bossAttacks !== false;
    const godMode = !!simOpts.godMode;
    const rng = makeRng(simOpts.seed || 424242);

    // Prepare active rotation skills
    const rotSkills = [];
    for (const sid of (build.rotation || [])) {
      const sk = idx.skillsById[sid];
      const slv = (build.skills && build.skills[sid]) || 0;
      if (!sk || slv <= 0 || sk.type === 'passive') continue;
      if ((sk.mul || 0) <= 0 && sk.type !== 'buff') continue;
      const rSlots = build.runes[sid] || [];
      const rBun = computeRuneBundle(idx, rSlots, { n: env.targetCount, night: env.night, hits: sk.hits || 1, dur: sk.dur || 0, cd: sk.cd || 1, splitIn: sk.splitIn || 0 }, env.mode);
      const effCd = Math.max(0.4, (sk.cd || 1.2) * (1 - stats.cdr / 100) * rBun.summary.cdScale);
      const castSec = (sk.type === 'magic' ? 0.45 : 0.15) * (stats.castPct / 100);
      const acdSec = Math.max(0.2, 0.35 * (1 - stats.acd / 100) * rBun.summary.acdScale);
      rotSkills.push({
        id: sk.id,
        name: (sk.n && sk.n.th) || sk.id,
        kind: sk.type === 'magic' ? 'magic' : 'phys',
        el: sk.el || (sk.type === 'phys' ? stats.atkElement : 'neutral'),
        mul: calcSkillMul(sk, slv),
        hits: sk.hits || 1,
        dur: sk.dur || 0,
        cd: effCd,
        castSec,
        acdSec,
        aoe: !!(sk.kinds && sk.kinds.includes('area')),
        kinds: sk.kinds || [],
        splitIn: sk.splitIn || 0,
        runeSlots: rSlots,
        readyAt: 0,
      });
    }
    // Sort rotation by highest estimated DPS priority (biggest burst first)
    rotSkills.sort((a, b) => (b.mul * b.hits / Math.max(0.5, b.cd)) - (a.mul * a.hits / Math.max(0.5, a.cd)));

    // Prepare Active Monster Art Cards
    const activeCards = [];
    for (let i = 0; i < 2; i++) {
      const cs = build.cards.act[i];
      if (!cs || !cs.id) continue;
      const card = idx.cardsById[cs.id];
      if (!card) continue;
      const lvMul = 1 + (cs.lv - 1) * 0.12;
      const pairElMul = stats.cardPairEl ? 1.30 : 1.0;
      const cdMul = stats.cardPairFam ? 0.90 : 1.0;
      // Extract % multiplier from card description if present
      const dm = ((card.d && card.d.en) || '').match(/(\d+)%/);
      const basePct = dm ? Math.max(80, Math.min(900, Number(dm[1]))) : 220;
      activeCards.push({
        id: card.id,
        name: `🃏 ${(card.art && card.art.th) || (card.mon && card.mon.th) || card.id}`,
        kind: 'card',
        el: card.el || 'neutral',
        mul: (basePct / 100) * lvMul * pairElMul,
        hits: 1,
        cd: Math.max(4, (card.cd || 18) * cdMul * (1 - stats.cdr / 100)),
        aoe: true,
        readyAt: i * 1.5,
      });
    }

    // Basic Attack Action
    const basicInterval = Math.max(0.2, 1 / Math.max(0.5, stats.hitsPerSec));
    const basicAction = {
      id: '__basic__',
      name: '⚔️ ตีปกติ (Basic)',
      kind: 'basic',
      el: stats.atkElement,
      mul: 1.0,
      hits: 1,
      cd: basicInterval,
      aoe: false,
      runeSlots: (build.basicRunes || []).filter(Boolean),
    };

    // Simulation state
    const DT = 0.1;
    let t = 0;
    let playerHp = Math.round(stats.maxHp * (build.hpPct / 100));
    let hpMin = playerHp;
    let survived = true;
    let bossHp = target.hp;
    let bossArm = target.armBar;
    let breakLeft = 0;
    let armorBreaks = 0;
    let kills = 0;
    let firstKillAt = null;
    let busyUntil = 0;
    let nextBasicAt = 0;
    let nextBossAtkAt = 1.6;
    let hitCount = 0;
    let totalDamage = 0;
    let burst5s = 0;
    let maxHit = 0;
    let totalHits = 0;
    let critHits = 0;
    let landedHits = 0;
    let totalIncomingDmg = 0;
    let totalHeal = 0;

    const breakdown = Object.create(null);
    const dpsSeries = [];
    let secDmg = 0;
    let nextSecMark = 1.0;
    const events = [];

    function addBreakdown(key, name, el, dmg, isCrit, isMiss) {
      if (!breakdown[key]) breakdown[key] = { id: key, name, el: el || 'neutral', totalDmg: 0, casts: 0, crits: 0, misses: 0, maxHit: 0 };
      const bRow = breakdown[key];
      bRow.casts++;
      bRow.totalDmg += dmg;
      if (isCrit) bRow.crits++;
      if (isMiss) bRow.misses++;
      if (dmg > bRow.maxHit) bRow.maxHit = dmg;
    }

    function applyPlayerDmg(key, name, res) {
      totalHits++;
      if (!res.miss) {
        landedHits++;
        if (res.crit) critHits++;
        totalDamage += res.totalDmg;
        secDmg += res.totalDmg;
        if (t <= 5.0) burst5s += res.totalDmg;
        if (res.dmg > maxHit) maxHit = res.dmg;

        // Leech sustain
        if (stats.leech > 0 && playerHp > 0) {
          const heal = Math.round(res.totalDmg * (stats.leech / 100));
          playerHp = Math.min(stats.maxHp, playerHp + heal);
          totalHeal += heal;
        }

        // Armor break progression
        if (breakLeft <= 0 && target.armBar > 0) {
          bossArm -= res.armBreakDmg;
          if (bossArm <= 0) {
            breakLeft = 6.0;
            bossArm = target.armBar;
            armorBreaks++;
            if (events.length < 60) events.push({ t: Math.round(t * 10) / 10, type: 'break', text: `💥 ARMOR BREAK! (+30% DMG 6s)` });
          }
        }

        // Boss HP & respawn tracking
        bossHp -= res.dmg;
        if (bossHp <= 0) {
          kills++;
          if (firstKillAt == null) firstKillAt = Math.round(t * 10) / 10;
          if (events.length < 60) events.push({ t: Math.round(t * 10) / 10, type: 'kill', text: `☠️ สังหาร ${target.name} สำเร็จ (${Math.round(t * 10) / 10}s)` });
          if (!stopOnKill) bossHp = target.hp;
        }

        // Set / Gear Every-N-Hit & Chance Procs
        hitCount++;
        for (const ep of stats.everyProcs) {
          if (ep.n > 0 && hitCount % ep.n === 0) {
            const pDmg = Math.round((stats.isMagic ? stats.matkAvg : stats.totalAtkAvg) * (ep.mul || 1.2) * calcDefReduction(target.def, stats.pen, breakLeft > 0));
            totalDamage += pDmg; secDmg += pDmg; bossHp -= pDmg;
            addBreakdown('proc_' + ep.fx, `✨ เอฟเฟกต์เซ็ต (${ep.fx})`, 'fire', pDmg, false, false);
          }
        }
        for (const pr of stats.procs) {
          if (pr.chance && rng() * 100 < pr.chance) {
            const pDmg = Math.round((stats.isMagic ? stats.matkAvg : stats.totalAtkAvg) * (pr.mul || 1.0) * calcDefReduction(target.mdef, stats.mpen, breakLeft > 0));
            totalDamage += pDmg; secDmg += pDmg; bossHp -= pDmg;
            addBreakdown('proc_' + pr.fx, `✨ ทริกเกอร์ (${pr.fx})`, 'wind', pDmg, false, false);
          }
        }
      }
      addBreakdown(key, name, res.el, res.totalDmg, res.crit, res.miss);
      if (events.length < 60 && (res.crit || key !== '__basic__')) {
        events.push({
          t: Math.round(t * 10) / 10,
          type: res.miss ? 'miss' : (res.crit ? 'crit' : 'hit'),
          skill: name,
          dmg: res.totalDmg,
          el: res.el,
        });
      }
    }

    while (t < maxDur) {
      if (breakLeft > 0) breakLeft = Math.max(0, breakLeft - DT);

      // Passive HP regen
      const regenTick = stats.hpRegen * DT;
      playerHp = Math.min(stats.maxHp, playerHp + regenTick);
      totalHeal += regenTick;

      // Starfall / timed procs
      for (const pr of stats.procs) {
        if (pr.every && Math.abs((t % pr.every)) < DT * 0.5 && t > 0.2) {
          const pDmg = Math.round((stats.isMagic ? stats.matkAvg : stats.totalAtkAvg) * (pr.mul || 2.0));
          totalDamage += pDmg; secDmg += pDmg; bossHp -= pDmg;
          addBreakdown('proc_starfall', '🌟 ดาวตก (Nebula)', 'holy', pDmg, false, false);
        }
      }

      // 1. Active Monster Art Cards (cast immediately off-GCD when ready)
      for (const ac of activeCards) {
        if (t >= ac.readyAt && t >= busyUntil) {
          const res = evalDamageAction(idx, stats, build, ac, target, Object.assign({}, env, { broken: breakLeft > 0 }), rng);
          applyPlayerDmg('card_' + ac.id, ac.name, res);
          ac.readyAt = t + ac.cd;
          busyUntil = t + 0.25;
          break;
        }
      }

      // 2. Rotation Skills (highest priority off-CD skill)
      if (t >= busyUntil) {
        let castDone = false;
        for (const sk of rotSkills) {
          if (t >= sk.readyAt) {
            const res = evalDamageAction(idx, stats, build, Object.assign({ skillId: sk.id }, sk), target, Object.assign({}, env, { broken: breakLeft > 0 }), rng);
            applyPlayerDmg(sk.id, sk.name, res);
            sk.readyAt = t + sk.cd;
            busyUntil = t + sk.castSec + sk.acdSec;
            castDone = true;
            break;
          }
        }
        // 3. Basic Attack filler
        if (!castDone && t >= nextBasicAt) {
          const res = evalDamageAction(idx, stats, build, basicAction, target, Object.assign({}, env, { broken: breakLeft > 0 }), rng);
          applyPlayerDmg('__basic__', basicAction.name, res);
          nextBasicAt = t + basicInterval;
        }
      }

      // 4. Boss Incoming Attacks
      if (bossAttacks && t >= nextBossAtkAt) {
        const mobAtkInterval = target.boss ? 1.8 : 2.1;
        nextBossAtkAt = t + mobAtkInterval;
        const dodgeChance = Math.min(0.85, Math.max(0.05, (stats.flee - target.hit + 20) / 100));
        const pdodgeChance = stats.pdodge / 100;
        if (rng() > pdodgeChance && rng() > dodgeChance) {
          const rawAtk = target.atk[0] + (target.atk[1] - target.atk[0]) * rng();
          const defK = 100 / (100 + (stats.def + stats.vdef) * 1.4);
          const elRes = 1 - Math.min(0.75, (stats.resist[target.atkEl] || 0) / 100);
          const takenK = 1 - (stats.taken / 100);
          const inc = Math.max(1, Math.round(rawAtk * defK * elRes * takenK * (target.boss ? 1.15 : 1.0)));
          totalIncomingDmg += inc;
          if (!godMode) {
            playerHp -= inc;
            if (playerHp < hpMin) hpMin = playerHp;
            if (playerHp <= 0) {
              survived = false;
              playerHp = 0;
              if (events.length < 60) events.push({ t: Math.round(t * 10) / 10, type: 'death', text: `💀 ตัวละครตายที่ ${Math.round(t * 10) / 10}s (โดน ${inc})` });
              break;
            }
          }
        }
      }

      t += DT;
      if (t >= nextSecMark - 0.001) {
        dpsSeries.push({ t: Math.round(nextSecMark), dps: Math.round(secDmg) });
        secDmg = 0;
        nextSecMark += 1.0;
      }
      if (stopOnKill && kills > 0) break;
    }

    const elapsedSec = Math.max(0.1, Math.round(t * 10) / 10);
    const dps = Math.round(totalDamage / elapsedSec);
    const burstDps5s = Math.round(burst5s / Math.min(5, elapsedSec));
    const ttkSec = dps > 0 ? Math.round((target.hp / dps) * 10) / 10 : null;
    const incomingDps = Math.round(totalIncomingDmg / elapsedSec);
    const healPerSec = Math.round(totalHeal / elapsedSec);

    const skillBreakdown = Object.values(breakdown)
      .map(r => ({
        id: r.id,
        name: r.name,
        el: r.el,
        totalDmg: r.totalDmg,
        dps: Math.round(r.totalDmg / elapsedSec),
        sharePct: totalDamage > 0 ? Math.round((r.totalDmg / totalDamage) * 1000) / 10 : 0,
        casts: r.casts,
        avgHit: r.casts > 0 ? Math.round(r.totalDmg / r.casts) : 0,
        maxHit: r.maxHit,
        critPct: r.casts > 0 ? Math.round((r.crits / r.casts) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.totalDmg - a.totalDmg);

    return {
      target: { id: target.id, name: target.name, lv: target.lv, hp: target.hp, el: target.el, race: target.race, def: target.def, mdef: target.mdef, boss: target.boss },
      env,
      stats,
      elapsedSec,
      totalDamage,
      dps,
      burstDps5s,
      ttkSec: firstKillAt != null ? firstKillAt : ttkSec,
      kills,
      maxHit,
      hitRatePct: totalHits > 0 ? Math.round((landedHits / totalHits) * 1000) / 10 : 100,
      critRatePct: landedHits > 0 ? Math.round((critHits / landedHits) * 1000) / 10 : 0,
      armorBreaks,
      incomingDps,
      healPerSec,
      netHpPerSec: healPerSec - incomingDps,
      survived,
      hpMinPct: stats.maxHp > 0 ? Math.round((Math.max(0, hpMin) / stats.maxHp) * 100) : 0,
      skillBreakdown,
      dpsSeries,
      events,
    };
  }

  // =========================================================================
  // 8. COMPARE BUILDS (A vs B) & AUTO-OPTIMIZER
  // =========================================================================
  function compareBuilds(idx, buildA, buildB, targetCfg, simOpts = {}) {
    const resA = simulateFight(idx, buildA, targetCfg, Object.assign({ seed: 77777 }, simOpts));
    const resB = simulateFight(idx, buildB, targetCfg, Object.assign({ seed: 77777 }, simOpts));
    const dpsDiff = resB.dps - resA.dps;
    const dpsPct = resA.dps > 0 ? Math.round((dpsDiff / resA.dps) * 1000) / 10 : 0;
    const ttkDiff = (resA.ttkSec && resB.ttkSec) ? Math.round((resB.ttkSec - resA.ttkSec) * 10) / 10 : null;
    const ehpDiff = resB.stats.ehp - resA.stats.ehp;
    return {
      target: resA.target,
      winner: dpsDiff > 0 ? 'B' : (dpsDiff < 0 ? 'A' : 'TIE'),
      dpsDiff,
      dpsPct,
      ttkDiff,
      ehpDiff,
      statDiffs: {
        atkAvg: Math.round(resB.stats.totalAtkAvg - resA.stats.totalAtkAvg),
        matkAvg: Math.round(resB.stats.matkAvg - resA.stats.matkAvg),
        maxHp: resB.stats.maxHp - resA.stats.maxHp,
        crit: resB.stats.crit - resA.stats.crit,
        critDmg: resB.stats.critDmg - resA.stats.critDmg,
        aspd: resB.stats.aspd - resA.stats.aspd,
        def: resB.stats.def - resA.stats.def,
        ehp: ehpDiff,
      },
      A: resA,
      B: resB,
    };
  }

  function cloneJson(o) { return JSON.parse(JSON.stringify(o)); }

  function optimizeBuild(idx, spec = {}) {
    const baseBuild = spec.build
      ? normalizeBuild(idx, spec.build)
      : createDefaultBuild(idx, spec.job || 'puppeteer', { lv: spec.lv || 60, jobLv: spec.jobLv || 35 });

    const targetCfg = spec.targetId || spec.target || 'ant_queen';
    const maxItemLv = Math.min(baseBuild.lv, Number(spec.maxItemLv) || baseBuild.lv);
    const refine = Math.max(0, Math.min(10, spec.refine != null ? Number(spec.refine) : 7));
    const grade = Math.max(0, Math.min(5, spec.grade != null ? Number(spec.grade) : 3));
    const runeTier = Math.max(1, Math.min(3, Number(spec.runeTier) || 2));
    const simOpts = { durationSec: 30, night: !!spec.night, targetCount: Number(spec.targetCount) || 1, bossAttacks: false, seed: 99991 };

    const beforeRes = simulateFight(idx, baseBuild, targetCfg, simOpts);
    let best = cloneJson(baseBuild);
    let bestDps = beforeRes.dps;
    const upgrades = [];

    const allowedW = JOB_WEAPONS[best.job] || ['sword'];
    const target = resolveTarget(idx, targetCfg);

    // Step 1: Optimize Weapon (top 14 candidates by ATK/MATK + level + wsk)
    const weaponCands = (idx.itemsBySlot.weapon || [])
      .filter(it => allowedW.includes(it.wt) && (it.lv || 1) <= maxItemLv)
      .sort((a, b) => {
        const sA = (a.atk || 0) * 2 + (a.lv || 0) * 3 + (a.wsk ? 40 : 0) + (elementMod(a.el, target.el) > 1 ? 60 : 0);
        const sB = (b.atk || 0) * 2 + (b.lv || 0) * 3 + (b.wsk ? 40 : 0) + (elementMod(b.el, target.el) > 1 ? 60 : 0);
        return sB - sA;
      })
      .slice(0, 14);
    let bestW = best.equip.weapon;
    for (const w of weaponCands) {
      const trial = cloneJson(best);
      trial.equip.weapon = { id: w.id, ref: refine, g: grade, rows: (best.equip.weapon && best.equip.weapon.rows) || [] };
      const r = simulateFight(idx, trial, targetCfg, simOpts);
      if (r.dps > bestDps) { bestDps = r.dps; best = trial; bestW = trial.equip.weapon; }
    }
    if (bestW && bestW.id !== (baseBuild.equip.weapon && baseBuild.equip.weapon.id)) {
      upgrades.push({ slot: 'weapon', id: bestW.id, name: (idx.itemsById[bestW.id].n && idx.itemsById[bestW.id].n.th) || bestW.id, dpsAfter: bestDps });
    }

    // Step 2: Optimize 3-Piece Outfit Set (top 12 level-eligible offensive sets)
    const setCands = (idx.wiki.equip.sets || [])
      .filter(s => (s.lv || 1) <= maxItemLv && (s.pcs || []).length >= 3)
      .sort((a, b) => (b.lv || 0) - (a.lv || 0))
      .slice(0, 14);
    let pickedSet = null;
    for (const st of setCands) {
      const trial = cloneJson(best);
      for (const pid of st.pcs) {
        const it = idx.itemsById[pid];
        if (!it) continue;
        if (it.s === 'top') trial.equip.top = { id: pid, ref: Math.max(0, refine - 1), g: Math.max(0, grade - 1), rows: [] };
        else if (it.s === 'pants') trial.equip.pants = { id: pid, ref: Math.max(0, refine - 1), g: Math.max(0, grade - 1), rows: [] };
        else if (it.s === 'acc') trial.equip.acc1 = { id: pid, ref: Math.max(0, refine - 1), g: Math.max(0, grade - 1), rows: [] };
      }
      const r = simulateFight(idx, trial, targetCfg, simOpts);
      if (r.dps > bestDps) { bestDps = r.dps; best = trial; pickedSet = st; }
    }
    if (pickedSet) upgrades.push({ slot: 'set_3pc', id: pickedSet.id, name: (pickedSet.n && pickedSet.n.th) || pickedSet.id, dpsAfter: bestDps });

    // Step 3: Optimize Hat, Shield, Acc2
    for (const slot of ['hat', 'shield', 'acc2']) {
      if (slot === 'shield' && !JOB_SHIELD_SET.has(best.job)) continue;
      const poolKey = slot === 'acc2' ? 'acc' : slot;
      const cands = (idx.itemsBySlot[poolKey] || [])
        .filter(it => (it.lv || 1) <= maxItemLv && (!best.equip.acc1 || it.id !== best.equip.acc1.id))
        .sort((a, b) => {
          const score = (x) => {
            const st = x.st || {};
            return (st.atk || 0) * 4 + (st.matk || 0) * 4 + (st.skill || 0) * 150 + (st.crit || 0) * 8 + (st.str || 0) * 5 + (st.int || 0) * 5 + (st.dex || 0) * 4 + (x.lv || 0);
          };
          return score(b) - score(a);
        })
        .slice(0, 8);
      let picked = null;
      for (const it of cands) {
        const trial = cloneJson(best);
        trial.equip[slot] = { id: it.id, ref: Math.max(0, refine - 1), g: Math.max(0, grade - 1), rows: [] };
        const r = simulateFight(idx, trial, targetCfg, simOpts);
        if (r.dps > bestDps) { bestDps = r.dps; best = trial; picked = it; }
      }
      if (picked) upgrades.push({ slot, id: picked.id, name: (picked.n && picked.n.th) || picked.id, dpsAfter: bestDps });
    }

    // Step 4: Optimize Skill Runes for each skill in rotation (exact skill.fit + S2 caps!)
    const dpsRunePriority = ['heavy', 'execute', 'focus', 'curse', 'echo', 'linger', 'skyfall', 'haste', 'split', 'bounce', 'apierce', 'wpierce', 'moonrite', 'corrode'];
    for (const sid of (best.rotation || []).slice(0, 4)) {
      const sk = idx.skillsById[sid];
      if (!sk || !Array.isArray(sk.fit) || !sk.fit.length) continue;
      const fitCands = dpsRunePriority.filter(rk => sk.fit.includes(rk) && idx.runesByKey[rk]).slice(0, 8);
      let bestPair = best.runes[sid] || [null, null];
      for (let i = 0; i < fitCands.length; i++) {
        for (let j = i + 1; j < fitCands.length; j++) {
          const trial = cloneJson(best);
          trial.runes[sid] = [{ k: fitCands[i], tier: runeTier, qb: 0.1, qd: 0.1 }, { k: fitCands[j], tier: runeTier, qb: 0.1, qd: 0.1 }];
          const r = simulateFight(idx, trial, targetCfg, simOpts);
          if (r.dps > bestDps) { bestDps = r.dps; best = trial; bestPair = trial.runes[sid]; }
        }
      }
      if (bestPair[0]) {
        upgrades.push({ slot: `rune:${sid}`, id: bestPair.map(x => x && x.k).join('+'), name: `${(sk.n && sk.n.th) || sid}: ${bestPair.map(x => x && idx.runesByKey[x.k].n.th).join(' + ')}`, dpsAfter: bestDps });
      }
    }

    // Step 5: Optimize Basic Attack Runes (Lv.40 / Lv.70)
    const basicCands = (idx.wiki.runes || []).filter(r => r.kind === 'proc' || r.kind === 'pierce').map(r => r.k).slice(0, 8);
    if (best.lv >= 40) {
      const slotsOpen = best.lv >= 70 ? 2 : 1;
      for (let slotIdx = 0; slotIdx < slotsOpen; slotIdx++) {
        for (const rk of basicCands) {
          if (slotIdx === 1 && best.basicRunes[0] && best.basicRunes[0].k === rk) continue;
          const trial = cloneJson(best);
          trial.basicRunes[slotIdx] = { k: rk, tier: runeTier, qb: 0.1, qd: 0.1 };
          const r = simulateFight(idx, trial, targetCfg, simOpts);
          if (r.dps > bestDps) { bestDps = r.dps; best = trial; }
        }
      }
    }

    // Step 6: Optimize 3 Passive Monster Art Cards (disjoint from Active slots!)
    const activeIds = new Set((best.cards.act || []).filter(Boolean).map(c => c.id));
    const cardCands = (idx.wiki.cards || [])
      .filter(c => !activeIds.has(c.id) && Array.isArray(c.eff) && c.eff.length > 0)
      .map(c => {
        let sc = 0;
        for (const e of c.eff) {
          if (e.kind === 'A' && ['boss', 'critd', 'amp', 'dbl', 'cdr', 'cast', 'leech'].includes(e.key)) sc += (e.val || 0) * 3;
          else if (e.kind === 'P' && ['dmg', 'burst', 'spirit', 'vuln', 'haste'].includes(e.key)) sc += (e.val || 0) * 0.4;
        }
        return { c, sc };
      })
      .sort((a, b) => b.sc - a.sc)
      .slice(0, 16)
      .map(x => x.c);

    for (let slotIdx = 0; slotIdx < 3; slotIdx++) {
      const used = new Set(best.cards.pas.filter((x, i) => x && i !== slotIdx).map(x => x.id));
      let picked = null;
      for (const c of cardCands) {
        if (used.has(c.id)) continue;
        const trial = cloneJson(best);
        trial.cards.pas[slotIdx] = { id: c.id, lv: Math.max(1, Math.min(10, Number(spec.cardLv) || 5)) };
        const r = simulateFight(idx, trial, targetCfg, simOpts);
        if (r.dps > bestDps) { bestDps = r.dps; best = trial; picked = c; }
      }
      if (picked) upgrades.push({ slot: `card_pas_${slotIdx + 1}`, id: picked.id, name: `🃏 ${(picked.mon && picked.mon.th) || picked.id}`, dpsAfter: bestDps });
    }

    const afterRes = simulateFight(idx, best, targetCfg, simOpts);
    return {
      before: { dps: beforeRes.dps, ttkSec: beforeRes.ttkSec, ehp: beforeRes.stats.ehp },
      after: { dps: afterRes.dps, ttkSec: afterRes.ttkSec, ehp: afterRes.stats.ehp },
      dpsGain: afterRes.dps - beforeRes.dps,
      dpsGainPct: beforeRes.dps > 0 ? Math.round(((afterRes.dps - beforeRes.dps) / beforeRes.dps) * 1000) / 10 : 0,
      upgrades,
      optimizedBuild: best,
      result: afterRes,
    };
  }

  // =========================================================================
  // 9. WIKI SEARCH & ENTITY LOOKUP (FOR UI & MCP SERVER)
  // =========================================================================
  function textMatch(q, ...fields) {
    if (!q) return true;
    const low = q.toLowerCase().trim();
    for (const f of fields) {
      if (!f) continue;
      if (typeof f === 'string' && f.toLowerCase().includes(low)) return true;
      if (typeof f === 'object') {
        if (f.th && String(f.th).toLowerCase().includes(low)) return true;
        if (f.en && String(f.en).toLowerCase().includes(low)) return true;
      }
    }
    return false;
  }

  function searchWiki(idx, params = {}) {
    const cat = (params.category || 'all').toLowerCase();
    const q = (params.query || '').trim();
    const limit = Math.max(1, Math.min(50, Number(params.limit) || 20));
    const res = [];

    if (cat === 'all' || cat === 'monsters' || cat === 'bosses') {
      for (const m of (idx.wiki.monsters || [])) {
        if (cat === 'bosses' && !m.boss) continue;
        if (params.element && m.el !== params.element) continue;
        if (params.maxLv && (m.lv || 0) > params.maxLv) continue;
        if (!textMatch(q, m.id, m.n, m.type, m.el, m.race)) continue;
        res.push({ category: 'monster', id: m.id, name: m.n, lv: m.lv, boss: !!m.boss, type: m.type, el: m.el, race: m.race, hp: m.hp, def: m.def, mdef: m.mdef, atk: m.atk });
        if (res.length >= limit) break;
      }
    }
    if ((cat === 'all' || cat === 'items' || cat === 'weapons' || cat === 'equip') && res.length < limit) {
      for (const it of (idx.wiki.equip.items || [])) {
        if (cat === 'weapons' && it.s !== 'weapon') continue;
        if (params.slot && it.s !== params.slot) continue;
        if (params.wtype && it.wt !== params.wtype) continue;
        if (params.rarity && it.r !== params.rarity) continue;
        if (params.maxLv && (it.lv || 0) > params.maxLv) continue;
        if (!textMatch(q, it.id, it.n, it.wt, it.s, it.d)) continue;
        res.push({ category: 'item', id: it.id, name: it.n, slot: it.s, wt: it.wt, rarity: it.r, lv: it.lv, atk: it.atk, el: it.el, st: it.st, wsk: it.wsk });
        if (res.length >= limit) break;
      }
    }
    if ((cat === 'all' || cat === 'sets') && res.length < limit) {
      for (const st of (idx.wiki.equip.sets || [])) {
        if (!textMatch(q, st.id, st.n, st.pas, st.b2, st.b3)) continue;
        res.push({ category: 'set', id: st.id, name: st.n, line: st.line, lv: st.lv, pcs: st.pcs, b2: st.b2, b3: st.b3, pas: st.pas });
        if (res.length >= limit) break;
      }
    }
    if ((cat === 'all' || cat === 'skills') && res.length < limit) {
      for (const sk of (idx.wiki.skills || [])) {
        if (params.job && sk.job !== params.job) continue;
        if (!textMatch(q, sk.id, sk.n, sk.job, sk.d, sk.el)) continue;
        res.push({ category: 'skill', id: sk.id, name: sk.n, job: sk.job, type: sk.type, el: sk.el, max: sk.max, cd: sk.cd, mul: sk.mul, hits: sk.hits, fit: sk.fit });
        if (res.length >= limit) break;
      }
    }
    if ((cat === 'all' || cat === 'runes') && res.length < limit) {
      for (const r of (idx.wiki.runes || [])) {
        if (!textMatch(q, r.k, r.n, r.kind, r.on, r.el)) continue;
        res.push({ category: 'rune', id: r.k, name: r.n, kind: r.kind, on: r.on, el: r.el, tiers: r.t });
        if (res.length >= limit) break;
      }
    }
    if ((cat === 'all' || cat === 'cards') && res.length < limit) {
      for (const c of (idx.wiki.cards || [])) {
        if (!textMatch(q, c.id, c.mon, c.art, c.d, c.el, c.race)) continue;
        res.push({ category: 'card', id: c.id, mon: c.mon, art: c.art, lv: c.lv, el: c.el, race: c.race, cd: c.cd, eff: c.eff });
        if (res.length >= limit) break;
      }
    }
    if ((cat === 'all' || cat === 'jobs') && res.length < limit) {
      for (const j of (idx.wiki.jobs || [])) {
        if (!textMatch(q, j.id, j.n)) continue;
        res.push({ category: 'job', id: j.id, name: j.n, tier: j.tier, from: j.from, weapons: JOB_WEAPONS[j.id] || [], shield: JOB_SHIELD_SET.has(j.id) });
        if (res.length >= limit) break;
      }
    }
    return res;
  }

  function getWikiEntity(idx, category, id) {
    const c = (category || '').toLowerCase();
    if (c === 'monster' || c === 'monsters' || c === 'boss') return idx.monsById[id] || null;
    if (c === 'item' || c === 'items' || c === 'weapon' || c === 'equip') return idx.itemsById[id] || null;
    if (c === 'set' || c === 'sets') return idx.setsById[id] || null;
    if (c === 'bset' || c === 'boss_set') return idx.bsetsById[id] || null;
    if (c === 'skill' || c === 'skills') return idx.skillsById[id] || null;
    if (c === 'rune' || c === 'runes') return idx.runesByKey[id] || null;
    if (c === 'card' || c === 'cards') return idx.cardsById[id] || null;
    if (c === 'job' || c === 'jobs') {
      const j = idx.jobsById[id];
      if (!j) return null;
      return Object.assign({}, j, {
        lineage: getJobLineage(idx, id),
        weapons: JOB_WEAPONS[id] || [],
        shield: JOB_SHIELD_SET.has(id),
        skills: getJobSkills(idx, id).map(s => ({ id: s.id, n: s.n, type: s.type, el: s.el, mul: s.mul, hits: s.hits, cd: s.cd, max: s.max, fit: s.fit })),
      });
    }
    return idx.monsById[id] || idx.itemsById[id] || idx.skillsById[id] || idx.cardsById[id] || idx.runesByKey[id] || idx.setsById[id] || idx.jobsById[id] || null;
  }

  // =========================================================================
  // 10. LIVE CHARACTER IMPORT & MANAGER PLAN EXPORT
  // =========================================================================
  // Exact read-only snippet evaluated via POST /api/profiles/:id/eval
  const LIVE_IMPORT_EVAL_SNIPPET = `(() => {
    const p = window.NC && NC.game && NC.game.player;
    if (!p) return { error: 'Player not in game world' };
    const wu = p.wu || {};
    const byU = Object.create(null);
    for (const g of (p.bag || [])) if (g && g.u != null) byU[g.u] = g;
    const equip = {};
    for (const slot of ['hat', 'glasses', 'weapon', 'shield', 'top', 'pants', 'cape', 'acc1', 'acc2']) {
      const id = p.equip && p.equip[slot];
      const inst = wu[slot] != null ? byU[wu[slot]] : null;
      if (inst && inst.id) {
        equip[slot] = { id: inst.id, ref: inst.ref || 0, g: inst.g || 0, rows: Array.isArray(inst.rows) ? inst.rows : [] };
      } else if (id) {
        equip[slot] = { id, ref: 0, g: 0, rows: [] };
      } else {
        equip[slot] = null;
      }
    }
    const runes = {};
    if (NC.BL && typeof NC.BL.runesOf === 'function') {
      for (const sid of Object.keys(p.skills || {})) {
        const arr = NC.BL.runesOf(sid);
        if (arr && arr.some(Boolean)) runes[sid] = arr;
      }
    }
    const basicRunes = (NC.BL && typeof NC.BL.runesOf === 'function') ? NC.BL.runesOf('bl_basic') : [];
    const artsGot = (NC.BL && NC.BL.arts && NC.BL.arts.got) ? NC.BL.arts.got : null;
    const cardLvOf = (id) => {
      if (!id) return 1;
      try { if (NC.BL && NC.BL.arts && typeof NC.BL.arts.levelOf === 'function') return NC.BL.arts.levelOf(id) || 1; } catch {}
      return 1;
    };
    const cards = {
      pas: [0, 1, 2].map(i => { const id = artsGot && artsGot.pas && artsGot.pas[i]; return id ? { id, lv: cardLvOf(id) } : null; }),
      act: [0, 1].map(i => { const id = artsGot && artsGot.slots && artsGot.slots[i]; return id ? { id, lv: cardLvOf(id) } : null; }),
    };
    const sheet = NC.statSheet ? NC.statSheet(p) : p.d;
    return {
      name: p.name || 'Live Hero',
      job: p.job || 'traveler',
      lv: p.lv || 1,
      jobLv: p.jobLv || 1,
      base: Object.assign({}, p.base || {}),
      equip,
      skills: Object.assign({}, p.skills || {}),
      hotbar: Object.assign({}, p.hotbar || {}),
      runes,
      basicRunes,
      cards,
      liveSheet: sheet ? {
        batk: sheet.batk, watk: sheet.watk, matk: sheet.matk,
        maxHp: sheet.maxHp, maxSp: sheet.maxSp, def: sheet.def, mdef: sheet.mdef,
        hit: sheet.hit, flee: sheet.flee, crit: sheet.crit, aspd: sheet.aspd, castPct: sheet.castPct,
      } : null,
    };
  })()`;

  function importLiveCharacterToBuild(idx, snap, profileMeta = {}) {
    if (!snap || snap.error) throw new Error((snap && snap.error) || 'Empty live snapshot');
    const hb = snap.hotbar || {};
    const rot = [];
    for (const k of ['q', 'e', 'r', 'f', '3', '4', '5', '6']) {
      const sid = hb[k];
      const sk = sid && idx.skillsById[sid];
      if (sk && sk.type !== 'passive' && sk.type !== 'buff' && sk.type !== 'heal' && !rot.includes(sid)) {
        rot.push(sid);
      }
    }
    if (!rot.length) {
      for (const [sid, slv] of Object.entries(snap.skills || {})) {
        const sk = idx.skillsById[sid];
        if (sk && slv > 0 && sk.type !== 'passive' && (sk.mul || 0) > 0 && rot.length < 4) rot.push(sid);
      }
    }
    const build = normalizeBuild(idx, {
      id: 'live_' + (profileMeta.id || snap.name || Date.now()),
      name: `${snap.name || profileMeta.name || 'Live'} (${(idx.jobsById[snap.job] && idx.jobsById[snap.job].n && idx.jobsById[snap.job].n.th) || snap.job} Lv.${snap.lv})`,
      job: snap.job,
      lv: snap.lv,
      jobLv: snap.jobLv,
      base: snap.base,
      equip: snap.equip,
      skills: snap.skills,
      rotation: rot,
      hotbar: hb,
      runes: snap.runes,
      basicRunes: snap.basicRunes,
      cards: snap.cards,
    });
    build._liveSheet = snap.liveSheet || null;
    return build;
  }

  // Export simulated Build to clean Nightcamp Manager Plan Gear steps
  // (Strictly skips non-instanced glasses/cape & enforces disjoint pas/act cards!)
  function exportBuildToPlanGear(idx, rawBuild, opts = {}) {
    const b = normalizeBuild(idx, rawBuild);
    const steps = [];
    let stepNum = 1;
    const pushStep = (s) => steps.push(Object.assign({ id: `sim_step_${stepNum++}`, enabled: true }, s));

    // 1. Instanced Equipment slots (skip glasses & cape per Nightcamp Set Gear rule)
    for (const slot of ['weapon', 'shield', 'hat', 'top', 'pants', 'acc1', 'acc2']) {
      const g = b.equip[slot];
      if (!g || !g.id) continue;
      const it = idx.itemsById[g.id];
      if (!it) continue;
      pushStep({
        type: 'buy_equip',
        slot,
        itemId: it.id,
        itemName: (it.n && it.n.th) || it.id,
        minGrade: g.g || 0,
        targetRefine: g.ref || 0,
        maxPrice: Number(opts.maxEquipPrice) || 0,
      });
      if (g.g >= 2) {
        pushStep({ type: 'polish', slot, itemId: it.id, targetGrade: g.g });
      }
      if (g.ref >= 4) {
        pushStep({ type: 'refine', slot, itemId: it.id, targetRefine: g.ref });
      }
    }

    // 2. Skill Runes & Basic Runes
    for (const [sid, arr] of Object.entries(b.runes || {})) {
      const sk = idx.skillsById[sid];
      if (!sk || !Array.isArray(arr)) continue;
      arr.forEach((r, sIdx) => {
        if (!r || !r.k || !idx.runesByKey[r.k]) return;
        pushStep({
          type: 'buy_rune',
          skillId: sid,
          slotIndex: sIdx,
          runeKey: r.k,
          tier: r.tier || 1,
          runeName: idx.runesByKey[r.k].n.th,
        });
      });
    }
    (b.basicRunes || []).forEach((r, sIdx) => {
      if (!r || !r.k || !idx.runesByKey[r.k]) return;
      pushStep({
        type: 'buy_rune',
        skillId: 'bl_basic',
        slotIndex: sIdx,
        runeKey: r.k,
        tier: r.tier || 1,
        runeName: idx.runesByKey[r.k].n.th,
      });
    });

    // 3. Monster Art Cards (strictly disjoint pas vs act!)
    const usedCards = new Set();
    const pasCards = [];
    const actCards = [];
    for (const c of (b.cards.pas || [])) {
      if (c && c.id && idx.cardsById[c.id] && !usedCards.has(c.id)) {
        usedCards.add(c.id);
        pasCards.push(c.id);
        pushStep({ type: 'buy_card', role: 'pas', cardId: c.id, cardName: idx.cardsById[c.id].mon.th });
      }
    }
    for (const c of (b.cards.act || [])) {
      if (c && c.id && idx.cardsById[c.id] && !usedCards.has(c.id)) {
        usedCards.add(c.id);
        actCards.push(c.id);
        pushStep({ type: 'buy_card', role: 'act', cardId: c.id, cardName: idx.cardsById[c.id].mon.th });
      }
    }

    return {
      name: opts.planName || `🧪 Sim: ${b.name}`,
      job: b.job,
      targetLv: b.lv,
      statPlan: b.base,
      skillPlan: b.skills,
      gearSteps: steps,
      cards: { pas: pasCards, act: actCards },
      meta: { exportedFrom: 'build_simulate', exportedAt: new Date().toISOString() },
    };
  }

  return {
    VERSION: '1.0.0',
    START_STATS, STAT_KEYS, STAT_MAX, LV_MAX, JOB_MAX,
    statusPointsAt, statCost, statSpent,
    ELEMENTS, ELEMENT_INFO, ELEMENT_TABLE, elementMod,
    ASPD_CAP, ASPD_STAT, aspdShown,
    JOBS_HPSP, WTYPES_META, JOB_WEAPONS, JOB_SHIELD_SET,
    GRADES, RARITY_INFO, EQUIP_SLOTS, SLOT_LABELS, GEAROPT,
    BUFFPOTS, GUILD_BUFFS, PARTY_BUFFS, SET_PASSIVES, BOSS_SETS_FX,
    runeRolled, runeEffect, runeTotal,
    createIndex, getJobLineage, getJobSkills,
    createDefaultBuild, normalizeBuild,
    calcBuildStats, resolveTarget, calcSkillMul,
    computeRuneBundle, evalDamageAction,
    simulateFight, compareBuilds, optimizeBuild,
    searchWiki, getWikiEntity,
    LIVE_IMPORT_EVAL_SNIPPET, importLiveCharacterToBuild, exportBuildToPlanGear,
  };
});
