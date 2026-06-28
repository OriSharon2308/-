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
 * ───────────── Anthropic Prompt Caching ─────────────
 * בונה את שדה ה-system עבור Anthropic, עם תמיכה ב-Prompt Caching.
 *
 * איך caching עובד כאן?
 *  - שולחים את ה-system לא כמחרוזת אלא כמערך "בלוקים". על הבלוק האחרון
 *    שרוצים לשמור במטמון מסמנים `cache_control: { type: "ephemeral" }`.
 *  - Anthropic שומר במטמון את כל ה-prefix עד נקודת הסימון (כולל). בקריאה
 *    הבאה, אם ה-prefix *זהה בתו* — משלמים עליו ~10% בלבד (cache read) במקום
 *    מחיר מלא, וזה גם מהיר יותר. המטמון חי ~5 דקות ומתחדש בכל פגיעה.
 *  - חשוב: רק ה-system (החלק הקבוע — דמות המורה + שיטת ההוראה + הכלים +
 *    פרופיל הילד) נכנס למטמון. הודעת הילד (messages) משתנה בכל פנייה ולכן
 *    *נשארת מחוץ למטמון* — בדיוק מה שרצינו.
 *  - תנאי סף: caching נכנס לפעולה רק כשה-prefix מספיק גדול (~1024 טוקנים
 *    ל-Sonnet/Opus, ~2048 ל-Haiku). prefix קצר מדי פשוט לא נשמר (בלי שגיאה).
 *  - אין צורך בכותרת beta: ב-Anthropic Prompt Caching הוא GA במודלים הנוכחיים.
 *
 * קלט אפשרי:
 *  - מחרוזת + cacheSystem=false → מוחזרת כמחרוזת (התנהגות ישנה, בלי מטמון).
 *  - מחרוזת + cacheSystem=true  → בלוק יחיד עם cache_control (כל ה-system במטמון).
 *  - מערך [{text, cache?}]       → שליטה עדינה: כל בלוק נשמר/לא לפי הדגל,
 *    כך אפשר לקבע prefix יציב (דמות+שיטה) במטמון ולהשאיר חלק קטן מחוץ.
 */
function buildSystemField(system, cacheSystem) {
  if (Array.isArray(system)) {
    const blocks = system
      .filter((s) => s && s.text)
      .map((s) => {
        const b = { type: "text", text: String(s.text) };
        if (s.cache) b.cache_control = { type: "ephemeral" };
        return b;
      });
    return blocks.length ? blocks : undefined;
  }
  if (typeof system === "string" && system) {
    if (!cacheSystem) return system; // תואם לאחור — מחרוזת רגילה, בלי מטמון
    return [{ type: "text", text: system, cache_control: { type: "ephemeral" } }];
  }
  return undefined;
}

// מאחד system (מחרוזת/מערך בלוקים) למחרוזת אחת — ל-OpenAI שאין לו caching מובנה כזה.
function systemToString(system) {
  if (Array.isArray(system)) return system.map((s) => (s && s.text) || "").join("\n");
  return typeof system === "string" ? system : "";
}

/**
 * קריאה אחת ל-LLM. מחזיר טקסט (string) או זורק שגיאה.
 * @param {{ system?: string|Array<{text:string,cache?:boolean}>, messages: Array<{role:string, content:string}>, maxTokens?: number, model?: string, cacheSystem?: boolean }} opts
 */
