/* eslint-disable no-console */

/**
 * תמלול (STT) דרך Google Cloud Speech-to-Text v2 — REST, בלי SDK ובלי תלויות.
 *
 *   transcribe(audioBuffer)  →  טקסט עברי (string). אם לא זוהה דיבור — "" (לא זורק).
 *
 * למה גוגל ולא Azure: אותו פרויקט ואותן הרשאות שכבר משמשות את קול-המורה
 * (lib/google-tts.js) — ספק אחד, חשבון אחד, בלי מפתח נפרד שיכול לפוג.
 *
 * למה chirp_2 ובאיזה סף: נמדד מול he-IL על הקלטות אמיתיות —
 *   דיבור אמיתי  0.93–0.99 ביטחון   (כולל תשובה של מילה אחת: "כן" = 0.974)
 *   רעש-רקע בלבד 0.17    ביטחון     (והמודל *ממציא* משפט! בלי הסף המורה
 *                                     היה עונה על שאלה שהילד לא שאל)
 * לכן כל תוצאה מתחת ל-MIN_CONFIDENCE נזרקת ומוחזר "" — הלקוח כבר מציג
 * "לא שמעתי — נא דברו שוב" ומחזיר להקשבה.
 *
 * chirp_2 קיים רק במיקומים מסוימים (us-central1 בין היתר) — לא ב-global.
 */

const https = require("https");
const googleTts = require("./google-tts"); // getToken/project — אותו token מאומת ואותו cache

const httpsAgent = new https.Agent({ keepAlive: true, ca: googleTts.buildCa() });

const LANG = "he-IL";
const DEFAULT_MODEL = "chirp_2";
const DEFAULT_LOCATION = "us-central1"; // chirp_2 לא קיים ב-global
const DEFAULT_MIN_CONFIDENCE = 0.5; // אמצע הפער בין 0.17 (רעש) ל-0.93 (דיבור)

function model() {
  return (process.env.GCP_STT_MODEL || "").trim() || DEFAULT_MODEL;
}
function location() {
  return (process.env.GCP_STT_LOCATION || "").trim() || DEFAULT_LOCATION;
}
function minConfidence() {
  const raw = (process.env.GCP_STT_MIN_CONFIDENCE || "").trim();
  if (!raw) return DEFAULT_MIN_CONFIDENCE; // Number("") הוא 0 — היה מכבה את ההגנה בשקט
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : DEFAULT_MIN_CONFIDENCE;
}

/** מופעל אם יש פרויקט GCP — האימות עצמו זהה לזה של קול-המורה. */
function isEnabled() {
  return googleTts.isEnabled();
}

function info() {
  return {
    sttProvider: "google",
    speechEnabled: isEnabled(),
    model: model(),
    location: location(),
    lang: LANG,
    minConfidence: minConfidence(),
  };
}

/* בקשת HTTPS JSON ל-Speech-to-Text v2 */
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
          "x-goog-user-project": googleTts.project(),
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
            } catch {
              reject(new Error("bad JSON from Speech-to-Text"));
            }
          } else {
            reject(new Error(`STT HTTP ${res.statusCode}: ${text.slice(0, 300)}`));
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
 * STT — מקבל Buffer של אודיו (WAV PCM 16kHz מונו מהדפדפן).
 * autoDecodingConfig מזהה את פורמט ה-WAV לבד, אז אין צורך להצהיר על קצב/ערוצים.
 */
async function transcribe(audioBuffer) {
  if (!isEnabled()) throw new Error("Google STT כבוי (חסר GCP_PROJECT)");
  if (!audioBuffer || !audioBuffer.length) throw new Error("אין אודיו לתמלול");

  const loc = location();
  const token = await googleTts.getToken();
  const data = await postJson({
    host: `${loc}-speech.googleapis.com`,
    path: `/v2/projects/${googleTts.project()}/locations/${loc}/recognizers/_:recognize`,
    token,
    body: {
      config: {
        autoDecodingConfig: {},
        languageCodes: [LANG],
        model: model(),
        features: { enableAutomaticPunctuation: true },
      },
      content: audioBuffer.toString("base64"),
    },
  });

  const results = Array.isArray(data && data.results) ? data.results : [];
  const min = minConfidence();
  let text = "";
  let best = 0;
  for (const r of results) {
    const alt = (r && Array.isArray(r.alternatives) && r.alternatives[0]) || null;
    if (!alt || !alt.transcript) continue;
    const conf = typeof alt.confidence === "number" ? alt.confidence : 1;
    if (conf > best) best = conf;
    if (conf < min) continue; // כנראה רעש — המודל ממציא טקסט בביטחון נמוך
    text += alt.transcript;
  }
  text = text.trim();
  if (!text && results.length) {
    console.log(`[stt] נדחה בביטחון נמוך (${best.toFixed(2)} < ${min}) — מתייחסים כ"לא שמעתי"`);
  }
  return text;
}

module.exports = { isEnabled, info, transcribe, LANG };
