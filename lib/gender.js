/* eslint-disable no-console */

// ממיר ניסוח עם לוכסן (בן/בת) לצורה לפי מין התלמיד — בלי הסרבול של "צייר/י".
// gender: "female" → צורת נקבה; אחרת (male/לא ידוע) → צורת זכר.

// לכל אסימון: [צורת זכר, צורת נקבה]
const VERBS = {
  "צייר/י": ["צייר", "ציירי"],
  "כתוב/י": ["כתוב", "כתבי"],
  "סמנ/י": ["סמן", "סמני"],
  "הזז/י": ["הזז", "הזיזי"],
  "כוון/י": ["כוון", "כווני"],
  "ספור/י": ["ספור", "ספרי"],
  "וספר/י": ["וספר", "וספרי"],
  "בחר/י": ["בחר", "בחרי"],
  "מלא/י": ["מלא", "מלאי"],
  "מצא/י": ["מצא", "מצאי"],
  "חבר/י": ["חבר", "חברי"],
  "חשב/י": ["חשב", "חשבי"],
  "והוסף/י": ["והוסף", "והוסיפי"],
  "הוסף/י": ["הוסף", "הוסיפי"],
  "הורד/י": ["הורד", "הורידי"],
  "התחל/י": ["התחל", "התחילי"],
  "וחזור/י": ["וחזור", "וחזרי"],
  "ולחצ/י": ["ולחץ", "ולחצי"],
  "לחצ/י": ["לחץ", "לחצי"],
  "סגר/י": ["סגור", "סגרי"],
  "עבור/י": ["עבור", "עברי"],
  "קרא/י": ["קרא", "קראי"],
  "שים/י": ["שים", "שימי"],
  "נסה/י": ["נסה", "נסי"],
  "בדוק/י": ["בדוק", "בדקי"],
  "תן/י": ["תן", "תני"],
  "את/ה": ["אתה", "את"],
  "יכול/ה": ["יכול", "יכולה"],
  "בוא/י": ["בוא", "בואי"],
  "אלוף/ה": ["אלוף", "אלופה"],
  "מוכן/ה": ["מוכן", "מוכנה"],
  "ברוך/ה": ["ברוך", "ברוכה"],
  "הבא/ה": ["הבא", "הבאה"],
  "תאהב/י": ["תאהב", "תאהבי"],
  "חזק/ה": ["חזק", "חזקה"],
  "מתקדם/ת": ["מתקדם", "מתקדמת"],
};
// מאריך-קודם כדי שאסימונים מוכלים (הוסף/י בתוך והוסף/י) לא יתנגשו
const TOKENS = Object.keys(VERBS).sort((a, b) => b.length - a.length);

function genderize(text, gender) {
  if (text == null) return text;
  const idx = gender === "female" ? 1 : 0;
  let out = String(text);
  for (const tok of TOKENS) {
    if (out.indexOf(tok) !== -1) out = out.split(tok).join(VERBS[tok][idx]);
  }
  return out;
}

// ממגדר אובייקט שאלה (טקסט, רמזים, הסבר) במקום
function genderizeProblem(problem, gender) {
  if (!problem) return problem;
  if (typeof problem.text === "string") problem.text = genderize(problem.text, gender);
  if (typeof problem.explanation === "string") problem.explanation = genderize(problem.explanation, gender);
  if (Array.isArray(problem.hints)) problem.hints = problem.hints.map((h) => genderize(h, gender));
  return problem;
}

module.exports = { genderize, genderizeProblem };
