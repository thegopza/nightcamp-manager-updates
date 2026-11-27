/* Nightcamp SS2 Build Simulator — Real-Time 60 FPS 2D Boss Combat Arena & Full Skill/Rune VFX Engine
 * Ported Nightcamp RPG visual style, public Wiki sprite atlases, authentic boss HUD,
 * full elemental/class/rune VFX (meteors, chain lightning, ice lances, holy crosses,
 * puppet strings & dance, bard notes, gunfire/arrows, split/bounce/echo/linger/skyfall),
 * boss attack telegraphs, armor break shatter, and stylized Nightcamp damage popups.
 */
(function (root) {
  'use strict';

  const WIKI_CDN = 'https://play.nightcamp.app/wiki';

  const EL_COLORS = {
    neutral: { hex: '#f8fafc', rgb: '248,250,252', glow: '#e2e8f0' },
    fire: { hex: '#ff7a3d', rgb: '255,122,61', glow: '#fbbf24' },
    water: { hex: '#5aa9ff', rgb: '90,169,255', glow: '#a5f3fc' },
    wind: { hex: '#7fd67a', rgb: '127,214,122', glow: '#bef264' },
    earth: { hex: '#c08a4a', rgb: '192,138,74', glow: '#fde68a' },
    poison: { hex: '#b36ee0', rgb: '179,110,224', glow: '#86efac' },
    holy: { hex: '#ffe07a', rgb: '255,224,122', glow: '#fef9c3' },
    shadow: { hex: '#9b87f5', rgb: '155,135,245', glow: '#c084fc' },
    ghost: { hex: '#bfeaf5', rgb: '191,234,245', glow: '#e0f2fe' },
    undead: { hex: '#9fb38f', rgb: '159,179,143', glow: '#d9f99d' },
  };

  const ARENA_THEMES = {
    woods: {
      name: 'ป่ากองไฟ (Campfire Woods)',
      skyDay: ['#1c3b52', '#2f5a67', '#2b4738'],
      skyNight: ['#090d1c', '#151c35', '#17232c'],
      groundDay: '#2c4230', groundNight: '#17231e',
      tileLine: 'rgba(255,235,190,0.06)',
      accent: '#ff9b42', particle: '#fde68a',
    },
    crypt: {
      name: 'สุสานใต้ดิน (Ancient Crypt)',
      skyDay: ['#1b182d', '#292242', '#1d192b'],
      skyNight: ['#090713', '#161129', '#110e1d'],
      groundDay: '#262235', groundNight: '#181524',
      tileLine: 'rgba(167,139,250,0.08)',
      accent: '#a78bfa', particle: '#c4b5fd',
    },
    mine: {
      name: 'เหมืองมด (Ant Mine)',
      skyDay: ['#2b2119', '#453222', '#2e2218'],
      skyNight: ['#120d0a', '#241911', '#1a120c'],
      groundDay: '#3b2b1e', groundNight: '#241a12',
      tileLine: 'rgba(251,191,36,0.07)',
      accent: '#f59e0b', particle: '#fcd34d',
    },
    volcano: {
      name: 'ภูเขาไฟหลับไหล (Sleeping Volcano)',
      skyDay: ['#361816', '#5e2319', '#2b1414'],
      skyNight: ['#14080a', '#2e1010', '#1c0c0c'],
      groundDay: '#2f1c1c', groundNight: '#1e1112',
      tileLine: 'rgba(255,100,60,0.1)',
      accent: '#ff5733', particle: '#ff8a5b',
    },
  };

  function elCol(el) { return EL_COLORS[el] || EL_COLORS.neutral; }

  class ImageCache {
    constructor(meta) {
      this.meta = meta || {};
      this.atlasV = (meta && meta.atlasV) || '';
      this.imgs = Object.create(null);
    }
    get(url) {
      if (!url) return null;
      let rec = this.imgs[url];
      if (!rec) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        rec = { img, loaded: false, err: false };
        img.onload = () => { rec.loaded = true; };
        img.onerror = () => { rec.err = true; };
        img.src = url;
        this.imgs[url] = rec;
      }
      return rec.loaded && !rec.err ? rec.img : null;
    }
    getAtlas(name) {
      const v = this.atlasV ? `?v=${this.atlasV}` : '';
      return this.get(`${WIKI_CDN}/data/wiki_${name}.webp${v}`);
    }
    getMonsterFull(imgId) {
      if (!imgId) return null;
      const v = this.atlasV ? `?v=${this.atlasV}` : '';
      return this.get(`${WIKI_CDN}/assets/m/${encodeURIComponent(imgId)}.webp${v}`);
    }
    drawAtlasCell(ctx, ic, dx, dy, dw, dh) {
      if (!Array.isArray(ic) || ic.length < 2) return false;
      const [atlasName, idx] = ic;
      const spec = this.meta && this.meta.atlas && this.meta.atlas[atlasName];
      const img = this.getAtlas(atlasName);
      if (!spec || !img) return false;
      const cols = spec.cols || 1;
      const cell = spec.cell || 64;
      const sx = (idx % cols) * cell;
      const sy = Math.floor(idx / cols) * cell;
      ctx.drawImage(img, sx, sy, cell, cell, dx, dy, dw, dh);
      return true;
    }
  }

  class BuildSimArena {
    constructor(canvas, engine, idx, onTickHud) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.engine = engine;
      this.idx = idx;
      this.onTickHud = onTickHud || (() => {});
      this.imgCache = new ImageCache(idx.meta);

      this.width = 760;
      this.height = 370;
      this.dpr = Math.min(2, window.devicePixelRatio || 1);

      this.build = null;
      this.stats = null;
      this.target = null;
      this.env = { night: true, mode: 's2', targetCount: 1, theme: 'woods', bossAttacks: true, godMode: false };

      this.playing = true;
      this.autoRot = true;
      this.speed = 1;
      this.time = 0;
      this.combatElapsed = 0;

      // Live entities
      this.hero = { x: 170, y: 245, baseX: 170, baseY: 245, hp: 1000, maxHp: 1000, sp: 300, maxSp: 300, lunge: 0, hurtFlash: 0, castAnim: 0, castColor: '#ffe07a', swingAngle: 0, swingAlpha: 0, dead: false };
      this.mobs = [];

      // Combat timers
      this.skillCds = Object.create(null);
      this.skillCdFull = Object.create(null);
      this.cardCds = [0, 0];
      this.cardCdFull = [18, 18];
      this.gcdLeft = 0;
      this.basicCdLeft = 0;
      this.hitCounter = 0;

      // Live DPS metrics
      this.totalDamage = 0;
      this.kills = 0;
      this.armorBreaks = 0;
      this.maxHit = 0;
      this.dmgWindow = []; // [{t, dmg}] for rolling 5s DPS
      this.breakdown = Object.create(null);
      this.log = [];

      // Visual particles & effects
      this.vfx = [];
      this.floats = [];
      this.ambient = [];
      this.screenShake = 0;
      this.echoQueue = []; // delayed echo recasts
      this.lingerZones = []; // pulsing ground DoT circles

      this._initAmbient();
      this._rafId = null;
      this._lastTs = 0;
      this._hudAccum = 0;
      this.resize();
    }

    _initAmbient() {
      this.ambient = [];
      for (let i = 0; i < 28; i++) {
        this.ambient.push({
          x: Math.random() * 800,
          y: 40 + Math.random() * 310,
          vx: (Math.random() - 0.5) * 18,
          vy: -6 - Math.random() * 14,
          r: 1.2 + Math.random() * 2.2,
          ph: Math.random() * Math.PI * 2,
        });
      }
    }

    resize() {
      const rect = this.canvas.parentElement ? this.canvas.parentElement.getBoundingClientRect() : null;
      const w = Math.max(460, Math.round((rect && rect.width) || 760));
      const h = Math.max(330, Math.min(400, Math.round(w * 0.46)));
      this.width = w;
      this.height = h;
      this.canvas.width = Math.round(w * this.dpr);
      this.canvas.height = Math.round(h * this.dpr);
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
      this.hero.baseX = Math.round(w * 0.24);
      this.hero.baseY = Math.round(h * 0.68);
      this.hero.x = this.hero.baseX;
      this.hero.y = this.hero.baseY;
      this._layoutMobs();
    }

    setState(build, stats, target, env, resetFight = false) {
      const targetChanged = !this.target || this.target.id !== target.id || (this.env.targetCount !== env.targetCount);
      this.build = build;
      this.stats = stats;
      this.target = target;
      this.env = Object.assign({}, this.env, env);
      this.hero.maxHp = stats.maxHp;
      this.hero.maxSp = stats.maxSp;
      if (resetFight || targetChanged || this.mobs.length === 0) {
        this.resetCombat();
      } else {
        this.hero.hp = Math.min(this.hero.maxHp, this.hero.hp);
        this.hero.sp = Math.min(this.hero.maxSp, this.hero.sp);
      }
    }

    resetCombat() {
      this.combatElapsed = 0;
      this.totalDamage = 0;
      this.kills = 0;
      this.armorBreaks = 0;
      this.maxHit = 0;
      this.dmgWindow = [];
      this.breakdown = Object.create(null);
      this.log = [];
      this.skillCds = Object.create(null);
      this.cardCds = [0, 0];
      this.gcdLeft = 0;
      this.basicCdLeft = 0;
      this.hitCounter = 0;
      this.vfx = [];
      this.floats = [];
      this.echoQueue = [];
      this.lingerZones = [];
      if (this.stats) {
        this.hero.maxHp = this.stats.maxHp;
        this.hero.hp = Math.round(this.stats.maxHp * ((this.build && this.build.hpPct || 100) / 100));
        this.hero.maxSp = this.stats.maxSp;
        this.hero.sp = this.stats.maxSp;
        this.hero.dead = false;
      }
      this._spawnMobs();
      this._emitHud();
    }

    _spawnMobs() {
      this.mobs = [];
      if (!this.target) return;
      const n = Math.max(1, Math.min(10, Number(this.env.targetCount) || 1));
      for (let i = 0; i < n; i++) {
        this.mobs.push({
          uid: i,
          hp: this.target.hp,
          maxHp: this.target.hp,
          hpTrail: this.target.hp,
          arm: this.target.armBar || 100,
          maxArm: this.target.armBar || 100,
          breakLeft: 0,
          x: 520, y: 240, baseX: 520, baseY: 240,
          hitFlash: 0, knockX: 0,
          atkTimer: 1.5 + i * 0.55,
          telegraph: 0,
          statuses: Object.create(null), // { burn: 3, curse: 5, ... }
          bobOff: i * 1.17,
        });
      }
      this._layoutMobs();
    }

    _layoutMobs() {
      const n = this.mobs.length;
      if (!n) return;
      const cx = Math.round(this.width * 0.72);
      const cy = Math.round(this.height * 0.67);
      if (n === 1) {
        this.mobs[0].baseX = cx;
        this.mobs[0].baseY = cy;
        this.mobs[0].x = cx;
        this.mobs[0].y = cy;
        return;
      }
      const cols = Math.min(3, Math.ceil(Math.sqrt(n)));
      const rows = Math.ceil(n / cols);
      for (let i = 0; i < n; i++) {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const bx = cx + (c - (cols - 1) / 2) * 76 + (r % 2) * 18;
        const by = cy + (r - (rows - 1) / 2) * 44;
        this.mobs[i].baseX = Math.min(this.width - 55, Math.max(this.width * 0.48, bx));
        this.mobs[i].baseY = Math.min(this.height - 42, Math.max(this.height * 0.44, by));
        this.mobs[i].x = this.mobs[i].baseX;
        this.mobs[i].y = this.mobs[i].baseY;
      }
    }

    start() {
      if (this._rafId) return;
      this._lastTs = performance.now();
      const loop = (ts) => {
        const rawDt = Math.min(0.05, Math.max(0.001, (ts - this._lastTs) / 1000));
        this._lastTs = ts;
        this.update(rawDt);
        this.render();
        this._rafId = requestAnimationFrame(loop);
      };
      this._rafId = requestAnimationFrame(loop);
    }

    stop() {
      if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
    }

    // =========================================================================
    // MANUAL & AUTO COMBAT ACTIONS
    // =========================================================================
    castSkillById(skillId) {
      if (!this.build || !this.stats || !this.target || this.hero.dead) return false;
      const sk = this.idx.skillsById[skillId];
      if (!sk || sk.type === 'passive') return false;
      if ((this.skillCds[skillId] || 0) > 0.01) return false;
      const slv = (this.build.skills && this.build.skills[skillId]) || sk.max || 10;
      const rSlots = (this.build.runes && this.build.runes[skillId]) || [];
      const rBun = this.engine.computeRuneBundle(this.idx, rSlots, {
        n: this.mobs.length, night: this.env.night, hits: sk.hits || 1, dur: sk.dur || 0, cd: sk.cd || 1, splitIn: sk.splitIn || 0,
      }, this.env.mode);

      const effCd = Math.max(0.45, (sk.cd || 1.2) * (1 - this.stats.cdr / 100) * rBun.summary.cdScale);
      const castSec = (sk.type === 'magic' ? 0.35 : 0.14) * (this.stats.castPct / 100);
      const acdSec = Math.max(0.18, 0.30 * (1 - this.stats.acd / 100) * rBun.summary.acdScale);

      this.skillCds[skillId] = effCd;
      this.skillCdFull[skillId] = effCd;
      this.gcdLeft = castSec + acdSec;

      const el = sk.el || (sk.type === 'phys' ? this.stats.atkElement : 'neutral') || 'neutral';
      const cInfo = elCol(el);
      this.hero.castAnim = 0.45;
      this.hero.castColor = cInfo.hex;
      this.hero.lunge = sk.type === 'magic' ? 8 : 26;

      // Support / Heal / Buff skill
      if (sk.type === 'heal' || sk.type === 'buff' || !(sk.mul > 0)) {
        const healAmt = Math.round(this.stats.maxHp * 0.25 + this.stats.matkAvg * 1.2);
        this.hero.hp = Math.min(this.hero.maxHp, this.hero.hp + healAmt);
        this.spawnFloat(this.hero.x, this.hero.y - 70, `+${healAmt}`, 'heal');
        this.vfx.push({ type: 'ring', x: this.hero.x, y: this.hero.y - 20, r: 10, maxR: 95, color: '#86efac', life: 0.55, maxLife: 0.55, lw: 4 });
        this._pushLog(`✨ ร่าย ${(sk.n && sk.n.th) || skillId} (+${healAmt} HP)`);
        return true;
      }

      const action = {
        skillId: sk.id,
        name: (sk.n && sk.n.th) || sk.id,
        kind: sk.type === 'magic' ? 'magic' : 'phys',
        el,
        mul: this.engine.calcSkillMul(sk, slv),
        hits: sk.hits || 1,
        dur: sk.dur || 0,
        cd: effCd,
        aoe: !!(sk.kinds && sk.kinds.includes('area')),
        kinds: sk.kinds || [],
        splitIn: sk.splitIn || 0,
        runeSlots: rSlots,
      };
      this._executeAttackAction(sk.id, action, rSlots);
      return true;
    }

    castCardSlot(slotIndex) {
      if (!this.build || !this.stats || !this.target || this.hero.dead) return false;
      if ((this.cardCds[slotIndex] || 0) > 0.01) return false;
      const cs = this.build.cards && this.build.cards.act && this.build.cards.act[slotIndex];
      if (!cs || !cs.id) return false;
      const card = this.idx.cardsById[cs.id];
      if (!card) return false;

      const lvMul = 1 + (cs.lv - 1) * 0.12;
      const pairElMul = this.stats.cardPairEl ? 1.30 : 1.0;
      const cdMul = this.stats.cardPairFam ? 0.90 : 1.0;
      const dm = ((card.d && card.d.en) || '').match(/(\d+)%/);
      const basePct = dm ? Math.max(100, Math.min(900, Number(dm[1]))) : 240;
      const effCd = Math.max(4, (card.cd || 18) * cdMul * (1 - this.stats.cdr / 100));

      this.cardCds[slotIndex] = effCd;
      this.cardCdFull[slotIndex] = effCd;
      this.hero.castAnim = 0.55;
      this.hero.castColor = elCol(card.el).hex;

      const action = {
        name: `🃏 ${(card.art && card.art.th) || card.mon.th}`,
        kind: 'card',
        el: card.el || 'neutral',
        mul: (basePct / 100) * lvMul * pairElMul,
        hits: 1,
        aoe: true,
        runeSlots: [],
      };
      // Big card art flash banner
      this.vfx.push({ type: 'banner', text: `🃏 ${(card.art && card.art.th) || card.mon.th}!`, x: this.width * 0.5, y: 112, color: elCol(card.el).hex, life: 1.05, maxLife: 1.05 });
      this._executeAttackAction('card_' + card.id, action, []);
      return true;
    }

    castBasic() {
      if (!this.build || !this.stats || !this.target || this.hero.dead) return false;
      const interval = Math.max(0.2, 1 / Math.max(0.5, this.stats.hitsPerSec));
      this.basicCdLeft = interval;
      this.hero.lunge = this.stats.isRanged || this.stats.isMagic ? 10 : 22;
      this.hero.swingAngle = -0.8;
      this.hero.swingAlpha = 0.9;
      const rSlots = (this.build.basicRunes || []).filter(Boolean);
      const action = {
        name: '⚔️ ตีปกติ',
        kind: 'basic',
        el: this.stats.atkElement,
        mul: 1.0,
        hits: 1,
        aoe: false,
        runeSlots: rSlots,
      };
      this._executeAttackAction('__basic__', action, rSlots);
      return true;
    }

    _executeAttackAction(key, action, runeSlots) {
      if (!this.mobs.length) return;
      const primary = this.mobs[0];
      const res = this.engine.evalDamageAction(
        this.idx, this.stats, this.build, action, this.target,
        Object.assign({}, this.env, { broken: primary.breakLeft > 0 }),
        Math.random
      );

      // Visual skill FX!
      const runeKeys = new Set((runeSlots || []).filter(Boolean).map(r => r.k));
      this._spawnActionVfx(key, action, primary, res, runeKeys);

      // Apply damage across primary (and AoE targets)
      const hitMobs = action.aoe ? this.mobs.slice(0, Math.min(6, this.mobs.length)) : [primary];
      for (let i = 0; i < hitMobs.length; i++) {
        const mob = hitMobs[i];
        const mDmg = i === 0 ? res.dmg : Math.round(res.dmg * (0.9 + Math.random() * 0.2));
        this._applyHitToMob(mob, key, action.name, mDmg, res, i === 0);
      }

      // Rune visual triggers!
      if (runeKeys.has('bounce') && this.mobs.length > 1) {
        for (let i = 0; i < Math.min(3, this.mobs.length - 1); i++) {
          this._spawnLightning(this.mobs[i].x, this.mobs[i].y - 35, this.mobs[i + 1].x, this.mobs[i + 1].y - 35, elCol(res.el).hex, 0.32);
        }
      }
      if (runeKeys.has('echo') && !action._isEcho) {
        this.echoQueue.push({ delay: 0.6, key, action: Object.assign({}, action, { _isEcho: true, mul: action.mul * 0.45 }), mob: primary });
      }
      if (runeKeys.has('linger')) {
        this.lingerZones.push({ x: primary.x, y: primary.y, r: runeKeys.has('wide') ? 95 : 65, color: elCol(res.el).hex, life: 3.0, tick: 0.9, dmg: Math.round(res.dmg * 0.18), el: res.el });
      }
      if (runeKeys.has('skyfall')) {
        this._spawnMeteor(primary.x + (Math.random() - 0.5) * 40, primary.y - 20, '#fde047', '#f59e0b');
      }
      if (runeKeys.has('curse')) {
        primary.statuses.curse = 5.0;
        this.vfx.push({ type: 'sigil', x: primary.x, y: primary.y - 95, color: '#c084fc', life: 0.85, maxLife: 0.85 });
      }
      if (runeKeys.has('corrode') || runeKeys.has('venom')) primary.statuses.poison = 5.0;
      if (runeKeys.has('wildfire') || runeKeys.has('spmeteor')) {
        primary.statuses.burn = 4.0;
        if (Math.random() < 0.4) this._spawnMeteor(primary.x, primary.y - 15, '#ff7a3d', '#fbbf24');
      }
      if (runeKeys.has('frostbite') || runeKeys.has('spfrost')) {
        primary.statuses.chill = 4.0;
        this.vfx.push({ type: 'ring', x: primary.x, y: primary.y - 10, r: 8, maxR: 75, color: '#67e8f9', life: 0.4, maxLife: 0.4, lw: 3 });
      }
      if (runeKeys.has('arc') || runeKeys.has('spthunder') || runeKeys.has('splord')) {
        primary.statuses.shock = 3.5;
        this._spawnLightning(primary.x, 30, primary.x, primary.y - 20, '#bef264', 0.32);
      }
    }

    _applyHitToMob(mob, key, name, dmg, res, isPrimary) {
      if (res.miss) {
        if (isPrimary) this.spawnFloat(mob.x, mob.y - 68, 'MISS', 'miss');
        return;
      }
      mob.hp -= dmg;
      mob.hitFlash = 0.14;
      mob.knockX = res.crit ? 14 : 7;
      if (res.crit && isPrimary) this.screenShake = Math.max(this.screenShake, 5);

      this.totalDamage += dmg;
      this.dmgWindow.push({ t: this.combatElapsed, dmg });
      if (dmg > this.maxHit) this.maxHit = dmg;

      // Record breakdown
      if (!this.breakdown[key]) this.breakdown[key] = { id: key, name, el: res.el, totalDmg: 0, casts: 0, crits: 0, maxHit: 0 };
      const br = this.breakdown[key];
      br.totalDmg += dmg;
      if (isPrimary) br.casts++;
      if (res.crit && isPrimary) br.crits++;
      if (dmg > br.maxHit) br.maxHit = dmg;

      // Multi-hit visual staggered numbers!
      const showHits = Math.min(4, Math.max(1, res.runeSummary && res.runeSummary.extraFactor > 1.5 ? 2 : 1));
      const per = Math.max(1, Math.round(dmg / showHits));
      for (let h = 0; h < showHits; h++) {
        const ox = (Math.random() - 0.5) * 44;
        const oy = -65 - h * 18 + (Math.random() - 0.5) * 10;
        const style = res.crit ? 'crit' : (res.el === 'magic' || res.el === 'water' || res.el === 'wind' || res.el === 'holy' || res.el === 'shadow' ? 'magic' : 'phys');
        this.spawnFloat(mob.x + ox, mob.y + oy, res.crit ? `${per.toLocaleString()}!` : per.toLocaleString(), style, elCol(res.el).hex);
      }

      // Leech heal
      if (this.stats.leech > 0 && isPrimary) {
        const heal = Math.round(dmg * (this.stats.leech / 100));
        if (heal > 0) {
          this.hero.hp = Math.min(this.hero.maxHp, this.hero.hp + heal);
          if (heal >= 15) this.spawnFloat(this.hero.x + (Math.random() - 0.5) * 20, this.hero.y - 68, `+${heal}`, 'heal');
        }
      }

      // Armor break
      if (mob.breakLeft <= 0 && mob.maxArm > 0 && isPrimary) {
        mob.arm -= res.armBreakDmg;
        if (mob.arm <= 0) {
          mob.breakLeft = 6.0;
          mob.arm = mob.maxArm;
          this.armorBreaks++;
          this.screenShake = 9;
          this.vfx.push({ type: 'ring', x: mob.x, y: mob.y - 30, r: 10, maxR: 130, color: '#fbbf24', life: 0.6, maxLife: 0.6, lw: 6 });
          this.vfx.push({ type: 'banner', text: '💥 ARMOR BREAK! (+30% DMG)', x: mob.x, y: mob.y - 108, color: '#fbbf24', life: 1.2, maxLife: 1.2 });
          this._pushLog(`💥 เกราะ ${this.target.name} แตก! ดาเมจ +30% (6 วิ)`);
        }
      }

      // Mob death & instant respawn
      if (mob.hp <= 0) {
        this.kills++;
        this._spawnSparks(mob.x, mob.y - 30, 18, '#fbbf24');
        this.vfx.push({ type: 'banner', text: `☠️ สังหาร ${this.target.name}!`, x: mob.x, y: mob.y - 90, color: '#fde047', life: 1.1, maxLife: 1.1 });
        this._pushLog(`☠️ สังหาร ${this.target.name} สำเร็จ! (รวม ${this.kills} ตัว)`);
        mob.hp = mob.maxHp;
        mob.hpTrail = mob.maxHp;
        mob.arm = mob.maxArm;
        mob.breakLeft = 0;
      }
    }

    // =========================================================================
    // FULL SKILL & RUNE VFX SPAWNER
    // =========================================================================
    _spawnActionVfx(key, action, targetMob, res, runeKeys) {
      const col = elCol(action.el || res.el);
      const sx = this.hero.x + 28, sy = this.hero.y - 36;
      const tx = targetMob.x, ty = targetMob.y - 32;
      const wideK = runeKeys.has('wide') ? 1.35 : (runeKeys.has('focus') ? 0.78 : 1.0);
      const splitExtra = runeKeys.has('split') ? 2 : 0;

      // 1. Puppeteer Strings / Dance / Theatre
      if (/^pp_/.test(key) || this.stats.wtype === 'puppet' || this.stats.wtype === 'wire') {
        for (let i = 0; i < 4 + splitExtra; i++) {
          this.vfx.push({
            type: 'wire', x1: sx, y1: sy + (i - 1.5) * 10,
            x2: tx + (Math.random() - 0.5) * 50, y2: ty + (Math.random() - 0.5) * 45,
            color: key === 'pp_theatre' ? '#f472b6' : '#c084fc', life: 0.34, maxLife: 0.34,
          });
        }
        if (key === 'pp_dance' || key === 'pp_theatre' || key === 'pp_bind') {
          this.vfx.push({ type: 'vortex', x: tx, y: ty, r: 58 * wideK, color: '#c084fc', life: 0.55, maxLife: 0.55 });
        }
        this._spawnSparks(tx, ty, 10, '#e879f9');
        return;
      }

      // 2. Bard Music Notes & Harmonic Waves
      if (/^bd_/.test(key) || this.stats.wtype === 'instrument') {
        const notes = ['♪', '♫', '♬'];
        for (let i = 0; i < 5 + splitExtra; i++) {
          this.vfx.push({
            type: 'note', char: notes[i % 3],
            x: sx + i * 16, y: sy - 10 + (Math.random() - 0.5) * 30,
            vx: (tx - sx) * 2.2 + (Math.random() - 0.5) * 60, vy: -50 + Math.random() * 80,
            color: ['#fde047', '#f472b6', '#67e8f9', '#a78bfa'][i % 4], life: 0.55, maxLife: 0.55,
          });
        }
        this.vfx.push({ type: 'ring', x: tx, y: ty, r: 12, maxR: 85 * wideK, color: '#fde047', life: 0.45, maxLife: 0.45, lw: 3 });
        return;
      }

      // 3. Fire Meteors / Flame Blasts
      if (action.el === 'fire' || /meteor|fire|flame|inferno|magnum/i.test(key)) {
        const cnt = action.aoe ? 3 : 1 + splitExtra;
        for (let i = 0; i < cnt; i++) {
          this._spawnMeteor(tx + (i - (cnt - 1) / 2) * 42, ty + (Math.random() - 0.5) * 20, '#ff7a3d', '#fde047');
        }
        this.vfx.push({ type: 'ring', x: tx, y: ty, r: 10, maxR: 92 * wideK, color: '#ff7a3d', life: 0.45, maxLife: 0.45, lw: 5 });
        return;
      }

      // 4. Wind / Lightning Chain & Thunder
      if (action.el === 'wind' || /thunder|chain|storm|lightning/i.test(key)) {
        this._spawnLightning(sx, sy, tx, ty, '#7fd67a', 0.35);
        this._spawnLightning(tx, 15, tx, ty + 15, '#e0f2fe', 0.35);
        for (let i = 1; i < Math.min(4, this.mobs.length); i++) {
          this._spawnLightning(this.mobs[i - 1].x, this.mobs[i - 1].y - 30, this.mobs[i].x, this.mobs[i].y - 30, '#bef264', 0.35);
        }
        this._spawnSparks(tx, ty, 12, '#bef264');
        return;
      }

      // 5. Water / Ice Lances & Blizzard
      if (action.el === 'water' || /frost|ice|cold|blizzard|water/i.test(key)) {
        const cnt = 3 + splitExtra;
        for (let i = 0; i < cnt; i++) {
          const ang = Math.atan2(ty - sy, tx - sx) + (i - (cnt - 1) / 2) * 0.15;
          this.vfx.push({ type: 'lance', x: sx, y: sy, vx: Math.cos(ang) * 760, vy: Math.sin(ang) * 760, ang, color: '#67e8f9', life: 0.36, maxLife: 0.36 });
        }
        this.vfx.push({ type: 'ring', x: tx, y: ty, r: 8, maxR: 88 * wideK, color: '#5aa9ff', life: 0.48, maxLife: 0.48, lw: 4 });
        this._spawnSparks(tx, ty, 10, '#a5f3fc');
        return;
      }

      // 6. Holy Cross / Sanctuary / Radiant Beams
      if (action.el === 'holy' || /holy|pal_|magnus|lk_|bi_|sanct|cross|dawn/i.test(key)) {
        this.vfx.push({ type: 'pillar', x: tx, y: ty, w: 54 * wideK, color: '#ffe07a', life: 0.55, maxLife: 0.55 });
        this.vfx.push({ type: 'cross', x: tx, y: ty, size: 52 * wideK, color: '#fef08a', life: 0.5, maxLife: 0.5 });
        this.vfx.push({ type: 'ring', x: tx, y: ty + 18, r: 12, maxR: 96 * wideK, color: '#fde047', life: 0.5, maxLife: 0.5, lw: 3 });
        return;
      }

      // 7. Poison / Shadow / Ghost / Earth
      if (action.el === 'poison' || /venom|poison/i.test(key)) {
        this.vfx.push({ type: 'ring', x: tx, y: ty, r: 10, maxR: 84 * wideK, color: '#b36ee0', life: 0.55, maxLife: 0.55, lw: 5 });
        this._spawnSparks(tx, ty, 14, '#86efac');
        return;
      }
      if (action.el === 'earth' || /quake|earth|rock/i.test(key)) {
        this.vfx.push({ type: 'ring', x: tx, y: ty + 20, r: 10, maxR: 96 * wideK, color: '#c08a4a', life: 0.5, maxLife: 0.5, lw: 6 });
        this._spawnSparks(tx, ty + 10, 14, '#fde68a');
        return;
      }

      // 8. Ranged Projectile (Bow / Gun / Magic Bolt) vs Melee Slash Arc
      if (this.stats.isRanged || this.stats.isMagic || action.kind === 'magic' || action.kind === 'card') {
        const cnt = 1 + splitExtra + (this.stats.wtype === 'shotgun' ? 3 : 0);
        for (let i = 0; i < cnt; i++) {
          const ang = Math.atan2(ty - sy, tx - sx) + (i - (cnt - 1) / 2) * 0.14;
          this.vfx.push({ type: 'bolt', x: sx, y: sy, vx: Math.cos(ang) * 860, vy: Math.sin(ang) * 860, ang, color: col.hex, life: 0.34, maxLife: 0.34 });
        }
        this.vfx.push({ type: 'ring', x: tx, y: ty, r: 6, maxR: 60 * wideK, color: col.hex, life: 0.35, maxLife: 0.35, lw: 3 });
      } else {
        // Crisp melee slash crescent on target!
        this.vfx.push({ type: 'slash', x: tx - 14, y: ty, r: (action.kind === 'basic' ? 42 : 66) * wideK, color: col.hex, life: 0.28, maxLife: 0.28, big: action.kind !== 'basic' });
        this._spawnSparks(tx, ty, action.kind === 'basic' ? 6 : 12, col.glow);
      }
    }

    _spawnMeteor(tx, ty, color, glow) {
      this.vfx.push({ type: 'meteor', sx: tx - 110, sy: 10, tx, ty, color, glow, life: 0.38, maxLife: 0.38 });
    }

    _spawnLightning(x1, y1, x2, y2, color, life) {
      const pts = [{ x: x1, y: y1 }];
      const segs = 6;
      for (let i = 1; i < segs; i++) {
        const f = i / segs;
        pts.push({
          x: x1 + (x2 - x1) * f + (Math.random() - 0.5) * 26,
          y: y1 + (y2 - y1) * f + (Math.random() - 0.5) * 26,
        });
      }
      pts.push({ x: x2, y: y2 });
      this.vfx.push({ type: 'lightning', pts, color, life: life || 0.3, maxLife: life || 0.3 });
    }

    _spawnSparks(x, y, count, color) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 60 + Math.random() * 170;
        this.vfx.push({ type: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, r: 2 + Math.random() * 3, color, life: 0.35 + Math.random() * 0.25, maxLife: 0.6 });
      }
    }

    spawnFloat(x, y, text, style, accent) {
      this.floats.push({
        x, y, vx: (Math.random() - 0.5) * 28, vy: style === 'crit' ? -88 : -64,
        text: String(text), style: style || 'phys', accent: accent || '#fff',
        life: style === 'crit' ? 1.15 : 0.9, maxLife: style === 'crit' ? 1.15 : 0.9,
      });
    }

    _pushLog(text) {
      const sec = this.combatElapsed.toFixed(1) + 's';
      this.log.unshift({ t: sec, text });
      if (this.log.length > 25) this.log.length = 25;
    }

    // =========================================================================
    // SIMULATION TICK (60 FPS)
    // =========================================================================
    update(rawDt) {
      const dt = this.playing ? rawDt * this.speed : 0;
      this.time += rawDt;

      // Ambient fireflies/embers always animate softly
      for (const a of this.ambient) {
        a.x += a.vx * rawDt;
        a.y += a.vy * rawDt;
        if (a.y < 20) { a.y = this.height - 20; a.x = Math.random() * this.width; }
        if (a.x < 0) a.x = this.width;
        if (a.x > this.width) a.x = 0;
      }

      if (!this.playing || !this.build || !this.stats || !this.target) return;

      this.combatElapsed += dt;
      if (this.screenShake > 0) this.screenShake = Math.max(0, this.screenShake - rawDt * 28);
      if (this.hero.lunge > 0) this.hero.lunge = Math.max(0, this.hero.lunge - dt * 130);
      if (this.hero.hurtFlash > 0) this.hero.hurtFlash = Math.max(0, this.hero.hurtFlash - rawDt);
      if (this.hero.castAnim > 0) this.hero.castAnim = Math.max(0, this.hero.castAnim - rawDt);
      if (this.hero.swingAlpha > 0) { this.hero.swingAlpha = Math.max(0, this.hero.swingAlpha - rawDt * 3.8); this.hero.swingAngle += rawDt * 11; }
      this.hero.x = this.hero.baseX + this.hero.lunge;

      // Cooldowns & regen
      this.gcdLeft = Math.max(0, this.gcdLeft - dt);
      this.basicCdLeft = Math.max(0, this.basicCdLeft - dt);
      for (const k of Object.keys(this.skillCds)) this.skillCds[k] = Math.max(0, this.skillCds[k] - dt);
      for (let i = 0; i < 2; i++) this.cardCds[i] = Math.max(0, this.cardCds[i] - dt);
      if (!this.hero.dead) {
        this.hero.hp = Math.min(this.hero.maxHp, this.hero.hp + this.stats.hpRegen * dt);
        this.hero.sp = Math.min(this.hero.maxSp, this.hero.sp + this.stats.spRegen * dt);
      }

      // Echo delayed recasts
      for (let i = this.echoQueue.length - 1; i >= 0; i--) {
        const eq = this.echoQueue[i];
        eq.delay -= dt;
        if (eq.delay <= 0) {
          this.echoQueue.splice(i, 1);
          this.vfx.push({ type: 'ring', x: eq.mob.x, y: eq.mob.y - 25, r: 10, maxR: 75, color: '#c084fc', life: 0.35, maxLife: 0.35, lw: 3 });
          this._executeAttackAction(eq.key, eq.action, []);
        }
      }

      // Linger ground DoT zones
      for (let i = this.lingerZones.length - 1; i >= 0; i--) {
        const z = this.lingerZones[i];
        z.life -= dt;
        z.tick -= dt;
        if (z.tick <= 0 && this.mobs[0]) {
          z.tick = 1.0;
          this._applyHitToMob(this.mobs[0], 'rune_linger', '🟣 รูนค้าง (Linger)', z.dmg, { miss: false, crit: false, el: z.el, armBreakDmg: 2 }, true);
        }
        if (z.life <= 0) this.lingerZones.splice(i, 1);
      }

      // Auto-Rotation AI
      if (this.autoRot && !this.hero.dead && this.gcdLeft <= 0) {
        let didCast = false;
        for (let i = 0; i < 2; i++) {
          if (this.build.cards.act[i] && this.cardCds[i] <= 0) {
            if (this.castCardSlot(i)) { didCast = true; break; }
          }
        }
        if (!didCast) {
          for (const sid of (this.build.rotation || [])) {
            if ((this.skillCds[sid] || 0) <= 0) {
              if (this.castSkillById(sid)) { didCast = true; break; }
            }
          }
        }
        if (!didCast && this.basicCdLeft <= 0) this.castBasic();
      }

      // Update mobs + boss attack telegraph
      for (const m of this.mobs) {
        if (m.hitFlash > 0) m.hitFlash = Math.max(0, m.hitFlash - rawDt);
        if (m.knockX > 0) m.knockX = Math.max(0, m.knockX - rawDt * 60);
        if (m.breakLeft > 0) m.breakLeft = Math.max(0, m.breakLeft - dt);
        m.hpTrail += (m.hp - m.hpTrail) * Math.min(1, rawDt * 7);
        m.x = m.baseX + m.knockX;
        for (const sk of Object.keys(m.statuses)) {
          m.statuses[sk] -= dt;
          if (m.statuses[sk] <= 0) delete m.statuses[sk];
        }
        // Boss attacks (primary mob attacks with red ground telegraph)
        if (this.env.bossAttacks && m.uid === 0 && !this.hero.dead) {
          m.atkTimer -= dt;
          if (m.atkTimer <= 0.65 && m.atkTimer > 0) {
            m.telegraph = 1 - (m.atkTimer / 0.65);
          } else if (m.atkTimer <= 0) {
            m.telegraph = 0;
            m.atkTimer = this.target.boss ? 2.1 : 2.5;
            this._mobStrikeHero();
          }
        } else {
          m.telegraph = 0;
        }
      }

      // Update VFX & Floats
      for (let i = this.vfx.length - 1; i >= 0; i--) {
        const v = this.vfx[i];
        v.life -= rawDt;
        if (v.vx) v.x += v.vx * rawDt;
        if (v.vy) v.y += v.vy * rawDt;
        if (v.type === 'spark') v.vy += 320 * rawDt;
        if (v.life <= 0) this.vfx.splice(i, 1);
      }
      for (let i = this.floats.length - 1; i >= 0; i--) {
        const f = this.floats[i];
        f.life -= rawDt;
        f.x += f.vx * rawDt;
        f.y += f.vy * rawDt;
        f.vy += 95 * rawDt;
        if (f.life <= 0) this.floats.splice(i, 1);
      }

      // Prune rolling 5s DPS window
      const cutoff = this.combatElapsed - 5.0;
      while (this.dmgWindow.length && this.dmgWindow[0].t < cutoff) this.dmgWindow.shift();

      this._hudAccum += rawDt;
      if (this._hudAccum >= 0.12) {
        this._hudAccum = 0;
        this._emitHud();
      }
    }

    _mobStrikeHero() {
      const dodgeCh = Math.min(0.85, Math.max(0.05, (this.stats.flee - this.target.hit + 20) / 100));
      const pdodgeCh = this.stats.pdodge / 100;
      if (Math.random() < pdodgeCh) {
        this.spawnFloat(this.hero.x, this.hero.y - 72, 'PERFECT!', 'dodge');
        return;
      }
      if (Math.random() < dodgeCh) {
        this.spawnFloat(this.hero.x, this.hero.y - 72, 'DODGE', 'dodge');
        return;
      }
      const rawAtk = this.target.atk[0] + (this.target.atk[1] - this.target.atk[0]) * Math.random();
      const defK = 100 / (100 + (this.stats.def + this.stats.vdef) * 1.4);
      const elRes = 1 - Math.min(0.75, (this.stats.resist[this.target.atkEl] || 0) / 100);
      const takenK = 1 - (this.stats.taken / 100);
      const inc = Math.max(1, Math.round(rawAtk * defK * elRes * takenK * (this.target.boss ? 1.15 : 1.0)));

      this.hero.hurtFlash = 0.2;
      this.screenShake = Math.max(this.screenShake, 4);
      this.vfx.push({ type: 'ring', x: this.hero.x, y: this.hero.y - 24, r: 8, maxR: 65, color: '#ef4444', life: 0.35, maxLife: 0.35, lw: 4 });
      this.spawnFloat(this.hero.x, this.hero.y - 68, `-${inc}`, 'enemy');

      if (!this.env.godMode) {
        this.hero.hp -= inc;
        if (this.hero.hp <= 0) {
          this.hero.hp = 0;
          this.hero.dead = true;
          this.vfx.push({ type: 'banner', text: '💀 ตัวละครล้มลง! (กดรีเซ็ตหรือเปิดอมตะ)', x: this.width * 0.5, y: this.height * 0.45, color: '#f87171', life: 2.2, maxLife: 2.2 });
          this._pushLog(`💀 ตัวละครตายที่ ${this.combatElapsed.toFixed(1)}s`);
        }
      }
    }

    _emitHud() {
      const avgDps = this.combatElapsed > 0.2 ? Math.round(this.totalDamage / this.combatElapsed) : 0;
      const winSum = this.dmgWindow.reduce((s, x) => s + x.dmg, 0);
      const winDur = Math.min(5.0, Math.max(0.5, this.combatElapsed));
      const curDps = Math.round(winSum / winDur);
      this.onTickHud({
        elapsedSec: Math.round(this.combatElapsed * 10) / 10,
        avgDps,
        curDps,
        totalDamage: this.totalDamage,
        kills: this.kills,
        armorBreaks: this.armorBreaks,
        maxHit: this.maxHit,
        heroHp: Math.round(this.hero.hp),
        heroMaxHp: this.hero.maxHp,
        heroDead: this.hero.dead,
        skillCds: this.skillCds,
        skillCdFull: this.skillCdFull,
        cardCds: this.cardCds,
        cardCdFull: this.cardCdFull,
        breakdown: Object.values(this.breakdown).sort((a, b) => b.totalDmg - a.totalDmg),
        log: this.log,
      });
    }

    // =========================================================================
    // 60 FPS NIGHTCAMP RENDERER
    // =========================================================================
    render() {
      const ctx = this.ctx;
      const W = this.width, H = this.height;
      ctx.save();
      ctx.scale(this.dpr, this.dpr);

      // Screen shake
      if (this.screenShake > 0.2) {
        ctx.translate((Math.random() - 0.5) * this.screenShake, (Math.random() - 0.5) * this.screenShake);
      }

      // 1. Nightcamp Arena Backdrop
      const theme = ARENA_THEMES[this.env.theme] || ARENA_THEMES.woods;
      const skyArr = this.env.night ? theme.skyNight : theme.skyDay;
      const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.58);
      skyGrad.addColorStop(0, skyArr[0]);
      skyGrad.addColorStop(0.6, skyArr[1]);
      skyGrad.addColorStop(1, skyArr[2]);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, H);

      // Moon or Sun glow
      const orbX = W * 0.14, orbY = 58;
      const orbGlow = ctx.createRadialGradient(orbX, orbY, 4, orbX, orbY, 64);
      orbGlow.addColorStop(0, this.env.night ? 'rgba(226,232,255,0.85)' : 'rgba(255,236,160,0.9)');
      orbGlow.addColorStop(0.3, this.env.night ? 'rgba(147,197,253,0.22)' : 'rgba(251,191,36,0.28)');
      orbGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = orbGlow;
      ctx.beginPath(); ctx.arc(orbX, orbY, 64, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = this.env.night ? '#f1f5f9' : '#fef08a';
      ctx.beginPath(); ctx.arc(orbX, orbY, 15, 0, Math.PI * 2); ctx.fill();

      // Twinkling night stars
      if (this.env.night) {
        for (let i = 0; i < 24; i++) {
          const sx = (i * 97 + 41) % W;
          const sy = 14 + (i * 53) % (H * 0.38);
          const al = 0.25 + 0.55 * Math.abs(Math.sin(this.time * 1.6 + i));
          ctx.fillStyle = `rgba(255,250,230,${al.toFixed(2)})`;
          ctx.fillRect(sx, sy, 2, 2);
        }
      }

      // Ground plane with Nightcamp subtle isometric grid
      const horizonY = Math.round(H * 0.44);
      const gGrad = ctx.createLinearGradient(0, horizonY, 0, H);
      gGrad.addColorStop(0, this.env.night ? theme.groundNight : theme.groundDay);
      gGrad.addColorStop(1, '#0d1117');
      ctx.fillStyle = gGrad;
      ctx.fillRect(0, horizonY, W, H - horizonY);

      ctx.strokeStyle = theme.tileLine;
      ctx.lineWidth = 1;
      for (let y = horizonY; y < H; y += 26) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
      for (let x = -W * 0.5; x < W * 1.5; x += 68) {
        ctx.beginPath(); ctx.moveTo(W * 0.5 + (x - W * 0.5) * 0.4, horizonY); ctx.lineTo(x, H); ctx.stroke();
      }

      // Warm flickering campfire lantern glow in center-back
      const campX = W * 0.48, campY = horizonY + 18;
      const flick = 0.88 + 0.12 * Math.sin(this.time * 11);
      const campGlow = ctx.createRadialGradient(campX, campY, 3, campX, campY, 120 * flick);
      campGlow.addColorStop(0, theme.accent + '66');
      campGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = campGlow;
      ctx.beginPath(); ctx.arc(campX, campY, 120 * flick, 0, Math.PI * 2); ctx.fill();

      // 2. Ground Linger DoT Zones
      for (const z of this.lingerZones) {
        const pulse = 0.88 + 0.12 * Math.sin(this.time * 10);
        ctx.save();
        ctx.globalAlpha = Math.min(0.65, z.life * 0.5);
        ctx.strokeStyle = z.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(z.x, z.y + 8, z.r * pulse, z.r * 0.36 * pulse, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = z.color + '22';
        ctx.fill();
        ctx.restore();
      }

      // 3. Boss Attack Red Ground Telegraph under Hero
      const primaryMob = this.mobs[0];
      if (primaryMob && primaryMob.telegraph > 0) {
        const tg = primaryMob.telegraph;
        ctx.save();
        ctx.strokeStyle = `rgba(239,68,68,${0.4 + tg * 0.6})`;
        ctx.fillStyle = `rgba(239,68,68,${0.12 + tg * 0.22})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.ellipse(this.hero.x, this.hero.y + 8, 52, 20, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(this.hero.x, this.hero.y + 8, 52 * tg, 20 * tg, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }

      // 4. Draw Hero (with Real Wiki Job Sprite + Class Companions/Auras + HP/SP Bars)
      this._drawHero(ctx);

      // 5. Draw Monsters / Bosses (sorted by Y for clean 2.5D depth)
      const sortedMobs = this.mobs.slice().sort((a, b) => a.y - b.y);
      for (const m of sortedMobs) this._drawMob(ctx, m);

      // 6. Draw Skill & Rune VFX
      this._drawVfx(ctx);

      // 7. Ambient Fireflies / Embers
      for (const a of this.ambient) {
        const al = 0.25 + 0.45 * Math.sin(this.time * 3 + a.ph);
        ctx.fillStyle = theme.particle;
        ctx.globalAlpha = Math.max(0.08, al);
        ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;

      // 8. Draw Nightcamp Stylized Floating Damage Numbers
      this._drawFloats(ctx);

      // 9. Draw Authentic Nightcamp Top Boss HUD Bar!
      if (this.target && primaryMob) this._drawBossHud(ctx, primaryMob);

      ctx.restore();
    }

    _drawHero(ctx) {
      const h = this.hero;
      const bob = h.dead ? 0 : Math.sin(this.time * 4.5) * 3;
      const job = this.build && this.idx.jobsById[this.build.job];

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath(); ctx.ellipse(h.x, h.y + 10, 32, 11, 0, 0, Math.PI * 2); ctx.fill();

      // Magic Cast Circle under hero feet
      if (h.castAnim > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(0.85, h.castAnim * 2);
        ctx.strokeStyle = h.castColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.ellipse(h.x, h.y + 8, 46, 16, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(h.x, h.y + 8, 34, 11, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }

      // Class Visual Signatures!
      const jid = this.build ? this.build.job : '';
      if (jid === 'puppeteer' || jid === 'showmaster') {
        // Floating Battle Puppet + violet strings!
        const px = h.x + 56, py = h.y - 38 + Math.sin(this.time * 5.5) * 7;
        ctx.strokeStyle = 'rgba(192,132,252,0.55)';
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(h.x + 14, h.y - 42); ctx.quadraticCurveTo(h.x + 36, h.y - 68, px, py); ctx.stroke();
        ctx.fillStyle = '#3b1d5e';
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(px, py, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fde047';
        ctx.beginPath(); ctx.arc(px - 4, py - 2, 2.2, 0, Math.PI * 2); ctx.arc(px + 4, py - 2, 2.2, 0, Math.PI * 2); ctx.fill();
      } else if (['archmage', 'firemage', 'icemage', 'warlock', 'starcore', 'winterlord', 'astral', 'hexlord'].includes(jid)) {
        // 3 orbiting elemental orbs!
        const orbCols = ['#ff7a3d', '#5aa9ff', '#7fd67a'];
        for (let i = 0; i < 3; i++) {
          const ang = this.time * 2.8 + (i * Math.PI * 2) / 3;
          const ox = h.x + Math.cos(ang) * 44;
          const oy = h.y - 36 + Math.sin(ang) * 16;
          ctx.fillStyle = orbCols[i];
          ctx.shadowColor = orbCols[i]; ctx.shadowBlur = 10;
          ctx.beginPath(); ctx.arc(ox, oy, 5.5, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
        }
      } else if (['paladin', 'bishop', 'lightkeeper', 'dawnwarden', 'starsaint', 'beacon'].includes(jid)) {
        // Warm radiant golden halo
        ctx.strokeStyle = 'rgba(254,240,138,0.45)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(h.x, h.y + 8, 38, 13, 0, 0, Math.PI * 2); ctx.stroke();
      }

      // Draw Hero Sprite from Wiki Jobs Atlas (96x96 crisp sprite!)
      ctx.save();
      if (h.dead) ctx.globalAlpha = 0.38;
      if (h.hurtFlash > 0) ctx.filter = 'brightness(1.8) saturate(2) hue-rotate(-30deg)';
      const spriteSize = 96;
      const drawn = job && job.ic && this.imgCache.drawAtlasCell(ctx, job.ic, h.x - spriteSize / 2, h.y - spriteSize + 14 + bob, spriteSize, spriteSize);
      if (!drawn) {
        // Crisp stylized fallback Nightcamp Hero
        ctx.fillStyle = '#38bdf8';
        ctx.strokeStyle = '#fef3c7';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(h.x, h.y - 32 + bob, 24, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      ctx.restore();

      // Weapon swing arc
      if (h.swingAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = h.swingAlpha;
        ctx.strokeStyle = elCol(this.stats && this.stats.atkElement).hex;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(h.x + 24, h.y - 34, 42, h.swingAngle - 1.0, h.swingAngle);
        ctx.stroke();
        ctx.restore();
      }

      // Hero Overhead Name + HP/SP Bars
      const barW = 74, bx = h.x - barW / 2, by = h.y - 98;
      ctx.font = '700 11px "Noto Sans Thai", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#0f172a';
      ctx.fillText((job && job.n && job.n.th) || 'Hero', h.x + 1, by - 5);
      ctx.fillStyle = '#fef3c7';
      ctx.fillText(`${(job && job.n && job.n.th) || 'Hero'} Lv.${(this.build && this.build.lv) || 1}`, h.x, by - 6);

      // HP bar
      ctx.fillStyle = 'rgba(15,23,42,0.85)';
      ctx.fillRect(bx - 1, by - 1, barW + 2, 8);
      const hpFrac = Math.max(0, Math.min(1, h.hp / Math.max(1, h.maxHp)));
      ctx.fillStyle = this.env.godMode ? '#fbbf24' : '#ef4444';
      ctx.fillRect(bx, by, barW * hpFrac, 6);
      // SP bar
      ctx.fillStyle = 'rgba(15,23,42,0.85)';
      ctx.fillRect(bx - 1, by + 7, barW + 2, 5);
      const spFrac = Math.max(0, Math.min(1, h.sp / Math.max(1, h.maxSp)));
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(bx, by + 8, barW * spFrac, 3);
    }

    _drawMob(ctx, m) {
      const bob = Math.sin(this.time * 3.6 + m.bobOff) * 3;
      const isBoss = this.target && this.target.boss;
      const scale = isBoss && this.mobs.length === 1 ? 132 : (this.mobs.length > 4 ? 76 : 98);

      // Shadow + Boss Aura
      ctx.fillStyle = 'rgba(0,0,0,0.48)';
      ctx.beginPath(); ctx.ellipse(m.x, m.y + 10, scale * 0.38, scale * 0.13, 0, 0, Math.PI * 2); ctx.fill();
      if (isBoss) {
        const aura = ctx.createRadialGradient(m.x, m.y + 8, 6, m.x, m.y + 8, scale * 0.55);
        aura.addColorStop(0, m.breakLeft > 0 ? 'rgba(251,191,36,0.45)' : 'rgba(192,132,252,0.38)');
        aura.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = aura;
        ctx.beginPath(); ctx.ellipse(m.x, m.y + 8, scale * 0.55, scale * 0.22, 0, 0, Math.PI * 2); ctx.fill();
      }

      // Draw full-res monster art or wiki_mons atlas
      ctx.save();
      if (m.hitFlash > 0) ctx.filter = 'brightness(2.2)';
      const fullImg = this.target && this.target.img ? this.imgCache.getMonsterFull(this.target.img) : null;
      let drawn = false;
      if (fullImg) {
        const aspect = fullImg.naturalWidth / Math.max(1, fullImg.naturalHeight);
        const dh = scale;
        const dw = Math.min(scale * 1.4, dh * aspect);
        // Flip horizontally to face hero on left
        ctx.translate(m.x, m.y - dh + 18 + bob);
        ctx.scale(-1, 1);
        ctx.drawImage(fullImg, -dw / 2, 0, dw, dh);
        drawn = true;
      } else if (this.target && this.target.ic) {
        drawn = this.imgCache.drawAtlasCell(ctx, this.target.ic, m.x - scale / 2, m.y - scale + 18 + bob, scale, scale);
      }
      if (!drawn) {
        // Custom Training Dummy / Fallback Monster
        ctx.fillStyle = isBoss ? '#7c3aed' : '#92400e';
        ctx.strokeStyle = '#fde68a';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(m.x, m.y - scale * 0.4 + bob, scale * 0.28, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fef3c7';
        ctx.font = '800 18px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(isBoss ? '👑' : '🎯', m.x, m.y - scale * 0.34 + bob);
      }
      ctx.restore();

      // Status icons above mob
      const stIcons = [];
      if (m.breakLeft > 0) stIcons.push('💥');
      if (m.statuses.burn) stIcons.push('🔥');
      if (m.statuses.chill) stIcons.push('❄️');
      if (m.statuses.shock) stIcons.push('⚡');
      if (m.statuses.poison) stIcons.push('☠️');
      if (m.statuses.curse) stIcons.push('👁️');
      if (stIcons.length) {
        ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(stIcons.join(' '), m.x, m.y - scale + 4);
      }

      // Per-mob mini HP bar (when >1 target or non-boss)
      if (this.mobs.length > 1 || !isBoss) {
        const bw = 64, bx = m.x - bw / 2, by = m.y + 15;
        ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(bx - 1, by - 1, bw + 2, 7);
        ctx.fillStyle = '#f97316'; ctx.fillRect(bx, by, bw * Math.max(0, m.hpTrail / m.maxHp), 5);
        ctx.fillStyle = '#ef4444'; ctx.fillRect(bx, by, bw * Math.max(0, m.hp / m.maxHp), 5);
      }
    }

    _drawBossHud(ctx, mob) {
      const W = this.width;
      const bw = Math.min(440, W - 40);
      const bx = (W - bw) / 2, by = 14;
      const t = this.target;
      const elI = this.engine.ELEMENT_INFO[t.el] || this.engine.ELEMENT_INFO.neutral;

      // Nightcamp parchment-dark top boss plate
      ctx.save();
      ctx.fillStyle = 'rgba(18, 16, 30, 0.86)';
      ctx.strokeStyle = t.boss ? 'rgba(251, 191, 36, 0.7)' : 'rgba(148, 163, 184, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(bx - 10, by - 6, bw + 20, 50, 10); ctx.fill(); ctx.stroke();

      // Name + Level + Element Badge
      ctx.font = '800 12.5px "Noto Sans Thai", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = t.boss ? '#fde68a' : '#f1f5f9';
      ctx.fillText(`${t.boss ? '👑 ' : '🎯 '}${t.name}  Lv.${t.lv}`, bx, by + 10);

      ctx.textAlign = 'right';
      ctx.font = '700 11px "Noto Sans Thai", sans-serif';
      ctx.fillStyle = elI.color;
      ctx.fillText(`${elI.th} · DEF ${t.def} / MDEF ${t.mdef}`, bx + bw, by + 10);

      // HP Bar with smooth orange damage trail
      const hpY = by + 16, hpH = 13;
      ctx.fillStyle = '#090d16';
      ctx.beginPath(); ctx.roundRect(bx, hpY, bw, hpH, 5); ctx.fill();
      const trailF = Math.max(0, Math.min(1, mob.hpTrail / Math.max(1, mob.maxHp)));
      const hpF = Math.max(0, Math.min(1, mob.hp / Math.max(1, mob.maxHp)));
      ctx.fillStyle = '#fb923c';
      ctx.beginPath(); ctx.roundRect(bx, hpY, bw * trailF, hpH, 5); ctx.fill();
      const hpGrad = ctx.createLinearGradient(bx, hpY, bx + bw, hpY);
      hpGrad.addColorStop(0, '#dc2626'); hpGrad.addColorStop(1, '#f43f5e');
      ctx.fillStyle = hpGrad;
      ctx.beginPath(); ctx.roundRect(bx, hpY, bw * hpF, hpH, 5); ctx.fill();

      ctx.textAlign = 'center';
      ctx.font = '700 10px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${Math.max(0, Math.round(mob.hp)).toLocaleString()} / ${mob.maxHp.toLocaleString()} (${Math.round(hpF * 100)}%)`, bx + bw / 2, hpY + 10);

      // Armor Break Bar underneath
      const armY = hpY + 16, armH = 6;
      ctx.fillStyle = '#0f172a';
      ctx.beginPath(); ctx.roundRect(bx, armY, bw, armH, 3); ctx.fill();
      if (mob.breakLeft > 0) {
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath(); ctx.roundRect(bx, armY, bw * (mob.breakLeft / 6.0), armH, 3); ctx.fill();
      } else {
        const armF = Math.max(0, Math.min(1, mob.arm / Math.max(1, mob.maxArm)));
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath(); ctx.roundRect(bx, armY, bw * armF, armH, 3); ctx.fill();
      }
      ctx.restore();
    }

    _drawVfx(ctx) {
      for (const v of this.vfx) {
        const f = Math.max(0, Math.min(1, v.life / v.maxLife));
        const p = 1 - f;
        ctx.save();
        ctx.globalAlpha = f;
        switch (v.type) {
          case 'ring': {
            const curR = v.r + (v.maxR - v.r) * p;
            ctx.strokeStyle = v.color;
            ctx.lineWidth = (v.lw || 3) * f;
            ctx.beginPath(); ctx.ellipse(v.x, v.y, curR, curR * 0.48, 0, 0, Math.PI * 2); ctx.stroke();
            break;
          }
          case 'slash': {
            ctx.strokeStyle = v.color;
            ctx.shadowColor = v.color; ctx.shadowBlur = 12;
            ctx.lineWidth = (v.big ? 9 : 6) * f;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(v.x, v.y, v.r * (0.7 + p * 0.4), -1.1, 1.0);
            ctx.stroke();
            break;
          }
          case 'bolt':
          case 'lance': {
            ctx.translate(v.x, v.y);
            ctx.rotate(v.ang || 0);
            ctx.fillStyle = v.color;
            ctx.shadowColor = v.color; ctx.shadowBlur = 10;
            ctx.beginPath();
            if (v.type === 'lance') { ctx.moveTo(22, 0); ctx.lineTo(-14, -5); ctx.lineTo(-8, 0); ctx.lineTo(-14, 5); }
            else { ctx.ellipse(0, 0, 14, 4, 0, 0, Math.PI * 2); }
            ctx.fill();
            break;
          }
          case 'meteor': {
            const cx = v.sx + (v.tx - v.sx) * p;
            const cy = v.sy + (v.ty - v.sy) * p;
            const g = ctx.createLinearGradient(v.sx, v.sy, cx, cy);
            g.addColorStop(0, 'rgba(255,120,40,0)'); g.addColorStop(1, v.color);
            ctx.strokeStyle = g; ctx.lineWidth = 10; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(cx - (v.tx - v.sx) * 0.25, cy - (v.ty - v.sy) * 0.25); ctx.lineTo(cx, cy); ctx.stroke();
            ctx.fillStyle = v.glow; ctx.shadowColor = v.color; ctx.shadowBlur = 18;
            ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI * 2); ctx.fill();
            break;
          }
          case 'lightning': {
            ctx.strokeStyle = v.color; ctx.shadowColor = v.color; ctx.shadowBlur = 14;
            ctx.lineWidth = 3.5 * f;
            ctx.beginPath();
            v.pts.forEach((pt, idx) => idx === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y));
            ctx.stroke();
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.4 * f; ctx.stroke();
            break;
          }
          case 'pillar': {
            const g = ctx.createLinearGradient(v.x - v.w / 2, 0, v.x + v.w / 2, 0);
            g.addColorStop(0, 'rgba(255,224,122,0)');
            g.addColorStop(0.5, v.color);
            g.addColorStop(1, 'rgba(255,224,122,0)');
            ctx.fillStyle = g;
            ctx.fillRect(v.x - v.w / 2, 20, v.w, v.y + 10);
            break;
          }
          case 'cross': {
            ctx.strokeStyle = v.color; ctx.shadowColor = v.color; ctx.shadowBlur = 14;
            ctx.lineWidth = 7 * f; ctx.lineCap = 'round';
            const s = v.size * (0.75 + p * 0.35);
            ctx.beginPath(); ctx.moveTo(v.x, v.y - s); ctx.lineTo(v.x, v.y + s);
            ctx.moveTo(v.x - s * 0.75, v.y - s * 0.25); ctx.lineTo(v.x + s * 0.75, v.y - s * 0.25); ctx.stroke();
            break;
          }
          case 'wire': {
            ctx.strokeStyle = v.color; ctx.shadowColor = v.color; ctx.shadowBlur = 8;
            ctx.lineWidth = 2.2;
            ctx.beginPath(); ctx.moveTo(v.x1, v.y1); ctx.lineTo(v.x2, v.y2); ctx.stroke();
            break;
          }
          case 'vortex': {
            ctx.strokeStyle = v.color; ctx.lineWidth = 3 * f;
            for (let k = 0; k < 3; k++) {
              const a0 = this.time * 12 + k * 2.1;
              ctx.beginPath(); ctx.arc(v.x, v.y, v.r * (0.4 + k * 0.25), a0, a0 + 1.8); ctx.stroke();
            }
            break;
          }
          case 'note': {
            ctx.font = '800 22px sans-serif'; ctx.fillStyle = v.color;
            ctx.shadowColor = v.color; ctx.shadowBlur = 8;
            ctx.fillText(v.char, v.x, v.y);
            break;
          }
          case 'sigil': {
            ctx.font = '22px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('👁️', v.x, v.y - p * 12);
            break;
          }
          case 'spark': {
            ctx.fillStyle = v.color;
            ctx.beginPath(); ctx.arc(v.x, v.y, v.r * f, 0, Math.PI * 2); ctx.fill();
            break;
          }
          case 'banner': {
            ctx.font = '800 15px "Noto Sans Thai", sans-serif'; ctx.textAlign = 'center';
            ctx.strokeStyle = 'rgba(10,12,24,0.92)'; ctx.lineWidth = 4;
            ctx.strokeText(v.text, v.x, v.y - p * 18);
            ctx.fillStyle = v.color;
            ctx.fillText(v.text, v.x, v.y - p * 18);
            break;
          }
        }
        ctx.restore();
      }
    }

    _drawFloats(ctx) {
      ctx.save();
      ctx.textAlign = 'center';
      for (const fl of this.floats) {
        const f = Math.max(0, Math.min(1, fl.life / fl.maxLife));
        const age = 1 - f;
        const punch = fl.style === 'crit' && age < 0.16 ? 1 + (0.16 - age) * 3.5 : 1;
        ctx.save();
        ctx.globalAlpha = f < 0.25 ? f * 4 : 1;
        ctx.translate(fl.x, fl.y);
        ctx.scale(punch, punch);
        let size = 16, fill = '#ffffff', stroke = '#1e1b2e';
        if (fl.style === 'crit') { size = 23; fill = '#fde047'; stroke = '#7c2d12'; }
        else if (fl.style === 'magic') { size = 17; fill = fl.accent || '#7dd3fc'; stroke = '#0c4a6e'; }
        else if (fl.style === 'heal') { size = 15; fill = '#4ade80'; stroke = '#14532d'; }
        else if (fl.style === 'enemy') { size = 17; fill = '#f87171'; stroke = '#450a0a'; }
        else if (fl.style === 'dodge') { size = 13; fill = '#93c5fd'; stroke = '#1e3a8a'; }
        else if (fl.style === 'miss') { size = 13; fill = '#94a3b8'; stroke = '#0f172a'; }
        ctx.font = `900 ${size}px "Baloo 2", "Noto Sans Thai", sans-serif`;
        ctx.lineWidth = fl.style === 'crit' ? 4.5 : 3.2;
        ctx.strokeStyle = stroke;
        ctx.strokeText(fl.text, 0, 0);
        ctx.fillStyle = fill;
        ctx.fillText(fl.text, 0, 0);
        ctx.restore();
      }
      ctx.restore();
    }
  }

  root.NCBuildSimArena = BuildSimArena;
  root.NC_ARENA_THEMES = ARENA_THEMES;
})(typeof globalThis !== 'undefined' ? globalThis : window);
