// manager/credentials.js — game passwords per profile, kept OUT of profiles.json.
// profiles.json is tracked in the (public) git repo; this file (data/credentials.json) is git-ignored and
// never touched by the Manager self-update or shipped in the release zip.
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'data', 'credentials.json');
const BACKUP_FILE = path.join(__dirname, 'data', 'credentials.backup.json');
let memCache = null;
let memCacheMtimeMs = -1;
let memCacheCheckedAt = 0;

function getFileMtimeMs(filePath) {
  try {
    return fs.statSync(filePath).mtimeMs;
  } catch (_) {
    return -1;
  }
}

function writeAtomic(filePath, obj) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const text = JSON.stringify(obj, null, 2);
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(tmp, text, 'utf8');
    fs.renameSync(tmp, filePath);
  } catch (e) {
    try { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch (_) {}
    fs.writeFileSync(filePath, text, 'utf8');
  }
}

function readJsonObj(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  } catch (_) {}
  return null;
}

function loadAll() {
  const now = Date.now();
  if (memCache !== null && (now - memCacheCheckedAt < 3000)) {
    return { ...memCache };
  }
  const mtime = getFileMtimeMs(FILE);
  if (memCache !== null && mtime >= 0 && mtime === memCacheMtimeMs) {
    memCacheCheckedAt = now;
    return { ...memCache };
  }
  const primary = readJsonObj(FILE);
  if (primary && Object.keys(primary).length > 0) {
    memCache = { ...primary };
    memCacheMtimeMs = mtime >= 0 ? mtime : getFileMtimeMs(FILE);
    memCacheCheckedAt = now;
    if (!fs.existsSync(BACKUP_FILE)) {
      try { writeAtomic(BACKUP_FILE, primary); } catch (_) {}
    }
    return { ...primary };
  }
  const backup = readJsonObj(BACKUP_FILE);
  if (backup && Object.keys(backup).length > 0) {
    memCache = { ...backup };
    try { writeAtomic(FILE, backup); } catch (_) {}
    memCacheMtimeMs = getFileMtimeMs(FILE);
    memCacheCheckedAt = now;
    return { ...backup };
  }
  if (memCache && Object.keys(memCache).length > 0) {
    memCacheCheckedAt = now;
    return { ...memCache };
  }
  if (primary !== null) {
    memCache = { ...primary };
    memCacheMtimeMs = mtime >= 0 ? mtime : getFileMtimeMs(FILE);
    memCacheCheckedAt = now;
    return { ...primary };
  }
  memCacheCheckedAt = now;
  return {};
}

function saveAll(all) {
  const safe = (all && typeof all === 'object' && !Array.isArray(all)) ? all : {};
  memCache = { ...safe };
  writeAtomic(FILE, safe);
  memCacheMtimeMs = getFileMtimeMs(FILE);
  memCacheCheckedAt = Date.now();
  if (Object.keys(safe).length > 0) {
    try { writeAtomic(BACKUP_FILE, safe); } catch (_) {}
  }
}

const getPassword = id => (loadAll()[id] || {}).password || '';
function setPassword(id, password) {
  const all = loadAll();
  if (password) all[id] = { password, updatedAt: Date.now() };
  else delete all[id];
  saveAll(all);
}
function listProfileIds() {
  const all = loadAll();
  return Object.keys(all).filter(id => Boolean(all[id] && all[id].password));
}

module.exports = { getPassword, setPassword, listProfileIds };

