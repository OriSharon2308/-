/* eslint-disable no-console */

const path = require("path");
const { DATA_DIR, readJson, writeJson } = require("./store");

const MEM_DIR = path.join(DATA_DIR, "memory");

// כמה לשמור / להזריק
const MAX_EVENTS = 400; // ארכיון עובדתי לכל תלמיד לכל סוכן
const RECENT_EVENTS_FOR_CONTEXT = 12; // כמה אירועים אחרונים לשלוח ל-AI כברירת מחדל

// ── אחסון: קובץ פר-תלמיד: data/memory/<agent>/<userId>.json ──
// קובץ-על אחד לכל הסוכן גדל עם מספר התלמידים וחצה את תקרת-הסנכרון של הענן
// (950KB ב-cloud-store) → הפסיק להסתנכרן בשקט, וכל deploy שיחזר גרסה קפואה
// (ספירת-התרגילים והזמן יצאו "לא-אמיתיים" בענן, אבל תקינים ב-local). קובץ
// פר-תלמיד תמיד קטן → תמיד מסתנכרן. progress/ ו-profiles/ כבר עובדים כך.
const MEMORY_AGENTS = ["teacher", "psychologist", "mathematician", "designer"];

function safeId(userId) {
  return String(userId).replace(/[^\w-]/g, "_");
}
function userFile(agentId, userId) {
  return path.join(MEM_DIR, agentId, `${safeId(userId)}.json`);
}
// קובץ-העל הישן — לקריאה בלבד (מיגרציה עצלה). נשאר כגיבוי, לא נכתב עוד.
function legacyFile(agentId) {
  return path.join(MEM_DIR, `${agentId}.json`);
}

/** מבנה ריק לרשומת תלמיד. */
function emptyRecord() {
  return { profile: "", timeline: [] };
}

/** טוען רשומת תלמיד מקובץ-פר-תלמיד; מיגרציה עצלה מקובץ-העל בקריאה ראשונה. */
function loadUser(agentId, userId) {
  const rec = readJson(userFile(agentId, userId), null);
  if (rec && typeof rec === "object") return rec;
  const legacy = readJson(legacyFile(agentId), {})[userId];
  if (legacy && typeof legacy === "object") {
    saveUser(agentId, userId, legacy); // מעביר לקובץ-פר-תלמיד (קטן → מסתנכרן)
    return legacy;
  }
  return emptyRecord();
}

/** כותב רשומת תלמיד לקובץ-פר-תלמיד (עם גזירה לתקרת-האירועים). */
function saveUser(agentId, userId, rec) {
  const timeline = Array.isArray(rec.timeline) ? rec.timeline : [];
  writeJson(userFile(agentId, userId), {
    profile: typeof rec.profile === "string" ? rec.profile : "",
    timeline: timeline.length > MAX_EVENTS ? timeline.slice(-MAX_EVENTS) : timeline,
  });
}

/** מחזיר את רשומת הזיכרון של תלמיד אצל סוכן מסוים. */
function getUserMemory(agentId, userId) {
  if (!userId) return emptyRecord();
  return loadUser(agentId, userId);
}

/** כותב מחדש את רשומת הזיכרון של תלמיד. */
function setUserMemory(agentId, userId, record) {
  if (!userId) return;
  const existing = loadUser(agentId, userId);
  saveUser(agentId, userId, {
    profile: typeof record.profile === "string" ? record.profile : existing.profile,
    timeline: Array.isArray(record.timeline) ? record.timeline : existing.timeline,
  });
}

/** מוסיף אירוע עובדתי לציר-הזמן (כותב הקוד — אמין ב-100%). */
function appendEvent(agentId, userId, event) {
  if (!userId) return;
  const rec = loadUser(agentId, userId);
  rec.timeline = Array.isArray(rec.timeline) ? rec.timeline : [];
  rec.timeline.push({ t: new Date().toISOString(), ...event });
  saveUser(agentId, userId, rec);
}

/** עדכון פסקת הפרופיל המילולית (כותב ה-AI). */
function updateProfile(agentId, userId, profileText) {
  if (!userId || typeof profileText !== "string") return;
  const rec = loadUser(agentId, userId);
  rec.profile = profileText.slice(0, 2000);
  saveUser(agentId, userId, rec);
}

/** מוחק את כל רשומות הזיכרון של תלמיד — קובץ-פר-תלמיד + ניקוי קובץ-העל הישן. */
function deleteUserMemory(userId) {
  if (!userId) return;
  const fs = require("fs");
  for (const agentId of MEMORY_AGENTS) {
    try { fs.unlinkSync(userFile(agentId, userId)); } catch { /* אין קובץ */ }
    const legacy = readJson(legacyFile(agentId), {});
    if (legacy[userId]) { delete legacy[userId]; writeJson(legacyFile(agentId), legacy); }
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
