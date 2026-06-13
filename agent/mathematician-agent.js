/* eslint-disable no-console */

// המתמטיקאי: בוחר שאלה למאגר לפי כיתה+נושא+רמה.
// עדיפות: מאגר (חינם, מיידי) → מחולל אלגוריתמי → AI (ושומר למאגר לתלמידים הבאים).

const llm = require("../lib/llm");
const bank = require("../lib/bank");
const { CURRICULUM, gradeToNum, findLeaf } = require("../lib/curriculum");
const { GENERATORS, uid } = require("../lib/generators");
const reference = require("../lib/reference");

function topicEntry(gradeNum, topicKey) {
  return findLeaf(gradeNum, topicKey);
}

// ייצור שאלה אלגוריתמית *חדשה* שאין כמותה במאגר (לגיוון אחרי שהתלמיד מיצה את הקיים).
// מחזיר את השאלה השמורה, או null אם מרחב המחולל מוצה (כל הנוסחים כבר קיימים).
function generateFreshAlgo(gradeNum, topic, entry, level) {
  const gen = GENERATORS[entry.gen];
  if (!gen) return null;
  const existing = bank.existingKeys(gradeNum, topic);
  for (let i = 0; i < 80; i++) {
    const q = gen(level, entry.params || {});
    if (!existing.has(bank.qKey(q))) {
      return bank.addQuestion(gradeNum, topic, { ...q, source: "algo" });
    }
  }
  return null; // מרחב המחולל מוצה
}

// אם אין כיתה ידועה — ניחוש סביר לפי הרמה
function defaultGradeNum(level) {
  return Math.min(6, Math.max(1, Math.ceil((level || 1) / 1.5)));
}

function legacyProblem(level) {
  const g = GENERATORS.addition(level || 1, { max: 20 });
  return {
    id: uid(),
    text: g.text,
    answer: g.answer,
    hints: g.hints,
    explanation: g.explanation,
    level: g.difficulty || level || 1,
  };
}

/** ה-AI יוצר שאלה לנושא שאין לו מחולל אלגוריתמי (שברים, שאלות מילוליות וכו'). */
async function aiGenerate(gradeNum, topicKey, level) {
  if (!llm.isEnabled()) return null;
  const gradeLabel = CURRICULUM[gradeNum] ? CURRICULUM[gradeNum].grade : String(gradeNum);
  const system = "אתה מורה למתמטיקה שבונה תרגילים לילדים. החזר JSON תקין בלבד, בלי טקסט נוסף.";
  const refHint = reference.levelHint(gradeNum);
  const refBlock = refHint
    ? `\n\nלהלן דוגמאות לרמת החומר הנכונה לכיתה זו — התאם/י את הקושי והניסוח לרוח הדוגמאות (אל תעתיק/י אותן מילה במילה):\n"""\n${refHint}\n"""`
    : "";
  const user = `בנה תרגיל יחיד בעברית לכיתה ${gradeLabel}, נושא "${topicKey}", רמת קושי ${level} (1=קל, 5=קשה).
החזר אך ורק JSON:
{"text":"נוסח השאלה","answer":<מספר או מחרוזת כמו "3/4">,"hints":["רמז קטן","רמז גדול יותר"],"explanation":"פתרון קצר שלב-אחר-שלב"}
ודא שהתשובה נכונה ומדויקת. בלי שום טקסט מחוץ ל-JSON.${refBlock}`;

  let raw;
  try {
    raw = await llm.complete({ system, messages: [{ role: "user", content: user }], maxTokens: 500 });
  } catch {
    return null;
  }
  if (!raw) return null;

  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  let obj;
  try {
    obj = JSON.parse(match[0]);
  } catch {
    return null;
  }
  if (!obj || typeof obj.text !== "string" || obj.answer == null) return null;

  return {
    text: obj.text.trim(),
    answer: obj.answer,
    hints: Array.isArray(obj.hints) ? obj.hints.slice(0, 3) : [],
    explanation: typeof obj.explanation === "string" ? obj.explanation : "",
    level,
    source: "ai",
  };
}

/**
 * בוחר/יוצר שאלה.
 * payload: { gradeNum?, grade?, topic?(string), level?, excludeIds?, student? }
 * מחזיר { problem, mode: "bank"|"algo"|"ai"|"local", topic, gradeNum }.
 */
async function mathematicianCreate(payload = {}) {
  const level = payload.level ?? payload.student?.level ?? 1;
  let gradeNum = payload.gradeNum || gradeToNum(payload.grade) || null;
  let topic = typeof payload.topic === "string" ? payload.topic : null;

  if (!gradeNum) gradeNum = defaultGradeNum(level);
  if (!topic) {
    const g = CURRICULUM[gradeNum];
    topic = g && g.topics[0] ? g.topics[0].key : null;
  }
  if (!topic) {
    return { problem: legacyProblem(level), mode: "local", topic: null, gradeNum };
  }

  const entry = topicEntry(gradeNum, topic);
  const hasGen = !!(entry && entry.gen && GENERATORS[entry.gen]);

  // 1) מהמאגר — חינם ומיידי. excludeIds = שאלות שהתלמיד כבר קיבל (לא חוזרות).
  const fromBank = bank.getQuestion(gradeNum, topic, level, payload.excludeIds || []);
  if (fromBank) {
    return { problem: fromBank, mode: "bank", topic, gradeNum };
  }

  // 2) נושא עם מחולל: המאגר מוצה לתלמיד → מייצרים שאלה חדשה *קדימה* (גיוון אמיתי).
  //    נושא ויזואלי סופי שמיצה את כל הצירופים → איתות מיצוי (השרת יתחיל מחזור חדש).
  //    לא נופלים ל-AI בנושאים האלה — המחולל מדויק והוא היחיד שיודע לצרף שרטוט.
  if (hasGen) {
    const fresh = generateFreshAlgo(gradeNum, topic, entry, level);
    if (fresh) return { problem: fresh, mode: "algo", topic, gradeNum };
    return { problem: null, mode: "exhausted", topic, gradeNum };
  }

  // 3) נושא בלי מחולל (שברים, שאלות מילוליות) → AI יוצר ושומר למאגר
  const ai = await aiGenerate(gradeNum, topic, level);
  if (ai) {
    const stored = bank.addQuestion(gradeNum, topic, ai);
    return { problem: stored, mode: "ai", topic, gradeNum };
  }

  // 4) נפילה אחרונה
  return { problem: legacyProblem(level), mode: "local", topic, gradeNum };
}

module.exports = { mathematicianCreate };
