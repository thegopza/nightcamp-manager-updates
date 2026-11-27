// manager/party_api.js — Party system: Manager forms in-game parties from its own clients.
//
//   GET  /api/parties                      → parties + live status + client list (for the leader/member picker)
//   POST /api/parties                      { leaderId, memberIds?, autoFill? } → create a party
//   POST /api/parties/:id/settings         { expMode?, lootMode?, syncMap?, autoFill?, memberFollow?: { profileId, mode } }
//   POST /api/parties/:id/add-member       { profileId, profileIds?, followMode? } → manually add member(s)
//   POST /api/parties/:id/remove-member    { profileId }           → kick + never auto-pick again for this party
//   POST /api/parties/:id/summon                                   → leader uses the game's "รวมทีม"
//   POST /api/parties/:id/delete                                   → disband (members leave, then leader)
//
// Every ~10 s for each party the loop:
//   1. reads leader / members / free clients (char name, level, map, CH, in-game party, pending invite)
//   2. tops the party up to 6 (leader included) with free clients whose level is closest to the leader
//   3. leader sends `invite`, the member answers `accept` through the Manager (no need for AUTO acceptParty)
//   4. leader applies the EXP / loot mode chosen on the web page
//   5. members farm the leader's map; on that map they move to the leader's CH. When a member can't get into
//      that CH (full / refused) the leader moves to the least populated CH and everyone follows.
//
// The current in-game party is read from the game's own store through React's useSyncExternalStore getters
// (`()=>Y.party`, `()=>Y.invite`), so it also works right after a page reload. All commands go through
// evalProfilePort (POST). Game helpers (moveToChannel, setTargetFarmMap, …) come from the bot; when they are
// missing the related step is skipped and shown as a status instead.

const fs = require('fs');
const path = require('path');

const MAX_MEMBERS = 5;
const EXP_MODES = ['individual', 'even-share'];
const LOOT_MODES = ['personal', 'turn', 'round-robin', 'leader'];
const GROUP_MODES = ['g', 's'];
const AUTO_FARM_MODES = ['auto', 'farm', 'support_fight', 'support_only'];
const BUSY_FLAGS = ['__isNavigating', '__isWalkingToMap', '__isShopping', '__isRecovering', '__isConsolidating',
  '__isChangingJob', '__isAutoSellingNow', '__isManualSelling', '__isStoring', '__isGearRefining',
  '__isMarketScanning', '__isWeightScrollBusy', '__isCheckingPostSellChannel', '__pendingPostSellChannelCheck',
  '__isPartyGearTrading'];

const TIMING = {
  tickMs: 4500,
  inviteCooldownMs: 15000,
  inviteMaxAttempts: 3,
  excludeAfterFailMs: 5 * 60 * 1000,
  dropOfflineAfterMs: 2 * 60 * 1000,
  dropOtherPartyAfterMs: 45 * 1000,
  settingsCooldownMs: 15000,
  mapCooldownMs: 18000,
  channelCooldownMs: 45000,
  channelFailsBeforeFallback: 2,
  fallbackCooldownMs: 3 * 60 * 1000,
  acceptDelayMs: 1500,
  leaveCooldownMs: 15000,
  disbandGapMs: 1200,
  gatherCooldownMs: 12000,
  memberMoveWaitMs: 120000,
  leaderMoveWaitMs: 45000,
  unfollowCooldownMs: 20000,
  followCooldownMs: 8000,
  gearShareIntervalMs: 90000,
  gearSharePairCooldownMs: 180000
};

// ---------------------------------------------------------------- in-page snippets
const READ_JS = `(() => {
  const findGetters = () => {
    const out = {};
    try {
      const rootEl = document.getElementById('root') || document.body.firstElementChild;
      const key = rootEl && Object.keys(rootEl).find(k => k.startsWith('__reactContainer$') || k.startsWith('__reactFiber$'));
      if (!key) return out;
      let start = rootEl[key]; if (start && start.stateNode && start.stateNode.current) start = start.stateNode.current;
      const stack = [start]; let n = 0;
      while (stack.length && n++ < 100000 && !(out.party && out.invite && out.follow)) {
        const f = stack.pop(); if (!f) continue;
        let h = f.memoizedState, g = 0;
        while (h && typeof h === 'object' && g++ < 80) {
          const q = h.queue;
          if (q && typeof q.getSnapshot === 'function') {
            const src = String(q.getSnapshot).replace(/\\s+/g, '');
            if (!out.party && /^\\(\\)=>[A-Za-z_$][\\w$]*\\.party$/.test(src)) out.party = q.getSnapshot;
            if (!out.invite && /^\\(\\)=>[A-Za-z_$][\\w$]*\\.invite$/.test(src)) out.invite = q.getSnapshot;
            if (!out.follow && /^\\(\\)=>[A-Za-z_$][\\w$]*\\.follow$/.test(src)) out.follow = q.getSnapshot;
          }
          h = h.next;
        }
        if (f.sibling) stack.push(f.sibling);
        if (f.child) stack.push(f.child);
      }
    } catch (e) {}
    return out;
  };
  let g = window.__pmPartyGetters;
  if (!g || !g.party || !g.invite || !g.follow) { g = findGetters(); window.__pmPartyGetters = g; }
  const room = typeof window.getGameRoom === 'function' ? window.getGameRoom() : null;
  if (!room || !room.state) return { ok: false, reason: 'not-in-game' };
  let me = null; try { me = room.state.players.get(room.sessionId); } catch (e) {}
  let live = null; try { live = typeof window.__getClientLiveState === 'function' ? window.__getClientLiveState() : null; } catch (e) {}
  let party = null, invite = null;
  try { party = g.party ? g.party() : null; } catch (e) {}
  try { invite = g.invite ? g.invite() : null; } catch (e) {}
  try {
    if (!invite && typeof document.querySelector === 'function') {
      const toast = document.querySelector('.invite-toast');
      if (toast) {
        const txt = (toast.innerText || toast.textContent || '').trim();
        const m = txt.match(/^(\\S+)\\s+เชิญคุณเข้าปาร์ตี้/m);
        if (m) invite = { kind: 'party', from: m[1] };
      }
    }
  } catch (e) {}
  // The game's own "follow" (set by รวมทีม / ติดตามหัวหน้า): walks after that player and AUTO assists them
  let follow = null;
  try { follow = g.follow ? g.follow() : null; } catch (e) {}
  try { if (!follow && document.querySelector('.follow-chip')) follow = '?'; } catch (e) {}
  const busy = ${JSON.stringify(BUSY_FLAGS)}.filter(k => window[k] === true);
  // Plan Script: only actively running exclusive steps ('auto_quest', 'life_gather', or an in-progress 'change_class' retry)
  // keep a character away from the party. Future level triggers (e.g. Base 25 / Job 40) do NOT block farming together right now!
  const plan = (() => {
    const p = window.__currentScriptPlan;
    if (!window.__planScriptEnabled || !p) return null;
    const nm = (typeof window.getCharacterName === 'function' ? window.getCharacterName() : '') || (me && me.name) || '';
    let st = null; try { st = JSON.parse(localStorage.getItem('pelican_plan_state_' + nm + '_' + (p.id || p.name || 'plan')) || 'null'); } catch (e) {}
    const done = (st && st.done) || {}, pend = (st && st.pending) || {};
    const levelPending = (p.triggers || []).filter(t => t && (t.type === 'base_level' || t.type === 'job_level')).filter(t => {
      if (done[t.id]) return false;
      if (pend[t.id]) {
        const left = Array.isArray(pend[t.id].actions) ? pend[t.id].actions.map(i => (t.actions || [])[i]).filter(Boolean) : (t.actions || []);
        return left.some(a => a && a.type === 'change_class');
      }
      return false;
    }).map(t => (t.type === 'base_level' ? 'Base ' : 'Job ') + t.targetLevel + (t.classId ? ' ' + t.classId : ''));
    return { name: p.name || null, levelPending };
  })();
  let needsPriestBuff = false;
  let buffStatus = null;
  try {
    if (typeof window.getPartyPriestBuffStatus === 'function') {
      buffStatus = window.getPartyPriestBuffStatus(25000);
      needsPriestBuff = Boolean(buffStatus && buffStatus.needsPriest);
    }
  } catch (e) {}
  return {
    ok: true,
    name: (me && me.name) || (live && live.charName) || null,
    level: (me && me.level) || (live && live.baseLv) || null,
    classId: (me && me.classId) || (live && live.classId) || null,
    mapId: room.state.mapId || null,
    mapName: room.state.displayName || null,
    serverName: (live && live.serverName) || null,
    channel: typeof room.state.channel === 'number' ? room.state.channel : null,
    channelCooldownLeftMs: (typeof window.getChannelSwitchCooldownLeftMs === 'function'
      ? window.getChannelSwitchCooldownLeftMs()
      : Math.max(0, ((Number(window.NC?.Online?.snap?.self?.channelMoveAt) || 0) + 300000) - Date.now())),
    pendingChannelSpread: window.__ncPendingChannelSpread || null,
    pkChannel: Boolean(room.state.pk || (typeof window.isCurrentChannelPk === 'function' && window.isCurrentChannelPk())),
    targetMap: (window.__smartAutoQuestEnabled || window.__planActiveModeType === 'auto_quest')
      ? null
      : (window.__partyEffectiveFollowerMap || (window.__planScriptEnabled && window.__planActiveTargetMap) || window.__targetFarmMap || (live && live.targetMap) || null),
    keptFarmMap: window.__keptFarmMap || null,
    smartAutoQuestEnabled: Boolean(window.__smartAutoQuestEnabled || window.__planActiveModeType === 'auto_quest'),
    planAutoQuestActive: Boolean(window.__planActiveModeType === 'auto_quest'),
    planActiveModeType: window.__planActiveModeType || '',
    planActiveTargetMap: window.__planActiveTargetMap || null,
    isTraveling: Boolean(window.NC?.Travel?.on),
    gemRushActive: Boolean(window.__gemRushState && (window.__gemRushState.enabled || (window.__gemRushState.phase && window.__gemRushState.phase !== 'idle'))),
    botRunning: window.__isBotRunning === true,
    noLootMode: Boolean(window.__noLootMode || (live && live.noLootMode)),
    autoFarmMode: (typeof window.__getMemberAutoFarmMode === 'function' ? window.__getMemberAutoFarmMode().mode : (window.__memberAutoFarmMode || 'auto')),
    effectiveAutoFarmMode: (typeof window.__getMemberAutoFarmMode === 'function' ? window.__getMemberAutoFarmMode().effectiveMode : (live && live.effectiveAutoFarmMode) || 'farm'),
    isSupportJob: Boolean((typeof window.__getMemberAutoFarmMode === 'function' && window.__getMemberAutoFarmMode().isSupportJob) || (live && live.isSupportJob)),
    returningToPriest: window.__returningToPriest === true,
    priestBuffingTarget: window.__priestBuffingTarget || null,
    lastPostSellChannelSwitch: window.__lastPostSellChannelSwitch || null,
    channelCheckMode: window.__channelCheckMode || 'no_overlap',
    needsPriestBuff,
    buffStatus,
    busy,
    plan,
    partyKnown: !!g.party,
    hasPmPartySync: Boolean(window.__pmPartySync || window.__ncPendingPartyLeader),
    follow: follow || null,
    party: party ? {
      leader: party.leader,
      isLeader: typeof party.isLeader === 'boolean' ? party.isLeader : (party.leader === ((me && me.name) || (live && live.charName) || null)),
      partyPid: party.partyPid || null,
      expMode: party.expMode, lootMode: party.lootMode, groupMode: party.groupMode || 'g',
      lastInGameRuleChangeAt: Number(party.lastInGameRuleChangeAt) || 0,
      evenShareAllowed: party.evenShareAllowed !== false, levelRange: party.levelRange, maxMembers: party.maxMembers || 6,
      members: (party.members || []).map(m => ({ name: m.name, online: m.online !== false, classId: m.classId || null, mapId: m.mapId, mapName: m.mapName, channel: m.channel, level: m.level, buffs: Array.isArray(m.buffs) ? m.buffs.map(b => ({ skillId: b.skillId, endsAt: b.endsAt })) : undefined }))
    } : null,
    invite: invite && invite.kind === 'party' && (!invite.expiresAt || invite.expiresAt > Date.now()) ? { from: invite.from, expiresAt: invite.expiresAt } : null,
    helpers: {
      moveToChannel: typeof window.moveToChannel === 'function',
      findLeast: typeof window.findLeastPopulatedChannel === 'function',
      evaluateAnchorChannel: typeof window.evaluatePartyChannelSwitch === 'function',
      setTargetFarmMap: typeof window.setTargetFarmMap === 'function',
      updatePartySyncState: typeof window.updatePartySyncState === 'function',
      updateSoloAvoidState: typeof window.updateSoloAvoidState === 'function'
    }
  };
})()`;

const sendPartyJs = (msg, guard) => `(() => {
  const room = typeof window.getGameRoom === 'function' ? window.getGameRoom() : null;
  if (!room) return { success: false, error: 'not-in-game' };
  ${guard || ''}
  room.send('party', ${JSON.stringify(msg)});
  return { success: true };
})()`;

const ACTIONS = {
  invite: name => sendPartyJs({ action: 'invite', name }),
  // Only accept an invite that really comes from our leader
  accept: leaderName => sendPartyJs({ action: 'accept' }, `
    const g = window.__pmPartyGetters; let inv = null; try { inv = g && g.invite ? g.invite() : null; } catch (e) {}
    let toastBtn = null;
    try {
      if (typeof document.querySelector === 'function') {
        const toast = document.querySelector('.invite-toast');
        if (toast && (toast.innerText || toast.textContent || '').includes(${JSON.stringify(leaderName)})) {
          toastBtn = toast.querySelector('.invite-actions button.primary') || toast.querySelector('button.primary');
          if (!inv) inv = { kind: 'party', from: ${JSON.stringify(leaderName)} };
        }
      }
    } catch (e) {}
    if (!inv || inv.kind !== 'party' || inv.from !== ${JSON.stringify(leaderName)}) return { success: false, error: 'no-invite' };
    try { if (inv && typeof inv === 'object') inv.expiresAt = 0; } catch (e) {}
    try { if (toastBtn && typeof toastBtn.click === 'function') { toastBtn.click(); return { success: true }; } } catch (e) {}`),
  leave: () => sendPartyJs({ action: 'leave' }),
  kick: name => sendPartyJs({ action: 'kick', name }),
  summon: () => sendPartyJs({ action: 'summon' }),
  // Engage the game's built-in follow & AUTO party assist on a party member (leader or any other member)
  startFollow: name => `(() => {
    const room = typeof window.getGameRoom === 'function' ? window.getGameRoom() : null;
    const handlers = room && room.onMessageHandlers;
    if (!handlers || typeof handlers.emit !== 'function') return { success: false, error: 'no-follow-handler' };
    handlers.emit('party_follow', ${JSON.stringify({ name })});
    return { success: true };
  })()`,
  // Same as pressing the game's "ยกเลิกติดตาม" chip (calls the game's own stopFollow), with handler fallback
  stopFollow: () => `(() => {
    const b = typeof document.querySelector === 'function' ? document.querySelector('.follow-chip button') : null;
    if (b && typeof b.click === 'function') { b.click(); return { success: true }; }
    const room = typeof window.getGameRoom === 'function' ? window.getGameRoom() : null;
    const handlers = room && room.onMessageHandlers;
    if (handlers && typeof handlers.emit === 'function') {
      handlers.emit('party_follow', { name: null });
      return { success: true };
    }
    return { success: false, error: 'no-follow' };
  })()`,
  settings: patch => sendPartyJs(Object.assign({ action: 'settings' }, patch)),
  setNoLoot: on => `(() => {
    const val = ${Boolean(on)};
    if (typeof window.__setNoLootMode === 'function') return window.__setNoLootMode(val);
    window.__noLootMode = val;
    try {
      localStorage.setItem('pelican_no_loot_mode', String(val));
      if (window.NC && window.NC.Auto && window.NC.Auto.set) {
        window.NC.Auto.set.loot = !val;
        if (typeof window.NC.Auto.saveSet === 'function') window.NC.Auto.saveSet();
      }
    } catch (e) {}
    return { success: true, noLootMode: val };
  })()`,
  setAutoFarmMode: mode => `(() => {
    const m = ${JSON.stringify(String(mode || 'auto'))};
    if (typeof window.__setMemberAutoFarmMode === 'function') return window.__setMemberAutoFarmMode(m);
    window.__memberAutoFarmMode = m;
    try { localStorage.setItem('pelican_member_auto_farm_mode', m); } catch (e) {}
    return { success: true, mode: m };
  })()`,
  setProtectedGearUids: uids => `(() => {
    if (typeof window.__setPartyProtectedGearUids === 'function') return window.__setPartyProtectedGearUids(${JSON.stringify(Array.isArray(uids) ? uids : [])});
    return { success: false };
  })()`,
  getShareableGear: () => `(() => {
    if (typeof window.__getShareableBagGearForParty === 'function') return window.__getShareableBagGearForParty();
    return { ok: false, reason: 'no-helper', items: [] };
  })()`,
  evaluateGearUpgrades: cands => `(() => {
    if (typeof window.__evaluateGearUpgradesForMe === 'function') return window.__evaluateGearUpgradesForMe(${JSON.stringify(Array.isArray(cands) ? cands : [])});
    return { ok: false, reason: 'no-helper', upgrades: [] };
  })()`,
  tradeSend: (targetName, copyUids) => `(async () => {
    if (typeof window.__executePartyGearTradeSend === 'function') return await window.__executePartyGearTradeSend(${JSON.stringify(String(targetName || ''))}, ${JSON.stringify(Array.isArray(copyUids) ? copyUids : [])});
    return { ok: false, error: 'no-helper' };
  })()`,
  tradeReceive: senderName => `(async () => {
    if (typeof window.__executePartyGearTradeReceive === 'function') return await window.__executePartyGearTradeReceive(${JSON.stringify(String(senderName || ''))});
    return { ok: false, error: 'no-helper' };
  })()`,
  setMap: (map, walkNow) => `(() => {
    const map = ${JSON.stringify(map)};
    if (typeof window.clearSafeMap === 'function') window.clearSafeMap('ปาร์ตี้: ตามแมพหัวตี้');
    window.__overrideFarmMap = '';
    try { localStorage.removeItem('pelican_override_farm_map'); } catch (e) {}
    window.__partyForcedMap = map;
    if (typeof window.setPlanManualMap === 'function') window.setPlanManualMap(map);
    if (typeof window.setTargetFarmMap === 'function') {
      window.setTargetFarmMap(map, ${walkNow ? 'true' : 'false'}, { fromParty: true });
    } else {
      window.__targetFarmMap = map;
      try { localStorage.setItem('pelican_farm_map', map); } catch (e) {}
      const sel = document.getElementById('p-target-map-select'); if (sel) sel.value = map;
    }
    return { success: true };
  })()`,
  // Same idea as the zeny consolidation: moveToChannel waits for the cooldown / a free slot by itself;
  // we wait for it and report where the character REALLY is afterwards.
  moveChannelWait: (ch, waitMs) => `(async () => {
    if (!window.__isBotRunning) return { success: false, botStopped: true, error: 'ยังไม่ได้กด Start Bot' };
    if (typeof window.moveToChannel !== 'function') return { success: false, error: 'บอทจอนี้ไม่มีระบบย้าย CH' };
    let r = null;
    try { r = await window.moveToChannel(${Number(ch)}, ${Number(waitMs)}); } catch (e) { r = { success: false, error: String(e && e.message || e) }; }
    const fastFail = Boolean(r && (r.blockedCooldown || r.blockedBusy || r.blockedShut || r.noSuchChannel || r.blockedPk));
    await new Promise(x => setTimeout(x, fastFail ? 200 : 1200));
    const room = typeof window.getGameRoom === 'function' ? window.getGameRoom() : null;
    const cur = room && room.state && typeof room.state.channel === 'number' ? room.state.channel : (typeof window.getCurrentChannel === 'function' ? window.getCurrentChannel() : null);
    const nowPk = typeof window.isCurrentChannelPk === 'function' && window.isCurrentChannelPk();
    const inCity = typeof window.isInCapital === 'function' ? window.isInCapital() : (typeof isCharacterInCity === 'function' && isCharacterInCity());
    if (!nowPk && !inCity && window.__isBotRunning && !window.__isShopping && !window.__isNavigating && !window.__isConsolidating) {
      setTimeout(() => { try { if (window.__isBotRunning && !window.__isShopping && !window.__isNavigating && typeof window.activateInGameAuto === 'function') window.activateInGameAuto(); } catch (_) {} }, 500);
    }
    return {
      success: cur === ${Number(ch)},
      channel: cur,
      blockedCooldown: Boolean(r && r.blockedCooldown),
      cooldownLeftMs: Number(r && r.cooldownLeftMs) || 0,
      blockedShut: Boolean(r && r.blockedShut),
      blockedBusy: Boolean(r && r.blockedBusy),
      noSuchChannel: Boolean(r && r.noSuchChannel),
      blockedPk: Boolean(r && r.blockedPk),
      error: cur === ${Number(ch)} ? null : ((r && r.error) || 'ย้าย CH ไม่สำเร็จ')
    };
  })()`,
  leastChannel: (avoidChannels, targetMapId) => `(async () => {
    if (typeof window.findLeastPopulatedChannel !== 'function') return { success: false, error: 'no-helper' };
    let r = await window.findLeastPopulatedChannel(${Array.isArray(avoidChannels) && avoidChannels.length ? JSON.stringify(avoidChannels) : '[]'}, ${targetMapId ? JSON.stringify({ mapId: targetMapId, ownOnCur: 0 }) : '{}'});
    const ch = typeof r === 'number' ? r : (r && (r.channel != null ? r.channel : r.ch));
    return typeof ch === 'number' ? { success: true, channel: ch } : { success: false, error: 'no-channel' };
  })()`,
  evaluateAnchorChannel: (partySize, partyNames, avoidChannels, targetMapId) => `(async () => {
    if (typeof window.evaluatePartyChannelSwitch !== 'function') return { success: false, error: 'no-helper' };
    return await window.evaluatePartyChannelSwitch(${Number(partySize) || 1}, ${JSON.stringify(partyNames || [])}, ${JSON.stringify(avoidChannels || [])}, ${targetMapId ? JSON.stringify({ targetMapId }) : '{}'});
  })()`,
  syncClientPartyState: sync => `(() => {
    if (typeof window.updatePartySyncState === 'function') return window.updatePartySyncState(${JSON.stringify(sync)});
    window.__pmPartySync = ${JSON.stringify(sync)};
    return { success: true };
  })()`,
  syncSoloAvoidState: sync => `(() => {
    if (typeof window.updateSoloAvoidState === 'function') return window.updateSoloAvoidState(${JSON.stringify(sync)});
    window.__pmSoloAvoidSync = ${JSON.stringify(sync ? Object.assign({}, sync, { updatedAt: Date.now() }) : null)};
    return { success: true };
  })()`
};

