/* eslint-disable no-console */

/**
 * ────────────────────────────────────────────────────────────────────────
 *  בדיקת-הגשה — האם הילד באמת מקבל את שיעור-הזהב?
 * ────────────────────────────────────────────────────────────────────────
 *
 *  scripts/check-golden.js בודק שהקבצים *תקינים*. הקובץ הזה בודק שהם
 *  *מגיעים לילד* — כלומר שכל השרשרת עובדת: שם-הנושא שהלקוח שולח →
 *  course.planFor → golden.phase → mode:"golden". באג בחוליה אחת שם
 *  (שם-נושא שלא תואם לשם-הקובץ, כיתה שלא מועברת) גורם לילד ליפול ל-AI
 *  בלי ששום דבר "נשבר" — ולכן דווקא הוא הכי מסוכן.
 *
 *  קוראים ל-teacherDraw בדיוק עם המטען ש-server.js בונה מבקשת הלקוח,
 *  בלי HTTP ובלי מפתח-API (מסלול-הזהב חוזר לפני כל קריאה למודל).
 *
 *  הרצה:  node scripts/check-serving.js 2      # כיתה אחת
 *         node scripts/check-serving.js        # כל הכיתות שיש להן שיעורי-זהב
 */

const path = require("path");
const ROOT = path.join(__dirname, "..");

// חייב לקרות *לפני* טעינת draw-agent: מחליפים את מספר-השיעור שנגזר
// מהפרופיל, כדי לבדוק את כל השיעורים ולא רק את זה שהילד עומד בו.
const learnerProfile = require(path.join(ROOT, "lib", "learner-profile"));
let FORCED_LESSON = 1;
learnerProfile.topicLessonNumber = () => FORCED_LESSON;

const { teacherDraw } = require(path.join(ROOT, "agent", "draw-agent"));
const course = require(path.join(ROOT, "lib", "course"));
const curriculum = require(path.join(ROOT, "lib", "curriculum"));

// הטקסטים המדויקים שהלקוח שולח (learn-board.html) — כל שינוי שם חייב
// להשתקף כאן, אחרת הבדיקה בודקת מסלול שאף ילד לא עובר בו.
const ENTRY = {
  instruct: "(הילד לחץ 'בוא נתחיל' — הוא מוכן. התחל את שלב ההוראה של השיעור.)",
  instructNext: "(הילד לחץ ✓ — הצג את מסך הבא של ההסבר.)",
  guided: "(הילד לחץ '✓ להמשך' — הוא הבין את ההסבר ומוכן לתרגל. עבור לשלב התרגול המודרך.)",
  independent: "(הילד פתר את התרגיל המודרך ולחץ להמשיך. עבור לשלב התרגול העצמאי.)",
};

const GRADE_LABEL = { 1: "א׳", 2: "ב׳", 3: "ג׳", 4: "ד׳", 5: "ה׳", 6: "ו׳" };

const findings = [];
const addF = (sev, where, what) => findings.push({ sev, where, what });

/**
 * לוכסן ששרד את ההטיה — הילד יראה "תספור/י" במקום מילה. בודקים על *כל*
 * טקסט שמוגש (דברי-מורה, כיתובים, שאלות, רמזים ומחמאות) ולא רק על ה-reply,
 * כי רמז נקרא בדיוק כמו שאר הטקסט.
 */
function checkSlashes(result, where) {
  const bad = new Set();
  const walk = (o) => {
    if (!o) return;
    if (typeof o === "string") { for (const m of o.match(/[א-ת]{2,}\/[א-ת]+/g) || []) bad.add(m); }
    else if (Array.isArray(o)) o.forEach(walk);
    else if (typeof o === "object") Object.values(o).forEach(walk);
  };
  walk(result.reply);
  walk(result.toolCalls);
  for (const t of bad) addF("major", where, `צורת-לוכסן שלא הוטתה: "${t}" — הילד יראה את הלוכסן`);
}

/** קריאה אחת בדיוק כמו שהשרת בונה אותה. */
async function call(topic, phase, grade, screen = 0) {
  return teacherDraw({
    messageText: phase === "instruct" && screen > 0 ? ENTRY.instructNext : ENTRY[phase],
    history: [],
    gender: "male",
    topic,
    geometry: null,
    occupied: [],
    layout: [],
    phase,
    goldenScreen: screen,
    name: "בודק",
    grade,
    userId: "__check_serving__",
  });
}

