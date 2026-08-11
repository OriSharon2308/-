#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * ────────────────────────────────────────────────────────────────────────
 *  בדיקת שיעורי-זהב — שער-האיכות הדטרמיניסטי
 * ────────────────────────────────────────────────────────────────────────
 *
 *  למה: ביקורת של סוכן-AI יקרה ואף פעם לא "נגמרת" — מבקר טרי תמיד מוצא
 *  עוד ניסוח לשפר. אבל רוב מה שחשוב הוא *אובייקטיבי*: מתמטיקה נכונה,
 *  שמות-כלים אמיתיים, מבנה-שלבים, אי-הסגרת תשובות, וגבולות תכנית-הלימודים.
 *  כל זה נבדק כאן — בחינם, בשנייה, ובאותה תוצאה בכל פעם.
 *  הסוכן היקר נשאר רק למה שסקריפט לא יכול לשפוט: התאמה לגיל ופדגוגיה.
 *
 *  שימוש:
 *    node scripts/check-golden.js 2       ← כיתה ב׳ (golden/grade-2)
 *    node scripts/check-golden.js 1       ← כיתה א׳ (golden/)
 *    node scripts/check-golden.js all     ← כל הכיתות
 *    node scripts/check-golden.js 2 --json  ← פלט JSON (לסוכני-תיקון)
 *
 *  יציאה: 0 = נקי · 1 = נמצאו ממצאים
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const course = require(path.join(ROOT, "lib", "course"));
const golden = require(path.join(ROOT, "lib", "golden-lessons"));
const { BOARD_TOOLS } = require(path.join(ROOT, "lib", "board-tools"));

/* ───────────── הגדרות ───────────── */

// מרחב-הלוח הלוגי. פריט מחוץ לתחום — הילד פשוט לא יראה אותו.
const CANVAS = { xMin: 40, xMax: 960, yMin: 60, yMax: 520 };

// פרמטרי-חובה לכל כלי. סטטיים צריכים x,y; אינטראקטיביים (iframe) צריכים גם w,h.
const REQUIRED = {
  write_text: ["text", "x", "y"],
  draw_exercise: ["text", "answer"], // אין x,y — נערם אוטומטית בטור
  ask_answer: ["x", "y", "answer"],
  draw_number_line: ["from", "to", "x", "y"],
  draw_base_ten: ["value", "x", "y"],
  draw_array: ["rows", "cols", "x", "y"],
  draw_fraction_bar: ["parts", "shaded", "x", "y"],
  draw_bar_model: ["parts", "x", "y"],
  draw_clock: ["hour", "x", "y"],
  draw_circle: ["x", "y", "r"],
  draw_line: ["x1", "y1", "x2", "y2"],
  draw_arrow: ["x1", "y1", "x2", "y2"],
  draw_polygon: ["points"],
  draw_point: ["x", "y"],
  count_objects: ["left", "right", "op", "x", "y", "w", "h"],
  ten_frame: ["x", "y", "w", "h"],
  base_ten_builder: ["x", "y", "w", "h"],
  hundred_chart: ["x", "y", "w", "h"],
  number_line_interactive: ["from", "to", "x", "y", "w", "h"],
  clock_interactive: ["x", "y", "w", "h"],
  money_coins: ["target", "x", "y", "w", "h"],
  mult_array: ["x", "y", "w", "h"],
  mult_table: ["x", "y", "w", "h"],
  interactive_fraction: ["parts", "x", "y", "w", "h"],
  render_widget: ["html"],
  clear_board: [],
  remember_note: [],
  move_item: ["id"],
  resize_item: ["id"],
  remove_item: ["id"],
};

// מניפולטיבים: אסור שיישאו תווית עם התשובה — הילד סופר בעצמו.
const MANIPULATIVES = new Set([
  "draw_base_ten", "draw_array", "draw_fraction_bar", "ten_frame", "count_objects",
  "base_ten_builder", "hundred_chart", "mult_array", "interactive_fraction", "draw_bar_model",
]);

