/* eslint-disable no-console */

const http = require("http");

const fs = require("fs");

const path = require("path");

const { loadEnvFile } = require("./lib/env");

const { runChat, getAgentStatus } = require("./agent/orchestrator");

const { mathematicianCreate } = require("./agent/mathematician-agent");

const { designerDiagram } = require("./agent/designer-agent");



const ROOT = __dirname;

loadEnvFile(ROOT);



const PORT = Number.parseInt(process.env.PORT || "8787", 10);



const MIME = {

  ".html": "text/html; charset=utf-8",

  ".css": "text/css; charset=utf-8",

  ".js": "application/javascript; charset=utf-8",

  ".json": "application/json; charset=utf-8",

  ".ico": "image/x-icon",

};



function send(res, status, headers, body) {

  res.writeHead(status, headers);

  res.end(body);

}



function readBody(req) {

  return new Promise((resolve, reject) => {

    const chunks = [];

    req.on("data", (c) => chunks.push(c));

    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));

    req.on("error", reject);

  });

}



function json(res, status, obj) {

  send(res, status, { "content-type": "application/json; charset=utf-8" }, JSON.stringify(obj));

}



function safePath(urlPath) {

  const clean = urlPath.split("?")[0].split("#")[0];

  const decoded = decodeURIComponent(clean);

  const normalized = path.posix.normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, "");

  const p = normalized === "/" ? "/index.html" : normalized;

  return path.join(ROOT, p);

}



const server = http.createServer(async (req, res) => {

  try {

    const method = req.method || "GET";

    const url = req.url || "/";



    if (url.startsWith("/api/status")) {

      if (method !== "GET") return json(res, 405, { error: "Method not allowed" });

      return json(res, 200, getAgentStatus());

    }



    if (url.startsWith("/api/chat")) {

      if (method !== "POST") return json(res, 405, { error: "Method not allowed" });

      const raw = await readBody(req);

      let payload;

      try {

        payload = JSON.parse(raw || "{}");

      } catch {

        return json(res, 400, { error: "Bad JSON" });

      }

      const result = await runChat(payload);

      return json(res, 200, result);

    }



    if (url.startsWith("/api/problem")) {

      if (method !== "POST") return json(res, 405, { error: "Method not allowed" });

      const raw = await readBody(req);

      let payload;

      try {

        payload = JSON.parse(raw || "{}");

      } catch {

        return json(res, 400, { error: "Bad JSON" });

      }

      const math = await mathematicianCreate(payload);

      let diagram = null;

      if (math.problem?.needsDiagram) {

        diagram = await designerDiagram(math.problem);

      }

      return json(res, 200, { problem: math.problem, diagram, mode: math.mode });

    }



    if (method !== "GET" && method !== "HEAD") return send(res, 405, {}, "Method not allowed");



    const filePath = safePath(url);

    if (!filePath.startsWith(ROOT)) return send(res, 403, {}, "Forbidden");



    fs.readFile(filePath, (err, data) => {

      if (err) return send(res, 404, {}, "Not found");

      const ext = path.extname(filePath).toLowerCase();

      const mime = MIME[ext] || "application/octet-stream";

      const headers = { "content-type": mime, "cache-control": "no-store" };

      if (method === "HEAD") return send(res, 200, headers, "");

      return send(res, 200, headers, data);

    });

  } catch (e) {

    console.error(e);

    return send(res, 500, {}, "Server error");

  }

});



server.listen(PORT, () => {

  const status = getAgentStatus();

  console.log("מערכת לימוד — שרת פעיל (4 סוכנים)");

  console.log(`אתר:  http://localhost:${PORT}`);

  console.log(`צ'אט: POST /api/chat  (מורה + שיתוף פעולה)`);

  console.log("סוכנים: מורה | פסיכולוג | מתמטיקאי | מעצב");

  if (status.aiEnabled) {

    console.log(`AI:   ${status.provider} / ${status.model}`);

  } else {

    console.log("AI:   מצב מקומי — הוסף מפתח ב-.env (ראה .env.example)");

  }

});

