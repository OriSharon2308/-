/* eslint-disable no-console */

const http = require("http");
const fs = require("fs");
const path = require("path");

const { loadEnvFile } = require("./lib/env");
const { runChat, getAgentStatus } = require("./agent/orchestrator");
const { mathematicianCreate } = require("./agent/mathematician-agent");
const { designerDiagram } = require("./agent/designer-agent");
const bank = require("./lib/bank");
const { genderize, genderizeProblem } = require("./lib/gender");
const users = require("./lib/users");
const sessions = require("./lib/session");
const memory = require("./lib/memory");
const progress = require("./lib/progress");
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

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function readJsonBody(req, res) {
  const raw = await readBody(req);
  try {
    return JSON.parse(raw || "{}");
  } catch {
    json(res, 400, { error: "Bad JSON" });
    return null;
  }
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
      // מוחקים זיכרון → חשבון → כל ה-sessions, ומנקים את העוגייה
      memory.deleteUserMemory(userId);
      progress.deleteUser(userId);
      users.deleteUser(userId);
      sessions.destroyAllForUser(userId);
      return json(res, 200, { ok: true }, { "set-cookie": sessions.buildClearCookie() });
    }

    /* ---------------- API: סטטוס (ציבורי) ---------------- */

    if (url.startsWith("/api/status")) {
      if (method !== "GET") return json(res, 405, { error: "Method not allowed" });
      return json(res, 200, getAgentStatus());
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
      const result = await runChat(body);
      // ניסוח תשובת המורה לפי מין התלמיד (גם אם ה-AI כתב עם לוכסן)
      if (result && typeof result.reply === "string") {
        result.reply = genderize(result.reply, body.gender);
      }
      // הערה: סימון "נראתה" נעשה בהגשה (ב-/api/problem) — כך שום שאלה לא חוזרת
      return json(res, 200, result);
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
  });
}

module.exports = server;
