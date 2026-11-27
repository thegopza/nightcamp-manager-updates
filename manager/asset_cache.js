'use strict';
// manager/asset_cache.js
// Shared Local Disk & Hot RAM Cache for Static Game Assets
// (/cas/*.js|webp|png|jpg|woff2|mp3, /game-*/css/*.css, /game-*/assets/*, cas.json, cdn.nightcamp.app)
// Intercepts static immutable assets across ALL browser windows (both Direct & isolated Proxy contexts)
// so every window loads instantly from local SSD/RAM without re-downloading thousands of files.

const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const https = require('https');
const zlib = require('zlib');
const crypto = require('crypto');

const CACHEABLE_EXTENSIONS = new Set([
  '.png',
  '.webp',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.avif',
  '.ico',
  '.mp3',
  '.ogg',
  '.wav',
  '.m4a',
  '.aac',
  '.flac',
  '.woff2',
  '.woff',
  '.ttf',
  '.otf',
  '.eot',
  '.js',
  '.css',
  '.json'
]);

const MIME_BY_EXT = {
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

// Narrow CDP Fetch.enable patterns: ONLY static game assets (NEVER root HTML, index.html, version.json, sw.js, or CloudFront game API/WebSockets!)
const CDP_ASSET_FETCH_PATTERNS = [
  '*://*.nightcamp.app/cas/*',
  '*://nightcamp.app/cas/*',
  '*://*.nightcamp.app/game-*/css/*',
  '*://*.nightcamp.app/game-*/assets/*',
  '*://*.nightcamp.app/stg-*/css/*',
  '*://*.nightcamp.app/stg-*/assets/*',
  '*://*.nightcamp.app/assets/*',
  '*://nightcamp.app/assets/*',
  '*://fonts.gstatic.com/*.woff2*',
  '*://fonts.gstatic.com/*.ttf*',
  '*://cdnjs.cloudflare.com/ajax/libs/*.js*'
].map(urlPattern => ({ urlPattern, requestStage: 'Request' }));

const MAX_MEMORY_CACHE_BYTES = 120 * 1024 * 1024; // 120 MB hot RAM cache for instant <1ms hits across 40+ windows
const MAX_RAM_SINGLE_FILE_BYTES = 6 * 1024 * 1024;
const MAX_SINGLE_ASSET_BYTES = 25 * 1024 * 1024;  // 25 MB max per single file
const MAX_CONCURRENT_UPSTREAM = 16;

const keepAliveHttpsAgent = new https.Agent({ keepAlive: true, maxSockets: 24, keepAliveMsecs: 15000 });
const keepAliveHttpAgent = new http.Agent({ keepAlive: true, maxSockets: 16, keepAliveMsecs: 15000 });

const CAS_FILE_RE = /^\/cas\/([a-f0-9]{10,}\.[a-z0-9]+)$/i;
const BUILD_CSS_OR_ASSET_JS_RE = /^\/(?:game|stg)-[a-z0-9._-]+\/(?:css|assets|js)\/.+\.(?:js|css)$/i;
const BUILD_ASSET_JSON_RE = /^\/(?:game|stg)-[a-z0-9._-]+\/assets\/[a-z0-9._/-]+\.json$/i;

function getExtensionFromPathname(pathname) {
  const ext = path.posix.extname(String(pathname || '').toLowerCase());
  return CACHEABLE_EXTENSIONS.has(ext) ? ext : '';
}

function classifyExtGroup(ext) {
  if (ext === '.js') return 'js';
  if (ext === '.css') return 'css';
  if (ext === '.png') return 'png';
  if (ext === '.webp') return 'webp';
  if (ext === '.mp3' || ext === '.ogg' || ext === '.wav' || ext === '.m4a' || ext === '.aac' || ext === '.flac') return 'audio';
  if (ext === '.woff2' || ext === '.woff' || ext === '.ttf' || ext === '.otf' || ext === '.eot') return 'font';
  return 'other';
}

function isAllowedAssetHost(hostname) {
  const h = String(hostname || '').toLowerCase().replace(/:\d+$/, '');
  if (!h) return false;
  return (
    h === 'nightcamp.app' ||
    h.endsWith('.nightcamp.app') ||
    h === 'fonts.gstatic.com' ||
    h === 'cdnjs.cloudflare.com'
  );
}

function isCacheableAssetUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  if (rawUrl.startsWith('data:') || rawUrl.startsWith('blob:')) return false;
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch (_) {
    return false;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
  if (!isAllowedAssetHost(parsed.hostname)) return false;
  if (parsed.search && /nocache=/i.test(parsed.search)) return false;
  const lowerPath = parsed.pathname.toLowerCase();
  // Never cache dynamic entrypoints, service worker, version manifests, or security/captcha/auth endpoints
  if (
    lowerPath === '/' ||
    lowerPath === '/sw.js' ||
    lowerPath === '/version.json' ||
    lowerPath.endsWith('/index.html') ||
    lowerPath.endsWith('.webmanifest') ||
    /human[-_]?check|captcha|verify|auth|session|login/i.test(lowerPath)
  ) {
    return false;
  }
  const ext = getExtensionFromPathname(lowerPath);
  if (!ext) return false;
  const h = parsed.hostname.toLowerCase();
  if (ext === '.js' || ext === '.css') {
    if (h === 'cdnjs.cloudflare.com') return lowerPath.startsWith('/ajax/libs/');
    if (CAS_FILE_RE.test(lowerPath)) return true;
    if (BUILD_CSS_OR_ASSET_JS_RE.test(lowerPath)) return true;
    return lowerPath.startsWith('/assets/') && /-[a-z0-9_]{6,}\.(js|css)$/i.test(lowerPath);
  }
  if (ext === '.json') {
    if (CAS_FILE_RE.test(lowerPath)) return true;
    return BUILD_ASSET_JSON_RE.test(lowerPath);
  }
  return true;
}

function normalizeAssetCacheKey(rawUrl) {
  const parsed = new URL(rawUrl);
  const ext = getExtensionFromPathname(parsed.pathname);
  const hostLow = parsed.hostname.toLowerCase();
  const cleanPath = parsed.pathname;
  // Content-addressed /cas/<hash>.<ext> files have identical bytes across play.nightcamp.app and cdn.nightcamp.app!
  const casMatch = (hostLow === 'nightcamp.app' || hostLow.endsWith('.nightcamp.app'))
    ? cleanPath.match(CAS_FILE_RE)
    : null;
  const normalizedUrl = casMatch
    ? `cas://${casMatch[1].toLowerCase()}`
    : `${parsed.protocol}//${hostLow}${cleanPath}`;
  const hash = crypto.createHash('sha256').update(normalizedUrl).digest('hex').slice(0, 32);
  return {
    hash,
    ext: ext || '.bin',
    fileName: `${hash}${ext || '.bin'}`,
    normalizedUrl,
    mimeType: MIME_BY_EXT[ext] || 'application/octet-stream',
    group: classifyExtGroup(ext)
  };
}

function decodeContentBuffer(rawBuf, contentEncoding) {
  const enc = String(contentEncoding || '').trim().toLowerCase();
  if (!enc || enc === 'identity') return rawBuf;
  try {
    if (enc === 'br') return zlib.brotliDecompressSync(rawBuf);
    if (enc === 'gzip' || enc === 'x-gzip') return zlib.gunzipSync(rawBuf);
    if (enc === 'deflate') return zlib.inflateSync(rawBuf);
  } catch (_) {}
  return rawBuf;
}

function fetchBufferDirect(targetUrl, timeoutMs = 15000, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 4) return reject(new Error('TOO_MANY_REDIRECTS'));
    let parsed;
    try {
      parsed = new URL(targetUrl);
    } catch (e) {
      return reject(e);
    }
    const isHttps = parsed.protocol === 'https:';
    const client = isHttps ? https : http;
    const req = client.get(parsed, {
      agent: isHttps ? keepAliveHttpsAgent : keepAliveHttpAgent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Encoding': 'br, gzip, deflate'
      },
      timeout: timeoutMs
    }, res => {
      const status = res.statusCode || 0;
      if ([301, 302, 303, 307, 308].includes(status) && res.headers.location) {
        res.resume();
        let nextUrl;
        try {
          nextUrl = new URL(res.headers.location, targetUrl).toString();
        } catch (e) {
          return reject(e);
        }
        return resolve(fetchBufferDirect(nextUrl, timeoutMs, redirectCount + 1));
      }
      if (status !== 200) {
        res.resume();
        return reject(new Error(`HTTP_${status}`));
      }
      const chunks = [];
      let total = 0;
      res.on('data', chunk => {
        total += chunk.length;
        if (total > MAX_SINGLE_ASSET_BYTES) {
          req.destroy(new Error('ASSET_TOO_LARGE'));
          return;
        }
        chunks.push(chunk);
      });
      res.on('end', () => {
        const rawBuf = Buffer.concat(chunks);
        const buffer = decodeContentBuffer(rawBuf, res.headers['content-encoding']);
        if (buffer.length > MAX_SINGLE_ASSET_BYTES) {
          return reject(new Error('ASSET_TOO_LARGE'));
        }
        const contentType = String(res.headers['content-type'] || '').split(';')[0].trim();
        resolve({ buffer, contentType, status: 200, wireBytes: rawBuf.length });
      });
      res.on('error', reject);
    });
    req.on('timeout', () => {
      req.destroy(new Error('ASSET_FETCH_TIMEOUT'));
    });
    req.on('error', reject);
  });
}

