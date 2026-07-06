/* eslint-disable no-console */

// הערכות סוכן לכל תלמיד: מורה / פסיכולוג / מתמטיקאי.
// המפתח: ההערכה נשמרת במטמון ומתרעננת *רק כשהקלט המשמעותי השתנה* (חתימת-hash גסה),
// לא בכל כניסה ולא בכל תרגיל. אפשר גם לכפות ריענון (force).

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { DATA_DIR, readJson, writeJson } = require("./store");
const llm = require("./llm");
const analytics = require("./analytics");

const DIR = path.join(DATA_DIR, "assessments");
const ROLES = ["teacher", "psychologist", "mathematician"];

function fileFor(userId) {
  return path.join(DIR, `${userId}.json`);
}
function load(userId) {
  return readJson(fileFor(userId), {});
}
function save(userId, data) {
  writeJson(fileFor(userId), data);
}

/** חתימת-קלט גסה — משתנה רק על שינוי משמעותי (לא על כל תרגיל בודד). */
function inputSignature(userId) {
  const s = analytics.summary(userId);
  const sig = {
    a: Math.floor(s.totalAttempts / 8), // כל ~8 תרגילים
    acc: Math.round(s.accuracy / 5), // קפיצות 5%
    streak: Math.min(s.dayStreak, 14),
    topics: s.topics
      .map((t) => `${t.name}:${t.status}:${Math.floor(t.attempts / 5)}`)
      .sort(),
    strug: [...s.strugglingTopics].sort(),
  };
  return crypto.createHash("sha1").update(JSON.stringify(sig)).digest("hex");
}

/** הנחיית-מין לכותב: לשון זכר/נקבה עקבית, בלי לוכסנים ("שולט/ת"). */
function genderNote(student) {
  const fem = student?.gender === "female";
  return fem
    ? "התלמידה היא בת — כתוב הכל בלשון נקבה בלבד (שולטת, מתקשה, פתרה). אסור לוכסנים כמו שולט/ת."
    : "התלמיד הוא בן — כתוב הכל בלשון זכר בלבד (שולט, מתקשה, פתר). אסור לוכסנים כמו שולט/ת.";
}

function statsText(userId, student) {
  const s = analytics.summary(userId);
  const name = student?.firstName || student?.username || "ללא שם";
  const lines = [
    `${student?.gender === "female" ? "תלמידה" : "תלמיד"}: ${name}, גיל ${student?.age ?? "?"}, כיתה ${student?.grade ?? "?"}, בית ספר ${student?.school ?? "?"}.`,
    `סה"כ ${s.totalAttempts} תרגילים, ${s.accuracy}% דיוק, ${s.activeDays} ימי פעילות, רצף ${s.dayStreak} ימים, מוטיבציה נוכחית ${s.currentMotivation}/100.`,
    "שליטה לפי נושא:",
  ];
  for (const t of s.topics.slice(0, 14)) {
    lines.push(
      `- ${t.name}: ${t.statusHe}, ${t.correct}/${t.attempts} (${t.accuracy}%)${t.note ? `, הערת מורה: ${t.note}` : ""}`
    );
  }
  if (s.topics.length === 0) lines.push("- אין עדיין פעילות.");
  return lines.join("\n");
}

const PERSONAS = {
  teacher:
    "את/ה המורה למתמטיקה של התלמיד/ה. כתוב/י הערכה קצרה (3-5 משפטים) על ההתקדמות הלימודית: במה שולט/ת, איפה מתקשה, ומה ההמלצה להמשך ההוראה. עברית חמה ומקצועית, בגוף שלישי.",
  psychologist:
    "את/ה הפסיכולוג/ית החינוכי/ת. כתוב/י הערכה קצרה (3-5 משפטים) על המוטיבציה, ההתמדה והרגש סביב הלמידה: מתי מתאמץ/ת, סימני תסכול או ביטחון, והמלצה רגשית-חינוכית. עברית רגישה, בגוף שלישי.",
  mathematician:
    "את/ה המתמטיקאי/ת. כתוב/י הערכה קצרה (3-5 משפטים) על השליטה המתמטית: אילו מושגים מבוססים, אילו פערים מתמטיים, ומהו הצעד המתמטי הבא המומלץ. עברית מדויקת, בגוף שלישי.",
};

