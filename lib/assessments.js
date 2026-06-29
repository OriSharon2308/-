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

function statsText(userId, student) {
  const s = analytics.summary(userId);
  const name = student?.firstName || student?.username || "ללא שם";
  const lines = [
    `תלמיד/ה: ${name}, גיל ${student?.age ?? "?"}, כיתה ${student?.grade ?? "?"}, בית ספר ${student?.school ?? "?"}.`,
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

function heuristic(role, userId) {
  const s = analytics.summary(userId);
  if (s.totalAttempts === 0) return "אין עדיין מספיק נתונים — התלמיד/ה רק התחיל/ה.";
  const strong = s.topics.filter((t) => t.status === "mastered").map((t) => t.name);
  const weak = s.strugglingTopics;
  if (role === "teacher") {
    return (
      `התלמיד/ה פתר/ה ${s.totalAttempts} תרגילים בדיוק ${s.accuracy}%. ` +
      (strong.length ? `שולט/ת היטב ב: ${strong.slice(0, 3).join(", ")}. ` : "") +
      (weak.length ? `כדאי לחזק: ${weak.slice(0, 3).join(", ")}.` : "ההתקדמות יפה.")
    );
  }
  if (role === "psychologist") {
    const m = s.currentMotivation;
    return (
      `רמת מוטיבציה ${m >= 60 ? "גבוהה" : m >= 35 ? "בינונית" : "נמוכה"} (${m}/100), רצף ${s.dayStreak} ימי פעילות. ` +
      (weak.length
        ? `ייתכן תסכול ב: ${weak.slice(0, 2).join(", ")} — מומלץ עידוד והצלחות קטנות.`
        : "מתמיד/ה ובטוח/ה בעצמו/ה.")
    );
  }
  return (
    `דיוק כללי ${s.accuracy}%. ` +
    (strong.length ? `מושגים מבוססים: ${strong.slice(0, 3).join(", ")}. ` : "") +
    (weak.length ? `פערים: ${weak.slice(0, 3).join(", ")} — מומלץ תרגול ממוקד.` : "מוכן/ה להעמקה.")
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
  if (!llm.isEnabled()) return heuristic(role, userId);
  try {
    const reply = await llm.complete({
      system:
        PERSONAS[role] +
        "\nכתוב/י טקסט רגיל וזורם בלבד — בלי כותרת, בלי שם/כיתה בראש, בלי כוכביות (**) ובלי סימוני markdown." +
        "\nהתבסס/י אך ורק על הנתונים שניתנו. אל תמציא/י. אם אין מספיק מידע — אמור/י זאת במשפט.",
      messages: [
        { role: "user", content: `נתוני התלמיד/ה:\n${statsText(userId, student)}\n\nכתוב/י את ההערכה.` },
      ],
      maxTokens: 340,
    });
    return cleanText(reply) || heuristic(role, userId);
  } catch (e) {
    console.error("assessment gen error:", e.message);
    return heuristic(role, userId);
  }
}

/** ההערכות מהמטמון; מרענן רק מה שהשתנה הקלט שלו (או הכל אם force). */
async function getAssessments(userId, student, { force = false } = {}) {
  const data = load(userId);
  const sig = inputSignature(userId);
  let changed = false;
  for (const role of ROLES) {
    const cached = data[role];
    if (!force && cached && cached.hash === sig && cached.text) continue; // עדכני — לא מרעננים
    data[role] = {
      text: await generateOne(role, userId, student),
      hash: sig,
      updatedAt: new Date().toISOString(),
    };
    changed = true;
  }
  if (changed) save(userId, data);
  return {
    teacher: data.teacher || null,
    psychologist: data.psychologist || null,
    mathematician: data.mathematician || null,
    signature: sig,
    fresh: changed,
  };
}

function deleteUser(userId) {
  try {
    fs.unlinkSync(fileFor(userId));
  } catch {
    /* לא קיים — בסדר */
  }
}

module.exports = { getAssessments, deleteUser, ROLES };
