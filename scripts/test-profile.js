/* eslint-disable no-console */

/**
 * בדיקת חלק א (זיכרון חכם) — להרצה ידנית:
 *   node scripts/test-profile.js
 *
 * מדגים שני דברים:
 *  1) מעברי הסטטוס בפרופיל המתומצת — דטרמיניסטי, בלי AI (לא התחיל → בתהליך
 *     → שולט / מתקשה), כולל סימון-וי ידני של המורה.
 *  2) Prompt Caching אמיתי מול Anthropic — שתי קריאות עם אותו system קבוע;
 *     הראשונה כותבת למטמון, השנייה קוראת ממנו (חיסכון). מודפס בשורות [cache].
 *
 * הבדיקה משתמשת ב-userId מדומה ומוחקת אותו בסוף — לא נוגעת בנתוני אמת.
 */

const path = require("path");
const { loadEnvFile } = require("../lib/env");
loadEnvFile(path.join(__dirname, ".."));

const profile = require("../lib/learner-profile");
const llm = require("../lib/llm");

const UID = "u-DEMO-profile-test";

function show(label) {
  const p = profile.get(UID);
  console.log(`\n── ${label} ──`);
  for (const [topic, t] of Object.entries(p.topics)) {
    const note = t.note ? ` — ${t.note}` : "";
    console.log(
      `   ${topic}: ${profile.STATUS_HE[t.status]}  (נכונות ${t.correct}/${t.attempts}, רצף ${t.streak}, רצף-טעויות ${t.wrongStreak})${note}`
    );
  }
}

// מדמה את ה-system של מורה אזור-הלמידה (דמות + שיטה + כלים + פרופיל הילד).
// ארוך בכוונה — זה ה"חלק הקבוע" שנכנס למטמון. גם תצוגה מקדימה של הפרומפט העתידי.
function buildStableTeacherSystem(profileText) {
  return [
    "את/ה Vela — מורה למתמטיקה חמה, סבלנית ומעודדת, לילדים דוברי עברית בכיתה א'.",
    "תפקידך באזור הלמידה: ללמד נושא מהבסיס, צעד אחר צעד, עד שהילד באמת שולט בו. לא ממהרים.",
    "",
    "שיטת ההוראה:",
    "1. פותחים בהסבר קצר וברור בגובה העיניים, במשפט אחד או שניים, בלי ז'רגון.",
    "2. מדגימים ויזואלית על הלוח המשותף — מציירים צורות, קווים, מספרים — כדי שהילד יראה ולא רק ישמע.",
    "3. מבקשים מהילד לנסות בעצמו על הלוח, ונותנים לו זמן. לא פותרים בשבילו.",
    "4. כשהילד טועה — בלי שיפוטיות. מזכירים שטעות היא חלק מלמידה, מפרקים לצעד קטן וברור יותר, ומנסים שוב.",
    "5. כשהילד מצליח — שמחים איתו במשפט קצר, ועוברים הלאה רק כשהוא מוכן.",
    "6. מדברים תמיד בעברית פשוטה ותקנית בלבד. בלי כוכביות או סימוני markdown. אימוג'י במשורה.",
    "",
    "כלי הלוח שעומדים לרשותך (קוראים להם דרך Tool Use, לא מתארים אותם במילים לילד):",
    "- draw_circle(x, y, r): מצייר עיגול במרכז (x,y) ברדיוס r. שימושי להמחשת כמויות, ספירה, או סימון.",
    "- draw_line(x1, y1, x2, y2): מצייר קו ישר בין שתי נקודות. שימושי לצירים, לחיבור, לחלוקה לקבוצות.",
    "- write_text(x, y, text): כותב טקסט/מספר בנקודה (x,y). שימושי לתיוג, לכתיבת מספרים או סימני פעולה.",
    "- clear_board(): מנקה את כל הלוח. משתמשים כשמתחילים שלב חדש כדי לא להעמיס.",
    "מערכת הצירים של הלוח: הראשית (0,0) בפינה הימנית-עליונה, x גדל שמאלה, y גדל למטה (מתאים ל-RTL).",
    "",
    "עקרונות שמירה על קשב הילד: צעד אחד בכל פעם, לוח לא עמוס, חזרה עדינה על מה שכבר נלמד, וחיבור הנושא לעולם של הילד (תפוחים, צעצועים, זמן).",
    "אסור: להציף את הילד במידע, להקדים את השלב הבא לפני שהנוכחי הובן, או להשתמש במונחים מופשטים בלי המחשה.",
    "",
    profileText || "פרופיל הילד: (עדיין אין מידע — זו ההיכרות הראשונה).",
  ].join("\n");
}