// אורכי-טקסט: מעבר לזה ילד בגיל הזה מאבד את החוט.
const LIMITS = { reply: 480, hint: 220, praise: 140, writeText: 60 };

/**
 * גבולות תכנית-הלימודים לפי כיתה (מתוך docs/תכנית-משרד-החינוך-ב-ו.md).
 * `banned` — מושגים שאסור *ללמד* בכיתה הזו. `maxOp` — תקרת פעולות-החשבון.
 * שים לב: הצהרת-גבול למורה ("לא נלמד השנה: שברים") היא לגיטימית ולא נספרת.
 */
// גבול-מילה עברי: בלי זה "מונה" נתפס בתוך "שמונה"/"תמונה" ו"שבר" בתוך "נשבר".
const HB = (w) => `(?<![א-ת])${w}(?![א-ת])`;
const heb = (...words) => new RegExp(words.map(HB).join("|"));

const CURRICULUM_LIMITS = {
  2: {
    program: "התכנית החדשה (2023)",
    // תקרת *חישוב* בלבד. קריאה/מבנה-עשרוני/השוואה/סדרות מגיעים ל-1000 וזה תקין.
    maxOp: 100,
    banned: [
      { re: heb("שבר", "שברים", "מכנה", "מונה", "שליש", "שלישים", "רבעים"), label: "שברים" },
      { re: /מספר שלילי|מספרים שליליים|מתחת לאפס/, label: "מספרים שליליים" },
      { re: heb("שיקוף", "סימטריה", "סימטרי"), label: "שיקוף/סימטריה" },
      { re: heb("שטח"), label: "מדידת שטח" },
      { re: /לשקול|משקל של|קילוגרם|(?<![א-ת])גרם(?![א-ת])/, label: "משקל" },
      { re: /רבע שעה|רבע ל־|רבע ל-/, label: "רבעי שעה" },
      { re: /גימטרי/, label: "גימטרייה" },
    ],
    multFamilies: [0, 1, 2, 4, 5, 10], // כפל רק במשפחות האלה
  },
  3: {
    program: "התכנית החדשה (2023)",
    maxOp: 10000,
    banned: [
      { re: heb("שבר", "שברים", "מכנה", "שליש", "שלישים"), label: "שברים" },
      { re: /מספר שלילי|מספרים שליליים/, label: "מספרים שליליים" },
      { re: /סימטריה סיבובית|סיבוב של הצורה/, label: "סיבוב" },
      { re: /לשקול|קילוגרם/, label: "משקל" },
    ],
  },
  4: {
    program: 'תשס"ו',
    maxOp: 1000000,
    banned: [
      { re: /לצמצם שבר|צמצום של שבר|להרחיב שבר|מכנה משותף/, label: "צמצום/הרחבה (בה׳)" },
      { re: heb("אחוז", "אחוזים"), label: "אחוזים (בה׳–ו׳)" },
      { re: heb("ממוצע"), label: "ממוצע (בה׳)" },
      { re: /שבר עשרוני|נקודה עשרונית/, label: "עשרוניים (בה׳)" },
    ],
  },
  5: {
    program: 'תשס"ו',
    maxOp: Infinity,
    banned: [
      { re: /לכפול שבר|כפל של שברים|לחלק שבר|חילוק של שברים/, label: "כפל/חילוק שברים (בו׳)" },
      { re: /קנה מידה/, label: "קנה-מידה (בו׳)" },
      { re: /היקף המעגל|שטח העיגול|3\.14/, label: "מעגל ו-π (בו׳)" },
    ],
  },
  6: { program: 'תשס"ו', maxOp: Infinity, banned: [] },
};

// ניסוחים שמסמנים "זו הצהרת-גבול למורה", לא תוכן שנלמד
const BOUNDARY_HINTS = /לא נלמד|לא נלמדים|לא לומדים|אינו נלמד|אינם נלמדים|זה בכיתה|נלמד בכיתה|בכיתה הבאה|רק בכיתה|להערת המורה|למורה:/;

/* ───────────── עזרים ───────────── */

