/* eslint-disable no-console */

// ────────────────────────────────────────────────────────────────────────
//  גיבוי ושחזור של הנתונים החיים — בלי שום שירות חיצוני
// ────────────────────────────────────────────────────────────────────────
//  ב-Render בתוכנית free מערכת-הקבצים של המכולה נמחקת בכל פריסה. הפתרון
//  הקבוע הוא UPSTASH_REDIS_REST_URL/TOKEN (lib/cloud-store.js) — אבל הוא
//  דורש להזין שני ערכים בלוח-הבקרה, וכל עוד הם ריקים *כל* עדכון מוחק את
//  החשבונות. כאן יושבת רשת-הביטחון: הורדה של תמונת-מצב אחת לפני העדכון,
//  והעלאה שלה בחזרה אחריו.
//
//  מה *לא* נכנס לגיבוי, ולמה:
//  · bank/ ו-methods/ ו-reference/ — מגובים ב-git ועולים עם הקוד עצמו.
//  · logs/ — רעש; אובדנו לא משנה דבר, והוא הדבר הגדול ביותר בתיקייה.
//  מה כן: חשבונות, סשנים, התקדמות, פרופילים, זיכרון, מבחנים ושימוש-טוקנים.

const fs = require("fs");
const path = require("path");
const { DATA_DIR, writeJson } = require("./store");

const SKIP_DIRS = new Set(["bank", "methods", "reference", "logs"]);
const VERSION = 1;

/** כל קובצי-ה-JSON החיים תחת data/, כנתיבים יחסיים. */
function liveFiles(dir = DATA_DIR, rel = "") {
  const out = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name.startsWith(".") || e.name.includes(".tmp-")) continue;
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) {
      if (!rel && SKIP_DIRS.has(e.name)) continue; // דילוג רק ברמה העליונה
      out.push(...liveFiles(path.join(dir, e.name), r));
    } else if (e.name.endsWith(".json")) {
      out.push(r);
    }
  }
  return out;
}

/** תמונת-מצב אחת של כל הנתונים החיים. */
function snapshot() {
  const files = {};
  let bytes = 0;
  for (const rel of liveFiles()) {
    try {
      const raw = fs.readFileSync(path.join(DATA_DIR, rel), "utf8");
      files[rel] = JSON.parse(raw);
      bytes += raw.length;
    } catch {
      /* קובץ פגום — מדלגים עליו ולא מפילים את כל הגיבוי */
    }
  }
  return {
    version: VERSION,
    createdAt: new Date().toISOString(),
    count: Object.keys(files).length,
    bytes,
    files,
  };
}

/**
 * כותב תמונת-מצב בחזרה. כל כתיבה עוברת דרך writeJson, ולכן היא גם
 * מסתנכרנת ל-Upstash אם הוא מוגדר.
 * mode: "merge" (ברירת-מחדל) כותב רק קבצים שאינם קיימים או שונים;
 *       "replace" כותב את הכול.
 */
function restore(snap, mode = "merge") {
  if (!snap || typeof snap !== "object" || !snap.files || typeof snap.files !== "object") {
    return { ok: false, error: "קובץ גיבוי לא תקין" };
  }
  let written = 0;
  let skipped = 0;
  const errors = [];
  for (const [rel, value] of Object.entries(snap.files)) {
    // הגנת-נתיב: שם-קובץ מהקלט לא יוצא מ-data/ בשום מקרה
    const target = path.resolve(DATA_DIR, rel);
    if (!target.startsWith(DATA_DIR + path.sep)) { errors.push(rel); continue; }
    if (rel.split("/").some((p) => SKIP_DIRS.has(p))) { skipped++; continue; }
    if (mode === "merge" && fs.existsSync(target)) {
      try {
        if (fs.readFileSync(target, "utf8") === JSON.stringify(value, null, 2)) { skipped++; continue; }
      } catch { /* לא ניתן לקרוא — פשוט נכתוב מחדש */ }
    }
    try {
      writeJson(target, value);
      written++;
    } catch (e) {
      errors.push(`${rel}: ${e.message}`);
    }
  }
  return { ok: true, written, skipped, errors };
}

module.exports = { snapshot, restore, liveFiles, VERSION };
