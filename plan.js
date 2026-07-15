/* eslint-disable no-console */
// vela · תוכנית הבנייה — שתי תוכניות: vela (מבצעית) והמיליון (קומות ההון).
// מוגן בסיסמת האדמין; סימוני ✓ נשמרים בשרת ומסונכרנים לענן.
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);

  /* ═══════════════════ התוכן ═══════════════════ */
  // הנחות המספרים (משוער, מעודכן יולי 2026):
  // מנוי ממוצע ₪69/חודש · נטו אחרי מע"מ ועמלות ≈ ₪55 · עלות AI לתלמיד פעיל ≈ ₪8-15/חודש.

  const VELA = {
    hero: {
      title: 'תוכנית <em class="latin gt-green">vela</em>',
      sub: 'המצב: מוצר חי בענן — מורה-AI בקול, תרגול מותאם, אזורי הורים וניהול. <b>0 משתמשים אמיתיים.</b> המשימה עכשיו: הוכחה שמישהו מוכן לשלם — ורק אז לבנות עוד.',
      stats: [
        { v: "חי בענן", k: "מצב המוצר" },
        { v: "0 → 10", k: "המשלמים הבאים" },
        { v: "₪0", k: "עלות תשתית חודשית" },
      ],
    },
    chapters: [
      {
        id: "v-now",
        title: "הקצב — איך עובדים מהיום",
        time: "מתמשך",
        why: "אתה בונה לבד עם קלוד, סביב מסגרת קשוחה (צבא). הניצחון לא בא מלעבוד יותר — אלא מלעבוד לפי הסדר הנכון: קודם מה שמזיז משתמשים, אחר-כך מה שכיף לבנות.",
        advice: "ההמלצה שלי: שבוע עבודה קבוע של 3 בלוקים — (1) שיחות עם הורים/תלמידים אמיתיים, (2) תיקון הדבר האחד שהכי הפריע להם, (3) יצירת תוכן/פרסום. בסדר הזה. פיצ'רים חדשים נכנסים רק אם משתמש אמיתי ביקש אותם פעמיים.",
        goals: [
          { id: "v0.1", t: "לקבוע בלוק שבועי קבוע ביומן לשיחות משתמשים (גם בצבא — ערב אחד)", n: "בלי זה הכל תיאוריה. שעה בשבוע מינימום." },
          { id: "v0.2", t: "מסמך אחד חי: כל פידבק, כל כאב, כל משפט של הורה — במקום אחד", n: "הכאב שחוזר בניסוחים שונים — הוא המוצר." },
          { id: "v0.3", t: "כלל ברזל: אין פיצ'ר חדש בלי בקשה כפולה ממשתמש אמיתי", n: "חוסך חודשים. הצ'ק הזה הוא תזכורת יומית." },
        ],
      },
      {
        id: "v-validate",
        title: "אימות — 10 המשלמים הראשונים",
        time: "2–6 שבועות",
        gate: "שער: 10 משלמים",
        why: "יש לך יתרון שאין לרוב היזמים: המוצר כבר עובד. השלב שמפיל 90% מהסטארטאפים הוא לא הבנייה — זה למצוא אנשים שמוציאים כרטיס אשראי. הכל בפרק הזה מכוון לשם.",
        advice: "אל תמכור 'מנוי לפלטפורמה'. תמכור תוצאה: \"תוך חודש הילד פותר תרגילי כיתה ב' לבד — או שהכסף חוזר\". הורה קונה ביטחון, לא טכנולוגיה. ותתחיל מהמעגל הקרוב: משפחה מורחבת, הורים מבית הספר, קבוצות וואטסאפ יישוביות.",
        numbers: [
          { v: "10", k: "משלמים = הוכחה" },
          { v: "₪39", k: "מחיר השקה לחודש (מוקדם)" },
          { v: "30", k: "שיחות הורים כיעד" },
        ],
        goals: [
          { id: "v1.1", t: "לגייס 10 ילדים לשבוע ניסיון חינם — מהמעגל הקרוב", n: "וואטסאפ אישי להורים. לא פרסום — שיחות." },
          { id: "v1.2", t: "לצפות ב-5 ילדים משתמשים בשידור חי (או וידאו מההורה)", n: "לראות איפה הם נתקעים באמת — שווה יותר מכל אנליטיקס." },
          { id: "v1.3", t: "להציע מחיר מוקדם ₪39/חודש ל-10 הראשונים — לכל החיים", n: "מי שמסרב — לשאול למה. זו האינפורמציה הכי שווה שיש." },
          { id: "v1.4", t: "5 משלמים שמשתמשים 4 שבועות ברצף", n: "זה שער קומה 0 של תוכנית המיליון." },
          { id: "v1.5", t: "לכתוב משפט אחד ברור: למה ההורים שנשארו — נשארו", n: "המשפט הזה הוא הפרסומת הראשונה שלך." },
        ],
      },
      {
        id: "v-product",
        title: "מוצר — לשבור את השוק מול Brilliant",
        time: "6–10 שבועות (במקביל)",
        why: "Brilliant מכרו קורסים יפים למבוגרים באנגלית. Matific ו-10monkeys עושים תרגול גיימיפיקציה. אף אחד מהם לא נותן לילד ישראלי מורה פרטי שמדבר עברית, מכיר את תוכנית הלימודים שלו, וזוכר אותו משיעור לשיעור. זה החפיר שלך — תעמיק אותו.",
        advice: "אל תתחרה ב-Brilliant על יופי של אנימציות — תנצח אותם על אינטימיות: המורה יודע שקוראים לו יואב, שאתמול התבלבל בעשרות, ושעכשיו הזמן לחזק שברים. ההורה מקבל את זה בדוח שבועי. אין להם את זה, ולא יהיה בקרוב.",
        compare: {
          head: ["", "vela", "Brilliant", "Matific/אחרים"],
          rows: [
            ["מורה חי בקול", ["yes", "כן — שיחה אמיתית"], ["no", "אין"], ["no", "אין"]],
            ["עברית + תוכנית לימודים ישראלית", ["yes", "מלא"], ["no", "אנגלית בלבד"], ["part", "חלקי, תרגום"]],
            ["זיכרון אישי לכל ילד", ["yes", "לכל תת-נושא"], ["no", "מסלול גנרי"], ["part", "רמות בלבד"]],
            ["דוח הורה + חוות דעת צוות", ["yes", "מורה/פסיכולוג/מתמטיקאי"], ["no", "אין"], ["part", "בסיסי"]],
            ["גילאים", ["yes", "יסודי א׳–ו׳"], ["no", "13+ בפועל"], ["yes", "יסודי"]],
          ],
        },
        goals: [
          { id: "v2.1", t: "לסגור חוויית 'שיעור ראשון מושלם' — מהרשמה ועד וואו תוך 3 דקות", n: "הרושם הראשון מוכר את המנוי. לבדוק עם ילד אמיתי בסטופר." },
          { id: "v2.2", t: "יציבות קול: שהדיבור עובד ב-95% מהניסיונות גם בענן", n: "הקול הוא ההבדל מהמתחרים — הוא חייב להרגיש קסם, לא הגרלה." },
          { id: "v2.3", t: "דוח הורה שבועי אוטומטי במייל/וואטסאפ", n: "ההורה משלם — ההורה חייב לראות ערך כל שבוע בלי להיכנס לאתר." },
          { id: "v2.4", t: "מסך התקדמות לילד עם רצף ימים ופרסים קטנים", n: "הסיבה שהילד מבקש לחזור = הסיבה שההורה לא מבטל." },
          { id: "v2.5", t: "וידאו-דמו 60 שניות של ילד מדבר עם המורה", n: "הנשק השיווקי החזק ביותר שלך. חובה לפני קמפיין." },
        ],
      },
      {
        id: "v-content",
        title: "תוכן — עומק לכיתות א׳–ו׳",
        time: "8–12 שבועות, מדורג",
        why: "הורה שמשלם מצפה שכל מה שהילד לומד בבית הספר — קיים אצלך. היום יש בסיס טוב לכיתות הנמוכות; העומק צריך לגדול לפי איפה שהמשתמשים האמיתיים נמצאים, לא לפי הסדר שכיף לבנות.",
        advice: "תבנה תוכן לפי הכיתה של 10 המשלמים הראשונים — קודם. אם רובם כיתה ג', כיתה ג' צריכה להיות מושלמת לפני שנוגעים בכיתה ו'. שיעורי-הזהב (המערכים שנבנו בשיעורים אמיתיים) הם נכס — כל שיעור טוב שנשמר חוסך AI ומשפר איכות.",
        goals: [
          { id: "v3.1", t: "מיפוי: אילו נושאים חסרים לכיתות של המשתמשים הפעילים", n: "לפי בקשות אמיתיות, לא לפי הספר." },
          { id: "v3.2", t: "בנק שאלות: 150+ שאלות איכותיות לכל כיתה פעילה", n: "דרך מסך התוכן באדמין — כבר בנוי." },
          { id: "v3.3", t: "מסלול שיעורים מלא לנושא הכי מבוקש בכל כיתה פעילה", n: "מערכי-השיעור הם ההבדל בין תרגול לבין הוראה." },
          { id: "v3.4", t: "20 שיעורי-זהב שמורים ומאושרים", n: "הספרייה שמלמדת בלי טוקנים." },
        ],
      },
      {
        id: "v-pricing",
        title: "תמחור — ההמלצה והמדרגות",
        time: "החלטה: שבוע · עדכון כל רבעון",
        why: "מורה פרטי בישראל עולה ₪120–200 לשיעור בודד. vela נותנת מורה זמין כל יום. המחיר צריך לשדר 'חלופה רצינית למורה פרטי במחיר של שיעור אחד בחודש' — לא 'עוד אפליקציה ב-₪20'.",
        advice: "ההמלצה שלי: השקה ₪39 (עשרת הראשונים, לכל החיים) → ₪69 מחיר היכרות → ₪99 מחיר מלא אחרי 50 משלמים, עם עוגן שנתי (₪790/שנה = חודשיים מתנה) ותוכנית אחים (ילד שני 50%). כל מדרגה עולה רק כשיש ביקוש מוכח — הוותיקים שומרים מחיר, הם השגרירים.",
        numbers: [
          { v: "₪39", k: "עשרת הראשונים" },
          { v: "₪69", k: "היכרות (עד 50 משלמים)" },
          { v: "₪99", k: "מחיר מלא" },
          { v: "₪790", k: "שנתי (חודשיים מתנה)" },
        ],
        goals: [
          { id: "v4.1", t: "לקבוע את שלוש המדרגות ולכתוב אותן בעמוד הבית", n: "שקיפות מוכרת. 'המחיר יעלה' זה מאיץ החלטה אמיתי." },
          { id: "v4.2", t: "לחבר סליקה (Grow/משולם/Stripe) עם ניסיון חינם 7 ימים בלי כרטיס", n: "כרטיס-לפני-ניסיון הורג המרות אצל הורים חשדניים." },
          { id: "v4.3", t: "תוכנית אחים — ילד שני ב-50%", n: "משפחה עם 2-3 ילדים = הלקוח הכי רווחי ויציב." },
        ],
      },
      {
        id: "v-marketing",
        title: "שיווק ופרסום — המסלול המלא",
        time: "מתמשך · קמפיין ראשון אחרי 10 משלמים",
        why: "פרסום ממומן לפני שיש הוכחת-נשארות = לשרוף כסף. קודם אורגני וסיפורים אמיתיים, אחר-כך ממומן על הקריאייטיב שהוכיח את עצמו.",
        advice: "מסלול הפרסום: (שלב א) תיעוד אמיתי — אמא מצלמת את הילד מדבר עם vela, אתה מפרסם בקבוצות הורים. (שלב ב) עמוד טיקטוק/אינסטגרם עם קטעי 'הילד שואל — vela עונה' — הקול הוא הכוכב. (שלב ג) קמפיין מטא ממוקד אמהות 28–45 בישראל, תקציב ניסיון ₪1,500, על 3 גרסאות של וידאו-הדמו. (שלב ד) שת\"פ מורים פרטיים ומורות-אם משפיעניות — 20% עמלה. יצירת הפרסומות: אני כותב תסריטים, אתה מצלם בטלפון — אותנטי מנצח מלוטש אצל הורים.",
        goals: [
          { id: "v5.1", t: "לכתוב 5 תסריטי וידאו קצרים (הוק → בעיה → vela עונה בקול → תוצאה)", n: "אני אכתוב איתך — תבקש." },
          { id: "v5.2", t: "לצלם 3 סרטונים אמיתיים עם ילדים (באישור הורים)", n: "טלפון ביד, אור טוב, קול ברור. זהו." },
          { id: "v5.3", t: "לפתוח עמוד אינסטגרם/טיקטוק ולפרסם 3 פעמים בשבוע חודש ברצף", n: "עקביות > ויראליות. האלגוריתם מתגמל התמדה." },
          { id: "v5.4", t: "פוסט בקבוצת הורים יישובית אחת בשבוע — עם סיפור, לא מודעה", n: "'הילד שלי התחיל לפתור לבד' ממיר פי 10 מ'הנחה 20%'." },
          { id: "v5.5", t: "קמפיין מטא ראשון ₪1,500 על הקריאייטיב המנצח", n: "רק אחרי 10 משלמים. יעד: עלות רכישה מתחת ל-₪150." },
          { id: "v5.6", t: "לגייס 2 מורים פרטיים כשותפי-עמלה (20%)", n: "יש להם את האמון של ההורים שאתה צריך." },
        ],
      },
      {
        id: "v-support",
        title: "שירות לקוחות והורים",
        time: "הקמה: שבוע · שוטף: שעה ביום",
        why: "בשלב הזה השירות הוא לא עלות — הוא מחקר השוק הכי טוב שלך, ומכונת ההמלצות. הורה שקיבל תשובה תוך שעה מספר לחברות.",
        advice: "וואטסאפ עסקי אחד, אתה עונה אישית, עד 24 שעות תגובה (בפועל: שעה). כל תקלה שחוזרת פעמיים נכנסת לתור התיקונים לפני כל פיצ'ר. פעם בחודש — הודעה אישית לכל הורה משלם: 'ראיתי שיואב התקדם בכפל, שווה לחזק שברים'. זה שירות שאי-אפשר לקנות בכסף.",
        goals: [
          { id: "v6.1", t: "וואטסאפ עסקי + מענה מהיר עם 5 תשובות מוכנות", n: "שאלות נפוצות: מחיר, ביטול, איך עובד הקול, גילאים, אחים." },
          { id: "v6.2", t: "עמוד שאלות-נפוצות קצר באתר", n: "חוסך 50% מהפניות." },
          { id: "v6.3", t: "הודעה חודשית אישית לכל הורה משלם", n: "שימור = הכנסה. ביטול שנמנע שווה כמו לקוח חדש." },
        ],
      },
      {
        id: "v-infra",
        title: "תשתית — חברה מושלמת",
        time: "הקמה: 2–3 שבועות · תחזוקה: שעה בשבוע",
        why: "עסק שגובה כסף מהורים חייב להיראות ולהתנהג כמו חברה אמיתית: מייל מסודר, אבטחת מידע של ילדים, גיבויים שעובדים, ומסמכים שמוכנים ליום שבו משקיע או בית ספר יבקשו לראות אותם.",
        advice: "לא צריך מערכות יקרות — צריך סדר: דומיין אחד, מייל עסקי אחד, מסמך סדור אחד. אבטחת מידע של ילדים היא לא פיצ'ר — היא תנאי קיום: דליפה אחת הורסת את המותג לתמיד. ומשקיעים: לא מגייסים עכשיו, אבל בונים את חדר-הנתונים מהיום — כי ההזדמנות מגיעה בלי התראה.",
        goals: [
          { id: "v9.1", t: "דומיין + מייל עסקי מסודר (hello@ / support@) עם חתימה אחידה", n: "מייל @gmail הורג אמון של הורה משלם." },
          { id: "v9.2", t: "אבטחת מידע: HTTPS מלא, הצפנת סיסמאות, הרשאות מינימום, מחיקת מידע לפי בקשה", n: "מידע של ילדים = הרגישות הגבוהה ביותר שיש." },
          { id: "v9.3", t: "גיבוי אוטומטי יומי + תרגול שחזור אחד מוצלח", n: "גיבוי שלא שוחזר פעם אחת — לא קיים." },
          { id: "v9.4", t: "מדיניות פרטיות ותקנון בעברית פשוטה + הסכמת הורים מפורשת", n: "חובה חוקית מול קטינים — וגם כלי אמון מול הורים." },
          { id: "v9.5", t: "חדר-נתונים למשקיעים: One-Pager, מצגת 10 שקפים, טבלת מדדים חיה", n: "מתעדכן אחת לחודש. ההזדמנות לא מחכה שתתארגן." },
          { id: "v9.6", t: "הנהלת חשבונות מסודרת: עוסק/חברה, חשבוניות אוטומטיות, חשבון בנק נפרד", n: "מהשקל הראשון — כדי שהמספרים יהיו אמת." },
        ],
      },
      {
        id: "v-expand",
        title: "גלובלי או משרד החינוך — שער ההכרעה",
        time: "החלטה אחרי ₪30K MRR",
        why: "שני הכיוונים אמיתיים אבל גוזלים הכל: גלובלי = לתרגם את כל חוויית הקול לאנגלית ולהתחרות בענקים; משרד החינוך = מכרזים, גפ\"ן, ומכירה איטית לבתי ספר. ההכרעה נכונה רק כשישראל-בית עובדת לבד.",
        advice: "ההמלצה שלי: קודם ₪30K MRR מהורים ישראלים — זו הליבה. במקביל, בעלות אפסית: פיילוט עם בית ספר אחד דרך קשר אישי (המורה משתמשת בכיתה, אתה לומד), ורישום מוקדם לזירת גפ\"ן. ההכרעה גלובלי/חינוך תיפול על בסיס נתונים — לא חלום. אינטואיציה שלי: הקול העברי הוא חפיר מקומי; גלובלי ידרוש שכתוב — לכן מיצוי ישראל קודם.",
        goals: [
          { id: "v7.1", t: "פיילוט לא-רשמי עם מורה אחת בבית ספר אחד", n: "דרך קשר אישי. ללמוד איך זה נראה בכיתה." },
          { id: "v7.2", t: "לבדוק דרישות רישום לזירת גפ\"ן (הרכש הדיגיטלי של משרד החינוך)", n: "תהליך ארוך — להתחיל מוקדם, בלי לבנות סביבו." },
          { id: "v7.3", t: "החלטת הכרעה כתובה: גלובלי / חינוך / העמקה — אחרי ₪30K MRR", n: "עם הנתונים על השולחן. לא לפני." },
        ],
      },
      {
        id: "v-breakthrough",
        title: "אסטרטגיית הפריצה",
        time: "המצפן הקבוע",
        why: "אין טריק אחד גאוני שפורץ שוק. יש לולאה אחת שמזינה את עצמה — וכשמריצים אותה בעקביות, היא נראית מבחוץ כמו קסם.",
        advice: "הלולאה של vela: הקול מייצר רגע-וואו ← רגע-הוואו מצולם ומופץ (הורים משתפים ילד שלומד בשמחה) ← ההפצה מביאה ניסיון חינם עם 'בדיקת רמה ב-3 דקות' ← הדוח להורה מוכיח ערך כל שבוע ← ההורה מספר בקבוצה ← חוזר להתחלה. כל פרק בתוכנית הזו מחזק חוליה אחת בלולאה. המדד האחד שקובע: כמה הורים הביאו הורה אחר החודש.",
        goals: [
          { id: "v8.1", t: "'בדיקת רמה חינם ב-3 דקות' — כפתור בעמוד הבית, בלי הרשמה", n: "שער הכניסה הוויראלי: ההורה רואה את הקסם לפני שנתן מייל." },
          { id: "v8.2", t: "כפתור 'שתפו את הרגע' אחרי שיעור מוצלח", n: "לתפוס את ההורה ברגע הגאווה." },
          { id: "v8.3", t: "תוכנית חבר-מביא-חבר: חודש מתנה לשני הצדדים", n: "המנוע השקט של כל מוצר-הורים מצליח." },
          { id: "v8.4", t: "לעקוב חודשי: כמה מצטרפים הגיעו מהמלצה", n: "כשזה עובר 40% — יש לך מכונה." },
        ],
      },
    ],
  };

  const MILLION = {
    hero: {
      title: 'מדרגות ההון שלך<br><em class="gt-green">קומה אחרי קומה עד <span class="latin">$3M</span></em>',
      sub: "כל קומה היא מדרגת כסף עם שער מספרי בסופה. המנוע: vela. המשמר: שוק ההון. לחיצה על קומה יורדת לתוכנית העבודה שלה.",
      stats: [
        { v: "7–10", k: "שנים, תרחיש מוצלח" },
        { v: "6", k: "קומות · שער לכל אחת" },
        { v: "$3M", k: "יעד הון נקי" },
      ],
    },
    // מוצגות בבניין מלמעלה (5) למטה (0) — נבנות מלמטה במציאות
    floors: [
      {
        id: "m5", num: "5", name: "החופש — $3M נטו", gate: "שער: $3M הון נקי",
        time: "7–10 ש׳",
        why: "הקומה האחרונה לא נבנית מהעסק לבד — היא נבנית מהעסק ומשוק ההון ביחד. העסק מייצר; התיק שומר ומכפיל.",
        advice: "בקומה הזו ההחלטות הן של מנהל הון, לא של יזם: כמה מהרווח נשאר בעסק, כמה עובר לתיק מדדי, ומתי (אם בכלל) מוכרים את החברה. הכלל שליווה את כל הדרך — 25% מכל רווח לתיק — הוא מה שהופך $1M עסקי ל-$3M נטו.",
        numbers: [
          { v: "$3M", k: "הון נקי כולל" },
          { v: "25%", k: "מכל רווח → לתיק" },
          { v: "7%", k: "תשואה שנתית ממוצעת (מדדים)" },
        ],
        goals: [
          { id: "m5.1", t: "תיק השקעות מדדי פעיל עם הפקדה אוטומטית חודשית" },
          { id: "m5.2", t: "החלטת אקזיט/החזקה כתובה — עם מספרים, לא רגשות", n: "חברה עם ₪400K MRR שווה $8–15M במכפילים של התחום." },
          { id: "m5.3", t: "הון נקי $3M — הבניין הושלם 🏆" },
        ],
      },
      {
        id: "m4", num: "4", name: "ההון הראשון — $1M", gate: "שער: $1M הון אישי",
        time: "4–6 ש׳",
        why: "מכאן ההון האישי גדל משלושה מקורות במקביל: משכורת מהחברה, דיבידנדים מרווחים, והתיק שכבר צובר ריבית-דריבית.",
        advice: "הטעות בקומה הזו היא להגדיל הוצאות חיים במקום הון. המשכורת שלך עולה מדורג — אבל כל שקל דיבידנד מעל התקציב עובר לתיק. עסק עם ₪150K MRR ורווחיות 40% מייצר ₪60K לחודש פנויים — שנתיים כאלה עם תיק צומח = המיליון הראשון.",
        numbers: [
          { v: "₪150K", k: "MRR בקומה זו (~2,700 מנויים)" },
          { v: "40%", k: "רווחיות תפעולית" },
          { v: "$1M", k: "הון אישי בשער" },
        ],
        goals: [
          { id: "m4.1", t: "רווחיות תפעולית 40%+ שלושה רבעונים ברצף" },
          { id: "m4.2", t: "משכורת מסודרת + מדיניות דיבידנד כתובה" },
          { id: "m4.3", t: "צוות של 3–5 שמריץ את היומיום בלעדיך", n: "הון אמיתי = העסק לא תלוי בשעות שלך." },
          { id: "m4.4", t: "הון אישי $1M (תיק + מזומן + שווי אחזקה שמרני)" },
        ],
      },
      {
        id: "m3", num: "3", name: "מעבר לגבולות — $1M ARR", gate: "שער: $1M הכנסה שנתית",
        time: "3–4 ש׳",
        why: "כאן מתממשת ההכרעה מתוכנית vela: גלובלי (אנגלית) או עומק (משרד החינוך). $1M ARR = בערך ₪310K MRR — פי 3 מקומה 2. זה לא קורה מאותם ערוצים — זה קורה משוק חדש.",
        advice: "אם הנתונים בקומה 2 הראו שהקול העברי הוא הקסם — הכיוון הוא משרד החינוך ומוסדות (חוזה אחד = מאות תלמידים). אם ההורים הפרטיים הם המנוע — גלובלי דרך קהילות יהודיות/ישראליות בחו\"ל כגשר רך לאנגלית מלאה. ההחלטה כבר כתובה מהשער הקודם; כאן רק מבצעים אותה באגרסיביות.",
        numbers: [
          { v: "$1M", k: "ARR בשער" },
          { v: "≈5,600", k: "מנויים (או שווה-ערך מוסדי)" },
          { v: "1", k: "שוק חדש אחד — לא שלושה" },
        ],
        goals: [
          { id: "m3.1", t: "להוציא לפועל את החלטת הגלובלי/חינוך — תוכנית רבעונית", n: "שוק אחד חדש. פיזור הורג בשלב הזה." },
          { id: "m3.2", t: "עובד ראשון במשרה מלאה (תוכן או צמיחה)", n: "השעה שלך שווה יותר מהעלות שלו — זה הרגע לגייס." },
          { id: "m3.3", t: "מקור הכנסה שני פעיל (מוסדי או גיאוגרפי)" },
          { id: "m3.4", t: "$1M הכנסה שנתית — קצב רבעון אחרון" },
        ],
      },
      {
        id: "m2", num: "2", name: "המכונה — ₪100K MRR", gate: "שער: ₪100K לחודש",
        time: "2 ש׳",
        why: "מ-450 ל-1,800 מנויים. ההבדל בין קומה 1 ל-2: בקומה 1 אתה מוכר — בקומה 2 המערכת מוכרת: הלולאה הוויראלית, השותפים והקמפיינים עובדים גם כשאתה בבסיס.",
        advice: "פה הכסף מתחיל לעבוד בשבילך: 25% מכל רווח חודשי עובר אוטומטית לתיק מדדים — זו תחילת 'המשמר'. ובצד העסק: לשכפל רק את מה שהוכח — אם קבוצות ההורים הביאו 60% מהלקוחות, מכפילים שם, לא מנסים ערוץ חדש נוצץ.",
        numbers: [
          { v: "1,800", k: "מנויים" },
          { v: "₪100K", k: "MRR בשער" },
          { v: "< ₪150", k: "עלות רכישת לקוח" },
          { v: "25%", k: "מהרווח → לתיק, מתחיל כאן" },
        ],
        goals: [
          { id: "m2.1", t: "3 ערוצי רכישה עובדים במקביל (אורגני, ממומן, שותפים)" },
          { id: "m2.2", t: "נטישה חודשית מתחת ל-5%", n: "שימור הוא הכפלת-כוח: 5% במקום 10% = כמעט כפול לקוחות בסוף שנה." },
          { id: "m2.3", t: "עוזר/ת במיקור-חוץ לשירות ותוכן (10–20 שעות שבועיות)" },
          { id: "m2.4", t: "הפקדה אוטומטית ראשונה לתיק ההשקעות 🌱" },
          { id: "m2.5", t: "₪100K MRR חודשיים ברצף" },
        ],
      },
      {
        id: "m1", num: "1", name: "אחיזה בשוק — ₪30K MRR", gate: "שער: ₪30K לחודש",
        time: "4–12 ח׳",
        why: "זה היעד מהמסמך שלך — ₪30K MRR = בערך 450 מנויים בממוצע ₪69. כאן vela הופכת מ'פרויקט מבטיח' ל'עסק אמיתי שמפרנס'. כל תוכנית vela המבצעית חיה בתוך הקומה הזו.",
        advice: "450 מנויים זה 40 מצטרפים בחודש בממוצע עם נטישה נמוכה. המספר הזה לא בא מקמפיין אחד גדול — הוא בא מהלולאה: כל חודש קצת יותר סרטונים, קצת יותר המלצות, קצת פחות נטישה. הצבא מגביל שעות? הלולאה בנויה בדיוק בשביל זה — היא רצה גם בלעדיך.",
        numbers: [
          { v: "450", k: "מנויים" },
          { v: "₪30K", k: "MRR בשער" },
          { v: "≈₪22K", k: "נטו לחודש אחרי עלויות" },
          { v: "40", k: "מצטרפים בחודש בממוצע" },
        ],
        goals: [
          { id: "m1.1", t: "100 מנויים משלמים", n: "אבן הדרך הפסיכולוגית — מפה זה שכפול, לא המצאה." },
          { id: "m1.2", t: "הלולאה הוויראלית פעילה: 25%+ מהמצטרפים מהמלצות" },
          { id: "m1.3", t: "קמפיין ממומן רווחי (עלות רכישה < 3 חודשי מנוי)" },
          { id: "m1.4", t: "250 מנויים — חצי הדרך", n: "כאן בדרך כלל מגיעה התקיעה הראשונה. התשובה: שימור, לא עוד פרסום." },
          { id: "m1.5", t: "₪30K MRR חודשיים ברצף — השער נפתח 🚪" },
        ],
      },
      {
        id: "m0", num: "0", name: "ההוכחה — עשרה משלמים", gate: "שער: 5+ מחיר מלא, 4 שבועות רצוף",
        time: "1–3 ח׳",
        why: "קומת הקרקע. המוצר קיים — עכשיו מוכיחים שמישהו זר מוכן לשלם עליו כל חודש. בלי הקומה הזו, כל השאר ציור יפה.",
        advice: "זו הקומה שבה נמצאת כרגע כל תוכנית vela (הטאב השני למעלה) — האימות, 10 המשלמים, המחיר המוקדם. אל תנסה לדלג: מי שמדלג על קומה 0 בונה בניין באוויר. שלושה חודשים של אמת שחוסכים שנה של דשדוש.",
        numbers: [
          { v: "10", k: "משלמים" },
          { v: "₪39–69", k: "מחיר מוקדם" },
          { v: "4", k: "שבועות שימוש רצוף — התנאי" },
        ],
        goals: [
          { id: "m0.1", t: "10 ילדים בניסיון חינם מהמעגל הקרוב" },
          { id: "m0.2", t: "10 משלמים ראשונים (₪39 מוקדם)" },
          { id: "m0.3", t: "5+ משלמים מחיר מלא עם שימוש שבועי 4 שבועות רצופים" },
          { id: "m0.4", t: "משפט אחד ברור למה הם נשארים — כתוב ומוכח", n: "שער קומה 0 נפתח. עולים לקומה 1. 🚪" },
        ],
      },
    ],
  };

  /* ═══════════════════ מצב ותקשורת ═══════════════════ */
  let DONE = {};
  let curPlan = localStorage.getItem("vela-plan-tab") || "million";

  async function api(path, opts = {}) {
    const res = await fetch(path, {
      method: opts.method || "GET",
      headers: opts.body ? { "content-type": "application/json" } : {},
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      cache: "no-store",
    });
    let data = {};
    try { data = await res.json(); } catch {}
    if (res.status === 403) { showLogin(); throw new Error("forbidden"); }
    return { ok: res.ok, data };
  }
  function esc(s) {
    return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  /* ═══════════════════ אימות ═══════════════════ */
  const bootView = $("#bootView"), loginView = $("#loginView"), app = $("#app");
  function showLogin() { bootView.hidden = true; app.hidden = true; loginView.hidden = false; setTimeout(() => $("#planPw")?.focus(), 60); }
  function showApp() { bootView.hidden = true; loginView.hidden = true; app.hidden = false; }
  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const { ok, data } = await api("/api/admin/login", { method: "POST", body: { password: $("#planPw").value } });
    if (ok && data.ok) { $("#planPw").value = ""; start(); }
    else { const el = $("#loginErr"); el.textContent = data.error || "סיסמה שגויה"; el.hidden = false; }
  });
  async function checkAuth() {
    try {
      const { data } = await api("/api/admin/me");
      if (data.admin) start(); else showLogin();
    } catch { showLogin(); }
  }
  async function start() {
    const { data } = await api("/api/admin/plan");
    DONE = (data && data.done) || {};
    showApp();
    render();
  }

  /* ═══════════════════ רינדור ═══════════════════ */
  const main = $("#main");
  const switchEl = $("#planSwitch");

  function allGoals() {
    const v = VELA.chapters.flatMap((c) => c.goals);
    const m = MILLION.floors.flatMap((f) => f.goals);
    return [...v, ...m];
  }
  function renderTopProgress() {
    const all = allGoals();
    const done = all.filter((g) => DONE[g.id]).length;
    $("#topProgress").innerHTML = `<b>${done}</b> / ${all.length} הושלמו`;
  }
  function movePill() {
    const btn = switchEl.querySelector(`.switch__btn[data-plan="${curPlan}"]`);
    const pill = switchEl.querySelector(".switch__pill");
    if (!btn || !pill) return;
    // offsetLeft הוא פיזי — עובד זהה גם ב-RTL
    pill.style.left = `${btn.offsetLeft}px`;
    pill.style.width = `${btn.offsetWidth}px`;
    switchEl.querySelectorAll(".switch__btn").forEach((b) => b.classList.toggle("is-on", b.dataset.plan === curPlan));
  }
  switchEl.addEventListener("click", (e) => {
    const b = e.target.closest(".switch__btn");
    if (!b || b.dataset.plan === curPlan) return;
    curPlan = b.dataset.plan;
    localStorage.setItem("vela-plan-tab", curPlan);
    render();
    window.scrollTo({ top: 0 });
  });

  /* ─── סצנת הרקע של המיליון: ירח, כוכבים, הרים ודקלים בצבעים רגועים ─── */
  function palmSvg(cls) {
    return `<svg class="palm ${cls}" viewBox="0 0 140 170" aria-hidden="true">
      <path d="M72 168 C69 130 71 104 76 84 L68 82 C61 104 60 136 63 168 Z"/>
      <path d="M70 86 C52 66 28 60 10 70 C28 46 58 56 72 76 Z"/>
      <path d="M74 84 C60 58 40 44 20 44 C44 30 68 48 78 74 Z"/>
      <path d="M76 82 C74 54 84 34 102 26 C86 26 70 44 68 72 Z"/>
      <path d="M78 84 C94 62 118 54 134 62 C118 40 88 52 72 76 Z"/>
      <path d="M76 88 C96 76 120 78 132 90 C122 68 92 66 70 80 Z"/>
    </svg>`;
  }
  function sceneryHtml() {
    return `<div class="scenery" aria-hidden="true">
      <div class="skyglow"></div>
      <div class="stars"></div><div class="stars stars--2"></div>
      <div class="moon fx-moon" style="animation-delay:.2s"></div>
      <div class="mtn mtn--1"></div><div class="mtn mtn--2"></div>
      ${palmSvg("palm--l")}${palmSvg("palm--r")}
    </div>`;
  }

  /* ─── הווילה: בניין אמיתי — קומות ברוחב אחיד, כרכובים, גג-גינה ופנטהאוז ─── */
  function floorInner(id) {
    const wins = (cls, n, extra = "") => Array.from({ length: n }, (_, i) =>
      `<span class="bigwin ${cls}${extra && [0, 2, 4].includes(i) ? " " + extra : ""}"></span>`
    ).join("");
    switch (id) {
      case "m5": return `<div class="roofgarden"><span class="g-tree"></span><span class="g-bush"></span><span class="g-bush g-bush--2"></span></div><div class="penthouse"></div><div class="roofdeck"></div>`;
      case "m4": return wins("", 5);
      case "m3": return wins("", 5, "bigwin--lit");
      case "m2": return `<span class="col"></span>${wins("bigwin--m2", 4)}<span class="col"></span>`;
      case "m1": return wins("bigwin--gold", 6);
      case "m0": return `<span class="gwin"></span><span class="gwin"></span><div class="ddoor"><span></span><span></span></div><span class="gwin"></span><span class="gwin"></span>`;
      default: return "";
    }
  }
  function villaHtml() {
    const F = MILLION.floors;
    const rows = F.map((f, i) => {
      // הבנייה עולה מלמטה: הקומה התחתונה נכנסת ראשונה
      const d = (0.3 + (F.length - 1 - i) * 0.09).toFixed(2);
      const roof = f.id === "m5";
      return `<div class="vrow vrow--${esc(f.id)}${roof ? " vrow--roof" : ""}" data-target="${esc(f.id)}" style="--fxd:${d}s" role="button" tabindex="0" aria-label="קומה ${esc(f.num)} — ${esc(f.name)}">
        <div class="slab ${roof ? "slab--roof" : `slab--${esc(f.id)}`}${!roof && f.id !== "m0" ? " has-ledge" : ""}">${floorInner(f.id)}</div>
        <button class="vlabel" tabindex="-1">
          <span class="vlabel__num${roof ? " vlabel__num--roof" : ""}">${roof ? "גג" : esc(f.num)}</span>
          <span class="vlabel__tx"><b>${esc(f.name)}</b><small>${esc(f.gate.replace("שער: ", ""))} · ${esc(f.time)}</small></span>
          <span class="vlabel__arr">←</span>
        </button>
      </div>`;
    }).join("");
    return `<div class="villa" id="villaEl">${rows}<div class="villa__base"></div></div>`;
  }

  /* ─── הרקע הקבוע של vela: מתמטיקה זוהרת על כל המסך ─── */
  const MATH_GLYPHS = [
    { g: "π", x: "8vw", y: "16vh", s: 34, c: "mint", d: "0s" },
    { g: "√x", x: "18vw", y: "64vh", s: 24, c: "gold", d: ".8s" },
    { g: "∞", x: "6vw", y: "80vh", s: 30, c: "mint", d: "1.7s", dim: 1 },
    { g: "×", x: "27vw", y: "32vh", s: 26, c: "gold", d: "1.2s" },
    { g: "½", x: "37vw", y: "76vh", s: 26, c: "mint", d: ".4s" },
    { g: "+", x: "47vw", y: "60vh", s: 30, c: "mint", d: "2.2s", dim: 1 },
    { g: "8", x: "55vw", y: "80vh", s: 26, c: "gold", d: "1.5s" },
    { g: "=", x: "64vw", y: "68vh", s: 28, c: "mint", d: ".6s" },
    { g: "x²", x: "73vw", y: "28vh", s: 24, c: "gold", d: "1.9s" },
    { g: "÷", x: "83vw", y: "58vh", s: 28, c: "mint", d: "2.6s" },
    { g: "Σ", x: "90vw", y: "32vh", s: 28, c: "gold", d: ".9s" },
    { g: "−", x: "88vw", y: "78vh", s: 26, c: "gold", d: "2.1s", dim: 1 },
    { g: "9", x: "14vw", y: "40vh", s: 22, c: "gold", d: ".3s", dim: 1 },
    { g: "√", x: "58vw", y: "13vh", s: 26, c: "mint", d: "1.1s", dim: 1 },
    { g: "π", x: "78vw", y: "86vh", s: 22, c: "mint", d: "2.4s", dim: 1 },
    { g: "3", x: "33vw", y: "12vh", s: 22, c: "gold", d: "1.4s", dim: 1 },
    { g: "∞", x: "94vw", y: "12vh", s: 24, c: "mint", d: ".7s" },
    { g: "7", x: "4vw", y: "50vh", s: 22, c: "gold", d: "1.8s", dim: 1 },
  ];
  function fixedbgHtml() {
    const glyphs = MATH_GLYPHS.map((m) =>
      `<span class="mg mg--${m.c}${m.dim ? " mg--dim" : ""} latin" style="inset-inline-start:${m.x};top:${m.y};font-size:${m.s}px;animation-delay:${m.d}">${esc(m.g)}</span>`
    ).join("");
    return `<div class="fixedbg" aria-hidden="true">
      <div class="skyfull"></div>
      <div class="stars"></div><div class="stars stars--2"></div>
      <div class="moon fx-moon" style="animation-delay:.2s"></div>
      ${glyphs}
    </div>`;
  }

  /* ─── עיצובי פרק מיוחדים: זהב (קומה 5) וכסף (קומה 4) ─── */
  function dubaiSvg() {
    return `<div class="dubai" aria-hidden="true"><svg viewBox="0 0 760 300" fill="rgba(255,205,110,.06)" stroke="#f4c46e" stroke-width="1.6" stroke-linejoin="round">
      <path d="M120 300 L120 202 Q120 190 132 190 L168 190 Q180 190 180 202 L180 300"/>
      <path d="M220 300 L220 160 L262 160 L262 300"/>
      <path d="M282 300 L282 234 L330 234 L330 300"/>
      <path d="M352 300 L352 214 L362 214 L362 156 L369 156 L369 104 L375 104 L375 62 L379 62 L381 18 L383 62 L387 62 L387 104 L393 104 L393 156 L400 156 L400 214 L410 214 L410 300"/>
      <line x1="381" y1="18" x2="381" y2="2" stroke-width="1.2"/>
      <path d="M430 300 L430 228 L478 228 L478 300"/>
      <path d="M498 300 L498 178 L540 158 L540 300"/>
      <path d="M560 300 L560 210 Q560 198 572 198 L604 198 Q616 198 616 210 L616 300"/>
      <line x1="60" y1="300" x2="700" y2="300" stroke-width="1.2" opacity="0.7"/>
    </svg></div>`;
  }
  function decoHtml(theme) {
    if (theme === "ch--gold") {
      return `<div class="ch-deco">${dubaiSvg()}
        <span class="fw fw--1"></span><span class="fw fw--2"></span><span class="fw fw--3"></span>
        <span class="spk" style="top:13%;inset-inline-end:9%">✦</span>
        <span class="spk" style="top:34%;inset-inline-start:6%;animation-delay:1.1s">✦</span>
        <span class="spk" style="bottom:40%;inset-inline-end:15%;animation-delay:2.1s">✦</span>
        <span class="spk" style="top:58%;inset-inline-start:24%;animation-delay:.6s">✦</span>
      </div>`;
    }
    if (theme === "ch--silver") {
      return `<div class="ch-deco">
        <span class="spk spk--s" style="top:15%;inset-inline-start:8%">✦</span>
        <span class="spk spk--s" style="bottom:22%;inset-inline-end:10%;animation-delay:1.4s">✦</span>
      </div>`;
    }
    return "";
  }

  /* ─── פרק ─── */
  function goalRow(g) {
    const done = !!DONE[g.id];
    return `<div class="goal ${done ? "is-done" : ""}" data-goal="${esc(g.id)}">
      <button class="goal__check" aria-label="סימון הושלם" aria-pressed="${done}">✓</button>
      <div class="goal__body">
        <span class="goal__text">${esc(g.t)}</span>
        ${g.n ? `<span class="goal__note">${esc(g.n)}</span>` : ""}
      </div>
    </div>`;
  }
  const RING_C = (2 * Math.PI * 18);
  function ringHtml(goals) {
    const total = goals.length;
    const done = goals.filter((g) => DONE[g.id]).length;
    const p = total ? done / total : 0;
    return `<span class="ring ${p === 1 ? "is-full" : ""}" title="התקדמות הפרק">
      <svg viewBox="0 0 44 44" aria-hidden="true">
        <circle class="ring__bg" cx="22" cy="22" r="18"></circle>
        <circle class="ring__fg" cx="22" cy="22" r="18" style="stroke-dasharray:${RING_C.toFixed(1)};stroke-dashoffset:${(RING_C * (1 - p)).toFixed(1)}"></circle>
      </svg>
      <span class="ring__in">${p === 1 ? "✓" : `${done}/${total}`}</span>
    </span>`;
  }
  function chapterProgress(goals) {
    const done = goals.filter((g) => DONE[g.id]).length;
    return goals.length ? Math.round((done / goals.length) * 100) : 0;
  }
  function chapterHtml(c, extra = "", theme = "") {
    const titleGrad = theme === "ch--gold" ? "gt-goldhot" : theme === "ch--silver" ? "gt-silver" : "gt-green";
    // כל חלק בפרק הוא יחידת-חשיפה (r) — נכנס בנפרד בגלילה, מדורג
    return `<section class="chapter ${theme}" id="${esc(c.id)}">
      ${decoHtml(theme)}
      <div class="chapter__head r">
        ${ringHtml(c.goals)}
        <div class="chapter__ht">
          <h2 class="chapter__title ${titleGrad}">${esc(c.title || c.name)}</h2>
          <div class="chapter__meta">
            ${c.time ? `<span class="chip">${esc(c.time)}</span>` : ""}
            ${c.gate ? `<span class="chip chip--gate">${esc(c.gate)}</span>` : ""}
          </div>
        </div>
      </div>
      ${c.why ? `<p class="chapter__why r">${c.why}</p>` : ""}
      ${extra ? `<div class="r">${extra}</div>` : ""}
      ${c.advice ? `<div class="advice r"><span class="advice__tag">ההמלצה שלי</span>${c.advice}</div>` : ""}
      ${c.numbers ? `<div class="numbers r">${c.numbers.map((n) => `<div class="num"><div class="num__v gt-gold">${esc(n.v)}</div><div class="num__k">${esc(n.k)}</div></div>`).join("")}</div>` : ""}
      <div class="goals">${c.goals.map((g) => `<div class="r">${goalRow(g)}</div>`).join("")}</div>
      <div class="chapter__bar r"><div class="chapter__fill" style="width:${chapterProgress(c.goals)}%"></div></div>
    </section>`;
  }
  function compareHtml(cmp) {
    if (!cmp) return "";
    const mark = (cell) => `<span class="${cell[0]}">${cell[0] === "yes" ? "✓ " : cell[0] === "no" ? "✗ " : "◐ "}${esc(cell[1])}</span>`;
    return `<div class="tablewrap"><table class="compare">
      <thead><tr>${cmp.head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>
      <tbody>${cmp.rows.map((r) => `<tr><td>${esc(r[0])}</td><td>${mark(r[1])}</td><td>${mark(r[2])}</td><td>${mark(r[3])}</td></tr>`).join("")}</tbody>
    </table></div>`;
  }

  function renderMillion() {
    const h = MILLION.hero;
    // הפרקים: מלמטה (0) למעלה (5) — סדר הבנייה; 4=כסף, 5=זהב
    const chapters = [...MILLION.floors].reverse().map((f) => {
      const theme = f.id === "m5" ? "ch--gold" : f.id === "m4" ? "ch--silver" : "";
      return chapterHtml({ ...f, title: `קומה ${f.num} · ${f.name}` }, "", theme);
    }).join("");
    main.innerHTML = `
      <section class="heroM" id="heroM">
        <div class="heroM__sticky">
          ${sceneryHtml()}
          <div class="heroM__head" id="heroHead">
            <h1 class="hero__title fx-up" style="animation-delay:.22s">${h.title}</h1>
            <p class="hero__sub fx-up" style="animation-delay:.42s">${esc(h.sub)}</p>
            <div class="hero__stats">${h.stats.map((s, i) => `<div class="hstat fx-up" style="animation-delay:${(0.56 + i * 0.12).toFixed(2)}s"><div class="hstat__v gt-gold">${esc(s.v)}</div><div class="hstat__k">${esc(s.k)}</div></div>`).join("")}</div>
            <div class="hero__hint fx-up" style="animation-delay:.95s">גלילה: הווילה עוברת למרכז וכל קומה מקבלת שם ↓</div>
          </div>
          <div class="heroM__stage">${villaHtml()}</div>
        </div>
      </section>
      <div class="earth"><div class="chapters">${chapters}
        <p class="smallnote r">ההנחות: מנוי ממוצע ₪69/חודש · נטו ≈ ₪55 אחרי מע"מ ועמלות · עלות AI ≈ ₪8–15 לתלמיד פעיל · תשואת מדדים 7% שנתי ממוצע. המספרים משוערים — מתעדכנים מול המציאות בכל שער.</p>
      </div></div>`;
    wire();
  }

  function renderVela() {
    const h = VELA.hero;
    const chapters = VELA.chapters.map((c) => chapterHtml(c, c.compare ? compareHtml(c.compare) : "")).join("");
    main.innerHTML = `
      ${fixedbgHtml()}
      <section class="hero--clear">
        <div class="hero__head">
          <h1 class="hero__title fx-up" style="animation-delay:.2s">${h.title}</h1>
          <p class="hero__sub fx-up" style="animation-delay:.42s">${h.sub}</p>
          <div class="hero__stats">${h.stats.map((s, i) => `<div class="hstat fx-up" style="animation-delay:${(0.58 + i * 0.12).toFixed(2)}s"><div class="hstat__v gt-gold">${esc(s.v)}</div><div class="hstat__k">${esc(s.k)}</div></div>`).join("")}</div>
        </div>
      </section>
      <div class="earth earth--clear"><div class="chapters">${chapters}
        <p class="smallnote r">תוכנית vela היא קומות 0–1 של תוכנית המיליון: כשנפתח שער ₪30K — עוברים לטאב השני וממשיכים לטפס.</p>
      </div></div>`;
    wire();
  }

  /* ─── כוריאוגרפיית הגלילה של המיליון: הכותרת עולה ונעלמת,
         הווילה עוברת למרכז, ותוויות הקומות נגלות אחת-אחת ─── */
  const SCRUB = { hero: null, head: null, villa: null, labels: [], range: 1, on: false, vh: 0 };
  function setupScrub() {
    SCRUB.hero = document.getElementById("heroM");
    SCRUB.head = document.getElementById("heroHead");
    SCRUB.villa = document.getElementById("villaEl");
    SCRUB.labels = SCRUB.hero ? [...SCRUB.hero.querySelectorAll(".vlabel")] : [];
    measureScrub();
    applyScrub();
  }
  function measureScrub() {
    if (!SCRUB.hero) { SCRUB.on = false; return; }
    const vh = window.innerHeight;
    SCRUB.vh = vh;
    SCRUB.range = Math.max(1, SCRUB.hero.offsetHeight - vh);
    SCRUB.on = window.matchMedia("(min-width: 900px)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (SCRUB.villa) SCRUB.villa.style.setProperty("--vs", Math.min(1, (vh - 150) / 660).toFixed(3));
  }
  function applyScrub() {
    if (!SCRUB.hero || !SCRUB.head || !SCRUB.villa) return;
    if (!SCRUB.on) {
      SCRUB.head.style.transform = ""; SCRUB.head.style.opacity = ""; SCRUB.head.style.pointerEvents = "";
      SCRUB.villa.style.removeProperty("--vx");
      SCRUB.labels.forEach((l) => { l.style.opacity = ""; l.style.transform = ""; });
      return;
    }
    const p = Math.min(1, Math.max(0, window.scrollY / SCRUB.range));
    const e = p * p * (3 - 2 * p); // smoothstep — גלילה רכה
    SCRUB.head.style.transform = `translateY(calc(-50% - ${(e * 110).toFixed(1)}px))`;
    SCRUB.head.style.opacity = String(Math.max(0, 1 - e * 1.75).toFixed(3));
    SCRUB.head.style.pointerEvents = e > 0.5 ? "none" : "";
    SCRUB.villa.style.setProperty("--vx", `${(-(1 - e) * 22).toFixed(2)}vw`);
    SCRUB.labels.forEach((l, i) => {
      const o = Math.min(1, Math.max(0, (e - 0.42 - i * 0.055) / 0.22));
      l.style.opacity = o.toFixed(2);
      l.style.transform = `translate(${((1 - o) * -16).toFixed(1)}px, -50%)`;
    });
  }

  /* גלילה — סרגל עליון, טשטוש הרקע הקבוע, והכוריאוגרפיה */
  let scrollWired = false;
  function updateScroll() {
    document.body.classList.toggle("is-scrolled", window.scrollY > 70);
    // ריפוי-עצמי: אם גובה החלון השתנה מאז המדידה (מובייל/סרגל כתובת) — מודדים שוב
    if (SCRUB.hero && window.innerHeight !== SCRUB.vh) measureScrub();
    applyScrub();
  }
  function wireScroll() {
    if (scrollWired) { updateScroll(); return; }
    scrollWired = true;
    // עדכון ישיר באירוע הגלילה — העבודה קלה, וזה עמיד גם כשהדפדפן מצמצם rAF
    window.addEventListener("scroll", updateScroll, { passive: true });
    window.addEventListener("resize", () => { measureScrub(); applyScrub(); });
    updateScroll();
  }

  function updateRing(section, ids) {
    const ring = section.querySelector(".ring");
    if (!ring) return;
    const done = ids.filter((i) => DONE[i]).length;
    const p = ids.length ? done / ids.length : 0;
    ring.classList.toggle("is-full", p === 1);
    ring.querySelector(".ring__fg").style.strokeDashoffset = (RING_C * (1 - p)).toFixed(1);
    ring.querySelector(".ring__in").textContent = p === 1 ? "✓" : `${done}/${ids.length}`;
  }

  function wire() {
    // קומות → גלילה לפרק (עכבר + מקלדת)
    main.querySelectorAll(".vrow[data-target]").forEach((row) => {
      const go = () => document.getElementById(row.dataset.target)?.scrollIntoView({ behavior: "smooth", block: "start" });
      row.addEventListener("click", go);
      row.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
    });
    // סימוני ✓
    main.querySelectorAll(".goal__check").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const row = btn.closest(".goal");
        const id = row.dataset.goal;
        const value = !DONE[id];
        DONE[id] = value;
        if (!value) delete DONE[id];
        row.classList.toggle("is-done", value);
        btn.setAttribute("aria-pressed", String(value));
        // עדכון עיגול הפרק, הפס וההתקדמות הכללית
        const section = btn.closest(".chapter");
        const ids = [...section.querySelectorAll(".goal")].map((g) => g.dataset.goal);
        const doneCount = ids.filter((i) => DONE[i]).length;
        section.querySelector(".chapter__fill").style.width = `${Math.round((doneCount / ids.length) * 100)}%`;
        updateRing(section, ids);
        renderTopProgress();
        try { await api("/api/admin/plan/toggle", { method: "POST", body: { id, value } }); } catch { /* ישמר בפעם הבאה */ }
      })
    );
    // חשיפה מדורגת בגלילה: כל יחידה (r) נכנסת בנפרד, עם השהיה גדלה בתוך הפרק
    const motionOk = window.matchMedia && !window.matchMedia("(prefers-reduced-motion: reduce)").matches && "IntersectionObserver" in window;
    if (motionOk) {
      main.querySelectorAll(".chapter").forEach((ch) => {
        ch.querySelectorAll(".r").forEach((el, i) => {
          el.classList.add("pre");
          el.style.setProperty("--d", `${Math.min(i * 55, 440)}ms`);
        });
      });
      main.querySelectorAll(".smallnote.r").forEach((el) => el.classList.add("pre"));
      const io = new IntersectionObserver((ents) => {
        ents.forEach((en) => {
          if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
        });
      }, { rootMargin: "0px 0px -6% 0px" });
      main.querySelectorAll(".r.pre").forEach((el) => io.observe(el));
    }
    renderTopProgress();
    movePill();
    setupScrub();
    wireScroll();
  }

  function render() {
    if (curPlan === "million") renderMillion();
    else renderVela();
  }
  window.addEventListener("resize", movePill);

  checkAuth();
})();
