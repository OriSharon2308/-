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
    name: "draw_polygon",
    description:
      `מצייר מצולע סגור (משולש, ריבוע, מלבן, מחומש...) מרשימת קודקודים, לפי הסדר. הצורה נסגרת אוטומטית. אופציה למילוי. שימושי לציור צורות גאומטריות. ${COORD_NOTE}`,
    input_schema: {
      type: "object",
      properties: {
        points: {
          type: "array",
          description: "רשימת קודקודים [[x,y], ...] — לפחות 3, לפי הסדר סביב הצורה.",
          items: { type: "array", items: { type: "number" } },
        },
        color: { type: "string", description: "צבע אופציונלי" },
        fill: { type: "boolean", description: "האם למלא את הצורה בצבע שקוף (ברירת מחדל: לא)" },
        width: { type: "number", description: "עובי הקו (ברירת מחדל 4)" },
      },
      required: ["points"],
    },
  },
  {
    name: "draw_arrow",
    description:
      `מצייר חץ מ-(x1,y1) ל-(x2,y2) עם ראש חץ בקצה. שימושי להצבעה, כיוון, או חיבור בין דברים. ${COORD_NOTE}`,
    input_schema: {
      type: "object",
      properties: {
        x1: { type: "number" }, y1: { type: "number" },
        x2: { type: "number" }, y2: { type: "number" },
        color: { type: "string", description: "צבע אופציונלי" },
        width: { type: "number", description: "עובי (ברירת מחדל 4)" },
      },
      required: ["x1", "y1", "x2", "y2"],
    },
  },
  {
    name: "draw_point",
    description:
      `מסמן נקודה (עיגול מלא קטן) ב-(x,y), עם תווית קצרה אופציונלית מעליה. שימושי לסימון נקודות על ציר, קודקודים, או מיקומים. ${COORD_NOTE}`,
    input_schema: {
      type: "object",
      properties: {
        x: { type: "number" }, y: { type: "number" },
        label: { type: "string", description: "תווית קצרה מעל הנקודה (אופציונלי)" },
        color: { type: "string", description: "צבע אופציונלי" },
      },
      required: ["x", "y"],
    },
  },
  {
    name: "draw_number_line",
    description:
      `מצייר ציר מספרים אופקי שמתחיל ב-(x,y) ונמתח ימינה, עם שנתות וערכים מ-from עד to (בקפיצות step) וראש חץ בקצה. מצוין להמחשת מספרים, חיבור וחיסור. ${COORD_NOTE}`,
    input_schema: {
      type: "object",
      properties: {
        x: { type: "number", description: "תחילת הציר — x" },
        y: { type: "number", description: "גובה הציר — y" },
        from: { type: "number", description: "הערך הראשון (למשל 0)" },
        to: { type: "number", description: "הערך האחרון (למשל 10)" },
        step: { type: "number", description: "קפיצה בין ערכים (ברירת מחדל 1)" },
        length: { type: "number", description: "אורך הציר בפיקסלים לוגיים (אופציונלי; אחרת נגזר אוטומטית)" },
        jumps: { type: "array", description: "קפיצות אופציונליות מעל הציר להמחשת חיבור/חיסור: [[from,to,\"+3\"], ...]. כל קפיצה = קשת עם תווית.", items: { type: "array", items: {} } },
        color: { type: "string", description: "צבע אופציונלי" },
      },
      required: ["x", "y", "from", "to"],
    },
  },
  {
    name: "draw_fraction_bar",
    description:
      `תבנית: מוט-שבר — מלבן מחולק ל-parts חלקים שווים, מתוכם shaded צבועים, עם תווית השבר מתחת. מצוין להמחשת שברים. אובייקט אחד עם תווית מובנית. ${COORD_NOTE}`,
    input_schema: {
      type: "object",
      properties: {
        x: { type: "number", description: "מרכז המוט — x" },
        y: { type: "number", description: "מרכז המוט — y" },
        parts: { type: "number", description: "מספר החלקים השווים (המכנה), למשל 4" },
        shaded: { type: "number", description: "כמה חלקים צבועים (המונה), למשל 3" },
        label: { type: "string", description: "תווית אופציונלית (ברירת מחדל: shaded/parts, למשל \"3/4\")" },
        color: { type: "string", description: "צבע אופציונלי" },
      },
      required: ["x", "y", "parts", "shaded"],
    },
  },
  {
    name: "draw_array",
    description:
      `תבנית: מערך נקודות לכפל — rows שורות × cols עמודות של נקודות, עם תווית התרגיל מתחת (למשל "3 × 4 = 12"). מצוין להמחשת כפל. ${COORD_NOTE}`,
    input_schema: {
      type: "object",
      properties: {
        x: { type: "number", description: "מרכז המערך — x" },
        y: { type: "number", description: "מרכז המערך — y" },
        rows: { type: "number", description: "מספר השורות (1–12)" },
        cols: { type: "number", description: "מספר העמודות (1–12)" },
        label: { type: "string", description: "תווית אופציונלית (ברירת מחדל: rows × cols = מכפלה)" },
        color: { type: "string", description: "צבע אופציונלי" },
      },
      required: ["x", "y", "rows", "cols"],
    },
  },
  {
    name: "draw_base_ten",
    description:
      `תבנית: בלוקי בסיס-10 לערך value (0–999) — מאות כריבועי 10×10, עשרות כמוטות, יחידות כקוביות, עם תווית הערך מתחת. מצוין להמחשת ערך-מקום. ${COORD_NOTE}`,
    input_schema: {
      type: "object",
      properties: {
        x: { type: "number", description: "מרכז הקבוצה — x" },
        y: { type: "number", description: "מרכז הקבוצה — y" },
        value: { type: "number", description: "הערך להמחשה (0–999), למשל 243" },
        label: { type: "string", description: "תווית אופציונלית (ברירת מחדל: הערך)" },
        color: { type: "string", description: "צבע אופציונלי" },
      },
      required: ["x", "y", "value"],
    },
  },
  {
    name: "draw_bar_model",
    description:
      `תבנית: מודל-מוט (bar model) לשאלות מילוליות — מוט מחולק לחלקים פרופורציונליים לפי value, כל חלק עם תווית, ואופציונלי תווית "סך הכל" מעל. מצוין לחלק-חלק-שלם. ${COORD_NOTE}`,
    input_schema: {
      type: "object",
      properties: {
        x: { type: "number", description: "מרכז המוט — x" },
        y: { type: "number", description: "מרכז המוט — y" },
        parts: { type: "array", description: "חלקי המוט: [{value:3,label:\"3\"}, {value:5,label:\"5\"}]. הרוחב פרופורציוני ל-value.", items: { type: "object", properties: { value: { type: "number" }, label: { type: "string" } } } },
        total: { type: "string", description: "תווית סך-הכל אופציונלית מעל המוט (למשל \"8\")" },
        color: { type: "string", description: "צבע אופציונלי" },
      },
      required: ["x", "y", "parts"],
    },
  },
  {
    name: "draw_exercise",
    description:
      "תבנית מהירה (העדף/י אותה לכל תרגיל/שאלה!): מציירת תרגיל שלם עם תיבת-תשובה אינטראקטיבית בקריאה אחת, ומסדרת בשורות לבד. המיקום אוטומטי לפי kind: מספרי → תיבה בימין הלוח (אחרי ה-=); מילולי → תיבה בשמאל הלוח (סוף המשפט בעברית). בחר/י kind נכון — הוא קובע גם את צד התשובה. אל תצייר/י תרגילים ידנית. כמה שאלות — קריאה לכל אחת (אפשר בבת אחת).",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "נוסח התרגיל משמאל לימין. בתרגיל מספרי מסתיים ב-'=' בלי '?' ובלי התשובה (למשל \"4 + 3 =\") — התיבה היא מקום התשובה. בשאלה מילולית כתוב את השאלה כרגיל." },
        answer: { type: "string", description: "התשובה הנכונה (למשל \"7\")" },
        kind: { type: "string", enum: ["number", "text"], description: "number=תשובה מספרית; text=שאלה מילולית" },
      },
      required: ["text", "answer", "kind"],
    },
  },
  {
    name: "draw_clock",
    description:
      "תבנית מהירה: מציירת שעון שלם (עיגול + 12 מספרים + מחוגים) בקריאה אחת. העדף/י את זה לשעונים במקום לצייר ידנית.",
    input_schema: {
      type: "object",
      properties: {
        x: { type: "number", description: "מרכז השעון — x" },
        y: { type: "number", description: "מרכז השעון — y" },
        hour: { type: "number", description: "השעה (0–12)" },
        minute: { type: "number", description: "דקות (0–59, ברירת מחדל 0)" },
        r: { type: "number", description: "רדיוס (ברירת מחדל 110)" },
        title: { type: "string", description: "כותרת אופציונלית שתמוקם נקי מעל השעון (במקום לכתוב טקסט שעלול לחפוף)" },
        color: { type: "string", description: "צבע אופציונלי" },
      },
      required: ["x", "y", "hour"],
    },
  },
  {
    name: "ask_answer",
    description:
      "מציב על הלוח תיבת-תשובה אינטראקטיבית שהילד ימלא. השתמש/י כשאת/ה נותן/ת תרגיל או שאלה. ציין/י את התשובה הנכונה מראש (answer) — המערכת תבדוק לבד: צודק → קונפטי ומעבר הלאה; טועה → סימן שגיאה. הצב/י את התיבה ליד התרגיל, בצד ימין של הלוח, בלי לחפוף לטקסט.",
    input_schema: {
      type: "object",
      properties: {
        x: { type: "number", description: "מרכז התיבה — x" },
        y: { type: "number", description: "מרכז התיבה — y" },
        kind: { type: "string", enum: ["number", "text"], description: "'number' = קוביה קטנה לתשובה מספרית (חיבור/חיסור/כפל); 'text' = מלבן גדול לשאלה מילולית" },
        answer: { type: "string", description: "התשובה הנכונה (למשל \"7\"). חשוב לציין כשהתשובה ידועה מראש." },
      },
      required: ["x", "y", "kind"],
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
  {
    name: "render_widget",
    description:
      "כלי-על: יוצר *מיני-אפליקציה אינטראקטיבית* משלך (HTML+SVG+JS) שרצה על הלוח — לכל מה שתבנית מוכנה לא נותנת. " +
      "כך את/ה בונה כלי מותאם בדיוק לילד הזה: סרגל שגוררים, משחק ספירה, הדגמה מונפשת, אפקטים, גרפיקה אינטראקטיבית. " +
      "כללי-זהב: (1) html עצמאי לגמרי — בלי קישורים/קבצים חיצוניים. רק <style> ו-<script> inline, ותמונות כ-data-URI. " +
      "(2) השתמש/י בכל גובה/רוחב הווידג'ט (100%) ובצבע הלוח (טורקיז #0d9488, טקסט #0f3b36, ירוק הצלחה #22c55e). " +
      "(3) קוד נקי, מדויק, יפה, גדול וברור לילד; אינטראקציות במגע ובעכבר (pointer events); הצמדה למספרים שלמים כשרלוונטי. " +
      "(4) משוב: כשהילד מצליח שלח/י parent.postMessage({type:'vela:correct'},'*') (יפעיל קונפטי), טעות → {type:'vela:wrong'}, להגיד משהו → {type:'vela:say',text:'...'}. " +
      "(5) אין רשת/אחסון — הכול בתוך הווידג'ט. דוגמה לסרגל קפיצות נגרר: " +
      "<svg viewBox='0 0 380 160' width='100%' height='100%'><line x1='20' y1='110' x2='360' y2='110' stroke='#0d9488' stroke-width='3'/></svg> + <script> ...גרירת חץ, הצמדה לשנתות, עדכון תווית '+N', postMessage בהשלמה... </" + "script>.",
    input_schema: {
      type: "object",
      properties: {
        html: { type: "string", description: "תוכן ה-body של הווידג'ט: HTML/SVG + <style> ו-<script> inline. עצמאי לגמרי, בלי משאבים חיצוניים." },
        title: { type: "string", description: "כותרת קצרה לכלי (אופציונלי)" },
        x: { type: "number", description: "פינה שמאלית-עליונה — x (אופציונלי; ברירת מחדל: ממורכז)" },
        y: { type: "number", description: "פינה שמאלית-עליונה — y (אופציונלי; ברירת מחדל 120)" },
        w: { type: "number", description: "רוחב ביחידות לוגיות (80–760, ברירת מחדל 380)" },
        h: { type: "number", description: "גובה ביחידות לוגיות (60–520, ברירת מחדל 240)" },
      },
      required: ["html"],
    },
  },
  // ── ערכת ווידג'טים אינטראקטיביים — כלים (מניפולטיבים) לעזור ללמד, *לא שאלות*. ──
  // עיקרון: הכלי רק ממחיש ועוזר לחקור. את השאלה עצמה כותבים על הלוח (draw_exercise) והכלי יושב לידה ומקושר אליה.
  // אל תכניס/י שאלה/בדיקת-תשובה לתוך הכלי — הוא מראה מצב חי (שבר, ספירה, מכפלה), לא בוחן.
  {
    name: "interactive_fraction",
    description:
      "כלי שבר: צורה מחולקת ל-parts חלקים שווים; הילד לוחץ על חלק כדי לצבוע/לבטל ורואה n/parts מתעדכן חי. " +
      "להמחשת שבר, שווי-ערך, השוואה — לא שאלה (את השאלה כתוב/י על הלוח). צורות: bar (מוט), circle (פיצה), grid (רשת).",
    input_schema: {
      type: "object",
      properties: {
        shape: { type: "string", enum: ["bar", "circle", "grid"], description: "צורת השבר (ברירת מחדל bar)" },
        parts: { type: "integer", description: "מכנה — מספר החלקים השווים (2–12)" },
        shaded: { type: "integer", description: "כמה חלקים צבועים בהתחלה להמחשה (0..parts, ברירת מחדל 0)" },
      },
      required: ["parts"],
    },
  },
  {
    name: "count_objects",
    description:
      "כלי ספירה: אובייקטים מעוצבים (לא אימוג'י) בשתי קבוצות; הילד לוחץ כדי לספור והמונה מתעדכן. למנייה והמחשת חיבור/חיסור קטן. " +
      "אינו מציג שאלה ואינו בודק תשובה — את התרגיל כתוב/י על הלוח.",
    input_schema: {
      type: "object",
      properties: {
        left: { type: "integer", description: "כמות בקבוצה הראשונה (0–10)" },
        right: { type: "integer", description: "כמות בקבוצה השנייה (0–10)" },
        op: { type: "string", enum: ["+", "-"], description: "מפריד ויזואלי בין הקבוצות (ברירת מחדל +)" },
        item: { type: "string", enum: ["apple", "star", "balloon"], description: "סוג האובייקט המעוצב (ברירת מחדל apple)" },
      },
      required: ["left", "right"],
    },
  },
  {
    name: "ten_frame",
    description:
      "כלי לוח-עשר (ריבועים): הילד לוחץ למלא/לרוקן משבצות ורואה כמה מלאות. להמחשת השלמה ל-10, עשיריות, מבנה המספר. cells=מספר משבצות, perRow=בכל שורה. אינו שאלה.",
    input_schema: {
      type: "object",
      properties: {
        cells: { type: "integer", description: "מספר המשבצות בלוח (1–30, ברירת מחדל 10)" },
        perRow: { type: "integer", description: "משבצות בכל שורה (1–10, ברירת מחדל 5)" },
        filled: { type: "integer", description: "כמה מלאות בהתחלה להמחשה (ברירת מחדל 0)" },
      },
      required: ["cells"],
    },
  },
  {
    name: "base_ten_builder",
    description:
      "כלי בניית מספר בגרירה: הילד גורר יחידות/עשרות/מאות ובונה את המספר number ורואה את הרכב ערך-המקום. להמחשת ערך-מקום והרכבת מספר. number = המספר שמדגימים (לא שאלה — הוא מוצג).",
    input_schema: {
      type: "object",
      properties: {
        target: { type: "integer", description: "המספר שבונים/מדגימים (1–999)" },
      },
      required: ["target"],
    },
  },
  {
    name: "mult_array",
    description:
      "כלי מערך כפל עד 10×10: הילד גורר ריבוע-בחירה (מתחיל משמאל-למטה) על רשת עיגולים ורואה rows×cols=מכפלה חי. להמחשת כפל כמערך וחוק החילוף. " +
      "אינו בוחן — מראה את המכפלה לכל בחירה. את השאלה כתוב/י על הלוח.",
    input_schema: {
      type: "object",
      properties: {
        maxRows: { type: "integer", description: "שורות ברשת (1–10, ברירת מחדל 10)" },
        maxCols: { type: "integer", description: "עמודות ברשת (1–10, ברירת מחדל 10)" },
      },
      required: ["maxRows", "maxCols"],
    },
  },
  {
    name: "mult_table",
    description:
      "כלי לוח-הכפל עם מספרים מוסתרים שהילד ממלא — מניפולטיב לתרגול/שינון לוח-הכפל (המילוי הוא חלק מהכלי, לא שאלה חיצונית). max=גודל הלוח, hide=כמה תאים להעלים.",
    input_schema: {
      type: "object",
      properties: {
        max: { type: "integer", description: "גודל לוח-הכפל (2–12, ברירת מחדל 10)" },
        hide: { type: "integer", description: "כמה תאים להעלים למילוי הילד (ברירת מחדל 6)" },
      },
      required: ["max"],
    },
  },
  {
    name: "clock_interactive",
    description:
      "שעון אנלוגי אינטראקטיבי: הילד גורר את המחוגים ורואה את השעה הדיגיטלית מתעדכנת. להמחשת קריאת שעה וכיוון זמן. " +
      "אינו שאלה — להצגת שעה לקריאה תן/י hour+minute; את התרגיל כתוב/י על הלוח.",
    input_schema: {
      type: "object",
      properties: {
        hour: { type: "integer", description: "שעה התחלתית 0–23 (ברירת מחדל 3)" },
        minute: { type: "integer", description: "דקות התחלתיות 0–59 (ברירת מחדל 0)" },
      },
      required: [],
    },
  },
  {
    name: "money_coins",
    description:
      "כלי כסף (₪): הילד לוחץ על מטבעות/שטרות (1,2,5,10,20,50) ובונה סכום; הסכום מתעדכן חי, כפתור 'נקה' מאפס. " +
      "להמחשת בניית סכום, ספירת כסף ועודף. אין צורך בפרמטרים.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "hundred_chart",
    description:
      "לוח-מאה (10×10): הילד לוחץ לסימון מספרים — לדילוגים (2,5,10), זוגי/אי-זוגי, דפוסים ו-+10/−10. " +
      "skip מסמן מראש את הכפולות של המספר (להדגמה). start קובע אם הלוח 1–100 או 0–99.",
    input_schema: {
      type: "object",
      properties: {
        skip: { type: "integer", description: "סמן מראש כפולות של (2–12; 0 = ריק)" },
        start: { type: "integer", description: "0 ל-0–99, או 1 ל-1–100 (ברירת מחדל 1)" },
      },
      required: [],
    },
  },
  {
    name: "number_line_interactive",
    description:
      "סרגל-מספרים אינטראקטיבי: הילד גורר את הסמן לאורך הציר, רואה את המספר ואת הקפיצה +N/−N מנקודת ההתחלה. " +
      "להמחשת חיבור/חיסור כקפיצה, מיקום מספר והשוואה. from/to/step מגדירים את הציר; start = נקודת הקפיצה.",
    input_schema: {
      type: "object",
      properties: {
        from: { type: "integer", description: "תחילת הציר (ברירת מחדל 0)" },
        to: { type: "integer", description: "סוף הציר (ברירת מחדל 10)" },
        step: { type: "integer", description: "מרווח בין שנתות (ברירת מחדל 1)" },
        start: { type: "integer", description: "נקודת מוצא לקפיצה (ברירת מחדל from)" },
      },
      required: ["from", "to"],
    },
  },
  // ── סידור-עצמי: הזזה/שינוי-גודל/מחיקה של פריט קיים לפי id (מתוך רשימת הפריטים שמצורפת בכל בקשה). ──
  {
    name: "move_item",
    description:
      "מזיז פריט קיים (אובייקט/תרגיל/ווידג'ט) לפי id, כדי לסדר את הלוח ולמנוע חפיפות. x,y = הפינה השמאלית-העליונה החדשה. " +
      "השתמש/י בזה אחרי שהוספת תוכן אם משהו חופף או יושב לא טוב — רשימת הפריטים עם מיקומיהם מצורפת בכל בקשה.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "מזהה הפריט (כפי שמופיע ברשימת פריטי-הלוח)" },
        x: { type: "number", description: "x חדש של הפינה השמאלית-העליונה" },
        y: { type: "number", description: "y חדש של הפינה השמאלית-העליונה" },
      },
      required: ["id", "x", "y"],
    },
  },
  {
    name: "resize_item",
    description:
      "משנה גודל של ווידג'ט או תרגיל קיים לפי id — להגדלה/הקטנה בלבד. ווידג'ט שומר תמיד על יחס-הגובה-רוחב שלו (לא מתעוות): " +
      "מספיק לתת w (או scale) והגובה נגזר אוטומטית. scale מכפיל את הגודל הנוכחי (1.4 גדול יותר, 0.7 קטן יותר).",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "מזהה הפריט" },
        w: { type: "number", description: "רוחב מבוקש לווידג'ט (הגובה נגזר מהיחס); ~140–880" },
        scale: { type: "number", description: "קנה-מידה יחסי לגודל הנוכחי (0.4–3) — לווידג'ט או לתרגיל" },
      },
      required: ["id"],
    },
  },
  {
    name: "remove_item",
    description: "מסיר פריט קיים מהלוח לפי id — כשהוא מיותר, שגוי, או מפנה מקום. (לניקוי כל הלוח השתמש/י ב-clear_board.)",
    input_schema: {
      type: "object",
      properties: { id: { type: "string", description: "מזהה הפריט להסרה" } },
      required: ["id"],
    },
  },
];

// שמות הכלים בלבד — לבדיקות עקביות מול board.js.
const TOOL_NAMES = BOARD_TOOLS.map((t) => t.name);

// מאפייני הלוח — מקור אמת יחיד שגם הלקוח יכול לקרוא (דרך endpoint בהמשך).
const BOARD_GEOMETRY = { width: 800, height: 560, grid: 40 };

module.exports = { BOARD_TOOLS, TOOL_NAMES, BOARD_GEOMETRY, COORD_NOTE };
