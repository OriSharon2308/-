/* eslint-disable no-console */
// תלמיד-דוגמה קבוע למסך הניהול — תמיד מופיע ברשימה, עם נתונים סינתטיים
// (גרפים + חוות-דעת) כדי שאפשר לראות את כל החוויה גם כשאין תלמידים אמיתיים.
// קריאה בלבד — לא נשמר ולא ניתן לעריכה/מחיקה.

const DEMO_ID = "demo-student";

function pad(n) { return String(n).padStart(2, "0"); }
function lastDays(n) {
  const out = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  }
  return out;
}

function demoUser() {
  return {
    id: DEMO_ID,
    username: "demo",
    firstName: "דנה",
    lastName: "— דוגמה",
    grade: "א׳",
    age: 7,
    dob: "2019-03-14",
    school: "בית ספר לדוגמה",
    gender: "female",
    email: "demo@example.com",
    parentName: "הורה לדוגמה",
    parentPhone: "050-0000000",
    parentEmail: "parent@example.com",
    notes: "חשבון הדגמה — נתונים לדוגמה בלבד (לא ניתן לעריכה).",
    createdAt: new Date(Date.now() - 45 * 86400000).toISOString(), // ~חודש וחצי
    demo: true,
  };
}

function demoSummary() {
  return {
    totalAttempts: 638,
    accuracy: 84,
    currentMastery: 79,
    currentMotivation: "גבוהה",
    dayStreak: 13,
    masteredCount: 5,
    topicsCount: 8,
    lastActive: lastDays(1)[0],
    topics: [
      { name: "חיבור תרגילים", status: "mastered", accuracy: 95, correct: 124, attempts: 130 },
      { name: "חיסור תרגילים", status: "mastered", accuracy: 91, correct: 100, attempts: 110 },
      { name: "חיבור — שאלות מילוליות", status: "mastered", accuracy: 89, correct: 71, attempts: 80 },
      { name: "חיסור — שאלות מילוליות", status: "in_progress", accuracy: 76, correct: 53, attempts: 70, note: "מתקדמת יפה" },
      { name: "שעון", status: "in_progress", accuracy: 72, correct: 49, attempts: 68 },
      { name: "כסף ומטבעות", status: "mastered", accuracy: 90, correct: 54, attempts: 60 },
      { name: "ספירת צלעות", status: "struggling", accuracy: 58, correct: 17, attempts: 29, note: "כדאי לחזק" },
      { name: "מספרים עד 100", status: "not_started", accuracy: 0, correct: 0, attempts: 0 },
    ],
  };
}

function demoDaily() {
  const days = lastDays(45); // ~חודש וחצי
  return days.map((date, i) => {
    const mastery = Math.round(30 + (i / (days.length - 1)) * 49); // 30 → 79
    let accuracy = 74 + Math.round(12 * Math.sin(i * 0.6)) + (i > 30 ? 5 : 0);
    accuracy = Math.max(62, Math.min(95, accuracy));
    return { date, mastery, accuracy };
  });
}

function demoTime() {
  const days = lastDays(14);
  const minutes = [12, 18, 9, 22, 15, 0, 25, 30, 14, 28, 20, 17, 24, 19];
  return days.map((date, i) => ({ date, minutes: minutes[i] }));
}

function demoMastery() {
  return demoSummary().topics.map((t) => ({ topic: t.name, mastery: t.accuracy }));
}

function demoAssessments() {
  return {
    teacher: {
      text: "דנה לומדת בהתמדה יפה ומגלה ביטחון גובר בחיבור ובחיסור עד 20.\nהיא נהנית מהתרגול וחוזרת מדי יום כמעט.\nכדאי לחזק חיסור עם פריטה — שם היא עדיין מהססת מעט, אבל המגמה חיובית מאוד.",
      updatedAt: new Date().toISOString(),
    },
    psychologist: {
      text: "מגיבה מצוין לעידוד ולמשוב חיובי.\nרצף 9 הימים מעיד על הרגל למידה בריא ומוטיבציה פנימית.\nשומרת על רוגע גם כשטועה — סימן לחוסן לימודי טוב.",
    },
    mathematician: {
      text: "שליטה מספרית חזקה לגילה.\nמומלץ להעלות בהדרגה לרמת קושי 4 כדי לשמור על אתגר, ולשלב יותר שאלות מילוליות עם שני שלבים.",
    },
  };
}

/** פעילות סינתטית לפי טווח (שעות/ימים/שבועות) עם פירוט לטולטיפ. */
function demoActivity(range) {
  const HE = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
  const now = new Date();
  const dm = (d) => pad(d.getDate()) + "/" + pad(d.getMonth() + 1);
  if (range === "day") {
    const byHour = { 7: 9, 8: 22, 9: 16, 13: 12, 14: 31, 15: 38, 16: 24, 17: 13, 19: 34, 20: 27, 21: 12 };
    const points = [];
    for (let h = 7; h <= 22; h++) { const v = byHour[h] || 0; points.push({ label: h + ":00", value: v, detail: `${h}:00–${h + 1}:00 · ${v} דק׳` }); }
    return { unit: " דק׳", points };
  }
  if (range === "week") {
    const mins = [33, 41, 22, 47, 38, 29, 44];
    const points = [];
    for (let i = 6; i >= 0; i--) { const d = new Date(now); d.setDate(now.getDate() - i); const v = mins[6 - i]; points.push({ label: dm(d), value: v, detail: `יום ${HE[d.getDay()]} ${dm(d)} · ${v} דק׳` }); }
    return { unit: " דק׳", points };
  }
  if (range === "month") {
    const seq = [28, 35, 0, 41, 38, 26, 44, 19, 31, 23];
    const points = [];
    for (let i = 29; i >= 0; i--) { const d = new Date(now); d.setDate(now.getDate() - i); const v = seq[i % seq.length]; points.push({ label: dm(d), value: v, detail: `יום ${HE[d.getDay()]} ${dm(d)} · ${v} דק׳` }); }
    return { unit: " דק׳", points };
  }
  const seq = [165, 210, 185, 240, 205, 195, 250];
  const points = [];
  for (let i = 12; i >= 0; i--) { const ws = new Date(now); ws.setDate(now.getDate() - now.getDay() - i * 7); const we = new Date(ws); we.setDate(ws.getDate() + 6); const v = seq[i % seq.length]; points.push({ label: dm(ws), value: v, detail: `שבוע ${dm(ws)}–${dm(we)} · ${v} דק׳` }); }
  return { unit: " דק׳", points };
}

/** רשומת-רשימה (כולל stats) לתצוגה בטבלת התלמידים. */
function demoListRow() {
  const s = demoSummary();
  return {
    ...demoUser(),
    stats: {
      attempts: s.totalAttempts,
      accuracy: s.accuracy,
      lastActive: s.lastActive,
      motivation: s.currentMotivation,
      mastery: s.currentMastery,
      dayStreak: s.dayStreak,
    },
  };
}

module.exports = {
  DEMO_ID,
  demoUser,
  demoSummary,
  demoDaily,
  demoTime,
  demoMastery,
  demoAssessments,
  demoActivity,
  demoListRow,
};
