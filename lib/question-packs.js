/* eslint-disable no-console */

/**
 * ────────────────────────────────────────────────────────────────────────
 *  חבילות-שאלות — תוכן כתוב-ביד שנכנס למערכת, וניתן להסרה בקובץ אחד
 * ────────────────────────────────────────────────────────────────────────
 *
 *  המחוללים ב-lib/generators טובים ברמות הנמוכות — ביצוע ויישום. רמות
 *  החשיבה הגבוהות (בחירת אסטרטגיה, היפוך, ביקורת והנמקה) לא נולדות
 *  מאלגוריתם: מישהו צריך לנסח אותן. כאן הן יושבות.
 *
 *  כל חבילה היא קובץ JSON עצמאי ב-question-packs/. מחיקת הקובץ
 *  מסירה את כל שאלותיו מהמערכת מיד, בלי לגעת בשום קוד — וזו בדיוק הנקודה:
 *  תוכן שהוזרק ידנית צריך להיות הפיך באותה קלות שבה הוכנס.
 *
 *  מבנה:
 *  {
 *    "pack": "grade-3-thinking", "grade": 3, "enabled": true,
 *    "topics": { "<שם נושא>": [ {level, text, answer, …}, … ] }
 *  }
 */

const fs = require("fs");
const path = require("path");
const { ROOT } = require("./store");

// בשורש הפרויקט ולא ב-data/: data נמחק בכל deploy ואינו ב-git. חבילות הן
// תוכן שנכתב ביד — הן חייבות לשרוד פריסה ולהיות ניתנות לעריכה ישירה,
// בדיוק כמו שיעורי-הזהב ב-golden/.
const PACKS_DIR = path.join(ROOT, "question-packs");

const { CURRICULUM } = require("./curriculum");

/** טווח-הרמות של נושא לפי תכנית הלימוד (ריק = אין הגבלה). */
function bandFor(gradeNum, topic) {
  const g = CURRICULUM[gradeNum];
  if (!g) return null;
  for (const t of g.topics) {
    if (t.key === topic && Array.isArray(t.levels) && t.levels.length) return t.levels;
    for (const sub of t.sub || []) {
      if (sub.key === topic && Array.isArray(sub.levels) && sub.levels.length) return sub.levels;
    }
  }
  return null;
}

let cache = null;
let cacheAt = 0;
const TTL = 30 * 1000; // רענון קל — כדי שמחיקת קובץ תיכנס לתוקף בלי הפעלה מחדש

function loadAll() {
  const now = Date.now();
  if (cache && now - cacheAt < TTL) return cache;
  const out = [];
  try {
    for (const f of fs.readdirSync(PACKS_DIR)) {
      if (!f.endsWith(".json")) continue;
      try {
        const j = JSON.parse(fs.readFileSync(path.join(PACKS_DIR, f), "utf8"));
        if (j && j.enabled !== false && j.topics) out.push(j);
      } catch (e) {
        console.warn("[packs] קובץ פגום, מדולג:", f, e.message);
      }
    }
  } catch (e) { /* אין תיקייה — אין חבילות, וזה תקין */ }
  cache = out;
  cacheAt = now;
  return out;
}

/** כל שאלות החבילות לנושא מסוים בכיתה, אחרי סינון רמה. */
function questionsFor(gradeNum, topic, level = null) {
  const list = [];
  const band = bandFor(gradeNum, topic);
  const lo = band ? band[0] : 1;
  const hi = band ? band[band.length - 1] : 10;
  for (const pack of loadAll()) {
    if (Number(pack.grade) !== Number(gradeNum)) continue;
    const arr = pack.topics[topic];
    if (!Array.isArray(arr)) continue;
    for (let i = 0; i < arr.length; i++) {
      const q = arr[i];
      if (!q || !q.text) continue;
      // הרמה נחתכת לטווח הנושא — שאלת-"ביקורת" ברמה 5 בנושא שטווחו [2,3,4]
      // תוגש כרמה 4, במקום להמציא רמה שהבורר לא מציג.
      const lv = Math.max(lo, Math.min(hi, Number(q.level) || lo));
      if (level != null && lv !== Number(level)) continue;
      list.push(Object.assign({ id: `${pack.pack}:${topic}:${i}`, fromPack: pack.pack }, q, { level: lv, difficulty: lv }));
    }
  }
  return list;
}

/**
 * שאלה אחת מהחבילה שהתלמיד עוד לא ראה. מחזיר null כשאין — ואז המערכת
 * ממשיכה כרגיל למאגר ולמחולל. החבילה *מוסיפה*, לא מחליפה.
 */
function pick(gradeNum, topic, level, excludeIds = [], exact = false) {
  const ex = new Set(excludeIds || []);
  let pool = questionsFor(gradeNum, topic, level).filter((q) => !ex.has(q.id));
  // כשהרמה נעולה — לא מרפים. עדיף להחזיר null (המאגר יגיש שאלה מהרמה
  // הנכונה) מאשר להגיש שאלה מרמה אחרת: התלמיד לוחץ 3 ורואה 4.
  if (!pool.length && !exact) {
    pool = questionsFor(gradeNum, topic, null).filter((q) => !ex.has(q.id));
  }
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** סיכום לאדמין: אילו חבילות טעונות וכמה שאלות בכל אחת. */
function summary() {
  return loadAll().map((p) => ({
    pack: p.pack,
    grade: p.grade,
    topics: Object.keys(p.topics).length,
    questions: Object.values(p.topics).reduce((s, a) => s + (Array.isArray(a) ? a.length : 0), 0),
  }));
}

module.exports = { PACKS_DIR, questionsFor, pick, summary };