async function checkLesson(topic, n, grade) {
  FORCED_LESSON = n;
  const where = `${topic}#${n}`;

  // ── הוראה: לעבור על כל המסכים, בדיוק כמו ילד שלוחץ ✓ ──
  const first = await call(topic, "instruct", grade, 0);
  if (!first || first.mode !== "golden") {
    addF("critical", `${where}/instruct`, `mode="${first ? first.mode : "—"}" ולא "golden" — הילד נופל ל-AI`);
    return;
  }
  const total = first.goldenTotal || 1;
  for (let s = 0; s < total; s++) {
    const r = s === 0 ? first : await call(topic, "instruct", grade, s);
    if (!r || r.mode !== "golden") { addF("critical", `${where}/instruct[${s}]`, `מסך ${s + 1}/${total} לא הוגש מהזהב`); continue; }
    if (!String(r.reply || "").trim()) addF("critical", `${where}/instruct[${s}]`, "אין דברי-מורה");
    if (!Array.isArray(r.toolCalls) || !r.toolCalls.length) addF("critical", `${where}/instruct[${s}]`, "מסך ריק — אין מה לצייר");
    checkSlashes(r, `${where}/instruct[${s}]`);
  }

  // ── מודרך ועצמאי ──
  for (const phase of ["guided", "independent"]) {
    const r = await call(topic, phase, grade);
    if (!r || r.mode !== "golden") { addF("critical", `${where}/${phase}`, `mode="${r ? r.mode : "—"}" ולא "golden" — הילד נופל ל-AI`); continue; }
    if (!String(r.reply || "").trim()) addF("critical", `${where}/${phase}`, "אין דברי-מורה");
    checkSlashes(r, `${where}/${phase}`);
    const ex = (r.toolCalls || []).filter((c) => c && (c.name === "draw_exercise" || c.name === "ask_answer"));
    if (!ex.length) addF("critical", `${where}/${phase}`, "אין שאלה בשלב-תרגול");
    for (const e of ex) {
      const i = e.input || {};
      if (i.answer == null || i.answer === "") addF("critical", `${where}/${phase}`, `תרגיל בלי תשובה: "${i.text || ""}"`);
      if (e.name === "draw_exercise") {
        if (!i.hint) addF("major", `${where}/${phase}`, `תרגיל בלי רמז: "${i.text || ""}" — הילד שנתקע לא יקבל עזרה מוכנה`);
        if (!i.praise) addF("major", `${where}/${phase}`, `תרגיל בלי מחמאה: "${i.text || ""}"`);
      }
    }
  }
}

async function checkGrade(grade) {
  const topics = (curriculum.topicsForApi(grade, "learn") || []).map((t) => t.title || t.key || String(t));
  if (!topics.length) { console.log(`כיתה ${GRADE_LABEL[grade] || grade}: אין נושאים באזור-הלמידה`); return { lessons: 0 }; }

  let lessons = 0;
  for (const topic of topics) {
    const plans = course.courseFor(topic, grade) || [];
    if (!plans.length) { addF("major", topic, `אין מערך-שיעורים לנושא בכיתה ${GRADE_LABEL[grade] || grade}`); continue; }
    for (let n = 1; n <= plans.length; n++) { await checkLesson(topic, n, grade); lessons++; }
  }
  return { lessons, topics: topics.length };
}

(async () => {
  const arg = +process.argv[2];
  const grades = isFinite(arg) && arg ? [arg] : [1, 2, 3, 4, 5, 6];

  // משתיקים את לוג-הזהב — אחרת מאות שורות מציפות את הפלט
  const realLog = console.log;
  const quiet = (...a) => { if (!/^\[golden\]|^\[timing\]/.test(String(a[0] || ""))) realLog(...a); };

  for (const g of grades) {
    findings.length = 0;
    console.log = quiet;
    const { lessons, topics } = await checkGrade(g);
    console.log = realLog;
    if (!lessons) continue;

    const crit = findings.filter((f) => f.sev === "critical");
    const maj = findings.filter((f) => f.sev === "major");
    console.log(`\n═══ הגשה · כיתה ${GRADE_LABEL[g] || g} — ${topics} נושאים · ${lessons} שיעורים ═══`);
    console.log(`קריטי:${crit.length}  משמעותי:${maj.length}`);
    for (const f of [...crit, ...maj].slice(0, 40)) {
      console.log(`  ${f.sev === "critical" ? "✖ קריטי  " : "▲ משמעותי"}  ${f.where} — ${f.what}`);
    }
    if (findings.length > 40) console.log(`  … ועוד ${findings.length - 40}`);
    if (!crit.length) console.log("✓ כל שיעור מוגש מהזהב — אפס טוקנים");
    else { process.exitCode = 1; }
  }
})();
