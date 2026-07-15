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

/** התוכן המוכן לשלב מסוים — {reply, toolCalls} או null. */
function phase(topic, n, phaseName) {
  const g = get(topic, n);
  const p = g && g.phases && g.phases[phaseName];
  if (!p || !p.reply) return null;
  return { reply: String(p.reply), toolCalls: Array.isArray(p.toolCalls) ? p.toolCalls : [] };
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

module.exports = { GOLDEN_DIR, get, phase, stagesFor, list };
