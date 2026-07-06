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

/* ---------- פעילות לפי טווח (שעות/ימים/שבועות) עם פירוט לטולטיפ ---------- */
const ACTIVE_CAP = 4 * 60 * 1000;
const HE_DAYS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
function pad2(n) { return String(n).padStart(2, "0"); }
function ddmm(d) { return pad2(d.getDate()) + "/" + pad2(d.getMonth() + 1); }
function eventTimes(userId) {
  return answeredEvents(userId).filter((e) => e.t).map((e) => new Date(e.t).getTime()).sort((a, b) => a - b);
}
// ms של "זמן פעיל" סביב כל חותמת-זמן, מחולק לדליים לפי keyFn(t)
function bucketActiveMs(times, keyFn) {
  const m = new Map();
  const add = (t, ms) => { const k = keyFn(t); m.set(k, (m.get(k) || 0) + ms); };
  for (let i = 0; i < times.length; i++) {
    add(times[i], 30000);
    if (i > 0) add(times[i - 1], Math.min(times[i] - times[i - 1], ACTIVE_CAP));
  }
  return m;
}
function activity(userId, range) {
  const times = eventTimes(userId);
  const now = new Date();
  const toMin = (ms) => Math.round((ms || 0) / 60000);
  if (range === "day") {
    const m = bucketActiveMs(times.filter((t) => now.getTime() - t < 24 * 3600000), (t) => new Date(t).getHours());
    const points = [];
    for (let h = 7; h <= 22; h++) {
      const v = toMin(m.get(h));
      points.push({ label: h + ":00", value: v, detail: `${h}:00–${h + 1}:00 · ${v} דק׳` });
    }
    return { unit: " דק׳", points };
  }
  if (range === "week" || range === "month") {
    const days = range === "week" ? 7 : 30;
    const m = bucketActiveMs(times, (t) => new Date(t).toISOString().slice(0, 10));
    const points = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      const v = toMin(m.get(d.toISOString().slice(0, 10)));
      points.push({ label: ddmm(d), value: v, detail: `יום ${HE_DAYS[d.getDay()]} ${ddmm(d)} · ${v} דק׳` });
    }
    return { unit: " דק׳", points };
  }
  // quarter — 13 שבועות אחרונים
  const m = bucketActiveMs(times, (t) => { const d = new Date(t); d.setDate(d.getDate() - d.getDay()); return d.toISOString().slice(0, 10); });
  const points = [];
  for (let i = 12; i >= 0; i--) {
    const ws = new Date(now); ws.setDate(now.getDate() - now.getDay() - i * 7);
    const we = new Date(ws); we.setDate(ws.getDate() + 6);
    const v = toMin(m.get(ws.toISOString().slice(0, 10)));
    points.push({ label: ddmm(ws), value: v, detail: `שבוע ${ddmm(ws)}–${ddmm(we)} · ${v} דק׳` });
  }
  return { unit: " דק׳", points };
}

/* ---------- ניתוחים לאזור ההורים ---------- */

/** זמן משוער (דקות) לכל נושא — פער מהתרגיל הקודם (עם תקרה) משויך לנושא של התרגיל הנוכחי. */
function topicTime(userId) {
  const events = answeredEvents(userId)
    .filter((e) => e.t && e.topic)
    .map((e) => ({ topic: e.topic, t: new Date(e.t).getTime() }))
    .sort((a, b) => a.t - b.t);
  const m = new Map();
  const CAP = 4 * 60 * 1000;
  for (let i = 0; i < events.length; i++) {
    const gap = i > 0 ? Math.min(events[i].t - events[i - 1].t, CAP) : 30000;
    m.set(events[i].topic, (m.get(events[i].topic) || 0) + gap);
  }
  return [...m.entries()]
    .map(([topic, ms]) => ({ topic, minutes: Math.round(ms / 60000) }))
    .sort((a, b) => b.minutes - a.minutes);
}

/** באילו חלקי היום הילד לומד — דקות פעילות בכל רבע-יום, על כל ההיסטוריה. */
function timeOfDay(userId) {
  const times = eventTimes(userId);
  const bucketOf = (h) => (h >= 6 && h < 12 ? "morning" : h >= 12 && h < 17 ? "noon" : h >= 17 && h < 21 ? "evening" : "night");
  const m = bucketActiveMs(times, (t) => bucketOf(new Date(t).getHours()));
  const total = [...m.values()].reduce((s, v) => s + v, 0) || 1;
  const HE = { morning: "בוקר (6–12)", noon: "צהריים (12–17)", evening: "ערב (17–21)", night: "לילה (21–6)" };
  return ["morning", "noon", "evening", "night"].map((k) => ({
    key: k,
    label: HE[k],
    minutes: Math.round((m.get(k) || 0) / 60000),
    pct: Math.round(((m.get(k) || 0) / total) * 100),
  }));
}

module.exports = { dailySeries, masteryByTopic, dailyTime, summary, overview, answeredEvents, activity, topicTime, timeOfDay };
