/* eslint-disable no-console */

/**
 * ────────────────────────────────────────────────────────────────────────
 *  סידור-פריסה: השאלה לצד הוויזואל, לא מתחתיו
 * ────────────────────────────────────────────────────────────────────────
 *
 *  כשתרגיל מקבל x,y מפורשים הוא ננעל למקום שהמחבר בחר — ולרוב זה יצא
 *  *מתחת* לכלי-העזר או בתוכו. המנוע כבר יודע לעשות את זה נכון לבד:
 *  תרגיל בלי x,y נכנס לטור בצד ימין (RTL), וכך נוצרת פריסה של שתי
 *  עמודות — עזר משמאל, שאלות מימין.
 *
 *  לכן התיקון הוא *להסיר* מיקום ולא להוסיף: מורידים x,y מהתרגילים,
 *  ומזיזים את הוויזואל והכיתובים שלו לחצי השמאלי כדי לפנות לטור מקום.
 *
 *  חל רק על guided/independent — מסכי-הוראה אין בהם תרגילים.
 *  הרצה:  node scripts/fix-layout.js 3 [4 5 6]   (--dry לבדיקה בלבד)
 */

const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");

const NON_VISUAL = new Set([
  "draw_exercise", "ask_answer", "clear_board", "remember_note",
  "move_item", "resize_item", "remove_item",
]);
// הגבול שאליו נדחס העזר. 360 ולא 500: המנוע מציב משפט עברי כך שהוא מתחיל
// בקצה הימני ותיבת-התשובה בסופו — ומשפט ארוך דוחף את התיבה עמוק שמאלה.
// 360 משאיר מספיק מקום גם לשאלה ארוכה בלי שהתיבה תנחת על העזר.
const RIGHT_COL_X = 360;

/** האם לפריט יש תיבה משלו (ווידג'ט) או שהוא ממורכז בנקודה. */
const boxed = (c) => c.input && c.input.w != null && c.input.h != null;

function screenItems(calls) {
  const ex = [], vis = [];
  for (const c of calls || []) {
    if (!c || !c.name) continue;
    if (c.name === "draw_exercise" || c.name === "ask_answer") ex.push(c);
    else if (!NON_VISUAL.has(c.name)) vis.push(c);
  }
  return { ex, vis };
}

/** הקצה הימני של פריט, לפי סוג-העיגון שלו. */
function rightEdge(c) {
  const i = c.input || {};
  const x = +i.x;
  if (!isFinite(x)) return null;
  if (boxed(c)) return x + (+i.w || 300);
  if (c.name === "write_text") return x + Math.min(240, String(i.text || "").length * 9);
  return x + 140; // ציור ממורכז — הערכה שמרנית
}

function fixScreen(scr) {
  const calls = scr.toolCalls;
  const { ex, vis } = screenItems(calls);
  if (!ex.length || !vis.length) return 0;

  // 1) להסיר מיקום מפורש מהתרגילים — המנוע יסדר אותם בטור ימני.
  //    ask_answer יוצא מהכלל: הוא תיבה בלי טקסט, ובלי x,y אין לה איפה לשבת.
  let changed = 0;
  for (const c of ex.filter((q) => q.name === "draw_exercise")) {
    if (c.input && (c.input.x != null || c.input.y != null)) {
      delete c.input.x;
      delete c.input.y;
      changed++;
    }
  }
  // גם כשלא היה מה להסיר (התרגילים כבר אוטומטיים) — העזר עדיין עשוי לשבת
  // בדיוק בטור שלהם, וזו הייתה הבעיה בכיתה א׳.

  // 2) לדחוף את הוויזואל והכיתובים שלו שמאלה, כדי שהטור הימני יישאר פנוי
  const movable = (calls || []).filter(
    (c) => c && c.input && c.input.x != null && c.name !== "draw_exercise" && c.name !== "ask_answer"
  );
  let maxRight = 0;
  for (const c of movable) {
    const r = rightEdge(c);
    if (r != null) maxRight = Math.max(maxRight, r);
  }
  if (maxRight > RIGHT_COL_X) {
    const shift = maxRight - RIGHT_COL_X;
    let minLeft = Infinity;
    for (const c of movable) minLeft = Math.min(minLeft, +c.input.x);
    const applied = Math.min(shift, Math.max(0, minLeft - 40)); // לא לדחוף מחוץ ללוח
    if (applied > 0) {
      for (const c of movable) c.input.x = Math.round(+c.input.x - applied);
      changed += movable.length;
    }
  }
  return changed;
}

const dry = process.argv.includes("--dry");
const grades = process.argv.slice(2).filter((a) => /^\d+$/.test(a)).map(Number);
if (!grades.length) { console.log("שימוש: node scripts/fix-layout.js 3 [4 5 6] [--dry]"); process.exit(1); }

for (const g of grades) {
  const dir = path.join(ROOT, g >= 2 ? `golden/grade-${g}` : "golden");
  if (!fs.existsSync(dir)) continue;
  let files = 0, moved = 0;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".json")) continue;
    const p = path.join(dir, f);
    const j = JSON.parse(fs.readFileSync(p, "utf8"));
    if (!j.phases) continue;
    let n = 0;
    for (const ph of ["guided", "independent"]) {
      const v = j.phases[ph];
      if (!v) continue;
      for (const scr of Array.isArray(v) ? v : [v]) n += fixScreen(scr);
    }
    if (n) { files++; moved += n; if (!dry) fs.writeFileSync(p, JSON.stringify(j, null, 1) + "\n"); }
  }
  console.log(`כיתה ${g}: ${moved} תרגילים הועברו לטור הימני ב-${files} קבצים${dry ? "  (יבש)" : ""}`);
}
