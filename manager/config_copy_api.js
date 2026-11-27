// manager/config_copy_api.js — copy one client's bot settings to other clients.
//
//   POST /api/profiles/:id/copy-config   { targets: [profileId, ...] }
//
// Reads the live config from the source client (window.exportAllBotSettings), removes everything
// tied to the account (username/password are never exported; the character name is removed here
// so other accounts don't try to pick the source's character), then imports it into each target.

// Persist with the keys bot.js actually loads from — older bot builds saved two of them under the
// wrong names, which made copied market settings disappear after the next page reload.
function mergeCMarketRulesDedup(existingRules, incomingRules) {
  const out = [];
  const seenIds = new Set();
  const seenNames = new Set();
  const addIfNew = (r) => {
    if (!r || typeof r !== 'object') return;
    const idKey = String(r.itemId || '').trim().toLowerCase();
    const nmKey = String(r.itemName || '').trim().toLowerCase();
    if (!idKey && !nmKey) return;
    if ((idKey && seenIds.has(idKey)) || (nmKey && seenNames.has(nmKey))) return;
    if (idKey) seenIds.add(idKey);
    if (nmKey) seenNames.add(nmKey);
    out.push(r);
  };
  for (const r of (Array.isArray(existingRules) ? existingRules : [])) addIfNew(r);
  for (const r of (Array.isArray(incomingRules) ? incomingRules : [])) addIfNew(r);
  return out;
}

const IMPORT_JS = (config, mergeCMarketRules = true) => `(() => {
  if (typeof window.importAllBotSettings !== 'function') return { success: false, error: 'บอทในจอนี้ยังไม่พร้อม (กรุณาอัปเดตสคริปต์บอทเป็นเวอร์ชันล่าสุดก่อน)' };
  const beforeFarmMap = window.__targetFarmMap || 'auto';
  const beforeGatherMap = String(window.__gatherConfig?.targetMap || '').trim();
  const before = window.__authConfig ? {
    username: window.__authConfig.username,
    password: window.__authConfig.password,
    charName: window.__authConfig.charName,
    serverName: window.__authConfig.serverName,
    generatedUser: window.__authConfig.generatedUser,
    register: window.__authConfig.register,
    registerDone: window.__authConfig.registerDone,
    userEditedAt: window.__authConfig.userEditedAt,
    serverEditedAt: window.__authConfig.serverEditedAt
  } : null;
  const r = window.importAllBotSettings(${JSON.stringify(config)}, { mergeCMarketRules: ${Boolean(mergeCMarketRules)}, includePlan: false, includeSmartAutoQuest: false });
  if (window.__targetFarmMap !== beforeFarmMap) {
    window.__targetFarmMap = beforeFarmMap;
    try { localStorage.setItem('pelican_target_farm_map', beforeFarmMap); } catch (e) {}
  }
  if (window.__gatherConfig && typeof window.__gatherConfig === 'object' && window.__gatherConfig.targetMap !== beforeGatherMap) {
    window.__gatherConfig.targetMap = beforeGatherMap;
  }
  if (before && window.__authConfig) {
    for (const [k, v] of Object.entries(before)) {
      if (v !== undefined) window.__authConfig[k] = v;
    }
    try { localStorage.setItem('pelican_auth_cfg', JSON.stringify(window.__authConfig)); } catch (e) {}
  }
  try {
    if (window.__sellConfig) localStorage.setItem('pelican_nc_sell_cfg', JSON.stringify(window.__sellConfig));
    if (window.__cmarketAutoSellConfig) localStorage.setItem('pelican_nc_cmarket_autosell', JSON.stringify(window.__cmarketAutoSellConfig));
    if (window.__potionConfig) localStorage.setItem('pelican_potion_cfg', JSON.stringify(window.__potionConfig));
    if (window.__gatherConfig) localStorage.setItem('pelican_nc_gather_cfg', JSON.stringify(window.__gatherConfig));
    if (window.__ncPerfConfig) localStorage.setItem('pelican_nc_perf_cfg', JSON.stringify(window.__ncPerfConfig));
    if (window.__autoMarketSellConfig) localStorage.setItem('pelican_auto_market_sell_cfg', JSON.stringify(window.__autoMarketSellConfig));
    if (window.__marketFilterConfig) localStorage.setItem('pelican_market_filter_cfg', JSON.stringify(window.__marketFilterConfig));
    if (typeof window.syncAllHudInputsFromConfig === 'function') window.syncAllHudInputsFromConfig();
  } catch (e) {}
  return Object.assign({}, r || { success: true });
})()`;

