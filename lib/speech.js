/* eslint-disable no-console */

/**
 * מודול דיבור — Azure Speech דרך REST (בלי SDK, בלי תלויות).
 *
 *   transcribe(audioBuffer)  →  דיבור→טקסט (STT) בעברית (he-IL)
 *   synthesize(text)         →  טקסט→דיבור (TTS) בקול he-IL-AvriNeural (mp3)
 *
 * כל הקריאות נעשות בשרת בלבד — המפתח לעולם לא נחשף בדפדפן.
 * אותו AZURE_SPEECH_KEY + AZURE_SPEECH_REGION משמשים לשני השירותים.
 */

const https = require("https");
const fs = require("fs");
const tls = require("tls");

/* מאגר CA — בדיוק כמו ב-lib/llm.js: משלב את שורשי Node עם תעודות מערכת ההפעלה,
   כדי למנוע "unable to get local issuer certificate" עם `node server.js` רגיל. */
function buildCa() {
  const ca = [];
  try {
    if (Array.isArray(tls.rootCertificates)) ca.push(...tls.rootCertificates);
  } catch {
    /* ignore */
  }
  const candidates = [
    process.env.NODE_EXTRA_CA_CERTS,
    "/etc/ssl/cert.pem",
    "/opt/homebrew/etc/openssl@3/cert.pem",
    "/usr/local/etc/openssl@3/cert.pem",
    "/etc/ssl/certs/ca-certificates.crt",
  ].filter(Boolean);
  for (const p of candidates) {
    try {
      ca.push(fs.readFileSync(p, "utf8"));
    } catch {
      /* ignore — לא קיים במערכת הזו */
    }
  }
  return ca.length ? ca : undefined;
}

const httpsAgent = new https.Agent({ keepAlive: true, ca: buildCa() });

const LANG = "he-IL"; // שפת הילד והמורה
// ברירת מחדל: Dragon HD Omni (טבעי ורגשי). אפשר לעקוף ב-.env דרך AZURE_TTS_VOICE
// (למשל קול גברי: he-IL-Avri:DragonHDOmniLatestNeural) — להשוואה, בלי לגעת בקוד.
const VOICE = "he-IL-Hila:DragonHDOmniLatestNeural";
function voiceName() {
  return (process.env.AZURE_TTS_VOICE || "").trim() || VOICE;
}
// קולות Dragon HD (בשם יש ":") — תמיכת SSML מצומצמת
function isHdVoice(name) {
  return /DragonHD/i.test(String(name)) || String(name).includes(":");
}

function key() {
  return (process.env.AZURE_SPEECH_KEY || "").trim();
}
function region() {
  // תומך גם ב-AZURE_REGION כגיבוי, אבל המוסכמה בפרויקט היא AZURE_SPEECH_REGION
  return (process.env.AZURE_SPEECH_REGION || process.env.AZURE_REGION || "").trim();
}

/** האם הדיבור מופעל (יש מפתח + region אמיתיים). */
function isEnabled() {
  const k = key();
  return !!k && k.length > 20 && !!region();
}

function info() {
  return { speechEnabled: isEnabled(), region: region(), voice: voiceName(), lang: LANG };
}

/* ---------- בקשת HTTPS גולמית (גוף בינארי נכנס/יוצא) ---------- */
function httpsRaw({ host, path: reqPath, method = "POST", headers = {}, body }) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      { method, host, path: reqPath, agent: httpsAgent, headers, timeout: 30000 },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          resolve({
            statusCode: res.statusCode,
            buffer: Buffer.concat(chunks),
            contentType: res.headers["content-type"] || "",
          })
        );
      }
    );
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error("timeout")));
    if (body) req.write(body);
    req.end();
  });
}

/**
 * STT — דיבור→טקסט. מקבל Buffer של אודיו (מומלץ WAV PCM 16kHz מונו).
 * מחזיר את הטקסט שזוהה (string). אם לא זוהה דיבור — מחזיר "" (לא זורק).
 */