async function complete({ system = "", messages = [], maxTokens = 1024, model: modelOverride = null, cacheSystem = false }) {
  if (!isEnabled()) throw new Error("AI disabled (no API key)");
  const useModel = (modelOverride && String(modelOverride).trim()) || model();

  if (provider() === "openai") {
    const sysStr = systemToString(system);
    const data = await httpsJson({
      host: "api.openai.com",
      path: "/v1/chat/completions",
      headers: { authorization: `Bearer ${apiKey()}` },
      body: {
        model: useModel,
        max_tokens: maxTokens,
        messages: [
          ...(sysStr ? [{ role: "system", content: sysStr }] : []),
          // OpenAI אינו תומך בפורמט בלוקי-תמונה של Anthropic — משטחים לטקסט (התמונות נופלות).
          ...messages.map((m) => ({
            role: m.role,
            content: Array.isArray(m.content)
              ? m.content.filter((b) => b && b.type === "text").map((b) => b.text).join("\n")
              : String(m.content ?? ""),
          })),
        ],
      },
    });
    return data?.choices?.[0]?.message?.content?.trim() || "";
  }

  // Anthropic Messages API
  const sys = buildSystemField(system, cacheSystem);
  const data = await httpsJson({
    host: "api.anthropic.com",
    path: "/v1/messages",
    headers: {
      "x-api-key": apiKey(),
      "anthropic-version": DEFAULTS.anthropic.version,
    },
    body: {
      model: useModel,
      max_tokens: maxTokens,
      ...(sys ? { system: sys } : {}),
      messages: messages.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        // מחרוזת רגילה, או מערך בלוקים (טקסט+תמונה) — לראייה ממוחשבת (vision).
        content: Array.isArray(m.content) ? m.content : String(m.content ?? ""),
      })),
    },
  });

  // לוג מטמון: כמה טוקנים נכתבו למטמון (קריאה ראשונה) וכמה נקראו ממנו (חיסכון).
  const u = data && data.usage;
  if (u && (u.cache_creation_input_tokens || u.cache_read_input_tokens)) {
    console.log(
      `[cache] created=${u.cache_creation_input_tokens || 0} read=${u.cache_read_input_tokens || 0} input=${u.input_tokens || 0}`
    );
  }

  const block = Array.isArray(data?.content)
    ? data.content.find((b) => b.type === "text")
    : null;
  return (block?.text || "").trim();
}

/**
 * קריאה ל-LLM עם Tool Use (Anthropic). מחזיר { text, toolCalls, stopReason }.
 * toolCalls = [{ id, name, input(object) }] — מוכן להרצה בלקוח (board.runTools).
 * אנתרופיק בלבד (כמו ה-vision). תואם caching דרך cacheSystem.
 */
async function completeTools({ system = "", messages = [], tools = [], maxTokens = 1024, model: modelOverride = null, cacheSystem = false }) {
  if (!isEnabled()) throw new Error("AI disabled (no API key)");
  const useModel = (modelOverride && String(modelOverride).trim()) || model();
  const sys = buildSystemField(system, cacheSystem);
  const data = await httpsJson({
    host: "api.anthropic.com",
    path: "/v1/messages",
    headers: { "x-api-key": apiKey(), "anthropic-version": DEFAULTS.anthropic.version },
    body: {
      model: useModel,
      max_tokens: maxTokens,
      ...(sys ? { system: sys } : {}),
      ...(Array.isArray(tools) && tools.length ? { tools } : {}),
      messages: messages.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: Array.isArray(m.content) ? m.content : String(m.content ?? ""),
      })),
    },
  });
  const u = data && data.usage;
  if (u && (u.cache_creation_input_tokens || u.cache_read_input_tokens)) {
    console.log(`[cache] created=${u.cache_creation_input_tokens || 0} read=${u.cache_read_input_tokens || 0} input=${u.input_tokens || 0}`);
  }
  let text = "";
  const toolCalls = [];
  const content = Array.isArray(data && data.content) ? data.content : [];
  for (const b of content) {
    if (b.type === "text") text += b.text;
    else if (b.type === "tool_use") toolCalls.push({ id: b.id, name: b.name, input: b.input });
  }
  // content = הבלוקים הגולמיים של ה-assistant (להחזרה בלולאת Tool Use).
  return { text: text.trim(), toolCalls, stopReason: data && data.stop_reason, content };
}

/* ---------- בקשת HTTPS זורמת (SSE) ---------- */
// פותח חיבור POST ומפעיל onEvent לכל אירוע SSE (אובייקט ה-data המפוענח). דוחה על שגיאת HTTP/רשת.
function httpsStream({ host, path: reqPath, headers, body }, onEvent) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request(
      { method: "POST", host, path: reqPath, agent: httpsAgent,
        headers: { "content-type": "application/json", "content-length": Buffer.byteLength(payload), accept: "text/event-stream", ...headers },
        timeout: 120000 },
      (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          const chunks = []; res.on("data", (c) => chunks.push(c));
          res.on("error", reject); // שגיאת-רשת תוך כדי קריאת גוף-השגיאה → דחייה מיידית (לא להמתין ל-timeout)
          res.on("end", () => reject(new Error(`HTTP ${res.statusCode}: ${Buffer.concat(chunks).toString("utf8").slice(0, 300)}`)));
          return;
        }
        let buf = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          buf += chunk;
          let i;
          while ((i = buf.indexOf("\n\n")) >= 0) {
            const block = buf.slice(0, i); buf = buf.slice(i + 2);
            let dataStr = "";
            for (const line of block.split("\n")) if (line.startsWith("data:")) dataStr += line.slice(5).trim();
            if (!dataStr || dataStr === "[DONE]") continue;
            let ev = null; try { ev = JSON.parse(dataStr); } catch { continue; }
            try { onEvent(ev); } catch (e) { /* לא מפילים את הזרם בגלל handler */ }
          }
        });
        res.on("end", resolve);
        res.on("error", reject);
      }
    );
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.write(payload); req.end();
  });
}

