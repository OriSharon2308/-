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
      // learn:false — הנושא נשאר באזור התרגול (יש לו מחולל שאלות), אבל אינו מוצע
      // באזור הלמידה: שיעורי-הזהב שלו שייכים לכיתה ב׳, וילד בכיתה א׳ שהיה בוחר
      // אותו כאן לא היה מקבל שיעור מוכן אלא נופל ל-AI.
      { key: "חיבור וחיסור עד 100", gen: "addSub100", levels: [3, 4, 5], params: { max: 100 }, learn: false },
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
    // הנושאים מיושרים לשמות שבאזור-הלמידה (lib/course-plans/grade-2), כדי שילד
    // שסיים שיעור ימצא בתרגול נושא באותו שם — ולא רשימה קצרה ולא-קשורה.
    topics: [
      { key: "המספרים הטבעיים עד 1000", gen: "numbers1000", levels: [1, 2, 3, 4, 5] },
      {
        key: "חיבור וחיסור עד 100",
        sub: [
          { key: "חיבור עד 100", label: "חיבור", gen: "addition", levels: [2, 3, 4], params: { max: 100 } },
          { key: "חיסור עד 100", label: "חיסור", gen: "subtraction", levels: [2, 3, 4], params: { max: 100 } },
          { key: "מעורב עד 100", label: "מעורב", gen: "addSub100", levels: [3, 4, 5], params: { max: 100 } },
        ],
      },
      {
        key: "כפל וחילוק",
        sub: [
          { key: "כפל ב-2,5,10", label: "כפל", gen: "multiplication", levels: [1, 2, 3], params: { max: 10 } },
          { key: "חילוק ב-2,5,10", label: "חילוק", gen: "division", levels: [1, 2, 3], params: { max: 10 } },
        ],
      },
      {
        key: "בעיות מילוליות",
        sub: [
          { key: "בעיות חיבור", label: "חיבור", gen: "addWord", levels: [2, 3, 4], params: { max: 100 } },
          { key: "בעיות חיסור", label: "חיסור", gen: "subWord", levels: [2, 3, 4], params: { max: 100 } },
        ],
      },
      {
        key: "צורות גאומטריות",
        sub: [
          { key: "ספירת צלעות ב׳", label: "צלעות", gen: "shapes", levels: [1, 2], params: { mode: "sides" } },
          { key: "ספירת קודקודים ב׳", label: "קודקודים", gen: "shapes", levels: [2, 3], params: { mode: "vertices" } },
          { key: "ציור צורות ב׳", label: "ציור", gen: "shapeCreate", levels: [1, 2, 3], repeatable: true },
        ],
      },
      { key: "מדידות אורך", gen: "lengthMeasure", levels: [1, 2, 3, 4, 5] },
      { key: "גופים ונפח", gen: "solidsCount", levels: [1, 2, 3] },
      { key: "זמן", gen: "clock", levels: [1, 2, 3, 4] },
      { key: "חקר נתונים", gen: "dataRead", levels: [1, 2, 3, 4] },
    ],
  },
  3: {
    grade: "ג׳",
    // מיושר לשמות שבאזור-הלמידה (lib/course-plans/grade-3).
    topics: [
      { key: "המספרים עד רבבה", gen: "numbers10k", levels: [1, 2, 3, 4, 5] },
      {
        key: "חיבור וחיסור עד רבבה",
        sub: [
          { key: "חיבור עד רבבה", label: "חיבור", gen: "addition", levels: [3, 4, 5], params: { max: 10000 } },
          { key: "חיסור עד רבבה", label: "חיסור", gen: "subtraction", levels: [3, 4, 5], params: { max: 10000 } },
        ],
      },
      { key: "לוח הכפל המלא", gen: "multiplication", levels: [2, 3, 4], params: { max: 10 } },
      {
        key: "חילוק ושארית",
        sub: [
          { key: "חילוק מדויק", label: "חילוק", gen: "division", levels: [2, 3, 4], params: { max: 10 } },
          { key: "חילוק עם שארית", label: "עם שארית", gen: "remainderDiv", levels: [1, 2, 3, 4] },
        ],
      },
      { key: "חוק הפילוג וסדר הפעולות", gen: "distributive", levels: [1, 2, 3, 4] },
      { key: "זוויות ומשולשים", gen: "anglesTriangles", levels: [1, 2, 3, 4] },
      { key: "שטח מלבן ותיבות", gen: "rectArea", levels: [1, 2, 3, 4] },
      { key: "זמן", gen: "clock", levels: [2, 3, 4] },
      { key: "חקר נתונים", gen: "dataRead", levels: [2, 3, 4] },
    ],
  },
  4: {
    grade: "ד׳",
    // מיושר לשמות שבאזור-הלמידה (lib/course-plans/grade-4). "שברים" ו"שאלות
    // מילוליות" היו gen:null — כלומר נושאים שלא ייצרו שום שאלה.
    topics: [
      { key: "המספרים עד מיליון", gen: "numbersMillion", levels: [1, 2, 3, 4] },
      {
        key: "כפל וחילוק רב-ספרתי",
        sub: [
          { key: "כפל רב-ספרתי", label: "כפל", gen: "multiplication", levels: [3, 4, 5], params: { max: 12, twoDigit: true } },
          { key: "חילוק רב-ספרתי", label: "חילוק", gen: "division", levels: [3, 4, 5], params: { max: 12 } },
        ],
      },
      { key: "השבר הפשוט", gen: "simpleFraction", levels: [1, 2, 3, 4, 5] },
      { key: "ראשוניים, התחלקות וחזקות", gen: "primesFactors", levels: [1, 2, 3, 4] },
      { key: "סדר פעולות, אומדן ותכונות המספרים", gen: "distributive", levels: [2, 3, 4] },
      { key: "שאלות מילוליות", gen: "wordProblems4", levels: [1, 2, 3, 4] },
      { key: "צורות וגופים", gen: "solidsCount", levels: [2, 3] },
      {
        key: "מדידות — שטח, היקף ונפח",
        sub: [
          { key: "שטח והיקף ד׳", label: "שטח והיקף", gen: "rectArea", levels: [2, 3, 4] },
          { key: "נפח תיבה", label: "נפח", gen: "volumeBox", levels: [1, 2, 3] },
        ],
      },
      {
        key: "חקר נתונים וניתוח סיכויים",
        sub: [
          { key: "קריאת דיאגרמה ד׳", label: "דיאגרמות", gen: "dataRead", levels: [2, 3, 4] },
          { key: "ניתוח סיכויים", label: "סיכויים", gen: "probability", levels: [1, 2, 3, 4] },
        ],
      },
    ],
  },
  5: {
    grade: "ה׳",
    // מיושר לשמות שבאזור-הלמידה (lib/course-plans/grade-5). "שברים" ו"מספרים
    // עשרוניים" היו gen:null — נושאים שלא ייצרו שום שאלה.
    topics: [
      { key: "שברים פשוטים — משמעויות וייצוגים", gen: "simpleFraction", levels: [1, 2, 3, 4, 5] },
      { key: "הרחבה, צמצום והשוואת שברים", gen: "fractionCompare", levels: [1, 2, 3, 4] },
      { key: "חיבור וחיסור שברים ובעיות מילוליות", gen: "fractionAddSub", levels: [1, 2, 3] },
      { key: "השבר העשרוני — משמעות וערך מקום", gen: "decimalPlace", levels: [1, 2, 3] },
      { key: "פעולות בשברים עשרוניים", gen: "decimalOps", levels: [1, 2, 3, 4] },
      { key: "מבוא לאחוזים", gen: "percent", levels: [1, 2, 3] },
      {
        key: "מספרים טבעיים ופעולות חשבון",
        sub: [
          { key: "כפל ה׳", label: "כפל", gen: "multiplication", levels: [4, 5], params: { max: 12, twoDigit: true } },
          { key: "חילוק ה׳", label: "חילוק", gen: "division", levels: [4, 5], params: { max: 12 } },
          { key: "סדר פעולות ה׳", label: "סדר פעולות", gen: "distributive", levels: [3, 4] },
        ],
      },
      { key: "בעיות מילוליות רב-שלביות (אינטגרטיביות)", gen: "wordProblems4", levels: [2, 3, 4] },
      { key: "זוויות ומרובעים", gen: "anglesTriangles", levels: [2, 3, 4] },
      { key: "מדידת שטח והיקף", gen: "rectArea", levels: [2, 3, 4] },
      {
        key: "חקר נתונים וממוצע",
        sub: [
          { key: "קריאת דיאגרמה ה׳", label: "דיאגרמות", gen: "dataRead", levels: [3, 4] },
          { key: "ממוצע", label: "ממוצע", gen: "average", levels: [1, 2, 3] },
        ],
      },
    ],
  },
  6: {
    grade: "ו׳",
    // מיושר לשמות שבאזור-הלמידה (lib/course-plans/grade-6).
    topics: [
      { key: "כפל שברים", gen: "fractionMulDiv", levels: [1, 2] },
      { key: "חילוק שברים", gen: "fractionMulDiv", levels: [3, 4] },
      { key: "כפל וחילוק עשרוניים", gen: "decimalOps", levels: [3, 4] },
      { key: "אחוזים", gen: "percent", levels: [2, 3, 4] },
      { key: "יחס וקנה מידה", gen: "ratioScale", levels: [1, 2, 3] },
      { key: "מעגל ועיגול", gen: "circleCalc", levels: [1, 2, 3] },
      {
        key: "גופים ונפחים",
        sub: [
          { key: "נפח ו׳", label: "נפח", gen: "volumeBox", levels: [1, 2, 3] },
          { key: "פאות וקדקודים ו׳", label: "גופים", gen: "solidsCount", levels: [2, 3] },
        ],
      },
      {
        key: "חקר נתונים והסתברות",
        sub: [
          { key: "ממוצע ו׳", label: "ממוצע", gen: "average", levels: [2, 3] },
          { key: "הסתברות ו׳", label: "הסתברות", gen: "probability", levels: [2, 3, 4] },
        ],
      },
      {
        key: "שאלות אינטגרטיביות ומספרים טבעיים",
        sub: [
          { key: "בעיות רב-שלביות ו׳", label: "בעיות", gen: "wordProblems4", levels: [3, 4] },
          { key: "מבוא לנעלם", label: "נעלם", gen: "equation", levels: [1, 2, 3] },
        ],
      },
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

/** רשימת הנושאים לתצוגה ללקוח: כל נושא עם מפתחות תתי-הנושאים שלו (אם יש).
    levels/repeatable נשלחים כדי שטבעת-ההתקדמות תדע את סולם-הרמות של הנושא
    גם בכיתות שאין להן מאגר-שאלות מקומי. */
function topicsForApi(gradeNum, area) {
  // אזור הלמידה מציג את מערך-הכיתה המלא (lib/course-plans) — מיושר לתכנית משרד החינוך.
  // אזור התרגול נשאר על נושאי-המאגר שיש להם מחולל שאלות.
  if (area === "learn") {
    try {
      const keys = require("./course").topicsForGrade(gradeNum);
      if (keys.length) return keys.map((k) => ({ key: k, levels: [], repeatable: false, sub: [] }));
    } catch (e) { /* אין מערך לכיתה — נופלים לרשימה הרגילה */ }
  }
  const g = CURRICULUM[gradeNum];
  if (!g) return [];
  return g.topics.filter((t) => !(area === "learn" && t.learn === false)).map((t) => ({
    key: t.key,
    levels: Array.isArray(t.levels) ? t.levels : [],
    repeatable: !!t.repeatable,
    sub: Array.isArray(t.sub)
      ? t.sub.map((s) => ({
          key: s.key,
          label: s.label || s.key,
          levels: Array.isArray(s.levels) ? s.levels : [],
          repeatable: !!s.repeatable,
        }))
      : [],
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
