'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const SMAILPRO_API_BASE = 'https://app.sonjj.com';
const CENTRAL_SQLITE_CANDIDATES = [
  'D:\\MyProject\\PMheeSuite\\PMheePlatform_Src\\artifacts\\aetheria-owner-host-private\\cutover-20261013-1715.sqlite',
  'C:\\ProgramData\\PMhee\\AetheriaApi\\owner.sqlite'
];

function emailToCentralLockProfileId(email) {
  const clean = String(email || '').trim().toLowerCase();
  const hex = crypto.createHash('sha256').update('pmhee-smailpro-lock-v1|' + clean).digest('hex').slice(0, 11);
  const numStr = (BigInt('0x' + hex) % 9000000000000n + 1000000000000n).toString();
  return `profile_99${numStr}`;
}

function stripHtmlToText(html) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractSixDigitOtpFromText(text, rejectedSet) {
  const clean = String(text || '');
  const matches = clean.match(/\b(\d{6})\b/g) || [];
  for (const code of matches) {
    if (rejectedSet && rejectedSet.has(code)) continue;
    // Skip obvious years like 202400..202999 if other codes exist, or CSS hex fragments
    if (/^(199\d|202\d)\d{2}$/.test(code) && matches.length > 1) continue;
    return code;
  }
  return '';
}

