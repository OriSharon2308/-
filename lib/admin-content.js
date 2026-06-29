/* eslint-disable no-console */

// בקרת תוכן לאדמין: עץ הכיתות/נושאים + קריאה/עריכה של בנק השאלות.
// נשען על lib/bank (קבצי data/bank/grade-N/<נושא>.json) ו-lib/curriculum.

const bank = require("./bank");
const { CURRICULUM, leafTopics } = require("./curriculum");

/** עץ התוכן: כיתות → נושאים (עלים) → כמות שאלות בבנק. */
function tree() {
  const grades = [];
  for (const gradeNum of Object.keys(CURRICULUM).map(Number).sort((a, b) => a - b)) {
    const g = CURRICULUM[gradeNum];
    const leaves = leafTopics(gradeNum);
    grades.push({
      gradeNum,
      grade: g.grade,
      topics: leaves.map((t) => ({
        key: t.key,
        label: t.label || t.key,
        gen: t.gen || null, // נושא עם מחולל אלגוריתמי (אינסופי) מול נושא שמסתמך על הבנק
        levels: t.levels || [],
        bankCount: bank.count(gradeNum, t.key),
      })),
    });
  }
  return grades;
}

/** שאלות הבנק של נושא מסוים. */
function getTopic(gradeNum, topicKey) {
  return bank.loadTopic(gradeNum, topicKey); // { grade, gradeNum, topic, questions }
}

/** שמירת מערך השאלות של נושא (החלפה מלאה). מחזיר { ok, count } או { ok:false, error }. */
function saveTopic(gradeNum, topicKey, questions) {
  if (!Array.isArray(questions)) return { ok: false, error: "questions חייב להיות מערך" };
  for (const q of questions) {
    if (!q || typeof q.text !== "string" || !q.text.trim()) {
      return { ok: false, error: "לכל שאלה חייב להיות טקסט." };
    }
    if (q.answer === undefined || q.answer === null || String(q.answer).trim() === "") {
      return { ok: false, error: `חסרה תשובה לשאלה: "${String(q.text).slice(0, 30)}"` };
    }
  }
  const n = bank.setQuestions(gradeNum, topicKey, questions);
  return { ok: true, count: n };
}

module.exports = { tree, getTopic, saveTopic };
