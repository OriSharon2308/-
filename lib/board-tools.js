/* eslint-disable no-console */

/**
 * ────────────────────────────────────────────────────────────────────────
 *  כלי הלוח — הגדרה קנונית אחת (Anthropic Tool Use)
 * ────────────────────────────────────────────────────────────────────────
 *
 *  אלה ה"כלים" שהמורה (Claude) יקרא להם כדי לצייר על הלוח המשותף. הם
 *  מוגדרים *פעם אחת* כאן, נשלחים ל-Anthropic כ-`tools` (ובהמשך נשמרים
 *  ב-Prompt Cache יחד עם ה-system — ר' lib/llm.js), כך שהמורה "לומד" אותם
 *  פעם אחת ולא מחדש בכל הודעה.
 *
 *  הפרדת אחריות:
 *   - כאן (שרת): *הסכמה* — שם, תיאור, ופרמטרים. זה מה ש-Claude מקבל.
 *   - בלקוח (board.js): *הביצוע* — מימוש הציור בפועל. שמות הכלים והפרמטרים
 *     חייבים להיות זהים לכאן. board.js מממש handler לכל שם.
 *
 *  מערכת הצירים של הלוח (זהה ל-board.js):
 *   - מרחב לוגי קבוע: 800 (רוחב) × 560 (גובה) יחידות.
 *   - הראשית (0,0) בפינה השמאלית-העליונה. x גדל ימינה (0→800), y גדל מטה (0→560).
 *   - משבצת רשת = 40 יחידות ⇒ 20 עמודות × 14 שורות.
 *  הקואורדינטות בכלים הן תמיד במרחב הלוגי הזה — לא תלויות בגודל התצוגה.
 *
 *  הוספת כלי חדש = להוסיף רשומה אחת למערך BOARD_TOOLS, ולממש handler באותו
 *  שם ב-board.js. זה הכל.
 */

const COORD_NOTE =
  "קואורדינטות במרחב הלוגי של הלוח: 800×560, ראשית (0,0) בפינה השמאלית-העליונה, x ימינה, y מטה. משבצת רשת = 40 יחידות.";

const BOARD_TOOLS = [
  {
    name: "draw_circle",
    description:
      `מצייר עיגול על הלוח. שימושי להמחשת כמויות, ספירה, סימון קבוצות, או הדגשה. ${COORD_NOTE}`,
    input_schema: {
      type: "object",
      properties: {
        x: { type: "number", description: "מרכז העיגול — ציר x (0–800)" },
        y: { type: "number", description: "מרכז העיגול — ציר y (0–560)" },
        r: { type: "number", description: "רדיוס בעיגול ביחידות לוגיות (למשל 20–60)" },
        color: { type: "string", description: "צבע אופציונלי (hex כמו #0d9488 או שם). ברירת מחדל: צבע המורה." },
      },
      required: ["x", "y", "r"],
    },
  },
  {
    name: "draw_line",
    description:
      `מצייר קו ישר בין שתי נקודות. שימושי לצירי מספרים, חיבור בין דברים, חלוקה לקבוצות, או שרטוט צורות. ${COORD_NOTE}`,
    input_schema: {
      type: "object",
      properties: {
        x1: { type: "number", description: "נקודת התחלה — x (0–800)" },
        y1: { type: "number", description: "נקודת התחלה — y (0–560)" },
        x2: { type: "number", description: "נקודת סיום — x (0–800)" },
        y2: { type: "number", description: "נקודת סיום — y (0–560)" },
        color: { type: "string", description: "צבע אופציונלי. ברירת מחדל: צבע המורה." },
        width: { type: "number", description: "עובי הקו (ברירת מחדל 4)" },
      },
      required: ["x1", "y1", "x2", "y2"],
    },
  },
  {
    name: "write_text",
    description:
      `כותב טקסט או מספר על הלוח, ממורכז סביב הנקודה (x,y). שימושי לכתיבת מספרים, סימני פעולה (+,−,=), או תיוג קצר. ${COORD_NOTE}`,
    input_schema: {
      type: "object",
      properties: {
        x: { type: "number", description: "מרכז הטקסט — x (0–800)" },
        y: { type: "number", description: "מרכז הטקסט — y (0–560)" },
        text: { type: "string", description: "הטקסט לכתיבה (קצר — מספר, מילה, או סימן)" },
        size: { type: "number", description: "גודל הגופן ביחידות לוגיות (ברירת מחדל 32)" },
        color: { type: "string", description: "צבע אופציונלי. ברירת מחדל: צבע המורה." },
      },
      required: ["x", "y", "text"],
    },
  },
  {
    name: "clear_board",
    description:
      "מנקה את כל הלוח (ציורי המורה וגם סימוני הילד). משתמשים כשמתחילים שלב חדש כדי לא להעמיס על הילד.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
];

// שמות הכלים בלבד — לבדיקות עקביות מול board.js.
const TOOL_NAMES = BOARD_TOOLS.map((t) => t.name);

// מאפייני הלוח — מקור אמת יחיד שגם הלקוח יכול לקרוא (דרך endpoint בהמשך).
const BOARD_GEOMETRY = { width: 800, height: 560, grid: 40 };

module.exports = { BOARD_TOOLS, TOOL_NAMES, BOARD_GEOMETRY, COORD_NOTE };
