/* eslint-disable no-console */

const crypto = require("crypto");
const path = require("path");
const { DATA_DIR, readJson, writeJson } = require("./store");

const USERS_FILE = path.join(DATA_DIR, "users.json");

const GRADES = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ז'", "ח'", "ט'", "י'", "יא'", "יב'"];

function loadUsers() {
  return readJson(USERS_FILE, {});
}

function saveUsers(users) {
  writeJson(USERS_FILE, users);
}

function newUserId() {
  return `u-${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`;
}

/* ---------- סיסמאות: scrypt + salt ייחודי, אף פעם לא טקסט גולמי ---------- */

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, stored) {
  if (typeof stored !== "string") return false;
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  let test;
  try {
    test = crypto.scryptSync(password, salt, 64).toString("hex");
  } catch {
    return false;
  }
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(test, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* ---------- ולידציה ---------- */

function normalizeUsername(username) {
  return String(username ?? "").trim().toLowerCase();
}

function validateRegistration(input) {
  const errors = [];
  const username = String(input.username ?? "").trim();
  const email = String(input.email ?? "").trim();
  const password = String(input.password ?? "");
  const school = String(input.school ?? "").trim();
  const grade = String(input.grade ?? "").trim();
  const age = Number.parseInt(input.age, 10);

  if (username.length < 3 || username.length > 24) {
    errors.push("שם משתמש חייב להיות בין 3 ל-24 תווים.");
  }
  if (!/^[a-zA-Z0-9_֐-׿]+$/.test(username)) {
    errors.push("שם משתמש יכול להכיל אותיות, ספרות וקו תחתון בלבד.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("כתובת מייל לא תקינה.");
  }
  if (password.length < 6) {
    errors.push("הסיסמה חייבת להיות לפחות 6 תווים.");
  }
  if (!Number.isFinite(age) || age < 4 || age > 120) {
    errors.push("גיל לא תקין.");
  }
  if (!school) {
    errors.push("יש להזין שם בית ספר.");
  }
  if (!grade) {
    errors.push("יש לבחור כיתה.");
  }

  return {
    ok: errors.length === 0,
    errors,
    value: { username, email, password, school, grade, age },
  };
}

/* ---------- פעולות ---------- */

/** רישום משתמש חדש. מחזיר { ok, errors?, user? } (user בלי passwordHash). */
function registerUser(input) {
  const v = validateRegistration(input);
  if (!v.ok) return { ok: false, errors: v.errors };

  const users = loadUsers();
  const unameKey = normalizeUsername(v.value.username);
  const emailKey = v.value.email.toLowerCase();

  for (const u of Object.values(users)) {
    if (normalizeUsername(u.username) === unameKey) {
      return { ok: false, errors: ["שם המשתמש כבר תפוס."] };
    }
    if (String(u.email).toLowerCase() === emailKey) {
      return { ok: false, errors: ["כתובת המייל כבר רשומה."] };
    }
  }

  const id = newUserId();
  const record = {
    id,
    username: v.value.username,
    email: v.value.email,
    age: v.value.age,
    grade: v.value.grade,
    school: v.value.school,
    passwordHash: hashPassword(v.value.password),
    createdAt: new Date().toISOString(),
  };
  users[id] = record;
  saveUsers(users);

  return { ok: true, user: publicUser(record) };
}

/** התחברות לפי שם משתמש + סיסמה. מחזיר { ok, errors?, user? }. */
function authenticate(username, password) {
  const users = loadUsers();
  const unameKey = normalizeUsername(username);
  const record = Object.values(users).find(
    (u) => normalizeUsername(u.username) === unameKey
  );
  // הודעה אחידה כדי לא לחשוף אם השם קיים
  const fail = { ok: false, errors: ["שם משתמש או סיסמה שגויים."] };
  if (!record) return fail;
  if (!verifyPassword(String(password ?? ""), record.passwordHash)) return fail;
  return { ok: true, user: publicUser(record) };
}

function getUserById(id) {
  const users = loadUsers();
  const record = users[id];
  return record ? publicUser(record) : null;
}

/** מחיקת חשבון לפי id. מחזיר true אם נמחק. */
function deleteUser(id) {
  if (!id) return false;
  const users = loadUsers();
  if (!users[id]) return false;
  delete users[id];
  saveUsers(users);
  return true;
}

/** גרסה ציבורית — בלי passwordHash. */
function publicUser(record) {
  return {
    id: record.id,
    username: record.username,
    email: record.email,
    age: record.age,
    grade: record.grade,
    school: record.school,
    createdAt: record.createdAt,
  };
}

module.exports = {
  GRADES,
  registerUser,
  authenticate,
  getUserById,
  deleteUser,
  publicUser,
};
