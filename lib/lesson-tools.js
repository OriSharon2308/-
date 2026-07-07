/* eslint-disable no-console */

/**
 * זיהוי כלי-הלוח שכל שלב-הוראה (teach) משתמש בהם — למפת-הדרכים באזור-הניהול.
 * המקור: קטלוג-הכלים הקנוני [`lib/board-tools.js`](board-tools.js) (שם + תיאור בעברית).
 * מחזיר לכל כלי: name (מזהה קנוני), label (שם-תצוגה עברי קצר), desc (התיאור המלא).
 */

const { BOARD_TOOLS } = require("./board-tools");

// שם-תצוגה עברי נקי לכל כלי (הצ'יפ מציג את זה; התיאור המלא נחשף בלחיצה).
const NICKNAMES = {
  ten_frame: "לוח-עשר",
  base_ten_builder: "בניית מספר · בסיס-10",
  draw_base_ten: "בלוקי בסיס-10",
  hundred_chart: "לוח-מאה",
  number_line_interactive: "סרגל-מספרים",
  draw_number_line: "ציר-מספרים",
  mult_array: "מערך-כפל",
  draw_array: "מערך-נקודות",
  mult_table: "לוח-הכפל",
  clock_interactive: "שעון אינטראקטיבי",
  draw_clock: "שעון",
  money_coins: "מטבעות וכסף",
  interactive_fraction: "שבר אינטראקטיבי",
  draw_fraction_bar: "מוט-שבר",
  count_objects: "ספירת אובייקטים",
  draw_bar_model: "מודל-מוט",
  draw_polygon: "מצולע",
  draw_circle: "עיגול",
  draw_line: "קו ישר",
  draw_arrow: "חץ",
  draw_point: "נקודה",
  write_text: "כתיבת מספר/טקסט",
  draw_exercise: "תרגיל שלם",
  ask_answer: "תיבת-תשובה",
  clear_board: "ניקוי הלוח",
  render_widget: "מיני-אפליקציה",
  move_item: "הזזת פריט",
  resize_item: "שינוי-גודל",
  remove_item: "הסרת פריט",
};

// גיבוי: שם-תצוגה מתוך תחילת התיאור, אם אין כינוי קבוע.
function heLabel(desc) {
  let s = String(desc || "").trim();
  s = s.replace(/^תבנית מהירה:?\s*/, "").replace(/^תבנית:?\s*/, "");
  let head = (s.match(/^[^—(:.\n]+/) || [s])[0].trim();
  head = head.replace(/\s+[A-Za-z].*$/, "").trim(); // חיתוך זנב באנגלית (value/label…)
  return head || s.slice(0, 24);
}

function labelFor(tool) {
  return NICKNAMES[tool.name] || heLabel(tool.description);
}

// אילו כלים מוזכרים ב-teach, לפי סדר הופעתם בטקסט (בלי כפילויות).
function toolsInTeach(teach) {
  const t = String(teach || "");
  const hits = [];
  const seen = new Set();
  for (const tool of BOARD_TOOLS) {
    if (!tool || !tool.name || seen.has(tool.name)) continue;
    const i = t.indexOf(tool.name);
    if (i >= 0) {
      seen.add(tool.name);
      hits.push({ i, name: tool.name, label: labelFor(tool), desc: String(tool.description || "") });
    }
  }
  hits.sort((a, b) => a.i - b.i);
  return hits.map(({ name, label, desc }) => ({ name, label, desc }));
}

module.exports = { toolsInTeach, heLabel, labelFor };
