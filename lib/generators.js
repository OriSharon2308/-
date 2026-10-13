/* eslint-disable no-console */

// מחוללי שאלות אלגוריתמיים — כל אחד מחזיר:
//   { text, answer(מספר), difficulty(1-10), hints, explanation, needsDiagram?, diagramData? }
// התשובה מחושבת בקוד ולכן תמיד נכונה. חינמי ומיידי.

function rint(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}
function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}
function uid() {
  return `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/* ---------- חיבור (סכום עד max) ---------- */
function addition(level = 1, p = {}) {
  const max = p.max || 20;
  const lv = clamp(level, 1, 5);

  // רמות 4–5: איבר חסר. זו אותה פעולה מהכיוון ההפוך — צריך להפוך את
  // התרגיל, לא רק לחשב אותו. בלי זה "רמה 4" הייתה שוב שלושה מחוברים
  // עם מספרים גדולים יותר, והבורר לא היה משנה כלום.
  if (lv >= 4) {
    const a = rint(1, Math.max(2, Math.floor(max * 0.6)));
    const b = rint(1, Math.max(1, max - a));
    if (lv === 4) {
      return {
        text: `${a} + ___ = ${a + b}`,
        answer: b,
        hints: ["שואלים: כמה צריך להוסיף כדי להגיע לסכום?", `אפשר גם לחסר: ${a + b} − ${a}.`],
        explanation: `${a} + ${b} = ${a + b}, ולכן במקום הריק צריך ${b}.`,
      };
    }
    const c = rint(1, Math.max(1, max - a - b));
    return {
      text: `${a} + ___ + ${c} = ${a + b + c}`,
      answer: b,
      hints: ["קודם מחברים את שני המספרים שכבר ידועים.", `${a} + ${c} = ${a + c} — וכמה חסר עד ${a + b + c}?`],
      explanation: `${a} + ${c} = ${a + c}, ועד ${a + b + c} חסר ${b}.`,
    };
  }

  if (lv === 3) {
    const a = rint(1, Math.max(2, max - 2));
    const b = rint(1, Math.max(1, max - a - 1));
    const c = rint(1, Math.max(1, max - a - b));
    return {
      text: `${a} + ${b} + ${c} = ?`,
      answer: a + b + c,
      hints: ["מחברים שניים קודם, ואז מוסיפים את השלישי.", `${a} + ${b} = ${a + b}, ועוד ${c}.`],
      explanation: `${a} + ${b} + ${c} = ${a + b + c}.`,
    };
  }

  // ההבדל בין רמה 1 לרמה 2 הוא הפריטה, לא גודל המספר: 8 + 7 קשה מ-40 + 50.
  let a = rint(1, Math.max(1, max - 1));
  let b = rint(1, Math.max(1, max - a));
  for (let i = 0; i < 80; i++) {
    const carry = (a % 10) + (b % 10) >= 10;
    if (lv === 1 ? !carry : carry) break;
    a = rint(1, Math.max(1, max - 1));
    b = rint(1, Math.max(1, max - a));
  }
  return {
    text: `${a} + ${b} = ?`,
    answer: a + b,
    hints: lv === 1
      ? ["אפשר לספור קדימה.", `התחל/י מ-${a} והוסף/י ${b}.`]
      : ["היחידות עוברות 10 — יש פריטה.", `חבר/י קודם את היחידות: ${a % 10} + ${b % 10}.`],
    explanation: `${a} + ${b} = ${a + b}.`,
  };
}

/* ---------- חיסור (בלי תוצאה שלילית) ---------- */
function subtraction(level = 1, p = {}) {
  const max = p.max || 20;
  const lv = clamp(level, 1, 5);

  if (lv >= 4) {
    const a = rint(Math.max(3, Math.floor(max / 2)), max);
    const b = rint(1, Math.max(1, a - 1));
    if (lv === 4) {
      return {
        text: `${a} − ___ = ${a - b}`,
        answer: b,
        hints: ["כמה ירד מהמספר הראשון?", `אפשר לחסר: ${a} − ${a - b}.`],
        explanation: `${a} − ${b} = ${a - b}, ולכן במקום הריק צריך ${b}.`,
      };
    }
    // המספר ההתחלתי חסר — הכיוון ההפוך לגמרי: כאן פותרים חיסור דווקא בחיבור.
    return {
      text: `___ − ${b} = ${a - b}`,
      answer: a,
      hints: ["כאן דווקא מחברים: מחזירים את מה שירד.", `${a - b} + ${b}.`],
      explanation: `${a - b} + ${b} = ${a}, ולכן המספר ההתחלתי הוא ${a}.`,
    };
  }

  if (lv === 3) {
    const a = rint(Math.max(3, Math.floor(max / 2)), max);
    const b = rint(1, Math.max(1, a - 2));
    const c = rint(1, Math.max(1, a - b));
    return {
      text: `${a} − ${b} − ${c} = ?`,
      answer: a - b - c,
      hints: ["מחסרים לפי הסדר, משמאל לימין.", `${a} − ${b} = ${a - b}, ומזה עוד ${c}.`],
      explanation: `${a} − ${b} − ${c} = ${a - b - c}.`,
    };
  }

  let a = rint(2, max);
  let b = rint(1, Math.max(1, a - 1));
  for (let i = 0; i < 80; i++) {
    const borrow = a % 10 < b % 10;
    if (lv === 1 ? !borrow : borrow) break;
    a = rint(2, max);
    b = rint(1, Math.max(1, a - 1));
  }
  return {
    text: `${a} − ${b} = ?`,
    answer: a - b,
    hints: lv === 1
      ? ["אפשר לספור אחורה.", `התחל/י מ-${a} והורד/י ${b}.`]
      : ["אין מספיק יחידות — צריך פריטה מהעשרות.", `${a} − ${b}: פרק/י עשרת אחת ל-10 יחידות.`],
    explanation: `${a} − ${b} = ${a - b}.`,
  };
}

/* ---------- חיבור וחיסור מעורב (עד max) ---------- */
function addSub100(level = 1, p = {}) {
  const max = p.max || 100;
  const lv = clamp(level, 1, 5);

  // רמות 1–2 נשענות על חיבור/חיסור עצמם — שם כבר יושב ההבדל בין
  // "בלי פריטה" ל"עם פריטה", ואין טעם לשכפל אותו.
  if (lv <= 2) return rint(0, 1) ? addition(lv, { max }) : subtraction(lv, { max });

  if (lv === 5) {
    const a = rint(10, max);
    const b = rint(1, Math.max(1, max - a));
    const c = rint(1, a + b);
    return {
      text: `${a} + ___ − ${c} = ${a + b - c}`,
      answer: b,
      hints: ["מה היה הסכום לפני שחיסרנו?", `${a + b - c} + ${c} = ${a + b}, ומזה פחות ${a}.`],
      explanation: `${a} + ${b} − ${c} = ${a + b - c}, ולכן החסר הוא ${b}.`,
    };
  }

  if (lv === 4) {
    if (rint(0, 1) === 0) {
      const a = rint(10, max);
      const b = rint(1, Math.max(1, max - a));
      const c = rint(1, a + b);
      return {
        text: `${a} + ${b} − ${c} = ?`,
        answer: a + b - c,
        hints: ["מחשבים משמאל לימין: קודם חיבור ואז חיסור.", `${a} + ${b} = ${a + b}, ופחות ${c}.`],
        explanation: `${a} + ${b} − ${c} = ${a + b - c}.`,
      };
    }
    const a = rint(10, max);
    const b = rint(1, a);
    const c = rint(1, Math.max(1, max - (a - b)));
    return {
      text: `${a} − ${b} + ${c} = ?`,
      answer: a - b + c,
      hints: ["מחשבים משמאל לימין: קודם חיסור ואז חיבור.", `${a} − ${b} = ${a - b}, ועוד ${c}.`],
      explanation: `${a} − ${b} + ${c} = ${a - b + c}.`,
    };
  }

  // רמה 3 — פעולה אחת, בטווח המלא
  if (rint(0, 1) === 0) {
    const a = rint(0, max);
    const b = rint(0, max - a);
    return {
      text: `${a} + ${b} = ?`,
      answer: a + b,
      hints: ["אפשר לפרק לעשרות ויחידות.", `${a} + ${b}.`],
      explanation: `${a} + ${b} = ${a + b}.`,
    };
  }
  let a = rint(0, max);
  let b = rint(0, max);
  if (b > a) [a, b] = [b, a];
  return {
    text: `${a} − ${b} = ?`,
    answer: a - b,
    hints: ["אפשר לפרק לעשרות.", `${a} − ${b}.`],
    explanation: `${a} − ${b} = ${a - b}.`,
  };
}

/* ---------- כפל ---------- */
function multiplication(level = 1, p = {}) {
  const max = p.max || 10;
  const lv = clamp(level, 1, 5);
  // twoDigit / max גדול = הכיתה כבר עובדת רב-ספרתית (ד׳–ה׳). בלי התנאי הזה
  // "רמה 3" בכיתה ב׳ הייתה קופצת לתרגיל דו-ספרתי שעוד לא נלמד.
  const big = !!p.twoDigit || max >= 12;

  if (lv === 1) {
    const easy = [2, 5, 10][rint(0, 2)];
    const other = rint(2, Math.max(2, max));
    const a = rint(0, 1) ? easy : other;
    const b = a === easy ? other : easy;
    return {
      text: `${a} × ${b} = ?`,
      answer: a * b,
      hints: [`כפל ב-${easy} זה קפיצות של ${easy}.`, `ספור/י: ${easy}, ${easy * 2}, ${easy * 3}…`],
      explanation: `${a} × ${b} = ${a * b}.`,
    };
  }

  if (lv === 2) {
    const a = rint(2, Math.max(3, max));
    const b = rint(2, Math.max(3, max));
    return {
      text: `${a} × ${b} = ?`,
      answer: a * b,
      hints: ["כפל הוא חיבור חוזר.", `${a} ועוד ${a}, ${b} פעמים.`],
      explanation: `${a} × ${b} = ${a * b}.`,
    };
  }

  if (lv === 3) {
    // בלי רב-ספרתי: העובדות הקשות של הלוח (6–9) — שם ילדים באמת נתקעים.
    const a = big ? rint(11, 30) : rint(6, Math.max(6, max));
    const b = big ? rint(3, 9) : rint(6, Math.max(6, max));
    return {
      text: `${a} × ${b} = ?`,
      answer: a * b,
      hints: big
        ? ["פרק/י את הדו-ספרתי לעשרות ויחידות.", `${Math.floor(a / 10) * 10} × ${b} ועוד ${a % 10} × ${b}.`]
        : ["אפשר להיעזר בעובדה קרובה שכבר ידועה.", `${a} × ${b - 1} ועוד ${a}.`],
      explanation: `${a} × ${b} = ${a * b}.`,
    };
  }

  if (lv === 4) {
    if (big) {
      const a = rint(12, 45);
      let b = rint(11, 25);
      if (b % 10 === 0) b += rint(1, 4); // מכפיל שמסתיים ב-0 הופך את רמז-הפירוק ל"ועוד × 0"
      return {
        text: `${a} × ${b} = ?`,
        answer: a * b,
        hints: ["מפרקים את המכפיל לעשרות ויחידות.", `${a} × ${Math.floor(b / 10) * 10} ועוד ${a} × ${b % 10}.`],
        explanation: `${a} × ${Math.floor(b / 10) * 10} + ${a} × ${b % 10} = ${a * b}.`,
      };
    }
    const a = rint(3, Math.max(4, max));
    const b = rint(3, Math.max(4, max));
    return {
      text: `${a} × ___ = ${a * b}`,
      answer: b,
      hints: ["כמה פעמים נכנס המספר הראשון בתוצאה?", `אפשר לחלק: ${a * b} ÷ ${a}.`],
      explanation: `${a} × ${b} = ${a * b}, ולכן החסר הוא ${b}.`,
    };
  }

  // רמה 5 — הגורם החסר. הפיכת-הפעולה היא הקפיצה האמיתית, לא עוד ספרה.
  const a = big ? rint(12, 40) : rint(4, Math.max(5, max));
  const b = big ? rint(4, 9) : rint(4, Math.max(5, max));
  return {
    text: `___ × ${b} = ${a * b}`,
    answer: a,
    hints: ["חילוק הוא ההפוך של כפל.", `${a * b} ÷ ${b}.`],
    explanation: `${a * b} ÷ ${b} = ${a}, ולכן החסר הוא ${a}.`,
  };
}

/* ---------- חילוק (ללא שארית) ---------- */
function division(level = 1, p = {}) {
  const max = p.max || 10;
  const lv = clamp(level, 1, 5);
  const big = !!p.twoDigit || max >= 12;

  if (lv === 1) {
    const b = [2, 5, 10][rint(0, 2)];
    const q = rint(2, Math.max(2, max));
    return {
      text: `${b * q} ÷ ${b} = ?`,
      answer: q,
      hints: [`מחלקים ל-${b} קבוצות שוות.`, `איזה מספר כפול ${b} נותן ${b * q}?`],
      explanation: `${b * q} ÷ ${b} = ${q} (כי ${b} × ${q} = ${b * q}).`,
    };
  }

  if (lv === 2) {
    const b = rint(2, Math.max(3, max));
    const q = rint(2, Math.max(3, max));
    return {
      text: `${b * q} ÷ ${b} = ?`,
      answer: q,
      hints: ["חילוק הוא ההפוך של כפל.", `איזה מספר כפול ${b} נותן ${b * q}?`],
      explanation: `${b * q} ÷ ${b} = ${q}.`,
    };
  }

  if (lv === 3) {
    const b = big ? rint(3, 9) : rint(6, Math.max(6, max));
    const q = big ? rint(11, 30) : rint(6, Math.max(6, max));
    return {
      text: `${b * q} ÷ ${b} = ?`,
      answer: q,
      hints: big
        ? ["מחלקים בית-בית: קודם העשרות ואז היחידות.", `כמה פעמים ${b} נכנס ב-${b * q}?`]
        : ["חפש/י בלוח הכפל של " + b + ".", `איזה מספר כפול ${b} נותן ${b * q}?`],
      explanation: `${b * q} ÷ ${b} = ${q}.`,
    };
  }

  if (lv === 4) {
    if (big) {
      const b = rint(3, 9);
      const q = rint(31, 120);
      return {
        text: `${b * q} ÷ ${b} = ?`,
        answer: q,
        hints: ["חילוק ארוך: מתחילים מהספרה השמאלית.", `כמה פעמים ${b} נכנס בכל בית?`],
        explanation: `${b * q} ÷ ${b} = ${q}.`,
      };
    }
    const b = rint(2, Math.max(3, max));
    const q = rint(2, Math.max(3, max));
    return {
      text: `${b * q} ÷ ___ = ${q}`,
      answer: b,
      hints: ["לכמה קבוצות חילקנו?", `${b * q} ÷ ${q}.`],
      explanation: `${b * q} ÷ ${b} = ${q}, ולכן החסר הוא ${b}.`,
    };
  }

  // רמה 5 — המחולק חסר: צריך לכפול כדי לפתור חילוק.
  const b = big ? rint(3, 9) : rint(2, Math.max(3, max));
  const q = big ? rint(12, 60) : rint(2, Math.max(3, max));
  return {
    text: `___ ÷ ${b} = ${q}`,
    answer: b * q,
    hints: ["כאן דווקא כופלים: מחזירים את מה שחולק.", `${q} × ${b}.`],
    explanation: `${q} × ${b} = ${b * q}, ולכן המחולק הוא ${b * q}.`,
  };
}

/* ---------- אחוזים ---------- */
function percent(level = 1, p = {}) {
  const lv = clamp(level, 1, 4);

  if (lv === 1) {
    const pct = [10, 50, 100][rint(0, 2)];
    const base = rint(2, 20) * 10;
    const ans = (base * pct) / 100;
    return {
      text: `כמה זה ${pct}% מתוך ${base}?`,
      answer: ans,
      hints: [
        pct === 50 ? "50% זה בדיוק חצי." : pct === 100 ? "100% זה הכול." : "10% זה חלוקה ל-10.",
        pct === 50 ? `${base} חלקי 2.` : pct === 100 ? `התשובה היא ${base} עצמו.` : `${base} חלקי 10.`,
      ],
      explanation: `${pct}% מתוך ${base} = ${ans}.`,
    };
  }

  if (lv === 2) {
    const pct = [20, 25, 75][rint(0, 2)];
    const base = rint(2, 12) * 20;
    const ans = (base * pct) / 100;
    return {
      text: `כמה זה ${pct}% מתוך ${base}?`,
      answer: ans,
      hints: [
        pct === 25 ? "25% זה רבע." : pct === 75 ? "75% זה שלושה רבעים." : "20% זה חמישית.",
        `קודם 10% = ${base / 10}, ומשם בונים ${pct}%.`,
      ],
      explanation: `${pct}% מתוך ${base} = ${base} × ${pct} ÷ 100 = ${ans}.`,
    };
  }

  if (lv === 3) {
    // כאן מחפשים את *השיעור* ולא את החלק — זו שאלה אחרת לגמרי, לא עוד תרגיל.
    const base = [20, 25, 40, 50, 80, 200][rint(0, 5)];
    const pct = [10, 20, 25, 50, 75][rint(0, 4)];
    const part = (base * pct) / 100;
    return {
      text: `${part} מתוך ${base} — כמה אחוז זה?`,
      answer: pct,
      hints: ["אחוז = החלק חלקי השלם, כפול 100.", `${part} ÷ ${base} × 100.`],
      explanation: `${part} ÷ ${base} = ${part / base}, וכפול 100 זה ${pct}%.`,
    };
  }

  // רמה 4 — השלם חסר: הכיוון ההפוך של אחוזים.
  const pct = [10, 20, 25, 50][rint(0, 3)];
  const base = rint(2, 10) * 20;
  const part = (base * pct) / 100;
  return {
    text: `${pct}% ממספר הם ${part}. מה המספר?`,
    answer: base,
    hints: [`אם ${pct}% הם ${part}, כמה הם 1%?`, `${part} ÷ ${pct} × 100.`],
    explanation: `1% = ${part / pct}, ולכן 100% = ${base}.`,
  };
}

/* ---------- משוואה (נעלם) ---------- */
function equation(level = 1) {
  const x = rint(1, 8 + level * 2);
  const a = rint(2, 4 + level);
  const b = rint(1, 8 + level * 2);
  const c = a * x + b;
  return {
    text: `${a}x + ${b} = ${c}. מצא/י את x`,
    answer: x,
    difficulty: clamp(4 + level, 1, 10),
    hints: ["מחסירים את b משני הצדדים.", "מחלקים ב-a."],
    explanation: `${a}x + ${b} = ${c} → ${a}x = ${c - b} → x = ${(c - b) / a}.`,
  };
}

/* ---------- מספרים: לפני / אחרי / באמצע ---------- */
function numberSeq(level = 1, p = {}) {
  const max = p.max || 100;
  const lv = clamp(level, 1, 3);

  // סוג-השאלה נקבע לפי הרמה ולא באקראי — אחרת "רמה 1" הייתה מגישה
  // לפעמים את השאלה הקשה ביותר, ובורר-הרמות לא היה אומר דבר.
  if (lv === 1) {
    const n = rint(0, max - 1);
    return {
      text: `מה המספר שבא אחרי ${n}?`,
      answer: n + 1,
      hints: ["מוסיפים 1.", "זה המספר הבא כשסופרים קדימה."],
      explanation: `אחרי ${n} בא ${n + 1}.`,
    };
  }

  if (lv === 2) {
    const n = rint(1, max);
    return {
      text: `מה המספר שבא לפני ${n}?`,
      answer: n - 1,
      hints: ["מורידים 1.", "זה המספר שאומרים רגע לפני, כשסופרים קדימה."],
      explanation: `לפני ${n} בא ${n - 1}.`,
    };
  }

  // רמה 3 — סדרה בקפיצות: צריך קודם לגלות את הכלל ורק אז להמשיך.
  const step = [2, 5, 10][rint(0, 2)];
  const start = rint(0, Math.max(0, max - step * 4));
  const seq = [start, start + step, start + step * 2];
  return {
    text: `המשך/המשיכי את הסדרה: ${seq.join(", ")}, ___`,
    answer: start + step * 3,
    hints: ["בדוק/בדקי כמה מוסיפים בין שני מספרים שכנים.", `כאן הקפיצה היא ${step}.`],
    explanation: `בכל צעד מוסיפים ${step}, ולכן אחרי ${seq[2]} בא ${start + step * 3}.`,
  };
}

/* ---------- צורות גאומטריות (כמה צלעות / קודקודים) ---------- */
// תערובת אקראית של כל הסוגים: מצולעים משוכללים (ריבוע, משולש שווה-צלעות...),
// משולשים מיוחדים (ישר-זווית, שווה-שוקיים), ומצולעים לא-סדירים (כולל קעורים).
const SHAPE_SIDE_POOL = [3, 3, 4, 4, 4, 5, 5, 6, 6, 7, 8];
const SHAPE_R = { s: 50, m: 62, l: 74 };
const SHAPE_SIZES = ["s", "m", "l"];
const CX = 110;
const CY = 88;
const fix = (n) => Number(n.toFixed(1));
const rnd = (min, max) => min + Math.random() * (max - min);

// סיבוב כל הנקודות סביב המרכז (גיוון כיוון לכל צורה)
function rotatePts(pts, deg) {
  const a = (deg * Math.PI) / 180;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  return pts.map(([x, y]) => {
    const dx = x - CX;
    const dy = y - CY;
    return [fix(CX + dx * ca - dy * sa), fix(CY + dx * sa + dy * ca)];
  });
}
// כיווץ אל תוך גבולות הציור (רדיוס מקסימלי בטוח), שומר פרופורציה
function fitPts(pts, maxR = 76) {
  let mr = 0;
  for (const [x, y] of pts) mr = Math.max(mr, Math.hypot(x - CX, y - CY));
  const k = mr > maxR ? maxR / mr : 1;
  return pts.map(([x, y]) => [fix(CX + (x - CX) * k), fix(CY + (y - CY) * k)]);
}

function regularPoly(sides, R) {
  const pts = [];
  for (let i = 0; i < sides; i++) {
    const a = ((i * (360 / sides) - 90) * Math.PI) / 180;
    pts.push([fix(CX + Math.cos(a) * R), fix(CY + Math.sin(a) * R)]);
  }
  return pts;
}
function triIsosceles(R) {
  const bw = R * rnd(0.55, 0.85);
  const h = R * rnd(1.0, 1.4);
  return [[CX, CY - h * 0.55], [CX + bw, CY + h * 0.45], [CX - bw, CY + h * 0.45]].map(([x, y]) => [fix(x), fix(y)]);
}
function triRight(R) {
  const w = R * rnd(1.0, 1.5);
  const h = R * rnd(1.0, 1.5);
  const x0 = CX - w / 2;
  const x1 = CX + w / 2;
  const y0 = CY - h / 2;
  const y1 = CY + h / 2;
  return [[x0, y1], [x1, y1], [x0, y0]].map(([x, y]) => [fix(x), fix(y)]); // זווית ישרה בפינה
}
function quadSquare(R) {
  const s = R * 0.82;
  return [[CX - s, CY - s], [CX + s, CY - s], [CX + s, CY + s], [CX - s, CY + s]].map(([x, y]) => [fix(x), fix(y)]);
}
function quadRect(R) {
  const w = R * rnd(0.85, 1.1);
  const h = R * rnd(0.45, 0.65);
  return [[CX - w, CY - h], [CX + w, CY - h], [CX + w, CY + h], [CX - w, CY + h]].map(([x, y]) => [fix(x), fix(y)]);
}
// מצולע פשוט לא-סדיר (כולל קעור): נקודות בסדר זוויתי עם רדיוס משתנה
function irregularPolygon(sides, R) {
  const step = (Math.PI * 2) / sides;
  const start = Math.random() * Math.PI * 2;
  const pts = [];
  for (let i = 0; i < sides; i++) {
    const jitter = (Math.random() - 0.5) * step * 0.5; // שומר על הסדר → מצולע פשוט
    const a = start + i * step + jitter;
    const r = R * (0.5 + Math.random() * 0.5);
    pts.push([fix(CX + Math.cos(a) * r), fix(CY + Math.sin(a) * r)]);
  }
  return pts;
}

// בוחר סגנון אקראי שמתאים למספר הצלעות, ומחזיר את נקודות הצורה
function buildShapePoints(sides, R) {
  if (sides === 3) {
    const style = ["equ", "iso", "right", "scalene", "scalene"][rint(0, 4)];
    if (style === "equ") return regularPoly(3, R);
    if (style === "iso") return triIsosceles(R);
    if (style === "right") return triRight(R);
    return irregularPolygon(3, R);
  }
  if (sides === 4) {
    const style = ["square", "rect", "irregular", "irregular"][rint(0, 3)];
    if (style === "square") return quadSquare(R);
    if (style === "rect") return quadRect(R);
    return irregularPolygon(4, R);
  }
  // 5–8: מצולע משוכלל או לא-סדיר
  return rint(0, 2) === 0 ? regularPoly(sides, R) : irregularPolygon(sides, R);
}

function shapes(level = 1, p = {}) {
  // הרמה היא מספר הצלעות, לא תווית: לספור 3 פינות ולספור 8 פינות זה לא
  // אותו קושי. קודם נבחר המצולע באקראי מכל הטווח — ולכן "רמה 1" הגישה
  // לפעמים מתומן, והבורר לא שינה דבר.
  const BY_LEVEL = [[3, 3, 4, 4], [4, 5, 5, 6], [6, 7, 7, 8]];
  const lv = clamp(level, 1, 3);
  const pool = BY_LEVEL[lv - 1];
  const sides = pool[rint(0, pool.length - 1)];
  const size = SHAPE_SIZES[rint(0, SHAPE_SIZES.length - 1)];
  const R = SHAPE_R[size] || SHAPE_R.m;
  // בונים → מסובבים בכיוון אקראי → מכווצים אל תוך הגבולות
  const points = fitPts(rotatePts(buildShapePoints(sides, R), rnd(0, 360)));
  // תת-נושא קובע את סוג השאלה; אחרת אקראי. במצולע פשוט: קודקודים = צלעות.
  const askVertices = p.mode === "vertices" ? true : p.mode === "sides" ? false : rint(0, 1) === 1;
  const what = askVertices ? "קודקודים" : "צלעות";
  const text = askVertices
    ? `כמה קודקודים (פינות) יש לצורה? ספור/י בעיון!`
    : `כמה צלעות יש לצורה? ספור/י בעיון!`;
  return {
    text,
    answer: sides,
    hints: askVertices
      ? ["עבור/י על הפינות אחת-אחת וספר/י.", "סמן/י בעין מאיפה התחלת, כדי לא לספור פעמיים."]
      : ["עבור/י על הקווים הישרים אחד-אחד וספר/י.", "סמן/י בעין מאיפה התחלת, כדי לא לספור פעמיים."],
    explanation: `לצורה הזו יש ${sides} ${what}.`,
    needsDiagram: true,
    diagramData: { type: "shape", sides, points, size },
  };
}

/* ---------- ציור צורות (הילד מצייר על לוח, הבינה בודקת) ---------- */
// אילוצים: equal=כל הצלעות שוות, right=כל הזוויות ישרות. מרובע=4 צלעות בלבד.
// lv = הרמה שבה המטרה מופיעה. הסולם הוא *מספר האילוצים*: צורה חופשית →
// אילוץ אחד (זוויות ישרות / הרבה צלעות) → שני אילוצים יחד.
// קודם רמות 1–2 הכילו שתי מטרות בלבד כל אחת, והילד ראה את אותה בקשה שוב ושוב.
const CREATE_TARGETS = [
  { type: "triangle", label: "משולש", sides: 3, lv: 1 },
  { type: "quad", label: "מרובע", sides: 4, lv: 1 },
  { type: "polygon", label: "מצולע בעל 5 צלעות", sides: 5, lv: 1 },
  { type: "polygon", label: "מצולע בעל 6 צלעות", sides: 6, lv: 1 },
  { type: "rectangle", label: "מלבן", sides: 4, right: true, lv: 2 },
  { type: "equilateral", label: "משולש שווה-צלעות", sides: 3, equal: true, lv: 2 },
  { type: "polygon", label: "מצולע בעל 7 צלעות", sides: 7, lv: 2 },
  { type: "polygon", label: "מצולע בעל 8 צלעות", sides: 8, lv: 2 },
  { type: "square", label: "ריבוע", sides: 4, equal: true, right: true, lv: 3 },
  { type: "polygon", label: "מצולע בעל 5 צלעות שוות", sides: 5, equal: true, lv: 3 },
  { type: "polygon", label: "מצולע בעל 6 צלעות שוות", sides: 6, equal: true, lv: 3 },
  { type: "polygon", label: "מצולע בעל 8 צלעות שוות", sides: 8, equal: true, lv: 3 },
];
function shapeCreate(level = 1) {
  const lv = clamp(level, 1, 3);
  // רמה 1 — צורה בלי אילוצים; רמה 2 — אילוץ אחד (זוויות ישרות / יותר צלעות);
  // רמה 3 — שני אילוצים יחד, או מצולע מרובה-צלעות.
  const pool = CREATE_TARGETS.filter((t) => t.lv === lv);
  const list = pool.length ? pool : CREATE_TARGETS;
  const t = list[rint(0, list.length - 1)];
  const extra = t.equal && t.right
    ? " (כל הצלעות שוות וכל הזוויות ישרות!)"
    : t.equal
      ? " (כל הצלעות שוות!)"
      : t.right
        ? " (כל הזוויות ישרות!)"
        : "";
  return {
    text: `צייר/י ${t.label}${extra}`,
    answer: t.label,
    interactive: "shape-create",
    shapeTarget: {
      type: t.type,
      sides: t.sides,
      equal: !!t.equal,
      right: !!t.right,
      label: t.label,
    },
    hints: [
      `לצורה הזו יש ${t.sides} צלעות.`,
      t.equal ? "שים/י לב שכל הצלעות יוצאות באותו אורך." : "אפשר אורכי צלעות שונים.",
    ],
    explanation: `כדי לצייר ${t.label} צריך ${t.sides} קודקודים${
      t.equal ? ", וכל הצלעות באותו אורך" : ""
    }${t.right ? ", וכל הזוויות ישרות (90°)" : ""}.`,
    needsDiagram: false,
  };
}

/* ---------- שאלות מילוליות (חיבור/חיסור) ---------- */
const WORD_ITEMS = ["תפוחים", "עפרונות", "בלונים", "מדבקות", "עוגיות", "כדורים", "פרחים", "ממתקים"];
const WORD_EDIBLE = { "תפוחים": 1, "עוגיות": 1, "ממתקים": 1 };
/** כלי + פועל שמתאימים לפריט: אוכלים עוגיות, אבל לוקחים מדבקות. */
function wordScene(item) {
  return WORD_EDIBLE[item]
    ? { inBox: "בצלחת", fromBox: "מהצלחת", took: "אכלו" }
    : { inBox: "בקופסה", fromBox: "מהקופסה", took: "לקחו" };
}
const WORD_NAMES = ["דנה", "יואב", "מאיה", "איתי", "נועה", "עומר"];
/** שני שמות שונים, לשאלות-השוואה. */
function twoNames() {
  const i = rint(0, WORD_NAMES.length - 1);
  let j = rint(0, WORD_NAMES.length - 1);
  if (j === i) j = (j + 1) % WORD_NAMES.length;
  return [WORD_NAMES[i], WORD_NAMES[j]];
}
function addWord(level = 1, p = {}) {
  const max = p.max || 20;
  const lv = clamp(level, 1, 4);
  const item = WORD_ITEMS[rint(0, WORD_ITEMS.length - 1)];
  const sc = wordScene(item);
  // הסולם כאן הוא *מבנה הבעיה*, לא גודל המספרים: צירוף → השוואה → התחלה
  // חסרה. קודם כל הרמות הגישו את אותו משפט בדיוק, ורק המספרים השתנו.
  const top = lv === 1 ? Math.max(4, Math.floor(max / 2)) : max;
  const a = rint(1, Math.max(2, top - 1));
  const b = rint(1, Math.max(1, top - a));

  if (lv === 4) {
    return {
      text: `${sc.inBox} היו ${item}. הוסיפו עוד ${b}, ועכשיו יש ${a + b}. כמה ${item} היו ${sc.inBox} בהתחלה?`,
      answer: a,
      hints: ["מה היה *לפני* שהוסיפו?", `אפשר לחסר: ${a + b} − ${b}.`],
      explanation: `${a + b} − ${b} = ${a}, ולכן בהתחלה היו ${a} ${item}.`,
      needsDiagram: false,
    };
  }

  if (lv === 3) {
    const [n1, n2] = twoNames();
    return {
      text: `ל${n1} יש ${a} ${item}. ל${n2} יש ${b} יותר מ${n1}. כמה ${item} יש ל${n2}?`,
      answer: a + b,
      hints: [`"יותר" אומר להוסיף על מה שיש ל${n1}.`, `${a} + ${b}.`],
      explanation: `${a} + ${b} = ${a + b} ${item}.`,
      needsDiagram: false,
    };
  }

  return {
    text: `${sc.inBox} היו ${a} ${item}, והוסיפו עוד ${b}. כמה ${item} יש עכשיו?`,
    answer: a + b,
    hints: [`צריך לחבר: ${a} + ${b}.`, "סופרים את הכול ביחד."],
    explanation: `${a} + ${b} = ${a + b} ${item}.`,
    needsDiagram: false,
  };
}
function subWord(level = 1, p = {}) {
  const max = p.max || 20;
  const lv = clamp(level, 1, 4);
  const item = WORD_ITEMS[rint(0, WORD_ITEMS.length - 1)];
  const sc = wordScene(item);
  const top = lv === 1 ? Math.max(4, Math.floor(max / 2)) : max;
  const a = rint(2, top);
  const b = rint(1, Math.max(1, a - 1));

  if (lv === 4) {
    return {
      text: `${sc.fromBox} ${sc.took} ${b} ${item}, ונשארו ${a - b}. כמה ${item} היו ${sc.inBox} בהתחלה?`,
      answer: a,
      hints: [`מה היה *לפני* ש${sc.took}?`, `כאן דווקא מחברים: ${a - b} + ${b}.`],
      explanation: `${a - b} + ${b} = ${a}, ולכן בהתחלה היו ${a} ${item}.`,
      needsDiagram: false,
    };
  }

  if (lv === 3) {
    const [n1, n2] = twoNames();
    return {
      text: `ל${n1} יש ${a} ${item}. ל${n2} יש ${b} פחות מ${n1}. כמה ${item} יש ל${n2}?`,
      answer: a - b,
      hints: [`"פחות" אומר להוריד ממה שיש ל${n1}.`, `${a} − ${b}.`],
      explanation: `${a} − ${b} = ${a - b} ${item}.`,
      needsDiagram: false,
    };
  }

  return {
    text: `${sc.inBox} היו ${a} ${item}, ו${sc.took} ${b}. כמה ${item} נשארו?`,
    answer: a - b,
    hints: [`צריך לחסר: ${a} − ${b}.`, "כמה נשאר אחרי שמורידים."],
    explanation: `${a} − ${b} = ${a - b} ${item}.`,
    needsDiagram: false,
  };
}

/* ---------- כסף ומטבעות (כמה שקלים) ---------- */
function money(level = 1) {
  const lv = clamp(level, 1, 3);
  // רמה 1 — מעט מטבעות קטנים; רמה 2 — יותר מטבעות, כולל 10;
  // רמה 3 — עודף: אותם מטבעות, אבל שאלה הפוכה.
  const coins = lv === 1 ? [1, 2, 5] : [1, 2, 5, 10];
  const n = lv === 1 ? rint(2, 3) : rint(4, 5);
  const picked = [];
  for (let i = 0; i < n; i++) picked.push(coins[rint(0, coins.length - 1)]);
  const sum = picked.reduce((s2, c) => s2 + c, 0);

  if (lv === 3) {
    const target = (Math.floor(sum / 10) + 1) * 10;
    return {
      text: `יש כאן מטבעות. כמה שקלים עוד חסרים כדי להגיע ל-${target} ₪?`,
      answer: target - sum,
      hints: ["קודם סופרים כמה כסף יש.", `ואז: ${target} פחות מה שיש.`],
      explanation: `${picked.join(" + ")} = ${sum} ₪, ועד ${target} חסרים ${target - sum} ₪.`,
      needsDiagram: true,
      diagramData: { type: "coins", coins: picked },
    };
  }

  return {
    text: `כמה שקלים יש כאן?`,
    answer: sum,
    hints: ["חבר/י את כל המטבעות.", "התחל/י מהמטבע הגדול."],
    explanation: `סה״כ ${picked.join(" + ")} = ${sum} שקלים.`,
    needsDiagram: true,
    diagramData: { type: "coins", coins: picked },
  };
}

/* ---------- שעון ---------- */
function pad2(n) {
  return String(n).padStart(2, "0");
}
const CLOCK_KINDS = ["now", "next", "prev", "readmin", "set", "daynight", "wordadd", "wordsub", "wordset"];
const MIN_STEPS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const SET_MINS = [0, 15, 30, 45];
const WORD_DUR = [15, 30, 45, 60]; // משכי זמן לשאלות מילוליות

// חיבור/חיסור דקות לשעון 12 (מחזיר [שעה 1–12, דקות])
function addMin(h, m, delta) {
  let total = ((((h % 12) * 60 + m + delta) % 720) + 720) % 720;
  let hh = Math.floor(total / 60);
  const mm = total % 60;
  if (hh === 0) hh = 12;
  return [hh, mm];
}
function durLabel(min) {
  if (min === 60) return "שעה";
  if (min === 30) return "חצי שעה";
  if (min === 45) return "שלושת רבעי שעה";
  if (min === 15) return "רבע שעה";
  return `${min} דקות`;
}

function clock(level = 1) {
  const lv = clamp(level, 1, 4);
  const hour = rint(1, 12);
  // סולם הזמן: שעה עגולה → חצאים ורבעים → תזוזה בזמן → משך זמן בבעיה מילולית.
  const BY_LEVEL = [
    ["now", "now", "readmin"],
    ["readmin", "readmin", "set"],
    ["next", "prev", "readmin", "daynight"],
    ["wordadd", "wordsub", "wordset"],
  ];
  const pool = BY_LEVEL[lv - 1];
  const kind = pool[rint(0, pool.length - 1)];
  // ברמה 2 הדקות הן רבעים וחצאים בלבד; רק ברמה 3 קוראים קפיצות של 5.
  const minPool = lv >= 3 ? MIN_STEPS : lv === 2 ? [15, 45] : [30];

  if (kind === "now") {
    return {
      text: `מה השעה? (כתוב/י את מספר השעה)`,
      answer: hour,
      difficulty: clamp(rint(1, 2), 1, 5),
      hints: ["המחוג הקצר מצביע על השעה.", "המחוג הארוך על 12 = שעה עגולה."],
      explanation: `השעה ${hour}:00.`,
      needsDiagram: true,
      diagramData: { type: "clock", hour, minute: 0 },
    };
  }
  if (kind === "next") {
    const answer = (hour % 12) + 1;
    return {
      text: `השעון מראה את השעה עכשיו. בעוד שעה — איזו שעה תהיה? (מספר)`,
      answer,
      difficulty: clamp(rint(3, 4), 1, 7),
      hints: ["קרא/י קודם את השעה שמוצגת בשעון.", "הוסף/י שעה אחת."],
      explanation: `השעון מראה ${hour}:00, ובעוד שעה תהיה ${answer}:00.`,
      needsDiagram: true,
      diagramData: { type: "clock", hour, minute: 0 },
    };
  }
  if (kind === "prev") {
    const answer = ((hour + 10) % 12) + 1; // שעה אחת אחורה עם גלגול 1→12
    return {
      text: `השעון מראה את השעה עכשיו. לפני שעה — איזו שעה הייתה? (מספר)`,
      answer,
      difficulty: clamp(rint(3, 4), 1, 7),
      hints: ["קרא/י קודם את השעה שמוצגת בשעון.", "הורד/י שעה אחת."],
      explanation: `השעון מראה ${hour}:00, ולפני שעה הייתה ${answer}:00.`,
      needsDiagram: true,
      diagramData: { type: "clock", hour, minute: 0 },
    };
  }
  if (kind === "readmin") {
    // קריאת שעה עם דקות — קשה יותר. תשובה בפורמט שעה:דקות (שני שדות בקלט).
    const minute = minPool[rint(0, minPool.length - 1)];
    return {
      text: `מה השעה? (מלא/י שעות ודקות)`,
      answer: `${hour}:${pad2(minute)}`,
      answerKind: "time",
      difficulty: clamp(rint(4, 7), 1, 9),
      hints: [
        "המחוג הקצר מראה את השעה.",
        "המחוג הארוך מראה דקות — כל מספר על השעון = 5 דקות.",
      ],
      explanation: `השעה ${hour}:${pad2(minute)}.`,
      needsDiagram: true,
      diagramData: { type: "clock", hour, minute, showNumbers: true },
    };
  }
  if (kind === "set") {
    // אינטראקטיבי: הילד מזיז את המחוגים ולוחץ "סיימתי".
    const minute = SET_MINS[rint(0, SET_MINS.length - 1)];
    return {
      text: `כוון/י את השעון לשעה ${hour}:${pad2(minute)}`,
      answer: `${hour}:${pad2(minute)}`,
      answerKind: "time",
      interactive: "clock-set",
      difficulty: clamp(rint(2, 5), 1, 8),
      hints: [
        "המחוג הקצר (הקטן) קובע את השעה.",
        "המחוג הארוך (הגדול) קובע את הדקות — כל מספר = 5 דקות.",
      ],
      explanation: `צריך לכוון את השעון ל-${hour}:${pad2(minute)}.`,
      needsDiagram: true,
      diagramData: { type: "clock-set", target: { hour, minute }, showNumbers: true },
    };
  }
  if (kind === "daynight") {
    // שעות יום/לילה — המרה לשעון 24 שעות (ערב/לילה = +12)
    const h = rint(1, 11);
    const answer = h + 12;
    return {
      text: `השעה ${h} בערב. איזו שעה זו בשעון של 24 שעות? (מספר)`,
      answer,
      difficulty: 6,
      hints: ["אחר הצהריים והערב ממשיכים מ-12 והלאה.", `${h} בערב = ${h} + 12.`],
      explanation: `${h} בערב הם השעה ${answer} בשעון 24 שעות.`,
      needsDiagram: false,
    };
  }
  if (kind === "wordadd") {
    // שאלה מילולית — כמה זמן עובר (חיבור). תשובה בשעה:דקות.
    const m0 = SET_MINS[rint(0, SET_MINS.length - 1)];
    const dur = WORD_DUR[rint(0, WORD_DUR.length - 1)];
    const [h2, m2] = addMin(hour, m0, dur);
    return {
      text: `התחילו לאפות עוגה בשעה ${hour}:${pad2(m0)}, והאפייה אורכת ${durLabel(dur)}. באיזו שעה העוגה מוכנה? (מלא/י שעות ודקות)`,
      answer: `${h2}:${pad2(m2)}`,
      answerKind: "time",
      difficulty: 8,
      hints: [`מוסיפים ${durLabel(dur)} לשעה ${hour}:${pad2(m0)}.`, "שעה שלמה = 60 דקות."],
      explanation: `${hour}:${pad2(m0)} ועוד ${durLabel(dur)} = ${h2}:${pad2(m2)}.`,
      needsDiagram: false,
    };
  }
  if (kind === "wordsub") {
    // שאלה מילולית — מתי לצאת (חיסור). תשובה בשעה:דקות.
    const m0 = SET_MINS[rint(0, SET_MINS.length - 1)];
    const dur = WORD_DUR[rint(0, WORD_DUR.length - 1)];
    const [h2, m2] = addMin(hour, m0, -dur);
    return {
      text: `צריך להגיע לבית הספר בשעה ${hour}:${pad2(m0)}, והדרך אורכת ${durLabel(dur)}. באיזו שעה צריך לצאת? (מלא/י שעות ודקות)`,
      answer: `${h2}:${pad2(m2)}`,
      answerKind: "time",
      difficulty: 8,
      hints: [`מורידים ${durLabel(dur)} מהשעה ${hour}:${pad2(m0)}.`, "שעה שלמה = 60 דקות."],
      explanation: `${hour}:${pad2(m0)} פחות ${durLabel(dur)} = ${h2}:${pad2(m2)}.`,
      needsDiagram: false,
    };
  }
  // kind === "wordset" — שאלה מילולית אינטראקטיבית: כוונו את השעון לתשובה
  const wm0 = SET_MINS[rint(0, SET_MINS.length - 1)];
  const wdur = WORD_DUR[rint(0, WORD_DUR.length - 1)];
  const [wh, wmm] = addMin(hour, wm0, wdur);
  return {
    text: `חיממו אוכל בתנור ${durLabel(wdur)}, התחילו בשעה ${hour}:${pad2(wm0)}. כוון/י את השעון למתי שהאוכל יהיה מוכן.`,
    answer: `${wh}:${pad2(wmm)}`,
    answerKind: "time",
    interactive: "clock-set",
    difficulty: 8,
    hints: [`מוסיפים ${durLabel(wdur)} לשעה ${hour}:${pad2(wm0)}.`, "כוונו קודם את השעה ואז את הדקות."],
    explanation: `${hour}:${pad2(wm0)} ועוד ${durLabel(wdur)} = ${wh}:${pad2(wmm)}.`,
    needsDiagram: true,
    diagramData: { type: "clock-set", target: { hour: wh, minute: wmm }, showNumbers: true },
  };
}


/* ══════════════════════════════════════════════════════════════════════
   מחוללים לכיתה ב׳ — נושאים שהיו באזור-הלמידה ולא היה להם תרגול
   ──────────────────────────────────────────────────────────────────────
   כל תשובה כאן היא *מספר*, כי המקלדת באזור-התרגול היא ספרות בלבד —
   שאלה שדורשת אות או מילה נועלת את הילד.
   האיור נשלח כ-diagramData {type:"kit", widget, params} — מסלול גנרי
   ב-app.js שמרנדר כל כלי מ-widget-kit.js בלי קוד ייעודי.
   ══════════════════════════════════════════════════════════════════════ */

const PLACE_HE = ["יחידות", "עשרות", "מאות"];

/** המספרים עד 1000 — ערך-מקום, השוואה, סדרות והרכבה. */
function numbers1000(level = 1, p = {}) {
  const lv = clamp(level, 1, 5);

  if (lv <= 2) {
    const n = rint(102, 989);
    const digits = String(n).split("").map(Number); // [מאות, עשרות, יחידות]
    const place = rint(0, 2);                        // 0=יחידות
    const digit = digits[2 - place];
    const worth = digit * Math.pow(10, place);
    const askValue = lv === 2;
    return {
      text: askValue
        ? `במספר ${n} — כמה שווה הספרה שבמקום ה${PLACE_HE[place]}?`
        : `במספר ${n} — איזו ספרה נמצאת במקום ה${PLACE_HE[place]}?`,
      answer: askValue ? worth : digit,
      difficulty: askValue ? 3 : 2,
      hints: [
        "סופרים את הבתים מימין: יחידות, עשרות, מאות.",
        askValue ? "מצא/י קודם את הספרה — ואז שאל/י כמה היא שווה בבית הזה." : "אל תמהר/י — ספור/י בית-בית מימין לשמאל.",
      ],
      explanation: askValue
        ? `הספרה ${digit} יושבת במקום ה${PLACE_HE[place]}, ולכן היא שווה ${digit} × ${Math.pow(10, place)} = ${worth}.`
        : `בבית ה${PLACE_HE[place]} של ${n} נמצאת הספרה ${digit}.`,
      needsDiagram: true,
      diagramData: askValue
        ? { type: "kit", widget: "number_card", params: { value: n }, w: 420, h: 160, alt: `המספר ${n}` }
        : { type: "kit", widget: "place_value_table", params: { value: n, upto: 3 }, w: 420, h: 200, alt: `טבלת ערך-מקום של ${n}` },
    };
  }

  if (lv === 3) {
    let a = rint(101, 998), b = rint(101, 998);
    while (a === b) b = rint(101, 998);
    return {
      text: `מי גדול יותר — ${a} או ${b}? כתוב/כתבי את המספר הגדול.`,
      answer: Math.max(a, b),
      difficulty: 3,
      hints: ["משווים בית-בית משמאל: קודם המאות.", "אם המאות שוות — ממשיכים לעשרות, ורק אז ליחידות."],
      explanation: `משווים משמאל: ${Math.max(a, b)} גדול מ-${Math.min(a, b)}.`,
    };
  }

  if (lv === 4) {
    const step = [10, 100, 5, 50][rint(0, 3)];
    const k = rint(3, 4);
    // התחום של כיתה ב׳ נגמר ב-1000 — הסדרה חייבת להיעצר לפניו, כולל התשובה
    const maxStart = 1000 - k * step;
    const start = clamp(rint(2, 8) * step + rint(0, 40), step, Math.max(step, maxStart));
    const seq = [];
    for (let i = 0; i < k; i++) seq.push(start + i * step);
    const answer = start + k * step;
    return {
      text: `המשך/המשיכי את הסדרה: ${seq.join(", ")}, ___`,
      answer,
      difficulty: 4,
      hints: ["בדוק/בדקי כמה מוסיפים בין שני מספרים שכנים.", "ודא/י שאותה קפיצה מתאימה לכל הצעדים, ורק אז המשך/המשיכי."],
      explanation: `בכל צעד מוסיפים ${step}, ולכן אחרי ${seq[seq.length - 1]} בא ${answer}.`,
    };
  }

  const h = rint(1, 9), t = rint(0, 9), o = rint(0, 9);
  const val = h * 100 + t * 10 + o;
  return {
    text: `${h} מאות ועוד ${t} עשרות ועוד ${o} יחידות — איזה מספר יצא?`,
    answer: val,
    difficulty: 4,
    hints: ["כל מאה שווה 100, כל עשרת שווה 10.", "כתוב/כתבי כל חלק בנפרד ואז חבר/י."],
    explanation: `${h}×100 + ${t}×10 + ${o} = ${val}.`,
  };
}

/** חקר נתונים — קריאת דיאגרמת עמודות, כולל סולם שאינו 1. */
function dataRead(level = 1, p = {}) {
  const lv = clamp(level, 1, 4);
  // ask/more — תבנית-ניסוח לכל קבוצה. בלעדיה יצא "כמה ילדים בתפוח?",
  // משפט שבור שילד בן 7 נתקע בו לפני שהוא בכלל מסתכל על הדיאגרמה.
  const SETS = [
    { labels: ["כדורסל", "ציור", "שחמט"], noun: "תלמידים", ask: (l) => `כמה תלמידים בחוג ${l}?`, more: (a, b) => `בכמה יותר תלמידים בחוג ${a} מאשר בחוג ${b}?` },
    { labels: ["תפוח", "בננה", "אגס"], noun: "ילדים", ask: (l) => `כמה ילדים בחרו ${l}?`, more: (a, b) => `בכמה יותר ילדים בחרו ${a} מאשר ${b}?` },
    { labels: ["כלב", "חתול", "ארנב"], noun: "ילדים", ask: (l) => `לכמה ילדים יש ${l}?`, more: (a, b) => `לכמה יותר ילדים יש ${a} מאשר ${b}?` },
    { labels: ["שחייה", "ריקוד", "טניס"], noun: "ילדים", ask: (l) => `כמה ילדים בחוג ${l}?`, more: (a, b) => `בכמה יותר ילדים בחוג ${a} מאשר בחוג ${b}?` },
  ];
  const set = SETS[rint(0, SETS.length - 1)];
  const step = lv === 1 ? 1 : lv === 2 ? 5 : [2, 5, 10][rint(0, 2)];
  const counts = set.labels.map(() => rint(2, 7) * step);
  const params = { labels: set.labels.join(","), series: counts.join(","), step, unit: "squares" };
  const diagram = { type: "kit", widget: "bar_chart", params, w: 400, h: 250, alt: "דיאגרמת עמודות" };

  if (lv <= 2) {
    const i = rint(0, set.labels.length - 1);
    return {
      text: set.ask(set.labels[i]),
      answer: counts[i],
      difficulty: lv === 1 ? 1 : 3,
      hints: [
        "קודם כול — כמה שווה משבצת אחת? כתוב על הדיאגרמה.",
        "ספור/י את המשבצות בעמודה, ואז הכפל/י בערך של משבצת.",
      ],
      explanation: `בעמודה ${counts[i] / step} משבצות, וכל משבצת שווה ${step} — ${counts[i] / step} × ${step} = ${counts[i]}.`,
      needsDiagram: true, diagramData: diagram,
    };
  }

  if (lv === 3) {
    let i = 0, j = 1;
    for (let k = 0; k < counts.length; k++) if (counts[k] > counts[i]) i = k;
    for (let k = 0; k < counts.length; k++) if (k !== i && counts[k] < counts[j === i ? (i + 1) % counts.length : j]) j = k;
    if (i === j) j = (i + 1) % counts.length;
    return {
      text: set.more(set.labels[i], set.labels[j]),
      answer: counts[i] - counts[j],
      difficulty: 4,
      hints: ["'בכמה יותר' זה חיסור.", "קרא/י כל עמודה בנפרד לפי הסולם, ורק אז חסר/י."],
      explanation: `${counts[i]} פחות ${counts[j]} = ${counts[i] - counts[j]}.`,
      needsDiagram: true, diagramData: diagram,
    };
  }

  const total = counts.reduce((s, c) => s + c, 0);
  const sorted = counts.slice().sort((a, b) => a - b);
  const variant = rint(0, 2);

  if (variant === 1) {
    let hi = 0;
    for (let k = 0; k < counts.length; k++) if (counts[k] > counts[hi]) hi = k;
    return {
      text: `מה המספר בעמודה הגבוהה ביותר?`,
      answer: counts[hi],
      difficulty: 4,
      hints: ["הגבוהה ביותר היא זו עם הכי הרבה משבצות.", "מצאת אותה? עכשיו קרא/י אותה לפי הסולם — לא לפי מספר המשבצות."],
      explanation: `העמודה הגבוהה היא ${set.labels[hi]}: ${counts[hi] / step} משבצות × ${step} = ${counts[hi]}.`,
      needsDiagram: true, diagramData: diagram,
    };
  }
  if (variant === 2) {
    const two = sorted[0] + sorted[1];
    return {
      text: `כמה ${set.noun} בשתי העמודות הנמוכות ביחד?`,
      answer: two,
      difficulty: 5,
      hints: ["קודם מזהים איזו עמודה הכי נמוכה ואיזו אחריה.", "קרא/י כל אחת לפי הסולם, ורק אז חבר/י."],
      explanation: `${sorted[0]} + ${sorted[1]} = ${two}.`,
      needsDiagram: true, diagramData: diagram,
    };
  }
  return {
    text: `כמה ${set.noun} בסך הכול בכל העמודות?`,
    answer: total,
    difficulty: 5,
    hints: ["קרא/י כל עמודה בנפרד לפי הסולם.", "רק אחרי שכתבת את שלושת המספרים — חבר/י אותם."],
    explanation: `${counts.join(" + ")} = ${total}.`,
    needsDiagram: true, diagramData: diagram,
  };
}

/** גופים ונפח — ספירת פאות, קדקודים ומקצועות מתוך גוף מצויר. */
const SOLIDS = [
  { key: "cube", he: "קובייה", faces: 6, vertices: 8, edges: 12 },
  { key: "box", he: "תיבה", faces: 6, vertices: 8, edges: 12 },
  { key: "cylinder", he: "גליל", faces: 3, vertices: 0, edges: 2 },
  { key: "prism", he: "מנסרה משולשת", faces: 5, vertices: 6, edges: 9 },
  { key: "pyramid", he: "פירמידה", faces: 5, vertices: 5, edges: 8 },
  // חרוט וכדור היו חסרים — והם דווקא הגופים שמופיעים בכל מבחן
  { key: "cone", he: "חרוט", faces: 2, vertices: 1, edges: 1 },
  { key: "sphere", he: "כדור", faces: 1, vertices: 0, edges: 0 },
];

function solidsCount(level = 1, p = {}) {
  const lv = clamp(level, 1, 3);
  const HE = { faces: "פאות", vertices: "קדקודים", edges: "מקצועות" };
  const TIP = {
    faces: "פאה היא משטח שאפשר להניח עליו את הגוף. אל תשכח/י את התחתית ואת המכסה.",
    vertices: "קדקוד הוא פינה חדה שבה נפגשות כמה פאות. לגליל אין אף אחת.",
    edges: "מקצוע הוא הקו שבו שתי פאות נפגשות.",
  };
  const KINDS = ["faces", "vertices", "edges"];

  if (lv === 1) {
    const sd = SOLIDS[rint(0, SOLIDS.length - 1)];
    const kind = KINDS[rint(0, 2)];
    return {
      text: `כמה ${HE[kind]} יש ל${sd.he}?`,
      answer: sd[kind],
      hints: [TIP[kind], "עבוד/עבדי לפי סדר קבוע כדי לא לספור פעמיים — ותעזר/י גם בפריסה שבצד."],
      explanation: `ל${sd.he} יש ${sd[kind]} ${HE[kind]}. הפריסה שלצד הגוף מראה את זה.`,
      needsDiagram: true,
      diagramData: { type: "kit", widget: "solid_net", params: { solid: sd.key }, w: 400, h: 240, alt: `${sd.he} והפריסה שלה` },
    };
  }

  if (lv === 2) {
    const sd = SOLIDS[rint(0, SOLIDS.length - 1)];
    const PAIRS = [["faces", "vertices"], ["faces", "edges"], ["vertices", "edges"]];
    const two = PAIRS[rint(0, 2)];
    return {
      text: `כמה ${HE[two[0]]} ו${HE[two[1]]} יש ל${sd.he} ביחד?`,
      answer: sd[two[0]] + sd[two[1]],
      hints: [`קודם סופרים ${HE[two[0]]}, ואז ${HE[two[1]]} — ורק בסוף מחברים.`, TIP[two[1]]],
      explanation: `${sd[two[0]]} ${HE[two[0]]} ועוד ${sd[two[1]]} ${HE[two[1]]} = ${sd[two[0]] + sd[two[1]]}.`,
      needsDiagram: true,
      diagramData: { type: "kit", widget: "solid_net", params: { solid: sd.key }, w: 400, h: 240, alt: `${sd.he} והפריסה שלה` },
    };
  }

  // רמה 3 — השוואה בין שני גופים, בלי פריסה על המסך: כאן כבר צריך לדעת.
  let a = SOLIDS[rint(0, SOLIDS.length - 1)];
  let b = SOLIDS[rint(0, SOLIDS.length - 1)];
  let kind = KINDS[rint(0, 2)];
  for (let i = 0; i < 60 && a[kind] <= b[kind]; i++) {
    a = SOLIDS[rint(0, SOLIDS.length - 1)];
    b = SOLIDS[rint(0, SOLIDS.length - 1)];
    kind = KINDS[rint(0, 2)];
  }
  if (a[kind] <= b[kind]) { const t = a; a = b; b = t; } // גיבוי: מבטיח תשובה חיובית
  return {
    text: `ל${a.he} יש יותר ${HE[kind]} מאשר ל${b.he}. בכמה יותר?`,
    answer: a[kind] - b[kind],
    hints: [`כמה ${HE[kind]} יש לכל אחד מהם?`, `ואז מחסרים: ${a[kind]} פחות ${b[kind]}.`],
    explanation: `ל${a.he} ${a[kind]} ${HE[kind]} ול${b.he} ${b[kind]} — ההפרש ${a[kind] - b[kind]}.`,
  };
}

/**
 * מדידות אורך — קריאה מסרגל, המרות והשוואה.
 * שתי הרמות הראשונות נשענות על סרגל מצויר: מדידה בלי סרגל היא לא מדידה,
 * ו-L2 תוקף במכוון את הטעות הקלאסית של הגיל — לקרוא את השנתה שבקצה החפץ
 * במקום לחשב את המרחק, כשהחפץ לא מתחיל ב-0.
 */
function lengthMeasure(level = 1, p = {}) {
  const lv = clamp(level, 1, 5);
  const ITEMS = ["העיפרון", "הסרט", "המחק", "הקש", "הענף", "הסיכה"];
  const item = ITEMS[rint(0, ITEMS.length - 1)];

  if (lv === 1) {
    const len = rint(3, 15);
    return {
      text: `כמה סנטימטרים אורך ${item}?`,
      answer: len,
      difficulty: 1,
      hints: [
        `${item} מתחיל בדיוק ב-0 — אז השנתה שבקצה השני היא התשובה.`,
        "עקוב/עקבי עם האצבע מ-0 עד הקצה, וקרא/י את המספר שם.",
      ],
      explanation: `${item} נמתח מ-0 עד ${len}, ולכן אורכו ${len} ס״מ.`,
      needsDiagram: true,
      diagramData: { type: "kit", widget: "ruler", params: { length: len, from: 0, label: "" }, w: 380, h: 190, alt: "סרגל" },
    };
  }

  if (lv === 2) {
    const len = rint(3, 12), from = rint(1, 6);
    return {
      text: `כמה סנטימטרים אורך ${item}?`,
      answer: len,
      difficulty: 3,
      hints: [
        `שים/שימי לב — ${item} לא מתחיל ב-0! השנתה שבקצה אינה התשובה.`,
        `מאיזו שנתה הוא מתחיל, ובאיזו הוא נגמר? האורך הוא ההפרש ביניהן.`,
      ],
      explanation: `${item} נמתח מ-${from} עד ${from + len}. ${from + len} פחות ${from} = ${len} ס״מ.`,
      needsDiagram: true,
      diagramData: { type: "kit", widget: "ruler", params: { length: len, from, label: "" }, w: 380, h: 190, alt: "סרגל" },
    };
  }

  if (lv === 3) {
    // גם מ״מ↔ס״מ, לא רק מטרים: ההמרה הזו היא חצי מהשאלות במבחן.
    if (rint(0, 1) === 0) {
      const cm = rint(2, 40);
      return rint(0, 1) === 0
        ? {
            text: `${cm} סנטימטרים — כמה מילימטרים?`,
            answer: cm * 10,
            hints: ["בסנטימטר אחד יש 10 מילימטרים.", `${cm} פעמים 10.`],
            explanation: `${cm} × 10 = ${cm * 10} מ״מ.`,
          }
        : {
            text: `${cm * 10} מילימטרים — כמה סנטימטרים?`,
            answer: cm,
            hints: ["הכיוון ההפוך: ממילימטרים לסנטימטרים מחלקים ב-10.", "כל 10 מ״מ הם ס״מ אחד."],
            explanation: `${cm * 10} : 10 = ${cm} ס״מ.`,
          };
    }
    const toCm = rint(0, 1) === 0;
    const m = rint(2, 30);
    return toCm
      ? {
          text: `${m} מטרים — כמה סנטימטרים?`,
          answer: m * 100,
          difficulty: 3,
          hints: ["במטר אחד יש 100 סנטימטרים.", `${m} מטרים זה ${m} פעמים 100.`],
          explanation: `${m} × 100 = ${m * 100} ס״מ.`,
        }
      : {
          text: `${m * 100} סנטימטרים — כמה מטרים?`,
          answer: m,
          difficulty: 3,
          hints: ["הכיוון ההפוך: מסנטימטרים למטרים מחלקים ב-100.", "כל 100 ס״מ הם מטר אחד — כמה פעמים 100 נכנסות?"],
          explanation: `${m * 100} : 100 = ${m} מטרים.`,
        };
  }

  if (lv === 4) {
    const a = rint(15, 85);
    let b = rint(15, 85);
    while (b === a) b = rint(15, 85);
    const together = rint(0, 1) === 0;
    return together
      ? {
          text: `קו אחד באורך ${a} ס״מ וקו שני ${b} ס״מ. מה האורך של שניהם ביחד?`,
          answer: a + b,
          difficulty: 4,
          hints: ["'ביחד' זה חיבור.", "שתי היחידות זהות — שניהם בס״מ, אז אפשר לחבר ישר."],
          explanation: `${a} + ${b} = ${a + b} ס״מ.`,
        }
      : {
          text: `קו אחד באורך ${Math.max(a, b)} ס״מ וקו שני ${Math.min(a, b)} ס״מ. בכמה ס״מ הראשון ארוך יותר?`,
          answer: Math.abs(a - b),
          difficulty: 4,
          hints: ["'בכמה ארוך יותר' זה חיסור.", "חסר/י את הקצר מהארוך."],
          explanation: `${Math.max(a, b)} − ${Math.min(a, b)} = ${Math.abs(a - b)} ס״מ.`,
        };
  }

  const m = rint(1, 5), extra = rint(5, 95);
  return {
    // item מגיע עם ה"א הידיעה ("העיפרון"); "ל" + זה נותן "להעיפרון". מסירים אותה.
    text: `ל${item.slice(1)} יש ${m} מטר ועוד ${extra} ס״מ. כמה סנטימטרים בסך הכול?`,
    answer: m * 100 + extra,
    difficulty: 5,
    hints: ["קודם ממירים את המטרים לסנטימטרים.", "רק כששתי היחידות זהות — מחברים."],
    explanation: `${m} מטר = ${m * 100} ס״מ, ועוד ${extra} — ביחד ${m * 100 + extra} ס״מ.`,
  };
}

/* ══════════════════════════════════════════════════════════════════════
   מחוללים לכיתה ג׳
   ══════════════════════════════════════════════════════════════════════ */

const PLACE4_HE = ["יחידות", "עשרות", "מאות", "אלפים"];

/** המספרים עד רבבה — ערך-מקום ארבע-ספרתי, השוואה, סדרות ועיגול. */
function numbers10k(level = 1, p = {}) {
  const lv = clamp(level, 1, 5);

  if (lv <= 2) {
    const n = rint(1002, 9989);
    const digits = String(n).split("").map(Number);
    const place = rint(0, 3);
    const digit = digits[3 - place];
    const worth = digit * Math.pow(10, place);
    const askValue = lv === 2;
    return {
      text: askValue
        ? `במספר ${n} — כמה שווה הספרה שבמקום ה${PLACE4_HE[place]}?`
        : `במספר ${n} — איזו ספרה נמצאת במקום ה${PLACE4_HE[place]}?`,
      answer: askValue ? worth : digit,
      difficulty: askValue ? 3 : 2,
      hints: [
        "סופרים את הבתים מימין: יחידות, עשרות, מאות, אלפים.",
        askValue ? "מצא/י קודם את הספרה, ואז שאל/י כמה היא שווה בבית שלה." : "אל תמהר/י — בית-בית מימין לשמאל.",
      ],
      explanation: askValue
        ? `הספרה ${digit} יושבת בבית ה${PLACE4_HE[place]}, ולכן שווה ${digit} × ${Math.pow(10, place)} = ${worth}.`
        : `בבית ה${PLACE4_HE[place]} של ${n} נמצאת הספרה ${digit}.`,
      needsDiagram: true,
      diagramData: askValue
        ? { type: "kit", widget: "number_card", params: { value: n }, w: 420, h: 160, alt: `המספר ${n}` }
        : { type: "kit", widget: "place_value_table", params: { value: n, upto: 4 }, w: 420, h: 200, alt: `טבלת ערך-מקום של ${n}` },
    };
  }

  if (lv === 3) {
    let a = rint(1001, 9998), b = a + rint(-400, 400);
    b = clamp(b, 1001, 9999);
    if (a === b) b = a + 7 <= 9999 ? a + 7 : a - 7;
    return {
      text: `מי גדול יותר — ${a} או ${b}? כתוב/כתבי את המספר הגדול.`,
      answer: Math.max(a, b),
      difficulty: 3,
      hints: ["משווים בית-בית משמאל: קודם האלפים.", "אם האלפים שווים — ממשיכים למאות, ורק אז לעשרות."],
      explanation: `משווים משמאל: ${Math.max(a, b)} גדול מ-${Math.min(a, b)}.`,
    };
  }

  if (lv === 4) {
    const step = [100, 250, 500, 1000][rint(0, 3)];
    const k = rint(3, 4);
    const start = clamp(rint(1, 6) * step + rint(0, 90), step, Math.max(step, 10000 - k * step));
    const seq = [];
    for (let i = 0; i < k; i++) seq.push(start + i * step);
    return {
      text: `המשך/המשיכי את הסדרה: ${seq.join(", ")}, ___`,
      answer: start + k * step,
      difficulty: 4,
      hints: ["בדוק/בדקי כמה מוסיפים בין שני מספרים שכנים.", "ודא/י שאותה קפיצה מתאימה לכל הצעדים — ורק אז המשך/המשיכי."],
      explanation: `בכל צעד מוסיפים ${step}, ולכן אחרי ${seq[seq.length - 1]} בא ${start + k * step}.`,
    };
  }

  const unit = [10, 100, 1000][rint(0, 2)];
  const n = rint(1000, 9899);
  const rounded = Math.round(n / unit) * unit;
  const HE = { 10: "לעשרת השלמה הקרובה", 100: "למאה השלמה הקרובה", 1000: "לאלף השלם הקרוב" };
  return {
    text: `עגל/עגלי את ${n} ${HE[unit]}.`,
    answer: rounded,
    difficulty: 5,
    hints: [
      `מסתכלים על הספרה שמימין לבית ה${unit === 10 ? "עשרות" : unit === 100 ? "מאות" : "אלפים"}.`,
      "אם היא 5 ומעלה — עולים למעלה; אם פחות — יורדים למטה.",
    ],
    explanation: `${n} מעוגל ${HE[unit]} הוא ${rounded}.`,
  };
}

/** חילוק ושארית — המנה, השארית, וההבדל בין "כמה מלאים" ל"כמה צריך". */
function remainderDiv(level = 1, p = {}) {
  const lv = clamp(level, 1, 4);
  const divisor = rint(2, 9);
  const quotient = rint(2, 12);
  const rem = rint(1, divisor - 1);
  const total = divisor * quotient + rem;

  if (lv === 1) {
    return {
      text: `${total} : ${divisor} — כמה יוצא? (בלי השארית)`,
      answer: quotient,
      difficulty: 2,
      hints: [`כמה פעמים ${divisor} נכנס ב-${total}?`, "חפש/י את הכפולה הכי גדולה שעדיין לא עוברת."],
      explanation: `${divisor} × ${quotient} = ${divisor * quotient}, ונשארים עוד ${rem}. אז המנה ${quotient}.`,
    };
  }
  if (lv === 2) {
    return {
      text: `${total} : ${divisor} — מה השארית?`,
      answer: rem,
      difficulty: 3,
      hints: ["קודם מוצאים כמה פעמים שלמות נכנס המחלק.", `מה שנשאר אחרי ${divisor} × המנה — זו השארית, והיא תמיד קטנה מ-${divisor}.`],
      explanation: `${divisor} × ${quotient} = ${divisor * quotient}. ${total} − ${divisor * quotient} = ${rem}.`,
    };
  }
  // pl — צורת-הרבים במפורש. הוספת "ים" אוטומטית ייצרה "שולחןים" ו"מדףים":
  // עברית לא עובדת ככה, וילד קורא משפט שבור לפני שהוא מגיע למתמטיקה.
  const OBJ = [
    { it: "עוגיות", box: "קופסה", pl: "קופסאות", v: "נכנסות", full: "מלאות", need: "צריך" },
    { it: "ילדים", box: "שולחן", pl: "שולחנות", v: "יושבים", full: "מלאים", need: "צריך" },
    { it: "פרחים", box: "אגרטל", pl: "אגרטלים", v: "נכנסים", full: "מלאים", need: "צריך" },
    { it: "ספרים", box: "מדף", pl: "מדפים", v: "נכנסים", full: "מלאים", need: "צריך" },
  ];
  const o = OBJ[rint(0, OBJ.length - 1)];
  if (lv === 3) {
    return {
      text: `יש ${total} ${o.it}. בכל ${o.box} ${o.v} ${divisor}. כמה ${o.pl} ${o.full}?`,
      answer: quotient,
      difficulty: 4,
      hints: ["השאלה היא כמה *מלאים* — השארית לא מספיקה ל" + o.box + " שלם.", "מחלקים, ולוקחים רק את המנה."],
      explanation: `${total} : ${divisor} = ${quotient} ושארית ${rem}. ${rem} לא מספיקים ל${o.box} מלא, אז ${quotient}.`,
    };
  }
  return {
    text: `יש ${total} ${o.it}, וצריך לשים את כולם. בכל ${o.box} ${o.v} ${divisor}. כמה ${o.pl} ${o.need}?`,
    answer: quotient + 1,
    difficulty: 5,
    hints: ["כאן צריך מקום לכולם — גם לשארית.", "אחרי החלוקה, אם נשאר משהו — צריך עוד אחד."],
    explanation: `${total} : ${divisor} = ${quotient} ושארית ${rem}. בשביל ${rem} הנותרים צריך עוד אחד — ${quotient + 1}.`,
  };
}

/** חוק הפילוג וסדר הפעולות. */
function distributive(level = 1, p = {}) {
  const lv = clamp(level, 1, 4);

  if (lv === 1) {
    const a = rint(3, 9), b = rint(11, 19);
    return {
      text: `${a} × ${b} = ?  (רמז: פרק/י את ${b} ל-10 ועוד ${b - 10})`,
      answer: a * b,
      difficulty: 3,
      hints: [`${a} × 10 קל — כמה זה?`, `עכשיו ${a} × ${b - 10}, ובסוף מחברים את שתי התוצאות.`],
      explanation: `${a}×10 = ${a * 10}, ${a}×${b - 10} = ${a * (b - 10)}. ביחד ${a * b}.`,
    };
  }
  if (lv === 2) {
    const a = rint(2, 9), b = rint(2, 9), c = rint(2, 9);
    const plusFirst = rint(0, 1) === 0;
    return plusFirst
      ? { text: `${a} + ${b} × ${c} =`, answer: a + b * c, difficulty: 4,
          hints: ["כפל וחילוק קודמים לחיבור וחיסור.", `קודם ${b} × ${c}, ורק אז מוסיפים ${a}.`],
          explanation: `${b}×${c} = ${b * c}, ועוד ${a} = ${a + b * c}.` }
      : { text: `${b} × ${c} + ${a} =`, answer: b * c + a, difficulty: 4,
          hints: ["כפל קודם לחיבור, גם כשהוא כתוב ראשון.", `${b} × ${c} תחילה.`],
          explanation: `${b}×${c} = ${b * c}, ועוד ${a} = ${b * c + a}.` };
  }
  if (lv === 3) {
    const a = rint(2, 9), b = rint(2, 9), c = rint(2, 9);
    return {
      text: `${a} × (${b} + ${c}) =`,
      answer: a * (b + c),
      difficulty: 4,
      hints: ["סוגריים קודמים לכול.", `קודם ${b} + ${c}, ואז כופלים ב-${a}.`],
      explanation: `${b}+${c} = ${b + c}, ו-${a}×${b + c} = ${a * (b + c)}.`,
    };
  }
  let a = rint(2, 9), b = rint(2, 9), c = rint(2, 6), d = rint(2, 6);
  for (let i = 0; i < 60 && a * b < c * d; i++) {
    a = rint(2, 9); b = rint(2, 9); c = rint(2, 6); d = rint(2, 6);
  }
  if (a * b < c * d) { c = 2; d = 2; a = Math.max(a, 3); b = Math.max(b, 3); } // גיבוי ודאי
  return {
    text: `${a} × ${b} − ${c} × ${d} =`,
    answer: a * b - c * d,
    hints: ["שני הכפלים קודמים לחיסור.", "חשב/י כל כפל בנפרד, ורק אז חסר/י."],
    explanation: `${a}×${b} = ${a * b}, ${c}×${d} = ${c * d}. ${a * b} − ${c * d} = ${a * b - c * d}.`,
  };
}

/** זוויות ומשולשים — מדידה במד-זווית וחישוב זווית חסרה. */
function anglesTriangles(level = 1, p = {}) {
  const lv = clamp(level, 1, 4);

  if (lv === 1 && rint(0, 4) === 0) {
    // עובדות-יסוד של סיבוב — שייכות בדיוק לרמה הזו, ומרחיבות אותה
    const FACTS = [
      { q: "כמה מעלות יש בזווית ישרה?", a: 90, why: "זווית ישרה היא רבע סיבוב — 90 מעלות." },
      { q: "כמה מעלות יש בחצי סיבוב?", a: 180, why: "חצי סיבוב הוא 180 מעלות — קו ישר." },
      { q: "כמה מעלות יש בסיבוב שלם?", a: 360, why: "סיבוב שלם הוא 360 מעלות." },
      { q: "כמה מעלות יש ברבע סיבוב?", a: 90, why: "רבע סיבוב הוא 90 מעלות — זווית ישרה." },
      { q: "כמה מעלות יש בשלושת רבעי סיבוב?", a: 270, why: "שלושה רבעים של 360 הם 270 מעלות." },
    ];
    const f = FACTS[rint(0, FACTS.length - 1)];
    return {
      text: f.q,
      answer: f.a,
      hints: ["סיבוב שלם הוא 360 מעלות.", "פינה של דף היא זווית ישרה — 90 מעלות."],
      explanation: f.why,
    };
  }

  if (lv <= 2) {
    // רמה 1 — כפולות של 10 (קריאה נוחה); רמה 2 — כפולות של 5.
    const ang = lv === 1 ? rint(1, 17) * 10 : rint(3, 34) * 5;
    return {
      text: `כמה מעלות בזווית שעל מד-הזווית?`,
      answer: ang,
      difficulty: lv === 1 ? 2 : 4,
      hints: [
        "הקרן התחתונה יושבת על 0 — אז קוראים בסולם שמתחיל ב-0.",
        "קודם באומדן: הזווית גדולה מפינת-דף (90°) או קטנה ממנה? זה מסנן את הסולם הלא-נכון.",
      ],
      explanation: `הקרן מגיעה ל-${ang} מעלות.`,
      needsDiagram: true,
      diagramData: { type: "kit", widget: "protractor", params: { angle: ang, lock: true, value: false }, w: 380, h: 230, alt: "מד-זווית" },
    };
  }

  if (lv === 3) {
    const a = rint(30, 80), b = rint(30, 80);
    return {
      text: `במשולש שתי זוויות הן ${a}° ו-${b}°. כמה מעלות הזווית השלישית?`,
      answer: 180 - a - b,
      difficulty: 4,
      hints: ["סכום הזוויות בכל משולש הוא 180 מעלות.", "חבר/י את שתי הזוויות הידועות, וחסר/י מ-180."],
      explanation: `${a} + ${b} = ${a + b}. 180 − ${a + b} = ${180 - a - b}.`,
    };
  }

  const known = rint(20, 70);
  return {
    text: `במשולש ישר-זווית אחת הזוויות היא ${known}°. כמה מעלות הזווית השלישית?`,
    answer: 90 - known,
    difficulty: 5,
    hints: ["ישר-זווית אומר שיש בו זווית של 90 מעלות.", "הסכום הוא 180 — אז שתי הזוויות הנותרות ביחד הן 90."],
    explanation: `180 − 90 − ${known} = ${90 - known}.`,
  };
}

/** שטח והיקף של מלבן, כולל הכיוון ההפוך. */
function rectArea(level = 1, p = {}) {
  const lv = clamp(level, 1, 4);
  const w = rint(2, 10), h = rint(2, 8);
  const diagram = { type: "kit", widget: "area_grid", params: { w, h }, w: 340, h: 300, alt: `מלבן ${w} על ${h}` };

  if (lv === 1) {
    return {
      text: `מה השטח של המלבן שעל הלוח, בסמ״ר?`,
      answer: w * h,
      difficulty: 2,
      hints: ["שטח = כמה משבצות יש בפנים.", "אפשר לספור שורה אחת ואז להכפיל במספר השורות."],
      explanation: `${w} × ${h} = ${w * h} סמ״ר.`,
      needsDiagram: true, diagramData: diagram,
    };
  }
  if (lv === 2) {
    return {
      text: `מה ההיקף של המלבן שעל הלוח, בס״מ?`,
      answer: 2 * (w + h),
      difficulty: 3,
      hints: ["היקף = הדרך מסביב, לא המשבצות שבפנים.", "לכל צלע יש בת-זוג באותו אורך — אפשר לחבר אורך ורוחב ולהכפיל ב-2."],
      explanation: `(${w} + ${h}) × 2 = ${2 * (w + h)} ס״מ.`,
      needsDiagram: true, diagramData: diagram,
    };
  }
  if (lv === 3) {
    return {
      text: `היקף מלבן הוא ${2 * (w + h)} ס״מ, וצלע אחת ${w} ס״מ. כמה ס״מ הצלע השנייה?`,
      answer: h,
      difficulty: 4,
      hints: ["חצי מההיקף הוא אורך ועוד רוחב.", `חלק/י את ההיקף ב-2, ואז חסר/י ${w}.`],
      explanation: `${2 * (w + h)} : 2 = ${w + h}. ${w + h} − ${w} = ${h}.`,
    };
  }
  return {
    text: `שטח מלבן הוא ${w * h} סמ״ר, וצלע אחת ${w} ס״מ. כמה ס״מ הצלע השנייה?`,
    answer: h,
    difficulty: 5,
    hints: ["שטח = אורך × רוחב, אז הכיוון ההפוך הוא חילוק.", `חלק/י את השטח ב-${w}.`],
    explanation: `${w * h} : ${w} = ${h} ס״מ.`,
  };
}

/* ══════════════════════════════════════════════════════════════════════
   מחוללים לכיתה ד׳
   ══════════════════════════════════════════════════════════════════════ */

const PLACE6_HE = ["יחידות", "עשרות", "מאות", "אלפים", "עשרות אלפים", "מאות אלפים"];

/** המספרים עד מיליון — ערך-מקום, השוואה ועיגול. */
function numbersMillion(level = 1, p = {}) {
  const lv = clamp(level, 1, 4);

  if (lv <= 2) {
    const n = rint(100002, 999989);
    const digits = String(n).split("").map(Number);
    const place = rint(0, 5);
    const digit = digits[5 - place];
    const worth = digit * Math.pow(10, place);
    const askValue = lv === 2;
    return {
      text: askValue
        ? `במספר ${n} — כמה שווה הספרה שבמקום ה${PLACE6_HE[place]}?`
        : `במספר ${n} — איזו ספרה נמצאת במקום ה${PLACE6_HE[place]}?`,
      answer: askValue ? worth : digit,
      difficulty: askValue ? 4 : 3,
      hints: [
        "סופרים בתים מימין: יחידות, עשרות, מאות, אלפים, עשרות אלפים, מאות אלפים.",
        askValue ? "קודם מוצאים את הספרה — ואז כמה היא שווה בבית שלה." : "בית-בית מימין, בלי לדלג.",
      ],
      explanation: askValue
        ? `${digit} בבית ה${PLACE6_HE[place]} שווה ${digit} × ${Math.pow(10, place)} = ${worth}.`
        : `בבית ה${PLACE6_HE[place]} של ${n} נמצאת הספרה ${digit}.`,
      needsDiagram: true,
      diagramData: askValue
        ? { type: "kit", widget: "number_card", params: { value: n }, w: 420, h: 160, alt: `המספר ${n}` }
        : { type: "kit", widget: "place_value_table", params: { value: n, upto: 6 }, w: 420, h: 200, alt: `טבלת ערך-מקום של ${n}` },
    };
  }

  if (lv === 3) {
    const a = rint(100001, 999998);
    let b = clamp(a + rint(-9000, 9000), 100001, 999999);
    if (a === b) b = a + 13;
    return {
      text: `מי גדול יותר — ${a} או ${b}? כתוב/כתבי את המספר הגדול.`,
      answer: Math.max(a, b),
      difficulty: 3,
      hints: ["קודם סופרים כמה ספרות בכל מספר.", "אם אותו מספר ספרות — משווים משמאל, בית-בית."],
      explanation: `${Math.max(a, b)} גדול מ-${Math.min(a, b)}.`,
    };
  }

  const unit = [100, 1000, 10000][rint(0, 2)];
  const n = rint(100000, 989999);
  const HE = { 100: "למאה השלמה הקרובה", 1000: "לאלף השלם הקרוב", 10000: "לעשרת-האלפים הקרובה" };
  return {
    text: `עגל/עגלי את ${n} ${HE[unit]}.`,
    answer: Math.round(n / unit) * unit,
    difficulty: 5,
    hints: ["מסתכלים על הספרה שמימין לבית שאליו מעגלים.", "5 ומעלה — עולים; פחות מ-5 — יורדים."],
    explanation: `${n} מעוגל ${HE[unit]} הוא ${Math.round(n / unit) * unit}.`,
  };
}

/** השבר הפשוט — חלק מתוך שלם, השוואה, שוויון-ערך וחלק מכמות. */
function simpleFraction(level = 1, p = {}) {
  const lv = clamp(level, 1, 5);

  // ייצוג השבר מתחלף: מוט, עיגול ורשת. אותה מיומנות בדיוק, אבל ילד שראה
  // רק מוטות לא מזהה את אותו שבר בעוגה — וזו טעות שחוזרת בכל מבחן.
  const SHAPES3 = ["bar", "circle", "grid"];
  if (lv === 1) {
    const parts = [2, 3, 4, 5, 6, 8][rint(0, 5)];
    const shaded = rint(1, parts - 1);
    const shape = SHAPES3[rint(0, 2)];
    return {
      text: `כמה חלקים צבועים בציור?`,
      answer: shaded,
      difficulty: 1,
      hints: ["ספור/י רק את החלקים הצבועים.", "החלק התחתון של השבר הוא כמה חלקים יש בסך הכול — כאן שואלים על העליון."],
      explanation: `צבועים ${shaded} מתוך ${parts}, כלומר ${shaded}/${parts}.`,
      needsDiagram: true,
      diagramData: { type: "kit", widget: "fraction", params: { shape, parts, shaded }, w: 360, h: 220, alt: "שבר" },
    };
  }

  if (lv === 2) {
    const parts = [4, 5, 6, 8, 10][rint(0, 4)];
    const shaded = rint(1, parts - 1);
    const shape = SHAPES3[rint(0, 2)];
    return {
      text: `לכמה חלקים מחולק השלם בציור?`,
      answer: parts,
      difficulty: 2,
      hints: ["סופרים את *כל* החלקים — גם הצבועים וגם הריקים.", "המספר הזה הוא המכנה: החלק התחתון של השבר."],
      explanation: `השלם מחולק ל-${parts} חלקים שווים, ולכן המכנה הוא ${parts}.`,
      needsDiagram: true,
      diagramData: { type: "kit", widget: "fraction", params: { shape, parts, shaded }, w: 360, h: 220, alt: "שבר" },
    };
  }

  if (lv === 3) {
    // גם מספר החלקים משתנה, לא רק זוג המכנים: "כמה חלקים מתוך 8 שווים
    // ל-3 חלקים מתוך 4" — אותה מיומנות, אבל לא אותה שאלה בדיוק כל פעם.
    const small = [2, 3, 4, 5, 6][rint(0, 4)];
    const k = rint(2, 4);
    const big = small * k;
    const num = rint(1, small - 1);
    return {
      text: num === 1
        ? `כמה חלקים מתוך ${big} שווים לחלק אחד מתוך ${small}?`
        : `כמה חלקים מתוך ${big} שווים ל-${num} חלקים מתוך ${small}?`,
      answer: num * k,
      hints: [`הסתכל/י בקיר-השברים: שורת ה-${small} מול שורת ה-${big}.`, `חלק אחד מתוך ${small} שווה ל-${k} חלקים מתוך ${big}.`],
      explanation: `${num}/${small} = ${num * k}/${big}, כי ${big} : ${small} = ${k}.`,
      needsDiagram: true,
      diagramData: { type: "kit", widget: "fraction_wall", params: { rows: [1, small, big].join(",") }, w: 340, h: 300, alt: "קיר שברים" },
    };
  }

  if (lv === 4) {
    const den = [2, 3, 4, 5, 6][rint(0, 4)];
    const q = rint(2, 9);
    const total = den * q;
    return {
      text: `כמה זה חלק אחד מתוך ${den} של ${total}?`,
      answer: q,
      difficulty: 4,
      hints: [`"חלק אחד מתוך ${den}" אומר לחלק ל-${den} חלקים שווים.`, `${total} : ${den} = ?`],
      explanation: `${total} : ${den} = ${q}.`,
    };
  }

  const den = [3, 4, 5, 6][rint(0, 3)];
  const num = rint(2, den - 1);
  const q = rint(2, 9);
  const total = den * q;
  return {
    text: `כמה זה ${num} חלקים מתוך ${den} של ${total}?`,
    answer: num * q,
    difficulty: 5,
    hints: [`קודם מוצאים כמה זה חלק אחד: ${total} : ${den}.`, `אחר כך כופלים ב-${num}.`],
    explanation: `${total} : ${den} = ${q}, ו-${q} × ${num} = ${num * q}.`,
  };
}

/** ראשוניים, התחלקות וחזקות. */
function primesFactors(level = 1, p = {}) {
  const lv = clamp(level, 1, 4);

  if (lv === 1) {
    // "כתוב 1 לכן, 0 ללא" הוא קידוד מלאכותי שילד מתבלבל בו. שאלת-השארית
    // בודקת בדיוק את אותה התחלקות, ומנוסחת בשפה מתמטית אמיתית.
    const d = [2, 5, 10][rint(0, 2)];
    const n = d * rint(4, 40) + (rint(0, 1) === 0 ? 0 : rint(1, d - 1));
    return {
      text: `מה השארית כאשר מחלקים את ${n} ב-${d}?`,
      answer: n % d,
      difficulty: 2,
      hints: [
        d === 2 ? "מספר מתחלק ב-2 בלי שארית אם ספרת היחידות זוגית." : d === 5 ? "מתחלק ב-5 בלי שארית אם נגמר ב-0 או ב-5." : "מתחלק ב-10 בלי שארית אם נגמר ב-0.",
        "אם הוא מתחלק — השארית 0. אחרת, כמה חסר עד לכפולה הקודמת?",
      ],
      explanation: `${n} : ${d} משאיר שארית ${n % d}.`,
    };
  }

  if (lv === 2) {
    // כל מספר פריק בטווח, ולא תשע אפשרויות קבועות
    let n = rint(10, 72);
    while (n % 2 !== 0 && n % 3 !== 0 && n % 5 !== 0) n = rint(10, 72);
    let count = 0;
    for (let i = 1; i <= n; i++) if (n % i === 0) count++;
    return {
      text: `כמה מחלקים יש ל-${n}? (כולל 1 ואת ${n} עצמו)`,
      answer: count,
      difficulty: 4,
      hints: ["עוברים לפי הסדר: 1, 2, 3... ובודקים מי מתחלק בלי שארית.", "כל מחלק מגיע עם בן-זוג — אם 2 מחלק, גם התוצאה מחלקת."],
      explanation: `למחלקי ${n} יש ${count} מחלקים.`,
    };
  }

  if (lv === 3) {
    // המחלק הקטן ביותר שגדול מ-1 בודק ראשוניות בלי קידוד כן/לא: אצל ראשוני
    // התשובה היא המספר עצמו, ואצל פריק היא גורם קטן.
    const PRIMES = [7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73];
    const COMPOSITE = [9, 15, 21, 25, 27, 33, 35, 39, 45, 49, 51, 55, 57, 63, 65, 69, 77, 85, 87, 91, 93, 95];
    const isPrime = rint(0, 1) === 0;
    const n = isPrime ? PRIMES[rint(0, PRIMES.length - 1)] : COMPOSITE[rint(0, COMPOSITE.length - 1)];
    let smallest = n;
    for (let i = 2; i < n; i++) if (n % i === 0) { smallest = i; break; }
    return {
      text: `מהו המחלק הקטן ביותר של ${n} שגדול מ-1?`,
      answer: smallest,
      difficulty: 4,
      hints: ["נסה/נסי לפי הסדר: 2, 3, 5, 7 — מי מחלק בלי שארית?", "אם אף אחד מהם לא מחלק, המספר ראשוני — והמחלק הקטן ביותר הוא הוא עצמו."],
      explanation: smallest === n
        ? `${n} ראשוני: אף מספר בין 2 ל-${n - 1} לא מחלק אותו, ולכן המחלק הקטן ביותר הוא ${n}.`
        : `${n} : ${smallest} = ${n / smallest} — ולכן ${smallest} הוא המחלק הקטן ביותר.`,
    };
  }

  const base = rint(2, 12);
  const exp = base <= 4 ? rint(2, 4) : rint(2, 3);
  // חצי מהשאלות בכיוון ההפוך: "איזה מספר בחזקת 2 נותן 49?" — זה שורש,
  // וזו הקפיצה האמיתית מעבר ל"עוד תרגיל חזקה".
  if (rint(0, 1) === 0) {
    return {
      text: `איזה מספר בחזקת ${exp} נותן ${Math.pow(base, exp)}?`,
      answer: base,
      hints: [`מחפשים מספר שכפול עצמו ${exp} פעמים נותן ${Math.pow(base, exp)}.`, "נסה/נסי מספרים קטנים ועלה/עלי בהדרגה."],
      explanation: `${Array(exp).fill(base).join(" × ")} = ${Math.pow(base, exp)}, ולכן התשובה ${base}.`,
    };
  }
  return {
    text: `${base} בחזקת ${exp} = ?`,
    answer: Math.pow(base, exp),
    hints: [`חזקה היא כפל חוזר: ${base} כפול עצמו ${exp} פעמים.`, `${Array(exp).fill(base).join(" × ")}`],
    explanation: `${Array(exp).fill(base).join(" × ")} = ${Math.pow(base, exp)}.`,
  };
}

/** שאלות מילוליות רב-שלביות. */
function wordProblems4(level = 1, p = {}) {
  const lv = clamp(level, 1, 4);
  // הפועל מוטה לפי מין השם. בלי זה יצא "נועה קנה" — משפט שבור שילד מרגיש בו.
  const NAMES = [
    { n: "דנה", f: true }, { n: "יואב", f: false }, { n: "מאיה", f: true },
    { n: "איתי", f: false }, { n: "נועה", f: true }, { n: "עומר", f: false },
  ];
  const person = NAMES[rint(0, NAMES.length - 1)];
  const nm = person.n;
  const V = person.f
    ? { bought: "קנתה", split: "חילקה", has: "יש" }
    : { bought: "קנה", split: "חילק", has: "יש" };

  if (lv === 1) {
    const packs = rint(3, 9), per = rint(4, 12);
    return {
      text: `ל${nm} יש ${packs} חבילות, ובכל חבילה ${per} מדבקות. כמה מדבקות יש בסך הכול?`,
      answer: packs * per,
      difficulty: 2,
      hints: ["'בכל חבילה' רומז על כפל.", `${packs} פעמים ${per}.`],
      explanation: `${packs} × ${per} = ${packs * per}.`,
    };
  }
  if (lv === 2) {
    // "שווה בשווה" מחייב חלוקה ללא שארית — אחרת השאלה סותרת את עצמה.
    const each = rint(4, 30), used = rint(10, 50);
    const total = each * 5 + used;
    return {
      text: `${nm} ${V.bought} ${total} בלונים ו-${used} התפוצצו. את השאר ${V.split} שווה בשווה ל-5 ילדים. כמה קיבל כל ילד?`,
      answer: each,
      difficulty: 4,
      hints: ["קודם כמה נשארו — זה חיסור.", "רק אחר כך מחלקים לחמישה."],
      explanation: `${total} − ${used} = ${total - used}, ו-${total - used} : 5 = ${each}.`,
    };
  }
  if (lv === 3) {
    const price = rint(7, 19), count = rint(3, 8), paid = 200;
    const cost = price * count;
    return {
      text: `${nm} ${V.bought} ${count} ספרים במחיר ${price} ₪ כל אחד, ושילמ${person.f ? "ה" : ""} ${paid} ₪. כמה עודף קיבל${person.f ? "ה" : ""}?`,
      answer: paid - cost,
      difficulty: 4,
      hints: ["קודם כמה עלו כל הספרים — כפל.", "עודף = מה ששילם פחות מה שעלה."],
      explanation: `${count} × ${price} = ${cost}. ${paid} − ${cost} = ${paid - cost} ₪.`,
    };
  }
  const a = rint(20, 60), b = rint(2, 5);
  return {
    text: `ל${nm} יש ${a} גולות, ול${person.f ? "אחותה" : "אחיו"} פי ${b} יותר. כמה גולות יש לשניהם ביחד?`,
    answer: a + a * b,
    difficulty: 5,
    hints: ["'פי כמה יותר' זה כפל — קודם כמה יש לאח.", "ורק אז מחברים את שניהם."],
    explanation: `לאח ${a} × ${b} = ${a * b}. ביחד ${a} + ${a * b} = ${a + a * b}.`,
  };
}

/** נפח תיבה ומדידות — הכיוון הישר וההפוך. */
function volumeBox(level = 1, p = {}) {
  const lv = clamp(level, 1, 3);
  const a = rint(2, 8), b = rint(2, 6), c = rint(2, 5);

  if (lv === 1) {
    return {
      text: `תיבה שאורכה ${a}, רוחבה ${b} וגובהה ${c} ס״מ. מה הנפח שלה בסמ״ק?`,
      answer: a * b * c,
      difficulty: 3,
      hints: ["נפח = אורך × רוחב × גובה.", `קודם ${a} × ${b} — זו שכבה אחת — ואז כופלים במספר השכבות.`],
      explanation: `${a} × ${b} × ${c} = ${a * b * c} סמ״ק.`,
      needsDiagram: true,
      diagramData: { type: "kit", widget: "solid_net", params: { solid: "box" }, w: 400, h: 240, alt: "תיבה ופריסתה" },
    };
  }
  if (lv === 2) {
    return {
      text: `בשכבה אחת של תיבה יש ${a * b} קוביות, ויש ${c} שכבות. כמה קוביות בסך הכול?`,
      answer: a * b * c,
      difficulty: 3,
      hints: ["כל שכבה זהה לקודמתה.", `${a * b} כפול ${c}.`],
      explanation: `${a * b} × ${c} = ${a * b * c}.`,
    };
  }
  return {
    text: `נפח תיבה הוא ${a * b * c} סמ״ק, ושטח הבסיס שלה ${a * b} סמ״ר. מה הגובה בס״מ?`,
    answer: c,
    difficulty: 5,
    hints: ["נפח = שטח הבסיס × גובה.", "אז הכיוון ההפוך: מחלקים את הנפח בשטח הבסיס."],
    explanation: `${a * b * c} : ${a * b} = ${c} ס״מ.`,
  };
}

/** ניתוח סיכויים — ספירת מקרים מתאימים. */
function probability(level = 1, p = {}) {
  const lv = clamp(level, 1, 4);
  const red = rint(2, 7), blue = rint(2, 7), green = rint(1, 5);
  const total = red + blue + green;

  if (lv === 1) {
    return {
      text: `בשקית ${red} כדורים אדומים, ${blue} כחולים ו-${green} ירוקים. כמה כדורים בשקית?`,
      answer: total,
      hints: ["'בסך הכול' — מחברים את כל הצבעים.", "אל תשכח/י אף צבע."],
      explanation: `${red} + ${blue} + ${green} = ${total}.`,
    };
  }
  if (lv === 2) {
    return {
      text: `בשקית ${red} כדורים אדומים, ${blue} כחולים ו-${green} ירוקים. כמה מקרים מתאימים ל"מוציאים כדור כחול"?`,
      answer: blue,
      hints: ["מקרה מתאים = כדור שעונה על מה שביקשנו.", "סופרים רק את הכחולים."],
      explanation: `יש ${blue} כדורים כחולים, ולכן ${blue} מקרים מתאימים מתוך ${total}.`,
    };
  }
  if (lv === 3) {
    // המקור משתנה: קובייה (1–6), חפיסת קלפים ממוספרת, או גלגל מחולק.
    const SRC = [
      { n: 6, he: "מטילים קובייה רגילה (1 עד 6)", one: "תוצאה" },
      { n: 8, he: "מסובבים גלגל מחולק ל-8 חלקים ממוספרים 1 עד 8", one: "חלק" },
      { n: 10, he: "שולפים קלף מחפיסה ובה קלפים ממוספרים 1 עד 10", one: "קלף" },
      { n: 12, he: "שולפים קלף מחפיסה ובה קלפים ממוספרים 1 עד 12", one: "קלף" },
    ];
    const src = SRC[rint(0, SRC.length - 1)];
    const N = src.n;
    const COND = ["gt", "lt", "ge", "even", "odd", "not"];
    const cond = COND[rint(0, COND.length - 1)];
    const t = rint(2, N - 1);
    let text, answer, hint2, why;
    if (cond === "gt") {
      answer = N - t; text = `${src.he}. כמה תוצאות גדולות מ-${t}?`;
      hint2 = `סמן/סמני את אלה שגדולות מ-${t} — וספור/י.`; why = `מ-${t + 1} עד ${N} יש ${N - t} תוצאות.`;
    } else if (cond === "lt") {
      answer = t - 1; text = `${src.he}. כמה תוצאות קטנות מ-${t}?`;
      hint2 = `אלה 1 עד ${t - 1}.`; why = `מ-1 עד ${t - 1} יש ${t - 1} תוצאות.`;
    } else if (cond === "ge") {
      answer = N - t + 1; text = `${src.he}. כמה תוצאות גדולות או שוות ל-${t}?`;
      hint2 = `"או שוות" אומר ש-${t} עצמו נספר גם הוא.`; why = `מ-${t} עד ${N} יש ${N - t + 1} תוצאות.`;
    } else if (cond === "even") {
      answer = Math.floor(N / 2); text = `${src.he}. כמה תוצאות זוגיות יש?`;
      hint2 = "זוגי = מתחלק ב-2 בלי שארית."; why = `התוצאות הזוגיות עד ${N} הן ${Math.floor(N / 2)}.`;
    } else if (cond === "odd") {
      answer = Math.ceil(N / 2); text = `${src.he}. כמה תוצאות אי-זוגיות יש?`;
      hint2 = "אי-זוגי = נשארת שארית 1 בחלוקה ב-2."; why = `התוצאות האי-זוגיות עד ${N} הן ${Math.ceil(N / 2)}.`;
    } else {
      answer = N - 1; text = `${src.he}. כמה תוצאות אינן ${t}?`;
      hint2 = "סופרים את הכול, ומורידים אחת."; why = `${N} תוצאות פחות אחת = ${N - 1}.`;
    }
    return {
      text, answer,
      hints: [`רשום/רשמי קודם את כל התוצאות: 1 עד ${N}.`, hint2],
      explanation: why,
    };
  }
  const need = Math.abs(red - blue);
  return {
    text: `בשקית ${red} כדורים אדומים ו-${blue} כחולים. כמה כדורים צריך להוסיף לצבע החסר כדי שיהיו שווים?`,
    answer: need,
    hints: ["איזה צבע יש פחות?", "ההפרש בין השניים הוא כמה חסר."],
    explanation: `ההפרש הוא ${need}, ולכן צריך להוסיף ${need}.`,
  };
}

/* ══════════════════════════════════════════════════════════════════════
   מחוללים לכיתות ה׳–ו׳
   ──────────────────────────────────────────────────────────────────────
   תשובות עשרוניות אפשריות מכאן ואילך: נוסף מקש-נקודה למקלדת, והוא נחשף
   רק כששאלה מצפה לעשרוני (answerKind:"decimal").
   ══════════════════════════════════════════════════════════════════════ */

function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }

/** הרחבה, צמצום והשוואת שברים. */
function fractionCompare(level = 1, p = {}) {
  const lv = clamp(level, 1, 4);

  if (lv === 1) {
    const den = [2, 3, 4, 5, 6][rint(0, 4)];
    const num = rint(1, den - 1);
    const k = rint(2, 5);
    return {
      text: `${num}/${den} = ?/${den * k} — מהו המונה החסר?`,
      answer: num * k,
      difficulty: 3,
      hints: [`במה הוכפל המכנה? ${den} הפך ל-${den * k}.`, "מכפילים את המונה באותו מספר בדיוק."],
      explanation: `${den} × ${k} = ${den * k}, ולכן ${num} × ${k} = ${num * k}.`,
      needsDiagram: true,
      diagramData: { type: "kit", widget: "fraction_wall", params: { rows: [1, den, den * k].join(",") }, w: 340, h: 300, alt: "קיר שברים" },
    };
  }
  if (lv === 2) {
    const base = [2, 3, 4, 5][rint(0, 3)];
    const num0 = rint(1, base - 1);
    const k = rint(2, 6);
    return {
      text: `צמצם/צמצמי את ${num0 * k}/${base * k} — מהו המכנה אחרי הצמצום?`,
      answer: base,
      difficulty: 4,
      hints: ["מחפשים מספר שמחלק גם את המונה וגם את המכנה.", "מחלקים את שניהם באותו מספר, עד שאי-אפשר יותר."],
      explanation: `מחלקים ב-${k}: ${num0 * k}/${base * k} = ${num0}/${base}.`,
    };
  }
  if (lv === 3) {
    const den = [4, 5, 6, 8, 10, 12][rint(0, 5)];
    let a = rint(1, den - 1), b = rint(1, den - 1);
    while (a === b) b = rint(1, den - 1);
    return {
      text: `מי גדול יותר — ${a}/${den} או ${b}/${den}? כתוב/כתבי את המונה של הגדול.`,
      answer: Math.max(a, b),
      difficulty: 2,
      hints: ["המכנים זהים — כלומר החלקים באותו גודל.", "אז מי שיש לו יותר חלקים, גדול יותר."],
      explanation: `אותו מכנה, ולכן ${Math.max(a, b)}/${den} גדול מ-${Math.min(a, b)}/${den}.`,
    };
  }
  const DENS = [2, 3, 4, 5, 6, 8, 9, 10, 12];
  const d1 = DENS[rint(0, DENS.length - 1)];
  let d2 = DENS[rint(0, DENS.length - 1)];
  while (d2 === d1) d2 = DENS[rint(0, DENS.length - 1)];
  const lcm = (d1 * d2) / gcd(d1, d2);
  return {
    text: `מהו המכנה המשותף הקטן ביותר של ${d1} ו-${d2}?`,
    answer: lcm,
    difficulty: 5,
    hints: [`מנה/מני את הכפולות של ${d2}: ${d2}, ${d2 * 2}, ${d2 * 3}...`, `עצור/עצרי בראשונה שמתחלקת גם ב-${d1}.`],
    explanation: `הכפולה המשותפת הקטנה ביותר של ${d1} ו-${d2} היא ${lcm}.`,
  };
}

/** חיבור וחיסור שברים. */
function fractionAddSub(level = 1, p = {}) {
  const lv = clamp(level, 1, 3);

  if (lv === 1) {
    const den = [5, 6, 8, 10, 12][rint(0, 4)];
    const a = rint(1, den - 2);
    const b = rint(1, den - a - 1);
    return {
      text: `${a}/${den} + ${b}/${den} = ?/${den} — מהו המונה?`,
      answer: a + b,
      difficulty: 2,
      hints: ["המכנים שווים — המכנה לא משתנה.", "מחברים רק את המונים."],
      explanation: `${a} + ${b} = ${a + b}, ולכן ${a + b}/${den}.`,
    };
  }
  if (lv === 2) {
    const den = [6, 8, 10, 12][rint(0, 3)];
    const a = rint(3, den - 1), b = rint(1, a - 1);
    return {
      text: `${a}/${den} − ${b}/${den} = ?/${den} — מהו המונה?`,
      answer: a - b,
      difficulty: 3,
      hints: ["מכנים שווים — מחסרים רק את המונים.", "המכנה נשאר כמו שהוא."],
      explanation: `${a} − ${b} = ${a - b}, ולכן ${a - b}/${den}.`,
    };
  }
  const d1 = [2, 3, 4][rint(0, 2)];
  const d2 = d1 * rint(2, 3);
  const n1 = 1, n2 = rint(1, d2 - 1);
  const num = n1 * (d2 / d1) + n2;
  return {
    text: `${n1}/${d1} + ${n2}/${d2} = ?/${d2} — מהו המונה?`,
    answer: num,
    difficulty: 5,
    hints: [`${d2} מתחלק ב-${d1}, אז מרחיבים את השבר הראשון למכנה ${d2}.`, "ורק כששני המכנים שווים — מחברים את המונים."],
    explanation: `${n1}/${d1} = ${d2 / d1}/${d2}. ${d2 / d1} + ${n2} = ${num}.`,
  };
}

/** השבר העשרוני — ערך מקום וקריאה. */
function decimalPlace(level = 1, p = {}) {
  const lv = clamp(level, 1, 3);

  if (lv === 1) {
    const filled = rint(1, 9);
    const dd = { type: "kit", widget: "decimal_grid", params: { rows: 1, filled, lock: true }, w: 340, h: 360, alt: "רשת עשיריות" };
    // שלוש שאלות על אותו ציור: לספור, לכתוב כשבר עשרוני, ולהשלים לשלם.
    const mode = rint(0, 2);
    if (mode === 1) {
      return {
        text: `איזה שבר עשרוני מתאים לציור? (כתוב/כתבי עם נקודה)`,
        answer: +(filled / 10).toFixed(1), answerKind: "decimal",
        hints: ["השלם מחולק לעשרה חלקים — כל חלק הוא עשירית.", "הספרה הראשונה אחרי הנקודה היא מספר העשיריות."],
        explanation: `${filled} עשיריות = ${filled}/10 = ${(filled / 10).toFixed(1)}.`,
        needsDiagram: true, diagramData: dd,
      };
    }
    if (mode === 2) {
      return {
        text: `כמה עשיריות עוד חסרות בציור כדי להשלים שלם אחד?`,
        answer: 10 - filled,
        hints: ["שלם אחד הוא עשר עשיריות.", `ספור/י כמה צבועות, ואז: 10 פחות המספר הזה.`],
        explanation: `צבועות ${filled}, ולכן חסרות ${10 - filled} עשיריות.`,
        needsDiagram: true, diagramData: dd,
      };
    }
    return {
      text: `כמה עשיריות צבועות בציור?`,
      answer: filled,
      hints: ["השלם מחולק לעשרה חלקים — כל חלק הוא עשירית.", "ספור/י רק את הצבועים."],
      explanation: `${filled} מתוך 10, כלומר ${filled}/10 = 0.${filled}.`,
      needsDiagram: true, diagramData: dd,
    };
  }
  if (lv === 2) {
    const filled = rint(11, 99);
    return {
      text: `כמה מאיות צבועות בציור?`,
      answer: filled,
      difficulty: 3,
      hints: ["השלם מחולק ל-100 חלקים.", "שורה מלאה היא 10 מאיות — ספור/י שורות מלאות ואז את השארית."],
      explanation: `${filled} מתוך 100 = ${(filled / 100).toFixed(2)}.`,
      needsDiagram: true,
      diagramData: { type: "kit", widget: "decimal_grid", params: { rows: 10, filled, lock: true }, w: 340, h: 360, alt: "רשת מאיות" },
    };
  }
  const t = rint(1, 9), h = rint(0, 9);
  const val = +(t / 10 + h / 100).toFixed(2);
  return {
    text: `${t} עשיריות ועוד ${h} מאיות — כתוב/כתבי כמספר עשרוני.`,
    answer: val,
    answerKind: "decimal",
    difficulty: 4,
    hints: ["הספרה הראשונה אחרי הנקודה היא העשיריות.", "השנייה אחריה היא המאיות."],
    explanation: `${t} עשיריות ו-${h} מאיות = ${val}.`,
  };
}

/** פעולות בשברים עשרוניים. */
function decimalOps(level = 1, p = {}) {
  const lv = clamp(level, 1, 4);
  const r1 = () => +(rint(10, 99) / 10).toFixed(1);
  const r2 = () => +(rint(100, 999) / 100).toFixed(2);

  if (lv === 1) {
    const a = r1(), b = r1();
    return {
      text: `${a} + ${b} =`, answer: +(a + b).toFixed(1), answerKind: "decimal", difficulty: 3,
      hints: ["מיישרים נקודה מתחת לנקודה.", "מחברים כרגיל, והנקודה יורדת ישר למטה."],
      explanation: `${a} + ${b} = ${+(a + b).toFixed(1)}.`,
    };
  }
  if (lv === 2) {
    let a = r1(), b = r1();
    if (b > a) { const t = a; a = b; b = t; }
    return {
      text: `${a} − ${b} =`, answer: +(a - b).toFixed(1), answerKind: "decimal", difficulty: 3,
      hints: ["מיישרים נקודה מתחת לנקודה.", "אם חסרה ספרה — משלימים אפס, זה לא משנה את הערך."],
      explanation: `${a} − ${b} = ${+(a - b).toFixed(1)}.`,
    };
  }
  if (lv === 3) {
    const a = r2(), b = r2();
    return {
      text: `${a} + ${b} =`, answer: +(a + b).toFixed(2), answerKind: "decimal", difficulty: 4,
      hints: ["שתי ספרות אחרי הנקודה בשניהם — מיישרים ומחברים.", "הנקודה בתשובה יורדת ישר מהנקודות שלמעלה."],
      explanation: `${a} + ${b} = ${+(a + b).toFixed(2)}.`,
    };
  }
  const a = r1(), k = [10, 100][rint(0, 1)];
  return {
    text: `${a} × ${k} =`, answer: +(a * k).toFixed(2), difficulty: 4,
    hints: [`כפל ב-${k} מזיז את הנקודה ${k === 10 ? "מקום אחד" : "שני מקומות"} ימינה.`, "אל תגיד/י 'מוסיפים אפס' — הנקודה היא שזזה."],
    explanation: `${a} × ${k} = ${+(a * k).toFixed(2)}.`,
  };
}

/**
 * ממוצע. הערכים נבחרים קרובים זה לזה ומתוקנים בעדינות כך שהסכום יתחלק —
 * בנייה שכופה את הממוצע דרך הערך האחרון ייצרה חריגים כמו "16, 17, 16, 1".
 */
function average(level = 1, p = {}) {
  const lv = clamp(level, 1, 3);
  const k = lv === 1 ? 3 : lv === 2 ? 4 : 5;
  const center = rint(8, 40);
  let vals = [];
  for (let i = 0; i < k; i++) vals.push(clamp(center + rint(-5, 5), 2, 99));
  // תיקון עדין: מפזרים את השארית על הערכים, ±1 לכל אחד, עד שהסכום מתחלק ב-k
  let sum = vals.reduce((a, b) => a + b, 0);
  let guard = 0;
  while (sum % k !== 0 && guard++ < 40) {
    const i = rint(0, k - 1);
    const dir = sum % k <= k / 2 ? -1 : 1;
    const nv = clamp(vals[i] + dir, 2, 99);
    sum += nv - vals[i];
    vals[i] = nv;
  }
  const mean = Math.round(sum / k);

  if (lv <= 2) {
    return {
      text: `מהו הממוצע של ${vals.join(", ")}?`,
      answer: mean,
      difficulty: lv === 1 ? 3 : 4,
      hints: ["ממוצע = מחלקים שווה בשווה בין כולם.", `קודם מחברים את כל המספרים, ואז מחלקים ב-${k}.`],
      explanation: `${vals.join(" + ")} = ${sum}, ו-${sum} : ${k} = ${mean}.`,
    };
  }
  const known = vals.slice(0, k - 1);
  const knownSum = known.reduce((a, b) => a + b, 0);
  return {
    text: `הממוצע של ${k} מספרים הוא ${mean}. ${k - 1} מהם: ${known.join(", ")}. מהו המספר החסר?`,
    answer: mean * k - knownSum,
    difficulty: 5,
    hints: [`אם הממוצע ${mean} ויש ${k} מספרים — מה הסכום של כולם?`, "חסר/י מהסכום את מה שכבר ידוע."],
    explanation: `הסכום הכולל ${mean} × ${k} = ${mean * k}. ${mean * k} − ${knownSum} = ${mean * k - knownSum}.`,
  };
}

/** כפל וחילוק שברים — כיתה ו׳. */
function fractionMulDiv(level = 1, p = {}) {
  const lv = clamp(level, 1, 4);

  if (lv === 1) {
    const d1 = rint(2, 5), d2 = rint(2, 5);
    const n1 = rint(1, d1 - 1), n2 = rint(1, d2 - 1);
    return {
      text: `${n1}/${d1} × ${n2}/${d2} = ?/${d1 * d2} — מהו המונה?`,
      answer: n1 * n2,
      difficulty: 3,
      hints: ["בכפל שברים כופלים מונה במונה.", "ובנפרד — מכנה במכנה."],
      explanation: `${n1} × ${n2} = ${n1 * n2}, והמכנה ${d1} × ${d2} = ${d1 * d2}.`,
    };
  }
  if (lv === 2) {
    const den = rint(2, 6), num = rint(1, den - 1), whole = den * rint(2, 8);
    return {
      text: `${num}/${den} × ${whole} =`,
      answer: (num * whole) / den,
      difficulty: 4,
      hints: [`קודם ${whole} : ${den} — כמה זה חלק אחד.`, `ואז כופלים ב-${num}.`],
      explanation: `${whole} : ${den} = ${whole / den}, ו-${whole / den} × ${num} = ${(num * whole) / den}.`,
    };
  }
  if (lv === 3) {
    const den = rint(2, 6), whole = rint(2, 9);
    return {
      text: `${whole} : 1/${den} =`,
      answer: whole * den,
      difficulty: 5,
      hints: [`כמה חלקים של 1/${den} נכנסים בשלם אחד? ${den}.`, `ובתוך ${whole} שלמים?`],
      explanation: `בכל שלם ${den} חלקים, ולכן ${whole} × ${den} = ${whole * den}.`,
    };
  }
  const d1 = rint(2, 5), n1 = rint(1, d1 - 1), d2 = rint(2, 5);
  return {
    text: `${n1}/${d1} : 1/${d2} = ?/${d1} — מהו המונה?`,
    answer: n1 * d2,
    difficulty: 5,
    hints: ["חילוק בשבר = כפל בהופכי שלו.", `1/${d2} הופכי הוא ${d2}.`],
    explanation: `${n1}/${d1} × ${d2} = ${n1 * d2}/${d1}.`,
  };
}

/** יחס וקנה מידה. */
function ratioScale(level = 1, p = {}) {
  const lv = clamp(level, 1, 3);

  if (lv === 1) {
    const a = rint(2, 6), b = rint(2, 6), k = rint(2, 6);
    return {
      text: `היחס בין בנים לבנות הוא ${a} ל-${b}. אם יש ${a * k} בנים, כמה בנות יש?`,
      answer: b * k,
      difficulty: 3,
      hints: [`פי כמה גדל מספר הבנים? מ-${a} ל-${a * k}.`, "מכפילים את הבנות באותו מספר בדיוק."],
      explanation: `${a * k} : ${a} = ${k}, ולכן ${b} × ${k} = ${b * k}.`,
    };
  }
  if (lv === 2) {
    const a = rint(2, 5), b = rint(2, 5), total = (a + b) * rint(3, 9);
    const part = (total / (a + b)) * a;
    return {
      text: `מחלקים ${total} סוכריות ביחס ${a} ל-${b}. כמה מקבל החלק הראשון?`,
      answer: part,
      difficulty: 5,
      hints: [`ביחד יש ${a + b} חלקים שווים.`, `${total} : ${a + b} — כמה בכל חלק — ואז כופלים ב-${a}.`],
      explanation: `${total} : ${a + b} = ${total / (a + b)}, ו-${total / (a + b)} × ${a} = ${part}.`,
    };
  }
  const scale = [50, 100, 200, 500, 1000, 2000][rint(0, 5)];
  const cm = rint(2, 15);
  // גם הכיוון ההפוך: מהמציאות אל המפה. זו אותה מיומנות, אבל צריך לחלק —
  // ובדיוק שם ילדים מתבלבלים ומכפילים מתוך הרגל.
  if (rint(0, 1) === 0) {
    return {
      text: `בקנה מידה 1:${scale}, קטע באורך ${cm * scale} ס״מ במציאות — כמה ס״מ במפה?`,
      answer: cm,
      hints: [`1:${scale} אומר שכל ס״מ במפה הוא ${scale} ס״מ במציאות.`, `מהמציאות אל המפה — מחלקים ב-${scale}.`],
      explanation: `${cm * scale} : ${scale} = ${cm} ס״מ במפה.`,
    };
  }
  return {
    text: `בקנה מידה 1:${scale}, קטע באורך ${cm} ס״מ במפה — כמה ס״מ במציאות?`,
    answer: cm * scale,
    hints: [`1:${scale} אומר שכל ס״מ במפה הוא ${scale} ס״מ במציאות.`, `אז כופלים ${cm} ב-${scale}.`],
    explanation: `${cm} × ${scale} = ${cm * scale} ס״מ.`,
  };
}

/** מעגל — היקף ושטח. */
function circleCalc(level = 1, p = {}) {
  const lv = clamp(level, 1, 3);
  // רמה 1 נשארת בטווח נוח לחישוב בעל-פה; ברמות 2–3 הטווח נפתח, אחרת
  // 19 רדיוסים אפשריים הם כל מרחב-השאלות של הרמה.
  const r = lv === 1 ? rint(2, 20) : rint(2, 45);

  if (lv === 1) {
    // שני הכיוונים: מרדיוס לקוטר ומקוטר לרדיוס — מרחיב את המרחב ומאמן
    // את ההיפוך, שהוא בדיוק מה שנשאל במבחן
    if (rint(0, 1) === 0) {
      return {
        text: `קוטר המעגל ${r * 2} ס״מ. כמה ס״מ הרדיוס?`,
        answer: r,
        difficulty: 2,
        hints: ["הרדיוס הוא חצי מהקוטר.", `חלק/י את ${r * 2} ב-2.`],
        explanation: `${r * 2} : 2 = ${r} ס״מ.`,
        needsDiagram: true,
        diagramData: { type: "kit", widget: "circle_parts", params: { radius: r, show: "diameter", lock: true }, w: 340, h: 260, alt: "מעגל" },
      };
    }
    return {
      text: `רדיוס המעגל ${r} ס״מ. כמה ס״מ הקוטר?`,
      answer: r * 2,
      difficulty: 2,
      hints: ["הקוטר עובר דרך המרכז מקצה לקצה.", "הוא בדיוק פעמיים הרדיוס."],
      explanation: `${r} × 2 = ${r * 2} ס״מ.`,
      needsDiagram: true,
      diagramData: { type: "kit", widget: "circle_parts", params: { radius: r, show: "radius", lock: true }, w: 340, h: 260, alt: "מעגל" },
    };
  }
  if (lv === 2) {
    // לפעמים נתון הרדיוס ולא הקוטר — ואז צריך קודם להכפיל ב-2. זה בדיוק
    // המקום שבו ילדים מחשבים π כפול הרדיוס ונופלים.
    const byRadius = rint(0, 1) === 0;
    return {
      text: byRadius
        ? `רדיוס המעגל ${r} ס״מ. מה ההיקף? (π = 3.14)`
        : `קוטר המעגל ${r * 2} ס״מ. מה ההיקף? (π = 3.14)`,
      answer: +(3.14 * r * 2).toFixed(2),
      answerKind: "decimal",
      hints: byRadius
        ? ["היקף = π כפול הקוטר — ולא כפול הרדיוס.", `קודם ${r} × 2 = ${r * 2}, ורק אז כופלים ב-3.14.`]
        : ["היקף = π כפול הקוטר.", `3.14 × ${r * 2}`],
      explanation: `3.14 × ${r * 2} = ${+(3.14 * r * 2).toFixed(2)} ס״מ.`,
      needsDiagram: true,
      diagramData: { type: "kit", widget: "circle_parts", params: { radius: r, show: byRadius ? "radius" : "diameter", lock: true }, w: 340, h: 260, alt: "מעגל" },
    };
  }
  return {
    text: `רדיוס העיגול ${r} ס״מ. מה השטח? (π = 3.14)`,
    answer: +(3.14 * r * r).toFixed(2),
    answerKind: "decimal",
    difficulty: 5,
    hints: ["שטח = π כפול הרדיוס בריבוע.", `קודם ${r} × ${r}, ורק אז כופלים ב-3.14.`],
    explanation: `${r} × ${r} = ${r * r}, ו-3.14 × ${r * r} = ${+(3.14 * r * r).toFixed(2)} סמ״ר.`,
    needsDiagram: true,
    diagramData: { type: "kit", widget: "circle_parts", params: { radius: r, show: "radius", lock: true }, w: 340, h: 260, alt: "עיגול" },
  };
}

/* ══════════════════════════════════════════════════════════════════════
   שאלות-חשיבה — לכל הכיתות
   ──────────────────────────────────────────────────────────────────────
   שאר המאגר שואל "חשב". כאן שואלים "תחשוב": שאלות שאי-אפשר לפתור
   בהרצת אלגוריתם, אלא רק בהבנה של מה קורה. שמונה סוגים, כולם עם
   תשובה מספרית, מדורגים לפי הכיתה דרך params.max.
   ══════════════════════════════════════════════════════════════════════ */

const THINK_NAMES = [
  { n: "דנה", f: true }, { n: "יואב", f: false }, { n: "מאיה", f: true },
  { n: "איתי", f: false }, { n: "נועה", f: true }, { n: "עומר", f: false },
];

function thinking(level = 1, p = {}) {
  const lv = clamp(level, 1, 5);
  const max = p.max || 100;
  const big = max >= 1000, sm = max <= 20; // sm = כיתה א׳: חשבון עד 20 בלבד
  const person = THINK_NAMES[rint(0, THINK_NAMES.length - 1)];
  const nm = person.n;
  const V = person.f ? { did: "חישבה", gave: "נתנה", had: "היו" } : { did: "חישב", gave: "נתן", had: "היו" };

  // אילו סוגים פתוחים בכל רמה — הקושי עולה בסוג, לא רק במספרים
  // בכיתה א׳ אין כפל ואין חילוק — רק חיבור וחיסור עד 20. הסוגים שנשענים
  // עליהם (useGiven, leftover) חייבים להיחסם שם, אחרת מוצג חומר של ב׳–ג׳.
  const KINDS = sm ? ["reverse", "startFrom"]
    : lv === 1 ? ["reverse", "leftover"]
    : lv === 2 ? ["reverse", "leftover", "useGiven", "startFrom"]
    : lv === 3 ? ["useGiven", "startFrom", "byHowMuch", "extraData"]
    : lv === 4 ? ["byHowMuch", "extraData", "estimate", "useGiven"]
    : ["estimate", "byHowMuch", "twoStepBack", "extraData"];
  const kind = KINDS[rint(0, KINDS.length - 1)];

  /* הפוך: התשובה ידועה, המספר חסר */
  if (kind === "reverse") {
    const b = sm ? rint(2, 8) : rint(5, big ? 90 : 30);
    const res = sm ? rint(3, 20 - b) : rint(10, big ? 400 : 60);
    return {
      text: `___ − ${b} = ${res}   מהו המספר החסר?`,
      answer: res + b,
      difficulty: lv + 1,
      hints: ["אל תנחש/י — תחשוב/תחשבי מה קרה למספר.", `הורידו ${b} והגיעו ל-${res}. אז לפני שהורידו, הוא היה גדול יותר.`],
      explanation: `${res} + ${b} = ${res + b}. בודקים: ${res + b} − ${b} = ${res}.`,
    };
  }

  /* מה נשאר — חלוקה שלא מסתדרת */
  if (kind === "leftover") {
    const per = sm ? rint(2, 5) : rint(3, 8);
    const groups = sm ? rint(2, 4) : rint(3, 9);
    const rem = rint(1, per - 1);
    const total = per * groups + rem;
    return {
      text: `בכיתה ${total} תלמידים. המורה חילקה אותם לקבוצות של ${per}. כמה תלמידים נשארו בלי קבוצה מלאה?`,
      answer: rem,
      difficulty: lv + 1,
      hints: ["השאלה היא לא כמה קבוצות — אלא מה *נשאר*.", `כמה פעמים ${per} נכנס ב-${total}, וכמה עוד?`],
      explanation: `${total} : ${per} = ${groups} ושארית ${rem}.`,
    };
  }

  /* להשתמש בנתון שכבר קיבלת — במקום לחשב מאפס */
  if (kind === "useGiven") {
    const a = rint(12, big ? 60 : 25), b = rint(4, 9);
    return {
      text: `ידוע ש-${a} × ${b} = ${a * b}. בלי לחשב מההתחלה — כמה זה ${a} × ${b + 1}?`,
      answer: a * (b + 1),
      difficulty: lv + 2,
      hints: [`${b + 1} זה ${b} ועוד אחד — כלומר קבוצה אחת נוספת של ${a}.`, `קח/י את ${a * b} והוסף/הוסיפי ${a}.`],
      explanation: `${a * b} + ${a} = ${a * (b + 1)}. זה מהיר בהרבה מלכפול מחדש.`,
    };
  }

  /* כמה היה בהתחלה */
  if (kind === "startFrom") {
    const gaveN = sm ? rint(2, 8) : rint(5, big ? 80 : 25);
    const left = sm ? rint(3, 20 - gaveN) : rint(10, big ? 300 : 40);
    return {
      text: `${nm} ${V.gave} ${gaveN} מדבקות, ונשארו ${left}. כמה מדבקות ${V.had} ל${nm} בהתחלה?`,
      answer: gaveN + left,
      difficulty: lv + 1,
      hints: ["המילה 'נתנה' לא אומרת אוטומטית חיסור — תחשוב/תחשבי מה מחפשים.", "מחפשים את ההתחלה, שהיא *גדולה* ממה שנשאר."],
      explanation: `${left} + ${gaveN} = ${gaveN + left}.`,
    };
  }

  /* בכמה טעה — דורש להשוות, לא רק לחשב */
  if (kind === "byHowMuch") {
    const a = rint(big ? 120 : 25, big ? 800 : 70), b = rint(big ? 30 : 8, big ? 400 : 40);
    const err = [10, 100, 9, 1][rint(0, 3)];
    const wrong = a + b - err;
    return {
      text: `${nm} ${V.did} ${a} + ${b} וקיבל${person.f ? "ה" : ""} ${wrong}. בכמה ${person.f ? "היא טעתה" : "הוא טעה"}?`,
      answer: err,
      difficulty: lv + 2,
      hints: ["קודם חשב/חשבי בעצמך מה התשובה הנכונה.", "ואז — ההפרש בין הנכונה לשגויה הוא גודל הטעות."],
      explanation: `${a} + ${b} = ${a + b}. ${a + b} − ${wrong} = ${err}.`,
    };
  }

  /* נתון מיותר — בודק קריאה, לא חשבון */
  if (kind === "extraData") {
    const rows = rint(3, 8), per = rint(3, 9);
    const windows = rint(2, 6), doors = rint(1, 3);
    return {
      text: `בכיתה ${rows * per} תלמידים, ${windows} חלונות ו-${doors} דלתות. הם יושבים ב-${rows} שורות שוות. כמה תלמידים בכל שורה?`,
      answer: per,
      difficulty: lv + 2,
      hints: ["לא כל מספר בשאלה נחוץ — קרא/י שוב מה בדיוק שואלים.", "החלונות והדלתות לא קשורים לישיבה בשורות."],
      explanation: `${rows * per} : ${rows} = ${per}. מספר החלונות והדלתות אינו רלוונטי.`,
    };
  }

  /* אומדן — בכוונה בלי חישוב מדויק */
  if (kind === "estimate") {
    const unit = big ? 100 : 10;
    const a = rint(big ? 2 : 3, big ? 9 : 9) * unit + rint(unit - 3, unit - 1);
    const b = rint(big ? 1 : 2, big ? 8 : 8) * unit + rint(unit - 3, unit - 1);
    const est = (Math.round(a / unit) + Math.round(b / unit)) * unit;
    return {
      text: `בערך כמה זה ${a} + ${b}? עגל/עגלי כל מספר ${unit === 100 ? "למאה" : "לעשרת"} הקרובה וחבר/י.`,
      answer: est,
      difficulty: lv + 1,
      hints: ["לא צריך את התשובה המדויקת — רק בערך.", `${a} קרוב ל-${Math.round(a / unit) * unit}, ו-${b} קרוב ל-${Math.round(b / unit) * unit}.`],
      explanation: `${Math.round(a / unit) * unit} + ${Math.round(b / unit) * unit} = ${est}.`,
    };
  }

  /* שני צעדים אחורה */
  const each = rint(3, 9), boxes = rint(3, 8), broke = rint(2, 9);
  const total = each * boxes + broke;
  return {
    text: `${nm} קנה ${total} כוסות. ${broke} נשברו, ואת השאר סידר${person.f ? "ה" : ""} ב-${boxes} קופסאות שוות. כמה כוסות בכל קופסה?`,
    answer: each,
    difficulty: lv + 2,
    hints: ["שני צעדים, ובסדר הנכון: קודם כמה נשארו.", "רק אחר כך מחלקים למספר הקופסאות."],
    explanation: `${total} − ${broke} = ${each * boxes}, ו-${each * boxes} : ${boxes} = ${each}.`,
  };
}

/* ══════════════════════════════════════════════════════════════════════
   בעיה רב-סעיפית — וגם מכשיר-האבחון הטוב ביותר
   ──────────────────────────────────────────────────────────────────────
   שאלה אחת עם תשובה אחת אומרת רק "נכון/לא נכון". בעיה עם שלושה סעיפים
   שנבנים זה על זה אומרת *איפה בשרשרת* הילד נשבר: ענה נכון על א׳ ונפל
   ב-ב׳ — אז הבעיה היא בשלב השני, לא בהבנת הסיפור. כל סעיף נושא תגית
   skill משלו, ולכן הוא מזין ישירות את האבחון.
   ══════════════════════════════════════════════════════════════════════ */

const MS_NAMES = [
  { n: "דנה", f: true }, { n: "יואב", f: false }, { n: "מאיה", f: true },
  { n: "איתי", f: false }, { n: "נועה", f: true }, { n: "עומר", f: false },
];

function multiStep(level = 1, p = {}) {
  const lv = clamp(level, 1, 4);
  const big = (p.max || 100) >= 1000;
  const who = MS_NAMES[rint(0, MS_NAMES.length - 1)];
  const nm = who.n;
  const V = who.f ? { bought: "קנתה", paid: "שילמה", has: "יש לה" } : { bought: "קנה", paid: "שילם", has: "יש לו" };
  const scenario = rint(0, 2);

  /* קנייה: עלות → עודף → חלוקה */
  if (scenario === 0) {
    const count = rint(3, 8);
    const price = big ? rint(12, 45) : rint(4, 12);
    const cost = count * price;
    const paid = Math.ceil((cost + rint(5, 40)) / 10) * 10;
    const kids = [2, 3, 4, 5][rint(0, 3)];
    const each = Math.floor(count / kids) || 1;
    const shareCount = each * kids;
    return {
      text: `${nm} ${V.bought} ${count} מחברות במחיר ${price} ₪ כל אחת, ו${V.paid} ${paid} ₪.`,
      difficulty: lv + 2,
      parts: [
        {
          text: `א. כמה עלו כל המחברות?`, answer: cost,
          hint: "'כל אחת' רומז על כפל — כמה מחברות, כפול המחיר של אחת.",
          skill: "ms_total", skillHe: "חישוב סכום כולל (כפל)",
        },
        {
          text: `ב. כמה עודף קיבל${who.f ? "ה" : ""}?`, answer: paid - cost,
          hint: "עודף = מה ששילמו פחות מה שעלה. השתמש/י בתשובה מסעיף א׳.",
          skill: "ms_change", skillHe: "עודף (חיסור על תוצאת-ביניים)",
        },
        {
          text: `ג. ${shareCount} מהמחברות חולקו שווה ל-${kids} ילדים. כמה קיבל כל ילד?`, answer: each,
          hint: "'שווה' רומז על חילוק. חלק/י את מספר המחברות במספר הילדים.",
          skill: "ms_share", skillHe: "חלוקה שווה",
        },
      ],
      explanation: `א. ${count}×${price}=${cost} · ב. ${paid}−${cost}=${paid - cost} · ג. ${shareCount}:${kids}=${each}`,
    };
  }

  /* טיול: סך תלמידים → אוטובוסים → נשארו */
  if (scenario === 1) {
    const classes = rint(3, 6);
    const per = big ? rint(24, 34) : rint(18, 28);
    const total = classes * per;
    const seats = [40, 45, 50][rint(0, 2)];
    const buses = Math.floor(total / seats);
    const left = total - buses * seats;
    return {
      text: `בבית הספר ${classes} כיתות, ובכל כיתה ${per} תלמידים. יוצאים לטיול באוטובוסים של ${seats} מקומות.`,
      difficulty: lv + 2,
      parts: [
        {
          text: `א. כמה תלמידים בסך הכול?`, answer: total,
          hint: "'בכל כיתה' רומז על כפל — מספר הכיתות כפול מספר התלמידים בכיתה.",
          skill: "ms_total", skillHe: "חישוב סכום כולל (כפל)",
        },
        {
          text: `ב. כמה אוטובוסים יתמלאו לגמרי?`, answer: buses,
          hint: "רק אוטובוסים *מלאים* — מחלקים, ולוקחים את המנה בלי השארית.",
          skill: "ms_divfloor", skillHe: "חילוק — כמה מלאים",
        },
        {
          text: `ג. כמה תלמידים יישארו בלי מקום באוטובוסים המלאים?`, answer: left,
          hint: "זו השארית: כמה נשאר אחרי שמילאנו את כל האוטובוסים.",
          skill: "ms_remainder", skillHe: "שארית",
        },
      ],
      explanation: `א. ${classes}×${per}=${total} · ב. ${total}:${seats}=${buses} · ג. שארית ${left}`,
    };
  }

  /* גינה: שטח → היקף → עלות גדר */
  const w = big ? rint(6, 15) : rint(3, 9);
  const h = big ? rint(4, 12) : rint(2, 7);
  const perim = 2 * (w + h);
  const pricePerM = [3, 5, 10][rint(0, 2)];
  return {
    text: `לגינה מלבנית אורך ${w} מטר ורוחב ${h} מטר. רוצים לגדר אותה, וכל מטר גדר עולה ${pricePerM} ₪.`,
    difficulty: lv + 2,
    parts: [
      {
        text: `א. מה השטח של הגינה, במ״ר?`, answer: w * h,
        hint: "שטח מלבן = אורך כפול רוחב. זה מה שבפנים.",
        skill: "ms_area", skillHe: "שטח מלבן",
      },
      {
        text: `ב. מה ההיקף של הגינה, במטרים?`, answer: perim,
        hint: "היקף = הדרך מסביב, לא מה שבפנים. אורך ועוד רוחב, כפול 2.",
        skill: "ms_perimeter", skillHe: "היקף מלבן",
      },
      {
        text: `ג. כמה תעלה כל הגדר?`, answer: perim * pricePerM,
        hint: "הגדר הולכת מסביב — כלומר לפי ההיקף מסעיף ב׳, כפול המחיר למטר.",
        skill: "ms_apply", skillHe: "יישום תוצאת-ביניים",
      },
    ],
    explanation: `א. ${w}×${h}=${w * h} · ב. (${w}+${h})×2=${perim} · ג. ${perim}×${pricePerM}=${perim * pricePerM}`,
  };
}

/* ══════════════════════════════════════════════════════════════════════
   סוגי-שאלה שמבחני בית-הספר מלאים בהם — ולא היו אצלנו
   ──────────────────────────────────────────────────────────────────────
   המאגר ידע לשאול "חשב". מבחן כיתה ג׳ שואל גם "הקף את המתאים", "מה
   חסר", "איך קוראים לזה" ו"מה דומה ומה שונה". הסוגים כאן סוגרים את זה.
   רב-ברירה מגיע עם options; התשובה היא *מספר הסעיף*, ולכן היא עובדת גם
   במקלדת-ספרות וגם בלחיצה על כפתור.
   ══════════════════════════════════════════════════════════════════════ */

/** ערבוב שמחזיר גם את המיקום החדש של התשובה הנכונה (1-based). */
function shuffleWithAnswer(opts, correctIdx) {
  // שומר-כפילויות: שתי אפשרויות זהות = שתי תשובות נכונות. מסירים כפילות
  // ומשאירים תמיד את הנכונה.
  const seen = new Set();
  const uniq = [];
  opts.forEach((v, i) => {
    const k = String(v);
    if (seen.has(k) && i !== correctIdx) return;
    if (seen.has(k)) { const at = uniq.findIndex((x) => String(x.v) === k); uniq.splice(at, 1); }
    seen.add(k);
    uniq.push({ v, i });
  });
  correctIdx = uniq.findIndex((x) => x.i === correctIdx);
  const arr = uniq.map((x, n) => ({ v: x.v, i: n === correctIdx ? -1 : n }));
  arr.forEach((x, n) => { if (n === correctIdx) x.i = -1; });
  correctIdx = -1;
  for (let i = arr.length - 1; i > 0; i--) { const j = rint(0, i); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
  return { options: arr.map((x) => x.v), answer: arr.findIndex((x) => x.i === correctIdx) + 1 };
}

/** גורם חסר — "7 × __ = 7", "24 : __ = 24". המיומנות: להפוך את הפעולה. */
function missingFactor(level = 1, p = {}) {
  const lv = clamp(level, 1, 4);
  const max = p.max || 10;

  if (lv <= 2) {
    const a = rint(2, max), b = rint(lv === 1 ? 1 : 2, max);
    const hideFirst = rint(0, 1) === 0;
    return {
      text: hideFirst ? `___ × ${b} = ${a * b}` : `${a} × ___ = ${a * b}`,
      answer: hideFirst ? a : b,
      difficulty: lv + 1,
      hints: [
        "כפל וחילוק הם פעולות הפוכות — מה שחסר בכפל נמצא בחילוק.",
        `חלק/י את ${a * b} במספר שכבר מופיע בתרגיל.`,
      ],
      explanation: `${a * b} : ${hideFirst ? b : a} = ${hideFirst ? a : b}.`,
      skill: "missing_factor_mul", skillHe: "גורם חסר בכפל",
    };
  }
  if (lv === 3) {
    const q = rint(2, max), d = rint(2, max);
    return {
      text: `${q * d} : ___ = ${q}`,
      answer: d,
      difficulty: 4,
      hints: ["בחילוק: מחולק חלקי מחלק שווה מנה.", `איזה מספר כפול ${q} נותן ${q * d}?`],
      explanation: `${q} × ${d} = ${q * d}, ולכן המחלק הוא ${d}.`,
      skill: "missing_divisor", skillHe: "מחלק חסר",
    };
  }
  // המקרים שמפילים: כפל ב-1, כפל ב-0, וחילוק ב-1
  const kind = rint(0, 2);
  if (kind === 0) {
    const n = rint(2, 9);
    return {
      text: `${n} × ___ = ${n}`, answer: 1, difficulty: 4,
      hints: ["התוצאה שווה למספר עצמו — אז בכמה הוא הוכפל?", "יש מספר אחד שלא משנה כלום בכפל."],
      explanation: `${n} × 1 = ${n}. הכפל ב-1 לא משנה.`,
      skill: "identity_one", skillHe: "כפל ב-1",
    };
  }
  if (kind === 1) {
    const n = rint(2, 9);
    return {
      text: `___ × ${n} = 0`, answer: 0, difficulty: 4,
      hints: ["התוצאה היא אפס — מה בהכרח קרה?", "מספיק שאחד מהם אפס, והכול מתאפס."],
      explanation: `0 × ${n} = 0.`,
      skill: "identity_zero", skillHe: "כפל ב-0",
    };
  }
  const n = rint(5, 40);
  return {
    text: `${n} : ___ = ${n}`, answer: 1, difficulty: 4,
    hints: ["התוצאה שווה למחולק — אז במה הוא חולק?", "חילוק ב-1 משאיר את המספר כמו שהוא."],
    explanation: `${n} : 1 = ${n}.`,
    skill: "divide_one", skillHe: "חילוק ב-1",
  };
}

/** רב-ברירה: כפל כחיבור חוזר, שם הגוף, ומשמעות החילוק. */
function chooseRight(level = 1, p = {}) {
  const lv = clamp(level, 1, 3);

  if (lv === 1) {
    // a !== b הכרחי: כש-a שווה ל-b, "החיבור ההפוך" יוצא זהה לתשובה הנכונה
    // ואז שתי אפשרויות נכונות — שאלה שבורה.
    const a = rint(2, 9);
    let b = rint(2, 9);
    while (b === a) b = rint(2, 9);
    const right = Array(b).fill(a).join(" + ");
    const opts = [right, Array(a).fill(b).join(" + "), `${a} + ${b}`, `${a + b} + ${a + b}`];
    const sh = shuffleWithAnswer(opts, 0);
    return {
      text: `איזה תרגיל חיבור מתאים ל-${a} × ${b}? כתוב/כתבי את מספר התשובה.`,
      options: sh.options, answer: sh.answer, answerKind: "choice",
      difficulty: 3,
      hints: [
        `${a} × ${b} אומר ${b} קבוצות, ובכל אחת ${a}.`,
        `אז מחפשים חיבור של ${b} פעמים את המספר ${a}.`,
      ],
      explanation: `${a} × ${b} = ${right} = ${a * b}.`,
      skill: "mul_as_addition", skillHe: "כפל כחיבור חוזר",
    };
  }

  if (lv === 2) {
    const SOL = [
      { he: "כדור", w: "sphere", hint: "עגול לגמרי, בלי שום פינה ובלי פאה ישרה." },
      { he: "קובייה", w: "cube", hint: "שש פאות, וכולן ריבועים זהים." },
      { he: "חרוט", w: "cone", hint: "בסיס עגול אחד, ולמעלה קודקוד אחד — כמו גביע גלידה." },
      { he: "גליל", w: "cylinder", hint: "שני עיגולים זהים, ומעטפת ביניהם — כמו פחית." },
      { he: "פירמידה", w: "pyramid", hint: "בסיס אחד, וכל הפאות האחרות משולשים שנפגשים בקודקוד." },
      { he: "תיבה", w: "box", hint: "שש פאות מלבניות — כמו קופסת נעליים." },
      { he: "מנסרה משולשת", w: "prism", hint: "שני משולשים זהים, ושלושה מלבנים ביניהם." },
    ];
    const SHP = [
      { he: "ריבוע", q: "לצורה ארבע צלעות שוות וארבע זוויות ישרות." },
      { he: "מלבן", q: "לצורה שתי צלעות ארוכות, שתי קצרות, וכל הזוויות ישרות." },
      { he: "משולש", q: "לצורה שלוש צלעות ושלושה קודקודים." },
      { he: "מעגל", q: "לצורה אין אף צלע ישרה ואף קודקוד." },
      { he: "מחומש", q: "לצורה חמש צלעות וחמישה קודקודים." },
      { he: "משושה", q: "לצורה שש צלעות ושישה קודקודים." },
      { he: "מרובע", q: "לצורה ארבע צלעות, אבל הן לא בהכרח שוות." },
      { he: "טרפז", q: "למרובע יש בדיוק זוג אחד של צלעות מקבילות." },
    ];
    // שלושה סוגי-שאלה באותה רמה: שם הגוף שעל הלוח, שם צורה מתוך תיאור,
    // ולאיזה גוף שייכת הפריסה. אותה מיומנות — זיהוי לפי מאפיינים.
    const mode = rint(0, 2);
    if (mode === 2) {
      const i = rint(0, SHP.length - 1);
      const wrong = SHP.filter((_, k) => k !== i).sort(() => Math.random() - 0.5).slice(0, 3).map((x) => x.he);
      const sh = shuffleWithAnswer([SHP[i].he, ...wrong], 0);
      return {
        text: `${SHP[i].q} איך קוראים לה? כתוב/כתבי את מספר התשובה.`,
        options: sh.options, answer: sh.answer, answerKind: "choice",
        hints: ["ספור/י קודם צלעות וקודקודים.", "ואז בדוק/בדקי אם הצלעות שוות והזוויות ישרות."],
        explanation: `זו ${SHP[i].he}.`,
        skill: "name_shape", skillHe: "זיהוי צורה לפי תיאור",
      };
    }
    const i = rint(0, SOL.length - 1);
    const wrong = SOL.filter((_, k) => k !== i).sort(() => Math.random() - 0.5).slice(0, 3).map((x) => x.he);
    const sh = shuffleWithAnswer([SOL[i].he, ...wrong], 0);
    const askNet = mode === 1;
    return {
      text: askNet
        ? `לאיזה גוף שייכת הפריסה שעל הלוח? כתוב/כתבי את מספר התשובה.`
        : `איך קוראים לגוף שעל הלוח? כתוב/כתבי את מספר התשובה.`,
      options: sh.options, answer: sh.answer, answerKind: "choice",
      hints: [SOL[i].hint, askNet ? "ספור/י בפריסה כמה פאות יש, ואיזו צורה כל אחת." : "ספור/י פאות, וחפש/י אם יש קודקוד או צד עגול."],
      explanation: `זהו ${SOL[i].he}.`,
      skill: askNet ? "net_to_solid" : "name_solid",
      skillHe: askNet ? "שיוך פריסה לגוף" : "זיהוי גוף לפי שם",
      needsDiagram: true,
      diagramData: { type: "kit", widget: "solid_net", params: { solid: SOL[i].w }, w: 400, h: 240, alt: SOL[i].he },
    };
  }

  // משמעות החילוק — בדיוק שאלה 4 במבחן: אותו תרגיל, שני סיפורים
  const total = [12, 16, 18, 20, 24][rint(0, 4)];
  const d = [2, 3, 4][rint(0, 2)];
  const q = total / d;
  const perGroup = rint(0, 1) === 0;
  const right = perGroup
    ? `${total} ילדים הסתדרו ב-${d} קבוצות שוות. כמה בכל קבוצה?`
    : `${total} ילדים הסתדרו בקבוצות של ${d}. בכמה קבוצות הסתדרו?`;
  const other = perGroup
    ? `${total} ילדים הסתדרו בקבוצות של ${d}. בכמה קבוצות הסתדרו?`
    : `${total} ילדים הסתדרו ב-${d} קבוצות שוות. כמה בכל קבוצה?`;
  const sh = shuffleWithAnswer([right, other, `${total} ילדים ועוד ${d} ילדים — כמה ביחד?`, `${total} ילדים, ${d} הלכו — כמה נשארו?`], 0);
  return {
    text: `לאיזה סיפור מתאים התרגיל ${total} : ${d} = ${Number.isInteger(q) ? q : "?"}, כשהתשובה היא "${perGroup ? "כמה בכל קבוצה" : "כמה קבוצות"}"? כתוב/כתבי את מספר התשובה.`,
    options: sh.options, answer: sh.answer, answerKind: "choice",
    difficulty: 5,
    hints: [
      "אותו תרגיל חילוק יכול לספר שני סיפורים שונים.",
      perGroup ? "כאן ידוע *מספר הקבוצות*, ומחפשים כמה יש בכל אחת." : "כאן ידוע *כמה בכל קבוצה*, ומחפשים כמה קבוצות יצאו.",
    ],
    explanation: `${total} : ${d} = ${q}. ההבדל בין הסיפורים הוא מה ידוע ומה מחפשים.`,
    skill: "division_meaning", skillHe: "שתי המשמעויות של חילוק",
  };
}

/** שטח והיקף של צורה על משבצות — כולל צורת-L, כמו במבחן. */
function gridShape(level = 1, p = {}) {
  const lv = clamp(level, 1, 3);
  // צורת-L: מלבן גדול שממנו "נגסו" פינה
  const W = rint(4, 6), H = rint(3, 5);
  const cutW = rint(1, W - 2), cutH = rint(1, H - 2);
  const cells = [];
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    if (r < cutH && c >= W - cutW) continue; // הפינה שנגסה
    cells.push(r + "," + c);
  }
  const area = W * H - cutW * cutH;
  const perim = 2 * (W + H); // בצורת-L שנוצרת מנגיסת פינה ההיקף נשמר
  const diagram = { type: "kit", widget: "area_grid", params: { w: W, h: H, cells: cells.join(";") }, w: 340, h: 300, alt: "צורה על משבצות" };

  if (lv === 1) {
    return {
      text: `מה השטח של הצורה שעל הלוח? (יחידת שטח = משבצת אחת)`,
      answer: area, difficulty: 3,
      hints: ["שטח = כמה משבצות יש *בתוך* הצורה.", "ספור/י שורה-שורה ואל תכלול/י את המשבצות האפורות."],
      explanation: `בצורה ${area} משבצות.`,
      needsDiagram: true, diagramData: diagram,
      skill: "area_irregular", skillHe: "שטח צורה לא-מלבנית",
    };
  }
  if (lv === 2) {
    return {
      text: `מה ההיקף של הצורה שעל הלוח? (יחידת אורך = צלע של משבצת)`,
      answer: perim, difficulty: 4,
      hints: ["היקף = הדרך *מסביב* לצורה, לא המשבצות שבפנים.", "לך/י עם האצבע סביב הקו החיצוני וספור/י צלעות."],
      explanation: `ההיקף הוא ${perim} יחידות.`,
      needsDiagram: true, diagramData: diagram,
      skill: "perimeter_irregular", skillHe: "היקף צורה לא-מלבנית",
    };
  }
  return {
    text: `בכמה משבצות השטח של הצורה קטן ממלבן ${W} על ${H}?`,
    answer: cutW * cutH, difficulty: 5,
    hints: [`מלבן שלם ${W} על ${H} הוא ${W * H} משבצות.`, "כמה משבצות חסרות בפינה שנגסה?"],
    explanation: `${W * H} − ${area} = ${cutW * cutH}.`,
    needsDiagram: true, diagramData: diagram,
    skill: "area_compare", skillHe: "השוואת שטחים",
  };
}

/* ══════════════════════════════════════════════════════════════════════
   תיוג תת-מיומנות אוטומטי
   ──────────────────────────────────────────────────────────────────────
   מחולל שלא תייג את עצמו מקבל תגית מתוך *מבנה התרגיל*: חיבור עם נשיאה
   אינו אותו דבר כמו בלי, וחיסור עם אפס באמצע אינו אותו דבר כמו פריטה
   רגילה. בלי ההבחנה הזו האבחון מסתכם ב"מתקשה בחיסור" — נכון וחסר-תועלת.
   ══════════════════════════════════════════════════════════════════════ */
function autoSkill(q) {
  if (!q || q.skill) return q;
  const t = String(q.text || "");
  const m = t.match(/(\d+)\s*([+\-−×:*\/])\s*(\d+)/);
  if (m) {
    const a = +m[1], op = m[2], b = +m[3];
    if (op === "+") {
      const carry = (a % 10) + (b % 10) >= 10;
      q.skill = carry ? "add_carry" : "add_plain";
      q.skillHe = carry ? "חיבור עם נשיאה" : "חיבור בלי נשיאה";
    } else if (op === "-" || op === "−") {
      if (String(a).includes("0") && a >= 100) { q.skill = "sub_zero"; q.skillHe = "חיסור עם אפס באמצע"; }
      else if ((a % 10) < (b % 10)) { q.skill = "sub_borrow"; q.skillHe = "חיסור עם פריטה"; }
      else { q.skill = "sub_plain"; q.skillHe = "חיסור בלי פריטה"; }
    } else if (op === "×" || op === "*") {
      if (a === 0 || b === 0) { q.skill = "mul_zero"; q.skillHe = "כפל ב-0"; }
      else if (a === 1 || b === 1) { q.skill = "mul_one"; q.skillHe = "כפל ב-1"; }
      else if (a % 10 === 0 || b % 10 === 0) { q.skill = "mul_ten"; q.skillHe = "כפל בעשרת עגולה"; }
      else if (a > 10 && b > 10) { q.skill = "mul_big"; q.skillHe = "כפל רב-ספרתי"; }
      else { q.skill = "mul_table"; q.skillHe = "לוח הכפל"; }
    } else {
      if (b !== 0 && a % b === 0) { q.skill = "div_exact"; q.skillHe = "חילוק מדויק"; }
      else { q.skill = "div_remainder"; q.skillHe = "חילוק עם שארית"; }
    }
    return q;
  }
  // אין ביטוי חשבוני — בעיה מילולית או שאלת-הבנה
  if (/[א-ת]/.test(t)) {
    q.skill = /\?\s*$/.test(t) ? "word_problem" : "reading_task";
    q.skillHe = /\?\s*$/.test(t) ? "בעיה מילולית" : "קריאה והבנה";
  }
  return q;
}

/* ══════════════════════════════════════════════════════════════════════
   כתיבה חופשית — עם רשימת-קבלה מוכנה מראש
   ──────────────────────────────────────────────────────────────────────
   accept מכיל את כל הניסוחים הסבירים שילד יכתוב. הלקוח משווה מולם
   מקומית ובאפס טוקנים; המורה נכנס רק כשהתשובה *לא* ברשימה — כלומר הוא
   גיבוי, לא בודק-ברירת-מחדל. בלי זה כל שאלה מילולית הייתה עולה קריאה
   למודל, וזה בדיוק מה שהורג מכסת-טוקנים.
   ══════════════════════════════════════════════════════════════════════ */

const SOLID_WORDS = [
  { he: "כדור", accept: ["כדור", "ספירה"], widget: "sphere", props: [1, 0, 0],
    daily: ["כדורגל", "תפוז", "גולת זכוכית"], hint: "עגול לגמרי — בלי אף פינה ובלי פאה ישרה." },
  { he: "קובייה", accept: ["קובייה", "קוביה", "קובית", "ריבוע תלת ממדי"], widget: "cube",
    daily: ["קובייה של משחק", "קובייה הונגרית"], hint: "שש פאות, וכולן ריבועים זהים." },
  { he: "חרוט", accept: ["חרוט"], widget: "cone", props: [2, 1, 1],
    daily: ["גביע גלידה", "כובע מסיבה", "קונוס בכביש"], hint: "בסיס עגול אחד ולמעלה קודקוד — כמו גביע גלידה." },
  { he: "גליל", accept: ["גליל"], widget: "cylinder", props: [3, 0, 2],
    daily: ["פחית שתייה", "גליל נייר טואלט", "נר עגול"], hint: "שני עיגולים זהים ומעטפת ביניהם — כמו פחית." },
  { he: "פירמידה", accept: ["פירמידה", "פרמידה"], widget: "pyramid", props: [5, 5, 8],
    daily: ["הפירמידות במצרים", "אוהל בצורת פירמידה"], hint: "בסיס אחד, וכל השאר משולשים שנפגשים בקודקוד." },
  { he: "תיבה", accept: ["תיבה", "תבה", "קופסה"], widget: "box",
    daily: ["קופסת נעליים", "ספר עבה", "קופסת דגני בוקר"], hint: "שש פאות מלבניות — כמו קופסת נעליים." },
  { he: "מנסרה משולשת", accept: ["מנסרה משולשת", "מנסרה", "מנסרה משלשת"], widget: "prism", props: [5, 6, 9],
    daily: ["אוהל סיירים", "חפיסת שוקולד טובלרון"], hint: "שני משולשים זהים ושלושה מלבנים ביניהם." },
];

/** כתיבה חופשית: שם הגוף, שם הצורה, ותשובה מילולית לבעיה. */
function writeAnswer(level = 1, p = {}) {
  const lv = clamp(level, 1, 3);

  if (lv === 1) {
    const sw = SOLID_WORDS[rint(0, SOLID_WORDS.length - 1)];
    // שלוש דרכים לזהות את אותו גוף: מהציור, מחפץ מוכר, או מהתכונות שלו.
    // קודם הייתה דרך אחת בלבד — חמש שאלות בסך הכול לרמה שלמה.
    const ways = ["net", "daily", "props"].filter((w) => (w !== "props" || sw.props) && (w !== "daily" || sw.daily));
    const way = ways[rint(0, ways.length - 1)];
    if (way === "daily") {
      const d = sw.daily[rint(0, sw.daily.length - 1)];
      return {
        text: `איך קוראים לגוף שנראה כמו ${d}? כתוב/כתבי את השם.`,
        answer: sw.he, accept: sw.accept, answerKind: "text",
        hints: [sw.hint, "דמיין/דמייני את החפץ, וספור/י כמה פאות יש לו."],
        explanation: `${d} הוא ${sw.he}.`,
        skill: "name_solid_write", skillHe: "כתיבת שם גוף",
      };
    }
    if (way === "props") {
      return {
        text: `לגוף יש ${sw.props[0]} פאות, ${sw.props[1]} קדקודים ו-${sw.props[2]} מקצועות. איך קוראים לו? כתוב/כתבי את השם.`,
        answer: sw.he, accept: sw.accept, answerKind: "text",
        hints: [sw.hint, "עבור/עברי על הגופים שאת/ה מכיר/ה ובדוק/בדקי מי מתאים לשלושת המספרים."],
        explanation: `${sw.he}: ${sw.props[0]} פאות, ${sw.props[1]} קדקודים, ${sw.props[2]} מקצועות.`,
        skill: "name_solid_write", skillHe: "כתיבת שם גוף",
      };
    }
    return {
      text: `איך קוראים לגוף שעל הלוח? כתוב/כתבי את השם.`,
      answer: sw.he, accept: sw.accept, answerKind: "text",
      hints: [sw.hint, "ספור/י פאות, ובדוק/בדקי אם יש צד עגול או קודקוד."],
      explanation: `זהו ${sw.he}.`,
      skill: "name_solid_write", skillHe: "כתיבת שם גוף",
      needsDiagram: true,
      diagramData: { type: "kit", widget: "solid_net", params: { solid: sw.widget }, w: 400, h: 240, alt: sw.he },
    };
  }

  if (lv === 2) {
    const SHAPES = [
      { he: "ריבוע", accept: ["ריבוע", "רבוע"], q: "למרובע יש ארבע צלעות שוות וארבע זוויות ישרות. מה שמו?" },
      { he: "מלבן", accept: ["מלבן"], q: "למרובע יש שתי צלעות ארוכות ושתי קצרות, וכל הזוויות ישרות. מה שמו?" },
      { he: "משולש", accept: ["משולש"], q: "לצורה שלוש צלעות ושלושה קודקודים. מה שמה?" },
      { he: "מעגל", accept: ["מעגל", "עיגול"], q: "לצורה אין אף צלע ישרה ואף קודקוד, וכל נקודה עליה במרחק שווה מהמרכז. מה שמה?" },
      { he: "מחומש", accept: ["מחומש"], q: "לצורה חמש צלעות וחמישה קודקודים. מה שמה?" },
      { he: "משושה", accept: ["משושה"], q: "לצורה שש צלעות ושישה קודקודים. מה שמה?" },
      { he: "מרובע", accept: ["מרובע"], q: "לצורה ארבע צלעות, אבל הן לא בהכרח שוות. מה השם הכללי שלה?" },
      { he: "קודקוד", accept: ["קודקוד", "קדקוד", "פינה"], q: "איך קוראים לנקודה שבה נפגשות שתי צלעות של צורה?" },
      { he: "צלע", accept: ["צלע", "צלעות"], q: "איך קוראים לקו הישר שמחבר שני קודקודים בצורה?" },
      { he: "טרפז", accept: ["טרפז"], q: "למרובע יש בדיוק זוג אחד של צלעות מקבילות. מה שמו?" },
      { he: "מקבילית", accept: ["מקבילית", "מקבילון"], q: "למרובע שני זוגות של צלעות מקבילות, אבל הזוויות אינן ישרות. מה שמו?" },
      { he: "מעוין", accept: ["מעוין", "מעין", "מעויין"], q: "למרובע כל ארבע הצלעות שוות, אבל הזוויות אינן ישרות. מה שמו?" },
      { he: "אלכסון", accept: ["אלכסון"], q: "איך קוראים לקו שמחבר שני קודקודים שאינם שכנים?" },
      { he: "פאה", accept: ["פאה", "פיאה"], q: "איך קוראים למשטח השטוח של גוף תלת-ממדי?" },
      { he: "מקצוע", accept: ["מקצוע", "מקצע"], q: "איך קוראים לקו שבו שתי פאות של גוף נפגשות?" },
      { he: "היקף", accept: ["היקף", "הקף"], q: "איך קוראים לסכום אורכי כל הצלעות של צורה?" },
      { he: "קוטר", accept: ["קוטר"], q: "איך קוראים לקו שעובר דרך מרכז המעגל מקצה לקצה?" },
      { he: "רדיוס", accept: ["רדיוס", "מחוג"], q: "איך קוראים לקו מהמרכז של המעגל אל הקו שלו?" },
      { he: "זווית ישרה", accept: ["זווית ישרה", "ישרה", "90", "90 מעלות"], q: "איך קוראים לזווית של 90 מעלות?" },
      { he: "זווית חדה", accept: ["זווית חדה", "חדה"], q: "איך קוראים לזווית שקטנה מ-90 מעלות?" },
      { he: "זווית קהה", accept: ["זווית קהה", "קהה"], q: "איך קוראים לזווית שגדולה מ-90 מעלות?" },
    ];
    const s = SHAPES[rint(0, SHAPES.length - 1)];
    return {
      text: s.q + " כתוב/כתבי את השם.",
      answer: s.he, accept: s.accept, answerKind: "text",
      difficulty: 3,
      hints: ["ספור/י קודם צלעות וקודקודים.", "ואז בדוק/בדקי אם הצלעות שוות והזוויות ישרות."],
      explanation: `זו ${s.he}.`,
      skill: "name_shape_write", skillHe: "כתיבת שם צורה",
    };
  }

  // תשובה מילולית לבעיה — בדיוק מה שהמבחן מבקש אחרי "פתרון"
  const scen = rint(0, 2);
  if (scen === 0) {
    const kids = [3, 4, 5, 6][rint(0, 3)];
    const each = rint(2, 9);
    const total = kids * each;
    return {
      text: `${total} ילדים הסתדרו ב-${kids} קבוצות שוות. כתוב/כתבי תשובה מילולית מלאה: בכל קבוצה היו ___ ילדים.`,
      answer: `${each} ילדים`,
      accept: [`${each} ילדים`, `${each}`, `בכל קבוצה ${each} ילדים`, `בכל קבוצה היו ${each} ילדים`, `היו ${each} ילדים`, `${each} ילדים בכל קבוצה`],
      answerKind: "text", difficulty: 4,
      hints: ["קודם חשב/חשבי: כמה בכל קבוצה?", "ואז כתוב/כתבי משפט שלם — מספר ומילה, לא רק ספרה."],
      explanation: `${total} : ${kids} = ${each}. בכל קבוצה היו ${each} ילדים.`,
      skill: "verbal_answer", skillHe: "תשובה מילולית",
    };
  }
  if (scen === 1) {
    const packs = rint(3, 9), price = rint(3, 12);
    const cost = packs * price;
    return {
      text: `קנו ${packs} חבילות במחיר ${price} ₪ כל אחת. כתוב/כתבי תשובה מילולית: כל החבילות עלו ___ ₪.`,
      answer: `${cost} שקלים`,
      accept: [`${cost} שקלים`, `${cost}`, `${cost} ש"ח`, `${cost} שח`, `עלו ${cost} שקלים`, `כל החבילות עלו ${cost} שקלים`, `${cost} שקל`],
      answerKind: "text", difficulty: 4,
      hints: ["'כל אחת' רומז על כפל.", "כתוב/כתבי את המספר ואת המילה 'שקלים' — זו תשובה מילולית."],
      explanation: `${packs} × ${price} = ${cost} שקלים.`,
      skill: "verbal_answer", skillHe: "תשובה מילולית",
    };
  }
  const start = rint(10, 60), gone = rint(3, 9);
  return {
    text: `בגינה היו ${start} פרחים ו-${gone} נקטפו. כתוב/כתבי תשובה מילולית: בגינה נשארו ___ פרחים.`,
    answer: `${start - gone} פרחים`,
    accept: [`${start - gone} פרחים`, `${start - gone}`, `נשארו ${start - gone} פרחים`, `בגינה נשארו ${start - gone} פרחים`, `${start - gone} פרחים נשארו`],
    answerKind: "text", difficulty: 4,
    hints: ["'נקטפו' אומר שהמספר קטן — זה חיסור.", "כתוב/כתבי מספר ומילה, לא רק ספרה."],
    explanation: `${start} − ${gone} = ${start - gone} פרחים.`,
    skill: "verbal_answer", skillHe: "תשובה מילולית",
  };
}

