/* eslint-disable no-console */

// סוכן סרטוט: המורה (Claude) מסרטט על הלוח דרך Tool Use — לפי בקשת הילד בשיחה.
// נפרד מ-teacher-agent כדי לא לגעת בלוגיקת המורה/הקול/הזיכרון הקיימת — רק מוסיף יכולת.

const llm = require("../lib/llm");
const { genderize } = require("../lib/gender");
const learnerProfile = require("../lib/learner-profile");
const { BOARD_TOOLS } = require("../lib/board-tools");

// ה-system קבוע (בלי מספרים משתנים) — כך הוא + הכלים נשמרים ב-Prompt Cache.
// הגודל המדויק של הלוח והתוכן הקיים נשלחים בהודעת המשתמש (החלק המשתנה).
function buildSystem({ gender, profileText, topic }) {
  const fem = gender === "female";
  const lines = [
    "את/ה Vela — מורה למתמטיקה חמה, סבלנית ומעודדת לילדים בכיתה א', שמדבר/ת עברית פשוטה.",
    "יש לך לוח משבצות משותף עם הילד, ואת/ה יכול/ה לסרטט עליו בפועל דרך הכלים (Tool Use).",
    "כשהילד מבקש לצייר / לסרטט / להראות משהו — תרגם/י את הבקשה לרצף קריאות לכלים שמסרטטות אותו על הלוח.",
    "הסרטוט הסברתי ופונקציונלי (צורות, קווים, צירים, מספרים, סימונים, חצים) — לא אמנותי. ברור ופשוט.",
    "תמיד הוסף/י גם משפט טקסט קצר וחם לילד (1–2 משפטים), בנוסף לסרטוט.",
    `דבר/י בלשון ${fem ? "נקבה" : "זכר"}, בלי לוכסנים, בלי markdown, בלי כוכביות.`,
    "",
    "מערכת הצירים של הלוח: הראשית (0,0) בפינה השמאלית-העליונה, x גדל ימינה, y גדל מטה.",
    "סרטט/י סביב מרכז הלוח (יינתן לך בכל בקשה), השאר/י שוליים מהקצוות (לפחות ~60 יחידות),",
    "ובקנה מידה קריא: צורות ברוחב ~120–220 יחידות, גופן ~28–44, ציר מספרים באורך ~400–560.",
    "טיפים: למשולש/ריבוע — draw_polygon; לשעון — draw_clock (תבנית שלמה); לציר מספרים — draw_number_line; לסימון נקודה — draw_point; להצבעה — draw_arrow.",
    "",
    "תרגילים/שאלות: השתמש/י תמיד בתבנית draw_exercise(text, answer, kind) — קריאה אחת לכל תרגיל. היא ממקמת אוטומטית בצד ימין של הלוח (רחוק מהצ'אט), מסדרת בשורות, ומוסיפה תיבת-תשובה. אל תצייר/י תרגילים ידנית עם write_text/ask_answer.",
    "- חיבור/חיסור/כפל → kind:\"number\". שאלה מילולית → kind:\"text\". ציין/י תמיד את answer הנכון.",
    "- כשמבקשים כמה שאלות (למשל 3) — קרא/י ל-draw_exercise שלוש פעמים, כולן יחד באותה תשובה (במקביל), כדי שכולן יופיעו מיד ובמלואן.",
    "מהירות (חשוב!): הוצא/י את כל קריאות הכלים יחד באותה תשובה כשאפשר — לא אחת-אחת. כך זה מהיר.",
    "כתיבת מספרים ותרגילים תמיד משמאל לימין (\"3 + 4 = 7\"), לא הפוך. אל תבקש/י מהילד 'לכתוב בצ'אט' — התיבה על הלוח היא מקום התשובה.",
  ];
  if (topic) lines.push(`נושא הלמידה כרגע: ${topic}.`);
  if (profileText) lines.push(`\n${profileText}`);
  return lines.join("\n");
}

/**
 * @param {{ messageText, history?, gender?, topic?, userId?, geometry?:{width,height,grid}, occupied?:Array }} p
 * @returns {Promise<{reply:string, toolCalls:Array, mode:string}>}
 */
async function teacherDraw(p = {}) {
  if (!llm.isEnabled()) return { reply: "כדי לסרטט על הלוח צריך שירות AI מוגדר בשרת.", toolCalls: [], mode: "local" };

  const gender = p.gender === "female" ? "female" : "male";
  let profileText = "";
  try {
    profileText = p.userId ? learnerProfile.toPromptText(p.userId) : "";
  } catch (e) {
    /* פרופיל לא קריטי */
  }

  const geo = p.geometry || {};
  const W = Math.round(geo.width || 800), H = Math.round(geo.height || 560), G = Math.round(geo.grid || 42);
  const occN = Array.isArray(p.occupied) ? p.occupied.length : 0;
  const occLine = occN
    ? `הלוח כבר מכיל ${occN} ציורים — אם הבקשה אינה קשורה אליהם קרא/י קודם ל-clear_board, אחרת סרטט/י באזור פנוי.`
    : "הלוח ריק כרגע.";
  const ctxLine = `[הלוח כעת: ${W}×${H}, משבצת ${G}, מרכז בערך (${Math.round(W / 2)},${Math.round(H / 2)}). ${occLine}]`;

  const system = buildSystem({ gender, profileText, topic: p.topic || "" });
  const history = Array.isArray(p.history)
    ? p.history
        .filter((m) => m && (m.role === "user" || m.role === "assistant") && m.content)
        .slice(-12)
        .map((m) => ({ role: m.role, content: String(m.content) }))
    : [];
  const msgs = [...history, { role: "user", content: `${ctxLine}\n${String(p.messageText || "...")}` }];

  try {
    const t0 = Date.now();
    const allCalls = [];
    let text = "";
    // לולאת Tool Use: מחזירים ל-Claude אישור לכל קריאה כדי שישלים ציורים מרובי-שלבים
    // (למשל שעון = עיגול + 12 מספרים + מחוגים). עוצרים כשסיים (end_turn) או בתקרה.
    for (let iter = 0; iter < 8; iter++) {
      const out = await llm.completeTools({ system, messages: msgs, tools: BOARD_TOOLS, maxTokens: 1200, cacheSystem: true });
      if (out.text) text = out.text;
      if (out.toolCalls.length) {
        for (const tc of out.toolCalls) allCalls.push(tc);
        msgs.push({ role: "assistant", content: out.content });
        msgs.push({
          role: "user",
          content: out.toolCalls.map((tc) => ({ type: "tool_result", tool_use_id: tc.id, content: "צויר על הלוח בהצלחה." })),
        });
      }
      if (out.stopReason !== "tool_use" || allCalls.length >= 60) break;
    }
    console.log(`[timing] teach-draw: ${Date.now() - t0}ms  tools=${allCalls.length}`);
    let reply = (text || "").replace(/\*\*/g, "");
    if (!reply) reply = allCalls.length ? "הנה, סרטטתי לך על הלוח." : "ספר/י לי מה לסרטט ואני אצייר על הלוח.";
    reply = genderize(reply, gender);
    return { reply, toolCalls: allCalls, mode: "ai" };
  } catch (e) {
    console.error("teach-draw error:", e.message);
    return { reply: "אופס, לא הצלחתי לסרטט כרגע. ננסה שוב?", toolCalls: [], mode: "error" };
  }
}

module.exports = { teacherDraw };
