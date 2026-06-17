/* eslint-disable no-console */

const crypto = require("crypto");
const path = require("path");
const { DATA_DIR, readJson, writeJson } = require("./store");
const { CURRICULUM } = require("./curriculum");

const BANK_DIR = path.join(DATA_DIR, "bank");

// שם קובץ בטוח למערכת הקבצים (עברית מותרת; רווחים ו-/ → מקף)
function slug(topic) {
  return String(topic).trim().replace(/[\\/]/g, "-").replace(/\s+/g, "-");
}
function dirFor(gradeNum) {
  return path.join(BANK_DIR, `grade-${gradeNum}`);
}
function fileFor(gradeNum, topic) {
  return path.join(dirFor(gradeNum), `${slug(topic)}.json`);
}
function gradeLabel(gradeNum) {
  return CURRICULUM[gradeNum] ? CURRICULUM[gradeNum].grade : String(gradeNum);
}

function loadTopic(gradeNum, topic) {
  const data = readJson(fileFor(gradeNum, topic), null);
  if (data && Array.isArray(data.questions)) return data;
  return { grade: gradeLabel(gradeNum), gradeNum, topic, questions: [] };
}
function saveTopic(gradeNum, topic, data) {
  writeJson(fileFor(gradeNum, topic), data);
}
function newId() {
  return `q-${crypto.randomBytes(5).toString("hex")}`;
}

// מפתח ייחודיות: טקסט + נתוני שרטוט. חשוב לנושאים ויזואליים שבהם הטקסט קבוע
// והשרטוט הוא מה שמשתנה (למשל "כמה צלעות יש לצורה?" עם צורות שונות).
function qKey(q) {
  return `${q.text}|${JSON.stringify(q.diagramData || "")}`;
}

function normalize(question) {
  const diff = question.difficulty || question.level || 1;
  const q = {
    id: question.id || newId(),
    text: question.text,
    answer: question.answer,
    level: diff, // רמת הקושי (1-10) — משמשת גם להתאמה לרמת התלמיד
    difficulty: diff,
    hints: Array.isArray(question.hints) ? question.hints : [],
    explanation: question.explanation || "",
    source: question.source || "algo",
  };
  if (question.needsDiagram) q.needsDiagram = true;
  if (question.diagramData) q.diagramData = question.diagramData;
  if (question.answerKind) q.answerKind = question.answerKind; // למשל "time" (שעות:דקות)
  if (question.interactive) q.interactive = question.interactive; // למשל "clock-set" / "shape-create"
  if (question.shapeTarget) q.shapeTarget = question.shapeTarget; // יעד לציור צורה
  return q;
}

/**
 * שאלה מהמאגר שעדיין לא נראתה (excludeIds), בהעדפת רמה ±1.
 * מחזיר null אם כל השאלות כבר נראו — כדי שהמתמטיקאי ייצר חדשה קדימה.
 */
function getQuestion(gradeNum, topic, level = 1, excludeIds = [], exact = false) {
  const arr = loadTopic(gradeNum, topic).questions;
  if (!arr.length) return null;
  const exclude = new Set(excludeIds);
  const avail = arr.filter((q) => !exclude.has(q.id));
  if (!avail.length) return null; // נגמרו השאלות שלא נראו
  if (exact) {
    // נעילה על רמה — רק שאלות מהרמה המדויקת הזו
    const exactPool = avail.filter((q) => (q.level || 1) === level);
    return exactPool.length ? exactPool[Math.floor(Math.random() * exactPool.length)] : null;
  }
  const byLevel = avail.filter((q) => Math.abs((q.level || 1) - level) <= 1);
  const pool = byLevel.length ? byLevel : avail;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** רמות הקושי שקיימות בפועל במאגר הנושא (לבורר הרמות). */
function availableLevels(gradeNum, topic) {
  const arr = loadTopic(gradeNum, topic).questions;
  const present = arr.map((q) => q.level || 1);
  if (!present.length) return [];
  // טווח רציף מהמינימום למקסימום — בלי חורים (רמה ריקה תיווצר לפי דרישה)
  const min = Math.min(...present);
  const max = Math.max(...present);
  const out = [];
  for (let l = min; l <= max; l += 1) out.push(l);
  return out;
}

/** כמה שאלות יש בכל רמה — למד השאלות. מחזיר { "1": 4, "2": 22, ... }. */
function levelCounts(gradeNum, topic) {
  const arr = loadTopic(gradeNum, topic).questions;
  const out = {};
  for (const q of arr) {
    const lv = q.level || 1;
    out[lv] = (out[lv] || 0) + 1;
  }
  return out;
}

/** כל מפתחות השאלות הקיימים בנושא (טקסט+שרטוט) — לבדיקת "יש עוד שאלה חדשה לייצר?". */
function existingKeys(gradeNum, topic) {
  return new Set(loadTopic(gradeNum, topic).questions.map(qKey));
}

/** כמה שאלות יש בנושא. */
function count(gradeNum, topic) {
  return loadTopic(gradeNum, topic).questions.length;
}

/** מוסיף שאלה בודדת (מניעת כפילות לפי טקסט+שרטוט). */
function addQuestion(gradeNum, topic, question) {
  const data = loadTopic(gradeNum, topic);
  const k = qKey(question);
  const exists = data.questions.find((q) => qKey(q) === k);
  if (exists) return exists;
  const stored = normalize(question);
  data.questions.push(stored);
  saveTopic(gradeNum, topic, data);
  return stored;
}

/** כתיבה בכמות — לזריעת המאגר. מחזיר כמה נשמרו. */
function setQuestions(gradeNum, topic, questions) {
  const data = {
    grade: gradeLabel(gradeNum),
    gradeNum,
    topic,
    questions: questions.map(normalize),
  };
  saveTopic(gradeNum, topic, data);
  return data.questions.length;
}

/** סטטיסטיקה — כמה שאלות בכל כיתה/נושא. */
function stats() {
  const out = {};
  for (const gn of Object.keys(CURRICULUM)) {
    const g = CURRICULUM[gn];
    const perTopic = {};
    let total = 0;
    for (const t of g.topics) {
      const n = loadTopic(Number(gn), t.key).questions.length;
      perTopic[t.key] = n;
      total += n;
    }
    out[`${gn} (${g.grade})`] = { total, perTopic };
  }
  return out;
}

module.exports = {
  BANK_DIR,
  slug,
  dirFor,
  fileFor,
  loadTopic,
  getQuestion,
  availableLevels,
  levelCounts,
  existingKeys,
  qKey,
  count,
  addQuestion,
  setQuestions,
  stats,
};