const GENERATORS = {
  addition,
  subtraction,
  addSub100,
  multiplication,
  division,
  percent,
  equation,
  numberSeq,
  shapes,
  shapeCreate,
  addWord,
  subWord,
  money,
  clock,
  numbers1000,
  dataRead,
  solidsCount,
  lengthMeasure,
  numbers10k,
  remainderDiv,
  distributive,
  anglesTriangles,
  rectArea,
  numbersMillion,
  simpleFraction,
  primesFactors,
  wordProblems4,
  volumeBox,
  probability,
  fractionCompare,
  fractionAddSub,
  decimalPlace,
  decimalOps,
  average,
  fractionMulDiv,
  ratioScale,
  circleCalc,
  thinking,
  multiStep,
  missingFactor,
  chooseRight,
  gridShape,
  writeAnswer,
};

/* ══════════════════════════════════════════════════════════════════════
   חוזה-הרמה — הרמה שנתבקשה היא הרמה שנשמרת
   ──────────────────────────────────────────────────────────────────────
   עד כאן כל מחולל חישב difficulty משלו, לרוב מגודל המספרים שיצאו באקראי.
   התוצאה: מחולל שנקרא ברמה 1 החזיר difficulty 2, המאגר (שמפתחו difficulty)
   לא הכיל אף שאלה ברמה 1 — ולכן התלמיד ראה בורר שמציע רק 2–3, ובחירת רמה
   שלא שינתה דבר, כי bank.getQuestion ברמה מדויקת לא מצאה התאמה ונפלה חזרה
   לכל שאלה שהיא. מכאן ואילך הרמה היא קלט, לא פלט.

   LEVEL_SPAN = כמה רמות *שונות באמת* יש למחולל. בקשה מעבר לזה נחתכת כלפי
   מטה, כדי שלא ייווצרו שתי רמות עם אותו תוכן בדיוק.
   ══════════════════════════════════════════════════════════════════════ */
