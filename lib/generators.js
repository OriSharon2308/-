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
  // ברמה גבוהה — שלושה מחוברים
  if (level >= 3) {
    const a = rint(1, Math.max(2, max - 2));
    const b = rint(1, Math.max(1, max - a - 1));
    const c = rint(1, Math.max(1, max - a - b));
    const answer = a + b + c;
    return {
      text: `${a} + ${b} + ${c} = ?`,
      answer,
      difficulty: 3, // רמה 3 = שלושה מחוברים (מבנה קובע את הרמה)
      hints: ["מחברים שניים קודם, ואז מוסיפים את השלישי.", `${a} + ${b} = ${a + b}, ועוד ${c}.`],
      explanation: `${a} + ${b} + ${c} = ${answer}.`,
    };
  }
  const a = rint(0, max);
  const b = rint(0, max - a);
  const answer = a + b;
  const carry = (a % 10) + (b % 10) >= 10;
  // שני מחוברים — נשמר ברמות 1-2 בלבד כדי לא להתנגש ברמת שלושת המחוברים
  const difficulty = clamp(1 + Math.floor(answer / Math.max(5, max / 5)) + (carry ? 1 : 0), 1, 2);
  return {
    text: `${a} + ${b} = ?`,
    answer,
    difficulty,
    hints: ["אפשר לספור קדימה.", `התחל/י מ-${a} והוסף/י ${b}.`],
    explanation: `${a} + ${b} = ${answer}.`,
  };
}

/* ---------- חיסור (בלי תוצאה שלילית) ---------- */
function subtraction(level = 1, p = {}) {
  const max = p.max || 20;
  // ברמה גבוהה — חיסור של שני מספרים ברצף (תוצאה אי-שלילית)
  if (level >= 3) {
    const a = rint(Math.floor(max / 2), max);
    const b = rint(1, Math.max(1, a - 2));
    const c = rint(1, Math.max(1, a - b));
    const answer = a - b - c;
    return {
      text: `${a} − ${b} − ${c} = ?`,
      answer,
      difficulty: 3, // רמה 3 = חיסור של שלושה מספרים ברצף
      hints: ["מחסרים את הראשון, ואז מחסרים שוב מהתוצאה.", `${a} − ${b} = ${a - b}, ופחות ${c}.`],
      explanation: `${a} − ${b} − ${c} = ${answer}.`,
    };
  }
  let a = rint(0, max);
  let b = rint(0, max);
  if (b > a) [a, b] = [b, a];
  const answer = a - b;
  const borrow = a % 10 < b % 10;
  // חיסור של שני מספרים — נשמר ברמות 1-2 בלבד
  const difficulty = clamp(1 + Math.floor(a / Math.max(5, max / 5)) + (borrow ? 1 : 0), 1, 2);
  return {
    text: `${a} − ${b} = ?`,
    answer,
    difficulty,
    hints: ["אפשר לספור אחורה.", `התחל/י מ-${a} וחזור/י ${b} צעדים.`],
    explanation: `${a} − ${b} = ${answer}.`,
  };
}

/* ---------- חיבור וחיסור מעורב (עד max) ---------- */
function addSub100(level = 1, p = {}) {
  const max = p.max || 100;
  // ברמה גבוהה — שלושה מספרים עם חיבור וחיסור באותו תרגיל
  if (level >= 4) {
    if (rint(0, 1) === 0) {
      // a + b − c
      const a = rint(10, max);
      const b = rint(1, max - a);
      const c = rint(1, a + b);
      const answer = a + b - c;
      return {
        text: `${a} + ${b} − ${c} = ?`,
        answer,
        difficulty: clamp(level, 4, 5), // רמות 4-5 = שלושה מספרים, חיבור וחיסור מעורבים
        hints: ["מחשבים משמאל לימין: קודם חיבור ואז חיסור.", `${a} + ${b} = ${a + b}, ופחות ${c}.`],
        explanation: `${a} + ${b} − ${c} = ${answer}.`,
      };
    }
    // a − b + c
    const a = rint(10, max);
    const b = rint(1, a);
    const c = rint(1, max - (a - b));
    const answer = a - b + c;
    return {
      text: `${a} − ${b} + ${c} = ?`,
      answer,
      difficulty: clamp(level, 4, 5),
      hints: ["מחשבים משמאל לימין: קודם חיסור ואז חיבור.", `${a} − ${b} = ${a - b}, ועוד ${c}.`],
      explanation: `${a} − ${b} + ${c} = ${answer}.`,
    };
  }
  // רמה 3 — שני מספרים (פעולה אחת)
  if (rint(0, 1) === 0) {
    const a = rint(0, max);
    const b = rint(0, max - a);
    const answer = a + b;
    return {
      text: `${a} + ${b} = ?`,
      answer,
      difficulty: 3,
      hints: ["אפשר לפרק לעשרות ויחידות.", `${a} + ${b}.`],
      explanation: `${a} + ${b} = ${answer}.`,
    };
  }
  let a = rint(0, max);
  let b = rint(0, max);
  if (b > a) [a, b] = [b, a];
  const answer = a - b;
  return {
    text: `${a} − ${b} = ?`,
    answer,
    difficulty: 3,
    hints: ["אפשר לפרק לעשרות.", `${a} − ${b}.`],
    explanation: `${a} − ${b} = ${answer}.`,
  };
}

