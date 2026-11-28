// manager/auth_sync.js — keep each game client's Auto-login in line with its Manager profile.
//
// - profile with ID + password: the client's Auto-login gets them (and is switched on) whenever its saved
//   ID/password differ from the profile's.
// - profile created without a password (profile.autoRegister): the Manager generates the missing ID and
//   password in candidate memory (WITHOUT saving unverified credentials to the profile beforehand).
//   Registration is performed either via Proxy or in-game sign-up form.
//   Only when registration SUCCEEDS are the ID and password committed to the profile / credentials,
//   and the client logs in normally.
// Passwords never leave the Manager except to the profile's own game client.

const crypto = require('crypto');
const http = require('http');

const SYNC_MS = 10 * 1000;
const rInt = (min, max) => crypto.randomInt(min, max + 1);
const pickOne = arr => arr[crypto.randomInt(0, arr.length)];
const LETTERS = 'abcdefghijklmnopqrstuvwxyz';
const randLetters = n => Array.from({ length: n }, () => LETTERS[rInt(0, 25)]).join('');

const USER_NICKS = [
  'bank', 'boom', 'beam', 'boss', 'ball', 'benz', 'best', 'boat', 'book', 'boy', 'bas', 'bell', 'beer', 'big', 'bright',
  'champ', 'chok', 'chom', 'cream', 'cake', 'cop', 'captain', 'dew', 'dome', 'dream', 'don', 'dear', 'din', 'duke',
  'earth', 'ek', 'earn', 'eye', 'first', 'fluke', 'fiat', 'film', 'frame', 'folk', 'ford', 'forth', 'fah', 'fern', 'fon', 'fame', 'frank',
  'golf', 'gun', 'game', 'guy', 'got', 'gap', 'green', 'gift', 'grace', 'gus', 'hong', 'ice', 'ink', 'indie',
  'jay', 'jame', 'jeng', 'jeab', 'joker', 'job', 'jun', 'june', 'jib', 'jack', 'jane',
  'kao', 'korn', 'ken', 'krit', 'kim', 'kwan', 'kong', 'kan', 'kla', 'keng', 'keam', 'knight',
  'leo', 'luke', 'lek', 'lee', 'lotus', 'mark', 'max', 'mix', 'mike', 'mind', 'mild', 'mook', 'mew', 'mint', 'may', 'mean', 'mos', 'mick', 'mon', 'mork',
  'non', 'nut', 'nine', 'new', 'nick', 'note', 'art', 'arm', 'aom', 'aof', 'aun', 'ake', 'auto', 'atom', 'amp',
  'nam', 'nan', 'net', 'noey', 'ning', 'nook', 'neung', 'nai', 'ohm', 'off', 'oat', 'oak', 'oil', 'ong',
  'peat', 'pete', 'pond', 'phu', 'poom', 'pun', 'peam', 'palm', 'petch', 'plug', 'pop', 'pang', 'ploy', 'praew', 'plai', 'pleng', 'pear', 'por', 'ple', 'ping',
  'rew', 'ryu', 'rome', 'run', 'safe', 'save', 'sing', 'sky', 'sun', 'stamp', 'star', 'sea', 'win', 'wave', 'way', 'white', 'woody',
  'tar', 'tee', 'ton', 'top', 'toey', 'tle', 'ter', 'time', 'title', 'team', 'ten', 'tor', 'tum', 'tan', 'tawan', 'toy', 'tack',
  'view', 'vee', 'van', 'yok', 'zen', 'zee', 'zack', 'babe', 'bambam', 'baifern', 'bew', 'biew', 'bom', 'bon', 'bow', 'bum',
  'cartoon', 'cat', 'chacha', 'chef', 'chin', 'chompoo', 'cindy', 'cola', 'cookie', 'da', 'dao', 'day', 'dee', 'didi', 'dodo',
  'em', 'ern', 'eve', 'fai', 'fang', 'fay', 'feaw', 'fee', 'fong', 'fuku', 'gale', 'gam', 'geng', 'gie', 'gig', 'gin', 'ging', 'goo', 'goy', 'guitar', 'gump',
  'hana', 'heng', 'hiw', 'hom', 'hoon', 'hope', 'hug', 'im', 'in', 'ing', 'int', 'ja', 'jam', 'jan', 'jar', 'jedi', 'jen', 'jet', 'jew', 'ji', 'jin', 'jing', 'jo', 'joe', 'joy', 'ju', 'juju', 'jumbo', 'jung',
  'kae', 'kai', 'kam', 'kamo', 'kanom', 'kant', 'kapook', 'kate', 'kati', 'katie', 'kay', 'kea', 'khem', 'khun', 'ki', 'kik', 'king', 'kip', 'kit', 'kiwi', 'kluay', 'ko', 'kob', 'koi', 'kok', 'kom', 'kon', 'koo', 'koon', 'kop', 'kor', 'kot', 'kritz', 'kuk', 'kung', 'kwanjai',
  'la', 'lak', 'lala', 'lam', 'lan', 'latte', 'lawan', 'lemon', 'leng', 'lew', 'li', 'lin', 'ling', 'lion', 'lisa', 'lit', 'lita', 'liu', 'lo', 'lok', 'lom', 'long', 'look', 'love', 'lucky', 'lui', 'luk', 'lum', 'ly',
  'ma', 'mac', 'madee', 'mae', 'mai', 'mak', 'mala', 'mali', 'mama', 'man', 'mana', 'manow', 'maprang', 'mar', 'miew', 'miki', 'milk', 'mimi', 'min', 'ming', 'mini', 'mink', 'minnie', 'mirin', 'mo', 'momo', 'mona', 'money', 'moo', 'moon', 'mootoo', 'morkot', 'muay', 'mumu', 'music', 'mut', 'my'
];
const USER_STEMS = [
  'shadow', 'dark', 'night', 'storm', 'frost', 'flame', 'blaze', 'wolf', 'fox', 'raven', 'dragon', 'tiger', 'lion', 'viper', 'hawk', 'bear', 'neko', 'kitsune',
  'luna', 'nova', 'astro', 'pixel', 'cyber', 'neon', 'ghost', 'phantom', 'reaper', 'slayer', 'hunter', 'ranger', 'archer', 'sniper', 'rogue', 'mage', 'wizard', 'monk', 'paladin', 'bard',
  'kira', 'zoro', 'luffy', 'ace', 'sabo', 'sanji', 'law', 'shanks', 'naruto', 'sasuke', 'itachi', 'kakashi', 'gojo', 'toji', 'tanjiro', 'zenitsu', 'rengoku', 'goku', 'vegeta', 'asta', 'levi', 'eren', 'killua', 'rimuru', 'kirito', 'asuna', 'sinon', 'rem', 'anya', 'frieren', 'stark', 'jinwoo', 'beru',
  'kazu', 'haru', 'sora', 'riku', 'yuki', 'akira', 'kenji', 'hiro', 'ren', 'shin', 'rei', 'kai', 'zero', 'zephyr', 'ares', 'apollo', 'hades', 'zeus', 'loki', 'thor', 'odin', 'fenrir',
  'matcha', 'mocha', 'boba', 'ramen', 'sushi', 'muffin', 'waffle', 'pudding', 'honey', 'peach', 'mango', 'berry', 'melon', 'cocoa', 'vanilla', 'caramel', 'espresso', 'tofu', 'mochi', 'dango', 'takoyaki', 'tempura', 'wasabi', 'yuzu',
  'panda', 'koala', 'otter', 'bunny', 'shiba', 'corgi', 'husky', 'penguin', 'dolphin', 'falcon', 'eagle', 'phoenix', 'lynx', 'jaguar', 'cobra', 'mamba', 'gecko', 'hamster', 'capybara', 'alpaca', 'ferret', 'owl', 'crow', 'swan',
  'comet', 'galaxy', 'nebula', 'meteor', 'aurora', 'breeze', 'cloud', 'thunder', 'blizzard', 'tsunami', 'vortex', 'zenith', 'apex', 'matrix', 'cipher', 'vector', 'prism', 'pulse', 'echo', 'mirage', 'horizon', 'eclipse', 'solstice', 'cosmos', 'orbit', 'quasar',
  'cobalt', 'crimson', 'amber', 'jade', 'onyx', 'ruby', 'sapphire', 'emerald', 'quartz', 'topaz', 'opal', 'pearl', 'velvet', 'scarlet', 'indigo', 'violet', 'azure', 'coral', 'ivory', 'obsidian',
  'katana', 'shuriken', 'kunai', 'aegis', 'excalibur', 'muramasa', 'ronin', 'shogun', 'samurai', 'shinobi', 'viking', 'spartan', 'templar', 'crusader', 'berserker', 'valkyrie', 'drifter', 'nomad', 'outlaw', 'bandit', 'pirate', 'corsair', 'mariner', 'voyager'
];
const USER_PREFIXES = [
  'lil', 'mini', 'mr', 'ms', 'dr', 'iam', 'im', 'its', 'the', 'real', 'itz', 'lazy', 'sleepy', 'lucky', 'happy', 'lonely', 'silent', 'crazy', 'wild', 'sweet', 'cold', 'blue', 'red', 'black', 'white', 'gold', 'silver', 'baby', 'super', 'pro', 'mad', 'chill', 'cozy', 'tiny', 'epic', 'hyper', 'ultra', 'neo', 'el', 'sir', 'lord', 'king', 'queen', 'boss', 'young', 'old', 'dear', 'only', 'just', 'not'
];
const USER_TAGS = [
  'za', 'zaza', 'kung', 'krub', 'kub', 'ja', 'jaja', 'jung', 'th', 'bkk', 'cnx', 'vip', 'gg', 'ch', 'tv', 'xz', 'zx', 'zz', 'v2', 'jr', 'dk', 'pk', 'x', 'z', 'live', 'play', 'game', 'ro', 'mm', 'yt', 'fc', 'club', 'hub', 'zone', 'boy', 'girl', 'man', 'cat', 'dog', 'xp', 'ox', 'xo', 'ez', 'wp', 'op', 'mvp', 'pro', 'noob', 'afk', 'bot'
];

// Procedural Thai romanized first/last name syllables (thousands of natural Thai name combinations)
const THAI_SYL1 = [
  'cha', 'na', 'tha', 'pha', 'su', 'ki', 'pi', 'ji', 'wa', 'pa', 'ka', 'sa', 'ma', 'ra', 'ba', 'da', 'la', 'ta', 'wi', 'si',
  'non', 'nut', 'nat', 'pat', 'pon', 'pak', 'phat', 'phum', 'phin', 'kitt', 'krit', 'kris', 'chon', 'chan', 'chak', 'chat',
  'than', 'thit', 'thep', 'thir', 'thana', 'wara', 'wori', 'watch', 'siri', 'supha', 'suri', 'sitt', 'sura', 'nara', 'nari', 'naph',
  'api', 'ati', 'anu', 'akha', 'ari', 'ekka', 'itti', 'udom', 'ubon', 'oran', 'amorn', 'anan', 'arun', 'asaw', 'atsa',
  'buri', 'boon', 'ban', 'chay', 'inn', 'inth', 'jakk', 'jitt', 'kany', 'kasi', 'khem', 'khun', 'kong', 'korn', 'lert', 'mont',
  'nopp', 'นิร', 'panu', 'parin', 'pongs', 'prap', 'pras', 'punn', 'rach', 'ratt', 'rungs', 'sakd', 'sant', 'sarun', 'somb', 'somp', 'song', 'sukh', 'sutth', 'tana', 'teer', 'thip', 'ull', 'veer', 'visu', 'wanch', 'watt', 'weera', 'witt', 'yutt'
].filter(s => /^[a-z]+$/.test(s));
const THAI_SYL2 = [
  'korn', 'pong', 'pol', 'pat', 'pon', 'wat', 'wut', 'wit', 'wan', 'wee', 'win', 'chai', 'chat', 'chon', 'chot', 'chok', 'chan', 'chay',
  'sak', 'sin', 'sit', 'suk', 'sun', 'san', 'sap', 'det', 'dej', 'dan', 'don', 'dao', 'duean', 'fah', 'fon',
  'kiet', 'kul', 'kan', 'kamon', 'kanda', 'karn', 'kwan', 'lak', 'lert', 'luk', 'mas', 'min', 'mon', 'mont', 'mit',
  'nan', 'nat', 'non', 'nop', 'nuch', 'nภา', 'porn', 'petch', 'phum', 'phat', 'pop', 'pob', 'poj', 'pan', 'punya',
  'rat', 'rak', 'rin', 'rong', 'rot', 'ruj', 'rung', 'rit', 'seri', 'sri', 'suwan', 'tawee', 'thep', 'thong', 'thip', 'thorn', 'tiwa', 'torn', 'tuch', 'wej', 'worn', 'yศ', 'yut', 'yos'
].filter(s => /^[a-z]+$/.test(s));

