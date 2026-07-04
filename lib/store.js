/* eslint-disable no-console */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
// DATA_DIR דרך משתנה-סביבה → persistence אמיתי בפרודקשן: ב-Render מחברים Persistent Disk
// (למשל /var/data) ומגדירים DATA_DIR עליו — הזיכרון (חשבונות/פרופילים/פנקס/שיטות) שורד deploy.
// בלי המשתנה: data/ מקומי, כמו תמיד.
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, "data");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

/** קורא קובץ JSON; מחזיר fallback אם לא קיים או פגום. */
function readJson(filePath, fallback) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch {
    return fallback;
  }
}

/** כותב JSON בצורה אטומית (קובץ זמני + rename) כדי לא להשחית מידע. */
function writeJson(filePath, obj) {
  ensureDir(path.dirname(filePath));
  const tmp = `${filePath}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), "utf8");
  fs.renameSync(tmp, filePath);
}

module.exports = { ROOT, DATA_DIR, ensureDir, readJson, writeJson };