function heuristic(role, userId, student) {
  const s = analytics.summary(userId);
  const fem = student?.gender === "female";
  if (s.totalAttempts === 0) return fem ? "אין עדיין מספיק נתונים — התלמידה רק התחילה." : "אין עדיין מספיק נתונים — התלמיד רק התחיל.";
  const strong = s.topics.filter((t) => t.status === "mastered").map((t) => t.name);
  const weak = s.strugglingTopics;
  if (role === "teacher") {
    return (
      `${fem ? "התלמידה פתרה" : "התלמיד פתר"} ${s.totalAttempts} תרגילים בדיוק ${s.accuracy}%. ` +
      (strong.length ? `${fem ? "שולטת" : "שולט"} היטב ב: ${strong.slice(0, 3).join(", ")}. ` : "") +
      (weak.length ? `כדאי לחזק: ${weak.slice(0, 3).join(", ")}.` : "ההתקדמות יפה.")
    );
  }
  if (role === "psychologist") {
    const m = s.currentMotivation;
    return (
      `רמת מוטיבציה ${m >= 60 ? "גבוהה" : m >= 35 ? "בינונית" : "נמוכה"} (${m}/100), רצף ${s.dayStreak} ימי פעילות. ` +
      (weak.length
        ? `ייתכן תסכול ב: ${weak.slice(0, 2).join(", ")} — מומלץ עידוד והצלחות קטנות.`
        : fem ? "מתמידה ובטוחה בעצמה." : "מתמיד ובטוח בעצמו.")
    );
  }
  return (
    `דיוק כללי ${s.accuracy}%. ` +
    (strong.length ? `מושגים מבוססים: ${strong.slice(0, 3).join(", ")}. ` : "") +
    (weak.length ? `פערים: ${weak.slice(0, 3).join(", ")} — מומלץ תרגול ממוקד.` : fem ? "מוכנה להעמקה." : "מוכן להעמקה.")
  );
}

