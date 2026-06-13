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

const TARGET = 100;
const MAX_ATTEMPTS = 6000;

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
    let attempts = 0;
    while (questions.length < TARGET && attempts < MAX_ATTEMPTS) {
      attempts++;
      const lvl = levels[Math.floor(Math.random() * levels.length)];
      const q = gen(lvl, t.params || {});
      const key = `${q.text}|${JSON.stringify(q.diagramData || "")}`;
      if (seen.has(key)) continue;
      seen.add(key);
      questions.push(q);
    }
    const n = bank.setQuestions(gradeNum, t.key, questions);
    console.log(`  ✓ ${t.key}: ${n} שאלות`);
  }
}

const grades = process.argv.slice(2).map(Number).filter((n) => n >= 1 && n <= 12);
const target = grades.length ? grades : [1];
for (const gn of target) buildGrade(gn);
console.log("\nסיום זריעה.");
