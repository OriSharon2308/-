/* eslint-disable no-console */

const crypto = require("crypto");
const path = require("path");
const { DATA_DIR, readJson, writeJson } = require("./store");

const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");
const COOKIE_NAME = "sid";
const MAX_AGE_DAYS = 30;
const MAX_AGE_SECONDS = MAX_AGE_DAYS * 24 * 60 * 60;

function loadSessions() {
  return readJson(SESSIONS_FILE, {});
}

function saveSessions(sessions) {
  writeJson(SESSIONS_FILE, sessions);
}

/** מסיר sessions שפגו תוקפם. */
function pruneExpired(sessions) {
  const now = Date.now();
  let changed = false;
  for (const [token, s] of Object.entries(sessions)) {
    if (!s || now - (s.createdAt ?? 0) > MAX_AGE_SECONDS * 1000) {
      delete sessions[token];
      changed = true;
    }
  }
  return changed;
}

/** יוצר session חדש למשתמש ומחזיר את ה-token. */
function createSession(userId) {
  const sessions = loadSessions();
  pruneExpired(sessions);
  const token = crypto.randomBytes(32).toString("hex");
  sessions[token] = { userId, createdAt: Date.now() };
  saveSessions(sessions);
  return token;
}

/** מחזיר את ה-userId מתוך token תקף, או null. */
function getUserIdFromToken(token) {
  if (!token) return null;
  const sessions = loadSessions();
  const s = sessions[token];
  if (!s) return null;
  if (Date.now() - (s.createdAt ?? 0) > MAX_AGE_SECONDS * 1000) {
    delete sessions[token];
    saveSessions(sessions);
    return null;
  }
  return s.userId;
}

function destroySession(token) {
  if (!token) return;
  const sessions = loadSessions();
  if (sessions[token]) {
    delete sessions[token];
    saveSessions(sessions);
  }
}

/** מסיר את כל ה-sessions של תלמיד (לשימוש במחיקת חשבון). */
function destroyAllForUser(userId) {
  if (!userId) return;
  const sessions = loadSessions();
  let changed = false;
  for (const [token, s] of Object.entries(sessions)) {
    if (s && s.userId === userId) {
      delete sessions[token];
      changed = true;
    }
  }
  if (changed) saveSessions(sessions);
}

/* ---------- עוגיות ---------- */

function parseCookies(req) {
  const header = req.headers?.cookie;
  const out = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

function getTokenFromRequest(req) {
  return parseCookies(req)[COOKIE_NAME] || null;
}

function buildSetCookie(token) {
  return `${COOKIE_NAME}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${MAX_AGE_SECONDS}`;
}

function buildClearCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
}

/** עזר: מזהה המשתמש המחובר לבקשה (או null). */
function currentUserId(req) {
  return getUserIdFromToken(getTokenFromRequest(req));
}

module.exports = {
  COOKIE_NAME,
  createSession,
  destroySession,
  destroyAllForUser,
  getUserIdFromToken,
  getTokenFromRequest,
  buildSetCookie,
  buildClearCookie,
  currentUserId,
};