function createSmailProService({
  dataDir,
  rootDir,
  loadProfiles,
  humanCheckSolver,
  getMachineName
}) {
  const settingsFile = path.join(dataDir, 'email_reg_settings.json');
  const registryFile = path.join(dataDir, 'email_accounts_registry.json');
  const txtExportFile = path.join(rootDir || path.resolve(dataDir, '..', '..'), 'รหัสทั้งหมด_smailpro.txt');

  // Active inbox tracking per profileId: { email, providerFamily, createdAtSec, key, lastPollAt, readMids: Map<mid, body>, usedOtps: Set<string> }
  const activeInboxes = new Map();
  let centralRestoredEmailsCache = new Set();
  let centralRestoredAt = 0;
  let browserModeRef = null;

  function setBrowserMode(bm) {
    browserModeRef = bm || null;
    if (browserModeRef && typeof browserModeRef.setSmailProSessionCallback === 'function') {
      browserModeRef.setSmailProSessionCallback(onWebSessionHarvested);
    }
  }

  function atomicWriteJson(file, data) {
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const tmp = `${file}.${process.pid}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
      fs.renameSync(tmp, file);
    } catch (_) {}
  }

  function loadSettings() {
    const defaults = {
      enabled: false, // Default OFF: register normally without verifying email unless user enables this
      mode: 'builtin_outlook', // 'builtin_outlook' | 'smailpro'
      smailproAuthMode: 'web', // 'web' (SmailPro Web Premium Session/Cookies — no API credit) | 'api_key' | 'auto'
      smailproApiKey: '',
      smailproProvider: 'auto', // 'auto' | 'gmail' | 'outlook' | 'temp_email'
      smailproAddressType: 'real', // 'real' | 'alias'
      smailproServer: 'auto', // 'auto' | '1' | '2' | '3'
      smailproWebCookie: '',
      smailproWebCsrf: '',
      smailproWebUserAgent: '',
      smailproWebLoggedIn: false,
      smailproWebIsPremium: false,
      smailproWebUserText: '',
      smailproWebCheckedAt: 0,
      outlookProxyEnabled: false,
      outlookProxyHost: 'gw.dataimpulse.com',
      outlookProxyPort: 823,
      outlookProxyUser: '',
      outlookProxyPass: '',
      outlookProxyCountry: 'th',
      updatedAt: 0
    };
    try {
      if (fs.existsSync(settingsFile)) {
        const raw = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
        return {
          enabled: Boolean(raw?.enabled),
          mode: raw?.mode === 'smailpro' ? 'smailpro' : 'builtin_outlook',
          smailproAuthMode: ['web', 'api_key', 'auto'].includes(raw?.smailproAuthMode)
            ? raw.smailproAuthMode
            : 'web',
          smailproApiKey: String(raw?.smailproApiKey || '').trim(),
          smailproProvider: ['auto', 'gmail', 'outlook', 'temp_email'].includes(raw?.smailproProvider)
            ? raw.smailproProvider
            : 'auto',
          smailproAddressType: raw?.smailproAddressType === 'alias' ? 'alias' : 'real',
          smailproServer: ['auto', '1', '2', '3'].includes(String(raw?.smailproServer || ''))
            ? String(raw.smailproServer)
            : 'auto',
          smailproWebCookie: String(raw?.smailproWebCookie || '').trim(),
          smailproWebCsrf: String(raw?.smailproWebCsrf || '').trim(),
          smailproWebUserAgent: String(raw?.smailproWebUserAgent || '').trim(),
          smailproWebLoggedIn: Boolean(raw?.smailproWebLoggedIn),
          smailproWebIsPremium: Boolean(raw?.smailproWebIsPremium),
          smailproWebUserText: String(raw?.smailproWebUserText || '').trim(),
          smailproWebCheckedAt: Number(raw?.smailproWebCheckedAt) || 0,
          outlookProxyEnabled: raw?.outlookProxyEnabled !== false,
          outlookProxyHost: String(raw?.outlookProxyHost !== undefined ? raw.outlookProxyHost : defaults.outlookProxyHost).trim(),
          outlookProxyPort: Number(raw?.outlookProxyPort) || defaults.outlookProxyPort,
          outlookProxyUser: String(raw?.outlookProxyUser !== undefined ? raw.outlookProxyUser : defaults.outlookProxyUser).trim(),
          outlookProxyPass: String(raw?.outlookProxyPass !== undefined ? raw.outlookProxyPass : defaults.outlookProxyPass).trim(),
          outlookProxyCountry: String(raw?.outlookProxyCountry !== undefined ? raw.outlookProxyCountry : defaults.outlookProxyCountry).trim().toLowerCase(),
          updatedAt: Number(raw?.updatedAt) || 0
        };
      }
    } catch (_) {}
    return defaults;
  }

  function saveSettings(patch = {}) {
    const cur = loadSettings();
    const next = {
      enabled: patch.enabled !== undefined
        ? Boolean(patch.enabled)
        : cur.enabled,
      mode: patch.mode !== undefined
        ? (patch.mode === 'smailpro' ? 'smailpro' : 'builtin_outlook')
        : cur.mode,
      smailproAuthMode: patch.smailproAuthMode !== undefined
        ? (['web', 'api_key', 'auto'].includes(patch.smailproAuthMode) ? patch.smailproAuthMode : cur.smailproAuthMode)
        : cur.smailproAuthMode,
      smailproApiKey: patch.smailproApiKey !== undefined
        ? String(patch.smailproApiKey || '').trim()
        : cur.smailproApiKey,
      smailproProvider: patch.smailproProvider !== undefined
        ? (['auto', 'gmail', 'outlook', 'temp_email'].includes(patch.smailproProvider) ? patch.smailproProvider : cur.smailproProvider)
        : cur.smailproProvider,
      smailproAddressType: patch.smailproAddressType !== undefined
        ? (patch.smailproAddressType === 'alias' ? 'alias' : 'real')
        : cur.smailproAddressType,
      smailproServer: patch.smailproServer !== undefined
        ? (['auto', '1', '2', '3'].includes(String(patch.smailproServer)) ? String(patch.smailproServer) : cur.smailproServer)
        : cur.smailproServer,
      smailproWebCookie: patch.smailproWebCookie !== undefined
        ? String(patch.smailproWebCookie || '').trim()
        : cur.smailproWebCookie,
      smailproWebCsrf: patch.smailproWebCsrf !== undefined
        ? String(patch.smailproWebCsrf || '').trim()
        : cur.smailproWebCsrf,
      smailproWebUserAgent: patch.smailproWebUserAgent !== undefined
        ? String(patch.smailproWebUserAgent || '').trim()
        : cur.smailproWebUserAgent,
      smailproWebLoggedIn: patch.smailproWebLoggedIn !== undefined
        ? Boolean(patch.smailproWebLoggedIn)
        : cur.smailproWebLoggedIn,
      smailproWebIsPremium: patch.smailproWebIsPremium !== undefined
        ? Boolean(patch.smailproWebIsPremium)
        : cur.smailproWebIsPremium,
      smailproWebUserText: patch.smailproWebUserText !== undefined
        ? String(patch.smailproWebUserText || '').trim()
        : cur.smailproWebUserText,
      smailproWebCheckedAt: patch.smailproWebCheckedAt !== undefined
        ? (Number(patch.smailproWebCheckedAt) || Date.now())
        : cur.smailproWebCheckedAt,
      outlookProxyEnabled: patch.outlookProxyEnabled !== undefined
        ? Boolean(patch.outlookProxyEnabled)
        : cur.outlookProxyEnabled,
      outlookProxyHost: patch.outlookProxyHost !== undefined
        ? String(patch.outlookProxyHost || '').trim()
        : cur.outlookProxyHost,
      outlookProxyPort: patch.outlookProxyPort !== undefined
        ? (Number(patch.outlookProxyPort) || 823)
        : cur.outlookProxyPort,
      outlookProxyUser: patch.outlookProxyUser !== undefined
        ? String(patch.outlookProxyUser || '').trim()
        : cur.outlookProxyUser,
      outlookProxyPass: patch.outlookProxyPass !== undefined
        ? String(patch.outlookProxyPass || '').trim()
        : cur.outlookProxyPass,
      outlookProxyCountry: patch.outlookProxyCountry !== undefined
        ? String(patch.outlookProxyCountry || 'th').trim().toLowerCase()
        : cur.outlookProxyCountry,
      updatedAt: Date.now()
    };
    atomicWriteJson(settingsFile, next);
    return next;
  }

  function onWebSessionHarvested(snapshot = {}) {
    if (!snapshot || typeof snapshot !== 'object') return;
    const patch = {
      smailproWebCheckedAt: Date.now()
    };
    if (snapshot.cookieHeader) patch.smailproWebCookie = String(snapshot.cookieHeader).trim();
    if (snapshot.csrfToken) patch.smailproWebCsrf = String(snapshot.csrfToken).trim();
    if (snapshot.userAgent) patch.smailproWebUserAgent = String(snapshot.userAgent).trim();
    if (snapshot.host === 'smailpro.com') {
      patch.smailproWebLoggedIn = Boolean(snapshot.isLoggedIn);
      patch.smailproWebIsPremium = Boolean(snapshot.isPremium);
      if (snapshot.userText) patch.smailproWebUserText = String(snapshot.userText).trim();
      if (snapshot.isLoggedIn) {
        patch.mode = 'smailpro';
        patch.smailproAuthMode = 'web';
      }
    }
    saveSettings(patch);
    if (Array.isArray(snapshot.historyItems) && snapshot.historyItems.length > 0) {
      mergeSmailProHistoryItems(snapshot.historyItems);
    }
  }

  function getMode() {
    const s = loadSettings();
    if (s.mode === 'smailpro') return 'smailpro';
    return 'builtin_outlook';
  }

  function loadRegistry() {
    try {
      if (fs.existsSync(registryFile)) {
        const raw = JSON.parse(fs.readFileSync(registryFile, 'utf8'));
        return {
          usedEmails: Array.isArray(raw?.usedEmails) ? raw.usedEmails : [],
          accounts: Array.isArray(raw?.accounts) ? raw.accounts : [],
          inboxKeys: (raw?.inboxKeys && typeof raw.inboxKeys === 'object' && !Array.isArray(raw.inboxKeys))
            ? raw.inboxKeys
            : {}
        };
      }
    } catch (_) {}
    return { usedEmails: [], accounts: [], inboxKeys: {} };
  }

  function saveRegistry(reg) {
    const usedSet = new Set(
      (Array.isArray(reg?.usedEmails) ? reg.usedEmails : [])
        .map(e => String(e || '').trim().toLowerCase())
        .filter(Boolean)
    );
    const accounts = Array.isArray(reg?.accounts) ? reg.accounts : [];
    for (const acc of accounts) {
      const em = String(acc?.email || acc?.username || '').trim().toLowerCase();
      if (em) usedSet.add(em);
    }
    const inboxKeys = (reg?.inboxKeys && typeof reg.inboxKeys === 'object' && !Array.isArray(reg.inboxKeys))
      ? reg.inboxKeys
      : {};
    const clean = {
      usedEmails: Array.from(usedSet),
      accounts: accounts.slice(0, 5000),
      inboxKeys
    };
    atomicWriteJson(registryFile, clean);
    writeTxtExport(clean.accounts);
    return clean;
  }

  function saveEmailInboxKey(email, { timestamp, key } = {}) {
    const clean = String(email || '').trim().toLowerCase();
    if (!clean || !key) return;
    const reg = loadRegistry();
    reg.inboxKeys[clean] = {
      timestamp: Number(timestamp) || Math.floor(Date.now() / 1000),
      key: String(key),
      updatedAt: Date.now()
    };
    saveRegistry(reg);
  }

  function getEmailInboxKey(email) {
    const clean = String(email || '').trim().toLowerCase();
    if (!clean) return null;
    const reg = loadRegistry();
    return reg.inboxKeys[clean] || null;
  }

  function isKnownManagedEmail(email) {
    const clean = String(email || '').trim().toLowerCase();
    if (!clean || !clean.includes('@')) return false;
    const reg = loadRegistry();
    if (reg.inboxKeys && reg.inboxKeys[clean]) return true;
    if (reg.usedEmails.some(e => String(e || '').trim().toLowerCase() === clean)) return true;
    if (reg.accounts.some(a => String(a?.email || a?.username || '').trim().toLowerCase() === clean)) return true;
    return false;
  }

  function mergeSmailProHistoryItems(items = []) {
    if (!Array.isArray(items) || items.length === 0) return 0;
    const reg = loadRegistry();
    let changed = false;
    const usedSet = new Set(reg.usedEmails.map(e => String(e || '').trim().toLowerCase()));
    for (const item of items) {
      const addr = String(item?.address || item?.email || item || '').trim().toLowerCase();
      if (!addr || !addr.includes('@')) continue;
      if (!usedSet.has(addr)) {
        usedSet.add(addr);
        reg.usedEmails.push(addr);
        changed = true;
      }
      const key = String(item?.key || '').trim();
      const ts = Number(item?.timestamp) || 0;
      if (key || (ts && !reg.inboxKeys[addr])) {
        const prev = reg.inboxKeys[addr] || {};
        reg.inboxKeys[addr] = {
          timestamp: ts || prev.timestamp || Math.floor(Date.now() / 1000),
          key: key || prev.key || '',
          updatedAt: Date.now()
        };
        changed = true;
      }
    }
    if (changed) saveRegistry(reg);
    return items.length;
  }

  function maskNightcampEmail(email) {
    const e = String(email || '').trim().toLowerCase();
    const at = e.lastIndexOf('@');
    if (at <= 0) return '';
    const name = [...e.slice(0, at)];
    return name.slice(0, name.length <= 2 ? 1 : 2).join('') + '•••' + e.slice(at);
  }

  let lastCloudHistorySyncAt = 0;
  async function syncSmailProCloudHistory(force = false) {
    const s = loadSettings();
    if (s.mode !== 'smailpro' || !s.smailproWebLoggedIn || !s.smailproWebCookie) return;
    if (!force && Date.now() - lastCloudHistorySyncAt < 30000) return;
    lastCloudHistorySyncAt = Date.now();
    try {
      const res = await nodeSmailProWebRequest('/app/history', { method: 'GET' });
      if (res && Array.isArray(res.items) && res.items.length > 0) {
        mergeSmailProHistoryItems(res.items);
        return;
      }
    } catch (_) {}
  }

  async function findEmailByMaskOrHistory(maskedEmail, profileId = '') {
    const s = loadSettings();
    const targetMask = String(maskedEmail || '').trim().toLowerCase();
    if (!targetMask || !targetMask.includes('@')) return '';
    if (!targetMask.includes('•') && !targetMask.includes('*')) {
      return targetMask;
    }
    if (s.mode === 'smailpro' && s.smailproWebLoggedIn && s.smailproWebCookie) {
      await syncSmailProCloudHistory(false).catch(() => {});
    }
    const reg = loadRegistry();
    const candidates = [];
    const seen = new Set();
    const pushCand = (em) => {
      const clean = String(em || '').trim().toLowerCase();
      if (!clean || !clean.includes('@') || seen.has(clean)) return;
      seen.add(clean);
      candidates.push(clean);
    };
    if (profileId) {
      for (const a of reg.accounts) {
        if (a && a.profileId === profileId) pushCand(a.email || a.username);
      }
    }
    for (const a of reg.accounts) {
      pushCand(a?.email || a?.username);
    }
    const keyEntries = Object.entries(reg.inboxKeys || {}).sort((a, b) => (Number(b[1]?.updatedAt) || 0) - (Number(a[1]?.updatedAt) || 0));
    for (const [em] of keyEntries) pushCand(em);
    for (let i = reg.usedEmails.length - 1; i >= 0; i--) {
      pushCand(reg.usedEmails[i]);
    }
    const { accounts: centralAccs } = readOwnerCentralDbAccounts();
    for (const a of centralAccs) pushCand(a?.email || a?.username);
    for (const em of centralRestoredEmailsCache) pushCand(em);

    for (const cand of candidates) {
      if (maskNightcampEmail(cand) === targetMask) {
        return cand;
      }
    }
    return '';
  }

  function writeTxtExport(accountsList) {
    try {
      const all = mergeWithOwnerCentralDbAccounts(accountsList || []);
      const lines = [
        '# ==========================================================================',
        '# Nightcamp Registered Email & SmailPro Accounts (ID | Password | Email)',
        `# อัปเดตล่าสุด: ${new Date().toLocaleString('th-TH')}`,
        '# รูปแบบ: ID | Password | Email | ระบบเมล | ชื่อตัวละคร | เครื่อง | เวลา',
        '# =========================================================================='
      ];
      for (const a of all) {
        if (!a || (!a.username && !a.email)) continue;
        const id = String(a.username || a.email || '').trim();
        const pass = String(a.password || '').trim();
        const email = String(a.email || a.username || '').trim();
        const prov = String(a.provider || 'smailpro').trim();
        const ch = String(a.charName || '-').trim();
        const mach = String(a.machineName || '-').trim();
        const dt = a.updatedAt ? new Date(a.updatedAt).toLocaleString('th-TH') : '-';
        lines.push(`${id} | ${pass} | ${email} | ${prov} | ${ch} | ${mach} | ${dt}`);
      }
      fs.writeFileSync(txtExportFile, lines.join('\r\n') + '\r\n', 'utf8');
    } catch (_) {}
  }

  // Read-only scan of the Central Server SQLite DB when running on the owner's machine
  function readOwnerCentralDbAccounts() {
    const out = [];
    const usedSet = new Set();
    let dbFile = null;
    for (const cand of CENTRAL_SQLITE_CANDIDATES) {
      if (fs.existsSync(cand)) {
        dbFile = cand;
        break;
      }
    }
    if (!dbFile) return { accounts: out, usedEmails: usedSet };
    try {
      const { DatabaseSync } = require('node:sqlite');
      const db = new DatabaseSync(dbFile, { readOnly: true });
      try {
        const rows = db.prepare(`
          SELECT profile_id AS profileId, profile_name AS profileName, machine_name AS machineName,
                 character_name AS charName, username, password, server_id AS serverName,
                 profile_json AS profileJson, updated_ms AS updatedAt
          FROM pmheenc_profile_backups
          WHERE username IS NOT NULL AND trim(username) <> ''
          ORDER BY updated_ms DESC
          LIMIT 5000
        `).all();
        for (const r of rows || []) {
          const uname = String(r.username || '').trim();
          if (!uname) continue;
          const uLow = uname.toLowerCase();
          usedSet.add(uLow);
          let meta = {};
          try { meta = JSON.parse(r.profileJson || '{}'); } catch (_) {}
          const isSmailLock = /^profile_99\d{13}$/.test(String(r.profileId || ''));
          const prov = String(meta.emailProvider || (isSmailLock ? 'smailpro' : (uLow.endsWith('@outlook.com') ? 'outlook' : 'nightcamp')));
          if (isSmailLock || meta.emailProvider || /@(gmail|outlook|hotmail|live)\./i.test(uname)) {
            out.push({
              id: uname,
              username: uname,
              password: String(r.password || ''),
              email: String(meta.smailproEmail || uname),
              provider: prov,
              charName: String(r.charName || meta.lastCharName || ''),
              serverName: String(r.serverName || meta.server || ''),
              profileId: String(meta.sourceProfileId || r.profileId || ''),
              profileName: String(r.profileName || ''),
              machineName: String(r.machineName || ''),
              status: r.password ? 'registered' : 'claimed',
              updatedAt: Number(r.updatedAt) || 0,
              fromCentralDb: true
            });
          }
        }
      } finally {
        try { db.close(); } catch (_) {}
      }
    } catch (_) {}
    return { accounts: out, usedEmails: usedSet };
  }

  function mergeWithOwnerCentralDbAccounts(localAccounts) {
    const map = new Map();
    for (const a of (localAccounts || [])) {
      const key = String(a?.email || a?.username || '').trim().toLowerCase();
      if (!key) continue;
      map.set(key, { ...a });
    }
    const { accounts: centralList } = readOwnerCentralDbAccounts();
    for (const c of centralList) {
      const key = String(c?.email || c?.username || '').trim().toLowerCase();
      if (!key) continue;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, c);
      } else {
        if (!existing.password && c.password) existing.password = c.password;
        if (!existing.charName && c.charName) existing.charName = c.charName;
        if (!existing.machineName && c.machineName) existing.machineName = c.machineName;
        if ((c.updatedAt || 0) > (existing.updatedAt || 0)) existing.updatedAt = c.updatedAt;
      }
    }
    return Array.from(map.values()).sort((a, b) => (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0));
  }

  function isEmailUsedLocally(email, extraSet) {
    const clean = String(email || '').trim().toLowerCase();
    if (!clean) return true;
    if (extraSet && extraSet.has(clean)) return true;
    const reg = loadRegistry();
    if (reg.usedEmails.some(e => String(e || '').trim().toLowerCase() === clean)) return true;
    if (reg.accounts.some(a => String(a?.email || a?.username || '').trim().toLowerCase() === clean)) return true;
    try {
      const profiles = (typeof loadProfiles === 'function' ? loadProfiles() : []) || [];
      if (profiles.some(p => String(p?.account || '').trim().toLowerCase() === clean)) return true;
    } catch (_) {}
    const { usedEmails: centralDbUsed } = readOwnerCentralDbAccounts();
    if (centralDbUsed.has(clean)) return true;
    if (centralRestoredEmailsCache.has(clean)) return true;
    return false;
  }

  async function refreshCentralAccountEmailsIfNeeded() {
    if (!humanCheckSolver || typeof humanCheckSolver.serviceRequest !== 'function') return;
    if (Date.now() - centralRestoredAt < 45000 && centralRestoredEmailsCache.size > 0) return;
    centralRestoredAt = Date.now();
    try {
      const res = await humanCheckSolver.serviceRequest('/v1/aetheria/pmheenc/machine/profile-restore', {
        includeDeleted: true
      });
      if (res && Array.isArray(res.profiles)) {
        for (const p of res.profiles) {
          const u = String(p?.username || p?.account || p?.profile?.smailproEmail || '').trim().toLowerCase();
          if (u) centralRestoredEmailsCache.add(u);
        }
      }
    } catch (_) {}
  }

  // Atomically claim & deduplicate an email on the Central Server (`https://api.noggunsshop.xyz`)
  // Uses deterministic `profile_99<13_digits>` lock ID so `pmheenc_profile_backups` rejects any email already claimed by another user (`foreignSkipped > 0`).
  async function claimAndSyncEmailOnCentral({
    email,
    password = '',
    provider = 'smailpro',
    profileId = '',
    profileName = '',
    charName = '',
    serverName = '',
    status = 'claimed'
  }) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail) return { duplicate: true };
    if (!humanCheckSolver || typeof humanCheckSolver.serviceRequest !== 'function') {
      return { duplicate: false, offline: true };
    }
    try {
      await refreshCentralAccountEmailsIfNeeded();
      if (status === 'claimed' && centralRestoredEmailsCache.has(cleanEmail)) {
        return { duplicate: true, reason: 'already_in_account_cloud' };
      }
      const lockId = emailToCentralLockProfileId(cleanEmail);
      const machineName = (typeof getMachineName === 'function' ? getMachineName() : '') || require('os').hostname();
      const res = await humanCheckSolver.serviceRequest('/v1/aetheria/pmheenc/machine/profile-backup', {
        machineId: machineName,
        machineName,
        profiles: [
          {
            id: lockId,
            name: `[SmailPro] ${cleanEmail}`,
            username: cleanEmail,
            account: cleanEmail,
            password: String(password || ''),
            characterName: String(charName || (status === 'registered' ? 'Registered' : 'Claimed')),
            server: String(serverName || 'nightcamp-main'),
            profile: {
              id: lockId,
              name: `[SmailPro] ${cleanEmail}`,
              account: cleanEmail,
              username: cleanEmail,
              smailproEmail: cleanEmail,
              emailProvider: provider,
              sourceProfileId: profileId,
              sourceProfileName: profileName,
              machineName,
              status,
              updatedAt: Date.now()
            }
          }
        ],
        deletedProfileIds: []
      });
      if (res && (Number(res.foreignSkipped) > 0 || (res.foreignProfilesDetected && Number(res.saved) === 0))) {
        centralRestoredEmailsCache.add(cleanEmail);
        return { duplicate: true, reason: 'claimed_by_other_user_on_central' };
      }
      centralRestoredEmailsCache.add(cleanEmail);
      return { duplicate: false, synced: true };
    } catch (_) {
      return { duplicate: false, offline: true };
    }
  }

  function recordAccountLocally({
    profileId = '',
    profileName = '',
    username = '',
    password = '',
    email = '',
    provider = 'smailpro',
    charName = '',
    serverName = '',
    status = 'registered'
  }) {
    const cleanEmail = String(email || username || '').trim().toLowerCase();
    const cleanUser = String(username || email || '').trim();
    if (!cleanEmail && !cleanUser) return null;
    const machineName = (typeof getMachineName === 'function' ? getMachineName() : '') || require('os').hostname();
    const reg = loadRegistry();
    if (!reg.usedEmails.includes(cleanEmail)) {
      reg.usedEmails.push(cleanEmail);
    }
    const now = Date.now();
    const idx = reg.accounts.findIndex(a => String(a?.email || a?.username || '').trim().toLowerCase() === cleanEmail);
    const entry = {
      id: cleanUser,
      username: cleanUser,
      password: String(password || (idx >= 0 ? reg.accounts[idx].password : '') || ''),
      email: cleanEmail,
      provider: String(provider || (idx >= 0 ? reg.accounts[idx].provider : 'smailpro')),
      profileId: String(profileId || (idx >= 0 ? reg.accounts[idx].profileId : '')),
      profileName: String(profileName || (idx >= 0 ? reg.accounts[idx].profileName : '')),
      charName: String(charName || (idx >= 0 ? reg.accounts[idx].charName : '')),
      serverName: String(serverName || (idx >= 0 ? reg.accounts[idx].serverName : '')),
      machineName,
      status,
      createdAt: idx >= 0 ? (reg.accounts[idx].createdAt || now) : now,
      updatedAt: now
    };
    if (idx >= 0) {
      reg.accounts[idx] = entry;
    } else {
      reg.accounts.unshift(entry);
    }
    saveRegistry(reg);
    return entry;
  }

  async function recordRegisteredAccount(info = {}) {
    const settings = loadSettings();
    const emailLow = String(info.email || info.username || '').trim().toLowerCase();
    const active = activeInboxes.get(info.profileId);
    const provider = info.provider ||
      (active ? `smailpro_${active.providerFamily}` : (settings.mode === 'smailpro' ? 'smailpro' : 'builtin_outlook'));
    const entry = recordAccountLocally({
      ...info,
      email: emailLow,
      provider,
      status: 'registered'
    });
    await claimAndSyncEmailOnCentral({
      email: emailLow,
      password: info.password || '',
      provider,
      profileId: info.profileId || '',
      profileName: info.profileName || '',
      charName: info.charName || '',
      serverName: info.serverName || '',
      status: 'registered'
    }).catch(() => {});
    return entry;
  }

  // Low-level SmailPro / Sonjj HTTPS GET request
  function smailProGet(apiPath, queryParams = {}, apiKeyOverride = '', timeoutMs = 15000) {
    const settings = loadSettings();
    const apiKey = String(apiKeyOverride || settings.smailproApiKey || '').trim();
    if (!apiKey) {
      return Promise.reject(new Error('กรุณาใส่ SmailPro API Key ในหน้าตั้งค่าสมัครเมลก่อนใช้งาน'));
    }
    return new Promise((resolve, reject) => {
      const url = new URL(apiPath, SMAILPRO_API_BASE);
      for (const [k, v] of Object.entries(queryParams || {})) {
        if (v !== undefined && v !== null && v !== '') {
          url.searchParams.set(k, String(v));
        }
      }
      const req = https.request(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Api-Key': apiKey,
          'User-Agent': 'PmheeNightcampManager/2.3.56'
        },
        timeout: timeoutMs
      }, res => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', chunk => { raw += chunk; });
        res.on('end', () => {
          let parsed = null;
          try { parsed = JSON.parse(raw || '{}'); } catch (_) {}
          if (res.statusCode >= 200 && res.statusCode < 300 && parsed) {
            return resolve(parsed);
          }
          const errMsg = parsed?.message || parsed?.detail?.error?.message || parsed?.error || `HTTP ${res.statusCode}`;
          const err = new Error(`SmailPro API Error (${res.statusCode}): ${errMsg}`);
          err.statusCode = res.statusCode;
          reject(err);
        });
      });
      req.on('timeout', () => {
        try { req.destroy(); } catch (_) {}
        reject(new Error('SmailPro API timeout'));
      });
      req.on('error', err => reject(err));
      req.end();
    });
  }

  function detectProviderFamilyFromEmail(email, configuredProvider) {
    const low = String(email || '').trim().toLowerCase();
    if (low.endsWith('@gmail.com') || low.endsWith('@googlemail.com')) return 'gmail';
    if (/@(outlook|hotmail|live|msn)\./i.test(low)) return 'outlook';
    if (configuredProvider === 'gmail' || configuredProvider === 'outlook') return configuredProvider;
    return 'temp_email';
  }

  // Merge Set-Cookie headers from Node.js responses into stored smailproWebCookie string
  function mergeSetCookieHeaders(curCookieStr, setCookieArr) {
    if (!Array.isArray(setCookieArr) || setCookieArr.length === 0) return curCookieStr;
    const map = new Map();
    for (const part of String(curCookieStr || '').split(';')) {
      const eq = part.indexOf('=');
      if (eq > 0) map.set(part.slice(0, eq).trim(), part.slice(eq + 1).trim());
    }
    for (const raw of setCookieArr) {
      const first = String(raw || '').split(';')[0] || '';
      const eq = first.indexOf('=');
      if (eq > 0) {
        map.set(first.slice(0, eq).trim(), first.slice(eq + 1).trim());
      }
    }
    return Array.from(map.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
  }

  function extractXsrfFromCookieHeader(cookieStr) {
    for (const part of String(cookieStr || '').split(';')) {
      const eq = part.indexOf('=');
      if (eq > 0 && part.slice(0, eq).trim() === 'XSRF-TOKEN') {
        try { return decodeURIComponent(part.slice(eq + 1).trim()); } catch (_) { return part.slice(eq + 1).trim(); }
      }
    }
    return '';
  }

  // Direct Node.js HTTPS request to https://smailpro.com/app/* using harvested session cookies
  function nodeSmailProWebRequest(urlStr, { method = 'GET', bodyObj = null, expectText = false, timeoutMs = 15000 } = {}) {
    const s = loadSettings();
    const url = new URL(urlStr, 'https://smailpro.com');
    const isSmailProHost = url.hostname === 'smailpro.com' || url.hostname.endsWith('.smailpro.com');
    let cookieStr = String(s.smailproWebCookie || '').trim();
    const xsrf = extractXsrfFromCookieHeader(cookieStr);
    const headers = {
      'Accept': expectText ? 'text/plain, */*' : 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      'Origin': 'https://smailpro.com',
      'Referer': 'https://smailpro.com/temporary-email',
      'User-Agent': s.smailproWebUserAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    };
    if (isSmailProHost) {
      headers['X-Requested-With'] = 'XMLHttpRequest';
      if (cookieStr) headers['Cookie'] = cookieStr;
      if (s.smailproWebCsrf) headers['X-CSRF-TOKEN'] = s.smailproWebCsrf;
      if (xsrf) headers['X-XSRF-TOKEN'] = xsrf;
    }

    const payload = bodyObj !== null ? JSON.stringify(bodyObj) : null;
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);

    return new Promise((resolve, reject) => {
      const req = https.request(url, {
        method,
        headers,
        timeout: timeoutMs
      }, res => {
        const setCookie = res.headers['set-cookie'];
        if (isSmailProHost && Array.isArray(setCookie) && setCookie.length > 0 && cookieStr) {
          const nextCookie = mergeSetCookieHeaders(cookieStr, setCookie);
          if (nextCookie !== cookieStr) {
            saveSettings({ smailproWebCookie: nextCookie });
          }
        }
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', chunk => { raw += chunk; });
        res.on('end', () => {
          if (expectText) {
            if (res.statusCode >= 200 && res.statusCode < 300) return resolve(raw.trim());
            const err = new Error(`SmailPro Web HTTP ${res.statusCode}`);
            err.statusCode = res.statusCode;
            return reject(err);
          }
          let parsed = null;
          try { parsed = JSON.parse(raw || '{}'); } catch (_) {}
          if (res.statusCode >= 200 && res.statusCode < 300 && parsed !== null) {
            return resolve(parsed);
          }
          const msg = parsed?.msg || parsed?.message || parsed?.detail?.error?.message || `HTTP ${res.statusCode}`;
          const err = new Error(msg);
          err.statusCode = res.statusCode;
          reject(err);
        });
      });
      req.on('timeout', () => {
        try { req.destroy(); } catch (_) {}
        reject(new Error('SmailPro Web timeout'));
      });
      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  }

  // Create 1 email via SmailPro Web Premium Session (Headless Node.js first, automatic CDP fallback if Cloudflare/Cookie needs refresh)
  async function requestOneSmailProWebEmail({ providerFamily, addressType = 'real', server = '2' }) {
    const s = loadSettings();
    let query;
    if (providerFamily === 'gmail') {
      query = { username: 'random', type: addressType || 'real', domain: 'gmail.com', server: String(server || '2') };
    } else if (providerFamily === 'outlook') {
      query = { username: 'random', type: addressType || 'real', domain: 'outlook.com', server: String(server || '2') };
    } else {
      query = { username: 'random', type: 'alias', domain: 'random.com', server: '1' };
    }

    let createdAddr = '';
    let createdTs = 0;
    let createdKey = '';
    let via = 'web_headless';

    if (s.smailproWebCookie) {
      try {
        const qs = new URLSearchParams(query).toString();
        const data = await nodeSmailProWebRequest(`/app/create?${qs}`, { method: 'GET' });
        if (data && data.address) {
          createdAddr = String(data.address).trim().toLowerCase();
          createdTs = Number(data.timestamp) || Math.floor(Date.now() / 1000);
          createdKey = String(data.key || '');
        }
      } catch (_) {}
    }

    if (!createdAddr && browserModeRef && typeof browserModeRef.smailproWebAction === 'function') {
      const res = await browserModeRef.smailproWebAction({
        action: 'web-create',
        query,
        cookieHeader: s.smailproWebCookie || ''
      });
      if (res && res.success && res.address) {
        createdAddr = String(res.address).trim().toLowerCase();
        createdTs = Number(res.timestamp) || Math.floor(Date.now() / 1000);
        createdKey = String(res.key || '');
        via = 'web_premium';
      } else if (res && res.error) {
        throw new Error(res.error);
      }
    }

    if (createdAddr) {
      const email = createdAddr;
      const timestamp = createdTs;
      let key = createdKey;
      const fam = detectProviderFamilyFromEmail(email, providerFamily);

      // Pre-verify inbox health so we NEVER use an Outlook/Gmail pool account whose OAuth refresh token is expired!
      const checkRes = await webFetchInboxMessages({ email, timestamp, key });
      if (checkRes && checkRes.key) key = String(checkRes.key);

      saveEmailInboxKey(email, { timestamp, key });
      // Save to SmailPro Cloud History (so all machines sharing this SmailPro Premium account see it in Cloud History!)
      nodeSmailProWebRequest('/app/history', { method: 'POST', bodyObj: { email } }).catch(() => {});
      if (via === 'web_headless' && browserModeRef && typeof browserModeRef.smailproWebAction === 'function') {
        browserModeRef.smailproWebAction({
          action: 'sync-ui-email',
          emailObj: { address: email, timestamp, key, messages: [] }
        }).catch(() => {});
      }
      return {
        email,
        providerFamily: fam,
        timestamp,
        key,
        via
      };
    }

    throw new Error('ยังไม่ได้ Login เว็บ SmailPro ในระบบบอท — กรุณาเปิดหน้า "⚙️ ตั้งค่าสมัครเมล" แล้วกดปุ่ม "🌐 เปิดหน้าเว็บ SmailPro เพื่อ Login"');
  }

  async function requestOneSmailProEmail({ providerFamily, addressType, apiKey }) {
    if (providerFamily === 'gmail') {
      const res = await smailProGet('/v1/temp_gmail/random', { type: addressType || 'real' }, apiKey);
      return {
        email: String(res?.email || '').trim().toLowerCase(),
        providerFamily: 'gmail',
        timestamp: Number(res?.timestamp) || Math.floor(Date.now() / 1000)
      };
    }
    if (providerFamily === 'outlook') {
      const res = await smailProGet('/v1/temp_outlook/random', { type: addressType || 'real' }, apiKey);
      return {
        email: String(res?.email || '').trim().toLowerCase(),
        providerFamily: 'outlook',
        timestamp: Number(res?.timestamp) || Math.floor(Date.now() / 1000)
      };
    }
    // Generic temp_email create
    const res = await smailProGet('/v1/temp_email/create', {
      email: 'random@random.com',
      expiry_minutes: 30
    }, apiKey);
    return {
      email: String(res?.email || '').trim().toLowerCase(),
      providerFamily: 'temp_email',
      timestamp: Math.floor(Date.now() / 1000)
    };
  }

  async function allocateUniqueSmailProEmail({
    profileId,
    profileName = '',
    password = '',
    charName = '',
    serverName = '',
    existingSet = null
  }) {
    const settings = loadSettings();
    const pref = settings.smailproProvider || 'auto';
    const baseType = settings.smailproAddressType === 'alias' ? 'alias' : 'real';
    const srvPref = settings.smailproServer || 'auto';
    const useWebFirst = settings.smailproAuthMode !== 'api_key' || !settings.smailproApiKey;

    const outlookServers = srvPref === 'auto' ? ['2', '1'] : [srvPref === '3' ? '2' : srvPref, '2', '1'];
    const gmailServers = srvPref === 'auto' ? ['2', '3', '1'] : [srvPref, '2', '3', '1'];

    // Build ordered candidate sequence of (providerFamily, addressType, server) across up to 8 tries
    const sequence = [];
    if (pref === 'auto') {
      sequence.push(
        { providerFamily: 'outlook', addressType: baseType, server: outlookServers[0] },
        { providerFamily: 'gmail', addressType: baseType, server: gmailServers[0] },
        { providerFamily: 'outlook', addressType: baseType, server: outlookServers[1] || '1' },
        { providerFamily: 'gmail', addressType: baseType, server: gmailServers[1] || '3' },
        { providerFamily: 'outlook', addressType: 'alias', server: outlookServers[0] },
        { providerFamily: 'gmail', addressType: 'alias', server: gmailServers[0] },
        { providerFamily: 'gmail', addressType: baseType, server: '1' },
        { providerFamily: 'outlook', addressType: baseType, server: '1' }
      );
    } else if (pref === 'gmail' || pref === 'outlook') {
      const srvs = pref === 'gmail' ? gmailServers : outlookServers;
      const alt = pref === 'gmail' ? 'outlook' : 'gmail';
      sequence.push(
        { providerFamily: pref, addressType: baseType, server: srvs[0] },
        { providerFamily: pref, addressType: baseType, server: srvs[1] || srvs[0] },
        { providerFamily: pref, addressType: baseType, server: srvs[2] || '1' },
        { providerFamily: pref, addressType: 'alias', server: srvs[0] },
        { providerFamily: pref, addressType: 'alias', server: '1' },
        { providerFamily: alt, addressType: baseType, server: '2' }
      );
    } else {
      sequence.push(
        { providerFamily: 'temp_email', addressType: 'alias', server: '1' },
        { providerFamily: 'temp_email', addressType: 'alias', server: '1' },
        { providerFamily: 'outlook', addressType: baseType, server: '2' }
      );
    }

    let lastErr = null;
    // Sync SmailPro Cloud History (/app/history) before allocating so multiple machines sharing 1 SmailPro account never pick the same email!
    await syncSmailProCloudHistory(false).catch(() => {});
    for (let i = 0; i < sequence.length; i++) {
      const step = sequence[i];
      try {
        let created = null;
        if (useWebFirst) {
          try {
            created = await requestOneSmailProWebEmail({
              providerFamily: step.providerFamily,
              addressType: step.addressType,
              server: step.server
            });
          } catch (webErr) {
            lastErr = webErr;
            if (settings.smailproApiKey) {
              created = await requestOneSmailProEmail({
                providerFamily: step.providerFamily,
                addressType: step.addressType,
                apiKey: settings.smailproApiKey
              });
            } else {
              throw webErr;
            }
          }
        } else {
          try {
            created = await requestOneSmailProEmail({
              providerFamily: step.providerFamily,
              addressType: step.addressType,
              apiKey: settings.smailproApiKey
            });
          } catch (apiErr) {
            if (/402|Insufficient credit/i.test(String(apiErr.message || ''))) {
              created = await requestOneSmailProWebEmail({
                providerFamily: step.providerFamily,
                addressType: step.addressType,
                server: step.server
              });
            } else {
              throw apiErr;
            }
          }
        }
        const email = String(created?.email || '').trim().toLowerCase();
        if (!email || !email.includes('@')) continue;

        // 1. Check local registry & active profiles
        if (isEmailUsedLocally(email, existingSet)) {
          console.log(`[SmailPro] ♻️ ข้ามอีเมลซ้ำในเครื่อง "${email}" (รอบ ${i + 1}/${sequence.length}) -> ขออีเมลใหม่...`);
          continue;
        }

        // 2. Check & atomically claim on Central Server across all users/machines
        const centralClaim = await claimAndSyncEmailOnCentral({
          email,
          password,
          provider: `smailpro_${created.providerFamily}`,
          profileId,
          profileName,
          charName,
          serverName,
          status: 'claimed'
        });
        if (centralClaim && centralClaim.duplicate) {
          // Record locally as used so we never try it again
          const reg = loadRegistry();
          if (!reg.usedEmails.includes(email)) {
            reg.usedEmails.push(email);
            saveRegistry(reg);
          }
          console.log(`[SmailPro] 🛡️ ข้ามอีเมล "${email}" ที่เคยถูกใช้ในระบบเซิร์ฟเวอร์กลางแล้ว (${centralClaim.reason}) -> ขออีเมลใหม่...`);
          continue;
        }

        // 3. Record locally as claimed & save active inbox state for OTP polling
        recordAccountLocally({
          profileId,
          profileName,
          username: email,
          password,
          email,
          provider: `smailpro_${created.providerFamily}`,
          charName,
          serverName,
          status: 'claimed'
        });

        activeInboxes.set(profileId, {
          email,
          providerFamily: created.providerFamily,
          createdAtSec: Number(created.timestamp) || (Math.floor(Date.now() / 1000) - 30),
          key: String(created.key || ''),
          lastPollAt: 0,
          readMids: new Map(),
          usedOtps: new Set()
        });

        console.log(`[SmailPro] 📧✅ จองอีเมลใหม่สำเร็จ "${email}" (${created.providerFamily} · ${created.via || 'api'}) สำหรับ ${profileName || profileId}`);
        return {
          success: true,
          email,
          providerFamily: created.providerFamily
        };
      } catch (err) {
        lastErr = err;
      }
    }

    throw lastErr || new Error('ไม่สามารถขออีเมลใหม่ที่ไม่ซ้ำจาก SmailPro ได้');
  }

  async function webFetchInboxMessages({ email, timestamp, key }) {
    const s = loadSettings();
    let curKey = String(key || '');
    let curTs = Number(timestamp) || Math.floor(Date.now() / 1000);
    // 1. Try 100% Headless Node.js HTTPS first (ZERO browser tabs opened!)
    if (s.smailproWebCookie) {
      try {
        const [localPart, domain] = String(email || '').split('@');
        const restoreHeadlessKey = async () => {
          if (!localPart || !domain) return false;
          for (const srv of ['1', '2', '3']) {
            for (const tp of ['alias', 'real']) {
              const rData = await nodeSmailProWebRequest(`/app/create?${new URLSearchParams({ username: localPart, domain, type: tp, server: srv }).toString()}`, { method: 'GET' }).catch(() => null);
              if (rData && rData.key) {
                curKey = String(rData.key);
                curTs = Number(rData.timestamp) || curTs;
                return true;
              }
            }
          }
          return false;
        };
        if (!curKey) {
          await restoreHeadlessKey();
        }
        let first = null;
        for (let attempt = 0; attempt < 2; attempt++) {
          const pArr = await nodeSmailProWebRequest('/app/inbox', {
            method: 'POST',
            bodyObj: [{ address: email, timestamp: curTs, key: curKey }]
          }).catch(() => null);
          first = Array.isArray(pArr) ? pArr[0] : null;
          if (first && first.payload) break;
          if (attempt === 0) {
            const ok = await restoreHeadlessKey();
            if (!ok) break;
          }
        }
        if (first && first.payload) {
          if (first.key) {
            curKey = String(first.key);
            saveEmailInboxKey(email, { timestamp: curTs, key: curKey });
          }
          const fam = detectProviderFamilyFromEmail(email, s.smailproProvider);
          const apiPath = fam === 'gmail'
            ? '/v1/temp_gmail/inbox'
            : (fam === 'outlook' ? '/v1/temp_outlook/inbox' : '/v1/temp_email/inbox');
          const inboxData = await nodeSmailProWebRequest(`https://api.sonjj.com${apiPath}?payload=${encodeURIComponent(first.payload)}`, { method: 'GET' });
          const messages = Array.isArray(inboxData?.messages) ? inboxData.messages : [];
          if (browserModeRef && typeof browserModeRef.smailproWebAction === 'function') {
            browserModeRef.smailproWebAction({
              action: 'sync-ui-email',
              emailObj: { address: email, timestamp: curTs, key: curKey, messages }
            }).catch(() => {});
          }
          return {
            messages,
            key: curKey,
            timestamp: curTs
          };
        }
      } catch (headlessErr) {
        if (/token refresh failed|invalid_client/i.test(String(headlessErr.message || ''))) {
          throw headlessErr;
        }
      }
    }

    // 2. Fallback to single SmailPro browser session (auto-restores from History & refreshes cookies)
    if (browserModeRef && typeof browserModeRef.smailproWebAction === 'function') {
      const res = await browserModeRef.smailproWebAction({
        action: 'web-inbox',
        address: email,
        timestamp: curTs,
        key: curKey,
        cookieHeader: s.smailproWebCookie || ''
      });
      if (res && res.success) {
        if (res.key) saveEmailInboxKey(email, { timestamp: res.timestamp || curTs, key: res.key });
        return {
          messages: Array.isArray(res.messages) ? res.messages : [],
          key: res.key || curKey,
          timestamp: res.timestamp || curTs
        };
      }
      if (res && res.error) throw new Error(res.error);
    }

    throw new Error('ยังไม่ได้เชื่อมต่อเซสชัน SmailPro Web');
  }

  async function webFetchMessageBody({ email, mid }) {
    const s = loadSettings();
    if (s.smailproWebCookie) {
      try {
        const payloadToken = await nodeSmailProWebRequest(`/app/message?${new URLSearchParams({ email, mid }).toString()}`, {
          method: 'GET',
          expectText: true
        });
        if (payloadToken) {
          const fam = detectProviderFamilyFromEmail(email, s.smailproProvider);
          const apiPath = fam === 'gmail'
            ? '/v1/temp_gmail/message'
            : (fam === 'outlook' ? '/v1/temp_outlook/message' : '/v1/temp_email/message');
          const msgData = await nodeSmailProWebRequest(`https://api.sonjj.com${apiPath}?payload=${encodeURIComponent(payloadToken)}`, { method: 'GET' });
          return String(msgData?.body || '');
        }
      } catch (_) {}
    }
    if (browserModeRef && typeof browserModeRef.smailproWebAction === 'function') {
      const res = await browserModeRef.smailproWebAction({
        action: 'web-message',
        address: email,
        mid,
        cookieHeader: s.smailproWebCookie || ''
      });
      if (res && res.success && res.body) return String(res.body);
    }
    throw new Error('ไม่สามารถอ่านเนื้อหาอีเมลจาก SmailPro Web ได้');
  }

  async function pollOtp({ profileId, email, rejectedCode = '' }) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, status: 'error', message: 'ไม่มีอีเมลสำหรับเช็ก OTP' };
    }
    const settings = loadSettings();
    const diskKeyInfo = getEmailInboxKey(cleanEmail);
    let state = activeInboxes.get(profileId);
    if (!state || state.email !== cleanEmail) {
      state = {
        email: cleanEmail,
        providerFamily: detectProviderFamilyFromEmail(cleanEmail, settings.smailproProvider),
        createdAtSec: Number(diskKeyInfo?.timestamp) || (Math.floor(Date.now() / 1000) - 300),
        key: String(diskKeyInfo?.key || ''),
        lastPollAt: 0,
        readMids: new Map(),
        usedOtps: new Set()
      };
      activeInboxes.set(profileId, state);
    } else if (!state.key && diskKeyInfo?.key) {
      state.key = String(diskKeyInfo.key);
      if (diskKeyInfo.timestamp) state.createdAtSec = Number(diskKeyInfo.timestamp);
    }
    if (rejectedCode) {
      state.usedOtps.add(String(rejectedCode).trim());
    }

    // Throttle SmailPro /inbox polling to once every 4.5s (IMAP syncs every 5-10s)
    const now = Date.now();
    if (now - state.lastPollAt < 4500) {
      return {
        success: true,
        status: 'polling_otp',
        email: cleanEmail,
        message: `📨 กำลังรออีเมลรหัส OTP 6 หลักจาก SmailPro (${cleanEmail})...`
      };
    }
    state.lastPollAt = now;

    const useWebFirst = settings.smailproAuthMode !== 'api_key' || Boolean(state.key) || !settings.smailproApiKey;

    try {
      const fam = state.providerFamily;
      let messages = [];
      let usedWebForInbox = false;

      if (useWebFirst) {
        try {
          const webInbox = await webFetchInboxMessages({
            email: cleanEmail,
            timestamp: state.createdAtSec,
            key: state.key
          });
          if (webInbox.key) state.key = webInbox.key;
          if (webInbox.timestamp) state.createdAtSec = webInbox.timestamp;
          messages = webInbox.messages;
          usedWebForInbox = true;
        } catch (webErr) {
          if (!settings.smailproApiKey) throw webErr;
        }
      }

      if (!usedWebForInbox) {
        let inboxRes = null;
        try {
          if (fam === 'gmail') {
            inboxRes = await smailProGet('/v1/temp_gmail/inbox', {
              email: cleanEmail,
              timestamp: state.createdAtSec
            });
          } else if (fam === 'outlook') {
            inboxRes = await smailProGet('/v1/temp_outlook/inbox', {
              email: cleanEmail,
              timestamp: state.createdAtSec
            });
          } else {
            inboxRes = await smailProGet('/v1/temp_email/inbox', {
              email: cleanEmail
            });
          }
          messages = Array.isArray(inboxRes?.messages) ? inboxRes.messages : [];
        } catch (apiErr) {
          if (/402|Insufficient credit/i.test(String(apiErr.message || ''))) {
            const webInbox = await webFetchInboxMessages({
              email: cleanEmail,
              timestamp: state.createdAtSec,
              key: state.key
            });
            if (webInbox.key) state.key = webInbox.key;
            if (webInbox.timestamp) state.createdAtSec = webInbox.timestamp;
            messages = webInbox.messages;
            usedWebForInbox = true;
          } else {
            throw apiErr;
          }
        }
      }

      for (const msg of messages) {
        const mid = String(msg?.mid || '').trim();
        const subj = String(msg?.textSubject || '');
        const from = String(msg?.textFrom || '');

        // 1. Check if the 6-digit OTP is already in the subject line (saves message-read credits!)
        if (/night\s*camp|nightcamp|verify|verification|ยืนยัน|รหัส|otp|code/i.test(subj + ' ' + from)) {
          const subjCode = extractSixDigitOtpFromText(subj, state.usedOtps);
          if (subjCode) {
            state.usedOtps.add(subjCode);
            return {
              success: true,
              status: 'otp_found',
              otpCode: subjCode,
              email: cleanEmail,
              message: `✅ ดึงรหัส OTP 6 หลัก (${subjCode}) จาก SmailPro สำเร็จ!`
            };
          }
        }

        if (!mid) continue;

        // 2. Fetch full message body (cached by mid so each message is fetched at most ONCE)
        let bodyHtml = state.readMids.get(mid);
        if (bodyHtml === undefined) {
          if (usedWebForInbox) {
            bodyHtml = await webFetchMessageBody({ email: cleanEmail, mid });
          } else {
            let msgRes = null;
            if (fam === 'gmail') {
              msgRes = await smailProGet('/v1/temp_gmail/message', { email: cleanEmail, mid });
            } else if (fam === 'outlook') {
              msgRes = await smailProGet('/v1/temp_outlook/message', { email: cleanEmail, mid });
            } else {
              msgRes = await smailProGet('/v1/temp_email/message', { email: cleanEmail, mid });
            }
            bodyHtml = String(msgRes?.body || '');
          }
          state.readMids.set(mid, bodyHtml);
        }

        const plain = stripHtmlToText(bodyHtml);
        const combined = `${from} ${subj} ${plain}`;
        if (!/night\s*camp|nightcamp|verify|verification|ยืนยัน|รหัส|otp|code/i.test(combined) && messages.length > 1) {
          continue;
        }
        const otpCode = extractSixDigitOtpFromText(`${subj} ${plain}`, state.usedOtps);
        if (otpCode) {
          state.usedOtps.add(otpCode);
          return {
            success: true,
            status: 'otp_found',
            otpCode,
            email: cleanEmail,
            message: `✅ ดึงรหัส OTP 6 หลัก (${otpCode}) จาก SmailPro สำเร็จ!`
          };
        }
      }

      return {
        success: true,
        status: 'polling_otp',
        email: cleanEmail,
        message: `📨 กำลังเช็กกล่องจดหมาย SmailPro (${cleanEmail}) · พบ ${messages.length} ข้อความ...`
      };
    } catch (err) {
      return {
        success: false,
        status: 'polling_otp',
        email: cleanEmail,
        message: `⚠️ SmailPro OTP: ${err.message}`
      };
    }
  }

  async function openWebLoginWindow({ stayOnHome = false } = {}) {
    if (!browserModeRef || typeof browserModeRef.smailproWebAction !== 'function') {
      return { success: false, error: 'ระบบ Browser Mode ยังไม่พร้อมใช้งาน' };
    }
    const s = loadSettings();
    const res = await browserModeRef.smailproWebAction({
      action: 'open-login',
      stayOnHome,
      cookieHeader: s.smailproWebCookie
    });
    if (res && res.success) {
      onWebSessionHarvested(res);
    }
    return res;
  }

  async function checkWebSession({ ensureTab = false, cookieHeader = '' } = {}) {
    if (!browserModeRef || typeof browserModeRef.smailproWebAction !== 'function') {
      return { success: false, error: 'ระบบ Browser Mode ยังไม่พร้อมใช้งาน' };
    }
    const cleanInject = String(cookieHeader || '').trim();
    const s = loadSettings();
    const isNewManualCookie = Boolean(cleanInject && cleanInject !== String(s.smailproWebCookie || '').trim());
    if (isNewManualCookie) {
      saveSettings({ smailproWebCookie: cleanInject, mode: 'smailpro', smailproAuthMode: 'web' });
    }
    const res = await browserModeRef.smailproWebAction({
      action: isNewManualCookie ? 'inject-cookies' : 'check-session',
      ensureTab,
      cookieHeader: isNewManualCookie ? cleanInject : ''
    });
    if (res && res.success) {
      onWebSessionHarvested(res);
    }
    return {
      ...res,
      settings: loadSettings()
    };
  }

  async function testWebCreate({ provider = 'auto', addressType = 'real', server = 'auto', cookieHeader = '' } = {}) {
    try {
      if (cookieHeader) {
        await checkWebSession({ ensureTab: true, cookieHeader });
      }
      const fam = provider === 'gmail' ? 'gmail' : (provider === 'temp_email' ? 'temp_email' : 'outlook');
      const srv = (server && server !== 'auto') ? String(server) : '2';
      const created = await requestOneSmailProWebEmail({
        providerFamily: fam,
        addressType: addressType === 'alias' ? 'alias' : 'real',
        server: srv
      });
      if (created && created.email) {
        saveSettings({ mode: 'smailpro', smailproAuthMode: 'web' });
        const latest = loadSettings();
        return {
          success: true,
          email: created.email,
          providerFamily: created.providerFamily,
          isLoggedIn: latest.smailproWebLoggedIn,
          isPremium: latest.smailproWebIsPremium,
          message: `✅ ดึงอีเมลจาก SmailPro Web ${latest.smailproWebIsPremium ? '👑 Premium' : ''} สำเร็จ! (${created.email}) — ไม่เสีย API Credit!`
        };
      }
      return { success: false, error: 'ไม่ได้รับอีเมลจาก SmailPro Web' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async function testApiKey({ apiKey, provider = 'auto', addressType = 'real' }) {
    const cleanKey = String(apiKey || '').trim();
    if (!cleanKey) {
      return { success: false, error: 'กรุณากรอก SmailPro API Key ก่อนกดทดสอบ' };
    }
    const fam = provider === 'outlook' ? 'outlook' : (provider === 'temp_email' ? 'temp_email' : 'gmail');
    try {
      const res = await requestOneSmailProEmail({
        providerFamily: fam,
        addressType: addressType === 'alias' ? 'alias' : 'real',
        apiKey: cleanKey
      });
      if (res && res.email) {
        return {
          success: true,
          email: res.email,
          providerFamily: res.providerFamily,
          message: `✅ เชื่อมต่อ SmailPro API สำเร็จ! ทดสอบดึงอีเมล: ${res.email}`
        };
      }
      return { success: false, error: 'เชื่อมต่อได้แต่ไม่ได้รับอีเมลกลับมา' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  function getStatusSummary() {
    const settings = loadSettings();
    const reg = loadRegistry();
    const mergedAccounts = mergeWithOwnerCentralDbAccounts(reg.accounts);
    const { usedEmails: centralDbUsed } = readOwnerCentralDbAccounts();
    const totalUsedSet = new Set([
      ...reg.usedEmails.map(e => String(e || '').toLowerCase()),
      ...Array.from(centralDbUsed),
      ...Array.from(centralRestoredEmailsCache)
    ]);
    return {
      settings,
      effectiveMode: getMode(),
      stats: {
        totalUsedEmails: totalUsedSet.size,
        totalRegisteredAccounts: mergedAccounts.filter(a => a.password).length,
        totalTrackedAccounts: mergedAccounts.length,
        txtExportPath: txtExportFile
      },
      accounts: mergedAccounts.slice(0, 300)
    };
  }

  function exportAccountsText() {
    const reg = loadRegistry();
    const all = mergeWithOwnerCentralDbAccounts(reg.accounts);
    writeTxtExport(reg.accounts);
    const lines = [
      '# ==========================================================================',
      '# Nightcamp Registered Email & SmailPro Accounts (ID | Password | Email)',
      `# ส่งออกเมื่อ: ${new Date().toLocaleString('th-TH')} (ทั้งหมด ${all.length} บัญชี)`,
      '# รูปแบบ: ID | Password | Email | ระบบเมล | ชื่อตัวละคร | เครื่อง | เวลา',
      '# =========================================================================='
    ];
    for (const a of all) {
      if (!a || (!a.username && !a.email)) continue;
      const id = String(a.username || a.email || '').trim();
      const pass = String(a.password || '').trim();
      const email = String(a.email || a.username || '').trim();
      const prov = String(a.provider || 'smailpro').trim();
      const ch = String(a.charName || '-').trim();
      const mach = String(a.machineName || '-').trim();
      const dt = a.updatedAt ? new Date(a.updatedAt).toLocaleString('th-TH') : '-';
      lines.push(`${id} | ${pass} | ${email} | ${prov} | ${ch} | ${mach} | ${dt}`);
    }
    return lines.join('\r\n') + '\r\n';
  }

  return {
    setBrowserMode,
    onWebSessionHarvested,
    loadSettings,
    saveSettings,
    getMode,
    isEmailUsedLocally,
    allocateUniqueSmailProEmail,
    pollOtp,
    recordRegisteredAccount,
    recordAccountLocally,
    openWebLoginWindow,
    checkWebSession,
    testWebCreate,
    testApiKey,
    getStatusSummary,
    exportAccountsText,
    syncSmailProCloudHistory,
    findEmailByMaskOrHistory,
    maskNightcampEmail,
    isKnownManagedEmail
  };
}

module.exports = {
  createSmailProService,
  emailToCentralLockProfileId
};