const TOOL_NAMES = new Set(BOARD_TOOLS.map((t) => t.name));
const num = (v) => (v == null || v === "" ? NaN : Number(v));

/** תיבת-החסימה של פריט על הלוח — לזיהוי חפיפה. */
function boxOf(tc) {
  const i = tc.input || {};
  const x = num(i.x), y = num(i.y), w = num(i.w), h = num(i.h);
  if (isFinite(w) && isFinite(h) && isFinite(x) && isFinite(y)) return { x, y, w, h };
  if (tc.name === "write_text" && isFinite(x) && isFinite(y)) {
    const size = num(i.size) || 26;
    return { x: x - String(i.text || "").length * size * 0.28, y: y - size * 0.7, w: String(i.text || "").length * size * 0.56, h: size * 1.4 };
  }
  return null; // פריטים בלי מידות ידועות — לא נבדקים לחפיפה
}

function overlap(a, b) {
  const ox = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const oy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const area = ox * oy;
  const small = Math.min(a.w * a.h, b.w * b.h);
  return small > 0 && area / small > 0.45; // חפיפה גסה בלבד (מעל 45% מהקטן)
}

/** חישוב-מחדש של תשובת תרגיל. מחזיר null אם אין תבנית מוכרת. */
function recompute(text) {
  const t = String(text || "").replace(/[−–—]/g, "-").replace(/[×✕]/g, "*").replace(/[÷:]/g, "/").trim();
  const m = t.match(/^\s*(\d+)\s*([+\-*/])\s*(\d+)\s*=?\s*$/);
  if (!m) return null;
  const a = +m[1], b = +m[3];
  switch (m[2]) {
    case "+": return a + b;
    case "-": return a - b;
    case "*": return a * b;
    case "/": return b === 0 ? null : (a % b === 0 ? a / b : null);
    default: return null;
  }
}

/** כל המספרים בביטוי — לבדיקת תקרת-הטווח. */
function numbersIn(text) {
  return (String(text || "").match(/\d+/g) || []).map(Number);
}

/* ───────────── הבדיקה ───────────── */

