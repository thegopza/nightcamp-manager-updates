// manager/manager_self_update.js — keep the Manager itself (manager/ folder) up to date.
//
// server.js runs as a thin supervisor (the process PelicanManager.exe started) plus a child that is
// the real server. Exiting the child with RESTART_EXIT_CODE makes the supervisor start it again, so
// server code can be refreshed without restarting PelicanManager.exe (which would also close every
// game window via its job object). Game clients are spawned detached and survive server restarts.
//
// Two modes:
//   release  (no .git next to manager/): compare every manager/ file with GitHub by git blob sha,
//            download changed files from the exact commit, back up the old ones, then restart.
//   git/dev  (running from a git checkout): never download over local work. Instead, notice when
//            local files differ from what this server loaded and restart once they're committed.
// Browsers pick up new web files by themselves (status exposes webBuild / serverStartedAt).

const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const { MANAGER_UPDATE_REPO, getMainHeadSha, apiGetJSON } = require('./github_check');
const RESTART_EXIT_CODE = 75;
const CHECK_MS = 10 * 60 * 1000;
const LOCAL_SCAN_MS = 30 * 1000;
// User data and runtime state are never overwritten
const EXCLUDE = /^(profiles|plans|presets|settings)(\.backup)?\.json$|^data\/|^sessions\//;

function getBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'PmheeAether-Manager' }, timeout: 30000 }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => res.statusCode === 200 ? resolve(Buffer.concat(chunks)) : reject(new Error(`HTTP ${res.statusCode}`)));
    }).on('error', reject).on('timeout', function () { this.destroy(new Error('timeout')); });
  });
}

const blobSha = buf => crypto.createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex');
const sha256Hex = buf => crypto.createHash('sha256').update(buf).digest('hex');
const isText = buf => !buf.includes(0);
// Git stores text with LF; checkouts may have CRLF. A file matches if either form hashes the same.
function fileMatches(buf, sha, sha256) {
  if (sha) {
    if (blobSha(buf) === sha) return true;
    if (isText(buf) && blobSha(Buffer.from(buf.toString('utf8').replace(/\r\n/g, '\n'), 'utf8')) === sha) return true;
  }
  if (sha256) {
    if (sha256Hex(buf) === sha256) return true;
    if (isText(buf) && sha256Hex(Buffer.from(buf.toString('utf8').replace(/\r\n/g, '\n'), 'utf8')) === sha256) return true;
  }
  return false;
}
const OWNER_API_ORIGIN = (process.env.PMHEE_OWNER_API_ORIGIN || 'https://api.noggunsshop.xyz').replace(/\/+$/, '');
const isWebFile = rel => rel.startsWith('public/');

function listFiles(dir, base = dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = path.relative(base, full).split(path.sep).join('/');
    if (EXCLUDE.test(rel) || name === 'node_modules') continue;
    const st = fs.statSync(full);
    if (st.isDirectory()) out.push(...listFiles(full, base));
    else out.push(rel);
  }
  return out;
}

