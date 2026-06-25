/* eslint-disable no-console */

/**
 * Google Gemini TTS דרך Vertex AI — קול Orus (טבעי ורגשי).
 * אימות דרך ADC (Application Default Credentials): לוקחים token זמני
 * ע"י הרצת `gcloud auth application-default print-access-token` (במטמון ~55 דק').
 * אין שום קובץ JSON בפרויקט. הקול נשאר בשרת בלבד.
 *
 *   synthesize(text) → Buffer של WAV (PCM 24kHz מונו) מוכן לניגון בדפדפן.
 */

const { exec } = require("child_process");
const https = require("https");
const fs = require("fs");
const tls = require("tls");

/* מאגר CA — כמו בשאר המודולים (מונע "unable to get local issuer certificate") */
function buildCa() {
  const ca = [];
  try {
    if (Array.isArray(tls.rootCertificates)) ca.push(...tls.rootCertificates);
  } catch {
    /* ignore */
  }
  for (const p of [
    process.env.NODE_EXTRA_CA_CERTS,
    "/etc/ssl/cert.pem",
    "/opt/homebrew/etc/openssl@3/cert.pem",
    "/usr/local/etc/openssl@3/cert.pem",
    "/etc/ssl/certs/ca-certificates.crt",
  ].filter(Boolean)) {
    try {
      ca.push(fs.readFileSync(p, "utf8"));
    } catch {
      /* ignore */
    }
  }
  return ca.length ? ca : undefined;
}
const httpsAgent = new https.Agent({ keepAlive: true, ca: buildCa() });

const GCLOUD = process.env.GCLOUD_PATH || "/opt/homebrew/bin/gcloud";
const LANG = "he-IL";
function project() {
  return (process.env.GCP_PROJECT || "").trim();
}
function model() {
  return (process.env.GCP_TTS_MODEL || "gemini-3.1-flash-tts-preview").trim();
}
// Streaming דרך Vertex דורש endpoint אזורי (global מחזיר 500). ברירת מחדל us-central1.
function streamLoc() {
  return (process.env.GCP_STREAM_LOCATION || "us-central1").trim();
}
// האם להזרים? (revert: TTS_STREAMING=false → חוזרים ל-text:synthesize המלא)
function streamEnabled() {
  return (process.env.TTS_STREAMING || "true").toLowerCase() === "true";
}
function voiceName() {
  return (process.env.GOOGLE_TTS_VOICE || "Alnilam").trim();
}
// הוראת הסגנון (prompt) — נשלחת לצד הטקסט ב-input (כמו ב-Media Studio)
function promptText() {
  return (process.env.GOOGLE_TTS_PROMPT || "").trim();
}
// כווני קצב/גובה (כמו הסליידרים ב-Media Studio). ברירות מחדל = הערכים שעבדו אצלך.
function speakingRate() {
  const n = parseFloat(process.env.GOOGLE_TTS_RATE || "");
  return Number.isFinite(n) ? n : 1;
}
function pitch() {
  const n = parseFloat(process.env.GOOGLE_TTS_PITCH || "");
  return Number.isFinite(n) ? n : 0;
}

/** מופעל אם הוגדר פרויקט GCP (האימות עצמו דרך ADC). */
function isEnabled() {
  return !!project();
}
function info() {
  return {
    ttsProvider: "google",
    enabled: isEnabled(),
    project: project(),
    model: model(),
    voice: voiceName(),
    hasPrompt: !!promptText(),
  };
}

/* ---------- token דרך ADC (gcloud), עם מטמון ---------- */
let cachedToken = null;
let tokenExp = 0;
function getToken() {
  return new Promise((resolve, reject) => {
    const now = Date.now ? Date.now() : new Date().getTime();
    if (cachedToken && now < tokenExp) return resolve(cachedToken);
    exec(
      `"${GCLOUD}" auth application-default print-access-token`,
      { timeout: 20000 },
      (err, stdout, stderr) => {
        if (err) {
          return reject(new Error("gcloud token failed: " + String(stderr || err.message).slice(0, 200)));
        }
        const t = String(stdout).trim();
        if (!t) return reject(new Error("empty token from gcloud (ADC לא מחובר?)"));
        cachedToken = t;
        tokenExp = now + 55 * 60 * 1000; // ~55 דקות
        resolve(t);
      }
    );
  });
}

