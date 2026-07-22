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
const { genderize } = require("./gender");

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
  const name = student?.firstName || student?.username || (fem ? "התלמידה" : "התלמיד");
  return fem
    ? `חשוב מאוד — ${name} היא בת: כתוב כל מילה בלשון נקבה בלבד (שולטת, מתקשה, פתרה, נעזרת, מתמידה, בטוחה). אסור בשום אופן לשון זכר ואסור לוכסנים.`
    : `חשוב מאוד — ${name} הוא בן: כתוב כל מילה בלשון זכר בלבד (שולט, מתקשה, פתר, נעזר, מתמיד, בטוח). אסור בשום אופן לשון נקבה ואסור לוכסנים.`;
}

/** חיתוך בסוף-משפט שלם — כדי שטקסט שנחתך ע"י תקרת-טוקנים לא יופיע קטוע באמצע. */
function trimToSentence(t) {
  const s = String(t || "").trim();
  if (!s || /[.!?…”"׃]$/.test(s)) return s;
  const m = s.match(/^[\s\S]*[.!?…]/); // עד סימן-הסיום האחרון
  return m && m[0].length >= s.length * 0.5 ? m[0].trim() : s;
}

/** ניקוי-סופי לכל חוות-דעת: markdown → טקסט, חיתוך-בסוף-משפט, ותיקון-מגדר דטרמיניסטי. */
function finalize(text, student) {
  const g = student?.gender === "female" ? "female" : "male";
  return genderize(trimToSentence(cleanText(text)), g);
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
    "את/ה המורה למתמטיקה של התלמיד/ה. כתוב/י הערכה פדגוגית (3-5 משפטים): במה שולט/ת, איפה נתקע/ת, כמה נשען/ת על עזרה, ומה הצעד ההוראתי הבא. התבסס/י גם על דפוסי-ההתנהגות שניתנו — תן/י תמונה קונקרטית, לא ניסוח כללי. עברית חמה ומקצועית, בגוף שלישי.",
  psychologist:
    "את/ה הפסיכולוג/ית החינוכי/ת. אל תחזור/י על הסיכום הלימודי של המורה — התמקד/י אך ורק בצד הרגשי-התנהגותי (3-5 משפטים): נכונות ללמידה והתמדה, סימני תסכול (רצפי-טעויות, חזרה על אותן שאלות), מידת ההישענות על עזרה ואיך היא משפיעה על הביטחון, והאם לומד/ת מטעויות. בסס/י כל אמירה על דפוסי-ההתנהגות שניתנו, וסיים/י בהמלצה רגשית-חינוכית אחת. עברית רגישה, בגוף שלישי.",
  mathematician:
    "את/ה המתמטיקאי/ת. התמקד/י בתוכן המתמטי בלבד (3-5 משפטים) — אל תחזור/י על הצד הרגשי: אילו מושגים מבוססים, אילו פערים מתמטיים, ומהו הצעד המתמטי הבא. עברית מדויקת, בגוף שלישי.",
};

/** קלט מותאם-תפקיד: כל פרסונה מקבלת דגש שונה כדי שלא יחזרו זה על זה. */
function contextFor(role, userId, student) {
  const stats = statsText(userId, student);
  const behav = analytics.behaviorText(userId);
  if (role === "psychologist") return `דפוסי-ההתנהגות (המוקד שלך):\n${behav}\n\nרקע-נתונים תמציתי:\n${stats}`;
  if (role === "teacher") return `${stats}\n\n${behav}`;
  return stats; // mathematician — תוכן מתמטי בלבד
}

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
    const name = student?.firstName || student?.username || "התלמיד";
    const reply = await llm.complete({
      system:
        PERSONAS[role] +
        "\n" + genderNote(student) +
        "\nכתוב טקסט רגיל וזורם בלבד — בלי כותרת, בלי שם/כיתה בראש, בלי כוכביות (**) ובלי סימוני markdown." +
        "\nהתבסס אך ורק על הנתונים שניתנו. אל תמציא. אם אין מספיק מידע — אמור זאת במשפט. סיים כל משפט; אל תיעצר באמצע.",
      messages: [
        { role: "user", content: `${contextFor(role, userId, student)}\n\nכתוב את ההערכה על ${name}.` },
      ],
      maxTokens: 600,
    });
    return finalize(reply, student) || heuristic(role, userId, student);
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
        "\nטקסט רגיל בלבד — בלי כותרות, בלי כוכביות, בלי markdown. אל תמציא; התבסס רק על הנתונים. סיים כל משפט; אל תיעצר באמצע.",
      messages: [{ role: "user", content: `${topicStatsText(student, t, minutes)}\n\nכתוב את חוות הדעת להורה.` }],
      maxTokens: 420,
    });
    return finalize(reply, student) || topicHeuristic(role, t);
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
