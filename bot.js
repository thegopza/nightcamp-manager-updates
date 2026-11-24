// ==UserScript==
// @name         PmheeNC Nightcamp Control Hub
// @namespace    https://play.nightcamp.app/
// @version      2.0.8
// @description  Smart Auto-Quest, Upgrade BOT AI, Smart Gear, Auto-Respawn, Auto-Register, Auto-Party, Central Market Auto-Sell & Buy/Sell Hub 24/7
// @match        https://play.nightcamp.app/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const NIGHTCAMP_BOT_VERSION = '2.0.8';
  const PELICAN_BOT_VERSION = NIGHTCAMP_BOT_VERSION;
  try {
    if (window.localStorage && !window.localStorage.getItem('nightcamp.lang')) {
      window.localStorage.setItem('nightcamp.lang', 'th');
    }
  } catch (_) {}

  // Allow hot-upgrading from older versions (< 1.8.0) or forced hot reload
  if (window.__nightcampBotVersion === NIGHTCAMP_BOT_VERSION && !window.__forceNightcampHotReload && document.getElementById('nightcamp-hud')) {
    return;
  }
  window.__forceNightcampHotReload = false;
  if (window.__ncAutoLoginInterval) {
    try { clearInterval(window.__ncAutoLoginInterval); } catch (_) {}
    window.__ncAutoLoginInterval = null;
  }
  if (window.__ncMasterBotInterval) {
    try { clearInterval(window.__ncMasterBotInterval); } catch (_) {}
    window.__ncMasterBotInterval = null;
  }
  if (window.__ncPerfHooksInterval) {
    try { clearInterval(window.__ncPerfHooksInterval); } catch (_) {}
    window.__ncPerfHooksInterval = null;
  }
  if (window.__ncTrainerFastInterval) {
    try { clearInterval(window.__ncTrainerFastInterval); } catch (_) {}
    window.__ncTrainerFastInterval = null;
  }
  const oldHud = document.getElementById('nightcamp-hud');
  if (oldHud) {
    try { oldHud.remove(); } catch (_) {}
  }
  const oldAiCss = document.getElementById('pmhee-upgrade-ai-css');
  if (oldAiCss) {
    try { oldAiCss.remove(); } catch (_) {}
  }

  window.__nightcampBotVersion = NIGHTCAMP_BOT_VERSION;
  window.__pelicanBotVersion = NIGHTCAMP_BOT_VERSION;
  window.__isBotRunning = Boolean(window.__isBotRunning || localStorage.getItem('pelican_bot_running') === 'true');
  window.__lowPowerMode = Boolean(window.__lowPowerMode);
  window.__nightcampSockets = window.__nightcampSockets || [];
  window.__packetLogs = window.__packetLogs || [];
  window.__ncLastFailedAuthKey = '';
  window.__ncAuthStatusText = window.__ncAuthStatusText || '';
  window.__planActiveTask = window.__planActiveTask || '';

  // ============================================================================
  // 1. DEFAULT S-TIER NIGHTCAMP PLAN: PRIEST -> BISHOP -> STAR SAINT (0 POTION)
  // ============================================================================
  const DEFAULT_NC_WOLF_PLAN = {
    id: 'plan_nc_priest_bishop_1_50',
    name: '✨ [แนะนำอันดับ 1] พระ ➔ บิชอป ➔ นักบุญแสงดาว (สายเวทแสงอมตะ ฮีล+ระเบิดรอบตัว+บาเรีย ไม่เปลืองยา Lv.1–80+)',
    description: 'สายฟาร์มโซโล่ที่เก่งและถึกที่สุดใน Season 2: ฮีลตัวเอง+ระเบิดแสงรอบตัว 340% MATK (0s CD) + บาเรียดูดซับดาเมจ + บัฟเร่งมานา 2 เท่า + แสงศักดิ์สิทธิ์แรง x2 กับมอนสุสาน/ความมืด ไม่ต้องซื้อยาแดง',
    autoQuestEnabled: true,
    autoJobChange: true,
    autoStatSkillEnabled: true,
    class1Target: 'priest',
    class1JobLevel: 10,
    class2Target: 'bishop',
    class2JobLevel: 50,
    class3Target: 'starsaint',
    statBuild: {
      queue: [
        { stat: 'INT', to: 30 },
        { stat: 'DEX', to: 24 },
        { stat: 'VIT', to: 24 },
        { stat: 'INT', to: 45 },
        { stat: 'DEX', to: 36 },
        { stat: 'VIT', to: 36 },
        { stat: 'INT', to: 60 },
        { stat: 'DEX', to: 48 },
        { stat: 'VIT', to: 48 },
        { stat: 'INT', to: 80 },
        { stat: 'DEX', to: 60 },
        { stat: 'VIT', to: 60 }
      ],
      targets: { STR: 1, AGI: 1, VIT: 60, INT: 80, DEX: 60, LUK: 1 },
      priorityOrder: ['INT', 'VIT', 'DEX', 'LUK', 'AGI', 'STR']
    },
    skillBuild: {
      skillPointQueue: [
        // Traveler (9 pts)
        'mastery', 'mastery', 'mastery', 'mastery', 'mastery',
        'body', 'body', 'body', 'body',
        // Class 1 Priest (49 pts)
        'holylight', 'holylight', 'holylight', 'holylight', 'holylight', 'holylight', 'holylight', 'holylight', 'holylight',
        'pr_heal', 'pr_heal', 'pr_heal', 'pr_heal',
        'blessing', 'blessing', 'blessing', 'blessing',
        'pr_agi', 'pr_agi', 'pr_agi', 'pr_agi', 'pr_agi',
        'pr_demonbane', 'pr_demonbane', 'pr_demonbane', 'pr_demonbane',
        'magnus', 'magnus', 'magnus', 'magnus', 'magnus',
        'pr_protect', 'pr_protect', 'pr_protect', 'pr_protect', 'pr_protect',
        'pr_angelus', 'pr_angelus', 'pr_angelus',
        'pr_heal', 'pr_heal', 'pr_heal', 'pr_heal', 'pr_heal',
        'blessing', 'blessing', 'blessing', 'blessing', 'blessing',
        // Class 2 Bishop (49 pts)
        'bi_heal', 'bi_heal', 'bi_heal', 'bi_heal', 'bi_heal', 'bi_heal', 'bi_heal', 'bi_heal', 'bi_heal',
        'bi_barrier', 'bi_barrier', 'bi_barrier', 'bi_barrier', 'bi_barrier',
        'bi_meditatio', 'bi_meditatio', 'bi_meditatio', 'bi_meditatio', 'bi_meditatio',
        'bi_magnificat', 'bi_magnificat', 'bi_magnificat', 'bi_magnificat', 'bi_magnificat',
        'bi_sanctuary', 'bi_sanctuary', 'bi_sanctuary', 'bi_sanctuary', 'bi_sanctuary',
        'bi_turnundead', 'bi_turnundead', 'bi_turnundead', 'bi_turnundead', 'bi_turnundead',
        'bi_turnundead', 'bi_turnundead', 'bi_turnundead', 'bi_turnundead', 'bi_turnundead',
        'bi_miracle', 'bi_miracle', 'bi_miracle', 'bi_miracle', 'bi_miracle',
        'bi_barrier', 'bi_barrier', 'bi_barrier', 'bi_barrier', 'bi_barrier',
        // Class 3 Star Saint (49 pts)
        'ss_faith', 'ss_faith', 'ss_faith', 'ss_faith', 'ss_faith', 'ss_faith', 'ss_faith', 'ss_faith', 'ss_faith', 'ss_faith',
        'ss_heal', 'ss_heal', 'ss_heal', 'ss_heal', 'ss_heal', 'ss_heal', 'ss_heal', 'ss_heal', 'ss_heal', 'ss_heal',
        'ss_turn', 'ss_turn', 'ss_turn', 'ss_turn', 'ss_turn', 'ss_turn', 'ss_turn', 'ss_turn', 'ss_turn', 'ss_turn',
        'ss_sanct', 'ss_sanct', 'ss_sanct', 'ss_sanct', 'ss_sanct', 'ss_sanct', 'ss_sanct', 'ss_sanct', 'ss_sanct', 'ss_sanct',
        'ss_awaken', 'ss_awaken', 'ss_awaken', 'ss_awaken', 'ss_awaken',
        'ss_lex', 'ss_lex', 'ss_lex', 'ss_lex'
      ]
    },
    triggers: [
      {
        id: 'trig_nc_lv1',
        type: 'base_level',
        targetLevel: 1,
        actions: [
          { id: 'act_nc_aq1', type: 'auto_quest', questMode: 'until_level', untilLevel: 12, untilQuest: 'MQ08' },
          { id: 'act_nc_eq1', type: 'equip_best', itemName: '' }
        ]
      },
      {
        id: 'trig_nc_job10',
        type: 'job_level',
        classId: 'traveler',
        targetLevel: 10,
        actions: [
          { id: 'act_nc_c1', type: 'change_class', targetClass: 'priest' },
          { id: 'act_nc_eq2', type: 'equip_best', itemName: '' }
        ]
      },
      {
        id: 'trig_nc_lv12',
        type: 'base_level',
        targetLevel: 12,
        actions: [
          { id: 'act_nc_sell12', type: 'sell_trip', sellMaterials: true, redQty: 15, blueQty: 20 },
          { id: 'act_nc_map12', type: 'change_map', targetMap: 'graveyard', targetMonster: '' },
          { id: 'act_nc_eq12', type: 'equip_best', itemName: '' }
        ]
      },
      {
        id: 'trig_nc_lv24',
        type: 'base_level',
        targetLevel: 24,
        actions: [
          { id: 'act_nc_map24', type: 'change_map', targetMap: 'giantbones', targetMonster: '' },
          { id: 'act_nc_eq24', type: 'equip_best', itemName: '' }
        ]
      },
      {
        id: 'trig_nc_lv30',
        type: 'base_level',
        targetLevel: 30,
        actions: [
          { id: 'act_nc_sell30', type: 'sell_trip', sellMaterials: true, redQty: 15, blueQty: 25 },
          { id: 'act_nc_map30', type: 'change_map', targetMap: 'coffinhollow', targetMonster: '' },
          { id: 'act_nc_eq30', type: 'equip_best', itemName: '' }
        ]
      },
      {
        id: 'trig_nc_lv36',
        type: 'base_level',
        targetLevel: 36,
        actions: [
          { id: 'act_nc_sell36', type: 'sell_trip', sellMaterials: true, redQty: 15, blueQty: 25 },
          { id: 'act_nc_map36', type: 'change_map', targetMap: 'crypt1', targetMonster: '' },
          { id: 'act_nc_eq36', type: 'equip_best', itemName: '' }
        ]
      },
      {
        id: 'trig_nc_job50_c1',
        type: 'job_level',
        classId: 'priest',
        targetLevel: 50,
        actions: [
          { id: 'act_nc_c2', type: 'change_class', targetClass: 'bishop' },
          { id: 'act_nc_eq_c2', type: 'equip_best', itemName: '' }
        ]
      },
      {
        id: 'trig_nc_lv48',
        type: 'base_level',
        targetLevel: 48,
        actions: [
          { id: 'act_nc_map48', type: 'change_map', targetMap: 'crypt2', targetMonster: '' },
          { id: 'act_nc_eq48', type: 'equip_best', itemName: '' }
        ]
      },
      {
        id: 'trig_nc_lv58',
        type: 'base_level',
        targetLevel: 58,
        actions: [
          { id: 'act_nc_map58', type: 'change_map', targetMap: 'poisonvillage', targetMonster: '' },
          { id: 'act_nc_eq58', type: 'equip_best', itemName: '' }
        ]
      },
      {
        id: 'trig_nc_lv64',
        type: 'base_level',
        targetLevel: 64,
        actions: [
          { id: 'act_nc_map64', type: 'change_map', targetMap: 'silentfarm', targetMonster: '' },
          { id: 'act_nc_eq64', type: 'equip_best', itemName: '' }
        ]
      },
      {
        id: 'trig_nc_lv73',
        type: 'base_level',
        targetLevel: 73,
        actions: [
          { id: 'act_nc_map73', type: 'change_map', targetMap: 'nightmarket', targetMonster: '' },
          { id: 'act_nc_eq73', type: 'equip_best', itemName: '' }
        ]
      },
      {
        id: 'trig_nc_lv80',
        type: 'base_level',
        targetLevel: 80,
        actions: [
          { id: 'act_nc_map80', type: 'change_map', targetMap: 'warehouses', targetMonster: '' },
          { id: 'act_nc_eq80', type: 'equip_best', itemName: '' }
        ]
      },
      {
        id: 'trig_nc_lv87',
        type: 'base_level',
        targetLevel: 87,
        actions: [
          { id: 'act_nc_map87', type: 'change_map', targetMap: 'shipgrave', targetMonster: '' },
          { id: 'act_nc_eq87', type: 'equip_best', itemName: '' }
        ]
      }
    ]
  };

  function buildZombieUndeadRouteTriggersClient(opts) {
    const c1 = String(opts?.class1Target || 'priest').toLowerCase();
    const c2 = String(opts?.class2Target || 'bishop').toLowerCase();
    const c3 = String(opts?.class3Target || 'starsaint').toLowerCase();
    const isSoloMelee = Boolean(opts?.isSoloMelee);
    const partyAct = opts?.partySetupAction ? [Object.assign({}, opts.partySetupAction)] : [];
    const list = [
      {
        id: 'trig_nc_lv1',
        type: 'base_level',
        targetLevel: 1,
        actions: [
          ...partyAct,
          { id: 'act_nc_aq1', type: 'auto_quest', questMode: 'until_level', untilLevel: 12, untilQuest: 'MQ08' },
          { id: 'act_nc_eq1', type: 'equip_best', itemName: '' }
        ]
      },
      {
        id: 'trig_nc_job10',
        type: 'job_level',
        classId: 'traveler',
        targetLevel: 10,
        actions: [
          { id: 'act_nc_c1', type: 'change_class', targetClass: c1 },
          { id: 'act_nc_eq2', type: 'equip_best', itemName: '' }
        ]
      }
    ];
    if (isSoloMelee) {
      list.push(
        {
          id: 'trig_nc_lv12',
          type: 'base_level',
          targetLevel: 12,
          actions: [
            { id: 'act_nc_sell12', type: 'sell_trip', sellMaterials: true, redQty: 30, blueQty: 20 },
            { id: 'act_nc_map12', type: 'change_map', targetMap: 'farm2', targetMonster: '' },
            { id: 'act_nc_eq12', type: 'equip_best', itemName: '' }
          ]
        },
        {
          id: 'trig_nc_lv16',
          type: 'base_level',
          targetLevel: 16,
          actions: [
            { id: 'act_nc_sell16', type: 'sell_trip', sellMaterials: true, redQty: 30, blueQty: 20 },
            { id: 'act_nc_map16', type: 'change_map', targetMap: 'marsh', targetMonster: '' },
            { id: 'act_nc_eq16', type: 'equip_best', itemName: '' }
          ]
        },
        {
          id: 'trig_nc_lv21',
          type: 'base_level',
          targetLevel: 21,
          actions: [
            { id: 'act_nc_sell21', type: 'sell_trip', sellMaterials: true, redQty: 35, blueQty: 25 },
            { id: 'act_nc_map21', type: 'change_map', targetMap: 'graveyard', targetMonster: '' },
            { id: 'act_nc_eq21', type: 'equip_best', itemName: '' }
          ]
        },
        {
          id: 'trig_nc_lv27',
          type: 'base_level',
          targetLevel: 27,
          actions: [
            { id: 'act_nc_sell27', type: 'sell_trip', sellMaterials: true, redQty: 35, blueQty: 25 },
            { id: 'act_nc_map27', type: 'change_map', targetMap: 'giantbones', targetMonster: '' },
            { id: 'act_nc_eq27', type: 'equip_best', itemName: '' }
          ]
        },
        {
          id: 'trig_nc_job50_c1',
          type: 'job_level',
          classId: c1,
          targetLevel: 50,
          actions: [
            { id: 'act_nc_c2', type: 'change_class', targetClass: c2 },
            { id: 'act_nc_rst_c2', type: 'reset_skills', resetMode: 'auto' },
            { id: 'act_nc_eq_c2', type: 'equip_best', itemName: '' }
          ]
        },
        {
          id: 'trig_nc_lv35',
          type: 'base_level',
          targetLevel: 35,
          actions: [
            { id: 'act_nc_sell35', type: 'sell_trip', sellMaterials: true, redQty: 35, blueQty: 30 },
            { id: 'act_nc_map35', type: 'change_map', targetMap: 'coffinhollow', targetMonster: '' },
            { id: 'act_nc_eq35', type: 'equip_best', itemName: '' }
          ]
        },
        {
          id: 'trig_nc_lv42',
          type: 'base_level',
          targetLevel: 42,
          actions: [
            { id: 'act_nc_sell42', type: 'sell_trip', sellMaterials: true, redQty: 35, blueQty: 30 },
            { id: 'act_nc_map42', type: 'change_map', targetMap: 'crypt1', targetMonster: '' },
            { id: 'act_nc_eq42', type: 'equip_best', itemName: '' }
          ]
        },
        {
          id: 'trig_nc_lv50',
          type: 'base_level',
          targetLevel: 50,
          actions: [
            { id: 'act_nc_sell50', type: 'sell_trip', sellMaterials: true, redQty: 35, blueQty: 30 },
            { id: 'act_nc_map50', type: 'change_map', targetMap: 'crypt2', targetMonster: '' },
            { id: 'act_nc_eq50', type: 'equip_best', itemName: '' }
          ]
        },
        {
          id: 'trig_nc_lv59',
          type: 'base_level',
          targetLevel: 59,
          actions: [
            { id: 'act_nc_sell59', type: 'sell_trip', sellMaterials: true, redQty: 35, blueQty: 30 },
            { id: 'act_nc_map59', type: 'change_map', targetMap: 'poisonvillage', targetMonster: '' },
            { id: 'act_nc_eq59', type: 'equip_best', itemName: '' }
          ]
        },
        {
          id: 'trig_nc_lv66',
          type: 'base_level',
          targetLevel: 66,
          actions: [
            { id: 'act_nc_sell66', type: 'sell_trip', sellMaterials: true, redQty: 35, blueQty: 30 },
            { id: 'act_nc_map66', type: 'change_map', targetMap: 'silentfarm', targetMonster: '' },
            { id: 'act_nc_eq66', type: 'equip_best', itemName: '' }
          ]
        },
        {
          id: 'trig_nc_lv74',
          type: 'base_level',
          targetLevel: 74,
          actions: [
            { id: 'act_nc_sell74', type: 'sell_trip', sellMaterials: true, redQty: 35, blueQty: 30 },
            { id: 'act_nc_map74', type: 'change_map', targetMap: 'nightmarket', targetMonster: '' },
            { id: 'act_nc_eq74', type: 'equip_best', itemName: '' }
          ]
        },
        {
          id: 'trig_nc_job50_c2',
          type: 'job_level',
          classId: c2,
          targetLevel: 50,
          actions: [
            { id: 'act_nc_c3', type: 'change_class', targetClass: c3 },
            { id: 'act_nc_eq_c3', type: 'equip_best', itemName: '' }
          ]
        },
        {
          id: 'trig_nc_lv81',
          type: 'base_level',
          targetLevel: 81,
          actions: [
            { id: 'act_nc_sell81', type: 'sell_trip', sellMaterials: true, redQty: 35, blueQty: 30 },
            { id: 'act_nc_map81', type: 'change_map', targetMap: 'warehouses', targetMonster: '' },
            { id: 'act_nc_eq81', type: 'equip_best', itemName: '' }
          ]
        },
        {
          id: 'trig_nc_lv88',
          type: 'base_level',
          targetLevel: 88,
          actions: [
            { id: 'act_nc_sell88', type: 'sell_trip', sellMaterials: true, redQty: 35, blueQty: 30 },
            { id: 'act_nc_map88', type: 'change_map', targetMap: 'shipgrave', targetMonster: '' },
            { id: 'act_nc_eq88', type: 'equip_best', itemName: '' }
          ]
        }
      );
      return list;
    }
    list.push(
      {
        id: 'trig_nc_lv12',
        type: 'base_level',
        targetLevel: 12,
        actions: [
          { id: 'act_nc_sell12', type: 'sell_trip', sellMaterials: true, redQty: 30, blueQty: 25 },
          { id: 'act_nc_map12', type: 'change_map', targetMap: 'graveyard', targetMonster: '' },
          { id: 'act_nc_eq12', type: 'equip_best', itemName: '' }
        ]
      },
      {
        id: 'trig_nc_lv24',
        type: 'base_level',
        targetLevel: 24,
        actions: [
          { id: 'act_nc_sell24', type: 'sell_trip', sellMaterials: true, redQty: 30, blueQty: 25 },
          { id: 'act_nc_map24', type: 'change_map', targetMap: 'giantbones', targetMonster: '' },
          { id: 'act_nc_eq24', type: 'equip_best', itemName: '' }
        ]
      },
      {
        id: 'trig_nc_job50_c1',
        type: 'job_level',
        classId: c1,
        targetLevel: 50,
        actions: [
          { id: 'act_nc_c2', type: 'change_class', targetClass: c2 },
          { id: 'act_nc_rst_c2', type: 'reset_skills', resetMode: 'auto' },
          { id: 'act_nc_eq_c2', type: 'equip_best', itemName: '' }
        ]
      },
      {
        id: 'trig_nc_lv32',
        type: 'base_level',
        targetLevel: 32,
        actions: [
          { id: 'act_nc_sell32', type: 'sell_trip', sellMaterials: true, redQty: 30, blueQty: 25 },
          { id: 'act_nc_map32', type: 'change_map', targetMap: 'coffinhollow', targetMonster: '' },
          { id: 'act_nc_eq32', type: 'equip_best', itemName: '' }
        ]
      },
      {
        id: 'trig_nc_lv38',
        type: 'base_level',
        targetLevel: 38,
        actions: [
          { id: 'act_nc_sell38', type: 'sell_trip', sellMaterials: true, redQty: 30, blueQty: 30 },
          { id: 'act_nc_map38', type: 'change_map', targetMap: 'crypt1', targetMonster: '' },
          { id: 'act_nc_eq38', type: 'equip_best', itemName: '' }
        ]
      },
      {
        id: 'trig_nc_lv48',
        type: 'base_level',
        targetLevel: 48,
        actions: [
          { id: 'act_nc_sell48', type: 'sell_trip', sellMaterials: true, redQty: 30, blueQty: 30 },
          { id: 'act_nc_map48', type: 'change_map', targetMap: 'crypt2', targetMonster: '' },
          { id: 'act_nc_eq48', type: 'equip_best', itemName: '' }
        ]
      },
      {
        id: 'trig_nc_lv58',
        type: 'base_level',
        targetLevel: 58,
        actions: [
          { id: 'act_nc_sell58', type: 'sell_trip', sellMaterials: true, redQty: 30, blueQty: 30 },
          { id: 'act_nc_map58', type: 'change_map', targetMap: 'poisonvillage', targetMonster: '' },
          { id: 'act_nc_eq58', type: 'equip_best', itemName: '' }
        ]
      },
      {
        id: 'trig_nc_lv64',
        type: 'base_level',
        targetLevel: 64,
        actions: [
          { id: 'act_nc_sell64', type: 'sell_trip', sellMaterials: true, redQty: 30, blueQty: 30 },
          { id: 'act_nc_map64', type: 'change_map', targetMap: 'silentfarm', targetMonster: '' },
          { id: 'act_nc_eq64', type: 'equip_best', itemName: '' }
        ]
      },
      {
        id: 'trig_nc_lv73',
        type: 'base_level',
        targetLevel: 73,
        actions: [
          { id: 'act_nc_sell73', type: 'sell_trip', sellMaterials: true, redQty: 30, blueQty: 30 },
          { id: 'act_nc_map73', type: 'change_map', targetMap: 'nightmarket', targetMonster: '' },
          { id: 'act_nc_eq73', type: 'equip_best', itemName: '' }
        ]
      },
      {
        id: 'trig_nc_job50_c2',
        type: 'job_level',
        classId: c2,
        targetLevel: 50,
        actions: [
          { id: 'act_nc_c3', type: 'change_class', targetClass: c3 },
          { id: 'act_nc_eq_c3', type: 'equip_best', itemName: '' }
        ]
      },
      {
        id: 'trig_nc_lv80',
        type: 'base_level',
        targetLevel: 80,
        actions: [
          { id: 'act_nc_sell80', type: 'sell_trip', sellMaterials: true, redQty: 30, blueQty: 30 },
          { id: 'act_nc_map80', type: 'change_map', targetMap: 'warehouses', targetMonster: '' },
          { id: 'act_nc_eq80', type: 'equip_best', itemName: '' }
        ]
      },
      {
        id: 'trig_nc_lv87',
        type: 'base_level',
        targetLevel: 87,
        actions: [
          { id: 'act_nc_sell87', type: 'sell_trip', sellMaterials: true, redQty: 30, blueQty: 30 },
          { id: 'act_nc_map87', type: 'change_map', targetMap: 'shipgrave', targetMonster: '' },
          { id: 'act_nc_eq87', type: 'equip_best', itemName: '' }
        ]
      }
    );
    return list;
  }

  function upgradeBuiltinPlanZombieTriggersIfNeeded(plan) {
    if (!plan || typeof plan !== 'object') return false;
    const pid = String(plan.id || '');
    const pname = String(plan.name || '');
    const isParty5 = /^plan_nc_party5_/.test(pid) || /ตี้\s*5\s*คน/.test(pname);
    const isSoloPuppeteer = pid === 'plan_1795450519812_17' || pid === 'plan_nc_rogue_puppeteer_1_50' || /ลุยเดี่ยวหุ่นเชิด|ฟาร์มเดี่ยว.*นักเชิดหุ่น/.test(pname);
    const isPartyPuppeteer = pid === 'plan_nc_party5_slot3_dps_puppeteer';
    const isBuiltinNc = /^plan_nc_/.test(pid);
    if (!isParty5 && !isSoloPuppeteer && !isBuiltinNc) return false;

    const trigs = Array.isArray(plan.triggers) ? plan.triggers : [];
    const hasResetSkillAction = trigs.some(t => Array.isArray(t?.actions) && t.actions.some(a => a?.type === 'reset_skills'));
    const hasResetRounds = Array.isArray(plan.skillBuild?.resetRounds) && plan.skillBuild.resetRounds.length > 0;
    const hasSafeSoloPuppetRoute = !isSoloPuppeteer || isParty5 || trigs.some(t => t?.id === 'trig_nc_lv27' && Array.isArray(t?.actions) && t.actions.some(a => a?.targetMap === 'giantbones'));
    if (hasResetSkillAction && hasResetRounds && hasSafeSoloPuppetRoute && (!isSoloPuppeteer || plan.class3Target === 'showmaster')) {
      return false;
    }

    let partyAct = null;
    for (const t of trigs) {
      const found = (t?.actions || []).find(a => a && a.type === 'party_setup');
      if (found) { partyAct = found; break; }
    }
    if (!partyAct && isParty5 && plan.partyConfig?.enabled) {
      partyAct = {
        id: 'act_nc_p5_setup',
        type: 'party_setup',
        role: plan.partyConfig.role || 'member',
        partyTag: plan.partyConfig.partyTag || 'TEAM1',
        lootMode: plan.partyConfig.lootMode || 't',
        groupMode: plan.partyConfig.groupMode || 'g',
        supFight: plan.partyConfig.supFight !== false,
        supHealPct: Number(plan.partyConfig.supHealPct) || 75
      };
    }

    if (isSoloPuppeteer || isPartyPuppeteer) {
      const rep = (id, n) => Array(n).fill(id);
      if (isSoloPuppeteer && !isParty5 && (pid === 'plan_1795450519812_17' || /ลุยเดี่ยวหุ่นเชิด|ฟาร์มเดี่ยว.*นักเชิดหุ่น/.test(pname))) {
        plan.name = '🎎 [ลุยเดี่ยวหุ่นเชิด] ฟาร์มเดี่ยว | โจร ➔ นักเชิดหุ่น ➔ จ้าวโรงหุ่นราตรี (ฟาร์มซอมบี้ชาวนายาว + หุ่นรบตีตามทุกฮิต + เชิดมอน 2 ตัว + โรงละครหุ่นเชิด Lv.1–99)';
        plan.description = 'บิ้วลุยเดี่ยวหุ่นเชิดสายไม้เชิดหุ่น+โล่ (2 รอบรีสกิล): รอบเริ่มต้นข้ามโนวิซอัปมีดโจร 58 แต้มฟาร์มไว ➔ พอ Job 50 เปลี่ยนนักเชิดหุ่น + รีสกิล #1 ฟรีที่ลุงโกโก้ เท 58 แต้มลง หุ่นรบ Lv.10 (หุ่นโล่เลือด 165% ยั่วยุมอน) + ชักใยหุ่น Lv.10 + ระบำหุ่น Lv.10 + โรงละครหุ่น Lv.5 + เชิดมอน Lv.10 + เชือกชักวิญญาณ Lv.5 ทันทีตั้งแต่ Job 1!';
      }
      plan.autoQuestEnabled = true;
      plan.autoJobChange = true;
      plan.autoStatSkillEnabled = true;
      plan.class1Target = 'rogue';
      plan.class1JobLevel = 10;
      plan.class2Target = 'puppeteer';
      plan.class2JobLevel = 50;
      plan.class3Target = 'showmaster';
      plan.preferredWeaponType = 'puppet';
      plan.statBuild = {
        queue: [
          { stat: 'STR', to: 25 }, { stat: 'AGI', to: 25 }, { stat: 'VIT', to: 20 }, { stat: 'DEX', to: 20 },
          { stat: 'STR', to: 42 }, { stat: 'AGI', to: 40 }, { stat: 'VIT', to: 32 }, { stat: 'DEX', to: 30 }, { stat: 'LUK', to: 20 },
          { stat: 'STR', to: 62 }, { stat: 'AGI', to: 58 }, { stat: 'VIT', to: 45 }, { stat: 'DEX', to: 40 },
          { stat: 'STR', to: 80 }, { stat: 'AGI', to: 75 }, { stat: 'VIT', to: 55 }, { stat: 'DEX', to: 45 }, { stat: 'LUK', to: 40 }
        ],
        targets: { STR: 80, AGI: 75, VIT: 55, INT: 1, DEX: 45, LUK: 40 },
        priorityOrder: ['STR', 'AGI', 'VIT', 'DEX', 'LUK', 'INT']
      };
      plan.skillBuild = {
        skillPointQueue: [
          ...rep('ro_dagger', 10), ...rep('ro_double', 10), ...rep('ro_vital', 10),
          ...rep('sonic', 5), ...rep('envenom', 9), ...rep('ro_venomheart', 10), ...rep('body', 4)
        ],
        plannedLevels: {
          ro_dagger: 10, ro_double: 10, ro_vital: 10, sonic: 5, envenom: 9, ro_venomheart: 10, body: 4
        },
        autoOff: ['ro_hide'],
        facets: plan.skillBuild?.facets || {},
        resetRounds: [
          {
            round: 1,
            label: 'รีสกิล #1',
            skillPointQueue: [
              ...rep('pp_puppet', 9), ...rep('pp_strings', 10), ...rep('pp_dance', 10), ...rep('pp_theatre', 5),
              ...rep('shadowstep', 2), ...rep('ro_hide', 1), ...rep('pp_control', 10), ...rep('pp_soulstring', 5),
              ...rep('pp_guide', 10), ...rep('pp_swap', 5), ...rep('body', 10), ...rep('mastery', 10),
              ...rep('ro_venomheart', 10), ...rep('mind', 10),
              ...rep('so_acts', 9), ...rep('so_awaken', 5), ...rep('so_dance', 10), ...rep('so_swap', 10),
              ...rep('envenom', 9), ...rep('venomdust', 6)
            ],
            plannedLevels: {
              pp_puppet: 9, pp_strings: 10, pp_dance: 10, pp_theatre: 5,
              shadowstep: 2, ro_hide: 1, pp_control: 10, pp_soulstring: 5,
              pp_guide: 10, pp_swap: 5, body: 10, mastery: 10, ro_venomheart: 10, mind: 10,
              so_acts: 9, so_awaken: 5, so_dance: 10, so_swap: 10, envenom: 9, venomdust: 6
            },
            autoOff: ['ro_hide', 'shadowstep', 'pp_stretch', 'pp_bind'],
            facets: {}
          }
        ]
      };
    }

    plan.triggers = buildZombieUndeadRouteTriggersClient({
      class1Target: plan.class1Target || 'priest',
      class2Target: plan.class2Target || 'bishop',
      class3Target: plan.class3Target || 'starsaint',
      isSoloMelee: isSoloPuppeteer && !isParty5,
      partySetupAction: partyAct
    });

    try {
      localStorage.setItem('pelican_script_plan', JSON.stringify(plan));
      localStorage.removeItem('pelican_plan_state_' + (plan.id || 'default'));
      const charName = typeof window.getCharacterName === 'function' ? window.getCharacterName() : '';
      if (charName) {
        localStorage.removeItem('pelican_plan_state_' + charName + '_' + (plan.id || plan.name || 'default'));
      }
    } catch (_) {}
    return true;
  }

  function loadStoredScriptPlan() {
    try {
      const raw = JSON.parse(localStorage.getItem('pelican_script_plan') || 'null');
      if (raw && typeof raw === 'object' && raw.name && raw.id !== 'plan_starter_archer' && raw.id !== 'plan_nc_wolfhunter_1_50') {
        upgradeBuiltinPlanZombieTriggersIfNeeded(raw);
        return raw;
      }
    } catch (_) {}
    return JSON.parse(JSON.stringify(DEFAULT_NC_WOLF_PLAN));
  }

  // Standalone Smart Auto-Quest switch (works independently of Plan Script; default ON)
  window.__smartAutoQuestEnabled = localStorage.getItem('pelican_smart_autoquest_enabled') !== 'false';
  // Plan Script switch (controls automatic job selection, stat/skill build & map triggers)
  window.__currentScriptPlan = window.__currentScriptPlan || loadStoredScriptPlan();
  try { upgradeBuiltinPlanZombieTriggersIfNeeded(window.__currentScriptPlan); } catch (_) {}
  window.__planScriptEnabled = localStorage.getItem('pelican_plan_script_enabled') === 'true';
  // Upgrade BOT AI switch (fixes loot orbit, fast server-synced loot pickup, zone seeker & co-spawn slot clearer; default ON)
  window.__upgradeBotAiEnabled = localStorage.getItem('pelican_upgrade_bot_ai_enabled') !== 'false';
  // Auto-Sell switch & weight threshold % (warps/walks to Uncle Coco at camp, sells mats/junk gear, stores mats, buys pots, repairs, warps back; default ON at 65%)
  window.__autoSellEnabled = localStorage.getItem('pelican_auto_sell_enabled') !== 'false';
  window.__autoSellWeightPct = Math.max(40, Math.min(85, Number(localStorage.getItem('pelican_auto_sell_weight_pct')) || 65));
  // Auto-Respawn switch (revives at camp immediately on death instead of waiting 30s, then returns to quest/farm; default ON)
  window.__autoRespawnEnabled = localStorage.getItem('pelican_auto_respawn_enabled') !== 'false';
  // Smart Gear switch (equips best weapon/armor/accessory from bag/owned tailored to character job & stats; default ON)
  window.__smartGearEnabled = localStorage.getItem('pelican_smart_gear_enabled') !== 'false';
  window.__lastSmartGearNote = window.__lastSmartGearNote || '⚔️ Smart Gear: พร้อมอัปเกรดอุปกรณ์ตามสายอาชีพ';
  window.__smartGearWeaponType = localStorage.getItem('pelican_smart_gear_wtype') || 'auto';
  // Per-character No-Loot mode ("กากบาทที่มือ" = ไม่เก็บของเลย ตีอย่างเดียว; default OFF)
  window.__noLootMode = localStorage.getItem('pelican_no_loot_mode') === 'true';
  // Target Farm Map when Smart Auto-Quest is OFF ('auto' = automatic by level, or specific mapId)
  window.__targetFarmMap = localStorage.getItem('pelican_target_farm_map') || 'auto';

  // Potion Craft/Buy & Custom Auto-Drink Configuration
  const DEFAULT_POTION_CFG = {
    hpEnabled: true,
    hpSize: 'red',       // 'red' (เล็ก), 'red_m' (กลาง), 'red_l' (ใหญ่), 'auto' (ตามเลเวล)
    hpDrinkPct: 60,      // ดื่มยาแดงเมื่อ HP ต่ำกว่า % (0 = ไม่ปั๊ม, 10..95%)
    hpMin: 15,           // กลับไปซื้อ/คราฟเมื่อต่ำกว่า
    hpTarget: 100,       // จำนวนซื้อ/คราฟให้ครบ
    spEnabled: true,
    spSize: 'blue',      // 'blue' (เล็ก), 'blue_m' (กลาง), 'blue_l' (ใหญ่), 'auto' (ตามเลเวล)
    spDrinkPct: 40,      // ดื่มยาฟ้าเมื่อ Mana (SP) ต่ำกว่า % (0 = ไม่ปั๊ม, 10..95% · Archmage ตั้ง 80-85% เพื่อร่ายไว!)
    spMin: 10,           // กลับไปซื้อ/คราฟเมื่อต่ำกว่า
    spTarget: 60,        // จำนวนซื้อ/คราฟให้ครบ
    preferCraft: true    // ต้มยาจากขยะมอนก่อน (ถูกกว่า 50%) ถ้าไม่มีขยะค่อยซื้อร้านลุงโกโก้
  };

  function loadPotionCfg() {
    try {
      const saved = JSON.parse(localStorage.getItem('pelican_potion_cfg') || 'null');
      return Object.assign({}, DEFAULT_POTION_CFG, (saved && typeof saved === 'object') ? saved : {});
    } catch (_) {
      return Object.assign({}, DEFAULT_POTION_CFG);
    }
  }
  window.__potionConfig = loadPotionCfg();

  // Auto-Sell & Camp Storage Configuration (🛒 ซื้อ/ขาย Tab)
  const DEFAULT_SELL_CFG = {
    enabled: true,
    weightThreshold: 65,
    weaponMaxGrade: 1,      // 0 = ไม่ขาย, 1 = เกรด 1 (ทั่วไป), 2 = เกรด 2 ลงไป, 3 = เกรด 3 ลงไป, 4 = เกรด 4 ลงไป
    armorMaxGrade: 1,       // 0 = ไม่ขาย, 1..4
    accMaxGrade: 0,         // 0 = ไม่ขาย (ค่าเริ่มต้นไม่ขายประดับ), 1..4
    materialMode: 'common', // 'common' = ขายขยะมอนทั่วไป (เก็บแรร์/ของเควส), 'all' = ขายขยะมอนทั้งหมด (ยกเว้นของเควส), 'none' = ไม่ขายวัตถุดิบ
    keepBestCopy: true,     // ล็อกอุปกรณ์ที่ดีกว่าหรือเทียบเท่าที่ใส่อยู่ (Smart Gear Lock)
    keepRefined: true,      // ล็อกของตีบวก (+1 ขึ้นไป)
    keepSpecial: true,      // ล็อกของมีออปชัน ≥ 2 แถว / เกรดขัด ≥ 2 / ประกายจันทร์ (✦)
    keepBossGear: true,     // ล็อกอุปกรณ์บอส (Boss Gear)
    autoRepair: true,       // แวะซ่อมอุปกรณ์ที่ป๋าหมูหริ่งอัตโนมัติ (ถ้าเงินติดตัวไม่พอจะเบิกจากคลังร่วมอัตโนมัติ)
    repairThresholdPct: 25, // กลับค่ายไปซ่อมของอัตโนมัติเมื่อความทนอุปกรณ์ที่สวมใส่ ≤ % นี้ (0 = ซ่อมเฉพาะตอนแวะค่าย)
    storeMats: true,        // ฝากวัตถุดิบที่เหลือเข้าคลังแคมป์อัตโนมัติ
    storeGear: false,       // ฝากอุปกรณ์สำรองที่ไม่ได้ขายเข้าคลังแคมป์
    storeCoinsEnabled: false, // ฝากเงินที่เหลือเข้าคลังร่วมอัตโนมัติหลังจากคราฟยาและขายของเสร็จ
    keepCoinsOnHand: 1000,  // จำนวนเหรียญที่ต้องการเหลือติดตัวไว้ (เช่น 1000 เหรียญ)
    whitelist: '',          // รายชื่อไอเทมที่ห้ามขาย (คั่นด้วย ,)
    forceSellList: ''       // รายชื่อไอเทมที่บังคับขาย NPC ทันที (คั่นด้วย ,)
  };

  function loadSellCfg() {
    try {
      const saved = JSON.parse(localStorage.getItem('pelican_nc_sell_cfg') || 'null');
      const merged = Object.assign({}, DEFAULT_SELL_CFG, (saved && typeof saved === 'object') ? saved : {});
      if (localStorage.getItem('pelican_auto_sell_enabled') !== null && (!saved || saved.enabled === undefined)) {
        merged.enabled = localStorage.getItem('pelican_auto_sell_enabled') !== 'false';
      }
      if (localStorage.getItem('pelican_auto_sell_weight_pct') !== null && (!saved || saved.weightThreshold === undefined)) {
        merged.weightThreshold = Math.max(40, Math.min(85, Number(localStorage.getItem('pelican_auto_sell_weight_pct')) || 65));
      }
      return merged;
    } catch (_) {
      return Object.assign({}, DEFAULT_SELL_CFG);
    }
  }
  window.__sellConfig = loadSellCfg();
  window.__autoSellEnabled = Boolean(window.__sellConfig.enabled);
  window.__autoSellWeightPct = Math.max(40, Math.min(85, Number(window.__sellConfig.weightThreshold) || 65));

  window.__setSellConfig = function setSellConfig(patch) {
    if (!window.__sellConfig || typeof window.__sellConfig !== 'object') {
      window.__sellConfig = loadSellCfg();
    }
    if (patch && typeof patch === 'object') {
      if (typeof patch.enabled === 'boolean') window.__sellConfig.enabled = patch.enabled;
      if (patch.weightThreshold !== undefined && patch.weightThreshold !== null) {
        window.__sellConfig.weightThreshold = Math.max(40, Math.min(85, Math.floor(Number(patch.weightThreshold) || 65)));
      }
      if (patch.weaponMaxGrade !== undefined) window.__sellConfig.weaponMaxGrade = Math.max(0, Math.min(4, Math.floor(Number(patch.weaponMaxGrade) || 0)));
      if (patch.armorMaxGrade !== undefined) window.__sellConfig.armorMaxGrade = Math.max(0, Math.min(4, Math.floor(Number(patch.armorMaxGrade) || 0)));
      if (patch.accMaxGrade !== undefined) window.__sellConfig.accMaxGrade = Math.max(0, Math.min(4, Math.floor(Number(patch.accMaxGrade) || 0)));
      if (patch.materialMode) window.__sellConfig.materialMode = String(patch.materialMode);
      if (typeof patch.keepBestCopy === 'boolean') window.__sellConfig.keepBestCopy = patch.keepBestCopy;
      if (typeof patch.keepRefined === 'boolean') window.__sellConfig.keepRefined = patch.keepRefined;
      if (typeof patch.keepSpecial === 'boolean') window.__sellConfig.keepSpecial = patch.keepSpecial;
      if (typeof patch.keepBossGear === 'boolean') window.__sellConfig.keepBossGear = patch.keepBossGear;
      if (typeof patch.autoRepair === 'boolean') window.__sellConfig.autoRepair = patch.autoRepair;
      if (patch.repairThresholdPct !== undefined && patch.repairThresholdPct !== null) {
        window.__sellConfig.repairThresholdPct = Math.max(0, Math.min(80, Math.floor(Number(patch.repairThresholdPct) || 0)));
      }
      if (typeof patch.storeMats === 'boolean') window.__sellConfig.storeMats = patch.storeMats;
      if (typeof patch.storeGear === 'boolean') window.__sellConfig.storeGear = patch.storeGear;
      if (typeof patch.storeCoinsEnabled === 'boolean') window.__sellConfig.storeCoinsEnabled = patch.storeCoinsEnabled;
      if (patch.keepCoinsOnHand !== undefined && patch.keepCoinsOnHand !== null) {
        window.__sellConfig.keepCoinsOnHand = Math.max(0, Math.min(999999999, Math.floor(Number(patch.keepCoinsOnHand) || 0)));
      }
      if (typeof patch.whitelist === 'string') window.__sellConfig.whitelist = patch.whitelist;
      if (typeof patch.forceSellList === 'string') window.__sellConfig.forceSellList = patch.forceSellList;
    }
    window.__autoSellEnabled = Boolean(window.__sellConfig.enabled);
    window.__autoSellWeightPct = Math.max(40, Math.min(85, Number(window.__sellConfig.weightThreshold) || 65));
    try {
      localStorage.setItem('pelican_nc_sell_cfg', JSON.stringify(window.__sellConfig));
      localStorage.setItem('pelican_auto_sell_enabled', String(window.__autoSellEnabled));
      localStorage.setItem('pelican_auto_sell_weight_pct', String(window.__autoSellWeightPct));
    } catch (_) {}
    renderHudState();
    return {
      success: true,
      autoSellEnabled: window.__autoSellEnabled,
      autoSellWeightPct: window.__autoSellWeightPct,
      sellConfig: window.__sellConfig
    };
  };

  window.__setAutoRepairConfig = function setAutoRepairConfig(enable, thresholdPct) {
    const patch = {};
    if (typeof enable === 'boolean') patch.autoRepair = enable;
    if (thresholdPct !== undefined && thresholdPct !== null) {
      patch.repairThresholdPct = Math.max(0, Math.min(80, Math.floor(Number(thresholdPct) || 0)));
    }
    return window.__setSellConfig(patch);
  };

  window.__setAutoRespawnEnabled = function setAutoRespawnEnabled(enable) {
    window.__autoRespawnEnabled = Boolean(enable);
    try { localStorage.setItem('pelican_auto_respawn_enabled', String(window.__autoRespawnEnabled)); } catch (_) {}
    renderHudState();
    return { success: true, autoRespawnEnabled: window.__autoRespawnEnabled };
  };

  window.__setSmartGearEnabled = function setSmartGearEnabled(enable) {
    window.__smartGearEnabled = Boolean(enable);
    try { localStorage.setItem('pelican_smart_gear_enabled', String(window.__smartGearEnabled)); } catch (_) {}
    if (window.__smartGearEnabled && window.NC?.game?.player) {
      try { equipBestFromBag(window.NC.game, window.NC.game.player, ''); } catch (_) {}
    }
    renderHudState();
    return { success: true, smartGearEnabled: window.__smartGearEnabled, smartGearWeaponType: window.__smartGearWeaponType || 'auto', note: window.__lastSmartGearNote };
  };

  window.__setSmartGearWeaponType = function setSmartGearWeaponType(wtype) {
    const clean = String(wtype || 'auto').trim().toLowerCase() || 'auto';
    window.__smartGearWeaponType = clean;
    try { localStorage.setItem('pelican_smart_gear_wtype', clean); } catch (_) {}
    lastSmartGearSignature = '';
    if (window.__smartGearEnabled && window.NC?.game?.player) {
      try { equipBestFromBag(window.NC.game, window.NC.game.player, ''); } catch (_) {}
    }
    renderHudState();
    return { success: true, smartGearWeaponType: window.__smartGearWeaponType, note: window.__lastSmartGearNote };
  };

  window.__setPotionConfig = function setPotionConfig(patch) {
    if (!window.__potionConfig || typeof window.__potionConfig !== 'object') {
      window.__potionConfig = loadPotionCfg();
    }
    if (patch && typeof patch === 'object') {
      if (typeof patch.hpEnabled === 'boolean') window.__potionConfig.hpEnabled = patch.hpEnabled;
      if (patch.hpSize) window.__potionConfig.hpSize = String(patch.hpSize);
      if (patch.hpDrinkPct !== undefined) window.__potionConfig.hpDrinkPct = Math.max(0, Math.min(95, Math.floor(Number(patch.hpDrinkPct) || 0)));
      if (patch.hpMin !== undefined) window.__potionConfig.hpMin = Math.max(0, Math.min(500, Math.floor(Number(patch.hpMin) || 0)));
      if (patch.hpTarget !== undefined) window.__potionConfig.hpTarget = Math.max(10, Math.min(990, Math.floor(Number(patch.hpTarget) || 100)));
      if (typeof patch.spEnabled === 'boolean') window.__potionConfig.spEnabled = patch.spEnabled;
      if (patch.spSize) window.__potionConfig.spSize = String(patch.spSize);
      if (patch.spDrinkPct !== undefined) window.__potionConfig.spDrinkPct = Math.max(0, Math.min(95, Math.floor(Number(patch.spDrinkPct) || 0)));
      if (patch.spMin !== undefined) window.__potionConfig.spMin = Math.max(0, Math.min(500, Math.floor(Number(patch.spMin) || 0)));
      if (patch.spTarget !== undefined) window.__potionConfig.spTarget = Math.max(10, Math.min(990, Math.floor(Number(patch.spTarget) || 60)));
      if (typeof patch.preferCraft === 'boolean') window.__potionConfig.preferCraft = patch.preferCraft;
    }
    try { localStorage.setItem('pelican_potion_cfg', JSON.stringify(window.__potionConfig)); } catch (_) {}
    try {
      if (window.NC?.game?.player) syncInGamePotionPreferences(window.NC.game.player);
    } catch (_) {}
    renderHudState();
    return { success: true, potionConfig: window.__potionConfig };
  };

  window.__setSmartAutoQuestEnabled = function setSmartAutoQuestEnabled(enable) {
    window.__smartAutoQuestEnabled = Boolean(enable);
    try { localStorage.setItem('pelican_smart_autoquest_enabled', String(window.__smartAutoQuestEnabled)); } catch (_) {}
    if (!window.__smartAutoQuestEnabled && window.NC?.QuestAuto?.on) {
      try { window.NC.QuestAuto.stop?.('สลับไปโหมดแมพฟาร์มประจำ'); } catch (_) {}
    }
    renderHudState();
    return { success: true, smartAutoQuestEnabled: window.__smartAutoQuestEnabled };
  };

  window.__setUpgradeBotAiEnabled = function setUpgradeBotAiEnabled(enable) {
    window.__upgradeBotAiEnabled = Boolean(enable);
    try { localStorage.setItem('pelican_upgrade_bot_ai_enabled', String(window.__upgradeBotAiEnabled)); } catch (_) {}
    try { document.documentElement.classList.toggle('pmhee-upgrade-ai', window.__upgradeBotAiEnabled); } catch (_) {}
    if (window.NC?.LootFeel) {
      try { window.NC.LootFeel.mode = window.__upgradeBotAiEnabled ? 'fast' : 'slow'; } catch (_) {}
    }
    try {
      installUpgradeBotAiHooks();
      window.NC?.SQ?.refresh?.('auto');
      window.NC?.SQ?.refresh?.('autosup');
      window.NC?.P3AF?.render?.();
    } catch (_) {}
    renderHudState();
    return { success: true, upgradeBotAiEnabled: window.__upgradeBotAiEnabled };
  };

  window.__setNoLootMode = function setNoLootMode(enable) {
    window.__noLootMode = Boolean(enable);
    try { localStorage.setItem('pelican_no_loot_mode', String(window.__noLootMode)); } catch (_) {}
    try {
      if (window.NC?.Auto?.set) {
        window.NC.Auto.set.loot = !window.__noLootMode;
        window.NC.Auto.saveSet?.();
      }
      window.NC?.SQ?.refresh?.('auto');
      window.NC?.P3AF?.render?.();
    } catch (_) {}
    renderHudState();
    return { success: true, noLootMode: window.__noLootMode };
  };

  window.__setAutoSellConfig = function setAutoSellConfig(enable, weightPct) {
    const patch = {};
    if (typeof enable === 'boolean') patch.enabled = enable;
    if (weightPct !== undefined && weightPct !== null) patch.weightThreshold = weightPct;
    return window.__setSellConfig(patch);
  };

  // ============================================================================
  // 1.4 CENTRAL MARKET (ตลาดกลาง) AUTO-SELL CONFIGURATION & HELPERS
  // ============================================================================
  const DEFAULT_CMARKET_AUTOSELL_CFG = {
    enabled: false,
    priceStrategy: 'undercut_1', // 'undercut_1' | 'lowest' | 'median' | 'band_max'
    autoClaimMail: true,         // รับเงินที่ขายได้จากจดหมายอัตโนมัติ (nc_mail_claim_all)
    autoUnlistExpired: true,     // ถอนของที่หมดเวลาบนชั้นกลับเข้ากระเป๋าเพื่อวางขายใหม่อัตโนมัติ
    rules: []                    // [{ id, itemId, itemName, kind, minQty, sellMode, customPrice, reserveQty, enabled }]
  };

  function normalizeCMarketRule(raw, idx = 0) {
    if (!raw || typeof raw !== 'object') return null;
    const itemId = String(raw.itemId || raw.id_item || '').trim();
    const itemName = String(raw.itemName || raw.name || itemId || '').trim();
    if (!itemId && !itemName) return null;
    const rawKind = String(raw.kind || '').toLowerCase();
    const kind = ['mat', 'pot', 'item', 'rune'].includes(rawKind) ? rawKind : 'auto';
    return {
      id: String(raw.id || ('cmrule_' + Date.now() + '_' + idx)),
      itemId,
      itemName: itemName || itemId,
      kind,
      minQty: Math.max(1, Math.min(9999, Math.floor(Number(raw.minQty) || 1))),
      sellMode: raw.sellMode === 'min' ? 'min' : 'all',
      customPrice: Math.max(0, Math.floor(Number(raw.customPrice) || 0)),
      reserveQty: Math.max(0, Math.min(9999, Math.floor(Number(raw.reserveQty) || 0))),
      enabled: raw.enabled !== false
    };
  }

  function loadCMarketAutoSellCfg() {
    try {
      const saved = JSON.parse(localStorage.getItem('pelican_nc_cmarket_autosell') || 'null');
      const base = Object.assign({}, DEFAULT_CMARKET_AUTOSELL_CFG, (saved && typeof saved === 'object') ? saved : {});
      base.enabled = Boolean(base.enabled);
      base.priceStrategy = ['undercut_1', 'lowest', 'median', 'band_max'].includes(base.priceStrategy)
        ? base.priceStrategy
        : 'undercut_1';
      base.autoClaimMail = base.autoClaimMail !== false;
      base.autoUnlistExpired = base.autoUnlistExpired !== false;
      base.rules = Array.isArray(base.rules)
        ? base.rules.map((r, i) => normalizeCMarketRule(r, i)).filter(Boolean)
        : [];
      return base;
    } catch (_) {
      return Object.assign({}, DEFAULT_CMARKET_AUTOSELL_CFG, { rules: [] });
    }
  }
  window.__cmarketAutoSellConfig = loadCMarketAutoSellCfg();
  window.__cmarketAutoSellLastLog = window.__cmarketAutoSellLastLog || '🏪 พร้อมตรวจสอบรายการขายตลาดกลางอัตโนมัติ';

  window.__setCMarketAutoSellConfig = function setCMarketAutoSellConfig(patch, mergeRules = false) {
    if (!window.__cmarketAutoSellConfig || typeof window.__cmarketAutoSellConfig !== 'object') {
      window.__cmarketAutoSellConfig = loadCMarketAutoSellCfg();
    }
    const cur = window.__cmarketAutoSellConfig;
    if (patch && typeof patch === 'object') {
      if (typeof patch.enabled === 'boolean') cur.enabled = patch.enabled;
      if (patch.priceStrategy && ['undercut_1', 'lowest', 'median', 'band_max'].includes(patch.priceStrategy)) {
        cur.priceStrategy = patch.priceStrategy;
      }
      if (typeof patch.autoClaimMail === 'boolean') cur.autoClaimMail = patch.autoClaimMail;
      if (typeof patch.autoUnlistExpired === 'boolean') cur.autoUnlistExpired = patch.autoUnlistExpired;
      if (Array.isArray(patch.rules)) {
        const incoming = patch.rules.map((r, i) => normalizeCMarketRule(r, i)).filter(Boolean);
        if (mergeRules) {
          const map = new Map();
          for (const r of (cur.rules || [])) {
            const key = String(r.itemId || r.itemName || '').toLowerCase();
            if (key) map.set(key, r);
          }
          for (const r of incoming) {
            const key = String(r.itemId || r.itemName || '').toLowerCase();
            if (key) map.set(key, r);
          }
          cur.rules = Array.from(map.values());
        } else {
          cur.rules = incoming;
        }
      }
    }
    try {
      localStorage.setItem('pelican_nc_cmarket_autosell', JSON.stringify(cur));
    } catch (_) {}
    renderHudState();
    return {
      success: true,
      cmarketAutoSellConfig: cur
    };
  };

  function resolveNightcampCatalogItem(rawIdOrName) {
    const NC = window.NC;
    const q = String(rawIdOrName || '').trim();
    if (!q) return null;
    const qLow = q.toLowerCase();
    // 1. Direct ID lookup in MATERIALS, ITEMS, or POT.LIST
    if (NC?.MATERIALS?.[q]) {
      const m = NC.MATERIALS[q];
      const isRune = Boolean(NC.BL?.isRune && NC.BL.isRune(q));
      return { id: q, name: m.name || q, kind: isRune ? 'rune' : 'mat' };
    }
    if (Array.isArray(NC?.POT?.LIST)) {
      const pot = NC.POT.LIST.find(x => x && (x.id === q || String(x.name || '').toLowerCase() === qLow));
      if (pot) return { id: pot.id, name: pot.name || pot.id, kind: 'pot' };
    }
    if (NC?.ITEMS?.[q]) {
      const it = NC.ITEMS[q];
      const isMatLike = Boolean(NC?.MATERIALS?.[q] || /^(mat_|lf_|fs_|lc_|fd_|gx_|bp_|th_|ap_|bl_|si_|box_|pk_|wb_|mb_|fc_|tk_)/.test(q));
      const isPot = ['red', 'red_m', 'red_l', 'blue', 'blue_m', 'blue_l'].includes(q);
      return {
        id: q,
        name: it.name || q,
        kind: isPot ? 'pot' : (isMatLike ? 'mat' : 'item')
      };
    }
    // 2. Exact or partial Thai/English name match across MATERIALS, ITEMS, POT.LIST
    for (const [id, m] of Object.entries(NC?.MATERIALS || {})) {
      if (m && String(m.name || '').trim().toLowerCase() === qLow) {
        const isRune = Boolean(NC.BL?.isRune && NC.BL.isRune(id));
        return { id, name: m.name || id, kind: isRune ? 'rune' : 'mat' };
      }
    }
    for (const [id, it] of Object.entries(NC?.ITEMS || {})) {
      if (it && String(it.name || '').trim().toLowerCase() === qLow) {
        const isMatLike = Boolean(NC?.MATERIALS?.[id] || /^(mat_|lf_|fs_|lc_|fd_|gx_|bp_|th_|ap_|bl_|si_|box_|pk_|wb_|mb_|fc_|tk_)/.test(id));
        const isPot = ['red', 'red_m', 'red_l', 'blue', 'blue_m', 'blue_l'].includes(id);
        return { id, name: it.name || id, kind: isPot ? 'pot' : (isMatLike ? 'mat' : 'item') };
      }
    }
    for (const [id, m] of Object.entries(NC?.MATERIALS || {})) {
      if (m && (String(m.name || '').toLowerCase().includes(qLow) || id.toLowerCase().includes(qLow))) {
        return { id, name: m.name || id, kind: 'mat' };
      }
    }
    for (const [id, it] of Object.entries(NC?.ITEMS || {})) {
      if (it && (String(it.name || '').toLowerCase().includes(qLow) || id.toLowerCase().includes(qLow))) {
        const isMatLike = Boolean(NC?.MATERIALS?.[id] || /^(mat_|lf_|fs_|lc_|fd_|gx_|bp_|th_|ap_|bl_|si_|box_|pk_|wb_|mb_|fc_|tk_)/.test(id));
        return { id, name: it.name || id, kind: isMatLike ? 'mat' : 'item' };
      }
    }
    return { id: q, name: q, kind: 'mat' };
  }

  function doesItemMatchCMarketRule(itemId, itemName, rule) {
    if (!rule || rule.enabled === false) return false;
    const rId = String(rule.itemId || '').trim().toLowerCase();
    const rNm = String(rule.itemName || '').trim().toLowerCase();
    const idLow = String(itemId || '').trim().toLowerCase();
    const nmLow = String(itemName || '').trim().toLowerCase();
    if (rId && idLow && rId === idLow) return true;
    if (rNm && nmLow && (rNm === nmLow || nmLow.includes(rNm) || rNm.includes(nmLow))) return true;
    if (rId && nmLow && rId === nmLow) return true;
    if (rNm && idLow && rNm === idLow) return true;
    return false;
  }

  function isProtectedByCMarketAutoSell(itemId, itemName) {
    const cfg = window.__cmarketAutoSellConfig;
    if (!cfg || !Array.isArray(cfg.rules) || cfg.rules.length === 0) return false;
    // Protect items matching any enabled rule whenever rules are configured so the bot never sells them to Uncle Coco NPC shop!
    return cfg.rules.some(r => r && r.enabled !== false && doesItemMatchCMarketRule(itemId, itemName, r));
  }

  // ============================================================================
  // 1.5 AETHERIA LITE GRAPHICS & PERFORMANCE ENGINE (DOT NPCs / DOT MONSTERS)
  // ============================================================================
  const DEFAULT_PERF_CFG = {
    dotMonsters: true,      // 🔴 แสดงมอนสเตอร์เป็น "จุดแดง + ชื่อมอน + หลอดเลือด"
    dotNpcs: true,          // 🟢 แสดง NPC เป็น "จุดเขียว + ชื่อ NPC"
    dotPlayer: false,       // 🔵 แสดงตัวละครเรา & เพื่อนในตี้เป็น "จุดฟ้า + ชื่อ" (ปิดวาดโมเดล/Rig ตัวละคร ประหยัด CPU สูงสุด)
    hideMapBg: true,        // 🌑 ลบพื้นหลังแมพ / ต้นไม้ / สิ่งปลูกสร้าง (เหลือตัวละคร + จุดวาร์ป)
    hideEffects: true,      // ✨ ลบเอฟเฟกต์สกิล / เลขดาเมจ / เงา / แสงไฟ / กล้องสั่น / ตัดผมหมวกทุกเฟรม
    hideOtherPlayers: true, // 👥 ซ่อนผู้เล่นคนอื่น & สัตว์เลี้ยงคนอื่นบนแมพ
    muteAudio: true,        // 🔇 ปิดเสียงเอฟเฟกต์ & เพลงในเกมทั้งหมด (ลดภาระ CPU ผสมเสียง WebAudio)
    trimVram: true,         // 🧹 บีบอัด & คืนแรมการ์ดจอ (VRAM) อัตโนมัติ (ลด VRAM จาก ~450MB เหลือ ~80MB/จอ)
    fpsCap: 30              // ⏱️ จำกัดเฟรมเรต (10 / 15 / 20 / 30 / 60)
  };

  function loadPerfCfg() {
    try {
      const saved = JSON.parse(localStorage.getItem('pelican_nc_perf_cfg') || 'null');
      return Object.assign({}, DEFAULT_PERF_CFG, (saved && typeof saved === 'object') ? saved : {});
    } catch (_) {
      return Object.assign({}, DEFAULT_PERF_CFG);
    }
  }
  window.__ncPerfConfig = loadPerfCfg();

  const PURE_VISUAL_UPDATE_TYPES = new Set(['hfember', 'dmg', 'dmgb', 'cbShard']);
  function isGameplayCallbackFxEntry(p) {
    if (!p || typeof p !== 'object') return false;
    if (p.type === 'timer' || !(p.life < 60)) return true;
    if (typeof p.onEnd === 'function') return true;
    if (typeof p.update === 'function' && !PURE_VISUAL_UPDATE_TYPES.has(p.type)) return true;
    return false;
  }

  function applyGl2dVramBudgetTrim(wantTrim) {
    try {
      const G = window.NC?.GL2D;
      if (!G || !G.on || !G._ || typeof G._.texFor !== 'function') return;
      if (!window.__pmVramTrimCanvas) {
        const c = document.createElement('canvas');
        c.width = 1;
        c.height = 1;
        window.__pmVramTrimCanvas = c;
      }
      const c = window.__pmVramTrimCanvas;
      const E = G._.texFor(c, true);
      if (!E || !E.tex) return;
      const OFFSET_BYTES = 420e6; // Shrinks GL2D's 640MB VRAM eviction ceiling down to ~95-220MB active working set
      if (wantTrim && !window.__pmVramTrimActive) {
        window.__pmVramTrimActive = true;
        E.bytes = -OFFSET_BYTES;
        c.__glv = (c.__glv | 0) + 1;
        G._.texFor(c, true);
      } else if (!wantTrim && window.__pmVramTrimActive) {
        window.__pmVramTrimActive = false;
        E.bytes = OFFSET_BYTES;
        c.__glv = (c.__glv | 0) + 1;
        G._.texFor(c, true);
      } else if (wantTrim && window.__pmVramTrimActive) {
        // Keep dummy 1x1 texture marked used so evict() never deletes the dummy anchor itself
        E.used = G.frame;
      }
    } catch (_) {}
  }

  function applyNightcampPerfSettings() {
    const cfg = window.__ncPerfConfig || DEFAULT_PERF_CFG;
    const NC = window.NC;
    if (!NC) return;
    try {
      // Unstick any online/life.js gather node whose `work.landing` got stuck at `true` by earlier fxAdd blocking
      if (NC.OnlineLife?.work && NC.OnlineLife.work.landing) {
        NC.OnlineLife.work.landing = false;
      }

      // 1. Stop per-frame 2D Canvas -> WebGL texture upload leak in herorig.js (`paintCut` when `hat.clip === true`, ~15-32 MB/s per window!)
      if (NC.ITEMS && typeof NC.ITEMS === 'object') {
        const disableHatClip = Boolean(cfg.hideEffects || cfg.dotPlayer || window.__lowPowerMode);
        if (window.__pmLastHatClipDisabled !== disableHatClip) {
          window.__pmLastHatClipDisabled = disableHatClip;
          for (const it of Object.values(NC.ITEMS)) {
            if (!it) continue;
            if (disableHatClip) {
              if (it.clip) {
                it.__pmOrigClip = true;
                it.clip = false;
              }
            } else if (it.__pmOrigClip) {
              it.clip = true;
            }
          }
        }
      }

      // 2. Disable cloth physics when hiding effects or using player dot mode
      if (NC.Perf && typeof NC.Perf === 'object') {
        NC.Perf.cloth = !(cfg.hideEffects || cfg.dotPlayer || window.__lowPowerMode);
        NC.Perf.mobs = true;
        NC.Perf.hud = true;
      }

      // 3. Apply WebGL2 VRAM Cache Compactor (~350MB VRAM saved per window)
      applyGl2dVramBudgetTrim(Boolean(cfg.trimVram !== false || window.__lowPowerMode));

      // 4. Mute in-game SFX & Music when muteAudio or Zero-Render is active
      const wantMute = Boolean(cfg.muteAudio !== false || window.__lowPowerMode);
      if (wantMute) {
        try {
          if (NC.SFX && typeof NC.SFX.vol === 'function' && NC.SFX.vol() > 0) {
            window.__pmSavedSfxVol = NC.SFX.vol();
            NC.SFX.set?.(0);
          }
          if (NC.Music && typeof NC.Music.vol === 'function' && NC.Music.vol() > 0) {
            window.__pmSavedMusicVol = NC.Music.vol();
            NC.Music.set?.(0);
          }
        } catch (_) {}
      }

      if (cfg.hideEffects) {
        if (NC.FX) {
          if (Array.isArray(NC.FX.list)) {
            for (let i = NC.FX.list.length - 1; i >= 0; i--) {
              const item = NC.FX.list[i];
              if (!isGameplayCallbackFxEntry(item)) {
                NC.FX.list.splice(i, 1);
              }
            }
          }
          if (Array.isArray(NC.FX.lights)) NC.FX.lights.length = 0;
          if (Array.isArray(NC.FX.flashes)) NC.FX.flashes.length = 0;
        }
        if (NC.game) {
          NC.game.shake = 0;
          NC.game.hitstop = 0;
        }
        if (NC.OtherFX && typeof NC.OtherFX.set === 'function' && NC.OtherFX.pct !== 0) {
          try { NC.OtherFX.set(0); } catch (_) {}
        }
        if (NC.Gfx && NC.Gfx.profile) {
          NC.Gfx.profile.shadows = 'none';
          NC.Gfx.profile.bloom = false;
          NC.Gfx.profile.vignette = false;
          NC.Gfx.profile.particleDensity = 0;
          NC.Gfx.profile.decorationDensity = 0;
          NC.Gfx.profile.sway = false;
          NC.Gfx.profile.smoothing = 'low';
        }
      }
      if (cfg.hideOtherPlayers && NC.Crowd && typeof NC.Crowd.set === 'function' && NC.Crowd.quality !== 'low') {
        try { NC.Crowd.set('low'); } catch (_) {}
      }
      if (NC.game && NC.game.world) {
        const w = NC.game.world;
        if (cfg.hideEffects || cfg.hideMapBg) {
          if (Array.isArray(w.lights) && w.lights.length > 0) {
            w.__pmOrigLights = w.lights;
            w.lights = [];
          }
          if (Array.isArray(NC.game.flies) && NC.game.flies.length > 0) {
            NC.game.__pmOrigFlies = NC.game.flies;
            NC.game.flies = [];
          }
        } else {
          if (w.__pmOrigLights && (!Array.isArray(w.lights) || w.lights.length === 0)) {
            w.lights = w.__pmOrigLights;
          }
          if (NC.game.__pmOrigFlies && (!Array.isArray(NC.game.flies) || NC.game.flies.length === 0)) {
            NC.game.flies = NC.game.__pmOrigFlies;
          }
        }
      }
    } catch (_) {}
  }

  function wrapCanvasDrawImageForPerf(proto) {
    if (!proto || typeof proto.drawImage !== 'function' || proto.drawImage.__pmheeLiteWrapped) return;
    const origDrawImage = proto.drawImage;
    const wrapped = function (src) {
      const cfg = window.__ncPerfConfig;
      if (cfg) {
        // Skip offscreen night-lighting GLCanvas (`lightCv`) draws when hiding effects or map background
        if ((cfg.hideMapBg || cfg.hideEffects) && this && this.canvas && this.canvas.__gl2d) {
          return;
        }
        if (cfg.hideMapBg) {
          const w = window.NC?.game?.world;
          if (w && (src === w.ground || src === w.groundDay || src === w.fogArt)) {
            return;
          }
        }
        if ((cfg.hideMapBg || cfg.hideEffects) && this && (this.globalCompositeOperation === 'multiply' || (src && src.__gl2d))) {
          return;
        }
      }
      return origDrawImage.apply(this, arguments);
    };
    wrapped.__pmheeLiteWrapped = true;
    proto.drawImage = wrapped;
    if (typeof proto.fillRect === 'function' && !proto.fillRect.__pmheeLiteWrapped) {
      const origFillRect = proto.fillRect;
      const wrappedFill = function () {
        const cfg = window.__ncPerfConfig;
        if (cfg && (cfg.hideMapBg || cfg.hideEffects) && this && this.canvas && this.canvas.__gl2d) {
          return;
        }
        return origFillRect.apply(this, arguments);
      };
      wrappedFill.__pmheeLiteWrapped = true;
      proto.fillRect = wrappedFill;
    }
  }

  function installNightcampPerfHooks() {
    try {
      if (typeof CanvasRenderingContext2D !== 'undefined' && CanvasRenderingContext2D.prototype) {
        wrapCanvasDrawImageForPerf(CanvasRenderingContext2D.prototype);
      }
      const NC = window.NC;
      if (!NC) return;

      if (NC.GL2D && NC.GL2D.Ctx && NC.GL2D.Ctx.prototype) {
        wrapCanvasDrawImageForPerf(NC.GL2D.Ctx.prototype);
      }

      // 1. Map Props / Blocks / Decals & Water Culling
      if (NC.RenderIndex && typeof NC.RenderIndex.query === 'function' && !NC.RenderIndex.query.__pmheeLiteWrapped) {
        const origQuery = NC.RenderIndex.query;
        const emptyResult = { props: [], blocks: [], decals: [] };
        const qWrapped = function () {
          if (window.__ncPerfConfig?.hideMapBg) {
            return emptyResult;
          }
          return origQuery.apply(this, arguments);
        };
        qWrapped.__pmheeLiteWrapped = true;
        NC.RenderIndex.query = qWrapped;
      }

      if (NC.drawWaterHooks && typeof NC.drawWaterHooks.around === 'function' && !NC.drawWaterHooks.__pmheeLiteHooked) {
        NC.drawWaterHooks.__pmheeLiteHooked = true;
        NC.drawWaterHooks.around('pmhee_lite', function (next) {
          if (window.__ncPerfConfig?.hideMapBg) return;
          return next();
        });
      }

      // 2. Monster Dot Rendering (🔴 จุดแดง + ชื่อมอน + หลอดเลือด)
      if (NC.enemyDraw && typeof NC.enemyDraw.around === 'function' && !NC.enemyDraw.__pmheeLiteHooked) {
        NC.enemyDraw.__pmheeLiteHooked = true;
        NC.enemyDraw.around('pmhee_lite', function (next, ctx, game, e) {
          if (!window.__ncPerfConfig?.dotMonsters) return next(ctx, game, e);
          if (!e || e.dead > 0 || (typeof e.hp === 'number' && e.hp <= 0)) return;
          const isBoss = Boolean(e.boss || e.rootBoss || e.isBoss);
          const isTarget = Boolean(game && game.target === e);
          const rad = isBoss ? 17 : 11;
          const cy = e.y - 12;
          ctx.save();
          if (isTarget) {
            ctx.beginPath();
            ctx.arc(e.x, cy, rad + 5, 0, Math.PI * 2);
            ctx.strokeStyle = '#fde047';
            ctx.lineWidth = 2;
            ctx.stroke();
          }
          ctx.beginPath();
          ctx.arc(e.x, cy, rad, 0, Math.PI * 2);
          ctx.fillStyle = isBoss ? '#f59e0b' : '#ef4444';
          ctx.fill();
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = '#0f172a';
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(e.x - rad * 0.28, cy - rad * 0.28, Math.max(2, rad * 0.28), 0, Math.PI * 2);
          ctx.fillStyle = isBoss ? '#fef08a' : '#fca5a5';
          ctx.fill();
          ctx.restore();
        });
      }

      if (NC.enemyBar && typeof NC.enemyBar.around === 'function' && !NC.enemyBar.__pmheeLiteHooked) {
        NC.enemyBar.__pmheeLiteHooked = true;
        NC.enemyBar.around('pmhee_lite', function (next, ctx, e, game) {
          if (!window.__ncPerfConfig?.dotMonsters) return next(ctx, e, game);
          if (!e || e.dead > 0 || (typeof e.hp === 'number' && e.hp <= 0)) return;
          const isBoss = Boolean(e.boss || e.rootBoss || e.isBoss);
          const isTarget = Boolean(game && game.target === e);
          const mName = e.name || (NC.MONSTERS && NC.MONSTERS[e.type || e.kind]?.name) || e.type || e.kind || 'มอนสเตอร์';
          const lvStr = e.lv ? ` Lv.${e.lv}` : '';
          const label = `${mName}${lvStr}`;
          if (typeof NC.drawTag === 'function') {
            NC.drawTag(ctx, label, e.x, e.y - (isBoss ? 38 : 31), isBoss ? 17 : 14, isTarget ? '#fde047' : (isBoss ? '#fbbf24' : '#fca5a5'));
          }
          if (typeof e.hp === 'number' && typeof e.maxHp === 'number' && e.maxHp > 0 && (e.hp < e.maxHp || isTarget || isBoss)) {
            const bw = isBoss ? 84 : 52;
            const bh = isBoss ? 7 : 5;
            const bx = e.x - bw / 2;
            const by = e.y + 4;
            const pct = Math.max(0, Math.min(1, e.hp / e.maxHp));
            ctx.save();
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
            ctx.fillStyle = isBoss ? '#f59e0b' : '#ef4444';
            ctx.fillRect(bx, by, Math.round(bw * pct), bh);
            ctx.restore();
          }
        });
      }

      // 3. NPC Green Dot Rendering (🟢 จุดเขียว + ชื่อ NPC) & Other Players Culling
      if (NC.partyCollect && typeof NC.partyCollect.around === 'function' && !NC.partyCollect.__pmheeLiteHooked) {
        NC.partyCollect.__pmheeLiteHooked = true;
        NC.partyCollect.around('pmhee_lite', function (next, list, visible) {
          const res = next(list, visible);
          const cfg = window.__ncPerfConfig;
          if (!cfg || !Array.isArray(list)) return res;
          const remNames = new Set();
          const npcNames = new Set();
          for (let i = list.length - 1; i >= 0; i--) {
            const a = list[i];
            if (!a) continue;
            const isNpc = Boolean(a.npc || a.storyNpc || a.forgeNpc || a.cookNpc || a.lifeNpc);
            const isRemote = Boolean(!isNpc && (a.remote || a.peer || a.isPet || a.kind === 'pet'));
            if (isNpc && a.name) npcNames.add(a.name);
            if (isRemote) {
              if (a.name) remNames.add(a.name);
              if (cfg.hideOtherPlayers) {
                list.splice(i, 1);
              }
            }
          }
          window.__ncRemoteNamesSet = remNames;
          window.__ncNpcNamesSet = npcNames;
          return res;
        });
      }

      if (NC.partyDraw && typeof NC.partyDraw.around === 'function' && !NC.partyDraw.__pmheeLiteHooked) {
        NC.partyDraw.__pmheeLiteHooked = true;
        NC.partyDraw.around('pmhee_lite', function (next, ctx, game, a) {
          if (!a) return;
          const cfg = window.__ncPerfConfig;
          const isNpc = Boolean(a.npc || a.storyNpc || a.forgeNpc || a.cookNpc || a.lifeNpc);
          const isRemote = Boolean(!isNpc && (a.remote || a.peer || a.isPet || a.kind === 'pet'));
          if (isRemote && cfg?.hideOtherPlayers) return;
          if (isNpc && cfg?.dotNpcs) {
            const rad = 12;
            const cy = a.y - 12;
            ctx.save();
            ctx.beginPath();
            ctx.arc(a.x, cy, rad, 0, Math.PI * 2);
            ctx.fillStyle = '#22c55e';
            ctx.fill();
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = '#0f172a';
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(a.x - 3, cy - 3, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = '#bbf7d0';
            ctx.fill();
            ctx.restore();
            if (a.name && typeof NC.drawTag === 'function') {
              NC.__drawingLiteNpcTag = true;
              try {
                NC.drawTag(ctx, a.name, a.x, a.y - 32, 16, '#4ade80');
              } finally {
                NC.__drawingLiteNpcTag = false;
              }
            }
            return;
          }
          if (isRemote && cfg?.dotPlayer) {
            const rad = 11;
            const cy = a.y - 12;
            ctx.save();
            ctx.beginPath();
            ctx.arc(a.x, cy, rad, 0, Math.PI * 2);
            ctx.fillStyle = '#60a5fa';
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#0f172a';
            ctx.stroke();
            ctx.restore();
            return;
          }
          return next(ctx, game, a);
        });
      }

      // 3b. Player Blue Dot Rendering (🔵 แสดงตัวละครเราเป็น "จุดฟ้า + ชื่อ" ปิดวาด Rig ตัวละคร ประหยัด CPU สูงสุด)
      if (NC.playerDraw && typeof NC.playerDraw.around === 'function' && !NC.playerDraw.__pmheeLiteHooked) {
        NC.playerDraw.__pmheeLiteHooked = true;
        NC.playerDraw.around('pmhee_lite', function (next, ctx, game) {
          if (!window.__ncPerfConfig?.dotPlayer) return next(ctx, game);
          const p = game?.player;
          if (!p) return;
          const rad = 14;
          const cy = p.y - 14;
          ctx.save();
          ctx.beginPath();
          ctx.arc(p.x, cy, rad + 4, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(p.x, cy, rad, 0, Math.PI * 2);
          ctx.fillStyle = '#0ea5e9';
          ctx.fill();
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = '#0f172a';
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(p.x - 4, cy - 4, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#bae6fd';
          ctx.fill();
          ctx.restore();
        });
      }

      if (NC.partyTags && typeof NC.partyTags.around === 'function' && !NC.partyTags.__pmheeLiteHooked) {
        NC.partyTags.__pmheeLiteHooked = true;
        NC.partyTags.around('pmhee_lite', function (next, ctx, game) {
          const cfg = window.__ncPerfConfig;
          if (cfg?.hideOtherPlayers && cfg?.dotNpcs) {
            return;
          }
          NC.__inPartyTags = true;
          try {
            return next(ctx, game);
          } finally {
            NC.__inPartyTags = false;
          }
        });
      }

      if (typeof NC.drawTag === 'function' && !NC.drawTag.__pmheeLiteWrapped) {
        const origDrawTag = NC.drawTag;
        const wrappedTag = function (ctx, text) {
          const cfg = window.__ncPerfConfig;
          if (cfg && NC.__inPartyTags && !NC.__drawingLiteNpcTag) {
            if (cfg.hideOtherPlayers && window.__ncRemoteNamesSet && window.__ncRemoteNamesSet.has(text)) {
              return;
            }
            if (cfg.dotNpcs && window.__ncNpcNamesSet && window.__ncNpcNamesSet.has(text)) {
              return;
            }
          }
          return origDrawTag.apply(this, arguments);
        };
        wrappedTag.__pmheeLiteWrapped = true;
        NC.drawTag = wrappedTag;
      }

      // 4. Effects, Particles, Damage Numbers, Trails, Pet Rigs, Hat Shine & Shadows Culling
      if (typeof NC.hatFx === 'function' && !NC.hatFx.__pmheeLiteWrapped) {
        const origHatFx = NC.hatFx;
        const wrappedHatFx = function () {
          if (window.__ncPerfConfig?.hideEffects || window.__ncPerfConfig?.dotPlayer || window.__lowPowerMode) return;
          return origHatFx.apply(this, arguments);
        };
        wrappedHatFx.__pmheeLiteWrapped = true;
        NC.hatFx = wrappedHatFx;
      }

      // CRITICAL: In Nightcamp (fx.js / vfx.js / life.js), NC.VFX.at(delay, fn) and NC.VFX.every() push timer entries
      // (`{ type: 'timer', layer: 'none', onEnd: fn }`) into NC.FX.list via NC.fxAdd.
      // When chopping trees or mining ore (`life.js` strike()), `V.at(0.2, () => impact(...))` fires `n.hit()`,
      // which clears `online/life.js` `work.landing = false` so `{ action: 'gather', kind: 'claim' }` is sent.
      // Wrapping `NC.fxAdd.run` guarantees that timer/callback entries ALWAYS enter `NC.FX.list` (even on tabs
      // hot-upgraded from v1.8.5-1.8.7 where `NC.fxAdd` already had an inner `pmhee_lite` hook), while hiding their draw layer.
      if (NC.fxAdd && typeof NC.fxAdd.run === 'function' && !NC.fxAdd.__pmheeSafeTimerRunWrapped) {
        const origFxAddRun = NC.fxAdd.__pmheeOrigRun || NC.fxAdd.run.bind(NC.fxAdd);
        NC.fxAdd.__pmheeOrigRun = origFxAddRun;
        NC.fxAdd.__pmheeSafeTimerRunWrapped = true;
        NC.fxAdd.run = function (self, args) {
          const p = args && args[0];
          const cfg = window.__ncPerfConfig;
          if (cfg && cfg.hideEffects) {
            if (!isGameplayCallbackFxEntry(p)) {
              if (p && typeof p === 'object') {
                p.t = 0;
                if (!p.layer) p.layer = 'glow';
              }
              return p || {};
            }
            try {
              Object.defineProperty(p, 'layer', { get: () => 'none', set() {}, configurable: true });
            } catch (_) {
              p.layer = 'none';
            }
            const prevHide = cfg.hideEffects;
            cfg.hideEffects = false;
            try {
              return origFxAddRun(self, args);
            } finally {
              cfg.hideEffects = prevHide;
            }
          }
          return origFxAddRun(self, args);
        };
      }

      if (NC.FX && typeof NC.FX.drawOne === 'function' && !NC.FX.drawOne.__pmheeLiteWrapped) {
        const origDrawOne = NC.FX.drawOne;
        const wrappedDrawOne = function () {
          if (window.__ncPerfConfig?.hideEffects) return;
          return origDrawOne.apply(this, arguments);
        };
        wrappedDrawOne.__pmheeLiteWrapped = true;
        NC.FX.drawOne = wrappedDrawOne;
      }

      for (const hk of ['fxDraw', 'fxNum', 'fxDmg', 'trailDraw', 'petRigDraw', 'petFalcon']) {
        if (NC[hk] && typeof NC[hk].around === 'function' && !NC[hk].__pmheeLiteHooked) {
          NC[hk].__pmheeLiteHooked = true;
          NC[hk].around('pmhee_lite', function (next) {
            if (window.__ncPerfConfig?.hideEffects) return;
            return next();
          });
        }
      }

      if (typeof NC.drawShadow === 'function' && !NC.drawShadow.__pmheeLiteWrapped) {
        const origShadow = NC.drawShadow;
        const wrappedShadow = function () {
          if (window.__ncPerfConfig?.hideEffects || window.__ncPerfConfig?.hideMapBg) return;
          return origShadow.apply(this, arguments);
        };
        wrappedShadow.__pmheeLiteWrapped = true;
        NC.drawShadow = wrappedShadow;
      }

      // 5. Audio Mute Hook (🔇 ปิดเสียงเอฟเฟกต์ & เพลงในเกมทั้งหมด ลดภาระ WebAudio Synthesizer)
      if (NC.SFX && typeof NC.SFX.play === 'function' && !NC.SFX.play.__pmheeLiteWrapped) {
        const origSfxPlay = NC.SFX.play;
        const wrappedSfxPlay = function () {
          if (window.__ncPerfConfig?.muteAudio !== false || window.__lowPowerMode) return;
          return origSfxPlay.apply(this, arguments);
        };
        wrappedSfxPlay.__pmheeLiteWrapped = true;
        NC.SFX.play = wrappedSfxPlay;
      }
      if (NC.SFX && typeof NC.SFX.loop === 'function' && !NC.SFX.loop.__pmheeLiteWrapped) {
        const origSfxLoop = NC.SFX.loop;
        const wrappedSfxLoop = function () {
          if (window.__ncPerfConfig?.muteAudio !== false || window.__lowPowerMode) return () => {};
          return origSfxLoop.apply(this, arguments);
        };
        wrappedSfxLoop.__pmheeLiteWrapped = true;
        NC.SFX.loop = wrappedSfxLoop;
      }

      // 6. HUD Update, Minimap Canvas & Day/Night Dial Throttling
      //    When Zero-Render (`พักกราฟิก`) is ON, `keeprun.js` steps `step(dt, true)` 60 times/sec which calls `NC.HUD.update(game)` 60 times/sec!
      //    Throttling `NC.hudUpdate` to 1 Hz in Zero-Render (and skipping minimap/dial canvas redraws) eliminates 98% of background DOM/Canvas CPU load!
      if (NC.hudUpdate && typeof NC.hudUpdate.around === 'function' && !NC.hudUpdate.__pmheeZeroRenderHooked) {
        NC.hudUpdate.__pmheeZeroRenderHooked = true;
        NC.hudUpdate.around('pmhee_zerorender', function (next, game) {
          if (window.__lowPowerMode) {
            const nowMs = Date.now();
            if (nowMs - (window.__ncLastZeroRenderHudAt || 0) < 1200) return;
            window.__ncLastZeroRenderHudAt = nowMs;
          }
          return next(game);
        });
      }
      if (NC.HUD && typeof NC.HUD.drawMap === 'function' && !NC.HUD.drawMap.__pmheeLiteWrapped) {
        const origDrawMap = NC.HUD.drawMap;
        const wrappedDrawMap = function () {
          if (window.__lowPowerMode) return;
          if (window.__ncPerfConfig?.hideMapBg || window.__ncPerfConfig?.hideEffects) {
            const nowMs = Date.now();
            if (nowMs - (window.__ncLastMinimapDrawAt || 0) < 550) return;
            window.__ncLastMinimapDrawAt = nowMs;
          }
          return origDrawMap.apply(this, arguments);
        };
        wrappedDrawMap.__pmheeLiteWrapped = true;
        NC.HUD.drawMap = wrappedDrawMap;
      }
      if (NC.HUD && typeof NC.HUD.drawDial === 'function' && !NC.HUD.drawDial.__pmheeLiteWrapped) {
        const origDrawDial = NC.HUD.drawDial;
        const wrappedDrawDial = function () {
          if (window.__lowPowerMode) return;
          if (window.__ncPerfConfig?.hideMapBg || window.__ncPerfConfig?.hideEffects) {
            const nowMs = Date.now();
            if (nowMs - (window.__ncLastDialDrawAt || 0) < 4000) return;
            window.__ncLastDialDrawAt = nowMs;
          }
          return origDrawDial.apply(this, arguments);
        };
        wrappedDrawDial.__pmheeLiteWrapped = true;
        NC.HUD.drawDial = wrappedDrawDial;
      }

      // 7. FPS Cap
      if (NC.Gfx && typeof NC.Gfx.skip === 'function' && !NC.Gfx.skip.__pmheeLiteWrapped) {
        const origSkip = NC.Gfx.skip;
        const wrappedSkip = function (now) {
          if (window.__lowPowerMode) return true;
          const cap = Number(window.__ncPerfConfig?.fpsCap) || 0;
          if (cap > 0 && cap < 60) {
            const minInterval = 1000 / cap;
            if (now - (window.__ncLastRenderFrameAt || 0) < minInterval - 1.5) {
              return true;
            }
            window.__ncLastRenderFrameAt = now;
          }
          return origSkip.apply(this, arguments);
        };
        wrappedSkip.__pmheeLiteWrapped = true;
        NC.Gfx.skip = wrappedSkip;
      }

      applyNightcampPerfSettings();
    } catch (_) {}
  }

  window.__setPerfConfig = function setPerfConfig(patch) {
    if (!window.__ncPerfConfig || typeof window.__ncPerfConfig !== 'object') {
      window.__ncPerfConfig = loadPerfCfg();
    }
    if (patch && typeof patch === 'object') {
      if (typeof patch.dotMonsters === 'boolean') window.__ncPerfConfig.dotMonsters = patch.dotMonsters;
      if (typeof patch.dotNpcs === 'boolean') window.__ncPerfConfig.dotNpcs = patch.dotNpcs;
      if (typeof patch.dotPlayer === 'boolean') window.__ncPerfConfig.dotPlayer = patch.dotPlayer;
      if (typeof patch.hideMapBg === 'boolean') window.__ncPerfConfig.hideMapBg = patch.hideMapBg;
      if (typeof patch.hideEffects === 'boolean') window.__ncPerfConfig.hideEffects = patch.hideEffects;
      if (typeof patch.hideOtherPlayers === 'boolean') window.__ncPerfConfig.hideOtherPlayers = patch.hideOtherPlayers;
      if (typeof patch.muteAudio === 'boolean') window.__ncPerfConfig.muteAudio = patch.muteAudio;
      if (typeof patch.trimVram === 'boolean') window.__ncPerfConfig.trimVram = patch.trimVram;
      if (patch.fpsCap !== undefined) window.__ncPerfConfig.fpsCap = Math.max(10, Math.min(60, Math.floor(Number(patch.fpsCap) || 30)));
    }
    try { localStorage.setItem('pelican_nc_perf_cfg', JSON.stringify(window.__ncPerfConfig)); } catch (_) {}
    installNightcampPerfHooks();
    applyNightcampPerfSettings();
    if (typeof window.syncAllHudInputsFromConfig === 'function') window.syncAllHudInputsFromConfig();
    return { success: true, perfConfig: window.__ncPerfConfig };
  };

  // ============================================================================
  // 1G. SECRET TRAINER ENGINE (🧲 Pull Mob ทั้งจอ & 🧲 Pull Item ทั้งจอ)
  //     Gated behind secretAccess.trainer (requested via Support Chat `/trainer`)
  // ============================================================================
  const DEFAULT_TRAINER_CFG = {
    pullMobEnabled: false,
    pullMobRadius: 1800,
    pullMobAggro: true,
    pullItemEnabled: false,
    pullItemRush: true
  };

  function loadTrainerCfg() {
    try {
      const raw = localStorage.getItem('pelican_nc_trainer_cfg');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return {
            pullMobEnabled: Boolean(parsed.pullMobEnabled),
            pullMobRadius: Math.max(300, Math.min(3000, Number(parsed.pullMobRadius) || 1800)),
            pullMobAggro: parsed.pullMobAggro !== false,
            pullItemEnabled: Boolean(parsed.pullItemEnabled),
            pullItemRush: parsed.pullItemRush !== false
          };
        }
      }
    } catch (_) {}
    return Object.assign({}, DEFAULT_TRAINER_CFG);
  }

  window.__trainerConfig = window.__trainerConfig || loadTrainerCfg();
  window.__trainerAccessUnlocked = Boolean(
    window.__trainerAccessUnlocked ||
    (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('pelican_trainer_access_unlocked') === 'true')
  );
  window.__trainerPulledItemTotal = Number(window.__trainerPulledItemTotal || 0);
  window.__trainerAggroCursor = Number(window.__trainerAggroCursor || 0);

  function syncTrainerTabVisibility() {
    const unlocked = Boolean(window.__trainerAccessUnlocked);
    const tabBtn = document.getElementById('nc-tab-btn-trainer');
    const tabBar = document.getElementById('nc-hud-tabbar');
    const paneTrainer = document.getElementById('nc-pane-trainer');
    if (tabBtn) {
      tabBtn.style.display = unlocked ? 'inline-block' : 'none';
    }
    if (tabBar) {
      tabBar.style.gridTemplateColumns = unlocked
        ? '1.05fr 0.85fr 0.85fr 0.78fr 0.85fr'
        : '1.15fr 0.95fr 0.95fr 0.85fr';
    }
    if (!unlocked && paneTrainer && paneTrainer.style.display !== 'none') {
      const botTabBtn = document.getElementById('nc-tab-btn-bot');
      if (botTabBtn) botTabBtn.click();
    }
  }

  window.__setTrainerAccessUnlocked = function setTrainerAccessUnlocked(unlocked) {
    const nextVal = Boolean(unlocked);
    const changed = window.__trainerAccessUnlocked !== nextVal;
    window.__trainerAccessUnlocked = nextVal;
    try {
      sessionStorage.setItem('pelican_trainer_access_unlocked', String(nextVal));
    } catch (_) {}
    if (!nextVal && window.__trainerConfig) {
      window.__trainerConfig.pullMobEnabled = false;
      window.__trainerConfig.pullItemEnabled = false;
      window.__trainerPullMobBurstUntil = 0;
      window.__trainerPullItemBurstUntil = 0;
    }
    syncTrainerTabVisibility();
    if (changed && typeof window.syncAllHudInputsFromConfig === 'function') {
      window.syncAllHudInputsFromConfig();
    }
    return { success: true, unlocked: nextVal };
  };

  window.__setTrainerConfig = function setTrainerConfig(patch) {
    if (!window.__trainerConfig || typeof window.__trainerConfig !== 'object') {
      window.__trainerConfig = loadTrainerCfg();
    }
    if (patch && typeof patch === 'object') {
      if (typeof patch.pullMobEnabled === 'boolean') window.__trainerConfig.pullMobEnabled = patch.pullMobEnabled;
      if (patch.pullMobRadius !== undefined) {
        window.__trainerConfig.pullMobRadius = Math.max(300, Math.min(3000, Number(patch.pullMobRadius) || 1800));
      }
      if (typeof patch.pullMobAggro === 'boolean') window.__trainerConfig.pullMobAggro = patch.pullMobAggro;
      if (typeof patch.pullItemEnabled === 'boolean') window.__trainerConfig.pullItemEnabled = patch.pullItemEnabled;
      if (typeof patch.pullItemRush === 'boolean') window.__trainerConfig.pullItemRush = patch.pullItemRush;
    }
    if (!window.__trainerAccessUnlocked) {
      window.__trainerConfig.pullMobEnabled = false;
      window.__trainerConfig.pullItemEnabled = false;
    }
    try { localStorage.setItem('pelican_nc_trainer_cfg', JSON.stringify(window.__trainerConfig)); } catch (_) {}
    installNightcampTrainerHooks();
    runTrainerEngineTick(true);
    if (typeof window.syncAllHudInputsFromConfig === 'function') window.syncAllHudInputsFromConfig();
    return { success: true, trainerConfig: window.__trainerConfig };
  };

  function pullSingleMonsterToPlayer(e, p, idx) {
    if (!e || !p) return;
    if (e._srvRealX === undefined) e._srvRealX = e.x;
    if (e._srvRealY === undefined) e._srvRealY = e.y;
    if (e._ns && Array.isArray(e._ns.buf)) {
      e._ns.buf.length = 0;
    }
    const face = p.face || 1;
    const slot = (typeof idx === 'number' ? idx : Math.abs(Number(String(e.sid || '').replace(/\D+/g, '')) || 0)) % 9;
    const ox = ((slot % 3) - 1) * 10;
    const oy = (Math.floor(slot / 3) - 1) * 8;
    const tx = p.x + face * 34 + ox;
    const ty = p.y + oy;
    e.x = tx;
    e.y = ty;
    e.tx = tx;
    e.ty = ty;
    e._pmheePulledAt = Date.now();
  }

  function pullSingleLootToPlayer(l, p, NC, nowMs) {
    if (!l || !p) return false;
    if (l._srvX === undefined) {
      l._srvX = l.fx1 !== undefined ? l.fx1 : (l.fx0 !== undefined ? l.fx0 : l.x);
      l._srvY = l.fy1 !== undefined ? l.fy1 : (l.fy0 !== undefined ? l.fy0 : l.y);
      l._bornAt = NC?.game?.time || 0;
    }
    l.noPick = 0;
    l.near = 1;
    l.onT = Math.max(l.onT || 0, 0.98);
    l.x = p.x;
    l.y = p.y;
    l.fx0 = p.x;
    l.fy0 = p.y;
    l.fx1 = p.x;
    l.fy1 = p.y;
    l.flown = true;
    if (l.sid && NC?.OnlineWorld?.pickup && nowMs - (l._trainerLastPickupAt || 0) >= 210) {
      l._trainerLastPickupAt = nowMs;
      l.asked = false;
      try {
        NC.OnlineWorld.pickup(l.sid, 'claim');
        NC.OnlineWorld.pickup(l.sid);
      } catch (_) {}
      if (!l._trainerCounted) {
        l._trainerCounted = true;
        window.__trainerPulledItemTotal = (window.__trainerPulledItemTotal || 0) + 1;
      }
      return true;
    }
    return false;
  }

  window.__triggerPullMobNow = function triggerPullMobNow() {
    if (!window.__trainerAccessUnlocked) {
      return { success: false, error: 'ไม่มีสิทธิ์ใช้งานแถบ Trainer (กรุณาพิมพ์ขอ Access ในแชทช่วยเหลือ)' };
    }
    window.__trainerPullMobBurstUntil = Date.now() + 3800;
    installNightcampTrainerHooks();
    const res = runTrainerEngineTick(true);
    return {
      success: true,
      pulledCount: res?.pulledMobs || 0,
      message: `🧲 ดึงมอนสเตอร์ทั้งจอเข้ามาหาตัวแล้ว (${res?.pulledMobs || 0} ตัว)`
    };
  };

  window.__triggerPullItemNow = function triggerPullItemNow() {
    if (!window.__trainerAccessUnlocked) {
      return { success: false, error: 'ไม่มีสิทธิ์ใช้งานแถบ Trainer (กรุณาพิมพ์ขอ Access ในแชทช่วยเหลือ)' };
    }
    window.__trainerPullItemBurstUntil = Date.now() + 3800;
    installNightcampTrainerHooks();
    const res = runTrainerEngineTick(true);
    return {
      success: true,
      pulledItems: res?.activeDrops || 0,
      message: `🧲 ดูดไอเทมดรอปทั้งจอเข้าหาตัวแล้ว (${res?.activeDrops || 0} ชิ้น)`
    };
  };

  function installNightcampTrainerHooks() {
    const NC = window.NC;
    if (!NC) return;
    try {
      // 1. Track authoritative server monster coordinates before NetSmooth / client override
      if (NC.OnlineWorld && Array.isArray(NC.OnlineWorld.monsterHooks) && !NC.OnlineWorld.__pmheeTrainerMobHooked) {
        NC.OnlineWorld.__pmheeTrainerMobHooked = true;
        NC.OnlineWorld.monsterHooks.push(function pmheeTrainerMobHook(e, m) {
          if (!e || !m) return;
          if (typeof m.x === 'number') e._srvRealX = m.x;
          if (typeof m.y === 'number') e._srvRealY = m.y;
          if (m.st) e._srvState = m.st;
          if (m.tg !== undefined) e._srvTgt = m.tg || '';
          const nowMs = Date.now();
          const pullOn = Boolean(
            window.__trainerAccessUnlocked &&
            (window.__trainerConfig?.pullMobEnabled || (window.__trainerPullMobBurstUntil || 0) > nowMs)
          );
          const game = NC.game;
          const p = game?.player;
          if (pullOn && p && game.mapId !== 'camp' && !e.dead && e.hp > 0 && !e.dummy && !e.npc) {
            const rad = Number(window.__trainerConfig?.pullMobRadius) || 1800;
            const dSrv = Math.hypot((e._srvRealX ?? e.x) - p.x, (e._srvRealY ?? e.y) - p.y);
            if (dSrv <= rad) {
              pullSingleMonsterToPlayer(e, p);
            }
          }
        });
      }

      // 2. Hook NC.enemyUpdate so every frame NetSmooth cannot push pulled monsters away from the player
      if (NC.enemyUpdate && typeof NC.enemyUpdate.around === 'function' && !NC.enemyUpdate.__pmheeTrainerHooked) {
        NC.enemyUpdate.__pmheeTrainerHooked = true;
        NC.enemyUpdate.around('pmhee_trainer_mob', function (next, e, dt, game) {
          const res = next(e, dt, game);
          const nowMs = Date.now();
          if (
            window.__trainerAccessUnlocked &&
            (window.__trainerConfig?.pullMobEnabled || (window.__trainerPullMobBurstUntil || 0) > nowMs) &&
            e && !e.dead && e.hp > 0 && !e.dummy && !e.npc &&
            game && game.mapId !== 'camp' && game.player
          ) {
            const p = game.player;
            const rad = Number(window.__trainerConfig?.pullMobRadius) || 1800;
            const sx = e._srvRealX !== undefined ? e._srvRealX : e.x;
            const sy = e._srvRealY !== undefined ? e._srvRealY : e.y;
            if (Math.hypot(sx - p.x, sy - p.y) <= rad) {
              pullSingleMonsterToPlayer(e, p);
            }
          }
          return res;
        });
      }

      // 3. Hook NC.lootUpdate so every ground drop across the screen snaps to the player & triggers instant pickup
      if (NC.lootUpdate && typeof NC.lootUpdate.around === 'function' && !NC.lootUpdate.__pmheeTrainerHooked) {
        NC.lootUpdate.__pmheeTrainerHooked = true;
        NC.lootUpdate.around('pmhee_trainer_item', function (next, game, dt) {
          const nowMs = Date.now();
          const pullItemOn = Boolean(
            window.__trainerAccessUnlocked &&
            !window.__noLootMode &&
            (window.__trainerConfig?.pullItemEnabled || (window.__trainerPullItemBurstUntil || 0) > nowMs)
          );
          const p = game?.player;
          if (pullItemOn && p && Array.isArray(game?.loot)) {
            for (const l of game.loot) {
              if (!l || l.done || (l.kind && l.kind !== 'loot')) continue;
              pullSingleLootToPlayer(l, p, NC, nowMs);
            }
          }
          const res = next(game, dt);
          if (pullItemOn && p && Array.isArray(game?.loot)) {
            for (const l of game.loot) {
              if (!l || l.done || (l.kind && l.kind !== 'loot')) continue;
              pullSingleLootToPlayer(l, p, NC, nowMs);
            }
          }
          return res;
        });
      }
    } catch (_) {}
  }

  function runTrainerEngineTick(forceNow = false) {
    const NC = window.NC;
    const game = NC?.game;
    const p = game?.player;
    if (!NC || !game || !p || !isEnteredWorld()) {
      return { pulledMobs: 0, activeDrops: 0 };
    }
    const nowMs = Date.now();
    const unlocked = Boolean(window.__trainerAccessUnlocked);
    const tc = window.__trainerConfig || DEFAULT_TRAINER_CFG;
    const pullMobActive = Boolean(unlocked && (tc.pullMobEnabled || (window.__trainerPullMobBurstUntil || 0) > nowMs));
    const pullItemActive = Boolean(unlocked && !window.__noLootMode && (tc.pullItemEnabled || (window.__trainerPullItemBurstUntil || 0) > nowMs));

    const enemies = Array.isArray(game.enemies) ? game.enemies : [];
    const aliveMobs = enemies.filter(e => e && !e.dead && e.hp > 0 && !e.dummy && !e.npc);
    const rad = Number(tc.pullMobRadius) || 1800;
    let pulledMobs = 0;
    let aggroMobs = 0;
    const aggroCandidates = [];

    for (let i = 0; i < aliveMobs.length; i++) {
      const e = aliveMobs[i];
      const sx = e._srvRealX !== undefined ? e._srvRealX : e.x;
      const sy = e._srvRealY !== undefined ? e._srvRealY : e.y;
      const dSrv = Math.hypot(sx - p.x, sy - p.y);
      if (e._srvState === 'chase' || e.state === 'chase' || dSrv <= 95) {
        aggroMobs++;
      }
      if (dSrv <= rad) {
        if (pullMobActive && game.mapId !== 'camp') {
          pullSingleMonsterToPlayer(e, p, i);
          pulledMobs++;
          if (dSrv > 70 && e.sid) {
            aggroCandidates.push({ e, sx, sy, dSrv });
          }
        }
      }
    }

    // Server Aggro-Pull Wave: tag distant monsters on the server so they enter 'chase' and converge on the player's server position
    if (pullMobActive && tc.pullMobAggro !== false && aggroCandidates.length > 0 && game.mapId !== 'camp' && p.dead <= 0) {
      if (forceNow || nowMs - (window.__trainerLastAggroPacketAt || 0) >= 240) {
        window.__trainerLastAggroPacketAt = nowMs;
        aggroCandidates.sort((a, b) => a.dSrv - b.dSrv);
        const idx = (window.__trainerAggroCursor = ((window.__trainerAggroCursor || 0) + 1) % aggroCandidates.length);
        const pick = aggroCandidates[idx] || aggroCandidates[0];
        if (pick && pick.e && pick.e.sid) {
          const ang = Math.atan2(pick.sy - p.y, pick.sx - p.x);
          try {
            NC.OnlineWorld?.attack?.(ang, pick.e.sid);
          } catch (_) {}
          // Also check if character has any learned ranged/aoe skill off cooldown to tag distant server position
          if (pick.dSrv <= 620 && NC.OnlineWorld?.skill && p.skills) {
            const hotkeys = NC.BARKEYS || ['q', 'e', 'r', 'f', '3', '4', '5', '6'];
            for (const hk of hotkeys) {
              const skId = NC.skillForKey ? NC.skillForKey(p, hk) : p.hotbar?.[hk];
              if (!skId || skId === 'pr_resurrect') continue;
              const skDef = NC.SKILLS?.[skId];
              if (!skDef || skDef.passive || skDef.kind === 'buff' || skDef.kind === 'heal') continue;
              const cd = NC.skillCd ? NC.skillCd(p, skId) : 0;
              const lv = NC.skillLv ? NC.skillLv(p, skId) : (p.skills?.[skId] || 0);
              const cost = NC.skillCost ? NC.skillCost(p, skId, lv) : 15;
              if (lv > 0 && cd <= 0 && (p.sp || 0) >= cost) {
                try {
                  NC.OnlineWorld.skill(skId, ang, pick.sx, pick.sy, pick.e.sid);
                } catch (_) {}
                break;
              }
            }
          }
        }
      }
    }

    // Pull Item Both Visually + Server Claim + Optional Magnet Rush for out-of-reach server drops
    const lootList = Array.isArray(game.loot) ? game.loot : [];
    const activeLoot = lootList.filter(l => l && !l.done && (!l.kind || l.kind === 'loot'));
    let nearestDistantDrop = null;
    let nearestDistantDist = Infinity;

    if (pullItemActive) {
      for (const l of activeLoot) {
        pullSingleLootToPlayer(l, p, NC, nowMs);
        const sx = l._srvX !== undefined ? l._srvX : l.x;
        const sy = l._srvY !== undefined ? l._srvY : l.y;
        const dSrv = Math.hypot(sx - p.x, sy - p.y);
        if (dSrv > 55 && dSrv < nearestDistantDist && (game.world?.fits ? game.world.fits(sx, sy, 14) : true)) {
          nearestDistantDist = dSrv;
          nearestDistantDrop = { l, sx, sy, dSrv };
        }
      }
      // If a drop is still sitting on the ground on the server because it dropped far away (>55px) and pullItemRush is ON,
      // steer the player to sweep over its server coordinate so the server immediately grants the pickup!
      if (tc.pullItemRush !== false && nearestDistantDrop && game.mapId !== 'camp' && p.dead <= 0 && !isAnyQuestDialogOpen()) {
        p.tx = nearestDistantDrop.sx;
        p.ty = nearestDistantDrop.sy;
      }
    }

    // Update Live Trainer Status Badges in HUD
    const mobStatusEl = document.getElementById('nc-trainer-mob-status');
    if (mobStatusEl) {
      if (pullMobActive) {
        mobStatusEl.innerHTML = `🧲 <b>สถานะ:</b> กำลังดึงมอนเข้าหาตัว <b>${pulledMobs}/${aliveMobs.length}</b> ตัว (ระยะ ${rad}px · ติด Aggro ${aggroMobs} ตัว)`;
        mobStatusEl.style.color = '#86efac';
      } else {
        mobStatusEl.innerHTML = `🎯 <b>มอนในหน้าจอตอนนี้:</b> ${aliveMobs.length} ตัว (ติด Aggro ${aggroMobs} ตัว) · ปิดการดึงอยู่`;
        mobStatusEl.style.color = '#cbd5e1';
      }
    }
    const itemStatusEl = document.getElementById('nc-trainer-item-status');
    if (itemStatusEl) {
      if (pullItemActive) {
        itemStatusEl.innerHTML = `🧲 <b>สถานะ:</b> กำลังดูดไอเทมทั้งจอ (บนพื้น <b>${activeLoot.length}</b> ชิ้น · ดูดเข้าตัวสะสม <b>${(window.__trainerPulledItemTotal || 0).toLocaleString()}</b> ชิ้น)`;
        itemStatusEl.style.color = '#fde68a';
      } else {
        itemStatusEl.innerHTML = `💎 <b>ไอเทมบนพื้นตอนนี้:</b> ${activeLoot.length} ชิ้น · ดูดเข้าตัวสะสม <b>${(window.__trainerPulledItemTotal || 0).toLocaleString()}</b> ชิ้น`;
        itemStatusEl.style.color = '#cbd5e1';
      }
    }

    return { pulledMobs, totalMobs: aliveMobs.length, aggroMobs, activeDrops: activeLoot.length, totalPulledItems: window.__trainerPulledItemTotal || 0 };
  }

  window.__ncPerfHooksInterval = setInterval(() => {
    installNightcampPerfHooks();
    try { installNightcampTrainerHooks(); } catch (_) {}
    try { installUpgradeBotAiHooks(); } catch (_) {}
    try { installDualHotbarAndSkillDragHooks(); } catch (_) {}
  }, 1000);
  window.__ncTrainerFastInterval = setInterval(() => {
    try { runTrainerEngineTick(false); } catch (_) {}
  }, 220);
  setTimeout(() => {
    installNightcampPerfHooks();
    try { installNightcampTrainerHooks(); } catch (_) {}
    try { installUpgradeBotAiHooks(); } catch (_) {}
    try { installDualHotbarAndSkillDragHooks(); } catch (_) {}
  }, 150);

  window.__setTargetFarmMap = function setTargetFarmMap(mapId) {
    window.__targetFarmMap = String(mapId || 'auto').trim() || 'auto';
    try { localStorage.setItem('pelican_target_farm_map', window.__targetFarmMap); } catch (_) {}
    targetMapWarpState.map = '';
    targetMapWarpState.warpTriedAt = 0;
    targetMapWarpState.warpAttempts = 0;
    try {
      const NC = window.NC;
      const g = NC?.game;
      if (g && !window.__smartAutoQuestEnabled && window.__targetFarmMap !== 'auto' && g.mapId !== window.__targetFarmMap) {
        if (NC.QuestAuto?.on) NC.QuestAuto.stop?.('เปลี่ยนแมพฟาร์มประจำ');
        if (NC.Auto?.on) {
          if (typeof NC.Auto.stop === 'function') NC.Auto.stop(g);
          else if (typeof NC.Auto.toggle === 'function') NC.Auto.toggle(g);
        }
        if (NC.Travel?.on && NC.Travel.target?.map !== window.__targetFarmMap) {
          NC.Travel.stop?.('');
        }
      }
      if (window.__isBotRunning && !window.__smartAutoQuestEnabled) {
        setTimeout(() => { try { runPlanEngineTick(); } catch (_) {} }, 50);
      }
    } catch (_) {}
    renderHudState();
    return { success: true, targetFarmMap: window.__targetFarmMap };
  };

  window.__applyScriptPlan = function applyScriptPlan(plan, enable) {
    if (plan && typeof plan === 'object') {
      try { upgradeBuiltinPlanZombieTriggersIfNeeded(plan); } catch (_) {}
      window.__currentScriptPlan = plan;
      try { localStorage.setItem('pelican_script_plan', JSON.stringify(plan)); } catch (_) {}
    } else if (plan === null) {
      window.__currentScriptPlan = JSON.parse(JSON.stringify(DEFAULT_NC_WOLF_PLAN));
    }
    if (typeof enable === 'boolean') {
      window.__planScriptEnabled = enable;
      try {
        localStorage.setItem('pelican_plan_script_enabled', String(enable));
        localStorage.setItem('pelican_plan_user_disabled', String(!enable));
      } catch (_) {}
      if (enable) {
        try {
          if (typeof isEnteredWorld === 'function' && isEnteredWorld()) {
            if (!window.__isBotRunning && typeof window.startMasterBot === 'function') {
              window.startMasterBot();
            }
          } else if (typeof window.executeAutoLogin === 'function' && window.__authConfig?.enabled !== false) {
            setTimeout(() => { window.executeAutoLogin(false).catch(() => {}); }, 150);
          }
        } catch (_) {}
      }
    }
    renderHudState();
    return { success: true, enabled: window.__planScriptEnabled, planName: window.__currentScriptPlan?.name || null };
  };

  // ============================================================================
  // 2. AUTO-LOGIN, AUTO-REGISTER (@GMAIL.COM) & AUTO-FARM LV.20 CONFIG
  // ============================================================================
  const AETHERIA_NAME_WORDS = {
    prefix: [
      'lnw', 'Pro', 'God', 'King', 'Baby', 'Master', 'Lord', 'Boss', 'Dark', 'Shadow',
      'Ghost', 'Blood', 'Demon', 'Chaos', 'Void', 'Phantom', 'Cyber', 'Neon', 'Apex',
      'Viper', 'Silent', 'Lucky', 'Mini', 'Big', 'Little', 'Sweet', 'Crazy', 'Wild'
    ],
    tag: [
      'cxllme', 'teary', 'lost', 'saddest', 'deadly', 'zodiac', 'mafia', 'gang',
      'nightmare', 'lonely', 'sleepy', 'broken', 'silent', 'hxrt', 'nxbody', 'cold',
      'lazy', 'tired', 'sxdboy', 'midnight', 'blue', 'mxrning', 'xoxo', 'sxul', 'velvet'
    ],
    core: [
      'Dragon', 'Tiger', 'Phoenix', 'Wolf', 'Hawk', 'Snake', 'Lion', 'Panther', 'Raven',
      'Thunder', 'Frost', 'Flame', 'Sniper', 'Gamer', 'Player', 'Glitch', 'Assassin',
      'Knight', 'Samurai', 'Ninja', 'Warrior', 'Guardian', 'Reaper', 'Stalker', 'Slayer',
      'Archer', 'Bard', 'Hunter', 'Ranger', 'Arrow', 'Storm', 'Moon', 'Star', 'Sky',
      'Rain', 'Fox', 'Bear', 'Cat'
    ],
    thai: [
      'ศูนย์', 'หมอก', 'นิ่ง', 'ฝน', 'เงา', 'เกือบตึง', 'บังเอิญ', 'แจกแต้ม', 'ง่วง',
      'ขี้เกียจ', 'หิวข้าว', 'เด็กดี', 'คนเดิม', 'ตัวตึง', 'สายฟ้า', 'จันทร์', 'ดาว',
      'ลมหนาว', 'ทะเล', 'ภูเขา', 'นักธนู', 'ไม่ไหว'
    ],
    nick: [
      'Tee', 'Bank', 'Boom', 'Non', 'Zen', 'Beam', 'Win', 'First', 'Nut', 'Gun', 'Phu',
      'Pond', 'Dome', 'Earth', 'Mix', 'Mind', 'Ice', 'Mild', 'Nam', 'Fon', 'Pleng',
      'Cream', 'View', 'Ton', 'Pete', 'Fluke', 'Mark', 'Top', 'Off', 'Ohm', 'Fiat',
      'Tar', 'Arm', 'Bas', 'Jay', 'Kao', 'Mew', 'Nine', 'Pang', 'Plai', 'Ploy',
      'Praew', 'Toey', 'June', 'Fah', 'Ning', 'Kwan', 'Mook', 'Bow', 'Gift'
    ],
    suffix: ['Za', '007', '99', 'VIP', 'Gaming', 'GG', 'TH', 'BKK', '777', '888', '999', 'Z', 'X', 'THX', 'Jr', 'Kung', 'Nakub', 'Ja']
  };

  window.__generateNightcampCharName = function generateNightcampCharName(minLen = 5, maxLen = 12) {
    const pick = a => a[Math.floor(Math.random() * a.length)];
    const num = () => String(Math.random() < 0.5 ? Math.floor(Math.random() * 90) + 10 : Math.floor(Math.random() * 900) + 100);
    const W = AETHERIA_NAME_WORDS;
    const patterns = [
      () => pick(W.tag) + pick(W.nick),
      () => pick(W.tag) + pick(W.core),
      () => pick(W.prefix) + pick(W.core),
      () => pick(W.prefix) + pick(W.core) + pick(W.suffix),
      () => pick(W.nick) + num(),
      () => pick(W.tag) + num(),
      () => pick(W.core) + pick(W.suffix),
      () => pick(W.thai) + pick(W.suffix),
      () => pick(W.thai) + pick(W.nick),
      () => pick(W.nick) + pick(W.core),
      () => pick(W.nick) + pick(W.suffix),
      () => pick(W.prefix) + pick(W.nick),
      () => pick(W.thai) + num()
    ];
    for (let i = 0; i < 60; i++) {
      let n = pick(patterns)();
      if (/^[a-z]/.test(n) || Math.random() < 0.15) n = n.replace(/[A-Z]/g, c => c.toLowerCase());
      const len = [...n].length;
      if (len >= minLen && len <= maxLen && /^[\u0E00-\u0E7FA-Za-z0-9]+$/.test(n) && n.toLowerCase() !== 'traveler') {
        return n;
      }
    }
    return (pick(W.nick) + pick(W.core) + num()).slice(0, maxLen);
  };

  window.__generateNightcampEmail = function generateNightcampEmail() {
    const pick = a => a[Math.floor(Math.random() * a.length)].toLowerCase();
    const W = AETHERIA_NAME_WORDS;
    const n1 = pick(W.nick);
    const n2 = Math.random() < 0.5 ? pick(W.core) : pick(W.tag);
    const digits = Math.floor(1000 + Math.random() * 9000);
    const sep = Math.random() < 0.45 ? '.' : '';
    const local = `${n1}${sep}${n2}${digits}`.replace(/[^a-z0-9.]/g, '');
    return `${local}@gmail.com`;
  };

  window.__generateNightcampPassword = function generateNightcampPassword() {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let s = 'Pm';
    for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
    s += String(Math.floor(10 + Math.random() * 89));
    return s;
  };

  window.__generateNightcampIdentity = function generateNightcampIdentity(serverName) {
    return {
      serverName: String(serverName || window.__authConfig?.serverName || 'Nightfall').trim() || 'Nightfall',
      username: window.__generateNightcampEmail(),
      password: window.__generateNightcampPassword(),
      charName: window.__generateNightcampCharName(),
      register: true,
      generatedUser: true,
      autoCreateChar: true,
      autoResumeBot: true
    };
  };

  const DEFAULT_AUTOFARM_LV20_CFG = {
    enabled: false,
    role: 'farmer',          // 'farmer' | 'receiver'
    targetLevel: 20,
    receiverCharName: '',
    tradeChannel: 1,
    tradeCompleted: false,
    tradedCoins: 0,
    mailClaimed: false
  };

  function loadAutoFarmLv20Cfg() {
    try {
      const saved = JSON.parse(localStorage.getItem('pelican_autofarm_lv20_cfg') || 'null');
      return Object.assign({}, DEFAULT_AUTOFARM_LV20_CFG, (saved && typeof saved === 'object') ? saved : {});
    } catch (_) {
      return Object.assign({}, DEFAULT_AUTOFARM_LV20_CFG);
    }
  }
  window.__autoFarmLv20Config = loadAutoFarmLv20Cfg();

  function saveAutoFarmLv20Cfg(patch) {
    if (!window.__autoFarmLv20Config || typeof window.__autoFarmLv20Config !== 'object') {
      window.__autoFarmLv20Config = loadAutoFarmLv20Cfg();
    }
    if (patch && typeof patch === 'object') {
      Object.assign(window.__autoFarmLv20Config, patch);
    }
    try {
      localStorage.setItem('pelican_autofarm_lv20_cfg', JSON.stringify(window.__autoFarmLv20Config));
    } catch (_) {}
    return window.__autoFarmLv20Config;
  }

  window.__setAutoFarmLv20Config = function setAutoFarmLv20Config(patch) {
    const cfg = saveAutoFarmLv20Cfg(patch);
    if (cfg.enabled) {
      // Force economy protection: never spend coins on potions or repairs, and enable Smart Auto-Quest + Plan Script while < targetLevel
      window.__smartAutoQuestEnabled = true;
      window.__planScriptEnabled = true;
      window.__smartGearEnabled = true;
      window.__upgradeBotAiEnabled = true;
      window.__autoRespawnEnabled = true;
      try {
        localStorage.setItem('pelican_smart_autoquest_enabled', 'true');
        localStorage.setItem('pelican_plan_script_enabled', 'true');
        localStorage.setItem('pelican_plan_user_disabled', 'false');
      } catch (_) {}
    }
    renderHudState();
    return { success: true, autoFarmLv20: cfg };
  };

  const DEFAULT_AUTH_CFG = {
    enabled: true,
    serverName: '',
    username: '',
    password: '',
    charName: '',
    register: false,
    generatedUser: false,
    autoCreateChar: true,
    autoResumeBot: true,
    userEditedAt: 0,
    verifiedLoginAt: 0
  };

  function attachAuthCfgEnableGuard(cfgObj) {
    if (!cfgObj || typeof cfgObj !== 'object') return cfgObj;
    let internalEnabled = cfgObj.userDisabledAutoLogin ? false : (cfgObj.enabled !== false);
    try {
      Object.defineProperty(cfgObj, 'enabled', {
        enumerable: true,
        configurable: true,
        get() {
          if (this.userDisabledAutoLogin || window.__ncUserDisabledAutoLogin) return false;
          return Boolean(internalEnabled);
        },
        set(v) {
          if (!v) {
            internalEnabled = false;
            this.userDisabledAutoLogin = true;
            window.__ncUserDisabledAutoLogin = true;
          } else if (window.__ncAllowEnableAutoLogin || (!this.userDisabledAutoLogin && !window.__ncUserDisabledAutoLogin)) {
            internalEnabled = true;
            this.userDisabledAutoLogin = false;
            window.__ncUserDisabledAutoLogin = false;
          }
        }
      });
    } catch (_) {}
    return cfgObj;
  }

  function loadAuthCfg() {
    try {
      const savedAuth = JSON.parse(localStorage.getItem('pelican_auth_cfg') || 'null');
      const obj = Object.assign({}, DEFAULT_AUTH_CFG, (savedAuth && typeof savedAuth === 'object') ? savedAuth : {});
      if (obj.enabled === false) {
        obj.userDisabledAutoLogin = true;
        window.__ncUserDisabledAutoLogin = true;
      }
      return attachAuthCfgEnableGuard(obj);
    } catch (_) {
      return attachAuthCfgEnableGuard(Object.assign({}, DEFAULT_AUTH_CFG));
    }
  }

  window.__authConfig = loadAuthCfg();

  function saveAuthCfg(patch, isUserEdit = false) {
    if (!window.__authConfig || typeof window.__authConfig !== 'object') {
      window.__authConfig = attachAuthCfgEnableGuard(Object.assign({}, DEFAULT_AUTH_CFG));
    } else {
      attachAuthCfgEnableGuard(window.__authConfig);
    }
    if (patch && typeof patch === 'object') {
      if (patch.enabled === true) {
        window.__ncAllowEnableAutoLogin = true;
      }
      try {
        Object.assign(window.__authConfig, patch);
      } finally {
        window.__ncAllowEnableAutoLogin = false;
      }
    }
    if (isUserEdit) {
      window.__authConfig.userEditedAt = Date.now();
      window.__authConfig.generatedUser = false;
      window.__authConfig.register = false;
      delete window.__authConfig.registerError;
      window.__ncLastFailedAuthKey = '';
    }
    try {
      localStorage.setItem('pelican_auth_cfg', JSON.stringify(window.__authConfig));
    } catch (_) {}
  }

  if (!window.__nightcampWsWrapped && typeof window.WebSocket === 'function') {
    window.__nightcampWsWrapped = true;
    const OrigWS = window.WebSocket;
    window.WebSocket = function NightcampWrappedWS(url, protocols) {
      const ws = protocols !== undefined ? new OrigWS(url, protocols) : new OrigWS(url);
      try {
        window.__nightcampSockets.push({ url: String(url), createdAt: Date.now(), ws });
        ws.addEventListener('message', ev => {
          try {
            const len = typeof ev.data === 'string' ? ev.data.length : (ev.data?.byteLength || 0);
            window.__packetLogs.push({ dir: 'in', url: String(url), len, at: Date.now() });
            if (window.__packetLogs.length > 200) window.__packetLogs.shift();
          } catch (_) {}
        });
      } catch (_) {}
      return ws;
    };
    window.WebSocket.prototype = OrigWS.prototype;
    Object.keys(OrigWS).forEach(k => { try { window.WebSocket[k] = OrigWS[k]; } catch (_) {} });
  }

  let activeHudTab = 'bot';

  function parseRatio(text) {
    const m = String(text || '').match(/([\d,]+)\s*\/\s*([\d,]+)/);
    if (!m) return { cur: null, max: null };
    return {
      cur: Number(m[1].replace(/,/g, '')),
      max: Number(m[2].replace(/,/g, ''))
    };
  }

  function isServerPickerOpen() {
    const ssRoot = document.querySelector('body > .ss-root');
    return Boolean((window.NC?.ServerSelect && window.NC.ServerSelect.open) || (ssRoot && !ssRoot.hidden));
  }

  function isLobbyOpenNow() {
    const csRoot = document.querySelector('body > .cs-root');
    const sqDoorOpen = Boolean(window.NC?.SqDoor?.view && window.NC.SqDoor.view() !== '');
    return Boolean((csRoot && !csRoot.hidden) || sqDoorOpen);
  }

  function isEnteredWorld() {
    if (
      channelSwitchInFlight ||
      window.NC?.OnlineChannels?.busy === true ||
      window.NC?.Online?.status === 'channel' ||
      window.NC?.Online?.status === 'transferring'
    ) {
      return true;
    }
    return Boolean(
      window.NC?.OnlineLobby?.entered === true &&
      window.NC?.OnlineWorld?.ready !== false &&
      !isServerPickerOpen() &&
      !isLobbyOpenNow()
    );
  }

  const KNOWN_NC_SERVERS = [
    { id: 'nightfall', no: 3, name: 'Nightfall', url: 'https://d2997ztpjqsywh.cloudfront.net', status: 'open', from: 'list' },
    { id: 'moonlight', no: 4, name: 'Moonlight', url: 'https://d2a61hdgyafpnr.cloudfront.net', status: 'open', from: 'list' },
    { id: 'stardust', no: 5, name: 'Stardust', url: 'https://dyshge8p0zgba.cloudfront.net', status: 'open', from: 'list' },
    { id: 'sunflare', no: 6, name: 'Sunflare', url: 'https://d1feuao0oi57id.cloudfront.net', status: 'maintenance', from: 'list' }
  ];

  function getCurrentServerLabel() {
    try {
      const O = window.NC?.Online;
      const origin = String(O?.origin || '').replace(/\/+$/, '').toLowerCase();
      if (origin) {
        const dynList = Array.isArray(window.NC?.ServerSelect?.list) ? window.NC.ServerSelect.list : [];
        const dynMatch = dynList.find(s => String(s?.url || '').replace(/\/+$/, '').toLowerCase() === origin);
        if (dynMatch && dynMatch.name) return String(dynMatch.name).trim();
        const knownMatch = KNOWN_NC_SERVERS.find(s => s.url.toLowerCase() === origin);
        if (knownMatch) return knownMatch.name;
      }
      const domTxt = (
        document.querySelector('#sq [data-f="srvn"]')?.textContent ||
        document.querySelector('.cs-acct .cs-srv span')?.textContent ||
        ''
      ).replace(/^เซิร์ฟเวอร์\s*:\s*/i, '').trim();
      if (domTxt && !/cloudfront\.net/i.test(domTxt)) return domTxt;
      if (O?.origin && window.NC?.ServerSelect?.label) {
        const lbl = String(window.NC.ServerSelect.label(O.origin) || '').trim();
        if (lbl && !/cloudfront\.net/i.test(lbl)) return lbl;
      }
    } catch (_) {}
    return '';
  }

  function parseNightcampInGameStats() {
    const out = {
      charName: null,
      charClass: null,
      jobId: null,
      baseLv: null,
      jobLv: null,
      hp: null,
      hpMax: null,
      sp: null,
      spMax: null,
      zeny: 0,
      weight: '--'
    };
    try {
      const p = window.NC?.game?.player;
      if (p) {
        if (p.name) out.charName = String(p.name);
        if (p.job) {
          out.jobId = String(p.job);
          out.charClass = window.NC?.JOBS?.[p.job]?.name || String(p.job);
        }
        if (typeof p.lv === 'number') out.baseLv = p.lv;
        if (typeof p.jobLv === 'number') out.jobLv = p.jobLv;
        if (typeof p.hp === 'number') out.hp = Math.round(p.hp);
        if (typeof p.d?.maxHp === 'number') out.hpMax = Math.round(p.d.maxHp);
        if (typeof p.sp === 'number') out.sp = Math.round(p.sp);
        if (typeof p.d?.maxSp === 'number') out.spMax = Math.round(p.d.maxSp);
        if (typeof p.coins === 'number') out.zeny = p.coins;
        else if (typeof p.gold === 'number') out.zeny = p.gold;
      }

      const liveVault = window.NC?.PremiumOnline?.state?.()?.vault;
      if (liveVault && typeof liveVault.coins === 'number') {
        window.__lastKnownVaultCoins = liveVault.coins;
      }
      out.vaultCoins = typeof window.__lastKnownVaultCoins === 'number' ? window.__lastKnownVaultCoins : null;

      const sqHud = document.querySelector('#sq .hud');
      if (!out.zeny) {
        const coinTxt = (sqHud?.querySelector('[data-f="coins"], [data-f="gold"]')?.textContent || document.querySelector('#coins, #gold')?.textContent || '').replace(/[^\d]/g, '');
        if (coinTxt) out.zeny = Number(coinTxt) || 0;
      }
      if (!out.charName) {
        const rawName = (sqHud?.querySelector('[data-f="name"]')?.textContent || document.querySelector('#cname')?.textContent || '').trim();
        if (rawName && rawName !== '…' && rawName !== '...') out.charName = rawName;
      }
      if (!out.charClass) {
        const rawJob = (sqHud?.querySelector('[data-f="job"]')?.textContent || document.querySelector('#cjob')?.textContent || '').trim();
        if (rawJob) out.charClass = rawJob;
      }
      if (out.baseLv == null) {
        const lvTxt = (sqHud?.querySelector('[data-f="lv"]')?.textContent || document.querySelector('#clv')?.textContent || '').trim();
        const lvsTxt = (sqHud?.querySelector('[data-f="lvs"]')?.textContent || '').trim();
        if (/^\d+$/.test(lvTxt)) out.baseLv = Number(lvTxt);
        else {
          const bm = lvsTxt.match(/\bLv\.?\s*(\d+)/i);
          if (bm) out.baseLv = Number(bm[1]);
        }
      }
      if (out.jobLv == null) {
        const cjlvTxt = (document.querySelector('#cjlv')?.textContent || '').trim();
        const lvsTxt = (sqHud?.querySelector('[data-f="lvs"]')?.textContent || '').trim();
        if (/^\d+$/.test(cjlvTxt)) out.jobLv = Number(cjlvTxt);
        else {
          const jm = lvsTxt.match(/Job\s*Lv\.?\s*(\d+)/i);
          if (jm) out.jobLv = Number(jm[1]);
        }
      }
      if (out.hp == null) {
        const hpR = parseRatio(sqHud?.querySelector('[data-f="hpt"]')?.textContent || document.querySelector('#hptext')?.textContent);
        out.hp = hpR.cur;
        out.hpMax = hpR.max;
      }
      if (out.sp == null) {
        const spR = parseRatio(sqHud?.querySelector('[data-f="spt"]')?.textContent || document.querySelector('#sptext')?.textContent);
        out.sp = spR.cur;
        out.spMax = spR.max;
      }
      const wtTxt = (sqHud?.querySelector('[data-f="wt"]')?.textContent || '').trim();
      if (wtTxt) {
        const r = parseRatio(wtTxt);
        if (r.cur != null && r.max > 0) out.weight = Math.round((r.cur / r.max) * 100) + '%';
        else out.weight = wtTxt;
      }
    } catch (_) {}
    return out;
  }

  window.getCharacterName = function getCharacterName() {
    const st = parseNightcampInGameStats();
    return st.charName || window.__authConfig?.charName || 'hero';
  };

  function setInputValueReactSafe(el, value) {
    if (!el) return;
    const str = String(value == null ? '' : value);
    if (el.value !== str) el.value = str;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  let autoLoginBusy = false;
  let lastSubmitAt = 0;
  let lastSubmittedAuthKey = '';
  let lastServerClickAt = 0;
  let lastServerSwitchAt = 0;
  let lastCharEnterAt = 0;

  function setAuthStatus(msg, tone) {
    window.__ncAuthStatusText = msg || '';
    const el = document.getElementById('nc-auth-status');
    if (el) {
      el.textContent = msg || 'Auto-Login: พร้อมทำงาน';
      el.style.color = tone === 'error' ? '#fca5a5' : (tone === 'ok' ? '#6ee7b7' : (tone === 'warn' ? '#fde68a' : '#94a3b8'));
    }
  }

  function setPlanTaskStatus(msg) {
    window.__planActiveTask = msg || '';
    const el = document.getElementById('nc-plan-task-status');
    if (el) {
      el.textContent = msg || '🧭 พร้อมทำงาน';
    }
  }

  window.executeAutoLogin = async function executeAutoLogin(force = false) {
    const cfg = window.__authConfig || (window.__authConfig = loadAuthCfg());
    if (force) {
      window.__ncLastFailedAuthKey = '';
      lastSubmittedAuthKey = '';
      lastSubmitAt = 0;
      lastServerClickAt = 0;
      lastServerSwitchAt = 0;
      lastCharEnterAt = 0;
    }

    if (isEnteredWorld()) {
      window.__ncLastFailedAuthKey = '';
      window.__ncQueueCancelledOnDisable = false;
      setAuthStatus('✅ เข้าสู่โลกเกมแล้ว', 'ok');
      if ((cfg.autoResumeBot || window.__planScriptEnabled || window.__autoFarmLv20Config?.enabled) && !window.__autoResumedThisSession) {
        window.__autoResumedThisSession = true;
        window.startMasterBot();
      }
      return { success: true, phase: 'in_game' };
    }

    // CRITICAL: When OnlineLobby.entered === true or conn.js is actively in world/reconnecting/queuing/switching,
    // NEVER run OnlineLobby.restart(), OnlineServers.pick(), Online.logout(), or OnlineLobby.act() — let conn.js keep its queue place!
    const onlineSt = String(window.NC?.Online?.status || '');
    const csRootPre = document.querySelector('body > .cs-root:not([hidden])');
    const preQueueTxt = (csRootPre?.querySelector('.cs-msg')?.textContent || '').trim();
    const isInQueueOrEntering = Boolean(
      (window.NC?.OnlineLobby?.entered === true && ['online', 'reconnecting', 'connecting', 'syncing', 'checking', 'transferring', 'channel'].includes(onlineSt)) ||
      (!force && /เซิร์ฟเวอร์เต็ม|server\s*full|คิวที่|กำลังเข้าเกม|กำลังโหลดโลก|กำลังตรวจเครื่อง/i.test(preQueueTxt))
    );
    if (isInQueueOrEntering) {
      setAuthStatus('⏳ ' + (preQueueTxt || 'กำลังเชื่อมต่อ/รอคิวเข้าเซิร์ฟเวอร์อัตโนมัติ...'), 'warn');
      return { success: false, phase: 'reconnecting_or_queue' };
    }

    if (!cfg.enabled && !force) {
      if (!window.__ncQueueCancelledOnDisable) {
        const csRootNow = document.querySelector('body > .cs-root:not([hidden])');
        const playBtnNow = csRootNow?.querySelector('.cs-play');
        const msgTxtNow = (csRootNow?.querySelector('.cs-msg')?.textContent || '').trim();
        if ((playBtnNow && playBtnNow.disabled) || /เซิร์ฟเวอร์เต็ม|คิวที่|กำลังเข้าเกม/i.test(msgTxtNow)) {
          window.__ncQueueCancelledOnDisable = true;
          try { window.NC?.OnlineLobby?.restart?.(); } catch (_) {}
        }
      }
      setAuthStatus('Auto-Login: ปิดอยู่ (เลือกหรือสร้างตัวละครเองได้เลย)', 'muted');
      return { success: false, skipped: 'disabled' };
    }
    window.__ncQueueCancelledOnDisable = false;

    if (autoLoginBusy) return { success: false, busy: true };
    autoLoginBusy = true;

    try {
      const targetServer = String(cfg.serverName || '').trim();
      const username = String(cfg.username || '').trim();
      const password = String(cfg.password || '');
      const charName = String(cfg.charName || '').trim();

      if (isServerPickerOpen()) {
        const ssRoot = document.querySelector('body > .ss-root');
        const cards = ssRoot ? Array.from(ssRoot.querySelectorAll('.ss-card')) : [];
        if (cards.length === 0) {
          setAuthStatus('⏳ กำลังโหลดรายชื่อเซิร์ฟเวอร์...', 'warn');
          return { success: false, phase: 'server_loading' };
        }
        let targetCard = null;
        if (targetServer) {
          const want = targetServer.toLowerCase();
          targetCard = cards.find(c => (c.querySelector('.ss-nm')?.textContent || '').trim().toLowerCase() === want)
            || cards.find(c => (c.querySelector('.ss-nm')?.textContent || '').trim().toLowerCase().includes(want));
          if (!targetCard) {
            setAuthStatus('⚠️ ไม่พบเซิร์ฟเวอร์ "' + targetServer + '"', 'warn');
            return { success: false, phase: 'server_not_found' };
          }
          if (targetCard.classList.contains('maint') || targetCard.classList.contains('off')) {
            setAuthStatus('⚠️ เซิร์ฟ ' + targetServer + ' ปิดปรับปรุง/ติดต่อไม่ได้', 'warn');
            return { success: false, phase: 'server_unavailable' };
          }
        } else {
          targetCard = cards.find(c => c.classList.contains('sel') && !c.classList.contains('maint') && !c.classList.contains('off'))
            || cards.find(c => c.querySelector('.ss-last') && !c.classList.contains('maint') && !c.classList.contains('off'))
            || cards.find(c => !c.classList.contains('maint') && !c.classList.contains('off'));
          if (!targetCard) {
            setAuthStatus('⚠️ ไม่มีเซิร์ฟเวอร์เปิดให้บริการ', 'warn');
            return { success: false, phase: 'no_open_server' };
          }
        }

        const chosenName = (targetCard.querySelector('.ss-nm')?.textContent || '').trim();
        if (!targetCard.classList.contains('sel')) {
          targetCard.click();
          setAuthStatus('🌐 เลือกเซิร์ฟเวอร์ ' + chosenName, 'warn');
          return { success: true, phase: 'server_selected', server: chosenName };
        }
        const goBtn = ssRoot.querySelector('.ss-go');
        if (goBtn && !goBtn.disabled && Date.now() - lastServerClickAt > 2500) {
          lastServerClickAt = Date.now();
          setAuthStatus('🚀 กำลังเข้าเซิร์ฟเวอร์ ' + chosenName + '...', 'warn');
          goBtn.click();
          return { success: true, phase: 'server_entering', server: chosenName };
        }
        return { success: false, phase: 'server_waiting' };
      }

      const csRoot = document.querySelector('body > .cs-root');
      const sqDoorOpen = Boolean(window.NC?.SqDoor?.view && window.NC.SqDoor.view() !== '');
      if (!csRoot || (csRoot.hidden && !sqDoorOpen && !window.NC?.OnlineLobby?.slots)) {
        setAuthStatus('⏳ กำลังโหลดหน้าจอล็อกอิน...', 'muted');
        return { success: false, phase: 'loading' };
      }

      if (targetServer) {
        const curSrv = getCurrentServerLabel();
        if (!curSrv || curSrv.toLowerCase() !== targetServer.toLowerCase()) {
          let srvList = (Array.isArray(window.NC?.ServerSelect?.list) && window.NC.ServerSelect.list.length > 0)
            ? window.NC.ServerSelect.list
            : null;
          if (!srvList && typeof window.NC?.OnlineServers?.list === 'function') {
            try { srvList = await window.NC.OnlineServers.list(); } catch (_) {}
          }
          if (!Array.isArray(srvList) || srvList.length === 0) {
            srvList = KNOWN_NC_SERVERS;
          }
          const wantLow = targetServer.toLowerCase();
          const matchSrv = srvList.find(s => String(s?.name || s?.id || '').trim().toLowerCase() === wantLow)
            || srvList.find(s => String(s?.name || s?.id || '').trim().toLowerCase().includes(wantLow))
            || KNOWN_NC_SERVERS.find(s => s.name.toLowerCase() === wantLow || s.id === wantLow);
          const curOrigin = String(window.NC?.Online?.origin || '').replace(/\/+$/, '').toLowerCase();
          const wantOrigin = String(matchSrv?.url || '').replace(/\/+$/, '').toLowerCase();

          if (matchSrv && matchSrv.status !== 'maintenance' && matchSrv.state !== 'maintenance' && wantOrigin && curOrigin !== wantOrigin) {
            if (Date.now() - lastServerSwitchAt > 3500) {
              lastServerSwitchAt = Date.now();
              window.__ncDeviceRotatedForSignup = false;
              lastSubmittedAuthKey = '';
              lastSubmitAt = 0;
              setAuthStatus('🌐 กำลังสลับไปเซิร์ฟเวอร์ ' + (matchSrv.name || targetServer) + '...', 'warn');
              if (typeof window.NC?.OnlineServers?.pick === 'function') {
                try {
                  window.NC.OnlineServers.pick(Object.assign({ from: 'list' }, matchSrv));
                  if (window.NC?.ServerSelect?.open && typeof window.NC.ServerSelect.close === 'function') {
                    window.NC.ServerSelect.close();
                  }
                  return { success: true, phase: 'switched_server_direct', server: matchSrv.name || targetServer };
                } catch (_) {}
              }
              if (typeof window.NC?.ServerSelect?.show === 'function') {
                window.NC.ServerSelect.show();
                return { success: true, phase: 'switching_server' };
              }
            }
            return { success: false, phase: 'switching_server_wait' };
          }
        }
      }

      const termsBox = csRoot.querySelector('.cs-termsbox');
      if (termsBox && !termsBox.hidden) {
        const okCb = termsBox.querySelector('.cs-terms-ok');
        const goBtn = termsBox.querySelector('.cs-terms-go');
        if (okCb && !okCb.checked) {
          okCb.checked = true;
          okCb.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (goBtn && !goBtn.disabled) {
          goBtn.click();
          setAuthStatus('📜 ยอมรับข้อตกลงเกมอัตโนมัติ...', 'warn');
          return { success: true, phase: 'terms_accepted' };
        }
        return { success: false, phase: 'terms_wait' };
      }

      const delBox = csRoot.querySelector('.cs-del');
      if (delBox && !delBox.hidden) {
        return { success: false, phase: 'manual_dialog' };
      }

      // Check if Character Creator is currently open (either legacy .cr-root or PC SQ creator)
      const crUp = Boolean(window.NC?.Creator?.isUp || (document.querySelector('.cr-root:not([hidden])')?.offsetWidth > 0));
      if (crUp && window.NC?.Creator) {
        const existingCharsCount = (window.NC?.OnlineLobby?.slots?.slots || []).filter(s => s && !s.empty).length;
        // If user opened Character Creator on an account that ALREADY has >= 1 character (or Auto-Login/autoCreateChar is off), never hijack manual creation!
        if (!cfg.enabled || cfg.autoCreateChar === false || (existingCharsCount > 0 && !force)) {
          setAuthStatus('🎨 โหมดสร้างตัวละครใหม่ด้วยตัวเอง (Auto-Login พักชั่วคราว)...', 'warn');
          return { success: false, phase: 'manual_creator' };
        }
        const v = typeof window.NC.Creator.view === 'function' ? window.NC.Creator.view() : null;
        if (v && v.sending) {
          setAuthStatus('⏳ กำลังสร้างตัวละครเข้าสู่โลกเกม...', 'warn');
          return { success: false, phase: 'char_creating' };
        }
        let wantName = String(cfg.charName || '').trim();
        const hasNameErr = Boolean(v && v.err && v.errBad && window.__ncLastCreatorNameTried === wantName);
        if (!wantName || hasNameErr) {
          wantName = window.__generateNightcampCharName();
          saveAuthCfg({ charName: wantName }, false);
          if (typeof window.syncAllHudInputsFromConfig === 'function') window.syncAllHudInputsFromConfig();
        }
        if (v && v.asking) {
          if (typeof window.NC.Creator.askYes === 'function') {
            window.NC.Creator.askYes();
            setAuthStatus('✨ ยืนยันสร้างตัวละคร "' + wantName + '" เข้าเกม...', 'ok');
            return { success: true, phase: 'char_created_confirm', charName: wantName };
          }
        }
        if (Date.now() - (window.__ncLastCreatorStepAt || 0) < 1500) {
          return { success: false, phase: 'char_create_cooldown' };
        }
        window.__ncLastCreatorStepAt = Date.now();
        window.__ncLastCreatorNameTried = wantName;
        if (!window.__ncLookRandomizedOnce && typeof window.NC.Creator.random === 'function') {
          window.__ncLookRandomizedOnce = true;
          try { window.NC.Creator.random(); } catch (_) {}
        }
        if (typeof window.NC.Creator.setName === 'function') {
          window.NC.Creator.setName(wantName);
        }
        if (typeof window.NC.Creator.go === 'function') {
          window.NC.Creator.go();
          const vAfter = typeof window.NC.Creator.view === 'function' ? window.NC.Creator.view() : null;
          if (vAfter && vAfter.asking && typeof window.NC.Creator.askYes === 'function') {
            window.NC.Creator.askYes();
          }
        }
        setAuthStatus('🎨 กำลังตั้งชื่อและสร้างตัวละคร "' + wantName + '"...', 'warn');
        return { success: true, phase: 'char_creating_submit', charName: wantName };
      }

      const acct = window.NC?.Online?.account;
      const isSignedIn = Boolean(acct && acct.kind && acct.kind !== 'device');
      if (isSignedIn && username && !cfg.generatedUser) {
        const signedInEmail = String(acct?.email || acct?.username || acct?.user || acct?.name || csRoot.querySelector('.cs-acct-name')?.textContent || '').trim();
        const normAcctBase = u => String(u || '').trim().toLowerCase().replace(/@(gmail\.com|users\.nightcamp\.invalid)$/, '');
        const isTrueMismatch = Boolean(
          signedInEmail &&
          signedInEmail.toLowerCase() !== username.toLowerCase() &&
          normAcctBase(signedInEmail) !== normAcctBase(username) &&
          (signedInEmail.includes('@') || !signedInEmail.includes(' '))
        );
        if (isTrueMismatch && (force || !window.NC?.OnlineLobby?.entered)) {
          try { await window.NC?.Online?.logout?.(); } catch (_) {}
          lastSubmittedAuthKey = '';
          lastSubmitAt = 0;
          setAuthStatus('🔄 สลับบัญชีจาก ' + signedInEmail + ' เป็น ' + username + '...', 'warn');
          return { success: true, phase: 'switching_account', from: signedInEmail, to: username };
        }
      }
      const closedBox = csRoot.querySelector('.cs-closedbox');
      if (closedBox && !closedBox.hidden) {
        setAuthStatus('⚠️ เซิร์ฟเวอร์ปิดรับสมัครชั่วคราว', 'warn');
        return { success: false, phase: 'closed' };
      }

      const loginBox = csRoot.querySelector('.cs-loginbox');
      if (!isSignedIn) {
        const aeTop = document.activeElement;
        const userTypingHudAuth = Boolean(aeTop && (aeTop.id === 'p-auth-user' || aeTop.id === 'p-auth-pass' || aeTop.id === 'p-auth-char'));
        if (!force && userTypingHudAuth) {
          return { success: false, phase: 'user_typing_hud_auth' };
        }

        let curUser = username;
        let curPass = password;
        if (curUser && !curUser.includes('@')) {
          curUser = curUser + '@gmail.com';
          saveAuthCfg({ username: curUser }, false);
        }
        const confirmedNotFoundForCurUser = Boolean(
          curUser &&
          window.__ncConfirmedNotFoundUser &&
          String(window.__ncConfirmedNotFoundUser).toLowerCase() === curUser.toLowerCase()
        );
        // Rule: If ID + Password are both filled in, ALWAYS try Login (เข้าสู่ระบบ) FIRST!
        // Only enter Register (สมัครสมาชิก) mode if:
        //  (a) Login already confirmed "ไม่พบบัญชีนี้" for this exact curUser, OR
        //  (b) ID/Password is still blank and auto-register (cfg.register / cfg.generatedUser) is requested.
        const hasBothCreds = Boolean(curUser && curPass);
        const isRegMode = hasBothCreds
          ? Boolean(confirmedNotFoundForCurUser && !cfg.registerDone)
          : Boolean(
              (cfg.generatedUser && !cfg.registerDone && !cfg.verifiedLoginAt) ||
              (cfg.register && !cfg.registerDone)
            );
        if (hasBothCreds && !confirmedNotFoundForCurUser && cfg.register) {
          saveAuthCfg({ register: false }, false);
        }
        const rotateNightcampGuestDevice = async () => {
          try {
            const newUuid = (typeof crypto !== 'undefined' && crypto.randomUUID)
              ? crypto.randomUUID()
              : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
                  const r = (Math.random() * 16) | 0;
                  return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
                });
            window.__pmDeviceId = newUuid;
            try { window.localStorage?.setItem?.('aetheria.device', newUuid); } catch (_) {}
            try { window.NC?.Online?.store?.set?.('nightcamp.online.device', newUuid.replace(/-/g, '')); } catch (_) {}
            await window.NC?.Online?.deviceSession?.();
          } catch (_) {}
        };

        if (isRegMode && (!curUser || !curPass)) {
          const gen = window.__generateNightcampIdentity(targetServer);
          const wasBlankUser = !curUser;
          curUser = curUser || gen.username;
          curPass = (curPass && curPass.length >= 8) ? curPass : gen.password;
          window.__ncConfirmedNotFoundUser = curUser.toLowerCase();
          saveAuthCfg({
            username: curUser,
            password: curPass,
            charName: cfg.charName || gen.charName,
            register: true,
            registerDone: false,
            generatedUser: wasBlankUser ? true : false
          }, false);
          if (typeof window.syncAllHudInputsFromConfig === 'function') window.syncAllHudInputsFromConfig();
        }

        if (!curUser || !curPass) {
          setAuthStatus('⏳ รอรับข้อมูล ID / Password จาก Manager (หรือกรอกในหน้าตั้งค่า)...', 'warn');
          return { success: false, phase: 'missing_creds' };
        }
        const csForm = csRoot.querySelector('.cs-form');
        const sqDoorForErr = document.querySelector('#sq [data-p="door"]');
        const curErr = ((csForm?.querySelector('.cs-err')?.textContent || '') || (sqDoorForErr?.querySelector('[data-f="err"]')?.textContent || '')).trim();
        const attemptKey = [window.NC?.Online?.origin || '', targetServer, isRegMode ? 'reg' : 'login', curUser, curPass].join('|');

        if (curErr && lastSubmittedAuthKey === attemptKey) {
          // If ANY entered ID + Password does not exist in the system yet, auto-switch to signup and register that exact ID + Password!
          if (!isRegMode && /ไม่พบบัญชี|กดสมัครสมาชิก|ไม่มีบัญชี|ไม่พบอีเมล|not\s*found|no\s*account|does\s*not\s*exist/i.test(curErr)) {
            window.__ncConfirmedNotFoundUser = curUser.toLowerCase();
            saveAuthCfg({ register: true, registerDone: false, generatedUser: false }, false);
            lastSubmittedAuthKey = '';
            lastSubmitAt = 0;
            window.__ncLastFailedAuthKey = '';
            setAuthStatus('📝 ไม่พบ ID ' + curUser + ' ในระบบ -> สมัครสมาชิกด้วย ID/Password เดิมให้อัตโนมัติ...', 'warn');
            return { success: false, phase: 'switch_to_signup' };
          }
          if (isRegMode && /ผูกอีเมลแล้ว/i.test(curErr)) {
            await rotateNightcampGuestDevice();
            window.__ncDeviceRotatedForSignup = true;
            if (csForm?.querySelector('.cs-err')) csForm.querySelector('.cs-err').textContent = '';
            if (sqDoorForErr?.querySelector('[data-f="err"]')) sqDoorForErr.querySelector('[data-f="err"]').textContent = '';
            if (window.NC?.SqDoor?.press) {
              try { window.NC.SqDoor.press('d-tab', { dataset: { m: 'signup' } }); } catch (_) {}
            }
            lastSubmittedAuthKey = '';
            lastSubmitAt = 0;
            window.__ncLastFailedAuthKey = '';
            setAuthStatus('🔄 รีเซ็ต Device Session ใหม่เพื่อสมัครบัญชี...', 'warn');
            return { success: false, phase: 'rotated_device_session' };
          }
          if (isRegMode && /ถูกใช้|ซ้ำ|มีบัญชี|ไม่ถูกต้อง|already|taken|exists/i.test(curErr)) {
            if (cfg.generatedUser) {
              await rotateNightcampGuestDevice();
              const nextMail = window.__generateNightcampEmail();
              saveAuthCfg({ username: nextMail, register: true, registerDone: false }, false);
              if (typeof window.syncAllHudInputsFromConfig === 'function') window.syncAllHudInputsFromConfig();
              if (csForm?.querySelector('.cs-err')) csForm.querySelector('.cs-err').textContent = '';
              if (sqDoorForErr?.querySelector('[data-f="err"]')) sqDoorForErr.querySelector('[data-f="err"]').textContent = '';
              lastSubmittedAuthKey = '';
              lastSubmitAt = 0;
              window.__ncLastFailedAuthKey = '';
              setAuthStatus('♻️ อีเมลซ้ำ -> สุ่มอีเมลใหม่ ' + nextMail, 'warn');
              return { success: false, phase: 'reroll_email', username: nextMail };
            } else {
              saveAuthCfg({ register: false }, false);
              if (typeof window.syncAllHudInputsFromConfig === 'function') window.syncAllHudInputsFromConfig();
              lastSubmittedAuthKey = '';
              lastSubmitAt = 0;
              setAuthStatus('🔄 อีเมลนี้สมัครแล้ว -> สลับเป็นเข้าสู่ระบบปกติ...', 'warn');
              return { success: false, phase: 'switch_to_login' };
            }
          }
          window.__ncLastFailedAuthKey = attemptKey;
          setAuthStatus('❌ ' + curErr, 'error');
          return { success: false, phase: 'login_error', error: curErr };
        }
        if (window.__ncLastFailedAuthKey === attemptKey && !force) {
          setAuthStatus('❌ ' + (curErr || 'เข้าสู่ระบบไม่ผ่าน (แก้รหัสหรือกด Test Login)'), 'error');
          return { success: false, phase: 'login_halted' };
        }

        if (isRegMode && !window.__ncDeviceRotatedForSignup) {
          window.__ncDeviceRotatedForSignup = true;
          await rotateNightcampGuestDevice();
        }

        const wantFormMode = isRegMode ? 'signup' : 'login';
        if (!loginBox || loginBox.hidden || window.NC?.OnlineLobby?.formMode !== wantFormMode) {
          if (window.NC?.OnlineLobby && typeof window.NC.OnlineLobby.form === 'function') {
            window.NC.OnlineLobby.form(wantFormMode);
            setAuthStatus(isRegMode ? '📝 กำลังเปิดหน้าต่างสมัครสมาชิก (@gmail.com)...' : '🔑 กำลังเปิดหน้าต่างเข้าสู่ระบบ...', 'warn');
            return { success: true, phase: 'opening_auth_form', mode: wantFormMode };
          }
          return { success: false, phase: 'no_lobby_form' };
        }

        const formTermsRow = csForm?.querySelector('.cs-terms:not([hidden]) .cs-terms-row:not([hidden]) .cs-terms-ok')
          || csForm?.querySelector('.cs-terms-ok');
        if (formTermsRow && !formTermsRow.checked) {
          formTermsRow.checked = true;
          formTermsRow.dispatchEvent(new Event('change', { bubbles: true }));
        }

        const sqDoor = document.querySelector('#sq [data-p="door"]');
        const sqUser = sqDoor?.querySelector('input[data-i="user"]');
        const sqPass = sqDoor?.querySelector('input[data-i="pass"]');
        const sqPass2 = sqDoor?.querySelector('input[data-i="pass2"]');
        const csUser = csForm?.querySelector('.cs-user');
        const csPass = csForm?.querySelector('.cs-pass');
        const okBtn = csForm?.querySelector('.cs-ok');

        if (okBtn && okBtn.disabled) {
          setAuthStatus(isRegMode ? '🔄 กำลังสมัครสมาชิกใหม่...' : '🔄 กำลังตรวจสอบ ID / Password...', 'warn');
          return { success: false, phase: 'login_submitting' };
        }
        if (Date.now() - lastSubmitAt < 4000) {
          return { success: false, phase: 'login_cooldown' };
        }

        if (sqUser) setInputValueReactSafe(sqUser, curUser);
        if (csUser && csUser.value !== curUser) setInputValueReactSafe(csUser, curUser);
        if (sqPass) setInputValueReactSafe(sqPass, curPass);
        if (sqPass2) setInputValueReactSafe(sqPass2, curPass);
        if (csPass && csPass.value !== curPass) setInputValueReactSafe(csPass, curPass);

        lastSubmittedAuthKey = attemptKey;
        lastSubmitAt = Date.now();
        window.__ncLastFailedAuthKey = '';
        setAuthStatus((isRegMode ? '📝 กำลังสมัครสมาชิกใหม่ด้วย ' : '🔓 กำลังเข้าสู่ระบบด้วย ID ') + curUser + '...', 'warn');

        if (window.NC?.SqDoor?.view?.() === 'form') {
          window.NC.SqDoor.press('d-ok');
        } else if (csForm && typeof csForm.requestSubmit === 'function') {
          csForm.requestSubmit();
        } else if (okBtn) {
          okBtn.click();
        }
        return { success: true, phase: isRegMode ? 'register_submitted' : 'login_submitted' };
      }

      // Signed in! If we were in register mode, mark registration done so future reloads log in normally
      if (cfg.register) {
        saveAuthCfg({ register: false, registerDone: true, verifiedLoginAt: Date.now() }, false);
        if (typeof window.syncAllHudInputsFromConfig === 'function') window.syncAllHudInputsFromConfig();
      }

      const slotsObj = window.NC?.OnlineLobby?.slots;
      if (!slotsObj || !Array.isArray(slotsObj.slots)) {
        setAuthStatus('⏳ กำลังโหลดรายชื่อตัวละคร (' + (acct.name || 'Signed In') + ')...', 'warn');
        return { success: false, phase: 'loading_slots' };
      }

      const filled = slotsObj.slots.filter(s => s && !s.empty);
      if (filled.length === 0) {
        if (cfg.autoCreateChar !== false || cfg.registerDone || window.__autoFarmLv20Config?.enabled || window.__planScriptEnabled) {
          if (Date.now() - lastCharEnterAt < 2500) {
            return { success: false, phase: 'char_create_open_cooldown' };
          }
          lastCharEnterAt = Date.now();
          if (!cfg.charName) {
            const genName = window.__generateNightcampCharName();
            saveAuthCfg({ charName: genName }, false);
            if (typeof window.syncAllHudInputsFromConfig === 'function') window.syncAllHudInputsFromConfig();
          }
          setAuthStatus('✨ บัญชีใหม่ยังไม่มีตัวละคร -> กำลังเปิดหน้าสร้างตัวละคร "' + (cfg.charName || '') + '"...', 'warn');
          if (typeof window.NC?.OnlineLobby?.act === 'function') {
            window.NC.OnlineLobby.act(0);
          }
          if (!window.NC?.Creator?.isUp && typeof window.NC?.Creator?.open === 'function' && window.NC?.game) {
            try { window.NC.Creator.open(window.NC.game, { mode: 'new' }); } catch (_) {}
          }
          return { success: true, phase: 'opening_char_creator' };
        }
        setAuthStatus('⚠️ บัญชีนี้ยังไม่มีตัวละครในเซิร์ฟเวอร์นี้', 'warn');
        return { success: false, phase: 'no_characters' };
      }

      // If the user manually clicked an empty slot (ช่องที่ 2/3 · ว่าง) while existing characters exist, do NOT yank them back into an existing character!
      const userPickedEmptySlot = Boolean(csRoot.querySelector('.cs-plate.empty.on') || csRoot.querySelector('.cs-card.empty:not([hidden])'));
      if (userPickedEmptySlot && !force) {
        setAuthStatus('🎨 เลือกช่องว่างสร้างตัวละครใหม่ (กด "+ สร้างตัวละคร" ได้เลย)...', 'warn');
        return { success: false, phase: 'manual_empty_slot_selected' };
      }

      let targetSlot = null;
      if (charName) {
        const want = charName.toLowerCase();
        targetSlot = filled.find(s => String(s.name || '').trim().toLowerCase() === want);
        if (!targetSlot) {
          // Fallback to first existing character on this account and sync charName
          targetSlot = filled[0];
          if (targetSlot && targetSlot.name) {
            saveAuthCfg({ charName: targetSlot.name }, false);
          }
        }
      } else {
        targetSlot = (slotsObj.slots[slotsObj.active] && !slotsObj.slots[slotsObj.active].empty)
          ? slotsObj.slots[slotsObj.active]
          : filled[0];
        if (targetSlot && targetSlot.name) {
          saveAuthCfg({ charName: targetSlot.name }, false);
        }
      }

      const playBtn = csRoot.querySelector('.cs-play');
      const noteText = ((document.getElementById('ncnote')?.textContent || '') + '\n' + (csRoot.textContent || '')).trim();
      const queueMatch = noteText.match(/(?:เซิร์ฟเวอร์เต็ม|Server full)[^\n]*/i);
      if (queueMatch || (playBtn && playBtn.disabled && !force)) {
        setAuthStatus('⏳ ' + (queueMatch ? queueMatch[0].trim() : 'กำลังรอคิวเข้าเซิร์ฟเวอร์...'), 'warn');
        return { success: false, phase: 'server_queue_waiting' };
      }

      if (Date.now() - lastCharEnterAt < 3500) {
        return { success: false, phase: 'char_enter_cooldown' };
      }

      lastCharEnterAt = Date.now();
      setAuthStatus('🎮 กำลังเข้าเล่นตัวละคร ' + (targetSlot.name || ('Slot #' + targetSlot.slot)) + '...', 'ok');
      if (slotsObj.active !== targetSlot.slot && typeof window.NC.OnlineLobby.pick === 'function') {
        window.NC.OnlineLobby.pick(targetSlot.slot);
      }
      if (typeof window.NC.OnlineLobby.act === 'function') {
        window.NC.OnlineLobby.act(targetSlot.slot);
      } else if (playBtn && !playBtn.disabled) {
        playBtn.click();
      }
      return { success: true, phase: 'char_entering', charName: targetSlot.name || '' };
    } finally {
      autoLoginBusy = false;
    }
  };

  // ============================================================================
  // 3. SMART AUTO-QUEST & PLAN SCRIPT EXECUTION ENGINE (NIGHTCAMP v1.3.0)
  // ============================================================================
  function getPlanStateKey(plan) {
    const charName = window.getCharacterName() || 'hero';
    const planId = (plan && (plan.id || plan.name)) || 'default';
    return 'pelican_plan_state_' + charName + '_' + planId;
  }

  function loadPlanState(plan) {
    try {
      const raw = JSON.parse(localStorage.getItem(getPlanStateKey(plan)) || 'null');
      if (raw && typeof raw === 'object') {
        if (!raw.done) raw.done = {};
        if (!raw.pending) raw.pending = {};
        return raw;
      }
    } catch (_) {}
    return { done: {}, pending: {}, activeMode: null };
  }

  function savePlanState(plan, st) {
    try {
      localStorage.setItem(getPlanStateKey(plan), JSON.stringify(st));
    } catch (_) {}
  }

  function countBagItem(p, itemId) {
    const NC = window.NC;
    if (!p || !itemId) return 0;
    if ((itemId === 'red' || itemId === 'blue' || itemId === 'yellow') && NC?.POT?.count) {
      return Number(NC.POT.count(p, itemId)) || 0;
    }
    if (typeof NC?.matCount === 'function') {
      const mc = Number(NC.matCount(p, itemId)) || 0;
      if (mc > 0 || /^lf_|^sd_|^mt_/.test(itemId)) return mc;
    }
    if (!Array.isArray(p.inv)) return 0;
    return p.inv.filter(it => it && it.id === itemId).reduce((sum, it) => sum + (it.qty || 1), 0);
  }

  // ============================================================================
  // ⚔️ SMART GEAR ENGINE (Job-Aware & Stat-Weighted Auto Equipment Upgrader)
  // ============================================================================
  let lastSmartGearCheckAt = 0;
  let lastSmartGearSignature = '';

  function setSmartGearNote(msg) {
    window.__lastSmartGearNote = msg;
    const el = document.getElementById('nc-smart-gear-status');
    if (el) el.textContent = msg;
  }

  function getJobStatProfile(p) {
    const NC = window.NC;
    const curJob = String(p?.job || 'traveler').toLowerCase();
    const rootJob = (NC?.jobRoot ? NC.jobRoot(curJob) : curJob) || curJob;
    const plan = window.__currentScriptPlan || DEFAULT_NC_WOLF_PLAN;
    const plannedC1 = String(plan?.class1Target || 'priest').toLowerCase();
    const effectiveRoot = (curJob === 'traveler' || curJob === 'novice')
      ? (window.__planScriptEnabled && plannedC1 ? plannedC1 : (() => {
          const b = p?.base || {};
          const top = [['int', 'priest'], ['dex', 'archer'], ['agi', 'rogue'], ['str', 'knight'], ['vit', 'knight']]
            .sort((a, z) => (Number(b[z[0]]) || 1) - (Number(b[a[0]]) || 1))[0];
          return (top && (Number(b[top[0]]) || 1) > 5) ? top[1] : 'priest';
        })())
      : (rootJob || curJob);

    const isMonk = curJob === 'monk' || curJob === 'meteorfist';
    const isMagic = !isMonk && (effectiveRoot === 'mage' || effectiveRoot === 'priest');
    const isSupport = !isMonk && effectiveRoot === 'priest';
    const isArcher = effectiveRoot === 'archer';
    const isRogue = effectiveRoot === 'rogue' || curJob === 'swordmaster' || curJob === 'starblade';

    let statWeights;
    let armorLine = 'rg';
    let offWeight = 1.05;
    let defWeight = 0.85;
    let isCrit = false;
    let isAutoAtk = false;
    let isSkillUser = false;

    if (isSupport) {
      statWeights = { int: 2.2, vit: 1.7, dex: 1.4, agi: 0.5, luk: 0.5, str: 0.2 };
      armorLine = 'mg';
      offWeight = 0.95;
      defWeight = 1.1;
      isSkillUser = true;
    } else if (isMagic) {
      statWeights = { int: 2.4, dex: 1.5, vit: 0.9, luk: 0.6, agi: 0.4, str: 0.1 };
      armorLine = 'mg';
      offWeight = 1.2;
      defWeight = 0.75;
      isSkillUser = true;
    } else if (isMonk) {
      statWeights = { str: 2.1, agi: 1.7, vit: 1.3, dex: 1.4, luk: 0.9, int: 0.7 };
      armorLine = 'lt';
      offWeight = 1.15;
      defWeight = 0.9;
      isCrit = true;
      isAutoAtk = true;
    } else if (isArcher) {
      statWeights = { dex: 2.3, agi: 1.9, luk: 1.6, vit: 0.8, int: 0.4, str: 0.3 };
      armorLine = 'rg';
      offWeight = 1.2;
      defWeight = 0.75;
      isCrit = true;
      isAutoAtk = true;
    } else if (isRogue) {
      statWeights = { agi: 2.1, str: 1.9, dex: 1.5, luk: 1.7, vit: 0.8, int: 0.3 };
      armorLine = 'lt';
      offWeight = 1.18;
      defWeight = 0.8;
      isCrit = true;
      isAutoAtk = true;
    } else {
      // Knight / Paladin / Dragonknight / Berserker / Traveler
      statWeights = { str: 2.1, vit: 1.8, dex: 1.4, agi: 1.2, luk: 0.7, int: 0.3 };
      armorLine = 'hv';
      offWeight = 1.05;
      defWeight = 1.05;
      isAutoAtk = true;
    }

    // Boost weights slightly toward stats the player actually invested in p.base
    const b = p?.base || {};
    for (const k of ['str', 'agi', 'vit', 'int', 'dex', 'luk']) {
      const invested = Math.max(0, (Number(b[k]) || 1) - 1);
      if (invested > 0) {
        statWeights[k] = (statWeights[k] || 0.5) + Math.min(0.8, invested * 0.015);
      }
    }

    const JOB_PRIMARY_WEAPONS = {
      // Rogue family
      rogue: ['dagger', 'sword'],
      assassin: ['katar', 'dagger'],
      eclipse: ['katar', 'dagger'],
      shinobi: ['huuma'],
      shadowlord: ['huuma'],
      reaper: ['scythe', 'sickle'],
      harvester: ['scythe', 'sickle'],
      puppeteer: ['puppet', 'wire'],
      showmaster: ['puppet', 'wire'],
      // Archer family
      archer: ['bow'],
      ranger: ['xbow', 'bow'],
      moonsniper: ['xbow', 'bow'],
      wolfhunter: ['bow'],
      packalpha: ['bow'],
      bard: ['instrument', 'whip'],
      maestro: ['instrument', 'whip'],
      gunslinger: ['pistol', 'shotgun'],
      outlaw: ['pistol', 'shotgun'],
      // Mage family
      mage: ['staff', 'orb'],
      archmage: ['staff', 'orb'],
      starcore: ['staff', 'orb'],
      firemage: ['staff', 'orb'],
      blazelord: ['staff', 'orb'],
      icemage: ['staff', 'orb'],
      winterlord: ['staff', 'orb'],
      warlock: ['lantern', 'staff', 'orb'],
      hexlord: ['lantern', 'staff', 'orb'],
      // Priest family
      priest: ['staff', 'mace'],
      bishop: ['book', 'staff', 'mace'],
      starsaint: ['book', 'staff', 'mace'],
      monk: ['knuckle', 'qstaff'],
      meteorfist: ['knuckle', 'qstaff'],
      lightkeeper: ['torch'],
      beacon: ['torch'],
      wisp: ['bell'],
      starshepherd: ['bell'],
      // Knight family
      knight: ['sword', 'gsword', 'spear', 'axe'],
      paladin: ['mace', 'sword', 'spear', 'axe'],
      dawnwarden: ['mace', 'sword', 'spear', 'axe'],
      dragonknight: ['lance', 'spear'],
      dragonbound: ['lance', 'spear'],
      berserker: ['gaxe', 'hammer', 'gsword', 'axe'],
      bloodmoon: ['gaxe', 'hammer', 'gsword', 'axe'],
      swordmaster: ['dsword', 'sword', 'gsword'],
      starblade: ['dsword', 'sword', 'gsword']
    };

    const jobSkills = new Set(typeof NC?.jobSkills === 'function' ? (NC.jobSkills(p) || []) : (NC?.JOBS?.[curJob]?.skills || []));
    const c2Job = (NC?.JOBS?.[curJob]?.tier === 3 && NC?.JOBS?.[curJob]?.from) ? String(NC.JOBS[curJob].from).toLowerCase() : curJob;
    let primaryList = JOB_PRIMARY_WEAPONS[curJob] || JOB_PRIMARY_WEAPONS[c2Job] || null;
    if (!primaryList && NC?.JOB_WEAPONS) {
      const own = NC.JOB_WEAPONS[c2Job] || NC.JOB_WEAPONS[curJob];
      if (Array.isArray(own) && own.length > 0) primaryList = own;
    }

    // Refine primary weapon list based on specific learned skills that require a single weapon sub-type
    const learnedLv = (sid) => Number((NC?.skillRaw || NC?.skillLv)?.(p, sid) || p?.skills?.[sid] || 0);
    if (c2Job === 'assassin' && learnedLv('as_twin') > 0 && learnedLv('as_dual') === 0) {
      primaryList = ['katar'];
    } else if (c2Job === 'warlock' && (learnedLv('wl_swing') > 0 || learnedLv('wl_drain') > 0 || learnedLv('wl_blaze') > 0)) {
      primaryList = ['lantern'];
    } else if (c2Job === 'ranger') {
      if (learnedLv('rg_snipe') > 0 && learnedLv('rg_storm') === 0 && learnedLv('rg_triple') === 0) {
        primaryList = ['xbow', 'bow'];
      } else if (learnedLv('rg_storm') > 0 || learnedLv('rg_triple') > 0) {
        primaryList = ['bow', 'xbow'];
      }
    } else if (c2Job === 'puppeteer') {
      if (learnedLv('pp_edge') > 0 || learnedLv('pp_bind') >= 3) {
        primaryList = ['wire', 'puppet'];
      } else {
        primaryList = ['puppet'];
      }
    } else if (c2Job === 'bard') {
      if (learnedLv('bd_lure') >= 3 || learnedLv('bd_firefly') >= 3 || learnedLv('bd_lash') >= 2) {
        primaryList = ['whip', 'instrument'];
      } else {
        primaryList = ['instrument', 'whip'];
      }
    } else if (c2Job === 'berserker') {
      if (learnedLv('bk_whirlwind') > 0 || learnedLv('bk_guillotine') > 0 || learnedLv('bk_crosscut') >= 2) {
        primaryList = ['gsword', 'gaxe', 'hammer'];
      } else {
        primaryList = ['gaxe', 'hammer', 'axe', 'gsword'];
      }
    }

    let allowedWtypes = primaryList ? new Set(primaryList) : null;
    let preferredWtypes = primaryList ? new Set([primaryList[0], ...primaryList]) : null;
    if ((curJob === 'traveler' || curJob === 'novice') && typeof NC?.jobWeaponTypes === 'function') {
      try { preferredWtypes = new Set(Array.from(NC.jobWeaponTypes(effectiveRoot) || [])); } catch (_) {}
    }

    // User-selected Smart Gear Weapon Type override (e.g., 'sword', 'gsword', 'puppet', 'wire', 'staff', 'orb', 'pistol', 'shotgun', etc.)
    const explicitWt = String((window.__smartGearWeaponType && window.__smartGearWeaponType !== 'auto' ? window.__smartGearWeaponType : (plan?.preferredWeaponType || 'auto'))).trim().toLowerCase();
    if (explicitWt && explicitWt !== 'auto') {
      allowedWtypes = new Set([explicitWt]);
      preferredWtypes = new Set([explicitWt]);
    }

    return {
      curJob,
      c2Job,
      effectiveRoot,
      isMagic,
      isSupport,
      isCrit,
      isAutoAtk,
      isSkillUser,
      statWeights,
      armorLine,
      offWeight,
      defWeight,
      jobSkills,
      allowedWtypes,
      preferredWtypes,
      explicitWt: (explicitWt && explicitWt !== 'auto') ? explicitWt : ''
    };
  }

  function doesWeaponSatisfyRule(wt, ruleList) {
    if (!Array.isArray(ruleList) || ruleList.length === 0) return true;
    const T = window.NC?.WTYPES?.[wt] || {};
    return ruleList.some(k =>
      k === wt ||
      (k === 'melee' && T.m) ||
      ((k === 'oneh' || k === 'free') && T.h === 1 && T.m) ||
      (k === 'shield' && T.h === 1)
    );
  }

  function evaluateWeaponSkillFitness(p, wt, profile) {
    const NC = window.NC;
    if (!NC || !p || !wt || !profile) return { unlocked: 0, locked: 0, bonus: 0 };
    const rules = NC.WEAPON_RULES || {};
    const learnedOf = (sid) => Number((NC.skillRaw || NC.skillLv)?.(p, sid) || p?.skills?.[sid] || 0);
    const c2Skills = new Set([
      ...(NC.JOBS?.[profile.curJob]?.skills || []),
      ...(NC.JOBS?.[profile.c2Job]?.skills || [])
    ]);
    const checkList = c2Skills.size > 0 ? Array.from(c2Skills) : Array.from(profile.jobSkills || []);
    const isCasterPriest = (profile.curJob === 'priest' || profile.c2Job === 'bishop') &&
      learnedOf('bi_battlehymn') === 0 && learnedOf('bi_mercy') === 0;
    let unlocked = 0;
    let locked = 0;
    let bonus = 0;
    for (const sid of checkList) {
      const R = rules[sid];
      if (!R) continue;
      // Don't let physical Mace Mastery penalize Staff on a Caster Priest/Bishop
      if (isCasterPriest && sid === 'pr_macemastery' && learnedOf('pr_macemastery') <= 3) continue;
      // Don't let Puppeteer's free Lv.1 `pp_stretch` (wire skill) penalize `puppet` (`ไม้เชิดหุ่น` + shield) unless wire skills (`pp_edge` or `pp_bind` >= 3) are invested
      if ((profile.curJob === 'puppeteer' || profile.c2Job === 'puppeteer') && (sid === 'pp_stretch' || sid === 'pp_bind') && learnedOf('pp_edge') === 0 && learnedOf('pp_bind') < 3) continue;
      const lv = learnedOf(sid);
      if (lv <= 0) continue;
      const weight = 3;
      if (Array.isArray(R.n) && R.n.length > 0) {
        if (doesWeaponSatisfyRule(wt, R.n)) unlocked += weight;
        else locked += weight;
      }
      if (Array.isArray(R.b) && R.b.length > 0 && doesWeaponSatisfyRule(wt, R.b)) {
        bonus += weight;
      }
    }
    return { unlocked, locked, bonus };
  }

  function computePieceClassSynergy(p, pieceObj, profile) {
    const NC = window.NC;
    if (!pieceObj || !profile) return 0;
    let syn = 0;
    const all = pieceObj.all || pieceObj.stats || {};
    for (const k of ['str', 'agi', 'vit', 'int', 'dex', 'luk']) {
      const v = Number(all[k]) || 0;
      if (v > 0) syn += v * (profile.statWeights[k] || 0.3) * 0.45;
    }
    if (profile.isSupport && (Number(all.heal) || 0) > 0) {
      syn += Number(all.heal) * 20;
    }
    if (profile.isMagic && (Number(all.skill) || 0) > 0) {
      syn += Number(all.skill) * 18;
    }
    for (const r of (pieceObj.rows || [])) {
      if (!r || !r.k) continue;
      const v = Number(r.v) || 0;
      if (r.k === 'stat' && r.sub) {
        syn += v * (profile.statWeights[r.sub] || 0.25) * 0.55;
      } else if (r.k === 'skill' && r.sub) {
        if (profile.jobSkills.has(r.sub)) syn += v * 0.65;
      } else if (r.k === 'leech') {
        syn += v * (profile.isMagic ? 0.3 : 1.1);
      } else if (r.k === 'cdr') {
        syn += v * (profile.isMagic || profile.isSkillUser ? 0.95 : 0.45);
      } else if (r.k === 'boss') {
        syn += v * 0.35;
      } else if (r.k === 'elDmg') {
        syn += v * 0.4;
      } else if (r.k === 'crit') {
        syn += v * (profile.isCrit ? 0.75 : 0.3);
      } else if (r.k === 'critDmg') {
        syn += v * (profile.isCrit ? 0.45 : 0.2);
      } else if (r.k === 'aspd') {
        syn += v * (profile.isAutoAtk ? 0.65 : 0.25);
      } else if (r.k === 'atk') {
        syn += v * (profile.isMagic ? 0.15 : 0.7);
      } else if (r.k === 'matk') {
        syn += v * (profile.isMagic ? 0.75 : 0.15);
      } else if (r.k === 'pdodge' || r.k === 'taken') {
        syn += v * 0.45;
      }
    }
    const wskList = pieceObj.it?.wsk;
    if (Array.isArray(wskList)) {
      for (const w of wskList) {
        if (w && w.job && (NC?.isJob ? NC.isJob(p, w.job) : p.job === w.job)) {
          syn += 3.5;
        }
      }
    }
    const cf = NC?.CLASS_GEAR_FIX?.[pieceObj.id];
    if (Array.isArray(cf) && cf[0] === profile.armorLine) {
      syn += 0.9;
    }
    if (pieceObj.wpn && profile.preferredWtypes && profile.preferredWtypes.size > 0) {
      const wt = NC?.wtypeOf ? NC.wtypeOf(pieceObj.it) : pieceObj.it?.wtype;
      if (wt && profile.preferredWtypes.has(wt)) {
        syn += 2.8;
      }
    }
    return syn;
  }

  function compareCandidateAgainstSlot(p, candObj, targetSlot) {
    const NC = window.NC;
    if (!NC?.WCmp?.compare || !p) return null;
    if (targetSlot !== 'acc2' || !p.equip?.acc1 || !p.equip?.acc2) {
      return NC.WCmp.compare(p, candObj);
    }
    // Temporarily swap acc1 <-> acc2 so NC.WCmp.compare evaluates against acc2
    const oldAcc1 = p.equip.acc1;
    const oldAcc2 = p.equip.acc2;
    const wu = p.wu || (p.wu = {});
    const oldWu1 = wu.acc1;
    const oldWu2 = wu.acc2;
    try {
      p.equip.acc1 = oldAcc2;
      p.equip.acc2 = oldAcc1;
      wu.acc1 = oldWu2;
      wu.acc2 = oldWu1;
      return NC.WCmp.compare(p, candObj);
    } finally {
      p.equip.acc1 = oldAcc1;
      p.equip.acc2 = oldAcc2;
      if (oldWu1 !== undefined) wu.acc1 = oldWu1; else delete wu.acc1;
      if (oldWu2 !== undefined) wu.acc2 = oldWu2; else delete wu.acc2;
    }
  }

  function wearSmartGearCandidate(game, p, cand, targetSlot) {
    const NC = window.NC;
    if (!NC || !game || !p || !cand) return false;
    const isAcc = targetSlot === 'acc1' || targetSlot === 'acc2';
    if (NC.EquipUI && isAcc) {
      NC.EquipUI.accPick = targetSlot;
    }
    try {
      if (cand.copy && NC.GEAR?.use) {
        if (isAcc && p.equip && p.equip[targetSlot === 'acc1' ? 'acc2' : 'acc1'] === cand.id && p.equip[targetSlot] !== cand.id) {
          // Wearing a second copy of the same accessory ID into the other accessory slot
          NC.equip?.(game, cand.id);
          p.wu = p.wu || {};
          p.wu[targetSlot] = cand.copy.u;
          delete cand.copy._fx;
          NC.applyGear?.(game);
          NC.saveGame?.(game);
        } else {
          NC.GEAR.use(game, cand.copy.u);
        }
      } else if (typeof NC.equip === 'function') {
        NC.equip(game, cand.id);
      } else {
        return false;
      }
      return true;
    } finally {
      if (NC.EquipUI && isAcc) {
        NC.EquipUI.accPick = null;
      }
    }
  }

  // Equip better weapons/armor/accessories in bag/owned automatically based on character job & stats
  function equipBestFromBag(game, p, filterName) {
    const NC = window.NC;
    if (!NC || !game || !p || p.dead > 0 || p.casting) return false;
    if (!NC.ITEMS || !NC.WCmp?.compare) return false;

    const GEAR_SLOTS = ['weapon', 'shield', 'hat', 'glasses', 'top', 'pants', 'robe', 'cape', 'acc'];
    const profile = getJobStatProfile(p);
    const bagList = (NC.GEAR?.bag ? NC.GEAR.bag(p) : p.bag) || [];
    const ownedSet = p.owned instanceof Set ? p.owned : new Set(Array.isArray(p.owned) ? p.owned : []);
    const candidates = [];

    for (const c of bagList) {
      if (!c || !c.id) continue;
      const it = NC.ITEMS[c.id];
      if (!it || it.rarity === 'fashion' || !GEAR_SLOTS.includes(it.slot)) continue;
      candidates.push({ copy: c, id: c.id, it });
    }
    for (const id of ownedSet) {
      if (!id || (NC.GEAR?.isInst && NC.GEAR.isInst(id))) continue;
      const it = NC.ITEMS[id];
      if (!it || it.rarity === 'fashion' || !GEAR_SLOTS.includes(it.slot)) continue;
      candidates.push({ copy: null, id, it });
    }

    if (candidates.length === 0) return false;

    const filterLower = filterName ? String(filterName).trim().toLowerCase() : '';
    const slotOrder = ['weapon', 'shield', 'hat', 'glasses', 'top', 'robe', 'pants', 'cape', 'acc1', 'acc2'];
    let equippedCount = 0;
    const equippedLabels = [];

    const wtypeOfItem = (it) => it ? ((NC.wtypeOf ? NC.wtypeOf(it) : it.wtype) || 'sword') : '';
    const curWeaponIt = p.equip?.weapon ? NC.ITEMS[p.equip.weapon] : null;
    const curWeaponWt = curWeaponIt ? wtypeOfItem(curWeaponIt) : '';
    const curWeaponFit = curWeaponWt ? evaluateWeaponSkillFitness(p, curWeaponWt, profile) : { unlocked: 0, locked: 0, bonus: 0 };
    const hasAnyAllowedWeapon = Boolean(
      profile.allowedWtypes && profile.allowedWtypes.size > 0 && (
        (curWeaponWt && profile.allowedWtypes.has(curWeaponWt)) ||
        candidates.some(c =>
          c.it.slot === 'weapon' &&
          (!c.it.lvReq || (p.lv || 1) >= c.it.lvReq) &&
          (!NC.canWield || NC.canWield(p, c.id)) &&
          profile.allowedWtypes.has(wtypeOfItem(c.it))
        )
      )
    );
    const isCurWeaponWrongType = Boolean(
      curWeaponWt &&
      hasAnyAllowedWeapon &&
      profile.allowedWtypes &&
      !profile.allowedWtypes.has(curWeaponWt)
    );

    for (const targetSlot of slotOrder) {
      const rawSlot = (targetSlot === 'acc1' || targetSlot === 'acc2') ? 'acc' : targetSlot;
      // Don't replace a custom robe with a basic top unless top is stronger, and skip shield if holding a 2H weapon
      if (targetSlot === 'shield') {
        const curW = NC.ITEMS[p.equip?.weapon];
        if (curW?.twoHanded) continue;
      }

      const wornUids = NC.GEAR?.wornUids ? NC.GEAR.wornUids(p) : new Set(Object.values(p.wu || {}));
      let bestCand = null;
      let bestScore = filterLower ? -999 : 0.4; // Require > +0.4% effective improvement to avoid oscillation
      let bestPowerPct = 0;

      for (const cand of candidates) {
        if (cand.it.slot !== rawSlot) continue;
        if (filterLower) {
          const nm = `${cand.it.name || ''} ${cand.id}`.toLowerCase();
          if (!nm.includes(filterLower)) continue;
        }
        if (cand.copy && wornUids.has(cand.copy.u)) continue;
        if (!cand.copy && p.equip?.[targetSlot] === cand.id) continue;
        if (NC.Inv?.whyNot && NC.Inv.whyNot(p, cand.id)) continue;
        if (cand.it.lvReq && (p.lv || 1) < cand.it.lvReq) continue;
        if (rawSlot === 'weapon' && NC.canWield && !NC.canWield(p, cand.id)) continue;

        let candFit = null;
        if (rawSlot === 'weapon') {
          const candWt = wtypeOfItem(cand.it);
          // Enforce dedicated job weapon types (e.g., Puppeteer MUST use puppet/wire, NEVER dagger/sword!)
          if (hasAnyAllowedWeapon && profile.allowedWtypes && !profile.allowedWtypes.has(candWt)) {
            continue;
          }
          candFit = evaluateWeaponSkillFitness(p, candWt, profile);
          // Never switch from a weapon that unlocks the hero's learned skills to a weapon that locks more of them
          if (curWeaponFit.unlocked > 0 && candFit.unlocked === 0 && candFit.locked > curWeaponFit.locked && !isCurWeaponWrongType) {
            continue;
          }
        }

        const cmp = compareCandidateAgainstSlot(p, cand.copy || cand.id, targetSlot);
        if (!cmp || cmp.worn) continue;

        const off = Number(cmp.off) || 0;
        const def = Number(cmp.def) || 0;
        const pwr = Number(cmp.power) || (off + def);
        const slotIsEmpty = !p.equip?.[targetSlot] && !(targetSlot === 'top' && p.equip?.robe) && !(targetSlot === 'robe' && p.equip?.top);

        let score;
        if (rawSlot === 'weapon') {
          score = off * 1.2 + def * 0.3;
          if (candFit) {
            score += (candFit.unlocked - curWeaponFit.unlocked) * 4.5 + (candFit.bonus - curWeaponFit.bonus) * 1.8 - (candFit.locked - curWeaponFit.locked) * 3.0;
          }
          // Immediate recovery: if currently holding an incompatible weapon (like a dagger on Puppeteer), force swap to job weapon!
          if (isCurWeaponWrongType || (curWeaponFit.locked > 0 && curWeaponFit.unlocked === 0 && candFit && candFit.unlocked > 0 && candFit.locked === 0)) {
            score += 5000;
          }
        } else if (rawSlot === 'shield') {
          score = off * 0.8 + def * 1.15;
        } else {
          score = off * profile.offWeight + def * profile.defWeight;
        }

        const synDelta = computePieceClassSynergy(p, cmp.A, profile) - computePieceClassSynergy(p, cmp.B, profile);
        score += synDelta;

        if (slotIsEmpty && (pwr >= -0.1 || synDelta > 0)) {
          score += 15;
        }

        if (score > bestScore) {
          bestScore = score;
          bestCand = cand;
          bestPowerPct = pwr;
        }
      }

      if (bestCand) {
        if (wearSmartGearCandidate(game, p, bestCand, targetSlot)) {
          equippedCount++;
          const refTag = (bestCand.copy?.ref > 0) ? ` +${bestCand.copy.ref}` : '';
          const sign = bestPowerPct >= 0 ? '+' : '';
          equippedLabels.push(`${bestCand.it.name || bestCand.id}${refTag} (${sign}${bestPowerPct.toFixed(1)}%)`);
        }
      }
    }

    if (equippedCount > 0) {
      const jobTitle = NC.JOBS?.[p.job]?.name || p.job || 'Traveler';
      const summary = `⚔️ Smart Gear (${jobTitle}): สวมใส่ ${equippedLabels.join(', ')}`;
      setSmartGearNote(summary);
      try { NC.HUD?.log?.(summary, 'item'); } catch (_) {}
      return true;
    }
    return false;
  }

  function runSmartGearTick(game, p, force = false) {
    if (!window.__smartGearEnabled || !game || !p || p.dead > 0 || p.casting) return false;
    const NC = window.NC;
    const bag = (NC?.GEAR?.bag ? NC.GEAR.bag(p) : p.bag) || [];
    const bagLastU = bag.length > 0 ? (bag[bag.length - 1]?.u || 0) : 0;
    const ownedLen = p.owned instanceof Set ? p.owned.size : (Array.isArray(p.owned) ? p.owned.length : 0);
    const sig = `${p.job}:${p.lv}:${window.__smartGearWeaponType || 'auto'}:${bag.length}:${bagLastU}:${ownedLen}:${p.equip?.weapon || ''}:${p.equip?.top || ''}:${p.equip?.hat || ''}:${p.equip?.acc1 || ''}:${p.equip?.acc2 || ''}`;
    const now = Date.now();
    if (!force && sig === lastSmartGearSignature && now - lastSmartGearCheckAt < 4000) {
      return false;
    }
    if (!force && now - lastSmartGearCheckAt < 1400) {
      return false;
    }
    lastSmartGearCheckAt = now;
    lastSmartGearSignature = sig;
    const upgraded = equipBestFromBag(game, p, '');
    if (!upgraded && (!window.__lastSmartGearNote || window.__lastSmartGearNote.includes('พร้อมอัปเกรด'))) {
      const jobTitle = NC?.JOBS?.[p.job]?.name || p.job || 'Traveler';
      const wName = NC?.ITEMS?.[p.equip?.weapon]?.name || p.equip?.weapon || 'มือเปล่า';
      setSmartGearNote(`✅ Smart Gear (${jobTitle}): ถือ ${wName} (ดีที่สุดในกระเป๋าแล้ว)`);
    }
    return upgraded;
  }

  // Check if current quest/lesson requires a Job Change right now
  function isJobChangeQuestStepNow(p) {
    const NC = window.NC;
    if (!NC || !p) return false;
    if (typeof NC.canChangeJob !== 'function' || !NC.canChangeJob(p)) return false;
    const L = NC.Lessons?.cur?.();
    const rawStep = NC.Lessons?.step?.();
    const c = (rawStep && rawStep.c) ? rawStep.c : rawStep;
    if (L && c && c.tier === 1) return true;
    const q = NC.Quests?.cur?.();
    const tier = NC.JOBS?.[p.job]?.tier || 0;
    if (q && q.id === 'MQ08' && tier < 1 && (p.jobLv || 1) >= 10) return true;
    const sqJobWin = document.querySelector('#sq .win[data-sq="jobchange"]:not([hidden])');
    if (sqJobWin) return true;
    return false;
  }

  // Check if any quest/story/talk modal is currently open (so we never reset its countdown by calling NC.QuestAuto.next())
  function isAnyQuestDialogOpen() {
    const qdlg = document.getElementById('qdlg');
    if (qdlg && !qdlg.hidden) return true;
    if (Array.from(document.querySelectorAll('.sp-pop')).some(e => !e.hidden)) return true;
    if (document.querySelector('#sq .win[data-sq="story"]:not([hidden]), #sq .win[data-sq="talk"]:not([hidden])')) return true;
    return false;
  }

  // Find a walkable standing spot in reach of a tree/ore node (away from portals)
  function findStandSpotNearNode(game, p, n) {
    const NC = window.NC;
    const w = game?.world;
    if (!w || !p || !n) return [n.x, n.y + 40];
    const byWarp = (x, y) => (game.portals || []).some(pt => ((x - pt.x) / 200) ** 2 + ((y - pt.y) / 126) ** 2 < 1);
    const D = Math.max(50, Math.min(85, (n.reach || 120) - 38));
    const a0 = Math.atan2((p.y || 0) - n.y, (p.x || 0) - n.x);
    for (const da of [0, 0.5, -0.5, 1, -1, 1.6, -1.6, 2.2, -2.2, Math.PI]) {
      const x = n.x + Math.cos(a0 + da) * D;
      const y = n.y + Math.sin(a0 + da) * D * 0.7;
      if ((typeof w.fits !== 'function' || w.fits(x, y, 24)) && !byWarp(x, y)) return [x, y];
    }
    return byWarp(n.x, n.y + 40) ? null : [n.x, n.y + 40];
  }

  // Fast 120ms strike/reel driver for active manual life gathering (woodcutting, mining, fishing)
  if (window.__ncManualLifeStrikeTimer) {
    clearInterval(window.__ncManualLifeStrikeTimer);
  }
  window.__ncManualLifeStrikeTimer = setInterval(() => {
    if (!window.__isBotRunning) return;
    const NC = window.NC;
    const game = NC?.game;
    const p = game?.player;
    if (!NC || !game || !p) return;

    // Woodcutting / Mining active minigame strike
    if (p.lifeAct && NC.Life?.strike) {
      const a = p.lifeAct;
      if ((a.cd || 0) <= 0) {
        const m = a.mg;
        let shouldStrike = false;
        if (m && m.kind === 'ring') {
          const diff = Math.abs(Math.atan2(Math.sin((m.ang || 0) - (m.notch || 0)), Math.cos((m.ang || 0) - (m.notch || 0))));
          if (diff <= (m.half || 0.26) || (a.t || 0) > 0.38) shouldStrike = true;
        } else if (m && m.kind === 'glint') {
          const per = m.per || 1;
          const b = (1 - Math.cos(((m.t || 0) / per) * Math.PI * 2)) / 2;
          if (b >= (m.thr || 0.75) || (a.t || 0) > 0.42) shouldStrike = true;
        } else {
          shouldStrike = true;
        }
        if (shouldStrike) {
          try { NC.Life.strike(game, p); } catch (_) {}
        }
      }
    }

    // Fishing active minigame driver (L34: ริมบ่อ)
    if (p.fishAct) {
      const fa = p.fishAct;
      const fireKeyB = (type) => {
        try {
          window.dispatchEvent(new KeyboardEvent(type, { code: 'KeyB', key: 'b', bubbles: true, cancelable: true }));
        } catch (_) {}
      };
      if (fa.phase === 'ready') {
        fireKeyB('keydown');
      } else if (fa.phase === 'aim' && (fa.power || 0) >= 0.65) {
        fireKeyB('keyup');
      } else if (fa.phase === 'bite') {
        fireKeyB('keydown');
        setTimeout(() => fireKeyB('keyup'), 60);
      } else if (fa.phase === 'reel') {
        const mid = ((fa.gLo || 0.35) + (fa.gHi || 0.68)) / 2;
        const wantHold = (fa.T || 0.5) < mid;
        if (Boolean(fa.hold) !== wantHold) {
          fireKeyB(wantHold ? 'keydown' : 'keyup');
        }
      }
    }
  }, 120);

  let badLifeNodes = new WeakSet();
  let manualGatherDefending = false;

  // Manual-style Life Gatherer (Bypasses AUTO Premium lifeGate for tutorial lessons L20, L32, L33, L34, L36 & non-premium life_gather)
  function runManualLifeGatherStep(game, p, opts) {
    const NC = window.NC;
    const Lf = NC?.Life;
    if (!NC || !Lf || !game || !p) return false;

    const skill = opts.skill || 'wood';
    const targetMap = opts.map || (skill === 'mine' ? 'quarry1' : (skill === 'fish' ? 'homefarm' : 'farm'));
    const statusLabel = opts.label || (skill === 'mine' ? 'ขุดแร่' : (skill === 'fish' ? 'ตกปลา' : 'ตัดไม้'));

    // Ensure QuestAuto is not holding a gated 'gather' job (so online/life.js sends manual gather without auto:true)
    if (NC.QuestAuto?.on && NC.AutoPremium?.lifeGate?.(game)) {
      try { NC.QuestAuto.stop?.(''); } catch (_) {}
    }

    // Unpause if a tutorial panel left game.paused = true
    if (game.paused) {
      try {
        NC.HUD?.closeAll?.();
        NC.SQ?.closeAll?.();
        game.paused = false;
      } catch (_) {}
    }

    // Drink red potion if HP < 50%
    const reds = NC.POT ? NC.POT.count(p, 'red') : (p.potions || 0);
    if (p.hp < p.maxHp * 0.5 && !(p.cd && p.cd.pot > 0) && reds > 0 && typeof NC.drinkPotion === 'function') {
      try { NC.drinkPotion(game, p, 'red'); } catch (_) {}
    }

    // Self-defend if an aggressive monster is attacking us
    const foe = (game.enemies || []).find(e =>
      e && !e.dead && e.hp > 0 && !e.dummy &&
      (NC.Auto?.afterMe ? NC.Auto.afterMe(game, e) : e.tgt === p) &&
      NC.dist(e.x, e.y, p.x, p.y) < 400
    );
    if (foe) {
      if (p.lifeAct && typeof Lf.stopWork === 'function') Lf.stopWork(game, p);
      if (NC.Travel?.on) NC.Travel.stop?.('');
      if (NC.Auto && !NC.Auto.on) {
        manualGatherDefending = true;
        NC.Auto.defendOnly = true;
        NC.Auto.toggle?.(game);
      }
      setPlanTaskStatus('⚔️ ป้องกันตัวจากมอนสเตอร์ระหว่าง' + statusLabel + '...');
      return true;
    } else if (manualGatherDefending) {
      manualGatherDefending = false;
      if (NC.Auto) {
        NC.Auto.defendOnly = false;
        if (NC.Auto.on) {
          if (typeof NC.Auto.stop === 'function') NC.Auto.stop(game);
          else NC.Auto.toggle?.(game);
        }
      }
    }

    // Travel to target map if not there yet
    if (game.mapId !== targetMap) {
      if (!NC.Travel?.on || NC.Travel?.target?.map !== targetMap) {
        NC.Travel?.go?.(game, { map: targetMap, x: 0, y: 0, r: 1e9, name: NC.MAPS?.[targetMap]?.name || targetMap });
      }
      setPlanTaskStatus('🗺️ กำลังเดินทางไป ' + (NC.MAPS?.[targetMap]?.name || targetMap) + ' เพื่อ' + statusLabel + '...');
      return true;
    }

    // Already working a node or fishing
    if (p.lifeAct || p.fishAct) {
      setPlanTaskStatus('🪓 กำลัง' + statusLabel + ' (' + (NC.MAPS?.[game.mapId]?.name || game.mapId) + ')...');
      return true;
    }
    if (NC.Travel?.on || (p.skillLock || 0) > 0) {
      setPlanTaskStatus('🚶 กำลังเดินไปจุด' + statusLabel + ' (' + (NC.MAPS?.[game.mapId]?.name || game.mapId) + ')...');
      return true;
    }

    // Find all nodes on current map
    const nodes = [];
    for (const f of (Lf.finders || [])) {
      try {
        const arr = f(game);
        if (Array.isArray(arr)) nodes.push(...arr);
      } catch (_) {}
    }

    if (skill === 'fish') {
      const fishNode = nodes.find(n => n && (n.pond || n.skill === 'fish') && (!n.ok || n.ok()));
      if (fishNode) {
        const d = NC.dist(p.x, p.y, fishNode.x, fishNode.y);
        if (d <= (fishNode.reach || 140)) {
          try { Lf.work(game, p, fishNode); } catch (_) {}
        } else {
          NC.Travel?.go?.(game, { map: game.mapId, x: fishNode.x, y: fishNode.y + 30, r: 40, name: 'จุดตกปลา' });
        }
        return true;
      }
    }

    const haveLv = typeof Lf.lvOf === 'function' ? Lf.lvOf(p, skill) : 1;
    const toolName = Lf.SKILLS?.[skill]?.tool || (skill === 'mine' ? 'pick' : 'axe');
    const haveTier = typeof Lf.toolTier === 'function' ? Lf.toolTier(p, toolName) : 1;

    const validNodes = nodes.filter(n =>
      n && n.skill === skill &&
      !badLifeNodes.has(n) &&
      (!n.ok || n.ok()) &&
      haveLv >= (n.lv || 1) &&
      (!n.tier || haveTier >= n.tier)
    );
    validNodes.sort((a, b) => NC.dist(a.x, a.y, p.x, p.y) - NC.dist(b.x, b.y, p.x, p.y));

    const m = validNodes[0];
    if (!m) {
      // Reset badLifeNodes in case trees/veins regrew
      badLifeNodes = new WeakSet();
      setPlanTaskStatus('⏳ รอจุด' + statusLabel + 'เกิดใหม่ใน ' + (NC.MAPS?.[game.mapId]?.name || game.mapId) + '...');
      return true;
    }

    const sp = findStandSpotNearNode(game, p, m);
    if (!sp) {
      badLifeNodes.add(m);
      return true;
    }

    if (NC.dist(p.x, p.y, m.x, m.y) <= (m.reach || 125) - 8) {
      try {
        Lf.work(game, p, m);
        if (!p.lifeAct) badLifeNodes.add(m);
      } catch (_) {}
      setPlanTaskStatus('🪓 กำลัง' + statusLabel + ': ' + (m.label || statusLabel) + '...');
      return true;
    }

    NC.Travel?.go?.(game, { map: game.mapId, x: sp[0], y: sp[1], r: 26, name: m.verb || statusLabel });
    setPlanTaskStatus('🚶 เดินไปที่ ' + (m.label || statusLabel) + '...');
    return true;
  }

  // A. Auto Job Change & Post-Class-Change / Multi-Round Skill Reset
  let lastJobChangeAttemptAt = 0;
  let pendingFreeClassSkillResetJob = '';

  function getActivePlanSkillBuild(plan, p) {
    const NC = window.NC;
    const baseSb = (plan && plan.skillBuild && typeof plan.skillBuild === 'object')
      ? plan.skillBuild
      : { skillPointQueue: [], plannedLevels: {}, autoOff: [] };
    if (!plan) return Object.assign({ roundNo: 0, waitingForReset: false }, baseSb);

    let st = null;
    try { st = loadPlanState(plan); } catch (_) {}
    const rounds = Array.isArray(baseSb.resetRounds) ? baseSb.resetRounds : [];

    if (st && Number(st.pendingSkillResetRound) > 0) {
      const pendRound = Number(st.pendingSkillResetRound) || 0;
      const totalPts = (NC && typeof NC.skillPoints === 'function' && p) ? NC.skillPoints(p) : 0;
      const leftPts = (NC && typeof NC.skillLeft === 'function' && p) ? NC.skillLeft(p) : 0;
      const spentPts = totalPts - leftPts;
      if (spentPts <= 0) {
        st.activeSkillResetRound = pendRound;
        st.pendingSkillResetRound = 0;
        try { savePlanState(plan, st); } catch (_) {}
      } else {
        const targetRoundObj = (pendRound >= 1 && rounds[pendRound - 1]) ? rounds[pendRound - 1] : baseSb;
        return {
          roundNo: pendRound,
          waitingForReset: true,
          resetMode: st.pendingSkillResetMode || 'auto',
          skillPointQueue: Array.isArray(targetRoundObj.skillPointQueue) ? targetRoundObj.skillPointQueue : [],
          plannedLevels: (targetRoundObj.plannedLevels && typeof targetRoundObj.plannedLevels === 'object') ? targetRoundObj.plannedLevels : {},
          autoOff: Array.isArray(targetRoundObj.autoOff) ? targetRoundObj.autoOff : []
        };
      }
    }

    const activeRound = st ? (Number(st.activeSkillResetRound) || 0) : 0;
    if (activeRound >= 1 && rounds[activeRound - 1]) {
      const r = rounds[activeRound - 1];
      return {
        roundNo: activeRound,
        waitingForReset: false,
        skillPointQueue: Array.isArray(r.skillPointQueue) ? r.skillPointQueue : [],
        plannedLevels: (r.plannedLevels && typeof r.plannedLevels === 'object') ? r.plannedLevels : {},
        autoOff: Array.isArray(r.autoOff) ? r.autoOff : []
      };
    }
    return {
      roundNo: 0,
      waitingForReset: false,
      skillPointQueue: Array.isArray(baseSb.skillPointQueue) ? baseSb.skillPointQueue : [],
      plannedLevels: (baseSb.plannedLevels && typeof baseSb.plannedLevels === 'object') ? baseSb.plannedLevels : {},
      autoOff: Array.isArray(baseSb.autoOff) ? baseSb.autoOff : []
    };
  }

  function shouldAutoResetSkillAfterClassChange(p, plan) {
    const NC = window.NC;
    if (!NC || !p || !plan) return false;
    if (!window.__planScriptEnabled) return false;

    const activeSb = getActivePlanSkillBuild(plan, p);
    const totalPts = typeof NC.skillPoints === 'function' ? NC.skillPoints(p) : 0;
    const leftPts = typeof NC.skillLeft === 'function' ? NC.skillLeft(p) : 0;
    const spentPts = totalPts - leftPts;

    // 1. Explicit Plan Trigger Action: `reset_skills` (รีสกิล #1, รีสกิล #2, ...)
    if (activeSb && activeSb.waitingForReset && spentPts > 0) {
      return true;
    }

    if (plan.autoStatSkillEnabled === false || plan.autoResetSkillOnJobChange === false) return false;
    const jobId = String(p.job || '').toLowerCase();
    const jobObj = NC.JOBS?.[jobId];
    if (!jobObj || (jobObj.tier || 0) < 2) return false;

    const resetDoneKey = `pelican_autoreset_job_${p.name || 'hero'}`;
    try {
      if (localStorage.getItem(resetDoneKey) === jobId) return false;
    } catch (_) {}

    const isFreeClassReset = Boolean(typeof NC.s2ClassResetFree === 'function' && NC.s2ClassResetFree(p));
    const isFreeUnder40 = Boolean(
      typeof NC.skillResetPrice === 'function' &&
      NC.skillResetPrice(p, { ticket: true }) === 0 &&
      !(NC.GemShop?.resetNeeds && NC.GemShop.resetNeeds(p, 'skills', { ticket: true }))
    );
    if (!isFreeClassReset && !isFreeUnder40) return false;
    if (spentPts <= 0) return false;

    if (pendingFreeClassSkillResetJob === jobId) return true;

    const rawQueue = Array.isArray(activeSb?.skillPointQueue) ? activeSb.skillPointQueue : [];
    const plannedLevels = activeSb?.plannedLevels;
    const hasCustomQueue = rawQueue.length > 0;
    const hasCustomLevels = Boolean(plannedLevels && typeof plannedLevels === 'object' && Object.keys(plannedLevels).length > 0);

    // If the user has a custom Skill Queue / Planned Levels, ONLY reset if the character currently has points
    // invested in skills that exceed what the Plan wants! (If the user saved points from Novice/Class 1 for Class 2,
    // no reset trip is needed — the saved points can be spent directly on Class 2 skills!)
    if (hasCustomQueue || hasCustomLevels) {
      const plannedSpentBySkill = {};
      if (hasCustomQueue) {
        for (const sid of rawQueue) {
          plannedSpentBySkill[sid] = (plannedSpentBySkill[sid] || 0) + 1;
        }
      } else if (hasCustomLevels) {
        for (const [sid, val] of Object.entries(plannedLevels)) {
          plannedSpentBySkill[sid] = Math.max(0, Number(val) || 0);
        }
      }
      for (const [sid, rawLv] of Object.entries(p.skills || {})) {
        const curLv = Number(rawLv) || 0;
        const freeLv = typeof NC.freeSkillLv === 'function' ? (NC.freeSkillLv(sid) || 0) : 0;
        const curSpent = Math.max(0, curLv - freeLv);
        if (curSpent <= 0) continue;
        const wantSpent = Number(plannedSpentBySkill[sid]) || 0;
        if (curSpent > wantSpent) {
          return true;
        }
      }
      return false;
    }

    // Fallback when no custom skill queue is defined: check if the character has 0 points invested in Class 2/3 skills
    // and all points are locked in Class 1 skills (leftPts < 5)
    const ownClassSkills = Array.isArray(jobObj.skills) ? jobObj.skills : [];
    const learnedInCurrentTier = ownClassSkills.reduce((sum, sid) => {
      const freeLv = typeof NC.freeSkillLv === 'function' ? (NC.freeSkillLv(sid) || 0) : 0;
      const curLv = Number((NC.skillRaw || NC.skillLv)?.(p, sid) || p.skills?.[sid] || 0);
      return sum + Math.max(0, curLv - freeLv);
    }, 0);
    if (ownClassSkills.length > 0 && learnedInCurrentTier === 0 && spentPts >= 8 && leftPts < 5) {
      return true;
    }
    return false;
  }

  function runAutoJobChange(game, p, plan) {
    const NC = window.NC;
    if (!NC || !p || !plan) return false;
    if (!window.__planScriptEnabled || plan.autoJobChange === false) return false;

    // Check if we recently promoted to Class 2/3 and have a FREE class-change skill reset waiting at Uncle Coco
    if (shouldAutoResetSkillAfterClassChange(p, plan) && !autoSellTrip && !forcePotionTripRequested) {
      pendingFreeClassSkillResetJob = String(p.job || '').toLowerCase();
      forcePotionTripRequested = true;
      lastAutoSellDoneAt = 0;
    }

    if (Date.now() - lastJobChangeAttemptAt < 2500) return false;
    if (typeof NC.canChangeJob !== 'function' || !NC.canChangeJob(p)) return false;

    const nextList = typeof NC.nextJobs === 'function' ? NC.nextJobs(p) : [];
    if (!Array.isArray(nextList) || nextList.length === 0) return false;

    const curJobObj = NC.JOBS?.[p.job] || { tier: 0 };
    const tier = curJobObj.tier || 0;
    let targetJob = null;

    if (tier === 0) {
      const needJobLv = Number(plan.class1JobLevel) || 10;
      if ((p.jobLv || 1) < needJobLv) return false;
      const wantC1 = String(plan.class1Target || 'priest').toLowerCase();
      targetJob = nextList.includes(wantC1) ? wantC1 : nextList[0];
    } else if (tier === 1) {
      const needJobLv = Number(plan.class2JobLevel) || 50;
      if ((p.jobLv || 1) < needJobLv) return false;
      const wantC2 = String(plan.class2Target || 'bishop').toLowerCase();
      targetJob = nextList.includes(wantC2) ? wantC2 : nextList[0];
    } else if (tier === 2) {
      if ((p.lv || 1) < (NC.CLASS3_BASE_LV || 80) || (p.jobLv || 1) < 50) return false;
      const wantC3 = String(plan.class3Target || 'starsaint').toLowerCase();
      targetJob = (wantC3 && nextList.includes(wantC3)) ? wantC3 : nextList[0];
    }

    if (targetJob && typeof NC.HUD?.changeJob === 'function') {
      lastJobChangeAttemptAt = Date.now();
      const jobName = NC.JOBS?.[targetJob]?.name || targetJob;
      setPlanTaskStatus('⚔️ เปลี่ยนอาชีพอัตโนมัติ (ตาม Plan) -> ' + jobName);
      NC.HUD.changeJob(targetJob);
      setTimeout(() => {
        equipBestFromBag(game, p, '');
        runAutoStatAndSkill(game, p, plan);
        syncOptimalHotbar(game, p, plan, true);
        if (tier >= 1 && plan.autoResetSkillOnJobChange !== false && shouldAutoResetSkillAfterClassChange(p, plan)) {
          pendingFreeClassSkillResetJob = String(p.job || '').toLowerCase();
          forcePotionTripRequested = true;
          lastAutoSellDoneAt = 0;
        }
      }, 750);
      return true;
    }
    return false;
  }

  let lastHotbarSyncAt = 0;
  function syncOptimalHotbar(game, p, plan, forceNow = false) {
    const NC = window.NC;
    if (!NC || !p || !NC.SKILLS) return;
    if (!forceNow && Date.now() - lastHotbarSyncAt < 4000) return;
    lastHotbarSyncAt = Date.now();

    // Ensure Auto-Farm uses skills and isn't accidentally stuck in passive party-support mode when soloing
    try {
      if (NC.Auto?.set) {
        if (NC.Auto.set.skills === false) NC.Auto.set.skills = true;
        const partyPeers = NC.PartyNet?.others?.() || [];
        if (NC.Auto.set.mode === 'support' && partyPeers.length === 0) {
          NC.Auto.set.mode = 'farm';
        }
      }
    } catch (_) {}

    const KEYS = (window.__upgradeBotAiEnabled && Array.isArray(NC.BARKEYS) && NC.BARKEYS.length >= 16)
      ? NC.BARKEYS
      : (NC.HOTKEYS || ['q', 'e', 'r', 'f', '3', '4', '5', '6']);
    const learnedOf = (id) => Number((NC.skillRaw || NC.skillLv)?.(p, id) || p?.skills?.[id] || 0);
    const jobSkList = typeof NC.jobSkills === 'function' ? (NC.jobSkills(p) || []) : (NC.JOBS?.[p.job]?.skills || []);
    const slottable = (id) => {
      const S = NC.SKILLS[id];
      if (!S || S.boss) return false;
      if (typeof NC.skillSlottable === 'function' && !NC.skillSlottable(S)) return false;
      if (!S.active) return false;
      if (learnedOf(id) <= 0) return false;
      const works = (typeof NC.weaponWorks === 'function')
        ? NC.weaponWorks(p, id)
        : (typeof NC.weaponOk === 'function' ? NC.weaponOk(p, id) : true);
      if (!works) return false;
      return true;
    };

    const hasBiHeal = learnedOf('bi_heal') > 0;
    const hasClementia = learnedOf('bi_clementia') > 0;
    const hasCanto = learnedOf('bi_canto') > 0;
    const partyPeers = NC.PartyNet?.others?.() || [];
    const isSolo = partyPeers.length === 0;

    const PRIORITY_BONUS = {
      // Bishop
      bi_heal: 95, bi_barrier: 90, bi_turnundead: 85, bi_sanctuary: 82, bi_magnificat: 78, bi_miracle: 75,
      bi_clementia: 72, bi_canto: 70, bi_assumptio: 68, bi_lexdivina: 65, bi_impositio: 62, bi_battlehymn: 60,
      // Wisp
      ws_mark: 95, ws_rush: 90, ws_latch: 85, ws_embrace: 82, ws_burst: 78, ws_night: 75,
      // Lightkeeper
      lk_swing: 95, lk_flash: 90, lk_lamp: 85, lk_flare: 82, lk_plant: 78, lk_faith: 75, lk_dawn: 72,
      // Monk
      mo_ironbody: 95, mo_spheres: 92, mo_combo: 88, mo_palms: 85, mo_impact: 82, mo_chi: 78, mo_fury: 75, mo_asura: 70,
      // Priest
      holylight: 65, blessing: 62, pr_heal: 60, pr_agi: 58, pr_angelus: 55, magnus: 52, pr_aspersio: 45, pr_gloria: 42, pr_suffragium: 40,
      // Puppeteer / Showmaster
      pp_puppet: 98, pp_dance: 94, pp_control: 90, pp_theatre: 88, pp_stretch: 82, pp_bind: 78, pp_swap: 70,
      // Berserker / Bloodmoon
      bk_whirlwind: 95, bk_guillotine: 92, bk_crosscut: 88, bk_titan: 85, bk_leap: 82, bk_smash: 78, bk_warcry: 75,
      // Archmage / Astral
      am_chain: 95, am_lordthunder: 92, am_trinity: 90, am_orbfire: 86, am_orbwater: 85, am_orbwind: 84, am_arcaneflux: 80,
      // Wolf Hunter
      wh_wolf: 92, wh_howl: 85, wh_blitz: 80, wh_fang: 78, wh_command: 75, wh_pack: 72, wh_frenzy: 70
    };

    const activeSb = getActivePlanSkillBuild(plan, p);
    const planQueue = Array.isArray(activeSb?.skillPointQueue) ? activeSb.skillPointQueue : [];
    const planSet = new Set(planQueue);
    const autoOffSet = new Set(Array.isArray(activeSb?.autoOff) ? activeSb.autoOff : []);
    const c2Job = (NC.JOBS?.[p.job]?.tier === 3 && NC.JOBS?.[p.job]?.from) ? NC.JOBS[p.job].from : p.job;
    const c2OwnSet = new Set(NC.JOBS?.[c2Job]?.skills || []);

    const candidates = [];
    for (const id of jobSkList) {
      if (!slottable(id)) continue;
      if (autoOffSet.has(id)) continue;
      // Skip skills directly replaced by learned Class 2 upgrades or useless when solo
      if (id === 'pr_heal' && hasBiHeal) continue;
      if (id === 'blessing' && hasClementia) continue;
      if (id === 'pr_agi' && hasCanto) continue;
      if (id === 'pr_resurrect' && isSolo) continue;
      if (id === 'kn_berserk') continue; // Locks active skills

      const lv = learnedOf(id);
      let score = lv * 4;
      if (c2OwnSet.has(id) && NC.JOBS?.[c2Job]?.tier >= 2) score += 60;
      if (planSet.has(id)) score += 25;
      if (PRIORITY_BONUS[id]) score += PRIORITY_BONUS[id];
      candidates.push({ id, score });
    }

    if (candidates.length === 0) return;
    candidates.sort((a, b) => b.score - a.score);
    const desired = candidates.slice(0, KEYS.length).map(c => c.id);

    const hb = typeof NC.hotbarOf === 'function' ? NC.hotbarOf(p) : (p.hotbar || (p.hotbar = {}));
    const currentIds = KEYS.map(k => hb[k] || null);
    const currentValidSet = new Set(currentIds.filter(Boolean));
    const missingAnyDesired = desired.some(id => !currentValidSet.has(id));
    const hasObsoleteOnBar =
      (hasBiHeal && currentValidSet.has('pr_heal')) ||
      (hasClementia && currentValidSet.has('blessing')) ||
      (hasCanto && currentValidSet.has('pr_agi')) ||
      (isSolo && currentValidSet.has('pr_resurrect')) ||
      currentIds.some(id => id && (!slottable(id) || autoOffSet.has(id)));

    if (!missingAnyDesired && !hasObsoleteOnBar && !forceNow) return;

    const isObsoleteSkill = (id) =>
      !id || !slottable(id) || autoOffSet.has(id) ||
      (id === 'pr_heal' && hasBiHeal) ||
      (id === 'blessing' && hasClementia) ||
      (id === 'pr_agi' && hasCanto) ||
      (id === 'pr_resurrect' && isSolo);

    // Preserve user's existing valid slot placements so manual drag-and-drop order is never scrambled
    const newBar = {};
    const placedSet = new Set();
    for (const k of KEYS) {
      const curId = hb[k] || null;
      if (curId && !isObsoleteSkill(curId) && !placedSet.has(curId)) {
        newBar[k] = curId;
        placedSet.add(curId);
      } else {
        newBar[k] = null;
      }
    }
    for (const id of desired) {
      if (placedSet.has(id)) continue;
      const emptyKey = KEYS.find(k => !newBar[k]);
      if (!emptyKey) break;
      newBar[emptyKey] = id;
      placedSet.add(id);
    }

    const changed = KEYS.some(k => (hb[k] || null) !== (newBar[k] || null));
    if (changed) {
      for (const k of KEYS) hb[k] = newBar[k];
      try {
        NC.HUD?.updateHotbar?.(p);
        NC.saveGame?.(game);
        NC.SQ?.refresh?.('skill');
        NC.SQ?.refresh?.('auto');
      } catch (_) {}
    }

    // Apply plan.skillBuild.autoOff (can specify hotbar slot keys like 'q','e','2:q' or skill IDs like 'kn_berserk')
    // and re-enable any slot that now holds an active desired skill not in autoOffSet!
    if (NC.Auto?.set) {
      let autoSetChanged = false;
      if (!NC.Auto.set.slots || typeof NC.Auto.set.slots !== 'object') {
        NC.Auto.set.slots = {};
      }
      for (const k of KEYS) {
        const skInSlot = hb[k] || null;
        const shouldDisable = autoOffSet.has(k) || autoOffSet.has(String(k).toLowerCase()) || (skInSlot && autoOffSet.has(skInSlot));
        if (shouldDisable) {
          if (NC.Auto.set.slots[k] !== false) {
            NC.Auto.set.slots[k] = false;
            autoSetChanged = true;
          }
        } else if (skInSlot && NC.Auto.set.slots[k] === false) {
          delete NC.Auto.set.slots[k];
          autoSetChanged = true;
        }
      }
      if (autoSetChanged) {
        try {
          NC.Auto.saveSet?.();
          NC.SQ?.refresh?.('auto');
        } catch (_) {}
      }
    }
  }

  // B. Auto Stat & Skill Allocation (Runs when Plan Script is ON)
  function getActivePlanStatQueue(plan) {
    const baseSb = (plan && plan.statBuild && typeof plan.statBuild === 'object') ? plan.statBuild : null;
    const defaultQueue = [
      { stat: 'INT', to: 30 }, { stat: 'DEX', to: 24 }, { stat: 'VIT', to: 24 },
      { stat: 'INT', to: 45 }, { stat: 'DEX', to: 36 }, { stat: 'VIT', to: 36 },
      { stat: 'INT', to: 60 }, { stat: 'DEX', to: 48 }, { stat: 'VIT', to: 48 },
      { stat: 'INT', to: 80 }, { stat: 'DEX', to: 60 }, { stat: 'VIT', to: 60 }
    ];
    if (!baseSb) return defaultQueue;
    let st = null;
    try { st = loadPlanState(plan); } catch (_) {}
    const activeStatRound = st ? (Number(st.activeStatResetRound) || 0) : 0;
    const statRounds = Array.isArray(baseSb.resetRounds) ? baseSb.resetRounds : [];
    if (activeStatRound >= 1 && statRounds[activeStatRound - 1] && Array.isArray(statRounds[activeStatRound - 1].queue) && statRounds[activeStatRound - 1].queue.length > 0) {
      return statRounds[activeStatRound - 1].queue;
    }
    return (Array.isArray(baseSb.queue) && baseSb.queue.length > 0) ? baseSb.queue : defaultQueue;
  }

  function executePlanResetStatsNow(game, p, plan, st, roundNo, resetMode = 'auto') {
    const NC = window.NC;
    if (!NC || !game || !p || !p.base || p.dead > 0) return false;
    const L = NC.LV40;
    const freeBelow = Number(L?.freeBelow) || 40;
    const lv = Number(p.lv) || 1;
    const isFree = lv < freeBelow;
    if (resetMode === 'free_only' && !isFree) {
      st.activeStatResetRound = roundNo;
      savePlanState(plan, st);
      setPlanTaskStatus(`ℹ️ ข้ามรีสเตตัส #${roundNo} (Lv.${lv} ≥ ${freeBelow} · โหมดฟรีเท่านั้น)`);
      return false;
    }
    const why = (L && typeof L.statWhy === 'function') ? L.statWhy(p) : '';
    if (why) {
      setPlanTaskStatus(`⚠️ รีสเตตัส #${roundNo} ไม่ได้: ${why}`);
      return false;
    }
    const startSt = NC.START_STATS || { str: 5, agi: 5, vit: 5, int: 5, dex: 5, luk: 5 };
    const spent = Object.keys(startSt).reduce((acc, k) => acc + Math.max(0, (p.base[k] | 0) - (startSt[k] | 0)), 0);
    st.activeStatResetRound = roundNo;
    savePlanState(plan, st);
    if (spent <= 0) {
      runAutoStatAndSkill(game, p, plan);
      return true;
    }
    if (L && typeof L.takeTicket === 'function') {
      try { L.takeTicket(p); } catch (_) {}
    }
    if (typeof NC.resetStats === 'function') {
      NC.resetStats(p);
    } else {
      p.base = Object.assign({}, startSt);
    }
    NC.applyGear?.(game);
    NC.saveGame?.(game);
    try { NC.SQ?.refresh?.('status'); } catch (_) {}
    // Hold stat allocation for 480ms so online/world.js bridge() dispatches `{ action: 'reset', kind: 'stats' }` first,
    // then re-allocate all refunded points according to the new round's Stat Queue!
    window.__ncStatResetHoldUntil = Date.now() + 480;
    setPlanTaskStatus(`📊 รีเซ็ตสเตตัส #${roundNo} สำเร็จ (${isFree ? 'ฟรี <Lv.40' : 'ใช้ตั๋วรีสเตตัส'}) · กำลังลงแต้มใหม่ตามแผน...`);
    setTimeout(() => {
      try {
        window.__ncStatResetHoldUntil = 0;
        runAutoStatAndSkill(game, p, plan, true);
        NC.SQ?.refresh?.('status');
      } catch (_) {}
    }, 520);
    return true;
  }

  function runAutoStatAndSkill(game, p, plan, burstStats = false) {
    const NC = window.NC;
    if (!NC || !game || !p || !plan) return;
    if (!window.__planScriptEnabled || plan.autoStatSkillEnabled === false) return;

    // 1. Allocate Status Points (respects active Stat Reset Round & post-reset sync hold)
    try {
      const holdUntil = Number(window.__ncStatResetHoldUntil || 0);
      let left = typeof NC.statusLeft === 'function' ? NC.statusLeft(p) : 0;
      if (left > 0 && p.base && Date.now() >= holdUntil) {
        const queue = getActivePlanStatQueue(plan);
        let raisedStat = false;
        let guard = 0;
        const maxSteps = burstStats ? 160 : 25;
        while (left > 0 && guard++ < maxSteps) {
          let pickedKey = null;
          for (const step of queue) {
            const k = String(step.stat || '').toLowerCase();
            if (!k || typeof p.base[k] !== 'number') continue;
            const targetVal = Math.min(NC.STAT_MAX || 99, Number(step.to) || 1);
            if (p.base[k] < targetVal) {
              pickedKey = k;
              break;
            }
          }
          if (!pickedKey) break;
          const cost = typeof NC.statCost === 'function' ? NC.statCost(p.base[pickedKey]) : 2;
          if (cost > left) break;
          if (typeof NC.raiseStat === 'function' && NC.raiseStat(p, pickedKey, 1)) {
            raisedStat = true;
            left = NC.statusLeft(p);
          } else {
            break;
          }
        }
        if (raisedStat) {
          NC.applyGear?.(game);
          NC.saveGame?.(game);
        }
      }
    } catch (_) {}

    // 2. Allocate Skill Points & Auto-Slot Active/Buff Skills
    //    CRITICAL: When the user's Plan specifies a custom skillBuild (`skillPointQueue` or `plannedLevels`),
    //    ONLY allocate points to skills in the Plan (plus any direct prerequisite required to unlock a planned skill).
    //    NEVER dump leftover skill points into unchosen skills (`NC.JOBS[p.job].skills` fallback)!
    try {
      let sLeft = typeof NC.skillLeft === 'function' ? NC.skillLeft(p) : 0;
      let raisedSkill = false;
      const activeSb = getActivePlanSkillBuild(plan, p);
      if (sLeft > 0 && NC.SKILLS && !activeSb?.waitingForReset && !NC.OnlineWorld?.skillResetPending?.()) {
        const rawQueue = Array.isArray(activeSb?.skillPointQueue) ? activeSb.skillPointQueue : [];
        const plannedLevels = (activeSb?.plannedLevels && typeof activeSb.plannedLevels === 'object')
          ? activeSb.plannedLevels
          : {};
        const plannedEntries = Object.entries(plannedLevels).filter(([, lv]) => Number(lv) > 0);
        const hasCustomSkillBuild = rawQueue.length > 0 || plannedEntries.length > 0;
        const autoOffSet = new Set(Array.isArray(activeSb?.autoOff) ? activeSb.autoOff : []);
        const learnedOf = (id) => (NC.skillRaw || NC.skillLv)(p, id) || 0;
        const freeLvOf = (id) => {
          if (typeof NC.freeSkillLv === 'function') return NC.freeSkillLv(id) || 0;
          const S = NC.SKILLS?.[id];
          return !S ? 0 : (S.free !== undefined ? S.free : (S.active ? 1 : 0));
        };
        const availJobSkills = new Set(
          typeof NC.jobSkills === 'function'
            ? (NC.jobSkills(p) || [])
            : (NC.JOBS?.[p.job]?.skills || [])
        );
        const raisedSkillOrder = [];
        let guard = 0;

        while (sLeft > 0 && guard++ < 160) {
          let targetSkillId = null;
          const counts = {};
          for (const skId of rawQueue) {
            const S = NC.SKILLS[skId];
            if (!S) continue;
            counts[skId] = (counts[skId] || freeLvOf(skId)) + 1;
            const wantLv = Math.min(S.max || 10, counts[skId]);
            if (learnedOf(skId) < wantLv) {
              // If this skill belongs to a higher class that the character hasn't promoted to yet (e.g. saving Novice/Class 1 points for Class 2),
              // skip it so we hold/save unspent points for the class change!
              if (!availJobSkills.has(skId)) continue;
              if (typeof NC.skillReqMet === 'function' && NC.skillReqMet(p, skId)) {
                targetSkillId = skId;
                break;
              } else {
                const reqList = typeof NC.skillReq === 'function' ? (NC.skillReq(skId) || []) : (Array.isArray(S.req) ? S.req : []);
                for (const reqEntry of reqList) {
                  const reqId = Array.isArray(reqEntry) ? reqEntry[0] : reqEntry?.id;
                  const reqLv = Number(Array.isArray(reqEntry) ? reqEntry[1] : reqEntry?.lv) || 1;
                  if (reqId && NC.SKILLS[reqId] && availJobSkills.has(reqId) && learnedOf(reqId) < reqLv) {
                    if (typeof NC.skillReqMet !== 'function' || NC.skillReqMet(p, reqId)) {
                      targetSkillId = reqId;
                      break;
                    }
                  }
                }
                if (targetSkillId) break;
              }
            }
          }
          if (!targetSkillId && rawQueue.length === 0 && plannedEntries.length > 0) {
            for (const [skId, rawWantSpent] of plannedEntries) {
              const S = NC.SKILLS[skId];
              if (!S || !availJobSkills.has(skId)) continue;
              const wantLv = Math.min(S.max || 10, freeLvOf(skId) + (Number(rawWantSpent) || 0));
              if (learnedOf(skId) < wantLv && typeof NC.skillReqMet === 'function' && NC.skillReqMet(p, skId)) {
                targetSkillId = skId;
                break;
              }
            }
          }
          if (!targetSkillId && !hasCustomSkillBuild) {
            const jobSkills = NC.JOBS?.[p.job]?.skills || [];
            for (const skId of jobSkills) {
              const S = NC.SKILLS[skId];
              if (!S || S.boss) continue;
              if (learnedOf(skId) < (S.max || 10) && NC.skillReqMet?.(p, skId)) {
                targetSkillId = skId;
                break;
              }
            }
          }
          if (!targetSkillId) break;
          if (typeof NC.raiseSkill === 'function' && NC.raiseSkill(p, targetSkillId)) {
            raisedSkill = true;
            if (!raisedSkillOrder.includes(targetSkillId)) {
              raisedSkillOrder.push(targetSkillId);
            }
            if (!autoOffSet.has(targetSkillId)) {
              try { NC.autoSlot?.(p, targetSkillId); } catch (_) {}
            }
            sLeft = NC.skillLeft(p);
          } else {
            break;
          }
        }
        // CRITICAL: `online/world.js` `bridge()` sends skill-up commands by iterating `for (const id in p.skills)` in object key insertion order!
        // Because Go server snapshots serialize `s.skills` in ALPHABETICAL key order (e.g. `pp_control` before `ro_hide`, `pp_dance` before `pp_strings`),
        // we MUST rebuild `p.skills` with keys inserted in exact topological (`raisedSkillOrder` -> `rawQueue`) order before `NC.saveGame(game)` calls `bridge()`!
        if (p.skills && typeof p.skills === 'object' && (raisedSkill || rawQueue.length > 0)) {
          const orderedSkills = {};
          const allKeys = new Set([
            ...raisedSkillOrder,
            ...rawQueue,
            ...Object.keys(p.skills),
            ...Object.keys(NC.Online?.snap?.self?.skills || {})
          ]);
          for (const k of allKeys) {
            if (k && Object.prototype.hasOwnProperty.call(p.skills, k)) {
              orderedSkills[k] = p.skills[k];
            }
          }
          p.skills = orderedSkills;
        }
        if (raisedSkill) {
          NC.applyGear?.(game);
          NC.saveGame?.(game);
        }
      }
      syncOptimalHotbar(game, p, plan, raisedSkill);
    } catch (_) {}
  }

  // C. Smart Auto-Quest Unblocker & Unlimited 24/7 Life-Skill Engine
  let lastUnblockClickAt = 0;
  let skipPotionBuyOnNextTrip = false;

  function installLifeSkillUnlimitedHooks() {
    const NC = window.NC;
    if (!NC) return;
    // 1. Disable Season 2/3 client-side 4-hour daily AUTO life-skill cap ("AUTO อาชีพเสริมใช้ครบเวลาของวันนี้แล้ว")
    if (NC.OnlineS2) {
      try {
        NC.OnlineS2.autoCapOff = true;
        if (!NC.OnlineS2.__pmheeUnlimitedHooked) {
          NC.OnlineS2.__pmheeUnlimitedHooked = true;
          NC.OnlineS2.autoLeft = () => null;
          NC.OnlineS2.autoBeat = () => false;
        }
      } catch (_) {}
    }
    // 2. Disable client-side AUTO Premium lifeGate so gatherJob & gardenJob run on all accounts
    if (NC.AutoPremium && !NC.AutoPremium.__pmheeLifeGateHooked) {
      try {
        NC.AutoPremium.__pmheeLifeGateHooked = true;
        NC.AutoPremium.lifeGate = () => '';
      } catch (_) {}
    }
    // 3. Strip `auto: true` from outgoing `{ action: 'gather' }` and `{ action: 'life' }` packets and block `{ action: 'auto', kind: 'life' }`
    //    so the server processes woodcutting, mining, tilling, planting, watering & harvesting as normal manual actions (100% drops, 24/7 with no 4-hour cap)
    if (NC.Online && typeof NC.Online.action === 'function' && !NC.Online.__pmheeLifeActionHooked) {
      try {
        NC.Online.__pmheeLifeActionHooked = true;
        const origAction = NC.Online.action.bind(NC.Online);
        NC.Online.action = function wrappedOnlineAction(o) {
          if (o && typeof o === 'object') {
            if (o.action === 'auto' && o.kind === 'life') return false;
            if ((o.action === 'gather' || o.action === 'life') && o.auto) {
              delete o.auto;
            }
          }
          return origAction(o);
        };
      } catch (_) {}
    }
    if (NC.OnlineWorld && typeof NC.OnlineWorld.send === 'function' && !NC.OnlineWorld.__pmheeLifeSendHooked) {
      try {
        NC.OnlineWorld.__pmheeLifeSendHooked = true;
        const origSend = NC.OnlineWorld.send.bind(NC.OnlineWorld);
        NC.OnlineWorld.send = function wrappedOnlineWorldSend(a) {
          if (a && typeof a === 'object') {
            if (a.action === 'auto' && a.kind === 'life') return false;
            if ((a.action === 'gather' || a.action === 'life') && a.auto) {
              delete a.auto;
            }
          }
          return origSend(a);
        };
      } catch (_) {}
    }
    // 4. Prevent NC.OnlineChannels.to() / NC.SQParty.goTo() from ever attempting a channel switch inside non-channel maps
    //    (e.g. puppetroom tutorial, homefarm, story room, trial room) where channelId is "" — which otherwise times out and closes the socket!
    if (NC.OnlineChannels && typeof NC.OnlineChannels.why === 'function' && !NC.OnlineChannels.__pmheeSafeHooked) {
      try {
        NC.OnlineChannels.__pmheeSafeHooked = true;
        const origWhy = NC.OnlineChannels.why.bind(NC.OnlineChannels);
        NC.OnlineChannels.why = function safeChannelWhy(ch) {
          const curCh = String(NC.OnlineChannels.current?.() || '');
          const mapId = String(NC.OnlineChannels.mapId?.() || NC.game?.mapId || '');
          if (!curCh || mapId === 'puppetroom' || mapId === 'homefarm' || NC.StoryRoom?.inRoom?.() || NC.Trial?.inRoom?.()) {
            return 'แมพนี้ไม่มีแชนแนล (ต้องออกจากห้องนี้ก่อน)';
          }
          return origWhy(ch);
        };
      } catch (_) {}
    }
    // 5. Patch Nightcamp's NC.Online.socket.rpc('nc_join') during channel switches:
    //    Nightcamp's online/channels.js `joinWith()` only retries English `/leave current session|previous session is saving|switching character|try again/i`
    //    and FORGOT Thai `/ยังอยู่ในการต่อสู้/` (server combat_linger.go, 8s duration)! When `nc_join` throws `ตัวละครยังอยู่ในการต่อสู้`,
    //    `channels.js` immediately jumps to `catch (e)` and calls `sock.close()`, which disconnects the player out to the Character Select queue!
    const ensureSocketJoinLingerHook = () => {
      const s = NC.Online?.socket;
      if (!s || typeof s.rpc !== 'function' || s.__pmheeJoinLingerHooked) return;
      try {
        s.__pmheeJoinLingerHooked = true;
        const origSockRpc = s.rpc.bind(s);
        s.rpc = async function safeChannelJoinRpc(id, payload) {
          if (id !== 'nc_join') {
            return origSockRpc(id, payload);
          }
          for (let attempt = 0; attempt < 14; attempt++) {
            try {
              return await origSockRpc(id, payload);
            } catch (err) {
              const msg = String((err && err.message) || err || '');
              const inChannelMove = Boolean(NC.Online?.status === 'channel' || NC.OnlineChannels?.busy || channelSwitchInFlight);
              if (inChannelMove && /ยังอยู่ในการต่อสู้|in combat|combat|leave current session|previous session is saving|switching character|try again/i.test(msg)) {
                await new Promise(r => setTimeout(r, 900));
                continue;
              }
              if (inChannelMove && payload && payload.channelId && /เต็ม|full/i.test(msg) && !/เซิร์ฟเวอร์เต็ม|server full/i.test(msg)) {
                throw new Error('channel full');
              }
              throw err;
            }
          }
          return origSockRpc(id, payload);
        };
      } catch (_) {}
    };
    ensureSocketJoinLingerHook();
    if (NC.OnlineChannels && typeof NC.OnlineChannels.to === 'function' && !NC.OnlineChannels.__pmheeToHooked) {
      try {
        NC.OnlineChannels.__pmheeToHooked = true;
        const origTo = NC.OnlineChannels.to.bind(NC.OnlineChannels);
        NC.OnlineChannels.to = async function safeChannelTo(ch) {
          ensureSocketJoinLingerHook();
          return origTo(ch);
        };
      } catch (_) {}
    }
  }

  function closeAllBlockingGameWindows(game) {
    const NC = window.NC;
    try {
      if (NC?.HUD?.panel) NC.HUD.panel(null, false);
    } catch (_) {}
    try {
      document.querySelectorAll('#sq .win:not([hidden])').forEach(w => {
        const sqName = w.dataset?.sq;
        if (sqName && sqName !== 'story' && sqName !== 'talk' && sqName !== 'jobchange' && sqName !== 'fallen') {
          NC?.SQ?.close?.(sqName);
        }
      });
    } catch (_) {}
    try {
      ['#sp-close', '#ck-close', '#cg-close', '#lb-close', '#sw-close', '#skw-close', '#mw-close', '#so-close'].forEach(sel => {
        const btn = document.querySelector(sel);
        if (btn && btn.offsetWidth > 0) btn.click();
      });
    } catch (_) {}
    if (game && game.paused && !isAnyQuestDialogOpen()) {
      game.paused = false;
    }
  }

  function ensureCoinsForGardenQuest(game, p) {
    const NC = window.NC;
    if (!NC || !game || !p || p.dead > 0) return false;
    const Q = NC.Quests;
    const q = Q?.cur?.();
    if (!q || !Q?.state?.on || Q?.ready?.(q, p) || !Array.isArray(q.obj)) return false;

    let k = q.obj.findIndex((o, i) => o && o.k !== 'talk' && !Q.objDone(q, o, i, p));
    if (k < 0) k = q.obj.findIndex((o, i) => o && !Q.objDone(q, o, i, p));
    const o = k >= 0 ? q.obj[k] : null;
    if (!o || o.k !== 'life' || !Array.isArray(o.ids) || !o.ids.length) return false;

    const matId = String(o.ids[0] || '');
    const cropKey = matId.replace(/^lf_/, '');
    const cropDef = NC.Life?.CROPS?.[cropKey];
    if (!cropDef) return false;

    const seedId = cropDef.seed || ('sd_' + cropKey);
    const seedPrice = Number(cropDef.price) || 5;
    const haveProg = (Q.state?.prog && Q.state.prog[k]) || 0;
    const needTotal = Number(o.n) || 5;
    const plots = p.life?.garden?.plots || [];
    const growingCount = plots.filter(pl => pl && pl.s === 'crop' && pl.c === cropKey).length;
    const seedCount = NC.matCount ? NC.matCount(p, seedId) : (p.mats?.[seedId] || 0);
    const stillNeedMoreSeeds = (haveProg + growingCount * 2 + seedCount * 2) < needTotal;

    if (!stillNeedMoreSeeds || seedCount > 0 || (p.coins || 0) >= seedPrice) {
      return false;
    }

    // Player needs seeds for the garden quest, has 0 seeds in bag, and has fewer coins than 1 seed (`p.coins < seedPrice`)!
    // 1. Check if we have sellable monster materials or junk gear -> trigger immediate Camp Sell Trip (skipping potion buying!)
    const sellMats = getMaterialsToSell(p);
    const sellGear = getJunkGearUidsToSell(p);
    if (sellMats.length > 0 || sellGear.length > 0) {
      closeAllBlockingGameWindows(game);
      skipPotionBuyOnNextTrip = true;
      forceSellTripRequested = true;
      lastAutoSellDoneAt = 0;
      lastUnsellableHeavyAt = 0;
      setPlanTaskStatus(`🥕 เหรียญไม่พอซื้อเมล็ด${cropDef.name || cropKey} (${p.coins || 0}/${seedPrice}g) ➔ กลับค่ายไปขายขยะหาค่าเมล็ด...`);
      return runAutoSellTripTick(game, p);
    }

    // 2. Nothing in bag to sell and < seedPrice coins -> farm monsters in 'farm' (ไร่ฟักทอง) until we have enough coins/drops!
    closeAllBlockingGameWindows(game);
    if (NC.QuestAuto?.on && NC.QuestAuto?.job?.kind === 'garden') {
      try { NC.QuestAuto.stop?.('ฟาร์มเหรียญซื้อเมล็ดผักก่อน'); } catch (_) {}
    }
    if (game.mapId !== 'farm') {
      if (!NC.Travel?.on || NC.Travel.target?.map !== 'farm') {
        NC.Travel?.go?.(game, { map: 'farm', name: 'ไร่ฟักทอง (หาค่าเมล็ดผัก)' });
      }
      setPlanTaskStatus(`🥕 เหรียญไม่พอซื้อเมล็ด${cropDef.name || cropKey} (${p.coins || 0}g) ➔ เดินไปไร่ฟักทองเพื่อฟาร์มค่าเมล็ด...`);
      return true;
    }
    if (NC.Auto && !NC.Auto.on && !NC.Travel?.on) {
      try { NC.Auto.toggle?.(game); } catch (_) {}
    }
    setPlanTaskStatus(`🥕 ฟาร์มมอนหาค่าเมล็ด${cropDef.name || cropKey} (มี ${p.coins || 0}/${seedPrice * 3} เหรียญ)...`);
    return true;
  }

  function unblockNightcampQuestStalls(game, p, plan) {
    const NC = window.NC;
    if (!NC || !game || !p) return false;

    installLifeSkillUnlimitedHooks();
    try {
      if (window.__smartAutoQuestEnabled || window.__autoFarmLv20Config?.enabled) {
        runAutoMailClaimAndExpBoosts(game, p);
      }
    } catch (_) {}

    // 0. Auto-dismiss "มีอัปเดตใหม่ / Night Camp มีเวอร์ชันใหม่แล้ว" modal (.kw-win.up-card) & Update News (.up-news)
    try {
      const upCard = document.querySelector('.kw-win.up-card:not([hidden])');
      if (upCard && upCard.offsetWidth > 0 && Date.now() - lastUnblockClickAt > 500) {
        const laterBtn = upCard.querySelector('button.up-later:not([disabled]):not([hidden])');
        const goBtn = upCard.querySelector('button.up-go:not([disabled]):not([hidden])');
        if (laterBtn && laterBtn.offsetWidth > 0) {
          lastUnblockClickAt = Date.now();
          laterBtn.click();
          return true;
        } else if (goBtn && goBtn.offsetWidth > 0 && NC.OnlineUpdate?.state?.offer?.mandatory) {
          lastUnblockClickAt = Date.now();
          goBtn.click();
          return true;
        }
      }
      if (NC.OnlineUpdate?.closeNews) {
        const upNews = document.querySelector('.up-news:not([hidden])');
        if (upNews && upNews.offsetWidth > 0) {
          NC.OnlineUpdate.closeNews();
        }
      }
    } catch (_) {}

    // 0b. If we are outside camp (e.g. in homefarm or hunting maps) and a leftover Shop/Cooking/Crafting window is open and pausing the game, close it!
    try {
      const L = NC.Lessons?.cur?.();
      const rawStep = NC.Lessons?.step?.();
      const c = (rawStep && rawStep.c) ? rawStep.c : rawStep;
      const lessonWantsWindow = Boolean(L && c && !(rawStep && rawStep.done) && (c.ev === 'sell' || c.ev === 'buy' || c.have === 'potions' || c.ev === 'cook' || c.ev === 'eat' || c.life === 'cook' || c.ev === 'brew' || c.ev === 'refine' || c.ev === 'p_refine'));
      if (!lessonWantsWindow && (game.mapId !== 'camp' || (NC.QuestAuto?.on && NC.QuestAuto?.job))) {
        const hasOpenShopOrCraft = Boolean(
          document.querySelector('#sq .win[data-sq="shop"]:not([hidden]), #sq .win[data-sq="craft"]:not([hidden]), #sq .win[data-sq="cook"]:not([hidden])') ||
          ['#sp-close', '#ck-close', '#cg-close'].some(sel => { const b = document.querySelector(sel); return b && b.offsetWidth > 0; })
        );
        if (hasOpenShopOrCraft || (game.paused && !isAnyQuestDialogOpen())) {
          closeAllBlockingGameWindows(game);
        }
      }
    } catch (_) {}

    // 0c. Ensure enough coins to buy seeds on Garden/Farming quests (e.g. MQ04 แปลงผักของยาย)
    try {
      if (ensureCoinsForGardenQuest(game, p)) return true;
    } catch (_) {}

    // 1. Auto-Revive on Death
    if (p.dead > 0 || document.querySelector('#sq .win[data-sq="fallen"]:not([hidden])')) {
      const reviveBtn = document.querySelector('#sq .win[data-sq="fallen"]:not([hidden]) button:not([disabled]), #fallwin:not([hidden]) button:not([disabled])');
      if (reviveBtn && Date.now() - lastUnblockClickAt > 1200) {
        lastUnblockClickAt = Date.now();
        setPlanTaskStatus('💖 ฟื้นคืนชีพอัตโนมัติ...');
        reviveBtn.click();
        return true;
      }
    }

    // 2. Ensure NC.Auto hands over to NC.QuestAuto when a quest finishes
    if (NC.Auto?.set && NC.Auto.set.questIn !== true) {
      NC.Auto.set.questIn = true;
    }

    // 3. Auto-advance Story Comic Panels (.sp-pop:not([hidden]) is the real controller; #sq [data-sq="story"] mirrors it!)
    //    CRITICAL: Click .sp-pop:not([hidden]) button[data-c] directly (without checking offsetWidth, because #sq sets display:none on .sp-pop,
    //    and WITHOUT calling NC.SQ.close('story') prematurely so .sp-pop advances 1/2 -> 2/2 -> finishes and runs its onDone callback!)
    const activeSpPops = Array.from(document.querySelectorAll('.sp-pop')).filter(e => !e.hidden);
    const sqStory = document.querySelector('#sq .win[data-sq="story"]:not([hidden])');
    if (activeSpPops.length > 0) {
      if (Date.now() - lastUnblockClickAt > 350) {
        lastUnblockClickAt = Date.now();
        const pop = activeSpPops[0];
        const btn = pop.querySelector('button[data-c]:not([disabled]), [data-c="next"]:not([disabled]), [data-c="done"]:not([disabled]), [data-c="a"]:not([disabled]), [data-c="b"]:not([disabled]), button:not([disabled])');
        if (btn) {
          btn.click();
          return true;
        }
      }
    } else if (sqStory) {
      if (Date.now() - lastUnblockClickAt > 350) {
        lastUnblockClickAt = Date.now();
        const btn = sqStory.querySelector('button[data-c]:not([disabled]), button:not([disabled])');
        if (btn) btn.click();
        else { try { NC.SQ?.close?.('story'); } catch (_) {} }
        return true;
      }
    }

    // 3b. Auto-claim "Quest Complete" reward popup (#sq .win[data-sq="questdone"]:not([hidden]) / .ls-done)
    //     Close immediately without returning early so questdone cards never block active shop/talk/lesson actions!
    const sqQuestDone = document.querySelector('#sq .win[data-sq="questdone"]:not([hidden])');
    if (sqQuestDone) {
      const claimBtn = sqQuestDone.querySelector('button[data-a="ok"]:not([disabled]), button.bt.pr:not([disabled]), [data-sqb="close"]:not([disabled]), button:not([disabled])');
      if (claimBtn) { try { claimBtn.click(); } catch (_) {} }
      try { NC.SQ?.close?.('questdone'); } catch (_) {}
    }
    const lsDoneBox = document.querySelector('.ls-done');
    if (lsDoneBox) {
      const nextBtn = lsDoneBox.querySelector('button:not([disabled])');
      if (nextBtn) { try { nextBtn.click(); } catch (_) {} }
      else { try { lsDoneBox.remove(); } catch (_) {} }
    }

    // 4. Auto-clear Quest Dialog (#qdlg & #sq .win[data-sq="talk"]) 3-second countdown & qaHold freeze
    const qdlg = document.getElementById('qdlg');
    const sqTalk = document.querySelector('#sq .win[data-sq="talk"]:not([hidden])');
    if ((qdlg && !qdlg.hidden) || sqTalk) {
      if (qdlg) delete qdlg.dataset.qaHold;
      const qBtn = (qdlg && !qdlg.hidden && qdlg.querySelector('[data-qd="in"]:not([disabled]), [data-qd="sin"]:not([disabled]), [data-qd="take"]:not([disabled]), [data-qd="staken"]:not([disabled])')) ||
                   (sqTalk && sqTalk.querySelector('[data-qd="in"]:not([disabled]), [data-qd="sin"]:not([disabled]), [data-qd="take"]:not([disabled]), [data-qd="staken"]:not([disabled])'));
      if (qBtn && Date.now() - lastUnblockClickAt > 350) {
        lastUnblockClickAt = Date.now();
        qBtn.click();
        return true;
      }
    }

    // 5. Auto-complete Interactive Lesson UI & Life-Skill Steps (L1-L36)
    try {
      const L = NC.Lessons?.cur?.();
      const rawStep = NC.Lessons?.step?.();
      const c = (rawStep && rawStep.c) ? rawStep.c : rawStep;
      if (L && c && !(rawStep && rawStep.done)) {
        // 5.1 Lesson Life-Skill Gathering Steps (L2 chop, L20 สมุดอาชีพเสริม ev:'life', L32 life:'wood', L33 ev:'g_mine', L34 ev:'g_fish', L36 life:'mine')
        //     When account does not have AUTO Premium (NC.AutoPremium.lifeGate(game) is non-empty) or for fishing (L34),
        //     NC.QuestAuto's gatherJob is blocked by lifeGate. Use our manual-style gather driver instead!
        const isLessonLifeStep = (c.ev === 'life' || c.ev === 'chop' || c.life === 'wood' || c.ev === 'g_mine' || c.life === 'mine' || c.ev === 'g_fish');
        if (isLessonLifeStep) {
          const gated = Boolean(NC.AutoPremium?.lifeGate?.(game)) || c.ev === 'g_fish' || !NC.QuestAuto?.job;
          if (gated) {
            const skill = (c.ev === 'g_mine' || c.life === 'mine') ? 'mine' : (c.ev === 'g_fish' ? 'fish' : 'wood');
            const targetMap = c.go || (skill === 'mine' ? 'quarry1' : (skill === 'fish' ? 'homefarm' : 'farm'));
            const label = skill === 'mine' ? ('ขุดแร่ (' + L.title + ')') : (skill === 'fish' ? ('ตกปลา (' + L.title + ')') : ('ตัดไม้ (' + L.title + ')'));
            runManualLifeGatherStep(game, p, { skill, map: targetMap, label });
            return true;
          }
        }

        if (Date.now() - lastUnblockClickAt > 700) {
          // Job change lesson (L10):
          // - If Plan Script is ON -> auto change to plan.class1Target
          // - If Plan Script is OFF -> open jobchange window and WAIT for user to choose their class manually!
          if (c.tier === 1 && NC.canChangeJob?.(p)) {
            if (window.__planScriptEnabled && plan?.autoJobChange !== false) {
              lastUnblockClickAt = Date.now();
              const wantC1 = String(plan?.class1Target || 'priest').toLowerCase();
              NC.HUD?.changeJob?.(wantC1);
              return true;
            } else {
              const sqJob = document.querySelector('#sq .win[data-sq="jobchange"]:not([hidden])');
              if (!sqJob) {
                try { NC.SQ?.open?.('jobchange'); } catch (_) {}
              }
              return false;
            }
          }
          // Sit by campfire (L5)
          if (c.ev === 'sitfire' && game.mapId === 'camp') {
            const fire = (NC.NPCS?.camp || []).find(n => n.id === 'fire') || NC.CAMP_SPOT?.fire;
            if (fire && Math.hypot((p.x || 0) - fire.x, (p.y || 0) - fire.y) < 360 && !p.sitting && !p.sit) {
              lastUnblockClickAt = Date.now();
              if (typeof NC.Rest?.sitDown === 'function') NC.Rest.sitDown(game);
              else if (typeof NC.Rest?.toggle === 'function') NC.Rest.toggle(game);
              return true;
            }
          }
          // Sell at Uncle Coco (L6)
          if (c.ev === 'sell') {
            const sellTab = document.querySelector('#sq .win[data-sq="shop"]:not([hidden]) [data-tab="sell"]:not(.on), #shopwin:not([hidden]) [data-tab="sell"]:not(.on)');
            if (sellTab) {
              lastUnblockClickAt = Date.now();
              sellTab.click();
              setTimeout(() => {
                const sb = document.querySelector('#sq .win[data-sq="shop"]:not([hidden]) [data-sellm]:not([disabled]), #sq .win[data-sq="shop"]:not([hidden]) [data-sellall]:not([disabled]), #shopwin:not([hidden]) [data-sell="1"]:not([disabled])');
                if (sb) sb.click();
              }, 160);
              return true;
            }
            const sellBtn = document.querySelector('#sq .win[data-sq="shop"]:not([hidden]) [data-sellm]:not([disabled]), #sq .win[data-sq="shop"]:not([hidden]) [data-sellall]:not([disabled]), #shopwin:not([hidden]) [data-sellm]:not([disabled]), #shopwin:not([hidden]) [data-sellall]:not([disabled]), #shopwin:not([hidden]) [data-sell="1"]:not([disabled])');
            if (sellBtn) {
              lastUnblockClickAt = Date.now();
              sellBtn.click();
              return true;
            }
          }
          // Buy potions at Uncle Coco (L6 / L18 / L25 / L31)
          if (c.ev === 'buy' || c.have === 'potions') {
            const buyTab = document.querySelector('#sq .win[data-sq="shop"]:not([hidden]) [data-tab="buy"]:not(.on), #shopwin:not([hidden]) [data-tab="buy"]:not(.on)');
            if (buyTab) {
              lastUnblockClickAt = Date.now();
              buyTab.click();
              return true;
            }
            const buyGo = document.querySelector('#sq .win[data-sq="shop"]:not([hidden]) [data-cgo]:not([disabled]), #shopwin:not([hidden]) [data-cgo]:not([disabled])');
            const addRed = document.querySelector('#sq .win[data-sq="shop"]:not([hidden]) [data-cart="red"]:not([disabled]), #sq .win[data-sq="shop"]:not([hidden]) [data-buy="red"]:not([disabled]), #shopwin:not([hidden]) [data-buy="red"]:not([disabled]), #shopwin:not([hidden]) [data-buy]:not([disabled])');
            if (addRed) {
              lastUnblockClickAt = Date.now();
              addRed.click();
              setTimeout(() => {
                const bg = document.querySelector('#sq .win[data-sq="shop"]:not([hidden]) [data-cgo]:not([disabled]), #shopwin:not([hidden]) [data-cgo]:not([disabled])');
                if (bg) bg.click();
              }, 180);
              return true;
            } else if (buyGo) {
              lastUnblockClickAt = Date.now();
              buyGo.click();
              return true;
            }
          }
          // Refine / Grade / Optstone at Papa Muri (L7, L26, L27)
          if (c.ev === 'p_refine' || c.ev === 'refine') {
            if (c.ev === 'p_refine') {
              try { NC.CraftGo?.open?.('refine', 'smith'); } catch (_) {}
              NC.Lessons?.ev?.('p_refine');
            }
            const rfBtn = document.querySelector('#sq .win[data-sq="craft"]:not([hidden]) [data-rfgo]:not([disabled]), #sq .win[data-sq="refine"]:not([hidden]) [data-rfgo]:not([disabled]), #craftgo:not([hidden]) [data-act^="rf:go"]:not([disabled])');
            if (rfBtn) {
              lastUnblockClickAt = Date.now();
              rfBtn.click();
              return true;
            }
          }
          // Cook & Eat at Auntie Bear (L8, L35)
          if (c.ev === 'cook' || c.ev === 'eat' || c.life === 'cook') {
            try { NC.CraftGo?.open?.('cook', 'bear'); } catch (_) {}
            NC.Lessons?.ev?.('p_cook');
            const dishBtn = document.querySelector('#sq .win[data-sq="craft"]:not([hidden]) [data-dish="fd_carrot_stew"]:not(.pk), #sq .win[data-sq="cook"]:not([hidden]) [data-dish="fd_carrot_stew"], #craftgo:not([hidden]) [data-cgdish="fd_carrot_stew"]');
            const cookBtn = document.querySelector('#sq .win[data-sq="craft"]:not([hidden]) [data-cookn="1"]:not([disabled]), #sq .win[data-sq="cook"]:not([hidden]) [data-cookn="1"]:not([disabled]), #craftgo:not([hidden]) [data-cgcook="1"]:not([disabled])');
            const eatBtn = document.querySelector('#sq .win[data-sq="craft"]:not([hidden]) [data-eatdish]:not([disabled]), #sq .win[data-sq="cook"]:not([hidden]) [data-eatdish]:not([disabled]), #craftgo:not([hidden]) [data-cgeat]:not([disabled])');
            if ((c.ev === 'cook' || c.life === 'cook') && cookBtn) {
              lastUnblockClickAt = Date.now();
              cookBtn.click();
              return true;
            } else if ((c.ev === 'cook' || c.life === 'cook') && dishBtn) {
              lastUnblockClickAt = Date.now();
              dishBtn.click();
              return true;
            } else if (c.ev === 'eat' && eatBtn) {
              lastUnblockClickAt = Date.now();
              eatBtn.click();
              return true;
            }
          }
          // Brew potion outside camp (L19)
          if (c.ev === 'brew') {
            try { NC.CraftGo?.open?.('brew'); } catch (_) {}
            const brewBtn = document.querySelector('#sq .win[data-sq="craft"]:not([hidden]) [data-brewn]:not([disabled]), #craftgo:not([hidden]) [data-brew]:not([disabled])');
            if (brewBtn) {
              lastUnblockClickAt = Date.now();
              brewBtn.click();
              return true;
            }
          }
          // Upgrade life tools (L32 axe, L35 pot)
          if (c.tool === 'axe' || c.tool === 'pot') {
            const upBtn = document.querySelector('#sq [data-act="up:' + c.tool + '"]:not([disabled]), #lifementor [data-act="up:' + c.tool + '"]:not([disabled]), #sq .win[data-sq="life"] [data-up="' + c.tool + '"]:not([disabled]), [data-up="' + c.tool + '"]:not([disabled])');
            if (upBtn) {
              lastUnblockClickAt = Date.now();
              upBtn.click();
              return true;
            }
          }
          // Allocate 1 stat point or 1 skill point during lesson L11 (or fire ev('stat')/ev('skillup') if points were already auto-allocated!)
          if (c.ev === 'stat') {
            lastUnblockClickAt = Date.now();
            if ((NC.statusLeft?.(p) || 0) > 0) {
              const statKey = (p.job === 'mage' || p.job === 'priest') ? 'int' : (p.job === 'archer' ? 'dex' : 'str');
              if (NC.raiseStat?.(p, statKey, 1)) {
                NC.applyGear?.(game);
                NC.saveGame?.(game);
              }
            }
            try {
              NC.Lessons?.ev?.('stat');
              closeAllBlockingGameWindows(game);
            } catch (_) {}
            return true;
          }
          if (c.ev === 'skillup') {
            lastUnblockClickAt = Date.now();
            const plan = window.__currentScriptPlan || DEFAULT_NC_WOLF_PLAN;
            const hasCustomQueue = Boolean(
              window.__planScriptEnabled &&
              ((Array.isArray(plan?.skillBuild?.skillPointQueue) && plan.skillBuild.skillPointQueue.length > 0) ||
               (plan?.skillBuild?.plannedLevels && Object.keys(plan.skillBuild.plannedLevels).length > 0))
            );
            if (hasCustomQueue) {
              try { runAutoStatAndSkill(game, p, plan); } catch (_) {}
            } else if ((NC.skillLeft?.(p) || 0) > 0) {
              const jobSkills = NC.JOBS?.[p.job]?.skills || [];
              const pickSk = jobSkills.find(id => NC.SKILLS?.[id] && ((NC.skillRaw || NC.skillLv)(p, id) || 0) < (NC.SKILLS[id].max || 5) && NC.skillReqMet?.(p, id));
              if (pickSk && NC.raiseSkill?.(p, pickSk)) {
                try { NC.autoSlot?.(p, pickSk); } catch (_) {}
                NC.applyGear?.(game);
                NC.saveGame?.(game);
              }
            }
            try {
              NC.Lessons?.ev?.('skillup');
              closeAllBlockingGameWindows(game);
            } catch (_) {}
            return true;
          }
          // Turn on Auto outside camp (L9) — close any leftover Crafting/Shop window first, walk out to farm if in camp, NEVER toggle off!
          if (c.ev === 'autoon') {
            lastUnblockClickAt = Date.now();
            try {
              closeAllBlockingGameWindows(game);
            } catch (_) {}
            if (game.mapId === 'camp') {
              if (!NC.Travel?.on) {
                NC.Travel?.go?.(game, { map: c.go || 'farm', name: 'ออกไปเปิดออโต้' });
              }
              return true;
            }
            if (!NC.Auto?.on) {
              if (typeof NC.Auto?.toggle === 'function') NC.Auto.toggle(game);
            }
            try { NC.Lessons?.ev?.('autoon'); } catch (_) {}
            return true;
          }
          // Equip lesson gift (L12)
          if (c.ev === 'p_bag' || c.ev === 'equip') {
            lastUnblockClickAt = Date.now();
            NC.Lessons?.ev?.('p_bag');
            const giftId = NC.Lessons?.state?.gift;
            if (giftId) {
              const idx = (p.inv || []).findIndex(it => it && it.id === giftId);
              if (idx >= 0) {
                if (typeof NC.equipItem === 'function') NC.equipItem(game, idx);
                else if (typeof NC.useItem === 'function') NC.useItem(game, idx);
                return true;
              }
            }
            if (equipBestFromBag(game, p, '')) {
              return true;
            }
          }
          // Bigmap & Warphome (L13, L14)
          if (c.ev === 'p_bigmap' || c.ev === 'warphome') {
            lastUnblockClickAt = Date.now();
            NC.Lessons?.ev?.('p_bigmap');
            if (c.ev === 'warphome') {
              const warpBtn = document.querySelector('#sq .win[data-sq="map"]:not([hidden]) [data-warp="camp"]:not([disabled]), #mapwin:not([hidden]) [data-warp="camp"]:not([disabled]), #bigmap:not([hidden]) [data-warp="camp"]:not([disabled])');
              if (warpBtn) {
                warpBtn.click();
                return true;
              } else {
                try { NC.Hub?.open?.('warp'); } catch (_) {}
              }
            }
            return true;
          }
          // Panel-opening & online-alt tutorial lessons (L15-L36)
          const autoEvList = [
            'daily', 'p_party', 'p_life', 'hub_market', 'p_vend', 'p_guild', 'p_ranks',
            'p_rootlobby', 'cg_out', 'p_grade', 'p_opt', 'p_bl', 'p_runes', 'p_skills',
            'p_gwar', 'p_smelt', 'p_orders', 'runemerge', 'polish', 'optstone', 'essence', 'oilmake'
          ];
          if ((c.ev && autoEvList.includes(c.ev)) || c.fn === 'rune') {
            lastUnblockClickAt = Date.now();
            const ONLINE_ALT_MAP = {
              refine: 'p_refine', cook: 'p_cook', eat: 'p_cook', equip: 'p_bag',
              runemerge: 'p_runes', polish: 'p_grade', optstone: 'p_opt', essence: 'p_bl', oilmake: 'p_bl'
            };
            if (c.fn === 'rune') {
              NC.Lessons?.ev?.('p_skills');
            } else {
              NC.Lessons?.ev?.(c.ev);
              if (ONLINE_ALT_MAP[c.ev]) NC.Lessons?.ev?.(ONLINE_ALT_MAP[c.ev]);
            }
            setTimeout(() => {
              try {
                if (game.paused && NC.HUD?.closeAll) NC.HUD.closeAll();
                if (NC.QuestAuto?.on && !isAnyQuestDialogOpen()) NC.QuestAuto.next?.();
              } catch (_) {}
            }, 350);
            return true;
          }
          if (Array.isArray(c.ring)) {
            for (const r0 of c.ring) {
              const sel = typeof r0 === 'function' ? r0() : r0;
              if (!sel || sel === '#autobt' || sel === '#af-btn' || sel === '#hud-panels' || String(sel).includes('autoT') || String(sel).includes('af-btn')) continue;
              const targetEl = document.querySelector(sel + ':not([disabled])');
              if (targetEl && targetEl.offsetWidth > 0) {
                lastUnblockClickAt = Date.now();
                targetEl.click();
                return true;
              }
            }
          }
        }
      }
    } catch (_) {}

    // 5b. If NC.QuestAuto is waiting because a modal left game.paused = true after step completion (and NO dialog is open), unpause & advance
    try {
      if (NC.QuestAuto?.on && NC.QuestAuto?.waiting?.() && !isJobChangeQuestStepNow(p) && !isAnyQuestDialogOpen() && Date.now() - lastUnblockClickAt > 2500) {
        lastUnblockClickAt = Date.now();
        if (game.paused) {
          try { NC.HUD?.closeAll?.(); } catch (_) {}
          game.paused = false;
        }
        NC.QuestAuto.next?.();
        return true;
      }
    } catch (_) {}

    // 6. Auto-Summon Wolf (Wolf Hunter), Battle Puppet (Puppeteer / Showmaster), and Elemental Orbs (Archmage / Astral)
    // 7. Auto-Summon & Class Stance Maintenance (Wolf Hunter, Puppeteer Shield/Axe Stance, Archmage Orbs)
    runClassSummonAndStanceMaintenanceTick(game, p);

    return false;
  }

  function runClassSummonAndStanceMaintenanceTick(game, p) {
    const NC = window.NC;
    if (!NC || !game || !p || p.dead > 0 || game.mapId === 'camp' || game.mapId === 'homefarm' || game.mapId === 'puppetroom') return false;
    if (p.skillLock > 0 || p.casting || p.channel || p.lifeAct || p.fishAct) return false;
    try {
      const castLearnedBuffOrSummon = (skId, minSp = 15) => {
        if (((NC.skillRaw || NC.skillLv)?.(p, skId) || 0) <= 0) return false;
        const cd = (NC.skillCd ? NC.skillCd(p, skId) : (p.cds && p.cds[skId])) || 0;
        if (cd > 0 || (p.sp || 0) < minSp || Date.now() - lastUnblockClickAt <= 1800) return false;
        lastUnblockClickAt = Date.now();
        const hb = NC.hotbarOf?.(p) || {};
        let skKey = Object.keys(hb).find(k => hb[k] === skId);
        if (!skKey && typeof NC.autoSlot === 'function') {
          NC.autoSlot(p, skId);
          skKey = Object.keys(NC.hotbarOf?.(p) || {}).find(k => NC.hotbarOf(p)[k] === skId);
        }
        if (skKey && typeof NC.castSkill === 'function') {
          NC.castSkill(game, p, skKey);
          return true;
        }
        return false;
      };

      const ownPets = [
        ...(Array.isArray(NC.Pets?.list) ? NC.Pets.list.filter(q => q && (q.owner === p || (p.name && q.owner?.name === p.name))) : []),
        ...(typeof NC.OnlinePets?.own === 'function' ? (NC.OnlinePets.own(p) || []) : [])
      ];
      if (p.job === 'wolfhunter' || p.job === 'packalpha') {
        const hasWolf = Boolean(
          (p.buffs && p.buffs.wh_wolf > 0) ||
          ownPets.some(q => q && (q.type === 'wolf' || q.skill === 'wh_wolf') && !(q.dead > 0) && (q.hp === undefined || q.hp > 0))
        );
        if (!hasWolf) return castLearnedBuffOrSummon('wh_wolf', 15);
      } else if (p.job === 'puppeteer' || p.job === 'showmaster') {
        const livePuppet = ownPets.find(q => q && /^pp_/.test(String(q.type || '')) && !(q.dead > 0) && (q.hp === undefined || q.hp > 0));
        const hasPuppet = Boolean(livePuppet || (p.buffs && p.buffs.pp_puppet > 0));
        if (!hasPuppet) {
          return castLearnedBuffOrSummon('pp_puppet', 30);
        } else if (livePuppet) {
          // Smart Puppet Stance:
          // - Solo Puppeteer (no party members): switches to `pp_shield` (`หุ่นโล่` — 1.5x Max HP + Taunt on every hit + AoE Roar Taunt every 6s!)
          // - Party Puppeteer (in party): keeps `pp_axe` (`หุ่นขวาน` — AoE cleave & spin!)
          const partyPeers = NC.PartyNet?.others?.() || [];
          const wantBuild = partyPeers.length > 0 ? 'pp_axe' : 'pp_shield';
          const curType = String(livePuppet.type || '');
          if (curType && curType !== wantBuild && Date.now() - (window.__lastPuppetStanceSwitchAt || 0) > 4500) {
            if (castLearnedBuffOrSummon('pp_puppet', 35)) {
              window.__lastPuppetStanceSwitchAt = Date.now();
              return true;
            }
          }
        }
      } else if (p.job === 'archmage' || p.job === 'astral') {
        for (const orbId of ['am_orbfire', 'am_orbwater', 'am_orbwind']) {
          if (!(p.buffs && p.buffs[orbId])) {
            if (castLearnedBuffOrSummon(orbId, 15)) return true;
          }
        }
      }
    } catch (_) {}
    return false;
  }

  // ============================================================================
  // 3B. 🧠 UPGRADE BOT AI (FAST SERVER-SYNCED LOOT, ANTI-ORBIT, ZONE SEEKER & CO-SPAWN CLEARER)
  // ============================================================================
  let lastDirectLootPickupAt = 0;
  let lastCoSpawnPickAt = 0;
  let noWantedMonSince = 0;
  let inAiPickCall = false;

  // Find which zone(s) on the current map spawn the wanted species, plus any co-spawning species sharing the same spawn table
  function findWantedZoneAndCoSpawners(game, offSet) {
    const NC = window.NC;
    const mapId = game?.mapId;
    if (!NC || !mapId) return { zones: [], coSpawners: new Set() };
    const roster = NC.ROSTER?.[mapId] || {};
    const mapZones = Array.isArray(NC.MAPS?.[mapId]?.zones) ? NC.MAPS[mapId].zones : [];
    const wantedSet = new Set(Object.keys(NC.MONSTERS || {}).filter(k => !offSet.has(k)));
    const matchingZoneNames = new Set();
    const coSpawners = new Set();

    for (const [zName, groups] of Object.entries(roster)) {
      if (!groups || typeof groups !== 'object') continue;
      for (const pool of Object.values(groups)) {
        if (!Array.isArray(pool)) continue;
        const speciesInPool = pool.map(entry => Array.isArray(entry) ? entry[0] : null).filter(Boolean);
        const hasWanted = speciesInPool.some(sp => wantedSet.has(sp));
        if (hasWanted) {
          if (zName !== '*') matchingZoneNames.add(zName);
          for (const sp of speciesInPool) {
            if (!wantedSet.has(sp)) coSpawners.add(sp);
          }
        }
      }
    }

    const zones = mapZones.filter(z => z && z.name && matchingZoneNames.has(z.name) && Array.isArray(z.rect) && z.rect.length >= 4);
    return { zones, coSpawners, wantedSet };
  }

  function findWalkablePointInRect(game, rect) {
    const [x1, y1, x2, y2] = rect;
    const cx = Math.round((x1 + x2) / 2);
    const cy = Math.round((y1 + y2) / 2);
    const w = game?.world;
    if (!w || typeof w.fits !== 'function') return [cx, cy];
    if (w.fits(cx, cy, 24)) return [cx, cy];
    for (let r = 40; r <= 560; r += 40) {
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const tx = Math.round(cx + Math.cos(a) * r);
        const ty = Math.round(cy + Math.sin(a) * r);
        if (tx >= x1 + 40 && tx <= x2 - 40 && ty >= y1 + 40 && ty <= y2 - 40 && w.fits(tx, ty, 24)) {
          return [tx, ty];
        }
      }
    }
    return [cx, cy];
  }

  function isValidUpgradeLootDrop(game, p, l) {
    const NC = window.NC;
    if (!l || l.kind !== 'loot' || l.done || l.petHeld) return false;
    if (l._aiSkipUntil && l._aiSkipUntil > (game.time || 0)) return false;
    if (NC?.LootFilter?.leaves && NC.LootFilter.leaves(l)) return false;
    if (l.mat && NC?.matFull && NC.matFull(p, l.mat)) return false;
    if (l.inst && NC?.GEAR?.room && !NC.GEAR.room(p)) return false;
    if (NC?.loadHolds && NC.loadHolds(p, l)) return false;
    return true;
  }

  function isDarkOrUndeadEnemy(e) {
    if (!e || e.dead || !(e.hp > 0) || e.dummy || e.npc) return false;
    const NC = window.NC;
    const m = (NC?.MONSTERS && NC.MONSTERS[e.type]) || {};
    const el = String(e.element || m.element || '').toLowerCase();
    if (el === 'undead' || el === 'shadow' || el === 'dark') return true;
    if (m.undead || e.undead) return true;
    const label = `${e.type || ''} ${e.name || ''} ${m.name || ''}`;
    return /zombie|skeleton|ghoul|wraith|lich|undead|shadow|bone_|coffin|crypt|drowned|mummy|vampire|ซอมบี้|โครงกระดูก|อัศวินกระดูก|หมอผีกระดูก|กองกระดูก|ผีคนเก็บพิษ|โลงผี|โลงศพ|ราชาสุสาน|ชาวประมงจมน้ำ|ทหารเกราะสนิม|ยามหอคอยกลวง|ชาวนากลวง|คนขายตะเกียงกลวง|กุลีกลวง|ปูกะโหลก/i.test(label);
  }

  function ensureUpgradeBotAiStyles() {
    try {
      document.documentElement.classList.toggle('pmhee-upgrade-ai', Boolean(window.__upgradeBotAiEnabled));
      if (!document.getElementById('pmhee-upgrade-ai-css') && document.head) {
        const st = document.createElement('style');
        st.id = 'pmhee-upgrade-ai-css';
        st.textContent = [
          'html.pmhee-upgrade-ai #sq [data-sq="auto"] [data-f="p2"], html.pmhee-upgrade-ai #sq [data-sq="autosup"] [data-f="p2"] { display: none !important; }',
          '#sq .win[data-sq="autosup"] [data-f="l"] > .as-slots:first-of-type, #autofarm .as-slots:first-of-type { display: grid !important; grid-template-columns: repeat(8, 34px) !important; gap: 6px 8px !important; flex-wrap: wrap !important; }',
          '#sq .win[data-sq="autosup"] .as-slots, #autofarm .as-slots { flex-wrap: wrap !important; }',
          '#sq .win[data-sq="skill"] .sk[data-slot="1"] .ic, #sq .win[data-sq="skill"] img[data-drag], #sq .win[data-sq="skill"] .slot[data-key] { cursor: grab !important; -webkit-user-drag: element !important; }',
          '#sq .win[data-sq="skill"] .sk .ic img, #sq .win[data-sq="skill"] .sk .ic b, #sq .win[data-sq="skill"] .slot[data-key] b { pointer-events: none !important; }',
          '.pmhee-drop-hover { box-shadow: 0 0 0 2.5px #ffc93c, inset 0 0 0 2px #1d2b55 !important; transform: scale(1.07); transition: transform 0.08s ease; z-index: 20 !important; }',
          '.pmhee-drop-ready { box-shadow: 0 0 0 1.5px rgba(255, 201, 60, 0.72), inset 0 0 0 1.5px #1d2b55 !important; }'
        ].join('\n');
        document.head.appendChild(st);
      }
    } catch (_) {}
  }

  function ensureDualHotbarHudDom() {
    const NC = window.NC;
    const bc = document.querySelector('#sq .hud [data-p="bc"]');
    if (!bc || !NC) return null;
    if (!bc.querySelector('[data-a="slot2"]')) {
      const S = 40, GAP = 5, ROW = 10 * S + 9 * GAP + 10, X0 = -Math.round(ROW / 2);
      const keys = NC.HOTKEYS || ['q', 'e', 'r', 'f', '3', '4', '5', '6'];
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        const slotKey = '2:' + k;
        const btn = document.createElement('button');
        btn.className = 'ghost qs pmhee-slot2';
        btn.setAttribute('data-a', 'slot2');
        btn.setAttribute('data-k', slotKey);
        btn.style.cssText = `left: ${X0 + i * (S + GAP)}px; top: -107px; width: ${S}px; height: ${S}px; display: none`;
        btn.innerHTML = `<img data-f="ic" alt="" style="width: 34px; height: 34px"><u data-f="cd"></u><s data-f="cdt"></s><i>2·${k.toUpperCase()}</i>`;
        bc.insertBefore(btn, bc.firstChild);
      }
    }
    return bc;
  }

  function updateDualHotbarHud(game, p) {
    const NC = window.NC;
    if (!NC) return;
    const bc = ensureDualHotbarHudDom();
    if (!bc) return;
    const hero = p || NC.game?.player;
    const page2On = Boolean(NC.Bar && typeof NC.Bar.page === 'function' && NC.Bar.page() === 1);
    const keys = NC.HOTKEYS || ['q', 'e', 'r', 'f', '3', '4', '5', '6'];
    const plusSrc = (NC.SQ && typeof NC.SQ.ic === 'function') ? NC.SQ.ic('ui_plus') : 'assets/ui/sq/ui_plus.png';

    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const slotKey = '2:' + k;
      const b = bc.querySelector(`[data-a="slot2"][data-k="${slotKey}"]`);
      if (!b) continue;
      const wantDisplay = page2On ? 'flex' : 'none';
      if (b.style.display !== wantDisplay) b.style.display = wantDisplay;
      if (!page2On || !hero) continue;

      const id = (typeof NC.skillForKey === 'function') ? NC.skillForKey(hero, slotKey) : (hero.hotbar && hero.hotbar[slotKey]);
      const Sk = (id && NC.SKILLS) ? NC.SKILLS[id] : null;
      const src = Sk ? ((NC.ASSET_MANIFEST?.[Sk.icon]?.src) || (NC.SPR?.[Sk.icon]?.src) || '') : '';
      const img = b.querySelector('[data-f="ic"]');
      const cdU = b.querySelector('[data-f="cd"]');
      const cdtS = b.querySelector('[data-f="cdt"]');

      if (!Sk || !src) {
        if (img && img.getAttribute('src') !== plusSrc) img.setAttribute('src', plusSrc);
        if (img) img.style.cssText = 'width: 14px; height: 14px; opacity: .75';
        if (cdU && cdU.style.height !== '0%') cdU.style.height = '0%';
        if (cdtS && cdtS.textContent !== '') cdtS.textContent = '';
        const lbl = `ช่องสกิล 2·${k.toUpperCase()} ว่าง`;
        if (b.title !== lbl) {
          b.title = lbl;
          b.setAttribute('aria-label', lbl);
        }
      } else {
        const lv = (typeof NC.skillLv === 'function') ? NC.skillLv(hero, id) : (hero.skills?.[id] || 1);
        const cost = (typeof NC.skillCost === 'function') ? NC.skillCost(hero, id, lv) : 0;
        const left = (typeof NC.skillCd === 'function') ? NC.skillCd(hero, id) : 0;
        const full = (typeof NC.skillCdFull === 'function') ? NC.skillCdFull(hero, id) : 1;
        const nosp = (hero.sp || 0) < cost;
        if (img && img.getAttribute('src') !== src) img.setAttribute('src', src);
        if (img) img.style.cssText = 'width: 34px; height: 34px' + (nosp ? '; opacity: .45' : '');
        const pct = (left > 0 && full > 0) ? Math.min(100, Math.max(0, (100 * left) / full)).toFixed(1) + '%' : '0%';
        if (cdU && cdU.style.height !== pct) cdU.style.height = pct;
        const tStr = left > 0 ? (left >= 1 ? String(Math.ceil(left)) : left.toFixed(1)) : '';
        if (cdtS && cdtS.textContent !== tStr) cdtS.textContent = tStr;
        const lvT = Sk.boss ? 'BOSS' : ('Lv' + lv);
        const lbl = `${Sk.name} · 2·${k.toUpperCase()} · ${lvT} · SP ${cost}`;
        if (b.title !== lbl) {
          b.title = lbl;
          b.setAttribute('aria-label', lbl);
        }
      }
    }

    for (let i = 0; i < 2; i++) {
      const artBtn = bc.querySelector(`[data-a="art${i}"]`);
      if (artBtn) {
        const wantTop = page2On ? '-145px' : '-100px';
        if (artBtn.style.top !== wantTop) artBtn.style.top = wantTop;
      }
    }

    if (window.__upgradeBotAiEnabled) {
      document.querySelectorAll('#sq .win[data-sq="auto"] .note, #sq .win[data-sq="autosup"] .note').forEach(n => {
        if (n.textContent && n.textContent.includes('สกิลในแถบหน้า 2')) {
          n.style.display = 'none';
        }
      });
    }
  }

  function installDualHotbarAndSkillDragHooks() {
    const NC = window.NC;
    if (!NC) return;
    ensureUpgradeBotAiStyles();

    // 1. Keep Row 1 (`แถบ 1` at `top: -62px` / `#hs-q..#hs-6`) ALWAYS displaying Page 1 (`q..6`),
    //    while pressing TAB (`1/2` -> `2/2`) stacks Row 2 (`แถบ 2` at `top: -107px`) directly ABOVE Row 1!
    if (NC.Bar && typeof NC.Bar.slot === 'function' && !NC.Bar.__pmheeDualSlotHooked) {
      NC.Bar.__pmheeDualSlotHooked = true;
      const origBarSlot = NC.Bar.slot.bind(NC.Bar);
      NC.Bar.slot = function wrappedBarSlot(k, page) {
        if (window.__inHudHotbarPage1 && page === undefined) {
          return k;
        }
        return origBarSlot(k, page);
      };
      if (typeof NC.Bar.onFlip === 'function') {
        NC.Bar.onFlip(() => {
          try {
            const g = NC.game;
            const p = g?.player;
            if (p && NC.HUD?.updateHotbar) NC.HUD.updateHotbar(p);
            updateDualHotbarHud(g, p);
          } catch (_) {}
        });
      }
    }

    if (NC.hudHotbar && typeof NC.hudHotbar.around === 'function' && !NC.hudHotbar.__pmheeKeepPage1Hooked) {
      NC.hudHotbar.__pmheeKeepPage1Hooked = true;
      NC.hudHotbar.around('pmhee_keep_page1', function (next, p) {
        window.__inHudHotbarPage1 = true;
        try {
          return next(p);
        } finally {
          window.__inHudHotbarPage1 = false;
          try { updateDualHotbarHud(NC.game, p); } catch (_) {}
        }
      });
      if (NC.game?.player && NC.HUD?.updateHotbar) {
        try { NC.HUD.updateHotbar(NC.game.player); } catch (_) {}
      }
    }

    if (NC.hudUpdate && typeof NC.hudUpdate.around === 'function' && !NC.hudUpdate.__pmheeDualBarHudHooked) {
      NC.hudUpdate.__pmheeDualBarHudHooked = true;
      NC.hudUpdate.around('pmhee_dual_bar_hud', function (next, game) {
        const r = next(game);
        try {
          if (game && game.player) updateDualHotbarHud(game, game.player);
        } catch (_) {}
        return r;
      });
    }

    // 2. Global Pointer/Mouse Drag-and-Drop & Click/Right-Click Handler for Skill Icons & Hotbar Slots (Row 1 + Row 2 + In-Window Bar)
    if (!window.__pmheeSkillDragInstalled) {
      window.__pmheeSkillDragInstalled = true;

      let dragState = null;
      let suppressClickUntil = 0;

      const getSkillIconSrc = (skillId) => {
        const S = window.NC?.SKILLS?.[skillId];
        if (!S) return '';
        return window.NC?.ASSET_MANIFEST?.[S.icon]?.src || window.NC?.SPR?.[S.icon]?.src || '';
      };

      const findDropSlotAtPoint = (x, y) => {
        const ghost = document.getElementById('pmhee-skill-drag-ghost');
        if (ghost) ghost.style.display = 'none';
        const el = document.elementFromPoint(x, y);
        if (ghost) ghost.style.display = 'flex';
        if (!el || !el.closest) return null;

        // A. In-Window Skill Bar (`#sq .win[data-sq="skill"] .slot[data-key]`)
        const sqSlot = el.closest('#sq .win[data-sq="skill"] .slot[data-key]');
        if (sqSlot && sqSlot.dataset.key) {
          return { el: sqSlot, slotKey: sqSlot.dataset.key };
        }
        // B. Bottom HUD Row 2 (`แถบ 2`: `#sq .hud [data-p="bc"] [data-a="slot2"][data-k]`)
        const hudSlot2 = el.closest('#sq .hud [data-a="slot2"][data-k]');
        if (hudSlot2 && hudSlot2.dataset.k) {
          return { el: hudSlot2, slotKey: hudSlot2.dataset.k };
        }
        // C. Bottom HUD Row 1 (`แถบ 1`: `#sq .hud [data-p="bc"] [data-a="slot"][data-k]`)
        const hudSlot1 = el.closest('#sq .hud [data-a="slot"][data-k]');
        if (hudSlot1 && hudSlot1.dataset.k) {
          return { el: hudSlot1, slotKey: hudSlot1.dataset.k };
        }
        // D. Legacy `#skillwin .skw-slot[data-key]`
        const legSlot = el.closest('#skillwin .skw-slot[data-key]');
        if (legSlot && legSlot.dataset.key) {
          return { el: legSlot, slotKey: legSlot.dataset.key };
        }
        return null;
      };

      const clearDragUi = () => {
        const ghost = document.getElementById('pmhee-skill-drag-ghost');
        if (ghost) ghost.remove();
        document.querySelectorAll('.pmhee-drop-hover, .pmhee-drop-ready').forEach(n => {
          n.classList.remove('pmhee-drop-hover', 'pmhee-drop-ready');
        });
      };

      const applySlotAssignment = (targetSlotKey, skillId, fromSlotKey) => {
        const NC = window.NC;
        const g = NC?.game;
        const p = g?.player;
        if (!NC || !g || !p || typeof NC.assignSlot !== 'function') return false;
        const hb = typeof NC.hotbarOf === 'function' ? NC.hotbarOf(p) : (p.hotbar || (p.hotbar = {}));

        if (fromSlotKey) {
          if (targetSlotKey && fromSlotKey !== targetSlotKey) {
            const a = hb[fromSlotKey] || null;
            const b = hb[targetSlotKey] || null;
            NC.assignSlot(p, targetSlotKey, a);
            NC.assignSlot(p, fromSlotKey, b);
          } else if (!targetSlotKey) {
            NC.assignSlot(p, fromSlotKey, null);
          }
        } else if (targetSlotKey && skillId) {
          NC.assignSlot(p, targetSlotKey, skillId);
        } else {
          return false;
        }

        try {
          NC.applyGear?.(g);
          NC.saveGame?.(g);
          NC.HUD?.updateHotbar?.(p);
          NC.SQ?.refresh?.('skill');
          NC.SQ?.refresh?.('auto');
          NC.SQ?.refresh?.('autosup');
          NC.P3AF?.render?.();
          updateDualHotbarHud(g, p);
        } catch (_) {}
        return true;
      };

      window.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        const NC = window.NC;
        const g = NC?.game;
        const p = g?.player;
        if (!NC || !g || !p || !e.target?.closest) return;

        let skillId = '';
        let fromSlotKey = '';
        let iconSrc = '';

        // 1. Skill row icon `.sk .ic` inside `#sq .win[data-sq="skill"]`
        const skIc = e.target.closest('#sq .win[data-sq="skill"] .sk[data-id] .ic');
        const skRow = skIc ? skIc.closest('.sk[data-id]') : null;
        if (skRow && skRow.dataset.id) {
          skillId = skRow.dataset.id;
          iconSrc = skIc.querySelector('img')?.getAttribute('src') || getSkillIconSrc(skillId);
        }

        // 2. Right-side skill detail card 48x48 icon `#sq .win[data-sq="skill"] [data-f="card"] img`
        if (!skillId) {
          const cardImg = e.target.closest('#sq .win[data-sq="skill"] [data-f="card"] img');
          const cardBox = cardImg ? cardImg.closest('[data-f="card"]') : null;
          const cid = cardImg?.dataset?.drag || cardBox?.dataset?.id || '';
          if (cid && NC.SKILLS?.[cid]) {
            skillId = cid;
            iconSrc = cardImg.getAttribute('src') || getSkillIconSrc(skillId);
          }
        }

        // 3. In-window bottom skill bar `.slot[data-key]`
        if (!skillId) {
          const barSlot = e.target.closest('#sq .win[data-sq="skill"] .slot[data-key]');
          if (barSlot && barSlot.dataset.key) {
            const k = barSlot.dataset.key;
            const id = NC.skillForKey ? NC.skillForKey(p, k) : p.hotbar?.[k];
            if (id && NC.SKILLS?.[id]) {
              fromSlotKey = k;
              skillId = id;
              iconSrc = barSlot.querySelector('img')?.getAttribute('src') || getSkillIconSrc(skillId);
            }
          }
        }

        // 4. Bottom HUD hotbar slots (`[data-a="slot"]` or `[data-a="slot2"]`) when Skill window is open
        if (!skillId && NC.SQ?.isOpen?.('skill')) {
          const hudBtn = e.target.closest('#sq .hud [data-a="slot"][data-k], #sq .hud [data-a="slot2"][data-k]');
          if (hudBtn && hudBtn.dataset.k) {
            const k = hudBtn.dataset.k;
            const id = NC.skillForKey ? NC.skillForKey(p, k) : p.hotbar?.[k];
            if (id && NC.SKILLS?.[id]) {
              fromSlotKey = k;
              skillId = id;
              iconSrc = hudBtn.querySelector('[data-f="ic"]')?.getAttribute('src') || getSkillIconSrc(skillId);
            }
          }
        }

        if (!skillId) return;
        // Prevent broken HTML5 dragstart on `<span class="ic">` so our smooth ghost drag runs reliably
        e.preventDefault();

        dragState = {
          skillId,
          fromSlotKey,
          iconSrc: iconSrc || getSkillIconSrc(skillId),
          startX: e.clientX,
          startY: e.clientY,
          active: false,
          warned: false
        };
      }, true);

      window.addEventListener('mousemove', (e) => {
        if (!dragState) return;
        const NC = window.NC;
        const g = NC?.game;
        const p = g?.player;
        if (!NC || !g || !p) {
          clearDragUi();
          dragState = null;
          return;
        }

        const dist = Math.hypot(e.clientX - dragState.startX, e.clientY - dragState.startY);
        if (!dragState.active && dist < 5) return;

        const S = NC.SKILLS?.[dragState.skillId];
        const learnedLv = Number((NC.skillRaw || NC.skillLv)?.(p, dragState.skillId) || p.skills?.[dragState.skillId] || (S?.boss ? 1 : 0));
        const isSlottable = Boolean(S && (typeof NC.skillSlottable === 'function' ? NC.skillSlottable(S) : (S.active && NC.kindOf?.(S) !== 'passive')));

        if (!isSlottable) {
          if (!dragState.warned) {
            dragState.warned = true;
            try { g.toast?.(`"${S?.name || dragState.skillId}" เป็นสกิลพาสซีฟ (ทำงานติดตัวอัตโนมัติ ไม่ต้องใส่ช่องสกิล)`); } catch (_) {}
          }
          clearDragUi();
          dragState = null;
          return;
        }
        if (learnedLv <= 0 && !dragState.fromSlotKey) {
          if (!dragState.warned) {
            dragState.warned = true;
            try { g.toast?.(`ต้องเรียนสกิล "${S?.name || dragState.skillId}" (กด +1) ก่อนถึงจะลากใส่ช่องคีย์ลัดได้`); } catch (_) {}
          }
          clearDragUi();
          dragState = null;
          return;
        }

        if (!dragState.active) {
          dragState.active = true;
          document.querySelectorAll('#sq .win[data-sq="skill"] .slot[data-key], #sq .hud [data-a="slot"][data-k], #sq .hud [data-a="slot2"][data-k]').forEach(n => {
            n.classList.add('pmhee-drop-ready');
          });
        }

        let ghost = document.getElementById('pmhee-skill-drag-ghost');
        if (!ghost) {
          ghost = document.createElement('div');
          ghost.id = 'pmhee-skill-drag-ghost';
          ghost.style.cssText = 'position:fixed;left:0;top:0;width:42px;height:42px;z-index:2147483646;pointer-events:none;display:flex;align-items:center;justify-content:center;background:#1d2b55;border:2px solid #ffc93c;box-shadow:0 6px 16px rgba(0,0,0,0.65);transform:translate(-50%,-50%);';
          ghost.innerHTML = `<img src="${dragState.iconSrc}" alt="" style="width:36px;height:36px;object-fit:contain">`;
          document.body.appendChild(ghost);
        }
        ghost.style.left = e.clientX + 'px';
        ghost.style.top = e.clientY + 'px';

        document.querySelectorAll('.pmhee-drop-hover').forEach(n => n.classList.remove('pmhee-drop-hover'));
        const hit = findDropSlotAtPoint(e.clientX, e.clientY);
        if (hit && hit.el) {
          hit.el.classList.add('pmhee-drop-hover');
        }
      }, true);

      window.addEventListener('mouseup', (e) => {
        if (!dragState) return;
        const st = dragState;
        dragState = null;
        if (!st.active) {
          clearDragUi();
          return;
        }
        suppressClickUntil = Date.now() + 320;
        const hit = findDropSlotAtPoint(e.clientX, e.clientY);
        clearDragUi();
        if (hit && hit.slotKey) {
          applySlotAssignment(hit.slotKey, st.skillId, st.fromSlotKey);
        } else if (st.fromSlotKey) {
          applySlotAssignment(null, st.skillId, st.fromSlotKey);
        }
      }, true);

      // Also support native HTML5 drop onto `#sq .hud [data-a="slot"], [data-a="slot2"]` & `#sq .win[data-sq="skill"] .slot[data-key]`
      window.addEventListener('dragover', (e) => {
        if (!e.target?.closest) return;
        const slotEl = e.target.closest('#sq .hud [data-a="slot"][data-k], #sq .hud [data-a="slot2"][data-k], #sq .win[data-sq="skill"] .slot[data-key]');
        if (slotEl) {
          e.preventDefault();
        }
      }, true);

      window.addEventListener('drop', (e) => {
        if (!e.target?.closest) return;
        const hudBtn = e.target.closest('#sq .hud [data-a="slot"][data-k], #sq .hud [data-a="slot2"][data-k]');
        if (!hudBtn || !hudBtn.dataset.k) return;
        const d = e.dataTransfer?.getData('text/plain') || '';
        if (!d) return;
        e.preventDefault();
        e.stopPropagation();
        if (d.startsWith('slot:')) {
          applySlotAssignment(hudBtn.dataset.k, null, d.slice(5));
        } else if (d.startsWith('skill:')) {
          applySlotAssignment(hudBtn.dataset.k, d.slice(6), null);
        }
      }, true);

      // Click & Right-Click handler on bottom HUD Row 1 (`[data-a="slot"]`) and Row 2 (`[data-a="slot2"]`)
      window.addEventListener('click', (e) => {
        if (Date.now() < suppressClickUntil) {
          e.stopPropagation();
          e.preventDefault();
          return;
        }
        if (!e.target?.closest) return;
        const NC = window.NC;
        const g = NC?.game;
        const p = g?.player;
        if (!NC || !g || !p) return;

        const btn2 = e.target.closest('#sq .hud [data-a="slot2"][data-k]');
        if (btn2 && btn2.dataset.k) {
          e.stopPropagation();
          e.preventDefault();
          const slotKey = btn2.dataset.k;
          const id = NC.skillForKey ? NC.skillForKey(p, slotKey) : p.hotbar?.[slotKey];
          if (id && NC.SKILLS?.[id]) {
            if (NC.Auto?.pressSlot && g.input) NC.Auto.pressSlot(g.input, slotKey);
            else NC.castSkill?.(g, p, slotKey);
          } else {
            try {
              NC.Bar?.set?.(1);
              NC.HUD?.panel?.('skills', true);
              NC.SQ?.refresh?.('skill');
            } catch (_) {}
          }
          return;
        }

        const btn1 = e.target.closest('#sq .hud [data-a="slot"][data-k]');
        if (btn1 && btn1.dataset.k) {
          const slotKey = btn1.dataset.k;
          const s = document.getElementById('hs-' + slotKey);
          if (s && s.querySelector('.qu-sp')) return; // let skill point quick-up click pass through
          const id = NC.skillForKey ? NC.skillForKey(p, slotKey) : p.hotbar?.[slotKey];
          if (id && NC.SKILLS?.[id]) {
            e.stopPropagation();
            e.preventDefault();
            if (NC.Auto?.pressSlot && g.input) NC.Auto.pressSlot(g.input, slotKey);
            else NC.castSkill?.(g, p, slotKey);
          }
        }
      }, true);

      window.addEventListener('contextmenu', (e) => {
        if (!e.target?.closest) return;
        const hudBtn = e.target.closest('#sq .hud [data-a="slot"][data-k], #sq .hud [data-a="slot2"][data-k]');
        if (!hudBtn || !hudBtn.dataset.k) return;
        const NC = window.NC;
        const p = NC?.game?.player;
        if (!NC || !p) return;
        const slotKey = hudBtn.dataset.k;
        const id = NC.skillForKey ? NC.skillForKey(p, slotKey) : p.hotbar?.[slotKey];
        if (id) {
          e.preventDefault();
          e.stopPropagation();
          applySlotAssignment(null, id, slotKey);
        }
      }, true);
    }

    try {
      if (NC.game?.player) updateDualHotbarHud(NC.game, NC.game.player);
    } catch (_) {}
  }

  function installUpgradeBotAiHooks() {
    const NC = window.NC;
    if (!NC || !NC.Auto || !NC.AutoSupport) return;

    ensureUpgradeBotAiStyles();
    installDualHotbarAndSkillDragHooks();

    // 1. Force fast loot mode when Upgrade BOT AI is enabled so lootfeel.js never mutates l.x/l.y away from server coords
    if (window.__upgradeBotAiEnabled && NC.LootFeel) {
      try { NC.LootFeel.mode = 'fast'; } catch (_) {}
    }

    // 1B. Unlock Hotbar Page 1 + Page 2 (`แถบ 1 + แถบ 2`, all 16 slots) in Auto-Farm (`ออโต้ฟาร์ม [Z]`) when `🧠 Upgrade BOT AI` is enabled!
    if (NC.AutoPremium && typeof NC.AutoPremium.barKeys === 'function' && !NC.AutoPremium.__pmheeBarKeysHooked) {
      NC.AutoPremium.__pmheeBarKeysHooked = true;
      const origApBarKeys = NC.AutoPremium.barKeys.bind(NC.AutoPremium);
      NC.AutoPremium.barKeys = function wrappedApBarKeys(p) {
        if (window.__upgradeBotAiEnabled) {
          return NC.BARKEYS || ['q', 'e', 'r', 'f', '3', '4', '5', '6', '2:q', '2:e', '2:r', '2:f', '2:3', '2:4', '2:5', '2:6'];
        }
        return origApBarKeys(p);
      };
    }
    if (NC.Auto && typeof NC.Auto.barKeys === 'function' && !NC.Auto.__pmheeBarKeysHooked) {
      NC.Auto.__pmheeBarKeysHooked = true;
      const origAutoBarKeys = NC.Auto.barKeys.bind(NC.Auto);
      NC.Auto.barKeys = function wrappedAutoBarKeys(p) {
        if (window.__upgradeBotAiEnabled) {
          return NC.BARKEYS || ['q', 'e', 'r', 'f', '3', '4', '5', '6', '2:q', '2:e', '2:r', '2:f', '2:3', '2:4', '2:5', '2:6'];
        }
        return origAutoBarKeys(p);
      };
      try {
        NC.SQ?.refresh?.('auto');
        NC.SQ?.refresh?.('autosup');
        NC.P3AF?.render?.();
      } catch (_) {}
    }

    // 1C. Priest / Bishop Offensive `แสงเยียวยา` (`pr_heal` / `bi_heal`) Auto-Cast on Dark/Undead (`ธาตุมืด / อมตะ / ซอมบี้`) Monsters Around Character
    //     Hooks `NC.updateSkills` (called inside `entities.js` `heroFrame` right after `autofarm.js` sets `game.input` and right before `NC.castSkill` runs!)
    if (typeof NC.updateSkills === 'function' && !NC.updateSkills.__pmheeOffensiveHealHooked) {
      const origUpdateSkills = NC.updateSkills;
      const wrappedUpdateSkills = function (game, dt) {
        const res = origUpdateSkills.apply(this, arguments);
        try {
          if (!window.__upgradeBotAiEnabled || !game || !NC.Auto?.on || NC.Auto?.set?.skills === false) {
            return res;
          }
          const p = game.player;
          const I = game.input;
          if (!p || !I || p.dead > 0 || p.skillLock > 0 || p.casting || p.channel || p.dash) {
            return res;
          }

          // Do not override if autofarm is about to cast Resurrection (`pr_resurrect`) on a fallen party member
          const hotkeys = NC.HOTKEYS || ['q', 'e', 'r', 'f', '3', '4', '5', '6'];
          for (const hk of hotkeys) {
            if (I[hk]) {
              const pressedSlot = (I.slot && I.slot[hk]) || hk;
              const pressedId = NC.skillForKey ? NC.skillForKey(p, pressedSlot) : p.hotbar?.[pressedSlot];
              if (pressedId === 'pr_resurrect') return res;
            }
          }

          const allSlots = (typeof NC.Auto.barKeys === 'function')
            ? NC.Auto.barKeys(p)
            : (NC.BARKEYS || hotkeys);
          const supActive = Boolean(NC.AutoSupport?.active?.(game));
          const supOff = Array.isArray(NC.Auto.set?.supOff) ? NC.Auto.set.supOff : [];

          let healSlotKey = null;
          let healSkillId = null;
          for (const candidateId of ['pr_heal', 'bi_heal']) {
            const slot = allSlots.find(k => {
              const sid = NC.skillForKey ? NC.skillForKey(p, k) : p.hotbar?.[k];
              if (sid !== candidateId) return false;
              if (NC.Auto.set?.slots && NC.Auto.set.slots[k] === false) return false;
              if (supActive && supOff.includes(candidateId)) return false;
              return true;
            });
            if (!slot) continue;
            const lv = Number(NC.skillLv ? NC.skillLv(p, candidateId) : (p.skills?.[candidateId] || 0));
            if (lv <= 0) continue;
            if ((NC.skillCd ? NC.skillCd(p, candidateId) : 0) > 0) continue;
            const spCost = NC.skillCost ? (NC.skillCost(p, candidateId, lv) || 0) : (12 + lv * 2);
            if ((p.sp || 0) < spCost) continue;
            if (NC.skillLocked && NC.skillLocked(p, candidateId)) continue;
            if (NC.weaponOk && !NC.weaponOk(p, candidateId)) continue;
            healSlotKey = slot;
            healSkillId = candidateId;
            break;
          }

          if (!healSlotKey || !healSkillId) return res;

          const scale = (typeof NC.skillScale === 'function' ? NC.skillScale(p, healSkillId) : 1) || 1;
          const baseRadius = healSkillId === 'pr_heal' ? 248 : 235;
          const enemies = game.enemies || [];

          const hasDarkUndeadInAoE = enemies.some(e => {
            if (!isDarkOrUndeadEnemy(e)) return false;
            const r = baseRadius * scale + (e.r || 24);
            const elDist = Math.hypot(e.x - p.x, (e.y - p.y) / 0.62);
            return elDist <= r;
          });

          if (hasDarkUndeadInAoE) {
            for (const hk of hotkeys) I[hk] = false;
            if (I.slot) I.slot = {};
            I.attack = false;
            if (typeof NC.Auto.pressSlot === 'function') {
              NC.Auto.pressSlot(I, healSlotKey);
            } else {
              const B = NC.Bar;
              const hk = B ? B.keyOf(healSlotKey) : healSlotKey;
              I[hk] = true;
              if (B) (I.slot || (I.slot = {}))[hk] = healSlotKey;
            }
            if (NC.Auto.pressAt && typeof NC.Auto.pressAt.set === 'function') {
              NC.Auto.pressAt.set(healSkillId, game.time);
            }
            return res;
          }

          // If the Priest is targeting a Dark/Undead monster that is outside the 248px AoE ring (e.g. ranged skeleton archer or before melee zombie arrives)
          // and no other skill key was pressed on this frame, walk into AoE reach so `แสงเยียวยา` (`pr_heal`) can nuke it!
          const curTarget = NC.Auto.target;
          const anySkillPressed = hotkeys.some(hk => Boolean(I[hk]));
          if (!anySkillPressed && curTarget && isDarkOrUndeadEnemy(curTarget)) {
            const r = (baseRadius - 20) * scale + (curTarget.r || 24);
            const elDist = Math.hypot(curTarget.x - p.x, (curTarget.y - p.y) / 0.62);
            if (elDist > r && elDist <= 560 && NC.Auto.kit?.steer) {
              const v = NC.Auto.kit.steer(game, curTarget.x, curTarget.y, dt);
              if (v) {
                const l = Math.hypot(v[0], v[1]);
                if (l > 1) {
                  I.mx = v[0] / l;
                  I.my = v[1] / l;
                  I.attack = false;
                }
              }
            }
          }
        } catch (_) {}
        return res;
      };
      wrappedUpdateSkills.__pmheeOffensiveHealHooked = true;
      NC.updateSkills = wrappedUpdateSkills;
    }

    if (NC.AutoSupport.__pmheeUpgradeHooked === NIGHTCAMP_BOT_VERSION) return;
    NC.AutoSupport.__pmheeUpgradeHooked = NIGHTCAMP_BOT_VERSION;

    const origActive = (game) => {
      const p = game && game.player;
      return Boolean(p && NC.Auto?.set?.mode === 'support' && NC.AutoSupport?.supportJob?.(p.job) && !(NC.QuestAuto && NC.QuestAuto.on));
    };
    if (!NC.AutoSupport.__pmheeOrigDrive && typeof NC.AutoSupport.drive === 'function' && NC.AutoSupport.drive.name !== 'wrappedAutoSupportDrive') {
      NC.AutoSupport.__pmheeOrigDrive = NC.AutoSupport.drive.bind(NC.AutoSupport);
    }
    const origDrive = NC.AutoSupport.__pmheeOrigDrive || NC.AutoSupport.drive.bind(NC.AutoSupport);

    function computeUpgradeOverride(game) {
      if (!window.__isBotRunning || !window.__upgradeBotAiEnabled || inAiPickCall) return null;
      const p = game?.player;
      if (!p || p.dead > 0 || !NC.Auto?.on) return null;
      // Never intercept if quest is 100% ready for turn-in (so questauto's heldBy sees active() === false)
      try {
        const q = NC.Quests?.cur?.();
        if (q && NC.Quests?.state?.on && NC.Quests?.ready?.(q, p)) return null;
      } catch (_) {}

      const nowT = game.time || 0;
      const snapSelf = NC.Online?.snap?.self || NC.OnlineWorld?.snap?.self;
      const srvPx = (snapSelf && Number.isFinite(snapSelf.x)) ? snapSelf.x : p.x;
      const srvPy = (snapSelf && Number.isFinite(snapSelf.y)) ? snapSelf.y : p.y;

      // Stamp true server coordinates on every loot drop & trigger fast server pickup when in reach (unless No-Loot mode "กากบาทที่มือ" is ON!)
      const validDrops = [];
      let oldestAge = 0;
      let hasRareOrGear = false;

      const trainerPullItemNow = Boolean(
        window.__trainerAccessUnlocked &&
        (window.__trainerConfig?.pullItemEnabled || (window.__trainerPullItemBurstUntil || 0) > Date.now())
      );

      if (!window.__noLootMode) {
        for (const l of (game.loot || [])) {
          if (!l || l.kind !== 'loot') continue;
          if (l._srvX === undefined) {
            l._srvX = l.fx0 !== undefined ? l.fx0 : l.x;
            l._srvY = l.fy0 !== undefined ? l.fy0 : l.y;
            l._bornAt = nowT;
          }
          // Prevent client visual drift from moving drop away from server pickup spot (unless Trainer Pull Item is pulling drops to player)
          if (!trainerPullItemNow && (l.fx0 === undefined || l.flown)) {
            l.x = l._srvX;
            l.y = l._srvY;
          }
          if (!isValidUpgradeLootDrop(game, p, l)) continue;

          const dClient = Math.hypot(l._srvX - p.x, l._srvY - p.y);
          const dServer = Math.hypot(l._srvX - srvPx, l._srvY - srvPy);
          const age = Math.max(0, nowT - (l._bornAt || nowT));

          // Direct server pickup & anti-5s-lockout fix when standing on/near the drop
          if ((trainerPullItemNow || dClient <= 44 || dServer <= 44) && (l.t || 0) > 0.35 && l.sid && NC.Online?.pickup) {
            if (dClient <= 26 && dServer <= 36) {
              l._aiStandStart = l._aiStandStart || nowT;
              if (nowT - l._aiStandStart >= 1.85) {
                // Drop refused / desynced after standing directly on server coords for 1.85s -> skip immediately (no circling!)
                l._aiSkipUntil = nowT + 25;
                if (nowT - l._aiStandStart >= 3.2) l.done = true;
                continue;
              }
            } else {
              l._aiStandStart = 0;
            }
            const nowMs = Date.now();
            if (nowMs - lastDirectLootPickupAt >= 200 && nowMs - (l._aiLastAskMs || 0) >= 220) {
              lastDirectLootPickupAt = nowMs;
              l._aiLastAskMs = nowMs;
              l.asked = false;
              try {
                NC.OnlineWorld?.pickup?.(l.sid, 'claim');
                NC.Online.pickup(l.sid);
              } catch (_) {}
            }
          } else {
            l._aiStandStart = 0;
          }

          const maxLootRadius = (trainerPullItemNow && window.__trainerConfig?.pullItemRush !== false) ? 2400 : 580;
          if (dClient <= maxLootRadius && (game.world?.fits ? game.world.fits(l._srvX, l._srvY, 16) : true)) {
            validDrops.push({ l, d: dClient, age });
            if (age > oldestAge) oldestAge = age;
            if (!l.mat || (NC.MATERIALS?.[l.mat]?.rare)) hasRareOrGear = true;
          }
        }
      }

      validDrops.sort((a, b) => a.d - b.d);

      // Check current combat state: if we already damaged a target monster, finish it off unless loot is at our feet or expiring!
      const curTgt = NC.Auto?.target;
      const isMidKill = Boolean(
        curTgt && !curTgt.dead && curTgt.hp > 0 &&
        curTgt.hp < (curTgt.maxHp || curTgt.hp) * 0.90 &&
        Math.hypot(curTgt.x - p.x, curTgt.y - p.y) < 360
      );
      const hpRatio = (p.hp || 1) / Math.max(1, p.maxHp || 1);

      if (validDrops.length > 0 && hpRatio >= 0.32) {
        const best = validDrops[0];
        const shouldGrabLootNow =
          (trainerPullItemNow && window.__trainerConfig?.pullItemRush !== false) ||
          best.d <= 155 ||
          hasRareOrGear ||
          oldestAge >= 20 ||
          validDrops.length >= 5 ||
          (!isMidKill && (best.d <= 400 || validDrops.length >= 2 || oldestAge >= 7));

        if (shouldGrabLootNow) {
          return {
            kind: 'loot',
            drop: best.l,
            tx: best.l._srvX,
            ty: best.l._srvY,
            d: best.d,
            count: validDrops.length
          };
        }
      }

      // Check if NC.Auto is stuck on "Find Target · Selected Types Only" (no target or 0 wanted monsters in sight)
      const offArr = NC.Auto?.set?.off || [];
      if (offArr.length > 0) {
        const offSet = new Set(offArr);
        const aliveWanted = (game.enemies || []).filter(e => e && !e.dead && e.hp > 0 && !e.dummy && !e.npc && e.state !== 'return' && !offSet.has(e.type));
        const freeWanted = aliveWanted.filter(e => !e.tgt || (NC.Auto?.afterMe && NC.Auto.afterMe(game, e)));
        const isSearching = !NC.Auto?.target || NC.Auto?.state === 'หาเป้าหมาย';

        if (freeWanted.length === 0 || isSearching) {
          if (!noWantedMonSince) noWantedMonSince = nowT;
          const { zones, coSpawners } = findWantedZoneAndCoSpawners(game, offSet);

          // A. If 0 free wanted monsters here and wanted species lives in a specific sub-zone (e.g. ไร่ข้าวโพด on farm) and player is outside that zone, steer there!
          if (freeWanted.length === 0 && zones.length > 0) {
            const inAnyWantedZone = zones.some(z => {
              const [x1, y1, x2, y2] = z.rect;
              return p.x >= x1 + 80 && p.x <= x2 - 80 && p.y >= y1 + 80 && p.y <= y2 - 80;
            });
            if (!inAnyWantedZone) {
              let bestZone = zones[0];
              let bestDist = Infinity;
              for (const z of zones) {
                const [x1, y1, x2, y2] = z.rect;
                const d = Math.hypot((x1 + x2) / 2 - p.x, (y1 + y2) / 2 - p.y);
                if (d < bestDist) { bestDist = d; bestZone = z; }
              }
              const [zx, zy] = findWalkablePointInRect(game, bestZone.rect);
              return {
                kind: 'seek_zone',
                zoneName: bestZone.name,
                tx: zx,
                ty: zy
              };
            }
          }

          // B. If NC.Auto is searching with no target for >= 0.7s:
          //    1) If a freeWanted monster exists (was falsely blacklisted by NC.Auto), call NC.Auto.pick() to un-blacklist and attack it!
          //    2) Else pick the nearest co-spawning monster occupying the shared spawn pool so killing it spawns the wanted monster!
          if (isSearching && nowT - noWantedMonSince >= 0.7 && Date.now() - lastCoSpawnPickAt >= 1100) {
            const pickedNow = NC.Auto?.picked?.();
            if (!pickedNow || pickedNow.dead || !(pickedNow.hp > 0)) {
              const targetPool = freeWanted.length > 0
                ? freeWanted
                : (game.enemies || []).filter(e =>
                    e && !e.dead && e.hp > 0 && !e.dummy && !e.npc && e.state !== 'return' &&
                    (!e.tgt || (NC.Auto?.afterMe && NC.Auto.afterMe(game, e))) &&
                    (coSpawners.size === 0 || coSpawners.has(e.type))
                  );
              if (targetPool.length > 0) {
                targetPool.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
                const pickMon = targetPool[0];
                if (Math.hypot(pickMon.x - p.x, pickMon.y - p.y) < 1250) {
                  lastCoSpawnPickAt = Date.now();
                  inAiPickCall = true;
                  try { NC.Auto.pick?.(game, pickMon); } catch (_) {}
                  inAiPickCall = false;
                }
              }
            }
          }
        } else {
          noWantedMonSince = 0;
        }
      } else {
        noWantedMonSince = 0;
      }

      return null;
    }

    let pendingOverride = null;

    function isTownOrSafeSupportMap(mId) {
      if (!mId) return true;
      const s = String(mId).trim().toLowerCase();
      return Boolean(s === 'camp' || s === 'homefarm' || s === 'puppetroom' || NC.MAPS?.[s]?.camp);
    }

    // Prevent Priest/Support in-game AutoSupport from following the Party Leader back to 'camp' when the Leader goes to buy potions or sell items!
    function evaluatePartySupportTownGuard(game) {
      if (!game || !game.player || isTownOrSafeSupportMap(game.mapId)) return null;
      const PN = NC.PartyNet;
      const others = (PN && typeof PN.others === 'function') ? (PN.others() || []) : [];
      if (!others.length) return null;
      const R = (PN && typeof PN.roster === 'function') ? PN.roster() : null;
      const leadPeer = R ? R.lead : null;
      const supLock = NC.Auto?.set?.supLock || null;
      const p = game.player;

      const peerInfos = [];
      for (const peer of others) {
        const w = (PN && typeof PN.where === 'function') ? PN.where(peer) : null;
        const r = NC.Net?.remotes?.get?.(peer);
        const here = Boolean(r && r.map === game.mapId && !r.gwHide);
        const map = here ? game.mapId : ((w && w.map) || (r && r.map) || '');
        const x = here ? r.x : (w ? w.x : null);
        const y = here ? r.y : (w ? w.y : null);
        const d = (here && Number.isFinite(x) && Number.isFinite(y)) ? Math.hypot(x - p.x, y - p.y) : Infinity;
        peerInfos.push({
          peer,
          here,
          map,
          isTown: isTownOrSafeSupportMap(map),
          isLeader: peer === leadPeer,
          d
        });
      }

      // Determine who AutoSupport's lockOf() would pick by default
      let defaultLock = supLock ? peerInfos.find(x => x.peer === supLock) : null;
      if (!defaultLock) defaultLock = peerInfos.find(x => x.isLeader) || null;
      if (!defaultLock) {
        const hereSorted = peerInfos.filter(x => x.here).sort((a, b) => a.d - b.d);
        defaultLock = hereSorted[0] || peerInfos[0] || null;
      }

      if (!defaultLock || defaultLock.here || !defaultLock.isTown) {
        return null;
      }

      // The default lock (e.g., Party Leader) warped back to 'camp' / town!
      // 1. If any other party teammates are still on our current hunting map, temporarily support the nearest teammate here!
      const sameMapMates = peerInfos.filter(x => x.here).sort((a, b) => a.d - b.d);
      if (sameMapMates.length > 0) {
        return { action: 'redirect_peer', peer: sameMapMates[0].peer };
      }

      // 2. If another party teammate is on an outdoor hunting map (not town), allow supporting them
      const outdoorMates = peerInfos.filter(x => !x.isTown && x.map);
      if (outdoorMates.length > 0) {
        return { action: 'redirect_peer', peer: outdoorMates[0].peer };
      }

      // 3. All other party members (e.g. Leader in a 2-person party) are currently in 'camp'!
      //    Stay on the current hunting map and fight/defend in place instead of walking back to 'camp'!
      return { action: 'stay_on_hunting_map' };
    }

    NC.AutoSupport.active = function wrappedAutoSupportActive(game) {
      // Passively run server-coord loot sync, 44px direct pickup, and target un-blacklisting
      // WITHOUT returning true for non-support jobs!
      // CRITICAL FIX (v2.0.5): Returning true from `NC.AutoSupport.active(game)` on a non-support job (Knight, Puppeteer, etc.)
      // or when `mode === 'farm'` caused Nightcamp's `sq/auto.js` & `p3_autofarm.js` to switch the Auto window into
      // `ออโต้ซัพพอร์ต (ซัพอย่างเดียว)` (marking all attack skills `ไม่ใช้`) AND caused `autofarm.js` to abort at line 125
      // before targeting monsters or casting attack skills!
      try { computeUpgradeOverride(game); } catch (_) {}
      pendingOverride = null;
      if (origActive(game)) {
        const guard = evaluatePartySupportTownGuard(game);
        if (guard && guard.action === 'stay_on_hunting_map') {
          if (!autoSellTrip && NC.Travel?.on && isTownOrSafeSupportMap(NC.Travel?.target?.map)) {
            try { NC.Travel.stop?.(''); } catch (_) {}
          }
          return false;
        }
        return true;
      }
      return false;
    };

    NC.AutoSupport.drive = function wrappedAutoSupportDrive(game, dt, out, threat) {
      if (origActive(game)) {
        const guard = evaluatePartySupportTownGuard(game);
        if (!guard || guard.action !== 'stay_on_hunting_map') {
          const setObj = NC.Auto?.set;
          const prevSupLock = setObj ? setObj.supLock : undefined;
          const prevSupWarp = setObj ? setObj.supWarp : undefined;
          const prevLoot = setObj ? setObj.loot : undefined;
          const origTravelGo = NC.Travel?.go;
          try {
            if (setObj) {
              if (guard && guard.action === 'redirect_peer' && guard.peer) {
                setObj.supLock = guard.peer;
              }
              if (window.__noLootMode) {
                setObj.loot = false;
              }
            }
            if (NC.Travel && typeof origTravelGo === 'function' && !autoSellTrip && !isTownOrSafeSupportMap(game?.mapId)) {
              NC.Travel.go = function safeSupportTravelGo(g, dest) {
                if (dest && isTownOrSafeSupportMap(dest.map)) {
                  return false;
                }
                return origTravelGo.apply(this, arguments);
              };
            }
            return origDrive(game, dt, out, threat);
          } finally {
            if (NC.Travel && origTravelGo) {
              NC.Travel.go = origTravelGo;
            }
            if (setObj) {
              if (guard && guard.action === 'redirect_peer') {
                setObj.supLock = prevSupLock;
              }
              if (prevSupWarp !== undefined && setObj.supWarp !== prevSupWarp) {
                setObj.supWarp = prevSupWarp;
              }
              if (window.__noLootMode) {
                setObj.loot = false;
              } else if (prevLoot !== undefined) {
                setObj.loot = prevLoot;
              }
            }
          }
        }
      }
      const ov = pendingOverride || computeUpgradeOverride(game);
      pendingOverride = null;
      if (!ov) return out;

      const p = game.player;
      const K = NC.Auto?.kit;
      if (!p || !K) return out;

      if (ov.kind === 'loot') {
        const dx = ov.tx - p.x;
        const dy = ov.ty - p.y;
        const d = Math.hypot(dx, dy);
        // Walk directly through the exact server drop coordinate when close so avoid() never orbits!
        if (d <= 95 && (game.world?.fits ? game.world.fits(ov.tx, ov.ty, 16) : true)) {
          if (d > 6) {
            out.mx = dx;
            out.my = dy;
          }
        } else {
          const v = K.steer(game, ov.tx, ov.ty, dt);
          if (v) {
            out.mx = v[0];
            out.my = v[1];
            K.progress(game, dt, ov.drop, ov.tx, ov.ty, () => { ov.drop._aiSkipUntil = (game.time || 0) + 20; });
          } else {
            ov.drop._aiSkipUntil = (game.time || 0) + 20;
          }
        }
        // Keep swinging/shooting at any monster in weapon reach while stepping onto loot
        const nearFoe = (game.enemies || []).find(e => e && !e.dead && e.hp > 0 && !e.dummy && Math.hypot(e.x - p.x, e.y - p.y) <= 160);
        if (nearFoe && !(p.skillLock > 0) && !p.channel) {
          out.aim = [nearFoe.x, nearFoe.y - 50];
          out.attack = true;
        }
        K.say('🧠 AI เก็บของ', ov.count > 1 ? `อีก ${ov.count} ชิ้น` : '');
        return out;
      }

      if (ov.kind === 'seek_zone') {
        const v = K.steer(game, ov.tx, ov.ty, dt);
        if (v) {
          out.mx = v[0];
          out.my = v[1];
          K.progress(game, dt, ov.zoneName, ov.tx, ov.ty, () => {});
        }
        K.say('🧠 เดินหาโซนมอน', ov.zoneName);
        return out;
      }

      return out;
    };
  }

  function runUpgradeBotAiTick(game, p) {
    const NC = window.NC;
    if (!NC || !game || !p) return;
    installUpgradeBotAiHooks();
    if (!window.__upgradeBotAiEnabled) return;

    // Deduplicate hotbar slots across Page 1 & Page 2 so the same skill ID never sits in two slots simultaneously
    if (p.hotbar && typeof p.hotbar === 'object') {
      const allKeys = NC.BARKEYS || ['q', 'e', 'r', 'f', '3', '4', '5', '6', '2:q', '2:e', '2:r', '2:f', '2:3', '2:4', '2:5', '2:6'];
      const seenIds = new Set();
      let deduped = false;
      for (const k of allKeys) {
        const sid = p.hotbar[k];
        if (!sid) continue;
        if (seenIds.has(sid)) {
          p.hotbar[k] = null;
          deduped = true;
        } else {
          seenIds.add(sid);
        }
      }
      if (deduped) {
        try {
          NC.HUD?.updateHotbar?.(p);
          NC.SQ?.refresh?.('skill');
          NC.SQ?.refresh?.('auto');
          updateDualHotbarHud(game, p);
        } catch (_) {}
      }
    }

    // Ensure fast loot feel is active
    if (NC.LootFeel && NC.LootFeel.mode !== 'fast') {
      try { NC.LootFeel.mode = 'fast'; } catch (_) {}
    }

    // Sync Auto-Loot & Farm/Support Mode in NC.Auto.set:
    // - Non-support classes (Knight, Puppeteer, Rogue, Archer, Mage, etc.) or solo players MUST ALWAYS be in `mode = 'farm'`
    //   and NEVER stuck in `ออโต้ซัพพอร์ต (ซัพอย่างเดียว)`!
    // - Support classes (Priest, Bishop, Lightkeeper, Wisp) in a party default `supFight = true` (`ซัพ + ช่วยตี`) so they never stand idle on `ซัพอย่างเดียว`!
    if (NC.Auto?.set) {
      const wantLoot = !window.__noLootMode;
      if (NC.Auto.set.loot !== wantLoot) {
        NC.Auto.set.loot = wantLoot;
      }
      const isSupJob = Boolean(NC.isSupportJob && NC.isSupportJob(p.job));
      const partyPeers = NC.PartyNet?.others?.() || [];
      let modeFixed = false;
      if (!isSupJob || partyPeers.length === 0) {
        if (NC.Auto.set.mode === 'support') {
          NC.Auto.set.mode = 'farm';
          modeFixed = true;
        }
      }
      const planSupFight = window.__currentScriptPlan?.partyConfig?.supFight;
      if (planSupFight !== false && NC.Auto.set.supFight === false) {
        NC.Auto.set.supFight = true;
        modeFixed = true;
      }
      if (modeFixed) {
        try { NC.Auto.saveSet?.(); } catch (_) {}
      }
      // If `ออโต้ซัพพอร์ต` (`autosup`) window was accidentally opened on a Farm-mode character, switch it back to `ออโต้ฟาร์ม` (`auto`)!
      if (NC.Auto.set.mode !== 'support' && NC.SQ?.isOpen?.('autosup')) {
        try {
          NC.SQ.close?.('autosup');
          NC.SQ.open?.('auto');
        } catch (_) {}
      }
    }

    // Maintain class summons & optimal Puppeteer stance (`pp_shield` solo / `pp_axe` party) in all modes
    runClassSummonAndStanceMaintenanceTick(game, p);

    // If neither Smart Auto-Quest nor Plan Script is actively filtering for a quest monster,
    // make sure NC.Auto.set.off isn't blocking all monsters on the current map!
    if (!window.__smartAutoQuestEnabled && !window.__planScriptEnabled && Array.isArray(NC.Auto?.set?.off) && NC.Auto.set.off.length > 0) {
      const offSet = new Set(NC.Auto.set.off);
      const enemiesHere = (game.enemies || []).filter(e => e && !e.dead && e.hp > 0 && !e.dummy && !e.npc);
      if (enemiesHere.length > 0 && !enemiesHere.some(e => !offSet.has(e.type))) {
        NC.Auto.set.off = [];
        try { NC.Auto.saveSet?.(); } catch (_) {}
      }
    }
  }

  // ============================================================================
  // 3C. ⚰️ AUTO-RESPAWN + 🧪 POTION CRAFT/BUY + 💰 AUTO-SELL & WARP TRIP ENGINE
  // ============================================================================
  let autoSellTrip = null;
  let lastAutoSellDoneAt = 0;
  let lastUnsellableHeavyAt = 0;
  let lastPotionNoFundsAt = 0;
  let forcePotionTripRequested = false;
  let wasDeadBeforeRespawn = false;
  let lastDeathSeenAt = 0;
  let lastReviveSentAt = 0;
  let lastDeathMap = '';

  function resolveSelectedPotionId(p, color, sizeChoice) {
    const NC = window.NC;
    const raw = String(sizeChoice || (color === 'red' ? 'red' : 'blue')).toLowerCase();
    if (raw === 'auto') {
      const sz = NC?.POT?.sizeFor ? NC.POT.sizeFor(p?.lv || 1) : ((p?.lv || 1) < 35 ? 's' : (p?.lv || 1) < 70 ? 'm' : 'l');
      return sz === 's' ? color : `${color}_${sz}`;
    }
    if (raw === 's' || raw === color) return color;
    if (raw === 'm' || raw === `${color}_m`) return `${color}_m`;
    if (raw === 'l' || raw === `${color}_l`) return `${color}_l`;
    return color;
  }

  function getPotionCountById(p, potId) {
    if (!p || !potId) return 0;
    const keyMap = {
      red: 'potions',
      red_m: 'potionsM',
      red_l: 'potionsL',
      blue: 'spPotions',
      blue_m: 'spPotionsM',
      blue_l: 'spPotionsL'
    };
    const k = keyMap[potId];
    return k ? (p[k] | 0) : 0;
  }

  function getPotionLabelById(potId) {
    const names = {
      red: 'ยาแดงเล็ก',
      red_m: 'ยาแดงกลาง',
      red_l: 'ยาแดงใหญ่',
      blue: 'ยาฟ้าเล็ก',
      blue_m: 'ยาฟ้ากลาง',
      blue_l: 'ยาฟ้าใหญ่'
    };
    return names[potId] || potId;
  }

  function syncInGamePotionPreferences(p) {
    const NC = window.NC;
    const cfg = window.__potionConfig || DEFAULT_POTION_CFG;
    if (!NC || !p) return;
    try {
      if (NC.POT?.st?.pref) {
        const hpId = resolveSelectedPotionId(p, 'red', cfg.hpSize);
        const spId = resolveSelectedPotionId(p, 'blue', cfg.spSize);
        NC.POT.st.pref.red = cfg.hpSize === 'auto' ? 'auto' : (hpId === 'red_l' ? 'l' : hpId === 'red_m' ? 'm' : 's');
        NC.POT.st.pref.blue = cfg.spSize === 'auto' ? 'auto' : (spId === 'blue_l' ? 'l' : spId === 'blue_m' ? 'm' : 's');
      }
      if (NC.Auto?.set) {
        const wantHpRatio = cfg.hpEnabled !== false ? Math.max(0, Math.min(0.95, (Number(cfg.hpDrinkPct ?? 60)) / 100)) : 0;
        const wantSpRatio = cfg.spEnabled !== false ? Math.max(0, Math.min(0.95, (Number(cfg.spDrinkPct ?? 40)) / 100)) : 0;
        if (NC.AutoPremium?.has?.()) {
          NC.Auto.set.hpPot = wantHpRatio;
          NC.Auto.set.spPot = wantSpRatio;
        } else {
          if (cfg.hpEnabled !== false && (NC.Auto.set.hpPot || 0) <= 0) NC.Auto.set.hpPot = 0.5;
          if (cfg.spEnabled !== false && (NC.Auto.set.spPot || 0) <= 0) NC.Auto.set.spPot = 0.4;
        }
      }
      // Prevent Nightcamp's built-in NC.AutoPremium from hijacking our Bot's Uncle Coco trip (NC.AutoPremium never crafts potions and ignores our Auto-Sell config!)
      if (window.__isBotRunning && (window.__autoSellEnabled || cfg.hpEnabled || cfg.spEnabled)) {
        if (NC.AutoPremium?.trip?.()) {
          try { NC.AutoPremium._set?.({ trip: null }); } catch (_) {}
        }
      }
    } catch (_) {}
  }

  let lastCustomHpDrinkAt = 0;
  let lastCustomSpDrinkAt = 0;

  function runCustomPotionDrinkTick(game, p) {
    if (!window.__isBotRunning) return;
    const NC = window.NC;
    if (!NC || !game || !p || p.dead > 0) return;
    if (NC.Online?.enabled && NC.Online?.status !== 'online') return;
    const cfg = window.__potionConfig || DEFAULT_POTION_CFG;
    const nowMs = Date.now();

    // 1. Custom HP Auto-Drink % (supports 10%..95% even without paid AUTO Premium!)
    const hpPctTarget = Number(cfg.hpDrinkPct ?? 60);
    if (cfg.hpEnabled !== false && hpPctTarget > 0 && p.maxHp > 0 && p.hp > 0 && p.hp < p.maxHp) {
      const curHpPct = (p.hp / p.maxHp) * 100;
      if (curHpPct < hpPctTarget && !(p.cd?.pot > 0) && nowMs - lastCustomHpDrinkAt >= 320) {
        const hasAnyRed = ((p.potions | 0) + (p.potionsM | 0) + (p.potionsL | 0)) > 0;
        if (hasAnyRed) {
          lastCustomHpDrinkAt = nowMs;
          try {
            syncInGamePotionPreferences(p);
            if (typeof NC.POT?.drink === 'function') NC.POT.drink(game, p, 'red');
            else if (typeof NC.drinkPotion === 'function') NC.drinkPotion(game, p, 'red');
          } catch (_) {}
        }
      }
    }

    // 2. Custom Mana (SP) Auto-Drink % (supports 80%+ for Archmage fast-cast passive even without paid AUTO Premium!)
    const spPctTarget = Number(cfg.spDrinkPct ?? 40);
    if (cfg.spEnabled !== false && spPctTarget > 0 && p.maxSp > 0 && p.sp < p.maxSp) {
      const curSpPct = (p.sp / p.maxSp) * 100;
      if (curSpPct < spPctTarget && !(p.cd?.sppot > 0) && nowMs - lastCustomSpDrinkAt >= 320) {
        const hasAnyBlue = ((p.spPotions | 0) + (p.spPotionsM | 0) + (p.spPotionsL | 0)) > 0;
        if (hasAnyBlue) {
          lastCustomSpDrinkAt = nowMs;
          try {
            syncInGamePotionPreferences(p);
            if (typeof NC.POT?.drink === 'function') NC.POT.drink(game, p, 'blue');
            else if (typeof NC.drinkPotion === 'function') NC.drinkPotion(game, p, 'blue');
          } catch (_) {}
        }
      }
    }
  }

  if (window.__ncFastPotionDrinkTimer) {
    try { clearInterval(window.__ncFastPotionDrinkTimer); } catch (_) {}
  }
  window.__ncFastPotionDrinkTimer = setInterval(() => {
    if (!window.__isBotRunning) return;
    const g = window.NC?.game;
    const pl = g?.player;
    if (g && pl) {
      try { runCustomPotionDrinkTick(g, pl); } catch (_) {}
    }
  }, 280);

  function getTotalBrewableJunkCount(p) {
    const NC = window.NC;
    const MAT = NC?.MATERIALS || {};
    if (!NC || !p) return { bag: 0, store: 0, total: 0 };
    const isUsable = (id) =>
      /^mat_/.test(id) &&
      MAT[id] &&
      !MAT[id].rare &&
      !MAT[id].keep &&
      (MAT[id].base > 0 || MAT[id].price > 0) &&
      id !== 'mat_opt_stone' &&
      id !== 'mat_drill_stone' &&
      id !== 'mat_polish' &&
      !MAT[id].bound &&
      !(NC.invLocked && NC.invLocked(id));
    let bag = 0;
    let store = 0;
    for (const [id, n] of Object.entries(p.mats || {})) {
      if ((n | 0) > 0 && isUsable(id)) bag += (n | 0);
    }
    for (const [id, n] of Object.entries(p.matStore || {})) {
      if ((n | 0) > 0 && isUsable(id)) store += (n | 0);
    }
    return { bag, store, total: bag + store };
  }

  function checkPotionRestockNeeded(p, afterRespawn = false) {
    const cfg = window.__potionConfig || DEFAULT_POTION_CFG;
    if (!p) return null;
    const hpId = resolveSelectedPotionId(p, 'red', cfg.hpSize);
    const spId = resolveSelectedPotionId(p, 'blue', cfg.spSize);
    const hpHave = getPotionCountById(p, hpId);
    const spHave = getPotionCountById(p, spId);
    const hpMin = afterRespawn ? Math.max(cfg.hpMin, Math.floor(cfg.hpTarget * 0.75)) : cfg.hpMin;
    const spMin = afterRespawn ? Math.max(cfg.spMin, Math.floor(cfg.spTarget * 0.75)) : cfg.spMin;

    if (cfg.hpEnabled && hpHave < hpMin && cfg.hpTarget > hpHave) {
      return `${getPotionLabelById(hpId)} เหลือ ${hpHave}/${hpMin} ขวด`;
    }
    if (cfg.spEnabled && spHave < spMin && cfg.spTarget > spHave) {
      return `${getPotionLabelById(spId)} เหลือ ${spHave}/${spMin} ขวด`;
    }
    return null;
  }

  let forceSellTripRequested = false;
  let forceCMarketTripRequested = false;
  let forceRepairTripRequested = false;
  let lastRepairNoFundsAt = 0;
  let lastCMarketAutoTripAt = 0;
  let postRespawnCampCheckUntil = 0;

  function getEquipmentRepairSummary(p) {
    const NC = window.NC;
    const quote = (NC?.DurUI?.quote && typeof NC.DurUI.quote === 'function') ? (NC.DurUI.quote() || { coins: 0, n: 0 }) : { coins: 0, n: 0 };
    const rows = (NC?.DurUI?.rows && typeof NC.DurUI.rows === 'function') ? (NC.DurUI.rows() || []) : [];
    const wornRows = rows.filter(r => r && r.slot);
    let minPct = null;
    let worstName = '';
    for (const r of wornRows) {
      const pct = typeof r.pct === 'number' ? r.pct : 100;
      if (minPct === null || pct < minPct) {
        minPct = pct;
        worstName = (r.it && r.it.name) || r.name || r.slot || 'อุปกรณ์';
      }
    }
    if (minPct === null && p) {
      const durMap = NC?.Online?.snap?.self?.dur || NC?.OnlineWorld?.snap?.self?.dur || null;
      if (durMap && typeof durMap === 'object') {
        for (const [slot, val] of Object.entries(durMap)) {
          if (typeof val === 'number' && (minPct === null || val < minPct)) {
            minPct = val;
            worstName = slot;
          }
        }
      }
    }
    const quoteCoins = Number(quote.coins) || 0;
    const quoteCount = Number(quote.n) || 0;
    let summaryText = '🛡️ ความทนอุปกรณ์: 100% (ไม่ต้องซ่อม)';
    if (minPct !== null || quoteCount > 0) {
      const pctTxt = minPct !== null ? `${minPct}%` : '100%';
      summaryText = quoteCount > 0
        ? `🔨 ความทนต่ำสุด: ${pctTxt}${worstName ? ` (${worstName})` : ''} · ค่าซ่อม ${quoteCoins.toLocaleString()}g (${quoteCount} ชิ้น)`
        : `🛡️ ความทนต่ำสุด: ${pctTxt} (ยังไม่ต้องซ่อม)`;
    }
    return {
      quoteCoins,
      quoteCount,
      minPct,
      worstName,
      hasBroken: minPct !== null && minPct <= 0,
      summaryText
    };
  }

  window.__triggerAutoRepairTripNow = function triggerAutoRepairTripNow() {
    forceRepairTripRequested = true;
    lastRepairNoFundsAt = 0;
    lastAutoSellDoneAt = 0;
    if (!window.__isBotRunning) {
      window.startMasterBot();
    } else {
      try { runPlanEngineTick(); } catch (_) {}
    }
    return { success: true };
  };

  window.__triggerPotionRestockTripNow = function triggerPotionRestockTripNow() {
    forcePotionTripRequested = true;
    lastPotionNoFundsAt = 0;
    lastAutoSellDoneAt = 0;
    if (!window.__isBotRunning) {
      window.startMasterBot();
    } else {
      try { runPlanEngineTick(); } catch (_) {}
    }
    return { success: true };
  };

  window.__triggerAutoSellTripNow = function triggerAutoSellTripNow() {
    forceSellTripRequested = true;
    lastUnsellableHeavyAt = 0;
    lastAutoSellDoneAt = 0;
    if (!window.__isBotRunning) {
      window.startMasterBot();
    } else {
      try { runPlanEngineTick(); } catch (_) {}
    }
    return { success: true };
  };

  window.__triggerCMarketAutoSellNow = function triggerCMarketAutoSellNow() {
    forceCMarketTripRequested = true;
    lastCMarketAutoTripAt = 0;
    lastAutoSellDoneAt = 0;
    if (!window.__isBotRunning) {
      window.startMasterBot();
    } else {
      try { runPlanEngineTick(); } catch (_) {}
    }
    return { success: true };
  };

  function parseSellCsvList(raw) {
    return String(raw || '')
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);
  }

  function matchesSellTokenList(id, name, list) {
    if (!Array.isArray(list) || list.length === 0) return false;
    const idLow = String(id || '').toLowerCase();
    const nmLow = String(name || '').toLowerCase();
    return list.some(tok => idLow === tok || nmLow.includes(tok) || idLow.includes(tok));
  }

  function runAutoRespawnTick(game, p) {
    const NC = window.NC;
    if (!NC || !game || !p) return false;
    const snapDead = Boolean(NC.OnlineWorld?.snap?.self && NC.OnlineWorld.snap.self.dead > 0);
    const fallenOpen = Boolean(NC.P3Fallen?.isOpen && NC.P3Fallen.isOpen());
    const goBtn = document.querySelector('#p3f-go:not([disabled])');
    const isDeadNow = Boolean(p.dead > 0 || snapDead || fallenOpen || (goBtn && goBtn.offsetWidth > 0));

    if (isDeadNow) {
      if (!wasDeadBeforeRespawn) {
        wasDeadBeforeRespawn = true;
        lastDeathSeenAt = Date.now();
        if (game.mapId && game.mapId !== 'camp') {
          lastDeathMap = game.mapId;
        }
      }
      if (!window.__autoRespawnEnabled) {
        setPlanTaskStatus('💀 ตัวละครหมดแรง (Auto-Respawn ปิดอยู่ · กดกลับค่ายเพื่อฟื้น)');
        return true;
      }
      setPlanTaskStatus('⚰️ Auto-Respawn: ตัวละครหมดแรง! กำลังกดกลับค่ายเกิดใหม่อัตโนมัติ...');
      const nowMs = Date.now();
      if (nowMs - lastDeathSeenAt >= 900 && nowMs - lastReviveSentAt >= 3200) {
        lastReviveSentAt = nowMs;
        try {
          if (typeof NC.P3Fallen?.go === 'function') {
            NC.P3Fallen.go();
          } else if (goBtn) {
            goBtn.click();
          } else if (NC.Online?.action) {
            NC.Online.action({ action: 'revive' });
          }
        } catch (_) {}
      }
      return true;
    }

    // Just revived! Keep an 8.5s window so as soon as the server transfer to `camp` completes, we check potion crafting & junk selling at Uncle Coco!
    if (wasDeadBeforeRespawn) {
      wasDeadBeforeRespawn = false;
      postRespawnCampCheckUntil = Date.now() + 8500;
    }

    if (postRespawnCampCheckUntil > 0) {
      if (Date.now() > postRespawnCampCheckUntil) {
        postRespawnCampCheckUntil = 0;
      } else if (game.mapId === 'camp' && !autoSellTrip) {
        postRespawnCampCheckUntil = 0;
        const needPotRestock = Boolean(checkPotionRestockNeeded(p, true) && canAffordPotionRestockNow(game, p));
        const hasBagJunkToSell = Boolean(
          window.__autoSellEnabled &&
          (getJunkGearUidsToSell(p).length > 0 || getMaterialsToSell(p, { afterBrew: true }).length > 0)
        );
        if (needPotRestock || hasBagJunkToSell) {
          lastAutoSellDoneAt = 0;
          if (needPotRestock) forcePotionTripRequested = true;
          else forceSellTripRequested = true;
          if (NC.AutoPremium?.trip?.()) {
            try { NC.AutoPremium._set?.({ trip: null }); } catch (_) {}
          }
          return false;
        }
        if (window.__smartAutoQuestEnabled && NC.QuestAuto && !NC.QuestAuto.on) {
          try { NC.QuestAuto.start?.(); } catch (_) {}
        }
      }
    }
    return false;
  }

  function getMapWarpCost(mapId) {
    const NC = window.NC;
    const costs = NC?.Online?.snap?.self?.travel?.costs || NC?.OnlineWorld?.snap?.self?.travel?.costs;
    const c = costs && mapId ? costs[mapId] : null;
    return Number.isFinite(c) ? c : null;
  }

  function isMapVisitedForWarp(mapId) {
    if (!mapId) return false;
    if (mapId === 'camp') return true;
    const NC = window.NC;
    const visited = NC?.Online?.snap?.self?.econ?.visited || NC?.OnlineWorld?.snap?.self?.econ?.visited || NC?.Econ?.state?.visited;
    return Boolean(visited && visited[mapId]);
  }

  function canStartAutoSellHere(game, allowInCamp = false) {
    const NC = window.NC;
    if (!NC || !game || !game.mapId) return false;
    const M = NC.MAPS?.[game.mapId] || {};
    if (!allowInCamp && M.camp) return false;
    if (M.pvp || M.gwar || (M.secret && game.mapId !== 'batnest')) return false;
    if (NC.PvP && (NC.PvP.duel || NC.PvP.pending)) return false;
    if (NC.GW?.on?.()) return false;
    if (NC.StoryRoom?.inRoom?.()) return false;
    if (NC.Trial?.inRoom?.()) return false;
    if (NC.BossRace?.fighting?.()) return false;
    return true;
  }

  function isMaterialNeededByQuests(p, matId) {
    const NC = window.NC;
    if (!NC || !p || !matId) return false;
    if (NC.questMatGap && NC.questMatGap(p, matId, 0.5) === 1) return true;
    const q = NC.Quests?.cur?.();
    if (q && Array.isArray(q.obj)) {
      if (q.obj.some(o => o && (o.id === matId || (Array.isArray(o.ids) && o.ids.includes(matId))))) return true;
    }
    const daily = NC.Quests?.state?.daily;
    if (daily && typeof daily === 'object') {
      for (const dayList of Object.values(daily)) {
        if (Array.isArray(dayList) && dayList.some(d => d && d.id === matId && !d.done)) return true;
      }
    }
    return false;
  }

  function getMaterialsToSell(p, opts = {}) {
    const NC = window.NC;
    const MAT = NC?.MATERIALS || {};
    const sc = window.__sellConfig || DEFAULT_SELL_CFG;
    const whiteList = parseSellCsvList(sc.whitelist);
    const forceList = parseSellCsvList(sc.forceSellList);
    const mode = String(sc.materialMode || 'common');
    const afterBrew = Boolean(opts && opts.afterBrew);
    const out = [];
    if (!p || !p.mats) return out;
    if (mode === 'none' && forceList.length === 0) return out;

    for (const id of Object.keys(p.mats).sort()) {
      if (!id.startsWith('mat_')) continue;
      // หินขัดเกรด / หินออฟ / หินเจาะรู ห้ามขายทิ้งให้ NPC เด็ดขาด
      if (/polish|fstone|opt_stone|drill_stone/i.test(id)) continue;
      const M = MAT[id];
      if (!M || M.keep || M.noNpc || M.byHand || (NC.SellHand?.is && NC.SellHand.is(id))) continue;
      if (/ขัดเกรด|หินขัด/i.test(M.name || '')) continue;
      if (/(^|_)key(_|$)/.test(id) || (NC.BL?.isRune && NC.BL.isRune(id))) continue;
      if (NC.invLocked && NC.invLocked(id)) continue;
      if (isMaterialNeededByQuests(p, id)) continue;
      if (matchesSellTokenList(id, M.name, whiteList)) continue;
      if (isProtectedByCMarketAutoSell(id, M.name)) continue;

      const isForced = matchesSellTokenList(id, M.name, forceList);
      if (!isForced) {
        if (mode === 'none') continue;
        // 'plain_only': เก็บของดี (mat_vp_*) และแรร์ไว้ฝากคลัง (แต่ถ้าผู้ใช้ปิดฝากคลัง storeMats === false จะขายของดี mat_vp_* ให้ด้วยเพื่อไม่ให้รกกระเป๋า)
        if (mode === 'plain_only' && (/^mat_vp_/.test(id) || M.rare) && sc.storeMats !== false) continue;
        // 'common': ขายขยะมอนทั่วไป + ของดี mat_vp_* (เก็บเฉพาะวัตถุดิบแรร์บอส M.rare)
        if (mode === 'common' && M.rare) continue;
      }
      const freeCount = NC.Bound ? ((NC.Bound.npcFree || NC.Bound.free)(p, 'mat:' + id) | 0) : (p.mats[id] | 0);
      if (freeCount > 0) out.push([id, freeCount]);
    }

    // Reserve cheapest brew-usable monster junk in bag ONLY for remaining unbrewed potion deficit
    const potCfg = window.__potionConfig || DEFAULT_POTION_CFG;
    const shouldReserveForBrew = Boolean(
      potCfg.preferCraft !== false &&
      (potCfg.hpEnabled || potCfg.spEnabled) &&
      !skipPotionBuyOnNextTrip &&
      !window.__autoFarmLv20Config?.enabled
    );
    if (shouldReserveForBrew && out.length > 0) {
      const hpId = resolveSelectedPotionId(p, 'red', potCfg.hpSize);
      const spId = resolveSelectedPotionId(p, 'blue', potCfg.spSize);
      const hpDeficit = potCfg.hpEnabled ? Math.max(0, (Number(potCfg.hpTarget) || 100) - getPotionCountById(p, hpId)) : 0;
      const spDeficit = potCfg.spEnabled ? Math.max(0, (Number(potCfg.spTarget) || 60) - getPotionCountById(p, spId)) : 0;
      const hpBatches = hpDeficit >= 5 ? Math.ceil(hpDeficit / 10) : 0;
      const spBatches = spDeficit >= 5 ? Math.ceil(spDeficit / 10) : 0;
      const needPerBatch = Number((NC.Brew?.plan && NC.Brew.plan(p, hpId, 1)?.R?.junk) || 2) || 2;
      const storeBrewStock = getTotalBrewableJunkCount(p).store;
      const neededFromBag = Math.max(0, (hpBatches + spBatches) * needPerBatch - storeBrewStock);
      // After Step 1 brewing is complete (or when storage deposit is turned off), don't leave a 14-piece buffer clogging the bag!
      const extraBuffer = (afterBrew || sc.storeMats === false) ? 0 : 10;
      let leftToReserve = neededFromBag + extraBuffer;

      if (leftToReserve > 0) {
        const isBrewUsable = (id) => {
          const M = MAT[id];
          return /^mat_/.test(id) && M && !M.rare && !M.keep && (M.base > 0 || M.price > 0) &&
            id !== 'mat_opt_stone' && id !== 'mat_drill_stone' && id !== 'mat_polish' &&
            !M.bound && !(NC.invLocked && NC.invLocked(id)) &&
            !matchesSellTokenList(id, M.name, forceList);
        };

        const brewIndices = out
          .map((entry, idx) => ({ idx, id: entry[0], price: Number(MAT[entry[0]]?.price) || 999999 }))
          .filter(x => isBrewUsable(x.id))
          .sort((a, b) => a.price - b.price || a.id.localeCompare(b.id));

        for (const b of brewIndices) {
          if (leftToReserve <= 0) break;
          const curQty = out[b.idx][1];
          const keepQty = Math.min(curQty, leftToReserve);
          out[b.idx][1] = curQty - keepQty;
          leftToReserve -= keepQty;
        }
        return out.filter(entry => entry[1] > 0);
      }
    }

    return out;
  }

  function getJunkGearUidsToSell(p) {
    const NC = window.NC;
    const G = NC?.GEAR;
    const ITEMS = NC?.ITEMS || {};
    const sc = window.__sellConfig || DEFAULT_SELL_CFG;
    const whiteList = parseSellCsvList(sc.whitelist);
    const forceList = parseSellCsvList(sc.forceSellList);
    const bagList = (G?.bag ? G.bag(p) : p?.bag) || [];
    if (!p || !G || !Array.isArray(bagList)) return [];

    const worn = G.wornUids ? G.wornUids(p) : new Set(Object.values(p.wu || {}));
    const sellableSlots = new Set(['weapon', 'hat', 'top', 'robe', 'pants', 'shoes', 'cape', 'shield', 'acc', 'glasses']);
    const profile = getJobStatProfile(p);
    const RARITY_RANK = { common: 1, rare: 2, epic: 3, legend: 4 };
    const wtypeOfItem = (it) => it ? ((NC.wtypeOf ? NC.wtypeOf(it) : it.wtype) || 'sword') : '';
    const curWeaponIt = p.equip?.weapon ? ITEMS[p.equip.weapon] : null;
    const curWeaponWt = curWeaponIt ? wtypeOfItem(curWeaponIt) : '';

    return bagList.filter(c => {
      if (!c || !c.u || worn.has(c.u)) return false;
      const it = ITEMS[c.id];
      if (!it || !sellableSlots.has(it.slot)) return false;
      if (c.bd || c.lk || (G.noSale && G.noSale(c)) || (G.kept && G.kept(c))) return false;
      if (matchesSellTokenList(c.id, it.name, whiteList)) return false;
      if (isProtectedByCMarketAutoSell(c.id, it.name)) return false;

      const isForced = matchesSellTokenList(c.id, it.name, forceList);
      if (isForced) return true;

      // Safety locks (Note: in Nightcamp S2/S3, normal drops roll 2 random option rows by default; 3-4 rows are special)
      if (sc.keepRefined !== false && (c.ref || 0) > 0) return false;
      if (sc.keepSpecial !== false && (((c.rows && c.rows.length) || 0) >= 3 || (c.g || 0) >= 2 || Boolean(c.sh))) return false;
      if (sc.keepBossGear !== false && Boolean(it.bossGear || it.hc === 'boss' || it.rarity === 'legend')) return false;

      // Smart Gear Lock: never sell an item that our job can wield and that scores better for our class than what we currently wear
      if (sc.keepBestCopy !== false) {
        try {
          const targetSlot = it.slot === 'acc' ? 'acc1' : it.slot;
          const canCheck = !(it.slot === 'weapon' && NC.canWield && !NC.canWield(p, c.id));
          if (canCheck) {
            if (it.slot === 'weapon' && profile.allowedWtypes && profile.allowedWtypes.size > 0) {
              const candWt = wtypeOfItem(it);
              if (profile.allowedWtypes.has(candWt) && (!curWeaponWt || !profile.allowedWtypes.has(curWeaponWt))) {
                return false;
              }
            }
            const cmp = compareCandidateAgainstSlot(p, c, targetSlot);
            if (cmp && !cmp.worn) {
              const synDelta = computePieceClassSynergy(p, cmp.A, profile) - computePieceClassSynergy(p, cmp.B, profile);
              if ((Number(cmp.power) || 0) + synDelta > 0.3) return false;
            }
          }
        } catch (_) {}
      }

      // Rarity/Grade tier check by category (1 = ทั่วไป/Common, 2 = หายาก/Rare, 3 = ล้ำค่า/Epic, 4 = ตำนาน/Legend)
      const rarityTier = RARITY_RANK[it.rarity] || ((G.gradeOf ? G.gradeOf(it) : 1) || 1);
      let maxGrade = 0;
      if (it.slot === 'weapon') {
        maxGrade = Number(sc.weaponMaxGrade ?? 1);
      } else if (it.slot === 'acc' || it.slot === 'glasses') {
        maxGrade = Number(sc.accMaxGrade ?? 0);
      } else {
        maxGrade = Number(sc.armorMaxGrade ?? 1);
      }
      return maxGrade > 0 && rarityTier <= maxGrade;
    }).map(c => c.u);
  }

  function estimateSellableValueInBag(p) {
    const NC = window.NC;
    if (!NC || !p) return 0;
    let total = 0;
    try {
      const uids = new Set(getJunkGearUidsToSell(p));
      if (uids.size > 0 && Array.isArray(p.bag)) {
        const gearList = p.bag.filter(c => c && uids.has(c.u));
        total += (NC.GEAR?.salePreview ? NC.GEAR.salePreview(gearList) : gearList.length * 15) || 0;
      }
      const mats = getMaterialsToSell(p);
      for (const [id, n] of mats) {
        const q = NC.Econ?.quote ? NC.Econ.quote(id, n, p) : ((NC.MATERIALS?.[id]?.price || 1) * n);
        total += (q || 0);
      }
    } catch (_) {}
    return Math.round(total);
  }

  function canAffordPotionRestockNow(game, p) {
    // When Auto-Farm Lv.20 mode is active, preserve all starting 15,000+ coins (never spend coins on potion buying/brewing)
    if (window.__autoFarmLv20Config?.enabled) return false;
    const NC = window.NC;
    if (!NC || !game || !p) return false;
    const potCfg = window.__potionConfig || DEFAULT_POTION_CFG;
    const toCampCost = game.mapId === 'camp' ? 0 : (getMapWarpCost('camp') || 0);
    const backCost = getMapWarpCost(game.mapId !== 'camp' ? game.mapId : 'farm') || 30;
    const reserve = Math.max(100, toCampCost + backCost + 60);
    const liveVaultCoins = Number(NC.PremiumOnline?.state?.()?.vault?.coins);
    if (Number.isFinite(liveVaultCoins)) window.__lastKnownVaultCoins = liveVaultCoins;
    const vaultCoins = Number(window.__lastKnownVaultCoins) || 0;
    const availableCoins = (p.coins || 0) + vaultCoins + estimateSellableValueInBag(p) - reserve;
    if (availableCoins < 25) return false;

    const hpId = resolveSelectedPotionId(p, 'red', potCfg.hpSize);
    const spId = resolveSelectedPotionId(p, 'blue', potCfg.spSize);
    const junkStock = getTotalBrewableJunkCount(p).total;

    if (potCfg.hpEnabled && getPotionCountById(p, hpId) < potCfg.hpMin) {
      const itemDef = (NC.Shop?.POTIONS || []).find(q => q.id === hpId);
      const buy5 = ((itemDef && itemDef.price) || 50) * 5;
      const canBrew = potCfg.preferCraft !== false && junkStock >= 2 && availableCoins >= 25;
      if (canBrew || availableCoins >= buy5) return true;
    }
    if (potCfg.spEnabled && getPotionCountById(p, spId) < potCfg.spMin) {
      const itemDef = (NC.Shop?.POTIONS || []).find(q => q.id === spId);
      const buy5 = ((itemDef && itemDef.price) || 30) * 5;
      const canBrew = potCfg.preferCraft !== false && junkStock >= 2 && availableCoins >= 15;
      if (canBrew || availableCoins >= buy5) return true;
    }
    return false;
  }

  function brewPotionBatchDirect(game, p, potId, batches) {
    const NC = window.NC;
    if (!NC || !game || !p || !potId || !(batches > 0)) return false;
    const P = NC.Brew?.plan ? NC.Brew.plan(p, potId, batches) : null;
    if (!P || !P.ok) return false;
    // Bypass js/online/craft.js 4-second `pending` popup lock by sending `{ action: 'brew' }` directly to OnlineWorld
    if (NC.OnlineWorld?.ready && typeof NC.OnlineWorld.send === 'function') {
      const items = Array.isArray(P.take) ? P.take.map(t => t[0]).slice(0, 256) : [];
      return Boolean(NC.OnlineWorld.send({
        action: 'brew',
        itemId: potId,
        count: batches,
        items
      }));
    }
    if (typeof NC.Brew?.brew === 'function') {
      NC.Brew.brew(game, potId, batches);
      return true;
    }
    return false;
  }

  function depositSpareGearToStorage(game, p) {
    const NC = window.NC;
    const G = NC?.GEAR;
    if (!NC || !G || !game || !p || typeof G.deposit !== 'function') return 0;
    const bagList = (G.bag ? G.bag(p) : p.bag) || [];
    const worn = G.wornUids ? G.wornUids(p) : new Set(Object.values(p.wu || {}));
    const storeArr = G.store ? G.store(p) : [];
    const cap = G.storeCap ? G.storeCap(p) : 60;
    let deposited = 0;
    for (const c of bagList.slice()) {
      if (!c || !c.u || worn.has(c.u)) continue;
      if (isProtectedByCMarketAutoSell(c.id, NC.ITEMS?.[c.id]?.name)) continue;
      if (storeArr.length + deposited >= cap) break;
      try {
        const res = G.deposit(game, c.u);
        if (res === null) deposited++;
      } catch (_) {}
    }
    return deposited;
  }

  function getCMarketFairPriceInfo(k, id, copy) {
    const NC = window.NC;
    const F = NC?.FreeTrade;
    let refPrice = 0;
    let band = null;
    try {
      if (F && typeof F.refOf === 'function') {
        refPrice = Number(F.refOf(k, id, copy)) || 0;
      } else if (k === 'mat' || k === 'rune') {
        const M = NC?.MATERIALS?.[id] || NC?.ITEMS?.[id] || {};
        refPrice = Number(M.base != null ? M.base : (M.price || M.sell || 10)) || 10;
      } else if (k === 'pot') {
        const q = (NC?.POT?.LIST || []).find(x => x && x.id === id);
        refPrice = Number(q?.price || NC?.ITEMS?.[id]?.price || 50) || 50;
      } else if (copy && NC?.GEAR?.priceOf) {
        refPrice = Number(NC.GEAR.priceOf(Object.assign({ rows: [] }, copy, { id: copy.id || id }))) || 100;
      }
      if (F && typeof F.band === 'function') {
        const bKind = typeof F.kindOf === 'function' ? F.kindOf(k, id) : (k === 'item' ? 'gear' : k);
        band = F.band(refPrice, bKind);
      }
    } catch (_) {}
    if (!Array.isArray(band) || band.length !== 2) {
      const base = Math.max(10, refPrice || 50);
      band = [Math.max(1, Math.floor(base * 0.4)), Math.max(base * 5, 50000)];
    }
    return { refPrice, band };
  }

  function resolveNightcampMaterialMeta(id) {
    const NC = window.NC;
    if (!NC || !id) return {};
    return (
      NC.MATERIALS?.[id] ||
      NC.ITEMS?.[id] ||
      NC.PackItems?.ITEMS?.[id] ||
      NC.GemShop?.byId?.[id] ||
      NC.Cook?.BY?.[id] ||
      (NC.Shop?.POTIONS || []).find(x => x && x.id === id) ||
      (NC.POT?.LIST || []).find(x => x && x.id === id) ||
      {}
    );
  }

  function resolveNightcampIconUrl(id, px = 40) {
    const NC = window.NC;
    if (!NC || !id) return '';
    let raw = '';
    try {
      if (typeof NC.matIcon === 'function') {
        const mIc = NC.matIcon(id);
        if (typeof mIc === 'string' && mIc.trim()) raw = mIc.trim();
        else if (mIc && typeof mIc.toDataURL === 'function') raw = mIc.toDataURL() || '';
        else if (mIc && typeof mIc.src === 'string') raw = mIc.src;
      }
    } catch (_) {}
    if (!raw) {
      try {
        if (typeof NC.itemIconURL === 'function') {
          const iIc = NC.itemIconURL(id, px);
          if (typeof iIc === 'string' && iIc.trim()) raw = iIc.trim();
        }
      } catch (_) {}
    }
    if (!raw) {
      const shopPot = (NC.Shop?.POTIONS || []).find(x => x && x.id === id);
      if (shopPot && shopPot.icon) raw = String(shopPot.icon);
    }
    if (!raw && NC.ASSET_MANIFEST?.[id]?.src) {
      raw = String(NC.ASSET_MANIFEST[id].src);
    }
    if (!raw && NC.PackItems?.ITEMS?.[id]?.pic) {
      raw = String(NC.PackItems.ITEMS[id].pic);
    }
    if (!raw) return '';
    if (raw.startsWith('data:') || raw.startsWith('blob:')) {
      return raw;
    }
    try {
      const casMapped = (typeof NC.casOf === 'function') ? NC.casOf(raw) : raw;
      const base = (typeof document !== 'undefined' && document.baseURI) ? document.baseURI : window.location.origin;
      return new URL(casMapped || raw, base).href;
    } catch (_) {
      return raw;
    }
  }

  function getCMarketTradableHoldings(p) {
    const NC = window.NC;
    if (!NC || !p) return [];
    const out = [];
    const G = NC.GEAR;
    const worn = G?.wornUids ? G.wornUids(p) : new Set(Object.values(p.wu || {}));

    // 1. Stackable Materials (`mat` & `rune`)
    const heldMats = (typeof NC.PremiumOnline?.held === 'function') ? (NC.PremiumOnline.held(p, 'mat') || []) : null;
    const heldRunes = (typeof NC.PremiumOnline?.held === 'function') ? (NC.PremiumOnline.held(p, 'rune') || []) : [];
    const freeMatMap = new Map();
    if (Array.isArray(heldMats)) {
      for (const h of [...heldMats, ...heldRunes]) {
        if (h && h.id && Number(h.n) > 0) freeMatMap.set(h.id, { k: h.k || 'mat', n: Number(h.n) || 0 });
      }
    }
    for (const [matId, rawQty] of Object.entries(p.mats || {})) {
      const totalQty = Number(rawQty) || 0;
      if (totalQty <= 0) continue;
      const M = resolveNightcampMaterialMeta(matId);
      const isRune = Boolean(NC.BL?.isRune && NC.BL.isRune(matId));
      const hEntry = freeMatMap.get(matId);
      const freeQty = hEntry
        ? hEntry.n
        : (typeof NC.Bound?.free === 'function' ? (NC.Bound.free(p, (isRune ? 'rune:' : 'mat:') + matId) | 0) : totalQty);
      const k = hEntry?.k || (isRune ? 'rune' : 'mat');
      const icon = resolveNightcampIconUrl(matId, 40);
      const locked = Boolean(typeof NC.invLocked === 'function' && NC.invLocked(matId));
      const { refPrice, band } = getCMarketFairPriceInfo(k, matId, null);
      out.push({
        key: `${k}:${matId}`,
        k,
        id: matId,
        u: 0,
        name: M.name || matId,
        qty: totalQty,
        freeQty: Math.max(0, freeQty),
        locked,
        icon,
        rarity: M.rarity || (isRune ? 'epic' : 'common'),
        refPrice,
        band,
        copy: null
      });
    }

    // 2. Potions (`pot`)
    const heldPots = (typeof NC.PremiumOnline?.held === 'function') ? (NC.PremiumOnline.held(p, 'pot') || []) : null;
    const potDefs = [
      { id: 'red', field: 'potions', name: 'ยาแดงขวดเล็ก' },
      { id: 'red_m', field: 'potionsM', name: 'ยาแดงขวดกลาง' },
      { id: 'red_l', field: 'potionsL', name: 'ยาแดงขวดใหญ่' },
      { id: 'blue', field: 'spPotions', name: 'ยาฟ้าขวดเล็ก' },
      { id: 'blue_m', field: 'spPotionsM', name: 'ยาฟ้าขวดกลาง' },
      { id: 'blue_l', field: 'spPotionsL', name: 'ยาฟ้าขวดใหญ่' }
    ];
    for (const pd of potDefs) {
      const totalQty = Number(p[pd.field] || 0);
      if (totalQty <= 0) continue;
      const h = Array.isArray(heldPots) ? heldPots.find(x => x && x.id === pd.id) : null;
      const freeQty = h
        ? (Number(h.n) || 0)
        : (typeof NC.Bound?.free === 'function' ? (NC.Bound.free(p, 'pot:' + pd.id) | 0) : totalQty);
      const it = resolveNightcampMaterialMeta(pd.id);
      const icon = resolveNightcampIconUrl(pd.id, 40);
      const { refPrice, band } = getCMarketFairPriceInfo('pot', pd.id, null);
      out.push({
        key: `pot:${pd.id}`,
        k: 'pot',
        id: pd.id,
        u: 0,
        name: it.name || pd.name,
        qty: totalQty,
        freeQty: Math.max(0, freeQty),
        locked: false,
        icon,
        rarity: 'common',
        refPrice,
        band,
        copy: null
      });
    }

    // 3. Equipment in Bag (`item`)
    const heldGear = (typeof NC.PremiumOnline?.held === 'function') ? (NC.PremiumOnline.held(p, 'item') || []) : null;
    const heldUids = Array.isArray(heldGear) ? new Set(heldGear.map(x => Number(x?.u)).filter(Boolean)) : null;
    const bagList = (typeof G?.bag === 'function' ? G.bag(p) : p.bag) || [];
    for (const c of bagList) {
      if (!c || !c.id || !c.u || worn.has(c.u)) continue;
      const it = NC.ITEMS?.[c.id] || {};
      const locked = Boolean(
        (typeof NC.GearKeep?.kept === 'function' && NC.GearKeep.kept(c)) ||
        (typeof G?.kept === 'function' && G.kept(c)) ||
        (typeof NC.invLocked === 'function' && NC.invLocked(c.u))
      );
      const isFree = heldUids ? heldUids.has(Number(c.u)) : (!c.bd && !(G?.noSale && G.noSale(c)));
      const icon = (typeof NC.itemIconURL === 'function' ? NC.itemIconURL(c.id, 40) : '') || '';
      const dispName = (typeof NC.copyName === 'function')
        ? NC.copyName(c)
        : `${c.sh ? '✦ ' : ''}${it.name || c.id}${c.ref ? ' +' + c.ref : ''}`;
      const { refPrice, band } = getCMarketFairPriceInfo('item', c.id, c);
      out.push({
        key: `item:${c.id}:${c.u}`,
        k: 'item',
        id: c.id,
        u: c.u,
        name: dispName,
        baseName: it.name || c.id,
        qty: 1,
        freeQty: isFree ? 1 : 0,
        locked,
        icon,
        rarity: it.rarity || 'common',
        grade: Number(c.g) || 0,
        refine: Number(c.ref) || 0,
        options: formatNightcampGearRows(c),
        refPrice,
        band,
        copy: c
      });
    }

    return out;
  }

  function evaluateCMarketAutoSellRules(p) {
    const NC = window.NC;
    const cfg = window.__cmarketAutoSellConfig || DEFAULT_CMARKET_AUTOSELL_CFG;
    const F = NC?.FreeTrade;
    const cmState = (typeof NC?.CMarket?.state === 'function') ? NC.CMarket.state() : null;
    const isPrem = Boolean(F?.premium && F.premium());
    const maxSlots = isPrem ? 20 : (Number(F?.stallLimit?.()) || 3);
    const taxPct = isPrem ? 10 : (Number(F?.taxPct?.()) || 15);
    const tradeLockMsg = (typeof F?.lock === 'function' ? String(F.lock() || '') : '') ||
      ((Number(p?.lv) || 1) < (Number(F?.tradeLevel?.()) || 20)
        ? `ต้องถึง Lv.${Number(F?.tradeLevel?.()) || 20} ก่อนจึงจะวางขายตลาดกลางได้ (ตอนนี้ Lv.${Number(p?.lv) || 1})`
        : '');
    const canTradeMarket = !tradeLockMsg;
    const mineList = Array.isArray(cmState?.mine) ? cmState.mine : [];
    const openListings = mineList.filter(l => l && l.state === 'open' && Number(l.n) > 0);
    const openSlotCount = openListings.length;
    const freeSlots = Math.max(0, maxSlots - openSlotCount);
    const stackMax = Number(F?.stackMax?.()) || 9999;

    const holdings = getCMarketTradableHoldings(p);
    const readyCandidates = [];
    const ruleStates = [];

    for (const rule of (cfg.rules || [])) {
      if (!rule) continue;
      const catInfo = resolveNightcampCatalogItem(rule.itemId || rule.itemName);
      const resolvedId = catInfo?.id || rule.itemId || '';
      const resolvedName = rule.itemName || catInfo?.name || resolvedId;
      const resolvedKind = (rule.kind && rule.kind !== 'auto') ? rule.kind : (catInfo?.kind || 'mat');
      const icon = (resolvedId && typeof NC?.itemIconURL === 'function' ? NC.itemIconURL(resolvedId, 40) : '') || '';

      // Match holdings in bag
      const matchingHoldings = holdings.filter(h =>
        doesItemMatchCMarketRule(h.id, h.baseName || h.name, rule) ||
        (resolvedId && h.id === resolvedId)
      );
      const bagQty = matchingHoldings.reduce((s, h) => s + (Number(h.qty) || 0), 0);
      const unlockedFreeHoldings = matchingHoldings.filter(h => !h.locked && h.freeQty > 0);
      const freeQty = unlockedFreeHoldings.reduce((s, h) => s + (Number(h.freeQty) || 0), 0);
      const reserveQty = Math.max(0, Number(rule.reserveQty) || 0);
      const minQty = Math.max(1, Number(rule.minQty) || 1);
      const availToSell = Math.max(0, freeQty - reserveQty);

      // Match active listings on Central Market
      const activeForRule = openListings.filter(l =>
        doesItemMatchCMarketRule(l.itemId, NC?.ITEMS?.[l.itemId]?.name || NC?.MATERIALS?.[l.itemId]?.name || '', rule) ||
        (resolvedId && l.itemId === resolvedId)
      );
      const activeListedCount = activeForRule.length;
      const activeListedQty = activeForRule.reduce((s, l) => s + (Number(l.n) || 0), 0);

      const sampleCopy = unlockedFreeHoldings[0]?.copy || matchingHoldings[0]?.copy || null;
      const { refPrice, band } = getCMarketFairPriceInfo(resolvedKind, resolvedId, sampleCopy);
      const medEntry = cmState?.med?.[`${resolvedKind}:${resolvedId}`];
      const medianPrice = Number(medEntry?.median) || 0;
      const cheapKnown = Number(cmState?.cheap?.[`${resolvedKind}:${resolvedId}`]) || 0;

      let statusKey = 'missing';
      let statusLabel = '❌ ไม่มีในตัว';
      let ready = false;

      if (rule.enabled === false) {
        statusKey = 'disabled';
        statusLabel = '⏸️ ปิดรายการนี้ชั่วคราว';
      } else if (availToSell >= minQty) {
        ready = true;
        statusKey = 'ready';
        statusLabel = `✅ มี ${availToSell.toLocaleString()} ชิ้น พร้อมวางขาย!`;
      } else if (bagQty > 0 && freeQty === 0) {
        statusKey = 'bound';
        statusLabel = matchingHoldings.some(h => h.locked)
          ? `🔒 มี ${bagQty} ชิ้น (ติดล็อกในกระเป๋า)`
          : `🔒 มี ${bagQty} ชิ้น (ของติดตัว ขายไม่ได้)`;
      } else if (bagQty > 0) {
        statusKey = 'waiting';
        statusLabel = `⏳ มีในตัว ${availToSell}/${minQty} ชิ้น${reserveQty > 0 ? ` (สำรอง ${reserveQty})` : ''} · รอฟาร์มเพิ่ม`;
      } else if (activeListedCount > 0) {
        statusKey = 'listed';
        statusLabel = `🏷️ กำลังวางขายอยู่ ${activeListedCount} รายการ (${activeListedQty} ชิ้น)`;
      }

      if (ready && rule.enabled !== false) {
        for (const h of unlockedFreeHoldings) {
          if (h.k === 'item' || h.k === 'rune') {
            readyCandidates.push({
              rule,
              holding: h,
              k: h.k,
              id: h.id,
              u: h.u,
              name: h.name,
              sellQty: 1,
              refPrice: h.refPrice || refPrice,
              band: h.band || band
            });
            if (rule.sellMode === 'min' && readyCandidates.filter(c => c.rule.id === rule.id).length >= minQty) {
              break;
            }
          } else {
            const availH = Math.max(0, h.freeQty - reserveQty);
            if (availH >= minQty) {
              const sellQty = Math.min(stackMax, rule.sellMode === 'min' ? minQty : availH);
              readyCandidates.push({
                rule,
                holding: h,
                k: h.k,
                id: h.id,
                u: 0,
                name: h.name,
                sellQty,
                refPrice: h.refPrice || refPrice,
                band: h.band || band
              });
            }
          }
        }
      }

      ruleStates.push({
        id: rule.id,
        itemId: resolvedId || rule.itemId,
        itemName: resolvedName,
        kind: resolvedKind,
        minQty,
        sellMode: rule.sellMode || 'all',
        customPrice: Number(rule.customPrice) || 0,
        reserveQty,
        enabled: rule.enabled !== false,
        icon: unlockedFreeHoldings[0]?.icon || matchingHoldings[0]?.icon || icon,
        bagQty,
        freeQty,
        sellableQty: availToSell,
        activeListedCount,
        activeListedQty,
        refPrice,
        medianPrice,
        cheapKnown,
        band,
        statusKey,
        statusLabel,
        ready
      });
    }

    return {
      canTradeMarket,
      tradeLockMsg,
      isPremium: isPrem,
      openSlotCount,
      maxSlots,
      freeSlots,
      taxPct,
      stackMax,
      readyCandidates,
      ruleStates,
      holdings
    };
  }

  function computeCMarketSmartUnitPrice(cand, cmState, cfg) {
    const rule = cand.rule || {};
    const strat = String(cfg?.priceStrategy || 'undercut_1');
    const band = Array.isArray(cand.band) && cand.band.length === 2 ? cand.band : [1, 99999999];
    const refPrice = Math.max(1, Number(cand.refPrice) || band[0] || 50);
    const key = `${cand.k}:${cand.id}`;
    const medPrice = Number(cmState?.med?.[key]?.median) || 0;

    // Collect current market listings for this exact item (excluding our own listings)
    const sheetRows = Array.isArray(cmState?.list)
      ? cmState.list.filter(l => l && l.itemId === cand.id && !l.mine && Number(l.n) > 0 && Number(l.price) > 0)
      : [];
    sheetRows.sort((a, b) => Number(a.price) - Number(b.price));

    const cardMatch = Array.isArray(cmState?.res?.cards)
      ? cmState.res.cards.find(c => c && (c.key === key || c.itemId === cand.id))
      : null;
    const cheapFromCard = Number(cardMatch?.cheapest || cmState?.cheap?.[key] || 0);

    let chosen = refPrice;
    if (Number(rule.customPrice) > 0) {
      chosen = Math.round(Number(rule.customPrice));
    } else if (strat === 'band_max') {
      chosen = band[1];
    } else if (strat === 'median') {
      chosen = medPrice > 0 ? Math.round(medPrice) : refPrice;
    } else if (strat === 'lowest') {
      if (sheetRows.length > 0) {
        chosen = Number(sheetRows[0].price);
      } else if (cheapFromCard > 0) {
        chosen = cheapFromCard;
      } else {
        chosen = medPrice > 0 ? Math.round(medPrice) : refPrice;
      }
    } else {
      // 'undercut_1': ตัดราคาต่ำสุด 1 เหรียญ พร้อมระบบป้องกันราคาล่อ (Anti-Bait Protection)
      if (sheetRows.length >= 2) {
        const p0 = Number(sheetRows[0].price);
        const p1 = Number(sheetRows[1].price);
        const anchor = medPrice > 0 ? medPrice : Math.max(p1, refPrice);
        // If lowest listing p0 is abnormally cheap (< 65% of 2nd lowest p1 or < 55% of median/ref), skip bait and undercut p1!
        const refLowest = (p0 < p1 * 0.65 || (anchor > 0 && p0 < anchor * 0.55)) ? p1 : p0;
        chosen = Math.max(1, refLowest - 1);
      } else if (sheetRows.length === 1) {
        const p0 = Number(sheetRows[0].price);
        const anchor = medPrice > 0 ? medPrice : refPrice;
        const refLowest = (anchor > 0 && p0 < anchor * 0.55) ? anchor : p0;
        chosen = Math.max(1, Math.round(refLowest) - 1);
      } else if (cheapFromCard > 0) {
        chosen = Math.max(1, cheapFromCard - 1);
      } else {
        chosen = medPrice > 0 ? Math.round(medPrice) : refPrice;
      }
    }

    // Always clamp strictly to Nightcamp's FairTrade band [band[0], band[1]] so the server never rejects the listing!
    return Math.max(band[0], Math.min(band[1], Math.max(1, Math.round(chosen))));
  }

  function tryWarpOrWalkToMap(game, targetMapId, spot, stateObj) {
    const NC = window.NC;
    const p = game.player;
    if (!targetMapId || targetMapId === 'auto' || (NC?.MAPS && !NC.MAPS[targetMapId])) {
      targetMapId = getBestAutoFarmMapForLevel(p, game);
      if (spot && typeof spot === 'object') {
        spot = Object.assign({}, spot, { map: targetMapId, name: NC?.MAPS?.[targetMapId]?.name || targetMapId });
      }
    }
    if (!targetMapId || game.mapId === targetMapId) return true;

    const nowMs = Date.now();
    const wCost = getMapWarpCost(targetMapId);
    const isVisited = isMapVisitedForWarp(targetMapId);
    // In Auto-Farm Lv.20 mode, only use warps that cost 0 coins (e.g. free camp warp); walk via portals otherwise to save coins!
    const zeroSpend = Boolean(window.__autoFarmLv20Config?.enabled);
    const canAffordWarp = isVisited && (wCost === null ? !zeroSpend : (zeroSpend ? wCost === 0 : (p.coins || 0) >= wCost));

    // 1. Try warping first if visited & affordable (retries every 1.65s up to 3 times in case travelT 1.5s cooldown or bridge queue was busy)
    if (canAffordWarp && NC.Econ?.warp) {
      if (!stateObj.warpFirstCheckAt) {
        stateObj.warpFirstCheckAt = nowMs;
      }
      if (!stateObj.warpTriedAt || (nowMs - stateObj.warpTriedAt >= 1650 && (stateObj.warpAttempts || 0) < 3)) {
        const sent = NC.Econ.warp(game, targetMapId, { auto: true });
        if (sent) {
          stateObj.warpTriedAt = nowMs;
          stateObj.warpAttempts = (stateObj.warpAttempts || 0) + 1;
          return false;
        }
      }
      // Wait up to 6.5s for queued warp to drain and land before falling back to walking on foot
      const waitAnchor = stateObj.warpTriedAt || stateObj.warpFirstCheckAt || nowMs;
      if (nowMs - waitAnchor < 6500) {
        return false;
      }
    }

    // 2. Fallback to walking via NC.Travel.go (IMPORTANT: when walking to a whole map without specific x/y, set x:0, y:0, r:1e9 like NC.Journey.travel so arrive() fires as soon as we cross the portal!)
    if (NC.Travel?.go) {
      if (!NC.Travel.on || NC.Travel.target?.map !== targetMapId) {
        const dest = Object.assign({ map: targetMapId, name: NC.MAPS?.[targetMapId]?.name || targetMapId }, spot || {});
        if (dest.x == null || dest.y == null) {
          dest.x = 0;
          dest.y = 0;
          dest.r = 1e9;
        }
        NC.Travel.go(game, dest);
      }
    }
    return false;
  }

  function runAutoSellTripTick(game, p) {
    const NC = window.NC;
    if (!NC || !game || !p) return false;

    syncInGamePotionPreferences(p);

    const sc = window.__sellConfig || DEFAULT_SELL_CFG;
    const cmCfg = window.__cmarketAutoSellConfig || DEFAULT_CMARKET_AUTOSELL_CFG;
    const wtPct = NC.Weight?.of ? (NC.Weight.of(p)?.pct || 0) : 0;
    const threshold = Math.max(40, Math.min(85, Number(sc.weightThreshold || window.__autoSellWeightPct) || 65));
    const serverHeavy = Boolean(NC.OnlineWeight?.band && NC.OnlineWeight.band() >= 2);
    const potCfg = window.__potionConfig || DEFAULT_POTION_CFG;
    const rawPotDue = (Date.now() - lastPotionNoFundsAt >= 90000) ? checkPotionRestockNeeded(p, false) : null;
    const potDueReason = (rawPotDue && canAffordPotionRestockNow(game, p)) ? rawPotDue : null;
    const weightDue = Boolean(window.__autoSellEnabled && (wtPct >= threshold || serverHeavy) && Date.now() - lastUnsellableHeavyAt >= 180000);
    const cmEvalPre = (cmCfg.enabled || forceCMarketTripRequested) ? evaluateCMarketAutoSellRules(p) : null;
    const cmarketDue = Boolean(
      cmCfg.enabled &&
      cmEvalPre &&
      cmEvalPre.canTradeMarket &&
      cmEvalPre.freeSlots > 0 &&
      cmEvalPre.readyCandidates.length > 0 &&
      Date.now() - lastCMarketAutoTripAt >= 75000
    );
    let repairDueReason = null;
    if (sc.autoRepair !== false && !window.__autoFarmLv20Config?.enabled && (Date.now() - lastRepairNoFundsAt >= 90000)) {
      const repSum = getEquipmentRepairSummary(p);
      const repThresh = Math.max(0, Math.min(80, Number(sc.repairThresholdPct ?? 25)));
      if (repSum.quoteCount > 0 && repSum.minPct !== null && (repThresh > 0 ? repSum.minPct <= repThresh : repSum.minPct <= 0)) {
        const knownVault = (typeof NC.PremiumOnline?.state?.()?.vault?.coins === 'number')
          ? NC.PremiumOnline.state().vault.coins
          : (typeof window.__lastKnownVaultCoins === 'number' ? window.__lastKnownVaultCoins : null);
        const totalAvail = (p.coins || 0) + (knownVault !== null ? knownVault : 999999);
        if (totalAvail >= repSum.quoteCoins) {
          repairDueReason = `🔨 ซ่อมอุปกรณ์ (${repSum.worstName || 'อุปกรณ์'} ทน ${repSum.minPct}% · ค่าซ่อม ${repSum.quoteCoins.toLocaleString()}g)`;
        }
      }
    }

    // Start a new Camp Trip when bag weight >= threshold OR potions < min OR repair durability <= threshold OR Central Market Auto-Sell items are ready OR manual button clicked
    if (!autoSellTrip) {
      if (p.dead > 0) return false;
      const isManualPot = forcePotionTripRequested;
      const isManualSell = forceSellTripRequested;
      const isManualCMarket = forceCMarketTripRequested;
      const isManualRepair = forceRepairTripRequested;
      const isManual = isManualPot || isManualSell || isManualCMarket || isManualRepair;
      if (!isManual && !weightDue && !potDueReason && !cmarketDue && !repairDueReason) return false;
      if (!isManual && Date.now() - lastAutoSellDoneAt < 30000) return false;
      if (!canStartAutoSellHere(game, isManual || game.mapId === 'camp' || cmarketDue || Boolean(repairDueReason))) return false;

      const skipPotBuy = Boolean(skipPotionBuyOnNextTrip || window.__autoFarmLv20Config?.enabled);
      skipPotionBuyOnNextTrip = false;
      forcePotionTripRequested = false;
      forceSellTripRequested = false;
      forceCMarketTripRequested = false;
      forceRepairTripRequested = false;
      if (isManualCMarket || cmarketDue) lastCMarketAutoTripAt = Date.now();
      const fallbackMap = window.__planActiveTargetMap || lastDeathMap || getBestAutoFarmMapForLevel(p, game);
      const returnMap = (window.__planScriptEnabled && window.__planActiveTargetMap)
        ? window.__planActiveTargetMap
        : ((!window.__smartAutoQuestEnabled && !window.__planScriptEnabled && window.__targetFarmMap && window.__targetFarmMap !== 'auto')
            ? window.__targetFarmMap
            : (game.mapId !== 'camp' ? game.mapId : fallbackMap));

      autoSellTrip = {
        stage: 'to_camp',
        reason: isManualRepair
          ? '🔨 สั่งกลับค่ายไปซ่อมอุปกรณ์ทันที'
          : (isManualCMarket
              ? '🏪 สั่งกลับค่ายไปลงขายตลาดกลางทันที'
              : (isManualSell
                  ? 'สั่งกลับค่ายขายของ/ฝากคลัง'
                  : (isManualPot
                      ? 'สั่งคราฟ/ซื้อยาทันที'
                      : (cmarketDue
                          ? `🏪 นำของไปลงขายตลาดกลาง (${cmEvalPre.readyCandidates.length} รายการ)`
                          : (repairDueReason
                              ? repairDueReason
                              : (potDueReason ? `เติมยา (${potDueReason})` : `น้ำหนักกระเป๋า ${wtPct}%`)))))),
        forceSell: isManualSell,
        forceCMarket: isManualCMarket || cmarketDue,
        forceRepair: isManualRepair || Boolean(repairDueReason),
        skipPotions: skipPotBuy,
        returnMap,
        returnPos: game.mapId !== 'camp' ? [Math.round(p.x), Math.round(p.y)] : null,
        startWeight: wtPct,
        startedAt: Date.now(),
        stepAt: 0,
        tradeStep: 0,
        brewTries: 0,
        warpTriedAt: 0,
        warpAttempts: 0,
        soldMats: 0,
        soldGear: 0,
        storedGear: 0,
        brewedPots: 0,
        boughtPots: 0,
        listedCMarket: 0,
        cmStep: 0,
        cmTriedKeys: {}
      };
      try {
        if (NC.QuestAuto?.on) NC.QuestAuto.stop?.(autoSellTrip.reason + ' · วาร์ปกลับค่าย');
        if (NC.Auto?.on) NC.Auto.stop ? NC.Auto.stop(game) : NC.Auto.toggle(game);
      } catch (_) {}
    }

    const t = autoSellTrip;
    // Safety timeout (95s max for an entire camp round)
    if (Date.now() - t.startedAt > 95000 || p.dead > 0) {
      autoSellTrip = null;
      lastAutoSellDoneAt = Date.now();
      return false;
    }

    // STAGE 1: Warp or walk to Camp -> Uncle Coco
    if (t.stage === 'to_camp') {
      const coco = NC.Shop?.npc;
      const cocoSpot = coco ? { map: 'camp', x: coco.x - 30, y: coco.y + 80, r: 75, name: 'ลุงโกโก้' } : { map: 'camp', name: 'ค่ายกลางป่า' };
      setPlanTaskStatus(`🏕️ ${t.reason}: กำลังวาร์ป/เดินกลับค่ายไปหาลุงโกโก้...`);

      if (game.mapId !== 'camp') {
        tryWarpOrWalkToMap(game, 'camp', cocoSpot, t);
        return true;
      }

      // In camp: walk up to Uncle Coco until NC.Shop.canTrade(game) is true
      if (NC.Shop?.canTrade && NC.Shop.canTrade(game)) {
        if (NC.Travel?.on) { try { NC.Travel.stop?.(''); } catch (_) {} }
        t.stage = 'trade';
        t.tradeStep = 0;
        t.stepAt = Date.now() + 250;
        return true;
      }

      if (coco) {
        const d = Math.hypot(p.x - coco.x, p.y - coco.y);
        if (d > 85 && (!NC.Travel?.on || NC.Travel.target?.name !== 'ลุงโกโก้')) {
          NC.Travel?.go?.(game, cocoSpot);
        }
      }
      return true;
    }

    // STAGE 2: Trade with Uncle Coco
    // Strict User-Requested Camp Order:
    //   Step 0: Equip Smart Gear + Open Shared Vault (`คลังร่วมไอดี`) & withdraw coins if `p.coins` is short for potion crafting
    //   Step 1: ⚗️ Craft / Brew Potions FIRST (`คราฟยาก่อนเป็นอันดับแรก` — using monster junk while all materials are still in bag!)
    //   Step 2: 💰 Sell Junk Gear & Remaining Monster Materials (`ขายของและขยะมอนที่เหลือ`)
    //   Step 22 (2a): 🏪 Central Market Auto-Sell (`วางขายของลงตลาดกลางอัตโนมัติ + รับเงินจดหมาย`)
    //   Step 25 (2b): 🧪 Second Brew / Fallback Buy (only buys from Uncle Coco if brewable junk is exhausted!)
    //   Step 3: 📦 Deposit Remaining Materials & Spare Gear into Camp Storage (`เก็บของเข้าคลังแคมป์`)
    //   Step 4: 🏦 Deposit Excess Coins into Shared Vault (`ฝากเงินเข้าคลังร่วม` leaving exact `keepCoinsOnHand`, e.g. 1,000 coins)
    if (t.stage === 'trade') {
      if (Date.now() < t.stepAt) return true;
      const backWarpCost = getMapWarpCost(t.returnMap) || 30;
      const fixCost = (sc.autoRepair !== false && NC.DurUI?.quote) ? (NC.DurUI.quote()?.coins || 0) : 0;
      const reserveCoins = Math.max(100, backWarpCost + fixCost + 60);

      if (t.tradeStep === 0) {
        // Step 0: Equip best gear + Free Class-Change Skill Reset (if due) + Open Shared Vault & withdraw coins if needed
        if (window.__smartGearEnabled && !t.smartGearChecked) {
          t.smartGearChecked = true;
          try { runSmartGearTick(game, p, true); } catch (_) {}
        }

        const activePlan = window.__currentScriptPlan || DEFAULT_NC_WOLF_PLAN;
        if (NC.OnlineWorld?.skillResetPending?.()) {
          t.stepAt = Date.now() + 450;
          return true;
        }
        if (t.waitingForSkillResetSettle) {
          t.waitingForSkillResetSettle = false;
          try {
            runAutoStatAndSkill(game, p, activePlan);
            syncOptimalHotbar(game, p, activePlan, true);
          } catch (_) {}
          t.stepAt = Date.now() + 900;
          return true;
        }
        if (!t.skillResetDone && shouldAutoResetSkillAfterClassChange(p, activePlan)) {
          t.skillResetDone = true;
          const curJobLow = String(p.job || '').toLowerCase();
          pendingFreeClassSkillResetJob = '';
          let planSt = null;
          try { planSt = loadPlanState(activePlan); } catch (_) {}
          const pendingRound = planSt ? (Number(planSt.pendingSkillResetRound) || 0) : 0;
          const useGoldPromo = Boolean(planSt?.pendingSkillResetMode === 'gold' && NC.skillResetPromo?.(p));
          try { localStorage.setItem(`pelican_autoreset_job_${p.name || 'hero'}`, curJobLow); } catch (_) {}
          const didReset = typeof NC.resetSkills === 'function' && (
            useGoldPromo
              ? (NC.resetSkills(game) || NC.resetSkills(game, { ticket: true }))
              : (NC.resetSkills(game, { ticket: true }) || NC.resetSkills(game))
          );
          if (didReset || ((NC.skillPoints?.(p) || 0) - (NC.skillLeft?.(p) || 0) <= 0)) {
            if (planSt && pendingRound > 0) {
              planSt.activeSkillResetRound = pendingRound;
              planSt.pendingSkillResetRound = 0;
              try { savePlanState(activePlan, planSt); } catch (_) {}
            }
            const roundTag = pendingRound > 0 ? `[รีสกิล #${pendingRound}]` : '[รีสกิลฟรีหลังเปลี่ยนคลาส]';
            setPlanTaskStatus(`🔄 ${roundTag} รีเซ็ตสกิลอาชีพ ${NC.JOBS?.[p.job]?.name || p.job} ที่ลุงโกโก้ กำลังอัปสกิลชุดใหม่...`);
            t.waitingForSkillResetSettle = true;
            t.stepAt = Date.now() + 650;
            return true;
          }
        }

        const hpId = resolveSelectedPotionId(p, 'red', potCfg.hpSize);
        const spId = resolveSelectedPotionId(p, 'blue', potCfg.spSize);
        let neededBrewCoins = 0;
        if (!t.skipPotions && potCfg.preferCraft !== false && NC.Brew?.plan) {
          if (potCfg.hpEnabled) {
            const needHp = Math.max(0, (Number(potCfg.hpTarget) || 100) - getPotionCountById(p, hpId));
            if (needHp >= 5) {
              const P = NC.Brew.plan(p, hpId, Math.max(1, Math.ceil(needHp / 10)));
              if (P) neededBrewCoins += (Number(P.coins) || 0);
            }
          }
          if (potCfg.spEnabled) {
            const needSp = Math.max(0, (Number(potCfg.spTarget) || 60) - getPotionCountById(p, spId));
            if (needSp >= 5) {
              const P = NC.Brew.plan(p, spId, Math.max(1, Math.ceil(needSp / 10)));
              if (P) neededBrewCoins += (Number(P.coins) || 0);
            }
          }
        }

        const keepOnHand = Math.max(0, Number(sc.keepCoinsOnHand ?? 1000));
        const desiredStartCoins = Math.max(
          sc.storeCoinsEnabled ? (keepOnHand + reserveCoins) : reserveCoins,
          neededBrewCoins + reserveCoins + 250
        );
        const needVaultOpen = Boolean(
          NC.OnlineWorld?.ready &&
          (sc.storeCoinsEnabled || cmCfg.enabled || t.forceCMarket || (p.coins || 0) < desiredStartCoins)
        );
        if (needVaultOpen && !t.vaultOpened) {
          t.vaultOpened = true;
          try { NC.OnlineWorld.send({ action: 'vault', kind: 'open' }); } catch (_) {}
          t.stepAt = Date.now() + 1100;
          setPlanTaskStatus('🏦 กำลังเปิดคลังร่วมไอดีเพื่อเช็คยอดเหรียญก่อนคราฟยา...');
          return true;
        }

        const vault = NC.PremiumOnline?.state?.()?.vault;
        if (vault && typeof vault.coins === 'number') {
          window.__lastKnownVaultCoins = vault.coins;
        }

        if (!t.withdrewForBrew && (p.coins || 0) < desiredStartCoins && vault && (vault.coins || 0) > 0 && !window.__autoFarmLv20Config?.enabled) {
          t.withdrewForBrew = true;
          const shortfall = desiredStartCoins - (p.coins || 0);
          const withdrawAmt = Math.min(vault.coins | 0, Math.max(100, shortfall));
          if (withdrawAmt > 0) {
            try { NC.OnlineWorld?.send?.({ action: 'vault', kind: 'coinsOut', coins: withdrawAmt }); } catch (_) {}
            t.withdrewCoins = (t.withdrewCoins || 0) + withdrawAmt;
            setPlanTaskStatus(`🏦 เหรียญติดตัวต่ำกว่าเกณฑ์ ➔ ถอนจากคลังร่วม +${withdrawAmt.toLocaleString()} เหรียญ...`);
            t.tradeStep = 1;
            t.stepAt = Date.now() + 1200;
            return true;
          }
        }

        t.tradeStep = 1;
        t.stepAt = Date.now() + 150;
        return true;
      }

      if (t.tradeStep === 1) {
        // Step 1: ⚗️ Craft / Brew Potions FIRST (using valid server batch counts [10, 5, 1] and waiting for snapshot confirmation!)
        if (t.pendingBrew) {
          const curQty = getPotionCountById(p, t.pendingBrew.potId);
          const elapsed = Date.now() - t.pendingBrew.sentAt;
          if (curQty > t.pendingBrew.beforeQty) {
            if (elapsed < 1200) {
              t.stepAt = Date.now() + (1200 - elapsed);
              return true;
            }
            t.pendingBrew = null;
          } else if (elapsed < 2800) {
            t.stepAt = Date.now() + 250;
            return true;
          } else {
            t.pendingBrew = null;
          }
        }

        if (!t.skipPotions && potCfg.preferCraft !== false && NC.Brew?.plan && (t.brewTries || 0) < 16) {
          const hpId = resolveSelectedPotionId(p, 'red', potCfg.hpSize);
          const spId = resolveSelectedPotionId(p, 'blue', potCfg.spSize);
          const orders = [];
          if (potCfg.hpEnabled) {
            const needHp = Math.max(0, (Number(potCfg.hpTarget) || 100) - getPotionCountById(p, hpId));
            if (needHp >= 5) orders.push({ id: hpId, need: needHp });
          }
          if (potCfg.spEnabled) {
            const needSp = Math.max(0, (Number(potCfg.spTarget) || 60) - getPotionCountById(p, spId));
            if (needSp >= 5) orders.push({ id: spId, need: needSp });
          }
          let brewedThisStep = false;
          for (const ord of orders) {
            const wantBatches = Math.max(1, Math.ceil(ord.need / 10));
            let chosenBatch = 0;
            // IMPORTANT: Nightcamp server only accepts N_BREW = [1, 5, 10] (10, 50, or 100 bottles per brew)!
            for (const b of [10, 5, 1]) {
              if (b > wantBatches && b !== 1) continue;
              const P = NC.Brew.plan(p, ord.id, b);
              if (P && P.ok && (p.coins || 0) >= P.coins) {
                chosenBatch = b;
                break;
              }
            }
            if (chosenBatch > 0) {
              t.brewTries = (t.brewTries || 0) + 1;
              const beforeQty = getPotionCountById(p, ord.id);
              if (brewPotionBatchDirect(game, p, ord.id, chosenBatch)) {
                t.brewedPots += chosenBatch * 10;
                t.pendingBrew = { potId: ord.id, beforeQty, batches: chosenBatch, sentAt: Date.now() };
                brewedThisStep = true;
              }
              setPlanTaskStatus(`⚗️ [ขั้นที่ 1/5] ต้ม${getPotionLabelById(ord.id)} ×${chosenBatch * 10} ขวดจากขยะมอน (ประหยัด 50%)...`);
              t.stepAt = Date.now() + 600;
              break;
            }
          }
          if (brewedThisStep) return true;
        }
        t.tradeStep = 20;
        t.stepAt = Date.now() + 250;
        return true;
      }

      if (t.tradeStep === 2 || t.tradeStep === 20) {
        // Step 2a: 💰 Sell Junk Gear FIRST (separate from materials so NC.GEAR.sellMany's bridge pendingUntil lock never drops material sales!)
        if (window.__autoSellEnabled || t.forceSell) {
          const uids = getJunkGearUidsToSell(p);
          if (uids.length > 0 && NC.GEAR?.sellMany) {
            try {
              document.dispatchEvent(new Event('pointerdown'));
              const r = NC.GEAR.sellMany(game, uids) || {};
              t.soldGear += (r.n | 0) || uids.length;
            } catch (_) {}
          }
          t.tradeStep = 21;
          const waitGearMs = uids.length > 0 ? (1750 + uids.length * 260) : 120;
          t.stepAt = Date.now() + waitGearMs;
          if (uids.length > 0) {
            setPlanTaskStatus(`🛒 [ขั้นที่ 2/5] ขายอุปกรณ์ขยะ ${t.soldGear} ชิ้น (รอซิงค์เซิร์ฟเวอร์)...`);
          }
          return true;
        }
        t.tradeStep = 22;
        return true;
      }

      if (t.tradeStep === 21) {
        // Step 2b: 💰 Sell Monster Materials (after gear sale bridge lock has expired & after Step 1 brewing is complete!)
        if (window.__autoSellEnabled || t.forceSell) {
          const list = getMaterialsToSell(p, { afterBrew: true });
          for (const [id, n] of list) {
            try {
              const got = NC.Econ?.sell ? NC.Econ.sell(game, id, n) : 0;
              if (got > 0) {
                p.mats[id] = Math.max(0, (p.mats[id] | 0) - n);
                if (!p.mats[id]) delete p.mats[id];
                p.coins = (p.coins || 0) + got;
                t.soldMats += n;
              }
            } catch (_) {}
          }
          if (list.length > 0 && NC.saveGame) {
            try { NC.saveGame(game); } catch (_) {}
            setTimeout(() => {
              try { if (NC.saveGame) NC.saveGame(game); } catch (_) {}
            }, 950);
          }
          t.tradeStep = 22;
          // Wait for every material sale action (260ms each in online/world.js queue) to finish draining while still standing near Uncle Coco!
          const waitMatMs = list.length > 0 ? (1900 + list.length * 300) : 120;
          t.stepAt = Date.now() + waitMatMs;
          setPlanTaskStatus(`🛒 [ขั้นที่ 2/5] ขายอุปกรณ์ ${t.soldGear} ชิ้น · ขายขยะมอน ${t.soldMats} ชิ้น (${list.length} กอง)...`);
          return true;
        }
        t.tradeStep = 22;
        return true;
      }

      if (t.tradeStep === 22) {
        // Step 2a: 🏪 Central Market Auto-Sell (วางขายตลาดกลางอัตโนมัติ + รับเงินจดหมาย + ถอนของหมดเวลา)
        const shouldRunCM = Boolean((cmCfg.enabled || t.forceCMarket) && Array.isArray(cmCfg.rules) && cmCfg.rules.length > 0);
        if (!shouldRunCM) {
          t.tradeStep = 25;
          return true;
        }

        ensureFreeTradeRulesAcked(p);
        ensureCMarketHooksMounted();
        const cmState = (typeof NC.CMarket?.state === 'function') ? NC.CMarket.state() : null;

        // Sub-step 0: Refresh `mine` listings & claim sales revenue from mail
        if (!t.cmMineFetched) {
          t.cmMineFetched = true;
          try { NC.OnlineWorld?.send?.({ action: 'cmarket', kind: 'mine' }); } catch (_) {}
          if (cmCfg.autoClaimMail !== false) {
            try { NC.Online?.rpc?.('nc_mail_claim_all', {}).catch(() => {}); } catch (_) {}
          }
          setPlanTaskStatus('🏪 [ตลาดกลาง] กำลังซิงค์ชั้นวางของและรับเงินที่ขายได้จากจดหมาย...');
          t.stepAt = Date.now() + 700;
          return true;
        }

        // Sub-step 1: Unlist any expired listings so they return to bag and free up slots
        if (cmCfg.autoUnlistExpired !== false && !t.cmExpiredCleared && Array.isArray(cmState?.mine)) {
          t.cmExpiredCleared = true;
          const expired = cmState.mine.filter(l => l && l.id && l.state && l.state !== 'open');
          if (expired.length > 0) {
            for (const l of expired) {
              try { NC.OnlineWorld?.send?.({ action: 'cmarket', kind: 'unlist', listingId: l.id }); } catch (_) {}
            }
            setTimeout(() => {
              try { NC.OnlineWorld?.send?.({ action: 'cmarket', kind: 'mine' }); } catch (_) {}
            }, 450);
            setPlanTaskStatus(`🏪 [ตลาดกลาง] ถอนของหมดเวลา ${expired.length} รายการกลับเข้ากระเป๋า...`);
            t.stepAt = Date.now() + 900;
            return true;
          }
        }

        // Sub-step 2: If a candidate was just price-queried, compute smart price & list it now!
        if (t.cmPendingCand) {
          const cand = t.cmPendingCand;
          t.cmPendingCand = null;
          const unitPrice = computeCMarketSmartUnitPrice(cand, cmState, cmCfg);
          const totalGross = cand.sellQty * unitPrice;
          const dep = Math.max(1, Math.floor((totalGross * 2) / 100));
          const freeGold = (typeof NC.Bound?.free === 'function') ? (NC.Bound.free(p, 'gold') | 0) : (p.coins | 0);
          const vault = NC.PremiumOnline?.state?.()?.vault;

          // If freeGold is short for the 2% listing deposit, withdraw from Shared Vault first!
          if (freeGold < dep && vault && (vault.coins || 0) >= dep && !cand.__withdrewDeposit) {
            cand.__withdrewDeposit = true;
            t.cmPendingCand = cand;
            const wAmt = Math.min(vault.coins | 0, Math.max(100, dep + 250 - freeGold));
            try { NC.OnlineWorld?.send?.({ action: 'vault', kind: 'coinsOut', coins: wAmt }); } catch (_) {}
            setPlanTaskStatus(`🏦 ถอนเงินจากคลังร่วม +${wAmt.toLocaleString()}g เพื่อเป็นค่ามัดจำ 2% วางขายตลาดกลาง...`);
            t.stepAt = Date.now() + 850;
            return true;
          }

          if (freeGold >= dep) {
            try {
              NC.OnlineWorld?.send?.({
                action: 'cmarket',
                kind: 'list',
                price: unitPrice,
                thing: (cand.k === 'item' || cand.k === 'rune')
                  ? { k: cand.k, id: cand.id, u: cand.u }
                  : { k: cand.k, id: cand.id, n: cand.sellQty }
              });
              setTimeout(() => {
                try { NC.OnlineWorld?.send?.({ action: 'cmarket', kind: 'mine' }); } catch (_) {}
              }, 500);
            } catch (_) {}
            t.listedCMarket = (t.listedCMarket || 0) + 1;
            const logMsg = `✅ วางขาย ${cand.name} ×${cand.sellQty} (ชิ้นละ ${unitPrice.toLocaleString()}g · รวม ${totalGross.toLocaleString()}g)`;
            window.__cmarketAutoSellLastLog = logMsg;
            setPlanTaskStatus(`🏪 [ตลาดกลาง] ${logMsg}`);
            t.stepAt = Date.now() + 1150;
            return true;
          } else {
            window.__cmarketAutoSellLastLog = `⚠️ เหรียญไม่พอจ่ายค่ามัดจำ 2% (${dep.toLocaleString()}g) สำหรับ ${cand.name}`;
          }
        }

        // Sub-step 3: Evaluate remaining rules and pick next ready candidate
        const ev = evaluateCMarketAutoSellRules(p);
        if (!ev.canTradeMarket) {
          window.__cmarketAutoSellLastLog = `⚠️ ${ev.tradeLockMsg}`;
          t.tradeStep = 25;
          return true;
        }
        const nextCand = (ev.freeSlots > 0 && (t.listedCMarket || 0) < 12)
          ? ev.readyCandidates.find(c => {
              const cKey = `${c.k}:${c.id}:${c.u || 0}`;
              return !t.cmTriedKeys[cKey];
            })
          : null;

        if (nextCand) {
          const cKey = `${nextCand.k}:${nextCand.id}:${nextCand.u || 0}`;
          t.cmTriedKeys[cKey] = true;
          t.cmPendingCand = nextCand;
          try {
            NC.OnlineWorld?.send?.({
              action: 'cmarket',
              kind: 'find',
              find: { k: nextCand.k, ids: [nextCand.id], sort: 'price', page: 0 }
            });
          } catch (_) {}
          setPlanTaskStatus(`🔍 [ตลาดกลาง] กำลังเช็คราคาตลาดของ "${nextCand.name}" ก่อนตั้งขาย...`);
          t.stepAt = Date.now() + 680;
          return true;
        }

        t.tradeStep = 25;
        t.stepAt = Date.now() + 150;
        return true;
      }

      if (t.tradeStep === 25) {
        // Step 2b: 🧪 Post-Sell Brew (if Step 1 lacked coins before selling) or Fallback Buy (ONLY if no brewable junk left!)
        if (t.pendingBrew) {
          const curQty = getPotionCountById(p, t.pendingBrew.potId);
          const elapsed = Date.now() - t.pendingBrew.sentAt;
          if (curQty > t.pendingBrew.beforeQty) {
            if (elapsed < 1200) {
              t.stepAt = Date.now() + (1200 - elapsed);
              return true;
            }
            t.pendingBrew = null;
          } else if (elapsed < 2800) {
            t.stepAt = Date.now() + 250;
            return true;
          } else {
            t.pendingBrew = null;
          }
        }

        if (!t.skipPotions) {
          if (potCfg.preferCraft !== false && NC.Brew?.plan && (t.brewTries || 0) < 16) {
            const hpId = resolveSelectedPotionId(p, 'red', potCfg.hpSize);
            const spId = resolveSelectedPotionId(p, 'blue', potCfg.spSize);
            const orders = [];
            if (potCfg.hpEnabled) {
              const needHp = Math.max(0, (Number(potCfg.hpTarget) || 100) - getPotionCountById(p, hpId));
              if (needHp >= 5) orders.push({ id: hpId, need: needHp });
            }
            if (potCfg.spEnabled) {
              const needSp = Math.max(0, (Number(potCfg.spTarget) || 60) - getPotionCountById(p, spId));
              if (needSp >= 5) orders.push({ id: spId, need: needSp });
            }
            for (const ord of orders) {
              const wantBatches = Math.max(1, Math.ceil(ord.need / 10));
              let chosenBatch = 0;
              // Nightcamp server only accepts N_BREW = [1, 5, 10]
              for (const b of [10, 5, 1]) {
                if (b > wantBatches && b !== 1) continue;
                const P = NC.Brew.plan(p, ord.id, b);
                if (P && P.ok && (p.coins || 0) - P.coins >= reserveCoins) {
                  chosenBatch = b;
                  break;
                }
              }
              if (chosenBatch > 0) {
                t.brewTries = (t.brewTries || 0) + 1;
                const beforeQty = getPotionCountById(p, ord.id);
                if (brewPotionBatchDirect(game, p, ord.id, chosenBatch)) {
                  t.brewedPots += chosenBatch * 10;
                  t.pendingBrew = { potId: ord.id, beforeQty, batches: chosenBatch, sentAt: Date.now() };
                }
                setPlanTaskStatus(`⚗️ ต้ม${getPotionLabelById(ord.id)} ×${chosenBatch * 10} ขวด (ใช้เงินที่เพิ่งขายขยะ)...`);
                t.stepAt = Date.now() + 600;
                return true;
              }
            }
          }

          // Fallback Buy from Uncle Coco ONLY for potions whose brewable junk is exhausted (`P.short > 0`) or `preferCraft === false`
          if (NC.Shop?.buyPending) {
            t.stepAt = Date.now() + 400;
            return true;
          }
          const hpId = resolveSelectedPotionId(p, 'red', potCfg.hpSize);
          const spId = resolveSelectedPotionId(p, 'blue', potCfg.spSize);
          const buyPlan = [];
          if (potCfg.hpEnabled) buyPlan.push([hpId, Number(potCfg.hpTarget) || 100]);
          if (potCfg.spEnabled) buyPlan.push([spId, Number(potCfg.spTarget) || 60]);

          const vault = NC.PremiumOnline?.state?.()?.vault;
          let boughtAny = false;
          for (const [potId, wantQty] of buyPlan) {
            const curQty = getPotionCountById(p, potId);
            const deficit = wantQty - curQty;
            if (deficit < 5) continue;
            // If preferCraft is ON and we still have enough brewable junk for 1 batch, check if we need coins from Vault instead of buying!
            const P1 = (potCfg.preferCraft !== false && NC.Brew?.plan) ? NC.Brew.plan(p, potId, 1) : null;
            if (P1 && P1.short <= 0 && (p.coins || 0) < P1.coins + reserveCoins && vault && (vault.coins || 0) > 0 && !t.withdrewForBuy) {
              t.withdrewForBuy = true;
              const needCoins = Math.ceil(deficit / 10) * P1.coins + reserveCoins + 200 - (p.coins || 0);
              const wAmt = Math.min(vault.coins | 0, Math.max(100, needCoins));
              if (wAmt > 0) {
                try { NC.OnlineWorld?.send?.({ action: 'vault', kind: 'coinsOut', coins: wAmt }); } catch (_) {}
                t.withdrewCoins = (t.withdrewCoins || 0) + wAmt;
                setPlanTaskStatus(`🏦 ถอนเงินจากคลังร่วม +${wAmt.toLocaleString()} เหรียญ เพื่อต้มยาให้ครบ...`);
                t.stepAt = Date.now() + 900;
                return true;
              }
            }
            if (P1 && P1.ok && (p.coins || 0) - P1.coins >= reserveCoins && (t.brewTries || 0) < 16) {
              continue;
            }
            const itemDef = (NC.Shop?.POTIONS || []).find(q => q.id === potId);
            const price = (itemDef && itemDef.price) || 0;
            const totalBuyCost = deficit * price;
            if (price > 0 && (p.coins || 0) < totalBuyCost + reserveCoins && vault && (vault.coins || 0) > 0 && !t.withdrewForBuy) {
              t.withdrewForBuy = true;
              const wAmt = Math.min(vault.coins | 0, Math.max(100, totalBuyCost + reserveCoins + 200 - (p.coins || 0)));
              if (wAmt > 0) {
                try { NC.OnlineWorld?.send?.({ action: 'vault', kind: 'coinsOut', coins: wAmt }); } catch (_) {}
                t.withdrewCoins = (t.withdrewCoins || 0) + wAmt;
                setPlanTaskStatus(`🏦 ถอนเงินจากคลังร่วม +${wAmt.toLocaleString()} เหรียญ เพื่อซื้อยา...`);
                t.stepAt = Date.now() + 900;
                return true;
              }
            }
            const maxAffordable = price > 0 ? Math.floor(Math.max(0, (p.coins || 0) - reserveCoins) / price) : 0;
            const need = Math.min(100, deficit, maxAffordable);
            if (need >= 1 && ((t.potTries && t.potTries[potId]) || 0) < 4 && NC.Shop?.buy) {
              t.potTries = t.potTries || {};
              t.potTries[potId] = (t.potTries[potId] || 0) + 1;
              if (NC.Shop.buy(game, potId, need)) {
                t.boughtPots += need;
                boughtAny = true;
                setPlanTaskStatus(`🛒 ขยะมอนหมด ➔ ซื้อ${getPotionLabelById(potId)}จากลุงโกโก้ +${need} ขวด...`);
                break;
              }
            }
          }
          if (boughtAny) {
            t.stepAt = Date.now() + 1000;
            return true;
          }
        }
        t.tradeStep = 3;
        t.stepAt = Date.now() + 150;
        return true;
      }

      if (t.tradeStep === 3) {
        // Step 3: 📦 Store Remaining Materials, Seeds (sd_*) & Spare Gear into Camp Storage (AFTER crafting, NPC selling & Central Market listing!)
        let storedAnyMats = false;
        try {
          if (p.mats && NC.MatStore?.send) {
            // 3a. Always deposit seeds (`sd_*`) into Camp Storage via explicit `put` (since Nightcamp server rejects NPC sales of `sd_*` and `putall` skips `keep: true` items!)
            const seedIds = Object.keys(p.mats).filter(id =>
              (p.mats[id] | 0) > 0 &&
              /^sd_/.test(id) &&
              !isMaterialNeededByQuests(p, id) &&
              !isProtectedByCMarketAutoSell(id, NC.MATERIALS?.[id]?.name || NC.ITEMS?.[id]?.name)
            );
            for (const id of seedIds) {
              const q = p.mats[id] | 0;
              if (q > 0) {
                NC.MatStore.send('put', id, q);
                storedAnyMats = true;
              }
            }

            // 3b. Deposit remaining monster/life materials when `storeMats !== false`
            if (sc.storeMats !== false) {
              const storableIds = Object.keys(p.mats).filter(id =>
                (p.mats[id] | 0) > 0 &&
                /^(mat_|lf_|fs_|lc_)/.test(id) &&
                !(NC.MATERIALS?.[id]?.keep) &&
                !isMaterialNeededByQuests(p, id)
              );
              const hasProtectedCMarketMat = storableIds.some(id => isProtectedByCMarketAutoSell(id, NC.MATERIALS?.[id]?.name || NC.ITEMS?.[id]?.name));
              if (storableIds.length > 0) {
                if (!hasProtectedCMarketMat) {
                  NC.MatStore.send('putall');
                  storedAnyMats = true;
                } else {
                  for (const id of storableIds) {
                    if (isProtectedByCMarketAutoSell(id, NC.MATERIALS?.[id]?.name || NC.ITEMS?.[id]?.name)) continue;
                    const q = p.mats[id] | 0;
                    if (q > 0) {
                      NC.MatStore.send('put', id, q);
                      storedAnyMats = true;
                    }
                  }
                }
              }
            }
          }
          if (sc.storeGear === true) {
            t.storedGear += depositSpareGearToStorage(game, p);
          }
        } catch (_) {}
        t.tradeStep = 4;
        t.stepAt = Date.now() + ((storedAnyMats || t.storedGear > 0) ? 1200 : 150);
        setPlanTaskStatus(`📦 [ขั้นที่ 4/5] เก็บเมล็ดพันธุ์ วัตถุดิบ และอุปกรณ์เข้าคลังแคมป์ (อุปกรณ์ฝาก ${t.storedGear} ชิ้น)...`);
        return true;
      }

      if (t.tradeStep === 4) {
        // Step 4: 🏦 Deposit Excess Coins into Shared Vault (`ฝากเงินเข้าคลังร่วม` leaving exact `keepCoinsOnHand`)
        if (sc.storeCoinsEnabled && !window.__autoFarmLv20Config?.enabled && NC.OnlineWorld?.ready) {
          if (!t.vaultOpened) {
            t.vaultOpened = true;
            try { NC.OnlineWorld.send({ action: 'vault', kind: 'open' }); } catch (_) {}
            t.stepAt = Date.now() + 750;
            return true;
          }
          const vault = NC.PremiumOnline?.state?.()?.vault;
          const keepOnHand = Math.max(0, Number(sc.keepCoinsOnHand ?? 1000));
          const targetRemaining = keepOnHand + fixCost + backWarpCost;
          const freeCoins = (NC.Bound && typeof NC.Bound.free === 'function') ? (NC.Bound.free(p, 'gold') | 0) : (p.coins | 0);
          const excessCoins = Math.max(0, (p.coins | 0) - targetRemaining);
          const depositAmt = Math.min(freeCoins, excessCoins);
          if (depositAmt > 0 && (!vault || vault.premium !== false) && !t.depositedCoinsDone) {
            t.depositedCoinsDone = true;
            try { NC.OnlineWorld.send({ action: 'vault', kind: 'coinsIn', coins: depositAmt }); } catch (_) {}
            t.depositedCoins = (t.depositedCoins || 0) + depositAmt;
            if (typeof window.__lastKnownVaultCoins === 'number') {
              window.__lastKnownVaultCoins += depositAmt;
            }
            setPlanTaskStatus(`🏦 [ขั้นที่ 4/4] ฝากเงินเข้าคลังร่วม +${depositAmt.toLocaleString()} เหรียญ (เหลือเงินติดตัว ${keepOnHand.toLocaleString()} เหรียญ)...`);
            t.stepAt = Date.now() + 900;
            return true;
          }
        }
        if (t.vaultOpened && NC.OnlineWorld?.ready) {
          try { NC.OnlineWorld.send({ action: 'vault', kind: 'close' }); } catch (_) {}
        }
        t.stage = 'repair';
        t.stepAt = Date.now() + 200;
        return true;
      }
    }

    // STAGE 3: Repair worn equipment at Papa Muri if needed (with automatic Shared Vault withdrawal if on-hand coins are short)
    if (t.stage === 'repair') {
      if (Date.now() < t.stepAt) return true;
      const allowRepair = (sc.autoRepair !== false || t.forceRepair) && !window.__autoFarmLv20Config?.enabled;
      const quote = (allowRepair && NC.DurUI?.quote) ? NC.DurUI.quote() : { coins: 0, n: 0 };
      const forge = NC.Forge?.npc;
      const backWarpCost = getMapWarpCost(t.returnMap) || 30;
      const needCoinsForRepair = (quote?.coins || 0) + backWarpCost + 60;

      if (allowRepair && !t.repairDone && quote && quote.n > 0 && forge) {
        // If coins on hand are short for repair + return warp, open Shared Vault and withdraw coins first!
        if ((p.coins || 0) < needCoinsForRepair && NC.OnlineWorld?.ready) {
          if (!t.repairVaultOpened) {
            t.repairVaultOpened = true;
            try { NC.OnlineWorld.send({ action: 'vault', kind: 'open' }); } catch (_) {}
            setPlanTaskStatus(`🏦 เงินติดตัวไม่พอค่าซ่อม (${(quote.coins || 0).toLocaleString()}g) ➔ กำลังเปิดคลังร่วมเพื่อเบิกเงิน...`);
            t.stepAt = Date.now() + 850;
            return true;
          }
          const vault = NC.PremiumOnline?.state?.()?.vault;
          if (vault && typeof vault.coins === 'number') {
            window.__lastKnownVaultCoins = vault.coins;
          }
          if (!t.withdrewForRepair && vault && (vault.coins || 0) > 0) {
            t.withdrewForRepair = true;
            const shortfall = Math.max((quote.coins || 0) - (p.coins || 0), needCoinsForRepair - (p.coins || 0));
            const withdrawAmt = Math.min(vault.coins | 0, Math.max(100, shortfall + 100));
            if (withdrawAmt > 0) {
              try { NC.OnlineWorld.send({ action: 'vault', kind: 'coinsOut', coins: withdrawAmt }); } catch (_) {}
              t.withdrewCoins = (t.withdrewCoins || 0) + withdrawAmt;
              if (typeof window.__lastKnownVaultCoins === 'number') {
                window.__lastKnownVaultCoins = Math.max(0, window.__lastKnownVaultCoins - withdrawAmt);
              }
              setPlanTaskStatus(`🏦 เบิกเงินจากคลังร่วม +${withdrawAmt.toLocaleString()}g เพื่อนำมาซ่อมอุปกรณ์ (${(quote.coins || 0).toLocaleString()}g)...`);
              t.stepAt = Date.now() + 1050;
              return true;
            }
          }
        }

        if ((p.coins || 0) >= (quote.coins || 0)) {
          if (NC.DurUI?.near && !NC.DurUI.near(game)) {
            setPlanTaskStatus(`🔨 กำลังเดินไปซ่อมอุปกรณ์ ${quote.n} ชิ้น (${(quote.coins || 0).toLocaleString()}g) ที่ป๋าหมูหริ่ง...`);
            if (!NC.Travel?.on || NC.Travel.target?.name !== 'ป๋าหมูหริ่ง') {
              NC.Travel?.go?.(game, { map: 'camp', x: forge.x - 35, y: forge.y + 65, r: 50, name: 'ป๋าหมูหริ่ง' });
            }
            return true;
          }
          if (NC.Travel?.on) {
            try { NC.Travel.stop?.(''); } catch (_) {}
          }
          try { NC.DurUI?.repairAll?.(); } catch (_) {}
          if (t.repairVaultOpened && NC.OnlineWorld?.ready) {
            try { NC.OnlineWorld.send({ action: 'vault', kind: 'close' }); } catch (_) {}
          }
          t.repairDone = true;
          t.repairedCount = quote.n;
          t.repairedCoins = quote.coins || 0;
          setPlanTaskStatus(`🔨 ซ่อมอุปกรณ์ทั้งหมด ${quote.n} ชิ้น (${(quote.coins || 0).toLocaleString()}g) ที่ป๋าหมูหริ่งเรียบร้อย!`);
          t.stepAt = Date.now() + 900;
          return true;
        } else {
          lastRepairNoFundsAt = Date.now();
          setPlanTaskStatus(`⚠️ เงินติดตัวและในคลังร่วมไม่พอค่าซ่อม (${(quote.coins || 0).toLocaleString()}g) ➔ กลับไปฟาร์มต่อ...`);
        }
      }
      if (t.repairVaultOpened && NC.OnlineWorld?.ready) {
        try { NC.OnlineWorld.send({ action: 'vault', kind: 'close' }); } catch (_) {}
      }
      t.stage = 'return_map';
      t.warpTriedAt = 0;
      t.warpAttempts = 0;
      return true;
    }

    // STAGE 4: Warp or walk back to returnMap
    if (t.stage === 'return_map') {
      const destMap = (window.__planScriptEnabled && window.__planActiveTargetMap)
        ? window.__planActiveTargetMap
        : ((!window.__smartAutoQuestEnabled && !window.__planScriptEnabled && window.__targetFarmMap && window.__targetFarmMap !== 'auto')
            ? window.__targetFarmMap
            : (t.returnMap && t.returnMap !== 'camp' ? t.returnMap : 'farm'));
      const mapTitle = NC.MAPS?.[destMap]?.name || destMap;
      setPlanTaskStatus(`🚀 เสร็จภารกิจในค่าย (ต้มยา ${t.brewedPots} · ซื้อยา ${t.boughtPots} · ขายของ ${t.soldGear + t.soldMats}) ➔ วาร์ปกลับ ${mapTitle}...`);

      if (game.mapId !== destMap) {
        const spot = (destMap === t.returnMap && t.returnPos)
          ? { map: destMap, x: t.returnPos[0], y: t.returnPos[1], r: 100, name: mapTitle }
          : { map: destMap, name: mapTitle };
        tryWarpOrWalkToMap(game, destMap, spot, t);
        return true;
      }

      // Arrived back on the farming map!
      const newWtPct = NC.Weight?.of ? (NC.Weight.of(p)?.pct || 0) : 0;
      if (newWtPct >= threshold) {
        lastUnsellableHeavyAt = Date.now();
      }
      if (checkPotionRestockNeeded(p, false)) {
        // Still below min potions after trip -> cooldown 90s before retrying
        lastPotionNoFundsAt = Date.now();
      }
      lastAutoSellDoneAt = Date.now();
      autoSellTrip = null;
      return false;
    }

    return false;
  }

  // ============================================================================
  // 3D. 🗺️ TARGET FARM MAP & AUTO-RETURN ON DEATH (WHEN SMART AUTO-QUEST IS OFF)
  // ============================================================================
  const targetMapWarpState = { map: '', warpTriedAt: 0, warpAttempts: 0 };

  function getBestAutoFarmMapForLevel(p, game) {
    const NC = window.NC;
    if (NC?.QuestAuto?.levelMap) {
      try {
        const m = NC.QuestAuto.levelMap(p);
        if (m && m !== 'camp') return m;
      } catch (_) {}
    }
    const lv = Number(p?.lv) || 1;
    if (lv < 8) return 'farm';
    if (lv < 16) return 'meadow';
    if (lv < 22) return 'marsh';
    if (lv < 30) return 'graveyard';
    if (lv < 40) return 'woods';
    return (game?.mapId && game.mapId !== 'camp') ? game.mapId : 'burnt';
  }

  const LEGACY_TO_NIGHTCAMP_MAP = {
    prt_fild08: 'farm',
    prt_sewb1: 'batcave',
    pay_fild08: 'meadow',
    pay_dun00: 'graveyard',
    anthell01: 'antmine1',
    anthell02: 'antmine2',
    moc_pryd01: 'woods',
    orcsdun01: 'burnt',
    iz_dun02: 'crypt1',
    gl_knt01: 'avalanche'
  };

  function resolveNightcampMapId(rawTarget, p, game) {
    const NC = window.NC;
    const raw = String(rawTarget || '').trim();
    if (!raw || raw.toLowerCase() === 'auto' || raw.includes('ที่ล่าตามเลเวล')) {
      return getBestAutoFarmMapForLevel(p, game);
    }
    const low = raw.toLowerCase();
    if (LEGACY_TO_NIGHTCAMP_MAP[low]) return LEGACY_TO_NIGHTCAMP_MAP[low];
    if (NC?.MAPS?.[raw]) return raw;
    if (NC?.MAPS?.[low]) return low;

    // Extract `(mapId)` from labels like `[Lv.8-18] ทุ่งหญ้าแสงจันทร์ (meadow)`
    const parenMatch = /\(([a-z0-9_]+)\)\s*$/i.exec(raw);
    if (parenMatch) {
      const mId = parenMatch[1].toLowerCase();
      if (mId !== 'auto' && (NC?.MAPS?.[mId] || STATIC_FARM_MAP_OPTIONS.some(([id]) => id === mId))) {
        return mId;
      }
    }

    // Match against NC.MAPS Thai name or STATIC_FARM_MAP_OPTIONS label
    if (NC?.MAPS) {
      for (const [id, M] of Object.entries(NC.MAPS)) {
        if (!M || M.camp || id === 'camp' || id === 'puppetroom') continue;
        const mName = String(M.name || '').trim().toLowerCase();
        if (mName && (mName === low || mName.includes(low) || low.includes(mName))) {
          return id;
        }
      }
    }
    for (const [id, label] of STATIC_FARM_MAP_OPTIONS) {
      if (id === 'auto') continue;
      if (id.toLowerCase() === low || label.toLowerCase().includes(low)) {
        return id;
      }
    }
    return getBestAutoFarmMapForLevel(p, game);
  }

  function runSpecificFarmMapTick(game, p, rawTargetMap, targetMon, statusPrefix) {
    const NC = window.NC;
    if (!NC || !game || !p) return;

    if (p.dead > 0) {
      setPlanTaskStatus('💀 ตัวละครตาย · รอฟื้นที่ค่ายแล้วจะวาร์ป/เดินกลับแมพฟาร์มอัตโนมัติ...');
      return;
    }

    const desiredMap = resolveNightcampMapId(rawTargetMap, p, game);
    const mapTitle = NC.MAPS?.[desiredMap]?.name || desiredMap;
    const wtPct = NC.Weight?.of ? (NC.Weight.of(p)?.pct || 0) : 0;
    const prefix = statusPrefix || 'ฟาร์มแมพประจำ';

    if (NC.QuestAuto?.on && !NC.QuestAuto?.life) {
      try { NC.QuestAuto.stop?.(`${prefix}: ${mapTitle}`); } catch (_) {}
    }

    if (game.mapId !== desiredMap) {
      if (NC.Auto?.on) {
        try { NC.Auto.stop ? NC.Auto.stop(game) : NC.Auto.toggle(game); } catch (_) {}
      }
      if (targetMapWarpState.map !== desiredMap) {
        targetMapWarpState.map = desiredMap;
        targetMapWarpState.warpTriedAt = 0;
        targetMapWarpState.warpAttempts = 0;
      }
      tryWarpOrWalkToMap(game, desiredMap, { map: desiredMap, name: mapTitle }, targetMapWarpState);
      setPlanTaskStatus(`🗺️ กำลังวาร์ป/เดินไป${prefix}: ${mapTitle} (${desiredMap})`);
      return;
    }

    // We are on the Target Farm Map! Reset warp state and start farming
    targetMapWarpState.map = '';
    targetMapWarpState.warpTriedAt = 0;
    targetMapWarpState.warpAttempts = 0;

    const enemiesHere = (game.enemies || []).filter(e => e && !e.dead && e.hp > 0 && !e.dummy && !e.npc);
    if (targetMon) {
      const wantLow = String(targetMon).trim().toLowerCase();
      const matchingTypes = new Set();
      for (const e of enemiesHere) {
        const mInfo = NC.MONSTERS?.[e.type] || {};
        const eType = String(e.type || '').toLowerCase();
        const eName = String(e.name || mInfo.name || '').toLowerCase();
        if (eType === wantLow || eName.includes(wantLow) || wantLow.includes(eName)) {
          matchingTypes.add(e.type);
        }
      }
      if (matchingTypes.size > 0 && Array.isArray(NC.Auto?.set?.off)) {
        NC.Auto.set.off = NC.Auto.set.off.filter(t => !matchingTypes.has(t));
      }
    } else if (Array.isArray(NC.Auto?.set?.off) && NC.Auto.set.off.length > 0) {
      const offSet = new Set(NC.Auto.set.off);
      if (enemiesHere.length === 0 || !enemiesHere.some(e => !offSet.has(e.type))) {
        NC.Auto.set.off = [];
        try { NC.Auto.saveSet?.(); } catch (_) {}
      }
    }

    if (NC.Auto && !NC.Auto.on && !NC.Travel?.on) {
      if (typeof NC.Auto.toggle === 'function') NC.Auto.toggle(game);
    }
    const chNow = window.getCurrentChannel();
    setPlanTaskStatus(`⚔️ ${prefix}: ${mapTitle} (${desiredMap})${chNow ? ' · CH.' + chNow : ''}${targetMon ? ' [' + targetMon + ']' : ''} · นน.${wtPct}%`);
  }

  function runTargetFarmMapTick(game, p) {
    const NC = window.NC;
    if (!NC || !game || !p) return;
    const sel = String(window.__targetFarmMap || 'auto').trim() || 'auto';
    const desiredMap = sel === 'auto'
      ? ((game.mapId && game.mapId !== 'camp' && !(NC.Auto?.nothingHere?.(game.mapId)))
          ? game.mapId
          : (lastDeathMap && lastDeathMap !== 'camp' ? lastDeathMap : getBestAutoFarmMapForLevel(p, game)))
      : sel;
    runSpecificFarmMapTick(game, p, desiredMap, null, 'ฟาร์มแมพประจำ');
  }

  // ============================================================================
  // 3E. 🌾 AUTO-FARM LV.20 & AUTO-TRADE ENGINE (MAIL CLAIM + EXP BOOST + ZERO-SPEND + TRADE TO MAIN)
  // ============================================================================
  let lastMailClaimTryAt = 0;
  let lastBoostUseTryAt = 0;
  let lastRewardClaimTryAt = 0;
  let lastCheckinLoadTryAt = 0;
  let lastChannelSwitchTryAt = 0;
  let lastTradeActionTryAt = 0;
  const afWarpState = { map: '', warpTriedAt: 0, warpAttempts: 0 };

  function ensureFreeTradeRulesAcked(p) {
    try {
      const NC = window.NC;
      const who = (NC?.Online && NC.Online.userId) || (p && p.id) || '-';
      const acks = JSON.parse(localStorage.getItem('nightcamp.ftack.v1') || '{}');
      if (!acks[who] || !acks['-']) {
        acks[who] = 1;
        acks['-'] = 1;
        localStorage.setItem('nightcamp.ftack.v1', JSON.stringify(acks));
      }
    } catch (_) {}
  }

  function runAutoMailClaimAndExpBoosts(game, p) {
    const NC = window.NC;
    if (!NC || !game || !p) return;
    const nowMs = Date.now();
    const af = window.__autoFarmLv20Config || DEFAULT_AUTOFARM_LV20_CFG;

    // 1. Auto-claim all mail attachments (starter tickets, EXP/Job boost scrolls, campfire card, 15,000 coins)
    const unclaimedCount = (NC.MailWin?.unclaimed && typeof NC.MailWin.unclaimed === 'function') ? Number(NC.MailWin.unclaimed() || 0) : 0;
    if ((!af.mailClaimed || unclaimedCount > 0) && nowMs - lastMailClaimTryAt > 9000) {
      lastMailClaimTryAt = nowMs;
      try {
        if (NC.Online?.rpc) {
          NC.Online.rpc('nc_mail_claim_all', {}).then(() => {
            saveAutoFarmLv20Cfg({ mailClaimed: true });
          }).catch(() => {});
        } else if (NC.KMail?.claimAll) {
          NC.KMail.claimAll();
          saveAutoFarmLv20Cfg({ mailClaimed: true });
        }
      } catch (_) {}
    }

    // 2. Auto-claim all claimable rewards in Traveler's Book (สมุดนักเดินทาง: เควสรายวัน, หีบสัปดาห์, เช็คอิน, เควสอาชีพเสริม, หีบเดินทาง)
    if (nowMs - lastRewardClaimTryAt > 3500) {
      lastRewardClaimTryAt = nowMs;
      (() => {
        try {
          // 2a. Daily Quests (ล่าสไลม์ใบไม้, ส่งเจลใบไม้, ส่งประกายแดด, ฯลฯ)
          const dailyMap = NC.Quests?.state?.daily;
          if (dailyMap && typeof dailyMap === 'object' && typeof NC.Quests?.online === 'function') {
            for (const dk of Object.keys(dailyMap).sort().reverse()) {
              const list = dailyMap[dk];
              if (!Array.isArray(list)) continue;
              for (let i = 0; i < list.length; i++) {
                const d = list[i];
                if (!d || d.done) continue;
                const have = d.kind === 'hunt'
                  ? (Number(d.n) || 0)
                  : (typeof NC.matCount === 'function' ? NC.matCount(p, d.id) : (p.mats?.[d.id] || 0));
                if (have >= (Number(d.need) || 1)) {
                  NC.Quests.online('daily', game, dk, i);
                  return;
                }
              }
            }
            // 2b. Weekly Chest (หีบประจำสัปดาห์ เมื่อทำรายวันครบ 5 วัน)
            const wk = Math.floor((Date.now() / 86400000 + 3) / 7);
            const wkDays = (NC.Quests.state.week?.[wk] || []).length;
            const gotWk = Boolean(NC.Quests.state.week?.['got' + wk]);
            if (wkDays >= 5 && !gotWk) {
              NC.Quests.online('week', game);
              return;
            }
          }

          // 2c. Daily Check-in & Catchup Check-in (เช็คอินรายวัน)
          if (NC.Checkin) {
            if (!NC.Checkin.status && typeof NC.Checkin.load === 'function' && nowMs - lastCheckinLoadTryAt > 15000) {
              lastCheckinLoadTryAt = nowMs;
              try { NC.Checkin.load(); } catch (_) {}
            } else if (NC.Checkin.status && typeof NC.Checkin.claim === 'function') {
              if (typeof NC.Checkin.claimOff === 'function' && !NC.Checkin.claimOff()) {
                NC.Checkin.claim(false);
                return;
              }
              if (NC.Checkin.status.catchup?.ready) {
                NC.Checkin.claim(true);
                return;
              }
            }
          }

          // 2d. Life Skill Quests (เควสอาชีพเสริม: รับเควส & รับรางวัลอัตโนมัติเมื่อทำได้)
          if (NC.LifeQuests && typeof NC.LifeQuests.table === 'function' && typeof NC.LifeQuests.status === 'function' && typeof NC.LifeQuests.press === 'function') {
            const lqRows = NC.LifeQuests.table() || [];
            for (const r of lqRows) {
              if (!r) continue;
              const st = NC.LifeQuests.status(r, p);
              if (st && st.can && st.op) {
                NC.LifeQuests.press(game, r.id);
                return;
              }
            }
          }

          // 2e. Journey Stage Chest (หีบรางวัลจบช่วงการเดินทาง)
          if (NC.Journey && typeof NC.Journey.openChest === 'function' && document.querySelector('[data-jchest="1"].ready')) {
            NC.Journey.openChest(game);
            return;
          }
        } catch (_) {}
      })();
    }

    // 3. Auto-use EXP +50% (gx_expx), Job EXP +50% (gx_jobx), Drop (gx_dropx), Campfire/Auto-Premium tickets & Starter Egg Gacha Tickets!
    if (nowMs - lastBoostUseTryAt > 2500 && p.mats) {
      lastBoostUseTryAt = nowMs;
      try {
        if (NC.Offer && typeof NC.Offer.view === 'function') {
          try {
            NC.Offer.view('egg');
            NC.Offer.view('boxes');
            NC.Offer.view('fashion');
            NC.Offer.view('pet');
          } catch (_) {}
        }

        const perks = NC.Online?.snap?.self?.perks || {};
        const usePackItem = (id, qty = 1) => {
          if (NC.PackNet && typeof NC.PackNet.use === 'function' && (!NC.PackNet.is || NC.PackNet.is(id))) {
            return NC.PackNet.use(id, qty);
          }
          if (typeof NC.invAct === 'function') {
            return NC.invAct(game, 'main', { kind: 'mat', id });
          }
          return false;
        };

        // Open EXP box / Daily supply bag / Floater box if any
        for (const boxId of ['box_expx', 'bag_daily', 'box_fstone', 'box_float_c', 'box_float_r', 'box_float_e', 'box_float_l']) {
          if ((p.mats[boxId] | 0) > 0) {
            if (usePackItem(boxId, 1)) return;
          }
        }

        // Load starter Egg Tickets (tk_egg x3 from mail), Fashion Tickets & Pet Tickets from bag into Gacha Machines
        if ((p.mats.tk_egg | 0) > 0) {
          const eggReady = Boolean(NC.Gacha?.egg?.now?.()?.v);
          if (eggReady && usePackItem('tk_egg', p.mats.tk_egg | 0)) {
            return;
          }
        }
        if ((p.mats.tk_gacha_fashion | 0) > 0) {
          if (usePackItem('tk_gacha_fashion', p.mats.tk_gacha_fashion | 0)) return;
        }
        if ((p.mats.tk_gacha_pet | 0) > 0) {
          if (usePackItem('tk_gacha_pet', p.mats.tk_gacha_pet | 0)) return;
        }

        // Auto-Pull Egg Gacha (ตู้ไข่) when eggTickets > 0 in the machine
        const gSt = NC.Gacha?.state;
        if (gSt && (gSt.eggTickets | 0) > 0 && NC.Gacha?.egg) {
          const E = typeof NC.Gacha.egg.now === 'function' ? NC.Gacha.egg.now() : null;
          const v = E && E.v;
          const pick = (v && typeof NC.Gacha.egg.of === 'function') ? NC.Gacha.egg.of(v, null) : (v && Array.isArray(v.eggs) ? v.eggs[0] : null);
          const isOff = typeof NC.Gacha.egg.off === 'function' ? NC.Gacha.egg.off() : false;
          if (v && pick && v.stamp && !isOff && typeof NC.Gacha.egg.pull === 'function') {
            if (NC.Gacha.egg.pull('eggPullTicket', 1, pick.id, v.stamp)) {
              return;
            }
          }
        }
        // Auto-Pull Fashion Gacha & Pet Gacha if free tickets are loaded in machine
        if (gSt && (gSt.tickets | 0) > 0 && NC.OnlineGacha?.send && NC.Offer?.stamp?.('fashion')) {
          NC.OnlineGacha.send('pullTicket', { count: 1 });
          return;
        }
        if (gSt && (gSt.petTickets | 0) > 0 && NC.Offer?.stamp?.('pet')) {
          if (NC.PetGacha?.pullTicket) {
            NC.PetGacha.pullTicket(game, 1);
            return;
          } else if (NC.OnlineGacha?.send) {
            NC.OnlineGacha.send('petPullTicket', { count: 1 });
            return;
          }
        }

        // Use 12h Campfire Card (Premium tier: +25% EXP & unlimited free player trades!)
        if ((p.mats.tk_card12 | 0) > 0 && !(NC.FreeTrade?.premium && NC.FreeTrade.premium())) {
          usePackItem('tk_card12', 1);
          return;
        }
        // Use 12h Auto-Premium ticket (auto-loots Polish Stones & cards!)
        if ((p.mats.tk_auto12 | 0) > 0 && !(perks.autoprem && perks.autoprem.hoursUntil > Date.now())) {
          usePackItem('tk_auto12', 1);
          return;
        }

        // Use EXP +50% scroll (gx_expx) if not active (check NC.GemShop.boostLeftMs('exp'), NOT #buffs which matches Premium!)
        const expLeftMs = (NC.GemShop && typeof NC.GemShop.boostLeftMs === 'function')
          ? Number(NC.GemShop.boostLeftMs('exp') || 0)
          : Number(perks.expx?.left || perks.exp?.left || 0);
        if ((p.mats.gx_expx | 0) > 0 && expLeftMs <= 60000) {
          if (NC.GemShop && typeof NC.GemShop.use === 'function') {
            NC.GemShop.use(game, 'gx_expx');
          } else if (typeof NC.invAct === 'function') {
            NC.invAct(game, 'gx:use', { kind: 'mat', id: 'gx_expx' });
          }
          return;
        }

        // Use Job EXP +50% scroll (gx_jobx) if not active (check NC.GemShop.boostLeftMs('job'))
        const jobLeftMs = (NC.GemShop && typeof NC.GemShop.boostLeftMs === 'function')
          ? Number(NC.GemShop.boostLeftMs('job') || 0)
          : Number(perks.jobx?.left || perks.job?.left || 0);
        if ((p.mats.gx_jobx | 0) > 0 && jobLeftMs <= 60000) {
          if (NC.GemShop && typeof NC.GemShop.use === 'function') {
            NC.GemShop.use(game, 'gx_jobx');
          } else if (typeof NC.invAct === 'function') {
            NC.invAct(game, 'gx:use', { kind: 'mat', id: 'gx_jobx' });
          }
          return;
        }

        // Use Drop boost scroll (gx_dropx) if present and not active
        const dropLeftMs = (NC.GemShop && typeof NC.GemShop.boostLeftMs === 'function')
          ? Number(NC.GemShop.boostLeftMs('drop') || 0)
          : Number(perks.dropx?.left || perks.drop?.left || 0);
        if ((p.mats.gx_dropx | 0) > 0 && dropLeftMs <= 60000) {
          if (NC.GemShop && typeof NC.GemShop.use === 'function') {
            NC.GemShop.use(game, 'gx_dropx');
          } else if (typeof NC.invAct === 'function') {
            NC.invAct(game, 'gx:use', { kind: 'mat', id: 'gx_dropx' });
          }
          return;
        }
      } catch (_) {}
    }
  }

  let lastMarketMineFetchAt = 0;
  let lastMarketListTryAt = 0;
  let lastMarketFindTryAt = 0;
  let lastMarketBuyTryAt = 0;
  let lastMarketPotionRestockAt = 0;

  function ensureCMarketHooksMounted() {
    const NC = window.NC;
    if (!NC || !NC.CMarket) return;
    if (!window.__afCMarketHooksMounted) {
      window.__afCMarketHooksMounted = true;
      try {
        const wasOpen = Boolean(NC.SQ?.isOpen?.('cmarket'));
        NC.CMarket.open('mine');
        if (!wasOpen) {
          setTimeout(() => {
            try { NC.SQ?.close?.('cmarket'); } catch (_) {}
          }, 350);
        }
      } catch (_) {}
    }
  }

  function runAutoFarmLv20Tick(game, p) {
    const NC = window.NC;
    const af = window.__autoFarmLv20Config;
    if (!NC || !game || !p || !af || !af.enabled) return false;

    ensureFreeTradeRulesAcked(p);
    runAutoMailClaimAndExpBoosts(game, p);

    const targetLv = Math.max(1, Number(af.targetLevel) || 20);
    const curLv = Number(p.lv) || 1;
    const role = String(af.role || 'farmer').toLowerCase();
    const curCh = String(NC.OnlineChannels?.current ? (NC.OnlineChannels.current() || '') : (NC.Online?.snap?.channelId || ''));
    const freeGold = (NC.Bound?.free ? NC.Bound.free(p, 'gold') : p.coins) | 0;
    const nowMs = Date.now();

    // 1. If farmer already completed transferring coins via Central Market -> stand by with PASS status!
    if (role === 'farmer' && af.tradeCompleted) {
      if (NC.QuestAuto?.on) { try { NC.QuestAuto.stop?.('โอนเงินผ่านตลาดกลางเสร็จสิ้นแล้ว'); } catch (_) {} }
      if (NC.Auto?.on) { try { NC.Auto.stop ? NC.Auto.stop(game) : NC.Auto.toggle(game); } catch (_) {} }
      if (NC.Travel?.on) { try { NC.Travel.stop?.(''); } catch (_) {} }
      const doneText = `✅ PASS: ดึงของตลาดกลางจาก ${af.receiverCharName || 'ตัวรับเงิน'} โอนเงิน ${Number(af.tradedCoins || 0).toLocaleString()} เหรียญ สำเร็จแล้ว!`;
      af.statusText = doneText;
      setPlanTaskStatus(doneText);
      return true;
    }

    // 2. While Base Level < targetLv (Lv.20), let Smart Auto-Quest + Plan Script (Wolf Hunter) + Smart Gear level up!
    if (curLv < targetLv) {
      if (!window.__smartAutoQuestEnabled) window.__smartAutoQuestEnabled = true;
      if (!window.__planScriptEnabled) window.__planScriptEnabled = true;
      af.statusText = `⚔️ กำลังปั๊มเลเวล Auto-Quest (Lv.${curLv}/${targetLv} · เหรียญ ${(p.coins || 0).toLocaleString()})`;
      return false;
    }

    // 3. Reached targetLv (Lv.20+)! Stop questing & farming and return to Uncle Coco in Camp (`ร้านลุงโกโก้ ค่ายกลางป่า`)
    // IMPORTANT: Central Market (`ตลาดกลาง`) is server-wide across ALL channels! NEVER call NC.OnlineChannels.to() here so we never disconnect into queue!
    if (NC.QuestAuto?.on) { try { NC.QuestAuto.stop?.(`ถึง Lv.${curLv} แล้ว -> กลับร้านลุงโกโก้เพื่อใช้ตลาดกลาง`); } catch (_) {} }
    if (NC.Auto?.on) { try { NC.Auto.stop ? NC.Auto.stop(game) : NC.Auto.toggle(game); } catch (_) {} }

    const coco = NC.Shop?.npc;
    const talkRange = Math.max(85, Number(NC.Shop?.talk) || 110);
    const meetSpot = coco
      ? { map: 'camp', x: coco.x, y: coco.y + 55, r: 45, name: 'ร้านลุงโกโก้ (ตลาดกลาง)' }
      : { map: 'camp', x: 2500, y: 2780, r: 45, name: 'ร้านลุงโกโก้ (ตลาดกลาง)' };

    if (game.mapId !== 'camp') {
      if (afWarpState.map !== 'camp') {
        afWarpState.map = 'camp';
        afWarpState.warpTriedAt = 0;
        afWarpState.warpAttempts = 0;
      }
      tryWarpOrWalkToMap(game, 'camp', meetSpot, afWarpState);
      const stTxt = `🏕️ ถึง Lv.${curLv} แล้ว! กำลังกลับค่ายกลางป่าไปหาลุงโกโก้เพื่อ${role === 'receiver' ? 'ตั้งขายของรับเงินในตลาดกลาง' : 'ดึงของในตลาดกลางส่งเงินให้ตัวหลัก'}...`;
      af.statusText = stTxt;
      setPlanTaskStatus(stTxt);
      return true;
    }

    // 4. Walk to Uncle Coco in Camp (required by server `nearCoco` to list or buy on Central Market)
    const distToCoco = coco ? Math.hypot(p.x - coco.x, p.y - coco.y) : Math.hypot(p.x - meetSpot.x, p.y - meetSpot.y);
    if (distToCoco > talkRange + 25) {
      if (!NC.Travel?.on || NC.Travel.target?.name !== meetSpot.name) {
        NC.Travel?.go?.(game, meetSpot);
      }
      const stTxt = `🏃 กำลังเดินไปหน้าร้านลุงโกโก้ (CH.${curCh || '-'}) เพื่อเปิดตลาดกลาง...`;
      af.statusText = stTxt;
      setPlanTaskStatus(stTxt);
      return true;
    }
    if (NC.Travel?.on) { try { NC.Travel.stop?.(''); } catch (_) {} }

    // Ensure Central Market event hooks are mounted
    ensureCMarketHooksMounted();
    const cmState = (NC.CMarket && typeof NC.CMarket.state === 'function') ? NC.CMarket.state() : null;

    // =========================================================================
    // 5A. RECEIVER ROLE (จอ 1 • ตัวรับเงินรวม):
    //     Automatically list stackable items on Central Market (`ตลาดกลาง`) & claim mail sales revenue!
    // =========================================================================
    if (role === 'receiver') {
      // Periodically refresh my open listings & claim sales revenue from mailbox
      if (nowMs - lastMarketMineFetchAt > 4500) {
        lastMarketMineFetchAt = nowMs;
        try { NC.OnlineWorld?.send?.({ action: 'cmarket', kind: 'mine' }); } catch (_) {}
      }
      if (nowMs - lastMailClaimTryAt > 6500) {
        lastMailClaimTryAt = nowMs;
        try { NC.Online?.rpc?.('nc_mail_claim_all', {}).catch(() => {}); } catch (_) {}
      }

      const myOpenListings = Array.isArray(cmState?.mine)
        ? cmState.mine.filter(l => l && l.state === 'open' && Number(l.n) > 0)
        : [];
      af.marketListings = myOpenListings.map(l => ({
        id: l.id,
        k: l.k,
        itemId: l.itemId,
        price: Number(l.price) || 100,
        n: Number(l.n) || 1,
        seller: l.seller || p.name || ''
      }));

      const totalOpenPieces = myOpenListings.reduce((sum, l) => sum + (Number(l.n) || 0), 0);
      const myLimit = (NC.FreeTrade?.premium && NC.FreeTrade.premium()) ? 20 : 3;

      // Keep at least 2 open stackable listings (or >= 40 total pieces at 100 coins/piece) on the Central Market
      if (myOpenListings.length < Math.min(4, myLimit) && totalOpenPieces < 60 && nowMs - lastMarketListTryAt > 3800) {
        lastMarketListTryAt = nowMs;
        const heldPots = (NC.PremiumOnline?.held ? NC.PremiumOnline.held(p, 'pot') : []) || [];
        const heldMats = (NC.PremiumOnline?.held ? NC.PremiumOnline.held(p, 'mat') : []) || [];
        const heldItems = (NC.PremiumOnline?.held ? NC.PremiumOnline.held(p, 'item') : []) || [];

        // If running low on Red Potions & materials, buy 50 Red Potions from Uncle Coco so we never run out of items to list!
        const redHolding = heldPots.find(x => x && x.id === 'red');
        if ((!redHolding || redHolding.n < 15) && heldMats.length === 0 && freeGold >= 600 && nowMs - lastMarketPotionRestockAt > 8000) {
          lastMarketPotionRestockAt = nowMs;
          try {
            if (NC.ShopNet?.buy) NC.ShopNet.buy(game, 'pot', 'red', 40);
            else if (NC.Econ?.buy) NC.Econ.buy(game, 'red', 40);
          } catch (_) {}
        }

        const stackCandidates = [...heldMats, ...heldPots]
          .filter(x => x && Number(x.n) >= 3)
          .sort((a, b) => (Number(b.n) || 0) - (Number(a.n) || 0));

        const pickStack = stackCandidates[0] || heldMats[0] || heldPots[0] || null;
        if (pickStack && Number(pickStack.n) >= 1) {
          const unitPrice = 100; // 100 coins/piece -> deposit is only 2 coins/piece, and farmers can buy exact multiples of 100 coins!
          const maxAffordableByDeposit = Math.max(1, Math.floor((freeGold * 50) / unitPrice));
          const listCount = Math.max(1, Math.min(Number(pickStack.n) || 1, 60, maxAffordableByDeposit));
          const dep = Math.max(1, Math.floor((listCount * unitPrice * 2) / 100));
          if (freeGold >= dep) {
            try {
              NC.OnlineWorld?.send?.({
                action: 'cmarket',
                kind: 'list',
                price: unitPrice,
                thing: { k: pickStack.k, id: pickStack.id, n: listCount }
              });
              setTimeout(() => {
                try { NC.OnlineWorld?.send?.({ action: 'cmarket', kind: 'mine' }); } catch (_) {}
              }, 1000);
            } catch (_) {}
            const stTxt = `🏪 ตัวรับเงิน: กำลังวางขาย ${pickStack.id} ×${listCount} ชิ้น (ชิ้นละ ${unitPrice} เหรียญ) ลงตลาดกลาง...`;
            af.statusText = stTxt;
            setPlanTaskStatus(stTxt);
            return true;
          }
        } else if (heldItems.length > 0 && freeGold >= 30) {
          const pickGear = heldItems[0];
          const gearPrice = 1000;
          try {
            NC.OnlineWorld?.send?.({
              action: 'cmarket',
              kind: 'list',
              price: gearPrice,
              thing: { k: 'item', id: pickGear.id, u: pickGear.u }
            });
            setTimeout(() => {
              try { NC.OnlineWorld?.send?.({ action: 'cmarket', kind: 'mine' }); } catch (_) {}
            }, 1000);
          } catch (_) {}
          const stTxt = `🏪 ตัวรับเงิน: กำลังวางขายอุปกรณ์ ${pickGear.id} (${gearPrice} เหรียญ) ลงตลาดกลาง...`;
          af.statusText = stTxt;
          setPlanTaskStatus(stTxt);
          return true;
        }
      }

      const stTxt = `👑 ตัวหลักเปิดร้านตลาดกลางแล้ว (${myOpenListings.length} รายการ · ${totalOpenPieces} ชิ้น) · เหรียญรวม ${(p.coins || 0).toLocaleString()} (พร้อมใช้ ${freeGold.toLocaleString()})`;
      af.statusText = stTxt;
      setPlanTaskStatus(stTxt);
      return true;
    }

    // =========================================================================
    // 5B. FARMER ROLE (จอ 2..N • ตัวฟาร์ม Lv.20):
    //     Sell monster materials/junk gear to Uncle Coco, then buy Receiver's listings on Central Market!
    // =========================================================================
    if (!window.__afSoldBeforeTrade && coco) {
      try {
        const uids = getJunkGearUidsToSell(p);
        if (uids.length > 0 && NC.GEAR?.sellMany) {
          document.dispatchEvent(new Event('pointerdown'));
          NC.GEAR.sellMany(game, uids);
        }
        const mats = getMaterialsToSell(p);
        for (const [id, n] of mats) {
          const got = NC.Econ?.sell ? NC.Econ.sell(game, id, n) : 0;
          if (got > 0) {
            p.mats[id] = Math.max(0, (p.mats[id] | 0) - n);
            p.coins = (p.coins || 0) + got;
          }
        }
      } catch (_) {}
      window.__afSoldBeforeTrade = true;
      lastMarketBuyTryAt = nowMs + 800;
      const stTxt = `💰 ขายขยะให้ลุงโกโก้เสร็จแล้ว (มีเหรียญพร้อมดึงตลาดกลาง ${freeGold.toLocaleString()} เหรียญ)...`;
      af.statusText = stTxt;
      setPlanTaskStatus(stTxt);
      return true;
    }

    if (window.__afInitialFreeGold === undefined && freeGold > 0) {
      window.__afInitialFreeGold = freeGold;
    }

    // Check if farmer has already spent its freeGold buying Receiver's market items!
    const spentSoFar = Math.max(
      Number(window.__afMarketSpentCoins || 0),
      (Number(window.__afInitialFreeGold || 0) > freeGold) ? (Number(window.__afInitialFreeGold) - freeGold) : 0
    );
    if ((freeGold < 100 && spentSoFar > 0) || (freeGold <= 0 && Number(window.__afMarketBuyAttempts || 0) >= 2)) {
      const finalTraded = spentSoFar > 0 ? spentSoFar : Number(window.__afLastBuyCost || 0);
      window.__afMarketSpentCoins = 0;
      window.__afInitialFreeGold = undefined;
      saveAutoFarmLv20Cfg({ tradeCompleted: true, tradedCoins: finalTraded });
      const stTxt = `✅ PASS: ดึงของตลาดกลางจาก ${af.receiverCharName || 'ตัวรับเงิน'} โอนเงิน ${finalTraded.toLocaleString()} เหรียญ สำเร็จ!`;
      af.statusText = stTxt;
      setPlanTaskStatus(stTxt);
      return true;
    }

    const receiverName = String(af.receiverCharName || '').trim();
    if (!receiverName) {
      const stTxt = `⚠️ รอข้อมูลชื่อตัวรับเงินหลัก (Receiver) จากหน้า Auto Farm...`;
      af.statusText = stTxt;
      setPlanTaskStatus(stTxt);
      return true;
    }

    // Combine synced receiverMarketListings from Manager + any matching listings discovered in cmState.list
    const syncedListings = Array.isArray(af.receiverMarketListings) ? af.receiverMarketListings : [];
    const sheetListings = Array.isArray(cmState?.list)
      ? cmState.list.filter(l => l && l.seller && String(l.seller).trim().toLowerCase() === receiverName.toLowerCase() && Number(l.n) > 0)
      : [];

    const candidateListings = [...syncedListings, ...sheetListings].filter(l =>
      l && l.id && Number(l.n) > 0 && Number(l.price) > 0 && Number(l.price) <= freeGold &&
      !(window.__afDeadListingIds && window.__afDeadListingIds[l.id])
    );

    if (candidateListings.length > 0) {
      if (nowMs - lastMarketBuyTryAt < 1800) return true;
      lastMarketBuyTryAt = nowMs;

      // Pick listing that lets us transfer the most coins in one purchase
      const targetListing = candidateListings[0];
      const unitPrice = Number(targetListing.price) || 100;
      const buyCount = (targetListing.k === 'item' || targetListing.k === 'rune')
        ? 1
        : Math.max(1, Math.min(Number(targetListing.n) || 1, Math.floor(freeGold / unitPrice)));
      const cost = buyCount * unitPrice;

      window.__afLastBuyCost = cost;
      window.__afMarketBuyAttempts = (Number(window.__afMarketBuyAttempts) || 0) + 1;
      try {
        NC.OnlineWorld?.send?.({
          action: 'cmarket',
          kind: 'buy',
          listingId: targetListing.id,
          count: buyCount
        });
      } catch (_) {}

      // If this listing has been tried 3 times without freeGold dropping, mark listingId stale so we try the next one
      window.__afListingTries = window.__afListingTries || {};
      window.__afListingTries[targetListing.id] = (window.__afListingTries[targetListing.id] || 0) + 1;
      if (window.__afListingTries[targetListing.id] >= 3) {
        window.__afDeadListingIds = window.__afDeadListingIds || {};
        window.__afDeadListingIds[targetListing.id] = true;
      }

      const stTxt = `🛒 กำลังดึงของตลาดกลาง (${targetListing.itemId || targetListing.k} ×${buyCount} ชิ้น = ${cost.toLocaleString()} เหรียญ) จากร้าน "${receiverName}"...`;
      af.statusText = stTxt;
      setPlanTaskStatus(stTxt);
      return true;
    }

    // If no candidate listing is known yet (or all known listings were < freeGold), search Central Market for Receiver's items!
    if (nowMs - lastMarketFindTryAt > 3200) {
      lastMarketFindTryAt = nowMs;
      window.__afDeadListingIds = {};
      try {
        // Cycle through searching common items or shelf cards to find Receiver's listings
        const shelfCards = Array.isArray(cmState?.res?.cards) ? cmState.res.cards : [];
        const probeKeys = ['pot:red', 'mat:mat_zombie_patch', 'mat:sd_herb', 'mat:mat_ghost_flame', 'mat:lf_oak', 'mat:mat_water_jelly'];
        for (const c of shelfCards) {
          if (c && c.key && !probeKeys.includes(c.key)) probeKeys.unshift(c.key);
        }
        const idx = (Number(window.__afProbeIdx) || 0) % probeKeys.length;
        window.__afProbeIdx = idx + 1;
        const [pk, pid] = probeKeys[idx].split(':');
        if (NC.CMarket?.view && idx % 2 === 0) {
          NC.OnlineWorld?.send?.({ action: 'cmarket', kind: 'find', find: { k: pk, ids: [pid], sort: 'price', page: 0 } });
        } else {
          NC.OnlineWorld?.send?.({ action: 'cmarket', kind: 'find', find: { sort: 'new', page: 0, group: true } });
        }
      } catch (_) {}
    }

    const stTxt = `🔍 รอดึงของในตลาดกลางจากตัวรับเงิน "${receiverName}" (มีเหรียญพร้อมโอน ${freeGold.toLocaleString()} เหรียญ)...`;
    af.statusText = stTxt;
    setPlanTaskStatus(stTxt);
    return true;
  }

  // D. Execute Smart Auto-Quest, Upgrade BOT AI, Auto-Respawn, Potion Craft/Buy, Auto-Sell, Auto-Party, Least-Populated Channel & Plan Script Loop
  let currentActiveAction = null;
  let lastSellTripAt = 0;
  let lastQuestAutoNextAt = 0;
  let lastPartyTickAt = 0;
  let lastPartyBoardPostAt = 0;
  let lastPartyChannelMoveAt = 0;
  let lastLeastChannelCheckAt = 0;
  let lastLeastChannelCheckedMap = '';
  let leastChannelCheckInFlight = false;
  let channelSwitchInFlight = false;
  let lastStoryRoomPressAt = 0;

  const OUTDOOR_QUEST_MAP_RANK = {
    farm: 1, curinghouse: 2, melonfield: 2, windpump: 2, batcave: 3,
    meadow: 4, apiary: 5, appleslope: 5, dandelion: 6, cornmaze: 6, farm2: 6,
    marsh: 7, reedmaze: 8, beaverdam: 8, eelhut: 8,
    graveyard: 9, meadow2: 9, battlefield: 9, tallgrass: 10, thornrose: 10, antmine1: 10,
    diggervillage: 11, wreathfield: 11, giantbones: 11, marsh2: 11,
    woods: 12, antmine2: 13, graveyard2: 13, coffinhollow: 14, weepgarden: 14,
    burnt: 15, ashvale: 16, stillburning: 16, woods2: 16,
    crypt1: 17, sporevale: 18, salt: 18, wind: 19, peak: 20, crypt2: 21,
    avalanche: 22, snowpines: 23, swamp: 24, canyon: 25, volcano: 26
  };

  // Max Base Level at which a player still has actual main quests on each outdoor map
  // (Prevents higher-level teammates walking through transit maps like `farm` after respawning/selling in `camp`
  //  from falsely pulling the whole party back to `farm`!)
  const OUTDOOR_MAP_MAX_QUEST_LV = {
    farm: 9, curinghouse: 11, melonfield: 12, windpump: 13, batcave: 15,
    meadow: 19, apiary: 19, appleslope: 19, dandelion: 21, cornmaze: 21, farm2: 22,
    marsh: 25, reedmaze: 26, beaverdam: 26, eelhut: 27,
    graveyard: 31, meadow2: 29, battlefield: 29, tallgrass: 31, thornrose: 31, antmine1: 31,
    diggervillage: 33, wreathfield: 33, giantbones: 35, marsh2: 36,
    woods: 39, antmine2: 39, graveyard2: 43, coffinhollow: 45, weepgarden: 45,
    burnt: 49, ashvale: 49, stillburning: 51, woods2: 51
  };

  function isChannelledOutdoorMap(game) {
    const NC = window.NC;
    const mapId = String(game?.mapId || NC?.Online?.snap?.mapId || '');
    if (!mapId || mapId === 'camp' || mapId === 'homefarm' || mapId === 'puppetroom') return false;
    const M = NC?.MAPS?.[mapId] || {};
    if (M.camp || M.pvp || M.arena || M.gwar || M.secret) return false;
    if (NC?.StoryRoom?.inRoom?.() || NC?.Trial?.inRoom?.()) return false;
    const curCh = String(NC?.OnlineChannels?.current?.() || '');
    return Boolean(curCh && /^\d+$/.test(curCh));
  }

  window.getCurrentChannel = function getCurrentChannel() {
    const raw = window.NC?.OnlineChannels?.current?.() || window.NC?.Online?.snap?.channelId || '';
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  window.isCurrentChannelPk = function isCurrentChannelPk() {
    return false;
  };

  window.findLeastPopulatedChannel = async function findLeastPopulatedChannel(avoidChannels) {
    // CRITICAL SAFETY (v2.0.0): In Nightcamp (`online/channels.js`), switching channels (`NC.OnlineChannels.to`)
    // leaves the current match (`sock.leaveMatch`) and calls `nc_join` (the same RPC as Character Select login).
    // If the server is full or in combat linger, `nc_join` fails and calls `sock.close()`, dropping the player out to the Character Select queue!
    // Therefore, NEVER return a random "least-populated" channel; only return the Party Leader/Majority channel if a teammate is on it, otherwise stay on `curCh`!
    const curCh = window.getCurrentChannel() || 1;
    const maj = isPartySystemActiveNow() ? getPartyMajorityOutdoorChannel() : null;
    const pickCh = (maj && maj.channel) ? Number(maj.channel) : curCh;
    return {
      channel: pickCh,
      ch: pickCh,
      heroes: 0,
      currentChannel: curCh,
      currentHeroes: 0
    };
  };

  function getPartyMajorityOutdoorChannel() {
    // 1. Check exact cross-window party channel counts synced by Manager (`party_api.js`)
    const syncCounts = window.__pmPartySync?.ownPartyCountByCh;
    if (syncCounts && typeof syncCounts === 'object') {
      let bestSyncCh = null;
      let bestSyncCnt = 0;
      for (const [chStr, cnt] of Object.entries(syncCounts)) {
        const ch = Number(chStr);
        const n = Number(cnt) || 0;
        if (Number.isFinite(ch) && ch > 0 && n > bestSyncCnt) {
          bestSyncCnt = n;
          bestSyncCh = ch;
        }
      }
      if (bestSyncCnt >= 2 && bestSyncCh) {
        return { channel: bestSyncCh, count: bestSyncCnt };
      }
    }
    const NC = window.NC;
    const PN = NC?.PartyNet;
    if (!NC || !PN || !PN.inParty || !PN.inParty()) return null;
    const R = PN.roster && PN.roster();
    if (!R || !Array.isArray(R.mem) || R.mem.length < 2) return null;
    const meId = PN.me && PN.me();
    const counts = new Map();
    for (const pid of R.mem) {
      let mMap = '';
      let mCh = 0;
      if (pid === meId) {
        mMap = String(NC.game?.mapId || '');
        mCh = Number(window.getCurrentChannel() || 0);
      } else {
        const m = PN.member && PN.member(pid);
        if (!m || m.online === false) continue;
        mMap = String(m.mapId || '');
        mCh = Number(m.channel || 0);
      }
      if (!mMap || mMap === 'camp' || mMap === 'homefarm' || mMap === 'puppetroom') continue;
      if (!Number.isFinite(mCh) || mCh <= 0) continue;
      counts.set(mCh, (counts.get(mCh) || 0) + 1);
    }
    let bestCh = null;
    let bestCnt = 0;
    for (const [ch, cnt] of counts.entries()) {
      if (cnt > bestCnt) {
        bestCnt = cnt;
        bestCh = ch;
      }
    }
    return bestCnt >= 2 ? { channel: bestCh, count: bestCnt } : null;
  }

  function isPartySystemActiveNow() {
    const nowMs = Date.now();
    const pmSync = (window.__pmPartySync && (nowMs - (window.__pmPartySync.updatedAt || 0) < 120000))
      ? window.__pmPartySync
      : null;
    return Boolean(pmSync && pmSync.leaderName);
  }

  function isTargetChannelOccupiedByPartyTeammate(targetCh) {
    const targetNum = Number(targetCh);
    if (!Number.isFinite(targetNum) || targetNum < 1) return false;
    const curCh = window.getCurrentChannel();
    if (targetNum === curCh) return true;
    if (!isPartySystemActiveNow()) return false;

    const NC = window.NC;
    const PN = NC?.PartyNet;
    const nowMs = Date.now();
    const pmSync = (window.__pmPartySync && (nowMs - (window.__pmPartySync.updatedAt || 0) < 120000))
      ? window.__pmPartySync
      : null;
    if (!pmSync || !pmSync.leaderName) return false;

    const myNameLow = String(NC?.game?.player?.name || window.getCharacterName?.() || '').trim().toLowerCase();
    const cfgLeadLow = String(pmSync.leaderName || '').trim().toLowerCase();
    const isConfiguredLeader = Boolean(cfgLeadLow && myNameLow && myNameLow === cfgLeadLow);
    // Party Leader stays on their current channel and never switches on START BOT!
    if (isConfiguredLeader) return false;

    const managedPartyNamesLow = new Set(
      (Array.isArray(pmSync.partyNames) ? pmSync.partyNames : [pmSync.leaderName])
        .map(n => String(n || '').trim().toLowerCase())
        .filter(Boolean)
    );

    // 1. Check in-game party teammates' channels (`NC.PartyNet`) matching our Manager party
    if (PN?.inParty?.()) {
      const R = PN.roster && PN.roster();
      const meId = PN.me && PN.me();
      for (const pid of (R?.mem || [])) {
        if (pid === meId) continue;
        const m = PN.member && PN.member(pid);
        if (!m || m.online === false || Number(m.channel) !== targetNum) continue;
        const mNameLow = String(m.name || window.__ncKnownPartyNamesById?.[pid] || '').trim().toLowerCase();
        if (!mNameLow || managedPartyNamesLow.size === 0 || managedPartyNamesLow.has(mNameLow) || pid === R?.lead) {
          return true;
        }
      }
    }

    // 2. Check Manager party sync (`window.__pmPartySync`)
    const cntOnTarget = Number(pmSync.ownPartyCountByCh?.[targetNum]) || 0;
    if (cntOnTarget >= 1) return true;
    if (Number(pmSync.settledChannel) === targetNum) return true;

    return false;
  }

  window.evaluatePartyChannelSwitch = async function evaluatePartyChannelSwitch(partySize, partyNames, avoidChannels) {
    const curCh = window.getCurrentChannel();
    if (!curCh) {
      return { success: false, shouldSwitch: false, channel: curCh };
    }
    // CRITICAL SAFETY (v2.0.0):
    // Never switch a Solo player OR a Party Leader/Anchor to a random "least-populated" channel when START BOT is pressed!
    // Only switch if >= 2 party members are ALREADY on another outdoor channel (`maj.channel !== curCh`).
    if (!isPartySystemActiveNow() || Number(partySize || 1) <= 1) {
      return {
        success: true,
        shouldSwitch: false,
        channel: curCh,
        currentChannel: curCh,
        currentIsOverlapped: false,
        currentIsPk: false,
        currentIsShut: false
      };
    }
    const maj = getPartyMajorityOutdoorChannel();
    if (maj && maj.channel && maj.channel !== curCh && isTargetChannelOccupiedByPartyTeammate(maj.channel)) {
      return {
        success: true,
        shouldSwitch: true,
        channel: maj.channel,
        currentChannel: curCh,
        currentIsOverlapped: false,
        currentIsPk: false,
        currentIsShut: false
      };
    }
    return {
      success: true,
      shouldSwitch: false,
      channel: curCh,
      currentChannel: curCh,
      currentIsOverlapped: false,
      currentIsPk: false,
      currentIsShut: false
    };
  };

  window.moveToChannel = async function moveToChannel(ch, waitMs = 25000) {
    const NC = window.NC;
    const OC = NC?.OnlineChannels;
    const game = NC?.game;
    const targetNum = Number(ch);
    const targetStr = String(targetNum);
    if (!NC || !OC || typeof OC.to !== 'function' || !game || !Number.isFinite(targetNum) || targetNum < 1) {
      return { success: false, noSuchChannel: true, error: 'ไม่มีแชนแนลนี้' };
    }
    const curChNow = window.getCurrentChannel();
    if (curChNow === targetNum) {
      return { success: true, channel: targetNum };
    }
    // CRITICAL SAFETY (v2.0.0):
    // Block ANY automatic channel switch unless the party system is active AND at least 1 party teammate/leader is ALREADY on `targetNum`!
    // This guarantees pressing START BOT (whether solo or as Party Leader) NEVER leaves the match into the server queue!
    if (!isPartySystemActiveNow() || !isTargetChannelOccupiedByPartyTeammate(targetNum)) {
      return {
        success: true,
        channel: curChNow || targetNum,
        skippedNoTeammateOnTarget: true
      };
    }

    const curChStr = String(OC.current?.() || '');
    const mapId = String(OC.mapId?.() || game.mapId || '');
    if (!curChStr || mapId === 'puppetroom' || mapId === 'homefarm' || NC.StoryRoom?.inRoom?.() || NC.Trial?.inRoom?.()) {
      return { success: false, blockedBusy: true, error: 'แมพนี้ไม่มีแชนแนล' };
    }
    if (channelSwitchInFlight) {
      return { success: false, blockedBusy: true, error: 'กำลังย้ายแชนแนลอยู่' };
    }
    const selfSnap = NC.Online?.snap?.self || {};
    const moveWaitLeftMs = ((+selfSnap.channelMoveAt || 0) + 300000) - Date.now();
    if (moveWaitLeftMs > Math.min(Number(waitMs) || 25000, 18000)) {
      return {
        success: false,
        blockedBusy: true,
        error: `ติดคูลดาวน์ย้ายแชนแนลอีก ${Math.ceil(moveWaitLeftMs / 1000)} วินาที`
      };
    }

    channelSwitchInFlight = true;
    try {
      try { installLifeSkillUnlimitedHooks(); } catch (_) {}
      // Always stop all combat, auto-quest, and travel and wait at least 5.6s so server `combat_linger.go` (`ยังอยู่ในการต่อสู้`) clears 100% before `sock.leaveMatch`!
      const wasInCombatOrAuto = Boolean(
        NC.Auto?.on ||
        NC.QuestAuto?.on ||
        (game.player && typeof game.time === 'number' && (game.time - (game.player.lastFight ?? -99)) < 6.0)
      );
      const minQuietUntil = wasInCombatOrAuto ? (Date.now() + 5600) : (Date.now() + 1200);
      const deadline = Date.now() + Math.max(9000, Math.min(Number(waitMs) || 25000, 28000));

      while (Date.now() < deadline) {
        if (window.getCurrentChannel() === targetNum) {
          return { success: true, channel: targetNum };
        }
        const why = typeof OC.why === 'function' ? String(OC.why(targetStr) || '') : '';
        if (!why && Date.now() >= minQuietUntil) break;
        if (/ไม่มีแชนแนล|ย้ายแชนแนลไม่ได้|ยังไม่ได้เชื่อมต่อ|ฟื้นก่อน/.test(why)) {
          return { success: false, blockedBusy: true, error: why };
        }
        window.__isSwitchingChannelUntil = Date.now() + 3500;
        try {
          if (NC.QuestAuto?.on) {
            NC.QuestAuto.stop?.('หยุดโจมตีชั่วคราว 5 วินาทีเพื่อย้ายแชนแนลตี้');
          }
          if (NC.Auto?.on) {
            if (typeof NC.Auto.stop === 'function') NC.Auto.stop(game);
            else NC.Auto.toggle?.(game);
          }
          if (NC.Travel?.on) NC.Travel.stop?.('');
        } catch (_) {}
        setPlanTaskStatus(`🌐 หยุดโจมตีชั่วคราวเพื่อย้ายตามตี้ไป CH ${targetNum} (${why || 'รอหลุดสถานะต่อสู้'})...`);
        await new Promise(r => setTimeout(r, 400));
      }

      const finalWhy = typeof OC.why === 'function' ? String(OC.why(targetStr) || '') : '';
      if (finalWhy) {
        return { success: false, blockedBusy: true, error: finalWhy };
      }

      window.__isSwitchingChannelUntil = Date.now() + 6500;
      const ok = await OC.to(targetStr);
      await new Promise(r => setTimeout(r, 800));
      const nowCh = window.getCurrentChannel();
      if (ok || nowCh === targetNum) {
        window.__lastPostSellChannelSwitch = {
          mapId: String(NC.game?.mapId || mapId || ''),
          channel: targetNum,
          at: Date.now()
        };
        window.__ncLeastChannelLockedCh = targetNum;
        lastPartyChannelMoveAt = Date.now();
        return { success: true, channel: nowCh || targetNum };
      }
      return { success: false, channel: nowCh, error: 'ย้าย CH ไม่สำเร็จ' };
    } finally {
      window.__isSwitchingChannelUntil = 0;
      channelSwitchInFlight = false;
    }
  };

  function resolveRawMapNameOrAuto(rawMap) {
    const NC = window.NC;
    const s = String(rawMap || '').trim();
    if (!s || s === 'auto') return 'auto';
    if (NC?.MAPS?.[s]) return s;
    const paren = /\(([a-z0-9_]+)\)/i.exec(s);
    if (paren && (!NC?.MAPS || NC.MAPS[paren[1].toLowerCase()])) return paren[1].toLowerCase();
    const clean = s.replace(/\s*·\s*CH\s*\d+.*$/i, '').replace(/^\[.*?\]\s*/, '').trim();
    if (NC?.MAPS) {
      for (const [id, M] of Object.entries(NC.MAPS)) {
        if (!M) continue;
        const nm = String(M.name || M.title || '').trim();
        if (id.toLowerCase() === clean.toLowerCase() || (nm && (nm === clean || clean.includes(nm) || nm.includes(clean)))) {
          return id;
        }
      }
    }
    return s;
  }

  function getMyActiveQuestOutdoorMapId(game, p) {
    const NC = window.NC;
    if (!NC || !game || !p) return '';
    // 1. Active Story Boss objective -> its roomMap (e.g. sb_ivy -> 'meadow')
    const qb = NC.StoryRoom?.questBoss?.();
    if (qb && typeof NC.StoryRoom?.roomMap === 'function') {
      const bm = NC.StoryRoom.roomMap(qb);
      if (bm && OUTDOOR_QUEST_MAP_RANK[bm]) return bm;
    }
    // 2. Active QuestAuto job map
    const jobMap = resolveRawMapNameOrAuto(NC.QuestAuto?.job?.map || '');
    if (jobMap && OUTDOOR_QUEST_MAP_RANK[jobMap]) return jobMap;
    // 3. Current quest's map (NC.Quests.cur().map is a Thai display name, e.g. 'เนินสุสานโบสถ์ร้าง' -> 'graveyard')
    const curQ = NC.Quests?.cur?.();
    if (curQ && curQ.map) {
      const qMapId = resolveRawMapNameOrAuto(curQ.map);
      if (qMapId && OUTDOOR_QUEST_MAP_RANK[qMapId]) return qMapId;
    }
    return '';
  }

  window.setTargetFarmMap = function setTargetFarmMap(map, walkNow, opts) {
    const resolved = resolveRawMapNameOrAuto(map);
    if (opts && opts.fromParty) {
      window.__partyForcedMapId = resolved;
      if (window.__smartAutoQuestEnabled) {
        // When Smart Auto-Quest is ON, do not let party_api.js's setMap overwrite __targetFarmMap with a static map
        window.__targetFarmMap = 'auto';
        try { localStorage.setItem('pelican_farm_map', 'auto'); } catch (_) {}
        return { success: true, targetMap: resolved, ignoredBySmartQuest: true };
      }
    }
    window.__setTargetFarmMap?.(resolved);
    return { success: true, targetMap: resolved };
  };

  function ensureLeaderPartyBoardPostNow(game, p, customTag) {
    const NC = window.NC;
    const PB = NC?.PartyBoard;
    const PN = NC?.PartyNet;
    if (!NC || !PB || !PB.online || !p) return;
    if (NC.StoryRoom?.inRoom?.() || NC.Trial?.inRoom?.()) return;
    const members = (PN?.members && PN.members()) || [];
    const maxMembers = PN?.MAX || 5;
    if (members.length >= maxMembers) return;
    const nowMs = Date.now();
    if (nowMs - lastPartyBoardPostAt < 15000) return;
    lastPartyBoardPostAt = nowMs;
    const baseLv = Number(p.lv) || 1;
    const cleanTag = String(customTag || (p.name || 'Leader')).trim().replace(/^TEAM:/i, '');
    const wantNote = ('TEAM:' + cleanTag).slice(0, 28);
    const wantLow = wantNote.toLowerCase();
    const curMap = (game?.mapId && game.mapId !== 'camp' && game.mapId !== 'puppetroom') ? game.mapId : '';
    try {
      if (typeof PB.load === 'function') PB.load();
      setTimeout(() => {
        try {
          const v = PB.state && PB.state.view;
          const myPost = v && v.me && v.me.post;
          if (!myPost || !myPost.auto || String(myPost.note || '').trim().toLowerCase() !== wantLow) {
            PB.post({
              goal: 'farm',
              target: curMap,
              lvMin: 1,
              lvMax: Math.max(99, baseLv + 30),
              lines: [],
              note: wantNote,
              auto: true
            });
          }
        } catch (_) {}
      }, 700);
    } catch (_) {}
  }

  function tryJoinLeaderPartyByNameNow(leaderName, customTag) {
    const NC = window.NC;
    const PN = NC?.PartyNet;
    const PB = NC?.PartyBoard;
    if (!NC || !PN) return false;
    const leadLow = String(leaderName || '').trim().replace(/^TEAM:/i, '').toLowerCase();
    const tagLow = String(customTag || leaderName || '').trim().toLowerCase();
    if (!leadLow && !tagLow) return false;

    // 1. Accept pending invite if any
    const inc = PN.incoming && PN.incoming();
    if (inc && inc.kind !== 'request' && typeof PN.answer === 'function') {
      const fromLow = String(inc.name || '').trim().toLowerCase();
      if (!leadLow || fromLow === leadLow || fromLow.includes(leadLow)) {
        try { PN.answer(true); } catch (_) {}
        return true;
      }
    }

    // 2. If already in that leader's party, nothing to do
    if (PN.inParty && PN.inParty()) {
      const R = PN.roster && PN.roster();
      const rawLeadName = R?.lead ? String(PN.member?.(R.lead)?.name || window.__ncKnownPartyNamesById?.[R.lead] || PN.nameOf?.(R.lead) || '').trim() : '';
      const curLeadLow = (rawLeadName && rawLeadName !== 'ผู้เล่น') ? rawLeadName.toLowerCase() : leadLow;
      if (curLeadLow && (curLeadLow === leadLow || curLeadLow === tagLow)) {
        return true;
      }
    }

    // 3. Check if leader is standing on our current map/channel
    if (NC.Net?.remotes) {
      for (const [peerId, r] of NC.Net.remotes.entries()) {
        const rLow = String(r?.name || '').trim().toLowerCase();
        if (rLow && (rLow === leadLow || rLow === tagLow)) {
          try { PN.invite(peerId); } catch (_) {}
          return true;
        }
      }
    }

    // 4. Join leader's post on Party Board across any map or channel
    //    CRITICAL: Match by exact `post.leaderName === leadLow` first so we never join a ghost post created by another member!
    if (PB && PB.online && typeof PB.load === 'function') {
      try {
        PB.load();
        setTimeout(() => {
          try {
            const v = PB.state && PB.state.view;
            const posts = (v && Array.isArray(v.posts)) ? v.posts : [];
            let match = null;
            if (leadLow) {
              match = posts.find(post => {
                if (!post || post.mine || post.size >= post.max) return false;
                return String(post.leaderName || '').trim().toLowerCase() === leadLow;
              });
            }
            if (!match && !window.__pmPartySync?.leaderName) {
              match = posts.find(post => {
                if (!post || post.mine || post.size >= post.max) return false;
                const pNote = String(post.note || '').trim().toLowerCase();
                const pLead = String(post.leaderName || '').trim().toLowerCase();
                return (leadLow && pLead === leadLow) || (tagLow && (pNote === tagLow || pLead === tagLow));
              });
            }
            if (match && typeof PB.join === 'function') {
              PB.join(match.id);
            }
          } catch (_) {}
        }, 750);
      } catch (_) {}
    }
    return true;
  }

  window.updatePartySyncState = function updatePartySyncState(sync) {
    window.__pmPartySync = sync ? Object.assign({}, sync, { updatedAt: Date.now() }) : null;
    if (sync && sync.leaderName) {
      window.__ncPendingPartyLeader = String(sync.leaderName).trim();
      const myName = String(window.getCharacterName() || '').trim();
      const game = window.NC?.game;
      const p = game?.player;
      if (game && p) {
        if (myName && myName.toLowerCase() === window.__ncPendingPartyLeader.toLowerCase()) {
          ensureLeaderPartyBoardPostNow(game, p, 'TEAM:' + myName);
        } else {
          tryJoinLeaderPartyByNameNow(window.__ncPendingPartyLeader, 'TEAM:' + window.__ncPendingPartyLeader);
        }
      }
    }
    return { success: true };
  };

  window.updateSoloAvoidState = function updateSoloAvoidState(sync) {
    window.__pmSoloAvoidSync = sync ? Object.assign({}, sync, { updatedAt: Date.now() }) : null;
    return { success: true };
  };

  function ensurePartyInviteToastBridge() {
    if (!document.body) return;
    let el = document.getElementById('nc-pm-invite-bridge');
    if (el) return;
    el = document.createElement('div');
    el.id = 'nc-pm-invite-bridge';
    el.className = 'invite-toast';
    el.style.display = 'none';
    const makeBridgeText = () => {
      const s = new String('');
      s.includes = function (leaderName) {
        if (leaderName) {
          window.__ncPendingPartyLeader = String(leaderName).trim();
        }
        return true;
      };
      return s;
    };
    try {
      Object.defineProperty(el, 'innerText', { get: makeBridgeText, configurable: true });
      Object.defineProperty(el, 'textContent', { get: makeBridgeText, configurable: true });
    } catch (_) {}
    document.body.appendChild(el);
  }

  function installScriptPlanPartyReadGuard() {
    try {
      const p = window.__currentScriptPlan;
      if (!p || typeof p !== 'object' || p.__ncTriggersGuarded) return;
      let rawTriggers = Array.isArray(p.triggers) ? p.triggers : [];
      Object.defineProperty(p, '__ncTriggersGuarded', { value: true, enumerable: false });
      Object.defineProperty(p, 'triggers', {
        get() {
          // When manager/party_api.js READ_JS inspects `window.__currentScriptPlan.triggers`, return []
          // so `planBlocked(s)` is always false and party_api.js never refuses to invite or sync map/channel!
          if (window.__inPartyReadJs) return [];
          return rawTriggers;
        },
        set(v) {
          rawTriggers = Array.isArray(v) ? v : [];
        },
        enumerable: true,
        configurable: true
      });
    } catch (_) {}
  }

  function ncLootCodeToMode(code) {
    const c = String(code || '').trim().toLowerCase();
    if (c === 't' || c === 'turn') return 'turn';
    if (c === 'r' || c === 'round-robin') return 'round-robin';
    if (c === 'l' || c === 'leader') return 'leader';
    return 'personal';
  }

  function ncLootModeToCode(mode) {
    const m = String(mode || '').trim().toLowerCase();
    if (m === 'turn' || m === 't') return 't';
    if (m === 'round-robin' || m === 'r') return 'r';
    if (m === 'leader' || m === 'l') return 'l';
    return 'f';
  }

  function ncExpCodeToMode(code) {
    const c = String(code || '').trim().toLowerCase();
    if (c === 'o' || c === 'individual') return 'individual';
    return 'even-share';
  }

  function ncExpModeToCode(mode) {
    const m = String(mode || '').trim().toLowerCase();
    if (m === 'individual' || m === 'o') return 'o';
    return 'e';
  }

  function ncNormalizeGroupCode(mode) {
    const m = String(mode || '').trim().toLowerCase();
    return (m === 's' || m === 'separate' || m === 'solo') ? 's' : 'g';
  }

  function ensurePartyRuleSyncHooks() {
    const PN = window.NC?.PartyNet;
    if (!PN || PN.__pmheeRuleSyncHooked) return;
    try {
      PN.__pmheeRuleSyncHooked = true;
      if (typeof PN.setRule === 'function') {
        const origSetRule = PN.setRule.bind(PN);
        PN.setRule = function wrappedPartySetRule(loot, exp) {
          if (loot && PN.LOOT && PN.LOOT[loot]) {
            window.__ncPartyLootMode = ncLootCodeToMode(loot);
          }
          if (exp && (!PN.EXPM || PN.EXPM[exp])) {
            window.__ncPartyExpRule = ncExpModeToCode(exp);
            window.__ncPartyExpMode = ncExpCodeToMode(window.__ncPartyExpRule);
          }
          if (!window.__inManagerPartySettingsCall) {
            window.__ncLastInGameRuleChangeAt = Date.now();
          }
          const res = origSetRule(loot, exp);
          try { window.NC?.SQ?.refresh?.('party'); } catch (_) {}
          return res;
        };
      }
      if (typeof PN.setGroup === 'function') {
        const origSetGroup = PN.setGroup.bind(PN);
        PN.setGroup = function wrappedPartySetGroup(grp) {
          if (grp && (!PN.GROUPM || PN.GROUPM[grp])) {
            window.__ncPartyGroupMode = ncNormalizeGroupCode(grp);
          }
          if (!window.__inManagerPartySettingsCall) {
            window.__ncLastInGameRuleChangeAt = Date.now();
          }
          const res = origSetGroup(grp);
          try { window.NC?.SQ?.refresh?.('party'); } catch (_) {}
          return res;
        };
      }
      if (typeof PN.roster === 'function') {
        const origRoster = PN.roster.bind(PN);
        PN.roster = function wrappedPartyRoster() {
          const r = origRoster();
          if (r && typeof r === 'object' && window.__ncPartyExpRule) {
            r.exp = window.__ncPartyExpRule;
          }
          return r;
        };
      }
    } catch (_) {}
  }

  window.__pmPartyGetters = {
    party() {
      const NC = window.NC;
      const PN = NC?.PartyNet;
      const game = NC?.game;
      const p = game?.player;
      ensurePartyRuleSyncHooks();
      if (!NC || !PN || !game || !p || !PN.inParty || !PN.inParty()) return null;
      const R = PN.roster && PN.roster();
      if (!R || !Array.isArray(R.mem) || R.mem.length === 0) return null;
      const meId = PN.me && PN.me();
      const myCh = window.getCurrentChannel();
      window.__ncKnownPartyNamesById = window.__ncKnownPartyNamesById || {};
      const myRealName = p.name || window.getCharacterName() || 'Hero';
      if (meId && myRealName) window.__ncKnownPartyNamesById[meId] = myRealName;

      const members = R.mem.map(peerId => {
        if (peerId === meId) {
          const mId = String(game.mapId || 'camp');
          return {
            id: peerId,
            name: myRealName,
            online: true,
            classId: String(p.job || 'traveler').toLowerCase(),
            mapId: mId,
            mapName: NC.MAPS?.[mId]?.name || mId,
            channel: myCh,
            level: Number(p.lv) || 1,
            buffs: []
          };
        }
        const m = (PN.member && PN.member(peerId)) || (NC.Net?.remotes?.get?.(peerId)) || {};
        const rawName = String(m.name || (PN.nameOf ? PN.nameOf(peerId) : '') || '').trim();
        if (rawName && rawName !== 'ผู้เล่น') {
          window.__ncKnownPartyNamesById[peerId] = rawName;
        }
        const fallbackLeaderName = (peerId === R.lead)
          ? (window.__pmPartySync?.leaderName || window.__ncPendingPartyLeader || '')
          : '';
        const resolvedName = (rawName && rawName !== 'ผู้เล่น')
          ? rawName
          : (window.__ncKnownPartyNamesById[peerId] || fallbackLeaderName || peerId);
        const mId = String(m.mapId || m.map || '');
        const mCh = Number(m.channel);
        return {
          id: peerId,
          name: resolvedName,
          online: m.online !== false,
          classId: String(m.job || 'traveler').toLowerCase(),
          mapId: mId || null,
          mapName: (mId && NC.MAPS?.[mId]?.name) ? NC.MAPS[mId].name : (mId || null),
          channel: Number.isFinite(mCh) && mCh > 0 ? mCh : null,
          level: Number(m.lv) || 1,
          buffs: []
        };
      });
      const leadMem = members.find(m => m.id === R.lead) || members[0];
      const leadName = (leadMem && leadMem.name && leadMem.name !== 'ผู้เล่น' && leadMem.name !== R.lead)
        ? leadMem.name
        : (window.__pmPartySync?.leaderName || window.__ncPendingPartyLeader || myRealName);
      const liveLootMode = R.loot ? ncLootCodeToMode(R.loot) : (window.__ncPartyLootMode || 'personal');
      const liveExpRule = window.__ncPartyExpRule || (R.exp === 'o' ? 'o' : 'e');
      const liveExpMode = ncExpCodeToMode(liveExpRule);
      const liveGroupMode = (R.grp === 's' || R.grp === 'g') ? R.grp : (window.__ncPartyGroupMode || 'g');
      window.__ncPartyLootMode = liveLootMode;
      window.__ncPartyExpMode = liveExpMode;
      window.__ncPartyGroupMode = liveGroupMode;
      return {
        leader: leadName,
        expMode: liveExpMode,
        lootMode: liveLootMode,
        groupMode: liveGroupMode,
        lootRule: R.loot || 'f',
        expRule: liveExpRule,
        lastInGameRuleChangeAt: window.__ncLastInGameRuleChangeAt || 0,
        evenShareAllowed: true,
        levelRange: 99,
        maxMembers: PN.MAX || 5,
        members
      };
    },
    invite() {
      const PN = window.NC?.PartyNet;
      const inc = PN?.incoming?.();
      if (inc && inc.kind !== 'request' && inc.name) {
        return { kind: 'party', from: inc.name, expiresAt: Date.now() + 25000 };
      }
      if (!window.__inPartyReadJs && window.__ncPendingPartyLeader) {
        return { kind: 'party', from: window.__ncPendingPartyLeader, expiresAt: Date.now() + 25000 };
      }
      return null;
    },
    follow() {
      return window.__ncPartyFollowTargetName || null;
    }
  };

  window.getGameRoom = function getGameRoom() {
    window.__inPartyReadJs = true;
    Promise.resolve().then(() => { window.__inPartyReadJs = false; });
    installScriptPlanPartyReadGuard();
    ensurePartyInviteToastBridge();

    const NC = window.NC;
    const game = NC?.game;
    const p = game?.player;
    if (!NC || !game || !p || !isEnteredWorld()) return null;

    const mySessionId = String(NC.PartyNet?.me?.() || p.id || 'self');
    const mapId = String(game.mapId || NC.Online?.snap?.mapId || 'camp');
    const rawMapTitle = NC.MAPS?.[mapId]?.name || NC.MAPS?.[mapId]?.title || mapId;
    const isTownOrSafeMap = Boolean(mapId === 'camp' || mapId === 'homefarm' || mapId === 'puppetroom' || NC.MAPS?.[mapId]?.camp);
    // Append " (เมืองหลวง)" on camp/homefarm/puppetroom so running party_api.js's isCityMapName() recognizes them as city maps!
    const mapTitle = isTownOrSafeMap ? `${rawMapTitle} (เมืองหลวง)` : rawMapTitle;
    const chNum = window.getCurrentChannel();
    const rawClassId = String(p.job || 'traveler').toLowerCase();
    const mePlayer = {
      name: p.name || window.getCharacterName() || null,
      level: Number(p.lv) || 1,
      jobLevel: Number(p.jobLv) || 1,
      classId: (rawClassId === 'bishop' || rawClassId === 'starsaint') ? 'priest' : rawClassId
    };

    return {
      sessionId: mySessionId,
      state: {
        mapId,
        displayName: mapTitle,
        channel: chNum,
        pk: false,
        players: {
          get(sid) {
            return sid === mySessionId ? mePlayer : null;
          }
        }
      },
      onMessageHandlers: {
        emit(ev, payload) {
          if (ev === 'party_follow') {
            window.__ncPartyFollowTargetName = (payload && payload.name) ? String(payload.name) : null;
            if (NC.Auto?.set) {
              NC.Auto.set.group = Boolean(window.__ncPartyFollowTargetName);
            }
          }
        }
      },
      send(topic, msg) {
        if (topic !== 'party' || !msg || typeof msg !== 'object') return;
        const PN = NC.PartyNet;
        if (!PN) return;

        if (msg.action === 'invite' && msg.name) {
          const targetName = String(msg.name).trim();
          const targetLow = targetName.toLowerCase();
          // 1. If target is on the same map/channel in NC.Net.remotes, send direct invite immediately
          if (NC.Net?.remotes) {
            for (const [peerId, r] of NC.Net.remotes.entries()) {
              if (r && r.name && String(r.name).trim().toLowerCase() === targetLow) {
                try {
                  if (NC.OnlineWorld?.send) NC.OnlineWorld.send({ action: 'party', kind: 'invite', targetId: peerId });
                  else PN.invite?.(peerId);
                } catch (_) {}
                break;
              }
            }
          }
          // 2. Also ensure an auto-accept Party Board post is active so target can join across any map/channel!
          ensureLeaderPartyBoardPostNow(game, p, 'TEAM:' + (p.name || 'Leader'));
          return;
        }

        if (msg.action === 'accept') {
          const wantLeader = window.__ncPendingPartyLeader || window.__pmPartySync?.leaderName || '';
          tryJoinLeaderPartyByNameNow(wantLeader, wantLeader ? ('TEAM:' + wantLeader) : '');
          return;
        }

        if (msg.action === 'leave') {
          try { PN.leave?.(); } catch (_) {}
          return;
        }

        if (msg.action === 'kick' && msg.name) {
          const kickLow = String(msg.name).trim().toLowerCase();
          const R = PN.roster && PN.roster();
          for (const peerId of (R?.mem || [])) {
            const mName = String(PN.member?.(peerId)?.name || PN.nameOf?.(peerId) || '').trim().toLowerCase();
            if (mName === kickLow) {
              try { PN.kick?.(peerId); } catch (_) {}
              break;
            }
          }
          return;
        }

        if (msg.action === 'summon') {
          try { PN.setGroup?.('g'); } catch (_) {}
          return;
        }

        if (msg.action === 'settings') {
          ensurePartyRuleSyncHooks();
          window.__inManagerPartySettingsCall = true;
          try {
            const R = PN.roster && PN.roster();
            if (msg.expMode !== undefined || msg.lootMode !== undefined) {
              const wantLoot = msg.lootMode !== undefined
                ? ncLootModeToCode(msg.lootMode)
                : (R?.loot || ncLootModeToCode(window.__ncPartyLootMode || 'personal'));
              const wantExp = msg.expMode !== undefined
                ? ncExpModeToCode(msg.expMode)
                : (window.__ncPartyExpRule || R?.exp || 'e');
              window.__ncPartyLootMode = ncLootCodeToMode(wantLoot);
              window.__ncPartyExpRule = wantExp;
              window.__ncPartyExpMode = ncExpCodeToMode(wantExp);
              try { PN.setRule?.(wantLoot, wantExp); } catch (_) {}
            }
            if (msg.groupMode !== undefined) {
              const wantGrp = ncNormalizeGroupCode(msg.groupMode);
              window.__ncPartyGroupMode = wantGrp;
              try { PN.setGroup?.(wantGrp); } catch (_) {}
            }
          } finally {
            window.__inManagerPartySettingsCall = false;
          }
        }
      }
    };
  };

  function runAutoLeastChannelTick(game, p) {
    // CRITICAL SAFETY (v2.0.0):
    // Disabled automatic "least-populated channel" switching when pressing START BOT or changing maps!
    // In Nightcamp, switching channels leaves the current match (`sock.leaveMatch`) and calls `nc_join`,
    // which risks kicking the character out to the Character Select queue if the server is full.
    // Party channel sync is handled exclusively by `runPlanAutoPartyTick` (members joining the Party Leader's channel).
    return;
  }

  function runPlanAutoPartyTick(game, p, plan) {
    const NC = window.NC;
    if (!NC || !game || !p) return;
    const nowMs = Date.now();
    if (nowMs - lastPartyTickAt < 2200) return;
    lastPartyTickAt = nowMs;

    const PN = NC.PartyNet;
    const PB = NC.PartyBoard;
    if (!PN) return;

    const inParty = Boolean(PN.inParty && PN.inParty());
    const members = (PN.members && PN.members()) || [];
    const others = (PN.others && PN.others()) || [];
    const maxMembers = PN.MAX || 5;
    const pmSync = (window.__pmPartySync && (nowMs - (window.__pmPartySync.updatedAt || 0) < 120000))
      ? window.__pmPartySync
      : null;
    // CRITICAL SAFETY (v2.0.0):
    // Only run automatic Party Channel/Map sync when this character is actively assigned to a Party in Manager (`pmSync && pmSync.leaderName`)!
    // If a solo player joins a random public party in-game or selects a Party Plan without enabling Manager's `👑 ปาร์ตี้`,
    // pressing START BOT must NEVER switch their channel or pull them to another map!
    if (!pmSync || !pmSync.leaderName) {
      window.__partyCoopAssistTarget = null;
      return;
    }
    const rawPc = window.__activePartySetup || (window.__planScriptEnabled && plan && plan.partyConfig && plan.partyConfig.enabled ? plan.partyConfig : null);

    // Build effective party config from either Front-Page `👑 ปาร์ตี้` Drawer (`pmSync`), Plan `partyConfig` (`rawPc`), or active in-game party!
    // Note: party_api.js sends followMode='none' by default (and when viaPriest is true), so in Nightcamp we default
    // groupMode to 'g' (เกาะกลุ่มด้ายแดง & ช่วยกันทำเควส) unless the party's expMode is explicitly set to 'individual'!
    const isExplicitSoloInParty = Boolean(
      window.__ncPartyGroupMode === 's' ||
      window.__ncPartyExpMode === 'individual' ||
      (pmSync && pmSync.followMode === 'independent')
    );
    const curRoster = PN.roster && PN.roster();
    const effLootCode = curRoster?.loot || ncLootModeToCode(window.__ncPartyLootMode || 'personal');
    const effGroupCode = (curRoster?.grp === 's' || curRoster?.grp === 'g')
      ? curRoster.grp
      : (window.__ncPartyGroupMode || (isExplicitSoloInParty ? 's' : 'g'));
    let pc = rawPc;
    if (!pc || pc.enabled === false) {
      if (pmSync && pmSync.leaderName) {
        const myName = String(p.name || window.getCharacterName() || '').trim();
        const isLead = myName.toLowerCase() === String(pmSync.leaderName).trim().toLowerCase();
        const isSup = Boolean(NC.isSupportJob && NC.isSupportJob(p.job));
        pc = {
          enabled: true,
          role: isLead ? 'leader' : (isSup ? 'support' : 'member'),
          partyTag: pmSync.leaderName,
          lootMode: effLootCode,
          groupMode: effGroupCode,
          minLevel: 1,
          syncChannelAndMap: true,
          supFight: true,
          supHealPct: 75
        };
      } else if (inParty && others.length > 0) {
        const isLead = Boolean(PN.isLeader && PN.isLeader());
        const isSup = Boolean(NC.isSupportJob && NC.isSupportJob(p.job));
        pc = {
          enabled: true,
          role: isLead ? 'leader' : (isSup ? 'support' : 'member'),
          partyTag: '',
          lootMode: effLootCode,
          groupMode: effGroupCode,
          minLevel: 1,
          syncChannelAndMap: true,
          supFight: true,
          supHealPct: 75
        };
      }
    } else if (inParty || pmSync) {
      pc = Object.assign({}, pc, {
        lootMode: effLootCode,
        groupMode: effGroupCode
      });
    }

    if (!pc || pc.enabled === false) {
      window.__partyCoopAssistTarget = null;
      return;
    }
    const baseLv = Number(p.lv) || 1;
    if (baseLv < (Number(pc.minLevel) || 1)) return;

    const isActualLeader = Boolean(inParty && PN.isLeader && PN.isLeader());
    const myCharName = String(p.name || window.getCharacterName() || '').trim();
    const configuredLeaderName = String((pmSync && pmSync.leaderName) || '').trim();
    const isConfiguredMember = Boolean(configuredLeaderName && myCharName && myCharName.toLowerCase() !== configuredLeaderName.toLowerCase());
    const role = isConfiguredMember
      ? (Boolean(NC.isSupportJob && NC.isSupportJob(p.job)) ? 'support' : 'member')
      : (isActualLeader ? 'leader' : String(pc.role || 'member').toLowerCase());
    const tag = String(configuredLeaderName || pc.partyTag || '').trim();
    const tagLow = tag.toLowerCase();

    // If a member accidentally inherited party leadership after the configured leader disconnected, remove any ghost PartyBoard post!
    if (isConfiguredMember && isActualLeader && PB && PB.state?.view?.me?.post && typeof PB.del === 'function') {
      try { PB.del(); } catch (_) {}
    }

    // 1. LEADER ROLE: Form party, approve requests, set loot/group rules, and keep an auto-accept Party Board notice active!
    if (role === 'leader') {
      const inc = PN.incoming && PN.incoming();
      if (inc && inc.kind === 'request' && typeof PN.answer === 'function') {
        try { PN.answer(true); } catch (_) {}
      }
      if (inParty && isActualLeader) {
        const R = PN.roster && PN.roster();
        const wantLoot = pc.lootMode || 'f';
        const wantGrp = pc.groupMode || 'g';
        if (R && R.loot !== wantLoot && typeof PN.setRule === 'function') {
          try { PN.setRule(wantLoot); } catch (_) {}
        }
        if (R && R.grp !== wantGrp && typeof PN.setGroup === 'function') {
          try { PN.setGroup(wantGrp); } catch (_) {}
        }
      }
      if (PB && PB.online && members.length < maxMembers) {
        ensureLeaderPartyBoardPostNow(game, p, tag || ('TEAM:' + (p.name || 'Leader')));
      }
    } else {
      // 2. MEMBER / SUPPORT ROLE: Accept invites & join matching Party Board post by tag/leader name
      const inc = PN.incoming && PN.incoming();
      if (inc && inc.kind !== 'request' && typeof PN.answer === 'function') {
        const fromName = String(inc.name || '').trim().toLowerCase();
        if (!tagLow || fromName === tagLow || fromName.includes(tagLow)) {
          try { PN.answer(true); } catch (_) {}
          return;
        }
      }
      if (!inParty || members.length <= 1) {
        tryJoinLeaderPartyByNameNow(tag, tag);
        return;
      }
    }

    // 3. ALL PARTY MEMBERS (Leader + Members) when in an active party with teammates:
    if (others.length === 0) {
      window.__partyCoopAssistTarget = null;
      return;
    }

    if (NC.Auto && NC.Auto.set) {
      const isSupJob = Boolean(NC.isSupportJob && NC.isSupportJob(p.job));
      if ((role === 'support' || isSupJob) && isSupJob) {
        NC.Auto.set.mode = 'support';
        NC.Auto.set.supFight = pc.supFight !== false;
        NC.Auto.set.supHeal = Math.max(0.3, Math.min(0.95, (Number(pc.supHealPct) || 75) / 100));
        NC.Auto.set.supWarp = true;
        NC.Auto.set.group = true;
      } else {
        if (NC.Auto.set.mode === 'support' && !isSupJob) NC.Auto.set.mode = 'farm';
        NC.Auto.set.group = (pc.groupMode !== 's');
      }
    }

    // Never attempt channel or map sync while inside `puppetroom` (Lv.1 tutorial room), `StoryRoom`, `Trial`, `autoSellTrip`, or when dead!
    if (game.mapId === 'puppetroom' || NC.StoryRoom?.inRoom?.() || NC.Trial?.inRoom?.() || autoSellTrip || (p.dead > 0) || channelSwitchInFlight) {
      if (NC.StoryRoom?.inRoom?.() || NC.Trial?.inRoom?.()) {
        window.__partyCoopAssistTarget = null;
      }
      return;
    }

    const R = PN.roster && PN.roster();
    const leadId = R && R.lead;
    const meId = PN.me && PN.me();
    const leadRec = (leadId && leadId !== meId && PN.member) ? PN.member(leadId) : null;

    // Remember the Party Leader's latest valid outdoor farming map so teammates don't bounce maps when Leader visits `camp`
    if (role === 'leader') {
      if (game.mapId && game.mapId !== 'camp' && game.mapId !== 'puppetroom' && game.mapId !== 'homefarm' && !(game.mapId === 'farm' && baseLv >= 12)) {
        window.__lastKnownLeaderOutdoorMap = game.mapId;
      }
    } else if (leadRec && leadRec.online !== false && leadRec.mapId && !leadRec.story) {
      const lMap = String(leadRec.mapId);
      const lLv = Number(leadRec.lv) || 1;
      if (lMap !== 'camp' && lMap !== 'puppetroom' && lMap !== 'homefarm' && !(lMap === 'farm' && lLv >= 12)) {
        window.__lastKnownLeaderOutdoorMap = lMap;
      }
    }

    // 3A. ALWAYS Sync Channel (`CH`) with the Party Majority / Assisted Teammate / Leader
    if (pc.syncChannelAndMap !== false && isChannelledOutdoorMap(game)) {
      const maj = getPartyMajorityOutdoorChannel();
      const coopCh = (window.__partyCoopAssistTarget && window.__partyCoopAssistTarget.channel && /^\d+$/.test(String(window.__partyCoopAssistTarget.channel)))
        ? String(window.__partyCoopAssistTarget.channel)
        : '';
      let targetCh = coopCh || ((maj && maj.channel)
        ? String(maj.channel)
        : (!isActualLeader && leadRec && leadRec.online !== false && leadRec.channel
            ? String(leadRec.channel)
            : (pmSync && typeof pmSync.settledChannel === 'number' ? String(pmSync.settledChannel) : '')));
      if (!targetCh && Array.isArray(R?.mem)) {
        for (const pid of R.mem) {
          if (pid === meId) continue;
          const m = PN.member && PN.member(pid);
          if (m && m.online !== false && m.channel && /^\d+$/.test(String(m.channel))) {
            targetCh = String(m.channel);
            break;
          }
        }
      }
      const myCh = String(NC.OnlineChannels?.current?.() || '');
      const selfSnap = NC.Online?.snap?.self || {};
      const moveWaitLeftMs = ((+selfSnap.channelMoveAt || 0) + 300000) - nowMs;
      if (targetCh && myCh && targetCh !== myCh && moveWaitLeftMs <= 18000 && nowMs - lastPartyChannelMoveAt > 14000) {
        lastPartyChannelMoveAt = nowMs;
        window.moveToChannel(Number(targetCh), 20000).catch(() => {});
        return;
      }
    }

    // 3B. CO-OP PARTY QUEST SYNC (`เดินเควสพร้อมกันทั้งตี้ — รอและช่วยเพื่อนที่อยู่แมพเควสต่ำกว่าหรือห้องบอสเนื้อเรื่องให้ผ่านพร้อมกัน`)
    //     - Only active while in Quest mode (`window.__planActiveModeType !== 'change_map' && window.__planActiveModeType !== 'auto_click'`).
    //       Once the plan switches to `change_map` (e.g. Lv.12+ Zombie Farming route), all party members farm the planned Zombie map together!
    if (window.__smartAutoQuestEnabled && pc.groupMode !== 's' && window.__planActiveModeType !== 'change_map' && window.__planActiveModeType !== 'auto_click') {
      window.__partyPeerMapState = window.__partyPeerMapState || {};
      const myRank = OUTDOOR_QUEST_MAP_RANK[game.mapId] || 0;
      const myQuestMapId = getMyActiveQuestOutdoorMapId(game, p);
      const myQuestRank = OUTDOOR_QUEST_MAP_RANK[myQuestMapId] || myRank;
      const myStoryBoss = NC.StoryRoom?.questBoss?.() || '';
      const myStoryBossMap = (myStoryBoss && typeof NC.StoryRoom?.roomMap === 'function') ? NC.StoryRoom.roomMap(myStoryBoss) : '';

      let earliestTeammate = null;
      let minRank = Infinity;
      let minLvOnRank = Infinity;

      for (const pid of (R?.mem || [])) {
        if (pid === meId) continue;
        const m = PN.member && PN.member(pid);
        if (!m || m.online === false) continue;

        const storyBossId = String(m.story || '');
        // Nightcamp server rule: a player who already cleared a Story Boss (`myStoryBoss !== storyBossId`) cannot re-enter that boss room
        // ("คุณผ่านบอสเนื้อเรื่องตัวนี้แล้ว เข้าซ้ำไม่ได้"). Skip teammates currently inside a Story Boss Room unless we share that same Story Boss objective!
        if (storyBossId && myStoryBoss !== storyBossId) continue;
        const storyMapId = (storyBossId && typeof NC.StoryRoom?.roomMap === 'function')
          ? (NC.StoryRoom.roomMap(storyBossId) || String(m.mapId || ''))
          : '';
        const mMap = storyMapId || String(m.mapId || '');
        const rnk = OUTDOOR_QUEST_MAP_RANK[mMap] || 0;
        if (rnk <= 0) continue;

        const prevSt = window.__partyPeerMapState[pid];
        if (!prevSt || prevSt.mapId !== mMap) {
          window.__partyPeerMapState[pid] = { mapId: mMap, enteredAt: nowMs };
        }
        const dwellMs = nowMs - (window.__partyPeerMapState[pid]?.enteredAt || nowMs);
        const mLv = Number(m.lv) || 99;
        const maxQuestLvForMap = OUTDOOR_MAP_MAX_QUEST_LV[mMap] || 99;

        // If teammate is NOT inside a shared Story Boss Room, filter out transit maps (`farm`, etc.)
        if (!storyBossId) {
          // 1) If teammate's level exceeds the max quest level of `mMap` + 1 (e.g. Lv.18-21 walking through `farm` [max Lv.9]),
          //    they are 100% just transiting out of `camp`!
          if (mLv > maxQuestLvForMap + 1) continue;
          // 2) If `mMap === 'meadow'` and we already passed `MQ15` (`!myStoryBoss && baseLv >= 19`), do not pull back to `meadow` for a teammate's solo Story Boss!
          if (mMap === 'meadow' && !myStoryBoss && baseLv >= 19 && mLv >= 18) continue;
          // 3) Require 15s dwell time on `mMap` before pulling teammates from other maps (unless already assisting this peer on `mMap`)
          const alreadyAssistingThisPeer = Boolean(
            window.__partyCoopAssistTarget &&
            window.__partyCoopAssistTarget.id === pid &&
            window.__partyCoopAssistTarget.mapId === mMap
          );
          if (!alreadyAssistingThisPeer && dwellMs < 15000) continue;
          // 4) Never pull a lower-level player away from their own quest to follow a higher-level player
          if (mLv > baseLv + 1) continue;
        }

        // Story Boss room assist gets top priority; otherwise lowest outdoor quest map rank
        const isBetter = storyBossId
          ? (!earliestTeammate || !earliestTeammate.story || rnk < minRank)
          : ((!earliestTeammate || !earliestTeammate.story) && (rnk < minRank || (rnk === minRank && mLv < minLvOnRank)));

        if (isBetter) {
          minRank = rnk;
          minLvOnRank = mLv;
          earliestTeammate = {
            id: pid,
            peerId: pid,
            name: m.name || window.__ncKnownPartyNamesById?.[pid] || 'เพื่อนในตี้',
            mapId: mMap,
            rank: rnk,
            lv: mLv,
            x: m.x,
            y: m.y,
            channel: m.channel,
            story: storyBossId || null
          };
        }
      }

      const inLifeOrDialog = Boolean(
        isAnyQuestDialogOpen() || p.lifeAct || p.fishAct ||
        NC.StoryRoom?.inRoom?.() || NC.Trial?.inRoom?.() ||
        NC.QuestAuto?.job?.kind === 'garden' || NC.QuestAuto?.job?.kind === 'gather'
      );
      const isJustGrindingLevelGate = Boolean(
        NC.QuestAuto?.job?.kind === 'level' ||
        /ฟาร์มให้ถึง\s*Lv|ฝึกให้ถึง\s*Lv/i.test(String(NC.QuestAuto?.note || ''))
      );
      const isTimeOfDayGated = /ของเควสดรอปเฉพาะ/.test(String(NC.QuestAuto?.note || ''));
      // If we are on our own Story Boss map (e.g. MQ15 on meadow) and earliestTeammate is also on this same map, let our own QuestAuto/StoryRoom entry run!
      const onOwnStoryBossMap = Boolean(myStoryBossMap && game.mapId === myStoryBossMap && (!earliestTeammate || earliestTeammate.mapId === myStoryBossMap));
      const doingOwnEqualOrLowerQuest = Boolean(
        !earliestTeammate?.story &&
        myQuestRank > 0 &&
        earliestTeammate &&
        myQuestRank <= earliestTeammate.rank &&
        !isJustGrindingLevelGate &&
        !isTimeOfDayGated
      );

      if (!earliestTeammate || inLifeOrDialog || onOwnStoryBossMap || doingOwnEqualOrLowerQuest) {
        window.__partyCoopAssistTarget = null;
      } else if (
        earliestTeammate.story ||
        myQuestRank > earliestTeammate.rank ||
        myRank > earliestTeammate.rank ||
        ((isJustGrindingLevelGate || isTimeOfDayGated) && game.mapId !== earliestTeammate.mapId)
      ) {
        window.__partyCoopAssistTarget = earliestTeammate;
      } else {
        window.__partyCoopAssistTarget = null;
      }
    } else {
      window.__partyCoopAssistTarget = null;
    }

    // 3C. When Smart Auto-Quest is OFF (Farm Mode): Members sync directly to Leader's (or Party Anchor's) Map!
    if (!window.__smartAutoQuestEnabled && pc.syncChannelAndMap !== false) {
      let targetPartyMap = (leadRec && leadRec.online !== false && leadRec.mapId && !leadRec.story) ? leadRec.mapId : '';
      let targetPartyLeaderName = leadRec?.name || 'หัวตี้';
      if ((!targetPartyMap || targetPartyMap === 'camp' || targetPartyMap === 'puppetroom' || targetPartyMap === 'homefarm') && Array.isArray(R?.mem)) {
        for (const pid of R.mem) {
          if (pid === meId) continue;
          const m = PN.member && PN.member(pid);
          if (m && m.online !== false && !m.story && m.mapId && OUTDOOR_QUEST_MAP_RANK[m.mapId]) {
            targetPartyMap = m.mapId;
            targetPartyLeaderName = m.name || 'เพื่อนในตี้';
            break;
          }
        }
      }
      if (targetPartyMap && targetPartyMap !== 'camp' && targetPartyMap !== 'puppetroom' && targetPartyMap !== 'homefarm' && targetPartyMap !== game.mapId) {
        window.__targetFarmMap = targetPartyMap;
        if (!NC.Travel?.on || NC.Travel.target?.map !== targetPartyMap) {
          tryWarpOrWalkToMap(game, targetPartyMap, { map: targetPartyMap, name: targetPartyLeaderName }, targetMapWarpState);
        }
        return;
      }
    }

    // 3D. RED THREAD (`ด้ายแดง` 600px) SAME-MAP CLUSTER LEASH & FOCUS-FIRE:
    //     Whenever 2+ party members are on the same outdoor map, pick a deterministic Same-Map Anchor:
    //     1) Co-op assisted teammate on this map -> 2) Party Leader on this map -> 3) Lowest-level/first teammate on this map.
    //     All other teammates on this map stay within 350px of that anchor so the 600px Red Thread never breaks!
    if (pc.groupMode !== 's' && isChannelledOutdoorMap(game) && !isAnyQuestDialogOpen() && !(p.lifeAct || p.fishAct)) {
      let anchorPeerId = null;
      if (window.__partyCoopAssistTarget && window.__partyCoopAssistTarget.mapId === game.mapId && window.__partyCoopAssistTarget.id !== meId) {
        anchorPeerId = window.__partyCoopAssistTarget.id;
      } else if (leadId && leadId !== meId) {
        const lMem = PN.member && PN.member(leadId);
        const lRem = NC.Net?.remotes?.get?.(leadId);
        if ((lMem && lMem.online !== false && lMem.mapId === game.mapId) || (lRem && (!lRem.map || lRem.map === game.mapId))) {
          anchorPeerId = leadId;
        }
      }
      if (!anchorPeerId && Array.isArray(R?.mem)) {
        // Pick deterministic anchor among all party members currently on `game.mapId` (lowest level, then peerId)
        const sameMapPeers = [];
        for (const pid of R.mem) {
          if (pid === meId) {
            sameMapPeers.push({ id: meId, lv: Number(p.lv) || 1 });
          } else {
            const m = PN.member && PN.member(pid);
            const r = NC.Net?.remotes?.get?.(pid);
            if ((m && m.online !== false && m.mapId === game.mapId) || (r && (!r.map || r.map === game.mapId))) {
              sameMapPeers.push({ id: pid, lv: Number(m?.lv || r?.lv) || 1 });
            }
          }
        }
        if (sameMapPeers.length >= 2) {
          sameMapPeers.sort((a, b) => (a.lv - b.lv) || String(a.id).localeCompare(String(b.id)));
          if (sameMapPeers[0].id !== meId) {
            anchorPeerId = sameMapPeers[0].id;
          }
        }
      }

      if (anchorPeerId) {
        const rem = NC.Net?.remotes?.get?.(anchorPeerId);
        const mem = PN.member && PN.member(anchorPeerId);
        const sameMap = (rem && (!rem.map || rem.map === game.mapId)) || (mem && mem.mapId === game.mapId);
        const tx = Number.isFinite(rem?.x) ? rem.x : (Number.isFinite(mem?.x) ? mem.x : null);
        const ty = Number.isFinite(rem?.y) ? rem.y : (Number.isFinite(mem?.y) ? mem.y : null);
        if (sameMap && tx !== null && ty !== null) {
          const dist = Math.hypot(tx - p.x, ty - p.y);
          if (dist > 360 && dist < 4500 && !NC.Travel?.on) {
            try {
              NC.Travel?.go?.(game, {
                map: game.mapId,
                x: Math.round(tx),
                y: Math.round(ty),
                r: 170,
                name: (mem?.name || rem?.name || 'รวมกลุ่มด้ายแดง')
              });
            } catch (_) {}
          }
        }
      }
    }
  }

  function isQuestCompleted(p, questId) {
    if (!questId || questId === 'ALL') return false;
    const NC = window.NC;
    if (NC?.Quests?.isDone && NC.Quests.isDone(p, questId)) return true;
    if (NC?.Quests?.done && NC.Quests.done(questId)) return true;
    if (p?.questsDone && p.questsDone[questId]) return true;
    if (Array.isArray(p?.doneQuests) && p.doneQuests.includes(questId)) return true;
    return false;
  }

  function runPlanEngineTick() {
    if (!window.__isBotRunning || !isEnteredWorld()) return;
    const NC = window.NC;
    const game = NC?.game;
    const p = game?.player;
    if (!NC || !game || !p) return;

    // Populate dynamic map dropdown & update live potion/sell stock display
    try {
      populateTargetFarmMapSelect();
      updatePotionStockDisplay(p);
      updateSellLiveDisplay(p);
    } catch (_) {}

    // 0. Always run Upgrade BOT AI hooks, Unlimited 24/7 Life-Skill hooks, Party Read Guard & Update Popup Dismisser
    try {
      if (NC.Auto?.set) {
        const wantLoot = !window.__noLootMode;
        if (NC.Auto.set.loot !== wantLoot) {
          NC.Auto.set.loot = wantLoot;
        }
      }
      runUpgradeBotAiTick(game, p);
      installLifeSkillUnlimitedHooks();
      installScriptPlanPartyReadGuard();
      ensurePartyInviteToastBridge();
      try {
        if (window.__smartAutoQuestEnabled || window.__autoFarmLv20Config?.enabled) {
          runAutoMailClaimAndExpBoosts(game, p);
        }
      } catch (_) {}
      const upCard = document.querySelector('.kw-win.up-card:not([hidden])');
      if (upCard && upCard.offsetWidth > 0) {
        const laterBtn = upCard.querySelector('button.up-later:not([disabled]):not([hidden])');
        if (laterBtn && laterBtn.offsetWidth > 0) laterBtn.click();
      }
    } catch (_) {}

    // 0b. Highest-priority: Auto-Respawn when character dies (`หมดแรง` / `กลับค่าย`) & Fast Custom HP/SP Auto-Drink
    try {
      if (runAutoRespawnTick(game, p)) return;
      runCustomPotionDrinkTick(game, p);
    } catch (_) {}

    // 0b2. Hold combat off for 5.2s when window.moveToChannel() is waiting for out-of-combat cooldown (`ออกจากการต่อสู้ก่อนสักครู่`)
    if (window.__isSwitchingChannelUntil && Date.now() < window.__isSwitchingChannelUntil) {
      try {
        if (NC.Auto?.on) {
          if (typeof NC.Auto.stop === 'function') NC.Auto.stop(game);
          else NC.Auto.toggle?.(game);
        }
      } catch (_) {}
      return;
    }

    // 0c. Smart Gear: Automatically equip better weapons/armor/accessories in bag/owned matched to character job & stats
    try {
      runSmartGearTick(game, p, false);
    } catch (_) {}

    // 0d. If character is inside `puppetroom` (Lv.1 intro tutorial room), ALWAYS run Quest Unblocker & QuestAuto to exit puppetroom!
    const inPuppetTutorial = (game.mapId === 'puppetroom');

    // 1. High-priority maintenance: Auto-Sell & Potion Craft/Buy Trip when weight >= threshold or potions < min
    if (!inPuppetTutorial) {
      try {
        if (runAutoSellTripTick(game, p)) return;
      } catch (_) {}
    }

    const plan = window.__currentScriptPlan || DEFAULT_NC_WOLF_PLAN;
    try { upgradeBuiltinPlanZombieTriggersIfNeeded(plan); } catch (_) {}
    const smartQuestOn = Boolean(window.__smartAutoQuestEnabled || inPuppetTutorial);
    const planOn = Boolean(window.__planScriptEnabled);
    const baseLv = Number(p.lv) || 1;
    const jobLv = Number(p.jobLv) || 1;
    const curJob = String(p.job || 'traveler').toLowerCase();

    // 1b. Whenever Plan Script is ON, always run Auto Job Change & Auto Stat/Skill Allocation
    if (planOn) {
      try {
        runAutoJobChange(game, p, plan);
        runAutoStatAndSkill(game, p, plan);
      } catch (_) {}
    }

    // 1b1. Pre-evaluate Plan Script Timeline Triggers so Party Sync & Quest Engine know whether we are in `change_map` / `auto_click` mode!
    const hasExplicitTargetMap = Boolean(window.__targetFarmMap && window.__targetFarmMap !== 'auto');
    let activePlanMode = null;
    let planStateRef = null;

    if (planOn && !inPuppetTutorial) {
      const st = loadPlanState(plan);
      planStateRef = st;
      const triggers = Array.isArray(plan.triggers) ? plan.triggers : [];
      const gold = Number(p.gold ?? p.coins) || 0;
      let latestMetMode = null;
      let resetSkillRoundCounter = 0;
      let resetStatRoundCounter = 0;

      for (const trig of triggers) {
        if (!trig || !trig.id) continue;
        const acts = Array.isArray(trig.actions) ? trig.actions : [];
        const trigResetRoundMap = new Map();
        const trigResetStatRoundMap = new Map();
        for (const act of acts) {
          if (act && act.type === 'reset_skills') {
            resetSkillRoundCounter++;
            trigResetRoundMap.set(act, resetSkillRoundCounter);
          } else if (act && act.type === 'reset_stats') {
            resetStatRoundCounter++;
            trigResetStatRoundMap.set(act, resetStatRoundCounter);
          }
        }

        let met = false;
        if (trig.type === 'zeny') {
          met = gold >= (Number(trig.targetZeny) || 1);
        } else if (trig.type === 'job_level') {
          const wantCls = String(trig.classId || '').toLowerCase();
          const wantTier = (wantCls === 'novice' || wantCls === 'traveler') ? 0 : (NC.JOBS?.[wantCls]?.tier ?? -1);
          const curTier = NC.JOBS?.[curJob]?.tier || 0;
          const clsMatch = !wantCls || wantCls === curJob || (wantCls === 'novice' && curJob === 'traveler') || (wantCls === 'traveler' && curJob === 'novice');
          const alreadyPromotedPast = wantTier >= 0 && curTier > wantTier && (wantTier === 0 || (typeof NC.jobLine === 'function' ? (NC.jobLine(curJob) || []).includes(wantCls) : true));
          met = (clsMatch && jobLv >= (Number(trig.targetLevel) || 1)) || alreadyPromotedPast;
        } else {
          met = baseLv >= (Number(trig.targetLevel) || 1);
        }

        if (!met) continue;

        const isFirstTime = !st.done[trig.id];
        if (isFirstTime) {
          st.done[trig.id] = Date.now();
        }
        for (const act of acts) {
          if (!act || !act.type) continue;
          const resetRoundForAct = act.type === 'reset_skills' ? (trigResetRoundMap.get(act) || 1) : 0;
          const needsCatchupResetRound = resetRoundForAct > 0 &&
            (Number(st.activeSkillResetRound) || 0) < resetRoundForAct &&
            (Number(st.pendingSkillResetRound) || 0) < resetRoundForAct;
          const resetStatRoundForAct = act.type === 'reset_stats' ? (trigResetStatRoundMap.get(act) || 1) : 0;
          const needsCatchupStatResetRound = resetStatRoundForAct > 0 &&
            (Number(st.activeStatResetRound) || 0) < resetStatRoundForAct;
          if (isFirstTime || needsCatchupResetRound || needsCatchupStatResetRound) {
            if (act.type === 'equip_best' || act.type === 'equip_item') {
              equipBestFromBag(game, p, act.itemName || '');
            } else if (act.type === 'change_class') {
              const wantJob = String(act.targetClass || '').toLowerCase();
              if (wantJob && NC.canChangeJob?.(p) && (NC.nextJobs?.(p) || []).includes(wantJob)) {
                const prevTier = NC.JOBS?.[p.job]?.tier || 0;
                NC.HUD?.changeJob?.(wantJob);
                setTimeout(() => {
                  equipBestFromBag(game, p, '');
                  runAutoStatAndSkill(game, p, plan);
                  syncOptimalHotbar(game, p, plan, true);
                  if (prevTier >= 1 && plan.autoResetSkillOnJobChange !== false && shouldAutoResetSkillAfterClassChange(p, plan)) {
                    pendingFreeClassSkillResetJob = String(p.job || '').toLowerCase();
                    forcePotionTripRequested = true;
                    lastAutoSellDoneAt = 0;
                  }
                }, 700);
              }
            } else if (act.type === 'reset_stats') {
              const rNo = resetStatRoundForAct || 1;
              executePlanResetStatsNow(game, p, plan, st, rNo, act.resetMode || 'auto');
            } else if (act.type === 'reset_skills') {
              const rNo = resetRoundForAct || 1;
              const spentNow = ((NC.skillPoints?.(p) || 0) - (NC.skillLeft?.(p) || 0));
              const roundsArr = Array.isArray(plan.skillBuild?.resetRounds) ? plan.skillBuild.resetRounds : [];
              const targetRoundObj = roundsArr[rNo - 1] || null;
              let hasExcessOutsideRound = false;
              if (spentNow > 0 && targetRoundObj) {
                const wantBySk = {};
                if (Array.isArray(targetRoundObj.skillPointQueue) && targetRoundObj.skillPointQueue.length > 0) {
                  for (const sid of targetRoundObj.skillPointQueue) wantBySk[sid] = (wantBySk[sid] || 0) + 1;
                } else if (targetRoundObj.plannedLevels && typeof targetRoundObj.plannedLevels === 'object') {
                  for (const [sid, val] of Object.entries(targetRoundObj.plannedLevels)) wantBySk[sid] = Math.max(0, Number(val) || 0);
                }
                for (const [sid, rawLv] of Object.entries(p.skills || {})) {
                  const curLv = Number(rawLv) || 0;
                  const freeLv = typeof NC.freeSkillLv === 'function' ? (NC.freeSkillLv(sid) || 0) : 0;
                  const curSpent = Math.max(0, curLv - freeLv);
                  if (curSpent > (Number(wantBySk[sid]) || 0)) {
                    hasExcessOutsideRound = true;
                    break;
                  }
                }
              } else if (spentNow > 0 && isFirstTime) {
                hasExcessOutsideRound = true;
              }
              if (spentNow <= 0 || !hasExcessOutsideRound) {
                st.activeSkillResetRound = rNo;
                st.pendingSkillResetRound = 0;
                savePlanState(plan, st);
                runAutoStatAndSkill(game, p, plan);
                syncOptimalHotbar(game, p, plan, true);
              } else {
                st.pendingSkillResetRound = rNo;
                st.pendingSkillResetMode = act.resetMode || 'auto';
                savePlanState(plan, st);
                pendingFreeClassSkillResetJob = String(p.job || '').toLowerCase();
                forcePotionTripRequested = true;
                lastAutoSellDoneAt = 0;
              }
            } else if (act.type === 'party_setup') {
              window.__activePartySetup = Object.assign({ enabled: true, minLevel: 1 }, act);
              plan.partyConfig = Object.assign({}, plan.partyConfig || {}, window.__activePartySetup);
            } else if (act.type === 'sell_trip' && isFirstTime && !autoSellTrip) {
              forceSellTripRequested = true;
              lastAutoSellDoneAt = 0;
            }
          }
          if (act.type === 'auto_quest' || act.type === 'change_map' || act.type === 'auto_click' || act.type === 'life_gather') {
            if (act.type === 'life_gather') {
              const wantQ = Number(act.qty) || 10;
              if (countBagItem(p, act.itemId || 'lf_birch') >= wantQ) continue;
            }
            latestMetMode = Object.assign({}, act);
          }
        }
      }

      if (latestMetMode) {
        st.activeMode = Object.assign({ triggeredAt: st.activeMode?.triggeredAt || Date.now() }, latestMetMode);
      }
      savePlanState(plan, st);

      // If any newly evaluated trigger requested a Camp Skill-Reset / Potion / Sell trip, start that trip NOW before warping to a new map!
      if ((forcePotionTripRequested || forceSellTripRequested || autoSellTrip) && !inPuppetTutorial) {
        try {
          if (runAutoSellTripTick(game, p)) return;
        } catch (_) {}
      }

      activePlanMode = st.activeMode;
      if (!activePlanMode) {
        if (plan.autoClick?.enabled) {
          activePlanMode = {
            type: 'auto_click',
            target: plan.autoClick.targetButton || 'พาไป ที่ล่าตามเลเวล',
            intervalMs: Number(plan.autoClick.intervalMs) || 30000
          };
        } else if (plan.autoQuestEnabled !== false) {
          activePlanMode = { type: 'auto_quest', questMode: 'all' };
        }
      }
    }
    window.__planActiveModeType = (planOn && !inPuppetTutorial && activePlanMode?.type) ? activePlanMode.type : '';

    // 1b2. Always run Party Sync & Automatic Least-Populated Channel Selection (works with both Front-Page `👑 ปาร์ตี้` Drawer and Plan Party!)
    if (!inPuppetTutorial) {
      try {
        runPlanAutoPartyTick(game, p, plan);
        runAutoLeastChannelTick(game, p);
      } catch (_) {}
    }

    // 1c. Auto-Farm Lv.20 & Auto-Trade Engine (claims mail, uses EXP/Job boosts, and at Lv.20+ returns to Camp to trade/receive coins)
    try {
      if (runAutoFarmLv20Tick(game, p)) return;
    } catch (_) {}

    // 1d. If Plan Script has an active `change_map`, `auto_click`, or `life_gather` trigger (or bounded `auto_quest` that has completed),
    //     execute the Plan Farm Map BEFORE running `unblockNightcampQuestStalls` or `StoryRoom` / `Co-op Quest Assist`!
    if (planOn && !inPuppetTutorial) {
      // Plan Mode: `auto_click` (e.g. "พาไป ที่ล่าตามเลเวล")
      if (activePlanMode && activePlanMode.type === 'auto_click') {
        window.__partyCoopAssistTarget = null;
        const clickTarget = activePlanMode.target || plan.autoClick?.targetButton || 'พาไป ที่ล่าตามเลเวล';
        window.__planActiveTargetMap = resolveNightcampMapId(clickTarget, p, game);
        runSpecificFarmMapTick(game, p, clickTarget, null, 'Plan ที่ล่าตามเลเวล');
        return;
      }

      // Plan Mode: `change_map` (runs for both Party Set `ซอมบี้ชาวนา` plans, Solo Puppeteer, and custom plans!)
      if (activePlanMode && activePlanMode.type === 'change_map') {
        // Wait for Class 1 job change if still a Lv.10+ Traveler before heading to Lv.18+ Zombie maps
        if (curJob === 'traveler' && jobLv >= 10 && plan.class1Target && NC.canChangeJob?.(p)) {
          runAutoJobChange(game, p, plan);
        }
        window.__partyCoopAssistTarget = null;
        let targetMapToFarm = activePlanMode.targetMap || 'graveyard';
        const pmSync = window.__pmPartySync;
        const myNameLow = String(p.name || window.getCharacterName?.() || '').trim().toLowerCase();
        const cfgLeadLow = String((pmSync && pmSync.leaderName) || '').trim().toLowerCase();
        const isPartyFollower = Boolean(
          isPartySystemActiveNow() &&
          plan.partyConfig?.groupMode !== 's' &&
          plan.partyConfig?.syncChannelAndMap !== false &&
          ((cfgLeadLow && myNameLow && myNameLow !== cfgLeadLow) ||
           (!cfgLeadLow && plan.partyConfig?.role && plan.partyConfig.role !== 'leader'))
        );
        if (isPartyFollower && baseLv >= 12 && curJob !== 'traveler' && window.__lastKnownLeaderOutdoorMap && NC.MAPS?.[window.__lastKnownLeaderOutdoorMap]) {
          targetMapToFarm = window.__lastKnownLeaderOutdoorMap;
        }
        window.__planActiveTargetMap = resolveNightcampMapId(targetMapToFarm, p, game);
        runSpecificFarmMapTick(game, p, targetMapToFarm, activePlanMode.targetMonster || null, 'Plan ย้ายแมพฟาร์ม');
        return;
      }
      window.__planActiveTargetMap = '';

      // Plan Mode: `life_gather`
      if (activePlanMode && activePlanMode.type === 'life_gather') {
        const itemId = activePlanMode.itemId || 'lf_birch';
        const wantQty = Number(activePlanMode.qty) || 10;
        const haveQty = countBagItem(p, itemId);
        if (haveQty >= wantQty) {
          if (NC.QuestAuto?.on && NC.QuestAuto?.life) NC.QuestAuto.stop?.('เก็บวัตถุดิบครบตามแผนแล้ว');
          setPlanTaskStatus(`✅ เก็บ ${itemId} ครบ ${haveQty}/${wantQty} ชิ้นแล้ว`);
          if (planStateRef) {
            planStateRef.activeMode = plan.autoQuestEnabled !== false ? { type: 'auto_quest', questMode: 'all' } : null;
            savePlanState(plan, planStateRef);
          }
          return;
        }
        const needMore = Math.max(1, wantQty - haveQty);
        const skill = activePlanMode.lifeJob || 'wood';
        setPlanTaskStatus(`🪓 อาชีพเสริม (${skill}): ${itemId} (${haveQty}/${wantQty})`);
        if (NC.QuestAuto?.startLife && (!NC.QuestAuto.on || !NC.QuestAuto.life || NC.QuestAuto.life.mat !== itemId)) {
          NC.QuestAuto.startLife({ skill, mat: itemId, n: needMore });
        }
        return;
      }

      // Plan Mode: `auto_quest` with `until_level` or `until_quest`
      if (activePlanMode && activePlanMode.type === 'auto_quest') {
        const isBoundedQuest = activePlanMode.questMode === 'until_level' || activePlanMode.questMode === 'until_quest';
        const doneByLv = activePlanMode.questMode === 'until_level' && baseLv >= (Number(activePlanMode.untilLevel) || 99);
        const doneByQuest = activePlanMode.questMode === 'until_quest' && isQuestCompleted(p, activePlanMode.untilQuest);
        if (doneByLv || doneByQuest) {
          if (!smartQuestOn) {
            runTargetFarmMapTick(game, p);
            return;
          }
          if (plan.autoClick?.enabled) {
            runSpecificFarmMapTick(game, p, 'auto', null, `จบช่วงเควส (Lv.${baseLv}) · ที่ล่าตามเลเวล`);
            return;
          }
        } else if (isBoundedQuest && !smartQuestOn) {
          // Even if the user unchecked Smart Auto-Quest on the HUD, run the Plan's bounded auto_quest (`untilLevel` / `untilQuest`) until met!
          if (unblockNightcampQuestStalls(game, p, plan)) return;
          if (!isAnyQuestDialogOpen()) {
            if (NC.QuestAuto && !NC.QuestAuto.on) {
              NC.QuestAuto.start?.();
              lastQuestAutoNextAt = Date.now();
            } else if (NC.QuestAuto?.waiting?.() && Date.now() - lastQuestAutoNextAt > 2500) {
              lastQuestAutoNextAt = Date.now();
              NC.QuestAuto.next?.();
            }
          }
          const qaJobLabel = NC.QuestAuto?.job?.label ? ` · ${NC.QuestAuto.job.label()}` : (NC.QuestAuto?.note ? ` · ${NC.QuestAuto.note}` : '');
          const targetDesc = activePlanMode.questMode === 'until_level'
            ? `ถึง Lv.${activePlanMode.untilLevel}`
            : `ถึง ${activePlanMode.untilQuest}`;
          setPlanTaskStatus(`🧭 Plan Auto-Quest (${targetDesc})${qaJobLabel} · แมพ ${game.mapId || '-'}`);
          return;
        }
      }
    }

    // 2. Run Smart Auto-Quest Unblocker whenever Smart Auto-Quest is enabled (or in `puppetroom`)
    if (smartQuestOn) {
      const handledStallOrManualLesson = unblockNightcampQuestStalls(game, p, plan);
      if (handledStallOrManualLesson) return;
    }

    // 2a. STORY BOSS ROOM CO-OP COMBAT & ENTRY (`ห้องบอสเนื้อเรื่อง เช่น ไอวี่ ผู้ขโมยไฟ MQ15`)
    if (NC.StoryRoom?.inRoom?.() || NC.Trial?.inRoom?.()) {
      window.__partyCoopAssistTarget = null;
      if (Array.isArray(NC.Auto?.set?.off) && NC.Auto.set.off.length > 0) {
        NC.Auto.set.off = [];
      }
      const liveBoss = (game.enemies || []).find(e => e && !e.dead && e.hp > 0 && e.boss);
      const anyLiveEnemy = (game.enemies || []).some(e => e && !e.dead && e.hp > 0 && !e.dummy && !e.npc);
      if (!liveBoss && !anyLiveEnemy && !NC.StoryRoom?.questBoss?.() && NC.StoryRoom?.offer?.()?.kind === 'leave') {
        if (Date.now() - lastStoryRoomPressAt > 3000) {
          lastStoryRoomPressAt = Date.now();
          try { NC.StoryRoom.press('leave'); } catch (_) {}
        }
        setPlanTaskStatus('🏆 ล้มบอสเนื้อเรื่องสำเร็จ! กำลังออกจากห้องบอส...');
        return;
      }
      if (NC.Auto && !NC.Auto.on) {
        try { NC.Auto.toggle?.(game); } catch (_) {}
      }
      const bossLabel = liveBoss
        ? `${liveBoss.name || liveBoss.type} (HP ${Math.round(liveBoss.hp).toLocaleString()} / ${Math.round(liveBoss.maxHp || liveBoss.hp).toLocaleString()})`
        : 'ห้องบอสเนื้อเรื่อง';
      setPlanTaskStatus(`⚔️ ลุยห้องบอสเนื้อเรื่องพร้อมตี้: ${bossLabel}`);
      return;
    }

    if (!inPuppetTutorial && smartQuestOn) {
      const myQuestBoss = NC.StoryRoom?.questBoss?.() || '';
      const srOffer = NC.StoryRoom?.offer?.();
      if (myQuestBoss && srOffer && srOffer.kind === 'enter' && (!srOffer.boss || srOffer.boss === myQuestBoss)) {
        if (Date.now() - lastStoryRoomPressAt > 3500) {
          lastStoryRoomPressAt = Date.now();
          try {
            if (NC.Travel?.on) NC.Travel.stop?.('');
            NC.StoryRoom.press('enter');
          } catch (_) {}
        }
        setPlanTaskStatus(`🚪 เข้าห้องบอสเนื้อเรื่อง (${myQuestBoss})...`);
        return;
      }
    }

    // 2b. Co-op Party Quest Assist (`เดินเควสพร้อมกันทั้งตี้ — รอและช่วยเพื่อนในตี้เคลียร์เควสแมพก่อนหน้าให้ทันกัน`)
    const coopTarget = (!inPuppetTutorial && smartQuestOn && !NC.StoryRoom?.inRoom?.() && !NC.Trial?.inRoom?.())
      ? window.__partyCoopAssistTarget
      : null;
    if (coopTarget && coopTarget.mapId) {
      const mapTitle = NC.MAPS?.[coopTarget.mapId]?.name || coopTarget.mapId;
      if (NC.QuestAuto?.on) {
        try { NC.QuestAuto.stop?.(`รอช่วย ${coopTarget.name} ทำเควสที่ ${mapTitle}`); } catch (_) {}
      }
      if (game.mapId !== coopTarget.mapId) {
        if (NC.Auto?.on) {
          try { NC.Auto.stop ? NC.Auto.stop(game) : NC.Auto.toggle(game); } catch (_) {}
        }
        if (targetMapWarpState.map !== coopTarget.mapId) {
          targetMapWarpState.map = coopTarget.mapId;
          targetMapWarpState.warpTriedAt = 0;
          targetMapWarpState.warpAttempts = 0;
        }
        tryWarpOrWalkToMap(game, coopTarget.mapId, { map: coopTarget.mapId, name: mapTitle }, targetMapWarpState);
        setPlanTaskStatus(`🤝 เดินเควสพร้อมตี้: กำลังไปช่วย ${coopTarget.name} ทำเควสที่ ${mapTitle}...`);
        return;
      }
      if (coopTarget.story && NC.StoryRoom?.offer?.()?.kind === 'enter') {
        if (Date.now() - lastStoryRoomPressAt > 3200) {
          lastStoryRoomPressAt = Date.now();
          try { NC.StoryRoom.press('enter'); } catch (_) {}
        }
        setPlanTaskStatus(`🚪 เข้าห้องบอสเนื้อเรื่องช่วย ${coopTarget.name} ที่ ${mapTitle}...`);
        return;
      }
      if (Array.isArray(NC.Auto?.set?.off) && NC.Auto.set.off.length > 0) {
        NC.Auto.set.off = [];
      }
      if (NC.Auto?.set) NC.Auto.set.group = true;
      if (NC.Auto && !NC.Auto.on && !NC.Travel?.on) {
        try { NC.Auto.toggle?.(game); } catch (_) {}
      }
      const chNow = window.getCurrentChannel();
      setPlanTaskStatus(`🤝 เดินเควสพร้อมตี้: ช่วย ${coopTarget.name} เคลียร์เควสที่ ${mapTitle}${chNow ? ' · CH ' + chNow : ''}`);
      return;
    }

    // 4. Smart Auto-Quest execution (when `🧭 เปิด Smart Auto-Quest` is enabled)
    if (smartQuestOn) {
      if (!planOn && isJobChangeQuestStepNow(p)) {
        if (NC.QuestAuto?.on) {
          try { NC.QuestAuto.stop?.('รอผู้เล่นเลือกอาชีพด้วยตนเอง'); } catch (_) {}
        }
        const sqJob = document.querySelector('#sq .win[data-sq="jobchange"]:not([hidden])');
        if (!sqJob) {
          try {
            NC.SQ?.open?.('jobchange');
            NC.HUD?.panel?.('skills', true);
          } catch (_) {}
        }
        setPlanTaskStatus('⏸️ ถึงเควสเลือกอาชีพแล้ว! กรุณาเลือกอาชีพด้วยตัวเอง (เลือกเสร็จบอทจะทำเควสต่อทันที)');
        return;
      }
      // Drive NC.QuestAuto smoothly (NEVER call next() while a quest dialog is open!)
      if (!isAnyQuestDialogOpen()) {
        if (NC.QuestAuto && !NC.QuestAuto.on) {
          NC.QuestAuto.start?.();
          lastQuestAutoNextAt = Date.now();
        } else if (NC.QuestAuto?.waiting?.() && Date.now() - lastQuestAutoNextAt > 2500) {
          lastQuestAutoNextAt = Date.now();
          NC.QuestAuto.next?.();
        }
      }
      // Ensure time-of-day gated quests ("ของเควสดรอปเฉพาะกลางวัน/กลางคืน") and level-gate quests ("ฟาร์มให้ถึง Lv...")
      // actively farm monsters on their outdoor quest map instead of standing idle!
      const qaNoteNow = String(NC.QuestAuto?.note || '');
      if (/ของเควสดรอปเฉพาะ|ฟาร์มให้ถึง\s*Lv|ฝึกให้ถึง\s*Lv/i.test(qaNoteNow) && !isAnyQuestDialogOpen()) {
        const wantOutdoorMap = getMyActiveQuestOutdoorMapId(game, p) || getBestAutoFarmMapForLevel(p, game);
        if (wantOutdoorMap && (game.mapId === 'camp' || (game.mapId === 'farm' && wantOutdoorMap !== 'farm'))) {
          const wTitle = NC.MAPS?.[wantOutdoorMap]?.name || wantOutdoorMap;
          tryWarpOrWalkToMap(game, wantOutdoorMap, { map: wantOutdoorMap, name: wTitle }, targetMapWarpState);
        } else if (game.mapId !== 'camp') {
          if (Array.isArray(NC.Auto?.set?.off) && NC.Auto.set.off.length > 0) {
            const offSet = new Set(NC.Auto.set.off);
            const hasUnfiltered = (game.enemies || []).some(e => e && !e.dead && e.hp > 0 && !e.dummy && !e.npc && !offSet.has(e.type));
            if (!hasUnfiltered || /ของเควสดรอปเฉพาะ/.test(qaNoteNow)) {
              NC.Auto.set.off = [];
            }
          }
          if (NC.Auto && !NC.Auto.on && !NC.Travel?.on) {
            try { NC.Auto.toggle?.(game); } catch (_) {}
          }
        }
      }
      const qaJobLabel = NC.QuestAuto?.job?.label ? ` · ${NC.QuestAuto.job.label()}` : (NC.QuestAuto?.note ? ` · ${NC.QuestAuto.note}` : '');
      const wtPct = NC.Weight?.of ? (NC.Weight.of(p)?.pct || 0) : 0;
      const chNow = window.getCurrentChannel();
      const boundedDesc = (activePlanMode && activePlanMode.type === 'auto_quest' && activePlanMode.questMode === 'until_level')
        ? ` (ถึง Lv.${activePlanMode.untilLevel})`
        : ((activePlanMode && activePlanMode.type === 'auto_quest' && activePlanMode.questMode === 'until_quest')
            ? ` (ถึง ${activePlanMode.untilQuest})`
            : '');
      setPlanTaskStatus(`🧭 Smart Auto-Quest${boundedDesc}${qaJobLabel} · แมพ ${game.mapId || '-'}${chNow ? ' CH.' + chNow : ''} (นน.${wtPct}%)`);
      return;
    }

    // 5. Smart Auto-Quest is OFF and no Plan map trigger overrode it -> Farm 🗺️ แมพฟาร์มประจำ
    if (NC.QuestAuto?.on && !NC.QuestAuto?.life) {
      try { NC.QuestAuto.stop?.('ปิด Smart Auto-Quest · ล็อกแมพฟาร์มประจำ'); } catch (_) {}
    }
    runTargetFarmMapTick(game, p);
  }

  // ============================================================================
  // 4. HUD & RUNTIME CONTROLS
  // ============================================================================
  const STATIC_FARM_MAP_OPTIONS = [
    ['auto', '⚡ อัตโนมัติตามเลเวล (Auto Level Map)'],
    ['farm', '[Lv.1-10] ไร่ฟักทอง (farm)'],
    ['curinghouse', '[Lv.5-10] โรงบ่มใบยา (curinghouse)'],
    ['melonfield', '[Lv.6-12] แปลงแตงโม (melonfield)'],
    ['windpump', '[Lv.7-13] กังหันสูบน้ำ (windpump)'],
    ['batcave', '[Lv.8-16] ถ้ำค้างคาว (batcave)'],
    ['meadow', '[Lv.8-18] ทุ่งหญ้าแสงจันทร์ (meadow)'],
    ['apiary', '[Lv.10-18] สวนรังผึ้ง (apiary)'],
    ['appleslope', '[Lv.10-18] เนินสวนแอปเปิล (appleslope)'],
    ['dandelion', '[Lv.12-20] ทุ่งดอกแดนดิไลออน (dandelion)'],
    ['cornmaze', '[Lv.12-20] เขาวงกตข้าวโพด (cornmaze)'],
    ['farm2', '[Lv.12-22] ไร่ฟักทองในลึก (farm2)'],
    ['marsh', '[Lv.15-25] บึงหมอกพิษ (marsh)'],
    ['reedmaze', '[Lv.16-26] พงกกริมน้ำ (reedmaze)'],
    ['beaverdam', '[Lv.16-26] เขื่อนบีเวอร์ (beaverdam)'],
    ['eelhut', '[Lv.17-27] กระท่อมปลาไหล (eelhut)'],
    ['graveyard', '[Lv.18-30] เนินสุสานโบสถ์ร้าง (graveyard)'],
    ['meadow2', '[Lv.18-28] ทุ่งหญ้าแสงจันทร์ชั้นใน (meadow2)'],
    ['battlefield', '[Lv.18-28] สมรภูมิหุ่นฟาง (battlefield)'],
    ['tallgrass', '[Lv.20-30] ทุ่งหญ้าสูง (tallgrass)'],
    ['thornrose', '[Lv.20-30] สวนกุหลาบหนาม (thornrose)'],
    ['antmine1', '[Lv.20-30] เหมืองมด ชั้น 1 (antmine1)'],
    ['diggervillage', '[Lv.22-32] หมู่บ้านนักขุดสุสาน (diggervillage)'],
    ['wreathfield', '[Lv.22-32] ทุ่งหรีด (wreathfield)'],
    ['giantbones', '[Lv.24-34] ลานกระดูกยักษ์ (giantbones)'],
    ['marsh2', '[Lv.25-35] บึงหมอกพิษชั้นกลาง (marsh2)'],
    ['woods', '[Lv.26-38] ป่าลึกเงามืด (woods)'],
    ['antmine2', '[Lv.28-38] เหมืองมด ชั้น 2 (antmine2)'],
    ['graveyard2', '[Lv.30-42] สุสานโบสถ์ร้างชั้นใน (graveyard2)'],
    ['coffinhollow', '[Lv.32-44] หุบเขาโลงศพ (coffinhollow)'],
    ['weepgarden', '[Lv.32-44] สวนหินร่ำไห้ (weepgarden)'],
    ['burnt', '[Lv.35-48] ป่าไฟไหม้ (burnt)'],
    ['ashvale', '[Lv.36-48] หุบเขาเถ้าถ่าน (ashvale)'],
    ['stillburning', '[Lv.38-50] ป่าคุกรุ่น (stillburning)'],
    ['woods2', '[Lv.38-50] ป่าลึกชั้นใน (woods2)'],
    ['crypt1', '[Lv.40-52] สุสานใต้ดิน ชั้น 1 (crypt1)'],
    ['sporevale', '[Lv.42-54] หุบเขาสปอร์ (sporevale)'],
    ['salt', '[Lv.44-56] ทุ่งเกลือ (salt)'],
    ['wind', '[Lv.45-58] ที่ราบสูงสายลม (wind)'],
    ['peak', '[Lv.46-60] ยอดเขาหิมะ (peak)'],
    ['crypt2', '[Lv.48-60] สุสานใต้ดิน ชั้น 2 (crypt2)'],
    ['avalanche', '[Lv.50-65] หุบเขาหิมะถล่ม (avalanche)'],
    ['snowpines', '[Lv.52-66] ป่าสนหิมะ (snowpines)'],
    ['swamp', '[Lv.55-70] บึงมรณะ (swamp)'],
    ['canyon', '[Lv.60-75] หุบผาหินแดง (canyon)'],
    ['volcano', '[Lv.70-85] ปากปล่องภูเขาไฟ (volcano)']
  ];

  let dynamicMapsPopulated = false;
  let cachedFarmMapRows = STATIC_FARM_MAP_OPTIONS.slice(1).map(([id, label], idx) => ({ id, lo: idx, label }));

  function renderTargetFarmMapOptions(filterText) {
    const sel = document.getElementById('p-target-farm-map');
    const resEl = document.getElementById('p-target-farm-map-results');
    if (!sel) return;
    const q = String(filterText !== undefined ? filterText : (document.getElementById('p-target-farm-map-search')?.value || '')).trim().toLowerCase();
    const curVal = window.__targetFarmMap || 'auto';
    const matchesOnly = !q
      ? cachedFarmMapRows
      : cachedFarmMapRows.filter(r => r.label.toLowerCase().includes(q) || r.id.toLowerCase().includes(q));
    const filtered = !q
      ? cachedFarmMapRows
      : cachedFarmMapRows.filter(r => r.label.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || r.id === curVal);

    sel.innerHTML = `<option value="auto" ${curVal === 'auto' ? 'selected' : ''}>⚡ อัตโนมัติตามเลเวล (Auto Level Map)</option>` +
      filtered.map(r => `<option value="${r.id}" ${r.id === curVal ? 'selected' : ''}>${r.label}</option>`).join('');
    if (curVal === 'auto' || filtered.some(r => r.id === curVal)) {
      sel.value = curVal;
    }

    if (resEl) {
      if (!q) {
        resEl.style.display = 'none';
        resEl.innerHTML = '';
      } else if (matchesOnly.length === 0) {
        resEl.style.display = 'block';
        resEl.innerHTML = `<div style="padding:4px 6px; font-size:9.5px; color:#94a3b8;">ไม่พบแมพที่ค้นหา "${q}"</div>`;
      } else {
        resEl.style.display = 'flex';
        resEl.innerHTML = matchesOnly.map(r => {
          const isCur = r.id === curVal;
          return `<button type="button" data-pick-map="${r.id}" style="text-align:left; background:${isCur ? 'rgba(14,165,233,0.28)' : 'rgba(15,23,42,0.85)'}; border:1px solid ${isCur ? 'rgba(56,189,248,0.65)' : 'rgba(148,163,184,0.18)'}; color:${isCur ? '#7dd3fc' : '#e2e8f0'}; border-radius:4px; padding:4px 6px; font-size:10px; cursor:pointer; display:flex; justify-content:space-between; align-items:center; gap:4px;">` +
            `<span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${r.label}</span>` +
            `<span style="font-size:9px; color:${isCur ? '#4ade80' : '#38bdf8'}; white-space:nowrap;">${isCur ? '✓ เลือกอยู่' : 'คลิกเลือก'}</span>` +
            `</button>`;
        }).join('');
      }
    }
  }

  function populateTargetFarmMapSelect() {
    const sel = document.getElementById('p-target-farm-map');
    const NC = window.NC;
    if (!sel || !NC?.MAPS || dynamicMapsPopulated) return;
    const keys = Object.keys(NC.MAPS);
    if (keys.length < 10) return;
    dynamicMapsPopulated = true;

    const rows = [];
    for (const id of keys) {
      const M = NC.MAPS[id];
      if (!M || M.camp || M.pvp || M.gwar || M.secret || id === 'camp' || id === 'homefarm' || id === 'puppetroom') continue;
      const lvStr = String(M.lvText || '').split(' · ')[0].trim();
      const m = /(\d+)\s*[–-]\s*(\d+)/.exec(lvStr);
      const lo = m ? Number(m[1]) : (Array.isArray(M.lv) ? Number(M.lv[0]) || 999 : 999);
      const label = `${lvStr ? '[' + lvStr + '] ' : ''}${M.name || id} (${id})`;
      rows.push({ id, lo, label });
    }
    rows.sort((a, b) => (a.lo - b.lo) || a.label.localeCompare(b.label, 'th'));
    cachedFarmMapRows = rows;
    renderTargetFarmMapOptions();
  }

  function updatePotionStockDisplay(p) {
    const el = document.getElementById('nc-pot-live-stock');
    if (!el || !p) return;
    const redS = p.potions | 0, redM = p.potionsM | 0, redL = p.potionsL | 0;
    const blueS = p.spPotions | 0, blueM = p.spPotionsM | 0, blueL = p.spPotionsL | 0;
    const junkInfo = getTotalBrewableJunkCount(p);
    const pc = window.__potionConfig || DEFAULT_POTION_CFG;
    const hpPctTxt = pc.hpEnabled !== false && (Number(pc.hpDrinkPct ?? 60) > 0) ? `<${pc.hpDrinkPct ?? 60}%` : 'ปิด';
    const spPctTxt = pc.spEnabled !== false && (Number(pc.spDrinkPct ?? 40) > 0) ? `<${pc.spDrinkPct ?? 40}%` : 'ปิด';
    el.innerHTML =
      `❤️ <b>ยาแดงในตัว:</b> เล็ก ${redS} · กลาง ${redM} · ใหญ่ ${redL} <span style="color:#fca5a5;">(ปั๊มเมื่อ HP ${hpPctTxt})</span><br>` +
      `💙 <b>ยาฟ้าในตัว:</b> เล็ก ${blueS} · กลาง ${blueM} · ใหญ่ ${blueL} <span style="color:#93c5fd;">(ปั๊มเมื่อ SP ${spPctTxt})</span><br>` +
      `🦴 <b>ขยะมอนต้มยาได้:</b> ${junkInfo.total.toLocaleString()} ชิ้น (ในตัว ${junkInfo.bag} · คลังค่าย ${junkInfo.store} · ใช้ 2 ชิ้น/ต้ม 10 ขวด)`;
  }

  function updateSellLiveDisplay(p) {
    const el = document.getElementById('nc-sell-live-weight');
    if (!el || !p) return;
    const NC = window.NC;
    const G = NC?.GEAR;
    const wt = NC?.Weight?.of ? NC.Weight.of(p) : null;
    const wCur = wt ? Math.round(wt.w || 0) : 0;
    const wCap = wt ? Math.round(wt.cap || 0) : 0;
    const wPct = wt ? Math.round(wt.pct || 0) : 0;
    const thr = Number(window.__autoSellWeightPct) || 65;
    const bagUsed = G?.used ? G.used(p) : (Array.isArray(p.bag) ? p.bag.length : 0);
    const bagCap = G?.bagCap ? G.bagCap(p) : (G?.BAG_MAX || 40);
    const storeUsed = G?.store ? (G.store(p)?.length || 0) : 0;
    const storeCap = G?.storeCap ? G.storeCap(p) : (G?.STORE_MAX || 60);
    let sellGearCount = 0;
    let sellMatCount = 0;
    try {
      sellGearCount = getJunkGearUidsToSell(p).length;
      sellMatCount = getMaterialsToSell(p).reduce((acc, row) => acc + (row[1] | 0), 0);
    } catch (_) {}
    const pctColor = wPct >= thr ? '#fca5a5' : (wPct >= thr - 10 ? '#fde68a' : '#86efac');
    const liveVaultCoins = Number(NC?.PremiumOnline?.state?.()?.vault?.coins);
    if (Number.isFinite(liveVaultCoins)) window.__lastKnownVaultCoins = liveVaultCoins;
    const vaultTxt = typeof window.__lastKnownVaultCoins === 'number'
      ? ` · <b>ในคลังร่วม:</b> ${Number(window.__lastKnownVaultCoins).toLocaleString()}g`
      : '';
    el.innerHTML =
      `⚖️ <b>น้ำหนัก:</b> <span style="color:${pctColor};font-weight:700;">${wCur.toLocaleString()} / ${wCap.toLocaleString()} (${wPct}%)</span> · เกณฑ์กลับค่าย <b>${thr}%</b><br>` +
      `🎒 <b>กระเป๋าอุปกรณ์:</b> ${bagUsed}/${bagCap} ช่อง · <b>คลังค่าย:</b> ${storeUsed}/${storeCap} ช่อง<br>` +
      `💰 <b>พร้อมขายตามเงื่อนไข:</b> อุปกรณ์ ${sellGearCount} ชิ้น · ขยะมอน ${sellMatCount} ชิ้น<br>` +
      `🏦 <b>เหรียญติดตัว:</b> ${(p.coins || 0).toLocaleString()}g${vaultTxt}`;
  }

  function renderHudState() {
    const btn = document.getElementById('nc-toggle-btn');
    const badge = document.getElementById('nc-status-badge');
    const lpBadge = document.getElementById('nc-lowpower-badge');
    const lpBtn = document.getElementById('nc-lowpower-btn');
    const aqCb = document.getElementById('p-smart-autoquest-enabled');
    const aiCb = document.getElementById('p-upgrade-bot-ai-enabled');
    const respCb = document.getElementById('p-auto-respawn-enabled');
    const sgCb = document.getElementById('p-smart-gear-enabled');
    const sgWtSel = document.getElementById('p-smart-gear-wtype');
    const sgNoteEl = document.getElementById('nc-smart-gear-status');
    const sellCb = document.getElementById('p-auto-sell-enabled');
    const sellPctSel = document.getElementById('p-auto-sell-weight-pct');
    const mapSel = document.getElementById('p-target-farm-map');
    const mapHintEl = document.getElementById('nc-target-map-hint');
    const planCb = document.getElementById('p-plan-script-enabled');
    const planNameEl = document.getElementById('nc-plan-name-badge');

    if (btn) {
      btn.textContent = window.__isBotRunning ? '⏹ STOP BOT (หยุดบอท)' : '▶ START BOT (เริ่มบอท)';
      btn.style.background = window.__isBotRunning ? '#dc2626' : '#0284c7';
    }
    if (badge) {
      badge.textContent = window.__isBotRunning ? '⚔️ RUNNING' : '⏸️ STANDBY (OFF)';
      badge.style.color = window.__isBotRunning ? '#4ade80' : '#94a3b8';
    }
    if (lpBadge) {
      lpBadge.textContent = window.__lowPowerMode ? 'LowPower: ON' : 'LowPower: OFF';
      lpBadge.style.color = window.__lowPowerMode ? '#38bdf8' : '#64748b';
    }
    if (lpBtn) {
      lpBtn.textContent = window.__lowPowerMode ? '🖥️ แสดงภาพเกมปกติ' : '⚡ พักกราฟิก (Zero-Render)';
    }
    if (aqCb && document.activeElement !== aqCb) {
      aqCb.checked = Boolean(window.__smartAutoQuestEnabled);
    }
    if (aiCb && document.activeElement !== aiCb) {
      aiCb.checked = Boolean(window.__upgradeBotAiEnabled);
    }
    if (respCb && document.activeElement !== respCb) {
      respCb.checked = Boolean(window.__autoRespawnEnabled);
    }
    if (sgCb && document.activeElement !== sgCb) {
      sgCb.checked = Boolean(window.__smartGearEnabled);
    }
    if (sgWtSel && document.activeElement !== sgWtSel) {
      sgWtSel.value = String(window.__smartGearWeaponType || 'auto');
    }
    if (sgNoteEl && window.__lastSmartGearNote) {
      sgNoteEl.textContent = window.__lastSmartGearNote;
    }
    if (sellCb && document.activeElement !== sellCb) {
      sellCb.checked = Boolean(window.__autoSellEnabled);
    }
    if (sellPctSel && document.activeElement !== sellPctSel) {
      sellPctSel.value = String(window.__autoSellWeightPct || 65);
    }
    if (mapSel && document.activeElement !== mapSel) {
      mapSel.value = String(window.__targetFarmMap || 'auto');
    }
    if (mapHintEl) {
      if (window.__smartAutoQuestEnabled) {
        mapHintEl.textContent = '⚠️ ตอนนี้เปิด Smart Auto-Quest อยู่ (เควสใหญ่สุด · หากต้องการฟาร์มแมพนี้ให้ติ๊กปิด Auto-Quest)';
        mapHintEl.style.color = '#fcd34d';
      } else {
        mapHintEl.textContent = '✅ ล็อกแมพฟาร์มประจำทำงานอยู่ (วาร์ป/เดินไปฟาร์ม + ตาย/ขายของเสร็จกลับมาแมพนี้)';
        mapHintEl.style.color = '#86efac';
      }
    }
    if (planCb && document.activeElement !== planCb) {
      planCb.checked = Boolean(window.__planScriptEnabled);
    }
    if (planNameEl) {
      planNameEl.textContent = window.__planScriptEnabled
        ? ('📜 แผน: ' + (window.__currentScriptPlan?.name || DEFAULT_NC_WOLF_PLAN.name))
        : 'ℹ️ ปิด Plan Script (เมื่อถึงเควสเปลี่ยนอาชีพ บอทจะหยุดรอให้คุณเลือกเอง)';
      planNameEl.style.color = window.__planScriptEnabled ? '#38bdf8' : '#fde68a';
    }
    try {
      const p = window.NC?.game?.player;
      if (p) {
        updatePotionStockDisplay(p);
        updateSellLiveDisplay(p);
        const durEl = document.getElementById('nc-durability-status');
        if (durEl) {
          const repSum = getEquipmentRepairSummary(p);
          durEl.textContent = repSum.summaryText;
          durEl.style.color = repSum.minPct !== null && repSum.minPct <= 25
            ? '#fca5a5'
            : (repSum.quoteCount > 0 ? '#fde68a' : '#a7f3d0');
        }
      }
    } catch (_) {}
  }

  window.syncAllHudInputsFromConfig = function syncAllHudInputsFromConfig() {
    const c = window.__authConfig || {};
    const pc = window.__potionConfig || DEFAULT_POTION_CFG;
    const sc = window.__sellConfig || DEFAULT_SELL_CFG;
    const set = (id, val, isCb) => {
      const el = document.getElementById(id);
      if (!el || document.activeElement === el) return;
      if (isCb) el.checked = !!val;
      else el.value = val == null ? '' : String(val);
    };
    set('p-auth-enabled', c.enabled !== false, true);
    try {
      const srvEl = document.getElementById('p-auth-server');
      const liveSrvs = window.NC?.ServerSelect?.list;
      if (srvEl && Array.isArray(liveSrvs) && liveSrvs.length > 0) {
        const existingVals = new Set(Array.from(srvEl.options).map(o => String(o.value || '').toLowerCase()));
        liveSrvs.forEach((s, idx) => {
          const nm = String(s?.name || '').trim();
          if (nm && !existingVals.has(nm.toLowerCase())) {
            const opt = document.createElement('option');
            opt.value = nm;
            opt.textContent = `S${idx + 1} · ${nm}`;
            srvEl.appendChild(opt);
            existingVals.add(nm.toLowerCase());
          }
        });
      }
    } catch (_) {}
    set('p-auth-server', c.serverName || '', false);
    set('p-auth-user', c.username || '', false);
    set('p-auth-pass', c.password || '', false);
    set('p-auth-char', c.charName || '', false);
    set('p-auth-register', !!c.register, true);
    set('p-auth-resume', !!c.autoResumeBot, true);
    set('p-smart-autoquest-enabled', !!window.__smartAutoQuestEnabled, true);
    set('p-upgrade-bot-ai-enabled', !!window.__upgradeBotAiEnabled, true);
    set('p-auto-respawn-enabled', !!window.__autoRespawnEnabled, true);
    set('p-smart-gear-enabled', !!window.__smartGearEnabled, true);
    set('p-smart-gear-wtype', String(window.__smartGearWeaponType || 'auto'), false);
    set('p-bot-auto-repair', sc.autoRepair !== false, true);
    set('p-bot-repair-pct', String(sc.repairThresholdPct ?? 25), false);
    set('p-auto-sell-enabled', sc.enabled !== false, true);
    set('p-auto-sell-weight-pct', String(sc.weightThreshold || window.__autoSellWeightPct || 65), false);
    set('p-sell-weapon-grade', String(sc.weaponMaxGrade ?? 1), false);
    set('p-sell-armor-grade', String(sc.armorMaxGrade ?? 1), false);
    set('p-sell-acc-grade', String(sc.accMaxGrade ?? 0), false);
    set('p-sell-mat-mode', sc.materialMode || 'common', false);
    set('p-sell-keep-best', sc.keepBestCopy !== false, true);
    set('p-sell-keep-refined', sc.keepRefined !== false, true);
    set('p-sell-keep-special', sc.keepSpecial !== false, true);
    set('p-sell-keep-boss', sc.keepBossGear !== false, true);
    set('p-sell-auto-repair', sc.autoRepair !== false, true);
    set('p-sell-store-mats', sc.storeMats !== false, true);
    set('p-sell-store-gear', !!sc.storeGear, true);
    set('p-sell-store-coins', !!sc.storeCoinsEnabled, true);
    set('p-sell-keep-coins', String(sc.keepCoinsOnHand ?? 1000), false);
    set('p-sell-whitelist', sc.whitelist || '', false);
    set('p-sell-forcesell', sc.forceSellList || '', false);
    set('p-target-farm-map', String(window.__targetFarmMap || 'auto'), false);
    set('p-plan-script-enabled', !!window.__planScriptEnabled, true);
    set('p-pot-hp-enabled', pc.hpEnabled !== false, true);
    set('p-pot-hp-size', pc.hpSize || 'red', false);
    set('p-pot-hp-drink-pct', String(pc.hpDrinkPct ?? 60), false);
    set('p-pot-hp-min', String(pc.hpMin ?? 15), false);
    set('p-pot-hp-target', String(pc.hpTarget ?? 100), false);
    set('p-pot-sp-enabled', pc.spEnabled !== false, true);
    set('p-pot-sp-size', pc.spSize || 'blue', false);
    set('p-pot-sp-drink-pct', String(pc.spDrinkPct ?? 40), false);
    set('p-pot-sp-min', String(pc.spMin ?? 10), false);
    set('p-pot-sp-target', String(pc.spTarget ?? 60), false);
    set('p-pot-prefer-craft', pc.preferCraft !== false, true);
    const pfc = window.__ncPerfConfig || DEFAULT_PERF_CFG;
    set('p-perf-dot-monsters', pfc.dotMonsters !== false, true);
    set('p-perf-dot-npcs', pfc.dotNpcs !== false, true);
    set('p-perf-dot-player', Boolean(pfc.dotPlayer), true);
    set('p-perf-hide-map', pfc.hideMapBg !== false, true);
    set('p-perf-hide-fx', pfc.hideEffects !== false, true);
    set('p-perf-hide-players', pfc.hideOtherPlayers !== false, true);
    set('p-perf-mute-audio', pfc.muteAudio !== false, true);
    set('p-perf-trim-vram', pfc.trimVram !== false, true);
    set('p-perf-fps-cap', String(pfc.fpsCap ?? 30), false);
    const tc = window.__trainerConfig || DEFAULT_TRAINER_CFG;
    set('p-trainer-pull-mob', Boolean(tc.pullMobEnabled), true);
    set('p-trainer-pull-mob-radius', String(tc.pullMobRadius || 1800), false);
    set('p-trainer-pull-mob-aggro', tc.pullMobAggro !== false, true);
    set('p-trainer-pull-item', Boolean(tc.pullItemEnabled), true);
    set('p-trainer-pull-item-rush', tc.pullItemRush !== false, true);
    syncTrainerTabVisibility();
    renderHudState();
  };

  window.startMasterBot = function startMasterBot() {
    window.__isBotRunning = true;
    window.__autoLoopEnabled = true;
    try { localStorage.setItem('pelican_bot_running', 'true'); } catch (_) {}
    if (!window.__ncMasterBotInterval) {
      window.__ncMasterBotInterval = setInterval(() => {
        if (!window.__isBotRunning) return;
        try { runPlanEngineTick(); } catch (_) {}
      }, 650);
    }
    try { runPlanEngineTick(); } catch (_) {}
    renderHudState();
    return true;
  };

  window.stopMasterBot = function stopMasterBot() {
    window.__isBotRunning = false;
    window.__autoLoopEnabled = false;
    try { localStorage.setItem('pelican_bot_running', 'false'); } catch (_) {}
    autoSellTrip = null;
    if (window.__ncMasterBotInterval) {
      clearInterval(window.__ncMasterBotInterval);
      window.__ncMasterBotInterval = null;
    }
    try {
      if (window.NC?.QuestAuto?.on) window.NC.QuestAuto.stop?.('หยุดบอท');
      if (window.NC?.Auto?.on && typeof window.NC.Auto.toggle === 'function') window.NC.Auto.toggle(window.NC.game);
      if (window.NC?.Travel?.on) window.NC.Travel.stop?.('หยุดบอท');
    } catch (_) {}
    setPlanTaskStatus('⏸️ บอทหยุดทำงาน');
    renderHudState();
    return true;
  };

  function updateZeroRenderBanner() {
    if (!document.body) return;
    let banner = document.getElementById('pm-zero-render-banner');
    if (!window.__lowPowerMode) {
      if (banner) banner.style.display = 'none';
      return;
    }
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'pm-zero-render-banner';
      banner.setAttribute('data-noeng', '1');
      banner.style.cssText = 'position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:2147483645;background:rgba(15,23,42,0.94);border:1.5px solid rgba(56,189,248,0.65);border-radius:10px;padding:7px 14px;color:#e2e8f0;font-family:"Segoe UI",Tahoma,sans-serif;font-size:12px;display:flex;align-items:center;gap:10px;box-shadow:0 10px 25px rgba(0,0,0,0.8);backdrop-filter:blur(4px);user-select:none;';
      banner.innerHTML = `
        <span style="color:#38bdf8;font-weight:700;">⚡ โหมดพักการ์ดจอ (Zero-Render)</span>
        <span style="color:#94a3b8;font-size:11px;">บอททำงานปกติ 100% · ใช้ GPU 0% · ลด DOM/Audio</span>
        <button type="button" id="pm-zr-wake-btn" style="background:#0284c7;color:#fff;border:1px solid #38bdf8;border-radius:6px;padding:3px 10px;font-size:11px;font-weight:700;cursor:pointer;">🖥️ แสดงภาพจอนี้</button>
      `;
      document.body.appendChild(banner);
      const btn = banner.querySelector('#pm-zr-wake-btn');
      if (btn) {
        btn.onclick = (e) => {
          e.stopPropagation();
          window.setLowPowerMode(false);
        };
      }
    }
    banner.style.display = 'flex';
  }

  window.setLowPowerMode = function setLowPowerMode(on) {
    window.__lowPowerMode = Boolean(on);
    window.__pmZeroRender = window.__lowPowerMode;
    try { localStorage.setItem('pelican_zero_render', String(window.__lowPowerMode)); } catch (_) {}
    try {
      window.NCDesktop = Object.assign(window.NCDesktop || {}, {
        isWindowHidden: () => Boolean(window.__lowPowerMode)
      });
    } catch (_) {}
    try {
      const canvases = document.querySelectorAll('canvas');
      canvases.forEach(c => {
        c.style.visibility = window.__lowPowerMode ? 'hidden' : 'visible';
      });
    } catch (_) {}
    try { applyNightcampPerfSettings(); } catch (_) {}
    updateZeroRenderBanner();
    renderHudState();
    return window.__lowPowerMode;
  };
  window.setZeroRenderMode = window.setLowPowerMode;

  window.__inspectNightcampRuntime = function inspectNightcampRuntime() {
    const canvases = Array.from(document.querySelectorAll('canvas')).map(c => ({
      width: c.width,
      height: c.height,
      id: c.id || null
    }));
    const openWs = (window.__nightcampSockets || []).filter(s => s.ws && s.ws.readyState === 1).map(s => s.url);
    const O = window.NC?.Online || {};
    const L = window.NC?.OnlineLobby || {};
    const summary = {
      version: window.__nightcampBotVersion,
      url: location.href,
      entered: Boolean(L.entered),
      serverOrigin: O.origin || null,
      serverName: getCurrentServerLabel() || null,
      account: O.account || null,
      slotsCount: Array.isArray(L.slots?.slots) ? L.slots.slots.filter(s => !s.empty).length : 0,
      snapMap: O.snap?.mapId || null,
      snapChannel: O.snap?.channelId || null,
      canvases: canvases.length,
      openWebSockets: openWs.length,
      packetLogs: (window.__packetLogs || []).length,
      smartAutoQuestEnabled: Boolean(window.__smartAutoQuestEnabled),
      upgradeBotAiEnabled: Boolean(window.__upgradeBotAiEnabled),
      autoRespawnEnabled: Boolean(window.__autoRespawnEnabled),
      smartGearEnabled: Boolean(window.__smartGearEnabled),
      smartGearNote: window.__lastSmartGearNote || '',
      autoSellEnabled: Boolean(window.__autoSellEnabled),
      autoSellWeightPct: Number(window.__autoSellWeightPct) || 65,
      sellConfig: window.__sellConfig || DEFAULT_SELL_CFG,
      targetFarmMap: window.__targetFarmMap || 'auto',
      potionConfig: window.__potionConfig || DEFAULT_POTION_CFG,
      planName: window.__currentScriptPlan?.name || null,
      planEnabled: Boolean(window.__planScriptEnabled),
      planTask: window.__planActiveTask || null,
      stats: parseNightcampInGameStats()
    };
    const out = document.getElementById('nc-inspect-out');
    if (out) {
      out.textContent = `Entered:${summary.entered} | Srv:${summary.serverName || '-'} | Map:${summary.snapMap || '-'} | WS:${openWs.length}`;
    }
    return summary;
  };

  window.__getNightcampPortraitUrl = function getNightcampPortraitUrl() {
    try {
      const NC = window.NC;
      const p = NC?.game?.player;
      const eqSig = p ? `${p.name || ''}|${p.job || ''}|${JSON.stringify(p.equip || {})}|${JSON.stringify(p.look || {})}` : '';
      if (eqSig && window.__ncPortraitCacheSig === eqSig && window.__ncPortraitCacheUrl && window.__ncPortraitCacheUrl.length > 200) {
        return window.__ncPortraitCacheUrl;
      }
      const nowMs = Date.now();
      if (window.__ncPortraitLastTryAt && (nowMs - window.__ncPortraitLastTryAt < 10000)) {
        return window.__ncPortraitCacheUrl || '';
      }
      window.__ncPortraitLastTryAt = nowMs;
      const cport = document.getElementById('cport');
      if (cport && typeof cport.toDataURL === 'function' && cport.width > 0 && cport.height > 0 && !window.__lowPowerMode) {
        const url = cport.toDataURL('image/png');
        if (url && url.length > 1200) {
          window.__ncPortraitCacheSig = eqSig || 'cport';
          window.__ncPortraitCacheUrl = url;
          return url;
        }
      }
      if (p && typeof NC?.drawHero === 'function') {
        const cv = document.createElement('canvas');
        cv.width = 96;
        cv.height = 96;
        const ctx = cv.getContext('2d');
        if (ctx) {
          NC.drawHero(ctx, p.equip || {}, p, 48, 76, { scale: 1.15 });
          const url = cv.toDataURL('image/png');
          if (url && url.length > 1200) {
            window.__ncPortraitCacheSig = eqSig || 'drawHero';
            window.__ncPortraitCacheUrl = url;
            return url;
          }
        }
      }
      if (cport && typeof cport.toDataURL === 'function' && cport.width > 0 && cport.height > 0) {
        const url = cport.toDataURL('image/png');
        if (url && url.length > 400) {
          window.__ncPortraitCacheSig = eqSig || 'cport';
          window.__ncPortraitCacheUrl = url;
          return url;
        }
      }
      const heroCv = document.querySelector('#sq .win[data-sq="equip"] canvas[data-f="hero"]');
      if (heroCv && typeof heroCv.toDataURL === 'function' && heroCv.width > 0 && heroCv.height > 0) {
        const url = heroCv.toDataURL('image/png');
        if (url && url.length > 400) {
          window.__ncPortraitCacheSig = eqSig || 'hero';
          window.__ncPortraitCacheUrl = url;
          return url;
        }
      }
      const csCv = document.querySelector('body > .cs-root:not([hidden]) .cs-info canvas, body > .cs-root:not([hidden]) canvas');
      if (csCv && typeof csCv.toDataURL === 'function' && csCv.width > 0 && csCv.height > 0) {
        const url = csCv.toDataURL('image/png');
        if (url && url.length > 400) {
          window.__ncPortraitCacheUrl = url;
          return url;
        }
      }
    } catch (_) {}
    return window.__ncPortraitCacheUrl || '';
  };

  function formatNightcampGearRows(c) {
    const NC = window.NC;
    if (!c || !Array.isArray(c.rows) || !c.rows.length) return [];
    const OPT = NC?.GEAROPT?.OPT || {};
    const STAT_TH = { str: 'STR (พลัง)', agi: 'AGI (ว่องไว)', vit: 'VIT (ความอึด)', int: 'INT (สติปัญญา)', dex: 'DEX (แม่นยำ)', luk: 'LUK (โชค)' };
    return c.rows.map(r => {
      if (!r || !r.k) return null;
      const def = OPT[r.k] || {};
      let label = def.th || r.k;
      if (r.k === 'stat' && r.sub) {
        label = STAT_TH[r.sub] || r.sub.toUpperCase();
      } else if (r.sub) {
        const sk = NC?.SKILLS?.[r.sub] || (NC?.SKILL_LIST || []).find(s => s.id === r.sub || s.id?.endsWith('_' + r.sub));
        label = `${label} (${sk?.name || r.sub})`;
      }
      const isPct = !['stat', 'atk', 'matk', 'def', 'mdef', 'hp', 'sp', 'hit', 'flee'].includes(r.k);
      return {
        key: r.k,
        sub: r.sub || null,
        tier: Number(r.tier) || 0,
        val: r.v,
        text: `${label} +${r.v}${isPct ? '%' : ''}`
      };
    }).filter(Boolean);
  }

  function serializeNightcampGearCopy(c, wornSlotMap, p) {
    const NC = window.NC;
    if (!c || !c.id) return null;
    const it = NC?.ITEMS?.[c.id] || {};
    const G = NC?.GEAR;
    const icon = (typeof NC?.itemIconURL === 'function') ? (NC.itemIconURL(c.id, 44) || '') : '';
    const name = (typeof NC?.copyName === 'function')
      ? NC.copyName(c)
      : `${c.sh ? '✦ ' : ''}${it.name || c.id}${c.ref ? ' +' + c.ref : ''}`;
    const locked = Boolean(
      (typeof NC?.GearKeep?.kept === 'function' && NC.GearKeep.kept(c)) ||
      (typeof G?.kept === 'function' && G.kept(c)) ||
      (typeof NC?.invLocked === 'function' && NC.invLocked(c.u))
    );
    const salePrice = (typeof G?.salePrice === 'function') ? (G.salePrice(c) | 0) : ((typeof G?.priceOf === 'function' ? G.priceOf(c) : (it.price || 10)) | 0);
    let score = 0;
    try { score = Math.round(scoreGearCandidateForPlayer(p, c, it)); } catch (_) {}
    return {
      uid: c.u,
      id: c.id,
      name,
      baseName: it.name || c.id,
      icon,
      slot: it.slot || '',
      wtype: it.wtype || '',
      rarity: it.rarity || 'common',
      grade: Number(c.g) || 0,
      refine: Number(c.ref) || 0,
      starshine: Boolean(c.sh),
      lvReq: Number(it.lvReq || it.wc?.lv || 1),
      dmg: Array.isArray(it.dmg) ? it.dmg : (c.dm ? [c.dm, c.dm] : null),
      def: Number(it.def || c.df || 0),
      mdef: Number(it.mdef || 0),
      element: it.element || null,
      abilText: it.abilText || '',
      wskText: it.wskText || '',
      desc: it.desc || '',
      durability: typeof c.wr === 'number' ? c.wr : null,
      locked,
      wornSlot: wornSlotMap ? (wornSlotMap.get(c.u) || null) : null,
      salePrice,
      score,
      options: formatNightcampGearRows(c)
    };
  }

  window.__getNightcampCharacterInspect = function getNightcampCharacterInspect() {
    const NC = window.NC;
    const game = NC?.game;
    const p = game?.player;
    if (!NC || !game || !p || !isEnteredWorld()) {
      return { success: false, error: 'ตัวละครยังไม่ได้เข้าสู่โลกเกม Nightcamp' };
    }
    const G = NC.GEAR;
    const st = parseNightcampInGameStats();
    const sheet = (typeof NC.statSheet === 'function') ? (NC.statSheet(p) || {}) : {};
    const statPoints = (typeof NC.statusLeft === 'function') ? (NC.statusLeft(p) | 0) : (p.statPts | 0);
    const skillPoints = (typeof NC.skillsLeft === 'function') ? (NC.skillsLeft(p) | 0) : (p.skillPts | 0);
    const wt = (typeof NC.Weight?.of === 'function') ? NC.Weight.of(p) : null;

    // Refresh hero paperdoll canvas if available
    let heroPaperdollUrl = '';
    try {
      const heroCv = document.querySelector('#sq .win[data-sq="equip"] canvas[data-f="hero"]');
      if (heroCv && typeof heroCv.toDataURL === 'function' && heroCv.width > 0) {
        const u = heroCv.toDataURL('image/png');
        if (u && u.length > 500) heroPaperdollUrl = u;
      }
      if (!heroPaperdollUrl && typeof NC.drawHero === 'function') {
        const cv = document.createElement('canvas');
        cv.width = 160;
        cv.height = 160;
        const ctx = cv.getContext('2d');
        NC.drawHero(ctx, p.equip || {}, p, 80, 118, { scale: 1.55 });
        const u = cv.toDataURL('image/png');
        if (u && u.length > 500) heroPaperdollUrl = u;
      }
    } catch (_) {}

    const portraitUrl = window.__getNightcampPortraitUrl() || heroPaperdollUrl;

    // 1. Base Stats (STR, AGI, VIT, INT, DEX, LUK)
    const STAT_KEYS = ['str', 'agi', 'vit', 'int', 'dex', 'luk'];
    const baseStats = {};
    for (const k of STAT_KEYS) {
      const allocated = Number(p.stats?.[k] || 0);
      const startVal = Number(NC.START_STATS?.[k] ?? 5);
      const baseVal = startVal + allocated;
      const totalVal = Number(sheet[k] ?? baseVal);
      const bonusVal = totalVal - baseVal;
      const cost = (typeof NC.statCost === 'function') ? NC.statCost(baseVal) : (Math.floor((baseVal - 1) / 10) + 2);
      const maxStat = Number(NC.STAT_MAX || 99);
      baseStats[k] = {
        key: k,
        label: k.toUpperCase(),
        th: NC.STAT_INFO?.[k]?.th || k.toUpperCase(),
        desc: NC.STAT_INFO?.[k]?.desc || '',
        base: baseVal,
        bonus: bonusVal,
        total: totalVal,
        cost,
        canRaise: Boolean(statPoints >= cost && baseVal < maxStat)
      };
    }

    // 2. Equipped Gear Slots
    const EQUIP_SLOT_KEYS = ['weapon', 'shield', 'hat', 'glasses', 'top', 'pants', 'cape', 'robe', 'acc1', 'acc2', 'fhat', 'frobe'];
    const equipment = {};
    const wornSlotMap = new Map();
    for (const slotKey of EQUIP_SLOT_KEYS) {
      let copy = (typeof G?.wornIn === 'function') ? G.wornIn(p, slotKey) : null;
      const rawId = p.equip?.[slotKey];
      if (!copy && rawId && NC.ITEMS?.[rawId]) {
        copy = { u: 0, id: rawId, ref: 0, sh: 0, g: 0, rows: [] };
      }
      if (copy && copy.u) {
        wornSlotMap.set(copy.u, slotKey);
      }
      equipment[slotKey] = copy ? serializeNightcampGearCopy(copy, wornSlotMap, p) : null;
    }

    // 3. Equipment Bag (`NC.GEAR.bag(p)`)
    const rawBag = (typeof G?.bag === 'function' ? G.bag(p) : p.bag) || [];
    const bagGear = rawBag.map(c => serializeNightcampGearCopy(c, wornSlotMap, p)).filter(Boolean);

    // 4. Camp Storage Gear (`NC.GEAR.store(p)`)
    const rawStore = (typeof G?.store === 'function' ? G.store(p) : p.store) || [];
    const storageGear = rawStore.map(c => serializeNightcampGearCopy(c, null, p)).filter(Boolean);

    // 5. Potions, Consumables, Cards & Materials (`p.potions*` + `p.mats`)
    const consumablesAndMats = [];
    const builtinPotions = [
      { id: 'red', field: 'potions', name: 'ยาแดงขวดเล็ก (HP +60)', desc: 'ฟื้นฟู HP 60 หน่วยทันที', cat: 'potion' },
      { id: 'red_m', field: 'potionsM', name: 'ยาแดงขวดกลาง (HP +220)', desc: 'ฟื้นฟู HP 220 หน่วยทันที', cat: 'potion' },
      { id: 'red_l', field: 'potionsL', name: 'ยาแดงขวดใหญ่ (HP +900)', desc: 'ฟื้นฟู HP 900 หน่วยทันที', cat: 'potion' },
      { id: 'blue', field: 'spPotions', name: 'ยาฟ้าขวดเล็ก (SP +60)', desc: 'ฟื้นฟู SP 60 หน่วยทันที', cat: 'potion' },
      { id: 'blue_m', field: 'spPotionsM', name: 'ยาฟ้าขวดกลาง (SP +200)', desc: 'ฟื้นฟู SP 200 หน่วยทันที', cat: 'potion' },
      { id: 'blue_l', field: 'spPotionsL', name: 'ยาฟ้าขวดใหญ่ (SP +390)', desc: 'ฟื้นฟู SP 390 หน่วยทันที', cat: 'potion' }
    ];
    for (const bp of builtinPotions) {
      const qty = Number(p[bp.field] || 0);
      if (qty <= 0) continue;
      const it = resolveNightcampMaterialMeta(bp.id);
      consumablesAndMats.push({
        id: bp.id,
        name: it.name || bp.name,
        qty,
        category: 'potion',
        rarity: it.rarity || 'common',
        icon: resolveNightcampIconUrl(bp.id, 40),
        desc: it.what || it.desc || bp.desc,
        price: Number(it.price || 0),
        canUse: true,
        useLabel: '🧪 ดื่มทันที',
        useKind: 'builtin_potion'
      });
    }

    const matEntries = Object.entries(p.mats || {}).filter(([, q]) => Number(q) > 0);
    for (const [matId, rawQty] of matEntries) {
      const qty = Number(rawQty) || 0;
      const it = resolveNightcampMaterialMeta(matId);
      const cookDef = NC.Cook?.BY?.[matId] || null;
      const icon = resolveNightcampIconUrl(matId, 40);
      let category = 'material';
      let canUse = false;
      let useLabel = '';
      if (/^fd_/.test(matId) || it.kind === 'food' || it.food) {
        category = 'food';
        canUse = true;
        useLabel = '🍲 กินอาหาร';
      } else if ((typeof NC.BL?.isRune === 'function' && NC.BL.isRune(matId)) || /^bl_rune_/.test(matId) || it.kind === 'rune' || it.kindTh === 'รูน') {
        category = 'rune';
      } else if (/^lk_/.test(matId) || it.rarity === 'fashion' || it.kindTh === 'หาง' || it.kindTh === 'แฟชั่น') {
        category = 'fashion';
      } else if (/^sd_/.test(matId)) {
        category = 'seed';
      } else if (/^gx_/.test(matId) || /^bp_/.test(matId) || /^th_/.test(matId) || /^ap_/.test(matId) || /^tk_/.test(matId)) {
        category = 'boost';
        canUse = true;
        useLabel = '✨ กดใช้งาน';
      } else if (/^bl_card_/.test(matId) || it.kind === 'card' || it.kindTh === 'การ์ดวิชา') {
        category = 'card';
        canUse = true;
        useLabel = '🃏 เรียนการ์ด';
      } else if (/^(box_|pk_|wb_|mb_)/.test(matId) || it.kind === 'box' || it.kindTh === 'กล่องสุ่ม') {
        category = 'box';
        canUse = true;
        useLabel = '🎁 เปิดกล่อง';
      } else if (/^bl_(oil|ammo)_/.test(matId)) {
        category = 'oil_ammo';
        canUse = true;
        useLabel = '🔥 ใช้งาน';
      } else if (/^si_/.test(matId) && it.kind !== 'guild') {
        category = 'boost';
        canUse = true;
        useLabel = '✨ กดใช้งาน';
      }
      const locked = Boolean(typeof NC.invLocked === 'function' && NC.invLocked(matId));
      const descText = [cookDef?.tag, it.abilText || it.desc || it.line || ''].filter(Boolean).join(' · ');
      consumablesAndMats.push({
        id: matId,
        name: it.name || matId,
        qty,
        category,
        rarity: it.rarity || (category === 'card' || category === 'rune' ? 'epic' : (category === 'boost' || category === 'box' || it.rare ? 'rare' : 'common')),
        icon,
        desc: descText,
        price: Number(it.sell || it.price || 0),
        locked,
        canUse,
        useLabel,
        useKind: 'mat_main'
      });
    }

    // 6. Stored Materials in Camp Storage (`p.matStore` / `NC.matStoreIds`)
    const storageMats = [];
    const rawMatStore = p.matStore || p.storeMats || {};
    for (const [matId, rawQty] of Object.entries(rawMatStore)) {
      const qty = typeof rawQty === 'object' ? ((Number(rawQty.f) || 0) + (Number(rawQty.b) || 0)) : (Number(rawQty) || 0);
      if (qty <= 0) continue;
      const it = resolveNightcampMaterialMeta(matId);
      storageMats.push({
        id: matId,
        name: it.name || matId,
        qty,
        rarity: it.rarity || (it.rare ? 'rare' : 'common'),
        icon: resolveNightcampIconUrl(matId, 40),
        desc: it.abilText || it.desc || it.line || ''
      });
    }

    const liveVaultCoins = Number(NC?.PremiumOnline?.state?.()?.vault?.coins);
    if (Number.isFinite(liveVaultCoins)) window.__lastKnownVaultCoins = liveVaultCoins;
    const mapId = String(game.mapId || 'camp');
    const mapTitle = NC.MAPS?.[mapId]?.name || NC.MAPS?.[mapId]?.title || mapId;
    const chNow = window.getCurrentChannel();
    const nearShop = Boolean(
      mapId === 'camp' && (
        (typeof NC.Shop?.canTrade === 'function' && NC.Shop.canTrade(game)) ||
        (NC.Shop?.npc && Math.hypot((p.x || 0) - NC.Shop.npc.x, (p.y || 0) - NC.Shop.npc.y) <= 280)
      )
    );
    const forgeObj = game.world?.forge;
    const nearForge = Boolean(mapId === 'camp' && forgeObj && Math.hypot((p.x || 0) - forgeObj.x, (p.y || 0) - forgeObj.y) <= 380);

    // 7. Central Market (ตลาดกลาง) & Auto-Sell State
    ensureCMarketHooksMounted();
    if (!window.__ncLastInspectMineAt || Date.now() - window.__ncLastInspectMineAt > 4000) {
      window.__ncLastInspectMineAt = Date.now();
      try { NC.OnlineWorld?.send?.({ action: 'cmarket', kind: 'mine' }); } catch (_) {}
    }
    const cmState = (typeof NC.CMarket?.state === 'function') ? NC.CMarket.state() : null;
    const cmEval = evaluateCMarketAutoSellRules(p);
    const getItemMeta = (k, id, copy) => {
      const it = resolveNightcampMaterialMeta(id);
      const name = (copy && typeof NC.copyName === 'function')
        ? NC.copyName(copy)
        : (it.name || id);
      const icon = resolveNightcampIconUrl(id, 40);
      const rarity = it.rarity || (k === 'rune' ? 'epic' : 'common');
      return { name, icon, rarity };
    };

    const mineListings = (Array.isArray(cmState?.mine) ? cmState.mine : []).map(l => {
      if (!l) return null;
      const meta = getItemMeta(l.k, l.itemId, l.copy);
      return {
        id: l.id,
        k: l.k || 'mat',
        itemId: l.itemId,
        name: meta.name,
        icon: meta.icon,
        rarity: meta.rarity,
        price: Number(l.price) || 0,
        n: Number(l.n) || 0,
        n0: Number(l.n0 || l.n) || 0,
        totalPrice: (Number(l.price) || 0) * (Number(l.n) || 0),
        state: l.state || 'open',
        options: l.copy ? formatNightcampGearRows(l.copy) : []
      };
    }).filter(Boolean);

    const shelfCards = (Array.isArray(cmState?.res?.cards) ? cmState.res.cards : []).slice(0, 60).map(c => {
      if (!c) return null;
      const [ck, cid] = String(c.key || '').includes(':') ? String(c.key).split(':') : [c.k || 'mat', c.itemId || c.key];
      const meta = getItemMeta(ck, cid, c.sample);
      const med = Number(cmState?.med?.[c.key]?.median) || 0;
      return {
        key: c.key || `${ck}:${cid}`,
        k: ck,
        itemId: cid,
        name: meta.name,
        icon: meta.icon,
        rarity: meta.rarity,
        cheapest: Number(c.cheapest) || 0,
        listings: Number(c.listings) || 1,
        n: Number(c.n) || 1,
        median: med
      };
    }).filter(Boolean);

    const sheetListings = (Array.isArray(cmState?.list) ? cmState.list : []).slice(0, 50).map(l => {
      if (!l) return null;
      const meta = getItemMeta(l.k, l.itemId, l.copy);
      const br = (typeof NC.CMarket?.buyRule === 'function') ? NC.CMarket.buyRule(l) : { ok: !l.mine, maxN: l.n || 1, why: '' };
      return {
        id: l.id,
        k: l.k || 'mat',
        itemId: l.itemId,
        name: meta.name,
        icon: meta.icon,
        rarity: meta.rarity,
        price: Number(l.price) || 0,
        n: Number(l.n) || 1,
        seller: l.seller || 'ผู้เล่น',
        mine: Boolean(l.mine),
        buyable: Boolean(br.ok),
        maxBuyN: Number(br.maxN ?? l.n ?? 1),
        whyBlocked: br.why || '',
        band: Array.isArray(l.band) ? l.band : null,
        options: l.copy ? formatNightcampGearRows(l.copy) : []
      };
    }).filter(Boolean);

    if (!window.__ncCachedCatalogItems) {
      const cat = [];
      const seen = new Set();
      for (const [id, m] of Object.entries(NC.MATERIALS || {})) {
        if (!m || !m.name || m.bound || m.keep || seen.has(id)) continue;
        seen.add(id);
        cat.push({ id, name: m.name, kind: (NC.BL?.isRune && NC.BL.isRune(id)) ? 'rune' : 'mat' });
      }
      for (const q of (NC.POT?.LIST || [])) {
        if (!q || !q.id || seen.has(q.id)) continue;
        seen.add(q.id);
        cat.push({ id: q.id, name: q.name || q.id, kind: 'pot' });
      }
      for (const [id, it] of Object.entries(NC.ITEMS || {})) {
        if (!it || !it.name || it.bound || seen.has(id)) continue;
        seen.add(id);
        const isMat = Boolean(NC.MATERIALS?.[id] || /^(mat_|lf_|fs_|lc_|fd_|gx_|bp_|th_|ap_|bl_|si_|box_|pk_|wb_|mb_|fc_|tk_)/.test(id));
        cat.push({ id, name: it.name, kind: isMat ? 'mat' : 'item' });
      }
      window.__ncCachedCatalogItems = cat;
    }

    return {
      success: true,
      charName: p.name || st.charName || 'นักเดินทาง',
      jobId: String(p.job || 'traveler').toLowerCase(),
      jobName: NC.JOBS?.[p.job]?.name || st.charClass || 'นักเดินทาง',
      baseLv: Number(p.lv) || st.baseLv || 1,
      jobLv: Number(p.jobLv) || st.jobLv || 1,
      hp: Math.round(p.hp || 0),
      hpMax: Math.round(p.maxHp || sheet.maxHp || st.hpMax || 1),
      sp: Math.round(p.sp || 0),
      spMax: Math.round(p.maxSp || sheet.maxSp || st.spMax || 1),
      coins: Number(p.coins || 0),
      freeGold: (typeof NC.Bound?.free === 'function') ? (NC.Bound.free(p, 'gold') | 0) : Number(p.coins || 0),
      vaultCoins: typeof window.__lastKnownVaultCoins === 'number' ? window.__lastKnownVaultCoins : null,
      weightCur: wt ? Math.round(wt.w || 0) : 0,
      weightCap: wt ? Math.round(wt.cap || 0) : 0,
      weightPct: wt ? Math.round(wt.pct || 0) : 0,
      statPoints,
      skillPoints,
      mapId,
      mapName: chNow ? `${mapTitle} · CH ${chNow}` : mapTitle,
      nearShop,
      nearForge,
      portraitUrl,
      heroPaperdollUrl: heroPaperdollUrl || portraitUrl,
      baseStats,
      statSheet: {
        batk: sheet.batk ?? 0,
        watk: Array.isArray(sheet.watk) ? `${sheet.watk[0]}–${sheet.watk[1]}` : (sheet.watk ?? '0'),
        atkMulPct: Math.round(((Number(sheet.atkMul) || 1) - 1) * 100),
        matk: Array.isArray(sheet.matk) ? `${sheet.matk[0]}–${sheet.matk[1]}` : (sheet.matk ?? '0'),
        hit: sheet.hit ?? 0,
        flee: sheet.flee ?? 0,
        pdodge: sheet.pdodge ?? 0,
        crit: sheet.crit ?? 0,
        critDmg: sheet.critDmg ?? 0,
        dbl: sheet.dbl ?? 0,
        def: sheet.def ?? 0,
        vdef: sheet.vdef ?? 0,
        mdef: sheet.mdef ?? 0,
        imdef: sheet.imdef ?? 0,
        maxHp: sheet.maxHp ?? p.maxHp ?? 0,
        maxSp: sheet.maxSp ?? p.maxSp ?? 0,
        hpRegen: typeof sheet.hpRegen === 'number' ? sheet.hpRegen.toFixed(1) : '0.0',
        spRegen: typeof sheet.spRegen === 'number' ? sheet.spRegen.toFixed(1) : '0.0',
        aspd: sheet.aspd ?? 100,
        aspdMulPct: Math.round(((Number(sheet.aspdMul) || 1) - 1) * 100),
        spd: sheet.spd ?? 0,
        cdr: sheet.cdr ?? 0,
        atkElement: sheet.atkElement || 'neutral',
        armorElement: sheet.armorElement || 'neutral',
        mods: sheet.mods || {},
        lineLv: sheet.lineLv || {}
      },
      equipment,
      bagUsed: G?.used ? G.used(p) : bagGear.length,
      bagCap: G?.bagCap ? G.bagCap(p) : (G?.BAG_MAX || 40),
      storeUsed: storageGear.length,
      storeCap: G?.storeCap ? G.storeCap(p) : (G?.STORE_MAX || 60),
      bagGear,
      storageGear,
      consumablesAndMats,
      storageMats,
      cmarket: {
        autoSellConfig: window.__cmarketAutoSellConfig || DEFAULT_CMARKET_AUTOSELL_CFG,
        lastLog: window.__cmarketAutoSellLastLog || '',
        canTradeMarket: cmEval.canTradeMarket,
        tradeLockMsg: cmEval.tradeLockMsg,
        isPremium: cmEval.isPremium,
        openSlotCount: cmEval.openSlotCount,
        maxSlots: cmEval.maxSlots,
        freeSlots: cmEval.freeSlots,
        taxPct: cmEval.taxPct,
        stackMax: cmEval.stackMax,
        ruleStates: cmEval.ruleStates,
        tradableHoldings: cmEval.holdings,
        mineListings,
        shelfCards,
        sheetListings,
        catalogItems: window.__ncCachedCatalogItems || []
      }
    };
  };

  window.__runNightcampCharAction = async function runNightcampCharAction(payload) {
    const NC = window.NC;
    const game = NC?.game;
    const p = game?.player;
    if (!NC || !game || !p || !isEnteredWorld()) {
      return { success: false, error: 'ตัวละครยังไม่ได้อยู่ในเกม' };
    }
    const act = String(payload?.action || '');
    const uid = Number(payload?.uid || 0);
    const itemId = String(payload?.itemId || '');
    const slotKey = String(payload?.slot || '');
    const count = Math.max(1, Number(payload?.count) || 1);

    try {
      if (act === 'stat_up') {
        const stKey = String(payload?.stat || '').toLowerCase();
        if (!['str', 'agi', 'vit', 'int', 'dex', 'luk'].includes(stKey)) {
          return { success: false, error: 'ค่าสเตตัสไม่ถูกต้อง' };
        }
        let raised = 0;
        for (let i = 0; i < count; i++) {
          const left = (typeof NC.statusLeft === 'function') ? NC.statusLeft(p) : (p.statPts || 0);
          const curBase = (Number(NC.START_STATS?.[stKey] ?? 5)) + (Number(p.stats?.[stKey] || 0));
          const cost = (typeof NC.statCost === 'function') ? NC.statCost(curBase) : (Math.floor((curBase - 1) / 10) + 2);
          if (left < cost) break;
          if (typeof NC.raiseStat === 'function') {
            NC.raiseStat(game, stKey);
            raised++;
          }
        }
        return {
          success: raised > 0,
          message: raised > 0 ? `✅ อัป ${stKey.toUpperCase()} +${raised} เรียบร้อยแล้ว` : '⚠️ แต้มสเตตัสไม่พออัปเพิ่ม',
          data: window.__getNightcampCharacterInspect()
        };
      }

      if (act === 'smart_gear_now') {
        runSmartGearTick(game, p, true);
        return {
          success: true,
          message: `⚔️ ${window.__lastSmartGearNote || 'สวมใส่อุปกรณ์ที่ดีที่สุดตามสายอาชีพแล้ว'}`,
          data: window.__getNightcampCharacterInspect()
        };
      }

      if (act === 'equip_gear') {
        if (uid && typeof NC.invAct === 'function') {
          NC.invAct(game, `gb:use:${uid}`);
        } else if (uid && typeof NC.GEAR?.use === 'function') {
          NC.GEAR.use(game, uid);
        } else if (itemId && typeof NC.equip === 'function') {
          NC.equip(game, itemId);
        }
        window.__ncPortraitCacheSig = '';
        return {
          success: true,
          message: '⚡ สวมใส่อุปกรณ์เรียบร้อยแล้ว',
          data: window.__getNightcampCharacterInspect()
        };
      }

      if (act === 'unequip_slot') {
        const curCopy = (typeof NC.GEAR?.wornIn === 'function') ? NC.GEAR.wornIn(p, slotKey) : null;
        const curId = curCopy?.id || p.equip?.[slotKey];
        if (!curId) {
          return { success: false, error: 'ช่องนี้ไม่มีอุปกรณ์สวมใส่อยู่' };
        }
        if (typeof NC.equip === 'function') {
          NC.equip(game, curId);
        } else if (p.equip) {
          p.equip[slotKey] = null;
          NC.applyGear?.(game);
          NC.saveGame?.(game);
        }
        window.__ncPortraitCacheSig = '';
        return {
          success: true,
          message: `❌ ถอดอุปกรณ์ช่อง ${slotKey} เรียบร้อยแล้ว`,
          data: window.__getNightcampCharacterInspect()
        };
      }

      if (act === 'toggle_lock_gear') {
        const targetCopy = (p.bag || []).concat(NC.GEAR?.store?.(p) || []).find(x => x.u === uid);
        const wasLocked = Boolean(
          (targetCopy && typeof NC.GearKeep?.kept === 'function' && NC.GearKeep.kept(targetCopy)) ||
          (targetCopy && typeof NC.GEAR?.kept === 'function' && NC.GEAR.kept(targetCopy)) ||
          (typeof NC.invLocked === 'function' && NC.invLocked(uid))
        );
        if (typeof NC.invAct === 'function') {
          NC.invAct(game, `gk:${wasLocked ? 'off' : 'on'}:${uid}`);
        } else if (typeof NC.invToggleLock === 'function') {
          NC.invToggleLock(game, uid);
        }
        return {
          success: true,
          message: wasLocked ? '🔓 ปลดล็อกไอเทมแล้ว' : '🔒 ล็อกไอเทมแล้ว (ป้องกันการขาย/ทิ้ง)',
          data: window.__getNightcampCharacterInspect()
        };
      }

      if (act === 'store_gear' || act === 'withdraw_gear') {
        const dir = act === 'store_gear' ? 'put' : 'take';
        if (typeof NC.invAct === 'function') {
          NC.invAct(game, `gb:${dir}:${uid}`);
        }
        await new Promise(r => setTimeout(r, 320));
        return {
          success: true,
          message: dir === 'put' ? '📦 สั่งฝากอุปกรณ์เข้าคลังค่ายแล้ว (ต้องอยู่ใกล้ลุงโกโก้)' : '📤 สั่งเบิกอุปกรณ์เข้ากระเป๋าแล้ว (ต้องอยู่ใกล้ลุงโกโก้)',
          data: window.__getNightcampCharacterInspect()
        };
      }

      if (act === 'sell_gear') {
        if (typeof NC.invAct === 'function') {
          // Nightcamp requires 2 clicks on gb:sell:<uid> within 3s to confirm selling
          NC.invAct(game, `gb:sell:${uid}`);
          NC.invAct(game, `gb:sell:${uid}`);
        }
        await new Promise(r => setTimeout(r, 320));
        return {
          success: true,
          message: '💰 สั่งขายอุปกรณ์แล้ว (หากอยู่นอกค่าย ให้กดปุ่มกลับค่ายขายของ)',
          data: window.__getNightcampCharacterInspect()
        };
      }

      if (act === 'refine_gear') {
        if (typeof NC.invAct === 'function') {
          NC.invAct(game, `rf:pick:${uid}`);
          NC.invAct(game, `rf:go:${uid}`);
          NC.invAct(game, `rf:go:${uid}`);
        }
        await new Promise(r => setTimeout(r, 350));
        return {
          success: true,
          message: '🔨 สั่งตีบวกอุปกรณ์แล้ว (ต้องยืนใกล้เตาป๋าหมูหริ่งในค่าย)',
          data: window.__getNightcampCharacterInspect()
        };
      }

      if (act === 'discard_gear') {
        if (typeof NC.invAct === 'function') {
          const origConfirm = NC.KConfirm?.ask;
          try {
            if (NC.KConfirm) NC.KConfirm.ask = () => Promise.resolve(true);
            NC.invAct(game, `gb:discard:${uid}`);
          } finally {
            if (NC.KConfirm && origConfirm) NC.KConfirm.ask = origConfirm;
          }
        }
        await new Promise(r => setTimeout(r, 320));
        return {
          success: true,
          message: '🗑️ ทิ้งอุปกรณ์เรียบร้อยแล้ว',
          data: window.__getNightcampCharacterInspect()
        };
      }

      if (act === 'use_item') {
        const useKind = String(payload?.useKind || '');
        if (useKind === 'builtin_potion') {
          const isSp = /^blue/.test(itemId);
          if (typeof NC.usePotion === 'function') {
            NC.usePotion(game, isSp ? 'sp' : 'hp', itemId);
          } else if (typeof NC.HUD?.drink === 'function') {
            NC.HUD.drink(isSp ? 'sp' : 'hp');
          } else {
            // Trigger potion hotkey
            window.dispatchEvent(new KeyboardEvent('keydown', { key: isSp ? '2' : '1', bubbles: true }));
          }
          await new Promise(r => setTimeout(r, 200));
          return {
            success: true,
            message: `🧪 กดดื่ม ${NC.ITEMS?.[itemId]?.name || itemId} แล้ว`,
            data: window.__getNightcampCharacterInspect()
          };
        }
        if (typeof NC.invAct === 'function') {
          NC.invAct(game, 'main', { kind: 'mat', id: itemId });
        }
        await new Promise(r => setTimeout(r, 300));
        return {
          success: true,
          message: `✨ ใช้งาน ${NC.ITEMS?.[itemId]?.name || itemId} แล้ว`,
          data: window.__getNightcampCharacterInspect()
        };
      }

      if (act === 'store_mat' || act === 'withdraw_mat' || act === 'store_all_mats') {
        if (act === 'store_all_mats') {
          NC.MatStore?.send?.('putall');
          for (const [sid, sq] of Object.entries(p.mats || {})) {
            if (/^sd_/.test(sid) && (sq | 0) > 0) {
              NC.MatStore?.send?.('put', sid, sq | 0);
            }
          }
        } else {
          const dir = act === 'store_mat' ? 'put' : 'take';
          const qty = Math.max(1, Number(payload?.qty) || 1);
          NC.MatStore?.send?.(dir, itemId, qty);
        }
        await new Promise(r => setTimeout(r, 350));
        return {
          success: true,
          message: act === 'withdraw_mat' ? '📤 สั่งเบิกวัตถุดิบจากคลังแล้ว' : '📦 สั่งฝากวัตถุดิบและเมล็ดพันธุ์เข้าคลังค่ายแล้ว',
          data: window.__getNightcampCharacterInspect()
        };
      }

      if (act === 'sell_mat') {
        const matMeta = resolveNightcampMaterialMeta(itemId);
        const matName = matMeta.name || itemId;
        if (/^sd_/.test(itemId)) {
          const sq = Math.max(1, Number(p.mats?.[itemId]) || 1);
          NC.MatStore?.send?.('put', itemId, sq);
          await new Promise(r => setTimeout(r, 350));
          return {
            success: true,
            message: `📦 "${matName}" เซิร์ฟเวอร์ไม่รับขายคืนร้าน (ขายแล้วจะเด้งกลับเข้าตัว) ➔ นำฝากเข้าคลังค่าย (ไม่คิดน้ำหนัก) ให้แทนแล้ว`,
            data: window.__getNightcampCharacterInspect()
          };
        }
        if (typeof NC.invAct === 'function') {
          NC.invAct(game, `wc:kindsell:${itemId}`);
          NC.invAct(game, `wc:kindsell:${itemId}`);
        }
        await new Promise(r => setTimeout(r, 320));
        return {
          success: true,
          message: `💰 สั่งขาย ${matName} แล้ว (ต้องอยู่ใกล้ลุงโกโก้)`,
          data: window.__getNightcampCharacterInspect()
        };
      }

      if (act === 'walk_to_coco') {
        if (game.mapId !== 'camp') {
          tryWarpOrWalkToMap(game, 'camp', { map: 'camp', name: 'ค่ายกลางป่า (ลุงโกโก้)' }, targetMapWarpState);
        } else if (NC.Shop?.npc && typeof NC.Travel?.go === 'function') {
          NC.Travel.go(game, { map: 'camp', x: NC.Shop.npc.x, y: NC.Shop.npc.y + 70, r: 60, name: 'ลุงโกโก้' });
        }
        return {
          success: true,
          message: '🏃 กำลังเดินไปหาลุงโกโก้ (ร้านค้า & คลังค่าย)...',
          data: window.__getNightcampCharacterInspect()
        };
      }

      if (act === 'walk_to_forge') {
        const fg = game.world?.forge || { x: 1120, y: 820 };
        if (game.mapId !== 'camp') {
          tryWarpOrWalkToMap(game, 'camp', { map: 'camp', name: 'ค่ายกลางป่า (ป๋าหมูหริ่ง)' }, targetMapWarpState);
        } else if (typeof NC.Travel?.go === 'function') {
          NC.Travel.go(game, { map: 'camp', x: fg.x, y: fg.y + 70, r: 60, name: 'ป๋าหมูหริ่ง (ตีบวก/ซ่อมของ)' });
        }
        return {
          success: true,
          message: '🏃 กำลังเดินไปหาป๋าหมูหริ่ง (เตาตีบวก & ซ่อมอุปกรณ์)...',
          data: window.__getNightcampCharacterInspect()
        };
      }

      if (act === 'cmarket_save_autosell') {
        window.__setCMarketAutoSellConfig(payload?.config || {}, Boolean(payload?.mergeRules));
        return {
          success: true,
          message: '💾 บันทึกรายการ Auto-Sell ตลาดกลางเรียบร้อยแล้ว',
          data: window.__getNightcampCharacterInspect()
        };
      }

      if (act === 'cmarket_run_autosell_now' || act === 'cmarket_sell_rule_now') {
        ensureFreeTradeRulesAcked(p);
        ensureCMarketHooksMounted();
        const ev = evaluateCMarketAutoSellRules(p);
        if (!ev.canTradeMarket) {
          return {
            success: false,
            error: ev.tradeLockMsg || 'ตัวละครยังไม่สามารถใช้งานตลาดกลางได้',
            data: window.__getNightcampCharacterInspect()
          };
        }
        const nearCocoNow = Boolean(
          game.mapId === 'camp' && (
            (typeof NC.Shop?.canTrade === 'function' && NC.Shop.canTrade(game)) ||
            (NC.Shop?.npc && Math.hypot((p.x || 0) - NC.Shop.npc.x, (p.y || 0) - NC.Shop.npc.y) <= 220)
          )
        );
        if (nearCocoNow) {
          const targetRuleId = act === 'cmarket_sell_rule_now' ? String(payload?.ruleId || '') : '';
          const cands = targetRuleId
            ? ev.readyCandidates.filter(c => c.rule && String(c.rule.id) === targetRuleId)
            : ev.readyCandidates;
          if (cands.length === 0) {
            return {
              success: false,
              error: 'ยังไม่มีไอเทมในกระเป๋าที่ครบจำนวนพร้อมวางขายตามเงื่อนไข',
              data: window.__getNightcampCharacterInspect()
            };
          }
          if (ev.freeSlots <= 0) {
            return {
              success: false,
              error: `ชั้นวางของตลาดกลางเต็มแล้ว (${ev.openSlotCount}/${ev.maxSlots} ช่อง)`,
              data: window.__getNightcampCharacterInspect()
            };
          }
          const cmCfg = window.__cmarketAutoSellConfig || DEFAULT_CMARKET_AUTOSELL_CFG;
          const cmState = (typeof NC.CMarket?.state === 'function') ? NC.CMarket.state() : null;
          const cand = cands[0];
          try {
            NC.OnlineWorld?.send?.({
              action: 'cmarket',
              kind: 'find',
              find: { k: cand.k, ids: [cand.id], sort: 'price', page: 0 }
            });
          } catch (_) {}
          await new Promise(r => setTimeout(r, 650));
          const unitPrice = computeCMarketSmartUnitPrice(cand, cmState, cmCfg);
          const totalGross = cand.sellQty * unitPrice;
          const dep = Math.max(1, Math.floor((totalGross * 2) / 100));
          const freeGold = (typeof NC.Bound?.free === 'function') ? (NC.Bound.free(p, 'gold') | 0) : (p.coins | 0);
          if (freeGold < dep) {
            return {
              success: false,
              error: `เหรียญไม่พอจ่ายค่ามัดจำ 2% (ต้องการ ${dep.toLocaleString()}g · มี ${freeGold.toLocaleString()}g)`,
              data: window.__getNightcampCharacterInspect()
            };
          }
          NC.OnlineWorld?.send?.({
            action: 'cmarket',
            kind: 'list',
            price: unitPrice,
            thing: (cand.k === 'item' || cand.k === 'rune')
              ? { k: cand.k, id: cand.id, u: cand.u }
              : { k: cand.k, id: cand.id, n: cand.sellQty }
          });
          await new Promise(r => setTimeout(r, 550));
          try { NC.OnlineWorld?.send?.({ action: 'cmarket', kind: 'mine' }); } catch (_) {}
          await new Promise(r => setTimeout(r, 450));
          const msg = `🏪 วางขาย "${cand.name}" ×${cand.sellQty} ชิ้นละ ${unitPrice.toLocaleString()}g (รวม ${totalGross.toLocaleString()}g) สำเร็จ!`;
          window.__cmarketAutoSellLastLog = msg;
          return {
            success: true,
            message: msg,
            data: window.__getNightcampCharacterInspect()
          };
        }
        window.__triggerCMarketAutoSellNow();
        return {
          success: true,
          message: '🏃 สั่งบอทวาร์ป/เดินกลับค่ายไปหาลุงโกโก้เพื่อวางขายตลาดกลางอัตโนมัติแล้ว!',
          data: window.__getNightcampCharacterInspect()
        };
      }

      if (act === 'cmarket_list_item') {
        ensureFreeTradeRulesAcked(p);
        ensureCMarketHooksMounted();
        const ev = evaluateCMarketAutoSellRules(p);
        if (!ev.canTradeMarket) {
          return {
            success: false,
            error: ev.tradeLockMsg || 'ยังไม่สามารถวางขายในตลาดกลางได้',
            data: window.__getNightcampCharacterInspect()
          };
        }
        const nearCocoNow = Boolean(
          game.mapId === 'camp' && (
            (typeof NC.Shop?.canTrade === 'function' && NC.Shop.canTrade(game)) ||
            (NC.Shop?.npc && Math.hypot((p.x || 0) - NC.Shop.npc.x, (p.y || 0) - NC.Shop.npc.y) <= 220)
          )
        );
        if (!nearCocoNow) {
          if (game.mapId !== 'camp') {
            tryWarpOrWalkToMap(game, 'camp', { map: 'camp', name: 'ค่ายกลางป่า (ลุงโกโก้)' }, targetMapWarpState);
          } else if (NC.Shop?.npc && typeof NC.Travel?.go === 'function') {
            NC.Travel.go(game, { map: 'camp', x: NC.Shop.npc.x, y: NC.Shop.npc.y + 70, r: 60, name: 'ลุงโกโก้' });
          }
          return {
            success: false,
            error: 'ต้องยืนใกล้ร้านลุงโกโก้ในค่ายก่อนวางขาย (ระบบกำลังสั่งตัวละครเดินไปหาลุงโกโก้ให้แล้ว)',
            data: window.__getNightcampCharacterInspect()
          };
        }
        const k = String(payload?.k || 'mat');
        const id = String(payload?.itemId || '');
        const u = Number(payload?.uid || 0);
        const qty = Math.max(1, Math.floor(Number(payload?.qty) || 1));
        const copy = (k === 'item' && u) ? ((p.bag || []).find(x => x && x.u === u) || null) : null;
        const { band } = getCMarketFairPriceInfo(k, id, copy);
        const rawPrice = Math.max(1, Math.floor(Number(payload?.price) || band[0] || 100));
        const unitPrice = Math.max(band[0], Math.min(band[1], rawPrice));
        const totalGross = ((k === 'item' || k === 'rune') ? 1 : qty) * unitPrice;
        const dep = Math.max(1, Math.floor((totalGross * 2) / 100));
        const freeGold = (typeof NC.Bound?.free === 'function') ? (NC.Bound.free(p, 'gold') | 0) : (p.coins | 0);
        if (freeGold < dep) {
          return {
            success: false,
            error: `เหรียญไม่พอจ่ายค่ามัดจำ 2% (${dep.toLocaleString()}g)`,
            data: window.__getNightcampCharacterInspect()
          };
        }
        NC.OnlineWorld?.send?.({
          action: 'cmarket',
          kind: 'list',
          price: unitPrice,
          thing: (k === 'item' || k === 'rune')
            ? { k, id, u }
            : { k, id, n: qty }
        });
        await new Promise(r => setTimeout(r, 550));
        try { NC.OnlineWorld?.send?.({ action: 'cmarket', kind: 'mine' }); } catch (_) {}
        await new Promise(r => setTimeout(r, 450));
        const itemName = NC.ITEMS?.[id]?.name || NC.MATERIALS?.[id]?.name || id;
        return {
          success: true,
          message: `🏪 วางขาย "${itemName}" ×${(k === 'item' || k === 'rune') ? 1 : qty} (ชิ้นละ ${unitPrice.toLocaleString()}g) ลงตลาดกลางแล้ว`,
          data: window.__getNightcampCharacterInspect()
        };
      }

      if (act === 'cmarket_unlist') {
        ensureCMarketHooksMounted();
        const listingId = payload?.listingId;
        if (!listingId) {
          return { success: false, error: 'ไม่พบรหัสรายการที่ต้องการถอนคืน' };
        }
        NC.OnlineWorld?.send?.({
          action: 'cmarket',
          kind: 'unlist',
          listingId
        });
        await new Promise(r => setTimeout(r, 500));
        try { NC.OnlineWorld?.send?.({ action: 'cmarket', kind: 'mine' }); } catch (_) {}
        await new Promise(r => setTimeout(r, 450));
        return {
          success: true,
          message: '📥 ถอนรายการขายกลับเข้ากระเป๋าเรียบร้อยแล้ว (ต้องอยู่ใกล้ลุงโกโก้)',
          data: window.__getNightcampCharacterInspect()
        };
      }

      if (act === 'cmarket_claim_mail') {
        ensureCMarketHooksMounted();
        try {
          if (NC.Online?.rpc) {
            await NC.Online.rpc('nc_mail_claim_all', {}).catch(() => {});
          } else if (NC.KMail?.claimAll) {
            NC.KMail.claimAll();
          }
        } catch (_) {}
        try { NC.OnlineWorld?.send?.({ action: 'cmarket', kind: 'mine' }); } catch (_) {}
        await new Promise(r => setTimeout(r, 550));
        return {
          success: true,
          message: '📬 รับเงินจากการขายในตลาดกลางและของในกล่องจดหมายทั้งหมดแล้ว!',
          data: window.__getNightcampCharacterInspect()
        };
      }

      if (act === 'cmarket_search') {
        ensureCMarketHooksMounted();
        const itemKey = String(payload?.itemKey || '').trim();
        if (itemKey && itemKey.includes(':')) {
          const [fk, fid] = itemKey.split(':');
          NC.OnlineWorld?.send?.({
            action: 'cmarket',
            kind: 'find',
            find: { k: fk, ids: [fid], sort: payload?.sort || 'price', page: 0 }
          });
        } else {
          const q = String(payload?.query || '').trim();
          const cat = String(payload?.category || 'all');
          const sort = String(payload?.sort || 'price');
          const findObj = { sort, page: 0, group: !q };
          if (cat === 'mat' || cat === 'pot' || cat === 'rune' || cat === 'item') {
            findObj.k = cat;
          }
          if (q && typeof NC.CMarket?.idsFor === 'function') {
            const ids = NC.CMarket.idsFor(q);
            if (ids && ids.length) {
              findObj.ids = ids;
              findObj.group = false;
            }
          }
          NC.OnlineWorld?.send?.({
            action: 'cmarket',
            kind: 'find',
            find: findObj
          });
        }
        await new Promise(r => setTimeout(r, 750));
        return {
          success: true,
          message: '🔍 ค้นหารายการในตลาดกลางเรียบร้อยแล้ว',
          data: window.__getNightcampCharacterInspect()
        };
      }

      if (act === 'cmarket_buy') {
        ensureFreeTradeRulesAcked(p);
        ensureCMarketHooksMounted();
        const listingId = payload?.listingId;
        const buyCount = Math.max(1, Math.floor(Number(payload?.count) || 1));
        if (!listingId) {
          return { success: false, error: 'ไม่พบรหัสรายการที่ต้องการซื้อ' };
        }
        NC.OnlineWorld?.send?.({
          action: 'cmarket',
          kind: 'buy',
          listingId,
          count: buyCount
        });
        await new Promise(r => setTimeout(r, 650));
        try { NC.OnlineWorld?.send?.({ action: 'cmarket', kind: 'mine' }); } catch (_) {}
        return {
          success: true,
          message: `🛒 สั่งซื้อไอเทมจากตลาดกลาง ×${buyCount} ชิ้นแล้ว (ต้องอยู่ใกล้ลุงโกโก้)`,
          data: window.__getNightcampCharacterInspect()
        };
      }
    } catch (err) {
      return { success: false, error: String(err?.message || err) };
    }
    return { success: false, error: 'ไม่รู้จักคำสั่ง: ' + act };
  };

  window.__getClientLiveState = function getClientLiveState() {
    const openWsCount = (window.__nightcampSockets || []).filter(s => s.ws && s.ws.readyState === 1).length;
    const cfg = window.__authConfig || {};
    const srvName = getCurrentServerLabel() || cfg.serverName || '';
    const entered = isEnteredWorld();
    const plan = window.__currentScriptPlan || DEFAULT_NC_WOLF_PLAN;
    const livePortrait = window.__getNightcampPortraitUrl();

    if (entered) {
      const st = parseNightcampInGameStats();
      const p = window.NC?.game?.player;
      const mapId = window.NC?.game?.mapId || window.NC?.Online?.snap?.mapId || '';
      const mapTitle = (mapId && window.NC?.MAPS?.[mapId]?.title) ? `${window.NC.MAPS[mapId].title} (${mapId})` : mapId;
      const chId = window.NC?.Online?.snap?.channelId || '';
      const mapDisplay = mapTitle ? (chId ? `${mapTitle} · CH ${chId}` : mapTitle) : (srvName ? `Nightcamp · ${srvName}` : 'Nightcamp World');
      return {
        version: window.__nightcampBotVersion,
        isBotRunning: Boolean(window.__isBotRunning),
        zeroRender: Boolean(window.__lowPowerMode),
        connected: Boolean(navigator.onLine),
        screenPhase: 'in_game',
        botStatus: window.__isBotRunning
          ? (window.__planActiveTask || '⚔️ บอทกำลังทำงาน')
          : '⏸️ ยืนรอ / แสตนด์บาย',
        charName: st.charName || cfg.charName || null,
        charClass: st.charClass || 'Traveler',
        jobId: st.jobId || 'traveler',
        portrait: livePortrait || null,
        baseLv: st.baseLv,
        jobLv: st.jobLv,
        statPoints: (p && typeof window.NC?.statusLeft === 'function') ? (window.NC.statusLeft(p) | 0) : 0,
        skillPoints: (p && typeof window.NC?.skillsLeft === 'function') ? (window.NC.skillsLeft(p) | 0) : 0,
        map: mapDisplay,
        mapName: mapDisplay,
        serverName: srvName,
        hp: st.hp,
        hpMax: st.hpMax,
        maxHp: st.hpMax,
        sp: st.sp,
        spMax: st.spMax,
        weight: st.weight,
        coords: '--',
        zeny: st.zeny || 0,
        coins: st.zeny || 0,
        vaultCoins: st.vaultCoins,
        smartAutoQuestEnabled: Boolean(window.__smartAutoQuestEnabled),
        upgradeBotAiEnabled: Boolean(window.__upgradeBotAiEnabled),
        noLootMode: Boolean(window.__noLootMode),
        autoRespawnEnabled: Boolean(window.__autoRespawnEnabled),
        smartGearEnabled: Boolean(window.__smartGearEnabled),
        smartGearWeaponType: window.__smartGearWeaponType || 'auto',
        smartGearNote: window.__lastSmartGearNote || '',
        autoRepairEnabled: Boolean((window.__sellConfig || DEFAULT_SELL_CFG).autoRepair !== false),
        repairThresholdPct: Number((window.__sellConfig || DEFAULT_SELL_CFG).repairThresholdPct ?? 25),
        durabilitySummary: getEquipmentRepairSummary(p),
        autoSellEnabled: Boolean(window.__autoSellEnabled),
        autoSellWeightPct: Number(window.__autoSellWeightPct) || 65,
        sellConfig: window.__sellConfig || DEFAULT_SELL_CFG,
        cmarketAutoSellConfig: window.__cmarketAutoSellConfig || DEFAULT_CMARKET_AUTOSELL_CFG,
        cmarketLastLog: window.__cmarketAutoSellLastLog || '',
        targetFarmMap: window.__targetFarmMap || 'auto',
        potionConfig: window.__potionConfig || DEFAULT_POTION_CFG,
        perfConfig: window.__ncPerfConfig || DEFAULT_PERF_CFG,
        trainerConfig: window.__trainerConfig || DEFAULT_TRAINER_CFG,
        trainerAccessUnlocked: Boolean(window.__trainerAccessUnlocked),
        trainerMobStatusHtml: document.getElementById('nc-trainer-mob-status')?.innerHTML || '',
        trainerItemStatusHtml: document.getElementById('nc-trainer-item-status')?.innerHTML || '',
        potionStockHtml: document.getElementById('nc-pot-live-stock')?.innerHTML || '',
        sellLiveHtml: document.getElementById('nc-sell-live-weight')?.innerHTML || '',
        planScriptEnabled: Boolean(window.__planScriptEnabled),
        planId: plan?.id || null,
        planName: plan?.name || null,
        planTask: window.__planActiveTask || '',
        authConfig: cfg,
        autoFarmLv20: window.__autoFarmLv20Config || DEFAULT_AUTOFARM_LV20_CFG,
        freeGold: (window.NC?.Bound?.free && window.NC?.game?.player) ? (window.NC.Bound.free(window.NC.game.player, 'gold') | 0) : (st.zeny || 0),
        isJailed: false,
        isBanned: false
      };
    }

    let screenPhase = 'loading';
    let label = '⏳ กำลังโหลด Nightcamp...';
    let detail = window.__ncAuthStatusText || 'กำลังโหลดหน้าจอเกม';
    const acct = window.NC?.Online?.account;
    const isSignedIn = Boolean(acct && acct.kind && acct.kind !== 'device');
    const csRoot = document.querySelector('body > .cs-root');
    const errTxt = (csRoot?.querySelector('.cs-form .cs-err')?.textContent || '').trim();

    if (isServerPickerOpen()) {
      screenPhase = 'login';
      label = cfg.enabled ? '🌐 เลือกเซิร์ฟเวอร์ (Auto)...' : '🌐 หน้าเลือกเซิร์ฟเวอร์';
      detail = window.__ncAuthStatusText || 'กำลังเลือกเซิร์ฟเวอร์ Nightcamp';
    } else if (errTxt && window.__ncLastFailedAuthKey) {
      screenPhase = 'login_auth_error';
      label = '❌ ล็อกอินไม่ผ่าน';
      detail = errTxt;
    } else if (csRoot && !csRoot.hidden && isSignedIn) {
      screenPhase = 'char_select';
      label = '👤 หน้าเลือกตัวละคร';
      detail = window.__ncAuthStatusText || 'กำลังเลือกตัวละครเข้าสู่โลกเกม';
    } else if (csRoot && !csRoot.hidden) {
      screenPhase = 'login';
      label = cfg.enabled && cfg.username ? '🔑 หน้า Login (Auto)...' : '🔑 หน้า Login';
      detail = window.__ncAuthStatusText || 'รอเข้าสู่ระบบ';
    }

    const existingSlotChar = (window.NC?.game?.player?.name && window.NC.game.player.name !== 'Traveler')
      ? window.NC.game.player.name
      : (isSignedIn && Array.isArray(window.NC?.OnlineLobby?.slots?.slots)
        ? (window.NC.OnlineLobby.slots.slots.find(x => x && !x.empty && x.name)?.name || null)
        : null);
    const csQueueMsg = (csRoot?.querySelector('.cs-msg')?.textContent || '').trim();
    const memLv = (typeof window.NC?.game?.player?.lv === 'number' && window.NC.game.player.lv > 1)
      ? window.NC.game.player.lv
      : null;
    const memZeny = (typeof window.NC?.game?.player?.coins === 'number' && window.NC.game.player.coins > 0)
      ? window.NC.game.player.coins
      : null;

    return {
      version: window.__nightcampBotVersion,
      isBotRunning: Boolean(window.__isBotRunning),
      zeroRender: Boolean(window.__lowPowerMode),
      connected: Boolean(navigator.onLine && (openWsCount > 0 || document.querySelector('canvas'))),
      screenPhase,
      screenPhaseLabel: csQueueMsg || label,
      screenDetail: csQueueMsg || detail,
      botStatus: csQueueMsg ? `⏳ ${csQueueMsg}` : label,
      charName: existingSlotChar,
      charClass: 'Traveler',
      portrait: livePortrait || null,
      baseLv: memLv,
      jobLv: null,
      map: srvName || 'Nightcamp',
      mapName: srvName || 'Nightcamp',
      serverName: srvName,
      hp: null,
      hpMax: null,
      maxHp: null,
      sp: null,
      spMax: null,
      weight: '--',
      coords: '--',
      zeny: memZeny,
      smartAutoQuestEnabled: Boolean(window.__smartAutoQuestEnabled),
      upgradeBotAiEnabled: Boolean(window.__upgradeBotAiEnabled),
      autoRespawnEnabled: Boolean(window.__autoRespawnEnabled),
      smartGearEnabled: Boolean(window.__smartGearEnabled),
      smartGearNote: window.__lastSmartGearNote || '',
      autoSellEnabled: Boolean(window.__autoSellEnabled),
      autoSellWeightPct: Number(window.__autoSellWeightPct) || 65,
      sellConfig: window.__sellConfig || DEFAULT_SELL_CFG,
      targetFarmMap: window.__targetFarmMap || 'auto',
      potionConfig: window.__potionConfig || DEFAULT_POTION_CFG,
      planScriptEnabled: Boolean(window.__planScriptEnabled),
      planId: plan?.id || null,
      planName: plan?.name || null,
      planTask: window.__planActiveTask || '',
      authConfig: cfg,
      autoFarmLv20: window.__autoFarmLv20Config || DEFAULT_AUTOFARM_LV20_CFG,
      freeGold: 0,
      isJailed: false,
      isBanned: false
    };
  };

  window.__setPendingScriptUpdate = function (info) {
    const banner = document.getElementById('nc-script-update-banner');
    const txt = document.getElementById('nc-script-update-text');
    const btn = document.getElementById('nc-btn-apply-script-update');
    if (info && info.version && info.version !== window.__nightcampBotVersion) {
      window.__ncPendingScriptUpdate = info;
      if (banner) {
        banner.style.display = 'flex';
        if (txt) txt.textContent = `🔔 มีอัปเดต Script ใหม่ v${info.version}`;
        if (btn && !window.__ncRequestSelfHotUpdate) {
          btn.disabled = false;
          btn.textContent = '⚡ กดอัปเดต (ไม่รีเกม)';
        }
      }
      return true;
    }
    window.__ncPendingScriptUpdate = null;
    window.__ncRequestSelfHotUpdate = false;
    if (banner) banner.style.display = 'none';
    return false;
  };

  function createHud() {
    if (document.getElementById('nightcamp-hud') || !document.body) return;
    const cfg = window.__authConfig || loadAuthCfg();
    const pc = window.__potionConfig || loadPotionCfg();
    const sc = window.__sellConfig || loadSellCfg();
    const plan = window.__currentScriptPlan || DEFAULT_NC_WOLF_PLAN;
    const hud = document.createElement('div');
    hud.id = 'nightcamp-hud';
    hud.setAttribute('data-noeng', '1');
    Object.assign(hud.style, {
      position: 'fixed',
      top: '14px',
      right: '14px',
      zIndex: '2147483640',
      width: '322px',
      background: 'rgba(15, 23, 42, 0.95)',
      border: '1px solid #38bdf8',
      borderRadius: '10px',
      boxShadow: '0 10px 28px rgba(0, 0, 0, 0.55)',
      color: '#f1f5f9',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '12px',
      overflow: 'hidden',
      userSelect: 'none'
    });

    const mapOptsHtml = STATIC_FARM_MAP_OPTIONS.map(([id, label]) =>
      `<option value="${id}" ${window.__targetFarmMap === id ? 'selected' : ''}>${label}</option>`
    ).join('');

    const weightOptsHtml = [45, 50, 55, 60, 65, 70, 75, 80].map(pct =>
      `<option value="${pct}" ${Number(sc.weightThreshold || window.__autoSellWeightPct) === pct ? 'selected' : ''}>${pct}%</option>`
    ).join('');

    const makeGradeOptsHtml = (curGrade) => [
      [0, '❌ ไม่ขาย'],
      [1, '⚪ ทั่วไป (Common)'],
      [2, '🟢 หายาก (Rare) ลงไป'],
      [3, '🔵 ล้ำค่า (Epic) ลงไป'],
      [4, '🟣 ตำนาน (Legend) ลงไป']
    ].map(([val, label]) =>
      `<option value="${val}" ${Number(curGrade) === val ? 'selected' : ''}>${label}</option>`
    ).join('');

    const curWtype = String(window.__smartGearWeaponType || 'auto');
    const smartGearWtypeOptsHtml = [
      ['auto', '✨ อัตโนมัติตามอาชีพ/สกิล'],
      ['sword', '🗡️ ดาบมือเดียว (+โล่)'],
      ['gsword', '⚔️ ดาบใหญ่ 2 มือ'],
      ['dsword', '⚔️ ดาบคู่ (Swordmaster)'],
      ['spear', '🔱 หอกมือเดียว (+โล่)'],
      ['lance', '🔱 หอกยาว 2 มือ (Dragonknight)'],
      ['axe', '🪓 ขวานมือเดียว (+โล่)'],
      ['gaxe', '🪓 ขวานยักษ์ 2 มือ (Berserker)'],
      ['hammer', '🔨 ค้อนยักษ์ 2 มือ (Berserker)'],
      ['mace', '🔨 กระบองมือเดียว (+โล่)'],
      ['dagger', '🗡️ มีดคู่ (Rogue/Assassin)'],
      ['katar', '爪 คาทาร์ (Assassin)'],
      ['huuma', '卍 ดาวยักษ์ (Shinobi)'],
      ['scythe', '🌙 เคียวใหญ่ 2 มือ (Reaper)'],
      ['sickle', '🌙 เคียวคู่ (Reaper)'],
      ['puppet', '🎎 ไม้เชิดหุ่น (+โล่ · Puppeteer)'],
      ['wire', '🧵 ด้ายเหล็ก 2 มือ (Puppeteer)'],
      ['bow', '🏹 ธนู (Archer/Hunter/Ranger)'],
      ['xbow', '🏹 หน้าไม้ (Ranger/Sniper)'],
      ['instrument', '🎸 เครื่องดนตรี (Bard)'],
      ['whip', '〰️ แส้ (+โล่ · Bard)'],
      ['pistol', '🔫 ปืนพกคู่ (Gunslinger)'],
      ['shotgun', '💥 ลูกซอง (Gunslinger)'],
      ['staff', '🪄 คทา 2 มือ (Mage/Archmage/Priest)'],
      ['orb', '🔮 ออร์บเวท (+โล่ · Mage/Archmage)'],
      ['lantern', '🏮 ตะเกียง (Warlock)'],
      ['book', '📖 คัมภีร์ (+โล่ · Bishop)'],
      ['knuckle', '🥊 สนับมือ (Monk)'],
      ['qstaff', '🦯 ไม้พลอง 2 มือ (Monk)'],
      ['torch', '🔥 คบเพลิง (+โล่ · Lightkeeper)'],
      ['bell', '🔔 กระดิ่งวิญญาณ (+โล่ · Wisp)']
    ].map(([val, label]) =>
      `<option value="${val}" ${curWtype === val ? 'selected' : ''}>${label}</option>`
    ).join('');

    const makeDrinkPctOptsHtml = (curPct, isSp) => [0, 20, 30, 40, 50, 60, 70, 75, 80, 85, 90, 95].map(pct => {
      const lbl = pct === 0
        ? '❌ ไม่ปั๊ม (0%)'
        : (isSp && (pct === 80 || pct === 85) ? `${pct}% (⚡ Archmage ร่ายไว)` : `${pct}%`);
      return `<option value="${pct}" ${Number(curPct) === pct ? 'selected' : ''}>${lbl}</option>`;
    }).join('');

    hud.innerHTML = `
      <div id="nc-hud-header" style="display:flex; justify-content:space-between; align-items:center; padding:8px 10px; background:rgba(14,116,144,0.3); border-bottom:1px solid rgba(56,189,248,0.28); cursor:move; font-weight:700; color:#38bdf8;">
        <span>🌙 Nightcamp v${window.__nightcampBotVersion}</span>
        <div style="display:flex; align-items:center; gap:6px;">
          <span id="nc-lowpower-badge" style="font-size:10px; color:#64748b;">LowPower: OFF</span>
          <span id="nc-hud-collapse" title="ย่อ/ขยาย" style="cursor:pointer; padding:0 4px; color:#cbd5e1;">−</span>
        </div>
      </div>
      <div id="nc-script-update-banner" style="display:none; align-items:center; justify-content:space-between; gap:6px; padding:6px 10px; background:linear-gradient(135deg, rgba(234,179,8,0.28), rgba(217,119,6,0.22)); border-bottom:1px solid rgba(250,204,21,0.5); font-size:10.5px; color:#fef08a;">
        <span id="nc-script-update-text" style="font-weight:700;">🔔 มีอัปเดต Script ใหม่!</span>
        <button type="button" id="nc-btn-apply-script-update" style="padding:3px 8px; border-radius:4px; border:1px solid #facc15; background:#ca8a04; color:#fff; font-size:10px; font-weight:700; cursor:pointer; white-space:nowrap;">⚡ กดอัปเดต (ไม่รีเกม)</button>
      </div>
      <div id="nc-hud-body" style="padding:8px 10px; display:flex; flex-direction:column; gap:7px; max-height:85vh; overflow-y:auto;">
        <div id="nc-hud-tabbar" style="display:grid; grid-template-columns:${window.__trainerAccessUnlocked ? '1.05fr 0.85fr 0.85fr 0.78fr 0.85fr' : '1.15fr 0.95fr 0.95fr 0.85fr'}; gap:3px; background:rgba(2,6,23,0.6); padding:3px; border-radius:6px; border:1px solid rgba(148,163,184,0.2);">
          <button type="button" id="nc-tab-btn-bot" style="padding:5px 2px; border:0; border-radius:4px; font-size:10px; font-weight:700; cursor:pointer; background:#0284c7; color:#fff; white-space:nowrap;">🚀 บอท & เควส</button>
          <button type="button" id="nc-tab-btn-potions" style="padding:5px 2px; border:0; border-radius:4px; font-size:10px; font-weight:700; cursor:pointer; background:transparent; color:#94a3b8; white-space:nowrap;">🧪 ระบบยา</button>
          <button type="button" id="nc-tab-btn-sell" style="padding:5px 2px; border:0; border-radius:4px; font-size:10px; font-weight:700; cursor:pointer; background:transparent; color:#94a3b8; white-space:nowrap;">🛒 ซื้อ/ขาย</button>
          <button type="button" id="nc-tab-btn-settings" style="padding:5px 2px; border:0; border-radius:4px; font-size:10px; font-weight:700; cursor:pointer; background:transparent; color:#94a3b8; white-space:nowrap;">⚙️ ตั้งค่า</button>
          <button type="button" id="nc-tab-btn-trainer" style="display:${window.__trainerAccessUnlocked ? 'inline-block' : 'none'}; padding:5px 2px; border:0; border-radius:4px; font-size:10px; font-weight:700; cursor:pointer; background:transparent; color:#f43f5e; white-space:nowrap;" title="ระบบพิเศษสำหรับผู้ได้รับอนุมัติ Access">🧲 Trainer</button>
        </div>

        <!-- TAB 1: 🚀 BOT & QUEST -->
        <div id="nc-pane-bot" style="display:flex; flex-direction:column; gap:6px;">
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px;">
            <span id="nc-status-badge" style="font-weight:700; color:#94a3b8;">⏸️ STANDBY (OFF)</span>
          </div>
          <div id="nc-auth-status" style="font-size:10.5px; color:#94a3b8; background:rgba(2,6,23,0.55); border:1px solid rgba(148,163,184,0.18); border-radius:5px; padding:4px 7px; line-height:1.35;">${window.__ncAuthStatusText || 'Auto-Login: พร้อมทำงาน'}</div>

          <!-- Toggle 1: Standalone Smart Auto-Quest (Highest Priority) -->
          <div style="background:rgba(6,78,59,0.42); border:1px solid rgba(52,211,153,0.45); border-radius:6px; padding:6px 8px; display:flex; flex-direction:column; gap:3px;">
            <label style="display:flex; align-items:center; gap:6px; font-size:11px; font-weight:700; color:#6ee7b7; cursor:pointer;" title="ใหญ่สุด: ทำเควสหลัก (MQ) + บทเรียน + ตัดไม้/ขุดแร่/ปลูกผัก + กดข้ามการ์ตูนเนื้อเรื่องอัตโนมัติ (ถ้าไม่เปิด Plan Script จะหยุดรอให้เลือกอาชีพเอง)">
              <input type="checkbox" id="p-smart-autoquest-enabled" ${window.__smartAutoQuestEnabled ? 'checked' : ''} style="accent-color:#10b981;">
              <span>🧭 เปิด Smart Auto-Quest (ใหญ่สุด)</span>
            </label>
            <div style="font-size:9.5px; color:#a7f3d0; line-height:1.3;">ทำเควสต่อเนื่อง + กดผ่านเนื้อเรื่อง (หยุดรอให้เลือกอาชีพเองหากปิด Plan)</div>
          </div>

          <!-- Toggle 2: Upgrade BOT AI, Auto-Respawn & Smart Gear -->
          <div style="background:rgba(12,74,110,0.42); border:1px solid rgba(56,189,248,0.45); border-radius:6px; padding:6px 8px; display:flex; flex-direction:column; gap:4px;">
            <label style="display:flex; align-items:center; gap:6px; font-size:11px; font-weight:700; color:#7dd3fc; cursor:pointer;" title="ปลดล็อก Auto-Skill ทั้งแถบ 1 + แถบ 2 (16 ช่อง) + อาชีพพระ Auto สกิลแสงเยียวยาใส่มอนธาตุมืด/อมตะ/ซอมบี้รอบตัว + แก้บั๊กเดินวนเก็บของ + วิ่งหาโซนเกิดมอนอัตโนมัติ">
              <input type="checkbox" id="p-upgrade-bot-ai-enabled" ${window.__upgradeBotAiEnabled ? 'checked' : ''} style="accent-color:#0ea5e9;">
              <span>🧠 Upgrade BOT AI (ออโต้สกิลแถบ 1+2 / พระฮีลซอมบี้)</span>
            </label>
            <label style="display:flex; align-items:center; gap:6px; font-size:11px; font-weight:700; color:#fda4af; cursor:pointer; border-top:1px solid rgba(56,189,248,0.2); padding-top:4px;" title="เมื่อตัวละครหมดแรง/ตาย จะกดปุ่มกลับค่ายเกิดใหม่ทันที (ไม่ต้องรอ 30 วินาที) เติมยาแล้วกลับไปลุยเควสหรือแมพฟาร์มต่อ">
              <input type="checkbox" id="p-auto-respawn-enabled" ${window.__autoRespawnEnabled ? 'checked' : ''} style="accent-color:#f43f5e;">
              <span>⚰️ เปิด Auto-Respawn (ตายเกิดใหม่ทันที+ลุยต่อ)</span>
            </label>
            <label style="display:flex; align-items:center; gap:6px; font-size:11px; font-weight:700; color:#c084fc; cursor:pointer; border-top:1px solid rgba(56,189,248,0.2); padding-top:4px;" title="สวมใส่อาวุธ ชุดเกราะ หมวก และประดับในกระเป๋าที่ดีกว่าเดิมโดยคำนวณตามสายอาชีพและ Stats ของตัวละครอัตโนมัติทันทีที่ดรอป">
              <input type="checkbox" id="p-smart-gear-enabled" ${window.__smartGearEnabled ? 'checked' : ''} style="accent-color:#a855f7;">
              <span>⚔️ เปิด Smart Gear (สวมใส่ของตามสายอาชีพ)</span>
            </label>
            <div style="display:flex; align-items:center; justify-content:space-between; gap:5px; padding-left:2px;">
              <span style="font-size:9.5px; color:#d8b4fe; white-space:nowrap;">🎯 อาวุธที่ใส่:</span>
              <select id="p-smart-gear-wtype" style="flex:1; min-width:0; background:#090d16; border:1px solid rgba(168,85,247,0.5); color:#f3e8ff; border-radius:4px; font-size:10px; padding:2px 5px; cursor:pointer;">
                ${smartGearWtypeOptsHtml}
              </select>
            </div>
            <div id="nc-smart-gear-status" style="font-size:9.5px; color:#e9d5ff; background:rgba(2,6,23,0.45); border-radius:4px; padding:2px 6px; line-height:1.3;">${window.__lastSmartGearNote || '⚔️ Smart Gear: พร้อมอัปเกรดอุปกรณ์ตามสายอาชีพ'}</div>

            <!-- Auto-Repair & Vault Withdrawal on Tab 1 -->
            <div style="border-top:1px solid rgba(56,189,248,0.25); padding-top:4px; display:flex; flex-direction:column; gap:3px;">
              <label style="display:flex; align-items:center; gap:6px; font-size:11px; font-weight:700; color:#fde68a; cursor:pointer;" title="ซ่อมอุปกรณ์ที่สวมใส่ที่ป๋าหมูหริ่งอัตโนมัติ และหากเงินติดตัวไม่พอจะเปิดคลังร่วมไอดีเพื่อเบิกเงินมาซ่อมให้อัตโนมัติ">
                <input type="checkbox" id="p-bot-auto-repair" ${sc.autoRepair !== false ? 'checked' : ''} style="accent-color:#f59e0b;">
                <span>🔨 เปิดซ่อมของอัตโนมัติ (เงินไม่พอเบิกจากคลัง)</span>
              </label>
              <div style="display:flex; align-items:center; justify-content:space-between; gap:5px; padding-left:2px;">
                <span style="font-size:9.5px; color:#fef08a; white-space:nowrap;">🔧 ซ่อมเมื่อทน ≤</span>
                <select id="p-bot-repair-pct" style="flex:1; min-width:0; background:#090d16; border:1px solid rgba(251,191,36,0.5); color:#fef3c7; border-radius:4px; font-size:10px; padding:2px 4px; cursor:pointer;">
                  <option value="15" ${Number(sc.repairThresholdPct ?? 25) === 15 ? 'selected' : ''}>15% (ใกล้พัง)</option>
                  <option value="25" ${Number(sc.repairThresholdPct ?? 25) === 25 ? 'selected' : ''}>25% (แนะนำ)</option>
                  <option value="35" ${Number(sc.repairThresholdPct ?? 25) === 35 ? 'selected' : ''}>35%</option>
                  <option value="50" ${Number(sc.repairThresholdPct ?? 25) === 50 ? 'selected' : ''}>50% (ครึ่งหลอด)</option>
                  <option value="0" ${Number(sc.repairThresholdPct ?? 25) === 0 ? 'selected' : ''}>เฉพาะตอนแวะค่าย</option>
                </select>
                <button type="button" id="nc-btn-repair-now" title="สั่งกลับค่ายไปซ่อมอุปกรณ์ที่ป๋าหมูหริ่งทันที (หากเงินไม่พอจะเบิกจากคลังร่วมให้อัตโนมัติ)" style="padding:2px 7px; border:1px solid #fbbf24; border-radius:4px; background:linear-gradient(135deg,#d97706,#b45309); color:#fff; font-size:9.5px; font-weight:700; cursor:pointer; white-space:nowrap;">🔨 ซ่อมทันที</button>
              </div>
              <div id="nc-durability-status" style="font-size:9.5px; color:#a7f3d0; background:rgba(2,6,23,0.45); border-radius:4px; padding:2px 6px; line-height:1.3;">🛡️ ความทนอุปกรณ์: พร้อมตรวจสอบ (เบิกคลังร่วมอัตโนมัติ)</div>
            </div>
          </div>

          <!-- Toggle 3: Target Farm Map (Active when Smart Auto-Quest is OFF) -->
          <div style="background:rgba(15,23,42,0.75); border:1px solid rgba(148,163,184,0.35); border-radius:6px; padding:6px 8px; display:flex; flex-direction:column; gap:4px;">
            <div style="font-size:10.5px; font-weight:700; color:#e2e8f0;">🗺️ แมพฟาร์มประจำ (เมื่อปิด Auto-Quest):</div>
            <input type="text" id="p-target-farm-map-search" placeholder="🔍 พิมพ์ค้นหาชื่อแมพ / เลเวล / รหัสแมพ (คลิกเพื่อเลือก)..." autocomplete="off" style="width:100%; box-sizing:border-box; background:#090d16; border:1px solid rgba(56,189,248,0.35); color:#e0f2fe; border-radius:4px; font-size:10px; padding:3px 6px;">
            <div id="p-target-farm-map-results" style="display:none; flex-direction:column; gap:3px; max-height:145px; overflow-y:auto; background:#050811; border:1px solid rgba(56,189,248,0.55); border-radius:5px; padding:4px;"></div>
            <select id="p-target-farm-map" style="width:100%; background:#090d16; border:1px solid rgba(56,189,248,0.45); color:#fff; border-radius:4px; font-size:10.5px; padding:4px 6px; cursor:pointer;">
              ${mapOptsHtml}
            </select>
            <div id="nc-target-map-hint" style="font-size:9.5px; color:#fcd34d; line-height:1.3;">⚠️ ตอนนี้เปิด Smart Auto-Quest อยู่ (หากต้องการล็อกแมพนี้ให้ติ๊กปิด Auto-Quest)</div>
          </div>

          <!-- Toggle 4: Plan Script (Auto Job Change + Stat/Skill + Map Triggers) -->
          <div style="background:rgba(30,17,56,0.55); border:1px solid rgba(168,85,247,0.4); border-radius:6px; padding:6px 8px; display:flex; flex-direction:column; gap:4px;">
            <label style="display:flex; align-items:center; gap:6px; font-size:11px; font-weight:700; color:#e9d5ff; cursor:pointer;" title="เปิดเพื่อเปลี่ยนอาชีพ Class 1/2/3 อัตโนมัติ + อัป Stat/Skill + ย้ายแมพฟาร์มตามแผน">
              <input type="checkbox" id="p-plan-script-enabled" ${window.__planScriptEnabled ? 'checked' : ''} style="accent-color:#a855f7;">
              <span>📜 เปิด Plan Script (เปลี่ยนอาชีพ/ย้ายแมพตามแผน)</span>
            </label>
            <div id="nc-plan-name-badge" style="font-size:10px; color:#38bdf8; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${plan.name}</div>
            <div id="nc-plan-task-status" style="font-size:10px; color:#6ee7b7; background:rgba(2,6,23,0.6); border-radius:4px; padding:3px 6px; line-height:1.35;">${window.__planActiveTask || '🧭 พร้อมทำเควสอัตโนมัติเมื่อกด START BOT'}</div>
          </div>

          <button type="button" id="nc-toggle-btn" style="width:100%; padding:7px 10px; border:0; border-radius:6px; color:#fff; font-weight:700; cursor:pointer;">▶ START BOT (เริ่มบอท)</button>
          <button type="button" id="nc-lowpower-btn" style="width:100%; padding:5px 8px; border:1px solid rgba(56,189,248,0.35); border-radius:6px; background:rgba(56,189,248,0.12); color:#7dd3fc; font-size:11px; font-weight:600; cursor:pointer;">⚡ พักกราฟิก (Zero-Render)</button>
          <button type="button" id="nc-inspect-btn" style="width:100%; padding:5px 8px; border:1px solid #334155; border-radius:6px; background:#1e293b; color:#cbd5e1; font-size:11px; cursor:pointer;">🔍 Inspect Runtime</button>
          <div id="nc-inspect-out" style="font-size:10px; color:#94a3b8; word-break:break-word;"></div>
        </div>

        <!-- TAB 2: 🧪 POTION CRAFT & BUY SYSTEM -->
        <div id="nc-pane-potions" style="display:none; flex-direction:column; gap:7px;">
          <!-- HP Potion Card -->
          <div style="background:rgba(127,29,29,0.36); border:1px solid rgba(248,113,113,0.45); border-radius:7px; padding:7px 8px; display:flex; flex-direction:column; gap:5px;">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:6px;">
              <label style="display:flex; align-items:center; gap:5px; font-size:11px; font-weight:700; color:#fca5a5; cursor:pointer; white-space:nowrap;">
                <input type="checkbox" id="p-pot-hp-enabled" ${pc.hpEnabled !== false ? 'checked' : ''} style="accent-color:#ef4444;">
                <span>❤️ HP (ยาแดง)</span>
              </label>
              <select id="p-pot-hp-size" style="flex:1; min-width:0; background:#090d16; border:1px solid rgba(248,113,113,0.5); color:#fecaca; border-radius:4px; font-size:10.5px; padding:3px 5px; cursor:pointer;">
                <option value="red" ${pc.hpSize === 'red' ? 'selected' : ''}>ขวดเล็ก (HP+60 · ต้ม 25g/ซื้อ 50g)</option>
                <option value="red_m" ${pc.hpSize === 'red_m' ? 'selected' : ''}>ขวดกลาง (HP+220 · ต้ม 80g/ซื้อ 160g)</option>
                <option value="red_l" ${pc.hpSize === 'red_l' ? 'selected' : ''}>ขวดใหญ่ (HP+900 · ต้ม 190g/ซื้อ 380g)</option>
                <option value="auto" ${pc.hpSize === 'auto' ? 'selected' : ''}>⚡ อัตโนมัติตามเลเวล</option>
              </select>
            </div>
            <div style="display:flex; align-items:center; justify-content:space-between; gap:6px;">
              <span style="font-size:9.5px; color:#fecaca; white-space:nowrap;">🍹 ดื่มยาแดงเมื่อ HP ต่ำกว่า:</span>
              <select id="p-pot-hp-drink-pct" style="flex:1; min-width:0; background:#090d16; border:1px solid rgba(248,113,113,0.45); color:#fff; border-radius:4px; font-size:10.5px; font-weight:700; padding:2px 6px; cursor:pointer;">
                ${makeDrinkPctOptsHtml(pc.hpDrinkPct ?? 60, false)}
              </select>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; align-items:center;">
              <div style="display:flex; flex-direction:column; gap:2px;">
                <span style="font-size:9.5px; color:#fecaca;">กลับไปซื้อ/คราฟเมื่อต่ำกว่า:</span>
                <input type="number" id="p-pot-hp-min" min="0" max="500" value="${pc.hpMin ?? 15}" style="width:100%; box-sizing:border-box; background:#090d16; border:1px solid rgba(248,113,113,0.45); color:#fff; border-radius:4px; font-size:11px; padding:3px 6px;">
              </div>
              <div style="display:flex; flex-direction:column; gap:2px;">
                <span style="font-size:9.5px; color:#fecaca;">จำนวนซื้อ/คราฟให้ครบ:</span>
                <input type="number" id="p-pot-hp-target" min="10" max="990" value="${pc.hpTarget ?? 100}" style="width:100%; box-sizing:border-box; background:#090d16; border:1px solid rgba(248,113,113,0.45); color:#fff; border-radius:4px; font-size:11px; padding:3px 6px;">
              </div>
            </div>
          </div>

          <!-- Mana (SP) Potion Card -->
          <div style="background:rgba(30,58,138,0.38); border:1px solid rgba(96,165,250,0.45); border-radius:7px; padding:7px 8px; display:flex; flex-direction:column; gap:5px;">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:6px;">
              <label style="display:flex; align-items:center; gap:5px; font-size:11px; font-weight:700; color:#93c5fd; cursor:pointer; white-space:nowrap;">
                <input type="checkbox" id="p-pot-sp-enabled" ${pc.spEnabled !== false ? 'checked' : ''} style="accent-color:#3b82f6;">
                <span>💙 Mana (ยาฟ้า)</span>
              </label>
              <select id="p-pot-sp-size" style="flex:1; min-width:0; background:#090d16; border:1px solid rgba(96,165,250,0.5); color:#bfdbfe; border-radius:4px; font-size:10.5px; padding:3px 5px; cursor:pointer;">
                <option value="blue" ${pc.spSize === 'blue' ? 'selected' : ''}>ขวดเล็ก (SP+60 · ต้ม 15g/ซื้อ 30g)</option>
                <option value="blue_m" ${pc.spSize === 'blue_m' ? 'selected' : ''}>ขวดกลาง (SP+200 · ต้ม 45g/ซื้อ 90g)</option>
                <option value="blue_l" ${pc.spSize === 'blue_l' ? 'selected' : ''}>ขวดใหญ่ (SP+390 · ต้ม 110g/ซื้อ 220g)</option>
                <option value="auto" ${pc.spSize === 'auto' ? 'selected' : ''}>⚡ อัตโนมัติตามเลเวล</option>
              </select>
            </div>
            <div style="display:flex; align-items:center; justify-content:space-between; gap:6px;">
              <span style="font-size:9.5px; color:#bfdbfe; white-space:nowrap;">🍹 ดื่มยาฟ้าเมื่อ Mana ต่ำกว่า:</span>
              <select id="p-pot-sp-drink-pct" style="flex:1; min-width:0; background:#090d16; border:1px solid rgba(96,165,250,0.45); color:#fff; border-radius:4px; font-size:10.5px; font-weight:700; padding:2px 6px; cursor:pointer;">
                ${makeDrinkPctOptsHtml(pc.spDrinkPct ?? 40, true)}
              </select>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; align-items:center;">
              <div style="display:flex; flex-direction:column; gap:2px;">
                <span style="font-size:9.5px; color:#bfdbfe;">กลับไปซื้อ/คราฟเมื่อต่ำกว่า:</span>
                <input type="number" id="p-pot-sp-min" min="0" max="500" value="${pc.spMin ?? 10}" style="width:100%; box-sizing:border-box; background:#090d16; border:1px solid rgba(96,165,250,0.45); color:#fff; border-radius:4px; font-size:11px; padding:3px 6px;">
              </div>
              <div style="display:flex; flex-direction:column; gap:2px;">
                <span style="font-size:9.5px; color:#bfdbfe;">จำนวนซื้อ/คราฟให้ครบ:</span>
                <input type="number" id="p-pot-sp-target" min="10" max="990" value="${pc.spTarget ?? 60}" style="width:100%; box-sizing:border-box; background:#090d16; border:1px solid rgba(96,165,250,0.45); color:#fff; border-radius:4px; font-size:11px; padding:3px 6px;">
              </div>
            </div>
          </div>

          <!-- Craft-First Mode & Live Stock -->
          <div style="background:rgba(6,78,59,0.36); border:1px solid rgba(52,211,153,0.4); border-radius:7px; padding:7px 8px; display:flex; flex-direction:column; gap:5px;">
            <label style="display:flex; align-items:flex-start; gap:6px; font-size:10.5px; font-weight:700; color:#6ee7b7; cursor:pointer; line-height:1.35;">
              <input type="checkbox" id="p-pot-prefer-craft" ${pc.preferCraft !== false ? 'checked' : ''} style="accent-color:#10b981; margin-top:2px;">
              <span>⚗️ เอาขยะมอนไปต้มยาก่อน (ถูกกว่าซื้อ 50%) ถ้าไม่มีขยะให้ซื้อจากร้านลุงโกโก้ในเมืองอัตโนมัติ</span>
            </label>
            <div id="nc-pot-live-stock" style="font-size:10px; color:#cbd5e1; background:rgba(2,6,23,0.6); border-radius:5px; padding:5px 7px; line-height:1.45;">
              กำลังตรวจสอบจำนวนยาและขยะมอนในตัว...
            </div>
            <button type="button" id="nc-btn-pot-restock-now" style="width:100%; padding:6px 8px; border:1px solid #34d399; border-radius:5px; background:linear-gradient(135deg,#059669,#047857); color:#fff; font-size:11px; font-weight:700; cursor:pointer;">🧪 สั่งกลับค่ายไปคราฟ/ซื้อยาทันที</button>
          </div>
        </div>

        <!-- TAB 3: 🛒 BUY / SELL & CAMP STORAGE HUB -->
        <div id="nc-pane-sell" style="display:none; flex-direction:column; gap:6px;">
          <!-- Card 1: Weight Return & Live Status -->
          <div style="background:rgba(120,53,15,0.38); border:1px solid rgba(251,191,36,0.45); border-radius:7px; padding:7px 8px; display:flex; flex-direction:column; gap:5px;">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
              <label style="display:flex; align-items:center; gap:5px; font-size:11px; font-weight:700; color:#fde68a; cursor:pointer;">
                <input type="checkbox" id="p-auto-sell-enabled" ${sc.enabled !== false ? 'checked' : ''} style="accent-color:#f59e0b;">
                <span>💰 เปิด Auto-Sell เมื่อนน.เกิน</span>
              </label>
              <select id="p-auto-sell-weight-pct" style="background:#090d16; border:1px solid rgba(251,191,36,0.5); color:#fde68a; border-radius:4px; font-size:10.5px; font-weight:700; padding:2px 6px; cursor:pointer;">
                ${weightOptsHtml}
              </select>
            </div>
            <div id="nc-sell-live-weight" style="font-size:10px; color:#cbd5e1; background:rgba(2,6,23,0.6); border-radius:5px; padding:5px 7px; line-height:1.45;">
              ⚖️ กำลังตรวจสอบน้ำหนักและกระเป๋าอุปกรณ์...
            </div>
          </div>

          <!-- Card 2: Category & Grade Filters (Uncle Coco Shop) -->
          <div style="background:rgba(15,23,42,0.78); border:1px solid rgba(56,189,248,0.38); border-radius:7px; padding:7px 8px; display:flex; flex-direction:column; gap:5px;">
            <div style="font-size:10.5px; font-weight:700; color:#38bdf8;">🗂️ แยกขายตามระดับและประเภท (ร้านลุงโกโก้):</div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:5px;">
              <div style="display:flex; flex-direction:column; gap:2px;">
                <span style="font-size:9.5px; color:#cbd5e1;">⚔️ อาวุธ:</span>
                <select id="p-sell-weapon-grade" style="width:100%; background:#090d16; border:1px solid #334155; color:#fff; border-radius:4px; font-size:10px; padding:3px 4px; cursor:pointer;">
                  ${makeGradeOptsHtml(sc.weaponMaxGrade ?? 1)}
                </select>
              </div>
              <div style="display:flex; flex-direction:column; gap:2px;">
                <span style="font-size:9.5px; color:#cbd5e1;">🛡️ ชุดเกราะ/หมวก/โล่:</span>
                <select id="p-sell-armor-grade" style="width:100%; background:#090d16; border:1px solid #334155; color:#fff; border-radius:4px; font-size:10px; padding:3px 4px; cursor:pointer;">
                  ${makeGradeOptsHtml(sc.armorMaxGrade ?? 1)}
                </select>
              </div>
              <div style="display:flex; flex-direction:column; gap:2px;">
                <span style="font-size:9.5px; color:#cbd5e1;">💍 เครื่องประดับ:</span>
                <select id="p-sell-acc-grade" style="width:100%; background:#090d16; border:1px solid #334155; color:#fff; border-radius:4px; font-size:10px; padding:3px 4px; cursor:pointer;">
                  ${makeGradeOptsHtml(sc.accMaxGrade ?? 0)}
                </select>
              </div>
              <div style="display:flex; flex-direction:column; gap:2px;">
                <span style="font-size:9.5px; color:#cbd5e1;">🌿 ขยะมอน / วัตถุดิบ:</span>
                <select id="p-sell-mat-mode" style="width:100%; background:#090d16; border:1px solid #334155; color:#fff; border-radius:4px; font-size:10px; padding:3px 4px; cursor:pointer;">
                  <option value="common" ${sc.materialMode === 'common' ? 'selected' : ''}>🧺 ขยะมอน+ของดี (เก็บแรร์บอส)</option>
                  <option value="all" ${sc.materialMode === 'all' ? 'selected' : ''}>🔥 ขายทั้งหมด (รวมแรร์/เว้นเควส)</option>
                  <option value="plain_only" ${sc.materialMode === 'plain_only' ? 'selected' : ''}>📦 เก็บของดี (mat_vp) & แรร์ฝากคลัง</option>
                  <option value="none" ${sc.materialMode === 'none' ? 'selected' : ''}>❌ ไม่ขายวัตถุดิบ</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Card 3: Safety Locks & Auto Repair -->
          <div style="background:rgba(15,23,42,0.78); border:1px solid rgba(168,85,247,0.38); border-radius:7px; padding:7px 8px; display:flex; flex-direction:column; gap:4px;">
            <div style="font-size:10.5px; font-weight:700; color:#e9d5ff;">🔒 ล็อกความปลอดภัย & บริการในค่าย:</div>
            <label style="display:flex; align-items:center; gap:5px; font-size:10px; color:#e2e8f0; cursor:pointer;">
              <input type="checkbox" id="p-sell-keep-best" ${sc.keepBestCopy !== false ? 'checked' : ''} style="accent-color:#a855f7;">
              <span>🏆 ล็อกของที่ดีกว่าที่ใส่อยู่ตามสายอาชีพ (Smart Lock)</span>
            </label>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px;">
              <label style="display:flex; align-items:center; gap:4px; font-size:10px; color:#e2e8f0; cursor:pointer;">
                <input type="checkbox" id="p-sell-keep-refined" ${sc.keepRefined !== false ? 'checked' : ''} style="accent-color:#a855f7;">
                <span>🔨 ล็อกของตีบวก (+1↑)</span>
              </label>
              <label style="display:flex; align-items:center; gap:4px; font-size:10px; color:#e2e8f0; cursor:pointer;">
                <input type="checkbox" id="p-sell-keep-boss" ${sc.keepBossGear !== false ? 'checked' : ''} style="accent-color:#a855f7;">
                <span>👑 ล็อกของบอส/ตำนาน</span>
              </label>
            </div>
            <label style="display:flex; align-items:center; gap:5px; font-size:10px; color:#e2e8f0; cursor:pointer;">
              <input type="checkbox" id="p-sell-keep-special" ${sc.keepSpecial !== false ? 'checked' : ''} style="accent-color:#a855f7;">
              <span>✨ ล็อกของมีออปชัน 3–4 แถว / เกรดขัด ≥ 2 / ประกายจันทร์ (✦)</span>
            </label>
            <label style="display:flex; align-items:center; gap:5px; font-size:10px; color:#fde68a; cursor:pointer; border-top:1px solid rgba(148,163,184,0.18); padding-top:4px;">
              <input type="checkbox" id="p-sell-auto-repair" ${sc.autoRepair !== false ? 'checked' : ''} style="accent-color:#f59e0b;">
              <span>🔧 แวะซ่อมอุปกรณ์ที่ป๋าหมูหริ่งอัตโนมัติ</span>
            </label>
          </div>

          <!-- Card 4: Camp Storage & Whitelist / Force-Sell -->
          <div style="background:rgba(6,78,59,0.34); border:1px solid rgba(52,211,153,0.4); border-radius:7px; padding:7px 8px; display:flex; flex-direction:column; gap:5px;">
            <div style="font-size:10.5px; font-weight:700; color:#6ee7b7;">📦 ฝากคลังค่าย & รายการยกเว้น (คั่นด้วย ,):</div>
            <label style="display:flex; align-items:center; gap:5px; font-size:10px; color:#d1fae5; cursor:pointer;">
              <input type="checkbox" id="p-sell-store-mats" ${sc.storeMats !== false ? 'checked' : ''} style="accent-color:#10b981;">
              <span>📦 ฝากวัตถุดิบที่เหลือเข้าคลังแคมป์อัตโนมัติ</span>
            </label>
            <label style="display:flex; align-items:center; gap:5px; font-size:10px; color:#d1fae5; cursor:pointer;">
              <input type="checkbox" id="p-sell-store-gear" ${sc.storeGear ? 'checked' : ''} style="accent-color:#10b981;">
              <span>🎒 ฝากอุปกรณ์สำรองที่ไม่ได้ขายเข้าคลังแคมป์</span>
            </label>
            <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; background:rgba(15,23,42,0.55); border:1px solid rgba(251,191,36,0.4); border-radius:5px; padding:4px 6px;">
              <label style="display:flex; align-items:center; gap:5px; font-size:10px; font-weight:700; color:#fde68a; cursor:pointer;" title="เมื่อกลับค่ายมา ต้มยา + ขายของ + เก็บของเข้าคลังเสร็จแล้ว จะฝากเงินส่วนเกินทั้งหมดเข้าคลังร่วมไอดี ให้เหลือเงินติดตัวตามจำนวนที่ระบุ">
                <input type="checkbox" id="p-sell-store-coins" ${sc.storeCoinsEnabled ? 'checked' : ''} style="accent-color:#f59e0b;">
                <span>🏦 ฝากเงินเข้าคลัง (เหลือติดตัว):</span>
              </label>
              <div style="display:flex; align-items:center; gap:3px;">
                <input type="number" id="p-sell-keep-coins" min="0" max="999999999" step="100" value="${sc.keepCoinsOnHand ?? 1000}" style="width:70px; box-sizing:border-box; background:#090d16; border:1px solid rgba(251,191,36,0.55); color:#fde68a; font-weight:700; border-radius:4px; font-size:10.5px; padding:2px 5px; text-align:right;">
                <span style="font-size:9.5px; color:#cbd5e1;">เหรียญ</span>
              </div>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:5px;">
              <div style="display:flex; flex-direction:column; gap:2px;">
                <span style="font-size:9px; color:#a7f3d0;">🛡️ ห้ามขาย (Whitelist):</span>
                <input type="text" id="p-sell-whitelist" placeholder="เช่น ธนูล่าสัตว์, แร่ทอง" value="${(sc.whitelist || '').replace(/"/g, '&quot;')}" style="width:100%; box-sizing:border-box; background:#090d16; border:1px solid rgba(52,211,153,0.4); color:#fff; border-radius:4px; font-size:10px; padding:3px 5px;">
              </div>
              <div style="display:flex; flex-direction:column; gap:2px;">
                <span style="font-size:9px; color:#fde68a;">💰 บังคับขาย (Force Sell):</span>
                <input type="text" id="p-sell-forcesell" placeholder="เช่น มีดสนิม, ขนหนู" value="${(sc.forceSellList || '').replace(/"/g, '&quot;')}" style="width:100%; box-sizing:border-box; background:#090d16; border:1px solid rgba(251,191,36,0.4); color:#fff; border-radius:4px; font-size:10px; padding:3px 5px;">
              </div>
            </div>
            <button type="button" id="nc-btn-sell-trip-now" style="width:100%; padding:6px 8px; border:1px solid #fbbf24; border-radius:5px; background:linear-gradient(135deg,#d97706,#b45309); color:#fff; font-size:11px; font-weight:700; cursor:pointer; margin-top:2px;">🛒 สั่งกลับค่ายไปขายของ & ฝากคลังทันที</button>
          </div>

          <!-- Card 5: Central Market Auto-Sell (ตลาดกลาง) -->
          <div style="background:rgba(30,27,75,0.48); border:1px solid rgba(129,140,248,0.45); border-radius:7px; padding:7px 8px; display:flex; flex-direction:column; gap:5px;">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
              <label style="display:flex; align-items:center; gap:5px; font-size:10.5px; font-weight:700; color:#c7d2fe; cursor:pointer;" title="เมื่อกลับค่ายจะนำไอเทมที่ตั้งไว้ในรายการ Auto-Sell ตลาดกลาง ไปวางขายบนชั้นของลุงโกโก้อัตโนมัติ พร้อมป้องกันการขายทิ้งให้ NPC">
                <input type="checkbox" id="p-cm-autosell-enabled" ${(window.__cmarketAutoSellConfig?.enabled) ? 'checked' : ''} style="accent-color:#818cf8;">
                <span>🏪 เปิด Auto-Sell ตลาดกลาง (${(window.__cmarketAutoSellConfig?.rules || []).length} รายการ)</span>
              </label>
              <select id="p-cm-price-strategy" style="background:#090d16; border:1px solid rgba(129,140,248,0.5); color:#e0e7ff; border-radius:4px; font-size:9.5px; padding:2px 4px; cursor:pointer;">
                <option value="undercut_1" ${(window.__cmarketAutoSellConfig?.priceStrategy || 'undercut_1') === 'undercut_1' ? 'selected' : ''}>ตัดราคาต่ำสุด 1g (ข้ามราคาล่อ)</option>
                <option value="lowest" ${window.__cmarketAutoSellConfig?.priceStrategy === 'lowest' ? 'selected' : ''}>เท่ากับราคาต่ำสุดในตลาด</option>
                <option value="median" ${window.__cmarketAutoSellConfig?.priceStrategy === 'median' ? 'selected' : ''}>ราคากลาง (FairTrade)</option>
                <option value="band_max" ${window.__cmarketAutoSellConfig?.priceStrategy === 'band_max' ? 'selected' : ''}>ราคาเพดานสูงสุด</option>
              </select>
            </div>
            <div id="nc-cm-autosell-status" style="font-size:9.5px; color:#a5b4fc; background:rgba(2,6,23,0.55); border-radius:4px; padding:3px 6px; line-height:1.35;">${window.__cmarketAutoSellLastLog || '🛡️ ไอเทมในรายการตลาดกลางจะถูกป้องกันไม่ให้ขายทิ้งร้าน NPC อัตโนมัติ'}</div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:5px;">
              <button type="button" id="nc-btn-cm-open-ingame" style="padding:5px 6px; border:1px solid rgba(129,140,248,0.5); border-radius:5px; background:rgba(79,70,229,0.28); color:#e0e7ff; font-size:10px; font-weight:700; cursor:pointer;">🏪 เปิดหน้าต่างตลาดกลาง</button>
              <button type="button" id="nc-btn-cm-sell-now" style="padding:5px 6px; border:1px solid #818cf8; border-radius:5px; background:linear-gradient(135deg,#4f46e5,#4338ca); color:#fff; font-size:10px; font-weight:700; cursor:pointer;">⚡ ลงขายตลาดกลางทันที</button>
            </div>
          </div>
        </div>

        <!-- TAB 4: ⚙️ ตั้งค่า (LITE GRAPHICS & AUTO-LOGIN) -->
        <div id="nc-pane-settings" style="display:none; flex-direction:column; gap:7px;">
          <!-- Section 1: Aetheria Lite Graphics & Spec Saver -->
          <div style="background:rgba(6,78,59,0.36); border:1px solid rgba(52,211,153,0.45); border-radius:7px; padding:7px 8px; display:flex; flex-direction:column; gap:5px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:11px; font-weight:700; color:#6ee7b7;">⚡ ลดกราฟิก & จุดสีประหยัดสเปค (Ultra-Spec Saver)</span>
            </div>
            <label style="display:flex; align-items:center; gap:6px; font-size:10.5px; color:#fca5a5; cursor:pointer; font-weight:600;">
              <input type="checkbox" id="p-perf-dot-monsters" ${(window.__ncPerfConfig?.dotMonsters !== false) ? 'checked' : ''} style="accent-color:#ef4444;">
              <span>🔴 แสดงมอนสเตอร์เป็น <b>"จุดแดง + ชื่อมอน"</b> (ลบตัวมอน)</span>
            </label>
            <label style="display:flex; align-items:center; gap:6px; font-size:10.5px; color:#86efac; cursor:pointer; font-weight:600;">
              <input type="checkbox" id="p-perf-dot-npcs" ${(window.__ncPerfConfig?.dotNpcs !== false) ? 'checked' : ''} style="accent-color:#22c55e;">
              <span>🟢 แสดง NPC เป็น <b>"จุดเขียว + ชื่อ NPC"</b> (ลบตัว NPC)</span>
            </label>
            <label style="display:flex; align-items:center; gap:6px; font-size:10.5px; color:#7dd3fc; cursor:pointer; font-weight:600;" title="แทนที่การวาดโมเดลกระดูก/ชุด/ทรงผมตัวละครของเราและตี้ด้วยจุดสีฟ้า ประหยัด CPU/GPU สูงสุดเวลาเปิดหลายจอ">
              <input type="checkbox" id="p-perf-dot-player" ${(window.__ncPerfConfig?.dotPlayer) ? 'checked' : ''} style="accent-color:#0ea5e9;">
              <span>🔵 แสดงตัวละครเรา & ตี้เป็น <b>"จุดฟ้า + ชื่อ"</b> (ประหยัดสูงสุด)</span>
            </label>
            <label style="display:flex; align-items:center; gap:6px; font-size:10.5px; color:#cbd5e1; cursor:pointer;">
              <input type="checkbox" id="p-perf-hide-map" ${(window.__ncPerfConfig?.hideMapBg !== false) ? 'checked' : ''} style="accent-color:#38bdf8;">
              <span>🌑 ลบฉากพื้นหลัง / ต้นไม้ / สิ่งปลูกสร้าง (เหลือแค่ตัวละคร)</span>
            </label>
            <label style="display:flex; align-items:center; gap:6px; font-size:10.5px; color:#fde68a; cursor:pointer;">
              <input type="checkbox" id="p-perf-hide-fx" ${(window.__ncPerfConfig?.hideEffects !== false) ? 'checked' : ''} style="accent-color:#f59e0b;">
              <span>✨ ลบเอฟเฟกต์สกิล / เลขดาเมจ / เงา / แสงไฟ / ตัดผมหมวก</span>
            </label>
            <label style="display:flex; align-items:center; gap:6px; font-size:10.5px; color:#c4b5fd; cursor:pointer;">
              <input type="checkbox" id="p-perf-hide-players" ${(window.__ncPerfConfig?.hideOtherPlayers !== false) ? 'checked' : ''} style="accent-color:#a855f7;">
              <span>👥 ซ่อนผู้เล่นคนอื่น & สัตว์เลี้ยงคนอื่นบนแมพ</span>
            </label>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px; border-top:1px solid rgba(52,211,153,0.2); padding-top:4px;">
              <label style="display:flex; align-items:center; gap:5px; font-size:10px; color:#a7f3d0; cursor:pointer;" title="ปิดการสังเคราะห์และเล่นเสียงเอฟเฟกต์/เพลงทั้งหมดในเกม ลดภาระ CPU Audio Thread">
                <input type="checkbox" id="p-perf-mute-audio" ${(window.__ncPerfConfig?.muteAudio !== false) ? 'checked' : ''} style="accent-color:#10b981;">
                <span>🔇 ปิดเสียงเกมทั้งหมด</span>
              </label>
              <label style="display:flex; align-items:center; gap:5px; font-size:10px; color:#a7f3d0; cursor:pointer;" title="บีบอัดและล้าง Texture เก่าใน WebGL2 อัตโนมัติ ลดการกิน VRAM จาก ~450MB เหลือ ~80MB ต่อจอ">
                <input type="checkbox" id="p-perf-trim-vram" ${(window.__ncPerfConfig?.trimVram !== false) ? 'checked' : ''} style="accent-color:#10b981;">
                <span>🧹 บีบอัด VRAM การ์ดจอ</span>
              </label>
            </div>
            <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; margin-top:1px;">
              <span style="font-size:10px; color:#a7f3d0;">⏱️ จำกัดเฟรมเรต (FPS Cap):</span>
              <select id="p-perf-fps-cap" style="background:#090d16; border:1px solid rgba(52,211,153,0.45); color:#fff; border-radius:4px; font-size:10.5px; padding:2px 6px;">
                <option value="10" ${Number(window.__ncPerfConfig?.fpsCap) === 10 ? 'selected' : ''}>10 FPS (ประหยัดสุดขีด)</option>
                <option value="15" ${Number(window.__ncPerfConfig?.fpsCap) === 15 ? 'selected' : ''}>15 FPS (ประหยัดสูงสุด)</option>
                <option value="20" ${Number(window.__ncPerfConfig?.fpsCap) === 20 ? 'selected' : ''}>20 FPS (เปิดหลายจอลื่นๆ)</option>
                <option value="30" ${(Number(window.__ncPerfConfig?.fpsCap || 30) === 30) ? 'selected' : ''}>30 FPS (แนะนำ · สมดุล)</option>
                <option value="60" ${Number(window.__ncPerfConfig?.fpsCap) === 60 ? 'selected' : ''}>60 FPS (ไม่จำกัด)</option>
              </select>
            </div>
          </div>

          <!-- Section 2: Auto-Login & Auto-Register -->
          <div style="display:flex; flex-direction:column; gap:6px; border:1px solid rgba(168,85,247,0.45); background:rgba(30,20,56,0.5); border-radius:7px; padding:8px;">
            <label style="display:flex; align-items:center; gap:6px; font-size:11px; font-weight:700; color:#e9d5ff; cursor:pointer;">
              <input type="checkbox" id="p-auth-enabled" ${cfg.enabled !== false ? 'checked' : ''} style="accent-color:#a855f7;">
              <span>🔐 เปิดระบบ Auto-Login</span>
            </label>
            <div style="display:flex; flex-direction:column; gap:2px;">
              <span style="font-size:10px; color:#cbd5e1;">เลือก Server:</span>
              <select id="p-auth-server" style="width:100%; background:#090d16; border:1px solid rgba(192,132,252,0.5); color:#fff; border-radius:4px; font-size:11px; padding:4px 6px;">
                <option value="">🌐 อัตโนมัติ (เซิร์ฟแรกที่ว่าง)</option>
                <option value="Moonlight">S1 · Moonlight</option>
                <option value="Stardust">S2 · Stardust</option>
                <option value="Nightfall">S3 · Nightfall</option>
                <option value="Sunflare">S4 · Sunflare</option>
              </select>
            </div>
            <div style="display:flex; flex-direction:column; gap:2px;">
              <span style="font-size:10px; color:#cbd5e1;">ชื่อผู้ใช้ / E-mail (ID):</span>
              <input type="text" id="p-auth-user" placeholder="Email หรือ Username" autocomplete="off" style="width:100%; box-sizing:border-box; background:#090d16; border:1px solid rgba(192,132,252,0.5); color:#fff; border-radius:4px; font-size:11px; padding:4px 6px;">
            </div>
            <div style="display:flex; flex-direction:column; gap:2px;">
              <span style="font-size:10px; color:#cbd5e1;">รหัสผ่าน (PS):</span>
              <div style="display:flex; gap:3px;">
                <input type="text" id="p-auth-pass" placeholder="รหัสผ่าน" autocomplete="off" style="flex:1; min-width:0; background:#090d16; border:1px solid rgba(192,132,252,0.5); color:#fff; border-radius:4px; font-size:11px; padding:4px 6px;">
                <button type="button" id="p-auth-toggle-pass" style="background:#0f172a; border:1px solid #64748b; color:#cbd5e1; border-radius:4px; padding:2px 6px; cursor:pointer; font-size:10px;" title="ซ่อน/แสดงรหัสผ่าน">👁</button>
              </div>
            </div>
            <div style="display:flex; flex-direction:column; gap:2px;">
              <span style="font-size:10px; color:#cbd5e1;">เลือกตัวละคร (Char):</span>
              <input type="text" id="p-auth-char" placeholder="ชื่อตัวละคร (เว้นว่าง = ตัวแรก / สุ่มชื่อออโต้)" autocomplete="off" style="width:100%; box-sizing:border-box; background:#090d16; border:1px solid rgba(192,132,252,0.5); color:#fff; border-radius:4px; font-size:11px; padding:4px 6px;">
            </div>
            <div style="font-size:9.5px; color:#93c5fd; background:rgba(15,23,42,0.65); border:1px solid rgba(56,189,248,0.28); border-radius:5px; padding:5px 7px; line-height:1.35;">
              💡 <b>ระบบสมัครอัตโนมัติ (เหมือน Aetheria):</b> หากเว้นว่างช่อง <b>ID</b> หรือ <b>รหัสผ่าน</b> ไว้ ระบบจะสุ่มสมัคร <code>@gmail.com</code> + สร้างตัวละครให้อัตโนมัติ (ถ้ามี ID/รหัส อยู่แล้วจะล็อกอินเข้าไอดีนั้นตามปกติ)
            </div>
            <label style="display:flex; align-items:center; gap:6px; font-size:10px; color:#4ade80; cursor:pointer;">
              <input type="checkbox" id="p-auth-resume" ${cfg.autoResumeBot ? 'checked' : ''} style="accent-color:#22c55e;">
              <span>เริ่มทำงานบอทต่อทันที (Auto-Resume)</span>
            </label>
            <button type="button" id="p-btn-test-login" style="width:100%; background:#9333ea; border:1px solid #a855f7; color:#fff; font-size:11px; font-weight:700; padding:6px; border-radius:5px; cursor:pointer;">🔑 บันทึก &amp; ทดสอบ Login</button>
          </div>
        </div>

        <!-- TAB 5: 🧲 TRAINER (SECRET ACCESS GATED: PULL MOB & PULL ITEM) -->
        <div id="nc-pane-trainer" style="display:none; flex-direction:column; gap:7px;">
          <div style="background:linear-gradient(135deg, rgba(136,19,55,0.45), rgba(76,29,149,0.45)); border:1px solid rgba(244,63,94,0.55); border-radius:7px; padding:6px 8px; display:flex; align-items:center; justify-content:space-between; gap:6px;">
            <span style="font-size:11px; font-weight:800; color:#fda4af;">🧲 โหมดทดสอบ Trainer (VIP Access)</span>
            <span style="font-size:9.5px; background:rgba(244,63,94,0.22); border:1px solid rgba(244,63,94,0.5); color:#fecdd3; padding:1px 6px; border-radius:999px; font-weight:700;">🔐 อนุมัติแล้ว</span>
          </div>

          <!-- Card 1: 🧲 Pull Mob ทั้งจอ -->
          <div style="background:rgba(127,29,29,0.36); border:1px solid rgba(248,113,113,0.5); border-radius:7px; padding:8px; display:flex; flex-direction:column; gap:6px;">
            <label style="display:flex; align-items:center; gap:6px; font-size:11.5px; font-weight:800; color:#fca5a5; cursor:pointer;" title="ดึงมอนสเตอร์ทั้งจอเข้ามารวมกลุ่มด้านหน้าตัวละครทันที พร้อมส่งคลื่นล่อ Aggro ให้มอนสเตอร์บนเซิร์ฟเวอร์วิ่งเข้าหาตัวละคร">
              <input type="checkbox" id="p-trainer-pull-mob" ${(window.__trainerConfig?.pullMobEnabled) ? 'checked' : ''} style="accent-color:#ef4444; width:15px; height:15px;">
              <span>🧲 Pull Mob ทั้งจอ (ดึงมอนเข้าหาตัวอัตโนมัติ)</span>
            </label>
            <div style="display:flex; align-items:center; justify-content:space-between; gap:6px;">
              <span style="font-size:10px; color:#fecaca; white-space:nowrap;">📡 รัศมีดึงมอน:</span>
              <select id="p-trainer-pull-mob-radius" style="flex:1; min-width:0; background:#090d16; border:1px solid rgba(248,113,113,0.55); color:#fff; border-radius:4px; font-size:10.5px; font-weight:700; padding:3px 6px; cursor:pointer;">
                <option value="1800" ${Number(window.__trainerConfig?.pullMobRadius || 1800) === 1800 ? 'selected' : ''}>🌐 ทั้งจอ / ทั้งแมพ (1,800 px)</option>
                <option value="950" ${Number(window.__trainerConfig?.pullMobRadius) === 950 ? 'selected' : ''}>📺 รอบหน้าจอ (950 px)</option>
                <option value="580" ${Number(window.__trainerConfig?.pullMobRadius) === 580 ? 'selected' : ''}>🎯 ระยะสกิล/ยิงไกล (580 px)</option>
              </select>
            </div>
            <label style="display:flex; align-items:center; gap:6px; font-size:10px; color:#fde68a; cursor:pointer; line-height:1.35;">
              <input type="checkbox" id="p-trainer-pull-mob-aggro" ${(window.__trainerConfig?.pullMobAggro !== false) ? 'checked' : ''} style="accent-color:#f59e0b;">
              <span>⚡ ส่งคลื่นล่อ Aggro เซิร์ฟเวอร์ (ลากมอนทั้งจอวิ่งกรูเข้าหาตัวละคร)</span>
            </label>
            <div id="nc-trainer-mob-status" style="font-size:10px; color:#cbd5e1; background:rgba(2,6,23,0.65); border:1px solid rgba(248,113,113,0.25); border-radius:5px; padding:5px 7px; line-height:1.4;">
              🎯 กำลังตรวจสอบจำนวนมอนสเตอร์ในหน้าจอ...
            </div>
            <button type="button" id="nc-btn-pull-mob-now" style="width:100%; padding:6px 8px; border:1px solid #f87171; border-radius:5px; background:linear-gradient(135deg,#e11d48,#be123c); color:#fff; font-size:11px; font-weight:800; cursor:pointer;">⚡ กดดึงมอนทั้งจอเข้ามาหาตัวทันที</button>
          </div>

          <!-- Card 2: 🧲 Pull Item ทั้งจอ -->
          <div style="background:rgba(6,78,59,0.38); border:1px solid rgba(52,211,153,0.5); border-radius:7px; padding:8px; display:flex; flex-direction:column; gap:6px;">
            <label style="display:flex; align-items:center; gap:6px; font-size:11.5px; font-weight:800; color:#6ee7b7; cursor:pointer;" title="ดูดไอเทมดรอปทุกชิ้นบนพื้นทั้งจอเข้าหาตัวละครพร้อมส่งคำสั่ง Claim & Pickup เก็บเข้ากระเป๋าทันที">
              <input type="checkbox" id="p-trainer-pull-item" ${(window.__trainerConfig?.pullItemEnabled) ? 'checked' : ''} style="accent-color:#10b981; width:15px; height:15px;">
              <span>🧲 Pull Item ทั้งจอ (ดูดของดรอปทั้งจอเข้าตัว)</span>
            </label>
            <label style="display:flex; align-items:center; gap:6px; font-size:10px; color:#a7f3d0; cursor:pointer; line-height:1.35;">
              <input type="checkbox" id="p-trainer-pull-item-rush" ${(window.__trainerConfig?.pullItemRush !== false) ? 'checked' : ''} style="accent-color:#10b981;">
              <span>⚡ ดูดเข้าตัว + พุ่งกวาดของตกไกลทั้งแมพอัตโนมัติ (Server Magnet)</span>
            </label>
            <div id="nc-trainer-item-status" style="font-size:10px; color:#cbd5e1; background:rgba(2,6,23,0.65); border:1px solid rgba(52,211,153,0.25); border-radius:5px; padding:5px 7px; line-height:1.4;">
              💎 กำลังตรวจสอบไอเทมดรอปบนพื้น...
            </div>
            <button type="button" id="nc-btn-pull-item-now" style="width:100%; padding:6px 8px; border:1px solid #34d399; border-radius:5px; background:linear-gradient(135deg,#059669,#047857); color:#fff; font-size:11px; font-weight:800; cursor:pointer;">⚡ กดดูดไอเทมดรอปทั้งจอทันที</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(hud);

    hud.querySelectorAll('input, select').forEach(inp => {
      ['keydown', 'keyup', 'keypress'].forEach(ev => {
        inp.addEventListener(ev, e => e.stopPropagation());
      });
    });

    const tabBot = hud.querySelector('#nc-tab-btn-bot');
    const tabPot = hud.querySelector('#nc-tab-btn-potions');
    const tabSell = hud.querySelector('#nc-tab-btn-sell');
    const tabSet = hud.querySelector('#nc-tab-btn-settings');
    const tabTrainer = hud.querySelector('#nc-tab-btn-trainer');
    const paneBot = hud.querySelector('#nc-pane-bot');
    const panePot = hud.querySelector('#nc-pane-potions');
    const paneSell = hud.querySelector('#nc-pane-sell');
    const paneSet = hud.querySelector('#nc-pane-settings');
    const paneTrainer = hud.querySelector('#nc-pane-trainer');
    const switchTab = (tab) => {
      if (tab === 'trainer' && !window.__trainerAccessUnlocked) tab = 'bot';
      activeHudTab = tab;
      paneBot.style.display = tab === 'bot' ? 'flex' : 'none';
      panePot.style.display = tab === 'potions' ? 'flex' : 'none';
      paneSell.style.display = tab === 'sell' ? 'flex' : 'none';
      paneSet.style.display = tab === 'settings' ? 'flex' : 'none';
      if (paneTrainer) paneTrainer.style.display = tab === 'trainer' ? 'flex' : 'none';
      tabBot.style.background = tab === 'bot' ? '#0284c7' : 'transparent';
      tabBot.style.color = tab === 'bot' ? '#fff' : '#94a3b8';
      tabPot.style.background = tab === 'potions' ? '#059669' : 'transparent';
      tabPot.style.color = tab === 'potions' ? '#fff' : '#94a3b8';
      tabSell.style.background = tab === 'sell' ? '#d97706' : 'transparent';
      tabSell.style.color = tab === 'sell' ? '#fff' : '#94a3b8';
      tabSet.style.background = tab === 'settings' ? '#7c3aed' : 'transparent';
      tabSet.style.color = tab === 'settings' ? '#fff' : '#94a3b8';
      if (tabTrainer) {
        tabTrainer.style.background = tab === 'trainer' ? '#e11d48' : 'transparent';
        tabTrainer.style.color = tab === 'trainer' ? '#fff' : '#fda4af';
      }
      if (window.NC?.game?.player) {
        if (tab === 'potions') updatePotionStockDisplay(window.NC.game.player);
        if (tab === 'sell') updateSellLiveDisplay(window.NC.game.player);
        if (tab === 'trainer') runTrainerEngineTick(false);
      }
    };
    tabBot.addEventListener('click', () => switchTab('bot'));
    tabPot.addEventListener('click', () => switchTab('potions'));
    tabSell.addEventListener('click', () => switchTab('sell'));
    tabSet.addEventListener('click', () => switchTab('settings'));
    if (tabTrainer) tabTrainer.addEventListener('click', () => switchTab('trainer'));

    const syncTrainerUi = () => {
      window.__setTrainerConfig({
        pullMobEnabled: Boolean(hud.querySelector('#p-trainer-pull-mob')?.checked),
        pullMobRadius: Number(hud.querySelector('#p-trainer-pull-mob-radius')?.value || 1800),
        pullMobAggro: Boolean(hud.querySelector('#p-trainer-pull-mob-aggro')?.checked),
        pullItemEnabled: Boolean(hud.querySelector('#p-trainer-pull-item')?.checked),
        pullItemRush: Boolean(hud.querySelector('#p-trainer-pull-item-rush')?.checked)
      });
    };
    [
      '#p-trainer-pull-mob', '#p-trainer-pull-mob-radius', '#p-trainer-pull-mob-aggro',
      '#p-trainer-pull-item', '#p-trainer-pull-item-rush'
    ].forEach(sel => {
      const el = hud.querySelector(sel);
      if (el) el.addEventListener('change', syncTrainerUi);
    });
    const pullMobNowBtn = hud.querySelector('#nc-btn-pull-mob-now');
    if (pullMobNowBtn) {
      pullMobNowBtn.addEventListener('click', () => {
        window.__triggerPullMobNow();
      });
    }
    const pullItemNowBtn = hud.querySelector('#nc-btn-pull-item-now');
    if (pullItemNowBtn) {
      pullItemNowBtn.addEventListener('click', () => {
        window.__triggerPullItemNow();
      });
    }

    const collapseBtn = hud.querySelector('#nc-hud-collapse');
    const hudBody = hud.querySelector('#nc-hud-body');
    collapseBtn.addEventListener('click', () => {
      const hide = hudBody.style.display !== 'none';
      hudBody.style.display = hide ? 'none' : 'flex';
      collapseBtn.textContent = hide ? '+' : '−';
    });

    hud.querySelector('#nc-toggle-btn').addEventListener('click', () => {
      if (window.__isBotRunning) window.stopMasterBot();
      else window.startMasterBot();
    });
    hud.querySelector('#nc-lowpower-btn').addEventListener('click', () => {
      window.setLowPowerMode(!window.__lowPowerMode);
    });
    hud.querySelector('#nc-inspect-btn').addEventListener('click', () => window.__inspectNightcampRuntime());

    const aqCb = hud.querySelector('#p-smart-autoquest-enabled');
    if (aqCb) {
      aqCb.addEventListener('change', () => {
        window.__setSmartAutoQuestEnabled(aqCb.checked);
      });
    }

    const aiCb = hud.querySelector('#p-upgrade-bot-ai-enabled');
    if (aiCb) {
      aiCb.addEventListener('change', () => {
        window.__setUpgradeBotAiEnabled(aiCb.checked);
      });
    }

    const respCb = hud.querySelector('#p-auto-respawn-enabled');
    if (respCb) {
      respCb.addEventListener('change', () => {
        window.__setAutoRespawnEnabled(respCb.checked);
      });
    }

    const sgCb = hud.querySelector('#p-smart-gear-enabled');
    if (sgCb) {
      sgCb.addEventListener('change', () => {
        window.__setSmartGearEnabled(sgCb.checked);
      });
    }
    const sgWtSel = hud.querySelector('#p-smart-gear-wtype');
    if (sgWtSel) {
      sgWtSel.addEventListener('change', () => {
        window.__setSmartGearWeaponType(sgWtSel.value || 'auto');
      });
    }

    const botRepairCb = hud.querySelector('#p-bot-auto-repair');
    const botRepairPctSel = hud.querySelector('#p-bot-repair-pct');
    const sellRepairCb = hud.querySelector('#p-sell-auto-repair');
    if (botRepairCb) {
      botRepairCb.addEventListener('change', () => {
        if (sellRepairCb) sellRepairCb.checked = Boolean(botRepairCb.checked);
        window.__setAutoRepairConfig(Boolean(botRepairCb.checked), Number(botRepairPctSel?.value ?? 25));
      });
    }
    if (botRepairPctSel) {
      botRepairPctSel.addEventListener('change', () => {
        window.__setAutoRepairConfig(Boolean(botRepairCb ? botRepairCb.checked : true), Number(botRepairPctSel.value ?? 25));
      });
    }
    const repairNowBtn = hud.querySelector('#nc-btn-repair-now');
    if (repairNowBtn) {
      repairNowBtn.addEventListener('click', () => {
        window.__triggerAutoRepairTripNow();
      });
    }

    // Wire 🛒 ซื้อ/ขาย Tab inputs
    const syncSellUi = () => {
      if (botRepairCb && sellRepairCb) botRepairCb.checked = Boolean(sellRepairCb.checked);
      window.__setSellConfig({
        enabled: Boolean(hud.querySelector('#p-auto-sell-enabled')?.checked),
        weightThreshold: Number(hud.querySelector('#p-auto-sell-weight-pct')?.value || 65),
        weaponMaxGrade: Number(hud.querySelector('#p-sell-weapon-grade')?.value ?? 1),
        armorMaxGrade: Number(hud.querySelector('#p-sell-armor-grade')?.value ?? 1),
        accMaxGrade: Number(hud.querySelector('#p-sell-acc-grade')?.value ?? 0),
        materialMode: hud.querySelector('#p-sell-mat-mode')?.value || 'common',
        keepBestCopy: Boolean(hud.querySelector('#p-sell-keep-best')?.checked),
        keepRefined: Boolean(hud.querySelector('#p-sell-keep-refined')?.checked),
        keepSpecial: Boolean(hud.querySelector('#p-sell-keep-special')?.checked),
        keepBossGear: Boolean(hud.querySelector('#p-sell-keep-boss')?.checked),
        autoRepair: Boolean(hud.querySelector('#p-sell-auto-repair')?.checked),
        repairThresholdPct: Number(hud.querySelector('#p-bot-repair-pct')?.value ?? 25),
        storeMats: Boolean(hud.querySelector('#p-sell-store-mats')?.checked),
        storeGear: Boolean(hud.querySelector('#p-sell-store-gear')?.checked),
        storeCoinsEnabled: Boolean(hud.querySelector('#p-sell-store-coins')?.checked),
        keepCoinsOnHand: Number(hud.querySelector('#p-sell-keep-coins')?.value ?? 1000),
        whitelist: (hud.querySelector('#p-sell-whitelist')?.value || '').trim(),
        forceSellList: (hud.querySelector('#p-sell-forcesell')?.value || '').trim()
      });
    };
    [
      '#p-auto-sell-enabled', '#p-auto-sell-weight-pct',
      '#p-sell-weapon-grade', '#p-sell-armor-grade', '#p-sell-acc-grade', '#p-sell-mat-mode',
      '#p-sell-keep-best', '#p-sell-keep-refined', '#p-sell-keep-special', '#p-sell-keep-boss',
      '#p-sell-auto-repair', '#p-sell-store-mats', '#p-sell-store-gear',
      '#p-sell-store-coins', '#p-sell-keep-coins',
      '#p-sell-whitelist', '#p-sell-forcesell'
    ].forEach(sel => {
      const el = hud.querySelector(sel);
      if (el) el.addEventListener('change', syncSellUi);
    });
    const sellNowBtn = hud.querySelector('#nc-btn-sell-trip-now');
    if (sellNowBtn) {
      sellNowBtn.addEventListener('click', () => {
        syncSellUi();
        window.__triggerAutoSellTripNow();
      });
    }
    const cmAutoCb = hud.querySelector('#p-cm-autosell-enabled');
    const cmStratSel = hud.querySelector('#p-cm-price-strategy');
    if (cmAutoCb) {
      cmAutoCb.addEventListener('change', () => {
        window.__setCMarketAutoSellConfig({ enabled: Boolean(cmAutoCb.checked) });
      });
    }
    if (cmStratSel) {
      cmStratSel.addEventListener('change', () => {
        window.__setCMarketAutoSellConfig({ priceStrategy: cmStratSel.value || 'undercut_1' });
      });
    }
    const cmOpenBtn = hud.querySelector('#nc-btn-cm-open-ingame');
    if (cmOpenBtn) {
      cmOpenBtn.addEventListener('click', () => {
        try { window.NC?.CMarket?.open?.(); } catch (_) {}
      });
    }
    const cmSellNowBtn = hud.querySelector('#nc-btn-cm-sell-now');
    if (cmSellNowBtn) {
      cmSellNowBtn.addEventListener('click', () => {
        window.__triggerCMarketAutoSellNow();
      });
    }

    const mapSearchInp = hud.querySelector('#p-target-farm-map-search');
    const mapSearchRes = hud.querySelector('#p-target-farm-map-results');
    const mapSel = hud.querySelector('#p-target-farm-map');
    if (mapSearchInp) {
      mapSearchInp.addEventListener('input', () => {
        const q = (mapSearchInp.value || '').trim().toLowerCase();
        renderTargetFarmMapOptions(q);
      });
    }
    if (mapSearchRes) {
      mapSearchRes.addEventListener('click', (ev) => {
        const btn = ev.target && ev.target.closest ? ev.target.closest('[data-pick-map]') : null;
        if (!btn) return;
        const pickedMap = btn.getAttribute('data-pick-map');
        if (!pickedMap) return;
        if (mapSearchInp) mapSearchInp.value = '';
        window.__setTargetFarmMap(pickedMap);
        renderTargetFarmMapOptions('');
      });
    }
    if (mapSel) {
      mapSel.addEventListener('change', () => {
        if (mapSearchInp && mapSearchInp.value) mapSearchInp.value = '';
        window.__setTargetFarmMap(mapSel.value);
        renderTargetFarmMapOptions('');
      });
    }

    // Wire Potion Tab inputs
    const syncPotUi = () => {
      window.__setPotionConfig({
        hpEnabled: Boolean(hud.querySelector('#p-pot-hp-enabled')?.checked),
        hpSize: hud.querySelector('#p-pot-hp-size')?.value || 'red',
        hpDrinkPct: Number(hud.querySelector('#p-pot-hp-drink-pct')?.value ?? 60),
        hpMin: Number(hud.querySelector('#p-pot-hp-min')?.value ?? 15),
        hpTarget: Number(hud.querySelector('#p-pot-hp-target')?.value ?? 100),
        spEnabled: Boolean(hud.querySelector('#p-pot-sp-enabled')?.checked),
        spSize: hud.querySelector('#p-pot-sp-size')?.value || 'blue',
        spDrinkPct: Number(hud.querySelector('#p-pot-sp-drink-pct')?.value ?? 40),
        spMin: Number(hud.querySelector('#p-pot-sp-min')?.value ?? 10),
        spTarget: Number(hud.querySelector('#p-pot-sp-target')?.value ?? 60),
        preferCraft: Boolean(hud.querySelector('#p-pot-prefer-craft')?.checked)
      });
    };
    [
      '#p-pot-hp-enabled', '#p-pot-hp-size', '#p-pot-hp-drink-pct', '#p-pot-hp-min', '#p-pot-hp-target',
      '#p-pot-sp-enabled', '#p-pot-sp-size', '#p-pot-sp-drink-pct', '#p-pot-sp-min', '#p-pot-sp-target',
      '#p-pot-prefer-craft'
    ].forEach(sel => {
      const el = hud.querySelector(sel);
      if (el) el.addEventListener('change', syncPotUi);
    });
    const restockNowBtn = hud.querySelector('#nc-btn-pot-restock-now');
    if (restockNowBtn) {
      restockNowBtn.addEventListener('click', () => {
        syncPotUi();
        window.__triggerPotionRestockTripNow();
      });
    }

    const planCb = hud.querySelector('#p-plan-script-enabled');
    if (planCb) {
      planCb.addEventListener('change', () => {
        window.__applyScriptPlan(window.__currentScriptPlan, planCb.checked);
      });
    }

    const syncPerfUi = () => {
      window.__setPerfConfig({
        dotMonsters: Boolean(hud.querySelector('#p-perf-dot-monsters')?.checked),
        dotNpcs: Boolean(hud.querySelector('#p-perf-dot-npcs')?.checked),
        dotPlayer: Boolean(hud.querySelector('#p-perf-dot-player')?.checked),
        hideMapBg: Boolean(hud.querySelector('#p-perf-hide-map')?.checked),
        hideEffects: Boolean(hud.querySelector('#p-perf-hide-fx')?.checked),
        hideOtherPlayers: Boolean(hud.querySelector('#p-perf-hide-players')?.checked),
        muteAudio: Boolean(hud.querySelector('#p-perf-mute-audio')?.checked),
        trimVram: Boolean(hud.querySelector('#p-perf-trim-vram')?.checked),
        fpsCap: Number(hud.querySelector('#p-perf-fps-cap')?.value || 30)
      });
    };
    [
      '#p-perf-dot-monsters', '#p-perf-dot-npcs', '#p-perf-dot-player', '#p-perf-hide-map',
      '#p-perf-hide-fx', '#p-perf-hide-players', '#p-perf-mute-audio', '#p-perf-trim-vram', '#p-perf-fps-cap'
    ].forEach(sel => {
      const el = hud.querySelector(sel);
      if (el) el.addEventListener('change', syncPerfUi);
    });

    const enCb = hud.querySelector('#p-auth-enabled');
    const srvSel = hud.querySelector('#p-auth-server');
    const userInp = hud.querySelector('#p-auth-user');
    const passInp = hud.querySelector('#p-auth-pass');
    const eyeBtn = hud.querySelector('#p-auth-toggle-pass');
    const charInp = hud.querySelector('#p-auth-char');
    const regCb = hud.querySelector('#p-auth-register');
    const resCb = hud.querySelector('#p-auth-resume');
    const genBtn = hud.querySelector('#p-btn-gen-register');
    const testBtn = hud.querySelector('#p-btn-test-login');

    enCb.addEventListener('change', () => {
      saveAuthCfg({ enabled: enCb.checked, userToggledAt: Date.now() }, false);
      if (!enCb.checked) {
        window.__ncQueueCancelledOnDisable = true;
        if (!isEnteredWorld()) {
          const csRootNow = document.querySelector('body > .cs-root:not([hidden])');
          const playBtnNow = csRootNow?.querySelector('.cs-play');
          const msgTxtNow = (csRootNow?.querySelector('.cs-msg')?.textContent || '').trim();
          if ((playBtnNow && playBtnNow.disabled) || /เซิร์ฟเวอร์เต็ม|คิวที่|กำลังเข้าเกม/i.test(msgTxtNow)) {
            try { window.NC?.OnlineLobby?.restart?.(); } catch (_) {}
          }
        }
        setAuthStatus('Auto-Login: ปิดอยู่ (เลือกหรือสร้างตัวละครเองได้เลย)', 'muted');
      } else {
        window.__ncQueueCancelledOnDisable = false;
      }
    });
    srvSel.addEventListener('change', () => saveAuthCfg({ serverName: srvSel.value || '' }, true));
    userInp.addEventListener('change', () => saveAuthCfg({ username: (userInp.value || '').trim() }, true));
    passInp.addEventListener('change', () => saveAuthCfg({ password: passInp.value || '' }, true));
    charInp.addEventListener('change', () => saveAuthCfg({ charName: (charInp.value || '').trim() }, true));
    if (regCb) regCb.addEventListener('change', () => saveAuthCfg({ register: regCb.checked }, false));
    resCb.addEventListener('change', () => saveAuthCfg({ autoResumeBot: resCb.checked }, false));
    eyeBtn.addEventListener('click', () => {
      passInp.type = passInp.type === 'password' ? 'text' : 'password';
    });
    testBtn.addEventListener('click', () => {
      const uVal = (userInp.value || '').trim();
      const pVal = passInp.value || '';
      const isBlank = !uVal || !pVal;
      saveAuthCfg({
        enabled: true,
        serverName: srvSel.value || '',
        username: uVal,
        password: pVal,
        charName: (charInp.value || '').trim(),
        register: isBlank,
        registerDone: !isBlank,
        generatedUser: isBlank,
        autoResumeBot: resCb.checked
      }, !isBlank);
      enCb.checked = true;
      window.executeAutoLogin(true).catch(() => {});
    });

    const applyUpdateBtn = hud.querySelector('#nc-btn-apply-script-update');
    if (applyUpdateBtn) {
      applyUpdateBtn.addEventListener('click', () => {
        window.__ncRequestSelfHotUpdate = true;
        applyUpdateBtn.disabled = true;
        applyUpdateBtn.textContent = '⏳ กำลังอัปเดต...';
      });
    }
    if (window.__ncPendingScriptUpdate && window.__ncPendingScriptUpdate.version && window.__ncPendingScriptUpdate.version !== window.__nightcampBotVersion) {
      window.__setPendingScriptUpdate?.(window.__ncPendingScriptUpdate);
    }

    const header = hud.querySelector('#nc-hud-header');
    let dragX = 0, dragY = 0, dragging = false;
    header.addEventListener('mousedown', e => {
      if (e.target === collapseBtn) return;
      dragging = true;
      const rect = hud.getBoundingClientRect();
      dragX = e.clientX - rect.left;
      dragY = e.clientY - rect.top;
      e.preventDefault();
    });
    window.addEventListener('mousemove', e => {
      if (!dragging) return;
      hud.style.right = 'auto';
      hud.style.left = Math.max(0, Math.min(window.innerWidth - 60, e.clientX - dragX)) + 'px';
      hud.style.top = Math.max(0, Math.min(window.innerHeight - 40, e.clientY - dragY)) + 'px';
    });
    window.addEventListener('mouseup', () => { dragging = false; });

    window.syncAllHudInputsFromConfig();
    if (window.__lowPowerMode || localStorage.getItem('pelican_zero_render') === 'true') {
      window.setLowPowerMode(true);
    } else {
      updateZeroRenderBanner();
    }
  }

  function startAutoLoginWatcher() {
    if (window.__ncAutoLoginInterval) return;
    window.__ncAutoLoginInterval = setInterval(() => {
      window.executeAutoLogin(false).catch(() => {});
    }, 1200);
    setTimeout(() => { window.executeAutoLogin(false).catch(() => {}); }, 800);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      createHud();
      startAutoLoginWatcher();
      if (window.__isBotRunning) window.startMasterBot();
    });
  } else {
    createHud();
    startAutoLoginWatcher();
    if (window.__isBotRunning) window.startMasterBot();
  }
})();