/** מנקה markdown — טקסט רגיל לכרטיס (בלי **, בלי כותרות #, בלי כותרת-תפקיד מיותרת). */
function cleanText(t) {
  return String(t || "")
    .replace(/\*\*/g, "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function generateOne(role, userId, student) {
  if (!llm.isEnabled()) return heuristic(role, userId, student);
  try {
    const reply = await llm.complete({
      system:
        PERSONAS[role] +
        "\n" + genderNote(student) +
        "\nכתוב טקסט רגיל וזורם בלבד — בלי כותרת, בלי שם/כיתה בראש, בלי כוכביות (**) ובלי סימוני markdown." +
        "\nהתבסס אך ורק על הנתונים שניתנו. אל תמציא. אם אין מספיק מידע — אמור זאת במשפט.",
      messages: [
        { role: "user", content: `הנתונים:\n${statsText(userId, student)}\n\nכתוב את ההערכה.` },
      ],
      maxTokens: 340,
    });
    return cleanText(reply) || heuristic(role, userId, student);
  } catch (e) {
    console.error("assessment gen error:", e.message);
    return heuristic(role, userId, student);
  }
}

/** יצירת שלוש ההערכות במקביל (מהיר פי-3 מרצף) ושמירה. */
async function regenAll(userId, student, sig) {
  const texts = await Promise.all(ROLES.map((role) => generateOne(role, userId, student)));
  const data = load(userId);
  const now = new Date().toISOString();
  ROLES.forEach((role, i) => { data[role] = { text: texts[i], hash: sig, updatedAt: now }; });
  save(userId, data);
  return data;
}

// רענון-רקע: לא חוסם את הדף; מונע ריצות כפולות במקביל
const inflight = new Set();
function queueRegen(userId, student, sig) {
  if (inflight.has(userId)) return;
  inflight.add(userId);
  regenAll(userId, student, sig)
    .catch((e) => console.error("bg assessment regen:", e.message))
    .finally(() => inflight.delete(userId));
}

/** ההערכות מהמטמון — מיידי. אם הקלט השתנה, מרענן ברקע (לצפייה הבאה); force מרענן עכשיו. */
async function getAssessments(userId, student, { force = false } = {}) {
  let data = load(userId);
  const sig = inputSignature(userId);
  const hasAll = ROLES.every((r) => data[r] && data[r].text);
  const stale = hasAll && ROLES.some((r) => data[r].hash !== sig);

  if (force || !hasAll) {
    data = await regenAll(userId, student, sig); // רענון מפורש / פעם ראשונה — מחכים (במקביל)
  } else if (stale) {
    queueRegen(userId, student, sig); // הדף מקבל את המטמון מיד; העדכון קורה ברקע
  }
  return {
    teacher: data.teacher || null,
    psychologist: data.psychologist || null,
    mathematician: data.mathematician || null,
    signature: sig,
    fresh: force || !hasAll,
  };
}

/* ---------- הערכות לכל נושא (לחלון הנושא באזור ההורים) ---------- */

/** חתימה גסה לנושא — משתנה רק כשיש התקדמות ממשית באותו נושא. */
function topicSignature(t) {
  const sig = {
    a: Math.floor((t.attempts || 0) / 5),
    acc: Math.round((t.accuracy || 0) / 5),
    st: t.status,
    note: t.note || "",
  };
  return crypto.createHash("sha1").update(JSON.stringify(sig)).digest("hex");
}

const TOPIC_PERSONAS = {
  teacher:
    "את/ה המורה למתמטיקה. כתוב/י להורה 2-4 משפטים על הנושא הספציפי הזה בלבד: איך הילד/ה מתמודד/ת בו, מה כבר יושב טוב ומה עוד דורש חיזוק, והמלצה מעשית אחת. עברית חמה, בגוף שלישי.",
  psychologist:
    "את/ה הפסיכולוג/ית החינוכי/ת. כתוב/י להורה 2-3 משפטים על הצד הרגשי בנושא הספציפי הזה בלבד: ביטחון/תסכול/התמדה שניכרים מהנתונים, ואיך ההורה יכול לתמוך. עברית רגישה, בגוף שלישי.",
  mathematician:
    "את/ה המתמטיקאי/ת. כתוב/י להורה 2-3 משפטים על הנושא הספציפי הזה בלבד: אילו מיומנויות מתמטיות הוא דורש, מה מצב השליטה בהן, ומה הצעד המתמטי הבא. עברית מדויקת ופשוטה, בגוף שלישי.",
};

function topicStatsText(student, t, minutes) {
  const name = student?.firstName || student?.username || (student?.gender === "female" ? "התלמידה" : "התלמיד");
  return [
    `${student?.gender === "female" ? "תלמידה" : "תלמיד"}: ${name}, כיתה ${student?.grade ?? "?"}, גיל ${student?.age ?? "?"}.`,
    `הנושא: ${t.name}. מצב: ${t.statusHe || t.status}.`,
    `${t.correct}/${t.attempts} תשובות נכונות (${t.accuracy}% דיוק), רצף נוכחי ${t.streak}, רצף טעויות ${t.wrongStreak}.`,
    minutes != null ? `זמן שהוקדש לנושא: ~${minutes} דקות.` : "",
    t.note ? `הערת המורה מהשיעורים: ${t.note}` : "",
  ].filter(Boolean).join("\n");
}

function topicHeuristic(role, t) {
  if (!t.attempts) return "אין עדיין תרגול בנושא הזה.";
  if (role === "teacher") {
    return `בנושא ${t.name} נענו ${t.correct} מתוך ${t.attempts} תרגילים (${t.accuracy}%). ` +
      (t.status === "mastered" ? "הנושא יושב היטב — אפשר להתקדם הלאה." :
       t.status === "struggling" ? "יש קושי — מומלץ תרגול קצר ויומיומי עם עידוד." : "ההתקדמות בכיוון טוב, ממשיכים לתרגל.");
  }
  if (role === "psychologist") {
    return t.wrongStreak >= 2
      ? "רצף הטעויות האחרון עלול לתסכל — כדאי לחזק הצלחות קטנות ולשמור על חוויה חיובית."
      : "הנתונים מעידים על התמדה וביטחון סביר בנושא. עידוד קצר מההורה יעשה טוב.";
  }
  return `הנושא דורש ביסוס הדרגתי; רמת הדיוק (${t.accuracy}%) ${t.accuracy >= 75 ? "מעידה על בסיס מוצק" : "מרמזת שכדאי לחזור על היסודות"}.`;
}

async function generateTopicOne(role, student, t, minutes) {
  if (!llm.isEnabled()) return topicHeuristic(role, t);
  try {
    const reply = await llm.complete({
      system:
        TOPIC_PERSONAS[role] +
        "\n" + genderNote(student) +
        "\nטקסט רגיל בלבד — בלי כותרות, בלי כוכביות, בלי markdown. אל תמציא; התבסס רק על הנתונים.",
      messages: [{ role: "user", content: `${topicStatsText(student, t, minutes)}\n\nכתוב את חוות הדעת להורה.` }],
      maxTokens: 220,
    });
    return cleanText(reply) || topicHeuristic(role, t);
  } catch (e) {
    console.error("topic assessment error:", e.message);
    return topicHeuristic(role, t);
  }
}

/** יצירת שלוש חוות-דעת לנושא במקביל ושמירה. */
async function regenTopic(userId, student, topicStat, minutes, sig) {
  const texts = await Promise.all(ROLES.map((role) => generateTopicOne(role, student, topicStat, minutes)));
  const out = { hash: sig, updatedAt: new Date().toISOString() };
  ROLES.forEach((role, i) => { out[role] = { text: texts[i] }; });
  const data = load(userId);
  if (!data.topics) data.topics = {};
  data.topics[topicStat.name] = out;
  save(userId, data);
  return out;
}

/** חוות דעת לנושא — מהמטמון מיידית; אם השתנה משהו בנושא מתעדכן ברקע; force מרענן עכשיו. */
async function getTopicAssessments(userId, student, topicStat, minutes, { force = false } = {}) {
  const data = load(userId);
  const sig = topicSignature(topicStat);
  const cached = data.topics && data.topics[topicStat.name];
  const key = `${userId}::${topicStat.name}`;

  if (!force && cached && cached.teacher) {
    if (cached.hash !== sig && !inflight.has(key)) {
      inflight.add(key);
      regenTopic(userId, student, topicStat, minutes, sig)
        .catch((e) => console.error("bg topic regen:", e.message))
        .finally(() => inflight.delete(key));
    }
    return { ...cached, fresh: false }; // מיידי מהמטמון; עדכון (אם צריך) ברקע
  }
  const out = await regenTopic(userId, student, topicStat, minutes, sig); // רענון מפורש / פעם ראשונה
  return { ...out, fresh: true };
}

function deleteUser(userId) {
  try {
    fs.unlinkSync(fileFor(userId));
  } catch {
    /* לא קיים — בסדר */
  }
}

module.exports = { getAssessments, getTopicAssessments, deleteUser, ROLES };
