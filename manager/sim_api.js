/* Nightcamp SS2 Build Simulator — Manager Backend REST API Module (/api/sim/*)
 * Loaded cleanly by manager/server.js. Shares manager/public/sim_engine.js with browser & MCP.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const Engine = require('./public/sim_engine.js');

const WIKI_PATH = path.join(__dirname, 'public', 'wiki', 'data.json');
const DATA_DIR = path.join(__dirname, 'data');
const BUILDS_FILE = path.join(DATA_DIR, 'sim_builds.json');
const UI_PUSH_FILE = path.join(DATA_DIR, 'sim_ui_push.json');

let cachedIdx = null;
function getIdx() {
  if (cachedIdx) return cachedIdx;
  const raw = JSON.parse(fs.readFileSync(WIKI_PATH, 'utf8'));
  cachedIdx = Engine.createIndex(raw);
  return cachedIdx;
}

function ensureDataDir() {
  try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {}
}

function readJsonFile(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJsonFile(file, obj) {
  ensureDataDir();
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

function loadBuilds() {
  const list = readJsonFile(BUILDS_FILE, []);
  return Array.isArray(list) ? list : [];
}

function saveBuildRecord(build) {
  const idx = getIdx();
  const norm = Engine.normalizeBuild(idx, build);
  const list = loadBuilds();
  const i = list.findIndex(b => b && b.id === norm.id);
  if (i >= 0) list[i] = norm;
  else list.unshift(norm);
  writeJsonFile(BUILDS_FILE, list.slice(0, 100));
  return norm;
}

function deleteBuildRecord(id) {
  const list = loadBuilds();
  const next = list.filter(b => b && b.id !== id);
  writeJsonFile(BUILDS_FILE, next);
  return next.length !== list.length;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', chunk => { raw += chunk; if (raw.length > 2 * 1024 * 1024) reject(new Error('Body too large')); });
    req.on('end', () => {
      if (!raw.trim()) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (e) { reject(new Error('Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

async function handleSimApi(req, res, pathname, urlObj, deps = {}) {
  if (!pathname.startsWith('/api/sim')) return false;
  const sendJSON = deps.sendJSON || ((obj, status = 200) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(obj));
  });

  try {
    const idx = getIdx();

    // GET /api/sim/builds
    if (pathname === '/api/sim/builds' && req.method === 'GET') {
      return sendJSON({ ok: true, builds: loadBuilds() }), true;
    }
    // POST /api/sim/builds
    if (pathname === '/api/sim/builds' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const saved = saveBuildRecord(body.build || body);
      return sendJSON({ ok: true, build: saved }), true;
    }
    // DELETE /api/sim/builds/:id
    if (pathname.startsWith('/api/sim/builds/') && req.method === 'DELETE') {
      const id = decodeURIComponent(pathname.slice('/api/sim/builds/'.length));
      const deleted = deleteBuildRecord(id);
      return sendJSON({ ok: true, deleted }), true;
    }

    // GET /api/sim/ui-push  (Browser UI polls this to receive builds pushed by MCP AI)
    if (pathname === '/api/sim/ui-push' && req.method === 'GET') {
      const rec = readJsonFile(UI_PUSH_FILE, null);
      return sendJSON(rec || { ts: 0, build: null }), true;
    }
    // POST /api/sim/ui-push
    if (pathname === '/api/sim/ui-push' && req.method === 'POST') {
      const body = await readJsonBody(req);
      if (!body || !body.build) return sendJSON({ ok: false, error: 'Missing build' }, 400), true;
      const norm = Engine.normalizeBuild(idx, body.build);
      const rec = { ts: Date.now(), build: norm, targetId: body.targetId || null, note: body.note || '' };
      writeJsonFile(UI_PUSH_FILE, rec);
      saveBuildRecord(norm);
      return sendJSON({ ok: true, pushed: rec }), true;
    }

    // GET /api/sim/wiki/search
    if (pathname === '/api/sim/wiki/search' && req.method === 'GET') {
      const q = urlObj.searchParams;
      const results = Engine.searchWiki(idx, {
        category: q.get('category') || 'all',
        query: q.get('q') || q.get('query') || '',
        slot: q.get('slot') || undefined,
        wtype: q.get('wtype') || undefined,
        job: q.get('job') || undefined,
        element: q.get('element') || undefined,
        maxLv: q.get('maxLv') ? Number(q.get('maxLv')) : undefined,
        limit: q.get('limit') ? Number(q.get('limit')) : 25,
      });
      return sendJSON({ ok: true, count: results.length, results }), true;
    }
    // GET /api/sim/wiki/:category/:id
    const wikiEntMatch = pathname.match(/^\/api\/sim\/wiki\/([^/]+)\/([^/]+)$/);
    if (wikiEntMatch && req.method === 'GET') {
      const entity = Engine.getWikiEntity(idx, decodeURIComponent(wikiEntMatch[1]), decodeURIComponent(wikiEntMatch[2]));
      if (!entity) return sendJSON({ ok: false, error: 'Entity not found' }, 404), true;
      return sendJSON({ ok: true, entity }), true;
    }

    // POST /api/sim/stats
    if (pathname === '/api/sim/stats' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const stats = Engine.calcBuildStats(idx, body.build || body, body.env || {});
      return sendJSON({ ok: true, stats }), true;
    }
    // POST /api/sim/fight
    if (pathname === '/api/sim/fight' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const result = Engine.simulateFight(idx, body.build, body.target || body.targetId || 'ant_queen', body.options || {});
      return sendJSON({ ok: true, result }), true;
    }
    // POST /api/sim/compare
    if (pathname === '/api/sim/compare' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const result = Engine.compareBuilds(idx, body.buildA, body.buildB, body.target || body.targetId || 'ant_queen', body.options || {});
      return sendJSON({ ok: true, result }), true;
    }
    // POST /api/sim/optimize
    if (pathname === '/api/sim/optimize' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const result = Engine.optimizeBuild(idx, body);
      return sendJSON({ ok: true, result }), true;
    }
    // POST /api/sim/export-plan
    if (pathname === '/api/sim/export-plan' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const plan = Engine.exportBuildToPlanGear(idx, body.build, body.options || {});
      return sendJSON({ ok: true, plan }), true;
    }

    // POST /api/sim/import-live/:profileId
    const impMatch = pathname.match(/^\/api\/sim\/import-live\/([^/]+)$/);
    if (impMatch && req.method === 'POST') {
      const profileId = decodeURIComponent(impMatch[1]);
      const getProfile = deps.getProfile;
      const evalProfilePort = deps.evalProfilePort;
      if (!getProfile || !evalProfilePort) {
        return sendJSON({ ok: false, error: 'Live bridge unavailable' }, 503), true;
      }
      const p = getProfile(profileId);
      if (!p || !p.debugPort) return sendJSON({ ok: false, error: 'Profile not running' }, 404), true;
      const ev = await evalProfilePort(p.debugPort, Engine.LIVE_IMPORT_EVAL_SNIPPET, 7000);
      if (!ev || ev.success === false || !ev.result || ev.result.error) {
        return sendJSON({ ok: false, error: (ev && (ev.error || (ev.result && ev.result.error))) || 'Eval failed' }, 500), true;
      }
      const build = Engine.importLiveCharacterToBuild(idx, ev.result, { id: p.id, name: p.name });
      return sendJSON({ ok: true, build, liveSheet: build._liveSheet }), true;
    }

    return sendJSON({ ok: false, error: 'Unknown /api/sim endpoint' }, 404), true;
  } catch (err) {
    sendJSON({ ok: false, error: err && err.message ? err.message : String(err) }, 500);
    return true;
  }
}

module.exports = { handleSimApi, getIdx, loadBuilds, saveBuildRecord, BUILDS_FILE, UI_PUSH_FILE };