/* ---------- כפל ---------- */
function multiplication(level = 1, p = {}) {
  const max = p.max || 10;
  let a;
  let b;
  if (p.twoDigit) {
    a = rint(11, 30);
    b = rint(2, 9);
  } else {
    a = rint(1, max);
    b = rint(1, max);
  }
  const answer = a * b;
  return {
    text: `${a} × ${b} = ?`,
    answer,
    difficulty: clamp(2 + Math.floor(answer / 20), 1, 10),
    hints: ["כפל הוא חיבור חוזר.", `חשב/י ${a} פעמים ${b}.`],
    explanation: `${a} × ${b} = ${answer}.`,
  };
}

/* ---------- חילוק (ללא שארית) ---------- */
function division(level = 1, p = {}) {
  const max = p.max || 10;
  const b = rint(2, max);
  const q = rint(1, max);
  const a = b * q;
  return {
    text: `${a} ÷ ${b} = ?`,
    answer: q,
    difficulty: clamp(2 + Math.floor(a / 20), 1, 10),
    hints: ["חילוק הוא ההפוך של כפל.", `איזה מספר כפול ${b} נותן ${a}?`],
    explanation: `${a} ÷ ${b} = ${q} (כי ${b} × ${q} = ${a}).`,
  };
}

/* ---------- אחוזים ---------- */
function percent(level = 1, p = {}) {
  const opts = [10, 20, 25, 50, 75, 100];
  const pct = opts[rint(0, opts.length - 1)];
  const base = rint(1, 10) * 20;
  const answer = (base * pct) / 100;
  return {
    text: `כמה זה ${pct}% מתוך ${base}?`,
    answer,
    difficulty: clamp(3 + Math.floor(base / 60), 1, 10),
    hints: [`${pct}% זה ${pct} מתוך 100.`, `חשב/י ${base} × ${pct} ÷ 100.`],
    explanation: `${pct}% מתוך ${base} = ${base} × ${pct} ÷ 100 = ${answer}.`,
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
  const kind = rint(0, 2);
  if (kind === 0) {
    const n = rint(0, max - 1);
    return {
      text: `מה המספר שבא אחרי ${n}?`,
      answer: n + 1,
      difficulty: clamp(1 + Math.floor(n / 25), 1, 5),
      hints: ["מוסיפים 1.", `אחרי ${n} בא ${n + 1}.`],
      explanation: `אחרי ${n} בא ${n + 1}.`,
    };
  }
  if (kind === 1) {
    const n = rint(1, max);
    return {
      text: `מה המספר שבא לפני ${n}?`,
      answer: n - 1,
      difficulty: clamp(1 + Math.floor(n / 25), 1, 5),
      hints: ["מורידים 1.", `לפני ${n} בא ${n - 1}.`],
      explanation: `לפני ${n} בא ${n - 1}.`,
    };
  }
  const n = rint(0, max - 2);
  return {
    text: `איזה מספר נמצא בין ${n} ל-${n + 2}?`,
    answer: n + 1,
    difficulty: clamp(2 + Math.floor(n / 25), 1, 6),
    hints: ["המספר באמצע.", `בין ${n} ל-${n + 2} יש את ${n + 1}.`],
    explanation: `בין ${n} ל-${n + 2} נמצא ${n + 1}.`,
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
  const sides = SHAPE_SIDE_POOL[rint(0, SHAPE_SIDE_POOL.length - 1)];
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
    difficulty: clamp(sides - 2 + (askVertices ? 1 : 0), 1, 8),
    hints: askVertices
      ? ["עבור/י על הפינות אחת-אחת וספר/י.", `לצורה הזו יש ${sides} פינות.`]
      : ["עבור/י על הקווים הישרים אחד-אחד וספר/י.", `לצורה הזו יש ${sides} צלעות.`],
    explanation: `לצורה הזו יש ${sides} ${what}.`,
    needsDiagram: true,
    diagramData: { type: "shape", sides, points, size },
  };
}

/* ---------- ציור צורות (הילד מצייר על לוח, הבינה בודקת) ---------- */
// אילוצים: equal=כל הצלעות שוות, right=כל הזוויות ישרות. מרובע=4 צלעות בלבד.
const CREATE_TARGETS = [
  { type: "triangle", label: "משולש", sides: 3, difficulty: 2 },
  { type: "quad", label: "מרובע", sides: 4, difficulty: 2 },
  { type: "rectangle", label: "מלבן", sides: 4, right: true, difficulty: 4 },
  { type: "square", label: "ריבוע", sides: 4, equal: true, right: true, difficulty: 5 },
  { type: "equilateral", label: "משולש שווה-צלעות", sides: 3, equal: true, difficulty: 5 },
  // מצולעים מרובי-צלעות — לפי מספר הצלעות בלבד, בלי שם (מחומש/משושה...)
  { type: "polygon", label: "מצולע בעל 5 צלעות", sides: 5, difficulty: 4 },
  { type: "polygon", label: "מצולע בעל 6 צלעות", sides: 6, difficulty: 5 },
  { type: "polygon", label: "מצולע בעל 7 צלעות", sides: 7, difficulty: 6 },
  { type: "polygon", label: "מצולע בעל 8 צלעות", sides: 8, difficulty: 7 },
];
function shapeCreate(level = 1) {
  const t = CREATE_TARGETS[rint(0, CREATE_TARGETS.length - 1)];
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
    difficulty: t.difficulty,
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
function addWord(level = 1, p = {}) {
  const max = p.max || 20;
  const a = rint(1, Math.max(2, max - 1));
  const b = rint(1, Math.max(1, max - a));
  const item = WORD_ITEMS[rint(0, WORD_ITEMS.length - 1)];
  const answer = a + b;
  return {
    text: `בקופסה היו ${a} ${item}, והוסיפו עוד ${b}. כמה ${item} יש עכשיו?`,
    answer,
    difficulty: clamp(2 + Math.floor(answer / 8), 2, 8),
    hints: [`צריך לחבר: ${a} + ${b}.`, "סופרים את הכול ביחד."],
    explanation: `${a} + ${b} = ${answer} ${item}.`,
    needsDiagram: false,
  };
}
function subWord(level = 1, p = {}) {
  const max = p.max || 20;
  const a = rint(2, max);
  const b = rint(1, a - 1);
  const item = WORD_ITEMS[rint(0, WORD_ITEMS.length - 1)];
  const answer = a - b;
  return {
    text: `בצלחת היו ${a} ${item}, ואכלו ${b}. כמה ${item} נשארו?`,
    answer,
    difficulty: clamp(2 + Math.floor(a / 8), 2, 8),
    hints: [`צריך לחסר: ${a} − ${b}.`, "כמה נשאר אחרי שמורידים."],
    explanation: `${a} − ${b} = ${answer} ${item}.`,
    needsDiagram: false,
  };
}

/* ---------- כסף ומטבעות (כמה שקלים) ---------- */
function money(level = 1) {
  const coins = [1, 2, 5, 10];
  const n = rint(2, 5);
  const picked = [];
  for (let i = 0; i < n; i++) picked.push(coins[rint(0, coins.length - 1)]);
  const answer = picked.reduce((s, c) => s + c, 0);
  return {
    text: `כמה שקלים יש כאן?`,
    answer,
    difficulty: clamp(1 + Math.floor(answer / 8), 1, 6),
    hints: ["חבר/י את כל המטבעות.", "התחל/י מהמטבע הגדול."],
    explanation: `סה״כ ${picked.join(" + ")} = ${answer} שקלים.`,
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
  const hour = rint(1, 12);
  const kind = CLOCK_KINDS[rint(0, CLOCK_KINDS.length - 1)];

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
    const minute = MIN_STEPS[rint(0, MIN_STEPS.length - 1)];
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
      diagramData: { type: "kit", widget: "place_value_table", params: { value: n, upto: 3 }, w: 420, h: 200, alt: `טבלת ערך-מקום של ${n}` },
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
];

function solidsCount(level = 1, p = {}) {
  const lv = clamp(level, 1, 3);
  // L1 חייב לכלול גוף שאינו קובייה/תיבה: לשתיהן 6 פאות, ולכן רמה שמורכבת רק
  // מהן מלמדת "התשובה תמיד 6" במקום לספור.
  const pool = lv === 1 ? [SOLIDS[0], SOLIDS[2], SOLIDS[3], SOLIDS[4]] : SOLIDS;
  const s = pool[rint(0, pool.length - 1)];
  const kinds = lv === 1 ? ["faces"] : lv === 2 ? ["faces", "vertices"] : ["faces", "vertices", "edges"];
  const kind = kinds[rint(0, kinds.length - 1)];
  const HE = { faces: "פאות", vertices: "קדקודים", edges: "מקצועות" };
  const TIP = {
    faces: "פאה היא משטח שאפשר להניח עליו את הגוף. אל תשכח/י את התחתית ואת המכסה.",
    vertices: "קדקוד הוא פינה חדה שבה נפגשות כמה פאות. לגליל אין אף אחת.",
    edges: "מקצוע הוא הקו שבו שתי פאות נפגשות.",
  };
  return {
    text: `כמה ${HE[kind]} יש ל${s.he}?`,
    answer: s[kind],
    difficulty: lv === 1 ? 2 : lv === 2 ? 3 : 4,
    hints: [TIP[kind], "עבוד/עבדי לפי סדר קבוע כדי לא לספור פעמיים — ותעזר/י גם בפריסה שבצד."],
    explanation: `ל${s.he} יש ${s[kind]} ${HE[kind]}. הפריסה שלצד הגוף מראה את זה.`,
    needsDiagram: true,
    diagramData: { type: "kit", widget: "solid_net", params: { solid: s.key }, w: 400, h: 240, alt: `${s.he} והפריסה שלה` },
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
    const toCm = rint(0, 1) === 0;
    const m = rint(2, 12);
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
};

module.exports = { GENERATORS, uid, ...GENERATORS };