function readBody(req) {
  return new Promise(resolve => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch (e) { resolve(null); } });
  });
}

async function handleConfigCopyRoute(req, res, pathname, ctx) {
  const m = pathname.match(/^\/api\/profiles\/([^/]+)\/copy-config$/);
  if (!m || req.method !== 'POST') return false;
  const { loadProfiles, saveProfiles, evalProfilePort, sendJSON } = ctx;

  const payload = await readBody(req);
  if (!payload || !Array.isArray(payload.targets)) {
    sendJSON({ success: false, error: 'ต้องระบุจอปลายทาง (targets)' }, 400);
    return true;
  }
  const profiles = loadProfiles();
  const source = profiles.find(p => p.id === m[1]);
  if (!source || !source.debugPort) {
    sendJSON({ success: false, error: 'จอต้นทางออฟไลน์อยู่' }, 400);
    return true;
  }

  const exp = await evalProfilePort(source.debugPort, "(typeof window.exportAllBotSettings === 'function') ? window.exportAllBotSettings() : null", 5000);
  const config = exp && exp.result && exp.result.data;
  if (!config) {
    sendJSON({ success: false, error: 'อ่านการตั้งค่าจากจอต้นทางไม่สำเร็จ (บอทอาจยังโหลดไม่เสร็จ)' }, 502);
    return true;
  }
  // Per-window farm/gather maps, Plan Script, Smart Auto-Quest & account-specific identity: NEVER copy!
  delete config.targetFarmMap;
  delete config.targetMap;
  delete config.scriptPlan;
  delete config.planScriptEnabled;
  delete config.smartAutoQuestEnabled;
  if (config.gatherConfig && typeof config.gatherConfig === 'object') {
    delete config.gatherConfig.targetMap;
  }
  if (config.authConfig) {
    delete config.authConfig.username;
    delete config.authConfig.password;
    delete config.authConfig.charName;
    delete config.authConfig.serverName;
    delete config.authConfig.generatedUser;
    delete config.authConfig.register;
    delete config.authConfig.registerDone;
    delete config.authConfig.registerError;
    delete config.authConfig.userEditedAt;
    delete config.authConfig.serverEditedAt;
    delete config.authConfig.verifiedLoginAt;
  }

  const mergeCMarketRules = payload.cmarketCopyMode !== 'replace';
  const results = [];
  for (const id of payload.targets) {
    const target = profiles.find(p => p.id === id);
    if (!target || id === source.id) continue;
    if (!target.debugPort) { results.push({ id, name: target.name, success: false, error: 'ไม่มีพอร์ต' }); continue; }
    const r = await evalProfilePort(target.debugPort, IMPORT_JS(config, mergeCMarketRules), 6000);
    const ok = Boolean(r && r.success && r.result && r.result.success !== false);
    results.push({ id, name: target.name, success: ok, error: ok ? null : (r && r.result && r.result.error) || (r && r.error) || 'จอนี้ออฟไลน์หรือไม่ตอบสนอง' });
    if (ok) {
      // Keep Manager's own record in step (whitelist, forceSellList, cmarket rules — NEVER touch target.targetMap!)
      if (config.sellConfig && typeof config.sellConfig === 'object') {
        target.sellConfig = Object.assign({}, target.sellConfig || {}, config.sellConfig);
        if (typeof config.sellConfig.whitelist === 'string') target.whitelist = config.sellConfig.whitelist;
        if (typeof config.sellConfig.forceSellList === 'string') target.forceSellList = config.sellConfig.forceSellList;
      }
      if (config.cmarketAutoSellConfig && typeof config.cmarketAutoSellConfig === 'object') {
        const clonedCm = JSON.parse(JSON.stringify(config.cmarketAutoSellConfig));
        const existingRules = Array.isArray(target.cmarketAutoSellConfig?.rules) ? target.cmarketAutoSellConfig.rules : [];
        const incomingRules = Array.isArray(clonedCm.rules) ? clonedCm.rules : [];
        clonedCm.rules = mergeCMarketRules
          ? mergeCMarketRulesDedup(existingRules, incomingRules)
          : mergeCMarketRulesDedup([], incomingRules);
        target.cmarketAutoSellConfig = clonedCm;
      }
    }
  }
  if (results.some(r => r.success)) saveProfiles(profiles);

  const okCount = results.filter(r => r.success).length;
  sendJSON({ success: okCount > 0, copied: okCount, total: results.length, results, source: source.name });
  return true;
}

module.exports = { handleConfigCopyRoute };
