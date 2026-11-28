/* Nightcamp SS2 Build Simulator — Full-Screen Playable Top-Down 2.5D Action-RPG Sandbox Engine
 * Real WASD / Click-to-Move / Shift-Dash movement across 2200x1600 Nightcamp maps,
 * REAL Nightcamp sprites (Jobs, Equipped Weapons, 482 Monsters / 52 Bosses from Wiki without CORS block),
 * real directional mouse-aimed projectiles/cleaves/AoEs, full Rune & Class VFX,
 * real Boss AI with dodgeable crimson telegraphs (Slam, Cone, Orb Barrage),
 * Auto-Battle AI with telegraph dodging, loot drops, and live Minimap rendering.
 */
(function (root) {
  'use strict';

  const WIKI_CDN = 'https://play.nightcamp.app/wiki';
  const WORLD_W = 2200;
  const WORLD_H = 1600;
  const TAU = Math.PI * 2;

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
    poison: {
      name: 'หมู่บ้านคนเก็บพิษ (Poison Village)',
      groundDay: '#2c273b', groundNight: '#1d1a2c',
      patchDay: '#252033', patchNight: '#171424',
      roadDay: '#3e354d', roadNight: '#292338',
      plazaDay: '#352e45', plazaNight: '#231e31',
      propKind: 'spore', accent: '#84cc16', particle: '#bef264',
    },
    woods: {
      name: 'ค่ายกลางป่า (Campfire Woods)',
      groundDay: '#466942', groundNight: '#20332b',
      patchDay: '#3d5e3a', patchNight: '#1a2b24',
      roadDay: '#8b7355', roadNight: '#43382e',
      plazaDay: '#7b7467', plazaNight: '#34323b',
      propKind: 'tree', accent: '#ff9b42', particle: '#fde68a',
    },
    pumpkin: {
      name: 'ไร่ฟักทอง (Pumpkin Patch)',
      groundDay: '#5b6639', groundNight: '#282c1f',
      patchDay: '#4e5830', patchNight: '#21241a',
      roadDay: '#947451', roadNight: '#473828',
      plazaDay: '#7c654a', plazaNight: '#392e25',
      propKind: 'pumpkin', accent: '#fb923c', particle: '#fdba74',
    },
    mine: {
      name: 'เหมืองมด (Ant Mine)',
      groundDay: '#524030', groundNight: '#2a2018',
      patchDay: '#453527', patchNight: '#221a13',
      roadDay: '#6d5640', roadNight: '#382c21',
      plazaDay: '#5e4c3b', plazaNight: '#30261e',
      propKind: 'crystal', accent: '#f59e0b', particle: '#fcd34d',
    },
    crypt: {
      name: 'สุสานใต้ดิน (Ancient Crypt)',
      groundDay: '#353146', groundNight: '#1d1a2a',
      patchDay: '#2d293c', patchNight: '#171422',
      roadDay: '#4b455e', roadNight: '#2a2638',
      plazaDay: '#454057', plazaNight: '#272336',
      propKind: 'grave', accent: '#a78bfa', particle: '#c4b5fd',
    },
    volcano: {
      name: 'ภูเขาไฟหลับไหล (Sleeping Volcano)',
      groundDay: '#432825', groundNight: '#241414',
      patchDay: '#38201e', patchNight: '#1c0f10',
      roadDay: '#593731', roadNight: '#331d1b',
      plazaDay: '#4e312d', plazaNight: '#2b1918',
      propKind: 'lava', accent: '#ff5733', particle: '#ff8a5b',
    },
    theatre: {
      name: 'โรงละครหุ่นเชิด (Puppet Theatre)',
      groundDay: '#3b2434', groundNight: '#1e121d',
      patchDay: '#311d2b', patchNight: '#180e17',
      roadDay: '#592e44', roadNight: '#331a29',
      plazaDay: '#4b2a3e', plazaNight: '#2b1725',
      propKind: 'stage', accent: '#e879f9', particle: '#f0abfc',
    },
  };

  function elCol(el) { return EL_COLORS[el] || EL_COLORS.neutral; }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function dist(x1, y1, x2, y2) { return Math.hypot(x2 - x1, y2 - y1); }

  function seededRand(seed) {
    let s = seed | 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  // IMPORTANT: Do NOT set img.crossOrigin = 'anonymous' because play.nightcamp.app/wiki/
  // does not send ACAO headers — standard Image() loads & draws 100% crisply on canvas!
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
        rec = { img, loaded: false, err: false };
        img.onload = () => { rec.loaded = true; };
        img.onerror = () => { rec.err = true; };
        img.src = url;
        this.imgs[url] = rec;
      }
      return rec.loaded && !rec.err ? rec.img : null;
    }
    getAtlas(name) {
      const file = name === 'h128' ? 'hats128' : name;
      const v = this.atlasV ? `?v=${this.atlasV}` : '';
      return this.get(`${WIKI_CDN}/data/wiki_${file}.webp${v}`);
    }
    getMonsterFull(imgId) {
      if (!imgId) return null;
      const v = this.atlasV ? `?v=${this.atlasV}` : '';
      return this.get(`${WIKI_CDN}/assets/m/${encodeURIComponent(imgId)}.webp${v}`);
    }
    drawAtlasCell(ctx, ic, dx, dy, dw, dh) {
      if (!Array.isArray(ic) || ic.length < 2) return false;
      const [atlasName, cellIdx] = ic;
      const spec = this.meta && this.meta.atlas && this.meta.atlas[atlasName];
      const img = this.getAtlas(atlasName);
      if (!spec || !img) return false;
      const cols = spec.cols || 1;
      const cell = spec.cell || 64;
      const sx = (cellIdx % cols) * cell;
      const sy = Math.floor(cellIdx / cols) * cell;
      ctx.drawImage(img, sx, sy, cell, cell, dx, dy, dw, dh);
      return true;
    }
  }

  class BuildSimArena {
    constructor(canvas, engine, idx, onTickHud, minimapCanvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.minimapCanvas = minimapCanvas || null;
      this.minimapCtx = minimapCanvas ? minimapCanvas.getContext('2d') : null;
      this.engine = engine;
      this.idx = idx;
      this.onTickHud = onTickHud || (() => {});
      this.imgCache = new ImageCache(idx.meta);

      // Preload core Nightcamp atlases immediately!
      this.imgCache.getAtlas('jobs');
      this.imgCache.getAtlas('items');
      this.imgCache.getAtlas('mons');
      this.imgCache.getAtlas('skills');

      this.width = 1100;
      this.height = 640;
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      this.cam = { x: WORLD_W / 2, y: WORLD_H / 2, zoom: 1.0 };

      this.build = null;
      this.stats = null;
      this.target = null;
      this.env = { night: true, mode: 's2', targetCount: 1, theme: 'woods', bossAttacks: true, godMode: false };

      this.playing = true;
      this.autoRot = false; // Default playable! Press Z or click Auto-Battle to toggle!
      this.speed = 1;
      this.time = 0;
      this.combatElapsed = 0;

      // Player entity in world space
      this.hero = {
        x: WORLD_W / 2 - 140, y: WORLD_H / 2 + 40,
        vx: 0, vy: 0, face: 1, aimAng: 0,
        hp: 1000, maxHp: 1000, sp: 300, maxSp: 300,
        walkPhase: 0, moving: false,
        dashLeft: 0, dashCd: 0, dashVx: 0, dashVy: 0, invLeft: 0,
        hurtFlash: 0, castAnim: 0, castName: '', castFull: 0, castColor: '#ffe07a',
        swingT: 0, swingAng: 0, dead: false,
        moveTarget: null, // click-to-move {x, y}
        puppet: { x: WORLD_W / 2 - 90, y: WORLD_H / 2 + 20, atkT: 0 },
      };

      // Input state (WASD / Arrows / Mouse)
      this.keys = Object.create(null);
      this.mouse = { sx: 500, sy: 300, wx: WORLD_W / 2, wy: WORLD_H / 2, down: false, rightDown: false };

      // World entities
      this.props = [];
      this.grassPatches = [];
      this.mobs = [];
      this.mobUidSeq = 1;
      this.projectiles = [];
      this.bossProjectiles = [];
      this.telegraphs = [];
      this.lingerZones = [];
      this.echoQueue = [];
      this.lootDrops = [];
      this.vfx = [];
      this.floats = [];
      this.ghosts = [];
      this.ambient = [];
      this.screenShake = 0;

      // Combat timers & DPS metrics
      this.skillCds = Object.create(null);
      this.skillCdFull = Object.create(null);
      this.cardCds = [0, 0];
      this.cardCdFull = [18, 18];
      this.gcdLeft = 0;
      this.basicCdLeft = 0;
      this.hitCounter = 0;
      this.totalDamage = 0;
      this.peakDps = 0;
      this.hitCount = 0;
      this.critCount = 0;
      this.kills = 0;
      this.armorBreaks = 0;
      this.maxHit = 0;
      this.coinsCollected = 0;
      this.dmgWindow = [];
      this.breakdown = Object.create(null);
      this.log = [];

      this._buildMapWorld('woods');
      this._initAmbient();
      this._bindCanvasInput();
      this._rafId = null;
      this._lastTs = 0;
      this._hudAccum = 0;
      this.resize();
    }

    setMinimapCanvas(c) {
      this.minimapCanvas = c;
      this.minimapCtx = c ? c.getContext('2d') : null;
    }

    _initAmbient() {
      this.ambient = [];
      for (let i = 0; i < 45; i++) {
        this.ambient.push({
          x: Math.random() * WORLD_W, y: Math.random() * WORLD_H,
          vx: (Math.random() - 0.5) * 22, vy: -8 - Math.random() * 16,
          r: 1.5 + Math.random() * 2.5, ph: Math.random() * TAU,
        });
      }
    }

    _buildMapWorld(themeKey) {
      this._builtTheme = themeKey;
      const rng = seededRand(themeKey.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 77));
      this.grassPatches = [];
      this.props = [];

      // Soft terrain variation patches
      for (let i = 0; i < 65; i++) {
        this.grassPatches.push({
          x: 120 + rng() * (WORLD_W - 240),
          y: 120 + rng() * (WORLD_H - 240),
          rx: 55 + rng() * 110,
          ry: 32 + rng() * 65,
        });
      }

      // Central Campfire / Torch landmarks around plaza
      const cx = WORLD_W / 2, cy = WORLD_H / 2;
      this.props.push({ kind: 'campfire', x: cx - 220, y: cy - 130, r: 22 });
      this.props.push({ kind: 'signpost', x: cx - 150, y: cy - 155, r: 14 });
      this.props.push({ kind: 'torch', x: cx - 300, y: cy + 170, r: 14 });
      this.props.push({ kind: 'torch', x: cx + 310, y: cy - 170, r: 14 });
      this.props.push({ kind: 'torch', x: cx + 320, y: cy + 190, r: 14 });

      // Biome props around outer battlefield (keeping center 660x440 plaza wide open for fighting!)
      const propKind = (ARENA_THEMES[themeKey] || ARENA_THEMES.woods).propKind;
      for (let i = 0; i < 95; i++) {
        const px = 90 + rng() * (WORLD_W - 180);
        const py = 90 + rng() * (WORLD_H - 180);
        if (Math.abs(px - cx) < 340 && Math.abs(py - cy) < 230) continue; // Keep arena plaza open!
        const sub = rng();
        if (sub < 0.58) this.props.push({ kind: propKind, x: px, y: py, r: 24 + rng() * 14, scale: 0.8 + rng() * 0.55, seed: rng() });
        else if (sub < 0.82) this.props.push({ kind: 'rock', x: px, y: py, r: 16 + rng() * 12, scale: 0.8 + rng() * 0.5, seed: rng() });
        else this.props.push({ kind: 'flower', x: px, y: py, r: 0, seed: rng() });
      }
    }

    _bindCanvasInput() {
      const toWorld = (ev) => {
        const rect = this.canvas.getBoundingClientRect();
        const sx = ev.clientX - rect.left;
        const sy = ev.clientY - rect.top;
        this.mouse.sx = sx;
        this.mouse.sy = sy;
        this.mouse.wx = this.cam.x + (sx - this.width / 2) / this.cam.zoom;
        this.mouse.wy = this.cam.y + (sy - this.height / 2) / this.cam.zoom;
      };

      this.canvas.addEventListener('mousemove', (ev) => {
        toWorld(ev);
        this.hero.aimAng = Math.atan2(this.mouse.wy - (this.hero.y - 24), this.mouse.wx - this.hero.x);
      });

      this.canvas.addEventListener('mousedown', (ev) => {
        toWorld(ev);
        if (ev.button === 2) {
          ev.preventDefault();
          this.mouse.rightDown = true;
          this.triggerDash(Math.atan2(this.mouse.wy - this.hero.y, this.mouse.wx - this.hero.x));
          return;
        }
        if (ev.button !== 0) return;
        this.mouse.down = true;
        // Check if clicking near a monster -> attack toward it! Else Click-to-Move!
        const clickedMob = this.findMobAt(this.mouse.wx, this.mouse.wy, 68);
        if (clickedMob) {
          this.hero.moveTarget = null;
          this.hero.aimAng = Math.atan2(clickedMob.y - this.hero.y, clickedMob.x - this.hero.x);
          this.castBasic(clickedMob);
        } else {
          this.hero.moveTarget = { x: clamp(this.mouse.wx, 60, WORLD_W - 60), y: clamp(this.mouse.wy, 60, WORLD_H - 60) };
          this.vfx.push({ type: 'clickring', x: this.hero.moveTarget.x, y: this.hero.moveTarget.y, r: 4, maxR: 26, color: '#fde047', life: 0.35, maxLife: 0.35 });
        }
      });

      window.addEventListener('mouseup', (ev) => {
        if (ev.button === 0) this.mouse.down = false;
        if (ev.button === 2) this.mouse.rightDown = false;
      });

      this.canvas.addEventListener('contextmenu', (ev) => ev.preventDefault());

      this.canvas.addEventListener('wheel', (ev) => {
        ev.preventDefault();
        const delta = ev.deltaY > 0 ? -0.08 : 0.08;
        this.cam.zoom = clamp(this.cam.zoom + delta, 0.72, 1.48);
      }, { passive: false });
    }

    setKey(k, down) {
      this.keys[k] = !!down;
      if (down && ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        this.hero.moveTarget = null; // Manual WASD cancels click-to-move
      }
    }

    resize() {
      const parent = this.canvas.parentElement;
      const rect = parent ? parent.getBoundingClientRect() : null;
      const w = Math.max(640, Math.round((rect && rect.width) || 1100));
      const h = Math.max(480, Math.round((rect && rect.height) || 640));
      this.width = w;
      this.height = h;
      this.canvas.width = Math.round(w * this.dpr);
      this.canvas.height = Math.round(h * this.dpr);
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
    }

    setState(build, stats, target, env, resetFight = false) {
      const themeChanged = env && env.theme && env.theme !== this._builtTheme;
      const targetChanged = !this.target || this.target.id !== target.id || (this.env.targetCount !== env.targetCount);
      this.build = build;
      this.stats = stats;
      this.target = target;
      this.env = Object.assign({}, this.env, env);
      if (themeChanged) this._buildMapWorld(this.env.theme);

      // Preload target art immediately
      if (target && target.img) this.imgCache.getMonsterFull(target.img);

      this.hero.maxHp = stats.maxHp;
      this.hero.maxSp = stats.maxSp;
      if (resetFight || targetChanged || this.mobs.length === 0) {
        this.resetCombat();
      } else {
        this.hero.hp = Math.min(this.hero.maxHp, this.hero.hp);
        this.hero.sp = Math.min(this.hero.maxSp, this.hero.sp);
      }
    }

    resetDpsOnly() {
      this.combatElapsed = 0;
      this.totalDamage = 0;
      this.peakDps = 0;
      this.hitCount = 0;
      this.critCount = 0;
      this.kills = 0;
      this.armorBreaks = 0;
      this.maxHit = 0;
      this.dmgWindow = [];
      this.breakdown = Object.create(null);
      this.log = [];
      for (const m of this.mobs) {
        m.hp = m.maxHp;
        m.hpTrail = m.maxHp;
        m.arm = m.maxArm;
        m.breakLeft = 0;
      }
      this._emitHud();
    }

    resetCombat() {
      this.combatElapsed = 0;
      this.totalDamage = 0;
      this.peakDps = 0;
      this.hitCount = 0;
      this.critCount = 0;
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
      this.projectiles = [];
      this.bossProjectiles = [];
      this.telegraphs = [];
      this.lingerZones = [];
      this.echoQueue = [];
      this.lootDrops = [];
      this.vfx = [];
      this.floats = [];
      this.ghosts = [];

      this.hero.x = WORLD_W / 2 - 150;
      this.hero.y = WORLD_H / 2 + 25;
      this.hero.moveTarget = null;
      this.hero.dead = false;
      this.hero.puppet.x = this.hero.x + 54;
      this.hero.puppet.y = this.hero.y - 20;
      this.cam.x = this.hero.x + 110;
      this.cam.y = this.hero.y;

      if (this.stats) {
        this.hero.maxHp = this.stats.maxHp;
        this.hero.hp = Math.round(this.stats.maxHp * ((this.build && this.build.hpPct || 100) / 100));
        this.hero.maxSp = this.stats.maxSp;
        this.hero.sp = this.stats.maxSp;
      }
      this.mobs = [];
      this.spawnTargetGroup(this.target, Math.max(1, Math.min(20, Number(this.env.targetCount) || 1)));
      this._emitHud();
    }

    // Spawn a group of any boss/monster onto the live map (can add multiple bosses!)
    spawnTargetGroup(targetSpec, count = 1, append = false) {
      if (!targetSpec) return;
      if (!append) this.mobs = [];
      if (targetSpec.img) this.imgCache.getMonsterFull(targetSpec.img);
      const cx = this.hero.x + 270;
      const cy = this.hero.y;
      for (let i = 0; i < count; i++) {
        const ang = count === 1 ? 0 : (i / count) * TAU;
        const rad = count === 1 ? 0 : (75 + Math.floor(i / 6) * 58);
        const mx = clamp(cx + Math.cos(ang) * rad, 120, WORLD_W - 120);
        const my = clamp(cy + Math.sin(ang) * rad * 0.72, 120, WORLD_H - 120);
        this.mobs.push({
          uid: this.mobUidSeq++,
          spec: targetSpec,
          hp: targetSpec.hp,
          maxHp: targetSpec.hp,
          hpTrail: targetSpec.hp,
          arm: targetSpec.armBar || (targetSpec.boss ? 120 : 40),
          maxArm: targetSpec.armBar || (targetSpec.boss ? 120 : 40),
          breakLeft: 0,
          x: mx, y: my, homeX: mx, homeY: my,
          vx: 0, vy: 0, face: -1,
          r: targetSpec.boss ? 44 : 28,
          hitFlash: 0,
          atkTimer: 1.6 + (i % 5) * 0.4,
          specialTimer: targetSpec.boss ? (4.0 + i * 1.2) : 999,
          statuses: Object.create(null),
          bobOff: i * 1.37,
          wobble: 0,
          wobbleVel: 0,
          aggro: true,
        });
      }
      this.vfx.push({ type: 'ring', x: cx, y: cy, r: 16, maxR: 135, color: targetSpec.boss ? '#c084fc' : '#fde047', life: 0.55, maxLife: 0.55, lw: 4 });
    }

    findMobAt(wx, wy, pad = 28) {
      let best = null, bestD = Infinity;
      for (const m of this.mobs) {
        const d = dist(wx, wy, m.x, m.y - m.r * 0.6);
        if (d < m.r + pad && d < bestD) { best = m; bestD = d; }
      }
      return best;
    }

    findNearestMob(x, y, excludeUid = null) {
      let best = null, bestD = Infinity;
      for (const m of this.mobs) {
        if (excludeUid != null && m.uid === excludeUid) continue;
        const d = dist(x, y, m.x, m.y);
        if (d < bestD) { best = m; bestD = d; }
      }
      return best;
    }

    // =========================================================================
    // PLAYER ACTIONS: DASH, BASIC ATTACK, SKILLS, ACTIVE CARDS
    // =========================================================================
    triggerDash(dirAng) {
      if (this.hero.dead || this.hero.dashCd > 0) return false;
      let ang = dirAng;
      if (ang == null || !Number.isFinite(ang)) {
        const dx = (this.keys.d || this.keys.arrowright ? 1 : 0) - (this.keys.a || this.keys.arrowleft ? 1 : 0);
        const dy = (this.keys.s || this.keys.arrowdown ? 1 : 0) - (this.keys.w || this.keys.arrowup ? 1 : 0);
        ang = (dx || dy) ? Math.atan2(dy, dx) : this.hero.aimAng;
      }
      this.hero.dashLeft = 0.22;
      this.hero.invLeft = 0.36;
      this.hero.dashCd = 1.2;
      this.hero.dashVx = Math.cos(ang) * 760;
      this.hero.dashVy = Math.sin(ang) * 760;
      this.hero.face = Math.cos(ang) >= 0 ? 1 : -1;
      this.hero.moveTarget = null;
      this._spawnDust(this.hero.x, this.hero.y, 8, '#e2e8f0');
      this.spawnFloat(this.hero.x, this.hero.y - 68, 'DASH!', 'dodge');
      return true;
    }

    castBasic(explicitTarget = null) {
      if (!this.build || !this.stats || this.hero.dead || this.basicCdLeft > 0.01) return false;
      const interval = Math.max(0.18, 1 / Math.max(0.5, this.stats.hitsPerSec));
      this.basicCdLeft = interval;

      const nearest = explicitTarget || this.findNearestMob(this.hero.x, this.hero.y);
      const ang = explicitTarget
        ? Math.atan2(explicitTarget.y - this.hero.y, explicitTarget.x - this.hero.x)
        : (this.autoRot && nearest ? Math.atan2(nearest.y - this.hero.y, nearest.x - this.hero.x) : this.hero.aimAng);

      this.hero.face = Math.cos(ang) >= 0 ? 1 : -1;
      this.hero.swingAng = ang;
      this.hero.swingT = 0.24;

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
      this._fireCombatAction('__basic__', action, rSlots, ang, nearest);
      return true;
    }

    castSkillById(skillId) {
      if (!this.build || !this.stats || this.hero.dead) return false;
      const sk = this.idx.skillsById[skillId];
      if (!sk || sk.type === 'passive') return false;
      if ((this.skillCds[skillId] || 0) > 0.01) return false;

      const slv = (this.build.skills && this.build.skills[skillId]) || sk.max || 10;
      const rSlots = (this.build.runes && this.build.runes[skillId]) || [];
      const rBun = this.engine.computeRuneBundle(this.idx, rSlots, {
        n: Math.max(1, this.mobs.length), night: this.env.night, hits: sk.hits || 1, dur: sk.dur || 0, cd: sk.cd || 1, splitIn: sk.splitIn || 0,
      }, this.env.mode);

      const effCd = Math.max(0.45, (sk.cd || 1.2) * (1 - this.stats.cdr / 100) * rBun.summary.cdScale);
      const castSec = (sk.type === 'magic' ? 0.32 : 0.12) * (this.stats.castPct / 100);
      const acdSec = Math.max(0.16, 0.28 * (1 - this.stats.acd / 100) * rBun.summary.acdScale);

      this.skillCds[skillId] = effCd;
      this.skillCdFull[skillId] = effCd;
      this.gcdLeft = castSec + acdSec;

      const el = sk.el || (sk.type === 'phys' ? this.stats.atkElement : 'neutral') || 'neutral';
      this.hero.castAnim = Math.max(0.28, castSec);
      this.hero.castFull = this.hero.castAnim;
      this.hero.castName = (sk.n && sk.n.th) || skillId;
      this.hero.castColor = elCol(el).hex;

      // Support / Heal / Buff
      if (sk.type === 'heal' || sk.type === 'buff' || !(sk.mul > 0)) {
        const healAmt = Math.round(this.stats.maxHp * 0.25 + this.stats.matkAvg * 1.2);
        this.hero.hp = Math.min(this.hero.maxHp, this.hero.hp + healAmt);
        this.spawnFloat(this.hero.x, this.hero.y - 72, `+${healAmt}`, 'heal');
        this.vfx.push({ type: 'ring', x: this.hero.x, y: this.hero.y - 10, r: 12, maxR: 110, color: '#86efac', life: 0.55, maxLife: 0.55, lw: 4 });
        this._pushLog(`✨ ร่าย ${this.hero.castName} (+${healAmt} HP)`);
        return true;
      }

      const nearest = this.findNearestMob(this.hero.x, this.hero.y);
      const ang = (this.autoRot && nearest)
        ? Math.atan2(nearest.y - this.hero.y, nearest.x - this.hero.x)
        : this.hero.aimAng;
      this.hero.face = Math.cos(ang) >= 0 ? 1 : -1;
      this.hero.swingAng = ang;
      this.hero.swingT = 0.28;

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
      this._fireCombatAction(sk.id, action, rSlots, ang, nearest);
      return true;
    }

    castCardSlot(slotIndex) {
      if (!this.build || !this.stats || this.hero.dead || (this.cardCds[slotIndex] || 0) > 0.01) return false;
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
      this.hero.castAnim = 0.45;
      this.hero.castFull = 0.45;
      this.hero.castName = `🃏 ${(card.art && card.art.th) || card.mon.th}`;
      this.hero.castColor = elCol(card.el).hex;

      const nearest = this.findNearestMob(this.hero.x, this.hero.y);
      const ang = nearest ? Math.atan2(nearest.y - this.hero.y, nearest.x - this.hero.x) : this.hero.aimAng;
      this.vfx.push({ type: 'banner', text: `🃏 ${(card.art && card.art.th) || card.mon.th}!`, x: this.hero.x, y: this.hero.y - 105, color: elCol(card.el).hex, life: 1.05, maxLife: 1.05 });

      const action = {
        name: `🃏 ${(card.art && card.art.th) || card.mon.th}`,
        kind: 'card',
        el: card.el || 'neutral',
        mul: (basePct / 100) * lvMul * pairElMul,
        hits: 1,
        aoe: true,
        runeSlots: [],
      };
      this._fireCombatAction('card_' + card.id, action, [], ang, nearest);
      return true;
    }

    // =========================================================================
    // REAL WORLD-SPACE ACTION EXECUTION (PROJECTILES, CLEAVES, AOES, RUNES)
    // =========================================================================
    _fireCombatAction(key, action, runeSlots, ang, aimMob) {
      const runeKeys = new Set((runeSlots || []).filter(Boolean).map(r => r.k));
      const col = elCol(action.el);
      const wideK = runeKeys.has('wide') ? 1.38 : (runeKeys.has('focus') ? 0.78 : 1.0);
      const splitCount = runeKeys.has('split') ? 2 : 0;
      const isProjectile = this.stats.isRanged || this.stats.isMagic || action.kind === 'magic'
        || (action.kinds && action.kinds.includes('proj'))
        || ['puppet', 'instrument', 'pistol', 'shotgun', 'bow', 'xbow', 'huuma', 'staff', 'orb', 'lantern', 'bell', 'book'].includes(this.stats.wtype);

      // Determine skill target point in world space (cursor or nearest enemy!)
      const aimX = (!this.autoRot && action.kind !== 'basic')
        ? this.mouse.wx
        : (aimMob ? aimMob.x : this.hero.x + Math.cos(ang) * 200);
      const aimY = (!this.autoRot && action.kind !== 'basic')
        ? this.mouse.wy
        : (aimMob ? aimMob.y : this.hero.y + Math.sin(ang) * 200);

      // 1. Puppeteer Thread / Dance / Theatre Skills!
      if (/^pp_/.test(key)) {
        const tx = aimMob ? aimMob.x : aimX, ty = aimMob ? aimMob.y : aimY;
        this.hero.puppet.x += (tx - this.hero.puppet.x) * 0.55;
        this.hero.puppet.y += (ty - this.hero.puppet.y) * 0.55;
        this.hero.puppet.atkT = 0.4;
        for (let i = 0; i < 4 + splitCount; i++) {
          this.vfx.push({ type: 'wire', x1: this.hero.x, y1: this.hero.y - 34, x2: tx + (Math.random() - 0.5) * 65, y2: ty - 24 + (Math.random() - 0.5) * 55, color: key === 'pp_theatre' ? '#f472b6' : '#c084fc', life: 0.36, maxLife: 0.36 });
        }
        this.vfx.push({ type: 'vortex', x: tx, y: ty - 16, r: 90 * wideK, color: '#c084fc', life: 0.55, maxLife: 0.55 });
        this._applyAoeInWorld(tx, ty, 135 * wideK, key, action, runeSlots, runeKeys, ang);
        return;
      }

      // Holy / Golden Luminous Sanctuary Dome (like Nightcamp Bishop/Paladin/Lightkeeper glow!)
      if (action.el === 'holy' || /holy|pal_|magnus|lk_|bi_|sanct|cross|dawn/i.test(key)) {
        this.vfx.push({ type: 'dome', x: aimX, y: aimY - 10, r: 95 * wideK, color: '#fde047', life: 0.72, maxLife: 0.72 });
      }
      // 2. Ground / Sky AoE Spells (Meteors, Thunder, Sanctuary, Quake, Card AoEs, Magic AoEs)
      if (action.aoe && (action.kind === 'magic' || action.kind === 'card' || /meteor|thunder|storm|magnus|sanct|cross|quake|noterain|blizzard/i.test(key))) {
        const tx = clamp(aimX, 80, WORLD_W - 80), ty = clamp(aimY, 80, WORLD_H - 80);
        const rad = 145 * wideK;
        if (action.el === 'fire' || /meteor|fire/i.test(key)) {
          for (let i = 0; i < 3 + splitCount; i++) {
            this._spawnMeteor(tx + (Math.random() - 0.5) * rad, ty + (Math.random() - 0.5) * rad * 0.65, '#ff7a3d', '#fde047');
          }
          this.vfx.push({ type: 'ring', x: tx, y: ty, r: 12, maxR: rad, color: '#ff7a3d', life: 0.48, maxLife: 0.48, lw: 5 });
        } else if (action.el === 'wind' || /thunder|chain|storm/i.test(key)) {
          this._spawnLightning(tx, ty - 260, tx, ty, '#bef264', 0.36);
          this._spawnLightning(this.hero.x, this.hero.y - 36, tx, ty - 20, '#7fd67a', 0.34);
          this.vfx.push({ type: 'ring', x: tx, y: ty, r: 10, maxR: rad, color: '#7fd67a', life: 0.42, maxLife: 0.42, lw: 4 });
        } else if (action.el === 'holy' || /holy|pal_|magnus|lk_|bi_/i.test(key)) {
          this.vfx.push({ type: 'pillar', x: tx, y: ty, w: 68 * wideK, color: '#ffe07a', life: 0.55, maxLife: 0.55 });
          this.vfx.push({ type: 'cross', x: tx, y: ty - 24, size: 58 * wideK, color: '#fef08a', life: 0.52, maxLife: 0.52 });
          this.vfx.push({ type: 'ring', x: tx, y: ty, r: 12, maxR: rad, color: '#fde047', life: 0.5, maxLife: 0.5, lw: 3 });
        } else if (action.el === 'water' || /frost|ice|water/i.test(key)) {
          this.vfx.push({ type: 'ring', x: tx, y: ty, r: 10, maxR: rad, color: '#67e8f9', life: 0.48, maxLife: 0.48, lw: 5 });
          this._spawnSparks(tx, ty - 20, 18, '#a5f3fc');
        } else {
          this.vfx.push({ type: 'ring', x: tx, y: ty, r: 12, maxR: rad, color: col.hex, life: 0.48, maxLife: 0.48, lw: 4 });
          this._spawnSparks(tx, ty - 18, 14, col.glow);
        }
        this._applyAoeInWorld(tx, ty, rad, key, action, runeSlots, runeKeys, ang);
        return;
      }

      // 3. Real World-Space Projectiles (Arrows, Bolts, Lances, Gunfire, Bard Notes, Huuma!)
      if (isProjectile) {
        const isShotgun = this.stats.wtype === 'shotgun';
        const isBard = /^bd_/.test(key) || this.stats.wtype === 'instrument';
        const count = (isShotgun ? 5 : 1) + splitCount;
        const spread = isShotgun ? 0.14 : 0.19;
        const speed = (this.stats.wtype === 'bow' || this.stats.wtype === 'xbow' || this.stats.wtype === 'pistol') ? 860 : 720;
        const pStyle = isBard ? 'note' : (action.el === 'water' ? 'lance' : (this.stats.wtype === 'bow' || this.stats.wtype === 'xbow' ? 'arrow' : 'bolt'));
        for (let i = 0; i < count; i++) {
          const a = ang + (i - (count - 1) / 2) * spread;
          this.projectiles.push({
            x: this.hero.x + Math.cos(a) * 26,
            y: this.hero.y - 26 + Math.sin(a) * 18,
            vx: Math.cos(a) * speed,
            vy: Math.sin(a) * speed,
            ang: a,
            r: action.aoe ? 24 * wideK : 16,
            life: 0.85,
            style: pStyle,
            color: col.hex,
            glow: col.glow,
            key, action, runeSlots, runeKeys,
            pierce: runeKeys.has('pierce') || action.aoe,
            hitUids: new Set(),
            dmgScale: isShotgun ? 0.42 : (i === Math.floor(count / 2) ? 1.0 : 0.72),
          });
        }
        return;
      }

      // 4. Melee Directional Cleave / Slash Arc!
      const reach = (action.aoe ? 165 : 128) * wideK;
      this.vfx.push({ type: 'slash', x: this.hero.x + Math.cos(ang) * 32, y: this.hero.y - 24 + Math.sin(ang) * 24, ang, r: reach * 0.62, color: col.hex, life: 0.28, maxLife: 0.28, big: action.kind !== 'basic' });
      const hitX = this.hero.x + Math.cos(ang) * (reach * 0.55);
      const hitY = this.hero.y + Math.sin(ang) * (reach * 0.55);
      this._applyAoeInWorld(hitX, hitY, reach * 0.72, key, action, runeSlots, runeKeys, ang, !action.aoe);
    }

    _applyAoeInWorld(cx, cy, radius, key, action, runeSlots, runeKeys, ang, singlePreferred = false) {
      const inRange = [];
      for (const m of this.mobs) {
        if (dist(cx, cy, m.x, m.y) <= radius + m.r) inRange.push(m);
      }
      if (!inRange.length) return;
      inRange.sort((a, b) => dist(cx, cy, a.x, a.y) - dist(cx, cy, b.x, b.y));
      const targets = singlePreferred ? inRange.slice(0, 1) : inRange.slice(0, 8);
      for (let i = 0; i < targets.length; i++) {
        this._resolveHitOnMob(targets[i], key, action, runeSlots, runeKeys, ang, i === 0, 1.0);
      }
    }

    _resolveHitOnMob(mob, key, action, runeSlots, runeKeys, ang, isPrimary, dmgScale = 1.0) {
      const res = this.engine.evalDamageAction(
        this.idx, this.stats, this.build, action, mob.spec,
        Object.assign({}, this.env, { targetCount: Math.max(1, this.mobs.length), broken: mob.breakLeft > 0 }),
        Math.random
      );
      const finalDmg = Math.max(1, Math.round(res.dmg * dmgScale));

      if (res.miss) {
        this.spawnFloat(mob.x, mob.y - mob.r * 1.4, 'MISS', 'miss');
        return;
      }

      const isDummyMob = !!(mob.spec && (mob.spec.isDummy || mob.spec.id === 'custom_dummy'));
      // Knockback physics (dummies stay planted on their wooden stake & wobble like a scarecrow!)
      if (isDummyMob) {
        const dirSign = Math.cos(ang) >= 0 ? 1 : -1;
        mob.wobbleVel = (mob.wobbleVel || 0) + dirSign * (res.crit ? 14.5 : 9.5);
      } else {
        const kb = (mob.spec.boss ? 45 : 140) * (action.kind === 'basic' ? 0.6 : 1.0);
        mob.vx += Math.cos(ang) * kb;
        mob.vy += Math.sin(ang) * kb;
      }
      mob.hitFlash = 0.14;
      mob.aggro = true;
      mob.hp -= finalDmg;
      if (res.crit && isPrimary) this.screenShake = Math.max(this.screenShake, 5);

      this.totalDamage += finalDmg;
      if (isPrimary) {
        this.hitCount++;
        if (res.crit) this.critCount++;
      }
      this.dmgWindow.push({ t: this.combatElapsed, dmg: finalDmg });
      if (finalDmg > this.maxHit) this.maxHit = finalDmg;

      if (!this.breakdown[key]) this.breakdown[key] = { id: key, name: action.name, el: res.el, totalDmg: 0, casts: 0, crits: 0, maxHit: 0 };
      const br = this.breakdown[key];
      br.totalDmg += finalDmg;
      if (isPrimary) br.casts++;
      if (res.crit && isPrimary) br.crits++;
      if (finalDmg > br.maxHit) br.maxHit = finalDmg;

      // Stylized Nightcamp floating damage numbers
      const showHits = Math.min(3, Math.max(1, (action.hits || 1) >= 3 ? 2 : 1));
      const per = Math.max(1, Math.round(finalDmg / showHits));
      for (let h = 0; h < showHits; h++) {
        const style = res.crit ? 'crit' : (action.kind === 'magic' ? 'magic' : 'phys');
        this.spawnFloat(mob.x + (Math.random() - 0.5) * 38, mob.y - mob.r * 1.45 - h * 18, res.crit ? `${per.toLocaleString()}!` : per.toLocaleString(), style, elCol(res.el).hex);
      }

      // Sparks on impact
      this._spawnSparks(mob.x, mob.y - 24, res.crit ? 10 : 5, elCol(res.el).glow);

      // Leech heal
      if (this.stats.leech > 0 && isPrimary) {
        const heal = Math.round(finalDmg * (this.stats.leech / 100));
        if (heal > 0) {
          this.hero.hp = Math.min(this.hero.maxHp, this.hero.hp + heal);
          if (heal >= 15) this.spawnFloat(this.hero.x, this.hero.y - 68, `+${heal}`, 'heal');
        }
      }

      // Rune Secondary Visual & Gameplay Triggers!
      if (isPrimary && runeKeys) {
        if (runeKeys.has('bounce') && this.mobs.length > 1) {
          const next = this.findNearestMob(mob.x, mob.y, mob.uid);
          if (next && dist(mob.x, mob.y, next.x, next.y) < 340) {
            this._spawnLightning(mob.x, mob.y - 26, next.x, next.y - 26, elCol(res.el).hex, 0.3);
            this._resolveHitOnMob(next, key, action, [], null, Math.atan2(next.y - mob.y, next.x - mob.x), false, 0.55);
          }
        }
        if (runeKeys.has('echo') && !action._isEcho) {
          this.echoQueue.push({ delay: 0.6, key, action: Object.assign({}, action, { _isEcho: true, mul: action.mul * 0.45 }), x: mob.x, y: mob.y, ang });
        }
        if (runeKeys.has('linger')) {
          this.lingerZones.push({ x: mob.x, y: mob.y, r: runeKeys.has('wide') ? 108 : 76, color: elCol(res.el).hex, life: 3.0, tick: 0.9, dmg: Math.round(finalDmg * 0.18), el: res.el });
        }
        if (runeKeys.has('skyfall')) {
          this._spawnMeteor(mob.x + (Math.random() - 0.5) * 40, mob.y, '#fde047', '#f59e0b');
        }
        if (runeKeys.has('curse')) {
          mob.statuses.curse = 5.0;
          this.vfx.push({ type: 'sigil', x: mob.x, y: mob.y - mob.r * 1.9, color: '#c084fc', life: 0.85, maxLife: 0.85 });
        }
        if (runeKeys.has('corrode') || runeKeys.has('venom')) mob.statuses.poison = 5.0;
        if (runeKeys.has('wildfire') || runeKeys.has('spmeteor')) {
          mob.statuses.burn = 4.0;
          if (Math.random() < 0.35) this._spawnMeteor(mob.x, mob.y, '#ff7a3d', '#fbbf24');
        }
        if (runeKeys.has('frostbite') || runeKeys.has('spfrost')) {
          mob.statuses.chill = 4.0;
          this.vfx.push({ type: 'ring', x: mob.x, y: mob.y, r: 8, maxR: 78, color: '#67e8f9', life: 0.38, maxLife: 0.38, lw: 3 });
        }
        if (runeKeys.has('arc') || runeKeys.has('spthunder') || runeKeys.has('splord')) {
          mob.statuses.shock = 3.5;
          this._spawnLightning(mob.x, mob.y - 240, mob.x, mob.y - 16, '#bef264', 0.32);
        }
      }

      // Armor Break
      if (mob.breakLeft <= 0 && mob.maxArm > 0 && isPrimary) {
        mob.arm -= res.armBreakDmg;
        if (mob.arm <= 0) {
          mob.breakLeft = 6.0;
          mob.arm = mob.maxArm;
          this.armorBreaks++;
          this.screenShake = 9;
          this.vfx.push({ type: 'ring', x: mob.x, y: mob.y, r: 10, maxR: 145, color: '#fbbf24', life: 0.6, maxLife: 0.6, lw: 6 });
          this.vfx.push({ type: 'banner', text: '💥 ARMOR BREAK! (+30% DMG)', x: mob.x, y: mob.y - mob.r * 2.1, color: '#fbbf24', life: 1.25, maxLife: 1.25 });
          this._pushLog(`💥 เกราะ ${mob.spec.name} แตก! ดาเมจ +30% (6 วิ)`);
        }
      }

      // Kill & Loot Drops & Auto-Respawn!
      if (mob.hp <= 0) {
        this.kills++;
        this._spawnSparks(mob.x, mob.y - 24, 22, '#fbbf24');
        if (!isDummyMob) {
          this._spawnLootBurst(mob.x, mob.y, mob.spec.boss);
          this.vfx.push({ type: 'banner', text: `☠️ สังหาร ${mob.spec.name}!`, x: mob.x, y: mob.y - mob.r * 1.8, color: '#fde047', life: 1.2, maxLife: 1.2 });
          this._pushLog(`☠️ สังหาร ${mob.spec.name} สำเร็จ! (รวม ${this.kills} ตัว)`);
        } else {
          this.vfx.push({ type: 'banner', text: `🌾 หุ่นไล่การีเซ็ตเลือดเต็ม! (รอบ #${this.kills})`, x: mob.x, y: mob.y - mob.r * 2.0, color: '#fde68a', life: 1.0, maxLife: 1.0 });
        }
        // Respawn mob smoothly at home spot so testing never stalls
        mob.hp = mob.maxHp;
        mob.hpTrail = mob.maxHp;
        mob.arm = mob.maxArm;
        mob.breakLeft = 0;
        if (!isDummyMob) {
          mob.x = mob.homeX + (Math.random() - 0.5) * 70;
          mob.y = mob.homeY + (Math.random() - 0.5) * 50;
        }
        this.vfx.push({ type: 'ring', x: mob.x, y: mob.y, r: 10, maxR: 80, color: isDummyMob ? '#facc15' : '#a78bfa', life: 0.45, maxLife: 0.45, lw: 3 });
      }
    }

    _spawnLootBurst(x, y, isBoss) {
      const n = isBoss ? 8 : 3;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU;
        const sp = 60 + Math.random() * 110;
        const isRare = isBoss && i < 2;
        this.lootDrops.push({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, z: 18, vz: 140 + Math.random() * 80,
          kind: isRare ? 'gear' : 'coin',
          color: isRare ? (i === 0 ? '#ff4f86' : '#ffc94d') : '#fde047',
          val: isBoss ? 2500 : 120,
          life: 14,
        });
      }
    }

    _spawnMeteor(tx, ty, color, glow) {
      this.vfx.push({ type: 'meteor', sx: tx - 140, sy: ty - 260, tx, ty, color, glow, life: 0.4, maxLife: 0.4 });
    }
    _spawnLightning(x1, y1, x2, y2, color, life) {
      const pts = [{ x: x1, y: y1 }];
      for (let i = 1; i < 6; i++) {
        const f = i / 6;
        pts.push({ x: x1 + (x2 - x1) * f + (Math.random() - 0.5) * 28, y: y1 + (y2 - y1) * f + (Math.random() - 0.5) * 28 });
      }
      pts.push({ x: x2, y: y2 });
      this.vfx.push({ type: 'lightning', pts, color, life: life || 0.3, maxLife: life || 0.3 });
    }
    _spawnSparks(x, y, count, color) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * TAU, sp = 55 + Math.random() * 160;
        this.vfx.push({ type: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 35, r: 2 + Math.random() * 3, color, life: 0.3 + Math.random() * 0.25, maxLife: 0.55 });
      }
    }
    _spawnDust(x, y, count, color) {
      for (let i = 0; i < count; i++) {
        this.vfx.push({ type: 'dust', x: x + (Math.random() - 0.5) * 18, y: y + (Math.random() - 0.5) * 8, vx: (Math.random() - 0.5) * 45, vy: -15 - Math.random() * 25, r: 4 + Math.random() * 4, color: color || 'rgba(220,210,190,0.45)', life: 0.35, maxLife: 0.35 });
      }
    }
    spawnFloat(x, y, text, style, accent) {
      this.floats.push({ x, y, vx: (Math.random() - 0.5) * 24, vy: style === 'crit' ? -86 : -62, text: String(text), style: style || 'phys', accent: accent || '#fff', life: style === 'crit' ? 1.15 : 0.9, maxLife: style === 'crit' ? 1.15 : 0.9 });
    }
    _pushLog(text) {
      this.log.unshift({ t: this.combatElapsed.toFixed(1) + 's', text });
      if (this.log.length > 25) this.log.length = 25;
    }

    // =========================================================================
    // MAIN 60 FPS WORLD UPDATE LOOP
    // =========================================================================
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

    update(rawDt) {
      this.time += rawDt;
      const dt = this.playing ? rawDt * this.speed : 0;

      // Ambient fireflies/spores
      for (const a of this.ambient) {
        a.x += a.vx * rawDt; a.y += a.vy * rawDt;
        if (a.y < 0) { a.y = WORLD_H; a.x = Math.random() * WORLD_W; }
        if (a.x < 0) a.x = WORLD_W;
        if (a.x > WORLD_W) a.x = 0;
      }

      if (!this.playing || !this.build || !this.stats) return;
      this.combatElapsed += dt;

      if (this.screenShake > 0) this.screenShake = Math.max(0, this.screenShake - rawDt * 28);
      const h = this.hero;
      h.hurtFlash = Math.max(0, h.hurtFlash - rawDt);
      h.castAnim = Math.max(0, h.castAnim - rawDt);
      h.swingT = Math.max(0, h.swingT - rawDt);
      h.invLeft = Math.max(0, h.invLeft - dt);
      h.dashCd = Math.max(0, h.dashCd - dt);
      this.gcdLeft = Math.max(0, this.gcdLeft - dt);
      this.basicCdLeft = Math.max(0, this.basicCdLeft - dt);
      for (const k of Object.keys(this.skillCds)) this.skillCds[k] = Math.max(0, this.skillCds[k] - dt);
      for (let i = 0; i < 2; i++) this.cardCds[i] = Math.max(0, this.cardCds[i] - dt);

      if (!h.dead) {
        h.hp = Math.min(h.maxHp, h.hp + this.stats.hpRegen * dt);
        h.sp = Math.min(h.maxSp, h.sp + this.stats.spRegen * dt);
      }

      // 1. Player Movement (WASD / Click-to-Move / Dash / Auto-Battle AI)
      const moveSpeed = 240 * (1 + (this.stats.spd || 0) / 100);
      h.moving = false;
      if (!h.dead) {
        if (h.dashLeft > 0) {
          h.dashLeft = Math.max(0, h.dashLeft - dt);
          h.x = clamp(h.x + h.dashVx * dt, 55, WORLD_W - 55);
          h.y = clamp(h.y + h.dashVy * dt, 55, WORLD_H - 55);
          h.moving = true;
          this.ghosts.push({ x: h.x, y: h.y, face: h.face, life: 0.22, maxLife: 0.22 });
        } else {
          let mx = (this.keys.d || this.keys.arrowright ? 1 : 0) - (this.keys.a || this.keys.arrowleft ? 1 : 0);
          let my = (this.keys.s || this.keys.arrowdown ? 1 : 0) - (this.keys.w || this.keys.arrowup ? 1 : 0);

          if (mx || my) {
            const len = Math.hypot(mx, my);
            h.x = clamp(h.x + (mx / len) * moveSpeed * dt, 55, WORLD_W - 55);
            h.y = clamp(h.y + (my / len) * moveSpeed * dt, 55, WORLD_H - 55);
            h.face = mx !== 0 ? (mx > 0 ? 1 : -1) : h.face;
            h.moving = true;
          } else if (h.moveTarget) {
            const d = dist(h.x, h.y, h.moveTarget.x, h.moveTarget.y);
            if (d > 8) {
              const a = Math.atan2(h.moveTarget.y - h.y, h.moveTarget.x - h.x);
              h.x = clamp(h.x + Math.cos(a) * moveSpeed * dt, 55, WORLD_W - 55);
              h.y = clamp(h.y + Math.sin(a) * moveSpeed * dt, 55, WORLD_H - 55);
              h.face = Math.cos(a) >= 0 ? 1 : -1;
              h.moving = true;
            } else {
              h.moveTarget = null;
            }
          } else if (this.autoRot) {
            // Smart Auto-Battle AI: dodge red Boss telegraphs, kite/chase nearest mob, cast rotation!
            this._runAutoBattle(dt, moveSpeed);
          }

          // Hold Left-Click on enemy or Space to continuous attack
          if ((this.mouse.down || this.keys[' ']) && this.basicCdLeft <= 0) {
            const targetMob = this.findMobAt(this.mouse.wx, this.mouse.wy, 110);
            if (targetMob || this.keys[' ']) this.castBasic(targetMob);
          }
        }
      }

      if (h.moving) {
        h.walkPhase += dt * 13;
        if (Math.random() < dt * 9) this._spawnDust(h.x, h.y + 6, 1);
      }

      // Smoothly update Puppeteer companion follow position
      const pupTargetX = h.x - h.face * 56;
      const pupTargetY = h.y - 12 + Math.sin(this.time * 4) * 8;
      h.puppet.x += (pupTargetX - h.puppet.x) * Math.min(1, rawDt * 5);
      h.puppet.y += (pupTargetY - h.puppet.y) * Math.min(1, rawDt * 5);
      h.puppet.atkT = Math.max(0, h.puppet.atkT - rawDt);

      // Smooth Camera Tracking
      this.cam.x += (h.x - this.cam.x) * Math.min(1, rawDt * 6.5);
      this.cam.y += (h.y - this.cam.y) * Math.min(1, rawDt * 6.5);
      const halfW = (this.width / 2) / this.cam.zoom;
      const halfH = (this.height / 2) / this.cam.zoom;
      this.cam.x = clamp(this.cam.x, Math.min(WORLD_W / 2, halfW), Math.max(WORLD_W / 2, WORLD_W - halfW));
      this.cam.y = clamp(this.cam.y, Math.min(WORLD_H / 2, halfH), Math.max(WORLD_H / 2, WORLD_H - halfH));

      // 2. Player Projectiles Collision
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const p = this.projectiles[i];
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        let dead = p.life <= 0 || p.x < 0 || p.x > WORLD_W || p.y < 0 || p.y > WORLD_H;
        if (!dead) {
          for (const m of this.mobs) {
            if (p.hitUids.has(m.uid)) continue;
            if (dist(p.x, p.y, m.x, m.y - 22) <= p.r + m.r) {
              p.hitUids.add(m.uid);
              this._resolveHitOnMob(m, p.key, p.action, p.runeSlots, p.runeKeys, p.ang, p.hitUids.size === 1, p.dmgScale);
              if (!p.pierce) { dead = true; break; }
            }
          }
        }
        if (dead) this.projectiles.splice(i, 1);
      }

      // 3. Delayed Echo Recasts & Linger Ground Zones
      for (let i = this.echoQueue.length - 1; i >= 0; i--) {
        const eq = this.echoQueue[i];
        eq.delay -= dt;
        if (eq.delay <= 0) {
          this.echoQueue.splice(i, 1);
          this.vfx.push({ type: 'ring', x: eq.x, y: eq.y, r: 10, maxR: 88, color: '#c084fc', life: 0.35, maxLife: 0.35, lw: 3 });
          this._applyAoeInWorld(eq.x, eq.y, 110, eq.key, eq.action, [], null, eq.ang);
        }
      }
      for (let i = this.lingerZones.length - 1; i >= 0; i--) {
        const z = this.lingerZones[i];
        z.life -= dt; z.tick -= dt;
        if (z.tick <= 0) {
          z.tick = 1.0;
          for (const m of this.mobs) {
            if (dist(z.x, z.y, m.x, m.y) <= z.r + m.r) {
              m.hp -= z.dmg; m.hitFlash = 0.1; this.totalDamage += z.dmg;
              this.dmgWindow.push({ t: this.combatElapsed, dmg: z.dmg });
              this.spawnFloat(m.x, m.y - m.r * 1.4, z.dmg.toLocaleString(), 'magic', z.color);
            }
          }
        }
        if (z.life <= 0) this.lingerZones.splice(i, 1);
      }

      // 4. Monster & Boss AI + Dodgeable Telegraphs
      for (const m of this.mobs) {
        m.hitFlash = Math.max(0, m.hitFlash - rawDt);
        m.breakLeft = Math.max(0, m.breakLeft - dt);
        m.hpTrail += (m.hp - m.hpTrail) * Math.min(1, rawDt * 7);
        for (const sk of Object.keys(m.statuses)) {
          m.statuses[sk] -= dt;
          if (m.statuses[sk] <= 0) delete m.statuses[sk];
        }

        const isDummyMob = !!(m.spec && (m.spec.isDummy || m.spec.id === 'custom_dummy'));
        if (isDummyMob) {
          // Spring-damper wobble physics for Scarecrow Training Dummy (never walks or hits back!)
          const kSpring = 115, cDamp = 10;
          const acc = -kSpring * (m.wobble || 0) - cDamp * (m.wobbleVel || 0);
          m.wobbleVel = (m.wobbleVel || 0) + acc * dt;
          m.wobble = clamp((m.wobble || 0) + m.wobbleVel * dt, -0.42, 0.42);
          m.vx = 0; m.vy = 0;
          continue;
        }

        // Knockback friction
        m.x = clamp(m.x + m.vx * dt, 70, WORLD_W - 70);
        m.y = clamp(m.y + m.vy * dt, 70, WORLD_H - 70);
        m.vx *= Math.pow(0.05, dt);
        m.vy *= Math.pow(0.05, dt);

        if (!h.dead && this.env.bossAttacks) {
          const dHero = dist(m.x, m.y, h.x, h.y);
          const angH = Math.atan2(h.y - m.y, h.x - m.x);
          m.face = Math.cos(angH) >= 0 ? 1 : -1;
          const mSpeed = (m.spec.boss ? 112 : 95) * (m.statuses.chill ? 0.65 : 1.0);
          const stopDist = m.r + 36;
          if (dHero > stopDist) {
            m.x = clamp(m.x + Math.cos(angH) * mSpeed * dt, 70, WORLD_W - 70);
            m.y = clamp(m.y + Math.sin(angH) * mSpeed * dt, 70, WORLD_H - 70);
          }

          // Basic melee swipe when in reach
          m.atkTimer -= dt;
          if (m.atkTimer <= 0 && dHero <= stopDist + 24) {
            m.atkTimer = m.spec.boss ? 1.8 : 2.2;
            this._mobHitHero(m, 1.0);
          }

          // Boss Special Dodgeable Mechanics!
          if (m.spec.boss) {
            m.specialTimer -= dt;
            if (m.specialTimer <= 0) {
              m.specialTimer = 4.6 + Math.random() * 1.4;
              const roll = Math.random();
              if (roll < 0.42) {
                // Pattern 1: Crimson Slam Circle on hero's feet!
                this.telegraphs.push({ kind: 'circle', x: h.x, y: h.y, r: 105, dur: 1.15, left: 1.15, mob: m, mul: 1.55, color: elCol(m.spec.atkEl).hex });
              } else if (roll < 0.74) {
                // Pattern 2: Directional Breath/Charge Cone!
                this.telegraphs.push({ kind: 'cone', x: m.x, y: m.y, ang: angH, spread: 0.52, range: 270, dur: 1.1, left: 1.1, mob: m, mul: 1.65, color: elCol(m.spec.atkEl).hex });
              } else {
                // Pattern 3: Radial Barrage of 10 dodgeable boss orbs!
                const nOrbs = 10;
                const orbCol = elCol(m.spec.atkEl).hex;
                for (let k = 0; k < nOrbs; k++) {
                  const oa = angH + (k / nOrbs) * TAU;
                  this.bossProjectiles.push({ x: m.x, y: m.y - 18, vx: Math.cos(oa) * 260, vy: Math.sin(oa) * 260, r: 12, life: 2.2, color: orbCol, mob: m });
                }
                this.vfx.push({ type: 'ring', x: m.x, y: m.y, r: 16, maxR: 120, color: orbCol, life: 0.4, maxLife: 0.4, lw: 4 });
              }
            }
          }
        }
      }

      // 5. Update Crimson Telegraphs (check dodge on impact!)
      for (let i = this.telegraphs.length - 1; i >= 0; i--) {
        const tg = this.telegraphs[i];
        tg.left -= dt;
        if (tg.left <= 0) {
          this.telegraphs.splice(i, 1);
          if (tg.kind === 'circle') {
            this.vfx.push({ type: 'ring', x: tg.x, y: tg.y, r: 12, maxR: tg.r, color: tg.color, life: 0.42, maxLife: 0.42, lw: 6 });
            this._spawnSparks(tg.x, tg.y - 12, 14, tg.color);
            if (!h.dead && dist(h.x, h.y, tg.x, tg.y) <= tg.r) this._mobHitHero(tg.mob, tg.mul);
          } else if (tg.kind === 'cone') {
            this._spawnSparks(tg.x + Math.cos(tg.ang) * 140, tg.y + Math.sin(tg.ang) * 140, 18, tg.color);
            const dh = dist(tg.x, tg.y, h.x, h.y);
            let da = Math.abs(Math.atan2(h.y - tg.y, h.x - tg.x) - tg.ang);
            if (da > Math.PI) da = TAU - da;
            if (!h.dead && dh <= tg.range && da <= tg.spread) this._mobHitHero(tg.mob, tg.mul);
          }
        }
      }

      // 6. Boss Orbs Collision
      for (let i = this.bossProjectiles.length - 1; i >= 0; i--) {
        const bp = this.bossProjectiles[i];
        bp.life -= dt;
        bp.x += bp.vx * dt;
        bp.y += bp.vy * dt;
        if (!h.dead && dist(bp.x, bp.y, h.x, h.y - 20) <= bp.r + 20) {
          this._mobHitHero(bp.mob, 0.9);
          this.bossProjectiles.splice(i, 1);
          continue;
        }
        if (bp.life <= 0) this.bossProjectiles.splice(i, 1);
      }

      // 7. Loot Drops Bounce & Magnetic Pickup
      for (let i = this.lootDrops.length - 1; i >= 0; i--) {
        const lt = this.lootDrops[i];
        lt.life -= dt;
        if (lt.z > 0 || lt.vz > 0) {
          lt.x += lt.vx * dt; lt.y += lt.vy * dt;
          lt.z += lt.vz * dt; lt.vz -= 460 * dt;
          if (lt.z < 0) { lt.z = 0; lt.vz = 0; lt.vx *= 0.2; lt.vy *= 0.2; }
        }
        const dh = dist(lt.x, lt.y, h.x, h.y);
        if (dh < 150) {
          lt.x += ((h.x - lt.x) / Math.max(1, dh)) * 420 * dt;
          lt.y += ((h.y - lt.y) / Math.max(1, dh)) * 420 * dt;
        }
        if (dh < 26 || lt.life <= 0) {
          if (dh < 26) {
            this.coinsCollected += lt.val;
            if (lt.kind === 'gear') this.spawnFloat(h.x, h.y - 78, `✨ +ของดรอป!`, 'crit');
          }
          this.lootDrops.splice(i, 1);
        }
      }

      // 8. Update VFX, Ghosts & Floats
      for (let i = this.vfx.length - 1; i >= 0; i--) {
        const v = this.vfx[i];
        v.life -= rawDt;
        if (v.vx) v.x += v.vx * rawDt;
        if (v.vy) v.y += v.vy * rawDt;
        if (v.type === 'spark') v.vy += 290 * rawDt;
        if (v.life <= 0) this.vfx.splice(i, 1);
      }
      for (let i = this.ghosts.length - 1; i >= 0; i--) {
        this.ghosts[i].life -= rawDt;
        if (this.ghosts[i].life <= 0) this.ghosts.splice(i, 1);
      }
      for (let i = this.floats.length - 1; i >= 0; i--) {
        const f = this.floats[i];
        f.life -= rawDt;
        f.x += f.vx * rawDt;
        f.y += f.vy * rawDt;
        f.vy += 90 * rawDt;
        if (f.life <= 0) this.floats.splice(i, 1);
      }

      const cutoff = this.combatElapsed - 5.0;
      while (this.dmgWindow.length && this.dmgWindow[0].t < cutoff) this.dmgWindow.shift();

      this._hudAccum += rawDt;
      if (this._hudAccum >= 0.12) {
        this._hudAccum = 0;
        this._emitHud();
      }
    }

    _runAutoBattle(dt, moveSpeed) {
      const h = this.hero;
      // 1. Dodge crimson telegraphs automatically!
      for (const tg of this.telegraphs) {
        if (tg.kind === 'circle' && dist(h.x, h.y, tg.x, tg.y) <= tg.r + 18) {
          const outAng = Math.atan2(h.y - tg.y, h.x - tg.x) || 0.4;
          if (tg.left < 0.5 && h.dashCd <= 0) { this.triggerDash(outAng); return; }
          h.x = clamp(h.x + Math.cos(outAng) * moveSpeed * dt, 55, WORLD_W - 55);
          h.y = clamp(h.y + Math.sin(outAng) * moveSpeed * dt, 55, WORLD_H - 55);
          h.face = Math.cos(outAng) >= 0 ? 1 : -1;
          h.moving = true;
          return;
        }
      }

      const target = this.findNearestMob(h.x, h.y);
      if (!target) return;
      const d = dist(h.x, h.y, target.x, target.y);
      const ang = Math.atan2(target.y - h.y, target.x - h.x);
      h.aimAng = ang;
      const wantDist = (this.stats.isRanged || this.stats.isMagic) ? 235 : (target.r + 58);

      if (d > wantDist + 22) {
        h.x = clamp(h.x + Math.cos(ang) * moveSpeed * dt, 55, WORLD_W - 55);
        h.y = clamp(h.y + Math.sin(ang) * moveSpeed * dt, 55, WORLD_H - 55);
        h.face = Math.cos(ang) >= 0 ? 1 : -1;
        h.moving = true;
      } else if ((this.stats.isRanged || this.stats.isMagic) && d < 135) {
        // Gentle ranged kiting!
        h.x = clamp(h.x - Math.cos(ang) * moveSpeed * 0.7 * dt, 55, WORLD_W - 55);
        h.y = clamp(h.y - Math.sin(ang) * moveSpeed * 0.7 * dt, 55, WORLD_H - 55);
        h.moving = true;
      }

      if (this.gcdLeft <= 0 && d <= Math.max(280, wantDist + 90)) {
        let castDone = false;
        for (let i = 0; i < 2; i++) {
          if (this.build.cards.act[i] && this.cardCds[i] <= 0 && this.castCardSlot(i)) { castDone = true; break; }
        }
        if (!castDone) {
          for (const sid of (this.build.rotation || [])) {
            if ((this.skillCds[sid] || 0) <= 0 && this.castSkillById(sid)) { castDone = true; break; }
          }
        }
        if (!castDone && this.basicCdLeft <= 0) this.castBasic(target);
      }
    }

    _mobHitHero(mob, mul = 1.0) {
      const h = this.hero;
      if (h.dead) return;
      if (h.invLeft > 0) {
        this.spawnFloat(h.x, h.y - 72, 'DODGE!', 'dodge');
        return;
      }
      const sp = mob.spec;
      const dodgeCh = clamp((this.stats.flee - sp.hit + 20) / 100, 0.05, 0.85);
      if (Math.random() < this.stats.pdodge / 100) { this.spawnFloat(h.x, h.y - 72, 'PERFECT!', 'dodge'); return; }
      if (Math.random() < dodgeCh) { this.spawnFloat(h.x, h.y - 72, 'DODGE', 'dodge'); return; }

      const rawAtk = (sp.atk[0] + (sp.atk[1] - sp.atk[0]) * Math.random()) * mul;
      const defK = 100 / (100 + (this.stats.def + this.stats.vdef) * 1.4);
      const elRes = 1 - Math.min(0.75, (this.stats.resist[sp.atkEl] || 0) / 100);
      const takenK = 1 - (this.stats.taken / 100);
      const inc = Math.max(1, Math.round(rawAtk * defK * elRes * takenK));

      h.hurtFlash = 0.2;
      this.screenShake = Math.max(this.screenShake, 5);
      this.vfx.push({ type: 'ring', x: h.x, y: h.y - 16, r: 8, maxR: 62, color: '#ef4444', life: 0.3, maxLife: 0.3, lw: 4 });
      this.spawnFloat(h.x, h.y - 68, `-${inc}`, 'enemy');

      if (!this.env.godMode) {
        h.hp -= inc;
        if (h.hp <= 0) {
          h.hp = 0; h.dead = true;
          this.vfx.push({ type: 'banner', text: '💀 ตัวละครล้มลง! (กดฟื้นคืนชีพ หรือ เปิด 🛡️ อมตะ)', x: h.x, y: h.y - 96, color: '#f87171', life: 2.8, maxLife: 2.8 });
          this._pushLog(`💀 ตัวละครตายที่ ${this.combatElapsed.toFixed(1)}s`);
        }
      }
    }

    _emitHud() {
      const avgDps = this.combatElapsed > 0.2 ? Math.round(this.totalDamage / this.combatElapsed) : 0;
      const winSum = this.dmgWindow.reduce((s, x) => s + x.dmg, 0);
      const winDur = Math.min(5.0, Math.max(0.5, this.combatElapsed));
      const curDps = Math.round(winSum / winDur);
      if (curDps > this.peakDps) this.peakDps = curDps;
      const primaryBoss = this.mobs.find(m => m.spec.boss) || this.mobs[0] || null;
      const isDummyTarget = !!(primaryBoss && primaryBoss.spec && (primaryBoss.spec.isDummy || primaryBoss.spec.id === 'custom_dummy'));
      this.onTickHud({
        elapsedSec: Math.round(this.combatElapsed * 10) / 10,
        avgDps,
        curDps,
        peakDps: this.peakDps,
        hitCount: this.hitCount,
        critCount: this.critCount,
        critRatePct: this.hitCount > 0 ? Math.round((this.critCount / this.hitCount) * 1000) / 10 : 0,
        isDummyTarget,
        totalDamage: this.totalDamage,
        kills: this.kills,
        armorBreaks: this.armorBreaks,
        maxHit: this.maxHit,
        coinsCollected: this.coinsCollected,
        mobCount: this.mobs.length,
        heroX: Math.round(this.hero.x),
        heroY: Math.round(this.hero.y),
        heroHp: Math.round(this.hero.hp),
        heroMaxHp: this.hero.maxHp,
        heroSp: Math.round(this.hero.sp),
        heroMaxSp: this.hero.maxSp,
        heroDead: this.hero.dead,
        dashCd: this.hero.dashCd,
        castFrac: this.hero.castFull > 0 && this.hero.castAnim > 0 ? 1 - (this.hero.castAnim / this.hero.castFull) : 0,
        castName: this.hero.castAnim > 0 ? this.hero.castName : '',
        boss: primaryBoss ? {
          name: primaryBoss.spec.name, lv: primaryBoss.spec.lv, boss: primaryBoss.spec.boss,
          el: primaryBoss.spec.el, def: primaryBoss.spec.def, mdef: primaryBoss.spec.mdef,
          hp: Math.max(0, Math.round(primaryBoss.hp)), maxHp: primaryBoss.maxHp,
          hpTrail: primaryBoss.hpTrail, arm: primaryBoss.arm, maxArm: primaryBoss.maxArm, breakLeft: primaryBoss.breakLeft,
        } : null,
        skillCds: this.skillCds,
        skillCdFull: this.skillCdFull,
        cardCds: this.cardCds,
        cardCdFull: this.cardCdFull,
        breakdown: Object.values(this.breakdown).sort((a, b) => b.totalDmg - a.totalDmg),
        log: this.log,
      });
    }

    // =========================================================================
    // 60 FPS TOP-DOWN 2.5D NIGHTCAMP WORLD RENDERER
    // =========================================================================
    render() {
      const ctx = this.ctx;
      const W = this.width, H = this.height;
      const theme = ARENA_THEMES[this.env.theme] || ARENA_THEMES.woods;
      const night = !!this.env.night;

      ctx.save();
      ctx.scale(this.dpr, this.dpr);

      // Camera transform
      ctx.fillStyle = night ? theme.groundNight : theme.groundDay;
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      let sx = 0, sy = 0;
      if (this.screenShake > 0.2) { sx = (Math.random() - 0.5) * this.screenShake; sy = (Math.random() - 0.5) * this.screenShake; }
      ctx.translate(W / 2 + sx, H / 2 + sy);
      ctx.scale(this.cam.zoom, this.cam.zoom);
      ctx.translate(-this.cam.x, -this.cam.y);

      // 1. Ground Terrain, Dirt Paths & Cozy Camp Plaza!
      this._drawTerrain(ctx, theme, night);

      // 2. Ground Linger DoT Rings & Boss Crimson Telegraphs
      this._drawGroundEffects(ctx);

      // 3. Y-Sorted World Render Queue (Props + Loot + Hero + Monsters!)
      const drawables = [];
      for (const pr of this.props) {
        if (Math.abs(pr.x - this.cam.x) < W / this.cam.zoom + 140 && Math.abs(pr.y - this.cam.y) < H / this.cam.zoom + 140) {
          drawables.push({ y: pr.y, fn: () => this._drawProp(ctx, pr, theme, night) });
        }
      }
      for (const lt of this.lootDrops) {
        drawables.push({ y: lt.y, fn: () => this._drawLoot(ctx, lt) });
      }
      drawables.push({ y: this.hero.y, fn: () => this._drawHero(ctx) });
      for (const m of this.mobs) {
        drawables.push({ y: m.y, fn: () => this._drawMob(ctx, m) });
      }
      drawables.sort((a, b) => a.y - b.y);
      for (const d of drawables) d.fn();

      // 4. Projectiles (Player & Boss) + VFX + Ambient Particles
      this._drawProjectiles(ctx);
      this._drawVfx(ctx);
      this._drawAmbient(ctx, theme);

      // 5. Stylized Nightcamp Floating Damage Numbers
      this._drawFloats(ctx);

      ctx.restore(); // End world camera

      // 6. Subtle Night Vignette & Warm Lantern Atmosphere
      if (night) {
        const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.28, W / 2, H / 2, Math.max(W, H) * 0.72);
        vig.addColorStop(0, 'rgba(10,14,28,0)');
        vig.addColorStop(1, 'rgba(6,8,20,0.46)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, W, H);
      }

      ctx.restore();

      // 7. Live Minimap Render
      this._renderMinimap(theme, night);
    }

    _drawTerrain(ctx, theme, night) {
      // Soft terrain patches
      ctx.fillStyle = night ? theme.patchNight : theme.patchDay;
      for (const g of this.grassPatches) {
        ctx.beginPath(); ctx.ellipse(g.x, g.y, g.rx, g.ry, 0, 0, TAU); ctx.fill();
      }

      // Cross dirt roads & Central Stone Plaza
      const cx = WORLD_W / 2, cy = WORLD_H / 2;
      ctx.fillStyle = night ? theme.roadNight : theme.roadDay;
      ctx.fillRect(0, cy - 36, WORLD_W, 72);
      ctx.fillRect(cx - 38, 0, 76, WORLD_H);

      // Central circular arena plaza with stone ring border
      ctx.fillStyle = night ? theme.plazaNight : theme.plazaDay;
      ctx.beginPath(); ctx.ellipse(cx, cy, 340, 230, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = night ? 'rgba(245,201,105,0.18)' : 'rgba(255,245,220,0.28)';
      ctx.lineWidth = 4;
      ctx.setLineDash([14, 10]);
      ctx.beginPath(); ctx.ellipse(cx, cy, 330, 222, 0, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);

      // World border fence line
      ctx.strokeStyle = 'rgba(245,201,105,0.22)';
      ctx.lineWidth = 6;
      ctx.strokeRect(40, 40, WORLD_W - 80, WORLD_H - 80);
    }

    _drawProp(ctx, pr, theme, night) {
      const x = pr.x, y = pr.y;
      if (pr.kind === 'campfire') {
        const fl = 0.88 + 0.14 * Math.sin(this.time * 13);
        const glow = ctx.createRadialGradient(x, y, 4, x, y, 140 * fl);
        glow.addColorStop(0, 'rgba(255,160,60,0.48)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, 140 * fl, 0, TAU); ctx.fill();
        // Logs
        ctx.strokeStyle = '#5c3a21'; ctx.lineWidth = 7; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x - 18, y + 6); ctx.lineTo(x + 18, y - 4); ctx.moveTo(x - 16, y - 6); ctx.lineTo(x + 16, y + 7); ctx.stroke();
        // Flame
        ctx.fillStyle = '#ff7a29'; ctx.beginPath(); ctx.arc(x, y - 8, 12 * fl, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.arc(x, y - 6, 6.5 * fl, 0, TAU); ctx.fill();
      } else if (pr.kind === 'torch') {
        const fl = 0.9 + 0.12 * Math.sin(this.time * 11 + x);
        const glow = ctx.createRadialGradient(x, y - 28, 3, x, y - 28, 95 * fl);
        glow.addColorStop(0, theme.accent + '55'); glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y - 28, 95 * fl, 0, TAU); ctx.fill();
        ctx.fillStyle = '#4b3621'; ctx.fillRect(x - 3, y - 30, 6, 32);
        ctx.fillStyle = theme.accent; ctx.beginPath(); ctx.arc(x, y - 34, 7 * fl, 0, TAU); ctx.fill();
      } else if (pr.kind === 'signpost') {
        ctx.fillStyle = '#5c3d24'; ctx.fillRect(x - 3, y - 34, 6, 36);
        ctx.fillStyle = '#8b5e34'; ctx.fillRect(x - 22, y - 32, 44, 15);
        ctx.strokeStyle = '#3b2412'; ctx.lineWidth = 1.5; ctx.strokeRect(x - 22, y - 32, 44, 15);
      } else if (pr.kind === 'spore') {
        // Lush Nightcamp Poison-Village glowing spore vine cluster!
        const s = pr.scale || 1;
        const pulse = 0.86 + 0.14 * Math.sin(this.time * 3.5 + x * 0.02);
        const glow = ctx.createRadialGradient(x, y - 24 * s, 4, x, y - 24 * s, 68 * s * pulse);
        glow.addColorStop(0, 'rgba(163,230,53,0.42)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y - 24 * s, 68 * s * pulse, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.38)'; ctx.beginPath(); ctx.ellipse(x, y + 4, 28 * s, 11 * s, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#4c2b59'; ctx.strokeStyle = '#1e1229'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x - 10 * s, y - 16 * s, 16 * s, 0, TAU); ctx.arc(x + 12 * s, y - 20 * s, 18 * s, 0, TAU); ctx.arc(x, y - 34 * s, 15 * s, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#bef264'; ctx.shadowColor = '#84cc16'; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(x - 6 * s, y - 28 * s, 8 * s * pulse, 0, TAU); ctx.arc(x + 10 * s, y - 16 * s, 6.5 * s * pulse, 0, TAU); ctx.fill();
        ctx.shadowBlur = 0;
      } else if (pr.kind === 'tree') {
        const s = pr.scale || 1;
        ctx.fillStyle = 'rgba(0,0,0,0.34)'; ctx.beginPath(); ctx.ellipse(x, y + 4, 28 * s, 11 * s, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#5a3d28'; ctx.fillRect(x - 6 * s, y - 28 * s, 12 * s, 30 * s);
        ctx.fillStyle = night ? '#1c4232' : '#2d6a3e';
        ctx.beginPath(); ctx.arc(x, y - 42 * s, 28 * s, 0, TAU); ctx.fill();
        ctx.fillStyle = night ? '#275943' : '#3d8b4f';
        ctx.beginPath(); ctx.arc(x - 8 * s, y - 50 * s, 20 * s, 0, TAU); ctx.fill();
      } else if (pr.kind === 'pumpkin') {
        const s = pr.scale || 1;
        ctx.fillStyle = 'rgba(0,0,0,0.32)'; ctx.beginPath(); ctx.ellipse(x, y + 4, 20 * s, 8 * s, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ea580c'; ctx.beginPath(); ctx.ellipse(x, y - 10 * s, 18 * s, 14 * s, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fde047'; ctx.fillRect(x - 6 * s, y - 14 * s, 4 * s, 4 * s); ctx.fillRect(x + 2 * s, y - 14 * s, 4 * s, 4 * s);
      } else if (pr.kind === 'crystal') {
        const s = pr.scale || 1;
        ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.moveTo(x, y - 40 * s); ctx.lineTo(x + 14 * s, y); ctx.lineTo(x - 14 * s, y); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#bae6fd'; ctx.beginPath(); ctx.moveTo(x - 8 * s, y - 26 * s); ctx.lineTo(x + 2 * s, y); ctx.lineTo(x - 18 * s, y); ctx.closePath(); ctx.fill();
      } else if (pr.kind === 'grave') {
        ctx.fillStyle = '#525268'; ctx.beginPath(); ctx.roundRect(x - 14, y - 34, 28, 36, [12, 12, 2, 2]); ctx.fill();
        ctx.strokeStyle = '#71718a'; ctx.lineWidth = 1.5; ctx.stroke();
      } else if (pr.kind === 'lava') {
        ctx.fillStyle = '#291717'; ctx.beginPath(); ctx.ellipse(x, y, 30, 14, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ff5733'; ctx.beginPath(); ctx.ellipse(x, y, 18, 7, 0, 0, TAU); ctx.fill();
      } else if (pr.kind === 'stage') {
        ctx.fillStyle = '#6b2150'; ctx.fillRect(x - 8, y - 55, 16, 56);
        ctx.fillStyle = '#fbbf24'; ctx.fillRect(x - 10, y - 58, 20, 6);
      } else if (pr.kind === 'rock') {
        const s = pr.scale || 1;
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(x, y + 3, 18 * s, 7 * s, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = night ? '#3c404f' : '#6c7280'; ctx.beginPath(); ctx.ellipse(x, y - 7 * s, 16 * s, 11 * s, 0, 0, TAU); ctx.fill();
      } else if (pr.kind === 'flower') {
        ctx.fillStyle = pr.seed > 0.5 ? '#fde047' : '#f9a8d4';
        ctx.beginPath(); ctx.arc(x, y, 3.2, 0, TAU); ctx.fill();
      }
    }

    _drawGroundEffects(ctx) {
      // Linger DoT rings
      for (const z of this.lingerZones) {
        const p = 0.9 + 0.1 * Math.sin(this.time * 10);
        ctx.save();
        ctx.globalAlpha = Math.min(0.6, z.life * 0.5);
        ctx.strokeStyle = z.color; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(z.x, z.y, z.r * p, z.r * 0.65 * p, 0, 0, TAU); ctx.stroke();
        ctx.fillStyle = z.color + '24'; ctx.fill();
        ctx.restore();
      }

      // Boss Crimson Telegraphs!
      for (const tg of this.telegraphs) {
        const prog = clamp(1 - tg.left / tg.dur, 0, 1);
        ctx.save();
        ctx.strokeStyle = `rgba(239,68,68,${0.55 + prog * 0.45})`;
        ctx.fillStyle = `rgba(239,68,68,${0.12 + prog * 0.25})`;
        ctx.lineWidth = 2.5;
        if (tg.kind === 'circle') {
          ctx.beginPath(); ctx.arc(tg.x, tg.y, tg.r, 0, TAU); ctx.fill(); ctx.stroke();
          ctx.fillStyle = 'rgba(239,68,68,0.28)';
          ctx.beginPath(); ctx.arc(tg.x, tg.y, tg.r * prog, 0, TAU); ctx.fill();
        } else if (tg.kind === 'cone') {
          ctx.beginPath(); ctx.moveTo(tg.x, tg.y);
          ctx.arc(tg.x, tg.y, tg.range, tg.ang - tg.spread, tg.ang + tg.spread);
          ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillStyle = 'rgba(239,68,68,0.32)';
          ctx.beginPath(); ctx.moveTo(tg.x, tg.y);
          ctx.arc(tg.x, tg.y, tg.range * prog, tg.ang - tg.spread, tg.ang + tg.spread);
          ctx.closePath(); ctx.fill();
        }
        ctx.restore();
      }
    }

    _drawLoot(ctx, lt) {
      ctx.save();
      if (lt.kind === 'gear') {
        const beam = ctx.createLinearGradient(lt.x, lt.y - 75, lt.x, lt.y);
        beam.addColorStop(0, lt.color + '00'); beam.addColorStop(1, lt.color + 'aa');
        ctx.fillStyle = beam; ctx.fillRect(lt.x - 5, lt.y - 75, 10, 75);
      }
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(lt.x, lt.y + 3, 7, 3, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = lt.color; ctx.strokeStyle = '#78350f'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(lt.x, lt.y - lt.z - 4, lt.kind === 'gear' ? 7 : 4.5, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.restore();
    }

    _drawHero(ctx) {
      const h = this.hero;
      const job = this.build && this.idx.jobsById[this.build.job];
      const wSlot = this.build && this.build.equip && this.build.equip.weapon;
      const wItem = wSlot && this.idx.itemsById[wSlot.id];
      const bob = h.dead ? 0 : (h.moving ? Math.abs(Math.sin(h.walkPhase)) * -7 : Math.sin(this.time * 4) * 2.5);

      // Dash ghost afterimages!
      for (const gh of this.ghosts) {
        ctx.save();
        ctx.globalAlpha = (gh.life / gh.maxLife) * 0.42;
        if (job && job.ic) {
          ctx.translate(gh.x, gh.y - 44);
          if (gh.face < 0) ctx.scale(-1, 1);
          this.imgCache.drawAtlasCell(ctx, job.ic, -48, -48, 96, 96);
        }
        ctx.restore();
      }

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath(); ctx.ellipse(h.x, h.y + 6, 28, 10, 0, 0, TAU); ctx.fill();

      // Magic Cast Circle under Hero
      if (h.castAnim > 0) {
        ctx.save();
        ctx.strokeStyle = h.castColor; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.ellipse(h.x, h.y + 4, 48, 22, 0, 0, TAU); ctx.stroke();
        ctx.restore();
      }

      // Class Companions & Auras!
      const jid = this.build ? this.build.job : '';
      if (jid === 'puppeteer' || jid === 'showmaster') {
        const px = h.puppet.x, py = h.puppet.y - 26;
        ctx.strokeStyle = 'rgba(192,132,252,0.55)'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(h.x, h.y - 38); ctx.quadraticCurveTo((h.x + px) / 2, Math.min(h.y, py) - 42, px, py); ctx.stroke();
        ctx.fillStyle = '#3b1d5e'; ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(px, py, 14, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fde047';
        ctx.beginPath(); ctx.arc(px - 4, py - 2, 2.2, 0, TAU); ctx.arc(px + 4, py - 2, 2.2, 0, TAU); ctx.fill();
      } else if (['archmage', 'firemage', 'icemage', 'warlock', 'starcore', 'winterlord', 'astral', 'hexlord'].includes(jid)) {
        const orbCols = ['#ff7a3d', '#5aa9ff', '#7fd67a'];
        for (let i = 0; i < 3; i++) {
          const a = this.time * 3.1 + (i * TAU) / 3;
          const ox = h.x + Math.cos(a) * 42, oy = h.y - 36 + Math.sin(a) * 16;
          ctx.fillStyle = orbCols[i]; ctx.shadowColor = orbCols[i]; ctx.shadowBlur = 10;
          ctx.beginPath(); ctx.arc(ox, oy, 5.2, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
        }
      } else if (['paladin', 'bishop', 'lightkeeper', 'dawnwarden', 'starsaint', 'beacon'].includes(jid)) {
        ctx.strokeStyle = 'rgba(254,240,138,0.42)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(h.x, h.y + 4, 38, 15, 0, 0, TAU); ctx.stroke();
      }

      // Draw REAL Nightcamp Job Character Sprite!
      ctx.save();
      if (h.dead) ctx.globalAlpha = 0.35;
      else if (h.invLeft > 0) ctx.globalAlpha = 0.65;
      if (h.hurtFlash > 0) ctx.filter = 'brightness(1.9) saturate(2) hue-rotate(-30deg)';
      const spriteSize = 96;
      ctx.translate(h.x, h.y - 38 + bob);
      if (h.face < 0) ctx.scale(-1, 1);
      const drawn = job && job.ic && this.imgCache.drawAtlasCell(ctx, job.ic, -spriteSize / 2, -spriteSize / 2, spriteSize, spriteSize);
      if (!drawn) {
        ctx.fillStyle = '#38bdf8'; ctx.strokeStyle = '#fef3c7'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 8, 22, 0, TAU); ctx.fill(); ctx.stroke();
      }
      ctx.restore();

      // Draw REAL Equipped Weapon Sprite in Hand (aimed/swinging toward cursor!)
      if (wItem && wItem.ic && !h.dead) {
        ctx.save();
        const swingOff = h.swingT > 0 ? Math.sin((1 - h.swingT / 0.24) * Math.PI) * 1.15 : 0;
        const wAng = (h.swingT > 0 ? h.swingAng : h.aimAng) + swingOff - 0.35;
        ctx.translate(h.x + h.face * 18, h.y - 28 + bob);
        ctx.rotate(wAng);
        this.imgCache.drawAtlasCell(ctx, wItem.ic, -4, -20, 38, 38);
        ctx.restore();
      }

      // Hero Overhead Name + Mini HP/SP Bar
      const bw = 66, bx = h.x - bw / 2, by = h.y - 96;
      ctx.font = '800 11px "Noto Sans Thai", sans-serif'; ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(10,12,24,0.9)'; ctx.lineWidth = 3;
      const lbl = `${(job && job.n && job.n.th) || 'Hero'} Lv.${(this.build && this.build.lv) || 1}`;
      ctx.strokeText(lbl, h.x, by - 5);
      ctx.fillStyle = '#fef3c7'; ctx.fillText(lbl, h.x, by - 5);

      ctx.fillStyle = 'rgba(10,12,24,0.86)'; ctx.fillRect(bx - 1, by - 1, bw + 2, 7);
      ctx.fillStyle = this.env.godMode ? '#fbbf24' : '#ef4444';
      ctx.fillRect(bx, by, bw * clamp(h.hp / Math.max(1, h.maxHp), 0, 1), 5);
      ctx.fillStyle = 'rgba(10,12,24,0.86)'; ctx.fillRect(bx - 1, by + 6, bw + 2, 4);
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(bx, by + 7, bw * clamp(h.sp / Math.max(1, h.maxSp), 0, 1), 2.5);
    }

    _drawScarecrowDummy(ctx, m) {
      // Hand-drawn charming Nightcamp Scarecrow Training Dummy (หุ่นไล่กาฝึกซ้อม)
      const tilt = m.wobble || 0;
      ctx.save();
      ctx.translate(m.x, m.y);

      // Ground shadow & wooden base mound
      ctx.fillStyle = 'rgba(0,0,0,0.48)';
      ctx.beginPath(); ctx.ellipse(0, 6, 36, 13, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#4a321e';
      ctx.strokeStyle = '#24170d'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(0, 3, 24, 8, 0, 0, TAU); ctx.fill(); ctx.stroke();

      // Pivot entire scarecrow around stake base for hit wobble!
      ctx.rotate(tilt);
      if (m.hitFlash > 0) ctx.filter = 'brightness(2.0)';

      // Vertical wooden stake
      ctx.fillStyle = '#6b4423';
      ctx.strokeStyle = '#2d1a0b'; ctx.lineWidth = 2;
      ctx.fillRect(-6, -92, 12, 95);
      ctx.strokeRect(-6, -92, 12, 95);

      // Horizontal wooden crossbeam (arms)
      ctx.fillStyle = '#7c502b';
      ctx.fillRect(-48, -68, 96, 10);
      ctx.strokeRect(-48, -68, 96, 10);

      // Straw tufts sticking out of both sleeve ends
      ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2.6;
      for (let side of [-1, 1]) {
        for (let k = -1; k <= 1; k++) {
          ctx.beginPath();
          ctx.moveTo(side * 46, -63);
          ctx.lineTo(side * 58, -63 + k * 7);
          ctx.stroke();
        }
      }

      // Straw skirt tufts at waist
      ctx.strokeStyle = '#eab308'; ctx.lineWidth = 2.4;
      for (let sx = -18; sx <= 18; sx += 6) {
        ctx.beginPath();
        ctx.moveTo(sx, -30);
        ctx.lineTo(sx * 1.25, -16);
        ctx.stroke();
      }

      // Burlap sack shirt / torso
      ctx.fillStyle = '#a16207';
      ctx.strokeStyle = '#422006'; ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-22, -72);
      ctx.lineTo(22, -72);
      ctx.lineTo(26, -28);
      ctx.lineTo(-26, -28);
      ctx.closePath();
      ctx.fill(); ctx.stroke();

      // Rope belt tied around waist
      ctx.strokeStyle = '#fef08a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-24, -36); ctx.lineTo(24, -36); ctx.stroke();

      // Red/White Archery Bullseye Target pinned on chest!
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#991b1b'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, -52, 14, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath(); ctx.arc(0, -52, 9.5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath(); ctx.arc(0, -52, 5.5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#dc2626';
      ctx.beginPath(); ctx.arc(0, -52, 2.5, 0, TAU); ctx.fill();

      // Burlap sack head
      ctx.fillStyle = '#d9b37c';
      ctx.strokeStyle = '#451a03'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(0, -88, 17, 0, TAU); ctx.fill(); ctx.stroke();

      // Cute stitched scarecrow face (winces > < when hit!)
      ctx.strokeStyle = '#291507'; ctx.lineWidth = 2.1;
      if (m.hitFlash > 0) {
        // > < wince eyes
        ctx.beginPath(); ctx.moveTo(-9, -92); ctx.lineTo(-4, -89); ctx.lineTo(-9, -86); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(9, -92); ctx.lineTo(4, -89); ctx.lineTo(9, -86); ctx.stroke();
      } else {
        // Stitched X button eyes
        ctx.beginPath(); ctx.moveTo(-9, -92); ctx.lineTo(-4, -87); ctx.moveTo(-4, -92); ctx.lineTo(-9, -87); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(4, -92); ctx.lineTo(9, -87); ctx.moveTo(9, -92); ctx.lineTo(4, -87); ctx.stroke();
      }
      // Stitched smile
      ctx.beginPath(); ctx.arc(0, -84, 7, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();

      // Pointed straw farmer hat with red ribbon
      ctx.fillStyle = '#eab308';
      ctx.strokeStyle = '#713f12'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(0, -101, 29, 8, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(-17, -101);
      ctx.lineTo(2, -128);
      ctx.lineTo(17, -101);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      // Red ribbon band
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-15, -106, 30, 5);

      ctx.restore();
    }

    _drawMob(ctx, m) {
      const sp = m.spec;
      const isDummy = !!(sp.isDummy || sp.id === 'custom_dummy');
      const isBoss = !!sp.boss;
      const bob = isDummy ? 0 : Math.sin(this.time * 4.2 + m.bobOff) * 3;
      const drawH = isDummy ? 132 : (isBoss ? 136 : 84);

      if (isDummy) {
        this._drawScarecrowDummy(ctx, m);
      } else {
      // Shadow & Boss Glow Aura
      ctx.fillStyle = 'rgba(0,0,0,0.46)';
      ctx.beginPath(); ctx.ellipse(m.x, m.y + 6, drawH * 0.34, drawH * 0.12, 0, 0, TAU); ctx.fill();
      if (isBoss) {
        const aura = ctx.createRadialGradient(m.x, m.y + 4, 6, m.x, m.y + 4, drawH * 0.56);
        aura.addColorStop(0, m.breakLeft > 0 ? 'rgba(251,191,36,0.48)' : 'rgba(192,132,252,0.36)');
        aura.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = aura;
        ctx.beginPath(); ctx.ellipse(m.x, m.y + 4, drawH * 0.56, drawH * 0.24, 0, 0, TAU); ctx.fill();
      }

      // Draw REAL Nightcamp Full-Res Monster/Boss Artwork (NO CORS block!)
      ctx.save();
      if (m.hitFlash > 0) ctx.filter = 'brightness(2.3)';
      const fullImg = sp.img ? this.imgCache.getMonsterFull(sp.img) : null;
      let drawn = false;
      if (fullImg) {
        const aspect = fullImg.naturalWidth / Math.max(1, fullImg.naturalHeight);
        const dw = Math.min(drawH * 1.45, drawH * aspect);
        ctx.translate(m.x, m.y - drawH + 16 + bob);
        if (m.face > 0) ctx.scale(-1, 1);
        ctx.drawImage(fullImg, -dw / 2, 0, dw, drawH);
        drawn = true;
      } else if (sp.ic) {
        ctx.translate(m.x, m.y - drawH + 16 + bob);
        if (m.face > 0) ctx.scale(-1, 1);
        drawn = this.imgCache.drawAtlasCell(ctx, sp.ic, -drawH / 2, 0, drawH, drawH);
      }
      if (!drawn) {
        ctx.fillStyle = isBoss ? '#7c3aed' : '#92400e';
        ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(m.x, m.y - drawH * 0.4 + bob, drawH * 0.26, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.font = '800 18px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fef3c7';
        ctx.fillText(isBoss ? '👑' : '🎯', m.x, m.y - drawH * 0.34 + bob);
      }
      ctx.restore();
      }

      // Authentic Nightcamp Monster Nameplate ("นางพญามด Lv 50" / "🌾 หุ่นไล่กา Lv 60")
      ctx.save();
      ctx.textAlign = 'center';
      const nameY = m.y - drawH + 10;
      ctx.font = `800 ${isBoss || isDummy ? 12.5 : 11}px "Noto Sans Thai", sans-serif`;
      ctx.strokeStyle = 'rgba(10,8,20,0.95)'; ctx.lineWidth = 3.6;
      const mLabel = isDummy ? `🌾 ${sp.name} Lv ${sp.lv}` : `${isBoss ? '👑 ' : ''}${sp.name} Lv ${sp.lv}`;
      ctx.strokeText(mLabel, m.x, nameY);
      ctx.fillStyle = isDummy ? '#fde68a' : (isBoss ? '#fde047' : '#fca5a5');
      ctx.fillText(mLabel, m.x, nameY);
      if (m.breakLeft > 0) {
        ctx.font = '800 11px "Noto Sans Thai", sans-serif';
        ctx.strokeText('เกราะร้าว', m.x, nameY + 14);
        ctx.fillStyle = '#fbbf24';
        ctx.fillText('เกราะร้าว', m.x, nameY + 14);
      }
      ctx.restore();

      // Status icons
      const sts = [];
      if (m.breakLeft > 0) sts.push('💥');
      if (m.statuses.burn) sts.push('🔥');
      if (m.statuses.chill) sts.push('❄️');
      if (m.statuses.shock) sts.push('⚡');
      if (m.statuses.poison) sts.push('☠️');
      if (m.statuses.curse) sts.push('👁️');
      if (sts.length) {
        ctx.font = '13px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(sts.join(' '), m.x, nameY - 14);
      }

      // Per-mob Nightcamp HP bar
      const bw = isBoss ? 92 : 62, bx = m.x - bw / 2, by = m.y + 10;
      ctx.fillStyle = 'rgba(8,6,18,0.88)'; ctx.fillRect(bx - 1, by - 1, bw + 2, 7);
      ctx.fillStyle = '#fb923c'; ctx.fillRect(bx, by, bw * clamp(m.hpTrail / m.maxHp, 0, 1), 5);
      ctx.fillStyle = '#ef4444'; ctx.fillRect(bx, by, bw * clamp(m.hp / m.maxHp, 0, 1), 5);
    }

    _drawProjectiles(ctx) {
      // Player projectiles
      for (const p of this.projectiles) {
        ctx.save();
        ctx.translate(p.x, p.y);
        if (p.style === 'note') {
          ctx.font = '800 22px sans-serif'; ctx.fillStyle = p.color;
          ctx.shadowColor = p.color; ctx.shadowBlur = 10;
          ctx.fillText('♪', -6, 6);
        } else {
          ctx.rotate(p.ang);
          ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 12;
          ctx.beginPath();
          if (p.style === 'lance' || p.style === 'arrow') {
            ctx.moveTo(20, 0); ctx.lineTo(-14, -4.5); ctx.lineTo(-8, 0); ctx.lineTo(-14, 4.5);
          } else {
            ctx.ellipse(0, 0, 14, 4.5, 0, 0, TAU);
          }
          ctx.fill();
        }
        ctx.restore();
      }
      // Boss dodgeable orbs
      for (const bp of this.bossProjectiles) {
        ctx.save();
        ctx.fillStyle = bp.color; ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 14;
        ctx.beginPath(); ctx.arc(bp.x, bp.y, bp.r, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(bp.x, bp.y, bp.r * 0.42, 0, TAU); ctx.fill();
        ctx.restore();
      }
    }

    _drawVfx(ctx) {
      for (const v of this.vfx) {
        const f = clamp(v.life / v.maxLife, 0, 1), p = 1 - f;
        ctx.save();
        ctx.globalAlpha = f;
        switch (v.type) {
          case 'ring':
          case 'clickring': {
            const curR = v.r + (v.maxR - v.r) * p;
            ctx.strokeStyle = v.color; ctx.lineWidth = (v.lw || 2.5) * f;
            ctx.beginPath(); ctx.ellipse(v.x, v.y, curR, curR * 0.62, 0, 0, TAU); ctx.stroke();
            break;
          }
          case 'slash': {
            ctx.translate(v.x, v.y); ctx.rotate(v.ang || 0);
            ctx.strokeStyle = v.color; ctx.shadowColor = v.color; ctx.shadowBlur = 14;
            ctx.lineWidth = (v.big ? 10 : 6) * f; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.arc(0, 0, v.r * (0.75 + p * 0.35), -1.05, 1.05); ctx.stroke();
            break;
          }
          case 'meteor': {
            const cx = v.sx + (v.tx - v.sx) * p, cy = v.sy + (v.ty - v.sy) * p;
            const g = ctx.createLinearGradient(v.sx, v.sy, cx, cy);
            g.addColorStop(0, 'rgba(255,120,40,0)'); g.addColorStop(1, v.color);
            ctx.strokeStyle = g; ctx.lineWidth = 11; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(cx - (v.tx - v.sx) * 0.28, cy - (v.ty - v.sy) * 0.28); ctx.lineTo(cx, cy); ctx.stroke();
            ctx.fillStyle = v.glow; ctx.shadowColor = v.color; ctx.shadowBlur = 18;
            ctx.beginPath(); ctx.arc(cx, cy, 13, 0, TAU); ctx.fill();
            break;
          }
          case 'lightning': {
            ctx.strokeStyle = v.color; ctx.shadowColor = v.color; ctx.shadowBlur = 14; ctx.lineWidth = 3.8 * f;
            ctx.beginPath(); v.pts.forEach((pt, idx) => idx === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)); ctx.stroke();
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.4 * f; ctx.stroke();
            break;
          }
          case 'dome': {
            const curR = v.r * (0.72 + p * 0.35);
            const g = ctx.createRadialGradient(v.x, v.y, 4, v.x, v.y, curR);
            g.addColorStop(0, 'rgba(255,252,210,0.88)');
            g.addColorStop(0.55, 'rgba(251,191,36,0.52)');
            g.addColorStop(1, 'rgba(245,158,11,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(v.x, v.y, curR, 0, TAU); ctx.fill();
            ctx.strokeStyle = '#fef08a'; ctx.lineWidth = 3 * f;
            ctx.beginPath(); ctx.arc(v.x, v.y, curR * 0.92, 0, TAU); ctx.stroke();
            break;
          }
          case 'pillar': {
            const g = ctx.createLinearGradient(v.x - v.w / 2, 0, v.x + v.w / 2, 0);
            g.addColorStop(0, 'rgba(255,224,122,0)'); g.addColorStop(0.5, v.color); g.addColorStop(1, 'rgba(255,224,122,0)');
            ctx.fillStyle = g; ctx.fillRect(v.x - v.w / 2, v.y - 340, v.w, 355);
            break;
          }
          case 'cross': {
            ctx.strokeStyle = v.color; ctx.shadowColor = v.color; ctx.shadowBlur = 14; ctx.lineWidth = 7 * f; ctx.lineCap = 'round';
            const s = v.size * (0.75 + p * 0.35);
            ctx.beginPath(); ctx.moveTo(v.x, v.y - s); ctx.lineTo(v.x, v.y + s);
            ctx.moveTo(v.x - s * 0.75, v.y - s * 0.25); ctx.lineTo(v.x + s * 0.75, v.y - s * 0.25); ctx.stroke();
            break;
          }
          case 'wire': {
            ctx.strokeStyle = v.color; ctx.shadowColor = v.color; ctx.shadowBlur = 8; ctx.lineWidth = 2.2;
            ctx.beginPath(); ctx.moveTo(v.x1, v.y1); ctx.lineTo(v.x2, v.y2); ctx.stroke();
            break;
          }
          case 'vortex': {
            ctx.strokeStyle = v.color; ctx.lineWidth = 3.2 * f;
            for (let k = 0; k < 3; k++) {
              const a0 = this.time * 12 + k * 2.1;
              ctx.beginPath(); ctx.arc(v.x, v.y, v.r * (0.35 + k * 0.25), a0, a0 + 1.8); ctx.stroke();
            }
            break;
          }
          case 'sigil': {
            ctx.font = '22px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('👁️', v.x, v.y - p * 12);
            break;
          }
          case 'spark':
          case 'dust': {
            ctx.fillStyle = v.color; ctx.beginPath(); ctx.arc(v.x, v.y, v.r * f, 0, TAU); ctx.fill();
            break;
          }
          case 'banner': {
            ctx.font = '800 15px "Noto Sans Thai", sans-serif'; ctx.textAlign = 'center';
            ctx.strokeStyle = 'rgba(10,12,24,0.92)'; ctx.lineWidth = 4;
            ctx.strokeText(v.text, v.x, v.y - p * 22);
            ctx.fillStyle = v.color; ctx.fillText(v.text, v.x, v.y - p * 22);
            break;
          }
        }
        ctx.restore();
      }
    }

    _drawAmbient(ctx, theme) {
      for (const a of this.ambient) {
        if (Math.abs(a.x - this.cam.x) > this.width / this.cam.zoom) continue;
        if (Math.abs(a.y - this.cam.y) > this.height / this.cam.zoom) continue;
        const al = 0.22 + 0.45 * Math.sin(this.time * 3 + a.ph);
        ctx.fillStyle = theme.particle;
        ctx.globalAlpha = Math.max(0.06, al);
        ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    _drawFloats(ctx) {
      ctx.save();
      ctx.textAlign = 'center';
      for (const fl of this.floats) {
        const f = clamp(fl.life / fl.maxLife, 0, 1), age = 1 - f;
        const punch = fl.style === 'crit' && age < 0.16 ? 1 + (0.16 - age) * 3.5 : 1;
        ctx.save();
        ctx.globalAlpha = f < 0.25 ? f * 4 : 1;
        ctx.translate(fl.x, fl.y);
        ctx.scale(punch, punch);
        let size = 16, fill = '#ffffff', stroke = '#1e1b2e';
        if (fl.style === 'crit') { size = 24; fill = '#fde047'; stroke = '#7c2d12'; }
        else if (fl.style === 'magic') { size = 17; fill = fl.accent || '#7dd3fc'; stroke = '#0c4a6e'; }
        else if (fl.style === 'heal') { size = 15; fill = '#4ade80'; stroke = '#14532d'; }
        else if (fl.style === 'enemy') { size = 17; fill = '#f87171'; stroke = '#450a0a'; }
        else if (fl.style === 'dodge') { size = 13.5; fill = '#93c5fd'; stroke = '#1e3a8a'; }
        else if (fl.style === 'miss') { size = 13; fill = '#94a3b8'; stroke = '#0f172a'; }
        ctx.font = `900 ${size}px "Baloo 2", "Noto Sans Thai", sans-serif`;
        ctx.lineWidth = fl.style === 'crit' ? 4.5 : 3.2;
        ctx.strokeStyle = stroke; ctx.strokeText(fl.text, 0, 0);
        ctx.fillStyle = fill; ctx.fillText(fl.text, 0, 0);
        ctx.restore();
      }
      ctx.restore();
    }

    _renderMinimap(theme, night) {
      const mc = this.minimapCtx;
      if (!mc || !this.minimapCanvas) return;
      const mw = this.minimapCanvas.width, mh = this.minimapCanvas.height;
      const sx = mw / WORLD_W, sy = mh / WORLD_H;

      mc.fillStyle = night ? theme.groundNight : theme.groundDay;
      mc.fillRect(0, 0, mw, mh);

      // Plaza & roads on minimap
      mc.fillStyle = night ? theme.roadNight : theme.roadDay;
      mc.fillRect(0, mh / 2 - 2, mw, 4);
      mc.fillRect(mw / 2 - 2, 0, 4, mh);
      mc.fillStyle = night ? theme.plazaNight : theme.plazaDay;
      mc.beginPath(); mc.ellipse(mw / 2, mh / 2, 340 * sx, 230 * sy, 0, 0, TAU); mc.fill();

      // Loot dots
      mc.fillStyle = '#fde047';
      for (const lt of this.lootDrops) mc.fillRect(lt.x * sx - 1, lt.y * sy - 1, 2, 2);

      // Monsters & Bosses
      for (const m of this.mobs) {
        mc.fillStyle = m.spec.boss ? '#c084fc' : '#f87171';
        mc.beginPath(); mc.arc(m.x * sx, m.y * sy, m.spec.boss ? 4 : 2.5, 0, TAU); mc.fill();
        if (m.spec.boss) { mc.strokeStyle = '#fde047'; mc.lineWidth = 1; mc.stroke(); }
      }

      // Hero green dot
      mc.fillStyle = '#4ade80';
      mc.strokeStyle = '#ffffff'; mc.lineWidth = 1.2;
      mc.beginPath(); mc.arc(this.hero.x * sx, this.hero.y * sy, 3.8, 0, TAU); mc.fill(); mc.stroke();
    }
  }

  root.NCBuildSimArena = BuildSimArena;
  root.NC_ARENA_THEMES = ARENA_THEMES;
})(typeof globalThis !== 'undefined' ? globalThis : window);
