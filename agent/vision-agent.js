/* eslint-disable no-console */

// סוכן ראייה: המורה "מסתכל" על תמונת הציור של הילד (Claude vision) ומפרש מה רואים.
// נפרד מ-teacher-agent כדי לא לגעת בלוגיקת המורה/הקול הקיימת — רק מרחיב ומתחבר.

const llm = require("../lib/llm");
const { genderize } = require("../lib/gender");
const learnerProfile = require("../lib/learner-profile");

const VALID_MEDIA = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

function buildSystem({ gender, profileText, topic }) {
  const fem = gender === "female";
  const lines = [
    "את/ה Vela — מורה למתמטיקה חמה, סבלנית ומעודדת לילדים בכיתה א'.",
    "הילד צייר על לוח משבצות, ואת/ה מסתכל/ת עכשיו על תמונת הציור שלו.",
    "תאר/י ופרש/י בעברית פשוטה, חמה וקצרה (1–3 משפטים) מה את/ה רואה בתמונה:",
    "- צורה גאומטרית → אמור/י איזו (עיגול, משולש, ריבוע, מלבן, קו, זווית), ואם אפשר כמה צלעות/איזו זווית.",
    "- מספר, אות או מילה → אמור/י מה כתוב.",
    "- ציור חופשי → תאר/י בעדינות למה זה דומה.",
    `דבר/י ישירות אל הילד בלשון ${fem ? "נקבה" : "זכר"}, בלי לוכסנים, בלי markdown ובלי כוכביות. אימוג'י לכל היותר אחד.`,
    "אל תמציא/י פרטים — אם לא ברור, אמור/י מה כן רואים ושאל/י את הילד מה התכוון.",
  ];
  if (topic) lines.push(`נושא הלמידה כרגע: ${topic}.`);
  if (profileText) lines.push(`\n${profileText}`);
  return lines.join("\n");
}

/**
 * @param {{ image:string(base64), mediaType?:string, gender?:string, topic?:string, userId?:string }} p
 * @returns {Promise<{reply:string, mode:string}>}
 */
async function visionDescribeBoard(p = {}) {
  const image = String(p.image || "");
  if (!image) return { reply: "לא קיבלתי ציור להסתכל עליו.", mode: "local" };
  if (!llm.isEnabled()) return { reply: "כדי שאוכל לראות את הציור צריך שירות AI מוגדר בשרת.", mode: "local" };

  const mediaType = VALID_MEDIA.has(p.mediaType) ? p.mediaType : "image/png";
  const gender = p.gender === "female" ? "female" : "male";

  let profileText = "";
  try {
    profileText = p.userId ? learnerProfile.toPromptText(p.userId) : "";
  } catch (e) {
    /* פרופיל לא קריטי */
  }

  const system = buildSystem({ gender, profileText, topic: p.topic || "" });
  const messages = [
    {
      role: "user",
      content: [
        { type: "text", text: "זה מה שציירתי על הלוח. מה את/ה רואה?" },
        { type: "image", source: { type: "base64", media_type: mediaType, data: image } },
      ],
    },
  ];

  try {
    const t0 = Date.now();
    // החלק הקבוע (persona + פרופיל) נשמר ב-Prompt Cache; התמונה היא החלק המשתנה.
    let reply = await llm.complete({ system, messages, maxTokens: 240, cacheSystem: true });
    console.log(`[timing] vision (llm.complete): ${Date.now() - t0}ms`);
    reply = genderize(reply || "אני לא בטוח/ה מה זה — תספר/י לי מה ציירת?", gender).replace(/\*\*/g, "");
    return { reply, mode: "ai" };
  } catch (e) {
    console.error("vision error:", e.message);
    return { reply: "אופס, לא הצלחתי לראות את הציור כרגע. ננסה שוב?", mode: "error" };
  }
}

module.exports = { visionDescribeBoard };
