/* eslint-disable no-console */

/**
 * ────────────────────────────────────────────────────────────────────────
 *  שאלות מותאמות-אישית — בדיוק בסגנון שהילד נכשל בו
 * ────────────────────────────────────────────────────────────────────────
 *
 *  המחוללים (lib/generators) מייצרים שאלות נכונות ומגוונות, אבל הם עיוורים
 *  לילד המסוים: הם לא יודעים ש*הוא* נופל דווקא בחיסור עם פריטה, או דווקא
 *  כשהשאלה מנוסחת הפוך. המודול הזה סוגר את הפער — הוא קורא את הטעויות
 *  האחרונות של הילד ומבקש מהמורה שאלה חדשה באותו *סגנון* בדיוק.
 *
 *  ⚠️  כבוי כברירת מחדל. להפעלה: VELA_TARGETED_QUESTIONS=1
 *
 *  למה שער-אימות ולא סתם לסמוך על המודל: שאלת-תרגול שגויה גרועה פי כמה
 *  משאלה משעממת — הילד עונה נכון, נפסל, ומאבד אמון. לכן כל שאלה שחוזרת
 *  מהמודל עוברת ארבע בדיקות *לפני* שהילד רואה אותה, וכשלון באחת מהן
 *  מבטל את השאלה ומחזיר null (והמערכת נופלת חזרה למחולל האלגוריתמי).
 */

const llm = require("./llm");
const learnerProfile = require("./learner-profile");

/** מופעל רק בהצבה מפורשת של משתנה-סביבה. ברירת המחדל: כבוי. */
function isEnabled() {
  return process.env.VELA_TARGETED_QUESTIONS === "1";
}

/** תקרת-חישוב לכל כיתה — שאלה שחורגת ממנה אינה מתאימה לילד. */
const GRADE_MAX = { 1: 20, 2: 100, 3: 10000, 4: 1000000, 5: 1000000, 6: 1000000 };

/**
 * מחשבון בטוח לביטוי אריתמטי פשוט. מקבל רק ספרות, נקודה, סוגריים
 * ו-+ − × : / * — ולכן אי-אפשר להריץ דרכו קוד. זה הלב של שער-האימות:
 * המודל מחזיר גם ביטוי-בדיקה, ואנחנו מחשבים אותו בעצמנו במקום להאמין לו.
 */
function safeEval(expr) {
  const clean = String(expr || "").replace(/×/g, "*").replace(/[:÷]/g, "/").replace(/−/g, "-").trim();
  if (!clean || clean.length > 80) return null;
  if (!/^[0-9+\-*/().\s]+$/.test(clean)) return null;
  try {
    // eslint-disable-next-line no-new-func
    const v = Function(`"use strict";return (${clean});`)();
    return typeof v === "number" && isFinite(v) ? v : null;
  } catch (e) {
    return null;
  }
}

/** שווה בערך — סובלני לעיגול עשרוני, לא לטעות אמיתית. */
function numEq(a, b) {
  return Math.abs(Number(a) - Number(b)) < 1e-6;
}

/**
 * ארבע בדיקות שכל שאלה חייבת לעבור. מחזיר null אם משהו נכשל —
 * ואז המערכת מגישה שאלה מהמחולל במקום.
 */
function verify(q, gradeNum) {
  if (!q || typeof q !== "object") return null;

  const text = String(q.text || "").trim();
  if (text.length < 8 || text.length > 160) return null;

  // 1. התשובה חייבת להיות מספר
  const answer = Number(q.answer);
  if (!isFinite(answer)) return null;

  // 2. ביטוי-הבדיקה חייב להסתדר עם התשובה — כאן נופלת שאלה שהמודל טעה בה
  const computed = safeEval(q.checkExpr);
  if (computed === null || !numEq(computed, answer)) return null;

  // 3. בתחום-החישוב של הכיתה
  const max = GRADE_MAX[gradeNum] || 1000;
  if (Math.abs(answer) > max) return null;
  for (const m of text.match(/\d+(\.\d+)?/g) || []) {
    if (Math.abs(Number(m)) > max) return null;
  }

  // 4. רמז שלא מסגיר את התשובה
  const hints = (Array.isArray(q.hints) ? q.hints : [])
    .map((h) => String(h || "").trim())
    .filter((h) => h && h.length <= 220);
  if (!hints.length) return null;
  const ansStr = String(answer);
  if (hints.some((h) => new RegExp(`(^|[^0-9])${ansStr}([^0-9]|$)`).test(h))) return null;

  return {
    id: "tq_" + Math.random().toString(36).slice(2, 10),
    text,
    answer,
    difficulty: Math.max(1, Math.min(6, Number(q.difficulty) || 3)),
    hints,
    explanation: String(q.explanation || "").trim().slice(0, 240) || `התשובה היא ${answer}.`,
    targeted: true,
  };
}

/**
 * הסיגנל: האבחון של הנושא — הקצב, המגמה, ובמה בדיוק הילד תקוע.
 * בלי משפט-אבחון אין על מה לבסס התאמה, ואז עדיף מחולל: חינם ובטוח.
 */
function struggleSignal(userId, topic) {
  const d = learnerProfile.topicDiagnosis(userId, topic);
  if (!d) return null;
  const stuck = d.status === learnerProfile.STATUS.STRUGGLING || d.pace === "stuck" || d.pace === "slow";
  if (!stuck || !d.struggle) return null;
  return d;
}

/**
 * מייצר שאלה בסגנון שהילד נכשל בו. מחזיר null בכל מקרה של ספק —
 * כבוי, אין סיגנל, המודל לא זמין, או השאלה לא עברה אימות.
 */
async function makeTargeted({ userId, topic, gradeNum, level = 2 } = {}) {
  if (!isEnabled() || !userId || !topic || !llm.isEnabled()) return null;

  const sig = struggleSignal(userId, topic);
  if (!sig) return null;

  const user =
    `נושא: ${topic}\nרמה: ${level}\n` +
    `סטטוס: ${sig.statusHe} · ${sig.paceHe}` +
    (sig.accuracy != null ? ` · דיוק ${sig.accuracy}%` : "") +
    (sig.trend === "down" ? " · המגמה יורדת" : sig.trend === "up" ? " · המגמה עולה" : "") + `\n` +
    (sig.repr ? `הייצוג שעבד לו בעבר: ${sig.repr}\n` : "") +
    (sig.note ? `הערת-מורה: ${sig.note}\n` : "") +
    `\n**במה הוא מתקשה:** ${sig.struggle}\n\n` +
    `כתוב שאלה אחת שמאמנת בדיוק את הנקודה הזו — לא את הנושא בכללותו.`;

  let raw;
  try {
    raw = await llm.complete({
      system,
      messages: [{ role: "user", content: user }],
      maxTokens: 500,
      userId,
      label: "targeted-question",
    });
  } catch (e) {
    return null;
  }

  const m = String(raw && raw.text ? raw.text : raw || "").match(/\{[\s\S]*\}/);
  if (!m) return null;
  let parsed;
  try { parsed = JSON.parse(m[0]); } catch (e) { return null; }

  return verify(parsed, gradeNum);
}

module.exports = { isEnabled, makeTargeted, verify, safeEval, struggleSignal };
