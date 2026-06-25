/* eslint-disable no-console */

// המורה: הסוכן היחיד שמדבר עם התלמיד. משתמש ב-Claude כשיש מפתח, אחרת מצב מקומי.

const llm = require("../lib/llm");
const { genderize } = require("../lib/gender");

function buildSystemPrompt({ advice, contextText, problem, student, vizName, shapeNote, gender, voice }) {
  const fem = gender === "female";
  const lines = [
    "את/ה מורה למתמטיקה לילדים. מדבר/ת עברית פשוטה, חמה וסבלנית.",
    "מטרה: להנחות את התלמיד לתשובה בעצמו — לא לפתור בשבילו אלא אם ביקש הסבר מלא.",
    "תשובות קצרות (1–4 משפטים), בגובה העיניים, בלי ז'רגון.",
    "כתוב/י בעברית תקנית בלבד — אך ורק אותיות עבריות. אסור לערבב אותיות ערביות או לועזיות בתוך מילים.",
    "כתוב/י טקסט רגיל בלבד: בלי כוכביות (**) או סימוני markdown, בלי הדגשות. להדגשה השתמש/י במילים. אימוג'ים — במשורה (לכל היותר אחד, ולא בכל הודעה).",
    `התלמיד/ה ${fem ? "בת (נקבה)" : "בן (זכר)"} — פנה/י אליו/ה אך ורק בלשון ${
      fem ? "נקבה" : "זכר"
    }, ובלי לוכסנים (לא 'צייר/י' אלא '${fem ? "ציירי" : "צייר"}').`,
  ];
  if (voice) {
    // שיחה בקול: נימה רגועה — בלי סימני קריאה ובלי אימוג'ים (שלא יישמע דרמטי/נחרץ מדי)
    lines.push(
      "זוהי שיחה בקול (לא בכתב): דבר/י בנימה רגועה, טבעית ושקטה. בלי סימני קריאה (!), בלי אימוג'ים, ובלי התלהבות-יתר או הכרזות נחרצות. משפטים קצרים, פשוטים וזורמים שנעים לשמוע."
    );
    // קיצור = מהירות: ככל שהתשובה קצרה יותר, כך הקול נטען מהר יותר (TTS פרופורציונלי לאורך)
    lines.push(
      "חשוב מאוד: בקול ענה/י קצר ביותר — משפט אחד, שניים לכל היותר, עד ~25 מילים בסך הכל. בלי הקדמות ובלי חזרות. ישר ולעניין, כדי שהקול ייטען מהר."
    );
  }
  if (advice) lines.push(`הנחיה מהפסיכולוג (לא לחשוף לתלמיד): ${advice}`);
  if (problem?.text) {
    lines.push(`התרגיל הנוכחי: ${problem.text}`);
    if (problem.answer != null) lines.push(`(התשובה הנכונה, לשימושך בלבד: ${problem.answer})`);
  }
  if (student) {
    lines.push(
      `נתוני תלמיד: רמה ${student.level ?? 1}, ${student.correct ?? 0}/${student.attempts ?? 0} נכונות, רצף ${student.streak ?? 0}.`
    );
  }
  if (contextText) lines.push(`זיכרון התלמיד:\n${contextText}`);
  if (shapeNote) lines.push(shapeNote);
  if (vizName) {
    lines.push(
      `כלי עזר ויזואלי: לתרגיל הזה זמין במערכת איור של ${vizName} שעוזר לחשב. אם לדעתך התלמיד מתקשה וייעזר בו — הוסף בתשובתך את הסימן המדויק [[SHOW_VISUAL]] (בכל מקום בטקסט), והמערכת תפתח את האיור הקיים אוטומטית. אל תתאר או "תצייר" את האיור בעצמך — רק הוסף את הסימן והפנה את התלמיד ל"איור שמתחת לתרגיל". שיקול הדעת מתי להציג הוא שלך, לפי הקושי של התלמיד — לא חובה בכל פעם. שים לב: בתרגיל חיסור האיור אינטראקטיבי — התלמיד יכול ללחוץ על ה${vizName} כדי "להוריד" אותם. אל תגלה את התשובה — בקש ממנו להוריד בלחיצה את מספר ה${vizName} שצריך לחסר, ולספור כמה נשארו.`
    );
  }
  return lines.join("\n");
}

/* ---------- מצב מקומי (בלי AI) ---------- */

