// manager/browser_mode.js — run game clients as windows of ONE real Chrome / Edge instead of one Electron
// app per client. All windows share one browser + GPU process (much lighter than N Electron apps).
//
// The Manager drives that browser through the Chrome DevTools Protocol (remote debugging port) and, for each
// profile, serves the same small HTTP API the Electron loader serves on profile.debugPort (/api/eval,
// /api/state, /api/window), so the rest of the Manager works unchanged.
// - each window gets window.__pmProfileId before the page runs: bot.js uses it to keep its localStorage
//   settings per profile (all windows share one browser storage)
// - bot.js (GitHub, local fallback) + msgpack are injected on every load of the game page
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn, execFile } = require('child_process');

const GAME_URL = 'https://play.nightcamp.app/';
const BOT_URL = 'https://raw.githubusercontent.com/thegopza/nightcamp-bot/main/bot.js';
const DEFAULT_CDP_PORT = 9500;
const MAX_SCREENS_PER_DEVICE = 2;
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256_HEX_RE = /^[0-9a-f]{64}$/i;
function deriveMachineId(seed) {
  return crypto.createHash('sha256').update('pmhee-machine:' + String(seed || crypto.randomUUID())).digest('hex');
}

const ANDROID_DEVICE_PRESETS = [
  { model: 'Samsung Galaxy S24 Ultra (SM-S928B)', gpu: 'Adreno (TM) 750', gpuVendor: 'Qualcomm', chromeMajor: '157', chromeFull: '157.0.8103.79', platformVersion: '15.0.0', ua: 'Mozilla/5.0 (Linux; Android 15; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.8103.79 Mobile Safari/537.36', touch: 5, screen: '384x824', cores: 8, deviceMemory: 8, sampleRate: 48000, colorDepth: 24 },
  { model: 'Samsung Galaxy S23 Ultra (SM-S918B)', gpu: 'Adreno (TM) 740', gpuVendor: 'Qualcomm', chromeMajor: '156', chromeFull: '156.0.8041.62', platformVersion: '14.0.0', ua: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.8041.62 Mobile Safari/537.36', touch: 5, screen: '384x824', cores: 8, deviceMemory: 8, sampleRate: 48000, colorDepth: 24 },
  { model: 'Samsung Galaxy S24+ (SM-S926B)', gpu: 'Mali-G720-Immortalis MC12', gpuVendor: 'ARM', chromeMajor: '157', chromeFull: '157.0.8103.79', platformVersion: '15.0.0', ua: 'Mozilla/5.0 (Linux; Android 15; SM-S926B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.8103.79 Mobile Safari/537.36', touch: 5, screen: '384x832', cores: 10, deviceMemory: 8, sampleRate: 48000, colorDepth: 24 },
  { model: 'Xiaomi 14 Pro (23116PN5BC)', gpu: 'Adreno (TM) 750', gpuVendor: 'Qualcomm', chromeMajor: '156', chromeFull: '156.0.8041.62', platformVersion: '14.0.0', ua: 'Mozilla/5.0 (Linux; Android 14; 23116PN5BC) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.8041.62 Mobile Safari/537.36', touch: 5, screen: '393x873', cores: 8, deviceMemory: 8, sampleRate: 48000, colorDepth: 24 },
  { model: 'Xiaomi 13T Pro (23078PND5G)', gpu: 'Mali-G715-Immortalis MC11', gpuVendor: 'ARM', chromeMajor: '155', chromeFull: '155.0.7982.44', platformVersion: '14.0.0', ua: 'Mozilla/5.0 (Linux; Android 14; 23078PND5G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.7982.44 Mobile Safari/537.36', touch: 5, screen: '393x873', cores: 8, deviceMemory: 4, sampleRate: 44100, colorDepth: 24 },
  { model: 'ASUS ROG Phone 8 Pro (AI2401)', gpu: 'Adreno (TM) 750', gpuVendor: 'Qualcomm', chromeMajor: '157', chromeFull: '157.0.8103.79', platformVersion: '15.0.0', ua: 'Mozilla/5.0 (Linux; Android 15; ASUS_AI2401) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.8103.79 Mobile Safari/537.36', touch: 10, screen: '396x876', cores: 8, deviceMemory: 8, sampleRate: 48000, colorDepth: 24 },
  { model: 'OnePlus 12 (CPH2581)', gpu: 'Adreno (TM) 750', gpuVendor: 'Qualcomm', chromeMajor: '156', chromeFull: '156.0.8041.62', platformVersion: '15.0.0', ua: 'Mozilla/5.0 (Linux; Android 15; CPH2581) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.8041.62 Mobile Safari/537.36', touch: 5, screen: '384x856', cores: 8, deviceMemory: 8, sampleRate: 48000, colorDepth: 24 },
  { model: 'Google Pixel 8 Pro (GC3VE)', gpu: 'Mali-G715', gpuVendor: 'ARM', chromeMajor: '157', chromeFull: '157.0.8103.79', platformVersion: '15.0.0', ua: 'Mozilla/5.0 (Linux; Android 15; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.8103.79 Mobile Safari/537.36', touch: 5, screen: '412x892', cores: 9, deviceMemory: 8, sampleRate: 48000, colorDepth: 24 },
  { model: 'Vivo X100 Pro (V2309)', gpu: 'Mali-G720-Immortalis MC12', gpuVendor: 'ARM', chromeMajor: '155', chromeFull: '155.0.7982.44', platformVersion: '14.0.0', ua: 'Mozilla/5.0 (Linux; Android 14; V2309) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.7982.44 Mobile Safari/537.36', touch: 5, screen: '393x873', cores: 8, deviceMemory: 8, sampleRate: 48000, colorDepth: 24 },
  { model: 'OPPO Find X7 Ultra (PHY110)', gpu: 'Adreno (TM) 750', gpuVendor: 'Qualcomm', chromeMajor: '156', chromeFull: '156.0.8041.62', platformVersion: '14.0.0', ua: 'Mozilla/5.0 (Linux; Android 14; PHY110) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.8041.62 Mobile Safari/537.36', touch: 5, screen: '384x856', cores: 8, deviceMemory: 8, sampleRate: 48000, colorDepth: 24 },
  { model: 'POCO F6 Pro (23113RKC6G)', gpu: 'Adreno (TM) 740', gpuVendor: 'Qualcomm', chromeMajor: '155', chromeFull: '155.0.7982.44', platformVersion: '14.0.0', ua: 'Mozilla/5.0 (Linux; Android 14; 23113RKC6G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.7982.44 Mobile Safari/537.36', touch: 5, screen: '393x873', cores: 8, deviceMemory: 4, sampleRate: 44100, colorDepth: 24 },
  { model: 'Samsung Galaxy A55 5G (SM-A556E)', gpu: 'Xclipse 530', gpuVendor: 'Samsung', chromeMajor: '156', chromeFull: '156.0.8041.62', platformVersion: '14.0.0', ua: 'Mozilla/5.0 (Linux; Android 14; SM-A556E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.8041.62 Mobile Safari/537.36', touch: 5, screen: '384x832', cores: 8, deviceMemory: 4, sampleRate: 48000, colorDepth: 24 },
  { model: 'Realme GT 6 (RMX3851)', gpu: 'Adreno (TM) 735', gpuVendor: 'Qualcomm', chromeMajor: '157', chromeFull: '157.0.8103.79', platformVersion: '14.0.0', ua: 'Mozilla/5.0 (Linux; Android 14; RMX3851) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.8103.79 Mobile Safari/537.36', touch: 5, screen: '393x873', cores: 8, deviceMemory: 4, sampleRate: 48000, colorDepth: 24 },
  { model: 'Samsung Galaxy Tab S9 Ultra (SM-X910)', gpu: 'Adreno (TM) 740', gpuVendor: 'Qualcomm', chromeMajor: '156', chromeFull: '156.0.8041.62', platformVersion: '14.0.0', ua: 'Mozilla/5.0 (Linux; Android 14; SM-X910) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.8041.62 Safari/537.36', touch: 10, screen: '960x1524', cores: 8, deviceMemory: 8, sampleRate: 48000, colorDepth: 24 },
  { model: 'Xiaomi Pad 6S Pro (24018RPACC)', gpu: 'Adreno (TM) 740', gpuVendor: 'Qualcomm', chromeMajor: '157', chromeFull: '157.0.8103.79', platformVersion: '14.0.0', ua: 'Mozilla/5.0 (Linux; Android 14; 24018RPACC) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.8103.79 Safari/537.36', touch: 10, screen: '1000x1500', cores: 8, deviceMemory: 8, sampleRate: 48000, colorDepth: 24 },
  { model: 'RedMagic 9 Pro (NX769J)', gpu: 'Adreno (TM) 750', gpuVendor: 'Qualcomm', chromeMajor: '157', chromeFull: '157.0.8103.79', platformVersion: '15.0.0', ua: 'Mozilla/5.0 (Linux; Android 15; NX769J) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.8103.79 Mobile Safari/537.36', touch: 10, screen: '400x892', cores: 8, deviceMemory: 8, sampleRate: 48000, colorDepth: 24 }
];

const PC_DEVICE_PRESETS = [
  { model: 'Windows PC · RTX 4060', gpu: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 (0x00002882) Direct3D11 vs_5_0 ps_5_0, D3D11)', gpuVendor: 'Google Inc. (NVIDIA)', chromeMajor: '157', chromeFull: '157.0.8103.79', platformVersion: '15.0.0', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36', touch: 0, screen: '1920x1080', cores: 12, deviceMemory: 16, sampleRate: 48000, colorDepth: 24 },
  { model: 'Windows PC · RTX 3060', gpu: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 (0x00002504) Direct3D11 vs_5_0 ps_5_0, D3D11)', gpuVendor: 'Google Inc. (NVIDIA)', chromeMajor: '156', chromeFull: '156.0.8041.62', platformVersion: '15.0.0', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36', touch: 0, screen: '1920x1080', cores: 6, deviceMemory: 16, sampleRate: 48000, colorDepth: 24 },
  { model: 'Windows PC · RTX 4070 Super', gpu: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 SUPER (0x00002783) Direct3D11 vs_5_0 ps_5_0, D3D11)', gpuVendor: 'Google Inc. (NVIDIA)', chromeMajor: '157', chromeFull: '157.0.8103.79', platformVersion: '15.0.0', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36', touch: 0, screen: '2560x1440', cores: 16, deviceMemory: 32, sampleRate: 48000, colorDepth: 30 },
  { model: 'Windows PC · RTX 3070', gpu: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 (0x00002484) Direct3D11 vs_5_0 ps_5_0, D3D11)', gpuVendor: 'Google Inc. (NVIDIA)', chromeMajor: '156', chromeFull: '156.0.8041.62', platformVersion: '10.0.0', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36', touch: 0, screen: '1920x1080', cores: 8, deviceMemory: 16, sampleRate: 44100, colorDepth: 24 },
  { model: 'Windows PC · RTX 4060 Ti', gpu: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Ti (0x00002803) Direct3D11 vs_5_0 ps_5_0, D3D11)', gpuVendor: 'Google Inc. (NVIDIA)', chromeMajor: '157', chromeFull: '157.0.8103.79', platformVersion: '15.0.0', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36', touch: 0, screen: '1920x1080', cores: 12, deviceMemory: 16, sampleRate: 48000, colorDepth: 24 },
  { model: 'Windows PC · Radeon RX 7600', gpu: 'ANGLE (AMD, AMD Radeon RX 7600 (0x0000747E) Direct3D11 vs_5_0 ps_5_0, D3D11)', gpuVendor: 'Google Inc. (AMD)', chromeMajor: '157', chromeFull: '157.0.8103.79', platformVersion: '15.0.0', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36', touch: 0, screen: '1920x1080', cores: 6, deviceMemory: 16, sampleRate: 48000, colorDepth: 24 },
  { model: 'Windows PC · Radeon RX 6700 XT', gpu: 'ANGLE (AMD, AMD Radeon RX 6700 XT (0x000073DF) Direct3D11 vs_5_0 ps_5_0, D3D11)', gpuVendor: 'Google Inc. (AMD)', chromeMajor: '155', chromeFull: '155.0.7982.44', platformVersion: '10.0.0', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36', touch: 0, screen: '2560x1440', cores: 12, deviceMemory: 32, sampleRate: 44100, colorDepth: 24 },
  { model: 'Windows PC · GTX 1660 Super', gpu: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 SUPER (0x000021C4) Direct3D11 vs_5_0 ps_5_0, D3D11)', gpuVendor: 'Google Inc. (NVIDIA)', chromeMajor: '155', chromeFull: '155.0.7982.44', platformVersion: '10.0.0', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36', touch: 0, screen: '1920x1080', cores: 4, deviceMemory: 8, sampleRate: 44100, colorDepth: 24 },
  { model: 'Windows PC · RTX 3050', gpu: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3050 (0x00002507) Direct3D11 vs_5_0 ps_5_0, D3D11)', gpuVendor: 'Google Inc. (NVIDIA)', chromeMajor: '156', chromeFull: '156.0.8041.62', platformVersion: '15.0.0', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36', touch: 0, screen: '1920x1080', cores: 6, deviceMemory: 8, sampleRate: 48000, colorDepth: 24 },
  { model: 'Windows PC · Intel Arc A770', gpu: 'ANGLE (Intel, Intel(R) Arc(TM) A770 Graphics (0x000056A0) Direct3D11 vs_5_0 ps_5_0, D3D11)', gpuVendor: 'Google Inc. (Intel)', chromeMajor: '157', chromeFull: '157.0.8103.79', platformVersion: '15.0.0', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36', touch: 0, screen: '1920x1080', cores: 8, deviceMemory: 16, sampleRate: 48000, colorDepth: 24 },
  { model: 'Windows PC · Intel Iris Xe', gpu: 'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x00009A49) Direct3D11 vs_5_0 ps_5_0, D3D11)', gpuVendor: 'Google Inc. (Intel)', chromeMajor: '156', chromeFull: '156.0.8041.62', platformVersion: '10.0.0', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36', touch: 0, screen: '1920x1080', cores: 4, deviceMemory: 8, sampleRate: 44100, colorDepth: 24 },
  { model: 'Windows PC · RTX 4070 Ti', gpu: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Ti (0x00002782) Direct3D11 vs_5_0 ps_5_0, D3D11)', gpuVendor: 'Google Inc. (NVIDIA)', chromeMajor: '157', chromeFull: '157.0.8103.79', platformVersion: '15.0.0', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36', touch: 0, screen: '2560x1440', cores: 16, deviceMemory: 32, sampleRate: 48000, colorDepth: 30 }
];

const PC_VOICE_LANG_PACKS = [
  ['en-US'],
  ['en-US', 'th-TH'],
  ['en-GB', 'en-US'],
  ['en-GB', 'en-US', 'th-TH'],
  ['en-US', 'ja-JP'],
  ['en-US', 'th-TH', 'ja-JP'],
  ['en-US', 'zh-CN'],
  ['en-AU', 'en-US', 'th-TH']
];
const ANDROID_VOICE_LANG_PACKS = [
  ['en-US', 'th-TH'],
  ['en-GB', 'en-US', 'th-TH'],
  ['en-US'],
  ['en-US', 'th-TH', 'ja-JP'],
  ['en-US', 'th-TH', 'ko-KR']
];
const WIN_APP_FONT_POOL = [
  'Aptos', 'Century Gothic', 'Garamond', 'Gill Sans MT', 'Tw Cen MT', 'Lucida Bright', 'Bodoni MT', 'Agency FB',
  'Myriad Pro', 'Minion Pro', 'TH Sarabun New', 'TH SarabunPSK', 'Angsana New', 'Cordia New', 'Browallia New',
  'Kanit', 'Prompt', 'Sarabun', 'Noto Sans Thai', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Source Sans Pro'
];

function normalizeDevicePlatform(val, fallback = 'pc') {
  const s = String(val || '').trim().toLowerCase();
  if (s === 'android' || s === 'mobile') return 'android';
  if (s === 'pc' || s === 'windows' || s === 'desktop') return 'pc';
  return fallback;
}

function normalizeDefaultPlatformMode(val) {
  const s = String(val || '').trim().toLowerCase();
  if (s === 'android' || s === 'mixed' || s === 'pc') return s;
  return 'pc';
}

function normalizeJailAutoCloseMode(v) {
  const s = String(v || '').trim().toLowerCase();
  if (s === 'same_ip' || s === 'all_ips') return s;
  return 'off';
}

function resolveDeviceSpec(deviceId, platform = 'pc') {
  const plat = normalizeDevicePlatform(platform, 'pc');
  const presets = plat === 'android' ? ANDROID_DEVICE_PRESETS : PC_DEVICE_PRESETS;
  const seedStr = `${plat}:${String(deviceId || 'default').toLowerCase()}`;
  let hash = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    hash ^= seedStr.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const h1 = hash >>> 0;
  let h2 = Math.imul(h1 ^ 0x9e3779b9, 16777619) >>> 0;
  const idx = h1 % presets.length;
  const picked = presets[idx] || presets[0];
  const isWin11 = plat !== 'android' && parseInt(String(picked.platformVersion || '15.0.0').split('.')[0], 10) >= 13;
  const voicePacks = plat === 'android' ? ANDROID_VOICE_LANG_PACKS : PC_VOICE_LANG_PACKS;
  const voiceLangs = voicePacks[h2 % voicePacks.length] || voicePacks[0];

  // Build OS-accurate installed font set (strictly NO macOS fonts on Windows/Android!)
  const installedFonts = [];
  if (plat === 'android') {
    installedFonts.push('Roboto');
    if ((h2 & 1) === 0) installedFonts.push('Noto Sans Thai');
  } else {
    // Windows core OS fonts (indices 0..11 of NC.Machine.FONT_OS)
    if (isWin11) {
      installedFonts.push('Segoe UI Variable Display', 'Segoe Fluent Icons');
      if ((h2 & 1) === 0) installedFonts.push('Cascadia Code');
    } else if ((h2 & 3) === 0) {
      installedFonts.push('Cascadia Code');
    }
    installedFonts.push('Bahnschrift', 'Ink Free', 'Sitka Text', 'Segoe UI Emoji', 'Leelawadee UI', 'Nirmala UI', 'Gadugi', 'Javanese Text');
    if ((h2 & 4) !== 0) installedFonts.push('HoloLens MDL2 Assets');

    // Realistic per-device subset of Office / Thai / Google fonts (indices 0..23 of NC.Machine.FONT_APP)
    // Thai Windows machines commonly have Angsana/Cordia/Browallia + varying subsets of Office/Thai/web fonts
    let fState = (h2 ^ 0x5bd1e995) >>> 0;
    const nextBit = () => { fState = (Math.imul(fState, 1664525) + 1013904223) >>> 0; return fState; };
    const alwaysThaiChance = ['Angsana New', 'Cordia New', 'Browallia New'];
    for (const f of WIN_APP_FONT_POOL) {
      const r = (nextBit() >>> 16) % 100;
      const threshold = alwaysThaiChance.includes(f) ? 75 : (f === 'TH Sarabun New' || f === 'TH SarabunPSK' ? 45 : 28);
      if (r < threshold) installedFonts.push(f);
    }
    // Ensure at least 2 app fonts so bitmask is never degenerate all-zero
    if (installedFonts.length < 11) {
      installedFonts.push('Angsana New', 'Cordia New');
    }
  }

  return {
    platform: plat,
    model: picked.model,
    gpu: picked.gpu,
    gpuVendor: picked.gpuVendor || (plat === 'android' ? 'Qualcomm' : 'Google Inc. (NVIDIA)'),
    chromeMajor: picked.chromeMajor || '157',
    chromeFull: picked.chromeFull || '157.0.8103.79',
    platformVersion: picked.platformVersion || (plat === 'android' ? '14.0.0' : '15.0.0'),
    ua: picked.ua,
    touch: picked.touch,
    screen: picked.screen,
    cores: picked.cores,
    deviceMemory: picked.deviceMemory || (plat === 'android' ? 4 : 16),
    sampleRate: picked.sampleRate || 48000,
    colorDepth: picked.colorDepth || 24,
    voiceLangs,
    installedFonts
  };
}

const HEALTH_JS = `(() => {
  const bs = window.__pmScriptBootstrap?.status?.() || null;
  const bootstrapPhase = bs?.phase || null;
  return {
    href: location.href,
    documentId: String(performance.timeOrigin),
    ready: document.readyState,
    profileId: window.__pmProfileId || (typeof sessionStorage !== 'undefined' && sessionStorage.getItem && sessionStorage.getItem('__pmProfileId')) || null,
    deviceId: window.__pmDeviceId || null,
    machineId: window.__pmMachineId || null,
    devicePlatform: (window.__pmDeviceSpec && window.__pmDeviceSpec.platform) || null,
    deviceModel: (window.__pmDeviceSpec && window.__pmDeviceSpec.model) || null,
    deviceGpu: (window.__pmDeviceSpec && window.__pmDeviceSpec.gpu) || null,
    storageRestored: !!window.__pmStorageRestored,
    version: window.__nightcampBotVersion || window.__pelicanBotVersion || null,
    hud: !!document.getElementById('nightcamp-hud') || !!document.getElementById('pelican-hud'),
    liveHook: typeof window.__getClientLiveState === 'function',
    bootstrapPhase,
    bootstrapFailed: bootstrapPhase === 'failed',
    payloadInitialized: !!window.__pmPayloadInitialized,
    initialized: !!window.__pmPayloadInitialized || (bs && bootstrapPhase !== 'waiting') || !!window.__pmBrowserInjectionAttempted || ('__isBotRunning' in window) || typeof window.startMasterBot === 'function' || typeof window.startAutoLoop === 'function'
  };
})()`;

function findBrowser(kind) {
  const pf = process.env.ProgramFiles || 'C:\\Program Files';
  const pf86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  const local = process.env.LOCALAPPDATA || '';
  const cloakCandidates = [
    path.join(local, 'PmheeNightcamp\\cloakbrowser\\chrome.exe'),
    path.join(local, 'PmheeNightcamp\\cloakbrowser\\chrome-win\\chrome.exe'),
    path.join(local, 'PmheeNightcamp\\cloakbrowser\\chrome-win64\\chrome.exe'),
    path.join(local, 'PmheeNightcamp\\cloakbrowser\\cloakbrowser-windows-x64\\chrome.exe'),
    path.join(__dirname, '..\\bin\\cloakbrowser\\chrome.exe'),
    path.join(local, 'cloakbrowser\\chrome.exe')
  ];
  // Also scan one level deep inside %LOCALAPPDATA%\PmheeNightcamp\cloakbrowser if extracted into a versioned subfolder
  try {
    const cloakRoot = path.join(local, 'PmheeNightcamp\\cloakbrowser');
    if (fs.existsSync(cloakRoot)) {
      for (const entry of fs.readdirSync(cloakRoot, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          cloakCandidates.push(path.join(cloakRoot, entry.name, 'chrome.exe'));
        }
      }
    }
  } catch (_) {}
  const chrome = [
    ...cloakCandidates,
    path.join(pf, 'Google\\Chrome\\Application\\chrome.exe'),
    path.join(pf86, 'Google\\Chrome\\Application\\chrome.exe'),
    path.join(local, 'Google\\Chrome\\Application\\chrome.exe')
  ];
  const edge = [
    path.join(pf86, 'Microsoft\\Edge\\Application\\msedge.exe'),
    path.join(pf, 'Microsoft\\Edge\\Application\\msedge.exe'),
    path.join(local, 'Microsoft\\Edge\\Application\\msedge.exe')
  ];
  const list = kind === 'edge' ? edge.concat(chrome) : chrome.concat(edge);
  return list.find(p => { try { return fs.existsSync(p); } catch (e) { return false; } }) || null;
}

function getText(url, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { timeout }, res => {
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('HTTP ' + res.statusCode)); }
      let d = '';
      res.setEncoding('utf8');
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('timeout')));
  });
}

function isUnverifiedCandidateAuth(cfg) {
  if (!cfg || typeof cfg !== 'object') return false;
  if (cfg.register === true) return true;
  if (cfg.registerError && String(cfg.registerError).trim() && !cfg.registerDone && !cfg.verifiedLoginAt && !cfg.userEditedAt) return true;
  if (cfg.generatedUser && !cfg.registerDone && !cfg.verifiedLoginAt && !cfg.userEditedAt) return true;
  return false;
}

function mergeAuthConfigString(existingRaw, incomingRaw) {
  if (!existingRaw) return incomingRaw;
  if (!incomingRaw) return existingRaw;
  try {
    const a = JSON.parse(existingRaw);
    const b = JSON.parse(incomingRaw);
    if (!a || typeof a !== 'object') return incomingRaw;
    if (!b || typeof b !== 'object') return existingRaw;
    const aHasCreds = Boolean(a.username && String(a.username).trim() && a.password && String(a.password).trim());
    const bHasCreds = Boolean(b.username && String(b.username).trim() && b.password && String(b.password).trim());
    const aUnverified = isUnverifiedCandidateAuth(a);
    const bUnverified = isUnverifiedCandidateAuth(b);
    if (aHasCreds && !aUnverified && bUnverified) {
      const keep = { ...b, ...a };
      if (!keep.charName && b.charName) keep.charName = b.charName;
      return JSON.stringify(keep);
    }
    const aStamp = Math.max(Number(a.userEditedAt) || 0, Number(a.verifiedLoginAt) || 0);
    const bStamp = Math.max(Number(b.userEditedAt) || 0, Number(b.verifiedLoginAt) || 0);
    if (aHasCreds && aStamp > 0 && bHasCreds && bStamp < aStamp && (b.generatedUser || Number(b.lastManagerPushAt) > 0)) {
      const keep = { ...b, ...a };
      if (!keep.charName && b.charName) keep.charName = b.charName;
      return JSON.stringify(keep);
    }
    const out = { ...a, ...b };
    if (a.username && String(a.username).trim() && !(b.username && String(b.username).trim())) {
      out.username = a.username;
      if (a.enabled) out.enabled = true;
    }
    if (a.password && String(a.password).trim() && !(b.password && String(b.password).trim())) {
      out.password = a.password;
      if (a.enabled) out.enabled = true;
    }
    if (a.charName && String(a.charName).trim() && !(b.charName && String(b.charName).trim())) {
      out.charName = a.charName;
    }
    return JSON.stringify(out);
  } catch (_) {
    return incomingRaw;
  }
}

function isStubSellWhitelist(wl) {
  const s = String(wl || '').trim();
  return !s || s === 'Halloween Candy, Golden Pumpkin' || s === 'Phracon, Rough Elunium, Enchant Rune, Composite Bow, Crossbow, Gakkung, Hunter Bow';
}

function mergeSellConfigString(existingRaw, incomingRaw) {
  if (!existingRaw) return incomingRaw;
  if (!incomingRaw) return existingRaw;
  try {
    const a = JSON.parse(existingRaw);
    const b = JSON.parse(incomingRaw);
    if (!a || typeof a !== 'object') return incomingRaw;
    if (!b || typeof b !== 'object') return existingRaw;
    const aComplete = typeof a.weaponRarity === 'string' && typeof a.armorRarity === 'string' && Object.keys(a).length >= 8;
    const bComplete = typeof b.weaponRarity === 'string' && typeof b.armorRarity === 'string' && Object.keys(b).length >= 8;
    if (aComplete && !bComplete) {
      const out = { ...a, ...b };
      if (a.whitelist && String(a.whitelist).length > 50 && isStubSellWhitelist(b.whitelist)) {
        out.whitelist = a.whitelist;
      }
      if (a.forceSellList && String(a.forceSellList).trim() && !(b.forceSellList && String(b.forceSellList).trim())) {
        out.forceSellList = a.forceSellList;
      }
      if (a.statsFilter && typeof a.statsFilter === 'object' && (!b.statsFilter || typeof b.statsFilter !== 'object')) {
        out.statsFilter = a.statsFilter;
      }
      return JSON.stringify(out);
    }
    if (aComplete && bComplete && !b.__userSavedAt && isStubSellWhitelist(b.whitelist) && a.whitelist && String(a.whitelist).length > 80 && b.weaponRarity === 'normal' && b.armorRarity === 'normal' && !b.forceSellList) {
      return existingRaw;
    }
    return incomingRaw;
  } catch (_) {
    return incomingRaw;
  }
}

function readVarint(buf, offset, limit) {
  let res = 0, shift = 0, pos = offset;
  const end = limit !== undefined ? limit : buf.length;
  while (pos < end) {
    const b = buf[pos++];
    res += (b & 0x7f) * Math.pow(2, shift);
    if ((b & 0x80) === 0) return { val: res, next: pos };
    shift += 7;
    if (shift > 49) return null;
  }
  return null;
}

function snappyUncompress(comp) {
  const hdr = readVarint(comp, 0);
  if (!hdr || hdr.val <= 0 || hdr.val > 8 * 1024 * 1024) return null;
  const out = Buffer.allocUnsafe(hdr.val);
  let ip = hdr.next, op = 0;
  while (ip < comp.length && op < out.length) {
    const tag = comp[ip++];
    const type = tag & 0x03;
    if (type === 0) {
      let len = (tag >> 2) + 1;
      if (len > 60) {
        const extraBytes = len - 60;
        if (ip + extraBytes > comp.length) return null;
        len = 0;
        for (let i = 0; i < extraBytes; i++) len |= comp[ip++] << (8 * i);
        len += 1;
      }
      if (ip + len > comp.length || op + len > out.length) return null;
      comp.copy(out, op, ip, ip + len);
      ip += len;
      op += len;
    } else {
      let len = 0, offset = 0;
      if (type === 1) {
        len = ((tag >> 2) & 0x07) + 4;
        if (ip >= comp.length) return null;
        offset = ((tag & 0xe0) << 3) | comp[ip++];
      } else if (type === 2) {
        len = (tag >> 2) + 1;
        if (ip + 2 > comp.length) return null;
        offset = comp[ip] | (comp[ip + 1] << 8);
        ip += 2;
      } else {
        len = (tag >> 2) + 1;
        if (ip + 4 > comp.length) return null;
        offset = (comp[ip] | (comp[ip + 1] << 8) | (comp[ip + 2] << 16) | (comp[ip + 3] << 24)) >>> 0;
        ip += 4;
      }
      if (offset <= 0 || offset > op || op + len > out.length) return null;
      for (let i = 0; i < len; i++) {
        out[op] = out[op - offset];
        op++;
      }
    }
  }
  return op === out.length ? out : null;
}

function decodeChromiumString(buf) {
  if (!buf || buf.length === 0) return '';
  if (buf[0] === 0) return buf.subarray(1).toString('utf16le');
  if (buf[0] === 1) return buf.subarray(1).toString('latin1');
  return buf.toString('utf8');
}

function decodeLevelDbKeyAndVal(rawKey, rawVal, isWal) {
  const userKey = (!isWal && rawKey.length >= 8) ? rawKey.subarray(0, rawKey.length - 8) : rawKey;
  const sep = userKey.indexOf(0x00);
  if (sep === -1 || sep + 1 >= userKey.length) return null;
  const keyPart = userKey.subarray(sep + 1);
  return { kStr: decodeChromiumString(keyPart), vStr: decodeChromiumString(rawVal) };
}

function extractPelicanStorageFromLevelDb(levelDbDir, fallbackProfileId = null) {
  const byProfile = {};
  const unprefixed = {};
  const authHistoryByProfile = {};
  const unprefixedAuthHistory = [];
  let totalKeys = 0;
  if (!levelDbDir || !fs.existsSync(levelDbDir)) return { byProfile, unprefixed, authHistoryByProfile, unprefixedAuthHistory, totalKeys };
  const recordAuthHistory = (pid, vStr) => {
    try {
      const parsed = JSON.parse(vStr);
      if (!parsed || typeof parsed !== 'object') return;
      const username = String(parsed.username || '').trim();
      const password = String(parsed.password || '').trim();
      const charName = String(parsed.charName || '').trim();
      if (!username && !password) return;
      const item = {
        username,
        password,
        charName,
        generatedUser: Boolean(parsed.generatedUser),
        register: Boolean(parsed.register),
        registerDone: Boolean(parsed.registerDone),
        registerError: String(parsed.registerError || ''),
        verifiedLoginAt: Number(parsed.verifiedLoginAt) || 0,
        userEditedAt: Number(parsed.userEditedAt) || 0
      };
      const sig = username + ':' + password;
      if (pid) {
        if (!authHistoryByProfile[pid]) authHistoryByProfile[pid] = [];
        const existingIdx = authHistoryByProfile[pid].findIndex(x => (x.username + ':' + x.password) === sig);
        if (existingIdx === -1) authHistoryByProfile[pid].push(item);
        else authHistoryByProfile[pid][existingIdx] = { ...authHistoryByProfile[pid][existingIdx], ...item };
      } else {
        const existingIdx = unprefixedAuthHistory.findIndex(x => (x.username + ':' + x.password) === sig);
        if (existingIdx === -1) unprefixedAuthHistory.push(item);
        else unprefixedAuthHistory[existingIdx] = { ...unprefixedAuthHistory[existingIdx], ...item };
      }
    } catch (_) {}
  };
  const recordEntry = (kStr, vStr) => {
    if (!kStr || typeof vStr !== 'string' || !kStr.startsWith('pelican_')) return;
    const isAuth = kStr.endsWith('__auth_cfg') || kStr === 'pelican_auth_cfg';
    const isSell = kStr.endsWith('__sell_cfg') || kStr === 'pelican_sell_cfg';
    const m = kStr.match(/^pelican_((?:profile|af)_[a-zA-Z0-9_]+)__/);
    if (m && m[1]) {
      const pid = m[1];
      if (!byProfile[pid]) byProfile[pid] = {};
      if (isAuth) recordAuthHistory(pid, vStr);
      if (isAuth && byProfile[pid][kStr]) {
        byProfile[pid][kStr] = mergeAuthConfigString(byProfile[pid][kStr], vStr);
      } else if (isSell && byProfile[pid][kStr]) {
        byProfile[pid][kStr] = mergeSellConfigString(byProfile[pid][kStr], vStr);
      } else {
        byProfile[pid][kStr] = vStr;
      }
      totalKeys++;
    } else {
      if (isAuth) recordAuthHistory(fallbackProfileId || null, vStr);
      if (isAuth && unprefixed[kStr]) {
        unprefixed[kStr] = mergeAuthConfigString(unprefixed[kStr], vStr);
      } else if (isSell && unprefixed[kStr]) {
        unprefixed[kStr] = mergeSellConfigString(unprefixed[kStr], vStr);
      } else {
        unprefixed[kStr] = vStr;
      }
      if (fallbackProfileId) {
        if (!byProfile[fallbackProfileId]) byProfile[fallbackProfileId] = {};
        if (isAuth && byProfile[fallbackProfileId][kStr]) {
          byProfile[fallbackProfileId][kStr] = mergeAuthConfigString(byProfile[fallbackProfileId][kStr], vStr);
        } else if (isSell && byProfile[fallbackProfileId][kStr]) {
          byProfile[fallbackProfileId][kStr] = mergeSellConfigString(byProfile[fallbackProfileId][kStr], vStr);
        } else {
          byProfile[fallbackProfileId][kStr] = vStr;
        }
      }
      totalKeys++;
    }
  };

  try {
    const files = fs.readdirSync(levelDbDir).filter(f => f.endsWith('.ldb') || f.endsWith('.log')).sort();
    for (const f of files) {
      try {
        const buf = fs.readFileSync(path.join(levelDbDir, f));
        if (f.endsWith('.ldb')) {
          if (buf.length < 48) continue;
          const footer = buf.subarray(buf.length - 48);
          const mhOff = readVarint(footer, 0);
          const mhSz = mhOff ? readVarint(footer, mhOff.next) : null;
          const ihOff = mhSz ? readVarint(footer, mhSz.next) : null;
          const ihSz = ihOff ? readVarint(footer, ihOff.next) : null;
          if (!ihOff || !ihSz || ihOff.val + ihSz.val + 1 > buf.length) continue;
          let idxBlock = buf.subarray(ihOff.val, ihOff.val + ihSz.val);
          if (buf[ihOff.val + ihSz.val] === 1) idxBlock = snappyUncompress(idxBlock) || idxBlock;
          if (!idxBlock || idxBlock.length < 4) continue;
          const idxRestarts = idxBlock.readUInt32LE(idxBlock.length - 4);
          const idxLimit = idxBlock.length - 4 - idxRestarts * 4;
          let pos = 0;
          while (pos < idxLimit) {
            const s = readVarint(idxBlock, pos, idxLimit); if (!s) break;
            const u = readVarint(idxBlock, s.next, idxLimit); if (!u) break;
            const v = readVarint(idxBlock, u.next, idxLimit); if (!v) break;
            pos = v.next;
            if (pos + u.val + v.val > idxLimit) break;
            const hBuf = idxBlock.subarray(pos + u.val, pos + u.val + v.val);
            pos += u.val + v.val;
            const bOff = readVarint(hBuf, 0);
            const bSz = bOff ? readVarint(hBuf, bOff.next) : null;
            if (!bOff || !bSz || bOff.val + bSz.val + 1 > buf.length) continue;
            let dBlock = buf.subarray(bOff.val, bOff.val + bSz.val);
            if (buf[bOff.val + bSz.val] === 1) dBlock = snappyUncompress(dBlock);
            if (!dBlock || dBlock.length < 4) continue;
            const numRestarts = dBlock.readUInt32LE(dBlock.length - 4);
            const dLimit = dBlock.length - 4 - numRestarts * 4;
            let dPos = 0, lastKey = Buffer.alloc(0);
            while (dPos < dLimit) {
              const ds = readVarint(dBlock, dPos, dLimit); if (!ds) break;
              const du = readVarint(dBlock, ds.next, dLimit); if (!du) break;
              const dv = readVarint(dBlock, du.next, dLimit); if (!dv) break;
              dPos = dv.next;
              if (ds.val > lastKey.length || dPos + du.val + dv.val > dLimit) break;
              const key = Buffer.concat([lastKey.subarray(0, ds.val), dBlock.subarray(dPos, dPos + du.val)]);
              const val = dBlock.subarray(dPos + du.val, dPos + du.val + dv.val);
              dPos += du.val + dv.val;
              lastKey = key;
              const kv = decodeLevelDbKeyAndVal(key, val, false);
              if (kv) recordEntry(kv.kStr, kv.vStr);
            }
          }
        } else if (f.endsWith('.log')) {
          const BLOCK_SIZE = 32768;
          let blockOffset = 0;
          let pendingChunks = [];
          const parseBatch = (batch) => {
            if (!batch || batch.length < 12) return;
            let pos = 12;
            while (pos < batch.length) {
              const recType = batch[pos++];
              if (recType === 1) {
                const kLen = readVarint(batch, pos); if (!kLen) break;
                pos = kLen.next;
                if (pos + kLen.val > batch.length) break;
                const key = batch.subarray(pos, pos + kLen.val);
                pos += kLen.val;
                const vLen = readVarint(batch, pos); if (!vLen) break;
                pos = vLen.next;
                if (pos + vLen.val > batch.length) break;
                const val = batch.subarray(pos, pos + vLen.val);
                pos += vLen.val;
                const kv = decodeLevelDbKeyAndVal(key, val, true);
                if (kv) recordEntry(kv.kStr, kv.vStr);
              } else if (recType === 0) {
                const kLen = readVarint(batch, pos); if (!kLen) break;
                pos = kLen.next + kLen.val;
              } else {
                break;
              }
            }
          };
          while (blockOffset < buf.length) {
            const blockEnd = Math.min(buf.length, blockOffset + BLOCK_SIZE);
            let pos = blockOffset;
            while (pos + 7 <= blockEnd) {
              const len = buf[pos + 4] | (buf[pos + 5] << 8);
              const type = buf[pos + 6];
              if (type === 0 || len === 0 || pos + 7 + len > blockEnd) break;
              const chunk = buf.subarray(pos + 7, pos + 7 + len);
              pos += 7 + len;
              if (type === 1) {
                parseBatch(chunk);
                pendingChunks = [];
              } else if (type === 2) {
                pendingChunks = [chunk];
              } else if (type === 3 && pendingChunks.length > 0) {
                pendingChunks.push(chunk);
              } else if (type === 4 && pendingChunks.length > 0) {
                pendingChunks.push(chunk);
                parseBatch(Buffer.concat(pendingChunks));
                pendingChunks = [];
              }
            }
            blockOffset += BLOCK_SIZE;
          }
        }
        try {
          const textAscii = buf.toString('utf8');
          const re = /\{[^{}]{0,400}"username"\s*:\s*"([^"]{1,64})"[^{}]{0,400}"password"\s*:\s*"([^"]{1,64})"[^{}]{0,400}\}/g;
          let m;
          while ((m = re.exec(textAscii)) !== null) {
            recordAuthHistory(fallbackProfileId || null, m[0]);
          }
        } catch (_) {}
      } catch (_) {}
    }
  } catch (_) {}
  return { byProfile, unprefixed, authHistoryByProfile, unprefixedAuthHistory, totalKeys };
}

function createBrowserMode({ rootDir, sessionsDir, getSettings, loadProfiles, preferLocalBot, cdpPort = DEFAULT_CDP_PORT, browserUserDataDir, gameUrl = GAME_URL, profileScriptSource, screenProxy, assetCache }) {
  if(!Number.isInteger(cdpPort)||cdpPort<1024||cdpPort>65535)throw Error('INVALID_CDP_PORT');
  const CDP_PORT = cdpPort;
  const effectiveAssetCache = assetCache || screenProxy?.assetCache || null;
  const isGameUrl=value=>{try{return new URL(value).origin===new URL(gameUrl).origin;}catch(_){return false;}};
  const userDataDir = browserUserDataDir || path.join(sessionsDir, '_browser');
  const storageDir = (sessionsDir && sessionsDir !== 'fake') ? path.join(sessionsDir, '_browser_storage') : null;
  const localBotPath = path.join(rootDir, 'bot.js');
  let browserProc = null;
  let ws = null, wsReady = null, nextId = 1;
  const pending = new Map();            // CDP call id -> {resolve, reject}
  const listeners = new Set();          // CDP event listeners
  const clients = new Map();            // profileId -> { targetId, sessionId, server, port, browserContextId }
  let startupPages = [];                // the empty window Chrome opens on start — closed once a game window exists
  const portServers = new Map();        // port -> proxy server (one per port, even if a client object went stale)
  let rediscovering = null;
  let lastRediscoverSuccessAt = 0;
  let started = false, reconnectTimer = null, reconnectDelay = 1000, monitorTimer = null;
  const stoppedProfiles = new Set(), knownTargets = new Map(), knownProxyContexts = new Map(), diagnostics = new Map();
  const migratingProxyProfiles = new Set();
  const knownTargetsFile = (sessionsDir && sessionsDir !== 'fake') ? path.join(sessionsDir, '_browser_targets.json') : null;
  const knownProxyContextsFile = (sessionsDir && sessionsDir !== 'fake') ? path.join(sessionsDir, '_browser_proxy_contexts.json') : null;
  const wsUrlFile = (sessionsDir && sessionsDir !== 'fake') ? path.join(sessionsDir, '_browser_ws.json') : null;
  const customIpFile = (sessionsDir && sessionsDir !== 'fake') ? path.join(sessionsDir, '_custom_ip_device_groups.json') : null;
  const isRealSession = Boolean(sessionsDir && sessionsDir !== 'fake');
  const profileDeviceIds = new Map();
  const profileMachineIds = new Map();
  const profileDeviceGroupIndex = new Map();
  const profileDeviceSpecs = new Map();
  const deviceMachineMap = new Map();
  const usedDeviceIds = new Set();
  const usedMachineIds = new Set();
  let deviceIdsInitialized = false;
  let lastGroupedOrderSignature = '';

  // Anti-Clone Hardware Guard: if this folder was copied/cloned to another PC (different MachineGuid),
  // automatically strip the old PC's spoofed Device/Machine IDs and stale browser target files so the cloned PC
  // mints fresh Device/Machine IDs and never collides with the original PC.
  if (storageDir) {
    try {
      let currentHwId = (screenProxy && typeof screenProxy.getMachineHwid === 'function') ? screenProxy.getMachineHwid() : '';
      if (!currentHwId) {
        let rawGuid = '';
        try {
          const { execSync } = require('child_process');
          const regOut = execSync('reg query HKLM\\SOFTWARE\\Microsoft\\Cryptography /v MachineGuid', { encoding: 'utf8', windowsHide: true });
          rawGuid = regOut.match(/MachineGuid\s+REG_SZ\s+([a-f0-9-]+)/i)?.[1]?.toUpperCase() || '';
        } catch (_) {}
        currentHwId = crypto.createHash('sha256').update('PMhee.MachineFingerprint.v1|' + (rawGuid || require('os').hostname().toUpperCase())).digest('hex').toUpperCase();
      }
      fs.mkdirSync(storageDir, { recursive: true });
      const ownerFile = path.join(storageDir, '_machine_owner.json');
      let savedOwner = null;
      if (fs.existsSync(ownerFile)) {
        try { savedOwner = JSON.parse(fs.readFileSync(ownerFile, 'utf8')); } catch (_) {}
      }
      if (savedOwner && savedOwner.machineHwid && savedOwner.machineHwid !== currentHwId) {
        console.warn('[Anti-Clone Guard] 🛡️ ตรวจพบการคัดลอกโฟลเดอร์แอพมาจากเครื่องอื่น -> รีเซ็ต Device ID / Machine ID ยกชุดสำหรับเครื่องใหม่เพื่อป้องกันการชนกัน!');
        const files = fs.readdirSync(storageDir).filter(f => f.endsWith('.json') && f !== '_machine_owner.json');
        for (const f of files) {
          try {
            const fp = path.join(storageDir, f);
            const obj = JSON.parse(fs.readFileSync(fp, 'utf8'));
            if (obj && typeof obj === 'object') {
              let modified = false;
              for (const k of Object.keys(obj)) {
                if (k === 'aetheria.device' || k === 'aetheria.machine' || k.endsWith('__aetheria_device') || k.endsWith('__aetheria_machine')) {
                  delete obj[k];
                  modified = true;
                }
              }
              if (modified) {
                fs.writeFileSync(fp + '.tmp', JSON.stringify(obj), 'utf8');
                fs.renameSync(fp + '.tmp', fp);
              }
            }
          } catch (_) {}
        }
        try { if (knownTargetsFile && fs.existsSync(knownTargetsFile)) fs.unlinkSync(knownTargetsFile); } catch (_) {}
        try { if (knownProxyContextsFile && fs.existsSync(knownProxyContextsFile)) fs.unlinkSync(knownProxyContextsFile); } catch (_) {}
        try { if (wsUrlFile && fs.existsSync(wsUrlFile)) fs.unlinkSync(wsUrlFile); } catch (_) {}
      }
      if (!savedOwner || savedOwner.machineHwid !== currentHwId) {
        fs.writeFileSync(ownerFile + '.tmp', JSON.stringify({ machineHwid: currentHwId, updatedAt: Date.now() }, null, 2), 'utf8');
        fs.renameSync(ownerFile + '.tmp', ownerFile);
      }
    } catch (_) {}
  }

  function loadProfileStorage(profileId) {
    if (!storageDir || !profileId) return {};
    try {
      const f = path.join(storageDir, `${profileId}.json`);
      if (!fs.existsSync(f)) return {};
      const data = JSON.parse(fs.readFileSync(f, 'utf8'));
      return (data && typeof data === 'object' && !Array.isArray(data)) ? data : {};
    } catch (_) { return {}; }
  }
  function isTransientStorageKey(k) {
    if (!k || typeof k !== 'string') return false;
    if (k === 'aetheria.device' || k === 'aetheria.machine' || k === 'pelican_icon_manifest' || k === 'pelican_item_catalog' || k === 'pelican_latest_inventory' || k === 'pelican_packet_logs' || k === 'pelican_last_weight' || k === 'pelican_embedded_human_check_cfg' || k === 'pelican_job_return_map' || k === 'pelican_gohome_keep_farm' || k === 'pelican_gear_trip' || k === 'pelican_town_needs' || k === 'pelican_override_farm_map' || k === 'pelican_weight_topup' || k.startsWith('webgame.chat.')) return true;
    return k.endsWith('__icon_manifest') || k.endsWith('__item_catalog') || k.endsWith('__latest_inventory') || k.endsWith('__packet_logs') || k.endsWith('__last_weight') || k.endsWith('__embedded_human_check_cfg') || k.endsWith('__job_return_map') || k.endsWith('__gohome_keep_farm') || k.endsWith('__gear_trip') || k.endsWith('__town_needs') || k.endsWith('__override_farm_map') || k.endsWith('__weight_topup') || (k.indexOf('__gear_bought_') !== -1 && k.endsWith('_pending'));
  }
  function extractSessionJwtUserId(jwtStr) {
    if (!jwtStr || typeof jwtStr !== 'string') return '';
    try {
      const parts = jwtStr.split('.');
      if (parts.length < 2) return '';
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
      return (payload && typeof payload.userId === 'string') ? payload.userId.trim() : '';
    } catch (_) {
      return '';
    }
  }
  function isForeignAuthUsername(profileId, username) {
    const u = String(username || '').trim().toLowerCase();
    if (!u || !profileId || typeof loadProfiles !== 'function') return false;
    try {
      const list = loadProfiles() || [];
      const self = list.find(p => p && p.id === profileId);
      const selfAccount = String(self && self.account || '').trim().toLowerCase();
      if (selfAccount && selfAccount === u) return false;
      if (selfAccount && !self.autoRegister && selfAccount !== u) return true;
      return list.some(p => p && p.id !== profileId && String(p.account || '').trim().toLowerCase() === u);
    } catch (_) {
      return false;
    }
  }
  function isForeignOrMismatchedSessionJwt(profileId, jwtStr) {
    const jwtUser = extractSessionJwtUserId(jwtStr);
    if (!jwtUser || !profileId || typeof loadProfiles !== 'function') return false;
    const u = jwtUser.toLowerCase();
    try {
      const list = loadProfiles() || [];
      const self = list.find(p => p && p.id === profileId);
      const selfAccount = String(self && self.account || '').trim().toLowerCase();
      if (selfAccount && selfAccount !== u) return true;
      return list.some(p => p && p.id !== profileId && String(p.account || '').trim().toLowerCase() === u);
    } catch (_) {
      return false;
    }
  }
  function isForeignAuthCfgString(profileId, rawAuthStr) {
    if (!rawAuthStr || typeof rawAuthStr !== 'string') return false;
    try {
      const parsed = JSON.parse(rawAuthStr);
      if (parsed && typeof parsed === 'object' && parsed.username) {
        return isForeignAuthUsername(profileId, parsed.username);
      }
    } catch (_) {}
    return false;
  }
  function isForeignOrStaleNightcampAcct(profileId, key, rawVal) {
    if (!key || typeof key !== 'string' || key.indexOf('__nc__nightcamp.online.acct:') === -1) return false;
    if (!rawVal || typeof rawVal !== 'string' || !profileId || typeof loadProfiles !== 'function') return false;
    try {
      const list = loadProfiles() || [];
      const self = list.find(p => p && p.id === profileId);
      if (!self) return false;
      const selfAccount = String(self.account || '').trim().toLowerCase();
      if (self.autoRegister && !selfAccount) return true;
      const parsed = JSON.parse(rawVal);
      const acctName = String(parsed && parsed.name || '').trim().toLowerCase();
      if (!acctName) return false;
      if (selfAccount && selfAccount !== acctName) return true;
      return list.some(p => p && p.id !== profileId && String(p.account || '').trim().toLowerCase() === acctName);
    } catch (_) {
      return false;
    }
  }
  function isProtectedProfileStorageKey(k) {
    if (!k || typeof k !== 'string') return false;
    return k.endsWith('__auth_cfg') || k.endsWith('__sell_cfg') || k.endsWith('__nc_sell_cfg') || k.endsWith('__pm_import_stamp') || k.endsWith('__aetheria_device') || k.endsWith('__aetheria_machine') || k.endsWith('__bot_running') || k.endsWith('__bot_run_mode') || k.endsWith('__bot_running_at') || k.indexOf('__nc__nightcamp.online.') !== -1 || k === '__ss:aetheria.session';
  }
  function saveProfileStorage(profileId, entries, opts = {}) {
    if (!storageDir || !profileId || !entries || typeof entries !== 'object') return;
    try {
      fs.mkdirSync(storageDir, { recursive: true });
      const f = path.join(storageDir, `${profileId}.json`);
      const pfx = `pelican_${profileId}__`;
      const isFullHarvest = Boolean(opts && opts.fullHarvest);
      const rawExisting = loadProfileStorage(profileId);
      const merged = {};
      for (const [k, v] of Object.entries(rawExisting || {})) {
        if (v === null || v === undefined || isTransientStorageKey(k)) continue;
        if (k === '__ss:aetheria.session' && isForeignOrMismatchedSessionJwt(profileId, v)) continue;
        if (isForeignOrStaleNightcampAcct(profileId, k, v)) continue;
        if (k.startsWith('pelican_')) {
          if (k.startsWith(pfx)) {
            if (k.endsWith('__auth_cfg') && isForeignAuthCfgString(profileId, v)) continue;
            if (isFullHarvest && entries[k] === undefined && !isProtectedProfileStorageKey(k)) continue;
            merged[k] = v;
          } else if (!k.includes('__') && k !== 'pelican_auth_cfg' && k !== 'pelican_icon_manifest' && k !== 'pelican_item_catalog' && k !== 'pelican_script_plan' && k !== 'pelican_plan_script_enabled') {
            const mapped = pfx + k.slice(8);
            if (isTransientStorageKey(mapped)) continue;
            if (isForeignOrStaleNightcampAcct(profileId, mapped, v)) continue;
            if (isFullHarvest && entries[mapped] === undefined && !isProtectedProfileStorageKey(mapped)) continue;
            if (rawExisting[mapped] === undefined && merged[mapped] === undefined) merged[mapped] = v;
          }
        } else {
          merged[k] = v;
        }
      }
      for (const [k, v] of Object.entries(entries)) {
        if (v === null || v === undefined || isTransientStorageKey(k)) continue;
        if (k === '__ss:aetheria.session' && isForeignOrMismatchedSessionJwt(profileId, v)) continue;
        let targetKey = k;
        if (k.startsWith('pelican_')) {
          if (k.startsWith(pfx)) {
            targetKey = k;
          } else if (!k.includes('__')) {
            if (k === 'pelican_auth_cfg' || k === 'pelican_icon_manifest' || k === 'pelican_item_catalog' || k === 'pelican_script_plan' || k === 'pelican_plan_script_enabled') continue;
            const mapped = pfx + k.slice(8);
            if (isTransientStorageKey(mapped)) continue;
            if (entries[mapped] !== undefined || merged[mapped] !== undefined) continue;
            targetKey = mapped;
          } else {
            continue;
          }
        }
        if (targetKey.endsWith('__auth_cfg') && isForeignAuthCfgString(profileId, v)) continue;
        if (isForeignOrStaleNightcampAcct(profileId, targetKey, v)) continue;
        if (targetKey.endsWith('__auth_cfg') && merged[targetKey]) {
          merged[targetKey] = mergeAuthConfigString(merged[targetKey], v);
        } else if ((targetKey.endsWith('__sell_cfg') || targetKey === 'pelican_sell_cfg') && merged[targetKey]) {
          merged[targetKey] = mergeSellConfigString(merged[targetKey], v);
        } else {
          merged[targetKey] = v;
        }
      }
      const devKey = `pelican_${profileId}__aetheria_device`;
      const ncDevKey = `pelican_${profileId}__nc__nightcamp.online.device`;
      const incomingDev = typeof entries[devKey] === 'string' ? entries[devKey].trim() : '';
      let effectiveDev = '';
      if (profileDeviceIds.has(profileId)) {
        effectiveDev = profileDeviceIds.get(profileId);
        merged[devKey] = effectiveDev;
      } else if (UUID_V4_RE.test(incomingDev)) {
        effectiveDev = incomingDev;
        profileDeviceIds.set(profileId, incomingDev);
        usedDeviceIds.add(incomingDev.toLowerCase());
        merged[devKey] = incomingDev;
      }
      if (effectiveDev) {
        merged[ncDevKey] = JSON.stringify(String(effectiveDev).replace(/-/g, ''));
      }
      const machKey = `pelican_${profileId}__aetheria_machine`;
      const incomingMach = typeof entries[machKey] === 'string' ? entries[machKey].trim().toLowerCase() : '';
      if (profileMachineIds.has(profileId)) {
        merged[machKey] = profileMachineIds.get(profileId);
      } else if (SHA256_HEX_RE.test(incomingMach)) {
        profileMachineIds.set(profileId, incomingMach);
        usedMachineIds.add(incomingMach);
        merged[machKey] = incomingMach;
      }
      fs.writeFileSync(f + '.tmp', JSON.stringify(merged), 'utf8');
      fs.renameSync(f + '.tmp', f);
    } catch (_) {}
  }

  let historicalDevicesSeeded = false;
  function seedHistoricalDeviceIdsOnce() {
    if (historicalDevicesSeeded) return;
    historicalDevicesSeeded = true;
    try {
      if (!storageDir || !fs.existsSync(storageDir)) return;
      const files = fs.readdirSync(storageDir).filter(f => f.endsWith('.json') && !f.endsWith('.tmp') && !f.startsWith('_'));
      for (const f of files) {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(storageDir, f), 'utf8'));
          if (!data || typeof data !== 'object') continue;
          for (const [k, v] of Object.entries(data)) {
            if (typeof v !== 'string') continue;
            if (k === 'aetheria.device' || k.endsWith('__aetheria_device')) {
              const s = v.trim().toLowerCase();
              if (UUID_V4_RE.test(s)) usedDeviceIds.add(s);
            } else if (k === 'aetheria.machine' || k.endsWith('__aetheria_machine')) {
              const s = v.trim().toLowerCase();
              if (SHA256_HEX_RE.test(s)) usedMachineIds.add(s);
            }
          }
        } catch (_) {}
      }
    } catch (_) {}
  }

  function mintUniqueDeviceId(opts = {}) {
    seedHistoricalDeviceIdsOnce();
    const avoidModels = opts && opts.avoidModels instanceof Set && opts.avoidModels.size > 0 ? opts.avoidModels : null;
    const plat = opts && opts.platform ? normalizeDevicePlatform(opts.platform, 'pc') : 'pc';
    let fallbackCand = '';
    const maxTries = avoidModels ? 28 : 1;
    for (let attempt = 0; attempt < maxTries; attempt++) {
      let cand = '';
      do {
        cand = crypto.randomUUID();
      } while (usedDeviceIds.has(cand.toLowerCase()));
      if (!fallbackCand) fallbackCand = cand;
      if (!avoidModels) {
        usedDeviceIds.add(cand.toLowerCase());
        return cand;
      }
      const spec = resolveDeviceSpec(cand, plat);
      if (!avoidModels.has(spec.model)) {
        usedDeviceIds.add(cand.toLowerCase());
        return cand;
      }
    }
    usedDeviceIds.add(fallbackCand.toLowerCase());
    return fallbackCand;
  }

  function mintUniqueMachineId(seed) {
    let cand = deriveMachineId(seed || crypto.randomUUID());
    while (usedMachineIds.has(cand)) {
      cand = deriveMachineId(crypto.randomUUID() + ':' + Date.now());
    }
    usedMachineIds.add(cand);
    return cand;
  }

  function getOrMintMachineIdForDevice(deviceId, preferredMach) {
    const devLower = String(deviceId || '').trim().toLowerCase();
    if (devLower && deviceMachineMap.has(devLower)) {
      return deviceMachineMap.get(devLower);
    }
    const pref = typeof preferredMach === 'string' ? preferredMach.trim().toLowerCase() : '';
    let mach = '';
    if (SHA256_HEX_RE.test(pref) && !usedMachineIds.has(pref)) {
      mach = pref;
      usedMachineIds.add(mach);
    } else {
      mach = mintUniqueMachineId('device-group:' + (devLower || crypto.randomUUID()));
    }
    if (devLower) {
      deviceMachineMap.set(devLower, mach);
    }
    return mach;
  }

  let orderedProfileIdsCache = null;
  let orderedProfileIdsCacheSet = null;
  let orderedProfileIdsCacheAt = 0;
  let orderedProfileIdsLiveSig = '';
  function getOrderedProfileIds(extraProfileId) {
    const now = Date.now();
    let liveList = [];
    let hasLiveLoader = false;
    let liveSig = '';
    try {
      if (typeof loadProfiles === 'function') {
        hasLiveLoader = true;
        liveList = loadProfiles() || [];
        liveSig = liveList.map(p => (p && p.id) || '').join('|');
      }
    } catch (_) {}
    if (!orderedProfileIdsCache || liveSig !== orderedProfileIdsLiveSig || (now - orderedProfileIdsCacheAt >= 15000)) {
      const seen = new Set();
      const ordered = [];
      const addId = (pid) => {
        const id = typeof pid === 'string' ? pid.trim() : '';
        if (!id || id.startsWith('_') || id.includes('__') || seen.has(id)) return;
        seen.add(id);
        ordered.push(id);
      };
      for (const p of liveList) {
        if (p && p.id) addId(p.id);
      }
      // Only fall back to scanning _browser_storage/*.json when loadProfiles() is unavailable/empty;
      // NEVER resurrect deleted/ghost storage files (e.g. old af_* or *_nc.json) into live Device Groups!
      if (!hasLiveLoader || ordered.length === 0) {
        try {
          if (storageDir && fs.existsSync(storageDir)) {
            const files = fs.readdirSync(storageDir)
              .filter(f => f.endsWith('.json') && !f.endsWith('.tmp') && !f.startsWith('_') && !f.includes('__'))
              .map(f => f.slice(0, -5))
              .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
            for (const pid of files) addId(pid);
          }
        } catch (_) {}
        for (const pid of profileDeviceIds.keys()) addId(pid);
      }
      orderedProfileIdsCache = ordered;
      orderedProfileIdsCacheSet = seen;
      orderedProfileIdsCacheAt = now;
      orderedProfileIdsLiveSig = liveSig;
    }
    if (!extraProfileId) {
      return orderedProfileIdsCache;
    }
    const extra = typeof extraProfileId === 'string' ? extraProfileId.trim() : '';
    if (!extra || extra.startsWith('_') || (orderedProfileIdsCacheSet && orderedProfileIdsCacheSet.has(extra))) {
      return orderedProfileIdsCache;
    }
    return [...orderedProfileIdsCache, extra];
  }

  function getScreensPerIp() {
    try {
      const s = screenProxy && typeof screenProxy.loadSettings === 'function' ? screenProxy.loadSettings() : null;
      const n = Number(s && s.maxScreensPerIp);
      if (Number.isFinite(n) && n >= 1) {
        return Math.max(1, Math.min(20, Math.floor(n)));
      }
    } catch (_) {}
    return MAX_SCREENS_PER_DEVICE;
  }

  function getActiveAutoProxyLease(pid) {
    if (!pid || !screenProxy || typeof screenProxy.getProfileLeaseSnapshot !== 'function') return null;
    try {
      const snap = screenProxy.getProfileLeaseSnapshot(pid);
      if (snap && snap.active && !snap.useHomeIp && (snap.proxyId || snap.ip)) {
        const ipKey = String(snap.proxyId || snap.ip).trim();
        if (!ipKey) return null;
        return {
          ipKey,
          proxyId: snap.proxyId || null,
          proxyIp: snap.ip || null,
          proxyPort: snap.proxyPort || null
        };
      }
    } catch (_) {}
    return null;
  }

  function buildDeviceGroupLayout(orderedIds, screensPerIp, isolatedDevices = null) {
    const list = Array.isArray(orderedIds) ? orderedIds : [];
    const perIp = Math.max(1, Math.min(20, Number(screensPerIp) || getScreensPerIp() || MAX_SCREENS_PER_DEVICE));
    const isoMap = (isolatedDevices && typeof isolatedDevices === 'object') ? isolatedDevices : {};
    if (list.length === 0) return [];

    // Group strictly by IP first so a Device Group NEVER spans across two different Proxy IPs.
    // Inside each IP Group, subdivide into Devices of at most MAX_SCREENS_PER_DEVICE (2) clients
    // (e.g. 1 IP : 3 screens => 2 Devices: Device 1 = 2 clients, Device 2 = 1 client).
    const proxyEnabled = Boolean(screenProxy && typeof screenProxy.isEnabled === 'function' && screenProxy.isEnabled());
    const proxyMode = (() => {
      try { return String(screenProxy?.loadSettings?.()?.mode || 'owner-queue'); } catch (_) { return 'owner-queue'; }
    })();

    const activeLeasesByPid = new Map();
    if (proxyEnabled) {
      for (const pid of list) {
        const l = getActiveAutoProxyLease(pid);
        if (l) activeLeasesByPid.set(pid, l);
      }
    }

    const ipBuckets = [];
    if (activeLeasesByPid.size === 0) {
      const totalIpBlocks = Math.ceil(list.length / perIp);
      for (let ipIdx = 0; ipIdx < totalIpBlocks; ipIdx++) {
        const ipSlice = list.slice(ipIdx * perIp, (ipIdx + 1) * perIp);
        if (ipSlice.length > 0) {
          ipBuckets.push({
            ipKey: `block:${ipIdx + 1}`,
            proxyId: null,
            proxyIp: null,
            proxyPort: null,
            profileIds: ipSlice
          });
        }
      }
    } else {
      const bucketByKey = new Map();
      const orderIndexByPid = new Map();
      const unleasedPids = [];

      list.forEach((pid, idx) => {
        orderIndexByPid.set(pid, idx);
        const l = activeLeasesByPid.get(pid);
        if (l) {
          let bucket = bucketByKey.get(l.ipKey);
          if (!bucket) {
            bucket = {
              ipKey: l.ipKey,
              proxyId: l.proxyId,
              proxyIp: l.proxyIp,
              proxyPort: l.proxyPort,
              blockHints: new Set(),
              profileIds: []
            };
            bucketByKey.set(l.ipKey, bucket);
            ipBuckets.push(bucket);
          }
          bucket.blockHints.add(Math.floor(idx / perIp));
          bucket.profileIds.push(pid);
        } else {
          unleasedPids.push(pid);
        }
      });

      const leftoverUnleased = [];
      for (const pid of unleasedPids) {
        const naturalBlock = Math.floor((orderIndexByPid.get(pid) || 0) / perIp);
        let targetBucket = ipBuckets.find(b => b.profileIds.length < perIp && b.blockHints && b.blockHints.has(naturalBlock));
        if (!targetBucket && proxyMode !== 'local-pool') {
          targetBucket = ipBuckets.find(b => b.profileIds.length < perIp);
        }
        if (targetBucket) {
          targetBucket.profileIds.push(pid);
        } else {
          leftoverUnleased.push(pid);
        }
      }

      if (leftoverUnleased.length > 0) {
        const extraBlocks = Math.ceil(leftoverUnleased.length / perIp);
        for (let i = 0; i < extraBlocks; i++) {
          const slice = leftoverUnleased.slice(i * perIp, (i + 1) * perIp);
          if (slice.length > 0) {
            ipBuckets.push({
              ipKey: `pending:${i + 1}`,
              proxyId: null,
              proxyIp: null,
              proxyPort: null,
              profileIds: slice
            });
          }
        }
      }
    }

    const layout = [];
    let globalGroupIdx = 0;

    for (let ipIdx = 0; ipIdx < ipBuckets.length; ipIdx++) {
      const bucket = ipBuckets[ipIdx];
      const ipSlice = bucket.profileIds;
      if (ipSlice.length === 0) continue;
      const normalPids = ipSlice.filter(pid => !isoMap[pid]);
      const isolatedPids = ipSlice.filter(pid => Boolean(isoMap[pid]));
      const subBuckets = [];
      for (let i = 0; i < normalPids.length; i += MAX_SCREENS_PER_DEVICE) {
        const chunk = normalPids.slice(i, i + MAX_SCREENS_PER_DEVICE);
        if (chunk.length > 0) {
          subBuckets.push({
            profileIds: chunk,
            maxScreens: Math.min(MAX_SCREENS_PER_DEVICE, Math.max(1, perIp)),
            isIsolated: false
          });
        }
      }
      for (const isoPid of isolatedPids) {
        subBuckets.push({
          profileIds: [isoPid],
          maxScreens: 1,
          isIsolated: true
        });
      }
      const devicesPerIp = Math.max(1, subBuckets.length);
      const deviceSubSizes = subBuckets.map(sb => sb.maxScreens);
      let runningSlot = 1;
      for (let sub = 0; sub < subBuckets.length; sub++) {
        const sb = subBuckets[sub];
        globalGroupIdx++;
        layout.push({
          groupIndex: globalGroupIdx,
          ipIndex: ipIdx + 1,
          deviceIndexInIp: sub + 1,
          devicesPerIp,
          screensPerIp: perIp,
          deviceSubSizes,
          maxScreens: sb.maxScreens,
          maxScreensPerDevice: sb.isIsolated ? 1 : MAX_SCREENS_PER_DEVICE,
          isIsolated: sb.isIsolated,
          ipSlotStart: runningSlot,
          ipProfileIds: ipSlice,
          profileIds: sb.profileIds,
          leaseProxyId: bucket.proxyId || null,
          leaseProxyIp: bucket.proxyIp || null,
          leaseProxyPort: bucket.proxyPort || null
        });
        runningSlot += sb.profileIds.length;
      }
    }
    return layout;
  }

  let customIpConfigCache = null;

  function resolveAutoGroupPlatform(cfg, groupIndex, deviceIndexInIp = 1, devicesPerIp = 2) {
    const map = (cfg && cfg.autoGroupPlatforms && typeof cfg.autoGroupPlatforms === 'object') ? cfg.autoGroupPlatforms : {};
    const override = map[String(groupIndex)];
    if (override === 'android' || override === 'pc') return override;
    const mode = normalizeDefaultPlatformMode(cfg?.defaultPlatformMode);
    if (mode === 'android') return 'android';
    if (mode === 'mixed') {
      const idx = (Number(devicesPerIp) || 1) > 1 ? (Number(deviceIndexInIp) || 1) : (Number(groupIndex) || 1);
      return idx % 2 === 0 ? 'android' : 'pc';
    }
    return 'pc';
  }

  function loadCustomIpDeviceConfig(forceReload = false) {
    if (!forceReload && customIpConfigCache) return customIpConfigCache;
    let raw = null;
    if (customIpFile && fs.existsSync(customIpFile)) {
      try {
        raw = JSON.parse(fs.readFileSync(customIpFile, 'utf8'));
      } catch (_) {}
    }
    const defaultPlatformMode = normalizeDefaultPlatformMode(raw?.defaultPlatformMode);
    const jailAutoCloseMode = normalizeJailAutoCloseMode(raw?.jailAutoCloseMode);
    const autoGroupPlatforms = {};
    if (raw && raw.autoGroupPlatforms && typeof raw.autoGroupPlatforms === 'object') {
      for (const [k, v] of Object.entries(raw.autoGroupPlatforms)) {
        if (/^\d+$/.test(String(k)) && (v === 'pc' || v === 'android')) {
          autoGroupPlatforms[String(k)] = v;
        }
      }
    }
    const rawGroups = Array.isArray(raw?.ipGroups) ? raw.ipGroups : [];
    const seenIpIds = new Set();
    const seenDgIds = new Set();
    const seenAssignedPids = new Set();
    let changed = !raw || !Array.isArray(raw.ipGroups);
    const ipGroups = [];

    for (let i = 0; i < rawGroups.length; i++) {
      const g = rawGroups[i];
      if (!g || typeof g !== 'object') {
        changed = true;
        continue;
      }
      let igId = typeof g.id === 'string' && /^[A-Za-z0-9_-]{3,64}$/.test(g.id.trim()) ? g.id.trim() : '';
      if (!igId || seenIpIds.has(igId)) {
        igId = `cig_${crypto.randomBytes(4).toString('hex')}`;
        changed = true;
      }
      seenIpIds.add(igId);
      const igName = typeof g.name === 'string' && g.name.trim()
        ? g.name.trim().slice(0, 64)
        : `วง IP พิเศษ #${ipGroups.length + 1}`;
      const createdAt = Number.isFinite(Number(g.createdAt)) && Number(g.createdAt) > 0 ? Number(g.createdAt) : Date.now();
      const rawDgs = Array.isArray(g.deviceGroups) ? g.deviceGroups : [];
      const deviceGroups = [];
      for (let j = 0; j < rawDgs.length; j++) {
        const d = rawDgs[j];
        if (!d || typeof d !== 'object') {
          changed = true;
          continue;
        }
        let dgId = typeof d.id === 'string' && /^[A-Za-z0-9_-]{3,64}$/.test(d.id.trim()) ? d.id.trim() : '';
        if (!dgId || seenDgIds.has(dgId)) {
          dgId = `cdg_${crypto.randomBytes(4).toString('hex')}`;
          changed = true;
        }
        seenDgIds.add(dgId);
        const dgName = typeof d.name === 'string' && d.name.trim()
          ? d.name.trim().slice(0, 64)
          : `Device #${deviceGroups.length + 1}`;
        const dgPlatform = normalizeDevicePlatform(d.platform, defaultPlatformMode === 'android' ? 'android' : 'pc');
        let devId = typeof d.deviceId === 'string' ? d.deviceId.trim() : '';
        if (!UUID_V4_RE.test(devId)) {
          devId = mintUniqueDeviceId();
          changed = true;
        } else {
          usedDeviceIds.add(devId.toLowerCase());
        }
        const rawMach = typeof d.machineId === 'string' ? d.machineId.trim().toLowerCase() : '';
        const machId = getOrMintMachineIdForDevice(devId, rawMach);
        if (rawMach !== machId) changed = true;

        const pids = [];
        for (const rawPid of (Array.isArray(d.profileIds) ? d.profileIds : [])) {
          const pid = typeof rawPid === 'string' ? rawPid.trim() : '';
          if (!pid || seenAssignedPids.has(pid)) {
            changed = true;
            continue;
          }
          seenAssignedPids.add(pid);
          pids.push(pid);
        }
        deviceGroups.push({
          id: dgId,
          name: dgName,
          platform: dgPlatform,
          deviceId: devId,
          machineId: machId,
          profileIds: pids
        });
      }
      const useHomeIp = Boolean(g.useHomeIp === true || g.ipMode === 'home');
      ipGroups.push({
        id: igId,
        name: igName,
        useHomeIp,
        createdAt,
        deviceGroups
      });
    }

    const isolatedDevices = {};
    const seenIsoDevs = new Set();
    if (raw && raw.isolatedDevices && typeof raw.isolatedDevices === 'object' && !Array.isArray(raw.isolatedDevices)) {
      for (const [rawPid, entry] of Object.entries(raw.isolatedDevices)) {
        const pid = String(rawPid || '').trim();
        if (!pid || !entry || typeof entry !== 'object' || seenAssignedPids.has(pid)) {
          changed = true;
          continue;
        }
        let devId = typeof entry.deviceId === 'string' ? entry.deviceId.trim() : '';
        if (!UUID_V4_RE.test(devId) || seenIsoDevs.has(devId.toLowerCase())) {
          devId = mintUniqueDeviceId();
          changed = true;
        } else {
          usedDeviceIds.add(devId.toLowerCase());
        }
        seenIsoDevs.add(devId.toLowerCase());
        const rawMach = typeof entry.machineId === 'string' ? entry.machineId.trim().toLowerCase() : '';
        const machId = getOrMintMachineIdForDevice(devId, rawMach);
        const plat = normalizeDevicePlatform(entry.platform, defaultPlatformMode === 'android' ? 'android' : 'pc');
        isolatedDevices[pid] = {
          deviceId: devId,
          machineId: machId,
          platform: plat,
          rotatedAt: Number(entry.rotatedAt) || Date.now()
        };
      }
    }

    const normalized = { version: 1, defaultPlatformMode, jailAutoCloseMode, autoGroupPlatforms, isolatedDevices, ipGroups };
    customIpConfigCache = normalized;
    if (changed && customIpFile && fs.existsSync(customIpFile)) {
      saveCustomIpDeviceConfig(normalized);
    }
    return normalized;
  }

  function saveCustomIpDeviceConfig(cfg) {
    const clean = {
      version: 1,
      defaultPlatformMode: normalizeDefaultPlatformMode(cfg?.defaultPlatformMode),
      jailAutoCloseMode: normalizeJailAutoCloseMode(cfg?.jailAutoCloseMode),
      autoGroupPlatforms: (cfg?.autoGroupPlatforms && typeof cfg.autoGroupPlatforms === 'object' && !Array.isArray(cfg.autoGroupPlatforms))
        ? { ...cfg.autoGroupPlatforms }
        : {},
      isolatedDevices: (cfg?.isolatedDevices && typeof cfg.isolatedDevices === 'object' && !Array.isArray(cfg.isolatedDevices))
        ? { ...cfg.isolatedDevices }
        : {},
      ipGroups: Array.isArray(cfg?.ipGroups) ? cfg.ipGroups : []
    };
    customIpConfigCache = clean;
    if (!customIpFile) return;
    try {
      fs.mkdirSync(path.dirname(customIpFile), { recursive: true });
      const tmp = customIpFile + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(clean, null, 2), 'utf8');
      try {
        fs.renameSync(tmp, customIpFile);
      } catch (_) {
        try { fs.unlinkSync(tmp); } catch (__) {}
        fs.writeFileSync(customIpFile, JSON.stringify(clean, null, 2), 'utf8');
      }
    } catch (_) {}
  }

  function buildCustomProfileMap(cfg) {
    const map = new Map();
    for (const ig of (cfg?.ipGroups || [])) {
      const igAllPids = [];
      for (const dg of (ig.deviceGroups || [])) {
        for (const pid of (dg.profileIds || [])) igAllPids.push(pid);
      }
      const totalInIpGroup = igAllPids.length;
      for (const dg of (ig.deviceGroups || [])) {
        for (const pid of (dg.profileIds || [])) {
          map.set(pid, { ig, dg, totalInIpGroup });
        }
      }
    }
    return map;
  }

  function getCustomIpDeviceConfig() {
    const cfg = loadCustomIpDeviceConfig();
    return {
      version: 1,
      defaultPlatformMode: cfg.defaultPlatformMode || 'pc',
      jailAutoCloseMode: normalizeJailAutoCloseMode(cfg.jailAutoCloseMode),
      autoGroupPlatforms: { ...(cfg.autoGroupPlatforms || {}) },
      ipGroups: cfg.ipGroups.map(ig => {
        const igPids = [];
        for (const dg of ig.deviceGroups) {
          for (const pid of dg.profileIds) igPids.push(pid);
        }
        return {
          id: ig.id,
          name: ig.name,
          useHomeIp: Boolean(ig.useHomeIp),
          ipMode: ig.useHomeIp ? 'home' : 'proxy',
          createdAt: ig.createdAt,
          memberCount: igPids.length,
          shareCount: Math.max(1, igPids.length),
          profileIds: igPids,
          deviceGroups: ig.deviceGroups.map(dg => {
            const spec = resolveDeviceSpec(dg.deviceId, dg.platform || 'pc');
            return {
              id: dg.id,
              name: dg.name,
              platform: spec.platform,
              deviceModel: spec.model,
              deviceGpu: spec.gpu,
              deviceTouch: spec.touch,
              deviceId: dg.deviceId,
              machineId: dg.machineId,
              profileIds: [...dg.profileIds]
            };
          })
        };
      })
    };
  }

  function getProfileIpIsolationMeta(profileId, defaultScreensPerIp = getScreensPerIp()) {
    const cfg = loadCustomIpDeviceConfig();
    const customMap = buildCustomProfileMap(cfg);
    const entry = customMap.get(profileId);
    if (entry) {
      const spec = resolveDeviceSpec(entry.dg.deviceId, entry.dg.platform || 'pc');
      const useHomeIp = Boolean(entry.ig.useHomeIp);
      return {
        isCustom: true,
        useHomeIp,
        ipMode: useHomeIp ? 'home' : 'proxy',
        ipGroupId: entry.ig.id,
        ipGroupName: entry.ig.name,
        ipGroupKey: useHomeIp ? `home:${entry.ig.id}` : `custom:${entry.ig.id}`,
        deviceGroupId: entry.dg.id,
        deviceGroupName: entry.dg.name,
        platform: spec.platform,
        deviceModel: spec.model,
        deviceGpu: spec.gpu,
        deviceTouch: spec.touch,
        deviceId: entry.dg.deviceId,
        machineId: entry.dg.machineId,
        memberCount: entry.totalInIpGroup,
        shareCount: Math.max(1, entry.totalInIpGroup)
      };
    }
    return {
      isCustom: false,
      ipGroupKey: 'auto',
      shareCount: Math.max(1, Math.floor(Number(defaultScreensPerIp) || 6))
    };
  }

  async function syncProfileDeviceIdentity(pid, deviceId, machineId, pushToLiveWindow = true, opts = {}) {
    const devKey = `pelican_${pid}__aetheria_device`;
    const ncDevKey = `pelican_${pid}__nc__nightcamp.online.device`;
    const machKey = `pelican_${pid}__aetheria_machine`;
    const ncDevVal = JSON.stringify(String(deviceId).replace(/-/g, ''));
    profileDeviceIds.set(pid, deviceId);
    profileMachineIds.set(pid, machineId);
    profileDeviceSpecs.delete(pid);
    saveProfileStorage(pid, { [devKey]: deviceId, [ncDevKey]: ncDevVal, [machKey]: machineId });
    if (pushToLiveWindow) {
      const c = clients.get(pid);
      if (c && c.sessionId) {
        await ensureSessionHooks(c.sessionId, pid, c).catch(() => {});
        const spec = ensureProfileDeviceSpec(pid);
        const reloadIfStuck = Boolean(opts && opts.reloadIfStuck);
        await evaluate(c, `(() => {
          try {
            window.__pmDeviceId = ${JSON.stringify(deviceId)};
            window.__pmMachineId = ${JSON.stringify(machineId)};
            window.__pmDeviceSpec = ${JSON.stringify(spec || null)};
            const __rawSet = (window.__pmRawStorage && window.__pmRawStorage.set) || Storage.prototype.setItem;
            if (window.localStorage) {
              __rawSet.call(window.localStorage, ${JSON.stringify(devKey)}, ${JSON.stringify(deviceId)});
              __rawSet.call(window.localStorage, ${JSON.stringify(ncDevKey)}, ${JSON.stringify(ncDevVal)});
              __rawSet.call(window.localStorage, ${JSON.stringify(machKey)}, ${JSON.stringify(machineId)});
            }
            if (${reloadIfStuck} && window.NC && window.NC.OnlineLobby && window.NC.OnlineLobby.entered !== true) {
              const msgEl = document.querySelector('body > .cs-root .cs-msg');
              if (msgEl) msgEl.textContent = '';
              if (typeof window.NC.OnlineLobby.restart === 'function') {
                setTimeout(() => { try { window.NC.OnlineLobby.restart(); } catch (_) {} }, 250);
              } else {
                setTimeout(() => { try { location.reload(); } catch (_) {} }, 250);
              }
            }
          } catch (_) {}
          return { ok: true, deviceId: window.__pmDeviceId };
        })()`, 4500).catch(() => {});
      }
    }
  }

  function createCustomDeviceGroupEntry(name, platform = 'pc') {
    const devId = mintUniqueDeviceId();
    const machId = mintUniqueMachineId(`custom-dg:${devId.toLowerCase()}:${Date.now()}`);
    deviceMachineMap.set(devId.toLowerCase(), machId);
    return {
      id: `cdg_${crypto.randomBytes(4).toString('hex')}`,
      name,
      platform: normalizeDevicePlatform(platform, 'pc'),
      deviceId: devId,
      machineId: machId,
      profileIds: []
    };
  }

  async function mutateCustomIpDevices(payload = {}) {
    initDeviceIdsFromStorage();
    const cfg = loadCustomIpDeviceConfig();
    const action = String(payload?.action || '').trim();
    const affected = new Set();

    if (action === 'set_default_platform_mode') {
      const nextMode = normalizeDefaultPlatformMode(payload.mode || payload.defaultPlatformMode);
      cfg.defaultPlatformMode = nextMode;
      if (payload.clearOverrides !== false) {
        cfg.autoGroupPlatforms = {};
      }
      saveCustomIpDeviceConfig(cfg);
      rebalanceDeviceGroups(null, true);
      const customMap = buildCustomProfileMap(cfg);
      const autoIds = getOrderedProfileIds().filter(pid => !customMap.has(pid));
      for (const pid of autoIds) {
        const c = clients.get(pid);
        if (c && c.sessionId) {
          await ensureSessionHooks(c.sessionId, pid, c).catch(() => {});
          await evaluate(c, profileInitScript(pid), 4500).catch(() => {});
        }
      }
      return {
        success: true,
        action,
        defaultPlatformMode: cfg.defaultPlatformMode,
        affectedProfileIds: [],
        customIpConfig: getCustomIpDeviceConfig()
      };
    }

    if (action === 'set_jail_auto_close_mode') {
      const nextMode = normalizeJailAutoCloseMode(payload.mode || payload.jailAutoCloseMode);
      cfg.jailAutoCloseMode = nextMode;
      saveCustomIpDeviceConfig(cfg);
      return {
        success: true,
        action,
        jailAutoCloseMode: cfg.jailAutoCloseMode,
        affectedProfileIds: [],
        customIpConfig: getCustomIpDeviceConfig()
      };
    }

    if (action === 'set_auto_group_platform') {
      const gIdx = Math.max(1, Math.floor(Number(payload.groupIndex) || 1));
      const rawPlat = String(payload.platform || '').trim().toLowerCase();
      if (!cfg.autoGroupPlatforms || typeof cfg.autoGroupPlatforms !== 'object') {
        cfg.autoGroupPlatforms = {};
      }
      if (rawPlat === 'auto' || rawPlat === 'default' || !rawPlat) {
        delete cfg.autoGroupPlatforms[String(gIdx)];
      } else {
        cfg.autoGroupPlatforms[String(gIdx)] = normalizeDevicePlatform(rawPlat, 'pc');
      }
      saveCustomIpDeviceConfig(cfg);
      rebalanceDeviceGroups(null, true);
      const customMap = buildCustomProfileMap(cfg);
      const autoIds = getOrderedProfileIds().filter(pid => !customMap.has(pid));
      const layout = buildDeviceGroupLayout(autoIds, getScreensPerIp());
      const targetGrp = layout.find(g => g.groupIndex === gIdx);
      for (const pid of (targetGrp?.profileIds || [])) {
        const c = clients.get(pid);
        if (c && c.sessionId) {
          await ensureSessionHooks(c.sessionId, pid, c).catch(() => {});
          await evaluate(c, profileInitScript(pid), 4500).catch(() => {});
        }
      }
      return {
        success: true,
        action,
        groupIndex: gIdx,
        platform: cfg.autoGroupPlatforms[String(gIdx)] || null,
        affectedProfileIds: [],
        customIpConfig: getCustomIpDeviceConfig()
      };
    }

    if (action === 'set_custom_device_platform') {
      const targetIg = cfg.ipGroups.find(x => x.id === payload.ipGroupId);
      const targetDg = (targetIg?.deviceGroups || []).find(x => x.id === payload.deviceGroupId);
      if (!targetIg || !targetDg) throw new Error('CUSTOM_DEVICE_GROUP_NOT_FOUND');
      targetDg.platform = normalizeDevicePlatform(payload.platform, 'pc');
      saveCustomIpDeviceConfig(cfg);
      rebalanceDeviceGroups(null, true);
      for (const pid of (targetDg.profileIds || [])) {
        const c = clients.get(pid);
        if (c && c.sessionId) {
          await ensureSessionHooks(c.sessionId, pid, c).catch(() => {});
          await evaluate(c, profileInitScript(pid), 4500).catch(() => {});
        }
      }
      return {
        success: true,
        action,
        ipGroupId: targetIg.id,
        deviceGroupId: targetDg.id,
        platform: targetDg.platform,
        affectedProfileIds: [],
        customIpConfig: getCustomIpDeviceConfig()
      };
    }

    if (action === 'add_ip_group') {
      const igId = `cig_${crypto.randomBytes(4).toString('hex')}`;
      const useHomeIp = Boolean(payload.useHomeIp === true || payload.ipMode === 'home');
      const defaultTitle = useHomeIp
        ? `วง IP บ้าน #${cfg.ipGroups.length + 1}`
        : `วง IP พิเศษ #${cfg.ipGroups.length + 1}`;
      const name = String(payload.name || '').trim().slice(0, 64) || defaultTitle;
      const dgCount = Math.max(1, Math.min(10, Math.floor(Number(payload.deviceGroupCount) || 1)));
      const defPlat = payload.platform ? normalizeDevicePlatform(payload.platform, 'pc') : (cfg.defaultPlatformMode === 'android' ? 'android' : 'pc');
      const deviceGroups = [];
      for (let i = 0; i < dgCount; i++) {
        const plat = (cfg.defaultPlatformMode === 'mixed' && !payload.platform)
          ? (i % 2 === 1 ? 'android' : 'pc')
          : defPlat;
        deviceGroups.push(createCustomDeviceGroupEntry(`Device #${i + 1}`, plat));
      }
      const ipGroup = { id: igId, name, useHomeIp, createdAt: Date.now(), deviceGroups };
      cfg.ipGroups.push(ipGroup);
      saveCustomIpDeviceConfig(cfg);
      return { success: true, action, ipGroupId: igId, useHomeIp, affectedProfileIds: [], customIpConfig: getCustomIpDeviceConfig() };
    }

    if (action === 'set_ip_group_mode') {
      const ig = cfg.ipGroups.find(x => x.id === payload.ipGroupId);
      if (!ig) throw new Error('CUSTOM_IP_GROUP_NOT_FOUND');
      const nextUseHomeIp = Boolean(payload.useHomeIp === true || payload.ipMode === 'home');
      ig.useHomeIp = nextUseHomeIp;
      if (nextUseHomeIp && /^วง IP พิเศษ #\d+$/.test(String(ig.name || '').trim())) {
        ig.name = String(ig.name).replace(/^วง IP พิเศษ/, 'วง IP บ้าน');
      } else if (!nextUseHomeIp && /^วง IP บ้าน #\d+$/.test(String(ig.name || '').trim())) {
        ig.name = String(ig.name).replace(/^วง IP บ้าน/, 'วง IP พิเศษ');
      }
      for (const dg of (ig.deviceGroups || [])) {
        for (const pid of (dg.profileIds || [])) affected.add(pid);
      }
      saveCustomIpDeviceConfig(cfg);
      return {
        success: true,
        action,
        ipGroupId: ig.id,
        useHomeIp: ig.useHomeIp,
        ipMode: ig.useHomeIp ? 'home' : 'proxy',
        affectedProfileIds: [...affected],
        customIpConfig: getCustomIpDeviceConfig()
      };
    }

    if (action === 'rename_ip_group') {
      const ig = cfg.ipGroups.find(x => x.id === payload.ipGroupId);
      if (!ig) throw new Error('CUSTOM_IP_GROUP_NOT_FOUND');
      const nextName = String(payload.name || '').trim().slice(0, 64);
      if (nextName) ig.name = nextName;
      saveCustomIpDeviceConfig(cfg);
      return { success: true, action, ipGroupId: ig.id, affectedProfileIds: [], customIpConfig: getCustomIpDeviceConfig() };
    }

    if (action === 'delete_ip_group') {
      const idx = cfg.ipGroups.findIndex(x => x.id === payload.ipGroupId);
      if (idx === -1) throw new Error('CUSTOM_IP_GROUP_NOT_FOUND');
      const [removed] = cfg.ipGroups.splice(idx, 1);
      for (const dg of (removed.deviceGroups || [])) {
        for (const pid of (dg.profileIds || [])) affected.add(pid);
      }
      saveCustomIpDeviceConfig(cfg);
      rebalanceDeviceGroups(null, true);
      for (const pid of affected) {
        const c = clients.get(pid);
        if (c && c.sessionId) {
          await ensureSessionHooks(c.sessionId, pid, c).catch(() => {});
          await evaluate(c, profileInitScript(pid), 4500).catch(() => {});
        }
      }
      return { success: true, action, ipGroupId: removed.id, affectedProfileIds: [...affected], customIpConfig: getCustomIpDeviceConfig() };
    }

    if (action === 'add_device_group') {
      const ig = cfg.ipGroups.find(x => x.id === payload.ipGroupId);
      if (!ig) throw new Error('CUSTOM_IP_GROUP_NOT_FOUND');
      const dgName = String(payload.name || '').trim().slice(0, 64) || `Device #${ig.deviceGroups.length + 1}`;
      const defPlat = payload.platform
        ? normalizeDevicePlatform(payload.platform, 'pc')
        : (cfg.defaultPlatformMode === 'android'
            ? 'android'
            : (cfg.defaultPlatformMode === 'mixed' && ig.deviceGroups.length % 2 === 1 ? 'android' : 'pc'));
      const dg = createCustomDeviceGroupEntry(dgName, defPlat);
      ig.deviceGroups.push(dg);
      saveCustomIpDeviceConfig(cfg);
      return { success: true, action, ipGroupId: ig.id, deviceGroupId: dg.id, affectedProfileIds: [], customIpConfig: getCustomIpDeviceConfig() };
    }

    if (action === 'rename_device_group') {
      const ig = cfg.ipGroups.find(x => x.id === payload.ipGroupId);
      const dg = (ig?.deviceGroups || []).find(x => x.id === payload.deviceGroupId);
      if (!dg) throw new Error('CUSTOM_DEVICE_GROUP_NOT_FOUND');
      const nextName = String(payload.name || '').trim().slice(0, 64);
      if (nextName) dg.name = nextName;
      saveCustomIpDeviceConfig(cfg);
      return { success: true, action, ipGroupId: ig.id, deviceGroupId: dg.id, affectedProfileIds: [], customIpConfig: getCustomIpDeviceConfig() };
    }

    if (action === 'delete_device_group') {
      const ig = cfg.ipGroups.find(x => x.id === payload.ipGroupId);
      if (!ig) throw new Error('CUSTOM_IP_GROUP_NOT_FOUND');
      const idx = ig.deviceGroups.findIndex(x => x.id === payload.deviceGroupId);
      if (idx === -1) throw new Error('CUSTOM_DEVICE_GROUP_NOT_FOUND');
      const [removed] = ig.deviceGroups.splice(idx, 1);
      for (const pid of (removed.profileIds || [])) affected.add(pid);
      saveCustomIpDeviceConfig(cfg);
      rebalanceDeviceGroups(null, true);
      for (const pid of affected) {
        const c = clients.get(pid);
        if (c && c.sessionId) {
          await ensureSessionHooks(c.sessionId, pid, c).catch(() => {});
          await evaluate(c, profileInitScript(pid), 4500).catch(() => {});
        }
      }
      return { success: true, action, ipGroupId: ig.id, deviceGroupId: removed.id, affectedProfileIds: [...affected], customIpConfig: getCustomIpDeviceConfig() };
    }

    if (action === 'rotate_custom_device') {
      let targetIg = null;
      let targetDg = null;
      for (const ig of cfg.ipGroups) {
        if (payload.ipGroupId && ig.id !== payload.ipGroupId) continue;
        const found = ig.deviceGroups.find(d => d.id === payload.deviceGroupId || (payload.deviceId && d.deviceId.toLowerCase() === String(payload.deviceId).toLowerCase()));
        if (found) {
          targetIg = ig;
          targetDg = found;
          break;
        }
      }
      if (!targetDg) throw new Error('CUSTOM_DEVICE_GROUP_NOT_FOUND');
      const nextDev = mintUniqueDeviceId();
      const nextMach = mintUniqueMachineId(`custom-dg:${nextDev.toLowerCase()}:${Date.now()}`);
      deviceMachineMap.set(nextDev.toLowerCase(), nextMach);
      targetDg.deviceId = nextDev;
      targetDg.machineId = nextMach;
      saveCustomIpDeviceConfig(cfg);
      for (const pid of targetDg.profileIds) {
        affected.add(pid);
        await syncProfileDeviceIdentity(pid, nextDev, nextMach, true);
      }
      return {
        success: true,
        action,
        ipGroupId: targetIg.id,
        deviceGroupId: targetDg.id,
        deviceId: nextDev,
        machineId: nextMach,
        affectedProfileIds: [...affected],
        customIpConfig: getCustomIpDeviceConfig()
      };
    }

    if (action === 'assign_profiles') {
      const targetIg = cfg.ipGroups.find(x => x.id === payload.ipGroupId);
      const targetDg = (targetIg?.deviceGroups || []).find(x => x.id === payload.deviceGroupId);
      if (!targetIg || !targetDg) throw new Error('CUSTOM_DEVICE_GROUP_NOT_FOUND');
      const incoming = Array.isArray(payload.profileIds)
        ? payload.profileIds
        : (payload.profileId ? [payload.profileId] : []);
      const cleanIds = Array.from(new Set(incoming.map(x => String(x || '').trim()).filter(Boolean)));
      for (const pid of cleanIds) {
        for (const ig of cfg.ipGroups) {
          for (const dg of ig.deviceGroups) {
            const idx = dg.profileIds.indexOf(pid);
            if (idx !== -1) dg.profileIds.splice(idx, 1);
          }
        }
        if (cfg.isolatedDevices && cfg.isolatedDevices[pid]) delete cfg.isolatedDevices[pid];
        targetDg.profileIds.push(pid);
        affected.add(pid);
      }
      saveCustomIpDeviceConfig(cfg);
      for (const pid of cleanIds) {
        await syncProfileDeviceIdentity(pid, targetDg.deviceId, targetDg.machineId, true);
      }
      rebalanceDeviceGroups(null, true);
      return {
        success: true,
        action,
        ipGroupId: targetIg.id,
        deviceGroupId: targetDg.id,
        affectedProfileIds: [...affected],
        customIpConfig: getCustomIpDeviceConfig()
      };
    }

    if (action === 'remove_profile') {
      const incoming = Array.isArray(payload.profileIds)
        ? payload.profileIds
        : (payload.profileId ? [payload.profileId] : []);
      const removeSet = new Set(incoming.map(x => String(x || '').trim()).filter(Boolean));
      for (const ig of cfg.ipGroups) {
        for (const dg of ig.deviceGroups) {
          const before = dg.profileIds.length;
          dg.profileIds = dg.profileIds.filter(pid => {
            if (removeSet.has(pid)) {
              affected.add(pid);
              return false;
            }
            return true;
          });
          if (dg.profileIds.length !== before) {
            // updated in place
          }
        }
      }
      saveCustomIpDeviceConfig(cfg);
      rebalanceDeviceGroups(null, true);
      for (const pid of affected) {
        const c = clients.get(pid);
        if (c && c.sessionId) {
          await ensureSessionHooks(c.sessionId, pid, c).catch(() => {});
          await evaluate(c, profileInitScript(pid), 4500).catch(() => {});
        }
      }
      return { success: true, action, affectedProfileIds: [...affected], customIpConfig: getCustomIpDeviceConfig() };
    }

    throw new Error('INVALID_CUSTOM_IP_ACTION');
  }

  function pruneDeletedProfilesFromCustomGroups(validProfileIds) {
    const validSet = new Set(Array.isArray(validProfileIds) ? validProfileIds.map(String) : []);
    const cfg = loadCustomIpDeviceConfig();
    let changed = false;
    for (const ig of cfg.ipGroups) {
      for (const dg of ig.deviceGroups) {
        const filtered = dg.profileIds.filter(pid => validSet.has(String(pid)));
        if (filtered.length !== dg.profileIds.length) {
          dg.profileIds = filtered;
          changed = true;
        }
      }
    }
    if (cfg.isolatedDevices && typeof cfg.isolatedDevices === 'object') {
      for (const pid of Object.keys(cfg.isolatedDevices)) {
        if (!validSet.has(String(pid))) {
          delete cfg.isolatedDevices[pid];
          changed = true;
        }
      }
    }
    if (changed) {
      saveCustomIpDeviceConfig(cfg);
      rebalanceDeviceGroups(null, true);
    }
    return changed;
  }

  function extractNcDeviceUuid(rawVal) {
    if (typeof rawVal !== 'string' || !rawVal.trim()) return '';
    let s = rawVal.trim();
    try {
      const parsed = JSON.parse(s);
      if (typeof parsed === 'string') s = parsed.trim();
    } catch (_) {}
    s = s.replace(/^"+|"+$/g, '').toLowerCase();
    if (/^[0-9a-f]{32}$/.test(s)) {
      return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
    }
    return UUID_V4_RE.test(s) ? s : '';
  }

  function collectIpBlockModels(ipProfileIds, excludePid) {
    const models = new Set();
    for (const pid of (ipProfileIds || [])) {
      if (!pid || pid === excludePid) continue;
      const spec = profileDeviceSpecs.get(pid);
      if (spec && spec.model) models.add(spec.model);
    }
    return models;
  }

  function rebalanceDeviceGroups(extraProfileId, forceRecheck = false) {
    try {
      seedHistoricalDeviceIdsOnce();
      const orderedIds = getOrderedProfileIds(extraProfileId);
      const customCfg = loadCustomIpDeviceConfig();
      const customMap = buildCustomProfileMap(customCfg);
      const isoMap = (customCfg.isolatedDevices && typeof customCfg.isolatedDevices === 'object') ? customCfg.isolatedDevices : {};
      const autoOrderedIds = orderedIds.filter(pid => !customMap.has(pid));
      const perIp = getScreensPerIp();
      const proxyEnabled = Boolean(screenProxy && typeof screenProxy.isEnabled === 'function' && screenProxy.isEnabled());
      const leaseSig = proxyEnabled
        ? autoOrderedIds.map(pid => {
            const l = getActiveAutoProxyLease(pid);
            return l ? `${pid}@${l.ipKey}` : pid;
          }).join(',')
        : 'direct';
      const isoSig = Object.keys(isoMap).sort().map(pid => `${pid}=${isoMap[pid]?.deviceId || ''}:${isoMap[pid]?.platform || 'pc'}`).join(',');
      const customSig = `${customCfg.defaultPlatformMode || 'pc'}::${JSON.stringify(customCfg.autoGroupPlatforms || {})}::iso:${isoSig}::` + customCfg.ipGroups
        .map(ig => `${ig.id}:${ig.deviceGroups.map(d => `${d.id}=${d.deviceId}:${d.platform || 'pc'}:${d.profileIds.join(',')}`).join(';')}`)
        .join('|');
      const sig = `${perIp}::${orderedIds.join('|')}::${leaseSig}::${customSig}`;
      if (!forceRecheck && deviceIdsInitialized && sig === lastGroupedOrderSignature && (!extraProfileId || profileDeviceIds.has(extraProfileId))) {
        return;
      }
      deviceIdsInitialized = true;
      lastGroupedOrderSignature = sig;

      const rawByProfile = new Map();
      const ncDevOwners = new Map(); // devLower -> Set<pid> (tracks live/disk nc__nightcamp.online.device owners!)
      for (const pid of orderedIds) {
        const data = loadProfileStorage(pid);
        rawByProfile.set(pid, data);
        if (typeof data['aetheria.device'] === 'string' && data['aetheria.device'].trim()) {
          usedDeviceIds.add(data['aetheria.device'].trim().toLowerCase());
        }
        const ncUuid = extractNcDeviceUuid(data[`pelican_${pid}__nc__nightcamp.online.device`]);
        if (ncUuid) {
          usedDeviceIds.add(ncUuid);
          if (!ncDevOwners.has(ncUuid)) ncDevOwners.set(ncUuid, new Set());
          ncDevOwners.get(ncUuid).add(pid);
        }
      }

      const claimedDevices = new Set();

      // 1. Apply isolated Custom IP/Device identities first so auto-groups never collide with them
      for (const [pid, entry] of customMap.entries()) {
        const groupDev = entry.dg.deviceId;
        const groupMach = entry.dg.machineId;
        const spec = { ...resolveDeviceSpec(groupDev, entry.dg.platform || 'pc'), deviceId: groupDev };
        claimedDevices.add(groupDev.toLowerCase());
        const prevMemDev = profileDeviceIds.get(pid) || '';
        const prevMemMach = profileMachineIds.get(pid) || '';
        const devKey = `pelican_${pid}__aetheria_device`;
        const ncDevKey = `pelican_${pid}__nc__nightcamp.online.device`;
        const machKey = `pelican_${pid}__aetheria_machine`;
        const expectedNcDev = JSON.stringify(String(groupDev).replace(/-/g, ''));
        const diskData = rawByProfile.get(pid) || loadProfileStorage(pid);
        const diskDev = typeof diskData[devKey] === 'string' ? diskData[devKey].trim() : '';
        const diskNcDev = typeof diskData[ncDevKey] === 'string' ? diskData[ncDevKey].trim() : '';
        const diskMach = typeof diskData[machKey] === 'string' ? diskData[machKey].trim().toLowerCase() : '';
        const hasLegacyRaw = Object.prototype.hasOwnProperty.call(diskData, 'aetheria.device') || Object.prototype.hasOwnProperty.call(diskData, 'aetheria.machine');

        profileDeviceIds.set(pid, groupDev);
        profileMachineIds.set(pid, groupMach);
        profileDeviceGroupIndex.set(pid, -1);
        profileDeviceSpecs.set(pid, spec);

        if (diskDev !== groupDev || diskNcDev !== expectedNcDev || diskMach !== groupMach || hasLegacyRaw) {
          saveProfileStorage(pid, { [devKey]: groupDev, [ncDevKey]: expectedNcDev, [machKey]: groupMach });
        }

        if (prevMemDev && (prevMemDev !== groupDev || prevMemMach !== groupMach)) {
          const c = clients.get(pid);
          if (c && c.sessionId) {
            ensureSessionHooks(c.sessionId, pid, c).catch(() => {});
            evaluate(c, profileInitScript(pid), 4500).catch(() => {});
          }
        }
      }

      // 2. Reserve per-profile isolated devices BEFORE auto-groups so auto-groups can NEVER steal or collide with them!
      for (const pid of autoOrderedIds) {
        const iso = isoMap[pid];
        if (iso && UUID_V4_RE.test(iso.deviceId)) {
          claimedDevices.add(iso.deviceId.toLowerCase());
          usedDeviceIds.add(iso.deviceId.toLowerCase());
        }
      }

      const layout = buildDeviceGroupLayout(autoOrderedIds, perIp, isoMap);
      const modelsByIpIndex = new Map();

      for (const grp of layout) {
        const groupPids = grp.profileIds;
        const groupPidSet = new Set(groupPids);
        if (!modelsByIpIndex.has(grp.ipIndex)) modelsByIpIndex.set(grp.ipIndex, new Set());
        const ipUsedModels = modelsByIpIndex.get(grp.ipIndex);
        let groupDev = '';
        let candidateMach = '';
        let grpPlatform = resolveAutoGroupPlatform(customCfg, grp.groupIndex, grp.deviceIndexInIp, grp.devicesPerIp);

        if (grp.isIsolated && groupPids.length === 1 && isoMap[groupPids[0]]) {
          const iso = isoMap[groupPids[0]];
          groupDev = iso.deviceId;
          candidateMach = iso.machineId;
          grpPlatform = normalizeDevicePlatform(iso.platform, grpPlatform);
        } else {
          for (const pid of groupPids) {
            const memDev = profileDeviceIds.get(pid) || '';
            const diskData = rawByProfile.get(pid) || {};
            const diskDev = typeof diskData[`pelican_${pid}__aetheria_device`] === 'string'
              ? diskData[`pelican_${pid}__aetheria_device`].trim()
              : '';
            const cand = UUID_V4_RE.test(memDev) ? memDev : (UUID_V4_RE.test(diskDev) ? diskDev : '');
            const candLow = cand.toLowerCase();
            if (!cand || claimedDevices.has(candLow)) continue;
            // Collision guard: if >=2 OTHER active profiles outside this group are STILL holding this nc__nightcamp.online.device
            // (or this group has 2 screens and an outside running client ALSO holds it -> 3-way collision!), NEVER reuse it!
            const owners = ncDevOwners.get(candLow);
            let outsideOwners = 0;
            if (owners) {
              for (const opid of owners) {
                if (!groupPidSet.has(opid)) outsideOwners++;
              }
            }
            if (outsideOwners > 0 && (outsideOwners + groupPids.length) > MAX_SCREENS_PER_DEVICE) {
              continue;
            }
            groupDev = cand;
            break;
          }

          for (const pid of groupPids) {
            const memMach = profileMachineIds.get(pid) || '';
            const diskData = rawByProfile.get(pid) || {};
            const diskMach = typeof diskData[`pelican_${pid}__aetheria_machine`] === 'string'
              ? diskData[`pelican_${pid}__aetheria_machine`].trim().toLowerCase()
              : '';
            const candM = SHA256_HEX_RE.test(memMach) ? memMach : (SHA256_HEX_RE.test(diskMach) ? diskMach : '');
            if (candM) {
              candidateMach = candM;
              break;
            }
          }

          if (!groupDev) {
            groupDev = mintUniqueDeviceId({ avoidModels: ipUsedModels, platform: grpPlatform });
          } else {
            usedDeviceIds.add(groupDev.toLowerCase());
          }
        }
        claimedDevices.add(groupDev.toLowerCase());

        const groupMach = getOrMintMachineIdForDevice(groupDev, candidateMach);
        const spec = { ...resolveDeviceSpec(groupDev, grpPlatform), deviceId: groupDev };
        ipUsedModels.add(spec.model);

        for (const pid of groupPids) {
          const prevMemDev = profileDeviceIds.get(pid) || '';
          const prevMemMach = profileMachineIds.get(pid) || '';
          const devKey = `pelican_${pid}__aetheria_device`;
          const ncDevKey = `pelican_${pid}__nc__nightcamp.online.device`;
          const machKey = `pelican_${pid}__aetheria_machine`;
          const expectedNcDev = JSON.stringify(String(groupDev).replace(/-/g, ''));
          const diskData = rawByProfile.get(pid) || {};
          const diskDev = typeof diskData[devKey] === 'string' ? diskData[devKey].trim() : '';
          const diskNcDev = typeof diskData[ncDevKey] === 'string' ? diskData[ncDevKey].trim() : '';
          const diskMach = typeof diskData[machKey] === 'string' ? diskData[machKey].trim().toLowerCase() : '';
          const hasLegacyRaw = Object.prototype.hasOwnProperty.call(diskData, 'aetheria.device') || Object.prototype.hasOwnProperty.call(diskData, 'aetheria.machine');

          profileDeviceIds.set(pid, groupDev);
          profileMachineIds.set(pid, groupMach);
          profileDeviceGroupIndex.set(pid, grp.groupIndex);
          profileDeviceSpecs.set(pid, spec);

          if (diskDev !== groupDev || diskNcDev !== expectedNcDev || diskMach !== groupMach || hasLegacyRaw) {
            saveProfileStorage(pid, { [devKey]: groupDev, [ncDevKey]: expectedNcDev, [machKey]: groupMach });
          }

          if (prevMemDev && (prevMemDev !== groupDev || prevMemMach !== groupMach)) {
            const c = clients.get(pid);
            if (c && c.sessionId) {
              ensureSessionHooks(c.sessionId, pid, c).catch(() => {});
              evaluate(c, profileInitScript(pid), 4500).catch(() => {});
            }
          }
        }
      }
    } catch (_) {}
  }

  function initDeviceIdsFromStorage() {
    if (deviceIdsInitialized) return;
    rebalanceDeviceGroups(null, true);
  }

  function ensureProfileDeviceId(profileId) {
    initDeviceIdsFromStorage();
    if (!profileId) return mintUniqueDeviceId();
    if (profileDeviceIds.has(profileId)) {
      rebalanceDeviceGroups(null, false);
      if (profileDeviceIds.has(profileId)) return profileDeviceIds.get(profileId);
    }
    rebalanceDeviceGroups(profileId, false);
    if (profileDeviceIds.has(profileId)) return profileDeviceIds.get(profileId);
    rebalanceDeviceGroups(profileId, true);
    return profileDeviceIds.get(profileId) || mintUniqueDeviceId();
  }

  function ensureProfileMachineId(profileId) {
    const devId = ensureProfileDeviceId(profileId);
    if (!profileId) return mintUniqueMachineId();
    if (profileMachineIds.has(profileId)) return profileMachineIds.get(profileId);
    const assignedMach = getOrMintMachineIdForDevice(devId);
    profileMachineIds.set(profileId, assignedMach);
    saveProfileStorage(profileId, { [`pelican_${profileId}__aetheria_machine`]: assignedMach });
    return assignedMach;
  }

  function ensureProfileDeviceGroupIndex(profileId) {
    ensureProfileDeviceId(profileId);
    const idx = profileDeviceGroupIndex.get(profileId);
    return typeof idx === 'number' ? idx : 1;
  }

  function ensureProfileDeviceSpec(profileId) {
    const devId = ensureProfileDeviceId(profileId);
    if (profileId && profileDeviceSpecs.has(profileId)) {
      const cached = profileDeviceSpecs.get(profileId);
      if (cached && cached.deviceId === devId) return cached;
    }
    const cfg = loadCustomIpDeviceConfig();
    if (profileId) {
      const customMap = buildCustomProfileMap(cfg);
      const customEntry = customMap.get(profileId);
      if (customEntry && customEntry.dg) {
        const spec = { ...resolveDeviceSpec(devId, customEntry.dg.platform || 'pc'), deviceId: devId };
        profileDeviceSpecs.set(profileId, spec);
        return spec;
      }
      if (cfg.isolatedDevices && cfg.isolatedDevices[profileId]) {
        const spec = { ...resolveDeviceSpec(devId, cfg.isolatedDevices[profileId].platform || 'pc'), deviceId: devId };
        profileDeviceSpecs.set(profileId, spec);
        return spec;
      }
    }
    const gIdx = profileId ? (profileDeviceGroupIndex.get(profileId) || 1) : 1;
    const perIp = getScreensPerIp();
    const devicesPerIp = Math.ceil(perIp / MAX_SCREENS_PER_DEVICE);
    const devIdxInIp = ((Math.max(1, gIdx) - 1) % Math.max(1, devicesPerIp)) + 1;
    const plat = resolveAutoGroupPlatform(cfg, gIdx, devIdxInIp, devicesPerIp);
    const spec = { ...resolveDeviceSpec(devId, plat), deviceId: devId };
    if (profileId) profileDeviceSpecs.set(profileId, spec);
    return spec;
  }

  function getDeviceGroupsSnapshot() {
    initDeviceIdsFromStorage();
    rebalanceDeviceGroups(null, false);
    const customCfg = loadCustomIpDeviceConfig();
    const customMap = buildCustomProfileMap(customCfg);
    const isoMap = (customCfg.isolatedDevices && typeof customCfg.isolatedDevices === 'object') ? customCfg.isolatedDevices : {};
    const orderedIds = getOrderedProfileIds().filter(pid => !customMap.has(pid));
    const perIp = getScreensPerIp();
    const layout = buildDeviceGroupLayout(orderedIds, perIp, isoMap);
    let poolItems = [];
    try {
      if (screenProxy && typeof screenProxy.loadPool === 'function') {
        const reservedIds = new Set();
        const reservedIpPorts = new Set();
        try {
          if (typeof screenProxy.getCustomGroupLeases === 'function') {
            for (const cl of (screenProxy.getCustomGroupLeases() || [])) {
              if (!cl || !cl.assigned) continue;
              if (cl.proxyId) reservedIds.add(String(cl.proxyId));
              const host = String(cl.proxyHost || cl.ip || '').trim();
              const port = Number(cl.proxyPort) || 0;
              if (host) reservedIpPorts.add(`${host}:${port}`);
            }
          }
        } catch (_) {}
        const p = screenProxy.loadPool();
        if (p && Array.isArray(p.proxies)) {
          poolItems = p.proxies.filter(x => {
            if (!x || x.enabled === false || x.blocked) return false;
            if (x.proxyId && reservedIds.has(String(x.proxyId))) return false;
            const host = String(x.host || x.labelIp || '').trim();
            const port = Number(x.port) || 0;
            if (host && reservedIpPorts.has(`${host}:${port}`)) return false;
            return true;
          });
        }
      }
    } catch (_) {}

    return layout.map(grp => {
      const firstPid = grp.profileIds[0];
      const deviceId = firstPid ? ensureProfileDeviceId(firstPid) : '';
      const machineId = firstPid ? ensureProfileMachineId(firstPid) : '';
      const isoEntry = (grp.isIsolated && firstPid && isoMap[firstPid]) ? isoMap[firstPid] : null;
      const platform = isoEntry
        ? normalizeDevicePlatform(isoEntry.platform, 'pc')
        : resolveAutoGroupPlatform(customCfg, grp.groupIndex, grp.deviceIndexInIp, grp.devicesPerIp);
      const spec = resolveDeviceSpec(deviceId, platform);
      let activeSnap = grp.leaseProxyIp
        ? { proxyId: grp.leaseProxyId, ip: grp.leaseProxyIp, proxyPort: grp.leaseProxyPort }
        : null;
      if (!activeSnap && screenProxy && typeof screenProxy.getProfileLeaseSnapshot === 'function') {
        for (const pid of (grp.ipProfileIds || grp.profileIds || [])) {
          const snap = screenProxy.getProfileLeaseSnapshot(pid);
          if (snap && snap.active && snap.ip) {
            activeSnap = snap;
            break;
          }
        }
      }
      const poolItem = !activeSnap ? (poolItems[grp.ipIndex - 1] || null) : null;
      return {
        groupIndex: grp.groupIndex,
        ipIndex: grp.ipIndex,
        deviceIndexInIp: grp.deviceIndexInIp,
        devicesPerIp: grp.devicesPerIp,
        screensPerIp: grp.screensPerIp,
        deviceSubSizes: grp.deviceSubSizes,
        isIsolated: Boolean(grp.isIsolated),
        ipSlotStart: grp.ipSlotStart,
        ipProfileIds: grp.ipProfileIds,
        proxyId: (activeSnap && activeSnap.proxyId) || (poolItem ? (poolItem.proxyId || null) : null),
        proxyIp: (activeSnap && activeSnap.ip) || (poolItem ? (poolItem.labelIp || poolItem.host || null) : null),
        proxyPort: (activeSnap && activeSnap.proxyPort) || (poolItem ? (poolItem.port || null) : null),
        platform: spec.platform,
        platformOverride: (customCfg.autoGroupPlatforms && customCfg.autoGroupPlatforms[String(grp.groupIndex)]) || null,
        defaultPlatformMode: customCfg.defaultPlatformMode || 'pc',
        deviceModel: spec.model,
        deviceGpu: spec.gpu,
        deviceTouch: spec.touch,
        deviceId,
        machineId,
        maxScreens: grp.maxScreens,
        maxScreensPerDevice: grp.maxScreensPerDevice,
        profileIds: grp.profileIds
      };
    });
  }

  async function rotateSingleProfileDeviceId(profileId, opts = {}) {
    initDeviceIdsFromStorage();
    const pid = String(profileId || '').trim();
    if (!pid) return null;
    rebalanceDeviceGroups(pid, false);
    const cfg = loadCustomIpDeviceConfig();

    // Case 1: Profile belongs to a Custom IP Group -> rotate ONLY this profile (splitting it if shared!)
    for (const ig of cfg.ipGroups) {
      const customDg = (ig.deviceGroups || []).find(d => Array.isArray(d.profileIds) && d.profileIds.includes(pid));
      if (customDg) {
        const plat = normalizeDevicePlatform(customDg.platform, 'pc');
        const avoidModels = new Set();
        for (const otherDg of (ig.deviceGroups || [])) {
          if (otherDg && otherDg.deviceId) {
            avoidModels.add(resolveDeviceSpec(otherDg.deviceId, otherDg.platform || 'pc').model);
          }
        }
        const nextDev = mintUniqueDeviceId({ avoidModels, platform: plat });
        const nextMach = mintUniqueMachineId(`single-custom:${pid}:${nextDev.toLowerCase()}:${Date.now()}`);
        deviceMachineMap.set(nextDev.toLowerCase(), nextMach);
        let targetDg = customDg;
        if (customDg.profileIds.length > 1) {
          customDg.profileIds = customDg.profileIds.filter(x => x !== pid);
          const newDg = {
            id: `cdg_${crypto.randomBytes(4).toString('hex')}`,
            name: `Device #${ig.deviceGroups.length + 1} (แยกเดี่ยว)`,
            platform: plat,
            deviceId: nextDev,
            machineId: nextMach,
            profileIds: [pid]
          };
          ig.deviceGroups.push(newDg);
          targetDg = newDg;
        } else {
          customDg.deviceId = nextDev;
          customDg.machineId = nextMach;
        }
        saveCustomIpDeviceConfig(cfg);
        await syncProfileDeviceIdentity(pid, nextDev, nextMach, true, { reloadIfStuck: Boolean(opts.reloadIfStuck) });
        rebalanceDeviceGroups(null, true);
        const spec = resolveDeviceSpec(nextDev, plat);
        return {
          groupIndex: -1,
          isCustom: true,
          isIsolated: true,
          ipGroupId: ig.id,
          deviceGroupId: targetDg.id,
          platform: spec.platform,
          deviceModel: spec.model,
          deviceGpu: spec.gpu,
          deviceTouch: spec.touch,
          deviceId: nextDev,
          machineId: nextMach,
          profileIds: [pid]
        };
      }
    }

    // Case 2: Profile is in Auto Groups -> isolate ONLY this profile onto its own guaranteed-unique Device ID
    // without touching or overwriting its group partner or ANY other screen!
    const customMap = buildCustomProfileMap(cfg);
    const orderedIds = getOrderedProfileIds(pid).filter(id => !customMap.has(id));
    const perIp = getScreensPerIp();
    const layoutBefore = buildDeviceGroupLayout(orderedIds, perIp, cfg.isolatedDevices || {});
    const oldGrp = layoutBefore.find(g => g.profileIds.includes(pid)) || null;
    const plat = (cfg.isolatedDevices && cfg.isolatedDevices[pid]?.platform)
      || (oldGrp ? resolveAutoGroupPlatform(cfg, oldGrp.groupIndex, oldGrp.deviceIndexInIp, oldGrp.devicesPerIp) : (cfg.defaultPlatformMode === 'android' ? 'android' : 'pc'));
    const avoidModels = collectIpBlockModels(oldGrp ? oldGrp.ipProfileIds : orderedIds, pid);
    const assigned = mintUniqueDeviceId({ avoidModels, platform: plat });
    const assignedMach = mintUniqueMachineId(`single-profile:${pid}:${assigned.toLowerCase()}:${Date.now()}`);
    deviceMachineMap.set(assigned.toLowerCase(), assignedMach);
    const spec = resolveDeviceSpec(assigned, plat);

    if (!cfg.isolatedDevices || typeof cfg.isolatedDevices !== 'object') cfg.isolatedDevices = {};
    cfg.isolatedDevices[pid] = {
      deviceId: assigned,
      machineId: assignedMach,
      platform: spec.platform,
      rotatedAt: Date.now()
    };
    saveCustomIpDeviceConfig(cfg);
    await syncProfileDeviceIdentity(pid, assigned, assignedMach, true, { reloadIfStuck: Boolean(opts.reloadIfStuck) });
    rebalanceDeviceGroups(null, true);

    const freshLayout = buildDeviceGroupLayout(orderedIds, perIp, cfg.isolatedDevices);
    const newGrp = freshLayout.find(g => g.profileIds.includes(pid)) || oldGrp;
    return {
      groupIndex: newGrp ? newGrp.groupIndex : 1,
      ipIndex: newGrp ? newGrp.ipIndex : 1,
      deviceIndexInIp: newGrp ? newGrp.deviceIndexInIp : 1,
      devicesPerIp: newGrp ? newGrp.devicesPerIp : 1,
      screensPerIp: perIp,
      deviceSubSizes: newGrp ? newGrp.deviceSubSizes : [1],
      isIsolated: true,
      ipSlotStart: newGrp ? newGrp.ipSlotStart : 1,
      ipProfileIds: newGrp ? newGrp.ipProfileIds : [pid],
      platform: spec.platform,
      deviceModel: spec.model,
      deviceGpu: spec.gpu,
      deviceTouch: spec.touch,
      deviceId: assigned,
      machineId: assignedMach,
      maxScreens: 1,
      maxScreensPerDevice: 1,
      profileIds: [pid]
    };
  }

  async function rotateDeviceGroup(target) {
    initDeviceIdsFromStorage();
    rebalanceDeviceGroups(null, false);
    const cfg = loadCustomIpDeviceConfig();
    if (typeof target === 'string' && target.trim()) {
      const t = target.trim();
      for (const ig of cfg.ipGroups) {
        const customDg = ig.deviceGroups.find(
          d => d.id === t || d.deviceId.toLowerCase() === t.toLowerCase() || d.profileIds.includes(t)
        );
        if (customDg) {
          const rotRes = await mutateCustomIpDevices({ action: 'rotate_custom_device', ipGroupId: ig.id, deviceGroupId: customDg.id });
          const spec = resolveDeviceSpec(rotRes.deviceId, customDg.platform || 'pc');
          return {
            groupIndex: -1,
            isCustom: true,
            ipGroupId: ig.id,
            deviceGroupId: customDg.id,
            platform: spec.platform,
            deviceModel: spec.model,
            deviceGpu: spec.gpu,
            deviceTouch: spec.touch,
            deviceId: rotRes.deviceId,
            machineId: rotRes.machineId,
            profileIds: [...customDg.profileIds]
          };
        }
      }
    }

    const customMap = buildCustomProfileMap(cfg);
    const isoMap = (cfg.isolatedDevices && typeof cfg.isolatedDevices === 'object') ? cfg.isolatedDevices : {};
    const orderedIds = getOrderedProfileIds().filter(pid => !customMap.has(pid));
    if (orderedIds.length === 0) return null;
    const perIp = getScreensPerIp();
    const layout = buildDeviceGroupLayout(orderedIds, perIp, isoMap);
    if (layout.length === 0) return null;

    let targetGrp = null;
    if (typeof target === 'number' && Number.isFinite(target) && target >= 1) {
      targetGrp = layout[Math.floor(target) - 1] || null;
    } else if (typeof target === 'string' && target.trim()) {
      const t = target.trim();
      if (/^\d+$/.test(t)) {
        targetGrp = layout[Math.max(0, parseInt(t, 10) - 1)] || null;
      } else {
        targetGrp = layout.find(g => g.profileIds.includes(t)) || null;
        if (!targetGrp) {
          targetGrp = layout.find(g => g.profileIds.some(pid => (profileDeviceIds.get(pid) || '').toLowerCase() === t.toLowerCase())) || null;
        }
      }
    }

    if (!targetGrp) return null;

    const groupPids = targetGrp.profileIds;
    const isoEntry = (targetGrp.isIsolated && groupPids.length === 1 && isoMap[groupPids[0]]) ? isoMap[groupPids[0]] : null;
    const grpPlat = isoEntry
      ? normalizeDevicePlatform(isoEntry.platform, 'pc')
      : resolveAutoGroupPlatform(cfg, targetGrp.groupIndex, targetGrp.deviceIndexInIp, targetGrp.devicesPerIp);
    const avoidModels = collectIpBlockModels(targetGrp.ipProfileIds, groupPids[0]);
    const assigned = mintUniqueDeviceId({ avoidModels, platform: grpPlat });
    const assignedMach = mintUniqueMachineId('device-group:' + assigned.toLowerCase() + ':' + Date.now());
    deviceMachineMap.set(assigned.toLowerCase(), assignedMach);
    const spec = resolveDeviceSpec(assigned, grpPlat);

    if (isoEntry) {
      cfg.isolatedDevices[groupPids[0]] = {
        deviceId: assigned,
        machineId: assignedMach,
        platform: spec.platform,
        rotatedAt: Date.now()
      };
      saveCustomIpDeviceConfig(cfg);
    }

    for (const pid of groupPids) {
      await syncProfileDeviceIdentity(pid, assigned, assignedMach, true);
      profileDeviceGroupIndex.set(pid, targetGrp.groupIndex);
      profileDeviceSpecs.set(pid, { ...spec, deviceId: assigned });
    }

    return {
      groupIndex: targetGrp.groupIndex,
      ipIndex: targetGrp.ipIndex,
      deviceIndexInIp: targetGrp.deviceIndexInIp,
      devicesPerIp: targetGrp.devicesPerIp,
      screensPerIp: targetGrp.screensPerIp,
      deviceSubSizes: targetGrp.deviceSubSizes,
      isIsolated: Boolean(targetGrp.isIsolated),
      ipSlotStart: targetGrp.ipSlotStart,
      ipProfileIds: targetGrp.ipProfileIds,
      platform: spec.platform,
      deviceModel: spec.model,
      deviceGpu: spec.gpu,
      deviceTouch: spec.touch,
      deviceId: assigned,
      machineId: assignedMach,
      maxScreens: targetGrp.maxScreens,
      maxScreensPerDevice: targetGrp.maxScreensPerDevice,
      profileIds: groupPids
    };
  }

  async function rotateProfileDeviceId(profileId, opts = {}) {
    const res = await rotateSingleProfileDeviceId(profileId, opts);
    return res ? res.deviceId : null;
  }

  async function rotateAllDeviceIds() {
    initDeviceIdsFromStorage();
    rebalanceDeviceGroups(null, false);
    const cfg = loadCustomIpDeviceConfig();
    const customMap = buildCustomProfileMap(cfg);
    const orderedIds = getOrderedProfileIds().filter(pid => !customMap.has(pid));
    const layout = buildDeviceGroupLayout(orderedIds, getScreensPerIp(), cfg.isolatedDevices || {});
    const rotatedByProfile = {};
    const groups = [];
    for (let g = 1; g <= layout.length; g++) {
      const grp = await rotateDeviceGroup(g);
      if (grp) {
        groups.push(grp);
        for (const pid of grp.profileIds) {
          rotatedByProfile[pid] = grp.deviceId;
        }
      }
    }
    return { deviceIds: rotatedByProfile, groups };
  }

  function loadKnownTargets() {
    if (!knownTargetsFile) return;
    try {
      if (!fs.existsSync(knownTargetsFile)) return;
      const raw = JSON.parse(fs.readFileSync(knownTargetsFile, 'utf8'));
      if (raw && typeof raw === 'object') {
        for (const [k, v] of Object.entries(raw)) if (typeof k === 'string' && typeof v === 'string') knownTargets.set(k, v);
      }
    } catch (_) {}
  }
  function saveKnownTargets() {
    if (!knownTargetsFile) return;
    try {
      if (!fs.existsSync(sessionsDir)) return;
      fs.writeFileSync(knownTargetsFile, JSON.stringify(Object.fromEntries(knownTargets), null, 2), 'utf8');
    } catch (_) {}
  }
  function loadKnownProxyContexts() {
    if (!knownProxyContextsFile) return;
    try {
      if (!fs.existsSync(knownProxyContextsFile)) return;
      const raw = JSON.parse(fs.readFileSync(knownProxyContextsFile, 'utf8'));
      if (raw && typeof raw === 'object') {
        for (const [k, v] of Object.entries(raw)) if (typeof k === 'string' && typeof v === 'string') knownProxyContexts.set(k, v);
      }
    } catch (_) {}
  }
  function saveKnownProxyContexts() {
    if (!knownProxyContextsFile) return;
    try {
      if (!fs.existsSync(sessionsDir)) return;
      fs.writeFileSync(knownProxyContextsFile, JSON.stringify(Object.fromEntries(knownProxyContexts), null, 2), 'utf8');
    } catch (_) {}
  }
  function isKnownProxyTargetContext(t, customContexts) {
    if (!t || !t.browserContextId) return false;
    if (customContexts && customContexts.has(t.browserContextId)) return true;
    if (knownProxyContexts.get(t.targetId) === t.browserContextId) return true;
    if (!customContexts) return true;
    return false;
  }
  loadKnownTargets();
  loadKnownProxyContexts();
  const retryDelays = [1000, 3000, 10000];
  function scheduleReconnect() {
    if(!started || reconnectTimer) return;
    reconnectTimer=setTimeout(async()=>{reconnectTimer=null;try{await rediscover();reconnectDelay=1000;}catch(_){reconnectDelay=Math.min(30000,reconnectDelay*2);scheduleReconnect();}},reconnectDelay);
    reconnectTimer.unref?.();
  }
  function diagnostic(c, state, extra={}) { diagnostics.set(c.profileId,{gameAlive:state!=='closed',botReady:state==='ready',state,...extra}); }

  // A window that is gone (closed with Chrome's X, crashed, browser closed, CDP reconnected) must not stay
  // "open": that made launch answer "already open" and left a proxy with a dead session on the port.
  function drop(c) {
    if (!c) return;
    stopProxy(c);
    if (clients.get(c.profileId) === c) clients.delete(c.profileId);
    c.generation++;clearTimeout(c.retryTimer);c.retryTimer=null;
  }
  const isGoneError = e => /Session with given id not found|No target with given id|Target closed|CDP closed|CDP not connected/i.test(String(e && e.message || e));

  // ---------- CDP connection ----------
  function openCdpSocket(debuggerUrl, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(debuggerUrl); ws = socket;
      const openingTimeout = setTimeout(() => { reject(new Error('CDP connect timeout')); try { socket.close(); } catch (_) {} }, timeoutMs);
      openingTimeout.unref?.();
      socket.onopen = () => { clearTimeout(openingTimeout); resolve(); };
      socket.onerror = () => { clearTimeout(openingTimeout); reject(new Error('CDP connect failed')); };
      socket.onclose = () => {
        clearTimeout(openingTimeout); reject(new Error('CDP closed'));
        if (ws !== socket) return; ws = null;
        for (const [, p] of pending) { clearTimeout(p.timer); p.reject(new Error('CDP closed')); } pending.clear();
        for (const c of Array.from(clients.values())) { diagnostic(c, 'transport-disconnected', { gameAlive: null }); drop(c); } scheduleReconnect();
      };
      socket.onmessage = ev => {
        if (ws !== socket) return;
        let msg; try { msg = JSON.parse(ev.data); } catch (_) { return; }
        if (msg.id && pending.has(msg.id)) {
          const p = pending.get(msg.id); pending.delete(msg.id); clearTimeout(p.timer);
          if (msg.error) p.reject(new Error(msg.error.message)); else p.resolve(msg.result);
        } else if (msg.method) {
          listeners.forEach(fn => { try { fn(msg); } catch (e) {} });
        }
      };
    });
  }
  async function connect() {
    if (ws && ws.readyState === 1) return;
    if (wsReady) return wsReady;
    wsReady = (async () => {
      let connectedViaCache = false;
      if (wsUrlFile) {
        try {
          if (fs.existsSync(wsUrlFile)) {
            const cached = JSON.parse(fs.readFileSync(wsUrlFile, 'utf8'));
            if (cached && typeof cached.webSocketDebuggerUrl === 'string' && cached.webSocketDebuggerUrl.startsWith('ws://')) {
              await openCdpSocket(cached.webSocketDebuggerUrl, 12000);
              connectedViaCache = true;
            }
          }
        } catch (_) {
          if (ws) { try { ws.close(); } catch (__) {} ws = null; }
        }
      }
      if (!connectedViaCache) {
        const info = JSON.parse(await getText(`http://127.0.0.1:${CDP_PORT}/json/version`, isRealSession ? 20000 : 6000));
        if (wsUrlFile && info && typeof info.webSocketDebuggerUrl === 'string') {
          try { fs.writeFileSync(wsUrlFile, JSON.stringify({ webSocketDebuggerUrl: info.webSocketDebuggerUrl }), 'utf8'); } catch (_) {}
        }
        await openCdpSocket(info.webSocketDebuggerUrl, isRealSession ? 12000 : 8000);
      }
    })();
    try { await wsReady; } finally { wsReady = null; }
    await send('Target.setDiscoverTargets', { discover: true }).catch(() => {});
  }
  function send(method, params = {}, sessionId, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
      if (!ws || ws.readyState !== 1) return reject(new Error('CDP not connected'));
      const id = nextId++;
      const timer=setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error('CDP timeout: ' + method)); } }, timeoutMs);timer.unref?.();
      pending.set(id, { resolve, reject, timer });
      try{ws.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));}
      catch(e){clearTimeout(timer);pending.delete(id);reject(e);}
    });
  }

  async function browserAlive() {
    if (ws && ws.readyState === 1) return true;
    if (wsUrlFile && fs.existsSync(wsUrlFile)) {
      try { await connect(); return Boolean(ws && ws.readyState === 1); } catch (_) {}
    }
    try { await getText(`http://127.0.0.1:${CDP_PORT}/json/version`, isRealSession ? 15000 : 6000); return true; } catch (e) { return false; }
  }

  function killStuckBrowserProcesses() {
    if (!sessionsDir || sessionsDir === 'fake' || typeof execFile !== 'function') return Promise.resolve();
    return new Promise((resolve) => {
      const escapedDir = String(userDataDir || '').replace(/'/g, "''");
      const portFlag = `--remote-debugging-port=${CDP_PORT}`;
      const psCmd = `
        $dir = '${escapedDir}';
        $portFlag = '${portFlag}';
        Get-CimInstance Win32_Process -Filter "Name = 'chrome.exe' OR Name = 'msedge.exe'" -ErrorAction SilentlyContinue | Where-Object {
          $_.CommandLine -and ($_.CommandLine.IndexOf($dir, [System.StringComparison]::OrdinalIgnoreCase) -ge 0 -or $_.CommandLine.IndexOf($portFlag, [System.StringComparison]::OrdinalIgnoreCase) -ge 0)
        } | ForEach-Object {
          Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
        }
      `;
      execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psCmd], { timeout: 6000, windowsHide: true }, () => {
        for (const lockName of ['SingletonLock', 'SingletonSocket', 'SingletonCookie', 'lockfile']) {
          try {
            const lp = path.join(userDataDir, lockName);
            if (fs.existsSync(lp)) fs.unlinkSync(lp);
          } catch (_) {}
        }
        setTimeout(resolve, 400);
      });
    });
  }

  let ensureBrowserPromise = null;
  function ensureBrowser(forceClean = false) {
    if (!ensureBrowserPromise) {
      ensureBrowserPromise = ensureBrowserOnce(forceClean).finally(() => {
        ensureBrowserPromise = null;
      });
    }
    return ensureBrowserPromise;
  }

  async function detectRunningBrowserKind() {
    try {
      const info = JSON.parse(await getText(`http://127.0.0.1:${CDP_PORT}/json/version`, 3000));
      const str = `${info?.Browser || ''} ${info?.['User-Agent'] || ''}`;
      if (/\bEdg\b|\bEdg\//i.test(str)) return 'edge';
      if (/\bChrome\//i.test(str)) return 'chrome';
    } catch (_) {}
    return null;
  }

  async function ensureBrowserOnce(forceClean = false) {
    const settings = getSettings() || {};
    const desiredKind = settings.browserKind === 'edge' ? 'edge' : 'chrome';
    if (!forceClean && await browserAlive()) {
      try {
        await connect();
        const tRes = await send('Target.getTargets', {}, undefined, isRealSession ? 15000 : 4000);
        if (isRealSession && clients.size === 0) {
          const hasGamePage = (tRes?.targetInfos || []).some(t => t.type === 'page' && typeof t.url === 'string' && (t.url.includes('nightcamp.app') || t.url.includes('smailpro.com') || t.url.includes('sonjj.com')));
          if (!hasGamePage) {
            const runningKind = await detectRunningBrowserKind();
            if (runningKind && runningKind !== desiredKind && findBrowser(desiredKind)) {
              if (ws) { try { ws.close(); } catch (_) {} ws = null; }
              forceClean = true;
            }
          }
        }
        if (!forceClean) return;
      } catch (e) {
        if (clients.size > 0) throw e;
        if (ws) { try { ws.close(); } catch (_) {} ws = null; }
        // Before killing any running browser processes, verify whether CDP HTTP is actually dead
        // (a busy Edge/Chrome with 20-30 proxy windows can momentarily lag on Target.getTargets!)
        let stillAliveHttp = false;
        try {
          await getText(`http://127.0.0.1:${CDP_PORT}/json/version`, 5000);
          stillAliveHttp = true;
        } catch (_) {}
        if (stillAliveHttp) {
          await new Promise(r => setTimeout(r, 600));
          await connect();
          await send('Target.getTargets', {}, undefined, 15000);
          return;
        }
        forceClean = true;
      }
    }
    if (forceClean && clients.size === 0) {
      await killStuckBrowserProcesses();
    }
    const exe = findBrowser(desiredKind);
    if (!exe) throw new Error('ไม่พบ Google Chrome หรือ Microsoft Edge ในเครื่อง');
    fs.mkdirSync(userDataDir, { recursive: true });
    if (isRealSession) {
      for (const bloatDir of ['component_crx_cache', 'optimization_guide_model_store', 'CertificateRevocation', 'WasmTtsEngine', 'Safe Browsing', 'Crashpad', 'segmentation_platform', 'OnDeviceHeadSuggestModel', 'GrShaderCache', 'ShaderCache']) {
        try {
          const bp = path.join(userDataDir, bloatDir);
          if (fs.existsSync(bp)) fs.rmSync(bp, { recursive: true, force: true });
        } catch (_) {}
      }
    }
    const extraCacheArgs = [];
    if (isRealSession && process.env.PELICAN_TEST_INSTANCE !== '1') {
      try {
        const os = require('os');
        const cCacheDir = path.join(process.env.LOCALAPPDATA || os.tmpdir(), 'PmheeNightcamp', 'browser_cache');
        fs.mkdirSync(cCacheDir, { recursive: true });
        extraCacheArgs.push(`--disk-cache-dir=${cCacheDir}`, '--disk-cache-size=104857600');
      } catch (_) {}
    }
    const isCloakBrowser = /cloakbrowser/i.test(exe);
    const args = [
      `--remote-debugging-port=${CDP_PORT}`, '--remote-allow-origins=*',
      `--user-data-dir=${userDataDir}`,
      ...extraCacheArgs,
      ...(isCloakBrowser ? ['--fingerprint-platform=windows'] : []),
      '--disable-component-update',
      '--disable-domain-reliability',
      '--disable-breakpad',
      '--disable-blink-features=AutomationControlled',
      '--disable-background-mode',
      // the bot's timers must keep running in background / covered windows
      '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
      '--disable-features=CalculateNativeWinOcclusion,IntensiveWakeUpThrottling',
      // many game windows in one browser: Chrome drops the oldest WebGL context past 16 live ones
      '--max-active-webgl-contexts=64',
      '--no-first-run', '--no-default-browser-check', '--mute-audio', 'about:blank'
    ];
    browserProc = spawn(exe, args, { detached: true, stdio: 'ignore', windowsHide: false });
    browserProc.unref();
    let cleanedMidWait = forceClean;
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 300));
      if (await browserAlive()) {
        try {
          await connect();
          const tRes = await send('Target.getTargets', {}, undefined, 10000);
          startupPages = (tRes?.targetInfos || []).filter(t => t.type === 'page' && (!t.url || t.url === 'about:blank')).map(t => t.targetId);
          return;
        } catch (e) {
          if (ws) { try { ws.close(); } catch (_) {} ws = null; }
        }
      }
      if (i === 25 && !cleanedMidWait && clients.size === 0 && !(await browserAlive())) {
        cleanedMidWait = true;
        await killStuckBrowserProcesses();
        browserProc = spawn(exe, args, { detached: true, stdio: 'ignore' });
        browserProc.unref();
      }
    }
    throw new Error('เปิดเบราว์เซอร์ไม่สำเร็จ');
  }

  // ---------- bot injection ----------
  async function botSource(profileId) {
    const selected=profileScriptSource?.(profileId);
    if(typeof selected==='string')return selected;
    if(profileScriptSource) throw Error('MANAGED_SCRIPT_SOURCE_UNAVAILABLE');
    if (preferLocalBot) return fs.readFileSync(localBotPath, 'utf8');
    try {
      const code = await getText(BOT_URL + '?t=' + Date.now(), 8000);
      if (code.length > 1000) return code;
    } catch (e) {}
    return fs.readFileSync(localBotPath, 'utf8');
  }
  const MSGPACK = `(function(){ if (!window.msgpack && !window.__pmMsgpackLoading) { window.__pmMsgpackLoading=true; const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/msgpack-lite/0.1.26/msgpack.min.js'; s.onerror=()=>{window.__pmMsgpackLoading=false;}; document.head.appendChild(s); } })(); void 0;`;

  const crashedTargetReloadAt = new Map();
  const crashedTargetFailCount = new Map();
  const profileInitScript = profileId => {
    const deviceId = ensureProfileDeviceId(profileId);
    const machineId = ensureProfileMachineId(profileId);
    const deviceSpec = ensureProfileDeviceSpec(profileId);
    const rawSaved = loadProfileStorage(profileId);
    const saved = {};
    const pfx = profileId ? `pelican_${profileId}__` : 'pelican_';
    for (const [k, v] of Object.entries(rawSaved || {})) {
      if (typeof v !== 'string' || isTransientStorageKey(k)) continue;
      if (profileId && k === '__ss:aetheria.session' && isForeignOrMismatchedSessionJwt(profileId, v)) continue;
      if (profileId && isForeignOrStaleNightcampAcct(profileId, k, v)) continue;
      if (profileId && k.startsWith('pelican_')) {
        if (k.startsWith(pfx)) {
          if (k.endsWith('__auth_cfg') && isForeignAuthCfgString(profileId, v)) continue;
          saved[k] = v;
        } else if (!k.includes('__') && k !== 'pelican_auth_cfg' && k !== 'pelican_icon_manifest' && k !== 'pelican_item_catalog' && k !== 'pelican_script_plan' && k !== 'pelican_plan_script_enabled') {
          const mappedKey = pfx + k.slice(8);
          if (isTransientStorageKey(mappedKey)) continue;
          if (isForeignOrStaleNightcampAcct(profileId, mappedKey, v)) continue;
          if (rawSaved[mappedKey] === undefined && saved[mappedKey] === undefined) saved[mappedKey] = v;
        }
      } else {
        saved[k] = v;
      }
    }
    if (profileId && deviceId) {
      saved[`pelican_${profileId}__aetheria_device`] = deviceId;
    }
    if (profileId && machineId) {
      saved[`pelican_${profileId}__aetheria_machine`] = machineId;
    }
    if (profileId && typeof loadProfiles === 'function') {
      try {
        const list = loadProfiles() || [];
        const self = list.find(p => p && p.id === profileId);
        if (self) {
          const authKey = `pelican_${profileId}__auth_cfg`;
          let parsedAuth = {};
          try { parsedAuth = JSON.parse(saved[authKey] || '{}') || {}; } catch (_) { parsedAuth = {}; }
          const parsedToggledAt = Number(parsedAuth.userToggledAt) || 0;
          const mgrPushAt = Number(self.lastAuthSyncPushAt) || 0;
          const keepSavedToggle = parsedToggledAt > 0 && parsedToggledAt >= mgrPushAt && typeof parsedAuth.enabled === 'boolean';
          if (self.account && !self.autoRegister) {
            if (!keepSavedToggle) parsedAuth.enabled = self.autoLoginEnabled !== false;
            parsedAuth.userDisabledAutoLogin = parsedAuth.enabled === false;
            parsedAuth.username = String(self.account).trim();
            if (self.serverName) parsedAuth.serverName = String(self.serverName).trim();
            if (self.charName) parsedAuth.charName = String(self.charName).trim();
            if (!keepSavedToggle || typeof parsedAuth.autoResumeBot !== 'boolean') parsedAuth.autoResumeBot = Boolean(self.autoResumeBot);
            parsedAuth.register = false;
            parsedAuth.generatedUser = Boolean(self.generatedAccount);
            saved[authKey] = JSON.stringify(parsedAuth);
          } else if (self.serverName) {
            parsedAuth.serverName = String(self.serverName).trim();
            if (self.charName) parsedAuth.charName = String(self.charName).trim();
            if (!keepSavedToggle && self.autoLoginEnabled !== undefined) parsedAuth.enabled = self.autoLoginEnabled !== false;
            parsedAuth.userDisabledAutoLogin = parsedAuth.enabled === false;
            if (!keepSavedToggle || typeof parsedAuth.autoResumeBot !== 'boolean') parsedAuth.autoResumeBot = Boolean(self.autoResumeBot);
            saved[authKey] = JSON.stringify(parsedAuth);
          }
        }
      } catch (_) {}
    }
    if (!saved['nightcamp.lang']) {
      saved['nightcamp.lang'] = 'th';
    }
    const orderedSaved = {};
    const isPriorityStorageKey = k => k.endsWith('_cfg') || k.endsWith('_config') || k.endsWith('__script_plan') || k.endsWith('__plan_script_enabled') || k.endsWith('__auto_loop') || k.endsWith('__bot_running') || k.endsWith('__bot_run_mode') || k.endsWith('__bot_running_at') || k.endsWith('__farm_map') || k.endsWith('__target_map') || k.endsWith('__aetheria_device') || k.endsWith('__aetheria_machine') || k.indexOf('__nc__') !== -1 || k.startsWith('__ss:');
    for (const [k, v] of Object.entries(saved)) {
      if (isPriorityStorageKey(k)) orderedSaved[k] = v;
    }
    for (const [k, v] of Object.entries(saved)) {
      if (!Object.prototype.hasOwnProperty.call(orderedSaved, k)) orderedSaved[k] = v;
    }
    const hasSaved = Object.keys(orderedSaved).length > 0;
    const restoreJs = hasSaved
      ? `try { const __s = ${JSON.stringify(orderedSaved)}; const __rawGet = (window.__pmRawStorage && window.__pmRawStorage.get) || Storage.prototype.getItem; const __rawSet = (window.__pmRawStorage && window.__pmRawStorage.set) || Storage.prototype.setItem; const __rawDel = (window.__pmRawStorage && window.__pmRawStorage.del) || Storage.prototype.removeItem; if (window.localStorage && window.__pmProfileId && __rawGet.call(window.localStorage, 'pelican_auth_cfg') !== null) { const __rm = []; for (let i = 0; i < window.localStorage.length; i++) { const lk = window.localStorage.key(i); if (lk && lk.startsWith('pelican_') && lk.indexOf('__') === -1 && lk !== 'pelican_icon_manifest' && lk !== 'pelican_item_catalog') __rm.push(lk); } for (const lk of __rm) { try { __rawDel.call(window.localStorage, lk); } catch (_) {} } } const __impKey = window.__pmProfileId ? ('pelican_' + window.__pmProfileId + '__pm_import_stamp') : ''; const __forceImportRestore = Boolean(window.localStorage && __impKey && typeof __s[__impKey] === 'string' && __rawGet.call(window.localStorage, __impKey) !== __s[__impKey]); const __botAtKey = window.__pmProfileId ? ('pelican_' + window.__pmProfileId + '__bot_running_at') : ''; const __savedBotAt = Number(__botAtKey && __s[__botAtKey] || 0); const __curBotAt = Number(window.localStorage && __botAtKey && __rawGet.call(window.localStorage, __botAtKey) || 0); const __preferSavedBotState = __savedBotAt > 0 && __savedBotAt >= __curBotAt; for (const [k, v] of Object.entries(__s)) { if (typeof v !== 'string' || k === 'aetheria.device' || k === 'aetheria.machine') continue; if (k.startsWith('__ss:')) { const sk = k.slice(5); if (window.sessionStorage && __rawGet.call(window.sessionStorage, sk) === null) { try { __rawSet.call(window.sessionStorage, sk, v); } catch (_) {} } } else if (window.localStorage) { const curV = __rawGet.call(window.localStorage, k); const isClobberedSell = (k.endsWith('__sell_cfg') || k === 'pelican_sell_cfg') && curV !== null && curV.indexOf('"weaponRarity"') === -1 && v.indexOf('"weaponRarity"') !== -1; const isBotStateKey = k.endsWith('__bot_running') || k.endsWith('__bot_run_mode') || k.endsWith('__bot_running_at'); if (k.endsWith('__auth_cfg') && curV !== null && !__forceImportRestore) { try { const __co = JSON.parse(curV) || {}; const __so = JSON.parse(v) || {}; const __merged = Object.assign({}, __so, __co); if (__co.enabled === false || __co.userDisabledAutoLogin) { __merged.enabled = false; __merged.userDisabledAutoLogin = true; } __rawSet.call(window.localStorage, k, JSON.stringify(__merged)); } catch (_) {} } else if (__forceImportRestore || k.endsWith('__aetheria_device') || k.endsWith('__aetheria_machine') || curV === null || isClobberedSell || (isBotStateKey && __preferSavedBotState)) { try { __rawSet.call(window.localStorage, k, v); } catch (_) { if (typeof __freeStorageQuota === 'function') __freeStorageQuota(window.localStorage, __rawDel); try { __rawSet.call(window.localStorage, k, v); } catch (__) {} } } } } window.__pmStorageRestored = true; if (typeof window.reloadBotConfigsFromLocalStorage === 'function') { try { window.reloadBotConfigsFromLocalStorage(); } catch (_) {} } } catch (_) { window.__pmStorageRestored = true; }`
      : `window.__pmStorageRestored = true;`;
    // IMPORTANT: Do NOT use regex literals (/.../) inside this template string, because \/ unescapes to / and // becomes a JS line comment!
    const deviceHookJs = `try {
      const __isTransientStorageKey = function(k) {
        if (!k || typeof k !== 'string') return false;
        if (k === 'aetheria.device' || k === 'aetheria.machine' || k === 'pelican_icon_manifest' || k === 'pelican_item_catalog' || k === 'pelican_latest_inventory' || k === 'pelican_packet_logs' || k === 'pelican_last_weight' || k === 'pelican_embedded_human_check_cfg' || k.startsWith('webgame.chat.')) return true;
        return k.endsWith('__icon_manifest') || k.endsWith('__item_catalog') || k.endsWith('__latest_inventory') || k.endsWith('__packet_logs') || k.endsWith('__last_weight') || k.endsWith('__embedded_human_check_cfg') || (k.indexOf('__gear_bought_') !== -1 && k.endsWith('_pending'));
      };
      const __freeStorageQuota = function(ls, rawDel) {
        try {
          if (!ls || !rawDel) return;
          const keys = [];
          for (let i = 0; i < ls.length; i++) {
            const k = ls.key(i);
            if (k) keys.push(k);
          }
          for (const k of keys) {
            if (__isTransientStorageKey(k)) {
              try { rawDel.call(ls, k); } catch (_) {}
            }
          }
        } catch (_) {}
      };
      const __mintUuid = function() {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
        const tpl = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
        let out = '';
        for (let i = 0; i < tpl.length; i++) {
          const c = tpl[i];
          if (c === 'x' || c === 'y') {
            const r = (Math.random() * 16) | 0;
            out += (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
          } else {
            out += c;
          }
        }
        return out;
      };
      const __mintMachineId = function() {
        try {
          if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
            const bytes = new Uint8Array(32);
            crypto.getRandomValues(bytes);
            let hex = '';
            for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0');
            return hex;
          }
        } catch (_) {}
        let hex = '';
        for (let i = 0; i < 64; i++) hex += ((Math.random() * 16) | 0).toString(16);
        return hex;
      };
      const __hexToBytes = function(hex) {
        const arr = new Uint8Array(32);
        for (let i = 0; i < 32; i++) {
          arr[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16) || 0;
        }
        return arr.buffer;
      };
      if (!window.__pmMachineId || typeof window.__pmMachineId !== 'string' || window.__pmMachineId.length !== 64) {
        window.__pmMachineId = __mintMachineId();
      }
      try {
        // Scrub any stray automation/chromedriver markers on window & document
        const __cleanAutomationProps = function(obj) {
          if (!obj) return;
          try {
            const names = Object.getOwnPropertyNames(obj);
            for (let i = 0; i < names.length; i++) {
              const k = names[i];
              if (k.indexOf('cdc_') !== -1 || k.indexOf('wdc_') !== -1 || k.indexOf('__webdriver') !== -1 || k.indexOf('__selenium') !== -1 || k.indexOf('__playwright') !== -1 || k.indexOf('__puppeteer') !== -1) {
                try { delete obj[k]; } catch (_) {}
              }
            }
          } catch (_) {}
        };
        __cleanAutomationProps(window);
        if (typeof document !== 'undefined') __cleanAutomationProps(document);
      } catch (_) {}
      try {
        if (typeof navigator !== 'undefined') {
          Object.defineProperty(Object.getPrototypeOf(navigator), 'webdriver', { get: function() { return false; }, configurable: true });
          const __spec = window.__pmDeviceSpec;
          if (__spec && typeof __spec === 'object') {
            const __isAndroid = __spec.platform === 'android';
            Object.defineProperty(Object.getPrototypeOf(navigator), 'platform', { get: function() { return __isAndroid ? 'Linux armv8l' : 'Win32'; }, configurable: true });
            if (__spec.ua) {
              Object.defineProperty(Object.getPrototypeOf(navigator), 'userAgent', { get: function() { return __spec.ua; }, configurable: true });
            }
            if (typeof __spec.touch === 'number') {
              Object.defineProperty(Object.getPrototypeOf(navigator), 'maxTouchPoints', { get: function() { return __spec.touch; }, configurable: true });
            }
            if (typeof __spec.cores === 'number' && __spec.cores > 0) {
              Object.defineProperty(Object.getPrototypeOf(navigator), 'hardwareConcurrency', { get: function() { return __spec.cores; }, configurable: true });
            }
            if (typeof __spec.deviceMemory === 'number' && __spec.deviceMemory > 0) {
              Object.defineProperty(Object.getPrototypeOf(navigator), 'deviceMemory', { get: function() { return __spec.deviceMemory; }, configurable: true });
            }
            if (__spec.screen && typeof window.screen !== 'undefined') {
              const __spParts = String(__spec.screen).split('x');
              const __sw = parseInt(__spParts[0], 10) || (__isAndroid ? 384 : 1920);
              const __sh = parseInt(__spParts[1], 10) || (__isAndroid ? 824 : 1080);
              const __scrProto = Object.getPrototypeOf(window.screen) || window.screen;
              try {
                const __cd = (typeof __spec.colorDepth === 'number' && __spec.colorDepth > 0) ? __spec.colorDepth : 24;
                Object.defineProperty(__scrProto, 'width', { get: function() { return __sw; }, configurable: true });
                Object.defineProperty(__scrProto, 'height', { get: function() { return __sh; }, configurable: true });
                Object.defineProperty(__scrProto, 'availWidth', { get: function() { return __sw; }, configurable: true });
                Object.defineProperty(__scrProto, 'availHeight', { get: function() { return __sh; }, configurable: true });
                Object.defineProperty(__scrProto, 'colorDepth', { get: function() { return __cd; }, configurable: true });
                Object.defineProperty(__scrProto, 'pixelDepth', { get: function() { return __cd; }, configurable: true });
              } catch (_) {}
            }
            if (__isAndroid) {
              try {
                Object.defineProperty(window, 'devicePixelRatio', { get: function() { return 3; }, configurable: true });
              } catch (_) {}
              if (!('ontouchstart' in window)) window.ontouchstart = null;
              if (!window.__pmMatchMediaHooked && typeof window.matchMedia === 'function') {
                Object.defineProperty(window, '__pmMatchMediaHooked', { value: true, writable: true, configurable: true, enumerable: false });
                const __origMatchMedia = window.matchMedia.bind(window);
                window.matchMedia = function(q) {
                  const res = __origMatchMedia(q);
                  const qs = String(q || '').toLowerCase();
                  if (qs.indexOf('pointer') !== -1 && qs.indexOf('coarse') !== -1) {
                    return Object.assign({}, res, { matches: true, media: q });
                  }
                  if ((qs.indexOf('pointer') !== -1 && qs.indexOf('fine') !== -1) || (qs.indexOf('hover') !== -1 && qs.indexOf('hover') !== -1 && qs.indexOf('none') === -1)) {
                    return Object.assign({}, res, { matches: false, media: q });
                  }
                  return res;
                };
              }
              try {
                if (window.localStorage) {
                  const __rawM = window.localStorage.getItem('webgame.mobile');
                  const __mob = __rawM ? JSON.parse(__rawM) : {};
                  if (__mob.joystick !== true) {
                    __mob.joystick = true;
                    if (__mob.newsOnEnter !== false) __mob.newsOnEnter = false;
                    window.localStorage.setItem('webgame.mobile', JSON.stringify(__mob));
                  }
                }
              } catch (_) {}
            }
          }
        }
      } catch (_) {}
      if (!window.__pmAudioContextHooked && window.__pmDeviceSpec && typeof window.__pmDeviceSpec.sampleRate === 'number') {
        window.__pmAudioContextHooked = true;
        const __targetRate = window.__pmDeviceSpec.sampleRate;
        try {
          if (typeof BaseAudioContext !== 'undefined' && BaseAudioContext.prototype) {
            Object.defineProperty(BaseAudioContext.prototype, 'sampleRate', {
              get: function() { return __targetRate; },
              configurable: true
            });
          } else if (typeof AudioContext !== 'undefined' && AudioContext.prototype) {
            Object.defineProperty(AudioContext.prototype, 'sampleRate', {
              get: function() { return __targetRate; },
              configurable: true
            });
          }
        } catch (_) {}
      }
      if (!window.__pmVoicesHooked && window.__pmDeviceSpec && Array.isArray(window.__pmDeviceSpec.voiceLangs)) {
        window.__pmVoicesHooked = true;
        try {
          if (typeof speechSynthesis !== 'undefined' && typeof speechSynthesis.getVoices === 'function') {
            const __origGetVoices = speechSynthesis.getVoices.bind(speechSynthesis);
            const __langs = window.__pmDeviceSpec.voiceLangs.slice();
            const __isAndV = window.__pmDeviceSpec.platform === 'android';
            const __voiceNames = {
              'en-US': __isAndV ? 'English United States' : 'Microsoft David - English (United States)',
              'en-GB': __isAndV ? 'English United Kingdom' : 'Microsoft George - English (United Kingdom)',
              'en-AU': __isAndV ? 'English Australia' : 'Microsoft James - English (Australia)',
              'th-TH': __isAndV ? 'Thai Thailand' : 'Microsoft Pattara - Thai (Thailand)',
              'ja-JP': __isAndV ? 'Japanese Japan' : 'Microsoft Haruka - Japanese (Japan)',
              'zh-CN': __isAndV ? 'Chinese China' : 'Microsoft Huihui - Chinese (Simplified, PRC)',
              'ko-KR': __isAndV ? 'Korean South Korea' : 'Microsoft Heami - Korean (Korea)'
            };
            const __synthLocal = __langs.map(function(lg, idx) {
              const nm = __voiceNames[lg] || ('Local Voice ' + lg);
              return { voiceURI: nm, name: nm, lang: lg, localService: true, default: idx === 0 };
            });
            speechSynthesis.getVoices = function() {
              const raw = __origGetVoices() || [];
              const remote = [];
              for (let i = 0; i < raw.length; i++) {
                if (raw[i] && raw[i].localService !== true) remote.push(raw[i]);
              }
              return __synthLocal.concat(remote);
            };
          }
        } catch (_) {}
      }
      if (!window.__pmMeasureTextHooked && window.__pmDeviceSpec && Array.isArray(window.__pmDeviceSpec.installedFonts)) {
        window.__pmMeasureTextHooked = true;
        try {
          const __fontMap = Object.create(null);
          const __fl = window.__pmDeviceSpec.installedFonts;
          for (let i = 0; i < __fl.length; i++) __fontMap[String(__fl[i]).toLowerCase()] = i + 1;
          const __origMeasureText = CanvasRenderingContext2D.prototype.measureText;
          const __baseWidths = Object.create(null);
          CanvasRenderingContext2D.prototype.measureText = function(text) {
            const result = __origMeasureText.call(this, text);
            try {
              if (text === 'mmmmmmmmmmlli10OQ@#กขฃคฅฆงฯ') {
                const font = String(this.font || '').trim();
                if (font.indexOf('72px ') === 0) {
                  const rest = font.slice(5).trim();
                  if (rest === 'monospace' || rest === 'serif' || rest === 'sans-serif') {
                    __baseWidths[rest] = result.width;
                    return result;
                  }
                  const q1 = rest.indexOf('"');
                  const q2 = q1 === 0 ? rest.indexOf('"', 1) : -1;
                  const commaIdx = rest.indexOf(',');
                  if (q1 === 0 && q2 > 1 && commaIdx > q2) {
                    const fName = rest.slice(1, q2).trim().toLowerCase();
                    const fb = rest.slice(commaIdx + 1).trim();
                    let baseW = __baseWidths[fb];
                    if (!(baseW > 0)) {
                      const prevF = this.font;
                      this.font = '72px ' + fb;
                      baseW = __origMeasureText.call(this, text).width;
                      this.font = prevF;
                      __baseWidths[fb] = baseW;
                    }
                    const fRank = __fontMap[fName] || 0;
                    const desiredW = fRank > 0 ? (baseW + 7.5 + (fRank * 0.37)) : baseW;
                    return Object.create(result, { width: { value: desiredW, enumerable: true, configurable: true } });
                  }
                }
              }
            } catch (_) {}
            return result;
          };
        } catch (_) {}
      }
      if (!window.__pmDeviceProofShieldInstalled && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function' && typeof Blob !== 'undefined') {
        window.__pmDeviceProofShieldInstalled = true;
        try {
          const __origBlob = window.Blob;
          const __origCreateObjectURL = URL.createObjectURL.bind(URL);
          const __blobSrcMap = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
          if (__blobSrcMap) {
            const __WrappedBlob = function(parts, opts) {
              const b = opts !== undefined ? new __origBlob(parts, opts) : new __origBlob(parts);
              try {
                if (Array.isArray(parts) && parts.length > 0 && typeof parts[0] === 'string' && parts[0].indexOf('copyWithin') !== -1 && parts[0].indexOf('d.bits') !== -1) {
                  __blobSrcMap.set(b, parts[0]);
                }
              } catch (_) {}
              return b;
            };
            __WrappedBlob.prototype = __origBlob.prototype;
            try { Object.setPrototypeOf(__WrappedBlob, __origBlob); } catch (_) {}
            window.Blob = __WrappedBlob;
            URL.createObjectURL = function(obj) {
              try {
                if (obj && __blobSrcMap.has(obj)) {
                  const safeBurstSrc = 'onmessage=function(e){var d=e.data;var mb=d.mb||16;if(mb<4)mb=4;var i=0;var slot=function(){if(i>=d.bits.length){postMessage({mb:mb});return;}var t0=d.at+i*d.slotMs;var t1=t0+d.slotMs;var w=t0-Date.now();if(w>0){setTimeout(slot,w);return;}i++;setTimeout(slot,Math.max(0,t1-Date.now()));};slot();};';
                  return __origCreateObjectURL(new __origBlob([safeBurstSrc], { type: 'text/javascript' }));
                }
              } catch (_) {}
              return __origCreateObjectURL(obj);
            };
          }
        } catch (_) {}
      }
      if (!window.__pmConsoleDebugHookInstalled && typeof console !== 'undefined' && typeof console.debug === 'function') {
        window.__pmConsoleDebugHookInstalled = true;
        const __origConsoleDebug = console.debug.bind(console);
        console.debug = function() {
          try {
            for (let i = 0; i < arguments.length; i++) {
              const arg = arguments[i];
              if (arg && (arg instanceof Error || typeof arg === 'object')) {
                const desc = Object.getOwnPropertyDescriptor(arg, 'stack');
                if (desc && typeof desc.get === 'function') return;
              }
            }
          } catch (_) {}
          return __origConsoleDebug.apply(console, arguments);
        };
      }
      if (!window.__pmSubtleDigestHookInstalled && typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.digest === 'function') {
        window.__pmSubtleDigestHookInstalled = true;
        const __origDigest = crypto.subtle.digest.bind(crypto.subtle);
        crypto.subtle.digest = function(algo, data) {
          try {
            const algoName = typeof algo === 'string' ? algo : (algo && algo.name ? String(algo.name) : '');
            if (algoName.toUpperCase() === 'SHA-256' && data && typeof TextDecoder !== 'undefined') {
              const txt = new TextDecoder().decode(data);
              if (txt && txt.split('|').length === 7 && (txt.endsWith('|win') || txt.endsWith('|mac') || txt.endsWith('|linux') || txt.endsWith('|android') || txt.endsWith('|ios') || txt.endsWith('|other'))) {
                const mach = (window.__pmMachineId && window.__pmMachineId.length === 64) ? window.__pmMachineId : (window.__pmMachineId = __mintMachineId());
                return Promise.resolve(__hexToBytes(mach));
              }
            }
          } catch (_) {}
          return __origDigest(algo, data);
        };
      }
      if (!window.__pmWebGlGpuHookInstalled) {
        window.__pmWebGlGpuHookInstalled = true;
        const __patchWebGl = function(ctor) {
          if (!ctor || !ctor.prototype || typeof ctor.prototype.getParameter !== 'function') return;
          const __origGetParam = ctor.prototype.getParameter;
          ctor.prototype.getParameter = function(pname) {
            try {
              if (pname === 37446 && window.__pmDeviceSpec && window.__pmDeviceSpec.gpu) {
                return window.__pmDeviceSpec.gpu;
              }
              if (pname === 37445 && window.__pmDeviceSpec) {
                return window.__pmDeviceSpec.gpuVendor || (window.__pmDeviceSpec.platform === 'android' ? 'Qualcomm' : 'Google Inc. (NVIDIA)');
              }
            } catch (_) {}
            return __origGetParam.apply(this, arguments);
          };
        };
        if (typeof WebGLRenderingContext !== 'undefined') __patchWebGl(WebGLRenderingContext);
        if (typeof WebGL2RenderingContext !== 'undefined') __patchWebGl(WebGL2RenderingContext);
      }
      if (window.__pmDeviceIdHookInstalled !== 2) {
        window.__pmDeviceIdHookInstalled = 2;
        const __sp = Storage.prototype;
        if (!window.__pmRawStorage) {
          window.__pmRawStorage = { get: __sp.getItem, set: __sp.setItem, del: __sp.removeItem };
        }
        const __rawGet = window.__pmRawStorage.get;
        const __rawSet = window.__pmRawStorage.set;
        const __rawDel = window.__pmRawStorage.del;
        const __getPid = function() {
          if (window.__pmProfileId) return window.__pmProfileId;
          try {
            const s = window.sessionStorage && __rawGet.call(window.sessionStorage, '__pmProfileId');
            if (s) {
              window.__pmProfileId = s;
              return s;
            }
          } catch (_) {}
          return null;
        };
        const __mapKey = function(st, k) {
          const pid = __getPid();
          if (st !== window.localStorage || !pid || typeof k !== 'string') return k;
          const pfx = 'pelican_' + pid + '__';
          if (k === 'aetheria.device') return pfx + 'aetheria_device';
          if (k === 'aetheria.machine') return pfx + 'aetheria_machine';
          if (k === 'nightcamp.online.device' || k === 'nightcamp.uid' || k === 'nightcamp.online.server' || k === 'nightcamp.online.lastPlayed' || k.startsWith('nightcamp.online.acct:') || k.startsWith('nightcamp.online.heroes:')) {
            return pfx + 'nc__' + k;
          }
          if (k.startsWith('pelican_') && !k.startsWith(pfx) && k.indexOf('__') === -1 && k !== 'pelican_icon_manifest' && k !== 'pelican_item_catalog') {
            return pfx + k.slice(8);
          }
          return k;
        };
        __sp.getItem = function(k) {
          if (this === window.localStorage) {
            const pid = __getPid();
            if (window.__pmDeviceId && (k === 'aetheria.device' || (pid && k === 'pelican_' + pid + '__aetheria_device'))) {
              return window.__pmDeviceId;
            }
            if (window.__pmDeviceId && (k === 'nightcamp.online.device' || (pid && k === 'pelican_' + pid + '__nc__nightcamp.online.device'))) {
              return JSON.stringify(String(window.__pmDeviceId).split('-').join(''));
            }
            if (window.__pmMachineId && (k === 'aetheria.machine' || (pid && k === 'pelican_' + pid + '__aetheria_machine'))) {
              return window.__pmMachineId;
            }
          }
          return __rawGet.call(this, __mapKey(this, k));
        };
        __sp.setItem = function(k, v) {
          const pid = __getPid();
          if (this === window.localStorage && pid) {
            if (k === 'nightcamp.online.device' || k === 'pelican_' + pid + '__nc__nightcamp.online.device') {
              return;
            }
            if (!__isTransientStorageKey(k)) {
              window.__pmStorageDirtyAt = Date.now();
            }
            if (k === 'aetheria.device' || k === 'pelican_' + pid + '__aetheria_device') {
              const incoming = String(v || '').trim();
              const dev = (incoming && incoming.length >= 16 && incoming !== 'unknown-device') ? incoming : (window.__pmDeviceId || __mintUuid());
              window.__pmDeviceId = dev;
              const targetKey = 'pelican_' + pid + '__aetheria_device';
              try {
                return __rawSet.call(this, targetKey, dev);
              } catch (_) {
                __freeStorageQuota(this, __rawDel);
                try { return __rawSet.call(this, targetKey, dev); } catch (__) { return; }
              }
            }
            if (k === 'aetheria.machine' || k === 'pelican_' + pid + '__aetheria_machine') {
              const incoming = String(v || '').trim().toLowerCase();
              const mach = (incoming && incoming.length === 64) ? incoming : (window.__pmMachineId || __mintMachineId());
              window.__pmMachineId = mach;
              const targetKey = 'pelican_' + pid + '__aetheria_machine';
              try {
                return __rawSet.call(this, targetKey, mach);
              } catch (_) {
                __freeStorageQuota(this, __rawDel);
                try { return __rawSet.call(this, targetKey, mach); } catch (__) { return; }
              }
            }
            const mk = __mapKey(this, k);
            let finalVal = v;
            if ((mk.endsWith('__sell_cfg') || mk === 'pelican_sell_cfg') && typeof v === 'string' && v.indexOf('"weaponRarity"') === -1) {
              try {
                const prevSell = __rawGet.call(this, mk);
                if (prevSell && prevSell.indexOf('"weaponRarity"') !== -1) {
                  const pa = JSON.parse(prevSell);
                  const pb = JSON.parse(v);
                  if (pa && pb && typeof pa === 'object' && typeof pb === 'object') {
                    const mergedSell = Object.assign({}, pa, pb);
                    if (pa.whitelist && String(pa.whitelist).length > 50 && (!pb.whitelist || String(pb.whitelist).trim() === 'Halloween Candy, Golden Pumpkin')) {
                      mergedSell.whitelist = pa.whitelist;
                    }
                    finalVal = JSON.stringify(mergedSell);
                  }
                }
              } catch (_) {}
            }
            try {
              return __rawSet.call(this, mk, finalVal);
            } catch (_) {
              __freeStorageQuota(this, __rawDel);
              try { return __rawSet.call(this, mk, finalVal); } catch (__) { return; }
            }
          }
          return __rawSet.call(this, k, v);
        };
        __sp.removeItem = function(k) {
          const pid = __getPid();
          if (this === window.localStorage && pid && (k === 'aetheria.device' || k === 'aetheria.machine' || k === 'nightcamp.online.device' || k === 'pelican_' + pid + '__aetheria_device' || k === 'pelican_' + pid + '__aetheria_machine' || k === 'pelican_' + pid + '__nc__nightcamp.online.device')) {
            return;
          }
          return __rawDel.call(this, __mapKey(this, k));
        };
      }
      try {
        if (window.localStorage) {
          const __rawSet = (window.__pmRawStorage && window.__pmRawStorage.set) || Storage.prototype.setItem;
          const __rawDel = (window.__pmRawStorage && window.__pmRawStorage.del) || Storage.prototype.removeItem;
          try { __rawDel.call(window.localStorage, 'aetheria.device'); } catch (_) {}
          try { __rawDel.call(window.localStorage, 'aetheria.machine'); } catch (_) {}
          try { __rawDel.call(window.localStorage, 'nightcamp.online.device'); } catch (_) {}
          if (window.__pmProfileId && window.__pmDeviceId) {
            const targetKey = 'pelican_' + window.__pmProfileId + '__aetheria_device';
            const ncDevKey = 'pelican_' + window.__pmProfileId + '__nc__nightcamp.online.device';
            const ncDevVal = JSON.stringify(String(window.__pmDeviceId).split('-').join(''));
            try {
              __rawSet.call(window.localStorage, targetKey, window.__pmDeviceId);
              __rawSet.call(window.localStorage, ncDevKey, ncDevVal);
            } catch (_) {
              __freeStorageQuota(window.localStorage, __rawDel);
              try {
                __rawSet.call(window.localStorage, targetKey, window.__pmDeviceId);
                __rawSet.call(window.localStorage, ncDevKey, ncDevVal);
              } catch (__) {}
            }
          }
          if (window.__pmProfileId && window.__pmMachineId) {
            const machKey = 'pelican_' + window.__pmProfileId + '__aetheria_machine';
            try {
              __rawSet.call(window.localStorage, machKey, window.__pmMachineId);
            } catch (_) {
              __freeStorageQuota(window.localStorage, __rawDel);
              try { __rawSet.call(window.localStorage, machKey, window.__pmMachineId); } catch (__) {}
            }
          }
        }
        if (window.__pmDeviceId && window.__pmLastNcPhoneDev !== window.__pmDeviceId) {
          window.__pmLastNcPhoneDev = window.__pmDeviceId;
          if (typeof document !== 'undefined' && document.querySelector('#sq [data-sq="phone"]') && window.NC && window.NC.PhoneWin && typeof window.NC.PhoneWin.open === 'function') {
            window.NC.PhoneWin.open();
          }
        }
      } catch (_) {}
      if (!window.__pmEnterWorldDeviceHookInstalled && typeof window.fetch === 'function') {
        window.__pmEnterWorldDeviceHookInstalled = true;
        const __origFetch = window.fetch;
        window.fetch = function(input, init) {
          let loginCreds = null;
          let isEnterWorld = false;
          try {
            const urlStr = typeof input === 'string' ? input : (input && typeof input.url === 'string' ? input.url : '');
            const isRegisterCall = urlStr.includes('/auth/register');
            if (urlStr === '/world/enter' || urlStr.endsWith('/world/enter') || urlStr.includes('/world/enter?')) {
              isEnterWorld = true;
            }
            if (isEnterWorld || isRegisterCall || (init && typeof init.body === 'string' && (init.body.includes('"deviceId"') || init.body.includes('"machineId"')))) {
              if (!window.__pmDeviceId || window.__pmDeviceId === 'unknown-device') {
                window.__pmDeviceId = __mintUuid();
              }
              if (!window.__pmMachineId || typeof window.__pmMachineId !== 'string' || window.__pmMachineId.length !== 64) {
                window.__pmMachineId = __mintMachineId();
              }
              if (init && typeof init.body === 'string') {
                const parsed = JSON.parse(init.body);
                if (parsed && typeof parsed === 'object') {
                  if (isEnterWorld || isRegisterCall || 'deviceId' in parsed) parsed.deviceId = window.__pmDeviceId;
                  if (isEnterWorld || isRegisterCall || 'machineId' in parsed) parsed.machineId = window.__pmMachineId;
                  if (window.__pmDeviceSpec && typeof window.__pmDeviceSpec === 'object') {
                    if ((isEnterWorld || 'gpu' in parsed) && window.__pmDeviceSpec.gpu) {
                      parsed.gpu = window.__pmDeviceSpec.gpu;
                    }
                    if ((isEnterWorld || 'ua' in parsed) && window.__pmDeviceSpec.ua) {
                      parsed.ua = window.__pmDeviceSpec.ua;
                    }
                    if ((isEnterWorld || 'touch' in parsed) && typeof window.__pmDeviceSpec.touch === 'number') {
                      parsed.touch = window.__pmDeviceSpec.touch;
                    }
                  }
                  init = Object.assign({}, init, { body: JSON.stringify(parsed) });
                }
              }
            }
            if (init && typeof init.body === 'string' && (urlStr.includes('/auth/login') || urlStr.includes('/auth/register') || urlStr.includes('/auth/upgrade'))) {
              const parsedAuth = JSON.parse(init.body);
              const authUser = parsedAuth && (typeof parsedAuth.userId === 'string' ? parsedAuth.userId.trim() : (typeof parsedAuth.username === 'string' ? parsedAuth.username.trim() : ''));
              if (authUser && parsedAuth && typeof parsedAuth.password === 'string' && parsedAuth.password) {
                loginCreds = { username: authUser, password: parsedAuth.password, isRegister: urlStr.includes('/auth/register') || urlStr.includes('/auth/upgrade') };
              }
            }
          } catch (_) {}
          const p = __origFetch.call(this, input, init);
          if (isEnterWorld && p && typeof p.then === 'function') {
            p.then(res => {
              if (res && !res.ok && !window.__pmManagedDeviceGroup) {
                try {
                  res.clone().text().then(txt => {
                    if (txt && txt.includes('เครื่องนี้เล่นพร้อมกัน')) {
                      const nextDev = __mintUuid();
                      const nextMach = __mintMachineId();
                      window.__pmDeviceId = nextDev;
                      window.__pmMachineId = nextMach;
                      try {
                        const __rawSet = (window.__pmRawStorage && window.__pmRawStorage.set) || Storage.prototype.setItem;
                        if (window.localStorage && window.__pmProfileId) {
                          __rawSet.call(window.localStorage, 'pelican_' + window.__pmProfileId + '__aetheria_device', nextDev);
                          __rawSet.call(window.localStorage, 'pelican_' + window.__pmProfileId + '__aetheria_machine', nextMach);
                        }
                      } catch (_) {}
                    }
                  }).catch(() => {});
                } catch (_) {}
              }
              return res;
            }).catch(() => {});
          }
          if (loginCreds && p && typeof p.then === 'function') {
            p.then(res => {
              if (res && res.ok) {
                try {
                  const now = Date.now();
                  let storedCur = {};
                  try { storedCur = JSON.parse(window.localStorage ? (window.localStorage.getItem('pelican_auth_cfg') || '{}') : '{}') || {}; } catch (_) {}
                  const cur = (window.__authConfig && typeof window.__authConfig === 'object') ? window.__authConfig : storedCur;
                  const isSameGen = Boolean(cur.generatedUser && cur.username === loginCreds.username);
                  const keepDisabled = Boolean(cur.enabled === false || cur.userDisabledAutoLogin || storedCur.enabled === false || storedCur.userDisabledAutoLogin);
                  const patchLogin = {
                    username: loginCreds.username,
                    password: loginCreds.password,
                    generatedUser: isSameGen,
                    register: false,
                    registerDone: true,
                    verifiedLoginAt: now,
                    userEditedAt: Number(cur.userEditedAt) || 0
                  };
                  if (keepDisabled) {
                    patchLogin.enabled = false;
                    patchLogin.userDisabledAutoLogin = true;
                  }
                  if (window.__authConfig && typeof window.__authConfig === 'object') {
                    Object.assign(window.__authConfig, patchLogin);
                    delete window.__authConfig.registerError;
                  } else {
                    const next = Object.assign({}, storedCur, patchLogin);
                    delete next.registerError;
                    window.__authConfig = next;
                  }
                  const activeCfg = window.__authConfig;
                  if (window.localStorage) window.localStorage.setItem('pelican_auth_cfg', JSON.stringify(activeCfg));
                  const uEl = document.getElementById('p-auth-user');
                  const pEl = document.getElementById('p-auth-pass');
                  if (uEl && document.activeElement !== uEl) uEl.value = activeCfg.username;
                  if (pEl && document.activeElement !== pEl) pEl.value = activeCfg.password;
                } catch (_) {}
              }
              return res;
            }).catch(() => {});
          }
          return p;
        };
      }
      if (!window.__pmAuthInputGuardInstalled && typeof document !== 'undefined') {
        window.__pmAuthInputGuardInstalled = true;
        const onAuthInput = (ev) => {
          try {
            const t = ev && ev.target;
            if (!t || !t.id) return;
            if (t.id === 'p-auth-user' || t.id === 'p-auth-pass') {
              const now = Date.now();
              const cur = (window.__authConfig && typeof window.__authConfig === 'object') ? window.__authConfig : {};
              if (t.id === 'p-auth-user') cur.username = String(t.value || '').trim();
              if (t.id === 'p-auth-pass') cur.password = String(t.value || '');
              cur.userEditedAt = now;
              cur.generatedUser = false;
              cur.register = false;
              delete cur.registerError;
              window.__authConfig = cur;
              if (window.localStorage) window.localStorage.setItem('pelican_auth_cfg', JSON.stringify(cur));
            } else if (t.id === 'p-auth-enabled') {
              const wantEn = Boolean(t.checked);
              const nowTs = Date.now();
              const cur = (window.__authConfig && typeof window.__authConfig === 'object') ? window.__authConfig : {};
              if (wantEn) {
                window.__ncAllowEnableAutoLogin = true;
                window.__ncUserDisabledAutoLogin = false;
              } else {
                window.__ncUserDisabledAutoLogin = true;
              }
              try {
                cur.enabled = wantEn;
                cur.userDisabledAutoLogin = !wantEn;
                cur.userToggledAt = nowTs;
              } finally {
                window.__ncAllowEnableAutoLogin = false;
              }
              window.__authConfig = cur;
              if (window.localStorage) {
                window.localStorage.setItem('pelican_auth_cfg', JSON.stringify(cur));
                window.localStorage.setItem('pelican_autologin_user_lock', JSON.stringify({ enabled: wantEn, ts: nowTs }));
              }
            }
          } catch (_) {}
        };
        document.addEventListener('input', onAuthInput, true);
        document.addEventListener('change', onAuthInput, true);
      }
    } catch (_) {}`;
    const cacheFlag = Boolean(effectiveAssetCache && effectiveAssetCache.isEnabled());
    const hidePmPropsJs = `try { const __pmKeys = Object.getOwnPropertyNames(window); for (let i = 0; i < __pmKeys.length; i++) { const k = __pmKeys[i]; if (k.indexOf('__pm') === 0) { const d = Object.getOwnPropertyDescriptor(window, k); if (d && d.configurable && d.enumerable) { Object.defineProperty(window, k, Object.assign({}, d, { enumerable: false })); } } } } catch (_) {}`;
    return `window.__pmProfileId = ${JSON.stringify(profileId)}; window.__pmManagedDeviceGroup = true; window.__pmDeviceId = ${JSON.stringify(deviceId)}; window.__pmMachineId = ${JSON.stringify(machineId)}; window.__pmDeviceSpec = ${JSON.stringify(deviceSpec)}; window.__pmLocalAssetCacheEnabled = ${cacheFlag}; try { window.sessionStorage && window.sessionStorage.setItem('__pmProfileId', ${JSON.stringify(profileId)}); } catch (_) {} ${deviceHookJs} ${restoreJs} ${hidePmPropsJs}`;
  };

  async function configureSessionAssetCache(sessionId, opts = {}) {
    if (!sessionId) return;
    const forceDisable = Boolean(opts && opts.forceDisable);
    const shouldEnable = !forceDisable && Boolean(effectiveAssetCache && effectiveAssetCache.isEnabled());
    const patterns = (shouldEnable && Array.isArray(effectiveAssetCache.CDP_ASSET_FETCH_PATTERNS))
      ? effectiveAssetCache.CDP_ASSET_FETCH_PATTERNS
      : [];
    await Promise.all([
      shouldEnable && patterns.length > 0
        ? send('Fetch.enable', { patterns }, sessionId, 4000).catch(() => {})
        : send('Fetch.disable', {}, sessionId, 3000).catch(() => {}),
      send('Runtime.disable', {}, sessionId, 3000).catch(() => {})
    ]);
  }

  let lastSharedHarvestAt = 0;
  async function syncClientStorage(c, forceHarvest = false) {
    if (!c || !c.sessionId || !storageDir) return;
    try {
      const prefix = `pelican_${c.profileId}__`;
      const harvestAll = !c.browserContextId && (Date.now() - lastSharedHarvestAt > 120000);
      if (harvestAll) lastSharedHarvestAt = Date.now();
      const res = await evaluate(c, `(() => {
        if (!window.__pmStorageRestored) return { restored: false, out: {}, other: {} };
        if (window.__pmProfileId && window.__pmProfileId !== ${JSON.stringify(c.profileId)}) return { restored: false, out: {}, other: {} };
        const curDirty = window.__pmStorageDirtyAt || 1;
        const doHarvest = ${Boolean(harvestAll)};
        const force = ${Boolean(forceHarvest)};
        if (!force && !doHarvest && window.__pmLastHarvestedDirtyAt === curDirty) {
          return { restored: true, unchanged: true, dirtyAt: curDirty };
        }
        window.__pmLastHarvestedDirtyAt = curDirty;
        const out = {};
        const other = {};
        const __rawGet = (window.__pmRawStorage && window.__pmRawStorage.get) || Storage.prototype.getItem;
        if (window.localStorage) {
          const pfx = ${JSON.stringify(prefix)};
          const extraKeys = new Set(['ui.windows', 'partyFrameFolded', 'skip-anim:refine', 'hudMenuOpen', 'webgame.camera']);
          for (let i = 0; i < window.localStorage.length; i++) {
            const k = window.localStorage.key(i);
            if (!k || k === 'aetheria.device' || k === 'aetheria.machine' || k === 'pelican_icon_manifest' || k === 'pelican_item_catalog' || k === 'pelican_latest_inventory' || k === 'pelican_packet_logs' || k === 'pelican_last_weight' || k === 'pelican_embedded_human_check_cfg' || k === 'pelican_job_return_map' || k === 'pelican_gohome_keep_farm' || k === 'pelican_gear_trip' || k === 'pelican_town_needs' || k === 'pelican_override_farm_map' || k === 'pelican_weight_topup' || k.endsWith('__icon_manifest') || k.endsWith('__item_catalog') || k.endsWith('__latest_inventory') || k.endsWith('__packet_logs') || k.endsWith('__last_weight') || k.endsWith('__embedded_human_check_cfg') || k.endsWith('__job_return_map') || k.endsWith('__gohome_keep_farm') || k.endsWith('__gear_trip') || k.endsWith('__town_needs') || k.endsWith('__override_farm_map') || k.endsWith('__weight_topup') || k.startsWith('webgame.chat.')) continue;
            const isOwn = k.startsWith(pfx) || extraKeys.has(k);
            const isOther = doHarvest && !isOwn && k.startsWith('pelican_profile_');
            if (!isOwn && !isOther) continue;
            const rawVal = __rawGet.call(window.localStorage, k);
            if (typeof rawVal !== 'string') continue;
            if (isOwn) {
              out[k] = rawVal;
            } else {
              const rest = k.slice(8);
              const sepIdx = rest.indexOf('__');
              if (sepIdx > 0) {
                const otherPid = rest.slice(0, sepIdx);
                if (!other[otherPid]) other[otherPid] = {};
                other[otherPid][k] = rawVal;
              }
            }
          }
        }
        if (window.sessionStorage) {
          const ssVal = __rawGet.call(window.sessionStorage, 'aetheria.session');
          if (ssVal) out['__ss:aetheria.session'] = ssVal;
        }
        return { restored: true, dirtyAt: curDirty, out, other };
      })()`, 5000);
      if (!res || res.restored === false || res.unchanged) return;
      const entries = res && res.out ? res.out : res;
      if (entries && typeof entries === 'object' && Object.keys(entries).length > 0) {
        saveProfileStorage(c.profileId, entries, { fullHarvest: Object.keys(entries).some(k => k.startsWith(prefix)) });
        if (res && res.dirtyAt && res.dirtyAt !== c.lastSyncedDirtyAt) {
          c.lastSyncedDirtyAt = res.dirtyAt;
          if (forceHarvest && (!isRealSession || !c.initScriptId || Date.now() - (c.lastSessionHooksAt || 0) > 180000)) {
            c.lastSessionHooksAt = Date.now();
            await ensureSessionHooks(c.sessionId, c.profileId, c).catch(() => {});
          }
        }
      }
      if (res && res.other && typeof res.other === 'object') {
        let harvestedNew = false;
        for (const [otherId, map] of Object.entries(res.other)) {
          if (!map || typeof map !== 'object' || Object.keys(map).length === 0) continue;
          const existing = loadProfileStorage(otherId);
          if (!existing || Object.keys(existing).length === 0) harvestedNew = true;
          saveProfileStorage(otherId, map, { fullHarvest: true });
        }
        if (harvestedNew && typeof loadProfiles === 'function') {
          try { loadProfiles(); } catch (_) {}
        }
      }
    } catch (_) {}
  }

  async function applyCdpDeviceEmulation(sessionId, spec) {
    if (!sessionId || !spec || typeof spec !== 'object') return;
    const isAndroid = spec.platform === 'android';
    const ua = spec.ua || (isAndroid ? ANDROID_DEVICE_PRESETS[0].ua : PC_DEVICE_PRESETS[0].ua);
    const modelCode = isAndroid ? (String(spec.model || '').match(/\(([^)]+)\)/)?.[1] || 'SM-S928B') : '';
    const chromeMajor = String(spec.chromeMajor || '157');
    const chromeFull = String(spec.chromeFull || '157.0.8103.79');
    const platVer = String(spec.platformVersion || (isAndroid ? '14.0.0' : '15.0.0'));
    const calls = [
      send('Emulation.setUserAgentOverride', {
        userAgent: ua,
        platform: isAndroid ? 'Linux armv8l' : 'Win32',
        userAgentMetadata: {
          brands: [
            { brand: 'Chromium', version: chromeMajor },
            { brand: 'Google Chrome', version: chromeMajor },
            { brand: 'Not_A Brand', version: '24' }
          ],
          fullVersionList: [
            { brand: 'Chromium', version: chromeFull },
            { brand: 'Google Chrome', version: chromeFull },
            { brand: 'Not_A Brand', version: '24.0.0.0' }
          ],
          platform: isAndroid ? 'Android' : 'Windows',
          platformVersion: platVer,
          architecture: isAndroid ? '' : 'x86',
          model: modelCode,
          mobile: isAndroid,
          bitness: isAndroid ? '' : '64',
          wow64: false
        }
      }, sessionId, 4000).catch(() => {}),
      send('Emulation.setTouchEmulationEnabled', {
        enabled: isAndroid,
        maxTouchPoints: isAndroid ? (spec.touch || 5) : 0
      }, sessionId, 4000).catch(() => {}),
      send('Emulation.setEmitTouchEventsForMouse', {
        enabled: isAndroid,
        configuration: isAndroid ? 'mobile' : 'desktop'
      }, sessionId, 4000).catch(() => {})
    ];
    await Promise.all(calls);
  }

  async function ensureSessionHooks(sessionId, profileId, clientObj = null) {
    await send('Page.enable', {}, sessionId, 5000).catch(() => {});
    await configureSessionAssetCache(sessionId);
    const spec = ensureProfileDeviceSpec(profileId);
    await applyCdpDeviceEmulation(sessionId, spec).catch(() => {});
    const c = clientObj || clients.get(profileId) || null;
    if (c) {
      const oldIds = Array.isArray(c.initScriptIds) ? c.initScriptIds.slice() : [];
      if (c.initScriptId && !oldIds.includes(c.initScriptId)) oldIds.push(c.initScriptId);
      c.initScriptIds = [];
      c.initScriptId = null;
      for (const id of oldIds) {
        if (id) await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: id }, sessionId, 2000).catch(() => {});
      }
    }
    const added = await send('Page.addScriptToEvaluateOnNewDocument', { source: profileInitScript(profileId) }, sessionId, 5000).catch(() => null);
    if (c && added && added.identifier) {
      c.initScriptId = added.identifier;
      if (!Array.isArray(c.initScriptIds)) c.initScriptIds = [];
      c.initScriptIds.push(added.identifier);
    }
  }

  async function health(c, customTimeoutMs = 0) {
    const tMs = customTimeoutMs > 0 ? customTimeoutMs : (isRealSession ? 6000 : 8000);
    const value=await evaluate(c,HEALTH_JS,tMs,true);
    if(!value || typeof value.documentId!=='string')throw Error('INVALID_DOCUMENT_PROBE');
    if(c.documentId!==value.documentId) {c.documentId=value.documentId;c.generation++;c.attempts=0;clearTimeout(c.retryTimer);c.retryTimer=null;}
    return value;
  }
  const current=(c,token)=>clients.get(c.profileId)===c&&!stoppedProfiles.has(c.profileId)&&c.generation===token.generation&&c.sessionId===token.sessionId;
  function classify(c,h) {
    const devId = ensureProfileDeviceId(c.profileId);
    if(h.version&&h.liveHook&&(h.hud||isRealSession)){
      if (Date.now() - (c.lastCrashReloadAt || 0) > 120000) c.crashReloadCount=0;
      c.stateFailCount=0;c.firstStateFailAt=0;c.attempts=0;c.probeFailCount=0;c.evalTimeouts=0;c.evalCooldownUntil=0;c.initialHealthChecked=true;
      diagnostic(c,'ready',{version:h.version,documentId:h.documentId,deviceId:h.deviceId||devId,hud:h.hud,liveHook:h.liveHook});
      return true;
    }
    if(h.version||h.hud||h.liveHook||(isRealSession ? h.payloadInitialized : (h.initialized&&h.bootstrapPhase!=='waiting'))){c.stateFailCount=0;c.firstStateFailAt=0;c.probeFailCount=0;if(h.liveHook)c.initialHealthChecked=true;diagnostic(c,'partial-runtime',{version:h.version,documentId:h.documentId,deviceId:h.deviceId||devId,hud:h.hud,liveHook:h.liveHook});return true;}
    return false;
  }

  async function reloadCrashedClient(c, reason = 'crashed', force = false) {
    if (!c || stoppedProfiles.has(c.profileId) || clients.get(c.profileId) !== c) return false;
    if (!force) {
      // ปิดระบบรีเฟรชหน้าจออัตโนมัติเมื่อจอมีปัญหา/ค้าง/โหลดไม่เข้า (อนุญาตเฉพาะคำสั่งกู้คืนแบบ force เท่านั้น)
      return false;
    }
    const now = Date.now();
    if (c.crashReloadInFlight) return false;
    c.crashReloadInFlight = true;
    c.lastCrashReloadAt = now;
    c.crashReloadCount = (c.crashReloadCount || 0) + 1;
    c.stateFailCount = 0;
    c.firstStateFailAt = 0;
    c.evalTimeouts = 0;
    c.evalCooldownUntil = Date.now() + 4000;
    c.probeFailCount = 0;
    c.generation++;
    c.documentId = null;
    c.attempts = 0;
    clearTimeout(c.retryTimer);
    c.retryTimer = null;
    diagnostic(c, 'crashed-reloading', { reason: String(reason), reloadCount: c.crashReloadCount });
    console.warn(`[BrowserMode] 🔄 จอ ${c.profileId} ค้างหรือแรมเต็ม (${reason}) -> สั่ง Refresh หน้าเกมอัตโนมัติ (ครั้งที่ ${c.crashReloadCount})`);
    const schedulePostReloadInject = () => {
      const t = setTimeout(() => {
        if (c) c.evalCooldownUntil = 0;
        ensureSessionHooks(c.sessionId, c.profileId, c).finally(() => injectBot(c).catch(() => {}));
      }, 1800);
      t.unref?.();
    };
    try {
      await ensureSessionHooks(c.sessionId, c.profileId, c).catch(() => {});
      await send('Page.reload', { ignoreCache: false }, c.sessionId, isRealSession ? 3000 : 8000);
      schedulePostReloadInject();
      return true;
    } catch (_) {
      try {
        await ensureSessionHooks(c.sessionId, c.profileId, c).catch(() => {});
        await send('Page.navigate', { url: gameUrl }, c.sessionId, isRealSession ? 4000 : 8000);
        schedulePostReloadInject();
        return true;
      } catch (_) {
        try {
          const { sessionId } = await send('Target.attachToTarget', { targetId: c.targetId, flatten: true }, undefined, 4000);
          c.sessionId = sessionId;
          await ensureSessionHooks(sessionId, c.profileId, c).catch(() => {});
          await send('Page.reload', { ignoreCache: false }, sessionId, 3000).catch(() => send('Page.navigate', { url: gameUrl }, sessionId, 4000));
          schedulePostReloadInject();
          return true;
        } catch (_) {
          return false;
        }
      }
    } finally {
      c.crashReloadInFlight = false;
    }
  }

  let activeHeavyInjectionChain = Promise.resolve();
  let heavyInjectionInFlightCount = 0;
  async function injectBot(c) {
    if(clients.get(c.profileId)!==c||stoppedProfiles.has(c.profileId))return;
    if(c.retryTimer)return;
    if(c.injectionInFlight){c.pendingLoad=true;return c.injectionInFlightPromise;}
    const flight={};c.injectionInFlight=flight;
    let token;
    const runPromise = (async () => {
    try {
      const before=await health(c);token={generation:c.generation,sessionId:c.sessionId};
      const expectedDeviceId = ensureProfileDeviceId(c.profileId);
      const expectedMachineId = ensureProfileMachineId(c.profileId);
      if (isRealSession && before.profileId === c.profileId && before.version && before.hud && before.liveHook) {
        if (!c.initScriptId) {
          ensureSessionHooks(c.sessionId, c.profileId, c).catch(() => {});
        }
        if (classify(c, before)) return;
      }
      if (before.profileId && before.profileId !== c.profileId) {
        if (knownTargets.get(c.profileId) === c.targetId) {
          knownTargets.delete(c.profileId);
          saveKnownTargets();
        }
        drop(c);
        return;
      }
      if (before.profileId !== c.profileId || before.deviceId !== expectedDeviceId || before.machineId !== expectedMachineId || !before.storageRestored) {
        await ensureSessionHooks(c.sessionId, c.profileId, c);
        await evaluate(c, profileInitScript(c.profileId), 6000, true).catch(() => {});
        before.deviceId = expectedDeviceId;
        before.machineId = expectedMachineId;
        before.storageRestored = true;
      }
      if(classify(c,before))return;
      if(!isGameUrl(before.href)||before.ready!=='complete'){
        diagnostic(c,'document-pending');
        if(c.attempts<5 && current(c,token)){
          c.retryTimer=setTimeout(()=>{c.retryTimer=null;injectBot(c);},retryDelays[Math.min(c.attempts,retryDelays.length-1)]||1000);
          c.retryTimer.unref?.();
        }
        return;
      }
      if(c.attempts>=3){
        if (Date.now() - (c.lastAttemptAt || 0) > 12000) {
          c.attempts = 0;
        } else {
          diagnostic(c,'load-failed',{code:'RETRY_LIMIT'});
          return;
        }
      }
      c.attempts++;c.lastAttemptAt=Date.now();diagnostic(c,'loading');
      const selectedSource=profileScriptSource?.(c.profileId);
      const code = (typeof selectedSource === 'string' && isRealSession) ? selectedSource : await botSource(c.profileId);
      if(!isRealSession && profileScriptSource?.(c.profileId)!==selectedSource)return;
      if(!current(c,token))return;
      if (isRealSession) {
        let releaseGate;
        const prevGate = activeHeavyInjectionChain;
        activeHeavyInjectionChain = new Promise(r => { releaseGate = r; });
        try {
          await prevGate;
          heavyInjectionInFlightCount++;
          try {
            if(!current(c,token))return;
            const after=await health(c);
            if(!current(c,token)||after.documentId!==before.documentId||classify(c,after))return;
            await evaluate(c,MSGPACK,8000,true);
            if(!current(c,token))return;
            const invokeCode = code.includes('\nwindow.__pmScriptBootstrap.accept(')
              ? code.replace('\nwindow.__pmScriptBootstrap.accept(', '\nreturn window.__pmScriptBootstrap.accept(')
              : code;
            const expression=`(async () => { if(String(performance.timeOrigin)!==${JSON.stringify(before.documentId)}) return {skipped:true,reason:'DOCUMENT_CHANGED'}; if(!window.__pmProfileId) window.__pmProfileId=${JSON.stringify(c.profileId)}; if(!window.__pmDeviceId) window.__pmDeviceId=${JSON.stringify(expectedDeviceId)}; try { window.sessionStorage && window.sessionStorage.setItem('__pmProfileId', window.__pmProfileId); } catch (_) {} if(window.__nightcampBotVersion || window.__pelicanBotVersion || window.__pmPayloadInitialized || ('__isBotRunning' in window) || typeof window.startMasterBot==='function' || document.getElementById('nightcamp-hud') || document.getElementById('pelican-hud') || typeof window.__getClientLiveState==='function') return {skipped:true,reason:'ALREADY_RUNNING'}; if(window.__pmScriptBootstrap?.status?.()?.phase === 'failed') { try { delete window.__pmScriptBootstrap; delete window.__pmBrowserInjectionAttempted; } catch (_) { window.__pmScriptBootstrap = null; window.__pmBrowserInjectionAttempted = false; } } window.__pmBrowserInjectionAttempted=true; const evalResult = await (async () => { /*(0,eval)(*/\n${invokeCode}\n})(); return {attempted:true, evalResult}; })()`;
            await evaluate(c, expression, 25000, true);
            await new Promise(r => setTimeout(r, 200));
          } finally {
            heavyInjectionInFlightCount = Math.max(0, heavyInjectionInFlightCount - 1);
          }
        } finally {
          releaseGate();
        }
      } else {
        const after=await health(c);
        if(!current(c,token)||after.documentId!==before.documentId||classify(c,after))return;
        await evaluate(c,MSGPACK,8000);
        if(!current(c,token))return;
        // Atomic document/runtime guard closes the race with a delayed legacy loader response.
        const expression=`(async () => { if(String(performance.timeOrigin)!==${JSON.stringify(before.documentId)}) return {skipped:true,reason:'DOCUMENT_CHANGED'}; if(!window.__pmProfileId) window.__pmProfileId=${JSON.stringify(c.profileId)}; if(!window.__pmDeviceId) window.__pmDeviceId=${JSON.stringify(expectedDeviceId)}; try { window.sessionStorage && window.sessionStorage.setItem('__pmProfileId', window.__pmProfileId); } catch (_) {} if(window.__nightcampBotVersion || window.__pelicanBotVersion || window.__pmPayloadInitialized || ('__isBotRunning' in window) || typeof window.startMasterBot==='function' || document.getElementById('nightcamp-hud') || document.getElementById('pelican-hud') || typeof window.__getClientLiveState==='function') return {skipped:true,reason:'ALREADY_RUNNING'}; if(window.__pmScriptBootstrap?.status?.()?.phase === 'failed') { try { delete window.__pmScriptBootstrap; delete window.__pmBrowserInjectionAttempted; } catch (_) { window.__pmScriptBootstrap = null; window.__pmBrowserInjectionAttempted = false; } } window.__pmBrowserInjectionAttempted=true; const evalResult = await (0,eval)(${JSON.stringify(code)}); return {attempted:true, evalResult}; })()`;
        await evaluate(c,expression);
      }
      if(!current(c,token))return;
      const result=await health(c);
      if(!classify(c,result)) {
        if (isRealSession && typeof code === 'string' && !code.includes('__pmScriptBootstrap.accept(')) {
          c.attempts = Math.max(0, c.attempts - 1);
        }
        diagnostic(c,'partial-runtime',{code:'POSTCONDITION_MISSING'});
        if (c.attempts < 3 && !c.retryTimer) {
          c.retryTimer=setTimeout(()=>{c.retryTimer=null;injectBot(c);},retryDelays[Math.max(0,c.attempts-1)]||2500);
          c.retryTimer.unref?.();
        }
      }
    } catch (e) {
      if(isGoneError(e)){diagnostic(c,'transport-disconnected',{gameAlive:null});drop(c);scheduleReconnect();return;}
      if(!token){
        if(clients.get(c.profileId)===c){
          const curDiag = diagnostics.get(c.profileId);
          if (!curDiag || curDiag.state !== 'ready') {
            diagnostic(c,'probe-unavailable',{code:'DOCUMENT_PROBE_FAILED'});
            c.probeFailCount = (c.probeFailCount || 0) + 1;
            if ((c.probeFailCount || 0) < 6 && !c.retryTimer) {
              const delayMs = isRealSession ? Math.min(20000, 4000 * c.probeFailCount) : 2500;
              c.retryTimer=setTimeout(()=>{c.retryTimer=null;injectBot(c);},delayMs);
              c.retryTimer.unref?.();
            }
          }
        }
        return;
      }
      if(!current(c,token))return;
      let existing=false;
      try{existing=classify(c,await health(c));}catch(_){}
      if(!existing && current(c,token) && c.attempts<3 && !isGoneError(e)) {
        diagnostic(c,'retry-pending',{code:'LOAD_FAILED'});
        c.retryTimer=setTimeout(()=>{c.retryTimer=null;injectBot(c);},retryDelays[Math.max(0,c.attempts-1)]);c.retryTimer.unref?.();
      } else if(!existing)diagnostic(c,'load-failed',{code:isGoneError(e)?'CDP_UNAVAILABLE':'LOAD_FAILED'});
    } finally {
      if(c.injectionInFlight===flight){c.injectionInFlight=null;c.injectionInFlightPromise=null;}
      if(c.pendingLoad&&clients.get(c.profileId)===c&&!stoppedProfiles.has(c.profileId)){c.pendingLoad=false;setTimeout(()=>injectBot(c),0);}
    }
    })();
    c.injectionInFlightPromise = runPromise;
    return runPromise;
  }

  listeners.add(msg => {
    if (!msg.sessionId) return;
    if (msg.method === 'Fetch.requestPaused' && msg.params?.requestId) {
      const requestId = msg.params.requestId;
      const reqUrl = msg.params.request?.url || '';
      const reqMethod = String(msg.params.request?.method || 'GET').toUpperCase();
      const reqHeaders = (msg.params.request && msg.params.request.headers && typeof msg.params.request.headers === 'object')
        ? msg.params.request.headers
        : {};
      const hasRangeHeader = Boolean(reqHeaders.Range || reqHeaders.range);
      if (reqUrl.includes('/__pmhee_recover__')) {
        send('Fetch.fulfillRequest', {
          requestId,
          responseCode: 200,
          responseHeaders: [{ name: 'Content-Type', value: 'text/html; charset=utf-8' }],
          body: Buffer.from('<!doctype html><html><body>ok</body></html>').toString('base64')
        }, msg.sessionId, 3000).catch(() => {});
        return;
      }
      if (reqMethod === 'OPTIONS' && effectiveAssetCache && effectiveAssetCache.isEnabled() && effectiveAssetCache.isCacheableAssetUrl(reqUrl)) {
        send('Fetch.fulfillRequest', {
          requestId,
          responseCode: 204,
          responseHeaders: [
            { name: 'Access-Control-Allow-Origin', value: '*' },
            { name: 'Access-Control-Allow-Methods', value: 'GET, HEAD, OPTIONS' },
            { name: 'Access-Control-Allow-Headers', value: '*' },
            { name: 'Access-Control-Max-Age', value: '86400' }
          ],
          body: ''
        }, msg.sessionId, 3000).catch(() => {
          send('Fetch.continueRequest', { requestId }, msg.sessionId, 3000).catch(() => {});
        });
        return;
      }
      if (!hasRangeHeader && effectiveAssetCache && effectiveAssetCache.isEnabled() && reqMethod === 'GET' && effectiveAssetCache.isCacheableAssetUrl(reqUrl)) {
        effectiveAssetCache.getOrFetch(reqUrl).then(cached => {
          if (cached && cached.ok && cached.base64) {
            return send('Fetch.fulfillRequest', {
              requestId,
              responseCode: 200,
              responseHeaders: [
                { name: 'Content-Type', value: cached.mimeType || 'application/octet-stream' },
                { name: 'Content-Length', value: String(cached.size || 0) },
                { name: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
                { name: 'Access-Control-Allow-Origin', value: '*' },
                { name: 'Access-Control-Allow-Methods', value: 'GET, HEAD, OPTIONS' },
                { name: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
                { name: 'X-Pmhee-Asset-Cache', value: cached.hit ? 'HIT' : 'MISS-DIRECT' }
              ],
              body: cached.base64
            }, msg.sessionId, 12000);
          }
          return send('Fetch.continueRequest', { requestId }, msg.sessionId, 5000);
        }).catch(() => {
          send('Fetch.continueRequest', { requestId }, msg.sessionId, 5000).catch(() => {});
        });
      } else {
        send('Fetch.continueRequest', { requestId }, msg.sessionId, 5000).catch(() => {});
      }
      return;
    }
    const c = Array.from(clients.values()).find(x => x.sessionId === msg.sessionId);
    if (!c) return;
    if(msg.method==='Page.frameNavigated'&&!msg.params?.frame?.parentId){c.generation++;c.documentId=null;c.attempts=0;clearTimeout(c.retryTimer);diagnostic(c,'document-pending',{navigationType:String(msg.params?.type||'navigation').slice(0,40)});}
    if(msg.method==='Page.loadEventFired')injectBot(c);
    if(msg.method==='Inspector.targetCrashed')reloadCrashedClient(c,'Inspector.targetCrashed').catch(()=>{});
  });
  listeners.add(msg => {
    if (msg.method === 'Target.targetDestroyed') {
      for (const c of Array.from(clients.values())) if (c.targetId === msg.params.targetId) {diagnostic(c,'closed');knownTargets.delete(c.profileId);saveKnownTargets();drop(c);}
    }
    if (msg.method === 'Target.targetCrashed') {
      for (const c of Array.from(clients.values())) if (c.targetId === msg.params.targetId) reloadCrashedClient(c, msg.params?.status || 'Target.targetCrashed').catch(() => {});
    }
    if (msg.method === 'Target.detachedFromTarget') {
      for (const c of Array.from(clients.values())) if (c.sessionId === msg.params.sessionId) {diagnostic(c,'transport-disconnected',{gameAlive:null});drop(c);scheduleReconnect();}
    }
  });

  async function ensureClientFramePacerHealed(c) {
    if (!c || !c.sessionId || c.framePacerHealInFlight) return;
    if (!c.cdpAssetCacheSynced) {
      c.cdpAssetCacheSynced = true;
      configureSessionAssetCache(c.sessionId).catch(() => {});
    }
    if (c.framePacerHealedDocId && c.framePacerHealedDocId === c.documentId) return;
    c.framePacerHealInFlight = true;
    try {
      const res = await evaluate(c, `(async () => {
        if (window.__pmFramePacerLeakFixedV3) return { healed: true, docId: String(performance.timeOrigin) };
        window.__pmFramePacerLeakFixed = true;
        window.__pmFramePacerLeakFixedV2 = true;
        window.__pmFramePacerLeakFixedV3 = true;
        try {
          const st1 = document.getElementById('pm-bg-anim-pause');
          if (st1 && !window.__pmZeroRender) st1.textContent = '';
          const st2 = document.getElementById('pelican-bg-anim-pause');
          if (st2 && !window.__pmZeroRender) st2.textContent = '';
        } catch (e) {}
        if (window.__tooltipRescueInterval && !window.__tooltipRescueIntervalThrottled) {
          window.__tooltipRescueIntervalThrottled = true;
          clearInterval(window.__tooltipRescueInterval);
          window.__tooltipRescueInterval = setInterval(() => {
            if (window.__pmZeroRender) return;
            try {
              const ttEl = document.querySelector('.item-tooltip');
              if (ttEl && !document.querySelector(':hover')) {
                const rootEl = document.getElementById('root') || document.body.firstElementChild;
                if (rootEl) {
                  const fk = Object.keys(rootEl).find(k => k.startsWith('__reactContainer') || k.startsWith('__reactFiber'));
                  if (fk) {
                    let q = [rootEl[fk]], visited = 0;
                    while (q.length > 0 && visited < 1200) {
                      let node = q.shift();
                      visited++;
                      if (!node) continue;
                      if (node.type && (node.type.name === 'TooltipLayer' || node.type.name === 'Fx') && node.memoizedState) {
                        let s = node.memoizedState;
                        while (s) {
                          if (s.memoizedState && typeof s.memoizedState === 'object' && 'item' in s.memoizedState && s.queue && s.queue.dispatch) {
                            s.queue.dispatch(null);
                            break;
                          }
                          s = s.next;
                        }
                      }
                      if (node.child) q.push(node.child);
                      if (node.sibling) q.push(node.sibling);
                    }
                  }
                }
              }
            } catch (_) {}
          }, 2500);
        }
        if (!window.__pmPointerWakeInstalled) {
          window.__pmPointerWakeInstalled = true;
          const onPtr = () => {
            window.__pmHovered = true;
            window.__pmLastPointerTs = Date.now();
            try {
              const st1 = document.getElementById('pm-bg-anim-pause');
              if (st1 && !window.__pmZeroRender) st1.textContent = '';
              const st2 = document.getElementById('pelican-bg-anim-pause');
              if (st2 && !window.__pmZeroRender) st2.textContent = '';
            } catch (e) {}
            if (typeof window.__pmSyncActiveState === 'function') {
              try { window.__pmSyncActiveState(); } catch (e) {}
            }
          };
          try {
            document.addEventListener('pointerenter', onPtr, { passive: true, capture: true });
            document.addEventListener('pointermove', onPtr, { passive: true, capture: true });
            document.addEventListener('pointerdown', onPtr, { passive: true, capture: true });
            document.addEventListener('mousedown', onPtr, { passive: true, capture: true });
          } catch (e) {}
        }
        return { healed: true, docId: String(performance.timeOrigin) };
      })()`, 4000);
      if (res && res.healed) {
        c.framePacerHealedDocId = res.docId || c.documentId || 'healed';
      }
    } catch (_) {
    } finally {
      c.framePacerHealInFlight = false;
    }
  }

  async function attach(profileId, targetId, skipIdentityProbe = false, browserContextId = null, fastRediscover = false) {
    if(stoppedProfiles.has(profileId))throw Error('PROFILE_STOPPED');
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true }, undefined, 15000);
    try {
    const initScript = profileInitScript(profileId);
    const hookTimeout = isRealSession ? 8000 : 3500;
    const resInit = await Promise.all([
      send('Page.enable', {}, sessionId, hookTimeout).catch(() => {}),
      configureSessionAssetCache(sessionId),
      send('Page.addScriptToEvaluateOnNewDocument', { source: initScript }, sessionId, hookTimeout).catch(() => null)
    ]);
    const addedInit = resInit[2];
    if (!fastRediscover && !skipIdentityProbe) {
      try {
        const identity = await evaluate({ sessionId }, `(() => { if(!window.__pmProfileId)window.__pmProfileId=${JSON.stringify(profileId)}; try { window.sessionStorage && window.sessionStorage.setItem('__pmProfileId', window.__pmProfileId); } catch (_) {} return window.__pmProfileId; })()`, 4000);
        if (identity && identity !== profileId) throw Error('PROFILE_ID_CONFLICT');
        await evaluate({ sessionId }, initScript, 4000).catch(() => {});
      } catch (probeErr) {
        if (probeErr && probeErr.message === 'PROFILE_ID_CONFLICT') throw probeErr;
      }
    } else if (!fastRediscover) {
      evaluate({ sessionId }, initScript, 4000).catch(() => {});
    }
    if(stoppedProfiles.has(profileId))throw Error('PROFILE_STOPPED');
    const initScriptId = (addedInit && addedInit.identifier) ? addedInit.identifier : null;
    const c = { profileId, targetId, sessionId, browserContextId: browserContextId || null, createdAt: Date.now(), generation:0,documentId:null,attempts:0,injectionInFlight:null,injectionInFlightPromise:null,retryTimer:null,crashReloadCount:0,lastCrashReloadAt:0,crashReloadInFlight:false,stateFailCount:0,firstStateFailAt:0,lastStorageSyncAt:0,initScriptId,initScriptIds:initScriptId?[initScriptId]:[],stateEvalPromise:null,inFlightEvals:new Map(),lastGoodState:null,lastGoodStateAt:0,initialHealthChecked:!fastRediscover,evalInFlightCount:0,evalWaiters:[],evalTimeouts:0,evalCooldownUntil:0,probeFailCount:0 };
    clients.set(profileId, c);
    knownTargets.set(profileId,targetId);saveKnownTargets();
    if (browserContextId) {
      knownProxyContexts.set(targetId, browserContextId);
      saveKnownProxyContexts();
    }
    diagnostic(c,'document-pending');
    return c;
    } catch(e) {await send('Target.detachFromTarget',{sessionId}, undefined, 3000).catch(()=>{});throw e;}
  }

  let lastLevelDbExtractAt = 0;
  async function migrateProfileStorageFromDefaultContext(profileId) {
    if (!storageDir || !profileId) return;
    const existing = loadProfileStorage(profileId);
    const authKey = `pelican_${profileId}__auth_cfg`;
    let hasFullAuth = false;
    if (existing && typeof existing[authKey] === 'string') {
      try {
        const parsed = JSON.parse(existing[authKey]);
        if (parsed && parsed.username && parsed.password) hasFullAuth = true;
      } catch (_) {}
    }
    if (hasFullAuth) return;
    if (!isRealSession || Date.now() - lastLevelDbExtractAt > 60000) {
      lastLevelDbExtractAt = Date.now();
      try {
        const levelDbDir = path.join(userDataDir, 'Default', 'Local Storage', 'leveldb');
        const diskHarvest = extractPelicanStorageFromLevelDb(levelDbDir);
        if (diskHarvest && diskHarvest.byProfile) {
          for (const [pid, map] of Object.entries(diskHarvest.byProfile)) {
            saveProfileStorage(pid, map);
          }
        }
      } catch (_) {}
    }
    const donor = Array.from(clients.values()).find(x => !x.browserContextId && x.sessionId);
    if (!donor) return;
    try {
      const prefix = `pelican_${profileId}__`;
      const entries = await evaluate(donor, `(() => {
        const out = {};
        if (!window.localStorage) return out;
        const pfx = ${JSON.stringify(prefix)};
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && k.startsWith(pfx) && typeof window.localStorage[k] === 'string') out[k] = window.localStorage[k];
        }
        return out;
      })()`, 3000);
      if (entries && typeof entries === 'object' && Object.keys(entries).length > 0) {
        saveProfileStorage(profileId, entries);
      }
    } catch (_) {}
  }

  async function getCustomBrowserContexts() {
    try {
      const r = await send('Target.getBrowserContexts', {}, undefined, 6000);
      return new Set(Array.isArray(r?.browserContextIds) ? r.browserContextIds : []);
    } catch (_) {
      return null;
    }
  }

  // After a Manager restart the browser windows are still there: find them again by __pmProfileId
  function rediscover() {
    if (!rediscovering) rediscovering = rediscoverOnce().finally(() => { rediscovering = null; });
    return rediscovering;
  }
  async function rediscoverOnce() {
    if (!(await browserAlive())) throw Error('CDP not available');
    await connect();
    const { targetInfos } = await send('Target.getTargets', {}, undefined, isRealSession ? 15000 : 30000);
    const customContexts = await getCustomBrowserContexts();
    const surviving=new Set(targetInfos.map(t=>t.targetId));
    let proxyCtxPruned = false;
    for (const tid of Array.from(knownProxyContexts.keys())) {
      if (!surviving.has(tid)) { knownProxyContexts.delete(tid); proxyCtxPruned = true; }
    }
    if (proxyCtxPruned) saveKnownProxyContexts();
    for(const c of Array.from(clients.values())){
      if(customContexts && customContexts.size > 0 && c.browserContextId && !customContexts.has(c.browserContextId) && knownProxyContexts.get(c.targetId) !== c.browserContextId) {
        c.browserContextId = null;
      }
      if(!surviving.has(c.targetId)){diagnostic(c,'closed');knownTargets.delete(c.profileId);saveKnownTargets();drop(c);}
    }
    const allProfiles = loadProfiles() || [];
    if (isRealSession && allProfiles.length > 0) {
      const validPids = new Set(allProfiles.map(p => p.id));
      let pruned = false;
      for (const k of Array.from(knownTargets.keys())) {
        if (!validPids.has(k)) { knownTargets.delete(k); pruned = true; }
      }
      if (pruned) saveKnownTargets();
    }
    const unattachedPages = targetInfos.filter(x => x.type === 'page' && isGameUrl(x.url) && !Array.from(clients.values()).some(c => c.targetId === x.targetId));
    const newlyAttached = [];
    const knownPages = [];
    const unknownPages = [];
    for (const t of unattachedPages) {
      const knownMatch = allProfiles.find(p => !clients.has(p.id) && knownTargets.get(p.id) === t.targetId);
      if (knownMatch) knownPages.push({ t, knownMatch });
      else unknownPages.push(t);
    }
    if (knownPages.length > 0) {
      if (screenProxy && screenProxy.isEnabled() && typeof screenProxy.acquireLeasesForProfiles === 'function') {
        await screenProxy.acquireLeasesForProfiles(knownPages.map(x => x.knownMatch.id)).catch(() => {});
      }
      // Attach in bounded batches of 6 so 30 open Chrome/Edge windows never flood CDP simultaneously
      let kIdx = 0;
      const attachKnownWorker = async () => {
        while (kIdx < knownPages.length) {
          const item = knownPages[kIdx++];
          if (!item) continue;
          const { t, knownMatch } = item;
          try {
            if (stoppedProfiles.has(knownMatch.id)) stoppedProfiles.delete(knownMatch.id);
            const isCustomCtx = isKnownProxyTargetContext(t, customContexts);
            if (screenProxy && (screenProxy.isEnabled() || isCustomCtx)) {
              if (typeof screenProxy.ensureProfileTunnel === 'function') {
                screenProxy.ensureProfileTunnel(knownMatch.id, knownMatch.debugPort).catch(() => {});
              } else if (screenProxy.isEnabled()) {
                screenProxy.acquireForProfile(knownMatch.id, { debugPort: knownMatch.debugPort }).catch(() => {});
              }
            }
            const c = await attach(knownMatch.id, t.targetId, true, isCustomCtx ? t.browserContextId : null, true);
            startProxy(c, knownMatch.debugPort);
            newlyAttached.push({ c, fast: true });
          } catch (_) {}
        }
      };
      const knownConcurrency = Math.min(6, knownPages.length);
      await Promise.all(Array.from({ length: knownConcurrency }, () => attachKnownWorker()));
    }
    const hasUnclaimedProfile = allProfiles.some(p => !clients.has(p.id));
    if (hasUnclaimedProfile && unknownPages.length > 0) {
      let uIdx = 0;
      const probeUnknownWorker = async () => {
        while (uIdx < unknownPages.length) {
          const t = unknownPages[uIdx++];
          if (!t) continue;
          try {
            const knownMatch = null;
            let identified = null;
            let probeFailed = false;
            let pid = null, charName = null, sessionUserId = null, authUser = null, bodyText = '';
            if (!identified) {
              const { sessionId } = await send('Target.attachToTarget', { targetId: t.targetId, flatten: true }, undefined, isRealSession ? 5000 : 10000);
              try {
                const r = await send('Runtime.evaluate', {
                  expression: `(() => {
                    let sUser = null;
                    let lsPid = null;
                    let lsAuthUser = null;
                    try {
                      const tok = typeof sessionStorage !== 'undefined' && sessionStorage.getItem ? sessionStorage.getItem('aetheria.session') : null;
                      if (tok && tok.split('.').length >= 2) {
                        const p = JSON.parse(atob(tok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
                        if (p && typeof p.userId === 'string') sUser = p.userId.trim();
                      }
                    } catch (_) {}
                    try {
                      if (typeof localStorage !== 'undefined') {
                        const foundPids = new Set();
                        for (let i = 0; i < localStorage.length; i++) {
                          const k = localStorage.key(i);
                          if (!k) continue;
                          const m = k.match(/^pelican_((?:profile|af)_[a-zA-Z0-9_]+)__/);
                          if (m && m[1]) {
                            foundPids.add(m[1]);
                            if (!lsAuthUser && k.endsWith('__auth_cfg')) {
                              try {
                                const parsed = JSON.parse(localStorage.getItem(k) || '{}');
                                if (parsed && typeof parsed.username === 'string' && parsed.username.trim()) lsAuthUser = parsed.username.trim();
                              } catch (_) {}
                            }
                            if (!lsAuthUser && k.indexOf('__nc__nightcamp.online.acct:') !== -1) {
                              try {
                                const parsed = JSON.parse(localStorage.getItem(k) || '{}');
                                const u = parsed && (parsed.email || parsed.username || parsed.userId);
                                if (typeof u === 'string' && u.trim()) lsAuthUser = u.trim();
                              } catch (_) {}
                            }
                          }
                        }
                        if (foundPids.size === 1) lsPid = Array.from(foundPids)[0];
                      }
                    } catch (_) {}
                    let liveChar = null;
                    try {
                      if (typeof window.__getClientLiveState === 'function') {
                        const ls = window.__getClientLiveState();
                        if (ls && typeof ls.charName === 'string' && ls.charName.trim()) liveChar = ls.charName.trim();
                      }
                    } catch (_) {}
                    if (!liveChar) {
                      try {
                        liveChar = (window.NC && window.NC.game && window.NC.game.player && window.NC.game.player.name)
                          || (typeof window.getLiveCharacterData === 'function' && window.getLiveCharacterData() && window.getLiveCharacterData().name)
                          || window.__charName
                          || null;
                      } catch (_) {}
                    }
                    return {
                      pid: window.__pmProfileId || (typeof sessionStorage !== 'undefined' && sessionStorage.getItem && sessionStorage.getItem('__pmProfileId')) || lsPid || null,
                      charName: liveChar,
                      sessionUserId: sUser,
                      authUser: (window.__authConfig && typeof window.__authConfig.username === 'string' && window.__authConfig.username.trim()) || lsAuthUser || null,
                      bodyText: (typeof document !== 'undefined' && document.body && typeof document.body.innerText === 'string') ? document.body.innerText.slice(0, 1500) : ''
                    };
                  })()`,
                  returnByValue: true
                }, sessionId, isRealSession ? 3500 : 6000);
                if(r.exceptionDetails)throw Error('PROFILE_PROBE_FAILED');
                crashedTargetFailCount.delete(t.targetId);
                const val = r && r.result && r.result.value;
                if (val && typeof val === 'object') {
                  pid = val.pid || null;
                  charName = val.charName || null;
                  sessionUserId = val.sessionUserId || null;
                  authUser = val.authUser || null;
                  bodyText = String(val.bodyText || '');
                } else if (typeof val === 'string') {
                  pid = val;
                }
              } catch (_) {
                probeFailed = true;
              } finally {
                await send('Target.detachFromTarget', { sessionId }).catch(() => {});
              }
              if (pid && clients.has(pid)) {
                continue;
              }
              identified = pid || allProfiles.find(p => !clients.has(p.id) && knownTargets.get(p.id) === t.targetId)?.id || null;
            }
            if (!identified) {
              const unclaimed = allProfiles.filter(p => !clients.has(p.id) && (!knownTargets.get(p.id) || !surviving.has(knownTargets.get(p.id))));
              const effectiveUser = String(sessionUserId || authUser || '').trim().toLowerCase();
              if (effectiveUser) {
                const allByUser = allProfiles.filter(p => String(p.account || '').trim().toLowerCase() === effectiveUser);
                const byUser = unclaimed.filter(p => String(p.account || '').trim().toLowerCase() === effectiveUser);
                if (byUser.length === 1) {
                  identified = byUser[0].id;
                } else if (allByUser.length > 0) {
                  continue;
                }
              }
              if (!identified && (charName || bodyText)) {
                const tokens = new Set(bodyText.split(/[\r\n\s·•]+/).filter(Boolean));
                const matchesChar = p => {
                  const cn = String(p.lastCharName || '').trim();
                  if (!cn) return false;
                  return charName === cn || tokens.has(cn) || bodyText.includes(cn) || bodyText.includes('เข้าเกมด้วย ' + cn);
                };
                const allByChar = allProfiles.filter(matchesChar);
                const byChar = unclaimed.filter(matchesChar);
                if (byChar.length === 1) {
                  identified = byChar[0].id;
                } else if (allByChar.length > 0) {
                  continue;
                }
              }
              if (!identified && allProfiles.length <= 1 && unattachedPages.length === 1 && unclaimed.length === 1) {
                identified = unclaimed[0].id;
              }
            }
            if (identified && stoppedProfiles.has(identified) && (knownMatch || sessionUserId || charName || pid)) {
              stoppedProfiles.delete(identified);
            }
            const profile = identified && !stoppedProfiles.has(identified) && allProfiles.find(p => p.id === identified);
            const isCustomCtx = isKnownProxyTargetContext(t, customContexts);
            if (profile && !clients.has(profile.id)) {
              if (screenProxy && (screenProxy.isEnabled() || isCustomCtx)) {
                const pTask = screenProxy.isEnabled()
                  ? screenProxy.acquireForProfile(profile.id, { debugPort: profile.debugPort }).catch(() => {})
                  : (typeof screenProxy.ensureProfileTunnel === 'function' ? screenProxy.ensureProfileTunnel(profile.id, profile.debugPort).catch(() => {}) : Promise.resolve());
                if (!knownMatch) await pTask;
              }
              const c = await attach(profile.id, t.targetId, Boolean(knownMatch || probeFailed), isCustomCtx ? t.browserContextId : null, Boolean(knownMatch));
              startProxy(c, profile.debugPort);
              newlyAttached.push({ c, fast: Boolean(knownMatch) });
            }
          } catch (e) {}
        }
      };
      const unknownConcurrency = Math.min(5, unknownPages.length);
      await Promise.all(Array.from({ length: unknownConcurrency }, () => probeUnknownWorker()));
    }
    lastRediscoverSuccessAt = Date.now();
    // Phase 2: initialize session hooks & bot health in small batches AFTER all proxy ports are open
    const toCheck = [];
    for (const item of newlyAttached) {
      toCheck.push(item);
    }
    for (const c of clients.values()) {
      if (newlyAttached.some(x => x.c === c)) continue;
      const diag = diagnostics.get(c.profileId);
      if (!isRealSession || !diag || diag.state !== 'ready') {
        toCheck.push({ c, fast: false });
      }
    }
    if (toCheck.length > 0) {
      if (!isRealSession) {
        let idx = 0;
        const worker = async () => {
          while (idx < toCheck.length) {
            const cur = toCheck[idx++];
            if (!cur || !cur.c || clients.get(cur.c.profileId) !== cur.c) continue;
            try {
              if (cur.fast) {
                await Promise.all([
                  send('Page.enable', {}, cur.c.sessionId, 2500).catch(() => {}),
                  configureSessionAssetCache(cur.c.sessionId)
                ]);
              }
              await injectBot(cur.c).catch(() => {});
            } finally {
              cur.c.initialHealthChecked = true;
            }
          }
        };
        const concurrency = Math.min(3, toCheck.length);
        Promise.all(Array.from({ length: concurrency }, () => worker())).catch(() => {});
      } else if (!phase2Running) {
        phase2Running = true;
        (async () => {
          const needsInject = [];
          const slowTabs = [];
          const readyTabs = [];
          try {
            // Step 2A: Fast health sweep across all tabs BEFORE any 1.5 MB bot injection runs
            let idx = 0;
            const healthWorker = async () => {
              while (idx < toCheck.length) {
                const cur = toCheck[idx++];
                if (!cur || !cur.c || clients.get(cur.c.profileId) !== cur.c || stoppedProfiles.has(cur.c.profileId)) continue;
                try {
                  const h = await health(cur.c, 6000);
                  if (h && h.profileId && h.profileId !== cur.c.profileId) {
                    if (knownTargets.get(cur.c.profileId) === cur.c.targetId) {
                      knownTargets.delete(cur.c.profileId);
                      saveKnownTargets();
                    }
                    drop(cur.c);
                    continue;
                  }
                  if (h && h.profileId === cur.c.profileId && h.version && h.liveHook && classify(cur.c, h)) {
                    cur.c.initialHealthChecked = true;
                    readyTabs.push(cur.c);
                  } else {
                    needsInject.push(cur.c);
                  }
                } catch (_) {
                  slowTabs.push(cur.c);
                }
              }
            };
            const sweepConcurrency = Math.min(8, toCheck.length);
            await Promise.all(Array.from({ length: sweepConcurrency }, () => healthWorker()));

            // Step 2B: Sequential heavy bot injection (1 tab at a time), responsive tabs first then slow tabs
            for (const c of needsInject.concat(slowTabs)) {
              if (!c || clients.get(c.profileId) !== c || stoppedProfiles.has(c.profileId)) continue;
              try {
                await injectBot(c).catch(() => {});
              } finally {
                c.initialHealthChecked = true;
              }
              await new Promise(r => setTimeout(r, 250));
            }

            // Step 2C: Gently ensure Page.enable + initScriptId on ready tabs one at a time in background
            for (const c of readyTabs) {
              if (!c || clients.get(c.profileId) !== c || stoppedProfiles.has(c.profileId)) continue;
              if (!c.initScriptId) {
                await ensureSessionHooks(c.sessionId, c.profileId, c).catch(() => {});
                await new Promise(r => setTimeout(r, 350));
              }
            }
          } finally {
            for (const cur of toCheck) {
              if (cur && cur.c) cur.c.initialHealthChecked = true;
            }
            phase2Running = false;
          }
        })().catch(() => { phase2Running = false; });
      }
    }
  }

  let phase2Running = false;

  // ---------- per-profile HTTP API (same as the Electron loader's) ----------
  const MAX_CONCURRENT_CDP_EVALS = 24;
  let activeCdpEvals = 0;
  const cdpEvalWaiters = [];
  function acquireCdpEvalSlot(timeoutMs = 10000) {
    if (!isRealSession) return Promise.resolve(() => {});
    return new Promise((resolve, reject) => {
      let waiterEntry = null;
      let queueTimer = null;
      const grant = () => {
        if (queueTimer) { clearTimeout(queueTimer); queueTimer = null; }
        activeCdpEvals++;
        let released = false;
        const holdLimit = Math.min(Math.max((Number(timeoutMs) || 10000) + 1000, 6000), 28000);
        let safetyTimer = setTimeout(() => release(), holdLimit);
        safetyTimer.unref?.();
        function release() {
          if (released) return;
          released = true;
          clearTimeout(safetyTimer);
          activeCdpEvals = Math.max(0, activeCdpEvals - 1);
          while (cdpEvalWaiters.length > 0 && activeCdpEvals < MAX_CONCURRENT_CDP_EVALS) {
            const next = cdpEvalWaiters.shift();
            if (next && !next.cancelled) {
              next.grant();
              break;
            }
          }
        }
        resolve(release);
      };
      if (activeCdpEvals < MAX_CONCURRENT_CDP_EVALS) {
        grant();
      } else {
        waiterEntry = { grant, cancelled: false };
        cdpEvalWaiters.push(waiterEntry);
        const maxQueueWait = Math.min(Math.max(Number(timeoutMs) || 8000, 3000), 8000);
        queueTimer = setTimeout(() => {
          queueTimer = null;
          if (waiterEntry && !waiterEntry.cancelled) {
            waiterEntry.cancelled = true;
            const idx = cdpEvalWaiters.indexOf(waiterEntry);
            if (idx !== -1) cdpEvalWaiters.splice(idx, 1);
            reject(new Error('CDP eval queue busy'));
          }
        }, maxQueueWait);
        queueTimer.unref?.();
      }
    });
  }

  function acquireClientEvalLock(c, timeoutMs = 10000) {
    if (!isRealSession || !c || !c.profileId) return Promise.resolve(() => {});
    if (!c.evalWaiters) c.evalWaiters = [];
    if ((c.evalInFlightCount || 0) >= 1 && c.evalWaiters.length >= 10) {
      return Promise.reject(new Error('CDP client busy'));
    }
    return new Promise((resolve, reject) => {
      let waiterEntry = null;
      let waitTimer = null;
      const grant = () => {
        if (waitTimer) { clearTimeout(waitTimer); waitTimer = null; }
        c.evalInFlightCount = (c.evalInFlightCount || 0) + 1;
        let released = false;
        function release() {
          if (released) return;
          released = true;
          c.evalInFlightCount = Math.max(0, (c.evalInFlightCount || 1) - 1);
          while (c.evalWaiters && c.evalWaiters.length > 0 && c.evalInFlightCount < 1) {
            const next = c.evalWaiters.shift();
            if (next && !next.cancelled) {
              next.grant();
              break;
            }
          }
        }
        resolve(release);
      };
      if ((c.evalInFlightCount || 0) < 1) {
        grant();
      } else {
        waiterEntry = { grant, cancelled: false };
        c.evalWaiters.push(waiterEntry);
        const maxWait = Math.min(Math.max(Number(timeoutMs) || 8000, 3000), 8000);
        waitTimer = setTimeout(() => {
          waitTimer = null;
          if (waiterEntry && !waiterEntry.cancelled) {
            waiterEntry.cancelled = true;
            const idx = c.evalWaiters.indexOf(waiterEntry);
            if (idx !== -1) c.evalWaiters.splice(idx, 1);
            reject(new Error('CDP client queue timeout'));
          }
        }, maxWait);
        waitTimer.unref?.();
      }
    });
  }

  async function runSingleClientEval(c, code, timeoutMs, isInternal = false) {
    const releaseClient = isInternal ? () => {} : await acquireClientEvalLock(c, timeoutMs);
    let releaseGlobal = null;
    try {
      releaseGlobal = isInternal ? () => {} : await acquireCdpEvalSlot(timeoutMs);
      const r = await send('Runtime.evaluate', { expression: code, awaitPromise: true, returnByValue: true }, c.sessionId, timeoutMs);
      if (isRealSession && c && c.profileId) {
        c.evalTimeouts = 0;
        c.evalCooldownUntil = 0;
        c.probeFailCount = 0;
      }
      if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text || 'Script failed');
      return r.result ? r.result.value : undefined;
    } catch (err) {
      if (!isInternal && isRealSession && c && c.profileId && /CDP timeout:\s*Runtime\.evaluate/i.test(String(err && err.message || err))) {
        c.evalTimeouts = (c.evalTimeouts || 0) + 1;
        c.evalCooldownUntil = Date.now() + Math.min(8000, 2500 * c.evalTimeouts);
      }
      throw err;
    } finally {
      if (releaseGlobal) releaseGlobal();
      releaseClient();
    }
  }

  async function evaluate(c, code, timeoutMs = 20000, isInternal = false) {
    const reqMs = Number(timeoutMs) || 10000;
    const effectiveTimeout = isRealSession
      ? (isInternal || reqMs > 12000
          ? Math.min(Math.max(reqMs, 4000), 300000)
          : Math.min(reqMs, code && code.length > 20000 ? 25000 : 12000))
      : timeoutMs;
    if (isRealSession && !isInternal && c && c.inFlightEvals && typeof code === 'string' && code.length < 4096) {
      const existing = c.inFlightEvals.get(code);
      if (existing) return existing;
      const p = runSingleClientEval(c, code, effectiveTimeout, false).finally(() => {
        c.inFlightEvals.delete(code);
      });
      c.inFlightEvals.set(code, p);
      return p;
    }
    return runSingleClientEval(c, code, effectiveTimeout, isInternal);
  }
  // ---------- per-client Outlook (@outlook.com) account signup & 6-digit OTP extraction ----------
  function ensureOutlookFlowState(c) {
    if (!c.outlookFlow) {
      c.outlookFlow = {
        targetId: null,
        sessionId: null,
        username: '',
        password: '',
        firstName: 'Kittipong',
        lastName: 'Suwanrat',
        birthDay: 15,
        birthMonth: 6,
        birthYear: 1998,
        state: 'idle',
        message: '',
        otpCode: '',
        otpPollCount: 0,
        blockRetryCount: 0,
        inMainTab: false,
        usedOtpCodes: new Set(),
        readyUsers: new Set(),
        initialActivated: false,
        activatedForCaptcha: false,
        stepInFlight: false
      };
    }
    return c.outlookFlow;
  }

  async function cdpMouseClick(sessionId, x, y, w = 24, h = 16) {
    const baseW = Math.max(8, Number(w) || 24);
    const baseH = Math.max(8, Number(h) || 16);
    const jitterX = Math.round((Math.random() - 0.5) * Math.min(18, baseW * 0.25));
    const jitterY = Math.round((Math.random() - 0.5) * Math.min(10, baseH * 0.25));
    const px = Math.round((Number(x) || 0) + jitterX);
    const py = Math.round((Number(y) || 0) + jitterY);
    if (px <= 0 || py <= 0) return false;
    await send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: px,
      y: py,
      button: 'none'
    }, sessionId, 3000).catch(() => {});
    await new Promise(r => setTimeout(r, 50));
    await send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: px,
      y: py,
      button: 'left',
      clickCount: 1
    }, sessionId, 3000).catch(() => {});
    await new Promise(r => setTimeout(r, 45));
    await send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: px,
      y: py,
      button: 'left',
      clickCount: 1
    }, sessionId, 3000).catch(() => {});
    return true;
  }

  async function cdpScrollAndGetRect(sessionId, selector) {
    const res = await send('Runtime.evaluate', {
      expression: `(() => {
        const qa = s => Array.from(document.querySelectorAll(s));
        const isVis = el => {
          if (!el || el.hidden || el.disabled) return false;
          const st = window.getComputedStyle(el);
          if (!st || st.display === 'none' || st.visibility === 'hidden' || st.opacity === '0') return false;
          const r = el.getBoundingClientRect();
          return r.width > 4 && r.height > 4;
        };
        const el = qa(${JSON.stringify(selector)}).find(isVis);
        if (!el) return null;
        let r = el.getBoundingClientRect();
        if (r.top < 16 || r.bottom > (window.innerHeight - 16)) {
          try { el.scrollIntoView({ block: 'center', inline: 'nearest' }); } catch (_) {}
          r = el.getBoundingClientRect();
        }
        return {
          x: Math.round(r.left + r.width / 2),
          y: Math.round(r.top + r.height / 2),
          w: Math.round(r.width),
          h: Math.round(r.height),
          valLen: String(el.value || '').length
        };
      })()`,
      returnByValue: true
    }, sessionId, 4000).catch(() => null);
    return res?.result?.value || null;
  }

  async function cdpClickSelector(sessionId, selector) {
    const rect = await cdpScrollAndGetRect(sessionId, selector);
    if (!rect || rect.x <= 0 || rect.y <= 0) return false;
    await new Promise(r => setTimeout(r, 80));
    return await cdpMouseClick(sessionId, rect.x, rect.y, rect.w, rect.h);
  }

  async function cdpTypeIntoSelector(sessionId, selector, text) {
    const rect = await cdpScrollAndGetRect(sessionId, selector);
    if (!rect || rect.x <= 0 || rect.y <= 0) return false;
    await cdpMouseClick(sessionId, rect.x, rect.y, rect.w, rect.h);
    await new Promise(r => setTimeout(r, 80));
    // Ensure the actual <input> holds focus and select any existing text inside it
    const focusInfo = await send('Runtime.evaluate', {
      expression: `(() => {
        const qa = s => Array.from(document.querySelectorAll(s));
        const isVis = el => {
          if (!el || el.hidden || el.disabled) return false;
          const st = window.getComputedStyle(el);
          if (!st || st.display === 'none' || st.visibility === 'hidden' || st.opacity === '0') return false;
          const r = el.getBoundingClientRect();
          return r.width > 4 && r.height > 4;
        };
        const el = qa(${JSON.stringify(selector)}).find(isVis);
        if (!el) return { valLen: 0 };
        if (document.activeElement !== el) {
          try { el.focus(); } catch (_) {}
        }
        const len = String(el.value || '').length;
        if (len > 0) {
          try {
            if (typeof el.select === 'function') el.select();
            else if (typeof el.setSelectionRange === 'function') el.setSelectionRange(0, len);
          } catch (_) {}
        }
        return { valLen: len };
      })()`,
      returnByValue: true
    }, sessionId, 2500).catch(() => null);
    await new Promise(r => setTimeout(r, 50));

    if ((Number(focusInfo?.result?.value?.valLen ?? rect.valLen) || 0) > 0) {
      await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 8, nativeVirtualKeyCode: 8, key: 'Backspace', code: 'Backspace' }, sessionId, 2000).catch(() => {});
      await send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 8, nativeVirtualKeyCode: 8, key: 'Backspace', code: 'Backspace' }, sessionId, 2000).catch(() => {});
      await new Promise(r => setTimeout(r, 55));
    }

    const str = String(text || '');
    for (const ch of str) {
      let vk = ch.toUpperCase().charCodeAt(0) || 65;
      let code = 'KeyA';
      if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z')) {
        vk = ch.toUpperCase().charCodeAt(0);
        code = 'Key' + ch.toUpperCase();
      } else if (ch >= '0' && ch <= '9') {
        vk = ch.charCodeAt(0);
        code = 'Digit' + ch;
      } else if (ch === '_' || ch === '-') {
        vk = 189;
        code = 'Minus';
      } else if (ch === '.') {
        vk = 190;
        code = 'Period';
      } else if (ch === '!') {
        vk = 49;
        code = 'Digit1';
      } else if (ch === '@') {
        vk = 50;
        code = 'Digit2';
      } else if (ch === '#') {
        vk = 51;
        code = 'Digit3';
      } else if (ch === '$') {
        vk = 52;
        code = 'Digit4';
      }
      await send('Input.dispatchKeyEvent', {
        type: 'keyDown',
        windowsVirtualKeyCode: vk,
        nativeVirtualKeyCode: vk,
        code,
        text: ch,
        unmodifiedText: ch,
        key: ch
      }, sessionId, 2000).catch(() => {});
      await new Promise(r => setTimeout(r, 20 + Math.floor(Math.random() * 20)));
      await send('Input.dispatchKeyEvent', {
        type: 'keyUp',
        windowsVirtualKeyCode: vk,
        nativeVirtualKeyCode: vk,
        code,
        key: ch
      }, sessionId, 2000).catch(() => {});
      await new Promise(r => setTimeout(r, 35 + Math.floor(Math.random() * 30)));
    }
    await new Promise(r => setTimeout(r, 320));
    return true;
  }

  async function clearMicrosoftCookiesInSession(sessionId) {
    try {
      const res = await send('Network.getAllCookies', {}, sessionId, 4000).catch(() => null);
      const cookies = Array.isArray(res?.cookies) ? res.cookies : [];
      for (const ck of cookies) {
        const dom = String(ck?.domain || '').toLowerCase();
        if (/live\.com|live\.net|passport\.net|microsoft\.com|microsoftonline\.com|msauth\.net|msftauth\.net|arkoselabs\.com|funcaptcha\.com|hsprotect\.net/i.test(dom)) {
          await send('Network.deleteCookies', {
            name: ck.name,
            domain: ck.domain,
            path: ck.path || '/',
            ...(ck.partitionKey ? { partitionKey: ck.partitionKey } : {})
          }, sessionId, 2000).catch(() => {});
        }
      }
      const originsToClear = [
        'https://signup.live.com',
        'https://fpt.live.com',
        'https://login.live.com',
        'https://account.live.com',
        'https://iframe.hsprotect.net',
        'https://client.hsprotect.net',
        'https://collector-pxzc5j78di.hsprotect.net',
        'https://df.cfp.microsoft.com',
        'https://fpt.df.microsoft.com'
      ];
      const partitionedStorageKeys = [
        'https://signup.live.com/',
        'https://fpt.live.com/',
        'https://login.live.com/',
        'https://account.live.com/',
        'https://iframe.hsprotect.net/^0https://live.com',
        'https://client.hsprotect.net/^0https://live.com',
        'https://collector-pxzc5j78di.hsprotect.net/^0https://live.com',
        'https://df.cfp.microsoft.com/^0https://live.com',
        'https://fpt.df.microsoft.com/^0https://live.com',
        'https://fpt.live.com/^0https://live.com'
      ];
      await Promise.all([
        ...originsToClear.map(origin =>
          send('Storage.clearDataForOrigin', { origin, storageTypes: 'all' }, sessionId, 2000).catch(() => {})
        ),
        ...partitionedStorageKeys.map(storageKey =>
          send('Storage.clearDataForStorageKey', { storageKey, storageTypes: 'all' }, sessionId, 2000).catch(() => {})
        )
      ]);
    } catch (_) {}
  }

  async function ensureOutlookTab(c, initialUrl = 'https://signup.live.com/signup?lic=1&mkt=th-TH') {
    const flow = ensureOutlookFlowState(c);
    flow.inMainTab = false;

    // 1. Always keep Tab 1 (`c.targetId` / `c.sessionId`) on the Nightcamp game URL!
    try {
      const mainLoc = await send('Runtime.evaluate', {
        expression: `String(location.href || '')`,
        returnByValue: true
      }, c.sessionId, 3500).catch(() => null);
      const mainHref = String(mainLoc?.result?.value || '');
      if (mainHref && !isGameUrl(mainHref) && mainHref !== 'about:blank') {
        await ensureSessionHooks(c.sessionId, c.profileId, c).catch(() => {});
        await send('Page.navigate', { url: gameUrl }, c.sessionId, 12000).catch(() => {});
        setTimeout(() => { injectBot(c).catch(() => {}); }, 2000).unref?.();
        await new Promise(r => setTimeout(r, 450));
      }
    } catch (_) {}

    // 2. Check if our companion Tab 2 (`flow.targetId`) is already open
    const { targetInfos: beforeInfos } = await send('Target.getTargets', {}, undefined, 6000);
    if (flow.targetId && flow.sessionId) {
      if (Array.isArray(beforeInfos) && beforeInfos.some(t => t.targetId === flow.targetId && t.targetId !== c.targetId)) {
        return { targetId: flow.targetId, sessionId: flow.sessionId };
      }
      flow.targetId = null;
      flow.sessionId = null;
    }

    // Check if an unattached Outlook/Live tab already exists in this profile's BrowserContext (ignore support.microsoft.com)
    const claimedGameTargets = new Set([...Array.from(clients.values()).map(x => x.targetId), ...Array.from(knownTargets.values())]);
    const existingCompanion = (beforeInfos || []).find(t =>
      t &&
      t.type === 'page' &&
      t.targetId !== c.targetId &&
      !claimedGameTargets.has(t.targetId) &&
      !/support\.microsoft\.com/i.test(t.url || '') &&
      (c.browserContextId ? t.browserContextId === c.browserContextId : /signup\.live\.com|login\.live\.com|outlook\.live\.com|account\.microsoft\.com/i.test(t.url || ''))
    );
    if (existingCompanion) {
      const { sessionId } = await send('Target.attachToTarget', { targetId: existingCompanion.targetId, flatten: true }, undefined, 6000);
      await send('Page.enable', {}, sessionId, 4000).catch(() => {});
      flow.targetId = existingCompanion.targetId;
      flow.sessionId = sessionId;
      return { targetId: flow.targetId, sessionId: flow.sessionId };
    }

    // 3. Open Tab 2 inside the EXACT SAME browser window by calling `window.open(initialUrl, '_blank')` from Tab 1 (`c.sessionId`) with `userGesture: true`!
    const beforeIds = new Set((beforeInfos || []).map(t => t.targetId));
    await send('Runtime.evaluate', {
      expression: `(() => { try { window.open(${JSON.stringify(initialUrl)}, '_blank'); return true; } catch (_) { return false; } })()`,
      userGesture: true,
      returnByValue: true
    }, c.sessionId, 5000).catch(() => null);

    let newTarget = null;
    for (let attempt = 0; attempt < 10; attempt++) {
      await new Promise(r => setTimeout(r, 250));
      const { targetInfos: afterInfos } = await send('Target.getTargets', {}, undefined, 5000).catch(() => ({ targetInfos: [] }));
      newTarget = (afterInfos || []).find(t =>
        t &&
        t.type === 'page' &&
        t.targetId !== c.targetId &&
        !beforeIds.has(t.targetId) &&
        (!c.browserContextId || t.browserContextId === c.browserContextId)
      );
      if (newTarget) break;
    }

    let targetId = newTarget?.targetId || null;
    if (!targetId) {
      const createParams = c.browserContextId
        ? { url: initialUrl, browserContextId: c.browserContextId }
        : { url: initialUrl };
      const created = await send('Target.createTarget', createParams, undefined, 10000);
      targetId = created.targetId;
    }

    // Attach to Tab 2 WITHOUT injecting profileInitScript or fake UA overrides so Microsoft sees a 100% authentic native Chrome tab!
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true }, undefined, 8000);
    await send('Page.enable', {}, sessionId, 4000).catch(() => {});

    flow.targetId = targetId;
    flow.sessionId = sessionId;
    return { targetId, sessionId };
  }

  async function closeOutlookTab(c) {
    if (!c || !c.outlookFlow) return;
    const oldTargetId = c.outlookFlow.targetId;
    c.outlookFlow.targetId = null;
    c.outlookFlow.sessionId = null;
    c.outlookFlow.inMainTab = false;
    c.outlookFlow.initialActivated = false;
    c.outlookFlow.activatedForCaptcha = false;
    if (oldTargetId && oldTargetId !== c.targetId) {
      await send('Target.closeTarget', { targetId: oldTargetId }, undefined, 4000).catch(() => {});
    }
    if (c.targetId) {
      await send('Target.activateTarget', { targetId: c.targetId }, undefined, 3000).catch(() => {});
    }
  }

  // 100% READ-ONLY DOM inspection script for Tab 2 (zero DOM mutation, zero synthetic clicks, zero globals injected into signup.live.com!)
  function buildOutlookInspectScript(flow) {
    const payload = {
      username: String(flow.username || '').trim(),
      localPart: String(flow.username || '').trim().split('@')[0],
      password: String(flow.password || ''),
      firstName: String(flow.firstName || 'Kittipong'),
      lastName: String(flow.lastName || 'Suwanrat'),
      birthDay: Number(flow.birthDay) || 15,
      birthMonth: Number(flow.birthMonth) || 6,
      birthYear: Number(flow.birthYear) || 1998
    };
    return `(() => {
      const cfg = ${JSON.stringify(payload)};
      const q = (s, r) => (r || document).querySelector(s);
      const qa = (s, r) => Array.from((r || document).querySelectorAll(s));
      const isVisible = el => {
        if (!el || el.hidden || el.disabled) return false;
        const st = window.getComputedStyle(el);
        if (!st || st.display === 'none' || st.visibility === 'hidden' || st.opacity === '0') return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 4 && rect.height > 4;
      };
      const rectOf = el => {
        if (!el || !isVisible(el)) return null;
        const r = el.getBoundingClientRect();
        return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
      };
      try { window.getSelection?.()?.removeAllRanges?.(); } catch (_) {}

      const host = String(location.hostname || '').toLowerCase();
      const path = String(location.pathname || '').toLowerCase();
      const bodyText = String(document.body?.innerText || '');
      const titleText = String(document.title || '');

      // 1. Check if account creation finished and reached Microsoft Account / Outlook Mail / Privacy Notice
      if (
        host === 'account.microsoft.com' ||
        host === 'm365.cloud.microsoft' ||
        host === 'www.office.com' ||
        ((host === 'outlook.live.com' || host === 'outlook.office.com') && (path.startsWith('/mail') || q('#O365_AppName, #MainModule, [data-app-section="Mail"]')))
      ) {
        return { step: 'ready', message: '✅ สมัครเมล Outlook (' + cfg.username + ') สำเร็จแล้ว กำลังสลับกลับแท็บเกม...' };
      }
      if (host === 'privacynotice.account.microsoft.com') {
        return { step: 'ready', clickSelector: '#StickyFooter button, button[type="submit"], [data-testid="primaryButton"]', message: '✅ สมัครเมล Outlook (' + cfg.username + ') สำเร็จแล้ว!' };
      }

      // 2. Check if Microsoft signup token expired ("เราพบปัญหา" / expiredToken) or blocked
      if (/เราพบปัญหา|We encountered a problem|expiredToken|continuation_token/i.test(titleText + ' ' + bodyText)) {
        return { step: 'token_expired', message: '🔄 โทเค็นหน้าสมัครหมดอายุ (เกิน 5 นาที) -> กำลังรีเฟรชเริ่มกรอกใหม่อัตโนมัติ...' };
      }
      if (/การสร้างบัญชีถูกบล็อก|เราตรวจพบกิจกรรมที่ผิดปกติ|Account creation has been blocked|We've detected some unusual activity/i.test(titleText + ' ' + bodyText)) {
        return { step: 'account_blocked', message: '⚠️ Microsoft บล็อกคำขอสมัครเมลรอบนี้ กำลังล้างคุกกี้และลองใหม่...' };
      }

      const nextSel = '#iSignupAction, #idSIButton9, #acceptButton, [data-testid="primaryButton"], button[type="submit"]';

      // 3. Check Post-CAPTCHA interrupts: Passkey skip & "Stay signed in?" (KMSI)
      if (/fido\\/create|interrupt\\/passkey/i.test(location.href) || /passkey|Windows Hello|ลายนิ้วมือ|สแกนใบหน้า/i.test(bodyText)) {
        const skipBtn = qa('#iCancel, [data-testid="secondaryButton"], button, a').find(el => isVisible(el) && /Skip for now|Cancel|Not now|ข้ามไปก่อน|ยกเลิก|ไม่ใช่ตอนนี้/i.test(el.textContent || el.value || ''));
        if (skipBtn) {
          return { step: 'click_selector', selector: '#iCancel, [data-testid="secondaryButton"]', clickRect: rectOf(skipBtn), message: '⏭️ ข้ามหน้าตั้งค่า Passkey อัตโนมัติ...' };
        }
      }
      if (q('#kmsiTitle, [data-testid="kmsiVideo"]') || /Stay signed in\\?|ลงชื่อเข้าใช้ค้างไว้หรือไม่/i.test(bodyText)) {
        return { step: 'click_selector', selector: nextSel, message: '✅ กดจำการเข้าสู่ระบบ Outlook ค้างไว้ใน Client...' };
      }

      // Identify visible form inputs
      const monthSelEl = '#BirthMonth, select[name="BirthMonth"], #BirthMonthDropdown, [name="BirthMonth"][role="combobox"], [aria-label*="Month" i][role="combobox"], [aria-label*="เดือน" i][role="combobox"]';
      const daySelEl = '#BirthDay, select[name="BirthDay"], #BirthDayDropdown, [name="BirthDay"][role="combobox"], [aria-label*="Day" i][role="combobox"], [aria-label*="วัน" i][role="combobox"]';
      const yearSelEl = '#BirthYear, input[name="BirthYear"], select[name="BirthYear"], input[aria-label*="Year" i], input[aria-label*="ปี" i], input[placeholder*="Year" i], input[placeholder*="ปี" i], input[type="number"]';

      const monthSel = qa(monthSelEl).find(isVisible);
      const daySel = qa(daySelEl).find(isVisible);
      const yearInp = qa(yearSelEl).find(isVisible);

      const firstSelEl = '#FirstName, #firstNameInput, input[name="FirstName"], input[name="firstName"]';
      const lastSelEl = '#LastName, #lastNameInput, input[name="LastName"], input[name="lastName"]';
      const firstInp = qa(firstSelEl).find(isVisible);
      const lastInp = qa(lastSelEl).find(isVisible);

      const passSelEl = '#PasswordInput, #Password, input[name="Password"], input[type="password"]';
      const emailSelEl = '#MemberName, #usernameInput, input[name="MemberName"], input[type="email"], input[name="loginfmt"]';
      const passInp = qa(passSelEl).find(isVisible);
      const emailInp = qa(emailSelEl).find(isVisible);

      // 4. Step D: Birthdate (Day / Month / Year)
      if ((monthSel || daySel) && yearInp) {
        const isDropdownChosen = (el, numVal) => {
          if (!el) return true;
          if (el.tagName === 'SELECT') return String(el.value) === String(numVal) || Number(el.value) === numVal;
          const curTxt = String(el.textContent || el.value || '').trim();
          return Boolean(curTxt && !/^(Month|Day|เดือน|วัน|Select)$/i.test(curTxt));
        };
        const dayDone = isDropdownChosen(daySel, cfg.birthDay);
        const monthDone = isDropdownChosen(monthSel, cfg.birthMonth);
        const openListbox = qa('[role="listbox"]').find(isVisible);
        if (openListbox) {
          const allOpts = qa('[role="option"]', openListbox);
          const wantNum = !dayDone ? cfg.birthDay : cfg.birthMonth;
          // Prefer options currently visible inside the viewport (y between 16 and innerHeight - 16)
          const inViewportOpts = allOpts.filter(o => {
            const r = o.getBoundingClientRect();
            return r.width > 4 && r.height > 4 && r.top >= 12 && r.bottom <= (window.innerHeight - 12);
          });
          const exactInView = inViewportOpts.find(o => String(o.dataset?.value || o.getAttribute('value') || o.textContent || '').trim() === String(wantNum));
          const midInView = inViewportOpts.length > 0 ? inViewportOpts[Math.floor(inViewportOpts.length / 2)] : null;
          const targetOpt = exactInView || midInView || allOpts[wantNum - 1] || allOpts[0];
          if (targetOpt) {
            return { step: 'click_rect', clickRect: rectOf(targetOpt), message: '📅 กำลังเลือกวัน/เดือนเกิดในหน้าสมัคร Outlook...' };
          }
        }
        if (!dayDone && daySel) {
          return {
            step: daySel.tagName === 'SELECT' ? 'select_native' : 'click_selector',
            selector: daySelEl,
            value: String(cfg.birthDay),
            message: '📅 กำลังเลือกวันเกิดในหน้าสมัคร Outlook...'
          };
        }
        if (!monthDone && monthSel) {
          return {
            step: monthSel.tagName === 'SELECT' ? 'select_native' : 'click_selector',
            selector: monthSelEl,
            value: String(cfg.birthMonth),
            message: '📅 กำลังเลือกเดือนเกิดในหน้าสมัคร Outlook...'
          };
        }
        const curYear = String(yearInp.value || '').trim();
        if (curYear !== String(cfg.birthYear)) {
          return {
            step: 'type_selector_and_next',
            stepKey: 'birthdate',
            selector: yearSelEl,
            text: String(cfg.birthYear),
            nextSelector: nextSel,
            message: '📅 กำลังพิมพ์ปีเกิด (' + cfg.birthYear + ') ในหน้าสมัคร Outlook...'
          };
        }
        return {
          step: 'click_selector',
          stepKey: 'birthdate',
          selector: nextSel,
          message: '📅 กรอกวันเดือนปีเกิดครบแล้ว กำลังกดถัดไป...'
        };
      }

      // 5. Step C: First Name & Last Name
      if (firstInp && lastInp) {
        const curFirst = String(firstInp.value || '').trim();
        const curLast = String(lastInp.value || '').trim();
        if (curFirst !== cfg.firstName || curLast !== cfg.lastName) {
          return {
            step: 'type_names_selectors',
            stepKey: 'names',
            firstSelector: firstSelEl,
            firstText: cfg.firstName,
            needFirst: curFirst !== cfg.firstName,
            lastSelector: lastSelEl,
            lastText: cfg.lastName,
            needLast: curLast !== cfg.lastName,
            nextSelector: nextSel,
            message: '👤 กำลังพิมพ์ชื่อ-นามสกุล (' + cfg.firstName + ' ' + cfg.lastName + ')...'
          };
        }
        return {
          step: 'click_selector',
          stepKey: 'names',
          selector: nextSel,
          message: '👤 กรอกชื่อ-นามสกุลแล้ว กำลังกดถัดไป...'
        };
      }

      // 6. Step B: Password
      if (passInp && !emailInp) {
        const optIn = q('#iOptinEmail');
        const needUncheckOptIn = Boolean(optIn && isVisible(optIn) && optIn.checked);
        if (passInp.value !== cfg.password) {
          return {
            step: 'type_password_selector',
            stepKey: 'password',
            optInSelector: needUncheckOptIn ? '#iOptinEmail' : '',
            selector: passSelEl,
            text: cfg.password,
            nextSelector: nextSel,
            message: '🔑 กำลังพิมพ์รหัสผ่านเมล Outlook...'
          };
        }
        return {
          step: 'click_selector',
          stepKey: 'password',
          selector: nextSel,
          message: '🔑 กรอกรหัสผ่านแล้ว กำลังกดถัดไป...'
        };
      }

      // 7. Step A: Email / MemberName
      if (emailInp) {
        const errEls = qa('#MemberNameError, #usernameInputError, #usernameError, [role="alert"], .alert-error').filter(isVisible);
        const errText = errEls.map(e => e.textContent || '').join(' ').trim();
        if (errText && /ถูกใช้งานแล้ว|มีคนใช้|มีบัญชีนี้อยู่แล้ว|already|taken|choose another|someone already has|ไม่พร้อมใช้งาน|ลองใช้ชื่ออื่น/i.test(errText)) {
          const curTyped = String(emailInp.value || '').trim().toLowerCase();
          if (curTyped === cfg.username.toLowerCase() || curTyped === cfg.localPart.toLowerCase()) {
            return { step: 'email_taken', message: '♻️ อีเมล ' + cfg.username + ' ซ้ำในระบบ Outlook -> กำลังสุ่มใหม่...' };
          }
        }
        const needFullFormat = Boolean(errText && /someone@example\\.com|รูปแบบอีเมล|enter your email address/i.test(errText));
        const domainSel = qa('#LiveDomainBoxList, select[name*="Domain" i], [data-testid="domainDropdown"]').find(isVisible);
        const wantVal = (domainSel && !needFullFormat) ? cfg.localPart : cfg.username;
        const curVal = String(emailInp.value || '').trim();
        const isEmailFilled = curVal.toLowerCase() === cfg.username.toLowerCase() || curVal.toLowerCase() === cfg.localPart.toLowerCase();
        if (!isEmailFilled) {
          return {
            step: 'type_selector_and_next',
            stepKey: 'email',
            selector: emailSelEl,
            text: wantVal,
            nextSelector: nextSel,
            message: '📧 กำลังพิมพ์อีเมล ' + cfg.username + ' ในแท็บสมัคร Outlook...'
          };
        }
        return {
          step: 'click_selector',
          stepKey: 'email',
          selector: nextSel,
          message: '📧 กรอกอีเมล ' + cfg.username + ' แล้ว กำลังกดถัดไป...'
        };
      }

      // 8. Step E: Human Verification / CAPTCHA gate — STOP and let the user complete it in Tab 2
      const hasCaptchaFrame = qa('#enforcementFrame, #hipTemplateContainer, [data-testid="humanVerification"], iframe[src*="arkoselabs" i], iframe[src*="funcaptcha" i], iframe[src*="hsprotect" i]').some(isVisible);
      const hasCaptchaText = /Prove you're not a robot|Let's prove you're human|Verify you are human|Solve the puzzle|พิสูจน์ว่าคุณเป็นมนุษย์|พิสูจน์ว่าคุณไม่ใช่หุ่นยนต์|แก้ไขปริศนา|กดค้างไว้|Press and hold/i.test(bodyText);
      if (hasCaptchaFrame || hasCaptchaText) {
        return {
          step: 'awaiting_captcha',
          message: '🧩 รอคุณกดผ่านด่านยืนยันคน (CAPTCHA) ในแท็บที่ 2 (' + cfg.username + ') — พอผ่านแล้วจะสลับกลับแท็บเกมอัตโนมัติ!'
        };
      }

      return { step: 'waiting', message: '⏳ กำลังโหลดหน้าสมัคร Outlook (' + cfg.username + ') ในแท็บที่ 2...' };
    })()`;
  }

  function buildOutlookOtpPollScript(flow, checkJunk = false) {
    const payload = {
      username: String(flow.username || '').trim(),
      password: String(flow.password || ''),
      usedCodes: Array.from(flow.usedOtpCodes || []),
      checkJunk: Boolean(checkJunk)
    };
    return `(() => {
      const cfg = ${JSON.stringify(payload)};
      const q = (s, r) => (r || document).querySelector(s);
      const qa = (s, r) => Array.from((r || document).querySelectorAll(s));
      const isVisible = el => {
        if (!el || el.hidden || el.disabled) return false;
        const st = window.getComputedStyle(el);
        if (!st || st.display === 'none' || st.visibility === 'hidden' || st.opacity === '0') return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 4 && rect.height > 4;
      };
      const setNativeVal = (el, val) => {
        if (!el) return;
        try { el.focus(); } catch (_) {}
        const proto = window.HTMLInputElement?.prototype;
        const setter = proto && Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter) setter.call(el, val);
        else el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };

      const host = String(location.hostname || '').toLowerCase();
      const bodyText = String(document.body?.innerText || '');

      // If on login.live.com, auto-sign in with the Outlook credentials
      if (host === 'login.live.com') {
        if (q('#kmsiTitle, [data-testid="kmsiVideo"]') || /Stay signed in\\?|ลงชื่อเข้าใช้ค้างไว้หรือไม่/i.test(bodyText)) {
          const yesBtn = qa('#acceptButton, #idSIButton9, [data-testid="primaryButton"], button[type="submit"]').find(isVisible);
          if (yesBtn) { try { yesBtn.click(); } catch (_) {} }
          return { otpCode: '', message: '🔑 กำลังเข้าสู่ระบบกล่องจดหมาย Outlook...' };
        }
        const passInp = qa('input[type="password"], #i0118').find(isVisible);
        const emailInp = qa('input[type="email"], input[name="loginfmt"], #i0116').find(isVisible);
        if (passInp && cfg.password) {
          if (passInp.value !== cfg.password) setNativeVal(passInp, cfg.password);
          const btn = qa('#idSIButton9, [data-testid="primaryButton"], button[type="submit"]').find(isVisible);
          if (btn) { try { btn.click(); } catch (_) {} }
          return { otpCode: '', message: '🔑 กำลังกรอกรหัสผ่านเข้ากล่องจดหมาย Outlook...' };
        }
        if (emailInp && cfg.username) {
          if (String(emailInp.value || '').trim().toLowerCase() !== cfg.username.toLowerCase()) setNativeVal(emailInp, cfg.username);
          const btn = qa('#idSIButton9, [data-testid="primaryButton"], button[type="submit"]').find(isVisible);
          if (btn) { try { btn.click(); } catch (_) {} }
          return { otpCode: '', message: '🔑 กำลังกรอกอีเมลเข้ากล่องจดหมาย Outlook...' };
        }
      }

      if (host !== 'outlook.live.com' && host !== 'outlook.office.com') {
        return { needNavigateMail: true, otpCode: '', message: '📨 กำลังเปิดกล่องจดหมาย Outlook Web เพื่อดึงรหัส OTP 6 หลัก...' };
      }

      // Switch between Inbox and Junk Email folder periodically if requested
      if (cfg.checkJunk) {
        const junkNode = qa('[role="treeitem"], a, button').find(el => isVisible(el) && /Junk Email|อีเมลขยะ/i.test(el.textContent || el.getAttribute('aria-label') || el.title || ''));
        if (junkNode && junkNode.getAttribute('aria-selected') !== 'true') {
          try { junkNode.click(); } catch (_) {}
        }
      } else {
        const inboxNode = qa('[role="treeitem"], a, button').find(el => isVisible(el) && /^(Inbox|กล่องขาเข้า)\\b/i.test((el.textContent || el.getAttribute('aria-label') || el.title || '').trim()));
        if (inboxNode && inboxNode.getAttribute('aria-selected') !== 'true' && /junkemail/i.test(location.pathname)) {
          try { inboxNode.click(); } catch (_) {}
        }
      }

      const usedSet = new Set(cfg.usedCodes || []);
      const extractSixDigit = txt => {
        if (!txt) return '';
        const matches = String(txt).match(/\\b(\\d{6})\\b/g) || [];
        for (const m of matches) {
          if (m === '000000' || usedSet.has(m)) continue;
          if (/^202[4-9]\\d{2}$/.test(m)) continue; // skip YYYYMM date numbers
          return m;
        }
        return '';
      };

      // 1. Check reading pane if a Nightcamp email is already open
      const readingPanes = qa('[role="document"], #UniqueMessageBody, [aria-label*="Message body" i], [aria-label*="เนื้อหาข้อความ" i]').filter(isVisible);
      for (const pane of readingPanes) {
        const paneTxt = String(pane.innerText || pane.textContent || '');
        if (/night\\s*camp|nightcamp|รหัส|ยืนยัน|verification|verify|code/i.test(paneTxt)) {
          const code = extractSixDigit(paneTxt);
          if (code) return { otpCode: code, message: '✅ พบรหัส OTP 6 หลัก (' + code + ') ในเมล Outlook!' };
        }
      }

      // 2. Scan message rows in the inbox / junk list
      const rows = qa('[role="option"], [data-convid]').filter(isVisible);
      for (const row of rows.slice(0, 8)) {
        const rowTxt = String((row.getAttribute('aria-label') || '') + ' ' + (row.innerText || row.textContent || ''));
        if (/night\\s*camp|nightcamp|รหัส|ยืนยัน|verification|verify/i.test(rowTxt)) {
          const previewCode = extractSixDigit(rowTxt);
          if (previewCode) {
            return { otpCode: previewCode, message: '✅ พบรหัส OTP 6 หลัก (' + previewCode + ') จากหัวข้อเมล Outlook!' };
          }
          try { row.click(); } catch (_) {}
          return { otpCode: '', message: '📩 พบอีเมลจาก Night Camp แล้ว กำลังเปิดอ่านรหัส 6 หลัก...' };
        }
      }

      return { otpCode: '', message: '📧 กำลังรออีเมลรหัส OTP 6 หลักจาก Night Camp ในกล่องจดหมาย Outlook...' };
    })()`;
  }

  async function handleOutlookFlowRequest(c, body = {}) {
    const flow = ensureOutlookFlowState(c);
    const action = String(body.action || 'status').trim();

    if (action === 'close-tab') {
      await closeOutlookTab(c);
      return { success: true, status: 'closed' };
    }

    if (action === 'ensure-signup') {
      const username = String(body.username || flow.username || '').trim();
      const password = String(body.password || flow.password || '');
      if (!username || !password) {
        return { success: false, status: 'error', error: 'Missing username or password' };
      }
      if (flow.readyUsers.has(username.toLowerCase())) {
        flow.inMainTab = false;
        return {
          success: true,
          status: 'ready',
          username,
          message: `✅ สมัครเมล Outlook (${username}) สำเร็จแล้ว`
        };
      }
      const isNewEmail = flow.username.toLowerCase() !== username.toLowerCase();
      flow.username = username;
      flow.password = password;
      if (body.firstName) flow.firstName = String(body.firstName);
      if (body.lastName) flow.lastName = String(body.lastName);
      if (body.birthDay) flow.birthDay = Number(body.birthDay) || 15;
      if (body.birthMonth) flow.birthMonth = Number(body.birthMonth) || 6;
      if (body.birthYear) flow.birthYear = Number(body.birthYear) || 1998;
      if (isNewEmail) {
        flow.state = 'opening';
        flow.activatedForCaptcha = false;
        flow.stepSubmittedAt = {};
      }
      if (!flow.stepSubmittedAt) flow.stepSubmittedAt = {};

      if (flow.stepInFlight) {
        return {
          success: true,
          status: flow.state || 'filling',
          username: flow.username,
          message: flow.message || `📧 กำลังสมัครเมล ${flow.username} ในหน้าต่าง Client นี้ (ผ่าน Proxy)...`
        };
      }

      flow.stepInFlight = true;
      flow.inMainTab = false;
      try {
        // Tab 1 (`c.targetId`) stays on Nightcamp game; Tab 2 (`tab.targetId`) opens right next to Tab 1 in the SAME window!
        const tab = await ensureOutlookTab(c, 'https://signup.live.com/signup?lic=1&mkt=th-TH');
        await send('Target.activateTarget', { targetId: tab.targetId }, undefined, 2500).catch(() => {});
        flow.initialActivated = true;

        const evalRes = await send('Runtime.evaluate', {
          expression: buildOutlookInspectScript(flow),
          returnByValue: true
        }, tab.sessionId, 6000).catch(() => null);

        const info = evalRes?.result?.value;
        if (info && typeof info === 'object') {
          flow.message = info.message || flow.message;
          const step = info.step || 'waiting';

          if (step === 'ready') {
            if (info.clickSelector) {
              await cdpClickSelector(tab.sessionId, info.clickSelector, flow);
            } else if (info.clickRect) {
              await cdpMouseClick(tab.sessionId, info.clickRect.x, info.clickRect.y, 40, 24, flow);
            }
            flow.state = 'ready';
            flow.blockRetryCount = 0;
            flow.readyUsers.add(username.toLowerCase());
            // Warm up Outlook Web Inbox in Tab 2 and switch focus back to Tab 1 (Nightcamp game)!
            send('Page.navigate', { url: 'https://outlook.live.com/mail/0/' }, tab.sessionId, 10000).catch(() => {});
            await send('Target.activateTarget', { targetId: c.targetId }, undefined, 3000).catch(() => {});
          } else if (step === 'token_expired') {
            flow.state = 'opening';
            flow.activatedForCaptcha = false;
            await clearMicrosoftCookiesInSession(tab.sessionId);
            await closeOutlookTab(c);
            await new Promise(r => setTimeout(r, 800));
          } else if (step === 'account_blocked') {
            const nowMs = Date.now();
            if (nowMs - (flow.lastBlockRotateAt || 0) < 12000) {
              flow.state = 'opening';
              return {
                success: true,
                status: 'opening',
                username: flow.username,
                message: flow.message || '♻️ กำลังสลับ Mobile Proxy IP และเปิดหน้าสมัครใหม่...'
              };
            }
            flow.lastBlockRotateAt = nowMs;
            flow.blockRetryCount = (flow.blockRetryCount || 0) + 1;
            if (flow.blockRetryCount <= 1) {
              await clearMicrosoftCookiesInSession(tab.sessionId);
              await closeOutlookTab(c);
              if (screenProxy && typeof screenProxy.rotateIp === 'function' && c?.profileId) {
                await screenProxy.rotateIp({ profileIds: [c.profileId] }).catch(() => null);
              }
              await new Promise(r => setTimeout(r, 1500));
              flow.state = 'email_taken';
              flow.message = `♻️ สลับ Mobile Proxy IP ใหม่ (DataImpulse) และสุ่มเมล @outlook.com ใหม่...`;
            } else {
              flow.state = 'awaiting_captcha';
              flow.message = '⚠️ Microsoft บล็อกการสร้างเมลอัตโนมัติ (แนะนำสลับไปใช้โหมด SmailPro API ในปุ่ม ⚙️ ตั้งค่าสมัครเมล)';
            }
          } else if (step === 'email_taken') {
            flow.state = 'email_taken';
          } else if (step === 'awaiting_captcha') {
            flow.state = 'awaiting_captcha';
            if (!flow.activatedForCaptcha) {
              flow.activatedForCaptcha = true;
              await send('Target.activateTarget', { targetId: tab.targetId }, undefined, 3000).catch(() => {});
            }
          } else if (step === 'type_selector_and_next') {
            flow.state = 'filling';
            if (info.selector) {
              await cdpTypeIntoSelector(tab.sessionId, info.selector, info.text, flow);
            }
            if (info.nextSelector) {
              if (info.stepKey) flow.stepSubmittedAt[info.stepKey] = Date.now();
              await cdpClickSelector(tab.sessionId, info.nextSelector, flow);
              await new Promise(r => setTimeout(r, 1500));
            }
          } else if (step === 'type_password_selector') {
            flow.state = 'filling';
            if (info.optInSelector) {
              await cdpClickSelector(tab.sessionId, info.optInSelector, flow);
              await new Promise(r => setTimeout(r, 120));
            }
            if (info.selector) {
              await cdpTypeIntoSelector(tab.sessionId, info.selector, info.text, flow);
            }
            if (info.nextSelector) {
              if (info.stepKey) flow.stepSubmittedAt[info.stepKey] = Date.now();
              await cdpClickSelector(tab.sessionId, info.nextSelector, flow);
              await new Promise(r => setTimeout(r, 1500));
            }
          } else if (step === 'type_names_selectors') {
            flow.state = 'filling';
            if (info.needFirst && info.firstSelector) {
              await cdpTypeIntoSelector(tab.sessionId, info.firstSelector, info.firstText, flow);
            }
            if (info.needLast && info.lastSelector) {
              await cdpTypeIntoSelector(tab.sessionId, info.lastSelector, info.lastText, flow);
            }
            if (info.nextSelector) {
              if (info.stepKey) flow.stepSubmittedAt[info.stepKey] = Date.now();
              await cdpClickSelector(tab.sessionId, info.nextSelector, flow);
              await new Promise(r => setTimeout(r, 1800));
            }
          } else if (step === 'select_native') {
            flow.state = 'filling';
            await send('Runtime.evaluate', {
              expression: `(() => {
                const el = document.querySelector(${JSON.stringify(info.selector)});
                if (el) {
                  el.value = ${JSON.stringify(info.value)};
                  el.dispatchEvent(new Event('input', { bubbles: true }));
                  el.dispatchEvent(new Event('change', { bubbles: true }));
                }
              })()`
            }, tab.sessionId, 3000).catch(() => {});
          } else if (step === 'click_selector') {
            flow.state = 'filling';
            const lastSub = info.stepKey ? (flow.stepSubmittedAt?.[info.stepKey] || 0) : 0;
            if (!info.stepKey || (Date.now() - lastSub >= 8000)) {
              if (info.stepKey) flow.stepSubmittedAt[info.stepKey] = Date.now();
              if (info.selector) {
                await cdpClickSelector(tab.sessionId, info.selector, flow);
              } else if (info.clickRect) {
                await cdpMouseClick(tab.sessionId, info.clickRect.x, info.clickRect.y, 40, 24, flow);
              }
              if (info.stepKey) {
                await new Promise(r => setTimeout(r, 1400));
              }
            }
          } else if (step === 'click_rect' || step === 'click_only') {
            flow.state = 'filling';
            if (info.clickRect) {
              await cdpMouseClick(tab.sessionId, info.clickRect.x, info.clickRect.y, 40, 20, flow);
            }
          } else {
            flow.state = 'filling';
          }
        }
        return {
          success: true,
          status: flow.state || 'filling',
          username: flow.username,
          message: flow.message || `📧 กำลังสมัครเมล ${flow.username} ในแท็บที่ 2...`
        };
      } finally {
        flow.stepInFlight = false;
      }
    }

    if (action === 'poll-otp') {
      if (body.username) flow.username = String(body.username).trim();
      if (body.password) flow.password = String(body.password);
      if (body.rejectedCode) flow.usedOtpCodes.add(String(body.rejectedCode).trim());

      if (flow.stepInFlight) {
        return {
          success: true,
          status: 'polling',
          otpCode: '',
          message: flow.message || '📧 กำลังเช็กรหัส OTP 6 หลักในกล่องจดหมาย Outlook...'
        };
      }

      flow.stepInFlight = true;
      try {
        const tab = await ensureOutlookTab(c, 'https://outlook.live.com/mail/0/');
        flow.otpPollCount = (flow.otpPollCount || 0) + 1;
        const checkJunk = (flow.otpPollCount % 6 === 4 || flow.otpPollCount % 6 === 5);
        const evalRes = await send('Runtime.evaluate', {
          expression: buildOutlookOtpPollScript(flow, checkJunk),
          returnByValue: true,
          awaitPromise: true
        }, tab.sessionId, 8000).catch(() => null);

        const val = evalRes?.result?.value;
        if (val?.needNavigateMail) {
          send('Page.navigate', { url: 'https://outlook.live.com/mail/0/' }, tab.sessionId, 8000).catch(() => {});
        }
        if (val?.otpCode) {
          const code = String(val.otpCode).trim();
          flow.usedOtpCodes.add(code);
          flow.otpCode = code;
          flow.message = val.message || `✅ พบรหัส OTP 6 หลัก (${code})`;
          await send('Target.activateTarget', { targetId: c.targetId }, undefined, 3000).catch(() => {});
          return {
            success: true,
            status: 'otp_found',
            otpCode: code,
            message: flow.message
          };
        }
        flow.message = val?.message || '📧 กำลังรออีเมลรหัส OTP 6 หลักในกล่องจดหมาย Outlook...';
        return {
          success: true,
          status: 'polling',
          otpCode: '',
          message: flow.message
        };
      } finally {
        flow.stepInFlight = false;
      }
    }

    return {
      success: true,
      status: flow.state || 'idle',
      username: flow.username,
      message: flow.message || ''
    };
  }

  async function windowAction(c, action, q) {
    const { windowId } = await send('Browser.getWindowForTarget', { targetId: c.targetId });
    const set = bounds => send('Browser.setWindowBounds', { windowId, bounds });
    if (action === 'hide' || action === 'zero-render-on') {
      await set({ windowState: 'normal' }).catch(() => {});
      await evaluate(c, `typeof window.setZeroRenderMode === 'function' ? window.setZeroRenderMode(true) : (typeof window.setLowPowerMode === 'function' && window.setLowPowerMode(true))`, 4500, true).catch(() => {});
    } else if (action === 'minimize') {
      await set({ windowState: 'minimized' }).catch(() => {});
    } else if (action === 'show' || action === 'restore' || action === 'top' || action === 'focus' || action === 'zero-render-off') {
      await set({ windowState: 'normal' }).catch(() => {});
      if (action === 'top' || action === 'focus') await send('Target.activateTarget', { targetId: c.targetId });
      await evaluate(c, `typeof window.setZeroRenderMode === 'function' ? window.setZeroRenderMode(false) : (typeof window.setLowPowerMode === 'function' && window.setLowPowerMode(false))`, 4500, true).catch(() => {});
    } else if (action === 'set-bounds') {
      await set({ windowState: 'normal' });
      await set({ left: Number(q.get('x')) || 0, top: Number(q.get('y')) || 0, width: Number(q.get('w')) || 640, height: Number(q.get('h')) || 520 });
    }
  }
  function startProxy(c, port) {
    if (c.server) return;
    c.port = port;
    c.server = http.createServer(async (req, res) => {
      req.setEncoding('utf8');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Private-Network', 'true');
      if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', '*');
        res.writeHead(204);
        res.end();
        return;
      }
      const url = new URL(req.url, 'http://127.0.0.1');
      if (url.pathname === '/__pm_bootstrap.js') {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.writeHead(200);
        res.end(c.pendingBootstrapScript || 'void 0;');
        return;
      }
      const reply = (status, obj) => { res.writeHead(status); res.end(JSON.stringify(obj)); };
      try {
        if (url.pathname === '/api/eval') {
          let code = url.searchParams.get('code');
          let reqTimeoutMs = Number(url.searchParams.get('timeoutMs')) || 0;
          if (req.method === 'POST') {
            let body = '';
            for await (const chunk of req) body += chunk;
            try {
              const parsed = JSON.parse(body);
              code = parsed.code || body;
              if (Number(parsed.timeoutMs) > 0) reqTimeoutMs = Number(parsed.timeoutMs);
            } catch (e) { code = body; }
          }
          if (!code) return reply(400, { error: 'Missing code' });
          const isLiveStateProbe = code.includes('__getClientLiveState') && code.includes('grossZenyGained');
          if (c.outlookFlow && c.outlookFlow.inMainTab) {
            const flow = c.outlookFlow;
            c.stateFailCount = 0;
            c.firstStateFailAt = 0;
            c.evalCooldownUntil = 0;
            if (isLiveStateProbe) {
              const syntheticOutlookState = {
                isOnline: true,
                isBotRunning: false,
                autoLoop: false,
                screenPhase: 'outlook_signup',
                screenPhaseLabel: '📧 สมัครเมล Outlook',
                botStatus: flow.message || (`📧 กำลังสมัครเมล ${flow.username} ในหน้าต่างนี้...`),
                charName: '',
                map: 'Outlook Signup',
                coords: '--',
                weight: '--',
                zeny: null
              };
              c.lastGoodState = syntheticOutlookState;
              c.lastGoodStateAt = Date.now();
              return reply(200, { success: true, result: syntheticOutlookState });
            }
            if (code.includes('window.__authConfig') && code.includes('executeAutoLogin') && !code.includes('const patch =')) {
              return reply(200, {
                success: true,
                result: {
                  username: flow.username || '',
                  password: flow.password || '',
                  serverName: flow.serverName || '',
                  charNameCfg: flow.charName || '',
                  autoResumeBot: true,
                  enabled: true,
                  register: true,
                  registerDone: false,
                  registerError: '',
                  generatedUser: true,
                  outlookReady: false,
                  awaitingEmailOtp: false,
                  lastRejectedOtpCode: '',
                  userEditedAt: 0,
                  serverEditedAt: 0,
                  charEditedAt: 0,
                  verifiedLoginAt: 0,
                  userToggledAt: 0,
                  inGame: false,
                  inWorld: false,
                  charName: '',
                  isEditingAuth: false,
                  registerQueueWaiting: false,
                  registerQueueDismissed: false
                }
              });
            }
            if (code.includes('window.__authConfig') && code.includes('const patch =')) {
              return reply(200, { success: true, result: { success: true } });
            }
            if (code.includes('__setPmRegisterQueueOverlay')) {
              return reply(200, { success: true, result: { success: true } });
            }
          }
          const isBootstrapAccept = isRealSession && code.includes('__pmScriptBootstrap.accept(');
          const isReadyClient = diagnostics.get(c.profileId)?.state === 'ready';
          const thisClientInjecting = Boolean(c.injectionInFlight);
          const inEvalCooldown = Boolean(isLiveStateProbe && c.evalCooldownUntil && Date.now() < c.evalCooldownUntil);
          if (isRealSession && !isBootstrapAccept && (thisClientInjecting || inEvalCooldown)) {
            if (isLiveStateProbe && c.lastGoodState && (Date.now() - (c.lastGoodStateAt || 0) < 300000)) {
              return reply(200, { success: true, result: c.lastGoodState, cached: true });
            }
            if (isLiveStateProbe) {
              return reply(503, { success: false, error: thisClientInjecting ? 'Client injecting' : 'Client in timeout cooldown' });
            }
          }
          try {
            let evalRes;
            if (isLiveStateProbe) {
              if (isRealSession && c.lastGoodState && (Date.now() - (c.lastGoodStateAt || 0) < 1800)) {
                return reply(200, { success: true, result: c.lastGoodState, cached: true });
              }
              if (!c.liveStateEvalPromise) {
                c.liveStateEvalPromise = evaluate(c, code, 8000, false).finally(() => {
                  c.liveStateEvalPromise = null;
                });
              }
              evalRes = await c.liveStateEvalPromise;
              c.stateFailCount = 0;
              c.firstStateFailAt = 0;
              c.evalCooldownUntil = 0;
              if (evalRes && typeof evalRes === 'object') {
                c.lastGoodState = evalRes;
                c.lastGoodStateAt = Date.now();
                // Promote healthy live-state clients directly to 'ready' so slow startup tabs on 25-30+ screen PCs
                // never stay stuck in 'initializing' / 'loading' once the bot is actively running in-game!
                if (evalRes.version || evalRes.screenPhase === 'in_game' || evalRes.isBotRunning) {
                  c.initialHealthChecked = true;
                  if (!isReadyClient) {
                    diagnostic(c, 'ready', { version: evalRes.version || null, liveHook: true, hud: true });
                  }
                }
                ensureClientFramePacerHealed(c).catch(() => {});
                if (Date.now() - (c.lastStorageSyncAt || 0) > 60000) {
                  c.lastStorageSyncAt = Date.now();
                  syncClientStorage(c).catch(() => {});
                }
              }
            } else if (isRealSession && code.includes('__pmScriptBootstrap.accept(')) {
              if (diagnostics.get(c.profileId)?.state === 'ready') {
                return reply(200, { success: true, result: { success: true, cached: true } });
              }
              if (c.injectionInFlightPromise) {
                await c.injectionInFlightPromise.catch(() => {});
                if (diagnostics.get(c.profileId)?.state === 'ready') {
                  return reply(200, { success: true, result: { success: true } });
                }
              }
              if (c.retryTimer) {
                clearTimeout(c.retryTimer);
                c.retryTimer = null;
              }
              c.attempts = 0;
              await injectBot(c).catch(() => {});
              if (diagnostics.get(c.profileId)?.state === 'ready') {
                return reply(200, { success: true, result: { success: true } });
              }
              return reply(503, { success: false, error: 'Bot injection pending' });
            } else {
              const actionTimeoutMs = Math.min(Math.max(reqTimeoutMs || 10000, 4000), 300000);
              evalRes = await evaluate(c, code, actionTimeoutMs, true);
              if (!code.includes('pelican_embedded_human_check_cfg') && /applyScriptPlan|applyPelicanSettings|importAllBotSettings|setItem\s*\(\s*['"]pelican_/.test(code)) {
                if (!isRealSession || Date.now() - (c.lastStorageSyncAt || 0) > 15000) {
                  c.lastStorageSyncAt = Date.now();
                  syncClientStorage(c, true).catch(() => {});
                }
              }
            }
            return reply(200, { success: true, result: evalRes });
          } catch (e) {
            if (isGoneError(e)) { drop(c); return reply(500, { success: false, error: e.message }); }
            if (isLiveStateProbe) {
              const now = Date.now();
              if (!c.firstStateFailAt) c.firstStateFailAt = now;
              c.stateFailCount = (c.stateFailCount || 0) + 1;
              if (c.stateFailCount >= 30 && (now - c.firstStateFailAt) >= 240000) {
                reloadCrashedClient(c, 'state-probe-timeout').catch(() => {});
              }
              if (c.lastGoodState && (now - (c.lastGoodStateAt || 0)) < 300000) {
                return reply(200, { success: true, result: c.lastGoodState, cached: true });
              }
            }
            return reply(500, { success: false, error: e.message });
          }
        }
        if (url.pathname === '/api/state') {
          if (c.outlookFlow && c.outlookFlow.inMainTab) {
            const flow = c.outlookFlow;
            c.stateFailCount = 0;
            c.firstStateFailAt = 0;
            const syntheticOutlookState = {
              isOnline: true,
              isBotRunning: false,
              autoLoop: false,
              screenPhase: 'outlook_signup',
              screenPhaseLabel: '📧 สมัครเมล Outlook',
              botStatus: flow.message || (`📧 กำลังสมัครเมล ${flow.username} ในหน้าต่างนี้...`),
              charName: '',
              map: 'Outlook Signup',
              coords: '--',
              weight: '--',
              zeny: null
            };
            c.lastGoodState = syntheticOutlookState;
            c.lastGoodStateAt = Date.now();
            return reply(200, syntheticOutlookState);
          }
          const thisStateInjecting = Boolean(c.injectionInFlight);
          if (isRealSession && (thisStateInjecting || (c.evalCooldownUntil && Date.now() < c.evalCooldownUntil))) {
            if (c.lastGoodState && (Date.now() - (c.lastGoodStateAt || 0) < 300000)) {
              return reply(200, c.lastGoodState);
            }
            return reply(503, { success: false, error: thisStateInjecting ? 'Client injecting' : 'Client in timeout cooldown' });
          }
          try {
            if (isRealSession && c.lastGoodState && (Date.now() - (c.lastGoodStateAt || 0) < 1800)) {
              return reply(200, c.lastGoodState);
            }
            if (!c.liveStateEvalPromise) {
              c.liveStateEvalPromise = evaluate(c, `typeof window.__getClientLiveState === 'function' ? window.__getClientLiveState() : null`, 8000, false).finally(() => {
                c.liveStateEvalPromise = null;
              });
            }
            const st = await c.liveStateEvalPromise;
            c.stateFailCount = 0;
            c.firstStateFailAt = 0;
            if (st) {
              c.lastGoodState = st;
              c.lastGoodStateAt = Date.now();
              ensureClientFramePacerHealed(c).catch(() => {});
            }
            if (st === null && !c.injectionInFlight && !c.retryTimer) {
              injectBot(c).catch(() => {});
            } else if (st && Date.now() - (c.lastStorageSyncAt || 0) > 60000) {
              c.lastStorageSyncAt = Date.now();
              syncClientStorage(c).catch(() => {});
            }
            return reply(200, st);
          } catch (e) {
            if (isGoneError(e)) { drop(c); return reply(500, { success: false, error: e.message }); }
            const now = Date.now();
            if (!c.firstStateFailAt) c.firstStateFailAt = now;
            c.stateFailCount = (c.stateFailCount || 0) + 1;
            if (c.stateFailCount >= 30 && (now - c.firstStateFailAt) >= 240000) {
              reloadCrashedClient(c, 'state-probe-timeout').catch(() => {});
            }
            if (c.lastGoodState && (now - (c.lastGoodStateAt || 0)) < 180000) {
              return reply(200, c.lastGoodState);
            }
            return reply(500, { success: false, error: e.message });
          }
        }
        if(url.pathname==='/api/browser-status')return reply(200,{success:true,profileId:c.profileId,deviceId:ensureProfileDeviceId(c.profileId),browserContextId:c.browserContextId||null,...diagnostics.get(c.profileId)});
        if (url.pathname === '/api/outlook-flow') {
          let bodyObj = {};
          if (req.method === 'POST') {
            let raw = '';
            for await (const chunk of req) raw += chunk;
            try { bodyObj = JSON.parse(raw || '{}'); } catch (_) { bodyObj = {}; }
          } else {
            bodyObj = Object.fromEntries(url.searchParams.entries());
          }
          const outRes = await handleOutlookFlowRequest(c, bodyObj);
          return reply(200, outRes);
        }
        if (url.pathname === '/api/window') {
          await windowAction(c, url.searchParams.get('action'), url.searchParams);
          return reply(200, { success: true });
        }
        reply(200, { name: 'PmheeAether browser-mode client', profileId: c.profileId, endpoints: ['/api/eval', '/api/state', '/api/window', '/api/outlook-flow'] });
      } catch (e) {
        if (isGoneError(e)) drop(c);
        reply(500, { success: false, error: e.message });
      }
    });
    const srv = c.server;
    c.serverListening = false;
    c.proxyListenAttempts = 0;
    const retryDelays = [250, 500, 900, 1500, 2500, 4000, 6000, 8000];
    const tryListen = () => {
      if (clients.get(c.profileId) !== c || c.server !== srv || srv.listening) return;
      try { srv.listen(port, '127.0.0.1'); } catch (_) {}
    };
    srv.on('listening', () => {
      c.serverListening = true;
      c.proxyListenAttempts = 0;
      if (c.proxyListenRetryTimer) {
        clearTimeout(c.proxyListenRetryTimer);
        c.proxyListenRetryTimer = null;
      }
    });
    srv.on('error', e => {
      c.serverListening = false;
      console.warn(`[BrowserMode] port ${port}: ${e.message}`);
      if (e && e.code === 'EADDRINUSE' && clients.get(c.profileId) === c && c.server === srv) {
        const idx = c.proxyListenAttempts || 0;
        if (idx < retryDelays.length) {
          c.proxyListenAttempts = idx + 1;
          const prev = portServers.get(port);
          if (prev && prev !== srv) {
            try { prev.closeIdleConnections && prev.closeIdleConnections(); prev.closeAllConnections && prev.closeAllConnections(); prev.close(); } catch (_) {}
          }
          if (c.proxyListenRetryTimer) clearTimeout(c.proxyListenRetryTimer);
          c.proxyListenRetryTimer = setTimeout(() => {
            c.proxyListenRetryTimer = null;
            tryListen();
          }, retryDelays[idx]);
          c.proxyListenRetryTimer.unref?.();
        }
      }
    });
    const old = portServers.get(port);
    if (old && old !== srv) {
      try {
        old.closeIdleConnections && old.closeIdleConnections();
        old.closeAllConnections && old.closeAllConnections();
        old.close();
      } catch (e) {}
    }
    portServers.set(port, srv);
    tryListen();
  }
  function stopProxy(c) {
    if (c && c.proxyListenRetryTimer) {
      clearTimeout(c.proxyListenRetryTimer);
      c.proxyListenRetryTimer = null;
    }
    if (c && c.server) {
      c.serverListening = false;
      try {
        c.server.closeIdleConnections && c.server.closeIdleConnections();
        c.server.closeAllConnections && c.server.closeAllConnections();
        c.server.close();
      } catch (e) {}
      if (portServers.get(c.port) === c.server) portServers.delete(c.port);
      c.server = null;
    }
  }

  // ---------- public ----------
  async function launch(profile, opts = {}) {
    try {
      return await launchOnce(profile, false, opts);
    } catch (e) {
      const msg = String(e && e.message || e);
      const isTransportDead = /CDP closed|CDP not connected|CDP connect|CDP not available|เปิดเบราว์เซอร์ไม่สำเร็จ/i.test(msg);
      const isTargetGone = isGoneError(e);
      if (isTransportDead) {
        // NEVER kill a healthy shared CDP WebSocket if other windows are connected and ws is still OPEN
        if (ws && ws.readyState !== 1) {
          try { ws.close(); } catch (_) {}
          ws = null;
        } else if (ws && clients.size === 0) {
          try { ws.close(); } catch (_) {}
          ws = null;
        }
        await new Promise(r => setTimeout(r, 400));
        const aliveNow = clients.size > 0 || await browserAlive();
        return await launchOnce(profile, !aliveNow && clients.size === 0, opts);
      }
      if (isTargetGone) {
        await new Promise(r => setTimeout(r, 250));
        return await launchOnce(profile, false, { ...opts, skipRediscover: false });
      }
      throw e;
    }
  }

  async function launchOnce(profile, forceCleanBrowser = false, opts = {}) {
    stoppedProfiles.delete(profile.id);
    await ensureBrowser(forceCleanBrowser);
    const wasReady = diagnostics.get(profile.id)?.botReady === true;
    const canSkipRediscover = Boolean(
      (opts && opts.skipRediscover) ||
      (ws && ws.readyState === 1 && lastRediscoverSuccessAt > 0 && (Date.now() - lastRediscoverSuccessAt < 4000) && !knownTargets.has(profile.id))
    );
    if (!canSkipRediscover) {
      await rediscover();
    }
    let existing = clients.get(profile.id);
    if (!existing) {
      const { targetInfos } = await send('Target.getTargets', {}, undefined, isRealSession ? 15000 : 30000);
      const customContexts = await getCustomBrowserContexts();
      const allProfiles = (typeof loadProfiles === 'function' ? loadProfiles() : []) || [];
      const knownTargetId = knownTargets.get(profile.id);
      const claimedTargets = new Set([...Array.from(clients.values()).map(c => c.targetId), ...Array.from(knownTargets.entries()).filter(([k]) => k !== profile.id).map(([, v]) => v)]);
      const orphans = targetInfos.filter(t => t.type === 'page' && isGameUrl(t.url) && !claimedTargets.has(t.targetId));
      const matchedOrphan = orphans.find(t => knownTargetId && t.targetId === knownTargetId) ||
        ((allProfiles.length <= 1 && orphans.length === 1 && clients.size === 0) ? orphans[0] : null);
      if (matchedOrphan) {
        try {
          const orphanCtx = isKnownProxyTargetContext(matchedOrphan, customContexts) ? matchedOrphan.browserContextId : null;
          existing = await attach(profile.id, matchedOrphan.targetId, true, orphanCtx);
        } catch (_) {}
      }
    }
    if (existing) {
      const { targetInfos } = await send('Target.getTargets', {}, undefined, isRealSession ? 15000 : 30000);
      if (targetInfos.some(t => t.targetId === existing.targetId)) {
        if (screenProxy && screenProxy.isEnabled()) {
          const leaseSnap = typeof screenProxy.getProfileLeaseSnapshot === 'function'
            ? screenProxy.getProfileLeaseSnapshot(profile.id)
            : null;
          const isHomeIpLease = Boolean(leaseSnap && (leaseSnap.useHomeIp || leaseSnap.directHomeIp));
          if (isRealSession && !existing.browserContextId && !isHomeIpLease && !knownProxyContexts.has(existing.targetId)) {
            await applyProxyModeToOpenWindows({ onlyProfileIds: [profile.id] }).catch(() => {});
            const migrated = clients.get(profile.id);
            if (migrated && migrated.browserContextId) {
              await windowAction(migrated, 'focus', new URLSearchParams()).catch(() => {});
              return {
                success: true,
                message: 'สลับจอเข้าโหมดแยก IP (Proxy) สำเร็จ',
                alreadyOpen: true,
                recovered: true
              };
            }
          }
          await screenProxy.acquireForProfile(profile.id, { debugPort: profile.debugPort }).catch(() => {});
          rebalanceDeviceGroups(profile.id, true);
        }
        startProxy(existing, profile.debugPort);
        let h = null, reloaded = false;
        try { h = await health(existing); } catch (_) {}
        if (!h && ((existing.stateFailCount || 0) >= 3 || (!existing.lastGoodState && (Date.now() - (existing.createdAt || 0) > 45000)))) {
          reloaded = await reloadCrashedClient(existing, 'launch-recover', true);
          try { h = await health(existing); } catch (_) {}
        }
        if (h && (!h.version || !h.hud)) {
          try {
            await injectBot(existing);
            h = await health(existing).catch(() => null);
          } catch (_) {}
        }
        const isReady = !!(h && h.version && h.hud);
        const recovered = (!wasReady && isReady) || reloaded;
        await windowAction(existing, 'focus', new URLSearchParams()).catch(() => {});
        return {
          success: true,
          message: reloaded ? 'รีเฟรชกู้คืนจอที่ค้างสำเร็จ' : (recovered ? 'กู้คืนและเชื่อมต่อจอเดิมสำเร็จ' : 'หน้าต่างนี้เปิดอยู่แล้ว'),
          alreadyOpen: true,
          recovered
        };
      }
      drop(existing);
    }
    await migrateProfileStorageFromDefaultContext(profile.id);
    let browserContextId = null;
    let tunnelInfo = null;
    if (screenProxy && screenProxy.isEnabled()) {
      tunnelInfo = await screenProxy.acquireForProfile(profile.id, { debugPort: profile.debugPort });
      if (!tunnelInfo || !tunnelInfo.proxyServerUrl || !tunnelInfo.lease || !tunnelInfo.lease.assigned) {
        throw new Error(tunnelInfo?.error || 'ไม่สามารถจอง Proxy IP สำหรับจอนี้ได้ ระบบบล็อคการเปิดจอผ่านเน็ตบ้านอัตโนมัติ');
      }
      try {
        const ctxRes = await send('Target.createBrowserContext', {
          disposeOnDetach: false,
          proxyServer: tunnelInfo.proxyServerUrl,
          proxyBypassList: 'localhost,127.0.0.1'
        });
        browserContextId = ctxRes?.browserContextId || null;
      } catch (e) {
        console.warn(`[BrowserMode] createBrowserContext proxy failed for ${profile.id}: ${e.message}`);
        throw new Error(`สร้างช่องทางแยก Proxy IP ไม่สำเร็จ (${e.message}) — บล็อคการเปิดจอผ่านเน็ตบ้านอัตโนมัติ`);
      }
      if (!browserContextId) {
        throw new Error('สร้าง BrowserContext สำหรับแยก Proxy IP ไม่สำเร็จ — บล็อคการเปิดจอผ่านเน็ตบ้านอัตโนมัติ');
      }
      // Align this profile's Device ID strictly to the IP Group of its newly acquired Proxy IP
      rebalanceDeviceGroups(profile.id, true);
    }
    if (tunnelInfo?.lease?.proxyHost || tunnelInfo?.lease?.ip) {
      await waitSameProxyIpLaunchStagger(tunnelInfo.lease.proxyHost || tunnelInfo.lease.ip);
    }
    const createParams = browserContextId
      ? { url: 'about:blank', newWindow: true, browserContextId }
      : { url: 'about:blank', newWindow: true };
    const { targetId } = await send('Target.createTarget', createParams);
    const c = await attach(profile.id, targetId, true, browserContextId);
    c.initialHealthChecked = true;
    startProxy(c, profile.debugPort);
    if (isRealSession) {
      // Do NOT let a slow upstream proxy stall the 30-screen launch loop or trigger CDP ws.close()
      const navPromise = send('Page.navigate', { url: gameUrl }, c.sessionId, 25000).catch(err => {
        console.warn(`[BrowserMode] Page.navigate delayed/warn (${profile.id}): ${err && err.message || err}`);
      });
      await Promise.race([
        navPromise,
        new Promise(r => setTimeout(r, opts && opts.fastNavigate ? 900 : 2500))
      ]);
    } else {
      await send('Page.navigate', { url: gameUrl }, c.sessionId);
    }
    for (const targetId of startupPages.splice(0)) await send('Target.closeTarget', { targetId }).catch(() => {});
    const proxyTag = tunnelInfo?.lease?.proxyHost
      ? ` (IP: ${tunnelInfo.lease.ip || tunnelInfo.lease.proxyHost} [${tunnelInfo.lease.slotNo || tunnelInfo.lease.slot || 1}/${tunnelInfo.lease.maxScreens || tunnelInfo.lease.maxSlots || 6}])`
      : '';
    return { success: true, message: `เปิดหน้าต่างเบราว์เซอร์แล้ว${proxyTag}` };
  }
  async function stop(profileId) {
    stoppedProfiles.add(profileId);
    const c = clients.get(profileId);
    if (c) {
      await closeOutlookTab(c).catch(() => {});
      await syncClientStorage(c).catch(() => {});
    }
    const targetId=c?.targetId||knownTargets.get(profileId);knownTargets.delete(profileId);saveKnownTargets();
    if (targetId && knownProxyContexts.delete(targetId)) saveKnownProxyContexts();
    const oldCtxId = c?.browserContextId || null;
    diagnostics.set(profileId,{gameAlive:null,botReady:false,state:'explicitly-stopped'});
    if (screenProxy) await screenProxy.releaseProfile(profileId, 'stopped').catch(() => {});
    if (!targetId) return false;
    if(c)drop(c);
    await connect().then(async () => {
      await send('Target.closeTarget', { targetId }).catch(() => {});
      if (oldCtxId) await send('Target.disposeBrowserContext', { browserContextId: oldCtxId }).catch(() => {});
    }).catch(() => {});
    return true;
  }
  async function stopAll() {
    const allPids = new Set([
      ...clients.keys(),
      ...knownTargets.keys(),
      ...((typeof loadProfiles === 'function' ? (loadProfiles() || []) : []).map(p => p && p.id).filter(Boolean))
    ]);
    for (const pid of allPids) {
      await stop(pid).catch(() => {});
    }
    knownTargets.clear();
    saveKnownTargets();
    knownProxyContexts.clear();
    saveKnownProxyContexts();
    await connect().then(async () => {
      const res = await send('Target.getTargets').catch(() => null);
      const infos = Array.isArray(res?.targetInfos) ? res.targetInfos : [];
      for (const t of infos) {
        if (t && t.type === 'page' && t.targetId && (/nightcamp\.app|signup\.live\.com|login\.live\.com|outlook\.live\.com|account\.microsoft\.com/i.test(t.url || '') || t.url === 'about:blank')) {
          await send('Target.closeTarget', { targetId: t.targetId }).catch(() => {});
        }
      }
    }).catch(() => {});
    return true;
  }
  const isOpen = profileId => clients.has(profileId);
  const hasProxyContext = profileId => {
    const c = clients.get(profileId);
    return Boolean(c && (c.browserContextId || knownProxyContexts.has(c.targetId)));
  };
  function findClientByPort(port) {
    const numPort = Number(port) || 0;
    if (!numPort) return null;
    for (const c of clients.values()) {
      if (c && Number(c.port) === numPort) return c;
    }
    const allProfiles = (typeof loadProfiles === 'function' ? loadProfiles() : []) || [];
    const matched = allProfiles.find(p => p && Number(p.debugPort) === numPort);
    return matched ? (clients.get(matched.id) || null) : null;
  }
  function ensureProxyListening(profileId, debugPort) {
    const c = clients.get(profileId);
    if (!c) return false;
    const targetPort = Number(debugPort || c.port) || 0;
    if (!targetPort) return false;
    if (c.server && c.server.listening) return true;
    if (c.server && !c.server.listening) {
      stopProxy(c);
    }
    startProxy(c, targetPort);
    return Boolean(c.server);
  }
  async function evalByPort(port, code, timeoutMs = 8000) {
    const c = findClientByPort(port);
    if (!c || !c.sessionId) return null;
    const targetPort = Number(port || c.port) || 0;
    if (targetPort && (!c.server || !c.server.listening)) {
      ensureProxyListening(c.profileId, targetPort);
    }
    const isLiveStateProbe = typeof code === 'string' && code.includes('__getClientLiveState') && code.includes('grossZenyGained');
    try {
      const result = await evaluate(c, code, Number(timeoutMs) || 8000, !isLiveStateProbe);
      if (isLiveStateProbe && result && typeof result === 'object') {
        c.lastGoodState = result;
        c.lastGoodStateAt = Date.now();
        c.stateFailCount = 0;
        c.firstStateFailAt = 0;
      }
      return { success: true, result };
    } catch (e) {
      if (isGoneError(e)) drop(c);
      return { success: false, error: e.message || String(e) };
    }
  }

  async function applyProxyModeToOpenWindows({ onlyProfileIds } = {}) {
    if (!screenProxy) return { switched: 0, updatedTunnels: 0, details: [] };
    await connect().catch(() => {});
    const customContexts = await getCustomBrowserContexts();
    if (!customContexts) return { switched: 0, updatedTunnels: 0, details: [], skipped: 'cdp_contexts_unavailable' };
    const allProfiles = loadProfiles() || [];
    const filterSet = Array.isArray(onlyProfileIds) && onlyProfileIds.length > 0 ? new Set(onlyProfileIds) : null;
    let switched = 0;
    let updatedTunnels = 0;
    const details = [];

    for (const c of Array.from(clients.values())) {
      if (filterSet && !filterSet.has(c.profileId)) continue;
      if (migratingProxyProfiles.has(c.profileId)) continue;
      if (customContexts.size > 0 && c.browserContextId && !customContexts.has(c.browserContextId) && knownProxyContexts.get(c.targetId) !== c.browserContextId) {
        c.browserContextId = null;
      }
      const profile = allProfiles.find(p => p.id === c.profileId) || { id: c.profileId, debugPort: c.port };
      migratingProxyProfiles.add(c.profileId);
      try {
        await syncClientStorage(c).catch(() => {});
        if (!screenProxy.isEnabled()) {
          await screenProxy.releaseProfile(c.profileId, 'disabled').catch(() => {});
          updatedTunnels++;
          details.push({ profileId: c.profileId, action: 'direct-tunnel' });
          continue;
        }
        const tunnelInfo = await screenProxy.acquireForProfile(c.profileId, { debugPort: profile.debugPort });
        rebalanceDeviceGroups(c.profileId, true);
        if (tunnelInfo?.lease?.useHomeIp || tunnelInfo?.lease?.directHomeIp) {
          updatedTunnels++;
          details.push({ profileId: c.profileId, action: 'home-ip-direct' });
          continue;
        }
        if (c.browserContextId && (customContexts.has(c.browserContextId) || knownProxyContexts.get(c.targetId) === c.browserContextId)) {
          // Already running in a proxy-enabled BrowserContext pointing to 127.0.0.1:<tunnelPort>
          updatedTunnels++;
          details.push({ profileId: c.profileId, action: 'tunnel-updated', proxyHost: tunnelInfo?.lease?.proxyHost || null });
          continue;
        }
        // Migrate from default context to isolated proxy BrowserContext while preserving window bounds
        if (tunnelInfo && tunnelInfo.proxyServerUrl) {
          let newTargetId = null;
          let browserContextId = null;
          try {
            let savedBounds = null;
            let savedCookies = [];
            try {
              const winInfo = await send('Browser.getWindowForTarget', { targetId: c.targetId });
              if (winInfo && winInfo.bounds) savedBounds = winInfo.bounds;
            } catch (_) {}
            try {
              const cookieRes = await send('Network.getCookies', { urls: [gameUrl] }, c.sessionId, 3000);
              if (Array.isArray(cookieRes?.cookies)) savedCookies = cookieRes.cookies;
            } catch (_) {}
            const ctxRes = await send('Target.createBrowserContext', {
              disposeOnDetach: false,
              proxyServer: tunnelInfo.proxyServerUrl,
              proxyBypassList: 'localhost,127.0.0.1'
            });
            browserContextId = ctxRes?.browserContextId || null;
            if (browserContextId) {
              if (savedCookies.length > 0) {
                await send('Storage.setCookies', { cookies: savedCookies, browserContextId }, undefined, 3000).catch(() => {});
              }
              const oldTargetId = c.targetId;
              const created = await send('Target.createTarget', { url: 'about:blank', newWindow: true, browserContextId });
              newTargetId = created?.targetId || null;
              if (!newTargetId) throw new Error('CREATE_TARGET_FAILED');
              // Only drop the old client AFTER the new target exists and attaches cleanly
              stopProxy(c);
              await new Promise(r => setTimeout(r, 80));
              const newClient = await attach(profile.id, newTargetId, false, browserContextId);
              // Clean up old client timers/state without deleting the newly attached clients.get(profile.id)
              c.generation++; clearTimeout(c.retryTimer); c.retryTimer = null;
              startProxy(newClient, profile.debugPort);
              if (savedBounds) {
                try {
                  const { windowId: newWinId } = await send('Browser.getWindowForTarget', { targetId: newTargetId });
                  await send('Browser.setWindowBounds', { windowId: newWinId, bounds: { windowState: 'normal' } }).catch(() => {});
                  await send('Browser.setWindowBounds', {
                    windowId: newWinId,
                    bounds: {
                      left: savedBounds.left,
                      top: savedBounds.top,
                      width: savedBounds.width,
                      height: savedBounds.height
                    }
                  }).catch(() => {});
                } catch (_) {}
              }
              if (tunnelInfo?.lease?.proxyHost || tunnelInfo?.lease?.ip) {
                await waitSameProxyIpLaunchStagger(tunnelInfo.lease.proxyHost || tunnelInfo.lease.ip);
              }
              if (isRealSession) {
                const navPromise = send('Page.navigate', { url: gameUrl }, newClient.sessionId, 25000).catch(() => {});
                await Promise.race([navPromise, new Promise(r => setTimeout(r, 2000))]);
              } else {
                await send('Page.navigate', { url: gameUrl }, newClient.sessionId);
              }
              if (oldTargetId && knownProxyContexts.delete(oldTargetId)) saveKnownProxyContexts();
              await send('Target.closeTarget', { targetId: oldTargetId }).catch(() => {});
              switched++;
              details.push({ profileId: c.profileId, action: 'recreated-with-proxy', proxyHost: tunnelInfo?.lease?.proxyHost || null });
            }
          } catch (e) {
            if (newTargetId) await send('Target.closeTarget', { targetId: newTargetId }).catch(() => {});
            if (browserContextId) await send('Target.disposeBrowserContext', { browserContextId }).catch(() => {});
            // Restore HTTP proxy on the surviving original window if migration failed mid-way
            if (clients.get(c.profileId) === c && !c.server) {
              startProxy(c, profile.debugPort);
            }
            details.push({ profileId: c.profileId, action: 'error', error: e.message });
          }
        }
      } finally {
        migratingProxyProfiles.delete(c.profileId);
      }
    }
    rebalanceDeviceGroups(null, true);
    return { switched, updatedTunnels, details };
  }

  async function syncAssetCacheToOpenWindows() {
    if (!effectiveAssetCache) return { synced: 0 };
    const enabled = effectiveAssetCache.isEnabled();
    let synced = 0;
    for (const c of Array.from(clients.values())) {
      if (!c.sessionId) continue;
      try {
        await configureSessionAssetCache(c.sessionId);
        await evaluate(c, `window.__pmLocalAssetCacheEnabled = ${Boolean(enabled)};`, 2500).catch(() => {});
        synced++;
      } catch (_) {}
    }
    return { synced, enabled };
  }

  let levelDbHarvestPromise = null;
  async function harvestAllFromBrowserLevelDb() {
    if (!storageDir) return { harvestedProfiles: 0, totalKeys: 0 };
    if (levelDbHarvestPromise) return levelDbHarvestPromise;
    levelDbHarvestPromise = (async () => {
      let targetId = null;
      const byProfile = {};
      let totalKeys = 0;
      try {
        const levelDbDir = path.join(userDataDir, 'Default', 'Local Storage', 'leveldb');
        if (!fs.existsSync(levelDbDir)) return { harvestedProfiles: 0, totalKeys: 0 };
        const diskHarvest = extractPelicanStorageFromLevelDb(levelDbDir);
        if (diskHarvest && diskHarvest.byProfile) {
          for (const [pid, map] of Object.entries(diskHarvest.byProfile)) {
            if (!byProfile[pid]) byProfile[pid] = {};
            for (const [k, v] of Object.entries(map)) {
              if (k.endsWith('__auth_cfg') && byProfile[pid][k]) {
                byProfile[pid][k] = mergeAuthConfigString(byProfile[pid][k], v);
              } else {
                byProfile[pid][k] = v;
              }
              totalKeys++;
            }
          }
          for (const [pid, map] of Object.entries(byProfile)) {
            saveProfileStorage(pid, map);
          }
        }
        const donor = Array.from(clients.values()).find(x => !x.browserContextId && x.sessionId) || Array.from(clients.values()).find(x => x.sessionId);
        if (donor) {
          try {
            const origin = new URL(gameUrl).origin;
            const allKeys = await evaluate(donor, `(() => {
              if (!window.location || window.location.origin !== ${JSON.stringify(origin)} || !window.localStorage) return null;
              const out = {};
              for (let i = 0; i < window.localStorage.length; i++) {
                const k = window.localStorage.key(i);
                if (!k || !k.startsWith('pelican_')) continue;
                const v = window.localStorage[k];
                if (typeof v === 'string') out[k] = v;
              }
              return out;
            })()`, 4000);
            if (allKeys && typeof allKeys === 'object') {
              for (const [k, v] of Object.entries(allKeys)) {
                if (typeof v !== 'string') continue;
                const m = k.match(/^pelican_((?:profile|af)_[a-zA-Z0-9_]+)__/);
                if (m && m[1]) {
                  if (!byProfile[m[1]]) byProfile[m[1]] = {};
                  if (k.endsWith('__auth_cfg') && byProfile[m[1]][k]) {
                    byProfile[m[1]][k] = mergeAuthConfigString(byProfile[m[1]][k], v);
                  } else {
                    byProfile[m[1]][k] = v;
                  }
                  totalKeys++;
                }
              }
              for (const [pid, map] of Object.entries(byProfile)) {
                saveProfileStorage(pid, map);
              }
            }
          } catch (_) {}
        }
        return { harvestedProfiles: Object.keys(byProfile).length, totalKeys };
      } catch (_) {
        return { harvestedProfiles: Object.keys(byProfile).length, totalKeys };
      } finally {
        if (targetId) await send('Target.closeTarget', { targetId }, undefined, 3000).catch(() => {});
        levelDbHarvestPromise = null;
      }
    })();
    return levelDbHarvestPromise;
  }

  let proxyMigrationInFlight = false;
  const nextNavigateAtByProxyIp = new Map();

  async function waitSameProxyIpLaunchStagger(proxyHost) {
    if (!isRealSession || !proxyHost) return;
    const key = String(proxyHost).trim().toLowerCase();
    if (!key) return;
    const nowMs = Date.now();
    const prevReadyAt = nextNavigateAtByProxyIp.get(key) || 0;
    const waitMs = Math.max(0, prevReadyAt - nowMs);
    const gapMs = 2200 + Math.floor(Math.random() * 1000);
    nextNavigateAtByProxyIp.set(key, Math.max(nowMs, prevReadyAt) + gapMs);
    if (waitMs > 0) {
      await new Promise(r => setTimeout(r, Math.min(waitMs, 15000)));
    }
  }
  function start() {
    if(started)return;started=true;
    try {
      initDeviceIdsFromStorage();
      const all = typeof loadProfiles === 'function' ? (loadProfiles() || []) : [];
      for (const p of all) {
        if (p && p.id) ensureProfileDeviceId(p.id);
      }
    } catch (_) {}
    // reconnect immediately to a browser left open by a previous Manager run (e.g. exit-75 self-update)
    setTimeout(() => {if(started)rediscover().catch(() => {});}, 150);
    monitorTimer=setInterval(()=>{
      const now = Date.now();
      let syncedCount = 0;
      for (const c of clients.values()) {
        if (!c.stateEvalPromise && !c.injectionInFlight && (now - (c.lastStorageSyncAt || 0) > 60000)) {
          c.lastStorageSyncAt = now;
          syncClientStorage(c).catch(() => {});
          if (++syncedCount >= 4) break;
        }
      }
      if (isRealSession && screenProxy && screenProxy.isEnabled() && !phase2Running && !proxyMigrationInFlight) {
        const unproxiedIds = [];
        for (const c of clients.values()) {
          if (!c || !c.profileId || c.browserContextId || stoppedProfiles.has(c.profileId)) continue;
          if (migratingProxyProfiles.has(c.profileId)) continue;
          if (knownProxyContexts.has(c.targetId)) continue;
          if (c.createdAt && (now - c.createdAt < 20000)) continue;
          const snap = typeof screenProxy.getProfileLeaseSnapshot === 'function'
            ? screenProxy.getProfileLeaseSnapshot(c.profileId)
            : null;
          if (snap && (snap.useHomeIp || snap.directHomeIp)) continue;
          unproxiedIds.push(c.profileId);
          if (unproxiedIds.length >= 4) break;
        }
        if (unproxiedIds.length > 0) {
          proxyMigrationInFlight = true;
          applyProxyModeToOpenWindows({ onlyProfileIds: unproxiedIds }).catch(() => {}).finally(() => {
            proxyMigrationInFlight = false;
          });
        }
      }
      rediscover().catch(()=>scheduleReconnect());
    },15000);monitorTimer.unref?.();
  }

  function dispose(){
    started=false;clearTimeout(reconnectTimer);reconnectTimer=null;clearInterval(monitorTimer);monitorTimer=null;
    for(const c of [...clients.values()]){stoppedProfiles.add(c.profileId);clearTimeout(c.retryTimer);drop(c);}
    if(ws){const socket=ws;ws=null;socket.close();}
    for(const entry of pending.values()){clearTimeout(entry.timer);entry.reject(Error('BROWSER_MODE_DISPOSED'));}pending.clear();
    stopAllUnbanSessions().catch(() => {});
  }

  // ====================== UNBAN MODE ======================
  // Launches a separate browser window with DataImpulse Mobile Proxy (Thai IP),
  // full CDP mobile emulation (UA override, touch, screen, joystick), NO bot injection,
  // and monitors whether the character has exited the jail map (= unbanned).
  // On success: plays a notification sound, clears jail status, closes the window, removes from pool.
  const net = require('net');
  const dataDir = isRealSession ? path.join(__dirname, 'data') : null;
  const unbanSessions = new Map(); // profileId -> session object
  const unbanConfigFile = dataDir ? path.join(dataDir, 'unban_config.json') : null;

  function loadUnbanConfig() {
    if (!unbanConfigFile) return { profileIds: [], devicesByProfile: {}, useMobileProxy: false };
    try {
      const raw = JSON.parse(fs.readFileSync(unbanConfigFile, 'utf8'));
      const profileIds = Array.isArray(raw.profileIds)
        ? [...new Set(raw.profileIds.filter(id => typeof id === 'string' && id.trim()).map(id => id.trim()))]
        : [];
      const devicesByProfile = (raw.devicesByProfile && typeof raw.devicesByProfile === 'object' && !Array.isArray(raw.devicesByProfile))
        ? { ...raw.devicesByProfile }
        : {};
      return {
        profileIds,
        devicesByProfile,
        useMobileProxy: raw.useMobileProxy === true
      };
    } catch (_) {
      return { profileIds: [], devicesByProfile: {}, useMobileProxy: false };
    }
  }

  function saveUnbanConfig(cfg) {
    if (!unbanConfigFile) return;
    try {
      fs.mkdirSync(path.dirname(unbanConfigFile), { recursive: true });
      const clean = {
        profileIds: Array.isArray(cfg?.profileIds) ? [...new Set(cfg.profileIds)] : [],
        devicesByProfile: (cfg?.devicesByProfile && typeof cfg.devicesByProfile === 'object') ? cfg.devicesByProfile : {},
        useMobileProxy: Boolean(cfg?.useMobileProxy)
      };
      const tmp = unbanConfigFile + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(clean, null, 2), 'utf8');
      try { fs.renameSync(tmp, unbanConfigFile); } catch (_) {
        try { fs.unlinkSync(tmp); } catch (__) {}
        fs.writeFileSync(unbanConfigFile, JSON.stringify(clean, null, 2), 'utf8');
      }
    } catch (_) {}
  }

  function setUnbanProxyMode(useMobileProxy) {
    const cfg = loadUnbanConfig();
    cfg.useMobileProxy = Boolean(useMobileProxy);
    saveUnbanConfig(cfg);
    return getUnbanStatus();
  }

  function ensureUnbanProfileDeviceIdentity(profileId, forceRotate = false) {
    const cfg = loadUnbanConfig();
    if (!cfg.devicesByProfile) cfg.devicesByProfile = {};
    let entry = cfg.devicesByProfile[profileId];
    if (forceRotate || !entry || !UUID_V4_RE.test(entry.deviceId || '') || !SHA256_HEX_RE.test(entry.machineId || '')) {
      const deviceId = crypto.randomUUID();
      const machineId = deriveMachineId('unban-mobile:' + deviceId + ':' + Date.now());
      const sessionTag = 'unban' + crypto.randomBytes(5).toString('hex');
      entry = {
        deviceId,
        machineId,
        sessionTag,
        updatedAt: Date.now()
      };
      cfg.devicesByProfile[profileId] = entry;
      saveUnbanConfig(cfg);
    }
    const spec = resolveDeviceSpec(entry.deviceId, 'android');
    return {
      ...entry,
      deviceSpec: {
        platform: 'android',
        model: spec.model,
        gpu: spec.gpu,
        ua: spec.ua,
        touch: spec.touch || 5,
        screen: spec.screen || '384x824',
        cores: spec.cores || 8
      }
    };
  }

  function addProfilesToUnbanPool(profileIds = []) {
    const list = Array.isArray(profileIds) ? profileIds : [profileIds];
    const cfg = loadUnbanConfig();
    const set = new Set(cfg.profileIds);
    for (const rawId of list) {
      const pid = String(rawId || '').trim();
      if (!pid) continue;
      set.add(pid);
      ensureUnbanProfileDeviceIdentity(pid, false);
    }
    const freshCfg = loadUnbanConfig();
    freshCfg.profileIds = [...set];
    saveUnbanConfig(freshCfg);
    return getUnbanStatus();
  }

  async function removeProfileFromUnbanPool(profileId) {
    const pid = String(profileId || '').trim();
    if (!pid) return getUnbanStatus();
    if (unbanSessions.has(pid)) {
      await stopUnbanSession(pid, 'removed-from-pool', true).catch(() => {});
    }
    const cfg = loadUnbanConfig();
    cfg.profileIds = cfg.profileIds.filter(id => id !== pid);
    saveUnbanConfig(cfg);
    return getUnbanStatus();
  }

  function rotateUnbanDevice(profileId) {
    const pid = String(profileId || '').trim();
    if (!pid) throw new Error('Missing profileId');
    const identity = ensureUnbanProfileDeviceIdentity(pid, true);
    return {
      success: true,
      profileId: pid,
      deviceId: identity.deviceId,
      machineId: identity.machineId,
      deviceModel: identity.deviceSpec.model,
      deviceGpu: identity.deviceSpec.gpu
    };
  }

  function getDataImpulseMobileCredentials() {
    const proxySettingsFile = dataDir ? path.join(dataDir, 'proxy_settings.json') : null;
    if (!proxySettingsFile) return null;
    try {
      const raw = JSON.parse(fs.readFileSync(proxySettingsFile, 'utf8'));
      if (!raw || !raw.proxyHost || !raw.proxyUser || !raw.proxyPass) return null;
      return {
        host: String(raw.proxyHost).trim(),
        port: Number(raw.proxyPort) || 823,
        user: String(raw.proxyUser).trim(),
        pass: String(raw.proxyPass).trim(),
        country: String(raw.country || 'th').trim()
      };
    } catch (_) {
      return null;
    }
  }

  function formatDataImpulseStickyUser(credentials, sessionTag) {
    const baseUser = String(credentials.user || '').replace(/__cr[.-][a-z]{2}.*$/i, '');
    const country = String(credentials.country || 'th').toLowerCase();
    const cleanTag = String(sessionTag || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 28) || 'unban1';
    if (/dataimpulse/i.test(credentials.host || '')) {
      return `${baseUser}__cr.${country};sessid.${cleanTag};sessttl.30`;
    }
    return `${baseUser}__cr-${country}__session-${cleanTag}`;
  }

  function shouldRouteViaUnbanMobileProxy(hostname) {
    const h = String(hostname || '').toLowerCase();
    if (!h) return false;
    return (
      h === 'nightcamp.app' ||
      h.endsWith('.nightcamp.app') ||
      h.endsWith('.cloudfront.net') ||
      h === 'api.ipify.org' ||
      h.includes('ipify') ||
      h.includes('turnstile') ||
      h.includes('challenges.cloudflare.com')
    );
  }

  function connectUpstreamHttpProxy({ proxyHost, proxyPort, proxyUser, proxyPass, targetHost, targetPort, timeoutMs = 14000 }) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const headers = {
        Host: `${targetHost}:${targetPort}`,
        'Proxy-Authorization': 'Basic ' + Buffer.from(`${proxyUser || ''}:${proxyPass || ''}`).toString('base64')
      };
      const req = http.request({
        host: proxyHost,
        port: proxyPort,
        method: 'CONNECT',
        path: `${targetHost}:${targetPort}`,
        headers,
        timeout: timeoutMs
      });
      const fail = err => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        req.destroy();
        reject(err instanceof Error ? err : new Error(String(err)));
      };
      const timer = setTimeout(() => fail(new Error('DATAIMPULSE_PROXY_TIMEOUT')), timeoutMs);
      timer.unref?.();
      req.on('connect', (res, socket, head) => {
        if (settled) { socket.destroy(); return; }
        if (res.statusCode !== 200) {
          socket.destroy();
          return fail(new Error(`DATAIMPULSE_HTTP_${res.statusCode}`));
        }
        settled = true;
        clearTimeout(timer);
        socket.setTimeout(0);
        socket.setNoDelay(true);
        try { socket.setKeepAlive(true, 15000); } catch (_) {}
        resolve({ socket, head });
      });
      req.on('timeout', () => fail(new Error('DATAIMPULSE_PROXY_TIMEOUT')));
      req.on('error', fail);
      req.end();
    });
  }

  function createUnbanLocalProxyTunnel(credentials, sessionTag) {
    return new Promise((resolve, reject) => {
      const upstreamUser = formatDataImpulseStickyUser(credentials, sessionTag);
      const sockets = new Set();
      const stats = { bytesIn: 0, bytesOut: 0 };

      const server = http.createServer((clientReq, clientRes) => {
        try {
          const parsed = new URL(clientReq.url);
          const targetHost = parsed.hostname;
          const targetPort = Number(parsed.port) || 80;
          if (!shouldRouteViaUnbanMobileProxy(targetHost)) {
            const directReq = http.request({
              hostname: targetHost,
              port: targetPort,
              path: parsed.pathname + parsed.search,
              method: clientReq.method,
              headers: clientReq.headers
            }, directRes => {
              clientRes.writeHead(directRes.statusCode || 502, directRes.headers);
              directRes.pipe(clientRes);
            });
            directReq.on('error', () => { try { clientRes.writeHead(502); clientRes.end(); } catch (_) {} });
            clientReq.pipe(directReq);
            return;
          }
          const headers = { ...clientReq.headers };
          headers['Proxy-Authorization'] = 'Basic ' + Buffer.from(`${upstreamUser}:${credentials.pass}`).toString('base64');
          const proxyReq = http.request({
            host: credentials.host,
            port: credentials.port,
            method: clientReq.method,
            path: clientReq.url,
            headers
          }, proxyRes => {
            proxyRes.on('data', chunk => { stats.bytesIn += chunk.length; });
            clientRes.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
            proxyRes.pipe(clientRes);
          });
          clientReq.on('data', chunk => { stats.bytesOut += chunk.length; });
          proxyReq.on('error', () => { try { clientRes.writeHead(502); clientRes.end(); } catch (_) {} });
          clientReq.pipe(proxyReq);
        } catch (_) {
          try { clientRes.writeHead(400); clientRes.end(); } catch (__) {}
        }
      });

      server.on('connect', async (req, clientSocket, head) => {
        sockets.add(clientSocket);
        clientSocket.on('close', () => sockets.delete(clientSocket));
        clientSocket.on('error', () => {});
        const [rawHost, rawPort] = String(req.url || '').split(':');
        const targetHost = String(rawHost || '').trim();
        const targetPort = Number(rawPort) || 443;
        if (!targetHost) {
          try { clientSocket.end('HTTP/1.1 400 Bad Request\r\n\r\n'); } catch (_) {}
          return;
        }
        try {
          if (!shouldRouteViaUnbanMobileProxy(targetHost)) {
            const directSock = net.connect({ host: targetHost, port: targetPort }, () => {
              try {
                clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
                if (head && head.length) directSock.write(head);
                directSock.pipe(clientSocket);
                clientSocket.pipe(directSock);
              } catch (_) { directSock.destroy(); clientSocket.destroy(); }
            });
            sockets.add(directSock);
            directSock.on('close', () => sockets.delete(directSock));
            directSock.on('error', () => { try { clientSocket.destroy(); } catch (_) {} });
            return;
          }
          const { socket: upSock, head: upHead } = await connectUpstreamHttpProxy({
            proxyHost: credentials.host,
            proxyPort: credentials.port,
            proxyUser: upstreamUser,
            proxyPass: credentials.pass,
            targetHost,
            targetPort,
            timeoutMs: 14000
          });
          sockets.add(upSock);
          upSock.on('close', () => sockets.delete(upSock));
          upSock.on('error', () => { try { clientSocket.destroy(); } catch (_) {} });
          upSock.on('data', chunk => { stats.bytesIn += chunk.length; });
          clientSocket.on('data', chunk => { stats.bytesOut += chunk.length; });
          if (head && head.length) stats.bytesOut += head.length;
          if (upHead && upHead.length) stats.bytesIn += upHead.length;
          clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
          if (upHead && upHead.length) clientSocket.write(upHead);
          if (head && head.length) upSock.write(head);
          upSock.pipe(clientSocket);
          clientSocket.pipe(upSock);
        } catch (_) {
          try { clientSocket.end('HTTP/1.1 502 Bad Gateway\r\n\r\n'); } catch (__) { clientSocket.destroy(); }
        }
      });

      server.on('error', reject);
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        const port = addr && typeof addr === 'object' ? addr.port : 0;
        resolve({
          server,
          port,
          proxyServerUrl: `http://127.0.0.1:${port}`,
          upstreamUser,
          stats,
          close: () => {
            for (const s of sockets) { try { s.destroy(); } catch (_) {} }
            sockets.clear();
            try { server.close(); } catch (_) {}
          }
        });
      });
    });
  }

  function getProfileAuthCredentials(profileId) {
    let username = '';
    let password = '';
    let charName = '';
    try {
      const saved = loadProfileStorage(profileId);
      const rawAuth = saved[`pelican_${profileId}__auth_cfg`] || saved['pelican_auth_cfg'] || '';
      if (rawAuth) {
        const parsed = JSON.parse(rawAuth);
        if (parsed && typeof parsed === 'object') {
          if (parsed.username) username = String(parsed.username).trim();
          if (parsed.password) password = String(parsed.password);
          if (parsed.charName) charName = String(parsed.charName).trim();
        }
      }
    } catch (_) {}
    try {
      const list = typeof loadProfiles === 'function' ? (loadProfiles() || []) : [];
      const p = list.find(item => item && String(item.id) === String(profileId));
      if (p) {
        if (!username && p.account) username = String(p.account).trim();
        if (!password && p.password) password = String(p.password);
        if (!charName && (p.lastCharName || p.charName)) charName = String(p.lastCharName || p.charName).trim();
      }
    } catch (_) {}
    try {
      if (!password) {
        const credsMod = require('./credentials');
        const pw = credsMod && typeof credsMod.getPassword === 'function' ? credsMod.getPassword(profileId) : '';
        if (pw) password = String(pw);
      }
    } catch (_) {}
    if (username && password) {
      return { username, password, charName };
    }
    return null;
  }

  function unbanInitScript(profileId, identity) {
    const { deviceId, machineId, deviceSpec } = identity;
    const authCreds = getProfileAuthCredentials(profileId);
    // Pure stealth init script for unban mode:
    // - Wrapped inside a private closure (IIFE) — ZERO __pm* properties exposed on window!
    // - Scrubs CDP/WebDriver automation markers
    // - Spoofs screen dimensions, devicePixelRatio, navigator, WebGL GPU, SHA-256 machineId
    // - Enables mobile virtual joystick
    // - NO bot.js or HUD injected!
    // - Auto-fills login credentials once so the user doesn't have to type them manually
    return `(function() {
      const __devId = ${JSON.stringify(deviceId)};
      const __machId = ${JSON.stringify(machineId)};
      const __spec = ${JSON.stringify(deviceSpec)};
      try {
        const __cleanAutomationProps = function(obj) {
          if (!obj) return;
          try {
            const names = Object.getOwnPropertyNames(obj);
            for (let i = 0; i < names.length; i++) {
              const k = names[i];
              if (k.indexOf('cdc_') !== -1 || k.indexOf('wdc_') !== -1 || k.indexOf('__webdriver') !== -1 || k.indexOf('__selenium') !== -1 || k.indexOf('__playwright') !== -1 || k.indexOf('__puppeteer') !== -1 || k.indexOf('__pm') === 0) {
                try { delete obj[k]; } catch (_) {}
              }
            }
          } catch (_) {}
        };
        __cleanAutomationProps(window);
        if (typeof document !== 'undefined') __cleanAutomationProps(document);
      } catch (_) {}
      try {
        if (window.localStorage) {
          window.localStorage.setItem('aetheria.device', __devId);
          window.localStorage.setItem('aetheria.machine', __machId);
          const __rawM = window.localStorage.getItem('webgame.mobile');
          const __mob = __rawM ? JSON.parse(__rawM) : {};
          __mob.joystick = true;
          __mob.newsOnEnter = false;
          window.localStorage.setItem('webgame.mobile', JSON.stringify(__mob));
        }
      } catch (_) {}
      try {
        if (typeof navigator !== 'undefined') {
          Object.defineProperty(Object.getPrototypeOf(navigator), 'webdriver', { get: function() { return false; }, configurable: true });
          Object.defineProperty(Object.getPrototypeOf(navigator), 'platform', { get: function() { return 'Linux armv8l'; }, configurable: true });
          Object.defineProperty(Object.getPrototypeOf(navigator), 'userAgent', { get: function() { return __spec.ua; }, configurable: true });
          Object.defineProperty(Object.getPrototypeOf(navigator), 'hardwareConcurrency', { get: function() { return __spec.cores || 8; }, configurable: true });
          Object.defineProperty(Object.getPrototypeOf(navigator), 'maxTouchPoints', { get: function() { return __spec.touch || 5; }, configurable: true });
          if (!('ontouchstart' in window)) window.ontouchstart = null;
          if (__spec.screen && typeof window.screen !== 'undefined') {
            const __spParts = String(__spec.screen).split('x');
            const __sw = parseInt(__spParts[0], 10) || 384;
            const __sh = parseInt(__spParts[1], 10) || 824;
            const __scrProto = Object.getPrototypeOf(window.screen) || window.screen;
            try {
              Object.defineProperty(__scrProto, 'width', { get: function() { return __sw; }, configurable: true });
              Object.defineProperty(__scrProto, 'height', { get: function() { return __sh; }, configurable: true });
              Object.defineProperty(__scrProto, 'availWidth', { get: function() { return __sw; }, configurable: true });
              Object.defineProperty(__scrProto, 'availHeight', { get: function() { return __sh; }, configurable: true });
              Object.defineProperty(__scrProto, 'colorDepth', { get: function() { return 24; }, configurable: true });
              Object.defineProperty(__scrProto, 'pixelDepth', { get: function() { return 24; }, configurable: true });
            } catch (_) {}
          }
          try {
            Object.defineProperty(window, 'devicePixelRatio', { get: function() { return 3; }, configurable: true });
          } catch (_) {}
          if (typeof window.matchMedia === 'function') {
            const __origMatchMedia = window.matchMedia.bind(window);
            window.matchMedia = function(q) {
              const res = __origMatchMedia(q);
              const qs = String(q || '').toLowerCase();
              if (qs.indexOf('pointer') !== -1 && qs.indexOf('coarse') !== -1) {
                return Object.assign({}, res, { matches: true, media: q });
              }
              if ((qs.indexOf('pointer') !== -1 && qs.indexOf('fine') !== -1) || (qs.indexOf('hover') !== -1 && qs.indexOf('none') === -1)) {
                return Object.assign({}, res, { matches: false, media: q });
              }
              return res;
            };
          }
        }
      } catch (_) {}
      try {
        if (typeof console !== 'undefined' && typeof console.debug === 'function') {
          const __origConsoleDebug = console.debug.bind(console);
          console.debug = function() {
            try {
              for (let i = 0; i < arguments.length; i++) {
                const arg = arguments[i];
                if (arg && (arg instanceof Error || typeof arg === 'object')) {
                  const desc = Object.getOwnPropertyDescriptor(arg, 'stack');
                  if (desc && typeof desc.get === 'function') return;
                }
              }
            } catch (_) {}
            return __origConsoleDebug.apply(console, arguments);
          };
        }
      } catch (_) {}
      try {
        const __hexToBytes = function(hex) {
          const arr = new Uint8Array(32);
          for (let i = 0; i < 32; i++) arr[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16) || 0;
          return arr.buffer;
        };
        if (typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.digest === 'function') {
          const __origDigest = crypto.subtle.digest.bind(crypto.subtle);
          crypto.subtle.digest = function(algo, data) {
            try {
              const algoName = typeof algo === 'string' ? algo : (algo && algo.name ? String(algo.name) : '');
              if (algoName.toUpperCase() === 'SHA-256' && data && typeof TextDecoder !== 'undefined') {
                const txt = new TextDecoder().decode(data);
                if (txt && txt.split('|').length === 7 && (txt.endsWith('|win') || txt.endsWith('|mac') || txt.endsWith('|linux') || txt.endsWith('|android') || txt.endsWith('|ios') || txt.endsWith('|other'))) {
                  return Promise.resolve(__hexToBytes(__machId));
                }
              }
            } catch (_) {}
            return __origDigest(algo, data);
          };
        }
      } catch (_) {}
      try {
        const __patchWebGl = function(ctor) {
          if (!ctor || !ctor.prototype || typeof ctor.prototype.getParameter !== 'function') return;
          const __origGetParam = ctor.prototype.getParameter;
          ctor.prototype.getParameter = function(pname) {
            try {
              if (pname === 37446 && __spec && __spec.gpu) return __spec.gpu;
              if (pname === 37445 && __spec) return __spec.platform === 'android' ? 'Qualcomm' : 'Google Inc. (NVIDIA)';
            } catch (_) {}
            return __origGetParam.apply(this, arguments);
          };
        };
        if (typeof WebGLRenderingContext !== 'undefined') __patchWebGl(WebGLRenderingContext);
        if (typeof WebGL2RenderingContext !== 'undefined') __patchWebGl(WebGL2RenderingContext);
      } catch (_) {}
      try {
        const __origFetch = window.fetch;
        if (typeof __origFetch === 'function') {
          window.fetch = function(input, init) {
            try {
              const url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
              if ((url.includes('/world/enter') || url.includes('/auth/')) && init && init.body && typeof init.body === 'string') {
                const parsed = JSON.parse(init.body);
                if (parsed && typeof parsed === 'object') {
                  if (url.includes('/world/enter') || 'deviceId' in parsed) parsed.deviceId = __devId;
                  if (url.includes('/world/enter') || 'machineId' in parsed) parsed.machineId = __machId;
                  if (__spec) {
                    if ((url.includes('/world/enter') || 'gpu' in parsed) && __spec.gpu) parsed.gpu = __spec.gpu;
                    if ((url.includes('/world/enter') || 'ua' in parsed) && __spec.ua) parsed.ua = __spec.ua;
                    if ((url.includes('/world/enter') || 'touch' in parsed) && typeof __spec.touch === 'number') parsed.touch = __spec.touch;
                  }
                  init = Object.assign({}, init, { body: JSON.stringify(parsed) });
                }
              }
            } catch (_) {}
            return __origFetch.apply(this, arguments);
          };
        }
      } catch (_) {}
      ${authCreds ? `
      try {
        const __creds = ${JSON.stringify(authCreds)};
        let __lastSubmitAt = 0;
        let __lastEnterAt = 0;
        let __submitCount = 0;
        const __setInputVal = function(el, val) {
          if (!el) return;
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
          if (setter) setter.call(el, val);
          else el.value = val;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        };
        const __clickEl = function(el) {
          if (!el) return;
          try { el.click(); } catch (_) {}
        };
        const __loginTimer = setInterval(function() {
          try {
            const hasMinimap = !!document.querySelector('.minimap, [class*="minimap"]');
            const loginForm = document.querySelector('form.login-form');
            const charCards = Array.from(document.querySelectorAll('.char-card:not(.empty):not(.pending-delete)')).filter(function(el) {
              return el.offsetWidth > 0 && el.offsetHeight > 0;
            });
            if (hasMinimap && !loginForm && charCards.length === 0) {
              clearInterval(__loginTimer);
              return;
            }
            const now = Date.now();
            if (loginForm) {
              const inputs = Array.from(loginForm.querySelectorAll('input')).filter(function(el) {
                return el.type !== 'checkbox' && el.type !== 'hidden' && el.offsetWidth > 0;
              });
              if (inputs.length >= 3) {
                const toLoginBtn = Array.from(loginForm.querySelectorAll('button.login-link, button.ghost, .login-links button, button, a')).find(function(b) {
                  const t = String(b.innerText || b.textContent || b.value || '').trim();
                  return t.indexOf('มีบัญชีแล้ว') !== -1 || t.indexOf('เข้าสู่ระบบ') !== -1 || t.indexOf('Log in') !== -1 || t.indexOf('Sign in') !== -1;
                });
                if (toLoginBtn) {
                  __clickEl(toLoginBtn);
                  return;
                }
              }
              const passEl = loginForm.querySelector('input[type="password"]');
              const userEl = inputs.find(function(el) { return el.type !== 'password'; }) || loginForm.querySelector('input[type="text"]');
              if (userEl && passEl && inputs.length === 2) {
                if (userEl.value !== __creds.username) __setInputVal(userEl, __creds.username);
                if (passEl.value !== __creds.password) __setInputVal(passEl, __creds.password);
                if (__submitCount < 5 && (now - __lastSubmitAt > 4500)) {
                  const submitBtn = loginForm.querySelector('button.login-go') || Array.from(loginForm.querySelectorAll('button, input[type="submit"]')).find(function(b) {
                    if (b.disabled || b.classList.contains('ghost') || b.classList.contains('login-link')) return false;
                    const t = String(b.innerText || b.textContent || b.value || '').trim();
                    if (t.indexOf('เล่นทันที') !== -1 || t.indexOf('ไม่ต้องสมัคร') !== -1 || t.indexOf('สมัครบัญชีใหม่') !== -1 || t.indexOf('มีบัญชีแล้ว') !== -1) return false;
                    return t === 'เข้าเกม' || t === 'เข้าสู่ระบบ' || t === 'Login' || t === 'Sign In' || b.type === 'submit';
                  });
                  if (submitBtn && !submitBtn.disabled) {
                    __lastSubmitAt = now;
                    __submitCount++;
                    setTimeout(function() {
                      try {
                        if (typeof loginForm.requestSubmit === 'function') {
                          loginForm.requestSubmit(submitBtn);
                          return;
                        }
                      } catch (_) {}
                      __clickEl(submitBtn);
                    }, 350);
                  }
                }
              }
              return;
            }
            if (charCards.length > 0 && (now - __lastEnterAt > 3000)) {
              let targetCard = null;
              if (__creds.charName) {
                targetCard = charCards.find(function(c) {
                  return String(c.innerText || c.textContent || '').indexOf(__creds.charName) !== -1;
                });
              }
              if (!targetCard) targetCard = charCards[0];
              if (targetCard && !targetCard.classList.contains('selected')) {
                __clickEl(targetCard);
              }
              const enterBtn = Array.from(document.querySelectorAll('button.char-enter:not([disabled]), button:not([disabled])')).find(function(b) {
                if (b.offsetWidth === 0 || b.offsetHeight === 0) return false;
                const t = String(b.innerText || b.textContent || '').trim();
                return t.indexOf('เข้าเกมด้วย') === 0 || t === 'เข้าเกม' || t === 'เริ่มเกม' || t === 'เข้าสู่โลก' || t === 'Enter World';
              });
              if (enterBtn) {
                __lastEnterAt = now;
                setTimeout(function() { __clickEl(enterBtn); }, 350);
              }
            }
          } catch (_) {}
        }, 900);
        setTimeout(function() { clearInterval(__loginTimer); }, 120000);
      } catch (_) {}
      ` : ''}
    })();`;
  }

  async function launchUnbanSession(profileId, opts = {}) {
    if (!isRealSession) throw new Error('Unban mode requires real browser session');
    const pid = String(profileId || '').trim();
    if (!pid) throw new Error('Missing profileId');
    if (unbanSessions.has(pid)) throw new Error('จอนี้อยู่ในโหมดปลดอยู่แล้ว');
    if (clients.has(pid)) throw new Error('จอนี้กำลังเปิดอยู่ในโหมดบอท กรุณาปิดจอก่อนเข้าโหมดปลด');

    const cfgNow = loadUnbanConfig();
    const useMobileProxy = opts.useMobileProxy !== undefined ? Boolean(opts.useMobileProxy) : Boolean(cfgNow.useMobileProxy);
    let credentials = null;
    if (useMobileProxy) {
      credentials = getDataImpulseMobileCredentials();
      if (!credentials) throw new Error('ไม่พบข้อมูล DataImpulse Mobile Proxy — กรุณาตั้งค่า Proxy หรือสลับเป็นโหมดเน็ตบ้าน / Wi-Fi');
    }

    await connect();

    const identity = ensureUnbanProfileDeviceIdentity(pid, Boolean(opts.rotateDevice));
    const { deviceSpec, sessionTag, deviceId, machineId } = identity;

    // Only start DataImpulse tunnel if explicitly enabled; otherwise use direct home internet (Wi-Fi) to save GB!
    const tunnel = useMobileProxy ? await createUnbanLocalProxyTunnel(credentials, sessionTag) : null;

    let browserContextId = null;
    try {
      const ctxParams = tunnel
        ? {
            disposeOnDetach: false,
            proxyServer: tunnel.proxyServerUrl,
            proxyBypassList: 'localhost,127.0.0.1'
          }
        : {
            disposeOnDetach: false
          };
      const ctxRes = await send('Target.createBrowserContext', ctxParams);
      browserContextId = ctxRes?.browserContextId || null;
    } catch (e) {
      if (tunnel) tunnel.close();
      throw new Error(`สร้าง BrowserContext สำหรับโหมดปลดไม่สำเร็จ: ${e.message}`);
    }
    if (!browserContextId) {
      if (tunnel) tunnel.close();
      throw new Error('สร้าง BrowserContext สำหรับโหมดปลดไม่สำเร็จ');
    }

    const { targetId } = await send('Target.createTarget', {
      url: 'about:blank',
      newWindow: true,
      browserContextId
    });

    const attachRes = await send('Target.attachToTarget', { targetId, flatten: true });
    const sessionId = attachRes?.sessionId;
    if (!sessionId) {
      if (tunnel) tunnel.close();
      await send('Target.closeTarget', { targetId }).catch(() => {});
      await send('Target.disposeBrowserContext', { browserContextId }).catch(() => {});
      throw new Error('ไม่สามารถเชื่อมต่อกับหน้าต่างโหมดปลดได้');
    }

    await applyCdpDeviceEmulation(sessionId, deviceSpec);
    await send('Page.enable', {}, sessionId, 5000).catch(() => {});
    await configureSessionAssetCache(sessionId, { forceDisable: true });

    const initScriptSrc = unbanInitScript(pid, identity);
    const addedScript = await send('Page.addScriptToEvaluateOnNewDocument', { source: initScriptSrc }, sessionId, 5000).catch(() => null);

    await send('Page.navigate', { url: gameUrl }, sessionId);

    const session = {
      profileId: pid,
      targetId,
      sessionId,
      browserContextId,
      tunnel,
      useMobileProxy,
      deviceId,
      machineId,
      deviceSpec,
      sessionTag,
      egressIp: useMobileProxy ? 'กำลังตรวจเช็ค IP ซิม...' : 'เน็ตบ้าน / Wi-Fi (กำลังเช็ค IP...)',
      currentMap: 'กำลังโหลดหน้าเกม...',
      inJail: null,
      seenInJail: false,
      outOfJailStreak: 0,
      startedAt: Date.now(),
      status: 'running', // running | unbanned | stopped
      initScriptId: addedScript?.identifier || null,
      monitorTimer: null,
      checkCount: 0
    };
    unbanSessions.set(pid, session);

    // Ensure profile is listed in unban pool
    const cfg = loadUnbanConfig();
    if (!cfg.profileIds.includes(pid)) {
      cfg.profileIds.push(pid);
      saveUnbanConfig(cfg);
    }

    // Check egress IP asynchronously inside the browser window
    setTimeout(async () => {
      if (session.status !== 'running') return;
      try {
        const ipRes = await send('Runtime.evaluate', {
          expression: `fetch('https://api.ipify.org?format=json').then(r => r.json()).then(d => d.ip || '').catch(() => '')`,
          returnByValue: true,
          awaitPromise: true,
          timeout: 10000
        }, session.sessionId, 12000);
        const ip = String(ipRes?.result?.value || '').trim();
        if (ip) session.egressIp = useMobileProxy ? `${ip} (4G/5G)` : `${ip} (Wi-Fi บ้าน)`;
      } catch (_) {}
    }, 2500).unref?.();

    startUnbanMonitor(session);

    const netModeLabel = useMobileProxy ? 'DataImpulse Mobile TH' : 'เน็ตบ้าน / Wi-Fi (ไม่เสีย GB)';
    console.log(`[UnbanMode] Started session for ${pid} via ${netModeLabel} (${deviceSpec.model})`);
    return {
      success: true,
      message: `เปิดจอโหมดปลดสำเร็จ — ${deviceSpec.model} (${netModeLabel})`,
      deviceModel: deviceSpec.model,
      useMobileProxy,
      deviceId,
      machineId
    };
  }

  function startUnbanMonitor(session) {
    if (session.monitorTimer) clearInterval(session.monitorTimer);
    // Check every 4 seconds whether the character has exited jail into a normal map
    session.monitorTimer = setInterval(async () => {
      if (session.status !== 'running' || !unbanSessions.has(session.profileId)) {
        clearInterval(session.monitorTimer);
        session.monitorTimer = null;
        return;
      }
      session.checkCount++;
      try {
        const result = await send('Runtime.evaluate', {
          expression: `(() => {
            try {
              const norm = s => String(s || '').replace(/⭐/g, '').replace(/\\s+/g, ' ').trim();
              const isInvalid = t => !t || t === '--' || t === '-' || /^\\d+\\s*ms$/i.test(t) || /^ch\\.?\\s*\\d+$/i.test(t) || /^\\(\\d+\\s*,\\s*\\d+\\)$/.test(t);
              let mapName = '';
              const el = document.querySelector('.minimap-name, .minimap-title, [class*="map-name"], [class*="map-title"]');
              if (el) {
                const t = norm(el.textContent || el.innerText || '');
                if (!isInvalid(t)) mapName = t;
              }
              if (!mapName) {
                const footerEls = Array.from(document.querySelectorAll('.minimap-footer span, .minimap-footer div, .minimap-footer b, .minimap-footer strong'));
                for (const fEl of footerEls) {
                  if (fEl.closest && fEl.closest('.ping-badge, .ch-picker, .minimap-ch, .minimap-portal, .guide-tracker, .minimap-zoom')) continue;
                  const t = norm(fEl.textContent || fEl.innerText || '');
                  if (!isInvalid(t)) { mapName = t; break; }
                }
              }
              const loginForm = document.querySelector('input[type="password"]');
              const charSelect = document.querySelector('.char-card, [class*="char-select"]');
              const hasMinimap = !!document.querySelector('.minimap, [class*="minimap"]');
              return {
                mapName,
                hasLoginForm: !!loginForm,
                hasCharSelect: !!charSelect,
                hasMinimap
              };
            } catch (e) {
              return { mapName: '', error: e.message };
            }
          })()`,
          returnByValue: true,
          awaitPromise: false,
          timeout: 3500
        }, session.sessionId, 4500);

        const val = result?.result?.value;
        if (!val) return;

        if (val.hasLoginForm) {
          session.currentMap = 'หน้าเข้าสู่ระบบ (Login)';
          session.outOfJailStreak = 0;
          return;
        }
        if (val.hasCharSelect && !val.mapName) {
          session.currentMap = 'หน้าเลือกตัวละคร';
          session.outOfJailStreak = 0;
          return;
        }

        const mapName = String(val.mapName || '').trim();
        if (!mapName) return;

        session.currentMap = mapName;
        const isJail = /คุก|เรือนจำ|\bprison\b|\bjail\b/i.test(mapName) && !/คุกใต้ดิน/i.test(mapName);
        session.inJail = isJail;

        if (isJail) {
          session.seenInJail = true;
          session.outOfJailStreak = 0;
          return;
        }

        const isKnownValidMap = mapName.length >= 2 && !/ไม่ทราบ|unknown|loading|กำลังโหลด/i.test(mapName) && val.hasMinimap;
        if (isKnownValidMap) {
          session.outOfJailStreak = (session.outOfJailStreak || 0) + 1;
          if (session.outOfJailStreak >= 2) {
            console.log(`[UnbanMode] ✅ Character ${session.profileId} UNBANNED — now in map "${mapName}"!`);
            session.status = 'unbanned';
            clearInterval(session.monitorTimer);
            session.monitorTimer = null;
            if (typeof onUnbanDetected === 'function') {
              try { onUnbanDetected(session.profileId, session); } catch (_) {}
            }
            setTimeout(() => {
              stopUnbanSession(session.profileId, 'auto-unbanned', true).catch(() => {});
            }, 1500);
          }
        }
      } catch (e) {
        if (isGoneError(e)) {
          stopUnbanSession(session.profileId, 'window-closed', false).catch(() => {});
        }
      }
    }, 4000);
    session.monitorTimer.unref?.();
  }

  let onUnbanDetected = null;
  function setUnbanCallback(fn) {
    onUnbanDetected = typeof fn === 'function' ? fn : null;
  }

  async function stopUnbanSession(profileId, reason = 'manual', removeFromPool = false) {
    const pid = String(profileId || '').trim();
    const session = unbanSessions.get(pid);
    if (session) {
      if (session.monitorTimer) {
        clearInterval(session.monitorTimer);
        session.monitorTimer = null;
      }
      session.status = 'stopped';
      unbanSessions.delete(pid);

      if (session.tunnel && typeof session.tunnel.close === 'function') {
        try { session.tunnel.close(); } catch (_) {}
      }

      try {
        await connect();
        if (session.targetId) await send('Target.closeTarget', { targetId: session.targetId }).catch(() => {});
        if (session.browserContextId) await send('Target.disposeBrowserContext', { browserContextId: session.browserContextId }).catch(() => {});
      } catch (_) {}
    }

    if (removeFromPool) {
      const cfg = loadUnbanConfig();
      cfg.profileIds = cfg.profileIds.filter(id => id !== pid);
      saveUnbanConfig(cfg);
    }

    console.log(`[UnbanMode] Stopped session for ${pid} (reason: ${reason}, removedFromPool: ${removeFromPool})`);
    return { success: true, message: removeFromPool ? 'ปิดจอและถอดออกจากวงปลดแล้ว' : 'ปิดหน้าต่างโหมดปลดแล้ว', profileId: pid };
  }

  async function stopAllUnbanSessions() {
    const pids = [...unbanSessions.keys()];
    for (const pid of pids) {
      await stopUnbanSession(pid, 'stop-all', false).catch(() => {});
    }
  }

  function getUnbanStatus() {
    const cfg = loadUnbanConfig();
    const creds = getDataImpulseMobileCredentials();
    const sessions = [];
    for (const [pid, s] of unbanSessions) {
      const bytesIn = s.tunnel?.stats?.bytesIn || 0;
      const bytesOut = s.tunnel?.stats?.bytesOut || 0;
      sessions.push({
        profileId: pid,
        status: s.status,
        useMobileProxy: Boolean(s.useMobileProxy),
        deviceId: s.deviceId,
        machineId: s.machineId,
        deviceModel: s.deviceSpec?.model || '',
        deviceGpu: s.deviceSpec?.gpu || '',
        egressIp: s.egressIp || '',
        currentMap: s.currentMap || '',
        inJail: s.inJail,
        startedAt: s.startedAt,
        runningMinutes: Math.max(0, Math.round((Date.now() - s.startedAt) / 60000)),
        bytesUsed: bytesIn + bytesOut
      });
    }
    const poolEntries = cfg.profileIds.map(pid => {
      const identity = ensureUnbanProfileDeviceIdentity(pid, false);
      const active = sessions.find(s => s.profileId === pid) || null;
      return {
        profileId: pid,
        deviceId: identity.deviceId,
        machineId: identity.machineId,
        deviceModel: identity.deviceSpec.model,
        deviceGpu: identity.deviceSpec.gpu,
        activeSession: active
      };
    });
    return {
      activeSessions: sessions,
      configuredProfileIds: cfg.profileIds,
      poolEntries,
      useMobileProxy: Boolean(cfg.useMobileProxy),
      hasCredentials: Boolean(creds),
      proxyHost: creds?.host || 'gw.dataimpulse.com',
      proxyPort: creds?.port || 823,
      country: creds?.country || 'th'
    };
  }

  // ====================== END UNBAN MODE ======================

  // ====================== SMAILPRO WEB PREMIUM SESSION & COOKIE AUTOMATION ======================
  const smailproWebState = {
    targetId: null,
    sessionId: null,
    isLoggedIn: false,
    isPremium: false,
    userText: '',
    csrfToken: '',
    cookieHeader: '',
    cookies: [],
    userAgent: '',
    lastCheckedAt: 0,
    monitorTimer: null,
    onSessionCallback: null
  };

  function setSmailProSessionCallback(fn) {
    smailproWebState.onSessionCallback = typeof fn === 'function' ? fn : null;
  }

  function parseCookieHeaderToCdpCookies(rawCookieStr) {
    const str = String(rawCookieStr || '').trim();
    if (!str) return [];
    const out = [];
    for (const part of str.split(';')) {
      const eq = part.indexOf('=');
      if (eq <= 0) continue;
      const name = part.slice(0, eq).trim();
      const value = part.slice(eq + 1).trim();
      if (!name || !value) continue;
      out.push(
        { name, value, domain: 'smailpro.com', path: '/', url: 'https://smailpro.com/temporary-email' },
        { name, value, domain: '.sonjj.com', path: '/', url: 'https://my.sonjj.com/' }
      );
    }
    return out;
  }

  async function injectSmailProHelperBanner(sessionId) {
    if (!sessionId) return;
    await send('Runtime.evaluate', {
      expression: `(() => {
        try {
          if (!document.body) return;
          const host = String(location.hostname || '').toLowerCase();
          const html = document.documentElement?.innerHTML || '';
          const alpineEl = document.querySelector('[x-data*="TemporaryEmail"]');
          const alpineData = alpineEl && alpineEl._x_dataStack && alpineEl._x_dataStack[0] ? alpineEl._x_dataStack[0] : null;
          const isLoggedIn = alpineData ? Boolean(alpineData.isLoggedIn) : /\\bisLoggedIn\\s*:\\s*true\\b/.test(html);
          const isPremium = alpineData ? Boolean(alpineData.isPremium) : /\\bisPremium\\s*:\\s*true\\b/.test(html);

          let bar = document.getElementById('pm-smailpro-helper-bar');
          if (!bar) {
            bar = document.createElement('div');
            bar.id = 'pm-smailpro-helper-bar';
            bar.style.cssText = 'position:sticky;top:0;left:0;right:0;z-index:2147483647;padding:10px 16px;font-family:system-ui,-apple-system,sans-serif;font-size:13.5px;font-weight:700;display:flex;align-items:center;justify-content:space-between;gap:12px;box-shadow:0 4px 16px rgba(0,0,0,0.35);';
            document.body.prepend(bar);
          }

          if (host === 'smailpro.com' && isLoggedIn) {
            bar.style.background = 'linear-gradient(90deg, #065f46, #047857)';
            bar.style.color = '#ecfdf5';
            bar.style.borderBottom = '2px solid #34d399';
            bar.innerHTML = '<span>✅ [Nightcamp Manager] เชื่อมต่อและจำเซสชัน SmailPro ' + (isPremium ? '👑 PREMIUM' : 'Web') + ' สำเร็จแล้ว! บอทสามารถสร้างเมลและดึงรหัส OTP อัตโนมัติได้ทันทีโดยไม่เสีย API Credit (พับหรือปล่อยหน้าต่างนี้ไว้ได้เลย)</span>';
          } else if (host.includes('sonjj.com')) {
            bar.style.background = 'linear-gradient(90deg, #1e3a8a, #0284c7)';
            bar.style.color = '#f0f9ff';
            bar.style.borderBottom = '2px solid #38bdf8';
            bar.innerHTML = '<span>🔑 [Nightcamp Manager] กรุณาเข้าสู่ระบบบัญชี SmailPro / Sonjj Premium ของคุณในหน้านี้ — เมื่อ Login เสร็จ ระบบจะพากลับไปหน้า SmailPro และจำ Cookie ให้บอทอัตโนมัติทันที!</span>' +
              '<a href="https://smailpro.com/temporary-email" style="background:#fff;color:#0f172a;padding:5px 12px;border-radius:6px;text-decoration:none;font-size:12px;font-weight:800;white-space:nowrap;">กลับหน้า SmailPro</a>';
          } else {
            bar.style.background = 'linear-gradient(90deg, #92400e, #d97706)';
            bar.style.color = '#fffbeb';
            bar.style.borderBottom = '2px solid #fbbf24';
            const loginUrl = 'https://my.sonjj.com/login?back=' + encodeURIComponent('https://smailpro.com/temporary-email');
            bar.innerHTML = '<span>⚠️ [Nightcamp Manager] ยังไม่ได้เข้าสู่ระบบ SmailPro Premium — กดปุ่มขวาเพื่อไปหน้า Login (ล็อกอินครั้งเดียว บอทจำ Cookie ถาวร)</span>' +
              '<a href="' + loginUrl + '" style="background:#10b981;color:#fff;padding:6px 14px;border-radius:6px;text-decoration:none;font-size:12.5px;font-weight:800;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.25);">🔑 คลิกเพื่อไปหน้า Login SmailPro</a>';
          }
        } catch (_) {}
      })()`,
      returnByValue: true,
      awaitPromise: false,
      timeout: 3000
    }, sessionId, 3500).catch(() => {});
  }

  async function inspectAndHarvestSmailProTab(sessionId) {
    if (!sessionId) return null;
    try {
      const [cookieRes, evalRes] = await Promise.all([
        send('Network.getCookies', {
          urls: ['https://smailpro.com/temporary-email', 'https://smailpro.com/']
        }, sessionId, 4500).catch(() => ({ cookies: [] })),
        send('Runtime.evaluate', {
          expression: `(async () => {
            const html = document.documentElement?.innerHTML || '';
            const alpineEl = document.querySelector('[x-data*="TemporaryEmail"]');
            const alpineData = alpineEl && alpineEl._x_dataStack && alpineEl._x_dataStack[0] ? alpineEl._x_dataStack[0] : null;
            const isLoggedIn = alpineData ? Boolean(alpineData.isLoggedIn) : /\\bisLoggedIn\\s*:\\s*true\\b/.test(html);
            const isPremium = alpineData ? Boolean(alpineData.isPremium) : /\\bisPremium\\s*:\\s*true\\b/.test(html);
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            let userText = '';
            const spans = Array.from(document.querySelectorAll('#menu span, header span'));
            for (const sp of spans) {
              const t = String(sp.textContent || '').trim();
              if (t && (t.includes('@') || (/^Hi!\\s+/i.test(t) && !/Guest/i.test(t)))) {
                userText += (userText ? ' · ' : '') + t;
              }
            }
            const historyItems = [];
            try {
              if (alpineData && alpineData.emailManager) {
                const activeList = await alpineData.emailManager.getAllEmails().catch(() => []);
                const storageHist = await alpineData.emailManager.getEmailHistory().catch(() => []);
                for (const item of [...(Array.isArray(activeList) ? activeList : []), ...(Array.isArray(storageHist) ? storageHist : [])]) {
                  if (item && item.address) {
                    historyItems.push({
                      address: String(item.address).trim().toLowerCase(),
                      timestamp: Number(item.timestamp) || 0,
                      key: String(item.key || '')
                    });
                  }
                }
              }
              if (isPremium && String(location.hostname || '').toLowerCase() === 'smailpro.com') {
                const cRes = await fetch('/app/history', { credentials: 'same-origin' }).catch(() => null);
                if (cRes && cRes.ok) {
                  const cJson = await cRes.json().catch(() => null);
                  if (cJson && Array.isArray(cJson.items)) {
                    for (const item of cJson.items) {
                      const addr = String(item?.address || item?.email || item || '').trim().toLowerCase();
                      if (addr && addr.includes('@')) {
                        historyItems.push({
                          address: addr,
                          timestamp: Number(item?.timestamp) || 0,
                          key: String(item?.key || '')
                        });
                      }
                    }
                  }
                }
              }
            } catch (_) {}
            return {
              href: location.href,
              host: String(location.hostname || '').toLowerCase(),
              readyState: document.readyState,
              isLoggedIn,
              isPremium,
              csrfToken,
              userText,
              userAgent: navigator.userAgent,
              historyItems
            };
          })()`,
          returnByValue: true,
          awaitPromise: true,
          timeout: 5500
        }, sessionId, 6000).catch(() => null)
      ]);

      const cookies = Array.isArray(cookieRes?.cookies) ? cookieRes.cookies : [];
      const smailCookies = cookies.filter(c => c && c.name && /smailpro\.com/i.test(String(c.domain || '')));
      const cookieMap = new Map();
      for (const c of smailCookies) {
        cookieMap.set(c.name, c.value);
      }
      const cookieHeader = Array.from(cookieMap.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
      const page = evalRes?.result?.value || {};

      if (page.host === 'smailpro.com') {
        smailproWebState.isLoggedIn = Boolean(page.isLoggedIn);
        smailproWebState.isPremium = Boolean(page.isPremium);
        if (page.csrfToken) smailproWebState.csrfToken = String(page.csrfToken);
        if (page.userText) smailproWebState.userText = String(page.userText);
        if (cookieHeader) smailproWebState.cookieHeader = cookieHeader;
      }
      if (smailCookies.length > 0) smailproWebState.cookies = smailCookies;
      if (page.userAgent) smailproWebState.userAgent = String(page.userAgent);
      smailproWebState.lastCheckedAt = Date.now();

      await injectSmailProHelperBanner(sessionId);

      const snapshot = {
        targetId: smailproWebState.targetId,
        href: page.href || '',
        host: page.host || '',
        isLoggedIn: smailproWebState.isLoggedIn,
        isPremium: smailproWebState.isPremium,
        userText: smailproWebState.userText,
        csrfToken: smailproWebState.csrfToken,
        cookieHeader: smailproWebState.cookieHeader,
        userAgent: smailproWebState.userAgent,
        historyItems: Array.isArray(page.historyItems) ? page.historyItems : [],
        checkedAt: smailproWebState.lastCheckedAt
      };

      if (smailproWebState.onSessionCallback && (page.host === 'smailpro.com' || cookieHeader)) {
        try { smailproWebState.onSessionCallback(snapshot); } catch (_) {}
      }
      return snapshot;
    } catch (_) {
      return null;
    }
  }

  function startSmailProLoginMonitor() {
    if (smailproWebState.monitorTimer) clearInterval(smailproWebState.monitorTimer);
    let ticks = 0;
    smailproWebState.monitorTimer = setInterval(async () => {
      ticks++;
      if (ticks > 150 || !smailproWebState.sessionId) {
        clearInterval(smailproWebState.monitorTimer);
        smailproWebState.monitorTimer = null;
        return;
      }
      const snap = await inspectAndHarvestSmailProTab(smailproWebState.sessionId);
      if (!snap) {
        clearInterval(smailproWebState.monitorTimer);
        smailproWebState.monitorTimer = null;
      }
    }, 2200);
    smailproWebState.monitorTimer.unref?.();
  }

  async function ensureSmailProWebTab({ openVisibleWindow = false, allowCreateTab = false, requireSmailProOrigin = false, cookieHeaderToInject = '' } = {}) {
    await ensureBrowser();
    await connect();

    const tRes = await send('Target.getTargets', {}, undefined, 10000);
    const targets = Array.isArray(tRes?.targetInfos) ? tRes.targetInfos : [];
    const matchingTabs = targets.filter(t =>
      t.type === 'page' &&
      (t.targetId === smailproWebState.targetId || /smailpro\.com|my\.sonjj\.com/i.test(String(t.url || '')))
    );
    // Close any duplicate smailpro.com tabs automatically so at most 1 tab ever exists
    if (matchingTabs.length > 1) {
      for (let i = 1; i < matchingTabs.length; i++) {
        await send('Target.closeTarget', { targetId: matchingTabs[i].targetId }, undefined, 2500).catch(() => {});
      }
    }
    let target = matchingTabs[0] || null;

    // If openVisibleWindow is requested and existing target was accidentally attached to a game window, close it and create a standalone window
    if (target && openVisibleWindow) {
      try {
        const smWin = await send('Browser.getWindowForTarget', { targetId: target.targetId }, undefined, 2500).catch(() => null);
        if (smWin && smWin.windowId) {
          const gameTabs = targets.filter(t => t.type === 'page' && t.targetId !== target.targetId && /nightcamp\.app/i.test(String(t.url || '')));
          for (const gt of gameTabs) {
            const gWin = await send('Browser.getWindowForTarget', { targetId: gt.targetId }, undefined, 2000).catch(() => null);
            if (gWin && gWin.windowId === smWin.windowId) {
              await send('Target.closeTarget', { targetId: target.targetId }, undefined, 2500).catch(() => {});
              target = null;
              break;
            }
          }
        }
      } catch (_) {}
    }

    let createdNew = false;
    if (!target) {
      if (!allowCreateTab && !openVisibleWindow) {
        throw new Error('NO_OPEN_SMAILPRO_TAB');
      }
      const created = await send('Target.createTarget', {
        url: 'https://smailpro.com/temporary-email',
        newWindow: true,
        width: 1100,
        height: 800
      });
      const targetId = created?.targetId;
      if (!targetId) throw new Error('ไม่สามารถเปิดแท็บ SmailPro ในเบราว์เซอร์ได้');
      target = { targetId, url: 'https://smailpro.com/temporary-email' };
      createdNew = true;
      if (openVisibleWindow && startupPages.length > 0) {
        for (const blankId of startupPages.splice(0)) {
          if (blankId !== targetId) await send('Target.closeTarget', { targetId: blankId }).catch(() => {});
        }
      }
    }

    smailproWebState.targetId = target.targetId;
    const attachRes = await send('Target.attachToTarget', { targetId: target.targetId, flatten: true }, undefined, 8000);
    const sessionId = attachRes?.sessionId;
    if (!sessionId) throw new Error('ไม่สามารถเชื่อมต่อ CDP กับแท็บ SmailPro ได้');
    smailproWebState.sessionId = sessionId;

    await send('Page.enable', {}, sessionId, 4000).catch(() => {});
    await send('Network.enable', {}, sessionId, 4000).catch(() => {});

    if (cookieHeaderToInject) {
      const cdpCookies = parseCookieHeaderToCdpCookies(cookieHeaderToInject);
      if (cdpCookies.length > 0) {
        await send('Network.setCookies', { cookies: cdpCookies }, sessionId, 4000).catch(() => {});
      }
    }

    if (openVisibleWindow) {
      try {
        const winInfo = await send('Browser.getWindowForTarget', { targetId: target.targetId }, undefined, 3000);
        if (winInfo && winInfo.windowId) {
          await send('Browser.setWindowBounds', {
            windowId: winInfo.windowId,
            bounds: { windowState: 'normal', width: 1100, height: 800 }
          }, undefined, 3000).catch(() => {});
        }
      } catch (_) {}
      await send('Target.activateTarget', { targetId: target.targetId }, undefined, 3000).catch(() => {});
      await send('Page.bringToFront', {}, sessionId, 2500).catch(() => {});
    }

    // Wait for document ready — NEVER hijack/navigate away if user is currently on my.sonjj.com logging in!
    for (let i = 0; i < 20; i++) {
      const r = await send('Runtime.evaluate', {
        expression: `({ href: location.href, host: location.hostname, ready: document.readyState })`,
        returnByValue: true,
        timeout: 2500
      }, sessionId, 3000).catch(() => null);
      const val = r?.result?.value;
      if (val && val.ready && val.ready !== 'loading' && val.href !== 'about:blank') {
        const hostLow = String(val.host || '').toLowerCase();
        const isUserLoggingInOnSonjj = hostLow.includes('sonjj.com');
        if (requireSmailProOrigin && hostLow !== 'smailpro.com') {
          if (isUserLoggingInOnSonjj) {
            throw new Error('กรุณาล็อกอินในหน้าต่าง SmailPro (my.sonjj.com) ที่เปิดอยู่ให้เสร็จก่อน');
          }
          await send('Page.navigate', { url: 'https://smailpro.com/temporary-email' }, sessionId, 8000).catch(() => {});
          await new Promise(res => setTimeout(res, 1200));
          continue;
        }
        break;
      }
      await new Promise(res => setTimeout(res, 350));
    }

    if (createdNew || cookieHeaderToInject) {
      if (cookieHeaderToInject && !createdNew) {
        await send('Page.navigate', { url: 'https://smailpro.com/temporary-email' }, sessionId, 8000).catch(() => {});
      }
      await new Promise(res => setTimeout(res, 900));
    }

    const snap = await inspectAndHarvestSmailProTab(sessionId);
    return { sessionId, targetId: target.targetId, snapshot: snap };
  }

  async function smailproWebAction(payload = {}) {
    const action = String(payload?.action || '').trim();

    if (action === 'open-login') {
      const { sessionId, targetId, snapshot } = await ensureSmailProWebTab({
        openVisibleWindow: true,
        requireSmailProOrigin: false,
        cookieHeaderToInject: ''
      });
      // If user is not logged in yet and currently on smailpro.com, navigate straight to the SSO Login page so they can log in immediately!
      if (snapshot && !snapshot.isLoggedIn && snapshot.host === 'smailpro.com' && !payload?.stayOnHome) {
        const loginUrl = 'https://my.sonjj.com/login?back=' + encodeURIComponent('https://smailpro.com/temporary-email');
        await send('Page.navigate', { url: loginUrl }, sessionId, 8000).catch(() => {});
        await new Promise(res => setTimeout(res, 900));
        await injectSmailProHelperBanner(sessionId);
      }
      startSmailProLoginMonitor();
      return {
        success: true,
        targetId,
        ...(snapshot || {}),
        message: snapshot?.isLoggedIn
          ? `✅ ล็อกอิน SmailPro ${snapshot.isPremium ? '👑 Premium' : 'Web'} อยู่แล้ว! ระบบจำเซสชันและ Cookie เรียบร้อย`
          : '🌐 เปิดหน้าต่างเข้าสู่ระบบ SmailPro แล้ว — กรุณาล็อกอินในหน้าต่างที่เปิดขึ้นมา ระบบจะจำเซสชันให้อัตโนมัติทันที'
      };
    }

    if (action === 'check-session') {
      const ensureTab = Boolean(payload?.ensureTab);
      if (!ensureTab && !(await browserAlive())) {
        return {
          success: true,
          browserOpen: false,
          isLoggedIn: smailproWebState.isLoggedIn,
          isPremium: smailproWebState.isPremium,
          userText: smailproWebState.userText,
          csrfToken: smailproWebState.csrfToken,
          cookieHeader: smailproWebState.cookieHeader
        };
      }
      await connect().catch(() => {});
      const tRes = await send('Target.getTargets', {}, undefined, 6000).catch(() => null);
      const targets = Array.isArray(tRes?.targetInfos) ? tRes.targetInfos : [];
      const existing = targets.find(t =>
        t.type === 'page' &&
        (t.targetId === smailproWebState.targetId || /smailpro\.com|my\.sonjj\.com/i.test(String(t.url || '')))
      );
      if (!existing) {
        return {
          success: true,
          browserOpen: true,
          tabOpen: false,
          isLoggedIn: smailproWebState.isLoggedIn,
          isPremium: smailproWebState.isPremium,
          userText: smailproWebState.userText,
          csrfToken: smailproWebState.csrfToken,
          cookieHeader: smailproWebState.cookieHeader
        };
      }
      // Passive check only — NEVER pass cookieHeaderToInject here (which would reload the page while the user is typing their login!)
      const { snapshot } = await ensureSmailProWebTab({
        openVisibleWindow: false,
        allowCreateTab: false,
        requireSmailProOrigin: false,
        cookieHeaderToInject: ''
      });
      return {
        success: true,
        browserOpen: true,
        tabOpen: true,
        ...(snapshot || {})
      };
    }

    if (action === 'sync-ui-email') {
      if (!(await browserAlive())) return { success: false, skipped: true };
      try {
        const { sessionId } = await ensureSmailProWebTab({
          openVisibleWindow: false,
          allowCreateTab: false,
          requireSmailProOrigin: false
        });
        const emailObj = payload?.emailObj;
        if (!emailObj || !emailObj.address) return { success: false };
        await send('Runtime.evaluate', {
          expression: `(async () => {
            try {
              const alpineEl = document.querySelector('[x-data*="TemporaryEmail"]');
              const app = alpineEl && alpineEl._x_dataStack && alpineEl._x_dataStack[0] ? alpineEl._x_dataStack[0] : null;
              if (!app || !app.emailManager) return false;
              const email = ${JSON.stringify(emailObj)};
              // Auto-archive oldest active email to History if active List is at 20/20 limit!
              const activeList = await app.emailManager.getAllEmails().catch(() => []);
              const maxLim = Number(app.limitActive) || 20;
              const alreadyActive = Array.isArray(activeList) && activeList.some(e => e && String(e.address || '').toLowerCase() === String(email.address).toLowerCase());
              if (!alreadyActive && Array.isArray(activeList) && activeList.length >= maxLim) {
                const toArchive = activeList.slice(maxLim - 1);
                for (const oldItem of toArchive) {
                  if (oldItem && oldItem.address) {
                    if (typeof app.requestServerDelete === 'function') await app.requestServerDelete(oldItem.address).catch(() => {});
                    await app.emailManager.deleteEmail(oldItem.address).catch(() => {});
                  }
                }
              }
              const dup = await app.emailManager.getEmail(email.address, true);
              if (dup) {
                await app.emailManager.permanentlyDeleteEmail(email.address);
                email.messages = (Array.isArray(email.messages) && email.messages.length > 0) ? email.messages : (dup.messages || []);
              }
              await app.emailManager.addEmail(email);
              if (typeof app.limit === 'function') {
                await app.limit(email.address);
              }
              return true;
            } catch (_) {
              return false;
            }
          })()`,
          returnByValue: true,
          awaitPromise: true,
          timeout: 4500
        }, sessionId, 5000).catch(() => {});
        return { success: true };
      } catch (_) {
        return { success: false, skipped: true };
      }
    }

    if (action === 'inject-cookies') {
      const rawCookie = String(payload?.cookieHeader || '').trim();
      if (!rawCookie) throw new Error('กรุณาวาง Cookie ของเว็บ SmailPro ก่อน');
      const { snapshot } = await ensureSmailProWebTab({
        openVisibleWindow: false,
        allowCreateTab: false,
        requireSmailProOrigin: true,
        cookieHeaderToInject: rawCookie
      });
      return {
        success: true,
        ...(snapshot || {})
      };
    }

    if (action === 'web-cloud-history') {
      const { snapshot } = await ensureSmailProWebTab({
        openVisibleWindow: false,
        allowCreateTab: false,
        requireSmailProOrigin: false,
        cookieHeaderToInject: ''
      });
      return {
        success: true,
        items: Array.isArray(snapshot?.historyItems) ? snapshot.historyItems : [],
        isLoggedIn: Boolean(snapshot?.isLoggedIn),
        isPremium: Boolean(snapshot?.isPremium)
      };
    }

    if (action === 'web-create') {
      const query = payload?.query || { username: 'random', type: 'real', domain: 'outlook.com', server: '2' };
      const { sessionId, snapshot } = await ensureSmailProWebTab({
        openVisibleWindow: false,
        allowCreateTab: false,
        requireSmailProOrigin: true,
        cookieHeaderToInject: ''
      });
      const evalRes = await send('Runtime.evaluate', {
        expression: `(async () => {
          try {
            const alpineEl = document.querySelector('[x-data*="TemporaryEmail"]');
            const app = alpineEl && alpineEl._x_dataStack && alpineEl._x_dataStack[0] ? alpineEl._x_dataStack[0] : null;
            if (app && app.emailManager) {
              const activeList = await app.emailManager.getAllEmails().catch(() => []);
              const maxLim = Number(app.limitActive) || 20;
              if (Array.isArray(activeList) && activeList.length >= maxLim) {
                const toArchive = activeList.slice(maxLim - 1);
                for (const oldItem of toArchive) {
                  if (oldItem && oldItem.address) {
                    if (typeof app.requestServerDelete === 'function') await app.requestServerDelete(oldItem.address).catch(() => {});
                    await app.emailManager.deleteEmail(oldItem.address).catch(() => {});
                  }
                }
              }
            }
            const query = ${JSON.stringify(query)};
            const q = new URLSearchParams(query).toString();
            const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
            if (csrf) headers['X-CSRF-TOKEN'] = csrf;
            const res = await fetch('/app/create?' + q, {
              method: 'GET',
              headers,
              credentials: 'same-origin'
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data || !data.address) {
              return {
                success: false,
                status: res.status,
                error: (data && (data.msg || data.message)) || ('HTTP ' + res.status)
              };
            }
            // Save to SmailPro Cloud History & update UI List (1/20)
            fetch('/app/history', {
              method: 'POST',
              headers,
              credentials: 'same-origin',
              body: JSON.stringify({ email: data.address })
            }).catch(() => {});
            if (app && app.emailManager) {
              const dup = await app.emailManager.getEmail(data.address, true).catch(() => null);
              if (dup) await app.emailManager.permanentlyDeleteEmail(data.address).catch(() => {});
              await app.emailManager.addEmail({ address: data.address, timestamp: data.timestamp, key: data.key, messages: dup?.messages || [] }).catch(() => {});
              if (typeof app.limit === 'function') await app.limit(data.address).catch(() => {});
            }
            return {
              success: true,
              address: String(data.address || '').trim().toLowerCase(),
              timestamp: Number(data.timestamp) || Math.floor(Date.now() / 1000),
              key: String(data.key || '')
            };
          } catch (e) {
            return { success: false, error: e.message || String(e) };
          }
        })()`,
        returnByValue: true,
        awaitPromise: true,
        timeout: 15000
      }, sessionId, 16000);

      await inspectAndHarvestSmailProTab(sessionId).catch(() => {});
      const out = evalRes?.result?.value;
      if (!out || !out.success) {
        return {
          success: false,
          isLoggedIn: snapshot?.isLoggedIn || false,
          isPremium: snapshot?.isPremium || false,
          error: out?.error || 'สร้างอีเมลผ่าน SmailPro Web ไม่สำเร็จ'
        };
      }
      return {
        ...out,
        isLoggedIn: smailproWebState.isLoggedIn,
        isPremium: smailproWebState.isPremium
      };
    }

    if (action === 'web-inbox') {
      const address = String(payload?.address || '').trim().toLowerCase();
      const timestamp = Number(payload?.timestamp) || Math.floor(Date.now() / 1000);
      const key = String(payload?.key || '');
      if (!address) throw new Error('Missing email address for web-inbox');

      const { sessionId } = await ensureSmailProWebTab({
        openVisibleWindow: false,
        allowCreateTab: false,
        requireSmailProOrigin: true,
        cookieHeaderToInject: ''
      });

      const evalRes = await send('Runtime.evaluate', {
        expression: `(async () => {
          try {
            const addr = ${JSON.stringify(address)};
            const domain = addr.split('@')[1] || '';
            const localPart = addr.split('@')[0] || '';
            const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
            if (csrf) headers['X-CSRF-TOKEN'] = csrf;

            let curKey = ${JSON.stringify(key)};
            let curTs = ${Number(timestamp) || Math.floor(Date.now() / 1000)};

            const restoreKey = async () => {
              const alpineEl = document.querySelector('[x-data*="TemporaryEmail"]');
              const app = alpineEl && alpineEl._x_dataStack && alpineEl._x_dataStack[0] ? alpineEl._x_dataStack[0] : null;
              if (app && app.emailManager) {
                const activeList = await app.emailManager.getAllEmails().catch(() => []);
                const maxLim = Number(app.limitActive) || 20;
                const alreadyInList = Array.isArray(activeList) && activeList.some(e => e && String(e.address || '').toLowerCase() === addr);
                if (!alreadyInList && Array.isArray(activeList) && activeList.length >= maxLim) {
                  const toArchive = activeList.slice(maxLim - 1);
                  for (const oldItem of toArchive) {
                    if (oldItem && oldItem.address) {
                      if (typeof app.requestServerDelete === 'function') await app.requestServerDelete(oldItem.address).catch(() => {});
                      await app.emailManager.deleteEmail(oldItem.address).catch(() => {});
                    }
                  }
                }
              }
              for (const srv of ['1', '2', '3']) {
                for (const tp of ['alias', 'real']) {
                  const rq = new URLSearchParams({ username: localPart, domain, type: tp, server: srv }).toString();
                  const rRes = await fetch('/app/create?' + rq, { method: 'GET', headers, credentials: 'same-origin' }).catch(() => null);
                  if (rRes && rRes.ok) {
                    const rData = await rRes.json().catch(() => null);
                    if (rData && rData.key) {
                      curKey = String(rData.key);
                      curTs = Number(rData.timestamp) || curTs;
                      if (app && app.emailManager) {
                        const dup = await app.emailManager.getEmail(addr, true).catch(() => null);
                        if (dup) await app.emailManager.permanentlyDeleteEmail(addr).catch(() => {});
                        await app.emailManager.addEmail({ address: addr, timestamp: curTs, key: curKey, messages: dup?.messages || [] }).catch(() => {});
                        if (typeof app.limit === 'function') await app.limit(addr).catch(() => {});
                      }
                      return true;
                    }
                  }
                }
              }
              return false;
            };

            if (!curKey) {
              await restoreKey();
            }

            let payloadToken = '';
            for (let attempt = 0; attempt < 2; attempt++) {
              const pRes = await fetch('/app/inbox', {
                method: 'POST',
                headers,
                credentials: 'same-origin',
                body: JSON.stringify([{ address: addr, timestamp: curTs, key: curKey }])
              });
              if (pRes.ok) {
                const pArr = await pRes.json().catch(() => null);
                if (Array.isArray(pArr) && pArr[0] && pArr[0].payload) {
                  if (pArr[0].key) curKey = String(pArr[0].key);
                  payloadToken = String(pArr[0].payload);
                  break;
                }
              }
              if (attempt === 0) {
                const ok = await restoreKey();
                if (!ok) break;
              }
            }

            if (!payloadToken) {
              return {
                success: false,
                key: curKey,
                timestamp: curTs,
                error: 'ไม่สามารถขอ payload เปิดกล่องจดหมายจาก SmailPro Web ได้ (กรุณาเช็กว่าล็อกอิน SmailPro Premium แล้ว)'
              };
            }

            const isGoogle = domain === 'gmail.com' || domain === 'googlemail.com';
            const isMicrosoft = /^(outlook\\.|hotmail\\.com)/i.test(domain);
            const inboxUrl = isGoogle
              ? 'https://api.sonjj.com/v1/temp_gmail/inbox'
              : (isMicrosoft ? 'https://api.sonjj.com/v1/temp_outlook/inbox' : 'https://api.sonjj.com/v1/temp_email/inbox');

            const mRes = await fetch(inboxUrl + '?payload=' + encodeURIComponent(payloadToken));
            const mData = await mRes.json().catch(() => ({}));
            if (!mRes.ok) {
              return {
                success: false,
                key: curKey,
                timestamp: curTs,
                error: mData?.detail?.error?.message || mData?.msg || mData?.message || ('Inbox HTTP ' + mRes.status)
              };
            }
            return {
              success: true,
              key: curKey,
              timestamp: curTs,
              messages: Array.isArray(mData?.messages) ? mData.messages : []
            };
          } catch (e) {
            return { success: false, error: e.message || String(e) };
          }
        })()`,
        returnByValue: true,
        awaitPromise: true,
        timeout: 16000
      }, sessionId, 18000);

      return evalRes?.result?.value || { success: false, error: 'CDP web-inbox failed' };
    }

    if (action === 'web-message') {
      const address = String(payload?.address || '').trim().toLowerCase();
      const mid = String(payload?.mid || '').trim();
      if (!address || !mid) throw new Error('Missing address or mid for web-message');

      const { sessionId } = await ensureSmailProWebTab({
        openVisibleWindow: false,
        allowCreateTab: false,
        requireSmailProOrigin: true,
        cookieHeaderToInject: ''
      });

      const evalRes = await send('Runtime.evaluate', {
        expression: `(async () => {
          try {
            const addr = ${JSON.stringify(address)};
            const mid = ${JSON.stringify(mid)};
            const domain = addr.split('@')[1] || '';
            const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            const headers = { 'Content-Type': 'application/json' };
            if (csrf) headers['X-CSRF-TOKEN'] = csrf;

            const q = new URLSearchParams({ email: addr, mid }).toString();
            const pRes = await fetch('/app/message?' + q, {
              method: 'GET',
              headers,
              credentials: 'same-origin'
            });
            const payloadToken = (await pRes.text().catch(() => '')).trim();
            if (!pRes.ok || !payloadToken) {
              return { success: false, error: 'HTTP ' + pRes.status + ' cannot fetch message payload' };
            }

            const isGoogle = domain === 'gmail.com' || domain === 'googlemail.com';
            const isMicrosoft = /^(outlook\\.|hotmail\\.com)/i.test(domain);
            const msgUrl = isGoogle
              ? 'https://api.sonjj.com/v1/temp_gmail/message'
              : (isMicrosoft ? 'https://api.sonjj.com/v1/temp_outlook/message' : 'https://api.sonjj.com/v1/temp_email/message');

            const mRes = await fetch(msgUrl + '?payload=' + encodeURIComponent(payloadToken));
            const mData = await mRes.json().catch(() => ({}));
            if (!mRes.ok) {
              return {
                success: false,
                error: mData?.detail?.error?.message || mData?.msg || mData?.message || ('Message HTTP ' + mRes.status)
              };
            }
            return {
              success: true,
              body: String(mData?.body || '')
            };
          } catch (e) {
            return { success: false, error: e.message || String(e) };
          }
        })()`,
        returnByValue: true,
        awaitPromise: true,
        timeout: 15000
      }, sessionId, 16000);

      return evalRes?.result?.value || { success: false, error: 'CDP web-message failed' };
    }

    throw new Error(`Unknown smailproWebAction: ${action}`);
  }
  // ====================== END SMAILPRO WEB PREMIUM ======================

  async function flushAllClientStorage(timeoutMs = 2500) {
    const activeClients = Array.from(clients.values()).filter(c => c && c.sessionId);
    if (activeClients.length === 0) return { flushed: 0 };
    const work = Promise.allSettled(activeClients.map(c => syncClientStorage(c, true)));
    await Promise.race([
      work,
      new Promise(resolve => setTimeout(resolve, Math.max(400, Number(timeoutMs) || 2500)))
    ]);
    return { flushed: activeClients.length };
  }

  return { launch, stop, stopAll, isOpen, hasProxyContext, ensureProxyListening, evalByPort, rediscover, start, dispose, findBrowser, rebalanceDeviceGroups, ensureProfileDeviceId, ensureProfileMachineId, ensureProfileDeviceGroupIndex, ensureProfileDeviceSpec, resolveDeviceSpec, getDeviceGroupsSnapshot, rotateDeviceGroup, rotateSingleProfileDeviceId, rotateProfileDeviceId, rotateAllDeviceIds, getCustomIpDeviceConfig, getProfileIpIsolationMeta, mutateCustomIpDevices, pruneDeletedProfilesFromCustomGroups, applyProxyModeToOpenWindows, syncAssetCacheToOpenWindows, harvestAllFromBrowserLevelDb, flushAllClientStorage, launchUnbanSession, stopUnbanSession, stopAllUnbanSessions, getUnbanStatus, setUnbanCallback, addProfilesToUnbanPool, removeProfileFromUnbanPool, rotateUnbanDevice, setUnbanProxyMode, loadUnbanConfig, saveUnbanConfig, setSmailProSessionCallback, smailproWebAction, status:()=>Object.fromEntries(diagnostics) };
}

module.exports = { createBrowserMode, findBrowser, HEALTH_JS, MAX_SCREENS_PER_DEVICE, resolveDeviceSpec, extractPelicanStorageFromLevelDb, mergeAuthConfigString, mergeSellConfigString };
