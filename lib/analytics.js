/* eslint-disable no-console */

// ניתוח נתוני תלמיד לאדמין: סדרות-זמן (מוטיבציה + שליטה) וסיכומים.
// המקור: ציר-הזמן של סוכן "המורה" (כל אירוע בדיקת-תשובה עם חותמת t) + פרופיל הלומד.

const memory = require("./memory");
const learnerProfile = require("./learner-profile");

function dayKey(iso) {
  return String(iso).slice(0, 10);
}

/** אירועי בדיקת-תשובה (עם תוצאה) מציר-הזמן של המורה. */
function answeredEvents(userId) {
  const rec = memory.getUserMemory("teacher", userId);
  const tl = Array.isArray(rec.timeline) ? rec.timeline : [];
  return tl.filter((e) => e && typeof e.correct === "boolean" && e.t);
}

/** סדרת ימים: attempts/correct/accuracy + שליטה מצטברת + מוטיבציה לכל יום. */
function dailySeries(userId) {
  const events = answeredEvents(userId);
  const byDay = new Map();
  for (const e of events) {
    const d = dayKey(e.t);
    const s = byDay.get(d) || { date: d, attempts: 0, correct: 0 };
    s.attempts += 1;
    if (e.correct) s.correct += 1;
    byDay.set(d, s);
  }
  const days = [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
  let cumA = 0;
  let cumC = 0;
  for (const d of days) {
    d.accuracy = d.attempts ? Math.round((d.correct / d.attempts) * 100) : 0;
    cumA += d.attempts;
    cumC += d.correct;
    d.mastery = cumA ? Math.round((cumC / cumA) * 100) : 0; // שליטה מצטברת (%)
    // מוטיבציה (מדד נגזר): חצי פעילות (כמות תרגול ביום) + חצי הצלחה (דיוק היום)
    const activity = Math.min(1, d.attempts / 12); // ~12 תרגילים ביום = פעילות מלאה
    d.motivation = Math.round((activity * 0.5 + (d.accuracy / 100) * 0.5) * 100);
  }
  return days;
}

/** שליטה לכל נושא לאורך זמן (דיוק מצטבר לפי יום). */
function masteryByTopic(userId) {
  const events = answeredEvents(userId);
  const topics = new Map();
  for (const e of events) {
    if (!e.topic) continue;
    if (!topics.has(e.topic)) topics.set(e.topic, new Map());
    const m = topics.get(e.topic);
    const d = dayKey(e.t);
    const s = m.get(d) || { date: d, attempts: 0, correct: 0 };
    s.attempts += 1;
    if (e.correct) s.correct += 1;
    m.set(d, s);
  }
  const out = [];
  for (const [topic, m] of topics) {
    const days = [...m.values()].sort((a, b) => a.date.localeCompare(b.date));
    let cumA = 0;
    let cumC = 0;
    for (const d of days) {
      cumA += d.attempts;
      cumC += d.correct;
      d.mastery = Math.round((cumC / cumA) * 100);
    }
    out.push({
      topic,
      days,
      attempts: cumA,
      correct: cumC,
      mastery: cumA ? Math.round((cumC / cumA) * 100) : 0,
    });
  }
  out.sort((a, b) => b.attempts - a.attempts);
  return out;
}

/** הערכת זמן-לימוד יומי (דקות) מתוך חותמות-הזמן: סוכמים פערים בין תרגילים, עם תקרה
 *  לכל פער (פער גדול = התלמיד היה בהפסקה ולא נספר). */
function dailyTime(userId) {
  const events = answeredEvents(userId).filter((e) => e.t);
  const byDay = new Map();
  for (const e of events) {
    const d = dayKey(e.t);
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d).push(new Date(e.t).getTime());
  }
  const CAP = 4 * 60 * 1000; // פער מקסימלי שנספר כזמן פעיל בין שני תרגילים
  const out = [];
  for (const [date, times] of byDay) {
    times.sort((a, b) => a - b);
    let ms = 0;
    for (let i = 1; i < times.length; i++) ms += Math.min(times[i] - times[i - 1], CAP);
    ms += 30 * 1000; // ~חצי דקה לתרגיל האחרון
    out.push({ date, minutes: Math.round(ms / 60000) });
  }
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

/** רצף ימים פעילים עד היום. */
function dayStreak(days) {
  const set = new Set(days.map((d) => d.date));
  let streak = 0;
  const now = Date.now();
  for (let i = 0; i < 400; i++) {
    const d = new Date(now - i * 86400000).toISOString().slice(0, 10);
    if (set.has(d)) streak += 1;
    else if (i === 0) continue; // היום אולי עוד לא תרגל — לא שובר את הרצף
    else break;
  }
  return streak;
}

/** סיכום מספרי מלא לתלמיד. */
function summary(userId) {
  const events = answeredEvents(userId);
  const days = dailySeries(userId);
  const totalAttempts = events.length;
  const totalCorrect = events.filter((e) => e.correct).length;
  const accuracy = totalAttempts ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

  const prof = learnerProfile.get(userId);
  const topics = prof && prof.topics
    ? Object.entries(prof.topics).map(([name, t]) => ({
        name,
        status: t.status,
        statusHe: learnerProfile.STATUS_HE[t.status] || t.status,
        attempts: t.attempts || 0,
        correct: t.correct || 0,
        accuracy: t.attempts ? Math.round((t.correct / t.attempts) * 100) : 0,
        streak: t.streak || 0,
        wrongStreak: t.wrongStreak || 0,
        note: t.note || "",
        updatedAt: t.updatedAt || null,
      }))
    : [];
  topics.sort((a, b) => b.attempts - a.attempts);

  return {
    totalAttempts,
    totalCorrect,
    accuracy,
    activeDays: days.length,
    firstActive: days[0]?.date || null,
    lastActive: days[days.length - 1]?.date || null,
    dayStreak: dayStreak(days),
    topicsCount: topics.length,
    masteredCount: topics.filter((t) => t.status === "mastered").length,
    strugglingTopics: topics.filter((t) => t.status === "struggling").map((t) => t.name),
    topics,
    profileSummary: prof?.summary || "",
    currentMotivation: days[days.length - 1]?.motivation ?? 0,
    currentMastery: days[days.length - 1]?.mastery ?? accuracy,
  };
}

/** סטטיסטיקה כללית על כל המשתמשים (לדף הסקירה). */
function overview(allUsers) {
  let totalAttempts = 0;
  let totalCorrect = 0;
  let activeToday = 0;
  const today = new Date().toISOString().slice(0, 10);
  for (const u of allUsers) {
    const events = answeredEvents(u.id);
    totalAttempts += events.length;
    totalCorrect += events.filter((e) => e.correct).length;
    if (events.some((e) => dayKey(e.t) === today)) activeToday += 1;
  }
  return {
    totalUsers: allUsers.length,
    totalAttempts,
    totalCorrect,
    accuracy: totalAttempts ? Math.round((totalCorrect / totalAttempts) * 100) : 0,
    activeToday,
  };
}

module.exports = { dailySeries, masteryByTopic, dailyTime, summary, overview, answeredEvents };
