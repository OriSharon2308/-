/* eslint-disable no-console */

// זריעת מאגר השאלות: לכל נושא בכיתה — עד 100 שאלות ייחודיות.
// שימוש:  node scripts/build-bank.js 1        (כיתה א')
//         node scripts/build-bank.js 1 2 3    (כמה כיתות)

const path = require("path");
const ROOT = path.join(__dirname, "..");
require(path.join(ROOT, "lib/env")).loadEnvFile(ROOT);

const { CURRICULUM, leafTopics } = require(path.join(ROOT, "lib/curriculum"));
const { GENERATORS } = require(path.join(ROOT, "lib/generators"));
const bank = require(path.join(ROOT, "lib/bank"));

// 150 לנושא: מספיק כדי שילד לא יפגוש חזרה גם אחרי שבועות, ועדיין קובץ קטן.
const TARGET = Number(process.env.BANK_TARGET || 150);
const MAX_ATTEMPTS = 20000;

function buildGrade(gradeNum) {
  const g = CURRICULUM[gradeNum];
  if (!g) {
    console.log(`כיתה ${gradeNum}: לא מוגדרת.`);
    return;
  }
  console.log(`\nכיתה ${gradeNum} (${g.grade}):`);
  for (const t of leafTopics(gradeNum)) {
    const gen = GENERATORS[t.gen];
    if (!gen) {
      console.log(`  ⏭  ${t.key}: אין מחולל אלגוריתמי (${t.gen}) — ימולא ע"י AI לפי דרישה`);
      continue;
    }
    const levels = t.levels && t.levels.length ? t.levels : [1];
    const seen = new Set();
    const questions = [];
    // מכסה לכל רמה בנפרד. קודם נבחרה רמה אקראית לכל ניסיון, ולכן רמה עם
    // מרחב-שאלות גדול "בלעה" את המכסה ורמה צרה נשארה עם קומץ שאלות —
    // והתלמיד מיצה אותה אחרי כמה דקות.
    const quota = Math.ceil(TARGET / levels.length);
    const per = {};
    for (const lvl of levels) {
      let got = 0;
      let dup = 0;
      // הרמה חלק מהמפתח: שתי רמות עשויות לחלוק מרחב-שאלות (לוח הכפל הוא
      // 100 עובדות), ובלי זה הרמה שנזרעה שנייה יוצאת ריקה.
      // יוצאים אחרי 400 כפילויות רצופות — שם מרחב-השאלות של הרמה מוצה,
      // ואין טעם לשרוף עוד אלפי ניסיונות.
      while (got < quota && dup < 400) {
        const q = gen(lvl, t.params || {});
        const key = `${lvl}|${q.text}|${JSON.stringify(q.diagramData || "")}`;
        if (seen.has(key)) { dup++; continue; }
        dup = 0;
        seen.add(key);
        questions.push(q);
        got++;
      }
      per[lvl] = got;
    }
    const n = bank.setQuestions(gradeNum, t.key, questions);
    const spread = levels.map((l) => `${l}:${per[l]}`).join(" ");
    const thin = levels.filter((l) => per[l] < Math.min(20, quota));
    console.log(`  ${thin.length ? "⚠" : "✓"} ${t.key}: ${n} שאלות  [${spread}]`);
  }
}

const grades = process.argv.slice(2).map(Number).filter((n) => n >= 1 && n <= 12);
const target = grades.length ? grades : [1];
for (const gn of target) buildGrade(gn);
console.log("\nסיום זריעה.");
