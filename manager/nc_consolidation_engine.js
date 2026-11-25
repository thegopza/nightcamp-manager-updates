// manager/nc_consolidation_engine.js — 100% Native Nightcamp Coin & Item Consolidation Engine
// Flow:
//   Step 1: Pause bots + Claim Market Mail (nc_mail_claim_all) + Warp to camp + Open Shared Vault
//   Step 2: Calculate exact transferable coins (freeGold + vaultCoins) + Withdraw shortfall & selected items from Vault
//   Step 3: Lock Receiver's camp CH (zero unnecessary CH switch unless another IP-group task uses it)
//   Step 4: Move Senders on different CHs to Receiver's CH (handles 5-min server cooldown gracefully)
//   Step 5: Sequential P2P xtrade (Receiver listens + Sender walks close, offers coins & items, both ok -> done) + Auto-Resume Bots!

'use strict';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function unpackEvalResult(raw) {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'no-response' };
  if (raw.result && typeof raw.result === 'object') return raw.result;
  if (raw.error || raw.evalError) return { ok: false, error: String(raw.error || raw.evalError) };
  return raw;
}

async function runNightcampConsolidationWorkflow(ctx) {
  const {
    taskId,
    task,
    receiverProfile,
    senderProfiles,
    receiverIpKey,
    keepZeny,
    roundHundredK,
    tradeItemsEnabled,
    tradeItemsList,
    calcSenderTransferZeny,
    evalProfilePort,
    isTaskAborted,
    setTaskStep,
    markSenderCompleted,
    logTask,
    consolidationState,
    activeConsolidationChannels,
    ipGroupBadgeText
  } = ctx;

  let groupTransferredZeny = 0;
  let groupTransferredItems = 0;
  let receiverCharName = receiverProfile.lastCharName || receiverProfile.name;
  const finishedProfileIds = new Set();

  const safeFinishProfile = async (prof, opts = {}) => {
    if (!prof || !prof.debugPort || finishedProfileIds.has(prof.id)) return;
    finishedProfileIds.add(prof.id);
    try {
      await evalProfilePort(
        prof.debugPort,
        `window.__ncConsolidationFinish ? window.__ncConsolidationFinish(${JSON.stringify(opts)}) : (() => { window.__isConsolidating = false; window.__consolidationReceiverMode = false; if (${opts.resumeBot ? 'true' : 'false'} && !window.__isBotRunning && typeof window.startMasterBot === 'function') window.startMasterBot(); return { ok: true }; })()`,
        10000
      );
    } catch (_) {}
  };

  try {
    // -------------------------------------------------------------
    // STEP 1: หยุดบอท, รับเงินจากตลาดกลาง, วาร์ปกลับค่าย & เปิดคลังร่วม
    // -------------------------------------------------------------
    setTaskStep(1, `${ipGroupBadgeText ? ipGroupBadgeText + ' · ' : ''}หยุดบอท, รับจดหมายตลาด และวาร์ปกลับค่ายหน้าลุงโกโก้...`);
    const meetX = 1616;
    const meetY = 2627;

    const allInvolved = [receiverProfile, ...senderProfiles];
    const prepResults = new Map();

    await Promise.all(allInvolved.map(async (prof) => {
      const isRec = prof.id === receiverProfile.id;
      try {
        const raw = await evalProfilePort(
          prof.debugPort,
          `window.__ncConsolidationPrepare ? window.__ncConsolidationPrepare(${JSON.stringify({ isReceiver: isRec, claimMail: true, meetX, meetY, warpTimeoutMs: 36000 })}) : { ok: false, error: 'bot-too-old-reload-required' }`,
          44000
        );
        prepResults.set(prof.id, unpackEvalResult(raw));
      } catch (e) {
        prepResults.set(prof.id, { ok: false, error: String(e?.message || e) });
      }
    }));

    if (isTaskAborted()) throw new Error('ผู้ใช้สั่งยกเลิกกระบวนการรวมเงิน');

    const recPrep = prepResults.get(receiverProfile.id);
    if (!recPrep || !recPrep.ok) {
      throw new Error(`ตัวรับเงิน (${receiverProfile.name}) เตรียมความพร้อมไม่สำเร็จ: ${recPrep?.error || 'unknown'}`);
    }
    receiverCharName = recPrep.name || receiverCharName;
    task.receiverName = receiverCharName;
    if (!recPrep.hasPremium) {
      throw new Error(`ตัวรับเงิน (${receiverCharName}) ไม่มีสถานะ 👑 Premium`);
    }
    if ((recPrep.lv || 1) < (recPrep.tradeLevel || 20)) {
      throw new Error(`ตัวรับเงิน (${receiverCharName}) เลเวล ${recPrep.lv} ต่ำกว่าเกณฑ์เทรด Lv.${recPrep.tradeLevel || 20}`);
    }
    if (recPrep.claimedDelta > 0) {
      logTask(`🛒 ตัวรับ ${receiverCharName} รับเงินจากตลาดกลางเพิ่ม +${recPrep.claimedDelta.toLocaleString()} g`, 'success');
    }
    logTask(`🏕️ ตัวรับ ${receiverCharName} พร้อมที่ค่ายกลางป่า (CH ${recPrep.channel || '?'}) · ติดตัว ${(recPrep.freeGold || 0).toLocaleString()}g + คลังร่วม ${(recPrep.vaultCoins || 0).toLocaleString()}g`, 'info');

    // -------------------------------------------------------------
    // STEP 2: คำนวณยอดโอนจริง (ติดตัว + คลังร่วม) & เบิกจากคลังร่วม
    // -------------------------------------------------------------
    setTaskStep(2, `${ipGroupBadgeText ? ipGroupBadgeText + ' · ' : ''}เบิกเงินจากคลังร่วมไอดีและคำนวณยอดโอนแต่ละจอ...`);

    const readySenders = [];
    for (const sp of senderProfiles) {
      if (isTaskAborted()) throw new Error('ผู้ใช้สั่งยกเลิกกระบวนการรวมเงิน');
      const pr = prepResults.get(sp.id);
      if (!pr || !pr.ok) {
        logTask(`⚠️ ข้ามจอ ${sp.name}: เตรียมความพร้อมไม่สำเร็จ (${pr?.error || 'offline'})`, 'warning');
        await safeFinishProfile(sp, { resumeBot: true });
        continue;
      }
      const sName = pr.name || sp.lastCharName || sp.name;
      if (!pr.hasPremium) {
        logTask(`🔒 ข้าม ${sName}: ไม่มีสถานะ 👑 Premium`, 'warning');
        await safeFinishProfile(sp, { resumeBot: true });
        continue;
      }
      if ((pr.lv || 1) < (pr.tradeLevel || 20)) {
        logTask(`🔒 ข้าม ${sName}: เลเวล ${pr.lv} ต่ำกว่าเกณฑ์เทรด Lv.${pr.tradeLevel || 20}`, 'warning');
        await safeFinishProfile(sp, { resumeBot: true });
        continue;
      }
      if (pr.claimedDelta > 0) {
        logTask(`🛒 ${sName} รับเงินจากตลาดกลางเพิ่ม +${pr.claimedDelta.toLocaleString()} g`, 'success');
      }

      const totalAvail = Math.max(0, Number(pr.totalCoins ?? ((pr.freeGold || 0) + (pr.vaultCoins || 0))));
      const transferCoins = calcSenderTransferZeny(totalAvail);

      if (transferCoins <= 0 && !tradeItemsEnabled) {
        logTask(`⏭️ ข้าม ${sName}: ยอดรวมพร้อมโอน ${totalAvail.toLocaleString()}g (หลังหักเหลือติดตัว ${Number(keepZeny || 0).toLocaleString()}g${roundHundredK ? ' / ตัดเศษแสน' : ''}) = 0g`, 'info');
        await safeFinishProfile(sp, { resumeBot: true });
        continue;
      }

      // Withdraw exact coins & matching items from Shared Vault onto hand
      let wRes = null;
      try {
        const rawW = await evalProfilePort(
          sp.debugPort,
          `window.__ncConsolidationWithdrawForTrade ? window.__ncConsolidationWithdrawForTrade(${transferCoins}, ${Number(keepZeny) || 0}, ${JSON.stringify(tradeItemsEnabled ? tradeItemsList : [])}) : { ok: false, error: 'no-withdraw-helper' }`,
          24000
        );
        wRes = unpackEvalResult(rawW);
      } catch (e) {
        wRes = { ok: false, error: String(e?.message || e) };
      }

      if (!wRes || !wRes.ok) {
        logTask(`⚠️ ข้าม ${sName}: เบิกคลังไม่สำเร็จ (${wRes?.error || 'unknown'})`, 'warning');
        await safeFinishProfile(sp, { resumeBot: true });
        continue;
      }

      const finalTransferCoins = Math.min(transferCoins, Math.max(0, Number(wRes.freeGold) || 0));
      if (wRes.withdrawnCoins > 0 || wRes.withdrawnItems > 0) {
        logTask(`🏦 ${sName} เบิกจากคลังร่วม +${(wRes.withdrawnCoins || 0).toLocaleString()}g${wRes.withdrawnItems ? ` + ${wRes.withdrawnItems} ชิ้น` : ''} (พร้อมโอน ${finalTransferCoins.toLocaleString()}g)`, 'info');
      }

      if (finalTransferCoins <= 0 && !tradeItemsEnabled) {
        logTask(`⏭️ ข้าม ${sName}: เงินไม่ผูกตัวพร้อมโอน 0g`, 'info');
        await safeFinishProfile(sp, { resumeBot: true });
        continue;
      }

      readySenders.push({
        profile: sp,
        charName: sName,
        channel: pr.channel,
        transferCoins: finalTransferCoins
      });
    }

    if (readySenders.length === 0) {
      logTask(`ℹ️ ไม่มีจอผู้โอนที่มียอดพร้อมโอนในรอบนี้ — กำลังเริ่มบอทกลับฟาร์ม`, 'info');
      await safeFinishProfile(receiverProfile, { depositToVault: false, resumeBot: true });
      return { ok: true, taskId, ip: receiverIpKey, receiverId: receiverProfile.id, receiverName: receiverCharName, groupTransferredZeny: 0, groupTransferredItems: 0 };
    }

    // -------------------------------------------------------------
    // STEP 3: ตัวหลักตั้งจุดนัดพบ (CH) — ใช้ CH เดิมของตัวหลักเพื่อลดโอกาสติดคูลดาวน์ 5 นาที
    // -------------------------------------------------------------
    setTaskStep(3, `${ipGroupBadgeText ? ipGroupBadgeText + ' · ' : ''}ตั้งจุดนัดพบตัวรับ ${receiverCharName} ที่ค่ายกลางป่า...`);
    let targetCh = Number(recPrep.channel) || 1;
    if (activeConsolidationChannels.has(targetCh) && activeConsolidationChannels.get(targetCh) !== taskId) {
      // Another parallel IP group is already using this CH -> pick a free CH
      for (let c = 1; c <= 40; c++) {
        if (!activeConsolidationChannels.has(c)) {
          targetCh = c;
          break;
        }
      }
      logTask(`🔄 CH ${recPrep.channel} ถูกใช้อยู่โดยวง IP อื่น — ย้ายตัวรับ ${receiverCharName} ไป CH ${targetCh}...`, 'info');
      const mvRec = await evalProfilePort(
        receiverProfile.debugPort,
        `window.__ncConsolidationMoveChannel ? window.__ncConsolidationMoveChannel(${targetCh}, 28000) : { ok: false, error: 'no-ch-helper' }`,
        32000
      );
      const mvData = unpackEvalResult(mvRec);
      if (!mvData || !mvData.ok) {
        throw new Error(`ย้ายตัวรับ ${receiverCharName} ไป CH ${targetCh} ไม่สำเร็จ: ${mvData?.error || 'unknown'}`);
      }
      targetCh = Number(mvData.channel) || targetCh;
    }
    activeConsolidationChannels.set(targetCh, taskId);
    task.targetChannel = targetCh;
    logTask(`👑 ตัวรับ ${receiverCharName} ประจำจุดเทรดที่ค่ายกลางป่า CH ${targetCh}`, 'success');

    // -------------------------------------------------------------
    // STEP 4: จอรองย้าย CH ตามตัวหลัก (เฉพาะจอที่อยู่คนละ CH)
    // -------------------------------------------------------------
    setTaskStep(4, `${ipGroupBadgeText ? ipGroupBadgeText + ' · ' : ''}ย้ายจอผู้โอนมาค่ายกลางป่า CH ${targetCh} ตามตัวรับ...`);
    const chReadySenders = [];
    for (const s of readySenders) {
      if (isTaskAborted()) throw new Error('ผู้ใช้สั่งยกเลิกกระบวนการรวมเงิน');
      if (Number(s.channel) === targetCh) {
        logTask(`✅ ${s.charName} อยู่ CH ${targetCh} เดียวกับตัวรับอยู่แล้ว (พร้อมเทรดทันที)`, 'info');
        chReadySenders.push(s);
        continue;
      }
      logTask(`📡 กำลังย้าย ${s.charName} จาก CH ${s.channel || '?'} ➜ CH ${targetCh}...`, 'info');
      let mvRes = null;
      try {
        const rawMv = await evalProfilePort(
          s.profile.debugPort,
          `window.__ncConsolidationMoveChannel ? window.__ncConsolidationMoveChannel(${targetCh}, 28000) : { ok: false, error: 'no-ch-helper' }`,
          34000
        );
        mvRes = unpackEvalResult(rawMv);
      } catch (e) {
        mvRes = { ok: false, error: String(e?.message || e) };
      }
      if (!mvRes || !mvRes.ok) {
        logTask(`⚠️ ข้าม ${s.charName} รอบนี้: ย้ายมา CH ${targetCh} ไม่สำเร็จ (${mvRes?.error || 'unknown'}) — เริ่มบอทกลับฟาร์มให้แล้ว`, 'warning');
        await safeFinishProfile(s.profile, { resumeBot: true });
        continue;
      }
      logTask(`✅ ${s.charName} ย้ายมา CH ${targetCh} สำเร็จ!`, 'success');
      chReadySenders.push(s);
      await sleep(350);
    }

    // -------------------------------------------------------------
    // STEP 5: ทยอยเทรดรวมเงิน (xtrade) ทีละจอ & ส่งจอนั้นกลับฟาร์มทันที
    // -------------------------------------------------------------
    setTaskStep(5, `${ipGroupBadgeText ? ipGroupBadgeText + ' · ' : ''}เริ่มทยอยเทรดรวมเงินเข้า ${receiverCharName} (${chReadySenders.length} จอ)...`);
    for (let idx = 0; idx < chReadySenders.length; idx++) {
      if (isTaskAborted()) throw new Error('ผู้ใช้สั่งยกเลิกกระบวนการรวมเงิน');
      const s = chReadySenders[idx];
      task.currentSender = s.profile.name;
      setTaskStep(5, `${ipGroupBadgeText ? ipGroupBadgeText + ' · ' : ''}กำลังเทรด [${idx + 1}/${chReadySenders.length}] ${s.charName} ➜ ${receiverCharName} (${s.transferCoins.toLocaleString()} g)...`);

      logTask(`🤝 เริ่มเทรด [${idx + 1}/${chReadySenders.length}] ${s.charName} ➜ ${receiverCharName} (ยอด ${s.transferCoins.toLocaleString()} g${tradeItemsEnabled ? ' + ไอเทมที่เลือก' : ''})`, 'info');

      // Start Receiver listener FIRST, then Sender ask 450ms later (eliminates race conditions!)
      const recPromise = evalProfilePort(
        receiverProfile.debugPort,
        `window.__ncConsolidationTradeReceive ? window.__ncConsolidationTradeReceive(${JSON.stringify(s.charName)}, 28000) : { ok: false, error: 'no-recv-helper' }`,
        34000
      ).catch(e => ({ ok: false, error: String(e?.message || e) }));

      await sleep(450);

      const sendPromise = evalProfilePort(
        s.profile.debugPort,
        `window.__ncConsolidationTradeSend ? window.__ncConsolidationTradeSend(${JSON.stringify(receiverCharName)}, ${s.transferCoins}, ${JSON.stringify(tradeItemsEnabled ? tradeItemsList : [])}) : { ok: false, error: 'no-send-helper' }`,
        34000
      ).catch(e => ({ ok: false, error: String(e?.message || e) }));

      const [rawRec, rawSend] = await Promise.all([recPromise, sendPromise]);
      const recRes = unpackEvalResult(rawRec);
      const sendRes = unpackEvalResult(rawSend);

      if (sendRes.skipped) {
        logTask(`⏭️ ${s.charName}: ไม่มีเงินหรือไอเทมพร้อมโอน`, 'info');
        markSenderCompleted(s.profile.id);
      } else if (sendRes.ok && recRes.ok) {
        const movedCoins = Number(recRes.receivedCoins || sendRes.tradedCoins || s.transferCoins || 0);
        const movedItems = Number(recRes.receivedItemsCount || sendRes.tradedItemsCount || 0);
        groupTransferredZeny += movedCoins;
        groupTransferredItems += movedItems;
        task.transferredZeny = groupTransferredZeny;
        task.transferredItems = groupTransferredItems;
        consolidationState.totalTransferredZeny += movedCoins;
        consolidationState.totalTransferredItems += movedItems;
        markSenderCompleted(s.profile.id);
        logTask(`✅ เทรดสำเร็จ! ${s.charName} ➜ ${receiverCharName}: +${movedCoins.toLocaleString()} g${movedItems > 0 ? ` + ${movedItems} ชิ้น` : ''}`, 'success');
      } else {
        logTask(`❌ เทรดไม่สำเร็จ (${s.charName} ➜ ${receiverCharName}): ผู้ส่ง=${sendRes.error || (sendRes.ok ? 'ok' : 'fail')}, ผู้รับ=${recRes.error || (recRes.ok ? 'ok' : 'fail')}`, 'error');
      }

      // Immediately resume this sender back to its farm map while the next sender trades!
      await safeFinishProfile(s.profile, { resumeBot: true });
      logTask(`🚀 ส่ง ${s.charName} กลับไปฟาร์มต่อเรียบร้อย`, 'info');
      await sleep(400);
    }

    task.currentSender = null;

    // Finish Receiver: safely deposit excess coins into Shared Vault (keep 2,000g on hand) & resume bot
    const recFinRaw = await evalProfilePort(
      receiverProfile.debugPort,
      `window.__ncConsolidationFinish ? window.__ncConsolidationFinish({ depositToVault: true, keepOnHand: 2000, resumeBot: true }) : { ok: true }`,
      22000
    ).catch(() => null);
    finishedProfileIds.add(receiverProfile.id);
    const recFin = unpackEvalResult(recFinRaw);
    const depMsg = recFin.depositedCoins > 0 ? ` · ฝากเข้าคลังร่วม +${recFin.depositedCoins.toLocaleString()} g` : '';

    logTask(`🎉 รวมเงินเสร็จสมบูรณ์! ยอดเข้า ${receiverCharName} รวมทั้งหมด ${groupTransferredZeny.toLocaleString()} g${groupTransferredItems > 0 ? ` + ${groupTransferredItems} ชิ้น` : ''}${depMsg} และเริ่มบอทกลับฟาร์มครบทุกจอแล้ว!`, 'success');

    return {
      ok: true,
      taskId,
      ip: receiverIpKey,
      receiverId: receiverProfile.id,
      receiverName: receiverCharName,
      groupTransferredZeny,
      groupTransferredItems
    };
  } catch (err) {
    // Ensure ALL unfinished screens cleanly exit consolidation mode & resume bots
    for (const p of [receiverProfile, ...senderProfiles]) {
      await safeFinishProfile(p, { depositToVault: false, resumeBot: true });
    }
    throw err;
  }
}

module.exports = { runNightcampConsolidationWorkflow };
