/* eslint-disable no-console */

const fs = require("fs");
const path = require("path");

/**
 * טוען משתני סביבה מקובץ .env (אם קיים) אל process.env.
 * פורמט פשוט: KEY=value בכל שורה. שורות ריקות ו-# הן הערות.
 * לא דורס משתנה שכבר קיים ב-process.env.
 */
function loadEnvFile(rootDir) {
  const envPath = path.join(rootDir, ".env");
  let raw;
  try {
    raw = fs.readFileSync(envPath, "utf8");
  } catch {
    return; // אין .env — עובדים עם ברירות מחדל / מצב מקומי
  }

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    // הסרת מרכאות עוטפות אם יש
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

module.exports = { loadEnvFile };