/**
 * כמו completeTools, אך *זורם*: onToolCall({id,name,input}) נקרא לכל כלי ברגע שהוא נשלם
 * (content_block_stop) — כך הלקוח מצייר צעד-אחר-צעד תוך כדי שהמודל עוד מייצר. Anthropic בלבד;
 * לספקים אחרים נופל לאחור ל-completeTools. מחזיר אותו מבנה { text, toolCalls, stopReason, content }.
 */
async function completeToolsStream({ system = "", messages = [], tools = [], maxTokens = 1024, model: modelOverride = null, cacheSystem = false, onToolCall = null, onText = null }) {
  if (!isEnabled()) throw new Error("AI disabled (no API key)");
  if (provider() !== "anthropic") {
    const r = await completeTools({ system, messages, tools, maxTokens, model: modelOverride, cacheSystem });
    if (onToolCall) for (const tc of r.toolCalls) { try { onToolCall(tc); } catch (e) { /* ignore */ } }
    return r;
  }
  const useModel = (modelOverride && String(modelOverride).trim()) || model();
  const sys = buildSystemField(system, cacheSystem);
  const blocks = {}; // index → { type, id, name, json, text }
  const toolCalls = [], content = [];
  let text = "", stopReason = null, streamErr = null;
  await httpsStream(
    { host: "api.anthropic.com", path: "/v1/messages",
      headers: { "x-api-key": apiKey(), "anthropic-version": DEFAULTS.anthropic.version },
      body: {
        model: useModel, max_tokens: maxTokens, stream: true,
        ...(sys ? { system: sys } : {}),
        ...(Array.isArray(tools) && tools.length ? { tools } : {}),
        messages: messages.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: Array.isArray(m.content) ? m.content : String(m.content ?? "") })),
      } },
    (ev) => {
      if (ev.type === "content_block_start") {
        const cb = ev.content_block || {};
        blocks[ev.index] = { type: cb.type, id: cb.id, name: cb.name, json: "", text: cb.type === "text" ? (cb.text || "") : "" };
      } else if (ev.type === "content_block_delta") {
        const b = blocks[ev.index]; if (!b) return;
        const d = ev.delta || {};
        if (d.type === "input_json_delta") b.json += d.partial_json || "";
        else if (d.type === "text_delta") { b.text += d.text || ""; text += d.text || ""; if (onText) onText(d.text || ""); }
      } else if (ev.type === "content_block_stop") {
        const b = blocks[ev.index]; if (!b) return;
        if (b.type === "tool_use") {
          let input = {}; try { input = b.json ? JSON.parse(b.json) : {}; } catch { input = {}; }
          const tc = { id: b.id, name: b.name, input };
          toolCalls.push(tc); content.push({ type: "tool_use", id: b.id, name: b.name, input });
          if (onToolCall) { try { onToolCall(tc); } catch (e) { /* ignore */ } }
        } else if (b.type === "text" && b.text && b.text.trim()) {
          content.push({ type: "text", text: b.text }); // בלוק טקסט ריק יידחה ע"י ה-API (400) כשמוחזר בלולאת ה-Tool Use
        }
      } else if (ev.type === "message_delta") {
        if (ev.delta && ev.delta.stop_reason) stopReason = ev.delta.stop_reason;
      } else if (ev.type === "error") {
        streamErr = new Error((ev.error && ev.error.message) || "stream error");
      }
    }
  );
  if (streamErr) throw streamErr;
  return { text: text.trim(), toolCalls, stopReason, content };
}

module.exports = { isEnabled, info, complete, completeTools, completeToolsStream, provider, model };
