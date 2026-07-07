/* eslint-disable no-console */

// לוגר פשוט ואחיד: כל שורה עם זמן ורמה → לקונסול (ב-Render זה מסך ה-Logs)
// וגם לקובץ יומי מקומי (best-effort; לא מפיל את השרת אם הכתיבה נכשלת).

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, "data");
const LOG_DIR = path.join(DATA_DIR, "logs");

function line(level, msg, meta) {
  const t = new Date().toISOString();
  let extra = "";
  if (meta !== undefined) {
    try {
      extra = " " + (typeof meta === "string" ? meta : JSON.stringify(meta));
    } catch {
      extra = " [meta unserializable]";
    }
  }
  return `[${t}] ${level} ${msg}${extra}`;
}

function writeFileLine(text) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    const day = new Date().toISOString().slice(0, 10);
    fs.appendFileSync(path.join(LOG_DIR, `app-${day}.log`), text + "\n", "utf8");
  } catch {
    /* אין דיסק/הרשאות — הקונסול עדיין מתעד */
  }
}

function info(msg, meta) {
  const l = line("INFO", msg, meta);
  console.log(l);
  writeFileLine(l);
}

function warn(msg, meta) {
  const l = line("WARN", msg, meta);
  console.warn(l);
  writeFileLine(l);
}

function error(msg, meta) {
  const l = line("ERROR", msg, meta);
  console.error(l);
  writeFileLine(l);
}

module.exports = { info, warn, error };
