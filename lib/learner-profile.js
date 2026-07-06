/* eslint-disable no-console */

/**
 * ────────────────────────────────────────────────────────────────────────
 *  פרופיל ילד מתומצת — זיכרון אחד משותף לכל המערכת (תרגול + אזור למידה)
 * ────────────────────────────────────────────────────────────────────────
 *
 *  למה זה קיים?
 *  היום המורה מקבל הקשר מ-lib/memory.js שכולל "ציר זמן" של אירועים גולמיים
 *  (כל תרגיל, כל תשובה). ככל שהילד מתרגל יותר — ההקשר תופח, והמורה משלם
 *  טוקנים על הרבה טקסט בכל פנייה. איטי ויקר.
 *
 *  הפתרון: פרופיל *מובנה ומתומצת* — לא טקסט שמצטבר, אלא טבלה קטנה וקבועה
 *  בגודלה: לכל נושא/תת-נושא שורה אחת עם סטטוס ("שולט"/"מתקשה"/...) והערה
 *  קצרה. זה כל מה שהמורה צריך לדעת כדי "לזכור את הילד", וזה נשאר קטן לתמיד.
 *
 *  אותו פרופיל משמש את המורה *בכל מקום באפליקציה* — גם בתרגול וגם באזור
 *  הלמידה — כך שהמורה מלווה את הילד ברציפות (יודע איפה הוא חזק/חלש בכל אזור).
 *
 *  אחסון: data/profiles/<userId>.json  (קובץ אחד לכל ילד).
 *
 *  מבנה הקובץ:
 *  {
 *    "userId": "u-...",
 *    "summary": "משפט-שניים חופשיים על הילד (אופציונלי, נכתב ע\"י ה-AI ברקע)",
 *    "topics": {
 *      "שעון":            { "status": "mastered",  "attempts": 6, "correct": 5, "streak": 3, "wrongStreak": 0, "note": "", "updatedAt": "..." },
 *      "חיבור תרגילים":   { "status": "struggling","attempts": 4, "correct": 1, "streak": 0, "wrongStreak": 2, "note": "מתבלבל במעבר עשרת", "updatedAt": "..." }
 *    },
 *    "updatedAt": "ISO"
 *  }
 */

const path = require("path");
const { DATA_DIR, readJson, writeJson } = require("./store");

const PROFILES_DIR = path.join(DATA_DIR, "profiles");

/* ---------- סטטוסים ---------- */
// מפתחות יציבים באנגלית (לא משתנים), עם תווית עברית לתצוגה/פרומפט.
const STATUS = {
  NOT_STARTED: "not_started",
  IN_PROGRESS: "in_progress",
  STRUGGLING: "struggling",
  MASTERED: "mastered",
};
const STATUS_HE = {
  not_started: "לא התחיל",
  in_progress: "בתהליך",
  struggling: "מתקשה",
  mastered: "שולט",
};
const VALID_STATUSES = new Set(Object.values(STATUS));

/* ---------- אחסון ---------- */
function fileFor(userId) {
  return path.join(PROFILES_DIR, `${String(userId).replace(/[^\w-]/g, "_")}.json`);
}

function emptyProfile(userId) {
  return { userId: userId || null, summary: "", topics: {}, updatedAt: null };
}

function load(userId) {
  if (!userId) return emptyProfile(userId);
  const data = readJson(fileFor(userId), null);
  if (data && data.topics && typeof data.topics === "object") {
    return { userId, summary: data.summary || "", topics: data.topics, updatedAt: data.updatedAt || null };
  }
  return emptyProfile(userId);
}

function save(userId, profile) {
  if (!userId) return;
  profile.userId = userId;
  profile.updatedAt = new Date().toISOString();
  writeJson(fileFor(userId), profile);
}

function emptyTopic() {
  return {
    status: STATUS.NOT_STARTED,
    attempts: 0,
    correct: 0,
    streak: 0, // רצף תשובות נכונות בנושא הזה
    wrongStreak: 0, // רצף טעויות בנושא הזה
    note: "",
    repr: null, // הייצוג שעבד לילד (blocks/number_line/array/...) — "בוא נשתמש שוב בבלוקים שעזרו לך"
    lastSeen: null, // מתי נגענו בנושא לאחרונה
    updatedAt: null,
  };
}

