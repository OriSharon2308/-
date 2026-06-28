/* eslint-disable no-console */

const http = require("http");
const fs = require("fs");
const path = require("path");

const { loadEnvFile } = require("./lib/env");
const { runChat, getAgentStatus } = require("./agent/orchestrator");
const { visionDescribeBoard } = require("./agent/vision-agent"); // המורה "רואה" את ציור הילד
const { teacherDraw } = require("./agent/draw-agent"); // המורה מסרטט על הלוח דרך Tool Use
const { mathematicianCreate } = require("./agent/mathematician-agent");
const { designerDiagram } = require("./agent/designer-agent");
const bank = require("./lib/bank");
const { genderize, genderizeProblem } = require("./lib/gender");
const users = require("./lib/users");
const sessions = require("./lib/session");
const memory = require("./lib/memory");
const learnerProfile = require("./lib/learner-profile"); // פרופיל ילד מתומצת משותף
const progress = require("./lib/progress");
const speech = require("./lib/speech"); // STT + TTS (Azure Speech)
const googleTts = require("./lib/google-tts"); // TTS חלופי: Google Gemini (קול Orus) דרך Vertex+ADC
const { CURRICULUM, gradeToNum, topicsForApi, leafTopics, findLeaf } = require("./lib/curriculum");

const ROOT = __dirname;
loadEnvFile(ROOT);

const PORT = Number.parseInt(process.env.PORT || "8787", 10);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

// קבצים שמותר לראות בלי התחברות
const PUBLIC_FILES = new Set([
  "/auth.html",
  "/auth.js",
  "/auth.css",
  "/styles.css",
  "/favicon.ico",
]);

function send(res, status, headers, body) {
  res.writeHead(status, headers);
  res.end(body);
}

function json(res, status, obj, extraHeaders = {}) {
  send(
    res,
    status,
    { "content-type": "application/json; charset=utf-8", ...extraHeaders },
    JSON.stringify(obj)
  );
}

// קריאת גוף טקסט עם תקרת גודל — מגן מהצפת זיכרון (DoS). דחייה תוך-כדי הזרמה.
function readBody(req, maxBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > maxBytes) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function readJsonBody(req, res, maxBytes) {
  let raw;
  try {
    raw = await readBody(req, maxBytes);
  } catch (e) {
    json(res, 413, { error: "Payload too large" });
    return null;
  }
  try {
    return JSON.parse(raw || "{}");
  } catch {
    json(res, 400, { error: "Bad JSON" });
    return null;
  }
}

