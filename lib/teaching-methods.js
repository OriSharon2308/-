/* eslint-disable no-console */

/**
 * ────────────────────────────────────────────────────────────────────────
 *  זיכרון-שיטות — שיטת-לימוד שעבדה נשמרת ומוצגת ישר בפעם הבאה
 * ────────────────────────────────────────────────────────────────────────
 *
 *  הרעיון (של אורי): כשהמורה מלמד נושא ושיטת-ההסבר עובדת (הילד לחץ "✓ הבנתי"),
 *  שומרים את השיטה — הטקסט + רצף הציורים — ובשיעור הבא על אותו נושא (גם לילד
 *  אחר) המורה מציג אותה *ישר*, בלי קריאת AI בכלל: מהיר, עקבי, וחוסך טוקנים.
 *  ה-AI חושב מחדש רק כשילד אומר "לא הבנתי" — ואז מלמד אחרת, והשיטה החדשה
 *  נשמרת אם עבדה. ככה המערכת לומדת מעצמה ומשתפרת עם כל תלמיד.
 *
 *  אחסון: data/methods/<topic>.json — גלובלי (לא לפי ילד): שיטה טובה משרתת את כולם.
 *  מבנה: { topic, reply, toolCalls, confirmed, uses, updatedAt }
 *  confirmed=false עד שילד ראשון מאשר ✓; רק שיטה מאושרת מוצגת-ישר.
 */

const path = require("path");
const { DATA_DIR, readJson, writeJson } = require("./store");

const METHODS_DIR = path.join(DATA_DIR, "methods");

function fileFor(topic) {
  const slug = String(topic).trim().replace(/[^\w֐-׿-]+/g, "_").slice(0, 60);
  return path.join(METHODS_DIR, `${slug || "general"}.json`);
}

/** השיטה כפי שהיא (גם אם עוד לא אושרה) — לתצוגת האדמין. null אם אין. */
function get(topic) {
  if (!topic) return null;
  const m = readJson(fileFor(topic), null);
  return m && m.reply ? m : null;
}

/** שיטה שמורה ומאושרת לנושא — או null. */
function getConfirmed(topic) {
  if (!topic) return null;
  const m = readJson(fileFor(topic), null);
  if (m && m.confirmed && m.reply && Array.isArray(m.toolCalls)) return m;
  return null;
}

/** שומר שיטה טרייה (עוד לא מאושרת). דורס שיטה קודמת — האחרונה שנוסתה היא המועמדת. */
function save(topic, { reply, toolCalls }) {
  if (!topic || !reply) return;
  const prev = readJson(fileFor(topic), null);
  writeJson(fileFor(topic), {
    topic: String(topic).slice(0, 80),
    reply: String(reply).slice(0, 2000),
    toolCalls: Array.isArray(toolCalls) ? toolCalls.slice(0, 40) : [],
    confirmed: false,
    uses: prev && prev.uses ? prev.uses : 0,
    updatedAt: new Date().toISOString(),
  });
}

/** הילד לחץ "✓ הבנתי" אחרי ההסבר → השיטה עבדה, מאשרים אותה. */
function confirm(topic) {
  if (!topic) return false;
  const m = readJson(fileFor(topic), null);
  if (!m || !m.reply) return false;
  m.confirmed = true;
  m.updatedAt = new Date().toISOString();
  writeJson(fileFor(topic), m);
  return true;
}

/** שימוש בשיטה שמורה (למונה — לדעת מה עובד הרבה). */
function markUsed(topic) {
  const m = readJson(fileFor(topic), null);
  if (!m) return;
  m.uses = (m.uses || 0) + 1;
  writeJson(fileFor(topic), m);
}

/** מפתח-שיטה: נושא + מספר-השיעור-בנושא — כל שיעור במערך הוא שיטה נפרדת. */
function keyFor(topic, topicLessonN) {
  return `${String(topic || "").trim()}#${Math.max(1, +topicLessonN || 1)}`;
}

module.exports = { METHODS_DIR, get, getConfirmed, save, confirm, markUsed, keyFor };
