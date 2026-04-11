/**
 * Large pools of Ethiopian given + patronymic-style names (Amhara, Oromia, Tigray,
 * Sidama, SNNPR, Somali Region, Afar, Gambela, Benishangul, Harari, Gurage, etc.),
 * then 6000 deterministic unique "First Father Grandfather" triples — 2000 each for
 * CBE B2B, App Pink, and App Green so every section draws from its own list.
 */

const mulberry32 = (seed: number) => {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Given names — Amhara / Tigrinya / urban */
const FIRST_AMH_TIG = [
  "Tigist", "Selam", "Meron", "Hanna", "Bethel", "Yared", "Dawit", "Alem", "Rahel", "Kidist",
  "Henok", "Birtukan", "Eyerusalem", "Mulu", "Nahom", "Saron", "Liya", "Elias", "Mihret", "Yonas",
  "Mahlet", "Fikir", "Binyam", "Eden", "Kidan", "Samuel", "Marta", "Daniel", "Ruth", "Solomon",
  "Hirut", "Almaz", "Mekdes", "Wondimu", "Eskinder", "Fasika", "Sisay", "Genet", "Tewodros", "Amanuel",
  "Mulugeta", "Rahel", "Yordanos", "Nardos", "Semhal", "Kokob", "Rediet", "Blen", "Mieraf", "Robel",
  "Aster", "Mesfin", "Tsega", "Hiwot", "Selome", "Yemisrach", "Mahder", "Yabsira", "Nebiyu", "Bisrat",
];

/** Oromia — common given names */
const FIRST_OROMO = [
  "Lemma", "Gemechu", "Obsa", "Lelise", "Gutu", "Hunda", "Dejene", "Abdisa", "Gadisa", "Jatani",
  "Biru", "Feyisa", "Tolera", "Lencho", "Dachasa", "Fayisa", "Tadesse", "Bekele", "Jifar", "Kumsa",
  "Megersa", "Regassa", "Tilahun", "Umer", "Wakjira", "Abdata", "Bultum", "Chala", "Dawano", "Ejersa",
  "Fekadu", "Gemeda", "Habtamu", "Ibsa", "Jiregna", "Keno", "Lami", "Mosisa", "Negesso", "Obsi",
  "Raggasa", "Sori", "Tufa", "Urgessa", "Wario", "Yadata", "Zelalem", "Ararsa", "Bonsa", "Dibaba",
];

/** Sidama / SNNPR / Wolayta / Gurage / Hadiya */
const FIRST_SNNPR = [
  "Tariku", "Dureti", "Zelalem", "Mekonnen", "Wondwosen", "Tsegaye", "Aster", "Mekdes", "Fikadu", "Zenebe",
  "Birtukan", "Habtamu", "Mamush", "Desta", "Getachew", "Wolde", "Alemayehu", "Tigabu", "Meseret", "Yonas",
  "Mulu", "Birtukan", "Sintayehu", "Tekalign", "Wassie", "Zafu", "Banchi", "Chuchu", "Dinku", "Emebet",
  "Fikre", "Gedion", "Hirut", "Jember", "Kassa", "Lishan", "Mamo", "Nigusu", "Oljira", "Petros",
];

/** Somali Region / eastern */
const FIRST_SOMALI_AFAR = [
  "Abdirahman", "Ahmed", "Hassan", "Omar", "Yusuf", "Khadija", "Amina", "Fatuma", "Halima", "Sahra",
  "Mohamed", "Ibrahim", "Ismail", "Jamal", "Kamal", "Liban", "Nur", "Said", "Tahir", "Zahra",
];

/** Gambela / Benishangul / Nuer-Anuak area common in Ethiopia */
const FIRST_WEST = [
  "Obang", "Omot", "Gatluak", "Thiang", "Deng", "Kuol", "James", "Peter", "Mark", "John",
  "Sarah", "Rebecca", "Mary", "Elizabeth", "Anna", "Martha", "Ruth", "Lily", "Rose", "Grace",
];

const FIRST_NAMES = [
  ...new Set([
    ...FIRST_AMH_TIG,
    ...FIRST_OROMO,
    ...FIRST_SNNPR,
    ...FIRST_SOMALI_AFAR,
    ...FIRST_WEST,
  ]),
];

/** Father’s / second names — Amhara & Tigrinya */
const FATHER_AMH_TIG = [
  "Tadesse", "Gebre", "Alemayehu", "Mulugeta", "Bekele", "Tesfaye", "Wolde", "Girma", "Haile", "Desta",
  "Assefa", "Kebede", "Negash", "Yohannes", "Mengistu", "Fisseha", "Tekle", "Birhanu", "Adane", "Getachew",
  "Gebremariam", "Gebremedhin", "Gebreyes", "Wondimagegn", "Mekonnen", "Tilahun", "Demissie", "Tsegaye",
  "Hailu", "Worku", "Belay", "Shiferaw", "Dagnachew", "Endale", "Ayalew", "Asnake", "Fikadu", "Zelalem",
  "Solomon", "Daniel", "Samuel", "Yonas", "Henok", "Nahom", "Elias", "Dawit", "Yared", "Binyam",
];

/** Oromia */
const FATHER_OROMO = [
  "Lemma", "Jember", "Tamrat", "Fikadu", "Gashaw", "Muluneh", "Dereje", "Belete", "Wondwosen", "Regassa",
  "Gemechu", "Obsa", "Lencho", "Tufa", "Megersa", "Abdata", "Bultum", "Chala", "Dawano", "Ejersa",
  "Gemeda", "Habtamu", "Ibsa", "Jiregna", "Keno", "Mosisa", "Negesso", "Raggasa", "Sori", "Urgessa",
  "Wario", "Yadata", "Ararsa", "Bonsa", "Dibaba", "Feyisa", "Gutu", "Hunda", "Jatani", "Kumsa",
];

/** SNNPR / Sidama / Gurage */
const FATHER_SNNPR = [
  "Tigabu", "Wassie", "Tekalign", "Sintayehu", "Mamush", "Getachew", "Tsegaye", "Wolde", "Desta", "Zenebe",
  "Birtukan", "Mulu", "Alemayehu", "Mekonnen", "Banchi", "Chuchu", "Dinku", "Fikre", "Gedion", "Kassa",
  "Lishan", "Mamo", "Nigusu", "Petros", "Tadesse", "Wondwosen", "Zafu", "Habtamu", "Jember", "Keno",
];

const FATHER_NAMES = [
  ...new Set([...FATHER_AMH_TIG, ...FATHER_OROMO, ...FATHER_SNNPR]),
];

/** Grandfather / third — Amhara & Tigrinya */
const GRAND_AMH_TIG = [
  "Wolde", "Bekele", "Tesfaye", "Girma", "Haile", "Desta", "Assefa", "Kebede", "Negash", "Yohannes",
  "Mengistu", "Fisseha", "Tekle", "Gebremariam", "Alemu", "Demissie", "Tsegaye", "Hailu", "Worku", "Belay",
  "Gebreyes", "Wondimagegn", "Asnake", "Mekonnen", "Tilahun", "Gebremedhin", "Ayalew", "Shiferaw",
  "Dagnachew", "Endale", "Adane", "Birhanu", "Getachew", "Mulugeta", "Alemayehu", "Tadesse", "Gebre",
  "Fisseha", "Yohannes", "Negash", "Kebede", "Assefa", "Haile", "Girma", "Tesfaye", "Bekele", "Wolde",
];

const GRAND_OROMO = [
  "Regassa", "Tufa", "Megersa", "Gemechu", "Obsa", "Lencho", "Lemma", "Jatani", "Biru", "Feyisa",
  "Tolera", "Dachasa", "Abdisa", "Gadisa", "Wakjira", "Umer", "Bultum", "Chala", "Dawano", "Ejersa",
  "Gemeda", "Habtamu", "Ibsa", "Jiregna", "Keno", "Mosisa", "Negesso", "Raggasa", "Sori", "Urgessa",
  "Wario", "Yadata", "Zelalem", "Ararsa", "Bonsa", "Dibaba", "Fayisa", "Gutu", "Hunda", "Kumsa",
];

const GRAND_SNNPR = [
  "Wassie", "Tigabu", "Tekalign", "Sintayehu", "Mamush", "Zenebe", "Birtukan", "Mulu", "Desta", "Wolde",
  "Tsegaye", "Mekonnen", "Alemayehu", "Banchi", "Chuchu", "Dinku", "Fikre", "Gedion", "Kassa", "Lishan",
  "Mamo", "Nigusu", "Petros", "Tadesse", "Wondwosen", "Zafu", "Habtamu", "Jember", "Getachew", "Fikadu",
];

const GRAND_NAMES = [...new Set([...GRAND_AMH_TIG, ...GRAND_OROMO, ...GRAND_SNNPR])];

const TARGET_PER_APP = 2000;
const TOTAL_UNIQUE = TARGET_PER_APP * 3;

/** First `count` unique triples in stable nested order, then seeded shuffle (fast, deterministic). */
function buildUniqueFullNames(seed: number, count: number): readonly string[] {
  const f = FIRST_NAMES;
  const fa = FATHER_NAMES;
  const g = GRAND_NAMES;
  const out: string[] = [];
  outer: for (const a of f) {
    for (const b of fa) {
      for (const c of g) {
        out.push(`${a} ${b} ${c}`);
        if (out.length >= count) break outer;
      }
    }
  }
  if (out.length < count) {
    throw new Error(`cbe-ethiopian-sender-names: pools too small (got ${out.length}/${count})`);
  }
  const rng = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = out[i]!;
    out[i] = out[j]!;
    out[j] = t;
  }
  return Object.freeze(out);
}

