/* eslint-disable no-console */

// אימות אזור ההורים — כניסה בלבד (בלי הרשמה), עם פרטי חשבון הילד.
// session נפרד (עוגיית psid + parent-sessions.json) שמצביע על childUserId —
// כך ההורה רואה אך ורק את הילד שאליו התחבר, ואף פעם לא סיסמאות.

const crypto = require("crypto");
const path = require("path");
const { DATA_DIR, readJson, writeJson } = require("./store");
const users = require("./users");

const SESSIONS_FILE = path.join(DATA_DIR, "parent-sessions.json");
const COOKIE_NAME = "psid";
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // חודש

// הגנת brute-force פשוטה (בזיכרון, לכל התהליך)
const FAIL_LIMIT = 8;
const LOCK_MS = 10 * 60 * 1000;
const failState = { count: 0, lockedUntil: 0 };

function loadSessions() {
  return readJson(SESSIONS_FILE, {});
}
function saveSessions(s) {
  writeJson(SESSIONS_FILE, s);
}
function pruneExpired(sessions) {
  const now = Date.now();
  for (const [token, s] of Object.entries(sessions)) {
    if (!s || now - (s.createdAt ?? 0) > MAX_AGE_SECONDS * 1000) delete sessions[token];
  }
}

/** כניסת הורה עם פרטי חשבון הילד. מחזיר { ok, token?, childId?, error? }. */
function login(username, password) {
  const now = Date.now();
  if (failState.lockedUntil > now) {
    const mins = Math.ceil((failState.lockedUntil - now) / 60000);
    return { ok: false, error: `יותר מדי ניסיונות. נסו שוב בעוד ${mins} דקות.` };
  }
  const r = users.authenticate(username, password);
  if (!r.ok) {
    failState.count += 1;
    if (failState.count >= FAIL_LIMIT) {
      failState.lockedUntil = now + LOCK_MS;
      failState.count = 0;
    }
    return { ok: false, error: "שם משתמש או סיסמה שגויים." };
  }
  failState.count = 0;
  failState.lockedUntil = 0;
  const sessions = loadSessions();
  pruneExpired(sessions);
  const token = crypto.randomBytes(32).toString("hex");
  sessions[token] = { childId: r.user.id, createdAt: now };
  saveSessions(sessions);
  return { ok: true, token, childId: r.user.id };
}

function parseCookies(req) {
  const header = req.headers?.cookie;
  const out = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    if (k) out[k] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}
function tokenFromRequest(req) {
  return parseCookies(req)[COOKIE_NAME] || null;
}

/** מזהה הילד של ההורה המחובר, או null. */
function childIdFromRequest(req) {
  const token = tokenFromRequest(req);
  if (!token) return null;
  const sessions = loadSessions();
  const s = sessions[token];
  if (!s) return null;
  if (Date.now() - (s.createdAt ?? 0) > MAX_AGE_SECONDS * 1000) {
    delete sessions[token];
    saveSessions(sessions);
    return null;
  }
  return s.childId || null;
}

function logout(req) {
  const token = tokenFromRequest(req);
  if (!token) return;
  const sessions = loadSessions();
  if (sessions[token]) {
    delete sessions[token];
    saveSessions(sessions);
  }
}

function buildSetCookie(token) {
  return `${COOKIE_NAME}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${MAX_AGE_SECONDS}`;
}
function buildClearCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
}

module.exports = { login, logout, childIdFromRequest, buildSetCookie, buildClearCookie };
