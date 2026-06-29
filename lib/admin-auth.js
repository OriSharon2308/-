/* eslint-disable no-console */

// אימות אדמין — נפרד לחלוטין מחשבונות התלמידים.
// הסיסמה נשמרת ב-ADMIN_PASSWORD ב-.env (gitignored, לא ב-DB של המשתמשים).
// session נפרד (עוגיית asid + קובץ admin-sessions.json) כך ש-session של תלמיד לעולם לא מגיע לאדמין.

const crypto = require("crypto");
const path = require("path");
const { DATA_DIR, readJson, writeJson } = require("./store");

const SESSIONS_FILE = path.join(DATA_DIR, "admin-sessions.json");
const COOKIE_NAME = "asid";
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // שבוע

// הגנת brute-force פשוטה (בזיכרון): נעילה אחרי כמה כישלונות
const FAIL_LIMIT = 6;
const LOCK_MS = 10 * 60 * 1000;
const failState = { count: 0, lockedUntil: 0 };

function adminPassword() {
  const p = process.env.ADMIN_PASSWORD;
  return typeof p === "string" && p.length > 0 ? p : null;
}

/** האם אימות-אדמין מוגדר בכלל (יש ADMIN_PASSWORD)? */
function isConfigured() {
  return adminPassword() != null;
}

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

function timingSafeEqualStr(a, b) {
  const ab = Buffer.from(String(a), "utf8");
  const bb = Buffer.from(String(b), "utf8");
  // משווים גם אורך וגם תוכן בלי לדלוף תזמון
  const len = Math.max(ab.length, bb.length, 1);
  const pa = Buffer.alloc(len);
  const pb = Buffer.alloc(len);
  ab.copy(pa);
  bb.copy(pb);
  return ab.length === bb.length && crypto.timingSafeEqual(pa, pb);
}

/** ניסיון התחברות. מחזיר { ok, token? , error? }. */
function login(password) {
  const expected = adminPassword();
  if (!expected) return { ok: false, error: "אימות אדמין לא הוגדר בשרת (חסר ADMIN_PASSWORD ב-.env)." };

  const now = Date.now();
  if (failState.lockedUntil > now) {
    const mins = Math.ceil((failState.lockedUntil - now) / 60000);
    return { ok: false, error: `יותר מדי ניסיונות. נסה/י שוב בעוד ${mins} דקות.` };
  }

  if (!timingSafeEqualStr(String(password ?? ""), expected)) {
    failState.count += 1;
    if (failState.count >= FAIL_LIMIT) {
      failState.lockedUntil = now + LOCK_MS;
      failState.count = 0;
    }
    return { ok: false, error: "סיסמה שגויה." };
  }

  failState.count = 0;
  failState.lockedUntil = 0;
  const sessions = loadSessions();
  pruneExpired(sessions);
  const token = crypto.randomBytes(32).toString("hex");
  sessions[token] = { createdAt: now };
  saveSessions(sessions);
  return { ok: true, token };
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
    if (k) out[k] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

function tokenFromRequest(req) {
  return parseCookies(req)[COOKIE_NAME] || null;
}

/** האם הבקשה היא של אדמין מחובר? */
function isAdmin(req) {
  const token = tokenFromRequest(req);
  if (!token) return false;
  const sessions = loadSessions();
  const s = sessions[token];
  if (!s) return false;
  if (Date.now() - (s.createdAt ?? 0) > MAX_AGE_SECONDS * 1000) {
    delete sessions[token];
    saveSessions(sessions);
    return false;
  }
  return true;
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

module.exports = {
  isConfigured,
  login,
  logout,
  isAdmin,
  buildSetCookie,
  buildClearCookie,
};