// ---------------------------------------------------------------- pure helpers (unit-tested)
function isCityMapName(m) {
  return /เมืองหลวง|โซลเฮเวน|ตลาดคาราวาน|ค่ายกลางป่า|แปลงสวน|ห้องหุ่น|\b(camp|homefarm|puppetroom)\b/i.test(String(m || ''));
}

function isAutoMapToken(m) {
  const s = String(m || '').trim();
  return !s || /^auto$/i.test(s) || /^อัตโนมัติ/.test(s);
}

function isPriestClass(cls) {
  return /^(priest|acolyte|bishop|starsaint|พระ|บิชอป|นักบุญแสงดาว)$/i.test(String(cls || '').trim());
}

function findPartyPriest(party, profiles, states) {
  if (!party || !states) return null;
  if (party.priestFlow === false) return null;
  const L = states.get(party.leaderId);
  const inGame = new Set(inGameMemberNames(L));
  const allIds = [party.leaderId].concat(Array.isArray(party.memberIds) ? party.memberIds : []);
  let fallback = null;
  for (const id of allIds) {
    const S = states.get(id);
    const P = profiles ? profiles.get(id) : null;
    if (!S || !S.ok || !S.name) continue;
    if (id !== party.leaderId && inGame.size > 0 && !inGame.has(S.name)) continue;
    const cls = S.classId || (P && P.lastCharClass) || '';
    if (!isPriestClass(cls)) continue;
    const entry = { id: String(id), name: S.name, snap: S, profile: P };
    if (!isCityMapName(S.mapName)) return entry;
    if (!fallback) fallback = entry;
  }
  return fallback;
}

function assignedIds(parties) {
  const s = new Set();
  for (const p of parties) { s.add(p.leaderId); for (const id of p.memberIds || []) s.add(id); }
  return s;
}

function inGameMemberNames(snap) {
  return snap && snap.party ? snap.party.members.map(m => m.name) : [];
}

// Pick free clients for `party`, closest level to the leader first.
// states: Map<profileId, snapshot|null>; managedNames: Set of char names that belong to this Manager.
function pickCandidates(party, parties, states, managedNames, slots, excluded) {
  if (slots <= 0) return [];
  const leaderSnap = states.get(party.leaderId);
  if (!leaderSnap || !leaderSnap.ok || !leaderSnap.name) return [];
  const taken = assignedIds(parties);
  const out = [];
  for (const [id, s] of states) {
    if (taken.has(id) || (excluded && excluded.has(id))) continue;
    if (!s || !s.ok || !s.name || typeof s.level !== 'number') continue;
    if (s.gemRushActive) continue; // actively running Auto Farm (Gem Rush)
    if (planBlocked(s)) continue; // still levelling with its Plan Script
    if (s.party) {
      // In someone else's party: only usable when that party is ours (stale bot party) or led by our leader
      const lead = s.party.leader;
      if (lead !== leaderSnap.name && !managedNames.has(lead)) continue;
    }
    out.push({ id, diff: Math.abs(s.level - leaderSnap.level), level: s.level, name: s.name });
  }
  out.sort((a, b) => a.diff - b.diff || b.level - a.level || a.name.localeCompare(b.name));
  return out.slice(0, slots).map(c => c.id);
}

// Which CH should a member move to? null = stay.
function channelTarget(leaderSnap, memberSnap) {
  if (!leaderSnap || !memberSnap || !leaderSnap.ok || !memberSnap.ok) return null;
  if (!leaderSnap.mapId || memberSnap.mapId !== leaderSnap.mapId) return null;
  if (typeof leaderSnap.channel !== 'number' || memberSnap.channel === leaderSnap.channel) return null;
  return leaderSnap.channel;
}

// Plan Script still has an actively running exclusive step (Auto-Quest, life_gather, or in-progress change_class)
// → the plan decides the map, the party doesn't move it
function planBlocked(s) {
  if (!s) return false;
  if (s.smartAutoQuestEnabled || s.planAutoQuestActive) return true;
  if (s.planActiveModeType === 'life_gather') return true;
  return !!(s.plan && Array.isArray(s.plan.levelPending) && s.plan.levelPending.length);
}

function planBlockReason(s) {
  if (!s) return null;
  if (s.planAutoQuestActive || s.smartAutoQuestEnabled) return 'Auto-Quest';
  if (s.planActiveModeType === 'life_gather') return 'เก็บวัตถุดิบ';
  if (s.plan && Array.isArray(s.plan.levelPending) && s.plan.levelPending.length) return String(s.plan.levelPending[0]);
  return null;
}

function normalizeFollowMode(mode, party, memberId) {
  if (!mode || mode === 'none') return 'none';
  const leaderId = party && party.leaderId ? String(party.leaderId) : '';
  if (mode === 'leader' || mode === 'member:' + leaderId) return 'leader';
  if (typeof mode === 'string' && mode.startsWith('member:')) {
    const targetId = mode.slice(7);
    if (!targetId || targetId === String(memberId)) return 'none';
    if (targetId === leaderId) return 'leader';
    const memberIds = Array.isArray(party && party.memberIds) ? party.memberIds.map(String) : [];
    if (memberIds.includes(targetId)) return 'member:' + targetId;
  }
  return 'none';
}

function sanitizeFollowModes(party) {
  const raw = party && party.followModes && typeof party.followModes === 'object' ? party.followModes : {};
  const out = {};
  for (const mid of (party && party.memberIds) || []) {
    const fm = normalizeFollowMode(raw[mid], party, mid);
    if (fm !== 'none') out[mid] = fm;
  }
  return out;
}

function resolveFollowTarget(party, memberId, profiles, states) {
  const mode = normalizeFollowMode(party && party.followModes && party.followModes[memberId], party, memberId);
  if (mode === 'none') return { mode: 'none', targetId: null, targetName: null, targetSnap: null };
  // เมื่อในปาร์ตี้มี Priest ออนไลน์: โหมดตามหัวตี้ ('leader') จะยึด Priest เป็นหลัก (ตามพระเป็นศูนย์กลาง)
  const priest = findPartyPriest(party, profiles, states);
  if (mode === 'leader' && priest) {
    if (String(memberId) === String(priest.id)) {
      return { mode: 'none', targetId: null, targetName: null, targetSnap: null, isAnchorPriest: true };
    }
    return { mode: 'leader', targetId: priest.id, targetName: priest.name, targetSnap: priest.snap, viaPriest: true };
  }
  const targetId = mode === 'leader' ? party.leaderId : mode.slice(7);
  const targetSnap = states ? states.get(targetId) : null;
  const targetProfile = profiles ? profiles.get(targetId) : null;
  const targetName = (targetSnap && targetSnap.name) || (targetProfile && targetProfile.lastCharName) || null;
  return { mode, targetId, targetName, targetSnap };
}

function normalizeAutoFarmMode(mode) {
  const m = String(mode || 'auto').trim().toLowerCase();
  return AUTO_FARM_MODES.includes(m) ? m : 'auto';
}

function sanitizeAutoModes(party) {
  const raw = party && party.autoModes && typeof party.autoModes === 'object' ? party.autoModes : {};
  const out = {};
  const validIds = [party && party.leaderId].concat((party && party.memberIds) || []).filter(Boolean).map(String);
  for (const id of validIds) {
    const am = normalizeAutoFarmMode(raw[id]);
    if (am !== 'auto') out[id] = am;
  }
  return out;
}

function sanitizeParty(p) {
  const leaderId = String(p.leaderId);
  const memberIds = Array.isArray(p.memberIds) ? p.memberIds.map(String).filter(id => id && id !== leaderId).slice(0, MAX_MEMBERS - 1) : [];
  const base = {
    id: String(p.id),
    leaderId,
    memberIds,
    excludedIds: Array.isArray(p.excludedIds) ? p.excludedIds.map(String) : [],
    noLootIds: Array.isArray(p.noLootIds) ? p.noLootIds.map(String) : [],
    expMode: EXP_MODES.includes(p.expMode) ? p.expMode : 'even-share',
    lootMode: LOOT_MODES.includes(p.lootMode) ? p.lootMode : 'personal',
    groupMode: GROUP_MODES.includes(p.groupMode) ? p.groupMode : 'g',
    syncMap: p.syncMap !== false,
    autoFill: p.autoFill !== false,
    priestFlow: Boolean(p.priestFlow === true),
    shareGear: Boolean(p.shareGear === true),
    followModes: {},
    autoModes: {},
    createdAt: Number(p.createdAt) || Date.now()
  };
  base.followModes = sanitizeFollowModes(Object.assign({}, base, { followModes: p.followModes }));
  base.autoModes = sanitizeAutoModes(Object.assign({}, base, { autoModes: p.autoModes }));
  return base;
}

// After a CH / map change the game joins a new room and may keep the old party object in its store even
// though the server already removed the player. Cross-check against the leader's own view when we can see it.
function normalizeStates(states) {
  const byName = new Map();
  for (const s of states.values()) if (s && s.ok && s.name) byName.set(s.name, s);
  for (const s of states.values()) {
    if (!s || !s.ok || !s.party) continue;
    const selfLeads = typeof s.party.isLeader === 'boolean' ? s.party.isLeader : (s.party.leader === s.name);
    if (selfLeads) continue;
    const lead = byName.get(s.party.leader);
    if (!lead) continue; // leader not one of ours — can't verify
    const leads = lead.party && (typeof lead.party.isLeader === 'boolean' ? lead.party.isLeader : (lead.party.leader === lead.name));
    const samePid = Boolean(s.party.partyPid && lead.party && lead.party.partyPid && s.party.partyPid === lead.party.partyPid);
    if (!leads || (!samePid && !lead.party.members.some(m => m.name === s.name))) { s.party = null; s.partyStale = true; }
  }
  return states;
}

function readBody(req) {
  return new Promise(resolve => {
    let body = '';
    req.setEncoding && req.setEncoding('utf8');
    req.on('data', c => body += c);
    req.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch (e) { resolve(null); } });
  });
}