const PRAISE = [
  "כל הכבוד, נכון! 🎉",
  "מצוין! זאת התשובה הנכונה 👏",
  "יפה מאוד, צדקת! 🌟",
  "מדויק! עבודה טובה 💪",
  "נהדר, נכון בול! ⭐",
  "וואו, פגעת בדיוק! 🎯",
  "אלוף/ה! תשובה נכונה 🏆",
  "בול! ממשיכים ככה 🚀",
  "מהמם, צדקת לגמרי! ✨",
  "כל הכבוד, איזה ראש! 🧠",
];
const RETRY = [
  "לא מדויק הפעם, בוא/י ננסה שוב 🙂",
  "כמעט! ננסה עוד פעם?",
  "זה לא נכון, אבל את/ה יכול/ה — ננסה שוב!",
  "אופס, ננסה שוב יחד 😊",
];
function pickOne(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function localReply({ messageKind, problem, correct, student }) {
  switch (messageKind) {
    case "CheckAnswer":
      if (correct === true) {
        return pickOne(PRAISE) + ((student?.streak ?? 0) >= 2 ? " רצף יפה!" : "");
      }
      return (
        pickOne(RETRY) +
        (problem?.hints?.[0] ? ` רמז קטן: ${problem.hints[0]}` : " בדוק/י שלב-שלב.")
      );
    case "HintRequest":
      return problem?.hints?.[0] || "נסה/י לפרק את הבעיה לחלקים קטנים.";
    case "ExplainRequest":
      return problem?.explanation || "בוא/י נפרק את התרגיל שלב אחר שלב.";
    case "NewProblem":
      return problem?.text ? `הנה תרגיל חדש: ${problem.text}` : "הכנתי לך תרגיל חדש.";
    case "SmallTalk":
      return "היי! אני המורה שלך למתמטיקה. מוכן/ה לתרגל יחד?";
    default:
      return "ספר/י לי מה לא ברור ונעבור על זה יחד.";
  }
}

/**
 * @returns {Promise<{ reply: string, mode: "ai"|"local" }>}
 */
async function teacherReply(params) {
  const {
    messageKind,
    messageText = "",
    problem,
    student,
    advice,
    contextText,
    history = [],
    correct = null,
    vizName = null,
    shapeNote = null,
    gender = "male",
    voice = false,
  } = params;

  // תשובה נכונה — שבח מקומי מגוון, בלי AI (התשובה ידועה מראש; חיסכון בטוקנים)
  if (messageKind === "CheckAnswer" && correct === true) {
    return { reply: genderize(localReply({ messageKind, problem, correct, student }), gender), mode: "local" };
  }

  if (!llm.isEnabled()) {
    return { reply: genderize(localReply({ messageKind, problem, correct, student }), gender), mode: "local" };
  }

  const system = buildSystemPrompt({ advice, contextText, problem, student, vizName, shapeNote, gender, voice });
  let userText = messageText;
  if (messageKind === "CheckAnswer" && correct != null) {
    userText = `${messageText}\n(הערכת המערכת: התשובה ${correct ? "נכונה" : "שגויה"}.)`;
  } else if (messageKind === "NewProblem" && problem?.text) {
    userText = `הצג לתלמיד את התרגיל החדש בעידוד קצר: ${problem.text}`;
  }

  const messages = [
    ...history
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && m.content)
      .slice(-12)
      .map((m) => ({ role: m.role, content: String(m.content) })),
    { role: "user", content: userText || "..." },
  ];

  try {
    const tLlm = Date.now();
    // בקול — מודל מהיר (Haiku ~2s מול Sonnet ~3.3s) + תקרת טוקנים נמוכה = תשובה קצרה ומהירה.
    // חזרה ל-Sonnet בקול: ANTHROPIC_VOICE_MODEL=claude-sonnet-4-6 ב-.env
    const voiceModel = (process.env.ANTHROPIC_VOICE_MODEL || "claude-haiku-4-5-20251001").trim();
    const reply = await llm.complete({
      system,
      messages,
      maxTokens: voice ? 160 : 500,
      model: voice ? voiceModel : null,
    });
    console.log(`[timing]   └ Claude (llm.complete${voice ? " · " + voiceModel : ""}): ${Date.now() - tLlm}ms`);
    if (reply) return { reply, mode: "ai" };
  } catch (e) {
    console.error("teacher AI error:", e.message);
  }
  // נפילה למצב מקומי אם ה-AI נכשל
  return { reply: localReply({ messageKind, problem, correct, student }), mode: "local" };
}

module.exports = { teacherReply };