/* פרי-ווורם: מרענן את ה-token מראש (בלי לאפס במקרה כשל) — כך קריאות המשתמש
   לעולם לא משלמות את ה-~1–2 שנ' של הבאת ה-token הקר. נקרא בעליית השרת ומדי ~50 דק'. */
function warmToken() {
  if (!isEnabled()) return Promise.resolve(false);
  return new Promise((resolve) => {
    exec(
      `"${GCLOUD}" auth application-default print-access-token`,
      { timeout: 20000 },
      (err, stdout) => {
        const t = String(stdout || "").trim();
        if (!err && t) {
          cachedToken = t;
          tokenExp = (Date.now ? Date.now() : new Date().getTime()) + 55 * 60 * 1000;
          resolve(true);
        } else {
          resolve(false);
        }
      }
    );
  });
}

/* מנקה טקסט להקראה: אימוג'ים/סמלים + סימוני markdown (כמו במודול Azure) */
function cleanForSpeech(text) {
  return String(text || "")
    .replace(
      /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{2122}\u{2139}]/gu,
      ""
    )
    .replace(/[*_`~#]/g, "")
    .replace(/\[\[.*?\]\]/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/* בקשת HTTPS JSON ל-Vertex */
function postJson({ host, path: reqPath, token, body }) {
  return new Promise((resolve, reject) => {
    const payload = Buffer.from(JSON.stringify(body), "utf8");
    const req = https.request(
      {
        method: "POST",
        host,
        path: reqPath,
        agent: httpsAgent,
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
          "x-goog-user-project": project(),
          "Content-Length": payload.length,
        },
        timeout: 30000,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(text));
            } catch (e) {
              reject(new Error("bad JSON from Vertex"));
            }
          } else {
            reject(new Error(`Vertex HTTP ${res.statusCode}: ${text.slice(0, 300)}`));
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

/* עוטף PCM גולמי (16-bit מונו) בכותרת WAV — כדי שהדפדפן ינגן */
function pcmToWav(pcm, rate) {
  const numCh = 1, bits = 16;
  const blockAlign = (numCh * bits) / 8;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(numCh, 22);
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * blockAlign, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bits, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

/**
 * טקסט → דיבור דרך Cloud Text-to-Speech (פורמט Media Studio):
 * input.{text, prompt} + voice.{name:"Orus", modelName}. מחזיר Buffer של WAV.
 */
async function synthesize(text) {
  if (!isEnabled()) throw new Error("Google TTS כבוי (חסר GCP_PROJECT)");
  const clean = cleanForSpeech(text);
  if (!clean) throw new Error("אין טקסט להקראה");

  // input: הטקסט + הוראת הסגנון (prompt) לצידו — בדיוק כמו ב-Media Studio
  const input = { text: clean };
  const p = promptText();
  if (p) input.prompt = p;

  const body = {
    input,
    voice: { languageCode: LANG, name: voiceName(), modelName: model() },
    // זהה ל-Media Studio: LINEAR16 + speakingRate + pitch (בלי sampleRateHertz).
    audioConfig: { audioEncoding: "LINEAR16", pitch: pitch(), speakingRate: speakingRate() },
  };
  if (process.env.TTS_DEBUG === "1") {
    console.error("TTS REQUEST BODY → " + JSON.stringify(body, null, 2));
  }

  const tTok = Date.now();
  const token = await getToken();
  const tApi = Date.now();
  const data = await postJson({
    host: "texttospeech.googleapis.com",
    path: "/v1beta1/text:synthesize",
    token,
    body,
  });
  console.log(`[timing]   └ Google TTS API: ${Date.now() - tApi}ms (token ${tApi - tTok}ms${tApi - tTok > 200 ? " — קר!" : ""})`);

  const b64 = data && data.audioContent;
  if (!b64) throw new Error("אין audioContent בתשובת Cloud TTS");
  const buf = Buffer.from(b64, "base64");
  // LINEAR16 לרוב מגיע עם כותרת RIFF מוכנה; אם לא — עוטפים PCM גולמי
  if (buf.length >= 4 && buf.slice(0, 4).toString() === "RIFF") return buf;
  return pcmToWav(buf, 24000);
}

/**
 * Streaming TTS דרך Vertex `streamGenerateContent` (REST, בלי gRPC/SDK):
 * מחזיר PCM גולמי (L16 24kHz מונו) ב-chunks — קוראים ל-onPcm(buffer) לכל חלק שמגיע,
 * כך אפשר להתחיל לנגן ~שנייה אחרי הבקשה במקום לחכות לכל האודיו.
 * הוראת הסגנון (prompt) מוטמעת בתחילת הטקסט (מיושמת כסגנון — לא מוקראת; אומת בתמלול).
 * מחזיר Promise שמסתיים עם סך בייטי ה-PCM. STREAM_RATE = 24000.
 */
const STREAM_RATE = 24000;
function synthesizeStream(text, onPcm) {
  return new Promise((resolve, reject) => {
    const clean = cleanForSpeech(text);
    if (!clean) return reject(new Error("אין טקסט להקראה"));
    const p = promptText();
    const promptedText = p ? p + "\n\n" + clean : clean;
    const body = Buffer.from(
      JSON.stringify({
        contents: [{ role: "user", parts: [{ text: promptedText }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName() } } },
        },
      }),
      "utf8"
    );
    getToken()
      .then((token) => {
        let buf = "", lastIdx = 0, total = 0, finished = false;
        const finish = (fn, v) => { if (finished) return; finished = true; fn(v); }; // resolve/reject פעם אחת
        const re = /"data"\s*:\s*"([^"]+)"/g; // base64 של inlineData (אין מרכאות בתוך base64)
        const req = https.request(
          {
            method: "POST",
            host: `${streamLoc()}-aiplatform.googleapis.com`,
            path: `/v1/projects/${project()}/locations/${streamLoc()}/publishers/google/models/${model()}:streamGenerateContent`,
            agent: httpsAgent,
            headers: {
              Authorization: "Bearer " + token,
              "Content-Type": "application/json",
              "x-goog-user-project": project(),
              "Content-Length": body.length,
            },
            timeout: 30000,
          },
          (res) => {
            if (res.statusCode < 200 || res.statusCode >= 300) {
              let err = "";
              res.on("data", (d) => (err += d));
              res.on("end", () => finish(reject, new Error(`stream HTTP ${res.statusCode}: ${err.slice(0, 200)}`)));
              return;
            }
            res.on("data", (d) => {
              if (finished) return;
              buf += d.toString("utf8");
              re.lastIndex = lastIdx;
              let m;
              while ((m = re.exec(buf)) !== null) {
                const pcm = Buffer.from(m[1], "base64");
                if (pcm.length) {
                  total += pcm.length;
                  // onPcm מחזיר false → הלקוח התנתק (barge-in): מבטלים את ה-upstream וחוסכים יצירת TTS שלמה
                  let cont = true;
                  try { cont = onPcm(pcm); } catch (e) { cont = false; }
                  if (cont === false) { try { req.destroy(); } catch (_) {} return finish(resolve, total); }
                }
                lastIdx = re.lastIndex;
              }
              if (lastIdx > 0) { buf = buf.slice(lastIdx); lastIdx = 0; } // שחרור זיכרון — אין match חלקי לפני lastIdx
            });
            res.on("end", () => finish(resolve, total));
          }
        );
        req.on("error", (e) => finish(reject, e));
        req.on("timeout", () => req.destroy(new Error("timeout")));
        req.write(body);
        req.end();
      })
      .catch(reject);
  });
}

module.exports = { isEnabled, info, synthesize, warmToken, synthesizeStream, streamEnabled, STREAM_RATE };