/* ---------- חישוב סטטוס (דטרמיניסטי — בקוד, בלי AI: אמין, מיידי, חינם) ---------- */
/**
 * הסטטוס נגזר מהמספרים, לא מ-AI. כך הוא 100% אמין וזול.
 * הכללים (אפשר לכוונן בהמשך):
 *   - "שולט"   : 3 נכונות ברצף, או ≥4 ניסיונות עם דיוק ≥80%.
 *   - "מתקשה"  : 2 טעויות ברצף, או ≥3 ניסיונות עם דיוק <50%.
 *   - "בתהליך" : התחיל אבל עדיין לא שולט ולא מתקשה.
 *  "שולט" הוא דביק: לא יורד בגלל מעידה אחת — רק אם הילד נכשל שוב ושוב
 *   (2 טעויות ברצף) הוא חוזר ל"מתקשה". ככה המורה "לא מוותר" אבל גם לא נצמד
 *   לסטטוס ישן כשהילד באמת מתחיל להיתקע.
 */
function computeStatus(t, prevStatus) {
  const acc = t.attempts > 0 ? t.correct / t.attempts : 0;

  // "שולט" שמר על עצמו — מורידים רק אם יש הידרדרות ברורה
  if (prevStatus === STATUS.MASTERED) {
    return t.wrongStreak >= 2 ? STATUS.STRUGGLING : STATUS.MASTERED;
  }
  if (t.streak >= 3 || (t.attempts >= 4 && acc >= 0.8)) return STATUS.MASTERED;
  if (t.wrongStreak >= 2 || (t.attempts >= 3 && acc < 0.5)) return STATUS.STRUGGLING;
  return STATUS.IN_PROGRESS;
}

/* ---------- API ציבורי ---------- */

/** מחזיר את הפרופיל המלא (אובייקט) של הילד. */
function get(userId) {
  return load(userId);
}

/**
 * מעדכן את הפרופיל אחרי אינטראקציה משמעותית (תשובה נכונה/שגויה בנושא).
 * נקרא מכל אזור באפליקציה (תרגול/למידה) — זה ה"זיכרון שמתעדכן".
 * דטרמיניסטי לחלוטין: רק סופר ומחשב סטטוס. בלי קריאת AI, בלי לצבור טקסט.
 *
 * @param {string} userId
 * @param {{ topic: string, correct?: boolean|null, note?: string }} ev
 * @returns {object|undefined} רשומת הנושא המעודכנת
 */
function record(userId, ev = {}) {
  const topic = ev.topic && String(ev.topic).trim();
  if (!userId || !topic) return;

  const profile = load(userId);
  const t = profile.topics[topic] || emptyTopic();
  const prevStatus = t.status;

  if (ev.correct === true) {
    t.attempts += 1;
    t.correct += 1;
    t.streak += 1;
    t.wrongStreak = 0;
  } else if (ev.correct === false) {
    t.attempts += 1;
    t.streak = 0;
    t.wrongStreak += 1;
  }
  // correct == null → אינטראקציה בלי בדיקת נכונות (למשל "ביקש הסבר"); רק מסמן שהתחיל
  if (prevStatus === STATUS.NOT_STARTED && t.status === STATUS.NOT_STARTED) {
    t.status = STATUS.IN_PROGRESS;
  }

  if (typeof ev.note === "string" && ev.note.trim()) {
    t.note = ev.note.trim().slice(0, 160);
  }
  // תשובה נכונה עם ייצוג ידוע → זה "הייצוג שעבד" לילד בנושא הזה (המורה יחזור אליו בתקיעה)
  if (ev.correct === true && typeof ev.repr === "string" && ev.repr.trim()) {
    t.repr = ev.repr.trim().slice(0, 40);
  }
  t.lastSeen = new Date().toISOString();

  t.status = computeStatus(t, prevStatus);
  t.updatedAt = new Date().toISOString();

  profile.topics[topic] = t;
  save(userId, profile);
  return t;
}

