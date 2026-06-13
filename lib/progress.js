/* eslint-disable no-console */

// התקדמות לכל תלמיד: אילו שאלות כבר קיבל בכל נושא — כדי שלא יחזרו אליו.
// קובץ אחד לכל משתמש: data/progress/<userId>.json
//   { seen: { "1::שעון": ["q-id1", "q-id2", ...] } }

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
  if (data && data.seen && typeof data.seen === "object") return data;
  return { seen: {} };
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

/** מוחק את כל ההתקדמות של המשתמש (למחיקת חשבון). */
function deleteUser(userId) {
  try {
    require("fs").unlinkSync(fileFor(userId));
  } catch {
    /* אין קובץ — אין מה למחוק */
  }
}

module.exports = { PROGRESS_DIR, getSeen, markSeen, clearSeen, deleteUser };