function createManagerSelfUpdater({ managerDir, dataDir, isBusy }) {
  const stateFile = path.join(dataDir, 'manager_update_state.json');
  const pendingMarker = path.join(dataDir, 'manager_update_pending.json');
  const failedFile = path.join(dataDir, 'manager_update_failed.json');
  const failedSha = () => { try { return JSON.parse(fs.readFileSync(failedFile, 'utf8')).sha || null; } catch (e) { return null; } };
  let saved = { enabled: true };
  try { saved = Object.assign(saved, JSON.parse(fs.readFileSync(stateFile, 'utf8'))); } catch (e) {}

  const repoRoot = path.resolve(managerDir, '..');
  const gitMode = fs.existsSync(path.join(repoRoot, '.git'));
  const supervised = typeof process.send === 'function' && process.env.PELICAN_SERVER_CHILD === '1';

  const hashFile = rel => {
    try { return crypto.createHash('sha1').update(fs.readFileSync(path.join(managerDir, rel))).digest('hex'); } catch (e) { return null; }
  };
  const snapshot = () => {
    const map = {};
    for (const rel of listFiles(managerDir)) map[rel] = hashFile(rel);
    return map;
  };
  const webBuildOf = snap => crypto.createHash('sha1')
    .update(Object.keys(snap).filter(isWebFile).sort().map(k => `${k}:${snap[k]}`).join('|')).digest('hex').slice(0, 12);

  // What this server process loaded at start (server-side files) and serves now (web files)
  const startSnap = snapshot();
  const status = {
    enabled: saved.enabled !== false,
    mode: gitMode ? 'git' : 'release',
    supervised,
    serverStartedAt: Date.now(),
    webBuild: webBuildOf(startSnap),
    lastCheckAt: null,
    lastError: null,
    latest: null,          // release mode: { sha, message, date }
    pending: [],           // [{ path, kind: 'server' | 'web' }]
    applying: false,
    lastApplied: saved.lastApplied || null,
    note: ''
  };

  const persist = () => {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(stateFile, JSON.stringify({ enabled: status.enabled, lastApplied: status.lastApplied }, null, 2));
    } catch (e) {}
  };

  let restartQueued = false;
  let restartReason = null;
  function restartBlocked() {
    try {
      if (!isBusy()) return false;
      status.note = 'รอให้รีเฟรชเกมหรือรวมเงินเสร็จก่อนรีสตาร์ท Manager server';
    } catch (e) {
      status.note = 'ตรวจสอบสถานะเกมไม่ได้ — รอรีสตาร์ท Manager server';
    }
    return true;
  }
  function restartSourcesReady() {
    if (!gitMode) return true;
    try {
      const now = snapshot();
      const changedServer = Object.keys(now).filter(rel => !isWebFile(rel) && now[rel] !== startSnap[rel]);
      if (changedServer.every(rel => gitClean(rel) && syntaxOk(rel))) return true;
      status.note = 'ไฟล์ server ในเครื่องถูกแก้ แต่ยังไม่ commit หรือมี syntax error — ยังไม่รีสตาร์ท';
    } catch (e) {
      status.note = 'ตรวจสอบไฟล์ server ไม่ได้ — ยังไม่รีสตาร์ท';
    }
    return false;
  }
  function scheduleRestart(reason) {
    if (!supervised) {
      status.note = 'ไฟล์ฝั่ง server อัปเดตแล้ว แต่ต้องปิด-เปิด PelicanManager.exe เองหนึ่งครั้ง (เวอร์ชันนี้ยังไม่มีตัว supervisor)';
      return false;
    }
    restartReason = reason;
    if (restartBlocked()) return false;
    if (!restartSourcesReady()) return false;
    if (restartQueued) return true;
    restartQueued = true;
    console.log(`[Manager Update] ♻️ ${reason} — restarting server (game windows stay open)`);
    status.note = 'กำลังรีสตาร์ท Manager server...';
    setTimeout(() => {
      restartQueued = false;
      // Game refresh can start after this timer was queued. Check again at the exit boundary.
      if (restartBlocked()) return;
      if (!restartSourcesReady()) return;
      process.exit(RESTART_EXIT_CODE);
    }, 1500);
    return true;
  }

  // ---------- git/dev mode: react to local commits ----------
  function gitClean(rel) {
    try {
      const out = execFileSync('git', ['status', '--porcelain', '--', path.join('manager', rel)], { cwd: repoRoot, encoding: 'utf8', timeout: 5000 });
      return out.trim() === '';
    } catch (e) { return false; }
  }
  function syntaxOk(rel) {
    if (!rel.endsWith('.js')) return true;
    try { execFileSync(process.execPath, ['--check', path.join(managerDir, rel)], { timeout: 10000, stdio: 'ignore' }); return true; } catch (e) { return false; }
  }

  function scanLocal() {
    const now = snapshot();
    status.webBuild = webBuildOf(now);   // browsers reload when this changes
    const changedServer = Object.keys(now).filter(rel => !isWebFile(rel) && now[rel] !== startSnap[rel]);
    status.pending = changedServer.map(p => ({ path: p, kind: 'server' }));
    status.lastCheckAt = Date.now();
    if (!changedServer.length) { status.note = ''; return; }
    const ready = changedServer.every(rel => gitClean(rel) && syntaxOk(rel));
    if (!ready) {
      status.note = 'ไฟล์ server ในเครื่องถูกแก้ แต่ยังไม่ commit หรือมี syntax error — ยังไม่รีสตาร์ท';
      return;
    }
    status.note = 'ไฟล์ server ในเครื่องถูก commit แล้ว รอรีสตาร์ท';
    if (status.enabled) scheduleRestart(restartReason || `local commit: ${changedServer.join(', ')}`);
  }

  // ---------- release mode: pull manager/ from Owner Central API first (zero GitHub rate limit), then GitHub Raw distribution.json, then GitHub API ----------
  let checked = { head: null, treeSha: null, files: null, source: null };
  async function checkRemote() {
    status.lastCheckAt = Date.now();
    try {
      let loadedFromMirror = false;
      // 1. Primary: Owner Central API (https://api.noggunsshop.xyz/v1/aetheria/pmheenc/manager-updates/manifest) — 0 GitHub rate limit!
      try {
        const rawBuf = await getBuffer(`${OWNER_API_ORIGIN}/v1/aetheria/pmheenc/manager-updates/manifest?t=${Date.now()}`);
        const manifest = JSON.parse(rawBuf.toString('utf8'));
        if (manifest && manifest.success && Array.isArray(manifest.files) && manifest.files.length > 0) {
          checked.head = String(manifest.sourceCommit || manifest.treeSha || 'latest');
          checked.treeSha = String(manifest.treeSha || manifest.sourceCommit || checked.head);
          checked.files = manifest.files
            .map(f => ({
              path: String(f.path || '').replace(/^manager\//, ''),
              sha: f.sha || null,
              sha256: f.sha256 || null
            }))
            .filter(f => f.path && (f.sha || f.sha256));
          checked.source = 'owner-api';
          loadedFromMirror = checked.files.length > 0;
        }
      } catch (_) {}

      // 2. Secondary: GitHub Smart-HTTP ref + raw.githubusercontent.com/distribution.json (still 0 calls to api.github.com!)
      if (!loadedFromMirror) {
        const head = await getMainHeadSha(MANAGER_UPDATE_REPO);
        if (checked.head !== head || !checked.files) {
          try {
            const distBuf = await getBuffer(`https://raw.githubusercontent.com/${MANAGER_UPDATE_REPO}/${head}/distribution.json`);
            const dist = JSON.parse(distBuf.toString('utf8'));
            if (dist && Array.isArray(dist.files) && dist.files.length > 0) {
              const files = dist.files
                .filter(f => f && typeof f.path === 'string' && f.path.startsWith('manager/'))
                .map(f => ({
                  path: f.path.slice('manager/'.length),
                  sha: f.sha || null,
                  sha256: f.sha256 || null
                }))
                .filter(f => f.path && (f.sha || f.sha256));
              if (files.length > 0) {
                checked.files = files;
                checked.treeSha = crypto.createHash('sha1')
                  .update(files.map(x => `${x.path}:${x.sha || x.sha256}`).sort().join('|'))
                  .digest('hex');
                checked.head = head;
                checked.source = 'github-raw';
                loadedFromMirror = true;
              }
            }
          } catch (_) {}
        } else {
          loadedFromMirror = true;
        }

        // 3. Tertiary fallback: GitHub Tree API
        if (!loadedFromMirror && checked.head !== head) {
          const root = await apiGetJSON(`https://api.github.com/repos/${MANAGER_UPDATE_REPO}/git/trees/${head}`);
          const dir = (root.tree || []).find(e => e.path === 'manager' && e.type === 'tree');
          if (!dir) throw new Error('ไม่พบโฟลเดอร์ manager/ บน GitHub');
          if (dir.sha !== checked.treeSha || !checked.files) {
            const tree = await apiGetJSON(`https://api.github.com/repos/${MANAGER_UPDATE_REPO}/git/trees/${dir.sha}?recursive=1`);
            checked.files = (tree.tree || []).filter(e => e.type === 'blob').map(e => ({ path: e.path, sha: e.sha, sha256: null }));
            checked.treeSha = dir.sha;
          }
          checked.head = head;
          checked.source = 'github-api';
        }
      }

      const pending = [];
      for (const e of (checked.files || [])) {
        const rel = e.path;
        if (EXCLUDE.test(rel)) continue;
        let buf = null;
        try { buf = fs.readFileSync(path.join(managerDir, rel)); } catch (err) {}
        if (!buf || !fileMatches(buf, e.sha, e.sha256)) {
          pending.push({ path: rel, kind: isWebFile(rel) ? 'web' : 'server', sha: e.sha || null, sha256: e.sha256 || null });
        }
      }
      status.latest = {
        sha: checked.head,
        treeSha: checked.treeSha,
        source: checked.source || 'owner-api',
        message: `manager/ ${(checked.treeSha || checked.head || '').slice(0, 7)}`,
        date: Date.now()
      };
      status.pending = pending;
      status.lastError = null;
    } catch (e) {
      status.lastError = `เช็กอัปเดตไม่สำเร็จ: ${e.message}`;
    }
  }

  async function downloadVerifiedManagerFile(f, sha) {
    const candidateUrls = [
      `${OWNER_API_ORIGIN}/v1/aetheria/pmheenc/manager-updates/file?path=${encodeURIComponent(f.path)}&t=${Date.now()}`,
      ...(sha && /^[0-9a-f]{40}$/i.test(sha) ? [`https://raw.githubusercontent.com/${MANAGER_UPDATE_REPO}/${sha}/manager/${f.path}`] : []),
      `https://raw.githubusercontent.com/${MANAGER_UPDATE_REPO}/main/manager/${f.path}?t=${Date.now()}`
    ];
    let lastErr = null;
    for (const url of candidateUrls) {
      try {
        const buf = await getBuffer(url);
        if (fileMatches(buf, f.sha, f.sha256)) {
          return buf;
        }
        lastErr = new Error(`แฮชไฟล์ ${f.path} ไม่ตรงกับต้นฉบับ`);
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error(`ดาวน์โหลดไฟล์ ${f.path} ไม่สำเร็จ`);
  }

  async function applyRemote() {
    if (status.applying || !status.latest || !status.pending.length) return { success: false, error: 'ไม่มีอัปเดต' };
    status.applying = true;
    const sha = status.latest.sha;
    const files = status.pending.slice();
    try {
      // 1. Download everything first (from Owner API first, fallback to GitHub Raw) and verify against git blob sha / sha256
      const downloads = [];
      for (const f of files) {
        const buf = await downloadVerifiedManagerFile(f, sha);
        downloads.push({ f, buf });
      }
      // 2. Back up current files, then write the new ones
      const backupDir = path.join(dataDir, 'update_backup', new Date().toISOString().replace(/[:.]/g, '-'));
      const backedUp = [];
      for (const { f, buf } of downloads) {
        const target = path.join(managerDir, f.path);
        if (fs.existsSync(target)) {
          fs.mkdirSync(path.dirname(path.join(backupDir, f.path)), { recursive: true });
          fs.copyFileSync(target, path.join(backupDir, f.path));
          backedUp.push(f.path);
        }
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(`${target}.updating`, buf);
        fs.renameSync(`${target}.updating`, target);
      }
      status.lastApplied = { sha, at: Date.now(), files: files.map(f => f.path) };
      try { fs.unlinkSync(failedFile); } catch (e) {}
      persist();
      status.pending = [];
      status.webBuild = webBuildOf(snapshot());
      if (files.some(f => f.kind === 'server')) {
        // The supervisor restores these backups if the updated server fails to start
        fs.writeFileSync(pendingMarker, JSON.stringify({ backupDir, files: backedUp, sha: status.latest.treeSha || sha, at: Date.now() }));
        scheduleRestart(`update ${sha.slice(0, 7)}`);
      }
      else status.note = 'อัปเดตหน้าเว็บแล้ว (ไม่ต้องรีสตาร์ท)';
      return { success: true, files: files.length };
    } catch (e) {
      status.lastError = `อัปเดตไม่สำเร็จ: ${e.message}`;
      return { success: false, error: status.lastError };
    } finally {
      status.applying = false;
    }
  }

  async function tick() {
    if (gitMode) return scanLocal();
    // A deferred restart must survive pending being cleared after files were applied.
    if (status.enabled && restartReason) scheduleRestart(restartReason);
    await checkRemote();
    if (status.latest && (status.latest.treeSha || status.latest.sha) === failedSha()) {
      status.lastError = `เวอร์ชัน ${(status.latest.treeSha || status.latest.sha).slice(0, 7)} เปิด server ไม่ขึ้น ระบบคืนไฟล์เดิมแล้ว — จะไม่อัปเดตอัตโนมัติจนกว่าจะมีเวอร์ชันใหม่ (กดอัปเดตเองได้)`;
      return;
    }
    if (status.enabled && status.pending.length && !restartBlocked()) await applyRemote();
  }

  function start() {
    // Server came up fine after an update: drop the rollback marker once it has been stable for a bit
    setTimeout(() => { try { fs.unlinkSync(pendingMarker); } catch (e) {} }, 20000);
    if (gitMode) setInterval(scanLocal, LOCAL_SCAN_MS);
    else { setTimeout(tick, 90 * 1000); setInterval(tick, CHECK_MS); }
  }

  async function handleRoute(req, res, pathname, sendJSON) {
    if (pathname === '/api/manager-update/status' && req.method === 'GET') {
      sendJSON({ success: true, ...status, pending: status.pending.map(p => ({ path: p.path, kind: p.kind })) });
      return true;
    }
    if (pathname === '/api/manager-update/settings' && req.method === 'POST') {
      let body = '';
      req.on('data', c => body += c);
      await new Promise(r => req.on('end', r));
      try {
        const p = JSON.parse(body || '{}');
        if (typeof p.enabled === 'boolean') { status.enabled = p.enabled; persist(); }
        sendJSON({ success: true, enabled: status.enabled });
      } catch (e) {
        sendJSON({ success: false, error: 'Invalid JSON' }, 400);
      }
      return true;
    }
    if (pathname === '/api/manager-update/check' && req.method === 'POST') {
      if (gitMode) scanLocal(); else await checkRemote();
      sendJSON({ success: true, pending: status.pending.length });
      return true;
    }
    if (pathname === '/api/manager-update/apply' && req.method === 'POST') {
      if (gitMode) {
        const changed = status.pending.map(p => p.path);
        if (!changed.length) { sendJSON({ success: false, error: 'ไม่มีไฟล์ server ที่เปลี่ยน' }); return true; }
        if (!changed.every(syntaxOk)) { sendJSON({ success: false, error: 'มีไฟล์ syntax error — ยังรีสตาร์ทไม่ได้' }); return true; }
        const ok = scheduleRestart('manual restart (git mode)');
        sendJSON(ok ? { success: true, restarting: true } : { success: false, error: status.note });
        return true;
      }
      const r = await applyRemote();
      sendJSON(r);
      return true;
    }
    return false;
  }

  return { start, handleRoute, status };
}

module.exports = { createManagerSelfUpdater, RESTART_EXIT_CODE };
