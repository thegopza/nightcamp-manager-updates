
// ==========================================
// GLOBAL UI INTERACTION GUARD (PREVENT POLLING DROPDOWN / INPUT COLLAPSE)
// ==========================================
window.PmUiGuard = (function () {
  let openSelectEl = null;
  let openSelectAt = 0;
  let pointerDownTarget = null;
  let pointerDownAt = 0;
  const deferredTasks = new Map();
  let flushTimer = null;

  function isEditableElement(el) {
    if (!el || el.nodeType !== 1) return false;
    const tag = el.tagName;
    if (tag === 'SELECT' || tag === 'TEXTAREA') return true;
    if (el.isContentEditable) return true;
    if (tag === 'INPUT') {
      const type = String(el.type || 'text').toLowerCase();
      return !['checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'hidden'].includes(type);
    }
    return false;
  }

  function isSelectBusy(selectEl) {
    if (!selectEl) return false;
    if (openSelectEl === selectEl && (Date.now() - openSelectAt) < 45000) return true;
    if (document.activeElement === selectEl) return true;
    if (pointerDownTarget && (pointerDownTarget === selectEl || selectEl.contains(pointerDownTarget)) && (Date.now() - pointerDownAt) < 5000) {
      return true;
    }
    return false;
  }

  function isPointerDownIn(containerEl) {
    if (!containerEl || !pointerDownTarget) return false;
    if ((Date.now() - pointerDownAt) >= 5000) return false;
    return pointerDownTarget === containerEl || (typeof containerEl.contains === 'function' && containerEl.contains(pointerDownTarget));
  }

  function isInteracting(containerEl) {
    if (!containerEl) return false;
    if (openSelectEl && (openSelectEl === containerEl || (typeof containerEl.contains === 'function' && containerEl.contains(openSelectEl))) && (Date.now() - openSelectAt) < 45000) {
      return true;
    }
    const active = document.activeElement;
    if (active && (active === containerEl || (typeof containerEl.contains === 'function' && containerEl.contains(active))) && isEditableElement(active)) {
      return true;
    }
    if (isPointerDownIn(containerEl)) {
      return true;
    }
    if (typeof containerEl.querySelector === 'function' && containerEl.querySelector('.card-top-menu.is-open, .dropdown.open')) {
      return true;
    }
    return false;
  }

  function scheduleFlush(delayMs = 70) {
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(() => {
      flushTimer = null;
      if (deferredTasks.size === 0) return;
      const entries = Array.from(deferredTasks.entries());
      deferredTasks.clear();
      for (const [key, item] of entries) {
        if (item.container && item.container.isConnected && isInteracting(item.container)) {
          deferredTasks.set(key, item);
          continue;
        }
        try {
          item.fn();
        } catch (err) {
          console.warn('[PmUiGuard] deferred render error:', err);
        }
      }
    }, delayMs);
  }

  function deferIfInteracting(key, containerEl, fn) {
    if (!containerEl || !isInteracting(containerEl)) {
      if (key) deferredTasks.delete(key);
      return false;
    }
    if (key && typeof fn === 'function') {
      deferredTasks.set(key, { container: containerEl, fn });
    }
    return true;
  }

  function syncSelect(selectEl, options, selectedValue, disabled) {
    if (!selectEl || !Array.isArray(options)) return false;
    if (isSelectBusy(selectEl)) {
      return false;
    }
    if (typeof disabled === 'boolean' && selectEl.disabled !== disabled) {
      selectEl.disabled = disabled;
    }
    const curOpts = selectEl.options;
    let sameKeys = curOpts.length === options.length;
    if (sameKeys) {
      for (let i = 0; i < options.length; i++) {
        if (curOpts[i].value !== String(options[i].value ?? '')) {
          sameKeys = false;
          break;
        }
      }
    }
    const getOptLabel = (o) => String(o && o.label !== undefined ? o.label : (o && o.text !== undefined ? o.text : ''));
    if (sameKeys) {
      for (let i = 0; i < options.length; i++) {
        const nextText = getOptLabel(options[i]);
        const nextDis = Boolean(options[i].disabled);
        if (curOpts[i].textContent !== nextText) curOpts[i].textContent = nextText;
        if (curOpts[i].disabled !== nextDis) curOpts[i].disabled = nextDis;
      }
    } else {
      const frag = document.createDocumentFragment();
      for (let i = 0; i < options.length; i++) {
        const opt = document.createElement('option');
        opt.value = String(options[i].value ?? '');
        opt.textContent = getOptLabel(options[i]);
        if (options[i].disabled) opt.disabled = true;
        frag.appendChild(opt);
      }
      selectEl.replaceChildren(frag);
    }
    if (selectedValue !== undefined && selectedValue !== null) {
      const targetVal = String(selectedValue);
      if (selectEl.value !== targetVal) {
        selectEl.value = targetVal;
      }
    }
    return true;
  }

  function setHtmlIfChanged(el, html) {
    if (!el) return false;
    const next = String(html ?? '');
    if (el.__pmLastHtml === next && el.childNodes.length > 0) return false;
    el.__pmLastHtml = next;
    el.innerHTML = next;
    return true;
  }

  const onPointerStart = (e) => {
    const t = e.target;
    pointerDownTarget = t || null;
    pointerDownAt = Date.now();
    const sel = t && typeof t.closest === 'function' ? t.closest('select') : null;
    if (sel) {
      openSelectEl = sel;
      openSelectAt = Date.now();
    } else if (openSelectEl) {
      openSelectEl = null;
      openSelectAt = 0;
      scheduleFlush(80);
    }
  };

  const onPointerEnd = () => {
    if (!pointerDownTarget) return;
    pointerDownTarget = null;
    pointerDownAt = 0;
    scheduleFlush(60);
  };

  document.addEventListener('pointerdown', onPointerStart, true);
  document.addEventListener('mousedown', onPointerStart, true);
  window.addEventListener('pointerup', onPointerEnd, true);
  window.addEventListener('mouseup', onPointerEnd, true);
  window.addEventListener('pointercancel', onPointerEnd, true);

  document.addEventListener('keydown', (e) => {
    const sel = e.target && typeof e.target.closest === 'function' ? e.target.closest('select') : null;
    if (e.key === 'Escape' || e.key === 'Tab') {
      if (openSelectEl) {
        openSelectEl = null;
        openSelectAt = 0;
        scheduleFlush(60);
      }
      return;
    }
    if (sel) {
      openSelectEl = sel;
      openSelectAt = Date.now();
    }
  }, true);

  document.addEventListener('change', (e) => {
    const sel = e.target && typeof e.target.closest === 'function' ? e.target.closest('select') : null;
    if (sel && openSelectEl === sel) {
      openSelectEl = null;
      openSelectAt = 0;
      scheduleFlush(100);
    }
  }, true);

  document.addEventListener('focusout', (e) => {
    if (openSelectEl && e.target === openSelectEl) {
      openSelectEl = null;
      openSelectAt = 0;
    }
    scheduleFlush(80);
  }, true);

  return {
    isEditableElement,
    isSelectBusy,
    isPointerDownIn,
    isInteracting,
    deferIfInteracting,
    syncSelect,
    setHtmlIfChanged
  };
})();

// ==========================================
// WEB CONFIG MODAL (EXPORT & IMPORT FOR WEB HUD)
// ==========================================
function openWebConfigModal(profileId, mode, preloadedJson = '') {
  let modal = document.getElementById('pelican-config-modal-web');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'pelican-config-modal-web';
    modal.style.cssText = 'display: none; position: fixed; inset: 0; z-index: 999999; align-items: center; justify-content: center; font-family: "Segoe UI", Tahoma, sans-serif;';
    modal.innerHTML = `
      <div id="p-web-cfg-backdrop" style="position: absolute; inset: 0; background: rgba(0,0,0,0.72); backdrop-filter: blur(4px);"></div>
      <div style="position: relative; width: 620px; max-width: 95vw; background: #0b1329; border: 1.5px solid #a855f7; border-radius: 12px; box-shadow: 0 25px 60px rgba(0,0,0,0.9), 0 0 30px rgba(168,85,247,0.3); color: #f8fafc; overflow: hidden; display: flex; flex-direction: column;">
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #1e1b4b; border-bottom: 1px solid rgba(168,85,247,0.3);">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 18px;">💾</span>
            <span id="p-web-cfg-title" style="font-weight: bold; font-size: 14px; color: #c084fc;">สำรอง & ถ่ายโอนการตั้งค่า (Settings & Config)</span>
          </div>
          <button id="p-web-cfg-close" style="background: transparent; border: none; color: #94a3b8; font-size: 18px; cursor: pointer; padding: 0 4px; font-weight: bold;">✕</button>
        </div>

        <div style="padding: 14px 16px; display: flex; flex-direction: column; gap: 10px;">
          <div style="background: rgba(168, 85, 247, 0.12); border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 8px; padding: 8px 12px; font-size: 11.5px; color: #e9d5ff; line-height: 1.4;">
            🔒 <b>ระบบความปลอดภัย (Security Guaranteed):</b><br/>
            ไฟล์คอนฟิกนี้จะรวบรวมการตั้งค่าทั้งหมด (แมพฟาร์ม, ลูกธนู, กรองขายของ NPC, กฎตลาดกลาง, ร้านค้า) โดย <b>ยกเว้นชื่อผู้ใช้ (ID) และ รหัสผ่าน (Password) ออก 100%</b> ทำให้แชร์หรือย้ายไปใช้กับจออื่นได้ทันทีอย่างปลอดภัย ไม่ทับซ้อนไอดีกัน
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-size: 11.5px; color: #cbd5e1; font-weight: 600;">ข้อมูลการตั้งค่า (Config JSON Data):</span>
              <span id="p-web-cfg-status" style="font-size: 10.5px; color: #10b981; font-weight: 600;"></span>
            </div>
            <textarea id="p-web-cfg-json" placeholder="วางโค้ด JSON การตั้งค่าที่นี่..." style="width: 100%; height: 250px; box-sizing: border-box; background: #0f172a; border: 1px solid #475569; border-radius: 6px; color: #38bdf8; font-family: 'JetBrains Mono', 'Consolas', monospace; font-size: 11px; padding: 10px; resize: vertical; line-height: 1.4; outline: none;"></textarea>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap;">
            <div style="display: flex; gap: 6px;">
              <button id="p-web-cfg-copy" style="background: #7c3aed; color: #fff; border: 1px solid #a855f7; padding: 6px 12px; border-radius: 6px; font-size: 11.5px; font-weight: bold; cursor: pointer;">
                📋 คัดลอก JSON
              </button>
              <button id="p-web-cfg-download" style="background: #1e293b; color: #38bdf8; border: 1px solid rgba(56,189,248,0.4); padding: 6px 12px; border-radius: 6px; font-size: 11.5px; font-weight: bold; cursor: pointer;">
                💾 ดาวน์โหลด .json
              </button>
            </div>
            <div style="display: flex; gap: 6px;">
              <label style="background: #334155; color: #e2e8f0; border: 1px solid #475569; padding: 6px 12px; border-radius: 6px; font-size: 11.5px; font-weight: bold; cursor: pointer;">
                📂 เลือกไฟล์ .json
                <input type="file" id="p-web-cfg-file" accept=".json,application/json" style="display: none;">
              </label>
              <button id="p-web-cfg-apply" style="background: #0284c7; color: #fff; border: 1px solid #38bdf8; padding: 6px 14px; border-radius: 6px; font-size: 11.5px; font-weight: bold; cursor: pointer;">
                📥 นำเข้าการตั้งค่า (Apply)
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const close = () => { modal.style.display = 'none'; };
    modal.querySelector('#p-web-cfg-close').onclick = close;
    modal.querySelector('#p-web-cfg-backdrop').onclick = close;

    modal.querySelector('#p-web-cfg-copy').onclick = () => {
      const txt = modal.querySelector('#p-web-cfg-json').value;
      if (!txt) return;
      navigator.clipboard.writeText(txt);
      modal.querySelector('#p-web-cfg-status').innerText = '✅ คัดลอกลง Clipboard เรียบร้อย';
    };

    modal.querySelector('#p-web-cfg-download').onclick = () => {
      const txt = modal.querySelector('#p-web-cfg-json').value;
      if (!txt) return;
      const element = document.createElement('a');
      element.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(txt));
      element.setAttribute('download', 'aetheria_bot_config.json');
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      modal.querySelector('#p-web-cfg-status').innerText = '💾 ดาวน์โหลดไฟล์เรียบร้อย';
    };

    modal.querySelector('#p-web-cfg-file').onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        modal.querySelector('#p-web-cfg-json').value = event.target.result;
        modal.querySelector('#p-web-cfg-status').innerText = `📄 โหลดไฟล์ "${file.name}" แล้ว`;
      };
      reader.readAsText(file);
    };
  }

  const targetProfId = profileId;
  const area = modal.querySelector('#p-web-cfg-json');
  const title = modal.querySelector('#p-web-cfg-title');
  const status = modal.querySelector('#p-web-cfg-status');

  if (mode === 'export') {
    title.innerText = '📤 ส่งออกการตั้งค่า (Export Config JSON)';
    area.value = preloadedJson;
    status.innerText = '✅ คัดลอก JSON ลง Clipboard แล้ว';
    if (preloadedJson) navigator.clipboard.writeText(preloadedJson);
  } else {
    title.innerText = '📥 นำเข้าการตั้งค่า (Import Config JSON)';
    area.value = '';
    status.innerText = 'วางโค้ด JSON การตั้งค่าที่นี่';
  }

  modal.querySelector('#p-web-cfg-apply').onclick = async () => {
    const txt = area.value;
    if (!txt || !txt.trim()) {
      alert('กรุณาวางโค้ด JSON การตั้งค่าก่อนกดนำเข้า');
      return;
    }
    try { JSON.parse(txt); } catch (e) {
      alert('❌ ไฟล์/ข้อความนี้ไม่ใช่ JSON ที่ถูกต้อง: ' + e.message);
      return;
    }
    const res = await sendWebHudAction(targetProfId, { type: 'import-config', configJson: txt }) || {};
    const gameAnswer = res.result && res.result.result;
    if (res.success && res.result?.success !== false && gameAnswer && gameAnswer.success !== false) {
      status.innerText = '✅ นำเข้าการตั้งค่าสำเร็จครบทุกระบบ!';
      alert('✅ นำเข้าการตั้งค่าสำเร็จ! (คง ID และ Password เดิมของจอนี้ไว้)');
      modal.style.display = 'none';
    } else {
      const why = res.error || res.result?.error || gameAnswer?.error || (gameAnswer ? 'นำเข้าไม่สำเร็จ' : 'จอเกมไม่ตอบกลับ (ต้องเปิดจอเกมนี้ไว้)');
      status.innerText = '❌ ผิดพลาด: ' + why;
      alert('❌ ไม่สามารถนำเข้าการตั้งค่าได้: ' + why);
    }
  };

  modal.style.display = 'flex';
}

﻿const API_BASE = typeof window.__PM_REMOTE_API_BASE__ === "string" ? window.__PM_REMOTE_API_BASE__ : "";
let currentProfiles = [];
let currentBandwidthSummary = null;
let allWindowsHidden = false;

// DOM Elements
const gridEl = document.getElementById("profiles-grid");
const totalEl = document.getElementById("metric-total-profiles");
const onlineEl = document.getElementById("metric-online-profiles");
const farmingEl = document.getElementById("metric-farming-profiles");
const zenyEl = document.getElementById("metric-total-zeny");

// Profile Modal Elements
const modalEl = document.getElementById("profile-modal");
const modalTitle = document.getElementById("modal-title");
const profileForm = document.getElementById("profile-form");
const formId = document.getElementById("form-profile-id");
const formName = document.getElementById("form-name");
const formAccount = document.getElementById("form-account");
const formClass = document.getElementById("form-class");
const formMap = document.getElementById("form-map");
const formPort = document.getElementById("form-port");
const formNotes = document.getElementById("form-notes");
const formPassword = document.getElementById("form-password");
const formServer = document.getElementById("form-server");
const formChar = document.getElementById("form-char");
const formAuthHint = document.getElementById("form-auth-hint");
const formPasswordEye = document.getElementById("form-password-eye");
if (formPasswordEye && formPassword) formPasswordEye.onclick = () => { formPassword.type = formPassword.type === 'password' ? 'text' : 'password'; };

// Script Plan Modal Elements
const planModalEl = document.getElementById("plan-modal");
const planForm = document.getElementById("plan-form");
const planProfileId = document.getElementById("plan-profile-id");
const planNameInput = document.getElementById("plan-name");
const planModeSelect = document.getElementById("plan-mode");
const planMapSelect = document.getElementById("plan-map");
const planAmmoMin = document.getElementById("plan-ammo-min");
const planWeightMax = document.getElementById("plan-weight-max");
const planRequireArrow = document.getElementById("plan-require-arrow");
const planArrowType = document.getElementById("plan-arrow-type");
const planAutoSell = document.getElementById("plan-auto-sell");
const planSellWeapons = document.getElementById("plan-sell-weapons");
const planSellArmors = document.getElementById("plan-sell-armors");
const planNotes = document.getElementById("plan-notes");

// Active Floating Web HUDs tracking: profileId -> { el, activeTab, activeSubTab, interval }
const activeWebHuds = {};
let topHudZIndex = 10000;

// ==========================================
// INITIALIZATION & POLLING
// ==========================================
let fetchProfilesInFlight = null;
let hasSeededJailAutoCloseEvent = false;
let seenJailAutoCloseEventId = null;
async function fetchProfiles() {
  if (fetchProfilesInFlight) return fetchProfilesInFlight;
  fetchProfilesInFlight = (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/profiles`);
      const data = await res.json();
      if (data.success) {
        currentProfiles = data.profiles;
        window.currentProfiles = currentProfiles;
        currentBandwidthSummary = data.bandwidthSummary || null;
        allWindowsHidden = !!data.allWindowsHidden;
        
        const lblHideAll = document.getElementById("lbl-toggle-all-windows");
        if (lblHideAll) {
          lblHideAll.innerText = allWindowsHidden ? "แสดงกราฟิกทุกจอ" : "พักกราฟิกทุกจอ (Zero-Render)";
        }

        if (typeof window.refreshPartyManagerData === 'function' && (Date.now() - (window.__lastPartyPollAt || 0) > 4000)) {
          window.__lastPartyPollAt = Date.now();
          window.refreshPartyManagerData();
        }
        renderProfiles();
        updateMetrics();
        updateActiveWebHuds();
        if (typeof updateBulkDeleteModalIfOpen === 'function') {
          updateBulkDeleteModalIfOpen();
        }
        if (typeof updateZenyConsolidationView === 'function') {
          updateZenyConsolidationView();
        }
        if (typeof window.updateJailManagerFromProfiles === 'function') {
          window.updateJailManagerFromProfiles(currentProfiles);
        }
        if (typeof window.updateDeviceManagerFromProfiles === 'function') {
          window.updateDeviceManagerFromProfiles(
            currentProfiles,
            data.deviceGroups,
            data.screenProxySummary ? data.screenProxySummary.maxScreensPerIp : undefined,
            {
              customIpConfig: data.customIpConfig,
              customGroupLeases: data.customGroupLeases,
              ipSurchargeConfig: data.ipSurchargeConfig || (data.screenProxySummary ? data.screenProxySummary.surchargeConfig : undefined),
              screenProxySummary: data.screenProxySummary,
              lastJailAutoCloseEvent: data.lastJailAutoCloseEvent
            }
          );
        }
        if (data.lastJailAutoCloseEvent && data.lastJailAutoCloseEvent.id) {
          if (!hasSeededJailAutoCloseEvent) {
            seenJailAutoCloseEventId = data.lastJailAutoCloseEvent.id;
            hasSeededJailAutoCloseEvent = true;
          } else if (data.lastJailAutoCloseEvent.id !== seenJailAutoCloseEventId) {
            seenJailAutoCloseEventId = data.lastJailAutoCloseEvent.id;
            const ev = data.lastJailAutoCloseEvent;
            const charPart = ev.triggerCharName ? ` (${ev.triggerCharName})` : '';
            const modeDesc = ev.mode === 'all_ips' ? 'ทุกวง IP' : `วง ${ev.groupLabel || 'IP เดียวกัน'}`;
            if (typeof showToast === 'function') {
              showToast(`🚨 ${ev.triggerProfileName || ev.triggerProfileId}${charPart} ติดคุก — สั่งปิด ${modeDesc} (${ev.closedCount || 0} จอ) แล้ว`, 'warning');
            }
          }
        } else if (!hasSeededJailAutoCloseEvent) {
          hasSeededJailAutoCloseEvent = true;
        }

        if (data.captchaStats && typeof data.captchaStats.totalSolved === 'number') {
          updateCaptchaSolvedDisplay(data.captchaStats.totalSolved);
        }
        if (data.screenProxySummary && typeof updateScreenProxyToolbarBtn === 'function') {
          updateScreenProxyToolbarBtn(data.screenProxySummary);
        }
        if (data.channelCheckMode && typeof syncChannelCheckModeUI === 'function') {
          syncChannelCheckModeUI(data.channelCheckMode);
        }

        // Play alert chime if any card has humanCheck active or is in prison
        const hasActiveHumanCheck = currentProfiles.some(p => p.liveState && p.liveState.humanCheck && p.liveState.humanCheck.active);
        const hasPrisonProfile = currentProfiles.some(p => p.liveState && typeof p.liveState.map === 'string' && /คุก|เรือนจำ|\bprison\b|\bjail\b/i.test(p.liveState.map));
        if (hasActiveHumanCheck || hasPrisonProfile) {
          playHumanCheckAlert(hasPrisonProfile);
        }
        if (typeof updateCaptchaPendingNotifications === 'function') {
          updateCaptchaPendingNotifications();
        }
      }
    } catch (err) {
      console.error("Failed to fetch profiles:", err);
    } finally {
      fetchProfilesInFlight = null;
    }
  })();
  return fetchProfilesInFlight;
}

function playHumanCheckAlert() {
  // ปิดเสียงแจ้งเตือน Captcha บนหน้า Manager ตามคำขอของผู้ใช้งาน
}

function updateCaptchaSolvedDisplay(count) {
  const el = document.getElementById("captcha-solved-count");
  if (!el) return;
  const num = Number(count) || 0;
  el.innerText = num.toLocaleString();
}
window.updateCaptchaSolvedDisplay = updateCaptchaSolvedDisplay;

let lastCaptchaStatsData = null;

async function fetchCaptchaStats() {
  try {
    const res = await fetch(`${API_BASE}/api/captcha-stats`).then(r => r.json());
    if (res && res.success && typeof res.totalSolved === 'number') {
      updateCaptchaSolvedDisplay(res.totalSolved);
      lastCaptchaStatsData = res;
    }
  } catch (e) {}
}

// ==========================================
// CAPTCHA HISTORY & DAILY BREAKDOWN MODAL
// ==========================================

function formatThaiDateLabel(dateStr, todayKey) {
  if (!dateStr) return '';
  const parts = dateStr.split('-').map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  const thaiMonths = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];
  const dateFormatted = `${d} ${thaiMonths[m - 1] || ''} ${y}`;
  if (dateStr === todayKey) {
    return `วันนี้ (${dateFormatted})`;
  }
  try {
    const dObj = new Date(`${dateStr}T12:00:00+07:00`);
    const todayObj = new Date(`${todayKey}T12:00:00+07:00`);
    const diffDays = Math.round((todayObj - dObj) / (1000 * 3600 * 24));
    if (diffDays === 1) return `เมื่อวาน (${dateFormatted})`;
    if (diffDays > 1 && diffDays <= 7) return `${diffDays} วันที่แล้ว (${dateFormatted})`;
  } catch (e) {}
  return dateFormatted;
}

function formatThaiTime(timestamp) {
  if (!timestamp) return '-';
  try {
    const d = new Date(Number(timestamp));
    const thaiMonths = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    const options = { timeZone: 'Asia/Bangkok', hour12: false, hour: '2-digit', minute: '2-digit' };
    const timeStr = new Intl.DateTimeFormat('th-TH', options).format(d);
    const day = d.getDate();
    const month = thaiMonths[d.getMonth()];
    return `${day} ${month} ${timeStr} น.`;
  } catch (e) {
    return new Date(timestamp).toLocaleString();
  }
}

async function loadCaptchaHistory() {
  const container = document.getElementById("captcha-history-list");
  if (!container) return;
  if (!lastCaptchaStatsData) {
    container.innerHTML = `<div style="text-align: center; color: #64748b; padding: 36px 12px; font-size: 12px;">กำลังโหลดสถิติ...</div>`;
  } else {
    renderCaptchaHistoryModal(lastCaptchaStatsData);
  }
  try {
    const res = await fetch(`/api/captcha-stats`).then(r => r.json());
    if (!res || !res.success) throw new Error(res?.error || "Failed to load stats");
    lastCaptchaStatsData = res;
    renderCaptchaHistoryModal(res);
  } catch (err) {
    if (!lastCaptchaStatsData) {
      container.innerHTML = `<div style="text-align: center; color: #ef4444; padding: 24px 12px; font-size: 12px;">⚠️ ไม่สามารถโหลดประวัติได้: ${err.message}</div>`;
    }
  }
}

function renderCaptchaHistoryModal(data) {
  const container = document.getElementById("captcha-history-list");
  if (!container) return;

  const todayEl = document.getElementById("ch-stat-today");
  const totalEl = document.getElementById("ch-stat-total");
  const lastEl = document.getElementById("ch-stat-last");
  if (todayEl) todayEl.innerText = (data.todaySolved || 0).toLocaleString();
  if (totalEl) totalEl.innerText = (data.totalSolved || 0).toLocaleString();
  if (lastEl) lastEl.innerText = formatThaiTime(data.lastSolvedAt);

  const daily = data.daily || {};
  const dateKeys = Object.keys(daily).sort().reverse();

  if (dateKeys.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: #64748b; padding: 40px 14px; font-size: 12px; background: rgba(15, 23, 42, 0.4); border-radius: 8px; border: 1px dashed rgba(255, 255, 255, 0.08);">
        <div style="font-size: 28px; margin-bottom: 8px;">🌱</div>
        <div style="color: #94a3b8; font-weight: 600; font-size: 13px;">ยังไม่มีประวัติการแก้ Captcha ที่บันทึกไว้</div>
        <div style="color: #64748b; font-size: 11px; margin-top: 4px;">เมื่อบอทตอบคำถามเช็คผู้เล่นสำเร็จ ระบบจะแยกสถิติตามวันและจอให้อัตโนมัติ</div>
      </div>
    `;
    return;
  }

  const profileMap = data.profiles || {};
  let html = "";

  dateKeys.forEach((dateStr, idx) => {
    const dayEntry = daily[dateStr] || { total: 0, byProfile: {} };
    const dateLabel = formatThaiDateLabel(dateStr, data.todayDate);
    const dayTotal = dayEntry.total || 0;
    const isFirst = idx === 0;
    const byProfile = dayEntry.byProfile || {};
    const profileIds = Object.keys(byProfile).sort((a, b) => (byProfile[b] || 0) - (byProfile[a] || 0));

    let profilesHtml = "";
    if (profileIds.length === 0) {
      profilesHtml = `<div style="color: #64748b; font-size: 11px; padding: 6px 4px; text-align: center;">ไม่มีข้อมูลแยกจอ</div>`;
    } else {
      profileIds.forEach(pid => {
        const count = byProfile[pid] || 0;
        const pct = dayTotal > 0 ? Math.round((count / dayTotal) * 100) : 0;
        
        let pName = pid;
        if (profileMap[pid] && profileMap[pid].name) {
          pName = profileMap[pid].name;
        } else if (typeof currentProfiles !== 'undefined') {
          const found = currentProfiles.find(p => p.id === pid);
          if (found && found.name) pName = found.name;
        }

        const shortId = pid.replace(/^profile_/, 'P-');

        profilesHtml += `
          <div class="ch-profile-item">
            <div class="ch-profile-name">
              <span class="ch-profile-dot"></span>
              <span class="ch-profile-label" title="${pid}">${pName}</span>
              <span class="ch-profile-id">#${shortId}</span>
            </div>
            <div class="ch-profile-bar-wrap" title="${pct}% ของวันนี้">
              <div class="ch-profile-bar" style="width: ${pct}%;"></div>
            </div>
            <div class="ch-profile-stat">
              <span>${count.toLocaleString()}</span> <small style="font-size: 10px; color: #6ee7b7;">ครั้ง</small>
              <span class="ch-profile-pct">(${pct}%)</span>
            </div>
          </div>
        `;
      });
    }

    html += `
      <div class="ch-day-card ${isFirst ? 'open' : ''}" data-date="${dateStr}">
        <div class="ch-day-header">
          <div class="ch-day-info">
            <span class="ch-day-toggle-icon">▶</span>
            <span class="ch-day-title">
              <span>${dateLabel}</span>
              ${dateStr === data.todayDate ? '<span style="font-size: 9.5px; background: rgba(52, 211, 153, 0.25); color: #34d399; padding: 1px 6px; border-radius: 999px; font-weight: 700;">วันนี้</span>' : ''}
            </span>
          </div>
          <div class="ch-day-badge">
            <span class="ch-count-num">${dayTotal.toLocaleString()}</span> ครั้ง
          </div>
        </div>
        <div class="ch-day-detail" style="display: ${isFirst ? 'flex' : 'none'};">
          ${profilesHtml}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  container.querySelectorAll('.ch-day-header').forEach(header => {
    header.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = header.closest('.ch-day-card');
      if (!card) return;
      const detail = card.querySelector('.ch-day-detail');
      if (!detail) return;
      const isOpen = card.classList.contains('open');
      if (isOpen) {
        card.classList.remove('open');
        detail.style.display = 'none';
      } else {
        card.classList.add('open');
        detail.style.display = 'flex';
      }
    });
  });
}

function openCaptchaHistoryModal() {
  const modal = document.getElementById("modal-captcha-history");
  if (!modal) return;
  modal.classList.add("active");
  modal.style.display = "flex";
  loadCaptchaHistory();
}
window.openCaptchaHistoryModal = openCaptchaHistoryModal;

function closeCaptchaHistoryModal() {
  const modal = document.getElementById("modal-captcha-history");
  if (modal) {
    modal.classList.remove("active");
    modal.style.display = "none";
  }
}
window.closeCaptchaHistoryModal = closeCaptchaHistoryModal;

function initCaptchaHistoryModal() {
  const pill = document.getElementById("captcha-solved-pill");
  if (pill) {
    pill.onclick = openCaptchaHistoryModal;
    pill.onkeydown = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openCaptchaHistoryModal();
      }
    };
  }

  const btnClose = document.getElementById("btn-captcha-history-close");
  const btnOk = document.getElementById("btn-captcha-history-ok");
  if (btnClose) btnClose.onclick = closeCaptchaHistoryModal;
  if (btnOk) btnOk.onclick = closeCaptchaHistoryModal;

  const btnRefresh = document.getElementById("btn-captcha-history-refresh");
  if (btnRefresh) {
    btnRefresh.onclick = () => {
      btnRefresh.innerText = "⏳ กำลังรีเฟรช...";
      loadCaptchaHistory().finally(() => {
        setTimeout(() => { btnRefresh.innerText = "🔄 รีเฟรช"; }, 400);
      });
    };
  }

  const modal = document.getElementById("modal-captcha-history");
  if (modal) {
    modal.onclick = (e) => {
      if (e.target === modal) closeCaptchaHistoryModal();
    };
  }

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal && modal.style.display !== "none") {
      closeCaptchaHistoryModal();
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCaptchaHistoryModal);
} else {
  initCaptchaHistoryModal();
}

// ==========================================
// HUMAN CHECK IMAGE BOARD SIMULATOR CONTROLLER
// ==========================================
const HC_SIM_PRESETS = [
  { id: 90301, name: 'Red Potion', icon: '/art/icons/items/red-potion.webp', color: '#ef4444' },
  { id: 2101, name: 'Guard', icon: '/art/icons/items/rogear-guard.webp', color: '#3b82f6' },
  { id: 90201, name: 'Phracon', icon: '/art/icons/items/phracon.webp', color: '#10b981' },
  { id: 90304, name: 'Blue Potion', icon: '/art/icons/items/blue-potion.webp', color: '#06b6d4' },
  { id: 5035, name: 'Poring Hat', icon: '/art/icons/items/rogear-poring-hat.webp', color: '#f43f5e' },
  { id: 90103, name: 'Clover', icon: '/art/icons/items/clover.webp', color: '#84cc16' }
];

let simCurrentGroundTruth = null;
let simLoadedImages = new Map();

function loadSimImage(src) {
  if (simLoadedImages.has(src)) return Promise.resolve(simLoadedImages.get(src));
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      simLoadedImages.set(src, img);
      resolve(img);
    };
    img.onerror = () => {
      resolve(null);
    };
    img.src = src;
  });
}

function drawSimFallbackIcon(ctx, item, x, y, size) {
  ctx.save();
  ctx.fillStyle = item.color || '#64748b';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x + 4, y + 4, size - 8, size - 8, 8);
  else ctx.rect(x + 4, y + 4, size - 8, size - 8);
  ctx.fill();
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(item.name.slice(0, 7), x + size / 2, y + size / 2 + 4);
  ctx.restore();
}

async function renderSimulatorBoard(presetVal) {
  const canvas = document.getElementById('hc-sim-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  const bw = 480, bh = 330;
  canvas.width = bw;
  canvas.height = bh;

  // Background matching Aetheria captcha screen
  const bgGrad = ctx.createLinearGradient(0, 0, bw, bh);
  bgGrad.addColorStop(0, '#151528');
  bgGrad.addColorStop(1, '#0c0c17');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, bw, bh);

  // Subtle grid lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x < bw; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, bh); ctx.stroke(); }
  for (let y = 0; y < bh; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(bw, y); ctx.stroke(); }

  // Select target
  let target = null;
  if (!presetVal || presetVal === 'random') {
    target = HC_SIM_PRESETS[Math.floor(Math.random() * HC_SIM_PRESETS.length)];
  } else {
    target = HC_SIM_PRESETS.find(p => String(p.id) === String(presetVal)) || HC_SIM_PRESETS[0];
  }

  // Pick 3 distractors
  const distractors = HC_SIM_PRESETS.filter(p => p.id !== target.id);
  const shuffledDistractors = distractors.sort(() => Math.random() - 0.5).slice(0, 3);

  // Place items at non-overlapping positions
  const itemSize = 64;
  const placed = [];

  function getNonOverlappingPos() {
    for (let attempts = 0; attempts < 50; attempts++) {
      const x = 30 + Math.floor(Math.random() * (bw - itemSize - 60));
      const y = 30 + Math.floor(Math.random() * (bh - itemSize - 60));
      const overlap = placed.some(p => Math.abs(p.x - x) < 70 && Math.abs(p.y - y) < 70);
      if (!overlap) {
        placed.push({ x, y });
        return { x, y };
      }
    }
    const fallbackX = 40 + placed.length * 80;
    const fallback = { x: Math.min(bw - itemSize - 20, fallbackX), y: 100 };
    placed.push(fallback);
    return fallback;
  }

  const targetPos = getNonOverlappingPos();
  const targetImg = await loadSimImage(target.icon);
  if (targetImg) {
    ctx.drawImage(targetImg, targetPos.x, targetPos.y, itemSize, itemSize);
  } else {
    drawSimFallbackIcon(ctx, target, targetPos.x, targetPos.y, itemSize);
  }

  // Draw distractors
  for (const d of shuffledDistractors) {
    const dPos = getNonOverlappingPos();
    const dImg = await loadSimImage(d.icon);
    if (dImg) {
      ctx.drawImage(dImg, dPos.x, dPos.y, itemSize, itemSize);
    } else {
      drawSimFallbackIcon(ctx, d, dPos.x, dPos.y, itemSize);
    }
  }

  simCurrentGroundTruth = {
    target,
    targetImg,
    x: targetPos.x,
    y: targetPos.y,
    centerX: targetPos.x + itemSize / 2,
    centerY: targetPos.y + itemSize / 2
  };

  // Update UI text
  const promptEl = document.getElementById('hc-sim-prompt-text');
  if (promptEl) promptEl.textContent = `เลือก ${target.name}`;

  const groundTruthEl = document.getElementById('hc-sim-ground-truth');
  if (groundTruthEl) groundTruthEl.textContent = `พิกัดจริง: (X: ${Math.round(simCurrentGroundTruth.centerX)}, Y: ${Math.round(simCurrentGroundTruth.centerY)})`;

  // Hide marker and reset result
  const marker = document.getElementById('hc-sim-target-marker');
  if (marker) marker.style.display = 'none';

  const coordEl = document.getElementById('hc-sim-res-coord');
  if (coordEl) coordEl.textContent = '-';
  const confEl = document.getElementById('hc-sim-res-conf');
  if (confEl) confEl.textContent = '-';
  const timeEl = document.getElementById('hc-sim-res-time');
  if (timeEl) timeEl.textContent = '-';
  const accEl = document.getElementById('hc-sim-res-acc');
  if (accEl) {
    accEl.textContent = 'รอสั่งแก้โจทย์';
    accEl.style.color = '#e2e8f0';
  }
}

async function solveSimulatorBoard() {
  if (!simCurrentGroundTruth) return;
  const canvas = document.getElementById('hc-sim-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  const btnSolve = document.getElementById('btn-hc-sim-solve');
  if (btnSolve) { btnSolve.disabled = true; btnSolve.textContent = '⏳ กำลังคำนวณ...'; }

  const startTime = performance.now();

  try {
    const boardData = ctx.getImageData(0, 0, 480, 330);
    const target = simCurrentGroundTruth.target;

    // Create 64x64 template
    const tCanvas = document.createElement('canvas');
    tCanvas.width = 64;
    tCanvas.height = 64;
    const tCtx = tCanvas.getContext('2d', { willReadFrequently: true });

    if (simCurrentGroundTruth.targetImg) {
      tCtx.drawImage(simCurrentGroundTruth.targetImg, 0, 0, 64, 64);
    } else {
      drawSimFallbackIcon(tCtx, target, 0, 0, 64);
    }
    const templateData = tCtx.getImageData(0, 0, 64, 64);

    const solver = window.ImageBoardSolver || (typeof ImageBoardSolver !== 'undefined' ? ImageBoardSolver : null);
    if (!solver) throw new Error('ไม่พบโมดูล ImageBoardSolver');

    const match = solver.matchTemplateOnBoard(boardData, templateData, { subsample: 2, coarseStep: 4 });
    const elapsed = Math.round(performance.now() - startTime);

    if (match && match.confidence >= 60) {
      // Position marker
      const marker = document.getElementById('hc-sim-target-marker');
      if (marker) {
        marker.style.left = `${match.centerX}px`;
        marker.style.top = `${match.centerY}px`;
        marker.style.display = 'block';
      }

      const dist = Math.round(Math.hypot(match.centerX - simCurrentGroundTruth.centerX, match.centerY - simCurrentGroundTruth.centerY));
      const isAccurate = dist <= 6;

      const coordEl = document.getElementById('hc-sim-res-coord');
      if (coordEl) coordEl.textContent = `(${match.centerX}, ${match.centerY})`;
      const confEl = document.getElementById('hc-sim-res-conf');
      if (confEl) confEl.textContent = `${match.confidence}%`;
      const timeEl = document.getElementById('hc-sim-res-time');
      if (timeEl) timeEl.textContent = `${elapsed} ms`;

      const accEl = document.getElementById('hc-sim-res-acc');
      if (accEl) {
        if (isAccurate) {
          accEl.textContent = `✅ แม่นยำ 100% (ตรงเป๊ะ ${dist}px)`;
          accEl.style.color = '#34d399';
        } else {
          accEl.textContent = `⚠️ คลาดเคลื่อน (${dist}px)`;
          accEl.style.color = '#fbbf24';
        }
      }

      // Also call server simulator endpoint for verification
      fetch(`${API_BASE}/api/human-check/simulate-board`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `เลือก ${target.name}`, itemId: target.id })
      }).catch(() => {});

    } else {
      const coordEl = document.getElementById('hc-sim-res-coord');
      if (coordEl) coordEl.textContent = 'ไม่พบพิกัด';
      const confEl = document.getElementById('hc-sim-res-conf');
      if (confEl) confEl.textContent = `${match?.confidence || 0}%`;
      const timeEl = document.getElementById('hc-sim-res-time');
      if (timeEl) timeEl.textContent = `${elapsed} ms`;
      const accEl = document.getElementById('hc-sim-res-acc');
      if (accEl) {
        accEl.textContent = '❌ ความมั่นใจต่ำเกินไป';
        accEl.style.color = '#ef4444';
      }
    }
  } catch (err) {
    showToast(`❌ เกิดข้อผิดพลาดในการคำนวณ: ${err.message}`, 'error');
  } finally {
    if (btnSolve) { btnSolve.disabled = false; btnSolve.textContent = '🚀 สั่งแก้โจทย์'; }
  }
}

function openHumanCheckSimulatorModal() {
  const modal = document.getElementById('modal-human-check-simulator');
  if (!modal) return;
  modal.classList.add('active');
  modal.style.display = 'flex';
  const sel = document.getElementById('hc-sim-preset-select');
  renderSimulatorBoard(sel ? sel.value : '90301');
}
window.openHumanCheckSimulatorModal = openHumanCheckSimulatorModal;

function closeHumanCheckSimulatorModal() {
  const modal = document.getElementById('modal-human-check-simulator');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
  }
}
window.closeHumanCheckSimulatorModal = closeHumanCheckSimulatorModal;

function initHumanCheckSimulator() {
  const btnOpen = document.getElementById('btn-hc-simulate');
  if (btnOpen) btnOpen.onclick = openHumanCheckSimulatorModal;
  const btnToolbar = document.getElementById('btn-toolbar-simulate-hc');
  if (btnToolbar) btnToolbar.onclick = openHumanCheckSimulatorModal;

  const btnClose = document.getElementById('btn-hc-sim-close');
  const btnDone = document.getElementById('btn-hc-sim-done');
  if (btnClose) btnClose.onclick = closeHumanCheckSimulatorModal;
  if (btnDone) btnDone.onclick = closeHumanCheckSimulatorModal;

  const sel = document.getElementById('hc-sim-preset-select');
  if (sel) {
    sel.onchange = () => renderSimulatorBoard(sel.value);
  }

  const btnGen = document.getElementById('btn-hc-sim-generate');
  if (btnGen) {
    btnGen.onclick = () => {
      const selVal = sel ? sel.value : 'random';
      renderSimulatorBoard(selVal);
    };
  }

  const btnSolve = document.getElementById('btn-hc-sim-solve');
  if (btnSolve) btnSolve.onclick = solveSimulatorBoard;

  const modal = document.getElementById('modal-human-check-simulator');
  if (modal) {
    modal.onclick = (e) => {
      if (e.target === modal) closeHumanCheckSimulatorModal();
    };
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.style.display !== 'none') {
      closeHumanCheckSimulatorModal();
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHumanCheckSimulator);
} else {
  initHumanCheckSimulator();
}
// ==========================================
// USAGE STATEMENT & DEBT HISTORY MODAL CONTROLLER
// ==========================================
let lastStatementData = null;
let currentStatementTab = 'usage'; // 'usage' | 'ledger'

async function fetchStatementData(force = false) {
  try {
    const res = await fetch(`${API_BASE}/api/script/statement`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (validStatement(data)) {
      lastStatementData = data;
      updateUsageStatementDisplay();
      const modal = document.getElementById("modal-usage-statement");
      if (modal && modal.style.display !== "none") {
        renderUsageStatementModal(data);
      }
      return data;
    }
    throw new Error('ใบสรุปยังไม่ตรงรูปแบบที่ถูกต้อง');
  } catch (err) {
    console.warn("Failed to fetch usage statement:", err);
    const content=document.getElementById('usage-statement-content');
    if(content&&!validStatement(lastStatementData))content.textContent='ยังอ่านใบสรุปจากเซิร์ฟเวอร์ไม่ได้ ไม่คำนวณจากจอออนไลน์';
    updateUsageStatementDisplay();
  }
  return null;
}
window.fetchStatementData = fetchStatementData;

function validStatement(data) {
  return data?.success===true&&data.schemaVersion===2&&data.unitScale===100&&['balanceUnits','rateUnits','estimatedUnits','usedSlotsToday','billableSlotsToday'].every(k=>Number.isSafeInteger(data[k]))&&data.rateUnits>=0&&data.estimatedUnits>=0&&data.usedSlotsToday>=0&&data.billableSlotsToday>=0&&['shadow','deferred'].includes(data.billingMode)&&Array.isArray(data.usage)&&Array.isArray(data.ledger);
}
function updateUsageStatementDisplay() {
  const pill=document.getElementById('btn-open-usage-statement'),text=document.getElementById('online-expense-text'),rateBadge=document.getElementById('header-merit-rate-badge'),rateTextNode=document.getElementById('header-merit-rate-text'),hcRateNode=document.getElementById('hc-merit-rate-text');if(!pill)return;
  if(!validStatement(lastStatementData)){if(text)text.textContent='ยังไม่มีใบสรุป';if(rateTextNode)rateTextNode.textContent='เก็บค่าส่วนบุญวันนี้ = — บุญ ต่อจอ';pill.title='ไม่คำนวณค่าใช้จ่ายจากจำนวนจอออนไลน์';pill.classList.remove('has-debt');return;}
  const data=lastStatementData,balance=data.balanceUnits/100,today=data.estimatedUnits/100,rate=data.rateUnits/100;
  const rateLabel=`เก็บค่าส่วนบุญวันนี้ = ${rate.toLocaleString()} บุญ ต่อจอ`;
  if(rateTextNode)rateTextNode.textContent=rateLabel;
  if(rateBadge)rateBadge.title=`${rateLabel} (คิดเฉพาะจอที่เปิดใช้งานบอทจริงในวันนี้ • คลิกเพื่อดูใบสรุปส่วนบุญ)`;
  if(hcRateNode)hcRateNode.textContent=`📌 ${rateLabel} • ดูรายละเอียดและยอดรอสรุปได้ในหน้าใบสรุป`;
  const banner=document.getElementById('us-daily-rate-banner');
  if(banner)banner.innerText=`📌 ${rateLabel} (ประจำวันที่ ${data.bangkokDay} • คิดเฉพาะจอที่เปิดใช้งานบอทจริง)`;
  pill.classList.toggle('has-debt',balance<0);
  if(text)text.textContent=balance<0?`ส่วนบุญ ${balance.toLocaleString()} • ${rateLabel} • วันนี้ ${today.toLocaleString()} ส่วนบุญ`:`${rateLabel} • วันนี้ ${today.toLocaleString()} ส่วนบุญ`;
  pill.title=`${rateLabel} • ยอดส่วนบุญปัจจุบัน: ${balance.toLocaleString()} ส่วนบุญ • ${data.billingMode==='shadow'?'โหมดทดลอง ไม่หักจริง':'คิดจาก slot ที่ใช้สคริปต์จริง'} • ${data.usedSlotsToday} slot วันนี้`;
}
function renderUsageStatementModal(data) {
  const container=document.getElementById('usage-statement-content');
  if(!validStatement(data)){if(container)container.textContent='ยังอ่านข้อมูลใบสรุปไม่ได้';return;}
  const set=(id,value)=>{const node=document.getElementById(id);if(node)node.innerText=value;},balance=data.balanceUnits/100,today=data.estimatedUnits/100;
  set('us-stat-balance-icon',balance<0?'🚨':'🟢');set('us-stat-balance-title',balance<0?'ส่วนบุญติดลบ':'ส่วนบุญคงเหลือ');set('us-stat-balance-val',balance.toLocaleString());set('us-stat-balance-sub',balance<0?'ยอดส่วนบุญติดลบ':'ยอดส่วนบุญปัจจุบัน');
  set('us-stat-today-val',today.toLocaleString());set('us-stat-today-sub',`วันที่ ${data.bangkokDay} • ${data.billingMode==='shadow'?'ไม่มีการหักจริง':data.billingMode==='deferred'?'คิดตาม slot ที่ใช้จริง':'หักตามรอบ'}`);
  set('us-daily-rate-banner',`📌 เก็บค่าส่วนบุญวันนี้ = ${data.rateUnits/100} บุญ ต่อจอ (ประจำวันที่ ${data.bangkokDay} • คิดเฉพาะจอที่เปิดใช้งานบอทจริง)`);
  set('us-stat-slots-val',String(data.usedSlotsToday));set('us-stat-slots-sub',`เก็บค่าส่วนบุญวันนี้ = ${data.rateUnits/100} บุญ ต่อจอ • คิดจริง ${data.billableSlotsToday} slot • เรท ${data.rateUnits/100} ส่วนบุญ/slot/วัน`);
  set('us-stat-mode-val',data.billingMode==='shadow'?'โหมดทดลอง ไม่หักจริง':'คิดตามการใช้จริง');set('us-stat-mode-sub',Number.isSafeInteger(data.shadowEstimatedUnits)?`ตัวอย่างจาก slot ที่สังเกต ${data.shadowEstimatedUnits/100} ส่วนบุญ (แยกจากยอดรอสรุปจริง)`:'ยอดตาม slot ที่ใช้สคริปต์จริง');
  const balanceNode=document.getElementById('us-stat-balance-val');if(balanceNode)balanceNode.style.color=balance<0?'#f87171':'#34d399';
  if(container){if(currentStatementTab==='usage')renderDailyUsageTab(container,data,today,data.usedSlotsToday,data.rateUnits/100);else renderLedgerTab(container,data);}
}
function renderDailyUsageTab(container,data,todayPoints,activeSlots,ratePoints) {
  const groups=new Map();
  for(const row of data.usage){if(typeof row.slot_id!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(row.bangkok_day||''))continue;let group=groups.get(row.bangkok_day);if(!group){group=new Map();groups.set(row.bangkok_day,group);}group.set(row.slot_id,row);}
  const ledger=new Map();for(const row of data.ledger)if(row.kind==='usage'&&typeof row.slot_id==='string'&&Number.isSafeInteger(row.delta_units))ledger.set(row.bangkok_day+':'+row.slot_id,row);
  let html=`<div class="us-row-item"><div><strong>วันนี้ ${escapeHTML(data.bangkokDay)}</strong><div>${activeSlots} slot ใช้สคริปต์ • คิดจริง ${data.billableSlotsToday} slot • เรท ${ratePoints} ส่วนบุญ</div></div><div>${todayPoints.toLocaleString()} ส่วนบุญ<div>${data.billingMode==='shadow'?'ทดลอง ไม่หักจริง':'ยอดรอสรุป'}</div></div></div>`;
  for(const [day,slots]of [...groups].sort((a,b)=>b[0].localeCompare(a[0]))){if(day===data.bangkokDay)continue;const billable=[...slots.values()].filter(r=>r.billable===1),entries=billable.map(r=>ledger.get(day+':'+r.slot_id)).filter(Boolean),complete=entries.length===billable.length;
    const sum=entries.reduce((units,r)=>units+r.delta_units,0),rates=[...new Set(entries.filter(r=>Number.isSafeInteger(r.rate_units)).map(r=>r.rate_units))];
    const status=!billable.length?'สังเกตการณ์ ไม่หักจริง':billable.some(r=>r.settled_ms==null)?'รอสรุป':complete?'สรุปจาก ledger แล้ว':'ยอด ledger บางส่วนอยู่นอกช่วงที่โหลด';
    const amount=!billable.length?'0':complete?(sum/100).toLocaleString():'—';
    html+=`<div class="us-row-item"><div><strong>วันที่ ${escapeHTML(day)}</strong><div>${slots.size} slot • คิดจริง ${billable.length} slot • เรทที่บันทึก ${rates.length?rates.map(r=>r/100).join(', '):'—'} ส่วนบุญ</div><small>${escapeHTML([...slots.keys()].join(', '))}</small></div><div>${amount} ส่วนบุญ<div>${status}</div></div></div>`;
  }
  if(!groups.size)html+='<div style="padding:24px;color:#94a3b8">ยังไม่มีบันทึกการใช้ slot จากเซิร์ฟเวอร์</div>';
  container.innerHTML=html;
}
function renderLedgerTab(container,data) {
  const labels={usage:'สรุปค่าบริการรายวัน',topup:'เติมส่วนบุญ',adjustment:'ปรับยอดโดยผู้ดูแล',proxy:'สมัครผ่าน Proxy',proxy_register:'สมัครผ่าน Proxy'};
  const entries=data.ledger.filter(row=>Number.isSafeInteger(row.delta_units));if(!entries.length){container.textContent='ยังไม่มีรายการเดินบัญชีส่วนบุญ';return;}
  container.innerHTML=entries.map(row=>{const amount=row.delta_units/100,time=Number.isSafeInteger(row.created_ms)?new Intl.DateTimeFormat('th-TH',{timeZone:'Asia/Bangkok',dateStyle:'short',timeStyle:'short'}).format(new Date(row.created_ms)):'—';return `<div class="us-row-item"><div><strong>${escapeHTML(labels[row.kind]||'รายการเดินบัญชี')}</strong><div>${escapeHTML(row.bangkok_day||time)} ${row.slot_id?'• slot '+escapeHTML(row.slot_id):''}</div><small>${escapeHTML(row.reason||row.entry_key||'')}</small></div><div style="color:${amount<0?'#f87171':'#34d399'}">${amount>0?'+':''}${amount.toLocaleString()} ส่วนบุญ</div></div>`;}).join('');
}

window.updateUsageStatementDisplay=updateUsageStatementDisplay;

function openUsageStatementModal() {
  const modal = document.getElementById("modal-usage-statement");
  if (!modal) return;
  modal.classList.add("active");
  modal.style.display = "flex";
  fetchStatementData(true);
}
window.openUsageStatementModal = openUsageStatementModal;

function closeUsageStatementModal() {
  const modal = document.getElementById("modal-usage-statement");
  if (modal) {
    modal.classList.remove("active");
    modal.style.display = "none";
  }
}
window.closeUsageStatementModal = closeUsageStatementModal;

function initUsageStatementModal() {
  const pill = document.getElementById("btn-open-usage-statement");
  if (pill) {
    pill.onclick = openUsageStatementModal;
    pill.onkeydown = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openUsageStatementModal();
      }
    };
  }
  const rateBadge = document.getElementById("header-merit-rate-badge");
  if (rateBadge) {
    rateBadge.onclick = openUsageStatementModal;
    rateBadge.onkeydown = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openUsageStatementModal();
      }
    };
  }

  const btnClose = document.getElementById("btn-usage-statement-close");
  const btnOk = document.getElementById("btn-usage-statement-ok");
  if (btnClose) btnClose.onclick = closeUsageStatementModal;
  if (btnOk) btnOk.onclick = closeUsageStatementModal;

  const btnTopup = document.getElementById("btn-usage-statement-topup");
  if (btnTopup) {
    btnTopup.onclick = () => {
      closeUsageStatementModal();
      const topupBtn = document.getElementById("btn-topup-captcha");
      if (topupBtn) topupBtn.click();
    };
  }

  const tabUsage = document.getElementById("us-tab-usage");
  const tabLedger = document.getElementById("us-tab-ledger");

  if (tabUsage && tabLedger) {
    tabUsage.onclick = () => {
      currentStatementTab = 'usage';
      tabUsage.style.background = "rgba(56, 189, 248, 0.2)";
      tabUsage.style.color = "#38bdf8";
      tabUsage.style.border = "1px solid rgba(56, 189, 248, 0.4)";
      tabUsage.style.fontWeight = "700";

      tabLedger.style.background = "transparent";
      tabLedger.style.color = "#94a3b8";
      tabLedger.style.border = "none";
      tabLedger.style.fontWeight = "normal";

      if (lastStatementData) renderUsageStatementModal(lastStatementData);
    };

    tabLedger.onclick = () => {
      currentStatementTab = 'ledger';
      tabLedger.style.background = "rgba(56, 189, 248, 0.2)";
      tabLedger.style.color = "#38bdf8";
      tabLedger.style.border = "1px solid rgba(56, 189, 248, 0.4)";
      tabLedger.style.fontWeight = "700";

      tabUsage.style.background = "transparent";
      tabUsage.style.color = "#94a3b8";
      tabUsage.style.border = "none";
      tabUsage.style.fontWeight = "normal";

      if (lastStatementData) renderUsageStatementModal(lastStatementData);
    };
  }

  const btnRefresh = document.getElementById("btn-usage-statement-refresh");
  if (btnRefresh) {
    btnRefresh.onclick = () => {
      btnRefresh.innerText = "⏳ กำลังรีเฟรช...";
      fetchStatementData(true).finally(() => {
        setTimeout(() => { btnRefresh.innerText = "🔄 รีเฟรช"; }, 400);
      });
    };
  }

  const modal = document.getElementById("modal-usage-statement");
  if (modal) {
    modal.onclick = (e) => {
      if (e.target === modal) closeUsageStatementModal();
    };
  }

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal && modal.style.display !== "none") {
      closeUsageStatementModal();
    }
  });

  // Initial statement fetch
  fetchStatementData();
  // Poll statement every 60s
  setInterval(() => fetchStatementData(), 60000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initUsageStatementModal);
} else {
  initUsageStatementModal();
}



window.answerHumanCheckQuick = async function(profileId, pick) {
  if (!confirm(`ยืนยันการตอบตัวเลือกที่ ${pick + 1} ให้จอ [${profileId}] ใช่หรือไม่?`)) return;
  try {
    const res = await fetch('/api/human-check/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId, pick })
    }).then(r => r.json());
    if (res && res.success) {
      alert(`✅ ตอบตัวเลือกที่ ${pick + 1} เรียบร้อยแล้ว!`);
      fetchProfiles();
    } else {
      alert(`❌ สั่งตอบไม่สำเร็จ: ${res.error || 'Unknown error'}`);
    }
  } catch (e) {
    alert(`❌ เกิดข้อผิดพลาด: ${e.message}`);
  }
};

function updateMetrics() {
  const total = currentProfiles.length;
  if (totalEl) totalEl.innerText = total;
  const tabCount = document.getElementById("tab-count-profiles");
  if (tabCount) tabCount.innerText = total;
  const onlineCount = currentProfiles.filter(p => p.isRunning).length;
  if (onlineEl) onlineEl.innerText = onlineCount;
  const farmingCount = currentProfiles.filter(p => p.liveState && p.liveState.isBotRunning && (!p.liveState.screenPhase || p.liveState.screenPhase === 'in_game')).length;
  if (farmingEl) farmingEl.innerText = farmingCount;

  const setBar = (id, ofId, count) => {
    const bar = document.getElementById(id);
    if (bar) bar.style.width = `${total > 0 ? Math.round((count / total) * 100) : 0}%`;
    const of = document.getElementById(ofId);
    if (of) of.innerText = `/ ${total}`;
  };
  setBar("metric-online-bar", "metric-online-of", onlineCount);
  setBar("metric-farming-bar", "metric-farming-of", farmingCount);

  if (typeof updateUsageStatementDisplay === 'function') {
    updateUsageStatementDisplay(onlineCount);
  }

  const totalZeny = currentProfiles.reduce((sum, p) => {
    const z = p.liveState && typeof p.liveState.zeny === 'number' ? p.liveState.zeny : 0;
    return sum + z;
  }, 0);
  if (zenyEl) {
    zenyEl.innerText = `${totalZeny.toLocaleString()} z`;
  }
}

// ==========================================
// RENDER CLIENT PROFILES (CARDS)
// ==========================================

// Accent hue per class family (used for portrait ring, class chip & card glow)
function getClassHue(cls) {
  const c = String(cls || '').toLowerCase();
  if (/novice/.test(c)) return 215;
  if (/bard|dancer|gypsy|clown/.test(c)) return 285;
  if (/archer|hunter|sniper|ranger/.test(c)) return 150;
  if (/sword|knight|crusader|paladin/.test(c)) return 0;
  if (/mage|wizard|sage|warlock/.test(c)) return 220;
  if (/acolyte|priest|monk/.test(c)) return 45;
  if (/thief|assassin|rogue/.test(c)) return 265;
  if (/merchant|blacksmith|alchemist/.test(c)) return 25;
  return 195;
}

// Portrait served through the manager's cache (/api/portrait) so offline cards keep their face
const failedPortraits = new Set();
function onPortraitError(img) {
  failedPortraits.add(img.getAttribute('src'));
  img.parentElement.classList.add('no-img');
  img.remove();
}

function getPortraitSrc(p, state) {
  const hasLiveChar = Boolean(state && state.charName);
  let src = (hasLiveChar ? state?.portrait : '') || p.lastPortrait || state?.portrait || '';
  if (!src) {
    const rawCls = String((hasLiveChar && state?.charClass) || p.lastCharClass || p.charClass || 'novice').toLowerCase();
    const cls = rawCls.split(/[^a-z]+/)[0] || 'novice';
    src = `https://www.aetheria-online.in.th/art/classes/${cls}-face.webp`;
  } else if (!src.startsWith('http')) {
    src = `https://www.aetheria-online.in.th${src.startsWith('/') ? '' : '/'}${src}`;
  }
  return failedPortraits.has(src) ? '' : src;
}

function getActivityTone(text, screenPhase) {
  if (screenPhase && screenPhase !== 'in_game') {
    if (screenPhase === 'account_banned' || screenPhase === 'char_select_error' || screenPhase === 'login_error' || screenPhase === 'login_auth_error' || screenPhase === 'char_select_online' || screenPhase === 'disconnected') return 'danger';
    if (screenPhase === 'char_select_limit' || screenPhase === 'loading' || screenPhase === 'char_select_loading' || screenPhase === 'register_queue') return 'warn';
    if (screenPhase === 'login' || screenPhase === 'login_loading' || screenPhase === 'char_select' || screenPhase === 'char_create' || screenPhase === 'register') return 'travel';
  }
  const t = String(text || '');
  if (t.includes('ตาย') || t.includes('ชุบ') || t.includes('พลาด') || t.includes('ไม่ตอบ') || t.includes('ไม่ผ่าน') || t.includes('Error') || t.includes('HTTP 5') || t.includes('ค้างออนไลน์')) return 'danger';
  if (t.includes('ซื้อ') || t.includes('ขาย') || t.includes('กำลังโหลด') || t.includes('จำกัด 2 จอ') || t.includes('จำกัด 3 จอ') || t.includes('รีเฟรช') || t.includes('รอคิวสมัคร') || t.includes('ถึงคิวสมัคร')) return 'warn';
  if (t.includes('เดิน') || t.includes('หน้า Login') || t.includes('เลือกตัวละคร') || t.includes('สมัครบัญชี') || t.includes('สร้างตัวละคร') || t.includes('กำลังเข้าสู่ระบบ')) return 'travel';
  if (t.includes('ฟาร์ม') || t.includes('Farm')) return 'farm';
  if (t.includes('รอ') || t.includes('แสตนด์บาย') || t.includes('หยุด')) return 'idle';
  return 'farm';
}

// State for top-right card dropdown menu & client-side Zeny rate fallback
let openCardMenuProfileId = null;
const clientZenyTrackers = {};

function toggleCardMenu(profileId, event) {
  if (event) event.stopPropagation();
  openCardMenuProfileId = (openCardMenuProfileId === profileId) ? null : profileId;
  renderProfiles();
}

function closeCardMenu() {
  if (openCardMenuProfileId !== null) {
    openCardMenuProfileId = null;
    renderProfiles();
  }
}

document.addEventListener('click', (e) => {
  if (openCardMenuProfileId && !e.target.closest('.card-top-menu')) {
    closeCardMenu();
  }
});

function getProfileZenyRate(p) {
  const isOnline = p.isRunning;
  const state = isOnline ? p.liveState : null;
  if (isOnline && state && typeof state.zeny === 'number') {
    const now = Date.now();
    const z = state.zeny;
    const gross = (typeof state.grossZenyGained === 'number' && Number.isFinite(state.grossZenyGained)) ? state.grossZenyGained : null;
    const isConsolReceiver = Boolean(state.consolidationReceiverMode);
    const charName = state.charName || '';
    let tr = clientZenyTrackers[p.id];
    if (!tr || (charName && tr.charName && tr.charName !== charName)) {
      tr = clientZenyTrackers[p.id] = {
        charName,
        startTime: now,
        lastTime: now,
        lastZeny: z,
        lastGrossGained: gross,
        totalGained: 0,
        samples: []
      };
    } else {
      if (charName && !tr.charName) tr.charName = charName;
      let gainDelta = 0;
      if (gross !== null) {
        if (typeof tr.lastGrossGained === 'number' && gross >= tr.lastGrossGained) {
          gainDelta = gross - tr.lastGrossGained;
        } else if (typeof tr.lastGrossGained === 'number' && gross > 0 && gross < tr.lastGrossGained) {
          gainDelta = gross;
        } else if (tr.lastGrossGained == null && typeof tr.lastZeny === 'number') {
          const rawDelta = z - tr.lastZeny;
          if (rawDelta > 0 && !isConsolReceiver) gainDelta = rawDelta;
        }
        tr.lastGrossGained = gross;
      } else {
        const delta = z - tr.lastZeny;
        if (delta > 0 && !isConsolReceiver) {
          gainDelta = delta;
        }
      }
      tr.lastZeny = z;
      tr.lastTime = now;
      if (gainDelta > 0 && !isConsolReceiver) {
        tr.totalGained += gainDelta;
        tr.samples.push({ t: now, gain: gainDelta });
      }
    }
    const cutoff = now - 60 * 60 * 1000;
    if (tr.samples.length > 0 && tr.samples[0].t < cutoff) {
      tr.samples = tr.samples.filter(s => s.t >= cutoff);
    }
    const windowStart = Math.max(tr.startTime, cutoff);
    const elapsedMs = Math.max(0, now - windowStart);
    const windowGain = tr.samples.reduce((sum, s) => sum + s.gain, 0);
    let clientGpm = 0;
    if (elapsedMs >= 3000 && windowGain > 0) {
      const effectiveMin = Math.max(elapsedMs / 60000, 0.25);
      clientGpm = Math.round(windowGain / effectiveMin);
    }
    const srvGpm = (p.zenyRate && typeof p.zenyRate.gpm === 'number') ? p.zenyRate.gpm : 0;
    const gpm = srvGpm > 0 ? srvGpm : clientGpm;
    return {
      gpm,
      gph: (p.zenyRate && p.zenyRate.gph > 0) ? p.zenyRate.gph : (gpm * 60),
      totalGained: Math.max((p.zenyRate && p.zenyRate.totalGained) || 0, tr.totalGained || 0)
    };
  }
  if (p.zenyRate && typeof p.zenyRate.gpm === 'number') {
    return {
      gpm: p.zenyRate.gpm,
      gph: p.zenyRate.gph || (p.zenyRate.gpm * 60),
      totalGained: p.zenyRate.totalGained || 0
    };
  }
  return { gpm: 0, gph: 0, totalGained: 0 };
}

function resetZenyRate(profileId, event) {
  if (event) event.stopPropagation();
  delete clientZenyTrackers[profileId];
  const p = currentProfiles.find(x => x.id === profileId);
  if (p && p.zenyRate) {
    p.zenyRate = { gpm: 0, gph: 0, totalGained: 0, elapsedSec: 0 };
  }
  fetch(`${API_BASE}/api/profiles/${profileId}/reset-zeny-rate`, { method: 'POST' }).catch(() => {});
  renderProfiles();
  if (typeof showToast === 'function') {
    showToast('🔄 รีเซ็ตค่าเฉลี่ย GP/M · GP/H ของจอนี้แล้ว', 'info');
  }
}

function formatBytes(bytes, decimals = 1) {
  const n = Number(bytes) || 0;
  if (n <= 0) return '0 B';
  if (n < 1024) return `${Math.round(n)} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(decimals)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(decimals)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatBytesShort(bytes) {
  const n = Number(bytes) || 0;
  if (n <= 0) return '0B';
  if (n < 1024) return `${Math.round(n)}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10240 ? 1 : 0)}K`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)}M`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)}G`;
}

const clientBwFallback = {};
function getProfileBandwidth(p) {
  if (p.bandwidth && typeof p.bandwidth.todayBytes === 'number') {
    return p.bandwidth;
  }
  const lbw = p.liveState && p.liveState.bandwidth;
  if (lbw && typeof lbw.totalBytes === 'number') {
    const now = Date.now();
    let tr = clientBwFallback[p.id];
    if (!tr || tr.sessionId !== lbw.sessionId) {
      tr = clientBwFallback[p.id] = {
        sessionId: lbw.sessionId,
        startTime: now,
        startBytes: lbw.totalBytes
      };
    }
    const elapsedSec = Math.max(1, (now - tr.startTime) / 1000);
    const delta = Math.max(0, lbw.totalBytes - tr.startBytes);
    const bps = elapsedSec >= 2 ? Math.round(delta / elapsedSec) : 0;
    const bytesPerHour = bps * 3600;
    return {
      todayBytes: lbw.totalBytes,
      todayRxBytes: lbw.rxBytes || 0,
      todayTxBytes: lbw.txBytes || 0,
      bps,
      bytesPerHour,
      estDayBytes: bytesPerHour * 24
    };
  }
  return {
    todayBytes: 0,
    todayRxBytes: 0,
    todayTxBytes: 0,
    bps: 0,
    bytesPerHour: 0,
    estDayBytes: 0
  };
}

function getAllBandwidthSummary() {
  if (currentBandwidthSummary && typeof currentBandwidthSummary.todayBytes === 'number') {
    return currentBandwidthSummary;
  }
  return currentProfiles.reduce((acc, p) => {
    const b = getProfileBandwidth(p);
    acc.todayBytes += (b.todayBytes || 0);
    acc.todayRxBytes += (b.todayRxBytes || 0);
    acc.todayTxBytes += (b.todayTxBytes || 0);
    acc.totalBps += (b.bps || 0);
    acc.totalBytesPerHour += (b.bytesPerHour || 0);
    acc.totalEstDayBytes += (b.estDayBytes || 0);
    return acc;
  }, { todayBytes: 0, todayRxBytes: 0, todayTxBytes: 0, totalBps: 0, totalBytesPerHour: 0, totalEstDayBytes: 0 });
}

function resetProfileBandwidth(profileId, event) {
  if (event) event.stopPropagation();
  delete clientBwFallback[profileId];
  const p = currentProfiles.find(x => x.id === profileId);
  if (p && p.bandwidth) {
    p.bandwidth = {
      ...p.bandwidth,
      todayBytes: 0,
      todayRxBytes: 0,
      todayTxBytes: 0,
      bps: 0,
      bytesPerHour: 0,
      estDayBytes: 0
    };
  }
  fetch(`${API_BASE}/api/profiles/${profileId}/reset-bandwidth`, { method: 'POST' })
    .then(() => fetchProfiles())
    .catch(() => {});
  renderProfiles();
  if (typeof showToast === 'function') {
    showToast('🔄 รีเซ็ตสถิติการใช้เน็ต (Bandwidth) ของจอนี้แล้ว', 'info');
  }
}

function isProfilePremium(p) {
  if (!p) return false;
  if (p.hasPremium === true) return true;
  if (p.liveState && p.liveState.hasPremium === true) return true;
  const until = Number(p.premiumUntil || p.liveState?.premiumUntil || p.lastPremiumUntil || 0);
  return until > Date.now();
}

const captchaHighlightUntilMap = new Map();

function buildProfileCard(p) {
  const isOnline = p.isRunning;
  const state = isOnline ? p.liveState : null;
  const isWindowHidden = Boolean(state && typeof state.zeroRender === 'boolean' ? state.zeroRender : p.windowState?.isHidden);
  const isBotRunning = Boolean(state && state.isBotRunning);
  const isMenuOpen = openCardMenuProfileId === p.id;
  const hasPremium = isProfilePremium(p);
  const isJailed = Boolean(p.isJailed || (state && typeof state.map === 'string' && /คุก|เรือนจำ|\bprison\b|\bjail\b/i.test(state.map)));
  const isBanned = Boolean(p.isBanned || (state && (state.accountBanned || state.screenPhase === 'account_banned')));
  const banReason = p.banReason || state?.banReason || '';
  const isPostSellOverweightStop = Boolean(state?.postSellOverweightStop || p.postSellOverweightStop);
  const postSellStopReason = state?.postSellStopReason || p.postSellStopReason || 'ขายแล้วยังน้ำหนักเกิน';
  const postSellStopDetail = state?.postSellStopDetail || p.postSellStopDetail || postSellStopReason;

  const rawSavedClass = (p.charClass === 'Hunter' && !p.lastCharClass) ? '' : (p.lastCharClass || p.charClass || '');
  const charName = state?.charName || p.lastCharName || null;
  const curClass = (state?.charClass && state.charClass !== 'Novice') ? state.charClass : (rawSavedClass || state?.charClass || 'Traveler');
  const hue = getClassHue(curClass);
  const portraitSrc = getPortraitSrc(p, state);
  const initial = escapeHTML(String(charName || p.name || '?').trim().charAt(0).toUpperCase());

  // Levels: prefer parsed numbers, fall back to the raw "Base Lv. 99\nJob Lv. 50" text
  let baseLv = state?.baseLv ?? null;
  let jobLv = state?.jobLv ?? null;
  if (state?.levels && (baseLv === null || jobLv === null)) {
    const nums = String(state.levels).match(/\d+/g) || [];
    if (baseLv === null && nums[0]) baseLv = Number(nums[0]);
    if (jobLv === null && nums[1]) jobLv = Number(nums[1]);
  }

  const rawTargetMap = (p.targetMap === 'ถนนต้นหลิว' || p.targetMap === 'เมืองหลวงโซลเฮเวน') ? '' : (p.targetMap || '');
  const curMap = (state && state.map && state.map !== 'ไม่ทราบแมพ') ? state.map : (rawTargetMap || (isOnline ? 'Nightcamp World' : 'ออฟไลน์'));
  const weightPct = state?.weight ? parseFloat(String(state.weight).replace(/[^\d.]/g, '')) : NaN;
  const weightTone = weightPct >= 80 ? 'bad' : weightPct >= 60 ? 'warn' : 'ok';
  const bw = getProfileBandwidth(p);
  const allBw = getAllBandwidthSummary();

  // HP & SP
  const hpCur = state?.hp;
  const hpMax = state?.hpMax || hpCur || 1;
  const hpPct = (typeof hpCur === 'number' && hpMax > 0) ? Math.min(100, Math.round((hpCur / hpMax) * 100)) : 100;
  const hpStr = typeof hpCur === 'number' ? `${hpCur.toLocaleString()} / ${hpMax.toLocaleString()}` : (state?.hpText || '--');

  const spCur = state?.sp;
  const spMax = state?.spMax || spCur || 1;
  const spPct = (typeof spCur === 'number' && spMax > 0) ? Math.min(100, Math.round((spCur / spMax) * 100)) : 100;
  const spStr = typeof spCur === 'number' ? `${spCur.toLocaleString()} / ${spMax.toLocaleString()}` : (state?.spText || '--');

  const expPct = (t) => (t === 'MAX' ? 100 : Math.min(100, parseFloat(t) || 0));
  const hasExp = Boolean(state && (state.baseExp || state.jobExp));

  const screenPhase = state?.screenPhase || 'in_game';
  const isPreGameScreen = Boolean(isOnline && state && screenPhase && screenPhase !== 'in_game');
  const isErrorScreen = Boolean(isPreGameScreen && (screenPhase === 'account_banned' || screenPhase === 'char_select_error' || screenPhase === 'login_error' || screenPhase === 'login_auth_error' || screenPhase === 'char_select_online'));
  const isActivelyFarming = Boolean(isBotRunning && !isPreGameScreen && !isBanned);

  // Bot Activity Status
  let activityText = "ออฟไลน์";
  let activityTone = "offline";
  if (isBanned) {
    activityText = "🚫 บัญชีถูกระงับ (บล็อค IP แล้ว)";
    activityTone = "danger";
  } else if (isJailed) {
    activityText = isOnline ? "🚨 ติดคุก (เปิดจออยู่)" : "🚨 ติดคุก (ออฟไลน์)";
    activityTone = "danger";
  } else if (isPostSellOverweightStop) {
    activityText = `🛑 ${postSellStopReason}`;
    activityTone = "danger";
  } else if (isOnline) {
    if (isPreGameScreen) {
      activityText = state.screenPhaseLabel || state.botStatus || "⏳ กำลังโหลดเข้าเกม...";
      activityTone = getActivityTone(activityText, screenPhase);
    } else if (state) {
      if (state.botStatus) {
        activityText = state.botStatus;
        activityTone = getActivityTone(activityText, screenPhase);
      } else if (isBotRunning) {
        activityText = "⚔️ Auto-Farm ทำงาน";
        activityTone = "farm";
      } else {
        activityText = "⏸️ ยืนรอ / แสตนด์บาย";
        activityTone = "idle";
      }
    } else {
      activityText = "⏳ กำลังเชื่อมต่อ...";
      activityTone = "warn";
    }
  }

  const gauge = (kind, label, pct, val) => `
        <div class="gauge-row">
          <span class="gauge-lbl ${kind}">${label}</span>
          <div class="gauge-track"><div class="gauge-fill ${kind}" style="width: ${pct}%;"></div></div>
          <span class="gauge-val">${val}</span>
        </div>`;

  const isHighlightTarget = (captchaHighlightUntilMap.get(String(p.id)) || 0) > Date.now();
  return `
    <article class="profile-card ${isOnline ? 'is-online' : 'is-offline'} ${p.isMain ? 'is-main' : ''} ${hasPremium ? 'is-premium' : ''} ${isActivelyFarming ? 'is-farming' : ''} ${isErrorScreen ? 'is-screen-error' : ''} ${(isJailed || isBanned) ? 'is-jailed' : ''} ${isMenuOpen ? 'menu-open' : ''} ${isHighlightTarget ? 'is-captcha-target-highlight' : ''}" id="card-${p.id}" data-profile-id="${p.id}" style="--h: ${hue};">
      ${isBanned ? `
      <div class="card-jail-cross-overlay" title="ตรวจพบบัญชีนี้ถูกระงับการใช้งาน ระบบได้หยุดบอทและบล็อค Proxy IP ของจอนี้เรียบร้อยแล้ว">
        <svg class="jail-cross-svg" viewBox="0 0 200 200" preserveAspectRatio="none" aria-hidden="true">
          <line x1="12" y1="12" x2="188" y2="188" />
          <line x1="188" y1="12" x2="12" y2="188" />
        </svg>
        <div class="jail-cross-center-badge">
          <div class="jail-cross-icon">🚫</div>
          <div class="jail-cross-title">บัญชีถูกระงับ · บล็อค IP แล้ว</div>
          <div class="jail-cross-sub" style="max-width: 240px; white-space: normal; line-height: 1.35;">${escapeHTML(banReason || 'บัญชีถูกระงับการใช้งาน')}</div>
          <button type="button" class="btn-clear-jail-badge" onclick="clearProfileBan('${p.id}', event)" title="ล้างสถานะแจ้งเตือนแบนของจอนี้">✓ ล้างสถานะแบน</button>
        </div>
      </div>` : (isJailed ? `
      <div class="card-jail-cross-overlay" title="ตรวจพบตัวละครนี้อยู่ในแมพคุก (แสดงสถานะสีแดงแจ้งเตือนโดยไม่ปิดจออัตโนมัติ)">
        <svg class="jail-cross-svg" viewBox="0 0 200 200" preserveAspectRatio="none" aria-hidden="true">
          <line x1="12" y1="12" x2="188" y2="188" />
          <line x1="188" y1="12" x2="12" y2="188" />
        </svg>
        <div class="jail-cross-center-badge">
          <div class="jail-cross-icon">🚨</div>
          <div class="jail-cross-title">ติดคุก · ${isOnline ? 'เปิดจออยู่' : 'จอปิดอยู่'}</div>
          <div class="jail-cross-sub">${escapeHTML(p.jailedMap || 'แมพคุก')}${p.jailedAt ? ` · ${formatThaiTime(p.jailedAt)}` : ''}</div>
          <button type="button" class="btn-clear-jail-badge" onclick="clearProfileJail('${p.id}', event)" title="ล้างสถานะแจ้งเตือนคุกของจอนี้">✓ ล้างสถานะคุก</button>
        </div>
      </div>` : '')}
      <div class="card-hero">
        ${portraitSrc ? `<div class="card-hero-bg-wrap"><div class="card-hero-bg" style="background-image: url('${portraitSrc}');"></div></div>` : ''}
        <div class="avatar ${portraitSrc ? '' : 'no-img'}" onclick="openWebBotHUD('${p.id}')" title="คลิกเพื่อเปิดเมนูบอทของจอนี้">
          <span class="avatar-fallback">${initial}</span>
          ${portraitSrc ? `<img src="${portraitSrc}" alt="${escapeHTML(curClass)}" draggable="false" onerror="onPortraitError(this)">` : ''}
          ${baseLv !== null ? `<span class="avatar-lv" title="Base Level">${baseLv}</span>` : ''}
          <span class="avatar-dot ${isOnline ? 'online' : ''}"></span>
          <span class="avatar-hover-hint">🎮 เมนูบอท</span>
        </div>
        <div class="card-identity">
          <div class="card-title-row">
            <h3 class="profile-title" title="${escapeHTML(p.name)}">${escapeHTML(p.name)}</h3>
            ${isBanned ? `<span class="jail-card-badge" title="${escapeHTML(banReason || 'บัญชีถูกระงับ')}">🚫 โดนแบน</span>` : ''}
            ${isJailed ? `<span class="jail-card-badge" title="ตัวละครนี้อยู่ในแมพคุก">⛓️ ติดคุก</span>` : ''}
            ${isPostSellOverweightStop ? `<span class="jail-card-badge" style="background:rgba(239,68,68,0.24);color:#fecaca;border-color:#ef4444;" title="${escapeHTML(postSellStopDetail)}">⚠️ ${escapeHTML(postSellStopReason)}</span>` : ''}
            ${hasPremium ? `<span class="premium-card-badge" title="ตัวละครนี้มีสถานะ Premium (สามารถแลกเปลี่ยน/เทรดโอนเงินได้)">👑 PREMIUM</span>` : ''}
            ${p.isMain ? `<span class="chip chip-main">★ MAIN</span>` : ''}
          </div>

          <div class="card-subline">
            ${charName ? `<span class="char-live-name">👤 ${escapeHTML(charName)}</span>` : ''}
            <span class="profile-acc">${escapeHTML(p.account || (p.autoRegister ? '⏳ รอสมัครไอดีอัตโนมัติ' : 'บัญชีเริ่มต้น'))}</span>
            ${p.registerError ? `<span class="profile-acc" style="color:#f59e0b; font-size:0.74rem;" title="${escapeHTML(p.registerError)}">⚠️ ${escapeHTML(p.registerError)}</span>` : ''}
          </div>
          <div class="card-class-row">
            <span class="chip chip-class">${escapeHTML(curClass)}</span>
            ${baseLv !== null ? `<span class="lv-text">Base <b>${baseLv}</b></span>` : ''}
            ${jobLv !== null ? `<span class="lv-text">Job <b>${jobLv}</b></span>` : ''}
            ${buildPartyRoleChip(p.id)}
            ${p.screenProxy && p.screenProxy.active && p.screenProxy.proxyHost ? `<span class="chip" style="background:rgba(168,85,247,0.18);color:#e9d5ff;border:1px solid rgba(168,85,247,0.45);font-size:0.68rem;cursor:pointer;" onclick="openScreenProxyModal()" title="จอนี้เชื่อมต่อผ่านคิวแยก IP: ${escapeHTML(p.screenProxy.proxyHost)}:${p.screenProxy.proxyPort || ''} (ช่อง ${p.screenProxy.slotIndex || 1}/${p.screenProxy.maxScreensPerIp || 6})">🛡️ IP: ${escapeHTML(p.screenProxy.proxyHost)} (${p.screenProxy.slotIndex || 1}/${p.screenProxy.maxScreensPerIp || 6})</span>` : ''}
            ${p.ipIsolation && p.ipIsolation.isCustom ? `<span class="chip" style="background:rgba(245,158,11,0.18);color:#fde68a;border:1px solid rgba(251,191,36,0.48);font-size:0.68rem;cursor:pointer;" onclick="window.openDeviceDrawerTab && window.openDeviceDrawerTab('custom')" title="จอนี้ถูกจัดอยู่ในวงแยก IP / Device พิเศษ (${escapeHTML(p.ipIsolation.ipGroupName || 'Custom IP')} · ${escapeHTML(p.ipIsolation.deviceGroupName || 'Device')})">🎯 ${escapeHTML(p.ipIsolation.ipGroupName || 'แยกพิเศษ')}${Number(p.ipIsolation.surchargePct) > 0 ? ` (+${p.ipIsolation.surchargePct}%)` : ''}</span>` : ''}
          </div>
        </div>
        <div class="card-meta">
          <div class="card-meta-top">
            <span class="chip chip-port" title="Debug Port">:${p.debugPort || 48876}</span>
            <div class="card-top-menu ${isMenuOpen ? 'is-open' : ''}">
              <button type="button" class="btn-card-menu ${isMenuOpen ? 'active' : ''}" onclick="toggleCardMenu('${p.id}', event)" title="เมนูจัดการโปรไฟล์และการตั้งค่า">
                <span class="card-menu-bars">☰</span>
              </button>
              <div class="card-menu-dropdown" onclick="event.stopPropagation()">
                <div class="card-menu-header">⚙️ จัดการจอ: ${escapeHTML(p.name)}</div>
                <div class="card-menu-bw-box">
                  <div class="cm-bw-head">
                    <span>🌐 Bandwidth วันนี้ (จอนี้)</span>
                    <button type="button" class="cm-bw-reset-btn" onclick="resetProfileBandwidth('${p.id}', event)" title="รีเซ็ตสถิติการใช้เน็ตของจอนี้">🔄 รีเซ็ต</button>
                  </div>
                  <div class="cm-bw-grid">
                    <div class="cm-bw-item">
                      <span class="cm-bw-lbl">ใช้จริงวันนี้</span>
                      <span class="cm-bw-val">${formatBytes(bw.todayBytes)}</span>
                      <span class="cm-bw-sub">↓${formatBytesShort(bw.todayRxBytes)} · ↑${formatBytesShort(bw.todayTxBytes)}</span>
                    </div>
                    <div class="cm-bw-item">
                      <span class="cm-bw-lbl">คาดการณ์ 24 ชม.</span>
                      <span class="cm-bw-val est">${bw.estDayBytes > 0 ? `~${formatBytes(bw.estDayBytes)}` : '--'}</span>
                      <span class="cm-bw-sub">${isOnline ? `${formatBytesShort(bw.bps)}/s` : 'ออฟไลน์'} · ~${formatBytesShort(bw.bytesPerHour)}/ชม.</span>
                    </div>
                  </div>
                  <div class="cm-bw-total-row" title="ปริมาณการใช้เน็ตรวมทุกจอวันนี้และคาดการณ์ 24 ชม. สำหรับคำนวณแพ็กเกจ Proxy / VPN">
                    <span>🌍 รวมทุกจอ: <b>${formatBytes(allBw.todayBytes)}</b></span>
                    <span>(~<b>${formatBytes(allBw.totalEstDayBytes)}</b>/วัน)</span>
                  </div>
                </div>
                ${isOnline ? `
                <button type="button" class="card-menu-item" onclick="closeCardMenu(); focusClientWindow('${p.id}', this)">
                  <span class="cm-icon">🔝</span>
                  <span>ดึงจอขึ้นบนสุด (Popup)</span>
                </button>
                <button type="button" class="card-menu-item" onclick="closeCardMenu(); reloadClientPage('${p.id}', event, this)">
                  <span class="cm-icon">🔄</span>
                  <span>รีเฟรชหน้าเกม (Reload)</span>
                </button>
                <button type="button" class="card-menu-item" onclick="closeCardMenu(); toggleClientWindow('${p.id}')">
                  <span class="cm-icon">⚡</span>
                  <span>${isWindowHidden ? 'แสดงภาพกราฟิกปกติ' : 'พักการ์ดจอ (Zero-Render)'}</span>
                </button>
                <button type="button" class="card-menu-item cm-warn" onclick="closeCardMenu(); stopClient('${p.id}')">
                  <span class="cm-icon">⏹️</span>
                  <span>ปิดจอเกมนี้</span>
                </button>
                <div class="card-menu-divider"></div>` : ''}
                <button type="button" class="card-menu-item" onclick="closeCardMenu(); openWebBotHUD('${p.id}')">
                  <span class="cm-icon">🎮</span>
                  <span>เปิดเมนูบอท Nightcamp</span>
                </button>
                <button type="button" class="card-menu-item" onclick="closeCardMenu(); openScriptPlanModal('${p.id}')">
                  <span class="cm-icon">📜</span>
                  <span>ตั้งค่า Plan Script & Auto-Quest</span>
                </button>
                <button type="button" class="card-menu-item" onclick="closeCardMenu(); openEditModal('${p.id}')">
                  <span class="cm-icon">⚙️</span>
                  <span>แก้ไขการตั้งค่าโปรไฟล์</span>
                </button>
                <div class="card-menu-divider"></div>
                <button type="button" class="card-menu-item cm-danger" onclick="closeCardMenu(); deleteProfile('${p.id}')">
                  <span class="cm-icon">🗑️</span>
                  <span>ลบโปรไฟล์</span>
                </button>
              </div>
            </div>
          </div>
          ${isOnline ? `<span class="chip ${isWindowHidden ? 'chip-warn' : 'chip-ok'}" style="cursor:pointer;" onclick="toggleClientWindow('${p.id}')" title="คลิกเพื่อเปิด/ปิดโหมดพักการ์ดจอ (Zero-Render — บอททำงานปกติ 100%)">${isWindowHidden ? '⚡ Zero-Render' : '🖥️ แสดงภาพ'}</span>` : ''}
        </div>
      </div>

      ${state && (typeof hpCur === 'number' || typeof spCur === 'number') ? `
      <div class="char-gauges">
        ${gauge('hp', 'HP', hpPct, hpStr)}
        ${gauge('sp', 'SP', spPct, spStr)}
        ${hasExp ? `
        <div class="exp-row">
          <div class="exp-item">
            <span class="exp-lbl">Base EXP</span>
            <div class="gauge-track thin"><div class="gauge-fill exp" style="width: ${expPct(state.baseExp)}%;"></div></div>
            <span class="exp-val">${escapeHTML(state.baseExp || '--')}</span>
          </div>
          <div class="exp-item">
            <span class="exp-lbl">Job EXP</span>
            <div class="gauge-track thin"><div class="gauge-fill exp job" style="width: ${expPct(state.jobExp)}%;"></div></div>
            <span class="exp-val">${escapeHTML(state.jobExp || '--')}</span>
          </div>
        </div>` : ''}
      </div>` : ''}

      ${state?.humanCheck?.active ? `
      <div class="human-check-alert-box" style="margin: 8px 12px; background: rgba(239, 68, 68, 0.2); border: 2px solid #ef4444; border-radius: 8px; padding: 10px; animation: pulse 1.5s infinite;">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 6px;">
          <span style="font-weight: bold; color: #fca5a5; font-size: 13px;">🚨 เช็คผู้เล่น (Human Check)!</span>
          <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
            ${state.humanCheck.autoSolved ? `<span style="font-size: 11px; color: #a7f3d0; background: #065f46; padding: 2px 6px; border-radius: 4px; font-weight: bold;">🤖 ตอบอัตโนมัติแล้ว</span>` : ''}
            ${state.humanCheck.pausedByPolicy ? `<span style="font-size: 11px; color: #fde68a; background: rgba(180, 83, 9, 0.72); border: 1px solid rgba(251, 191, 36, 0.55); padding: 2px 6px; border-radius: 4px; font-weight: 700;">⏸️ ${escapeHTML(state.humanCheck.pauseReason || 'งดตอบอัตโนมัติตามตั้งค่า')}</span>` : ''}
            <span style="font-size: 11px; color: #fecaca; background: #b91c1c; padding: 2px 6px; border-radius: 4px;">${escapeHTML(state.humanCheck.meta || 'ตอบด่วน')}</span>
          </div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap;">
          <div style="font-size: 12px; color: #fff; font-weight: 500;">
            ❓ ${escapeHTML(state.humanCheck.prompt || 'กรุณาเลือกรูปภาพให้ถูกต้อง')}
          </div>
          <button type="button" class="btn btn-sm" style="font-size: 11px; padding: 3px 9px; background: rgba(251, 191, 36, 0.2); border: 1px solid rgba(251, 191, 36, 0.65); color: #fef08a; font-weight: 700; border-radius: 6px; cursor: pointer;" onclick="focusClientWindow('${p.id}', this)" title="ดึงหน้าต่างเกมของจอนี้ออกมาหน้าสุดเพื่อตอบคำถาม">🎯 ดึงจอเกมขึ้นมาตอบ</button>
        </div>
        <div style="display: grid; grid-template-columns: repeat(${Math.min(4, (state.humanCheck.options || []).length || 4)}, 1fr); gap: 6px;">
          ${((state.humanCheck.options && state.humanCheck.options.length) ? state.humanCheck.options : [0, 1, 2, 3]).map((opt, i) => {
            const idx = (typeof opt === 'object' && opt.index != null) ? opt.index : i;
            const name = (typeof opt === 'object' && opt.itemName) ? opt.itemName : `ข้อ ${i + 1}`;
            const icon = (typeof opt === 'object' && opt.icon) ? opt.icon : '';
            return `
            <button type="button" class="btn btn-sm" style="font-size: 11px; padding: 6px 4px; background: #dc2626; color: #fff; border: 1px solid #ef4444; border-radius: 6px; font-weight: bold; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; min-height: 48px;" onclick="answerHumanCheckQuick('${p.id}', ${idx})" title="${escapeHTML(name)}">
              ${icon ? `<img src="${escapeHTML(icon)}" style="width: 22px; height: 22px; object-fit: contain; border-radius: 3px;" onerror="this.style.display='none'">` : ''}
              <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; font-size: 10.5px;">${escapeHTML(name)}</span>
            </button>
            `;
          }).join('')}
        </div>
      </div>` : ''}

      ${isPostSellOverweightStop ? `
      <div class="post-sell-overweight-alert" style="margin: 8px 12px 2px; background: linear-gradient(135deg, rgba(239, 68, 68, 0.22), rgba(245, 158, 11, 0.16)); border: 1.5px solid rgba(239, 68, 68, 0.65); border-radius: 9px; padding: 8px 10px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 7px; min-width: 0;">
          <span style="font-size: 15px;">🛑</span>
          <div style="min-width: 0;">
            <div style="font-weight: 800; color: #fecaca; font-size: 12.5px; line-height: 1.25;">${escapeHTML(postSellStopReason)}</div>
            <div style="font-size: 11px; color: #fde68a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHTML(postSellStopDetail)}">${escapeHTML(postSellStopDetail)}</div>
          </div>
        </div>
        <span style="font-size: 10.5px; font-weight: 700; color: #fff; background: #dc2626; padding: 2px 7px; border-radius: 5px; white-space: nowrap;">STOP แล้ว</span>
      </div>` : ''}

      <div class="card-status-row">
        <span class="activity-pill tone-${activityTone}" title="${escapeHTML(state?.screenDetail || activityText)}"><i></i>${escapeHTML(activityText)}</span>
        <div class="points-chips">
          ${isPreGameScreen ? `<button type="button" class="btn-card-reload-inline ${isErrorScreen ? 'is-error' : ''}" onclick="reloadClientPage('${p.id}', event, this)" title="รีเฟรชหน้าเว็บเกมของจอนี้ทันที (Reload)">🔄 รีเฟรชจอ</button>` : ''}
          ${state?.statPoints ? `<span class="chip chip-points" title="แต้มสถานะที่ยังไม่ได้อัป">STAT ${state.statPoints}</span>` : ''}
          ${state?.skillPoints ? `<span class="chip chip-points" title="แต้มสกิลที่ยังไม่ได้อัป">SKILL ${state.skillPoints}</span>` : ''}
        </div>
      </div>

      <div class="card-body">
        <div class="stat-item stat-wide">
          ${isPreGameScreen ? `
          <span class="stat-lbl">🖥️ สถานะหน้าจอเกม${state?.autoRefreshInSec ? ` (รีเฟรชอัตโนมัติใน ${state.autoRefreshInSec} วิ)` : ''}</span>
          <span class="stat-val stat-map ${isErrorScreen ? 'is-screen-error' : 'is-screen-wait'}" title="${escapeHTML(state?.screenDetail || activityText)}">${escapeHTML(state?.screenDetail || activityText)}</span>
          ` : `
          <span class="stat-lbl">🌙 สถานะ / โซน</span>
          <span class="stat-val stat-map" title="${escapeHTML(curMap)}">${escapeHTML(curMap || 'Nightcamp World')}</span>
          `}
        </div>
        ${isOnline ? `
        <div class="stat-item">
          <span class="stat-lbl">เลเวล</span>
          <span class="stat-val mono text-cyan">${baseLv !== null ? `Lv ${baseLv}${jobLv !== null ? ` · Job ${jobLv}` : ''}` : '--'}</span>
        </div>
        <div class="stat-item">
          <span class="stat-lbl">HP</span>
          <span class="stat-val mono">${escapeHTML(hpStr)}</span>
        </div>
        <div class="stat-item">
          <span class="stat-lbl">SP</span>
          <span class="stat-val mono text-cyan">${escapeHTML(spStr)}</span>
        </div>
        <div class="stat-item">
          <span class="stat-lbl">น้ำหนัก</span>
          <span class="stat-val mono">${escapeHTML(state?.weight || '--')}</span>
          ${!isNaN(weightPct) ? `<div class="mini-track"><div class="mini-fill ${weightTone}" style="width: ${Math.min(100, weightPct)}%;"></div></div>` : ''}
        </div>` : ''}
        <div class="bw-rate-row" onclick="resetProfileBandwidth('${p.id}', event)" title="ปริมาณการใช้เน็ตของจอนี้วันนี้ (↓${formatBytes(bw.todayRxBytes)} / ↑${formatBytes(bw.todayTxBytes)}) · ความเร็ว ${formatBytes(bw.bps, 1)}/s (~${formatBytes(bw.bytesPerHour)}/ชม.) · รวมทุกจอวันนี้ ${formatBytes(allBw.todayBytes)} (คาดการณ์รวม ~${formatBytes(allBw.totalEstDayBytes)}/วัน) — คลิกเพื่อรีเซ็ตสถิติของจอนี้">
          <div class="bw-rate-cell">
            <div class="bw-cell-top">
              <span class="bw-rate-lbl">🌐 วันนี้</span>
              <span class="bw-rate-val bw-today">${(bw.todayBytes > 0 || isOnline) ? formatBytes(bw.todayBytes) : '--'}</span>
            </div>
            <div class="bw-cell-sub">
              <span>↓${formatBytesShort(bw.todayRxBytes)}</span>
              <span>↑${formatBytesShort(bw.todayTxBytes)}</span>
            </div>
          </div>
          <div class="bw-rate-sep"></div>
          <div class="bw-rate-cell">
            <div class="bw-cell-top">
              <span class="bw-rate-lbl">📊 ต่อวัน</span>
              <span class="bw-rate-val bw-est">${(bw.estDayBytes > 0 || isOnline) ? `~${formatBytes(bw.estDayBytes)}<small>/d</small>` : '--'}</span>
            </div>
            <div class="bw-cell-sub">
              <span>${isOnline && bw.bps > 0 ? `${formatBytes(bw.bps, 1)}/s` : 'ออฟไลน์'}</span>
              <span>${bw.bytesPerHour > 0 ? `~${formatBytesShort(bw.bytesPerHour)}/ชม.` : '24h'}</span>
            </div>
          </div>
        </div>
      </div>

      ${p.notes ? `<div class="card-notes" title="${escapeHTML(p.notes)}">📝 ${escapeHTML(p.notes)}</div>` : ''}

      <div class="card-footer-controls">
        <div class="card-action-row main-actions">
          ${isOnline ? (isBotRunning ? `
          <button class="btn btn-sm btn-bot-toggle is-stop" onclick="toggleBotExecution('${p.id}', false, this)" title="หยุดการทำงานของบอท (เกมยังเปิดอยู่)">
            <span>⏸️</span> หยุดบอท
          </button>` : `
          <button class="btn btn-sm btn-bot-toggle is-start" onclick="toggleBotExecution('${p.id}', true, this)" title="เริ่มการทำงานของบอททันที">
            <span>▶️</span> เริ่มบอท
          </button>`) : `
          <button class="btn btn-sm btn-launch" onclick="launchClient('${p.id}')" title="เปิดหน้าต่างเกมสำหรับโปรไฟล์นี้">
            <span>▶️</span> เปิดจอเกม
          </button>`}
          <button class="btn btn-sm btn-bot-menu" onclick="openWebBotHUD('${p.id}')" title="เปิดหน้าต่างเมนูบอท (หน้าตาเหมือนในเกม) สำหรับ Session นี้">
            <span>🎮</span> เมนูบอท
          </button>
          <button class="btn btn-sm btn-ghost" onclick="openScriptPlanModal('${p.id}')" title="ตั้งค่า Plan Script & Smart Auto-Quest ของจอนี้" style="border: 1px solid rgba(56, 189, 248, 0.38); background: rgba(56, 189, 248, 0.1); color: #7dd3fc; font-weight: 700; padding: 5px 8px;">
            <span>📜</span> Plan
          </button>
        </div>
      </div>
    </article>`;
}

// Minimal DOM morph: update only changed attributes/text so images don't reload
// and HP/SP bars animate instead of the whole grid being rebuilt every poll.
function morphNode(oldNode, newNode) {
  if (oldNode.isEqualNode(newNode)) return;
  if (oldNode.nodeType !== newNode.nodeType || oldNode.nodeName !== newNode.nodeName || oldNode.childNodes.length !== newNode.childNodes.length) {
    oldNode.replaceWith(newNode);
    return;
  }
  if (oldNode.nodeType !== Node.ELEMENT_NODE) {
    oldNode.nodeValue = newNode.nodeValue;
    return;
  }
  Array.from(oldNode.attributes).forEach(a => { if (!newNode.hasAttribute(a.name)) oldNode.removeAttribute(a.name); });
  Array.from(newNode.attributes).forEach(a => { if (oldNode.getAttribute(a.name) !== a.value) oldNode.setAttribute(a.name, a.value); });
  const newKids = Array.from(newNode.childNodes);
  Array.from(oldNode.childNodes).forEach((child, i) => morphNode(child, newKids[i]));
}

// ==========================================
// PARTY GROUP VIEW & GP/M · GP/H COMPARISON
// ==========================================
let cardViewMode = 'default';
let cardSortMode = 'default';
try {
  const urlView = new URLSearchParams(window.location.search).get('view');
  cardViewMode = (urlView === 'party' || urlView === 'default') ? urlView : (localStorage.getItem('pelican_card_view_mode') || 'default');
  const savedSort = localStorage.getItem('pelican_card_sort_mode') || 'default';
  cardSortMode = (savedSort === 'default' || savedSort === 'level_desc') ? savedSort : 'default';
} catch (_) {}
const collapsedCardGroups = new Set();

function syncViewModeControls() {
  const btnDefault = document.getElementById('btn-view-mode-default');
  const btnParty = document.getElementById('btn-view-mode-party');
  const sortSel = document.getElementById('card-sort-select');
  if (btnDefault) btnDefault.classList.toggle('active', cardViewMode !== 'party');
  if (btnParty) btnParty.classList.toggle('active', cardViewMode === 'party');
  if (sortSel && !(window.PmUiGuard && window.PmUiGuard.isSelectBusy(sortSel)) && sortSel.value !== cardSortMode) {
    sortSel.value = cardSortMode;
  }
  if (typeof syncChannelCheckModeUI === 'function') syncChannelCheckModeUI(currentChannelCheckMode);
}

function setCardViewMode(mode) {
  cardViewMode = mode === 'party' ? 'party' : 'default';
  try { localStorage.setItem('pelican_card_view_mode', cardViewMode); } catch (_) {}
  syncViewModeControls();
  if (cardViewMode === 'party' && typeof window.refreshPartyManagerData === 'function') {
    window.refreshPartyManagerData();
  }
  renderProfiles();
}

function setCardSortMode(sort) {
  cardSortMode = sort || 'default';
  try { localStorage.setItem('pelican_card_sort_mode', cardSortMode); } catch (_) {}
  syncViewModeControls();
  renderProfiles();
}

let currentChannelCheckMode = 'all';
try {
  currentChannelCheckMode = localStorage.getItem('pelican_channel_check_mode') || 'all';
} catch (_) {}

function syncChannelCheckModeUI(mode) {
  const valid = ['no_overlap', 'always', 'all', 'party_only', 'solo_only', 'off'];
  const norm = valid.includes(mode) ? mode : 'all';
  currentChannelCheckMode = norm;
  try { localStorage.setItem('pelican_channel_check_mode', norm); } catch (_) {}
  const selMain = document.getElementById('channel-check-mode-select');
  if (selMain && !(window.PmUiGuard && window.PmUiGuard.isSelectBusy(selMain)) && selMain.value !== norm) {
    selMain.value = norm;
  }
}

window.setChannelCheckMode = async function (mode) {
  const valid = ['no_overlap', 'always', 'all', 'party_only', 'solo_only', 'off'];
  const norm = valid.includes(mode) ? mode : 'all';
  syncChannelCheckModeUI(norm);
  const labels = {
    no_overlap: '🔀 แยก CH ไม่ทับกันเอง: โซโล่ไม่ทับจออื่น / ตี้ไม่ทับตี้อื่น (เลือก CH คนน้อยสุด)',
    always: '⚡ ทุกครั้งที่เข้าแมพฟาร์ม: ย้าย CH คนน้อยสุด + ดึงตี้ตาม (ขายของ/ตาย/กลับจากเมือง)',
    all: '🔄 เช็ค CH คนน้อยสุดหลังขายของ + ดึงตี้ตาม (ทุกจอ)',
    party_only: '👑 เฉพาะปาร์ตี้: หลังขายของย้าย CH คนน้อยสุด + ดึงตี้ตาม',
    solo_only: '👤 เฉพาะฟาร์มเดี่ยว: เช็ค CH คนน้อยสุดหลังขายของ',
    off: '⏸️ ปิดการเช็ค/ย้าย CH หลังขายของ'
  };
  try {
    const res = await fetch(`${API_BASE}/api/channel-check-mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: norm })
    });
    const j = await res.json().catch(() => ({}));
    if (j && j.mode) syncChannelCheckModeUI(j.mode);
    if (typeof showToast === 'function') {
      showToast(`ตั้งโหมดเช็ค Channel: ${labels[norm] || norm}`, 'success');
    }
    if (typeof window.refreshPartyManagerData === 'function') {
      window.refreshPartyManagerData();
    }
  } catch (err) {
    console.error('Failed to save channelCheckMode:', err);
    if (typeof showToast === 'function') {
      showToast('บันทึกโหมดเช็ค Channel ไม่สำเร็จ', 'error');
    }
  }
};

function toggleCardGroupCollapse(groupKey, event) {
  if (event) event.stopPropagation();
  if (collapsedCardGroups.has(groupKey)) collapsedCardGroups.delete(groupKey);
  else collapsedCardGroups.add(groupKey);
  renderProfiles();
}

window.onPartyDataUpdated = function () {
  if (currentProfiles && currentProfiles.length > 0) {
    renderProfiles();
  }
};

function isPriestClassName(cls) {
  return /^(priest|acolyte|พระ)$/i.test(String(cls || '').trim());
}

function getPartyRoleMap() {
  const map = new Map();
  const pData = window.__partyManagerData;
  const parties = (pData && Array.isArray(pData.parties)) ? pData.parties : [];
  const profileById = new Map(currentProfiles.map(p => [p.id, p]));

  parties.forEach((party, idx) => {
    const pIndex = party.index || (idx + 1);
    const allSlots = [party.leader, ...(Array.isArray(party.members) ? party.members : [])].filter(Boolean);
    let anchorPriestId = null;
    for (const slot of allSlots) {
      const prof = profileById.get(slot.id);
      const liveCls = (prof?.liveState?.charName && prof?.liveState?.charClass) ? prof.liveState.charClass : '';
      const candidates = [liveCls, slot.charClass, prof?.lastCharClass, prof?.charClass];
      if (candidates.some(c => isPriestClassName(c))) {
        anchorPriestId = slot.id;
        break;
      }
    }
    allSlots.forEach((slot) => {
      const isLeader = Boolean(party.leader && slot.id === party.leader.id);
      const isAnchorPriest = slot.id === anchorPriestId;
      map.set(slot.id, {
        partyId: party.id,
        partyIndex: pIndex,
        isLeader,
        isAnchorPriest,
        followMode: slot.followMode || 'none',
        status: slot.status || '',
        statusText: slot.statusText || ''
      });
    });
  });
  return map;
}

function buildPartyRoleChip(profileId) {
  const info = getPartyRoleMap().get(profileId);
  if (!info) return '';
  if (info.isLeader && info.isAnchorPriest) {
    return `<span class="party-role-chip role-priest-leader" onclick="if(window.openPartyDrawer)window.openPartyDrawer()" title="หัวตี้ + พระหลักศูนย์กลางของปาร์ตี้ #${info.partyIndex}">👑✨ หัวตี้·พระ #${info.partyIndex}</span>`;
  }
  if (info.isLeader) {
    return `<span class="party-role-chip role-leader" onclick="if(window.openPartyDrawer)window.openPartyDrawer()" title="หัวหน้าปาร์ตี้ #${info.partyIndex}">👑 หัวตี้ #${info.partyIndex}</span>`;
  }
  if (info.isAnchorPriest) {
    return `<span class="party-role-chip role-priest" onclick="if(window.openPartyDrawer)window.openPartyDrawer()" title="พระหลักจุดศูนย์กลางของปาร์ตี้ #${info.partyIndex}">✨ พระหลัก #${info.partyIndex}</span>`;
  }
  return `<span class="party-role-chip role-member" onclick="if(window.openPartyDrawer)window.openPartyDrawer()" title="สมาชิกปาร์ตี้ #${info.partyIndex}${info.statusText ? ' · ' + escapeHTML(info.statusText) : ''}">👥 ตี้ #${info.partyIndex}</span>`;
}

function getProfileBaseLevelNum(p) {
  const st = p.isRunning ? p.liveState : null;
  if (st && typeof st.baseLv === 'number') return st.baseLv;
  if (st && st.levels) {
    const nums = String(st.levels).match(/\d+/g);
    if (nums && nums[0]) return Number(nums[0]);
  }
  return 0;
}

function sortProfileList(list) {
  if (!Array.isArray(list) || list.length <= 1 || cardSortMode === 'default') return list;
  const copy = list.slice();
  copy.sort((a, b) => {
    if (cardSortMode === 'gpm_desc') {
      const d = getProfileZenyRate(b).gpm - getProfileZenyRate(a).gpm;
      if (d !== 0) return d;
      return (b.isRunning ? 1 : 0) - (a.isRunning ? 1 : 0);
    }
    if (cardSortMode === 'gpm_asc') {
      const aRate = getProfileZenyRate(a).gpm;
      const bRate = getProfileZenyRate(b).gpm;
      if (a.isRunning !== b.isRunning) return a.isRunning ? -1 : 1;
      return aRate - bRate;
    }
    if (cardSortMode === 'zeny_desc') {
      const az = (a.isRunning && a.liveState && typeof a.liveState.zeny === 'number') ? a.liveState.zeny : -1;
      const bz = (b.isRunning && b.liveState && typeof b.liveState.zeny === 'number') ? b.liveState.zeny : -1;
      return bz - az;
    }
    if (cardSortMode === 'level_desc') {
      return getProfileBaseLevelNum(b) - getProfileBaseLevelNum(a);
    }
    return 0;
  });
  return copy;
}

function summarizeGroupStats(profiles) {
  let onlineCount = 0;
  let farmingCount = 0;
  let totalGpm = 0;
  let totalGph = 0;
  let totalGained = 0;
  let topEarner = null;

  for (const p of profiles) {
    const rate = getProfileZenyRate(p);
    if (p.isRunning) {
      onlineCount++;
      if (p.liveState && p.liveState.isBotRunning && (!p.liveState.screenPhase || p.liveState.screenPhase === 'in_game')) farmingCount++;
      totalGpm += rate.gpm || 0;
      totalGph += rate.gph || 0;
      totalGained += rate.totalGained || 0;
      if ((rate.gpm || 0) > 0 && (!topEarner || rate.gpm > topEarner.gpm)) {
        topEarner = {
          id: p.id,
          name: (p.liveState && p.liveState.charName) || p.lastCharName || p.name,
          gpm: rate.gpm,
          gph: rate.gph
        };
      }
    }
  }

  const avgGpm = onlineCount > 0 ? Math.round(totalGpm / onlineCount) : 0;
  const avgGph = onlineCount > 0 ? Math.round(totalGph / onlineCount) : 0;

  return {
    totalCount: profiles.length,
    onlineCount,
    farmingCount,
    totalGpm,
    totalGph,
    totalGained,
    avgGpm,
    avgGph,
    topEarner
  };
}

function resetAllZenyRates(event) {
  if (event) event.stopPropagation();
  for (const p of currentProfiles) {
    delete clientZenyTrackers[p.id];
    if (p.zenyRate) p.zenyRate = { gpm: 0, gph: 0, totalGained: 0, elapsedSec: 0 };
    fetch(`${API_BASE}/api/profiles/${p.id}/reset-zeny-rate`, { method: 'POST' }).catch(() => {});
  }
  renderProfiles();
  if (typeof showToast === 'function') {
    showToast('🔄 รีเซ็ต GP/M · GP/H ทุกจอพร้อมกันแล้ว (เริ่มเทียบความไวใหม่จาก 0)', 'success');
  }
}

function resetGroupZenyRate(groupKey, event) {
  if (event) event.stopPropagation();
  const roleMap = getPartyRoleMap();
  let targets = [];
  let label = 'กลุ่มนี้';
  if (groupKey === 'solo') {
    targets = currentProfiles.filter(p => !roleMap.has(p.id));
    label = 'กลุ่มฟาร์มเดี่ยว (Solo)';
  } else if (groupKey.startsWith('party:')) {
    const pid = groupKey.slice(6);
    targets = currentProfiles.filter(p => {
      const r = roleMap.get(p.id);
      return r && r.partyId === pid;
    });
    const first = targets[0] ? roleMap.get(targets[0].id) : null;
    label = first ? `ปาร์ตี้ #${first.partyIndex}` : 'ปาร์ตี้นี้';
  }
  for (const p of targets) {
    delete clientZenyTrackers[p.id];
    if (p.zenyRate) p.zenyRate = { gpm: 0, gph: 0, totalGained: 0, elapsedSec: 0 };
    fetch(`${API_BASE}/api/profiles/${p.id}/reset-zeny-rate`, { method: 'POST' }).catch(() => {});
  }
  renderProfiles();
  if (typeof showToast === 'function') {
    showToast(`🔄 รีเซ็ต GP/M · GP/H ของ ${label} (${targets.length} จอ) แล้ว`, 'info');
  }
}

function buildPartyVsSoloBanner(partyCount, partyStats, soloStats) {
  return `
    <div class="party-vs-solo-banner" data-group-id="banner-party-vs-solo">
      <div class="pvs-top-row">
        <div class="pvs-heading">
          <span class="pvs-badge-icon">👑</span>
          <div>
            <div class="pvs-title">จัดกลุ่มหน้าจอเกมตามปาร์ตี้ (Party) vs โซโล่ (Solo)</div>
            <div class="pvs-subtitle">👑 ปาร์ตี้ทั้งหมด ${partyCount} ตี้ (ออนไลน์ ${partyStats.onlineCount}/${partyStats.totalCount} จอ) · 👤 โซโล่ (ออนไลน์ ${soloStats.onlineCount}/${soloStats.totalCount} จอ)</div>
          </div>
        </div>
        <div class="pvs-actions">
          <button type="button" class="btn btn-ghost btn-sm pvs-btn-party" onclick="if(window.openPartyDrawer)window.openPartyDrawer()" title="เปิดหน้าต่างตั้งค่าปาร์ตี้">
            <span>👑</span> จัดการตี้ (${partyCount})
          </button>
        </div>
      </div>
    </div>`;
}

function buildPartyGroupSection(party, idx, profileById, roleMap, soloAvgGpm) {
  const pIndex = party.index || (idx + 1);
  const groupKey = `party:${party.id}`;
  const isCollapsed = collapsedCardGroups.has(groupKey);

  const rawSlots = [party.leader, ...(Array.isArray(party.members) ? party.members : [])].filter(Boolean);
  let partyProfiles = rawSlots.map(s => profileById.get(s.id)).filter(Boolean);

  // Default order inside party: Leader -> Priest Anchor -> Other Members
  if (cardSortMode === 'default') {
    partyProfiles.sort((a, b) => {
      const ra = roleMap.get(a.id) || {};
      const rb = roleMap.get(b.id) || {};
      const score = r => (r.isLeader ? 0 : r.isAnchorPriest ? 1 : 2);
      return score(ra) - score(rb);
    });
  } else {
    partyProfiles = sortProfileList(partyProfiles);
  }

  const stats = summarizeGroupStats(partyProfiles);
  const leaderSlot = party.leader || {};
  const leaderName = leaderSlot.charName || leaderSlot.profileName || 'หัวตี้';
  const priestSlot = rawSlots.find(s => {
    const r = roleMap.get(s.id);
    return r && r.isAnchorPriest;
  });
  const priestName = priestSlot ? (priestSlot.charName || priestSlot.profileName) : null;
  const anchorSlot = (priestSlot && priestSlot.mapName) ? priestSlot : leaderSlot;
  const mapLabel = anchorSlot.mapName || '--';
  const chLabel = anchorSlot.channel ? `CH ${anchorSlot.channel}` : '';
  const expLabel = party.expMode === 'even-share' ? 'EXP แชร์กัน' : 'EXP แยก';

  let vsSoloBadge = '';
  if (stats.avgGpm > 0 && soloAvgGpm > 0) {
    const diffPct = Math.round(((stats.avgGpm - soloAvgGpm) / soloAvgGpm) * 100);
    if (diffPct > 2) {
      vsSoloBadge = `<span class="pg-vs-pill win" title="เฉลี่ยต่อจอของตี้นี้สูงกว่าค่าเฉลี่ยฟาร์มเดี่ยว">+${diffPct}% vs โซโล่</span>`;
    } else if (diffPct < -2) {
      vsSoloBadge = `<span class="pg-vs-pill loss" title="เฉลี่ยต่อจอของตี้นี้ต่ำกว่าค่าเฉลี่ยฟาร์มเดี่ยว">${diffPct}% vs โซโล่</span>`;
    } else {
      vsSoloBadge = `<span class="pg-vs-pill tie">≈ พอๆ กับโซโล่</span>`;
    }
  }

  return `
    <section class="profile-group-section is-party-group ${isCollapsed ? 'is-collapsed' : ''}" data-group-id="group-party-${party.id}">
      <header class="profile-group-header" onclick="toggleCardGroupCollapse('${groupKey}', event)">
        <div class="pg-head-left">
          <button type="button" class="pg-collapse-btn" title="${isCollapsed ? 'คลิกเพื่อขยายดูการ์ดในตี้นี้' : 'คลิกเพื่อพับเก็บการ์ดในตี้นี้'}">${isCollapsed ? '▶' : '▼'}</button>
          <span class="pg-group-badge party">👑 ปาร์ตี้ #${pIndex}</span>
          <div class="pg-title-block">
            <div class="pg-title-main">
              <span>หัวตี้: <b>${escapeHTML(leaderName)}</b></span>
              ${priestName ? `<span class="pg-priest-pill">✨ พระหลัก: <b>${escapeHTML(priestName)}</b></span>` : `<span class="pg-no-priest-pill">ไม่มีพระในตี้</span>`}
            </div>
            <div class="pg-meta-pills">
              <span class="pg-meta-chip">👥 สมาชิก <b>${partyProfiles.length}</b>/${party.max || 6} · ออนไลน์ <b>${stats.onlineCount}</b></span>
              <span class="pg-meta-chip map">📍 ${escapeHTML(mapLabel)}${chLabel ? ` · <b>${escapeHTML(chLabel)}</b>` : ''}</span>
              <span class="pg-meta-chip">${escapeHTML(expLabel)}</span>
            </div>
          </div>
        </div>

        <div class="pg-head-right" onclick="event.stopPropagation()">
          <div class="pg-head-actions">
            <button type="button" class="btn btn-ghost btn-sm pg-action-btn" onclick="if(window.openPartyDrawer)window.openPartyDrawer()" title="ตั้งค่าปาร์ตี้นี้">⚙️ ตั้งค่าตี้</button>
          </div>
        </div>
      </header>
      ${isCollapsed ? '' : `
      <div class="profile-group-grid profiles-grid">
        ${partyProfiles.map(buildProfileCard).join('')}
      </div>`}
    </section>`;
}

function isProfileProblemNotInGame(p) {
  if (!p || !p.isRunning) return false;
  const state = p.liveState;
  if (!state || state.error || state._syntheticLoading) return true;
  const screenPhase = state.screenPhase || 'in_game';
  if (screenPhase !== 'in_game') return true;
  if (state.accountBanned || p.isBanned) return true;
  return false;
}

function isProfileBotStopped(p) {
  if (!p || isProfileProblemNotInGame(p)) return false;
  const state = p.isRunning ? p.liveState : null;
  if (Boolean(state?.postSellOverweightStop || p.postSellOverweightStop)) return true;
  if (!p.isRunning || !state) return false;
  const screenPhase = state.screenPhase || 'in_game';
  if (screenPhase !== 'in_game') return false;
  return !state.isBotRunning;
}

async function refreshAllProblemScreens(event, btnEl) {
  if (event) event.stopPropagation();
  const problemProfiles = currentProfiles.filter(p => isProfileProblemNotInGame(p));
  const origHtml = btnEl ? btnEl.innerHTML : '';
  if (problemProfiles.length === 0) {
    if (btnEl) {
      btnEl.disabled = true;
      btnEl.textContent = '⏳ กำลังเช็ก...';
    }
    try { await fetchProfiles(); } finally {
      if (btnEl) {
        btnEl.disabled = false;
        btnEl.innerHTML = origHtml || '🔄 รีเฟรชแถบนี้';
      }
    }
    if (typeof showToast === 'function') {
      showToast('🔄 เช็กสถานะล่าสุดแล้ว — ไม่พบจอที่ค้างนอกเกม', 'info');
    }
    return;
  }

  if (btnEl) {
    btnEl.disabled = true;
    btnEl.textContent = `⏳ กำลังรีเฟรช ${problemProfiles.length} จอ...`;
  }
  if (typeof showToast === 'function') {
    showToast(`🔄 กำลังสั่งรีเฟรชหน้าเกม ${problemProfiles.length} จอที่มีปัญหา...`, 'info');
  }

  let okCount = 0;
  try {
    const batchSize = 4;
    for (let i = 0; i < problemProfiles.length; i += batchSize) {
      const batch = problemProfiles.slice(i, i + batchSize);
      const results = await Promise.all(batch.map(async (p) => {
        try {
          const res = await fetch(`${API_BASE}/api/profiles/${p.id}/reload-page`, { method: 'POST' });
          const data = await res.json().catch(() => null);
          return Boolean(res.ok && data && data.success);
        } catch (_) {
          return false;
        }
      }));
      okCount += results.filter(Boolean).length;
      if (i + batchSize < problemProfiles.length) {
        await new Promise(r => setTimeout(r, 150));
      }
    }
    await new Promise(r => setTimeout(r, 600));
    await fetchProfiles();
  } finally {
    if (btnEl) {
      btnEl.disabled = false;
      btnEl.innerHTML = origHtml || `🔄 รีเฟรชแถบนี้ (${problemProfiles.length} จอ)`;
    }
  }
  if (typeof showToast === 'function') {
    showToast(
      `🔄 สั่งรีเฟรชหน้าเกมสำเร็จ ${okCount}/${problemProfiles.length} จอ`,
      okCount === problemProfiles.length ? 'success' : (okCount > 0 ? 'warning' : 'error')
    );
  }
}
window.refreshAllProblemScreens = refreshAllProblemScreens;

function buildProblemGroupSection(problemProfiles) {
  const groupKey = 'problem';
  const isCollapsed = collapsedCardGroups.has(groupKey);
  const sortedProblem = sortProfileList(problemProfiles);
  const errPhases = new Set(['account_banned', 'char_select_error', 'char_select_online', 'char_select_limit', 'login_error', 'login_auth_error']);
  const authCharPhases = new Set(['login', 'login_loading', 'char_select', 'char_select_loading', 'char_create', 'register', 'register_queue']);

  let errCount = 0;
  let authCharCount = 0;
  let loadingCount = 0;
  for (const p of sortedProblem) {
    const st = p.liveState;
    const sp = st?.screenPhase || '';
    if (p.isBanned || st?.accountBanned || st?.error || errPhases.has(sp)) {
      errCount++;
    } else if (authCharPhases.has(sp)) {
      authCharCount++;
    } else {
      loadingCount++;
    }
  }

  return `
    <section class="profile-group-section is-problem-group ${isCollapsed ? 'is-collapsed' : ''}" data-group-id="group-problem">
      <header class="profile-group-header" onclick="toggleCardGroupCollapse('${groupKey}', event)">
        <div class="pg-head-left">
          <button type="button" class="pg-collapse-btn" title="${isCollapsed ? 'คลิกเพื่อขยายดูจอที่มีปัญหา' : 'คลิกเพื่อพับเก็บจอที่มีปัญหา'}">${isCollapsed ? '▶' : '▼'}</button>
          <span class="pg-group-badge problem">⚠️ จอที่มีปัญหา / ไม่ได้อยู่ในเกม</span>
          <div class="pg-title-block">
            <div class="pg-title-main">
              <span>จอที่ติดปัญหา / ยังไม่ได้เข้าตัวเกม (${sortedProblem.length} จอ)</span>
              ${errCount > 0 ? `<span class="pg-top-earner-pill" style="background:rgba(245,158,11,0.22);border-color:rgba(251,191,36,0.55);color:#fde68a;">🚨 เออเร่อ/ค้างออนไลน์: <b>${errCount} จอ</b></span>` : ''}
            </div>
            <div class="pg-meta-pills">
              <span class="pg-meta-chip">🖥️ ค้างนอกเกม <b>${sortedProblem.length}</b> จอ</span>
              ${authCharCount > 0 ? `<span class="pg-meta-chip">🔑 ติดหน้าล็อกอิน/เลือกตัว <b>${authCharCount}</b> จอ</span>` : ''}
              ${loadingCount > 0 ? `<span class="pg-meta-chip">⏳ กำลังโหลด/เชื่อมต่อ <b>${loadingCount}</b> จอ</span>` : ''}
              ${errCount > 0 ? `<span class="pg-meta-chip" style="color:#fca5a5;">🚨 เออเร่อ/ค้างออนไลน์ <b>${errCount}</b> จอ</span>` : ''}
            </div>
          </div>
        </div>

        <div class="pg-head-right" onclick="event.stopPropagation()">
          <div class="pg-head-actions">
            <button type="button" class="btn btn-sm pg-action-btn pg-problem-refresh-btn ${sortedProblem.length > 0 ? 'has-items' : ''}" onclick="refreshAllProblemScreens(event, this)" title="สั่งรีเฟรชหน้าเว็บเกม (Reload) ทุกจอในแถบนี้ทันที">🔄 ${sortedProblem.length > 0 ? `รีเฟรชแถบนี้ (${sortedProblem.length} จอ)` : 'รีเฟรชแถบนี้'}</button>
          </div>
        </div>
      </header>
      ${isCollapsed ? '' : `
      <div class="profile-group-grid profiles-grid">
        ${sortedProblem.length > 0 ? sortedProblem.map(buildProfileCard).join('') : `<div class="empty-state" style="padding: 20px;"><p style="margin:0;">ไม่มีจอที่ติดปัญหาหรือค้างนอกเกมในขณะนี้ (ทุกจอที่เปิดอยู่อยู่ในตัวเกมปกติ)</p></div>`}
      </div>`}
    </section>`;
}

async function startAllStoppedBots(event) {
  if (event) event.stopPropagation();
  const stopped = currentProfiles.filter(p => p.isRunning && isProfileBotStopped(p));
  if (stopped.length === 0) {
    if (typeof showToast === 'function') showToast('ไม่มีบอทที่หยุดทำงานอยู่ในขณะนี้', 'info');
    return;
  }
  if (typeof showToast === 'function') {
    showToast(`▶️ กำลังสั่งเริ่มบอทที่หยุดอยู่ทั้งหมด (${stopped.length} จอ)...`, 'info');
  }
  for (const p of stopped) {
    try {
      await toggleBotExecution(p.id, true);
    } catch (_) {}
  }
}

function buildStoppedGroupSection(stoppedProfiles) {
  const groupKey = 'stopped';
  const isCollapsed = collapsedCardGroups.has(groupKey);
  const sortedStopped = sortProfileList(stoppedProfiles);
  const overweightCount = sortedStopped.filter(p => Boolean(p.liveState?.postSellOverweightStop || p.postSellOverweightStop)).length;
  const onlineStoppedCount = sortedStopped.filter(p => p.isRunning).length;

  return `
    <section class="profile-group-section is-stopped-group ${isCollapsed ? 'is-collapsed' : ''}" data-group-id="group-stopped">
      <header class="profile-group-header" onclick="toggleCardGroupCollapse('${groupKey}', event)">
        <div class="pg-head-left">
          <button type="button" class="pg-collapse-btn" title="${isCollapsed ? 'คลิกเพื่อขยายดูการ์ดบอทที่หยุดทำงาน' : 'คลิกเพื่อพับเก็บการ์ดบอทที่หยุดทำงาน'}">${isCollapsed ? '▶' : '▼'}</button>
          <span class="pg-group-badge stopped">🛑 บอทที่หยุดทำงาน (Stopped)</span>
          <div class="pg-title-block">
            <div class="pg-title-main">
              <span>จอที่บอทหยุดทำงาน (${sortedStopped.length} จอ)</span>
              ${overweightCount > 0 ? `<span class="pg-top-earner-pill" style="background:rgba(239,68,68,0.22);border-color:rgba(239,68,68,0.55);color:#fecaca;" title="จำนวนจอที่ขายของแล้วน้ำหนักยังเกินหรือช่องกระเป๋าเต็ม ระบบจึงสั่ง STOP อัตโนมัติ">⚠️ ขายแล้วยังน้ำหนักเกิน: <b>${overweightCount} จอ</b></span>` : ''}
            </div>
            <div class="pg-meta-pills">
              <span class="pg-meta-chip">🖥️ ออนไลน์ <b>${onlineStoppedCount}</b>/${sortedStopped.length} จอ</span>
              <span class="pg-meta-chip">⏸️ สถานะ <b>STOP / ยืนรอ</b></span>
              ${overweightCount > 0 ? `<span class="pg-meta-chip" style="color:#fca5a5;">⚖️ น้ำหนักเกินหลังขาย <b>${overweightCount}</b> จอ</span>` : ''}
            </div>
          </div>
        </div>

        <div class="pg-head-right" onclick="event.stopPropagation()">
          <div class="pg-head-actions">
            ${onlineStoppedCount > 0 ? `<button type="button" class="btn btn-primary btn-sm pg-action-btn" onclick="startAllStoppedBots(event)" title="สั่งเริ่มบอท (START) ทุกจอที่หยุดอยู่ในหมวดนี้">▶️ เริ่มบอทที่หยุด (${onlineStoppedCount})</button>` : ''}
          </div>
        </div>
      </header>
      ${isCollapsed ? '' : `
      <div class="profile-group-grid profiles-grid">
        ${sortedStopped.length > 0 ? sortedStopped.map(buildProfileCard).join('') : `<div class="empty-state" style="padding: 20px;"><p style="margin:0;">ไม่มีบอทที่หยุดทำงานในขณะนี้ (บอททุกจอที่ออนไลน์กำลังทำงานปกติ)</p></div>`}
      </div>`}
    </section>`;
}

function buildSoloGroupSection(soloProfiles) {
  const groupKey = 'solo';
  const isCollapsed = collapsedCardGroups.has(groupKey);
  const sortedSolo = sortProfileList(soloProfiles);
  const stats = summarizeGroupStats(sortedSolo);

  return `
    <section class="profile-group-section is-solo-group ${isCollapsed ? 'is-collapsed' : ''}" data-group-id="group-solo">
      <header class="profile-group-header" onclick="toggleCardGroupCollapse('${groupKey}', event)">
        <div class="pg-head-left">
          <button type="button" class="pg-collapse-btn" title="${isCollapsed ? 'คลิกเพื่อขยายดูการ์ดฟาร์มเดี่ยว' : 'คลิกเพื่อพับเก็บการ์ดฟาร์มเดี่ยว'}">${isCollapsed ? '▶' : '▼'}</button>
          <span class="pg-group-badge solo">⚔️ ฟาร์มเดี่ยว (Solo)</span>
          <div class="pg-title-block">
            <div class="pg-title-main">
              <span>ตัวละครที่ไม่ได้อยู่ในปาร์ตี้ (${stats.totalCount} จอ)</span>
            </div>
            <div class="pg-meta-pills">
              <span class="pg-meta-chip">🖥️ ออนไลน์ <b>${stats.onlineCount}</b>/${stats.totalCount} จอ</span>
              <span class="pg-meta-chip">⚔️ กำลังทำงาน <b>${stats.farmingCount}</b> จอ</span>
            </div>
          </div>
        </div>

        <div class="pg-head-right" onclick="event.stopPropagation()">
          <div class="pg-head-actions">
            <button type="button" class="btn btn-ghost btn-sm pg-action-btn" onclick="if(window.openPartyDrawer)window.openPartyDrawer()" title="จัดการปาร์ตี้">👑 จัดการตี้</button>
          </div>
        </div>
      </header>
      ${isCollapsed ? '' : `
      <div class="profile-group-grid profiles-grid">
        ${sortedSolo.length > 0 ? sortedSolo.map(buildProfileCard).join('') : `<div class="empty-state" style="padding: 24px;"><p style="margin:0;">ทุกโปรไฟล์ถูกจัดอยู่ในปาร์ตี้หรือหมวดบอทที่หยุดทำงานแล้ว</p></div>`}
      </div>`}
    </section>`;
}

function renderProfiles() {
  syncViewModeControls();
  if (currentProfiles.length === 0) {
    gridEl.classList.remove('grouped-mode');
    gridEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🎮</div>
        <p>ยังไม่มีโปรไฟล์จอเกมในระบบ</p>
        <button class="btn btn-primary" onclick="openAddModal()">➕ เพิ่มโปรไฟล์แรกเลย</button>
      </div>
    `;
    return;
  }

  const tpl = document.createElement('template');
  if (cardViewMode === 'party') {
    gridEl.classList.add('grouped-mode');
    const pData = window.__partyManagerData;
    const parties = (pData && Array.isArray(pData.parties)) ? pData.parties : [];
    const profileById = new Map(currentProfiles.map(p => [p.id, p]));
    const roleMap = getPartyRoleMap();

    const problemProfilesAll = currentProfiles.filter(p => isProfileProblemNotInGame(p));
    const stoppedProfilesAll = currentProfiles.filter(p => !isProfileProblemNotInGame(p) && isProfileBotStopped(p));
    const partyProfilesAll = currentProfiles.filter(p => roleMap.has(p.id));
    const soloProfilesAll = currentProfiles.filter(p => !roleMap.has(p.id) && !isProfileProblemNotInGame(p) && !isProfileBotStopped(p));
    const partyStats = summarizeGroupStats(partyProfilesAll);
    const soloStats = summarizeGroupStats(soloProfilesAll);

    let html = buildPartyVsSoloBanner(parties.length, partyStats, soloStats);
    if (parties.length === 0) {
      html += `
        <section class="profile-group-section is-party-group" data-group-id="group-no-party">
          <div class="pg-empty-party-notice">
            <div>
              <strong>👑 ยังไม่ได้สร้างปาร์ตี้ในระบบ</strong>
              <p>คุณสามารถกดปุ่มด้านขวาเพื่อเลือกหัวตี้และจัดสมาชิกเข้าตี้ เพื่อเปรียบเทียบ GP/M · GP/H กับกลุ่มฟาร์มเดี่ยวได้ทันที</p>
            </div>
            <button type="button" class="btn btn-primary btn-sm" onclick="if(window.openPartyDrawer)window.openPartyDrawer()">➕ สร้าง / จัดปาร์ตี้</button>
          </div>
        </section>`;
    } else {
      html += parties.map((party, idx) => buildPartyGroupSection(party, idx, profileById, roleMap, soloStats.avgGpm)).join('');
    }
    html += buildProblemGroupSection(problemProfilesAll);
    html += buildStoppedGroupSection(stoppedProfilesAll);
    html += buildSoloGroupSection(soloProfilesAll);
    tpl.innerHTML = html;
  } else {
    gridEl.classList.remove('grouped-mode');
    const problemProfilesDefault = currentProfiles.filter(p => isProfileProblemNotInGame(p));
    const stoppedProfilesDefault = currentProfiles.filter(p => !isProfileProblemNotInGame(p) && isProfileBotStopped(p));
    const activeProfilesDefault = currentProfiles.filter(p => !isProfileProblemNotInGame(p) && !isProfileBotStopped(p));
    const sortedActive = sortProfileList(activeProfilesDefault);
    let html = '';
    if (problemProfilesDefault.length > 0) {
      html += buildProblemGroupSection(problemProfilesDefault);
    }
    if (stoppedProfilesDefault.length > 0) {
      html += buildStoppedGroupSection(stoppedProfilesDefault);
    }
    html += sortedActive.map(buildProfileCard).join('');
    tpl.innerHTML = html;
  }

  const newCards = Array.from(tpl.content.children);
  const oldCards = Array.from(gridEl.children);
  const sameLayout = oldCards.length === newCards.length &&
    oldCards.every((el, i) => {
      const oldKey = el.dataset.profileId || el.dataset.groupId || '';
      const newKey = newCards[i].dataset.profileId || newCards[i].dataset.groupId || '';
      return oldKey !== '' && oldKey === newKey;
    });

  if (!sameLayout) {
    if (window.PmUiGuard && window.PmUiGuard.deferIfInteracting('profiles-grid', gridEl, renderProfiles)) {
      const newByKey = new Map();
      newCards.forEach(nc => {
        const k = nc.dataset.profileId || nc.dataset.groupId || '';
        if (k) newByKey.set(k, nc);
      });
      oldCards.forEach(oc => {
        const k = oc.dataset.profileId || oc.dataset.groupId || '';
        const nc = k ? newByKey.get(k) : null;
        if (nc && !(window.PmUiGuard && window.PmUiGuard.isInteracting(oc))) {
          morphNode(oc, nc);
        }
      });
      return;
    }
    gridEl.replaceChildren(...newCards);
    return;
  }
  oldCards.forEach((el, i) => morphNode(el, newCards[i]));
}

function escapeHTML(str) {
  if (!str) return "";
  return String(str).replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));
}

// ==========================================
// BOT & WINDOW ACTIONS (PER-CARD)
// ==========================================
async function toggleBotExecution(id, start, btnEl) {
  try {
    if (btnEl) {
      btnEl.disabled = true;
      btnEl.innerHTML = start ? `<span>⏳</span> กำลังเริ่ม...` : `<span>⏳</span> กำลังหยุด...`;
    }
    const action = start ? "start" : "stop";
    const res = await fetch(`${API_BASE}/api/profiles/${id}/toggle-bot?action=${action}`, { method: "POST" });
    const data = await res.json();
    if (data.success) {
      await fetchProfiles();
    } else {
      const err = String(data.error || "เกิดข้อผิดพลาด");
      alert(/ECONNREFUSED/.test(err)
        ? "❌ จอนี้ยังไม่เชื่อมต่อกับบอท\n\n• ถ้าเพิ่งเปิดจอ รอให้เกมโหลดเสร็จสักครู่แล้วลองใหม่\n• ถ้ายังไม่ได้ ไปที่ปุ่ม \"สคริปต์เกม\" ตรวจว่าโฟลเดอร์เกมถูกต้องแล้วกด \"ติดตั้ง\" จากนั้นปิด-เปิดจอเกมใหม่"
        : "❌ ไม่สามารถสั่งงานบอทได้: " + err);
      await fetchProfiles();
    }
  } catch (err) {
    console.error("toggleBotExecution error:", err);
    await fetchProfiles();
  }
}

// Bring this client's game window to the front
async function focusClientWindow(id, btnEl) {
  if (btnEl) btnEl.disabled = true;
  try {
    const res = await fetch(`${API_BASE}/api/profiles/${id}/focus-window`, { method: "POST" });
    const data = await res.json();
    if (!data.success) showToast("❌ แสดงจอไม่สำเร็จ: " + (data.error || "เกิดข้อผิดพลาด"), "error");
    fetchProfiles();
  } catch (err) {
    console.error("focusClientWindow error:", err);
  } finally {
    if (btnEl) btnEl.disabled = false;
  }
}

async function reloadClientPage(id, event, btnEl) {
  if (event) event.stopPropagation();
  if (btnEl) btnEl.disabled = true;
  try {
    const res = await fetch(`${API_BASE}/api/profiles/${id}/reload-page`, { method: "POST" });
    const data = await res.json();
    if (data && data.success) {
      showToast("🔄 สั่งรีเฟรชหน้าจอเกมแล้ว", "success");
    } else {
      showToast("❌ รีเฟรชจอไม่สำเร็จ: " + (data?.error || "เกิดข้อผิดพลาด"), "error");
    }
    setTimeout(() => fetchProfiles(), 600);
  } catch (err) {
    console.error("reloadClientPage error:", err);
    showToast("❌ รีเฟรชจอไม่สำเร็จ: " + err.message, "error");
  } finally {
    if (btnEl) setTimeout(() => { btnEl.disabled = false; }, 1200);
  }
}

async function toggleClientWindow(id) {
  try {
    const res = await fetch(`${API_BASE}/api/profiles/${id}/toggle-window`, { method: "POST" });
    const data = await res.json();
    if (data.success) {
      fetchProfiles();
    }
  } catch (err) {
    console.error("toggleClientWindow error:", err);
  }
}

async function launchClient(id) {
  try {
    const res = await fetch(`${API_BASE}/api/profiles/${id}/launch`, { method: "POST" });
    const data = await res.json();
    if (!data.success) {
      alert("❌ เปิดจอไม่สำเร็จ: " + (data.error || "เกิดข้อผิดพลาด"));
    }
  } catch (err) {
    alert("❌ เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
  }
  fetchProfiles();
}

async function stopClient(id) {
  if (!confirm("ต้องการปิดจอเกมนี้ใช่หรือไม่?")) return;
  try {
    await fetch(`${API_BASE}/api/profiles/${id}/stop`, { method: "POST" });
  } catch (err) {}
  fetchProfiles();
}

// ==========================================
// TOP ACTION TOOLBAR LISTENERS
// ==========================================
const btnAutoTileShrink = document.getElementById("btn-auto-tile-shrink");
if (btnAutoTileShrink) {
  const autoTileLabel = btnAutoTileShrink.innerText;
  btnAutoTileShrink.onclick = async (e) => {
    e.preventDefault();
    try {
      btnAutoTileShrink.innerText = "⏳ กำลังจัดเรียง...";
      await fetch(`${API_BASE}/api/tile-windows?layout=compact`, { method: "POST" });
    } catch(err) {}
    setTimeout(() => { btnAutoTileShrink.innerText = autoTileLabel; }, 1000);
  };
}

const btnGlobalPlanSetup = document.getElementById("btn-global-plan-setup");
if (btnGlobalPlanSetup) {
  btnGlobalPlanSetup.onclick = () => {
    const online = currentProfiles.find(p => p.isRunning) || currentProfiles[0];
    if (online) {
      openScriptPlanModal(online.id);
    } else {
      alert("กรุณาเพิ่มหรือเปิดโปรไฟล์ก่อนตั้งค่า Plan");
    }
  };
}

const btnToggleAllWindows = document.getElementById("btn-toggle-all-windows");
if (btnToggleAllWindows) {
  btnToggleAllWindows.onclick = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/toggle-all-windows`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        allWindowsHidden = !!data.allWindowsHidden;
        const lbl = document.getElementById("lbl-toggle-all-windows");
        if (lbl) lbl.innerText = allWindowsHidden ? "แสดงกราฟิกทุกจอ" : "พักกราฟิกทุกจอ (Zero-Render)";
        fetchProfiles();
      }
    } catch(e) {
      console.error(e);
    }
  };
}

const LAUNCH_FILTER_STORAGE_KEY = "pelican_launch_filter_v1";
const launchPopoverState = {
  open: false,
  checklistExpanded: false,
  customCheckedIds: new Set(),
  filters: (() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LAUNCH_FILTER_STORAGE_KEY) || "{}");
      return {
        jail: ["not_jailed", "all", "jailed_only"].includes(saved.jail) ? saved.jail : "not_jailed",
        prem: ["all", "no_premium", "has_premium"].includes(saved.prem) ? saved.prem : "all",
        group: ["all", "solo", "party"].includes(saved.group) ? saved.group : "all"
      };
    } catch (_) {
      return { jail: "not_jailed", prem: "all", group: "all" };
    }
  })()
};

function getLaunchProfileFlags(p) {
  const isBanned = Boolean(p && (p.isBanned || p.liveState?.accountBanned || p.liveState?.screenPhase === "account_banned"));
  const jailMapStr = String((p && (p.jailedMap || p.liveState?.map)) || "");
  const isJailed = Boolean(p && (p.isJailed || /คุก|เรือนจำ|\bprison\b|\bjail\b/i.test(jailMapStr) || p.liveState?.charSelectInJail));
  return { isJailed, isBanned, isBlocked: isJailed || isBanned };
}

function getFilteredProfilesForLaunch(filters) {
  const roleMap = typeof getPartyRoleMap === "function" ? getPartyRoleMap() : new Map();
  const f = filters || launchPopoverState.filters;
  return currentProfiles.filter(p => {
    if (!p) return false;
    const { isJailed, isBanned, isBlocked } = getLaunchProfileFlags(p);
    if (f.jail === "not_jailed" && isBlocked) return false;
    if (f.jail === "jailed_only" && !isJailed && !isBanned) return false;
    const prem = isProfilePremium(p);
    if (f.prem === "no_premium" && prem) return false;
    if (f.prem === "has_premium" && !prem) return false;
    const inParty = roleMap.has(p.id);
    if (f.group === "solo" && inParty) return false;
    if (f.group === "party" && !inParty) return false;
    return true;
  });
}

function resetLaunchChecklistFromFilters() {
  launchPopoverState.customCheckedIds.clear();
  for (const p of getFilteredProfilesForLaunch()) {
    if (!p.isRunning) launchPopoverState.customCheckedIds.add(String(p.id));
  }
}

async function executeLaunchProfiles(profileIdsOrNull, labelForToast) {
  const countTxt = Array.isArray(profileIdsOrNull) ? `${profileIdsOrNull.length} จอ` : "ทุกจอ";
  showToast(`🚀 กำลังเปิดเกม (${labelForToast || countTxt})...`, "info");
  try {
    const res = await fetch(`${API_BASE}/api/launch-all`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Array.isArray(profileIdsOrNull) ? { profileIds: profileIdsOrNull } : {})
    });
    const data = await res.json();
    if (!data.success) {
      alert("❌ เปิดจอไม่สำเร็จ: " + (data.error || "เกิดข้อผิดพลาด"));
    } else {
      const launchedCount = (data.launched || []).length;
      const skippedCount = (data.skipped || []).length;
      showToast(
        `🚀 เปิดใหม่ ${launchedCount} จอ${skippedCount ? ` · ข้าม ${skippedCount} จอที่เปิดอยู่แล้ว` : ""}`,
        "success"
      );
    }
  } catch (e) {
    showToast("❌ เปิดจอไม่สำเร็จ: " + (e?.message || "เชื่อมต่อไม่ได้"), "error");
  }
  fetchProfiles();
}

function closeLaunchAllPopover() {
  launchPopoverState.open = false;
  const pop = document.getElementById("launch-all-popover");
  if (pop) pop.remove();
  document.getElementById("btn-launch-all")?.classList.remove("is-popover-open");
}

function positionLaunchAllPopover(pop, anchorBtn) {
  if (!pop || !anchorBtn) return;
  const rect = anchorBtn.getBoundingClientRect();
  const popW = Math.min(440, window.innerWidth - 24);
  const top = Math.round(rect.bottom + 8);
  let left = Math.round(rect.left);
  if (left + popW > window.innerWidth - 12) {
    left = Math.max(12, Math.round(rect.right - popW));
  }
  if (left < 12) left = 12;
  const maxH = Math.max(240, window.innerHeight - top - 16);
  pop.style.top = `${top}px`;
  pop.style.left = `${left}px`;
  pop.style.width = `${popW}px`;
  pop.style.maxHeight = `${maxH}px`;
}

function renderLaunchAllPopoverContent(pop) {
  if (!pop) return;
  const closedAll = currentProfiles.filter(p => !p.isRunning);
  const closedNotJailed = closedAll.filter(p => !getLaunchProfileFlags(p).isBlocked);
  const closedNoPremNotJailed = closedNotJailed.filter(p => !isProfilePremium(p));
  const closedPremNotJailed = closedNotJailed.filter(p => isProfilePremium(p));

  const matched = getFilteredProfilesForLaunch();
  const matchedClosed = matched.filter(p => !p.isRunning);
  const matchedOpen = matched.length - matchedClosed.length;
  const selectedToLaunch = matchedClosed.filter(p => launchPopoverState.customCheckedIds.has(String(p.id)));
  const skippedOther = Math.max(0, currentProfiles.length - matched.length);

  pop.innerHTML = `
    <div class="lf-head">
      <div class="lf-title">🚀 เลือกเงื่อนไขเปิดจอเกม</div>
      <button type="button" class="lf-close-btn" id="btn-lf-close" title="ปิดเมนู">✕</button>
    </div>

    <div class="lf-sec-title">⚡ เปิดทันที (ปุ่มด่วน)</div>
    <div class="lf-presets">
      <button type="button" class="lf-preset-btn is-recommended" data-lf-preset="not_jailed">
        <span class="lf-preset-label">🛡️ เปิดเฉพาะจอไม่ติดคุก / ไม่โดนแบน <small class="lf-rec-tag">แนะนำ</small></span>
        <span class="lf-preset-badge">${closedNotJailed.length} จอ</span>
      </button>
      <button type="button" class="lf-preset-btn" data-lf-preset="all">
        <span class="lf-preset-label">🚀 เปิดทุกจอทั้งหมด</span>
        <span class="lf-preset-badge">${closedAll.length} จอ</span>
      </button>
      <button type="button" class="lf-preset-btn" data-lf-preset="no_prem_not_jailed">
        <span class="lf-preset-label">🔓 เปิดเฉพาะจอไม่มี Premium (ไม่ติดคุก)</span>
        <span class="lf-preset-badge">${closedNoPremNotJailed.length} จอ</span>
      </button>
      <button type="button" class="lf-preset-btn" data-lf-preset="prem_not_jailed">
        <span class="lf-preset-label">👑 เปิดเฉพาะจอมี VIP / Premium (ไม่ติดคุก)</span>
        <span class="lf-preset-badge">${closedPremNotJailed.length} จอ</span>
      </button>
    </div>

    <div class="lf-divider"></div>
    <div class="lf-sec-title">🎛️ ระบบกรองแบบ Select & เลือกรายจอ</div>
    <div class="lf-filter-grid">
      <label class="lf-field">
        <span>สถานะคุก / แบน</span>
        <select id="lf-sel-jail" class="lf-select">
          <option value="not_jailed"${launchPopoverState.filters.jail === "not_jailed" ? " selected" : ""}>🛡️ ไม่ติดคุกและไม่โดนแบน</option>
          <option value="all"${launchPopoverState.filters.jail === "all" ? " selected" : ""}>🌐 ทุกสถานะ (รวมติดคุก)</option>
          <option value="jailed_only"${launchPopoverState.filters.jail === "jailed_only" ? " selected" : ""}>🚨 เฉพาะจอที่ติดคุก</option>
        </select>
      </label>
      <label class="lf-field">
        <span>สถานะ Premium</span>
        <select id="lf-sel-prem" class="lf-select">
          <option value="all"${launchPopoverState.filters.prem === "all" ? " selected" : ""}>🌐 ทั้งมีและไม่มี Premium</option>
          <option value="no_premium"${launchPopoverState.filters.prem === "no_premium" ? " selected" : ""}>🔓 เฉพาะจอไม่มี Premium</option>
          <option value="has_premium"${launchPopoverState.filters.prem === "has_premium" ? " selected" : ""}>👑 เฉพาะจอมี VIP / Premium</option>
        </select>
      </label>
      <label class="lf-field lf-field-wide">
        <span>กลุ่มปาร์ตี้</span>
        <select id="lf-sel-group" class="lf-select">
          <option value="all"${launchPopoverState.filters.group === "all" ? " selected" : ""}>🌐 ทุกกลุ่ม (ตี้ + โซโล่)</option>
          <option value="solo"${launchPopoverState.filters.group === "solo" ? " selected" : ""}>⚔️ เฉพาะฟาร์มเดี่ยว (Solo)</option>
          <option value="party"${launchPopoverState.filters.group === "party" ? " selected" : ""}>👑 เฉพาะสมาชิกในปาร์ตี้</option>
        </select>
      </label>
    </div>

    <button type="button" class="lf-toggle-list-btn" id="lf-toggle-custom-list">
      <span>📋 เลือกติ๊กรายจอเอง (เลือกอยู่ <b>${selectedToLaunch.length}</b> จอที่จะเปิดใหม่)</span>
      <span>${launchPopoverState.checklistExpanded ? "▲" : "▼"}</span>
    </button>

    ${launchPopoverState.checklistExpanded ? `
    <div class="lf-custom-list-wrap" id="lf-custom-list-wrap">
      <div class="lf-list-tools">
        <button type="button" class="lf-mini-link" id="lf-chk-select-all">☑️ เลือกทั้งหมด (${matchedClosed.length})</button>
        <button type="button" class="lf-mini-link" id="lf-chk-clear">⬜ ล้าง</button>
      </div>
      <div class="lf-custom-list" id="lf-custom-list">
        ${matched.length === 0 ? `<div class="lf-empty">ไม่พบจอที่ตรงกับเงื่อนไขที่เลือก</div>` : matched.map(p => {
          const pid = String(p.id);
          const isOpenNow = Boolean(p.isRunning);
          const { isJailed, isBanned } = getLaunchProfileFlags(p);
          const prem = isProfilePremium(p);
          const checked = !isOpenNow && launchPopoverState.customCheckedIds.has(pid);
          const charLabel = p.liveState?.charName || p.lastCharName || "";
          const disp = charLabel ? `${charLabel} (${p.name})` : p.name;
          return `
            <label class="lf-row${isOpenNow ? " is-running" : ""}">
              <input type="checkbox" class="lf-row-cb" data-lf-pid="${escapeHTML(pid)}"${checked ? " checked" : ""}${isOpenNow ? " disabled" : ""}>
              <span class="lf-row-name" title="${escapeHTML(disp)}">${escapeHTML(disp)}</span>
              <span class="lf-row-badges">
                ${isOpenNow ? `<span class="lf-pill on">🟢 เปิดอยู่แล้ว</span>` : ""}
                ${isBanned ? `<span class="lf-pill bad">🚫 แบน</span>` : (isJailed ? `<span class="lf-pill warn">🚨 ติดคุก</span>` : "")}
                ${prem ? `<span class="lf-pill vip">👑 VIP</span>` : `<span class="lf-pill free">ฟรี</span>`}
              </span>
            </label>
          `;
        }).join("")}
      </div>
    </div>` : ""}

    <div class="lf-footer">
      <div class="lf-summary" id="lf-summary">
        พร้อมเปิดใหม่ <b>${selectedToLaunch.length}</b> จอ · เปิดอยู่แล้ว <b>${matchedOpen}</b> จอ · ข้าม <b>${skippedOther}</b> จอ
      </div>
      <button type="button" class="btn btn-success lf-launch-btn" id="btn-lf-launch-selected"${selectedToLaunch.length === 0 ? " disabled" : ""}>
        🚀 เปิดจอตามเงื่อนไขที่เลือก (${selectedToLaunch.length} จอ)
      </button>
    </div>
  `;

  pop.querySelector("#btn-lf-close")?.addEventListener("click", closeLaunchAllPopover);

  pop.querySelectorAll("[data-lf-preset]").forEach(btn => {
    btn.addEventListener("click", () => {
      const kind = btn.getAttribute("data-lf-preset");
      if (kind === "all") {
        if (closedAll.length === 0) return showToast("🟢 เปิดครบทุกจออยู่แล้ว ไม่มีจอใหม่ให้เปิด", "info");
        closeLaunchAllPopover();
        return executeLaunchProfiles(null, `เปิดทุกจอ ${closedAll.length} จอ`);
      }
      let targets = [];
      let label = "";
      if (kind === "not_jailed") {
        targets = closedNotJailed;
        label = `ไม่ติดคุก/ไม่โดนแบน ${targets.length} จอ`;
      } else if (kind === "no_prem_not_jailed") {
        targets = closedNoPremNotJailed;
        label = `ไม่มี Premium (ไม่ติดคุก) ${targets.length} จอ`;
      } else if (kind === "prem_not_jailed") {
        targets = closedPremNotJailed;
        label = `มี VIP/Premium (ไม่ติดคุก) ${targets.length} จอ`;
      }
      if (targets.length === 0) {
        return showToast("⚠️ ไม่มีจอที่ปิดอยู่และตรงกับเงื่อนไขนี้", "info");
      }
      closeLaunchAllPopover();
      return executeLaunchProfiles(targets.map(p => String(p.id)), label);
    });
  });

  const saveFiltersAndRefresh = () => {
    try { localStorage.setItem(LAUNCH_FILTER_STORAGE_KEY, JSON.stringify(launchPopoverState.filters)); } catch (_) {}
    resetLaunchChecklistFromFilters();
    renderLaunchAllPopoverContent(pop);
  };

  pop.querySelector("#lf-sel-jail")?.addEventListener("change", e => {
    launchPopoverState.filters.jail = e.target.value;
    saveFiltersAndRefresh();
  });
  pop.querySelector("#lf-sel-prem")?.addEventListener("change", e => {
    launchPopoverState.filters.prem = e.target.value;
    saveFiltersAndRefresh();
  });
  pop.querySelector("#lf-sel-group")?.addEventListener("change", e => {
    launchPopoverState.filters.group = e.target.value;
    saveFiltersAndRefresh();
  });

  pop.querySelector("#lf-toggle-custom-list")?.addEventListener("click", () => {
    launchPopoverState.checklistExpanded = !launchPopoverState.checklistExpanded;
    renderLaunchAllPopoverContent(pop);
  });

  pop.querySelector("#lf-chk-select-all")?.addEventListener("click", () => {
    for (const p of matchedClosed) launchPopoverState.customCheckedIds.add(String(p.id));
    renderLaunchAllPopoverContent(pop);
  });
  pop.querySelector("#lf-chk-clear")?.addEventListener("click", () => {
    for (const p of matchedClosed) launchPopoverState.customCheckedIds.delete(String(p.id));
    renderLaunchAllPopoverContent(pop);
  });

  pop.querySelectorAll(".lf-row-cb").forEach(cb => {
    cb.addEventListener("change", e => {
      const pid = String(e.target.getAttribute("data-lf-pid") || "");
      if (!pid) return;
      if (e.target.checked) launchPopoverState.customCheckedIds.add(pid);
      else launchPopoverState.customCheckedIds.delete(pid);
      renderLaunchAllPopoverContent(pop);
    });
  });

  pop.querySelector("#btn-lf-launch-selected")?.addEventListener("click", () => {
    if (selectedToLaunch.length === 0) return;
    const ids = selectedToLaunch.map(p => String(p.id));
    closeLaunchAllPopover();
    executeLaunchProfiles(ids, `ตามเงื่อนไขที่เลือก ${ids.length} จอ`);
  });
}

function openLaunchAllPopover(anchorBtn) {
  closeLaunchAllPopover();
  resetLaunchChecklistFromFilters();
  launchPopoverState.open = true;
  anchorBtn?.classList.add("is-popover-open");

  const pop = document.createElement("div");
  pop.id = "launch-all-popover";
  pop.className = "launch-all-popover";
  pop.addEventListener("click", e => e.stopPropagation());
  renderLaunchAllPopoverContent(pop);
  document.body.appendChild(pop);
  positionLaunchAllPopover(pop, anchorBtn);
  requestAnimationFrame(() => pop.classList.add("is-visible"));
}

if (!window.__pmLaunchAllPopoverBound) {
  window.__pmLaunchAllPopoverBound = true;
  document.addEventListener("click", e => {
    if (!launchPopoverState.open) return;
    const pop = document.getElementById("launch-all-popover");
    const btn = document.getElementById("btn-launch-all");
    if ((pop && pop.contains(e.target)) || (btn && btn.contains(e.target))) return;
    closeLaunchAllPopover();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && launchPopoverState.open) closeLaunchAllPopover();
  });
  window.addEventListener("resize", () => {
    if (!launchPopoverState.open) return;
    positionLaunchAllPopover(document.getElementById("launch-all-popover"), document.getElementById("btn-launch-all"));
  });
}

document.getElementById("btn-launch-all").onclick = (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (launchPopoverState.open) {
    closeLaunchAllPopover();
  } else {
    openLaunchAllPopover(e.currentTarget);
  }
};

// Small notice in the corner (same look as the bag window's toasts)
function showToast(text, kind = "success") {
  let host = document.getElementById("im-toast-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "im-toast-host";
    document.body.appendChild(host);
  }
  const t = document.createElement("div");
  t.className = `im-toast ${kind === "error" ? "err" : kind === "warning" ? "warn" : "ok"}`;
  t.textContent = text;
  host.appendChild(t);
  setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 300); }, 3200);
}

// START / STOP BOT on every online client at once
async function setBotOnAllClients(start, btn) {
  const online = currentProfiles.filter(p => p.isRunning);
  if (!online.length) return showToast("ยังไม่มีจอที่ออนไลน์", "warning");
  const label = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="icon">⏳</span> ${start ? "กำลังเริ่มบอท..." : "กำลังหยุดบอท..."}`;
  const results = await Promise.all(online.map(p =>
    fetch(`${API_BASE}/api/profiles/${p.id}/toggle-bot?action=${start ? "start" : "stop"}`, { method: "POST" })
      .then(r => r.json()).catch(e => ({ success: false, error: e.message }))
  ));
  btn.disabled = false;
  btn.innerHTML = label;
  const failed = online.filter((p, i) => !results[i].success).map(p => p.name);
  showToast(`${start ? "▶️ START" : "⏹️ STOP"} BOT สำเร็จ ${online.length - failed.length}/${online.length} จอ${failed.length ? " — ไม่สำเร็จ: " + failed.join(", ") : ""}`, failed.length ? "warning" : "success");
  fetchProfiles();
}
// ⚖️ เช็คน้ำหนัก: list max weight of every plan client, then (after confirming) let the ones below 7,000
// buy + use the missing Weight Limit Scrolls (+500 each, ~5,000 z each)
const WEIGHT_TARGET = 7000, WEIGHT_SCROLL_PRICE = 5000;
async function runWeightCheck(btn) {
  const label = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="icon">⏳</span> กำลังเช็ค...';
  try {
    const data = await fetch(`${API_BASE}/api/weight-check?apply=0&target=${WEIGHT_TARGET}`, { method: "POST" }).then(r => r.json());
    if (!data.success) return showToast("❌ เช็คน้ำหนักไม่สำเร็จ: " + (data.error || ""), "error");
    const rows = data.results.filter(r => !r.offline);
    if (!rows.length) return showToast("ยังไม่มีจอที่ออนไลน์", "warning");
    const lines = [], toFix = [];
    let total = 0;
    for (const r of rows) {
      if (r.skip === "no-plan") { lines.push(`➖ ${r.name}: ไม่ได้ใช้ Plan — ข้าม`); continue; }
      if (r.error) { lines.push(`⚠️ ${r.name}: ${r.error}`); continue; }
      const lim = `${r.limit.toLocaleString()} / ${WEIGHT_TARGET.toLocaleString()}`;
      const extra = r.scrolls ? ` · มี Scroll เหลือในกระเป๋า ${r.scrolls} อัน (ใช้ไม่ได้แล้ว ขาย NPC ได้)` : "";
      if (!r.need && r.used === 10 && r.limit < WEIGHT_TARGET) { lines.push(`🔒 ${r.name}: ${lim} — ใช้ Scroll ครบ 10 ครั้งแล้ว เพิ่มอีกไม่ได้${extra}`); continue; }
      if (!r.need) { lines.push(`✅ ${r.name}: ${lim} ครบแล้ว${r.used === 10 && r.scrolls ? extra : ""}`); continue; }
      if (!r.supported) { lines.push(`⚠️ ${r.name}: ${lim} — บอทในจอนี้ยังเป็นเวอร์ชันเก่า (รอ Auto-update / รีเฟรชจอ)`); continue; }
      const buy = Math.max(0, r.need - (r.scrolls || 0));
      const cost = buy * WEIGHT_SCROLL_PRICE;
      total += r.need;
      toFix.push(r.id);
      let note = `ต้องใช้อีก ${r.need} อัน`;
      if (r.scrolls) note += ` (มีในกระเป๋า ${r.scrolls})`;
      if (buy) note += ` ซื้อ ${buy} อัน ≈ ${cost.toLocaleString()} z${r.zeny < cost ? ` ⚠️ เงินมี ${r.zeny.toLocaleString()} z (ซื้อเท่าที่พอ แล้วรอเงิน)` : ""}`;
      if (!r.bot) note += " ⏸️ บอทยังไม่ START (จะไปซื้อเมื่อกด START BOT)";
      if (r.pending) note += " — กำลังดำเนินการอยู่แล้ว";
      lines.push(`📦 ${r.name}: ${lim} — ${note}`);
    }
    if (!toFix.length) return alert(`⚖️ เช็คน้ำหนัก (เป้า ${WEIGHT_TARGET.toLocaleString()})\n\n` + lines.join("\n") + "\n\nไม่มีจอที่ต้องซื้อเพิ่ม");
    if (!confirm(`⚖️ เช็คน้ำหนัก (เป้า ${WEIGHT_TARGET.toLocaleString()})\n\n` + lines.join("\n") + `\n\nกด OK ให้ ${toFix.length} จอไปซื้อและใช้ Weight Limit Scroll ให้ครบ (รวม ${total} อัน)`)) return;
    const res = await fetch(`${API_BASE}/api/weight-check?apply=1&target=${WEIGHT_TARGET}&ids=${encodeURIComponent(toFix.join(","))}`, { method: "POST" }).then(r => r.json());
    const ok = (res.results || []).filter(r => r.requested).length;
    showToast(`⚖️ สั่งเติมน้ำหนักแล้ว ${ok}/${toFix.length} จอ`, ok === toFix.length ? "success" : "warning");
  } catch (e) {
    showToast("❌ เช็คน้ำหนักไม่สำเร็จ: " + e.message, "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = label;
  }
}
const btnWeightCheck = document.getElementById("btn-weight-check");
if (btnWeightCheck) btnWeightCheck.onclick = e => runWeightCheck(e.currentTarget);

// ==========================================
// CAPTCHA SETTING MODAL & LIVE PENDING NOTIFICATION DOCK
// ==========================================
let currentCaptchaSettings = {
  autoAnswer: true,
  answerDelayMs: 1800,
  skipWhenAutoInFarmMap: false,
  skipWhenBotStopped: false,
  skipWhenInTown: false,
  notifyPendingOnManager: true,
  soundAlertOnPending: false
};

function normalizeCaptchaSettingsLocal(input) {
  if (typeof input === "boolean") {
    return { ...currentCaptchaSettings, autoAnswer: input };
  }
  const s = (input && typeof input === "object") ? input : {};
  return {
    autoAnswer: s.autoAnswer !== undefined ? s.autoAnswer !== false : currentCaptchaSettings.autoAnswer,
    answerDelayMs: s.answerDelayMs != null ? Math.max(800, Math.min(8000, parseInt(s.answerDelayMs, 10) || 1800)) : currentCaptchaSettings.answerDelayMs,
    skipWhenAutoInFarmMap: s.skipWhenAutoInFarmMap !== undefined ? Boolean(s.skipWhenAutoInFarmMap) : currentCaptchaSettings.skipWhenAutoInFarmMap,
    skipWhenBotStopped: s.skipWhenBotStopped !== undefined ? Boolean(s.skipWhenBotStopped) : currentCaptchaSettings.skipWhenBotStopped,
    skipWhenInTown: s.skipWhenInTown !== undefined ? Boolean(s.skipWhenInTown) : currentCaptchaSettings.skipWhenInTown,
    notifyPendingOnManager: s.notifyPendingOnManager !== undefined ? (s.notifyPendingOnManager !== false) : currentCaptchaSettings.notifyPendingOnManager,
    soundAlertOnPending: s.soundAlertOnPending !== undefined ? Boolean(s.soundAlertOnPending) : currentCaptchaSettings.soundAlertOnPending
  };
}

function updateAutoAnswerToolbarBtn(settingsOrBool) {
  currentCaptchaSettings = normalizeCaptchaSettingsLocal(settingsOrBool);
  const btn = document.getElementById("btn-captcha-settings");
  const pill = document.getElementById("captcha-settings-mode-pill");
  if (!btn || !pill) return;
  pill.classList.remove("is-on", "is-off", "is-conditional");
  btn.classList.remove("is-on", "is-off", "is-conditional");
  if (currentCaptchaSettings.autoAnswer === false) {
    pill.textContent = "ปิด Auto";
    pill.classList.add("is-off");
    btn.classList.add("is-off");
  } else if (currentCaptchaSettings.skipWhenAutoInFarmMap) {
    pill.textContent = "งดตอบแมพฟาร์ม";
    pill.classList.add("is-conditional");
    btn.classList.add("is-conditional");
  } else if (currentCaptchaSettings.skipWhenBotStopped || currentCaptchaSettings.skipWhenInTown) {
    pill.textContent = "มีเงื่อนไข";
    pill.classList.add("is-conditional");
    btn.classList.add("is-conditional");
  } else {
    pill.textContent = "เปิดปกติ";
    pill.classList.add("is-on");
    btn.classList.add("is-on");
  }
}
window.updateAutoAnswerToolbarBtn = updateAutoAnswerToolbarBtn;

function applyCaptchaSettingsToModalDom(s) {
  const cfg = normalizeCaptchaSettingsLocal(s);
  const elAuto = document.getElementById("cs-auto-answer");
  const elDelay = document.getElementById("cs-answer-delay");
  const elFarm = document.getElementById("cs-skip-farm-auto");
  const elStop = document.getElementById("cs-skip-bot-stopped");
  const elTown = document.getElementById("cs-skip-in-town");
  const elNotify = document.getElementById("cs-notify-manager");
  const elSound = document.getElementById("cs-sound-alert");
  if (elAuto) elAuto.checked = cfg.autoAnswer !== false;
  if (elDelay) elDelay.value = cfg.answerDelayMs || 1800;
  if (elFarm) elFarm.checked = Boolean(cfg.skipWhenAutoInFarmMap);
  if (elStop) elStop.checked = Boolean(cfg.skipWhenBotStopped);
  if (elTown) elTown.checked = Boolean(cfg.skipWhenInTown);
  if (elNotify) elNotify.checked = cfg.notifyPendingOnManager !== false;
  if (elSound) elSound.checked = Boolean(cfg.soundAlertOnPending);
}

function closeCaptchaSettingsModal() {
  const modal = document.getElementById("modal-captcha-settings");
  if (modal) modal.style.display = "none";
}
window.closeCaptchaSettingsModal = closeCaptchaSettingsModal;

async function openCaptchaSettingsModal() {
  const modal = document.getElementById("modal-captcha-settings");
  if (!modal) return;
  applyCaptchaSettingsToModalDom(currentCaptchaSettings);
  const msgEl = document.getElementById("cs-save-msg");
  if (msgEl) msgEl.style.display = "none";
  modal.style.display = "flex";
  try {
    const res = await fetch(`${API_BASE}/api/human-check/settings`).then(r => r.json());
    if (res && res.success && res.settings) {
      updateAutoAnswerToolbarBtn(res.settings);
      applyCaptchaSettingsToModalDom(res.settings);
    }
  } catch (_) {}
}
window.openCaptchaSettingsModal = openCaptchaSettingsModal;

function initCaptchaSettingsModal() {
  const btnOpen = document.getElementById("btn-captcha-settings");
  const modal = document.getElementById("modal-captcha-settings");
  const btnClose = document.getElementById("btn-captcha-settings-close");
  const btnCancel = document.getElementById("btn-captcha-settings-cancel");
  const btnSave = document.getElementById("btn-captcha-settings-save");
  const msgEl = document.getElementById("cs-save-msg");
  if (btnOpen && !btnOpen._csBound) {
    btnOpen._csBound = true;
    btnOpen.addEventListener("click", openCaptchaSettingsModal);
  }
  if (!modal || modal._csBound) return;
  modal._csBound = true;
  if (btnClose) btnClose.addEventListener("click", closeCaptchaSettingsModal);
  if (btnCancel) btnCancel.addEventListener("click", closeCaptchaSettingsModal);
  modal.addEventListener("click", e => {
    if (e.target === modal) closeCaptchaSettingsModal();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && modal.style.display === "flex") closeCaptchaSettingsModal();
  });
  if (btnSave) {
    btnSave.addEventListener("click", async () => {
      const payload = {
        autoAnswer: document.getElementById("cs-auto-answer")?.checked !== false,
        answerDelayMs: Math.max(800, Math.min(8000, parseInt(document.getElementById("cs-answer-delay")?.value, 10) || 1800)),
        skipWhenAutoInFarmMap: Boolean(document.getElementById("cs-skip-farm-auto")?.checked),
        skipWhenBotStopped: Boolean(document.getElementById("cs-skip-bot-stopped")?.checked),
        skipWhenInTown: Boolean(document.getElementById("cs-skip-in-town")?.checked),
        notifyPendingOnManager: document.getElementById("cs-notify-manager")?.checked !== false,
        soundAlertOnPending: Boolean(document.getElementById("cs-sound-alert")?.checked)
      };
      const origTxt = btnSave.textContent;
      btnSave.disabled = true;
      btnSave.textContent = "⏳ กำลังบันทึก...";
      try {
        const res = await fetch(`${API_BASE}/api/human-check/settings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }).then(r => r.json());
        if (res && res.success) {
          const saved = res.settings || payload;
          updateAutoAnswerToolbarBtn(saved);
          const hcGlobal = document.getElementById("hc-global-auto-answer");
          if (hcGlobal) hcGlobal.checked = saved.autoAnswer !== false;
          const hcDelay = document.getElementById("hc-global-answer-delay");
          if (hcDelay) hcDelay.value = saved.answerDelayMs || 1800;
          const discAuto = document.getElementById("discord-auto-answer");
          if (discAuto) discAuto.checked = saved.autoAnswer !== false;
          updateCaptchaPendingNotifications();
          showToast("💾 บันทึก Captcha Setting แล้ว", "success");
          closeCaptchaSettingsModal();
        } else if (msgEl) {
          msgEl.style.display = "block";
          msgEl.className = "cs-save-msg is-err";
          msgEl.textContent = "❌ บันทึกไม่สำเร็จ: " + (res?.error || "เกิดข้อผิดพลาด");
        }
      } catch (err) {
        if (msgEl) {
          msgEl.style.display = "block";
          msgEl.className = "cs-save-msg is-err";
          msgEl.textContent = "❌ เกิดข้อผิดพลาด: " + err.message;
        }
      } finally {
        btnSave.disabled = false;
        btnSave.textContent = origTxt;
      }
    });
  }
}

const firstSeenActiveCheckAt = new Map();
const dismissedAlertCheckKeys = new Set();
const chimedAlertCheckKeys = new Set();
let lastCaptchaChimeAt = 0;
let lastCaptchaDockSig = "";

function isClientMapFarmMapForUi(st) {
  if (!st || (st.screenPhase && st.screenPhase !== "in_game")) return false;
  const mapStr = String(st.map || "").trim();
  if (!mapStr || mapStr === "--" || /ไม่ทราบแมพ|unknown|loading|กำลังโหลด/i.test(mapStr)) return false;
  if (/เมืองหลวง|โซลเฮเวน|ตลาดคาราวาน|\bsolhaven\b|\btown\b/i.test(mapStr)) return false;
  if (!/คุกใต้ดิน/i.test(mapStr) && /คุก|เรือนจำ|\bprison\b|\bjail\b/i.test(mapStr)) return false;
  if (/หอคอย|endless\s*tower/i.test(mapStr)) return false;
  return true;
}

function playSoftCaptchaPendingChime() {
  const now = Date.now();
  if (now - lastCaptchaChimeAt < 5000) return;
  lastCaptchaChimeAt = now;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!window.__pmManagerAudioCtx || window.__pmManagerAudioCtx.state === "closed") {
      window.__pmManagerAudioCtx = new AudioCtx();
    }
    const ctx = window.__pmManagerAudioCtx;
    if (ctx.state === "suspended" && typeof ctx.resume === "function") ctx.resume().catch(() => {});
    [783.99, 1046.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.14);
      gain.gain.setValueAtTime(0.16, ctx.currentTime + idx * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.14 + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.14);
      osc.stop(ctx.currentTime + idx * 0.14 + 0.17);
    });
  } catch (_) {}
}

function getPendingCaptchaAlertList() {
  const now = Date.now();
  const activeProfileIds = new Set();
  const pending = [];
  for (const p of currentProfiles) {
    if (!p || !p.isRunning || !p.liveState || !p.liveState.humanCheck || !p.liveState.humanCheck.active) {
      continue;
    }
    const pid = String(p.id);
    const hc = p.liveState.humanCheck;
    const checkKey = `${pid}:${hc.id ?? ""}:${hc.prompt || ""}`;
    activeProfileIds.add(pid);

    const prevSeen = firstSeenActiveCheckAt.get(pid);
    const firstSeenAt = (prevSeen && prevSeen.checkKey === checkKey) ? prevSeen.firstSeenAt : now;
    firstSeenActiveCheckAt.set(pid, { checkKey, firstSeenAt });

    if (hc.autoSolved) continue;

    const mapStr = String(p.liveState.map || "").trim();
    const isTown = /เมืองหลวง|โซลเฮเวน|ตลาดคาราวาน|\bsolhaven\b|\btown\b/i.test(mapStr);
    const pausedFarm = Boolean(currentCaptchaSettings.skipWhenAutoInFarmMap && p.liveState.isBotRunning && isClientMapFarmMapForUi(p.liveState));
    const pausedStop = Boolean(currentCaptchaSettings.skipWhenBotStopped && !p.liveState.isBotRunning);
    const pausedTown = Boolean(currentCaptchaSettings.skipWhenInTown && isTown);
    const pausedGlobalOff = currentCaptchaSettings.autoAnswer === false;
    const isPaused = Boolean(hc.pausedByPolicy || pausedFarm || pausedStop || pausedTown || pausedGlobalOff);
    const reason = hc.pauseReason
      || (pausedGlobalOff ? "ปิด Auto ตอบคำถามไว้"
        : pausedFarm ? "งดตอบในแมพฟาร์ม (กำลัง Auto)"
        : pausedStop ? "งดตอบ (บอทหยุดอยู่)"
        : pausedTown ? "งดตอบ (อยู่ในเมือง)"
        : null);

    const elapsedMs = now - firstSeenAt;
    if (isPaused || elapsedMs >= 4000) {
      pending.push({
        profile: p,
        pid,
        hc,
        checkKey,
        isPaused,
        reason: reason || "รอผู้เล่นตรวจสอบ/ตอบคำถาม"
      });
    }
  }

  for (const pid of Array.from(firstSeenActiveCheckAt.keys())) {
    if (!activeProfileIds.has(pid)) {
      firstSeenActiveCheckAt.delete(pid);
      for (const dk of Array.from(dismissedAlertCheckKeys)) {
        if (dk.startsWith(pid + ":")) dismissedAlertCheckKeys.delete(dk);
      }
      for (const ck of Array.from(chimedAlertCheckKeys)) {
        if (ck.startsWith(pid + ":")) chimedAlertCheckKeys.delete(ck);
      }
    }
  }
  return pending;
}

function jumpToAndFocusCaptchaClient(profileId) {
  const pid = String(profileId || "");
  if (!pid) return;
  if (typeof window.switchMainTab === "function") window.switchMainTab("profiles");
  document.body.classList.remove("cd-open", "pt-open", "pm-open", "gd-open");
  closeCaptchaSettingsModal();
  if (typeof closeLaunchAllPopover === "function") closeLaunchAllPopover();

  let expandedAny = false;
  for (const gk of ["problem", "stopped", "solo"]) {
    if (collapsedCardGroups.has(gk)) {
      collapsedCardGroups.delete(gk);
      expandedAny = true;
    }
  }
  if (typeof getPartyRoleMap === "function") {
    const r = getPartyRoleMap().get(pid);
    if (r && r.partyId && collapsedCardGroups.has(`party:${r.partyId}`)) {
      collapsedCardGroups.delete(`party:${r.partyId}`);
      expandedAny = true;
    }
  }
  if (expandedAny) renderProfiles();

  captchaHighlightUntilMap.set(pid, Date.now() + 4500);

  const highlightAndScroll = () => {
    const cardEl = document.getElementById(`card-${pid}`) || document.querySelector(`.profile-card[data-profile-id="${pid}"]`);
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: "smooth", block: "center" });
      cardEl.classList.remove("is-captcha-target-highlight");
      void cardEl.offsetWidth;
      cardEl.classList.add("is-captcha-target-highlight");
    }
  };
  setTimeout(() => {
    if ((captchaHighlightUntilMap.get(pid) || 0) <= Date.now()) {
      captchaHighlightUntilMap.delete(pid);
      const el = document.getElementById(`card-${pid}`) || document.querySelector(`.profile-card[data-profile-id="${pid}"]`);
      if (el) el.classList.remove("is-captcha-target-highlight");
    }
  }, 4550);
  highlightAndScroll();
  requestAnimationFrame(highlightAndScroll);

  focusClientWindow(pid);
  const prof = currentProfiles.find(p => String(p.id) === pid);
  const disp = prof ? ((prof.liveState?.charName || prof.lastCharName) ? `${prof.liveState?.charName || prof.lastCharName} (${prof.name})` : prof.name) : pid;
  showToast(`🎯 เลื่อนไปยัง ${disp} และดึงหน้าจอเกมขึ้นบนสุดแล้ว`, "info");
}
window.jumpToAndFocusCaptchaClient = jumpToAndFocusCaptchaClient;

function updateCaptchaPendingNotifications() {
  const list = getPendingCaptchaAlertList();
  const badge = document.getElementById("captcha-pending-toolbar-badge");
  if (badge) {
    if (list.length > 0) {
      badge.style.display = "inline-flex";
      badge.textContent = `🚨 ${list.length}`;
    } else {
      badge.style.display = "none";
    }
  }

  if (currentCaptchaSettings.soundAlertOnPending && list.some(item => !chimedAlertCheckKeys.has(item.checkKey))) {
    list.forEach(item => chimedAlertCheckKeys.add(item.checkKey));
    playSoftCaptchaPendingChime();
  }

  const visible = (currentCaptchaSettings.notifyPendingOnManager !== false)
    ? list.filter(item => !dismissedAlertCheckKeys.has(item.checkKey))
    : [];

  let dock = document.getElementById("captcha-live-alert-dock");
  if (visible.length === 0) {
    if (dock) dock.remove();
    lastCaptchaDockSig = "";
    return;
  }

  const sig = visible.map(v => `${v.checkKey}|${v.reason}|${v.hc.meta || ""}|${v.profile.liveState?.map || ""}`).join(";;");
  if (dock && sig === lastCaptchaDockSig) return;
  lastCaptchaDockSig = sig;

  if (!dock) {
    dock = document.createElement("div");
    dock.id = "captcha-live-alert-dock";
    dock.className = "captcha-live-alert-dock";
    document.body.appendChild(dock);
  }

  dock.innerHTML = `
    <div class="clad-head">
      <div class="clad-title">🚨 แจ้งเตือนติดตอบคำถาม (<b>${visible.length}</b> จอ)</div>
      <button type="button" class="clad-dismiss-btn" id="btn-clad-dismiss" title="ซ่อนการแจ้งเตือนชุดนี้ชั่วคราว">ซ่อนชั่วคราว</button>
    </div>
    <div class="clad-list">
      ${visible.map(item => {
        const p = item.profile;
        const charName = p.liveState?.charName || p.lastCharName || p.name;
        const disp = charName && charName !== p.name ? `${charName} (${p.name})` : p.name;
        const mapName = p.liveState?.map || p.targetMap || "ไม่ทราบแมพ";
        return `
          <div class="clad-item" data-captcha-jump-id="${escapeHTML(item.pid)}" role="button" tabindex="0" title="คลิกเพื่อ Slide ไปที่การ์ดและดึงจอเกมขึ้นบนสุด">
            <div class="clad-item-top">
              <span class="clad-char-name">👤 ${escapeHTML(disp)}</span>
              <span class="clad-reason-pill">${item.isPaused ? "⏸️ งดตอบอัตโนมัติ" : "⏳ รอผู้เล่นตอบ"}</span>
            </div>
            <div class="clad-item-sub">📍 ${escapeHTML(mapName)}${item.hc.meta ? ` · ${escapeHTML(item.hc.meta)}` : ""}</div>
            <div class="clad-item-prompt">❓ ${escapeHTML(item.hc.prompt || "ตรวจพบคำถามเช็คผู้เล่นบนจอ")}</div>
            <div class="clad-item-cta">🎯 คลิกเพื่อ Slide ไปหา &amp; ดึงจอขึ้นบนสุด →</div>
          </div>
        `;
      }).join("")}
    </div>
  `;

  dock.querySelector("#btn-clad-dismiss")?.addEventListener("click", e => {
    e.stopPropagation();
    visible.forEach(item => dismissedAlertCheckKeys.add(item.checkKey));
    updateCaptchaPendingNotifications();
  });

  dock.querySelectorAll("[data-captcha-jump-id]").forEach(el => {
    const activate = () => jumpToAndFocusCaptchaClient(el.getAttribute("data-captcha-jump-id"));
    el.addEventListener("click", activate);
    el.addEventListener("keydown", ev => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        activate();
      }
    });
  });
}
window.updateCaptchaPendingNotifications = updateCaptchaPendingNotifications;

// ==========================================
// PROXY AUTO-REGISTER MODAL & TOGGLE CONTROLLER
// ==========================================
let currentProxyRegisterEnabled = false;

function updateProxyRegisterToolbarBtn(enabled) {
  currentProxyRegisterEnabled = !!enabled;
  const btn = document.getElementById("btn-toggle-proxy-register");
  const lbl = document.getElementById("lbl-toggle-proxy-register");
  if (!btn) return;
  if (enabled) {
    if (lbl) lbl.textContent = "Proxy สมัคร: เปิด";
    btn.style.borderColor = "rgba(14, 165, 233, 0.5)";
    btn.style.background = "rgba(14, 165, 233, 0.15)";
    btn.style.color = "#38bdf8";
    btn.title = "ระบบ Proxy สมัครไอดีเปิดใช้งานอยู่ (0.1 ส่วนบุญ/ไอดี) — คลิกเพื่อดูเงื่อนไขหรือปิด";
  } else {
    if (lbl) lbl.textContent = "Proxy สมัคร: ปิด";
    btn.style.borderColor = "rgba(148, 163, 184, 0.3)";
    btn.style.background = "rgba(148, 163, 184, 0.08)";
    btn.style.color = "#94a3b8";
    btn.title = "ระบบ Proxy สมัครไอดีปิดอยู่ — คลิกเพื่อดูเงื่อนไขและเปิดใช้งาน";
  }
}
window.updateProxyRegisterToolbarBtn = updateProxyRegisterToolbarBtn;

function openProxyRegisterModal() {
  const modal = document.getElementById("modal-proxy-register-confirm");
  if (!modal) return;
  modal.style.display = "flex";

  const badge = document.getElementById("proxy-modal-status-badge");
  const confirmBtn = document.getElementById("btn-proxy-modal-confirm");
  if (badge) {
    if (currentProxyRegisterEnabled) {
      badge.textContent = "สถานะ: เปิดใช้งาน";
      badge.style.background = "rgba(16, 185, 129, 0.2)";
      badge.style.color = "#34d399";
      badge.style.borderColor = "rgba(16, 185, 129, 0.4)";
    } else {
      badge.textContent = "สถานะ: ปิด";
      badge.style.background = "rgba(148, 163, 184, 0.15)";
      badge.style.color = "#94a3b8";
      badge.style.borderColor = "rgba(148, 163, 184, 0.3)";
    }
  }
  if (confirmBtn) {
    if (currentProxyRegisterEnabled) {
      confirmBtn.textContent = "⏸️ ปิดใช้งาน Proxy";
      confirmBtn.style.background = "rgba(239, 68, 68, 0.8)";
      confirmBtn.style.borderColor = "rgba(239, 68, 68, 0.5)";
    } else {
      confirmBtn.textContent = "✅ ยอมรับเงื่อนไขและเปิดใช้งาน";
      confirmBtn.style.background = "#0284c7";
      confirmBtn.style.borderColor = "#38bdf8";
    }
  }

  fetchProxyRegisterSettings();
}

function closeProxyRegisterModal() {
  const modal = document.getElementById("modal-proxy-register-confirm");
  if (modal) modal.style.display = "none";
}

function proxyQuotaFromSettings(settings) {
  if(settings?.unitScale!==100||!Number.isSafeInteger(settings.balanceUnits))return null;
  return Math.max(0,Math.floor(settings.balanceUnits/10));
}
function applyProxyConnectionSettings(settings) {
  const isBroker = settings.mode === 'owner-broker';
  const brokerRadio = document.getElementById('proxy-mode-broker');
  const localRadio = document.getElementById('proxy-mode-local');
  if (brokerRadio) brokerRadio.checked = isBroker;
  if (localRadio) localRadio.checked = !isBroker;

  const brokerSection = document.getElementById('proxy-broker-info-section');
  const localSection = document.getElementById('proxy-local-config-section');
  if (brokerSection) brokerSection.style.display = isBroker ? 'block' : 'none';
  if (localSection) localSection.style.display = isBroker ? 'none' : 'block';
  const fields={'proxy-config-host':settings.proxyHost||'','proxy-config-port':settings.proxyPort||'','proxy-config-country':settings.country||'th'};
  for(const [id,value]of Object.entries(fields)){const input=document.getElementById(id);if(input&&document.activeElement!==input)input.value=value;}
  const note=document.getElementById('proxy-config-note');
  if(note)note.textContent=settings.configured?'ใช้ข้อมูลรับรองที่เก็บในเครื่องได้ กรอกใหม่เฉพาะเมื่อต้องการเปลี่ยน':'กรอกข้อมูลรับรอง Proxy ที่ต้องการใช้ในเครื่องนี้';
  const confirm=document.getElementById('btn-proxy-modal-confirm');if(confirm)confirm.disabled = isBroker ? false : (!settings.enabled && !settings.configured);
}
async function saveProxyConnectionSettings(){
  const value=id=>(document.getElementById(id)?.value||'').trim(),user=value('proxy-config-user'),password=document.getElementById('proxy-config-pass')?.value||'';
  const body={mode:'local',proxyHost:value('proxy-config-host'),proxyPort:Number(value('proxy-config-port')),country:value('proxy-config-country').toLowerCase(),enabled:false};
  if(!body.proxyHost||!Number.isInteger(body.proxyPort)||body.proxyPort<1||body.proxyPort>65535||!/^[a-z]{2}$/.test(body.country))return showToast('กรอก Host, Port และรหัสประเทศสองตัวให้ถูกต้อง','error');
  if(!!user!==!!password)return showToast('กรอกชื่อผู้ใช้ Proxy และรหัสผ่านใหม่ทั้งคู่ หรือเว้นทั้งคู่เพื่อคงค่าเดิม','error');
  if(user){body.proxyUser=user;body.proxyPass=password;}
  try{const response=await fetch(`${API_BASE}/api/proxy-register/settings`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),data=await response.json();if(!response.ok||data.success!==true)throw Error(data.error||'ยังบันทึกค่า Proxy ไม่ได้');
    document.getElementById('proxy-config-user').value='';document.getElementById('proxy-config-pass').value='';applyProxyConnectionSettings(data.settings);updateProxyRegisterToolbarBtn(data.settings.enabled);showToast('บันทึกไว้ในเครื่องแล้ว Proxy ยังปิดอยู่ สามารถเปิดใช้งานเมื่อพร้อม','success');
  }catch(error){showToast(error.message,'error');}
}
async function fetchProxyRegisterSettings() {
  try {
    const [proxyRes, hcRes] = await Promise.all([
      fetch(`${API_BASE}/api/proxy-register/settings`).then(r => r.json()).catch(() => null),
      fetch(`${API_BASE}/api/human-check/settings`).then(r => r.json()).catch(() => null)
    ]);
    if (proxyRes && proxyRes.success && proxyRes.settings) {
      let s = proxyRes.settings;
      if (s.mode === 'local' && !s.configured && !s.hasCredentials) {
        try {
          const autoRes = await fetch(`${API_BASE}/api/proxy-register/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'owner-broker' })
          }).then(r => r.json());
          if (autoRes && autoRes.success && autoRes.settings) s = autoRes.settings;
        } catch (_) {}
      }
      applyProxyConnectionSettings(s);
      updateProxyRegisterToolbarBtn(s.enabled);
      const regCountEl = document.getElementById("proxy-modal-reg-count");
      if (regCountEl) regCountEl.textContent = (s.registeredCount || 0) + " ไอดี";
      const lastIpEl = document.getElementById("proxy-modal-last-ip");
      if (lastIpEl) lastIpEl.textContent = s.lastTestedIp || "-";
    }
    const settings=hcRes?.success?hcRes.settings:null,quota=proxyQuotaFromSettings(settings);
    const balEl=document.getElementById('proxy-modal-balance-display'),quotaEl=document.getElementById('proxy-modal-quota-calc');
    if(balEl)balEl.textContent=quota===null?'—':(settings.balanceUnits/100).toLocaleString('th-TH',{minimumFractionDigits:1,maximumFractionDigits:2})+' ส่วนบุญ';
    if(quotaEl)quotaEl.textContent=quota===null?'—':(quota>0?quota.toLocaleString():'คิดตามรอบบิล (0.1/ไอดี)');
  } catch (_) {}
}

function initProxyRegisterControls() {
  const modeBroker = document.getElementById('proxy-mode-broker');
  const modeLocal = document.getElementById('proxy-mode-local');
  if (modeBroker) {
    modeBroker.addEventListener('change', async () => {
      if (modeBroker.checked) {
        try {
          const res = await fetch(`${API_BASE}/api/proxy-register/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'owner-broker' })
          }).then(r => r.json());
          if (res && res.success) {
            applyProxyConnectionSettings(res.settings);
            showToast('สลับเป็นโหมด Proxy กลางของระบบแล้ว (ไม่ต้องกรอกข้อมูล)', 'success');
          }
        } catch (e) {
          showToast('ไม่สามารถสลับโหมดได้: ' + e.message, 'error');
        }
      }
    });
  }
  if (modeLocal) {
    modeLocal.addEventListener('change', async () => {
      if (modeLocal.checked) {
        try {
          const res = await fetch(`${API_BASE}/api/proxy-register/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'local' })
          }).then(r => r.json());
          if (res && res.success) {
            applyProxyConnectionSettings(res.settings);
            showToast('สลับเป็นโหมดกำหนด Proxy ในเครื่องแล้ว', 'info');
          }
        } catch (e) {
          showToast('ไม่สามารถสลับโหมดได้: ' + e.message, 'error');
        }
      }
    });
  }
  const saveConfig=document.getElementById('btn-proxy-config-save');if(saveConfig)saveConfig.onclick=saveProxyConnectionSettings;
  const btnToolbar = document.getElementById("btn-toggle-proxy-register");
  if (btnToolbar) {
    btnToolbar.onclick = () => {
      openProxyRegisterModal();
    };
  }

  const btnClose = document.getElementById("btn-proxy-register-close");
  if (btnClose) btnClose.onclick = closeProxyRegisterModal;
  const btnCancel = document.getElementById("btn-proxy-modal-cancel");
  if (btnCancel) btnCancel.onclick = closeProxyRegisterModal;

  const btnConfirm = document.getElementById("btn-proxy-modal-confirm");
  if (btnConfirm) {
    btnConfirm.onclick = async () => {
      btnConfirm.disabled = true;
      try {
        const nextState = !currentProxyRegisterEnabled;
        const res = await fetch(`${API_BASE}/api/proxy-register/toggle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled: nextState })
        }).then(r => r.json());
        if (res && res.success) {
          updateProxyRegisterToolbarBtn(res.enabled);
          showToast(res.enabled ? "🌐 เปิดใช้งานระบบ Proxy สำหรับสมัครไอดีแล้ว (0.1 ส่วนบุญ/ไอดี)" : "⏸️ ปิดใช้งานระบบ Proxy แล้ว", res.enabled ? "success" : "info");
          closeProxyRegisterModal();
        } else {
          showToast("❌ เปลี่ยนสถานะไม่สำเร็จ: " + (res.error || "Unknown"), "error");
        }
      } catch (e) {
        showToast("❌ เกิดข้อผิดพลาด: " + e.message, "error");
      } finally {
        btnConfirm.disabled = false;
      }
    };
  }

  const btnTest = document.getElementById("btn-proxy-test-conn");
  const testStatus = document.getElementById("proxy-test-status");
  if (btnTest) {
    btnTest.onclick = async () => {
      btnTest.disabled = true;
      if (testStatus) {
        testStatus.textContent = "⏳ กำลังเชื่อมต่อ Proxy และตรวจสอบสถานะ IP ผ่าน Cloudflare...";
        testStatus.style.color = "#38bdf8";
      }
      try {
        const res = await fetch(`${API_BASE}/api/proxy-register/test`, { method: "POST" }).then(r => r.json());
        if (res && res.success) {
          const cf = res.cloudflareStatus;
          const slots = cf?.availableSlots != null ? cf.availableSlots : 3;
          if (testStatus) {
            testStatus.textContent = `✅ เชื่อมต่อสำเร็จ! Egress IP: ${res.ip} (โควต้าชม.นี้: ว่าง ${slots}/3 ช่อง)`;
            testStatus.style.color = "#34d399";
          }
          const lastIpEl = document.getElementById("proxy-modal-last-ip");
          if (lastIpEl) lastIpEl.textContent = res.ip;
          showToast(`✅ เชื่อมต่อ Proxy สำเร็จ (IP: ${res.ip})`, "success");
        } else {
          if (testStatus) {
            testStatus.textContent = `❌ เชื่อมต่อไม่สำเร็จ: ${res.error || "Unknown"}`;
            testStatus.style.color = "#f87171";
          }
          showToast(`❌ ทดสอบไม่สำเร็จ: ${res.error || "Unknown"}`, "error");
        }
      } catch (e) {
        if (testStatus) {
          testStatus.textContent = `❌ เกิดข้อผิดพลาด: ${e.message}`;
          testStatus.style.color = "#f87171";
        }
      } finally {
        btnTest.disabled = false;
      }
    };
  }

  fetchProxyRegisterSettings();
}

// ==========================================
// PER-SCREEN IP QUEUE (1 IP : 6 SCREENS DEFAULT) MODAL & TOGGLE CONTROLLER
// ==========================================
let currentScreenProxySettings = {
  enabled: false,
  mode: "owner-queue",
  maxScreensPerIp: 6,
  onlyGameTraffic: true,
  localAssetCache: true,
  poolCount: 0,
  totalSlots: 0,
  activeLeaseCount: 0,
  freeSlots: 0
};

function formatProxyBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n <= 0) return "0 B";
  if (n < 1024) return `${Math.round(n)} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function updateScreenProxyToolbarBtn(summary) {
  if (summary && typeof summary === "object") {
    currentScreenProxySettings = { ...currentScreenProxySettings, ...summary };
  }
  const enabled = !!currentScreenProxySettings.enabled;
  const maxS = Number(currentScreenProxySettings.maxScreensPerIp) || 6;
  const activeCount = Number(currentScreenProxySettings.activeLeaseCount) || 0;
  const poolCount = Number(currentScreenProxySettings.poolCount) || 0;

  const btn = document.getElementById("btn-toggle-screen-proxy");
  const lbl = document.getElementById("lbl-toggle-screen-proxy");
  if (!btn) return;

  if (enabled) {
    if (lbl) {
      lbl.textContent = poolCount > 0
        ? `แยก IP (1:${maxS}): เปิด (${activeCount}/${poolCount * maxS})`
        : `แยก IP (1:${maxS}): เปิด`;
    }
    btn.style.borderColor = "rgba(168, 85, 247, 0.55)";
    btn.style.background = "rgba(168, 85, 247, 0.18)";
    btn.style.color = "#e9d5ff";
    btn.title = `ระบบแยก IP รายจอเปิดใช้งานอยู่ (1 IP ต่อ ${maxS} จอ · จับคู่แล้ว ${activeCount} จอ จาก ${poolCount} IP) — คลิกเพื่อตั้งค่าหรือเปิด/ปิด`;
  } else {
    if (lbl) lbl.textContent = `แยก IP (1:${maxS}): ปิด`;
    btn.style.borderColor = "rgba(148, 163, 184, 0.3)";
    btn.style.background = "rgba(148, 163, 184, 0.08)";
    btn.style.color = "#94a3b8";
    btn.title = `ระบบแยก IP รายจอ (1 IP ต่อ ${maxS} จอ) ปิดอยู่ — คลิกเพื่อตั้งค่ารายการ IP หรือเปิดใช้งาน`;
  }
}
window.updateScreenProxyToolbarBtn = updateScreenProxyToolbarBtn;

function computeDeviceSubSizesForIp(screensPerIp) {
  const perIp = Math.max(1, Math.min(20, Number(screensPerIp) || 6));
  const maxPerDevice = 2;
  const count = Math.ceil(perIp / maxPerDevice);
  const sizes = [];
  for (let i = 0; i < count; i++) {
    sizes.push(Math.min(maxPerDevice, Math.max(1, perIp - i * maxPerDevice)));
  }
  return sizes;
}
window.computeDeviceSubSizesForIp = computeDeviceSubSizesForIp;

function computeIpRatioSurchargePct(screensPerIp) {
  const cfg = (currentScreenProxySettings && currentScreenProxySettings.surchargeConfig) || {
    enabled: true,
    baseline: 6,
    tiers: { '6': 0, '5': 5, '4': 10, '3': 15, '2': 20, '1': 25 }
  };
  if (cfg.enabled === false) return 0;
  const base = Math.max(1, Math.min(20, Math.floor(Number(cfg.baseline) || 6)));
  const n = Math.max(1, Math.min(20, Math.floor(Number(screensPerIp) || base)));
  if (n >= base) return 0;
  const val = Number(cfg.tiers && cfg.tiers[String(n)]);
  return Number.isFinite(val) ? Math.max(0, val) : 0;
}

function updateScreenProxyDynamicRatioLabels(maxScreensInput, poolCountInput, activeCountInput) {
  const maxS = Math.max(1, Math.min(20, Number(maxScreensInput) || Number(currentScreenProxySettings.maxScreensPerIp) || 6));
  const poolCount = Number.isFinite(Number(poolCountInput)) ? Number(poolCountInput) : (Number(currentScreenProxySettings.poolCount) || 0);
  const activeCount = Number.isFinite(Number(activeCountInput)) ? Number(activeCountInput) : (Number(currentScreenProxySettings.activeLeaseCount) || 0);
  const subSizes = computeDeviceSubSizesForIp(maxS);
  const splitJoinText = subSizes.map(n => `${n} จอ`).join(" + ");

  const titleEl = document.getElementById("sp-modal-title-text");
  if (titleEl) {
    titleEl.textContent = `ระบบแยก IP รายจอ (1 IP ต่อ ${maxS} จอ)`;
  }

  const subEl = document.getElementById("sp-modal-sub-text");
  if (subEl) {
    subEl.textContent = subSizes.length > 1
      ? `จัดคิวจ่าย Static IP อัตโนมัติ (1 IP = ${maxS} จอ · แบ่งเป็น ${subSizes.length} กลุ่ม ${subSizes.length} Device: ${splitJoinText})`
      : `จัดคิวจ่าย Static IP อัตโนมัติ (จำกัดไม่เกิน ${maxS} จอต่อ 1 IP · 1 กลุ่ม 1 Device) พร้อม Split-Tunnel ประหยัดแบนด์วิดท์`;
  }

  const statSlotsLabel = document.getElementById("sp-stat-total-slots-label");
  if (statSlotsLabel) {
    statSlotsLabel.textContent = `รองรับสูงสุด (1:${maxS})`;
  }

  const totalSlotsEl = document.getElementById("sp-stat-total-slots");
  const freeSlotsEl = document.getElementById("sp-stat-free-slots");
  const computedTotal = poolCount * maxS;
  if (totalSlotsEl) totalSlotsEl.textContent = `${computedTotal} จอ`;
  if (freeSlotsEl) freeSlotsEl.textContent = `${Math.max(0, computedTotal - activeCount)} ช่อง`;

  const poolHeaderTitle = document.getElementById("sp-pool-header-title");
  if (poolHeaderTitle) {
    poolHeaderTitle.textContent = `📋 รายการ Static Proxy IP ในคิว (1 บรรทัด = 1 IP รองรับ ${maxS} จอ · ${subSizes.length} Device)`;
  }

  const previewEl = document.getElementById("sp-device-split-preview");
  if (previewEl) {
    const pillsHtml = subSizes.map((sz, i) => `
      <span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:99px;background:rgba(15,23,42,0.85);border:1px solid rgba(56,189,248,0.45);color:#7dd3fc;font-weight:700;font-size:10.5px;">
        🖥️ Device #${i + 1}: <b>${sz} จอ</b>
      </span>
    `).join('<span style="color:#64748b;font-weight:700;">+</span>');
    previewEl.innerHTML = `
      <span>⚙️ <b>การแบ่ง Device ต่อ 1 IP:</b></span>
      <span>1 IP (<b>${maxS} จอ</b>) ➜ แบ่งเป็น <b style="color:#fde047;">${subSizes.length} กลุ่ม · ${subSizes.length} Device</b></span>
      <span style="display:inline-flex;align-items:center;gap:4px;flex-wrap:wrap;">${pillsHtml}</span>
    `;
  }

  document.querySelectorAll(".btn-sp-max-preset").forEach(btn => {
    const val = Number(btn.getAttribute("data-max"));
    const isAct = val === maxS;
    const pct = computeIpRatioSurchargePct(val);
    btn.style.borderColor = isAct ? "#a855f7" : "rgba(148,163,184,0.3)";
    btn.style.background = isAct ? "rgba(168,85,247,0.28)" : "rgba(15,23,42,0.8)";
    btn.style.color = isAct ? "#f3e8ff" : "#cbd5e1";
    btn.title = pct > 0
      ? `1 IP = ${val} จอ (ส่วนบุญเพิ่ม +${pct}%)`
      : `1 IP = ${val} จอ (มาตรฐาน +0%)`;
  });

  const spHintEl = document.getElementById("sp-surcharge-ratio-hint");
  if (spHintEl) {
    const pct = computeIpRatioSurchargePct(maxS);
    spHintEl.textContent = pct > 0 ? `+${pct}% ส่วนบุญ (1:${maxS})` : `+0% มาตรฐาน (1:${maxS})`;
    spHintEl.style.color = pct > 0 ? "#fde68a" : "#6ee7b7";
    spHintEl.style.background = pct > 0 ? "rgba(245,158,11,0.18)" : "rgba(16,185,129,0.16)";
    spHintEl.style.borderColor = pct > 0 ? "rgba(251,191,36,0.45)" : "rgba(52,211,153,0.4)";
  }

  const toggleBtn = document.getElementById("btn-screen-proxy-toggle-main");
  if (toggleBtn && !currentScreenProxySettings.enabled) {
    toggleBtn.textContent = `✅ เปิดใช้งานแยก IP (1:${maxS})`;
  }
}

function renderScreenProxyModal(statusData) {
  if (!statusData) return;
  if (statusData.settings) {
    updateScreenProxyToolbarBtn(statusData.settings);
  }
  const s = currentScreenProxySettings;
  const enabled = !!s.enabled;
  const maxS = Number(s.maxScreensPerIp) || 6;

  if (typeof window.updateDeviceManagerFromProfiles === "function") {
    window.updateDeviceManagerFromProfiles(
      currentProfiles,
      statusData.deviceGroups,
      maxS,
      {
        customIpConfig: statusData.customIpConfig,
        customGroupLeases: statusData.customGroupLeases,
        ipSurchargeConfig: statusData.surchargeConfig || (statusData.settings && statusData.settings.surchargeConfig),
        screenProxySummary: statusData.settings || s
      }
    );
  }

  const badge = document.getElementById("screen-proxy-status-badge");
  if (badge) {
    if (enabled) {
      badge.textContent = "สถานะ: เปิดใช้งาน";
      badge.style.background = "rgba(16, 185, 129, 0.2)";
      badge.style.color = "#34d399";
      badge.style.borderColor = "rgba(16, 185, 129, 0.45)";
    } else {
      badge.textContent = "สถานะ: ปิด";
      badge.style.background = "rgba(148, 163, 184, 0.15)";
      badge.style.color = "#94a3b8";
      badge.style.borderColor = "rgba(148, 163, 184, 0.3)";
    }
  }

  const toggleBtn = document.getElementById("btn-screen-proxy-toggle-main");
  if (toggleBtn) {
    if (enabled) {
      toggleBtn.textContent = "⏸️ ปิดใช้งานระบบแยก IP";
      toggleBtn.style.background = "rgba(239, 68, 68, 0.85)";
      toggleBtn.style.borderColor = "rgba(239, 68, 68, 0.55)";
    } else {
      toggleBtn.textContent = `✅ เปิดใช้งานแยก IP (1:${maxS})`;
      toggleBtn.style.background = "#7c3aed";
      toggleBtn.style.borderColor = "#a855f7";
    }
  }

  const poolCountEl = document.getElementById("sp-stat-pool-count");
  const totalSlotsEl = document.getElementById("sp-stat-total-slots");
  const activeLeasesEl = document.getElementById("sp-stat-active-leases");
  const freeSlotsEl = document.getElementById("sp-stat-free-slots");
  if (poolCountEl) poolCountEl.textContent = `${s.poolCount || 0} IP`;
  if (totalSlotsEl) totalSlotsEl.textContent = `${s.totalSlots || 0} จอ`;
  if (activeLeasesEl) activeLeasesEl.textContent = `${s.activeLeaseCount || 0} จอ`;
  if (freeSlotsEl) freeSlotsEl.textContent = `${s.freeSlots || 0} ช่อง`;

  updateScreenProxyDynamicRatioLabels(maxS, s.poolCount || 0, s.activeLeaseCount || 0);

  const modeOwner = document.getElementById("sp-mode-owner");
  const modeLocal = document.getElementById("sp-mode-local");
  if (modeOwner) modeOwner.checked = s.mode !== "local-pool";
  if (modeLocal) modeLocal.checked = s.mode === "local-pool";

  const maxInput = document.getElementById("sp-max-screens");
  if (maxInput && document.activeElement !== maxInput) {
    maxInput.value = String(maxS);
  }

  const onlyGameChk = document.getElementById("sp-only-game-traffic");
  if (onlyGameChk) {
    onlyGameChk.checked = s.onlyGameTraffic !== false;
  }

  const localCacheChk = document.getElementById("sp-local-asset-cache");
  if (localCacheChk) {
    localCacheChk.checked = s.localAssetCache !== false;
  }

  const tr = statusData.traffic || {};
  const ac = statusData.assetCache || tr.assetCache || {};
  const proxyTrafficEl = document.getElementById("sp-stat-proxy-traffic");
  const proxyTrafficSubEl = document.getElementById("sp-stat-proxy-traffic-sub");
  const cacheSavedEl = document.getElementById("sp-stat-cache-saved");
  const cacheSavedSubEl = document.getElementById("sp-stat-cache-saved-sub");
  const cacheFilesEl = document.getElementById("sp-stat-cache-files");
  const cacheFilesSubEl = document.getElementById("sp-stat-cache-files-sub");
  if (proxyTrafficEl) {
    proxyTrafficEl.textContent = formatProxyBytes(tr.proxyTotalBytes || 0);
  }
  if (proxyTrafficSubEl) {
    const rateNote = tr.proxyBytesPerHour > 0 ? ` · ~${formatProxyBytes(tr.proxyBytesPerHour)}/ชม.` : "";
    proxyTrafficSubEl.textContent = `↓${formatProxyBytes(tr.proxyRxBytes || 0)} / ↑${formatProxyBytes(tr.proxyTxBytes || 0)}${rateNote}`;
  }
  if (cacheSavedEl) {
    cacheSavedEl.textContent = formatProxyBytes(ac.bytesSaved || 0);
  }
  if (cacheSavedSubEl) {
    cacheSavedSubEl.textContent = `Hit ${(Number(ac.hits) || 0).toLocaleString()} ครั้ง (ดึงใหม่ ${(Number(ac.misses) || 0).toLocaleString()})`;
  }
  if (cacheFilesEl) {
    cacheFilesEl.textContent = `${(Number(ac.filesCount) || 0).toLocaleString()} ไฟล์`;
  }
  if (cacheFilesSubEl) {
    cacheFilesSubEl.textContent = `ขนาดรวม ${formatProxyBytes(ac.diskBytes || 0)}`;
  }

  const poolTextarea = document.getElementById("sp-pool-textarea");
  if (poolTextarea && document.activeElement !== poolTextarea && typeof s.poolText === "string") {
    poolTextarea.value = s.poolText;
  }

  // --- Proxy Merit Billing & Anti-Clone Guard (Read-only rate synced from Admin Server) ---
  const bill = statusData.billing || {};
  const ratePerGbEl = document.getElementById("sp-bill-rate-per-gb");
  if (ratePerGbEl) {
    const rGb = Number(bill.ratePerGb != null ? bill.ratePerGb : 0.3);
    const pGb = Number(bill.packageGb || 5000).toLocaleString();
    const pMerit = Number(bill.packageMerit ?? 1500).toLocaleString();
    ratePerGbEl.textContent = `${rGb.toFixed(2)} บุญ/GB (${pGb} GB = ${pMerit} บุญ)`;
  }
  const hwidBadgeEl = document.getElementById("sp-billing-hwid-badge");
  if (hwidBadgeEl) {
    const hwidShort = (bill.machineHwid || "").slice(0, 12);
    hwidBadgeEl.textContent = hwidShort
      ? `🔒 Anti-Clone Guard: ผูกเครื่อง ${hwidShort}`
      : `🔒 Anti-Clone HWID Guard ทำงานอยู่`;
  }

  const todayGbEl = document.getElementById("sp-bill-today-gb");
  const todayGbSubEl = document.getElementById("sp-bill-today-gb-sub");
  const todayScreensEl = document.getElementById("sp-bill-today-screens");
  const todayScreensSubEl = document.getElementById("sp-bill-today-screens-sub");
  const todayMeritEl = document.getElementById("sp-bill-today-merit");
  const todayMeritSubEl = document.getElementById("sp-bill-today-merit-sub");
  const totalMeritEl = document.getElementById("sp-bill-total-merit");
  const totalMeritSubEl = document.getElementById("sp-bill-total-merit-sub");

  if (todayGbEl) {
    const tGb = Number(bill.todayGb) || 0;
    todayGbEl.textContent = tGb >= 0.01 ? `${tGb.toFixed(3)} GB` : formatProxyBytes(bill.todayBytes || 0);
  }
  if (todayGbSubEl) {
    todayGbSubEl.textContent = `รวมสะสม ${formatProxyBytes(bill.totalProxyBytes || 0)} (${(Number(bill.totalGb) || 0).toFixed(3)} GB)`;
  }
  if (todayScreensEl) {
    todayScreensEl.textContent = `${Number(bill.todayActiveScreensCount) || 0} จอ`;
  }
  if (todayScreensSubEl) {
    const rSd = Number(bill.ratePerScreenDay) || 0;
    todayScreensSubEl.textContent = rSd > 0 ? `เหมา +${rSd} บุญ/จอ/วัน` : `คิดตาม GB จริงล้วน`;
  }
  if (todayMeritEl) {
    todayMeritEl.textContent = `${(Number(bill.todayMeritPoints) || 0).toFixed(2)} บุญ`;
  }
  if (todayMeritSubEl) {
    const rGb = Number(bill.ratePerGb != null ? bill.ratePerGb : 0.3);
    todayMeritSubEl.textContent = `เรท ${rGb.toFixed(2)} บุญ/GB`;
  }
  if (totalMeritEl) {
    totalMeritEl.textContent = `${(Number(bill.totalMeritPoints) || 0).toFixed(2)} บุญ`;
  }
  if (totalMeritSubEl) {
    const syncedPts = (Number(bill.syncedChargedUnits) || 0) / 10000;
    const pendingPts = (Number(bill.pendingUnits) || 0) / 10000;
    totalMeritSubEl.textContent = pendingPts > 0
      ? `ตัดแล้ว ${syncedPts.toFixed(2)} บุญ (รอตัด ${pendingPts.toFixed(2)})`
      : `ตัดเข้าระบบแล้ว ${syncedPts.toFixed(2)} บุญ`;
  }

  const leasesListEl = document.getElementById("sp-leases-list");
  if (leasesListEl) {
    const leases = Array.isArray(statusData.leases) ? statusData.leases : [];
    if (leases.length === 0) {
      leasesListEl.innerHTML = `<div style="text-align: center; color: #64748b; padding: 14px;">ยังไม่มีจอที่จับคู่ IP ในขณะนี้ (เมื่อเปิดใช้งานและเปิดจอเกม ระบบจะจับคู่ให้อัตโนมัติ)</div>`;
    } else {
      const profById = new Map(currentProfiles.map(p => [p.id, p]));
      const billByProf = bill.byProfile || {};
      leasesListEl.innerHTML = leases.map(l => {
        const prof = profById.get(l.profileId);
        const pName = prof ? prof.name : l.profileId;
        const isOnline = prof ? !!prof.isRunning : false;
        const pTraffic = (tr.byProfile && tr.byProfile[l.profileId]) ? tr.byProfile[l.profileId].proxyTotalBytes : 0;
        const pBill = billByProf[l.profileId];
        const pMerit = pBill ? Number(pBill.meritPoints) || 0 : 0;
        return `
          <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(2, 6, 23, 0.55); border: 1px solid rgba(255,255,255,0.06); border-radius: 6px; padding: 6px 10px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${isOnline ? '#34d399' : '#64748b'}; display: inline-block;"></span>
              <strong style="color: #f8fafc;">${escapeHTML(pName)}</strong>
              <span style="color: #64748b; font-size: 10.5px;">(${escapeHTML(l.profileId)})</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap; justify-content: flex-end;">
              <span style="font-family: 'JetBrains Mono', Consolas, monospace; color: #38bdf8; font-weight: 600;">${escapeHTML(l.proxyHost)}:${escapeHTML(String(l.proxyPort || ''))}</span>
              <span style="background: rgba(168, 85, 247, 0.2); color: #e9d5ff; border: 1px solid rgba(168, 85, 247, 0.4); border-radius: 99px; padding: 1px 8px; font-size: 10.5px; font-weight: 700;">
                ช่อง ${l.slotIndex || 1}/${l.maxScreensPerIp || maxS}
              </span>
              ${pTraffic > 0 ? `<span style="color: #7dd3fc; font-size: 10px; font-family: monospace;" title="เน็ตที่วิ่งผ่าน Proxy ของจอนี้">${formatProxyBytes(pTraffic)}</span>` : ''}
              ${pMerit > 0 ? `<span style="color: #fbbf24; font-size: 10px; font-weight: 700;" title="ส่วนบุญสะสมของจอนี้">+${pMerit.toFixed(3)} บุญ</span>` : ''}
              ${l.tunnelPort ? `<span style="color: #10b981; font-size: 10px;" title="Local Forwarder Port">127.0.0.1:${l.tunnelPort}</span>` : ''}
              <button type="button" onclick="blockScreenProxyIpManual('${escapeHTML(l.proxyId || '')}', '${escapeHTML(l.proxyHost || '')}', ${Number(l.proxyPort) || 0})" style="background: rgba(239, 68, 68, 0.16); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.35); border-radius: 5px; padding: 1px 6px; font-size: 10px; cursor: pointer;" title="บล็อค IP นี้และสลับจอไปใช้ IP ใหม่ทันที">🚫 บล็อค IP</button>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // --- Blocked / Banned Proxy IP Blacklist ---
  const blockedList = Array.isArray(statusData.blockedProxies) ? statusData.blockedProxies : [];
  const blockedBadgeEl = document.getElementById("sp-blocked-count-badge");
  if (blockedBadgeEl) {
    blockedBadgeEl.textContent = `${blockedList.length} IP`;
  }
  const blockedListEl = document.getElementById("sp-blocked-ips-list");
  if (blockedListEl) {
    if (blockedList.length === 0) {
      blockedListEl.innerHTML = `<div style="text-align: center; color: #64748b; padding: 10px;">ยังไม่มี IP ที่ถูกบล็อค (เมื่อตรวจพบบัญชีขึ้นข้อความสีแดง "บัญชีถูกระงับ..." จะบล็อค IP ให้อัตโนมัติ — กรณีติดคุกจะไม่บล็อค IP)</div>`;
    } else {
      blockedListEl.innerHTML = blockedList.map(b => {
        const hostPort = b.host ? `${b.host}${b.port ? ':' + b.port : ''}` : b.key;
        const reasonStr = b.banMessage || b.reason || "บัญชีถูกระงับการใช้งาน";
        const charInfo = b.charName ? `ตัวละคร ${b.charName}` : (b.profileName || b.profileId || "");
        const timeStr = b.blockedAt ? new Date(b.blockedAt).toLocaleString("th-TH", { hour12: false }) : "";
        return `
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; background: rgba(69, 10, 10, 0.35); border: 1px solid rgba(239, 68, 68, 0.32); border-radius: 6px; padding: 6px 10px;">
            <div style="min-width: 0; flex: 1;">
              <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <span style="font-family: 'JetBrains Mono', Consolas, monospace; color: #fca5a5; font-weight: 700; font-size: 11.5px;">🚫 ${escapeHTML(hostPort)}</span>
                ${charInfo ? `<span style="background: rgba(239, 68, 68, 0.22); color: #fecaca; border-radius: 4px; padding: 1px 6px; font-size: 10px;">${escapeHTML(charInfo)}</span>` : ''}
                ${timeStr ? `<span style="color: #94a3b8; font-size: 10px;">${escapeHTML(timeStr)}</span>` : ''}
              </div>
              <div style="color: #f87171; font-size: 10.5px; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHTML(reasonStr)}">
                ${escapeHTML(reasonStr)}
              </div>
            </div>
            <button type="button" onclick="unblockScreenProxyIp('${escapeHTML(b.key || hostPort)}')" style="background: rgba(15, 23, 42, 0.8); color: #cbd5e1; border: 1px solid rgba(148, 163, 184, 0.35); border-radius: 5px; padding: 3px 8px; font-size: 10.5px; cursor: pointer; flex-shrink: 0;">🔓 ปลดบล็อค</button>
          </div>
        `;
      }).join('');
    }
  }
}

async function fetchScreenProxyStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/screen-proxy/status`).then(r => r.json());
    if (res && res.success) {
      renderScreenProxyModal(res);
    }
  } catch (_) {}
}

function openScreenProxyModal() {
  const modal = document.getElementById("modal-screen-proxy-settings");
  if (!modal) return;
  modal.style.display = "flex";
  fetchScreenProxyStatus();
}
window.openScreenProxyModal = openScreenProxyModal;

function closeScreenProxyModal() {
  const modal = document.getElementById("modal-screen-proxy-settings");
  if (modal) modal.style.display = "none";
}
window.closeScreenProxyModal = closeScreenProxyModal;

async function saveScreenProxySettings(showToastFeedback = true) {
  const modeOwner = document.getElementById("sp-mode-owner");
  const mode = (modeOwner && modeOwner.checked) ? "owner-queue" : "local-pool";
  const maxScreensPerIp = Math.max(1, Math.min(20, Number(document.getElementById("sp-max-screens")?.value) || 6));
  const onlyGameTraffic = document.getElementById("sp-only-game-traffic")?.checked !== false;
  const localAssetCache = document.getElementById("sp-local-asset-cache")?.checked !== false;
  const poolText = document.getElementById("sp-pool-textarea")?.value || "";

  const btnSave = document.getElementById("btn-sp-save-pool");
  if (btnSave) btnSave.disabled = true;
  try {
    const res = await fetch(`${API_BASE}/api/screen-proxy/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, maxScreensPerIp, onlyGameTraffic, localAssetCache, poolText })
    }).then(r => r.json());
    if (res && res.success) {
      renderScreenProxyModal(res);
      if (Array.isArray(res.deviceGroups) && typeof window.updateDeviceManagerFromProfiles === "function") {
        window.updateDeviceManagerFromProfiles(currentProfiles, res.deviceGroups, maxScreensPerIp, {
          customIpConfig: res.customIpConfig,
          customGroupLeases: res.customGroupLeases,
          ipSurchargeConfig: res.surchargeConfig || (res.settings && res.settings.surchargeConfig)
        });
      }
      fetchProfiles();
      if (showToastFeedback) {
        const pCount = res.settings?.poolCount || 0;
        const subSizes = computeDeviceSubSizesForIp(maxScreensPerIp);
        const splitDesc = `${subSizes.length} กลุ่ม · ${subSizes.length} Device (${subSizes.join("+")} จอ)`;
        showToast(`💾 บันทึกสำเร็จ: 1 IP ต่อ ${maxScreensPerIp} จอ [แบ่ง ${splitDesc}] · รองรับสูงสุด ${pCount * maxScreensPerIp} จอ`, "success");
      }
      return res;
    } else {
      if (showToastFeedback) showToast("❌ บันทึกไม่สำเร็จ: " + (res?.error || "Unknown"), "error");
      return null;
    }
  } catch (e) {
    if (showToastFeedback) showToast("❌ เกิดข้อผิดพลาด: " + e.message, "error");
    return null;
  } finally {
    if (btnSave) btnSave.disabled = false;
  }
}

function initScreenProxyControls() {
  const btnToolbar = document.getElementById("btn-toggle-screen-proxy");
  if (btnToolbar) {
    btnToolbar.onclick = () => openScreenProxyModal();
  }

  const btnClose = document.getElementById("btn-screen-proxy-close");
  if (btnClose) btnClose.onclick = closeScreenProxyModal;
  const btnCancel = document.getElementById("btn-screen-proxy-cancel");
  if (btnCancel) btnCancel.onclick = closeScreenProxyModal;

  const modal = document.getElementById("modal-screen-proxy-settings");
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeScreenProxyModal();
    });
  }

  const btnSave = document.getElementById("btn-sp-save-pool");
  if (btnSave) {
    btnSave.onclick = () => saveScreenProxySettings(true);
  }

  const maxScreensInput = document.getElementById("sp-max-screens");
  if (maxScreensInput) {
    maxScreensInput.addEventListener("input", () => {
      const v = Math.max(1, Math.min(20, Number(maxScreensInput.value) || 6));
      updateScreenProxyDynamicRatioLabels(v);
    });
    maxScreensInput.addEventListener("change", () => {
      const v = Math.max(1, Math.min(20, Number(maxScreensInput.value) || 6));
      maxScreensInput.value = String(v);
      updateScreenProxyDynamicRatioLabels(v);
      saveScreenProxySettings(true);
    });
  }

  document.querySelectorAll(".btn-sp-max-preset").forEach(btn => {
    btn.addEventListener("click", () => {
      const v = Math.max(1, Math.min(20, Number(btn.getAttribute("data-max")) || 6));
      if (maxScreensInput) maxScreensInput.value = String(v);
      updateScreenProxyDynamicRatioLabels(v);
      saveScreenProxySettings(true);
    });
  });

  const btnOpenDeviceDrawer = document.getElementById("btn-sp-open-device-drawer");
  if (btnOpenDeviceDrawer) {
    btnOpenDeviceDrawer.addEventListener("click", () => {
      closeScreenProxyModal();
      if (typeof window.openDeviceDrawerTab === "function") {
        window.openDeviceDrawerTab("auto");
      } else if (typeof window.toggleDeviceDrawer === "function") {
        window.toggleDeviceDrawer(true);
      }
    });
  }

  const btnOpenCustomIpDrawer = document.getElementById("btn-sp-open-custom-ip-drawer");
  if (btnOpenCustomIpDrawer) {
    btnOpenCustomIpDrawer.addEventListener("click", () => {
      closeScreenProxyModal();
      if (typeof window.openDeviceDrawerTab === "function") {
        window.openDeviceDrawerTab("custom");
      } else if (typeof window.toggleDeviceDrawer === "function") {
        window.toggleDeviceDrawer(true);
      }
    });
  }

  const localCacheChk = document.getElementById("sp-local-asset-cache");
  if (localCacheChk) {
    localCacheChk.onchange = async () => {
      const enabled = localCacheChk.checked;
      const res = await saveScreenProxySettings(false);
      if (res && res.success) {
        showToast(
          enabled
            ? "📦 เปิด Local Asset Cache แล้ว — โหลด .png/.webp/.mp3/.woff2 จากเครื่องโดยไม่เปลืองเน็ต Proxy"
            : "⏸️ ปิด Local Asset Cache แล้ว",
          enabled ? "success" : "info"
        );
      }
    };
  }

  const btnResetTraffic = document.getElementById("btn-sp-reset-traffic");
  if (btnResetTraffic) {
    btnResetTraffic.onclick = async () => {
      btnResetTraffic.disabled = true;
      try {
        const res = await fetch(`${API_BASE}/api/screen-proxy/reset-traffic`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}"
        }).then(r => r.json());
        if (res && res.success) {
          renderScreenProxyModal(res);
          fetchProfiles();
          showToast("🔄 รีเซ็ตตัวนับเน็ต Proxy และตัวนับเน็ตวันนี้เรียบร้อยแล้ว", "success");
        }
      } catch (e) {
        showToast("❌ รีเซ็ตไม่สำเร็จ: " + e.message, "error");
      } finally {
        btnResetTraffic.disabled = false;
      }
    };
  }

  const btnToggleMain = document.getElementById("btn-screen-proxy-toggle-main");
  if (btnToggleMain) {
    btnToggleMain.onclick = async () => {
      btnToggleMain.disabled = true;
      try {
        // Save any unsaved IP pool edits first before toggling
        await saveScreenProxySettings(false);
        const nextEnabled = !currentScreenProxySettings.enabled;
        const res = await fetch(`${API_BASE}/api/screen-proxy/toggle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled: nextEnabled, applyToOpenWindows: true })
        }).then(r => r.json());
        if (res && res.success) {
          await fetchScreenProxyStatus();
          fetchProfiles();
          showToast(
            res.enabled
              ? `🛡️ เปิดใช้งานระบบแยก IP รายจอ (1 IP ต่อ ${res.settings?.maxScreensPerIp || 3} จอ) แล้ว`
              : "⏸️ ปิดระบบแยก IP รายจอแล้ว (สลับกลับไปใช้เน็ตปกติ)",
            res.enabled ? "success" : "info"
          );
        } else {
          showToast("❌ เปลี่ยนสถานะไม่สำเร็จ: " + (res?.error || "Unknown"), "error");
        }
      } catch (e) {
        showToast("❌ เกิดข้อผิดพลาด: " + e.message, "error");
      } finally {
        btnToggleMain.disabled = false;
      }
    };
  }

  const btnApplyOpen = document.getElementById("btn-sp-apply-open");
  if (btnApplyOpen) {
    btnApplyOpen.onclick = async () => {
      btnApplyOpen.disabled = true;
      try {
        await saveScreenProxySettings(false);
        const res = await fetch(`${API_BASE}/api/screen-proxy/apply-open`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}"
        }).then(r => r.json());
        if (res && res.success) {
          await fetchScreenProxyStatus();
          fetchProfiles();
          const count = Array.isArray(res.switched) ? res.switched.filter(x => x.ok).length : 0;
          showToast(`🔄 จัดคิวและสลับ IP ให้จอที่เปิดอยู่สำเร็จ (${count} จอ)`, "success");
        } else {
          showToast("❌ สลับ IP ไม่สำเร็จ: " + (res?.error || "Unknown"), "error");
        }
      } catch (e) {
        showToast("❌ เกิดข้อผิดพลาด: " + e.message, "error");
      } finally {
        btnApplyOpen.disabled = false;
      }
    };
  }

  const btnTest = document.getElementById("btn-sp-test-conn");
  const statusMsg = document.getElementById("sp-test-status-msg");
  if (btnTest) {
    btnTest.onclick = async () => {
      btnTest.disabled = true;
      if (statusMsg) {
        statusMsg.textContent = "⏳ กำลังบันทึกและทดสอบการเชื่อมต่อผ่าน Proxy IP...";
        statusMsg.style.color = "#38bdf8";
      }
      try {
        await saveScreenProxySettings(false);
        const res = await fetch(`${API_BASE}/api/screen-proxy/test`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}"
        }).then(r => r.json());
        if (res && res.success) {
          if (statusMsg) {
            statusMsg.textContent = `✅ เชื่อมต่อสำเร็จ! Egress IP: ${res.ip} (ผ่าน Proxy ${res.proxyHost}:${res.proxyPort})`;
            statusMsg.style.color = "#34d399";
          }
          showToast(`✅ ทดสอบแยก IP สำเร็จ! Egress IP: ${res.ip}`, "success");
        } else {
          if (statusMsg) {
            statusMsg.textContent = `❌ ทดสอบไม่สำเร็จ: ${res?.error || "ยังไม่ได้ใส่รายการ IP หรือ Proxy ตอบกลับผิดพลาด"}`;
            statusMsg.style.color = "#f87171";
          }
          showToast(`❌ ทดสอบไม่สำเร็จ: ${res?.error || "Unknown"}`, "error");
        }
      } catch (e) {
        if (statusMsg) {
          statusMsg.textContent = `❌ เกิดข้อผิดพลาด: ${e.message}`;
          statusMsg.style.color = "#f87171";
        }
      } finally {
        btnTest.disabled = false;
      }
    };
  }

  // --- Proxy Merit Billing Config Controls ---
  async function saveScreenProxyBillingConfig(showToastFeedback = true) {
    const enabled = document.getElementById("sp-bill-enabled")?.checked !== false;
    const packageGb = Math.max(1, Number(document.getElementById("sp-bill-pkg-gb")?.value) || 5000);
    const packageMerit = Math.max(0, Number(document.getElementById("sp-bill-pkg-merit")?.value) || 1500);
    const ratePerScreenDay = Math.max(0, Number(document.getElementById("sp-bill-rate-screen-day")?.value) || 0);
    const ratePerGb = Number((packageMerit / packageGb).toFixed(6));

    const rateLabel = document.getElementById("sp-bill-rate-per-gb");
    if (rateLabel) rateLabel.textContent = `${ratePerGb.toFixed(4)} บุญ/GB`;

    const btnSaveBill = document.getElementById("btn-sp-save-billing");
    if (btnSaveBill) btnSaveBill.disabled = true;
    try {
      const res = await fetch(`${API_BASE}/api/screen-proxy/billing-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, packageGb, packageMerit, ratePerGb, ratePerScreenDay })
      }).then(r => r.json());
      if (res && res.success) {
        renderScreenProxyModal(res);
        if (showToastFeedback) {
          showToast(
            `💰 บันทึกเรทส่วนบุญ Proxy แล้ว: ${packageGb} GB = ${packageMerit} ส่วนบุญ (${ratePerGb.toFixed(3)} บุญ/GB${ratePerScreenDay > 0 ? ` + ${ratePerScreenDay} บุญ/จอ/วัน` : ""})`,
            "success"
          );
        }
      } else if (showToastFeedback) {
        showToast("❌ บันทึกเรทส่วนบุญไม่สำเร็จ: " + (res?.error || "Unknown"), "error");
      }
    } catch (e) {
      if (showToastFeedback) showToast("❌ เกิดข้อผิดพลาด: " + e.message, "error");
    } finally {
      if (btnSaveBill) btnSaveBill.disabled = false;
    }
  }

  const btnSaveBilling = document.getElementById("btn-sp-save-billing");
  if (btnSaveBilling) {
    btnSaveBilling.onclick = () => saveScreenProxyBillingConfig(true);
  }
  const billEnabledInput = document.getElementById("sp-bill-enabled");
  if (billEnabledInput) {
    billEnabledInput.onchange = () => saveScreenProxyBillingConfig(true);
  }
  ["sp-bill-pkg-gb", "sp-bill-pkg-merit", "sp-bill-rate-screen-day"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", () => {
      const g = Math.max(1, Number(document.getElementById("sp-bill-pkg-gb")?.value) || 5000);
      const m = Math.max(0, Number(document.getElementById("sp-bill-pkg-merit")?.value) || 1500);
      const rEl = document.getElementById("sp-bill-rate-per-gb");
      if (rEl) rEl.textContent = `${(m / g).toFixed(4)} บุญ/GB`;
    });
    el.addEventListener("change", () => saveScreenProxyBillingConfig(true));
  });

  // --- Blocked Proxy IP Controls ---
  const btnPruneBlocked = document.getElementById("btn-sp-prune-blocked");
  if (btnPruneBlocked) {
    btnPruneBlocked.onclick = async () => {
      btnPruneBlocked.disabled = true;
      try {
        const res = await fetch(`${API_BASE}/api/screen-proxy/prune-blocked`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}"
        }).then(r => r.json());
        if (res && res.success) {
          renderScreenProxyModal(res);
          showToast(
            res.removed > 0
              ? `🧹 ลบ IP ที่โดนบล็อคออกจากรายการคิวแล้ว ${res.removed} IP (เหลือ ${res.remaining} IP)`
              : "ℹ️ ไม่มี IP ที่โดนบล็อคค้างอยู่ในรายการคิว",
            res.removed > 0 ? "success" : "info"
          );
        }
      } catch (e) {
        showToast("❌ ลบ IP ไม่สำเร็จ: " + e.message, "error");
      } finally {
        btnPruneBlocked.disabled = false;
      }
    };
  }

  const btnClearAllBlocked = document.getElementById("btn-sp-clear-all-blocked");
  if (btnClearAllBlocked) {
    btnClearAllBlocked.onclick = async () => {
      btnClearAllBlocked.disabled = true;
      try {
        const res = await fetch(`${API_BASE}/api/screen-proxy/unblock`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ all: true })
        }).then(r => r.json());
        if (res && res.success) {
          renderScreenProxyModal(res);
          showToast(`🔓 ปลดบล็อค IP ทั้งหมดแล้ว (${res.cleared || 0} IP)`, "info");
        }
      } catch (e) {
        showToast("❌ ปลดบล็อคไม่สำเร็จ: " + e.message, "error");
      } finally {
        btnClearAllBlocked.disabled = false;
      }
    };
  }

  fetchScreenProxyStatus();
}

window.blockScreenProxyIpManual = async function(proxyId, host, port) {
  try {
    const res = await fetch(`${API_BASE}/api/screen-proxy/block`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        proxyId,
        host,
        port,
        reason: "สั่งบล็อค IP ด้วยตัวเองจากหน้าจัดการ Proxy"
      })
    }).then(r => r.json());
    if (res && res.success) {
      renderScreenProxyModal(res);
      fetchProfiles();
      showToast(`🚫 บล็อค IP ${host}${port ? ':' + port : ''} และสลับจอไปใช้ IP ใหม่เรียบร้อย`, "warning");
    } else {
      showToast("❌ บล็อค IP ไม่สำเร็จ: " + (res?.error || "Unknown"), "error");
    }
  } catch (e) {
    showToast("❌ เกิดข้อผิดพลาด: " + e.message, "error");
  }
};

window.unblockScreenProxyIp = async function(key) {
  try {
    const res = await fetch(`${API_BASE}/api/screen-proxy/unblock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key })
    }).then(r => r.json());
    if (res && res.success) {
      renderScreenProxyModal(res);
      showToast(`🔓 ปลดบล็อค IP ${key} เรียบร้อยแล้ว`, "success");
    } else {
      showToast("❌ ปลดบล็อคไม่สำเร็จ: " + (res?.error || "Unknown"), "error");
    }
  } catch (e) {
    showToast("❌ เกิดข้อผิดพลาด: " + e.message, "error");
  }
};

window.clearProfileBan = async function(profileId, event) {
  if (event && typeof event.stopPropagation === "function") event.stopPropagation();
  try {
    const res = await fetch(`${API_BASE}/api/profiles/${encodeURIComponent(profileId)}/clear-ban`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}"
    }).then(r => r.json());
    if (res && res.success) {
      fetchProfiles();
      showToast(`✅ ล้างสถานะระงับของจอ ${profileId} เรียบร้อยแล้ว`, "success");
    } else {
      showToast("❌ ล้างสถานะไม่สำเร็จ: " + (res?.error || "Unknown"), "error");
    }
  } catch (e) {
    showToast("❌ เกิดข้อผิดพลาด: " + e.message, "error");
  }
};

// ==========================================
// AUTO CAPTCHA POINT TOP-UP MODAL CONTROLLER
// ==========================================
let lastKnownPointsPerSolve = 1;
let lastKnownMachineMerit = null;

function formatMeritAmount(v) {
  const n = Number(v || 0);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function buildMachineMeritBreakdownHtml(effMerit) {
  const list = effMerit && Array.isArray(effMerit.machines) ? effMerit.machines : [];
  if (list.length === 0) return "";
  const negCount = Number(effMerit.negativeMachineCount != null ? effMerit.negativeMachineCount : list.filter(m => Number(m.debtUnits || 0) < 0).length);
  const unassignedUnits = Number(effMerit.unassignedDebtUnits || 0);
  const rowsHtml = list.map(m => {
    const isDebt = Number(m.debtUnits || 0) < 0;
    const isCur = Boolean(m.isCurrentMachine);
    const name = escapeHTML(m.deviceName || m.hostname || m.hwidCode || m.machineKey || "-");
    const hwid = escapeHTML(m.hwidCode || m.machineKey || "-");
    const todayUsed = formatMeritAmount(m.todayUsedMerit != null ? m.todayUsedMerit : Number(m.todayUsedUnits || 0) / 100);
    const totalUsed = formatMeritAmount(m.totalUsedMerit != null ? m.totalUsedMerit : Number(m.totalUsedUnits || 0) / 100);
    const debtText = isDebt
      ? `ติดลบ ${formatMeritAmount(m.debtMerit != null ? m.debtMerit : Number(m.debtUnits || 0) / 100)} ส่วนบุญ`
      : "ไม่ติดลบ (0 บุญ)";
    return `<div class="machine-merit-row ${isCur ? "is-current" : ""} ${isDebt ? "is-debt" : ""}">
      <div class="machine-merit-left">
        <div class="machine-merit-name">
          <span>💻 ${name}</span>
          ${isCur ? '<span class="machine-merit-current-tag">📍 เครื่องนี้</span>' : ""}
          <span class="machine-merit-hwid">${hwid}</span>
        </div>
        <div class="machine-merit-usage">วันนี้ใช้ ${todayUsed} บุญ • สะสม ${totalUsed} บุญ</div>
      </div>
      <span class="machine-merit-debt-pill ${isDebt ? "is-debt" : "is-clean"}">${debtText}</span>
    </div>`;
  }).join("");

  const unassignedRow = unassignedUnits < 0
    ? `<div class="machine-merit-row is-debt">
        <div class="machine-merit-left">
          <div class="machine-merit-name"><span>⏳ ยอดค้างเก่าก่อนผูกเครื่อง</span></div>
          <div class="machine-merit-usage">บันทึกประวัติเดิมก่อนแยกรหัสเครื่อง</div>
        </div>
        <span class="machine-merit-debt-pill is-debt">ติดลบ ${formatMeritAmount(effMerit.unassignedDebtMerit != null ? effMerit.unassignedDebtMerit : unassignedUnits / 100)} ส่วนบุญ</span>
      </div>`
    : "";

  const summaryTag = negCount > 0 ? `ติดลบ ${negCount} เครื่อง` : "ไม่ติดลบทุกเครื่อง";
  return `<div class="machine-merit-breakdown-head">
      <span>📊 ยอดส่วนบุญแยกตามเครื่อง (${list.length} เครื่อง)</span>
      <span class="machine-merit-breakdown-sub">${summaryTag}</span>
    </div>
    <div class="machine-merit-list">${rowsHtml}${unassignedRow}</div>`;
}

function updatePointDisplays(points, pointsPerSolve, serviceAvailable, machineMerit) {
  if (pointsPerSolve != null) lastKnownPointsPerSolve = pointsPerSolve;
  if (machineMerit !== undefined) lastKnownMachineMerit = machineMerit || null;
  const effMerit = machineMerit !== undefined ? (machineMerit || null) : lastKnownMachineMerit;
  const p = points != null ? Number(points) : 0;
  const topupBtn = document.getElementById("btn-topup-captcha");
  const topupBadge = document.getElementById("topup-point-badge");
  const machineDebtBadge = document.getElementById("topup-machine-debt-badge");
  const topupPointsVal = document.getElementById("topup-modal-points");
  const topupThisMachinePill = document.getElementById("topup-modal-this-machine-pill");
  const topupBreakdownBox = document.getElementById("topup-machine-breakdown-box");
  const authBreakdownBox = document.getElementById("auth-modal-machine-breakdown");
  const hcPoints = document.getElementById("hc-points-val");
  const topupStatusBadge = document.getElementById("topup-modal-status-badge");
  const topupRate = document.getElementById("topup-modal-rate");

  const machinesList = effMerit && Array.isArray(effMerit.machines) ? effMerit.machines : [];
  const curMachine = effMerit && effMerit.currentMachine ? effMerit.currentMachine : null;
  const multiMachine = machinesList.length > 1;

  if (topupBadge) {
    const pText = p.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    if (lastKnownPointsPerSolve === 0) {
      topupBadge.innerText = multiMachine ? `รวม ${pText}` : (p < 0 ? `ส่วนบุญ ${pText}` : `ส่วนบุญคงเหลือ ${pText}`);
      topupBadge.style.background = "rgba(16, 185, 129, 0.25)";
      topupBadge.style.color = "#a7f3d0";
      topupBadge.style.borderColor = "rgba(16, 185, 129, 0.4)";
    } else {
      topupBadge.innerText = multiMachine ? `รวม ${pText}` : (p < 0 ? `ส่วนบุญ ${pText}` : `ส่วนบุญคงเหลือ ${pText}`);
      topupBadge.style.background = "rgba(250, 204, 21, 0.25)";
      topupBadge.style.color = "#fef08a";
      topupBadge.style.borderColor = "rgba(250, 204, 21, 0.4)";
    }
  }

  if (machineDebtBadge) {
    if (curMachine && Number(curMachine.debtUnits || 0) < 0) {
      const debtMerit = curMachine.debtMerit != null ? curMachine.debtMerit : Number(curMachine.debtUnits || 0) / 100;
      machineDebtBadge.style.display = "inline-block";
      machineDebtBadge.innerText = `เครื่องนี้ ${formatMeritAmount(debtMerit)}`;
      machineDebtBadge.style.background = "rgba(244, 63, 94, 0.24)";
      machineDebtBadge.style.color = "#fda4af";
      machineDebtBadge.style.borderColor = "rgba(244, 63, 94, 0.55)";
    } else if (curMachine && (multiMachine || p < 0)) {
      machineDebtBadge.style.display = "inline-block";
      machineDebtBadge.innerText = "เครื่องนี้ ไม่ติดลบ";
      machineDebtBadge.style.background = "rgba(16, 185, 129, 0.22)";
      machineDebtBadge.style.color = "#6ee7b7";
      machineDebtBadge.style.borderColor = "rgba(52, 211, 153, 0.45)";
    } else {
      machineDebtBadge.style.display = "none";
    }
  }

  if (topupBtn) {
    if (machinesList.length > 0) {
      const lines = [
        `เติมส่วนบุญเข้าบัญชีบริการ PmheeAether`,
        `ยอดรวมบัญชี: ${p.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ส่วนบุญ`,
        ...machinesList.map(m => {
          const tag = m.isCurrentMachine ? " [เครื่องนี้]" : "";
          const dm = m.debtMerit != null ? m.debtMerit : Number(m.debtUnits || 0) / 100;
          const st = Number(m.debtUnits || 0) < 0 ? `ติดลบ ${formatMeritAmount(dm)}` : "ไม่ติดลบ (0)";
          return `• ${m.deviceName || m.hwidCode || m.machineKey}${tag}: ${st} ส่วนบุญ`;
        })
      ];
      topupBtn.title = lines.join("\n");
    } else {
      topupBtn.title = "เติมส่วนบุญเข้าบัญชีบริการ PmheeAether";
    }
  }

  if (topupThisMachinePill) {
    if (curMachine) {
      const curName = curMachine.deviceName || curMachine.hwidCode || curMachine.machineKey || "เครื่องนี้";
      const curToday = formatMeritAmount(curMachine.todayUsedMerit != null ? curMachine.todayUsedMerit : Number(curMachine.todayUsedUnits || 0) / 100);
      const isCurDebt = Number(curMachine.debtUnits || 0) < 0;
      const curDebtVal = formatMeritAmount(curMachine.debtMerit != null ? curMachine.debtMerit : Number(curMachine.debtUnits || 0) / 100);
      topupThisMachinePill.style.display = "inline-flex";
      topupThisMachinePill.className = `topup-this-machine-pill ${isCurDebt ? "is-debt" : "is-clean"}`;
      topupThisMachinePill.textContent = isCurDebt
        ? `🖥️ เครื่องนี้ (${curName}): ติดลบ ${curDebtVal} ส่วนบุญ • วันนี้ใช้ ${curToday} บุญ`
        : `🖥️ เครื่องนี้ (${curName}): ไม่ติดลบ (0 บุญ) • วันนี้ใช้ ${curToday} บุญ`;
    } else {
      topupThisMachinePill.style.display = "none";
    }
  }

  const breakdownHtml = buildMachineMeritBreakdownHtml(effMerit);
  if (topupBreakdownBox) {
    if (breakdownHtml) {
      topupBreakdownBox.innerHTML = breakdownHtml;
      topupBreakdownBox.style.display = "block";
    } else {
      topupBreakdownBox.innerHTML = "";
      topupBreakdownBox.style.display = "none";
    }
  }
  if (authBreakdownBox) {
    if (breakdownHtml) {
      authBreakdownBox.innerHTML = breakdownHtml;
      authBreakdownBox.style.display = "block";
    } else {
      authBreakdownBox.innerHTML = "";
      authBreakdownBox.style.display = "none";
    }
  }

  if (topupPointsVal) topupPointsVal.innerText = p.toLocaleString();
  if (hcPoints) hcPoints.innerText = p;
  if (topupStatusBadge) {
    if (serviceAvailable === false) {
      topupStatusBadge.innerText = "● ติดต่อเซิร์ฟเวอร์ไม่ได้";
      topupStatusBadge.style.color = "#f87171";
    } else if (lastKnownPointsPerSolve === 0 || p > 0) {
      topupStatusBadge.style.background = "rgba(16, 185, 129, 0.2)";
      topupStatusBadge.style.color = "#34d399";
      topupStatusBadge.style.borderColor = "rgba(16, 185, 129, 0.4)";
      topupStatusBadge.innerText = lastKnownPointsPerSolve === 0 ? "● Humancheck ไม่มีค่าต่อคำตอบ" : "● พร้อมใช้งาน";
    } else {
      topupStatusBadge.style.background = "rgba(239, 68, 68, 0.2)";
      topupStatusBadge.style.color = "#f87171";
      topupStatusBadge.style.borderColor = "rgba(239, 68, 68, 0.4)";
      topupStatusBadge.innerText = "● ส่วนบุญหมด";
    }
  }
  if (topupRate) {
    topupRate.innerText = lastKnownPointsPerSolve === 0
      ? "Humancheck ไม่มีค่าต่อคำตอบ — ส่วนบุญ สำหรับสคริปต์ดูหน้าใบสรุป"
      : 'Humancheck ไม่มีค่าต่อคำตอบ — ดูยอดส่วนบุญสำหรับสคริปต์ในหน้าใบสรุป';
  }
}
window.updatePointDisplays = updatePointDisplays;

function initTopupCaptchaModal() {
  const btnTopup = document.getElementById("btn-topup-captcha");
  const modal = document.getElementById("modal-topup-captcha");
  const btnClose = document.getElementById("btn-topup-close");
  const btnCancel = document.getElementById("btn-topup-cancel");
  const voucherInput = document.getElementById("topup-voucher-input");
  const btnVoucher = document.getElementById("btn-topup-voucher");
  const voucherMsg = document.getElementById("topup-voucher-msg");
  const hwidShort = document.getElementById("topup-hwid-short");
  const btnCopyHwid = document.getElementById("btn-copy-hwid");
  const receiverPhoneEl = document.getElementById("topup-receiver-phone");
  const historyContainer = document.getElementById("topup-history-container");
  const historyCountEl = document.getElementById("topup-history-count");
  const btnGotoSettings = document.getElementById("btn-topup-goto-settings");

  let cachedFullHwid = "";

  const SHOWN_PAID_POPUPS_KEY = "pelican_shown_paid_topup_orders";
  const shownPaidPopupOrderIds = new Set();
  try {
    const saved = JSON.parse(sessionStorage.getItem(SHOWN_PAID_POPUPS_KEY) || "[]");
    if (Array.isArray(saved)) saved.forEach(id => id && shownPaidPopupOrderIds.add(String(id)));
  } catch (_) {}

  function hasShownPaidPopup(orderId) {
    return Boolean(orderId) && shownPaidPopupOrderIds.has(String(orderId));
  }

  function markPaidPopupShown(orderId) {
    if (!orderId) return;
    shownPaidPopupOrderIds.add(String(orderId));
    try {
      sessionStorage.setItem(SHOWN_PAID_POPUPS_KEY, JSON.stringify(Array.from(shownPaidPopupOrderIds).slice(-30)));
    } catch (_) {}
  }

  function formatPopupNum(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return String(v ?? "0.00");
    return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function resolveTotalPointsForPopup(explicitTotal) {
    if (explicitTotal != null && Number.isFinite(Number(explicitTotal))) {
      return Number(explicitTotal);
    }
    const ptsText = document.getElementById("topup-points-val")?.innerText?.replace(/,/g, "").trim();
    if (ptsText && Number.isFinite(Number(ptsText))) {
      return Number(ptsText);
    }
    return null;
  }

  function showTopupSuccessPopup({ amountBaht, pointsAdded, totalPoints, channelLabel, orderId } = {}) {
    if (orderId && hasShownPaidPopup(orderId)) return;
    if (orderId) markPaidPopupShown(orderId);

    const existing = document.getElementById("pm-topup-success-popup");
    if (existing) existing.remove();

    const amtVal = Number(amountBaht ?? pointsAdded ?? 0);
    const ptsVal = Number(pointsAdded ?? amountBaht ?? 0);
    const resolvedTotal = resolveTotalPointsForPopup(totalPoints);

    const overlay = document.createElement("div");
    overlay.id = "pm-topup-success-popup";
    overlay.style.cssText = [
      "position:fixed", "inset:0", "z-index:10000050",
      "display:flex", "align-items:center", "justify-content:center",
      "padding:20px", "background:rgba(4, 10, 24, 0.78)",
      "backdrop-filter:blur(6px)", "animation:fadeIn 0.18s ease-out"
    ].join(";");

    const card = document.createElement("div");
    card.style.cssText = [
      "width:100%", "max-width:420px", "border-radius:16px",
      "background:linear-gradient(165deg, #0f1f3d 0%, #091326 100%)",
      "border:1.5px solid rgba(52, 211, 153, 0.55)",
      "box-shadow:0 24px 60px rgba(0, 0, 0, 0.65), 0 0 40px rgba(16, 185, 129, 0.2)",
      "padding:26px 24px 22px", "text-align:center", "color:#e2e8f0"
    ].join(";");

    const iconWrap = document.createElement("div");
    iconWrap.style.cssText = [
      "width:64px", "height:64px", "margin:0 auto 14px", "border-radius:50%",
      "display:flex", "align-items:center", "justify-content:center", "font-size:34px",
      "background:rgba(16, 185, 129, 0.16)", "border:2px solid rgba(52, 211, 153, 0.6)",
      "box-shadow:0 0 24px rgba(16, 185, 129, 0.35)"
    ].join(";");
    iconWrap.textContent = "✅";

    const titleEl = document.createElement("div");
    titleEl.style.cssText = "font-size:20px; font-weight:800; color:#34d399; margin-bottom:4px;";
    titleEl.textContent = "เติมส่วนบุญสำเร็จ!";

    const channelEl = document.createElement("div");
    channelEl.style.cssText = "font-size:12px; color:#94a3b8; margin-bottom:16px;";
    channelEl.textContent = channelLabel ? `ช่องทาง: ${channelLabel}` : "ได้รับยอดโอนเข้าบัญชีเรียบร้อยแล้ว";

    const amountBox = document.createElement("div");
    amountBox.style.cssText = [
      "padding:14px 16px", "border-radius:12px", "margin-bottom:14px",
      "background:rgba(16, 185, 129, 0.1)", "border:1px solid rgba(52, 211, 153, 0.3)"
    ].join(";");

    const amtLine = document.createElement("div");
    amtLine.style.cssText = "font-size:24px; font-weight:800; color:#facc15; letter-spacing:0.3px;";
    amtLine.textContent = `+${formatPopupNum(ptsVal)} ส่วนบุญ`;

    const bahtLine = document.createElement("div");
    bahtLine.style.cssText = "font-size:12px; color:#a7f3d0; margin-top:4px;";
    bahtLine.textContent = `ยอดเงินที่โอน ${formatPopupNum(amtVal)} บาท`;

    amountBox.append(amtLine, bahtLine);

    if (resolvedTotal != null) {
      const balLine = document.createElement("div");
      balLine.style.cssText = "font-size:13px; color:#cbd5e1; margin-bottom:18px;";
      const balLabel = document.createTextNode("ยอดส่วนบุญคงเหลือปัจจุบัน: ");
      const balStrong = document.createElement("strong");
      balStrong.style.color = "#34d399";
      balStrong.textContent = `${formatPopupNum(resolvedTotal)} ส่วนบุญ`;
      balLine.append(balLabel, balStrong);
      card.append(iconWrap, titleEl, channelEl, amountBox, balLine);
    } else {
      card.append(iconWrap, titleEl, channelEl, amountBox);
    }

    const okBtn = document.createElement("button");
    okBtn.id = "btn-pm-topup-success-ok";
    okBtn.type = "button";
    okBtn.textContent = "รับทราบ / ตกลง";
    okBtn.style.cssText = [
      "width:100%", "padding:11px 18px", "border-radius:10px", "border:none",
      "cursor:pointer", "font-size:14px", "font-weight:700", "color:#042f2e",
      "background:linear-gradient(135deg, #34d399 0%, #10b981 100%)",
      "box-shadow:0 6px 18px rgba(16, 185, 129, 0.35)"
    ].join(";");

    function closePopup() {
      document.removeEventListener("keydown", onKey);
      overlay.remove();
    }

    function onKey(ev) {
      if (ev.key === "Escape" || ev.key === "Enter") {
        ev.preventDefault();
        closePopup();
      }
    }

    okBtn.addEventListener("click", closePopup);
    overlay.addEventListener("click", (ev) => {
      if (ev.target === overlay) closePopup();
    });
    document.addEventListener("keydown", onKey);

    card.appendChild(okBtn);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    setTimeout(() => { try { okBtn.focus(); } catch (_) {} }, 0);
  }
  window.showTopupSuccessPopup = showTopupSuccessPopup;

  if (!btnTopup || !modal) return;

  function showVoucherMsg(text, isError = false) {
    if (!voucherMsg) return;
    voucherMsg.style.display = "block";
    voucherMsg.style.background = isError ? "rgba(239, 68, 68, 0.18)" : "rgba(16, 185, 129, 0.18)";
    voucherMsg.style.color = isError ? "#f87171" : "#34d399";
    voucherMsg.style.border = isError ? "1px solid rgba(239, 68, 68, 0.35)" : "1px solid rgba(16, 185, 129, 0.35)";
    voucherMsg.innerText = text;
    setTimeout(() => { if (voucherMsg) voucherMsg.style.display = "none"; }, 8000);
  }

  function renderHistory(history) {
    if (!historyContainer) return;
    const list = Array.isArray(history) ? history : [];
    if (historyCountEl) historyCountEl.innerText = `${list.length} รายการ`;
    if (list.length === 0) {
      historyContainer.innerHTML = '<div style="color: #64748b; text-align: center; padding: 12px 0;">ยังไม่มีประวัติการเติมเงิน</div>';
      return;
    }
    historyContainer.innerHTML = list.map(item => {
      let dateStr = "";
      try {
        const d = new Date(item.date);
        dateStr = d.toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit" }) + " " + d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
      } catch (e) {
        dateStr = item.date || "";
      }
      const points = (Number(item.pointsAdded) || 0).toLocaleString();
      const amount = item.amountBaht != null ? `${Number(item.amountBaht).toFixed(2)} ฿` : `${points} ส่วนบุญ`;
      return `<div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 4px; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
        <div>
          <span style="font-weight: 700; color: #34d399; font-size: 11.5px;">+${amount}</span>
          <span style="color: #facc15; font-size: 11px; margin-left: 4px;">(+${points} ส่วนบุญ)</span>
          <div style="color: #94a3b8; font-size: 10px; margin-top: 1px;">${escapeHTML(item.note || 'เติมเงิน')}</div>
        </div>
        <div style="font-size: 10px; color: #64748b; font-family: monospace;">${escapeHTML(dateStr)}</div>
      </div>`;
    }).join("");
  }

  async function refreshTopupData() {
    try {
      const res = await fetch(`${API_BASE}/api/human-check/settings`).then(r => r.json());
      if (res && res.success && res.settings) {
        const s = res.settings;
        updatePointDisplays(s.points, s.pointsPerSolve, s.serviceAvailable, s.machineMerit);

        // Show dev-only shortcuts ONLY if running in dev/git mode
        const isDev = !!res.isDev;
        document.querySelectorAll(".dev-only-feature").forEach(el => {
          el.style.display = isDev ? "" : "none";
        });

        if (s.machineHwidShort || s.machineHwid) {
          cachedFullHwid = s.machineHwidShort || s.machineHwid;
          if (hwidShort) {
            hwidShort.innerText = s.machineHwidShort || `${s.machineHwid.slice(0, 8)}...${s.machineHwid.slice(-6)}`;
            hwidShort.title = `HWID: ${s.machineHwidShort || s.machineHwid}`;
          }
        }
        const accountEl = document.getElementById("topup-service-account");
        if (accountEl) accountEl.innerText = s.accountId || "ยังไม่ได้เชื่อมต่อบริการ";
        renderHistory(s.topupHistory);
      }
    } catch (e) {}
  }

  async function executeRedeemVoucher() {
    if (!voucherInput) return;
    const url = (voucherInput.value || "").trim();
    if (!url) {
      return showVoucherMsg("กรุณาวางลิงก์ซองของขวัญ TrueMoney เช่น https://gift.truemoney.com/campaign/?v=...", true);
    }
    if (btnVoucher) {
      btnVoucher.disabled = true;
      btnVoucher.innerText = "⏳ กำลังแลกซอง...";
    }
    try {
      const res = await fetch(`${API_BASE}/api/human-check/topup-voucher`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voucherUrl: url })
      }).then(r => r.json());

      if (res && res.success) {
        voucherInput.value = "";
        showVoucherMsg(typeof res.message === 'string' && res.message ? res.message.replace(/\bpoints?\b/gi, 'ส่วนบุญ') : `🎉 แลกซองสำเร็จ! ได้รับ ${res.amount} บาท (+${res.pointsAdded} ส่วนบุญ)`);
        showToast(`🧧 เติมเงินสำเร็จ: +${res.amount} บ. (+${res.pointsAdded} ส่วนบุญ)`, "success");
        await refreshTopupData();
        showTopupSuccessPopup({
          amountBaht: res.amount,
          pointsAdded: res.pointsAdded,
          totalPoints: res.totalPoints ?? res.balance ?? null,
          channelLabel: "ซองอั่งเปา TrueMoney Wallet",
          orderId: res.receiptId ? `tm:${res.receiptId}` : ""
        });
      } else {
        showVoucherMsg("❌ " + (res.message || res.error || "แลกซองไม่สำเร็จ"), true);
      }
    } catch (e) {
      showVoucherMsg("❌ เกิดข้อผิดพลาดในการเชื่อมต่อ: " + e.message, true);
    } finally {
      if (btnVoucher) {
        btnVoucher.disabled = false;
        btnVoucher.innerText = "⚡ แลกซองเข้า ส่วนบุญ";
      }
    }
  }

  async function executeAddPoints(amount) {
    const val = parseInt(amount, 10);
    if (!val || val <= 0) return showVoucherMsg("กรุณาระบุจำนวน ส่วนบุญ ให้ถูกต้อง", true);
    try {
      const res = await fetch(`${API_BASE}/api/human-check/add-points`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: val })
      }).then(r => r.json());

      if (res && res.success) {
        updatePointDisplays(res.points);
        showVoucherMsg(`🎉 เติมส่วนบุญ ด่วนสำเร็จ: +${val.toLocaleString()} ส่วนบุญ (คงเหลือ ${res.points.toLocaleString()} ส่วนบุญ)`);
        showToast(`🪙 เติมส่วนบุญ สำเร็จ: +${val.toLocaleString()} ส่วนบุญ`, "success");
        await refreshTopupData();
      } else {
        showVoucherMsg("❌ เติมไม่สำเร็จ: " + (res.error || "Unknown error"), true);
      }
    } catch (e) {
      showVoucherMsg("❌ เกิดข้อผิดพลาด: " + e.message, true);
    }
  }

  btnTopup.addEventListener("click", () => {
    modal.style.display = "flex";
    refreshTopupData();
    syncActivePromptPayOrder();
  });

  // --- PromptPay QR Auto Top-up Controls ---
  const ppAmountInput = document.getElementById("topup-pp-amount-input");
  const btnPpCreate = document.getElementById("topup-pp-create") || document.getElementById("btn-topup-pp-create");
  const ppQrPanel = document.getElementById("topup-pp-qr-panel");
  const ppQrSvg = document.getElementById("topup-pp-qr-svg");
  const ppExactAmount = document.getElementById("topup-pp-exact-amount");
  const ppPointsPreview = document.getElementById("topup-pp-points-preview");
  const ppStatusLine = document.getElementById("topup-pp-status-line");
  const btnPpCheck = document.getElementById("btn-topup-pp-check");
  const btnPpCancel = document.getElementById("btn-topup-pp-cancel");
  const ppMsg = document.getElementById("topup-pp-msg");
  const ppPresetBtns = document.querySelectorAll(".btn-pp-preset");

  let activePpOrder = null;
  let ppPollInterval = null;
  let ppCountdownInterval = null;
  let ppPollInFlight = false;

  function showPpMsg(text, isError = false) {
    if (!ppMsg) return;
    ppMsg.style.display = "block";
    ppMsg.style.background = isError ? "rgba(239, 68, 68, 0.18)" : "rgba(16, 185, 129, 0.18)";
    ppMsg.style.color = isError ? "#f87171" : "#34d399";
    ppMsg.style.border = isError ? "1px solid rgba(239, 68, 68, 0.35)" : "1px solid rgba(16, 185, 129, 0.35)";
    ppMsg.innerText = text;
    setTimeout(() => { if (ppMsg) ppMsg.style.display = "none"; }, 9000);
  }

  function highlightPresetAmount(val) {
    const num = parseInt(val, 10);
    ppPresetBtns.forEach(btn => {
      const bAmt = parseInt(btn.dataset.amount, 10);
      if (bAmt === num) {
        btn.style.borderColor = "rgba(16, 185, 129, 0.65)";
        btn.style.background = "rgba(16, 185, 129, 0.18)";
        btn.style.color = "#34d399";
        btn.style.fontWeight = "700";
      } else {
        btn.style.borderColor = "";
        btn.style.background = "";
        btn.style.color = "";
        btn.style.fontWeight = "600";
      }
    });
  }

  function stopPpTimers() {
    if (ppPollInterval) { clearInterval(ppPollInterval); ppPollInterval = null; }
    if (ppCountdownInterval) { clearInterval(ppCountdownInterval); ppCountdownInterval = null; }
  }

  function formatRemainTime(expiresAt) {
    const remainSec = Math.max(0, Math.floor((Number(expiresAt || 0) - Date.now()) / 1000));
    const m = String(Math.floor(remainSec / 60)).padStart(2, "0");
    const s = String(remainSec % 60).padStart(2, "0");
    return { remainSec, text: `${m}:${s}` };
  }

  function renderPpOrder(order) {
    activePpOrder = order || null;
    if (!order || order.state === "cancelled" || order.state === "expired") {
      stopPpTimers();
      if (ppQrPanel) ppQrPanel.style.display = "none";
      return;
    }
    if (ppQrPanel) ppQrPanel.style.display = "block";
    const amtFormatted = order.amountFormatted || Number(order.amountBaht || 0).toFixed(2);
    if (ppExactAmount) ppExactAmount.innerText = amtFormatted;
    if (ppPointsPreview) ppPointsPreview.innerText = `ได้รับส่วนบุญเต็มจำนวน: +${amtFormatted} ส่วนบุญ`;
    const btnPpCancelEl = document.getElementById("btn-topup-pp-cancel");

    if (order.state === "paid") {
      stopPpTimers();
      if (ppQrSvg) {
        ppQrSvg.innerHTML = `
          <div style="width:168px; min-height:168px; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:14px 10px; box-sizing:border-box; border-radius:10px; background:linear-gradient(160deg, rgba(16,185,129,0.16), rgba(5,150,105,0.08)); border:1px solid rgba(16,185,129,0.45); color:#065f46;">
            <div style="font-size:38px; line-height:1; margin-bottom:8px;">✅</div>
            <div style="font-size:14px; font-weight:800; color:#047857; margin-bottom:4px;">ชำระเงินเรียบร้อย</div>
            <div style="font-size:13px; font-weight:700; color:#059669; margin-bottom:6px;">+${amtFormatted} ส่วนบุญ</div>
            <div style="font-size:11px; color:#065f46; opacity:0.85;">ไม่ต้องสแกน QR นี้ซ้ำ</div>
          </div>
        `;
      }
      if (btnPpCheck) btnPpCheck.style.display = "none";
      if (btnPpCancelEl) btnPpCancelEl.style.display = "none";
      if (ppStatusLine) {
        ppStatusLine.style.background = "rgba(16, 185, 129, 0.22)";
        ppStatusLine.style.borderColor = "rgba(16, 185, 129, 0.48)";
        ppStatusLine.style.color = "#34d399";
        ppStatusLine.innerText = `✅ ชำระเงินสำเร็จ! เติม +${amtFormatted} ส่วนบุญ เข้าเครื่องเรียบร้อยแล้ว`;
      }
      return;
    }

    if (btnPpCheck) btnPpCheck.style.display = "";
    if (btnPpCancelEl) btnPpCancelEl.style.display = "";
    if (ppQrSvg && order.qrSvg) {
      ppQrSvg.innerHTML = order.qrSvg;
    }

    const updateCountdown = () => {
      if (!activePpOrder || activePpOrder.state !== "pending") return;
      const { remainSec, text } = formatRemainTime(activePpOrder.expiresAt);
      if (remainSec <= 0) {
        stopPpTimers();
        if (ppStatusLine) {
          ppStatusLine.style.background = "rgba(239, 68, 68, 0.18)";
          ppStatusLine.style.borderColor = "rgba(239, 68, 68, 0.35)";
          ppStatusLine.style.color = "#f87171";
          ppStatusLine.innerText = "⌛ QR Code หมดอายุแล้ว กรุณากดสร้าง QR ใหม่อีกครั้ง";
        }
        return;
      }
      if (ppStatusLine) {
        ppStatusLine.style.background = "rgba(14, 116, 144, 0.22)";
        ppStatusLine.style.borderColor = "rgba(56, 189, 248, 0.35)";
        ppStatusLine.style.color = "#7dd3fc";
        ppStatusLine.innerText = `⏳ รอสแกนโอนยอด ${amtFormatted} บาท... (เหลือเวลา ${text})`;
      }
    };
    updateCountdown();

    stopPpTimers();
    ppCountdownInterval = setInterval(updateCountdown, 1000);
    ppPollInterval = setInterval(() => {
      if (modal.style.display === "none") return;
      pollPromptPayOrderStatus(false);
    }, 2500);
  }

  async function pollPromptPayOrderStatus(manual = false) {
    if (ppPollInFlight || !activePpOrder) return;
    ppPollInFlight = true;
    if (manual && btnPpCheck) {
      btnPpCheck.disabled = true;
      btnPpCheck.innerText = "⏳ กำลังเช็ก...";
    }
    try {
      const res = await fetch(`${API_BASE}/api/human-check/promptpay-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status", orderId: activePpOrder.orderId })
      }).then(r => r.json());
      if (res && res.success && res.order) {
        const prevState = activePpOrder?.state;
        renderPpOrder(res.order);
        if (res.order.state === "paid" && (prevState !== "paid" || !hasShownPaidPopup(res.order.orderId))) {
          const added = res.order.amountFormatted || Number(res.order.amountBaht || 0).toFixed(2);
          showPpMsg(`🎉 ชำระเงินพร้อมเพย์สำเร็จ! ได้รับ +${added} ส่วนบุญ`);
          showToast(`💚 พร้อมเพย์เข้าแล้ว: +${added} บ. (+${added} ส่วนบุญ)`, "success");
          await refreshTopupData();
          showTopupSuccessPopup({
            amountBaht: res.order.amountBaht ?? added,
            pointsAdded: res.order.pointsAdded ?? added,
            totalPoints: res.order.totalPoints ?? res.totalPoints ?? null,
            channelLabel: "สแกน QR พร้อมเพย์ (กสิกรไทย)",
            orderId: res.order.orderId
          });
        } else if (manual && res.order.state === "pending") {
          showPpMsg(`⏳ ยังไม่พบยอดโอน ${res.order.amountFormatted} บาท (หากโอนแล้วระบบจะปรับยอดใน 2-5 วินาที)`);
        }
      }
    } catch (_) {
    } finally {
      ppPollInFlight = false;
      if (manual && btnPpCheck) {
        btnPpCheck.disabled = false;
        btnPpCheck.innerText = "🔄 เช็กยอดทันที";
      }
    }
  }

  async function syncActivePromptPayOrder() {
    try {
      const targetOrderId = activePpOrder?.orderId || undefined;
      const res = await fetch(`${API_BASE}/api/human-check/promptpay-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status", orderId: targetOrderId })
      }).then(r => r.json());
      if (res && res.success && res.order) {
        if (res.order.state === "pending") {
          renderPpOrder(res.order);
        } else if (res.order.state === "paid") {
          const isRecentPaid = res.order.paidAt && (Date.now() - Number(res.order.paidAt)) < 5 * 60 * 1000;
          if ((targetOrderId && activePpOrder?.orderId === res.order.orderId) || isRecentPaid) {
            renderPpOrder(res.order);
          }
          if (!hasShownPaidPopup(res.order.orderId) && (targetOrderId || isRecentPaid)) {
            const added = res.order.amountFormatted || Number(res.order.amountBaht || 0).toFixed(2);
            showPpMsg(`🎉 ชำระเงินพร้อมเพย์สำเร็จ! ได้รับ +${added} ส่วนบุญ`);
            showToast(`💚 พร้อมเพย์เข้าแล้ว: +${added} บ. (+${added} ส่วนบุญ)`, "success");
            await refreshTopupData();
            showTopupSuccessPopup({
              amountBaht: res.order.amountBaht ?? added,
              pointsAdded: res.order.pointsAdded ?? added,
              totalPoints: res.order.totalPoints ?? res.totalPoints ?? null,
              channelLabel: "สแกน QR พร้อมเพย์ (กสิกรไทย)",
              orderId: res.order.orderId
            });
          }
        }
      }
    } catch (_) {}
  }

  async function createPromptPayOrder(amountVal) {
    const baseBaht = Math.floor(Number(amountVal ?? ppAmountInput?.value ?? 0));
    if (!Number.isFinite(baseBaht) || baseBaht < 1 || baseBaht > 50000) {
      return showPpMsg("กรุณาระบุจำนวนเงินระหว่าง 1 ถึง 50,000 บาท", true);
    }
    if (btnPpCreate) {
      btnPpCreate.disabled = true;
      btnPpCreate.innerText = "⏳ กำลังสร้าง QR...";
    }
    try {
      const res = await fetch(`${API_BASE}/api/human-check/promptpay-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", baseBaht })
      }).then(r => r.json());
      if (res && res.success && res.order) {
        renderPpOrder(res.order);
      } else {
        showPpMsg("❌ " + (res?.message || "ไม่สามารถสร้าง QR พร้อมเพย์ได้"), true);
      }
    } catch (e) {
      showPpMsg("❌ เกิดข้อผิดพลาดในการเชื่อมต่อ: " + e.message, true);
    } finally {
      if (btnPpCreate) {
        btnPpCreate.disabled = false;
        btnPpCreate.innerText = "📱 สร้าง QR พร้อมเพย์";
      }
    }
  }

  ppPresetBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const amt = btn.dataset.amount;
      if (ppAmountInput) ppAmountInput.value = amt;
      highlightPresetAmount(amt);
      createPromptPayOrder(amt);
    });
  });

  if (ppAmountInput) {
    ppAmountInput.addEventListener("input", () => highlightPresetAmount(ppAmountInput.value));
    ppAmountInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        createPromptPayOrder(ppAmountInput.value);
      }
    });
  }

  if (btnPpCreate) {
    btnPpCreate.addEventListener("click", () => createPromptPayOrder(ppAmountInput?.value));
  }

  if (btnPpCheck) {
    btnPpCheck.addEventListener("click", () => pollPromptPayOrderStatus(true));
  }

  if (btnPpCancel) {
    btnPpCancel.addEventListener("click", async () => {
      const currentId = activePpOrder?.orderId;
      stopPpTimers();
      activePpOrder = null;
      if (ppQrPanel) ppQrPanel.style.display = "none";
      if (currentId) {
        try {
          await fetch(`${API_BASE}/api/human-check/promptpay-order`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "cancel", orderId: currentId })
          });
        } catch (_) {}
      }
    });
  }

  const closeModal = () => {
    modal.style.display = "none";
    stopPpTimers();
  };
  if (btnClose) btnClose.addEventListener("click", closeModal);
  if (btnCancel) btnCancel.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

  if (btnVoucher) btnVoucher.addEventListener("click", executeRedeemVoucher);
  if (voucherInput) {
    voucherInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        executeRedeemVoucher();
      }
    });
  }

  if (btnCopyHwid) {
    btnCopyHwid.addEventListener("click", async () => {
      if (!cachedFullHwid) return;
      try {
        await navigator.clipboard.writeText(cachedFullHwid);
        showToast("📋 คัดลอก HWID เครื่องเรียบร้อยแล้ว", "info");
      } catch (err) {
        prompt("HWID ของเครื่องนี้คือ:", cachedFullHwid);
      }
    });
  }

  document.querySelectorAll(".btn-modal-point").forEach(btn => {
    btn.addEventListener("click", () => {
      const amt = btn.dataset.amount;
      executeAddPoints(amt);
    });
  });

  if (btnGotoSettings) {
    btnGotoSettings.addEventListener("click", () => {
      closeModal();
      const patcherBtn = document.getElementById("btn-game-patcher");
      if (patcherBtn) patcherBtn.click();
    });
  }

  refreshTopupData();
}

function initDeviceNickname() {
  const input = document.getElementById("device-nickname-input");
  const savedBadge = document.getElementById("device-nickname-saved");
  const hwidBadge = document.getElementById("device-hwid-badge");
  const hwidShortEl = document.getElementById("device-hwid-short");
  const hwidCopyHint = document.getElementById("device-hwid-copy-hint");
  if (!input) return;

  let currentSavedValue = "";
  let currentDefaultNick = "";
  let currentHwidShort = "";
  let currentHwidFull = "";
  let currentAccessStatus = "approved";
  let currentAccessRequestedAt = null;
  let currentAccessNote = "";
  let currentUsername = "";
  let currentIsUserAccount = false;
  let currentRequiresLogin = true;
  let initialAccessHydrated = false;
  let hideSavedTimer = null;

  const escHtml = (s) => String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));

  async function refreshPointsFromServer() {
    try {
      const res = await fetch(`${API_BASE}/api/human-check/settings`).then(r => r.json());
      if (res && res.success && res.settings) {
        updateAutoAnswerToolbarBtn(res.settings);
        updatePointDisplays(res.settings.points, res.settings.pointsPerSolve, res.settings.serviceAvailable, res.settings.machineMerit);
      }
    } catch (_) {}
  }

  function updateHeaderAuthUi() {
    const btnAuth = document.getElementById("btn-account-auth");
    const txtAuth = document.getElementById("header-account-auth-text");
    const loggedInUser = currentIsUserAccount && currentUsername && !currentRequiresLogin;
    if (txtAuth) {
      txtAuth.textContent = loggedInUser ? currentUsername : "เข้าสู่ระบบ / สมัคร ID";
    }
    if (btnAuth) {
      btnAuth.title = loggedInUser
        ? `บัญชีผู้ใช้: ${currentUsername} (เครื่อง: ${currentSavedValue || currentDefaultNick || "-"}) • คลิกเพื่อจัดการบัญชี`
        : "เข้าสู่ระบบหรือสมัครบัญชีผู้ใช้งาน (Username) เพื่อใช้ส่วนบุญร่วมกันหลายเครื่อง";
      btnAuth.style.background = loggedInUser ? "rgba(16, 185, 129, 0.16)" : "";
      btnAuth.style.borderColor = loggedInUser ? "rgba(52, 211, 153, 0.48)" : "";
      btnAuth.style.color = loggedInUser ? "#a7f3d0" : "";
    }
  }

  function ensureAccessLockOverlay() {
    const overlay = document.getElementById("access-lock-overlay");
    if (!overlay) return null;
    if (overlay._bound) return overlay;
    overlay._bound = true;

    const tabBtns = {
      login: overlay.querySelector("#btn-lock-tab-login"),
      register: overlay.querySelector("#btn-lock-tab-register"),
    };
    const panes = {
      login: overlay.querySelector("#access-lock-pane-login"),
      register: overlay.querySelector("#access-lock-pane-register"),
    };
    const setLockTab = (tab) => {
      for (const k of Object.keys(panes)) {
        if (panes[k]) panes[k].style.display = k === tab ? "flex" : "none";
        if (tabBtns[k]) {
          const activeColor = k === "register" ? "rgba(16,185,129,0.28)" : "rgba(56,189,248,0.26)";
          tabBtns[k].style.background = k === tab ? activeColor : "transparent";
          tabBtns[k].style.color = k === tab ? "#f8fafc" : "#94a3b8";
        }
      }
    };
    overlay._setLockTab = setLockTab;
    if (tabBtns.login) tabBtns.login.onclick = () => setLockTab("login");
    if (tabBtns.register) tabBtns.register.onclick = () => setLockTab("register");
    const switchToLoginBtn = overlay.querySelector("#btn-lock-switch-to-login");
    if (switchToLoginBtn) {
      switchToLoginBtn.onclick = () => {
        setLockTab("login");
        const u = overlay.querySelector("#lock-login-username");
        if (u) u.focus();
      };
    }

    const statusMsg = overlay.querySelector("#access-lock-status-msg");
    const showLockMsg = (msg, isErr = false) => {
      if (!statusMsg) return;
      if (!msg) {
        statusMsg.style.display = "none";
        statusMsg.textContent = "";
        return;
      }
      statusMsg.style.display = "block";
      statusMsg.style.background = isErr ? "rgba(239,68,68,0.16)" : "rgba(16,185,129,0.16)";
      statusMsg.style.borderColor = isErr ? "rgba(248,113,113,0.45)" : "rgba(52,211,153,0.4)";
      statusMsg.style.color = isErr ? "#fca5a5" : "#6ee7b7";
      statusMsg.textContent = msg;
    };

    const doLockLogin = async () => {
      const btn = overlay.querySelector("#btn-lock-login-submit");
      const username = (overlay.querySelector("#lock-login-username")?.value || "").trim();
      const password = overlay.querySelector("#lock-login-password")?.value || "";
      const nickname = (overlay.querySelector("#lock-login-nickname")?.value || "").trim();
      if (!username || !password) return showLockMsg("⚠️ กรุณากรอก Username และ Password", true);
      btn.disabled = true;
      btn.textContent = "⏳ กำลังเข้าสู่ระบบ...";
      try {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password, ...(nickname ? { nickname } : {}) }),
        }).then(r => r.json());
        if (res && res.success) {
          overlay.querySelector("#lock-login-password").value = "";
          await refreshPointsFromServer();
          const unlocked = await pollAccessStatusFromServer(true);
          const mergeMsg = res.mergedLegacyCount > 0 ? ` (โอนยอดเดิม ${Number(res.mergedDeltaUnits || 0).toLocaleString()} เข้าระบบแล้ว)` : "";
          if (unlocked) {
            showLockMsg(`✅ เข้าสู่ระบบ ${res.username} สำเร็จ!${mergeMsg}`);
          } else {
            showLockMsg(`✅ เข้าสู่ระบบ ${res.username} แล้ว${mergeMsg} — รอแอดมินอนุมัติ ID ใน Admin Dashboard`);
          }
        } else {
          showLockMsg("⚠️ " + (res?.error || "เข้าสู่ระบบไม่สำเร็จ"), true);
        }
      } catch (e) {
        showLockMsg("⚠️ เชื่อมต่อเซิร์ฟเวอร์ไม่ได้", true);
      } finally {
        btn.disabled = false;
        btn.textContent = "🔓 เข้าสู่ระบบ & เชื่อมส่วนบุญ";
      }
    };
    const loginSubmitBtn = overlay.querySelector("#btn-lock-login-submit");
    if (loginSubmitBtn) loginSubmitBtn.onclick = doLockLogin;
    for (const sel of ["#lock-login-username", "#lock-login-password", "#lock-login-nickname"]) {
      const el = overlay.querySelector(sel);
      if (el) el.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); doLockLogin(); }
      });
    }

    const doLockRegister = async () => {
      const btn = overlay.querySelector("#btn-lock-reg-submit");
      const username = (overlay.querySelector("#lock-reg-username")?.value || "").trim();
      const password = overlay.querySelector("#lock-reg-password")?.value || "";
      const password2 = overlay.querySelector("#lock-reg-password2")?.value || "";
      const nickname = (overlay.querySelector("#lock-reg-nickname")?.value || "").trim();
      const note = (overlay.querySelector("#lock-reg-note")?.value || "").trim();
      if (!username) return showLockMsg("⚠️ กรุณากรอก Username", true);
      if (password.length < 4) return showLockMsg("⚠️ รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร", true);
      if (password !== password2) return showLockMsg("⚠️ รหัสผ่านทั้งสองช่องไม่ตรงกัน", true);
      btn.disabled = true;
      btn.textContent = "⏳ กำลังสมัคร ID...";
      try {
        const res = await fetch(`${API_BASE}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password, ...(nickname ? { nickname } : {}), note }),
        }).then(r => r.json());
        if (res && res.success) {
          overlay.querySelector("#lock-reg-password").value = "";
          overlay.querySelector("#lock-reg-password2").value = "";
          await refreshPointsFromServer();
          await pollAccessStatusFromServer(true);
          const mergeMsg = res.mergedLegacyCount > 0 ? ` และโอนยอดเดิม ${Number(res.mergedDeltaUnits || 0).toLocaleString()} เข้าระบบแล้ว` : "";
          showLockMsg(`✅ สมัคร ID "${res.username}" สำเร็จ${mergeMsg}! คำขอส่งเข้า Admin Dashboard แล้ว กรุณารอแอดมินกดอนุมัติ`);
        } else {
          showLockMsg("⚠️ " + (res?.error || "สมัครไม่สำเร็จ"), true);
        }
      } catch (e) {
        showLockMsg("⚠️ เชื่อมต่อเซิร์ฟเวอร์ไม่ได้", true);
      } finally {
        btn.disabled = false;
        btn.textContent = "📝 สมัคร ID & ส่งให้แอดมินอนุมัติ";
      }
    };
    const regSubmitBtn = overlay.querySelector("#btn-lock-reg-submit");
    if (regSubmitBtn) regSubmitBtn.onclick = doLockRegister;
    for (const sel of ["#lock-reg-password2", "#lock-reg-note"]) {
      const el = overlay.querySelector(sel);
      if (el) el.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); doLockRegister(); }
      });
    }

    const logoutBtn = overlay.querySelector("#btn-access-lock-logout");
    if (logoutBtn) logoutBtn.onclick = async () => {
      try {
        await fetch(`${API_BASE}/api/auth/logout`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
        await pollAccessStatusFromServer(true);
        setLockTab("login");
        showLockMsg("🚪 ออกจากระบบแล้ว กรุณาเข้าสู่ระบบด้วย ID อื่น");
      } catch (_) {}
    };

    const checkNowBtn = overlay.querySelector("#btn-access-check-now");
    if (checkNowBtn) checkNowBtn.onclick = async () => {
      showLockMsg("🔄 กำลังตรวจสอบสถานะการอนุมัติกับเซิร์ฟเวอร์...");
      const unlocked = await pollAccessStatusFromServer(true);
      if (!unlocked) {
        if (currentRequiresLogin || !currentIsUserAccount || !currentUsername) {
          showLockMsg("🔐 กรุณาเข้าสู่ระบบด้วย Username และ Password", true);
        } else {
          showLockMsg(currentAccessStatus === "revoked"
            ? `🚫 ID "${currentUsername}" ถูกระงับสิทธิ์อยู่ กรุณาติดต่อแอดมิน`
            : `⏳ ID "${currentUsername}" ยังรอแอดมินกดอนุมัติใน Admin Dashboard...`);
        }
      }
    };

    return overlay;
  }

  function renderAccessLockOverlay() {
    const hasUserSession = Boolean(currentIsUserAccount && currentUsername && !currentRequiresLogin);
    const isLocked = !hasUserSession || currentAccessStatus !== "approved";
    const overlay = ensureAccessLockOverlay();
    if (!overlay) return;
    if (!isLocked) {
      overlay.style.display = "none";
      return;
    }
    overlay.style.display = "flex";
    const isRevoked = hasUserSession && currentAccessStatus === "revoked";
    const iconEl = overlay.querySelector("#access-lock-icon");
    const titleEl = overlay.querySelector("#access-lock-title");
    const pillEl = overlay.querySelector("#access-lock-pill");
    const descEl = overlay.querySelector("#access-lock-desc");
    const guestView = overlay.querySelector("#access-lock-guest-view");
    const pendingView = overlay.querySelector("#access-lock-pending-view");
    const loginNickEl = overlay.querySelector("#lock-login-nickname");
    const regNickEl = overlay.querySelector("#lock-reg-nickname");
    const pendingUserEl = overlay.querySelector("#lock-pending-username");
    const pendingDeviceEl = overlay.querySelector("#lock-pending-device");
    const pendingHwidEl = overlay.querySelector("#lock-pending-hwid");
    const pendingNoteRowEl = overlay.querySelector("#lock-pending-note-row");
    const pendingNoteEl = overlay.querySelector("#lock-pending-note");
    const footerDeviceEl = overlay.querySelector("#access-lock-footer-device");
    const hwidShortEl = overlay.querySelector("#access-lock-hwid-short");

    const pcName = currentSavedValue || currentDefaultNick || "-";
    if (footerDeviceEl) footerDeviceEl.textContent = pcName;
    if (hwidShortEl) hwidShortEl.textContent = currentHwidShort || "----";
    if (loginNickEl && document.activeElement !== loginNickEl && !loginNickEl.value) {
      loginNickEl.value = currentSavedValue || currentDefaultNick || "";
    }
    if (regNickEl && document.activeElement !== regNickEl && !regNickEl.value) {
      regNickEl.value = currentSavedValue || currentDefaultNick || "";
    }

    const ensurePmLockSvg = () => {
      if (!iconEl) return;
      if (!iconEl.querySelector("svg.pm-emblem-svg")) {
        iconEl.innerHTML = `<svg class="pm-emblem-svg" viewBox="22 20 140 76" width="32" height="20" fill="none" aria-hidden="true"><defs><linearGradient id="pmLockIconGradDynamic" x1="26" y1="24" x2="156" y2="92" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#ffffff" /><stop offset="52%" stop-color="#7dd3fc" /><stop offset="100%" stop-color="#c4b5fd" /></linearGradient></defs><path d="M 34 84 L 34 32 H 59 C 71.5 32 78.5 38.5 78.5 47.5 C 78.5 56.5 71.5 63 59 63 H 34" stroke="url(#pmLockIconGradDynamic)" stroke-width="14.5" stroke-linecap="round" stroke-linejoin="round" /><path d="M 98 84 L 98 32 L 124 62 L 150 32 L 150 84" stroke="url(#pmLockIconGradDynamic)" stroke-width="14.5" stroke-linecap="round" stroke-linejoin="round" /></svg>`;
      }
    };

    if (!hasUserSession) {
      if (guestView) guestView.style.display = "flex";
      if (pendingView) pendingView.style.display = "none";
      if (iconEl) {
        ensurePmLockSvg();
        iconEl.style.background = "linear-gradient(145deg,#0b152e,#1e1b4b)";
        iconEl.style.borderColor = "rgba(56,189,248,0.55)";
        iconEl.style.boxShadow = "0 6px 20px rgba(14,165,233,0.28),inset 0 1px 0 rgba(255,255,255,0.18)";
      }
      if (titleEl) titleEl.textContent = "บัญชีผู้ใช้ & เชื่อมส่วนบุญข้ามเครื่อง";
      if (pillEl) {
        pillEl.textContent = "🔐 ต้องเข้าสู่ระบบ";
        pillEl.style.background = "rgba(99,102,241,0.22)";
        pillEl.style.borderColor = "rgba(129,140,248,0.55)";
        pillEl.style.color = "#c7d2fe";
      }
      if (descEl) {
        descEl.innerHTML = "ล็อกอินด้วย <b>Username</b> เดียวกันในทุกเครื่องที่ใช้งาน ยอดส่วนบุญ (รวมถึงยอดค้างเดิมของเครื่องนี้) จะถูกเชื่อมรวมเป็นกระเป๋าเดียวกันอัตโนมัติ และไม่ต้องขออนุมัติเครื่องซ้ำทุกครั้ง";
      }
    } else if (isRevoked) {
      if (guestView) guestView.style.display = "none";
      if (pendingView) pendingView.style.display = "flex";
      if (iconEl) {
        ensurePmLockSvg();
        iconEl.style.background = "linear-gradient(145deg,#280d14,#3b121b)";
        iconEl.style.borderColor = "rgba(248,113,113,0.58)";
        iconEl.style.boxShadow = "0 6px 20px rgba(239,68,68,0.25),inset 0 1px 0 rgba(255,255,255,0.14)";
      }
      if (titleEl) titleEl.textContent = `สิทธิ์ของ ID "${currentUsername}" ถูกระงับ`;
      if (pillEl) {
        pillEl.textContent = "🚫 ระงับสิทธิ์ (Revoked)";
        pillEl.style.background = "rgba(239,68,68,0.2)";
        pillEl.style.borderColor = "rgba(248,113,113,0.5)";
        pillEl.style.color = "#fca5a5";
      }
      if (descEl) {
        descEl.innerHTML = "ผู้ดูแลระบบได้ระงับสิทธิ์ชั่วคราว กรุณาติดต่อแอดมิน หรือสลับไปเข้าสู่ระบบด้วย ID อื่นที่ได้รับอนุมัติแล้ว";
      }
    } else {
      if (guestView) guestView.style.display = "none";
      if (pendingView) pendingView.style.display = "flex";
      if (iconEl) {
        ensurePmLockSvg();
        iconEl.style.background = "linear-gradient(145deg,#241907,#332209)";
        iconEl.style.borderColor = "rgba(245,158,11,0.58)";
        iconEl.style.boxShadow = "0 6px 20px rgba(245,158,11,0.24),inset 0 1px 0 rgba(255,255,255,0.14)";
      }
      if (titleEl) titleEl.textContent = `รอแอดมินอนุมัติ ID: ${currentUsername}`;
      if (pillEl) {
        pillEl.textContent = "⏳ รออนุมัติ (Pending)";
        pillEl.style.background = "rgba(245,158,11,0.2)";
        pillEl.style.borderColor = "rgba(245,158,11,0.5)";
        pillEl.style.color = "#fde68a";
      }
      if (descEl) {
        descEl.innerHTML = `สมัคร ID <b>${escHtml(currentUsername)}</b> เรียบร้อยแล้ว! คำขอถูกส่งไปยัง Admin Dashboard แล้ว (อนุมัติครั้งเดียว ใช้ได้ไม่จำกัดเครื่อง)`;
      }
    }

    if (pendingUserEl) pendingUserEl.textContent = currentUsername || "-";
    if (pendingDeviceEl) pendingDeviceEl.textContent = pcName;
    if (pendingHwidEl) pendingHwidEl.textContent = currentHwidShort || "-";
    if (pendingNoteRowEl && pendingNoteEl) {
      if (currentAccessNote) {
        pendingNoteRowEl.style.display = "block";
        pendingNoteEl.textContent = currentAccessNote;
      } else {
        pendingNoteRowEl.style.display = "none";
      }
    }
  }

  function applyAccessDataToUi(res) {
    if (!res || typeof res !== "object") return;
    if (typeof res.nickname === "string") {
      currentSavedValue = res.nickname;
      if (document.activeElement !== input) input.value = currentSavedValue;
    }
    if (typeof res.defaultNickname === "string") {
      currentDefaultNick = res.defaultNickname;
      input.placeholder = res.defaultNickname;
    }
    if (typeof res.machineHwidShort === "string" && res.machineHwidShort) {
      currentHwidShort = res.machineHwidShort;
      if (hwidShortEl) hwidShortEl.textContent = currentHwidShort;
    }
    if (typeof res.machineHwid === "string" && res.machineHwid) {
      currentHwidFull = res.machineHwid;
    }
    if (hwidBadge && currentHwidShort) {
      const nick = currentSavedValue || currentDefaultNick || "ไม่ระบุ";
      hwidBadge.title = `เครื่อง: ${nick} | HWID: ${currentHwidShort} (คลิกเพื่อคัดลอกข้อมูลเครื่อง)`;
    }
    const wasHydrated = initialAccessHydrated;
    const prevStatus = currentAccessStatus;
    const prevReqLogin = currentRequiresLogin;
    if (["approved", "pending", "revoked"].includes(res.accessStatus)) {
      currentAccessStatus = res.accessStatus;
    }
    if (typeof res.username === "string") currentUsername = res.username;
    else if (res.username === null) currentUsername = "";
    if (typeof res.isUserAccount === "boolean") currentIsUserAccount = res.isUserAccount;
    if (typeof res.requiresLogin === "boolean") currentRequiresLogin = res.requiresLogin;
    if (res.accessRequestedAt !== undefined) currentAccessRequestedAt = res.accessRequestedAt;
    if (typeof res.accessNote === "string") currentAccessNote = res.accessNote;
    if (res.secretAccess && typeof window.__applySecretAccessState === "function") {
      window.__applySecretAccessState(res.secretAccess);
    }

    if (typeof res.requiresLogin === "boolean" || typeof res.accessStatus === "string") {
      initialAccessHydrated = true;
    }
    updateHeaderAuthUi();
    renderAccessLockOverlay();
    window.dispatchEvent(new CustomEvent('pm-access-state-changed', {
      detail: typeof window.__getAccessUiState === 'function' ? window.__getAccessUiState() : null
    }));
    if (initialAccessHydrated && typeof window.__pmNotifyAccessHydrated === "function") {
      window.__pmNotifyAccessHydrated();
    }
    if (((prevStatus === "pending" || prevStatus === "revoked") || prevReqLogin) && currentAccessStatus === "approved" && !currentRequiresLogin) {
      refreshPointsFromServer();
      if (wasHydrated && typeof showToast === "function") {
        const who = currentIsUserAccount && currentUsername ? `ID ${currentUsername}` : "เครื่องนี้";
        showToast(`✅ ยืนยันสิทธิ์ ${who} เรียบร้อยแล้ว! พร้อมใช้งานทันที`, "success");
      }
    }
  }

  function copyMachineIdentityText(overrideNick) {
    const nick = overrideNick || currentSavedValue || currentDefaultNick || "ไม่ระบุ";
    const textToCopy = `เครื่อง: ${nick} | HWID: ${currentHwidShort || "-"}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textToCopy).catch(() => {});
    }
    if (hwidCopyHint) {
      hwidCopyHint.textContent = "✓";
      hwidCopyHint.style.color = "#34d399";
      setTimeout(() => {
        hwidCopyHint.textContent = "📋";
        hwidCopyHint.style.color = "";
      }, 2000);
    }
    if (typeof showToast === "function") {
      showToast(`📋 คัดลอกข้อมูลเครื่อง (${nick} • HWID: ${currentHwidShort}) แล้ว`, "info");
    }
  }

  if (hwidBadge) {
    hwidBadge.addEventListener("click", () => copyMachineIdentityText());
    hwidBadge.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        copyMachineIdentityText();
      }
    });
  }

  async function loadNickname() {
    try {
      const res = await fetch(`${API_BASE}/api/device-nickname`).then(r => r.json());
      if (res && res.success) {
        applyAccessDataToUi(res);
      }
    } catch (err) {
      console.warn("Failed to load device nickname:", err);
    }
  }

  async function pollAccessStatusFromServer(forceSync = false) {
    try {
      const res = await fetch(`${API_BASE}/api/access/status${forceSync ? "?sync=1" : ""}`).then(r => r.json());
      if (res && res.success) {
        applyAccessDataToUi(res);
        return res.accessStatus === "approved" && !res.requiresLogin;
      }
    } catch (_) {}
    return currentAccessStatus === "approved" && !currentRequiresLogin;
  }

  async function saveNickname() {
    const val = input.value.trim();
    if (val === currentSavedValue) return;
    try {
      const res = await fetch(`${API_BASE}/api/device-nickname`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: val })
      }).then(r => r.json());

      if (res && res.success) {
        applyAccessDataToUi(res);
        if (savedBadge) {
          savedBadge.style.display = "inline";
          if (hideSavedTimer) clearTimeout(hideSavedTimer);
          hideSavedTimer = setTimeout(() => {
            if (savedBadge) savedBadge.style.display = "none";
          }, 2000);
        }
      }
    } catch (err) {
      console.error("Failed to save device nickname:", err);
    }
  }

  input.addEventListener("change", saveNickname);
  input.addEventListener("blur", saveNickname);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      input.blur();
    }
  });

  window.setAccessLockOverlayState = (mockState) => {
    applyAccessDataToUi(mockState);
  };
  window.__refreshAccessAndPoints = async (forceSync = true) => {
    await refreshPointsFromServer();
    return pollAccessStatusFromServer(forceSync);
  };
  window.__getAccessUiState = () => ({
    nickname: currentSavedValue || currentDefaultNick || "-",
    hwidShort: currentHwidShort || "-",
    accessStatus: currentAccessStatus,
    username: currentUsername,
    isUserAccount: currentIsUserAccount,
    requiresLogin: currentRequiresLogin,
  });

  loadNickname();
  setTimeout(() => pollAccessStatusFromServer(true), 1500);
  setInterval(() => {
    const needSync = currentRequiresLogin || currentAccessStatus === "pending" || currentAccessStatus === "revoked";
    pollAccessStatusFromServer(needSync);
  }, 5000);
}

function initAccountAuthModal() {
  const modal = document.getElementById("account-auth-modal");
  const openBtn = document.getElementById("btn-account-auth");
  const closeBtn = document.getElementById("btn-auth-modal-close");
  if (!modal || !openBtn) return;

  const loggedInPane = document.getElementById("auth-modal-logged-in");
  const guestPane = document.getElementById("auth-modal-guest");
  const tabLogin = document.getElementById("btn-auth-tab-login");
  const tabReg = document.getElementById("btn-auth-tab-register");
  const paneLogin = document.getElementById("auth-pane-login");
  const paneReg = document.getElementById("auth-pane-register");
  const loginUserEl = document.getElementById("auth-login-username");
  const loginPassEl = document.getElementById("auth-login-password");
  const loginMsgEl = document.getElementById("auth-login-msg");
  const loginBtn = document.getElementById("btn-auth-login-submit");
  const regUserEl = document.getElementById("auth-reg-username");
  const regPassEl = document.getElementById("auth-reg-password");
  const regPass2El = document.getElementById("auth-reg-password2");
  const regNoteEl = document.getElementById("auth-reg-note");
  const regMsgEl = document.getElementById("auth-reg-msg");
  const regBtn = document.getElementById("btn-auth-reg-submit");
  const logoutBtn = document.getElementById("btn-auth-logout");

  const setMsg = (el, msg, isErr = false) => {
    if (!el) return;
    if (!msg) {
      el.style.display = "none";
      el.textContent = "";
      return;
    }
    el.style.display = "block";
    el.style.background = isErr ? "rgba(239,68,68,0.16)" : "rgba(16,185,129,0.16)";
    el.style.border = isErr ? "1px solid rgba(248,113,113,0.45)" : "1px solid rgba(52,211,153,0.4)";
    el.style.color = isErr ? "#fca5a5" : "#6ee7b7";
    el.textContent = msg;
  };

  const setTab = (tab) => {
    const isLogin = tab === "login";
    if (paneLogin) paneLogin.style.display = isLogin ? "block" : "none";
    if (paneReg) paneReg.style.display = isLogin ? "none" : "block";
    if (tabLogin) {
      tabLogin.classList.toggle("active", isLogin);
      tabLogin.style.background = isLogin ? "rgba(99,102,241,0.3)" : "transparent";
      tabLogin.style.color = isLogin ? "#f8fafc" : "#94a3b8";
    }
    if (tabReg) {
      tabReg.classList.toggle("active", !isLogin);
      tabReg.style.background = !isLogin ? "rgba(16,185,129,0.28)" : "transparent";
      tabReg.style.color = !isLogin ? "#f8fafc" : "#94a3b8";
    }
  };

  const renderModalContent = async () => {
    setMsg(loginMsgEl, "");
    setMsg(regMsgEl, "");
    let access = null;
    let hcSettings = null;
    try {
      const [aRes, sRes] = await Promise.all([
        fetch(`${API_BASE}/api/access/status?sync=1`).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/api/human-check/settings`).then(r => r.json()).catch(() => null),
      ]);
      if (aRes && aRes.success) access = aRes;
      if (sRes && sRes.success && sRes.settings) {
        hcSettings = sRes.settings;
        updatePointDisplays(hcSettings.points, hcSettings.pointsPerSolve, hcSettings.serviceAvailable, hcSettings.machineMerit);
      }
    } catch (_) {}

    const st = window.__getAccessUiState ? window.__getAccessUiState() : {};
    const isUser = Boolean(access ? access.isUserAccount : st.isUserAccount);
    const uname = String((access ? access.username : st.username) || "");
    const reqLogin = Boolean(access ? access.requiresLogin : st.requiresLogin);
    const status = String((access ? access.accessStatus : st.accessStatus) || "approved");
    const nick = String((access ? (access.nickname || access.defaultNickname) : st.nickname) || "-");
    const hwid = String((access ? access.machineHwidShort : st.hwidShort) || "-");

    if (isUser && uname && !reqLogin) {
      if (loggedInPane) loggedInPane.style.display = "block";
      if (guestPane) guestPane.style.display = "none";
      const uEl = document.getElementById("auth-modal-username");
      const mEl = document.getElementById("auth-modal-merit");
      const dEl = document.getElementById("auth-modal-device");
      const hEl = document.getElementById("auth-modal-hwid");
      const sEl = document.getElementById("auth-modal-status");
      if (uEl) uEl.textContent = uname;
      if (mEl) mEl.textContent = hcSettings && hcSettings.points != null ? Number(hcSettings.points).toLocaleString() : "-";
      if (dEl) dEl.textContent = nick;
      if (hEl) hEl.textContent = hwid;
      if (sEl) {
        sEl.textContent = status === "approved" ? "อนุมัติแล้ว" : status === "revoked" ? "ถูกระงับ" : "รออนุมัติ";
        sEl.style.color = status === "approved" ? "#34d399" : status === "revoked" ? "#f87171" : "#fbbf24";
      }
    } else {
      if (loggedInPane) loggedInPane.style.display = "none";
      if (guestPane) guestPane.style.display = "block";
      setTab("login");
    }
  };

  const openModal = () => {
    modal.classList.add("show");
    modal.style.display = "flex";
    renderModalContent();
  };
  const closeModal = () => {
    modal.classList.remove("show");
    modal.style.display = "none";
  };

  openBtn.addEventListener("click", openModal);
  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
  if (tabLogin) tabLogin.addEventListener("click", () => setTab("login"));
  if (tabReg) tabReg.addEventListener("click", () => setTab("register"));
  const authSwitchToLoginBtn = document.getElementById("btn-auth-switch-to-login");
  if (authSwitchToLoginBtn) {
    authSwitchToLoginBtn.addEventListener("click", () => {
      setTab("login");
      if (loginUserEl) loginUserEl.focus();
    });
  }

  const handleLogin = async () => {
    const username = (loginUserEl?.value || "").trim();
    const password = loginPassEl?.value || "";
    if (!username || !password) return setMsg(loginMsgEl, "⚠️ กรุณากรอก Username และ Password", true);
    if (loginBtn) { loginBtn.disabled = true; loginBtn.textContent = "⏳ กำลังเข้าสู่ระบบ..."; }
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      }).then(r => r.json());
      if (res && res.success) {
        if (loginPassEl) loginPassEl.value = "";
        if (window.__refreshAccessAndPoints) await window.__refreshAccessAndPoints(true);
        const mergeText = res.mergedLegacyCount > 0 ? ` (โอนยอดเดิม ${Number(res.mergedDeltaUnits || 0).toLocaleString()} แล้ว)` : "";
        if (typeof showToast === "function") {
          showToast(`✅ เข้าสู่ระบบ ${res.username} สำเร็จ${mergeText}`, "success");
        }
        closeModal();
      } else {
        setMsg(loginMsgEl, "⚠️ " + (res?.error || "เข้าสู่ระบบไม่สำเร็จ"), true);
      }
    } catch (_) {
      setMsg(loginMsgEl, "⚠️ ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้", true);
    } finally {
      if (loginBtn) { loginBtn.disabled = false; loginBtn.textContent = "🔓 เข้าสู่ระบบและเชื่อมส่วนบุญ"; }
    }
  };
  if (loginBtn) loginBtn.addEventListener("click", handleLogin);
  if (loginPassEl) loginPassEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); handleLogin(); }
  });

  if (regBtn) regBtn.addEventListener("click", async () => {
    const username = (regUserEl?.value || "").trim();
    const password = regPassEl?.value || "";
    const password2 = regPass2El?.value || "";
    const note = (regNoteEl?.value || "").trim();
    if (!username) return setMsg(regMsgEl, "⚠️ กรุณากรอก Username", true);
    if (password.length < 4) return setMsg(regMsgEl, "⚠️ รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร", true);
    if (password !== password2) return setMsg(regMsgEl, "⚠️ รหัสผ่านยืนยันไม่ตรงกัน", true);
    regBtn.disabled = true;
    regBtn.textContent = "⏳ กำลังสมัคร ID...";
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, note }),
      }).then(r => r.json());
      if (res && res.success) {
        if (regPassEl) regPassEl.value = "";
        if (regPass2El) regPass2El.value = "";
        if (window.__refreshAccessAndPoints) await window.__refreshAccessAndPoints(true);
        const mergeText = res.mergedLegacyCount > 0 ? ` และโอนยอดเดิม ${Number(res.mergedDeltaUnits || 0).toLocaleString()} แล้ว` : "";
        if (typeof showToast === "function") {
          showToast(`✨ สมัคร ID ${res.username} สำเร็จ${mergeText}`, "success");
        }
        closeModal();
      } else {
        setMsg(regMsgEl, "⚠️ " + (res?.error || "สมัครบัญชีไม่สำเร็จ"), true);
      }
    } catch (_) {
      setMsg(regMsgEl, "⚠️ ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้", true);
    } finally {
      regBtn.disabled = false;
      regBtn.textContent = "✨ สมัคร ID และส่งขออนุมัติ";
    }
  });

  if (logoutBtn) logoutBtn.addEventListener("click", async () => {
    logoutBtn.disabled = true;
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (window.__refreshAccessAndPoints) await window.__refreshAccessAndPoints(true);
      closeModal();
    } catch (_) {} finally {
      logoutBtn.disabled = false;
    }
  });
}

(async () => {
  try {
    const res = await fetch(`${API_BASE}/api/human-check/settings`).then(r => r.json());
    if (res && res.success && res.settings) {
      updateAutoAnswerToolbarBtn(res.settings);
      updatePointDisplays(res.settings.points, res.settings.pointsPerSolve, res.settings.serviceAvailable, res.settings.machineMerit);
      const isDev = !!res.isDev;
      document.querySelectorAll(".dev-only-feature").forEach(el => {
        el.style.display = isDev ? "" : "none";
      });
    }
  } catch (e) {}
  // The modal markup follows this script; a fast/cached response can finish before parsing it.
  const initAccountModals=()=>{initCaptchaSettingsModal();initTopupCaptchaModal();initProxyRegisterControls();initScreenProxyControls();initAccountAuthModal();};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAccountModals, { once: true });
  else initAccountModals();
  initDeviceNickname();
  fetchCaptchaStats();
})();
document.getElementById("btn-start-bot-all").onclick = e => setBotOnAllClients(true, e.currentTarget);
document.getElementById("btn-stop-bot-all").onclick = e => setBotOnAllClients(false, e.currentTarget);

document.getElementById("btn-stop-all").onclick = async () => {
  if (confirm("ยืนยันสั่งปิดจอเกมทั้งหมดทันที?")) {
    await fetch(`${API_BASE}/api/stop-all`, { method: "POST" });
    fetchProfiles();
  }
};

document.getElementById("tile-side").onclick = async (e) => {
  e.preventDefault();
  await fetch(`${API_BASE}/api/tile-windows?layout=side`, { method: "POST" });
};

// Fixed grid cols x rows: windows fill left to right, top to bottom; window cells+1 goes back on cell 1
async function tileFixedGrid(cols, rows) {
  const r = await fetch(`${API_BASE}/api/tile-windows?layout=custom&cols=${cols}&rows=${rows}`, { method: "POST" }).then(x => x.json()).catch(() => null);
  const online = currentProfiles.filter(p => p.isRunning).length;
  if (r && r.success) showToast(`📐 จัดจอแบบ ${cols} × ${rows}${online > cols * rows ? ` — ${online} จอ เกิน ${cols * rows} ช่อง: จอที่ ${cols * rows + 1} ขึ้นไปซ้อนช่องเดิมตามลำดับ` : ""}`, "success");
}
document.querySelectorAll(".tile-fixed").forEach(a => a.onclick = e => { e.preventDefault(); tileFixedGrid(Number(a.dataset.cols), Number(a.dataset.rows)); });
document.getElementById("tile-custom").onclick = e => {
  e.preventDefault();
  let last = "4x3";
  try { last = localStorage.getItem("pm_tile_custom") || last; } catch (err) {}
  const v = prompt("จัดจอเป็นตารางกี่คอลัมน์ × กี่แถว? (เช่น 4x3 = 4 คอลัมน์ 3 แถว)", last);
  if (!v) return;
  const m = String(v).match(/(\d+)\s*[x×*,\s]\s*(\d+)/i);
  if (!m) return alert("พิมพ์แบบ 4x3 (คอลัมน์ x แถว)");
  const cols = Math.max(1, Math.min(10, Number(m[1]))), rows = Math.max(1, Math.min(10, Number(m[2])));
  try { localStorage.setItem("pm_tile_custom", `${cols}x${rows}`); } catch (err) {}
  tileFixedGrid(cols, rows);
};

document.getElementById("tile-grid").onclick = async (e) => {
  e.preventDefault();
  await fetch(`${API_BASE}/api/tile-windows?layout=grid`, { method: "POST" });
};

// Keep the "จัดหน้าต่าง" dropdown clamped inside viewport (away from left floating sidebar & right screen edge)
(function initDropdownViewportClamp() {
  const clampDropdown = (dd) => {
    const menu = dd && dd.querySelector(".dropdown-content");
    if (!menu) return;
    menu.style.left = "0px";
    menu.style.right = "auto";
    requestAnimationFrame(() => {
      const rect = menu.getBoundingClientRect();
      if (!rect.width) return;
      const minLeft = 56; // clear left floating dock icons
      const maxRight = window.innerWidth - 12;
      if (rect.left < minLeft) {
        menu.style.left = `${Math.round(minLeft - rect.left)}px`;
      } else if (rect.right > maxRight) {
        menu.style.left = `${Math.round(maxRight - rect.right)}px`;
      }
    });
  };
  document.querySelectorAll(".dropdown").forEach((dd) => {
    dd.addEventListener("mouseenter", () => clampDropdown(dd));
    dd.addEventListener("focusin", () => clampDropdown(dd));
    dd.addEventListener("click", () => clampDropdown(dd));
  });
})();

document.getElementById("btn-refresh").onclick = () => {
  fetchProfiles();
};

document.getElementById("btn-add-profile").onclick = () => {
  openAddModal();
};

// ==========================================
// MAIN SECTION TABS (Game Clients / Zeny Consolidation)
// ==========================================
// ==========================================
// ZENY CONSOLIDATION WORKFLOW (UI CONTROLLER)
// ==========================================
let selectedReceiverProfileId = null;
let selectedSenderIds = new Set();
let unselectedSenderIds = new Set();
let consolidationPollTimer = null;
let isConsolidationRunning = false;
let lastConsolidationState = null;
let ipGroupReceiverMap = (() => {
  try {
    return JSON.parse(localStorage.getItem("pm_consolidation_ip_receivers") || "{}") || {};
  } catch (e) {
    return {};
  }
})();

function saveIpGroupReceiverMap() {
  try {
    localStorage.setItem("pm_consolidation_ip_receivers", JSON.stringify(ipGroupReceiverMap || {}));
  } catch (e) {}
}

function getProfileIpGroupKey(p) {
  if (p && p.screenProxy && p.screenProxy.active && (p.screenProxy.ip || p.screenProxy.proxyHost)) {
    return String(p.screenProxy.ip || p.screenProxy.proxyHost).trim();
  }
  return "LOCAL";
}

function isConsolidateSameIpOnly() {
  const cb = document.getElementById("cb-consolidate-same-ip-only");
  if (cb) return Boolean(cb.checked);
  try {
    return localStorage.getItem("pm_consolidate_same_ip_only") === "true";
  } catch (e) {
    return false;
  }
}

function setConsolidateSameIpOnly(val) {
  const b = Boolean(val);
  const cb = document.getElementById("cb-consolidate-same-ip-only");
  if (cb) cb.checked = b;
  try {
    localStorage.setItem("pm_consolidate_same_ip_only", b ? "true" : "false");
  } catch (e) {}
}

function isConsolidateRound100k() {
  const cb = document.getElementById("cb-consolidate-round-100k");
  if (cb) return Boolean(cb.checked);
  try {
    return localStorage.getItem("pm_consolidate_round_100k") === "true";
  } catch (e) {
    return false;
  }
}

function setConsolidateRound100k(val) {
  const b = Boolean(val);
  const cb = document.getElementById("cb-consolidate-round-100k");
  if (cb) cb.checked = b;
  try {
    localStorage.setItem("pm_consolidate_round_100k", b ? "true" : "false");
  } catch (e) {}
}

function computeSenderTransferZeny(zeny, keepZeny = getConsolidationKeepZeny(), round100k = isConsolidateRound100k()) {
  const z = Math.max(0, Number(zeny) || 0);
  const keep = Math.max(0, Number(keepZeny) || 0);
  if (!round100k) {
    return Math.max(0, z - keep);
  }
  // When "ตัดเศษหลักหมื่น" is enabled (e.g. 11,564,555 -> 11,500,000):
  // If keepZeny <= 100,000, truncate the 10k digits directly so 11,564,555 becomes 11,500,000 (keeping the 64,555 remainder).
  // Only subtract another 100k if the remainder is < 10,000 and keepZeny > 0 so the character isn't left with 0 zeny.
  if (keep <= 100000) {
    let rounded = Math.floor(z / 100000) * 100000;
    if (keep > 0 && (z - rounded) < 10000 && rounded >= 100000) {
      rounded -= 100000;
    }
    return Math.max(0, rounded);
  }
  return Math.floor(Math.max(0, z - keep) / 100000) * 100000;
}

function parseZenyInputAmount(raw) {
  const s = String(raw == null ? "" : raw).trim().toLowerCase().replace(/,/g, "");
  if (!s) return 0;
  const m = s.match(/^([0-9]+(?:\.[0-9]+)?)\s*(m|ล้าน|k|พัน|แสน)?$/i);
  if (m) {
    const num = parseFloat(m[1]);
    const unit = (m[2] || "").toLowerCase();
    if (unit === "m" || unit === "ล้าน") return Math.round(num * 1000000);
    if (unit === "แสน") return Math.round(num * 100000);
    if (unit === "k" || unit === "พัน") return Math.round(num * 1000);
    return Math.round(num);
  }
  const digits = parseInt(s.replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(digits) && digits > 0 ? digits : 0;
}

function buildIpConsolidationGroups() {
  const keepZeny = getConsolidationKeepZeny();
  const round100k = isConsolidateRound100k();
  const map = new Map();
  for (const p of currentProfiles) {
    const ip = getProfileIpGroupKey(p);
    if (!map.has(ip)) {
      map.set(ip, {
        ip,
        profiles: [],
        onlineProfiles: [],
        onlinePremiumProfiles: [],
        premiumProfiles: []
      });
    }
    const g = map.get(ip);
    g.profiles.push(p);
    if (p.isRunning) g.onlineProfiles.push(p);
    if (isProfilePremium(p)) {
      g.premiumProfiles.push(p);
      if (p.isRunning) g.onlinePremiumProfiles.push(p);
    }
  }

  const groups = [];
  for (const g of map.values()) {
    const savedRecId = ipGroupReceiverMap[g.ip];
    let receiver = g.onlinePremiumProfiles.find(p => p.id === savedRecId)
      || g.onlinePremiumProfiles.find(p => p.isMain)
      || g.onlinePremiumProfiles.slice().sort((a, b) => ((b.liveState?.zeny || 0) - (a.liveState?.zeny || 0)))[0]
      || g.premiumProfiles.find(p => p.id === savedRecId)
      || g.premiumProfiles.find(p => p.isMain)
      || g.premiumProfiles[0]
      || null;
    if (receiver && ipGroupReceiverMap[g.ip] !== receiver.id) {
      ipGroupReceiverMap[g.ip] = receiver.id;
    }
    const senders = receiver
      ? g.onlinePremiumProfiles.filter(p => p.id !== receiver.id && !unselectedSenderIds.has(p.id))
      : [];
    const totalZeny = g.onlineProfiles.reduce((sum, p) => sum + (Number(p.liveState?.zeny) || 0), 0);
    const transferableZeny = senders.reduce((sum, p) => {
      const z = Number(p.liveState?.zeny) || 0;
      return sum + computeSenderTransferZeny(z, keepZeny, round100k);
    }, 0);
    groups.push({
      ...g,
      receiver,
      senders,
      totalZeny,
      transferableZeny,
      canConsolidate: Boolean(receiver && receiver.isRunning && senders.length > 0 && transferableZeny > 0)
    });
  }
  return groups;
}

// "เหลือเงินติดตัวจอที่โอน": each sender keeps this much zeny (server: keepZeny). Remembered in this browser.
function getConsolidationKeepZeny() {
  const el = document.getElementById("zeny-keep-input");
  const v = el ? parseInt(String(el.value).replace(/[^0-9]/g, ""), 10) : NaN;
  return Number.isFinite(v) && v > 0 ? v : 0;
}
(function initConsolidationKeepInput() {
  const el = document.getElementById("zeny-keep-input");
  if (!el) return;
  try { const saved = localStorage.getItem("pm_consolidation_keep"); if (saved) el.value = Number(saved).toLocaleString(); } catch (e) {}
  el.addEventListener("input", () => {
    const n = getConsolidationKeepZeny();
    try { localStorage.setItem("pm_consolidation_keep", String(n)); } catch (e) {}
    if (typeof updateZenyConsolidationView === "function") updateZenyConsolidationView();
  });
  el.addEventListener("blur", () => { el.value = getConsolidationKeepZeny().toLocaleString(); });
})();

function createZenyIpGroupCardEl(ip) {
  const card = document.createElement("div");
  card.dataset.ipGroupCard = String(ip);
  card.style.cssText = "border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 7px; border: 1.5px solid rgba(255, 255, 255, 0.1); background: rgba(9, 13, 22, 0.65);";
  const ipLabel = ip === "LOCAL" ? "LOCAL (เน็ตบ้าน)" : String(ip);
  card.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; gap: 6px; flex-wrap: wrap;">
      <div style="display: flex; align-items: center; gap: 6px;">
        <span class="js-ip-chip" style="font-size: 11px; font-weight: 800; padding: 2px 7px; border-radius: 6px; background: rgba(168, 85, 247, 0.22); color: #e9d5ff; border: 1px solid rgba(168, 85, 247, 0.45); font-family: monospace;"></span>
        <span class="js-ip-running-badge" style="display: none; font-size: 10px; padding: 1px 6px; border-radius: 99px; background: rgba(16, 185, 129, 0.22); color: #6ee7b7; border: 1px solid rgba(16, 185, 129, 0.45); font-weight: 700;">🔄 กำลังรวมวงนี้</span>
      </div>
      <span class="js-ip-counts" style="font-size: 11px; color: #cbd5e1;"></span>
    </div>

    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; background: rgba(15, 23, 42, 0.6); padding: 5px 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
      <span class="js-ip-senders-lbl" style="color: #94a3b8;"></span>
      <b class="js-ip-transfer-val" style="font-family: var(--font-mono);"></b>
    </div>

    <div style="display: flex; flex-direction: column; gap: 3px;">
      <label style="font-size: 10.5px; color: #94a3b8;">👑 ตัวรับเงินประจำวง IP นี้:</label>
      <select class="zeny-select ip-group-receiver-select" style="font-size: 11.5px; padding: 4px 8px; height: 30px;"></select>
    </div>

    <div style="display: flex; gap: 6px; margin-top: 2px;">
      <button type="button" class="btn btn-secondary btn-sm btn-select-ip-group" style="flex: 1; font-size: 11px; padding: 4px 8px;" title="เลือกตัวรับและติ๊กเฉพาะจอในวง IP นี้ในตารางด้านล่าง"></button>
      <button type="button" class="btn btn-primary btn-sm btn-start-single-ip-group" style="flex: 1; font-size: 11px; padding: 4px 8px; background: #7c3aed; border-color: #a855f7; font-weight: 700;" title="เริ่มรวมเงินเฉพาะในวง IP นี้ทันที">🚀 รวมวงนี้ทันที</button>
    </div>
  `;
  const chipEl = card.querySelector(".js-ip-chip");
  if (chipEl) chipEl.textContent = `🛡️ ${ipLabel}`;
  const selEl = card.querySelector(".ip-group-receiver-select");
  if (selEl) selEl.dataset.ip = String(ip);
  const btnSel = card.querySelector(".btn-select-ip-group");
  if (btnSel) btnSel.dataset.ip = String(ip);
  const btnRun = card.querySelector(".btn-start-single-ip-group");
  if (btnRun) btnRun.dataset.ip = String(ip);
  return card;
}

function patchZenyIpGroupCardEl(card, g, activeTasksByIp, sameIpOnly, activeReceiverIp) {
  const ipTask = (activeTasksByIp instanceof Map) ? activeTasksByIp.get(g.ip) : (activeTasksByIp === g.ip ? { ip: g.ip } : null);
  const isCurrentRunningIp = Boolean(ipTask);
  const isSelectedIp = Boolean(sameIpOnly && activeReceiverIp === g.ip);
  const borderCol = isCurrentRunningIp
    ? "rgba(52, 211, 153, 0.75)"
    : (isSelectedIp ? "rgba(168, 85, 247, 0.75)" : "rgba(255, 255, 255, 0.1)");
  const bgCol = isCurrentRunningIp
    ? "rgba(6, 78, 59, 0.35)"
    : (isSelectedIp ? "rgba(88, 28, 135, 0.28)" : "rgba(9, 13, 22, 0.65)");

  if (card.style.background !== bgCol) card.style.background = bgCol;
  if (card.style.borderColor !== borderCol) card.style.borderColor = borderCol;

  const runBadge = card.querySelector(".js-ip-running-badge");
  if (runBadge) {
    const nextDisp = isCurrentRunningIp ? "" : "none";
    if (runBadge.style.display !== nextDisp) runBadge.style.display = nextDisp;
    if (isCurrentRunningIp) {
      const chTxt = ipTask && ipTask.targetChannel ? ` · CH ${ipTask.targetChannel}` : "";
      const stepTxt = ipTask && ipTask.stepIndex ? ` (ขั้น ${ipTask.stepIndex}/5${chTxt})` : "";
      const badgeTxt = `🔄 กำลังรวมวงนี้${stepTxt}`;
      if (runBadge.textContent !== badgeTxt) runBadge.textContent = badgeTxt;
    }
  }

  const countsEl = card.querySelector(".js-ip-counts");
  if (countsEl) {
    const nextCountsHtml = `🟢 <b>${g.onlineProfiles.length}</b>/${g.profiles.length} จอ · 👑 <b>${g.onlinePremiumProfiles.length}</b> VIP`;
    if (window.PmUiGuard) window.PmUiGuard.setHtmlIfChanged(countsEl, nextCountsHtml);
    else if (countsEl.innerHTML !== nextCountsHtml) countsEl.innerHTML = nextCountsHtml;
  }

  const sendersLbl = card.querySelector(".js-ip-senders-lbl");
  if (sendersLbl) {
    const nextLbl = isCurrentRunningIp && ipTask && typeof ipTask.totalSenders === "number"
      ? `โอนแล้ว ${ipTask.completedSendersCount || 0}/${ipTask.totalSenders} จอ (+${Number(ipTask.transferredZeny || 0).toLocaleString()} z):`
      : `ยอดโอนในวงนี้ (${g.senders.length} จอส่ง):`;
    if (sendersLbl.textContent !== nextLbl) sendersLbl.textContent = nextLbl;
  }

  const transferValEl = card.querySelector(".js-ip-transfer-val");
  if (transferValEl) {
    const nextTxt = `${g.transferableZeny.toLocaleString()} z`;
    const nextColor = g.transferableZeny > 0 ? "#facc15" : "#94a3b8";
    if (transferValEl.textContent !== nextTxt) transferValEl.textContent = nextTxt;
    if (transferValEl.style.color !== nextColor) transferValEl.style.color = nextColor;
  }

  const selEl = card.querySelector(".ip-group-receiver-select");
  if (selEl) {
    const recOpts = g.premiumProfiles.length > 0
      ? g.premiumProfiles.map(p => {
          const cName = p.liveState?.charName || p.lastCharName || p.name;
          const zVal = typeof p.liveState?.zeny === "number" ? `${p.liveState.zeny.toLocaleString()} z` : "--";
          const onTag = p.isRunning ? "🟢" : "⚪";
          return {
            value: p.id,
            label: `${onTag} 👑 ${p.name} [${cName}] (${zVal})`,
            disabled: false
          };
        })
      : [{ value: "", label: "🔒 ไม่มีตัวละครที่มี Premium ในวงนี้", disabled: false }];
    const selectedId = (g.receiver && g.premiumProfiles.length > 0) ? g.receiver.id : "";
    // Only disable the receiver dropdown if THIS specific IP group is currently consolidating
    const isSelDisabled = g.premiumProfiles.length === 0 || isCurrentRunningIp;
    if (window.PmUiGuard) {
      window.PmUiGuard.syncSelect(selEl, recOpts, selectedId, isSelDisabled);
    }
  }

  const btnSel = card.querySelector(".btn-select-ip-group");
  if (btnSel) {
    const nextDis = !g.receiver;
    const nextBtnTxt = `🎯 เลือกวงนี้ (${g.senders.length} จอ)`;
    if (btnSel.disabled !== nextDis) btnSel.disabled = nextDis;
    if (btnSel.textContent !== nextBtnTxt) btnSel.textContent = nextBtnTxt;
  }

  const btnRun = card.querySelector(".btn-start-single-ip-group");
  if (btnRun) {
    if (isCurrentRunningIp) {
      if (btnRun.disabled !== false) btnRun.disabled = false;
      btnRun.dataset.running = "1";
      if (btnRun.style.background !== "rgb(220, 38, 38)" && btnRun.style.background !== "#dc2626") btnRun.style.background = "#dc2626";
      if (btnRun.style.borderColor !== "rgb(248, 113, 113)" && btnRun.style.borderColor !== "#f87171") btnRun.style.borderColor = "#f87171";
      const stopTxt = "⏹️ หยุดวงนี้";
      if (btnRun.textContent !== stopTxt) btnRun.textContent = stopTxt;
      btnRun.title = "หยุดการรวมเงินเฉพาะในวง IP นี้ (วงอื่นยังทำงานต่อตามปกติ)";
    } else {
      // Multi-Task: other non-running IP groups remain clickable even while another IP group is trading!
      const nextRunDis = !g.canConsolidate;
      if (btnRun.disabled !== nextRunDis) btnRun.disabled = nextRunDis;
      btnRun.dataset.running = "0";
      if (btnRun.style.background !== "rgb(124, 58, 237)" && btnRun.style.background !== "#7c3aed") btnRun.style.background = "#7c3aed";
      if (btnRun.style.borderColor !== "rgb(168, 85, 247)" && btnRun.style.borderColor !== "#a855f7") btnRun.style.borderColor = "#a855f7";
      const runTxt = "🚀 รวมวงนี้ทันที";
      if (btnRun.textContent !== runTxt) btnRun.textContent = runTxt;
      btnRun.title = "เริ่มรวมเงินเฉพาะในวง IP นี้ทันที (รันขนานกับวง IP อื่นได้พร้อมกัน)";
    }
  }
}

function updateZenyConsolidationView() {
  const onlineProfiles = currentProfiles.filter(p => p.isRunning);
  const premiumProfiles = currentProfiles.filter(p => isProfilePremium(p));
  const onlinePremiumProfiles = onlineProfiles.filter(p => isProfilePremium(p));
  const sameIpOnly = isConsolidateSameIpOnly();
  const sameIpCb = document.getElementById("cb-consolidate-same-ip-only");
  if (sameIpCb && sameIpCb.checked !== sameIpOnly) sameIpCb.checked = sameIpOnly;
  
  // 1. Update Top Metrics in Zeny Pane
  const totalOnlineZeny = onlineProfiles.reduce((sum, p) => {
    const z = p.liveState && typeof p.liveState.zeny === 'number' ? p.liveState.zeny : 0;
    return sum + z;
  }, 0);

  const zenyTotalEl = document.getElementById("zeny-total-online-val");
  if (zenyTotalEl) zenyTotalEl.innerText = `${totalOnlineZeny.toLocaleString()} z`;

  const onlineCountEl = document.getElementById("zeny-online-count");
  if (onlineCountEl) onlineCountEl.innerText = `${onlineProfiles.length}`;

  const sendersBadge = document.getElementById("zeny-senders-count-badge");
  if (sendersBadge) sendersBadge.innerText = `${currentProfiles.length} จอ (${onlinePremiumProfiles.length} จอมี 👑 Premium ออนไลน์)`;

  const curRecProfile = currentProfiles.find(p => p.id === selectedReceiverProfileId);
  if (!selectedReceiverProfileId || !curRecProfile || !isProfilePremium(curRecProfile)) {
    const defaultRec = onlinePremiumProfiles.find(p => p.isMain) || onlinePremiumProfiles[0] || premiumProfiles.find(p => p.isMain) || premiumProfiles[0] || null;
    selectedReceiverProfileId = defaultRec ? defaultRec.id : "";
  }

  // Skip heavy DOM reconciliation if Zeny tab pane is hidden
  const zenyPane = document.querySelector('.tab-pane[data-pane="zeny"]');
  if (zenyPane && !zenyPane.classList.contains("active")) {
    return;
  }

  const activeTasksList = (lastConsolidationState && lastConsolidationState.running && Array.isArray(lastConsolidationState.activeTasks))
    ? lastConsolidationState.activeTasks
    : [];
  const activeTasksByIp = new Map(activeTasksList.map(t => [String(t.ip), t]));
  if (lastConsolidationState && lastConsolidationState.running && lastConsolidationState.currentIpGroup && !activeTasksByIp.has(String(lastConsolidationState.currentIpGroup))) {
    activeTasksByIp.set(String(lastConsolidationState.currentIpGroup), {
      ip: String(lastConsolidationState.currentIpGroup),
      stepIndex: lastConsolidationState.stepIndex || 1
    });
  }
  const activeProfileIdsSet = new Set(
    (lastConsolidationState && lastConsolidationState.running && Array.isArray(lastConsolidationState.activeProfileIds))
      ? lastConsolidationState.activeProfileIds
      : []
  );
  const activeSenderNamesSet = new Set(activeTasksList.map(t => t.currentSender).filter(Boolean));
  if (lastConsolidationState && lastConsolidationState.running && lastConsolidationState.currentSender) {
    activeSenderNamesSet.add(lastConsolidationState.currentSender);
  }

  // 2. Populate Receiver Select in-place (never closes open dropdown)
  const receiverSelect = document.getElementById("zeny-receiver-select");
  if (receiverSelect) {
    const currentVal = selectedReceiverProfileId || "";
    let receiverOpts = [];
    if (premiumProfiles.length === 0) {
      receiverOpts = [
        { value: "", label: "⚠️ ไม่มีตัวละครที่มีสถานะ 👑 Premium (การเทรดต้องมี Premium)", disabled: true },
        ...currentProfiles.map(p => {
          const charName = p.liveState?.charName || p.lastCharName || p.name;
          const ipKey = getProfileIpGroupKey(p);
          return {
            value: p.id,
            label: `🔒 [ไม่มี Premium] ${p.name} [${charName}] — IP: ${ipKey}`,
            disabled: true
          };
        })
      ];
    } else {
      receiverOpts = currentProfiles.map(p => {
        const hasPrem = isProfilePremium(p);
        const charName = p.liveState?.charName || p.lastCharName || p.name;
        const isOnline = p.isRunning ? "🟢 ออนไลน์" : "⚪ ออฟไลน์";
        const zeny = p.liveState && typeof p.liveState.zeny === 'number' ? `${p.liveState.zeny.toLocaleString()} z` : '--';
        const mainStar = p.isMain ? "⭐ " : "";
        const premPrefix = hasPrem ? "👑 " : "🔒 [ไม่มี Premium] ";
        const ipKey = getProfileIpGroupKey(p);
        return {
          value: p.id,
          label: `${premPrefix}${mainStar}${p.name} [${charName}] — ${zeny} · 🛡️ IP: ${ipKey} (${isOnline})`,
          disabled: !hasPrem
        };
      });
    }
    if (window.PmUiGuard) {
      window.PmUiGuard.syncSelect(receiverSelect, receiverOpts, premiumProfiles.length === 0 ? "" : currentVal, false);
    }
  }

  const activeReceiverProfile = currentProfiles.find(p => p.id === selectedReceiverProfileId) || null;
  const activeReceiverIp = activeReceiverProfile ? getProfileIpGroupKey(activeReceiverProfile) : null;
  const receiverIpBadge = document.getElementById("zeny-receiver-ip-badge");
  if (receiverIpBadge) {
    receiverIpBadge.textContent = activeReceiverIp ? `🛡️ IP ตัวรับ: ${activeReceiverIp}` : "IP: -";
  }

  // 2.5 Render IP-Group Consolidation Cards in-place (#zeny-ip-groups-list)
  const ipGroupsListEl = document.getElementById("zeny-ip-groups-list");
  const ipGroupsBadgeEl = document.getElementById("zeny-ip-groups-summary-badge");
  const btnStartAllIpGroups = document.getElementById("btn-start-ip-groups-consolidation");
  const ipGroups = buildIpConsolidationGroups();
  const readyIpGroups = ipGroups.filter(g => g.canConsolidate);
  const idleReadyIpGroups = readyIpGroups.filter(g => !activeTasksByIp.has(g.ip));
  if (ipGroupsBadgeEl) {
    const runningNote = activeTasksByIp.size > 0 ? ` · กำลังรวม ${activeTasksByIp.size} วง` : "";
    ipGroupsBadgeEl.textContent = `${ipGroups.length} วง IP (พร้อมรวม ${readyIpGroups.length} วง${runningNote})`;
  }
  if (btnStartAllIpGroups) {
    btnStartAllIpGroups.disabled = idleReadyIpGroups.length === 0;
    const totalIpTransferZeny = idleReadyIpGroups.reduce((sum, g) => sum + g.transferableZeny, 0);
    let nextBtnAllTxt = `🌐 รวมเงินทุกวง IP อัตโนมัติ (0 วง)`;
    if (activeTasksByIp.size > 0 && idleReadyIpGroups.length > 0) {
      nextBtnAllTxt = `🌐 รวมวง IP ที่เหลือพร้อมกัน (${idleReadyIpGroups.length} วง · ${totalIpTransferZeny.toLocaleString()} z)`;
    } else if (idleReadyIpGroups.length > 0) {
      nextBtnAllTxt = `🌐 รวมเงินทุกวง IP อัตโนมัติ (${idleReadyIpGroups.length} วง · ${totalIpTransferZeny.toLocaleString()} z)`;
    } else if (activeTasksByIp.size > 0) {
      nextBtnAllTxt = `🔄 กำลังรวมเงิน (${activeTasksByIp.size} วง IP พร้อมกัน)`;
    }
    if (btnStartAllIpGroups.textContent !== nextBtnAllTxt) {
      btnStartAllIpGroups.textContent = nextBtnAllTxt;
    }
  }
  if (ipGroupsListEl) {
    if (ipGroups.length === 0) {
      const emptyHtml = `<div data-ip-empty="1" style="grid-column: 1 / -1; text-align: center; color: #94a3b8; font-size: 12px; padding: 14px;">ยังไม่มีโปรไฟล์ในระบบ</div>`;
      if (!ipGroupsListEl.querySelector('[data-ip-empty="1"]')) {
        ipGroupsListEl.innerHTML = emptyHtml;
      }
    } else {
      const emptyNode = ipGroupsListEl.querySelector('[data-ip-empty="1"]');
      if (emptyNode) emptyNode.remove();
      const existingByIp = new Map();
      Array.from(ipGroupsListEl.children).forEach(ch => {
        if (ch.dataset && ch.dataset.ipGroupCard !== undefined) {
          existingByIp.set(ch.dataset.ipGroupCard, ch);
        }
      });
      const desiredCards = ipGroups.map(g => {
        const key = String(g.ip);
        let card = existingByIp.get(key);
        if (card) {
          existingByIp.delete(key);
        } else {
          card = createZenyIpGroupCardEl(g.ip);
        }
        patchZenyIpGroupCardEl(card, g, activeTasksByIp, sameIpOnly, activeReceiverIp);
        return card;
      });
      existingByIp.forEach(stale => {
        if (window.PmUiGuard && window.PmUiGuard.isInteracting(stale)) return;
        stale.remove();
      });
      if (!(window.PmUiGuard && window.PmUiGuard.isInteracting(ipGroupsListEl))) {
        desiredCards.forEach((node, idx) => {
          if (ipGroupsListEl.children[idx] !== node) {
            ipGroupsListEl.insertBefore(node, ipGroupsListEl.children[idx] || null);
          }
        });
      } else {
        desiredCards.forEach(node => {
          if (!node.parentNode) ipGroupsListEl.appendChild(node);
        });
      }
    }
  }

  // 3. Render Senders Table (Only online Premium profiles can be checked)
  const tbody = document.getElementById("zeny-senders-tbody");
  if (tbody) {
    if (currentProfiles.length === 0) {
      const emptyRowHtml = `<tr><td colspan="6" style="text-align: center; color: #64748b; padding: 24px;">ไม่พบรายการโปรไฟล์ในระบบ</td></tr>`;
      if (window.PmUiGuard) window.PmUiGuard.setHtmlIfChanged(tbody, emptyRowHtml);
      else tbody.innerHTML = emptyRowHtml;
      return;
    }

    let pendingTransferSum = 0;
    let eligibleCount = 0;
    let checkedEligibleCount = 0;
    const completedSet = new Set((lastConsolidationState && Array.isArray(lastConsolidationState.completedSenders)) ? lastConsolidationState.completedSenders : []);

    const rowsHtml = currentProfiles.map(p => {
      const isReceiver = Boolean(selectedReceiverProfileId && p.id === selectedReceiverProfileId);
      const isOnline = !!p.isRunning;
      const hasPrem = isProfilePremium(p);
      const profileIp = getProfileIpGroupKey(p);
      const isSameIpAsReceiver = Boolean(activeReceiverIp && profileIp === activeReceiverIp);
      const canSelectSender = isOnline && hasPrem && !isReceiver;
      const state = p.liveState || {};
      const charName = state.charName || p.lastCharName || p.name;
      const charClass = state.charClass || p.lastCharClass || p.charClass || 'Novice';
      const mapName = state.map || p.targetMap || '--';
      const channel = state.channel ? `CH ${state.channel}` : (state.channelText || '--');
      const zeny = typeof state.zeny === 'number' ? state.zeny : 0;
      const zenyText = typeof state.zeny === 'number' ? `${zeny.toLocaleString()} z` : '--';

      let isChecked = false;
      if (!canSelectSender) {
        selectedSenderIds.delete(p.id);
        isChecked = false;
      } else {
        eligibleCount++;
        if (sameIpOnly && !isSameIpAsReceiver) {
          selectedSenderIds.delete(p.id);
          isChecked = false;
        } else {
          if (!selectedSenderIds.has(p.id) && !unselectedSenderIds.has(p.id)) {
            selectedSenderIds.add(p.id);
          }
          isChecked = selectedSenderIds.has(p.id);
        }
        if (isChecked) {
          checkedEligibleCount++;
          pendingTransferSum += computeSenderTransferZeny(zeny);
        }
      }

      let statusBadge = '';
      if (isReceiver) {
        statusBadge = `<span class="zeny-badge-receiver">👑 ตัวรับเงิน (Receiver)</span>`;
      } else if (!hasPrem) {
        statusBadge = `<span class="zeny-badge-status offline" style="color: #fca5a5; border-color: rgba(239, 68, 68, 0.35); background: rgba(239, 68, 68, 0.12);" title="ต้องมีสถานะ Premium จึงจะเทรดแลกเปลี่ยนเงินกับผู้เล่นอื่นได้">🔒 ไม่มี Premium (เทรดไม่ได้)</span>`;
      } else if (!isOnline) {
        statusBadge = `<span class="zeny-badge-status offline">⚪ ออฟไลน์</span>`;
      } else if (isConsolidationRunning && completedSet.has(p.id)) {
        statusBadge = `<span class="zeny-badge-status done">✅ โอนสำเร็จแล้ว</span>`;
      } else if (isConsolidationRunning && activeSenderNamesSet.has(p.name)) {
        statusBadge = `<span class="zeny-badge-status transferring">🔄 กำลังโอนเงิน...</span>`;
      } else if (isConsolidationRunning && activeProfileIdsSet.has(p.id)) {
        statusBadge = `<span class="zeny-badge-status transferring">⏳ รอคิวโอนเงิน (${escapeHTML(profileIp)})...</span>`;
      } else if (sameIpOnly && !isSameIpAsReceiver) {
        statusBadge = `<span class="zeny-badge-status offline" style="color: #c4b5fd; border-color: rgba(168, 85, 247, 0.35); background: rgba(168, 85, 247, 0.12);" title="คลิกติ๊กที่ช่องด้านซ้ายเพื่อปลดล็อกและเลือกโอนข้ามวง IP ได้ทันที">🛡️ คนละวง IP (${escapeHTML(profileIp)})</span>`;
      } else {
        statusBadge = `<span class="zeny-badge-status ready">🟢 พร้อมโอนเงิน (👑 Premium)</span>`;
      }

      const ipChipHtml = `<span style="display: inline-flex; align-items: center; gap: 3px; font-size: 10px; padding: 1px 6px; border-radius: 5px; font-family: monospace; background: ${isSameIpAsReceiver ? 'rgba(16, 185, 129, 0.16)' : 'rgba(148, 163, 184, 0.12)'}; color: ${isSameIpAsReceiver ? '#6ee7b7' : '#94a3b8'}; border: 1px solid ${isSameIpAsReceiver ? 'rgba(16, 185, 129, 0.4)' : 'rgba(148, 163, 184, 0.25)'};" title="${isSameIpAsReceiver ? 'อยู่ในวง IP เดียวกับตัวรับเงิน' : 'คนละวง IP กับตัวรับเงิน'}">🛡️ ${escapeHTML(profileIp)}</span>`;

      const checkboxHtml = isReceiver ? 
        `<span style="color: #facc15; font-size: 14px;" title="ตัวรับเงิน (ยกเว้นจากการส่งเงิน)">👑</span>` :
        `<input type="checkbox" class="zeny-sender-cb" data-profile-id="${p.id}" ${isChecked ? 'checked' : ''} ${!canSelectSender ? 'disabled' : ''} title="${!hasPrem ? 'เลือกไม่ได้: ตัวละครนี้ไม่มีสถานะ Premium' : (!isOnline ? 'เลือกไม่ได้: จอนี้ยังไม่ออนไลน์' : (sameIpOnly && !isSameIpAsReceiver ? 'คลิกเพื่อปลดล็อกโหมดจำกัด IP และเลือกจอนี้รวมเงินด้วย' : 'เลือกเพื่อโอนเงิน'))}" style="accent-color: #0ea5e9; cursor: ${canSelectSender ? 'pointer' : 'not-allowed'};">`;

      return `
        <tr class="${isReceiver ? 'receiver-row' : ''}" style="${!hasPrem ? 'opacity: 0.6;' : (sameIpOnly && !isSameIpAsReceiver && !isReceiver ? 'opacity: 0.8;' : '')}">
          <td style="text-align: center;">${checkboxHtml}</td>
          <td>
            <div style="font-weight: 700; color: #f8fafc; display: flex; align-items: center; gap: 5px; flex-wrap: wrap;">
              <span>${p.isMain ? '⭐ ' : ''}${escapeHTML(p.name)}</span>
              ${hasPrem ? '<span class="premium-card-badge" style="font-size: 9px; padding: 1px 5px;">👑 PREMIUM</span>' : ''}
            </div>
            <div style="font-size: 10.5px; color: #64748b; display: flex; align-items: center; gap: 6px; margin-top: 2px; flex-wrap: wrap;">
              <span>Port: ${p.debugPort || '--'}</span>
              ${ipChipHtml}
            </div>
          </td>
          <td>
            <div style="font-weight: 600; color: #e2e8f0;">${escapeHTML(charName)}</div>
            <div style="font-size: 10.5px; color: #94a3b8;">${escapeHTML(charClass)}</div>
          </td>
          <td>
            <div style="color: #cbd5e1; font-size: 11.5px;">📍 ${escapeHTML(mapName)}</div>
            <div style="font-size: 10.5px; color: #38bdf8; font-weight: 600;">📡 ${channel}</div>
          </td>
          <td style="text-align: right; font-family: var(--font-mono); font-weight: 700; color: ${zeny > 0 ? '#facc15' : '#94a3b8'};">
            ${zenyText}
            ${!isReceiver && isChecked && (getConsolidationKeepZeny() > 0 || isConsolidateRound100k()) ? `<div style="font-size: 10.5px; font-weight: 600; color: ${isConsolidateRound100k() ? '#fde047' : '#94a3b8'};">→ โอน ${computeSenderTransferZeny(zeny).toLocaleString()} z</div>` : ''}
          </td>
          <td style="text-align: center;">${statusBadge}</td>
        </tr>
      `;
    }).join("");

    if (!(window.PmUiGuard && window.PmUiGuard.deferIfInteracting("zeny-senders-tbody", tbody, updateZenyConsolidationView))) {
      if (window.PmUiGuard) window.PmUiGuard.setHtmlIfChanged(tbody, rowsHtml);
      else tbody.innerHTML = rowsHtml;
    }

    const selectAllCb = document.getElementById("zeny-select-all-checkbox");
    if (selectAllCb && eligibleCount > 0) {
      selectAllCb.checked = (checkedEligibleCount === eligibleCount);
    }

    const pendingEl = document.getElementById("zeny-pending-transfer-val");
    if (pendingEl) pendingEl.innerText = `${pendingTransferSum.toLocaleString()} z`;
  }
}

function switchMainTab(tabName) {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-tab") === tabName);
  });
  document.querySelectorAll(".tab-pane").forEach(pane => {
    pane.classList.toggle("active", pane.getAttribute("data-pane") === tabName);
  });
  document.querySelectorAll("[data-tab-only]").forEach(el => {
    const only = el.getAttribute("data-tab-only");
    el.style.display = (only === tabName) ? "" : "none";
  });
  try { localStorage.setItem("manager.activeTab", tabName); } catch (e) {}

  if (tabName === "zeny") {
    updateZenyConsolidationView();
    pollConsolidationStatus();
  } else if (tabName === "market") {
    if (window.MarketOverview && typeof window.MarketOverview.onTabShown === "function") {
      window.MarketOverview.onTabShown();
    }
  } else if (tabName === "fleet") {
    if (window.FleetDashboard && typeof window.FleetDashboard.onTabShown === "function") {
      window.FleetDashboard.onTabShown();
    }
  } else if (tabName === "fleet-zeny") {
    if (window.FleetZeny && typeof window.FleetZeny.onTabShown === "function") {
      window.FleetZeny.onTabShown();
    }
  } else if (tabName === "autofarm") {
    if (typeof window.loadAutoFarmDashboard === "function") {
      window.loadAutoFarmDashboard(true);
    }
  }
  window.dispatchEvent(new CustomEvent("pm-main-tab-changed", { detail: { tabName } }));
}
window.switchMainTab = switchMainTab;

// ==========================================
// 🌾 SECRET AUTO FARM LV.20 & AUTO-TRADE DASHBOARD
// ==========================================
(() => {
  let secretAutoFarmUnlocked = false;
  let afConfig = {
    serverName: "Nightfall",
    receiverProfileId: "",
    concurrency: 3,
    targetLevel: 20,
    tradeChannel: 1,
    completionAction: "pass",
    running: false,
    totalTradedCoins: 0,
    completedCount: 0,
    lastStatusText: ""
  };
  let afProfiles = [];
  let afLoadBusy = false;
  let afEventsBound = false;

  window.__applySecretAccessState = function (secretAccess) {
    if (!secretAccess || typeof secretAccess !== "object") return;
    const nextUnlocked = Boolean(secretAccess.autofarm || (secretAccess.features && secretAccess.features.autofarm));
    const tabBtn = document.getElementById("tab-btn-autofarm");
    if (tabBtn) {
      tabBtn.style.display = nextUnlocked ? "" : "none";
    }
    if (nextUnlocked && !secretAutoFarmUnlocked) {
      secretAutoFarmUnlocked = true;
      loadAutoFarmDashboard(false);
    } else if (!nextUnlocked && secretAutoFarmUnlocked) {
      secretAutoFarmUnlocked = false;
      const curTab = localStorage.getItem("manager.activeTab");
      if (curTab === "autofarm" && typeof window.switchMainTab === "function") {
        window.switchMainTab("profiles");
      }
    }
  };

  async function saveAutoFarmConfig(extraPatch = {}) {
    const serverEl = document.getElementById("af-cfg-server");
    const recEl = document.getElementById("af-cfg-receiver");
    const concEl = document.getElementById("af-cfg-concurrency");
    const lvEl = document.getElementById("af-cfg-target-lv");
    const chEl = document.getElementById("af-cfg-trade-ch");
    const compEl = document.getElementById("af-cfg-completion");

    const payload = {
      serverName: (serverEl && serverEl.value.trim()) || afConfig.serverName || "Nightfall",
      receiverProfileId: (recEl && recEl.value) || afConfig.receiverProfileId || "",
      concurrency: Math.max(1, Math.min(15, Number(concEl && concEl.value) || 3)),
      targetLevel: Math.max(5, Math.min(99, Number(lvEl && lvEl.value) || 20)),
      tradeChannel: Math.max(1, Math.min(20, Number(chEl && chEl.value) || 1)),
      completionAction: (compEl && compEl.value) || "pass",
      ...extraPatch
    };
    const res = await fetch(`${API_BASE}/api/autofarm/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(r => r.json());
    if (res && res.success) {
      afConfig = res.config || afConfig;
      await loadAutoFarmDashboard(false);
      if (typeof showToast === "function") showToast("💾 บันทึกตั้งค่าระบบ Auto Farm เรียบร้อยแล้ว", "success");
    }
  }

  function bindAutoFarmEvents() {
    if (afEventsBound) return;
    afEventsBound = true;

    const bindChange = (id) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("change", () => saveAutoFarmConfig().catch(() => {}));
    };
    bindChange("af-cfg-server");
    bindChange("af-cfg-receiver");
    bindChange("af-cfg-concurrency");
    bindChange("af-cfg-target-lv");
    bindChange("af-cfg-trade-ch");
    bindChange("af-cfg-completion");

    const saveBtn = document.getElementById("af-btn-save-cfg");
    if (saveBtn) saveBtn.onclick = () => saveAutoFarmConfig().catch(() => {});

    const addBtn = document.getElementById("af-btn-add-profiles");
    if (addBtn) {
      addBtn.onclick = async () => {
        const cntEl = document.getElementById("af-add-count");
        const srvEl = document.getElementById("af-cfg-server");
        const count = Math.max(1, Math.min(50, Number(cntEl && cntEl.value) || 1));
        const serverName = (srvEl && srvEl.value.trim()) || afConfig.serverName || "Nightfall";
        addBtn.disabled = true;
        try {
          const res = await fetch(`${API_BASE}/api/autofarm/profiles`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ count, serverName })
          }).then(r => r.json());
          if (res && res.success) {
            if (typeof showToast === "function") {
              showToast(`➕ สร้างโปรไฟล์ Auto-Gen (@gmail.com + ชื่อตัวละคร) จำนวน ${res.createdCount} โปรไฟล์แล้ว!`, "success");
            }
            await loadAutoFarmDashboard(true);
          } else if (typeof showToast === "function") {
            showToast(res?.error || "เพิ่มโปรไฟล์ไม่สำเร็จ", "error");
          }
        } finally {
          addBtn.disabled = false;
        }
      };
    }

    const toggleBtn = document.getElementById("af-btn-toggle-run");
    if (toggleBtn) {
      toggleBtn.onclick = async () => {
        toggleBtn.disabled = true;
        try {
          await saveAutoFarmConfig().catch(() => {});
          const nextRunning = !afConfig.running;
          const res = await fetch(`${API_BASE}/api/autofarm/toggle`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ running: nextRunning })
          }).then(r => r.json());
          if (res && res.success) {
            afConfig = res.config || afConfig;
            if (typeof showToast === "function") {
              showToast(afConfig.running ? "🚀 เริ่มรันคิว Auto Farm Lv.20 อัตโนมัติแล้ว!" : "⏸ หยุดพักคิว Auto Farm แล้ว", "info");
            }
            await loadAutoFarmDashboard(true);
          } else if (typeof showToast === "function") {
            showToast(res?.error || "ไม่สามารถสลับสถานะ Auto Farm ได้", "error");
          }
        } finally {
          toggleBtn.disabled = false;
        }
      };
    }

    const stopCloseBtn = document.getElementById("af-btn-stop-close");
    if (stopCloseBtn) {
      stopCloseBtn.onclick = async () => {
        if (!window.confirm("ยืนยันหยุดระบบ Auto Farm และปิดหน้าต่างเกมในหมวด Auto Farm ทั้งหมดหรือไม่?")) return;
        stopCloseBtn.disabled = true;
        try {
          const res = await fetch(`${API_BASE}/api/autofarm/toggle`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ running: false, closeAllWindows: true })
          }).then(r => r.json());
          if (res && res.success) {
            afConfig = res.config || afConfig;
            if (typeof showToast === "function") showToast("⏹ หยุดระบบและปิดหน้าต่าง Auto Farm ทั้งหมดแล้ว", "info");
            await loadAutoFarmDashboard(true);
          }
        } finally {
          stopCloseBtn.disabled = false;
        }
      };
    }

    const delPassedBtn = document.getElementById("af-btn-delete-passed");
    if (delPassedBtn) {
      delPassedBtn.onclick = async () => {
        const passedCnt = afProfiles.filter(p => !p.isReceiver && p.passed).length;
        if (passedCnt === 0) {
          if (typeof showToast === "function") showToast("ยังไม่มีโปรไฟล์ที่ประทับตรา PASS", "info");
          return;
        }
        if (!window.confirm(`ยืนยันลบโปรไฟล์ที่เทรดเงินเสร็จแล้ว (PASS) จำนวน ${passedCnt} โปรไฟล์หรือไม่? (ไม่ลบตัวรับเงิน)`)) return;
        const res = await fetch(`${API_BASE}/api/autofarm/profiles/bulk-delete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "passed" })
        }).then(r => r.json());
        if (res && res.success) {
          if (typeof showToast === "function") showToast(`🧹 ลบโปรไฟล์ที่ PASS แล้ว ${res.deletedCount} โปรไฟล์เรียบร้อย`, "success");
          await loadAutoFarmDashboard(true);
        }
      };
    }

    const delFarmersBtn = document.getElementById("af-btn-delete-farmers");
    if (delFarmersBtn) {
      delFarmersBtn.onclick = async () => {
        const farmerCnt = afProfiles.filter(p => !p.isReceiver).length;
        if (farmerCnt === 0) {
          if (typeof showToast === "function") showToast("ไม่มีโปรไฟล์ตัวฟาร์มให้ลบ", "info");
          return;
        }
        if (!window.confirm(`ยืนยันลบโปรไฟล์ตัวฟาร์มทั้งหมด ${farmerCnt} โปรไฟล์หรือไม่? (ระบบจะเก็บโปรไฟล์ตัวรับเงินไว้)`)) return;
        const res = await fetch(`${API_BASE}/api/autofarm/profiles/bulk-delete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "all_farmers" })
        }).then(r => r.json());
        if (res && res.success) {
          if (typeof showToast === "function") showToast(`🗑️ ลบโปรไฟล์ตัวฟาร์มทั้งหมด ${res.deletedCount} โปรไฟล์แล้ว (เก็บตัวรับเงินไว้)`, "success");
          await loadAutoFarmDashboard(true);
        }
      };
    }
  }

  const escHtml = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  function renderAutoFarmDashboard() {
    bindAutoFarmEvents();
    const tabCount = document.getElementById("tab-count-autofarm");
    if (tabCount) tabCount.textContent = String(afProfiles.length || 0);

    const runBadge = document.getElementById("af-run-badge");
    if (runBadge) {
      if (afConfig.running) {
        runBadge.textContent = "🟢 กำลังรันฟาร์มอัตโนมัติ";
        runBadge.style.background = "rgba(16,185,129,0.22)";
        runBadge.style.color = "#6ee7b7";
        runBadge.style.borderColor = "rgba(16,185,129,0.5)";
      } else {
        runBadge.textContent = "⏸ หยุดพัก";
        runBadge.style.background = "rgba(148,163,184,0.18)";
        runBadge.style.color = "#cbd5e1";
        runBadge.style.borderColor = "rgba(148,163,184,0.35)";
      }
    }

    const toggleBtn = document.getElementById("af-btn-toggle-run");
    if (toggleBtn) {
      toggleBtn.textContent = afConfig.running ? "⏸ หยุดพักคิว Auto Farm" : "▶ เริ่มรันระบบ Auto Farm";
      toggleBtn.className = afConfig.running ? "btn btn-warning" : "btn btn-success";
    }

    const statusText = document.getElementById("af-status-text");
    if (statusText && afConfig.lastStatusText) {
      statusText.textContent = afConfig.lastStatusText;
    }

    const receiverProf = afProfiles.find(p => p.id === afConfig.receiverProfileId) || afProfiles.find(p => p.isReceiver) || afProfiles[0] || null;
    const activeFarmers = afProfiles.filter(p => (!receiverProf || p.id !== receiverProf.id) && !p.passed && p.isRunning);
    const waitingFarmers = afProfiles.filter(p => (!receiverProf || p.id !== receiverProf.id) && !p.passed && !p.isRunning);
    const passedFarmers = afProfiles.filter(p => (!receiverProf || p.id !== receiverProf.id) && p.passed);

    const mRec = document.getElementById("af-metric-receiver");
    if (mRec) {
      if (receiverProf) {
        const rName = (receiverProf.liveState && receiverProf.liveState.charName) || receiverProf.lastCharName || receiverProf.charName || receiverProf.name;
        const rZeny = (receiverProf.liveState && receiverProf.liveState.screenPhase === "in_game" && receiverProf.liveState.zeny != null)
          ? receiverProf.liveState.zeny
          : (receiverProf.lastZeny != null ? receiverProf.lastZeny : (receiverProf.liveState && receiverProf.liveState.zeny != null ? receiverProf.liveState.zeny : 0));
        const rOnline = receiverProf.isRunning ? " 🟢" : " ⚪";
        mRec.textContent = `${rName}${rOnline} • 💰 ${Number(rZeny || 0).toLocaleString()}`;
      } else {
        mRec.textContent = "ยังไม่มีโปรไฟล์";
      }
    }
    const mQueue = document.getElementById("af-metric-queue");
    if (mQueue) mQueue.textContent = `เปิด ${activeFarmers.length}/${afConfig.concurrency || 3} • รอคิว ${waitingFarmers.length} ID`;
    const mPassed = document.getElementById("af-metric-passed");
    if (mPassed) mPassed.textContent = `${passedFarmers.length} / ${Math.max(0, afProfiles.length - (receiverProf ? 1 : 0))} โปรไฟล์`;
    const mCoins = document.getElementById("af-metric-coins");
    if (mCoins) mCoins.textContent = `${Number(afConfig.totalTradedCoins || 0).toLocaleString()} เหรียญ`;

    // Sync config inputs if user is not actively typing in them
    const syncInput = (id, val) => {
      const el = document.getElementById(id);
      if (el && document.activeElement !== el && val !== undefined && val !== null) {
        el.value = String(val);
      }
    };
    syncInput("af-cfg-server", afConfig.serverName || "Nightfall");
    syncInput("af-cfg-concurrency", afConfig.concurrency || 3);
    syncInput("af-cfg-target-lv", afConfig.targetLevel || 20);
    syncInput("af-cfg-trade-ch", afConfig.tradeChannel || 1);
    syncInput("af-cfg-completion", afConfig.completionAction || "pass");

    const recSelect = document.getElementById("af-cfg-receiver");
    if (recSelect && document.activeElement !== recSelect) {
      recSelect.innerHTML = "";
      if (afProfiles.length === 0) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "-- เพิ่มโปรไฟล์ก่อน (จอ 1 จะเป็นตัวรับเงิน) --";
        recSelect.appendChild(opt);
      } else {
        afProfiles.forEach((p, idx) => {
          const opt = document.createElement("option");
          opt.value = p.id;
          const cName = (p.liveState && p.liveState.charName) || p.lastCharName || p.charName || p.name;
          opt.textContent = `จอ ${idx + 1}: ${cName} (${p.account || "auto"})`;
          if (receiverProf && p.id === receiverProf.id) opt.selected = true;
          recSelect.appendChild(opt);
        });
      }
    }

    const grid = document.getElementById("af-profiles-grid");
    if (!grid) return;
    if (afProfiles.length === 0) {
      grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:42px 20px;background:rgba(15,23,42,0.65);border:1.5px dashed rgba(148,163,184,0.28);border-radius:14px;color:#94a3b8;">
          <div style="font-size:34px;margin-bottom:8px;">🌾</div>
          <div style="font-size:15px;font-weight:800;color:#e2e8f0;margin-bottom:4px;">ยังไม่มีโปรไฟล์ในคิวระบบ Auto Farm</div>
          <div style="font-size:12.5px;">เลือกเซิร์ฟเวอร์ กรอกจำนวนโปรไฟล์ที่ต้องการ (เช่น 20 โปรไฟล์) แล้วกดปุ่ม <b>"➕ สร้างโปรไฟล์เข้าคิว"</b> ด้านบนได้เลยครับ (จอที่ 1 จะถูกตั้งเป็นตัวรับเงินเทรดอัตโนมัติ)</div>
        </div>
      `;
      return;
    }

    grid.innerHTML = afProfiles.map((p, idx) => {
      const isRec = Boolean(receiverProf && p.id === receiverProf.id);
      const live = p.liveState || null;
      const charName = (live && live.charName) || p.lastCharName || p.charName || `ตัวละคร #${idx + 1}`;
      const baseLv = (live && live.baseLv != null) ? live.baseLv : (p.lastBaseLv || 1);
      const jobLv = (live && live.jobLv != null) ? live.jobLv : null;
      const className = (live && (live.jobName || live.className)) || p.jobClass || "นักธนู";
      const zeny = (live && live.zeny != null && live.screenPhase === "in_game") ? live.zeny : (p.lastZeny != null ? p.lastZeny : (live && live.zeny != null ? live.zeny : null));
      const mapName = (live && live.map) ? live.map : (p.isRunning ? "กำลังเข้าเกม..." : "รอเปิดจอ");
      const chText = (live && live.channel) ? ` • CH.${live.channel}` : "";
      const hpPct = (live && live.hpMax > 0) ? Math.min(100, Math.max(0, Math.round((live.hp / live.hpMax) * 100))) : (p.isRunning ? 100 : 0);
      const spPct = (live && live.spMax > 0) ? Math.min(100, Math.max(0, Math.round((live.sp / live.spMax) * 100))) : (p.isRunning ? 100 : 0);
      const hpText = (live && live.hpMax > 0) ? `${live.hp}/${live.hpMax}` : (p.isRunning ? "100%" : "--");
      const spText = (live && live.spMax > 0) ? `${live.sp}/${live.spMax}` : (p.isRunning ? "100%" : "--");
      const weightPct = (live && live.weightPct != null) ? `${live.weightPct}%` : "--";
      const afStatus = (live && live.autoFarmLv20 && live.autoFarmLv20.statusText)
        || (live && live.botStatus)
        || (isRec
          ? (p.isRunning ? `👑 ออนไลน์รอรับเงินเทรดอยู่ (แนล ${afConfig.tradeChannel || 1})` : "👑 ตัวรับเงินหลัก (กำลังเปิดจอค้างไว้รอรับเงิน...)")
          : (p.passed ? `✅ เทรดเงินสำเร็จแล้ว (${Number(p.tradedCoins || 0).toLocaleString()} เหรียญ)` : "⏳ รอคิวเปิดฟาร์ม..."));
      const isZeroRender = Boolean((p.windowState && p.windowState.zeroRender) || (live && live.zeroRender));
      const borderColor = isRec
        ? "rgba(251,191,36,0.65)"
        : (p.passed ? "rgba(16,185,129,0.65)" : (p.isRunning ? "rgba(56,189,248,0.55)" : "rgba(148,163,184,0.22)"));

      const passOverlayHtml = p.passed ? `
        <div style="position:absolute;inset:0;pointer-events:none;display:flex;align-items:center;justify-content:center;z-index:12;background:rgba(2,6,23,0.28);border-radius:14px;">
          <div style="transform:rotate(-16deg);background:linear-gradient(135deg,rgba(5,150,105,0.94),rgba(16,185,129,0.94));border:2.5px solid #a7f3d0;color:#ffffff;padding:8px 28px;border-radius:10px;font-size:22px;font-weight:900;letter-spacing:2px;box-shadow:0 12px 30px rgba(0,0,0,0.65),0 0 24px rgba(16,185,129,0.55);text-transform:uppercase;">
            ✅ PASS
            <div style="font-size:10.5px;font-weight:800;letter-spacing:0.3px;color:#d1fae5;text-align:center;margin-top:1px;">
              เทรด ${Number(p.tradedCoins || 0).toLocaleString()} เหรียญแล้ว
            </div>
          </div>
        </div>
      ` : "";

      return `
        <div class="profile-card" style="position:relative;overflow:hidden;border:1.5px solid ${borderColor};background:linear-gradient(160deg,rgba(15,23,42,0.96),rgba(9,14,28,0.96));border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:10px;">
          ${passOverlayHtml}
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
            <div>
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                <span style="padding:2px 8px;border-radius:6px;font-size:11px;font-weight:800;background:${isRec ? "rgba(245,158,11,0.22)" : "rgba(56,189,248,0.16)"};color:${isRec ? "#fde68a" : "#7dd3fc"};border:1px solid ${isRec ? "rgba(251,191,36,0.45)" : "rgba(56,189,248,0.35)"};">
                  ${isRec ? `👑 จอ ${idx + 1} • ตัวรับเงินเทรด` : `🌾 จอ ${idx + 1} • ตัวฟาร์ม`}
                </span>
                <span style="padding:2px 7px;border-radius:6px;font-size:10.5px;font-weight:700;background:rgba(148,163,184,0.15);color:#cbd5e1;">
                  🌐 ${escHtml(p.serverName || afConfig.serverName || "Nightfall")}
                </span>
                <span style="padding:2px 7px;border-radius:6px;font-size:10.5px;font-weight:800;background:${p.isRunning ? "rgba(16,185,129,0.2)" : "rgba(100,116,139,0.2)"};color:${p.isRunning ? "#34d399" : "#94a3b8"};">
                  ${p.isRunning ? `🟢 ออนไลน์ :${p.port || ""}` : "⚪ ปิดจอ"}
                </span>
              </div>
              <div style="font-size:15.5px;font-weight:800;color:#f8fafc;margin-top:6px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                <span>👤 ${escHtml(charName)}</span>
                <span style="font-size:12px;color:#38bdf8;font-weight:800;">Lv.${baseLv}/${afConfig.targetLevel || 20}${jobLv != null ? ` • Job.${jobLv}` : ""}</span>
                <span style="font-size:11px;color:#cbd5e1;background:rgba(51,65,85,0.65);padding:1px 6px;border-radius:5px;">${escHtml(className)}</span>
              </div>
            </div>
            <div style="text-align:right;flex-shrink:0;">
              <div style="font-size:14px;font-weight:900;color:#fbbf24;">💰 ${zeny != null ? Number(zeny).toLocaleString() : "0"}</div>
              <div style="font-size:11px;color:#94a3b8;">📍 ${escHtml(mapName)}${escHtml(chText)}</div>
            </div>
          </div>

          <!-- HP / SP / WEIGHT BARS (CLIENT CARD STATS) -->
          <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:8px;align-items:center;background:rgba(2,6,23,0.45);border:1px solid rgba(148,163,184,0.14);border-radius:8px;padding:6px 9px;font-size:10.5px;">
            <div>
              <div style="display:flex;justify-content:space-between;color:#fca5a5;font-weight:700;margin-bottom:2px;">
                <span>❤️ HP</span><span>${escHtml(hpText)}</span>
              </div>
              <div style="height:5px;background:rgba(15,23,42,0.9);border-radius:99px;overflow:hidden;">
                <div style="height:100%;width:${hpPct}%;background:linear-gradient(90deg,#ef4444,#f87171);"></div>
              </div>
            </div>
            <div>
              <div style="display:flex;justify-content:space-between;color:#93c5fd;font-weight:700;margin-bottom:2px;">
                <span>💧 SP</span><span>${escHtml(spText)}</span>
              </div>
              <div style="height:5px;background:rgba(15,23,42,0.9);border-radius:99px;overflow:hidden;">
                <div style="height:100%;width:${spPct}%;background:linear-gradient(90deg,#3b82f6,#60a5fa);"></div>
              </div>
            </div>
            <div style="text-align:right;color:#cbd5e1;font-weight:700;padding-left:4px;">
              <div>⚖️ น้ำหนัก</div>
              <div style="color:#f8fafc;">${escHtml(weightPct)}</div>
            </div>
          </div>

          <!-- EMAIL & PASSWORD BOX -->
          <div style="background:rgba(2,6,23,0.65);border:1px solid rgba(148,163,184,0.18);border-radius:9px;padding:8px 10px;font-size:11.5px;display:flex;justify-content:space-between;align-items:center;gap:8px;">
            <div style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
              <div style="color:#cbd5e1;">📧 <span style="font-family:monospace;color:#f8fafc;font-weight:700;">${escHtml(p.account || "-")}</span></div>
              <div style="color:#94a3b8;margin-top:2px;">🔑 <span style="font-family:monospace;color:#a7f3d0;">${escHtml(p.loginPassword || "********")}</span></div>
            </div>
            <div style="display:flex;gap:4px;flex-shrink:0;">
              <button type="button" class="btn btn-secondary btn-sm" style="padding:4px 7px;font-size:11px;" title="แก้ไข ID / รหัส / ชื่อตัวละคร / เซิร์ฟเวอร์" onclick="window.__afEditProfile('${p.id}')">
                ✏️ แก้ไข
              </button>
              <button type="button" class="btn btn-secondary btn-sm" style="padding:4px 7px;font-size:11px;" onclick="window.__afCopyCreds('${escHtml(p.account || "")}','${escHtml(p.loginPassword || "")}','${escHtml(charName)}')">
                📋 คัดลอก
              </button>
            </div>
          </div>

          <!-- LIVE BOT STATUS -->
          <div style="background:${isRec ? "rgba(245,158,11,0.12)" : "rgba(15,118,110,0.14)"};border:1px solid ${isRec ? "rgba(251,191,36,0.32)" : "rgba(20,184,166,0.28)"};border-radius:8px;padding:7px 10px;font-size:11.5px;color:${isRec ? "#fde68a" : "#99f6e4"};font-weight:600;">
            ${escHtml(afStatus)}
          </div>

          <!-- ACTION BUTTONS -->
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:auto;position:relative;z-index:15;">
            ${p.isRunning ? `
              <button type="button" class="btn btn-danger btn-sm" style="flex:1;padding:6px 8px;font-size:11.5px;" onclick="stopClient('${p.id}').then(()=>window.loadAutoFarmDashboard(true))">
                ⏹ ปิดจอ
              </button>
              <button type="button" class="btn btn-secondary btn-sm" style="padding:6px 8px;font-size:11.5px;" onclick="focusWindow('${p.id}')">
                🖥️ แสดงภาพ
              </button>
              <button type="button" class="btn btn-secondary btn-sm" style="padding:6px 8px;font-size:11.5px;" onclick="toggleWindow('${p.id}').then(()=>window.loadAutoFarmDashboard(true))">
                ${isZeroRender ? "⚡ เปิดกราฟิก" : "⚡ พักกราฟิก"}
              </button>
            ` : `
              <button type="button" class="btn btn-primary btn-sm" style="flex:1;padding:6px 8px;font-size:11.5px;" onclick="launchClient('${p.id}').then(()=>setTimeout(()=>window.loadAutoFarmDashboard(true),1200))">
                🚀 เปิดจอนี้
              </button>
            `}
            ${!isRec ? `
              <button type="button" class="btn btn-secondary btn-sm" style="padding:6px 8px;font-size:11px;" title="ตั้งโปรไฟล์นี้เป็นตัวรับเงินเทรด" onclick="window.__afSetReceiver('${p.id}')">
                👑 ตั้งรับเงิน
              </button>
            ` : ""}
            ${p.passed ? `
              <button type="button" class="btn btn-secondary btn-sm" style="padding:6px 8px;font-size:11px;color:#fcd34d;" title="ล้างสถานะ PASS เพื่อนำกลับเข้าคิวฟาร์มใหม่" onclick="window.__afResetPass('${p.id}')">
                🔄 รีเซ็ต PASS
              </button>
            ` : ""}
            <button type="button" class="btn btn-danger btn-sm" style="padding:6px 8px;font-size:11px;" title="ลบโปรไฟล์นี้" onclick="window.__afDeleteProfile('${p.id}','${escHtml(charName)}')">
              🗑️
            </button>
          </div>
        </div>
      `;
    }).join("");
  }

  window.__afEditProfile = async function (profileId) {
    const p = afProfiles.find(x => x.id === profileId);
    if (!p) return;
    const newAccount = window.prompt("📧 แก้ไข E-mail / ID (เว้นว่างเพื่อให้บอทสุ่มสมัครใหม่):", p.account || "");
    if (newAccount === null) return;
    const newPass = window.prompt("🔑 แก้ไขรหัสผ่าน:", p.loginPassword || "");
    if (newPass === null) return;
    const newChar = window.prompt("👤 แก้ไขชื่อตัวละคร:", p.lastCharName || p.charName || "");
    if (newChar === null) return;
    const newServer = window.prompt("🌐 เซิร์ฟเวอร์ (Nightfall, Moonlight, Stardust, Sunflare):", p.serverName || afConfig.serverName || "Nightfall");
    if (newServer === null) return;
    const res = await fetch(`${API_BASE}/api/autofarm/profiles/${encodeURIComponent(profileId)}/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        account: newAccount.trim(),
        loginPassword: newPass.trim(),
        charName: newChar.trim(),
        serverName: newServer.trim() || "Nightfall"
      })
    }).then(r => r.json());
    if (res && res.success) {
      if (typeof showToast === "function") showToast("✅ บันทึกข้อมูลโปรไฟล์เรียบร้อยแล้ว", "success");
      await loadAutoFarmDashboard(true);
    }
  };

  window.__afCopyCreds = function (email, pass, charName) {
    const txt = `${email}:${pass} (${charName})`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).catch(() => {});
    }
    if (typeof showToast === "function") showToast(`📋 คัดลอก ${txt} แล้ว`, "info");
  };

  window.__afSetReceiver = async function (profileId) {
    await saveAutoFarmConfig({ receiverProfileId: profileId });
  };

  window.__afResetPass = async function (profileId) {
    const res = await fetch(`${API_BASE}/api/autofarm/profiles/${encodeURIComponent(profileId)}/reset-pass`, {
      method: "POST"
    }).then(r => r.json());
    if (res && res.success) {
      if (typeof showToast === "function") showToast("🔄 รีเซ็ตสถานะ PASS เรียบร้อยแล้ว", "success");
      await loadAutoFarmDashboard(true);
    }
  };

  window.__afDeleteProfile = async function (profileId, charName) {
    if (!window.confirm(`ยืนยันลบโปรไฟล์ "${charName}" ออกจากหน้า Auto Farm หรือไม่?`)) return;
    const res = await fetch(`${API_BASE}/api/autofarm/profiles/${encodeURIComponent(profileId)}`, {
      method: "DELETE"
    }).then(r => r.json());
    if (res && res.success) {
      if (typeof showToast === "function") showToast(`🗑️ ลบโปรไฟล์ "${charName}" แล้ว`, "info");
      await loadAutoFarmDashboard(true);
    }
  };

  async function loadAutoFarmDashboard(force = false) {
    if (afLoadBusy && !force) return;
    afLoadBusy = true;
    try {
      const res = await fetch(`${API_BASE}/api/autofarm/state`, { cache: "no-store" }).then(r => r.json());
      if (res && res.success) {
        afConfig = res.config || afConfig;
        afProfiles = Array.isArray(res.profiles) ? res.profiles : [];
        renderAutoFarmDashboard();
      }
    } catch (_) {
    } finally {
      afLoadBusy = false;
    }
  }

  window.loadAutoFarmDashboard = loadAutoFarmDashboard;

  setInterval(() => {
    const activeTab = localStorage.getItem("manager.activeTab");
    if (activeTab === "autofarm" || (afConfig && afConfig.running)) {
      loadAutoFarmDashboard(false);
    }
  }, 2500);
})();

(() => {
  let saved = null;
  try { saved = localStorage.getItem("manager.activeTab"); } catch (e) {}
  if (saved && document.querySelector(`.tab-pane[data-pane="${saved}"]`)) switchMainTab(saved);
})();

function selectSendersForReceiverIp(receiverProfileId) {
  const rec = currentProfiles.find(p => p.id === receiverProfileId);
  const recIp = rec ? getProfileIpGroupKey(rec) : null;
  selectedSenderIds.clear();
  unselectedSenderIds.clear();
  for (const p of currentProfiles) {
    if (p.id === receiverProfileId || !p.isRunning || !isProfilePremium(p)) continue;
    if (!recIp || getProfileIpGroupKey(p) === recIp) {
      selectedSenderIds.add(p.id);
    } else {
      unselectedSenderIds.add(p.id);
    }
  }
}

function initZenyConsolidationEvents() {
  // Main Tab Navigation Listeners
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.onclick = () => {
      const tabName = btn.getAttribute("data-tab");
      if (tabName) switchMainTab(tabName);
    };
  });

  const sameIpCb = document.getElementById("cb-consolidate-same-ip-only");
  if (sameIpCb) {
    try {
      sameIpCb.checked = localStorage.getItem("pm_consolidate_same_ip_only") === "true";
    } catch (e) {}
    sameIpCb.onchange = (e) => {
      const enabled = Boolean(e.target.checked);
      setConsolidateSameIpOnly(enabled);
      if (enabled && selectedReceiverProfileId) {
        selectSendersForReceiverIp(selectedReceiverProfileId);
        const rec = currentProfiles.find(p => p.id === selectedReceiverProfileId);
        const ip = rec ? getProfileIpGroupKey(rec) : "-";
        showToast(`🛡️ กรองเฉพาะจอในวง IP เดียวกับตัวรับ (${ip}) แล้ว`, "info");
      } else {
        unselectedSenderIds.clear();
        currentProfiles.forEach(p => {
          if (p.id !== selectedReceiverProfileId && p.isRunning && isProfilePremium(p)) {
            selectedSenderIds.add(p.id);
          }
        });
      }
      updateZenyConsolidationView();
    };
  }

  const round100kCb = document.getElementById("cb-consolidate-round-100k");
  if (round100kCb) {
    try {
      round100kCb.checked = localStorage.getItem("pm_consolidate_round_100k") === "true";
    } catch (e) {}
    round100kCb.onchange = (e) => {
      const enabled = Boolean(e.target.checked);
      setConsolidateRound100k(enabled);
      updateZenyConsolidationView();
      showToast(
        enabled
          ? "✂️ เปิดโหมดตัดเศษหลักหมื่น (โอนเฉพาะหลักแสน เช่น 11,564,555 ➜ 11,500,000) แล้ว"
          : "💰 ปิดโหมดตัดเศษหลักหมื่น (โอนตามยอดจริงหลังหักเงินสำรอง)",
        "info"
      );
    };
  }

  const minSelectInput = document.getElementById("zeny-min-select-input");
  const btnSelectMin = document.getElementById("btn-zeny-select-min");
  if (minSelectInput) {
    try {
      const savedMin = localStorage.getItem("pm_zeny_min_select_amount");
      if (savedMin !== null && savedMin !== "") {
        const parsed = parseZenyInputAmount(savedMin);
        minSelectInput.value = parsed > 0 ? parsed.toLocaleString() : "1,000,000";
      }
    } catch (e) {}
    minSelectInput.addEventListener("blur", () => {
      const parsed = parseZenyInputAmount(minSelectInput.value);
      if (parsed > 0) minSelectInput.value = parsed.toLocaleString();
    });
  }

  const applyMinZenySelection = () => {
    const minVal = minSelectInput ? parseZenyInputAmount(minSelectInput.value) : 1000000;
    if (minSelectInput && minVal > 0) {
      minSelectInput.value = minVal.toLocaleString();
      try { localStorage.setItem("pm_zeny_min_select_amount", String(minVal)); } catch (e) {}
    }
    const sameIpOnly = isConsolidateSameIpOnly();
    const rec = currentProfiles.find(p => p.id === selectedReceiverProfileId);
    const recIp = rec ? getProfileIpGroupKey(rec) : null;
    selectedSenderIds.clear();
    unselectedSenderIds.clear();
    let matchedCount = 0;
    currentProfiles.forEach(p => {
      if (p.id === selectedReceiverProfileId || !p.isRunning || !isProfilePremium(p)) return;
      const sameIpOk = !sameIpOnly || !recIp || getProfileIpGroupKey(p) === recIp;
      const z = Number(p.liveState?.zeny) || 0;
      if (sameIpOk && z > minVal) {
        selectedSenderIds.add(p.id);
        matchedCount++;
      } else {
        unselectedSenderIds.add(p.id);
      }
    });
    updateZenyConsolidationView();
    showToast(
      `💰 เลือกเฉพาะจอที่มีเงินมากกว่า ${minVal.toLocaleString()} z จำนวน ${matchedCount} จอ เรียบร้อยแล้ว`,
      matchedCount > 0 ? "success" : "warning"
    );
  };

  if (btnSelectMin) {
    btnSelectMin.onclick = applyMinZenySelection;
  }
  if (minSelectInput) {
    minSelectInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        applyMinZenySelection();
      }
    });
  }

  const recSelect = document.getElementById("zeny-receiver-select");
  if (recSelect) {
    recSelect.onchange = (e) => {
      const chosen = currentProfiles.find(p => p.id === e.target.value);
      if (!chosen || !isProfilePremium(chosen)) {
        showToast("⚠️ เลือกได้เฉพาะตัวละครที่มีสถานะ 👑 Premium เท่านั้น", "warning");
        updateZenyConsolidationView();
        return;
      }
      selectedReceiverProfileId = e.target.value;
      selectedSenderIds.delete(selectedReceiverProfileId);
      if (isConsolidateSameIpOnly()) {
        selectSendersForReceiverIp(selectedReceiverProfileId);
      }
      updateZenyConsolidationView();
    };
  }

  const btnSelectAllIps = document.getElementById("btn-zeny-select-all-ips");
  if (btnSelectAllIps) {
    btnSelectAllIps.onclick = () => {
      setConsolidateSameIpOnly(false);
      unselectedSenderIds.clear();
      selectedSenderIds.clear();
      currentProfiles.forEach(p => {
        if (p.id !== selectedReceiverProfileId && p.isRunning && isProfilePremium(p)) {
          selectedSenderIds.add(p.id);
        }
      });
      updateZenyConsolidationView();
      showToast(`🌐 เลือกทุกจอที่มี Premium ออนไลน์ครบทุกวง IP (${selectedSenderIds.size} จอ) เรียบร้อยแล้ว`, "success");
    };
  }

  const btnSelectSameIp = document.getElementById("btn-zeny-select-same-ip");
  if (btnSelectSameIp) {
    btnSelectSameIp.onclick = () => {
      if (!selectedReceiverProfileId) return;
      setConsolidateSameIpOnly(true);
      selectSendersForReceiverIp(selectedReceiverProfileId);
      updateZenyConsolidationView();
      const rec = currentProfiles.find(p => p.id === selectedReceiverProfileId);
      const ip = rec ? getProfileIpGroupKey(rec) : "-";
      showToast(`🛡️ เลือกเฉพาะจอในวง IP เดียวกับตัวรับ (${ip} · ${selectedSenderIds.size} จอ)`, "info");
    };
  }

  const selectAllCb = document.getElementById("zeny-select-all-checkbox");
  if (selectAllCb) {
    selectAllCb.onchange = (e) => {
      const checked = e.target.checked;
      if (checked && isConsolidateSameIpOnly()) {
        // When user clicks "เลือกจอที่ส่งเงินทั้งหมด", unlock same-IP restriction so all screens across all IPs can be selected
        setConsolidateSameIpOnly(false);
      }
      const sameIpOnly = isConsolidateSameIpOnly();
      const rec = currentProfiles.find(p => p.id === selectedReceiverProfileId);
      const recIp = rec ? getProfileIpGroupKey(rec) : null;
      currentProfiles.forEach(p => {
        const sameIpOk = !sameIpOnly || !recIp || getProfileIpGroupKey(p) === recIp;
        if (p.id !== selectedReceiverProfileId && p.isRunning && isProfilePremium(p) && sameIpOk) {
          if (checked) {
            selectedSenderIds.add(p.id);
            unselectedSenderIds.delete(p.id);
          } else {
            selectedSenderIds.delete(p.id);
            unselectedSenderIds.add(p.id);
          }
        } else {
          selectedSenderIds.delete(p.id);
        }
      });
      updateZenyConsolidationView();
    };
  }

  const tbody = document.getElementById("zeny-senders-tbody");
  if (tbody) {
    tbody.onchange = (e) => {
      const cb = e.target.closest(".zeny-sender-cb");
      if (cb) {
        const pid = cb.dataset.profileId;
        const prof = currentProfiles.find(p => p.id === pid);
        if (!prof || !isProfilePremium(prof)) {
          cb.checked = false;
          selectedSenderIds.delete(pid);
          showToast("⚠️ เลือกได้เฉพาะตัวละครที่มีสถานะ 👑 Premium เท่านั้น", "warning");
          return;
        }
        if (cb.checked) {
          const rec = currentProfiles.find(p => p.id === selectedReceiverProfileId);
          const recIp = rec ? getProfileIpGroupKey(rec) : null;
          if (isConsolidateSameIpOnly() && recIp && getProfileIpGroupKey(prof) !== recIp) {
            setConsolidateSameIpOnly(false);
            showToast("🌐 ปลดล็อกโหมดจำกัดวง IP เพื่อให้เลือกโอนข้ามวง IP ได้แล้ว", "info");
          }
          selectedSenderIds.add(pid);
          unselectedSenderIds.delete(pid);
        } else {
          selectedSenderIds.delete(pid);
          unselectedSenderIds.add(pid);
        }
        updateZenyConsolidationView();
      }
    };
  }

  const btnClaimMarket = document.getElementById("btn-claim-market-all");
  if (btnClaimMarket) {
    btnClaimMarket.onclick = async () => {
      try {
        btnClaimMarket.disabled = true;
        btnClaimMarket.innerHTML = `<span>⏳</span> กำลังรับของ...`;
        const res = await fetch(`${API_BASE}/api/market/claim-all`, { method: "POST" });
        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch(pe) {
          throw new Error(`เซิร์ฟเวอร์ยังไม่ได้รีสตาร์ทหรือตอบกลับไม่ถูกต้อง (${res.status}): กรุณารีเฟรชหน้าเว็บ (Ctrl + F5)`);
        }
        if (data.success) {
          showToast("🛒 ส่งคำสั่งรับของและเงินจากตลาดกลางทุกจอเรียบร้อย!", "success");
          setTimeout(fetchProfiles, 1500);
        } else {
          showToast(`⚠️ ข้อผิดพลาด: ${data.error || 'ล้มเหลว'}`, "warning");
        }
      } catch(err) {
        showToast(`❌ ข้อผิดพลาด: ${err.message}`, "error");
      } finally {
        btnClaimMarket.disabled = false;
        btnClaimMarket.innerHTML = `<span class="icon">🛒</span> รับไอเทมจากตลาดทุกจอ`;
      }
    };
  }

  const btnStartConsolidation = document.getElementById("btn-start-consolidation");
  const btnStopConsolidation = document.getElementById("btn-stop-consolidation");
  const btnStartIpGroups = document.getElementById("btn-start-ip-groups-consolidation");
  const ipGroupsListEl = document.getElementById("zeny-ip-groups-list");
  const progressSection = document.getElementById("zeny-progress-section");

  initConsolidationItemTradeUI();

  // Helper to stop a single IP group or all tasks
  const stopConsolidationTaskApi = async (opts = {}) => {
    const targetIp = opts && opts.ip ? String(opts.ip) : null;
    const targetTaskId = opts && opts.taskId ? String(opts.taskId) : null;
    const confirmMsg = targetIp
      ? `คุณต้องการหยุดการรวมเงินเฉพาะของวง IP [${targetIp}] ใช่หรือไม่?\n(วง IP อื่นที่กำลังเทรดอยู่จะทำงานต่อไปตามปกติ)`
      : "คุณต้องการหยุดกระบวนการรวมเงินทั้งหมดทุกวง IP ใช่หรือไม่?";
    if (!confirm(confirmMsg)) return;
    try {
      const res = await fetch(`${API_BASE}/api/consolidation/stop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip: targetIp, taskId: targetTaskId })
      }).then(r => r.json());
      showToast((res && res.message) || "⏹️ สั่งหยุดกระบวนการรวมเงินเรียบร้อย", "warning");
      pollConsolidationStatus();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // Helper to trigger consolidation API (supports Multi-Task parallel IP groups)
  const triggerConsolidationApi = async (payload, startMsg) => {
    try {
      if (btnStartConsolidation) {
        btnStartConsolidation.disabled = true;
        btnStartConsolidation.innerHTML = `<span class="icon">⏳</span> กำลังเริ่มรวมเงิน...`;
      }
      if (progressSection) {
        progressSection.style.display = "block";
        try { progressSection.scrollIntoView({ behavior: "smooth", block: "nearest" }); } catch (e) {}
      }
      const logsBox = document.getElementById("zeny-logs-box");
      if (logsBox) {
        const entryHtml = `<div class="zeny-log-entry info"><span class="log-time">${new Date().toLocaleTimeString('th-TH')}</span> ⏳ ${escapeHTML(startMsg)}</div>`;
        if (isConsolidationRunning) {
          logsBox.insertAdjacentHTML("beforeend", entryHtml);
          logsBox.scrollTop = logsBox.scrollHeight;
        } else {
          logsBox.innerHTML = entryHtml;
        }
      }
      const res = await fetch(`${API_BASE}/api/consolidation/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, roundHundredK: isConsolidateRound100k() })
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (pe) {
        throw new Error(`เซิร์ฟเวอร์ยังไม่ได้รีสตาร์ทหรือตอบกลับไม่ถูกต้อง (${res.status}): กรุณารีเฟรชหน้าเว็บ (Ctrl + F5)`);
      }
      if (data.success) {
        isConsolidationRunning = true;
        if (progressSection) progressSection.style.display = "block";
        if (btnStopConsolidation) btnStopConsolidation.style.display = "inline-flex";
        showToast(data.message || "🚀 เริ่มต้นระบบรวมเงินเรียบร้อยแล้ว", "info");
        startConsolidationPolling();
        updateZenyConsolidationView();
      } else {
        alert(data.error || "ไม่สามารถเริ่มการรวมเงินได้");
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์: " + err.message);
    } finally {
      if (btnStartConsolidation) {
        btnStartConsolidation.disabled = false;
        btnStartConsolidation.innerHTML = `<span class="icon">🚀</span> เริ่มต้นรวมเงิน`;
      }
      updateZenyConsolidationView();
    }
  };

  const activeTasksGridEl = document.getElementById("zeny-active-tasks-grid");
  if (activeTasksGridEl) {
    activeTasksGridEl.onclick = async (e) => {
      const btnStopTask = e.target.closest("[data-stop-task-ip]");
      if (!btnStopTask) return;
      await stopConsolidationTaskApi({
        ip: btnStopTask.dataset.stopTaskIp,
        taskId: btnStopTask.dataset.stopTaskId || null
      });
    };
  }

  if (ipGroupsListEl) {
    ipGroupsListEl.onchange = (e) => {
      const sel = e.target.closest(".ip-group-receiver-select");
      if (!sel) return;
      const ip = sel.dataset.ip;
      const chosenId = sel.value;
      if (ip && chosenId) {
        ipGroupReceiverMap[ip] = chosenId;
        saveIpGroupReceiverMap();
        if (isConsolidateSameIpOnly()) {
          const curRec = currentProfiles.find(p => p.id === selectedReceiverProfileId);
          if (curRec && getProfileIpGroupKey(curRec) === ip) {
            selectedReceiverProfileId = chosenId;
            selectSendersForReceiverIp(chosenId);
          }
        }
        updateZenyConsolidationView();
      }
    };

    ipGroupsListEl.onclick = async (e) => {
      const btnSelect = e.target.closest(".btn-select-ip-group");
      if (btnSelect) {
        const ip = btnSelect.dataset.ip;
        const groups = buildIpConsolidationGroups();
        const grp = groups.find(g => g.ip === ip);
        if (!grp || !grp.receiver) {
          showToast("⚠️ ไม่มีตัวรับเงินที่มี Premium ในวง IP นี้", "warning");
          return;
        }
        selectedReceiverProfileId = grp.receiver.id;
        setConsolidateSameIpOnly(true);
        selectSendersForReceiverIp(grp.receiver.id);
        updateZenyConsolidationView();
        showToast(`🎯 เลือกวง IP [${ip}] (ตัวรับ: ${grp.receiver.name} · ผู้โอน ${grp.senders.length} จอ)`, "success");
        return;
      }

      const btnRunSingle = e.target.closest(".btn-start-single-ip-group");
      if (btnRunSingle) {
        const ip = btnRunSingle.dataset.ip;
        if (btnRunSingle.dataset.running === "1") {
          await stopConsolidationTaskApi({ ip });
          return;
        }
        const groups = buildIpConsolidationGroups();
        const grp = groups.find(g => g.ip === ip);
        if (!grp || !grp.canConsolidate || !grp.receiver) {
          alert(`วง IP [${ip}] ยังไม่มีตัวรับหรือผู้โอนที่ออนไลน์และมี 👑 Premium พร้อมโอน`);
          return;
        }
        const recName = grp.receiver.liveState?.charName || grp.receiver.name;
        const keepZeny = getConsolidationKeepZeny();
        const tradeItemsOn = Boolean(consolidationItemSettings.tradeOnConsolidate);
        const tradeItemsNames = Array.isArray(consolidationItemSettings.items) && consolidationItemSettings.items.length > 0
          ? consolidationItemSettings.items
          : ["Enchant Rune"];
        const parallelNote = isConsolidationRunning
          ? `\n⚡ โหมด Multi-Task: จะทำงานขนานไปพร้อมกับวง IP อื่นที่กำลังเทรดอยู่ทันที (แยก Channel อัตโนมัติไม่ชนกัน)`
          : "";
        if (!confirm(`คุณต้องการเริ่มรวมเงินเฉพาะในวง IP [${ip}]\nจาก ${grp.senders.length} จอ -> เข้าตัวรับ [${recName}] (ยอดโอน ~${grp.transferableZeny.toLocaleString()} z) ใช่หรือไม่?\n\n🛡️ ปลอดภัยสูงสุด: โอนเฉพาะจอที่ใช้ IP ${ip} เดียวกันเท่านั้น${parallelNote}`)) {
          return;
        }
        await triggerConsolidationApi({
          receiverProfileId: grp.receiver.id,
          senderProfileIds: grp.senders.map(s => s.id),
          keepZeny,
          sameIpOnly: true,
          storeOnlyEnabled: Boolean(consolidationItemSettings.storeOnlyEnabled),
          tradeOnConsolidate: tradeItemsOn,
          items: tradeItemsNames
        }, `กำลังเริ่มรวมเงินเฉพาะในวง IP [${ip}] (${grp.senders.length} จอ -> ${recName})...`);
      }
    };
  }

  if (btnStartIpGroups) {
    btnStartIpGroups.onclick = async () => {
      const activeTasksList = (lastConsolidationState && lastConsolidationState.running && Array.isArray(lastConsolidationState.activeTasks))
        ? lastConsolidationState.activeTasks
        : [];
      const runningIpSet = new Set(activeTasksList.map(t => String(t.ip)));
      const groups = buildIpConsolidationGroups().filter(g => g.canConsolidate && !runningIpSet.has(String(g.ip)));
      if (groups.length === 0) {
        alert("ไม่พบวง IP ที่ว่างและพร้อมรวมเงินในขณะนี้");
        return;
      }
      const keepZeny = getConsolidationKeepZeny();
      const tradeItemsOn = Boolean(consolidationItemSettings.tradeOnConsolidate);
      const tradeItemsNames = Array.isArray(consolidationItemSettings.items) && consolidationItemSettings.items.length > 0
        ? consolidationItemSettings.items
        : ["Enchant Rune"];
      const summaryLines = groups.map((g, i) => {
        const rName = g.receiver.liveState?.charName || g.receiver.name;
        return `${i + 1}. วง IP [${g.ip}]: ${g.senders.length} จอ -> ตัวรับ [${rName}] (~${g.transferableZeny.toLocaleString()} z)`;
      }).join("\n");
      const totalZenyAllGroups = groups.reduce((s, g) => s + g.transferableZeny, 0);
      if (!confirm(`🌐 ยืนยันการรวมเงินแบบ Multi-Task แยกตามวง IP พร้อมกัน (${groups.length} วง IP · ยอดโอนรวม ~${totalZenyAllGroups.toLocaleString()} z)\n\n${summaryLines}\n\n⚡ ระบบจะรันทุกวง IP ขนานกันพร้อมกันทันที โดยแยก Channel ของแต่ละวง IP อัตโนมัติไม่ให้ชนกัน และไม่โอนข้าม IP เด็ดขาด`)) {
        return;
      }
      await triggerConsolidationApi({
        keepZeny,
        sameIpOnly: true,
        ipGroups: groups.map(g => ({
          ip: g.ip,
          receiverProfileId: g.receiver.id,
          senderProfileIds: g.senders.map(s => s.id)
        })),
        storeOnlyEnabled: Boolean(consolidationItemSettings.storeOnlyEnabled),
        tradeOnConsolidate: tradeItemsOn,
        items: tradeItemsNames
      }, `กำลังเริ่มต้นรวมเงินแบบ Multi-Task แยกตามวง IP พร้อมกัน (${groups.length} วง IP)...`);
    };
  }

  if (btnStartConsolidation) {
    btnStartConsolidation.onclick = async () => {
      const recProfile = currentProfiles.find(p => p.id === selectedReceiverProfileId);
      if (!selectedReceiverProfileId || !recProfile || !isProfilePremium(recProfile)) {
        alert("กรุณาเลือกตัวรับเงิน (Receiver) ที่มีสถานะ 👑 Premium ก่อน (การเทรดโอนเงินใช้ได้เฉพาะตัวที่มี Premium เท่านั้น)");
        return;
      }
      const sameIpOnly = isConsolidateSameIpOnly();
      const recIp = getProfileIpGroupKey(recProfile);
      const activeProfileIdsSet = new Set(
        (lastConsolidationState && lastConsolidationState.running && Array.isArray(lastConsolidationState.activeProfileIds))
          ? lastConsolidationState.activeProfileIds
          : []
      );
      if (activeProfileIdsSet.has(selectedReceiverProfileId)) {
        alert(`ตัวรับเงิน (${recProfile.name}) กำลังดำเนินการรวมเงินอยู่ในขณะนี้ กรุณาเลือกตัวรับในวง IP อื่นที่ว่างอยู่`);
        return;
      }
      const senderList = Array.from(selectedSenderIds).filter(id => {
        if (id === selectedReceiverProfileId) return false;
        if (activeProfileIdsSet.has(id)) return false;
        const sp = currentProfiles.find(p => p.id === id);
        if (!sp || !sp.isRunning || !isProfilePremium(sp)) return false;
        if (sameIpOnly && getProfileIpGroupKey(sp) !== recIp) return false;
        return true;
      });
      if (senderList.length === 0) {
        alert(sameIpOnly
          ? `ไม่มีจอผู้โอนที่ว่างอยู่ในวง IP เดียวกับตัวรับ (${recIp}) และมีสถานะ 👑 Premium`
          : "กรุณาเลือกจอผู้โอนที่ว่างและมีสถานะ 👑 Premium อย่างน้อย 1 จอ");
        return;
      }

      const recName = recProfile?.liveState?.charName || recProfile?.name || selectedReceiverProfileId;
      const keepZeny = getConsolidationKeepZeny();
      const tradeItemsOn = Boolean(consolidationItemSettings.tradeOnConsolidate);
      const tradeItemsNames = Array.isArray(consolidationItemSettings.items) && consolidationItemSettings.items.length > 0
        ? consolidationItemSettings.items
        : ["Enchant Rune"];
      const sameIpNote = sameIpOnly
        ? `🛡️ โหมดจำกัดเฉพาะในวง IP เดียวกัน: [${recIp}]\n`
        : "";
      const itemConfirmNote = tradeItemsOn
        ? `📦 เบิกไอเทมจากคลังมาเทรดรวมด้วย: ${tradeItemsNames.join(", ")}\n   (ทุกจอจะแวะขายขยะเคลียร์น้ำหนัก → เบิกหินจากคลัง → เทรดพร้อมเงิน และตัวรับจะฝากเข้าคลังอัตโนมัติ)\n`
        : "";
      if (!confirm(`คุณต้องการเริ่มต้นรวมเงินจาก ${senderList.length} จอ เข้าตัวหลัก [${recName}] ใช่หรือไม่?\n\n${sameIpNote}${keepZeny > 0 ? `💰 แต่ละจอจะเหลือเงินติดตัวไว้ ${keepZeny.toLocaleString()} z\n` : '💰 โอนเงินทั้งหมดของแต่ละจอ\n'}${itemConfirmNote}(ทุกจอที่เลือกจะหยุดบอท วาร์ปกลับเมืองหลวง และเรียงคิวเทรด)`)) {
        return;
      }

      await triggerConsolidationApi({
        receiverProfileId: selectedReceiverProfileId,
        senderProfileIds: senderList,
        keepZeny,
        sameIpOnly,
        storeOnlyEnabled: Boolean(consolidationItemSettings.storeOnlyEnabled),
        tradeOnConsolidate: tradeItemsOn,
        items: tradeItemsNames
      }, `กำลังตรวจสอบสถานะ Premium และเริ่มระบบรวมเงิน (${senderList.length} จอ)...`);
    };
  }

  if (btnStopConsolidation) {
    btnStopConsolidation.onclick = async () => {
      await stopConsolidationTaskApi({});
    };
  }
}

// ==========================================
// STASH-ONLY & CONSOLIDATION ITEM TRADE UI
// ==========================================
const PRESET_CONSOLIDATION_ITEMS = [
  { name: "Enchant Rune", icon: "✨" },
  { name: "Accessory Enchant Rune", icon: "💍" },
  { name: "Rough Elunium", icon: "🪨" },
  { name: "Elunium", icon: "🛡️" },
  { name: "Enriched Elunium", icon: "💎" },
  { name: "Oridecon", icon: "⚔️" },
  { name: "Phracon", icon: "🔩" },
  { name: "Emveretarcon", icon: "🔶" }
];

let consolidationItemSettings = {
  storeOnlyEnabled: false,
  tradeOnConsolidate: false,
  items: ["Enchant Rune"]
};

function renderConsolidationItemTradeUI() {
  const cbStoreOnly = document.getElementById("cb-stash-only-enabled");
  const cbTradeItems = document.getElementById("cb-trade-items-consolidate");
  const boxStoreOnly = document.getElementById("zst-box-store-only");
  const boxTradeItems = document.getElementById("zst-box-trade-items");
  const badgeStoreOnly = document.getElementById("badge-stash-only-state");
  const badgeTradeItems = document.getElementById("badge-trade-items-state");
  const chipsContainer = document.getElementById("zst-items-chips-container");

  const storeOn = Boolean(consolidationItemSettings.storeOnlyEnabled);
  const tradeOn = Boolean(consolidationItemSettings.tradeOnConsolidate);
  const selectedList = Array.isArray(consolidationItemSettings.items) && consolidationItemSettings.items.length > 0
    ? consolidationItemSettings.items
    : ["Enchant Rune"];
  const selectedLower = new Set(selectedList.map(x => String(x || "").trim().toLowerCase()));

  if (cbStoreOnly) cbStoreOnly.checked = storeOn;
  if (cbTradeItems) cbTradeItems.checked = tradeOn;
  if (boxStoreOnly) boxStoreOnly.classList.toggle("is-active-emerald", storeOn);
  if (boxTradeItems) boxTradeItems.classList.toggle("is-active-purple", tradeOn);

  if (badgeStoreOnly) {
    badgeStoreOnly.textContent = storeOn ? "🟢 เปิดเก็บคลังอย่างเดียว" : "ปิดอยู่";
    badgeStoreOnly.classList.toggle("on-emerald", storeOn);
  }
  if (badgeTradeItems) {
    badgeTradeItems.textContent = tradeOn ? "🟣 เบิกคลังมาเทรดด้วย" : "โอนเฉพาะเงิน";
    badgeTradeItems.classList.toggle("on-purple", tradeOn);
  }

  if (chipsContainer) {
    const presetLower = new Set(PRESET_CONSOLIDATION_ITEMS.map(p => p.name.toLowerCase()));
    const customItems = selectedList.filter(x => !presetLower.has(String(x || "").trim().toLowerCase()));

    const presetHtml = PRESET_CONSOLIDATION_ITEMS.map(p => {
      const isSelected = selectedLower.has(p.name.toLowerCase());
      return `<button type="button" class="zst-item-chip ${isSelected ? 'active' : ''}" data-item-name="${escapeHTML(p.name)}" title="คลิกเพื่อเลือก/ยกเลิก ${escapeHTML(p.name)}">
        <span>${isSelected ? '✅' : p.icon}</span>
        <span>${escapeHTML(p.name)}</span>
      </button>`;
    }).join("");

    const customHtml = customItems.map(name => {
      return `<button type="button" class="zst-item-chip active" data-item-name="${escapeHTML(name)}" title="คลิกเพื่อเอา ${escapeHTML(name)} ออกจากรายการ">
        <span>✅</span>
        <span>${escapeHTML(name)}</span>
        <span class="zst-chip-remove">×</span>
      </button>`;
    }).join("");

    chipsContainer.innerHTML = presetHtml + customHtml;
  }
}

async function saveAndSyncConsolidationItemSettings(patch = {}, toastLabel = "") {
  consolidationItemSettings = {
    ...consolidationItemSettings,
    ...patch
  };
  if (!Array.isArray(consolidationItemSettings.items) || consolidationItemSettings.items.length === 0) {
    consolidationItemSettings.items = ["Enchant Rune"];
  }
  renderConsolidationItemTradeUI();

  const syncPill = document.getElementById("zst-sync-status-pill");
  if (syncPill) syncPill.textContent = "⏳ กำลังซิงค์ไปทุกจอ...";

  try {
    const res = await fetch(`${API_BASE}/api/consolidation/item-settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(consolidationItemSettings)
    }).then(r => r.json());
    if (res && res.success && res.settings) {
      consolidationItemSettings = res.settings;
      renderConsolidationItemTradeUI();
      if (syncPill) {
        syncPill.textContent = `✅ ซิงค์แล้ว (${res.syncedClients || 0}/${res.totalChecked || 0} จอ)`;
      }
      if (toastLabel) {
        showToast(`${toastLabel} (ซิงค์ ${res.syncedClients || 0} จอ)`, "success");
      }
    }
  } catch (err) {
    if (syncPill) syncPill.textContent = "⚠️ ซิงค์ไม่สำเร็จ";
    console.warn("saveAndSyncConsolidationItemSettings error:", err);
  }
}

let consolidationItemTradeUIInitialized = false;
async function initConsolidationItemTradeUI() {
  if (consolidationItemTradeUIInitialized) return;
  consolidationItemTradeUIInitialized = true;

  const cbStoreOnly = document.getElementById("cb-stash-only-enabled");
  const cbTradeItems = document.getElementById("cb-trade-items-consolidate");
  const chipsContainer = document.getElementById("zst-items-chips-container");
  const customInput = document.getElementById("zst-custom-item-input");
  const btnAddCustom = document.getElementById("btn-zst-add-custom-item");

  if (cbStoreOnly) {
    cbStoreOnly.onchange = () => {
      const enabled = cbStoreOnly.checked;
      saveAndSyncConsolidationItemSettings(
        { storeOnlyEnabled: enabled },
        enabled
          ? `🔒 เปิดโหมดเก็บ [${consolidationItemSettings.items.join(", ")}] เข้าคลังอย่างเดียว (ห้ามขาย)`
          : "🔓 ปิดโหมดเก็บหินเข้าคลังอย่างเดียวแล้ว"
      );
    };
  }

  if (cbTradeItems) {
    cbTradeItems.onchange = () => {
      const enabled = cbTradeItems.checked;
      saveAndSyncConsolidationItemSettings(
        { tradeOnConsolidate: enabled },
        enabled
          ? `📦 เปิดเบิก [${consolidationItemSettings.items.join(", ")}] จากคลังมาเทรดรวมตอนรวมเงิน`
          : "💰 ตั้งค่าให้รวมเฉพาะเงิน Zeny อย่างเดียว"
      );
    };
  }

  if (chipsContainer) {
    chipsContainer.onclick = (e) => {
      const btn = e.target.closest(".zst-item-chip");
      if (!btn) return;
      const itemName = (btn.dataset.itemName || "").trim();
      if (!itemName) return;
      const cur = Array.isArray(consolidationItemSettings.items) ? [...consolidationItemSettings.items] : ["Enchant Rune"];
      const idx = cur.findIndex(x => String(x || "").trim().toLowerCase() === itemName.toLowerCase());
      if (idx >= 0) {
        if (cur.length <= 1) {
          showToast("⚠️ ต้องเลือกไอเทมไว้อย่างน้อย 1 รายการ", "warning");
          return;
        }
        cur.splice(idx, 1);
      } else {
        cur.push(itemName);
      }
      saveAndSyncConsolidationItemSettings({ items: cur }, `🎯 อัปเดตรายการไอเทม: ${cur.join(", ")}`);
    };
  }

  const handleAddCustom = () => {
    if (!customInput) return;
    const val = (customInput.value || "").trim();
    if (!val) return;
    const cur = Array.isArray(consolidationItemSettings.items) ? [...consolidationItemSettings.items] : ["Enchant Rune"];
    if (!cur.some(x => String(x || "").trim().toLowerCase() === val.toLowerCase())) {
      cur.push(val);
    }
    customInput.value = "";
    saveAndSyncConsolidationItemSettings({ items: cur }, `➕ เพิ่ม "${val}" ในรายการเก็บคลัง/เทรดรวมแล้ว`);
  };

  if (btnAddCustom) btnAddCustom.onclick = handleAddCustom;
  if (customInput) {
    customInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAddCustom();
      }
    });
  }

  renderConsolidationItemTradeUI();
  try {
    const res = await fetch(`${API_BASE}/api/consolidation/item-settings`).then(r => r.json());
    if (res && res.success && res.settings) {
      consolidationItemSettings = res.settings;
      renderConsolidationItemTradeUI();
    }
  } catch (e) {}
}

function startConsolidationPolling() {
  if (consolidationPollTimer) clearInterval(consolidationPollTimer);
  consolidationPollTimer = setInterval(pollConsolidationStatus, 900);
  pollConsolidationStatus();
}

async function pollConsolidationStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/consolidation/status`);
    const state = await res.json();
    if (!state.success) return;
    lastConsolidationState = state;

    const progressSection = document.getElementById("zeny-progress-section");
    if (state.status === 'running' || state.logs.length > 0) {
      if (progressSection) progressSection.style.display = "block";
    }

    const activeTasks = Array.isArray(state.activeTasks) ? state.activeTasks : [];
    const stepBadge = document.getElementById("zeny-current-step-badge");
    if (stepBadge) {
      stepBadge.innerText = activeTasks.length > 1
        ? `Multi-Task (${activeTasks.length} วง IP) · ขั้นที่ ${state.stepIndex || 1}/${state.totalSteps || 5}`
        : `ขั้นตอนที่ ${state.stepIndex || 1}/${state.totalSteps || 5}`;
    }

    const stepTitle = document.getElementById("zeny-current-step-title");
    if (stepTitle) stepTitle.innerText = state.step || "กำลังดำเนินการ...";

    document.querySelectorAll(".zeny-pipeline-step").forEach(el => {
      const stepNum = parseInt(el.dataset.step) || 0;
      el.classList.toggle("completed", stepNum < state.stepIndex);
      el.classList.toggle("active", stepNum === state.stepIndex);
    });

    const barFill = document.getElementById("zeny-progress-bar-fill");
    if (barFill) {
      const percent = Math.min(100, Math.round((state.stepIndex / (state.totalSteps || 5)) * 100));
      barFill.style.width = `${percent}%`;
    }

    const activeTasksGridEl = document.getElementById("zeny-active-tasks-grid");
    if (activeTasksGridEl) {
      if (state.running && activeTasks.length > 0) {
        activeTasksGridEl.style.display = "grid";
        const tasksHtml = activeTasks.map(t => {
          const recName = (t.receiver && t.receiver.name) ? t.receiver.name : "-";
          const chBadge = t.targetChannel
            ? `<span style="font-size: 10px; padding: 1px 6px; border-radius: 99px; background: rgba(56, 189, 248, 0.2); color: #7dd3fc; border: 1px solid rgba(56, 189, 248, 0.4); font-weight: 700;">📡 CH ${t.targetChannel}</span>`
            : "";
          const zenyTxt = Number(t.transferredZeny || 0) > 0 ? ` · <b style="color:#facc15;">+${Number(t.transferredZeny).toLocaleString()} z</b>` : "";
          return `
            <div style="background: rgba(15, 23, 42, 0.78); border: 1px solid rgba(52, 211, 153, 0.45); border-radius: 8px; padding: 8px 10px; display: flex; flex-direction: column; gap: 5px;">
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 6px; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 5px; flex-wrap: wrap;">
                  <span style="font-size: 10.5px; font-weight: 800; padding: 1px 6px; border-radius: 5px; background: rgba(168, 85, 247, 0.22); color: #e9d5ff; border: 1px solid rgba(168, 85, 247, 0.45); font-family: monospace;">🛡️ ${escapeHTML(String(t.ip || 'LOCAL'))}</span>
                  ${chBadge}
                </div>
                <button type="button" class="btn btn-danger btn-sm" data-stop-task-ip="${escapeHTML(String(t.ip || ''))}" data-stop-task-id="${escapeHTML(String(t.taskId || ''))}" style="font-size: 10px; padding: 2px 7px;">⏹️ หยุดวงนี้</button>
              </div>
              <div style="font-size: 11px; color: #e2e8f0; display: flex; justify-content: space-between; align-items: center; gap: 6px;">
                <span>👑 ตัวรับ: <b>${escapeHTML(recName)}</b></span>
                <span style="color: #6ee7b7; font-size: 10.5px;">ขั้น ${t.stepIndex || 1}/5 · โอนแล้ว ${t.completedSendersCount || 0}/${t.totalSenders || 0} จอ${zenyTxt}</span>
              </div>
              <div style="font-size: 10.5px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHTML(String(t.step || ''))}">
                ${escapeHTML(String(t.step || 'กำลังดำเนินการ...'))}
              </div>
            </div>
          `;
        }).join("");
        if (window.PmUiGuard) window.PmUiGuard.setHtmlIfChanged(activeTasksGridEl, tasksHtml);
        else if (activeTasksGridEl.innerHTML !== tasksHtml) activeTasksGridEl.innerHTML = tasksHtml;
      } else {
        activeTasksGridEl.style.display = "none";
        activeTasksGridEl.innerHTML = "";
      }
    }

    const logsBox = document.getElementById("zeny-logs-box");
    if (logsBox && Array.isArray(state.logs)) {
      logsBox.innerHTML = state.logs.map(log => {
        return `<div class="zeny-log-entry ${log.level || 'info'}"><span class="log-time">${escapeHTML(log.time)}</span> ${escapeHTML(log.text)}</div>`;
      }).join("");
      logsBox.scrollTop = logsBox.scrollHeight;
    }

    const btnStart = document.getElementById("btn-start-consolidation");
    const btnStop = document.getElementById("btn-stop-consolidation");
    if (state.running) {
      isConsolidationRunning = true;
      if (btnStart) btnStart.style.display = "inline-flex";
      if (btnStop) {
        btnStop.style.display = "inline-flex";
        btnStop.innerHTML = activeTasks.length > 1
          ? `<span class="icon">⏹️</span> หยุดทั้งหมด (${activeTasks.length} วง)`
          : `<span class="icon">⏹️</span> หยุดการรวมเงิน`;
      }
      if (!consolidationPollTimer) {
        consolidationPollTimer = setInterval(pollConsolidationStatus, 900);
      }
      updateZenyConsolidationView();
    } else {
      const wasRunning = isConsolidationRunning;
      isConsolidationRunning = false;
      if (btnStart) btnStart.style.display = "inline-flex";
      if (btnStop) btnStop.style.display = "none";
      if (wasRunning) updateZenyConsolidationView();
      if (state.status === "completed") {
        if (consolidationPollTimer) {
          clearInterval(consolidationPollTimer);
          consolidationPollTimer = null;
        }
        if (wasRunning) showToast("🎉 รวมเงินเสร็จสิ้นสมบูรณ์!", "success");
        fetchProfiles();
      } else if (state.status === "stopped" || state.status === "error") {
        if (consolidationPollTimer) {
          clearInterval(consolidationPollTimer);
          consolidationPollTimer = null;
        }
      }
    }
  } catch(e) {}
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initZenyConsolidationEvents);
} else {
  initZenyConsolidationEvents();
}

// ==========================================
// FLOATING NIGHTCAMP BOT MENU & CENTRAL CONTROL
// ==========================================
function formatNightcampLevelLine(state, profile) {
  const rawSavedClass = (profile?.charClass === 'Hunter' && !profile?.lastCharClass) ? '' : (profile?.lastCharClass || profile?.charClass || '');
  const cls = (state?.charClass && state.charClass !== 'Novice') ? state.charClass : (rawSavedClass || state?.charClass || 'Traveler');
  const bLv = state?.baseLv ?? null;
  const jLv = state?.jobLv ?? null;
  if (bLv != null && jLv != null) return `${cls} · Lv ${bLv} / Job ${jLv}`;
  if (bLv != null) return `${cls} · Lv ${bLv}`;
  return cls;
}

function renderNightcampServerOptions(selectedServer) {
  const cur = String(selectedServer || '');
  const opts = [
    { value: '', label: '🌐 อัตโนมัติ (เซิร์ฟแรกที่ว่าง)' },
    { value: 'Moonlight', label: 'S1 · Moonlight' },
    { value: 'Stardust', label: 'S2 · Stardust' },
    { value: 'Nightfall', label: 'S3 · Nightfall' },
    { value: 'Sunflare', label: 'S4 · Sunflare' }
  ];
  return opts.map(o => `<option value="${escapeHTML(o.value)}"${o.value === cur ? ' selected' : ''}>${escapeHTML(o.label)}</option>`).join('');
}

function getNightcampHudTemplate(profileId, clientData, profile) {
  const isCentral = (profileId === '__central__');
  const onlineCount = currentProfiles.filter(p => p.isRunning).length;
  const runningBots = currentProfiles.filter(p => p.isRunning && p.liveState?.isBotRunning).length;
  const state = clientData?.state || (profile?.isRunning ? profile?.liveState : null) || {};
  const auth = clientData?.authConfig || {};
  const savedEnabled = (auth.enabled !== undefined) ? !!auth.enabled : (profile?.autoLoginEnabled !== false);
  const savedServer = (auth.serverName !== undefined) ? String(auth.serverName || '') : String(profile?.serverName || '');
  const savedUser = (auth.username !== undefined) ? String(auth.username || '') : String(profile?.account || '');
  const savedPass = (auth.password !== undefined) ? String(auth.password || '') : String(profile?.loginPassword || '');
  const savedChar = (auth.charName !== undefined) ? String(auth.charName || '') : String(profile?.charName || '');
  const savedResume = (auth.autoResumeBot !== undefined) ? !!auth.autoResumeBot : Boolean(profile?.autoResumeBot);
  const isOnline = isCentral ? onlineCount > 0 : Boolean(profile?.isRunning);
  const isBotRunning = Boolean(clientData?.isBotRunning ?? state?.isBotRunning);
  const isZeroRender = Boolean(state?.zeroRender ?? profile?.windowState?.isHidden);
  const charDisplayName = isCentral
    ? `เมนูส่วนกลาง (${onlineCount} จอออนไลน์)`
    : (state?.charName || profile?.name || 'จอเกม Nightcamp');
  const lvLine = isCentral
    ? `บอททำงาน ${runningBots}/${onlineCount} จอ`
    : formatNightcampLevelLine(state, profile);
  const hpText = (typeof state?.hp === 'number')
    ? `${state.hp.toLocaleString()} / ${(state.hpMax || state.maxHp || state.hp).toLocaleString()}`
    : '-- / --';
  const spText = (typeof state?.sp === 'number')
    ? `${state.sp.toLocaleString()} / ${(state.spMax || state.sp).toLocaleString()}`
    : '-- / --';
  const authStatusText = state?.authStatus || (savedEnabled ? (savedServer ? `Auto-Login: พร้อม (${savedServer})` : 'Auto-Login: พร้อมใช้งาน') : 'Auto-Login: ปิดใช้งาน');

  return `
<div class="p-header" id="pelican-drag-handle" style="flex-direction: column; align-items: stretch; gap: 5px; ${isCentral ? 'background: linear-gradient(135deg, #78350f 0%, #451a03 100%); border-bottom: 1px solid rgba(250, 204, 21, 0.45);' : 'background: linear-gradient(135deg, rgba(14, 116, 144, 0.45), rgba(15, 23, 42, 0.95));'}">
  <div class="p-header-top" style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
    <div class="p-header-name" style="display:flex; align-items:center; gap:6px; min-width:0;">
      <span style="font-size: 13px;">${isCentral ? '🎛️' : '🌙'}</span>
      <span class="p-header-title" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; ${isCentral ? 'color: #fde047;' : 'color:#e0f2fe;'}">${escapeHTML(charDisplayName)}</span>
    </div>
    <div class="p-header-controls" style="display:flex; align-items:center; gap:6px;">
      <span class="pelican-toggle" onclick="toggleWebHudCollapse('${profileId}')" title="ย่อ/ขยาย" style="cursor:pointer; padding:0 4px;">−</span>
      <span class="pelican-close-btn" onclick="closeWebBotHUD('${profileId}')" title="ปิดหน้าต่าง" style="cursor:pointer; padding:0 4px;">✕</span>
    </div>
  </div>
  <div class="p-header-badges" style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
    <span id="p-nc-online-pill" style="font-size: 10px; background: ${isOnline ? 'rgba(16, 185, 129, 0.22)' : 'rgba(148, 163, 184, 0.16)'}; border: 1px solid ${isOnline ? 'rgba(52, 211, 153, 0.5)' : 'rgba(148, 163, 184, 0.35)'}; color: ${isOnline ? '#6ee7b7' : '#cbd5e1'}; padding: 1px 8px; border-radius: 999px; font-weight: 700;">${isCentral ? `ออนไลน์ ${onlineCount}/${currentProfiles.length} จอ` : (isOnline ? '🟢 ออนไลน์' : '⚫ ออฟไลน์')}</span>
    <span id="p-nc-lv-pill" style="font-size: 10px; background: rgba(56, 189, 248, 0.16); border: 1px solid rgba(56, 189, 248, 0.4); color: #7dd3fc; padding: 1px 8px; border-radius: 999px; font-weight: 700;">${escapeHTML(lvLine)}</span>
  </div>
</div>

<div class="p-body" id="pelican-content" style="display:flex; flex-direction:column; gap:8px; padding:10px; max-height:76vh; overflow-y:auto;">
  <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px; background:rgba(2, 6, 23, 0.65); border:1px solid rgba(148, 163, 184, 0.22); border-radius:7px; padding:3px;">
    <button type="button" id="p-nc-tab-bot" style="padding:6px 8px; border:0; border-radius:5px; font-size:11px; font-weight:700; cursor:pointer; background:rgba(14, 165, 233, 0.24); color:#38bdf8;">🚀 บอท</button>
    <button type="button" id="p-nc-tab-settings" style="padding:6px 8px; border:0; border-radius:5px; font-size:11px; font-weight:700; cursor:pointer; background:transparent; color:#94a3b8;">⚙️ ตั้งค่า</button>
  </div>

  <div id="p-nc-pane-bot" style="display:flex; flex-direction:column; gap:8px;">
    ${isCentral ? `
    <div style="background: rgba(250, 204, 21, 0.12); border: 1px solid rgba(250, 204, 21, 0.35); color: #fde68a; padding: 6px 8px; border-radius: 6px; font-size: 10px; line-height: 1.45;">
      🎛️ <b>เมนูส่วนกลาง Nightcamp:</b> สั่งเริ่ม/หยุดบอท พักกราฟิกทุกจอ หรือเข้าแท็บ ⚙️ ตั้งค่า เพื่อเลือก Server / สั่ง Auto-Login ทุกจอได้
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
      <button type="button" class="p-btn" id="p-btn-central-start-bot" style="margin: 0; font-size: 11px; padding: 8px 6px; font-weight: bold; border-radius: 6px; background: linear-gradient(135deg, #16a34a, #15803d); color: #fff; border: 1px solid #4ade80; cursor: pointer;">▶️ เริ่มบอททุกจอ</button>
      <button type="button" class="p-btn" id="p-btn-central-stop-bot" style="margin: 0; font-size: 11px; padding: 8px 6px; font-weight: bold; border-radius: 6px; background: linear-gradient(135deg, #dc2626, #b91c1c); color: #fff; border: 1px solid #f87171; cursor: pointer;">⏹️ หยุดบอททุกจอ</button>
    </div>
    <button type="button" class="p-btn" id="p-btn-central-zero-render" style="margin: 0; width: 100%; font-size: 11px; padding: 7px 8px; font-weight: bold; border-radius: 6px; background: rgba(56, 189, 248, 0.16); color: #7dd3fc; border: 1px solid rgba(56, 189, 248, 0.45); cursor: pointer;">⚡ สลับพักกราฟิกทุกจอ (Zero-Render)</button>
    ` : `
    <div style="background: rgba(2, 6, 23, 0.55); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 7px; padding: 7px 9px; display:flex; flex-direction:column; gap:4px; font-size:10.5px;">
      <div style="display:flex; justify-content:space-between; gap:6px;">
        <span style="color:#94a3b8;">อาชีพ/เลเวล:</span>
        <b id="p-nc-class-lv" style="color:#7dd3fc;">${escapeHTML(lvLine)}</b>
      </div>
      <div style="display:flex; justify-content:space-between; gap:6px;">
        <span style="color:#94a3b8;">สถานะบอท:</span>
        <b id="p-char-state" style="color:${isBotRunning ? '#4ade80' : '#facc15'};">${escapeHTML(state?.botStatus || (isOnline ? (isBotRunning ? '⚔️ บอทกำลังทำงาน' : '⏸️ ยืนรอ / แสตนด์บาย') : '⚫ ออฟไลน์'))}</b>
      </div>
      <div style="display:flex; justify-content:space-between; gap:6px;">
        <span style="color:#94a3b8;">Auto-Login:</span>
        <b id="p-nc-auth-status" style="color:#c4b5fd;">${escapeHTML(authStatusText)}</b>
      </div>
      <div style="display:flex; justify-content:space-between; gap:6px; border-top:1px solid rgba(255,255,255,0.06); padding-top:4px;">
        <span style="color:#fca5a5;">HP: <b id="p-nc-hp">${escapeHTML(hpText)}</b></span>
        <span style="color:#93c5fd;">SP: <b id="p-nc-sp">${escapeHTML(spText)}</b></span>
      </div>
    </div>

    <button type="button" class="p-btn" id="p-btn-toggle-bot" ${isOnline ? '' : 'disabled'} style="width: 100%; font-size: 12px; padding: 8px 10px; font-weight: bold; border-radius: 6px; cursor: ${isOnline ? 'pointer' : 'not-allowed'}; opacity: ${isOnline ? '1' : '0.55'};">${isBotRunning ? '⏹️ STOP BOT (หยุดทำงาน)' : '▶️ START BOT (เริ่มทำงาน)'}</button>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
      <button type="button" class="p-btn" id="p-btn-nc-zerorender" style="margin:0; font-size:10.5px; padding:6px; border-radius:6px; background:rgba(34,197,94,0.14); border:1px solid rgba(52,211,153,0.4); color:#6ee7b7; font-weight:700; cursor:pointer;">${isZeroRender ? '🖥️ แสดงภาพปกติ' : '⚡ พักกราฟิก'}</button>
      <button type="button" class="p-btn" id="p-btn-nc-focus" style="margin:0; font-size:10.5px; padding:6px; border-radius:6px; background:rgba(56,189,248,0.14); border:1px solid rgba(56,189,248,0.4); color:#7dd3fc; font-weight:700; cursor:pointer;">🔝 ดึงจอขึ้นบนสุด</button>
      <button type="button" class="p-btn" id="p-btn-nc-reload" style="margin:0; font-size:10.5px; padding:6px; border-radius:6px; background:rgba(245,158,11,0.14); border:1px solid rgba(251,191,36,0.4); color:#fde68a; font-weight:700; cursor:pointer;">🔄 รีเฟรชจอเกม</button>
      <button type="button" class="p-btn" id="p-btn-nc-edit" style="margin:0; font-size:10.5px; padding:6px; border-radius:6px; background:rgba(148,163,184,0.14); border:1px solid rgba(148,163,184,0.35); color:#e2e8f0; font-weight:700; cursor:pointer;">⚙️ แก้ไขโปรไฟล์</button>
    </div>

    <div class="p-card" style="border: 1px solid rgba(168, 85, 247, 0.42); background: linear-gradient(145deg, rgba(30, 17, 56, 0.65), rgba(15, 23, 42, 0.85)); border-radius: 7px; padding: 8px; display:flex; flex-direction:column; gap:6px;">
      <label style="display:flex; align-items:center; gap:5px; font-size:10.5px; font-weight:700; color:#86efac; cursor:pointer;" title="ใหญ่สุด: ทำเควส/บทเรียนอัตโนมัติทั้งหมด หากไม่ได้เปิด Plan Script ระบบจะหยุดรอให้คุณเลือกอาชีพเอง">
        <input type="checkbox" id="p-nc-smart-autoquest-enabled" ${state?.smartAutoQuestEnabled !== false ? 'checked' : ''} style="accent-color:#22c55e;">
        <span>🧭 เปิด Smart Auto-Quest (ทำเควสอัตโนมัติ - ใหญ่สุด)</span>
      </label>
      <label style="display:flex; align-items:center; gap:5px; font-size:10.5px; font-weight:700; color:#7dd3fc; cursor:pointer;" title="แก้บั๊ก AI ของเกมที่เดินวนของดรอป + วิ่งหาโซนเกิดมอนเควส + เคลียร์มอนแย่งจุดเกิด">
        <input type="checkbox" id="p-nc-upgrade-ai-enabled" ${state?.upgradeBotAiEnabled !== false ? 'checked' : ''} style="accent-color:#0ea5e9;">
        <span>🧠 Upgrade BOT AI (เก็บของไว/ไม่เดินวน/วิ่งหาโซนมอน)</span>
      </label>
      <label style="display:flex; align-items:center; gap:5px; font-size:10.5px; font-weight:700; color:#fda4af; cursor:pointer;" title="ตายแล้วกดกลับค่ายเกิดใหม่ทันที ไม่ต้องรอ 30 วินาที แล้วกลับไปทำเควส/แมพฟาร์มต่อ">
        <input type="checkbox" id="p-nc-autorespawn-enabled" ${state?.autoRespawnEnabled !== false ? 'checked' : ''} style="accent-color:#f43f5e;">
        <span>⚰️ เปิด Auto-Respawn (ตายเกิดใหม่ทันที + ลุยต่อ)</span>
      </label>
      <label style="display:flex; align-items:center; gap:5px; font-size:10.5px; font-weight:700; color:#c084fc; cursor:pointer;" title="สวมใส่อาวุธ ชุดเกราะ หมวก และประดับในกระเป๋าที่ดีกว่าเดิมโดยคำนวณตามสายอาชีพและ Stats ของตัวละครอัตโนมัติทันทีที่ดรอป">
        <input type="checkbox" id="p-nc-smartgear-enabled" ${state?.smartGearEnabled !== false ? 'checked' : ''} style="accent-color:#a855f7;">
        <span>⚔️ เปิด Smart Gear (สวมใส่อุปกรณ์ตามสายอาชีพ/Stats อัตโนมัติ)</span>
      </label>
      <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; border-top:1px solid rgba(255,255,255,0.08); padding-top:5px;">
        <label style="display:flex; align-items:center; gap:5px; font-size:10.5px; font-weight:700; color:#fde68a; cursor:pointer;">
          <input type="checkbox" id="p-nc-autosell-enabled" ${state?.autoSellEnabled !== false ? 'checked' : ''} style="accent-color:#f59e0b;">
          <span>💰 Auto-Sell เมื่อนน.เกิน:</span>
        </label>
        <select id="p-nc-autosell-pct" style="background:#090d16; border:1px solid rgba(251,191,36,0.5); color:#fde68a; border-radius:4px; font-size:10px; font-weight:700; padding:2px 5px; cursor:pointer;">
          ${[45, 50, 55, 60, 65, 70, 75, 80].map(pct => `<option value="${pct}" ${Number(state?.autoSellWeightPct || 65) === pct ? 'selected' : ''}>${pct}%</option>`).join('')}
        </select>
      </div>
      <div style="display:flex; flex-direction:column; gap:4px; border-top:1px solid rgba(255,255,255,0.08); padding-top:5px; background:rgba(2,6,23,0.4); border-radius:5px; padding:6px;">
        <span style="font-size:10px; font-weight:700; color:#6ee7b7;">🧪 ระบบยา (ต้มยาจากขยะมอนลด 50% ➔ ขยะหมดซื้อในเมือง):</span>
        <div style="display:flex; align-items:center; justify-content:space-between; gap:4px;">
          <label style="display:flex; align-items:center; gap:4px; font-size:10px; font-weight:700; color:#fca5a5; cursor:pointer;">
            <input type="checkbox" id="p-nc-pot-hp-en" ${state?.potionConfig?.hpEnabled !== false ? 'checked' : ''} style="accent-color:#ef4444;">
            <span>HP</span>
          </label>
          <select id="p-nc-pot-hp-size" style="flex:1; background:#090d16; border:1px solid rgba(248,113,113,0.45); color:#fecaca; border-radius:4px; font-size:9.5px; padding:2px 4px;">
            <option value="red" ${(state?.potionConfig?.hpSize || 'red') === 'red' ? 'selected' : ''}>ขวดเล็ก (HP+60)</option>
            <option value="red_m" ${state?.potionConfig?.hpSize === 'red_m' ? 'selected' : ''}>ขวดกลาง (HP+220)</option>
            <option value="red_l" ${state?.potionConfig?.hpSize === 'red_l' ? 'selected' : ''}>ขวดใหญ่ (HP+900)</option>
            <option value="auto" ${state?.potionConfig?.hpSize === 'auto' ? 'selected' : ''}>อัตโนมัติตาม Lv</option>
          </select>
          <span style="font-size:9.5px; color:#cbd5e1;">&lt;</span>
          <input type="number" id="p-nc-pot-hp-min" value="${state?.potionConfig?.hpMin ?? 15}" title="กลับไปซื้อ/คราฟเมื่อต่ำกว่า" style="width:38px; background:#090d16; border:1px solid rgba(248,113,113,0.45); color:#fff; border-radius:4px; font-size:9.5px; padding:2px 4px;">
          <span style="font-size:9.5px; color:#cbd5e1;">➔</span>
          <input type="number" id="p-nc-pot-hp-target" value="${state?.potionConfig?.hpTarget ?? 100}" title="จำนวนซื้อ/คราฟให้ครบ" style="width:42px; background:#090d16; border:1px solid rgba(248,113,113,0.45); color:#fff; border-radius:4px; font-size:9.5px; padding:2px 4px;">
        </div>
        <div style="display:flex; align-items:center; justify-content:space-between; gap:4px;">
          <label style="display:flex; align-items:center; gap:4px; font-size:10px; font-weight:700; color:#93c5fd; cursor:pointer;">
            <input type="checkbox" id="p-nc-pot-sp-en" ${state?.potionConfig?.spEnabled !== false ? 'checked' : ''} style="accent-color:#3b82f6;">
            <span>Mana</span>
          </label>
          <select id="p-nc-pot-sp-size" style="flex:1; background:#090d16; border:1px solid rgba(96,165,250,0.45); color:#bfdbfe; border-radius:4px; font-size:9.5px; padding:2px 4px;">
            <option value="blue" ${(state?.potionConfig?.spSize || 'blue') === 'blue' ? 'selected' : ''}>ขวดเล็ก (SP+60)</option>
            <option value="blue_m" ${state?.potionConfig?.spSize === 'blue_m' ? 'selected' : ''}>ขวดกลาง (SP+200)</option>
            <option value="blue_l" ${state?.potionConfig?.spSize === 'blue_l' ? 'selected' : ''}>ขวดใหญ่ (SP+390)</option>
            <option value="auto" ${state?.potionConfig?.spSize === 'auto' ? 'selected' : ''}>อัตโนมัติตาม Lv</option>
          </select>
          <span style="font-size:9.5px; color:#cbd5e1;">&lt;</span>
          <input type="number" id="p-nc-pot-sp-min" value="${state?.potionConfig?.spMin ?? 10}" title="กลับไปซื้อ/คราฟเมื่อต่ำกว่า" style="width:38px; background:#090d16; border:1px solid rgba(96,165,250,0.45); color:#fff; border-radius:4px; font-size:9.5px; padding:2px 4px;">
          <span style="font-size:9.5px; color:#cbd5e1;">➔</span>
          <input type="number" id="p-nc-pot-sp-target" value="${state?.potionConfig?.spTarget ?? 60}" title="จำนวนซื้อ/คราฟให้ครบ" style="width:42px; background:#090d16; border:1px solid rgba(96,165,250,0.45); color:#fff; border-radius:4px; font-size:9.5px; padding:2px 4px;">
        </div>
      </div>
      <div style="display:flex; flex-direction:column; gap:3px; border-top:1px solid rgba(255,255,255,0.08); padding-top:5px;">
        <span style="font-size:10px; font-weight:700; color:#e2e8f0;">🗺️ แมพฟาร์มประจำ (เมื่อปิด Auto-Quest):</span>
        <select id="p-nc-target-farm-map" style="width:100%; background:#090d16; border:1px solid rgba(56,189,248,0.45); color:#fff; border-radius:4px; font-size:10px; padding:3px 5px; cursor:pointer;">
          ${[
            ['auto', '⚡ อัตโนมัติตามเลเวล (Auto Level Map)'],
            ['farm', '[Lv.1-10] ไร่ฟักทอง (farm)'],
            ['batcave', '[Lv.8-16] ถ้ำค้างคาว (batcave)'],
            ['meadow', '[Lv.8-18] ทุ่งหญ้าแสงจันทร์ (meadow)'],
            ['apiary', '[Lv.10-18] สวนรังผึ้ง (apiary)'],
            ['cornmaze', '[Lv.12-20] เขาวงกตข้าวโพด (cornmaze)'],
            ['farm2', '[Lv.12-22] ไร่ฟักทองในลึก (farm2)'],
            ['marsh', '[Lv.15-25] บึงหมอกพิษ (marsh)'],
            ['graveyard', '[Lv.18-30] เนินสุสานโบสถ์ร้าง (graveyard)'],
            ['meadow2', '[Lv.18-28] ทุ่งหญ้าแสงจันทร์ชั้นใน (meadow2)'],
            ['antmine1', '[Lv.20-30] เหมืองมด ชั้น 1 (antmine1)'],
            ['woods', '[Lv.26-38] ป่าลึกเงามืด (woods)'],
            ['antmine2', '[Lv.28-38] เหมืองมด ชั้น 2 (antmine2)'],
            ['graveyard2', '[Lv.30-42] สุสานโบสถ์ร้างชั้นใน (graveyard2)'],
            ['burnt', '[Lv.35-48] ป่าไฟไหม้ (burnt)'],
            ['woods2', '[Lv.38-50] ป่าลึกชั้นใน (woods2)'],
            ['crypt1', '[Lv.40-52] สุสานใต้ดิน ชั้น 1 (crypt1)'],
            ['salt', '[Lv.44-56] ทุ่งเกลือ (salt)'],
            ['wind', '[Lv.45-58] ที่ราบสูงสายลม (wind)'],
            ['peak', '[Lv.46-60] ยอดเขาหิมะ (peak)'],
            ['avalanche', '[Lv.50-65] หุบเขาหิมะถล่ม (avalanche)'],
            ['swamp', '[Lv.55-70] บึงมรณะ (swamp)'],
            ['canyon', '[Lv.60-75] หุบผาหินแดง (canyon)'],
            ['volcano', '[Lv.70-85] ปากปล่องภูเขาไฟ (volcano)']
          ].map(([id, label]) => `<option value="${id}" ${(state?.targetFarmMap || 'auto') === id ? 'selected' : ''}>${label}</option>`).join('')}
        </select>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; border-top:1px solid rgba(255,255,255,0.08); padding-top:5px;">
        <label style="display:flex; align-items:center; gap:5px; font-size:10.5px; font-weight:700; color:#e9d5ff; cursor:pointer;">
          <input type="checkbox" id="p-nc-plan-enabled" ${state?.planScriptEnabled !== false ? 'checked' : ''} style="accent-color:#a855f7;">
          <span>📜 เปิด Plan Script</span>
        </label>
        <button type="button" id="p-btn-nc-open-plan" style="padding:3px 8px; font-size:10px; font-weight:700; border-radius:5px; border:1px solid rgba(56,189,248,0.45); background:rgba(14,165,233,0.22); color:#7dd3fc; cursor:pointer;">✏️ จัดการแผน</button>
      </div>
      <div style="font-size:10px; color:#cbd5e1; display:flex; justify-content:space-between; gap:6px;">
        <span>แผนที่ใช้:</span>
        <b id="p-nc-plan-name" style="color:#38bdf8; max-width:170px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHTML(state?.planName || '🌱 แผนตัวอย่าง Lv.1–50')}</b>
      </div>
      <div id="p-nc-plan-task" style="font-size:9.5px; color:#6ee7b7; background:rgba(2,6,23,0.55); border:1px solid rgba(255,255,255,0.07); border-radius:5px; padding:4px 6px;">
        ${escapeHTML(state?.planTask || '🧭 พร้อมทำเควสหลัก + เปลี่ยนอาชีพ + ย้ายแมพตามแผนเมื่อกด START BOT')}
      </div>
    </div>
    `}

    <div class="p-card" style="border: 1px solid rgba(56, 189, 248, 0.32); background: rgba(2, 6, 23, 0.65); border-radius: 7px; padding: 8px; display:flex; flex-direction:column; gap:6px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:10.5px; font-weight:700; color:#7dd3fc;">🔍 Nightcamp Runtime Debug</span>
      </div>
      <button type="button" class="p-btn" id="p-btn-nc-inspect" style="width:100%; background:#0284c7; border:1px solid #38bdf8; color:#fff; font-size:10.5px; font-weight:700; padding:6px; border-radius:5px; cursor:pointer;">🔍 Inspect Runtime ในจอเกม</button>
      <pre id="p-nc-inspect-out" style="margin:0; padding:6px; background:#060a14; border:1px solid rgba(148,163,184,0.2); border-radius:5px; color:#cbd5e1; font-family:var(--font-mono,monospace); font-size:9.5px; line-height:1.35; max-height:140px; overflow:auto; white-space:pre-wrap; word-break:break-word;">กดปุ่มด้านบนเพื่อดูโครงสร้าง WebSocket / Canvas / UI ของจอเกม</pre>
    </div>
  </div>

  <div id="p-nc-pane-settings" style="display:none; flex-direction:column; gap:8px;">
    ${isCentral ? `
    <div class="p-card" style="border: 1px solid rgba(168, 85, 247, 0.55); background: rgba(30, 17, 56, 0.62); border-radius: 8px; padding: 10px; display:flex; flex-direction:column; gap:8px;">
      <label style="display:flex; align-items:center; gap:7px; font-size:11.5px; font-weight:700; color:#e9d5ff; cursor:pointer;">
        <input type="checkbox" id="p-central-auth-enabled" checked style="accent-color:#a855f7;">
        <span>🔐 เปิดระบบ Auto-Login ทุกจอที่ออนไลน์</span>
      </label>
      <div style="font-size:10px; color:#cbd5e1; line-height:1.45;">
        กำหนด Server และ Auto-Resume ให้ทุกจอที่เปิดอยู่พร้อมกัน (แต่ยังคงใช้ ID / PS / ตัวละคร แยกตามแต่ละโปรไฟล์)
      </div>
      <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
        <span style="font-size:10.5px; color:#e2e8f0; white-space:nowrap;">เลือก Server:</span>
        <select id="p-central-auth-server" style="flex:1; min-width:0; background:#090d16; border:1px solid rgba(192,132,252,0.5); color:#fff; border-radius:5px; font-size:11px; padding:5px 7px;">
          ${renderNightcampServerOptions('')}
        </select>
      </div>
      <label style="display:flex; align-items:center; gap:6px; font-size:10.5px; color:#4ade80; cursor:pointer;">
        <input type="checkbox" id="p-central-auth-resume" style="accent-color:#22c55e;">
        <span>เริ่มทำงานบอทต่อทันทีเมื่อ Login สำเร็จ (Auto-Resume)</span>
      </label>
      <button type="button" class="p-btn" id="p-btn-central-apply-auth" style="width:100%; background:#6d28d9; border:1px solid #a855f7; color:#fff; font-size:11px; font-weight:700; padding:7px; border-radius:6px; cursor:pointer;">💾 บันทึกการตั้งค่าไปยังทุกจอที่ออนไลน์</button>
      <button type="button" class="p-btn" id="p-btn-central-test-login" style="width:100%; background:linear-gradient(135deg,#9333ea,#7e22ce); border:1px solid #c084fc; color:#fff; font-size:11px; font-weight:700; padding:8px; border-radius:6px; cursor:pointer;">🔑 ทดสอบเข้าสู่ระบบทันทีทุกจอ (Test Login)</button>
    </div>
    ` : `
    <div class="p-card" style="border: 1px solid rgba(168, 85, 247, 0.55); background: rgba(30, 17, 56, 0.62); border-radius: 8px; padding: 10px; display:flex; flex-direction:column; gap:7px;">
      <label style="display:flex; align-items:center; gap:7px; font-size:11.5px; font-weight:700; color:#e9d5ff; cursor:pointer;">
        <input type="checkbox" id="p-auth-enabled" ${savedEnabled ? 'checked' : ''} style="accent-color:#a855f7;">
        <span>🔐 เปิดระบบ Auto-Login (เข้าเกมอัตโนมัติ)</span>
      </label>
      <div style="font-size:10px; color:#cbd5e1; line-height:1.45;">
        เมื่อเกมหลุดหรือเด้งไปหน้าเลือกเซิร์ฟ/Login บอทจะเลือก Server, กรอก ID/PS และเลือกตัวละครเข้าเกมให้อัตโนมัติ
      </div>
      <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
        <span style="font-size:10.5px; color:#e2e8f0; white-space:nowrap;">เลือก Server:</span>
        <select id="p-auth-server" style="flex:1; min-width:0; background:#090d16; border:1px solid rgba(192,132,252,0.5); color:#fff; border-radius:5px; font-size:11px; padding:5px 7px;">
          ${renderNightcampServerOptions(savedServer)}
        </select>
      </div>
      <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
        <span style="font-size:10.5px; color:#e2e8f0; white-space:nowrap;">ชื่อผู้ใช้ (ID):</span>
        <input type="text" id="p-auth-user" value="${escapeHTML(savedUser)}" placeholder="Email หรือ Username" autocomplete="off" style="flex:1; min-width:0; background:#090d16; border:1px solid rgba(192,132,252,0.5); color:#fff; border-radius:5px; font-size:11px; padding:5px 7px;">
      </div>
      <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
        <span style="font-size:10.5px; color:#e2e8f0; white-space:nowrap;">รหัสผ่าน (PS):</span>
        <div style="display:flex; align-items:center; gap:4px; flex:1; min-width:0;">
          <input type="text" id="p-auth-pass" value="${escapeHTML(savedPass)}" placeholder="รหัสผ่าน (เว้นว่าง = ไม่มีรหัส)" autocomplete="off" style="flex:1; min-width:0; background:#090d16; border:1px solid rgba(192,132,252,0.5); color:#fff; border-radius:5px; font-size:11px; padding:5px 7px;">
          <button type="button" id="p-auth-toggle-pass" style="background:#0f172a; border:1px solid #64748b; color:#cbd5e1; border-radius:5px; font-size:11px; padding:4px 7px; cursor:pointer;" title="แสดง/ซ่อนรหัสผ่าน">👁</button>
        </div>
      </div>
      <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
        <span style="font-size:10.5px; color:#e2e8f0; white-space:nowrap;">เลือกตัวละคร (Char):</span>
        <input type="text" id="p-auth-char" value="${escapeHTML(savedChar)}" placeholder="ชื่อตัวละคร (เว้นว่าง = ตัวแรก)" autocomplete="off" style="flex:1; min-width:0; background:#090d16; border:1px solid rgba(192,132,252,0.5); color:#fff; border-radius:5px; font-size:11px; padding:5px 7px;">
      </div>
      <label style="display:flex; align-items:center; gap:6px; font-size:10px; color:#4ade80; cursor:pointer;">
        <input type="checkbox" id="p-auth-resume" ${savedResume ? 'checked' : ''} style="accent-color:#22c55e;">
        <span>เริ่มทำงานบอทต่อทันทีเมื่อ Login สำเร็จ (Auto-Resume)</span>
      </label>
      <button type="button" class="p-btn" id="p-btn-test-login" style="width:100%; margin-top:2px; background:linear-gradient(135deg,#9333ea,#7e22ce); border:1px solid #c084fc; color:#fff; font-size:11px; font-weight:700; padding:8px; border-radius:6px; cursor:pointer;">🔑 ทดสอบเข้าสู่ระบบทันที (Test Login)</button>
    </div>
    `}
  </div>
</div>
`;
}

function openCentralBotHUD() {
  return openWebBotHUD('__central__');
}
window.openCentralBotHUD = openCentralBotHUD;

document.addEventListener('DOMContentLoaded', () => {
  const centralBtn = document.getElementById('btn-open-central-bot-menu');
  if (centralBtn) centralBtn.addEventListener('click', () => openCentralBotHUD());
});
if (document.readyState !== 'loading') {
  const centralBtn = document.getElementById('btn-open-central-bot-menu');
  if (centralBtn) centralBtn.onclick = () => openCentralBotHUD();
}

async function saveWebHudAuthSettings(profileId, hudEl, { triggerNow = false, silent = false, btn = null } = {}) {
  const hudObj = activeWebHuds[profileId];
  const curProf = currentProfiles.find(p => p.id === profileId) || hudObj?.profile;
  if (!curProf || !hudEl) return false;
  const enabled = Boolean(hudEl.querySelector('#p-auth-enabled')?.checked);
  const serverName = String(hudEl.querySelector('#p-auth-server')?.value || '').trim();
  const username = String(hudEl.querySelector('#p-auth-user')?.value || '').trim();
  const password = String(hudEl.querySelector('#p-auth-pass')?.value || '').trim();
  const charName = String(hudEl.querySelector('#p-auth-char')?.value || '').trim();
  const autoResumeBot = Boolean(hudEl.querySelector('#p-auth-resume')?.checked);

  if (hudObj) hudObj.savingAuth = true;
  const origText = btn ? btn.innerText : '';
  if (btn) {
    btn.disabled = true;
    btn.innerText = triggerNow ? '⏳ กำลังสั่ง Login...' : '⏳ กำลังบันทึก...';
  }
  try {
    const res = await fetch(`${API_BASE}/api/profiles/${profileId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: curProf.name,
        account: username,
        loginPassword: password,
        serverName,
        charName,
        autoLoginEnabled: enabled,
        autoResumeBot,
        debugPort: curProf.debugPort,
        autoRegister: !username && !password
      })
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || j.success === false) {
      showToast('❌ ' + (j.error || 'บันทึกการตั้งค่า Auto-Login ไม่สำเร็จ'), 'error');
      return false;
    }

    Object.assign(curProf, {
      account: username,
      loginPassword: password,
      serverName,
      charName,
      autoLoginEnabled: enabled,
      autoResumeBot
    });
    if (hudObj?.data?.authConfig) {
      Object.assign(hudObj.data.authConfig, {
        enabled,
        serverName,
        username,
        password,
        charName,
        autoResumeBot
      });
    }

    if (curProf.isRunning) {
      await sendWebHudAction(profileId, {
        type: 'update-auth',
        config: {
          enabled,
          serverName,
          username,
          password,
          charName,
          autoResumeBot,
          clearPassword: !password,
          triggerNow: Boolean(triggerNow)
        }
      });
    } else if (triggerNow) {
      showToast('💾 บันทึกการตั้งค่าแล้ว (เปิดจอเกมเพื่อรัน Test Login)', 'warning');
      return true;
    }

    if (triggerNow) {
      showToast(`🔑 กำลังสั่ง Auto-Login (${serverName || 'อัตโนมัติ'}${charName ? ' / ' + charName : ''})`, 'success');
    } else if (!silent) {
      showToast('✅ บันทึกการตั้งค่า Auto-Login แล้ว', 'success');
    }
    return true;
  } catch (err) {
    showToast('❌ ' + err.message, 'error');
    return false;
  } finally {
    if (hudObj) hudObj.savingAuth = false;
    if (btn) {
      btn.disabled = false;
      btn.innerText = origText;
    }
  }
}

async function applyCentralAuthSettings(hudEl, { triggerNow = false, btn = null } = {}) {
  const online = currentProfiles.filter(p => p.isRunning);
  if (online.length === 0) {
    showToast('⚠️ ไม่มีจอเกมที่กำลังออนไลน์', 'warning');
    return;
  }
  const enabled = Boolean(hudEl.querySelector('#p-central-auth-enabled')?.checked);
  const serverName = String(hudEl.querySelector('#p-central-auth-server')?.value || '').trim();
  const autoResumeBot = Boolean(hudEl.querySelector('#p-central-auth-resume')?.checked);
  const origText = btn ? btn.innerText : '';
  if (btn) {
    btn.disabled = true;
    btn.innerText = triggerNow ? '⏳ กำลังสั่ง Login ทุกจอ...' : '⏳ กำลังส่งค่าทุกจอ...';
  }
  try {
    await Promise.allSettled(online.map(p => fetch(`${API_BASE}/api/profiles/${p.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: p.name,
        account: p.account || '',
        loginPassword: p.loginPassword || '',
        serverName,
        charName: p.charName || '',
        autoLoginEnabled: enabled,
        autoResumeBot,
        debugPort: p.debugPort
      })
    })));
    online.forEach(p => Object.assign(p, { serverName, autoLoginEnabled: enabled, autoResumeBot }));
    await sendWebHudAction('__central__', {
      type: 'update-auth',
      config: { enabled, serverName, autoResumeBot, triggerNow: Boolean(triggerNow) }
    });
    if (typeof fetchProfiles === 'function') fetchProfiles();
  } catch (err) {
    showToast('❌ ' + err.message, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = origText;
    }
  }
}

async function openWebBotHUD(profileId) {
  const isCentral = (profileId === '__central__');
  const profile = isCentral
    ? { id: '__central__', name: 'เมนูส่วนกลาง (Nightcamp)' }
    : currentProfiles.find(p => p.id === profileId);
  if (!profile) return;

  if (activeWebHuds[profileId]) {
    const existing = activeWebHuds[profileId].el;
    existing.style.zIndex = ++topHudZIndex;
    existing.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return;
  }

  let clientData = null;
  if (!isCentral && profile.isRunning) {
    try {
      const res = await fetch(API_BASE + '/api/profiles/' + profileId + '/client-data');
      const json = await res.json();
      if (json.success) clientData = json.data;
    } catch (_) {}
  }

  const container = document.getElementById("web-huds-container") || document.body;
  const hudCount = Object.keys(activeWebHuds).length;
  const topPos = Math.max(40, Math.min(window.innerHeight - 450, 100 + (hudCount * 30) % 250));
  const leftPos = Math.max(20, Math.min(window.innerWidth - 320, 60 + (hudCount * 35) % 400));

  const hudEl = document.createElement("div");
  hudEl.className = "pelican-hud-web" + (isCentral ? " is-central-hud" : "");
  hudEl.id = 'pelican-hud-' + profileId;
  hudEl.style.top = topPos + 'px';
  hudEl.style.left = leftPos + 'px';
  hudEl.style.zIndex = ++topHudZIndex;
  if (isCentral) {
    hudEl.style.borderColor = "rgba(250, 204, 21, 0.65)";
    hudEl.style.boxShadow = "0 20px 50px rgba(0, 0, 0, 0.75), 0 0 24px rgba(245, 158, 11, 0.3)";
  }

  hudEl.innerHTML = getNightcampHudTemplate(profileId, clientData, profile);
  container.appendChild(hudEl);

  activeWebHuds[profileId] = {
    el: hudEl,
    activeTab: 'bot',
    data: clientData,
    profile: profile,
    isCentral: isCentral
  };

  // Tab switchers (🚀 บอท | ⚙️ ตั้งค่า)
  const tabBotBtn = hudEl.querySelector('#p-nc-tab-bot');
  const tabSetBtn = hudEl.querySelector('#p-nc-tab-settings');
  const paneBot = hudEl.querySelector('#p-nc-pane-bot');
  const paneSet = hudEl.querySelector('#p-nc-pane-settings');
  const switchTab = (tab) => {
    if (activeWebHuds[profileId]) activeWebHuds[profileId].activeTab = tab;
    const isBot = (tab === 'bot');
    if (paneBot) paneBot.style.display = isBot ? 'flex' : 'none';
    if (paneSet) paneSet.style.display = isBot ? 'none' : 'flex';
    if (tabBotBtn) {
      tabBotBtn.style.background = isBot ? 'rgba(14, 165, 233, 0.24)' : 'transparent';
      tabBotBtn.style.color = isBot ? '#38bdf8' : '#94a3b8';
    }
    if (tabSetBtn) {
      tabSetBtn.style.background = isBot ? 'transparent' : 'rgba(168, 85, 247, 0.28)';
      tabSetBtn.style.color = isBot ? '#94a3b8' : '#d8b4fe';
    }
  };
  if (tabBotBtn) tabBotBtn.onclick = () => switchTab('bot');
  if (tabSetBtn) tabSetBtn.onclick = () => switchTab('settings');

  // Central actions
  const centralStartBtn = hudEl.querySelector('#p-btn-central-start-bot');
  if (centralStartBtn) centralStartBtn.onclick = () => setBotOnAllClients(true, centralStartBtn);

  const centralStopBtn = hudEl.querySelector('#p-btn-central-stop-bot');
  if (centralStopBtn) centralStopBtn.onclick = () => setBotOnAllClients(false, centralStopBtn);

  const centralZeroBtn = hudEl.querySelector('#p-btn-central-zero-render');
  if (centralZeroBtn && typeof toggleAllClientWindows === 'function') {
    centralZeroBtn.onclick = () => toggleAllClientWindows();
  }

  const centralApplyBtn = hudEl.querySelector('#p-btn-central-apply-auth');
  if (centralApplyBtn) centralApplyBtn.onclick = () => applyCentralAuthSettings(hudEl, { triggerNow: false, btn: centralApplyBtn });

  const centralTestLoginBtn = hudEl.querySelector('#p-btn-central-test-login');
  if (centralTestLoginBtn) centralTestLoginBtn.onclick = () => applyCentralAuthSettings(hudEl, { triggerNow: true, btn: centralTestLoginBtn });

  // Single screen actions
  const toggleBotBtn = hudEl.querySelector('#p-btn-toggle-bot');
  if (toggleBotBtn) {
    toggleBotBtn.onclick = () => {
      const curProf = currentProfiles.find(x => x.id === profileId) || profile;
      const isRunning = Boolean(activeWebHuds[profileId]?.data?.isBotRunning ?? curProf?.liveState?.isBotRunning);
      toggleBotExecution(profileId, !isRunning);
    };
  }

  const zeroBtn = hudEl.querySelector('#p-btn-nc-zerorender');
  if (zeroBtn) zeroBtn.onclick = () => toggleClientWindow(profileId);

  const focusBtn = hudEl.querySelector('#p-btn-nc-focus');
  if (focusBtn) focusBtn.onclick = () => focusClientWindow(profileId, focusBtn);

  const reloadBtn = hudEl.querySelector('#p-btn-nc-reload');
  if (reloadBtn) reloadBtn.onclick = () => reloadClientPage(profileId, null, reloadBtn);

  const editBtn = hudEl.querySelector('#p-btn-nc-edit');
  if (editBtn) editBtn.onclick = () => openEditModal(profileId);

  const openPlanBtn = hudEl.querySelector('#p-btn-nc-open-plan');
  if (openPlanBtn) openPlanBtn.onclick = () => openScriptPlanModal(profileId);

  const aqEnableCb = hudEl.querySelector('#p-nc-smart-autoquest-enabled');
  if (aqEnableCb) {
    aqEnableCb.onchange = async () => {
      try {
        await sendWebHudAction(profileId, {
          type: 'eval',
          code: `(typeof window.__setSmartAutoQuestEnabled === 'function' ? window.__setSmartAutoQuestEnabled(${Boolean(aqEnableCb.checked)}) : (window.__smartAutoQuestEnabled = ${Boolean(aqEnableCb.checked)}))`
        });
      } catch (_) {}
    };
  }

  const aiEnableCb = hudEl.querySelector('#p-nc-upgrade-ai-enabled');
  if (aiEnableCb) {
    aiEnableCb.onchange = async () => {
      try {
        await sendWebHudAction(profileId, {
          type: 'eval',
          code: `(typeof window.__setUpgradeBotAiEnabled === 'function' ? window.__setUpgradeBotAiEnabled(${Boolean(aiEnableCb.checked)}) : (window.__upgradeBotAiEnabled = ${Boolean(aiEnableCb.checked)}))`
        });
      } catch (_) {}
    };
  }

  const respEnableCb = hudEl.querySelector('#p-nc-autorespawn-enabled');
  if (respEnableCb) {
    respEnableCb.onchange = async () => {
      try {
        await sendWebHudAction(profileId, {
          type: 'eval',
          code: `(typeof window.__setAutoRespawnEnabled === 'function' ? window.__setAutoRespawnEnabled(${Boolean(respEnableCb.checked)}) : (window.__autoRespawnEnabled = ${Boolean(respEnableCb.checked)}))`
        });
      } catch (_) {}
    };
  }

  const sgEnableCb = hudEl.querySelector('#p-nc-smartgear-enabled');
  if (sgEnableCb) {
    sgEnableCb.onchange = async () => {
      try {
        await sendWebHudAction(profileId, {
          type: 'eval',
          code: `(typeof window.__setSmartGearEnabled === 'function' ? window.__setSmartGearEnabled(${Boolean(sgEnableCb.checked)}) : (window.__smartGearEnabled = ${Boolean(sgEnableCb.checked)}))`
        });
      } catch (_) {}
    };
  }

  const syncWebPotCfg = async () => {
    try {
      const patch = {
        hpEnabled: Boolean(hudEl.querySelector('#p-nc-pot-hp-en')?.checked),
        hpSize: hudEl.querySelector('#p-nc-pot-hp-size')?.value || 'red',
        hpMin: Number(hudEl.querySelector('#p-nc-pot-hp-min')?.value ?? 15),
        hpTarget: Number(hudEl.querySelector('#p-nc-pot-hp-target')?.value ?? 100),
        spEnabled: Boolean(hudEl.querySelector('#p-nc-pot-sp-en')?.checked),
        spSize: hudEl.querySelector('#p-nc-pot-sp-size')?.value || 'blue',
        spMin: Number(hudEl.querySelector('#p-nc-pot-sp-min')?.value ?? 10),
        spTarget: Number(hudEl.querySelector('#p-nc-pot-sp-target')?.value ?? 60)
      };
      await sendWebHudAction(profileId, {
        type: 'eval',
        code: `(typeof window.__setPotionConfig === 'function' ? window.__setPotionConfig(${JSON.stringify(patch)}) : null)`
      });
    } catch (_) {}
  };
  ['#p-nc-pot-hp-en', '#p-nc-pot-hp-size', '#p-nc-pot-hp-min', '#p-nc-pot-hp-target', '#p-nc-pot-sp-en', '#p-nc-pot-sp-size', '#p-nc-pot-sp-min', '#p-nc-pot-sp-target'].forEach(sel => {
    const el = hudEl.querySelector(sel);
    if (el) el.onchange = syncWebPotCfg;
  });

  const sellEnableCb = hudEl.querySelector('#p-nc-autosell-enabled');
  const sellPctSel = hudEl.querySelector('#p-nc-autosell-pct');
  const syncSellCfg = async () => {
    try {
      const en = sellEnableCb ? Boolean(sellEnableCb.checked) : true;
      const pct = sellPctSel ? (Number(sellPctSel.value) || 65) : 65;
      await sendWebHudAction(profileId, {
        type: 'eval',
        code: `(typeof window.__setAutoSellConfig === 'function' ? window.__setAutoSellConfig(${en}, ${pct}) : null)`
      });
    } catch (_) {}
  };
  if (sellEnableCb) sellEnableCb.onchange = syncSellCfg;
  if (sellPctSel) sellPctSel.onchange = syncSellCfg;

  const targetMapSel = hudEl.querySelector('#p-nc-target-farm-map');
  if (targetMapSel) {
    targetMapSel.onchange = async () => {
      try {
        const val = JSON.stringify(targetMapSel.value || 'auto');
        await sendWebHudAction(profileId, {
          type: 'eval',
          code: `(typeof window.__setTargetFarmMap === 'function' ? window.__setTargetFarmMap(${val}) : null)`
        });
      } catch (_) {}
    };
  }

  const planEnableCb = hudEl.querySelector('#p-nc-plan-enabled');
  if (planEnableCb) {
    planEnableCb.onchange = async () => {
      try {
        await fetch(`${API_BASE}/api/profiles/${encodeURIComponent(profileId)}/plan-enabled`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled: planEnableCb.checked })
        });
      } catch (_) {}
    };
  }

  const passToggle = hudEl.querySelector('#p-auth-toggle-pass');
  const passInp = hudEl.querySelector('#p-auth-pass');
  if (passToggle && passInp) {
    passToggle.onclick = () => {
      passInp.type = passInp.type === 'password' ? 'text' : 'password';
    };
  }

  // Auto-save auth settings on field changes + Test Login button
  ['#p-auth-enabled', '#p-auth-server', '#p-auth-user', '#p-auth-pass', '#p-auth-char', '#p-auth-resume'].forEach(sel => {
    const el = hudEl.querySelector(sel);
    if (el) {
      el.addEventListener('change', () => {
        saveWebHudAuthSettings(profileId, hudEl, { triggerNow: false, silent: true });
      });
    }
  });

  const testLoginBtn = hudEl.querySelector('#p-btn-test-login');
  if (testLoginBtn) {
    testLoginBtn.onclick = () => saveWebHudAuthSettings(profileId, hudEl, { triggerNow: true, btn: testLoginBtn });
  }

  const inspectBtn = hudEl.querySelector('#p-btn-nc-inspect');
  const inspectOut = hudEl.querySelector('#p-nc-inspect-out');
  if (inspectBtn && inspectOut) {
    inspectBtn.onclick = async () => {
      const targetId = isCentral ? (currentProfiles.find(p => p.isRunning)?.id || '') : profileId;
      if (!targetId || !(currentProfiles.find(p => p.id === targetId)?.isRunning)) {
        inspectOut.textContent = '⚠️ กรุณาเปิดจอเกมก่อนกด Inspect Runtime';
        return;
      }
      inspectBtn.disabled = true;
      inspectBtn.innerText = '⏳ กำลังสแกน Runtime...';
      try {
        const code = `(typeof window.__inspectNightcampRuntime === 'function' ? window.__inspectNightcampRuntime() : { url: location.href, title: document.title, canvases: document.querySelectorAll('canvas').length, buttons: document.querySelectorAll('button').length })`;
        const res = await sendWebHudAction(targetId, { type: 'eval', code });
        const summary = res?.result?.result || res?.result || res;
        inspectOut.textContent = JSON.stringify(summary, null, 2);
      } catch (err) {
        inspectOut.textContent = '❌ Inspect ล้มเหลว: ' + err.message;
      } finally {
        inspectBtn.disabled = false;
        inspectBtn.innerText = '🔍 Inspect Runtime ในจอเกม';
      }
    };
  }

  makeElementDraggable(hudEl, hudEl.querySelector('#pelican-drag-handle'));
  populateWebHudData(profileId, clientData || { state: profile?.liveState || {} });
}

function makeElementDraggable(elmnt, dragHandle) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  if (dragHandle) {
    dragHandle.onmousedown = dragMouseDown;
  }

  function dragMouseDown(e) {
    elmnt.style.zIndex = ++topHudZIndex;
    if (e.target.closest('button') || e.target.closest('.p-header-controls') || e.target.closest('span[style*="cursor"]') || e.target.closest('input') || e.target.closest('select')) return;
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    elmnt.style.top = Math.max(0, elmnt.offsetTop - pos2) + "px";
    elmnt.style.left = Math.max(0, elmnt.offsetLeft - pos1) + "px";
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

function closeWebBotHUD(profileId) {
  if (activeWebHuds[profileId]) {
    activeWebHuds[profileId].el.remove();
    delete activeWebHuds[profileId];
  }
}

function toggleWebHudCollapse(profileId) {
  const hud = activeWebHuds[profileId]?.el;
  if (!hud) return;
  const content = hud.querySelector('#pelican-content');
  const toggleBtn = hud.querySelector('.pelican-toggle') || hud.querySelector('#pelican-toggle');
  if (!content) return;
  if (content.style.display === 'none') {
    content.style.display = 'flex';
    if (toggleBtn) toggleBtn.innerText = '−';
  } else {
    content.style.display = 'none';
    if (toggleBtn) toggleBtn.innerText = '+';
  }
}

function populateWebHudData(profileId, data) {
  if (!data) return;
  const hudObj = activeWebHuds[profileId];
  const hud = hudObj?.el;
  if (!hud) return;
  const isCentral = (profileId === '__central__');
  const prof = currentProfiles.find(p => p.id === profileId) || hudObj.profile || {};
  const onlineCount = currentProfiles.filter(p => p.isRunning).length;
  const runningBots = currentProfiles.filter(p => p.isRunning && p.liveState?.isBotRunning).length;

  const titleEl = hud.querySelector('.p-header-title');
  const onlinePill = hud.querySelector('#p-nc-online-pill');
  const lvPill = hud.querySelector('#p-nc-lv-pill');

  if (isCentral) {
    if (titleEl) titleEl.innerText = `เมนูส่วนกลาง (${onlineCount} จอออนไลน์)`;
    if (onlinePill) onlinePill.innerText = `ออนไลน์ ${onlineCount}/${currentProfiles.length} จอ`;
    if (lvPill) lvPill.innerText = `บอททำงาน ${runningBots}/${onlineCount} จอ`;
    return;
  }

  const st = data.state || prof.liveState || {};
  const isOnline = Boolean(prof.isRunning);
  const isBotRunning = Boolean(data.isBotRunning ?? st.isBotRunning);
  const isZeroRender = Boolean(st.zeroRender ?? prof.windowState?.isHidden);

  if (titleEl) titleEl.innerText = st.charName || prof.name || 'จอเกม Nightcamp';
  if (onlinePill) {
    onlinePill.innerText = isOnline ? '🟢 ออนไลน์' : '⚫ ออฟไลน์';
    onlinePill.style.background = isOnline ? 'rgba(16, 185, 129, 0.22)' : 'rgba(148, 163, 184, 0.16)';
    onlinePill.style.borderColor = isOnline ? 'rgba(52, 211, 153, 0.5)' : 'rgba(148, 163, 184, 0.35)';
    onlinePill.style.color = isOnline ? '#6ee7b7' : '#cbd5e1';
  }
  const lvLine = formatNightcampLevelLine(st, prof);
  if (lvPill) lvPill.innerText = lvLine;

  const classLvEl = hud.querySelector('#p-nc-class-lv');
  if (classLvEl) classLvEl.innerText = lvLine;

  const charStateEl = hud.querySelector('#p-char-state');
  if (charStateEl) {
    if (!isOnline) {
      charStateEl.innerText = '⚫ ออฟไลน์';
      charStateEl.style.color = '#94a3b8';
    } else if (st.botStatus) {
      charStateEl.innerText = st.botStatus;
      charStateEl.style.color = isBotRunning ? '#4ade80' : '#facc15';
    } else {
      charStateEl.innerText = isBotRunning ? '⚔️ บอทกำลังทำงาน' : '⏸️ ยืนรอ / แสตนด์บาย';
      charStateEl.style.color = isBotRunning ? '#4ade80' : '#facc15';
    }
  }

  const hpEl = hud.querySelector('#p-nc-hp');
  if (hpEl) {
    hpEl.innerText = (typeof st.hp === 'number')
      ? `${st.hp.toLocaleString()} / ${(st.hpMax || st.maxHp || st.hp).toLocaleString()}`
      : '-- / --';
  }
  const spEl = hud.querySelector('#p-nc-sp');
  if (spEl) {
    spEl.innerText = (typeof st.sp === 'number')
      ? `${st.sp.toLocaleString()} / ${(st.spMax || st.sp).toLocaleString()}`
      : '-- / --';
  }

  const planNameEl = hud.querySelector('#p-nc-plan-name');
  if (planNameEl && st.planName) planNameEl.innerText = st.planName;
  const planTaskEl = hud.querySelector('#p-nc-plan-task');
  if (planTaskEl && st.planTask) planTaskEl.innerText = st.planTask;
  const aqEnableCb = hud.querySelector('#p-nc-smart-autoquest-enabled');
  if (aqEnableCb && typeof st.smartAutoQuestEnabled === 'boolean' && document.activeElement !== aqEnableCb) {
    aqEnableCb.checked = st.smartAutoQuestEnabled;
  }
  const aiEnableCb = hud.querySelector('#p-nc-upgrade-ai-enabled');
  if (aiEnableCb && typeof st.upgradeBotAiEnabled === 'boolean' && document.activeElement !== aiEnableCb) {
    aiEnableCb.checked = st.upgradeBotAiEnabled;
  }
  const respEnableCb = hud.querySelector('#p-nc-autorespawn-enabled');
  if (respEnableCb && typeof st.autoRespawnEnabled === 'boolean' && document.activeElement !== respEnableCb) {
    respEnableCb.checked = st.autoRespawnEnabled;
  }
  const sgEnableCb = hud.querySelector('#p-nc-smartgear-enabled');
  if (sgEnableCb && typeof st.smartGearEnabled === 'boolean' && document.activeElement !== sgEnableCb) {
    sgEnableCb.checked = st.smartGearEnabled;
  }
  if (st.potionConfig && typeof st.potionConfig === 'object') {
    const pc = st.potionConfig;
    const setField = (sel, val, isCb) => {
      const el = hud.querySelector(sel);
      if (!el || document.activeElement === el) return;
      if (isCb) el.checked = !!val;
      else if (val !== undefined && val !== null) el.value = String(val);
    };
    setField('#p-nc-pot-hp-en', pc.hpEnabled !== false, true);
    setField('#p-nc-pot-hp-size', pc.hpSize || 'red', false);
    setField('#p-nc-pot-hp-min', pc.hpMin ?? 15, false);
    setField('#p-nc-pot-hp-target', pc.hpTarget ?? 100, false);
    setField('#p-nc-pot-sp-en', pc.spEnabled !== false, true);
    setField('#p-nc-pot-sp-size', pc.spSize || 'blue', false);
    setField('#p-nc-pot-sp-min', pc.spMin ?? 10, false);
    setField('#p-nc-pot-sp-target', pc.spTarget ?? 60, false);
  }
  const sellEnableCb = hud.querySelector('#p-nc-autosell-enabled');
  if (sellEnableCb && typeof st.autoSellEnabled === 'boolean' && document.activeElement !== sellEnableCb) {
    sellEnableCb.checked = st.autoSellEnabled;
  }
  const sellPctSel = hud.querySelector('#p-nc-autosell-pct');
  if (sellPctSel && st.autoSellWeightPct && document.activeElement !== sellPctSel) {
    sellPctSel.value = String(st.autoSellWeightPct);
  }
  const targetMapSel = hud.querySelector('#p-nc-target-farm-map');
  if (targetMapSel && st.targetFarmMap && document.activeElement !== targetMapSel) {
    targetMapSel.value = String(st.targetFarmMap);
  }
  const planEnableCb = hud.querySelector('#p-nc-plan-enabled');
  if (planEnableCb && typeof st.planScriptEnabled === 'boolean' && document.activeElement !== planEnableCb) {
    planEnableCb.checked = st.planScriptEnabled;
  }

  const btn = hud.querySelector('#p-btn-toggle-bot');
  if (btn) {
    btn.disabled = !isOnline;
    btn.style.opacity = isOnline ? '1' : '0.55';
    btn.style.cursor = isOnline ? 'pointer' : 'not-allowed';
    if (isBotRunning) {
      btn.innerHTML = '⏹️ STOP BOT (หยุดทำงาน)';
      btn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
      btn.style.boxShadow = '0 0 14px rgba(239, 68, 68, 0.55)';
      btn.style.border = '1px solid #f87171';
      btn.style.color = '#fff';
    } else {
      btn.innerHTML = '▶️ START BOT (เริ่มทำงาน)';
      btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
      btn.style.boxShadow = '0 0 14px rgba(16, 185, 129, 0.4)';
      btn.style.border = '1px solid #34d399';
      btn.style.color = '#fff';
    }
  }

  const zeroBtn = hud.querySelector('#p-btn-nc-zerorender');
  if (zeroBtn) zeroBtn.innerText = isZeroRender ? '🖥️ แสดงภาพปกติ' : '⚡ พักกราฟิก';

  const auth = data.authConfig || {};
  const resolvedEnabled = (auth.enabled !== undefined) ? !!auth.enabled : (prof.autoLoginEnabled !== false);
  const resolvedServer = String((auth.serverName !== undefined ? auth.serverName : prof.serverName) || '');
  const resolvedUser = String((auth.username !== undefined ? auth.username : prof.account) || '');
  const resolvedPass = String((auth.password !== undefined ? auth.password : prof.loginPassword) || '');
  const resolvedChar = String((auth.charName !== undefined ? auth.charName : prof.charName) || '');
  const resolvedResume = (auth.autoResumeBot !== undefined) ? !!auth.autoResumeBot : Boolean(prof.autoResumeBot);

  const authStatusEl = hud.querySelector('#p-nc-auth-status');
  if (authStatusEl) {
    authStatusEl.innerText = st.authStatus || (resolvedEnabled ? (resolvedServer ? `Auto-Login: พร้อม (${resolvedServer})` : 'Auto-Login: พร้อมใช้งาน') : 'Auto-Login: ปิดใช้งาน');
  }

  if (!hudObj.savingAuth) {
    const authEn = hud.querySelector('#p-auth-enabled');
    if (authEn && document.activeElement !== authEn) authEn.checked = resolvedEnabled;
    const authSrv = hud.querySelector('#p-auth-server');
    if (authSrv && document.activeElement !== authSrv) authSrv.value = resolvedServer;
    const authUs = hud.querySelector('#p-auth-user');
    if (authUs && document.activeElement !== authUs) authUs.value = resolvedUser;
    const authPs = hud.querySelector('#p-auth-pass');
    if (authPs && document.activeElement !== authPs) authPs.value = resolvedPass;
    const authCh = hud.querySelector('#p-auth-char');
    if (authCh && document.activeElement !== authCh) authCh.value = resolvedChar;
    const authRes = hud.querySelector('#p-auth-resume');
    if (authRes && document.activeElement !== authRes) authRes.checked = resolvedResume;
  }
}

async function sendWebHudAction(profileId, payload) {
  try {
    if (profileId === '__central__') {
      const online = currentProfiles.filter(p => p.isRunning);
      if (online.length === 0) {
        showToast('⚠️ ไม่มีจอเกมที่กำลังออนไลน์ให้สั่งการ', 'warning');
        return { success: false, error: 'ไม่มีจอเกมที่กำลังออนไลน์' };
      }
      const centralPayload = Object.assign({}, payload, { targetProfileIds: online.map(p => p.id) });
      const resp = await fetch(API_BASE + '/api/profiles/__central__/client-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(centralPayload)
      });
      const j = await resp.json().catch(() => ({}));
      if (resp.ok && typeof j.updatedCount === 'number') {
        const okCount = j.updatedCount;
        const total = j.totalOnline || online.length;
        showToast(`🎛️ เมนูส่วนกลาง: อัปเดตไปยัง ${okCount}/${total} จอเรียบร้อย`, okCount > 0 ? 'success' : 'error');
        setTimeout(() => { updateActiveWebHuds(); }, 250);
        return { success: okCount > 0, updatedCount: okCount, totalOnline: total };
      }
      return { success: false, error: j.error || 'สั่งงานไม่สำเร็จ' };
    }

    const resp = await fetch(API_BASE + '/api/profiles/' + profileId + '/client-action', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    let out;
    try { out = await resp.json(); } catch (e) { out = { success: false, error: 'HTTP ' + resp.status }; }
    setTimeout(async () => {
      try {
        const res = await fetch(API_BASE + '/api/profiles/' + profileId + '/client-data');
        const json = await res.json();
        if (json.success && json.data && activeWebHuds[profileId]) {
          activeWebHuds[profileId].data = json.data;
          populateWebHudData(profileId, json.data);
        }
      } catch (_) {}
    }, 250);
    return out;
  } catch (e) {
    console.error("sendWebHudAction error:", e);
    return { success: false, error: e.message };
  }
}

async function updateActiveWebHuds() {
  const openIds = Object.keys(activeWebHuds);
  for (const id of openIds) {
    if (id === '__central__') {
      populateWebHudData(id, {});
      continue;
    }
    const prof = currentProfiles.find(p => p.id === id);
    if (!prof || !prof.isRunning) {
      populateWebHudData(id, { state: {} });
      continue;
    }
    try {
      const res = await fetch(API_BASE + '/api/profiles/' + id + '/client-data');
      const json = await res.json();
      if (json.success && json.data && activeWebHuds[id]) {
        activeWebHuds[id].data = json.data;
        populateWebHudData(id, json.data);
      }
    } catch (_) {}
  }
}

// ==========================================
// NIGHTCAMP SCRIPT PLAN WORKFLOW BUILDER (n8n-style)
// ==========================================
let currentPlanProfiles = [];
let currentPlanAssignments = {};
let activePlanClientProfileId = null;
let activeEditingPlan = null;

// Real Nightcamp maps (value = mapId in NC.MAPS, label = Thai name + level range)
const PLAN_MAP_OPTIONS = [
  {
    group: "🏕️ เขตค่าย & พื้นที่ปลอดภัย (Safe Zone)",
    maps: [
      { value: "camp", label: "ค่ายกลางป่า (Camp · ปลอดภัย)" },
      { value: "homefarm", label: "ฟาร์มหิ่งห้อย (Homefarm · ปลูกผัก/คราฟต์)" }
    ]
  },
  {
    group: "🌱 แมพระดับเริ่มต้น (Lv. 1–20)",
    maps: [
      { value: "farm", label: "ไร่ฟักทอง (Lv. 1–10) [farm]" },
      { value: "melonfield", label: "ไร่แตงโมใต้จันทร์ (Lv. 3–10) [melonfield]" },
      { value: "windpump", label: "ลานกังหันสูบน้ำ (Lv. 3–10) [windpump]" },
      { value: "quarry1", label: "เหมืองหินริมทุ่ง ชั้น 1 (Lv. 5–12) [quarry1]" },
      { value: "meadow", label: "ทุ่งหญ้าแสงจันทร์ (Lv. 8–18) [meadow]" },
      { value: "batcave", label: "ถ้ำค้างคาวริมทุ่ง (Lv. 8–16) [batcave]" },
      { value: "farm2", label: "ไร่ร้างหลังเขา (Lv. 10–18) [farm2]" },
      { value: "cornmaze", label: "เขาวงกตข้าวโพด (Lv. 10–18) [cornmaze]" },
      { value: "quarry2", label: "เหมืองหินริมทุ่ง ชั้น 2 (Lv. 12–18) [quarry2]" },
      { value: "marsh", label: "บึงกบลำธารใส (Lv. 12–24) [marsh]" },
      { value: "meadow2", label: "เนินดอกไม้กลางคืน (Lv. 14–22) [meadow2]" },
      { value: "antmine1", label: "เหมืองมด ชั้น B1 (Lv. 15–25) [antmine1]" },
      { value: "batnest", label: "รังราชาค้างคาว (Lv. 16–22) [batnest]" }
    ]
  },
  {
    group: "🌲 แมพช่วงต้น-กลาง (Lv. 18–45)",
    maps: [
      { value: "graveyard", label: "เนินสุสานโบสถ์ร้าง (Lv. 18–30) [graveyard]" },
      { value: "quarry3", label: "เหมืองหินริมทุ่ง ชั้น 3 (Lv. 18–25) [quarry3]" },
      { value: "marsh2", label: "ต้นลำธาร (Lv. 20–28) [marsh2]" },
      { value: "woods", label: "ป่าเห็ดเรืองแสง (Lv. 25–40) [woods]" },
      { value: "antmine2", label: "เหมืองมด ชั้น B2 (Lv. 25–38) [antmine2]" },
      { value: "marsh3", label: "น้ำตกหิ่งห้อย (Lv. 26–34) [marsh3]" },
      { value: "graveyard2", label: "สุสานเก่าหลังเนิน (Lv. 28–38) [graveyard2]" },
      { value: "road", label: "ถนนผู้อพยพ (Lv. 32–42) [road]" },
      { value: "crypt1", label: "สุสานใต้ดิน ชั้น 1 (Lv. 34–44) [crypt1]" },
      { value: "burnt", label: "ป่าไหม้ถ่านคุ (Lv. 35–45) [burnt]" },
      { value: "salt", label: "ด่านสะพานเกลือ (Lv. 36–48) [salt]" },
      { value: "woods2", label: "ป่าเห็ดชั้นใน (Lv. 36–46) [woods2]" },
      { value: "antmine3", label: "เหมืองมด ชั้น B3 (Lv. 38–50) [antmine3]" }
    ]
  },
  {
    group: "⛰️ แมพช่วงกลาง-สูง (Lv. 42–70)",
    maps: [
      { value: "wind", label: "ทุ่งลมหวีดหน้าผา (Lv. 42–52) [wind]" },
      { value: "crypt2", label: "สุสานใต้ดิน ชั้น 2 (Lv. 44–52) [crypt2]" },
      { value: "wind2", label: "เกาะหินลอยลม (Lv. 44–54) [wind2]" },
      { value: "peak", label: "ยอดเขาหมอกเหนือ (Lv. 46–58) [peak]" },
      { value: "swamp", label: "หนองพิษป่าชายเลน (Lv. 50–62) [swamp]" },
      { value: "owl1", label: "หอดูดาวนกฮูก ชั้น 1 (Lv. 50–54) [owl1]" },
      { value: "owl2", label: "หอดูดาวนกฮูก ชั้น 2 (Lv. 53–56) [owl2]" },
      { value: "owl3", label: "หอดูดาวนกฮูก ชั้น 3 (Lv. 55–58) [owl3]" },
      { value: "silver1", label: "ปล่องเงินลึก ชั้น B4 (Lv. 50–56) [silver1]" },
      { value: "silver2", label: "ปล่องเงินลึก ชั้น B5 (Lv. 56–62) [silver2]" },
      { value: "swamp2", label: "รากต้นแม่พิษ (Lv. 56–66) [swamp2]" },
      { value: "canyon", label: "ผาหินแดง (Lv. 60–72) [canyon]" },
      { value: "nroad", label: "เส้นทางขึ้นเหนือ (Lv. 60–72) [nroad]" },
      { value: "meteor1", label: "ปล่องดาวตก ชั้น 1 (Lv. 60–66) [meteor1]" },
      { value: "canyon2", label: "เหมืองลึกผลึกส้ม (Lv. 62–72) [canyon2]" },
      { value: "roots1", label: "ถ้ำรากแม่พิษ B1 (Lv. 62–68) [roots1]" }
    ]
  },
  {
    group: "🌋 แมพระดับสูง (Lv. 66–99)",
    maps: [
      { value: "meteor2", label: "ปล่องดาวตก ชั้น 2 (Lv. 66–72) [meteor2]" },
      { value: "outer", label: "ย่านนอกกำแพง (Lv. 68–82) [outer]" },
      { value: "volcano", label: "ภูเขาไฟหลับ (Lv. 70–82) [volcano]" },
      { value: "canyon3", label: "ใจกลางหุบผา (Lv. 70–80) [canyon3]" },
      { value: "raiderfort", label: "ป้อมโจรทะเลทรายร้าง (Lv. 70–80) [raiderfort]" },
      { value: "meteor3", label: "ปล่องดาวตก ชั้น 3 (Lv. 72–78) [meteor3]" },
      { value: "canal", label: "ย่านริมคลอง (Lv. 74–86) [canal]" },
      { value: "lake", label: "ทะเลสาบหมอกเงา (Lv. 78–90) [lake]" },
      { value: "ledger1", label: "หอบัญชีใต้วิหาร ชั้น 1 (Lv. 78–83) [ledger1]" },
      { value: "meteor4", label: "ปล่องดาวตก ชั้น 4 (Lv. 78–84) [meteor4]" },
      { value: "lavavent1", label: "ปล่องภูเขาไฟ ชั้น 1 (Lv. 80–90) [lavavent1]" },
      { value: "ledger2", label: "หอบัญชีใต้วิหาร ชั้น 2 (Lv. 82–88) [ledger2]" },
      { value: "meteor5", label: "ปล่องดาวตก ชั้น 5 (Lv. 84–90) [meteor5]" },
      { value: "isle", label: "เกาะกลางทะเลสาบ (Lv. 84–92) [isle]" },
      { value: "dark", label: "ป่าใต้ที่มืดสนิท (Lv. 86–96) [dark]" },
      { value: "prime", label: "ป่าดึกดำบรรพ์ (Lv. 88–99) [prime]" },
      { value: "lavavent2", label: "ปล่องภูเขาไฟ ชั้น 2 (Lv. 90–99) [lavavent2]" },
      { value: "meteor6", label: "ปล่องดาวตก ชั้น 6 (Lv. 90–95) [meteor6]" },
      { value: "cathedral", label: "ย่านวิหาร (Lv. 92–99) [cathedral]" },
      { value: "meteor7", label: "ปล่องดาวตก ชั้น 7 (Lv. 95–99) [meteor7]" }
    ]
  }
];

const PLAN_CLASS_OPTIONS = [
  { value: "traveler", label: "🎒 นักเดินทาง (Traveler · เริ่มต้น)" },
  { value: "novice", label: "🎒 นักเดินทาง (Traveler · เริ่มต้น)" },
  // Class 1 (Job Lv.10)
  { value: "archer", label: "🏹 [Class 1] นักธนู (Archer)" },
  { value: "knight", label: "🛡️ [Class 1] อัศวิน (Knight)" },
  { value: "mage", label: "🔮 [Class 1] จอมเวท (Mage)" },
  { value: "rogue", label: "🗡️ [Class 1] โจร (Rogue)" },
  { value: "priest", label: "✨ [Class 1] พระ (Priest)" },
  // Class 2 - Archer (Job Lv.50)
  { value: "ranger", label: "🏹 [Class 2] เรนเจอร์ (Ranger)" },
  { value: "wolfhunter", label: "🐺 [Class 2] นักล่าหมาป่า (Wolf Hunter)" },
  { value: "bard", label: "🎵 [Class 2] นักกวี (Bard)" },
  { value: "gunslinger", label: "🔫 [Class 2] มือปืน (Gunslinger)" },
  // Class 2 - Knight (Job Lv.50)
  { value: "paladin", label: "🛡️ [Class 2] พาลาดิน (Paladin)" },
  { value: "dragonknight", label: "🐉 [Class 2] อัศวินมังกร (Dragon Knight)" },
  { value: "swordmaster", label: "⚔️ [Class 2] นักดาบ (Swordmaster)" },
  { value: "berserker", label: "🩸 [Class 2] เบอร์เซิร์กเกอร์ (Berserker)" },
  // Class 2 - Mage (Job Lv.50)
  { value: "archmage", label: "🔮 [Class 2] อาร์คเมจ (Archmage)" },
  { value: "warlock", label: "🏮 [Class 2] วอร์ล็อกตะเกียง (Warlock)" },
  { value: "firemage", label: "🔥 [Class 2] จอมเวทไฟ (Fire Mage)" },
  { value: "icemage", label: "❄️ [Class 2] จอมเวทน้ำแข็ง (Ice Mage)" },
  // Class 2 - Rogue (Job Lv.50)
  { value: "assassin", label: "🗡️ [Class 2] นักฆ่า (Assassin)" },
  { value: "shinobi", label: "🥷 [Class 2] นินจา (Shinobi)" },
  { value: "reaper", label: "🌙 [Class 2] ยมทูต (Reaper)" },
  { value: "puppeteer", label: "🎎 [Class 2] นักเชิดหุ่น (Puppeteer)" },
  // Class 2 - Priest (Job Lv.50)
  { value: "bishop", label: "✨ [Class 2] บิชอป (Bishop)" },
  { value: "monk", label: "👊 [Class 2] นักพรต (Monk)" },
  { value: "lightkeeper", label: "🕯️ [Class 2] ผู้จุดตะเกียง (Lightkeeper)" },
  { value: "wisp", label: "🧚 [Class 2] ผู้เลี้ยงดวงไฟ (Wisp)" },
  // Class 3 (Base Lv.80 / Job Lv.50)
  { value: "moonsniper", label: "🌟 [Class 3] พรานจันทร์เงียบ (Moonsniper)" },
  { value: "packalpha", label: "🌟 [Class 3] จ่าฝูงจันทร์เต็มดวง (Pack Alpha)" },
  { value: "maestro", label: "🌟 [Class 3] วาทยกรแห่งป่า (Maestro)" },
  { value: "outlaw", label: "🌟 [Class 3] มือปืนเที่ยงคืน (Outlaw)" },
  { value: "dawnwarden", label: "🌟 [Class 3] ผู้พิทักษ์รุ่งสาง (Dawn Warden)" },
  { value: "dragonbound", label: "🌟 [Class 3] อัศวินผสานมังกร (Dragonbound)" },
  { value: "starblade", label: "🌟 [Class 3] นักดาบกลุ่มดาว (Starblade)" },
  { value: "bloodmoon", label: "🌟 [Class 3] จอมคลั่งจันทร์เลือด (Bloodmoon)" },
  { value: "astral", label: "🌟 [Class 3] จอมเวทดาราจักร (Astral)" },
  { value: "hexlord", label: "🌟 [Class 3] จ้าวคืนเดือนดับ (Hexlord)" },
  { value: "starcore", label: "🌟 [Class 3] จอมเวทดาวฤกษ์ (Starcore)" },
  { value: "winterlord", label: "🌟 [Class 3] จ้าวเหมันต์ (Winterlord)" },
  { value: "eclipse", label: "🌟 [Class 3] นักฆ่าจันทรคราส (Eclipse)" },
  { value: "shadowlord", label: "🌟 [Class 3] จ้าวเงาร้อยร่าง (Shadowlord)" },
  { value: "harvester", label: "🌟 [Class 3] ผู้เก็บเกี่ยวจันทรา (Harvester)" },
  { value: "showmaster", label: "🌟 [Class 3] จ้าวโรงหุ่นราตรี (Showmaster)" },
  { value: "starsaint", label: "🌟 [Class 3] นักบุญแสงดาว (Starsaint)" },
  { value: "meteorfist", label: "🌟 [Class 3] ปรมาจารย์หมัดดาวตก (Meteorfist)" },
  { value: "beacon", label: "🌟 [Class 3] ผู้เฝ้าประภาคาร (Beacon)" },
  { value: "starshepherd", label: "🌟 [Class 3] ผู้เลี้ยงดวงดาว (Starshepherd)" }
];

const PLAN_LIFE_ITEM_OPTIONS = [
  { job: 'wood', value: 'lf_birch', label: '🪵 ไม้เบิร์ช (Birch Wood)' },
  { job: 'wood', value: 'lf_oak', label: '🪵 ไม้โอ๊ค (Oak Wood)' },
  { job: 'wood', value: 'lf_pine', label: '🪵 ไม้สน (Pine Wood)' },
  { job: 'wood', value: 'lf_ash', label: '🪵 ไม้แอช (Ash Wood)' },
  { job: 'mine', value: 'lf_copper', label: '⛏️ แร่ทองแดง (Copper Ore)' },
  { job: 'mine', value: 'lf_iron', label: '⛏️ แร่เหล็ก (Iron Ore)' },
  { job: 'mine', value: 'lf_coal', label: '⛏️ ถ่านหิน (Coal)' },
  { job: 'mine', value: 'lf_silver', label: '⛏️ แร่เงิน (Silver Ore)' },
  { job: 'mine', value: 'lf_mithril', label: '⛏️ แร่มิธริล (Mithril Ore)' },
  { job: 'farm', value: 'lf_carrot', label: '🥕 แครอท (Carrot)' },
  { job: 'farm', value: 'lf_potato', label: '🥔 มันฝรั่ง (Potato)' },
  { job: 'farm', value: 'lf_pumpkin', label: '🎃 ฟักทอง (Pumpkin)' },
  { job: 'farm', value: 'lf_wheat', label: '🌾 ข้าวสาลี (Wheat)' }
];

const PLAN_QUEST_CHECKPOINTS = [
  { value: 'MQ08', label: 'MQ08 · เส้นทางของตัวเอง (เปลี่ยนอาชีพ Class 1 ที่ Job Lv.10)' },
  { value: 'MQ15', label: 'MQ15 · จบช่วงทุ่งหญ้าแสงจันทร์ & บึงกบ (ประมาณ Lv.15)' },
  { value: 'MQ25', label: 'MQ25 · จบช่วงเนินสุสานโบสถ์ร้าง (ประมาณ Lv.25)' },
  { value: 'MQ34', label: 'MQ34 · จบช่วงป่าเห็ดเรืองแสง & ป่าไหม้ (ประมาณ Lv.35)' },
  { value: 'MQ50', label: 'MQ50 · จบช่วงยอดเขาหมอกเหนือ & เปลี่ยน Class 2 (ประมาณ Lv.50)' },
  { value: 'ALL', label: 'ทำเควสหลัก (MQ) และบทเรียน (L1–L36) ต่อเนื่องทั้งหมด' }
];

function buildNightcampExamplePlanPayload() {
  const now = Date.now();
  return {
    name: "🐺 [ตัวอย่างแนะนำ] นักธนู ➔ นักล่าหมาป่า (สายยิงรัว+เหยี่ยว+หมาป่า 0 มานา Lv.1–50+)",
    description: "ฟาร์มง่ายที่สุด ไม่ใช้มานา: ยิงปกติติดยิงเบิ้ล + เหยี่ยวโฉบฟรีไม่สน DEF + หมาป่าช่วยแทงค์และกัดรัว อัป Stat ตามเพดานเลเวล (30+0.55×Lv) ได้ผล 100%",
    autoQuestEnabled: true,
    autoJobChange: true,
    autoStatSkillEnabled: true,
    class1Target: "archer",
    class1JobLevel: 10,
    class2Target: "wolfhunter",
    class2JobLevel: 50,
    class3Target: "packalpha",
    statBuild: {
      queue: [
        { stat: "DEX", to: 30 },
        { stat: "AGI", to: 30 },
        { stat: "LUK", to: 24 },
        { stat: "DEX", to: 45 },
        { stat: "AGI", to: 45 },
        { stat: "LUK", to: 36 },
        { stat: "VIT", to: 20 },
        { stat: "DEX", to: 60 },
        { stat: "AGI", to: 60 },
        { stat: "LUK", to: 48 },
        { stat: "DEX", to: 80 },
        { stat: "AGI", to: 80 },
        { stat: "LUK", to: 60 },
        { stat: "VIT", to: 40 }
      ],
      targets: { STR: 1, AGI: 80, VIT: 40, INT: 1, DEX: 80, LUK: 60 },
      priorityOrder: ["DEX", "AGI", "LUK", "VIT", "INT", "STR"]
    },
    skillBuild: {
      skillPointQueue: [
        // Traveler (9 pts): ชำนาญอาวุธ 5 + ร่างกายแข็งแกร่ง 4 (เพิ่ม ATK ถาวร +20 และ HP/Regen ไม่เปลือง SP)
        "mastery", "mastery", "mastery", "mastery", "mastery",
        "body", "body", "body", "body",
        // Class 1 Archer (49 pts): สายยิงรัว (rapid) เต็มพิกัดเพื่อเอา Resonance +30% ส่งต่อให้สายเหยี่ยว
        "ar_bowmastery", "ar_bowmastery", "ar_bowmastery", "ar_bowmastery", "ar_bowmastery",
        "ar_doubleshot", "ar_doubleshot", "ar_doubleshot", "ar_doubleshot", "ar_doubleshot",
        "ar_bowmastery", "ar_bowmastery", "ar_bowmastery", "ar_bowmastery", "ar_bowmastery",
        "ar_doubleshot", "ar_doubleshot", "ar_doubleshot", "ar_doubleshot", "ar_doubleshot",
        "ar_owl", "ar_owl", "ar_owl", "ar_owl", "ar_owl", "ar_owl", "ar_owl", "ar_owl", "ar_owl", "ar_owl",
        "ar_concentrate", "ar_concentrate", "ar_concentrate", "ar_concentrate", "ar_concentrate",
        "mastery", "mastery", "mastery", "mastery", "mastery",
        "body", "body", "body", "body", "body", "body",
        "double", "double", "double",
        // Class 2 Wolf Hunter (49 pts): เหยี่ยวโฉบอัตโนมัติ (0 SP) + หมาป่าคู่ใจ + สายใยสัตว์ป่า (+80% Pet Dmg, +10% ATK)
        "wh_blitz", "wh_blitz",
        "wh_autoblitz", "wh_autoblitz", "wh_autoblitz", "wh_autoblitz", "wh_autoblitz",
        "wh_steelcrow", "wh_steelcrow", "wh_steelcrow", "wh_steelcrow", "wh_steelcrow",
        "wh_autoblitz", "wh_autoblitz", "wh_autoblitz", "wh_autoblitz", "wh_autoblitz",
        "wh_wolf", "wh_wolf", "wh_wolf", "wh_wolf",
        "wh_alpha", "wh_alpha", "wh_alpha", "wh_alpha", "wh_alpha",
        "wh_bond", "wh_bond", "wh_bond", "wh_bond", "wh_bond", "wh_bond", "wh_bond", "wh_bond", "wh_bond", "wh_bond",
        "wh_wolfrush", "wh_wolfrush", "wh_wolfrush", "wh_wolfrush", "wh_wolfrush",
        "wh_wolf", "wh_wolf", "wh_wolf", "wh_wolf", "wh_wolf",
        "wh_howl", "wh_howl", "wh_howl"
      ],
      plannedLevels: {
        mastery: 10, body: 10,
        ar_bowmastery: 10, ar_doubleshot: 10, ar_owl: 10, ar_concentrate: 5, double: 3,
        wh_blitz: 2, wh_autoblitz: 10, wh_steelcrow: 5, wh_wolf: 9, wh_alpha: 5, wh_bond: 10, wh_wolfrush: 5, wh_howl: 3
      },
      facets: {}
    },
    triggers: [
      {
        id: "trig_nc_lv1_" + now,
        type: "base_level",
        targetLevel: 1,
        actions: [
          {
            id: "act_nc_aq1_" + now,
            type: "auto_quest",
            questMode: "until_level",
            untilLevel: 12,
            untilQuest: "MQ08"
          },
          {
            id: "act_nc_eq1_" + now,
            type: "equip_best",
            itemName: ""
          }
        ]
      },
      {
        id: "trig_nc_job10_" + now,
        type: "job_level",
        classId: "traveler",
        targetLevel: 10,
        actions: [
          {
            id: "act_nc_c1_" + now,
            type: "change_class",
            targetClass: "archer"
          },
          {
            id: "act_nc_eq2_" + now,
            type: "equip_best",
            itemName: ""
          }
        ]
      },
      {
        id: "trig_nc_lv12_" + now,
        type: "base_level",
        targetLevel: 12,
        actions: [
          {
            id: "act_nc_sell12_" + now,
            type: "sell_trip",
            sellMaterials: true,
            redQty: 30,
            blueQty: 10
          },
          {
            id: "act_nc_aq12_" + now,
            type: "auto_quest",
            questMode: "until_level",
            untilLevel: 25,
            untilQuest: "MQ25"
          }
        ]
      },
      {
        id: "trig_nc_lv25_" + now,
        type: "base_level",
        targetLevel: 25,
        actions: [
          {
            id: "act_nc_map25_" + now,
            type: "change_map",
            targetMap: "woods",
            targetMonster: ""
          },
          {
            id: "act_nc_eq25_" + now,
            type: "equip_best",
            itemName: ""
          }
        ]
      },
      {
        id: "trig_nc_lv35_" + now,
        type: "base_level",
        targetLevel: 35,
        actions: [
          {
            id: "act_nc_sell35_" + now,
            type: "sell_trip",
            sellMaterials: true,
            redQty: 50,
            blueQty: 15
          },
          {
            id: "act_nc_map35_" + now,
            type: "change_map",
            targetMap: "burnt",
            targetMonster: ""
          }
        ]
      },
      {
        id: "trig_nc_job50_c1_" + now,
        type: "job_level",
        classId: "archer",
        targetLevel: 50,
        actions: [
          {
            id: "act_nc_c2_" + now,
            type: "change_class",
            targetClass: "wolfhunter"
          },
          {
            id: "act_nc_eq_c2_" + now,
            type: "equip_best",
            itemName: ""
          }
        ]
      },
      {
        id: "trig_nc_lv46_" + now,
        type: "base_level",
        targetLevel: 46,
        actions: [
          {
            id: "act_nc_map46_" + now,
            type: "change_map",
            targetMap: "peak",
            targetMonster: ""
          },
          {
            id: "act_nc_aq46_" + now,
            type: "auto_quest",
            questMode: "all",
            untilLevel: 70,
            untilQuest: "ALL"
          }
        ]
      }
    ]
  };
}

// Open Plan Modal
async function openScriptPlanModal(profileId) {
  activePlanClientProfileId = profileId || (currentProfiles.find(p => p.isRunning) || currentProfiles[0])?.id || null;
  const clientProfile = currentProfiles.find(p => p.id === activePlanClientProfileId);

  const targetNameEl = document.getElementById("plan-target-client-name");
  const targetIdInput = document.getElementById("plan-target-client-id");
  if (targetNameEl) targetNameEl.innerText = clientProfile ? `${clientProfile.name} (Port: ${clientProfile.debugPort || '--'})` : (activePlanClientProfileId || 'ทุกจอ');
  if (targetIdInput) targetIdInput.value = activePlanClientProfileId || '';

  switchPlanModalView('list');

  const modal = document.getElementById("plan-modal");
  if (modal) modal.classList.add("active");

  await fetchAndRenderPlanProfiles();
  startPlanLiveStatus();
}

function closeScriptPlanModal() {
  const modal = document.getElementById("plan-modal");
  if (modal) modal.classList.remove("active");
  activePlanClientProfileId = null;
  activeEditingPlan = null;
}

function switchPlanModalView(view) {
  const viewList = document.getElementById("plan-view-list");
  const viewEditor = document.getElementById("plan-view-editor");
  if (view === 'list') {
    if (viewList) viewList.style.display = 'flex';
    if (viewEditor) viewEditor.style.display = 'none';
  } else if (view === 'editor') {
    if (viewList) viewList.style.display = 'none';
    if (viewEditor) viewEditor.style.display = 'flex';
  }
}

// Fetch Plan Profiles from Backend
async function fetchAndRenderPlanProfiles() {
  try {
    const res = await fetch(`${API_BASE}/api/plan-profiles`);
    const data = await res.json();
    if (data.success) {
      currentPlanProfiles = data.profiles || [];
      currentPlanAssignments = data.assignments || {};
    }
  } catch(e) {
    console.error("Failed to load plan profiles:", e);
  }

  renderPlanProfilesList();
}

function renderPlanProfilesList() {
  const container = document.getElementById("plan-profiles-list-container");
  const activeBadge = document.getElementById("plan-active-badge");
  if (!container) return;

  const currentAssignedPlanId = currentPlanAssignments[activePlanClientProfileId];
  const assignedPlan = currentPlanProfiles.find(p => p.id === currentAssignedPlanId);

  if (activeBadge) {
    if (assignedPlan) {
      activeBadge.innerText = assignedPlan.name;
      activeBadge.style.background = 'rgba(34, 197, 94, 0.18)';
      activeBadge.style.color = '#4ade80';
      activeBadge.style.borderColor = 'rgba(34, 197, 94, 0.3)';
    } else {
      activeBadge.innerText = 'ยังไม่ได้กำหนดแผน';
      activeBadge.style.background = 'rgba(148, 163, 184, 0.12)';
      activeBadge.style.color = '#94a3b8';
      activeBadge.style.borderColor = 'rgba(148, 163, 184, 0.2)';
    }
  }

  if (currentPlanProfiles.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: #94a3b8; padding: 30px; font-size: 13px;">
        <span style="font-size: 28px; opacity: 0.6; display: block; margin-bottom: 8px;">📜</span>
        ยังไม่มี Plan Profile ในระบบ<br>
        คลิกปุ่ม <b>"🌱 โหลดแผนตัวอย่าง (Lv.1–50)"</b> หรือ <b>"➕ สร้าง Plan ใหม่"</b> ด้านบนเพื่อเริ่มต้น
      </div>
    `;
    return;
  }

  container.innerHTML = currentPlanProfiles.map(plan => {
    const isAssigned = (plan.id === currentAssignedPlanId);
    const triggersCount = (plan.triggers || []).length;
    let actionsCount = 0;
    (plan.triggers || []).forEach(t => actionsCount += (t.actions || []).length);
    const c1Label = planClassLabel(plan.class1Target || 'archer').replace(/^\[Class \d\]\s*/, '');
    const c2Label = planClassLabel(plan.class2Target || 'ranger').replace(/^\[Class \d\]\s*/, '');

    return `
      <div class="plan-profile-item ${isAssigned ? 'active-assigned' : ''}">
        <div style="display: flex; flex-direction: column; gap: 5px; flex: 1;">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span style="font-size: 14px; font-weight: 700; color: #f8fafc;">${escapeHTML(plan.name)}</span>
            <span class="badge" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.35); font-size: 10px; padding: 2px 7px;">
              ${escapeHTML(c1Label)} (Job ${plan.class1JobLevel || 10}) ➔ ${escapeHTML(c2Label)} (Job ${plan.class2JobLevel || 50})
            </span>
            ${plan.autoQuestEnabled !== false ? `
              <span class="badge" style="background: rgba(16, 185, 129, 0.16); color: #6ee7b7; border: 1px solid rgba(52, 211, 153, 0.35); font-size: 10px; padding: 2px 7px;">
                🧭 Smart Auto-Quest
              </span>
            ` : ''}
            ${(plan.skillBuild?.skillPointQueue?.length > 0) ? `
              <span class="badge" style="background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.35); font-size: 10px; padding: 2px 7px;">
                ⚡ สกิล ${plan.skillBuild.skillPointQueue.length} แต้ม
              </span>
            ` : ''}
            ${plan.statBuild ? `
              <span class="badge" style="background: rgba(34, 197, 94, 0.15); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.35); font-size: 10px; padding: 2px 7px;">
                📊 Stat Build
              </span>
            ` : ''}
            ${isAssigned ? `
              <span class="badge" style="background: rgba(34, 197, 94, 0.22); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.45); font-size: 10px; padding: 2px 7px; border-radius: 4px;">
                ⚡ กำลังใช้งานกับจอนี้
              </span>
            ` : ''}
          </div>
          <div style="display: flex; align-items: center; gap: 12px; font-size: 11.5px; color: #94a3b8; flex-wrap: wrap;">
            <span>🎯 <b>${triggersCount}</b> เงื่อนไขเลเวล/Job</span>
            <span>⚡ <b>${actionsCount}</b> การทำงาน (Actions)</span>
            <span style="opacity: 0.85;">${escapeHTML(plan.description || '')}</span>
          </div>
        </div>

        <div style="display: flex; gap: 6px; align-items: center;">
          <button type="button" class="btn btn-primary btn-sm" onclick="openPlanWorkflowEditor('${plan.id}')" title="เปิดหน้าต่างแก้ไขแผน & เลือกอาชีพ Class 1 / Class 2">
            <span>✏️</span> ปรับแต่ง
          </button>
          <button type="button" class="btn ${isAssigned ? 'btn-secondary' : 'btn-success'} btn-sm" onclick="openPlanAssignPicker('${plan.id}')" title="เลือกจอเกมที่จะใช้แผนนี้">
            <span>⚡</span> ${isAssigned ? 'ซิงค์ซ้ำ' : 'ใช้งาน'}
          </button>
          <button type="button" class="btn btn-secondary btn-sm btn-icon" onclick="exportPlanProfiles(['${plan.id}'])" title="ส่งออกแผนนี้เป็นไฟล์ (.json)">
            <span>📤</span>
          </button>
          <button type="button" class="btn btn-secondary btn-sm btn-icon" onclick="duplicatePlanProfile('${plan.id}')" title="ทำสำเนาแผนนี้เพื่อปรับแต่งแยกสายอาชีพ">
            <span>📋</span>
          </button>
          <button type="button" class="btn btn-danger btn-sm btn-icon" onclick="deletePlanProfile('${plan.id}')" title="ลบแผนนี้">
            <span>➖</span>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Seed or Reset the Nightcamp Example Plan
async function seedNightcampExamplePlan() {
  try {
    const payload = buildNightcampExamplePlanPayload();
    const res = await fetch(`${API_BASE}/api/plan-profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.success && result.profile) {
      await fetchAndRenderPlanProfiles();
      openPlanWorkflowEditor(result.profile.id);
      if (typeof showToast === 'function') showToast('🌱 โหลดแผนตัวอย่าง Nightcamp Lv.1–50 แล้ว สามารถปรับแต่งอาชีพ/แมพได้ทันที!', 'success');
    }
  } catch (e) {
    alert('เกิดข้อผิดพลาดในการสร้างแผนตัวอย่าง');
  }
}

// Create new customizable Plan Profile
async function createNewPlanProfile() {
  const name = prompt("ตั้งชื่อ Plan Profile ใหม่:", "แผนปั้นตัว Nightcamp #" + (currentPlanProfiles.length + 1));
  if (!name || !name.trim()) return;

  try {
    const now = Date.now();
    const res = await fetch(`${API_BASE}/api/plan-profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        description: "สร้างเมื่อ " + new Date().toLocaleDateString('th-TH') + " (ปรับแต่งได้เอง)",
        autoQuestEnabled: true,
        autoJobChange: true,
        autoStatSkillEnabled: true,
        class1Target: "archer",
        class1JobLevel: 10,
        class2Target: "ranger",
        class2JobLevel: 50,
        class3Target: "moonsniper",
        triggers: [
          {
            id: "trig_" + now,
            type: "base_level",
            targetLevel: 1,
            actions: [
              {
                id: "act_" + now,
                type: "auto_quest",
                questMode: "until_level",
                untilLevel: 15,
                untilQuest: "MQ15"
              },
              {
                id: "act_eq_" + now,
                type: "equip_best",
                itemName: ""
              }
            ]
          }
        ]
      })
    });
    const result = await res.json();
    if (result.success && result.profile) {
      await fetchAndRenderPlanProfiles();
      openPlanWorkflowEditor(result.profile.id);
    }
  } catch(e) {
    alert("เกิดข้อผิดพลาดในการสร้างแผนใหม่");
  }
}

// Delete Plan Profile
async function deletePlanProfile(planId) {
  const plan = currentPlanProfiles.find(p => p.id === planId);
  if (!plan) return;
  if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบแผน "${plan.name}"?\n(หากมีจอเกมที่ใช้แผนนี้อยู่ แผนจะถูกยกเลิก)`)) return;

  try {
    const res = await fetch(`${API_BASE}/api/plan-profiles/${planId}`, { method: 'DELETE' });
    const result = await res.json();
    if (result.success) {
      await fetchAndRenderPlanProfiles();
    }
  } catch(e) {
    alert("เกิดข้อผิดพลาดในการลบแผน");
  }
}

// Duplicate Plan Profile
async function duplicatePlanProfile(planId) {
  const plan = currentPlanProfiles.find(p => p.id === planId);
  if (!plan) return;

  try {
    const res = await fetch(`${API_BASE}/api/plan-profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign(JSON.parse(JSON.stringify(plan)), {
        id: undefined,
        name: plan.name + " (Copy)",
        autoJobChange: planAutoJobChangeOf(plan),
        autoQuestEnabled: plan.autoQuestEnabled !== false,
        autoStatSkillEnabled: plan.autoStatSkillEnabled !== false
      }))
    });
    const result = await res.json();
    if (result.success) {
      await fetchAndRenderPlanProfiles();
    }
  } catch(e) {
    alert("เกิดข้อผิดพลาดในการทำสำเนาแผน");
  }
}

// ---------- "ใช้งาน": pick which game clients (sessions) use this plan ----------
function openPlanAssignPicker(planId) {
  const plan = currentPlanProfiles.find(p => p.id === planId);
  if (!plan) return;

  let modal = document.getElementById('plan-assign-picker');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'plan-assign-picker';
    modal.className = 'modal-overlay';
    modal.style.zIndex = '1200';
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });
  }

  const planName = id => (currentPlanProfiles.find(p => p.id === id) || {}).name || '';
  const rows = currentProfiles.map(p => {
    const st = p.liveState || {};
    const assigned = currentPlanAssignments[p.id];
    const checked = assigned === planId || (!Object.values(currentPlanAssignments).includes(planId) && p.id === activePlanClientProfileId);
    const charLabel = st.charName || p.lastCharName || '';
    const cls = st.charClass || p.lastCharClass || p.charClass || '';
    const other = assigned && assigned !== planId ? `<span class="pp-other">ตอนนี้ใช้: ${escapeHTML(planName(assigned) || assigned)}</span>` : '';
    return `
      <label class="pp-row">
        <input type="checkbox" value="${escapeHTML(p.id)}" ${checked ? 'checked' : ''} data-was="${assigned === planId ? '1' : ''}">
        <span class="pp-dot ${p.isRunning ? 'on' : ''}" title="${p.isRunning ? 'ออนไลน์' : 'ออฟไลน์'}"></span>
        <span class="pp-main">
          <b>${escapeHTML(p.name || p.id)}</b>
          <small>${escapeHTML(charLabel)}${cls ? ' · ' + escapeHTML(cls) : ''} · Port ${escapeHTML(String(p.debugPort || '-'))}</small>
        </span>
        ${assigned === planId ? '<span class="pp-cur">ใช้แผนนี้อยู่</span>' : other}
      </label>`;
  }).join('');

  modal.innerHTML = `
    <div class="modal-card pp-card">
      <div class="pp-head">
        <div>
          <h3>⚡ ใช้แผน "${escapeHTML(plan.name)}" กับจอไหนบ้าง?</h3>
          <p>ติ๊กจอที่ต้องการ — จอที่เอาติ๊กออกจะถูกถอดแผนนี้ (ปิด Plan Script ของจอนั้น)</p>
        </div>
        <button type="button" class="pp-x" onclick="document.getElementById('plan-assign-picker').classList.remove('active')">✕</button>
      </div>
      <div class="pp-tools">
        <button type="button" class="btn btn-secondary btn-sm" id="pp-all">เลือกทั้งหมด</button>
        <button type="button" class="btn btn-secondary btn-sm" id="pp-none">ไม่เลือกเลย</button>
      </div>
      <div class="pp-list">${rows || '<div class="pp-empty">ยังไม่มีโปรไฟล์จอเกม</div>'}</div>
      <div class="pp-foot">
        <span class="pp-hint">จอที่ออฟไลน์จะได้รับแผนและเปิด Plan Script เองเมื่อเปิดจอ</span>
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('plan-assign-picker').classList.remove('active')">ยกเลิก</button>
        <button type="button" class="btn btn-success" id="pp-ok">⚡ ยืนยัน</button>
      </div>
    </div>`;

  const boxes = () => Array.from(modal.querySelectorAll('.pp-list input[type=checkbox]'));
  modal.querySelector('#pp-all').onclick = () => boxes().forEach(b => { b.checked = true; });
  modal.querySelector('#pp-none').onclick = () => boxes().forEach(b => { b.checked = false; });
  modal.querySelector('#pp-ok').onclick = async () => {
    const add = boxes().filter(b => b.checked).map(b => b.value);
    const remove = boxes().filter(b => !b.checked && b.dataset.was === '1').map(b => b.value);
    if (!add.length && !remove.length) { modal.classList.remove('active'); return; }
    const okBtn = modal.querySelector('#pp-ok');
    okBtn.disabled = true;
    okBtn.textContent = '⏳ กำลังส่งแผน...';
    try {
      const res = await fetch(`${API_BASE}/api/plan-profiles/${planId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientProfileIds: add, unassignProfileIds: remove })
      });
      const result = await res.json();
      if (result.success) {
        modal.classList.remove('active');
        alert(`⚡ ${result.message}`);
        await fetchAndRenderPlanProfiles();
        if (typeof refreshPlanLiveStatus === 'function') refreshPlanLiveStatus();
      } else {
        alert('❌ ' + (result.error || 'ผูกแผนไม่สำเร็จ'));
      }
    } catch (e) {
      alert('❌ เชื่อมต่อ Manager ไม่ได้');
    }
    okBtn.disabled = false;
    okBtn.textContent = '⚡ ยืนยัน';
  };
  modal.classList.add('active');
}

// Assign Plan to Active Client Card
async function assignPlanToActiveClient(planId) {
  if (!activePlanClientProfileId) return;

  try {
    const res = await fetch(`${API_BASE}/api/plan-profiles/${planId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientProfileId: activePlanClientProfileId })
    });
    const result = await res.json();
    if (result.success) {
      alert(`⚡ ${result.message || 'ผูกแผนกับจอนี้เรียบร้อยแล้ว!'}`);
      await fetchAndRenderPlanProfiles();
    }
  } catch(e) {
    alert("เกิดข้อผิดพลาดในการผูกแผน");
  }
}

// Open Visual Workflow Editor for a Plan
function openPlanWorkflowEditor(planId) {
  const plan = currentPlanProfiles.find(p => p.id === planId);
  if (!plan) return;

  activeEditingPlan = JSON.parse(JSON.stringify(plan));
  if (!activeEditingPlan.class1Target) activeEditingPlan.class1Target = 'archer';
  if (!activeEditingPlan.class2Target) activeEditingPlan.class2Target = 'ranger';
  if (activeEditingPlan.autoQuestEnabled === undefined) activeEditingPlan.autoQuestEnabled = true;
  if (activeEditingPlan.autoStatSkillEnabled === undefined) activeEditingPlan.autoStatSkillEnabled = true;
  if (!activeEditingPlan.skillBuild) activeEditingPlan.skillBuild = { skillPointQueue: [], plannedLevels: {} };
  if (!activeEditingPlan.statBuild) activeEditingPlan.statBuild = {
    queue: [{ stat: 'DEX', to: 30 }, { stat: 'AGI', to: 30 }, { stat: 'DEX', to: 60 }, { stat: 'AGI', to: 60 }, { stat: 'DEX', to: 99 }, { stat: 'AGI', to: 99 }],
    targets: { STR: 1, AGI: 99, VIT: 1, INT: 1, DEX: 99, LUK: 1 },
    priorityOrder: ['DEX', 'AGI', 'LUK', 'VIT', 'INT', 'STR']
  };

  const titleInput = document.getElementById("plan-editor-title");
  const descInput = document.getElementById("plan-editor-desc");
  if (titleInput) titleInput.value = activeEditingPlan.name || "Untitled Plan";
  if (descInput) descInput.value = activeEditingPlan.description || "";

  if (typeof updateClassDropdownsInEditor === 'function') {
    updateClassDropdownsInEditor();
  }
  if (typeof updatePlanEditorBadges === 'function') {
    updatePlanEditorBadges();
  }

  sortPlanTriggers();
  renderPlanWorkflowCanvas();
  markPlanDirty(false);
  switchPlanModalView('editor');
}

// ---------- Plan editor: trigger timeline (n8n-style) ----------
const planCollapsedTriggers = new Set();
let planEditorDirty = false;

function markPlanDirty(dirty = true) {
  planEditorDirty = dirty;
  const badge = document.getElementById('plan-editor-dirty');
  if (badge) badge.style.display = dirty ? '' : 'none';
}

function confirmDiscardPlanChanges() {
  return !planEditorDirty || confirm('แผนนี้มีการแก้ไขที่ยังไม่ได้บันทึก — ปิดโดยไม่บันทึกใช่ไหม?');
}

function planMapLabel(value) {
  for (const g of PLAN_MAP_OPTIONS) {
    const m = g.maps.find(x => x.value === value);
    if (m) return m.label;
  }
  return value || '-';
}

function planClassLabel(value) {
  const c = PLAN_CLASS_OPTIONS.find(x => x.value === String(value || '').toLowerCase());
  return c ? c.label : (value || '-');
}

function planLifeItemLabel(itemId) {
  const it = PLAN_LIFE_ITEM_OPTIONS.find(x => x.value === itemId);
  return it ? it.label : (itemId || '-');
}

// Short chips shown in the trigger header so the whole plan reads at a glance
function planActionSummary(act) {
  if (act.type === 'auto_quest') {
    if (act.questMode === 'until_level') return `🧭 Smart Auto-Quest (ทำถึง Base Lv.${act.untilLevel || 15})`;
    if (act.questMode === 'until_quest') return `🧭 Smart Auto-Quest (ทำถึงเควส ${act.untilQuest || 'MQ08'})`;
    return '🧭 Smart Auto-Quest (ทำเควสหลัก & บทเรียนต่อเนื่อง)';
  }
  if (act.type === 'change_map') {
    const mon = act.targetMonster ? ` · ตีเฉพาะ: ${act.targetMonster}` : '';
    return `🗺️ ย้ายแมพ: ${planMapLabel(act.targetMap)}${mon}`;
  }
  if (act.type === 'change_class') {
    return `⚔️ เปลี่ยนอาชีพ: ${planClassLabel(act.targetClass)}`;
  }
  if (act.type === 'life_gather') {
    const jobName = act.lifeJob === 'mine' ? 'ขุดแร่' : act.lifeJob === 'farm' ? 'ปลูกผัก' : 'ตัดไม้';
    return `🪓 ${jobName}: ${planLifeItemLabel(act.itemId)} x${act.qty || 10}`;
  }
  if (act.type === 'sell_trip') {
    return `🛒 กลับค่ายขายของ & ซื้อยา (แดง ${act.redQty ?? 30} / ฟ้า ${act.blueQty ?? 15})`;
  }
  if (act.type === 'equip_best') {
    return act.itemName ? `🛡️ สวมใส่: ${act.itemName}` : '🛡️ สวมใส่อุปกรณ์ที่ดีที่สุดในกระเป๋า';
  }
  if (act.type === 'equip_item') {
    return `🛡️ สวมใส่: ${act.itemName || 'อุปกรณ์ที่ดีที่สุด'}`;
  }
  return act.type;
}

function planHasClassAction(plan) {
  return (plan?.triggers || []).some(t => (t.actions || []).some(a => a.type === 'change_class'));
}
function planAutoJobChangeOf(plan) {
  if (!plan) return true;
  return typeof plan.autoJobChange === 'boolean' ? plan.autoJobChange : true;
}
function refreshAutoJobUi() {
  const on = planAutoJobChangeOf(activeEditingPlan);
  const aqOn = activeEditingPlan ? (activeEditingPlan.autoQuestEnabled !== false) : true;
  const stOn = activeEditingPlan ? (activeEditingPlan.autoStatSkillEnabled !== false) : true;
  document.querySelectorAll('.pe-joblv').forEach(el => { el.style.display = on ? '' : 'none'; });
  const hint = document.getElementById('plan-autojob-hint');
  if (hint) {
    const parts = [];
    if (aqOn) parts.push('🧭 <b>Smart Auto-Quest:</b> บอททำเควสหลัก (MQ) + บทเรียน (L1–L36) และแก้จุดค้างทุกจุดให้อัตโนมัติ');
    if (on) parts.push('⚔️ <b>เปลี่ยนอาชีพอัตโนมัติ:</b> เปลี่ยน Class 1 ที่ Job 10, Class 2 ที่ Job 50 และ Class 3 ที่ Base 80 / Job 50 ตามที่เลือกด้านบน');
    if (stOn) parts.push('⚡ <b>อัป Stat/Skill อัตโนมัติ:</b> อัปสเตตัสและสกิลพร้อมใส่ช่องสกิลให้อัตโนมัติ');
    hint.innerHTML = parts.length ? parts.join(' · ') : 'ℹ️ ปรับแต่งการทำงานผ่านรายการเงื่อนไข (Triggers) ด้านล่างได้เลย';
  }
}

function planClassTier(cls) {
  const c = String(cls || '').toLowerCase();
  if (!c) return 9;
  if (c === 'novice' || c === 'traveler') return 0;
  if (typeof CLASS_TREE_MAP !== 'undefined' && CLASS_TREE_MAP[c]) return 1;
  return 2;
}
const PLAN_TRIGGER_RANK = { base_level: 0, job_level: 1, zeny: 2 };
function planTriggerOrder(a, b) {
  if (a.type === 'zeny' || b.type === 'zeny') {
    return ((PLAN_TRIGGER_RANK[a.type] || 0) - (PLAN_TRIGGER_RANK[b.type] || 0)) || (Number(a.targetZeny) || 0) - (Number(b.targetZeny) || 0);
  }
  return (a.type === b.type ? 0 : a.type === 'job_level' ? 1 : -1)
    || (a.type === 'job_level' ? planClassTier(a.classId) - planClassTier(b.classId) : 0)
    || (parseInt(a.targetLevel, 10) || 0) - (parseInt(b.targetLevel, 10) || 0);
}
function planTriggerLabel(t) {
  if (t.type === 'zeny') return `เงิน ≥ ${(Number(t.targetZeny) || 0).toLocaleString()} Gold`;
  if (t.type !== 'job_level') return `Base Lv.${t.targetLevel}`;
  return `Job Lv.${t.targetLevel} (${t.classId ? planClassLabel(t.classId) : 'ทุกอาชีพ'})`;
}
function jobClassChoices(trig) {
  const p = activeEditingPlan || {};
  const ids = ['traveler', p.class1Target, p.class2Target, trig.classId].filter(Boolean).map(x => String(x).toLowerCase());
  return [...new Set(ids)];
}
function sortPlanTriggers() {
  const t = activeEditingPlan && activeEditingPlan.triggers;
  if (!Array.isArray(t)) return;
  t.sort(planTriggerOrder);
}

// ---------- Plan editor: summary timeline + "เพิ่ม/แก้ไขเงื่อนไข" dialog ----------
let planDraft = null;
let planDraftIdx = -1;

function planTrigger(trigIdx) {
  if (trigIdx === -1) return planDraft;
  return activeEditingPlan && activeEditingPlan.triggers ? activeEditingPlan.triggers[trigIdx] : null;
}
function planRerender(trigIdx) {
  if (trigIdx === -1) renderTriggerDialog();
  else renderPlanWorkflowCanvas();
}
function planWhenText(t) {
  if (t.type === 'zeny') return `💰 เงิน ≥ ${(Number(t.targetZeny) || 0).toLocaleString()} Gold`;
  if (t.type === 'job_level') return `Job Lv.${parseInt(t.targetLevel, 10) || 1} · ${t.classId ? planClassLabel(t.classId).split(' (')[0] : 'ทุกอาชีพ'}`;
  return `Base Lv.${parseInt(t.targetLevel, 10) || 1}`;
}

// Render Triggers (summary cards)
function renderPlanWorkflowCanvas() {
  const canvas = document.getElementById("plan-workflow-canvas");
  if (!canvas || !activeEditingPlan) return;

  const triggers = activeEditingPlan.triggers || [];
  if (triggers.length === 0) {
    canvas.innerHTML = `
      <div class="pe-empty">
        <div class="pe-empty-icon">🎯</div>
        <b>ยังไม่มีเงื่อนไขในแผนนี้</b>
        <span>กด <b>"➕ เพิ่มเงื่อนไข"</b> แล้วเลือกว่า <b>เมื่อไหร่</b> (Base Lv. / Job Lv. / เงิน) และ <b>ทำอะไร</b> เช่น Base Lv.1 → ทำเควสอัตโนมัติ (Smart Auto-Quest) → ย้ายแมพฟาร์ม</span>
      </div>`;
    return;
  }

  canvas.innerHTML = `<div class="pe-timeline">${triggers.map((trig, trigIdx) => {
    const isJob = trig.type === 'job_level';
    const isZeny = trig.type === 'zeny';
    const actions = trig.actions || [];
    return `
      <div class="pe-node ${isZeny ? 'zeny' : isJob ? 'job' : 'base'}" data-trigger-idx="${trigIdx}" data-trigger-id="${escapeHTML(trig.id || '')}">
        <div class="pe-rail"><span class="pe-dot">${isZeny ? '💰' : isJob ? 'J' : 'B'}</span></div>
        <div class="pe-card pe-sum" onclick="openTriggerDialog(${trigIdx})" title="คลิกเพื่อแก้ไขเงื่อนไขนี้">
          <div class="pe-sum-when">${escapeHTML(planWhenText(trig))}</div>
          <div class="pe-sum-steps">
            ${actions.length
              ? actions.map((a, i) => `<span class="pe-sum-step"><i>${i + 1}</i><span class="pe-chip ${a.type}">${escapeHTML(planActionSummary(a))}</span></span>`).join('<span class="pe-sum-arrow">→</span>')
              : '<span class="pe-chip empty">ยังไม่มี Action — คลิกเพื่อเพิ่ม</span>'}
          </div>
          <div class="pe-head-btns" onclick="event.stopPropagation()">
            <button type="button" class="pe-icon-btn" onclick="openTriggerDialog(${trigIdx})" title="แก้ไข">✏️</button>
            <button type="button" class="pe-icon-btn" onclick="duplicateTrigger(${trigIdx})" title="ทำสำเนาเงื่อนไขนี้">⧉</button>
            <button type="button" class="pe-icon-btn danger" onclick="removeTrigger(${trigIdx})" title="ลบเงื่อนไขนี้">🗑</button>
          </div>
        </div>
      </div>`;
  }).join('')}</div>`;
}

function focusPlanTrigger(id) {
  const node = document.querySelector(`.pe-node[data-trigger-id="${CSS.escape(String(id || ''))}"]`);
  if (!node) return;
  node.scrollIntoView({ behavior: 'smooth', block: 'center' });
  node.classList.remove('pe-flash');
  void node.offsetWidth;
  node.classList.add('pe-flash');
}

// ---- Customizable Nightcamp Action Tiles ----
const PLAN_ACTION_TILES = [
  { type: 'auto_quest', icon: '🧭', title: 'ทำเควสอัตโนมัติ', desc: 'Smart Auto-Quest (เควสหลัก MQ + บทเรียน)' },
  { type: 'change_map', icon: '🗺️', title: 'ย้ายแมพฟาร์ม', desc: 'เดินไปแมพที่เลือก & เปิด Auto-Farm' },
  { type: 'change_class', icon: '⚔️', title: 'เปลี่ยนอาชีพ', desc: 'เปลี่ยนเป็น Class 1 / Class 2 / Class 3' },
  { type: 'life_gather', icon: '🪓', title: 'อาชีพเสริม (Life)', desc: 'ตัดไม้ / ขุดแร่ / ปลูกผักตามจำนวน' },
  { type: 'sell_trip', icon: '🛒', title: 'กลับค่ายขายของ/ซื้อยา', desc: 'ขายขยะ & ซื้อยาแดง/ยาฟ้าที่ลุงโกโก้' },
  { type: 'equip_best', icon: '🛡️', title: 'สวมใส่อุปกรณ์ที่ดีที่สุด', desc: 'เช็คกระเป๋า & ใส่อาวุธ/เกราะที่แรงสุด' }
];

function openTriggerDialog(trigIdx) {
  if (!activeEditingPlan) return;
  if (!Array.isArray(activeEditingPlan.triggers)) activeEditingPlan.triggers = [];
  if (trigIdx >= 0 && activeEditingPlan.triggers[trigIdx]) {
    planDraftIdx = trigIdx;
    planDraft = JSON.parse(JSON.stringify(activeEditingPlan.triggers[trigIdx]));
  } else {
    planDraftIdx = -1;
    const baseLevels = activeEditingPlan.triggers.filter(t => t.type === 'base_level' || !t.type).map(t => parseInt(t.targetLevel, 10) || 0);
    planDraft = { id: "trig_" + Date.now(), type: "base_level", targetLevel: baseLevels.length ? Math.max(...baseLevels) + 10 : 1, actions: [] };
  }
  let dlg = document.getElementById('pe-trigger-dialog');
  if (!dlg) {
    dlg = document.createElement('div');
    dlg.id = 'pe-trigger-dialog';
    dlg.className = 'modal-overlay pe-dlg';
    document.body.appendChild(dlg);
    dlg.addEventListener('mousedown', e => { if (e.target === dlg) closeTriggerDialog(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && dlg.classList.contains('active')) closeTriggerDialog(); });
  }
  renderTriggerDialog();
  dlg.classList.add('active');
}

function closeTriggerDialog() {
  const dlg = document.getElementById('pe-trigger-dialog');
  if (dlg) dlg.classList.remove('active');
  planDraft = null;
  planDraftIdx = -1;
}

function draftSet(field, val) {
  if (!planDraft) return;
  if (field === 'type') {
    planDraft.type = val;
    if (val === 'job_level' && planDraft.classId === undefined) planDraft.classId = 'traveler';
    if (val !== 'job_level') delete planDraft.classId;
    if (val === 'zeny' && !(Number(planDraft.targetZeny) > 0)) planDraft.targetZeny = 5000;
    if (val !== 'zeny' && !(parseInt(planDraft.targetLevel, 10) > 0)) planDraft.targetLevel = 10;
    renderTriggerDialog();
    return;
  }
  if (field === 'targetLevel') planDraft.targetLevel = Math.max(1, Math.min(200, parseInt(val, 10) || 1));
  else if (field === 'targetZeny') planDraft.targetZeny = Math.max(1, parseInt(String(val).replace(/[^0-9]/g, ''), 10) || 1);
  else planDraft[field] = val;
  const head = document.querySelector('#pe-trigger-dialog .pe-dlg-when-text');
  if (head) head.textContent = planWhenText(planDraft);
}

function moveAction(trigIdx, actIdx, dir) {
  const trig = planTrigger(trigIdx);
  if (!trig || !trig.actions) return;
  const to = actIdx + dir;
  if (to < 0 || to >= trig.actions.length) return;
  const [a] = trig.actions.splice(actIdx, 1);
  trig.actions.splice(to, 0, a);
  if (trigIdx !== -1) markPlanDirty();
  planRerender(trigIdx);
}

function renderTriggerDialog() {
  const dlg = document.getElementById('pe-trigger-dialog');
  if (!dlg || !planDraft) return;
  const t = planDraft;
  const isJob = t.type === 'job_level', isZeny = t.type === 'zeny', isBase = !isJob && !isZeny;
  const scrollBox = dlg.querySelector('.pe-dlg-body');
  const keepScroll = scrollBox ? scrollBox.scrollTop : 0;
  dlg.innerHTML = `
    <div class="modal-card pe-dlg-card">
      <div class="pe-dlg-head">
        <div>
          <h3>${planDraftIdx >= 0 ? '✏️ แก้ไขเงื่อนไข (Trigger & Actions)' : '➕ เพิ่มเงื่อนไขใหม่ (ปรับแต่งได้อิสระ)'}</h3>
          <p class="pe-dlg-when-text">${escapeHTML(planWhenText(t))}</p>
        </div>
        <button type="button" class="pp-x" onclick="closeTriggerDialog()" title="ปิด (Esc)">✕</button>
      </div>
      <div class="pe-dlg-body">
        <section class="pe-dlg-step">
          <div class="pe-dlg-step-title"><span>1</span> ทำเมื่อไหร่ (Trigger)</div>
          <div class="pe-dlg-kinds">
            <button type="button" class="${isBase ? 'on' : ''}" onclick="draftSet('type', 'base_level')"><b>Base Lv.</b><small>เลเวลตัวละคร</small></button>
            <button type="button" class="${isJob ? 'on' : ''}" onclick="draftSet('type', 'job_level')"><b>Job Lv.</b><small>เลเวลอาชีพ</small></button>
            <button type="button" class="${isZeny ? 'on' : ''}" onclick="draftSet('type', 'zeny')"><b>💰 เงิน (Gold)</b><small>เมื่อเงินถึงจำนวน</small></button>
          </div>
          <div class="pe-dlg-when">
            ${isZeny ? `
              <label>เมื่อมีเงิน ≥ <input type="number" class="form-input" min="1" step="500" value="${Number(t.targetZeny) || 5000}" oninput="draftSet('targetZeny', this.value)"> Gold</label>
            ` : `
              <label>ถึง ${isJob ? 'Job' : 'Base'} Lv. <input type="number" class="form-input" min="1" max="200" value="${parseInt(t.targetLevel, 10) || 1}" oninput="draftSet('targetLevel', this.value)"></label>
              ${isJob ? `
              <label>ของอาชีพ
                <select class="form-select" onchange="draftSet('classId', this.value)">
                  ${jobClassChoices(t).map(c => `<option value="${escapeHTML(c)}" ${String(t.classId || '').toLowerCase() === c ? 'selected' : ''}>${escapeHTML(planClassLabel(c))}</option>`).join('')}
                  <option value="" ${!t.classId ? 'selected' : ''}>ทุกอาชีพ</option>
                </select>
              </label>` : ''}
            `}
          </div>
          <small class="pe-hint">${isZeny ? 'ทำครั้งเดียวเมื่อเงินในตัวถึงจำนวนนี้' : isJob ? 'Job Lv. เริ่มนับ 1 ใหม่เมื่อเปลี่ยนอาชีพ เลือกอาชีพต้นทางที่ต้องการเช็ค Job Lv.' : 'ทำตามลำดับเมื่อ Base Lv. ของตัวละครถึงค่าที่กำหนด'}</small>
        </section>

        <section class="pe-dlg-step">
          <div class="pe-dlg-step-title"><span>2</span> ทำอะไรบ้าง <small>(คลิกปุ่มด้านล่างเพื่อเพิ่ม Action · เรียงลำดับจากบนลงล่าง)</small></div>
          <div class="pe-dlg-actions">
            ${(t.actions || []).length
              ? t.actions.map((a, i) => `<div class="pe-dlg-act"><div class="pe-dlg-act-no">${i + 1}</div>${renderActionNodeHtml(-1, i, a)}</div>`).join('')
              : '<div class="pe-dlg-noact">ยังไม่มี Action — คลิกเลือกจากปุ่มด้านล่างได้เลย</div>'}
          </div>
          <div class="pe-dlg-tiles">
            ${PLAN_ACTION_TILES.map(x => `<button type="button" onclick="addActionToTrigger(-1, '${x.type}')"><span>${x.icon}</span><b>${x.title}</b><small>${x.desc}</small></button>`).join('')}
          </div>
        </section>
      </div>
      <div class="pe-dlg-foot">
        <span class="pe-dlg-err" id="pe-dlg-err"></span>
        <button type="button" class="btn btn-secondary" onclick="closeTriggerDialog()">ยกเลิก</button>
        <button type="button" class="btn btn-success" onclick="submitTriggerDialog()">✔ ${planDraftIdx >= 0 ? 'บันทึกการแก้ไข' : 'ส่งลงแผน'}</button>
      </div>
    </div>`;
  const body = dlg.querySelector('.pe-dlg-body');
  if (body) body.scrollTop = keepScroll;
}

function submitTriggerDialog() {
  const t = planDraft;
  if (!t || !activeEditingPlan) return;
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  const err = [];
  if (!(t.actions || []).length) err.push('เพิ่ม Action อย่างน้อย 1 อย่าง');
  if (t.type === 'zeny' && !(Number(t.targetZeny) > 0)) err.push('ใส่จำนวนเงิน');
  if (err.length) {
    const box = document.getElementById('pe-dlg-err');
    if (box) box.textContent = '⚠️ ' + err.join(' · ');
    return;
  }
  const id = t.id || ("trig_" + Date.now());
  t.id = id;
  if (planDraftIdx >= 0 && activeEditingPlan.triggers[planDraftIdx]) activeEditingPlan.triggers[planDraftIdx] = t;
  else activeEditingPlan.triggers.push(t);
  sortPlanTriggers();
  markPlanDirty();
  closeTriggerDialog();
  renderPlanWorkflowCanvas();
  setTimeout(() => focusPlanTrigger(id), 60);
}

// Render single Action Node (used in the dialog; trigIdx -1 = the draft)
function renderActionNodeHtml(trigIdx, actIdx, act) {
  const draft = trigIdx === -1 ? planDraft : planTrigger(trigIdx);
  const count = draft && draft.actions ? draft.actions.length : 0;
  const moves = `
    <button type="button" class="pe-icon-btn sm" onclick="moveAction(${trigIdx}, ${actIdx}, -1)" ${actIdx === 0 ? 'disabled' : ''} title="ย้ายขึ้น">↑</button>
    <button type="button" class="pe-icon-btn sm" onclick="moveAction(${trigIdx}, ${actIdx}, 1)" ${actIdx >= count - 1 ? 'disabled' : ''} title="ย้ายลง">↓</button>`;
  const del = `<span class="pe-act-btns">${moves}<button type="button" class="pe-icon-btn danger sm" onclick="removeAction(${trigIdx}, ${actIdx})" title="ลบ Action นี้">✕</button></span>`;

  if (act.type === 'auto_quest') {
    const mode = act.questMode || 'until_level';
    return `
      <div class="pe-action auto_quest">
        <div class="pe-act-icon">🧭</div>
        <div class="pe-act-main">
          <div class="pe-act-title"><b>ทำเควสอัตโนมัติ (Smart Auto-Quest)</b>${del}</div>
          <div class="pe-fields">
            <label>โหมดการทำเควส
              <select class="form-select" onchange="updateActionField(${trigIdx}, ${actIdx}, 'questMode', this.value); planRerender(${trigIdx});">
                <option value="until_level" ${mode === 'until_level' ? 'selected' : ''}>🎯 ทำเควสหลัก & บทเรียนจนถึง Base Lv. ที่กำหนด</option>
                <option value="until_quest" ${mode === 'until_quest' ? 'selected' : ''}>📜 ทำเควสจนจบเควสหลัก (MQ) ที่ระบุ</option>
                <option value="all" ${mode === 'all' ? 'selected' : ''}>♾️ ทำเควสหลัก (MQ) & บทเรียน (L1–L36) ต่อเนื่องทั้งหมด</option>
              </select>
            </label>
            ${mode === 'until_level' ? `
            <label>ทำเควสจนถึง Base Lv.
              <input type="number" class="form-input" min="1" max="99" value="${act.untilLevel || 15}" onchange="updateActionField(${trigIdx}, ${actIdx}, 'untilLevel', Math.max(1, parseInt(this.value, 10) || 15))">
            </label>
            ` : mode === 'until_quest' ? `
            <label>ทำจนจบเควส
              <select class="form-select" onchange="updateActionField(${trigIdx}, ${actIdx}, 'untilQuest', this.value)">
                ${PLAN_QUEST_CHECKPOINTS.map(q => `<option value="${q.value}" ${(act.untilQuest || 'MQ08') === q.value ? 'selected' : ''}>${escapeHTML(q.label)}</option>`).join('')}
              </select>
            </label>
            ` : ''}
          </div>
          <small class="pe-hint">บอทจะขับเคลื่อนเควสหลักและบทเรียน พร้อมกดข้ามเนื้อเรื่อง/รับส่งเควส/นั่งกองไฟ/ตีบวก/ทำอาหาร/เปลี่ยนอาชีพตามเควสให้อัตโนมัติโดยไม่ค้าง</small>
        </div>
      </div>`;
  }

  if (act.type === 'change_map') {
    return `
      <div class="pe-action change_map">
        <div class="pe-act-icon">🗺️</div>
        <div class="pe-act-main">
          <div class="pe-act-title"><b>ย้ายแมพฟาร์ม (Auto-Farm)</b>${del}</div>
          <div class="pe-fields">
            <label>เลือกแมพ Nightcamp ที่จะไปฟาร์ม
              <select class="form-select" onchange="updateActionField(${trigIdx}, ${actIdx}, 'targetMap', this.value)">
                ${PLAN_MAP_OPTIONS.map(grp => `
                  <optgroup label="${escapeHTML(grp.group)}">
                    ${grp.maps.map(m => `<option value="${escapeHTML(m.value)}" ${act.targetMap === m.value ? 'selected' : ''}>${escapeHTML(m.label)}</option>`).join('')}
                  </optgroup>`).join('')}
              </select>
            </label>
            <label>ตีเฉพาะมอนสเตอร์ (เว้นว่าง = ตีทุกตัวในแมพ)
              <input type="text" class="form-input" placeholder="เช่น เห็ดสปอร์, หมาป่า, โครงกระดูก (เว้นว่าง = ตีทุกตัว)" value="${escapeHTML(act.targetMonster || '')}" onchange="updateActionField(${trigIdx}, ${actIdx}, 'targetMonster', this.value.trim())">
            </label>
          </div>
          <small class="pe-hint">บอทจะเดินทางไปยังแมพที่เลือกและเปิดระบบ Auto-Farm ตีมอนสเตอร์ในแมพนั้นทันที</small>
        </div>
      </div>`;
  }

  if (act.type === 'change_class') {
    return `
      <div class="pe-action change_class">
        <div class="pe-act-icon">⚔️</div>
        <div class="pe-act-main">
          <div class="pe-act-title"><b>เปลี่ยนอาชีพ (Change Class)</b>${del}</div>
          <select class="form-select" onchange="updateActionField(${trigIdx}, ${actIdx}, 'targetClass', this.value)">
            ${PLAN_CLASS_OPTIONS.map(cls => `<option value="${cls.value}" ${String(act.targetClass || '').toLowerCase() === cls.value ? 'selected' : ''}>${cls.label}</option>`).join('')}
          </select>
          <small class="pe-hint">เมื่อถึง Job Lv. ที่เปลี่ยนอาชีพได้ (Class 1 = Job 10, Class 2 = Job 50, Class 3 = Base 80 / Job 50) บอทจะเปลี่ยนเป็นอาชีพนี้และใส่อาวุธประจำอาชีพให้อัตโนมัติ</small>
        </div>
      </div>`;
  }

  if (act.type === 'life_gather') {
    const job = act.lifeJob || 'wood';
    const items = PLAN_LIFE_ITEM_OPTIONS.filter(x => x.job === job);
    return `
      <div class="pe-action life_gather">
        <div class="pe-act-icon">🪓</div>
        <div class="pe-act-main">
          <div class="pe-act-title"><b>อาชีพเสริมอัตโนมัติ (ตัดไม้ / ขุดแร่ / ปลูกผัก)</b>${del}</div>
          <div class="pe-fields pe-fields-3">
            <label>สายอาชีพเสริม
              <select class="form-select" onchange="updateActionField(${trigIdx}, ${actIdx}, 'lifeJob', this.value); const first = PLAN_LIFE_ITEM_OPTIONS.find(x => x.job === this.value); if (first) updateActionField(${trigIdx}, ${actIdx}, 'itemId', first.value); planRerender(${trigIdx});">
                <option value="wood" ${job === 'wood' ? 'selected' : ''}>🪵 ตัดไม้ (Woodcutting)</option>
                <option value="mine" ${job === 'mine' ? 'selected' : ''}>⛏️ ขุดแร่ (Mining)</option>
                <option value="farm" ${job === 'farm' ? 'selected' : ''}>🌾 ปลูกผัก (Farming)</option>
              </select>
            </label>
            <label>วัตถุดิบเป้าหมาย
              <select class="form-select" onchange="updateActionField(${trigIdx}, ${actIdx}, 'itemId', this.value)">
                ${items.map(it => `<option value="${it.value}" ${act.itemId === it.value ? 'selected' : ''}>${escapeHTML(it.label)}</option>`).join('')}
              </select>
            </label>
            <label>เก็บให้ครบ (ชิ้น)
              <input type="number" class="form-input" min="1" max="500" value="${act.qty || 10}" onchange="updateActionField(${trigIdx}, ${actIdx}, 'qty', Math.max(1, parseInt(this.value, 10) || 10))">
            </label>
          </div>
          <small class="pe-hint">บอทจะเดินไปจุดตัดไม้/ขุดแร่/แปลงเกษตร และเก็บวัตถุดิบจนครบจำนวนในกระเป๋าแล้วทำ Action ถัดไป</small>
        </div>
      </div>`;
  }

  if (act.type === 'sell_trip') {
    return `
      <div class="pe-action sell_trip">
        <div class="pe-act-icon">🛒</div>
        <div class="pe-act-main">
          <div class="pe-act-title"><b>กลับค่ายขายของ & ซื้อยา (ลุงโกโก้)</b>${del}</div>
          <div class="pe-fields pe-fields-3">
            <label class="pe-check" style="align-self:center;">
              <input type="checkbox" ${act.sellMaterials !== false ? 'checked' : ''} onchange="updateActionField(${trigIdx}, ${actIdx}, 'sellMaterials', this.checked)">
              ขายขยะ/วัตถุดิบมอน
            </label>
            <label>ซื้อยาแดง (Red Potion) ให้ครบ
              <input type="number" class="form-input" min="0" max="500" value="${act.redQty ?? 30}" onchange="updateActionField(${trigIdx}, ${actIdx}, 'redQty', Math.max(0, parseInt(this.value, 10) || 0))">
            </label>
            <label>ซื้อยาฟ้า (Blue Potion) ให้ครบ
              <input type="number" class="form-input" min="0" max="500" value="${act.blueQty ?? 15}" onchange="updateActionField(${trigIdx}, ${actIdx}, 'blueQty', Math.max(0, parseInt(this.value, 10) || 0))">
            </label>
          </div>
          <small class="pe-hint">บอทจะกลับค่ายกลางป่าไปคุยกับลุงโกโก้ ขายวัตถุดิบดรอป และซื้อยาแดง/ยาฟ้าเติมให้ครบตามจำนวน</small>
        </div>
      </div>`;
  }

  if (act.type === 'equip_best' || act.type === 'equip_item') {
    return `
      <div class="pe-action equip_item">
        <div class="pe-act-icon">🛡️</div>
        <div class="pe-act-main">
          <div class="pe-act-title"><b>สวมใส่อุปกรณ์ที่ดีที่สุดในกระเป๋า</b>${del}</div>
          <div class="pe-fields">
            <label>ระบุชื่อไอเทมเฉพาะเจาะจง (เว้นว่าง = เลือกชิ้นที่ค่าพลังดีที่สุดในกระเป๋าอัตโนมัติ)
              <input type="text" class="form-input" placeholder="เว้นว่างเพื่อให้บอทเทียบใส่ชิ้นที่ดีที่สุดในกระเป๋าอัตโนมัติ" value="${escapeHTML(act.itemName || '')}" onchange="updateActionField(${trigIdx}, ${actIdx}, 'itemName', this.value.trim())">
            </label>
          </div>
          <small class="pe-hint">บอทจะตรวจสอบอาวุธและชุดเกราะในกระเป๋าที่อาชีพปัจจุบันใส่ได้ แล้วสวมใส่ชิ้นที่เพิ่ม ATK/MATK/DEF สูงสุดให้อัตโนมัติ</small>
        </div>
      </div>`;
  }

  return '';
}

// Trigger and Action Mutators
function addLevelTrigger() {
  openTriggerDialog(-1);
}

function removeTrigger(trigIdx) {
  if (!activeEditingPlan || !activeEditingPlan.triggers) return;
  const t = activeEditingPlan.triggers[trigIdx];
  if (t && (t.actions || []).length && !confirm(`ลบเงื่อนไข "${planWhenText(t)}" และ Action ทั้ง ${(t.actions || []).length} รายการ?`)) return;
  activeEditingPlan.triggers.splice(trigIdx, 1);
  markPlanDirty();
  renderPlanWorkflowCanvas();
}

function duplicateTrigger(trigIdx) {
  if (!activeEditingPlan || !activeEditingPlan.triggers) return;
  const src = activeEditingPlan.triggers[trigIdx];
  if (!src) return;
  const copy = JSON.parse(JSON.stringify(src));
  copy.id = "trig_" + Date.now();
  if (copy.type === 'zeny') copy.targetZeny = (Number(src.targetZeny) || 0) + 5000;
  else copy.targetLevel = (parseInt(src.targetLevel, 10) || 1) + 5;
  (copy.actions || []).forEach(a => { a.id = "act_" + Date.now() + "_" + Math.floor(Math.random() * 1000); });
  activeEditingPlan.triggers.push(copy);
  sortPlanTriggers();
  markPlanDirty();
  renderPlanWorkflowCanvas();
  setTimeout(() => focusPlanTrigger(copy.id), 60);
}

function addActionToTrigger(trigIdx, actionType) {
  if (!activeEditingPlan) return;
  const trig = planTrigger(trigIdx);
  if (!trig) return;
  if (!Array.isArray(trig.actions)) trig.actions = [];
  const newAction = { id: "act_" + Date.now() + "_" + Math.floor(Math.random() * 100), type: actionType };
  if (actionType === 'auto_quest') {
    Object.assign(newAction, { questMode: 'until_level', untilLevel: Math.max(10, (parseInt(trig.targetLevel, 10) || 1) + 10), untilQuest: 'MQ08' });
  } else if (actionType === 'change_map') {
    Object.assign(newAction, { targetMap: 'meadow', targetMonster: '' });
  } else if (actionType === 'change_class') {
    newAction.targetClass = (trig.type === 'job_level' && (trig.classId === 'traveler' || trig.classId === 'novice'))
      ? (activeEditingPlan.class1Target || 'archer')
      : (activeEditingPlan.class2Target || 'ranger');
  } else if (actionType === 'life_gather') {
    Object.assign(newAction, { lifeJob: 'wood', itemId: 'lf_birch', qty: 10 });
  } else if (actionType === 'sell_trip') {
    Object.assign(newAction, { sellMaterials: true, redQty: 30, blueQty: 15 });
  } else if (actionType === 'equip_best') {
    Object.assign(newAction, { itemName: '' });
  }
  trig.actions.push(newAction);
  if (trigIdx !== -1) markPlanDirty();
  planRerender(trigIdx);
  if (trigIdx === -1) {
    setTimeout(() => {
      const acts = document.querySelectorAll('#pe-trigger-dialog .pe-dlg-act');
      if (acts.length) acts[acts.length - 1].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 30);
  }
}

function removeAction(trigIdx, actIdx) {
  const trig = planTrigger(trigIdx);
  if (trig && trig.actions) {
    trig.actions.splice(actIdx, 1);
    if (trigIdx !== -1) markPlanDirty();
    planRerender(trigIdx);
  }
}

function updateActionField(trigIdx, actIdx, field, val) {
  const trig = planTrigger(trigIdx);
  if (trig && trig.actions && trig.actions[actIdx]) {
    trig.actions[actIdx][field] = val;
    if (trigIdx === -1) return;
    markPlanDirty();
    const node = document.querySelector(`.pe-node[data-trigger-idx="${trigIdx}"] .pe-summary`);
    if (node) node.innerHTML = trig.actions.map(a => `<span class="pe-chip ${a.type}">${escapeHTML(planActionSummary(a))}</span>`).join('');
  }
}

// ---------- Plan list: live Plan Script status of the selected client ----------
let planLiveStatusTimer = null;

async function refreshPlanLiveStatus() {
  const box = document.getElementById('plan-live-status');
  if (!box || !activePlanClientProfileId) return;
  let st = null;
  try {
    const res = await fetch(`${API_BASE}/api/profiles/${encodeURIComponent(activePlanClientProfileId)}/plan-state`);
    st = await res.json();
  } catch (e) {}
  if (window.PmUiGuard && window.PmUiGuard.deferIfInteracting('plan-live-status', box, refreshPlanLiveStatus)) return;
  if (!st || !st.success) {
    const offlineHtml = `<span class="pl-muted">⚪ จอนี้ออฟไลน์ — แผนที่ผูกไว้จะถูกส่งและเปิดใช้งานให้เองเมื่อเปิดจอ</span>`;
    if (window.PmUiGuard) window.PmUiGuard.setHtmlIfChanged(box, offlineHtml);
    else box.innerHTML = offlineHtml;
    return;
  }
  const assignedId = currentPlanAssignments[activePlanClientProfileId];
  const assigned = currentPlanProfiles.find(p => p.id === assignedId);
  const total = assigned && Array.isArray(assigned.triggers) ? assigned.triggers.length : 0;
  const syncing = assigned && st.planId !== assigned.id;
  const pending = (st.pending || []).map(p => p.type === 'zeny' ? `เงิน ≥ ${Number(p.level).toLocaleString()} Gold` : `${p.type === 'job_level' ? `Job${p.cls ? ' ' + planClassLabel(p.cls).split(' ')[0] : ''}` : 'Base'} Lv.${p.level}`).join(', ');
  const html = `
    <label class="pl-switch" title="เปิด/ปิด Plan Script ของจอนี้">
      <input type="checkbox" ${st.enabled ? 'checked' : ''} onchange="togglePlanScriptEnabled(this.checked)">
      <span></span>
      <b>Plan Script ${st.enabled ? 'เปิดอยู่' : 'ปิดอยู่'}</b>
    </label>
    <span class="pl-sep"></span>
    <span>${st.botRunning ? '🟢 บอทกำลังทำงาน' : '⏸️ บอทหยุดอยู่ <small>(แผนจะทำงานเมื่อกด START BOT)</small>'}</span>
    ${st.task ? `<span style="color:#38bdf8;font-weight:600;">· ${escapeHTML(st.task)}</span>` : ''}
    ${syncing ? '<span class="pl-warn">⏳ กำลังส่งแผนล่าสุดไปที่จอ...</span>' : ''}
    ${st.planId && !syncing && total ? `<span>✅ ทำแล้ว <b>${Math.min((st.done || []).length, total)}/${total}</b> เงื่อนไข</span>` : ''}
    ${pending ? `<span class="pl-warn">⏳ กำลังรอทำ: ${escapeHTML(pending)}</span>` : ''}`;
  if (window.PmUiGuard) window.PmUiGuard.setHtmlIfChanged(box, html);
  else box.innerHTML = html;
}

async function togglePlanScriptEnabled(enabled) {
  if (!activePlanClientProfileId) return;
  if (enabled && !currentPlanAssignments[activePlanClientProfileId]) {
    alert('ยังไม่ได้เลือกแผนให้จอนี้ — กด "ใช้งาน" ที่แผนที่ต้องการก่อน');
    refreshPlanLiveStatus();
    return;
  }
  try {
    await fetch(`${API_BASE}/api/profiles/${encodeURIComponent(activePlanClientProfileId)}/plan-enabled`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled })
    });
  } catch (e) {}
  refreshPlanLiveStatus();
}

function startPlanLiveStatus() {
  clearInterval(planLiveStatusTimer);
  refreshPlanLiveStatus();
  planLiveStatusTimer = setInterval(() => {
    const modal = document.getElementById('plan-modal');
    if (!modal || !modal.classList.contains('active')) { clearInterval(planLiveStatusTimer); return; }
    refreshPlanLiveStatus();
  }, 5000);
}

function validatePlanForSave(plan) {
  const problems = [];
  const triggers = Array.isArray(plan.triggers) ? plan.triggers : [];
  triggers.forEach(t => { t.targetLevel = Math.max(1, parseInt(t.targetLevel, 10) || 1); if (!t.id) t.id = "trig_" + Date.now() + "_" + Math.floor(Math.random() * 1000); });
  triggers.sort(planTriggerOrder);
  const seen = {};
  triggers.forEach(t => {
    const label = planTriggerLabel(t);
    if (t.type === 'zeny' && !(Number(t.targetZeny) > 0)) problems.push('เงื่อนไข 💰 เงิน ยังไม่ได้ใส่จำนวนเงิน');
    const key = t.type === 'zeny' ? `zeny_${t.targetZeny}` : `${t.type}_${t.type === 'job_level' ? (t.classId || '') : ''}_${t.targetLevel}`;
    if (seen[key]) problems.push(`มีเงื่อนไข ${label} ซ้ำกัน (รวมไว้ในอันเดียวจะอ่านง่ายกว่า)`);
    seen[key] = true;
    if (!(t.actions || []).length) problems.push(`${label} ยังไม่มี Action`);
  });
  const tree = (typeof CLASS_TREE_MAP !== 'undefined') ? CLASS_TREE_MAP[plan.class1Target] : null;
  if (tree && plan.class2Target && !tree.secondClasses.some(c => c.id === plan.class2Target)) {
    problems.push(`Class 2 "${plan.class2Target}" ไม่ได้ต่อจาก Class 1 "${plan.class1Target}"`);
  }
  return problems;
}

// Save Plan
async function saveActivePlan(applyLive = false) {
  if (!activeEditingPlan) return;

  const titleInput = document.getElementById("plan-editor-title");
  const descInput = document.getElementById("plan-editor-desc");
  const c1Sel = document.getElementById("plan-editor-class1");
  const c2Sel = document.getElementById("plan-editor-class2");

  if (titleInput && titleInput.value.trim()) activeEditingPlan.name = titleInput.value.trim();
  if (descInput) activeEditingPlan.description = descInput.value.trim();
  if (c1Sel) activeEditingPlan.class1Target = c1Sel.value;
  if (c2Sel) activeEditingPlan.class2Target = c2Sel.value;
  const tree = (typeof CLASS_TREE_MAP !== 'undefined') ? CLASS_TREE_MAP[activeEditingPlan.class1Target] : null;
  const sc = tree?.secondClasses?.find(s => s.id === activeEditingPlan.class2Target);
  if (sc && sc.class3Id) activeEditingPlan.class3Target = sc.class3Id;

  const jobLv = (id, def) => {
    const n = Math.round(Number(document.getElementById(id)?.value));
    return Number.isFinite(n) && n >= 1 && n <= 99 ? n : def;
  };
  activeEditingPlan.class1JobLevel = jobLv("plan-editor-class1-job", 10);
  activeEditingPlan.class2JobLevel = jobLv("plan-editor-class2-job", 50);

  const aqCb = document.getElementById("plan-editor-autoquest");
  if (aqCb) activeEditingPlan.autoQuestEnabled = aqCb.checked;
  const autoCb = document.getElementById("plan-editor-autojob");
  if (autoCb) activeEditingPlan.autoJobChange = autoCb.checked;
  const statCb = document.getElementById("plan-editor-autostat");
  if (statCb) activeEditingPlan.autoStatSkillEnabled = statCb.checked;

  const problems = validatePlanForSave(activeEditingPlan);
  if (problems.length && !confirm("พบจุดที่ควรตรวจในแผนนี้:\n\n• " + problems.join("\n• ") + "\n\nบันทึกต่อเลยไหม?")) return;

  try {
    const res = await fetch(`${API_BASE}/api/plan-profiles/${activeEditingPlan.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(activeEditingPlan)
    });
    const result = await res.json();
    if (result.success) {
      markPlanDirty(false);
      if (applyLive && activePlanClientProfileId) {
        await assignPlanToActiveClient(activeEditingPlan.id);
      } else {
        alert("💾 บันทึกแผนการเล่น Nightcamp เรียบร้อยแล้ว!");
      }
      await fetchAndRenderPlanProfiles();
      switchPlanModalView('list');
    } else {
      alert("เกิดข้อผิดพลาด: " + (result.error || "ไม่สามารถบันทึกได้"));
    }
  } catch(e) {
    alert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
  }
}

// Import & Export Plans
function handleImportPlansClick() {
  const input = document.getElementById("plan-import-file-input");
  if (input) {
    input.value = '';
    input.click();
  }
}

function exportPlanProfiles(planIds) {
  const list = currentPlanProfiles.filter(p => planIds.includes(p.id));
  if (!list.length) return;
  const assignments = {};
  Object.entries(currentPlanAssignments || {}).forEach(([cid, pid]) => { if (planIds.includes(pid)) assignments[cid] = pid; });
  const text = JSON.stringify({ exportedAt: new Date().toISOString(), profiles: list, assignments }, null, 2);
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safe = s => String(s || '').replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 40);
  a.download = list.length === 1 ? `nightcamp_plan_${safe(list[0].name)}_${Date.now()}.json` : `nightcamp_plan_scripts_${list.length}_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  if (typeof showToast === 'function') showToast(`📤 ส่งออก ${list.length === 1 ? 'แผน "' + list[0].name + '"' : list.length + ' แผน'} แล้ว`, 'success');
}

function handleExportPlansClick() {
  if (currentPlanProfiles.length === 0) {
    alert("ไม่มี Plan Profile ในระบบให้ส่งออก");
    return;
  }
  let modal = document.getElementById('plan-export-picker');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'plan-export-picker';
    modal.className = 'modal-overlay';
    modal.style.zIndex = '1200';
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });
  }
  modal.innerHTML = `
    <div class="modal-card" style="width: min(460px, 92vw);">
      <div class="modal-header">
        <h3 style="margin: 0;">📤 เลือกแผนที่จะส่งออก</h3>
        <button class="modal-close" data-x="close">&times;</button>
      </div>
      <label style="display: flex; align-items: center; gap: 8px; padding: 8px 4px; border-bottom: 1px solid rgba(255,255,255,0.08); font-weight: 700; font-size: 12.5px; cursor: pointer;">
        <input type="checkbox" class="pe-exp-all"> เลือกทั้งหมด (${currentPlanProfiles.length} แผน)
      </label>
      <div style="max-height: 340px; overflow-y: auto; display: flex; flex-direction: column; gap: 2px; padding: 6px 0;">
        ${currentPlanProfiles.map(p => `
          <label style="display: flex; align-items: center; gap: 8px; padding: 6px 4px; border-radius: 6px; cursor: pointer; font-size: 12.5px;">
            <input type="checkbox" class="pe-exp-cb" value="${escapeHTML(p.id)}">
            <span style="flex: 1; color: #f1f5f9;">${escapeHTML(p.name)}</span>
            <small style="color: #94a3b8;">${escapeHTML(p.class1Target || '')} ➔ ${escapeHTML(p.class2Target || '')}</small>
          </label>`).join('')}
      </div>
      <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px;">
        <button type="button" class="btn btn-secondary" data-x="close">ยกเลิก</button>
        <button type="button" class="btn btn-primary" data-x="go" disabled>📤 ส่งออก (0 แผน)</button>
      </div>
    </div>`;
  const cbs = [...modal.querySelectorAll('.pe-exp-cb')];
  const all = modal.querySelector('.pe-exp-all');
  const go = modal.querySelector('[data-x="go"]');
  const refresh = () => {
    const n = cbs.filter(c => c.checked).length;
    go.disabled = !n;
    go.textContent = `📤 ส่งออก (${n} แผน)`;
    all.checked = n === cbs.length;
    all.indeterminate = n > 0 && n < cbs.length;
  };
  cbs.forEach(c => c.onchange = refresh);
  all.onchange = () => { cbs.forEach(c => c.checked = all.checked); refresh(); };
  modal.querySelectorAll('[data-x="close"]').forEach(b => b.onclick = () => modal.classList.remove('active'));
  go.onclick = () => {
    exportPlanProfiles(cbs.filter(c => c.checked).map(c => c.value));
    modal.classList.remove('active');
  };
  modal.classList.add('active');
}

// Setup Event Listeners for Plan Modal
function setupPlanModalEventListeners() {
  const btnClose = document.getElementById("plan-modal-close-btn");
  if (btnClose) btnClose.onclick = closeScriptPlanModal;

  const btnListClose = document.getElementById("plan-modal-list-close");
  if (btnListClose) btnListClose.onclick = closeScriptPlanModal;

  const btnEditorClose = document.getElementById("plan-editor-close-btn");
  if (btnEditorClose) btnEditorClose.onclick = () => { if (confirmDiscardPlanChanges()) { markPlanDirty(false); closeScriptPlanModal(); } };

  const btnBack = document.getElementById("btn-back-to-plan-list");
  if (btnBack) btnBack.onclick = () => { if (confirmDiscardPlanChanges()) { markPlanDirty(false); switchPlanModalView('list'); } };
  ['plan-editor-title', 'plan-editor-desc', 'plan-editor-class1', 'plan-editor-class2', 'plan-editor-class1-job', 'plan-editor-class2-job'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => markPlanDirty());
  });

  const btnCreate = document.getElementById("btn-create-new-plan");
  if (btnCreate) btnCreate.onclick = createNewPlanProfile;

  const btnSeedExample = document.getElementById("btn-seed-example-plan");
  if (btnSeedExample) btnSeedExample.onclick = seedNightcampExamplePlan;

  const btnAddTrigger = document.getElementById("btn-add-level-trigger");
  if (btnAddTrigger) btnAddTrigger.onclick = addLevelTrigger;

  const btnSave = document.getElementById("btn-save-plan");
  if (btnSave) btnSave.onclick = () => saveActivePlan(false);

  const btnSaveApply = document.getElementById("btn-save-and-apply-plan");
  if (btnSaveApply) btnSaveApply.onclick = () => saveActivePlan(true);

  const btnImport = document.getElementById("btn-import-plans");
  if (btnImport) btnImport.onclick = handleImportPlansClick;

  const fileInput = document.getElementById("plan-import-file-input");
  if (fileInput) {
    fileInput.onchange = (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          const res = await fetch(`${API_BASE}/api/plan-profiles/import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsed)
          });
          const result = await res.json();
          if (result.success) {
            alert(`📥 ${result.message || 'นำเข้าแผนเรียบร้อยแล้ว!'}`);
            await fetchAndRenderPlanProfiles();
          } else {
            alert("ไม่สามารถนำเข้าได้: " + (result.error || "ไฟล์ไม่ถูกต้อง"));
          }
        } catch(err) {
          alert("รูปแบบไฟล์ JSON ไม่ถูกต้อง");
        }
      };
      reader.readAsText(file);
    };
  }

  const btnExport = document.getElementById("btn-export-plans");
  if (btnExport) btnExport.onclick = handleExportPlansClick;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupPlanModalEventListeners);
} else {
  setupPlanModalEventListeners();
}

// ==========================================
// PROFILE MODAL (EDIT / ADD)
// ==========================================
// "จำนวนจอที่จะสร้าง": names and ports for N new profiles. "Client 16" x3 -> Client 16, 17, 18; a name without a
// number gets " 1", " 2"...; ports continue from the port box, skipping ports other profiles use.
function planNewProfiles(baseName, count, firstPort) {
  const used = new Set(currentProfiles.map(p => Number(p.debugPort)));
  const m = String(baseName).trim().match(/^(.*?)(\d+)$/);
  const out = [];
  let port = firstPort;
  for (let i = 0; i < count; i++) {
    while (i > 0 && used.has(port)) port++;
    const name = count === 1 ? baseName.trim() : (m ? `${m[1]}${Number(m[2]) + i}` : `${baseName.trim()} ${i + 1}`);
    out.push({ name, port });
    used.add(port);
    port++;
  }
  return out;
}
const formCount = document.getElementById("form-count");
function refreshCountUi() {
  if (!formCount) return;
  const isAdd = !formId.value;
  document.getElementById("form-count-group").style.display = isAdd ? "" : "none";
  const n = isAdd ? Math.max(1, Math.min(50, parseInt(formCount.value) || 1)) : 1;
  const many = n > 1;
  // several new screens can't share one ID: each one registers its own account
  formAccount.disabled = many;
  if (formPassword) formPassword.disabled = many;
  if (many) { formAccount.value = ""; if (formPassword) formPassword.value = ""; }
  const hint = document.getElementById("form-count-hint");
  if (hint) {
    if (many) {
      const plan = planNewProfiles(formName.value || "Client 1", n, parseInt(formPort.value) || 48876);
      const esc = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
      hint.innerHTML = `➕ จะสร้าง <b>${n} จอ</b>: ${esc(plan[0].name)} → ${esc(plan[n - 1].name)} (พอร์ต ${plan[0].port} → ${plan[n - 1].port})<br>📝 ทุกจอ<b>สมัครบัญชีใหม่ + สร้างตัวละคร</b>ให้เอง (ID/รหัสสุ่มแยกกันทุกจอ)`;
      hint.style.display = "";
    } else hint.style.display = "none";
  }
}
if (formCount) ["input", "change"].forEach(ev => {
  formCount.addEventListener(ev, refreshCountUi);
  formName.addEventListener(ev, refreshCountUi);
  formPort.addEventListener(ev, refreshCountUi);
});

let formForceAutoRegister = false;

function openAddModal() {
  formId.value = "";
  formForceAutoRegister = false;
  const resetRow = document.getElementById("form-reset-autoreg-row");
  if (resetRow) resetRow.style.display = "none";
  if (formCount) formCount.value = 1;
  formName.value = `จอที่ ${currentProfiles.length + 1}`;
  formAccount.value = "";
  formClass.value = "Traveler";
  formMap.value = "";
  const maxPort = Math.max(48875, ...currentProfiles.map(p => p.debugPort || 48876));
  formPort.value = maxPort + 1;
  formNotes.value = "";
  if (formPassword) {
    formPassword.type = "text";
    formPassword.value = "";
    formPassword.placeholder = "เว้นว่าง = สมัครบัญชีใหม่ให้";
  }
  if (formServer) formServer.value = "";
  if (formChar) formChar.value = "";
  modalTitle.innerText = "➕ เพิ่มโปรไฟล์จอเกมใหม่";
  refreshCountUi();
  modalEl.classList.add("active");
}

function openEditModal(id) {
  const profile = currentProfiles.find(p => p.id === id);
  if (!profile) return;
  formId.value = profile.id;
  formForceAutoRegister = false;
  const resetRow = document.getElementById("form-reset-autoreg-row");
  if (resetRow) resetRow.style.display = "";
  formName.value = profile.name;
  formAccount.value = profile.account || "";
  formClass.value = (profile.charClass && profile.charClass !== "Hunter") ? profile.charClass : "Traveler";
  formMap.value = (profile.targetMap && profile.targetMap !== "ถนนต้นหลิว") ? profile.targetMap : "";
  formPort.value = profile.debugPort || 48876;
  formNotes.value = profile.notes || "";
  if (formPassword) {
    formPassword.type = "text";
    formPassword.value = profile.loginPassword || "";
    formPassword.placeholder = profile.autoRegister ? "กำลังรอสมัครบัญชีอัตโนมัติ" : "เว้นว่าง = สมัครบัญชีใหม่ให้";
  }
  if (formServer) formServer.value = profile.serverName || "";
  if (formChar) formChar.value = profile.charName || "";
  modalTitle.innerText = `⚙️ แก้ไขโปรไฟล์: ${profile.name}`;
  refreshCountUi();
  modalEl.classList.add("active");
}

document.getElementById("btn-form-reset-autoreg")?.addEventListener("click", () => {
  formForceAutoRegister = true;
  if (formAccount) formAccount.value = "";
  if (formPassword) {
    formPassword.value = "";
    formPassword.placeholder = "📝 จะสุ่มสมัครบัญชีใหม่ให้อัตโนมัติเมื่อกดบันทึก";
  }
  if (formChar) formChar.value = "";
  if (typeof showToast === "function") {
    showToast("📝 ตั้งค่าให้สมัครบัญชีใหม่แล้ว — กด 'บันทึกโปรไฟล์' ได้เลย", "info");
  }
});

document.getElementById("modal-close-btn").onclick = () => {
  modalEl.classList.remove("active");
};

profileForm.onsubmit = async (e) => {
  e.preventDefault();
  const id = formId.value;
  const acctVal = (formAccount.value || "").trim();
  const passVal = formPassword ? (formPassword.value || "").trim() : "";
  const serverVal = formServer ? String(formServer.value || "").trim() : "";
  const charVal = formChar ? String(formChar.value || "").trim() : "";
  const shouldAutoReg = Boolean(formForceAutoRegister || (!acctVal && !passVal));
  const payload = {
    name: formName.value,
    account: acctVal,
    charClass: formClass.value,
    targetMap: formMap.value,
    debugPort: parseInt(formPort.value),
    notes: formNotes.value,
    loginPassword: passVal,
    serverName: serverVal,
    charName: charVal,
    ...(shouldAutoReg ? { autoRegister: true } : {})
  };

  try {
    if (id) {
      await fetch(`${API_BASE}/api/profiles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } else {
      const count = formCount ? Math.max(1, Math.min(50, parseInt(formCount.value) || 1)) : 1;
      const plan = planNewProfiles(payload.name, count, payload.debugPort);
      const submitBtn = document.getElementById("modal-submit-btn");
      const failed = [];
      for (let i = 0; i < plan.length; i++) {
        if (submitBtn && count > 1) submitBtn.innerText = `⏳ กำลังสร้าง ${i + 1}/${count}...`;
        const one = count > 1 ? { ...payload, name: plan[i].name, debugPort: plan[i].port, account: "", loginPassword: "" } : payload;
        const r = await fetch(`${API_BASE}/api/profiles`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(one)
        }).then(x => x.json()).catch(e => ({ success: false, error: e.message }));
        if (!r.success) failed.push(`${plan[i].name}: ${r.error || "ไม่สำเร็จ"}`);
      }
      if (submitBtn) submitBtn.innerText = "💾 บันทึกโปรไฟล์";
      if (count > 1) showToast(failed.length ? `สร้างได้ ${count - failed.length}/${count} จอ` : `➕ สร้างโปรไฟล์ ${count} จอแล้ว`, failed.length ? "warning" : "success");
      if (failed.length) alert("สร้างไม่สำเร็จบางจอ:\n" + failed.join("\n"));
    }
    modalEl.classList.remove("active");
    fetchProfiles();
  } catch (err) {
    alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
  }
};

async function deleteProfile(id) {
  const p = (currentProfiles || []).find(x => String(x.id) === String(id));
  const label = p ? `${p.name}${p.lastCharName ? ` (${p.lastCharName})` : ''}` : id;
  if (!confirm(`คุณแน่ใจว่าต้องการลบโปรไฟล์ "${label}" ใช่หรือไม่?`)) return;
  try {
    await fetch(`${API_BASE}/api/profiles/${id}`, { method: "DELETE" });
    fetchProfiles();
  } catch (err) {}
}

// ==========================================
// BULK DELETE PROFILES MODAL (เลือกลบหลายโปรไฟล์ / ลบทั้งหมด)
// ==========================================
const bdpSelectedIds = new Set();
let bdpLastClickedIdx = -1;

function isProfileOnlineForBdp(p) {
  return Boolean(p && (p.isRunning || p.isAlive));
}

function isProfileJailedForBdp(p) {
  if (!p) return false;
  const state = p.liveState || {};
  return Boolean(p.isJailed || (typeof state.map === 'string' && /คุก|เรือนจำ|\bprison\b|\bjail\b/i.test(state.map)));
}

function isProfileBannedForBdp(p) {
  if (!p) return false;
  const state = p.liveState || {};
  return Boolean(p.isBanned || state.accountBanned || state.screenPhase === 'account_banned');
}

function getBulkDeleteRenderSig(list) {
  return (Array.isArray(list) ? list : []).map(p => {
    const st = p.liveState || {};
    return `${p.id}:${isProfileOnlineForBdp(p) ? 1 : 0}:${isProfileJailedForBdp(p) ? 1 : 0}:${isProfileBannedForBdp(p) ? 1 : 0}:${st.charName || p.lastCharName || ''}:${p.account || ''}`;
  }).join("|");
}

function getFilteredBulkDeleteProfiles() {
  const q = ((document.getElementById("bdp-search-input") || {}).value || "").trim().toLowerCase();
  const list = Array.isArray(currentProfiles) ? currentProfiles : [];
  if (!q) return list;
  return list.filter(p => {
    const state = p.liveState || {};
    const charName = String(state.charName || p.lastCharName || "").toLowerCase();
    const acc = String(p.account || (state.authConfig && state.authConfig.username) || "").toLowerCase();
    const name = String(p.name || "").toLowerCase();
    if (q === "คุก" || q === "ติดคุก" || q === "jail") return isProfileJailedForBdp(p);
    if (q === "แบน" || q === "โดนแบน" || q === "ban") return isProfileBannedForBdp(p);
    if (q === "ออนไลน์" || q === "online") return isProfileOnlineForBdp(p);
    if (q === "ออฟไลน์" || q === "offline") return !isProfileOnlineForBdp(p);
    return name.includes(q) || charName.includes(q) || acc.includes(q)
      || (isProfileJailedForBdp(p) && ("ติดคุก jail").includes(q))
      || (isProfileBannedForBdp(p) && ("โดนแบน ban").includes(q));
  });
}

function updateBulkDeleteCounters() {
  const all = Array.isArray(currentProfiles) ? currentProfiles : [];
  const validSet = new Set(all.map(p => String(p.id)));
  for (const id of Array.from(bdpSelectedIds)) {
    if (!validSet.has(id)) bdpSelectedIds.delete(id);
  }
  const selCount = bdpSelectedIds.size;
  const totalCount = all.length;
  const jailBanCount = all.filter(p => isProfileJailedForBdp(p) || isProfileBannedForBdp(p)).length;

  const selEl = document.getElementById("bdp-selected-count");
  const totEl = document.getElementById("bdp-total-count");
  const jailBanCountEl = document.getElementById("bdp-jail-ban-count");
  const confCountEl = document.getElementById("bdp-confirm-count");
  const allCountEl = document.getElementById("bdp-delete-all-count");
  const confBtn = document.getElementById("btn-bdp-confirm-selected");
  const delAllBtn = document.getElementById("btn-bdp-delete-all");

  if (selEl) selEl.textContent = String(selCount);
  if (totEl) totEl.textContent = String(totalCount);
  if (jailBanCountEl) jailBanCountEl.textContent = String(jailBanCount);
  if (confCountEl) confCountEl.textContent = String(selCount);
  if (allCountEl) allCountEl.textContent = String(totalCount);
  if (confBtn) confBtn.disabled = selCount === 0;
  if (delAllBtn) delAllBtn.disabled = totalCount === 0;
}

let bdpLastRenderedSig = "";

function updateBulkDeleteModalIfOpen() {
  const modal = document.getElementById("modal-bulk-delete-profiles");
  if (modal && modal.style.display && modal.style.display !== "none") {
    const sig = getBulkDeleteRenderSig(currentProfiles);
    if (sig !== bdpLastRenderedSig) {
      renderBulkDeleteProfileList(false);
    } else {
      updateBulkDeleteCounters();
    }
  }
}

function renderBulkDeleteProfileList(force = true) {
  const listEl = document.getElementById("bdp-profile-list");
  if (!listEl) return;
  if (!force && window.PmUiGuard && window.PmUiGuard.deferIfInteracting('bdp-profile-list', listEl, () => renderBulkDeleteProfileList(false))) {
    updateBulkDeleteCounters();
    return;
  }
  bdpLastRenderedSig = getBulkDeleteRenderSig(currentProfiles);
  updateBulkDeleteCounters();
  const filtered = getFilteredBulkDeleteProfiles();

  if (!Array.isArray(currentProfiles) || currentProfiles.length === 0) {
    const emptyHtml = `<div style="text-align: center; color: #64748b; padding: 36px 12px; font-size: 13px;">ไม่มีโปรไฟล์ในระบบ</div>`;
    if (window.PmUiGuard) window.PmUiGuard.setHtmlIfChanged(listEl, emptyHtml);
    else listEl.innerHTML = emptyHtml;
    return;
  }
  if (filtered.length === 0) {
    const noMatchHtml = `<div style="text-align: center; color: #64748b; padding: 36px 12px; font-size: 13px;">ไม่พบโปรไฟล์ที่ตรงกับคำค้นหา</div>`;
    if (window.PmUiGuard) window.PmUiGuard.setHtmlIfChanged(listEl, noMatchHtml);
    else listEl.innerHTML = noMatchHtml;
    return;
  }

  const listHtml = filtered.map((p, idx) => {
    const pid = String(p.id);
    const checked = bdpSelectedIds.has(pid);
    const state = p.liveState || {};
    const isOnline = isProfileOnlineForBdp(p);
    const isJailed = isProfileJailedForBdp(p);
    const isBanned = isProfileBannedForBdp(p);
    const charName = state.charName || p.lastCharName || "";
    const jobClass = state.jobClass || p.lastJobClass || "";
    const level = state.level || p.lastLevel || "";
    const zeny = typeof state.zeny === "number" ? state.zeny : (typeof p.lastZeny === "number" ? p.lastZeny : null);
    const account = p.account || (state.authConfig && state.authConfig.username) || "";

    const charBadge = charName
      ? `<span style="color: #38bdf8; font-weight: 600;">🧝 ${escapeHTML(charName)}</span>${level ? ` <span style="color:#94a3b8;font-size:11px;">(Lv.${escapeHTML(String(level))}${jobClass ? ' ' + escapeHTML(jobClass) : ''})</span>` : ''}`
      : `<span style="color: #64748b; font-style: italic;">ยังไม่มีตัวละคร</span>`;

    const accBadge = account
      ? `<span style="color: #cbd5e1; font-family: 'JetBrains Mono', monospace; font-size: 11px;">🔑 ${escapeHTML(account)}</span>`
      : (p.autoRegister ? `<span style="color: #facc15; font-size: 11px;">📝 รอสมัครอัตโนมัติ</span>` : `<span style="color: #64748b; font-size: 11px;">ไม่มี ID</span>`);

    const penaltyBadge = isBanned
      ? `<span style="font-size: 10.5px; padding: 2px 7px; border-radius: 99px; background: rgba(239, 68, 68, 0.22); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.55); font-weight: 700;">🚫 โดนแบน</span>`
      : (isJailed
          ? `<span style="font-size: 10.5px; padding: 2px 7px; border-radius: 99px; background: rgba(245, 158, 11, 0.22); color: #fcd34d; border: 1px solid rgba(245, 158, 11, 0.55); font-weight: 700;">🚨 ติดคุก</span>`
          : '');

    const statusBadge = isOnline
      ? `<span style="font-size: 10.5px; padding: 2px 7px; border-radius: 99px; background: rgba(16, 185, 129, 0.18); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.35);">🟢 ออนไลน์</span>`
      : `<span style="font-size: 10.5px; padding: 2px 7px; border-radius: 99px; background: rgba(148, 163, 184, 0.12); color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.22);">⚫ ออฟไลน์</span>`;

    const zenyBadge = zeny !== null && zeny > 0
      ? `<span style="font-size: 11px; color: #facc15; font-weight: 600;">💰 ${Number(zeny).toLocaleString()} z</span>`
      : '';

    return `
      <label class="bdp-row" data-pid="${escapeHTML(pid)}" data-idx="${idx}" style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 11px; border-radius: 8px; cursor: pointer; user-select: none; background: ${checked ? 'rgba(239, 68, 68, 0.16)' : ((isBanned || isJailed) ? 'rgba(127, 29, 29, 0.18)' : 'rgba(15, 23, 42, 0.7)')}; border: 1px solid ${checked ? 'rgba(239, 68, 68, 0.5)' : ((isBanned || isJailed) ? 'rgba(239, 68, 68, 0.32)' : 'rgba(255, 255, 255, 0.06)')}; transition: background 0.12s, border-color 0.12s;">
        <div style="display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1;">
          <input type="checkbox" class="bdp-checkbox" data-pid="${escapeHTML(pid)}" data-idx="${idx}" ${checked ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: #ef4444; cursor: pointer; flex-shrink: 0;">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; min-width: 0;">
            <span style="font-size: 13px; font-weight: 700; color: #f8fafc;">${escapeHTML(p.name || pid)}</span>
            ${charBadge}
            ${accBadge}
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
          ${zenyBadge}
          ${penaltyBadge}
          ${statusBadge}
        </div>
      </label>
    `;
  }).join("");

  if (window.PmUiGuard) {
    if (!window.PmUiGuard.setHtmlIfChanged(listEl, listHtml)) return;
  } else {
    listEl.innerHTML = listHtml;
  }

  listEl.querySelectorAll(".bdp-checkbox").forEach(cb => {
    cb.addEventListener("click", (e) => {
      const pid = cb.getAttribute("data-pid");
      const idx = Number(cb.getAttribute("data-idx"));
      const willCheck = cb.checked;

      if (e.shiftKey && bdpLastClickedIdx >= 0 && bdpLastClickedIdx !== idx) {
        const start = Math.min(bdpLastClickedIdx, idx);
        const end = Math.max(bdpLastClickedIdx, idx);
        for (let i = start; i <= end; i++) {
          const item = filtered[i];
          if (!item) continue;
          if (willCheck) bdpSelectedIds.add(String(item.id));
          else bdpSelectedIds.delete(String(item.id));
        }
      } else {
        if (willCheck) bdpSelectedIds.add(pid);
        else bdpSelectedIds.delete(pid);
      }
      bdpLastClickedIdx = idx;
      renderBulkDeleteProfileList();
    });
  });
}

function openBulkDeleteProfilesModal() {
  bindBulkDeleteModalEvents();
  const modal = document.getElementById("modal-bulk-delete-profiles");
  if (!modal) return;
  bdpSelectedIds.clear();
  bdpLastClickedIdx = -1;
  const searchEl = document.getElementById("bdp-search-input");
  if (searchEl) searchEl.value = "";
  modal.style.display = "flex";
  renderBulkDeleteProfileList();
}

function closeBulkDeleteProfilesModal() {
  const modal = document.getElementById("modal-bulk-delete-profiles");
  if (modal) modal.style.display = "none";
}

function bindBulkDeleteModalEvents() {
  const openBtn = document.getElementById("btn-open-bulk-delete-profiles");
  const closeBtn = document.getElementById("btn-bdp-close");
  const cancelBtn = document.getElementById("btn-bdp-cancel");
  const searchInput = document.getElementById("bdp-search-input");
  const selAllBtn = document.getElementById("btn-bdp-select-all");
  const clearAllBtn = document.getElementById("btn-bdp-clear-all");
  const selOfflineBtn = document.getElementById("btn-bdp-select-offline");
  const selJailBanBtn = document.getElementById("btn-bdp-select-jail-ban");
  const selNoCharBtn = document.getElementById("btn-bdp-select-nochar");
  const confirmSelBtn = document.getElementById("btn-bdp-confirm-selected");
  const deleteAllBtn = document.getElementById("btn-bdp-delete-all");
  const modal = document.getElementById("modal-bulk-delete-profiles");

  if (openBtn) openBtn.onclick = openBulkDeleteProfilesModal;
  if (closeBtn) closeBtn.onclick = closeBulkDeleteProfilesModal;
  if (cancelBtn) cancelBtn.onclick = closeBulkDeleteProfilesModal;
  if (modal && !modal.dataset.bdpBound) {
    modal.dataset.bdpBound = "1";
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeBulkDeleteProfilesModal();
    });
  }
  if (searchInput && !searchInput.dataset.bdpBound) {
    searchInput.dataset.bdpBound = "1";
    searchInput.addEventListener("input", () => {
      bdpLastClickedIdx = -1;
      renderBulkDeleteProfileList();
    });
  }
  if (selAllBtn) {
    selAllBtn.onclick = () => {
      getFilteredBulkDeleteProfiles().forEach(p => bdpSelectedIds.add(String(p.id)));
      renderBulkDeleteProfileList();
    };
  }
  if (clearAllBtn) {
    clearAllBtn.onclick = () => {
      bdpSelectedIds.clear();
      bdpLastClickedIdx = -1;
      renderBulkDeleteProfileList();
    };
  }
  if (selOfflineBtn) {
    selOfflineBtn.onclick = () => {
      bdpSelectedIds.clear();
      (currentProfiles || []).forEach(p => {
        if (!isProfileOnlineForBdp(p)) bdpSelectedIds.add(String(p.id));
      });
      renderBulkDeleteProfileList();
    };
  }
  if (selJailBanBtn) {
    selJailBanBtn.onclick = () => {
      bdpSelectedIds.clear();
      let picked = 0;
      (currentProfiles || []).forEach(p => {
        if (isProfileJailedForBdp(p) || isProfileBannedForBdp(p)) {
          bdpSelectedIds.add(String(p.id));
          picked++;
        }
      });
      renderBulkDeleteProfileList();
      if (typeof showToast === "function") {
        if (picked > 0) {
          showToast(`🚨 เลือกโปรไฟล์ที่ติดคุก / โดนแบนแล้ว ${picked} รายการ`, "info");
        } else {
          showToast("✨ ไม่พบโปรไฟล์ที่ติดคุกหรือโดนแบนในขณะนี้", "info");
        }
      }
    };
  }
  if (selNoCharBtn) {
    selNoCharBtn.onclick = () => {
      bdpSelectedIds.clear();
      (currentProfiles || []).forEach(p => {
        const state = p.liveState || {};
        const charName = state.charName || p.lastCharName || "";
        if (!charName || p.autoRegister || p.registerError) {
          bdpSelectedIds.add(String(p.id));
        }
      });
      renderBulkDeleteProfileList();
    };
  }
  if (confirmSelBtn) {
    confirmSelBtn.onclick = async () => {
      const ids = Array.from(bdpSelectedIds);
      if (ids.length === 0) return;
      const onlineSelected = (currentProfiles || []).filter(p => bdpSelectedIds.has(String(p.id)) && isProfileOnlineForBdp(p)).length;
      const warnOnline = onlineSelected > 0 ? `\n(มี ${onlineSelected} จอที่กำลังออนไลน์อยู่ ระบบจะปิดหน้าต่างเกมของโปรไฟล์เหล่านั้นให้อัตโนมัติ)` : '';
      if (!confirm(`ยืนยันการลบโปรไฟล์ที่เลือกจำนวน ${ids.length} โปรไฟล์ ใช่หรือไม่?${warnOnline}`)) return;

      confirmSelBtn.disabled = true;
      try {
        const res = await fetch(`${API_BASE}/api/profiles/bulk-delete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids })
        });
        const data = await res.json();
        if (data && data.success) {
          bdpSelectedIds.clear();
          await fetchProfiles();
          if (!currentProfiles || currentProfiles.length === 0) {
            closeBulkDeleteProfilesModal();
          } else {
            renderBulkDeleteProfileList();
          }
        } else {
          alert("ลบโปรไฟล์ไม่สำเร็จ: " + ((data && data.error) || "ไม่ทราบสาเหตุ"));
        }
      } catch (err) {
        alert("เกิดข้อผิดพลาดในการลบโปรไฟล์: " + err.message);
      } finally {
        updateBulkDeleteCounters();
      }
    };
  }
  if (deleteAllBtn) {
    deleteAllBtn.onclick = async () => {
      const total = Array.isArray(currentProfiles) ? currentProfiles.length : 0;
      if (total === 0) return;
      if (!confirm(`⚠️ คำเตือนสำคัญ: คุณต้องการ "ลบทุกโปรไฟล์ทั้งหมด" จำนวน ${total} โปรไฟล์ ใช่หรือไม่?\n(การกระทำนี้จะปิดจอที่เปิดอยู่และลบโปรไฟล์ทั้งหมดออกจากรายการ)`)) return;

      deleteAllBtn.disabled = true;
      try {
        const res = await fetch(`${API_BASE}/api/profiles/bulk-delete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deleteAll: true })
        });
        const data = await res.json();
        if (data && data.success) {
          bdpSelectedIds.clear();
          closeBulkDeleteProfilesModal();
          await fetchProfiles();
        } else {
          alert("ลบโปรไฟล์ทั้งหมดไม่สำเร็จ: " + ((data && data.error) || "ไม่ทราบสาเหตุ"));
        }
      } catch (err) {
        alert("เกิดข้อผิดพลาดในการลบโปรไฟล์ทั้งหมด: " + err.message);
      } finally {
        updateBulkDeleteCounters();
      }
    };
  }
}

bindBulkDeleteModalEvents();
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bindBulkDeleteModalEvents);
}

function openAntiBanGuideModal() {
  const modal = document.getElementById("modal-anti-ban-guide");
  if (modal) modal.classList.add("active");
}

function closeAntiBanGuideModal() {
  const modal = document.getElementById("modal-anti-ban-guide");
  if (modal) modal.classList.remove("active");
}

function bindAntiBanGuideModalEvents() {
  const openBtn = document.getElementById("btn-anti-ban-guide");
  const closeBtn = document.getElementById("anti-ban-close-btn");
  const okBtn = document.getElementById("anti-ban-ok-btn");
  const modal = document.getElementById("modal-anti-ban-guide");
  if (openBtn) openBtn.onclick = openAntiBanGuideModal;
  if (closeBtn) closeBtn.onclick = closeAntiBanGuideModal;
  if (okBtn) okBtn.onclick = closeAntiBanGuideModal;
  if (modal && !modal.dataset.abgBound) {
    modal.dataset.abgBound = "1";
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeAntiBanGuideModal();
    });
  }
}

bindAntiBanGuideModalEvents();
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bindAntiBanGuideModalEvents);
}

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const modal = document.getElementById("modal-bulk-delete-profiles");
    if (modal && modal.style.display && modal.style.display !== "none") {
      closeBulkDeleteProfilesModal();
    }
    const abgModal = document.getElementById("modal-anti-ban-guide");
    if (abgModal && abgModal.classList.contains("active")) {
      closeAntiBanGuideModal();
    }
  }
});

// Global Poll interval
fetchProfiles();
setInterval(fetchProfiles, 2000);

// ==========================================
// PRESETS & SAVE LIST SYSTEM (CENTRAL PROFILE LIBRARY)
// ==========================================
let currentPresets = [];
let activeCopyToPresetId = null;

// Fetch all presets from server
async function fetchPresets() {
  try {
    const res = await fetch(`${API_BASE}/api/presets`);
    const data = await res.json();
    if (data.success && Array.isArray(data.presets)) {
      currentPresets = data.presets;
      renderPresetsList();
    }
  } catch (err) {
    console.error('Failed to fetch presets:', err);
  }
}

// Render presets inside presets-modal
function renderPresetsList() {
  const container = document.getElementById('presets-list-container');
  if (!container) return;

  if (currentPresets.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; background: rgba(15, 23, 42, 0.5); border-radius: 8px; border: 1px dashed rgba(168, 85, 247, 0.25); color: #94a3b8;">
        <div style="font-size: 28px; margin-bottom: 6px;">📂</div>
        <div style="font-size: 13px; font-weight: 600; color: #cbd5e1;">ยังไม่มีการตั้งค่าในระบบ Save List ส่วนกลาง</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">กดปุ่ม "บันทึกจอเกมปัจจุบันเข้า Save List" หรือ "นำเข้า (Import)" เพื่อสร้างหรือโหลดโปรไฟล์</div>
      </div>
    `;
    return;
  }

  container.innerHTML = currentPresets.map(preset => {
    const cfg = preset.config || {};
    const targetMap = cfg.targetMap || cfg.archerConfig?.targetMap || 'ตามเดิม';
    const ammoMin = cfg.archerConfig?.minAmmoRestock || cfg.minAmmoRestock || null;
    const sellCount = cfg.sellConfig?.items?.length || 0;
    const updateTime = new Date(preset.updatedAt || preset.createdAt || Date.now()).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

    return `
      <div class="preset-card-item" id="preset-card-${preset.id}">
        <div style="flex: 1; min-width: 0;">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span style="font-size: 13.5px; font-weight: 700; color: #f8fafc;">💾 ${escapeHTML(preset.name)}</span>
            <span class="badge" style="background: rgba(168, 85, 247, 0.2); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.4); font-size: 9.5px; padding: 1px 6px; border-radius: 4px;">
              🗺️ ${escapeHTML(targetMap)}
            </span>
            ${ammoMin ? `<span class="badge" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); font-size: 9.5px; padding: 1px 6px; border-radius: 4px;">🏹 ธนู: ${ammoMin} ดอก</span>` : ''}
            ${sellCount > 0 ? `<span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); font-size: 9.5px; padding: 1px 6px; border-radius: 4px;">💰 ขายตลาด ${sellCount} ชิ้น</span>` : ''}
            <span style="font-size: 10px; color: #34d399; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.25); padding: 1px 5px; border-radius: 3px;">🔒 ปลอดภัย (ไม่รวม ID/รหัส)</span>
          </div>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 5px; line-height: 1.4;">
            ${escapeHTML(preset.description || 'ไม่มีคำอธิบาย')}
            <span style="color: #64748b; margin-left: 8px;">🕒 อัปเดต ${updateTime}</span>
          </div>
        </div>

        <div style="display: flex; gap: 6px; align-items: center; flex-shrink: 0;">
          <button class="btn btn-purple btn-sm" onclick="openCopyToModal('${preset.id}')" title="คัดลอกการตั้งค่านี้ไปยังจอเกมต่างๆ ทันที">
            <span>📋</span> Copy to...
          </button>
          <button class="btn btn-secondary btn-sm" onclick="exportSinglePreset('${preset.id}')" title="ส่งออกเป็นไฟล์ .json แยกโปรไฟล์">
            <span>📤</span> Export
          </button>
          <button class="btn btn-secondary btn-sm btn-icon" onclick="deletePreset('${preset.id}')" title="ลบโปรไฟล์นี้จาก Save List" style="color: #f87171;">
            <span>🗑️</span>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// -------------------------------------------------------------
// PRESETS MODAL CONTROLS
// -------------------------------------------------------------
function openPresetsModal() {
  const modal = document.getElementById('presets-modal');
  if (modal) {
    modal.classList.add('active');
    fetchPresets();
  }
}

function closePresetsModal() {
  const modal = document.getElementById('presets-modal');
  if (modal) modal.classList.remove('active');
}

// -------------------------------------------------------------
// COPY TO PROFILES MODAL & LOGIC
// -------------------------------------------------------------
function openCopyToModal(presetId) {
  activeCopyToPresetId = presetId;
  const preset = currentPresets.find(p => p.id === presetId);
  if (!preset) return;

  const titleEl = document.getElementById('copy-to-preset-title');
  if (titleEl) {
    titleEl.innerText = `Preset: "${preset.name}" (แมพ: ${preset.config?.targetMap || 'ตามเดิม'})`;
  }

  const checklistContainer = document.getElementById('copy-to-profiles-checklist');
  if (checklistContainer) {
    if (currentProfiles.length === 0) {
      checklistContainer.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 12px;">ไม่พบจอเกมในระบบ</div>';
    } else {
      checklistContainer.innerHTML = currentProfiles.map(p => `
        <label class="copy-to-check-item">
          <div style="display: flex; align-items: center; gap: 10px;">
            <input type="checkbox" class="copy-to-profile-checkbox" value="${p.id}" data-online="${p.isRunning ? '1' : ''}" ${p.isRunning ? 'checked' : ''} style="width: 16px; height: 16px; cursor: pointer;">
            <span style="font-weight: 600; color: #f8fafc; font-size: 12px;">${escapeHTML(p.name)}</span>
            ${(p.liveState && p.liveState.charName) || p.lastCharName ? `<span style="font-size: 11.5px; font-weight: 700; color: #fcd34d;">👤 ${escapeHTML((p.liveState && p.liveState.charName) || p.lastCharName)}</span>` : ''}
            <span style="font-size: 11px; color: #94a3b8;">(${escapeHTML((p.liveState && p.liveState.charClass) || p.charClass || 'Archer')})</span>
            <span style="font-size: 10px; color: #64748b;">Port: ${p.debugPort || '--'}</span>
          </div>
          <span style="font-size: 10px; padding: 2px 7px; border-radius: 4px; font-weight: 600; ${p.isRunning ? 'background: rgba(34,197,94,0.18); color: #4ade80; border: 1px solid rgba(34,197,94,0.3);' : 'background: rgba(148,163,184,0.12); color: #94a3b8; border: 1px solid rgba(148,163,184,0.2);'}">
            ${p.isRunning ? '🟢 ออนไลน์' : '⚪ ออฟไลน์'}
          </span>
        </label>
      `).join('');
      // Quick pickers: copying works only to clients that are open right now
      checklistContainer.insertAdjacentHTML('afterbegin', `
        <div class="copy-to-pickers">
          <button type="button" class="btn btn-secondary btn-sm" onclick="setCopyToChecks('online')">🟢 เลือกเฉพาะจอออนไลน์</button>
          <small>จอที่ออฟไลน์จะรับค่าไม่ได้ — เปิดจอก่อนแล้วค่อยคัดลอก</small>
        </div>`);
    }
  }

  const modal = document.getElementById('copy-to-modal');
  if (modal) modal.classList.add('active');
}

function setCopyToChecks(mode) {
  document.querySelectorAll('.copy-to-profile-checkbox').forEach(cb => {
    cb.checked = mode === 'all' || (mode === 'online' && cb.dataset.online === '1');
  });
}

function closeCopyToModal() {
  const modal = document.getElementById('copy-to-modal');
  if (modal) modal.classList.remove('active');
  activeCopyToPresetId = null;
}

async function confirmApplyCopyTo() {
  if (!activeCopyToPresetId) return;
  const checkboxes = document.querySelectorAll('.copy-to-profile-checkbox:checked');
  const targetProfileIds = Array.from(checkboxes).map(cb => cb.value);

  if (targetProfileIds.length === 0) {
    alert('กรุณาเลือกจอเกมเป้าหมายอย่างน้อย 1 จอ');
    return;
  }

  const confirmBtn = document.getElementById('copy-to-modal-confirm');
  const originalText = confirmBtn ? confirmBtn.innerHTML : '';
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '⏳ กำลังคัดลอกและอัปเดต...';
  }

  try {
    const res = await fetch(`${API_BASE}/api/presets/${activeCopyToPresetId}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetProfileIds })
    });
    const result = await res.json();
    if (result.success) {
      alert(result.message || `คัดลอกการตั้งค่าไปยัง ${result.appliedCount || targetProfileIds.length} จอเรียบร้อยแล้ว!`);
      closeCopyToModal();
      fetchProfiles();
    } else {
      alert('เกิดข้อผิดพลาด: ' + (result.error || 'ไม่สามารถคัดลอกได้'));
    }
  } catch (err) {
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
  } finally {
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = originalText;
    }
  }
}

// -------------------------------------------------------------
// IMPORT PROFILE / PRESETS MODAL
// -------------------------------------------------------------
function openImportProfileModal() {
  const nameInput = document.getElementById('import-preset-name');
  const textarea = document.getElementById('import-json-textarea');
  const fileInput = document.getElementById('import-file-input');

  if (nameInput) nameInput.value = 'โปรไฟล์นำเข้าส่วนกลาง ' + (currentPresets.length + 1);
  if (textarea) textarea.value = '';
  if (fileInput) fileInput.value = '';

  const modal = document.getElementById('import-profile-modal');
  if (modal) modal.classList.add('active');
}

function closeImportProfileModal() {
  const modal = document.getElementById('import-profile-modal');
  if (modal) modal.classList.remove('active');
}

async function handleImportProfileSubmit(e) {
  e.preventDefault();
  const nameInput = document.getElementById('import-preset-name');
  const textarea = document.getElementById('import-json-textarea');
  if (!textarea || !textarea.value.trim()) {
    alert('กรุณาวางโค้ด JSON การตั้งค่าที่ต้องการนำเข้า');
    return;
  }

  let parsed = null;
  const rawInput = textarea.value.trim();
  try {
    parsed = JSON.parse(rawInput);
  } catch (err) {
    parsed = parseCredentialsTxtToBackup(rawInput);
    if (!parsed) {
      alert('รูปแบบ JSON หรือไฟล์รหัส .txt ไม่ถูกต้อง: ' + err.message);
      return;
    }
  }

  const presetName = nameInput && nameInput.value.trim() ? nameInput.value.trim() : 'โปรไฟล์นำเข้าส่วนกลาง';

  let payload = parsed;
  if (!Array.isArray(parsed) && !parsed.presets) {
    // Single preset or single config object
    if (!parsed.name) parsed.name = presetName;
    payload = parsed;
  }

  const submitBtn = document.getElementById('import-modal-submit-btn');
  const origText = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '⏳ กำลังนำเข้า...';
  }

  try {
    if (parsed && (parsed.format === 'pmhee-aetheria-profile-backup-v1' || (Array.isArray(parsed.profiles) && !parsed.presets))) {
      const resBackup = await fetch(`${API_BASE}/api/profiles/import-backup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed)
      });
      const resultBackup = await resBackup.json();
      if (resultBackup.success) {
        alert(`🎉 กู้คืนโปรไฟล์สำเร็จ ${resultBackup.restoredProfiles || 0} จอ (พร้อม ID/Password ${resultBackup.restoredCredentials || 0} จอ) เรียบร้อยแล้ว!`);
        closeImportProfileModal();
        if (typeof fetchProfiles === 'function') fetchProfiles();
      } else {
        alert('นำเข้าไฟล์สำรองโปรไฟล์ไม่สำเร็จ: ' + (resultBackup.error || 'เกิดข้อผิดพลาด'));
      }
      return;
    }

    const res = await fetch(`${API_BASE}/api/presets/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.success) {
      alert(`นำเข้าการตั้งค่าสำเร็จ ${result.count || 1} รายการเข้าสู่ Save List เรียบร้อย!`);
      closeImportProfileModal();
      openPresetsModal();
      fetchPresets();
    } else {
      alert('นำเข้าไม่สำเร็จ: ' + (result.error || 'เกิดข้อผิดพลาด'));
    }
  } catch (err) {
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origText;
    }
  }
}

// -------------------------------------------------------------
// SAVE CLIENT AS PRESET MODAL
// -------------------------------------------------------------
function openSaveClientPresetModal(preferredProfileId = null) {
  const select = document.getElementById('save-client-select');
  const nameInput = document.getElementById('save-client-preset-name');
  const descInput = document.getElementById('save-client-preset-desc');
  const hiddenId = document.getElementById('save-client-profile-id');

  if (!select) return;
  select.innerHTML = currentProfiles.map(p => `
    <option value="${p.id}" ${p.id === preferredProfileId ? 'selected' : ''}>
      ${escapeHTML(p.name)} (${escapeHTML(p.charClass || 'Archer')}) - พอร์ต ${p.debugPort || '--'} ${p.isRunning ? '🟢 ออนไลน์' : '⚪ ออฟไลน์'}
    </option>
  `).join('');

  const targetProfile = currentProfiles.find(p => p.id === (preferredProfileId || (select.value || currentProfiles[0]?.id)));
  const baseName = targetProfile ? targetProfile.name : 'Client';

  if (hiddenId) hiddenId.value = targetProfile ? targetProfile.id : '';
  if (nameInput) nameInput.value = `${baseName} Setup`;
  if (descInput) descInput.value = `ดึงการตั้งค่าจาก ${baseName} (พอร์ต ${targetProfile?.debugPort || '--'})`;

  select.onchange = () => {
    const chosen = currentProfiles.find(p => p.id === select.value);
    if (chosen) {
      if (hiddenId) hiddenId.value = chosen.id;
      if (nameInput) nameInput.value = `${chosen.name} Setup`;
      if (descInput) descInput.value = `ดึงการตั้งค่าจาก ${chosen.name} (พอร์ต ${chosen.debugPort || '--'})`;
    }
  };

  const modal = document.getElementById('save-client-preset-modal');
  if (modal) modal.classList.add('active');
}

function closeSaveClientPresetModal() {
  const modal = document.getElementById('save-client-preset-modal');
  if (modal) modal.classList.remove('active');
}

async function handleSaveClientPresetSubmit(e) {
  e.preventDefault();
  const select = document.getElementById('save-client-select');
  const nameInput = document.getElementById('save-client-preset-name');
  const descInput = document.getElementById('save-client-preset-desc');

  const profileId = select ? select.value : null;
  if (!profileId) {
    alert('ไม่พบจอเกมที่เลือก');
    return;
  }

  const name = nameInput && nameInput.value.trim() ? nameInput.value.trim() : 'โปรไฟล์ส่วนกลาง';
  const description = descInput ? descInput.value.trim() : '';

  try {
    const res = await fetch(`${API_BASE}/api/profiles/${profileId}/save-as-preset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description })
    });
    const result = await res.json();
    if (result.success) {
      alert(`บันทึก "${name}" เข้า Save List ส่วนกลางเรียบร้อย!`);
      closeSaveClientPresetModal();
      openPresetsModal();
      fetchPresets();
    } else {
      alert('เกิดข้อผิดพลาด: ' + (result.error || 'ไม่สามารถบันทึกได้'));
    }
  } catch (err) {
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
  }
}

// -------------------------------------------------------------
// EXPORT & DELETE PRESETS
// -------------------------------------------------------------
function exportAllPresets() {
  window.location.href = `${API_BASE}/api/presets/export`;
}

function isProfileJailedForCredExport(p) {
  if (!p) return false;
  if (p.isJailed) return true;
  const checkMap = (m) => {
    const s = String(m || '').trim();
    if (!s || /คุกใต้ดิน/i.test(s)) return false;
    return /คุก|เรือนจำ|\bprison\b|\bjail\b/i.test(s);
  };
  if (checkMap(p.jailedMap)) return true;
  const st = p.liveState;
  if (st && (st.charSelectInJail || checkMap(st.map))) return true;
  return false;
}

function downloadCredentialsTxtFile(mode = 'all', jailedIds = []) {
  const params = new URLSearchParams();
  params.set('mode', mode);
  if (mode === 'jailed' && Array.isArray(jailedIds) && jailedIds.length > 0) {
    params.set('ids', jailedIds.join(','));
  }
  window.location.href = `${API_BASE}/api/profiles/export-credentials-txt?${params.toString()}`;
}

function closeExportCredentialsModal() {
  const modal = document.getElementById('modal-export-credentials-choice');
  if (modal) modal.style.display = 'none';
}

function exportCredentialsTxt() {
  let modal = document.getElementById('modal-export-credentials-choice');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-export-credentials-choice';
    modal.style.cssText = 'display:none;position:fixed;inset:0;z-index:10000005;background:rgba(2,6,23,0.82);backdrop-filter:blur(6px);align-items:center;justify-content:center;padding:18px;';
    modal.innerHTML = `
      <div style="width:100%;max-width:480px;background:linear-gradient(155deg,#0f172a 0%,#131c31 100%);border:1px solid rgba(52,211,153,0.45);border-radius:16px;padding:20px 22px;box-shadow:0 26px 64px rgba(0,0,0,0.88),0 0 32px rgba(16,185,129,0.16);color:#f8fafc;display:flex;flex-direction:column;gap:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,0.08);">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:36px;height:36px;border-radius:10px;background:rgba(16,185,129,0.18);border:1px solid rgba(52,211,153,0.45);display:flex;align-items:center;justify-content:center;font-size:18px;">🔑</div>
            <div>
              <div style="font-size:15.5px;font-weight:800;color:#f8fafc;">เลือกรูปแบบ Export รหัส (.txt)</div>
              <div style="font-size:11.5px;color:#94a3b8;margin-top:1px;">เลือกว่าต้องการส่งออกไอดี/รหัสผ่านทั้งหมด หรือเฉพาะตัวที่ติดคุก</div>
            </div>
          </div>
          <button type="button" id="btn-exp-cred-close" style="background:transparent;border:none;color:#94a3b8;font-size:18px;cursor:pointer;padding:4px 8px;">✕</button>
        </div>

        <div style="display:grid;gap:10px;">
          <button type="button" id="btn-exp-cred-all" style="text-align:left;padding:13px 15px;border-radius:12px;background:rgba(16,185,129,0.13);border:1px solid rgba(52,211,153,0.45);color:#f8fafc;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:12px;font-family:inherit;transition:all 0.15s ease;">
            <div style="display:flex;flex-direction:column;gap:3px;min-width:0;">
              <div style="font-size:14px;font-weight:800;color:#6ee7b7;display:flex;align-items:center;gap:7px;">
                <span>📋 Export รหัสทั้งหมด</span>
              </div>
              <div style="font-size:11.5px;color:#cbd5e1;">ส่งออกรายการ ID / Password ของทุกโปรไฟล์ในเครื่องนี้ทั้งหมด</div>
            </div>
            <span id="badge-exp-cred-all" style="flex-shrink:0;padding:4px 11px;border-radius:999px;background:rgba(16,185,129,0.24);border:1px solid rgba(52,211,153,0.5);color:#a7f3d0;font-size:12px;font-weight:800;">0 จอ</span>
          </button>

          <button type="button" id="btn-exp-cred-jailed" style="text-align:left;padding:13px 15px;border-radius:12px;background:rgba(245,158,11,0.12);border:1px solid rgba(251,191,36,0.45);color:#f8fafc;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:12px;font-family:inherit;transition:all 0.15s ease;">
            <div style="display:flex;flex-direction:column;gap:3px;min-width:0;">
              <div style="font-size:14px;font-weight:800;color:#fde047;display:flex;align-items:center;gap:7px;">
                <span>⛓️ Export เฉพาะตัวที่ติดคุก</span>
              </div>
              <div id="desc-exp-cred-jailed" style="font-size:11.5px;color:#cbd5e1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">ส่งออกเฉพาะรายการ ID / Password ของตัวละครที่ติดคุก</div>
            </div>
            <span id="badge-exp-cred-jailed" style="flex-shrink:0;padding:4px 11px;border-radius:999px;background:rgba(245,158,11,0.22);border:1px solid rgba(251,191,36,0.55);color:#fef08a;font-size:12px;font-weight:800;">0 จอ</span>
          </button>
        </div>

        <div style="display:flex;justify-content:flex-end;padding-top:4px;">
          <button type="button" id="btn-exp-cred-cancel" class="btn btn-secondary btn-sm" style="font-size:12px;padding:6px 16px;">ยกเลิก</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeExportCredentialsModal();
    });
    document.getElementById('btn-exp-cred-close').onclick = closeExportCredentialsModal;
    document.getElementById('btn-exp-cred-cancel').onclick = closeExportCredentialsModal;
  }

  const list = Array.isArray(currentProfiles) ? currentProfiles : [];
  const jailedList = list.filter(isProfileJailedForCredExport);
  const jailedIds = jailedList.map(p => String(p.id));

  const badgeAll = document.getElementById('badge-exp-cred-all');
  const badgeJailed = document.getElementById('badge-exp-cred-jailed');
  const descJailed = document.getElementById('desc-exp-cred-jailed');
  const btnAll = document.getElementById('btn-exp-cred-all');
  const btnJailed = document.getElementById('btn-exp-cred-jailed');

  if (badgeAll) badgeAll.textContent = `${list.length} จอ`;
  if (badgeJailed) {
    badgeJailed.textContent = `${jailedList.length} จอ`;
    badgeJailed.style.background = jailedList.length > 0 ? 'rgba(239,68,68,0.24)' : 'rgba(148,163,184,0.16)';
    badgeJailed.style.borderColor = jailedList.length > 0 ? 'rgba(248,113,113,0.6)' : 'rgba(148,163,184,0.3)';
    badgeJailed.style.color = jailedList.length > 0 ? '#fecaca' : '#94a3b8';
  }
  if (descJailed) {
    if (jailedList.length > 0) {
      const names = jailedList.slice(0, 4).map(p => (p.liveState && p.liveState.charName) || p.lastCharName || p.account || p.name).join(', ');
      descJailed.textContent = `พบตัวติดคุก: ${names}${jailedList.length > 4 ? ` และอีก ${jailedList.length - 4} จอ` : ''}`;
      descJailed.style.color = '#fde68a';
    } else {
      descJailed.textContent = 'ขณะนี้ไม่มีตัวละครที่ติดคุกในระบบ';
      descJailed.style.color = '#94a3b8';
    }
  }
  if (btnJailed) {
    btnJailed.style.opacity = jailedList.length > 0 ? '1' : '0.55';
    btnJailed.style.borderColor = jailedList.length > 0 ? 'rgba(248,113,113,0.55)' : 'rgba(148,163,184,0.25)';
  }

  btnAll.onclick = () => {
    closeExportCredentialsModal();
    downloadCredentialsTxtFile('all');
  };
  btnJailed.onclick = () => {
    if (jailedList.length === 0) {
      alert('ขณะนี้ไม่มีตัวละครที่ติดคุกในระบบครับ');
      return;
    }
    closeExportCredentialsModal();
    downloadCredentialsTxtFile('jailed', jailedIds);
  };

  modal.style.display = 'flex';
}

function parseCredentialsTxtToBackup(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;
  const lines = rawText.replace(/^\uFEFF/, '').split(/\r?\n/);
  const profiles = [];
  const existingList = Array.isArray(currentProfiles) ? currentProfiles : [];
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('=') || t.startsWith('-') || t.startsWith('📋') || t.startsWith('📅') || t.startsWith('ลำดับ')) continue;
    const parts = t.split('|').map(s => s.trim());
    if (parts.length >= 7 && /^\d+$/.test(parts[0])) {
      const [, profName, charName, charClass, portStr, userRaw, passRaw] = parts;
      const username = userRaw === '(ยังไม่มี ID)' ? '' : userRaw;
      const password = passRaw === '(ยังไม่มีรหัส)' ? '' : passRaw;
      const port = parseInt(portStr, 10) || 0;
      const match = existingList.find(p => p && ((port && Number(p.debugPort) === port) || p.name === profName || (charName !== '-' && p.lastCharName === charName)));
      const id = match ? match.id : `profile_txt_${port || (profiles.length + 1)}`;
      profiles.push({
        id,
        name: profName || id,
        characterName: charName !== '-' ? charName : '',
        username,
        account: username,
        password,
        profile: {
          ...(match || {}),
          id,
          name: profName || id,
          account: username,
          lastCharName: charName !== '-' ? charName : (match?.lastCharName || ''),
          charClass: charClass !== '-' ? charClass : (match?.charClass || 'Archer'),
          ...(port ? { debugPort: port } : {})
        }
      });
    }
  }
  if (profiles.length === 0) return null;
  return {
    format: 'pmhee-aetheria-profile-backup-v1',
    profiles
  };
}

function exportSinglePreset(presetId) {
  const preset = currentPresets.find(p => p.id === presetId);
  if (!preset) return;

  const jsonStr = JSON.stringify(preset, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const cleanName = preset.name.replace(/[^a-zA-Z0-9ก-๙_-]/g, '_');
  a.download = `preset_${cleanName}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function deletePreset(presetId) {
  const preset = currentPresets.find(p => p.id === presetId);
  const name = preset ? preset.name : presetId;
  if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบ "${name}" ออกจาก Save List?`)) return;

  try {
    const res = await fetch(`${API_BASE}/api/presets/${presetId}`, { method: 'DELETE' });
    const result = await res.json();
    if (result.success) {
      fetchPresets();
    } else {
      alert('ลบไม่สำเร็จ: ' + (result.error || 'เกิดข้อผิดพลาด'));
    }
  } catch (err) {
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
  }
}

// -------------------------------------------------------------
// DOM EVENT WIRING FOR PRESETS & SAVE LIST
// -------------------------------------------------------------
function setupPresetsEventListeners() {
  // Top row buttons
  const btnOpenPresets = document.getElementById('btn-open-presets-modal');
  if (btnOpenPresets) btnOpenPresets.onclick = openPresetsModal;

  const btnImportGlobal = document.getElementById('btn-import-profile-global');
  if (btnImportGlobal) btnImportGlobal.onclick = openImportProfileModal;

  const btnExportGlobal = document.getElementById('btn-export-profile-global');
  if (btnExportGlobal) btnExportGlobal.onclick = exportAllPresets;

  const btnExportCredsTxt = document.getElementById('btn-export-credentials-txt');
  if (btnExportCredsTxt) btnExportCredsTxt.onclick = exportCredentialsTxt;

  // Presets modal buttons
  const btnPresetsClose = document.getElementById('presets-modal-close-btn');
  if (btnPresetsClose) btnPresetsClose.onclick = closePresetsModal;

  const btnPresetsCloseBottom = document.getElementById('presets-modal-close-bottom');
  if (btnPresetsCloseBottom) btnPresetsCloseBottom.onclick = closePresetsModal;

  const btnCreateFromClient = document.getElementById('btn-create-preset-from-client');
  if (btnCreateFromClient) btnCreateFromClient.onclick = () => openSaveClientPresetModal();

  const btnPresetsModalImport = document.getElementById('btn-presets-modal-import');
  if (btnPresetsModalImport) btnPresetsModalImport.onclick = openImportProfileModal;

  const btnPresetsModalExport = document.getElementById('btn-presets-modal-export');
  if (btnPresetsModalExport) btnPresetsModalExport.onclick = exportAllPresets;

  // Copy-to modal buttons
  const btnCopyClose = document.getElementById('copy-to-modal-close-btn');
  if (btnCopyClose) btnCopyClose.onclick = closeCopyToModal;

  const btnCopyCancel = document.getElementById('copy-to-modal-cancel');
  if (btnCopyCancel) btnCopyCancel.onclick = closeCopyToModal;

  const btnCopyConfirm = document.getElementById('copy-to-modal-confirm');
  if (btnCopyConfirm) btnCopyConfirm.onclick = confirmApplyCopyTo;

  const btnSelectAll = document.getElementById('btn-copy-to-select-all');
  if (btnSelectAll) {
    btnSelectAll.onclick = () => {
      document.querySelectorAll('.copy-to-profile-checkbox').forEach(cb => cb.checked = true);
    };
  }

  const btnDeselectAll = document.getElementById('btn-copy-to-deselect-all');
  if (btnDeselectAll) {
    btnDeselectAll.onclick = () => {
      document.querySelectorAll('.copy-to-profile-checkbox').forEach(cb => cb.checked = false);
    };
  }

  // Import modal buttons & form
  const btnImportClose = document.getElementById('import-modal-close-btn');
  if (btnImportClose) btnImportClose.onclick = closeImportProfileModal;

  const btnImportCancel = document.getElementById('import-modal-cancel-btn');
  if (btnImportCancel) btnImportCancel.onclick = closeImportProfileModal;

  const importForm = document.getElementById('import-profile-form');
  if (importForm) importForm.onsubmit = handleImportProfileSubmit;

  const importFileInput = document.getElementById('import-file-input');
  if (importFileInput) {
    importFileInput.onchange = (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        const textarea = document.getElementById('import-json-textarea');
        if (textarea) textarea.value = text;
        try {
          const parsed = JSON.parse(text);
          const nameInput = document.getElementById('import-preset-name');
          if (nameInput) {
            if (parsed && (parsed.format === 'pmhee-aetheria-profile-backup-v1' || (Array.isArray(parsed.profiles) && !parsed.presets))) {
              nameInput.value = `ไฟล์สำรองโปรไฟล์ + ID/Pass (${parsed.profiles.length} จอ)`;
            } else if (Array.isArray(parsed) || parsed.presets) {
              nameInput.value = `ชุดโปรไฟล์นำเข้า (${(parsed.presets || parsed).length} รายการ)`;
            } else if (parsed.name) {
              nameInput.value = parsed.name;
            } else {
              nameInput.value = file.name.replace(/\.(json|txt)$/i, '');
            }
          }
        } catch(err) {
          const txtBackup = parseCredentialsTxtToBackup(text);
          const nameInput = document.getElementById('import-preset-name');
          if (txtBackup && nameInput) {
            nameInput.value = `ไฟล์สำรองรหัส .txt (${txtBackup.profiles.length} จอ)`;
          }
        }
      };
      reader.readAsText(file);
    };
  }

  // Save client modal buttons & form
  const btnSaveClientClose = document.getElementById('save-client-modal-close-btn');
  if (btnSaveClientClose) btnSaveClientClose.onclick = closeSaveClientPresetModal;

  const btnSaveClientCancel = document.getElementById('save-client-modal-cancel');
  if (btnSaveClientCancel) btnSaveClientCancel.onclick = closeSaveClientPresetModal;

  const saveClientForm = document.getElementById('save-client-preset-form');
  if (saveClientForm) saveClientForm.onsubmit = handleSaveClientPresetSubmit;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupPresetsEventListeners);
} else {
  setupPresetsEventListeners();
}

// Initial fetch presets
fetchPresets();


// ==========================================================================
// CARD WHITELIST & FORCE-SELL NPC MODAL & CONTROLLER
// ==========================================================================
let activeWLProfileId = null;
let activeWLItems = [];
let activeFSItems = [];
let activeWLTabMode = 'whitelist'; // 'whitelist' or 'forceSell'
let activeWLViewMode = 'chips'; // 'chips' or 'text'

function getActiveListArray() {
  return activeWLTabMode === 'forceSell' ? activeFSItems : activeWLItems;
}

function setActiveListArray(arr) {
  if (activeWLTabMode === 'forceSell') {
    activeFSItems = arr;
  } else {
    activeWLItems = arr;
  }
}

function syncTextareaToActiveList() {
  if (activeWLViewMode === 'text') {
    const textarea = document.getElementById('card-wl-textarea');
    if (textarea) {
      const parts = textarea.value.split(/[,\n]+/).map(s => s.trim()).filter(Boolean);
      const unique = [];
      parts.forEach(p => {
        if (!unique.some(u => u.toLowerCase() === p.toLowerCase())) {
          unique.push(p);
        }
      });
      setActiveListArray(unique);
    }
  }
}

function switchCardWhitelistTab(mode) {
  syncTextareaToActiveList();
  activeWLTabMode = mode === 'forceSell' ? 'forceSell' : 'whitelist';
  updateWLTabModeUI();
  renderCardWhitelistChips();
}

function updateWLTabModeUI() {
  const tabWlBtn = document.getElementById('btn-card-wl-tab-whitelist');
  const tabFsBtn = document.getElementById('btn-card-wl-tab-forcesell');
  const hintEl = document.getElementById('card-wl-mode-hint');
  const headerIconEl = document.getElementById('card-wl-header-icon');
  const copyLabelEl = document.getElementById('card-wl-copy-label');
  const wlCountEl = document.getElementById('card-wl-tab-count-wl');
  const fsCountEl = document.getElementById('card-wl-tab-count-fs');

  if (wlCountEl) wlCountEl.innerText = String(activeWLItems.length);
  if (fsCountEl) fsCountEl.innerText = String(activeFSItems.length);

  if (activeWLTabMode === 'forceSell') {
    if (tabFsBtn) {
      tabFsBtn.style.background = 'rgba(194, 65, 12, 0.4)';
      tabFsBtn.style.borderColor = 'rgba(249, 115, 22, 0.65)';
      tabFsBtn.style.color = '#ffedd5';
    }
    if (tabWlBtn) {
      tabWlBtn.style.background = 'transparent';
      tabWlBtn.style.borderColor = 'transparent';
      tabWlBtn.style.color = '#94a3b8';
    }
    if (headerIconEl) {
      headerIconEl.innerText = '💰';
      headerIconEl.style.background = 'rgba(249, 115, 22, 0.18)';
      headerIconEl.style.borderColor = 'rgba(249, 115, 22, 0.45)';
    }
    if (hintEl) {
      hintEl.style.borderLeftColor = '#f97316';
      hintEl.innerHTML = '💰 <b>โหมดบังคับขาย NPC (ไม่สนหมวดหมู่):</b> เพียงใส่ชื่อไอเทมลงในรายการนี้ (เช่น <code>Orange Potion, Blue Potion, Carrot</code>) บอทจะขายไอเทมนั้นลงร้าน NPC ทันทีแม้หมวดนั้นตั้งเป็น "เก็บทั้งหมด"';
    }
    if (copyLabelEl) {
      copyLabelEl.innerText = 'เลือกจอที่ต้องการคัดลอก "รายการบังคับขาย NPC" นี้ไปใช้:';
    }
  } else {
    if (tabWlBtn) {
      tabWlBtn.style.background = 'rgba(3, 105, 161, 0.35)';
      tabWlBtn.style.borderColor = 'rgba(56, 189, 248, 0.5)';
      tabWlBtn.style.color = '#e0f2fe';
    }
    if (tabFsBtn) {
      tabFsBtn.style.background = 'transparent';
      tabFsBtn.style.borderColor = 'transparent';
      tabFsBtn.style.color = '#94a3b8';
    }
    if (headerIconEl) {
      headerIconEl.innerText = '🛡️';
      headerIconEl.style.background = 'rgba(245, 158, 11, 0.15)';
      headerIconEl.style.borderColor = 'rgba(245, 158, 11, 0.35)';
    }
    if (hintEl) {
      hintEl.style.borderLeftColor = '#38bdf8';
      hintEl.innerHTML = '🛡️ <b>โหมด Whitelist (ห้ามขาย):</b> ไอเทมที่มีชื่อในรายการนี้จะถูกป้องกันไม่ให้ขายทิ้งลงร้าน NPC';
    }
    if (copyLabelEl) {
      copyLabelEl.innerText = 'เลือกจอที่ต้องการคัดลอก "Whitelist (ห้ามขาย)" นี้ไปใช้:';
    }
  }
}

async function openCardWhitelistModal(profileId, initialTab = 'whitelist', autoOpenCopyPanel = false) {
  activeWLProfileId = profileId;
  activeWLTabMode = initialTab === 'forceSell' ? 'forceSell' : 'whitelist';
  const profile = currentProfiles.find(p => p.id === profileId);
  if (!profile) return;

  const modal = document.getElementById('card-whitelist-modal');
  const subtitleEl = document.getElementById('card-wl-subtitle');
  const bannerEl = document.getElementById('card-wl-banner');
  const statusTextEl = document.getElementById('card-wl-status-text');
  const copyPanel = document.getElementById('card-wl-copy-panel');
  const inputEl = document.getElementById('card-wl-input');

  if (copyPanel) copyPanel.style.display = 'none';
  if (inputEl) inputEl.value = '';

  activeWLViewMode = 'chips';
  updateWLViewModeUI();
  updateWLTabModeUI();

  if (subtitleEl) {
    subtitleEl.innerText = `จอ: ${profile.name} (${profile.account || 'No account'}) • Port: ${profile.debugPort || '--'}`;
  }

  if (statusTextEl) {
    statusTextEl.innerText = '⏳ กำลังดึงข้อมูลรายการจากจอเกม...';
  }

  // Open modal first with loading state
  if (modal) modal.classList.add('active');

  try {
    const res = await fetch(`${API_BASE}/api/profiles/${profileId}/whitelist`);
    const data = await res.json();
    if (data.success) {
      activeWLItems = Array.isArray(data.items) ? data.items : [];
      activeFSItems = Array.isArray(data.forceSellItems)
        ? data.forceSellItems
        : String(data.forceSellList || '').split(',').map(s => s.trim()).filter(Boolean);
      if (statusTextEl) {
        if (data.isOnline) {
          statusTextEl.innerHTML = `🟢 <b>ออนไลน์</b> (Port ${profile.debugPort}) — ซิงค์ข้อมูล Real-time กับเกมสด`;
          if (bannerEl) bannerEl.style.background = 'rgba(16, 185, 129, 0.12)';
          if (bannerEl) bannerEl.style.borderColor = 'rgba(16, 185, 129, 0.3)';
          if (bannerEl) bannerEl.style.color = '#a7f3d0';
        } else {
          statusTextEl.innerHTML = `⚪ <b>ออฟไลน์</b> — ข้อมูลบันทึกไว้ในโปรไฟล์ (จะอัปเดตเมื่อเปิดจอ)`;
          if (bannerEl) bannerEl.style.background = 'rgba(148, 163, 184, 0.1)';
          if (bannerEl) bannerEl.style.borderColor = 'rgba(148, 163, 184, 0.25)';
          if (bannerEl) bannerEl.style.color = '#cbd5e1';
        }
      }
    } else {
      activeWLItems = (profile.whitelist || '').split(',').map(s => s.trim()).filter(Boolean);
      activeFSItems = ((profile.sellConfig && profile.sellConfig.forceSellList) || profile.forceSellList || '').split(',').map(s => s.trim()).filter(Boolean);
      if (statusTextEl) statusTextEl.innerText = '⚠️ ใช้ข้อมูลจากโปรไฟล์เครื่อง';
    }
  } catch(e) {
    console.warn('Fetch whitelist error:', e);
    activeWLItems = (profile.whitelist || '').split(',').map(s => s.trim()).filter(Boolean);
    activeFSItems = ((profile.sellConfig && profile.sellConfig.forceSellList) || profile.forceSellList || '').split(',').map(s => s.trim()).filter(Boolean);
    if (statusTextEl) statusTextEl.innerText = '⚠️ ใช้ข้อมูลแคชในตัว';
  }

  updateWLTabModeUI();
  renderCardWhitelistChips();
  if (autoOpenCopyPanel && copyPanel) {
    populateWLCopyTargetList();
    copyPanel.style.display = 'block';
  }
}

function closeCardWhitelistModal() {
  const modal = document.getElementById('card-whitelist-modal');
  if (modal) modal.classList.remove('active');
  const copyPanel = document.getElementById('card-wl-copy-panel');
  if (copyPanel) copyPanel.style.display = 'none';
  activeWLProfileId = null;
  activeWLItems = [];
  activeFSItems = [];
}

function renderCardWhitelistChips() {
  const container = document.getElementById('card-wl-chips-container');
  const textarea = document.getElementById('card-wl-textarea');
  const countBadge = document.getElementById('card-wl-count-badge');
  const wlCountEl = document.getElementById('card-wl-tab-count-wl');
  const fsCountEl = document.getElementById('card-wl-tab-count-fs');
  const items = getActiveListArray();
  const isFs = activeWLTabMode === 'forceSell';

  if (wlCountEl) wlCountEl.innerText = String(activeWLItems.length);
  if (fsCountEl) fsCountEl.innerText = String(activeFSItems.length);

  if (countBadge) {
    countBadge.innerText = `${items.length} รายการ`;
  }

  if (textarea) {
    textarea.value = items.join(', ');
  }

  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = isFs ? `
      <div class="wl-empty-msg">
        <span style="font-size: 24px; opacity: 0.6;">💰</span>
        <span>ยังไม่มีรายการบังคับขาย NPC (ไม่สนหมวดหมู่)</span>
        <span style="font-size: 11px; opacity: 0.7;">พิมพ์ชื่อไอเทม เช่น Orange Potion, Blue Potion, Carrot ด้านบนแล้วกด "➕ เพิ่ม" หรือกดปุ่ม "💰 ขาย NPC" จากหน้าต่างกระเป๋า</span>
      </div>
    ` : `
      <div class="wl-empty-msg">
        <span style="font-size: 24px; opacity: 0.6;">📦</span>
        <span>ไม่มีไอเทมใน Whitelist (บอทจะขายทุกชิ้นตามเกณฑ์ความหายาก)</span>
        <span style="font-size: 11px; opacity: 0.7;">พิมพ์ชื่อไอเทมด้านบนแล้วกด "➕ เพิ่ม" หรือกด "📥 นำเข้า"</span>
      </div>
    `;
    return;
  }

  container.innerHTML = items.map((item, idx) => `
    <div class="wl-chip" title="${escapeHTML(item)}" style="${isFs ? 'border-color: rgba(249, 115, 22, 0.45); background: rgba(194, 65, 12, 0.2);' : ''}">
      <span class="wl-chip-icon">${isFs ? '💰' : '🛡️'}</span>
      <span class="wl-chip-text">${escapeHTML(item)}</span>
      <span class="wl-chip-del" onclick="removeCardWhitelistItem(${idx})" title="ลบออกจากรายการ">&times;</span>
    </div>
  `).join('');
}

function addCardWhitelistItems(inputStr) {
  if (!inputStr || !inputStr.trim()) return;
  const parts = inputStr.split(/[,\n]+/).map(s => s.trim()).filter(Boolean);
  let addedCount = 0;
  const items = getActiveListArray();
  const otherItems = activeWLTabMode === 'forceSell' ? activeWLItems : activeFSItems;

  parts.forEach(name => {
    const lower = name.toLowerCase();
    const exists = items.some(existing => existing.toLowerCase() === lower);
    if (!exists) {
      items.push(name);
      addedCount++;
    }
    const otherIdx = otherItems.findIndex(existing => existing.toLowerCase() === lower);
    if (otherIdx !== -1) {
      otherItems.splice(otherIdx, 1);
    }
  });

  renderCardWhitelistChips();
  return addedCount;
}

function removeCardWhitelistItem(idx) {
  const items = getActiveListArray();
  if (idx >= 0 && idx < items.length) {
    items.splice(idx, 1);
    renderCardWhitelistChips();
  }
}

function updateWLViewModeUI() {
  const chipsContainer = document.getElementById('card-wl-chips-container');
  const textContainer = document.getElementById('card-wl-text-container');
  const viewLabel = document.getElementById('card-wl-view-label');
  const textarea = document.getElementById('card-wl-textarea');
  const items = getActiveListArray();

  if (activeWLViewMode === 'chips') {
    if (chipsContainer) chipsContainer.style.display = 'flex';
    if (textContainer) textContainer.style.display = 'none';
    if (viewLabel) viewLabel.innerText = '📝 Text Mode';
  } else {
    if (chipsContainer) chipsContainer.style.display = 'none';
    if (textContainer) textContainer.style.display = 'block';
    if (viewLabel) viewLabel.innerText = '🏷️ Tags Mode';
    if (textarea) textarea.value = items.join(', ');
  }
}

function toggleCardWhitelistViewMode() {
  const textarea = document.getElementById('card-wl-textarea');
  if (activeWLViewMode === 'chips') {
    activeWLViewMode = 'text';
    if (textarea) textarea.value = getActiveListArray().join(', ');
  } else {
    syncTextareaToActiveList();
    activeWLViewMode = 'chips';
  }
  updateWLViewModeUI();
  renderCardWhitelistChips();
}

function handleCardWhitelistImport() {
  const fileInput = document.getElementById('card-wl-file-input');
  if (fileInput) {
    fileInput.value = '';
    fileInput.click();
  }
}

function handleCardWhitelistExport() {
  syncTextareaToActiveList();
  const items = getActiveListArray();
  const isFs = activeWLTabMode === 'forceSell';
  if (items.length === 0) {
    alert((isFs ? 'รายการบังคับขาย NPC' : 'Whitelist') + ' ว่างเปล่า ไม่มีรายการให้ส่งออก');
    return;
  }
  const profile = currentProfiles.find(p => p.id === activeWLProfileId);
  const text = items.join(', ');

  // 1. Copy to clipboard
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  // 2. Download as text file
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = (profile?.name || 'profile').replace(/[^a-zA-Z0-9_\u0E00-\u0E7F]/g, '_');
  a.download = `${isFs ? 'forcesell_npc' : 'whitelist'}_${safeName}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  alert(`📤 ส่งออกเรียบร้อย!\n- คัดลอก ${items.length} รายการลงคลิปบอร์ดแล้ว\n- ดาวน์โหลดไฟล์ ${a.download} เรียบร้อยแล้ว`);
}

function toggleCardWhitelistCopyPanel() {
  const panel = document.getElementById('card-wl-copy-panel');
  if (!panel) return;
  const isHidden = panel.style.display === 'none' || !panel.style.display;
  if (isHidden) {
    populateWLCopyTargetList();
    panel.style.display = 'block';
  } else {
    panel.style.display = 'none';
  }
}

function populateWLCopyTargetList() {
  const container = document.getElementById('card-wl-target-clients-list');
  if (!container) return;

  const targets = currentProfiles.filter(p => p.id !== activeWLProfileId);
  if (targets.length === 0) {
    container.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 8px; font-size: 11px;">ไม่มีจออื่นในระบบให้คัดลอก</div>';
    return;
  }

  container.innerHTML = targets.map(p => `
    <label class="wl-target-client-item">
      <div style="display: flex; align-items: center; gap: 8px;">
        <input type="checkbox" class="wl-target-checkbox" value="${p.id}" checked style="width: 14px; height: 14px; cursor: pointer;">
        <span style="font-size: 12px; font-weight: 600; color: #f8fafc;">${escapeHTML(p.name)}</span>
        <span style="font-size: 11px; color: #94a3b8;">(${escapeHTML(p.charClass || 'Archer')})</span>
        <span style="font-size: 10px; color: #64748b;">Port: ${p.debugPort || '--'}</span>
      </div>
      <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 600; ${p.isRunning ? 'background: rgba(34,197,94,0.18); color: #4ade80; border: 1px solid rgba(34,197,94,0.3);' : 'background: rgba(148,163,184,0.12); color: #94a3b8; border: 1px solid rgba(148,163,184,0.2);'}">
        ${p.isRunning ? '🟢 ออนไลน์' : '⚪ ออฟไลน์'}
      </span>
    </label>
  `).join('');
}

async function executeCardWhitelistCopyToTargets() {
  if (!activeWLProfileId) return;
  const checkboxes = document.querySelectorAll('.wl-target-checkbox:checked');
  const targetIds = Array.from(checkboxes).map(cb => cb.value);

  if (targetIds.length === 0) {
    alert('กรุณาเลือกจอเป้าหมายอย่างน้อย 1 จอ');
    return;
  }

  syncTextareaToActiveList();

  const execBtn = document.getElementById('btn-card-wl-copy-execute');
  const originalText = execBtn ? execBtn.innerHTML : '';
  if (execBtn) {
    execBtn.disabled = true;
    execBtn.innerHTML = '⏳ กำลังคัดลอก...';
  }

  const isFs = activeWLTabMode === 'forceSell';
  const reqBody = isFs
    ? { mode: 'forceSell', forceSellList: activeFSItems.join(', '), targets: targetIds }
    : { mode: 'whitelist', whitelist: activeWLItems.join(', '), targets: targetIds };

  try {
    const res = await fetch(`${API_BASE}/api/profiles/${activeWLProfileId}/whitelist`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody)
    });
    const result = await res.json();
    if (result.success) {
      syncOpenWebHudSellLists(activeWLProfileId, activeWLItems.join(', '), activeFSItems.join(', '));
      targetIds.forEach(tid => {
        if (isFs) syncOpenWebHudSellLists(tid, undefined, activeFSItems.join(', '));
        else syncOpenWebHudSellLists(tid, activeWLItems.join(', '), undefined);
      });
      alert(`🚀 ${result.message || 'คัดลอกรายการสำเร็จแล้ว!'}`);
      const panel = document.getElementById('card-wl-copy-panel');
      if (panel) panel.style.display = 'none';
      fetchProfiles();
    } else {
      alert('เกิดข้อผิดพลาด: ' + (result.error || 'ไม่สามารถคัดลอกได้'));
    }
  } catch(e) {
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
  } finally {
    if (execBtn) {
      execBtn.disabled = false;
      execBtn.innerHTML = originalText;
    }
  }
}

function syncOpenWebHudSellLists(profileId, wlStr, fsStr) {
  const hudObj = activeWebHuds && activeWebHuds[profileId];
  const hudEl = hudObj && hudObj.el;
  if (!hudEl) return;
  if (wlStr !== undefined) {
    const wlInp = hudEl.querySelector('#p-sell-whitelist');
    if (wlInp) wlInp.value = wlStr;
  }
  if (fsStr !== undefined) {
    const fsInp = hudEl.querySelector('#p-sell-force-list');
    if (fsInp) fsInp.value = fsStr;
  }
}

async function saveCardWhitelist() {
  if (!activeWLProfileId) return;

  syncTextareaToActiveList();

  const saveBtn = document.getElementById('btn-card-wl-save');
  const originalText = saveBtn ? saveBtn.innerHTML : '';
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '⏳ กำลังบันทึก...';
  }

  const wlStr = activeWLItems.join(', ');
  const fsStr = activeFSItems.join(', ');

  try {
    const res = await fetch(`${API_BASE}/api/profiles/${activeWLProfileId}/whitelist`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'both',
        whitelist: wlStr,
        forceSellList: fsStr
      })
    });
    const result = await res.json();
    if (result.success) {
      syncOpenWebHudSellLists(activeWLProfileId, wlStr, fsStr);
      alert('💾 บันทึก Whitelist & รายการบังคับขาย NPC สำเร็จ และอัปเดตเข้าจอเกมเรียบร้อยแล้ว!');
      closeCardWhitelistModal();
      fetchProfiles();
    } else {
      alert('เกิดข้อผิดพลาด: ' + (result.error || 'ไม่สามารถบันทึกได้'));
    }
  } catch(e) {
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalText;
    }
  }
}

function setupCardWhitelistEventListeners() {
  const btnClose = document.getElementById('card-wl-modal-close-btn');
  if (btnClose) btnClose.onclick = closeCardWhitelistModal;

  const btnCancel = document.getElementById('card-wl-modal-cancel');
  if (btnCancel) btnCancel.onclick = closeCardWhitelistModal;

  const tabWlBtn = document.getElementById('btn-card-wl-tab-whitelist');
  if (tabWlBtn) tabWlBtn.onclick = () => switchCardWhitelistTab('whitelist');

  const tabFsBtn = document.getElementById('btn-card-wl-tab-forcesell');
  if (tabFsBtn) tabFsBtn.onclick = () => switchCardWhitelistTab('forceSell');

  const inputEl = document.getElementById('card-wl-input');
  const btnAdd = document.getElementById('btn-card-wl-add');
  const handleAdd = () => {
    if (inputEl && inputEl.value.trim()) {
      addCardWhitelistItems(inputEl.value);
      inputEl.value = '';
      inputEl.focus();
    }
  };
  if (btnAdd) btnAdd.onclick = handleAdd;
  if (inputEl) {
    inputEl.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAdd();
      }
    };
  }

  const btnToggleView = document.getElementById('btn-card-wl-toggle-view');
  if (btnToggleView) btnToggleView.onclick = toggleCardWhitelistViewMode;

  const btnImport = document.getElementById('btn-card-wl-import');
  if (btnImport) btnImport.onclick = handleCardWhitelistImport;

  const fileInput = document.getElementById('card-wl-file-input');
  if (fileInput) {
    fileInput.onchange = (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target.result;
        let importedItems = [];
        try {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            importedItems = parsed.map(String);
          } else if (activeWLTabMode === 'forceSell' && parsed.forceSellList) {
            importedItems = String(parsed.forceSellList).split(/[,\n]+/).map(s => s.trim()).filter(Boolean);
          } else if (parsed.whitelist) {
            importedItems = String(parsed.whitelist).split(/[,\n]+/).map(s => s.trim()).filter(Boolean);
          } else if (parsed.items && Array.isArray(parsed.items)) {
            importedItems = parsed.items.map(String);
          }
        } catch(err) {
          importedItems = content.split(/[,\n]+/).map(s => s.trim()).filter(Boolean);
        }

        if (importedItems.length === 0) {
          alert('ไม่พบรายการไอเทมในไฟล์ที่เลือก');
          return;
        }

        const isReplace = confirm(`พบรายการไอเทมทั้งหมด ${importedItems.length} รายการ\n\nต้องการ "แทนที่ทั้งหมด (Replace)" หรือไม่?\n[OK] = แทนที่ทั้งหมด\n[Cancel] = เพิ่มต่อท้าย (Append)`);
        if (isReplace) {
          setActiveListArray([]);
        }
        const curList = getActiveListArray();

        importedItems.forEach(name => {
          name = name.trim();
          if (name && !curList.some(existing => existing.toLowerCase() === name.toLowerCase())) {
            curList.push(name);
          }
        });

        renderCardWhitelistChips();
        alert(`📥 นำเข้าเรียบร้อย! ตอนนี้มีทั้งหมด ${curList.length} รายการ`);
      };
      reader.readAsText(file);
    };
  }

  const btnExport = document.getElementById('btn-card-wl-export');
  if (btnExport) btnExport.onclick = handleCardWhitelistExport;

  const btnCopyTo = document.getElementById('btn-card-wl-copy-to');
  if (btnCopyTo) btnCopyTo.onclick = toggleCardWhitelistCopyPanel;

  const btnCopyCancel = document.getElementById('btn-card-wl-copy-cancel');
  if (btnCopyCancel) btnCopyCancel.onclick = () => {
    const panel = document.getElementById('card-wl-copy-panel');
    if (panel) panel.style.display = 'none';
  };

  const btnCopySelectAll = document.getElementById('btn-card-wl-copy-select-all');
  if (btnCopySelectAll) btnCopySelectAll.onclick = () => {
    document.querySelectorAll('.wl-target-checkbox').forEach(cb => cb.checked = true);
  };

  const btnCopyClearAll = document.getElementById('btn-card-wl-copy-clear-all');
  if (btnCopyClearAll) btnCopyClearAll.onclick = () => {
    document.querySelectorAll('.wl-target-checkbox').forEach(cb => cb.checked = false);
  };

  const btnCopyExec = document.getElementById('btn-card-wl-copy-execute');
  if (btnCopyExec) btnCopyExec.onclick = executeCardWhitelistCopyToTargets;

  const btnClearAll = document.getElementById('btn-card-wl-clear-all');
  if (btnClearAll) {
    btnClearAll.onclick = () => {
      const curList = getActiveListArray();
      if (curList.length === 0) return;
      const label = activeWLTabMode === 'forceSell' ? 'รายการบังคับขาย NPC' : 'Whitelist';
      if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการล้าง ${label} ทั้งหมดสำหรับจอนี้?`)) {
        setActiveListArray([]);
        renderCardWhitelistChips();
      }
    };
  }

  const btnSave = document.getElementById('btn-card-wl-save');
  if (btnSave) btnSave.onclick = saveCardWhitelist;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setupCardWhitelistEventListeners();
    initCharacterModalEvents();
  });
} else {
  setupCardWhitelistEventListeners();
  initCharacterModalEvents();
}

// ==========================================
// CHARACTER DETAIL & INTERACTIVE EQUIPMENT WINDOW
// ==========================================
let currentCharProfileId = null;
let currentCharData = null;
let currentCharTab = 'equip'; // 'equip' | 'costume' | 'gem'
let selectedSlotDef = null;

const CHAR_EQUIP_SLOTS_LEFT = [
  { key: 'head-upper', label: 'หมวกบน', icon: '👑', equipTypes: ['Helmet', 'head-upper'] },
  { key: 'head-middle', label: 'หน้า', icon: '🎭', equipTypes: ['HeadMid', 'head-middle'] },
  { key: 'head-lower', label: 'ปาก', icon: '🌿', equipTypes: ['HeadLow', 'head-lower'] },
  { key: 'armor', label: 'เกราะ / เสื้อ', icon: '👕', equipTypes: ['Armor', 'armor'] },
  { key: 'gloves', label: 'ถุงมือ', icon: '🧤', equipTypes: ['Glove', 'gloves'] },
  { key: 'accessory-left', label: 'เครื่องประดับ 1', icon: '💍', equipTypes: ['Acc', 'Accessory', 'accessory-left', 'accessory-right'] }
];

const CHAR_EQUIP_SLOTS_RIGHT = [
  { key: 'main-hand', label: 'อาวุธ', icon: '🗡️', equipTypes: ['Weapon', 'main-hand'] },
  { key: 'off-hand', label: 'มือซ้าย / โล่', icon: '🛡️', equipTypes: ['Shield', 'off-hand', 'Weapon'] },
  { key: 'garment', label: 'ผ้าคลุม', icon: '🧣', equipTypes: ['Cape', 'Garment', 'garment'] },
  { key: 'legs', label: 'กางเกง', icon: '👖', equipTypes: ['Pants', 'legs'] },
  { key: 'boots', label: 'รองเท้า', icon: '👢', equipTypes: ['Boot', 'Boots', 'boots'] },
  { key: 'accessory-right', label: 'เครื่องประดับ 2', icon: '💍', equipTypes: ['Acc', 'Accessory', 'accessory-left', 'accessory-right'] }
];

const CHAR_AMMO_SLOT = { key: 'ammo', label: 'กระสุน / ลูกธนู', icon: '🏹', equipTypes: ['Ammo', 'ammo'] };

const CHAR_GEM_SLOTS = [
  { key: 'gem-1', label: 'เจมช่อง 1', icon: '💎', equipTypes: ['Gem', 'gem-1'] },
  { key: 'gem-2', label: 'เจมช่อง 2', icon: '💎', equipTypes: ['Gem', 'gem-2'] },
  { key: 'gem-3', label: 'เจมช่อง 3', icon: '💎', equipTypes: ['Gem', 'gem-3'] },
  { key: 'gem-4', label: 'เจมช่อง 4', icon: '💎', equipTypes: ['Gem', 'gem-4'] }
];

const CHAR_COSTUME_SLOTS = [
  { key: 'costume-head-upper', label: 'คอสตูมหมวกบน', icon: '✨', equipTypes: ['Costume', 'costume-head-upper'] },
  { key: 'costume-head-middle', label: 'คอสตูมหน้า', icon: '✨', equipTypes: ['Costume', 'costume-head-middle'] },
  { key: 'costume-head-lower', label: 'คอสตูมปาก', icon: '✨', equipTypes: ['Costume', 'costume-head-lower'] },
  { key: 'costume-garment', label: 'คอสตูมผ้าคลุม', icon: '✨', equipTypes: ['Costume', 'costume-garment'] }
];

function getRarityColor(rarity) {
  const r = String(rarity || 'common').toLowerCase();
  if (r === 'legendary' || r === 'mythic') return '#fbbf24';
  if (r === 'epic') return '#c084fc';
  if (r === 'rare') return '#38bdf8';
  if (r === 'uncommon') return '#4ade80';
  return '#cbd5e1';
}

function formatItemDisplayName(item) {
  if (!item) return '';
  let name = item.name || 'Unknown Item';
  if (item.refine && item.refine > 0 && !name.startsWith('+')) {
    name = `+${item.refine} ${name}`;
  }
  if (item.slots && item.slots > 0 && !name.includes('[')) {
    name = `${name} [${item.slots}]`;
  }
  return name;
}

// Item stats come in two groups:
//   item.attributes = base stats, fixed for the item type (e.g. Formal Suit always DEF +5)
//   item.affixes    = random options rolled per drop ("ออฟชั่นสุ่ม" / Random Options / Affixes)
const ITEM_STAT_LABELS = {
  MELEE_DEFENSE: 'DEF', MAGIC_DEFENSE: 'MDEF', DEFENSE: 'DEF', DEF: 'DEF', MDEF: 'MDEF',
  RANGE_ATTACK: 'ATK ระยะไกล', RANGED_ATK: 'ATK ระยะไกล', MELEE_ATTACK: 'ATK ประชิด', MELEE_ATK: 'ATK ประชิด',
  ATTACK: 'ATK', ATK: 'ATK', MAGIC_ATTACK: 'MATK', MATK: 'MATK',
  STR: 'STR', AGI: 'AGI', VIT: 'VIT', INT: 'INT', DEX: 'DEX', LUK: 'LUK',
  MAXHP: 'Max HP', MAX_HP: 'Max HP', MAXSP: 'Max SP', MAX_SP: 'Max SP',
  HIT: 'HIT', FLEE: 'FLEE', CRIT: 'CRIT', CRITICAL: 'CRIT', CRIT_DAMAGE: 'ดาเมจคริ',
  ASPD: 'ASPD', ATTACK_SPEED: 'ASPD', MOVE_SPEED: 'ความเร็วเดิน', HEAL_POWER: 'พลังฮีล',
  BLOCK_CHANCE: 'โอกาสบล็อก', DAMAGE_REDUCTION: 'ลดดาเมจที่ได้รับ', IGNORE_SIZE: 'ยกเลิกโทษขนาดอาวุธ',
  MELEE_DAMAGE_PERCENT: 'ดาเมจระยะประชิด', RANGED_DAMAGE_PERCENT: 'ดาเมจระยะไกล', MAGIC_DAMAGE_PERCENT: 'ดาเมจเวท'
};

// Stats shown with "%" even when rolled in "base" mode (same set the game's formatter uses)
const ITEM_PERCENT_STATS = new Set(['MOVE_SPEED', 'CRIT_DAMAGE', 'MELEE_DAMAGE_PERCENT', 'RANGED_DAMAGE_PERCENT',
  'MAGIC_DAMAGE_PERCENT', 'DAMAGE_REDUCTION', 'BLOCK_CHANCE', 'HEAL_POWER']);

function getItemStatLabel(type) {
  return ITEM_STAT_LABELS[type] || String(type || 'Stat').replace(/_/g, ' ');
}

// Mirrors the game: base mode -> "+v" (+"%" for percent stats); increasedPercent/morePercent -> "+v%"
function formatItemStatValue(stat) {
  if (stat.type === 'IGNORE_SIZE') return '';
  const v = Number(stat.value) || 0;
  const sign = v > 0 ? '+' : '';
  if (!stat.mode || stat.mode === 'base') return `${sign}${v}${ITEM_PERCENT_STATS.has(stat.type) ? '%' : ''}`;
  return `${sign}${v}%${stat.mode === 'morePercent' ? ' (คูณ)' : ''}`;
}

// attributes may arrive as an array of {type, value} or a plain {TYPE: value} object
function getItemBaseStats(item) {
  const a = item?.attributes;
  if (Array.isArray(a)) return a.filter(s => s && s.value !== undefined);
  if (a && typeof a === 'object') return Object.entries(a).map(([type, value]) => ({ type, value }));
  return [];
}

function getItemRandomOptions(item) {
  return Array.isArray(item?.affixes) ? item.affixes.filter(s => s && s.value !== undefined) : [];
}

function renderStatChip(stat, kind, highlightTypes) {
  const isHit = Boolean(highlightTypes && highlightTypes.includes(stat.type));
  const cls = kind === 'base' ? 'base' : `opt ${stat.category === 'primary' ? 'primary' : 'secondary'}`;
  const tip = kind === 'base'
    ? 'ค่าพื้นฐานของไอเทม (คงที่)'
    : `ออฟชั่นสุ่ม${stat.category === 'primary' ? ' (หลัก)' : ' (รอง)'}`;
  return `<span class="stat-chip ${cls}${isHit ? ' hit' : ''}" title="${tip}"><span>${escapeHTML(getItemStatLabel(stat.type))}</span><b>${escapeHTML(formatItemStatValue(stat))}</b></span>`;
}

function renderItemStatGroups(item, highlightTypes) {
  if (!item) return '';
  const base = getItemBaseStats(item);
  const opts = getItemRandomOptions(item);
  const extras = [];
  if (Array.isArray(item.effects)) item.effects.forEach(ef => extras.push(`🌟 ${typeof ef === 'object' ? (ef.name || ef.type || '') : ef}`));
  if (Array.isArray(item.cards) && item.cards.length > 0) {
    extras.push(`🎴 การ์ด: ${item.cards.map(c => (typeof c === 'object' ? c.name : c) || 'Card').join(', ')}`);
  }
  if (base.length === 0 && opts.length === 0 && extras.length === 0) return '';
  return `
    <div class="item-stat-groups">
      ${base.length ? `<div class="item-stat-row"><span class="isr-label">พื้นฐาน</span><div class="isr-chips">${base.map(s => renderStatChip(s, 'base')).join('')}</div></div>` : ''}
      ${opts.length ? `<div class="item-stat-row"><span class="isr-label opt">ออฟชั่น</span><div class="isr-chips">${opts.map(s => renderStatChip(s, 'opt', highlightTypes)).join('')}</div></div>` : ''}
      ${extras.map(t => `<div class="item-stat-extra">${escapeHTML(t)}</div>`).join('')}
    </div>`;
}

function renderItemAffixesHtml(item) {
  return renderItemStatGroups(item);
}

function renderItemAffixSummary(item, highlightTypes) {
  return renderItemStatGroups(item, highlightTypes);
}

// ---------- Bag filter by random options (affixes only, base stats ignored) ----------
// Typed query such as "dex, matk>=5, melee dmg" — parsed by OptionQuery (inventory_market.js)
let gearOptFilter = { slotKey: null, text: '', mode: 'all' };

function rerenderGearScanner() {
  if (selectedSlotDef && currentCharData) renderGearScanner(selectedSlotDef, currentCharData);
}

function getGearOptQuery() {
  return window.OptionQuery ? window.OptionQuery.parse(gearOptFilter.text) : { terms: [], names: [] };
}

function getGearOptHighlight() {
  return getGearOptQuery().terms.map(t => t.type);
}

function setGearOptFilterMode(mode) {
  gearOptFilter.mode = mode === 'any' ? 'any' : 'all';
  rerenderGearScanner();
}

function clearGearOptFilter() {
  gearOptFilter.text = '';
  const input = document.querySelector('#scanner-opt-filter .sof-input');
  if (input) input.value = '';
  rerenderGearScanner();
}

// Clicking a suggestion appends it to the typed query
function appendGearOptToken(type) {
  const token = String(type).toLowerCase().replace(/_/g, ' ');
  const cur = gearOptFilter.text.trim().replace(/,\s*$/, '');
  gearOptFilter.text = cur ? `${cur}, ${token}` : token;
  const input = document.querySelector('#scanner-opt-filter .sof-input');
  if (input) { input.value = gearOptFilter.text; input.focus(); }
  rerenderGearScanner();
}

function applyGearOptFilter(candidates) {
  const q = getGearOptQuery();
  if (!window.OptionQuery || (q.terms.length === 0 && q.names.length === 0)) return candidates;
  return candidates
    .filter(item => window.OptionQuery.matches(item, q, gearOptFilter.mode))
    .map(item => ({ item, score: window.OptionQuery.score(item, q) }))
    .sort((a, b) => b.score - a.score)
    .map(x => x.item);
}

function renderGearOptFilterBar(candidates) {
  const el = document.getElementById('scanner-opt-filter');
  if (!el) return;
  const counts = new Map();
  candidates.forEach(item => {
    new Set(getItemRandomOptions(item).map(o => o.type)).forEach(t => counts.set(t, (counts.get(t) || 0) + 1));
  });
  if (counts.size === 0 && !gearOptFilter.text) {
    el.style.display = 'none';
    el.innerHTML = '';
    el.dataset.slotKey = '';
    return;
  }
  el.style.display = '';

  // Build the input once per slot so re-renders while typing never steal focus
  if (el.dataset.slotKey !== gearOptFilter.slotKey || !el.querySelector('.sof-input')) {
    el.dataset.slotKey = gearOptFilter.slotKey;
    el.innerHTML = `
      <div class="sof-head">
        <span class="sof-title" title="ออฟชั่นสุ่ม (Random Options / Affixes) คือค่าที่สุ่มตอนไอเทมดรอป ไม่รวมค่าพื้นฐานของไอเทม">🎛️ กรองตามออฟชั่นสุ่ม</span>
        <div class="sof-actions"><div class="sof-mode" data-role="mode" title="เงื่อนไขเมื่อพิมพ์หลายออฟชั่น"></div></div>
      </div>
      <div class="sof-input-row">
        <input type="text" class="sof-input" placeholder="พิมพ์ เช่น dex, matk, melee dmg>=5" autocomplete="off">
        <button type="button" class="sof-clear" onclick="clearGearOptFilter()">ล้าง</button>
      </div>
      <div class="sof-parsed" data-role="parsed"></div>
      <div class="sof-suggest" data-role="suggest"></div>`;
    const input = el.querySelector('.sof-input');
    input.value = gearOptFilter.text;
    let debounce = null;
    input.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => { gearOptFilter.text = input.value; rerenderGearScanner(); }, 150);
    });
  }

  el.querySelector('[data-role="mode"]').innerHTML = `
    <button type="button" class="${gearOptFilter.mode === 'all' ? 'active' : ''}" onclick="setGearOptFilterMode('all')">ครบทุกข้อ</button>
    <button type="button" class="${gearOptFilter.mode === 'any' ? 'active' : ''}" onclick="setGearOptFilterMode('any')">ข้อใดข้อหนึ่ง</button>`;

  const q = getGearOptQuery();
  el.querySelector('[data-role="parsed"]').innerHTML = [
    ...q.terms.map(t => `<span class="sof-token ok">✓ ${escapeHTML(window.OptionQuery.describe(t))}</span>`),
    ...q.names.map(n => `<span class="sof-token name">ชื่อ: ${escapeHTML(n)}</span>`)
  ].join('');

  const typed = new Set(q.terms.map(t => t.type));
  const sorted = [...counts.entries()]
    .filter(([type]) => !typed.has(type))
    .sort((a, b) => b[1] - a[1] || getItemStatLabel(a[0]).localeCompare(getItemStatLabel(b[0])));
  el.querySelector('[data-role="suggest"]').innerHTML = sorted.length
    ? `<span class="sof-suggest-lbl">มีในกระเป๋า:</span>${sorted.map(([type, n]) =>
        `<button type="button" class="sof-chip" data-type="${escapeHTML(type)}" onclick="appendGearOptToken(this.dataset.type)">${escapeHTML(getItemStatLabel(type))}<small>${n}</small></button>`
      ).join('')}`
    : '';
}

function isItemMatchingSlot(item, slotDef, classId) {
  if (!item || !slotDef) return false;
  const eq = item.equipType || '';
  const key = slotDef.key;
  
  if (key === 'main-hand') {
    return eq === 'Weapon' || item.type === 'Weapon' || (item.weaponType && item.weaponType !== 'none');
  }
  if (key === 'off-hand') {
    if (eq === 'Shield' || item.type === 'Shield') return true;
    if (classId === 'assassin' && (eq === 'Weapon' || item.type === 'Weapon')) return true;
    return false;
  }
  if (key === 'ammo') {
    return eq === 'Ammo' || item.type === 'Ammo' || item.ammoType != null;
  }
  if (key.startsWith('gem-')) {
    return eq === 'Gem' || item.type === 'Gem';
  }
  if (key === 'head-upper') {
    return eq === 'Helmet' || eq === 'head-upper';
  }
  if (key === 'head-middle') {
    return eq === 'HeadMid' || eq === 'head-middle';
  }
  if (key === 'head-lower') {
    return eq === 'HeadLow' || eq === 'head-lower';
  }
  if (key === 'armor') {
    return eq === 'Armor' || eq === 'armor';
  }
  if (key === 'gloves') {
    return eq === 'Glove' || eq === 'gloves';
  }
  if (key === 'garment') {
    return eq === 'Cape' || eq === 'Garment' || eq === 'garment';
  }
  if (key === 'legs') {
    return eq === 'Pants' || eq === 'legs';
  }
  if (key === 'boots') {
    return eq === 'Boot' || eq === 'Boots' || eq === 'boots';
  }
  if (key.startsWith('accessory-')) {
    return eq === 'Acc' || eq === 'Accessory' || eq === 'accessory';
  }
  if (slotDef.equipTypes && Array.isArray(slotDef.equipTypes)) {
    return slotDef.equipTypes.includes(eq);
  }
  return false;
}

function openCharacterModal(profileId, initialTab, initialMarketSubTab) {
  currentCharProfileId = profileId;
  selectedSlotDef = null;
  currentCharTab = initialTab || 'equip';
  
  const modal = document.getElementById('char-detail-modal');
  if (!modal) return;
  modal.style.display = 'flex';
  
  const nameEl = document.getElementById('char-modal-name');
  if (nameEl) nameEl.innerText = 'กำลังโหลดข้อมูลตัวละคร...';
  
  loadCharacterDetail(profileId, false, initialMarketSubTab);
  if (window.InvMarket) {
    window.InvMarket.open(profileId);  // bag panel + market window
    if (currentCharTab === 'market' && typeof window.InvMarket.openMarketTab === 'function') {
      window.InvMarket.openMarketTab(profileId, initialMarketSubTab || 'sell');
    }
  }
}

function closeCharacterModal() {
  const prevId = currentCharProfileId;
  const modal = document.getElementById('char-detail-modal');
  if (modal) modal.style.display = 'none';
  if (window.InvMarket) window.InvMarket.close();
  currentCharProfileId = null;
  currentCharData = null;
  selectedSlotDef = null;
  if (window.MarketOverview && typeof window.MarketOverview.onModalClosed === 'function') {
    window.MarketOverview.onModalClosed(prevId);
  }
}

async function loadCharacterDetail(profileId, keepSelectedSlot = true, initialMarketSubTab = null) {
  try {
    const res = await fetch(`/api/profiles/${encodeURIComponent(profileId)}/character`);
    const data = await res.json();
    if (!data.success) {
      if (currentCharTab === 'market') {
        const prof = (typeof currentProfiles !== 'undefined' && Array.isArray(currentProfiles)) ? currentProfiles.find(x => x.id === profileId) : null;
        const nameEl = document.getElementById('char-modal-name');
        if (nameEl) nameEl.innerText = prof ? `${prof.lastCharName || prof.name} (จอออฟไลน์ — แก้ไข Auto-Sell ได้)` : 'จอออฟไลน์';
        document.querySelectorAll('.char-tab-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.charTab === 'market');
        });
        const charBodyEl = document.querySelector('#char-detail-modal .char-modal-body');
        const marketViewEl = document.getElementById('char-market-view');
        if (charBodyEl) charBodyEl.style.display = 'none';
        if (marketViewEl) marketViewEl.style.display = 'flex';
        if (window.InvMarket && typeof window.InvMarket.openMarketTab === 'function') {
          window.InvMarket.openMarketTab(profileId, initialMarketSubTab || 'autosell');
        }
        return;
      }
      alert(`ไม่สามารถดึงข้อมูลตัวละครได้: ${data.error || 'บอทอาจจะยังไม่เชื่อมต่อหรืออยู่ในหน้าเลือกตัวละคร'}`);
      closeCharacterModal();
      return;
    }
    currentCharData = data;
    renderCharacterModal(data, initialMarketSubTab);
    if (keepSelectedSlot && selectedSlotDef) {
      selectCharSlot(selectedSlotDef);
    }
  } catch (err) {
    console.error('[CharModal] Fetch error:', err);
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อกับตัวละคร: ' + err.message);
  }
}

function selectCharSlotByKey(slotKey) {
  const allDefs = [
    ...CHAR_EQUIP_SLOTS_LEFT,
    ...CHAR_EQUIP_SLOTS_RIGHT,
    CHAR_AMMO_SLOT,
    ...CHAR_GEM_SLOTS,
    ...CHAR_COSTUME_SLOTS
  ];
  const def = allDefs.find(d => d.key === slotKey);
  if (def) selectCharSlot(def);
}

function selectCharSlot(slotDef) {
  selectedSlotDef = slotDef;
  
  document.querySelectorAll('.char-slot-btn, .char-ammo-btn').forEach(btn => {
    btn.classList.toggle('active-selected', btn.dataset.slotKey === slotDef.key);
  });
  
  const statsView = document.getElementById('char-stats-view');
  const scanView = document.getElementById('char-scanner-view');
  if (statsView) statsView.style.display = 'none';
  if (scanView) scanView.style.display = 'flex';
  
  if (currentCharData) {
    renderGearScanner(slotDef, currentCharData);
  }
}

// Game asset paths may come back relative (/art/icons/...); resolve them against the game site
// because the Manager runs on localhost.
function gameAssetUrl(url) {
  if (!url) return '';
  try { return new URL(url, 'https://www.aetheria-online.in.th').href; } catch (e) { return ''; }
}

function renderSlotColumn(containerId, slotDefs, equipment) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = slotDefs.map(def => {
    const it = equipment?.[def.key];
    const isSelected = selectedSlotDef && selectedSlotDef.key === def.key;
    const hasItem = Boolean(it && it.name);
    const displayName = hasItem ? formatItemDisplayName(it) : 'ว่าง';
    const rarityColor = hasItem ? getRarityColor(it.rarity) : '#64748b';
    
    return `
      <button type="button" class="char-slot-btn ${hasItem ? '' : 'empty'} ${isSelected ? 'active-selected' : ''}" data-slot-key="${def.key}" onclick="selectCharSlotByKey('${def.key}')" title="คลิกเพื่อจัดการช่อง: ${def.label}">
        <div class="slot-icon-box">
          ${it?.icon ? `<img src="${escapeHTML(gameAssetUrl(it.icon))}" class="slot-icon-img" alt="" onerror="this.parentElement.innerHTML='${def.icon}'">` : `<span class="slot-icon-ph">${def.icon}</span>`}
        </div>
        <div class="slot-meta">
          <span class="slot-label">${def.label}</span>
          <span class="slot-item-name" style="color: ${rarityColor};">${escapeHTML(displayName)}</span>
        </div>
      </button>
    `;
  }).join('');
}

function renderAmmoSlot(ammoItem) {
  const container = document.getElementById('char-ammo-slot');
  if (!container) return;
  const isSelected = selectedSlotDef && selectedSlotDef.key === 'ammo';
  const hasAmmo = Boolean(ammoItem && ammoItem.name);
  const ammoName = hasAmmo ? `${ammoItem.name} ${ammoItem.qty ? `x${ammoItem.qty.toLocaleString()}` : ''}` : 'ยังไม่ได้ใส่กระสุน';
  
  container.innerHTML = `
    <button type="button" class="char-ammo-btn ${isSelected ? 'active-selected' : ''}" data-slot-key="ammo" onclick="selectCharSlotByKey('ammo')" title="คลิกเพื่อเลือกกระสุน/ลูกธนู">
      <div class="slot-icon-box">
        ${ammoItem?.icon ? `<img src="${escapeHTML(gameAssetUrl(ammoItem.icon))}" class="slot-icon-img" alt="" onerror="this.parentElement.innerHTML='🏹'">` : `<span class="slot-icon-ph">🏹</span>`}
      </div>
      <div class="slot-meta" style="flex: 1; text-align: left;">
        <span class="slot-label">กระสุน / ลูกธนู</span>
        <span class="slot-item-name" style="color: ${hasAmmo ? '#38bdf8' : '#64748b'};">${escapeHTML(ammoName)}</span>
      </div>
    </button>
  `;
}

function renderStatAllocBar(data) {
  const container = document.getElementById('char-stats-alloc-bar');
  if (!container) return;
  const stats = ['STR', 'AGI', 'VIT', 'INT', 'DEX', 'LUK'];
  const curStats = data.stats || {};
  const bonus = data.bonusStats || {};
  const costs = data.statCosts || {};
  const pts = data.statusPoints || 0;

  container.innerHTML = stats.map(st => {
    const val = curStats[st] ?? 1;
    const bon = bonus[st] ?? 0;
    const cost = costs[st] ?? 2;
    const canAdd = pts >= cost;
    return `
      <div class="stat-alloc-box">
        <span class="stat-alloc-name">${st}</span>
        <span class="stat-alloc-val">${val} <span class="stat-alloc-bonus">(+${bon})</span></span>
        <button type="button" class="stat-plus-btn" ${canAdd ? '' : 'disabled style="opacity: 0.35; cursor: not-allowed;"'} onclick="handleStatUp('${st}', 1)" title="ใช้ ${cost} แต้มสถานะเพื่อเพิ่ม ${st}">+</button>
        <span style="font-size: 8.5px; color: #64748b;">${cost} pts</span>
      </div>
    `;
  }).join('');
}

function renderCombatStats(derived, data) {
  const d = derived || {};
  const offEl = document.getElementById('char-stats-offense');
  const defEl = document.getElementById('char-stats-defense');
  const othEl = document.getElementById('char-stats-other');
  if (!offEl || !defEl || !othEl) return;

  const row = (lbl, val) => `
    <div class="stat-row-item">
      <span class="stat-row-lbl">${lbl}</span>
      <span class="stat-row-val">${val}</span>
    </div>
  `;

  // Offense (matching Image 2)
  offEl.innerHTML = [
    row('ATK', d.atk ?? '--'),
    row('MATK', d.matk ?? '--'),
    row('HIT', d.hit ?? '--'),
    row('CRIT', d.crit !== undefined ? `${d.crit}%` : '--'),
    row('ดาเมจคริ', d.critDamagePercent !== undefined ? `${d.critDamagePercent}%` : '--'),
    row('ASPD', d.aspd ? `${d.aspd} (${((d.attackIntervalMs || 0)/1000).toFixed(2)}s)` : '--'),
    row('ตีปกติดูดเลือด', d.hpDrainAttackPercent !== undefined ? `${d.hpDrainAttackPercent}%` : '0%'),
    row('สกิลดูดเลือด', d.hpDrainSkillPercent !== undefined ? `${d.hpDrainSkillPercent}%` : '0%'),
    row('ตีปกติดูด SP', d.spDrainAttackPercent !== undefined ? `${d.spDrainAttackPercent}%` : '0%'),
    row('สกิลดูด SP', d.spDrainSkillPercent !== undefined ? `${d.spDrainSkillPercent}%` : '0%'),
    row('ร่ายเร็วขึ้น', d.castReductionPercent !== undefined ? `${d.castReductionPercent}%` : '0%'),
    row('ระยะโจมตี', d.attackRangeTiles !== undefined ? `${d.attackRangeTiles} ช่อง` : '--'),
    row('ธาตุโจมตี', d.attackElement || 'neutral')
  ].join('');

  // Defense (matching Image 2)
  defEl.innerHTML = [
    row('Max HP', (d.maxHp || data.hpMax || '--').toLocaleString()),
    row('Max SP', (d.maxSp || data.spMax || '--').toLocaleString()),
    row('DEF', d.def ?? '--'),
    row('MDEF', d.mdef ?? '--'),
    row('FLEE', d.flee ?? '--'),
    row('ลดดาเมจ', d.damageReductionPercent !== undefined ? `${d.damageReductionPercent}%` : '0%'),
    row('บล็อก', d.blockChance !== undefined ? `${d.blockChance}%` : '0%'),
    row('ฟื้น HP', d.hpRegen !== undefined ? `+${d.hpRegen}/${d.hpRegenSeconds || 6}s` : '--'),
    row('ฟื้น SP', d.spRegen !== undefined ? `+${d.spRegen}/${d.spRegenSeconds || 8}s` : '--')
  ].join('');

  // Other (matching Image 2)
  othEl.innerHTML = [
    row('ความเร็ว', d.moveSpeedPercent !== undefined ? `${d.moveSpeedPercent}%` : '100%'),
    row('ดับเบิ้ลแอทแทค', d.doubleAttackChance !== undefined ? `${d.doubleAttackChance}%` : '0%'),
    row('พลังฮีล', d.healPowerPercent !== undefined ? `+${d.healPowerPercent}%` : '+0%')
  ].join('');
}

function renderGearScanner(slotDef, data) {
  const iconEl = document.getElementById('scanner-slot-icon');
  const titleEl = document.getElementById('scanner-slot-title');
  const subEl = document.getElementById('scanner-slot-subtitle');
  if (iconEl) iconEl.innerText = slotDef.icon;
  if (titleEl) titleEl.innerText = `จัดการอุปกรณ์: ${slotDef.label}`;
  if (subEl) subEl.innerText = `ช่องสวมใส่: ${slotDef.key}`;

  // Current Equipped Item
  const equipped = data.equipment?.[slotDef.key];
  const eqBox = document.getElementById('scanner-equipped-box');
  if (eqBox) {
    if (equipped && equipped.name) {
      eqBox.innerHTML = `
        <div class="equipped-item-top">
          <img src="${escapeHTML(gameAssetUrl(equipped.icon))}" class="gear-cand-icon" alt="" onerror="this.style.opacity=0.3">
          <div style="flex: 1; overflow: hidden;">
            <div class="equipped-item-name" style="color: ${getRarityColor(equipped.rarity)};">${escapeHTML(formatItemDisplayName(equipped))}</div>
            <div style="font-size: 10px; color: #94a3b8;">Req Lv.${equipped.levelReq || 0} | นน. ${equipped.weight || 0} ${equipped.qty > 1 ? `| x${equipped.qty.toLocaleString()}` : ''}</div>
          </div>
          <button type="button" class="btn-unequip-slot" onclick="handleUnequip('${slotDef.key}')">❌ ถอด</button>
        </div>
        ${renderItemAffixesHtml(equipped)}
      `;
    } else {
      eqBox.innerHTML = `
        <div style="font-size: 11px; color: #94a3b8; text-align: center; padding: 12px; background: rgba(0,0,0,0.2); border-radius: 6px;">
          ยังไม่มีไอเทมสวมใส่ในช่องนี้
        </div>
      `;
    }
  }

  // Compatible Bag Items (optionally filtered by random options)
  const bagItems = data.bagItems || [];
  const candidates = bagItems.filter(item => isItemMatchingSlot(item, slotDef, data.classId));
  if (gearOptFilter.slotKey !== slotDef.key) {
    gearOptFilter = { slotKey: slotDef.key, text: '', mode: gearOptFilter.mode };
  }
  renderGearOptFilterBar(candidates);
  const shown = applyGearOptFilter(candidates);
  const countEl = document.getElementById('scanner-bag-count');
  if (countEl) countEl.innerText = gearOptFilter.text.trim() ? `${shown.length}/${candidates.length}` : candidates.length;

  const bagListEl = document.getElementById('scanner-bag-list');
  if (bagListEl) {
    if (candidates.length === 0) {
      bagListEl.innerHTML = `
        <div style="text-align: center; color: #64748b; font-size: 11px; padding: 24px; background: rgba(0,0,0,0.15); border-radius: 6px;">
          🎒 ไม่พบไอเทมในกระเป๋าที่สวมใส่ช่อง "${slotDef.label}" ได้
        </div>
      `;
    } else if (shown.length === 0) {
      bagListEl.innerHTML = `
        <div style="text-align: center; color: #64748b; font-size: 11px; padding: 24px; background: rgba(0,0,0,0.15); border-radius: 6px;">
          🔍 ไม่มีไอเทมที่มีออฟชั่นตามที่เลือก
        </div>
      `;
    } else {
      bagListEl.innerHTML = shown.map(item => {
        const displayName = formatItemDisplayName(item);
        const rarityCol = getRarityColor(item.rarity);
        const btnText = equipped ? '🔄 สลับใส่' : '⚡ สวมใส่';
        return `
          <div class="gear-cand-card">
            <div class="gear-cand-top">
              <img src="${escapeHTML(gameAssetUrl(item.icon))}" class="gear-cand-icon" alt="" onerror="this.style.opacity=0.3">
              <div class="gear-cand-info">
                <div class="gear-cand-name" style="color: ${rarityCol};">${escapeHTML(displayName)}</div>
                <div class="gear-cand-meta">Req Lv.${item.levelReq || 0} ${item.qty > 1 ? `| x${item.qty}` : ''} | ช่องกระเป๋า: ${item.slot}</div>
              </div>
              <button type="button" class="btn-equip-action" onclick="handleEquip(${item.slot}, '${slotDef.key}')">
                ${btnText}
              </button>
            </div>
            ${renderItemAffixSummary(item, getGearOptHighlight())}
          </div>
        `;
      }).join('');
    }
  }
}

function renderCharacterModal(data, subTab = null) {
  if (!data) return;
  
  // Header
  const faceImg = document.getElementById('char-modal-face');
  if (faceImg) {
    faceImg.src = data.faceAvatar || `https://www.aetheria-online.in.th/art/classes/${data.classId || 'hunter'}-face.webp`;
    faceImg.onerror = () => { faceImg.src = 'https://www.aetheria-online.in.th/art/classes/hunter-face.webp'; };
  }
  const baseBadge = document.getElementById('char-modal-base-badge');
  if (baseBadge) baseBadge.innerText = data.baseLevel || '--';

  const nameEl = document.getElementById('char-modal-name');
  if (nameEl) nameEl.innerText = data.charName || data.profileName || 'Character';

  const jobPill = document.getElementById('char-modal-job-pill');
  if (jobPill) jobPill.innerText = `${data.className || 'Novice'} (Base ${data.baseLevel || 1} / Job ${data.jobLevel || 1})`;

  const profPill = document.getElementById('char-modal-profile-pill');
  if (profPill) profPill.innerText = data.profileName || 'Profile';

  // Base & Job Exp
  const baseLvEl = document.getElementById('char-modal-baselv');
  if (baseLvEl) baseLvEl.innerText = data.baseLevel || 1;
  const baseExpPct = (data.baseExpNext && data.baseExpNext > 0) ? Math.min(100, (data.baseExp / data.baseExpNext) * 100).toFixed(1) : '0.0';
  const baseBar = document.getElementById('char-modal-base-bar');
  if (baseBar) baseBar.style.width = `${baseExpPct}%`;
  const basePctEl = document.getElementById('char-modal-base-pct');
  if (basePctEl) basePctEl.innerText = `${baseExpPct}%`;

  const jobLvEl = document.getElementById('char-modal-joblv');
  if (jobLvEl) jobLvEl.innerText = data.jobLevel || 1;
  const isJobMax = (data.jobLevel || 1) >= (data.jobMaxLevel || 50);
  const jobExpPct = isJobMax ? '100' : ((data.jobExpNext && data.jobExpNext > 0) ? Math.min(100, (data.jobExp / data.jobExpNext) * 100).toFixed(1) : '0.0');
  const jobBar = document.getElementById('char-modal-job-bar');
  if (jobBar) jobBar.style.width = isJobMax ? '100%' : `${jobExpPct}%`;
  const jobPctEl = document.getElementById('char-modal-job-pct');
  if (jobPctEl) jobPctEl.innerText = isJobMax ? 'MAX' : `${jobExpPct}%`;

  // HP / SP
  const hpCur = data.hp ?? 0;
  const hpMax = data.hpMax || hpCur || 1;
  const hpPct = Math.min(100, Math.round((hpCur / hpMax) * 100));
  const hpBarEl = document.getElementById('char-modal-hp-bar');
  if (hpBarEl) hpBarEl.style.width = `${hpPct}%`;
  const hpValEl = document.getElementById('char-modal-hp-val');
  if (hpValEl) hpValEl.innerText = `${hpCur.toLocaleString()} / ${hpMax.toLocaleString()}`;

  const spCur = data.sp ?? 0;
  const spMax = data.spMax || spCur || 1;
  const spPct = Math.min(100, Math.round((spCur / spMax) * 100));
  const spBarEl = document.getElementById('char-modal-sp-bar');
  if (spBarEl) spBarEl.style.width = `${spPct}%`;
  const spValEl = document.getElementById('char-modal-sp-val');
  if (spValEl) spValEl.innerText = `${spCur.toLocaleString()} / ${spMax.toLocaleString()}`;

  // ส่วนบุญ & Zeny
  const ptsVal = document.getElementById('char-modal-pts-val');
  if (ptsVal) ptsVal.innerText = (data.statusPoints || 0).toLocaleString();
  const zenyVal = document.getElementById('char-modal-zeny-val');
  if (zenyVal) zenyVal.innerText = `${(data.zeny || 0).toLocaleString()} z`;

  // Full Art
  const fullArt = document.getElementById('char-modal-full-art');
  if (fullArt) {
    fullArt.src = data.fullPortrait || `https://www.aetheria-online.in.th/art/classes/${data.classId || 'hunter'}.webp`;
    fullArt.onerror = () => { fullArt.src = 'https://www.aetheria-online.in.th/art/classes/hunter.webp'; };
  }

  // Subtabs state
  document.querySelectorAll('.char-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.charTab === currentCharTab);
  });
  const gemCount = Object.keys(data.equipment || {}).filter(k => k.startsWith('gem-') && data.equipment[k]).length;
  const gemCountEl = document.getElementById('char-modal-gem-count');
  if (gemCountEl) gemCountEl.innerText = `(${gemCount})`;

  const charBodyEl = document.querySelector('#char-detail-modal .char-modal-body');
  const marketViewEl = document.getElementById('char-market-view');
  const tabHintEl = document.getElementById('char-modal-tab-hint');
  if (currentCharTab === 'market') {
    if (charBodyEl) charBodyEl.style.display = 'none';
    if (marketViewEl) marketViewEl.style.display = 'flex';
    if (tabHintEl) tabHintEl.textContent = '🏪 ลงขายไอเทม ดูของที่ลงขายอยู่ รับของ/รับเงินค้าง และค้นหาซื้อของในตลาดกลาง';
    if (window.InvMarket && typeof window.InvMarket.openMarketTab === 'function') {
      window.InvMarket.openMarketTab(currentCharProfileId, subTab);
    }
    return;
  } else {
    if (charBodyEl) charBodyEl.style.display = '';
    if (marketViewEl) marketViewEl.style.display = 'none';
    if (tabHintEl) tabHintEl.textContent = '💡 คลิกที่ช่องอุปกรณ์เพื่อดูรายละเอียด ถอด หรือสแกนไอเทมในกระเป๋าเพื่อสลับใส่';
  }

  // Render Slots based on active subtab
  if (currentCharTab === 'gem') {
    renderSlotColumn('char-slots-left', CHAR_GEM_SLOTS.slice(0, 2), data.equipment);
    renderSlotColumn('char-slots-right', CHAR_GEM_SLOTS.slice(2, 4), data.equipment);
  } else if (currentCharTab === 'costume') {
    renderSlotColumn('char-slots-left', CHAR_COSTUME_SLOTS.slice(0, 2), data.equipment);
    renderSlotColumn('char-slots-right', CHAR_COSTUME_SLOTS.slice(2, 4), data.equipment);
  } else {
    // Normal equipment tab
    renderSlotColumn('char-slots-left', CHAR_EQUIP_SLOTS_LEFT, data.equipment);
    renderSlotColumn('char-slots-right', CHAR_EQUIP_SLOTS_RIGHT, data.equipment);
  }

  // Center Ammo & Stat Alloc
  renderAmmoSlot(data.equipment?.ammo);
  renderStatAllocBar(data);

  // Side Panel
  if (selectedSlotDef) {
    renderGearScanner(selectedSlotDef, data);
  } else {
    const statsView = document.getElementById('char-stats-view');
    const scanView = document.getElementById('char-scanner-view');
    if (scanView) scanView.style.display = 'none';
    if (statsView) statsView.style.display = 'flex';
    renderCombatStats(data.derived, data);
  }
}

async function handleEquip(bagSlot, targetSlotKey) {
  if (!currentCharProfileId) return;
  try {
    const res = await fetch(`/api/profiles/${encodeURIComponent(currentCharProfileId)}/equip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bagSlot, targetSlot: targetSlotKey })
    });
    const result = await res.json();
    if (!result.success) {
      alert(`ไม่สามารถสวมใส่อุปกรณ์ได้: ${result.error || 'Server error'}`);
      return;
    }
    setTimeout(() => {
      loadCharacterDetail(currentCharProfileId, true);
    }, 300);
  } catch (err) {
    console.error('[CharModal] Equip error:', err);
    alert('เกิดข้อผิดพลาดในการสวมใส่อุปกรณ์: ' + err.message);
  }
}

async function handleUnequip(slotKey) {
  if (!currentCharProfileId) return;
  try {
    const res = await fetch(`/api/profiles/${encodeURIComponent(currentCharProfileId)}/unequip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot: slotKey })
    });
    const result = await res.json();
    if (!result.success) {
      alert(`ไม่สามารถถอดอุปกรณ์ได้: ${result.error || 'Server error'}`);
      return;
    }
    setTimeout(() => {
      loadCharacterDetail(currentCharProfileId, true);
    }, 300);
  } catch (err) {
    console.error('[CharModal] Unequip error:', err);
    alert('เกิดข้อผิดพลาดในการถอดอุปกรณ์: ' + err.message);
  }
}

async function handleStatUp(statKey, count = 1) {
  if (!currentCharProfileId) return;
  try {
    const res = await fetch(`/api/profiles/${encodeURIComponent(currentCharProfileId)}/stat-up`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stat: statKey, count })
    });
    const result = await res.json();
    if (!result.success) {
      alert(`ไม่สามารถอัปสเตตัสได้: ${result.error || 'Server error'}`);
      return;
    }
    setTimeout(() => {
      loadCharacterDetail(currentCharProfileId, false);
    }, 250);
  } catch (err) {
    console.error('[CharModal] Stat-up error:', err);
    alert('เกิดข้อผิดพลาดในการอัปค่าสถานะ: ' + err.message);
  }
}

function initCharacterModalEvents() {
  const modal = document.getElementById('char-detail-modal');
  if (!modal) return;
  
  const closeBtn = document.getElementById('char-modal-close');
  if (closeBtn) closeBtn.onclick = closeCharacterModal;
  
  modal.onclick = (e) => {
    if (e.target === modal) closeCharacterModal();
  };
  
  const btnCloseScanner = document.getElementById('btn-close-scanner');
  if (btnCloseScanner) {
    btnCloseScanner.onclick = () => {
      selectedSlotDef = null;
      document.querySelectorAll('.char-slot-btn, .char-ammo-btn').forEach(btn => btn.classList.remove('active-selected'));
      const scanView = document.getElementById('char-scanner-view');
      const statsView = document.getElementById('char-stats-view');
      if (scanView) scanView.style.display = 'none';
      if (statsView) statsView.style.display = 'flex';
    };
  }

  // Subtabs switching
  const switchCharModalTab = (tabName, subTab) => {
    currentCharTab = tabName || 'equip';
    selectedSlotDef = null;
    const scanView = document.getElementById('char-scanner-view');
    const statsView = document.getElementById('char-stats-view');
    if (scanView) scanView.style.display = 'none';
    if (statsView) statsView.style.display = 'flex';
    if (currentCharData) {
      renderCharacterModal(currentCharData);
      if (currentCharTab === 'market' && subTab && window.InvMarket && typeof window.InvMarket.openMarketTab === 'function') window.InvMarket.openMarketTab(currentCharProfileId, subTab);
    } else {
      document.querySelectorAll('.char-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.charTab === currentCharTab);
      });
      const charBodyEl = document.querySelector('#char-detail-modal .char-modal-body');
      const marketViewEl = document.getElementById('char-market-view');
      if (currentCharTab === 'market') {
        if (charBodyEl) charBodyEl.style.display = 'none';
        if (marketViewEl) marketViewEl.style.display = 'flex';
        if (window.InvMarket && typeof window.InvMarket.openMarketTab === 'function') {
          window.InvMarket.openMarketTab(currentCharProfileId);
        }
      } else {
        if (charBodyEl) charBodyEl.style.display = '';
        if (marketViewEl) marketViewEl.style.display = 'none';
      }
    }
  };
  window.switchCharModalTab = switchCharModalTab;
  document.querySelectorAll('.char-tab-btn').forEach(btn => {
    btn.onclick = () => switchCharModalTab(btn.dataset.charTab);
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.style.display !== 'none') {
      closeCharacterModal();
    }
  });
}