async function transcribe(
  audioBuffer,
  contentType = "audio/wav; codecs=audio/pcm; samplerate=16000"
) {
  if (!isEnabled()) throw new Error("Azure Speech כבוי (חסר מפתח/region)");
  if (!audioBuffer || !audioBuffer.length) throw new Error("אין אודיו לתמלול");

  const { statusCode, buffer } = await httpsRaw({
    host: `${region()}.stt.speech.microsoft.com`,
    path: `/speech/recognition/conversation/cognitiveservices/v1?language=${LANG}`,
    headers: {
      "Ocp-Apim-Subscription-Key": key(),
      "Content-Type": contentType,
      Accept: "application/json",
      "Content-Length": audioBuffer.length,
    },
    body: audioBuffer,
  });

  const raw = buffer.toString("utf8");
  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`STT HTTP ${statusCode}: ${raw.slice(0, 200)}`);
  }
  let data = {};
  try {
    data = JSON.parse(raw);
  } catch {
    /* ignore */
  }
  // RecognitionStatus יכול להיות Success / NoMatch / InitialSilenceTimeout ...
  if (data.RecognitionStatus && data.RecognitionStatus !== "Success") {
    return ""; // לא זוהה דיבור — נטפל בצד הלקוח בהודעה ידידותית
  }
  return String(data.DisplayText || "").trim();
}

/**
 * מנקה טקסט להקראה: מסיר אימוג'ים/סמלים (שלא ייקראו בקול) וסימוני markdown
 * (כוכביות/קו-תחתון/גרש הדגשה) — כך שהקול נשמע טבעי ולא "מקריא" סימנים.
 */
function cleanForSpeech(text) {
  return String(text || "")
    // אימוג'ים, סמלים, חצים, dingbats, variation selectors, ZWJ, keycaps
    .replace(
      /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{2122}\u{2139}]/gu,
      ""
    )
    .replace(/[*_`~#]/g, "") // סימוני markdown (כולל ** הדגשה)
    .replace(/\[\[.*?\]\]/g, "") // סימונים פנימיים כמו [[SHOW_VISUAL]]
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/**
 * TTS — טקסט→דיבור. מחזיר Buffer של אודיו (mp3 כברירת מחדל, לניגון בדפדפן).
 * אפשר לבקש WAV (riff-16khz-16bit-mono-pcm) לבדיקות פנימיות.
 */
async function synthesize(text, { voice, format = "audio-24khz-96kbitrate-mono-mp3" } = {}) {
  if (!isEnabled()) throw new Error("Azure Speech כבוי (חסר מפתח/region)");
  const clean = cleanForSpeech(text);
  if (!clean) throw new Error("אין טקסט להקראה");

  // בריחת תווים מיוחדים ל-SSML
  const safe = clean
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  const v = voice || voiceName();

  let ssml;
  if (isHdVoice(v)) {
    // Dragon HD: SSML פשוט בלי prosody/silence — ה-HD מנהל קצב, הפסקות ורגש לבד (טבעי יותר)
    ssml =
      `<speak version='1.0' xml:lang='${LANG}'>` +
      `<voice name='${v}'>${safe}</voice></speak>`;
  } else {
    // קול נוירוני רגיל: prosody עדין + קיצור הפסקות בין משפטים
    ssml =
      `<speak version='1.0' xmlns:mstts='http://www.w3.org/2001/mstts' xml:lang='${LANG}'>` +
      `<voice name='${v}'>` +
      `<mstts:silence type='Sentenceboundary' value='200ms'/>` +
      `<mstts:silence type='Tailing' value='100ms'/>` +
      `<prosody rate='-4%'>${safe}</prosody>` +
      `</voice></speak>`;
  }
  if (process.env.TTS_DEBUG === "1") console.error("SSML → " + ssml);
  const bodyBuf = Buffer.from(ssml, "utf8");

  const { statusCode, buffer } = await httpsRaw({
    host: `${region()}.tts.speech.microsoft.com`,
    path: `/cognitiveservices/v1`,
    headers: {
      "Ocp-Apim-Subscription-Key": key(),
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": format,
      "User-Agent": "vela-tutor",
      "Content-Length": bodyBuf.length,
    },
    body: bodyBuf,
  });

  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`TTS HTTP ${statusCode}: ${buffer.toString("utf8").slice(0, 200)}`);
  }
  return buffer; // אודיו (mp3 או wav לפי format)
}

module.exports = { isEnabled, info, transcribe, synthesize, VOICE, LANG };
