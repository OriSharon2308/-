/* eslint-disable no-console */

// גיבוי-ענן חינמי לקבצי ה-data: Upstash Redis דרך REST (fetch מובנה — בלי תלויות).
// העיקרון: הקבצים המקומיים נשארים מקור-האמת בזמן ריצה (מהיר, סינכרוני),
// כל כתיבה מסונכרנת לענן ברקע (debounce), ובעליית השרת משחזרים הכל מהענן —
// כך חשבונות/התקדמות/זיכרון שורדים deploy והרדמה גם בתוכנית free של Render.
// בלי משתני-הסביבה: הכל עובד מקומי כרגיל (פיתוח ללא שינוי).

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, "data");

const URL_BASE = (process.env.UPSTASH_REDIS_REST_URL || "").replace(/\/+$/, "");
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "";
const PREFIX = "vela:"; // מפתח לכל קובץ: vela:<נתיב יחסי בתוך data/>
const INDEX_KEY = "vela:index"; // רשימת כל הקבצים המסונכרנים
const DEBOUNCE_MS = 1200;
const MAX_VALUE_BYTES = 950 * 1024; // תקרת בקשה ~1MB ב-Upstash free

function isEnabled() {
  return !!(URL_BASE && TOKEN);
}

/** פקודת Redis בודדת דרך REST. מחזיר את result או זורק. */
async function cmd(arr) {
  const res = await fetch(URL_BASE, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(arr),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
  return data.result;
}

/** צרור פקודות (pipeline) — בקשה אחת לכמה פקודות. מחזיר מערך תוצאות. */
async function pipeline(cmds) {
  if (!cmds.length) return [];
  const res = await fetch(`${URL_BASE}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(cmds),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`pipeline HTTP ${res.status}`);
  return data.map((d) => (d && d.error ? null : d.result));
}

// אינדקס בזיכרון של המפתחות המסונכרנים (נטען בעלייה, מתעדכן בכתיבות)
const knownKeys = new Set();
const pendingTimers = new Map(); // rel → timer (debounce)

/** נתיב יחסי בטוח בתוך DATA_DIR, או null אם הקובץ מחוץ לו. */
function relOf(absPath) {
  const rel = path.relative(DATA_DIR, absPath);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return null;
  return rel.split(path.sep).join("/"); // מפתח אחיד גם אם מערכת-הקבצים שונה
}

/** סנכרון קובץ אחד לענן (קורא את התוכן העדכני מהדיסק). */
async function syncOne(rel) {
  const abs = path.join(DATA_DIR, rel);
  let raw;
  try {
    raw = fs.readFileSync(abs, "utf8");
  } catch {
    return; // הקובץ נעלם — אין מה לסנכרן
  }
  if (Buffer.byteLength(raw, "utf8") > MAX_VALUE_BYTES) {
    console.warn(`[cloud] הקובץ ${rel} גדול מדי לסנכרון (>${Math.round(MAX_VALUE_BYTES / 1024)}KB) — נשמר רק מקומית`);
    return;
  }
  const cmds = [["SET", PREFIX + rel, raw]];
  if (!knownKeys.has(rel)) {
    knownKeys.add(rel);
    cmds.push(["SET", INDEX_KEY, JSON.stringify([...knownKeys])]);
  }
  await pipeline(cmds);
}

/** מתזמן סנכרון-רקע לקובץ (debounce — כתיבות צפופות מתאחדות). */
function queueSync(absPath) {
  if (!isEnabled()) return;
  const rel = relOf(absPath);
  if (!rel || rel.startsWith("logs/")) return; // לוגים לא מסתנכרנים
  clearTimeout(pendingTimers.get(rel));
  pendingTimers.set(
    rel,
    setTimeout(() => {
      pendingTimers.delete(rel);
      syncOne(rel).catch((e) => console.error(`[cloud] סנכרון ${rel} נכשל:`, e.message));
    }, DEBOUNCE_MS)
  );
}

/** מסנכרן מיד את כל מה שממתין — נקרא לפני כיבוי (SIGTERM בזמן deploy). */
async function flushAll() {
  if (!isEnabled()) return;
  const rels = [...pendingTimers.keys()];
  for (const rel of rels) clearTimeout(pendingTimers.get(rel));
  pendingTimers.clear();
  await Promise.allSettled(rels.map((rel) => syncOne(rel)));
}

/** שחזור מלא מהענן אל הדיסק המקומי — נקרא פעם אחת בעליית השרת, לפני listen. */
async function restoreAll() {
  if (!isEnabled()) return { enabled: false, restored: 0 };
  const rawIndex = await cmd(["GET", INDEX_KEY]);
  const rels = [];
  try {
    for (const rel of JSON.parse(rawIndex || "[]")) {
      // הגנה: רק נתיבים יחסיים שפויים בתוך data/
      if (typeof rel === "string" && rel && !rel.includes("..") && !path.isAbsolute(rel)) rels.push(rel);
    }
  } catch {
    /* אינדקס פגום — מתחילים ריק */
  }
  let restored = 0;
  const CHUNK = 40;
  for (let i = 0; i < rels.length; i += CHUNK) {
    const batch = rels.slice(i, i + CHUNK);
    const results = await pipeline(batch.map((rel) => ["GET", PREFIX + rel]));
    batch.forEach((rel, j) => {
      const val = results[j];
      if (typeof val !== "string") return;
      try {
        const abs = path.join(DATA_DIR, rel);
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, val, "utf8");
        knownKeys.add(rel);
        restored += 1;
      } catch (e) {
        console.error(`[cloud] שחזור ${rel} נכשל:`, e.message);
      }
    });
  }
  return { enabled: true, restored };
}

module.exports = { isEnabled, queueSync, flushAll, restoreAll };
