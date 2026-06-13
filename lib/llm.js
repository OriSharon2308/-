/* eslint-disable no-console */

const https = require("https");
const fs = require("fs");
const tls = require("tls");

/**
 * מאגר התעודות המובנה של Node עלול לחסר שורש/ביניים במערכות מסוימות
 * (למשל Node 26 על macOS), מה שגורם ל-"unable to get local issuer certificate".
 * משלבים את שורשי Node עם מאגר התעודות של מערכת ההפעלה כדי שהחיבור ל-AI
 * יעבוד עם `node server.js` רגיל, בלי דגלים או משתני סביבה.
 */
function buildCa() {
  const ca = [];
  try {
    if (Array.isArray(tls.rootCertificates)) ca.push(...tls.rootCertificates);
  } catch {
    /* ignore */
  }
  const candidates = [
    process.env.NODE_EXTRA_CA_CERTS,
    "/etc/ssl/cert.pem", // macOS ורבים מ-*nix
    "/opt/homebrew/etc/openssl@3/cert.pem", // Homebrew (Apple Silicon)
    "/usr/local/etc/openssl@3/cert.pem", // Homebrew (Intel)
    "/etc/ssl/certs/ca-certificates.crt", // Debian/Ubuntu
  ].filter(Boolean);
  for (const p of candidates) {
    try {
      ca.push(fs.readFileSync(p, "utf8"));
    } catch {
      /* ignore — קובץ לא קיים במערכת הזו */
    }
  }
  return ca.length ? ca : undefined;
}

const httpsAgent = new https.Agent({ keepAlive: true, ca: buildCa() });

const DEFAULTS = {
  anthropic: { model: "claude-opus-4-8", version: "2023-06-01" },
  openai: { model: "gpt-4o-mini" },
};

function provider() {
  return (process.env.LLM_PROVIDER || "anthropic").toLowerCase();
}

function apiKey() {
  return provider() === "openai"
    ? process.env.OPENAI_API_KEY
    : process.env.ANTHROPIC_API_KEY;
}

function model() {
  if (provider() === "openai") {
    return process.env.OPENAI_MODEL || DEFAULTS.openai.model;
  }
  return process.env.ANTHROPIC_MODEL || DEFAULTS.anthropic.model;
}

/** האם יש מפתח אמיתי (לא placeholder). */
function isEnabled() {
  const k = apiKey();
  if (!k) return false;
  if (k.includes("sk-ant-...") || k.includes("sk-...")) return false;
  return k.length > 20;
}

function info() {
  return { provider: provider(), model: model(), aiEnabled: isEnabled() };
}

/* ---------- בקשת HTTPS גנרית ---------- */

function httpsJson({ host, path: reqPath, headers, body }) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request(
      {
        method: "POST",
        host,
        path: reqPath,
        agent: httpsAgent,
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(payload),
          ...headers,
        },
        timeout: 60000,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let parsed = null;
          try {
            parsed = JSON.parse(text);
          } catch {
            /* ignore */
          }
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${text.slice(0, 300)}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.write(payload);
    req.end();
  });
}

/**
 * קריאה אחת ל-LLM. מחזיר טקסט (string) או זורק שגיאה.
 * @param {{ system?: string, messages: Array<{role:string, content:string}>, maxTokens?: number }} opts
 */
async function complete({ system = "", messages = [], maxTokens = 1024 }) {
  if (!isEnabled()) throw new Error("AI disabled (no API key)");

  if (provider() === "openai") {
    const data = await httpsJson({
      host: "api.openai.com",
      path: "/v1/chat/completions",
      headers: { authorization: `Bearer ${apiKey()}` },
      body: {
        model: model(),
        max_tokens: maxTokens,
        messages: [
          ...(system ? [{ role: "system", content: system }] : []),
          ...messages,
        ],
      },
    });
    return data?.choices?.[0]?.message?.content?.trim() || "";
  }

  // Anthropic Messages API
  const data = await httpsJson({
    host: "api.anthropic.com",
    path: "/v1/messages",
    headers: {
      "x-api-key": apiKey(),
      "anthropic-version": DEFAULTS.anthropic.version,
    },
    body: {
      model: model(),
      max_tokens: maxTokens,
      ...(system ? { system } : {}),
      messages: messages.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content ?? ""),
      })),
    },
  });

  const block = Array.isArray(data?.content)
    ? data.content.find((b) => b.type === "text")
    : null;
  return (block?.text || "").trim();
}

module.exports = { isEnabled, info, complete, provider, model };