// Procedural pronounceable fantasy/English/Japanese syllables
const SYL_ONSET = ['b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'w', 'y', 'z', 'ch', 'sh', 'th', 'kr', 'tr', 'dr', 'st', 'fl', 'pl', 'bl', 'cl', 'gl', 'pr', 'br'];
const SYL_VOWEL = ['a', 'e', 'i', 'o', 'u', 'ai', 'ei', 'ou', 'ia', 'io', 'ea', 'oo', 'ee'];
const SYL_CODA = ['n', 'm', 'r', 'l', 's', 'x', 'z', 'k', 't', 'p', 'v', 'sh', 'ch', 'th', 'nd', 'nt', 'rk', 'rt', 'st', 'ld', 'ng', 'nk'];

function genProceduralThaiName() {
  return pickOne(THAI_SYL1) + pickOne(THAI_SYL2);
}

function genPronounceableWord() {
  const sylCount = rInt(2, 3);
  let out = '';
  for (let i = 0; i < sylCount; i++) {
    out += pickOne(SYL_ONSET) + pickOne(SYL_VOWEL.slice(0, 5));
    if (i === sylCount - 1 && rInt(0, 10) < 6) out += pickOne(SYL_CODA);
  }
  return out;
}

function applyLeet(s) {
  const map = { a: '4', e: '3', i: '1', o: '0', s: '5', t: '7' };
  let replaced = false;
  return s.split('').map(ch => {
    if (!replaced && map[ch] && rInt(0, 10) < 4) {
      replaced = true;
      return map[ch];
    }
    return ch;
  }).join('');
}

function genHumanNum(style) {
  const mode = style !== undefined ? style : rInt(0, 7);
  if (mode === 0) return String(rInt(2532, 2554)); // พ.ศ. เกิด (4 หลัก)
  if (mode === 1) return String(rInt(1989, 2011)); // ค.ศ. เกิด (4 หลัก)
  if (mode === 2) return String(rInt(1, 31)).padStart(2, '0') + String(rInt(1, 12)).padStart(2, '0'); // วันเดือนเกิด DDMM
  if (mode === 3) return String(rInt(10, 99)); // เลข 2 หลัก
  if (mode === 4) return String(rInt(100, 999)); // เลข 3 หลัก
  if (mode === 5) return String(rInt(1000, 9999)); // เลข 4 หลัก
  if (mode === 6) return String(rInt(1, 9)); // เลข 1 หลัก
  return pickOne(['007', '01', '02', '04', '07', '08', '09', '11', '12', '13', '14', '19', '21', '23', '24', '25', '28', '35', '39', '42', '45', '55', '555', '69', '77', '777', '88', '888', '99', '999', '123', '168', '404', '1412', '2499']);
}

const usedUserIds = new Set();

function genUserId(existingSet) {
  const sep = () => (rInt(0, 10) < 4 ? '_' : '');
  const patterns = [
    // Group A: Pure Letters (ไม่มีตัวเลขเลย — ดูเหมือนคนตั้งชื่อล้วนหรือชื่อ+นามสกุลย่อ)
    () => pickOne(USER_NICKS) + '_' + pickOne(USER_STEMS),
    () => pickOne(USER_STEMS) + '_' + pickOne(USER_NICKS),
    () => genProceduralThaiName() + (rInt(0, 1) ? '_' + randLetters(rInt(1, 2)) : randLetters(1)),
    () => genPronounceableWord() + (rInt(0, 1) ? '_' + pickOne(USER_TAGS) : pickOne(USER_NICKS)),
    () => pickOne(USER_PREFIXES) + '_' + genProceduralThaiName(),
    // Group B: ตัวเลขอยู่ตรงกลาง (Letters + Digits + Letters)
    () => pickOne(USER_NICKS) + genHumanNum(rInt(3, 6)) + pickOne(USER_TAGS),
    () => pickOne(USER_STEMS) + String(rInt(1, 99)) + pickOne(USER_NICKS),
    () => pickOne(USER_PREFIXES) + String(rInt(1, 99)) + sep() + pickOne(USER_STEMS),
    () => genProceduralThaiName().slice(0, 8) + String(rInt(10, 99)) + randLetters(rInt(1, 2)),
    // Group C: ชื่อจริงคนไทยภาษาอังกฤษ (Procedural Thai Full Name + ปีเกิด/วันเกิด/ตัวย่อนามสกุล)
    () => genProceduralThaiName() + genHumanNum(rInt(0, 4)),
    () => genProceduralThaiName() + '_' + genHumanNum(rInt(0, 3)),
    () => randLetters(2) + '_' + genProceduralThaiName() + (rInt(0, 1) ? String(rInt(10, 99)) : ''),
    // Group D: คำอ่านออกเสียงที่สร้างใหม่ (Procedural Pronounceable Word + ตัวเลข/Tag)
    () => genPronounceableWord() + genHumanNum(rInt(0, 5)),
    () => genPronounceableWord() + sep() + pickOne(USER_TAGS) + String(rInt(1, 99)),
    () => pickOne(USER_NICKS) + sep() + genPronounceableWord(),
    // Group E: ตัวย่อ + ชื่อเล่น/คำศัพท์ (Initials + Name)
    () => randLetters(2) + '_' + pickOne(USER_NICKS) + genHumanNum(rInt(0, 4)),
    () => pickOne(USER_NICKS) + '_' + randLetters(2) + genHumanNum(rInt(0, 4)),
    () => randLetters(2) + '_' + pickOne(USER_STEMS) + String(rInt(10, 999)),
    // Group F: ชื่อเล่น/คำศัพท์ + เบิ้ลตัวอักษร / Leet-speak
    () => {
      const n = pickOne(USER_NICKS);
      return n + n[n.length - 1].repeat(rInt(1, 3)) + (rInt(0, 10) < 7 ? genHumanNum(rInt(0, 4)) : '_' + pickOne(USER_TAGS));
    },
    () => applyLeet(pickOne(USER_STEMS) + sep() + pickOne(USER_NICKS)) + (rInt(0, 1) ? String(rInt(1, 99)) : ''),
    // Group G: ชื่อเล่น/คำศัพท์เกมเมอร์ + Tag / ปีเกิด / วันเกิด
    () => pickOne(USER_NICKS) + pickOne(USER_TAGS) + genHumanNum(rInt(0, 5)),
    () => pickOne(USER_NICKS) + sep() + pickOne(USER_STEMS) + genHumanNum(rInt(3, 6)),
    () => pickOne(USER_STEMS) + sep() + pickOne(USER_NICKS) + genHumanNum(rInt(3, 6)),
    () => pickOne(USER_PREFIXES) + sep() + pickOne(USER_NICKS) + genHumanNum(rInt(0, 5)),
    () => pickOne(USER_STEMS) + pickOne(USER_TAGS) + genHumanNum(rInt(0, 5))
  ];
  for (let i = 0; i < 80; i++) {
    let raw = pickOne(patterns)().toLowerCase().replace(/[^a-z0-9_]/g, '').replace(/_+/g, '_').replace(/^_|_$/g, '');
    if (raw.length > 14) raw = raw.slice(0, 14).replace(/_$/g, '');
    if (
      raw.length >= 7 &&
      raw.length <= 14 &&
      /^[a-z][a-z0-9_]{6,13}$/.test(raw) &&
      !/^pm[a-z0-9]{8}$/.test(raw) &&
      !usedUserIds.has(raw + '@outlook.com') &&
      !(existingSet && existingSet.has(raw + '@outlook.com'))
    ) {
      const email = raw + '@outlook.com';
      usedUserIds.add(email);
      return email;
    }
  }
  const fallback = (genProceduralThaiName().slice(0, 8) + String(rInt(1000, 99999))).slice(0, 14) + '@outlook.com';
  usedUserIds.add(fallback);
  return fallback;
}

function genPersonProfile() {
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';
  const firstName = cap(genProceduralThaiName().slice(0, 10)) || 'Kittipong';
  const lastName = cap((pickOne(THAI_SYL1) + pickOne(THAI_SYL2) + pickOne(THAI_SYL2)).slice(0, 12)) || 'Suwanrat';
  return {
    firstName,
    lastName,
    birthDay: rInt(13, 21),
    birthMonth: rInt(4, 8),
    birthYear: rInt(1994, 2002)
  };
}

const usedCharNames = new Set();
function genCharName(existingSet) {
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';
  const patterns = [
    () => cap(pickOne(USER_STEMS)) + cap(pickOne(USER_NICKS)),
    () => cap(pickOne(USER_NICKS)) + cap(pickOne(USER_STEMS)),
    () => cap(genProceduralThaiName()),
    () => cap(pickOne(USER_STEMS)) + String(rInt(10, 99)),
    () => cap(pickOne(USER_NICKS)) + cap(pickOne(USER_TAGS)) + (rInt(0, 1) ? String(rInt(1, 99)) : ''),
    () => cap(genPronounceableWord()) + (rInt(0, 1) ? cap(pickOne(USER_TAGS)) : '')
  ];
  for (let i = 0; i < 60; i++) {
    let name = pickOne(patterns)().replace(/[^A-Za-z0-9]/g, '');
    if (name.length > 12) name = name.slice(0, 12);
    const low = name.toLowerCase();
    if (name.length >= 4 && !usedCharNames.has(low) && !(existingSet && existingSet.has(low))) {
      usedCharNames.add(low);
      return name;
    }
  }
  return 'Kira' + String(rInt(1000, 9999));
}

function genPassword() {
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  const digits = len => Array.from({ length: len }, () => rInt(0, 9)).join('');
  const syms = ['!', '@', '#', '$'];
  const pickSym = () => pickOne(syms);
  // Use procedural Thai/pronounceable syllables + digits + symbol so Microsoft never flags English dictionary words ("Lucky", "Pear", etc.)
  const patterns = [
    () => cap(genProceduralThaiName().slice(0, 6)) + pickSym() + digits(3) + randLetters(2),
    () => cap(genPronounceableWord().slice(0, 6)) + digits(2) + pickSym() + cap(randLetters(2)) + digits(1),
    () => cap(pickOne(THAI_SYL1)) + pickOne(THAI_SYL2).slice(0, 3) + pickSym() + genHumanNum(rInt(0, 1)),
    () => cap(randLetters(3)) + digits(2) + pickSym() + pickOne(THAI_SYL2).slice(0, 4) + digits(2)
  ];
  for (let i = 0; i < 40; i++) {
    let pw = pickOne(patterns)();
    if (pw.length > 14) pw = pw.slice(0, 14);
    if (
      pw.length >= 10 &&
      pw.length <= 14 &&
      /[A-Z]/.test(pw) &&
      /[a-z]/.test(pw) &&
      /\d/.test(pw) &&
      /[!@#$]/.test(pw)
    ) {
      return pw;
    }
  }
  return 'Krx9!mQv' + digits(3) + 'z';
}

const READ_JS = `(() => {
  const c = window.__authConfig;
  if (!c || typeof window.executeAutoLogin !== 'function') return null;
  const domUser = (document.getElementById('p-auth-user')?.value || '').trim();
  const domPass = document.getElementById('p-auth-pass')?.value || '';
  const domChar = (document.getElementById('p-auth-char')?.value || '').trim();
  const domSrv = (document.getElementById('p-auth-server')?.value || '').trim();
  if (domUser && !c.username) {
    c.username = domUser;
    c.userEditedAt = c.userEditedAt || Date.now();
    c.generatedUser = false;
    c.register = false;
    try { localStorage.setItem('pelican_auth_cfg', JSON.stringify(c)); } catch (_) {}
  }
  if (domPass && !c.password) {
    c.password = domPass;
    c.userEditedAt = c.userEditedAt || Date.now();
    c.generatedUser = false;
    c.register = false;
    try { localStorage.setItem('pelican_auth_cfg', JSON.stringify(c)); } catch (_) {}
  }
  if (domChar && !c.charName) {
    c.charName = domChar;
    try { localStorage.setItem('pelican_auth_cfg', JSON.stringify(c)); } catch (_) {}
  }
  if (domSrv && !c.serverName) {
    c.serverName = domSrv;
    try { localStorage.setItem('pelican_auth_cfg', JSON.stringify(c)); } catch (_) {}
  }
  const isSignedInEmail = Boolean(window.NC?.Online?.account?.kind && window.NC.Online.account.kind !== 'device');
  const inWorld = Boolean(isSignedInEmail && window.NC?.OnlineLobby?.entered === true);
  const hasFilledSlot = Boolean(isSignedInEmail && Array.isArray(window.NC?.OnlineLobby?.slots?.slots) && window.NC.OnlineLobby.slots.slots.some(s => s && !s.empty));
  const inGame = Boolean(inWorld || hasFilledSlot);
  const isPlaceholderChar = v => {
    const s = String(v || '').trim();
    if (!s) return true;
    const low = s.toLowerCase();
    if (low === 'traveler' || low === 'guest' || low === 'player' || low === 'unnamed' || low === 'loading' || s === 'ผู้มาเยือน' || s === 'กำลังโหลด' || s === 'ไม่ทราบ') return true;
    return /^[\\s.\\u2026\\-—–_•·?]+$/.test(s);
  };
  let charName = '';
  try {
    if (inWorld) {
      const pName = String(window.NC?.game?.player?.name || '').trim();
      const ncName = (document.querySelector('#sq .hud [data-f="name"], #cname')?.textContent || '').trim();
      const rawName = !isPlaceholderChar(pName) ? pName : (!isPlaceholderChar(ncName) ? ncName : '');
      charName = rawName;
    } else if (hasFilledSlot) {
      const slotsArr = window.NC.OnlineLobby.slots.slots;
      const activeIdx = Number(window.NC?.OnlineLobby?.slots?.active);
      const activeSlot = (Number.isInteger(activeIdx) && slotsArr[activeIdx] && !slotsArr[activeIdx].empty && !isPlaceholderChar(slotsArr[activeIdx].name))
        ? slotsArr[activeIdx]
        : null;
      const firstFilled = activeSlot || slotsArr.find(s => s && !s.empty && !isPlaceholderChar(s.name));
      if (firstFilled) charName = String(firstFilled.name).trim();
    }
  } catch (_) {}
  const activeEl = document.activeElement;
  const isEditingAuth = Boolean(
    activeEl && (
      activeEl.id === 'p-auth-user' ||
      activeEl.id === 'p-auth-pass' ||
      activeEl.id === 'p-auth-char' ||
      activeEl.id === 'p-auth-server'
    )
  );
  let inWorldVerifyAwaiting = false;
  let lobbyModalVerifyAwaiting = false;
  try {
    const vf = window.NC?.OnlineVerify?.state?.();
    const vfSt = vf?.st || null;
    const sqVerifyEl = document.querySelector('#sq [data-sq="verify"]');
    if (vf && vfSt) {
      if (vfSt.done) {
        try { window.NC?.OnlineVerify?.close?.(); } catch (_) {}
      } else {
        if (vfSt.bad && (vfSt.kind === 'wrong_code' || /รหัสไม่ถูกต้อง/i.test(vfSt.note || '')) && window.__lastSubmittedNightcampOtpCode) {
          window.__ncLastRejectedOtpCode = window.__lastSubmittedNightcampOtpCode;
        }
        const nowMs = Date.now();
        const wantVerifyEmail = String(c.email || (String(c.username || '').includes('@') ? c.username : '') || '').trim().toLowerCase();
        const maskedWant = (wantVerifyEmail && typeof window.NC?.OnlineVerify?.mask === 'function')
          ? window.NC.OnlineVerify.mask(wantVerifyEmail)
          : '';
        const shouldChangeToProfileEmail = Boolean(
          wantVerifyEmail &&
          wantVerifyEmail.includes('@') &&
          vfSt.changeLeft > 0 &&
          (
            vfSt.mustChange ||
            (vfSt.mode !== 'change' && maskedWant && vfSt.masked && maskedWant.toLowerCase() !== String(vfSt.masked).toLowerCase()) ||
            (vfSt.mode === 'change' && (String(vfSt.email || '').toLowerCase() !== wantVerifyEmail || !vfSt.sent))
          )
        );
        if (!vfSt.busy && (nowMs - (window.__ncLastInWorldVerifySendAt || 0) > 6500)) {
          if (shouldChangeToProfileEmail && typeof vf.changeSend === 'function') {
            window.__ncLastInWorldVerifySendAt = nowMs;
            try { vf.changeSend(wantVerifyEmail); } catch (_) {}
          } else if (!vfSt.sent) {
            if (vfSt.page === 'round' && typeof vf.roundEmail === 'function') {
              window.__ncLastInWorldVerifySendAt = nowMs;
              try { vf.roundEmail(); } catch (_) {}
            } else if (vfSt.ready && !vfSt.mustChange && typeof vf.send === 'function') {
              window.__ncLastInWorldVerifySendAt = nowMs;
              try { vf.send(); } catch (_) {}
            }
          }
        }
        if ((vfSt.sent || shouldChangeToProfileEmail) && !vfSt.done) {
          inWorldVerifyAwaiting = true;
        }
      }
    } else if (sqVerifyEl) {
      const sendBtn = sqVerifyEl.querySelector('button[data-act="send"], button[data-act="remail"]');
      if (sendBtn && !sendBtn.disabled && (Date.now() - (window.__ncLastInWorldVerifySendAt || 0) > 6500)) {
        window.__ncLastInWorldVerifySendAt = Date.now();
        try { sendBtn.click(); } catch (_) {}
      }
      if (sqVerifyEl.querySelector('input.vf-in[data-f="code"]')) {
        inWorldVerifyAwaiting = true;
      }
    }
    const csVerifyModal = document.querySelector('.cs-modal.cs-verify:not([hidden])');
    if (csVerifyModal) {
      const codeInput = csVerifyModal.querySelector('.cs-v-code:not([hidden])');
      const errTxt = (csVerifyModal.querySelector('.cs-v-err')?.textContent || '').trim();
      if (errTxt && /รหัสไม่ถูกต้อง/i.test(errTxt) && window.__lastSubmittedNightcampOtpCode) {
        window.__ncLastRejectedOtpCode = window.__lastSubmittedNightcampOtpCode;
      }
      if (codeInput) {
        lobbyModalVerifyAwaiting = true;
      }
    }
    if (inWorld && window.NC?.Online?.rpc && !window.__ncVerifyStatusFetched && !window.__ncVerifyStatusFetching) {
      window.__ncVerifyStatusFetching = true;
      window.NC.Online.rpc('nc_verify', { action: 'status' }).then(res => {
        window.__ncVerifyStatusCache = res || null;
        window.__ncVerifyStatusFetched = true;
        window.__ncVerifyStatusFetching = false;
      }).catch(() => {
        window.__ncVerifyStatusFetched = true;
        window.__ncVerifyStatusFetching = false;
      });
    }
  } catch (_) {}
  const awaitingEmailOtp = Boolean(
    window.NC?.OnlineLobby?.codeSent === true ||
    inWorldVerifyAwaiting ||
    lobbyModalVerifyAwaiting
  );
  const liveOnlineAccount = String(window.NC?.Online?.account?.name || window.NC?.Online?.account?.email || '').trim();
  const vfStateNow = window.NC?.OnlineVerify?.state?.()?.st || null;
  const verifyMaskedEmail = String(
    (vfStateNow && (vfStateNow.email || vfStateNow.masked)) ||
    window.__ncVerifyStatusCache?.email?.masked ||
    ''
  ).trim();
  return {
    username: String(c.username || liveOnlineAccount || '').trim(),
    liveAccountEmail: liveOnlineAccount,
    verifyMaskedEmail,
    email: String(c.email || '').trim(),
    password: String(c.password || ''),
    serverName: String(c.serverName || '').trim(),
    charNameCfg: String(c.charName || '').trim(),
    autoResumeBot: !!c.autoResumeBot,
    enabled: !!c.enabled,
    register: !!c.register,
    registerDone: !!c.registerDone,
    registerError: c.registerError || '',
    generatedUser: !!c.generatedUser,
    outlookReady: !!c.outlookReady,
    awaitingEmailOtp,
    inWorldVerifyAwaiting,
    lobbyModalVerifyAwaiting,
    lastRejectedOtpCode: String(window.__ncLastRejectedOtpCode || ''),
    userEditedAt: Number(c.userEditedAt) || 0,
    serverEditedAt: Number(c.serverEditedAt) || 0,
    charEditedAt: Number(c.charEditedAt) || 0,
    verifiedLoginAt: Number(c.verifiedLoginAt) || 0,
    userToggledAt: Number(c.userToggledAt) || 0,
    inGame,
    inWorld,
    charName,
    isEditingAuth,
    registerQueueWaiting: Boolean(window.__pmRegisterQueueState && window.__pmRegisterQueueState.waiting),
    registerQueueDismissed: Boolean(window.__pmRegisterQueueDismissedUntil && Date.now() < window.__pmRegisterQueueDismissedUntil),
    registerQueueForceNow: Boolean(window.__pmForceRegisterNow)
  };
})()`;

const QUEUE_OVERLAY_HELPER_JS = `
  if (window.__pmRegisterQueueOverlayVer !== 3 || typeof window.__setPmRegisterQueueOverlay !== 'function') {
    window.__pmRegisterQueueOverlayVer = 3;
    window.__setPmRegisterQueueOverlay = function(q) {
      const fmtRemain = (targetMs) => {
        const sec = Math.max(0, Math.ceil(((Number(targetMs) || 0) - Date.now()) / 1000));
        if (sec <= 0) return 'กำลังเริ่ม...';
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
      };
      const isSignedInNow = Boolean(window.NC?.Online?.account?.kind && window.NC.Online.account.kind !== 'device');
      if (!q || !q.waiting || isSignedInNow || window.__pmForceRegisterNow || (window.__pmRegisterQueueDismissedUntil && Date.now() < window.__pmRegisterQueueDismissedUntil)) {
        window.__pmRegisterQueueState = null;
        if (window.__pmRegisterQueueTimer) {
          clearInterval(window.__pmRegisterQueueTimer);
          window.__pmRegisterQueueTimer = null;
        }
        const old = document.getElementById('pm-register-queue-overlay');
        if (old) old.remove();
        return;
      }
      window.__pmRegisterQueueState = q;
      if (window.__authConfig && window.__authConfig.register) {
        window.__authConfig.register = false;
      }
      let root = document.getElementById('pm-register-queue-overlay');
      if (!root) {
        root = document.createElement('div');
        root.id = 'pm-register-queue-overlay';
        root.style.cssText = 'position:fixed;inset:0;z-index:2147483600;background:rgba(6,10,22,0.82);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;padding:10px;box-sizing:border-box;font-family:"IBM Plex Sans Thai","Plus Jakarta Sans",sans-serif;color:#f8fafc;user-select:none;';
        root.innerHTML = [
          '<div style="width:100%;max-width:360px;background:linear-gradient(155deg,rgba(15,23,42,0.97) 0%,rgba(30,20,45,0.97) 100%);border:1.5px solid rgba(245,158,11,0.6);border-radius:14px;padding:14px 16px;box-shadow:0 20px 50px rgba(0,0,0,0.8),0 0 28px rgba(245,158,11,0.18);text-align:center;">',
          '  <div data-rq="badge" style="display:inline-flex;align-items:center;gap:6px;background:rgba(245,158,11,0.16);border:1px solid rgba(251,191,36,0.5);color:#fde68a;border-radius:999px;padding:4px 12px;font-size:13px;font-weight:800;letter-spacing:0.2px;margin-bottom:8px;">⏳ กำลังรอคิวสมัคร</div>',
          '  <div data-rq="title" style="font-size:15px;font-weight:800;color:#fff;margin-bottom:4px;">กำลังรอคิวสมัครไอดีอัตโนมัติ</div>',
          '  <div data-rq="sub" style="font-size:11.5px;line-height:1.45;color:#cbd5e1;margin-bottom:10px;">ระบบทยอยสมัครทีละ 1–3 จอ แล้วสุ่มหน่วงเวลา 1–30 นาที เพื่อลดความเสี่ยงโดนแบนยกชุด</div>',
          '  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">',
          '    <div style="background:rgba(2,6,23,0.72);border:1px solid rgba(148,163,184,0.22);border-radius:10px;padding:8px 6px;">',
          '      <div style="font-size:10px;color:#94a3b8;margin-bottom:2px;" data-rq="pos-lbl">ลำดับคิวรอ</div>',
          '      <div data-rq="pos" style="font-size:17px;font-weight:800;color:#38bdf8;font-family:monospace;">#1</div>',
          '    </div>',
          '    <div style="background:rgba(2,6,23,0.72);border:1px solid rgba(245,158,11,0.32);border-radius:10px;padding:8px 6px;">',
          '      <div style="font-size:10px;color:#94a3b8;margin-bottom:2px;" data-rq="timer-lbl">ชุดถัดไปในอีก</div>',
          '      <div data-rq="timer" style="font-size:17px;font-weight:800;color:#fbbf24;font-family:monospace;">--:--</div>',
          '    </div>',
          '  </div>',
          '  <div style="display:flex;flex-direction:column;gap:7px;">',
          '    <button type="button" data-rq="force-now" style="width:100%;background:linear-gradient(135deg,#10b981,#059669);border:1px solid rgba(52,211,153,0.68);color:#ffffff;border-radius:9px;padding:8px 12px;font-size:13px;font-weight:800;cursor:pointer;box-shadow:0 6px 18px rgba(16,185,129,0.35);">⚡ สมัครเลย (ไม่ต้องรอคิว)</button>',
          '    <button type="button" data-rq="dismiss" style="width:100%;background:rgba(30,41,59,0.8);border:1px solid rgba(148,163,184,0.32);color:#cbd5e1;border-radius:8px;padding:5px 10px;font-size:11px;cursor:pointer;">✏️ กรอกไอดีเอง (ซ่อน 5 นาที)</button>',
          '  </div>',
          '</div>'
        ].join('');
        (document.body || document.documentElement).appendChild(root);
        const forceBtn = root.querySelector('[data-rq="force-now"]');
        if (forceBtn) {
          forceBtn.onclick = () => {
            window.__pmForceRegisterNow = true;
            window.__pmRegisterQueueDismissedUntil = 0;
            window.__setPmRegisterQueueOverlay(null);
            const pid = window.__pmProfileId || (window.sessionStorage && window.sessionStorage.getItem('__pmProfileId')) || '';
            if (pid) {
              try {
                fetch('http://127.0.0.1:3891/api/profiles/' + encodeURIComponent(pid) + '/register-now', { method: 'POST', mode: 'no-cors' }).catch(() => {});
              } catch (_) {}
            }
          };
        }
        const disBtn = root.querySelector('[data-rq="dismiss"]');
        if (disBtn) {
          disBtn.onclick = () => {
            window.__pmRegisterQueueDismissedUntil = Date.now() + 5 * 60 * 1000;
            window.__setPmRegisterQueueOverlay(null);
          };
        }
      }
      const updateUi = () => {
        const st = window.__pmRegisterQueueState;
        const signedInTick = Boolean(window.NC?.Online?.account?.kind && window.NC.Online.account.kind !== 'device');
        if (!st || !st.waiting || signedInTick) {
          if (signedInTick) window.__setPmRegisterQueueOverlay(null);
          return;
        }
        const badge = root.querySelector('[data-rq="badge"]');
        const title = root.querySelector('[data-rq="title"]');
        const sub = root.querySelector('[data-rq="sub"]');
        const posLbl = root.querySelector('[data-rq="pos-lbl"]');
        const posEl = root.querySelector('[data-rq="pos"]');
        const timerLbl = root.querySelector('[data-rq="timer-lbl"]');
        const timerEl = root.querySelector('[data-rq="timer"]');
        const minB = Number(st.minBatchSize) || 1;
        const maxB = Number(st.maxBatchSize) || 3;
        const minM = Number(st.minCooldownMin) || 1;
        const maxM = Number(st.maxCooldownMin) || 30;
        const batchRangeTxt = minB === maxB ? (minB + ' จอ') : (minB + '–' + maxB + ' จอ');
        const coolRangeTxt = minM === maxM ? (minM + ' นาที') : (minM + '–' + maxM + ' นาที');
        if (st.startingSoon) {
          if (badge) badge.textContent = '⚡ ถึงคิวสมัครรอบนี้แล้ว';
          if (title) title.textContent = 'กำลังเตรียมสมัครไอดีให้จอนี้...';
          if (sub) sub.textContent = 'เว้นจังหวะห่างกันเล็กน้อยภายในกลุ่ม ' + batchRangeTxt + ' เพื่อความเป็นธรรมชาติ';
          if (posLbl) posLbl.textContent = 'ลำดับในรอบนี้';
          if (posEl) posEl.textContent = (st.waveSlot || 1) + ' / ' + (st.waveTargetSize || 1);
          if (timerLbl) timerLbl.textContent = 'เริ่มสมัครในอีก';
          if (timerEl) timerEl.textContent = fmtRemain(st.readyAt || Date.now());
        } else {
          if (badge) badge.textContent = '⏳ กำลังรอคิวสมัคร';
          if (title) title.textContent = 'กำลังรอคิวสมัครไอดีอัตโนมัติ';
          if (sub) sub.textContent = 'ระบบทยอยสมัครทีละ ' + batchRangeTxt + ' แล้วสุ่มหน่วงเวลา ' + coolRangeTxt + ' เพื่อลดความเสี่ยงโดนแบนยกชุด';
          if (posLbl) posLbl.textContent = 'ลำดับคิวรอ';
          if (posEl) posEl.textContent = '#' + (st.position || 1) + (st.totalWaiting ? ' / ' + st.totalWaiting : '');
          if (timerLbl) timerLbl.textContent = 'ชุดถัดไปในอีก';
          if (timerEl) timerEl.textContent = fmtRemain(st.nextWaveAt || Date.now());
        }
      };
      updateUi();
      if (!window.__pmRegisterQueueTimer) {
        window.__pmRegisterQueueTimer = setInterval(updateUi, 1000);
      }
    };
  }
`;

const pushQueueOverlayJs = q => `(() => {
  ${QUEUE_OVERLAY_HELPER_JS}
  window.__setPmRegisterQueueOverlay(${JSON.stringify(q)});
  return { success: true };
})()`;

const normalizeAccountId = u => {
  const s = String(u || '').trim().toLowerCase();
  if (!s) return '';
  return s.includes('@') ? s : (s + '@gmail.com');
};

const isPlaceholderCharName = name => {
  const s = String(name || '').trim();
  if (!s) return true;
  const low = s.toLowerCase();
  if (
    low === 'traveler' || low === 'guest' || low === 'player' ||
    low === 'unnamed' || low === 'loading' ||
    s === 'ผู้มาเยือน' || s === 'กำลังโหลด' || s === 'ไม่ทราบ'
  ) return true;
  return /^[\s.\u2026\-—–_•·?]+$/.test(s);
};

const isSameAccountId = (a, b) => {
  const sa = String(a || '').trim().toLowerCase();
  const sb = String(b || '').trim().toLowerCase();
  if (!sa || !sb) return sa === sb;
  if (sa === sb) return true;
  if (normalizeAccountId(sa) === normalizeAccountId(sb)) return true;
  const baseA = sa.replace(/@(gmail\.com|users\.nightcamp\.invalid)$/, '');
  const baseB = sb.replace(/@(gmail\.com|users\.nightcamp\.invalid)$/, '');
  return Boolean(
    baseA && baseA === baseB &&
    (!sa.includes('@') || !sb.includes('@') || sa.endsWith('@users.nightcamp.invalid') || sb.endsWith('@users.nightcamp.invalid'))
  );
};

const pushJs = cfg => `(() => {
  ${QUEUE_OVERLAY_HELPER_JS}
  window.__setPmRegisterQueueOverlay(null);
  const c = window.__authConfig || (window.__authConfig = {});
  const patch = ${JSON.stringify(cfg)};
  const domUser = (document.getElementById('p-auth-user')?.value || '').trim();
  const domPass = document.getElementById('p-auth-pass')?.value || '';
  if (domUser && !c.username) c.username = domUser;
  if (domPass && !c.password) c.password = domPass;
  const activeEl = document.activeElement;
  const isEditingAuth = Boolean(
    activeEl && (
      activeEl.id === 'p-auth-user' ||
      activeEl.id === 'p-auth-pass' ||
      activeEl.id === 'p-auth-char'
    )
  );
  const normBase = u => String(u || '').trim().toLowerCase().replace(/@(gmail\\.com|users\\.nightcamp\\.invalid)$/, '');
  const sameUser = (a, b) => {
    const sa = String(a || '').trim().toLowerCase();
    const sb = String(b || '').trim().toLowerCase();
    if (!sa || !sb) return sa === sb;
    if (sa === sb) return true;
    const na = sa.includes('@') ? sa : (sa + '@gmail.com');
    const nb = sb.includes('@') ? sb : (sb + '@gmail.com');
    if (na === nb) return true;
    return (!sa.includes('@') || !sb.includes('@') || sa.endsWith('@users.nightcamp.invalid') || sb.endsWith('@users.nightcamp.invalid')) && normBase(sa) === normBase(sb);
  };
  if (patch.username && c.username && sameUser(patch.username, c.username) && !String(patch.username).includes('@') && String(c.username).includes('@')) {
    patch.username = c.username;
  }
  const onlineSt = String(window.NC?.Online?.status || '');
  const isActivelyInGameOrQueue = Boolean(
    window.NC?.OnlineLobby?.entered === true ||
    ['online', 'reconnecting', 'connecting', 'syncing', 'checking', 'transferring', 'channel'].includes(onlineSt)
  );
  const isDiffUser = Boolean(patch.username && c.username && !sameUser(patch.username, c.username));
  if (patch.forceResetAuth || (isDiffUser && !isActivelyInGameOrQueue)) {
    const forceLogout = Boolean(patch.forceResetAuth);
    delete patch.forceResetAuth;
    c.userEditedAt = 0;
    c.verifiedLoginAt = 0;
    c.registerError = '';
    c.registerDone = false;
    try { if (window.sessionStorage) window.sessionStorage.removeItem('aetheria.session'); } catch (_) {}
    if ((forceLogout || !isActivelyInGameOrQueue) && window.NC && window.NC.Online && window.NC.Online.account && window.NC.Online.account.kind !== 'device' && typeof window.NC.Online.logout === 'function') {
      try { window.NC.Online.logout().catch(() => {}); } catch (_) {}
    }
  } else {
    delete patch.forceResetAuth;
  }
  const hasManualUserCreds = Boolean(
    c.username && c.password && !c.generatedUser && !c.register &&
    (Number(c.userEditedAt) > 0 || Number(c.verifiedLoginAt) > 0)
  );
  if ((patch.register || patch.generatedUser) && (hasManualUserCreds || isEditingAuth)) {
    return {
      success: false,
      abortedByUserCreds: true,
      username: String(c.username || '').trim(),
      password: String(c.password || '')
    };
  }
  if (patch.preserveUserToggle && (c.userToggledAt || c.enabled === false || c.userDisabledAutoLogin)) {
    delete patch.enabled;
  }
  delete patch.preserveUserToggle;
  if (patch.enabled === true) {
    window.__ncAllowEnableAutoLogin = true;
    window.__ncUserDisabledAutoLogin = false;
  } else if (patch.enabled === false) {
    window.__ncUserDisabledAutoLogin = true;
  }
  try {
    if (typeof patch.email === 'string' && patch.email.trim()) {
      c.email = patch.email.trim().toLowerCase();
    }
    if (typeof patch.outlookStatusMsg === 'string') {
      window.__pmOutlookFlowStatusMsg = patch.outlookStatusMsg;
      delete patch.outlookStatusMsg;
    }
    if (typeof patch.otpCode === 'string' && patch.otpCode) {
      const otpToSubmit = String(patch.otpCode).trim();
      delete patch.otpCode;
      window.__pendingNightcampOtpCode = otpToSubmit;
      const setNativeInputVal = (el, val) => {
        if (!el) return;
        try { el.focus(); } catch (_) {}
        const proto = window.HTMLInputElement?.prototype;
        const setter = proto && Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter) setter.call(el, val);
        else el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      // Path 1: In-Game World Email Verification Window (#sq [data-sq="verify"] / window.NC.OnlineVerify)
      try {
        const sqVerifyEl = document.querySelector('#sq [data-sq="verify"]');
        const vfCodeInp = sqVerifyEl?.querySelector('input.vf-in[data-f="code"]');
        const vf = window.NC?.OnlineVerify?.state?.();
        if ((vfCodeInp || (vf && vf.st && vf.st.sent && !vf.st.done)) && otpToSubmit !== window.__lastSubmittedNightcampOtpCode) {
          if (vfCodeInp) setNativeInputVal(vfCodeInp, otpToSubmit);
          window.__lastSubmittedNightcampOtpCode = otpToSubmit;
          if (vf && typeof vf.check === 'function') {
            Promise.resolve(vf.check(otpToSubmit)).then(() => {
              setTimeout(() => {
                try {
                  if (window.NC?.OnlineVerify?.state?.()?.st?.done) {
                    window.NC?.OnlineVerify?.close?.();
                  }
                } catch (_) {}
              }, 800);
            }).catch(() => {});
          } else {
            const confirmBtn = sqVerifyEl?.querySelector('button[data-act="confirm"]');
            if (confirmBtn && !confirmBtn.disabled) confirmBtn.click();
          }
        }
      } catch (_) {}
      // Path 2: Sign-In Overdue Email Verification Modal (.cs-modal.cs-verify:not([hidden]))
      try {
        const csVerifyModal = document.querySelector('.cs-modal.cs-verify:not([hidden])');
        const csVerifyCodeInp = csVerifyModal?.querySelector('.cs-v-code:not([hidden])');
        const csVerifyOkBtn = csVerifyModal?.querySelector('.cs-v-ok');
        if (csVerifyCodeInp && otpToSubmit !== window.__lastSubmittedNightcampOtpCode) {
          setNativeInputVal(csVerifyCodeInp, otpToSubmit);
          window.__lastSubmittedNightcampOtpCode = otpToSubmit;
          if (csVerifyOkBtn && !csVerifyOkBtn.disabled) csVerifyOkBtn.click();
        }
      } catch (_) {}
      // Path 3: Sign-Up Door OTP Form (window.__submitNightcampEmailOtp / window.executeAutoLogin)
      if (typeof window.__submitNightcampEmailOtp === 'function') {
        setTimeout(() => { try { window.__submitNightcampEmailOtp(otpToSubmit); } catch (_) {} }, 50);
      }
    }
    Object.assign(c, patch);
    if (patch.enabled === false) c.userDisabledAutoLogin = true;
    else if (patch.enabled === true) c.userDisabledAutoLogin = false;
  } finally {
    window.__ncAllowEnableAutoLogin = false;
  }
  c.lastManagerPushAt = Date.now();
  try {
    localStorage.setItem('pelican_auth_cfg', JSON.stringify(c));
    if (typeof patch.enabled === 'boolean') {
      localStorage.setItem('pelican_autologin_user_lock', JSON.stringify({ enabled: patch.enabled, ts: c.lastManagerPushAt }));
    }
  } catch (e) {}
  const set = (id, v) => { const el = document.getElementById(id); if (el && document.activeElement !== el) { if (el.type === 'checkbox') el.checked = !!v; else el.value = v; } };
  if (c.enabled !== undefined) set('p-auth-enabled', c.enabled);
  set('p-auth-user', c.username || '');
  set('p-auth-pass', c.password || '');
  if (c.serverName !== undefined) set('p-auth-server', c.serverName || '');
  if (c.charName !== undefined) set('p-auth-char', c.charName || '');
  if (c.autoResumeBot !== undefined) set('p-auth-resume', !!c.autoResumeBot);
  window.__ncLastFailedAuthKey = '';
  if (!isActivelyInGameOrQueue && c.enabled && c.username && c.password && typeof window.executeAutoLogin === 'function') {
    setTimeout(() => { try { window.executeAutoLogin(false).catch(() => {}); } catch (_) {} }, 200);
  }
  return { success: true };
})()`;

function createAuthSync({
  loadProfiles,
  saveProfiles,
  evalProfilePort,
  credentials,
  proxyRegister,
  smailproService,
  isScreenProxyEnabled,
  ensureScreenProxyForRegister,
  requireOnlineWindowForQueue = false,
  waveOptions = {}
}) {
  // passwords live in data/credentials.json (git-ignored), not in profiles.json
  const pw = p => credentials.getPassword(p.id);
  const pendingCreds = new Map(); // profileId -> { username, password, generatedUser }

  // Staggered Auto-Register Wave Queue (1–3 accounts per wave, random 1–30 min cooldown between waves)
  const nowFn = typeof waveOptions.now === 'function' ? waveOptions.now : () => Date.now();
  const randIntFn = typeof waveOptions.randInt === 'function' ? waveOptions.randInt : rInt;
  const minBatchSize = Math.max(1, Number(waveOptions.minBatchSize ?? 1));
  const maxBatchSize = Math.max(minBatchSize, Number(waveOptions.maxBatchSize ?? 3));
  const minCooldownMs = Math.max(0, Number(waveOptions.minCooldownMs ?? 1 * 60 * 1000));
  const maxCooldownMs = Math.max(minCooldownMs, Number(waveOptions.maxCooldownMs ?? 30 * 60 * 1000));
  const admissionWindowMs = Math.max(0, Number(waveOptions.admissionWindowMs ?? 90 * 1000));
  const intraWaveStaggerMinMs = Math.max(0, Number(waveOptions.intraWaveStaggerMinMs ?? waveOptions.minStaggerMs ?? 6000));
  const intraWaveStaggerMaxMs = Math.max(intraWaveStaggerMinMs, Number(waveOptions.intraWaveStaggerMaxMs ?? waveOptions.maxStaggerMs ?? 15000));
  const slotMaxActiveMs = Math.max(1000, Number(waveOptions.slotMaxActiveMs ?? 5 * 60 * 1000));
  const scheduleTimers = waveOptions.disableTimers !== true;

  const hasConfirmedProfileChar = p => Boolean(p && p.account && p.lastCharName && !isPlaceholderCharName(p.lastCharName));

  const lastClientOnlineAt = new Map(); // profileId -> timestamp
  const lastPushedQueueDigest = new Map(); // profileId -> digest string
  const scheduledReadyTimers = new Map(); // profileId -> Timeout
  const forceBypassQueueIds = new Set(); // profileIds forced via "สมัครเลย" button

  const waveState = {
    waveId: 0,
    targetSize: 0,
    startedAt: 0,
    rolledCooldownMs: 0,
    nextWaveAt: 0,
    sealed: true,
    admitted: new Map(), // profileId -> { slotIndex, admittedAt, readyAt, completedAt, timedOut }
    queueOrder: []       // FIFO profileIds waiting for upcoming waves
  };

  function isSlotStillBlocking(slot, now) {
    if (!slot || slot.completedAt || slot.timedOut) return false;
    if (now - slot.admittedAt >= slotMaxActiveMs) {
      slot.timedOut = true;
      return false;
    }
    return true;
  }

  function reconcileWaveState(allProfiles) {
    const now = nowFn();
    const byId = new Map((allProfiles || []).filter(Boolean).map(p => [p.id, p]));
    let anyNewlyCompleted = false;
    for (const [pid, slot] of waveState.admitted.entries()) {
      if (slot.completedAt || slot.timedOut) continue;
      const p = byId.get(pid);
      const confirmedChar = hasConfirmedProfileChar(p);
      const creatingCharGrace = Boolean(p && !confirmedChar && p.registeredAt && (now - p.registeredAt < 60000));
      const finished = !p || confirmedChar || (!p.autoRegister && !p.loginSyncPending && !creatingCharGrace);
      const clientGone = requireOnlineWindowForQueue && ((now - (lastClientOnlineAt.get(pid) || 0)) > 45000);
      if (finished) {
        slot.completedAt = now;
        anyNewlyCompleted = true;
        lastPushedQueueDigest.delete(pid);
      } else if (clientGone || (now - slot.admittedAt >= slotMaxActiveMs)) {
        slot.timedOut = true;
        lastPushedQueueDigest.delete(pid);
      }
    }
    if (anyNewlyCompleted && waveState.admitted.size > 0) {
      const stillActive = Array.from(waveState.admitted.values()).some(s => isSlotStillBlocking(s, now));
      if (!stillActive && (now - waveState.startedAt) > 60000) {
        waveState.nextWaveAt = Math.max(waveState.nextWaveAt, now + waveState.rolledCooldownMs);
      }
    }
    waveState.queueOrder = waveState.queueOrder.filter(pid => {
      if (waveState.admitted.has(pid)) return false;
      const p = byId.get(pid);
      if (!p || !p.autoRegister || hasConfirmedProfileChar(p)) return false;
      if (requireOnlineWindowForQueue) {
        const seenAt = lastClientOnlineAt.get(pid) || 0;
        if (!seenAt || (now - seenAt > 45000)) return false;
      }
      return true;
    });
  }

  function admitIntoCurrentWave(pid, now) {
    const slotIndex = waveState.admitted.size;
    const stagger = slotIndex === 0
      ? 0
      : (intraWaveStaggerMaxMs > 0 ? slotIndex * randIntFn(intraWaveStaggerMinMs, intraWaveStaggerMaxMs) : 0);
    const readyAt = now + stagger;
    const slot = { slotIndex, admittedAt: now, readyAt, completedAt: 0, timedOut: false };
    waveState.admitted.set(pid, slot);
    const qIdx = waveState.queueOrder.indexOf(pid);
    if (qIdx !== -1) waveState.queueOrder.splice(qIdx, 1);
    if (waveState.admitted.size >= waveState.targetSize) {
      waveState.sealed = true;
    }
    return slot;
  }

  function requestRegisterWaveAccess(profile, allProfiles) {
    const now = nowFn();
    reconcileWaveState(allProfiles);
    const pid = profile.id;

    // 0. Forced bypass via "⚡ สมัครเลย (ไม่ต้องรอคิว)"
    if (forceBypassQueueIds.has(pid)) {
      const qIdx = waveState.queueOrder.indexOf(pid);
      if (qIdx !== -1) waveState.queueOrder.splice(qIdx, 1);
      if (!waveState.admitted.has(pid)) {
        waveState.admitted.set(pid, {
          slotIndex: waveState.admitted.size,
          admittedAt: now,
          readyAt: 0,
          completedAt: 0,
          timedOut: false,
          forced: true
        });
      } else {
        waveState.admitted.get(pid).readyAt = 0;
      }
      return { allowed: true, waveId: waveState.waveId || 1, forced: true };
    }

    // 1. Already admitted in current wave
    if (waveState.admitted.has(pid)) {
      const slot = waveState.admitted.get(pid);
      if (now < slot.readyAt) {
        return {
          allowed: false,
          startingSoon: true,
          readyAt: slot.readyAt,
          waveSlot: slot.slotIndex + 1,
          waveTargetSize: waveState.targetSize,
          nextWaveAt: waveState.nextWaveAt
        };
      }
      return { allowed: true, waveId: waveState.waveId };
    }

    // 2. Join currently open unsealed wave if within admission window and front of queue
    if (waveState.waveId > 0 && !waveState.sealed) {
      if (waveState.admitted.size < waveState.targetSize && (now - waveState.startedAt) <= admissionWindowMs) {
        if (waveState.queueOrder.length === 0 || waveState.queueOrder[0] === pid) {
          const slot = admitIntoCurrentWave(pid, now);
          return {
            allowed: now >= slot.readyAt,
            startingSoon: now < slot.readyAt,
            readyAt: slot.readyAt,
            waveSlot: slot.slotIndex + 1,
            waveTargetSize: waveState.targetSize,
            nextWaveAt: waveState.nextWaveAt
          };
        }
      } else {
        waveState.sealed = true;
      }
    }

    // 3. Start a new wave if cooldown has elapsed and previous wave slots are no longer blocking
    const anyBlocking = Array.from(waveState.admitted.values()).some(s => isSlotStillBlocking(s, now));
    if (!anyBlocking && now >= waveState.nextWaveAt) {
      if (!waveState.queueOrder.includes(pid)) {
        waveState.queueOrder.push(pid);
      }
      const targetSize = randIntFn(minBatchSize, maxBatchSize);
      const rolledCooldownMs = randIntFn(minCooldownMs, maxCooldownMs);
      waveState.waveId += 1;
      waveState.targetSize = targetSize;
      waveState.startedAt = now;
      waveState.rolledCooldownMs = rolledCooldownMs;
      waveState.nextWaveAt = now + rolledCooldownMs;
      waveState.admitted.clear();
      waveState.sealed = false;

      const toAdmit = waveState.queueOrder.slice(0, targetSize);
      for (const nextPid of toAdmit) {
        admitIntoCurrentWave(nextPid, now);
      }
      const coolSec = Math.round(rolledCooldownMs / 1000);
      const coolDesc = coolSec >= 60 ? `${Math.floor(coolSec / 60)} นาที ${coolSec % 60} วิ` : `${coolSec} วิ`;
      console.log(`[AuthSync] 🌊 เริ่มรอบคิวสมัครชุดที่ #${waveState.waveId}: อนุญาต ${waveState.admitted.size}/${targetSize} จอ (สุ่มพักรอรอบถัดไป ${coolDesc})`);

      if (waveState.admitted.has(pid)) {
        const slot = waveState.admitted.get(pid);
        return {
          allowed: now >= slot.readyAt,
          startingSoon: now < slot.readyAt,
          readyAt: slot.readyAt,
          waveSlot: slot.slotIndex + 1,
          waveTargetSize: waveState.targetSize,
          nextWaveAt: waveState.nextWaveAt
        };
      }
    }

    // 4. Enqueue for future wave
    if (!waveState.queueOrder.includes(pid)) {
      waveState.queueOrder.push(pid);
    }
    const position = waveState.queueOrder.indexOf(pid) + 1;
    const allEligibleWaiting = (allProfiles || []).filter(x => {
      if (!x || !x.autoRegister || hasConfirmedProfileChar(x) || waveState.admitted.has(x.id)) return false;
      if (requireOnlineWindowForQueue) {
        const seen = lastClientOnlineAt.get(x.id) || 0;
        return x.id === pid || (seen > 0 && (now - seen <= 45000));
      }
      return true;
    }).length;
    const totalWaiting = Math.max(waveState.queueOrder.length, allEligibleWaiting);

    return {
      allowed: false,
      startingSoon: false,
      position,
      totalWaiting,
      waveTargetSize: waveState.targetSize,
      nextWaveAt: waveState.nextWaveAt
    };
  }

  function scheduleReadyWakeup(profileId, readyAt) {
    if (!scheduleTimers || scheduledReadyTimers.has(profileId)) return;
    const delay = Math.max(100, readyAt - nowFn() + 120);
    const t = setTimeout(() => {
      scheduledReadyTimers.delete(profileId);
      try {
        const fresh = (loadProfiles() || []).find(x => x && x.id === profileId);
        if (fresh) syncOne(fresh).catch(() => {});
      } catch (_) {}
    }, delay);
    if (typeof t.unref === 'function') t.unref();
    scheduledReadyTimers.set(profileId, t);
  }

  function getRegisterQueueSnapshot() {
    const now = nowFn();
    return {
      waveId: waveState.waveId,
      targetSize: waveState.targetSize,
      startedAt: waveState.startedAt,
      nextWaveAt: waveState.nextWaveAt,
      remainMs: Math.max(0, waveState.nextWaveAt - now),
      sealed: waveState.sealed,
      admittedIds: Array.from(waveState.admitted.keys()),
      queueOrder: waveState.queueOrder.slice()
    };
  }

  function updateProfile(id, patch) {
    const profiles = loadProfiles();
    const p = profiles.find(x => x.id === id);
    if (!p) return null;
    Object.assign(p, patch);
    saveProfiles(profiles);
    return p;
  }

  function existingAccounts() {
    const set = new Set();
    try {
      for (const p of loadProfiles() || []) {
        if (p && p.account) set.add(String(p.account).trim().toLowerCase());
      }
      for (const v of pendingCreds.values()) {
        if (v && v.username) set.add(String(v.username).trim().toLowerCase());
      }
    } catch (_) {}
    return set;
  }

  function callClientOutlookFlow(debugPort, payload, timeoutMs = 20000) {
    if (!debugPort) return Promise.resolve({ unavailable: true });
    return new Promise(resolve => {
      const data = JSON.stringify(payload || {});
      const req = http.request({
        hostname: '127.0.0.1',
        port: Number(debugPort),
        path: '/api/outlook-flow',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        },
        timeout: timeoutMs
      }, res => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', ch => { raw += ch; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(raw || '{}');
            if (parsed && Array.isArray(parsed.endpoints) && !parsed.status) {
              resolve({ unavailable: true });
            } else {
              resolve(parsed);
            }
          } catch (_) {
            resolve({ unavailable: true });
          }
        });
      });
      req.on('timeout', () => { try { req.destroy(); } catch (_) {} resolve({ timeout: true }); });
      req.on('error', () => resolve({ unavailable: true }));
      req.write(data);
      req.end();
    });
  }

  function getCandidateCreds(profile) {
    let c = pendingCreds.get(profile.id);
    const hasAccount = !!(profile.account && profile.account.trim());
    if (!c || (hasAccount && c.username !== profile.account.trim())) {
      let uname = hasAccount ? profile.account.trim() : genUserId(existingAccounts());
      if (uname && !uname.includes('@')) uname = uname + (hasAccount ? '@gmail.com' : '@outlook.com');
      const person = genPersonProfile();
      c = {
        username: uname,
        password: pw(profile) || genPassword(),
        charName: (profile.charName && profile.charName.trim()) || genCharName(),
        generatedUser: !hasAccount || !!profile.generatedAccount,
        outlookReady: Boolean(profile.outlookCreated || (hasAccount && !profile.autoRegister)),
        ...person
      };
      pendingCreds.set(profile.id, c);
    }
    return c;
  }

  function rotateCandidateUser(profile) {
    const c = getCandidateCreds(profile);
    c.username = genUserId(existingAccounts());
    c.generatedUser = true;
    c.outlookReady = false;
    pendingCreds.set(profile.id, c);
    return c;
  }

  function commitSuccessfulRegistration(profile, username, password) {
    const cred = pendingCreds.get(profile.id);
    const resolvedEmail = String(profile.email || (String(username || '').includes('@') ? username : '')).trim();
    credentials.setPassword(profile.id, password);
    const updated = updateProfile(profile.id, {
      account: username,
      ...(resolvedEmail ? { email: resolvedEmail } : {}),
      autoRegister: false,
      generatedAccount: true,
      outlookCreated: true,
      registeredAt: Date.now(),
      proxyRegistrationState: 'done',
      registerError: '',
      loginSyncPending: true,
      lastAuthSyncPushAt: Date.now()
    });
    if (smailproService && typeof smailproService.recordRegisteredAccount === 'function') {
      smailproService.recordRegisteredAccount({
        profileId: profile.id,
        profileName: profile.name || profile.id,
        username,
        password,
        email: resolvedEmail || username,
        provider: cred?.isSmailPro ? `smailpro_${cred.smailproFamily || 'auto'}` : 'builtin_outlook',
        charName: profile.lastCharName || profile.charName || cred?.charName || '',
        serverName: profile.serverName || ''
      }).catch(() => {});
    }
    pendingCreds.delete(profile.id);
    return updated || profile;
  }

  async function syncProxyRegistration(profile, { clientOnline = true } = {}) {
    const cred = getCandidateCreds(profile);
    try {
      const result = await proxyRegister.registerAccountWithProxy({
        profileId: profile.id,
        username: cred.username,
        password: cred.password
      });
      if (result?.success === true) {
        commitSuccessfulRegistration(profile, cred.username, cred.password);
        if (clientOnline && profile.debugPort) {
          const delivered = await evalProfilePort(profile.debugPort, pushJs({
            enabled: true, autoResumeBot: Boolean(profile.autoResumeBot), username: cred.username, password: cred.password,
            register: false, registerDone: true, autoCreateChar: true, generatedUser: !!cred.generatedUser
          }), 3000);
          if (delivered?.success && delivered.result?.abortedByUserCreds && delivered.result.username && delivered.result.password) {
            credentials.setPassword(profile.id, delivered.result.password);
            updateProfile(profile.id, {
              account: delivered.result.username,
              autoRegister: false,
              generatedAccount: false,
              registerError: '',
              loginSyncPending: false,
              lastAuthSyncPushAt: Date.now()
            });
            pendingCreds.delete(profile.id);
            return;
          }
          if (!delivered?.success || delivered.result?.success !== true) {
            updateProfile(profile.id, { registerError: 'สมัครสำเร็จแล้ว แต่ยังส่งค่าล็อกอินเข้าจอไม่ได้ รอซิงค์อีกครั้ง' });
          } else {
            updateProfile(profile.id, { loginSyncPending: false, lastAuthSyncPushAt: Date.now() });
          }
        }
        console.log(`[AuthSync] ✅ ${profile.name}: สมัครบัญชีผ่าน Proxy สำเร็จ ("${cred.username}")${clientOnline ? ' -> ส่งคำสั่งล็อกอินเข้าเกม' : ' -> รอส่งค่าล็อกอินเมื่อเปิดจอ'}`);
      } else if (result?.code === 'USERNAME_TAKEN') {
        const nextUser = rotateCandidateUser(profile).username;
        if (profile.generatedAccount) {
          updateProfile(profile.id, { account: nextUser, generatedAccount: true, proxyRegistrationState: 'known-rejected', registerError: '' });
        } else if (!profile.account) {
          updateProfile(profile.id, { proxyRegistrationState: 'known-rejected', registerError: '' });
        } else {
          updateProfile(profile.id, { proxyRegistrationState: 'known-rejected', registerError: 'ชื่อผู้ใช้นี้ถูกใช้แล้ว' });
        }
      } else if (result?.code === 'IP_RATE_LIMITED') {
        updateProfile(profile.id, {
          proxyRegistrationState: 'retry-pending',
          registerError: result.error || 'IP นี้สมัครครบโควต้าแล้ว กำลังสลับ IP ใหม่ในรอบถัดไป'
        });
      } else if (result?.pending) {
        updateProfile(profile.id, { proxyRegistrationState: 'review-required', registerError: result.error || 'รายการสมัครยังรอตรวจสอบ' });
      } else {
        updateProfile(profile.id, {
          proxyRegistrationState: 'known-rejected',
          proxyFallbackBrowser: true,
          registerError: 'Proxy ไม่อนุมัติ (' + (result?.error || 'ไม่ทราบสาเหตุ') + ') — เปลี่ยนไปสมัครผ่านหน้าเกมแทน'
        });
        console.warn(`[AuthSync] ⚠️ ${profile.name}: Proxy ไม่อนุมัติการสมัคร -> สมัครผ่านหน้าเกมแทน`);
      }
    } catch (err) {
      if (err?.message === 'PROXY_DISABLED' || (typeof proxyRegister?.isEnabled === 'function' && !proxyRegister.isEnabled())) {
        updateProfile(profile.id, {
          proxyFallbackBrowser: true,
          registerError: 'ระบบ Proxy ปิดอยู่ — เปลี่ยนไปสมัครผ่านหน้าเกมแทน'
        });
        console.warn(`[AuthSync] ⚠️ ${profile.name}: Proxy ปิดอยู่ -> เปลี่ยนไปสมัครผ่านหน้าเกมแทน`);
      } else {
        updateProfile(profile.id, { proxyRegistrationState: 'retry-pending', registerError: 'ยังยืนยันผล Proxy ไม่ได้ เก็บรายการเดิมไว้ก่อนลองใหม่' });
      }
    }
  }

  const syncInFlight = new Set();

  async function syncOne(profile) {
    if (!profile || !profile.id) return;
    if (syncInFlight.has(profile.id)) return;
    syncInFlight.add(profile.id);
    try {
      await syncOneInner(profile);
    } finally {
      syncInFlight.delete(profile.id);
    }
  }

  async function syncOneInner(profile) {
    if (!profile.debugPort && !profile.autoRegister) return;
    if (!profile.debugPort && !profile.autoRegister && !(profile.account && pw(profile))) return;

    const proxyAvailable = false;

    const r = profile.debugPort ? await evalProfilePort(profile.debugPort, READ_JS, 4500) : null;
    const cur = r && r.success ? r.result : null;
    if (!cur) {
      // Allow Proxy registration recovery if a request was already in flight,
      // or offline Proxy registration (gated by wave queue) when requireOnlineWindowForQueue is false.
      const hasConfirmedChar = Boolean(profile.lastCharName && !isPlaceholderCharName(profile.lastCharName) && profile.account);
      if (profile.autoRegister && !hasConfirmedChar && !(profile.account && pw(profile))) {
        if (proxyRegister?.hasPending?.(profile.id)) {
          await syncProxyRegistration(profile, { clientOnline: false });
        } else if (!requireOnlineWindowForQueue && proxyAvailable) {
          const allProfilesOffline = (typeof loadProfiles === 'function' ? loadProfiles() : []) || [];
          const access = requestRegisterWaveAccess(profile, allProfilesOffline);
          if (access.allowed) {
            await syncProxyRegistration(profile, { clientOnline: false });
          } else if (access.startingSoon && access.readyAt) {
            scheduleReadyWakeup(profile.id, access.readyAt);
          }
        }
      }
      return;
    }
    lastClientOnlineAt.set(profile.id, nowFn());

    // If user is actively typing in the in-game Auth HUD or login form right now, wait for next sync tick
    if (cur.isEditingAuth && (!cur.username || !cur.password)) {
      return;
    }

    // 1. If the user manually entered ID/Password in the in-game Bot HUD, logged in manually on the game screen,
    // or the in-game Bot HUD already has credentials while Manager is empty or in autoRegister/generatedAccount mode,
    // adopt the user's credentials into the Manager profile instead of leaving Manager blank or overwriting with a bot account!
    const allProfiles = (typeof loadProfiles === 'function' ? loadProfiles() : []) || [];
    const ownedByOtherProfile = Boolean(
      cur.username &&
      !isSameAccountId(profile.account, cur.username) &&
      allProfiles.some(o => o && o.id !== profile.id && isSameAccountId(o.account, cur.username))
    );
    const manualUserEditedAt = Number(cur.userEditedAt) || 0;
    const lastManagerPushAt = Number(profile.lastAuthSyncPushAt) || 0;
    const identityChangedAt = Number(profile.identityChangedAt) || 0;
    const staleClientCredsAfterReset = Boolean(profile.autoRegister && identityChangedAt > 0 && manualUserEditedAt <= identityChangedAt);
    const isUnverifiedGenClient = Boolean(cur.generatedUser && !cur.registerDone && !cur.verifiedLoginAt);
    const hasClientCreds = Boolean(cur.username && cur.password && !cur.register && !cur.registerError && !isUnverifiedGenClient);
    const managerMissingCreds = !profile.account || !pw(profile);
    const managerHasExplicitUserCreds = Boolean(profile.account && pw(profile) && !profile.autoRegister && !profile.generatedAccount);
    const isSameGeneratedAccount = Boolean(profile.generatedAccount && profile.account && isSameAccountId(cur.username, profile.account));
    const isCompletedBotSignup = Boolean(profile.autoRegister && cur.registerDone && cur.generatedUser);
    const shouldAdoptFromClient = !staleClientCredsAfterReset && hasClientCreds && !isCompletedBotSignup && !isSameGeneratedAccount && !ownedByOtherProfile && !(managerHasExplicitUserCreds && cur.generatedUser) && (
      (!cur.generatedUser && manualUserEditedAt > 0 && manualUserEditedAt > lastManagerPushAt) ||
      managerMissingCreds ||
      (!cur.generatedUser && (profile.autoRegister || profile.generatedAccount))
    );

    if (shouldAdoptFromClient) {
      if (cur.registerQueueWaiting) {
        await evalProfilePort(profile.debugPort, pushQueueOverlayJs(null), 2000);
        lastPushedQueueDigest.delete(profile.id);
      }
      const shouldAdoptServer = Boolean(
        cur.serverName &&
        (!profile.serverName || (Number(cur.serverEditedAt) > lastManagerPushAt))
      );
      const userEditedCharNewer = Boolean(Number(cur.charEditedAt) > lastManagerPushAt);
      const shouldAdoptChar = Boolean(
        (userEditedCharNewer && cur.charNameCfg !== (profile.charName || '')) ||
        (!profile.charName && cur.charNameCfg && !isPlaceholderCharName(cur.charNameCfg))
      );
      const clientToggledNewer = Boolean(Number(cur.userToggledAt) > lastManagerPushAt);
      const toggleChanged = Boolean(
        clientToggledNewer && (
          Boolean(cur.enabled) !== (profile.autoLoginEnabled !== false) ||
          Boolean(cur.autoResumeBot) !== Boolean(profile.autoResumeBot)
        )
      );
      if (!isSameAccountId(cur.username, profile.account) || cur.username !== profile.account || cur.password !== pw(profile) || (shouldAdoptServer && cur.serverName !== (profile.serverName || '')) || shouldAdoptChar || toggleChanged || profile.autoRegister || (profile.generatedAccount && !cur.generatedUser)) {
        credentials.setPassword(profile.id, cur.password);
        const nextCharVal = (!cur.charNameCfg || !isPlaceholderCharName(cur.charNameCfg)) ? cur.charNameCfg : '';
        updateProfile(profile.id, {
          account: cur.username,
          ...(shouldAdoptServer ? { serverName: cur.serverName } : {}),
          ...(shouldAdoptChar ? { charName: nextCharVal } : {}),
          ...(clientToggledNewer ? { autoLoginEnabled: Boolean(cur.enabled), autoResumeBot: Boolean(cur.autoResumeBot) } : {}),
          autoRegister: false,
          generatedAccount: !!cur.generatedUser,
          registerError: '',
          loginSyncPending: false,
          lastAuthSyncPushAt: Date.now(),
          ...(cur.inWorld && cur.charName && !isPlaceholderCharName(cur.charName) && (!profile.lastCharName || isPlaceholderCharName(profile.lastCharName)) ? { lastCharName: cur.charName } : {})
        });
        pendingCreds.delete(profile.id);
        console.log(`[AuthSync] 🔄 ${profile.name}: ซิงค์ไอดี/รหัสจากเมนูบอทในเกม ("${cur.username}") เข้าโปรไฟล์ Manager อัตโนมัติ`);
      } else if (manualUserEditedAt > lastManagerPushAt || clientToggledNewer) {
        updateProfile(profile.id, {
          ...(clientToggledNewer ? { autoLoginEnabled: Boolean(cur.enabled), autoResumeBot: Boolean(cur.autoResumeBot) } : {}),
          lastAuthSyncPushAt: Date.now()
        });
      }
      return;
    }

    if (profile.autoRegister) {
      // NEVER auto-register over a profile that already has a character or manual credentials in HUD (unless profile was explicitly reset to auto-register)!
      if (!staleClientCredsAfterReset && cur.username && cur.password && !cur.register && !cur.registerError && !cur.generatedUser && !isSameGeneratedAccount && !ownedByOtherProfile) {
        if (cur.registerQueueWaiting) {
          await evalProfilePort(profile.debugPort, pushQueueOverlayJs(null), 2000);
          lastPushedQueueDigest.delete(profile.id);
        }
        credentials.setPassword(profile.id, cur.password);
        updateProfile(profile.id, {
          account: cur.username,
          autoRegister: false,
          generatedAccount: false,
          registerError: '',
          loginSyncPending: false,
          lastAuthSyncPushAt: Date.now(),
          ...(cur.charName && !isPlaceholderCharName(cur.charName) && (!profile.lastCharName || isPlaceholderCharName(profile.lastCharName)) ? { lastCharName: cur.charName } : {})
        });
        pendingCreds.delete(profile.id);
        console.log(`[AuthSync] 🔄 ${profile.name}: พบไอดี/รหัสเดิมในหน้าเกม ("${cur.username}") -> บันทึกเข้าโปรไฟล์โดยไม่สร้างไอดีบอททับ`);
        return;
      }
      const hasValidSavedChar = Boolean(profile.lastCharName && !isPlaceholderCharName(profile.lastCharName));
      const hasValidLiveChar = Boolean(cur.charName && !isPlaceholderCharName(cur.charName));
      const hasManagerAccount = Boolean(profile.account && String(profile.account).trim());
      if (
        (hasValidSavedChar && hasManagerAccount) ||
        (!staleClientCredsAfterReset && (cur.inGame || hasValidLiveChar) && !cur.registerDone)
      ) {
        if (cur.registerQueueWaiting) {
          await evalProfilePort(profile.debugPort, pushQueueOverlayJs(null), 2000);
          lastPushedQueueDigest.delete(profile.id);
        }
        updateProfile(profile.id, {
          autoRegister: false,
          ...(hasValidLiveChar && !hasValidSavedChar ? { lastCharName: cur.charName } : {})
        });
        pendingCreds.delete(profile.id);
        console.log(`[AuthSync] 🛡️ ${profile.name}: พบตัวละครในเกมแล้ว ("${(hasValidSavedChar && profile.lastCharName) || (hasValidLiveChar && cur.charName) || 'in-game'}") -> ปิด Auto-Register เพื่อไม่ให้เปลี่ยนรหัสทับ`);
        return;
      }
      if (profile.lastCharName && (!hasValidSavedChar || (!hasManagerAccount && !pw(profile) && !cur.inGame && !hasValidLiveChar))) {
        updateProfile(profile.id, { lastCharName: '' });
        profile.lastCharName = '';
      }
      if (proxyRegister?.hasPending?.(profile.id)) {
        await syncProxyRegistration(profile, { clientOnline: true });
        return;
      }
      if (cur.registerDone && cur.username) {
        if (cur.registerQueueWaiting) {
          await evalProfilePort(profile.debugPort, pushQueueOverlayJs(null), 2000);
          lastPushedQueueDigest.delete(profile.id);
        }
        const cred = getCandidateCreds(profile);
        commitSuccessfulRegistration(profile, cur.username, cur.password || cred.password);
        await callClientOutlookFlow(profile.debugPort, { action: 'close-tab' }, 3000).catch(() => {});
        console.log(`[AuthSync] ✅ ${profile.name}: สมัครบัญชีผ่านหน้าเกม "${cur.username}" สำเร็จ`);
        return;
      }
      if (cur.awaitingEmailOtp && cur.username) {
        const cred = getCandidateCreds(profile);
        const useSmailProOtp = Boolean(
          smailproService &&
          (smailproService.getMode() === 'smailpro' || cred.isSmailPro || !/@(outlook|hotmail|live)\.com$/i.test(cur.username || ''))
        );
        if (useSmailProOtp) {
          const otpRes = await smailproService.pollOtp({
            profileId: profile.id,
            email: cur.username || cred.username,
            rejectedCode: cur.lastRejectedOtpCode || ''
          });
          if (otpRes) {
            if (otpRes.status === 'otp_found' && otpRes.otpCode) {
              await evalProfilePort(profile.debugPort, pushJs({
                otpCode: otpRes.otpCode,
                outlookStatusMsg: otpRes.message || `✅ พบรหัส OTP 6 หลัก (${otpRes.otpCode}) จาก SmailPro`
              }), 3000);
              console.log(`[AuthSync] 📨 ${profile.name}: ดึงรหัส OTP 6 หลัก (${otpRes.otpCode}) จาก SmailPro "${cur.username}" -> ส่งเข้าเกมอัตโนมัติ`);
            } else if (otpRes.message) {
              await evalProfilePort(profile.debugPort, pushJs({ outlookStatusMsg: otpRes.message }), 2500).catch(() => {});
            }
            scheduleReadyWakeup(profile.id, nowFn() + 2800);
            return;
          }
        } else if (/@(outlook|hotmail|live)\.com$/i.test(cur.username || '')) {
          const otpRes = await callClientOutlookFlow(profile.debugPort, {
            action: 'poll-otp',
            username: cur.username || cred.username,
            password: cur.password || cred.password,
            rejectedCode: cur.lastRejectedOtpCode || ''
          });
          if (otpRes && !otpRes.unavailable) {
            if (otpRes.status === 'otp_found' && otpRes.otpCode) {
              await evalProfilePort(profile.debugPort, pushJs({
                otpCode: otpRes.otpCode,
                outlookStatusMsg: otpRes.message || `✅ พบรหัส OTP 6 หลัก (${otpRes.otpCode})`
              }), 3000);
              console.log(`[AuthSync] 📨 ${profile.name}: ดึงรหัส OTP 6 หลัก (${otpRes.otpCode}) จากเมล Outlook "${cur.username}" -> ส่งเข้าเกมอัตโนมัติ`);
            } else if (otpRes.message) {
              await evalProfilePort(profile.debugPort, pushJs({ outlookStatusMsg: otpRes.message }), 2500).catch(() => {});
            }
            scheduleReadyWakeup(profile.id, nowFn() + 2800);
            return;
          }
        }
      }
      if (!proxyAvailable && cur.register && (cur.outlookReady || !/@outlook\.com$/i.test(cur.username || ''))) {
        if (cur.username) {
          const cred = getCandidateCreds(profile);
          if (cur.username !== cred.username) cred.username = cur.username;
        }
        if (cur.awaitingEmailOtp) {
          scheduleReadyWakeup(profile.id, nowFn() + 3000);
        }
        return;
      }
      if (!proxyAvailable && cur.registerError) {
        if (cur.registerQueueWaiting) {
          await evalProfilePort(profile.debugPort, pushQueueOverlayJs(null), 2000);
          lastPushedQueueDigest.delete(profile.id);
        }
        updateProfile(profile.id, { autoRegister: false, registerError: cur.registerError });
        return;
      }
      if (cur.registerQueueForceNow) {
        forceBypassQueueIds.add(profile.id);
      }
      if (cur.registerQueueDismissed && !forceBypassQueueIds.has(profile.id)) {
        return;
      }

      // Gate both Proxy and Direct Browser Auto-Register through the staggered Wave Queue (1–3 / random 1–30m)
      const access = requestRegisterWaveAccess(profile, allProfiles);
      if (!access.allowed) {
        const overlayPayload = {
          waiting: true,
          startingSoon: Boolean(access.startingSoon),
          position: access.position || 1,
          totalWaiting: access.totalWaiting || 1,
          waveSlot: access.waveSlot || 1,
          waveTargetSize: access.waveTargetSize || 1,
          readyAt: access.readyAt || 0,
          nextWaveAt: access.nextWaveAt || 0,
          minBatchSize,
          maxBatchSize,
          minCooldownMin: Math.max(1, Math.round(minCooldownMs / 60000)),
          maxCooldownMin: Math.max(1, Math.round(maxCooldownMs / 60000))
        };
        const digest = JSON.stringify(overlayPayload);
        if (!cur.registerQueueWaiting || lastPushedQueueDigest.get(profile.id) !== digest) {
          const ovRes = await evalProfilePort(profile.debugPort, pushQueueOverlayJs(overlayPayload), 2500);
          if (ovRes?.success) {
            lastPushedQueueDigest.set(profile.id, digest);
          }
        }
        if (access.startingSoon && access.readyAt) {
          scheduleReadyWakeup(profile.id, access.readyAt);
        }
        return;
      }
      lastPushedQueueDigest.delete(profile.id);

      // If Proxy is enabled and not in browser fallback, use proxy registration (even if cur.register was previously set)
      if (proxyAvailable) {
        await syncProxyRegistration(profile, { clientOnline: true });
        return;
      }

      // If per-screen proxy (แยก IP) is enabled, guarantee this screen has an active proxy lease
      // AND is running inside an isolated proxy BrowserContext BEFORE sending the register command (Fail-Closed).
      let screenProxyRegisterIp = '';
      if (typeof isScreenProxyEnabled === 'function' && isScreenProxyEnabled() && typeof ensureScreenProxyForRegister === 'function') {
        const pxReady = await ensureScreenProxyForRegister(profile);
        if (!pxReady || !pxReady.ok) {
          const errMsg = '🛡️ รอจับคู่ Proxy แยกจอก่อนสมัครไอดี: ' + (pxReady?.error || 'ไม่มี Proxy ว่าง');
          if (profile.registerError !== errMsg) {
            updateProfile(profile.id, { registerError: errMsg });
          }
          console.warn(`[AuthSync] 🛡️ ${profile.name}: บล็อคการสมัครผ่านเน็ตบ้าน (${pxReady?.error || 'proxy not ready'})`);
          return;
        }
        if (pxReady.migrated) {
          console.log(`[AuthSync] 🛡️🔄 ${profile.name}: ย้ายหน้าต่างเข้าช่องทาง Proxy แยกจอ (${pxReady.ip || 'assigned'}) เรียบร้อย — รอรอบถัดไปเพื่อส่งคำสั่งสมัคร`);
          return;
        }
        if (pxReady.proxied && pxReady.ip) {
          screenProxyRegisterIp = String(pxReady.ip);
        }
      }

      let cred = getCandidateCreds(profile);
      const isSmailProMode = Boolean(smailproService && smailproService.getMode() === 'smailpro');
      if (isSmailProMode && (!cred.isSmailPro || !cred.outlookReady)) {
        try {
          await callClientOutlookFlow(profile.debugPort, { action: 'close-tab' }, 2000).catch(() => {});
          const alloc = await smailproService.allocateUniqueSmailProEmail({
            profileId: profile.id,
            profileName: profile.name || profile.id,
            password: cred.password,
            charName: profile.charName || cred.charName || '',
            serverName: profile.serverName || '',
            existingSet: existingAccounts()
          });
          if (alloc && alloc.email) {
            cred.username = alloc.email;
            cred.isSmailPro = true;
            cred.smailproFamily = alloc.providerFamily || 'auto';
            cred.outlookReady = true;
            pendingCreds.set(profile.id, cred);
            credentials.setPassword(profile.id, cred.password);
            updateProfile(profile.id, {
              account: cred.username,
              email: cred.username,
              generatedAccount: true,
              outlookCreated: true,
              registerError: '',
              lastAuthSyncPushAt: Date.now()
            });
          }
        } catch (err) {
          const errMsg = `⚠️ SmailPro: ${err.message}`;
          await evalProfilePort(profile.debugPort, pushJs({
            outlookStatusMsg: errMsg
          }), 3500).catch(() => {});
          scheduleReadyWakeup(profile.id, nowFn() + 4500);
          return;
        }
      } else if (!isSmailProMode && /@outlook\.com$/i.test(cred.username) && !cred.outlookReady && !cur.outlookReady) {
        let olRes = await callClientOutlookFlow(profile.debugPort, {
          action: 'ensure-signup',
          username: cred.username,
          password: cred.password,
          firstName: cred.firstName,
          lastName: cred.lastName,
          birthDay: cred.birthDay,
          birthMonth: cred.birthMonth,
          birthYear: cred.birthYear
        });
        if (olRes && !olRes.unavailable && !olRes.timeout) {
          if (olRes.status === 'email_taken') {
            cred = rotateCandidateUser(profile);
            console.log(`[AuthSync] ♻️ ${profile.name}: อีเมล Outlook ซ้ำ -> สุ่มอีเมลใหม่เป็น "${cred.username}"`);
            olRes = await callClientOutlookFlow(profile.debugPort, {
              action: 'ensure-signup',
              username: cred.username,
              password: cred.password,
              firstName: cred.firstName,
              lastName: cred.lastName,
              birthDay: cred.birthDay,
              birthMonth: cred.birthMonth,
              birthYear: cred.birthYear
            });
          }
          if (olRes?.status === 'ready') {
            cred.outlookReady = true;
            credentials.setPassword(profile.id, cred.password);
            updateProfile(profile.id, {
              account: cred.username,
              email: cred.username,
              generatedAccount: true,
              outlookCreated: true,
              registerError: '',
              lastAuthSyncPushAt: Date.now()
            });
            console.log(`[AuthSync] 📧✅ ${profile.name}: สมัครเมล Outlook "${cred.username}" ใน Client สำเร็จแล้ว -> กำลังสมัคร/ล็อกอินเข้าเกม...`);
          } else {
            await evalProfilePort(profile.debugPort, pushJs({
              enabled: true,
              autoResumeBot: Boolean(profile.autoResumeBot),
              username: cred.username,
              password: cred.password,
              serverName: profile.serverName || '',
              charName: profile.charName || cred.charName || '',
              register: true,
              registerDone: false,
              outlookReady: false,
              outlookStatusMsg: olRes?.message || `📧 กำลังสมัครเมล ${cred.username} ในแท็บ Outlook...`,
              autoCreateChar: true,
              generatedUser: !!cred.generatedUser
            }), 3500).catch(() => {});
            scheduleReadyWakeup(profile.id, nowFn() + 2200);
            return;
          }
        } else {
          scheduleReadyWakeup(profile.id, nowFn() + 2500);
          return;
        }
      }

      const pushRes = await evalProfilePort(profile.debugPort, pushJs({
        enabled: true, autoResumeBot: Boolean(profile.autoResumeBot), username: cred.username, email: cred.username, password: cred.password,
        serverName: profile.serverName || '', charName: profile.charName || cred.charName || '',
        register: true, registerDone: false, outlookReady: true, autoCreateChar: true, generatedUser: !!cred.generatedUser,
        ...(identityChangedAt > 0 ? { forceResetAuth: true } : {})
      }), 4500);
      if (pushRes?.success && pushRes.result?.abortedByUserCreds && pushRes.result.username && pushRes.result.password) {
        credentials.setPassword(profile.id, pushRes.result.password);
        updateProfile(profile.id, {
          account: pushRes.result.username,
          autoRegister: false,
          generatedAccount: false,
          registerError: '',
          loginSyncPending: false,
          lastAuthSyncPushAt: Date.now()
        });
        pendingCreds.delete(profile.id);
        console.log(`[AuthSync] 🛡️ ${profile.name}: ยกเลิกการสร้างไอดีใหม่ เพราะพบไอดีผู้ใช้ "${pushRes.result.username}" ในเมนูบอท`);
        return;
      }
      if (pushRes?.success && pushRes.result?.success === true) {
        updateProfile(profile.id, {
          ...(profile.registerError && profile.registerError.startsWith('🛡️') ? { registerError: '' } : {}),
          lastAuthSyncPushAt: Date.now()
        });
        console.log(`[AuthSync] ${screenProxyRegisterIp ? '🛡️📝' : '📝'} ${profile.name}: ส่งคำสั่งสมัครบัญชี "${cred.username}" ไปที่จอ${screenProxyRegisterIp ? ` (ผ่าน Proxy แยกจอ ${screenProxyRegisterIp})` : ''}`);
      }
      return;
    }

    if (cur.registerQueueWaiting) {
      await evalProfilePort(profile.debugPort, pushQueueOverlayJs(null), 2000);
      lastPushedQueueDigest.delete(profile.id);
    }

    // If profile.account was stored without @gmail.com (or with different casing) while the client has normalized it, silently adopt the normalized email
    if (profile.account && cur.username && isSameAccountId(cur.username, profile.account) && profile.account !== cur.username && cur.username.includes('@')) {
      updateProfile(profile.id, { account: cur.username });
      profile.account = cur.username;
    }

    // Auto-populate `profile.email` (`📧 อีเมลยืนยัน / SmailPro Email`) when empty:
    // 1) From profile.account or liveAccountEmail if it's already a full email
    // 2) From SmailPro Cloud History / Registry matching the game's masked verified email (`te•••@outlook.com` -> `terrychavez6376+m1ur0@outlook.com`)!
    if (!profile.email) {
      let autoDetectedEmail = '';
      if (profile.account && String(profile.account).includes('@')) {
        autoDetectedEmail = String(profile.account).trim().toLowerCase();
      } else if (cur.liveAccountEmail && String(cur.liveAccountEmail).includes('@')) {
        autoDetectedEmail = String(cur.liveAccountEmail).trim().toLowerCase();
      } else if (cur.email && String(cur.email).includes('@')) {
        autoDetectedEmail = String(cur.email).trim().toLowerCase();
      } else if (cur.verifyMaskedEmail && smailproService && typeof smailproService.findEmailByMaskOrHistory === 'function') {
        autoDetectedEmail = await smailproService.findEmailByMaskOrHistory(cur.verifyMaskedEmail, profile.id).catch(() => '');
      }
      if (autoDetectedEmail && autoDetectedEmail.includes('@')) {
        updateProfile(profile.id, { email: autoDetectedEmail });
        profile.email = autoDetectedEmail;
        await evalProfilePort(profile.debugPort, pushJs({ email: autoDetectedEmail }), 2000).catch(() => {});
        console.log(`[AuthSync] 📧🔍 ${profile.name}: ซิงก์อีเมลยืนยัน "${autoDetectedEmail}" เข้าช่อง 📧 อีเมลยืนยัน ในโปรไฟล์อัตโนมัติ`);
      }
    }

    // Handle 6-digit Email OTP verification across ALL 3 places:
    // 1) In-Game World `ยืนยันอีเมล เหลือ 2 วัน 23 ชม.` window (#sq [data-sq="verify"] / NC.OnlineVerify)
    // 2) Sign-In Overdue Email Verification modal (.cs-modal.cs-verify)
    // 3) Sign-Up Email OTP step (NC.OnlineLobby.codeSent)
    let activeEmailForOtp = String(profile.email || cur.email || cur.username || profile.account || '').trim();
    if (cur.awaitingEmailOtp && !activeEmailForOtp.includes('@') && cur.verifyMaskedEmail && smailproService && typeof smailproService.findEmailByMaskOrHistory === 'function') {
      const matched = await smailproService.findEmailByMaskOrHistory(cur.verifyMaskedEmail, profile.id).catch(() => '');
      if (matched && matched.includes('@')) {
        activeEmailForOtp = matched;
        updateProfile(profile.id, { email: matched });
        profile.email = matched;
      }
    }
    if (cur.awaitingEmailOtp && activeEmailForOtp.includes('@')) {
      const useSmailProOtp = Boolean(
        smailproService &&
        (smailproService.getMode() === 'smailpro' || !/@(outlook|hotmail|live)\.com$/i.test(activeEmailForOtp))
      );
      if (useSmailProOtp) {
        const otpRes = await smailproService.pollOtp({
          profileId: profile.id,
          email: activeEmailForOtp,
          rejectedCode: cur.lastRejectedOtpCode || ''
        });
        if (otpRes) {
          if (otpRes.status === 'otp_found' && otpRes.otpCode) {
            await evalProfilePort(profile.debugPort, pushJs({
              otpCode: otpRes.otpCode,
              outlookStatusMsg: otpRes.message || `✅ พบรหัส OTP 6 หลัก (${otpRes.otpCode}) จาก SmailPro`
            }), 3000);
            console.log(`[AuthSync] 📨 ${profile.name}: ดึงรหัส OTP 6 หลัก (${otpRes.otpCode}) จาก SmailPro "${activeEmailForOtp}" -> ยืนยันอีเมลในเกมอัตโนมัติ`);
          }
          scheduleReadyWakeup(profile.id, nowFn() + 2800);
        }
      } else if (/@(outlook|hotmail|live)\.com$/i.test(activeEmailForOtp)) {
        const otpRes = await callClientOutlookFlow(profile.debugPort, {
          action: 'poll-otp',
          username: activeEmailForOtp,
          password: cur.password || pw(profile),
          rejectedCode: cur.lastRejectedOtpCode || ''
        });
        if (otpRes && !otpRes.unavailable) {
          if (otpRes.status === 'otp_found' && otpRes.otpCode) {
            await evalProfilePort(profile.debugPort, pushJs({
              otpCode: otpRes.otpCode,
              outlookStatusMsg: otpRes.message || `✅ พบรหัส OTP 6 หลัก (${otpRes.otpCode})`
            }), 3000);
            console.log(`[AuthSync] 📨 ${profile.name}: ดึงรหัส OTP 6 หลัก (${otpRes.otpCode}) จากเมล Outlook "${activeEmailForOtp}" -> ยืนยันอีเมลในเกมอัตโนมัติ`);
          }
          scheduleReadyWakeup(profile.id, nowFn() + 2800);
        }
      }
      if (cur.register && !cur.registerDone && !cur.registerError) {
        return;
      }
    }

    if (profile.account && isSameAccountId(cur.username, profile.account) && cur.register && !cur.registerDone && !cur.registerError) {
      return;
    }

    // If the user explicitly edited the target character name inside the in-game Bot HUD, adopt it into profile.charName!
    // NEVER overwrite profile.charName with the currently logged-in character or Slot #1 (multi-char accounts must keep user's chosen charName!).
    const clientCharEditedNewer = Number(cur.charEditedAt) > (Number(profile.lastAuthSyncPushAt) || 0);
    if (profile.account && isSameAccountId(cur.username, profile.account)) {
      if (clientCharEditedNewer && cur.charNameCfg !== (profile.charName || '')) {
        const cleanCfgChar = (!cur.charNameCfg || !isPlaceholderCharName(cur.charNameCfg)) ? cur.charNameCfg : '';
        updateProfile(profile.id, { charName: cleanCfgChar, lastAuthSyncPushAt: Date.now() });
        profile.charName = cleanCfgChar;
        profile.lastAuthSyncPushAt = Date.now();
      }
      if (cur.inWorld && cur.charName && !isPlaceholderCharName(cur.charName) && profile.lastCharName !== cur.charName) {
        updateProfile(profile.id, { lastCharName: cur.charName });
        profile.lastCharName = cur.charName;
      }
    }

    // If user toggled Auto-Login / Auto-Resume checkbox inside the in-game Bot HUD, adopt their toggle into the Manager profile
    const toggleTs = Number(cur.userToggledAt) || 0;
    const isClientToggleNewer = toggleTs > (Number(profile.lastAuthSyncPushAt) || 0);
    if (isClientToggleNewer && (cur.enabled !== (profile.autoLoginEnabled !== false) || Boolean(cur.autoResumeBot) !== Boolean(profile.autoResumeBot))) {
      updateProfile(profile.id, {
        autoLoginEnabled: Boolean(cur.enabled),
        autoResumeBot: Boolean(cur.autoResumeBot),
        lastAuthSyncPushAt: toggleTs
      });
      profile.autoLoginEnabled = Boolean(cur.enabled);
      profile.autoResumeBot = Boolean(cur.autoResumeBot);
      profile.lastAuthSyncPushAt = toggleTs;
    }

    // If user explicitly changed Server inside the in-game Bot HUD, adopt it into profile.serverName even while in-world
    if (Number(cur.serverEditedAt) > (Number(profile.lastAuthSyncPushAt) || 0) && String(cur.serverName || '').trim() !== String(profile.serverName || '').trim()) {
      const nextSrv = String(cur.serverName || '').trim();
      const tsNow = Date.now();
      updateProfile(profile.id, { serverName: nextSrv, lastAuthSyncPushAt: tsNow });
      profile.serverName = nextSrv;
      profile.lastAuthSyncPushAt = tsNow;
    }

    // CRITICAL: If the client is already actively inside the game world (`cur.inWorld === true`) and Manager does NOT have an explicit user-triggered `loginSyncPending`,
    // NEVER push credential overwrites that could disrupt or log out an active in-game session!
    // (When on the Character Select screen, `!cur.inWorld` lets Manager push a newly chosen target `charName` without logging out.)
    const isActuallyInWorld = cur.inWorld !== undefined ? Boolean(cur.inWorld) : Boolean(cur.inGame);
    if (isActuallyInWorld && !profile.loginSyncPending && isSameAccountId(cur.username, profile.account)) {
      return;
    }

    // Only push Manager credentials to the client when Manager actually has both account and password
    if (profile.account && pw(profile) && (
      profile.loginSyncPending ||
      !isSameAccountId(cur.username, profile.account) ||
      cur.password !== pw(profile) ||
      (profile.serverName !== undefined && cur.serverName !== (profile.serverName || '')) ||
      (!clientCharEditedNewer && profile.charName !== undefined && Boolean(profile.charName) && cur.charNameCfg !== profile.charName) ||
      (!cur.userToggledAt && cur.enabled !== false && profile.autoLoginEnabled !== undefined && cur.enabled !== (profile.autoLoginEnabled !== false)) ||
      (profile.autoResumeBot !== undefined && cur.autoResumeBot !== Boolean(profile.autoResumeBot))
    )) {
      // If per-screen proxy is enabled and we are pushing new credentials (which may auto-switch to signup if account is new),
      // ensure the screen is running in its isolated proxy BrowserContext first so signup/login never leaks Home IP.
      if (profile.loginSyncPending && typeof isScreenProxyEnabled === 'function' && isScreenProxyEnabled() && typeof ensureScreenProxyForRegister === 'function') {
        const pxReady = await ensureScreenProxyForRegister(profile);
        if (!pxReady || !pxReady.ok || pxReady.migrated) {
          return;
        }
      }
      const delivered = await evalProfilePort(profile.debugPort, pushJs({
        enabled: profile.autoLoginEnabled !== false,
        preserveUserToggle: !profile.loginSyncPending,
        username: profile.account,
        email: profile.email || (String(profile.account || '').includes('@') ? profile.account : ''),
        password: pw(profile),
        serverName: profile.serverName || '',
        ...(!clientCharEditedNewer && profile.charName ? { charName: profile.charName, charEditedAt: 0 } : {}),
        autoResumeBot: Boolean(profile.autoResumeBot),
        register: false,
        generatedUser: !!profile.generatedAccount,
        ...(profile.loginSyncPending ? { ...(profile.proxyRegistrationState === 'done' ? { registerDone: true } : { registerDone: false }), autoCreateChar: true } : {})
      }), 3000);
      if (delivered?.success && delivered.result?.success === true) {
        updateProfile(profile.id, { loginSyncPending: false, registerError: '', lastAuthSyncPushAt: Date.now() });
      }
    }
  }

  function resetProxyFallback() {
    const profiles = loadProfiles();
    let changed = false;
    for (const p of profiles) {
      if (p.autoRegister && (p.proxyFallbackBrowser || p.proxyRegistrationState === 'known-rejected' || p.proxyRegistrationState === 'review-required' || p.proxyRegistrationState === 'retry-pending')) {
        delete p.proxyFallbackBrowser;
        delete p.proxyRegistrationState;
        if (p.registerError && (p.registerError.includes('Proxy') || p.registerError.includes('เปลี่ยนไปสมัครผ่านหน้าเกมแทน') || p.registerError.includes('รายการสมัครยังรอตรวจสอบ'))) {
          p.registerError = '';
        }
        changed = true;
      }
    }
    if (changed) saveProfiles(profiles);
  }

  let running = false;
  async function tick() {
    if (running) return;
    running = true;
    try {
      const profiles = loadProfiles().slice().sort((a, b) => {
        const prioA = (a.autoRegister || a.loginSyncPending) ? 0 : 1;
        const prioB = (b.autoRegister || b.loginSyncPending) ? 0 : 1;
        return prioA - prioB;
      });
      for (const p of profiles) {
        try { await syncOne(p); } catch (e) {}
      }
    } finally {
      running = false;
    }
  }

  function resetProfileRegistration(profileId) {
    if (!profileId) return;
    pendingCreds.delete(profileId);
    lastPushedQueueDigest.delete(profileId);
    forceBypassQueueIds.delete(profileId);
    waveState.admitted.delete(profileId);
    const qIdx = waveState.queueOrder.indexOf(profileId);
    if (qIdx !== -1) waveState.queueOrder.splice(qIdx, 1);
    const timer = scheduledReadyTimers.get(profileId);
    if (timer) {
      clearTimeout(timer);
      scheduledReadyTimers.delete(profileId);
    }
  }

  async function forceRegisterNow(profileId) {
    const pid = String(profileId || '').trim();
    if (!pid) return { success: false, error: 'Missing profileId' };
    forceBypassQueueIds.add(pid);
    lastPushedQueueDigest.delete(pid);
    const now = nowFn();
    const qIdx = waveState.queueOrder.indexOf(pid);
    if (qIdx !== -1) waveState.queueOrder.splice(qIdx, 1);
    waveState.admitted.set(pid, {
      slotIndex: waveState.admitted.size,
      admittedAt: now,
      readyAt: 0,
      completedAt: 0,
      timedOut: false,
      forced: true
    });
    const timer = scheduledReadyTimers.get(pid);
    if (timer) {
      clearTimeout(timer);
      scheduledReadyTimers.delete(pid);
    }
    const profiles = (typeof loadProfiles === 'function' ? loadProfiles() : []) || [];
    const profile = profiles.find(p => p && p.id === pid);
    if (!profile) return { success: false, error: 'Profile not found' };
    if (!profile.autoRegister && !pw(profile)) {
      updateProfile(pid, { autoRegister: true, registerError: '' });
      profile.autoRegister = true;
    }
    if (profile.debugPort) {
      await evalProfilePort(profile.debugPort, `(() => {
        window.__pmForceRegisterNow = true;
        window.__pmRegisterQueueDismissedUntil = 0;
        if (typeof window.__setPmRegisterQueueOverlay === 'function') {
          window.__setPmRegisterQueueOverlay(null);
        } else {
          const old = document.getElementById('pm-register-queue-overlay');
          if (old) old.remove();
        }
        return { success: true };
      })()`, 2500).catch(() => {});
      setImmediate(() => syncOne(profile).catch(() => {}));
    }
    console.log(`[AuthSync] ⚡ ลัดคิวสมัครไอดีทันที (ไม่ต้องรอคิว): ${profile.name || pid}`);
    return { success: true, profileId: pid, profileName: profile.name || pid };
  }

  function start() {
    if (proxyRegister?.isEnabled?.()) {
      try { resetProxyFallback(); } catch (_) {}
    }
    setTimeout(() => { tick(); setInterval(tick, SYNC_MS); }, 8000);
  }

  function resetAllPendingRegistrations() {
    pendingCreds.clear();
    forceBypassQueueIds.clear();
  }

  return { start, tick, syncOne, forceRegisterNow, resetProxyFallback, resetProfileRegistration, resetAllPendingRegistrations, getRegisterQueueSnapshot };
}

module.exports = { createAuthSync, genUserId, genPassword, genCharName, isPlaceholderCharName };
