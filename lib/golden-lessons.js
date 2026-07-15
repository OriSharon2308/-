/* eslint-disable no-console */

/**
 * ────────────────────────────────────────────────────────────────────────
 *  שיעורי-זהב — מערך שיעור מוכן שרץ תמיד, בלי AI, בשליטה מלאה של אורי
 * ────────────────────────────────────────────────────────────────────────
 *
 *  הרעיון: השיעור השוטף (הוראה → מודרך → עצמאי) מוגש מקבצים מוכנים —
 *  הטקסט המדויק + הציורים במיקומים המדויקים — אפס טוקנים, אפס המתנה,
 *  ואותה איכות לכל ילד. ה-AI נכנס *רק* כשילד לא מבין / מבקש עזרה /
 *  עונה בצ'אט — שם באמת צריך מוח.
 *
 *  איפה הקבצים: golden/<נושא>#<מספר-שיעור>.json — בתוך הפרויקט (git!),
 *  לא ב-data/ — כדי שאורי יערוך אותם ישירות (מיקומים, נוסח) והם ישרדו deploy.
 *
 *  מבנה קובץ:
 *  {
 *    "topic": "חיבור עד 20", "lesson": 1, "title": "חיבור זה לשים ביחד",
 *    "phases": {
 *      "instruct":    { "reply": "טקסט המורה…", "toolCalls": [{ "name": "write_text", "input": {…} }, …] },
 *      "guided":      { "reply": "…", "toolCalls": [ … ] },
 *      "independent": { "reply": "…", "toolCalls": [ … ] }
 *    }
 *  }
 *  reply תומך בצורות-לוכסן (מוכן/ה) — מוטה אוטומטית לפי מין הילד.
 */

const fs = require("fs");
const path = require("path");
const { ROOT, readJson } = require("./store");

const GOLDEN_DIR = path.join(ROOT, "golden");

function fileFor(topic, n) {
  const slug = String(topic).trim().replace(/[^\w֐-׿-]+/g, "_").slice(0, 60);
  return path.join(GOLDEN_DIR, `${slug}#${Math.max(1, +n || 1)}.json`);
}

/** מערך-הזהב של השיעור — או null אם אין. */
function get(topic, n) {
  if (!topic) return null;
  const g = readJson(fileFor(topic, n), null);
  return g && g.phases ? g : null;
}

/**
 * מסכי שלב: שלב יכול להיות מסך יחיד {reply,toolCalls} או מערך מסכים (בעיקר בהוראה —
 * "עוד שלבים": הילד לוחץ ✓ בין מסך למסך, הכל מהזהב, בלי AI). מנרמל תמיד למערך.
 */
function screens(topic, n, phaseName) {
  const g = get(topic, n);
  const p = g && g.phases && g.phases[phaseName];
  if (!p) return null;
  const arr = Array.isArray(p) ? p : [p];
  // מסך תקף = יש בו דברי-מורה או תוכן על הלוח (מסך ויזואלי-בלבד הוא לגיטימי — המורה שותק ומראה)
  const out = arr
    .filter((s) => s && (String(s.reply || "").trim() || (Array.isArray(s.toolCalls) && s.toolCalls.length)))
    .map((s) => ({ reply: String(s.reply || ""), toolCalls: Array.isArray(s.toolCalls) ? s.toolCalls : [] }));
  return out.length ? out : null;
}

/** התוכן המוכן לשלב — מסך בודד לפי אינדקס (ברירת מחדל: הראשון). null אם אין. */
function phase(topic, n, phaseName, screenIdx) {
  const scr = screens(topic, n, phaseName);
  if (!scr) return null;
  const i = Math.max(0, Math.min(scr.length - 1, +screenIdx || 0));
  return { ...scr[i], screen: i, totalScreens: scr.length };
}

/** שמירת מערך-זהב מלא (מהעורך באדמין). ולידציה בסיסית + כתיבה אטומית. */
function save(topic, n, data) {
  if (!topic || !data || typeof data !== "object" || !data.phases) return { ok: false, error: "מבנה לא תקין" };
  const clean = { topic: String(topic).slice(0, 80), lesson: Math.max(1, +n || 1), title: String(data.title || "").slice(0, 120), phases: {} };
  const PHASES = ["instruct", "guided", "independent"];
  for (const ph of PHASES) {
    const raw = data.phases[ph];
    if (!raw) continue;
    const arr = (Array.isArray(raw) ? raw : [raw])
      .filter((s) => s && (typeof s.reply === "string" && s.reply.trim() || (Array.isArray(s.toolCalls) && s.toolCalls.length)))
      .slice(0, 8) // עד 8 מסכים לשלב
      .map((s) => ({
        reply: String(s.reply || "").slice(0, 2000),
        toolCalls: (Array.isArray(s.toolCalls) ? s.toolCalls : [])
          .filter((t) => t && typeof t.name === "string")
          .slice(0, 40)
          .map((t) => ({ name: String(t.name).slice(0, 40), input: t.input && typeof t.input === "object" ? t.input : {} })),
      }));
    if (arr.length) clean.phases[ph] = arr.length === 1 ? arr[0] : arr;
  }
  if (!Object.keys(clean.phases).length) return { ok: false, error: "אין אף שלב עם תוכן" };
  try {
    fs.mkdirSync(GOLDEN_DIR, { recursive: true });
    const file = fileFor(topic, n);
    const tmp = `${file}.tmp-${process.pid}`;
    fs.writeFileSync(tmp, JSON.stringify(clean, null, 2), "utf8");
    fs.renameSync(tmp, file);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/** אילו שלבים מוכנים לשיעור (לתצוגת האדמין). */
function stagesFor(topic, n) {
  const g = get(topic, n);
  return g && g.phases ? Object.keys(g.phases) : [];
}

/** כל שיעורי-הזהב הקיימים (לתצוגת האדמין). */
function list() {
  try {
    return fs.readdirSync(GOLDEN_DIR).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
}

module.exports = { GOLDEN_DIR, get, phase, screens, stagesFor, list, save };