function resolveSafeAssetFilesDir(defaultCacheDir, dataDir) {
  const defaultFilesDir = path.join(defaultCacheDir, 'files');
  if (process.env.PELICAN_TEST_INSTANCE === '1') return defaultFilesDir;
  const resolvedData = path.resolve(String(dataDir || ''));
  const tempRoot = path.resolve(os.tmpdir());
  if (resolvedData.toLowerCase().startsWith(tempRoot.toLowerCase())) return defaultFilesDir;
  let freeBytesOnDataDrive = Infinity;
  try {
    if (typeof fs.statfsSync === 'function') {
      const st = fs.statfsSync(defaultCacheDir);
      freeBytesOnDataDrive = Number(st.bavail || st.bfree || 0) * Number(st.bsize || 4096);
    }
  } catch (_) {}
  const localAppData = process.env.LOCALAPPDATA || os.tmpdir();
  const cDriveAlt = path.join(localAppData, 'PmheeNightcamp', 'asset_cache', 'files');
  const isDifferentDrive = resolvedData.slice(0, 2).toLowerCase() !== path.resolve(cDriveAlt).slice(0, 2).toLowerCase();
  if (freeBytesOnDataDrive < 2 * 1024 * 1024 * 1024 && isDifferentDrive) {
    return cDriveAlt;
  }
  return defaultFilesDir;
}