const LEVEL_SPAN = {
  addition: 5, subtraction: 5, addSub100: 5, multiplication: 5, division: 5,
  percent: 4, equation: 5, numberSeq: 3, shapes: 3, shapeCreate: 3,
  addWord: 4, subWord: 4, money: 3, clock: 4,
  numbers1000: 5, dataRead: 4, solidsCount: 3, lengthMeasure: 5, numbers10k: 5,
  remainderDiv: 4, distributive: 4, anglesTriangles: 4, rectArea: 4,
  numbersMillion: 4, simpleFraction: 5, primesFactors: 4, wordProblems4: 4,
  volumeBox: 3, probability: 4, fractionCompare: 4, fractionAddSub: 3,
  decimalPlace: 3, decimalOps: 4, average: 3, fractionMulDiv: 4, ratioScale: 3,
  circleCalc: 3, thinking: 5, multiStep: 4, missingFactor: 4, chooseRight: 3,
  gridShape: 3, writeAnswer: 3,
};

/** כמה רמות יש למחולל (לבורר-הרמות ולבדיקות התכנית). */
function levelSpan(name) {
  return LEVEL_SPAN[name] || 5;
}

// עוטפים כל מחולל ב-autoSkill: תגית מפורשת שהמחולל הגדיר גוברת, וכל השאר
// מקבל תגית מהמבנה. כך האבחון עובד בכל 80+ המחוללים בלי לערוך כל אחד.
const WRAPPED = {};
for (const [name, fn] of Object.entries(GENERATORS)) {
  const span = levelSpan(name);
  WRAPPED[name] = function (level, ...rest) {
    const lv = clamp(Math.round(Number(level) || 1), 1, span);
    const q = fn.apply(null, [lv, ...rest]);
    if (!q) return q;
    q.level = lv;
    q.difficulty = lv;
    if (Array.isArray(q.parts)) return q; // סעיפים מתויגים אחד-אחד
    return autoSkill(q);
  };
}

module.exports = { GENERATORS: WRAPPED, uid, autoSkill, levelSpan, LEVEL_SPAN, ...WRAPPED };
