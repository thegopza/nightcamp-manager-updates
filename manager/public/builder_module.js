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
      "thai": "กดใช้",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "desc": "ฟาดอาวุธเต็มแรงใส่มอนตัวเดียวข้างหน้า 100% ของ ATK ผลักกระเด็น"
    },
    {
      "id": "e",
      "name": "พุ่งใบไม้",
      "thai": "กดใช้",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "desc": "พุ่งเป็นสายลมใบไม้ อมตะชั่วครู่ ชนมอนตัวแรกที่ขวาง 100% ของ ATK"
    },
    {
      "id": "mastery",
      "name": "ชำนาญอาวุธ",
      "thai": "กดใช้",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "desc": "ATK +4 (เลเวลละ +4)"
    },
    {
      "id": "body",
      "name": "ร่างกายแข็งแกร่ง",
      "thai": "กดใช้",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "desc": "HP สูงสุด +2% · ฟื้น HP +10%"
    },
    {
      "id": "mind",
      "name": "สมาธิแน่วแน่",
      "thai": "กดใช้",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "desc": "SP สูงสุด +2% · ฟื้น SP +10%"
    }
  ],
  "knight": [
    {
      "id": "bash",
      "name": "ฟันสะท้านเหล็ก",
      "thai": "สายดาบ",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "[มีฟรี Lv.1] · ฟาดดาบครั้งใหญ่ข้างหน้า 100% ของ ATK ทำให้มึน 1.2 วิ"
    },
    {
      "id": "kn_bowling",
      "name": "หมุนฟาดกระเด็น",
      "thai": "สายดาบ",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ฟันสะท้านเหล็ก Lv.5",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "desc": "ถือดาบ ดาบใหญ่ ดาบคู่ ขวาน ขวานยักษ์ หรือกระบอง: ATK +2% ความแม่น +1"
    },
    {
      "id": "kn_quicken",
      "name": "เร่งเพลงดาบ",
      "thai": "สายคลั่งศึก",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ชำนาญดาบ Lv.3",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "เร่งเพลงดาบ Lv.1",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "[มีฟรี Lv.1] · โดมแสงคุ้มกัน 5.3 วิ รับดาเมจลดลง 33%"
    },
    {
      "id": "kn_ironskin",
      "name": "ผิวเหล็ก",
      "thai": "สายผู้พิทักษ์",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "desc": "DEF +1 · HP สูงสุด +1% · ฟื้น HP +8%"
    },
    {
      "id": "kn_provoke",
      "name": "ตะโกนท้าทาย",
      "thai": "สายผู้พิทักษ์",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "desc": "ตะโกนท้าศัตรูรอบตัว ให้หันมาสู้กับเรา และรับดาเมจเพิ่ม 13% นาน 10 วิ"
    },
    {
      "id": "judgment",
      "name": "ดาบแสงพิพากษา",
      "thai": "สายผู้พิทักษ์",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "[มีฟรี Lv.1] · เปลวไฟระเบิดรอบตัว 100% ของ ATK ผลักศัตรู · อาวุธติดไฟ 4 วิ (ตีเป็นธาตุไฟ)"
    },
    {
      "id": "kn_pierce",
      "name": "แทงสามจังหวะ",
      "thai": "สายเพลิงหอก",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ระเบิดเพลิงรอบกาย Lv.3",
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
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "[มีฟรี Lv.1] · ยิงลูกไฟระเบิดเป็นวง 100% ของ MATK"
    },
    {
      "id": "mg_firewall",
      "name": "กำแพงไฟ",
      "thai": "สายไฟ",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "ลูกไฟ Lv.4",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "desc": "ดาเมจไฟ +2% · โอกาสติดเผา +3% · Lv5 เผาซ้อน 2 ชั้น"
    },
    {
      "id": "frostdiver",
      "name": "หอกน้ำแข็ง",
      "thai": "สายน้ำแข็ง",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "[มีฟรี Lv.1] · แนวหนามน้ำแข็งพุ่งไปข้างหน้า 100% ของ MATK แช่แข็ง 1.6 วิ"
    },
    {
      "id": "mg_frostnova",
      "name": "วงน้ำแข็ง",
      "thai": "สายน้ำแข็ง",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "หอกน้ำแข็ง Lv.4",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "desc": "ดาเมจน้ำ +3% · Lv5 ศัตรูเย็นเฉียบซ้อน 3 ชั้นแล้วแข็ง · Lv10 ตัวที่แข็งรับดาเมจเพิ่ม 20%"
    },
    {
      "id": "thunder",
      "name": "สายฟ้าฟาด",
      "thai": "สายสายฟ้า",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "[มีฟรี Lv.1] · สายฟ้าผ่าศัตรู 3 ตัว ตัวละ 100% ของ MATK"
    },
    {
      "id": "mg_stormheart",
      "name": "ใจสายฟ้า",
      "thai": "สายสายฟ้า",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "desc": "ดาเมจลม/สายฟ้า +3% · โอกาสช็อต +2% · Lv5 ช็อตแล้วรับดาเมจสายฟ้าเพิ่ม"
    },
    {
      "id": "meteor",
      "name": "มหาเวทธาตุ",
      "thai": "กดใช้",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "ใจเพลิง Lv.5 หรือ ใจน้ำแข็ง Lv.5 หรือ ใจสายฟ้า Lv.5",
      "desc": "อุกกาบาต 6 ลูกถล่มพื้นที่ ลูกละ 100% ของ MATK ธาตุไฟ · ใจธาตุที่เลเวลสูงสุดกำหนดสีวงเวท"
    },
    {
      "id": "mg_staffmastery",
      "name": "ชำนาญคทา",
      "thai": "สายเวทเร็ว",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "desc": "ถือคทาหรือออร์บ: ตีปกติเป็นดาเมจเวทจาก MATK แรงขึ้น 4% ความเร็วโจมตี +1% · นำ ATK 2% มารวมเป็น MATK · Lv5 ลูกแก้วทะลุ 1 ตัว · Lv10 ตีปกติยิงลูกที่สอง (40%)"
    },
    {
      "id": "mg_autospell",
      "name": "ร่ายอัตโนมัติ",
      "thai": "สายเวทเร็ว",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ชำนาญคทา Lv.3",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "desc": "ฟื้น SP +8% · SP สูงสุด +1% · Lv10 ร่ายอัตโนมัติคืน SP นิดหน่อย"
    }
  ],
  "archer": [
    {
      "id": "ar_bowmastery",
      "name": "ชำนาญธนู",
      "thai": "สายยิงรัว",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "desc": "ถือธนู: ATK +1.5% คริติคอล +0.5% · Lv10 ยิงปกติทุกดอกที่ 5 ยิงคู่ แรงขึ้น 50%"
    },
    {
      "id": "ar_concentrate",
      "name": "สมาธิเล็ง",
      "thai": "สายยิงรัว",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ชำนาญธนู Lv.1",
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
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "[มีฟรี Lv.1] · ยิงลูกธนูแสง 2 ดอกติดกัน ดอกละ 100% ของ ATK"
    },
    {
      "id": "ar_owl",
      "name": "ตาเหยี่ยว",
      "thai": "สายแม่นยำ",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "desc": "DEX +1 · ความแม่น +1"
    },
    {
      "id": "ar_charge",
      "name": "ธนูกระแทก",
      "thai": "สายแม่นยำ",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "ยิงคู่ Lv.3",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "ยิงคู่ Lv.5 หรือ ห่าฝนธนู Lv.5",
      "desc": "ชาร์จแล้วยิงลำแสงดาราทะลวงทั้งแนว 100% ของ ATK"
    },
    {
      "id": "shower",
      "name": "ห่าฝนธนู",
      "thai": "สายห่าศร",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "[มีฟรี Lv.1] · ธนู 20 ดอกตกใส่พื้นที่ข้างหน้า ดอกละ 60% ของ ATK"
    },
    {
      "id": "ar_multishot",
      "name": "ยิงกระจาย",
      "thai": "สายห่าศร",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ห่าฝนธนู Lv.3",
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
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "[มีฟรี Lv.1] · ลูกธนูพันพายุทะลุทุกตัวในแนว 100% ของ ATK ผลักกระเด็น"
    },
    {
      "id": "ar_snare",
      "name": "กับดักเถาวัลย์",
      "thai": "สายพรานพฤกษา",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "desc": "ถือมีดคู่: ตีปกติมีโอกาส 4% โดน 2 เท่า"
    },
    {
      "id": "ro_dagger",
      "name": "ชำนาญมีด",
      "thai": "สายคมมีด",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "desc": "ถือมีดคู่: หลบหลีก +1 ATK +1% ความเร็วโจมตี +1% · Lv10 ความเร็วโจมตีเพิ่มอีก 10%"
    },
    {
      "id": "ro_vital",
      "name": "จุดตาย",
      "thai": "สายคมมีด",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ชำนาญมีด Lv.3",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "โจมตีสองครั้ง Lv.5 หรือ แทงข้างหลัง Lv.5",
      "desc": "วาร์ปฟันรัว 8 ครั้ง ครั้งละ 100% ของ ATK ปิดท้ายฟันกากบาท x2.5"
    },
    {
      "id": "envenom",
      "name": "ฟันพิษ",
      "thai": "สายพิษ",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "[มีฟรี Lv.1] · ฟันไขว้ 2 ครั้ง ครั้งละ 100% ของ ATK ติดพิษ 3 วิ"
    },
    {
      "id": "venomdust",
      "name": "ม่านควันพิษ",
      "thai": "สายพิษ",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "desc": "พิษจากตีปกติแรงขึ้น 5% · ดาเมจพิษ +2% · ตีปกติโอกาสติดพิษ 2% · Lv10 ศัตรูที่ติดพิษตีเราเบาลง"
    },
    {
      "id": "shadowstep",
      "name": "ก้าวเงา",
      "thai": "สายเงา",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "[มีฟรี Lv.1] · หายตัวไปโผล่ข้างหลังศัตรู 100% ของ ATK · ตีปกติครั้งถัดไปคริติคอลแน่นอน"
    },
    {
      "id": "ro_hide",
      "name": "ซ่อนตัว",
      "thai": "สายเงา",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ซ่อนตัว Lv.2",
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
      "thai": "กดใช้",
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
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "[มีฟรี Lv.1] · ฟื้น HP ตัวเองและเพื่อนในปาร์ตี้รอบตัว 9% ของ HP สูงสุด + ตามพลังเวท · มอนอมตะ/ความมืดรอบตัวโดนแสง 100% ของ MATK"
    },
    {
      "id": "pr_resurrect",
      "name": "ชุบชีวิต",
      "thai": "สายฟื้นฟู",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "desc": "MDEF +1 · DEF +0 · รับดาเมจลดลง 0.8%"
    },
    {
      "id": "blessing",
      "name": "พรศักดิ์สิทธิ์",
      "thai": "สายบัฟทีม",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "[มีฟรี Lv.1] · ตัวเองและเพื่อนรอบตัว 66 วิ: STR INT DEX +1 (ได้ทั้ง ATK MATK ความแม่น และร่ายเร็วขึ้น)"
    },
    {
      "id": "pr_agi",
      "name": "เพิ่มความเร็ว",
      "thai": "สายบัฟทีม",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "[มีฟรี Lv.1] · ลำแสงจากฟ้าฟาดลงศัตรูใกล้เมาส์ 100% ของ MATK ธาตุแสง"
    },
    {
      "id": "pr_demonbane",
      "name": "ปราบมาร",
      "thai": "สายแสง",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "desc": "ดาเมจต่อมอนอมตะและความมืด +4%"
    },
    {
      "id": "magnus",
      "name": "วงเวทแสงขับมาร",
      "thai": "สายแสง",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "แสงศักดิ์สิทธิ์ Lv.5, ปราบมาร Lv.3",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "desc": "ถือกระบอง: ตีปกติแรงขึ้น 3% ความเร็วโจมตี +1% · Lv10 ตีครั้งที่ 5 ฟื้น HP เพื่อนที่เลือดน้อยสุด"
    },
    {
      "id": "pr_duple",
      "name": "ลงทัณฑ์",
      "thai": "สายพระนักสู้",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "[มีฟรี Lv.1] · ฟันดาบแสงข้างหน้า 100% ของ ATK/MATK (ที่สูงกว่า) ธาตุแสง ฟื้น HP 2.3% ต่อศัตรูที่โดน (สูงสุด 3 ตัว)"
    },
    {
      "id": "pal_cross",
      "name": "แสงกากบาทเผาผลาญ",
      "thai": "สายแสงศักดิ์สิทธิ์",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "desc": "HP สูงสุด +2% · รับดาเมจลดลง 1% · MDEF +0 · Lv10 แสงกากบาทเผาผลาญไม่เสีย HP"
    },
    {
      "id": "pal_heaven",
      "name": "ดาบสวรรค์พิพากษา",
      "thai": "สายแสงศักดิ์สิทธิ์",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ชำนาญดาบ Lv.5",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "เร่งเพลงดาบ Lv.5",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "บ้าคลั่ง Lv.3",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "โล่แสงศักดิ์สิทธิ์ Lv.5",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "โล่แสงศักดิ์สิทธิ์ Lv.5",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "โล่อีจิส Lv.3",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "[มีฟรี Lv.1] · แทงหอกพ่นไฟเป็นแนวยาว 100% ของ ATK ธาตุไฟ โดนทุกตัวในแนว"
    },
    {
      "id": "dk_spiral",
      "name": "หอกเกลียวสว่าน",
      "thai": "สายศาสตร์หอก",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "แทงเพลิงมังกร Lv.5, ชำนาญหอก Lv.3",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "desc": "ถือหอกหรือหอกยาว: ATK +2% ความแม่น +1"
    },
    {
      "id": "dk_quicken",
      "name": "เร่งหอก",
      "thai": "สายหอกรัว",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ชำนาญหอก Lv.3",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "เร่งหอก Lv.1",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ระเบิดเพลิงรอบกาย Lv.5",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
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
  "swordmaster": [
    {
      "id": "sm_twin",
      "name": "ดาบคู่ประสาน",
      "thai": "สายเพลงดาบคู่",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "เร่งเพลงดาบ Lv.3",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ดาบคู่ประสาน Lv.3",
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
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "[มีฟรี Lv.1] · ฟันรัว 6 ครั้ง ครั้งละ 100% ของ ATK ทุกครั้งทิ้งรอยดาบ · Lv5 ไม่เดินช้าลงระหว่างฟัน · Lv10 ครั้งสุดท้ายดึงรอยดาบทั้งหมดมาระเบิดที่เป้า"
    },
    {
      "id": "sm_thousand",
      "name": "จันทร์พันดาบ",
      "thai": "สายเพลงดาบคู่",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "ระบำใบมีดใต้จันทร์ Lv.5, สายฝนดาบ Lv.5",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "desc": "ท้าเป้า 1 ตัว 12 วิ มันหันมาตีเรา เราทำดาเมจใส่มัน +4% · ชนะดวลได้ \"เกียรตินักดาบ\" ATK +5% 20 วิ ซ้อนได้ 3 ชั้น · Lv5 ดาเมจใส่คู่ดวล +20%"
    },
    {
      "id": "sm_eye",
      "name": "สายตานักดาบ",
      "thai": "สายเจตจำนงนักดาบ",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ชำนาญดาบ Lv.3",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "desc": "60 วิ: ใส่ธาตุไฟ น้ำแข็ง หรือสายฟ้าให้ดาบ (กดซ้ำเพื่อสลับธาตุ) ตีปกติเพิ่ม MATK 46% ธาตุนั้น ติดสถานะของธาตุ · ตีปกติทุกครั้งที่ 3 ทิ้งรอยดาบ · Lv5 สลับธาตุแล้วฮิตธาตุครั้งแรกแรงขึ้น 30% · Lv10 ใส่ได้ 2 ธาตุพร้อมกัน"
    },
    {
      "id": "sm_wave",
      "name": "คลื่นดาบเวท",
      "thai": "สายดาบเวท",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "[มีฟรี Lv.1] · ฟันปล่อยคลื่นเวทธาตุของดาบไป 500 100% ของ ATK+MATK ทิ้งรอยดาบบนตัวที่โดน · Lv5 คลื่นทะลุ · Lv10 ปล่อย 3 คลื่นเป็นพัด"
    },
    {
      "id": "sm_float",
      "name": "ดาบเวทลอย",
      "thai": "สายดาบเวท",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "คลื่นดาบเวท Lv.3, ใส่ธาตุดาบ Lv.3",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "ใส่ธาตุดาบ Lv.5",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "คลื่นดาบเวท Lv.1",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "ชักดาบผ่ารอย Lv.3",
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
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "[มีฟรี Lv.1] · พุ่งเข้าหาเป้าแล้วฟันไขว้ 2 ครั้ง ครั้งละ 100% ของ ATK ลงเลือด 2 ชั้น (15% ATK ต่อวิต่อชั้น 5 วิ สูงสุด 5 ชั้น) โทสะ +15 · Lv5 ฟันครั้งที่ 3 · Lv10 พุ่งทะลุ"
    },
    {
      "id": "bk_whirlwind",
      "name": "ดาบพายุหมุน",
      "thai": "สายเพลงดาบใหญ่",
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
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "[มีฟรี Lv.1] · ง้างสะสมพลัง 0.7 วิ (อมตะระหว่างง้าง) แล้วทุบเป็นกรวย 100% ของ ATK ธาตุดิน โทสะ +16 · ค้อน: มึน 2 วิ · ขวาน: ลงเลือด 3 ชั้น · Lv10 แรงเพิ่ม 40% แลก HP 5%"
    },
    {
      "id": "bk_leap",
      "name": "กระโดดทุบธรณี",
      "thai": "สายทลายพสุธา",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "ฟันประหาร Lv.5 หรือ กระโดดทุบธรณี Lv.5",
      "desc": "ใช้โทสะทั้งหมด (อย่างน้อย 1 ช่อง) ตัวโตเป็นยักษ์ 6 วิ + 2 วิต่อช่อง รับดาเมจลด 25% ศัตรูรอบตัวช้าลง ตีปกติส่งคลื่นกระแทก 100% ของ ATK · ท่าปิดไม่ใช้โทสะและนับเป็น 3 ช่อง · จบแล้วระเบิด 400% และ 8 วิไม่ได้โทสะ · ร่างยักษ์ ตีปกติส่งคลื่นกระแทก"
    },
    {
      "id": "bk_warcry",
      "name": "คำรามศึก",
      "thai": "สายจ่าฝูง",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "desc": "20 วิ: ทีม ATK +6% · ตัวเองความเร็วโจมตี +1% · โทสะ +30 · ศัตรูรอบตัวรับดาเมจ +15% 6 วิ"
    },
    {
      "id": "bk_roar",
      "name": "คำรามท้ารบ",
      "thai": "สายจ่าฝูง",
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
  "archmage": [
    {
      "id": "am_chain",
      "name": "สายฟ้าลูกโซ่",
      "thai": "สายพายุอสนี",
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
      "maxLevel": 1,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "desc": "ปฏิกิริยาธาตุแรงขึ้น 6% · เวทจากร่ายอัตโนมัติหรือเวทคู่ที่เกิดปฏิกิริยา โอกาส 10% ร่ายอัตโนมัติต่อทันทีด้วยลูกแก้วถัดไป (ต่อได้ 3 ครั้ง) · Lv3 ปฏิกิริยาแพร่ · Lv5 ปฏิกิริยาใหม่ 2 แบบ"
    },
    {
      "id": "am_doublecast",
      "name": "เวทคู่",
      "thai": "สายเวทรัวหลอมธาตุ",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ชำนาญคทา Lv.5",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "desc": "ร่ายธาตุต่างจากครั้งก่อน ดาเมจเวท +8% ซ้อนได้ 3 ชั้น (6 วิ) · Lv1 ร่ายธาตุต่างจากครั้งก่อน ดาเมจ +8% ซ้อน 3 ชั้น · Lv3 ปฏิกิริยาธาตุแรงขึ้น 50% · Lv5 ปฏิกิริยาธาตุทุกครั้งคืน SP 0.5% ของ SP สูงสุด"
    },
    {
      "id": "am_trinity",
      "name": "มหาเวทสามธาตุ",
      "thai": "สายมหาเวทสามธาตุ",
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
      "desc": "ไฟ น้ำแข็ง สายฟ้าหมุนรอบตัว 6 วิ ทุกสกิลที่ร่ายนับเป็นสองธาตุ ปลดเวทผสมทุกครั้ง · ลูกแก้วธาตุยิงศัตรูใกล้สุดทุก 0.6 วิ 100% ของ MATK · ทุกสกิลที่ร่ายนับเป็นสองธาตุ"
    }
  ],
  "warlock": [
    {
      "id": "wl_soulfire",
      "name": "ไฟวิญญาณ",
      "thai": "สายไฟวิญญาณ",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "[มีฟรี Lv.1] · ลูกไฟวิญญาณระเบิดเป็นวง 100% ของ MATK และติดพิษ 3 วิ"
    },
    {
      "id": "wl_soulburn",
      "name": "คำสาปเผาวิญญาณ",
      "thai": "สายไฟวิญญาณ",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ชำนาญคทา Lv.3",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ตะเกียงแกว่ง Lv.1",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "ตะเกียงแกว่ง Lv.3",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "desc": "โซ่รูนผุดที่เมาส์ 100% ของ MATK ตรึงศัตรู 1.6 วิ และรับดาเมจเพิ่ม 15% นาน 6 วิ"
    },
    {
      "id": "wl_hex",
      "name": "ตราคำสาปมรณะ",
      "thai": "สายคำสาป",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "โซ่คำสาป Lv.3",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "desc": "วิญญาณน้อย 3 ดวงวนรอบตัว 13 วิ ยิงศัตรูใกล้ ๆ ทุกวินาที ดวงละ 100% ของ MATK · อยู่นานขึ้นและแรงขึ้นทุกเลเวล · 3 ดวง (ปรมาจารย์ตะเกียง Lv3: 4 ดวง)"
    },
    {
      "id": "wl_lantern",
      "name": "ภูตตะเกียง",
      "thai": "สายภูตตะเกียง",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "เรียกวิญญาณ Lv.3",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
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
  "firemage": [
    {
      "id": "fm_pillar",
      "name": "เสาเพลิง",
      "thai": "สายนรกเพลิง",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "[มีฟรี Lv.1] · เสาไฟปะทุใต้ศัตรู 3 ครั้ง (ถือคทา 4 ครั้ง) ครั้งละ 100% ของ MATK ความร้อน +8 · Lv5 ตัวที่เผาอยู่โดนเพิ่ม 20% · Lv10 ทิ้งพื้นไฟ 3 วิ"
    },
    {
      "id": "fm_sea",
      "name": "ทะเลเพลิง",
      "thai": "สายนรกเพลิง",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "เสาเพลิง Lv.3",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "[มีฟรี Lv.1] · ร่ายสกิลไฟได้ความร้อน 0–100 ทุก 10 ความร้อน ดาเมจไฟ +0.6% · เกิน 80 ฟื้น HP 1% ต่อวิ · ไม่ร่ายไฟ 3 วิ ความร้อนลดวิละ 10 · Lv5 ความร้อนลดช้าลงครึ่งหนึ่ง · Lv10 ที่ 100 ความร้อน ร่ายไฟไม่ใช้ SP"
    },
    {
      "id": "fm_vent",
      "name": "ระบายความร้อน",
      "thai": "สายความร้อน",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "desc": "HP สูงสุด +1.5% · ร่ายเร็วขึ้น 0.25% ต่อ VIT 1"
    },
    {
      "id": "fm_orbfire",
      "name": "ลูกไฟตีปกติ",
      "thai": "สายลูกไฟรัว",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ชำนาญคทา Lv.1",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ลูกไฟตีปกติ Lv.3",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "ลูกไฟตีปกติ Lv.5",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "ทะเลเพลิง Lv.5 หรือ ระบายความร้อน Lv.5",
      "desc": "อุกกาบาต 16 ลูกร่วงใส่วงใหญ่ 3 วิ 4 ลูกพุ่งใส่ศัตรูในวง ลูกละ 100% ของ MATK วงระเบิดใหญ่ · ร่ายตอนความร้อน 100 ได้ลูกยักษ์เพิ่ม 1 ลูก (×3.2) · ร่ายตอนความร้อน 100 ได้ลูกยักษ์"
    }
  ],
  "icemage": [
    {
      "id": "im_blizzard",
      "name": "พายุหิมะ",
      "thai": "สายธารน้ำแข็ง",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "[มีฟรี Lv.1] · พายุหิมะ 5 วิที่เมาส์ วิละ 100% ของ MATK มีโอกาสเย็นเฉียบทุกวิ ศัตรูช้า · ถือคทา: วงใหญ่ขึ้น 30% · Lv10 พายุตามเป้าหมาย"
    },
    {
      "id": "im_lance",
      "name": "หอกธารน้ำแข็ง",
      "thai": "สายธารน้ำแข็ง",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "หอกน้ำแข็ง Lv.5",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "desc": "ศัตรูที่อยู่ใกล้เราในระยะ 200 ช้าลง · เย็นเฉียบ 1 ชั้นทุก 5 วิ"
    },
    {
      "id": "im_zero",
      "name": "ศูนย์สัมบูรณ์",
      "thai": "สายธารน้ำแข็ง",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "[มีฟรี Lv.1] · สกิลโดนตัวที่แข็งอยู่ มันแตกกระจาย ดาเมจเพิ่ม 68% ของ MATK เศษน้ำแข็ง 4 ชิ้นกระเด็นไปแช่ตัวข้าง ๆ · Lv5 เศษ 6 ชิ้น · Lv10 แตกต่อเป็นลูกโซ่"
    },
    {
      "id": "im_breath",
      "name": "ลมหายใจเยือกแข็ง",
      "thai": "สายแตกกระจาย",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "desc": "60 วิ: เกราะดูดซับดาเมจ 175% ของ MATK คนที่ตีเราประชิดติดเย็นเฉียบ · ถือโล่: เกราะหนาขึ้น 40% · Lv5 เกราะแตกแล้วระเบิดแช่รอบตัว · Lv10 เกราะฟื้นเองทุก 20 วิ"
    },
    {
      "id": "im_wall",
      "name": "กำแพงน้ำแข็ง",
      "thai": "สายปราการน้ำแข็ง",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ชำนาญคทา Lv.1",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "ผลึกระเบิด Lv.5 หรือ เกราะน้ำแข็ง Lv.5",
      "desc": "ทั้งจอหนาวจัด 8 วิ ศัตรูทุกตัวเย็นเฉียบทุกวิ (100% ของ MATK) ตัวที่แข็งแตกกระจายเองทุก 2 วิ · พื้นที่เหลือ 50% ของเดิม · ทั้งจอหนาวจัด 8 วิ"
    }
  ],
  "ranger": [
    {
      "id": "rg_fearbreeze",
      "name": "พายุศรเร็ว",
      "thai": "สายพายุศรเร็ว",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ยิงเบิ้ล Lv.5",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "พายุศรเร็ว Lv.3, ตาทิพย์ Lv.3",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ธนูกระแทก Lv.3",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "ตาอินทรี Lv.1",
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
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "[มีฟรี Lv.1] · ยิงธนูพันลม 3 ดอกเป็นพัดแคบ ทะลุทุกตัวในแนว ดอกละ 100% ของ ATK · ทุกดอกทะลุทั้งแนว"
    },
    {
      "id": "rg_piercer",
      "name": "ธนูใบไม้ทะลวง",
      "thai": "สายพายุพฤกษา",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ธนูพายุทะลวง Lv.5",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "ธนูใบไม้ทะลวง Lv.5",
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
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "[มีฟรี Lv.1] · เรียกหมาป่าคู่ใจ อยู่จนกว่าจะหมดแรง กัดครั้งละ 100% ของ ATK · ตัวใหญ่ 85% เลือด 40% ของเรา · (Lv 5 กัดติดเลือดออก) · (Lv 8 กัดโดนรอบตัว) · โตทุกเลเวล · Lv5 กัดเลือดออก · Lv8 กัดโดนรอบตัว · Lv10 ขนสีทอง"
    },
    {
      "id": "wh_command",
      "name": "สั่งขย้ำ",
      "thai": "สายหมาป่าคู่ใจ",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "[มีฟรี Lv.1] · สั่งเหยี่ยวโฉบ 1 ครั้ง ครั้งละ 18 (ตาม DEX และ INT) ไม่สน DEF ไม่พลาด · Lv5 โฉบเป็นวงโดนรอบเป้า · Lv10 เหยี่ยวสายฟ้า ติดช็อต"
    },
    {
      "id": "wh_autoblitz",
      "name": "เหยี่ยวโฉบอัตโนมัติ",
      "thai": "สายเหยี่ยว",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "เหยี่ยวโฉบล่า Lv.3",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
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
      "thai": "สายสายเลือดจันทร์",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "desc": "สัตว์ที่เรียกมาแรงขึ้น 8% · ATK +1%"
    },
    {
      "id": "wh_howl",
      "name": "หอนเรียกพลัง",
      "thai": "สายสายเลือดจันทร์",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
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
      "thai": "สายสายเลือดจันทร์",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
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
      "thai": "สายสายเลือดจันทร์",
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
      "desc": "ยิงปกติโอกาส 0.6% ให้หมาป่าพุ่งไปกัดเป้าที่เรายิงทันที · Lv5 กัดแล้วตรึง 1 วิ · Lv10 ทุกครั้งที่หมาป่ากัด เรายิงเร็วขึ้น 0.5% ซ้อน 10 ชั้น"
    },
    {
      "id": "wh_fang",
      "name": "ธนูเขี้ยวหมาป่า",
      "thai": "สายนักล่า",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "desc": "ลูกธนูเขี้ยวหมาป่า 100% ของ ATK · ถ้าหมาป่าออกมาอยู่ มันจะวิ่งไปกัดเป้าเดียวกัน"
    },
    {
      "id": "wh_mark",
      "name": "ล่าเป้าหมาย",
      "thai": "สายนักล่า",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "desc": "ถือธนู: ATK +2% DEX +0"
    }
  ],
  "bard": [
    {
      "id": "bd_tempo",
      "name": "เพลงเร่งจังหวะ",
      "thai": "สายเพลงรอบกองไฟ",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "[มีฟรี Lv.1] · เล่นต่อเนื่อง (SP 2/วิ) รัศมี 450: ตัวเองความเร็วโจมตี +1% เพื่อนตีแรงขึ้น 1% คูณท่อน (ท่อนขึ้นทุก 5 วิ ×1 / ×1.5 / ×2) · กดอีกครั้ง = ท่อนฮุก: ตัวเองตีปกติ 3 ครั้งถัดไปคริแน่นอน เพื่อนตีแรงขึ้น 30% 4 วิ · ท่อนขึ้นทุก 5 วิ แรง ×1 / ×1.5 / ×2 · กดซ้ำตอนท่อน 2 ขึ้นไป = ท่อนฮุก"
    },
    {
      "id": "bd_warm",
      "name": "เพลงอุ่นไอไฟ",
      "thai": "สายเพลงรอบกองไฟ",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "เพลงเร่งจังหวะ Lv.3",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "เพลงเร่งจังหวะ Lv.3",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "เพลงอุ่นไอไฟ Lv.3",
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
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "[มีฟรี Lv.1] · ควงแส้ปลายไฟรอบตัว 2 วิ ทุก 0.25 วิ 100% ของ ATK มีโอกาสติดเผา 35% · พื้นที่ 200% ของเดิม · ติดเผา"
    },
    {
      "id": "bd_firefly",
      "name": "ระบำหิ่งห้อย",
      "thai": "สายระบำไฟ",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ระบำควงไฟ Lv.3",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ระบำควงไฟ Lv.3",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "ระบำควงไฟ Lv.1",
      "prereq": [
        {
          "skill": "bd_twirl",
          "level": 1
        }
      ],
      "desc": "ฟาดแส้ยาว 320 100% ของ ATK ดึงศัตรูเข้าหา · ดึงศัตรูเข้าหา"
    },
    {
      "id": "bd_note",
      "name": "โน้ตเด้ง",
      "thai": "สายโน้ตดนตรี",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ยิงคู่ Lv.3",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "โน้ตเด้ง Lv.3",
      "prereq": [
        {
          "skill": "bd_note",
          "level": 3
        }
      ],
      "desc": "ตัวโน้ต 6 ตัวตกใส่วง ตัวละ 100% ของ ATK · ท่อนเพลงยิ่งสูงยิ่งตกเพิ่ม (+2 ต่อท่อน) · ท่อนเพลงยิ่งสูงยิ่งตกเพิ่ม"
    },
    {
      "id": "bd_groove",
      "name": "จังหวะเร้าใจ",
      "thai": "สายโน้ตดนตรี",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "วงดนตรี Lv.1 หรือ ระบำหลอกล่อ Lv.5",
      "desc": "จุดกองไฟใหญ่ 15 วิ เพลงของเราแรงเป็นสองเท่าตอนอยู่ใกล้กองไฟ เพื่อนใกล้กองไฟตีแรงขึ้น 25% ศัตรูที่เข้าใกล้ติดเผาวิละ 100% ของ ATK และหลับ 2 วิครั้งแรก · ทุกเพลงที่เรียนไว้ที่ท่อน 3"
    }
  ],
  "gunslinger": [
    {
      "id": "gs_spin",
      "name": "หมุนโม่",
      "thai": "สายโม่เสี่ยงดวง",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "desc": "ทุกนัดที่ 6 ของลูกโม่คริแน่นอนและแรงขึ้น 5% · ทุกนัดที่ 6 คริแน่นอน"
    },
    {
      "id": "gs_special",
      "name": "บรรจุกระสุนพิเศษ",
      "thai": "สายโม่เสี่ยงดวง",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "ตาเหยี่ยว Lv.3",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "desc": "ถือปืนพก: ความเร็วโจมตี +1.5% บรรจุกระสุนเร็วขึ้น 5% · บรรจุเร็วขึ้น"
    },
    {
      "id": "gs_rapid",
      "name": "ลั่นไกรัว",
      "thai": "สายปืนพกคู่",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ชำนาญปืนพก Lv.3",
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
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "[มีฟรี Lv.1] · ยิงกระสุนที่เหลือในลูกโม่ออกหมดรวดเดียว นัดละ 100% ของ ATK แล้วบรรจุใหม่ · ทุกนัดได้ผลกระสุนพิเศษและนัดที่หก หมุนโม่ได้นัดแรก · ยิงกระสุนที่เหลือทั้งหมด · Lv5 บรรจุเร็วขึ้น · Lv10 ลูกโม่เต็มนัดสุดท้าย ×2"
    },
    {
      "id": "gs_ricochet",
      "name": "กระสุนสะท้อน",
      "thai": "สายปืนพกคู่",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "รัวค้อนปืน Lv.5",
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
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "[มีฟรี Lv.1] · ยิงกรวย 9 ลูกปรายทะลุทุกตัวในแนว ระยะ 350 ลูกละ 100% ของ ATK · ใกล้ยิ่งโดนหลายลูก"
    },
    {
      "id": "gs_kick",
      "name": "ถีบถอย",
      "thai": "สายลูกซอง",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "ลูกปรายกระจาย Lv.3",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "desc": "ขว้างระเบิดควันวง 220 100% ของ ATK ธาตุไฟ ศัตรูในควันตีเบาลง 30% นาน 4 วิ (ใช้ได้ทุกอาวุธ) · ใช้ได้ทุกอาวุธ"
    },
    {
      "id": "gs_stars",
      "name": "ยิงดาวตก",
      "thai": "สายยิงดาวตก",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "กระสุนสะท้อน Lv.3 หรือ ถีบถอย Lv.3",
      "desc": "ยิงขึ้นฟ้า 1 นัด อีก 1 วิดาวตก 12 ดวงร่วงรอบเป้า ดวงละ 100% ของ ATK · ดาวตก 12 ดวง"
    }
  ],
  "assassin": [
    {
      "id": "as_haste",
      "name": "เร่งนักฆ่า",
      "thai": "สายคริติคอล",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "โจมตีสองครั้ง Lv.5",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "ชำนาญมีด Lv.10",
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
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "[มีฟรี Lv.1] · พุ่งฟันมีดคู่ทะลุศัตรู 2 ครั้ง ครั้งละ 100% ของ ATK"
    },
    {
      "id": "as_meteor",
      "name": "อุกกาบาตเงา",
      "thai": "สายคริติคอล",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "เขี้ยวมัจจุราช Lv.5 หรือ เขี้ยวคู่ Lv.5",
      "desc": "ประทับตรามรณะแล้ววาร์ปฟันรอบตัวเป้า 10 ครั้ง ครั้งละ 100% ของ ATK ปิดท้าย x3 และติดพิษ"
    }
  ],
  "shinobi": [
    {
      "id": "sh_throwing",
      "name": "ดาวคู่",
      "thai": "สายซัดรัว",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "โจมตีสองครั้ง Lv.3",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "desc": "ขว้างดาวยักษ์ยักษ์ไป 420 แล้ววกกลับเข้ามือ โดนทั้งขาไปและขากลับ ครั้งละ 100% ของ ATK · คอมโบซัดเงา: ใช้สกิลซัดคนละตัวต่อกันภายใน 3 วิ แรงขึ้น ×1.05 / ×1.1 และร่างเงาปาท่าก่อนหน้าซ้ำ 15% · Lv5 ใหญ่ขึ้น · Lv10 ปลายทางหมุนค้างดูดมอนเข้าหา"
    },
    {
      "id": "sh_fan",
      "name": "พัดดาวกระจาย",
      "thai": "สายซัดรัว",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "ขว้างดาวยักษ์วกกลับ Lv.5",
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
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "[มีฟรี Lv.1] · ปาคุไนติดยันต์ไฟ ปักแล้วระเบิดใน 0.5 วิ 100% ของ ATK/MATK (ที่สูงกว่า) ธาตุไฟ"
    },
    {
      "id": "sh_katon",
      "name": "คาถาไฟ",
      "thai": "สายคาถาไฟ",
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
      "thai": "กดใช้",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
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
  "reaper": [
    {
      "id": "rp_souls",
      "name": "เก็บวิญญาณ",
      "thai": "สายดวงวิญญาณ",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "desc": "ตีติดรอย (ตีปกติ 1 สกิล 2) ครบ 5 รอยวิญญาณสุก 3 วิ ตีอีกครั้งเกี่ยวได้ 1 ดวง (สุกซ้ำได้หลัง 6 วิ บอส 3 วิ) ตัวที่สุกล้มทิ้งวิญญาณบนพื้น 4 วิ เก็บได้ในระยะ 400 · เก็บได้ 20 ดวง ดวงละ ATK +1.2% ดูดเลือด 0.1% · ตีครบ 5 รอยวิญญาณสุก ตีอีกครั้งเกี่ยว · Lv5 สุกนานขึ้น · Lv10 ครบ 20 ดวง ตีเร็วขึ้น 20%"
    },
    {
      "id": "rp_ghost",
      "name": "ร่างวิญญาณ",
      "thai": "สายดวงวิญญาณ",
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
      "desc": "30 วิ: รับดาเมจลดลง 1% ต่อดวงวิญญาณที่มี (สูงสุด 25%)"
    },
    {
      "id": "rp_death",
      "name": "ความตายเยือน",
      "thai": "สายดวงวิญญาณ",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "desc": "ถือเคียวใหญ่: ตีปกติกวาดกว้างโดนทุกตัวข้างหน้า ATK +2%"
    },
    {
      "id": "rp_sweep",
      "name": "ฟันเก็บเกี่ยว",
      "thai": "สายเคียวเก็บเกี่ยว",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "[มีฟรี Lv.1] · หมุนเคียวรอบตัว 2 รอบ รอบละ 100% ของ ATK ดูดเลือด 5% ของดาเมจ · Lv5 ดึงเข้ากลาง · Lv10 โดน 3 ตัวได้วิญญาณ"
    },
    {
      "id": "rp_execute",
      "name": "ประหารใต้จันทร์",
      "thai": "สายเคียวเก็บเกี่ยว",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ฟันเก็บเกี่ยว Lv.5",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ชำนาญมีด Lv.3",
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
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "[มีฟรี Lv.1] · ขว้างเคียวสองเล่มไป 450 แล้ววกกลับ โดนทั้งขาไปขากลับ 100% ของ ATK · Lv5 ขากลับดึง · Lv10 4 เล่มกากบาท"
    },
    {
      "id": "rp_hook",
      "name": "เกี่ยววิญญาณ",
      "thai": "สายเคียวคู่หมุนวน",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "ขว้างเคียววกกลับ Lv.3",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "ประหารใต้จันทร์ Lv.5 หรือ เกี่ยววิญญาณ Lv.3",
      "desc": "ใช้ดวงวิญญาณทั้งหมด: ดวงวิญญาณหมุนรอบตัวเป็นพายุ 6 วิ ทุกวิดวงละ 100% ของ ATK ดูดเลือด 3% · ยิ่งมีวิญญาณยิ่งแรง"
    }
  ],
  "puppeteer": [
    {
      "id": "pp_puppet",
      "name": "สร้างหุ่นรบ",
      "thai": "สายหุ่นรบ",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "[มีฟรี Lv.1] · หุ่นไม้ตัวใหญ่สู้ข้างเราถาวร HP 65% ของ HP สูงสุดเรา ตี 100% ของ ATK · กดอีกครั้งเปลี่ยนแบบ: ขวาน (ตีหมู่) → โล่ (ยั่วยุ ทนกว่า) → หน้าไม้ (ยิงไกล) · Lv5 หุ่นได้ท่าพิเศษของแบบนั้น · Lv10 หุ่นร่างใหญ่"
    },
    {
      "id": "pp_strings",
      "name": "ชักใยหุ่น",
      "thai": "สายหุ่นรบ",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "สร้างหุ่นรบ Lv.3",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "สร้างหุ่นรบ Lv.3",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "สร้างหุ่นรบ Lv.5",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ชำนาญมีด Lv.3",
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
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "[มีฟรี Lv.1] · ขึงด้ายจากเราไปจุดที่เล็งยาว 400 นาน 6 วิ ศัตรูที่แตะด้ายโดน 100% ของ ATK ทุกครึ่งวิ ขึงได้ 3 เส้น · Lv5 ด้ายไขว้ระเบิดที่จุดตัด · Lv10 ขึงได้ 5 เส้น"
    },
    {
      "id": "pp_bind",
      "name": "รัดด้าย",
      "thai": "สายด้ายสังหาร",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ขึงด้ายเหล็ก Lv.3",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "ระบำหุ่น Lv.5 หรือ รัดด้าย Lv.5",
      "desc": "เวทีหุ่นเชิดรอบตัวเรา (วง 900) 8 วิ ศัตรูทุกตัวบนเวทีถูกตรึงอยู่กับที่ โดน 100% ของ ATK ทุกวิ แล้วหันไปฟาดตัวข้าง ๆ ด้วยพลังของเรา · ทุก 2 วิ กระตุกด้ายลากมอนเข้าหาเรา · จบโชว์ \"ปิดม่าน\" ฟาดทุกตัว 5800% · บอสไม่ถูกตรึง แต่ช้าลงและหันไปตีหุ่นรบ · พื้นที่เหลือ 50% ของเดิม · วง 900 ตามตัว 8 วิ · มอนฟาดกันด้วยพลังเรา · กระตุกด้าย · ปิดม่าน"
    }
  ],
  "bishop": [
    {
      "id": "bi_heal",
      "name": "วงแสงเยียวยา",
      "thai": "สายฟื้นฟูชั้นสูง",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "[มีฟรี Lv.1] · วงแสงรักษาตัวเองและเพื่อนรอบตัว 10% ของ HP สูงสุด + ตามพลังเวท · ศัตรูรอบตัวโดนแสง 100% ของ MATK"
    },
    {
      "id": "bi_sanctuary",
      "name": "ลานแสงเยียวยา",
      "thai": "สายฟื้นฟูชั้นสูง",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "แสงศักดิ์สิทธิ์ Lv.5",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ชำนาญกระบอง Lv.5",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ลงทัณฑ์ Lv.3",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ปล่อยพลังปราณ Lv.3",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ฝ่ามือร้อยทิศ Lv.3",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "[มีฟรี Lv.1] · คลื่นปราณพุ่งทะลุทั้งแนว 100% ของ ATK · มีลูกปราณ: ใช้ 1 ลูก แรงขึ้น 50%"
    },
    {
      "id": "mo_spheres",
      "name": "ลูกปราณ",
      "thai": "สายลูกปราณ",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "desc": "สะสมลูกปราณ 1 ลูก (สูงสุด 1) ลูกละ ATK +3% · บางสกิลใช้ลูกปราณเพิ่มพลัง · สูงสุดตามเลเวล (1 → 5 ลูก)"
    },
    {
      "id": "mo_impact",
      "name": "ฝ่ามือทะลวงปราณ",
      "thai": "สายลูกปราณ",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ปล่อยพลังปราณ Lv.5",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "desc": "ATK +3% · ความแม่น +1"
    },
    {
      "id": "mo_dodge",
      "name": "ก้าวไร้เงา",
      "thai": "สายร่างเหล็ก",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "desc": "หลบหลีก +2 · หลบสมบูรณ์ +0%"
    }
  ],
  "lightkeeper": [
    {
      "id": "lk_radiance",
      "name": "รัศมีแสง",
      "thai": "สายเขตแสง",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "desc": "รอบตัวเป็นเขตแสงรัศมี 210 พวกเราในแสงฟื้น HP 0.5% ทุก 5 วิ ผี อมตะ และธาตุมืดในแสงโดนเผาวิละ 23% ของ MATK · กลางคืนและในดันเจี้ยนแสงกว้างขึ้น 30% · กลางคืนและในดันเจี้ยนแสงกว้างขึ้น 30%"
    },
    {
      "id": "lk_flash",
      "name": "แสงไล่เงา",
      "thai": "สายเขตแสง",
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
      "desc": "แสงวาบรัศมี 300 ศัตรูโดน 100% ของ MATK ธาตุแสง ผีและอมตะมึน 1 วิ · ผีและอมตะมึน 1 วิ"
    },
    {
      "id": "lk_lighthouse",
      "name": "ประภาคาร",
      "thai": "สายเขตแสง",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ชำนาญกระบอง Lv.1",
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
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "[มีฟรี Lv.1] · ฟาดคบเพลิงเป็นวงข้างหน้า 100% ของ ATK ธาตุไฟ ทิ้งเปลวไฟที่พื้น 3 วิ (เป็นเขตแสงด้วย) · ทิ้งเปลวไฟที่เป็นเขตแสง"
    },
    {
      "id": "lk_plant",
      "name": "ปักคบเพลิง",
      "thai": "สายคบเพลิงศักดิ์สิทธิ์",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "ฟาดเปลวไฟ Lv.3",
      "prereq": [
        {
          "skill": "lk_swing",
          "level": 3
        }
      ],
      "desc": "ปักคบเพลิงสำรองลงพื้น 20 วิ เป็นเขตแสงรัศมี 250 เผาศัตรูที่เข้าใกล้ทุกครึ่งวิ 100% ของ MATK ปักได้ 2 อัน · ปักได้ 2 อัน"
    },
    {
      "id": "lk_faith",
      "name": "ไฟศรัทธา",
      "thai": "สายคบเพลิงศักดิ์สิทธิ์",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ชำนาญคบเพลิง Lv.3",
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
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "[มีฟรี Lv.1] · วางโคมแก้วที่พื้นได้ 3 ดวง อยู่ 25 วิ (ถือคทา 35 วิ) แต่ละดวงเป็นเขตแสงรัศมี 220 ฮีลพวกเราในแสงวิละ 29% ของ MATK · Lv5 วางได้ 4 ดวง · Lv10 โคมลอยตามเพื่อน"
    },
    {
      "id": "lk_flare",
      "name": "โคมเรืองรอง",
      "thai": "สายโคมแก้ว",
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
      "desc": "โคมทุกดวงสว่างวาบ ฮีลทุกคนในแสงของโคม 170% ของ MATK ทันที · ฮีลทุกคนในแสงของโคม"
    },
    {
      "id": "lk_wick",
      "name": "ไส้ตะเกียงอย่างดี",
      "thai": "สายโคมแก้ว",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "desc": "ฮีลจากพลังเวทแรงขึ้น 2% ฟื้น SP เร็วขึ้น 3%"
    },
    {
      "id": "lk_dawn",
      "name": "รุ่งอรุณ",
      "thai": "สายรุ่งอรุณ",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "โคมเรืองรอง Lv.5 หรือ ปักคบเพลิง Lv.3",
      "desc": "แสงรุ่งอรุณรัศมี 1000 รอบตัว 10 วิ: พวกเราในแสงอยู่ในเขตแสง ฮีลแรงขึ้น 50% · ผี อมตะ และธาตุมืดในแสงโดนเผาวิละ 95% ของ MATK · แสงรัศมี 1000 รอบตัว 10 วิ"
    }
  ],
  "wisp": [
    {
      "id": "ws_flock",
      "name": "เลี้ยงดวงไฟ",
      "thai": "สายฝูงดวงไฟ",
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "[มีฟรี Lv.1] · ดวงไฟวิญญาณลอยรอบตัว 1 ดวง ดวงที่ใช้ไปเกิดใหม่ทุก 4 วิ แรงตาม MATK · จำนวนดวงเพิ่มทุก 2 เลเวล (สูงสุด 5) · Lv5 เกิดใหม่ทุก 3 วิ"
    },
    {
      "id": "ws_swarm",
      "name": "ฝูงหิ่งห้อย",
      "thai": "สายฝูงดวงไฟ",
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "desc": "ดวงไฟเกิดใหม่และพุ่งเร็วขึ้น 3%"
    },
    {
      "id": "ws_heart",
      "name": "ใจดวงไฟ",
      "thai": "สายฝูงดวงไฟ",
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
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
      "maxLevel": 10,
      "freeLevel": 1,
      "kind": "active",
      "desc": "[มีฟรี Lv.1] · ส่งดวงไฟ 1 ดวงไปเกาะเพื่อนที่เลือดน้อยที่สุด (หรือตัวเอง) 20 วิ (ถือคทา 30 วิ) ฮีลวิละ 18% ของ MATK · เกาะเพื่อนที่เลือดน้อยที่สุด"
    },
    {
      "id": "ws_embrace",
      "name": "ดวงไฟโอบกาย",
      "thai": "สายดวงไฟรักษา",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "ชำนาญกระบอง Lv.1",
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
      "maxLevel": 10,
      "freeLevel": 0,
      "kind": "active",
      "req": "เสียงเรียกดวงไฟ Lv.3",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "เสียงเรียกดวงไฟ Lv.3",
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
      "maxLevel": 5,
      "freeLevel": 0,
      "kind": "active",
      "req": "ดวงไฟแตกฮีล Lv.5 หรือ ฝูงดวงไฟพุ่ง Lv.5",
      "desc": "ดวงไฟนับพันลอยขึ้นทั่วจอ 10 วิ ศัตรูโดนดวงไฟรุมวิละ 200% ของ MATK · \"แสงพร่า\" ศัตรูตีเบาลงครึ่งหนึ่งและช้าลง · ดวงไฟติดทุกตัว ใครในทีมตีโดนก็ระเบิดเพิ่ม 250% · ทุก 2 วิ ฝนดวงไฟดิ่งใส่ทุกตัว 900% ลามตัวข้าง ๆ 6 ตัว · พวกเราฟื้น HP 2% ทุกวิ รับดาเมจ ×0.8 · เราได้โล่ดวงไฟ 240% ของ MATK · ทั้งจอ 10 วิ · แสงพร่า · ดวงไฟติดทุกตัว · ฝนดวงไฟ · โล่ดวงไฟ"
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

  c1Sel.onchange = () => {
    activeEditingPlan.class1Target = c1Sel.value;
    const newTree = CLASS_TREE_MAP[c1Sel.value] || CLASS_TREE_MAP['archer'];
    c2Sel.innerHTML = newTree.secondClasses.map(sc => `
      <option value="${sc.id}">${sc.name}</option>
    `).join('');
    activeEditingPlan.class2Target = newTree.secondClasses[0].id;
    c2Sel.value = activeEditingPlan.class2Target;
    skillMetaCache = null;
    updateC3Preview();
    if (typeof markPlanDirty === 'function') markPlanDirty();
    updatePlanEditorBadges();
  };

  c2Sel.onchange = () => {
    activeEditingPlan.class2Target = c2Sel.value;
    skillMetaCache = null;
    updateC3Preview();
    if (typeof markPlanDirty === 'function') markPlanDirty();
    updatePlanEditorBadges();
  };
}

// 2. Update Plan Editor Badges (Skill count and Stat summary)
function countPlannedFacets(plan) {
  const facets = plan && plan.skillBuild && plan.skillBuild.facets;
  if (!facets || typeof facets !== 'object') return 0;
  const c1 = plan.class1Target || 'archer';
  const c2 = plan.class2Target || 'hunter';
  const allowed = new Set(['novice', c1, c2]);
  let total = 0;
  for (const [sId, arr] of Object.entries(facets)) {
    if (!Array.isArray(arr)) continue;
    const m = getSkillMeta(sId);
    if (m && !allowed.has(m.tier)) continue;
    arr.forEach(v => { if (typeof v === 'number' && v >= 0) total++; });
  }
  return total;
}

function normalizePlanSkillBuild(plan) {
  if (!plan) return;
  if (!plan.skillBuild || typeof plan.skillBuild !== 'object') {
    plan.skillBuild = { skillPointQueue: [], plannedLevels: {}, facets: {} };
    return;
  }
  const sb = plan.skillBuild;
  if (!Array.isArray(sb.skillPointQueue)) sb.skillPointQueue = [];
  if (!sb.plannedLevels || typeof sb.plannedLevels !== 'object') sb.plannedLevels = {};
  if (!sb.facets || typeof sb.facets !== 'object') sb.facets = {};
  if (sb.skillPointQueue.length === 0) {
    const c1 = plan.class1Target || 'archer';
    const c2 = plan.class2Target || 'hunter';
    const classMaps = [sb.novice, sb[c1], sb[c2]].filter(x => x && typeof x === 'object' && !Array.isArray(x));
    if (classMaps.length > 0) {
      const rawQ = [];
      const novObj = (sb.novice && typeof sb.novice === 'object') ? sb.novice : { 'basic-skill': 9 };
      for (const [sId, cnt] of Object.entries(novObj)) {
        for (let i = 0; i < (Number(cnt) || 0); i++) rawQ.push(sId);
      }
      for (const tier of [c1, c2]) {
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
    }
  }
}

function updatePlanEditorBadges() {
  if (!activeEditingPlan) return;
  normalizePlanSkillBuild(activeEditingPlan);
  if (typeof window.updateGearBadge === 'function') window.updateGearBadge();
  const skillBadge = document.getElementById("plan-skill-count-badge");
  const statBadge = document.getElementById("plan-stat-summary-badge");

  if (skillBadge) {
    const queue = activeEditingPlan.skillBuild?.skillPointQueue || [];
    const facetCount = countPlannedFacets(activeEditingPlan);
    skillBadge.innerText = facetCount > 0 ? `${queue.length} แต้ม · ✨${facetCount}` : `${queue.length} แต้ม`;
    skillBadge.style.background = (queue.length > 0 || facetCount > 0) ? 'rgba(168, 85, 247, 0.4)' : 'rgba(168, 85, 247, 0.2)';
  }

  if (statBadge) {
    const q = statQueueOf(activeEditingPlan.statBuild);
    if (q.length) {
      const sb = statFinal(q);
      const top = STAT_KEYS.filter(k => sb[k] > 1).sort((x, y) => sb[y] - sb[x]).slice(0, 2);
      statBadge.innerText = `${q.length} ขั้น · ${top.map(k => `${k} ${sb[k]}`).join(' / ')}`;
      statBadge.style.background = 'rgba(56, 189, 248, 0.4)';
    } else {
      statBadge.innerText = 'Default';
      statBadge.style.background = 'rgba(56, 189, 248, 0.2)';
    }
  }
}

// 3. Open Skill Builder Modal
function openSkillBuilderModal() {
  if (!activeEditingPlan) return;
  normalizePlanSkillBuild(activeEditingPlan);

  // Update Tab Names
  const c1NameEl = document.getElementById("skill-tab-class1-name");
  const c2NameEl = document.getElementById("skill-tab-class2-name");
  const c1 = activeEditingPlan.class1Target || 'archer';
  const c2 = activeEditingPlan.class2Target || 'hunter';

  if (c1NameEl) c1NameEl.innerText = (CLASS_TREE_MAP[c1]?.name || c1).split(' ')[0];
  if (c2NameEl) {
    const tree = CLASS_TREE_MAP[c1];
    const sc = tree?.secondClasses.find(s => s.id === c2);
    c2NameEl.innerText = (sc?.name || c2).split(' ')[0];
  }

  skillBuilderSnapshot = JSON.stringify(activeEditingPlan.skillBuild);
  const before = activeEditingPlan.skillBuild.skillPointQueue;
  const fixed = repairSkillQueue(before, true);
  applySkillQueue(fixed.queue);
  const notes = [];
  if (fixed.added.length) notes.push(`เติมสกิลเงื่อนไขที่ขาดให้: ${summarizeSkillIds(fixed.added)}`);
  if (fixed.dropped.length) notes.push(`ตัดแต้มที่อัปไม่ได้ออก: ${summarizeSkillIds(fixed.dropped)}`);
  if (!notes.length && fixed.queue.join() !== before.join()) notes.push('จัดลำดับใหม่ให้สกิลเงื่อนไขมาก่อน');
  skillBuilderNotice = notes.length ? `🔧 ปรับคิวเดิมให้ตรงเงื่อนไขของเกมแล้ว — ${notes.join(' · ')} (กด "ยกเลิก" เพื่อไม่ใช้การปรับนี้)` : '';

  currentSkillBuilderTab = 'novice';
  renderSkillBuilderUI();

  const modal = document.getElementById("skill-builder-modal");
  if (modal) modal.style.display = 'flex';
}

// 4. Render Skill Builder UI
function renderSkillBuilderUI() {
  if (!activeEditingPlan || !activeEditingPlan.skillBuild) return;

  const queue = activeEditingPlan.skillBuild.skillPointQueue || [];
  const planned = activeEditingPlan.skillBuild.plannedLevels || {};
  const c1 = activeEditingPlan.class1Target || 'archer';
  const c2 = activeEditingPlan.class2Target || 'hunter';

  // Calculate points spent per tier
  const noviceSkills = SKILLS_DATABASE.novice || [];
  const class1Skills = SKILLS_DATABASE[c1] || [];
  const class2Skills = SKILLS_DATABASE[c2] || [];

  const noviceSpent = queue.filter(id => noviceSkills.some(s => s.id === id)).length;
  const class1Spent = queue.filter(id => class1Skills.some(s => s.id === id)).length;
  const class2Spent = queue.filter(id => class2Skills.some(s => s.id === id)).length;

  // Update budget badges
  const bNov = document.getElementById("skill-budget-novice");
  const bC1 = document.getElementById("skill-budget-class1");
  const bC2 = document.getElementById("skill-budget-class2");

  if (bNov) {
    bNov.innerText = `${noviceSpent} / 9 แต้ม`;
    bNov.style.color = noviceSpent >= 9 ? '#4ade80' : '#38bdf8';
  }
  if (bC1) {
    bC1.innerText = `${class1Spent} / 49 แต้ม`;
    bC1.style.color = class1Spent >= 49 ? '#4ade80' : '#c084fc';
  }
  if (bC2) {
    bC2.innerText = `${class2Spent} / 49 แต้ม`;
    bC2.style.color = class2Spent >= 49 ? '#4ade80' : '#facc15';
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
  let tierMaxBudget = 49;
  let tierSpent = 0;
  if (currentSkillBuilderTab === 'novice') {
    activeList = noviceSkills;
    tierMaxBudget = 9;
    tierSpent = noviceSpent;
  } else if (currentSkillBuilderTab === 'class1') {
    activeList = class1Skills;
    tierMaxBudget = 49;
    tierSpent = class1Spent;
  } else {
    activeList = class2Skills;
    tierMaxBudget = 49;
    tierSpent = class2Spent;
  }

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
      const curLv = planned[skill.id] || 0;
      const isMaxed = curLv >= skill.maxLevel;
      const preview = isMaxed ? { ok: false, why: 'max' } : skillAddPreview(skill.id);
      const canAdd = preview.ok;
      const canMinus = curLv > 0;
      const plusTitle = canAdd
        ? (preview.added.length ? `+1 แต้ม — จะอัป ${summarizeSkillIds(preview.added)} ให้ก่อนอัตโนมัติ (ใช้ทั้งหมด ${preview.cost} แต้ม)` : '+1 แต้ม')
        : (preview.why === 'max' ? 'สกิลเต็มแล้ว' : preview.why === 'budget' ? 'แต้มของสายนี้ไม่พอ (รวมสกิลเงื่อนไข)' : 'อัปไม่ได้');
      const reqHtml = (skill.prereq || []).map(p => {
        const met = (planned[p.skill] || 0) >= p.level;
        return `<span class="skill-req ${met ? 'met' : ''}">${met ? '✔' : '🔒'} ${escapeHTML(skillMetaName(p.skill))} Lv.${p.level}</span>`;
      }).join('');

      // Find all step indexes in queue where this skill was picked
      const stepIndexes = [];
      queue.forEach((sId, idx) => {
        if (sId === skill.id) stepIndexes.push(idx + 1);
      });

      const iconUrl = `https://www.aetheria-online.in.th/art/icons/skills/${skill.icon || skill.id}.webp`;
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

      return `
        <div class="skill-builder-card ${curLv > 0 ? 'is-allocated' : ''} ${isMaxed ? 'is-maxed' : ''}" title="${escapeHTML(skill.desc || '')}">
          <div class="skill-card-top">
            <img src="${iconUrl}" class="skill-card-icon" onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'38\\' height=\\'38\\'><rect width=\\'100%\\' height=\\'100%\\' fill=\\'%231e293b\\'/><text x=\\'50%\\' y=\\'55%\\' dominant-baseline=\\'middle\\' text-anchor=\\'middle\\' fill=\\'%23a855f7\\' font-size=\\'18\\'>⚡</text></svg>';">
            <div class="skill-card-info">
              <div class="skill-card-title">${escapeHTML(skill.name)}</div>
              <div class="skill-card-subtitle">
                <span>${escapeHTML(skill.thai)}</span>
                <span class="skill-kind ${skill.kind}">${skill.kind === 'passive' ? 'Passive' : skill.kind === 'toggle' ? 'Toggle' : 'Active'}</span>
              </div>
            </div>
          </div>

          ${reqHtml ? `<div class="skill-req-row">ต้องมี: ${reqHtml}</div>` : ''}

          ${skill.kind !== 'passive' ? `
          <button type="button" class="skill-auto-toggle ${isSkillAutoOn(skill.id) ? 'on' : 'off'}" onclick="toggleSkillAuto('${skill.id}')"
            title="${isSkillAutoOn(skill.id) ? 'บอทจะติ๊กสกิลนี้ใน AUTO ของเกม (กดเพื่อปิด)' : 'บอทจะไม่ใช้สกิลนี้ใน AUTO (กดเพื่อเปิด)'}">
            <span class="sat-switch"></span> ${isSkillAutoOn(skill.id) ? 'ใช้ใน AUTO' : 'ไม่ใช้ใน AUTO'}
          </button>` : ''}

          <div class="skill-card-controls">
            <div class="skill-level-indicator ${isMaxed ? 'maxed' : ''}">
              Lv. ${curLv} / ${skill.maxLevel}
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
        let skillMeta = null;
        for (const k in SKILLS_DATABASE) {
          const found = SKILLS_DATABASE[k].find(s => s.id === sId);
          if (found) { skillMeta = found; break; }
        }
        const sName = skillMeta ? (skillMeta.thai || skillMeta.name) : sId;
        return `
          <span class="skill-queue-chip ${badSteps.has(idx) ? 'bad' : ''}" title="ลำดับที่ ${idx + 1}: ${sName}${badSteps.has(idx) ? ' — ยังไม่ผ่านเงื่อนไขสกิลก่อนหน้า ณ จุดนี้ (บอทจะข้ามไปก่อนจนกว่าจะผ่าน)' : ''}">
            <span class="chip-step">#${idx + 1}</span>
            <span class="chip-name">${escapeHTML(sName)}</span>
            <span class="chip-del" onclick="removeSkillPointAtIndex(${idx})">&times;</span>
          </span>
        `;
      }).join('');
    }
  }
}

// 5. Skill rules: every change goes through repairSkillQueue so the queue always matches the game
//    (prerequisites before the skill, max level, 9 / 49 / 49 points per tier, only the plan's classes)
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
  return m ? (m.thai || m.name) : skillId;
}

function planSkillTiers() {
  const c1 = activeEditingPlan?.class1Target || 'archer';
  const c2 = activeEditingPlan?.class2Target || 'hunter';
  return { novice: 9, [c1]: 49, [c2]: 49 };
}

// Rebuild a queue that the game would accept.
//  - a point whose prerequisites come later in the queue is moved to right after them
//  - insertMissing: prerequisites that never appear are inserted just before the point that needs them
//  - anything still impossible (max level, tier full, prerequisite missing, other class) is dropped
function repairSkillQueue(queue, insertMissing) {
  const budgets = planSkillTiers();
  const lv = {}, spent = {};
  const out = [], dropped = [], added = [];

  const prereqMet = m => (m.prereq || []).every(p => (lv[p.skill] || 0) >= p.level);
  const check = id => {
    const m = getSkillMeta(id);
    if (!m || budgets[m.tier] === undefined) return 'class';
    if ((lv[id] || 0) >= m.maxLevel) return 'max';
    if ((spent[m.tier] || 0) >= budgets[m.tier]) return 'budget';
    return prereqMet(m) ? 'ok' : 'prereq';
  };
  const place = id => {
    const m = getSkillMeta(id);
    out.push(id);
    lv[id] = (lv[id] || 0) + 1;
    spent[m.tier] = (spent[m.tier] || 0) + 1;
  };
  // Will the rest of the queue raise every prerequisite high enough by itself?
  const laterSatisfies = (m, rest) => (m.prereq || []).every(p =>
    (lv[p.skill] || 0) + rest.filter(x => x === p.skill).length >= p.level);
  const insertPrereqs = (id, depth) => {
    const m = getSkillMeta(id);
    for (const p of (m.prereq || [])) {
      while ((lv[p.skill] || 0) < p.level) {
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
// (stored as skillBuild.autoOff; everything else stays on, like before)
function isSkillAutoOn(id) {
  const off = activeEditingPlan && activeEditingPlan.skillBuild && activeEditingPlan.skillBuild.autoOff;
  return !(Array.isArray(off) && off.includes(id));
}
function toggleSkillAuto(id) {
  if (!activeEditingPlan || !activeEditingPlan.skillBuild) return;
  const off = new Set(Array.isArray(activeEditingPlan.skillBuild.autoOff) ? activeEditingPlan.skillBuild.autoOff : []);
  if (off.has(id)) off.delete(id); else off.add(id);
  activeEditingPlan.skillBuild.autoOff = Array.from(off);
  renderSkillBuilderUI();
}
window.toggleSkillAuto = toggleSkillAuto;

function toggleSkillFacet(skillId, tierIdx, optIdx) {
  if (!activeEditingPlan || !activeEditingPlan.skillBuild) return;
  if (!activeEditingPlan.skillBuild.facets || typeof activeEditingPlan.skillBuild.facets !== 'object') {
    activeEditingPlan.skillBuild.facets = {};
  }
  const cur = Array.isArray(activeEditingPlan.skillBuild.facets[skillId])
    ? [...activeEditingPlan.skillBuild.facets[skillId]]
    : [-1, -1, -1];
  while (cur.length < 3) cur.push(-1);
  cur[tierIdx] = (cur[tierIdx] === optIdx) ? -1 : optIdx;
  if (cur.every(v => !(typeof v === 'number' && v >= 0))) {
    delete activeEditingPlan.skillBuild.facets[skillId];
  } else {
    activeEditingPlan.skillBuild.facets[skillId] = cur;
  }
  renderSkillBuilderUI();
}
window.toggleSkillFacet = toggleSkillFacet;

function applySkillQueue(newQueue) {
  activeEditingPlan.skillBuild.skillPointQueue = newQueue;
  const levels = {};
  newQueue.forEach(id => { levels[id] = (levels[id] || 0) + 1; });
  activeEditingPlan.skillBuild.plannedLevels = levels;
}

function summarizeSkillIds(list) {
  const count = {};
  list.forEach(x => { const id = x.id || x; count[id] = (count[id] || 0) + 1; });
  return Object.keys(count).map(id => `${skillMetaName(id)} ${count[id]} แต้ม`).join(', ');
}

// Cost of one more point of this skill right now (the point + prerequisites it pulls in), or why it can't be added
function skillAddPreview(skillId) {
  const queue = activeEditingPlan.skillBuild.skillPointQueue;
  const res = repairSkillQueue(queue.concat(skillId), true);
  const ok = res.queue.length > queue.length && !res.dropped.length;
  if (ok) return { ok: true, cost: res.queue.length - queue.length, added: res.added };
  const why = (res.dropped[res.dropped.length - 1] || {}).why;
  return { ok: false, why };
}

function addSkillPoint(skillId, silent = false) {
  if (!activeEditingPlan || !activeEditingPlan.skillBuild) return;
  const queue = activeEditingPlan.skillBuild.skillPointQueue;
  const res = repairSkillQueue(queue.concat(skillId), true);
  if (res.dropped.length || res.queue.length <= queue.length) {
    if (!silent) {
      const why = (res.dropped[res.dropped.length - 1] || {}).why;
      alert(why === 'max' ? 'สกิลนี้เต็มแล้ว'
        : why === 'class' ? 'สกิลนี้ไม่ได้อยู่ในอาชีพของแผนนี้'
        : 'แต้มสกิลของสายนี้ไม่พอ (รวมสกิลเงื่อนไขที่ต้องอัปก่อน)');
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
  if (!activeEditingPlan || !activeEditingPlan.skillBuild) return;
  const queue = activeEditingPlan.skillBuild.skillPointQueue;
  const lastIdx = queue.lastIndexOf(skillId);
  if (lastIdx === -1) return;
  removeSkillPointsAndRepair(queue.filter((_, i) => i !== lastIdx));
}

function removeSkillPointAtIndex(idx) {
  if (!activeEditingPlan || !activeEditingPlan.skillBuild) return;
  const queue = activeEditingPlan.skillBuild.skillPointQueue;
  if (idx < 0 || idx >= queue.length) return;
  removeSkillPointsAndRepair(queue.filter((_, i) => i !== idx));
}

// Queue positions whose prerequisites aren't met yet at that point
function findQueuePrereqProblems(queue) {
  const lv = {};
  const bad = new Set();
  queue.forEach((id, idx) => {
    const m = getSkillMeta(id);
    if (m && (m.prereq || []).some(p => (lv[p.skill] || 0) < p.level)) bad.add(idx);
    lv[id] = (lv[id] || 0) + 1;
  });
  return bad;
}

function resetSkillQueue() {
  if (!activeEditingPlan || !activeEditingPlan.skillBuild) return;
  const hasFacets = countPlannedFacets(activeEditingPlan) > 0;
  if (activeEditingPlan.skillBuild.skillPointQueue.length === 0 && !hasFacets) return;
  if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการล้างลำดับแต้มสกิลและการตั้งค่าปลุกพลังสกิลทั้งหมด?')) return;

  activeEditingPlan.skillBuild.skillPointQueue = [];
  activeEditingPlan.skillBuild.plannedLevels = {};
  activeEditingPlan.skillBuild.facets = {};
  renderSkillBuilderUI();
}

function applySkillPreset() {
  if (!activeEditingPlan || !activeEditingPlan.skillBuild) return;
  const c1 = activeEditingPlan.class1Target || 'archer';
  const c2 = activeEditingPlan.class2Target || 'ranger';

  activeEditingPlan.skillBuild.skillPointQueue = [];
  activeEditingPlan.skillBuild.plannedLevels = {};
  activeEditingPlan.skillBuild.facets = {};
  skillMetaCache = null;

  const pushMany = (id, count) => {
    for (let i = 0; i < count; i++) addSkillPoint(id, true);
  };

  // 1. Traveler (Novice) 9 points
  pushMany('mastery', 5);
  pushMany('q', 2);
  pushMany('body', 2);

  // 2. Class 1 & Class 2 auto-fill from SKILLS_DATABASE[c1] and SKILLS_DATABASE[c2]
  const fillTier = (tierKey, maxPts) => {
    const list = SKILLS_DATABASE[tierKey] || [];
    let before = activeEditingPlan.skillBuild.skillPointQueue.length;
    for (const sk of list) {
      const spent = activeEditingPlan.skillBuild.skillPointQueue.length - before;
      if (spent >= maxPts) break;
      const want = Math.min(sk.maxLevel || 5, maxPts - spent);
      pushMany(sk.id, want);
    }
  };
  fillTier(c1, 49);
  fillTier(c2, 49);

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
let statWork = null;   // the queue being edited (written to the plan only on save)

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
  statWork = statQueueOf(activeEditingPlan.statBuild);
  renderStatBuilderUI();
  const modal = document.getElementById("stat-builder-modal");
  if (modal) modal.style.display = 'flex';
}

function renderStatBuilderUI() {
  if (!statWork) return;
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
  statWork = normalizeStatQueue(statWork);
  renderStatBuilderUI();
}
function statQueueRemove(i) {
  if (!statWork) return;
  statWork.splice(i, 1);
  statWork = normalizeStatQueue(statWork);
  renderStatBuilderUI();
}
function statQueueMove(i, dir) {
  if (!statWork) return;
  const j = i + dir;
  if (j < 0 || j >= statWork.length) return;
  [statWork[i], statWork[j]] = [statWork[j], statWork[i]];
  statWork = normalizeStatQueue(statWork);
  renderStatBuilderUI();
}
function resetStatQueue() {
  if (!statWork || !statWork.length) return;
  if (!confirm('ล้างลำดับการอัปสเตตัสทั้งหมด?')) return;
  statWork = [];
  renderStatBuilderUI();
}
window.statQueueAdd = statQueueAdd;
window.statQueueRemove = statQueueRemove;
window.statQueueMove = statQueueMove;

function applyStatPreset(presetKey) {
  const p = STAT_PRESETS[presetKey];
  if (!p || !statWork) return;
  if (statWork.length && !confirm('แทนที่ลำดับปัจจุบันด้วย Preset นี้?')) return;
  statWork = normalizeStatQueue(p.map(([stat, to]) => ({ stat, to })));
  renderStatBuilderUI();
}

function saveStatBuild() {
  if (!activeEditingPlan || !statWork) return;
  const queue = normalizeStatQueue(statWork);
  const targets = statFinal(queue);
  // older bots read targets + priority: first appearance order, the rest after
  const priorityOrder = [];
  queue.forEach(e => { if (!priorityOrder.includes(e.stat)) priorityOrder.push(e.stat); });
  ['DEX', 'AGI', 'LUK', 'VIT', 'INT', 'STR'].forEach(k => { if (!priorityOrder.includes(k)) priorityOrder.push(k); });
  activeEditingPlan.statBuild = { queue, targets, priorityOrder };
  statWork = null;
  if (typeof markPlanDirty === 'function') markPlanDirty();
  updatePlanEditorBadges();
  const modal = document.getElementById("stat-builder-modal");
  if (modal) modal.style.display = 'none';
}
function closeStatBuilder() {
  statWork = null;
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
