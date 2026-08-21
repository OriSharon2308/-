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
      diagramData: { type: "kit", widget: "place_value_table", params: { value: n, upto: 4 }, w: 420, h: 200, alt: `טבלת ערך-מקום של ${n}` },
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
  const a = rint(2, 9), b = rint(2, 9), c = rint(2, 6), d = rint(2, 6);
  return {
    text: `${a} × ${b} − ${c} × ${d} =`,
    answer: a * b - c * d,
    difficulty: 5,
    hints: ["שני הכפלים קודמים לחיסור.", "חשב/י כל כפל בנפרד, ורק אז חסר/י."],
    explanation: `${a}×${b} = ${a * b}, ${c}×${d} = ${c * d}. ${a * b} − ${c * d} = ${a * b - c * d}.`,
  };
}

/** זוויות ומשולשים — מדידה במד-זווית וחישוב זווית חסרה. */
function anglesTriangles(level = 1, p = {}) {
  const lv = clamp(level, 1, 4);

  if (lv <= 2) {
    const ang = lv === 1 ? [30, 45, 60, 90, 120, 150][rint(0, 5)] : rint(3, 34) * 5;
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
      diagramData: { type: "kit", widget: "place_value_table", params: { value: n, upto: 6 }, w: 420, h: 200, alt: `טבלת ערך-מקום של ${n}` },
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

  if (lv === 1) {
    const parts = [2, 3, 4, 5, 6, 8][rint(0, 5)];
    const shaded = rint(1, parts - 1);
    return {
      text: `כמה חלקים צבועים בציור?`,
      answer: shaded,
      difficulty: 1,
      hints: ["ספור/י רק את החלקים הצבועים.", "החלק התחתון של השבר הוא כמה חלקים יש בסך הכול — כאן שואלים על העליון."],
      explanation: `צבועים ${shaded} מתוך ${parts}, כלומר ${shaded}/${parts}.`,
      needsDiagram: true,
      diagramData: { type: "kit", widget: "interactive_fraction", params: { shape: "bar", parts, shaded }, w: 360, h: 220, alt: "מוט שברים" },
    };
  }

  if (lv === 2) {
    const parts = [4, 5, 6, 8, 10][rint(0, 4)];
    const shaded = rint(1, parts - 1);
    return {
      text: `לכמה חלקים מחולק השלם בציור?`,
      answer: parts,
      difficulty: 2,
      hints: ["סופרים את *כל* החלקים — גם הצבועים וגם הריקים.", "המספר הזה הוא המכנה: החלק התחתון של השבר."],
      explanation: `השלם מחולק ל-${parts} חלקים שווים, ולכן המכנה הוא ${parts}.`,
      needsDiagram: true,
      diagramData: { type: "kit", widget: "interactive_fraction", params: { shape: "bar", parts, shaded }, w: 360, h: 220, alt: "מוט שברים" },
    };
  }

  if (lv === 3) {
    const PAIRS = [[2, 4], [2, 6], [2, 8], [2, 10], [3, 6], [3, 9], [4, 8], [4, 12], [5, 10]];
    const [small, big] = PAIRS[rint(0, PAIRS.length - 1)];
    return {
      text: `כמה חלקים מתוך ${big} שווים לחלק אחד מתוך ${small}?`,
      answer: big / small,
      difficulty: 4,
      hints: [`הסתכל/י בקיר-השברים: שורת ה-${small} מול שורת ה-${big}.`, `כמה חלקים של 1/${big} נכנסים בתוך 1/${small}?`],
      explanation: `1/${small} = ${big / small}/${big}, כי ${big} : ${small} = ${big / small}.`,
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
    const n = [12, 16, 18, 20, 24, 28, 30, 36, 40][rint(0, 8)];
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
    const PRIMES = [7, 11, 13, 17, 19, 23, 29];
    const isPrime = rint(0, 1) === 0;
    const n = isPrime ? PRIMES[rint(0, PRIMES.length - 1)] : [9, 15, 21, 25, 27, 33, 35, 49][rint(0, 7)];
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

  const base = rint(2, 9), exp = rint(2, 3);
  return {
    text: `${base} בחזקת ${exp} = ?`,
    answer: Math.pow(base, exp),
    difficulty: 5,
    hints: [`חזקה היא כפל חוזר: ${base} כפול עצמו ${exp} פעמים.`, `${base} × ${base}${exp === 3 ? " × " + base : ""}`],
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
      difficulty: 1,
      hints: ["'בסך הכול' — מחברים את כל הצבעים.", "אל תשכח/י אף צבע."],
      explanation: `${red} + ${blue} + ${green} = ${total}.`,
    };
  }
  if (lv === 2) {
    return {
      text: `בשקית ${red} כדורים אדומים, ${blue} כחולים ו-${green} ירוקים. כמה מקרים מתאימים ל"מוציאים כדור כחול"?`,
      answer: blue,
      difficulty: 3,
      hints: ["מקרה מתאים = כדור שעונה על מה שביקשנו.", "סופרים רק את הכחולים."],
      explanation: `יש ${blue} כדורים כחולים, ולכן ${blue} מקרים מתאימים מתוך ${total}.`,
    };
  }
  if (lv === 3) {
    const thr = rint(2, 5);
    return {
      text: `מטילים קובייה רגילה (1 עד 6). כמה תוצאות גדולות מ-${thr}?`,
      answer: 6 - thr,
      difficulty: 4,
      hints: ["רשום/רשמי את כל התוצאות: 1, 2, 3, 4, 5, 6.", `סמן/סמני את אלה שגדולות מ-${thr} — וספור/י.`],
      explanation: `התוצאות הגדולות מ-${thr} הן ${Array.from({ length: 6 - thr }, (_, i) => thr + 1 + i).join(", ")} — ${6 - thr} תוצאות.`,
    };
  }
  const need = Math.abs(red - blue);
  return {
    text: `בשקית ${red} כדורים אדומים ו-${blue} כחולים. כמה כדורים צריך להוסיף לצבע החסר כדי שיהיו שווים?`,
    answer: need,
    difficulty: 4,
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
  const d1 = [2, 3, 4][rint(0, 2)];
  const d2 = [5, 6, 8][rint(0, 2)];
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
    return {
      text: `כמה עשיריות צבועות בציור?`,
      answer: filled,
      difficulty: 1,
      hints: ["השלם מחולק לעשרה חלקים — כל חלק הוא עשירית.", "ספור/י רק את הצבועים."],
      explanation: `${filled} מתוך 10, כלומר ${filled}/10 = 0.${filled}.`,
      needsDiagram: true,
      diagramData: { type: "kit", widget: "decimal_grid", params: { rows: 1, filled, lock: true }, w: 340, h: 360, alt: "רשת עשיריות" },
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
  const scale = [100, 1000][rint(0, 1)];
  const cm = rint(2, 9);
  return {
    text: `בקנה מידה 1:${scale}, קטע באורך ${cm} ס״מ במפה — כמה ס״מ במציאות?`,
    answer: cm * scale,
    difficulty: 4,
    hints: [`1:${scale} אומר שכל ס״מ במפה הוא ${scale} ס״מ במציאות.`, `אז כופלים ${cm} ב-${scale}.`],
    explanation: `${cm} × ${scale} = ${cm * scale} ס״מ.`,
  };
}

/** מעגל — היקף ושטח. */
function circleCalc(level = 1, p = {}) {
  const lv = clamp(level, 1, 3);
  const r = rint(2, 12);

  if (lv === 1) {
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
    return {
      text: `קוטר המעגל ${r * 2} ס״מ. מה ההיקף? (π = 3.14)`,
      answer: +(3.14 * r * 2).toFixed(2),
      answerKind: "decimal",
      difficulty: 4,
      hints: ["היקף = π כפול הקוטר.", `3.14 × ${r * 2}`],
      explanation: `3.14 × ${r * 2} = ${+(3.14 * r * 2).toFixed(2)} ס״מ.`,
      needsDiagram: true,
      diagramData: { type: "kit", widget: "circle_parts", params: { radius: r, show: "diameter", lock: true }, w: 340, h: 260, alt: "מעגל" },
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
};

module.exports = { GENERATORS, uid, ...GENERATORS };
