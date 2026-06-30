/* eslint-disable no-console */

// סוכן סרטוט: המורה (Claude) מסרטט על הלוח דרך Tool Use — לפי בקשת הילד בשיחה.
// נפרד מ-teacher-agent כדי לא לגעת בלוגיקת המורה/הקול/הזיכרון הקיימת — רק מוסיף יכולת.

const llm = require("../lib/llm");
const { genderize } = require("../lib/gender");
const learnerProfile = require("../lib/learner-profile");
const { BOARD_TOOLS } = require("../lib/board-tools");
const { catalogPromptSection } = require("../lib/teaching-tools"); // מאגר הכלים: נושא → הויזואל → הכלי

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
    "טיפים: למשולש/ריבוע — draw_polygon; לשעון — draw_clock (תבנית שלמה); לסימון נקודה — draw_point; להצבעה — draw_arrow.",
    "",
    "תבניות מתמטיקה מוכנות (העדף/י אותן — כל תבנית היא אובייקט אחד עם תוויות מובנות, נקי ובלי חפיפות):",
    "- שברים → draw_fraction_bar(x,y,parts,shaded). כפל → draw_array(x,y,rows,cols). ערך-מקום → draw_base_ten(x,y,value).",
    "- חיבור/חיסור על ציר → draw_number_line עם jumps:[[0,3,\"+3\"],[3,5,\"+2\"]] (קשתות מעל הציר). שאלה מילולית חלק-חלק-שלם → draw_bar_model(x,y,parts:[{value,label},...],total).",
    "- אל תרכיב/י תבניות כאלה ידנית מקווים וטקסטים — זה יוצא מבולגן. השתמש/י בתבנית.",
    "",
    "ווידג'טים אינטראקטיביים מוכנים (כשהילד עושה בעצמו — גרירה/בנייה/מילוי/בחירה): interactive_fraction (שבר לחיץ מוט/עיגול/רשת), count_objects (אובייקטים מעוצבים לספירה), ten_frame (לוח-עשר למילוי), base_ten_builder (גרירת יחידות/עשרות/מאות), mult_array (מערך כפל עם בחירת-ריבוע עד 10×10), mult_table (לוח-הכפל עם מספרים מוסתרים למילוי), clock_interactive (שעון עם מחוגים נגררים), money_coins (בניית סכום במטבעות ₪), hundred_chart (לוח-מאה לסימון דילוגים/דפוסים), number_line_interactive (סרגל-מספרים עם סמן נגרר וקפיצה +N). כולם בכרטיס שקוף נשלט-גודל. העדף/י אותם על בנייה ידנית.",
    "חשוב מאוד — הכלים האלה הם *מניפולטיבים שעוזרים ללמד ולחקור, לא שאלות*. הם מראים מצב חי (שבר, ספירה, מכפלה) ואינם בוחנים. את השאלה/התרגיל כותבים בנפרד על הלוח עם draw_exercise, והכלי יושב לידה וממחיש אותה (אותם מספרים, אותו הקשר). אל תכניס/י שאלה או בדיקת-תשובה לתוך הכלי, ואל תתייחס/י אליו כאל שאלה.",
    "כלי-על — ווידג'ט חי (render_widget): רק כשאף תבנית ואף ווידג'ט-מוכן לא מתאים, בנה/י בעצמך *מיני-אפליקציה אינטראקטיבית* (HTML/SVG/JS עצמאי) שרצה על הלוח — כלי מותאם בדיוק לילד הזה (סרגל שגוררים, משחק, הדגמה מונפשת, אפקטים). הקוד חייב להיות עצמאי (inline בלבד), נקי, מדויק ויפה, ובצבעי הלוח. למשוב הצלחה שלח/י postMessage({type:'vela:correct'}).",
    "",
    "חוק ברזל — אי-חפיפה (הכי חשוב!): שום פריט לעולם לא עולה על פריט אחר, ולו במעט. כל ציור/תבנית/ווידג'ט/טקסט/תרגיל מקבל שטח משלו עם רווח ברור (~40 יחידות לפחות) מכל פריט אחר. לפני שאת/ה ממקם/ת פריט — בדוק/י שהמלבן שלו (רוחב×גובה) לא נכנס לשטח של אף פריט קיים. אם הלוח מתחיל להצטופף — פזר/י לשורות/עמודות מסודרות או נקה/י (clear_board) והתחל/י נקי. עדיף פריט אחד נקי מאשר כמה חופפים.",
    "סידור-עצמי: בכל בקשה תקבל/י רשימה של הפריטים שכבר על הלוח עם ה-id והמיקום (פינה שמאלית-עליונה + גודל) שלהם. זו ה'ראייה' שלך את הלוח. אם משהו חופף, יושב במקום לא טוב, או שכותרת לא מעל הציור שלה — תקן/י בעצמך עם move_item(id,x,y) / resize_item(id,...) / remove_item(id), במקום להוסיף עוד תוכן על ערימה לא מסודרת. חשב/י על המיקומים: שתי תיבות חופפות אם הן חולקות שטח — הזז/י אחת לאזור פנוי (למטה/לצד) עד שיש רווח.",
    "מיקום נוח לעין: מקם/י כל דבר בנקודה מאוזנת ונעימה — קרוב לתוכן שקשור אליו, עם מעט אוויר סביבו, ולא דחוס בפינה. כשמוסיפים פריט חדש, חשב/י איפה הוא ישתלב יפה ביחס למה שכבר על הלוח (לא סתם במקום הראשון הפנוי). מרכז אזור-העבודה והחצי הימני נוחים; השמאל-התחתון נתפס לרוב ע\"י הצ'אט — הימנע/י מלשים שם תוכן חשוב.",
    "פריסה נקייה:",
    "- אל תכתוב/י טקסט מעל ציור קיים. כותרת/שאלה — מעל הציור עם רווח (~40 יחידות), לא בתוכו ולא עליו.",
    "- כל פריט במקום משלו עם רווח של לפחות ~40 יחידות בין פריטים. אם יש כמה פריטים, סדר/י אותם ברשת מסודרת (בשורות/עמודות), במרחקים שווים.",
    "- לתבניות יש כבר תוויות מובנות (השבר, התרגיל, הערך) — אל תוסיף/י טקסט כפול לידן.",
    "- בדוק/י את הגדלים: ודא/י שכל פריט נכנס בשוליו ולא נכנס לשטח של פריט אחר.",
    "תרגילים/שאלות: השתמש/י תמיד בתבנית draw_exercise(text, answer, kind) — קריאה אחת לכל תרגיל. היא ממקמת ומסדרת לבד, ומוסיפה תיבת-תשובה צמודה. אל תצייר/י תרגילים ידנית עם write_text/ask_answer. המיקום אוטומטי לפי הסוג: תרגיל מספרי (kind:number) → תיבת-התשובה בצד ימין (אחרי ה-=); שאלה מילולית (kind:text) → תיבת-התשובה בצד שמאל (סוף המשפט, RTL). חשוב לבחור kind נכון כי הוא קובע גם את צד התשובה.",
    "- בתרגיל מספרי כתב/י text שמסתיים ב-'=' בלי סימן שאלה ובלי התשובה (למשל \"35 + 24 =\"). התיבה היא מקום התשובה — אין צורך ב-'?'. בשאלה מילולית כתב/י את השאלה כרגיל.",
    "- אם הילד כבר צייר משהו על הלוח שקשור לשאלה, מקם/י את התרגיל באזור פנוי קרוב אליו (המערכת תארגן את התצוגה כך שייראו גם הציור וגם השאלה).",
    "- חיבור/חיסור/כפל → kind:\"number\". שאלה מילולית → kind:\"text\". ציין/י תמיד את answer הנכון.",
    "- כשמבקשים כמה שאלות (למשל 3) — קרא/י ל-draw_exercise שלוש פעמים, כולן יחד באותה תשובה (במקביל), כדי שכולן יופיעו מיד ובמלואן.",
    "מהירות (חשוב!): הוצא/י את כל קריאות הכלים יחד באותה תשובה כשאפשר — לא אחת-אחת. כך זה מהיר.",
    "כתיבת מספרים ותרגילים תמיד משמאל לימין (\"3 + 4 = 7\"), לא הפוך. אל תבקש/י מהילד 'לכתוב בצ'אט' — התיבה על הלוח היא מקום התשובה.",
    "",
    catalogPromptSection(), // מאגר הכלים + פרואקטיביות — המורה מחליט בעצמו מה להציג
  ];
  if (topic) lines.push(`נושא הלמידה כרגע: ${topic}. בחר/י מהמאגר את הויזואל המתאים לנושא והצג/י אותו מיוזמתך.`);
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

  // פריסת הלוח (id+מיקום+גודל) — כך המורה "רואה" מה כבר על הלוח ויכול לסדר בעצמו (move_item/resize_item/remove_item).
  const layout = Array.isArray(p.layout) ? p.layout : [];
  let layoutLine = "";
  if (layout.length) {
    const rows = layout
      .slice(0, 24)
      .map((it) => `  ${it.id} [${it.kind}] (${it.x},${it.y}) ${it.w}×${it.h}${it.label ? ` "${it.label}"` : ""}`)
      .join("\n");
    layoutLine =
      `\nפריטים שכבר על הלוח (פינה שמאלית-עליונה + גודל). אתה יכול לסדר אותם בעצמך לפי id — ` +
      `move_item(id,x,y) להזזה, resize_item(id,...) לשינוי גודל, remove_item(id) להסרה. ` +
      `אם משהו חופף או יושב לא טוב — סדר/י אותו, אל תוסיף/י עוד על הערימה:\n${rows}`;
  }

  const system = buildSystem({ gender, profileText, topic: p.topic || "" });
  const history = Array.isArray(p.history)
    ? p.history
        .filter((m) => m && (m.role === "user" || m.role === "assistant") && m.content)
        .slice(-12)
        .map((m) => ({ role: m.role, content: String(m.content) }))
    : [];
  const msgs = [...history, { role: "user", content: `${ctxLine}${layoutLine}\n${String(p.messageText || "...")}` }];

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
