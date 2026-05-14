/** @typedef {'en' | 'he'} Locale */

const STORAGE_KEY = "multiplication-memory-locale";

/** @type {Locale} */
let currentLocale = "en";

/** @type {Record<Locale, Record<string, string>>} */
const messages = {
  en: {
    pageTitleMath: "Multiplication memory",
    pageTitleEnglish: "English memory",
    pageTitleFractions: "Fraction memory",
    titleMath: "Multiplication memory",
    titleEnglish: "English memory",
    titleFractions: "Fraction memory",
    taglineMath: "Match each product with its expression.",
    taglineEnglish: "Match each picture to its English word.",
    taglineFractions: "Match each fraction to its pie picture.",
    pairs: "Pairs",
    englishLevel: "English level",
    englishLevelEasy: "Easy — voice on all cards, 6 pairs",
    englishLevelMedium: "Medium — voice on word cards only, 6 pairs",
    englishLevelHard: "Hard — no voice, 9 pairs",
    tables: "Tables",
    tablesAsDenominator: "Up to denominator",
    language: "Language",
    settings: "Settings",
    ariaSettings: "Open settings menu",
    gameType: "Game",
    modeMath: "Multiplication",
    modeEnglish: "English",
    modeFractions: "Fractions",
    newGame: "New game",
    moves: "Moves",
    matches: "Matches",
    time: "Time",
    winMath: "You cleared the board. Nice work.",
    winEnglish: "You matched all the words. Great job.",
    winFractions: "You matched every fraction. Well done.",
    ariaPairs: "Number of pairs",
    ariaEnglishLevel: "English difficulty",
    ariaTables: "Highest times table",
    ariaDenominator: "Largest denominator for fractions",
    ariaBoard: "Memory cards",
    ariaHiddenCard: "Hidden card",
    ariaPictureCard: "Picture: {{word}}",
    ariaFractionPie: "Pie chart: {{word}}",
    ariaMatched: "Matched: {{label}}",
    ariaMatchedUnknown: "Matched",
    tablesRange5: "1–5",
    tablesRange9: "1–9",
    tablesRange12: "1–12",
    records: "Records",
    recordsTitle: "Your records",
    recordsClose: "Close",
    recordsBestTime: "Best time (this device)",
    recordsWon: "Games won",
    recordsPlayed: "Games played",
    recordsMath: "Multiplication",
    recordsEnglish: "English",
    recordsFractions: "Fractions",
    ariaGameMode: "Game type",
    ariaRecords: "View your records",
    userPlayingAs: "Player",
    ariaUserMenu: "Choose or switch player",
    adminOverview: "Admin",
    ariaAdmin: "View all players on this device",
    userDialogTitle: "Choose who is playing",
    userDialogLead: "Each name keeps its own scores on this device only.",
    userStepPickTitle: "Step 1 — Pick a player",
    userStepPickHint: "Tap a name in the list. The highlighted row is who will play after you press Continue.",
    userStepAddTitle: "Step 2 — Or add someone new",
    userStepAddHint:
      "Type a new name (2–32 characters), then tap Add player. Names must be different from anyone already in the list.",
    labelNewUser: "New name",
    addUser: "Add player",
    userContinue: "Continue",
    userErrorDuplicateName: "That name is already in the list. Choose it above, or type a different name.",
    userErrorLengthName: "Names must be between 2 and 32 characters.",
    userErrorLastPlayer: "You need at least one player on this device.",
    userCloudSaving: "Saving…",
    userErrorCloudSync:
      "Could not reach the cloud: {{detail}}. Check your connection and try again. If this persists, the app may be missing Supabase keys in its build.",
    ariaDeletePlayer: "Remove player {{name}}",
    adminDialogTitle: "Admin — all players on this device",
    adminDialogHint: "Best times and games are stored only in this browser.",
    adminDialogHintCloud:
      "This table loads every player row synced to your Supabase project from any phone or browser using the same URL and keys.",
    adminColUser: "Player",
    adminColDevice: "Device",
    adminColLast: "Last active",
    adminColGames: "Games total",
    adminColMath: "Math best",
    adminColEng: "English best",
    adminColFrac: "Fractions best",
    adminNever: "—",
    adminLoadingCloud: "Loading from cloud…",
    adminCloudEmpty: "No cloud rows yet. Finish a game on a device with sync configured, then open Admin again.",
    adminCloudError: "Could not load cloud data: {{message}}",
    closeAdmin: "Close",
    adminUnlockTitle: "Admin password",
    adminUnlockHint: "Enter the admin password for this device.",
    labelAdminPassword: "Password",
    adminUnlockCancel: "Cancel",
    adminUnlockSubmit: "Unlock",
    adminBadPassword: "Wrong password. Try again.",
    emailRecords: "Show off",
    ariaEmailRecords: "Open email with your scores to show a friend",
    emailRecordsSubject: "My memory game records",
    emailRecordsIntro: "Here are my scores from the memory games (this device) for {{name}}:",
  },
  he: {
    pageTitleMath: "זיכרון הכפל",
    pageTitleEnglish: "זיכרון אנגלית",
    pageTitleFractions: "זיכרון שברים",
    titleMath: "זיכרון הכפל",
    titleEnglish: "זיכרון אנגלית",
    titleFractions: "זיכרון שברים",
    taglineMath: "התאימו כל מכפלה לתוצאה שלה.",
    taglineEnglish: "התאימו כל תמונה למילה באנגלית.",
    taglineFractions: "התאימו כל שבר לתמונת העוגה שלו.",
    pairs: "זוגות",
    englishLevel: "רמת אנגלית",
    englishLevelEasy: "קל — קול בכל הכרטיסים, 6 זוגות",
    englishLevelMedium: "בינוני — קול רק בכרטיסי המילה, 6 זוגות",
    englishLevelHard: "קשה — בלי קול, 9 זוגות",
    tables: "טבלאות",
    tablesAsDenominator: "עד מכנה",
    language: "שפה",
    settings: "הגדרות",
    ariaSettings: "פתיחת תפריט הגדרות",
    gameType: "משחק",
    modeMath: "כפל",
    modeEnglish: "אנגלית",
    modeFractions: "שברים",
    newGame: "משחק חדש",
    moves: "מהלכים",
    matches: "התאמות",
    time: "זמן",
    winMath: "ניקיתם את הלוח. כל הכבוד!",
    winEnglish: "התאמתם את כל המילים. כל הכבוד!",
    winFractions: "התאמתם את כל השברים. כל הכבוד!",
    ariaPairs: "מספר זוגות",
    ariaEnglishLevel: "רמת קושי באנגלית",
    ariaTables: "עד איזו טבלת כפל",
    ariaDenominator: "המכנה הגדול ביותר לשברים",
    ariaBoard: "כרטיסי זיכרון",
    ariaHiddenCard: "כרטיס סגור",
    ariaPictureCard: "תמונה: {{word}}",
    ariaFractionPie: "תרשים עוגה: {{word}}",
    ariaMatched: "הותאם: {{label}}",
    ariaMatchedUnknown: "הותאם",
    tablesRange5: "1–5",
    tablesRange9: "1–9",
    tablesRange12: "1–12",
    records: "שיאים",
    recordsTitle: "השיאים שלך",
    recordsClose: "סגור",
    recordsBestTime: "זמן שיא (במכשיר זה)",
    recordsWon: "ניצחונות",
    recordsPlayed: "משחקים ששוחקו",
    recordsMath: "כפל",
    recordsEnglish: "אנגלית",
    recordsFractions: "שברים",
    ariaGameMode: "סוג משחק",
    ariaRecords: "הצגת שיאים",
    userPlayingAs: "שחקן",
    ariaUserMenu: "בחירה או החלפת שחקן",
    adminOverview: "ניהול",
    ariaAdmin: "צפייה בכל השחקנים במכשיר",
    userDialogTitle: "בחרו מי משחק",
    userDialogLead: "לכל שם יש שיאים נפרדים רק במכשיר הזה.",
    userStepPickTitle: "שלב 1 — בחירת שחקן",
    userStepPickHint: "לחצו על שם מהרשימה. השורה המודגשת היא מי שישחק אחרי לחיצה על המשך.",
    userStepAddTitle: "שלב 2 — או הוספת שחקן חדש",
    userStepAddHint:
      "הקלידו שם חדש (2–32 תווים), ואז לחצו על הוספת שחקן. אי אפשר להשתמש בשם שכבר קיים ברשימה.",
    labelNewUser: "שם חדש",
    addUser: "הוספת שחקן",
    userContinue: "המשך",
    userErrorDuplicateName: "השם הזה כבר ברשימה. בחרו אותו למעלה או הקלידו שם אחר.",
    userErrorLengthName: "אורך השם חייב להיות בין 2 ל־32 תווים.",
    userErrorLastPlayer: "חייב להישאר לפחות שחקן אחד במכשיר.",
    userCloudSaving: "שומר…",
    userErrorCloudSync:
      "לא הצלחנו להתחבר לענן: {{detail}}. בדקו חיבור לאינטרנט ונסו שוב. אם זה חוזר, ייתכן שחסרים מפתחות Supabase בבנייה של האפליקציה.",
    ariaDeletePlayer: "הסרת השחקן {{name}}",
    adminDialogTitle: "ניהול — כל השחקנים במכשיר",
    adminDialogHint: "שיאים ומשחקים נשמרים רק בדפדפן הזה.",
    adminDialogHintCloud:
      "הטבלה נטענת מכל השורות שסונכרנו לפרויקט Supabase שלך מכל מכשיר שמשתמש באותו כתובת ומפתחות.",
    adminColUser: "שחקן",
    adminColDevice: "מכשיר",
    adminColLast: "פעילות אחרונה",
    adminColGames: "סה״כ משחקים",
    adminColMath: "שיא כפל",
    adminColEng: "שיא אנגלית",
    adminColFrac: "שיא שברים",
    adminNever: "—",
    adminLoadingCloud: "טוען מהענן…",
    adminCloudEmpty: "אין עדיין נתונים בענן. סיימו משחק במכשיר עם סנכרון, ואז פתחו שוב ניהול.",
    adminCloudError: "לא ניתן לטעון מהענן: {{message}}",
    closeAdmin: "סגור",
    adminUnlockTitle: "סיסמת ניהול",
    adminUnlockHint: "הזינו את סיסמת הניהול של המכשיר הזה.",
    labelAdminPassword: "סיסמה",
    adminUnlockCancel: "ביטול",
    adminUnlockSubmit: "פתיחה",
    adminBadPassword: "סיסמה שגויה. נסו שוב.",
    emailRecords: "התרברות",
    ariaEmailRecords: "פתיחת מייל עם השיאים כדי להתרבר מול חבר",
    emailRecordsSubject: "שיאי משחקי הזיכרון שלי",
    emailRecordsIntro: "אלה הציונים שלי ממשחקי הזיכרון (במכשיר הזה) עבור {{name}}:",
  },
};