/** 6000 unique triples, shuffled once; split 2000 / 2000 / 2000 for B2B, Pink, Green. */
const ALL_UNIQUE = buildUniqueFullNames(0xcbee2026, TOTAL_UNIQUE);

/** 2000 unique sender names for CBE B2B sample. */
export const UNIQUE_SENDER_NAMES_B2B = ALL_UNIQUE.slice(0, TARGET_PER_APP) as readonly string[];

/** 2000 unique sender names for CBE App Pink sample. */
export const UNIQUE_SENDER_NAMES_PINK = ALL_UNIQUE.slice(TARGET_PER_APP, TARGET_PER_APP * 2) as readonly string[];

/** 2000 unique sender names for CBE App Green sample. */
export const UNIQUE_SENDER_NAMES_GREEN = ALL_UNIQUE.slice(TARGET_PER_APP * 2) as readonly string[];

export function randomSenderNameB2b(): string {
  return UNIQUE_SENDER_NAMES_B2B[Math.floor(Math.random() * UNIQUE_SENDER_NAMES_B2B.length)]!;
}

export function randomSenderNamePink(): string {
  return UNIQUE_SENDER_NAMES_PINK[Math.floor(Math.random() * UNIQUE_SENDER_NAMES_PINK.length)]!;
}

export function randomSenderNameGreen(): string {
  return UNIQUE_SENDER_NAMES_GREEN[Math.floor(Math.random() * UNIQUE_SENDER_NAMES_GREEN.length)]!;
}