function hasEnoughDiskSpace(dirPath, minFreeBytes = 250 * 1024 * 1024) {
  try {
    if (typeof fs.statfsSync === 'function') {
      const st = fs.statfsSync(dirPath);
      const freeBytes = Number(st.bavail || st.bfree || 0) * Number(st.bsize || 4096);
      return freeBytes >= minFreeBytes;
    }
  } catch (_) {}
  return true;
}

function createAssetCache({ dataDir, fetchDirect = fetchBufferDirect, now = Date.now } = {}) {
  const cacheDir = path.join(dataDir, 'asset_cache');
  fs.mkdirSync(cacheDir, { recursive: true });
  const filesDir = resolveSafeAssetFilesDir(cacheDir, dataDir);
  const stateFile = path.join(cacheDir, 'state.json');
  try { fs.mkdirSync(filesDir, { recursive: true }); } catch (_) {}

  // Hot in-memory LRU cache: fileName -> { buffer, base64, mimeType, size, group }
  const memoryCache = new Map();
  let memoryCacheBytes = 0;
  const inFlight = new Map();

  // Upstream concurrency limiter so 30+ booting windows don't overload upstream sockets
  let activeUpstream = 0;
  const upstreamQueue = [];
  function runWithUpstreamSlot(fn) {
    return new Promise((resolve, reject) => {
      const launch = () => {
        activeUpstream++;
        Promise.resolve().then(fn).then(resolve, reject).finally(() => {
          activeUpstream = Math.max(0, activeUpstream - 1);
          if (upstreamQueue.length > 0) {
            const next = upstreamQueue.shift();
            next();
          }
        });
      };
      if (activeUpstream < MAX_CONCURRENT_UPSTREAM) launch();
      else upstreamQueue.push(launch);
    });
  }

  let state = {
    enabled: true,
    startedAt: now(),
    hits: 0,
    misses: 0,
    bytesSaved: 0,
    bytesFetchedDirect: 0,
    lastPrewarmBuild: '',
    lastPrewarmAt: 0,
    byGroup: {
      js: { hits: 0, bytesSaved: 0 },
      css: { hits: 0, bytesSaved: 0 },
      png: { hits: 0, bytesSaved: 0 },
      webp: { hits: 0, bytesSaved: 0 },
      audio: { hits: 0, bytesSaved: 0 },
      font: { hits: 0, bytesSaved: 0 },
      other: { hits: 0, bytesSaved: 0 }
    }
  };

  let prewarmState = {
    running: false,
    phase: 'idle', // idle | discovering | downloading | done | error
    buildTag: '',
    total: 0,
    completed: 0,
    cachedAlready: 0,
    downloaded: 0,
    failed: 0,
    bytesDownloaded: 0,
    startedAt: 0,
    finishedAt: 0,
    error: ''
  };
  let prewarmPromise = null;

  try {
    if (fs.existsSync(stateFile)) {
      const saved = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      if (saved && typeof saved === 'object') {
        if (typeof saved.enabled === 'boolean') state.enabled = saved.enabled;
        if (typeof saved.hits === 'number') state.hits = saved.hits;
        if (typeof saved.misses === 'number') state.misses = saved.misses;
        if (typeof saved.bytesSaved === 'number') state.bytesSaved = saved.bytesSaved;
        if (typeof saved.bytesFetchedDirect === 'number') state.bytesFetchedDirect = saved.bytesFetchedDirect;
        if (typeof saved.startedAt === 'number') state.startedAt = saved.startedAt;
        if (typeof saved.lastPrewarmBuild === 'string') state.lastPrewarmBuild = saved.lastPrewarmBuild;
        if (typeof saved.lastPrewarmAt === 'number') state.lastPrewarmAt = saved.lastPrewarmAt;
        if (saved.byGroup && typeof saved.byGroup === 'object') {
          for (const k of Object.keys(state.byGroup)) {
            if (saved.byGroup[k]) {
              state.byGroup[k].hits = Number(saved.byGroup[k].hits) || 0;
              state.byGroup[k].bytesSaved = Number(saved.byGroup[k].bytesSaved) || 0;
            }
          }
        }
      }
    }
  } catch (_) {}

  let stateDirty = false;
  function saveStateNow() {
    try {
      fs.mkdirSync(cacheDir, { recursive: true });
      const tmp = stateFile + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf8');
      fs.renameSync(tmp, stateFile);
      stateDirty = false;
    } catch (_) {}
  }

  const flushTimer = setInterval(() => {
    if (stateDirty) saveStateNow();
  }, 10000);
  flushTimer.unref?.();

  let diskSummaryCache = null;
  let diskSummaryAt = 0;
  function invalidateDiskSummary() {
    diskSummaryAt = 0;
  }

  function putMemoryCache(fileName, entry) {
    if (!entry || entry.size > MAX_RAM_SINGLE_FILE_BYTES) return;
    if (memoryCache.has(fileName)) {
      const prev = memoryCache.get(fileName);
      memoryCacheBytes -= prev.size;
      memoryCache.delete(fileName);
    }
    while (memoryCacheBytes + entry.size > MAX_MEMORY_CACHE_BYTES && memoryCache.size > 0) {
      const oldestKey = memoryCache.keys().next().value;
      const oldest = memoryCache.get(oldestKey);
      memoryCacheBytes -= (oldest?.size || 0);
      memoryCache.delete(oldestKey);
    }
    memoryCache.set(fileName, entry);
    memoryCacheBytes += entry.size;
  }

  function recordHit(group, size, isHit = true, { silent = false } = {}) {
    if (silent) return;
    if (isHit) {
      state.hits += 1;
    } else {
      state.misses += 1;
      state.bytesFetchedDirect += size;
    }
    state.bytesSaved += size;
    const g = state.byGroup[group] || state.byGroup.other;
    g.hits += 1;
    g.bytesSaved += size;
    stateDirty = true;
  }

  async function getOrFetch(rawUrl, opts = {}) {
    const silentStats = Boolean(opts && opts.silentStats);
    const keepInRam = opts.keepInRam !== false;
    if (!isCacheableAssetUrl(rawUrl)) {
      return { ok: false, reason: 'NOT_CACHEABLE' };
    }
    const keyInfo = normalizeAssetCacheKey(rawUrl);
    const { fileName, mimeType, group } = keyInfo;

    // 1. Check hot RAM cache first (<0.2ms, zero disk I/O)
    const mem = memoryCache.get(fileName);
    if (mem) {
      memoryCache.delete(fileName);
      memoryCache.set(fileName, mem);
      recordHit(group, mem.size, true, { silent: silentStats });
      return {
        ok: true,
        hit: true,
        fromCache: true,
        source: 'memory',
        status: 200,
        mimeType: mem.mimeType,
        buffer: mem.buffer,
        body: mem.buffer,
        base64: mem.base64,
        size: mem.size
      };
    }

    // 2. Check local SSD/disk cache
    const filePath = path.join(filesDir, fileName);
    try {
      if (fs.existsSync(filePath)) {
        const buffer = await fs.promises.readFile(filePath);
        if (buffer && buffer.length > 0) {
          const base64 = buffer.toString('base64');
          const entry = {
            buffer,
            base64,
            mimeType,
            size: buffer.length,
            group
          };
          if (keepInRam) putMemoryCache(fileName, entry);
          recordHit(group, buffer.length, true, { silent: silentStats });
          return {
            ok: true,
            hit: true,
            fromCache: true,
            source: 'disk',
            status: 200,
            mimeType,
            buffer,
            body: buffer,
            base64,
            size: buffer.length
          };
        }
      }
    } catch (_) {}

    // 3. Cache miss -> Deduplicated direct fetch (bypasses slow proxy & deduplicates concurrent windows!)
    if (inFlight.has(fileName)) {
      try {
        const shared = await inFlight.get(fileName);
        if (shared && shared.ok) {
          recordHit(group, shared.size, true, { silent: silentStats });
          return { ...shared, hit: true, fromCache: true, source: 'inflight-shared' };
        }
      } catch (_) {}
    }

    const fetchPromise = runWithUpstreamSlot(async () => {
      const fetched = await fetchDirect(rawUrl, 15000);
      const buffer = fetched && (fetched.buffer || fetched.body);
      if (!buffer || buffer.length === 0) {
        throw new Error('EMPTY_ASSET_BUFFER');
      }
      const effectiveMime = (fetched.contentType && !fetched.contentType.includes('text/html'))
        ? fetched.contentType
        : mimeType;
      try {
        if (hasEnoughDiskSpace(filesDir)) {
          const tmpFile = `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`;
          await fs.promises.writeFile(tmpFile, buffer);
          await fs.promises.rename(tmpFile, filePath).catch(async () => {
            await fs.promises.unlink(tmpFile).catch(() => {});
          });
          invalidateDiskSummary();
        }
      } catch (_) {}

      const base64 = buffer.toString('base64');
      const entry = {
        buffer,
        base64,
        mimeType: effectiveMime,
        size: buffer.length,
        group
      };
      if (keepInRam) putMemoryCache(fileName, entry);
      return {
        ok: true,
        hit: false,
        fromCache: false,
        source: 'direct-network',
        status: 200,
        mimeType: effectiveMime,
        buffer,
        body: buffer,
        base64,
        size: buffer.length
      };
    });

    inFlight.set(fileName, fetchPromise);
    try {
      const result = await fetchPromise;
      recordHit(group, result.size, false, { silent: silentStats });
      return result;
    } catch (err) {
      return { ok: false, error: err.message };
    } finally {
      inFlight.delete(fileName);
    }
  }

  function hasOnDisk(rawUrl) {
    try {
      if (!isCacheableAssetUrl(rawUrl)) return false;
      const { fileName } = normalizeAssetCacheKey(rawUrl);
      if (memoryCache.has(fileName)) return true;
      const st = fs.statSync(path.join(filesDir, fileName));
      return st.isFile() && st.size > 0;
    } catch (_) {
      return false;
    }
  }

  let latestGameVersion = null;
  async function checkLatestGameVersion(gameOrigin = 'https://play.nightcamp.app') {
    try {
      const origin = String(gameOrigin || 'https://play.nightcamp.app').replace(/\/+$/, '');
      const res = await fetchDirect(`${origin}/version.json?t=${Date.now()}`, 10000);
      const raw = (res.buffer || res.body || Buffer.alloc(0)).toString('utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.build) {
        latestGameVersion = {
          build: String(parsed.build).trim(),
          version: String(parsed.version || '').trim(),
          force: parsed.force === true,
          date: String(parsed.date || '').trim(),
          note: String(parsed.note || '').trim().slice(0, 200),
          checkedAt: now()
        };
        return latestGameVersion;
      }
    } catch (_) {}
    return latestGameVersion;
  }

  async function prewarmGameBootAssets({ gameUrl = 'https://play.nightcamp.app/', concurrency = 14 } = {}) {
    if (prewarmPromise) return prewarmPromise;
    prewarmState = {
      running: true,
      phase: 'discovering',
      buildTag: '',
      total: 0,
      completed: 0,
      cachedAlready: 0,
      downloaded: 0,
      failed: 0,
      bytesDownloaded: 0,
      startedAt: now(),
      finishedAt: 0,
      error: ''
    };

    prewarmPromise = (async () => {
      try {
        let indexUrl = gameUrl;
        let rootRes = null;
        const verInfo = await checkLatestGameVersion(new URL(gameUrl).origin).catch(() => null);
        if (verInfo && verInfo.build) {
          indexUrl = new URL(`/${verInfo.build}/index.html`, gameUrl).toString();
        } else {
          rootRes = await fetchDirect(gameUrl, 15000);
          const rootHtml = (rootRes.buffer || rootRes.body || Buffer.alloc(0)).toString('utf8');
          const metaMatch = rootHtml.match(/url=([^"'>\s]+)/i) || rootHtml.match(/location\.replace\(\s*['"]([^'"]+)['"]/i);
          if (metaMatch && metaMatch[1]) {
            indexUrl = new URL(metaMatch[1], gameUrl).toString();
          }
        }
        const buildMatch = indexUrl.match(/\/((?:game|stg)-[A-Za-z0-9._-]+)\//i);
        const buildTag = buildMatch ? buildMatch[1] : 'current';
        prewarmState.buildTag = buildTag;

        const idxRes = (indexUrl === gameUrl && rootRes) ? rootRes : await fetchDirect(indexUrl, 15000);
        const idxHtml = (idxRes.buffer || idxRes.body || Buffer.alloc(0)).toString('utf8');

        const urlSet = new Set();
        const attrRe = /(?:src|href)=["']([^"']+)["']/gi;
        let m;
        while ((m = attrRe.exec(idxHtml)) !== null) {
          const ref = m[1];
          if (!ref || ref.startsWith('data:') || ref.startsWith('#') || ref.startsWith('javascript:')) continue;
          try {
            const full = new URL(ref, indexUrl).toString();
            if (isCacheableAssetUrl(full)) urlSet.add(full);
          } catch (_) {}
        }
        // Also pre-warm the build's cas.json asset map so Nightcamp SW & asset resolver load instantly
        if (buildMatch) {
          try {
            const casJsonUrl = new URL(`/${buildMatch[1]}/assets/cas.json`, indexUrl).toString();
            if (isCacheableAssetUrl(casJsonUrl)) urlSet.add(casJsonUrl);
          } catch (_) {}
        }

        const urls = Array.from(urlSet);
        prewarmState.total = urls.length;
        prewarmState.phase = 'downloading';

        const toDownload = [];
        for (const u of urls) {
          if (hasOnDisk(u)) {
            prewarmState.cachedAlready++;
            prewarmState.completed++;
          } else {
            toDownload.push(u);
          }
        }

        const workerCount = Math.max(1, Math.min(Number(concurrency) || 14, toDownload.length || 1));
        let cursor = 0;
        const workers = Array.from({ length: workerCount }, async () => {
          while (cursor < toDownload.length) {
            const nextUrl = toDownload[cursor++];
            try {
              const r = await getOrFetch(nextUrl, { silentStats: true, keepInRam: true });
              if (r && r.ok) {
                prewarmState.downloaded++;
                prewarmState.bytesDownloaded += Number(r.size) || 0;
              } else {
                prewarmState.failed++;
              }
            } catch (_) {
              prewarmState.failed++;
            } finally {
              prewarmState.completed++;
            }
          }
        });
        await Promise.all(workers);

        prewarmState.running = false;
        prewarmState.phase = 'done';
        prewarmState.finishedAt = now();
        state.lastPrewarmBuild = buildTag;
        state.lastPrewarmAt = prewarmState.finishedAt;
        stateDirty = true;
        saveStateNow();
        invalidateDiskSummary();
        return { success: true, ...prewarmState };
      } catch (err) {
        prewarmState.running = false;
        prewarmState.phase = 'error';
        prewarmState.finishedAt = now();
        prewarmState.error = err && err.message ? err.message : String(err);
        return { success: false, ...prewarmState };
      } finally {
        prewarmPromise = null;
      }
    })();

    return prewarmPromise;
  }

  function clearCache() {
    memoryCache.clear();
    memoryCacheBytes = 0;
    let removedFiles = 0;
    let removedBytes = 0;
    try {
      const names = fs.readdirSync(filesDir);
      for (const name of names) {
        const fp = path.join(filesDir, name);
        try {
          const st = fs.statSync(fp);
          if (st.isFile()) {
            removedBytes += st.size;
            fs.unlinkSync(fp);
            removedFiles++;
          }
        } catch (_) {}
      }
    } catch (_) {}
    invalidateDiskSummary();
    state.lastPrewarmBuild = '';
    state.lastPrewarmAt = 0;
    resetStats();
    return { success: true, removedFiles, removedBytes, status: getStatus() };
  }

  function getDiskSummary() {
    const t = now();
    if (diskSummaryCache && (t - diskSummaryAt < 4000)) return diskSummaryCache;
    let filesCount = 0;
    let diskBytes = 0;
    try {
      const names = fs.readdirSync(filesDir);
      for (const name of names) {
        if (name.endsWith('.tmp')) continue;
        try {
          const st = fs.statSync(path.join(filesDir, name));
          if (st.isFile()) {
            filesCount += 1;
            diskBytes += st.size;
          }
        } catch (_) {}
      }
    } catch (_) {}
    diskSummaryCache = { filesCount, diskBytes };
    diskSummaryAt = t;
    return diskSummaryCache;
  }

  function getStatus() {
    const disk = getDiskSummary();
    const totalServed = state.hits + state.misses;
    const hitRatePct = totalServed > 0 ? Math.round((state.hits / totalServed) * 1000) / 10 : 0;
    return {
      enabled: state.enabled !== false,
      startedAt: state.startedAt,
      hits: state.hits,
      misses: state.misses,
      totalServed,
      hitRatePct,
      bytesSaved: state.bytesSaved,
      bytesFetchedDirect: state.bytesFetchedDirect,
      filesCount: disk.filesCount,
      diskBytes: disk.diskBytes,
      memoryFilesCount: memoryCache.size,
      memoryBytes: memoryCacheBytes,
      lastPrewarmBuild: state.lastPrewarmBuild || '',
      lastPrewarmAt: state.lastPrewarmAt || 0,
      latestGameVersion: latestGameVersion ? { ...latestGameVersion } : null,
      prewarm: { ...prewarmState },
      byGroup: state.byGroup
    };
  }

  function setEnabled(enabled) {
    state.enabled = Boolean(enabled);
    stateDirty = true;
    saveStateNow();
    return state.enabled;
  }

  function resetStats() {
    state.startedAt = now();
    state.hits = 0;
    state.misses = 0;
    state.bytesSaved = 0;
    state.bytesFetchedDirect = 0;
    for (const k of Object.keys(state.byGroup)) {
      state.byGroup[k] = { hits: 0, bytesSaved: 0 };
    }
    stateDirty = true;
    saveStateNow();
    return getStatus();
  }

  function dispose() {
    clearInterval(flushTimer);
    if (stateDirty) saveStateNow();
  }

  return {
    isEnabled: () => state.enabled !== false,
    setEnabled,
    isCacheableAssetUrl,
    normalizeAssetCacheKey,
    getOrFetch,
    checkLatestGameVersion,
    prewarmGameBootAssets,
    clearCache,
    getStatus,
    getStats: getStatus,
    resetStats,
    dispose,
    CDP_ASSET_FETCH_PATTERNS
  };
}

module.exports = {
  createAssetCache,
  isCacheableAssetUrl,
  normalizeAssetCacheKey,
  CDP_ASSET_FETCH_PATTERNS,
  CACHEABLE_EXTENSIONS
};
