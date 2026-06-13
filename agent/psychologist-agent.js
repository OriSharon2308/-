/* eslint-disable no-console */

// הפסיכולוג: לא מדבר עם התלמיד. נותן למורה הנחיה רגשית לפי המצב והזיכרון.

/**
 * @param {{ student?: object, lastCorrect?: boolean|null, topicStats?: object, candidateTopics?: string[] }} params
 * @returns {{ advice: string, mood: string, focusTopic: string|null, focusReason: string }}
 */
function psychologistAdvise({
  student = {},
  lastCorrect = null,
  topicStats = {},
  candidateTopics = [],
} = {}) {
  const streak = student.streak ?? 0;
  const wrongStreak = student.wrongStreak ?? 0;
  const attempts = student.attempts ?? 0;

  let mood = "ניטרלי";
  let advice = "דבר/י בנימה חמה ומעודדת, צעד אחד בכל פעם.";

  if (wrongStreak >= 2) {
    mood = "מתוסכל";
    advice =
      "התלמיד טעה כמה פעמים ברצף — ייתכן תסכול. הרגיע/י, הזכר/י שטעויות הן חלק מלמידה, ופרק/י לצעד אחד קטן וברור.";
  } else if (streak >= 3) {
    mood = "בטוח";
    advice =
      "התלמיד ברצף הצלחות — חגוג/י בקצרה והצע/י אתגר מעט קשה יותר כדי לשמור על עניין.";
  } else if (lastCorrect === true) {
    mood = "חיובי";
    advice = "התלמיד הצליח — חזק/י את ההצלחה במשפט קצר וחיובי.";
  } else if (lastCorrect === false) {
    mood = "מתאמץ";
    advice = "התלמיד טעה — בלי שיפוטיות, כוון/י אותו לבדוק שלב מסוים מחדש.";
  } else if (attempts === 0) {
    mood = "מתחיל";
    advice = "פגישה ראשונה — קבל/י את התלמיד בחום והסבר/י איך זה עובד.";
  }

  // בחירת נושא לחיזוק: הנושא החלש ביותר עם מספיק ניסיונות
  let focusTopic = null;
  let focusReason = "";
  let worstAcc = 1.1;
  for (const t of candidateTopics) {
    const s = topicStats[t];
    if (s && s.attempts >= 2) {
      const acc = s.correct / s.attempts;
      if (acc < worstAcc) {
        worstAcc = acc;
        focusTopic = t;
      }
    }
  }
  if (focusTopic && worstAcc < 0.7) {
    focusReason = `התלמיד מתקשה ב"${focusTopic}" (${Math.round(worstAcc * 100)}% הצלחה) — כדאי לחזק שם.`;
  } else {
    focusTopic = null; // אין חולשה מובהקת — שהמתמטיקאי יבחר נושא רגיל
  }

  return { advice, mood, focusTopic, focusReason };
}

module.exports = { psychologistAdvise };