// ---------------------------------------------------------------- service
function createPartyService(opts) {
  const { loadProfiles, evalProfilePort } = opts;
  const dataFile = opts.dataFile || path.join(__dirname, 'data', 'parties.json');
  const isBusy = opts.isBusy || (() => false);
  const isProfileExcluded = typeof opts.isProfileExcluded === 'function' ? opts.isProfileExcluded : (() => false);
  const getChannelCheckMode = opts.getChannelCheckMode || (() => 'no_overlap');
  const now = opts.now || (() => Date.now());
  const sleep = opts.sleep || (ms => new Promise(r => setTimeout(r, ms)));
  const log = opts.log || ((...a) => console.log('[Party]', ...a));
  const T = Object.assign({}, TIMING, opts.timing || {});

  let parties = [];
  try {
    const raw = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    const loaded = (Array.isArray(raw) ? raw : raw.parties || []).map(sanitizeParty);
    // Drop legacy auto-discovered `party_ig_*` records so manually formed in-game parties are never auto-invited/kicked!
    parties = loaded.filter(p => !String(p.id || '').startsWith('party_ig_'));
    if (parties.length !== loaded.length) {
      setImmediate(() => { try { save(); } catch (_) {} });
    }
  } catch (e) { parties = []; }

  const runtime = new Map();     // partyId -> { status, notes, lastTickAt, fallbackAt, ... }
  const memberRt = new Map();    // `${partyId}:${profileId}` -> counters
  const soloRuntime = new Map(); // profileId -> { settledMapId, settledChannel, settledChannelAt, lastSwitchSeenAt, moving, pendingChannel, gatherAt, lastNoFreeChannelAt }
  const tempExcluded = new Map(); // `${partyId}:${profileId}` -> until
  let states = new Map();        // profileId -> snapshot | null
  let statesAt = 0;
  let ticking = false;
  let timer = null;

  function save() {
    try {
      fs.mkdirSync(path.dirname(dataFile), { recursive: true });
      const tmp = dataFile + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify({ parties }, null, 2));
      fs.renameSync(tmp, dataFile);
    } catch (e) { log('save failed', e.message); }
  }

  const mrt = (pid, id) => {
    const k = pid + ':' + id;
    if (!memberRt.has(k)) memberRt.set(k, { inviteAt: 0, inviteAttempts: 0, mapAt: 0, chAt: 0, chFails: 0, lastMoveAt: 0, leaveAt: 0, seenAt: now() });
    return memberRt.get(k);
  };
  const prt = pid => {
    if (!runtime.has(pid)) runtime.set(pid, { notes: [], settingsAt: 0, fallbackAt: 0, leaveAt: 0, lastTickAt: 0, gatherAt: 0, gathering: false, pendingChannel: null, gatherNote: null, channelNote: null, lastPostSellFollowAt: 0, settledChannelAt: 0, settledByMemberName: null, gearShareAt: 0, sharingGear: false, lastGearShareNote: null, gearSharePairAt: {} });
    return runtime.get(pid);
  };
  const srt = id => {
    const k = String(id);
    if (!soloRuntime.has(k)) soloRuntime.set(k, { settledMapId: null, settledChannel: null, settledChannelAt: 0, lastSwitchSeenAt: 0, moving: false, pendingChannel: null, gatherAt: 0, lastNoFreeChannelAt: 0 });
    return soloRuntime.get(k);
  };

  function normalizeServerKey(raw) {
    const s = String(raw || '').trim().toLowerCase();
    if (!s || s === 'auto') return '';
    if (s.includes('moonlight') || /^s1\b/.test(s)) return 'moonlight';
    if (s.includes('stardust') || /^s2\b/.test(s)) return 'stardust';
    if (s.includes('nightfall') || /^s3\b/.test(s)) return 'nightfall';
    if (s.includes('sunflare') || /^s4\b/.test(s)) return 'sunflare';
    return s.replace(/[^a-z0-9_-]+/g, '_');
  }

  function sameServerKey(a, b) {
    if (!a || !b) return true;
    return a === b;
  }

  function cleanMapLabel(m) {
    return String(m || '').replace(/\s*\(Lv\..*?\)/i, '').trim();
  }

  function mapsMatch(mapIdA, mapNameA, mapIdB, mapNameB) {
    if (mapIdA && mapIdB) return String(mapIdA).toLowerCase() === String(mapIdB).toLowerCase();
    if (mapIdA && mapNameB && String(mapIdA).toLowerCase() === String(mapNameB).trim().toLowerCase()) return true;
    if (mapIdB && mapNameA && String(mapIdB).toLowerCase() === String(mapNameA).trim().toLowerCase()) return true;
    const ca = cleanMapLabel(mapNameA);
    const cb = cleanMapLabel(mapNameB);
    if (ca && cb) return ca === cb || ca.includes(cb) || cb.includes(ca);
    return false;
  }

  function isSoloActivelyFarmingMap(S) {
    if (!S || !S.ok || !S.mapId || isCityMapName(S.mapName) || isCityMapName(S.mapId)) return false;
    if (S.botRunning === false) return false;
    // Ignore transit maps ONLY when a specific non-auto, non-city targetMap is configured and does not match current mapId/mapName
    const tm = String(S.targetMap || '').trim();
    if (tm && tm.toLowerCase() !== 'auto' && !isCityMapName(tm)) {
      const sameById = String(S.mapId || '').toLowerCase() === tm.toLowerCase();
      if (!sameById && S.mapName && !mapsMatch(S.mapId, S.mapName, tm, tm)) {
        return false;
      }
    }
    return true;
  }

  function isAutoFarmProtected(id, snap) {
    if (id && isProfileExcluded(String(id))) return true;
    const s = snap !== undefined ? snap : (id ? states.get(id) : null);
    return Boolean(s && s.gemRushActive);
  }

  function getSoloOccupiedInfo(profileId, profiles) {
    const S = states.get(profileId);
    if (!S || !S.ok || !S.name) return null;
    if (isAutoFarmProtected(profileId, S)) return null;
    const P = profiles ? profiles.get(profileId) : null;
    const serverKey = normalizeServerKey(S.serverName || P?.serverName || P?.lastServerName || '');
    const rt = srt(profileId);
    const onFarm = isSoloActivelyFarmingMap(S);
    const inCampWithTarget = Boolean(
      !onFarm &&
      S.botRunning !== false &&
      S.mapId === 'camp' &&
      S.targetMap &&
      !isAutoMapToken(S.targetMap) &&
      !isCityMapName(S.targetMap)
    );
    const mapId = onFarm
      ? S.mapId
      : (inCampWithTarget && /^[a-z0-9_]+$/i.test(String(S.targetMap).trim()) ? String(S.targetMap).trim().toLowerCase() : null);
    const mapName = onFarm ? S.mapName : (!isCityMapName(S.targetMap) ? S.targetMap : null);
    const cleanMapName = cleanMapLabel(mapName) || null;
    const primaryChannel = ((onFarm || inCampWithTarget) && !S.pkChannel && typeof S.channel === 'number') ? S.channel : null;
    const hasSettled = Boolean(
      (onFarm || inCampWithTarget) &&
      rt.settledMapId &&
      (rt.settledMapId === mapId || mapsMatch(rt.settledMapId, rt.settledMapId, mapId, cleanMapName)) &&
      typeof rt.settledChannel === 'number' &&
      rt.settledChannel === primaryChannel
    );
    const channels = new Set();
    if (typeof primaryChannel === 'number') channels.add(primaryChannel);
    if (typeof rt.pendingChannel === 'number') channels.add(rt.pendingChannel);
    const inGameLeader = (S.party && Array.isArray(S.party.members) && S.party.members.length > 1 && S.party.leader)
      ? String(S.party.leader)
      : null;
    const inGamePartyPid = (S.party && Array.isArray(S.party.members) && S.party.members.length > 1 && S.party.partyPid)
      ? String(S.party.partyPid)
      : null;
    const orderedIds = profiles ? [...profiles.keys()].map(String) : [];
    const idx = orderedIds.indexOf(String(profileId));
    return {
      unitType: 'solo',
      profileId: String(profileId),
      unitIndex: idx >= 0 ? idx : 9999,
      serverKey,
      name: S.name,
      inGameLeader,
      inGamePartyPid,
      onFarm: Boolean(onFarm),
      mapId,
      mapName,
      cleanMapName,
      primaryChannel,
      settledAt: hasSettled ? (rt.settledChannelAt || 1) : Infinity,
      channels: [...channels]
    };
  }

  function getPartyOccupiedInfo(p, profiles) {
    const rt = prt(p.id);
    const L = states.get(p.leaderId);
    const LP = profiles ? profiles.get(p.leaderId) : null;
    const priest = findPartyPriest(p, profiles, states);
    let anchorSnap = null;
    if (priest && !isAutoFarmProtected(priest.id, priest.snap) && priest.snap && priest.snap.ok && priest.snap.botRunning !== false && priest.snap.mapId && !isCityMapName(priest.snap.mapName)) {
      anchorSnap = priest.snap;
    } else if (!isAutoFarmProtected(p.leaderId, L) && L && L.ok && L.botRunning !== false && L.mapId && !isCityMapName(L.mapName)) {
      anchorSnap = L;
    } else {
      for (const mid of (p.memberIds || [])) {
        const ms = states.get(mid);
        if (isAutoFarmProtected(mid, ms)) continue;
        if (ms && ms.ok && ms.botRunning !== false && ms.mapId && !isCityMapName(ms.mapName)) {
          anchorSnap = ms;
          break;
        }
      }
    }
    const serverKey = normalizeServerKey((anchorSnap && anchorSnap.serverName) || (L && L.serverName) || LP?.serverName || LP?.lastServerName || '');
    const mapId = (anchorSnap && anchorSnap.mapId) || rt.settledMapId || null;
    const mapName = (anchorSnap && anchorSnap.mapName) || (L && !isCityMapName(L.targetMap) && L.targetMap) || rt.lastLeaderFarmMap || null;
    const cleanMapName = cleanMapLabel(mapName) || null;
    const hasSettled = Boolean(rt.settledMapId && (!mapId || rt.settledMapId === mapId) && typeof rt.settledChannel === 'number');
    const primaryChannel = hasSettled
      ? rt.settledChannel
      : (anchorSnap && typeof anchorSnap.channel === 'number' ? anchorSnap.channel : null);
    const channels = new Set();
    if (typeof primaryChannel === 'number') channels.add(primaryChannel);
    if (typeof rt.pendingChannel === 'number') channels.add(rt.pendingChannel);
    if (anchorSnap && typeof anchorSnap.channel === 'number') channels.add(anchorSnap.channel);
    return {
      unitType: 'party',
      partyId: p.id,
      partyIndex: parties.indexOf(p),
      serverKey,
      mapId,
      mapName,
      cleanMapName,
      primaryChannel,
      settledAt: hasSettled ? (rt.settledChannelAt || 1) : Infinity,
      channels: [...channels]
    };
  }

  function getAvoidChannelsForParty(party, profiles, targetMapId, targetMapName) {
    const myInfo = getPartyOccupiedInfo(party, profiles);
    const avoidSet = new Set();
    const otherPartyChannelsByMap = {};
    const addMapCh = (key, ch) => {
      if (!key || typeof ch !== 'number') return;
      if (!otherPartyChannelsByMap[key]) otherPartyChannelsByMap[key] = [];
      if (!otherPartyChannelsByMap[key].includes(ch)) otherPartyChannelsByMap[key].push(ch);
    };
    const effMapId = targetMapId || myInfo.mapId;
    const effMapName = cleanMapLabel(targetMapName || myInfo.cleanMapName);

    for (const other of parties) {
      if (!other || other.id === party.id) continue;
      const occ = getPartyOccupiedInfo(other, profiles);
      if (!occ.mapId && !occ.cleanMapName) continue;
      if (!sameServerKey(myInfo.serverKey, occ.serverKey)) continue;
      const sameMapAsMe = mapsMatch(effMapId, effMapName, occ.mapId, occ.cleanMapName);
      for (const ch of occ.channels) {
        if (sameMapAsMe && myInfo.primaryChannel === ch && occ.primaryChannel === ch) {
          const otherHasPriority = (occ.settledAt !== myInfo.settledAt)
            ? (occ.settledAt < myInfo.settledAt)
            : (occ.partyIndex < myInfo.partyIndex);
          if (!otherHasPriority) continue;
        }
        if (occ.mapId) addMapCh(occ.mapId, ch);
        if (occ.cleanMapName) addMapCh(occ.cleanMapName, ch);
        if (sameMapAsMe) avoidSet.add(ch);
      }
    }

    // Also avoid channels occupied by our solo characters on the same map & same server (if a solo character is on the party's current primaryChannel, the party has priority and stays while the solo character moves)
    const chMode = typeof getChannelCheckMode === 'function' ? (getChannelCheckMode() || 'no_overlap') : 'no_overlap';
    if (chMode === 'no_overlap' || chMode === 'always' || chMode === 'all') {
      const taken = assignedIds(parties);
      for (const id of profiles.keys()) {
        if (taken.has(id)) continue;
        const occ = getSoloOccupiedInfo(id, profiles);
        if (!occ || (!occ.mapId && !occ.cleanMapName)) continue;
        if (!sameServerKey(myInfo.serverKey, occ.serverKey)) continue;
        const sameMapAsMe = mapsMatch(effMapId, effMapName, occ.mapId, occ.cleanMapName);
        for (const ch of occ.channels) {
          if (sameMapAsMe && myInfo.primaryChannel === ch) continue;
          if (occ.mapId) addMapCh(occ.mapId, ch);
          if (occ.cleanMapName) addMapCh(occ.cleanMapName, ch);
          if (sameMapAsMe) avoidSet.add(ch);
        }
      }
    }

    return {
      avoidChannels: [...avoidSet],
      otherPartyChannelsByMap
    };
  }

  function getAvoidChannelsForSolo(profileId, profiles, targetMapId, targetMapName) {
    const myInfo = getSoloOccupiedInfo(profileId, profiles);
    const avoidSet = new Set();
    const otherPartyChannelsByMap = {};
    const addMapCh = (key, ch) => {
      if (!key || typeof ch !== 'number') return;
      if (!otherPartyChannelsByMap[key]) otherPartyChannelsByMap[key] = [];
      if (!otherPartyChannelsByMap[key].includes(ch)) otherPartyChannelsByMap[key].push(ch);
    };
    const S = states.get(profileId);
    const effMapId = targetMapId || (myInfo && myInfo.mapId) || (S && !isCityMapName(S.mapName) && S.mapId) || null;
    const effMapName = cleanMapLabel(targetMapName || (myInfo && myInfo.cleanMapName) || (S && (!isCityMapName(S.mapName) ? S.mapName : S.targetMap)) || '');

    // 1. Avoid all channels occupied by any Party on the same map & same server
    for (const p of parties) {
      if (!p) continue;
      const occ = getPartyOccupiedInfo(p, profiles);
      if (!occ.mapId && !occ.cleanMapName) continue;
      if (myInfo && !sameServerKey(myInfo.serverKey, occ.serverKey)) continue;
      const sameMapAsMe = mapsMatch(effMapId, effMapName, occ.mapId, occ.cleanMapName);
      for (const ch of occ.channels) {
        if (occ.mapId) addMapCh(occ.mapId, ch);
        if (occ.cleanMapName) addMapCh(occ.cleanMapName, ch);
        if (sameMapAsMe) avoidSet.add(ch);
      }
    }

    // 2. Avoid channels occupied by other Solo characters on the same map & same server
    const taken = assignedIds(parties);
    for (const otherId of profiles.keys()) {
      if (String(otherId) === String(profileId) || taken.has(otherId)) continue;
      const occ = getSoloOccupiedInfo(otherId, profiles);
      if (!occ || (!occ.mapId && !occ.cleanMapName)) continue;
      if (myInfo && !sameServerKey(myInfo.serverKey, occ.serverKey)) continue;
      if (myInfo && myInfo.inGamePartyPid && occ.inGamePartyPid && myInfo.inGamePartyPid === occ.inGamePartyPid) continue;
      if (myInfo && myInfo.inGameLeader && occ.inGameLeader && myInfo.inGameLeader === occ.inGameLeader) continue;
      const sameMapAsMe = mapsMatch(effMapId, effMapName, occ.mapId, occ.cleanMapName);
      for (const ch of occ.channels) {
        if (sameMapAsMe && myInfo && myInfo.primaryChannel === ch && occ.primaryChannel === ch) {
          // A bot ALREADY actively farming on the farm map ALWAYS has priority over a bot still standing in Camp!
          const otherHasPriority = (Boolean(occ.onFarm) !== Boolean(myInfo.onFarm))
            ? Boolean(occ.onFarm)
            : ((occ.settledAt !== myInfo.settledAt)
                ? (occ.settledAt < myInfo.settledAt)
                : (occ.unitIndex < myInfo.unitIndex));
          if (!otherHasPriority) continue;
        }
        if (occ.mapId) addMapCh(occ.mapId, ch);
        if (occ.cleanMapName) addMapCh(occ.cleanMapName, ch);
        if (sameMapAsMe) avoidSet.add(ch);
      }
    }

    return {
      avoidChannels: [...avoidSet],
      otherPartyChannelsByMap
    };
  }

  async function evalOk(port, code, timeoutMs) {
    const r = await evalProfilePort(port, code, timeoutMs || 6000);
    const res = r && r.result;
    return { ok: Boolean(r && r.success !== false && res && res.success !== false), result: res, error: (res && res.error) || (r && r.error) || null };
  }

  async function refreshStates(force) {
    if (!force && now() - statesAt < 4000) return states;
    if (!opts.timing && now() - statesAt < 2200) return states;
    const profiles = loadProfiles();
    const next = new Map();
    const batchSize = opts.timing ? Math.max(1, profiles.length) : 5;
    for (let i = 0; i < profiles.length; i += batchSize) {
      const batch = profiles.slice(i, i + batchSize);
      await Promise.all(batch.map(async p => {
        if (!p.debugPort) { next.set(p.id, null); return; }
        const r = await evalProfilePort(p.debugPort, READ_JS, 5000);
        const s = r && r.success !== false && r.result && typeof r.result === 'object' ? r.result : null;
        next.set(p.id, s && s.ok ? s : (s ? s : null));
      }));
    }
    states = normalizeStates(next);
    statesAt = now();
    return states;
  }

  function profileMap() {
    const m = new Map();
    for (const p of loadProfiles()) m.set(p.id, p);
    return m;
  }

  function managedNameSet() {
    const s = new Set();
    for (const st of states.values()) if (st && st.name) s.add(st.name);
    for (const p of loadProfiles()) if (p.lastCharName) s.add(p.lastCharName);
    return s;
  }

  async function act(profile, code, label, timeoutMs) {
    if (!profile || !profile.debugPort) return { ok: false, error: 'offline' };
    const r = await evalOk(profile.debugPort, code, timeoutMs);
    if (!r.ok) log(label, profile.name || profile.id, 'failed:', r.error);
    return r;
  }

  const recentlyDisbandedAt = new Map();

  function reconcileInGameParties(profiles) {
    if (!profiles || !profiles.size) return false;
    let changed = false;

    const nameToProfileId = new Map();
    for (const [id, p] of profiles) {
      const s = states.get(id);
      const cname = (s && s.ok && s.name) || (p && p.lastCharName) || '';
      if (cname) nameToProfileId.set(String(cname).trim().toLowerCase(), id);
    }

    const taken = assignedIds(parties);

    // 1. Reconcile ONLY explicit Manager-created parties with in-game rule changes & newly invited managed members.
    //    NEVER silently auto-create `party_ig_*` Manager parties from manually formed in-game parties —
    //    manual in-game parties are displayed read-only via `detectInGameManualParties()` without auto-inviting/kicking!
    for (const party of parties.slice()) {
      if (String(party.id || '').startsWith('party_ig_')) {
        parties = parties.filter(x => x !== party);
        runtime.delete(party.id);
        changed = true;
        continue;
      }
      const L = states.get(party.leaderId);
      if (isAutoFarmProtected(party.leaderId, L)) continue;
      const rt = prt(party.id);
      const leaderLeadsInGame = Boolean(
        L && L.ok && L.name && L.party &&
        (typeof L.party.isLeader === 'boolean' ? L.party.isLeader : (L.party.leader === L.name)) &&
        Array.isArray(L.party.members)
      );
      if (leaderLeadsInGame) {
        rt.everFormedInGame = true;
        // Adopt rule changes made in-game when newer than last manager change
        const igRuleAt = Number(L.party.lastInGameRuleChangeAt || 0);
        if (igRuleAt > 0 && igRuleAt > (rt.lastAdoptedRuleAt || 0) && igRuleAt > (rt.managerSettingsChangedAt || 0)) {
          rt.lastAdoptedRuleAt = igRuleAt;
          if (L.party.lootMode && LOOT_MODES.includes(L.party.lootMode) && party.lootMode !== L.party.lootMode) {
            party.lootMode = L.party.lootMode;
            changed = true;
          }
          if (L.party.expMode && EXP_MODES.includes(L.party.expMode) && party.expMode !== L.party.expMode) {
            party.expMode = L.party.expMode;
            changed = true;
          }
          if (L.party.groupMode && GROUP_MODES.includes(L.party.groupMode) && party.groupMode !== L.party.groupMode) {
            party.groupMode = L.party.groupMode;
            changed = true;
          }
        }
        // Adopt managed members that were invited directly in-game (unless explicitly excluded by user)
        for (const gm of L.party.members) {
          if (!gm || !gm.name || gm.name === L.name) continue;
          const mid = nameToProfileId.get(String(gm.name).trim().toLowerCase());
          if (!mid || mid === party.leaderId) continue;
          if (isAutoFarmProtected(mid)) continue;
          if (party.memberIds.includes(mid)) continue;
          if (taken.has(mid)) continue;
          if (Array.isArray(party.excludedIds) && party.excludedIds.includes(mid)) continue;
          if (party.memberIds.length >= MAX_MEMBERS - 1) break;
          party.memberIds.push(mid);
          taken.add(mid);
          changed = true;
        }
      }
    }

    if (changed) save();
    return changed;
  }

  // Detect live in-game parties formed manually by the player (NOT managed by Manager).
  // Returned read-only in view() so the user sees them in Manager without the bot ever auto-inviting/kicking/splitting them.
  function detectInGameManualParties(profiles) {
    if (!profiles || !profiles.size) return [];
    const taken = assignedIds(parties);
    const nameToProfileId = new Map();
    for (const [id, p] of profiles) {
      const s = states.get(id);
      const cname = (s && s.ok && s.name) || (p && p.lastCharName) || '';
      if (cname) nameToProfileId.set(String(cname).trim().toLowerCase(), id);
    }

    // Collect active Manager party identifiers so we never duplicate an explicit Manager party
    const managedPids = new Set();
    const managedLeaderNamesLow = new Set();
    for (const p of parties) {
      const L = states.get(p.leaderId);
      const LP = profiles.get(p.leaderId);
      const lname = (L && L.ok && L.name) || (LP && LP.lastCharName) || '';
      if (lname) managedLeaderNamesLow.add(String(lname).trim().toLowerCase());
      if (L && L.ok && L.party && L.party.partyPid) managedPids.add(String(L.party.partyPid));
    }

    const groups = new Map(); // groupKey -> { key, partyPid, snapshots: [{ id, P, S }] }
    for (const [id, P] of profiles) {
      if (taken.has(id)) continue;
      const S = states.get(id);
      if (isAutoFarmProtected(id, S)) continue;
      if (!S || !S.ok || !S.name || !S.party) continue;
      if (!Array.isArray(S.party.members) || S.party.members.length < 2) continue;
      const pidStr = S.party.partyPid ? String(S.party.partyPid) : '';
      const leadLow = String(S.party.leader || '').trim().toLowerCase();
      if (pidStr && managedPids.has(pidStr)) continue;
      if (leadLow && managedLeaderNamesLow.has(leadLow)) continue;
      const srvKey = normalizeServerKey(S.serverName || (P && P.serverName) || '');
      const key = pidStr
        ? ('pid:' + pidStr)
        : ('lead:' + srvKey + ':' + (leadLow || S.name.toLowerCase()));
      if (!groups.has(key)) groups.set(key, { key, partyPid: pidStr || null, entries: [] });
      groups.get(key).entries.push({ id, P, S });
    }

    const result = [];
    for (const grp of groups.values()) {
      // Pick the most authoritative snapshot (actual leader first, else highest member count)
      const sortedEntries = grp.entries.slice().sort((a, b) => {
        const aLead = typeof a.S.party.isLeader === 'boolean' ? a.S.party.isLeader : (a.S.party.leader === a.S.name);
        const bLead = typeof b.S.party.isLeader === 'boolean' ? b.S.party.isLeader : (b.S.party.leader === b.S.name);
        if (aLead !== bLead) return aLead ? -1 : 1;
        return (b.S.party.members.length || 0) - (a.S.party.members.length || 0);
      });
      const best = sortedEntries[0];
      const rawParty = best.S.party;
      const leaderEntry = sortedEntries.find(e => (typeof e.S.party.isLeader === 'boolean' ? e.S.party.isLeader : (e.S.party.leader === e.S.name))) || null;
      const leaderName = (leaderEntry && leaderEntry.S.name) || String(rawParty.leader || '').trim() || 'หัวตี้';
      const leaderLow = leaderName.toLowerCase();
      const matchedLeaderId = leaderEntry ? leaderEntry.id : (nameToProfileId.get(leaderLow) || null);
      const leaderProfileId = (matchedLeaderId && !taken.has(matchedLeaderId)) ? matchedLeaderId : null;

      const entryByNameLow = new Map();
      for (const e of sortedEntries) {
        if (e.S && e.S.name) entryByNameLow.set(String(e.S.name).trim().toLowerCase(), e);
      }

      const buildSlot = (gm, isLeadSlot) => {
        const gmName = String((gm && gm.name) || '').trim();
        const gmLow = gmName.toLowerCase();
        const entry = entryByNameLow.get(gmLow) || null;
        const profId = entry ? entry.id : (gmLow ? (nameToProfileId.get(gmLow) || null) : null);
        const isManagedSlot = Boolean(profId && profiles.has(profId) && !taken.has(profId));
        const P = isManagedSlot ? profiles.get(profId) : null;
        const S = isManagedSlot ? states.get(profId) : null;
        return {
          id: isManagedSlot ? profId : null,
          external: !isManagedSlot,
          profileName: P ? P.name : (isLeadSlot ? 'ผู้เล่นภายนอก' : 'ผู้เล่นในเกม'),
          charName: (S && S.name) || gmName || (isLeadSlot ? leaderName : 'ผู้เล่น'),
          charClass: (S && S.classId) || (gm && gm.classId) || (P && P.lastCharClass) || null,
          level: (S && typeof S.level === 'number') ? S.level : (gm && typeof gm.level === 'number' ? gm.level : null),
          mapName: (S && S.mapName) || (gm && gm.mapName) || null,
          channel: (S && typeof S.channel === 'number') ? S.channel : (gm && typeof gm.channel === 'number' ? gm.channel : null),
          online: S ? Boolean(S.ok) : (gm ? gm.online !== false : true),
          status: isLeadSlot ? 'leader' : (isManagedSlot ? 'joined' : 'external'),
          statusText: isLeadSlot
            ? (isManagedSlot ? 'หัวตี้ (ตั้งเองในเกม)' : 'หัวตี้ (ผู้เล่นภายนอก)')
            : (isManagedSlot ? 'อยู่ด้วยกัน (ตั้งเองในเกม)' : 'ผู้เล่นภายนอก')
        };
      };

      let leaderSlot = null;
      const memberSlots = [];
      const seenNames = new Set();
      for (const gm of (rawParty.members || [])) {
        if (!gm || !gm.name) continue;
        const low = String(gm.name).trim().toLowerCase();
        if (seenNames.has(low)) continue;
        seenNames.add(low);
        const isLeadGm = Boolean(low === leaderLow || (leaderEntry && low === leaderEntry.S.name.toLowerCase()));
        if (isLeadGm && !leaderSlot) {
          leaderSlot = buildSlot(gm, true);
        } else {
          memberSlots.push(buildSlot(gm, false));
        }
      }
      if (!leaderSlot) {
        leaderSlot = buildSlot({ name: leaderName }, true);
      }

      const managedProfileIds = [];
      if (leaderSlot.id) managedProfileIds.push(leaderSlot.id);
      for (const ms of memberSlots) {
        if (ms.id && !managedProfileIds.includes(ms.id)) managedProfileIds.push(ms.id);
      }
      for (const e of sortedEntries) {
        if (!managedProfileIds.includes(e.id)) managedProfileIds.push(e.id);
      }

      result.push({
        id: 'ig_' + grp.key,
        partyPid: grp.partyPid,
        inGameOnly: true,
        leaderProfileId,
        leaderName: leaderSlot.charName || leaderName,
        leaderIsManaged: Boolean(leaderProfileId),
        canAdopt: Boolean(leaderProfileId && !taken.has(leaderProfileId)),
        managedProfileIds,
        managedCount: managedProfileIds.length,
        expMode: EXP_MODES.includes(rawParty.expMode) ? rawParty.expMode : 'even-share',
        lootMode: LOOT_MODES.includes(rawParty.lootMode) ? rawParty.lootMode : 'personal',
        groupMode: GROUP_MODES.includes(rawParty.groupMode) ? rawParty.groupMode : 'g',
        leader: leaderSlot,
        members: memberSlots,
        count: 1 + memberSlots.length,
        max: rawParty.maxMembers || MAX_MEMBERS
      });
    }

    result.sort((a, b) => (b.managedCount - a.managedCount) || String(a.leaderName).localeCompare(String(b.leaderName)));
    result.forEach((p, idx) => { p.index = idx + 1; });
    return result;
  }

  async function tickParty(party, profiles) {
    const rt = prt(party.id);
    const notes = [];
    rt.lastTickAt = now();
    const leaderP = profiles.get(party.leaderId);
    const L = states.get(party.leaderId);
    if (!leaderP) { rt.notes = ['ไม่พบโปรไฟล์หัวตี้แล้ว']; return; }
    if (isAutoFarmProtected(party.leaderId, L)) {
      if (L && L.ok && L.hasPmPartySync && L.helpers && L.helpers.updatePartySyncState) {
        const clr = await act(leaderP, ACTIONS.syncClientPartyState(null), 'clear-autofarm-party-sync');
        if (clr && clr.ok) L.hasPmPartySync = false;
      }
      rt.notes = ['💎 หัวตี้กำลังรันระบบฟาร์มเพชร — พักการจัดการตี้ชั่วคราว (ไม่กระทบจอฟาร์มเพชร)'];
      return;
    }
    if (!L || !L.ok || !L.name) { rt.notes = ['หัวตี้ออฟไลน์หรือยังไม่เข้าเกม']; return; }
    if (!L.partyKnown) notes.push('อ่านสถานะปาร์ตี้ในเกมไม่ได้ (หน้าเกมอาจยังโหลดไม่เสร็จ)');
    const managed = managedNameSet();

    // Leader stuck in another (stale bot) party → leave it first
    if (L.party && L.party.leader !== L.name) {
      if (managed.has(L.party.leader)) {
        if (now() - rt.leaveAt >= T.leaveCooldownMs) { rt.leaveAt = now(); await act(leaderP, ACTIONS.leave(), 'leader-leave'); }
        rt.notes = notes.concat('หัวตี้อยู่ในตี้เก่าของ ' + L.party.leader + ' — กำลังออกจากตี้นั้น');
      } else {
        rt.notes = notes.concat('หัวตี้อยู่ในตี้ของผู้เล่นอื่น (' + L.party.leader + ') — ออกจากตี้นั้นก่อน');
      }
      return;
    }

    // Drop members that have been offline / disconnected or stuck in another party so autoFill can pull free clients
    // (When autoFill is off, keep manually chosen members in the party until the user removes them)
    const inGameMembersMap = new Map();
    if (L.party && Array.isArray(L.party.members)) {
      for (const gm of L.party.members) if (gm && gm.name) inGameMembersMap.set(gm.name, gm);
    }
    const keep = [];
    for (const id of party.memberIds) {
      if (!profiles.has(id)) continue;
      const s = states.get(id), m = mrt(party.id, id);
      if (isAutoFarmProtected(id, s)) {
        m.seenAt = now();
        m.otherPartySince = 0;
        m.leaveAttempts = 0;
        keep.push(id);
        continue;
      }
      const charName = (s && s.name) || (profiles.get(id) && profiles.get(id).lastCharName) || null;
      const gm = charName ? inGameMembersMap.get(charName) : null;
      const isOnlineNow = Boolean(s && s.ok && s.name && (!gm || gm.online !== false));
      if (isOnlineNow) m.seenAt = now();
      if (party.autoFill && now() - m.seenAt >= T.dropOfflineAfterMs) {
        notes.push('ปลดสมาชิกที่ออฟไลน์นาน: ' + (charName || profiles.get(id).name || id));
        continue;
      }
      if (party.autoFill && s && s.ok && s.name && s.party && s.party.leader !== L.name) {
        if (!m.otherPartySince) m.otherPartySince = now();
        if ((m.leaveAttempts || 0) >= 2 || now() - m.otherPartySince >= (T.dropOtherPartyAfterMs || 45000)) {
          tempExcluded.set(party.id + ':' + id, now() + T.excludeAfterFailMs);
          m.otherPartySince = 0; m.leaveAttempts = 0;
          notes.push('สลับ ' + s.name + ' ออก (ติดอยู่ตี้อื่น) เพื่อดึงจอว่างเข้าแทน');
          continue;
        }
      } else {
        m.otherPartySince = 0; m.leaveAttempts = 0;
      }
      keep.push(id);
    }
    let changed = keep.length !== party.memberIds.length;
    party.memberIds = keep;
    if (changed) party.followModes = sanitizeFollowModes(party);

    if (L.party && L.party.leader === L.name && Array.isArray(L.party.members)) {
      const assignedBefore = new Set(party.memberIds.map(id => (states.get(id) && states.get(id).name) || (profiles.get(id) && profiles.get(id).lastCharName)).filter(Boolean));
      for (const m of L.party.members.slice()) {
        if (!m || !m.name || m.name === L.name) continue;
        if (!assignedBefore.has(m.name) && m.online === false) {
          await act(leaderP, ACTIONS.kick(m.name), 'kick-offline');
          L.party.members = L.party.members.filter(x => x.name !== m.name);
        }
      }
    }

    // Top up to 6 (leader included)
    if (party.autoFill) {
      const excluded = new Set(party.excludedIds);
      const hardExcluded = new Set(party.excludedIds);
      for (const id of profiles.keys()) {
        if (isAutoFarmProtected(id)) {
          excluded.add(id);
          hardExcluded.add(id);
        }
      }
      for (const [k, until] of tempExcluded) {
        if (until < now()) { tempExcluded.delete(k); continue; }
        const [pid, id] = k.split(':'); if (pid === party.id) excluded.add(id);
      }
      const inGameCount = L.party ? L.party.members.length : 1;
      const managedInGame = L.party ? L.party.members.filter(m => managed.has(m.name)).length : 1;
      const outsiders = Math.max(0, inGameCount - managedInGame);
      const slots = MAX_MEMBERS - 1 - party.memberIds.length - outsiders;
      let picks = pickCandidates(party, parties, states, managed, slots, excluded);
      // Fallback: if party still has empty slots and no non-excluded candidate is available, allow retrying temp-excluded clients
      if (!picks.length && slots > 0) {
        picks = pickCandidates(party, parties, states, managed, slots, hardExcluded);
      }
      if (picks.length) { party.memberIds.push(...picks); changed = true; }
    }
    if (changed) save();

    const assignedAfter = new Set(party.memberIds.map(id => (states.get(id) && states.get(id).name) || (profiles.get(id) && profiles.get(id).lastCharName)).filter(Boolean));
    const outsidersInGame = [];
    if (L.party && L.party.leader === L.name && Array.isArray(L.party.members)) {
      for (const m of L.party.members.slice()) {
        if (!m || !m.name || m.name === L.name) continue;
        if (!assignedAfter.has(m.name) && (m.online === false || managed.has(m.name))) {
          await act(leaderP, ACTIONS.kick(m.name), 'kick-unassigned');
          L.party.members = L.party.members.filter(x => x.name !== m.name);
        } else if (!assignedAfter.has(m.name)) {
          outsidersInGame.push(m.name);
        }
      }
    }

    const inGame = new Set(inGameMemberNames(L));
    const isLeader = !L.party || L.party.leader === L.name;
    const partyFull = L.party && L.party.members.length >= (L.party.maxMembers || MAX_MEMBERS);
    const missingAssignedNames = party.memberIds
      .map(id => states.get(id))
      .filter(S => S && S.ok && S.name && !inGame.has(S.name))
      .map(S => S.name);
    if (partyFull && outsidersInGame.length > 0 && missingAssignedNames.length > 0) {
      notes.push(`⚠️ ตี้ในเกมเต็ม ${L.party.members.length}/${L.party.maxMembers || MAX_MEMBERS} เพราะมีคนนอก (${outsidersInGame.join(', ')}) แทรกอยู่ — ${missingAssignedNames.join(', ')} เข้าไม่ได้ (กดปุ่ม "เตะคนนอก" ด้านล่าง)`);
    } else if (outsidersInGame.length > 0) {
      notes.push(`👤 พบผู้เล่นนอกทีมในตี้: ${outsidersInGame.join(', ')}`);
    }

    // Invites
    for (const id of party.memberIds) {
      const P = profiles.get(id), S = states.get(id), m = mrt(party.id, id);
      if (isAutoFarmProtected(id, S)) continue;
      if (!S || !S.ok || !S.name) continue;
      if (inGame.has(S.name)) { m.inviteAttempts = 0; continue; }
      if (S.party && S.party.leader !== L.name) {
        if (now() - m.leaveAt >= T.leaveCooldownMs) {
          m.leaveAt = now();
          m.leaveAttempts = (m.leaveAttempts || 0) + 1;
          await act(P, ACTIONS.leave(), 'member-leave');
        }
        continue;
      }
      if (S.invite && S.invite.from === L.name) { await act(P, ACTIONS.accept(L.name), 'accept'); continue; }
      if (!isLeader || partyFull) continue;
      if (now() - m.inviteAt < T.inviteCooldownMs) continue;
      if (m.inviteAttempts >= T.inviteMaxAttempts) {
        if (party.autoFill) {
          tempExcluded.set(party.id + ':' + id, now() + T.excludeAfterFailMs);
          party.memberIds = party.memberIds.filter(x => x !== id);
          party.followModes = sanitizeFollowModes(party);
          m.inviteAttempts = 0;
          notes.push('ชวน ' + S.name + ' ไม่สำเร็จหลายครั้ง — สลับหาจอว่างอื่นแทน');
          save();
          continue;
        }
        m.inviteAttempts = 0;
      }
      m.inviteAt = now(); m.inviteAttempts++;
      const inv = await act(leaderP, ACTIONS.invite(S.name), 'invite');
      if (inv.ok) {
        await sleep(T.acceptDelayMs);
        await act(P, ACTIONS.accept(L.name), 'accept');
      }
    }

    // EXP / loot / group mode (leader only)
    if (L.party && L.party.leader === L.name && now() - rt.settingsAt >= T.settingsCooldownMs) {
      if (L.party.expMode !== party.expMode) {
        if (party.expMode === 'even-share' && !L.party.evenShareAllowed) {
          notes.push('แชร์ EXP ไม่ได้: เลเวลสมาชิกห่างกันเกิน ' + (L.party.levelRange || '?'));
        } else { rt.settingsAt = now(); await act(leaderP, ACTIONS.settings({ expMode: party.expMode }), 'exp-mode'); }
      }
      if (L.party.lootMode !== party.lootMode) { rt.settingsAt = now(); await act(leaderP, ACTIONS.settings({ lootMode: party.lootMode }), 'loot-mode'); }
      if (party.groupMode && L.party.groupMode && L.party.groupMode !== party.groupMode) {
        rt.settingsAt = now();
        await act(leaderP, ACTIONS.settings({ groupMode: party.groupMode }), 'group-mode');
      }
    }

    // Sync persisted No-Loot mode for party members
    {
      const noLootSet = new Set(Array.isArray(party.noLootIds) ? party.noLootIds.map(String) : []);
      for (const id of [party.leaderId].concat(party.memberIds)) {
        const wantNoLoot = noLootSet.has(String(id));
        const P = profiles.get(id), S = states.get(id);
        if (isAutoFarmProtected(id, S)) continue;
        if (P && S && S.ok && typeof S.noLootMode === 'boolean' && S.noLootMode !== wantNoLoot) {
          const r = await act(P, ACTIONS.setNoLoot(wantNoLoot), 'sync-noloot');
          if (r.ok) S.noLootMode = wantNoLoot;
        }
      }
    }

    // Sync persisted per-member Auto Farm/Support mode (`auto` | `farm` | `support_fight` | `support_only`)
    {
      const autoModesMap = (party.autoModes && typeof party.autoModes === 'object') ? party.autoModes : {};
      for (const id of [party.leaderId].concat(party.memberIds)) {
        const wantMode = normalizeAutoFarmMode(autoModesMap[id]);
        const P = profiles.get(id), S = states.get(id);
        if (isAutoFarmProtected(id, S)) continue;
        if (P && S && S.ok && S.autoFarmMode && S.autoFarmMode !== wantMode) {
          const r = await act(P, ACTIONS.setAutoFarmMode(wantMode), 'sync-auto-mode');
          if (r.ok) {
            S.autoFarmMode = wantMode;
            if (r.result && r.result.effectiveMode) S.effectiveAutoFarmMode = r.result.effectiveMode;
          }
        }
      }
    }

    // Per-member follow / assist mode:
    // - 'none' (default): cancel the game's follow (e.g. after รวมทีม) so the member farms the map independently
    //   (unless it is temporarily walking back to the Priest for buffs: S.returningToPriest === true).
    // - 'leader' or 'member:<id>': engage the game's follow on that party member (or the Priest when a Priest is in the party).
    const rawPriest = findPartyPriest(party, profiles, states);
    const priest = (rawPriest && !isAutoFarmProtected(rawPriest.id, rawPriest.snap)) ? rawPriest : null;
    const allPartyNames = [L.name].concat(party.memberIds.map(id => {
      if (isAutoFarmProtected(id)) return null;
      const s = states.get(id), p = profiles.get(id);
      return (s && s.name) || (p && p.lastCharName) || null;
    })).filter(Boolean);

    for (const id of [party.leaderId].concat(party.memberIds)) {
      const P = profiles.get(id), S = states.get(id), m = mrt(party.id, id);
      if (isAutoFarmProtected(id, S)) continue;
      if (!S || !S.ok || !S.name || (id !== party.leaderId && !inGame.has(S.name))) continue;
      if (id === party.leaderId && (!priest || S.follow !== priest.name)) continue;
      const ft = id === party.leaderId
        ? { mode: 'none', targetId: null, targetName: null, targetSnap: null }
        : resolveFollowTarget(party, id, profiles, states);
      if (ft.mode === 'none' || ft.viaPriest) {
        if (!S.follow || (party.priestFlow !== false && S.returningToPriest)) continue;
        if (now() - (m.unfollowAt || 0) < T.unfollowCooldownMs) continue;
        m.unfollowAt = now();
        const prev = S.follow;
        const r = await act(P, ACTIONS.stopFollow(), 'stop-follow');
        if (r.ok) { S.follow = null; log('stop-follow', S.name, '(was following ' + prev + ')'); }
      } else {
        if (S.returningToPriest) continue;
        if (!ft.targetName) continue;
        if (planBlocked(S) || (S.busy && S.busy.length)) continue;
        const TS = ft.targetSnap;
        const sameMapAndCh = TS && TS.ok && S.mapId && S.mapId === TS.mapId && S.channel === TS.channel;
        if (!sameMapAndCh) continue;
        if (S.follow === ft.targetName) continue;
        if (now() - (m.followAt || 0) < T.followCooldownMs) continue;
        m.followAt = now();
        const r = await act(P, ACTIONS.startFollow(ft.targetName), 'start-follow');
        if (r.ok) { S.follow = ft.targetName; log('start-follow', S.name, '->', ft.targetName); }
      }
    }

    // Same map + same CH as the party (Priest is the Channel Anchor when present on the farm map; otherwise Leader)
    // CRITICAL (v2.3.9 / v2.3.40): NEVER treat Nightcamp's 'auto' targetMap as a concrete map name,
    // NEVER grab stale `L.targetMap` (e.g. old `graveyard` from a previous character) while Leader is in Auto-Quest / Plan Auto-Quest mode,
    // and require 12s dwell before adopting Leader's current mapId when Leader has no explicit targetMap!
    let leaderMap = null;
    let leaderMapId = null;
    const leaderInAutoQuest = Boolean(L.smartAutoQuestEnabled || L.planAutoQuestActive);
    if (leaderInAutoQuest) {
      rt.lastLeaderFarmMap = null;
    } else if (!isAutoMapToken(L.targetMap) && !isCityMapName(L.targetMap)) {
      leaderMap = String(L.targetMap).trim();
      if (/^[a-z0-9_]+$/i.test(leaderMap)) leaderMapId = leaderMap.toLowerCase();
    } else if (L.mapId && !isCityMapName(L.mapId) && !isCityMapName(L.mapName)) {
      const curLMap = String(L.mapId).trim();
      if (!L.isTraveling) {
        if (!rt.leaderMapDwell || rt.leaderMapDwell.mapId !== curLMap) {
          rt.leaderMapDwell = { mapId: curLMap, since: now() };
        }
        const dwellMs = now() - (rt.leaderMapDwell.since || now());
        if (dwellMs >= 12000 || rt.lastLeaderFarmMap === curLMap || opts.timing) {
          leaderMap = curLMap;
          leaderMapId = curLMap.toLowerCase();
        }
      }
    }
    if (!leaderInAutoQuest && !leaderMap && !isAutoMapToken(L.keptFarmMap) && !isCityMapName(L.keptFarmMap)) {
      leaderMap = String(L.keptFarmMap).trim();
      if (/^[a-z0-9_]+$/i.test(leaderMap)) leaderMapId = leaderMap.toLowerCase();
    }
    if (!leaderInAutoQuest && !leaderMap && !isAutoMapToken(rt.lastLeaderFarmMap) && !isCityMapName(rt.lastLeaderFarmMap)) {
      leaderMap = String(rt.lastLeaderFarmMap).trim();
      if (/^[a-z0-9_]+$/i.test(leaderMap)) leaderMapId = leaderMap.toLowerCase();
    }
    if (leaderMap && !isAutoMapToken(leaderMap) && !isCityMapName(leaderMap)) {
      rt.lastLeaderFarmMap = leaderMap;
    }

    let anchorId = party.leaderId;
    let anchorSnap = L;
    if (priest && priest.snap && priest.snap.ok && priest.snap.mapId && !isCityMapName(priest.snap.mapName)) {
      const onFarmMap = !leaderMap || mapsMatch(priest.snap.mapId, priest.snap.mapName, leaderMapId, leaderMap) || priest.snap.mapId === L.mapId;
      if (onFarmMap) {
        anchorId = priest.id;
        anchorSnap = priest.snap;
      }
    }

    if (party.syncMap) {

      const chMode = typeof getChannelCheckMode === 'function' ? (getChannelCheckMode() || 'all') : 'all';
      const partyChannelCheckEnabled = (chMode === 'no_overlap' || chMode === 'all' || chMode === 'party_only' || chMode === 'always');
      const { avoidChannels, otherPartyChannelsByMap } = getAvoidChannelsForParty(
        party,
        profiles,
        anchorSnap && !isCityMapName(anchorSnap.mapName) ? anchorSnap.mapId : null,
        leaderMap || (anchorSnap && anchorSnap.mapName)
      );

      // When any party member settles its channel right inside Camp (pre-departure) OR returns from selling to the farm map,
      // adopt that settled channel immediately so teammates sync in Camp BEFORE departing and Anchor is NEVER yanked back to Camp!
      let triggeredByPostSell = false;
      if (partyChannelCheckEnabled) {
        let latestSwitch = null;
        for (const id of [party.leaderId].concat(party.memberIds)) {
          const S = states.get(id);
          if (isAutoFarmProtected(id, S)) continue;
          if (!S || !S.ok || !S.name) continue;
          if (id !== party.leaderId && !inGame.has(S.name)) continue;
          const sw = S.lastPostSellChannelSwitch;
          if (!sw || typeof sw.channel !== 'number' || typeof sw.at !== 'number') continue;
          if (S.pkChannel) continue;
          if (now() - sw.at > 180000) continue;
          if (S.channel !== sw.channel) continue;
          if (avoidChannels.includes(sw.channel)) continue;
          const isCampPreDepart = Boolean(S.mapId === 'camp' && id === anchorId && sw.mapId && (!leaderMapId || sw.mapId === leaderMapId));
          const onPartyFarmMap = Boolean(S.mapId && !isCityMapName(S.mapName) && (!leaderMap || (S.mapName && S.mapName.includes(leaderMap)) || (anchorSnap && S.mapId === anchorSnap.mapId) || (leaderMapId && S.mapId === leaderMapId)));
          if (!onPartyFarmMap && !isCampPreDepart) continue;
          if (!isCampPreDepart && sw.mapId && S.mapId !== sw.mapId) continue;
          // If Anchor already settled this exact (mapId, channel) in Camp right before departing, honor it silently so `needsInitialChannelCheck` does NOT bounce Anchor back to Camp!
          if (id === anchorId && onPartyFarmMap && sw.mapId === S.mapId && rt.settledMapId !== S.mapId) {
            rt.settledMapId = S.mapId;
            rt.settledChannel = sw.channel;
            rt.settledChannelAt = sw.at || now();
            rt.lastPostSellFollowAt = Math.max(rt.lastPostSellFollowAt || 0, sw.at);
          }
          if (sw.at <= (rt.lastPostSellFollowAt || 0)) continue;
          if (!latestSwitch || sw.at > latestSwitch.sw.at) {
            latestSwitch = { id, snap: S, sw, targetMapId: isCampPreDepart ? sw.mapId : S.mapId };
          }
        }
        if (latestSwitch) {
          rt.lastPostSellFollowAt = latestSwitch.sw.at;
          rt.settledMapId = latestSwitch.targetMapId;
          rt.settledChannel = latestSwitch.sw.channel;
          rt.settledChannelAt = latestSwitch.sw.at || now();
          rt.settledByMemberName = latestSwitch.snap.name;
          anchorId = latestSwitch.id;
          anchorSnap = latestSwitch.snap;
          triggeredByPostSell = true;
          log('post-sell-ch-follow', latestSwitch.snap.name, 'selected CH', latestSwitch.sw.channel, 'on', latestSwitch.targetMapId);
        }
      }

      const anchorOnFarm = Boolean(anchorSnap && anchorSnap.botRunning !== false && anchorSnap.mapId && !isCityMapName(anchorSnap.mapName));
      const anchorInPk = Boolean(anchorOnFarm && anchorSnap && anchorSnap.pkChannel);
      const anchorCooldownLeftMs = Number(anchorSnap && anchorSnap.channelCooldownLeftMs) || 0;
      const anchorCoolingDown = anchorCooldownLeftMs > 12000;
      const desiredCh = (anchorOnFarm && !anchorInPk && rt.settledMapId === anchorSnap.mapId && typeof rt.settledChannel === 'number')
        ? rt.settledChannel
        : (anchorSnap && !anchorSnap.pkChannel ? anchorSnap.channel : (!L.pkChannel ? L.channel : null));
      const channelOverlapsOtherParty = Boolean(
        partyChannelCheckEnabled &&
        anchorOnFarm &&
        !anchorInPk &&
        typeof desiredCh === 'number' &&
        avoidChannels.includes(desiredCh)
      );
      const anchorHasPendingSpread = Boolean(
        partyChannelCheckEnabled &&
        anchorOnFarm &&
        anchorSnap &&
        anchorSnap.pendingChannelSpread &&
        Number(anchorSnap.pendingChannelSpread.avoidChannel) === Number(anchorSnap.channel)
      );
      const needsInitialChannelCheck = Boolean(
        partyChannelCheckEnabled &&
        anchorOnFarm &&
        !anchorInPk &&
        !anchorCoolingDown &&
        anchorSnap.helpers &&
        anchorSnap.helpers.moveToChannel &&
        (anchorSnap.helpers.evaluateAnchorChannel || anchorSnap.helpers.findLeast) &&
        (
          channelOverlapsOtherParty ||
          anchorHasPendingSpread ||
          ((chMode === 'no_overlap' || chMode === 'always') && rt.settledMapId !== anchorSnap.mapId)
        )
      );

      // Only mark settled automatically if NOT overlapping / NOT pending spread (otherwise keep unsettled until 5-min cooldown clears!)
      if (anchorOnFarm && !anchorInPk && typeof anchorSnap.channel === 'number' && rt.settledMapId !== anchorSnap.mapId && !needsInitialChannelCheck && !channelOverlapsOtherParty && !anchorHasPendingSpread) {
        rt.settledMapId = anchorSnap.mapId;
        rt.settledChannel = anchorSnap.channel;
        rt.settledChannelAt = now();
      }
      if (anchorOnFarm && anchorCoolingDown && (channelOverlapsOtherParty || anchorHasPendingSpread)) {
        const leftSec = Math.ceil(anchorCooldownLeftMs / 1000);
        rt.channelNote = `⏳ รอคูลดาวน์ย้าย CH (${Math.floor(leftSec / 60)}:${String(leftSec % 60).padStart(2, '0')}) เพื่อแยกแนลไม่ทับตี้อื่น`;
      }

      const movers = [];
      // If Priest or another returning member is the Channel Anchor (or settledChannel is locked on this map) and the Leader is on a different CH (on the same map OR in Camp before leaving!), Leader moves too (once 5-min cooldown is ready)!
      if (anchorOnFarm && !anchorInPk && L.botRunning !== false && (L.mapId === anchorSnap.mapId || L.mapId === 'camp') && typeof desiredCh === 'number' && (L.channel !== desiredCh || L.pkChannel) && (Number(L.channelCooldownLeftMs) || 0) <= 15000 && !(L.busy && L.busy.length) && L.helpers && L.helpers.moveToChannel) {
        if (anchorId !== party.leaderId || rt.settledMapId === anchorSnap.mapId || L.pkChannel) {
          movers.push(party.leaderId);
        }
      }

      for (const id of party.memberIds) {
        const P = profiles.get(id), S = states.get(id), m = mrt(party.id, id);
        if (isAutoFarmProtected(id, S)) continue;
        if (!S || !S.ok || !S.name) continue;
        const canPreJoinMoveCh = Boolean(!inGame.has(S.name) && !partyFull && !(S.party && S.party.leader !== L.name));
        if (!inGame.has(S.name) && !canPreJoinMoveCh) continue;
        if (planBlocked(S)) continue; // the plan still levels this character on its own maps
        const nonNavBusy = Array.isArray(S.busy)
          ? S.busy.filter(f => f !== '__isNavigating' && f !== '__isWalkingToMap')
          : [];
        if (nonNavBusy.length) continue;
        const hasConcreteLeaderMap = Boolean(leaderMap && !isAutoMapToken(leaderMap) && !isCityMapName(leaderMap));
        const memberOnLeaderMap = Boolean(hasConcreteLeaderMap && mapsMatch(S.mapId, S.mapName, leaderMapId, leaderMap));
        const memberTargetsLeaderMap = Boolean(
          hasConcreteLeaderMap &&
          !isAutoMapToken(S.targetMap) &&
          mapsMatch(S.targetMap, S.targetMap, leaderMapId, leaderMap)
        );
        const wrongTarget = Boolean(
          hasConcreteLeaderMap &&
          !S.smartAutoQuestEnabled &&
          !memberTargetsLeaderMap &&
          !isCityMapName(S.targetMap)
        );
        if (!wrongTarget && S.busy && S.busy.length) continue;
        const wrongCurrentMap = Boolean(
          hasConcreteLeaderMap &&
          !S.smartAutoQuestEnabled &&
          S.botRunning &&
          S.mapName &&
          !memberOnLeaderMap &&
          !isCityMapName(S.mapName) &&
          !(memberTargetsLeaderMap && S.isTraveling)
        );
        if ((wrongTarget || wrongCurrentMap) && S.helpers && S.helpers.setTargetFarmMap && now() - m.mapAt >= T.mapCooldownMs) {
          m.mapAt = now();
          await act(P, ACTIONS.setMap(leaderMap, S.botRunning), 'set-map');
        }
        if (S.botRunning !== false && !(S.busy && S.busy.length) && anchorSnap && anchorOnFarm && !anchorInPk && S.mapId && (S.mapId === anchorSnap.mapId || S.mapId === 'camp') && typeof desiredCh === 'number' && (S.channel !== desiredCh || S.pkChannel) && (Number(S.channelCooldownLeftMs) || 0) <= 15000 && S.helpers && S.helpers.moveToChannel) {
          movers.push(id);
        }
      }
      if ((needsInitialChannelCheck || movers.length) && !rt.gathering && (triggeredByPostSell || channelOverlapsOtherParty || anchorHasPendingSpread || now() - rt.gatherAt >= T.gatherCooldownMs) && !isBusy()) {
        gatherChannels(party, profiles, anchorId, anchorSnap, movers, needsInitialChannelCheck, allPartyNames, avoidChannels).catch(e => log('gather error', e.message));
      } else if (!needsInitialChannelCheck && !movers.length && !rt.gathering && rt.channelNote && !(anchorCoolingDown && (channelOverlapsOtherParty || anchorHasPendingSpread))) {
        rt.channelNote = null;
      }
      if (rt.gathering && rt.gatherNote) notes.push(rt.gatherNote);
      else if (rt.channelNote) notes.push(rt.channelNote);
    }

    // Push Priest-centric sync state + priority buffQueue to all clients in the party that support updatePartySyncState
    const priestFlowEnabled = party.priestFlow !== false;
    const buffQueue = [];
    if (priestFlowEnabled) {
      for (const id of [party.leaderId].concat(party.memberIds)) {
        const s = states.get(id);
        if (isAutoFarmProtected(id, s)) continue;
        if (!s || !s.ok || !s.name) continue;
        if (priest && String(priest.id) === String(id)) continue;
        if (priest && priest.snap && priest.snap.ok) {
          if (s.mapId !== priest.snap.mapId || s.channel !== priest.snap.channel) continue;
        }
        const bs = s.buffStatus || {};
        const minCoreBuffMs = typeof bs.minCoreBuffMs === 'number'
          ? bs.minCoreBuffMs
          : Math.min(typeof bs.blessingMs === 'number' ? bs.blessingMs : 999999, typeof bs.agiMs === 'number' ? bs.agiMs : 999999);
        const hpPct = typeof bs.hpPct === 'number' ? bs.hpPct : 1;
        const needsHeal = Boolean(bs.needsHeal || (hpPct > 0 && hpPct < 0.65));
        const needsBuff = Boolean(s.needsPriestBuff || s.returningToPriest || bs.needsBuff || minCoreBuffMs < 25000);
        if (needsHeal || needsBuff) {
          buffQueue.push({
            id: String(id),
            name: s.name,
            hpPct,
            minCoreBuffMs,
            blessingMs: typeof bs.blessingMs === 'number' ? bs.blessingMs : 0,
            agiMs: typeof bs.agiMs === 'number' ? bs.agiMs : 0,
            needsHeal,
            needsBuff,
            returningToPriest: Boolean(s.returningToPriest)
          });
        }
      }
      // Sort by priority: 1) Emergency heal (lowest HP% first) -> 2) Lowest remaining core buff time first
      buffQueue.sort((a, b) => {
        if (a.needsHeal !== b.needsHeal) return a.needsHeal ? -1 : 1;
        if (a.needsHeal && b.needsHeal && Math.abs(a.hpPct - b.hpPct) > 0.05) return a.hpPct - b.hpPct;
        return a.minCoreBuffMs - b.minCoreBuffMs;
      });
    }

    const membersNeedingBuff = buffQueue.length;
    const syncAvoidInfo = getAvoidChannelsForParty(
      party,
      profiles,
      anchorSnap && !isCityMapName(anchorSnap.mapName) ? anchorSnap.mapId : null,
      leaderMap || (anchorSnap && anchorSnap.mapName)
    );
    const ownPartyCountByCh = {};
    let maxMemberLevel = 0;
    const anchorInField = Boolean(anchorSnap && anchorSnap.mapId && !isCityMapName(anchorSnap.mapName));
    for (const mid of [party.leaderId].concat(party.memberIds)) {
      const ms = states.get(mid);
      if (isAutoFarmProtected(mid, ms)) continue;
      if (ms && typeof ms.level === 'number' && ms.level > maxMemberLevel) {
        maxMemberLevel = ms.level;
      }
      if (!ms || !ms.ok || !ms.mapId || isCityMapName(ms.mapName) || ms.pkChannel) continue;
      const samePartyField = anchorInField
        ? (ms.mapId === anchorSnap.mapId)
        : (!leaderMap || mapsMatch(ms.mapId, ms.mapName, leaderMapId, leaderMap));
      if (samePartyField && typeof ms.channel === 'number') {
        ownPartyCountByCh[ms.channel] = (ownPartyCountByCh[ms.channel] || 0) + 1;
      }
    }
    for (const id of [party.leaderId].concat(party.memberIds)) {
      const P = profiles.get(id), S = states.get(id);
      if (isAutoFarmProtected(id, S)) {
        if (P && S && S.ok && S.hasPmPartySync && S.helpers && S.helpers.updatePartySyncState) {
          const clr = await act(P, ACTIONS.syncClientPartyState(null), 'clear-autofarm-party-sync');
          if (clr && clr.ok) S.hasPmPartySync = false;
        }
        continue;
      }
      if (!P || !S || !S.ok || !S.helpers || !S.helpers.updatePartySyncState) continue;
      let effMode = 'none';
      if (id !== party.leaderId) {
        const ft = resolveFollowTarget(party, id, profiles, states);
        effMode = ft.viaPriest ? 'none' : ft.mode;
      }
      const settledMatchesPartyMap = Boolean(
        rt.settledMapId &&
        typeof rt.settledChannel === 'number' &&
        (
          (anchorInField && rt.settledMapId === anchorSnap.mapId) ||
          (!anchorInField && (!leaderMap || mapsMatch(rt.settledMapId, rt.settledMapId, leaderMapId, leaderMap)))
        )
      );
      const syncPayload = {
        partyId: party.id,
        managed: true,
        leaderName: L.name,
        priestFlow: priestFlowEnabled,
        priestName: priest ? priest.name : null,
        isAnchorPriest: Boolean(priest && String(priest.id) === String(id)),
        followMode: effMode,
        syncMap: Boolean(party.syncMap),
        forcedMap: (party.syncMap && id !== party.leaderId && !planBlocked(S) && leaderMap && !isAutoMapToken(leaderMap) && !isCityMapName(leaderMap)) ? leaderMap : null,
        partyMapId: (anchorInField && anchorSnap.mapId) || rt.settledMapId || null,
        partyMapName: leaderMap || (anchorSnap && anchorSnap.mapName) || null,
        settledChannel: settledMatchesPartyMap ? rt.settledChannel : null,
        lastPartyChannelSwitchAt: rt.lastPostSellFollowAt || rt.settledChannelAt || 0,
        ownPartyCountByCh,
        maxMemberLevel,
        avoidChannels: syncAvoidInfo.avoidChannels,
        otherPartyChannelsByMap: syncAvoidInfo.otherPartyChannelsByMap,
        channelCheckMode: typeof getChannelCheckMode === 'function' ? (getChannelCheckMode() || 'no_overlap') : 'no_overlap',
        partyNames: allPartyNames,
        membersNeedingBuff,
        buffQueue
      };
      const mState = mrt(party.id, id);
      const syncSig = !opts.timing ? JSON.stringify(syncPayload) : '';
      if (!opts.timing && mState.lastPartySyncSig === syncSig && membersNeedingBuff === 0 && (now() - (mState.lastPartySyncAt || 0) < 20000)) {
        continue;
      }
      const syncRes = await act(P, ACTIONS.syncClientPartyState(syncPayload), 'sync-party-state');
      if (syncRes && syncRes.ok) {
        mState.lastPartySyncSig = syncSig;
        mState.lastPartySyncAt = now();
      }
    }

    // Periodic Party Smart Gear Auto-Share (opt-in via party.shareGear)
    if (party.shareGear === true && !rt.sharingGear && !rt.gathering && !isBusy() && (now() - (rt.gearShareAt || 0) >= T.gearShareIntervalMs)) {
      runPartyGearShareCheck(party, profiles, false).catch(e => log('gear-share error', e.message));
    }

    rt.notes = notes;
  }

  async function runPartyGearShareCheck(party, profiles, manual = false) {
    const rt = prt(party.id);
    if (rt.sharingGear) return { ok: false, busy: true, message: 'กำลังเช็ค/เทรดของในตี้อยู่แล้ว' };
    rt.sharingGear = true;
    rt.gearShareAt = now();
    try {
      const memberIds = [party.leaderId].concat(party.memberIds || []);
      const snapshots = new Map();
      for (const id of memberIds) {
        const P = profiles.get(id), S = states.get(id);
        if (isAutoFarmProtected(id, S)) continue;
        if (!P || !S || !S.ok || !S.name) continue;
        if (Array.isArray(S.busy) && S.busy.length > 0) continue;
        const r = await act(P, ACTIONS.getShareableGear(), 'gear-share-scan', 8000);
        if (r.ok && r.result && r.result.ok) {
          snapshots.set(String(id), Object.assign({ profileId: String(id) }, r.result));
        }
      }

      const tradable = [...snapshots.values()].filter(x => x.canTrade && x.premium && x.mapId && x.ch > 0);
      if (tradable.length < 2) {
        const reqTradeLv = [...snapshots.values()].map(x => Number(x.tradeLv || x.tradeLevel || 0)).find(n => n > 0) || 45;
        const msg = tradable.length === 0
          ? `⚠️ ไม่มีสมาชิกพรีเมียม Lv.${reqTradeLv}+ ที่ออนไลน์พร้อมเทรด`
          : '⏳ รอสมาชิกพรีเมียมอย่างน้อย 2 คนออนไลน์อยู่แมพและแชนแนลเดียวกัน';
        if (manual) rt.lastGearShareNote = msg;
        return { ok: true, traded: 0, matches: 0, message: msg };
      }

      // Group tradable members by (mapId, ch) so only teammates standing on the same map & CH evaluate/trade with each other
      const byLoc = new Map();
      for (const m of tradable) {
        const k = m.mapId + ':' + m.ch;
        if (!byLoc.has(k)) byLoc.set(k, []);
        byLoc.get(k).push(m);
      }

      // Evaluate upgrades for each receiver from teammates' bags in the same (mapId, ch)
      const claimsByItemKey = new Map(); // `${senderId}:${u}` -> best { senderId, senderName, receiverId, receiverName, item }
      for (const group of byLoc.values()) {
        if (group.length < 2) continue;
        for (const rec of group) {
          const cands = [];
          for (const snd of group) {
            if (snd.profileId === rec.profileId) continue;
            for (const it of (snd.items || [])) {
              cands.push(Object.assign({}, it, { senderId: snd.profileId, senderName: snd.name }));
            }
          }
          if (!cands.length) continue;
          const recP = profiles.get(rec.profileId);
          if (!recP) continue;
          const ev = await act(recP, ACTIONS.evaluateGearUpgrades(cands), 'gear-share-eval', 8000);
          if (!ev.ok || !ev.result || !Array.isArray(ev.result.upgrades)) continue;
          for (const up of ev.result.upgrades) {
            const itemKey = `${up.senderId}:${up.u}`;
            const prev = claimsByItemKey.get(itemKey);
            if (!prev || (up.priority || 0) > (prev.item.priority || 0)) {
              claimsByItemKey.set(itemKey, {
                senderId: String(up.senderId),
                senderName: up.senderName || '',
                receiverId: rec.profileId,
                receiverName: rec.name || '',
                item: up
              });
            }
          }
        }
      }

      // Sync protected gear UIDs to EVERY scanned member so Uncle Coco NEVER sells/stashes teammate upgrades!
      const protectedBySender = new Map();
      for (const claim of claimsByItemKey.values()) {
        if (!protectedBySender.has(claim.senderId)) protectedBySender.set(claim.senderId, []);
        protectedBySender.get(claim.senderId).push(Number(claim.item.u));
      }
      for (const id of snapshots.keys()) {
        const P = profiles.get(id);
        if (!P) continue;
        const uids = protectedBySender.get(id) || [];
        await act(P, ACTIONS.setProtectedGearUids(uids), 'gear-share-protect', 5000);
      }

      const allClaims = [...claimsByItemKey.values()];
      if (!allClaims.length) {
        const msg = `✅ สแกน ${tradable.length} ตัวในตี้แล้ว: ยังไม่มีของที่เพื่อนตี้ใส่ดีกว่า`;
        if (manual || !rt.lastGearShareNote) rt.lastGearShareNote = msg;
        return { ok: true, traded: 0, matches: 0, message: msg };
      }

      // Group claims by (senderId -> receiverId) pair and pick the highest-priority ready pair (1 trade per check)
      const byPair = new Map();
      for (const cl of allClaims) {
        const pk = `${cl.senderId}->${cl.receiverId}`;
        if (!byPair.has(pk)) byPair.set(pk, { senderId: cl.senderId, senderName: cl.senderName, receiverId: cl.receiverId, receiverName: cl.receiverName, claims: [], maxPriority: 0 });
        const grp = byPair.get(pk);
        grp.claims.push(cl.item);
        if ((cl.item.priority || 0) > grp.maxPriority) grp.maxPriority = cl.item.priority || 0;
      }

      const pairs = [...byPair.values()].sort((a, b) => b.maxPriority - a.maxPriority);
      if (!rt.gearSharePairAt || typeof rt.gearSharePairAt !== 'object') rt.gearSharePairAt = {};
      const readyPair = pairs.find(pr => {
        if (manual) return true;
        const pk = `${pr.senderId}->${pr.receiverId}`;
        return (now() - (rt.gearSharePairAt[pk] || 0)) >= T.gearSharePairCooldownMs;
      });

      if (!readyPair) {
        const top = pairs[0];
        const msg = `🛡️ ล็อกของให้เพื่อนไว้แล้ว ${allClaims.length} ชิ้น (รอคูลดาวน์เทรด ${top.senderName} → ${top.receiverName})`;
        if (manual) rt.lastGearShareNote = msg;
        return { ok: true, traded: 0, matches: allClaims.length, message: msg };
      }

      const senderP = profiles.get(readyPair.senderId);
      const receiverP = profiles.get(readyPair.receiverId);
      if (!senderP || !receiverP) return { ok: false, error: 'missing-profile' };

      const batch = readyPair.claims.sort((a, b) => (b.priority || 0) - (a.priority || 0)).slice(0, 4);
      const copyUids = batch.map(x => Number(x.u));
      const labels = batch.map(x => `${x.name}${x.ref > 0 ? ' +' + x.ref : ''}`);
      const pairKey = `${readyPair.senderId}->${readyPair.receiverId}`;
      rt.gearSharePairAt[pairKey] = now();
      rt.lastGearShareNote = `🤝 กำลังเทรด ${labels.join(', ')} (${readyPair.senderName} → ${readyPair.receiverName})...`;

      // Start receiver listener slightly before sender sends `ask` so no event is ever missed!
      const recvPromise = act(receiverP, ACTIONS.tradeReceive(readyPair.senderName), 'party-gear-recv', 45000);
      await sleep(300);
      const sendPromise = act(senderP, ACTIONS.tradeSend(readyPair.receiverName, copyUids), 'party-gear-send', 45000);
      const [sendRes, recvRes] = await Promise.all([sendPromise, recvPromise]);

      const sendOk = Boolean(sendRes && sendRes.ok && sendRes.result && sendRes.result.ok);
      const recvOk = Boolean(recvRes && recvRes.ok && recvRes.result && recvRes.result.ok);
      if (sendOk && recvOk) {
        // Clear traded UIDs from sender's protected list
        const remaining = (protectedBySender.get(readyPair.senderId) || []).filter(u => !copyUids.includes(u));
        await act(senderP, ACTIONS.setProtectedGearUids(remaining), 'gear-share-unprotect', 5000);
        const msg = `🎁 เทรดสำเร็จ: ${readyPair.senderName} → ${readyPair.receiverName} (${labels.join(', ')})`;
        rt.lastGearShareNote = msg;
        log('gear-share-ok', msg);
        return { ok: true, traded: batch.length, matches: allClaims.length, from: readyPair.senderName, to: readyPair.receiverName, items: labels, message: msg };
      }

      const errTxt = (sendRes?.result?.error || sendRes?.error || recvRes?.result?.error || recvRes?.error || 'ไม่สำเร็จ');
      const msg = `⚠️ เทรด ${readyPair.senderName} → ${readyPair.receiverName} ไม่สำเร็จ (${errTxt}) · ล็อกของไว้ให้แล้ว`;
      rt.lastGearShareNote = msg;
      log('gear-share-fail', msg);
      return { ok: false, traded: 0, matches: allClaims.length, error: errTxt, message: msg };
    } finally {
      rt.sharingGear = false;
      rt.gearShareAt = now();
    }
  }

  // Bring everyone onto the Anchor's CH (Priest when present on the farm map, otherwise Leader):
  // 1. On first arrival at a farm map (rt.settledMapId !== anchorSnap.mapId), the Anchor checks once for the
  //    least-crowded channel and locks rt.settledMapId + rt.settledChannel so it NEVER loops switching channels.
  // 2. Moves members (including Leader when Priest is Anchor, and independent 'none' members) to that locked CH.
  // 3. If a member can't enter that CH (full 40/40), the Anchor moves to the least-crowded CH and updates rt.settledChannel.
  async function gatherChannels(party, profiles, anchorId, anchorSnap, movers, needsInitialChannelCheck, allPartyNames, avoidChannels = []) {
    const rt = prt(party.id);
    rt.gathering = true; rt.gatherAt = now();
    const anchorP = profiles.get(anchorId) || profiles.get(party.leaderId);
    const anchorLabel = (priestLabel => priestLabel ? 'พระ (' + anchorSnap.name + ')' : 'หัวตี้')(isPriestClass(anchorSnap && anchorSnap.classId));
    const avoidList = Array.isArray(avoidChannels) ? avoidChannels : [];
    const moveAll = async (ids, ch) => {
      for (const id of ids) {
        if (!parties.includes(party)) return { ok: false, aborted: true };
        const S = states.get(id);
        if (isAutoFarmProtected(id, S)) continue;
        const nm = (S && S.name) || id;
        if (S && S.channel === ch) continue;
        rt.gatherNote = nm + ' กำลังย้ายไป CH ' + ch + ' (รอคูลดาวน์/ที่ว่างให้เอง)';
        const r = await act(profiles.get(id), ACTIONS.moveChannelWait(ch, T.memberMoveWaitMs), 'move-ch', T.memberMoveWaitMs + 10000);
        if (!(r.ok && r.result && r.result.success)) {
          return {
            ok: false,
            who: nm,
            whoId: id,
            blockedCooldown: Boolean(r.result && r.result.blockedCooldown),
            cooldownLeftMs: Number(r.result && r.result.cooldownLeftMs) || 0,
            blockedShut: Boolean(r.result && r.result.blockedShut),
            blockedBusy: Boolean(r.result && r.result.blockedBusy),
            noSuchChannel: Boolean(r.result && r.result.noSuchChannel),
            blockedPk: Boolean(r.result && r.result.blockedPk),
            error: (r.result && r.result.error) || r.error
          };
        }
      }
      return { ok: true };
    };
    try {
      let targetCh = (rt.settledMapId === anchorSnap.mapId && typeof rt.settledChannel === 'number')
        ? rt.settledChannel
        : anchorSnap.channel;

      // Step 1: Least-crowded & non-overlapping channel selection upon entering a farm map (or when overlapping another party)
      if (needsInitialChannelCheck && anchorP && anchorSnap && anchorSnap.botRunning !== false && anchorSnap.mapId) {
        rt.gatherNote = anchorLabel + ' กำลังสแกนหา CH ที่คนน้อยสุด (และไม่ทับ CH ปาร์ตี้อื่น)';
        const localAvoid = avoidList.slice();
        const onlyForOverlap = Boolean(!anchorSnap.pkChannel && rt.settledMapId === anchorSnap.mapId);
        let hitAnchorCooldown = false;
        for (let attempt = 0; attempt < 2; attempt++) {
          let wantCh = null;
          if (anchorSnap.helpers && anchorSnap.helpers.evaluateAnchorChannel) {
            const ev = await act(anchorP, ACTIONS.evaluateAnchorChannel(1 + party.memberIds.length, allPartyNames || [], localAvoid), 'eval-anchor-ch', 12000);
            if (onlyForOverlap && ev.ok && ev.result && ev.result.currentIsOverlapped === false && !ev.result.currentIsPk && !ev.result.currentIsShut) {
              wantCh = null;
            } else if (ev.ok && ev.result && ev.result.shouldSwitch && typeof ev.result.channel === 'number' && (ev.result.channel !== anchorSnap.channel || anchorSnap.pkChannel) && !localAvoid.includes(ev.result.channel)) {
              wantCh = ev.result.channel;
            }
          }
          if (wantCh == null && !onlyForOverlap && (localAvoid.includes(anchorSnap.channel) || anchorSnap.pkChannel) && anchorSnap.helpers && anchorSnap.helpers.findLeast) {
            const least = await act(anchorP, ACTIONS.leastChannel(localAvoid), 'least-ch-avoid-overlap', 15000);
            const lch = least.ok && least.result ? least.result.channel : null;
            if (typeof lch === 'number' && (lch !== anchorSnap.channel || anchorSnap.pkChannel) && !localAvoid.includes(lch)) {
              wantCh = lch;
            }
          }
          if (typeof wantCh === 'number' && (wantCh !== anchorSnap.channel || anchorSnap.pkChannel)) {
            rt.pendingChannel = wantCh;
            rt.gatherNote = anchorLabel + ' กำลังย้ายไป CH ' + wantCh + ' (คนน้อยสุด / ไม่ทับตี้อื่น)';
            const am = await act(anchorP, ACTIONS.moveChannelWait(wantCh, T.leaderMoveWaitMs), 'anchor-move-ch', T.leaderMoveWaitMs + 10000);
            const realCh = (am.result && typeof am.result.channel === 'number') ? am.result.channel : anchorSnap.channel;
            targetCh = realCh;
            anchorSnap.channel = realCh;
            if (realCh === wantCh) anchorSnap.pkChannel = false;
            if (am.result && am.result.blockedCooldown) {
              hitAnchorCooldown = true;
              rt.channelNote = anchorLabel + ' ' + (am.result.error || 'ติดคูลดาวน์ย้าย CH 5 นาที') + ' — จะย้ายอัตโนมัติเมื่อครบเวลา';
              break;
            }
            const moveBlocked = Boolean(am.result && (am.result.blockedBusy || am.result.blockedShut || am.result.noSuchChannel || am.result.blockedPk));
            if (realCh !== wantCh && moveBlocked) {
              if (!localAvoid.includes(wantCh)) localAvoid.push(wantCh);
              continue;
            }
          } else {
            targetCh = anchorSnap.channel;
          }
          break;
        }
        if (!hitAnchorCooldown || !localAvoid.includes(targetCh)) {
          rt.settledMapId = anchorSnap.mapId;
          rt.settledChannel = targetCh;
          rt.settledChannelAt = now();
        }
      }

      // Recompute who needs to move to targetCh now
      const LNow = states.get(party.leaderId);
      const inGameNow = new Set(inGameMemberNames(LNow));
      const todoIds = [];
      for (const id of [party.leaderId].concat(party.memberIds)) {
        const S = states.get(id);
        if (!S || !S.ok || !S.name) continue;
        if (id !== party.leaderId && !inGameNow.has(S.name)) continue;
        if (S.botRunning === false || planBlocked(S) || (S.busy && S.busy.length) || !(S.helpers && S.helpers.moveToChannel)) continue;
        if ((S.mapId === anchorSnap.mapId || S.mapId === 'camp') && S.channel !== targetCh) todoIds.push(id);
      }
      for (const id of movers || []) {
        if (!todoIds.includes(id)) {
          const S = states.get(id);
          if (S && S.botRunning !== false && S.channel !== targetCh) todoIds.push(id);
        }
      }

      if (!todoIds.length) { rt.channelNote = null; return; }
      const first = await moveAll(todoIds, targetCh);
      if (first.ok) { rt.channelNote = null; return; }
      if (first.aborted) return;
      if (first.blockedCooldown) {
        rt.channelNote = first.who + ' ' + (first.error || 'ติดคูลดาวน์ย้าย CH 5 นาที') + ' — จะย้ายตามอัตโนมัติเมื่อครบเวลา';
        return;
      }
      if (now() - rt.fallbackAt < T.fallbackCooldownMs) {
        rt.channelNote = first.who + ' เข้า CH ' + targetCh + ' ไม่ได้ — จะลองใหม่อีกครั้ง';
        return;
      }
      rt.fallbackAt = now();
      rt.gatherNote = first.who + ' เข้า CH ' + targetCh + ' ไม่ได้ — ' + anchorLabel + ' กำลังหา CH ที่คนน้อยสุด';
      const isBlockedTarget = Boolean(first.blockedShut || first.blockedBusy || first.noSuchChannel || first.blockedPk);
      const fallbackAvoid = (isBlockedTarget && !avoidList.includes(targetCh)) ? avoidList.concat([targetCh]) : avoidList.slice();
      const probeP = (first.blockedShut && first.whoId && profiles.get(first.whoId)) ? profiles.get(first.whoId) : anchorP;
      let real = null;
      for (let fbAttempt = 0; fbAttempt < 2; fbAttempt++) {
        const least = await act(probeP, ACTIONS.leastChannel(fallbackAvoid), 'least-ch', 15000);
        const ch = least.ok && least.result ? least.result.channel : null;
        if (typeof ch !== 'number' || ch === targetCh) {
          rt.channelNote = first.who + ' เข้า CH ' + targetCh + ' ไม่ได้ และหา CH ที่ว่างกว่าไม่ได้';
          return;
        }
        rt.gatherNote = anchorLabel + ' กำลังย้ายไป CH ' + ch + ' (คนน้อยสุด)';
        const lm = await act(anchorP, ACTIONS.moveChannelWait(ch, T.leaderMoveWaitMs), 'leader-move-ch', T.leaderMoveWaitMs + 10000);
        real = lm.result && typeof lm.result.channel === 'number' ? lm.result.channel : null;
        const lmBlocked = Boolean(lm.result && (lm.result.blockedBusy || lm.result.blockedShut || lm.result.noSuchChannel || lm.result.blockedPk));
        if ((real == null || real === targetCh) && lmBlocked && !fallbackAvoid.includes(ch)) {
          fallbackAvoid.push(ch);
          continue;
        }
        if (real == null || real === targetCh) {
          rt.channelNote = anchorLabel + ' ย้ายไป CH ' + ch + ' ไม่ได้ — จะลองใหม่ภายหลัง';
          return;
        }
        break;
      }
      rt.settledMapId = anchorSnap.mapId;
      rt.settledChannel = real;
      rt.settledChannelAt = now();
      // Everyone on the farm map follows to where the Anchor really is now
      await refreshStates(true);
      const L2 = states.get(party.leaderId);
      const inGame2 = new Set(inGameMemberNames(L2));
      const follow = [party.leaderId].concat(party.memberIds).filter(id => {
        if (id === anchorId) return false;
        const S = states.get(id);
        return S && S.ok && S.name && S.botRunning !== false && (id === party.leaderId || inGame2.has(S.name)) && !planBlocked(S) && !(S.busy && S.busy.length) && S.helpers && S.helpers.moveToChannel && (S.mapId === anchorSnap.mapId || S.mapId === 'camp') && S.channel !== real;
      });
      const second = await moveAll(follow, real);
      rt.channelNote = second.ok
        ? null
        : (second.aborted ? null : second.who + ' ย้ายตามไป CH ' + real + ' ไม่ได้ — จะลองใหม่อีกครั้ง');
      if (second.ok) log('party', party.id, 'regrouped on CH', real);
    } finally {
      rt.pendingChannel = null;
      rt.gathering = false; rt.gatherNote = null; rt.gatherAt = now();
    }
  }

  async function gatherSoloChannel(id, P, S, avoidChannels = [], targetMapId = null) {
    const rt = srt(id);
    rt.moving = true;
    rt.gatherAt = now();
    const avoidList = Array.isArray(avoidChannels) ? avoidChannels : [];
    const localAvoid = avoidList.slice();
    const effectiveMapId = targetMapId || S.mapId;
    const hasPendingSpread = Boolean(S.pendingChannelSpread && Number(S.pendingChannelSpread.avoidChannel) === Number(S.channel));
    if (hasPendingSpread && typeof S.channel === 'number' && !localAvoid.includes(S.channel)) {
      localAvoid.push(S.channel);
    }
    const onlyForOverlap = Boolean(!S.pkChannel && !hasPendingSpread && rt.settledMapId === effectiveMapId);
    const prevCh = S.channel;
    let hitCooldown = false;
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        let wantCh = null;
        if (S.helpers && S.helpers.evaluateAnchorChannel) {
          const ev = await act(P, ACTIONS.evaluateAnchorChannel(1, S.name ? [S.name] : [], localAvoid, targetMapId), 'eval-solo-ch', 12000);
          if (onlyForOverlap && ev.ok && ev.result && ev.result.currentIsOverlapped === false && !ev.result.currentIsPk && !ev.result.currentIsShut) {
            wantCh = null;
          } else if (ev.ok && ev.result && ev.result.shouldSwitch && typeof ev.result.channel === 'number' && (ev.result.channel !== S.channel || S.pkChannel) && !localAvoid.includes(ev.result.channel)) {
            wantCh = ev.result.channel;
          }
        }
        if (wantCh == null && (!onlyForOverlap || hasPendingSpread) && (localAvoid.includes(S.channel) || S.pkChannel) && S.helpers && S.helpers.findLeast) {
          const least = await act(P, ACTIONS.leastChannel(localAvoid, targetMapId), 'least-ch-solo-avoid', 15000);
          const lch = least.ok && least.result ? least.result.channel : null;
          if (typeof lch === 'number' && (lch !== S.channel || S.pkChannel) && !localAvoid.includes(lch)) {
            wantCh = lch;
          }
        }
        if (typeof wantCh === 'number' && (wantCh !== S.channel || S.pkChannel)) {
          rt.pendingChannel = wantCh;
          const am = await act(P, ACTIONS.moveChannelWait(wantCh, T.leaderMoveWaitMs), 'solo-move-ch', T.leaderMoveWaitMs + 10000);
          const realCh = (am.result && typeof am.result.channel === 'number') ? am.result.channel : S.channel;
          S.channel = realCh;
          if (realCh === wantCh) {
            S.pkChannel = false;
            S.pendingChannelSpread = null;
            log('solo-ch-spread', S.name || id, 'CH', prevCh, '->', realCh, targetMapId ? ('in-camp-for:' + targetMapId) : ('on:' + S.mapId));
          }
          if (am.result && am.result.blockedCooldown) {
            hitCooldown = true;
            S.channelCooldownLeftMs = Number(am.result.cooldownLeftMs) || 30000;
            break;
          }
          const moveBlocked = Boolean(am.result && (am.result.blockedBusy || am.result.blockedShut || am.result.noSuchChannel || am.result.blockedPk));
          if (realCh !== wantCh && moveBlocked) {
            if (!localAvoid.includes(wantCh)) localAvoid.push(wantCh);
            continue;
          }
        }
        break;
      }
      if (!hitCooldown && effectiveMapId && typeof S.channel === 'number' && !S.pkChannel && !localAvoid.includes(S.channel)) {
        rt.settledMapId = effectiveMapId;
        rt.settledChannel = S.channel;
        rt.settledChannelAt = now();
      }
      if (!hitCooldown && avoidList.includes(S.channel) && S.channel === prevCh) {
        rt.lastNoFreeChannelAt = now();
      } else {
        rt.lastNoFreeChannelAt = 0;
      }
    } finally {
      rt.pendingChannel = null;
      rt.moving = false;
      rt.gatherAt = now();
    }
  }

  async function tickSoloProfiles(profiles) {
    const chMode = typeof getChannelCheckMode === 'function' ? (getChannelCheckMode() || 'no_overlap') : 'no_overlap';
    const taken = assignedIds(parties);
    for (const [id, P] of profiles.entries()) {
      if (taken.has(id)) continue;
      const S = states.get(id);
      if (isAutoFarmProtected(id, S)) continue;
      if (!P || !S || !S.ok || !S.name) continue;
      // CRITICAL: If this profile is NOT assigned to any Manager party, clear any stale client `__pmPartySync` / `__ncPendingPartyLeader`
      // so the bot NEVER hallucinates a phantom Manager party or sends unrequested invites!
      if (S.hasPmPartySync && S.helpers && S.helpers.updatePartySyncState) {
        const clr = await act(P, ACTIONS.syncClientPartyState(null), 'clear-stale-party-sync');
        if (clr && clr.ok) S.hasPmPartySync = false;
      }
      const rt = srt(id);
      const onFarm = isSoloActivelyFarmingMap(S);
      const inCampWithTarget = Boolean(
        !onFarm &&
        S.botRunning !== false &&
        S.mapId === 'camp' &&
        S.targetMap &&
        !isAutoMapToken(S.targetMap) &&
        !isCityMapName(S.targetMap)
      );
      const campTargetMapId = inCampWithTarget && /^[a-z0-9_]+$/i.test(String(S.targetMap).trim())
        ? String(S.targetMap).trim().toLowerCase()
        : null;
      const cooldownLeftMs = Number(S.channelCooldownLeftMs) || 0;
      const coolingDown = cooldownLeftMs > 12000;
      const hasPendingSpread = Boolean(S.pendingChannelSpread && Number(S.pendingChannelSpread.avoidChannel) === Number(S.channel));

      const syncAvoidInfo = getAvoidChannelsForSolo(
        id,
        profiles,
        onFarm ? S.mapId : campTargetMapId,
        onFarm ? S.mapName : S.targetMap
      );
      const isOverlapped = Boolean((onFarm || inCampWithTarget) && typeof S.channel === 'number' && syncAvoidInfo.avoidChannels.includes(S.channel));

      if (!onFarm) {
        const swCamp = S.lastPostSellChannelSwitch;
        const freshCampSettlement = Boolean(
          inCampWithTarget &&
          campTargetMapId &&
          !S.pkChannel &&
          typeof S.channel === 'number' &&
          swCamp &&
          swCamp.mapId === campTargetMapId &&
          swCamp.channel === S.channel &&
          typeof swCamp.at === 'number' &&
          (now() - swCamp.at <= 120000) &&
          !isOverlapped &&
          !hasPendingSpread
        );
        if (freshCampSettlement) {
          rt.settledMapId = campTargetMapId;
          rt.settledChannel = S.channel;
          rt.settledChannelAt = swCamp.at;
          rt.lastSwitchSeenAt = Math.max(rt.lastSwitchSeenAt || 0, swCamp.at);
        }
        const keepCampReservation = Boolean(
          inCampWithTarget &&
          rt.settledMapId &&
          (!campTargetMapId || rt.settledMapId === campTargetMapId) &&
          typeof rt.settledChannel === 'number' &&
          rt.settledChannel === S.channel &&
          !isOverlapped &&
          !hasPendingSpread
        );
        if (!keepCampReservation && (!S.mapId || isCityMapName(S.mapName))) {
          rt.settledMapId = null;
          rt.settledChannel = null;
          rt.settledChannelAt = 0;
        }
      } else if (!S.pkChannel && typeof S.channel === 'number') {
        const sw = S.lastPostSellChannelSwitch;
        const swAt = (sw && sw.channel === S.channel && (!sw.mapId || sw.mapId === S.mapId) && typeof sw.at === 'number') ? sw.at : 0;
        const swFreshForThisMap = Boolean(swAt && (now() - swAt <= 150000) && !isOverlapped && !hasPendingSpread);
        if ((swAt && swAt > (rt.lastSwitchSeenAt || 0)) || (swFreshForThisMap && rt.settledMapId !== S.mapId)) {
          rt.lastSwitchSeenAt = Math.max(rt.lastSwitchSeenAt || 0, swAt);
          if (!isOverlapped && !hasPendingSpread) {
            rt.settledMapId = S.mapId;
            rt.settledChannel = S.channel;
            rt.settledChannelAt = swAt;
          }
        } else if (chMode !== 'no_overlap' && !hasPendingSpread && (rt.settledMapId !== S.mapId || rt.settledChannel !== S.channel)) {
          rt.settledMapId = S.mapId;
          rt.settledChannel = S.channel;
          rt.settledChannelAt = swAt || now();
        } else if (rt.settledMapId === S.mapId && rt.settledChannel !== S.channel && !rt.moving && !isOverlapped && !hasPendingSpread) {
          rt.settledChannel = S.channel;
          rt.settledChannelAt = swAt || now();
        }
      }

      if (S.helpers && S.helpers.updateSoloAvoidState) {
        const soloAvoidPayload = {
          soloMapId: onFarm ? S.mapId : campTargetMapId,
          soloMapName: (onFarm ? S.mapName : S.targetMap) || null,
          avoidChannels: syncAvoidInfo.avoidChannels,
          otherPartyChannelsByMap: syncAvoidInfo.otherPartyChannelsByMap,
          channelCheckMode: chMode
        };
        const soloSig = !opts.timing ? JSON.stringify(soloAvoidPayload) : '';
        if (opts.timing || rt.lastAvoidPushSig !== soloSig || S.channelCheckMode !== chMode || (now() - (rt.lastAvoidPushAt || 0) >= 25000)) {
          const soloRes = await act(P, ACTIONS.syncSoloAvoidState(soloAvoidPayload), 'sync-solo-avoid');
          if (soloRes && soloRes.ok) {
            rt.lastAvoidPushSig = soloSig;
            rt.lastAvoidPushAt = now();
          }
        }
      }

      if (chMode === 'off' || chMode === 'party_only') continue;

      const shouldOrchestrateSolo = Boolean(
        S.botRunning !== false &&
        (onFarm || (inCampWithTarget && campTargetMapId)) &&
        !planBlocked(S) &&
        !isBusy() &&
        (chMode === 'no_overlap' || hasPendingSpread)
      );
      if (shouldOrchestrateSolo) {
        // Respect ANY manual in-game party (leader OR member): never channel-hop away from your manual in-game teammates!
        const inManualInGameParty = Boolean(S.party && Array.isArray(S.party.members) && S.party.members.length > 1);
        const busyNow = Array.isArray(S.busy) && S.busy.length > 0;
        const evalMapId = onFarm ? S.mapId : campTargetMapId;
        if ((!inManualInGameParty || S.pkChannel) && !busyNow && !rt.moving) {
          // NEVER disturb combat while Nightcamp's 5-min channel-move cooldown is still active;
          // leave unsettled so the very first tick after the 5-min cooldown expires immediately spreads!
          if (coolingDown) {
            continue;
          }
          const needsInitialCheck = chMode === 'no_overlap' && rt.settledMapId !== evalMapId && Boolean(S.helpers && S.helpers.evaluateAnchorChannel);
          const noFreeCooldownOk = !rt.lastNoFreeChannelAt || (now() - rt.lastNoFreeChannelAt >= T.gatherCooldownMs);
          if ((S.pkChannel || hasPendingSpread || (isOverlapped && noFreeCooldownOk) || needsInitialCheck) && (S.helpers && (S.helpers.evaluateAnchorChannel || S.helpers.findLeast)) && S.helpers.moveToChannel) {
            if (S.pkChannel || hasPendingSpread || isOverlapped || now() - (rt.gatherAt || 0) >= T.gatherCooldownMs) {
              await gatherSoloChannel(id, P, S, syncAvoidInfo.avoidChannels, onFarm ? null : campTargetMapId);
            }
          } else if (rt.settledMapId !== evalMapId && typeof S.channel === 'number' && !S.pkChannel && !isOverlapped && !hasPendingSpread) {
            rt.settledMapId = evalMapId;
            rt.settledChannel = S.channel;
            rt.settledChannelAt = now();
          }
        }
      }
    }
  }

  const shouldAutoReconcile = opts.autoReconcileInGame !== false && !opts.timing;

  async function tick() {
    if (ticking) return;
    const chMode = typeof getChannelCheckMode === 'function' ? (getChannelCheckMode() || 'no_overlap') : 'no_overlap';
    if (!parties.length && !shouldAutoReconcile && chMode === 'off') return;
    if (isBusy()) return;
    ticking = true;
    try {
      await refreshStates(true);
      const profiles = profileMap();
      if (shouldAutoReconcile) reconcileInGameParties(profiles);
      for (const party of parties.slice()) {
        if (!parties.includes(party)) continue;
        try { await tickParty(party, profiles); } catch (e) { log('tick error', party.id, e.message); prt(party.id).notes = ['ผิดพลาด: ' + e.message]; }
      }
      try { await tickSoloProfiles(profiles); } catch (e) { log('solo tick error', e.message); }
    } finally { ticking = false; }
  }

  function memberView(party, id, profiles, leaderSnap) {
    const P = profiles.get(id), S = states.get(id);
    const inGame = new Set(inGameMemberNames(leaderSnap));
    const priest = findPartyPriest(party, profiles, states);
    const anchorSnap = (priest && priest.snap && priest.snap.ok && priest.snap.mapId && !isCityMapName(priest.snap.mapName)) ? priest.snap : leaderSnap;
    const rt = prt(party.id);
    const targetCh = (anchorSnap && rt && rt.settledMapId === anchorSnap.mapId && typeof rt.settledChannel === 'number') ? rt.settledChannel : (anchorSnap && anchorSnap.channel);
    const ft = id === party.leaderId ? { mode: 'none', targetId: null, targetName: null } : resolveFollowTarget(party, id, profiles, states);
    let status = 'offline', text = 'ออฟไลน์';
    if (isAutoFarmProtected(id, S)) {
      status = 'plan';
      text = '💎 กำลังรันฟาร์มเพชร (พักตี้ชั่วคราว)';
    } else if (S && S.ok && S.name) {
      if (inGame.has(S.name)) {
        const same = anchorSnap && S.mapId === anchorSnap.mapId && S.channel === targetCh;
        status = same ? 'joined' : 'apart';
        if (same && S.priestBuffingTarget) {
          text = 'เดินไปบัฟ ' + S.priestBuffingTarget;
        } else if (same && S.returningToPriest && priest) {
          text = 'เดินไปรับบัฟพระ (' + priest.name + ')';
        } else if (same && ft.isAnchorPriest) {
          text = 'พระหลัก (ศูนย์กลางตี้)';
        } else if (same && ft.mode !== 'none' && S.follow && (!ft.targetName || S.follow === ft.targetName)) {
          text = ft.viaPriest ? ('ตามพระ (' + ft.targetName + ')') : (ft.mode === 'leader' ? 'ตามหัวตี้' : ('ตาม ' + (ft.targetName || S.follow)));
        } else {
          text = same ? 'อยู่ด้วยกัน' : (S.mapId !== (anchorSnap && anchorSnap.mapId) ? 'กำลังไปแมพตี้' : 'กำลังย้าย CH');
        }
        if (!same && planBlocked(S)) { status = 'plan'; text = 'แผนกำลังทำงาน (' + (planBlockReason(S) || 'ตามแผน') + ')'; }
      } else if (S.party && leaderSnap && S.party.leader !== leaderSnap.name) { status = 'other'; text = 'อยู่ตี้อื่น'; }
      else if (leaderSnap && leaderSnap.party && Array.isArray(leaderSnap.party.members) && leaderSnap.party.members.length >= (leaderSnap.party.maxMembers || MAX_MEMBERS)) {
        status = 'apart'; text = 'ตี้เต็ม (มีคนนอก)';
      }
      else { status = 'inviting'; text = 'กำลังชวน'; }
    } else if (S && S.reason === 'not-in-game') { status = 'offline'; text = 'ยังไม่เข้าเกม'; }
    const noLoot = Boolean(Array.isArray(party.noLootIds) && party.noLootIds.includes(String(id)));
    const autoFarmMode = normalizeAutoFarmMode(party.autoModes && party.autoModes[id]);
    return {
      id, profileName: P ? P.name : id, charName: (S && S.name) || (P && P.lastCharName) || null,
      charClass: (S && S.classId) || (P ? P.lastCharClass || null : null), level: S && S.level, mapName: S && S.mapName, channel: S && S.channel,
      followMode: ft.isAnchorPriest ? 'leader' : ft.mode, followTargetId: ft.targetId, followTargetName: ft.targetName, following: (S && S.follow) || null,
      noLoot,
      autoFarmMode,
      effectiveAutoFarmMode: (S && S.effectiveAutoFarmMode) || (autoFarmMode === 'auto' ? 'farm' : autoFarmMode),
      isSupportJob: Boolean(S && S.isSupportJob),
      status, statusText: text
    };
  }

  function view() {
    const profiles = profileMap();
    const taken = assignedIds(parties);
    const list = parties.map((p, i) => {
      const L = states.get(p.leaderId);
      const rt = prt(p.id);
      const assignedNames = new Set(p.memberIds.map(id => (states.get(id) && states.get(id).name) || (profiles.get(id) && profiles.get(id).lastCharName)).filter(Boolean));
      const outsiders = (L && L.party && L.party.leader === L.name && Array.isArray(L.party.members))
        ? L.party.members.filter(m => m && m.name && m.name !== L.name && !assignedNames.has(m.name)).map(m => m.name)
        : [];
      return {
        id: p.id, index: i + 1, expMode: p.expMode, lootMode: p.lootMode, groupMode: p.groupMode || 'g', syncMap: p.syncMap, autoFill: p.autoFill,
        priestFlow: Boolean(p.priestFlow === true),
        shareGear: Boolean(p.shareGear === true),
        sharingGear: Boolean(rt.sharingGear),
        lastGearShareNote: rt.lastGearShareNote || null,
        followModes: p.followModes || {},
        autoModes: p.autoModes || {},
        noLootIds: Array.isArray(p.noLootIds) ? p.noLootIds : [],
        leader: Object.assign(
          memberView(p, p.leaderId, profiles, L),
          (!isAutoFarmProtected(p.leaderId, L) && L && L.ok)
            ? { status: 'leader', statusText: L.party && L.party.leader === L.name ? 'หัวตี้' : 'หัวตี้ (ยังไม่มีสมาชิก)' }
            : {}
        ),
        members: p.memberIds.map(id => memberView(p, id, profiles, L)),
        outsiders,
        count: 1 + p.memberIds.length, max: MAX_MEMBERS,
        inGame: L && L.party ? { expMode: L.party.expMode, lootMode: L.party.lootMode, groupMode: L.party.groupMode || 'g', evenShareAllowed: L.party.evenShareAllowed, levelRange: L.party.levelRange, size: L.party.members.length } : null,
        notes: rt.notes || [], lastTickAt: rt.lastTickAt
      };
    });
    const inGameParties = detectInGameManualParties(profiles);
    const clients = [...profiles.values()].map(p => {
      const S = states.get(p.id);
      return { id: p.id, name: p.name, charName: (S && S.name) || p.lastCharName || null, charClass: (S && S.classId) || p.lastCharClass || null,
        level: S && S.ok ? S.level : null, online: !!(S && S.ok && S.name), inGameParty: !!(S && S.party),
        inGamePartyLeader: (S && S.party && S.party.leader) || null,
        inGamePartySize: (S && S.party && Array.isArray(S.party.members)) ? S.party.members.length : 0,
        assigned: taken.has(p.id),
        autoFarmProtected: isAutoFarmProtected(p.id, S),
        noLoot: Boolean(S && S.noLootMode),
        planPending: planBlocked(S) ? planBlockReason(S) : null,
        mapName: S && S.mapName, channel: S && S.channel };
    });
    const channelCheckMode = typeof getChannelCheckMode === 'function' ? (getChannelCheckMode() || 'all') : 'all';
    return { success: true, parties: list, inGameParties, clients, statesAt, maxMembers: MAX_MEMBERS, channelCheckMode };
  }

  async function disband(party) {
    const profiles = profileMap();
    for (const id of [party.leaderId].concat(party.memberIds || [])) {
      const P = profiles.get(id), S = states.get(id);
      if (isAutoFarmProtected(id, S)) continue;
      if (P && S && S.ok && S.helpers && S.helpers.updatePartySyncState) {
        await act(P, ACTIONS.syncClientPartyState(null), 'clear-party-sync');
      }
      if (P && S && S.ok && S.noLootMode) {
        const r = await act(P, ACTIONS.setNoLoot(false), 'clear-noloot');
        if (r.ok) S.noLootMode = false;
      }
      if (P && S && S.ok) {
        await act(P, ACTIONS.setProtectedGearUids([]), 'clear-protected-gear');
      }
    }
    let leaderName = null;
    // Members first (otherwise the game hands leadership to a member and the party lives on), then the leader.
    // The server drops rapid back-to-back party changes, so space them out and retry a few rounds.
    for (let round = 0; round < 4; round++) {
      await refreshStates(true);
      const L = states.get(party.leaderId);
      if (isAutoFarmProtected(party.leaderId, L)) return;
      if (L && L.name) leaderName = L.name;
      if (!leaderName) return;
      const stillIn = party.memberIds.filter(id => { const S = states.get(id); return !isAutoFarmProtected(id, S) && S && S.ok && S.party && S.party.leader === leaderName; });
      const leaderLeads = L && L.ok && L.party && L.party.leader === leaderName;
      if (!stillIn.length && !leaderLeads) return;
      for (const id of stillIn) { await act(profiles.get(id), ACTIONS.leave(), 'disband-leave'); await sleep(T.disbandGapMs); }
      if (leaderLeads && !stillIn.length) { await act(profiles.get(party.leaderId), ACTIONS.leave(), 'disband-leader'); await sleep(T.disbandGapMs); }
    }
  }

  async function applyProfileNoLoot(profileId, wantNoLoot) {
    const pid = String(profileId || '').trim();
    const profiles = profileMap();
    const P = profiles.get(pid);
    if (!P) return { ok: false, error: 'ไม่พบโปรไฟล์ที่เลือก' };
    const S = states.get(pid);
    const nextVal = wantNoLoot !== undefined ? Boolean(wantNoLoot) : !(S && S.noLootMode);
    let evalResult = { ok: true };
    if (P.debugPort) {
      evalResult = await act(P, ACTIONS.setNoLoot(nextVal), 'set-noloot');
    }
    if (S) S.noLootMode = nextVal;
    for (const p of parties) {
      if (p.leaderId === pid || p.memberIds.includes(pid)) {
        if (!Array.isArray(p.noLootIds)) p.noLootIds = [];
        if (nextVal) {
          if (!p.noLootIds.includes(pid)) p.noLootIds.push(pid);
        } else {
          p.noLootIds = p.noLootIds.filter(x => x !== pid);
        }
      }
    }
    save();
    return { ok: true, profileId: pid, noLoot: nextVal, evalOk: Boolean(evalResult && evalResult.ok) };
  }

  async function handleRoute(req, res, pathname, sendJSON) {
    if (!pathname.startsWith('/api/parties')) return false;
    if (pathname === '/api/parties' && req.method === 'GET') {
      await refreshStates(false);
      if (shouldAutoReconcile) reconcileInGameParties(profileMap());
      sendJSON(view());
      return true;
    }
    if (pathname === '/api/parties/toggle-noloot' && req.method === 'POST') {
      const body = (await readBody(req)) || {};
      const r = await applyProfileNoLoot(body.profileId, body.noLoot);
      if (!r.ok) { sendJSON({ success: false, error: r.error || 'สลับโหมดเก็บของไม่สำเร็จ' }, 400); return true; }
      sendJSON(Object.assign(view(), { noLootResult: r }));
      return true;
    }
    if (pathname === '/api/parties/adopt-ingame' && req.method === 'POST') {
      const body = (await readBody(req)) || {};
      const leaderId = body && String(body.leaderId || '');
      const profiles = profileMap();
      const taken = assignedIds(parties);
      if (!leaderId || !profiles.has(leaderId)) { sendJSON({ success: false, error: 'ไม่พบจอหัวตี้ที่เลือก' }, 400); return true; }
      if (taken.has(leaderId)) { sendJSON({ success: false, error: 'จอนี้อยู่ในปาร์ตี้ของ Manager แล้ว' }, 409); return true; }
      const rawMembers = Array.isArray(body.memberIds) ? body.memberIds.map(String) : [];
      const memberIds = rawMembers.filter(id => id && id !== leaderId && profiles.has(id) && !taken.has(id)).slice(0, MAX_MEMBERS - 1);
      const party = sanitizeParty({
        id: 'party_' + now().toString(36) + Math.random().toString(36).slice(2, 6),
        leaderId,
        memberIds,
        autoFill: false,
        syncMap: body.syncMap === true,
        priestFlow: false,
        expMode: body.expMode,
        lootMode: body.lootMode,
        groupMode: body.groupMode,
        createdAt: now()
      });
      parties.push(party);
      save();
      setTimeout(() => tick().catch(() => {}), 50);
      sendJSON(Object.assign(view(), { adopted: party.id }));
      return true;
    }
    if (pathname === '/api/parties/leave-ingame' && req.method === 'POST') {
      const body = (await readBody(req)) || {};
      const ids = Array.isArray(body.profileIds) ? body.profileIds.map(String).filter(Boolean) : [];
      const profiles = profileMap();
      // Leave members first, then leader last so the party disbands cleanly
      const ordered = ids.slice().sort((a, b) => {
        const sa = states.get(a), sb = states.get(b);
        const aLead = Boolean(sa && sa.party && (typeof sa.party.isLeader === 'boolean' ? sa.party.isLeader : (sa.party.leader === sa.name)));
        const bLead = Boolean(sb && sb.party && (typeof sb.party.isLeader === 'boolean' ? sb.party.isLeader : (sb.party.leader === sb.name)));
        return (aLead ? 1 : 0) - (bLead ? 1 : 0);
      });
      for (const id of ordered) {
        const P = profiles.get(id);
        if (!P || !P.debugPort) continue;
        await act(P, ACTIONS.syncClientPartyState(null), 'leave-ig-clear-sync');
        await act(P, ACTIONS.leave(), 'leave-ig');
        await sleep(400);
      }
      await refreshStates(true);
      sendJSON(Object.assign(view(), { leftCount: ordered.length }));
      return true;
    }
    if (pathname === '/api/parties' && req.method === 'POST') {
      const body = (await readBody(req)) || {};
      const leaderId = body && String(body.leaderId || '');
      const profiles = profileMap();
      const taken = assignedIds(parties);
      if (!leaderId || !profiles.has(leaderId)) { sendJSON({ success: false, error: 'ไม่พบจอที่เลือกเป็นหัวตี้' }, 400); return true; }
      if (taken.has(leaderId)) { sendJSON({ success: false, error: 'จอนี้อยู่ในตี้อื่นแล้ว' }, 409); return true; }
      const initialMembers = Array.isArray(body.memberIds)
        ? body.memberIds.map(String).filter(id => id && id !== leaderId && profiles.has(id) && !taken.has(id))
        : [];
      const party = sanitizeParty({ id: 'party_' + now().toString(36) + Math.random().toString(36).slice(2, 6), leaderId,
        memberIds: initialMembers, autoFill: body.autoFill, syncMap: body.syncMap, priestFlow: body.priestFlow, followModes: body.followModes,
        expMode: body.expMode, lootMode: body.lootMode, groupMode: body.groupMode, createdAt: now() });
      parties.push(party);
      save();
      setTimeout(() => tick().catch(() => {}), 50);
      sendJSON(Object.assign(view(), { created: party.id }));
      return true;
    }
    const m = pathname.match(/^\/api\/parties\/([^/]+)\/(settings|add-member|remove-member|kick-outsiders|share-gear-now|summon|delete)$/);
    if (!m || req.method !== 'POST') return false;
    const party = parties.find(p => p.id === m[1]);
    if (!party) { sendJSON({ success: false, error: 'ไม่พบตี้นี้' }, 404); return true; }
    const body = (await readBody(req)) || {};
    if (m[2] === 'settings') {
      if (body.expMode !== undefined) { if (!EXP_MODES.includes(body.expMode)) { sendJSON({ success: false, error: 'โหมด EXP ไม่ถูกต้อง' }, 400); return true; } party.expMode = body.expMode; }
      if (body.lootMode !== undefined) { if (!LOOT_MODES.includes(body.lootMode)) { sendJSON({ success: false, error: 'โหมดไอเทมไม่ถูกต้อง' }, 400); return true; } party.lootMode = body.lootMode; }
      if (body.groupMode !== undefined) { if (!GROUP_MODES.includes(body.groupMode)) { sendJSON({ success: false, error: 'โหมดออโต้ในตี้ไม่ถูกต้อง' }, 400); return true; } party.groupMode = body.groupMode; }
      if (body.syncMap !== undefined) party.syncMap = !!body.syncMap;
      if (body.autoFill !== undefined) party.autoFill = !!body.autoFill;
      if (body.priestFlow !== undefined) party.priestFlow = !!body.priestFlow;
      if (body.shareGear !== undefined) party.shareGear = !!body.shareGear;
      if (body.memberAutoMode && typeof body.memberAutoMode === 'object') {
        const pidTarget = String(body.memberAutoMode.profileId || '');
        const validIds = [party.leaderId].concat(party.memberIds || []);
        if (!validIds.includes(pidTarget)) { sendJSON({ success: false, error: 'จอนี้ไม่ได้อยู่ในตี้' }, 400); return true; }
        if (!party.autoModes) party.autoModes = {};
        const am = normalizeAutoFarmMode(body.memberAutoMode.mode);
        if (am === 'auto') delete party.autoModes[pidTarget];
        else party.autoModes[pidTarget] = am;
        party.autoModes = sanitizeAutoModes(party);
        const profiles = profileMap();
        const P = profiles.get(pidTarget), S = states.get(pidTarget);
        if (P && P.debugPort) {
          const r = await act(P, ACTIONS.setAutoFarmMode(am), 'set-auto-mode');
          if (r.ok && S) {
            S.autoFarmMode = am;
            if (r.result && r.result.effectiveMode) S.effectiveAutoFarmMode = r.result.effectiveMode;
          }
        }
      }
      if (body.followModes && typeof body.followModes === 'object') {
        party.followModes = Object.assign({}, party.followModes || {}, body.followModes);
        party.followModes = sanitizeFollowModes(party);
      }
      if (body.memberNoLoot && typeof body.memberNoLoot === 'object') {
        await applyProfileNoLoot(body.memberNoLoot.profileId, body.memberNoLoot.noLoot);
      }
      if (body.memberFollow && typeof body.memberFollow === 'object') {
        const mid = String(body.memberFollow.profileId || '');
        if (!party.memberIds.includes(mid)) { sendJSON({ success: false, error: 'จอนี้ไม่ได้อยู่ในตี้' }, 400); return true; }
        if (!party.followModes) party.followModes = {};
        const fm = normalizeFollowMode(body.memberFollow.mode, party, mid);
        if (fm === 'none') delete party.followModes[mid];
        else party.followModes[mid] = fm;
        party.followModes = sanitizeFollowModes(party);
        const profiles = profileMap();
        const P = profiles.get(mid), S = states.get(mid);
        const mState = mrt(party.id, mid);
        mState.unfollowAt = 0; mState.followAt = 0;
        if (P && S && S.ok) {
          if (fm === 'none') {
            if (S.follow) {
              const r = await act(P, ACTIONS.stopFollow(), 'stop-follow');
              if (r.ok) S.follow = null;
            }
          } else {
            const ft = resolveFollowTarget(party, mid, profiles, states);
            if (ft.targetName && S.follow !== ft.targetName) {
              const r = await act(P, ACTIONS.startFollow(ft.targetName), 'start-follow');
              if (r.ok) S.follow = ft.targetName;
            }
          }
        }
      }
      const rt = prt(party.id);
      rt.settingsAt = 0;
      rt.managerSettingsChangedAt = now();
      save();
      setTimeout(() => tick().catch(() => {}), 50);
      sendJSON(view());
      return true;
    }
    if (m[2] === 'add-member') {
      const profiles = profileMap();
      const taken = assignedIds(parties);
      const rawIds = Array.isArray(body.profileIds) ? body.profileIds : (body.profileId ? [body.profileId] : []);
      const ids = rawIds.map(x => String(x || '').trim()).filter(Boolean);
      if (!ids.length) { sendJSON({ success: false, error: 'กรุณาเลือกสมาชิกที่จะเพิ่มเข้าตี้' }, 400); return true; }
      let added = 0;
      for (const id of ids) {
        if (!profiles.has(id)) { if (ids.length === 1) { sendJSON({ success: false, error: 'ไม่พบจอที่เลือก' }, 400); return true; } continue; }
        if (id === party.leaderId || party.memberIds.includes(id)) { if (ids.length === 1) { sendJSON({ success: false, error: 'จอนี้อยู่ในตี้นี้แล้ว' }, 409); return true; } continue; }
        if (taken.has(id)) { if (ids.length === 1) { sendJSON({ success: false, error: 'จอนี้อยู่ในตี้อื่นแล้ว' }, 409); return true; } continue; }
        if (party.memberIds.length >= MAX_MEMBERS - 1) { if (!added) { sendJSON({ success: false, error: 'ตี้นี้เต็มแล้ว (สูงสุด 6 คนรวมหัวตี้)' }, 409); return true; } break; }
        party.excludedIds = party.excludedIds.filter(x => x !== id);
        tempExcluded.delete(party.id + ':' + id);
        memberRt.delete(party.id + ':' + id);
        party.memberIds.push(id);
        taken.add(id);
        if (body.followMode !== undefined) {
          if (!party.followModes) party.followModes = {};
          const fm = normalizeFollowMode(body.followMode, party, id);
          if (fm !== 'none') party.followModes[id] = fm;
        }
        added++;
      }
      party.followModes = sanitizeFollowModes(party);
      save();
      setTimeout(() => tick().catch(() => {}), 50);
      sendJSON(Object.assign(view(), { added }));
      return true;
    }
    if (m[2] === 'remove-member') {
      const id = String(body.profileId || '');
      if (!party.memberIds.includes(id)) { sendJSON({ success: false, error: 'จอนี้ไม่ได้อยู่ในตี้' }, 400); return true; }
      party.memberIds = party.memberIds.filter(x => x !== id);
      if (Array.isArray(party.noLootIds)) party.noLootIds = party.noLootIds.filter(x => x !== id);
      if (party.autoModes && party.autoModes[id]) delete party.autoModes[id];
      party.followModes = sanitizeFollowModes(party);
      party.autoModes = sanitizeAutoModes(party);
      if (!party.excludedIds.includes(id)) party.excludedIds.push(id);
      save();
      const profiles = profileMap();
      const S = states.get(id), L = states.get(party.leaderId);
      if (S && S.ok && S.helpers && S.helpers.updatePartySyncState) {
        await act(profiles.get(id), ACTIONS.syncClientPartyState(null), 'clear-party-sync');
      }
      if (S && S.ok && S.noLootMode) {
        const r = await act(profiles.get(id), ACTIONS.setNoLoot(false), 'clear-noloot');
        if (r.ok) S.noLootMode = false;
      }
      if (S && S.ok) {
        await act(profiles.get(id), ACTIONS.setProtectedGearUids([]), 'clear-protected-gear');
      }
      if (S && S.ok && S.follow) {
        const r = await act(profiles.get(id), ACTIONS.stopFollow(), 'stop-follow');
        if (r.ok) S.follow = null;
      }
      if (S && S.name && L && L.party && L.party.leader === L.name && inGameMemberNames(L).includes(S.name)) {
        await act(profiles.get(party.leaderId), ACTIONS.kick(S.name), 'kick');
      }
      sendJSON(view());
      return true;
    }
    if (m[2] === 'kick-outsiders') {
      const profiles = profileMap();
      const L = states.get(party.leaderId);
      const leaderP = profiles.get(party.leaderId);
      if (!leaderP || !L || !L.ok || !L.party || L.party.leader !== L.name) {
        sendJSON(Object.assign(view(), { success: false, error: 'หัวตี้ไม่ออนไลน์หรือไม่ใช่หัวหน้าปาร์ตี้ในเกม' }));
        return true;
      }
      const assignedNames = new Set(party.memberIds.map(id => (states.get(id) && states.get(id).name) || (profiles.get(id) && profiles.get(id).lastCharName)).filter(Boolean));
      const outsiders = (L.party.members || []).filter(gm => gm && gm.name && gm.name !== L.name && !assignedNames.has(gm.name));
      const kicked = [];
      for (const gm of outsiders) {
        const r = await act(leaderP, ACTIONS.kick(gm.name), 'kick-outsider');
        if (r.ok) kicked.push(gm.name);
      }
      setTimeout(() => tick().catch(() => {}), 400);
      sendJSON(Object.assign(view(), { success: true, kicked }));
      return true;
    }
    if (m[2] === 'share-gear-now') {
      await refreshStates(true);
      const shareResult = await runPartyGearShareCheck(party, profileMap(), true);
      sendJSON(Object.assign(view(), { success: shareResult.ok !== false, shareResult }));
      return true;
    }
    if (m[2] === 'summon') {
      const r = await act(profileMap().get(party.leaderId), ACTIONS.summon(), 'summon');
      sendJSON(Object.assign(view(), { success: r.ok, error: r.ok ? null : 'หัวตี้ออฟไลน์หรือไม่ตอบสนอง' }));
      return true;
    }
    if (m[2] === 'delete') {
      recentlyDisbandedAt.set(party.leaderId, now());
      parties = parties.filter(p => p !== party);
      save();
      try { await disband(party); } catch (e) { log('disband error', e.message); }
      runtime.delete(party.id);
      sendJSON(view());
      return true;
    }
    return false;
  }

  function start() {
    if (timer) return;
    timer = setInterval(() => tick().catch(e => log('tick failed', e.message)), T.tickMs);
    if (timer.unref) timer.unref();
  }
  function stop() { if (timer) clearInterval(timer); timer = null; }

  return { handleRoute, tick, start, stop, view, _parties: () => parties, _states: () => states };
}

module.exports = { createPartyService, pickCandidates, channelTarget, assignedIds, sanitizeParty, normalizeFollowMode, sanitizeFollowModes, findPartyPriest, resolveFollowTarget, normalizeStates, READ_JS, ACTIONS, MAX_MEMBERS };
