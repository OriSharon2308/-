/* eslint-disable no-console */

// חומר ייחוס לרמת החומר בכל כיתה. אתה (וגם הסוכן) יכולים להזין כאן דוגמאות
// שאלות אמיתיות, ומהן הסוכן ילמד את הרמה והסגנון כשהוא מייצר שאלות חדשות.
//
// איפה לשים: data/reference/grade-<N>.md  (או .txt / .json)
//   לדוגמה: data/reference/grade-1.md, data/reference/grade-4.md
// אפשר לכתוב חופשי — כותרת נושא ואחריה כמה שאלות לדוגמה ברמה הנכונה.

const fs = require("fs");
const path = require("path");
const { DATA_DIR } = require("./store");

const REF_DIR = path.join(DATA_DIR, "reference");
const MAX_CHARS = 1800;

function readFirst(paths) {
  for (const p of paths) {
    try {
      return fs.readFileSync(p, "utf8");
    } catch {
      /* ננסה את הבא */
    }
  }
  return null;
}

/**
 * מחזיר קטע חומר-ייחוס לכיתה (אם הוזן), לשילוב בהנחיית ה-AI שמייצר שאלות.
 * מחזיר מחרוזת ריקה אם אין חומר.
 */
function levelHint(gradeNum) {
  if (!gradeNum) return "";
  const raw = readFirst([
    path.join(REF_DIR, `grade-${gradeNum}.md`),
    path.join(REF_DIR, `grade-${gradeNum}.txt`),
    path.join(REF_DIR, `grade-${gradeNum}.json`),
  ]);
  if (!raw) return "";
  return raw.trim().slice(0, MAX_CHARS);
}

module.exports = { REF_DIR, levelHint };