/**
 * קביעת סטטוס מפורשת — לשימוש המורה (AI) כשהוא מחליט שהילד שולט בתת-נושא
 * וצריך לסמן עליו וי. עוקף את החישוב הדטרמיניסטי.
 */
function setStatus(userId, topic, status, note) {
  if (!userId || !topic || !VALID_STATUSES.has(status)) return;
  const profile = load(userId);
  const t = profile.topics[topic] || emptyTopic();
  t.status = status;
  if (typeof note === "string" && note.trim()) t.note = note.trim().slice(0, 160);
  t.updatedAt = new Date().toISOString();
  profile.topics[topic] = t;
  save(userId, profile);
  return t;
}

/** עדכון משפט-הסיכום החופשי (אופציונלי — נכתב ע"י AI ברקע, לא חוסם). */
function setSummary(userId, summary) {
  if (!userId || typeof summary !== "string") return;
  const profile = load(userId);
  profile.summary = summary.slice(0, 400);
  save(userId, profile);
}

/** רשימת הנושאים שבהם הילד מתקשה — בשביל "המורה לא מוותר" בתרגול בהמשך. */
function weakTopics(userId) {
  const profile = load(userId);
  return Object.entries(profile.topics)
    .filter(([, t]) => t.status === STATUS.STRUGGLING)
    .map(([topic, t]) => ({ topic, note: t.note }));
}

/**
 * רינדור הפרופיל לטקסט קצר בעברית להזרקה לפרומפט של המורה.
 * זהו "החלק הקבוע" שנכנס ל-Prompt Cache (משתנה רק כשהפרופיל מתעדכן) —
 * לכן קצר, יציב, וזול. מחזיר "" אם אין עדיין מידע.
 */
function toPromptText(userId) {
  const profile = load(userId);
  const entries = Object.entries(profile.topics).filter(
    ([, t]) => t.status && t.status !== STATUS.NOT_STARTED
  );
  if (!entries.length && !profile.summary) return "";

  const lines = ["פרופיל הילד (זיכרון מתמשך — מה הוא כבר עבר ואיפה הוא חזק/חלש):"];
  if (profile.summary) lines.push(profile.summary);
  for (const [topic, t] of entries) {
    const he = STATUS_HE[t.status] || t.status;
    const note = t.note ? ` — ${t.note}` : "";
    const repr = t.repr ? ` (הייצוג שעבד לו: ${t.repr})` : "";
    lines.push(`- ${topic}: ${he}${note}${repr}`);
  }
  return lines.join("\n");
}

/* ---------- יומן-שיעורים (שכבה 2): "הפנקס" — מספר-שיעור + מה קרה בשיעורים האחרונים ---------- */
// נפרד מהפרופיל החם כדי לא לנפח את ה-Prompt Cache; נשלף רק בפתיחת שיעור.
const LESSONS_DIR = path.join(DATA_DIR, "lessons");

function lessonsFileFor(userId) {
  return path.join(LESSONS_DIR, `${String(userId).replace(/[^\w-]/g, "_")}.json`);
}

function loadLessons(userId) {
  if (!userId) return { userId: null, lessonNumber: 1, lessons: [] };
  const data = readJson(lessonsFileFor(userId), null);
  if (data && Array.isArray(data.lessons)) {
    const j = { userId, lessonNumber: Math.max(1, +data.lessonNumber || 1), lessons: data.lessons };
    if (data.pendingOpenLoop) j.pendingOpenLoop = data.pendingOpenLoop; // הפנקס-בהמתנה חייב לשרוד את הקריאה
    return j;
  }
  return { userId, lessonNumber: 1, lessons: [] };
}

/** מספר-השיעור הנוכחי של הילד (מתחיל מ-1). */
function currentLessonNumber(userId) {
  return loadLessons(userId).lessonNumber;
}

/** מספר-השיעור של הילד *בנושא הזה* (לבחירת מערך-השיעור): כמה שיעורים כבר סגר בנושא + 1. */
function topicLessonNumber(userId, topic) {
  const t = String(topic || "").trim();
  if (!t) return 1;
  const j = loadLessons(userId);
  return j.lessons.filter((l) => l.topic === t).length + 1;
}