function applyDocumentLocale() {
  document.documentElement.lang = currentLocale === "he" ? "he" : "en";
  document.documentElement.dir = currentLocale === "he" ? "rtl" : "ltr";
}

/**
 * @param {string} key
 * @param {Record<string, string | number>} [vars]
 */
export function t(key, vars = {}) {
  const table = messages[currentLocale] ?? messages.en;
  let s = table[key] ?? messages.en[key] ?? key;
  for (const [k, v] of Object.entries(vars)) {
    s = s.split(`{{${k}}}`).join(String(v));
  }
  return s;
}

/** @param {"math" | "english" | "fractions"} mode */
export function setPageTitleForMode(mode) {
  if (mode === "english") document.title = t("pageTitleEnglish");
  else if (mode === "fractions") document.title = t("pageTitleFractions");
  else document.title = t("pageTitleMath");
}

export function getLocale() {
  return currentLocale;
}

/** @returns {Locale} */
export function initLocale() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "en" || stored === "he") {
    currentLocale = stored;
  } else if (typeof navigator !== "undefined") {
    const nav = navigator.language?.toLowerCase() ?? "";
    currentLocale = nav.startsWith("he") ? "he" : "en";
  } else {
    currentLocale = "en";
  }
  applyDocumentLocale();
  return currentLocale;
}

/** @param {Locale} locale */
export function setLocale(locale) {
  if (locale !== "en" && locale !== "he") return;
  currentLocale = locale;
  localStorage.setItem(STORAGE_KEY, locale);
  applyDocumentLocale();
}