function checkGrade(grade) {
  const findings = [];
  const add = (sev, file, where, what) => findings.push({ sev, file, where, what });
  const limits = CURRICULUM_LIMITS[grade] || null;

  const dir = grade >= 2 ? path.join(ROOT, "golden", `grade-${grade}`) : path.join(ROOT, "golden");
  if (!fs.existsSync(dir)) return { grade, findings: [{ sev: "critical", file: "-", where: "-", what: `אין תיקייה ${dir}` }], stats: {} };

  // ── כיסוי: לכל שיעור במערך יש קובץ, ואין קבצים עודפים ──
  const expected = new Set();
  // נושאי הכיתה: לב׳–ו׳ ממערכי-הכיתה; לא׳ מתכנית-הלימודים (COURSES מכיל גם
  // קורסים של כיתות אחרות, ולכן אסור לסרוק אותו כולו כאילו הוא כיתה א׳).
  const topics = grade >= 2
    ? course.topicsForGrade(grade)
    : (require(path.join(ROOT, "lib", "curriculum")).CURRICULUM[1]?.topics || []).map((t) => t.key);
  for (const topic of topics) {
    const plans = course.courseFor(topic, grade) || [];
    plans.forEach((p, i) => {
      const n = i + 1;
      expected.add(`${topic}#${n}`);
      if (!golden.get(topic, n, grade)) add("critical", `${topic}#${n}`, "כיסוי", `חסר שיעור-זהב (המערך מגדיר "${p.title}")`);
    });
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  let nScreens = 0, nExercises = 0;

  for (const file of files.sort()) {
    const full = path.join(dir, file);
    let data;
    try {
      data = JSON.parse(fs.readFileSync(full, "utf8"));
    } catch (e) {
      add("critical", file, "-", `JSON שבור: ${e.message}`);
      continue;
    }
    if (!data.phases) { add("critical", file, "-", "אין phases"); continue; }

    // ── שלבים ומסכים ──
    for (const [phase, raw] of Object.entries(data.phases)) {
      const screens = Array.isArray(raw) ? raw : [raw];
      if (phase === "instruct" && (screens.length < 2 || screens.length > 6)) {
        add("major", file, phase, `${screens.length} מסכי-הוראה (התקן: 3–6)`);
      }

      screens.forEach((scr, si) => {
        nScreens++;
        const where = `${phase}${screens.length > 1 ? `/${si + 1}` : ""}`;
        const reply = String(scr.reply || "");
        if (reply.length > LIMITS.reply) add("major", file, where, `דברי-המורה ארוכים מדי (${reply.length} תווים, תקרה ${LIMITS.reply})`);

        const calls = Array.isArray(scr.toolCalls) ? scr.toolCalls : [];
        if (!reply.trim() && !calls.length) add("critical", file, where, "מסך ריק");

        let exCount = 0, manipCount = 0;
        const boxes = [];
        // תווית על מניפולטיב מסגירה תשובה רק כשיש *שאלה* באותו מסך.
        // בשלב ההוראה המורה מדגים ("3 × 4 = 12" מתחת למערך) — וזו הוראה תקינה.
        const hasQuestion = calls.some((c) => c && (c.name === "draw_exercise" || c.name === "ask_answer"));
        // ניסוח-השאלה כפי שהילד רואה אותו על הלוח. ב-ask_answer השאלה מורכבת
        // מכיתובים סמוכים ("56 + 7  או  50" + "מי קטן?"), ולכן מספר שמופיע שם
        // הוא *חלק מהשאלה* — ואזכורו ברמז אינו הסגרה.
        const questionText = calls
          .filter((c) => c && (c.name === "write_text" || c.name === "draw_exercise"))
          .map((c) => String(c.input?.text || ""))
          .join(" ");

        for (const tc of calls) {
          if (!tc || typeof tc.name !== "string") { add("critical", file, where, "קריאת-כלי בלי שם"); continue; }
          const inp = tc.input || {};

          // שם-כלי קיים
          if (!TOOL_NAMES.has(tc.name)) { add("critical", file, where, `כלי לא קיים: "${tc.name}"`); continue; }

          // פרמטרי-חובה
          for (const k of REQUIRED[tc.name] || []) {
            if (inp[k] == null || inp[k] === "") add("critical", file, where, `${tc.name}: חסר פרמטר ${k}`);
          }

          // תחום-הקנבס
          for (const [k, v] of Object.entries(inp)) {
            if (!/^(x|y|x1|y1|x2|y2)$/.test(k)) continue;
            const val = num(v);
            if (!isFinite(val)) continue;
            const isY = k.startsWith("y");
            const lo = isY ? CANVAS.yMin : CANVAS.xMin, hi = isY ? CANVAS.yMax : CANVAS.xMax;
            if (val < lo || val > hi) add("major", file, where, `${tc.name}.${k}=${val} מחוץ לתחום (${lo}–${hi})`);
          }

          const bx = boxOf(tc);
          if (bx) boxes.push({ name: tc.name, bx });

          // מניפולטיב שמסגיר תשובה — רק כשיש שאלה באותו מסך (בהוראה המורה מדגים, וזה תקין)
          if (MANIPULATIVES.has(tc.name)) {
            manipCount++;
            const lbl = String(inp.label == null ? "" : inp.label).trim();
            if (hasQuestion && lbl && /\d/.test(lbl)) {
              add("critical", file, where, `${tc.name}: label="${lbl}" מסגיר תשובה ליד שאלה (צריך label:"")`);
            }
          }

          if (tc.name === "write_text" && String(inp.text || "").length > LIMITS.writeText) {
            add("minor", file, where, `כיתוב ארוך מדי על הלוח (${String(inp.text).length} תווים)`);
          }

          // ── שאלה: draw_exercise (טקסט+תיבה) או ask_answer (תיבה בלבד — למשל "40 + ▢ = 58") ──
          if (tc.name === "draw_exercise" || tc.name === "ask_answer") {
            exCount++; nExercises++;
            const hint = String(inp.hint || ""), praise = String(inp.praise || "");
            const ans = String(inp.answer == null ? "" : inp.answer).trim();

            if (!hint) add("critical", file, where, `תרגיל "${inp.text}" בלי hint`);
            if (!praise) add("critical", file, where, `תרגיל "${inp.text}" בלי praise`);
            if (hint.length > LIMITS.hint) add("minor", file, where, `hint ארוך (${hint.length})`);
            if (praise.length > LIMITS.praise) add("minor", file, where, `praise ארוך (${praise.length})`);

            // הרמז לא מגלה את התשובה. שני סייגים כדי לא להתריע לשווא:
            // (1) חד-ספרתי מופיע לגיטימית בכל הסבר; (2) אם המספר כבר מופיע
            // בניסוח-השאלה על הלוח (למשל "מי קטן — 56+7 או 50?") הוא חלק מהשאלה.
            const inQuestion = new RegExp(`\\b${ans}\\b`).test(questionText + " " + String(inp.text || ""));
            if (ans.length > 1 && /^\d+$/.test(ans) && !inQuestion && new RegExp(`\\b${ans}\\b`).test(hint)) {
              add("critical", file, where, `hint מכיל את התשובה (${ans}) — "${hint.slice(0, 60)}…"`);
            }

            // מתמטיקה
            // מתמטיקה (calc משמש גם לבדיקת-הטווח שאחריו)
            const calc = recompute(inp.text);
            if (calc != null && inp.kind !== "text" && String(calc) !== ans) {
              add("critical", file, where, `✗ מתמטיקה: "${inp.text}" = ${calc}, בקובץ ${ans}`);
            }

            // תקרת-טווח — רק על *תרגילי-חישוב* טהורים (a op b =).
            // קריאה, מבנה-עשרוני, השוואה, סדרות והמרת-יחידות מגיעים לטווח המלא של הכיתה וזה תקין.
            if (limits && isFinite(limits.maxOp) && calc != null) {
              const over = numbersIn(inp.text).concat(numbersIn(ans)).filter((n) => n > limits.maxOp);
              if (over.length) add("critical", file, where, `חישוב מעל טווח הכיתה (${limits.maxOp}): ${over.join(", ")} ב-"${inp.text}"`);
            }

            // משפחות-כפל מותרות
            if (limits && limits.multFamilies) {
              const mm = String(inp.text || "").replace(/[×✕]/g, "*").match(/(\d+)\s*\*\s*(\d+)/);
              if (mm) {
                const a = +mm[1], b = +mm[2];
                const ok = limits.multFamilies.includes(a) || limits.multFamilies.includes(b);
                if (!ok) add("critical", file, where, `כפל מחוץ למשפחות המותרות (${limits.multFamilies.join("/")}): ${a}×${b}`);
              }
            }
          }
        }

        // מבנה-שלבים
        if (phase === "guided" && exCount !== 1) {
          add(exCount === 0 ? "critical" : "major", file, where, `${exCount} תרגילים בשלב המודרך (התקן: בדיוק 1)`);
        }
        // במודרך חייב להיות עזר ויזואלי כלשהו לצד השאלה — לא רק טקסט.
        // כל כלי-ציור נחשב: מערך ובלוקים, אבל גם מצולע שסופרים לו צלעות,
        // קו שמודדים, או ווידג'ט מותאם. מה שלא נחשב: השאלה עצמה וכיתובים.
        const NON_VISUAL = new Set(["draw_exercise", "ask_answer", "write_text", "clear_board", "remember_note", "move_item", "resize_item", "remove_item"]);
        const visualAids = calls.filter((c) => c && !NON_VISUAL.has(c.name)).length;
        if (phase === "guided" && exCount === 1 && visualAids === 0) {
          add("major", file, where, "שלב מודרך בלי שום עזר ויזואלי לצד השאלה");
        }
        if (phase === "independent" && (exCount < 2 || exCount > 3)) {
          add("major", file, where, `${exCount} תרגילים בשלב העצמאי (התקן: 2–3)`);
        }
        if (phase === "instruct" && exCount > 0) {
          add("major", file, where, "תרגיל בשלב ההוראה (התקן: הוראה בלי שאלות)");
        }

        // חפיפה
        for (let a = 0; a < boxes.length; a++) {
          for (let b = a + 1; b < boxes.length; b++) {
            if (overlap(boxes[a].bx, boxes[b].bx)) {
              add("minor", file, where, `חפיפה: ${boxes[a].name} על ${boxes[b].name}`);
            }
          }
        }

        // ── גבולות תכנית-הלימודים ──
        if (limits) {
          const teachText = [reply, ...calls.map((c) => [c.input?.text, c.input?.hint, c.input?.praise, c.input?.title, c.input?.label].filter(Boolean).join(" "))].join(" ");
          if (!BOUNDARY_HINTS.test(teachText)) {
            for (const ban of limits.banned) {
              if (ban.re.test(teachText)) {
                add("critical", file, where, `תוכן מחוץ לתכנית הכיתה — ${ban.label}`);
              }
            }
          }
        }
      });
    }
  }

  // קבצים עודפים (לא במערך)
  for (const f of files) {
    const m = f.match(/^(.+)#(\d+)\.json$/);
    if (!m) { findings.push({ sev: "minor", file: f, where: "-", what: "שם-קובץ לא בתבנית נושא#מספר" }); continue; }
  }

  return { grade, findings, stats: { files: files.length, screens: nScreens, exercises: nExercises, expected: expected.size } };
}

/* ───────────── הרצה ───────────── */

const arg = process.argv[2] || "all";
const asJson = process.argv.includes("--json");
const grades = arg === "all" ? [1, 2, 3, 4, 5, 6] : [Number(arg)];

let total = { critical: 0, major: 0, minor: 0 };
const report = [];

for (const g of grades) {
  const dir = g >= 2 ? path.join(ROOT, "golden", `grade-${g}`) : path.join(ROOT, "golden");
  if (!fs.existsSync(dir)) continue;
  const r = checkGrade(g);
  report.push(r);
  r.findings.forEach((f) => { total[f.sev] = (total[f.sev] || 0) + 1; });
}

if (asJson) {
  console.log(JSON.stringify({ total, report }, null, 1));
} else {
  for (const r of report) {
    const label = { 1: "א׳", 2: "ב׳", 3: "ג׳", 4: "ד׳", 5: "ה׳", 6: "ו׳" }[r.grade] || r.grade;
    const c = r.findings.filter((f) => f.sev === "critical").length;
    const m = r.findings.filter((f) => f.sev === "major").length;
    const n = r.findings.filter((f) => f.sev === "minor").length;
    console.log(`\n═══ כיתה ${label} — ${r.stats.files} קבצים · ${r.stats.screens} מסכים · ${r.stats.exercises} תרגילים ═══`);
    console.log(c || m || n ? `קריטי:${c}  משמעותי:${m}  קל:${n}` : "✓ נקי לחלוטין");
    const order = { critical: 0, major: 1, minor: 2 };
    r.findings
      .sort((a, b) => order[a.sev] - order[b.sev] || a.file.localeCompare(b.file))
      .forEach((f) => {
        const tag = { critical: "✗ קריטי", major: "▲ משמעותי", minor: "· קל" }[f.sev];
        console.log(`  ${tag}  ${f.file} [${f.where}] — ${f.what}`);
      });
  }
  console.log(`\n${"─".repeat(60)}`);
  console.log(total.critical ? `✗ ${total.critical} ממצאים קריטיים — לא מוכן` : "✓ אפס ממצאים קריטיים");
  if (total.major || total.minor) console.log(`  (${total.major} משמעותיים, ${total.minor} קלים — לרשימת-הליטוש)`);
}

// קוד-יציאה: רק קריטיים חוסמים (לפי תנאי-הסיום שנקבע)
process.exit(total.critical > 0 ? 1 : 0);
