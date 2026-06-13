/* eslint-disable no-console */

// זריעת מאגר השאלות לכל כיתה/נושא בעזרת המחוללים האלגוריתמיים (חינם, תשובות נכונות).
// הרצה:  node scripts/seed-bank.js
// בטוח להריץ שוב — מדלג על שאלות קיימות (לפי הטקסט) ומוסיף רק חדשות.

const crypto = require("crypto");
const path = require("path");
const { writeJson, readJson } = require("../lib/store");
const { CURRICULUM } = require("../lib/curriculum");
const generators = require("../lib/generators");
const { fileFor } = require("../lib/bank");

const PER_LEVEL = 30; // כמה שאלות ייחודיות לכל נושא בכל רמה

function newId(gradeNum) {
  return `q-${gradeNum}-${crypto.randomBytes(4).toString("hex")}`;
}

let grandTotal = 0;

for (const [gradeNumStr, info] of Object.entries(CURRICULUM)) {
  const gradeNum = Number(gradeNumStr);
  const file = fileFor(gradeNum);
  const data = readJson(file, { grade: info.grade, gradeNum, topics: {} });

  for (const topic of info.topics) {
    if (!Array.isArray(data.topics[topic.key])) data.topics[topic.key] = [];
    const arr = data.topics[topic.key];
    const existingTexts = new Set(arr.map((q) => q.text));

    if (!topic.gen) continue; // נושא שימולא על ידי AI — נשאר ריק כרגע

    const gen = generators[topic.gen];
    if (typeof gen !== "function") {
      console.warn(`אין מחולל בשם "${topic.gen}" — מדלג על ${info.grade}/${topic.key}`);
      continue;
    }

    for (const level of topic.levels) {
      let added = 0;
      let tries = 0;
      while (added < PER_LEVEL && tries < PER_LEVEL * 12) {
        tries++;
        const q = gen(level, topic.params || {});
        if (existingTexts.has(q.text)) continue;
        existingTexts.add(q.text);
        arr.push({
          id: newId(gradeNum),
          text: q.text,
          answer: q.answer,
          level,
          hints: q.hints || [],
          explanation: q.explanation || "",
          source: "algo",
          createdAt: new Date().toISOString(),
        });
        added++;
        grandTotal++;
      }
    }
  }

  writeJson(file, data);
  const count = Object.values(data.topics).reduce((s, a) => s + a.length, 0);
  console.log(`כיתה ${info.grade}: ${count} שאלות → ${path.relative(process.cwd(), file)}`);
}

console.log(`\nסה״כ נוספו ${grandTotal} שאלות חדשות למאגר.`);
