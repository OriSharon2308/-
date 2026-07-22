/* eslint-disable no-console */

/**
 * מעקב-טוקנים ועלות לכל תלמיד — כמה טוקנים (קלט/פלט/מטמון) וכמה $ כל ילד עולה.
 * המקור: שדה `usage` שמחזיר Claude בכל תשובה (נלכד ב-lib/llm.js ומשויך ל-userId).
 * אחסון: קובץ אחד לכל ילד — data/usage/<userId>.json. מחיר מחושב מהמחירון הרשמי.
 */

const fs = require("fs");
const path = require("path");
const { DATA_DIR, readJson, writeJson } = require("./store");

const DIR = path.join(DATA_DIR, "usage");

// מחירון Claude — $ למיליון טוקנים (מקור: platform.claude.com). cache-write = 1.25x קלט, cache-read = 0.10x.
const PRICES = {
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-sonnet-5": { in: 3, out: 15 },
  "claude-opus-4-8": { in: 5, out: 25 },
  "claude-opus-4-7": { in: 5, out: 25 },
  "claude-opus-4-6": { in: 5, out: 25 },
  "claude-haiku-4-5": { in: 1, out: 5 },
  "claude-fable-5": { in: 10, out: 50 },
};
const DEFAULT_MODEL = "claude-sonnet-4-6";

function priceFor(model) {
  const p = PRICES[model] || PRICES[DEFAULT_MODEL];
  return { in: p.in, out: p.out, cacheW: p.in * 1.25, cacheR: p.in * 0.1 };
}

// עלות ($) לצריכה נתונה במודל נתון
function costOf(model, b) {
  const p = priceFor(model);
  return (
    ((b.input || 0) * p.in +
      (b.output || 0) * p.out +
      (b.cacheWrite || 0) * p.cacheW +
      (b.cacheRead || 0) * p.cacheR) /
    1e6
  );
}

function fileFor(userId) {
  return path.join(DIR, `${userId}.json`);
}
function blank() {
  return { models: {}, agents: {}, updatedAt: null };
}
function normUsage(u) {
  return {
    input: Number(u.input_tokens) || 0,
    output: Number(u.output_tokens) || 0,
    cacheRead: Number(u.cache_read_input_tokens) || 0,
    cacheWrite: Number(u.cache_creation_input_tokens) || 0,
  };
}
function addInto(bucket, n) {
  bucket.input = (bucket.input || 0) + n.input;
  bucket.output = (bucket.output || 0) + n.output;
  bucket.cacheRead = (bucket.cacheRead || 0) + n.cacheRead;
  bucket.cacheWrite = (bucket.cacheWrite || 0) + n.cacheWrite;
  bucket.calls = (bucket.calls || 0) + 1;
}

/** רישום צריכה של קריאה בודדת. usage = אובייקט-ה-usage הגולמי של Claude. */
function record(userId, { model, usage, agent }) {
  if (!userId || !usage) return;
  const m = String(model || DEFAULT_MODEL);
  const a = String(agent || "אחר");
  const n = normUsage(usage);
  if (!n.input && !n.output && !n.cacheRead && !n.cacheWrite) return; // אין מה לרשום
  const data = readJson(fileFor(userId), blank());
  if (!data.models) data.models = {};
  if (!data.agents) data.agents = {};
  if (!data.models[m]) data.models[m] = {};
  if (!data.agents[a]) data.agents[a] = {};
  addInto(data.models[m], n);
  addInto(data.agents[a], n);
  data.updatedAt = new Date().toISOString();
  writeJson(fileFor(userId), data);
}

/** סיכום לתלמיד: טוקנים (קלט/פלט/מטמון/סה"כ), עלות $, ופירוט לפי-סוכן. */
function get(userId) {
  const data = readJson(fileFor(userId), blank());
  const models = data.models || {};
  const tokens = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 };
  let costUSD = 0;
  let calls = 0;
  for (const [model, b] of Object.entries(models)) {
    tokens.input += b.input || 0;
    tokens.output += b.output || 0;
    tokens.cacheRead += b.cacheRead || 0;
    tokens.cacheWrite += b.cacheWrite || 0;
    calls += b.calls || 0;
    costUSD += costOf(model, b);
  }
  tokens.total = tokens.input + tokens.output + tokens.cacheRead + tokens.cacheWrite;
  // פירוט לפי-סוכן (עלות משתמשת במודל ברירת-המחדל — קירוב טוב; רוב הקריאות באותו מודל)
  const byAgent = Object.entries(data.agents || {})
    .map(([name, b]) => ({
      name,
      tokens: (b.input || 0) + (b.output || 0) + (b.cacheRead || 0) + (b.cacheWrite || 0),
      costUSD: costOf(DEFAULT_MODEL, b),
      calls: b.calls || 0,
    }))
    .sort((x, y) => y.costUSD - x.costUSD);
  return { tokens, costUSD, calls, byAgent, updatedAt: data.updatedAt };
}

/** סכום-על לכל התלמידים (לסקירה): סה"כ טוקנים ו-$. */
function totals(userIds) {
  const out = { tokens: 0, costUSD: 0, calls: 0 };
  for (const id of userIds || []) {
    const g = get(id);
    out.tokens += g.tokens.total;
    out.costUSD += g.costUSD;
    out.calls += g.calls;
  }
  return out;
}

function deleteUser(userId) {
  try {
    fs.unlinkSync(fileFor(userId));
  } catch {
    /* לא קיים — בסדר */
  }
}

module.exports = { record, get, totals, deleteUser, PRICES, DEFAULT_MODEL };