/**
 * פנקס-בהמתנה: המורה רשם באמצע שיעור "מה נשאר פתוח" (remember_note) —
 * נשמר כאן ונצרך אוטומטית לרשומת-היומן כשסוגרים את השיעור.
 */
function noteForNextLesson(userId, topic, openLoop) {
  if (!userId || !openLoop) return;
  const j = loadLessons(userId);
  j.pendingOpenLoop = { topic: String(topic || "").slice(0, 80), text: String(openLoop).slice(0, 160) };
  writeJson(lessonsFileFor(userId), j);
}

/**
 * סוגר שיעור: מוסיף רשומה ליומן (חתוך ל-20 האחרונות) ומקדם את מספר-השיעור.
 * rec: { topic, subtopic?, worked?, struggle?, openLoop?, endedStatus? }
 */
function endLesson(userId, rec = {}) {
  if (!userId) return;
  const j = loadLessons(userId);
  // אם המורה רשם open_loop במהלך השיעור (הפנקס-בהמתנה) — הוא נכנס לרשומה ונמחק
  let openLoop = String(rec.openLoop || "").slice(0, 160);
  if (!openLoop && j.pendingOpenLoop && (!j.pendingOpenLoop.topic || j.pendingOpenLoop.topic === String(rec.topic || "").slice(0, 80))) {
    openLoop = j.pendingOpenLoop.text || "";
  }
  delete j.pendingOpenLoop;
  j.lessons.push({
    n: j.lessonNumber,
    date: new Date().toISOString().slice(0, 10),
    topic: String(rec.topic || "").slice(0, 80),
    subtopic: String(rec.subtopic || "").slice(0, 80),
    worked: String(rec.worked || "").slice(0, 40),
    struggle: String(rec.struggle || "").slice(0, 160),
    openLoop: openLoop,
    endedStatus: String(rec.endedStatus || "").slice(0, 20),
  });
  if (j.lessons.length > 20) j.lessons = j.lessons.slice(-20);
  j.lessonNumber += 1;
  j.updatedAt = new Date().toISOString();
  writeJson(lessonsFileFor(userId), j);
  return j.lessonNumber;
}

/**
 * בלוק-היזכרות לפתיחת שיעור — טקסט קצר למורה. מחזיר "" כשהפנקס ריק
 * (הגנת אנטי-הזיה: בלי פנקס אין "זיכרונות", והמורה מונחה לא להמציא).
 */
function lessonContextText(userId) {
  const j = loadLessons(userId);
  const lines = [`זהו שיעור מספר ${j.lessonNumber} של הילד.`];
  const last = j.lessons[j.lessons.length - 1];
  if (last) {
    let s = `בשיעור הקודם (${last.n}) עבדתם על "${last.topic}"${last.subtopic ? ` — ${last.subtopic}` : ""}.`;
    if (last.worked) s += ` מה שעזר לו: ${last.worked}.`;
    if (last.struggle) s += ` איפה התקשה: ${last.struggle}.`;
    if (last.openLoop) s += ` נשאר פתוח: ${last.openLoop}.`;
    lines.push(s);
  } else {
    lines.push("אין עדיין רשומות בפנקס — זה כנראה השיעור הראשון. אל תעמיד/י פנים שאת/ה זוכר/ת משהו קודם.");
  }
  return lines.join("\n");
}

/** מוחק את פרופיל הילד + יומן-השיעורים (למחיקת חשבון). */
function deleteUser(userId) {
  if (!userId) return;
  try {
    require("fs").unlinkSync(fileFor(userId));
  } catch {
    /* אין קובץ — אין מה למחוק */
  }
  try {
    require("fs").unlinkSync(lessonsFileFor(userId));
  } catch {
    /* אין יומן — אין מה למחוק */
  }
}

module.exports = {
  STATUS,
  STATUS_HE,
  PROFILES_DIR,
  LESSONS_DIR,
  get,
  record,
  setStatus,
  setSummary,
  weakTopics,
  toPromptText,
  currentLessonNumber,
  topicLessonNumber,
  noteForNextLesson,
  endLesson,
  lessonContextText,
  deleteUser,
};
