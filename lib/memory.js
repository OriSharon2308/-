/* eslint-disable no-console */

const path = require("path");
const { DATA_DIR, readJson, writeJson } = require("./store");

const MEM_DIR = path.join(DATA_DIR, "memory");

// כמה לשמור / להזריק
const MAX_EVENTS = 400; // ארכיון עובדתי לכל תלמיד לכל סוכן
const RECENT_EVENTS_FOR_CONTEXT = 12; // כמה אירועים אחרונים לשלוח ל-AI כברירת מחדל

function memFile(agentId) {
  return path.join(MEM_DIR, `${agentId}.json`);
}

function loadAgentFile(agentId) {
  return readJson(memFile(agentId), {});
}

function saveAgentFile(agentId, data) {
  writeJson(memFile(agentId), data);
}

/** מבנה ריק לרשומת תלמיד. */
function emptyRecord() {
  return { profile: "", timeline: [] };
}

/** מחזיר את רשומת הזיכרון של תלמיד אצל סוכן מסוים. */
function getUserMemory(agentId, userId) {
  if (!userId) return emptyRecord();
  const all = loadAgentFile(agentId);
  return all[userId] || emptyRecord();
}

/** כותב מחדש את רשומת הזיכרון של תלמיד. */
function setUserMemory(agentId, userId, record) {
  if (!userId) return;
  const all = loadAgentFile(agentId);
  const existing = all[userId] || emptyRecord();
  all[userId] = {
    profile: typeof record.profile === "string" ? record.profile : existing.profile,
    timeline: Array.isArray(record.timeline) ? record.timeline : existing.timeline,
  };
  // גזירה לגודל מקסימלי
  if (all[userId].timeline.length > MAX_EVENTS) {
    all[userId].timeline = all[userId].timeline.slice(-MAX_EVENTS);
  }
  saveAgentFile(agentId, all);
}

/** מוסיף אירוע עובדתי לציר-הזמן (כותב הקוד — אמין ב-100%). */
function appendEvent(agentId, userId, event) {
  if (!userId) return;
  const all = loadAgentFile(agentId);
  const rec = all[userId] || emptyRecord();
  rec.timeline = Array.isArray(rec.timeline) ? rec.timeline : [];
  rec.timeline.push({ t: new Date().toISOString(), ...event });
  if (rec.timeline.length > MAX_EVENTS) {
    rec.timeline = rec.timeline.slice(-MAX_EVENTS);
  }
  all[userId] = rec;
  saveAgentFile(agentId, all);
}

/** עדכון פסקת הפרופיל המילולית (כותב ה-AI). */
function updateProfile(agentId, userId, profileText) {
  if (!userId || typeof profileText !== "string") return;
  const all = loadAgentFile(agentId);
  const rec = all[userId] || emptyRecord();
  rec.profile = profileText.slice(0, 2000);
  all[userId] = rec;
  saveAgentFile(agentId, all);
}

// הסוכנים שמחזיקים זיכרון לכל תלמיד
const MEMORY_AGENTS = ["teacher", "psychologist", "mathematician", "designer"];

/** מוחק את כל רשומות הזיכרון של תלמיד מכל קבצי הסוכנים. */
function deleteUserMemory(userId) {
  if (!userId) return;
  for (const agentId of MEMORY_AGENTS) {
    const all = loadAgentFile(agentId);
    if (all[userId]) {
      delete all[userId];
      saveAgentFile(agentId, all);
    }
  }
}

function isSameDay(iso, ref) {
  return String(iso).slice(0, 10) === String(ref).slice(0, 10);
}

/**
 * בונה הקשר חכם לשליחה ל-AI: פרופיל + אירועים אחרונים + אירועים רלוונטיים לטקסט.
 * שומרים הכל בקובץ, אבל שולחים רק את מה שצריך עכשיו.
 */
function buildContext(agentId, userId, { query = "", topic = "" } = {}) {
  const rec = getUserMemory(agentId, userId);
  const timeline = Array.isArray(rec.timeline) ? rec.timeline : [];

  const recent = timeline.slice(-RECENT_EVENTS_FOR_CONTEXT);

  // חיפוש לפי הקשר: "אתמול", נושא, או טקסט תרגיל שמופיע בשאלה
  const q = String(query).toLowerCase();
  const wantsYesterday = /אתמול|אמש|קודם|פעם שעברה|בעבר|זוכר/.test(q);
  const matched = [];
  if (wantsYesterday || topic || q) {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    for (const ev of timeline) {
      const inRecent = recent.includes(ev);
      if (inRecent) continue;
      const hit =
        (wantsYesterday && isSameDay(ev.t, yesterday)) ||
        (topic && ev.topic && String(ev.topic).includes(topic)) ||
        (ev.problem && q && String(ev.problem).toLowerCase().includes(q));
      if (hit) matched.push(ev);
    }
  }

  return {
    profile: rec.profile || "",
    recent,
    matched: matched.slice(-8),
    totalEvents: timeline.length,
  };
}

/** הופך הקשר לטקסט קריא להזרקה לפרומפט. */
function contextToText(ctx) {
  const lines = [];
  if (ctx.profile) lines.push(`פרופיל התלמיד: ${ctx.profile}`);
  if (ctx.matched?.length) {
    lines.push("אירועים רלוונטיים מההיסטוריה:");
    for (const e of ctx.matched) lines.push(`- ${formatEvent(e)}`);
  }
  if (ctx.recent?.length) {
    lines.push("פעילות אחרונה:");
    for (const e of ctx.recent) lines.push(`- ${formatEvent(e)}`);
  }
  if (ctx.totalEvents) lines.push(`(סה״כ ${ctx.totalEvents} אירועים בארכיון התלמיד)`);
  return lines.join("\n");
}

function formatEvent(e) {
  const date = String(e.t).slice(0, 10);
  const parts = [date];
  if (e.topic) parts.push(`נושא: ${e.topic}`);
  if (e.problem) parts.push(`תרגיל: ${e.problem}`);
  if (e.studentAnswer != null) parts.push(`תשובה: ${e.studentAnswer}`);
  if (typeof e.correct === "boolean") parts.push(e.correct ? "✓ נכון" : "✗ טעות");
  if (e.note) parts.push(e.note);
  return parts.join(" | ");
}

module.exports = {
  getUserMemory,
  setUserMemory,
  appendEvent,
  updateProfile,
  deleteUserMemory,
  buildContext,
  contextToText,
};