// קריאת גוף בינארי (אודיו) — מחזיר Buffer, עם תקרת גודל למניעת העלאות ענק
function readRawBody(req, maxBytes = 12 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > maxBytes) {
        reject(new Error("audio too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function safePath(urlPath) {
  const clean = urlPath.split("?")[0].split("#")[0];
  const decoded = decodeURIComponent(clean);
  const normalized = path.posix.normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, "");
  return normalized;
}

function serveFile(res, relPath, method) {
  const filePath = path.join(ROOT, relPath);
  if (!filePath.startsWith(ROOT)) return send(res, 403, {}, "Forbidden");
  fs.readFile(filePath, (err, data) => {
    if (err) return send(res, 404, {}, "Not found");
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || "application/octet-stream";
    const headers = { "content-type": mime, "cache-control": "no-store" };
    if (method === "HEAD") return send(res, 200, headers, "");
    return send(res, 200, headers, data);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const method = req.method || "GET";
    const url = req.url || "/";

    /* ---------------- API: אימות ---------------- */

    if (url.startsWith("/api/register")) {
      if (method !== "POST") return json(res, 405, { error: "Method not allowed" });
      const body = await readJsonBody(req, res);
      if (!body) return;
      const result = users.registerUser(body);
      if (!result.ok) return json(res, 400, { ok: false, errors: result.errors });
      const token = sessions.createSession(result.user.id);
      return json(res, 200, { ok: true, user: result.user }, {
        "set-cookie": sessions.buildSetCookie(token),
      });
    }

    if (url.startsWith("/api/login")) {
      if (method !== "POST") return json(res, 405, { error: "Method not allowed" });
      const body = await readJsonBody(req, res);
      if (!body) return;
      const result = users.authenticate(body.username, body.password);
      if (!result.ok) return json(res, 401, { ok: false, errors: result.errors });
      const token = sessions.createSession(result.user.id);
      return json(res, 200, { ok: true, user: result.user }, {
        "set-cookie": sessions.buildSetCookie(token),
      });
    }

    if (url.startsWith("/api/logout")) {
      if (method !== "POST") return json(res, 405, { error: "Method not allowed" });
      sessions.destroySession(sessions.getTokenFromRequest(req));
      return json(res, 200, { ok: true }, { "set-cookie": sessions.buildClearCookie() });
    }

    if (url.startsWith("/api/me")) {
      if (method !== "GET") return json(res, 405, { error: "Method not allowed" });
      const userId = sessions.currentUserId(req);
      const user = userId ? users.getUserById(userId) : null;
      if (!user) return json(res, 401, { ok: false });
      return json(res, 200, { ok: true, user });
    }

    if (url.startsWith("/api/delete-account")) {
      if (method !== "POST") return json(res, 405, { error: "Method not allowed" });
      const userId = sessions.currentUserId(req);
      if (!userId) return json(res, 401, { ok: false });
      // מוחקים זיכרון → פרופיל → התקדמות → חשבון → כל ה-sessions, ומנקים את העוגייה
      memory.deleteUserMemory(userId);
      learnerProfile.deleteUser(userId);
      progress.deleteUser(userId);
      users.deleteUser(userId);
      sessions.destroyAllForUser(userId);
      return json(res, 200, { ok: true }, { "set-cookie": sessions.buildClearCookie() });
    }

    /* ---------------- API: סטטוס (ציבורי) ---------------- */

    if (url.startsWith("/api/status")) {
      if (method !== "GET") return json(res, 405, { error: "Method not allowed" });
      {
        const useGoogle = (process.env.TTS_PROVIDER || "azure").toLowerCase() === "google";
        return json(res, 200, {
          ...getAgentStatus(),
          speech: speech.info(), // STT (Azure)
          tts: useGoogle ? googleTts.info() : { ttsProvider: "azure", voice: speech.info().voice },
          ttsStream: useGoogle && googleTts.streamEnabled() && googleTts.isEnabled(),
        });
      }
    }

    /* ---------------- API: צ'אט ותרגילים (דורש התחברות) ---------------- */

    if (url.startsWith("/api/chat")) {
      if (method !== "POST") return json(res, 405, { error: "Method not allowed" });
      const userId = sessions.currentUserId(req);
      if (!userId) return json(res, 401, { error: "Not authenticated" });
      const body = await readJsonBody(req, res);
      if (!body) return;
      body.userId = userId; // לא סומכים על ה-userId מהלקוח
      const chatUser = users.getUserById(userId);
      body.gender = chatUser?.gender || "male"; // המורה יפנה לפי מין התלמיד
      // שם התלמיד → המורה יכיר אותו ויפנה אליו בשמו מדי פעם
      if (chatUser?.username) body.student = Object.assign({}, body.student, { name: chatUser.username });
      const tChat = Date.now();
      const result = await runChat(body);
      console.log(`[timing] chat total (runChat): ${Date.now() - tChat}ms  voice=${!!body.voice}`);
      // ניסוח תשובת המורה לפי מין התלמיד (גם אם ה-AI כתב עם לוכסן)
      if (result && typeof result.reply === "string") {
        result.reply = genderize(result.reply, body.gender);
        // מסירים סימוני הדגשה של markdown (**) — מציקים בטקסט ונקראים בקול
        result.reply = result.reply.replace(/\*\*/g, "").replace(/__/g, "");
        // שיחה בקול: בלי אימוג'ים ובלי סימני קריאה (פחות דרמטי/נחרץ) — ערובה בנוסף להנחיה ב-prompt
        if (body.voice) {
          result.reply = result.reply
            .replace(
              /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{2122}\u{2139}]/gu,
              ""
            )
            .replace(/!/g, ".")
            .replace(/\?\./g, "?")
            .replace(/\.\?/g, "?")
            .replace(/\?{2,}/g, "?")
            .replace(/\.{2,}/g, ".")
            .replace(/[ \t]{2,}/g, " ")
            .trim();
        }
      }
      // הערה: סימון "נראתה" נעשה בהגשה (ב-/api/problem) — כך שום שאלה לא חוזרת
      return json(res, 200, result);
    }

    /* ---------------- API: ראייה — המורה מסתכל על ציור הילד (דורש התחברות) ---------------- */

    if (url.startsWith("/api/see")) {
      if (method !== "POST") return json(res, 405, { error: "Method not allowed" });
      const userId = sessions.currentUserId(req);
      if (!userId) return json(res, 401, { error: "Not authenticated" });
      const body = await readJsonBody(req, res, 14 * 1024 * 1024); // תמונה — תקרה גבוהה יותר
      if (!body) return;
      // מקבלים data-URL ("data:image/png;base64,...") או base64 גולמי
      const raw = String(body.image || "");
      const m = raw.match(/^data:(image\/(?:png|jpeg|gif|webp));base64,([\s\S]+)$/);
      const mediaType = m ? m[1] : "image/png";
      const data = m ? m[2] : raw.replace(/^data:[^,]*,/, "");
      if (!data || data.length > 10 * 1024 * 1024) {
        return json(res, 400, { ok: false, error: "bad_image", message: "תמונה חסרה או גדולה מדי" });
      }
      const seeUser = users.getUserById(userId);
      const topic = body.topic && body.topic.title ? String(body.topic.title) : "";
      const tSee = Date.now();
      const result = await visionDescribeBoard({
        image: data,
        mediaType,
        gender: seeUser?.gender || "male",
        topic,
        userId,
      });
      console.log(`[timing] see total: ${Date.now() - tSee}ms`);
      return json(res, 200, result);
    }

    /* ---------------- API: סרטוט — המורה מצייר על הלוח (Tool Use, דורש התחברות) ---------------- */

    if (url.startsWith("/api/teach")) {
      if (method !== "POST") return json(res, 405, { error: "Method not allowed" });
      const userId = sessions.currentUserId(req);
      if (!userId) return json(res, 401, { error: "Not authenticated" });
      const body = await readJsonBody(req, res);
      if (!body) return;
      const teachUser = users.getUserById(userId);
      const tTeach = Date.now();
      // תשובה זורמת (NDJSON): כל פקודת ציור נשלחת מיד כשהמודל מסיים אותה, ובסוף אירוע done עם הטקסט.
      res.writeHead(200, { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store", "x-accel-buffering": "no" });
      const writeEvent = (obj) => { try { res.write(JSON.stringify(obj) + "\n"); } catch (_) { /* הלקוח התנתק */ } };
      try {
        const result = await teacherDraw({
          messageText: String(body.messageText || ""),
          history: Array.isArray(body.history) ? body.history : [],
          gender: teachUser?.gender || "male",
          topic: body.topic && body.topic.title ? String(body.topic.title) : "",
          geometry: body.geometry || null,
          occupied: Array.isArray(body.occupied) ? body.occupied : [],
          userId,
          onToolCall: (tc) => writeEvent({ type: "tool", tool: { name: tc.name, input: tc.input } }),
        });
        writeEvent({ type: "done", reply: result.reply || "", mode: result.mode || "ai" });
      } catch (e) {
        console.error("teach stream error:", e.message);
        writeEvent({ type: "done", reply: "אופס, לא הצלחתי לסרטט כרגע. ננסה שוב?", mode: "error" });
      }
      console.log(`[timing] teach total: ${Date.now() - tTeach}ms`);
      return res.end();
    }

    /* ---------------- API: דיבור (STT/TTS) — דורש התחברות ---------------- */

    // דיבור→טקסט: מקבל אודיו גולמי (WAV) בגוף הבקשה → מחזיר טקסט עברי
    if (url.startsWith("/api/stt")) {
      if (method !== "POST") return json(res, 405, { error: "Method not allowed" });
      if (!sessions.currentUserId(req)) return json(res, 401, { error: "Not authenticated" });
      if (!speech.isEnabled())
        return json(res, 503, { ok: false, error: "speech_disabled", message: "שירות הדיבור אינו מוגדר בשרת" });
      let audio;
      try {
        audio = await readRawBody(req);
      } catch (e) {
        return json(res, 413, { ok: false, error: "audio_too_large", message: "ההקלטה ארוכה/גדולה מדי" });
      }
      try {
        const t0 = Date.now();
        const text = await speech.transcribe(audio, req.headers["content-type"] || "audio/wav");
        console.log(`[timing] STT (Azure): ${Date.now() - t0}ms  (${audio.length}B → "${String(text).slice(0, 24)}")`);
        return json(res, 200, { ok: true, text });
      } catch (e) {
        return json(res, 502, { ok: false, error: "stt_failed", message: e.message });
      }
    }

    // טקסט→דיבור: מקבל JSON {text} → מחזיר WAV. ספק לפי TTS_PROVIDER (google = Gemini/Orus, אחרת Azure)
    if (url.startsWith("/api/tts")) {
      if (method !== "POST") return json(res, 405, { error: "Method not allowed" });
      if (!sessions.currentUserId(req)) return json(res, 401, { error: "Not authenticated" });
      const useGoogle = (process.env.TTS_PROVIDER || "azure").toLowerCase() === "google";
      const ttsEnabled = useGoogle ? googleTts.isEnabled() : speech.isEnabled();
      if (!ttsEnabled)
        return json(res, 503, { ok: false, error: "speech_disabled", message: "שירות הדיבור אינו מוגדר בשרת" });
      const body = await readJsonBody(req, res);
      if (!body) return;
      try {
        // שני הספקים מחזירים WAV/PCM — נפענח אמין ב-<audio> של הדפדפן
        const tTts = Date.now();
        const wav = useGoogle
          ? await googleTts.synthesize(String(body.text || ""))
          : await speech.synthesize(String(body.text || ""), { format: "riff-24khz-16bit-mono-pcm" });
        console.log(`[timing] TTS (${useGoogle ? "google" : "azure"}): ${Date.now() - tTts}ms  (${wav.length}B, ${String(body.text || "").length} תווים)`);
        return send(res, 200, {
          "content-type": "audio/wav",
          "cache-control": "no-store",
          "content-length": wav.length,
        }, wav);
      } catch (e) {
        return json(res, 502, { ok: false, error: "tts_failed", message: e.message });
      }
    }

    // טקסט→דיבור ב-STREAMING: מחזיר PCM גולמי (L16 24kHz מונו) ב-chunks, כדי שהדפדפן
    // יתחיל לנגן ~שנייה אחרי הבקשה. כבוי (503) → הדפדפן נופל אוטומטית ל-/api/tts המלא.
    if (url.startsWith("/api/tts-stream")) {
      if (method !== "POST") return json(res, 405, { error: "Method not allowed" });
      if (!sessions.currentUserId(req)) return json(res, 401, { error: "Not authenticated" });
      const streamOn =
        (process.env.TTS_PROVIDER || "azure").toLowerCase() === "google" &&
        googleTts.streamEnabled() &&
        googleTts.isEnabled();
      if (!streamOn) return json(res, 503, { ok: false, error: "stream_disabled" }); // → fallback בלקוח
      const body = await readJsonBody(req, res);
      if (!body) return;
      const t0 = Date.now();
      let first = null, clientGone = false;
      // הילד קטע את המורה → הדפדפן סוגר את החיבור → מבטלים את ה-upstream (חוסך יצירת TTS שלמה)
      res.on("close", () => { clientGone = true; });
      try {
        await googleTts.synthesizeStream(String(body.text || ""), (pcm) => {
          if (clientGone || res.writableEnded || res.destroyed) return false; // → google-tts יבטל את הבקשה ל-Vertex
          if (first === null) {
            first = Date.now() - t0;
            console.log(`[timing] TTS-stream chunk ראשון: ${first}ms`);
            res.writeHead(200, {
              "content-type": `audio/l16; rate=${googleTts.STREAM_RATE}`,
              "cache-control": "no-store",
              "x-sample-rate": String(googleTts.STREAM_RATE),
            });
          }
          res.write(pcm);
          return true;
        });
        if (clientGone) return; // הלקוח נסגר באמצע — אין מה לכתוב/לסיים
        if (first === null) return json(res, 502, { ok: false, error: "no_audio" });
        console.log(`[timing] TTS-stream total: ${Date.now() - t0}ms (חלקים נשלחו)`);
        return res.end();
      } catch (e) {
        console.warn("TTS-stream error:", e.message);
        if (!res.headersSent) return json(res, 502, { ok: false, error: "tts_stream_failed", message: e.message });
        try { return res.end(); } catch (_) { /* ignore */ }
      }
    }

    if (url.startsWith("/api/topics")) {
      if (method !== "GET") return json(res, 405, { error: "Method not allowed" });
      const userId = sessions.currentUserId(req);
      if (!userId) return json(res, 401, { ok: false });
      const user = users.getUserById(userId);
      const gradeNum = gradeToNum(user?.grade);
      const topics = gradeNum ? topicsForApi(gradeNum) : [];
      // כמויות שאלות לכל רמה, לכל נושא-עלה — כדי שמד השאלות יהיה זמין מיד
      const topicLevels = {};
      if (gradeNum) {
        for (const t of leafTopics(gradeNum)) {
          topicLevels[t.key] = bank.levelCounts(gradeNum, t.key);
        }
      }
      return json(res, 200, { ok: true, grade: user?.grade || null, gradeNum, topics, topicLevels });
    }

    if (url.startsWith("/api/problem")) {
      if (method !== "POST") return json(res, 405, { error: "Method not allowed" });
      const userId = sessions.currentUserId(req);
      if (!userId) return json(res, 401, { error: "Not authenticated" });
      const body = await readJsonBody(req, res);
      if (!body) return;
      // הכיתה נקבעת מהחשבון (לא סומכים על הלקוח)
      const user = users.getUserById(userId);
      body.grade = user?.grade || body.grade;
      const gradeNum = gradeToNum(body.grade);

      // ממיר נושא-אב / שם ישן (כמו "חיבור עד 20") למפתח העלה האמיתי — מקור אמת אחד לכל המנגנון
      if (typeof body.topic === "string" && gradeNum) {
        const leaf = findLeaf(gradeNum, body.topic);
        if (leaf && leaf.key) body.topic = leaf.key;
      }

      // נושא מחזורי (כמו ציור צורות) — מותר לחזור עליו: בלי מעקב "נראה" ובלי מיצוי
      const repeatable = !!(
        typeof body.topic === "string" &&
        gradeNum &&
        findLeaf(gradeNum, body.topic) &&
        findLeaf(gradeNum, body.topic).repeatable
      );

      // "לחזור על הרמה" (אופציה מפורשת של התלמיד) — מאפס את ההיסטוריה לנושא
      if (body.resetSeen && typeof body.topic === "string" && gradeNum) {
        progress.clearSeen(userId, gradeNum, body.topic);
      }

      // לא חוזרים על שום שאלה שכבר הוצגה (מתמשך) + מה שנשלף במושב — אבל לא בנושא מחזורי
      if (typeof body.topic === "string" && gradeNum) {
        const seen = repeatable ? [] : progress.getSeen(userId, gradeNum, body.topic);
        const session = Array.isArray(body.excludeIds) ? body.excludeIds : [];
        body.excludeIds = Array.from(new Set([...seen, ...session]));
      }

      const math = await mathematicianCreate(body);

      const problem = math.problem || null;
      if (problem && problem.needsDiagram) {
        const diagram = await designerDiagram(problem);
        if (diagram) {
          problem.diagramSvg = diagram.svg;
          problem.diagramAlt = diagram.alt;
        }
      }
      // מסמנים כל שאלה שהוצגה — כך היא לא תחזור (לא בנושא מחזורי)
      if (!repeatable && problem && problem.id && math.gradeNum && math.topic) {
        progress.markSeen(userId, math.gradeNum, math.topic, problem.id);
      }
      // ניסוח לפי מין התלמיד — בלי הסרבול של "צייר/י"
      if (problem) genderizeProblem(problem, user?.gender);
      const levels =
        math.gradeNum && math.topic ? bank.availableLevels(math.gradeNum, math.topic) : [];
      const counts =
        math.gradeNum && math.topic ? bank.levelCounts(math.gradeNum, math.topic) : {};
      return json(res, 200, {
        problem,
        mode: math.mode,
        topic: math.topic,
        gradeNum: math.gradeNum,
        availableLevels: levels,
        levelCounts: counts,
      });
    }

    /* ---------------- קבצים סטטיים + שערי כניסה ---------------- */

    if (method !== "GET" && method !== "HEAD") {
      return send(res, 405, {}, "Method not allowed");
    }

    const rel = safePath(url);

    // עמוד ההתחברות
    if (rel === "/auth" || rel === "/auth/") {
      return serveFile(res, "/auth.html", method);
    }

    const loggedIn = !!sessions.currentUserId(req);

    // שורש: דף הבית (אם מחובר), אחרת → התחברות
    if (rel === "/" || rel === "/home" || rel === "/home.html") {
      if (!loggedIn) {
        return send(res, 302, { location: "/auth" }, "");
      }
      return serveFile(res, "/home.html", method);
    }

    // אזור התרגול
    if (rel === "/practice" || rel === "/index.html") {
      if (!loggedIn) {
        return send(res, 302, { location: "/auth" }, "");
      }
      return serveFile(res, "/index.html", method);
    }

    // אזור הלמידה
    if (rel === "/learn" || rel === "/learn.html") {
      if (!loggedIn) {
        return send(res, 302, { location: "/auth" }, "");
      }
      return serveFile(res, "/learn.html", method);
    }

    // עמוד הלמידה — דף ענק של משבצות (הלוח במסך מלא)
    if (rel === "/learn-board" || rel === "/learn-board.html") {
      if (!loggedIn) {
        return send(res, 302, { location: "/auth" }, "");
      }
      return serveFile(res, "/learn-board.html", method);
    }

    // דף בדיקת הלוח (כלי המורה + ציור הילד, להרצה ידנית בפיתוח)
    if (rel === "/board-test" || rel === "/board-test.html") {
      if (!loggedIn) {
        return send(res, 302, { location: "/auth" }, "");
      }
      return serveFile(res, "/board-test.html", method);
    }

    // מסך ההתקדמות
    if (rel === "/progress" || rel === "/progress.html") {
      if (!loggedIn) {
        return send(res, 302, { location: "/auth" }, "");
      }
      return serveFile(res, "/progress.html", method);
    }

    // קבצים ציבוריים
    if (PUBLIC_FILES.has(rel)) {
      return serveFile(res, rel, method);
    }

    // קבצי פונט — ציבוריים (גם מסך ההתחברות צריך אותם)
    if (rel.startsWith("/fonts/")) {
      return serveFile(res, rel, method);
    }

    // כל השאר דורש התחברות
    if (!loggedIn) {
      return send(res, 302, { location: "/auth" }, "");
    }
    return serveFile(res, rel, method);
  } catch (e) {
    console.error(e);
    return send(res, 500, {}, "Server error");
  }
});

// מאזין רק כשמריצים את הקובץ ישירות (node server.js) — כך טעינה כמודול לא קורסת
if (require.main === module) {
  server.listen(PORT, "0.0.0.0", () => {
    const status = getAgentStatus();
    console.log("מערכת לימוד — שרת פעיל (חשבונות + 4 סוכנים)");
    console.log(`אתר:  http://localhost:${PORT}`);
    console.log("התחברות נדרשת — דף הרשמה/כניסה ב-/auth");
    if (status.aiEnabled) {
      console.log(`AI:   ${status.provider} / ${status.model}`);
    } else {
      console.log("AI:   מצב מקומי — הוסף מפתח ב-.env (ראה .env.example)");
    }
    // שמירת ה-token של Google TTS חם — קריאות המשתמש לא ישלמו את ה-token הקר
    if ((process.env.TTS_PROVIDER || "azure").toLowerCase() === "google") {
      googleTts.warmToken().then((ok) => console.log(`Google TTS token: ${ok ? "חם ✓" : "ייווצר בקריאה הראשונה"}`));
      setInterval(() => googleTts.warmToken(), 50 * 60 * 1000); // רענון לפני תפוגת ה-55 דק'
    }
  });
}

module.exports = server;
