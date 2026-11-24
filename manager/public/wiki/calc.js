/* Rune damage maths for the helper page.
   Numbers: the game's own (js/bl_runes.js RUNES; season 2 runes from the wiki data the game builds).
   Per-hit factors are applied the way the game's NC.hitRoll hook does (js/bl_runes.js "damage: per hit"):
   every socketed rune multiplies the hit. Split's extra shots, bounces and the echo are the skill's own hits again, so they get
   the same factors (x); the linger ring, the falling star and the corrode poison are hits of their own ('bl_linger',
   'bl_skyfall': only a curse touches them) worth a share of the skill's plain hit (xf).
   Season 2 online (the wiki's rule): what runes ADD to one hit counts together up to +bucket (50%) a hit, a rune's minus
   stays outside the cap; procs may pay at most procCap (50%) of your own damage. "offline" mode = plain multiply, no caps. */
(function () {
  'use strict';
  // a rune's own roll on one of its numbers (js/bl_runes.js rolled())
  function rolled(R, key, x, qb, qd) {
    const roll = R.num && R.num.roll;
    if (!roll || !(x > 0 || x < 0)) return x;
    const f = key === roll.bonus ? 1 + (qb || 0) : key === roll.bad ? 1 - (qd || 0) : null;
    if (f == null) return x;
    return (key === roll.bonus ? roll.bonusMode : roll.badMode) === 'mul' ? x * f : 1 + (x - 1) * f;
  }
  // one rune at tier t in scenario sc {n: targets, night: bool, qb, qd} ->
  // {b: bonus factor (counts in the cap), p: minus factor, x: extra hits as a share of one hit, cd: casts-per-time factor,
  //  xf: extra hits the other runes do not boost, pr: proc share, gun: is a gun rune, note: [key, ...args], none: no damage number}
  function effect(R, t, sc) {
    const N = R.num || {}, i = t - 1;
    const v = (key) => (N[key] ? rolled(R, key, N[key][i], sc.qb, sc.qd) : undefined);
    const H = () => Math.max(1, sc.hits || 1);
    const n = Math.max(1, sc.n || 1), o = { b: 1, p: 1, x: 0, xf: 0, cd: 1, pr: 0 };
    switch (R.k) {
      // split (js/bl_runes.js rerun): the whole skill again per extra shot, turned ±0.22 rad (~12.6°), every hit × k.
      // A lone target near you takes the side volleys too (sc.splitAll); far away only the middle one reaches it.
      // A skill with splitIn (the buckshot) puts the extra pellets INTO its own cone instead (9 -> 9 + extra, same width).
      case 'split':
        if (sc.splitIn) { o.p = v('k') * (sc.splitIn + N.extra[i]) / sc.splitIn; o.note = ['splitIn', sc.splitIn, N.extra[i], v('k')]; }
        else { o.p = v('k'); o.x = sc.splitAll ? N.extra[i] : Math.min(N.extra[i], n - 1); o.note = ['split', N.extra[i], H(), v('k')]; }
        break;
      case 'pierce': o.p = v('k'); o.note = ['pierce']; break;
      // bounce: a hit starts a chain of n2 bounces at k, at most one chain a skill per 0.12 s (BOUNCE.t[id]): one a cast
      case 'bounce': o.x = Math.min(N.n2[i], n - 1) * v('k') / H(); o.note = ['bounce', N.n2[i], H(), v('k')]; break;
      // echo (ECHO.until = recast + 1.2 s): EVERY hit of the skill in [0.6 s, 1.8 s] after the cast is × k, the first
      // cast's late hits too, the echo's hits after it are whole. Hits spread evenly over the skill's dur (0: all at once).
      case 'echo': {
        const k = v('k'), Dd = Math.max(0, sc.dur || 0);
        const ovO = Dd > 0 ? Math.max(0, Math.min(Dd, 1.8) - 0.6) / Dd : 0, ovE = Dd > 0 ? Math.min(Dd, 1.2) / Dd : 1;
        o.x = 1 - (1 - k) * (ovO + ovE); o.note = ['echo', H(), k, Dd]; break;
      }
      case 'wide': o.p = v('k'); o.note = ['area', v('s')]; break;
      case 'focus': o.b = v('k'); o.note = ['area', v('s')]; break;
      // the ring hits every second for d s at ONE hit's multiplier × k (K.zone mul: SK[id].mul(lv) * k): a share of a cast of sc.hits hits
      case 'linger': o.xf = N.d[i] * v('k') / H(); o.note = ['linger', N.d[i], H()]; break;
      case 'haste': o.p = v('dk'); o.cd = 1 / v('c'); o.note = ['haste', v('c')]; break;
      // heavy: after-cast delay × c too (NC.skillAcdOf): spammed into its delay the damage over time is k / c
      case 'heavy': o.b = v('k'); o.note = ['delay', v('c'), v('k')]; break;
      case 'blood': o.b = v('k'); o.note = ['blood', v('hp')]; break;
      case 'execute': { const at = N.at[i], k = v('k'); o.b = 1 / ((1 - at) + at / k); o.note = ['execute', at, k]; break; }
      // corrode: poison worth k of the hit, set again only when the old one has 2 s or less left: about once a cast
      case 'corrode': o.xf = v('k') / H(); o.note = ['corrode', H(), v('k')]; break;
      // curse: set AFTER a hit (e._blCurse), so a skill's own first hit never has it; it lasts 5 s for every hit of yours
      case 'curse': {
        const f = sc.cd != null && sc.cd < 5 ? 1 : (H() - 1) / H();
        o.b = 1 + (v('k') - 1) * f; o.note = ['curse', f, sc.cd]; break;
      }
      case 'skyfall': o.xf = N.n2[i] * v('k') / H(); o.note = ['skyfall', N.n2[i], H()]; break;
      case 'rush': o.b = v('k'); o.note = ['rush']; break;
      // ambush: only while the monster is untouched (e._blTouched is set by your first rune-skill hit on it): one hit
      case 'ambush': o.b = 1 + (v('k') - 1) / H(); o.note = ['ambush', H()]; o.cond = 1; break;
      case 'moonrite': if (sc.night) o.b = v('k'); else o.p = v('dk'); o.note = [sc.night ? 'night' : 'day']; break;
      default:
        if (N.share) {
          const s = v('share'), alone = N.alone == null ? 1 : N.alone;
          o.pr = n > 1 ? s : s * alone; o.gun = R.kind === 'gun';
          o.note = [n > 1 ? 'procPack' : 'procAlone', alone];
        } else if (N.v) { o.none = true; o.note = ['armor', N.v[i]]; }
        else if (N.guard) { o.none = true; o.note = ['guard', N.guard[i]]; }
        else { o.none = true; o.note = ['util']; }
    }
    if (R.k === 'corpse' || R.k === 'pull' || R.k === 'burn' || R.k === 'stagger' || R.k === 'pal' || R.k === 'share' || R.k === 'shell') { o.none = true; o.note = ['util']; }
    return o;
  }
  // runes together on one skill: total damage factor (1 = no change)
  function total(list, mode, meta) {
    let bonus = 0, bmul = 1, p = 1, x = 0, xf = 0, cd = 1, pr = 0, gpr = 0;
    for (const o of list) { bonus += o.b - 1; bmul *= o.b; p *= o.p; x += o.x; xf += o.xf; cd *= o.cd; if (o.gun) gpr += o.pr; else pr += o.pr; }
    // (a proc's share is "about X% more damage": a part of your own damage on top)
    if (mode === 'offline') return (bmul * p * (1 + x) + xf) * cd * (1 + pr + gpr);
    const gunCap = meta.gunCap ? Math.max(...Object.values(meta.gunCap)) : 1;
    const H = (1 + Math.min(meta.bucket, bonus)) * p;
    return (H * (1 + x) + xf) * cd * (1 + Math.min(meta.procCap, pr + Math.min(gunCap, gpr)));
  }
  window.RuneCalc = { rolled, effect, total };
})();
