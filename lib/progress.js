/* eslint-disable no-console */

// התקדמות לכל תלמיד: אילו שאלות כבר קיבל בכל נושא — כדי שלא יחזרו אליו,
// וכמה שאלות פתר נכון בכל רמה — הבסיס לטבעת ההתקדמות במסך הנושאים.
// קובץ אחד לכל משתמש: data/progress/<userId>.json
//   {
//     seen:   { "1::שעון": ["q-id1", "q-id2", ...] },   // הוצגו (לא בהכרח נפתרו)
//     solved: { "1::שעון": { "1": 4, "2": 5 } }          // נפתרו נכון, לפי רמה
//   }

const path = require("path");
const { DATA_DIR, readJson, writeJson } = require("./store");

const PROGRESS_DIR = path.join(DATA_DIR, "progress");

function fileFor(userId) {
  return path.join(PROGRESS_DIR, `${String(userId).replace(/[^\w-]/g, "_")}.json`);
}
function topicKey(gradeNum, topic) {
  return `${gradeNum}::${topic}`;
}
function load(userId) {
  const data = readJson(fileFor(userId), null);
  const out = data && typeof data === "object" ? data : {};
  if (!out.seen || typeof out.seen !== "object") out.seen = {};
  if (!out.solved || typeof out.solved !== "object") out.solved = {};
  return out;
}

/** מערך מזהי השאלות שכבר נראו לתלמיד בנושא הזה. */
function getSeen(userId, gradeNum, topic) {
  if (!userId) return [];
  const data = load(userId);
  return data.seen[topicKey(gradeNum, topic)] || [];
}

/** מסמן שאלה כ"נראתה" — לא תוחזר שוב לתלמיד הזה. */
function markSeen(userId, gradeNum, topic, questionId) {
  if (!userId || !questionId) return;
  const data = load(userId);
  const k = topicKey(gradeNum, topic);
  const arr = data.seen[k] || [];
  if (!arr.includes(questionId)) {
    arr.push(questionId);
    data.seen[k] = arr;
    writeJson(fileFor(userId), data);
  }
}

/** מאפס את הנושא — כשאזל המאגר ואין שאלה חדשה לייצר, מתחילים מחזור חדש. */
function clearSeen(userId, gradeNum, topic) {
  if (!userId) return;
  const data = load(userId);
  delete data.seen[topicKey(gradeNum, topic)];
  writeJson(fileFor(userId), data);
}

/* ───────── שאלות שנפתרו נכון (טבעת ההתקדמות) ─────────
   נשמר בנפרד מ-seen: seen = "הוצג", solved = "נפתר נכון".
   clearSeen לא נוגע ב-solved — מחזור חדש של שאלות לא מאפס התקדמות. */

/** כמה שאלות נפתרו נכון בכל רמה בנושא. → { "1": 10, "2": 4 } */
function getSolved(userId, gradeNum, topic) {
  if (!userId) return {};
  return load(userId).solved[topicKey(gradeNum, topic)] || {};
}

const MAX_LEVELS_PER_TOPIC = 20; // תקרת-בטיחות: הקובץ לא גדל בלי גבול

/** מיזוג "הגבוה מנצח" — לעולם לא יורד, עמיד להחלפת מכשיר ולסדר הגעה. מחזיר את המפה הממוזגת.
 *  allowedLevels (אופציונלי): רשימת הרמות החוקיות לנושא — כל מפתח אחר נזרק.
 *  בלעדיו מותרות רמות 1–20 בלבד. מערכים נדחים (האינדקסים שלהם נראים כמו רמות). */
function mergeSolved(userId, gradeNum, topic, counts, allowedLevels) {
  if (!userId || !counts || typeof counts !== "object" || Array.isArray(counts)) return {};
  const allow = Array.isArray(allowedLevels) && allowedLevels.length ? new Set(allowedLevels.map(String)) : null;
  const data = load(userId);
  const k = topicKey(gradeNum, topic);
  const cur = data.solved[k] || {};
  let changed = false;
  for (const lv of Object.keys(counts)) {
    const key = String(lv);
    if (!/^\d{1,2}$/.test(key)) continue; // רמה = מספר קטן בלבד
    if (allow ? !allow.has(key) : Number(key) < 1 || Number(key) > MAX_LEVELS_PER_TOPIC) continue;
    if (!(key in cur) && Object.keys(cur).length >= MAX_LEVELS_PER_TOPIC) continue;
    const n = Math.max(0, Math.min(9999, Math.floor(Number(counts[lv]) || 0)));
    if (n > (Number(cur[key]) || 0)) {
      cur[key] = n;
      changed = true;
    }
  }
  if (changed) {
    data.solved[k] = cur;
    writeJson(fileFor(userId), data);
  }
  return cur;
}

/** כל הנושאים בכיתה הזו. → { "חיבור תרגילים": { "1": 10, ... } } */
function allSolved(userId, gradeNum) {
  if (!userId || !gradeNum) return {};
  const data = load(userId);
  const prefix = `${gradeNum}::`;
  const out = {};
  for (const k of Object.keys(data.solved)) {
    if (k.startsWith(prefix)) out[k.slice(prefix.length)] = data.solved[k];
  }
  return out;
}

/** מוחק את כל ההתקדמות של המשתמש (למחיקת חשבון). */
function deleteUser(userId) {
  try {
    require("fs").unlinkSync(fileFor(userId));
  } catch {
    /* אין קובץ — אין מה למחוק */
  }
}

module.exports = { PROGRESS_DIR, getSeen, markSeen, clearSeen, getSolved, mergeSolved, allSolved, deleteUser };