async function main() {
  profile.deleteUser(UID); // התחלה נקייה

  console.log("==================================================");
  console.log(" חלק 1: מעברי סטטוס בפרופיל (דטרמיניסטי, בלי AI)");
  console.log("==================================================");

  // שעון — 3 נכונות ברצף → "שולט"
  profile.record(UID, { topic: "שעון", correct: true });
  profile.record(UID, { topic: "שעון", correct: true });
  show('"שעון" אחרי 2 נכונות → אמור להיות "בתהליך"');
  profile.record(UID, { topic: "שעון", correct: true });
  show('"שעון" אחרי 3 נכונות ברצף → אמור להיות "שולט"');

  // חיבור תרגילים — 2 טעויות ברצף → "מתקשה"
  profile.record(UID, { topic: "חיבור תרגילים", correct: false });
  profile.record(UID, { topic: "חיבור תרגילים", correct: false, note: "מתבלבל במעבר עשרת" });
  show('"חיבור תרגילים" אחרי 2 טעויות → אמור להיות "מתקשה"');

  // המורה מחליט לסמן וי ידני (override)
  profile.setStatus(UID, "חיבור שאלות מילוליות", profile.STATUS.MASTERED, "הבין אחרי הסבר ויזואלי");
  show("אחרי שהמורה סימן וי ידני על תת-נושא");

  console.log("\n── הטקסט שמוזרק למורה בכל פנייה (toPromptText) ──\n");
  console.log(profile.toPromptText(UID));
  console.log("\n── נושאים שהילד מתקשה בהם (weakTopics) ──");
  console.log(profile.weakTopics(UID));

  console.log("\n==================================================");
  console.log(" חלק 2: Prompt Caching אמיתי מול Anthropic");
  console.log("==================================================");

  if (!llm.isEnabled()) {
    console.log("(AI כבוי — אין מפתח. מדלגים על הדגמת ה-caching.)");
  } else {
    const stableSystem = buildStableTeacherSystem(profile.toPromptText(UID));
    console.log(`אורך ה-system הקבוע: ${stableSystem.length} תווים (מטמון נכנס לפעולה מ~1024 טוקנים).`);
    console.log("\nקריאה 1 — כותבת למטמון (צפי: created>0, read=0):");
    await llm.complete({
      system: stableSystem,
      cacheSystem: true,
      maxTokens: 16,
      messages: [{ role: "user", content: "תגיד שלום במילה אחת." }],
    });
    console.log("\nקריאה 2 — אותו system בדיוק (צפי: read>0 = חיסכון):");
    await llm.complete({
      system: stableSystem,
      cacheSystem: true,
      maxTokens: 16,
      messages: [{ role: "user", content: "תגיד תודה במילה אחת." }],
    });
    console.log("\nשורות [cache] למעלה: בקריאה השנייה read>0 → שילמנו ~10% על ה-prefix במקום מחיר מלא.");
    console.log("(אם read=0: ה-prefix קצר מסף המטמון, או שעברו >5 דקות. במורה האמיתי ה-system ארוך מספיק.)");
  }

  profile.deleteUser(UID); // ניקוי — לא משאירים נתוני בדיקה
  console.log("\n✓ סיום. קובץ פרופיל הבדיקה נמחק.");
}

main().catch((e) => {
  console.error("שגיאה בבדיקה:", e);
  profile.deleteUser(UID);
  process.exit(1);
});
