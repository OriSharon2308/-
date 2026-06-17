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
function generateFreshAlgo(gradeNum, topic, entry, level, exact = false) {
  const gen = GENERATORS[entry.gen];
  if (!gen) return null;
  const existing = bank.existingKeys(gradeNum, topic);
  const tries = exact ? 400 : 80; // בנעילה על רמה צריך יותר ניסיונות כדי לפגוע ברמה המדויקת
  for (let i = 0; i < tries; i++) {
    const q = gen(level, entry.params || {});
    if (exact && (q.difficulty || 1) !== level) continue; // רק רמה מדויקת
    if (!existing.has(bank.qKey(q))) {
      return bank.addQuestion(gradeNum, topic, { ...q, source: "algo" });
    }
  }
  return null; // מרחב המחולל מוצה (או שאין שאלות ברמה הזו)
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
  const exact = !!payload.exact; // נעילה על רמה — רק שאלות מהרמה המדויקת
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
  const repeatable = !!(entry && entry.repeatable); // נושא שמותר לחזור עליו (למשל ציור צורות)

  // 1) מהמאגר — חינם ומיידי. excludeIds = שאלות שהתלמיד כבר קיבל (לא חוזרות).
  const fromBank = bank.getQuestion(gradeNum, topic, level, payload.excludeIds || [], exact);
  if (fromBank) {
    return { problem: fromBank, mode: "bank", topic, gradeNum, repeatable };
  }

  // נושא מחזורי: מותר לחזור — מגישים שוב מהמאגר (בלי מיצוי) במקום "להיתקע"
  if (repeatable) {
    const again = bank.getQuestion(gradeNum, topic, level, [], exact);
    if (again) return { problem: again, mode: "bank", topic, gradeNum, repeatable };
  }

  // 2) נושא עם מחולל — המתמטיקאי תמיד מכין שאלה הבאה, בלי "מיצוי":
  if (hasGen) {
    // א. מייצר חדשה ברמה המדויקת (אם נעול)
    let fresh = generateFreshAlgo(gradeNum, topic, entry, level, exact);
    // ב. אם מרחב הרמה המדויקת מוצה — מרפים: מייצר חדשה מרמה קרובה (כך לא נתקעים)
    if (!fresh && exact) fresh = generateFreshAlgo(gradeNum, topic, entry, level, false);
    if (fresh) return { problem: fresh, mode: "algo", topic, gradeNum, repeatable };
    // ג. אי אפשר לייצר חדשה — מגישים שאלה כלשהי שעוד לא נראתה (לא מדויקת)
    let any = bank.getQuestion(gradeNum, topic, level, payload.excludeIds || [], false);
    // ד. הכל כבר נראה — מחזור אחרון כדי לא להיתקע (קורה רק כשבאמת אזל הכל)
    if (!any) any = bank.getQuestion(gradeNum, topic, level, [], false);
    if (any) return { problem: any, mode: "bank", topic, gradeNum, repeatable };
    return { problem: null, mode: "exhausted", topic, gradeNum, repeatable };
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
