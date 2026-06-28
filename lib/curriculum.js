/* eslint-disable no-console */

/**
 * תכנית הלימוד: לכל כיתה — רשימת נושאים.
 * gen = שם המחולל האלגוריתמי (lib/generators). null = נושא שימולא על ידי ה-AI לפי דרישה.
 * levels = רמות הקושי הרלוונטיות לנושא בכיתה הזו.
 * ניתן לערוך בחופשיות בהמשך (הוספת נושאים, שינוי טווחים).
 */
const CURRICULUM = {
  1: {
    grade: "א׳",
    topics: [
      { key: "מספרים עד 100", gen: "numberSeq", levels: [1, 2, 3], params: { max: 100 } },
      {
        key: "חיבור עד 20",
        sub: [
          { key: "חיבור תרגילים", label: "תרגילים", gen: "addition", levels: [1, 2, 3], params: { max: 20 } },
          { key: "חיבור שאלות מילוליות", label: "שאלות מילוליות", gen: "addWord", levels: [2, 3, 4], params: { max: 20 } },
        ],
      },
      {
        key: "חיסור עד 20",
        sub: [
          { key: "חיסור תרגילים", label: "תרגילים", gen: "subtraction", levels: [1, 2, 3], params: { max: 20 } },
          { key: "חיסור שאלות מילוליות", label: "שאלות מילוליות", gen: "subWord", levels: [2, 3, 4], params: { max: 20 } },
        ],
      },
      { key: "חיבור וחיסור עד 100", gen: "addSub100", levels: [3, 4, 5], params: { max: 100 } },
      {
        key: "צורות גאומטריות",
        sub: [
          { key: "ספירת צלעות", gen: "shapes", levels: [1, 2], params: { mode: "sides" } },
          { key: "ספירת קודקודים", gen: "shapes", levels: [2, 3], params: { mode: "vertices" } },
          { key: "ציור צורות", gen: "shapeCreate", levels: [1, 2, 3], repeatable: true },
        ],
      },
      { key: "כסף ומטבעות", gen: "money", levels: [2, 3] },
      { key: "שעון", gen: "clock", levels: [1, 2] },
    ],
  },
  2: {
    grade: "ב׳",
    topics: [
      { key: "חיבור", gen: "addition", levels: [2, 3, 4], params: { max: 100 } },
      { key: "חיסור", gen: "subtraction", levels: [2, 3, 4], params: { max: 100 } },
      { key: "כפל", gen: "multiplication", levels: [1, 2], params: { max: 5 } },
    ],
  },
  3: {
    grade: "ג׳",
    topics: [
      { key: "כפל", gen: "multiplication", levels: [2, 3, 4], params: { max: 10 } },
      { key: "חילוק", gen: "division", levels: [2, 3, 4], params: { max: 10 } },
      { key: "חיבור", gen: "addition", levels: [3, 4, 5], params: { max: 1000 } },
      { key: "חיסור", gen: "subtraction", levels: [3, 4, 5], params: { max: 1000 } },
    ],
  },
  4: {
    grade: "ד׳",
    topics: [
      { key: "כפל", gen: "multiplication", levels: [3, 4, 5], params: { max: 12, twoDigit: true } },
      { key: "חילוק", gen: "division", levels: [3, 4, 5], params: { max: 12 } },
      { key: "שברים", gen: null, levels: [1, 2, 3] },
      { key: "שאלות מילוליות", gen: null, levels: [1, 2, 3] },
    ],
  },
  5: {
    grade: "ה׳",
    topics: [
      { key: "אחוזים", gen: "percent", levels: [1, 2, 3] },
      { key: "שברים", gen: null, levels: [2, 3, 4] },
      { key: "מספרים עשרוניים", gen: null, levels: [1, 2, 3] },
    ],
  },
  6: {
    grade: "ו׳",
    topics: [
      { key: "אחוזים", gen: "percent", levels: [2, 3, 4] },
      { key: "מבוא לנעלם", gen: "equation", levels: [1, 2, 3] },
      { key: "שברים מתקדם", gen: null, levels: [3, 4, 5] },
      { key: "יחס ופרופורציה", gen: null, levels: [2, 3, 4] },
    ],
  },
};

/** ממיר תווית כיתה ("ו׳") למספר (6), אם אפשר. */
const GRADE_LABEL_TO_NUM = { "א׳": 1, "ב׳": 2, "ג׳": 3, "ד׳": 4, "ה׳": 5, "ו׳": 6, "ז׳": 7, "ח׳": 8, "ט׳": 9, "י׳": 10, "יא׳": 11, "יב׳": 12 };

// השוואה לפי אותיות הכיתה בלבד — סובלני לגרש עברי (׳), אפוסטרוף ('), גרשיים ("), רווחים והמילה "כיתה".
const GRADE_LETTERS_TO_NUM = { "א": 1, "ב": 2, "ג": 3, "ד": 4, "ה": 5, "ו": 6, "ז": 7, "ח": 8, "ט": 9, "י": 10, "יא": 11, "יב": 12 };

function gradeToNum(label) {
  if (label == null) return null;
  const raw = String(label).trim();
  // מסירים גרש/אפוסטרוף/גרשיים/רווחים ואת המילה "כיתה" — משאירים רק את אותיות הכיתה
  const letters = raw.replace(/כיתה/g, "").replace(/[\s'’"׳״]/g, "").trim();
  return GRADE_LABEL_TO_NUM[raw] || GRADE_LETTERS_TO_NUM[letters] || null;
}

/** רשימת הנושאים לתצוגה ללקוח: כל נושא עם מפתחות תתי-הנושאים שלו (אם יש). */
function topicsForApi(gradeNum) {
  const g = CURRICULUM[gradeNum];
  if (!g) return [];
  return g.topics.map((t) => ({
    key: t.key,
    sub: Array.isArray(t.sub) ? t.sub.map((s) => ({ key: s.key, label: s.label || s.key })) : [],
  }));
}

/** מוצא את ה"עלה" (נושא עם מחולל) לפי מפתח — מחפש גם בתוך תתי-נושאים. */
function findLeaf(gradeNum, key) {
  const g = CURRICULUM[gradeNum];
  if (!g) return null;
  for (const t of g.topics) {
    if (t.key === key && !t.sub) return t;
    if (Array.isArray(t.sub)) {
      const s = t.sub.find((x) => x.key === key);
      if (s) return s;
    }
    // אם ביקשו נושא-אב שיש לו תתי-נושאים — מחזירים את הראשון כברירת מחדל
    if (t.key === key && Array.isArray(t.sub) && t.sub.length) return t.sub[0];
  }
  return null;
}

/** כל ה"עלים" (נושאים עם מחולל) בכיתה — לשיטוח בזריעת המאגר. */
function leafTopics(gradeNum) {
  const g = CURRICULUM[gradeNum];
  if (!g) return [];
  const out = [];
  for (const t of g.topics) {
    if (Array.isArray(t.sub) && t.sub.length) out.push(...t.sub);
    else out.push(t);
  }
  return out;
}

module.exports = {
  CURRICULUM,
  gradeToNum,
  GRADE_LABEL_TO_NUM,
  topicsForApi,
  findLeaf,
  leafTopics,
};
