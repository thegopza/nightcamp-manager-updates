// ==========================================================================
// NIGHTCAMP PLAN SCRIPT: AUTO CLASS SELECTION, SKILL BUILDER & STAT BUILDER
// ==========================================================================

const CLASS_TREE_MAP = {
  archer: {
    name: 'นักธนู (Archer)',
    secondClasses: [
      { id: 'ranger', name: '🏹 เรนเจอร์ (Ranger)', class3Id: 'moonsniper', class3Name: 'พรานจันทร์เงียบ (Moonsniper)' },
      { id: 'wolfhunter', name: '🐺 นักล่าหมาป่า (Wolf Hunter)', class3Id: 'packalpha', class3Name: 'จ่าฝูงจันทร์เต็มดวง (Pack Alpha)' },
      { id: 'bard', name: '🎵 นักกวี (Bard)', class3Id: 'maestro', class3Name: 'วาทยกรแห่งป่า (Maestro)' },
      { id: 'gunslinger', name: '🔫 มือปืน (Gunslinger)', class3Id: 'outlaw', class3Name: 'มือปืนเที่ยงคืน (Outlaw)' }
    ]
  },
  knight: {
    name: 'อัศวิน (Knight)',
    secondClasses: [
      { id: 'paladin', name: '🛡️ พาลาดิน (Paladin)', class3Id: 'dawnwarden', class3Name: 'ผู้พิทักษ์รุ่งสาง (Dawn Warden)' },
      { id: 'dragonknight', name: '🐉 อัศวินมังกร (Dragon Knight)', class3Id: 'dragonbound', class3Name: 'อัศวินผสานมังกร (Dragonbound)' },
      { id: 'swordmaster', name: '⚔️ นักดาบ (Swordmaster)', class3Id: 'starblade', class3Name: 'นักดาบกลุ่มดาว (Starblade)' },
      { id: 'berserker', name: '🩸 เบอร์เซิร์กเกอร์ (Berserker)', class3Id: 'bloodmoon', class3Name: 'จอมคลั่งจันทร์เลือด (Bloodmoon)' }
    ]
  },
  mage: {
    name: 'จอมเวท (Mage)',
    secondClasses: [
      { id: 'archmage', name: '🔮 อาร์คเมจ (Archmage)', class3Id: 'astral', class3Name: 'จอมเวทดาราจักร (Astral)' },
      { id: 'warlock', name: '🏮 วอร์ล็อกตะเกียง (Warlock)', class3Id: 'hexlord', class3Name: 'จ้าวคืนเดือนดับ (Hexlord)' },
      { id: 'firemage', name: '🔥 จอมเวทไฟ (Fire Mage)', class3Id: 'starcore', class3Name: 'จอมเวทดาวฤกษ์ (Starcore)' },
      { id: 'icemage', name: '❄️ จอมเวทน้ำแข็ง (Ice Mage)', class3Id: 'winterlord', class3Name: 'จ้าวเหมันต์ (Winterlord)' }
    ]
  },
  rogue: {
    name: 'โจร (Rogue)',
    secondClasses: [
      { id: 'assassin', name: '🗡️ นักฆ่า (Assassin)', class3Id: 'eclipse', class3Name: 'นักฆ่าจันทรคราส (Eclipse)' },
      { id: 'shinobi', name: '🥷 นินจา (Shinobi)', class3Id: 'shadowlord', class3Name: 'จ้าวเงาร้อยร่าง (Shadowlord)' },
      { id: 'reaper', name: '🌙 ยมทูต (Reaper)', class3Id: 'harvester', class3Name: 'ผู้เก็บเกี่ยวจันทรา (Harvester)' },
      { id: 'puppeteer', name: '🎎 นักเชิดหุ่น (Puppeteer)', class3Id: 'showmaster', class3Name: 'จ้าวโรงหุ่นราตรี (Showmaster)' }
    ]
  },
  priest: {
    name: 'พระ (Priest)',
    secondClasses: [
      { id: 'bishop', name: '✨ บิชอป (Bishop)', class3Id: 'starsaint', class3Name: 'นักบุญแสงดาว (Starsaint)' },
      { id: 'monk', name: '👊 นักพรต (Monk)', class3Id: 'meteorfist', class3Name: 'ปรมาจารย์หมัดดาวตก (Meteorfist)' },
      { id: 'lightkeeper', name: '🕯️ ผู้จุดตะเกียง (Lightkeeper)', class3Id: 'beacon', class3Name: 'ผู้เฝ้าประภาคาร (Beacon)' },
      { id: 'wisp', name: '🧚 ผู้เลี้ยงดวงไฟ (Wisp)', class3Id: 'starshepherd', class3Name: 'ผู้เลี้ยงดวงดาว (Starshepherd)' }
    ]
  }
};

const SKILLS_DATABASE = {
  "novice": [
    {
      "id": "q",
      "name": "ฟาดเต็มแรง",
      "thai": "สกิลนักเดินทาง (เปลี่ยนอาชีพแล้วหายไป)",
      "icon": "ic_q",
      "iconUrl": "https://play.nightcamp.app/cas/f9667b4b1340.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "ฟาดอาวุธเต็มแรงใส่มอนตัวเดียวข้างหน้า 100% ของ ATK ผลักกระเด็น (มีฟรี Lv.1 ตอนเป็นนักเดินทาง)"
    },
    {
      "id": "e",
      "name": "พุ่งใบไม้",
      "thai": "สกิลนักเดินทาง (เปลี่ยนอาชีพแล้วหายไป)",
      "icon": "ic_e",
      "iconUrl": "https://play.nightcamp.app/cas/69629f74feda.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "พุ่งเป็นสายลมใบไม้ อมตะชั่วครู่ ชนมอนตัวแรกที่ขวาง 100% ของ ATK (มีฟรี Lv.1 ตอนเป็นนักเดินทาง)"
    },
    {
      "id": "mastery",
      "name": "ชำนาญอาวุธ",
      "thai": "สกิลติดตัวทั่วไป (อยู่ติดตัวทุกคลาส)",
      "icon": "ic_mastery",
      "iconUrl": "https://play.nightcamp.app/cas/363c32fc05af.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "desc": "ATK +4 (เลเวลละ +4)"
    },
    {
      "id": "body",
      "name": "ร่างกายแข็งแกร่ง",
      "thai": "สกิลติดตัวทั่วไป (อยู่ติดตัวทุกคลาส)",
      "icon": "ic_body",
      "iconUrl": "https://play.nightcamp.app/cas/62e539312f6b.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "desc": "HP สูงสุด +2% · ฟื้น HP +10%"
    },
    {
      "id": "mind",
      "name": "สมาธิแน่วแน่",
      "thai": "สกิลติดตัวทั่วไป (อยู่ติดตัวทุกคลาส)",
      "icon": "ic_mind",
      "iconUrl": "https://play.nightcamp.app/cas/8249d5bd4ad7.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "desc": "SP สูงสุด +2% · ฟื้น SP +10%"
    }
  ],
  "knight": [
    {
      "id": "bash",
      "name": "ฟันสะท้านเหล็ก",
      "thai": "สายดาบ",
      "icon": "sk_bash",
      "iconUrl": "https://play.nightcamp.app/cas/0ff35733ae1e.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "weaponBonus": "อาวุธมือเดียว (ไม่ถือโล่) (แรงขึ้น 20%)",
      "desc": "ฟาดดาบครั้งใหญ่ข้างหน้า 100% ของ ATK ทำให้มึน 1.2 วิ"
    },
    {
      "id": "kn_bowling",
      "name": "หมุนฟาดกระเด็น",
      "thai": "สายดาบ",
      "icon": "sk_kn_bowling",
      "iconUrl": "https://play.nightcamp.app/cas/fbddefb0f18c.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ฟันสะท้านเหล็ก Lv.5",
      "weaponBonus": "ดาบใหญ่ (โดน 2 ครั้ง)",
      "prereq": [
        {
          "skill": "bash",
          "level": 5
        }
      ],
      "desc": "ฟันหมุนรอบตัว 2 รอบ รอบละ 100% ของ ATK รอบหลังผลักศัตรูกระเด็น"
    },
    {
      "id": "kn_swordmastery",
      "name": "ชำนาญดาบ",
      "thai": "สายดาบ",
      "icon": "sk_kn_swordmastery",
      "iconUrl": "https://play.nightcamp.app/cas/4c99ad85f49c.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "weaponReq": "ดาบ ดาบใหญ่ ดาบคู่ ขวาน ขวานยักษ์ หรือกระบอง",
      "desc": "ถือดาบ ดาบใหญ่ ดาบคู่ ขวาน ขวานยักษ์ หรือกระบอง: ATK +2% ความแม่น +1"
    },
    {
      "id": "kn_quicken",
      "name": "เร่งเพลงดาบ",
      "thai": "สายคลั่งศึก",
      "icon": "sk_kn_quicken",
      "iconUrl": "https://play.nightcamp.app/cas/ccbb9e65e006.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "buff",
      "req": "ชำนาญดาบ Lv.3",
      "weaponReq": "ดาบมือเดียว หรือ ดาบใหญ่ หรือ ดาบคู่ หรือ ขวานยักษ์",
      "prereq": [
        {
          "skill": "kn_swordmastery",
          "level": 3
        }
      ],
      "desc": "33 วิ ถือดาบ ดาบใหญ่ ดาบคู่ หรือขวานยักษ์: ความเร็วโจมตี +2% คริติคอล +0.5% · Lv10 ตีคริแล้วเร็วขึ้นอีกชั่วครู่"
    },
    {
      "id": "kn_cleave",
      "name": "ฟันกวาด",
      "thai": "สายคลั่งศึก",
      "icon": "sk_kn_cleave",
      "iconUrl": "https://play.nightcamp.app/cas/a68456268555.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "เร่งเพลงดาบ Lv.1",
      "weaponBonus": "ดาบใหญ่ (กวาดแรงขึ้น 30%)",
      "prereq": [
        {
          "skill": "kn_quicken",
          "level": 1
        }
      ],
      "desc": "ตีปกติระยะประชิด โดนศัตรูรอบเป้าด้วย 2% ของดาเมจ · Lv5 กวาดกว้างขึ้น · Lv10 ตีครั้งที่ 5 ปล่อยคลื่นดาบ"
    },
    {
      "id": "kn_aurablade",
      "name": "ดาบเรืองพลัง",
      "thai": "สายคลั่งศึก",
      "icon": "sk_kn_aurablade",
      "iconUrl": "https://play.nightcamp.app/cas/dc7f4ec1692e.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "buff",
      "req": "ชำนาญดาบ Lv.5",
      "prereq": [
        {
          "skill": "kn_swordmastery",
          "level": 5
        }
      ],
      "desc": "48 วิ: ตีปกติทุกครั้งแรงขึ้น 6 + Base Lv ÷ 4 แบบไม่สน DEF · Lv5 ฟันกวาดและคลื่นดาบแรงขึ้น 20% ระหว่างออร่า"
    },
    {
      "id": "kn_berserk",
      "name": "บ้าคลั่ง",
      "thai": "สายคลั่งศึก",
      "icon": "sk_kn_berserk",
      "iconUrl": "https://play.nightcamp.app/cas/a33f84c60ab6.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "buff",
      "ult": true,
      "req": "เร่งเพลงดาบ Lv.5, ฟันกวาด Lv.3",
      "prereq": [
        {
          "skill": "kn_quicken",
          "level": 5
        },
        {
          "skill": "kn_cleave",
          "level": 3
        }
      ],
      "desc": "คลั่ง 17 วิ: ความเร็วโจมตี +20% ATK +12% ดูดเลือด 0.6% ของดาเมจที่ตี · ระหว่างคลั่งใช้ได้แค่ตีปกติกับบัฟ HP ลดวิละ 1.5% หมดแล้วเหนื่อย 5 วิ · Lv5 การตีครั้งที่ 3 ทุกครั้งปล่อยคลื่นดาบเล็ก"
    },
    {
      "id": "guard",
      "name": "โล่แสงศักดิ์สิทธิ์",
      "thai": "สายผู้พิทักษ์",
      "icon": "sk_guard",
      "iconUrl": "https://play.nightcamp.app/cas/a03cf20dacbb.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "buff",
      "weaponReq": "โล่",
      "desc": "โดมแสงคุ้มกัน 5.3 วิ รับดาเมจลดลง 33%"
    },
    {
      "id": "kn_ironskin",
      "name": "ผิวเหล็ก",
      "thai": "สายผู้พิทักษ์",
      "icon": "sk_kn_ironskin",
      "iconUrl": "https://play.nightcamp.app/cas/d2450dc8d2d1.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "desc": "DEF +1 · HP สูงสุด +1% · ฟื้น HP +8%"
    },
    {
      "id": "kn_provoke",
      "name": "ตะโกนท้าทาย",
      "thai": "สายผู้พิทักษ์",
      "icon": "sk_kn_provoke",
      "iconUrl": "https://play.nightcamp.app/cas/98343938228e.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "desc": "ตะโกนท้าศัตรูรอบตัว ให้หันมาสู้กับเรา และรับดาเมจเพิ่ม 13% นาน 10 วิ"
    },
    {
      "id": "judgment",
      "name": "ดาบแสงพิพากษา",
      "thai": "สายผู้พิทักษ์",
      "icon": "sk_judgment",
      "iconUrl": "https://play.nightcamp.app/cas/940b6851b3ac.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "ult": true,
      "req": "โล่แสงศักดิ์สิทธิ์ Lv.5, ผิวเหล็ก Lv.3",
      "prereq": [
        {
          "skill": "guard",
          "level": 5
        },
        {
          "skill": "kn_ironskin",
          "level": 3
        }
      ],
      "desc": "ดาบแสงยักษ์ปักลงจากฟ้า 100% ของ ATK รอบจุดตก"
    },
    {
      "id": "magnum",
      "name": "ระเบิดเพลิงรอบกาย",
      "thai": "สายเพลิงหอก",
      "icon": "sk_magnum",
      "iconUrl": "https://play.nightcamp.app/cas/540dbc961e64.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "เปลวไฟระเบิดรอบตัว 100% ของ ATK ผลักศัตรู · อาวุธติดไฟ 4 วิ (ตีเป็นธาตุไฟ)"
    },
    {
      "id": "kn_pierce",
      "name": "แทงสามจังหวะ",
      "thai": "สายเพลิงหอก",
      "icon": "sk_kn_pierce",
      "iconUrl": "https://play.nightcamp.app/cas/b0f93a4a1024.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ระเบิดเพลิงรอบกาย Lv.3",
      "weaponReq": "หอก หรือ หอกยาว",
      "prereq": [
        {
          "skill": "magnum",
          "level": 3
        }
      ],
      "desc": "แทงไปข้างหน้า 3 ครั้งเป็นแนวยาว ครั้งละ 100% ของ ATK โดนทุกตัวในแนว"
    }
  ],
  "mage": [
    {
      "id": "fireball",
      "name": "ลูกไฟ",
      "thai": "สายไฟ",
      "icon": "sk_fireball",
      "iconUrl": "https://play.nightcamp.app/cas/a8c712c01659.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "weaponBonus": "คทา (MATK +8% ร่ายเร็วขึ้น 10%)",
      "desc": "ยิงลูกไฟระเบิดเป็นวง 100% ของ MATK"
    },
    {
      "id": "mg_firewall",
      "name": "กำแพงไฟ",
      "thai": "สายไฟ",
      "icon": "sk_mg_firewall",
      "iconUrl": "https://play.nightcamp.app/cas/d7df693d12cd.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "ลูกไฟ Lv.4",
      "weaponBonus": "คทา (ร่ายเร็วขึ้น 10%)",
      "prereq": [
        {
          "skill": "fireball",
          "level": 4
        }
      ],
      "desc": "กำแพงไฟยาวขวางหน้า 5 วิ ศัตรูที่แตะโดน 100% ของ MATK ทุก 0.3 วิ และถูกผลักกลับ"
    },
    {
      "id": "mg_fireheart",
      "name": "ใจเพลิง",
      "thai": "สายไฟ",
      "icon": "sk_mg_fireheart",
      "iconUrl": "https://play.nightcamp.app/cas/7e6deeb02023.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "desc": "ดาเมจไฟ +2% · โอกาสติดเผา +3% · Lv5 เผาซ้อน 2 ชั้น"
    },
    {
      "id": "frostdiver",
      "name": "หอกน้ำแข็ง",
      "thai": "สายน้ำแข็ง",
      "icon": "sk_frostdiver",
      "iconUrl": "https://play.nightcamp.app/cas/7cb53171dd56.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "weaponBonus": "คทา (MATK +8% ร่ายเร็วขึ้น 10%)",
      "desc": "แนวหนามน้ำแข็งพุ่งไปข้างหน้า 100% ของ MATK แช่แข็ง 1.6 วิ"
    },
    {
      "id": "mg_frostnova",
      "name": "วงน้ำแข็ง",
      "thai": "สายน้ำแข็ง",
      "icon": "sk_mg_frostnova",
      "iconUrl": "https://play.nightcamp.app/cas/3d9801c199ac.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "หอกน้ำแข็ง Lv.4",
      "weaponBonus": "คทา (ร่ายเร็วขึ้น 10%)",
      "prereq": [
        {
          "skill": "frostdiver",
          "level": 4
        }
      ],
      "desc": "ระเบิดน้ำแข็งรอบตัว 100% ของ MATK แช่แข็งทุกตัว 1.3 วิ"
    },
    {
      "id": "mg_iceheart",
      "name": "ใจน้ำแข็ง",
      "thai": "สายน้ำแข็ง",
      "icon": "sk_mg_iceheart",
      "iconUrl": "https://play.nightcamp.app/cas/247cd394fe8e.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "desc": "ดาเมจน้ำ +3% · Lv5 ศัตรูเย็นเฉียบซ้อน 3 ชั้นแล้วแข็ง · Lv10 ตัวที่แข็งรับดาเมจเพิ่ม 20%"
    },
    {
      "id": "thunder",
      "name": "สายฟ้าฟาด",
      "thai": "สายฟ้า",
      "icon": "sk_thunder",
      "iconUrl": "https://play.nightcamp.app/cas/126997a76614.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "weaponBonus": "คทา (MATK +8% ร่ายเร็วขึ้น 10%)",
      "desc": "สายฟ้าผ่าศัตรู 3 ตัว ตัวละ 100% ของ MATK"
    },
    {
      "id": "mg_stormheart",
      "name": "ใจสายฟ้า",
      "thai": "สายฟ้า",
      "icon": "sk_mg_stormheart",
      "iconUrl": "https://play.nightcamp.app/cas/ea8ca2d9d657.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "desc": "ดาเมจลม/สายฟ้า +3% · โอกาสช็อต +2% · Lv5 ช็อตแล้วรับดาเมจสายฟ้าเพิ่ม"
    },
    {
      "id": "meteor",
      "name": "มหาเวทธาตุ",
      "thai": "สกิลกดใช้",
      "icon": "sk_meteor",
      "iconUrl": "https://play.nightcamp.app/cas/b518dfac413d.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "ult": true,
      "req": "ใจเพลิง Lv.5 หรือ ใจน้ำแข็ง Lv.5 หรือ ใจสายฟ้า Lv.5",
      "reqAny": true,
      "weaponBonus": "คทา (ร่ายเร็วขึ้น 15%)",
      "prereq": [
        {
          "skill": "mg_fireheart",
          "level": 5
        },
        {
          "skill": "mg_iceheart",
          "level": 5
        },
        {
          "skill": "mg_stormheart",
          "level": 5
        }
      ],
      "desc": "อุกกาบาต 6 ลูกถล่มพื้นที่ ลูกละ 100% ของ MATK ธาตุไฟ · ใจธาตุที่เลเวลสูงสุดกำหนดสีวงเวท"
    },
    {
      "id": "mg_staffmastery",
      "name": "ชำนาญคทา",
      "thai": "สายเวทเร็ว",
      "icon": "sk_mg_staffmastery",
      "iconUrl": "https://play.nightcamp.app/cas/2a35de5a8ee9.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "desc": "ถือคทาหรือออร์บ: ตีปกติเป็นดาเมจเวทจาก MATK แรงขึ้น 4% ความเร็วโจมตี +1% · นำ ATK 2% มารวมเป็น MATK · Lv5 ลูกแก้วทะลุ 1 ตัว · Lv10 ตีปกติยิงลูกที่สอง (40%)"
    },
    {
      "id": "mg_autospell",
      "name": "ร่ายอัตโนมัติ",
      "thai": "สายเวทเร็ว",
      "icon": "sk_mg_autospell",
      "iconUrl": "https://play.nightcamp.app/cas/be807c5eb5ca.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ชำนาญคทา Lv.3",
      "weaponBonus": "ออร์บ (โอกาสร่าย ×1.5)",
      "prereq": [
        {
          "skill": "mg_staffmastery",
          "level": 3
        }
      ],
      "desc": "ตีปกติโอกาส 1.5% ร่ายลูกไฟ / หอกน้ำแข็ง / สายฟ้าฟาดเอง ตามใจธาตุที่เลเวลสูงสุด (เลเวลเวทไม่เกิน 1) ไม่ต้องร่าย เสีย SP ครึ่งหนึ่งของเวทที่ออก (ได้ทุก 0.8 วิ) · เปิดลูกแก้วธาตุ: วนธาตุตามลูกแก้ว · Lv5 SP เกิน 80% โอกาสเพิ่ม 30% · Lv10 บางครั้งร่าย 2 ธาตุพร้อมกัน (30%)"
    },
    {
      "id": "mg_memorize",
      "name": "จดจำเวท",
      "thai": "สายเวทเร็ว",
      "icon": "sk_mg_memorize",
      "iconUrl": "https://play.nightcamp.app/cas/170cda175707.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "buff",
      "req": "ฟื้นฟูมานา Lv.3",
      "prereq": [
        {
          "skill": "mg_sprecovery",
          "level": 3
        }
      ],
      "desc": "30 วิ: เวลาร่ายลดลง 10% · Lv5 ครั้งแรกหลังเปิดบัฟร่ายทันที"
    },
    {
      "id": "mg_sprecovery",
      "name": "ฟื้นฟูมานา",
      "thai": "สายเวทเร็ว",
      "icon": "sk_mg_sprecovery",
      "iconUrl": "https://play.nightcamp.app/cas/fa0ee93a2865.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "desc": "ฟื้น SP +8% · SP สูงสุด +1% · Lv10 ร่ายอัตโนมัติคืน SP นิดหน่อย"
    }
  ],
  "archer": [
    {
      "id": "ar_bowmastery",
      "name": "ชำนาญธนู",
      "thai": "สายยิงรัว",
      "icon": "sk_ar_bowmastery",
      "iconUrl": "https://play.nightcamp.app/cas/52863416a6b9.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "weaponReq": "ธนู",
      "desc": "ถือธนู: ATK +1.5% คริติคอล +0.5% · Lv10 ยิงปกติทุกดอกที่ 5 ยิงคู่ แรงขึ้น 50%"
    },
    {
      "id": "ar_concentrate",
      "name": "สมาธิเล็ง",
      "thai": "สายยิงรัว",
      "icon": "sk_ar_concentrate",
      "iconUrl": "https://play.nightcamp.app/cas/387c67c14cca.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "buff",
      "req": "ตาเหยี่ยว Lv.3",
      "prereq": [
        {
          "skill": "ar_owl",
          "level": 3
        }
      ],
      "desc": "36 วิ: DEX และ AGI +2 ความแม่น +6"
    },
    {
      "id": "ar_doubleshot",
      "name": "ยิงเบิ้ล",
      "thai": "สายยิงรัว",
      "icon": "sk_ar_doubleshot",
      "iconUrl": "https://play.nightcamp.app/cas/63ca9412ce70.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ชำนาญธนู Lv.1",
      "weaponReq": "ธนู",
      "prereq": [
        {
          "skill": "ar_bowmastery",
          "level": 1
        }
      ],
      "desc": "ถือธนู: ยิงปกติโอกาส 2% ปล่อยลูกที่สองตามไปทันที · Lv5 ลูกเบิ้ลแรงขึ้น 10% · Lv10 บางครั้งออกสามลูก"
    },
    {
      "id": "double",
      "name": "ยิงคู่",
      "thai": "สายแม่นยำ",
      "icon": "sk_double",
      "iconUrl": "https://play.nightcamp.app/cas/d765e1788c1f.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "weaponReq": "ธนู",
      "desc": "ยิงลูกธนูแสง 2 ดอกติดกัน ดอกละ 100% ของ ATK"
    },
    {
      "id": "ar_owl",
      "name": "ตาเหยี่ยว",
      "thai": "สายแม่นยำ",
      "icon": "sk_ar_owl",
      "iconUrl": "https://play.nightcamp.app/cas/9f903348985d.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "desc": "DEX +1 · ความแม่น +1"
    },
    {
      "id": "ar_charge",
      "name": "ธนูกระแทก",
      "thai": "สายแม่นยำ",
      "icon": "sk_ar_charge",
      "iconUrl": "https://play.nightcamp.app/cas/babbb2e86a0c.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "ยิงคู่ Lv.3",
      "weaponReq": "ธนู",
      "prereq": [
        {
          "skill": "double",
          "level": 3
        }
      ],
      "desc": "ลูกธนูหนักกระแทก 100% ของ ATK ศัตรูกระเด็นไกลและมึน 1 วิ"
    },
    {
      "id": "starshot",
      "name": "ธนูดาราพิฆาต",
      "thai": "สายแม่นยำ",
      "icon": "sk_starshot",
      "iconUrl": "https://play.nightcamp.app/cas/d10321ccd028.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "ult": true,
      "req": "ยิงคู่ Lv.5 หรือ ห่าฝนธนู Lv.5",
      "reqAny": true,
      "weaponReq": "ธนู",
      "prereq": [
        {
          "skill": "double",
          "level": 5
        },
        {
          "skill": "shower",
          "level": 5
        }
      ],
      "desc": "ชาร์จแล้วยิงลำแสงดาราทะลวงทั้งแนว 100% ของ ATK"
    },
    {
      "id": "shower",
      "name": "ห่าฝนธนู",
      "thai": "สายห่าศร",
      "icon": "sk_shower",
      "iconUrl": "https://play.nightcamp.app/cas/8f142e734e36.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "weaponReq": "ธนู",
      "desc": "ธนู 20 ดอกตกใส่พื้นที่ข้างหน้า ดอกละ 60% ของ ATK"
    },
    {
      "id": "ar_multishot",
      "name": "ยิงกระจาย",
      "thai": "สายห่าศร",
      "icon": "sk_ar_multishot",
      "iconUrl": "https://play.nightcamp.app/cas/f97f4a399768.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ห่าฝนธนู Lv.3",
      "weaponReq": "ธนู",
      "prereq": [
        {
          "skill": "shower",
          "level": 3
        }
      ],
      "desc": "ยิงธนู 5 ดอกกระจายเป็นพัด ดอกละ 100% ของ ATK · 5 ดอกทุกเลเวล · ดอกแรงขึ้นตามเลเวล"
    },
    {
      "id": "gale",
      "name": "ธนูพายุทะลวง",
      "thai": "สายพรานพฤกษา",
      "icon": "sk_gale",
      "iconUrl": "https://play.nightcamp.app/cas/48666fd20883.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "weaponReq": "ธนู",
      "desc": "ลูกธนูพันพายุทะลุทุกตัวในแนว 100% ของ ATK ผลักกระเด็น"
    },
    {
      "id": "ar_snare",
      "name": "กับดักเถาวัลย์",
      "thai": "สายพรานพฤกษา",
      "icon": "sk_ar_snare",
      "iconUrl": "https://play.nightcamp.app/cas/3c5faf13d7a7.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "ธนูพายุทะลวง Lv.3",
      "prereq": [
        {
          "skill": "gale",
          "level": 3
        }
      ],
      "desc": "วางกับดักที่เมาส์ (วางได้หลายอัน) ศัตรูที่เหยียบโดนเถาวัลย์รัด 2.8 วิ และ 100% ของ ATK"
    }
  ],
  "rogue": [
    {
      "id": "ro_double",
      "name": "โจมตีสองครั้ง",
      "thai": "สายคมมีด",
      "icon": "sk_ro_double",
      "iconUrl": "https://play.nightcamp.app/cas/3b9f3c436806.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "weaponReq": "มีดคู่",
      "desc": "ถือมีดคู่: ตีปกติมีโอกาส 4% โดน 2 เท่า"
    },
    {
      "id": "ro_dagger",
      "name": "ชำนาญมีด",
      "thai": "สายคมมีด",
      "icon": "sk_ro_dagger",
      "iconUrl": "https://play.nightcamp.app/cas/2230777d4295.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "weaponReq": "มีดคู่",
      "desc": "ถือมีดคู่: หลบหลีก +1 ATK +1% ความเร็วโจมตี +1% · Lv10 ความเร็วโจมตีเพิ่มอีก 10%"
    },
    {
      "id": "ro_vital",
      "name": "จุดตาย",
      "thai": "สายคมมีด",
      "icon": "sk_ro_vital",
      "iconUrl": "https://play.nightcamp.app/cas/90a585a53db2.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ชำนาญมีด Lv.3",
      "weaponReq": "มีดคู่",
      "prereq": [
        {
          "skill": "ro_dagger",
          "level": 3
        }
      ],
      "desc": "ถือมีดคู่: คริติคอล +1% · Lv5 คริแล้วแรงขึ้น 20% · Lv10 คริติคอลฟันสองครั้ง"
    },
    {
      "id": "sonic",
      "name": "พายุคมเงา",
      "thai": "สายคมมีด",
      "icon": "sk_sonic",
      "iconUrl": "https://play.nightcamp.app/cas/13707b65dc50.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "ult": true,
      "req": "โจมตีสองครั้ง Lv.5 หรือ แทงข้างหลัง Lv.5",
      "reqAny": true,
      "prereq": [
        {
          "skill": "ro_double",
          "level": 5
        },
        {
          "skill": "ro_backstab",
          "level": 5
        }
      ],
      "desc": "วาร์ปฟันรัว 8 ครั้ง ครั้งละ 100% ของ ATK ปิดท้ายฟันกากบาท x2.5"
    },
    {
      "id": "envenom",
      "name": "ฟันพิษ",
      "thai": "สายพิษ",
      "icon": "sk_envenom",
      "iconUrl": "https://play.nightcamp.app/cas/0725a89d5d42.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "ฟันไขว้ 2 ครั้ง ครั้งละ 100% ของ ATK ติดพิษ 3 วิ"
    },
    {
      "id": "venomdust",
      "name": "ม่านควันพิษ",
      "thai": "สายพิษ",
      "icon": "sk_venomdust",
      "iconUrl": "https://play.nightcamp.app/cas/ddad6015af0b.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ฟันพิษ Lv.3",
      "prereq": [
        {
          "skill": "envenom",
          "level": 3
        }
      ],
      "desc": "ปาขวดพิษเป็นกลุ่มควัน 5 วิ ทุก 0.5 วิ 100% ของ ATK และติดพิษ"
    },
    {
      "id": "ro_venomheart",
      "name": "ใจพิษ",
      "thai": "สายพิษ",
      "icon": "sk_ro_venomheart",
      "iconUrl": "https://play.nightcamp.app/cas/438a51cf0871.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "desc": "พิษจากตีปกติแรงขึ้น 5% · ดาเมจพิษ +2% · ตีปกติโอกาสติดพิษ 2% · Lv10 ศัตรูที่ติดพิษตีเราเบาลง"
    },
    {
      "id": "shadowstep",
      "name": "ก้าวเงา",
      "thai": "สายเงา",
      "icon": "sk_shadowstep",
      "iconUrl": "https://play.nightcamp.app/cas/bba74b881544.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "หายตัวไปโผล่ข้างหลังศัตรู 100% ของ ATK · ตีปกติครั้งถัดไปคริติคอลแน่นอน"
    },
    {
      "id": "ro_hide",
      "name": "ซ่อนตัว",
      "thai": "สายเงา",
      "icon": "sk_ro_hide",
      "iconUrl": "https://play.nightcamp.app/cas/4356e065ff8a.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "buff",
      "req": "ก้าวเงา Lv.3",
      "prereq": [
        {
          "skill": "shadowstep",
          "level": 3
        }
      ],
      "desc": "หายตัวในเงา 3.4 วิ มอนมองไม่เห็น (เดินช้าลง) · ออกจากที่ซ่อนเมื่อโจมตี ตีครั้งแรกคริติคอลแน่นอน"
    },
    {
      "id": "ro_backstab",
      "name": "แทงข้างหลัง",
      "thai": "สายเงา",
      "icon": "sk_ro_backstab",
      "iconUrl": "https://play.nightcamp.app/cas/cd1552e9548f.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ซ่อนตัว Lv.2",
      "weaponBonus": "มีดคู่ (แรงขึ้น 20%)",
      "prereq": [
        {
          "skill": "ro_hide",
          "level": 2
        }
      ],
      "desc": "วาร์ปไปข้างหลังศัตรูแล้วแทง 100% ของ ATK · ใช้ตอนซ่อนตัว: คริติคอลแน่นอน"
    },
    {
      "id": "ro_steal",
      "name": "ขโมยของ",
      "thai": "สกิลกดใช้",
      "icon": "sk_ro_steal",
      "iconUrl": "https://play.nightcamp.app/cas/be2255e522fc.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "desc": "ฟันเบา ๆ 100% ของ ATK และมีโอกาส 14% ขโมยวัตถุดิบประจำตัวมอนตัวนั้น"
    }
  ],
  "priest": [
    {
      "id": "pr_heal",
      "name": "แสงเยียวยา",
      "thai": "สายฟื้นฟู",
      "icon": "sk_heal",
      "iconUrl": "https://play.nightcamp.app/cas/6f7f1c5b1006.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "ฟื้น HP ตัวเองและเพื่อนในปาร์ตี้รอบตัว 9% ของ HP สูงสุด + ตามพลังเวท · มอนอมตะ/ความมืดรอบตัวโดนแสง 100% ของ MATK"
    },
    {
      "id": "pr_resurrect",
      "name": "ชุบชีวิต",
      "thai": "สายฟื้นฟู",
      "icon": "sk_pr_resurrect",
      "iconUrl": "https://play.nightcamp.app/cas/cd0f2f6a4693.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "แสงเยียวยา Lv.5",
      "prereq": [
        {
          "skill": "pr_heal",
          "level": 5
        }
      ],
      "desc": "ชุบชีวิตเพื่อนในปาร์ตี้ที่หมดแรงรอบตัว ให้ลุกขึ้นพร้อม HP 28% · ชุบแล้วได้บัฟอมตะ 1.5 วิ"
    },
    {
      "id": "pr_protect",
      "name": "พรคุ้มครอง",
      "thai": "สายฟื้นฟู",
      "icon": "sk_pr_protect",
      "iconUrl": "https://play.nightcamp.app/cas/aee682080606.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "desc": "MDEF +1 · DEF +0 · รับดาเมจลดลง 0.8%"
    },
    {
      "id": "blessing",
      "name": "พรศักดิ์สิทธิ์",
      "thai": "สายบัฟทีม",
      "icon": "sk_blessing",
      "iconUrl": "https://play.nightcamp.app/cas/47b8f0b2202f.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "buff",
      "desc": "ตัวเองและเพื่อนรอบตัว 66 วิ: STR INT DEX +1 (ได้ทั้ง ATK MATK ความแม่น และร่ายเร็วขึ้น)"
    },
    {
      "id": "pr_agi",
      "name": "เพิ่มความเร็ว",
      "thai": "สายบัฟทีม",
      "icon": "sk_pr_agi",
      "iconUrl": "https://play.nightcamp.app/cas/673b1d24f4dd.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "buff",
      "req": "แสงเยียวยา Lv.3",
      "prereq": [
        {
          "skill": "pr_heal",
          "level": 3
        }
      ],
      "desc": "ตัวเองและเพื่อนรอบตัว 66 วิ: AGI +1 (โจมตีเร็วขึ้น) เดินเร็วขึ้น 10% · Lv10 ทั้งทีมเดินเร็วขึ้นอีก 10%"
    },
    {
      "id": "pr_angelus",
      "name": "พรเกราะกาย",
      "thai": "สายบัฟทีม",
      "icon": "sk_pr_angelus",
      "iconUrl": "https://play.nightcamp.app/cas/cd099f023ba7.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "buff",
      "req": "พรคุ้มครอง Lv.3",
      "prereq": [
        {
          "skill": "pr_protect",
          "level": 3
        }
      ],
      "desc": "ตัวเองและเพื่อนรอบตัว 36 วิ: VIT +1 DEF +3 (ผู้ร่ายสายนักพรต: เพื่อนได้รับดาเมจลดลง 6% แทน)"
    },
    {
      "id": "pr_gloria",
      "name": "บทสรรเสริญโชค",
      "thai": "สายบัฟทีม",
      "icon": "sk_pr_gloria",
      "iconUrl": "https://play.nightcamp.app/cas/2ee7d4ef0e28.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "buff",
      "req": "พรศักดิ์สิทธิ์ Lv.3",
      "prereq": [
        {
          "skill": "blessing",
          "level": 3
        }
      ],
      "desc": "ตัวเองและเพื่อนรอบตัว 36 วิ: LUK +5 (คริติคอลและหลบสมบูรณ์เพิ่ม) · Lv5 ทั้งทีมคริแรงขึ้น 10%"
    },
    {
      "id": "pr_suffragium",
      "name": "พรเร่งร่าย",
      "thai": "สายบัฟทีม",
      "icon": "sk_pr_suffragium",
      "iconUrl": "https://play.nightcamp.app/cas/fb4ac848d835.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "buff",
      "req": "พรศักดิ์สิทธิ์ Lv.5",
      "prereq": [
        {
          "skill": "blessing",
          "level": 5
        }
      ],
      "desc": "ตัวเองและเพื่อนรอบตัว 30 วิ: เวลาร่ายลดลง 6% · Lv5 ร่ายครั้งแรกหลังได้บัฟเร็วขึ้นอีก 30%"
    },
    {
      "id": "holylight",
      "name": "แสงศักดิ์สิทธิ์",
      "thai": "สายแสง",
      "icon": "sk_holylight",
      "iconUrl": "https://play.nightcamp.app/cas/cc8177ded1bf.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "weaponBonus": "คทา (MATK +8%)",
      "desc": "ลำแสงจากฟ้าฟาดลงศัตรูใกล้เมาส์ 100% ของ MATK ธาตุแสง"
    },
    {
      "id": "pr_demonbane",
      "name": "ปราบมาร",
      "thai": "สายแสง",
      "icon": "sk_pr_demonbane",
      "iconUrl": "https://play.nightcamp.app/cas/abb2930e2d80.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "desc": "ดาเมจต่อมอนอมตะและความมืด +4%"
    },
    {
      "id": "magnus",
      "name": "วงเวทแสงขับมาร",
      "thai": "สายแสง",
      "icon": "sk_magnus",
      "iconUrl": "https://play.nightcamp.app/cas/090206b448ab.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "ult": true,
      "req": "แสงศักดิ์สิทธิ์ Lv.5, ปราบมาร Lv.3",
      "weaponBonus": "คทา (ร่ายเร็วขึ้น 10%)",
      "prereq": [
        {
          "skill": "holylight",
          "level": 5
        },
        {
          "skill": "pr_demonbane",
          "level": 3
        }
      ],
      "desc": "วงเวทศักดิ์สิทธิ์ขนาดใหญ่ เสาแสงผุด 8 ระลอก ระลอกละ 100% ของ MATK ธาตุแสง"
    },
    {
      "id": "pr_aspersio",
      "name": "อาวุธแสงชำระ",
      "thai": "สายพระนักสู้",
      "icon": "sk_pr_aspersio",
      "iconUrl": "https://play.nightcamp.app/cas/17cc58f611b6.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "buff",
      "req": "แสงศักดิ์สิทธิ์ Lv.3",
      "prereq": [
        {
          "skill": "holylight",
          "level": 3
        }
      ],
      "desc": "36 วิ: อาวุธเป็นธาตุแสง (แรงกับอมตะและความมืด) ATK +1%"
    },
    {
      "id": "pr_macemastery",
      "name": "ชำนาญกระบอง",
      "thai": "สายพระนักสู้",
      "icon": "sk_pr_macemastery",
      "iconUrl": "https://play.nightcamp.app/cas/fde9cb95a516.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "weaponReq": "กระบอง",
      "desc": "ถือกระบอง: ตีปกติแรงขึ้น 3% ความเร็วโจมตี +1% · Lv10 ตีครั้งที่ 5 ฟื้น HP เพื่อนที่เลือดน้อยสุด"
    },
    {
      "id": "pr_duple",
      "name": "ลงทัณฑ์",
      "thai": "สายพระนักสู้",
      "icon": "sk_pr_duple",
      "iconUrl": "https://play.nightcamp.app/cas/d3a7dcf09d4e.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ชำนาญกระบอง Lv.3",
      "prereq": [
        {
          "skill": "pr_macemastery",
          "level": 3
        }
      ],
      "desc": "ตีปกติโอกาส 3% เรียกแสงศักดิ์สิทธิ์ลงเป้า 112% ของ ATK/MATK ธาตุแสง · Lv5 ติดสถานะชำระ · Lv10 แสงกระโดดไปอีกตัว"
    }
  ],
  "paladin": [
    {
      "id": "pal_strike",
      "name": "ฟันศักดิ์สิทธิ์",
      "thai": "สายแสงศักดิ์สิทธิ์",
      "icon": "sk_pal_strike",
      "iconUrl": "https://play.nightcamp.app/cas/554be8d48e2e.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "ฟันดาบแสงข้างหน้า 100% ของ ATK/MATK (ที่สูงกว่า) ธาตุแสง ฟื้น HP 2.3% ต่อศัตรูที่โดน (สูงสุด 3 ตัว)"
    },
    {
      "id": "pal_cross",
      "name": "แสงกากบาทเผาผลาญ",
      "thai": "สายแสงศักดิ์สิทธิ์",
      "icon": "sk_pal_cross",
      "iconUrl": "https://play.nightcamp.app/cas/538d6bb6d226.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ฟันศักดิ์สิทธิ์ Lv.3, ดาบแสงพิพากษา Lv.1",
      "prereq": [
        {
          "skill": "pal_strike",
          "level": 3
        },
        {
          "skill": "judgment",
          "level": 1
        }
      ],
      "desc": "กางเขนแสงยักษ์รอบตัว 100% ของ ATK/MATK (ที่สูงกว่า) ธาตุแสง"
    },
    {
      "id": "pal_faith",
      "name": "ศรัทธา",
      "thai": "สายแสงศักดิ์สิทธิ์",
      "icon": "sk_pal_faith",
      "iconUrl": "https://play.nightcamp.app/cas/8d1789619a53.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "desc": "HP สูงสุด +2% · รับดาเมจลดลง 1% · MDEF +0 · Lv10 แสงกากบาทเผาผลาญไม่เสีย HP"
    },
    {
      "id": "pal_heaven",
      "name": "ดาบสวรรค์พิพากษา",
      "thai": "สายแสงศักดิ์สิทธิ์",
      "icon": "sk_pal_heaven",
      "iconUrl": "https://play.nightcamp.app/cas/937ce8033877.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "ult": true,
      "req": "แสงกากบาทเผาผลาญ Lv.5, ศรัทธา Lv.5",
      "prereq": [
        {
          "skill": "pal_cross",
          "level": 5
        },
        {
          "skill": "pal_faith",
          "level": 5
        }
      ],
      "desc": "ดาบแสง 10 เล่มร่วงจากฟ้าใส่พื้นที่ที่เล็ง เล่มละ 100% ของ ATK/MATK (ที่สูงกว่า) ธาตุแสง"
    },
    {
      "id": "pal_holyblade",
      "name": "ดาบแสงสถิต",
      "thai": "สายดาบศักดิ์สิทธิ์",
      "icon": "sk_pal_holyblade",
      "iconUrl": "https://play.nightcamp.app/cas/c68b3dc32be0.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ชำนาญดาบ Lv.5",
      "weaponReq": "อาวุธมือเดียว",
      "weaponBonus": "กระบอง (แสงแรงขึ้น 20%)",
      "prereq": [
        {
          "skill": "kn_swordmastery",
          "level": 5
        }
      ],
      "desc": "ตีปกติระยะประชิดแรงขึ้น 4% ด้วยแสง · Lv5 ตีครั้งที่ 5 ฟันกางเขนแสง"
    },
    {
      "id": "pal_zeal",
      "name": "ศรัทธาร้อนแรง",
      "thai": "สายดาบศักดิ์สิทธิ์",
      "icon": "sk_pal_zeal",
      "iconUrl": "https://play.nightcamp.app/cas/04c39a5be8ac.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "buff",
      "req": "เร่งเพลงดาบ Lv.5",
      "weaponReq": "อาวุธมือเดียว",
      "prereq": [
        {
          "skill": "kn_quicken",
          "level": 5
        }
      ],
      "desc": "33 วิ: ความเร็วโจมตี +2% อาวุธเป็นธาตุแสง · Lv5 ตีคริแล้วได้ HP · Lv10 ออร่าแสงเผาศัตรูรอบตัวทุกวินาที"
    },
    {
      "id": "pal_faithblade",
      "name": "ดาบแห่งศรัทธา",
      "thai": "สายดาบศักดิ์สิทธิ์",
      "icon": "sk_pal_faithblade",
      "iconUrl": "https://play.nightcamp.app/cas/1d050f59f436.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "passive",
      "req": "บ้าคลั่ง Lv.3",
      "weaponReq": "อาวุธมือเดียว",
      "prereq": [
        {
          "skill": "kn_berserk",
          "level": 3
        }
      ],
      "desc": "ตีปกติฮีลคนที่เลือดน้อยสุดในทีม (รวมตัวเอง) 1% ของดาเมจ (ทุก 3.5 วิ) · Lv1 ตีปกติฮีลเพื่อนที่เลือดน้อยสุด 1% ของดาเมจ · Lv3 ตีครบ 10 ครั้งปล่อยกางเขนแสงรอบตัว · Lv5 บ้าคลั่งไม่เสีย HP"
    },
    {
      "id": "pal_shieldchain",
      "name": "โล่พิฆาต",
      "thai": "สายปราการโล่",
      "icon": "sk_pal_shieldchain",
      "iconUrl": "https://play.nightcamp.app/cas/4d7a813ed0cf.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "โล่แสงศักดิ์สิทธิ์ Lv.5",
      "weaponReq": "โล่",
      "prereq": [
        {
          "skill": "guard",
          "level": 5
        }
      ],
      "desc": "ขว้างโล่แสงเด้งไป 3 ตัว ตัวละ 100% ของ ATK · เด้งเพิ่ม 1 ตัวทุก 3 เลเวล"
    },
    {
      "id": "pal_aegis",
      "name": "โล่อีจิส",
      "thai": "สายปราการโล่",
      "icon": "sk_pal_aegis",
      "iconUrl": "https://play.nightcamp.app/cas/efeae29be705.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "buff",
      "req": "โล่แสงศักดิ์สิทธิ์ Lv.5",
      "weaponReq": "โล่",
      "prereq": [
        {
          "skill": "guard",
          "level": 5
        }
      ],
      "desc": "โดมโล่ทอง 8.6 วิ: รับดาเมจลดลง 22% DEF +1 ฟื้น HP เร็วขึ้น 2 เท่า"
    },
    {
      "id": "pal_reflect",
      "name": "โล่สะท้อน",
      "thai": "สายปราการโล่",
      "icon": "sk_pal_reflect",
      "iconUrl": "https://play.nightcamp.app/cas/f21a0147339b.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "buff",
      "req": "โล่อีจิส Lv.3",
      "weaponReq": "โล่",
      "prereq": [
        {
          "skill": "pal_aegis",
          "level": 3
        }
      ],
      "desc": "35 วิ: สะท้อนดาเมจ 13% กลับใส่มอนที่ตีเรา"
    },
    {
      "id": "pal_devotion",
      "name": "สายใยพิทักษ์",
      "thai": "สายพิทักษ์ทีม",
      "icon": "sk_pal_devotion",
      "iconUrl": "https://play.nightcamp.app/cas/085c590ff46f.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "buff",
      "req": "ศรัทธา Lv.3",
      "prereq": [
        {
          "skill": "pal_faith",
          "level": 3
        }
      ],
      "desc": "33 วิ: โซ่แสงผูกเพื่อนรอบตัว เพื่อนรับดาเมจลดลง 22% ตัวเอง DEF +1"
    },
    {
      "id": "pal_layhands",
      "name": "มือแห่งแสง",
      "thai": "สายพิทักษ์ทีม",
      "icon": "sk_pal_layhands",
      "iconUrl": "https://play.nightcamp.app/cas/c9f81aadc828.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "สายใยพิทักษ์ Lv.1",
      "prereq": [
        {
          "skill": "pal_devotion",
          "level": 1
        }
      ],
      "desc": "ฟื้น HP ตัวเองและเพื่อนรอบตัว 14% ของ HP สูงสุด"
    }
  ],
  "dragonknight": [
    {
      "id": "dk_thrust",
      "name": "แทงเพลิงมังกร",
      "thai": "สายศาสตร์หอก",
      "icon": "sk_dk_thrust",
      "iconUrl": "https://play.nightcamp.app/cas/21309d4da5de.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "weaponReq": "หอก หรือ หอกยาว",
      "weaponBonus": "หอกยาว (แรงขึ้น 20%)",
      "desc": "แทงหอกพ่นไฟเป็นแนวยาว 100% ของ ATK ธาตุไฟ โดนทุกตัวในแนว"
    },
    {
      "id": "dk_spiral",
      "name": "หอกเกลียวสว่าน",
      "thai": "สายศาสตร์หอก",
      "icon": "sk_dk_spiral",
      "iconUrl": "https://play.nightcamp.app/cas/c49a296ba829.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "แทงเพลิงมังกร Lv.5, ชำนาญหอก Lv.3",
      "weaponReq": "หอก หรือ หอกยาว",
      "weaponBonus": "หอกยาว (แรงขึ้น 20%)",
      "prereq": [
        {
          "skill": "dk_thrust",
          "level": 5
        },
        {
          "skill": "dk_spearmastery",
          "level": 3
        }
      ],
      "desc": "หอกหมุนเป็นสว่านเพลิงเจาะศัตรูข้างหน้า 5 ครั้ง ครั้งละ 100% ของ ATK"
    },
    {
      "id": "dk_charge",
      "name": "จู่โจมพุ่งทะลวง",
      "thai": "สายศาสตร์หอก",
      "icon": "sk_dk_charge",
      "iconUrl": "https://play.nightcamp.app/cas/994b6aee49eb.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "แทงเพลิงมังกร Lv.3",
      "prereq": [
        {
          "skill": "dk_thrust",
          "level": 3
        }
      ],
      "desc": "พุ่งตรงไปข้างหน้า ชนทุกตัวที่ขวาง 100% ของ ATK ผลักกระเด็นออกข้าง"
    },
    {
      "id": "dk_spearmastery",
      "name": "ชำนาญหอก",
      "thai": "สายศาสตร์หอก",
      "icon": "sk_dk_spearmastery",
      "iconUrl": "https://play.nightcamp.app/cas/81147c84a241.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "weaponReq": "หอก หรือ หอกยาว",
      "desc": "ถือหอกหรือหอกยาว: ATK +2% ความแม่น +1"
    },
    {
      "id": "dk_quicken",
      "name": "เร่งหอก",
      "thai": "สายหอกรัว",
      "icon": "sk_dk_quicken",
      "iconUrl": "https://play.nightcamp.app/cas/7e5520de372b.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "buff",
      "req": "ชำนาญหอก Lv.3",
      "weaponReq": "หอกยาว",
      "prereq": [
        {
          "skill": "dk_spearmastery",
          "level": 3
        }
      ],
      "desc": "33 วิ ถือหอกยาว: ความเร็วโจมตี +2% คริติคอล +0.3% · Lv5 ตีปกติบางครั้งแทงสองครั้ง (10%) · Lv10 เร็วขึ้นรวม 20%"
    },
    {
      "id": "dk_tail",
      "name": "หางมังกร",
      "thai": "สายหอกรัว",
      "icon": "sk_dk_tail",
      "iconUrl": "https://play.nightcamp.app/cas/e7f4db1bb880.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "เร่งหอก Lv.1",
      "weaponReq": "หอก หรือ หอกยาว",
      "prereq": [
        {
          "skill": "dk_quicken",
          "level": 1
        }
      ],
      "desc": "ตีปกติระยะประชิดโอกาส 0.6% ปล่อยหอกไฟพุ่งทะลุเป็นแนว 55% ของ ATK · Lv5 หอกไฟติดเผา · Lv10 แตกเป็น 3 แนว"
    },
    {
      "id": "dk_fury",
      "name": "โทสะมังกร",
      "thai": "สายหอกรัว",
      "icon": "sk_dk_fury",
      "iconUrl": "https://play.nightcamp.app/cas/57f16e223c02.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "buff",
      "req": "ชำนาญหอก Lv.3",
      "prereq": [
        {
          "skill": "dk_spearmastery",
          "level": 3
        }
      ],
      "desc": "22 วิ: ATK +7% โจมตีเร็วขึ้น 5% อาวุธเป็นธาตุไฟ แต่ DEF -8"
    },
    {
      "id": "dk_breath",
      "name": "ลมหายใจมังกร",
      "thai": "สายเพลิงมังกร",
      "icon": "sk_dk_breath",
      "iconUrl": "https://play.nightcamp.app/cas/b421bcd3596d.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ระเบิดเพลิงรอบกาย Lv.5",
      "weaponBonus": "โล่ (ไฟแรงขึ้น 10%)",
      "prereq": [
        {
          "skill": "magnum",
          "level": 5
        }
      ],
      "desc": "พ่นไฟเป็นกรวยข้างหน้า 1.2 วิ (หันตามเมาส์ได้) 8 ครั้ง ครั้งละ 100% ของ ATK ธาตุไฟ"
    },
    {
      "id": "dk_leap",
      "name": "มังกรทะยาน",
      "thai": "สายเพลิงมังกร",
      "icon": "sk_dk_leap",
      "iconUrl": "https://play.nightcamp.app/cas/2e735e535e1c.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "ลมหายใจมังกร Lv.3",
      "prereq": [
        {
          "skill": "dk_breath",
          "level": 3
        }
      ],
      "desc": "พุ่งทะยานไปที่เมาส์แล้วกระแทกพื้นเป็นวงไฟ 100% ของ ATK ธาตุไฟ ผลักศัตรู"
    },
    {
      "id": "dk_blood",
      "name": "เลือดมังกร",
      "thai": "สายเพลิงมังกร",
      "icon": "sk_dk_blood",
      "iconUrl": "https://play.nightcamp.app/cas/99f2e860f2bb.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ลมหายใจมังกร Lv.5",
      "prereq": [
        {
          "skill": "dk_breath",
          "level": 5
        }
      ],
      "desc": "HP สูงสุด +2% · ATK +1%"
    },
    {
      "id": "dk_roar",
      "name": "วิญญาณมังกรคำราม",
      "thai": "สายเพลิงมังกร",
      "icon": "sk_dk_roar",
      "iconUrl": "https://play.nightcamp.app/cas/c395a39d20ec.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "ult": true,
      "req": "ลมหายใจมังกร Lv.5, เลือดมังกร Lv.3",
      "prereq": [
        {
          "skill": "dk_breath",
          "level": 5
        },
        {
          "skill": "dk_blood",
          "level": 3
        }
      ],
      "desc": "มังกรเพลิงวนรอบตัว 5 ระลอก ระลอกละ 100% ของ ATK แล้วคำรามระเบิด x2.5"
    },
    {
      "id": "dk_wyvern",
      "name": "ไวเวิร์นคู่ใจ",
      "thai": "สายไวเวิร์น",
      "icon": "sk_dk_wyvern",
      "iconUrl": "https://play.nightcamp.app/cas/89a7974d8ef0.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "เลือดมังกร Lv.1",
      "prereq": [
        {
          "skill": "dk_blood",
          "level": 1
        }
      ],
      "desc": "เรียกไวเวิร์นน้อย 22 วิ บินตามและพ่นลูกไฟ ลูกละ 100% ของ ATK/MATK · ยิ่งอัพยิ่งตัวโต · โตทุกเลเวล"
    }
  ],
  "archmage": [
    {
      "id": "am_chain",
      "name": "สายฟ้าลูกโซ่",
      "thai": "สายพายุอสนี",
      "icon": "sk_am_chain",
      "iconUrl": "https://play.nightcamp.app/cas/34142f98f715.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "สายฟ้าฟาด Lv.5",
      "prereq": [
        {
          "skill": "thunder",
          "level": 5
        }
      ],
      "desc": "สายฟ้ากระโดดต่อกัน 4 ตัว ตัวละ 100% ของ MATK (ลดลงทีละนิดต่อการกระโดด)"
    },
    {
      "id": "am_lordthunder",
      "name": "เจ้าแห่งอสนี",
      "thai": "สายพายุอสนี",
      "icon": "sk_am_lordthunder",
      "iconUrl": "https://play.nightcamp.app/cas/764bfd9dfc38.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "สายฟ้าลูกโซ่ Lv.5",
      "prereq": [
        {
          "skill": "am_chain",
          "level": 5
        }
      ],
      "desc": "พายุฟ้าผ่าเต็มพื้นที่ 3 วิ ฟ้าผ่าลูกละ 100% ของ MATK · Lv5 ฟ้าผ่าถี่ขึ้น · Lv10 เมฆพายุตามตัวเราไปด้วย"
    },
    {
      "id": "am_overcharge",
      "name": "ประจุล้น",
      "thai": "สายพายุอสนี",
      "icon": "sk_am_overcharge",
      "iconUrl": "https://play.nightcamp.app/cas/c795b9b7b20f.webp",
      "maxLevel": 1,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ใจสายฟ้า Lv.10",
      "prereq": [
        {
          "skill": "mg_stormheart",
          "level": 10
        }
      ],
      "desc": "ตีมอนธาตุลม/ดินได้อย่างน้อย 75% · เลเวลเดียว: ตีมอนธาตุลม/ดินได้อย่างน้อย 75%"
    },
    {
      "id": "am_orbwater",
      "name": "ลูกแก้วน้ำ",
      "thai": "สายผสานธาตุ",
      "icon": "sk_am_orbwater",
      "iconUrl": "https://play.nightcamp.app/cas/79bfac828159.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "buff",
      "req": "ร่ายอัตโนมัติ Lv.1",
      "prereq": [
        {
          "skill": "mg_autospell",
          "level": 1
        }
      ],
      "desc": "120 วิ: ร่ายอัตโนมัติวนมาใช้หอกน้ำแข็ง · เปิดหลายลูก: ร่ายอัตโนมัติวนธาตุตามลำดับที่เปิด ลูกแก้วตีปกติเป็นธาตุของรอบล่าสุด · Lv5 ตีปกติ 3 ครั้งแช่แข็ง · Lv10 โล่น้ำ"
    },
    {
      "id": "am_orbwind",
      "name": "ลูกแก้วลม",
      "thai": "สายผสานธาตุ",
      "icon": "sk_am_orbwind",
      "iconUrl": "https://play.nightcamp.app/cas/fb00e08d9129.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "buff",
      "req": "ร่ายอัตโนมัติ Lv.1",
      "prereq": [
        {
          "skill": "mg_autospell",
          "level": 1
        }
      ],
      "desc": "120 วิ: ร่ายอัตโนมัติวนมาใช้สายฟ้าฟาด · ความเร็วโจมตี +1% · โอกาสร่ายอัตโนมัติ +0.5% · เปิดหลายลูก: ร่ายอัตโนมัติวนธาตุตามลำดับที่เปิด ลูกแก้วตีปกติเป็นธาตุของรอบล่าสุด · Lv5 ร่ายอัตโนมัติทุก 0.6 วิ · Lv10 สายฟ้ากระโดดต่อ"
    },
    {
      "id": "am_orbfire",
      "name": "ลูกแก้วไฟ",
      "thai": "สายผสานธาตุ",
      "icon": "sk_am_orbfire",
      "iconUrl": "https://play.nightcamp.app/cas/9dd6b9b146a8.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "buff",
      "req": "ร่ายอัตโนมัติ Lv.1",
      "prereq": [
        {
          "skill": "mg_autospell",
          "level": 1
        }
      ],
      "desc": "120 วิ: ร่ายอัตโนมัติวนมาใช้ลูกไฟ · เวทจากร่ายอัตโนมัติและเวทคู่แรงขึ้น 3% · เปิดหลายลูก: ร่ายอัตโนมัติวนธาตุตามลำดับที่เปิด ลูกแก้วตีปกติเป็นธาตุของรอบล่าสุด · Lv5 เลเวลเวทเต็ม · Lv10 ลูกไฟระเบิดซ้ำ"
    },
    {
      "id": "am_chainreact",
      "name": "ปฏิกิริยาลูกโซ่",
      "thai": "สายผสานธาตุ",
      "icon": "sk_am_chainreact",
      "iconUrl": "https://play.nightcamp.app/cas/2335007f22a8.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ลูกแก้ว 2 ลูก Lv 5",
      "reqText": "ลูกแก้ว 2 ลูก Lv 5",
      "desc": "ปฏิกิริยาธาตุแรงขึ้น 6% · เวทจากร่ายอัตโนมัติหรือเวทคู่ที่เกิดปฏิกิริยา โอกาส 10% ร่ายอัตโนมัติต่อทันทีด้วยลูกแก้วถัดไป (ต่อได้ 3 ครั้ง) · Lv3 ปฏิกิริยาแพร่ · Lv5 ปฏิกิริยาใหม่ 2 แบบ"
    },
    {
      "id": "am_doublecast",
      "name": "เวทคู่",
      "thai": "สายเวทรัวหลอมธาตุ",
      "icon": "sk_am_doublecast",
      "iconUrl": "https://play.nightcamp.app/cas/97cb6b42bf91.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ร่ายอัตโนมัติ Lv.5",
      "prereq": [
        {
          "skill": "mg_autospell",
          "level": 5
        }
      ],
      "desc": "เวทจากร่ายอัตโนมัติและลูกแก้วตีปกติ มีโอกาส 1% ออกซ้ำอีกครั้ง · Lv5 ครั้งที่สองเป็นอีกธาตุ (ลูกแก้วลูกถัดไป เกิดปฏิกิริยาได้) · Lv10 ทุก 10 ครั้งปล่อยพายุธาตุเล็ก"
    },
    {
      "id": "am_arcaneflux",
      "name": "ประกายเวท",
      "thai": "สายเวทรัวหลอมธาตุ",
      "icon": "sk_am_arcaneflux",
      "iconUrl": "https://play.nightcamp.app/cas/1c13fcaa1250.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "buff",
      "req": "ชำนาญคทา Lv.5",
      "weaponReq": "คทา หรือ ออร์บ",
      "prereq": [
        {
          "skill": "mg_staffmastery",
          "level": 5
        }
      ],
      "desc": "33 วิ ถือคทาหรือออร์บ: ความเร็วโจมตี +1% MATK +1% · Lv5 เวลาร่ายลดลง 20% ระหว่างบัฟ · Lv10 วงเวทหมุนรอบตัว ยิงลูกแก้วเพิ่มเอง"
    },
    {
      "id": "am_convergence",
      "name": "หลอมรวมธาตุ",
      "thai": "สายเวทรัวหลอมธาตุ",
      "icon": "sk_am_convergence",
      "iconUrl": "https://play.nightcamp.app/cas/e5f5aa093de8.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ใจธาตุ 2 ธาตุ Lv 5",
      "reqText": "ใจธาตุ 2 ธาตุ Lv 5",
      "desc": "ร่ายธาตุต่างจากครั้งก่อน ดาเมจเวท +8% ซ้อนได้ 3 ชั้น (6 วิ) · Lv1 ร่ายธาตุต่างจากครั้งก่อน ดาเมจ +8% ซ้อน 3 ชั้น · Lv3 ปฏิกิริยาธาตุแรงขึ้น 50% · Lv5 ปฏิกิริยาธาตุทุกครั้งคืน SP 0.5% ของ SP สูงสุด"
    },
    {
      "id": "am_trinity",
      "name": "มหาเวทสามธาตุ",
      "thai": "สายมหาเวทสามธาตุ",
      "icon": "sk_am_trinity",
      "iconUrl": "https://play.nightcamp.app/cas/0b0d3111a76a.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "ปฏิกิริยาลูกโซ่ Lv.3",
      "prereq": [
        {
          "skill": "am_chainreact",
          "level": 3
        }
      ],
      "desc": "ไฟ น้ำแข็ง สายฟ้าหมุนรอบตัว 6 วิ ทุกสกิลที่ร่ายนับเป็นสองธาตุ ปลดเวทผสมทุกครั้ง · ลูกแก้วธาตุยิงศัตรูใกล้สุดทุก 0.6 วิ 100% ของ MATK"
    }
  ],
  "warlock": [
    {
      "id": "wl_soulfire",
      "name": "ไฟวิญญาณ",
      "thai": "สายไฟวิญญาณ",
      "icon": "sk_wl_soulfire",
      "iconUrl": "https://play.nightcamp.app/cas/c09a6ccf4c78.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "ลูกไฟวิญญาณระเบิดเป็นวง 100% ของ MATK และติดพิษ 3 วิ"
    },
    {
      "id": "wl_soulburn",
      "name": "คำสาปเผาวิญญาณ",
      "thai": "สายไฟวิญญาณ",
      "icon": "sk_wl_soulburn",
      "iconUrl": "https://play.nightcamp.app/cas/604f9769d3f0.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ไฟวิญญาณ Lv.3",
      "prereq": [
        {
          "skill": "wl_soulfire",
          "level": 3
        }
      ],
      "desc": "สาปศัตรูใกล้เมาส์ได้ถึง 5 ตัว เผาวิญญาณ 7 วิ ทุก 0.5 วิ 100% ของ MATK"
    },
    {
      "id": "wl_harvest",
      "name": "เก็บเกี่ยววิญญาณ",
      "thai": "สายไฟวิญญาณ",
      "icon": "sk_wl_harvest",
      "iconUrl": "https://play.nightcamp.app/cas/adaf7df048ed.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ไฟวิญญาณ Lv.5",
      "prereq": [
        {
          "skill": "wl_soulfire",
          "level": 5
        }
      ],
      "desc": "มอนตายใกล้ตัวได้วิญญาณ 1 ดวง (สูงสุด 3) ดวงละ MATK +4% หายไปถ้าไม่ได้เพิ่ม 20 วิ"
    },
    {
      "id": "wl_parade",
      "name": "ขบวนแห่วิญญาณ",
      "thai": "สายไฟวิญญาณ",
      "icon": "sk_wl_parade",
      "iconUrl": "https://play.nightcamp.app/cas/09fc08a56200.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "ult": true,
      "req": "ไฟวิญญาณ Lv.5, เก็บเกี่ยววิญญาณ Lv.3",
      "prereq": [
        {
          "skill": "wl_soulfire",
          "level": 5
        },
        {
          "skill": "wl_harvest",
          "level": 3
        }
      ],
      "desc": "วิญญาณ 24 ดวงพรั่งพรูจากตะเกียงไล่ล่าศัตรู ดวงละ 100% ของ MATK"
    },
    {
      "id": "wl_swing",
      "name": "ตะเกียงแกว่ง",
      "thai": "สายตะเกียงแกว่ง",
      "icon": "sk_wl_swing",
      "iconUrl": "https://play.nightcamp.app/cas/b30b591922ed.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ชำนาญคทา Lv.3",
      "weaponReq": "ตะเกียง",
      "prereq": [
        {
          "skill": "mg_staffmastery",
          "level": 3
        }
      ],
      "desc": "ลูกแก้วตีปกติมีโอกาสติดเผา แล้วไฟวิญญาณกระโดดไปอีก 1 ตัว 44% ของ MATK · ถือตะเกียง: MATK +1 ต่อ AGI 1 · Lv5 กระโดด 2 ตัว · Lv10 ฆ่าได้แล้วได้ดวงวิญญาณเพิ่ม"
    },
    {
      "id": "wl_drain",
      "name": "ดูดวิญญาณ",
      "thai": "สายตะเกียงแกว่ง",
      "icon": "sk_wl_drain",
      "iconUrl": "https://play.nightcamp.app/cas/97a04d070924.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ตะเกียงแกว่ง Lv.1",
      "weaponReq": "ตะเกียง",
      "prereq": [
        {
          "skill": "wl_swing",
          "level": 1
        }
      ],
      "desc": "ตีปกติดูด HP 0.2% ของดาเมจ และ SP 0.2% · Lv10 ดูดจน HP เต็มแล้วส่วนเกินกลายเป็นบาเรีย"
    },
    {
      "id": "wl_blaze",
      "name": "ตะเกียงเดือด",
      "thai": "สายตะเกียงแกว่ง",
      "icon": "sk_wl_blaze",
      "iconUrl": "https://play.nightcamp.app/cas/a0e588b96310.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "buff",
      "req": "ตะเกียงแกว่ง Lv.3",
      "weaponReq": "ตะเกียง",
      "prereq": [
        {
          "skill": "wl_swing",
          "level": 3
        }
      ],
      "desc": "23 วิ: ความเร็วโจมตี +4% ไฟวิญญาณจากการตีระเบิดเป็นวงเล็ก 60% ของ MATK · Lv5 ระหว่างบัฟ ได้ดวงวิญญาณสองเท่า"
    },
    {
      "id": "wl_chains",
      "name": "โซ่คำสาป",
      "thai": "สายคำสาป",
      "icon": "sk_wl_chains",
      "iconUrl": "https://play.nightcamp.app/cas/915fd8d5e587.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "weaponBonus": "คทา / ออร์บ (แรงขึ้น 15%)",
      "desc": "โซ่รูนผุดที่เมาส์ 100% ของ MATK ตรึงศัตรู 1.6 วิ และรับดาเมจเพิ่ม 15% นาน 6 วิ"
    },
    {
      "id": "wl_hex",
      "name": "ตราคำสาปมรณะ",
      "thai": "สายคำสาป",
      "icon": "sk_wl_hex",
      "iconUrl": "https://play.nightcamp.app/cas/4df95f7f1ca3.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "โซ่คำสาป Lv.3",
      "weaponBonus": "คทา / ออร์บ (แรงขึ้น 15%)",
      "prereq": [
        {
          "skill": "wl_chains",
          "level": 3
        }
      ],
      "desc": "ประทับตราคำสาปบนศัตรู 2.5 วิแล้วระเบิด 100% ของ MATK ตัวรอบข้างโดนครึ่งหนึ่ง"
    },
    {
      "id": "wl_pact",
      "name": "สัญญาแห่งความมืด",
      "thai": "สายคำสาป",
      "icon": "sk_wl_pact",
      "iconUrl": "https://play.nightcamp.app/cas/f79306c1d997.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "buff",
      "req": "โซ่คำสาป Lv.1",
      "prereq": [
        {
          "skill": "wl_chains",
          "level": 1
        }
      ],
      "desc": "แลก HP 30% เป็น SP และได้ MATK +10% นาน 30 วิ"
    },
    {
      "id": "wl_wisps",
      "name": "เรียกวิญญาณ",
      "thai": "สายภูตตะเกียง",
      "icon": "sk_wl_wisps",
      "iconUrl": "https://play.nightcamp.app/cas/7b8bf1083437.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "weaponBonus": "ตะเกียง (ซัมมอนแรงขึ้น 20%)",
      "desc": "วิญญาณน้อย 3 ดวงวนรอบตัว 13 วิ ยิงศัตรูใกล้ ๆ ทุกวินาที ดวงละ 100% ของ MATK · อยู่นานขึ้นและแรงขึ้นทุกเลเวล · 3 ดวง (ปรมาจารย์ตะเกียง Lv3: 4 ดวง)"
    },
    {
      "id": "wl_lantern",
      "name": "ภูตตะเกียง",
      "thai": "สายภูตตะเกียง",
      "icon": "sk_wl_lantern",
      "iconUrl": "https://play.nightcamp.app/cas/2eb5048c2d24.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "เรียกวิญญาณ Lv.3",
      "weaponBonus": "ตะเกียง (ซัมมอนแรงขึ้น 20%)",
      "prereq": [
        {
          "skill": "wl_wisps",
          "level": 3
        }
      ],
      "desc": "เรียกภูตตะเกียง 44 วิ ดูดวิญญาณศัตรู 100% ของ MATK แล้วคืน HP ให้เรา 30% ของดาเมจ · ยิ่งอัพยิ่งตัวโต · โตทุกเลเวล อยู่นานขึ้นและดูดแรงขึ้น · ปรมาจารย์ตะเกียง Lv5: อยู่ถาวร"
    },
    {
      "id": "wl_lanternmastery",
      "name": "ปรมาจารย์ตะเกียง",
      "thai": "สายภูตตะเกียง",
      "icon": "sk_wl_lanternmastery",
      "iconUrl": "https://play.nightcamp.app/cas/48c1fafa9e9f.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ภูตตะเกียง Lv.3",
      "prereq": [
        {
          "skill": "wl_lantern",
          "level": 3
        }
      ],
      "desc": "ภูตตะเกียงแรงขึ้น 15% · Lv1 ซัมมอน +15% · Lv3 วิญญาณ +1 ดวง · Lv5 ภูตตะเกียงอยู่ถาวร"
    }
  ],
  "ranger": [
    {
      "id": "rg_fearbreeze",
      "name": "พายุศรเร็ว",
      "thai": "สายพายุศรเร็ว",
      "icon": "sk_rg_fearbreeze",
      "iconUrl": "https://play.nightcamp.app/cas/0f5310ee9403.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ยิงเบิ้ล Lv.5",
      "weaponReq": "ธนู",
      "prereq": [
        {
          "skill": "ar_doubleshot",
          "level": 5
        }
      ],
      "desc": "ถือธนู: ความเร็วโจมตี +2% ยิงปกติโอกาส 4% ยิงเพิ่ม 2–4 ดอก ดอกละ 60% ของ ATK · Lv5 ดอกเพิ่มเป็นธาตุลม · Lv10 ดอกที่คริติคอลยิงซ้ำ"
    },
    {
      "id": "rg_truesight",
      "name": "ตาทิพย์",
      "thai": "สายพายุศรเร็ว",
      "icon": "sk_rg_truesight",
      "iconUrl": "https://play.nightcamp.app/cas/b2351ae5b7f6.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "buff",
      "req": "ตาเหยี่ยว Lv.5",
      "prereq": [
        {
          "skill": "ar_owl",
          "level": 5
        }
      ],
      "desc": "33 วิ: ทุกสเตตัส +1 ATK +0.5% ความแม่น +2 คริติคอล +0.5% · Lv5 คริแรงขึ้น 10% · Lv10 ระหว่างบัฟ ยิงปกติไม่พลาด"
    },
    {
      "id": "rg_unlimit",
      "name": "ปลดขีดจำกัด",
      "thai": "สายพายุศรเร็ว",
      "icon": "sk_rg_unlimit",
      "iconUrl": "https://play.nightcamp.app/cas/1e29a4ef98e2.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "buff",
      "ult": true,
      "req": "พายุศรเร็ว Lv.3, ตาทิพย์ Lv.3",
      "weaponReq": "ธนู หรือ หน้าไม้",
      "prereq": [
        {
          "skill": "rg_fearbreeze",
          "level": 3
        },
        {
          "skill": "rg_truesight",
          "level": 3
        }
      ],
      "desc": "20 วิ: ATK +6% แต่ DEF และ MDEF เป็น 0 และไม่ฟื้น HP · Lv5 ระหว่างบัฟ ยิงเบิ้ลเพิ่ม 20%"
    },
    {
      "id": "rg_trap",
      "name": "กับดักระเบิด",
      "thai": "สายกับดัก",
      "icon": "sk_rg_trap",
      "iconUrl": "https://play.nightcamp.app/cas/e3e3af645335.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "กับดักเถาวัลย์ Lv.3",
      "prereq": [
        {
          "skill": "ar_snare",
          "level": 3
        }
      ],
      "desc": "โยนกับดักระเบิดที่เมาส์ (วางได้หลายอัน) ศัตรูเหยียบแล้วระเบิดเป็นวง 100% ของ ATK มึน 1.2 วิ"
    },
    {
      "id": "rg_freezetrap",
      "name": "กับดักน้ำแข็ง",
      "thai": "สายกับดัก",
      "icon": "sk_rg_freezetrap",
      "iconUrl": "https://play.nightcamp.app/cas/6ac2ee0c235e.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "กับดักระเบิด Lv.3",
      "prereq": [
        {
          "skill": "rg_trap",
          "level": 3
        }
      ],
      "desc": "โยนกับดักน้ำแข็ง ศัตรูเหยียบแล้วแช่แข็งทั้งวง 2.2 วิ และ 100% ของ ATK"
    },
    {
      "id": "rg_trapmastery",
      "name": "ช่างกับดัก",
      "thai": "สายกับดัก",
      "icon": "sk_rg_trapmastery",
      "iconUrl": "https://play.nightcamp.app/cas/b405788b5336.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "passive",
      "req": "กับดักระเบิด Lv.5",
      "prereq": [
        {
          "skill": "rg_trap",
          "level": 5
        }
      ],
      "desc": "กับดักแรงขึ้น 5% · วางกับดักได้เพิ่ม 0 อัน (ปกติ 3) · Lv3 วางได้ +1 อัน · กับดักแรงขึ้น 5% ต่อเลเวล"
    },
    {
      "id": "rg_detonate",
      "name": "จุดระเบิดกับดัก",
      "thai": "สายกับดัก",
      "icon": "sk_rg_detonate",
      "iconUrl": "https://play.nightcamp.app/cas/ed905fce8e0f.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "ช่างกับดัก Lv.1",
      "prereq": [
        {
          "skill": "rg_trapmastery",
          "level": 1
        }
      ],
      "desc": "จุดระเบิดกับดักทุกอันที่วางไว้ทันที กับดักระเบิดและกับดักน้ำแข็งแรงขึ้น 50%"
    },
    {
      "id": "rg_snipe",
      "name": "ยิงสไนป์",
      "thai": "สายสไนเปอร์",
      "icon": "sk_rg_snipe",
      "iconUrl": "https://play.nightcamp.app/cas/5a4134dc7099.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ธนูกระแทก Lv.3",
      "weaponReq": "ธนู หรือ หน้าไม้",
      "weaponBonus": "หน้าไม้ (ทะลุ ดาเมจแรงขึ้น 30%)",
      "prereq": [
        {
          "skill": "ar_charge",
          "level": 3
        }
      ],
      "desc": "เล็ง 0.6 วิแล้วยิงทะลุทั้งแนว 100% ของ ATK"
    },
    {
      "id": "rg_eagle",
      "name": "ตาอินทรี",
      "thai": "สายสไนเปอร์",
      "icon": "sk_rg_eagle",
      "iconUrl": "https://play.nightcamp.app/cas/11f1745df51e.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ตาเหยี่ยว Lv.10",
      "prereq": [
        {
          "skill": "ar_owl",
          "level": 10
        }
      ],
      "desc": "คริติคอล +1% · ดาเมจคริติคอล +3% · คริแรง +3% ต่อเลเวล"
    },
    {
      "id": "rg_focus",
      "name": "เล็งจุดตาย",
      "thai": "สายสไนเปอร์",
      "icon": "sk_rg_focus",
      "iconUrl": "https://play.nightcamp.app/cas/da52787b8d85.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "buff",
      "req": "ตาอินทรี Lv.1",
      "weaponReq": "ธนู หรือ หน้าไม้",
      "prereq": [
        {
          "skill": "rg_eagle",
          "level": 1
        }
      ],
      "desc": "30 วิ: ATK +6.5% คริติคอล +1.5% ความแม่น +2 · ยิงสไนป์ตอนเล็งอยู่คริติคอลแน่นอน"
    },
    {
      "id": "rg_triple",
      "name": "ยิงสามดอก",
      "thai": "สายพายุพฤกษา",
      "icon": "sk_rg_triple",
      "iconUrl": "https://play.nightcamp.app/cas/51cf2599a84e.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "weaponReq": "ธนู",
      "desc": "ยิงธนูพันลม 3 ดอกเป็นพัดแคบ ทะลุทุกตัวในแนว ดอกละ 100% ของ ATK · ทุกดอกทะลุทั้งแนว"
    },
    {
      "id": "rg_piercer",
      "name": "ธนูใบไม้ทะลวง",
      "thai": "สายพายุพฤกษา",
      "icon": "sk_rg_piercer",
      "iconUrl": "https://play.nightcamp.app/cas/fbf9804a7f54.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ธนูพายุทะลวง Lv.5",
      "weaponReq": "ธนู",
      "prereq": [
        {
          "skill": "gale",
          "level": 5
        }
      ],
      "desc": "ธนูหมุนใบไม้ทะลุทั้งแนว 100% ของ ATK แล้วเปิดวังวนใบไม้ดูดศัตรูตรงศัตรูตัวแรกที่โดน (ไม่โดนใครจะเปิดที่ปลายทาง)"
    },
    {
      "id": "rg_storm",
      "name": "พายุศร",
      "thai": "สายพายุพฤกษา",
      "icon": "sk_rg_storm",
      "iconUrl": "https://play.nightcamp.app/cas/1a9ced6c9144.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "ult": true,
      "req": "ธนูใบไม้ทะลวง Lv.5",
      "weaponReq": "ธนู",
      "prereq": [
        {
          "skill": "rg_piercer",
          "level": 5
        }
      ],
      "desc": "พายุธนู 40 ดอกกับสายฟ้าสีเขียวถล่มพื้นที่ที่เล็ง ดอกละ 100% ของ ATK"
    }
  ],
  "wolfhunter": [
    {
      "id": "wh_wolf",
      "name": "เรียกหมาป่า",
      "thai": "สายหมาป่าคู่ใจ",
      "icon": "sk_wh_wolf",
      "iconUrl": "https://play.nightcamp.app/cas/5c6f18faed2b.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "เรียกหมาป่าคู่ใจ อยู่จนกว่าจะหมดแรง กัดครั้งละ 100% ของ ATK · ตัวใหญ่ 85% เลือด 40% ของเรา · (Lv 5 กัดติดเลือดออก) · (Lv 8 กัดโดนรอบตัว) · โตทุกเลเวล · Lv5 กัดเลือดออก · Lv8 กัดโดนรอบตัว · Lv10 ขนสีทอง"
    },
    {
      "id": "wh_command",
      "name": "สั่งขย้ำ",
      "thai": "สายหมาป่าคู่ใจ",
      "icon": "sk_wh_command",
      "iconUrl": "https://play.nightcamp.app/cas/2e7a423cf21f.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "เรียกหมาป่า Lv.3",
      "prereq": [
        {
          "skill": "wh_wolf",
          "level": 3
        }
      ],
      "desc": "สั่งหมาป่าพุ่งขย้ำศัตรูใกล้เมาส์ 3 ครั้ง ครั้งละ 100% ของ ATK มึน 0.5 วิ"
    },
    {
      "id": "wh_alpha",
      "name": "จ่าฝูง",
      "thai": "สายหมาป่าคู่ใจ",
      "icon": "sk_wh_alpha",
      "iconUrl": "https://play.nightcamp.app/cas/18cea8735923.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "passive",
      "req": "เรียกหมาป่า Lv.5",
      "prereq": [
        {
          "skill": "wh_wolf",
          "level": 5
        }
      ],
      "desc": "หมาป่าตัวโตขึ้นอีก 2% เลือด +5% กัดแรงขึ้น 5% · หมาป่าแรงขึ้น 2% ต่อเลเวล"
    },
    {
      "id": "wh_pack",
      "name": "ฝูงหมาป่าวิญญาณ",
      "thai": "สายหมาป่าคู่ใจ",
      "icon": "sk_wh_pack",
      "iconUrl": "https://play.nightcamp.app/cas/9d6c22e8c4a2.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "ult": true,
      "req": "เรียกหมาป่า Lv.5, หอนเรียกพลัง Lv.3",
      "prereq": [
        {
          "skill": "wh_wolf",
          "level": 5
        },
        {
          "skill": "wh_howl",
          "level": 3
        }
      ],
      "desc": "หมาป่าวิญญาณ 5 ตัววิ่งตะลุยไปข้างหน้า ชนทุกตัวที่ผ่าน ตัวละ 100% ของ ATK"
    },
    {
      "id": "wh_blitz",
      "name": "เหยี่ยวโฉบล่า",
      "thai": "สายเหยี่ยว",
      "icon": "sk_wh_blitz",
      "iconUrl": "https://play.nightcamp.app/cas/fc30c7dd1f6c.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "สั่งเหยี่ยวโฉบ 1 ครั้ง ครั้งละ 18 (ตาม DEX และ INT) ไม่สน DEF ไม่พลาด · Lv5 โฉบเป็นวงโดนรอบเป้า · Lv10 เหยี่ยวสายฟ้า ติดช็อต"
    },
    {
      "id": "wh_autoblitz",
      "name": "เหยี่ยวโฉบอัตโนมัติ",
      "thai": "สายเหยี่ยว",
      "icon": "sk_wh_autoblitz",
      "iconUrl": "https://play.nightcamp.app/cas/8780416b0366.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "เหยี่ยวโฉบล่า Lv.3",
      "weaponReq": "ธนู",
      "prereq": [
        {
          "skill": "wh_blitz",
          "level": 3
        }
      ],
      "desc": "ยิงปกติโอกาส 1.3% (LUK ÷ 6 + 0.5) ให้เหยี่ยวโฉบเอง 2 ครั้ง ไม่เสีย SP · Lv5 โฉบเองถี่ขึ้น · Lv10 เหยี่ยวคริติคอลได้"
    },
    {
      "id": "wh_steelcrow",
      "name": "กรงเล็บเหล็ก",
      "thai": "สายเหยี่ยว",
      "icon": "sk_wh_steelcrow",
      "iconUrl": "https://play.nightcamp.app/cas/b58a80fbdc85.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "passive",
      "req": "เหยี่ยวโฉบอัตโนมัติ Lv.5",
      "prereq": [
        {
          "skill": "wh_autoblitz",
          "level": 5
        }
      ],
      "desc": "เหยี่ยวแรงขึ้น 20% · Lv1 เหยี่ยวแรง +20% · Lv3 เป้าที่โดนโฉบรับดาเมจธนูเพิ่ม 10% · Lv5 เหยี่ยวทองตัวที่สอง โฉบพร้อมกัน (แรง 35%)"
    },
    {
      "id": "wh_bond",
      "name": "สายใยสัตว์ป่า",
      "thai": "สายเลือดจันทร์",
      "icon": "sk_wh_bond",
      "iconUrl": "https://play.nightcamp.app/cas/366148577b1d.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "desc": "สัตว์ที่เรียกมาแรงขึ้น 8% · ATK +1%"
    },
    {
      "id": "wh_howl",
      "name": "หอนเรียกพลัง",
      "thai": "สายเลือดจันทร์",
      "icon": "sk_wh_howl",
      "iconUrl": "https://play.nightcamp.app/cas/d232cd10cbd8.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "buff",
      "req": "เรียกหมาป่า Lv.3",
      "prereq": [
        {
          "skill": "wh_wolf",
          "level": 3
        }
      ],
      "desc": "หอนใต้แสงจันทร์ 21 วิ: ATK +10% โจมตีเร็วขึ้น 6% (หมาป่าด้วย) ศัตรูรอบตัวหวาดกลัว 1 วิ"
    },
    {
      "id": "wh_frenzy",
      "name": "คลั่งป่า",
      "thai": "สายเลือดจันทร์",
      "icon": "sk_wh_frenzy",
      "iconUrl": "https://play.nightcamp.app/cas/516473b7ef97.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "buff",
      "req": "สายใยสัตว์ป่า Lv.5",
      "prereq": [
        {
          "skill": "wh_bond",
          "level": 5
        }
      ],
      "desc": "15 วิ: เราโจมตีเร็วขึ้น 12% หมาป่าตัวใหญ่ขึ้นและกัดเร็วขึ้นมาก"
    },
    {
      "id": "wh_wolfrush",
      "name": "หมาป่าจู่โจม",
      "thai": "สายเลือดจันทร์",
      "icon": "sk_wh_wolfrush",
      "iconUrl": "https://play.nightcamp.app/cas/eec8c3451197.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "เรียกหมาป่า Lv.3",
      "weaponReq": "ธนู",
      "prereq": [
        {
          "skill": "wh_wolf",
          "level": 3
        }
      ],
      "desc": "ยิงปกติโอกาส 0.6% ให้หมาป่าพุ่งไปกัดเป้าที่เรายิงทันที · Lv5 กัดแล้วตรึง 1 วิ · Lv10 ทุกครั้งที่หมาป่ากัด เรายิงเร็วขึ้น 0.5% ซ้อน 10 ชั้น"
    },
    {
      "id": "wh_fang",
      "name": "ธนูเขี้ยวหมาป่า",
      "thai": "สายนักล่า",
      "icon": "sk_wh_fang",
      "iconUrl": "https://play.nightcamp.app/cas/fd0c084a3ccf.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "weaponReq": "ธนู",
      "desc": "ลูกธนูเขี้ยวหมาป่า 100% ของ ATK · ถ้าหมาป่าออกมาอยู่ มันจะวิ่งไปกัดเป้าเดียวกัน"
    },
    {
      "id": "wh_mark",
      "name": "ล่าเป้าหมาย",
      "thai": "สายนักล่า",
      "icon": "sk_wh_mark",
      "iconUrl": "https://play.nightcamp.app/cas/58ef6aed3e50.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "ธนูเขี้ยวหมาป่า Lv.3",
      "prereq": [
        {
          "skill": "wh_fang",
          "level": 3
        }
      ],
      "desc": "ทำเครื่องหมายศัตรูใกล้เมาส์ 15 วิ: รับดาเมจเพิ่ม 12% และหมาป่าจะไล่กัดตัวนั้น"
    },
    {
      "id": "wh_huntmastery",
      "name": "ชำนาญธนูพราน",
      "thai": "สายนักล่า",
      "icon": "sk_wh_huntmastery",
      "iconUrl": "https://play.nightcamp.app/cas/0a92aa76bc01.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "weaponReq": "ธนู",
      "desc": "ถือธนู: ATK +2% DEX +0"
    }
  ],
  "assassin": [
    {
      "id": "as_haste",
      "name": "เร่งนักฆ่า",
      "thai": "สายคริติคอล",
      "icon": "sk_as_haste",
      "iconUrl": "https://play.nightcamp.app/cas/66558206d8d3.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "buff",
      "req": "โจมตีสองครั้ง Lv.5",
      "weaponReq": "มีดคู่ หรือ คาทาร์",
      "prereq": [
        {
          "skill": "ro_double",
          "level": 5
        }
      ],
      "desc": "33 วิ ถือมีดคู่: ความเร็วโจมตี +2% คริติคอล +0.5% · Lv5 เดินเร็วขึ้น · Lv10 ตีปกติทิ้งเงาที่ฟันซ้ำ"
    },
    {
      "id": "as_lethal",
      "name": "คมมรณะ",
      "thai": "สายคริติคอล",
      "icon": "sk_as_lethal",
      "iconUrl": "https://play.nightcamp.app/cas/53985fc7f528.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "จุดตาย Lv.5",
      "prereq": [
        {
          "skill": "ro_vital",
          "level": 5
        }
      ],
      "desc": "ดาเมจคริติคอล +1.5% · Lv5 คริแล้วติดเลือดออก · Lv10 คริติดกัน 3 ครั้งได้ความเร็วเพิ่มชั่วครู่"
    },
    {
      "id": "as_katar",
      "name": "ชำนาญมีดคู่",
      "thai": "สายคริติคอล",
      "icon": "sk_as_katar",
      "iconUrl": "https://play.nightcamp.app/cas/998f872dbf6f.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ชำนาญมีด Lv.10",
      "weaponReq": "มีดคู่ หรือ คาทาร์",
      "prereq": [
        {
          "skill": "ro_dagger",
          "level": 10
        }
      ],
      "desc": "ถือมีดคู่: คริติคอล +3% · Lv1 คริ +3% · Lv3 คริแรง +15% · Lv5 คริแล้วฟันซ้ำอัตโนมัติ (20%)"
    },
    {
      "id": "as_twin",
      "name": "เขี้ยวคู่",
      "thai": "สายคริติคอล",
      "icon": "sk_as_twin",
      "iconUrl": "https://play.nightcamp.app/cas/95766213fc90.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "weaponReq": "คาทาร์",
      "desc": "พุ่งฟันมีดคู่ทะลุศัตรู 2 ครั้ง ครั้งละ 100% ของ ATK"
    },
    {
      "id": "as_meteor",
      "name": "อุกกาบาตเงา",
      "thai": "สายคริติคอล",
      "icon": "sk_as_meteor",
      "iconUrl": "https://play.nightcamp.app/cas/59c60903dbcb.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "เขี้ยวคู่ Lv.5",
      "prereq": [
        {
          "skill": "as_twin",
          "level": 5
        }
      ],
      "desc": "ระเบิดคมเงาสีเลือดรอบตัว 100% ของ ATK มึน 0.8 วิ"
    },
    {
      "id": "as_knives",
      "name": "มีดพิษกระจาย",
      "thai": "สายพิษมรณะ",
      "icon": "sk_as_knives",
      "iconUrl": "https://play.nightcamp.app/cas/6794807d1c4c.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ม่านควันพิษ Lv.3",
      "prereq": [
        {
          "skill": "venomdust",
          "level": 3
        }
      ],
      "desc": "ปามีดอาบพิษ 5 เล่มเป็นพัด เล่มละ 100% ของ ATK ติดพิษ"
    },
    {
      "id": "as_edp",
      "name": "อาบพิษมรณะ",
      "thai": "สายพิษมรณะ",
      "icon": "sk_as_edp",
      "iconUrl": "https://play.nightcamp.app/cas/d88dc5e0bfc9.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "buff",
      "req": "ใจพิษ Lv.5",
      "prereq": [
        {
          "skill": "ro_venomheart",
          "level": 5
        }
      ],
      "desc": "22 วิ: อาวุธอาบพิษมรณะ (ธาตุพิษ) ATK +12% ทุกการตีติดพิษ"
    },
    {
      "id": "as_splasher",
      "name": "ระเบิดพิษ",
      "thai": "สายพิษมรณะ",
      "icon": "sk_as_splasher",
      "iconUrl": "https://play.nightcamp.app/cas/cf9890564431.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "มีดพิษกระจาย Lv.3",
      "prereq": [
        {
          "skill": "as_knives",
          "level": 3
        }
      ],
      "desc": "ฝังระเบิดพิษในศัตรู 2 วิแล้วระเบิดเป็นวง 100% ของ ATK ติดพิษรุนแรง"
    },
    {
      "id": "as_venom",
      "name": "พิษร้าย",
      "thai": "สายพิษมรณะ",
      "icon": "sk_as_venom",
      "iconUrl": "https://play.nightcamp.app/cas/6ac96a63fb12.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ใจพิษ Lv.10",
      "prereq": [
        {
          "skill": "ro_venomheart",
          "level": 10
        }
      ],
      "desc": "พิษจากตีปกติและสกิลนักฆ่าแรงขึ้น 10% · ตีปกติมีโอกาส 3% ติดพิษ"
    },
    {
      "id": "as_cloak",
      "name": "อำพรางกาย",
      "thai": "สายเงามรณะ",
      "icon": "sk_as_cloak",
      "iconUrl": "https://play.nightcamp.app/cas/5e2b0ebf5ff0.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "buff",
      "req": "ซ่อนตัว Lv.3",
      "prereq": [
        {
          "skill": "ro_hide",
          "level": 3
        }
      ],
      "desc": "หายตัว 5.5 วิ เดินได้ปกติ มอนมองไม่เห็น · เขี้ยวมัจจุราชใช้ได้โดยไม่หลุดอำพราง · ตีแรกคริติคอลแน่นอน"
    },
    {
      "id": "as_grimtooth",
      "name": "เขี้ยวมัจจุราช",
      "thai": "สายเงามรณะ",
      "icon": "sk_as_grimtooth",
      "iconUrl": "https://play.nightcamp.app/cas/3626cf0ec441.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "อำพรางกาย Lv.3",
      "prereq": [
        {
          "skill": "as_cloak",
          "level": 3
        }
      ],
      "desc": "หนามเงาผุดเป็นแนวยาวข้างหน้า 100% ของ ATK · ใช้ตอนอำพรางได้โดยไม่หลุด"
    },
    {
      "id": "as_deathmark",
      "name": "ตราประทับมรณะ",
      "thai": "สายเงามรณะ",
      "icon": "sk_as_deathmark",
      "iconUrl": "https://play.nightcamp.app/cas/54ffe072aeb6.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "ult": true,
      "req": "เขี้ยวมัจจุราช Lv.5 หรือ เขี้ยวคู่ Lv.5",
      "reqAny": true,
      "prereq": [
        {
          "skill": "as_grimtooth",
          "level": 5
        },
        {
          "skill": "as_twin",
          "level": 5
        }
      ],
      "desc": "ประทับตรามรณะแล้ววาร์ปฟันรอบตัวเป้า 10 ครั้ง ครั้งละ 100% ของ ATK ปิดท้าย x3 และติดพิษ"
    }
  ],
  "shinobi": [
    {
      "id": "sh_throwing",
      "name": "ดาวคู่",
      "thai": "สายซัดรัว",
      "icon": "sk_sh_throwing",
      "iconUrl": "https://play.nightcamp.app/cas/38854e4cffbb.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "โจมตีสองครั้ง Lv.3",
      "weaponBonus": "ดาวยักษ์ (ชูริเคนแรงขึ้น 25%)",
      "prereq": [
        {
          "skill": "ro_double",
          "level": 3
        }
      ],
      "desc": "ปาดาวยักษ์แต่ละครั้ง โอกาส 5% ได้เงาดาวอีกดอก บินโค้งไขว้กับดาวจริงไปแล้ววนกลับอีกฝั่ง โดนทั้งขาไปและขากลับ 133% ของ ATK · Lv5 เงาดาวชิ่งต่อ 1 ตัว · Lv10 ท่ากระโดดปาได้ดาวคู่ทุกครั้ง"
    },
    {
      "id": "sh_huuma",
      "name": "ขว้างดาวยักษ์วกกลับ",
      "thai": "สายซัดรัว",
      "icon": "sk_sh_huuma",
      "iconUrl": "https://play.nightcamp.app/cas/0f0610759019.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "weaponReq": "ดาวยักษ์",
      "desc": "ขว้างดาวยักษ์ยักษ์ไป 420 แล้ววกกลับเข้ามือ โดนทั้งขาไปและขากลับ ครั้งละ 100% ของ ATK · คอมโบซัดเงา: ใช้สกิลซัดคนละตัวต่อกันภายใน 3 วิ แรงขึ้น ×1.05 / ×1.1 และร่างเงาปาท่าก่อนหน้าซ้ำ 15% · Lv5 ใหญ่ขึ้น · Lv10 ปลายทางหมุนค้างดูดมอนเข้าหา"
    },
    {
      "id": "sh_fan",
      "name": "พัดดาวกระจาย",
      "thai": "สายซัดรัว",
      "icon": "sk_sh_fan",
      "iconUrl": "https://play.nightcamp.app/cas/e2b3f6d06f55.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ขว้างดาวยักษ์วกกลับ Lv.3",
      "prereq": [
        {
          "skill": "sh_huuma",
          "level": 3
        }
      ],
      "desc": "ปาดาวยักษ์ตรงกลางกับเงาดาว 4 ดอกเป็นรูปพัด ทุกดอกทะลุไป 360 แล้ววนกลับ ศัตรูแต่ละตัวโดนขาไปและขากลับ ครั้งละ 100% ของ ATK · คอมโบซัดเงา: ใช้สกิลซัดคนละตัวต่อกันภายใน 3 วิ แรงขึ้น ×1.05 / ×1.1 และร่างเงาปาท่าก่อนหน้าซ้ำ 15% · Lv5 7 ดอก · Lv10 ทุกดอกชิ่ง 1 ครั้งก่อนกลับ"
    },
    {
      "id": "sh_ricochet",
      "name": "ดาวชิ่ง",
      "thai": "สายซัดรัว",
      "icon": "sk_sh_ricochet",
      "iconUrl": "https://play.nightcamp.app/cas/63073f57a8eb.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "พัดดาวกระจาย Lv.3",
      "prereq": [
        {
          "skill": "sh_fan",
          "level": 3
        }
      ],
      "desc": "ปาดาวยักษ์ใส่ตัวที่ใกล้เป้า แล้วชิ่งต่ออีก 4 ตัว แรงขึ้นทีละ 12% แล้วกลับเข้ามือ ครั้งละ 100% ของ ATK · เจอตัวเดียว เด้งกลับมาโดนซ้ำได้อีก 2 ครั้ง · คอมโบซัดเงา: ใช้สกิลซัดคนละตัวต่อกันภายใน 3 วิ แรงขึ้น ×1.05 / ×1.1 และร่างเงาปาท่าก่อนหน้าซ้ำ 15% · Lv10 ชิ่ง 7 ตัว"
    },
    {
      "id": "sh_shuriken",
      "name": "พายุชูริเคน",
      "thai": "สายซัดรัว",
      "icon": "sk_sh_shuriken",
      "iconUrl": "https://play.nightcamp.app/cas/c85c639711d8.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "ult": true,
      "req": "ขว้างดาวยักษ์วกกลับ Lv.5",
      "weaponReq": "ดาวยักษ์",
      "prereq": [
        {
          "skill": "sh_huuma",
          "level": 5
        }
      ],
      "desc": "วงเงาดาวหมุนรอบตัว ขยายออกแล้วหดเข้า 2.4 วิ ทุก 0.12 วิ 100% ของ ATK · ตอนจบวงแตก ดาวทุกดอกพุ่งออกไปชิ่งศัตรูรอบตัว · คอมโบซัดเงา: ใช้สกิลซัดคนละตัวต่อกันภายใน 3 วิ แรงขึ้น ×1.05 / ×1.1 และร่างเงาปาท่าก่อนหน้าซ้ำ 15% · ท่าปิด: กดตอนคอมโบขั้น 3 แรง ×1.3 และร่างเงา 2 ร่างหมุนวงด้วย · Lv5 วงสองชั้นหมุนสวนกัน · ตอนจบวงแตกพุ่งชิ่ง"
    },
    {
      "id": "sh_kunai",
      "name": "คุไนระเบิด",
      "thai": "สายคาถาไฟ",
      "icon": "sk_sh_kunai",
      "iconUrl": "https://play.nightcamp.app/cas/2cf9892b6e13.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "ปาคุไนติดยันต์ไฟ ปักแล้วระเบิดใน 0.5 วิ 100% ของ ATK/MATK (ที่สูงกว่า) ธาตุไฟ"
    },
    {
      "id": "sh_katon",
      "name": "คาถาไฟ",
      "thai": "สายคาถาไฟ",
      "icon": "sk_sh_katon",
      "iconUrl": "https://play.nightcamp.app/cas/5dfa0929c8f2.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "คุไนระเบิด Lv.3",
      "prereq": [
        {
          "skill": "sh_kunai",
          "level": 3
        }
      ],
      "desc": "ผนึกมือ กลีบไฟ 5 กลีบไล่ตามศัตรู กลีบละ 100% ของ ATK/MATK ธาตุไฟ"
    },
    {
      "id": "sh_windblade",
      "name": "ใบมีดวายุ",
      "thai": "สายคาถาลม-สายฟ้า",
      "icon": "sk_sh_windblade",
      "iconUrl": "https://play.nightcamp.app/cas/c23f6732aeea.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ก้าวเงา Lv.5",
      "prereq": [
        {
          "skill": "shadowstep",
          "level": 5
        }
      ],
      "desc": "พุ่งเป็นสายลมคม ฟันทุกตัวที่ผ่าน 100% ของ ATK"
    },
    {
      "id": "sh_raiton",
      "name": "คาถาสายฟ้า",
      "thai": "สายคาถาลม-สายฟ้า",
      "icon": "sk_sh_raiton",
      "iconUrl": "https://play.nightcamp.app/cas/52b7d505a78e.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ใบมีดวายุ Lv.3",
      "prereq": [
        {
          "skill": "sh_windblade",
          "level": 3
        }
      ],
      "desc": "มังกรสายฟ้าฟาดลงที่เมาส์ 100% ของ ATK/MATK มึน 0.8 วิ"
    },
    {
      "id": "sh_ninjamastery",
      "name": "วิชานินจา",
      "thai": "สกิลติดตัว",
      "icon": "sk_sh_ninjamastery",
      "iconUrl": "https://play.nightcamp.app/cas/e7c0ee2afc08.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ซ่อนตัว Lv.3",
      "prereq": [
        {
          "skill": "ro_hide",
          "level": 3
        }
      ],
      "desc": "สกิลแรงขึ้น 2% · หลบหลีก +1 · SP สูงสุด +1%"
    },
    {
      "id": "sh_clone",
      "name": "แยกเงาร่าง",
      "thai": "สายวิชาเงา",
      "icon": "sk_sh_clone",
      "iconUrl": "https://play.nightcamp.app/cas/e97cc11288b1.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ซ่อนตัว Lv.3",
      "prereq": [
        {
          "skill": "ro_hide",
          "level": 3
        }
      ],
      "desc": "ร่างเงา 2 ร่างโผล่ล้อมเป้า ปาเงาดาวพร้อมกันร่างละ 3 ดอกเข้ากลางฝูง ดาวชิ่งต่อ 1 ครั้ง ดอกละ 100% ของ ATK แล้วร่างเงาหายเป็นควัน · Lv5 3 ร่าง · Lv10 4 ร่าง ดาวชิ่ง 2 ครั้ง"
    },
    {
      "id": "sh_substitute",
      "name": "คาถาสลับร่าง",
      "thai": "สายวิชาเงา",
      "icon": "sk_sh_substitute",
      "iconUrl": "https://play.nightcamp.app/cas/54e1ddaf0269.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "buff",
      "req": "แยกเงาร่าง Lv.1",
      "prereq": [
        {
          "skill": "sh_clone",
          "level": 1
        }
      ],
      "desc": "30 วิ: หลบการโจมตีได้หมด 2 ครั้ง (ทิ้งท่อนไม้ไว้แทน)"
    },
    {
      "id": "sh_smoke",
      "name": "ระเบิดควัน",
      "thai": "สายวิชาเงา",
      "icon": "sk_sh_smoke",
      "iconUrl": "https://play.nightcamp.app/cas/53726c11860a.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "คาถาสลับร่าง Lv.1",
      "prereq": [
        {
          "skill": "sh_substitute",
          "level": 1
        }
      ],
      "desc": "กลุ่มควันรอบตัว 5 วิ ศัตรูข้างในช้าลงและตีเบาลง 22%"
    }
  ],
  "bishop": [
    {
      "id": "bi_heal",
      "name": "วงแสงเยียวยา",
      "thai": "สายฟื้นฟูชั้นสูง",
      "icon": "sk_bi_heal",
      "iconUrl": "https://play.nightcamp.app/cas/5d8f880fa771.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "วงแสงรักษาตัวเองและเพื่อนรอบตัว 10% ของ HP สูงสุด + ตามพลังเวท · ศัตรูรอบตัวโดนแสง 100% ของ MATK"
    },
    {
      "id": "bi_sanctuary",
      "name": "ลานแสงเยียวยา",
      "thai": "สายฟื้นฟูชั้นสูง",
      "icon": "sk_bi_sanctuary",
      "iconUrl": "https://play.nightcamp.app/cas/2e317dcb4ebb.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "วงแสงเยียวยา Lv.3",
      "prereq": [
        {
          "skill": "bi_heal",
          "level": 3
        }
      ],
      "desc": "เขตศักดิ์สิทธิ์ที่เมาส์ 8 วิ ทุก 0.5 วิ ฟื้น HP พวกเรา 3.3% และแสงเผาศัตรู 100% ของ MATK"
    },
    {
      "id": "bi_meditatio",
      "name": "สมาธิภาวนา",
      "thai": "สายฟื้นฟูชั้นสูง",
      "icon": "sk_bi_meditatio",
      "iconUrl": "https://play.nightcamp.app/cas/243f8035465a.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "passive",
      "req": "แสงเยียวยา Lv.10",
      "prereq": [
        {
          "skill": "pr_heal",
          "level": 10
        }
      ],
      "desc": "พลังฮีลของสกิลบิชอป +3% · ฟื้น SP +3% · SP สูงสุด +1% · ฮีลของสกิลบิชอป +3% ต่อเลเวล"
    },
    {
      "id": "bi_miracle",
      "name": "ปาฏิหาริย์",
      "thai": "สายฟื้นฟูชั้นสูง",
      "icon": "sk_bi_miracle",
      "iconUrl": "https://play.nightcamp.app/cas/83592c7a2877.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "ult": true,
      "req": "ลานแสงเยียวยา Lv.5",
      "prereq": [
        {
          "skill": "bi_sanctuary",
          "level": 5
        }
      ],
      "desc": "ตะวันแสงศักดิ์สิทธิ์: ฟื้น HP ทุกคน 60% ชุบเพื่อนที่หมดแรง แสงพิพากษาศัตรูรอบตัว 100% ของ MATK และอวยพร ATK/MATK +15% 20 วิ"
    },
    {
      "id": "bi_clementia",
      "name": "พรทั่วทัพ",
      "thai": "สายสรรเสริญ",
      "icon": "sk_bi_clementia",
      "iconUrl": "https://play.nightcamp.app/cas/dccf955c10d9.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "buff",
      "req": "พรศักดิ์สิทธิ์ Lv.10",
      "prereq": [
        {
          "skill": "blessing",
          "level": 10
        }
      ],
      "desc": "ทุกคนในทีมรัศมีกว้าง 66 วิ: STR INT DEX +1 และ +1 ทุก 10 Job Lv (ใช้แทนพรศักดิ์สิทธิ์) · Lv5 นานขึ้นเท่าตัว · Lv10 ปีกแสงทั้งทีม"
    },
    {
      "id": "bi_canto",
      "name": "บทเพลงเท้าไว",
      "thai": "สายสรรเสริญ",
      "icon": "sk_bi_canto",
      "iconUrl": "https://play.nightcamp.app/cas/7a68b98b17ab.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "buff",
      "req": "เพิ่มความเร็ว Lv.10",
      "prereq": [
        {
          "skill": "pr_agi",
          "level": 10
        }
      ],
      "desc": "ทุกคนในทีมรัศมีกว้าง 66 วิ: AGI +1 และ +1 ทุก 10 Job Lv เดินเร็วขึ้น 15% (ใช้แทนเพิ่มความเร็ว) · Lv5 ความเร็วโจมตีทั้งทีม +10% · Lv10 นานขึ้นเท่าตัว"
    },
    {
      "id": "bi_sacrament",
      "name": "พิธีเร่งเวท",
      "thai": "สายสรรเสริญ",
      "icon": "sk_bi_sacrament",
      "iconUrl": "https://play.nightcamp.app/cas/7de9e8edef84.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "buff",
      "req": "พรเร่งร่าย Lv.3",
      "prereq": [
        {
          "skill": "pr_suffragium",
          "level": 3
        }
      ],
      "desc": "ตัวเองและเพื่อนรอบตัว 60 วิ: เวลาร่ายลดลง 8% คูลดาวน์ลดลง 4% · Lv5 ส่วนคงที่ของเวลาร่ายหายไป"
    },
    {
      "id": "bi_expiatio",
      "name": "พรทะลวงเกราะ",
      "thai": "สายสรรเสริญ",
      "icon": "sk_bi_expiatio",
      "iconUrl": "https://play.nightcamp.app/cas/7e6a2abdd3be.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "buff",
      "req": "มือประทานพลัง Lv.3",
      "prereq": [
        {
          "skill": "bi_impositio",
          "level": 3
        }
      ],
      "desc": "ตัวเองและเพื่อนรอบตัว 60 วิ: ตีทะลุ DEF ศัตรู 5% · Lv5 ตีทะลุ MDEF ด้วย"
    },
    {
      "id": "bi_barrier",
      "name": "ม่านแสงคุ้มภัย",
      "thai": "สายบาเรีย",
      "icon": "sk_bi_barrier",
      "iconUrl": "https://play.nightcamp.app/cas/0beff28daec7.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "buff",
      "req": "พรศักดิ์สิทธิ์ Lv.5",
      "prereq": [
        {
          "skill": "blessing",
          "level": 5
        }
      ],
      "desc": "บาเรียทอง 20 วิ ดูดซับดาเมจได้ 14% ของ HP สูงสุด + MATK x2 (เพื่อนรอบตัวรับดาเมจลดลง 15%)"
    },
    {
      "id": "bi_assumptio",
      "name": "ปีกแสงคุ้มกาย",
      "thai": "สายบาเรีย",
      "icon": "sk_bi_assumptio",
      "iconUrl": "https://play.nightcamp.app/cas/8a650db52cc1.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "buff",
      "req": "ม่านแสงคุ้มภัย Lv.5",
      "prereq": [
        {
          "skill": "bi_barrier",
          "level": 5
        }
      ],
      "desc": "ปีกทองโอบทั้งทีม 22 วิ: ตัวเองและเพื่อนรอบตัวรับดาเมจลดลง 11%"
    },
    {
      "id": "bi_magnificat",
      "name": "บทสวดฟื้นมานา",
      "thai": "สายบาเรีย",
      "icon": "sk_bi_magnificat",
      "iconUrl": "https://play.nightcamp.app/cas/e41a7b87720b.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "buff",
      "req": "พรเกราะกาย Lv.3",
      "prereq": [
        {
          "skill": "pr_angelus",
          "level": 3
        }
      ],
      "desc": "เพลงสรรเสริญ 35 วิ: ฟื้น SP เร็วขึ้น 2 เท่า SP สูงสุด +1%"
    },
    {
      "id": "bi_turnundead",
      "name": "ขับไล่อมตะ",
      "thai": "สายพิพากษา",
      "icon": "sk_bi_turnundead",
      "iconUrl": "https://play.nightcamp.app/cas/fc655d73a0e7.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "แสงศักดิ์สิทธิ์ Lv.5",
      "weaponBonus": "คัมภีร์ (ใช้ ATK+MATK แรงขึ้น)",
      "prereq": [
        {
          "skill": "holylight",
          "level": 5
        }
      ],
      "desc": "ลำแสงศักดิ์สิทธิ์ขับไล่ศัตรูใกล้เมาส์ 100% ของ MATK (อมตะและความมืดโดน x2)"
    },
    {
      "id": "bi_lexdivina",
      "name": "ตราแสงตรึง",
      "thai": "สายพิพากษา",
      "icon": "sk_bi_lexdivina",
      "iconUrl": "https://play.nightcamp.app/cas/96dbddad5701.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "ขับไล่อมตะ Lv.3",
      "prereq": [
        {
          "skill": "bi_turnundead",
          "level": 3
        }
      ],
      "desc": "ตราศักดิ์สิทธิ์ที่เมาส์ 100% ของ MATK ตรึงศัตรู 2.3 วิ"
    },
    {
      "id": "bi_impositio",
      "name": "มือประทานพลัง",
      "thai": "สายพิพากษา",
      "icon": "sk_bi_impositio",
      "iconUrl": "https://play.nightcamp.app/cas/1486cf21ac9b.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "buff",
      "req": "พรศักดิ์สิทธิ์ Lv.3",
      "prereq": [
        {
          "skill": "blessing",
          "level": 3
        }
      ],
      "desc": "ตัวเองและเพื่อนรอบตัว 60 วิ: ATK +5"
    },
    {
      "id": "bi_battlehymn",
      "name": "เพลงสวดศึก",
      "thai": "สายบทสวดศึก",
      "icon": "sk_bi_battlehymn",
      "iconUrl": "https://play.nightcamp.app/cas/bcc0dcc117ff.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "buff",
      "req": "ชำนาญกระบอง Lv.5",
      "weaponReq": "กระบอง หรือ คัมภีร์",
      "prereq": [
        {
          "skill": "pr_macemastery",
          "level": 5
        }
      ],
      "desc": "ตัวเองและเพื่อนรอบตัว 44 วิ: ความเร็วโจมตี +3% ATK +1% อาวุธเป็นธาตุแสง · Lv5 ตีคริแล้วฟื้น HP · Lv10 ออร่าเพลงรอบตัวตลอดบัฟ"
    },
    {
      "id": "bi_mercy",
      "name": "มือเมตตา",
      "thai": "สายบทสวดศึก",
      "icon": "sk_bi_mercy",
      "iconUrl": "https://play.nightcamp.app/cas/1ea045a0a88e.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ลงทัณฑ์ Lv.3",
      "weaponReq": "กระบอง หรือ คัมภีร์",
      "prereq": [
        {
          "skill": "pr_duple",
          "level": 3
        }
      ],
      "desc": "ตีปกติโอกาส 2% ปล่อยวงแสงเยียวยาที่เป้า ดาเมจ 50% ของวงแสงเยียวยา (ไม่ฮีล) · Lv10 โอกาส 20%"
    }
  ],
  "monk": [
    {
      "id": "mo_triple",
      "name": "หมัดสามดาว",
      "thai": "สายคอมโบ",
      "icon": "sk_mo_triple",
      "iconUrl": "https://play.nightcamp.app/cas/20bf0b4323e7.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ชำนาญกระบอง Lv.3",
      "prereq": [
        {
          "skill": "pr_macemastery",
          "level": 3
        }
      ],
      "desc": "ตีปกติโอกาส 3% ต่อยสามหมัดติด แรง 150% แล้วเปิดคอมโบ 1.2 วิ (ชุดหมัดพายุไม่เสีย SP) · Lv5 สามหมัดได้ลูกปราณ · Lv10 ระหว่างปราณเดือด โอกาสคงที่ 30%"
    },
    {
      "id": "mo_palms",
      "name": "ฝ่ามือร้อยทิศ",
      "thai": "สายคอมโบ",
      "icon": "sk_mo_palms",
      "iconUrl": "https://play.nightcamp.app/cas/7cccb0b21b2b.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ปล่อยพลังปราณ Lv.3",
      "weaponBonus": "สนับมือ (แรงขึ้น 20%)",
      "prereq": [
        {
          "skill": "mo_chi",
          "level": 3
        }
      ],
      "desc": "ฝ่ามือรัว 10 ครั้งข้างหน้า ครั้งละ 100% ของ ATK แล้วผลักกระเด็น"
    },
    {
      "id": "mo_combo",
      "name": "ชุดหมัดพายุ",
      "thai": "สายคอมโบ",
      "icon": "sk_mo_combo",
      "iconUrl": "https://play.nightcamp.app/cas/09272a2f6eda.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ฝ่ามือร้อยทิศ Lv.3",
      "weaponReq": "สนับมือ",
      "prereq": [
        {
          "skill": "mo_palms",
          "level": 3
        }
      ],
      "desc": "หมัดชุด 4 จังหวะข้างหน้า ครั้งละ 100% ของ ATK จังหวะสุดท้ายผลักกระเด็น"
    },
    {
      "id": "mo_snap",
      "name": "ก้าวกระโดด",
      "thai": "สายคอมโบ",
      "icon": "sk_mo_snap",
      "iconUrl": "https://play.nightcamp.app/cas/51f999a1815d.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "buff",
      "req": "ลูกปราณ Lv.2",
      "prereq": [
        {
          "skill": "mo_spheres",
          "level": 2
        }
      ],
      "desc": "ก้าวพริบตาไปที่เมาส์ (ไกลสุด 380) ทิ้งเส้นแสงทองไว้"
    },
    {
      "id": "mo_fury",
      "name": "ปราณเดือด",
      "thai": "สายคอมโบ",
      "icon": "sk_mo_fury",
      "iconUrl": "https://play.nightcamp.app/cas/b7b2edefdc38.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "buff",
      "req": "หมัดเหล็ก Lv.3",
      "prereq": [
        {
          "skill": "mo_ironfist",
          "level": 3
        }
      ],
      "desc": "36 วิ: คริติคอล +3% ความเร็วโจมตี +4% · Lv5 ระหว่างบัฟ หมัดสิ้นปราณไม่ต้องร่าย"
    },
    {
      "id": "mo_chi",
      "name": "ปล่อยพลังปราณ",
      "thai": "สายลูกปราณ",
      "icon": "sk_mo_chi",
      "iconUrl": "https://play.nightcamp.app/cas/f8cbf100e2e4.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "weaponBonus": "ไม้พลอง (แรงขึ้น 15%)",
      "desc": "คลื่นปราณพุ่งทะลุทั้งแนว 100% ของ ATK · มีลูกปราณ: ใช้ 1 ลูก แรงขึ้น 50%"
    },
    {
      "id": "mo_spheres",
      "name": "ลูกปราณ",
      "thai": "สายลูกปราณ",
      "icon": "sk_mo_spheres",
      "iconUrl": "https://play.nightcamp.app/cas/25a897a1702e.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "buff",
      "desc": "สะสมลูกปราณ 1 ลูก (สูงสุด 1) ลูกละ ATK +3% · บางสกิลใช้ลูกปราณเพิ่มพลัง · สูงสุดตามเลเวล (1 → 5 ลูก)"
    },
    {
      "id": "mo_impact",
      "name": "ฝ่ามือทะลวงปราณ",
      "thai": "สายลูกปราณ",
      "icon": "sk_mo_impact",
      "iconUrl": "https://play.nightcamp.app/cas/f4e73c6ea0e5.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ปล่อยพลังปราณ Lv.5",
      "weaponBonus": "กระบอง (แรงขึ้น 20%)",
      "prereq": [
        {
          "skill": "mo_chi",
          "level": 5
        }
      ],
      "desc": "ฝ่ามือส่งปราณทะลุเกราะ 100% ของ ATK คริติคอลแน่นอน (ทะลุ DEF ครึ่งหนึ่ง)"
    },
    {
      "id": "mo_asura",
      "name": "หมัดสิ้นปราณ",
      "thai": "สายลูกปราณ",
      "icon": "sk_mo_asura",
      "iconUrl": "https://play.nightcamp.app/cas/9576d00b6682.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "ult": true,
      "req": "ลูกปราณ Lv.5, ฝ่ามือทะลวงปราณ Lv.3",
      "prereq": [
        {
          "skill": "mo_spheres",
          "level": 5
        },
        {
          "skill": "mo_impact",
          "level": 3
        }
      ],
      "desc": "ใช้ SP ที่เหลือทั้งหมดและลูกปราณทุกลูก พุ่งหมัดเพลิงวิญญาณใส่ศัตรู 100% ของ ATK · SP ที่ใช้เพิ่มพลังได้ถึง 2 เท่า ลูกปราณลูกละ +10%"
    },
    {
      "id": "mo_ironbody",
      "name": "กายเหล็ก",
      "thai": "สายร่างเหล็ก",
      "icon": "sk_mo_ironbody",
      "iconUrl": "https://play.nightcamp.app/cas/cb2796d0a831.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "buff",
      "req": "หมัดเหล็ก Lv.3",
      "prereq": [
        {
          "skill": "mo_ironfist",
          "level": 3
        }
      ],
      "desc": "10.5 วิ: รับดาเมจลดลง 33% ATK +10% (เดินช้าลงนิด)"
    },
    {
      "id": "mo_ironfist",
      "name": "หมัดเหล็ก",
      "thai": "สายร่างเหล็ก",
      "icon": "sk_mo_ironfist",
      "iconUrl": "https://play.nightcamp.app/cas/e06937416ce7.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "desc": "ATK +3% · ความแม่น +1"
    },
    {
      "id": "mo_dodge",
      "name": "ก้าวไร้เงา",
      "thai": "สายร่างเหล็ก",
      "icon": "sk_mo_dodge",
      "iconUrl": "https://play.nightcamp.app/cas/c28a5d1b0c94.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "desc": "หลบหลีก +2 · หลบสมบูรณ์ +0%"
    }
  ],
  "swordmaster": [
    {
      "id": "sm_twin",
      "name": "ดาบคู่ประสาน",
      "thai": "สายเพลงดาบคู่",
      "icon": "sk_sm_twin",
      "iconUrl": "https://play.nightcamp.app/cas/94ee65e0a76c.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "เร่งเพลงดาบ Lv.3",
      "weaponReq": "ดาบคู่",
      "prereq": [
        {
          "skill": "kn_quicken",
          "level": 3
        }
      ],
      "desc": "ถือดาบคู่: ตีปกติฟันสองมือ มือซ้ายแรง 37% ความเร็วโจมตี +1% · ทุกครั้งที่ 4 ทิ้งรอยดาบ · Lv5 รอยที่ครบ 3 วิระเบิดเอง 45% · Lv10 ทุกครั้งที่ 4 ทิ้ง 2 รอย"
    },
    {
      "id": "sm_moondance",
      "name": "ระบำใบมีดใต้จันทร์",
      "thai": "สายเพลงดาบคู่",
      "icon": "sk_sm_moondance",
      "iconUrl": "https://play.nightcamp.app/cas/a55d7651a9e2.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "buff",
      "req": "ดาบคู่ประสาน Lv.3",
      "weaponReq": "ดาบคู่",
      "prereq": [
        {
          "skill": "sm_twin",
          "level": 3
        }
      ],
      "desc": "30 วิ: ตีโดนได้ชั้นระบำ สูงสุด 10 ชั้น ชั้นละความเร็วโจมตี +1.5% · ครบ 10 ชั้นตีปกติทุกครั้งทิ้งรอยดาบ · Lv5 เปลี่ยนเป้าแล้วชั้นไม่หาย · Lv10 ครบ 10 ชั้นคริ +10"
    },
    {
      "id": "sm_bladerain",
      "name": "สายฝนดาบ",
      "thai": "สายเพลงดาบคู่",
      "icon": "sk_sm_bladerain",
      "iconUrl": "https://play.nightcamp.app/cas/457b7daa70f3.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "weaponReq": "ดาบคู่",
      "desc": "ฟันรัว 6 ครั้ง ครั้งละ 100% ของ ATK ทุกครั้งทิ้งรอยดาบ · Lv5 ไม่เดินช้าลงระหว่างฟัน · Lv10 ครั้งสุดท้ายดึงรอยดาบทั้งหมดมาระเบิดที่เป้า"
    },
    {
      "id": "sm_thousand",
      "name": "จันทร์พันดาบ",
      "thai": "สายเพลงดาบคู่",
      "icon": "sk_sm_thousand",
      "iconUrl": "https://play.nightcamp.app/cas/083ca04d1ba4.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "ult": true,
      "req": "ระบำใบมีดใต้จันทร์ Lv.5, สายฝนดาบ Lv.5",
      "weaponReq": "ดาบคู่",
      "prereq": [
        {
          "skill": "sm_moondance",
          "level": 5
        },
        {
          "skill": "sm_bladerain",
          "level": 5
        }
      ],
      "desc": "เงาดาบ 8 เล่มโคจรรอบตัว 16 วิ ตีปกติแต่ละครั้งเงาดาบ 2 เล่มพุ่งตาม เล่มละ 100% ของ ATK · Lv5 เงาดาบแรงขึ้นทุกเลเวล"
    },
    {
      "id": "sm_duel",
      "name": "ท้าดวล",
      "thai": "สายเจตจำนงนักดาบ",
      "icon": "sk_sm_duel",
      "iconUrl": "https://play.nightcamp.app/cas/b30092e05cb7.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "desc": "ท้าเป้า 1 ตัว 12 วิ มันหันมาตีเรา เราทำดาเมจใส่มัน +4% · ชนะดวลได้ \"เกียรตินักดาบ\" ATK +5% 20 วิ ซ้อนได้ 3 ชั้น · Lv5 ดาเมจใส่คู่ดวล +20%"
    },
    {
      "id": "sm_eye",
      "name": "สายตานักดาบ",
      "thai": "สายเจตจำนงนักดาบ",
      "icon": "sk_sm_eye",
      "iconUrl": "https://play.nightcamp.app/cas/57c9805069f6.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ชำนาญดาบ Lv.3",
      "weaponReq": "ดาบคู่ หรือ ดาบมือเดียว หรือ ดาบใหญ่",
      "prereq": [
        {
          "skill": "kn_swordmastery",
          "level": 3
        }
      ],
      "desc": "ถือดาบ: ดาเมจคริ +2% ความแม่น +2 · รอยดาบระเบิดคริได้ · Lv10 ดาเมจคริ +20%"
    },
    {
      "id": "sm_enchant",
      "name": "ใส่ธาตุดาบ",
      "thai": "สายดาบเวท",
      "icon": "sk_sm_enchant",
      "iconUrl": "https://play.nightcamp.app/cas/2074357d07dc.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "buff",
      "weaponReq": "ดาบมือเดียว",
      "desc": "60 วิ: ใส่ธาตุไฟ น้ำแข็ง หรือสายฟ้าให้ดาบ (กดซ้ำเพื่อสลับธาตุ) ตีปกติเพิ่ม MATK 46% ธาตุนั้น ติดสถานะของธาตุ · ตีปกติทุกครั้งที่ 3 ทิ้งรอยดาบ · Lv5 สลับธาตุแล้วฮิตธาตุครั้งแรกแรงขึ้น 30% · Lv10 ใส่ได้ 2 ธาตุพร้อมกัน"
    },
    {
      "id": "sm_wave",
      "name": "คลื่นดาบเวท",
      "thai": "สายดาบเวท",
      "icon": "sk_sm_wave",
      "iconUrl": "https://play.nightcamp.app/cas/e9ffb2b6fa9a.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "weaponReq": "ดาบมือเดียว",
      "desc": "ฟันปล่อยคลื่นเวทธาตุของดาบไป 500 100% ของ ATK+MATK ทิ้งรอยดาบบนตัวที่โดน · Lv5 คลื่นทะลุ · Lv10 ปล่อย 3 คลื่นเป็นพัด"
    },
    {
      "id": "sm_float",
      "name": "ดาบเวทลอย",
      "thai": "สายดาบเวท",
      "icon": "sk_sm_float",
      "iconUrl": "https://play.nightcamp.app/cas/619098c9b92a.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "คลื่นดาบเวท Lv.3, ใส่ธาตุดาบ Lv.3",
      "weaponReq": "ดาบมือเดียว",
      "prereq": [
        {
          "skill": "sm_wave",
          "level": 3
        },
        {
          "skill": "sm_enchant",
          "level": 3
        }
      ],
      "desc": "ดาบเวท 2 เล่มลอยรอบตัว 20 วิ พุ่งใส่เป้าที่เราตีทุก 1 วิ เล่มละ 100% ของ MATK ธาตุของดาบ · จำนวนเล่มเพิ่มทุก 4 เลเวล (2 → 4)"
    },
    {
      "id": "sm_heart",
      "name": "ใจดาบเวท",
      "thai": "สายดาบเวท",
      "icon": "sk_sm_heart",
      "iconUrl": "https://play.nightcamp.app/cas/621f7d2ce2ab.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ใส่ธาตุดาบ Lv.5",
      "weaponReq": "ดาบมือเดียว",
      "prereq": [
        {
          "skill": "sm_enchant",
          "level": 5
        }
      ],
      "desc": "ATK กับ MATK ยืมค่ากันและกัน: ท่า ATK+MATK แรงขึ้นราว 20% · Lv1 ATK กับ MATK ยืมกันและกัน 20% · Lv3 รอยดาบระเบิดเป็นธาตุ · Lv5 ชักดาบแล้วดาบเวทลอยทุกเล่มพุ่งพร้อมกัน"
    },
    {
      "id": "sm_iai",
      "name": "ชักดาบผ่ารอย",
      "thai": "สายท่าชักดาบ",
      "icon": "sk_sm_iai",
      "iconUrl": "https://play.nightcamp.app/cas/5a84c7732569.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "คลื่นดาบเวท Lv.1",
      "weaponReq": "ดาบมือเดียว",
      "weaponBonus": "อาวุธมือเดียว (ไม่ถือโล่) (แรงขึ้น 20%)",
      "prereq": [
        {
          "skill": "sm_wave",
          "level": 1
        }
      ],
      "desc": "ชาร์จ 0.6 วิ แล้วพุ่งฟันเป็นเส้น 400 100% ของ ATK ×1.6 รอยดาบบนเส้นทางระเบิดทั้งหมด รอยละ 60% · มือว่าง (ไม่ถือโล่): แรงขึ้น 44% รวมโบนัสอาวุธ · Lv10 ฆ่าได้คืนคูลดาวน์ครึ่งหนึ่ง"
    },
    {
      "id": "sm_focus",
      "name": "สมาธิดาบ",
      "thai": "สายท่าชักดาบ",
      "icon": "sk_sm_focus",
      "iconUrl": "https://play.nightcamp.app/cas/0603087d92ae.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ชักดาบผ่ารอย Lv.3",
      "weaponReq": "ดาบมือเดียว",
      "prereq": [
        {
          "skill": "sm_iai",
          "level": 3
        }
      ],
      "desc": "ไม่ได้ตี 2 วิ ท่าชักดาบครั้งถัดไปคริแน่นอน · Lv1 ไม่ได้ตี 2 วิ ชักดาบครั้งถัดไปคริแน่นอน · Lv3 ชาร์จเร็วขึ้น 30% · Lv5 รอยดาบจากท่าชักดาบแรง ×1.5"
    }
  ],
  "berserker": [
    {
      "id": "bk_crosscut",
      "name": "ฟันกากบาท",
      "thai": "สายเพลงดาบใหญ่",
      "icon": "sk_bk_crosscut",
      "iconUrl": "https://play.nightcamp.app/cas/0875e78d2158.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "พุ่งเข้าหาเป้าแล้วฟันไขว้ 2 ครั้ง ครั้งละ 100% ของ ATK ลงเลือด 2 ชั้น (15% ATK ต่อวิต่อชั้น 5 วิ สูงสุด 5 ชั้น) โทสะ +15 · Lv5 ฟันครั้งที่ 3 · Lv10 พุ่งทะลุ"
    },
    {
      "id": "bk_whirlwind",
      "name": "ดาบพายุหมุน",
      "thai": "สายเพลงดาบใหญ่",
      "icon": "sk_bk_whirlwind",
      "iconUrl": "https://play.nightcamp.app/cas/81f4db571b8f.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ฟันกากบาท Lv.3",
      "prereq": [
        {
          "skill": "bk_crosscut",
          "level": 3
        }
      ],
      "desc": "ใช้โทสะ 1 ช่อง หมุนดาบ 2.5 วิ ตีทุกตัวรอบตัว 5 ครั้งต่อวิ ครั้งละ 100% ของ ATK · Lv5 ดูดศัตรูเข้ามา · Lv10 ปิดด้วยฟันกวาด 300%"
    },
    {
      "id": "bk_guillotine",
      "name": "ฟันประหาร",
      "thai": "สายเพลงดาบใหญ่",
      "icon": "sk_bk_guillotine",
      "iconUrl": "https://play.nightcamp.app/cas/b0628ee50217.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ฟันกากบาท Lv.5",
      "prereq": [
        {
          "skill": "bk_crosscut",
          "level": 5
        }
      ],
      "desc": "ใช้โทสะทุกช่อง กระโดดสับลง 100% ของ ATK × 1 / 1.5 / 2.2 ตามช่อง · ศัตรูเลือดต่ำกว่า 30% หรือมึนโดนสองเท่า · ระเบิดเลือดไหลชั้นละ 60% · ฆ่าได้คืน 1 ช่องและคูลดาวน์ · แรงขึ้นตามช่องโทสะ ×1 / 1.5 / 2.2"
    },
    {
      "id": "bk_smash",
      "name": "ทุบสะสมพลัง",
      "thai": "สายทลายพสุธา",
      "icon": "sk_bk_smash",
      "iconUrl": "https://play.nightcamp.app/cas/d094c49c59aa.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "ง้างสะสมพลัง 0.7 วิ (อมตะระหว่างง้าง) แล้วทุบเป็นกรวย 100% ของ ATK ธาตุดิน โทสะ +16 · ค้อน: มึน 2 วิ · ขวาน: ลงเลือด 3 ชั้น · Lv10 แรงเพิ่ม 40% แลก HP 5%"
    },
    {
      "id": "bk_leap",
      "name": "กระโดดทุบธรณี",
      "thai": "สายทลายพสุธา",
      "icon": "sk_bk_leap",
      "iconUrl": "https://play.nightcamp.app/cas/973c96ee2205.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ทุบสะสมพลัง Lv.3",
      "prereq": [
        {
          "skill": "bk_smash",
          "level": 3
        }
      ],
      "desc": "ใช้โทสะทุกช่อง กระโดดไปไกล 350 ทุบลง 100% ของ ATK × ตามช่อง ศัตรูล้ม 1 วิ · 2 ช่องขึ้นไป: พื้นแตกสั่น 3 วิ ตีทุก 0.5 วิ 60% ศัตรูช้าลง · 2 ช่องขึ้นไป พื้นแตกสั่น 3 วิ"
    },
    {
      "id": "bk_hurl",
      "name": "ขว้างอาวุธ",
      "thai": "สายทลายพสุธา",
      "icon": "sk_bk_hurl",
      "iconUrl": "https://play.nightcamp.app/cas/8ca795190470.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ทุบสะสมพลัง Lv.1",
      "prereq": [
        {
          "skill": "bk_smash",
          "level": 1
        }
      ],
      "desc": "ขว้างอาวุธไป 500 แล้ววกกลับ โดนทั้งขาไปขากลับ ครั้งละ 100% ของ ATK โทสะ +12 · ขวาน: ลงเลือด · ค้อน: มึน 0.8 วิ และดึงศัตรูเข้ามา · ขวาน ลงเลือด · ค้อน มึนและดึง"
    },
    {
      "id": "bk_frenzy",
      "name": "เลือดเดือด",
      "thai": "สายโลหิตคลั่ง",
      "icon": "sk_bk_frenzy",
      "iconUrl": "https://play.nightcamp.app/cas/e45add3028b9.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "เร่งเพลงดาบ Lv.1",
      "prereq": [
        {
          "skill": "kn_quicken",
          "level": 1
        }
      ],
      "desc": "ตีเป้าเดิมติดกันได้ชั้นเลือดเดือด ชั้นละความเร็วโจมตี +2% สูงสุด 10 ชั้น คริ +0.5 · ครบ 10 ชั้น โอกาสตีเบิ้ล 16.8% · ค้อน: ทุก 4 ครั้งมึน 0.5 วิ · ขวาน: คริได้ชั้นเพิ่ม · ครบ 10 ชั้นตีเบิ้ล"
    },
    {
      "id": "bk_pact",
      "name": "สัญญาเลือด",
      "thai": "สายโลหิตคลั่ง",
      "icon": "sk_bk_pact",
      "iconUrl": "https://play.nightcamp.app/cas/d27a0e843eff.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "passive",
      "req": "เลือดเดือด Lv.3",
      "prereq": [
        {
          "skill": "bk_frenzy",
          "level": 3
        }
      ],
      "desc": "ATK +1% และความเร็วโจมตี +2% ทุก 3% ของ HP ที่หายไป (สูงสุด 25% / 50%) · Lv1 เลือดน้อยแรงขึ้น · Lv3 รอดตาย 1 ครั้งต่อ 60 วิ · Lv5 จ่าย HP แทนโทสะ ดูดเลือด"
    },
    {
      "id": "bk_titan",
      "name": "พิโรธไททัน",
      "thai": "สายโลหิตคลั่ง",
      "icon": "sk_bk_titan",
      "iconUrl": "https://play.nightcamp.app/cas/98cc5b761a1b.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "buff",
      "req": "ฟันประหาร Lv.5 หรือ กระโดดทุบธรณี Lv.5",
      "reqAny": true,
      "prereq": [
        {
          "skill": "bk_guillotine",
          "level": 5
        },
        {
          "skill": "bk_leap",
          "level": 5
        }
      ],
      "desc": "ใช้โทสะทั้งหมด (อย่างน้อย 1 ช่อง) ตัวโตเป็นยักษ์ 6 วิ + 2 วิต่อช่อง รับดาเมจลด 25% ศัตรูรอบตัวช้าลง ตีปกติส่งคลื่นกระแทก 100% ของ ATK · ท่าปิดไม่ใช้โทสะและนับเป็น 3 ช่อง · จบแล้วระเบิด 400% และ 8 วิไม่ได้โทสะ · ร่างยักษ์ ตีปกติส่งคลื่นกระแทก"
    },
    {
      "id": "bk_warcry",
      "name": "คำรามศึก",
      "thai": "สายจ่าฝูง",
      "icon": "sk_bk_warcry",
      "iconUrl": "https://play.nightcamp.app/cas/f780e7bc7fe4.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "buff",
      "desc": "20 วิ: ทีม ATK +6% · ตัวเองความเร็วโจมตี +1% · โทสะ +30 · ศัตรูรอบตัวรับดาเมจ +15% 6 วิ"
    },
    {
      "id": "bk_roar",
      "name": "คำรามท้ารบ",
      "thai": "สายจ่าฝูง",
      "icon": "sk_bk_roar",
      "iconUrl": "https://play.nightcamp.app/cas/d7512050d97a.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "คำรามศึก Lv.3",
      "prereq": [
        {
          "skill": "bk_warcry",
          "level": 3
        }
      ],
      "desc": "ดึงศัตรูรอบตัว 320 เข้ามา มันตีเบาลง 20% 4 วิ · ต่อตัวที่ดึงได้ รับดาเมจลด 4% (สูงสุด 20%) 6 วิ และโทสะ +5 · ดึงศัตรูแล้วรับดาเมจลดลง"
    }
  ],
  "firemage": [
    {
      "id": "fm_pillar",
      "name": "เสาเพลิง",
      "thai": "สายนรกเพลิง",
      "icon": "sk_am_firepillar",
      "iconUrl": "https://play.nightcamp.app/cas/60bab36df68f.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "weaponBonus": "คทา (ปะทุ 4 ครั้ง)",
      "desc": "เสาไฟปะทุใต้ศัตรู 3 ครั้ง (ถือคทา 4 ครั้ง) ครั้งละ 100% ของ MATK ความร้อน +8 · Lv5 ตัวที่เผาอยู่โดนเพิ่ม 20% · Lv10 ทิ้งพื้นไฟ 3 วิ"
    },
    {
      "id": "fm_sea",
      "name": "ทะเลเพลิง",
      "thai": "สายนรกเพลิง",
      "icon": "sk_am_inferno",
      "iconUrl": "https://play.nightcamp.app/cas/28fb6f17f959.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "เสาเพลิง Lv.3",
      "weaponBonus": "คทา (ร่ายเร็วขึ้น 15%)",
      "prereq": [
        {
          "skill": "fm_pillar",
          "level": 3
        }
      ],
      "desc": "ทะเลเพลิงรัศมี 320 นาน 6 วิ ทุกครึ่งวิ 100% ของ MATK มีโอกาสติดเผา ความร้อน +20 · Lv5 ศัตรูในทะเลเพลิงช้าลง · Lv10 ไฟลามตามตัวที่หนี"
    },
    {
      "id": "fm_ring",
      "name": "วงแหวนเพลิง",
      "thai": "สายนรกเพลิง",
      "icon": "sk_fm_ring",
      "iconUrl": "https://play.nightcamp.app/cas/ab1adaa6a490.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "กำแพงไฟ Lv.3",
      "prereq": [
        {
          "skill": "mg_firewall",
          "level": 3
        }
      ],
      "desc": "วงแหวนไฟรอบตัว 4 วิ ศัตรูที่ผ่านโดน 100% ของ MATK และถูกผลักออก ความร้อน +12 · Lv5 วงแหวนขยายออกเรื่อย ๆ · Lv10 วงแหวน 2 ชั้น"
    },
    {
      "id": "fm_master",
      "name": "ปรมาจารย์เพลิง",
      "thai": "สายนรกเพลิง",
      "icon": "sk_am_infernomastery",
      "iconUrl": "https://play.nightcamp.app/cas/f0093bbd9cb4.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ใจเพลิง Lv.5",
      "prereq": [
        {
          "skill": "mg_fireheart",
          "level": 5
        }
      ],
      "desc": "เผาซ้อนได้ 8 ชั้น · Lv1 เผาซ้อน 8 ชั้น · Lv5 เผาครบ 8 ชั้นระเบิดเอง"
    },
    {
      "id": "fm_gauge",
      "name": "แถบความร้อน",
      "thai": "สายความร้อน",
      "icon": "sk_fm_gauge",
      "iconUrl": "https://play.nightcamp.app/cas/35585acdae5e.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "passive",
      "desc": "ร่ายสกิลไฟได้ความร้อน 0–100 ทุก 10 ความร้อน ดาเมจไฟ +0.6% · เกิน 80 ฟื้น HP 1% ต่อวิ · ไม่ร่ายไฟ 3 วิ ความร้อนลดวิละ 10 · Lv5 ความร้อนลดช้าลงครึ่งหนึ่ง · Lv10 ที่ 100 ความร้อน ร่ายไฟไม่ใช้ SP"
    },
    {
      "id": "fm_vent",
      "name": "ระบายความร้อน",
      "thai": "สายความร้อน",
      "icon": "sk_fm_vent",
      "iconUrl": "https://play.nightcamp.app/cas/a62c4c67c21e.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "แถบความร้อน Lv.2",
      "prereq": [
        {
          "skill": "fm_gauge",
          "level": 2
        }
      ],
      "desc": "ปล่อยความร้อนทั้งหมดเป็นระเบิดรอบตัว MATK 4.7% × ความร้อน (ตอนนี้ 0) ผลักศัตรูออก · Lv5 ที่ 100 ความร้อนทิ้งวงไฟ 4 วิ · Lv10 ระบายแล้วร่ายเร็วขึ้น 30% 5 วิ"
    },
    {
      "id": "fm_forge",
      "name": "หัวใจเตาหลอม",
      "thai": "สายความร้อน",
      "icon": "sk_fm_forge",
      "iconUrl": "https://play.nightcamp.app/cas/280feffcf07e.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "desc": "HP สูงสุด +1.5% · ร่ายเร็วขึ้น 0.25% ต่อ VIT 1"
    },
    {
      "id": "fm_orbfire",
      "name": "ลูกไฟตีปกติ",
      "thai": "สายลูกไฟรัว",
      "icon": "sk_fm_orbfire",
      "iconUrl": "https://play.nightcamp.app/cas/05c5ca53a373.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ชำนาญคทา Lv.1",
      "weaponReq": "ออร์บ",
      "prereq": [
        {
          "skill": "mg_staffmastery",
          "level": 1
        }
      ],
      "desc": "ถือออร์บ: ตีปกติเป็นลูกไฟ MATK +3% โอกาสติดเผาเพิ่ม 5% ต่อครั้ง ความร้อน +2 ต่อครั้ง · ถือออร์บเท่านั้น"
    },
    {
      "id": "fm_spread",
      "name": "ไฟลาม",
      "thai": "สายลูกไฟรัว",
      "icon": "sk_fm_spread",
      "iconUrl": "https://play.nightcamp.app/cas/43e840bee444.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ลูกไฟตีปกติ Lv.3",
      "weaponReq": "ออร์บ",
      "prereq": [
        {
          "skill": "fm_orbfire",
          "level": 3
        }
      ],
      "desc": "ถือออร์บ: ตัวที่ติดเผาตาย ไฟกระโดดไปตัวใกล้ 1 ตัว พร้อมชั้นเผาครึ่งหนึ่ง · Lv5 กระโดด 2 ตัว · Lv10 3 ตัว"
    },
    {
      "id": "fm_seek",
      "name": "เพลิงตามติด",
      "thai": "สายลูกไฟรัว",
      "icon": "sk_fm_seek",
      "iconUrl": "https://play.nightcamp.app/cas/93f45c4e9cf2.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "buff",
      "req": "ลูกไฟตีปกติ Lv.5",
      "weaponReq": "ออร์บ",
      "prereq": [
        {
          "skill": "fm_orbfire",
          "level": 5
        }
      ],
      "desc": "20 วิ: ลูกไฟตีปกติโดนแล้วแตกเป็นลูกเล็ก 3 ลูกวิ่งหาเป้าเอง ลูกละ 15% ของ MATK · Lv5 ลูกเล็กแรงขึ้น"
    },
    {
      "id": "fm_meteor",
      "name": "อุกกาบาตถล่ม",
      "thai": "สายอุกกาบาตถล่ม",
      "icon": "sk_fm_meteor",
      "iconUrl": "https://play.nightcamp.app/cas/afecef76d46a.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "ult": true,
      "req": "ทะเลเพลิง Lv.5 หรือ ระบายความร้อน Lv.5",
      "reqAny": true,
      "prereq": [
        {
          "skill": "fm_sea",
          "level": 5
        },
        {
          "skill": "fm_vent",
          "level": 5
        }
      ],
      "desc": "อุกกาบาต 16 ลูกร่วงใส่วงใหญ่ 3 วิ 4 ลูกพุ่งใส่ศัตรูในวง ลูกละ 100% ของ MATK วงระเบิดใหญ่ · ร่ายตอนความร้อน 100 ได้ลูกยักษ์เพิ่ม 1 ลูก (×3.2)"
    }
  ],
  "icemage": [
    {
      "id": "im_blizzard",
      "name": "พายุหิมะ",
      "thai": "สายธารน้ำแข็ง",
      "icon": "sk_am_blizzard",
      "iconUrl": "https://play.nightcamp.app/cas/9d12195f6a05.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "weaponBonus": "คทา (วงใหญ่ขึ้น 30%)",
      "desc": "พายุหิมะ 5 วิที่เมาส์ วิละ 100% ของ MATK มีโอกาสเย็นเฉียบทุกวิ ศัตรูช้า · ถือคทา: วงใหญ่ขึ้น 30% · Lv10 พายุตามเป้าหมาย"
    },
    {
      "id": "im_lance",
      "name": "หอกธารน้ำแข็ง",
      "thai": "สายธารน้ำแข็ง",
      "icon": "sk_am_glacial",
      "iconUrl": "https://play.nightcamp.app/cas/81396cbe0be8.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "หอกน้ำแข็ง Lv.5",
      "weaponBonus": "คทา (แรงขึ้น 10%)",
      "prereq": [
        {
          "skill": "frostdiver",
          "level": 5
        }
      ],
      "desc": "หอกน้ำแข็งยักษ์พุ่งทะลุทั้งแนว 100% ของ MATK ตัวที่แข็งอยู่โดนสองเท่า · ตัวที่แข็งโดนสองเท่า"
    },
    {
      "id": "im_aura",
      "name": "ลมหนาวรอบตัว",
      "thai": "สายธารน้ำแข็ง",
      "icon": "sk_im_aura",
      "iconUrl": "https://play.nightcamp.app/cas/a3988a797784.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "passive",
      "desc": "ศัตรูที่อยู่ใกล้เราในระยะ 200 ช้าลง · เย็นเฉียบ 1 ชั้นทุก 5 วิ"
    },
    {
      "id": "im_zero",
      "name": "ศูนย์สัมบูรณ์",
      "thai": "สายธารน้ำแข็ง",
      "icon": "sk_am_absolutezero",
      "iconUrl": "https://play.nightcamp.app/cas/5890430c8e94.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ใจน้ำแข็ง Lv.3",
      "prereq": [
        {
          "skill": "mg_iceheart",
          "level": 3
        }
      ],
      "desc": "เย็นเฉียบครบ 3 ชั้นแล้วแข็ง (ตัวที่เพิ่งละลายต้านทาน 4 วิ) · Lv1 เย็นเฉียบครบ 3 ชั้นแล้วแข็ง · Lv3 แข็งนานขึ้น 1 วิ · Lv5 บอสแข็งได้"
    },
    {
      "id": "im_shatter",
      "name": "ทุบน้ำแข็ง",
      "thai": "สายแตกกระจาย",
      "icon": "sk_im_shatter",
      "iconUrl": "https://play.nightcamp.app/cas/30b0e9683106.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "passive",
      "desc": "สกิลโดนตัวที่แข็งอยู่ มันแตกกระจาย ดาเมจเพิ่ม 68% ของ MATK เศษน้ำแข็ง 4 ชิ้นกระเด็นไปแช่ตัวข้าง ๆ · Lv5 เศษ 6 ชิ้น · Lv10 แตกต่อเป็นลูกโซ่"
    },
    {
      "id": "im_breath",
      "name": "ลมหายใจเยือกแข็ง",
      "thai": "สายแตกกระจาย",
      "icon": "sk_im_breath",
      "iconUrl": "https://play.nightcamp.app/cas/27d91b472aa1.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ทุบน้ำแข็ง Lv.2",
      "prereq": [
        {
          "skill": "im_shatter",
          "level": 2
        }
      ],
      "desc": "พ่นลมหนาวเป็นกรวย 2 วิ วิละ 68% ของ MATK เย็นเฉียบ 2 ชั้นต่อวิ"
    },
    {
      "id": "im_burst",
      "name": "ผลึกระเบิด",
      "thai": "สายแตกกระจาย",
      "icon": "sk_im_burst",
      "iconUrl": "https://play.nightcamp.app/cas/13d9fb7d2cea.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ทุบน้ำแข็ง Lv.5",
      "prereq": [
        {
          "skill": "im_shatter",
          "level": 5
        }
      ],
      "desc": "ทุบทุกตัวที่แข็งอยู่ในจอให้แตกพร้อมกัน ตัวละ 100% ของ MATK · Lv10 ฆ่าได้คืน SP 0.5 ต่อตัว"
    },
    {
      "id": "im_armor",
      "name": "เกราะน้ำแข็ง",
      "thai": "สายปราการน้ำแข็ง",
      "icon": "sk_im_armor",
      "iconUrl": "https://play.nightcamp.app/cas/d65479f5b55d.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "buff",
      "weaponBonus": "โล่ (เกราะหนาขึ้น 40%)",
      "desc": "60 วิ: เกราะดูดซับดาเมจ 175% ของ MATK คนที่ตีเราประชิดติดเย็นเฉียบ · ถือโล่: เกราะหนาขึ้น 40% · Lv5 เกราะแตกแล้วระเบิดแช่รอบตัว · Lv10 เกราะฟื้นเองทุก 20 วิ"
    },
    {
      "id": "im_wall",
      "name": "กำแพงน้ำแข็ง",
      "thai": "สายปราการน้ำแข็ง",
      "icon": "sk_im_wall",
      "iconUrl": "https://play.nightcamp.app/cas/09e522a3eafa.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "เกราะน้ำแข็ง Lv.3",
      "prereq": [
        {
          "skill": "im_armor",
          "level": 3
        }
      ],
      "desc": "กำแพงน้ำแข็งยาว 300 นาน 6.5 วิ ขวางศัตรูไม่ให้ผ่าน · Lv10 กำแพงแตกแล้วเศษแช่ศัตรูรอบ ๆ"
    },
    {
      "id": "im_winter",
      "name": "ใจเหมันต์",
      "thai": "สายปราการน้ำแข็ง",
      "icon": "sk_im_winter",
      "iconUrl": "https://play.nightcamp.app/cas/4286f8ee66dd.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ชำนาญคทา Lv.1",
      "weaponReq": "ออร์บ",
      "prereq": [
        {
          "skill": "mg_staffmastery",
          "level": 1
        }
      ],
      "desc": "ถือออร์บ: DEF +2 MDEF +1 ตีปกติเป็นเกล็ดน้ำแข็ง MATK +6% โอกาสเย็นเฉียบเพิ่ม 5% · ถือออร์บเท่านั้น"
    },
    {
      "id": "im_iceage",
      "name": "ยุคน้ำแข็ง",
      "thai": "สายยุคน้ำแข็ง",
      "icon": "sk_im_iceage",
      "iconUrl": "https://play.nightcamp.app/cas/1be61396f50e.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "ult": true,
      "req": "ผลึกระเบิด Lv.5 หรือ เกราะน้ำแข็ง Lv.5",
      "reqAny": true,
      "prereq": [
        {
          "skill": "im_burst",
          "level": 5
        },
        {
          "skill": "im_armor",
          "level": 5
        }
      ],
      "desc": "ทั้งจอหนาวจัด 8 วิ ศัตรูทุกตัวเย็นเฉียบทุกวิ (100% ของ MATK) ตัวที่แข็งแตกกระจายเองทุก 2 วิ · พื้นที่เหลือ 50% ของเดิม"
    }
  ],
  "bard": [
    {
      "id": "bd_tempo",
      "name": "เพลงเร่งจังหวะ",
      "thai": "สายเพลงรอบกองไฟ",
      "icon": "sk_bd_tempo",
      "iconUrl": "https://play.nightcamp.app/cas/4ce4fb542c27.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "buff",
      "weaponReq": "เครื่องดนตรี",
      "desc": "เล่นต่อเนื่อง (SP 2/วิ) รัศมี 450: ตัวเองความเร็วโจมตี +1% เพื่อนตีแรงขึ้น 1% คูณท่อน (ท่อนขึ้นทุก 5 วิ ×1 / ×1.5 / ×2) · กดอีกครั้ง = ท่อนฮุก: ตัวเองตีปกติ 3 ครั้งถัดไปคริแน่นอน เพื่อนตีแรงขึ้น 30% 4 วิ · ท่อนขึ้นทุก 5 วิ แรง ×1 / ×1.5 / ×2 · กดซ้ำตอนท่อน 2 ขึ้นไป = ท่อนฮุก"
    },
    {
      "id": "bd_warm",
      "name": "เพลงอุ่นไอไฟ",
      "thai": "สายเพลงรอบกองไฟ",
      "icon": "sk_bd_warm",
      "iconUrl": "https://play.nightcamp.app/cas/003823366feb.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "buff",
      "req": "เพลงเร่งจังหวะ Lv.3",
      "weaponReq": "เครื่องดนตรี",
      "prereq": [
        {
          "skill": "bd_tempo",
          "level": 3
        }
      ],
      "desc": "เล่นต่อเนื่อง: ทั้งทีมฟื้น HP 0.6% ทุก 5 วิ คูณท่อน · ท่อนฮุก: ฮีลทั้งทีม 17% คูณท่อน · ท่อนฮุกฮีลทั้งทีม"
    },
    {
      "id": "bd_stars",
      "name": "เพลงดาวค้างฟ้า",
      "thai": "สายเพลงรอบกองไฟ",
      "icon": "sk_bd_stars",
      "iconUrl": "https://play.nightcamp.app/cas/cebbd934e2bd.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "buff",
      "req": "เพลงเร่งจังหวะ Lv.3",
      "weaponReq": "เครื่องดนตรี",
      "prereq": [
        {
          "skill": "bd_tempo",
          "level": 3
        }
      ],
      "desc": "เล่นต่อเนื่อง: ตัวเองเวลาร่าย −2% คูลดาวน์ −1% คูณท่อน · ท่อนฮุก: สกิลที่เหลือคูลดาวน์นานที่สุดลดลง 30% · ท่อนฮุกลดคูลดาวน์สกิลที่นานที่สุด 30%"
    },
    {
      "id": "bd_band",
      "name": "วงดนตรี",
      "thai": "สายเพลงรอบกองไฟ",
      "icon": "sk_bd_band",
      "iconUrl": "https://play.nightcamp.app/cas/bc8859db10cf.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "passive",
      "req": "เพลงอุ่นไอไฟ Lv.3",
      "weaponReq": "เครื่องดนตรี",
      "prereq": [
        {
          "skill": "bd_warm",
          "level": 3
        }
      ],
      "desc": "หยุดเล่นแล้วเพลงค้างอีก 3 วิ · Lv1 เพลงค้าง 3 วิ · Lv3 เดินได้ปกติ · Lv5 เล่น 2 เพลงพร้อมกัน · INT เพิ่มผลเพลง"
    },
    {
      "id": "bd_twirl",
      "name": "ระบำควงไฟ",
      "thai": "สายระบำไฟ",
      "icon": "sk_bd_twirl",
      "iconUrl": "https://play.nightcamp.app/cas/cc136ff0617b.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "weaponReq": "แส้",
      "desc": "ควงแส้ปลายไฟรอบตัว 2 วิ ทุก 0.25 วิ 100% ของ ATK มีโอกาสติดเผา 35% · พื้นที่ 200% ของเดิม"
    },
    {
      "id": "bd_firefly",
      "name": "ระบำหิ่งห้อย",
      "thai": "สายระบำไฟ",
      "icon": "sk_bd_firefly",
      "iconUrl": "https://play.nightcamp.app/cas/8c570d4306cf.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "buff",
      "req": "ระบำควงไฟ Lv.3",
      "weaponReq": "แส้",
      "prereq": [
        {
          "skill": "bd_twirl",
          "level": 3
        }
      ],
      "desc": "รำต่อเนื่อง (SP 2/วิ) รัศมี 400: หิ่งห้อยล้อมศัตรู เดินช้าลง ตีเบาลง 2% คูณท่อน · ท่อนยิ่งสูงยิ่งแรง"
    },
    {
      "id": "bd_lure",
      "name": "ระบำหลอกล่อ",
      "thai": "สายระบำไฟ",
      "icon": "sk_bd_lure",
      "iconUrl": "https://play.nightcamp.app/cas/242a426e953d.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "buff",
      "req": "ระบำควงไฟ Lv.3",
      "weaponReq": "แส้",
      "prereq": [
        {
          "skill": "bd_twirl",
          "level": 3
        }
      ],
      "desc": "รำต่อเนื่อง: ศัตรูรอบตัวตีเบาลง 1.5% รับดาเมจเพิ่ม 1% คูณท่อน และศัตรูที่ยังไม่มีเป้าหันมาตามผู้รำ · ศัตรูหันมาตามผู้รำ"
    },
    {
      "id": "bd_lash",
      "name": "ฟาดแส้ดึง",
      "thai": "สายระบำไฟ",
      "icon": "sk_bd_lash",
      "iconUrl": "https://play.nightcamp.app/cas/2f21e6d8584c.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "ระบำควงไฟ Lv.1",
      "weaponReq": "แส้",
      "prereq": [
        {
          "skill": "bd_twirl",
          "level": 1
        }
      ],
      "desc": "ฟาดแส้ยาว 320 100% ของ ATK ดึงศัตรูเข้าหา"
    },
    {
      "id": "bd_note",
      "name": "โน้ตเด้ง",
      "thai": "สายโน้ตดนตรี",
      "icon": "sk_bd_note",
      "iconUrl": "https://play.nightcamp.app/cas/cd55a52398a9.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ยิงคู่ Lv.3",
      "weaponReq": "เครื่องดนตรี หรือ แส้",
      "prereq": [
        {
          "skill": "double",
          "level": 3
        }
      ],
      "desc": "ยิงตัวโน้ตที่เด้งไปอีก 2 ตัว ตัวละ 100% ของ ATK · เด้งต่อ 2 ตัว"
    },
    {
      "id": "bd_noterain",
      "name": "ฝนโน้ต",
      "thai": "สายโน้ตดนตรี",
      "icon": "sk_bd_noterain",
      "iconUrl": "https://play.nightcamp.app/cas/cebf0c335295.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "โน้ตเด้ง Lv.3",
      "weaponReq": "เครื่องดนตรี หรือ แส้",
      "prereq": [
        {
          "skill": "bd_note",
          "level": 3
        }
      ],
      "desc": "ตัวโน้ต 6 ตัวตกใส่วง ตัวละ 100% ของ ATK · ท่อนเพลงยิ่งสูงยิ่งตกเพิ่ม (+2 ต่อท่อน)"
    },
    {
      "id": "bd_groove",
      "name": "จังหวะเร้าใจ",
      "thai": "สายโน้ตดนตรี",
      "icon": "sk_bd_groove",
      "iconUrl": "https://play.nightcamp.app/cas/fbfa6bb84d32.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "passive",
      "req": "โน้ตเด้ง Lv.5",
      "prereq": [
        {
          "skill": "bd_note",
          "level": 5
        }
      ],
      "desc": "ระหว่างเล่นหรือรำ ตีปกติ 4% ยิงโน้ตเด้งฟรี · ระหว่างเล่นหรือรำเท่านั้น"
    },
    {
      "id": "bd_festival",
      "name": "มหกรรมรอบกองไฟ",
      "thai": "สายมหกรรมรอบกองไฟ",
      "icon": "sk_bd_festival",
      "iconUrl": "https://play.nightcamp.app/cas/bda539ecf9b5.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "ult": true,
      "req": "วงดนตรี Lv.1 หรือ ระบำหลอกล่อ Lv.5",
      "reqAny": true,
      "weaponReq": "เครื่องดนตรี หรือ แส้",
      "prereq": [
        {
          "skill": "bd_band",
          "level": 1
        },
        {
          "skill": "bd_lure",
          "level": 5
        }
      ],
      "desc": "จุดกองไฟใหญ่ 15 วิ เพลงของเราแรงเป็นสองเท่าตอนอยู่ใกล้กองไฟ เพื่อนใกล้กองไฟตีแรงขึ้น 25% ศัตรูที่เข้าใกล้ติดเผาวิละ 100% ของ ATK และหลับ 2 วิครั้งแรก · ทุกเพลงที่เรียนไว้ที่ท่อน 3"
    }
  ],
  "gunslinger": [
    {
      "id": "gs_spin",
      "name": "หมุนโม่",
      "thai": "สายโม่เสี่ยงดวง",
      "icon": "sk_gs_spin",
      "iconUrl": "https://play.nightcamp.app/cas/70c4c89b42b2.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ตาเหยี่ยว Lv.1",
      "prereq": [
        {
          "skill": "ar_owl",
          "level": 1
        }
      ],
      "desc": "หมุนโม่: นัดถัดไปสุ่ม 1 ใน 6 แรง ×3 · ระเบิดเป็นวง · ธาตุไฟ ×2 · ฟื้น HP 5% · ยิงทะลุ · ด้าน (ไม่ออก) · โอกาสด้าน 17% · Lv10 ไม่ออกด้านเลย"
    },
    {
      "id": "gs_sixth",
      "name": "นัดที่หก",
      "thai": "สายโม่เสี่ยงดวง",
      "icon": "sk_gs_sixth",
      "iconUrl": "https://play.nightcamp.app/cas/6ab1d9551745.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "weaponReq": "ปืนพกคู่ หรือ ลูกซอง",
      "desc": "ทุกนัดที่ 6 ของลูกโม่คริแน่นอนและแรงขึ้น 5% · ทุกนัดที่ 6 คริแน่นอน"
    },
    {
      "id": "gs_special",
      "name": "บรรจุกระสุนพิเศษ",
      "thai": "สายโม่เสี่ยงดวง",
      "icon": "sk_gs_special",
      "iconUrl": "https://play.nightcamp.app/cas/44c6c00b26b9.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "หมุนโม่ Lv.3",
      "prereq": [
        {
          "skill": "gs_spin",
          "level": 3
        }
      ],
      "desc": "บรรจุใหม่ทันที 6 นัดเป็นกระสุนธาตุ (ไฟ น้ำแข็ง สายฟ้า สลับกันทุกครั้งที่บรรจุ) แรงขึ้น 14% มีโอกาสติดสถานะของธาตุ · ธาตุสลับไฟ น้ำแข็ง สายฟ้า"
    },
    {
      "id": "gs_eye",
      "name": "สายตานักแม่นปืน",
      "thai": "สายโม่เสี่ยงดวง",
      "icon": "sk_gs_eye",
      "iconUrl": "https://play.nightcamp.app/cas/f710a8a8d569.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ตาเหยี่ยว Lv.3",
      "weaponReq": "ปืนพกคู่ หรือ ลูกซอง",
      "prereq": [
        {
          "skill": "ar_owl",
          "level": 3
        }
      ],
      "desc": "ถือปืน: คริ +1 ความแม่น +3"
    },
    {
      "id": "gs_mastery",
      "name": "ชำนาญปืนพก",
      "thai": "สายปืนพกคู่",
      "icon": "sk_gs_mastery",
      "iconUrl": "https://play.nightcamp.app/cas/2a12d21cfcd3.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "weaponReq": "ปืนพกคู่",
      "desc": "ถือปืนพก: ความเร็วโจมตี +1.5% บรรจุกระสุนเร็วขึ้น 5% · บรรจุเร็วขึ้น"
    },
    {
      "id": "gs_rapid",
      "name": "ลั่นไกรัว",
      "thai": "สายปืนพกคู่",
      "icon": "sk_gs_rapid",
      "iconUrl": "https://play.nightcamp.app/cas/1b65ff89c32d.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ชำนาญปืนพก Lv.3",
      "weaponReq": "ปืนพกคู่",
      "prereq": [
        {
          "skill": "gs_mastery",
          "level": 3
        }
      ],
      "desc": "ถือปืนพก: ยิงปกติ 4% ยิงซ้ำอีกนัดฟรี (90% ไม่กินกระสุน) · นัดฟรีไม่กินกระสุน"
    },
    {
      "id": "gs_triple",
      "name": "รัวค้อนปืน",
      "thai": "สายปืนพกคู่",
      "icon": "sk_gs_triple",
      "iconUrl": "https://play.nightcamp.app/cas/2199e78502fd.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "weaponReq": "ปืนพกคู่",
      "desc": "ยิงกระสุนที่เหลือในลูกโม่ออกหมดรวดเดียว นัดละ 100% ของ ATK แล้วบรรจุใหม่ · ทุกนัดได้ผลกระสุนพิเศษและนัดที่หก หมุนโม่ได้นัดแรก · ยิงกระสุนที่เหลือทั้งหมด · Lv5 บรรจุเร็วขึ้น · Lv10 ลูกโม่เต็มนัดสุดท้าย ×2"
    },
    {
      "id": "gs_ricochet",
      "name": "กระสุนสะท้อน",
      "thai": "สายปืนพกคู่",
      "icon": "sk_gs_ricochet",
      "iconUrl": "https://play.nightcamp.app/cas/f03354a9de93.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "รัวค้อนปืน Lv.5",
      "weaponReq": "ปืนพกคู่",
      "prereq": [
        {
          "skill": "gs_triple",
          "level": 5
        }
      ],
      "desc": "กระสุนเด้งต่อ 3 ตัว นัดละ 100% ของ ATK · เด้งเพิ่มทุก 2 เลเวล"
    },
    {
      "id": "gs_buckshot",
      "name": "ลูกปรายกระจาย",
      "thai": "สายลูกซอง",
      "icon": "sk_gs_buckshot",
      "iconUrl": "https://play.nightcamp.app/cas/b54fa94f2802.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "weaponReq": "ลูกซอง",
      "desc": "ยิงกรวย 9 ลูกปรายทะลุทุกตัวในแนว ระยะ 350 ลูกละ 100% ของ ATK · ใกล้ยิ่งโดนหลายลูก"
    },
    {
      "id": "gs_kick",
      "name": "ถีบถอย",
      "thai": "สายลูกซอง",
      "icon": "sk_gs_kick",
      "iconUrl": "https://play.nightcamp.app/cas/be6996a02dd7.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "ลูกปรายกระจาย Lv.3",
      "weaponReq": "ลูกซอง",
      "prereq": [
        {
          "skill": "gs_buckshot",
          "level": 3
        }
      ],
      "desc": "ยิงกระแทกระยะใกล้ 100% ของ ATK ผลักศัตรูกระเด็น เราถีบตัวถอยหลัง 200 · เราถอยหลัง 200"
    },
    {
      "id": "gs_smoke",
      "name": "ระเบิดควัน",
      "thai": "สายลูกซอง",
      "icon": "sk_gs_smoke",
      "iconUrl": "https://play.nightcamp.app/cas/6c7010212e4b.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "desc": "ขว้างระเบิดควันวง 220 100% ของ ATK ธาตุไฟ ศัตรูในควันตีเบาลง 30% นาน 4 วิ (ใช้ได้ทุกอาวุธ)"
    },
    {
      "id": "gs_stars",
      "name": "ยิงดาวตก",
      "thai": "สายยิงดาวตก",
      "icon": "sk_gs_stars",
      "iconUrl": "https://play.nightcamp.app/cas/367b0b4e6cef.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "ult": true,
      "req": "กระสุนสะท้อน Lv.3 หรือ ถีบถอย Lv.3",
      "reqAny": true,
      "weaponReq": "ปืนพกคู่ หรือ ลูกซอง",
      "prereq": [
        {
          "skill": "gs_ricochet",
          "level": 3
        },
        {
          "skill": "gs_kick",
          "level": 3
        }
      ],
      "desc": "ยิงขึ้นฟ้า 1 นัด อีก 1 วิดาวตก 12 ดวงร่วงรอบเป้า ดวงละ 100% ของ ATK"
    }
  ],
  "reaper": [
    {
      "id": "rp_souls",
      "name": "เก็บวิญญาณ",
      "thai": "สายดวงวิญญาณ",
      "icon": "sk_rp_souls",
      "iconUrl": "https://play.nightcamp.app/cas/894eb61b146e.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "desc": "ตีติดรอย (ตีปกติ 1 สกิล 2) ครบ 5 รอยวิญญาณสุก 3 วิ ตีอีกครั้งเกี่ยวได้ 1 ดวง (สุกซ้ำได้หลัง 6 วิ บอส 3 วิ) ตัวที่สุกล้มทิ้งวิญญาณบนพื้น 4 วิ เก็บได้ในระยะ 400 · เก็บได้ 20 ดวง ดวงละ ATK +1.2% ดูดเลือด 0.1% · ตีครบ 5 รอยวิญญาณสุก ตีอีกครั้งเกี่ยว · Lv5 สุกนานขึ้น · Lv10 ครบ 20 ดวง ตีเร็วขึ้น 20%"
    },
    {
      "id": "rp_ghost",
      "name": "ร่างวิญญาณ",
      "thai": "สายดวงวิญญาณ",
      "icon": "sk_rp_ghost",
      "iconUrl": "https://play.nightcamp.app/cas/dc54da3676ec.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "เก็บวิญญาณ Lv.3",
      "prereq": [
        {
          "skill": "rp_souls",
          "level": 3
        }
      ],
      "desc": "ใช้ 3 ดวง: กลายเป็นผี พุ่งทะลุศัตรูเป็นแนว 350 100% ของ ATK ไม่โดนตีระหว่างนั้น · Lv5 ทิ้งรอยหนาว · Lv10 ใช้แค่ 2 ดวง"
    },
    {
      "id": "rp_shroud",
      "name": "ผ้าคลุมแห่งความตาย",
      "thai": "สายดวงวิญญาณ",
      "icon": "sk_rp_shroud",
      "iconUrl": "https://play.nightcamp.app/cas/6bb7daf5ea0d.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "buff",
      "req": "เก็บวิญญาณ Lv.3",
      "prereq": [
        {
          "skill": "rp_souls",
          "level": 3
        }
      ],
      "desc": "30 วิ: รับดาเมจลดลง 1% ต่อดวงวิญญาณที่มี (สูงสุด 25%)"
    },
    {
      "id": "rp_death",
      "name": "ความตายเยือน",
      "thai": "สายดวงวิญญาณ",
      "icon": "sk_rp_death",
      "iconUrl": "https://play.nightcamp.app/cas/4a442c36feca.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "passive",
      "req": "เก็บวิญญาณ Lv.5",
      "prereq": [
        {
          "skill": "rp_souls",
          "level": 5
        }
      ],
      "desc": "ศัตรูเลือดต่ำกว่า 20% โดนเราแรงขึ้น 15% · Lv1 ศัตรูเลือดน้อยโดนแรงขึ้น · Lv3 ศัตรูเลือดน้อยวิญญาณสุกทันที · Lv5 ล้มแล้วลุกเป็นร่างวิญญาณ"
    },
    {
      "id": "rp_scythemastery",
      "name": "ชำนาญเคียวใหญ่",
      "thai": "สายเคียวเก็บเกี่ยว",
      "icon": "sk_rp_scythemastery",
      "iconUrl": "https://play.nightcamp.app/cas/97fb8d2fd49b.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "weaponReq": "เคียวใหญ่",
      "desc": "ถือเคียวใหญ่: ตีปกติกวาดกว้างโดนทุกตัวข้างหน้า ATK +2%"
    },
    {
      "id": "rp_sweep",
      "name": "ฟันเก็บเกี่ยว",
      "thai": "สายเคียวเก็บเกี่ยว",
      "icon": "sk_rp_sweep",
      "iconUrl": "https://play.nightcamp.app/cas/47b77b42b44b.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "weaponReq": "เคียวใหญ่",
      "desc": "หมุนเคียวรอบตัว 2 รอบ รอบละ 100% ของ ATK ดูดเลือด 5% ของดาเมจ · Lv5 ดึงเข้ากลาง · Lv10 โดน 3 ตัวได้วิญญาณ"
    },
    {
      "id": "rp_execute",
      "name": "ประหารใต้จันทร์",
      "thai": "สายเคียวเก็บเกี่ยว",
      "icon": "sk_rp_execute",
      "iconUrl": "https://play.nightcamp.app/cas/ce9755ff7b30.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ฟันเก็บเกี่ยว Lv.5",
      "weaponReq": "เคียวใหญ่",
      "prereq": [
        {
          "skill": "rp_sweep",
          "level": 5
        }
      ],
      "desc": "ฟันลงจากฟ้า 100% ของ ATK · ศัตรูธรรมดาที่เลือดต่ำกว่า 30% ตายทันที บอสโดนสองเท่าแทน · ตายทันทีต่ำกว่า 30% (ศัตรูธรรมดา)"
    },
    {
      "id": "rp_twin",
      "name": "เคียวคู่ประสาน",
      "thai": "สายเคียวคู่หมุนวน",
      "icon": "sk_rp_twin",
      "iconUrl": "https://play.nightcamp.app/cas/6e3643953216.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ชำนาญมีด Lv.3",
      "weaponReq": "เคียวคู่",
      "prereq": [
        {
          "skill": "ro_dagger",
          "level": 3
        }
      ],
      "desc": "ถือเคียวคู่: ความเร็วโจมตี +2% ตีแต่ละครั้งโอกาส 3% ติดเลือดไหล (4 วิ) · เลือดไหล 4 วิ"
    },
    {
      "id": "rp_return",
      "name": "ขว้างเคียววกกลับ",
      "thai": "สายเคียวคู่หมุนวน",
      "icon": "sk_rp_return",
      "iconUrl": "https://play.nightcamp.app/cas/de152add6e0e.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "weaponReq": "เคียวคู่",
      "desc": "ขว้างเคียวสองเล่มไป 450 แล้ววกกลับ โดนทั้งขาไปขากลับ 100% ของ ATK · Lv5 ขากลับดึง · Lv10 4 เล่มกากบาท"
    },
    {
      "id": "rp_hook",
      "name": "เกี่ยววิญญาณ",
      "thai": "สายเคียวคู่หมุนวน",
      "icon": "sk_rp_hook",
      "iconUrl": "https://play.nightcamp.app/cas/7680e8e7964f.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "ขว้างเคียววกกลับ Lv.3",
      "weaponReq": "เคียวคู่",
      "prereq": [
        {
          "skill": "rp_return",
          "level": 3
        }
      ],
      "desc": "เกี่ยวเป้าเดียวดึงมาตรงหน้า (บอสไม่ถูกดึง) แล้วฟัน 100% ของ ATK ได้ดวงวิญญาณ 1 ดวง (เป้าที่วิญญาณสุกอยู่ได้อีก 1 ดวงจากการเกี่ยว) · ได้วิญญาณ 1 ดวง"
    },
    {
      "id": "rp_storm",
      "name": "พายุวิญญาณ",
      "thai": "สายพายุวิญญาณ",
      "icon": "sk_rp_storm",
      "iconUrl": "https://play.nightcamp.app/cas/eafdbc723eb2.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "ult": true,
      "req": "ประหารใต้จันทร์ Lv.5 หรือ เกี่ยววิญญาณ Lv.3",
      "reqAny": true,
      "prereq": [
        {
          "skill": "rp_execute",
          "level": 5
        },
        {
          "skill": "rp_hook",
          "level": 3
        }
      ],
      "desc": "ใช้ดวงวิญญาณทั้งหมด: ดวงวิญญาณหมุนรอบตัวเป็นพายุ 6 วิ ทุกวิดวงละ 100% ของ ATK ดูดเลือด 3% · ยิ่งมีวิญญาณยิ่งแรง"
    }
  ],
  "puppeteer": [
    {
      "id": "pp_puppet",
      "name": "สร้างหุ่นรบ",
      "thai": "สายหุ่นรบ",
      "icon": "sk_pp_puppet",
      "iconUrl": "https://play.nightcamp.app/cas/9d3e97772505.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "buff",
      "desc": "หุ่นไม้ตัวใหญ่สู้ข้างเราถาวร HP 65% ของ HP สูงสุดเรา ตี 100% ของ ATK · กดอีกครั้งเปลี่ยนแบบ: ขวาน (ตีหมู่) → โล่ (ยั่วยุ ทนกว่า) → หน้าไม้ (ยิงไกล) · Lv5 หุ่นได้ท่าพิเศษของแบบนั้น · Lv10 หุ่นร่างใหญ่"
    },
    {
      "id": "pp_strings",
      "name": "ชักใยหุ่น",
      "thai": "สายหุ่นรบ",
      "icon": "sk_pp_strings",
      "iconUrl": "https://play.nightcamp.app/cas/958e9071e129.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "สร้างหุ่นรบ Lv.3",
      "weaponReq": "ไม้เชิดหุ่น",
      "prereq": [
        {
          "skill": "pp_puppet",
          "level": 3
        }
      ],
      "desc": "ถือไม้เชิด: ตีปกติสั่งหุ่นฟาดเป้าเดียวกันทันที แรงขึ้น 3% · หุ่นตีตามทุกครั้งที่เราตีปกติ"
    },
    {
      "id": "pp_swap",
      "name": "สลับร่างหุ่น",
      "thai": "สายหุ่นรบ",
      "icon": "sk_pp_swap",
      "iconUrl": "https://play.nightcamp.app/cas/08cf7324e818.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "สร้างหุ่นรบ Lv.3",
      "weaponReq": "ไม้เชิดหุ่น",
      "prereq": [
        {
          "skill": "pp_puppet",
          "level": 3
        }
      ],
      "desc": "สลับที่กับหุ่นทันที ศัตรูที่เล็งเราหันไปตีหุ่น · ศัตรูหันไปตีหุ่น"
    },
    {
      "id": "pp_dance",
      "name": "ระบำหุ่น",
      "thai": "สายหุ่นรบ",
      "icon": "sk_pp_dance",
      "iconUrl": "https://play.nightcamp.app/cas/fbf249360451.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "สร้างหุ่นรบ Lv.5",
      "weaponReq": "ไม้เชิดหุ่น",
      "prereq": [
        {
          "skill": "pp_puppet",
          "level": 5
        }
      ],
      "desc": "หุ่นหมุนตัวฟาดรอบตัว 3 รอบ รอบละ 100% ของ ATK · หมุน 3 รอบ"
    },
    {
      "id": "pp_control",
      "name": "เชิดมอน",
      "thai": "สายด้ายเชิด",
      "icon": "sk_pp_control",
      "iconUrl": "https://play.nightcamp.app/cas/70be2466f0e8.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ซ่อนตัว Lv.1",
      "prereq": [
        {
          "skill": "ro_hide",
          "level": 1
        }
      ],
      "desc": "เกี่ยวด้ายเข้ามอน 1 ตัว 2.3 วิ มันหันไปตีพวกเดียวกันด้วยพลังเต็มของมัน · บอสเชิดไม่ได้ แต่ช้าลง 3 วิแทน · Lv5 เชิดได้ 2 ตัว · Lv10 มอนที่เชิดตายแล้วระเบิด"
    },
    {
      "id": "pp_guide",
      "name": "ด้ายนำทาง",
      "thai": "สายด้ายเชิด",
      "icon": "sk_pp_guide",
      "iconUrl": "https://play.nightcamp.app/cas/253fc99042c6.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "เชิดมอน Lv.3",
      "prereq": [
        {
          "skill": "pp_control",
          "level": 3
        }
      ],
      "desc": "ด้ายที่เชื่อมเรากับหุ่นหรือมอนที่เชิด ศัตรูที่ข้ามเส้นด้ายโดนวิละ 35% ของ ATK และช้าลง · ด้ายถึงหุ่นและมอนที่เชิด"
    },
    {
      "id": "pp_soulstring",
      "name": "เชือกชักวิญญาณ",
      "thai": "สายด้ายเชิด",
      "icon": "sk_pp_soulstring",
      "iconUrl": "https://play.nightcamp.app/cas/a8505ce136a3.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "passive",
      "req": "เชิดมอน Lv.5",
      "prereq": [
        {
          "skill": "pp_control",
          "level": 5
        }
      ],
      "desc": "มอนที่เชิดคริได้เท่าเรา · Lv1 มอนที่เชิดคริได้ · Lv3 สลับร่างแล้วไม่โดนตี 2 วิ · Lv5 หุ่นประกอบใหม่เอง"
    },
    {
      "id": "pp_edge",
      "name": "ด้ายคม",
      "thai": "สายด้ายสังหาร",
      "icon": "sk_pp_edge",
      "iconUrl": "https://play.nightcamp.app/cas/65018109b785.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ชำนาญมีด Lv.3",
      "weaponReq": "ด้ายเหล็ก",
      "prereq": [
        {
          "skill": "ro_dagger",
          "level": 3
        }
      ],
      "desc": "ถือด้ายเหล็ก: ตีปกติสะบัดด้ายไกล 300 ทะลุทั้งแนว แรงขึ้น 4% · สะบัดด้ายทะลุทั้งแนว"
    },
    {
      "id": "pp_stretch",
      "name": "ขึงด้ายเหล็ก",
      "thai": "สายด้ายสังหาร",
      "icon": "sk_pp_stretch",
      "iconUrl": "https://play.nightcamp.app/cas/454e9ccea58e.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "weaponReq": "ด้ายเหล็ก",
      "desc": "ขึงด้ายจากเราไปจุดที่เล็งยาว 400 นาน 6 วิ ศัตรูที่แตะด้ายโดน 100% ของ ATK ทุกครึ่งวิ ขึงได้ 3 เส้น · Lv5 ด้ายไขว้ระเบิดที่จุดตัด · Lv10 ขึงได้ 5 เส้น"
    },
    {
      "id": "pp_bind",
      "name": "รัดด้าย",
      "thai": "สายด้ายสังหาร",
      "icon": "sk_pp_bind",
      "iconUrl": "https://play.nightcamp.app/cas/dbb1824e4d07.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ขึงด้ายเหล็ก Lv.3",
      "weaponReq": "ด้ายเหล็ก",
      "prereq": [
        {
          "skill": "pp_stretch",
          "level": 3
        }
      ],
      "desc": "ร่าย 0.6 วิ ดึงด้ายทุกเส้นเข้าหาตัว ศัตรูที่ติดด้ายถูกลากมา 100% ของ ATK · ลากศัตรูที่ติดด้าย"
    },
    {
      "id": "pp_theatre",
      "name": "โรงละครหุ่นเชิด",
      "thai": "สายโรงละครหุ่นเชิด",
      "icon": "sk_pp_theatre",
      "iconUrl": "https://play.nightcamp.app/cas/9bc5fe6ffd12.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "ult": true,
      "req": "ระบำหุ่น Lv.5 หรือ รัดด้าย Lv.5",
      "reqAny": true,
      "prereq": [
        {
          "skill": "pp_dance",
          "level": 5
        },
        {
          "skill": "pp_bind",
          "level": 5
        }
      ],
      "desc": "เวทีหุ่นเชิดรอบตัวเรา (วง 900) 8 วิ ศัตรูทุกตัวบนเวทีถูกตรึงอยู่กับที่ โดน 100% ของ ATK ทุกวิ แล้วหันไปฟาดตัวข้าง ๆ ด้วยพลังของเรา · ทุก 2 วิ กระตุกด้ายลากมอนเข้าหาเรา · จบโชว์ \"ปิดม่าน\" ฟาดทุกตัว 5800% · บอสไม่ถูกตรึง แต่ช้าลงและหันไปตีหุ่นรบ · พื้นที่เหลือ 50% ของเดิม · วง 900 ตามตัว 8 วิ · มอนฟาดกันด้วยพลังเรา · กระตุกด้าย · ปิดม่าน"
    }
  ],
  "lightkeeper": [
    {
      "id": "lk_radiance",
      "name": "รัศมีแสง",
      "thai": "สายเขตแสง",
      "icon": "sk_lk_radiance",
      "iconUrl": "https://play.nightcamp.app/cas/049c561eae08.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "desc": "รอบตัวเป็นเขตแสงรัศมี 210 พวกเราในแสงฟื้น HP 0.5% ทุก 5 วิ ผี อมตะ และธาตุมืดในแสงโดนเผาวิละ 23% ของ MATK · กลางคืนและในดันเจี้ยนแสงกว้างขึ้น 30%"
    },
    {
      "id": "lk_flash",
      "name": "แสงไล่เงา",
      "thai": "สายเขตแสง",
      "icon": "sk_lk_flash",
      "iconUrl": "https://play.nightcamp.app/cas/dfc3c4d4eefa.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "แสงศักดิ์สิทธิ์ Lv.3",
      "prereq": [
        {
          "skill": "holylight",
          "level": 3
        }
      ],
      "desc": "แสงวาบรัศมี 300 ศัตรูโดน 100% ของ MATK ธาตุแสง ผีและอมตะมึน 1 วิ"
    },
    {
      "id": "lk_lighthouse",
      "name": "ประภาคาร",
      "thai": "สายเขตแสง",
      "icon": "sk_lk_lighthouse",
      "iconUrl": "https://play.nightcamp.app/cas/462dfcf1e9b5.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "passive",
      "req": "รัศมีแสง Lv.5",
      "prereq": [
        {
          "skill": "lk_radiance",
          "level": 5
        }
      ],
      "desc": "แสงของเราสว่างขึ้น (ฮีลของรัศมีแสงกับโคมแก้ว และเผาของรัศมีแสง +20%) · Lv1 แสงแรงขึ้น · Lv3 ยืนนิ่งแสงกว้างขึ้น · Lv5 ล้มในแสงแล้วลุก"
    },
    {
      "id": "lk_torchmastery",
      "name": "ชำนาญคบเพลิง",
      "thai": "สายคบเพลิงศักดิ์สิทธิ์",
      "icon": "sk_lk_torchmastery",
      "iconUrl": "https://play.nightcamp.app/cas/c5250f867c25.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ชำนาญกระบอง Lv.1",
      "weaponReq": "คบเพลิง",
      "prereq": [
        {
          "skill": "pr_macemastery",
          "level": 1
        }
      ],
      "desc": "ถือคบเพลิง: ตีปกติแรงขึ้น 3% ติดเผา 4% แรงกับผี อมตะ และธาตุมืดอีก 20% · ติดเผา แรงกับผีและอมตะ"
    },
    {
      "id": "lk_swing",
      "name": "ฟาดเปลวไฟ",
      "thai": "สายคบเพลิงศักดิ์สิทธิ์",
      "icon": "sk_lk_swing",
      "iconUrl": "https://play.nightcamp.app/cas/2d64ad2b5faf.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "weaponReq": "คบเพลิง",
      "desc": "ฟาดคบเพลิงเป็นวงข้างหน้า 100% ของ ATK ธาตุไฟ ทิ้งเปลวไฟที่พื้น 3 วิ (เป็นเขตแสงด้วย) · ทิ้งเปลวไฟที่เป็นเขตแสง"
    },
    {
      "id": "lk_plant",
      "name": "ปักคบเพลิง",
      "thai": "สายคบเพลิงศักดิ์สิทธิ์",
      "icon": "sk_lk_plant",
      "iconUrl": "https://play.nightcamp.app/cas/e36b3724cb85.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "ฟาดเปลวไฟ Lv.3",
      "weaponReq": "คบเพลิง",
      "prereq": [
        {
          "skill": "lk_swing",
          "level": 3
        }
      ],
      "desc": "ปักคบเพลิงสำรองลงพื้น 20 วิ เป็นเขตแสงรัศมี 250 เผาศัตรูที่เข้าใกล้ทุกครึ่งวิ 100% ของ MATK ปักได้ 2 อัน"
    },
    {
      "id": "lk_faith",
      "name": "ไฟศรัทธา",
      "thai": "สายคบเพลิงศักดิ์สิทธิ์",
      "icon": "sk_lk_faith",
      "iconUrl": "https://play.nightcamp.app/cas/b5d76690a4f8.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "buff",
      "req": "ชำนาญคบเพลิง Lv.3",
      "weaponReq": "คบเพลิง",
      "prereq": [
        {
          "skill": "lk_torchmastery",
          "level": 3
        }
      ],
      "desc": "30 วิ: อาวุธเราเป็นธาตุแสง ATK +1% ตีอมตะและธาตุมืดแรงขึ้นอีก 2% · เพื่อนรอบตัวได้บัฟนี้ด้วย · อาวุธเป็นธาตุแสง"
    },
    {
      "id": "lk_lamp",
      "name": "วางโคมแก้ว",
      "thai": "สายโคมแก้ว",
      "icon": "sk_lk_lamp",
      "iconUrl": "https://play.nightcamp.app/cas/b271a1dcac43.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "weaponBonus": "คทา (โคมอยู่นานขึ้น 10 วิ)",
      "desc": "วางโคมแก้วที่พื้นได้ 3 ดวง อยู่ 25 วิ (ถือคทา 35 วิ) แต่ละดวงเป็นเขตแสงรัศมี 220 ฮีลพวกเราในแสงวิละ 29% ของ MATK · Lv5 วางได้ 4 ดวง · Lv10 โคมลอยตามเพื่อน"
    },
    {
      "id": "lk_flare",
      "name": "โคมเรืองรอง",
      "thai": "สายโคมแก้ว",
      "icon": "sk_lk_flare",
      "iconUrl": "https://play.nightcamp.app/cas/8443b7553d45.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "วางโคมแก้ว Lv.3",
      "prereq": [
        {
          "skill": "lk_lamp",
          "level": 3
        }
      ],
      "desc": "โคมทุกดวงสว่างวาบ ฮีลทุกคนในแสงของโคม 170% ของ MATK ทันที"
    },
    {
      "id": "lk_wick",
      "name": "ไส้ตะเกียงอย่างดี",
      "thai": "สายโคมแก้ว",
      "icon": "sk_lk_wick",
      "iconUrl": "https://play.nightcamp.app/cas/41aac4009276.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "desc": "ฮีลจากพลังเวทแรงขึ้น 2% ฟื้น SP เร็วขึ้น 3%"
    },
    {
      "id": "lk_dawn",
      "name": "รุ่งอรุณ",
      "thai": "สายรุ่งอรุณ",
      "icon": "sk_lk_dawn",
      "iconUrl": "https://play.nightcamp.app/cas/3e6585b990cb.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "ult": true,
      "req": "โคมเรืองรอง Lv.5 หรือ ปักคบเพลิง Lv.3",
      "reqAny": true,
      "prereq": [
        {
          "skill": "lk_flare",
          "level": 5
        },
        {
          "skill": "lk_plant",
          "level": 3
        }
      ],
      "desc": "แสงรุ่งอรุณรัศมี 1000 รอบตัว 10 วิ: พวกเราในแสงอยู่ในเขตแสง ฮีลแรงขึ้น 50% · ผี อมตะ และธาตุมืดในแสงโดนเผาวิละ 95% ของ MATK · แสงรัศมี 1000 รอบตัว 10 วิ"
    }
  ],
  "wisp": [
    {
      "id": "ws_flock",
      "name": "เลี้ยงดวงไฟ",
      "thai": "สายฝูงดวงไฟ",
      "icon": "sk_ws_flock",
      "iconUrl": "https://play.nightcamp.app/cas/527334fa0a83.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "passive",
      "desc": "ดวงไฟวิญญาณลอยรอบตัว 1 ดวง ดวงที่ใช้ไปเกิดใหม่ทุก 4 วิ แรงตาม MATK · จำนวนดวงเพิ่มทุก 2 เลเวล (สูงสุด 5) · Lv5 เกิดใหม่ทุก 3 วิ"
    },
    {
      "id": "ws_swarm",
      "name": "ฝูงหิ่งห้อย",
      "thai": "สายฝูงดวงไฟ",
      "icon": "sk_ws_swarm",
      "iconUrl": "https://play.nightcamp.app/cas/3a13b9de1655.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "เลี้ยงดวงไฟ Lv.3",
      "prereq": [
        {
          "skill": "ws_flock",
          "level": 3
        }
      ],
      "desc": "ดวงไฟที่ลอยรอบตัวยิงศัตรูใกล้ ๆ เอง ดวงละ 25% ของ MATK ทุก 1.6 วิ ถี่ขึ้นตามความเร็วโจมตี (เร็วสุดทุก 0.8 วิ) · ยิงเอง ถี่ขึ้นตามความเร็วโจมตี"
    },
    {
      "id": "ws_swift",
      "name": "ดวงไฟเร็ว",
      "thai": "สายฝูงดวงไฟ",
      "icon": "sk_ws_swift",
      "iconUrl": "https://play.nightcamp.app/cas/328a8e797e8e.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "desc": "ดวงไฟเกิดใหม่และพุ่งเร็วขึ้น 3%"
    },
    {
      "id": "ws_heart",
      "name": "ใจดวงไฟ",
      "thai": "สายฝูงดวงไฟ",
      "icon": "sk_ws_heart",
      "iconUrl": "https://play.nightcamp.app/cas/44775f67ded7.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "passive",
      "req": "เลี้ยงดวงไฟ Lv.5",
      "prereq": [
        {
          "skill": "ws_flock",
          "level": 5
        }
      ],
      "desc": "เกาะเพื่อนได้คนละ 2 ดวง · Lv1 เกาะเพื่อนได้ 2 ดวง · Lv3 ดวงไฟที่พุ่งชนทิ้งแสงฮีล · Lv5 ดวงใหญ่"
    },
    {
      "id": "ws_latch",
      "name": "ส่งดวงไฟเกาะ",
      "thai": "สายดวงไฟรักษา",
      "icon": "sk_ws_latch",
      "iconUrl": "https://play.nightcamp.app/cas/58b3605099b4.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "weaponBonus": "คทา (เกาะนานขึ้น 10 วิ)",
      "desc": "ส่งดวงไฟ 1 ดวงไปเกาะเพื่อนที่เลือดน้อยที่สุด (หรือตัวเอง) 20 วิ (ถือคทา 30 วิ) ฮีลวิละ 18% ของ MATK"
    },
    {
      "id": "ws_embrace",
      "name": "ดวงไฟโอบกาย",
      "thai": "สายดวงไฟรักษา",
      "icon": "sk_ws_embrace",
      "iconUrl": "https://play.nightcamp.app/cas/d083ea6ff5e6.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ส่งดวงไฟเกาะ Lv.3",
      "prereq": [
        {
          "skill": "ws_latch",
          "level": 3
        }
      ],
      "desc": "ดวงไฟที่เกาะอยู่กลายเป็นโล่ ดูดซับดาเมจดวงละ 115% ของ MATK · อยู่จนดวงไฟที่เกาะหมดเวลา (20 วิ ถือคทา 30 วิ) ดูดซับครบ หรือใช้ดวงไฟแตกฮีล · ดูเวลาที่แถวบัฟ · ดวงไฟที่เกาะกลายเป็นโล่"
    },
    {
      "id": "ws_burst",
      "name": "ดวงไฟแตกฮีล",
      "thai": "สายดวงไฟรักษา",
      "icon": "sk_ws_burst",
      "iconUrl": "https://play.nightcamp.app/cas/81099c598cf0.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ส่งดวงไฟเกาะ Lv.5",
      "prereq": [
        {
          "skill": "ws_latch",
          "level": 5
        }
      ],
      "desc": "ดวงไฟทุกดวงที่เกาะอยู่แตกพร้อมกัน ฮีลทันที 140% ของ MATK รอบตัวคนนั้น · ฮีลรอบตัวคนที่ถูกเกาะ"
    },
    {
      "id": "ws_call",
      "name": "เสียงเรียกดวงไฟ",
      "thai": "สายดวงไฟโจมตี",
      "icon": "sk_ws_call",
      "iconUrl": "https://play.nightcamp.app/cas/dd0349c52bff.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ชำนาญกระบอง Lv.1",
      "weaponReq": "กระดิ่งวิญญาณ",
      "prereq": [
        {
          "skill": "pr_macemastery",
          "level": 1
        }
      ],
      "desc": "ถือกระดิ่ง: ตีปกติเป็นคลื่นเสียง ทุก 0.8 วิ ดวงไฟ 1 ดวงพุ่งใส่เป้าที่ตีโดน 68% ของ MATK (ดวงไฟไม่หมด ยังลอยรอบตัวเท่าเดิม) · ถือกระดิ่งเท่านั้น"
    },
    {
      "id": "ws_rush",
      "name": "ฝูงดวงไฟพุ่ง",
      "thai": "สายดวงไฟโจมตี",
      "icon": "sk_ws_rush",
      "iconUrl": "https://play.nightcamp.app/cas/ebeadeee7afd.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "เสียงเรียกดวงไฟ Lv.3",
      "weaponReq": "กระดิ่งวิญญาณ",
      "prereq": [
        {
          "skill": "ws_call",
          "level": 3
        }
      ],
      "desc": "ดวงไฟทุกดวงพุ่งรุมเป้า ดวงละ 100% ของ MATK ระเบิดเป็นวงกว้าง ตัวรอบ ๆ โดน 70% · Lv10 ดวงไฟครึ่งหนึ่งเกิดใหม่ทันที"
    },
    {
      "id": "ws_mark",
      "name": "ดวงไฟติดศัตรู",
      "thai": "สายดวงไฟโจมตี",
      "icon": "sk_ws_mark",
      "iconUrl": "https://play.nightcamp.app/cas/002f09fbea5f.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "เสียงเรียกดวงไฟ Lv.3",
      "weaponReq": "กระดิ่งวิญญาณ",
      "prereq": [
        {
          "skill": "ws_call",
          "level": 3
        }
      ],
      "desc": "แปะดวงไฟบนศัตรูทุกตัวในวงตรงจุดที่ชี้ 6 วิ ทุกครั้งที่ตีตัวที่ติด (ดวงไฟของเราก็นับ ถี่สุด 0.3 วิต่อตัว) ดวงไฟระเบิดเป็นวงเล็ก 100% ของ MATK (ตัวรอบข้าง 50%) · แปะทั้งวง ตีแล้วระเบิดเป็นวง"
    },
    {
      "id": "ws_night",
      "name": "คืนหิ่งห้อยพันดวง",
      "thai": "สายคืนหิ่งห้อยพันดวง",
      "icon": "sk_ws_night",
      "iconUrl": "https://play.nightcamp.app/cas/49edce69c455.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "ult": true,
      "req": "ดวงไฟแตกฮีล Lv.5 หรือ ฝูงดวงไฟพุ่ง Lv.5",
      "reqAny": true,
      "prereq": [
        {
          "skill": "ws_burst",
          "level": 5
        },
        {
          "skill": "ws_rush",
          "level": 5
        }
      ],
      "desc": "ดวงไฟนับพันลอยขึ้นทั่วจอ 10 วิ ศัตรูโดนดวงไฟรุมวิละ 200% ของ MATK · \"แสงพร่า\" ศัตรูตีเบาลงครึ่งหนึ่งและช้าลง · ดวงไฟติดทุกตัว ใครในทีมตีโดนก็ระเบิดเพิ่ม 250% · ทุก 2 วิ ฝนดวงไฟดิ่งใส่ทุกตัว 900% ลามตัวข้าง ๆ 6 ตัว · พวกเราฟื้น HP 2% ทุกวิ รับดาเมจ ×0.8 · เราได้โล่ดวงไฟ 240% ของ MATK · ทั้งจอ 10 วิ · แสงพร่า · ดวงไฟติดทุกตัว · ฝนดวงไฟ · โล่ดวงไฟ"
    }
  ],
  "dawnwarden": [
    {
      "id": "dw_dawn",
      "name": "แสงรุ่งสาง",
      "thai": "สายแสงรุ่งสาง",
      "icon": "sk_dw_dawn",
      "iconUrl": "https://play.nightcamp.app/cas/3076668f493d.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "passive",
      "desc": "ดาเมจที่รับ (1% HP = 1.5 แต้ม) กับสกิลที่โดนศัตรู (2 แต้ม) สะสมแสงรุ่งสาง เต็ม 100 สกิลถัดไปปล่อย \"ตะวันแตก\" รอบตัว 100% ของ ATK ธาตุแสง + ฮีล 10% HP · ตอนนี้ 0 · ตะวันแตกแรงขึ้นทุกเลเวล"
    },
    {
      "id": "dw_strike",
      "name": "ฟันตะวันขึ้น",
      "thai": "สายดาบแสงตะวัน",
      "icon": "sk_dw_strike",
      "iconUrl": "https://play.nightcamp.app/cas/3c4c05dd6dd2.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ฟันศักดิ์สิทธิ์ Lv.1",
      "prereq": [
        {
          "skill": "pal_strike",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"ฟันศักดิ์สิทธิ์\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · เสาแสงตะวันผ่าลงเป้า (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "dw_cross",
      "name": "ตะวันแผดเผา",
      "thai": "สายดาบแสงตะวัน",
      "icon": "sk_dw_cross",
      "iconUrl": "https://play.nightcamp.app/cas/7d4f7cd0a479.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "แสงกากบาทเผาผลาญ Lv.1",
      "prereq": [
        {
          "skill": "pal_cross",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"แสงกากบาทเผาผลาญ\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · คลื่นแสงตะวันแผ่เป็นวงจากเป้า (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "dw_chain",
      "name": "โล่ตะวันพิฆาต",
      "thai": "สายปราการรุ่งสาง",
      "icon": "sk_dw_chain",
      "iconUrl": "https://play.nightcamp.app/cas/9a81b7889b0c.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "โล่พิฆาต Lv.1",
      "prereq": [
        {
          "skill": "pal_shieldchain",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"โล่พิฆาต\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · สายฟ้าทองกระโดดต่อไปอีก 3–4 ตัว (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "dw_hands",
      "name": "มือรุ่งอรุณ",
      "thai": "สายปราการรุ่งสาง",
      "icon": "sk_dw_hands",
      "iconUrl": "https://play.nightcamp.app/cas/7536cdfa15cd.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "มือแห่งแสง Lv.1",
      "prereq": [
        {
          "skill": "pal_layhands",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"มือแห่งแสง\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · ฮีลตัวเราและเพื่อนรอบตัวอีกก้อนตาม MATK 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "dw_awaken",
      "name": "ร่างอาทิตย์อุทัย",
      "thai": "สายร่างตื่น",
      "icon": "sk_dw_awaken",
      "iconUrl": "https://play.nightcamp.app/cas/db6368fced8b.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "passive",
      "req": "แสงรุ่งสาง Lv.3",
      "prereq": [
        {
          "skill": "dw_dawn",
          "level": 3
        }
      ],
      "desc": "ใช้สกิลที่ปลุกพลังแล้ว วงจันทร์ใต้เท้าเต็ม ร่างตื่นเอง 10 วิ: สกิลที่ปลุกพลังแรงขึ้นอีก 12% เอฟเฟกต์ออกเพิ่ม 1 ครั้ง · รับดาเมจลดลง 20% (+2% ต่อเลเวล) DEF +10 · ร่างตื่นนานขึ้น 2 วิ และแรงขึ้นทุกเลเวล"
    }
  ],
  "dragonbound": [
    {
      "id": "db_ember",
      "name": "เลือดมังกรเดือด",
      "thai": "สายเลือดมังกรเดือด",
      "icon": "sk_db_ember",
      "iconUrl": "https://play.nightcamp.app/cas/178d10322e7c.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "passive",
      "desc": "ATK +1% · สกิลที่โดนศัตรูทิ้งเกล็ดไฟ 1 ชั้น (หายใน 6 วิ) ครบ 5 ชั้นระเบิดไฟมังกร 100% ของ ATK รอบตัวนั้น · ระเบิดไฟมังกรแรงขึ้นทุกเลเวล"
    },
    {
      "id": "db_thrust",
      "name": "แทงเขี้ยวมังกร",
      "thai": "สายหอกมังกร",
      "icon": "sk_db_thrust",
      "iconUrl": "https://play.nightcamp.app/cas/0908c1b45f28.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "แทงเพลิงมังกร Lv.1",
      "prereq": [
        {
          "skill": "dk_thrust",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"แทงเพลิงมังกร\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · หัวมังกรเพลิงพุ่งฟาดซ้ำ (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "db_spiral",
      "name": "สว่านพายุเพลิง",
      "thai": "สายหอกมังกร",
      "icon": "sk_db_spiral",
      "iconUrl": "https://play.nightcamp.app/cas/d0d1aae8c83b.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "หอกเกลียวสว่าน Lv.1",
      "prereq": [
        {
          "skill": "dk_spiral",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"หอกเกลียวสว่าน\": ระยะไกลขึ้น 2.5% · เปลวไฟพุ่งจากพื้นเป็นแนว (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "db_breath",
      "name": "ลมหายใจมังกรดำ",
      "thai": "สายเพลิงมังกร",
      "icon": "sk_db_breath",
      "iconUrl": "https://play.nightcamp.app/cas/5f376c54e820.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ลมหายใจมังกร Lv.1",
      "prereq": [
        {
          "skill": "dk_breath",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"ลมหายใจมังกร\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · ห่าลูกไฟตกใส่รอบเป้า (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "db_leap",
      "name": "มังกรดิ่งฟ้า",
      "thai": "สายเพลิงมังกร",
      "icon": "sk_db_leap",
      "iconUrl": "https://play.nightcamp.app/cas/b86a62fd452b.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "มังกรทะยาน Lv.1",
      "prereq": [
        {
          "skill": "dk_leap",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"มังกรทะยาน\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · ลงแล้วระเบิดไฟวงใหญ่ (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "db_awaken",
      "name": "ร่างผสานมังกร",
      "thai": "สายร่างตื่น",
      "icon": "sk_db_awaken",
      "iconUrl": "https://play.nightcamp.app/cas/365d3a88cf0c.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "passive",
      "req": "เลือดมังกรเดือด Lv.3",
      "prereq": [
        {
          "skill": "db_ember",
          "level": 3
        }
      ],
      "desc": "ใช้สกิลที่ปลุกพลังแล้ว วงจันทร์ใต้เท้าเต็ม ร่างตื่นเอง 10 วิ: สกิลที่ปลุกพลังแรงขึ้นอีก 12% เอฟเฟกต์ออกเพิ่ม 1 ครั้ง · ตีปกติพ่นไฟเป็นกรวย เดินเร็วขึ้น 20% ความเร็วโจมตี +10% · ร่างตื่นนานขึ้น 2 วิ และแรงขึ้นทุกเลเวล"
    }
  ],
  "starblade": [
    {
      "id": "sb_stars",
      "name": "กลุ่มดาวคมดาบ",
      "thai": "สายกลุ่มดาวคมดาบ",
      "icon": "sk_sb_stars",
      "iconUrl": "https://play.nightcamp.app/cas/1717a159734a.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "passive",
      "desc": "มีรอยดาบครบ 5 รอย รอยต่อเส้นกันเป็นดาวห้าแฉกแล้วระเบิดพร้อมกัน รอยละ 100% ของ ATK (แทนระเบิดปกติ) · Lv5 ดาวห้าแฉกทำให้มึน · แรงขึ้นทุกเลเวล"
    },
    {
      "id": "sb_rain",
      "name": "ฝนดาบดารา",
      "thai": "สายดาบคู่ดารา",
      "icon": "sk_sb_rain",
      "iconUrl": "https://play.nightcamp.app/cas/b430c48a15cc.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "สายฝนดาบ Lv.1",
      "prereq": [
        {
          "skill": "sm_bladerain",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"สายฝนดาบ\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · ดาบคริสตัลตกใส่รอบเป้า (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "sb_thousand",
      "name": "พันดาบดารา",
      "thai": "สายดาบคู่ดารา",
      "icon": "sk_sb_thousand",
      "iconUrl": "https://play.nightcamp.app/cas/2584324c0e56.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "จันทร์พันดาบ Lv.1",
      "prereq": [
        {
          "skill": "sm_thousand",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"จันทร์พันดาบ\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · ฝนดาวตกลงใส่เป้า (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "sb_wave",
      "name": "คลื่นดาบทางช้างเผือก",
      "thai": "สายดาบเวทดารา",
      "icon": "sk_sb_wave",
      "iconUrl": "https://play.nightcamp.app/cas/fd4fe6ace27e.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "คลื่นดาบเวท Lv.1",
      "prereq": [
        {
          "skill": "sm_wave",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"คลื่นดาบเวท\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · เศษดาวแตกกระจายจากเป้า (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "sb_iai",
      "name": "ชักดาบผ่าดาว",
      "thai": "สายดาบเวทดารา",
      "icon": "sk_sb_iai",
      "iconUrl": "https://play.nightcamp.app/cas/1151356d5834.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ชักดาบผ่ารอย Lv.1",
      "prereq": [
        {
          "skill": "sm_iai",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"ชักดาบผ่ารอย\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · เงาดาบดาวฟันซ้ำอีกครั้ง (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "sb_awaken",
      "name": "ร่างดาบดารา",
      "thai": "สายร่างตื่น",
      "icon": "sk_sb_awaken",
      "iconUrl": "https://play.nightcamp.app/cas/97db0e7ac7ed.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "passive",
      "req": "กลุ่มดาวคมดาบ Lv.3",
      "prereq": [
        {
          "skill": "sb_stars",
          "level": 3
        }
      ],
      "desc": "ใช้สกิลที่ปลุกพลังแล้ว วงจันทร์ใต้เท้าเต็ม ร่างตื่นเอง 10 วิ: สกิลที่ปลุกพลังแรงขึ้นอีก 12% เอฟเฟกต์ออกเพิ่ม 1 ครั้ง · ตีปกติยิงดาบคริสตัลตามไป ความเร็วโจมตี +15% คริ +10 · ร่างตื่นนานขึ้น 2 วิ และแรงขึ้นทุกเลเวล"
    }
  ],
  "starcore": [
    {
      "id": "sc_core",
      "name": "ใจดาว",
      "thai": "สายใจดาว",
      "icon": "sk_sc_core",
      "iconUrl": "https://play.nightcamp.app/cas/847551adac90.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "passive",
      "desc": "ความร้อนเกิน 80 ฟื้น HP อีก 1% ต่อวิ · ระบายความร้อนตอนเต็ม 100 เป็น \"ซูเปอร์โนวา\" วงกว้าง 360 100% ของ MATK เพิ่มจากระเบิดปกติ · ซูเปอร์โนวาแรงขึ้นทุกเลเวล"
    },
    {
      "id": "sc_pillar",
      "name": "เสาสุริยะ",
      "thai": "สายนรกดาวฤกษ์",
      "icon": "sk_sc_pillar",
      "iconUrl": "https://play.nightcamp.app/cas/2e6fbb470a01.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "เสาเพลิง Lv.1",
      "prereq": [
        {
          "skill": "fm_pillar",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"เสาเพลิง\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · เสาไฟสุริยะสีขาวทองผ่าลงเป้า (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "sc_sea",
      "name": "ทะเลดวงอาทิตย์",
      "thai": "สายนรกดาวฤกษ์",
      "icon": "sk_sc_sea",
      "iconUrl": "https://play.nightcamp.app/cas/c337ef8d4535.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ทะเลเพลิง Lv.1",
      "prereq": [
        {
          "skill": "fm_sea",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"ทะเลเพลิง\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · ดวงอาทิตย์จิ๋วตกห่าใส่ (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "sc_ring",
      "name": "วงแหวนโคโรนา",
      "thai": "สายหัวใจดาว",
      "icon": "sk_sc_ring",
      "iconUrl": "https://play.nightcamp.app/cas/a3a1c5a67fef.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "วงแหวนเพลิง Lv.1",
      "prereq": [
        {
          "skill": "fm_ring",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"วงแหวนเพลิง\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · เปลวไฟกระจายออกจากเป้า (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "sc_vent",
      "name": "ระเบิดดาวฤกษ์",
      "thai": "สายหัวใจดาว",
      "icon": "sk_sc_vent",
      "iconUrl": "https://play.nightcamp.app/cas/faf307b32312.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ระบายความร้อน Lv.1",
      "prereq": [
        {
          "skill": "fm_vent",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"ระบายความร้อน\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · ระเบิดไฟซ้ำที่ศัตรูที่โดน (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "sc_awaken",
      "name": "ร่างดาวฤกษ์",
      "thai": "สายร่างตื่น",
      "icon": "sk_sc_awaken",
      "iconUrl": "https://play.nightcamp.app/cas/ef3aa6ddee9b.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ใจดาว Lv.3",
      "prereq": [
        {
          "skill": "sc_core",
          "level": 3
        }
      ],
      "desc": "ใช้สกิลที่ปลุกพลังแล้ว วงจันทร์ใต้เท้าเต็ม ร่างตื่นเอง 10 วิ: สกิลที่ปลุกพลังแรงขึ้นอีก 12% เอฟเฟกต์ออกเพิ่ม 1 ครั้ง · ร่ายเร็วขึ้น 20% MATK +5% · ร่างตื่นนานขึ้น 2 วิ และแรงขึ้นทุกเลเวล"
    }
  ],
  "winterlord": [
    {
      "id": "wn_statue",
      "name": "รูปปั้นน้ำแข็ง",
      "thai": "สายรูปปั้นน้ำแข็ง",
      "icon": "sk_wn_statue",
      "iconUrl": "https://play.nightcamp.app/cas/82954898b22b.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "passive",
      "desc": "ศัตรูที่ตายตอนแข็งกลายเป็นรูปปั้นน้ำแข็ง 6 วิ (สูงสุด 3 รูป) ยิงเศษน้ำแข็งใส่ศัตรูใกล้สุดทุก 1 วิ 100% ของ MATK ธาตุน้ำ · รูปปั้นอยู่นานขึ้นและยิงแรงขึ้นทุกเลเวล"
    },
    {
      "id": "wn_blizzard",
      "name": "พายุจักรพรรดิหิมะ",
      "thai": "สายธารน้ำแข็งจักรพรรดิ",
      "icon": "sk_wn_blizzard",
      "iconUrl": "https://play.nightcamp.app/cas/1c259cd6ce0a.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "พายุหิมะ Lv.1",
      "prereq": [
        {
          "skill": "im_blizzard",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"พายุหิมะ\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · ห่าเศษน้ำแข็งตกใส่ (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "wn_lance",
      "name": "หอกน้ำแข็งยักษ์",
      "thai": "สายธารน้ำแข็งจักรพรรดิ",
      "icon": "sk_wn_lance",
      "iconUrl": "https://play.nightcamp.app/cas/8ee1e4749777.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "หอกธารน้ำแข็ง Lv.1",
      "prereq": [
        {
          "skill": "im_lance",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"หอกธารน้ำแข็ง\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · หนามน้ำแข็งพุ่งจากพื้นเป็นแนว (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "wn_burst",
      "name": "ผลึกแตกดาว",
      "thai": "สายปราการจักรพรรดิ",
      "icon": "sk_wn_burst",
      "iconUrl": "https://play.nightcamp.app/cas/e54446c2fb81.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ผลึกระเบิด Lv.1",
      "prereq": [
        {
          "skill": "im_burst",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"ผลึกระเบิด\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · วงระเบิดน้ำแข็งแผ่จากเป้า (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "wn_armor",
      "name": "เกราะผลึกจักรพรรดิ",
      "thai": "สายปราการจักรพรรดิ",
      "icon": "sk_wn_armor",
      "iconUrl": "https://play.nightcamp.app/cas/da2522c28ed9.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "เกราะน้ำแข็ง Lv.1",
      "prereq": [
        {
          "skill": "im_armor",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"เกราะน้ำแข็ง\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · ร่ายแล้วเศษน้ำแข็งพุ่งรอบตัว และระหว่างมีเกราะ ใครตีเราโดนเศษสะท้อน 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "wn_awaken",
      "name": "ร่างจักรพรรดิหิมะ",
      "thai": "สายร่างตื่น",
      "icon": "sk_wn_awaken",
      "iconUrl": "https://play.nightcamp.app/cas/accb8af379af.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "passive",
      "req": "รูปปั้นน้ำแข็ง Lv.3",
      "prereq": [
        {
          "skill": "wn_statue",
          "level": 3
        }
      ],
      "desc": "ใช้สกิลที่ปลุกพลังแล้ว วงจันทร์ใต้เท้าเต็ม ร่างตื่นเอง 10 วิ: สกิลที่ปลุกพลังแรงขึ้นอีก 12% เอฟเฟกต์ออกเพิ่ม 1 ครั้ง · ศัตรูที่แข็งอยู่โดนแรงขึ้น 30% MDEF +20 · ร่างตื่นนานขึ้น 2 วิ และแรงขึ้นทุกเลเวล"
    }
  ],
  "astral": [
    {
      "id": "ax_planets",
      "name": "ดาวเคราะห์โคจร",
      "thai": "สายดาวเคราะห์โคจร",
      "icon": "sk_ax_planets",
      "iconUrl": "https://play.nightcamp.app/cas/aefdba17db7a.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "passive",
      "desc": "ร่ายเวทธาตุไฟ น้ำ ลม หรือดิน ได้ดาวเคราะห์ธาตุนั้นโคจรรอบตัว (อยู่ 12 วิ) ครบ 3 ธาตุต่างกัน \"เรียงดาว\" ระเบิดที่เป้า 100% ของ MATK · Lv5 ระหว่างร่างตื่นเรียงดาวได้ด้วย 2 ธาตุ · แรงขึ้นทุกเลเวล"
    },
    {
      "id": "ax_chain",
      "name": "สายฟ้าดาราจักร",
      "thai": "สายพายุดาราจักร",
      "icon": "sk_ax_chain",
      "iconUrl": "https://play.nightcamp.app/cas/8564f116d181.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "สายฟ้าลูกโซ่ Lv.1",
      "prereq": [
        {
          "skill": "am_chain",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"สายฟ้าลูกโซ่\": ชิ่งกลับตัวที่โดนแล้วได้ (ไม่ซ้ำตัวติดกัน) แต่ละครั้งที่ซ้ำแรงลดลง 50% · วงกว้างขึ้น 2% · สายฟ้ากระโดดต่ออีก 3–4 ตัว (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "ax_lord",
      "name": "อสนีจักรวาล",
      "thai": "สายพายุดาราจักร",
      "icon": "sk_ax_lord",
      "iconUrl": "https://play.nightcamp.app/cas/2d3d2176eaaa.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "เจ้าแห่งอสนี Lv.1",
      "prereq": [
        {
          "skill": "am_lordthunder",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"เจ้าแห่งอสนี\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · เสาฟ้าผ่าจากกาแล็กซีลงเป้า (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "ax_orbs",
      "name": "ลูกแก้วดาวเคราะห์",
      "thai": "สายผสานดาราจักร",
      "icon": "sk_ax_orbs",
      "iconUrl": "https://play.nightcamp.app/cas/2e771f28f411.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ลูกแก้วไฟ Lv.1",
      "prereq": [
        {
          "skill": "am_orbfire",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"ลูกแก้วไฟ\": เปิดลูกแก้วไฟ เศษดาวระเบิดรอบตัว 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "ax_recall",
      "name": "ลูกแก้วธาราจักรวาล",
      "thai": "สายผสานดาราจักร",
      "icon": "sk_ax_recall",
      "iconUrl": "https://play.nightcamp.app/cas/a346ed94196f.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ลูกแก้วน้ำ Lv.1",
      "prereq": [
        {
          "skill": "am_orbwater",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"ลูกแก้วน้ำ\": เปิดลูกแก้วน้ำ วงเวทซ้อนระเบิดรอบตัว 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "ax_awaken",
      "name": "ร่างดาราจักร",
      "thai": "สายร่างตื่น",
      "icon": "sk_ax_awaken",
      "iconUrl": "https://play.nightcamp.app/cas/519fa8eee424.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ดาวเคราะห์โคจร Lv.3",
      "prereq": [
        {
          "skill": "ax_planets",
          "level": 3
        }
      ],
      "desc": "ใช้สกิลที่ปลุกพลังแล้ว วงจันทร์ใต้เท้าเต็ม ร่างตื่นเอง 10 วิ: สกิลที่ปลุกพลังแรงขึ้นอีก 12% เอฟเฟกต์ออกเพิ่ม 1 ครั้ง · MATK +15% คูลดาวน์ลด 10% (เรียงดาวด้วย 2 ธาตุเมื่อกลไก Lv5) · ร่างตื่นนานขึ้น 2 วิ และแรงขึ้นทุกเลเวล"
    }
  ],
  "hexlord": [
    {
      "id": "hx_contagion",
      "name": "คำสาปติดต่อ",
      "thai": "สายคำสาปติดต่อ",
      "icon": "sk_hx_contagion",
      "iconUrl": "https://play.nightcamp.app/cas/af596dee5a5a.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "passive",
      "desc": "ศัตรูที่โดนสกิลเราภายใน 5 วิแล้วตาย ไฟผีกระโดดไป 2 ตัวใกล้สุด 100% ของ MATK ธาตุมืด และรับดาเมจ +10% 5 วิ (ต่อเป็นทอด ๆ ได้) · Lv5 กระโดด 3 ตัว · Lv10 4 ตัว"
    },
    {
      "id": "hx_soulfire",
      "name": "ไฟวิญญาณเดือนดับ",
      "thai": "สายไฟผีเดือนดับ",
      "icon": "sk_hx_soulfire",
      "iconUrl": "https://play.nightcamp.app/cas/195ff919b16b.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ไฟวิญญาณ Lv.1",
      "prereq": [
        {
          "skill": "wl_soulfire",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"ไฟวิญญาณ\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · ไฟผีกระโดดต่ออีก 3–4 ตัว (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "hx_soulburn",
      "name": "เผาวิญญาณลุกลาม",
      "thai": "สายไฟผีเดือนดับ",
      "icon": "sk_hx_soulburn",
      "iconUrl": "https://play.nightcamp.app/cas/55b3fb2b5060.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "คำสาปเผาวิญญาณ Lv.1",
      "prereq": [
        {
          "skill": "wl_soulburn",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"คำสาปเผาวิญญาณ\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · วงไฟผีแผ่จากเป้า (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "hx_hex",
      "name": "ตราคำสาปเดือนดับ",
      "thai": "สายคำสาปเดือนดับ",
      "icon": "sk_hx_hex",
      "iconUrl": "https://play.nightcamp.app/cas/5913c0a9b360.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ตราคำสาปมรณะ Lv.1",
      "prereq": [
        {
          "skill": "wl_hex",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"ตราคำสาปมรณะ\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · เสาเงาผ่าลงเป้า (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "hx_chains",
      "name": "โซ่เงาเดือนดับ",
      "thai": "สายคำสาปเดือนดับ",
      "icon": "sk_hx_chains",
      "iconUrl": "https://play.nightcamp.app/cas/a716fa4bbca7.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "โซ่คำสาป Lv.1",
      "prereq": [
        {
          "skill": "wl_chains",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"โซ่คำสาป\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · หนามเงาพุ่งจากพื้นเป็นแนว (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "hx_awaken",
      "name": "ร่างจ้าวผี",
      "thai": "สายร่างตื่น",
      "icon": "sk_hx_awaken",
      "iconUrl": "https://play.nightcamp.app/cas/44b3b35a028e.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "passive",
      "req": "คำสาปติดต่อ Lv.3",
      "prereq": [
        {
          "skill": "hx_contagion",
          "level": 3
        }
      ],
      "desc": "ใช้สกิลที่ปลุกพลังแล้ว วงจันทร์ใต้เท้าเต็ม ร่างตื่นเอง 10 วิ: สกิลที่ปลุกพลังแรงขึ้นอีก 12% เอฟเฟกต์ออกเพิ่ม 1 ครั้ง · เขตมืดรอบตัว 320: ศัตรูในเขตโดนแรงขึ้น 20% · MATK +10% · ร่างตื่นนานขึ้น 2 วิ และแรงขึ้นทุกเลเวล"
    }
  ],
  "bloodmoon": [
    {
      "id": "bm_moon",
      "name": "จันทร์เลือด",
      "thai": "สายจันทร์เลือด",
      "icon": "sk_bm_moon",
      "iconUrl": "https://play.nightcamp.app/cas/3c60c13e285a.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "passive",
      "desc": "ทุกฮิตแรงขึ้นตาม HP ที่หายไป: หายไปครึ่งหนึ่ง แรงขึ้น 16% · HP ต่ำกว่า 50% ดูดเลือด 0.1% ของดาเมจ · แรงขึ้นและดูดเลือดมากขึ้นทุกเลเวล"
    },
    {
      "id": "bm_cross",
      "name": "ฟันกากบาทจันทร์เลือด",
      "thai": "สายดาบใหญ่จันทร์เลือด",
      "icon": "sk_bm_cross",
      "iconUrl": "https://play.nightcamp.app/cas/fb460b9c18a8.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ฟันกากบาท Lv.1",
      "prereq": [
        {
          "skill": "bk_crosscut",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"ฟันกากบาท\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · เงาดาบสีเลือดฟันไขว้ซ้ำ (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "bm_guillotine",
      "name": "ประหารจันทร์เลือด",
      "thai": "สายดาบใหญ่จันทร์เลือด",
      "icon": "sk_bm_guillotine",
      "iconUrl": "https://play.nightcamp.app/cas/31207fa28611.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ฟันประหาร Lv.1",
      "prereq": [
        {
          "skill": "bk_guillotine",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"ฟันประหาร\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · เสาแสงสีเลือดผ่าลงเป้า (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "bm_smash",
      "name": "ทุบจันทร์แตก",
      "thai": "สายพสุธาจันทร์เลือด",
      "icon": "sk_bm_smash",
      "iconUrl": "https://play.nightcamp.app/cas/9f7136d70792.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ทุบสะสมพลัง Lv.1",
      "prereq": [
        {
          "skill": "bk_smash",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"ทุบสะสมพลัง\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · คลื่นแผ่นดินแตกแผ่จากเป้า (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "bm_leap",
      "name": "กระโดดจันทร์ถล่ม",
      "thai": "สายพสุธาจันทร์เลือด",
      "icon": "sk_bm_leap",
      "iconUrl": "https://play.nightcamp.app/cas/cfecf991e51f.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "กระโดดทุบธรณี Lv.1",
      "prereq": [
        {
          "skill": "bk_leap",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"กระโดดทุบธรณี\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · หินแหลมสีเลือดพุ่งจากพื้นเป็นแนว (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "bm_awaken",
      "name": "ร่างยักษ์จันทร์เลือด",
      "thai": "สายร่างตื่น",
      "icon": "sk_bm_awaken",
      "iconUrl": "https://play.nightcamp.app/cas/16a1a8bfa30e.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "passive",
      "req": "จันทร์เลือด Lv.3",
      "prereq": [
        {
          "skill": "bm_moon",
          "level": 3
        }
      ],
      "desc": "ใช้สกิลที่ปลุกพลังแล้ว วงจันทร์ใต้เท้าเต็ม ร่างตื่นเอง 10 วิ: สกิลที่ปลุกพลังแรงขึ้นอีก 12% เอฟเฟกต์ออกเพิ่ม 1 ครั้ง · ตัวโตเป็นยักษ์ ATK +15% รับดาเมจลด 15% ตีปกติส่งคลื่นกระแทก · ร่างตื่นนานขึ้น 2 วิ และแรงขึ้นทุกเลเวล"
    }
  ],
  "moonsniper": [
    {
      "id": "ms_still",
      "name": "สมาธิใต้จันทร์",
      "thai": "สายสมาธิใต้จันทร์",
      "icon": "sk_ms_still",
      "iconUrl": "https://play.nightcamp.app/cas/97808c3bef88.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "passive",
      "desc": "DEX +1 ดาเมจคริ +3% · ยืนนิ่งได้สมาธิ 1 ขั้นทุก 0.5 วิ (สูงสุด 5) · ครบ 5 สกิลถัดไปที่โดนแรงขึ้น 34% และยิงศรแสงจันทร์ทะลุทั้งแนวยาว 1000 100% ของ ATK · เดินแล้วสมาธิหาย · แรงขึ้นทุกเลเวล"
    },
    {
      "id": "ms_snipe",
      "name": "ยิงสไนป์จันทร์เงียบ",
      "thai": "สายสไนป์จันทร์",
      "icon": "sk_ms_snipe",
      "iconUrl": "https://play.nightcamp.app/cas/ca2f5faf5a02.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ยิงสไนป์ Lv.1",
      "prereq": [
        {
          "skill": "rg_snipe",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"ยิงสไนป์\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · ศรแสงจันทร์ยิงซ้ำที่เป้า (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "ms_piercer",
      "name": "ศรจันทร์ทะลวง",
      "thai": "สายสไนป์จันทร์",
      "icon": "sk_ms_piercer",
      "iconUrl": "https://play.nightcamp.app/cas/b2b3c961dacb.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ธนูใบไม้ทะลวง Lv.1",
      "prereq": [
        {
          "skill": "rg_piercer",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"ธนูใบไม้ทะลวง\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · เสาแสงจันทร์ผ่าลงเป้า (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "ms_trap",
      "name": "กับดักจันทร์แตก",
      "thai": "สายพรานจันทร์",
      "icon": "sk_ms_trap",
      "iconUrl": "https://play.nightcamp.app/cas/8792c208c3d7.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "กับดักระเบิด Lv.1",
      "prereq": [
        {
          "skill": "rg_trap",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"กับดักระเบิด\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · คลื่นแสงจันทร์แผ่จากกับดัก (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "ms_triple",
      "name": "ห่าศรแสงจันทร์",
      "thai": "สายพรานจันทร์",
      "icon": "sk_ms_triple",
      "iconUrl": "https://play.nightcamp.app/cas/711d2d316ad2.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ยิงสามดอก Lv.1",
      "prereq": [
        {
          "skill": "rg_triple",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"ยิงสามดอก\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · ห่าศรแสงตกใส่รอบเป้า (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "ms_awaken",
      "name": "ร่างพรานจันทร์",
      "thai": "สายร่างตื่น",
      "icon": "sk_ms_awaken",
      "iconUrl": "https://play.nightcamp.app/cas/67931a26e87a.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "passive",
      "req": "สมาธิใต้จันทร์ Lv.3",
      "prereq": [
        {
          "skill": "ms_still",
          "level": 3
        }
      ],
      "desc": "ใช้สกิลที่ปลุกพลังแล้ว วงจันทร์ใต้เท้าเต็ม ร่างตื่นเอง 10 วิ: สกิลที่ปลุกพลังแรงขึ้นอีก 12% เอฟเฟกต์ออกเพิ่ม 1 ครั้ง · ตีปกติยิงศรแสงไปอีก 2 เป้าข้าง ๆ 40% ความเร็วโจมตี +15% · ร่างตื่นนานขึ้น 2 วิ และแรงขึ้นทุกเลเวล"
    }
  ],
  "packalpha": [
    {
      "id": "pa_howl",
      "name": "หมาป่าวิญญาณ",
      "thai": "สายหมาป่าวิญญาณ",
      "icon": "sk_pa_howl",
      "iconUrl": "https://play.nightcamp.app/cas/339c5071ce73.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "passive",
      "desc": "ระหว่างสู้ ทุก 5.8 วิ หมาป่าวิญญาณพุ่งทะลุเป้าใกล้สุดและทุกตัวในแนว 100% ของ ATK · สัตว์เรียกแรงขึ้น 3% ATK +1% · ถี่ขึ้นและแรงขึ้นทุกเลเวล"
    },
    {
      "id": "pa_command",
      "name": "สั่งขย้ำจ่าฝูง",
      "thai": "สายหมาป่าจันทร์",
      "icon": "sk_pa_command",
      "iconUrl": "https://play.nightcamp.app/cas/f58d6387881e.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "สั่งขย้ำ Lv.1",
      "prereq": [
        {
          "skill": "wh_command",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"สั่งขย้ำ\": แรงขึ้น 2.5% · เขี้ยววิญญาณขย้ำซ้ำ (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "pa_pack",
      "name": "ฝูงวิญญาณจันทร์",
      "thai": "สายหมาป่าจันทร์",
      "icon": "sk_pa_pack",
      "iconUrl": "https://play.nightcamp.app/cas/1780ca5a94c8.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ฝูงหมาป่าวิญญาณ Lv.1",
      "prereq": [
        {
          "skill": "wh_pack",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"ฝูงหมาป่าวิญญาณ\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · คลื่นหอนแผ่จากเป้า (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "pa_blitz",
      "name": "เหยี่ยวจันทร์โฉบ",
      "thai": "สายนักล่าจันทร์",
      "icon": "sk_pa_blitz",
      "iconUrl": "https://play.nightcamp.app/cas/6c371610d07c.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "เหยี่ยวโฉบล่า Lv.1",
      "prereq": [
        {
          "skill": "wh_blitz",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"เหยี่ยวโฉบล่า\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · ห่าขนนกแสงตกใส่ (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "pa_fang",
      "name": "ธนูเขี้ยวจ่าฝูง",
      "thai": "สายนักล่าจันทร์",
      "icon": "sk_pa_fang",
      "iconUrl": "https://play.nightcamp.app/cas/d9e96434d092.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ธนูเขี้ยวหมาป่า Lv.1",
      "prereq": [
        {
          "skill": "wh_fang",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"ธนูเขี้ยวหมาป่า\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · เขี้ยวหมาป่ากระจายออกจากเป้า (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "pa_awaken",
      "name": "ร่างจ่าฝูง",
      "thai": "สายร่างตื่น",
      "icon": "sk_pa_awaken",
      "iconUrl": "https://play.nightcamp.app/cas/bbc511dfdc95.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "passive",
      "req": "หมาป่าวิญญาณ Lv.3",
      "prereq": [
        {
          "skill": "pa_howl",
          "level": 3
        }
      ],
      "desc": "ใช้สกิลที่ปลุกพลังแล้ว วงจันทร์ใต้เท้าเต็ม ร่างตื่นเอง 10 วิ: สกิลที่ปลุกพลังแรงขึ้นอีก 12% เอฟเฟกต์ออกเพิ่ม 1 ครั้ง · หอนเสริมทีม ATK +10% หมาป่าวิญญาณพุ่งถี่ขึ้นสองเท่า ATK +10% ความเร็วโจมตี +10% · ร่างตื่นนานขึ้น 2 วิ และแรงขึ้นทุกเลเวล"
    }
  ],
  "maestro": [
    {
      "id": "mt_band",
      "name": "วงดนตรีแห่งป่า",
      "thai": "สายวงดนตรีแห่งป่า",
      "icon": "sk_mt_band",
      "iconUrl": "https://play.nightcamp.app/cas/b7837a92c59c.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "passive",
      "desc": "ระหว่างเล่นเพลงหรือระบำ วงดนตรีสัตว์ป่า (กบตีกลอง นกฮูกเป่าขลุ่ย) บรรเลงยิงโน้ตทองใส่ศัตรู 2 ตัวทุก 2 วิ ตัวละ 100% ของ ATK · Lv5 ยิง 3 ตัว · แรงขึ้นทุกเลเวล"
    },
    {
      "id": "mt_twirl",
      "name": "ระบำควงไฟทองคำ",
      "thai": "สายระบำทองคำ",
      "icon": "sk_mt_twirl",
      "iconUrl": "https://play.nightcamp.app/cas/939ddf839e97.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ระบำควงไฟ Lv.1",
      "prereq": [
        {
          "skill": "bd_twirl",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"ระบำควงไฟ\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · วงไฟทองแผ่จากเป้า (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "mt_lash",
      "name": "ฟาดแส้ดาวตก",
      "thai": "สายระบำทองคำ",
      "icon": "sk_mt_lash",
      "iconUrl": "https://play.nightcamp.app/cas/6769d3d3c46f.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ฟาดแส้ดึง Lv.1",
      "prereq": [
        {
          "skill": "bd_lash",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"ฟาดแส้ดึง\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · ประกายดาวกระโดดต่อ 3–4 ตัว (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "mt_note",
      "name": "โน้ตทองคำ",
      "thai": "สายโน้ตทองคำ",
      "icon": "sk_mt_note",
      "iconUrl": "https://play.nightcamp.app/cas/a595f901c9f8.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "โน้ตเด้ง Lv.1",
      "prereq": [
        {
          "skill": "bd_note",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"โน้ตเด้ง\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · โน้ตทองแตกกระจายจากเป้า (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "mt_rain",
      "name": "ฝนโน้ตทองคำ",
      "thai": "สายโน้ตทองคำ",
      "icon": "sk_mt_rain",
      "iconUrl": "https://play.nightcamp.app/cas/b09b498b619f.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ฝนโน้ต Lv.1",
      "prereq": [
        {
          "skill": "bd_noterain",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"ฝนโน้ต\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · ห่าโน้ตทองตกใส่ (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "mt_awaken",
      "name": "ร่างวาทยกร",
      "thai": "สายร่างตื่น",
      "icon": "sk_mt_awaken",
      "iconUrl": "https://play.nightcamp.app/cas/d8b5101df71c.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "passive",
      "req": "วงดนตรีแห่งป่า Lv.3",
      "prereq": [
        {
          "skill": "mt_band",
          "level": 3
        }
      ],
      "desc": "ใช้สกิลที่ปลุกพลังแล้ว วงจันทร์ใต้เท้าเต็ม ร่างตื่นเอง 10 วิ: สกิลที่ปลุกพลังแรงขึ้นอีก 12% เอฟเฟกต์ออกเพิ่ม 1 ครั้ง · วงดนตรียิงถี่ขึ้นสองเท่า DEX +10 ความเร็วโจมตี +10% · ร่างตื่นนานขึ้น 2 วิ และแรงขึ้นทุกเลเวล"
    }
  ],
  "outlaw": [
    {
      "id": "ol_deadeye",
      "name": "เที่ยงคืนตรง",
      "thai": "สายเที่ยงคืนตรง",
      "icon": "sk_ol_deadeye",
      "iconUrl": "https://play.nightcamp.app/cas/1080137789a5.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "passive",
      "desc": "ยิงปกติครบ 12 นัด เวลาช้าลงชั่วครู่ เล็ง 3 เป้าใกล้สุดแล้วยิงพร้อมกัน นัดละ 100% ของ ATK · Lv5 4 เป้า · Lv10 5 เป้า · แรงขึ้นทุกเลเวล"
    },
    {
      "id": "ol_triple",
      "name": "รัวค้อนเที่ยงคืน",
      "thai": "สายปืนพกเที่ยงคืน",
      "icon": "sk_ol_triple",
      "iconUrl": "https://play.nightcamp.app/cas/bb18a9c86104.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "รัวค้อนปืน Lv.1",
      "prereq": [
        {
          "skill": "gs_triple",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"รัวค้อนปืน\": คูลดาวน์ลดลง 0.1 วิ วงกว้างขึ้น 2% · กระสุนเงายิงตามทุกนัด (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "ol_ricochet",
      "name": "กระสุนสะท้อนดาว",
      "thai": "สายปืนพกเที่ยงคืน",
      "icon": "sk_ol_ricochet",
      "iconUrl": "https://play.nightcamp.app/cas/5ca1647f2fa3.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "กระสุนสะท้อน Lv.1",
      "prereq": [
        {
          "skill": "gs_ricochet",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"กระสุนสะท้อน\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · กระสุนแดงกระโดดต่อ 3–4 ตัว (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "ol_buckshot",
      "name": "ลูกปรายดาวแดง",
      "thai": "สายลูกซองเที่ยงคืน",
      "icon": "sk_ol_buckshot",
      "iconUrl": "https://play.nightcamp.app/cas/bffa429e6637.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ลูกปรายกระจาย Lv.1",
      "prereq": [
        {
          "skill": "gs_buckshot",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"ลูกปรายกระจาย\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · ดาวแดงแตกกระจายจากเป้า (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "ol_stars",
      "name": "ยิงดาวตกนับร้อย",
      "thai": "สายลูกซองเที่ยงคืน",
      "icon": "sk_ol_stars",
      "iconUrl": "https://play.nightcamp.app/cas/0ecf5e3ba87e.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ยิงดาวตก Lv.1",
      "prereq": [
        {
          "skill": "gs_stars",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"ยิงดาวตก\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · ห่าดาวตกลงใส่ (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "ol_awaken",
      "name": "ร่างมือปืนเที่ยงคืน",
      "thai": "สายร่างตื่น",
      "icon": "sk_ol_awaken",
      "iconUrl": "https://play.nightcamp.app/cas/a7063f93d7c0.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "passive",
      "req": "เที่ยงคืนตรง Lv.3",
      "prereq": [
        {
          "skill": "ol_deadeye",
          "level": 3
        }
      ],
      "desc": "ใช้สกิลที่ปลุกพลังแล้ว วงจันทร์ใต้เท้าเต็ม ร่างตื่นเอง 10 วิ: สกิลที่ปลุกพลังแรงขึ้นอีก 12% เอฟเฟกต์ออกเพิ่ม 1 ครั้ง · ไม่ต้องบรรจุกระสุน เที่ยงคืนตรงเล็งเพิ่ม 1 เป้า · ร่างตื่นนานขึ้น 2 วิ และแรงขึ้นทุกเลเวล"
    }
  ],
  "eclipse": [
    {
      "id": "ec_dark",
      "name": "สะสมความมืด",
      "thai": "สายสะสมความมืด",
      "icon": "sk_ec_dark",
      "iconUrl": "https://play.nightcamp.app/cas/2c3dde7f419c.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "passive",
      "desc": "ตีคริได้ความมืด 1 ชั้น (สูงสุด 10) · ครบ 10 สกิลถัดไปเรียก \"จันทรคราส\" ฟัน 3 เป้าใกล้สุด ตัวละ 100% ของ ATK คริแน่นอน · แรงขึ้นทุกเลเวล"
    },
    {
      "id": "ec_twin",
      "name": "เขี้ยวคู่คราส",
      "thai": "สายคริคราส",
      "icon": "sk_ec_twin",
      "iconUrl": "https://play.nightcamp.app/cas/5e9c78ce65fc.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "เขี้ยวคู่ Lv.1",
      "prereq": [
        {
          "skill": "as_twin",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"เขี้ยวคู่\": คูลดาวน์ลดลง 0.1 วิ วงกว้างขึ้น 2% · เงามีดฟันไขว้ซ้ำ (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "ec_meteor",
      "name": "อุกกาบาตเงาคราส",
      "thai": "สายคริคราส",
      "icon": "sk_ec_meteor",
      "iconUrl": "https://play.nightcamp.app/cas/5496ead8fced.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "อุกกาบาตเงา Lv.1",
      "prereq": [
        {
          "skill": "as_meteor",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"อุกกาบาตเงา\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · วงคราสสีทองแผ่จากเป้า (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "ec_grim",
      "name": "เขี้ยวมัจจุราชคราส",
      "thai": "สายพิษคราส",
      "icon": "sk_ec_grim",
      "iconUrl": "https://play.nightcamp.app/cas/e159824d3c46.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "เขี้ยวมัจจุราช Lv.1",
      "prereq": [
        {
          "skill": "as_grimtooth",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"เขี้ยวมัจจุราช\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · หนามเงาพุ่งจากพื้นเป็นแนว (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "ec_splash",
      "name": "ระเบิดพิษคราส",
      "thai": "สายพิษคราส",
      "icon": "sk_ec_splash",
      "iconUrl": "https://play.nightcamp.app/cas/1ccea908b866.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ระเบิดพิษ Lv.1",
      "prereq": [
        {
          "skill": "as_splasher",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"ระเบิดพิษ\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · เศษพิษกระจายจากเป้า (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "ec_awaken",
      "name": "ร่างจันทรคราส",
      "thai": "สายร่างตื่น",
      "icon": "sk_ec_awaken",
      "iconUrl": "https://play.nightcamp.app/cas/ac906cb6433b.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "passive",
      "req": "สะสมความมืด Lv.3",
      "prereq": [
        {
          "skill": "ec_dark",
          "level": 3
        }
      ],
      "desc": "ใช้สกิลที่ปลุกพลังแล้ว วงจันทร์ใต้เท้าเต็ม ร่างตื่นเอง 10 วิ: สกิลที่ปลุกพลังแรงขึ้นอีก 12% เอฟเฟกต์ออกเพิ่ม 1 ครั้ง · คริ +10 ดาเมจคริ +10% · ร่างตื่นนานขึ้น 2 วิ และแรงขึ้นทุกเลเวล"
    }
  ],
  "shadowlord": [
    {
      "id": "sl_legion",
      "name": "ร่างเงาถาวร",
      "thai": "สายร่างเงาถาวร",
      "icon": "sk_sl_legion",
      "iconUrl": "https://play.nightcamp.app/cas/476c90653ddc.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "passive",
      "desc": "ร่างเงา 1 ร่างยืนข้างตัว ทุกครั้งที่สกิลโดน ร่างเงาทำซ้ำ 16.5% ของฮิตนั้น (ครั้งละ 1 ร่าง) · Lv5 ร่างเงา 2 ร่าง · ซ้ำแรงขึ้นทุกเลเวล"
    },
    {
      "id": "sl_huuma",
      "name": "ดาวยักษ์พายุเงา",
      "thai": "สายซัดเงา",
      "icon": "sk_sl_huuma",
      "iconUrl": "https://play.nightcamp.app/cas/e07f9703476c.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ขว้างดาวยักษ์วกกลับ Lv.1",
      "prereq": [
        {
          "skill": "sh_huuma",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"ขว้างดาวยักษ์วกกลับ\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · เศษเงาคมกระจายจากเป้า (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "sl_katon",
      "name": "คาถาไฟเงาม่วง",
      "thai": "สายซัดเงา",
      "icon": "sk_sl_katon",
      "iconUrl": "https://play.nightcamp.app/cas/3f8b1111653d.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "คาถาไฟ Lv.1",
      "prereq": [
        {
          "skill": "sh_katon",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"คาถาไฟ\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · เสาไฟสีม่วงผ่าลงเป้า (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "sl_raiton",
      "name": "คาถาสายฟ้าร้อยร่าง",
      "thai": "สายคาถาเงา",
      "icon": "sk_sl_raiton",
      "iconUrl": "https://play.nightcamp.app/cas/a11c04620421.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "คาถาสายฟ้า Lv.1",
      "prereq": [
        {
          "skill": "sh_raiton",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"คาถาสายฟ้า\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · สายฟ้ากระโดดต่อ 3–4 ตัว (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "sl_wind",
      "name": "ใบมีดวายุเงา",
      "thai": "สายคาถาเงา",
      "icon": "sk_sl_wind",
      "iconUrl": "https://play.nightcamp.app/cas/d24d509f8ab1.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ใบมีดวายุ Lv.1",
      "prereq": [
        {
          "skill": "sh_windblade",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"ใบมีดวายุ\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · เงาใบมีดลมฟันซ้ำ (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "sl_awaken",
      "name": "ร่างจ้าวเงา",
      "thai": "สายร่างตื่น",
      "icon": "sk_sl_awaken",
      "iconUrl": "https://play.nightcamp.app/cas/d1ab9627db4a.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ร่างเงาถาวร Lv.3",
      "prereq": [
        {
          "skill": "sl_legion",
          "level": 3
        }
      ],
      "desc": "ใช้สกิลที่ปลุกพลังแล้ว วงจันทร์ใต้เท้าเต็ม ร่างตื่นเอง 10 วิ: สกิลที่ปลุกพลังแรงขึ้นอีก 12% เอฟเฟกต์ออกเพิ่ม 1 ครั้ง · ร่างเงาเพิ่ม 2 ร่าง ทำซ้ำแรงขึ้น 30% AGI +10 · ร่างตื่นนานขึ้น 2 วิ และแรงขึ้นทุกเลเวล"
    }
  ],
  "harvester": [
    {
      "id": "hv_phase",
      "name": "จันทร์เก็บเกี่ยว",
      "thai": "สายจันทร์เก็บเกี่ยว",
      "icon": "sk_hv_phase",
      "iconUrl": "https://play.nightcamp.app/cas/4eb9729daa0a.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "passive",
      "desc": "เกี่ยววิญญาณได้ดวงละ จันทร์ขึ้น 1 ข้าง ครบ 8 ข้าง สกิลถัดไปฟันเสี้ยวจันทร์ยักษ์กว้าง 420 100% ของ ATK ศัตรูที่โดนวิญญาณสุกทันที · กลางคืนครบ 4 รอยก็สุก · แรงขึ้นทุกเลเวล"
    },
    {
      "id": "hv_sweep",
      "name": "ฟันเก็บเกี่ยวจันทร์",
      "thai": "สายเคียวจันทร์",
      "icon": "sk_hv_sweep",
      "iconUrl": "https://play.nightcamp.app/cas/6e01e207cdcd.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ฟันเก็บเกี่ยว Lv.1",
      "prereq": [
        {
          "skill": "rp_sweep",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"ฟันเก็บเกี่ยว\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · วงเสี้ยวจันทร์แผ่จากเป้า (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "hv_execute",
      "name": "ประหารจันทร์เต็มดวง",
      "thai": "สายเคียวจันทร์",
      "icon": "sk_hv_execute",
      "iconUrl": "https://play.nightcamp.app/cas/31ae0b0ccb1f.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ประหารใต้จันทร์ Lv.1",
      "prereq": [
        {
          "skill": "rp_execute",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"ประหารใต้จันทร์\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · เสาแสงจันทร์ผ่าลงเป้า (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "hv_return",
      "name": "เคียววกกลับจันทร์",
      "thai": "สายเคียวคู่จันทร์",
      "icon": "sk_hv_return",
      "iconUrl": "https://play.nightcamp.app/cas/ce285f429b8f.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ขว้างเคียววกกลับ Lv.1",
      "prereq": [
        {
          "skill": "rp_return",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"ขว้างเคียววกกลับ\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · เงาเคียวฟันซ้ำ (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "hv_hook",
      "name": "เกี่ยววิญญาณจันทร์",
      "thai": "สายเคียวคู่จันทร์",
      "icon": "sk_hv_hook",
      "iconUrl": "https://play.nightcamp.app/cas/f40d2ccc3d4c.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "เกี่ยววิญญาณ Lv.1",
      "prereq": [
        {
          "skill": "rp_hook",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"เกี่ยววิญญาณ\": แรงขึ้น 2.5% · โซ่วิญญาณกระโดดต่อ 3–4 ตัว (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "hv_awaken",
      "name": "ร่างผู้เก็บเกี่ยว",
      "thai": "สายร่างตื่น",
      "icon": "sk_hv_awaken",
      "iconUrl": "https://play.nightcamp.app/cas/b0413cd1aeea.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "passive",
      "req": "จันทร์เก็บเกี่ยว Lv.3",
      "prereq": [
        {
          "skill": "hv_phase",
          "level": 3
        }
      ],
      "desc": "ใช้สกิลที่ปลุกพลังแล้ว วงจันทร์ใต้เท้าเต็ม ร่างตื่นเอง 10 วิ: สกิลที่ปลุกพลังแรงขึ้นอีก 12% เอฟเฟกต์ออกเพิ่ม 1 ครั้ง · เกี่ยววิญญาณครั้งหนึ่งได้ 2 ดวง ATK +10% เดินเร็วขึ้น 10% · ร่างตื่นนานขึ้น 2 วิ และแรงขึ้นทุกเลเวล"
    }
  ],
  "showmaster": [
    {
      "id": "so_acts",
      "name": "การแสดงสามองก์",
      "thai": "สายการแสดงสามองก์",
      "icon": "sk_so_acts",
      "iconUrl": "https://play.nightcamp.app/cas/34fdff46e886.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "passive",
      "desc": "ใช้สกิลครบ 3 ครั้งภายใน 6 วิ ม่านทองปิดฉากที่เป้า ระเบิดวงกว้าง 240 100% ของ ATK · หุ่นรบแรงขึ้น 2% · แรงขึ้นทุกเลเวล"
    },
    {
      "id": "so_dance",
      "name": "ระบำหุ่นยักษ์",
      "thai": "สายหุ่นทองคำ",
      "icon": "sk_so_dance",
      "iconUrl": "https://play.nightcamp.app/cas/00709736c9d2.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ระบำหุ่น Lv.1",
      "prereq": [
        {
          "skill": "pp_dance",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"ระบำหุ่น\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · วงทองแผ่จากเป้า (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "so_swap",
      "name": "สลับร่างละคร",
      "thai": "สายหุ่นทองคำ",
      "icon": "sk_so_swap",
      "iconUrl": "https://play.nightcamp.app/cas/064cb3f3f49a.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "สลับร่างหุ่น Lv.1",
      "prereq": [
        {
          "skill": "pp_swap",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"สลับร่างหุ่น\": วงกว้างขึ้น 2% · สลับร่างแล้วเศษทองกระจายรอบตัว 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "so_stretch",
      "name": "ขึงด้ายทองคำ",
      "thai": "สายด้ายทองคำ",
      "icon": "sk_so_stretch",
      "iconUrl": "https://play.nightcamp.app/cas/cf2839f1080d.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ขึงด้ายเหล็ก Lv.1",
      "prereq": [
        {
          "skill": "pp_stretch",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"ขึงด้ายเหล็ก\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · ด้ายทองกระโดดต่อ 3–4 ตัว (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "so_bind",
      "name": "รัดด้ายทองคำ",
      "thai": "สายด้ายทองคำ",
      "icon": "sk_so_bind",
      "iconUrl": "https://play.nightcamp.app/cas/79fdf2dac36d.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "รัดด้าย Lv.1",
      "prereq": [
        {
          "skill": "pp_bind",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"รัดด้าย\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · เสาทองผ่าลงเป้า (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "so_awaken",
      "name": "ร่างจ้าวโรงหุ่น",
      "thai": "สายร่างตื่น",
      "icon": "sk_so_awaken",
      "iconUrl": "https://play.nightcamp.app/cas/c7e6133837f0.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "passive",
      "req": "การแสดงสามองก์ Lv.3",
      "prereq": [
        {
          "skill": "so_acts",
          "level": 3
        }
      ],
      "desc": "ใช้สกิลที่ปลุกพลังแล้ว วงจันทร์ใต้เท้าเต็ม ร่างตื่นเอง 10 วิ: สกิลที่ปลุกพลังแรงขึ้นอีก 12% เอฟเฟกต์ออกเพิ่ม 1 ครั้ง · หุ่นอัศวินยักษ์โผล่ข้างตัว หุ่นรบแรงขึ้น 50% DEX +10 · ร่างตื่นนานขึ้น 2 วิ และแรงขึ้นทุกเลเวล"
    }
  ],
  "starsaint": [
    {
      "id": "ss_faith",
      "name": "ศรัทธาแสงดาว",
      "thai": "สายศรัทธาแสงดาว",
      "icon": "sk_ss_faith",
      "iconUrl": "https://play.nightcamp.app/cas/389e01c86ac3.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "passive",
      "desc": "ดาเมจธาตุแสง +1.5% MATK +1% · ทุกครั้งที่เราฮีล ได้ศรัทธา 3 แต้ม และฮีลที่ล้นหลอด (1% ของ HP คนนั้น = 1 แต้ม) · เต็ม 100 ดาวพิพากษาตกใส่ศัตรู 3 ตัวใกล้สุด ตัวละ 100% ของ MATK ธาตุแสง · แรงขึ้นทุกเลเวล"
    },
    {
      "id": "ss_heal",
      "name": "เยียวยาแสงดาว",
      "thai": "สายเยียวยาแสงดาว",
      "icon": "sk_ss_heal",
      "iconUrl": "https://play.nightcamp.app/cas/8c4b0ffee179.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "วงแสงเยียวยา Lv.1",
      "prereq": [
        {
          "skill": "bi_heal",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"วงแสงเยียวยา\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · ฮีลตัวเราและเพื่อนรอบตัวอีกก้อนตาม MATK ดาวร่วงรอบตัว 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "ss_sanct",
      "name": "ลานแสงดวงดาว",
      "thai": "สายเยียวยาแสงดาว",
      "icon": "sk_ss_sanct",
      "iconUrl": "https://play.nightcamp.app/cas/416041caa899.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ลานแสงเยียวยา Lv.1",
      "prereq": [
        {
          "skill": "bi_sanctuary",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"ลานแสงเยียวยา\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · ฮีลทั้งทีมอีกก้อนตอนร่าย 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "ss_turn",
      "name": "ขับไล่ด้วยแสงดาว",
      "thai": "สายพิพากษาแสงดาว",
      "icon": "sk_ss_turn",
      "iconUrl": "https://play.nightcamp.app/cas/d42a6a07ab07.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ขับไล่อมตะ Lv.1",
      "prereq": [
        {
          "skill": "bi_turnundead",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"ขับไล่อมตะ\": แรงขึ้น 2.5% · เสาแสงดาวผ่าลงเป้า (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "ss_lex",
      "name": "ตราดาวพิพากษา",
      "thai": "สายพิพากษาแสงดาว",
      "icon": "sk_ss_lex",
      "iconUrl": "https://play.nightcamp.app/cas/a30712f69574.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ตราแสงตรึง Lv.1",
      "prereq": [
        {
          "skill": "bi_lexdivina",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"ตราแสงตรึง\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · ห่าดาวตกใส่รอบเป้า (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "ss_awaken",
      "name": "ร่างนักบุญ",
      "thai": "สายร่างตื่น",
      "icon": "sk_ss_awaken",
      "iconUrl": "https://play.nightcamp.app/cas/0be4b38caafb.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ศรัทธาแสงดาว Lv.3",
      "prereq": [
        {
          "skill": "ss_faith",
          "level": 3
        }
      ],
      "desc": "ใช้สกิลที่ปลุกพลังแล้ว วงจันทร์ใต้เท้าเต็ม ร่างตื่นเอง 10 วิ: สกิลที่ปลุกพลังแรงขึ้นอีก 12% เอฟเฟกต์ออกเพิ่ม 1 ครั้ง · ฮีลแรงขึ้น 30% ทีมรอบตัวรับดาเมจลดลง 20% · ร่างตื่นนานขึ้น 2 วิ และแรงขึ้นทุกเลเวล"
    }
  ],
  "meteorfist": [
    {
      "id": "mf_combo",
      "name": "คอมโบดาวตก",
      "thai": "สายคอมโบดาวตก",
      "icon": "sk_mf_combo",
      "iconUrl": "https://play.nightcamp.app/cas/a66ba9e7d9d7.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "passive",
      "desc": "ทุกฮิต (ตีปกติและสกิล) ต่อคอมโบ (ขาดเกิน 2 วิ เริ่มใหม่) · ทุก 20 ฮิต ดาวตกลงใส่เป้า 100% ของ ATK ธาตุไฟ วงกว้าง 130 · แรงขึ้นทุกเลเวล"
    },
    {
      "id": "mf_storm",
      "name": "ชุดหมัดดาวตก",
      "thai": "สายคอมโบดาวตก",
      "icon": "sk_mf_storm",
      "iconUrl": "https://play.nightcamp.app/cas/aacdbf8e9e7a.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ชุดหมัดพายุ Lv.1",
      "prereq": [
        {
          "skill": "mo_combo",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"ชุดหมัดพายุ\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · ห่าดาวตกเล็กลงใส่รอบเป้า (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "mf_palms",
      "name": "ฝ่ามือร้อยดาว",
      "thai": "สายคอมโบดาวตก",
      "icon": "sk_mf_palms",
      "iconUrl": "https://play.nightcamp.app/cas/e66f36bf9bbe.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ฝ่ามือร้อยทิศ Lv.1",
      "prereq": [
        {
          "skill": "mo_palms",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"ฝ่ามือร้อยทิศ\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · ฝ่ามือไฟฟาดซ้ำ (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "mf_impact",
      "name": "ฝ่ามือทะลวงดาวตก",
      "thai": "สายปราณดาวตก",
      "icon": "sk_mf_impact",
      "iconUrl": "https://play.nightcamp.app/cas/9dae8fe15acf.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ฝ่ามือทะลวงปราณ Lv.1",
      "prereq": [
        {
          "skill": "mo_impact",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"ฝ่ามือทะลวงปราณ\": แรงขึ้น 2.5% · เสาไฟผ่าลงเป้า (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "mf_crush",
      "name": "หมัดดาวตกถล่มฟ้า",
      "thai": "สายปราณดาวตก",
      "icon": "sk_mf_crush",
      "iconUrl": "https://play.nightcamp.app/cas/a2aed2340c5c.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "หมัดสิ้นปราณ Lv.1",
      "prereq": [
        {
          "skill": "mo_asura",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"หมัดสิ้นปราณ\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · คลื่นระเบิดไฟแผ่จากเป้า (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "mf_awaken",
      "name": "ร่างเพลิงปราณ",
      "thai": "สายร่างตื่น",
      "icon": "sk_mf_awaken",
      "iconUrl": "https://play.nightcamp.app/cas/ac69820bdc8e.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "passive",
      "req": "คอมโบดาวตก Lv.3",
      "prereq": [
        {
          "skill": "mf_combo",
          "level": 3
        }
      ],
      "desc": "ใช้สกิลที่ปลุกพลังแล้ว วงจันทร์ใต้เท้าเต็ม ร่างตื่นเอง 10 วิ: สกิลที่ปลุกพลังแรงขึ้นอีก 12% เอฟเฟกต์ออกเพิ่ม 1 ครั้ง · ทุกหมัดเรียกดาวตกเล็ก 50% ความเร็วโจมตี +15% · ร่างตื่นนานขึ้น 2 วิ และแรงขึ้นทุกเลเวล"
    }
  ],
  "beacon": [
    {
      "id": "bc_beam",
      "name": "ลำแสงประภาคาร",
      "thai": "สายลำแสงประภาคาร",
      "icon": "sk_bc_beam",
      "iconUrl": "https://play.nightcamp.app/cas/f93a34d0d46b.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "passive",
      "desc": "ระหว่างสู้ ลำแสงประภาคารยาว 480 หมุนรอบตัว (รอบละ 4 วิ) ศัตรูในลำแสงโดน 100% ของ MATK ธาตุแสงทุก 0.4 วิ เพื่อนในลำแสงฟื้น HP 1% · แรงขึ้นทุกเลเวล"
    },
    {
      "id": "bc_swing",
      "name": "ฟาดเปลวประภาคาร",
      "thai": "สายคบเพลิงประภาคาร",
      "icon": "sk_bc_swing",
      "iconUrl": "https://play.nightcamp.app/cas/72eafbaae4d8.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ฟาดเปลวไฟ Lv.1",
      "prereq": [
        {
          "skill": "lk_swing",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"ฟาดเปลวไฟ\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · วงแสงแผ่จากเป้า (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "bc_flash",
      "name": "แสงไล่เงาประภาคาร",
      "thai": "สายคบเพลิงประภาคาร",
      "icon": "sk_bc_flash",
      "iconUrl": "https://play.nightcamp.app/cas/777de57bf292.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "แสงไล่เงา Lv.1",
      "prereq": [
        {
          "skill": "lk_flash",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"แสงไล่เงา\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · เสาแสงประภาคารผ่าลงเป้า (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "bc_flare",
      "name": "โคมเรืองรองประภาคาร",
      "thai": "สายโคมประภาคาร",
      "icon": "sk_bc_flare",
      "iconUrl": "https://play.nightcamp.app/cas/1df4fad744d4.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "โคมเรืองรอง Lv.1",
      "prereq": [
        {
          "skill": "lk_flare",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"โคมเรืองรอง\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · ฮีลทั้งทีมอีกก้อนตอนร่าย 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "bc_dawn",
      "name": "รุ่งอรุณประภาคาร",
      "thai": "สายโคมประภาคาร",
      "icon": "sk_bc_dawn",
      "iconUrl": "https://play.nightcamp.app/cas/be8d0fcaa98a.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "รุ่งอรุณ Lv.1",
      "prereq": [
        {
          "skill": "lk_dawn",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"รุ่งอรุณ\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · คลื่นแสงยักษ์แผ่จากเป้า (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "bc_awaken",
      "name": "ร่างผู้เฝ้าประภาคาร",
      "thai": "สายร่างตื่น",
      "icon": "sk_bc_awaken",
      "iconUrl": "https://play.nightcamp.app/cas/53152af8a690.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ลำแสงประภาคาร Lv.3",
      "prereq": [
        {
          "skill": "bc_beam",
          "level": 3
        }
      ],
      "desc": "ใช้สกิลที่ปลุกพลังแล้ว วงจันทร์ใต้เท้าเต็ม ร่างตื่นเอง 10 วิ: สกิลที่ปลุกพลังแรงขึ้นอีก 12% เอฟเฟกต์ออกเพิ่ม 1 ครั้ง · ลำแสงเพิ่มเป็น 3 ทาง ฮีลแรงขึ้น 20% MATK +10% · ร่างตื่นนานขึ้น 2 วิ และแรงขึ้นทุกเลเวล"
    }
  ],
  "starshepherd": [
    {
      "id": "st_merge",
      "name": "หลอมดวงดาว",
      "thai": "สายหลอมดวงดาว",
      "icon": "sk_st_merge",
      "iconUrl": "https://play.nightcamp.app/cas/10dc6a175ac6.webp",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "passive",
      "desc": "มีดวงไฟลอยรอบตัว 3 ดวงขึ้นไป ทุก 5.8 วิ หลอมเป็นดาวใหญ่ยิงใส่ศัตรูใกล้สุด 100% ของ MATK ธาตุแสง (ไม่เสียดวงไฟ) · ถี่ขึ้นและแรงขึ้นทุกเลเวล"
    },
    {
      "id": "st_latch",
      "name": "ดวงดาวเกาะเพื่อน",
      "thai": "สายดวงดาวรักษา",
      "icon": "sk_st_latch",
      "iconUrl": "https://play.nightcamp.app/cas/4c9358586398.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ส่งดวงไฟเกาะ Lv.1",
      "prereq": [
        {
          "skill": "ws_latch",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"ส่งดวงไฟเกาะ\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · ฮีลตัวเราและเพื่อนรอบตัวอีกก้อนตอนส่ง 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "st_burst",
      "name": "ดวงดาวแตกฮีล",
      "thai": "สายดวงดาวรักษา",
      "icon": "sk_st_burst",
      "iconUrl": "https://play.nightcamp.app/cas/89b900e51a1d.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ดวงไฟแตกฮีล Lv.1",
      "prereq": [
        {
          "skill": "ws_burst",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"ดวงไฟแตกฮีล\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · ฮีลทั้งทีมอีกก้อน ดาวร่วงรอบตัว 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "st_rush",
      "name": "ฝูงดาวพุ่ง",
      "thai": "สายดวงดาวโจมตี",
      "icon": "sk_st_rush",
      "iconUrl": "https://play.nightcamp.app/cas/c1de38945803.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ฝูงดวงไฟพุ่ง Lv.1",
      "prereq": [
        {
          "skill": "ws_rush",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"ฝูงดวงไฟพุ่ง\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · ห่าดาวตกใส่รอบเป้า (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "st_mark",
      "name": "ดาวติดศัตรู",
      "thai": "สายดวงดาวโจมตี",
      "icon": "sk_st_mark",
      "iconUrl": "https://play.nightcamp.app/cas/05e798f4497e.webp",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "passive",
      "req": "ดวงไฟติดศัตรู Lv.1",
      "prereq": [
        {
          "skill": "ws_mark",
          "level": 1
        }
      ],
      "desc": "ปลุกพลัง \"ดวงไฟติดศัตรู\": แรงขึ้น 2.5% วงกว้างขึ้น 2% · ประกายดาวกระโดดต่อ 3–4 ตัว (แรง 16.5% ของฮิตที่ปลุก) 1 ครั้งต่อการใช้ · Lv5 เอฟเฟกต์ออก 2 ครั้งและใหญ่ขึ้น · Lv10 ออก 3 ครั้ง"
    },
    {
      "id": "st_awaken",
      "name": "ร่างผู้เลี้ยงดวงดาว",
      "thai": "สายร่างตื่น",
      "icon": "sk_st_awaken",
      "iconUrl": "https://play.nightcamp.app/cas/db254ead1b2d.webp",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "passive",
      "req": "หลอมดวงดาว Lv.3",
      "prereq": [
        {
          "skill": "st_merge",
          "level": 3
        }
      ],
      "desc": "ใช้สกิลที่ปลุกพลังแล้ว วงจันทร์ใต้เท้าเต็ม ร่างตื่นเอง 10 วิ: สกิลที่ปลุกพลังแรงขึ้นอีก 12% เอฟเฟกต์ออกเพิ่ม 1 ครั้ง · ดาวใหญ่ยิงถี่ขึ้น 2.5 เท่า (ไม่ต้องมีดวงไฟครบ) MATK +10% · ร่างตื่นนานขึ้น 2 วิ และแรงขึ้นทุกเลเวล"
    }
  ]
};

let currentSkillBuilderTab = 'novice';
let skillBuilderSnapshot = null;
let skillBuilderNotice = '';

// 1. Update Class 1 and Class 2 Dropdowns in Plan Editor
function updateClassDropdownsInEditor() {
  const c1Sel = document.getElementById("plan-editor-class1");
  const c2Sel = document.getElementById("plan-editor-class2");
  const c3Badge = document.getElementById("plan-editor-class3-badge");
  if (!c1Sel || !c2Sel || !activeEditingPlan) return;

  const LEGACY_C1_MAP = { swordsman: 'knight', thief: 'rogue', acolyte: 'priest', merchant: 'knight' };
  const rawC1 = activeEditingPlan.class1Target || 'archer';
  const currentC1 = CLASS_TREE_MAP[rawC1] ? rawC1 : (LEGACY_C1_MAP[rawC1] || 'archer');
  activeEditingPlan.class1Target = currentC1;
  c1Sel.value = currentC1;

  const j1 = document.getElementById("plan-editor-class1-job");
  const j2 = document.getElementById("plan-editor-class2-job");
  if (j1) j1.value = activeEditingPlan.class1JobLevel || 10;
  if (j2) j2.value = activeEditingPlan.class2JobLevel || 50;

  const aqCb = document.getElementById("plan-editor-autoquest");
  if (aqCb) {
    aqCb.checked = activeEditingPlan.autoQuestEnabled !== false;
    aqCb.onchange = () => {
      activeEditingPlan.autoQuestEnabled = aqCb.checked;
      if (typeof markPlanDirty === 'function') markPlanDirty();
      refreshAutoJobUi();
    };
  }

  const autoCb = document.getElementById("plan-editor-autojob");
  if (autoCb) {
    autoCb.checked = typeof planAutoJobChangeOf === 'function' ? planAutoJobChangeOf(activeEditingPlan) : (activeEditingPlan.autoJobChange !== false);
    autoCb.onchange = () => {
      activeEditingPlan.autoJobChange = autoCb.checked;
      if (typeof markPlanDirty === 'function') markPlanDirty();
      refreshAutoJobUi();
    };
  }

  const statCb = document.getElementById("plan-editor-autostat");
  if (statCb) {
    statCb.checked = activeEditingPlan.autoStatSkillEnabled !== false;
    statCb.onchange = () => {
      activeEditingPlan.autoStatSkillEnabled = statCb.checked;
      if (typeof markPlanDirty === 'function') markPlanDirty();
      refreshAutoJobUi();
    };
  }

  const tree = CLASS_TREE_MAP[currentC1] || CLASS_TREE_MAP['archer'];
  c2Sel.innerHTML = tree.secondClasses.map(sc => `
    <option value="${sc.id}">${sc.name}</option>
  `).join('');

  if (activeEditingPlan.class2Target && tree.secondClasses.some(sc => sc.id === activeEditingPlan.class2Target)) {
    c2Sel.value = activeEditingPlan.class2Target;
  } else {
    activeEditingPlan.class2Target = tree.secondClasses[0].id;
    c2Sel.value = activeEditingPlan.class2Target;
  }

  const updateC3Preview = () => {
    const t = CLASS_TREE_MAP[activeEditingPlan.class1Target] || CLASS_TREE_MAP['archer'];
    const sc = t.secondClasses.find(s => s.id === activeEditingPlan.class2Target) || t.secondClasses[0];
    if (sc) {
      activeEditingPlan.class3Target = sc.class3Id;
      if (c3Badge) c3Badge.textContent = sc.class3Name || sc.class3Id;
    }
    if (typeof refreshAutoJobUi === 'function') refreshAutoJobUi();
  };
  updateC3Preview();

  const syncTriggerClassesWithDropdowns = () => {
    if (!activeEditingPlan || !Array.isArray(activeEditingPlan.triggers)) return;
    const c1 = activeEditingPlan.class1Target || 'priest';
    const c2 = activeEditingPlan.class2Target || 'bishop';
    for (const trig of activeEditingPlan.triggers) {
      if (!trig) continue;
      if (trig.type === 'job_level') {
        const cls = String(trig.classId || '').toLowerCase();
        if (cls === 'traveler' || cls === 'novice') {
          (trig.actions || []).forEach(a => { if (a && a.type === 'change_class') a.targetClass = c1; });
        } else if (CLASS_TREE_MAP[cls]) {
          trig.classId = c1;
          (trig.actions || []).forEach(a => { if (a && a.type === 'change_class') a.targetClass = c2; });
        }
      }
    }
    if (typeof renderPlanWorkflowCanvas === 'function') renderPlanWorkflowCanvas();
  };

  c1Sel.onchange = () => {
    activeEditingPlan.class1Target = c1Sel.value;
    const newTree = CLASS_TREE_MAP[c1Sel.value] || CLASS_TREE_MAP['priest'] || CLASS_TREE_MAP['archer'];
    c2Sel.innerHTML = newTree.secondClasses.map(sc => `
      <option value="${sc.id}">${sc.name}</option>
    `).join('');
    activeEditingPlan.class2Target = newTree.secondClasses[0].id;
    c2Sel.value = activeEditingPlan.class2Target;
    skillMetaCache = null;
    updateC3Preview();
    syncTriggerClassesWithDropdowns();
    if (typeof markPlanDirty === 'function') markPlanDirty();
    updatePlanEditorBadges();
  };

  c2Sel.onchange = () => {
    activeEditingPlan.class2Target = c2Sel.value;
    skillMetaCache = null;
    updateC3Preview();
    syncTriggerClassesWithDropdowns();
    if (typeof markPlanDirty === 'function') markPlanDirty();
    updatePlanEditorBadges();
  };
}

// 2. Update Plan Editor Badges (Skill count, Stat summary, Party summary)
function getPlanClass3Id(plan) {
  const p = plan || activeEditingPlan;
  if (!p) return 'moonsniper';
  if (p.class3Target && SKILLS_DATABASE[p.class3Target]) return p.class3Target;
  const c1 = p.class1Target || 'archer';
  const c2 = p.class2Target || 'ranger';
  const tree = CLASS_TREE_MAP[c1] || CLASS_TREE_MAP['archer'];
  const sc = tree?.secondClasses?.find(s => s.id === c2) || tree?.secondClasses?.[0];
  return sc?.class3Id || 'moonsniper';
}

function countPlannedFacets(plan) {
  const facets = plan && plan.skillBuild && plan.skillBuild.facets;
  if (!facets || typeof facets !== 'object') return 0;
  const c1 = plan.class1Target || 'archer';
  const c2 = plan.class2Target || 'ranger';
  const c3 = getPlanClass3Id(plan);
  const allowed = new Set(['novice', c1, c2, c3]);
  let total = 0;
  for (const [sId, arr] of Object.entries(facets)) {
    if (!Array.isArray(arr)) continue;
    const m = getSkillMeta(sId);
    if (m && !allowed.has(m.tier)) continue;
    arr.forEach(v => { if (typeof v === 'number' && v >= 0) total++; });
  }
  return total;
}

let currentSkillResetRound = 0; // 0 = รอบเริ่มต้น (ก่อนรีสกิล), 1 = หลังรีสกิล #1, 2 = หลังรีสกิล #2, ...

function listPlanSkillResetSteps(plan) {
  const p = plan || activeEditingPlan;
  if (!p || !Array.isArray(p.triggers)) return [];
  const steps = [];
  let roundNo = 0;
  for (const trig of p.triggers) {
    if (!trig || !Array.isArray(trig.actions)) continue;
    const whenText = typeof window.planWhenText === 'function'
      ? window.planWhenText(trig)
      : (trig.type === 'job_level' ? `Job Lv.${trig.targetLevel || 1}` : trig.type === 'zeny' ? `เงิน ≥ ${(Number(trig.targetZeny) || 0).toLocaleString()}g` : `Base Lv.${trig.targetLevel || 1}`);
    for (const act of trig.actions) {
      if (act && act.type === 'reset_skills') {
        roundNo++;
        steps.push({
          roundNo,
          actionId: act.id || `reset_${roundNo}`,
          triggerId: trig.id || '',
          whenText,
          resetMode: act.resetMode || 'auto'
        });
      }
    }
  }
  return steps;
}

function getResetSkillActionRoundNo(actionId) {
  if (!actionId) return 0;
  const steps = listPlanSkillResetSteps(activeEditingPlan);
  const found = steps.find(s => s.actionId === actionId);
  return found ? found.roundNo : 0;
}
window.listPlanSkillResetSteps = listPlanSkillResetSteps;
window.getResetSkillActionRoundNo = getResetSkillActionRoundNo;

function syncPlanSkillResetRounds(plan) {
  if (!plan || !plan.skillBuild) return [];
  const sb = plan.skillBuild;
  const steps = listPlanSkillResetSteps(plan);
  const oldRounds = Array.isArray(sb.resetRounds) ? sb.resetRounds : [];
  const usedOldIdx = new Set();

  const newRounds = steps.map((step, idx) => {
    let matchIdx = oldRounds.findIndex((r, i) => !usedOldIdx.has(i) && r && r.roundId && r.roundId === step.actionId);
    if (matchIdx === -1 && idx < oldRounds.length && !usedOldIdx.has(idx) && oldRounds[idx]) {
      matchIdx = idx;
    }
    if (matchIdx >= 0) usedOldIdx.add(matchIdx);
    const prev = matchIdx >= 0 ? oldRounds[matchIdx] : null;
    const rawQ = Array.isArray(prev?.skillPointQueue) ? prev.skillPointQueue : [];
    const autoOff = Array.isArray(prev?.autoOff) ? prev.autoOff : [];
    const facets = (prev?.facets && typeof prev.facets === 'object') ? prev.facets : {};
    const levels = {};
    rawQ.forEach(id => { levels[id] = (levels[id] || 0) + 1; });
    return {
      roundNo: step.roundNo,
      roundId: step.actionId,
      triggerId: step.triggerId,
      label: step.whenText,
      skillPointQueue: rawQ,
      plannedLevels: levels,
      autoOff,
      facets
    };
  });
  sb.resetRounds = newRounds;
  return newRounds;
}

function getActiveRoundSkillBuild(plan, roundIdx = currentSkillResetRound) {
  const p = plan || activeEditingPlan;
  if (!p) return null;
  normalizePlanSkillBuild(p);
  const rounds = syncPlanSkillResetRounds(p);
  if (roundIdx >= 1 && rounds[roundIdx - 1]) {
    return rounds[roundIdx - 1];
  }
  return p.skillBuild;
}

function switchSkillResetRound(roundNo) {
  if (!activeEditingPlan) return;
  const rounds = syncPlanSkillResetRounds(activeEditingPlan);
  const nextRound = (roundNo >= 1 && roundNo <= rounds.length) ? roundNo : 0;
  currentSkillResetRound = nextRound;
  const targetSb = getActiveRoundSkillBuild(activeEditingPlan, currentSkillResetRound);
  if (targetSb) {
    const fixed = repairSkillQueue(targetSb.skillPointQueue || [], true);
    targetSb.skillPointQueue = fixed.queue;
    targetSb.plannedLevels = fixed.levels;
  }
  skillBuilderNotice = '';
  renderSkillBuilderUI();
}
window.switchSkillResetRound = switchSkillResetRound;

function copySkillRoundFromPrevious() {
  if (!activeEditingPlan || currentSkillResetRound < 1) return;
  const prevSb = getActiveRoundSkillBuild(activeEditingPlan, currentSkillResetRound - 1);
  const curSb = getActiveRoundSkillBuild(activeEditingPlan, currentSkillResetRound);
  if (!prevSb || !curSb) return;
  if ((curSb.skillPointQueue || []).length > 0) {
    const prevName = currentSkillResetRound === 1 ? 'รอบเริ่มต้น (ก่อนรีสกิล)' : `รีสกิล #${currentSkillResetRound - 1}`;
    if (!confirm(`แทนที่คิวสกิลของ "รีสกิล #${currentSkillResetRound}" ด้วยคิวจาก "${prevName}" หรือไม่?`)) return;
  }
  curSb.skillPointQueue = [...(prevSb.skillPointQueue || [])];
  const levels = {};
  curSb.skillPointQueue.forEach(id => { levels[id] = (levels[id] || 0) + 1; });
  curSb.plannedLevels = levels;
  curSb.autoOff = [...(prevSb.autoOff || [])];
  skillBuilderNotice = `📋 คัดลอกลำดับสกิลมาจาก ${currentSkillResetRound === 1 ? 'รอบเริ่มต้น' : 'รีสกิล #' + (currentSkillResetRound - 1)} แล้ว (${curSb.skillPointQueue.length} แต้ม) สามารถปรับแก้ต่อได้เลย`;
  renderSkillBuilderUI();
}
window.copySkillRoundFromPrevious = copySkillRoundFromPrevious;

function normalizePlanSkillBuild(plan) {
  if (!plan) return;
  if (!plan.skillBuild || typeof plan.skillBuild !== 'object') {
    plan.skillBuild = { skillPointQueue: [], plannedLevels: {}, facets: {}, resetRounds: [] };
    return;
  }
  const sb = plan.skillBuild;
  if (!Array.isArray(sb.skillPointQueue)) sb.skillPointQueue = [];
  if (!sb.plannedLevels || typeof sb.plannedLevels !== 'object') sb.plannedLevels = {};
  if (!sb.facets || typeof sb.facets !== 'object') sb.facets = {};
  if (!Array.isArray(sb.resetRounds)) sb.resetRounds = [];
  if (sb.skillPointQueue.length === 0) {
    const c1 = plan.class1Target || 'archer';
    const c2 = plan.class2Target || 'ranger';
    const c3 = getPlanClass3Id(plan);
    const classMaps = [sb.novice, sb[c1], sb[c2], sb[c3]].filter(x => x && typeof x === 'object' && !Array.isArray(x));
    if (classMaps.length > 0) {
      const rawQ = [];
      const novObj = (sb.novice && typeof sb.novice === 'object') ? sb.novice : { 'mastery': 5, 'body': 4 };
      for (const [sId, cnt] of Object.entries(novObj)) {
        for (let i = 0; i < (Number(cnt) || 0); i++) rawQ.push(sId);
      }
      for (const tier of [c1, c2, c3]) {
        const obj = sb[tier];
        if (!obj || typeof obj !== 'object') continue;
        for (const [sId, cnt] of Object.entries(obj)) {
          for (let i = 0; i < (Number(cnt) || 0); i++) rawQ.push(sId);
        }
      }
      const prevPlan = activeEditingPlan;
      activeEditingPlan = plan;
      const fixed = repairSkillQueue(rawQ, true);
      activeEditingPlan = prevPlan;
      sb.skillPointQueue = fixed.queue;
      sb.plannedLevels = fixed.levels;
      delete sb.novice;
      delete sb[c1];
      delete sb[c2];
      delete sb[c3];
    }
  }
}

function normalizePlanPartyConfig(plan) {
  if (!plan) return;
  if (!plan.partyConfig || typeof plan.partyConfig !== 'object') {
    plan.partyConfig = {
      enabled: false,
      role: 'leader',
      partyTag: '',
      lootMode: 'f',
      groupMode: 'g',
      minLevel: 1,
      syncChannelAndMap: true,
      supFight: true,
      supHealPct: 70
    };
  }
  return plan.partyConfig;
}

function updatePartyConfigInEditor() {
  if (!activeEditingPlan) return;
  const pc = normalizePlanPartyConfig(activeEditingPlan);
  const cbEn = document.getElementById('plan-party-enabled');
  const selRole = document.getElementById('plan-party-role');
  const inTag = document.getElementById('plan-party-tag');
  const selLoot = document.getElementById('plan-party-loot');
  const selGroup = document.getElementById('plan-party-group');
  const inMinLv = document.getElementById('plan-party-minlv');
  const cbSyncMap = document.getElementById('plan-party-sync-map');
  const cbSupFight = document.getElementById('plan-party-sup-fight');
  const selSupHeal = document.getElementById('plan-party-sup-heal');

  if (cbEn) cbEn.checked = Boolean(pc.enabled);
  if (selRole) selRole.value = pc.role || 'leader';
  if (inTag) inTag.value = pc.partyTag || '';
  if (selLoot) selLoot.value = pc.lootMode || 'f';
  if (selGroup) selGroup.value = pc.groupMode || 'g';
  if (inMinLv) inMinLv.value = Math.max(1, parseInt(pc.minLevel, 10) || 1);
  if (cbSyncMap) cbSyncMap.checked = pc.syncChannelAndMap !== false;
  if (cbSupFight) cbSupFight.checked = pc.supFight !== false;
  if (selSupHeal) selSupHeal.value = String(pc.supHealPct || 70);

  const onChange = () => {
    readPartyConfigFromEditor();
    if (typeof markPlanDirty === 'function') markPlanDirty();
    updatePlanEditorBadges();
    if (typeof refreshAutoJobUi === 'function') refreshAutoJobUi();
  };
  [cbEn, selRole, inTag, selLoot, selGroup, inMinLv, cbSyncMap, cbSupFight, selSupHeal].forEach(el => {
    if (!el) return;
    el.onchange = onChange;
    if (el.tagName === 'INPUT' && el.type === 'text') el.oninput = onChange;
  });
}

function readPartyConfigFromEditor() {
  if (!activeEditingPlan) return null;
  const pc = normalizePlanPartyConfig(activeEditingPlan);
  const cbEn = document.getElementById('plan-party-enabled');
  const selRole = document.getElementById('plan-party-role');
  const inTag = document.getElementById('plan-party-tag');
  const selLoot = document.getElementById('plan-party-loot');
  const selGroup = document.getElementById('plan-party-group');
  const inMinLv = document.getElementById('plan-party-minlv');
  const cbSyncMap = document.getElementById('plan-party-sync-map');
  const cbSupFight = document.getElementById('plan-party-sup-fight');
  const selSupHeal = document.getElementById('plan-party-sup-heal');

  if (cbEn) pc.enabled = Boolean(cbEn.checked);
  if (selRole) pc.role = selRole.value || 'leader';
  if (inTag) pc.partyTag = (inTag.value || '').trim();
  if (selLoot) pc.lootMode = selLoot.value || 'f';
  if (selGroup) pc.groupMode = selGroup.value || 'g';
  if (inMinLv) pc.minLevel = Math.max(1, Math.min(99, parseInt(inMinLv.value, 10) || 1));
  if (cbSyncMap) pc.syncChannelAndMap = Boolean(cbSyncMap.checked);
  if (cbSupFight) pc.supFight = Boolean(cbSupFight.checked);
  if (selSupHeal) pc.supHealPct = parseInt(selSupHeal.value, 10) || 70;
  return pc;
}
window.updatePartyConfigInEditor = updatePartyConfigInEditor;
window.readPartyConfigFromEditor = readPartyConfigFromEditor;

function updatePlanEditorBadges() {
  if (!activeEditingPlan) return;
  normalizePlanSkillBuild(activeEditingPlan);
  const pc = normalizePlanPartyConfig(activeEditingPlan);
  if (typeof window.updateGearBadge === 'function') window.updateGearBadge();
  const skillBadge = document.getElementById("plan-skill-count-badge");
  const statBadge = document.getElementById("plan-stat-summary-badge");
  const partyBadge = document.getElementById("plan-party-summary-badge");

  if (skillBadge) {
    const queue = activeEditingPlan.skillBuild?.skillPointQueue || [];
    const rounds = syncPlanSkillResetRounds(activeEditingPlan);
    if (rounds.length > 0) {
      const roundParts = [`เริ่ม ${queue.length}`].concat(rounds.map((r, idx) => `รี#${idx + 1} ${(r.skillPointQueue || []).length}`));
      skillBadge.innerText = `${roundParts.join(' · ')} แต้ม`;
      skillBadge.style.background = 'rgba(168, 85, 247, 0.45)';
    } else {
      const facetCount = countPlannedFacets(activeEditingPlan);
      skillBadge.innerText = facetCount > 0 ? `${queue.length} แต้ม · ✨${facetCount}` : `${queue.length} แต้ม`;
      skillBadge.style.background = (queue.length > 0 || facetCount > 0) ? 'rgba(168, 85, 247, 0.4)' : 'rgba(168, 85, 247, 0.2)';
    }
  }

  if (statBadge) {
    const q = statQueueOf(activeEditingPlan.statBuild);
    const statRounds = syncPlanStatResetRounds(activeEditingPlan);
    if (statRounds.length > 0) {
      const rParts = [`เริ่ม ${q.length}`].concat(statRounds.map((r, idx) => `รี#${idx + 1} ${(r.queue || []).length}`));
      statBadge.innerText = `${rParts.join(' · ')} ขั้น`;
      statBadge.style.background = 'rgba(56, 189, 248, 0.48)';
    } else if (q.length) {
      const sb = statFinal(q);
      const top = STAT_KEYS.filter(k => sb[k] > 1).sort((x, y) => sb[y] - sb[x]).slice(0, 2);
      statBadge.innerText = `${q.length} ขั้น · ${top.map(k => `${k} ${sb[k]}`).join(' / ')}`;
      statBadge.style.background = 'rgba(56, 189, 248, 0.4)';
    } else {
      statBadge.innerText = 'Default';
      statBadge.style.background = 'rgba(56, 189, 248, 0.2)';
    }
  }

  if (partyBadge) {
    if (pc && pc.enabled) {
      const roleName = pc.role === 'support' ? 'พระซัพ' : pc.role === 'member' ? 'ลูกตี้' : 'หัวตี้';
      partyBadge.innerText = `${roleName}${pc.partyTag ? ' · ' + pc.partyTag : ''}`;
      partyBadge.style.background = 'rgba(16, 185, 129, 0.45)';
    } else {
      partyBadge.innerText = 'ปิด';
      partyBadge.style.background = 'rgba(148, 163, 184, 0.25)';
    }
  }
}

// 3. Open Skill Builder Modal
function openSkillBuilderModal() {
  if (!activeEditingPlan) return;
  normalizePlanSkillBuild(activeEditingPlan);
  skillMetaCache = null;

  // Update Tab Names
  const c1NameEl = document.getElementById("skill-tab-class1-name");
  const c2NameEl = document.getElementById("skill-tab-class2-name");
  const c3NameEl = document.getElementById("skill-tab-class3-name");
  const c1 = activeEditingPlan.class1Target || 'archer';
  const c2 = activeEditingPlan.class2Target || 'ranger';
  const tree = CLASS_TREE_MAP[c1] || CLASS_TREE_MAP['archer'];
  const sc = tree?.secondClasses?.find(s => s.id === c2) || tree?.secondClasses?.[0];
  const c3 = getPlanClass3Id(activeEditingPlan);

  if (c1NameEl) c1NameEl.innerText = (tree?.name || c1).replace(/\s*\([^)]*\)\s*$/, '').trim();
  if (c2NameEl) c2NameEl.innerText = (sc?.name || c2).replace(/\s*\([^)]*\)\s*$/, '').trim();
  if (c3NameEl) c3NameEl.innerText = (sc?.class3Name || c3).replace(/\s*\([^)]*\)\s*$/, '').trim();

  skillBuilderSnapshot = JSON.stringify(activeEditingPlan.skillBuild);
  const resetRounds = syncPlanSkillResetRounds(activeEditingPlan);
  if (currentSkillResetRound > resetRounds.length) currentSkillResetRound = 0;

  // Repair Round 0 and all Reset Rounds so prerequisites & 156 pool are always valid
  const before = activeEditingPlan.skillBuild.skillPointQueue;
  const fixed = repairSkillQueue(before, true);
  activeEditingPlan.skillBuild.skillPointQueue = fixed.queue;
  activeEditingPlan.skillBuild.plannedLevels = fixed.levels;
  resetRounds.forEach(r => {
    const fx = repairSkillQueue(r.skillPointQueue || [], true);
    r.skillPointQueue = fx.queue;
    r.plannedLevels = fx.levels;
  });

  const realDropped = fixed.dropped.filter(d => d.why !== 'max');
  const notes = [];
  if (fixed.added.length) notes.push(`เติมสกิลเงื่อนไขที่ขาดให้: ${summarizeSkillIds(fixed.added)}`);
  if (realDropped.length) notes.push(`ตัดแต้มที่อัปไม่ได้ออก: ${summarizeSkillIds(realDropped)}`);
  if (!notes.length && fixed.queue.join() !== before.join() && !fixed.dropped.length) notes.push('จัดลำดับใหม่ให้สกิลเงื่อนไขมาก่อน');
  skillBuilderNotice = notes.length ? `🔧 ปรับคิวเดิมให้ตรงเงื่อนไขของเกมแล้ว — ${notes.join(' · ')} (กด "ยกเลิก" เพื่อไม่ใช้การปรับนี้)` : '';

  currentSkillBuilderTab = 'class1';
  renderSkillBuilderUI();

  const modal = document.getElementById("skill-builder-modal");
  if (modal) modal.style.display = 'flex';
}

const TOTAL_SKILL_POINTS_MAX = 156; // 9 (Traveler Job 10) + 49 (Class 1 Job 50) + 49 (Class 2 Job 50) + 49 (Class 3 Job 50)
const TRAVELER_ONLY_SKILLS = new Set(['q', 'e']);

// 4. Render Skill Builder UI
function renderSkillBuilderUI() {
  if (!activeEditingPlan || !activeEditingPlan.skillBuild) return;

  const resetRounds = syncPlanSkillResetRounds(activeEditingPlan);
  if (currentSkillResetRound > resetRounds.length) currentSkillResetRound = 0;
  const activeRoundSb = getActiveRoundSkillBuild(activeEditingPlan, currentSkillResetRound) || activeEditingPlan.skillBuild;

  // Render Multi-Round Reset Tabs Bar (#skill-round-tabs-bar)
  const roundBar = document.getElementById('skill-round-tabs-bar');
  if (roundBar) {
    const initCount = (activeEditingPlan.skillBuild.skillPointQueue || []).length;
    const initBtn = `
      <button type="button" class="skill-round-btn round-init ${currentSkillResetRound === 0 ? 'active' : ''}" onclick="switchSkillResetRound(0)" title="ลำดับสกิลที่จะอัปตั้งแต่เริ่มเกม (ก่อนถึงเงื่อนไขรีสกิล)">
        <span>🟢 รอบเริ่มต้น (ก่อนรีสกิล)</span>
        <span class="skill-round-pts">${initCount} แต้ม</span>
      </button>
    `;
    const resetBtns = resetRounds.map((r, idx) => {
      const rNo = idx + 1;
      const rCount = (r.skillPointQueue || []).length;
      const isOn = currentSkillResetRound === rNo;
      return `
        <button type="button" class="skill-round-btn ${isOn ? 'active' : ''}" onclick="switchSkillResetRound(${rNo})" title="ลำดับสกิลชุดใหม่ที่จะอัปหลังจากบอทกลับไปรีสกิลที่ลุงโกโก้ ครั้งที่ ${rNo} (${escapeHTML(r.label || '')})">
          <span>🔄 รีสกิล #${rNo}</span>
          <span class="skill-round-when">(${escapeHTML(r.label || '')})</span>
          <span class="skill-round-pts">${rCount} แต้ม</span>
        </button>
      `;
    }).join('');

    const rightControls = currentSkillResetRound >= 1
      ? `<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
           <span class="skill-round-hint">🎯 กำลังจัดสกิลของ <b>รีสกิล #${currentSkillResetRound} (${escapeHTML(resetRounds[currentSkillResetRound - 1]?.label || '')})</b></span>
           <button type="button" class="btn btn-secondary btn-sm" onclick="copySkillRoundFromPrevious()" style="font-size:11px;padding:3px 10px;border-color:rgba(217,70,239,0.45);color:#f0abfc;background:rgba(217,70,239,0.12);">
             📋 คัดลอกจาก${currentSkillResetRound === 1 ? 'รอบเริ่มต้น' : 'รีสกิล #' + (currentSkillResetRound - 1)}
           </button>
         </div>`
      : (resetRounds.length > 0
          ? `<span class="skill-round-hint">💡 คลิกเลือกแท็บ <b>🔄 รีสกิล #1${resetRounds.length > 1 ? ` .. #${resetRounds.length}` : ''}</b> เพื่อตั้งลำดับการอัปสกิลชุดใหม่หลังรีสกิลที่ลุงโกโก้แยกแต่ละครั้งได้เลย</span>`
          : `<span class="skill-round-hint">💡 หากตั้งเงื่อนไข <b>"🔄 รีเซ็ตสกิล (ลุงโกโก้)"</b> ในแผน แถบ <b>"🔄 รีสกิล #1, #2..."</b> จะแสดงขึ้นมาให้จัดสกิลแยกตามรอบอัตโนมัติ</span>`);

    roundBar.innerHTML = `
      <div class="skill-round-tabs">
        ${initBtn}
        ${resetBtns}
      </div>
      ${rightControls}
    `;
  }

  const queue = activeRoundSb.skillPointQueue || [];
  const planned = activeRoundSb.plannedLevels || {};
  const c1 = activeEditingPlan.class1Target || 'archer';
  const c2 = activeEditingPlan.class2Target || 'ranger';
  const c3 = getPlanClass3Id(activeEditingPlan);

  // Calculate points spent per tier (shared pool of 156 points across all tiers)
  const noviceSkills = SKILLS_DATABASE.novice || [];
  const class1Skills = SKILLS_DATABASE[c1] || [];
  const class2Skills = SKILLS_DATABASE[c2] || [];
  const class3Skills = SKILLS_DATABASE[c3] || [];

  const noviceSpent = queue.filter(id => noviceSkills.some(s => s.id === id)).length;
  const class1Spent = queue.filter(id => class1Skills.some(s => s.id === id)).length;
  const class2Spent = queue.filter(id => class2Skills.some(s => s.id === id)).length;
  const class3Spent = queue.filter(id => class3Skills.some(s => s.id === id)).length;
  const totalSpent = queue.length;
  const leftPts = Math.max(0, TOTAL_SKILL_POINTS_MAX - totalSpent);

  // Update budget badges
  const bTot = document.getElementById("skill-budget-total");
  const bNov = document.getElementById("skill-budget-novice");
  const bC1 = document.getElementById("skill-budget-class1");
  const bC2 = document.getElementById("skill-budget-class2");
  const bC3 = document.getElementById("skill-budget-class3");

  if (bTot) {
    bTot.innerText = `${totalSpent} / ${TOTAL_SKILL_POINTS_MAX} แต้ม (เหลือ ${leftPts})`;
    bTot.style.color = totalSpent >= TOTAL_SKILL_POINTS_MAX ? '#fbbf24' : '#34d399';
  }
  if (bNov) {
    bNov.innerText = `${noviceSpent} แต้ม`;
    bNov.style.color = noviceSpent > 0 ? '#4ade80' : '#38bdf8';
  }
  if (bC1) {
    bC1.innerText = `${class1Spent} แต้ม`;
    bC1.style.color = class1Spent > 0 ? '#c084fc' : '#94a3b8';
  }
  if (bC2) {
    bC2.innerText = `${class2Spent} แต้ม`;
    bC2.style.color = class2Spent > 0 ? '#facc15' : '#94a3b8';
  }
  if (bC3) {
    bC3.innerText = `${class3Spent} แต้ม`;
    bC3.style.color = class3Spent > 0 ? '#fb7185' : '#94a3b8';
  }

  // Update Tabs Active State
  document.querySelectorAll('.skill-tab-btn').forEach(btn => {
    const tab = btn.getAttribute('data-tab');
    if (tab === currentSkillBuilderTab) {
      btn.className = 'btn btn-primary btn-sm skill-tab-btn';
    } else {
      btn.className = 'btn btn-secondary btn-sm skill-tab-btn';
    }
  });

  // Get active skills list
  let activeList = [];
  if (currentSkillBuilderTab === 'novice') {
    activeList = noviceSkills;
  } else if (currentSkillBuilderTab === 'class1') {
    activeList = class1Skills;
  } else if (currentSkillBuilderTab === 'class2') {
    activeList = class2Skills;
  } else {
    activeList = class3Skills;
  }

  const effLvOf = (id) => {
    const m = getSkillMeta(id);
    return Math.min(m ? m.maxLevel : 10, (Number(m?.freeLevel) || 0) + (planned[id] || 0));
  };

  const grid = document.getElementById("skill-cards-grid");
  if (grid) {
    let notice = document.getElementById('skill-builder-notice');
    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'skill-builder-notice';
      notice.className = 'skill-notice';
      grid.parentNode.insertBefore(notice, grid);
    }
    notice.textContent = skillBuilderNotice;
    notice.style.display = skillBuilderNotice ? '' : 'none';
  }
  if (grid) {
    grid.innerHTML = activeList.map(skill => {
      const freeLv = Number(skill.freeLevel) || 0;
      const spentPts = planned[skill.id] || 0;
      const curLv = Math.min(skill.maxLevel, freeLv + spentPts);
      const isMaxed = curLv >= skill.maxLevel;
      const preview = isMaxed ? { ok: false, why: 'max' } : skillAddPreview(skill.id);
      const canAdd = preview.ok;
      const canMinus = spentPts > 0;
      const plusTitle = canAdd
        ? (preview.added.length ? `+1 แต้ม — จะอัป ${summarizeSkillIds(preview.added)} ให้ก่อนอัตโนมัติ (ใช้ทั้งหมด ${preview.cost} แต้ม)` : '+1 แต้ม')
        : (preview.why === 'max' ? 'สกิลเต็มแล้ว' : preview.why === 'budget' ? 'แต้มสกิลรวมเต็ม 156 แต้มแล้ว (รวมสกิลเงื่อนไข)' : 'อัปไม่ได้');

      let reqHtml = '';
      if (Array.isArray(skill.prereq) && skill.prereq.length > 0) {
        const anyMet = skill.reqAny && skill.prereq.some(p => effLvOf(p.skill) >= p.level);
        reqHtml = skill.prereq.map(p => {
          const met = effLvOf(p.skill) >= p.level || anyMet;
          return `<span class="skill-req ${met ? 'met' : ''}">${met ? '✔' : '🔒'} ${escapeHTML(skillMetaName(p.skill))} Lv.${p.level}</span>`;
        }).join(skill.reqAny ? '<span style="color:#94a3b8;font-size:9.5px;margin:0 2px;">หรือ</span>' : '');
      } else if (skill.req) {
        const met = checkSpecialSkillPrereq(skill.id, effLvOf);
        reqHtml = `<span class="skill-req ${met ? 'met' : ''}">${met ? '✔' : '🔒'} ${escapeHTML(skill.req)}</span>`;
      }

      const weapBadges = [];
      if (skill.weaponReq) {
        weapBadges.push(`<span class="skill-weap-badge" title="ต้องถืออาวุธนี้จึงจะใช้สกิลได้">⚔️ ต้องถือ${escapeHTML(skill.weaponReq)}</span>`);
      }
      if (skill.weaponBonus) {
        weapBadges.push(`<span class="skill-weap-badge bonus" title="โบนัสพิเศษเมื่อถืออาวุธนี้">💡 โบนัส ${escapeHTML(skill.weaponBonus)}</span>`);
      }

      // Find all step indexes in queue where this skill was picked
      const stepIndexes = [];
      queue.forEach((sId, idx) => {
        if (sId === skill.id) stepIndexes.push(idx + 1);
      });

      const iconUrl = skill.iconUrl || `https://www.aetheria-online.in.th/art/icons/skills/${skill.icon || skill.id}.webp`;
      const kindClass = skill.ult ? 'ult' : (skill.kind || 'active');
      const kindLabel = skill.ult ? 'Ultimate' : skill.kind === 'passive' ? 'Passive' : skill.kind === 'buff' ? 'Buff' : skill.kind === 'toggle' ? 'Toggle' : 'Active';

      const curFacets = (activeEditingPlan.skillBuild.facets && Array.isArray(activeEditingPlan.skillBuild.facets[skill.id]))
        ? activeEditingPlan.skillBuild.facets[skill.id]
        : [-1, -1, -1];
      let facetsHtml = '';
      if (Array.isArray(skill.facets) && skill.facets.length > 0) {
        const tiersHtml = skill.facets.map((tier, tIdx) => {
          const opts = Array.isArray(tier.opts) ? tier.opts : [];
          const pickedIdx = (typeof curFacets[tIdx] === 'number' && curFacets[tIdx] >= 0 && curFacets[tIdx] < opts.length) ? curFacets[tIdx] : -1;
          const pickedOpt = pickedIdx >= 0 ? opts[pickedIdx] : null;
          const needsBonus = tier.lv > skill.maxLevel;
          const isTierMet = curLv >= tier.lv;
          const lvTip = needsBonus
            ? `ปลดล็อกที่ Lv.${tier.lv} (ใช้เลเวลสกิล + โบนัสจากอุปกรณ์/ศิลาปลุกพลัง)`
            : `ปลดล็อกเมื่ออัปสกิลถึง Lv.${tier.lv}`;
          return `
            <div class="skill-facet-tier ${pickedIdx >= 0 ? 'has-pick' : ''}">
              <div class="skill-facet-tier-head">
                <span class="skill-facet-lv ${isTierMet ? 'met' : needsBonus ? 'bonus' : ''}" title="${escapeHTML(lvTip)}">Lv.${tier.lv}${needsBonus ? '+' : ''}</span>
                <div class="skill-facet-opts">
                  ${opts.map((opt, oIdx) => {
                    const isOn = pickedIdx === oIdx;
                    const tip = `${opt.thai || opt.name} (${opt.name}) — ${opt.desc || ''}`;
                    return `<button type="button" class="skill-facet-btn ${isOn ? 'on' : ''}" onclick="toggleSkillFacet('${skill.id}', ${tIdx}, ${oIdx})" title="${escapeHTML(tip)}">${escapeHTML(opt.thai || opt.name)}</button>`;
                  }).join('')}
                </div>
              </div>
              ${pickedOpt ? `<div class="skill-facet-desc">✨ <b>${escapeHTML(pickedOpt.thai || pickedOpt.name)}:</b> ${escapeHTML(pickedOpt.desc || '')}</div>` : ''}
            </div>
          `;
        }).join('');
        facetsHtml = `
          <div class="skill-facets-box">
            <div class="skill-facets-header">
              <span>✨ ปลุกพลังสกิล (Awakening)</span>
              <span class="skill-facets-sub">เลือก 1 สาย/ขั้น</span>
            </div>
            ${tiersHtml}
          </div>
        `;
      } else if (skill.facetsPending) {
        facetsHtml = `<div class="skill-facets-pending">✨ ปลุกพลังสกิล: รอดำเนินการในเกม</div>`;
      }

      const cleanDesc = String(skill.desc || '').replace(/^\[มีฟรี\s*Lv\.\d+\]\s*·\s*/i, '');

      return `
        <div class="skill-builder-card ${spentPts > 0 ? 'is-allocated' : ''} ${isMaxed ? 'is-maxed' : ''}" title="${escapeHTML(skill.desc || '')}">
          <div class="skill-card-top">
            <img src="${iconUrl}" class="skill-card-icon" onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'38\\' height=\\'38\\'><rect width=\\'100%\\' height=\\'100%\\' fill=\\'%231e293b\\'/><text x=\\'50%\\' y=\\'55%\\' dominant-baseline=\\'middle\\' text-anchor=\\'middle\\' fill=\\'%23a855f7\\' font-size=\\'18\\'>⚡</text></svg>';">
            <div class="skill-card-info">
              <div class="skill-card-title">${escapeHTML(skill.name)}</div>
              <div class="skill-card-subtitle" style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;">
                <span>${escapeHTML(skill.thai)}</span>
                <span class="skill-kind ${kindClass}">${kindLabel}</span>
                ${freeLv > 0 ? `<span class="skill-free-badge">ฟรี Lv.${freeLv}</span>` : ''}
              </div>
            </div>
          </div>

          ${weapBadges.length ? `<div class="skill-weap-row">${weapBadges.join('')}</div>` : ''}
          ${reqHtml ? `<div class="skill-req-row">ต้องมี: ${reqHtml}</div>` : ''}
          ${cleanDesc ? `<div class="skill-desc-box">${escapeHTML(cleanDesc)}</div>` : ''}

          ${skill.kind !== 'passive' ? `
          <button type="button" class="skill-auto-toggle ${isSkillAutoOn(skill.id) ? 'on' : 'off'}" onclick="toggleSkillAuto('${skill.id}')"
            title="${isSkillAutoOn(skill.id) ? 'บอทจะติ๊กสกิลนี้ใน AUTO ของเกม (กดเพื่อปิด)' : 'บอทจะไม่ใช้สกิลนี้ใน AUTO (กดเพื่อเปิด)'}">
            <span class="sat-switch"></span> ${isSkillAutoOn(skill.id) ? 'ใช้ใน AUTO' : 'ไม่ใช้ใน AUTO'}
          </button>` : ''}

          <div class="skill-card-controls">
            <div class="skill-level-indicator ${isMaxed ? 'maxed' : ''}">
              Lv. ${curLv} / ${skill.maxLevel} ${freeLv > 0 ? `<small style="font-size:9.5px;color:#94a3b8;font-weight:500;">(อัป ${spentPts}/${skill.maxLevel - freeLv})</small>` : ''}
            </div>
            <div class="skill-btn-group">
              <button type="button" class="btn-skill-adjust" onclick="removeSkillPoint('${skill.id}')" ${!canMinus ? 'disabled' : ''}>-</button>
              <button type="button" class="btn-skill-adjust btn-plus" onclick="addSkillPoint('${skill.id}')" ${!canAdd ? 'disabled' : ''} title="${escapeHTML(plusTitle)}">+</button>
            </div>
          </div>

          ${facetsHtml}

          ${stepIndexes.length > 0 ? `
            <div style="display: flex; gap: 3px; flex-wrap: wrap; margin-top: 2px;">
              ${stepIndexes.map(st => `<span class="badge" style="background: rgba(168, 85, 247, 0.25); color: #d8b4fe; font-size: 9px; padding: 0 4px;">#${st}</span>`).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  // Render Queue Chips
  const qContainer = document.getElementById("skill-queue-chips-container");
  const qTotal = document.getElementById("skill-queue-total-count");
  if (qTotal) qTotal.innerText = queue.length;

  if (qContainer) {
    if (queue.length === 0) {
      qContainer.innerHTML = '<span style="font-size: 11px; color: #64748b; font-style: italic;">ยังไม่มีแต้มสกิลในคิว — คลิกปุ่ม + ที่สกิลด้านบนเพื่อเริ่มบันทึกลำดับ</span>';
    } else {
      const badSteps = findQueuePrereqProblems(queue);
      qContainer.innerHTML = queue.map((sId, idx) => {
        const skillMeta = getSkillMeta(sId);
        const sName = skillMeta ? (skillMeta.name || skillMeta.thai) : sId;
        return `
          <span class="skill-queue-chip ${badSteps.has(idx) ? 'bad' : ''}" title="ลำดับที่ ${idx + 1}: ${sName} (${skillMeta?.thai || ''})${badSteps.has(idx) ? ' — ยังไม่ผ่านเงื่อนไขสกิลก่อนหน้า ณ จุดนี้ (บอทจะข้ามไปก่อนจนกว่าจะผ่าน)' : ''}">
            <span class="chip-step">#${idx + 1}</span>
            <span class="chip-name">${escapeHTML(sName)}</span>
            <span class="chip-del" onclick="removeSkillPointAtIndex(${idx})">&times;</span>
          </span>
        `;
      }).join('');
    }
  }
}

// 5. Skill rules: every change goes through repairSkillQueue so the queue always matches Nightcamp Online (skilltree.js):
//    - Shared cumulative pool of 156 points (Traveler 9 + Class 1 49 + Class 2 49 + Class 3 49)
//    - Unspent points from Traveler / Class 1 / Class 2 carry over freely to higher classes (no per-tier 9/49 cap!)
//    - Prerequisites automatically inserted before the skill that needs them
let skillMetaCache = null;
function getSkillMeta(skillId) {
  if (!skillMetaCache) {
    skillMetaCache = {};
    for (const t in SKILLS_DATABASE) SKILLS_DATABASE[t].forEach(s => { skillMetaCache[s.id] = Object.assign({ tier: t }, s); });
  }
  return skillMetaCache[skillId] || null;
}

function skillMetaName(skillId) {
  const m = getSkillMeta(skillId);
  return m ? (m.name || m.thai) : skillId;
}

function planSkillTiers() {
  const c1 = activeEditingPlan?.class1Target || 'archer';
  const c2 = activeEditingPlan?.class2Target || 'ranger';
  const c3 = getPlanClass3Id(activeEditingPlan);
  return { novice: TOTAL_SKILL_POINTS_MAX, [c1]: TOTAL_SKILL_POINTS_MAX, [c2]: TOTAL_SKILL_POINTS_MAX, [c3]: TOTAL_SKILL_POINTS_MAX };
}

function checkSpecialSkillPrereq(skillId, effLvFn) {
  if (skillId === 'am_chainreact') {
    const orbs = ['am_orbwater', 'am_orbwind', 'am_orbfire'];
    return orbs.filter(id => effLvFn(id) >= 5).length >= 2;
  }
  if (skillId === 'am_convergence') {
    const hearts = ['mg_fireheart', 'mg_iceheart', 'mg_stormheart'];
    return hearts.filter(id => effLvFn(id) >= 5).length >= 2;
  }
  return true;
}

// Rebuild a queue that the game would accept.
//  - a point whose prerequisites come later in the queue is moved to right after them
//  - insertMissing: prerequisites that never appear are inserted just before the point that needs them
//  - anything still impossible (max level, 156 total pool full, prerequisite missing, other class) is dropped
function repairSkillQueue(queue, insertMissing) {
  const budgets = planSkillTiers();
  const lv = {}, spent = {};
  const out = [], dropped = [], added = [];

  const effLv = id => {
    const m = getSkillMeta(id);
    return (Number(m?.freeLevel) || 0) + (lv[id] || 0);
  };
  const maxSpendOf = m => Math.max(0, (Number(m?.maxLevel) || 10) - (Number(m?.freeLevel) || 0));

  const prereqMet = m => {
    const reqs = m.prereq || [];
    if (!reqs.length) return checkSpecialSkillPrereq(m.id, effLv);
    if (m.reqAny) return reqs.some(p => effLv(p.skill) >= p.level);
    return reqs.every(p => effLv(p.skill) >= p.level);
  };
  const check = id => {
    const m = getSkillMeta(id);
    if (!m || budgets[m.tier] === undefined) return 'class';
    if ((lv[id] || 0) >= maxSpendOf(m)) return 'max';
    if (out.length >= TOTAL_SKILL_POINTS_MAX) return 'budget';
    if (TRAVELER_ONLY_SKILLS.has(id) && ((lv.q || 0) + (lv.e || 0)) >= 9) return 'budget';
    return prereqMet(m) ? 'ok' : 'prereq';
  };
  const place = id => {
    const m = getSkillMeta(id);
    out.push(id);
    lv[id] = (lv[id] || 0) + 1;
    spent[m.tier] = (spent[m.tier] || 0) + 1;
  };
  // Will the rest of the queue raise every prerequisite high enough by itself?
  const laterSatisfies = (m, rest) => {
    const reqs = m.prereq || [];
    if (!reqs.length) {
      const futureLv = sId => effLv(sId) + rest.filter(x => x === sId).length;
      return checkSpecialSkillPrereq(m.id, futureLv);
    }
    if (m.reqAny) {
      return reqs.some(p => effLv(p.skill) + rest.filter(x => x === p.skill).length >= p.level);
    }
    return reqs.every(p => effLv(p.skill) + rest.filter(x => x === p.skill).length >= p.level);
  };
  const insertPrereqs = (id, depth) => {
    const m = getSkillMeta(id);
    if (!m) return false;
    if (m.id === 'am_chainreact' || m.id === 'am_convergence') {
      const pool = m.id === 'am_chainreact' ? ['am_orbfire', 'am_orbwater', 'am_orbwind'] : ['mg_stormheart', 'mg_fireheart', 'mg_iceheart'];
      // Pick the 2 candidates that already have the highest effective level
      const sorted = pool.slice().sort((a, b) => effLv(b) - effLv(a)).slice(0, 2);
      for (const sId of sorted) {
        while (effLv(sId) < 5) {
          if (depth > 6) return false;
          const pm = getSkillMeta(sId);
          if (!pm) return false;
          if (!prereqMet(pm) && !insertPrereqs(sId, depth + 1)) return false;
          if (check(sId) !== 'ok') return false;
          place(sId);
          added.push(sId);
        }
      }
      return true;
    }
    const reqs = m.prereq || [];
    const targetReqs = m.reqAny
      ? (reqs.length ? [reqs.slice().sort((a, b) => (a.level - effLv(a.skill)) - (b.level - effLv(b.skill)))[0]] : [])
      : reqs;
    for (const p of targetReqs) {
      while (effLv(p.skill) < p.level) {
        if (depth > 6) return false;
        const pm = getSkillMeta(p.skill);
        if (!pm) return false;
        if (!prereqMet(pm) && !insertPrereqs(p.skill, depth + 1)) return false;
        if (check(p.skill) !== 'ok') return false;
        place(p.skill);
        added.push(p.skill);
      }
    }
    return true;
  };

  const pending = [];
  const flush = () => {
    for (let i = 0; i < pending.length; i++) {
      if (check(pending[i]) === 'ok') { place(pending.splice(i, 1)[0]); i = -1; }
    }
  };

  queue.forEach((id, idx) => {
    const r = check(id);
    if (r === 'ok') { place(id); flush(); return; }
    if (r !== 'prereq') { dropped.push({ id, why: r }); return; }
    const m = getSkillMeta(id);
    if (insertMissing && !laterSatisfies(m, queue.slice(idx + 1))) {
      const snap = { out: out.length, added: added.length, lv: Object.assign({}, lv), spent: Object.assign({}, spent) };
      if (insertPrereqs(id, 0) && check(id) === 'ok') { place(id); flush(); return; }
      out.length = snap.out; added.length = snap.added;
      Object.keys(lv).forEach(k => delete lv[k]); Object.assign(lv, snap.lv);
      Object.keys(spent).forEach(k => delete spent[k]); Object.assign(spent, snap.spent);
    }
    pending.push(id);
  });
  pending.forEach(id => dropped.push({ id, why: check(id) === 'budget' ? 'budget' : 'prereq' }));

  return { queue: out, levels: lv, dropped, added };
}

// "ใช้ใน AUTO" switch on a skill card: switched-off skills are not ticked for the game's AUTO
// (stored as skillBuild.autoOff per round; everything else stays on, like before)
function isSkillAutoOn(id) {
  const sb = getActiveRoundSkillBuild(activeEditingPlan, currentSkillResetRound);
  const off = sb && sb.autoOff;
  return !(Array.isArray(off) && off.includes(id));
}
function toggleSkillAuto(id) {
  const sb = getActiveRoundSkillBuild(activeEditingPlan, currentSkillResetRound);
  if (!sb) return;
  const off = new Set(Array.isArray(sb.autoOff) ? sb.autoOff : []);
  if (off.has(id)) off.delete(id); else off.add(id);
  sb.autoOff = Array.from(off);
  renderSkillBuilderUI();
}
window.toggleSkillAuto = toggleSkillAuto;

function toggleSkillFacet(skillId, tierIdx, optIdx) {
  const sb = getActiveRoundSkillBuild(activeEditingPlan, currentSkillResetRound);
  if (!sb) return;
  if (!sb.facets || typeof sb.facets !== 'object') {
    sb.facets = {};
  }
  const cur = Array.isArray(sb.facets[skillId])
    ? [...sb.facets[skillId]]
    : [-1, -1, -1];
  while (cur.length < 3) cur.push(-1);
  cur[tierIdx] = (cur[tierIdx] === optIdx) ? -1 : optIdx;
  if (cur.every(v => !(typeof v === 'number' && v >= 0))) {
    delete sb.facets[skillId];
  } else {
    sb.facets[skillId] = cur;
  }
  renderSkillBuilderUI();
}
window.toggleSkillFacet = toggleSkillFacet;

function applySkillQueue(newQueue) {
  const sb = getActiveRoundSkillBuild(activeEditingPlan, currentSkillResetRound);
  if (!sb) return;
  sb.skillPointQueue = newQueue;
  const levels = {};
  newQueue.forEach(id => { levels[id] = (levels[id] || 0) + 1; });
  sb.plannedLevels = levels;
}

function summarizeSkillIds(list) {
  const count = {};
  list.forEach(x => { const id = x.id || x; count[id] = (count[id] || 0) + 1; });
  return Object.keys(count).map(id => `${skillMetaName(id)} ${count[id]} แต้ม`).join(', ');
}

// Cost of one more point of this skill right now (the point + prerequisites it pulls in), or why it can't be added
function skillAddPreview(skillId) {
  const sb = getActiveRoundSkillBuild(activeEditingPlan, currentSkillResetRound);
  const queue = (sb && sb.skillPointQueue) || [];
  const res = repairSkillQueue(queue.concat(skillId), true);
  const ok = res.queue.length > queue.length && !res.dropped.length;
  if (ok) return { ok: true, cost: res.queue.length - queue.length, added: res.added };
  const why = (res.dropped[res.dropped.length - 1] || {}).why;
  return { ok: false, why };
}

function addSkillPoint(skillId, silent = false) {
  const sb = getActiveRoundSkillBuild(activeEditingPlan, currentSkillResetRound);
  if (!sb) return;
  const queue = sb.skillPointQueue || [];
  const res = repairSkillQueue(queue.concat(skillId), true);
  if (res.dropped.length || res.queue.length <= queue.length) {
    if (!silent) {
      const why = (res.dropped[res.dropped.length - 1] || {}).why;
      alert(why === 'max' ? 'สกิลนี้เต็มแล้ว'
        : why === 'class' ? 'สกิลนี้ไม่ได้อยู่ในอาชีพของแผนนี้'
        : 'แต้มสกิลรวมเต็ม 156 แต้มแล้ว (รวมสกิลเงื่อนไขที่ต้องอัปก่อน)');
    }
    return;
  }
  applySkillQueue(res.queue);
  if (!silent) renderSkillBuilderUI();
}

// Remove one point, then drop/move whatever no longer meets its prerequisites (asks first)
function removeSkillPointsAndRepair(newQueue) {
  const res = repairSkillQueue(newQueue, false);
  if (res.dropped.length) {
    const msg = `การลดแต้มนี้ทำให้สกิลต่อไปนี้ไม่ผ่านเงื่อนไข และจะถูกลบออกด้วย:\n\n${summarizeSkillIds(res.dropped)}\n\nยืนยันหรือไม่?`;
    if (!confirm(msg)) return;
  }
  applySkillQueue(res.queue);
  renderSkillBuilderUI();
}

function removeSkillPoint(skillId) {
  const sb = getActiveRoundSkillBuild(activeEditingPlan, currentSkillResetRound);
  if (!sb) return;
  const queue = sb.skillPointQueue || [];
  const lastIdx = queue.lastIndexOf(skillId);
  if (lastIdx === -1) return;
  removeSkillPointsAndRepair(queue.filter((_, i) => i !== lastIdx));
}

function removeSkillPointAtIndex(idx) {
  const sb = getActiveRoundSkillBuild(activeEditingPlan, currentSkillResetRound);
  if (!sb) return;
  const queue = sb.skillPointQueue || [];
  if (idx < 0 || idx >= queue.length) return;
  removeSkillPointsAndRepair(queue.filter((_, i) => i !== idx));
}

// Queue positions whose prerequisites aren't met yet at that point
function findQueuePrereqProblems(queue) {
  const lv = {};
  const effLv = id => (Number(getSkillMeta(id)?.freeLevel) || 0) + (lv[id] || 0);
  const bad = new Set();
  queue.forEach((id, idx) => {
    const m = getSkillMeta(id);
    if (m) {
      const reqs = m.prereq || [];
      if (reqs.length) {
        const fail = m.reqAny
          ? !reqs.some(p => effLv(p.skill) >= p.level)
          : reqs.some(p => effLv(p.skill) < p.level);
        if (fail) bad.add(idx);
      } else if (!checkSpecialSkillPrereq(m.id, effLv)) {
        bad.add(idx);
      }
    }
    lv[id] = (lv[id] || 0) + 1;
  });
  return bad;
}

function resetSkillQueue() {
  const sb = getActiveRoundSkillBuild(activeEditingPlan, currentSkillResetRound);
  if (!sb) return;
  if ((sb.skillPointQueue || []).length === 0) return;
  const roundLabel = currentSkillResetRound === 0 ? 'รอบเริ่มต้น (ก่อนรีสกิล)' : `รอบรีสกิล #${currentSkillResetRound}`;
  if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการล้างลำดับแต้มสกิลทั้งหมดของ "${roundLabel}"?`)) return;

  sb.skillPointQueue = [];
  sb.plannedLevels = {};
  sb.facets = {};
  renderSkillBuilderUI();
}

function applySkillPreset() {
  const sb = getActiveRoundSkillBuild(activeEditingPlan, currentSkillResetRound);
  if (!activeEditingPlan || !sb) return;
  const c1 = activeEditingPlan.class1Target || 'archer';
  const c2 = activeEditingPlan.class2Target || 'ranger';
  const c3 = getPlanClass3Id(activeEditingPlan);
  const hasResetRoundsInPlan = listPlanSkillResetSteps(activeEditingPlan).length > 0;

  sb.skillPointQueue = [];
  sb.plannedLevels = {};
  sb.facets = {};
  skillMetaCache = null;

  const pushMany = (id, count) => {
    for (let i = 0; i < count; i++) addSkillPoint(id, true);
  };

  // 1. If editing Round 0 (รอบเริ่มต้น) on a plan with Reset Skill triggers: focus 58 points on Class 1 fast leveling!
  if (currentSkillResetRound === 0 && hasResetRoundsInPlan) {
    if (c1 === 'rogue') {
      [['ro_dagger', 10], ['ro_double', 10], ['ro_vital', 10], ['sonic', 5], ['envenom', 9], ['ro_venomheart', 10], ['body', 4]].forEach(([id, n]) => pushMany(id, n));
      sb.autoOff = ['ro_hide'];
    } else {
      const list = SKILLS_DATABASE[c1] || [];
      for (const sk of list) {
        const spent = (sb.skillPointQueue || []).length;
        if (spent >= 58) break;
        const maxSpend = Math.max(0, (sk.maxLevel || 5) - (sk.freeLevel || 0));
        pushMany(sk.id, Math.min(maxSpend, 58 - spent));
      }
    }
    renderSkillBuilderUI();
    return;
  }

  // 2. Curated Puppeteer (นักเชิดหุ่น -> จ้าวโรงหุ่นราตรี) build aligned 100% to ไม้เชิดหุ่น + โล่
  if (c2 === 'puppeteer') {
    [
      ['pp_puppet', 9], ['pp_strings', 10], ['pp_dance', 10], ['pp_theatre', 5],
      ['shadowstep', 2], ['ro_hide', 1], ['pp_control', 10], ['pp_soulstring', 5],
      ['pp_guide', 10], ['pp_swap', 5], ['body', 10], ['mastery', 10],
      ['ro_venomheart', 10], ['mind', 10],
      ['so_acts', 9], ['so_awaken', 5], ['so_dance', 10], ['so_swap', 10],
      ['envenom', 9], ['venomdust', 6]
    ].forEach(([id, n]) => pushMany(id, n));
    sb.autoOff = ['ro_hide', 'shadowstep', 'pp_stretch', 'pp_bind'];
    renderSkillBuilderUI();
    return;
  }

  // 3. Nightcamp Standard Build: Skip Novice (0 pts) so all 9 Traveler points carry over!
  const fillTier = (tierKey, maxPts) => {
    const list = SKILLS_DATABASE[tierKey] || [];
    let before = (sb.skillPointQueue || []).length;
    for (const sk of list) {
      const spent = (sb.skillPointQueue || []).length - before;
      if (spent >= maxPts) break;
      const maxSpend = Math.max(0, (sk.maxLevel || 5) - (sk.freeLevel || 0));
      const want = Math.min(maxSpend, maxPts - spent);
      pushMany(sk.id, want);
    }
  };
  if (currentSkillResetRound >= 1) {
    // Post-reset round: pour points directly into Class 2 (auto-adding minimal Class 1 prerequisites) + Class 3!
    fillTier(c2, 102);
    fillTier(c1, Math.max(0, 107 - (sb.skillPointQueue || []).length));
    fillTier(c3, 54);
  } else {
    fillTier(c1, 32);
    fillTier(c2, 70);
    fillTier(c3, 54);
  }

  renderSkillBuilderUI();
}

function saveSkillBuild() {
  skillBuilderSnapshot = null;
  const modal = document.getElementById("skill-builder-modal");
  if (modal) modal.style.display = 'none';
  if (typeof markPlanDirty === 'function') markPlanDirty();
  updatePlanEditorBadges();
}

// 6. Stat Builder: an ordered queue of steps { stat, to } — the bot raises step 1 to its value, then step 2...
//    (like the skill queue). statBuild = { queue, targets (final values), priorityOrder } — targets/priority
//    are kept for older bots. Old plans without a queue: targets in priority order (what the bot did before).
const STAT_KEYS = ['STR', 'AGI', 'VIT', 'INT', 'DEX', 'LUK'];
const STAT_META = {
  STR: { icon: '💪', color: '#f87171', th: 'ATK ประชิด +1.6/แต้ม · เบรกเกราะ · แบกของ +20 (เพดาน 80)' },
  AGI: { icon: '⚡', color: '#34d399', th: 'ASPD +0.5%/แต้ม · หลบเฉียดลดดาเมจ 70% · หลบ MISS (เพดาน 80)' },
  VIT: { icon: '🛡️', color: '#fbbf24', th: 'HP +1%/แต้ม · ลดดาเมจที่ได้รับ 0.2%/แต้ม (เพดาน 80)' },
  INT: { icon: '🔮', color: '#60a5fa', th: 'MATK +1.6/แต้ม · ฮีล · SP สูงสุด & ฟื้น SP (เพดาน 80)' },
  DEX: { icon: '🏹', color: '#38bdf8', th: 'ATK ธนู/ปืน +1.6/แต้ม · แม่นยำ · ลดเวลาร่าย 0.6%/แต้ม (เพดาน 80)' },
  LUK: { icon: '🍀', color: '#c084fc', th: 'คริ +0.3%/แต้ม · คริแรง +0.4%/แต้ม · เหยี่ยวโฉบฟรี LUK÷6 (เพดาน 80)' }
};
// Nightcamp Soft Cap: 30 + 0.55 * BaseLv (max 80). Points above cap only give 40% efficiency!
const STAT_PRESETS = {
  agi_dex: [['DEX', 30], ['AGI', 30], ['LUK', 20], ['DEX', 45], ['AGI', 45], ['VIT', 20], ['DEX', 65], ['AGI', 65], ['LUK', 40], ['DEX', 80], ['AGI', 80], ['VIT', 40]],
  blitz_beat: [['DEX', 30], ['AGI', 30], ['LUK', 24], ['DEX', 45], ['AGI', 45], ['LUK', 36], ['VIT', 20], ['DEX', 60], ['AGI', 60], ['LUK', 48], ['DEX', 80], ['AGI', 80], ['LUK', 60], ['VIT', 40]],
  str_agi: [['STR', 30], ['AGI', 30], ['DEX', 20], ['STR', 45], ['AGI', 45], ['VIT', 25], ['STR', 65], ['AGI', 65], ['LUK', 30], ['STR', 80], ['AGI', 80], ['VIT', 45]],
  int_dex: [['INT', 30], ['DEX', 30], ['VIT', 20], ['INT', 45], ['DEX', 45], ['AGI', 25], ['INT', 65], ['DEX', 65], ['VIT', 35], ['INT', 80], ['DEX', 80], ['VIT', 50]],
  vit_tank: [['VIT', 35], ['STR', 25], ['DEX', 20], ['VIT', 50], ['STR', 40], ['AGI', 30], ['VIT', 65], ['STR', 55], ['VIT', 80], ['STR', 70], ['AGI', 50]]
};
let statWork = null;   // the queue being edited for the active round
let statResetRoundsWork = []; // working copies of resetRounds while editing in Stat Builder
let currentStatResetRound = 0; // 0 = initial build (before reset), 1..N = รีสเตตัส #1..#N

function listPlanStatResetSteps(plan) {
  const p = plan || activeEditingPlan;
  if (!p || !Array.isArray(p.triggers)) return [];
  const steps = [];
  let roundNo = 0;
  for (const trig of p.triggers) {
    if (!trig || !Array.isArray(trig.actions)) continue;
    const whenText = typeof window.planWhenText === 'function'
      ? window.planWhenText(trig)
      : (trig.type === 'job_level' ? `Job Lv.${trig.targetLevel || 1}` : trig.type === 'zeny' ? `เงิน ≥ ${(Number(trig.targetZeny) || 0).toLocaleString()}g` : `Base Lv.${trig.targetLevel || 1}`);
    for (const act of trig.actions) {
      if (act && act.type === 'reset_stats') {
        roundNo++;
        steps.push({
          roundNo,
          actionId: act.id || `reset_stat_${roundNo}`,
          triggerId: trig.id || '',
          whenText,
          resetMode: act.resetMode || 'auto'
        });
      }
    }
  }
  return steps;
}

function getResetStatActionRoundNo(actionId) {
  if (!actionId) return 0;
  const steps = listPlanStatResetSteps(activeEditingPlan);
  const found = steps.find(s => s.actionId === actionId);
  return found ? found.roundNo : 0;
}
window.listPlanStatResetSteps = listPlanStatResetSteps;
window.getResetStatActionRoundNo = getResetStatActionRoundNo;

function buildPriorityOrderFromStatQueue(queue) {
  const priorityOrder = [];
  (queue || []).forEach(e => { if (e && e.stat && !priorityOrder.includes(e.stat)) priorityOrder.push(e.stat); });
  ['STR', 'AGI', 'DEX', 'VIT', 'INT', 'LUK'].forEach(k => { if (!priorityOrder.includes(k)) priorityOrder.push(k); });
  return priorityOrder;
}

function syncPlanStatResetRounds(plan) {
  if (!plan) return [];
  if (!plan.statBuild || typeof plan.statBuild !== 'object') {
    plan.statBuild = { queue: [], targets: { STR: 1, AGI: 1, VIT: 1, INT: 1, DEX: 1, LUK: 1 }, priorityOrder: ['STR', 'AGI', 'DEX', 'VIT', 'INT', 'LUK'], resetRounds: [] };
  }
  const sb = plan.statBuild;
  const steps = listPlanStatResetSteps(plan);
  const oldRounds = Array.isArray(sb.resetRounds) ? sb.resetRounds : [];
  const usedOldIdx = new Set();

  const newRounds = steps.map((step, idx) => {
    let matchIdx = oldRounds.findIndex((r, i) => !usedOldIdx.has(i) && r && r.roundId && r.roundId === step.actionId);
    if (matchIdx === -1 && idx < oldRounds.length && !usedOldIdx.has(idx) && oldRounds[idx]) {
      matchIdx = idx;
    }
    if (matchIdx >= 0) usedOldIdx.add(matchIdx);
    const prev = matchIdx >= 0 ? oldRounds[matchIdx] : null;
    const rawQ = normalizeStatQueue(prev?.queue || []);
    return {
      roundNo: step.roundNo,
      roundId: step.actionId,
      triggerId: step.triggerId,
      label: step.whenText,
      queue: rawQ,
      targets: statFinal(rawQ),
      priorityOrder: buildPriorityOrderFromStatQueue(rawQ)
    };
  });
  sb.resetRounds = newRounds;
  return newRounds;
}

let statWorkMain = null; // working copy of initial round (round 0)

function getStatWorkForRound(rNo) {
  if (rNo >= 1 && statResetRoundsWork[rNo - 1]) {
    return statResetRoundsWork[rNo - 1].queue;
  }
  return statWorkMain;
}

function setStatWorkForRound(rNo, q) {
  if (rNo >= 1 && statResetRoundsWork[rNo - 1]) {
    statResetRoundsWork[rNo - 1].queue = q;
  } else {
    statWorkMain = q;
  }
  statWork = q;
}

function switchStatResetRound(roundNo) {
  if (!activeEditingPlan) return;
  if (statWork) {
    setStatWorkForRound(currentStatResetRound, normalizeStatQueue(statWork));
  }
  const nextRound = (roundNo >= 1 && roundNo <= statResetRoundsWork.length) ? roundNo : 0;
  currentStatResetRound = nextRound;
  statWork = getStatWorkForRound(currentStatResetRound);
  renderStatBuilderUI();
}
window.switchStatResetRound = switchStatResetRound;

function copyStatRoundFromPrevious() {
  if (currentStatResetRound < 1) return;
  const prevQ = getStatWorkForRound(currentStatResetRound - 1) || [];
  const curQ = getStatWorkForRound(currentStatResetRound) || [];
  if (curQ.length > 0) {
    const prevName = currentStatResetRound === 1 ? 'รอบเริ่มต้น (ก่อนรีสเตตัส)' : `รีสเตตัส #${currentStatResetRound - 1}`;
    if (!confirm(`แทนที่คิวสเตตัสของ "รีสเตตัส #${currentStatResetRound}" ด้วยคิวจาก "${prevName}" หรือไม่?`)) return;
  }
  const cloned = normalizeStatQueue(prevQ.map(x => ({ stat: x.stat, to: x.to })));
  setStatWorkForRound(currentStatResetRound, cloned);
  renderStatBuilderUI();
}
window.copyStatRoundFromPrevious = copyStatRoundFromPrevious;

// Status points to raise a stat from v to v + 1 (game: floor((v - 1) / 10) + 2)
const statPointCost = v => Math.floor((v - 1) / 10) + 2;
const statRangeCost = (from, to) => { let c = 0; for (let v = from; v < to; v++) c += statPointCost(v); return c; };

// Valid queue: values 1..99, each step raises its stat, consecutive steps of the same stat merged
function normalizeStatQueue(q) {
  const lv = {};
  const out = [];
  (Array.isArray(q) ? q : []).forEach(e => {
    const k = String((e && e.stat) || '').toUpperCase();
    if (!STAT_KEYS.includes(k)) return;
    const to = Math.min(99, Math.max(1, parseInt(e.to, 10) || 1));
    if (to <= (lv[k] || 1)) return;
    if (out.length && out[out.length - 1].stat === k) out[out.length - 1].to = to;
    else out.push({ stat: k, to });
    lv[k] = to;
  });
  return out;
}
function statQueueOf(sb) {
  if (!sb) return [];
  if (Array.isArray(sb.queue) && sb.queue.length) return normalizeStatQueue(sb.queue);
  const t = sb.targets || sb.caps || {};
  const rawPr = Array.isArray(sb.priorityOrder) && sb.priorityOrder.length ? sb.priorityOrder : (Array.isArray(sb.priority) ? sb.priority : []);
  const pr = rawPr.length ? rawPr : ['DEX', 'AGI', 'LUK', 'VIT', 'INT', 'STR'];
  return normalizeStatQueue(pr.map(k => ({ stat: k, to: t[String(k).toUpperCase()] })));
}
function statFinal(q) {
  const t = { STR: 1, AGI: 1, VIT: 1, INT: 1, DEX: 1, LUK: 1 };
  q.forEach(e => { t[e.stat] = Math.max(t[e.stat], e.to); });
  return t;
}
// Value of each step's stat before the step
function statStepFrom(q) {
  const lv = {};
  return q.map(e => { const from = lv[e.stat] || 1; lv[e.stat] = e.to; return from; });
}

function openStatBuilderModal() {
  if (!activeEditingPlan) return;
  const rounds = syncPlanStatResetRounds(activeEditingPlan);
  statWorkMain = statQueueOf(activeEditingPlan.statBuild);
  statResetRoundsWork = rounds.map(r => ({
    ...r,
    queue: normalizeStatQueue(r.queue || [])
  }));
  currentStatResetRound = 0;
  statWork = statWorkMain;
  renderStatBuilderUI();
  const modal = document.getElementById("stat-builder-modal");
  if (modal) modal.style.display = 'flex';
}

function renderStatBuilderUI() {
  if (!statWork) return;
  const roundBar = document.getElementById('stat-round-tabs-bar');
  if (roundBar) {
    const initCount = (statWorkMain || []).length;
    const initBtn = `
      <button type="button" class="skill-round-btn round-init ${currentStatResetRound === 0 ? 'active' : ''}" onclick="switchStatResetRound(0)" title="ลำดับสเตตัสที่จะอัปตั้งแต่เริ่มเกม (ก่อนถึงเงื่อนไขรีสเตตัส)">
        <span>🟢 รอบเริ่มต้น (ก่อนรีสเตตัส)</span>
        <span class="skill-round-pts">${initCount} ขั้น</span>
      </button>
    `;
    const resetBtns = statResetRoundsWork.map((r, idx) => {
      const rNo = idx + 1;
      const rCount = (r.queue || []).length;
      const isOn = currentStatResetRound === rNo;
      return `
        <button type="button" class="skill-round-btn ${isOn ? 'active' : ''}" onclick="switchStatResetRound(${rNo})" title="ลำดับสเตตัสชุดใหม่ที่จะอัปหลังจากบอทรีเซ็ตสเตตัส ครั้งที่ ${rNo} (${escapeHTML(r.label || '')})">
          <span>📊 รีสเตตัส #${rNo}</span>
          <span class="skill-round-when">(${escapeHTML(r.label || '')})</span>
          <span class="skill-round-pts">${rCount} ขั้น</span>
        </button>
      `;
    }).join('');
    const rightControls = currentStatResetRound >= 1
      ? `<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
           <span class="skill-round-hint">🎯 กำลังจัดสเตตัสของ <b>รีสเตตัส #${currentStatResetRound} (${escapeHTML(statResetRoundsWork[currentStatResetRound - 1]?.label || '')})</b></span>
           <button type="button" class="btn btn-secondary btn-sm" onclick="copyStatRoundFromPrevious()" style="font-size:11px;padding:3px 10px;border-color:rgba(56,189,248,0.45);color:#7dd3fc;background:rgba(14,165,233,0.14);">
             📋 คัดลอกจาก${currentStatResetRound === 1 ? 'รอบเริ่มต้น' : 'รีสเตตัส #' + (currentStatResetRound - 1)}
           </button>
         </div>`
      : (statResetRoundsWork.length > 0
          ? `<span class="skill-round-hint">💡 คลิกเลือกแท็บ <b>📊 รีสเตตัส #1${statResetRoundsWork.length > 1 ? ` .. #${statResetRoundsWork.length}` : ''}</b> เพื่อตั้งลำดับสเตตัสชุดใหม่หลังรีสเตตัสแยกแต่ละรอบได้</span>`
          : `<span class="skill-round-hint">💡 หากเพิ่มเงื่อนไข <b>"📊 รีเซ็ตสเตตัส (Reset Stats)"</b> ในแผน แถบ <b>"📊 รีสเตตัส #1, #2..."</b> จะแสดงขึ้นมาให้จัดสเตตัสแยกตามรอบอัตโนมัติ</span>`);
    roundBar.innerHTML = `
      <div class="skill-round-tabs">
        ${initBtn}
        ${resetBtns}
      </div>
      ${rightControls}
    `;
  }

  const final = statFinal(statWork);
  const grid = document.getElementById('stat-cards-grid');
  if (grid) {
    grid.innerHTML = STAT_KEYS.map(k => {
      const m = STAT_META[k];
      const steps = [];
      statWork.forEach((e, i) => { if (e.stat === k) steps.push(i + 1); });
      const v = final[k];
      return `
        <div class="sb-card ${v > 1 ? 'on' : ''}" style="--sb-c: ${m.color};">
          <div class="sb-card-top">
            <span class="sb-name">${m.icon} ${k}</span>
            <span class="sb-val">${v}</span>
          </div>
          <div class="sb-desc">${m.th}</div>
          <div class="sb-btns">
            <button type="button" onclick="statQueueAdd('${k}', -1)" ${v <= 1 ? 'disabled' : ''} title="ลด 1 (จากขั้นล่าสุดของ ${k})">−</button>
            <button type="button" onclick="statQueueAdd('${k}', 1)" ${v >= 99 ? 'disabled' : ''}>+1</button>
            <button type="button" onclick="statQueueAdd('${k}', 5)" ${v >= 99 ? 'disabled' : ''}>+5</button>
            <button type="button" onclick="statQueueAdd('${k}', 10)" ${v >= 99 ? 'disabled' : ''}>+10</button>
            <button type="button" onclick="statQueueAdd('${k}', 99)" ${v >= 99 ? 'disabled' : ''} title="อัปจนถึง 99">99</button>
          </div>
          <div class="sb-steps">${steps.map(n => `<span>#${n}</span>`).join('')}</div>
        </div>`;
    }).join('');
  }
  const froms = statStepFrom(statWork);
  const box = document.getElementById('stat-queue-container');
  const count = document.getElementById('stat-queue-count');
  const costEl = document.getElementById('stat-queue-cost');
  if (count) count.textContent = statWork.length;
  const total = statWork.reduce((a, e, i) => a + statRangeCost(froms[i], e.to), 0);
  if (costEl) costEl.textContent = statWork.length ? `ใช้ Status Points รวม ${total.toLocaleString()} แต้ม` : '';
  if (box) {
    box.innerHTML = statWork.length ? statWork.map((e, i) => `
      <span class="sb-chip" style="--sb-c: ${STAT_META[e.stat].color};" title="ขั้นที่ ${i + 1}: ${e.stat} ${froms[i]} → ${e.to} (ใช้ ${statRangeCost(froms[i], e.to)} แต้ม)">
        <button type="button" class="sb-mv" onclick="statQueueMove(${i}, -1)" ${i === 0 ? 'disabled' : ''} aria-label="เลื่อนขึ้น">‹</button>
        <span class="sb-chip-no">#${i + 1}</span>
        <b>${e.stat}</b> ${froms[i]} → ${e.to}
        <button type="button" class="sb-mv" onclick="statQueueMove(${i}, 1)" ${i === statWork.length - 1 ? 'disabled' : ''} aria-label="เลื่อนลง">›</button>
        <button type="button" class="sb-del" onclick="statQueueRemove(${i})" aria-label="ลบ">&times;</button>
      </span>`).join('')
      : '<span class="sb-empty">ยังไม่มีลำดับ — กด +1 / +5 / +10 ที่สเตตัสด้านบนตามลำดับที่อยากให้อัป หรือเลือก Preset</span>';
  }
}

// +n (n = 99: up to 99) adds to the last step when it is the same stat, else a new step; -1 lowers the last
// step of that stat (removed when it no longer raises anything)
function statQueueAdd(stat, n) {
  if (!statWork) return;
  const final = statFinal(statWork);
  if (n < 0) {
    for (let i = statWork.length - 1; i >= 0; i--) {
      if (statWork[i].stat !== stat) continue;
      statWork[i].to -= 1;
      break;
    }
  } else {
    const to = n >= 99 ? 99 : Math.min(99, final[stat] + n);
    const last = statWork[statWork.length - 1];
    if (last && last.stat === stat) last.to = to;
    else statWork.push({ stat, to });
  }
  setStatWorkForRound(currentStatResetRound, normalizeStatQueue(statWork));
  renderStatBuilderUI();
}
function statQueueRemove(i) {
  if (!statWork) return;
  statWork.splice(i, 1);
  setStatWorkForRound(currentStatResetRound, normalizeStatQueue(statWork));
  renderStatBuilderUI();
}
function statQueueMove(i, dir) {
  if (!statWork) return;
  const j = i + dir;
  if (j < 0 || j >= statWork.length) return;
  [statWork[i], statWork[j]] = [statWork[j], statWork[i]];
  setStatWorkForRound(currentStatResetRound, normalizeStatQueue(statWork));
  renderStatBuilderUI();
}
function resetStatQueue() {
  if (!statWork || !statWork.length) return;
  if (!confirm('ล้างลำดับการอัปสเตตัสของรอบนี้ทั้งหมด?')) return;
  setStatWorkForRound(currentStatResetRound, []);
  renderStatBuilderUI();
}
window.statQueueAdd = statQueueAdd;
window.statQueueRemove = statQueueRemove;
window.statQueueMove = statQueueMove;

function applyStatPreset(presetKey) {
  const p = STAT_PRESETS[presetKey];
  if (!p || !statWork) return;
  if (statWork.length && !confirm('แทนที่ลำดับรอบปัจจุบันด้วย Preset นี้?')) return;
  setStatWorkForRound(currentStatResetRound, normalizeStatQueue(p.map(([stat, to]) => ({ stat, to }))));
  renderStatBuilderUI();
}

function saveStatBuild() {
  if (!activeEditingPlan || !statWorkMain) return;
  setStatWorkForRound(currentStatResetRound, normalizeStatQueue(statWork || []));
  const queue = normalizeStatQueue(statWorkMain);
  const targets = statFinal(queue);
  const priorityOrder = buildPriorityOrderFromStatQueue(queue);
  const resetRounds = statResetRoundsWork.map(r => {
    const rq = normalizeStatQueue(r.queue || []);
    return {
      roundNo: r.roundNo,
      roundId: r.roundId,
      triggerId: r.triggerId,
      label: r.label,
      queue: rq,
      targets: statFinal(rq),
      priorityOrder: buildPriorityOrderFromStatQueue(rq)
    };
  });
  activeEditingPlan.statBuild = { queue, targets, priorityOrder, resetRounds };
  statWork = null;
  statWorkMain = null;
  statResetRoundsWork = [];
  if (typeof markPlanDirty === 'function') markPlanDirty();
  updatePlanEditorBadges();
  const modal = document.getElementById("stat-builder-modal");
  if (modal) modal.style.display = 'none';
}
function closeStatBuilder() {
  statWork = null;
  statWorkMain = null;
  statResetRoundsWork = [];
  const modal = document.getElementById("stat-builder-modal");
  if (modal) modal.style.display = 'none';
}

// 7. Setup Event Listeners for Plan Builder Modals
function setupPlanBuilderEventListeners() {
  // Buttons in Plan Editor Header
  const btnOpenSkill = document.getElementById("btn-open-skill-builder");
  if (btnOpenSkill) btnOpenSkill.onclick = openSkillBuilderModal;

  const btnOpenStat = document.getElementById("btn-open-stat-builder");
  if (btnOpenStat) btnOpenStat.onclick = openStatBuilderModal;

  const btnToggleParty = document.getElementById("btn-toggle-party-builder");
  if (btnToggleParty) {
    btnToggleParty.onclick = () => {
      const panel = document.getElementById("plan-party-config-panel");
      if (!panel) return;
      const isHidden = panel.style.display === 'none' || !panel.style.display;
      panel.style.display = isHidden ? 'block' : 'none';
      if (isHidden) updatePartyConfigInEditor();
    };
  }

  // Skill Builder Tab Buttons
  document.querySelectorAll('.skill-tab-btn').forEach(btn => {
    btn.onclick = () => {
      currentSkillBuilderTab = btn.getAttribute('data-tab');
      renderSkillBuilderUI();
    };
  });

  // Skill Builder Controls
  const btnSkillClose = document.getElementById("skill-builder-close-btn");
  const cancelSkillBuilder = () => {
    if (skillBuilderSnapshot && activeEditingPlan) activeEditingPlan.skillBuild = JSON.parse(skillBuilderSnapshot);
    skillBuilderSnapshot = null;
    document.getElementById("skill-builder-modal").style.display = 'none';
    updatePlanEditorBadges();
  };
  if (btnSkillClose) btnSkillClose.onclick = cancelSkillBuilder;
  const btnSkillCancel = document.getElementById("skill-builder-cancel-btn");
  if (btnSkillCancel) btnSkillCancel.onclick = cancelSkillBuilder;
  const btnSkillSave = document.getElementById("skill-builder-save-btn");
  if (btnSkillSave) btnSkillSave.onclick = saveSkillBuild;
  const btnSkillReset = document.getElementById("btn-skill-reset");
  if (btnSkillReset) btnSkillReset.onclick = resetSkillQueue;
  const btnSkillPreset = document.getElementById("btn-skill-apply-preset");
  if (btnSkillPreset) btnSkillPreset.onclick = applySkillPreset;

  // Stat Builder Controls
  const btnStatClose = document.getElementById("stat-builder-close-btn");
  if (btnStatClose) btnStatClose.onclick = closeStatBuilder;
  const btnStatCancel = document.getElementById("stat-builder-cancel-btn");
  if (btnStatCancel) btnStatCancel.onclick = closeStatBuilder;
  const btnStatReset = document.getElementById("btn-stat-reset");
  if (btnStatReset) btnStatReset.onclick = resetStatQueue;
  const btnStatSave = document.getElementById("stat-builder-save-btn");
  if (btnStatSave) btnStatSave.onclick = saveStatBuild;

  // Stat Presets
  const pAgiDex = document.getElementById("preset-stat-agi-dex");
  if (pAgiDex) pAgiDex.onclick = () => applyStatPreset('agi_dex');
  const pBlitz = document.getElementById("preset-stat-blitz");
  if (pBlitz) pBlitz.onclick = () => applyStatPreset('blitz_beat');
  const pStrAgi = document.getElementById("preset-stat-str-agi");
  if (pStrAgi) pStrAgi.onclick = () => applyStatPreset('str_agi');
  const pIntDex = document.getElementById("preset-stat-int-dex");
  if (pIntDex) pIntDex.onclick = () => applyStatPreset('int_dex');
  const pVit = document.getElementById("preset-stat-vit-tank");
  if (pVit) pVit.onclick = () => applyStatPreset('vit_tank');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupPlanBuilderEventListeners);
} else {
  setupPlanBuilderEventListeners();
}
