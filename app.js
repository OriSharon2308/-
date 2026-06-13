const STORAGE_KEY = "learning-prototype-v1";
const UI_KEY = "learning-prototype-ui-v1";
const USER_KEY = "learning-prototype-user-id";

// המשתמש המחובר (נטען מ-/api/me). מפתחות ה-localStorage מקבלים סיומת לפי החשבון
// כדי ששני תלמידים שמתחברים מאותו דפדפן לא יראו זה את הנתונים של זה.
let CURRENT_USER = null;
function scopedKey(base) {
  return CURRENT_USER ? `${base}:${CURRENT_USER.id}` : base;
}

/** מזהה תלמיד יציב — הבסיס לזיכרון המתמשך של הסוכנים */
function getUserId() {
  try {
    let id = localStorage.getItem(USER_KEY);
    if (!id) {
      id = `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem(USER_KEY, id);
    }
    return id;
  } catch {
    return "default";
  }
}

function nowTime() {
  return new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function safeParseInt(text) {
  const cleaned = String(text ?? "")
    .replace(/[^\d\-]/g, "")
    .trim();
  if (!cleaned) return null;
  const n = Number.parseInt(cleaned, 10);
  return Number.isFinite(n) ? n : null;
}

function formatPercent(n) {
  if (!Number.isFinite(n)) return "—";
  return `${Math.round(n * 100)}%`;
}

function saveState(state) {
  try {
    localStorage.setItem(scopedKey(STORAGE_KEY), JSON.stringify(state));
  } catch {
    // ignore
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(scopedKey(STORAGE_KEY));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveUi(uiState) {
  try {
    localStorage.setItem(scopedKey(UI_KEY), JSON.stringify(uiState));
  } catch {
    // ignore
  }
}

function loadUi() {
  try {
    const raw = localStorage.getItem(scopedKey(UI_KEY));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function makeProblem(level) {
  // Level 1: + and - within 0..20
  // Level 2: + and - within 0..100
  // Level 3+: add some multiplication (small) gradually
  const L = clamp(level ?? 1, 1, 10);

  const allowMul = L >= 3;
  const max = L === 1 ? 20 : L === 2 ? 100 : 200 + (L - 3) * 100;

  const pick = (min, maxInclusive) => {
    const span = maxInclusive - min + 1;
    return min + Math.floor(Math.random() * span);
  };

  const opRoll = Math.random();
  let op = "+";
  if (allowMul && opRoll < 0.22) op = "×";
  else if (opRoll < 0.56) op = "+";
  else op = "−";

  let a = pick(0, max);
  let b = pick(0, max);

  if (op === "×") {
    const mulMax = L <= 4 ? 10 : L <= 6 ? 12 : 15;
    a = pick(0, mulMax);
    b = pick(0, mulMax);
  }

  if (op === "−" && b > a) {
    const tmp = a;
    a = b;
    b = tmp;
  }

  const answer = op === "+" ? a + b : op === "−" ? a - b : a * b;

  const hints = buildHints({ a, b, op, answer, level: L });
  const explanation = buildExplanation({ a, b, op, answer, level: L });

  return {
    id: crypto.randomUUID?.() ?? String(Date.now()),
    a,
    b,
    op,
    answer,
    text: `${a} ${op} ${b} = ?`,
    hints,
    explanation,
    createdAt: Date.now(),
  };
}

function buildHints({ a, b, op, level }) {
  if (op === "×") {
    if (level <= 4) {
      return [
        "תחשוב/י על כפל כחיבור חוזר.",
        `אפשר לחשב ${a} פעמים ${b}: זה כמו ${b} + ${b} + ... (סה״כ ${a} פעמים).`,
      ];
    }
    return ["אפשר לפרק למספרים נוחים.", `לדוגמה: אם ${b} קרוב ל-10, נסה/י להשתמש בזה.`];
  }

  if (op === "+") {
    if (a <= 20 && b <= 20) {
      return ["אפשר לספור קדימה.", `התחל/י מ-${a} והוסף/י ${b} צעדים.`];
    }
    return ["אפשר להשלים לעשרות.", `נסה/י לפרק: ${b} = ${(b % 10) || 10} + ${b - ((b % 10) || 10)}.`];
  }

  // subtraction
  if (a <= 20 && b <= 20) {
    return ["אפשר לספור אחורה.", `התחל/י מ-${a} וחזור/י ${b} צעדים.`];
  }
  return ["אפשר לפרק לעשרות.", `נסה/י: ${a} = ${a - (a % 10)} + ${a % 10}.`];
}

function buildExplanation({ a, b, op, answer }) {
  if (op === "+") return `${a} + ${b} = ${answer}. אפשר לחשב בשתי דרכים: לספור קדימה, או לפרק את אחד המספרים לעשרות ויחידות.`;
  if (op === "−") return `${a} − ${b} = ${answer}. אפשר לחשב בספירה אחורה, או לפרק את ${b} לעשרות ויחידות ולהחסיר בשלבים.`;
  return `${a} × ${b} = ${answer}. כפל הוא חיבור חוזר: ${a} פעמים ${b}.`;
}

function topicKindLabel(kind) {
  switch (kind) {
    case "regular":
      return "תרגילים רגילים";
    case "equations":
      return "משוואות";
    case "probability":
      return "הסתברות";
    case "functions":
      return "פונקציות";
    case "variables":
      return "נעלמים";
    case "geometry":
      return "גאומטריה";
    default:
      return "נושא";
  }
}

function createTopic(kind, title) {
  const id = crypto.randomUUID?.() ?? String(Date.now());
  const t = {
    id,
    kind,
    title: title || topicKindLabel(kind),
    createdAt: Date.now(),
    level: 1,
    attempts: 0,
    correct: 0,
    streak: 0,
    wrongStreak: 0,
    problems: [],
    currentProblemIndex: 0,
    chatHistory: [],
  };
  return t;
}

function parseAnswerToNumberOrFraction(text) {
  const s = String(text ?? "").trim().replace(/\s+/g, "");
  if (!s) return null;
  // fraction like 1/6
  const frac = s.match(/^(-?\d+)\s*\/\s*(-?\d+)$/);
  if (frac) {
    const a = Number(frac[1]);
    const b = Number(frac[2]);
    if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
    return a / b;
  }
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// שעה "H:MM" → דקות מתחילת מחזור 12 שעות
function parseTimeAnswer(s) {
  const m = String(s ?? "").trim().match(/^(\d{1,2})\s*[:.]\s*(\d{1,2})$/);
  if (!m) return null;
  const h = parseInt(m[1], 10) % 12;
  const min = parseInt(m[2], 10);
  if (min > 59) return null;
  return h * 60 + min;
}

function answersMatch(givenText, expected) {
  if (expected == null) return false;
  const expTime = parseTimeAnswer(expected);
  if (expTime != null) {
    const gotTime = parseTimeAnswer(givenText);
    return gotTime != null && gotTime === expTime;
  }
  const expNum = typeof expected === "number" ? expected : parseAnswerToNumberOrFraction(String(expected));
  const gotNum = parseAnswerToNumberOrFraction(givenText);
  if (expNum != null && gotNum != null) return Math.abs(expNum - gotNum) < 1e-3;
  return String(givenText ?? "").trim() === String(expected).trim();
}

function generateTopicProblem(kind, level) {
  const L = clamp(level ?? 1, 1, 10);
  if (kind === "regular") return makeProblem(L);

  const id = crypto.randomUUID?.() ?? String(Date.now());
  const pick = (min, maxInclusive) => min + Math.floor(Math.random() * (maxInclusive - min + 1));

  if (kind === "equations" || kind === "variables") {
    // ax + b = c, integer solution
    const x = pick(0, 12 + L);
    const a = pick(1, 6 + Math.floor(L / 2));
    const b = pick(0, 20 + L * 2);
    const c = a * x + b;
    return {
      id,
      text: `${a}x + ${b} = ${c}. מצא/י את x`,
      answer: x,
      hints: ["תבודד/י את x: קודם תחסיר/י את b משני הצדדים.", "אחר כך תחלק/י ב-a כדי לקבל את x."],
      explanation: `כדי לפתור: ${a}x + ${b} = ${c}\nמחסירים ${b}: ${a}x = ${c - b}\nמחלקים ב-${a}: x = ${(c - b) / a}`,
      createdAt: Date.now(),
    };
  }

  if (kind === "probability") {
    const sides = L <= 4 ? 6 : 8;
    const target = pick(1, sides);
    return {
      id,
      text: `מטילים קובייה עם ${sides} צדדים. מה ההסתברות לקבל ${target}? (אפשר לכתוב 1/${sides})`,
      answer: `1/${sides}`,
      hints: ["כמה תוצאות אפשריות יש בסה״כ?", "כמה תוצאות “טובות” יש? כאן רק אחת."],
      explanation: `סה״כ תוצאות: ${sides}. תוצאות טובות: 1.\nלכן ההסתברות היא 1/${sides}.`,
      createdAt: Date.now(),
    };
  }

  if (kind === "functions") {
    const m = pick(-5, 5) || 2;
    const b = pick(-10, 10);
    const x = pick(-5, 8);
    const y = m * x + b;
    return {
      id,
      text: `נתונה הפונקציה f(x) = ${m}x + ${b}. חשב/י f(${x})`,
      answer: y,
      hints: ["מציבים את x בתוך הפונקציה.", `חשב/י קודם ${m}×${x}, ואז הוסף/י ${b}.`],
      explanation: `מציבים x=${x}:\nf(${x}) = ${m}·${x} + ${b} = ${m * x} + ${b} = ${y}`,
      createdAt: Date.now(),
    };
  }

  // fallback
  return makeProblem(L);
}

function classifyUserMessage(text) {
  const t = String(text ?? "").trim();
  if (!t) return { kind: "Empty" };

  const num = safeParseInt(t);
  if (num !== null && /^-?\d+$/.test(t.replace(/\s+/g, ""))) return { kind: "AnswerAttempt", answer: num };

  if (/(רמז|תן רמז|עזרה)/i.test(t)) return { kind: "HintRequest" };
  if (/(תסביר|הסבר|למה|איך)/i.test(t)) return { kind: "ExplainRequest" };

  // common phrasing like "התשובה היא 12"
  const match = t.match(/(-?\d+)/);
  if (match && /(תשובה|זה|שווה|=)/.test(t)) return { kind: "AnswerAttempt", answer: safeParseInt(match[1]) };

  if (/(היי|שלום|מה שלומך|מי אתה)/i.test(t)) return { kind: "SmallTalk" };
  if (/(תרגיל חדש|שאלה חדשה|תן לי תרגיל|עוד תרגיל)/i.test(t)) return { kind: "NewProblem" };

  return { kind: "Question" };
}

function estimateDifficultyNext(state, wasCorrect) {
  const s = { ...state };
  s.attempts = (s.attempts ?? 0) + 1;
  s.correct = (s.correct ?? 0) + (wasCorrect ? 1 : 0);
  s.streak = wasCorrect ? (s.streak ?? 0) + 1 : 0;

  const accuracy = s.attempts > 0 ? s.correct / s.attempts : 0;
  // quick heuristic: if 3 streak and accuracy >= 80% => up; if 2 wrong in a row => down
  if (wasCorrect && s.streak >= 3 && accuracy >= 0.8) {
    s.level = clamp((s.level ?? 1) + 1, 1, 10);
    s.streak = 0; // reset streak after level-up to avoid jumping too fast
  }
  if (!wasCorrect) {
    s.wrongStreak = (s.wrongStreak ?? 0) + 1;
    if (s.wrongStreak >= 2) {
      s.level = clamp((s.level ?? 1) - 1, 1, 10);
      s.wrongStreak = 0;
    }
  } else {
    s.wrongStreak = 0;
  }

  return s;
}

function ui() {
  return {
    topicsBtn: document.getElementById("topicsBtn"),
    topicsDrawer: document.getElementById("topicsDrawer"),
    topicsOverlay: document.getElementById("topicsOverlay"),
    topicsCloseBtn: document.getElementById("topicsCloseBtn"),
    newTopicBtn: document.getElementById("newTopicBtn"),
    topicsList: document.getElementById("topicsList"),
    topicsListView: document.getElementById("topicsListView"),
    topicPickerView: document.getElementById("topicPickerView"),
    topicPicker: document.getElementById("topicPicker"),
    pickerBackBtn: document.getElementById("pickerBackBtn"),
    topicLabel: document.getElementById("topicLabel"),
    problemText: document.getElementById("problemText"),
    answerInput: document.getElementById("answerInput"),
    checkBtn: document.getElementById("checkBtn"),
    answerRowNumeric: document.getElementById("answerRowNumeric"),
    answerRowTime: document.getElementById("answerRowTime"),
    timeHour: document.getElementById("timeHour"),
    timeMin: document.getElementById("timeMin"),
    checkTimeBtn: document.getElementById("checkTimeBtn"),
    answerRowInteractive: document.getElementById("answerRowInteractive"),
    interactiveHint: document.getElementById("interactiveHint"),
    doneBtn: document.getElementById("doneBtn"),
    lessonCard: document.getElementById("lessonCard"),
    shapeCreatorCard: document.getElementById("shapeCreatorCard"),
    shapeRequest: document.getElementById("shapeRequest"),
    shapeBoard: document.getElementById("shapeBoard"),
    shapeDoneBtn: document.getElementById("shapeDoneBtn"),
    shapeClearBtn: document.getElementById("shapeClearBtn"),
    prevProblemBtn: document.getElementById("prevProblemBtn"),
    nextProblemBtn: document.getElementById("nextProblemBtn"),
    hint1Btn: document.getElementById("hint1Btn"),
    hint2Btn: document.getElementById("hint2Btn"),
    explainBtn: document.getElementById("explainBtn"),
    newProblemBtn: document.getElementById("newProblemBtn"),
    feedbackBox: document.getElementById("feedbackBox"),
    difficultyPill: document.getElementById("difficultyPill"),
    accuracyValue: document.getElementById("accuracyValue"),
    streakValue: document.getElementById("streakValue"),
    attemptsValue: document.getElementById("attemptsValue"),
    chatLog: document.getElementById("chatLog"),
    chatInput: document.getElementById("chatInput"),
    sendBtn: document.getElementById("sendBtn"),
    aiIndicator: document.getElementById("aiIndicator"),
    aiDot: document.getElementById("aiDot"),
    agentDebugBody: document.getElementById("agentDebugBody"),
    agentDebugToggle: document.getElementById("agentDebugToggle"),
    agentDebug: document.getElementById("agentDebug"),
    chatSidebar: document.getElementById("chatSidebar"),
    chatToggleBtn: document.getElementById("chatToggleBtn"),
    chatResizeHandle: document.getElementById("chatResizeHandle"),
    resetBtn: document.getElementById("resetBtn"),
    problemDiagram: document.getElementById("problemDiagram"),
    userChip: document.getElementById("userChip"),
    userChipName: document.getElementById("userChipName"),
    logoutBtn: document.getElementById("logoutBtn"),
    deleteAccountBtn: document.getElementById("deleteAccountBtn"),
  };
}

function showProblemDiagram(u, svg, altText) {
  const el = u.problemDiagram;
  if (!el) return;
  if (!svg) {
    el.hidden = true;
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = "";
    return;
  }
  el.hidden = false;
  el.setAttribute("aria-hidden", "false");
  if (altText) el.setAttribute("aria-label", altText);
  el.innerHTML = svg;
}

/* ---------- הדמיית חפצים לחיבור/חיסור (עזרה ויזואלית לילד) ---------- */

const VIZ_OBJECTS = ["🍎", "✏️", "⭐", "🍌", "🎈", "🌸", "🍪", "⚽", "🐠", "🧸"];

function vizObjectFor(text) {
  let h = 0;
  for (const ch of String(text)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return VIZ_OBJECTS[h % VIZ_OBJECTS.length];
}

function vizRepeat(emoji, n, cls) {
  let s = "";
  for (let i = 0; i < n; i++) s += `<span class="obj${cls ? ` ${cls}` : ""}">${emoji}</span>`;
  return s;
}

/** בונה הדמיית חפצים מטקסט תרגיל חיבור/חיסור, או null אם לא מתאים. */
function buildArithViz(text) {
  const m = String(text ?? "").match(/(\d+)\s*([+\-−])\s*(\d+)/);
  if (!m) return null;
  const a = parseInt(m[1], 10);
  const b = parseInt(m[3], 10);
  const op = m[2];
  const emoji = vizObjectFor(text);
  if (op === "+") {
    if (a + b > 50) return null;
    return `<div class="objViz"><span class="objViz__group">${vizRepeat(emoji, a)}</span><span class="objViz__op">+</span><span class="objViz__group">${vizRepeat(emoji, b)}</span></div>`;
  }
  // חיסור אינטראקטיבי — כל החפצים מוצגים, התלמיד לוחץ כדי "להוריד" אותם בעצמו
  if (a > 50) return null;
  return `<div class="objViz objViz--interactive"><span class="objViz__group">${vizRepeat(emoji, a, "obj--clickable")}</span></div>`;
}

/** מציג איור שרת אם יש; הדמיית חפצים לא מוצגת אוטומטית (רק כשהתלמיד מתקשה). */
function showProblemVisual(u, p) {
  if (!p) return showProblemDiagram(u, null);
  if (p.diagramSvg) return showProblemDiagram(u, p.diagramSvg, p.diagramAlt);
  return showProblemDiagram(u, null);
}

/* ---------- שעון אינטראקטיבי: הילד גורר את המחוגים ---------- */
const SVG_NS = "http://www.w3.org/2000/svg";

/** בונה שעון שניתן לגרור את מחוגיו לתוך container. השעה הנוכחית נשמרת ב-container._clockState. */
function renderInteractiveClock(container) {
  if (!container) return;
  const cx = 100;
  const cy = 100;
  const r = 85;
  const HOUR_LEN = 50;
  const MIN_LEN = 70;
  const state = { hour: 12, minute: 0 }; // מתחילים מ-12:00

  container.hidden = false;
  container.setAttribute("aria-hidden", "false");
  container.innerHTML = "";

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 200 200");
  svg.setAttribute("class", "interactiveClock");

  const circle = document.createElementNS(SVG_NS, "circle");
  circle.setAttribute("cx", cx);
  circle.setAttribute("cy", cy);
  circle.setAttribute("r", r);
  circle.setAttribute("fill", "#fff");
  circle.setAttribute("stroke", "#334155");
  circle.setAttribute("stroke-width", "3");
  svg.appendChild(circle);

  for (let i = 1; i <= 12; i++) {
    const a = ((i * 30 - 90) * Math.PI) / 180;
    const t = document.createElementNS(SVG_NS, "text");
    t.setAttribute("x", (cx + Math.cos(a) * (r - 20)).toFixed(1));
    t.setAttribute("y", (cy + Math.sin(a) * (r - 20) + 6).toFixed(1));
    t.setAttribute("text-anchor", "middle");
    t.setAttribute("font-size", "18");
    t.setAttribute("font-weight", "700");
    t.setAttribute("fill", "#334155");
    t.textContent = String(i);
    svg.appendChild(t);
  }

  const hourHand = document.createElementNS(SVG_NS, "line");
  hourHand.setAttribute("x1", cx);
  hourHand.setAttribute("y1", cy);
  hourHand.setAttribute("stroke", "#0f172a");
  hourHand.setAttribute("stroke-width", "6");
  hourHand.setAttribute("stroke-linecap", "round");
  svg.appendChild(hourHand);

  const minHand = document.createElementNS(SVG_NS, "line");
  minHand.setAttribute("x1", cx);
  minHand.setAttribute("y1", cy);
  minHand.setAttribute("stroke", "#0d9488");
  minHand.setAttribute("stroke-width", "4");
  minHand.setAttribute("stroke-linecap", "round");
  svg.appendChild(minHand);

  const pin = document.createElementNS(SVG_NS, "circle");
  pin.setAttribute("cx", cx);
  pin.setAttribute("cy", cy);
  pin.setAttribute("r", "5");
  pin.setAttribute("fill", "#0f172a");
  svg.appendChild(pin);

  function draw() {
    const ha = (((state.hour % 12) * 30 - 90) * Math.PI) / 180;
    const ma = ((state.minute * 6 - 90) * Math.PI) / 180;
    hourHand.setAttribute("x2", (cx + Math.cos(ha) * HOUR_LEN).toFixed(1));
    hourHand.setAttribute("y2", (cy + Math.sin(ha) * HOUR_LEN).toFixed(1));
    minHand.setAttribute("x2", (cx + Math.cos(ma) * MIN_LEN).toFixed(1));
    minHand.setAttribute("y2", (cy + Math.sin(ma) * MIN_LEN).toFixed(1));
    container._clockState = { hour: state.hour, minute: state.minute };
  }

  let active = null;
  function toSvg(ev) {
    const rect = svg.getBoundingClientRect();
    return {
      px: ((ev.clientX - rect.left) / rect.width) * 200,
      py: ((ev.clientY - rect.top) / rect.height) * 200,
    };
  }
  function update(px, py) {
    const deg = (Math.atan2(py - cy, px - cx) * 180) / Math.PI;
    if (active === "minute") {
      let m = Math.round((deg + 90) / 6);
      m = (((Math.round(m / 5) * 5) % 60) + 60) % 60;
      state.minute = m;
    } else {
      let h = Math.round((deg + 90) / 30);
      h = ((h % 12) + 12) % 12;
      state.hour = h === 0 ? 12 : h;
    }
    draw();
  }
  function onDown(ev) {
    ev.preventDefault();
    const { px, py } = toSvg(ev);
    const d = Math.hypot(px - cx, py - cy);
    active = d < (HOUR_LEN + MIN_LEN) / 2 ? "hour" : "minute"; // קרוב למרכז = שעות
    update(px, py);
    if (svg.setPointerCapture && ev.pointerId != null) svg.setPointerCapture(ev.pointerId);
  }
  function onMove(ev) {
    if (!active) return;
    const { px, py } = toSvg(ev);
    update(px, py);
  }
  function onUp() {
    active = null;
  }
  svg.addEventListener("pointerdown", onDown);
  svg.addEventListener("pointermove", onMove);
  svg.addEventListener("pointerup", onUp);
  svg.addEventListener("pointercancel", onUp);

  container.appendChild(svg);
  draw();
}

/* ---------- יצירת צורות: לוח משבצות לציור + ולידציה גאומטרית ---------- */

const SHAPE_TYPE_HE = {
  triangle: "משולש",
  quad: "מרובע",
  rectangle: "מלבן",
  square: "ריבוע",
  equilateral: "משולש שווה-צלעות",
  pentagon: "מחומש",
  hexagon: "משושה",
};

function segmentsIntersect(a, b, c, d) {
  const ccw = (p, q, r) => (r[1] - p[1]) * (q[0] - p[0]) > (q[1] - p[1]) * (r[0] - p[0]);
  return ccw(a, c, d) !== ccw(b, c, d) && ccw(a, b, c) !== ccw(a, b, d);
}
function polygonSelfIntersects(pts) {
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(i - j) <= 1 || (i === 0 && j === n - 1)) continue;
      if (segmentsIntersect(pts[i], pts[(i + 1) % n], pts[j], pts[(j + 1) % n])) return true;
    }
  }
  return false;
}
function sideLengths(pts) {
  const n = pts.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    out.push(Math.hypot(a[0] - b[0], a[1] - b[1]));
  }
  return out;
}
function interiorAngles(pts) {
  const n = pts.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = pts[(i - 1 + n) % n];
    const b = pts[i];
    const c = pts[(i + 1) % n];
    const v1 = [a[0] - b[0], a[1] - b[1]];
    const v2 = [c[0] - b[0], c[1] - b[1]];
    const dot = v1[0] * v2[0] + v1[1] * v2[1];
    const m = Math.hypot(...v1) * Math.hypot(...v2) || 1;
    out.push((Math.acos(Math.max(-1, Math.min(1, dot / m))) * 180) / Math.PI);
  }
  return out;
}

/**
 * בודק את המצולע שצויר מול היעד. מחזיר { correct, summary, reason }.
 * הוורדיקט דטרמיניסטי; ה-summary הוא תיאור בעברית למורה (כדי שיבין מה צויר).
 */
function analyzeDrawnShape(verts, target, closed) {
  const want = target?.label || "צורה";
  if (!verts || verts.length < 2) {
    return { correct: false, reason: "empty", summary: `כמעט ולא סימנתי קודקודים. התבקשתי לצייר ${want}.` };
  }
  if (verts.length < 3) {
    return { correct: false, reason: "too-few", summary: `סימנתי רק ${verts.length} קודקודים — אי אפשר לסגור צורה.` };
  }
  if (!closed) {
    return { correct: false, reason: "open", summary: `סימנתי ${verts.length} קודקודים אבל לא סגרתי את הצורה (לא חיברתי בחזרה לנקודה הראשונה).` };
  }
  if (polygonSelfIntersects(verts)) {
    return { correct: false, reason: "self-intersect", summary: "הקווים שציירתי מצטלבים זה עם זה — זו לא צורה פשוטה." };
  }

  const n = verts.length;
  const sides = sideLengths(verts);
  const mean = sides.reduce((s, x) => s + x, 0) / n;
  const equalSides = (Math.max(...sides) - Math.min(...sides)) <= mean * 0.18;
  const angles = interiorAngles(verts);
  const rightAngles = angles.every((a) => Math.abs(a - 90) <= 12);
  // צלעות נגדיות שוות (למלבן) — רק עבור 4 צלעות
  const oppositeEqual =
    n === 4 &&
    Math.abs(sides[0] - sides[2]) <= mean * 0.2 &&
    Math.abs(sides[1] - sides[3]) <= mean * 0.2;

  const base = `ציירתי מצולע סגור עם ${n} צלעות`;
  // התאמה למספר הצלעות
  if (n !== target.sides) {
    return {
      correct: false,
      reason: "sides",
      summary: `${base}, אבל התבקשתי לצייר ${want} שיש לו ${target.sides} צלעות.`,
    };
  }
  // אילוץ צלעות שוות (ריבוע / משולש שווה-צלעות)
  if (target.equal && !equalSides) {
    return {
      correct: false,
      reason: "not-equal",
      summary: `${base} אבל הצלעות לא באותו אורך, ו${want} דורש שכל הצלעות יהיו שוות.`,
    };
  }
  // אילוץ זוויות ישרות (ריבוע / מלבן)
  if (target.right && !rightAngles) {
    return {
      correct: false,
      reason: "not-right",
      summary: `${base} אבל לא כל הזוויות ישרות (90°), ו${want} דורש זוויות ישרות.`,
    };
  }
  if (target.type === "rectangle" && !oppositeEqual) {
    return {
      correct: false,
      reason: "rect",
      summary: `${base} עם זוויות ישרות, אבל הצלעות הנגדיות לא שוות — במלבן כל זוג צלעות נגדיות שוות.`,
    };
  }
  // עבר את כל הבדיקות
  const extras = [];
  if (target.equal) extras.push("כל הצלעות שוות");
  if (target.right) extras.push("כל הזוויות ישרות");
  return {
    correct: true,
    reason: "ok",
    summary: `${base}${extras.length ? " — " + extras.join(", ") : ""}. זה ${want}!`,
  };
}

/** בונה לוח משבצות לציור צורה. המצב נשמר ב-container._shapeState. */
function renderShapeBoard(container, target) {
  if (!container) return;
  // הלוח ממלא את כל הכרטיס; מודדים את הגודל בפיקסלים כדי שהמשבצות יהיו ריבועיות
  const cell = 38; // גודל משבצת בפיקסלים
  const rect = container.getBoundingClientRect();
  const W = Math.max(240, Math.round(rect.width) || 640);
  const H = Math.max(240, Math.round(rect.height) || 440);
  const colsMax = Math.floor(W / cell);
  const rowsMax = Math.floor(H / cell);
  const SNAP = cell * 0.6; // מרחק סגירה אל הנקודה הראשונה
  const state = { verts: [], closed: false, target };
  container._shapeState = state;
  container.innerHTML = "";

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("preserveAspectRatio", "none"); // 1 יחידה = 1 פיקסל → משבצות ריבועיות
  svg.setAttribute("class", "shapeBoardSvg");

  // משבצות — קווי תכלת עדינים על פני כל הלוח (כמו נייר משבצות)
  for (let x = 0; x <= W; x += cell) {
    const vline = document.createElementNS(SVG_NS, "line");
    vline.setAttribute("x1", x); vline.setAttribute("y1", 0);
    vline.setAttribute("x2", x); vline.setAttribute("y2", H);
    vline.setAttribute("class", "shapeGrid");
    svg.appendChild(vline);
  }
  for (let y = 0; y <= H; y += cell) {
    const hline = document.createElementNS(SVG_NS, "line");
    hline.setAttribute("x1", 0); hline.setAttribute("y1", y);
    hline.setAttribute("x2", W); hline.setAttribute("y2", y);
    hline.setAttribute("class", "shapeGrid");
    svg.appendChild(hline);
  }

  const edges = document.createElementNS(SVG_NS, "polyline");
  edges.setAttribute("class", "shapeEdges");
  edges.setAttribute("fill", "none");
  svg.appendChild(edges);

  const fillPoly = document.createElementNS(SVG_NS, "polygon");
  fillPoly.setAttribute("class", "shapeFill");
  svg.appendChild(fillPoly);

  const rubber = document.createElementNS(SVG_NS, "line");
  rubber.setAttribute("class", "shapeRubber");
  svg.appendChild(rubber);

  const dotsLayer = document.createElementNS(SVG_NS, "g");
  svg.appendChild(dotsLayer);

  function toSvg(ev) {
    const r = svg.getBoundingClientRect();
    return {
      x: ((ev.clientX - r.left) / r.width) * W,
      y: ((ev.clientY - r.top) / r.height) * H,
    };
  }
  function snapPt(x, y) {
    return [
      Math.max(0, Math.min(colsMax, Math.round(x / cell))) * cell,
      Math.max(0, Math.min(rowsMax, Math.round(y / cell))) * cell,
    ];
  }
  function redraw() {
    const pts = state.verts;
    const ptsStr = pts.map((p) => p.join(",")).join(" ");
    const closed = state.closed && pts.length >= 3;
    if (closed) {
      // סוגרים את הקו (כולל הצלע האחרונה) ומסתירים את קו הגומייה
      edges.setAttribute("points", `${ptsStr} ${pts[0].join(",")}`);
      fillPoly.setAttribute("points", ptsStr);
      fillPoly.style.display = "";
      rubber.style.display = "none";
    } else {
      edges.setAttribute("points", ptsStr);
      fillPoly.style.display = "none";
      rubber.style.display = "";
    }
    dotsLayer.innerHTML = "";
    pts.forEach((p, i) => {
      // הקודקוד הראשון מודגש רק בזמן הציור (כדי לדעת איפה לסגור); אחרי סגירה — כמו כולם
      const highlightFirst = i === 0 && !closed;
      const c = document.createElementNS(SVG_NS, "circle");
      c.setAttribute("cx", p[0]); c.setAttribute("cy", p[1]);
      c.setAttribute("r", highlightFirst ? 7 : 5);
      c.setAttribute("class", highlightFirst ? "shapeDot shapeDot--first" : "shapeDot");
      dotsLayer.appendChild(c);
    });
    // המצב הנוכחי לציור הקודקודים בגריד (יחידות שלמות) — לוורדיקט
    container._shapeState = {
      ...state,
      gridVerts: pts.map((p) => [p[0] / cell, p[1] / cell]),
    };
  }
  function onClick(ev) {
    if (state.closed) return;
    const { x, y } = toSvg(ev);
    const [sx, sy] = snapPt(x, y);
    // סגירה: לחיצה על הנקודה הראשונה (אם יש לפחות 3 קודקודים)
    if (state.verts.length >= 3) {
      const f = state.verts[0];
      if (Math.hypot(sx - f[0], sy - f[1]) <= SNAP) {
        state.closed = true;
        rubber.style.display = "none";
        redraw();
        return;
      }
    }
    // לא מוסיפים קודקוד כפול באותו מקום
    const last = state.verts[state.verts.length - 1];
    if (last && last[0] === sx && last[1] === sy) return;
    state.verts.push([sx, sy]);
    redraw();
  }
  function onMove(ev) {
    if (state.closed || !state.verts.length) {
      rubber.removeAttribute("x1");
      return;
    }
    const { x, y } = toSvg(ev);
    const last = state.verts[state.verts.length - 1];
    rubber.setAttribute("x1", last[0]);
    rubber.setAttribute("y1", last[1]);
    rubber.setAttribute("x2", x);
    rubber.setAttribute("y2", y);
  }
  svg.addEventListener("click", onClick);
  svg.addEventListener("pointermove", onMove);

  container.appendChild(svg);
  redraw();
}

/** חושף את הדמיית החפצים — נקרא רק כשהתלמיד מתקשה (תשובה שגויה / בקשת רמז). */
function revealArithViz(u, p) {
  const el = u && u.problemDiagram;
  if (!el || !p || p.diagramSvg) return;
  if (el.querySelector(".objViz")) return; // כבר מוצג
  const viz = buildArithViz(p.text);
  if (!viz) return;
  el.hidden = false;
  el.setAttribute("aria-hidden", "false");
  el.innerHTML = viz;
}

function setFeedback(el, text, variant) {
  el.textContent = text || "";
  el.classList.remove("feedback--ok", "feedback--warn", "feedback--danger");
  if (variant) el.classList.add(variant);
}

function appendMsg(chatLogEl, { from, text, isError }) {
  const wrap = document.createElement("div");
  wrap.className = `msg ${from === "user" ? "msg--user" : "msg--bot"}${isError ? " msg--error" : ""}`;
  const meta = document.createElement("div");
  meta.className = "msg__meta";
  const who = document.createElement("span");
  who.textContent = from === "user" ? "את/ה" : "מורה";
  const time = document.createElement("span");
  time.textContent = nowTime();
  meta.appendChild(who);
  meta.appendChild(time);

  const body = document.createElement("div");
  body.className = "msg__text";
  body.textContent = text;

  wrap.appendChild(meta);
  wrap.appendChild(body);
  chatLogEl.appendChild(wrap);
  chatLogEl.scrollTop = chatLogEl.scrollHeight;
}

/** מציג בועת "כותב…" עם שלוש נקודות מקפצות (כמו בוואטסאפ). */
function showTyping(chatLogEl) {
  if (!chatLogEl || chatLogEl.querySelector(".msg--typing")) return;
  const el = document.createElement("div");
  el.className = "msg msg--bot msg--typing";
  el.setAttribute("aria-label", "המורה כותב…");
  el.innerHTML =
    '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
  chatLogEl.appendChild(el);
  chatLogEl.scrollTop = chatLogEl.scrollHeight;
}

/** מסיר את בועת ההקלדה. */
function hideTyping(chatLogEl) {
  const el = chatLogEl?.querySelector(".msg--typing");
  if (el) el.remove();
}

/** קונפטי חגיגי על תשובה נכונה 🎉 */
function launchConfetti() {
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let canvas = document.getElementById("confettiCanvas");
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = "confettiCanvas";
    canvas.style.cssText =
      "position:fixed;inset:0;pointer-events:none;z-index:9999;";
    document.body.appendChild(canvas);
  }
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = window.innerWidth;
  const H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const colors = ["#14b8a6", "#f59e0b", "#ef4444", "#6366f1", "#ec4899", "#22c55e"];
  const parts = [];
  for (let i = 0; i < 130; i++) {
    parts.push({
      x: W / 2 + (Math.random() - 0.5) * W * 0.35,
      y: H * 0.32 + (Math.random() - 0.5) * 40,
      vx: (Math.random() - 0.5) * 10,
      vy: Math.random() * -10 - 3,
      g: 0.22 + Math.random() * 0.12,
      size: 6 + Math.random() * 6,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.35,
      color: colors[(Math.random() * colors.length) | 0],
      life: 1,
    });
  }

  let frames = 0;
  function tick() {
    frames += 1;
    ctx.clearRect(0, 0, W, H);
    let alive = false;
    for (const p of parts) {
      p.vy += p.g;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      if (frames > 55) p.life -= 0.02;
      if (p.life > 0 && p.y < H + 40) {
        alive = true;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
    }
    if (alive) requestAnimationFrame(tick);
    else ctx.clearRect(0, 0, W, H);
  }
  requestAnimationFrame(tick);
}

const CANNED_BOT_PHRASES = [
  "את/ה בדרך הנכונה",
  "נתקדם צעד אחד בכל פעם",
  "ספר/י לי מה לא ברור",
  "ונעבור יחד",
  "קיבלתי. בדקתי מול התרגיל",
  "המתמטיקאי הכין תרגיל חדש",
  "שאלה מצוינת",
  "אוקיי—בוא נתקדם",
  "התרגיל:",
  "מצא/י את x",
];

function isCannedBotMessage() {
  // legacy: גלאי "שרת ישן" — כבר לא רלוונטי (יש מורה AI אמיתי).
  // תמיד false כדי לא לחסום בטעות תשובות אמיתיות שמכילות ביטוי "חשוד".
  return false;
}

function purgeCannedFromTopics(topicsState) {
  if (!topicsState?.topics) return false;
  let changed = false;
  for (const topic of topicsState.topics) {
    if (!Array.isArray(topic.chatHistory)) continue;
    const before = topic.chatHistory.length;
    topic.chatHistory = topic.chatHistory.filter(
      (m) => !(m.role === "assistant" && isCannedBotMessage(m.content))
    );
    if (topic.chatHistory.length !== before) changed = true;
  }
  return changed;
}

async function fetchTutorStatus() {
  try {
    const res = await fetch("/api/status");
    if (!res.ok) return null;
    const data = await res.json();
    return data && typeof data === "object" ? data : null;
  } catch {
    return null;
  }
}

async function callTutorApi(payload) {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data || typeof data !== "object") throw new Error("Bad JSON");
    return data;
  } catch {
    return null;
  }
}

/* ===== נושאי הכיתה + שאלות מהמאגר ===== */
let GRADE_TOPICS = []; // [{ key, sub: [...] }]
let GRADE_NUM = null;

async function fetchGradeTopics() {
  try {
    const res = await fetch("/api/topics");
    if (!res.ok) return;
    const data = await res.json();
    if (data?.ok && Array.isArray(data.topics)) {
      GRADE_TOPICS = data.topics.map((t) => (typeof t === "string" ? { key: t, sub: [] } : t));
      GRADE_NUM = data.gradeNum || null;
    }
  } catch {
    // ignore
  }
}

async function fetchBankProblem(topicKey, level) {
  try {
    const res = await fetch("/api/problem", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ topic: topicKey, level: level || 1 }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.problem || null;
  } catch {
    return null;
  }
}

function buildTutorPayload(topic, intent, messageText, history, extra = {}) {
  const p = topic.problems?.[topic.currentProblemIndex] ?? topic.problems?.[topic.problems.length - 1];
  return {
    userId: getUserId(),
    messageText,
    messageKind: intent.kind,
    studentAnswer: extra.studentAnswer ?? null,
    topic: { title: topic.title, kind: topic.kind },
    problem: p
      ? {
          text: p.text,
          hints: p.hints,
          explanation: p.explanation,
          answer: p.answer,
          bankTopic: p.bankTopic || null,
          gradeNum: p.gradeNum || null,
        }
      : null,
    student: {
      level: topic.level,
      attempts: topic.attempts,
      correct: topic.correct,
      streak: topic.streak,
      wrongStreak: topic.wrongStreak,
    },
    history,
    shapeCheck: extra.shapeCheck || null,
  };
}

/** @param {"offline"|"ready"|"thinking"} state */
function setAiIndicator(u, state) {
  const wrap = u.aiIndicator;
  if (!wrap) return;
  wrap.classList.remove("aiIndicator--offline", "aiIndicator--ready", "aiIndicator--thinking");
  if (state === "thinking") {
    wrap.classList.add("aiIndicator--thinking");
    wrap.title = "AI כותב…";
  } else if (state === "ready") {
    wrap.classList.add("aiIndicator--ready");
    wrap.title = "AI מוכן — מחכה לשאלה";
  } else {
    wrap.classList.add("aiIndicator--offline");
    wrap.title = "אין חיבור AI";
  }
}

async function refreshAiStatus(u) {
  const status = await fetchTutorStatus();
  if (!status?.ok) {
    setAiIndicator(u, "offline");
    return status;
  }
  if (!status.build) {
    console.warn("שרת ישן — הפעל מחדש: node server.js");
  }
  setAiIndicator(u, status.aiEnabled ? "ready" : "offline");
  return status;
}

function renderAgentDebug(u, entries) {
  if (!u.agentDebugBody) return;
  u.agentDebugBody.innerHTML = "";
  if (!entries?.length) {
    const empty = document.createElement("div");
    empty.className = "agentDebug__entry";
    empty.textContent = "אין עדיין פעילות סוכנים.";
    u.agentDebugBody.appendChild(empty);
    return;
  }
  for (const e of entries) {
    const el = document.createElement("div");
    el.className = "agentDebug__entry";
    const title = document.createElement("div");
    title.className = "agentDebug__entryTitle";
    title.textContent = e.nameHe || e.agentId;
    const body = document.createElement("div");
    body.textContent = e.text || "";
    el.appendChild(title);
    el.appendChild(body);
    u.agentDebugBody.appendChild(el);
  }
}

function renderStats(u, state) {
  const attempts = state.attempts ?? 0;
  const correct = state.correct ?? 0;
  const acc = attempts > 0 ? correct / attempts : NaN;
  u.accuracyValue.textContent = formatPercent(acc);
  u.streakValue.textContent = String(state.streak ?? 0);
  u.attemptsValue.textContent = String(attempts);
  // דירוג הקושי מוצג ע"י renderDifficulty לפי השאלה הנוכחית (לא לפי רמת התלמיד)
}

async function main() {
  const u = ui();

  // שער כניסה: חייבים להיות מחוברים
  let me = null;
  try {
    const res = await fetch("/api/me");
    if (res.ok) {
      const data = await res.json();
      if (data?.ok) me = data.user;
    }
  } catch {
    // נטפל למטה
  }
  if (!me) {
    window.location.href = "/auth";
    return;
  }
  CURRENT_USER = me;
  if (u.userChipName) u.userChipName.textContent = me.username;
  if (u.userChip) u.userChip.hidden = false;
  u.logoutBtn?.addEventListener("click", async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch {
      // ignore
    }
    window.location.href = "/auth";
  });

  u.deleteAccountBtn?.addEventListener("click", async () => {
    const ok1 = confirm(
      `למחוק את החשבון "${me.username}" לצמיתות?\n` +
        "כל ההתקדמות, הזיכרון והנתונים יימחקו — אי אפשר לשחזר."
    );
    if (!ok1) return;
    const typed = prompt("לאישור סופי, הקלד/י את שם המשתמש שלך:");
    if (typed == null) return;
    if (typed.trim().toLowerCase() !== String(me.username).toLowerCase()) {
      alert("שם המשתמש לא תאם — המחיקה בוטלה.");
      return;
    }
    try {
      const res = await fetch("/api/delete-account", { method: "POST" });
      if (!res.ok) throw new Error("failed");
    } catch {
      alert("המחיקה נכשלה. נסה/י שוב.");
      return;
    }
    // ניקוי הנתונים המקומיים של החשבון שנמחק
    try {
      localStorage.removeItem(scopedKey(STORAGE_KEY));
      localStorage.removeItem(scopedKey(UI_KEY));
    } catch {
      // ignore
    }
    window.location.href = "/auth";
  });

  // נושאי הכיתה של התלמיד (מהשרת)
  await fetchGradeTopics();
  // מפתחות תקפים = נושאי-אב + תתי-נושאים (כדי לא לסנן תת-נושא פתוח בטעינה מחדש)
  const gradeKeys = GRADE_TOPICS.flatMap((t) => [t.key, ...(Array.isArray(t.sub) ? t.sub : [])]);

  const loaded = loadState();
  const uiLoaded = loadUi();

  // מודל נושאים מבוסס-כיתה: שומרים רק נושאים שתואמים לתכנית הכיתה
  /** @type {{ currentTopicId: string, topics: any[] }} */
  let topicsState = { currentTopicId: null, topics: [] };
  if (loaded?.topicsState?.topics?.length) {
    topicsState = loaded.topicsState;
    purgeCannedFromTopics(topicsState);
    topicsState.topics = topicsState.topics.filter((t) => gradeKeys.includes(t.kind));
  }

  let uiState = {
    chatCollapsed: uiLoaded?.chatCollapsed ?? false,
    chatWidth: Number.isFinite(uiLoaded?.chatWidth) ? uiLoaded.chatWidth : 360,
  };

  function setChatWidth(px) {
    const min = 280;
    const max = Math.max(min, Math.min(620, window.innerWidth - 360)); // משאיר מקום לתרגיל
    const w = clamp(Math.round(px), min, max);
    uiState.chatWidth = w;
    document.body.style.setProperty("--chat-width", `${w}px`);
    saveUi(uiState);
    if (u.chatToggleBtn) {
      u.chatToggleBtn.style.setProperty("--chat-width", `${w}px`);
    }
  }

  function saveChatHistory() {
    // legacy no-op (history is per topic now)
    saveUi({ ...uiState });
  }

  function renderChatCollapsed() {
    const collapsed = !!uiState.chatCollapsed;
    u.chatSidebar?.classList.toggle("chatSidebar--collapsed", collapsed);
    document.body.classList.toggle("chat-collapsed", collapsed);
    if (u.chatToggleBtn) {
      u.chatToggleBtn.setAttribute("aria-expanded", collapsed ? "false" : "true");
      const icon = u.chatToggleBtn.querySelector(".chatToggle__icon");
      if (icon) icon.textContent = collapsed ? "▶" : "◀";
    }
  }

  function saveAll() {
    saveState({ topicsState });
  }

  function getCurrentTopic() {
    const t = topicsState.topics.find((x) => x.id === topicsState.currentTopicId);
    return t || topicsState.topics[0];
  }

  function getCurrentProblem(topic) {
    if (!topic.problems?.length) return null;
    return topic.problems[topic.currentProblemIndex] ?? topic.problems[topic.problems.length - 1];
  }

  function ensureTopicHasProblem(topic) {
    if (!Array.isArray(topic.problems)) topic.problems = [];
  }

  /** טוען שאלה חדשה מהמאגר לנושא הנוכחי (לפי הכיתה+נושא+רמה). */
  async function loadBankProblem(topic, push = true) {
    u.problemText.textContent = "טוען…";
    showProblemDiagram(u, null);
    const p = await fetchBankProblem(topic.kind, topic.level);
    if (!p) {
      u.problemText.textContent = "לא נמצאה שאלה לנושא הזה כרגע.";
      return;
    }
    setProblemOnTopic(
      topic,
      {
        id: p.id || String(Date.now()),
        text: p.text,
        answer: p.answer,
        difficulty: p.difficulty || p.level || 1,
        hints: p.hints || [],
        explanation: p.explanation || "",
        diagramSvg: p.diagramSvg || null,
        diagramAlt: p.diagramAlt || null,
        diagramData: p.diagramData || null,
        answerKind: p.answerKind || null,
        interactive: p.interactive || null,
        shapeTarget: p.shapeTarget || null,
        createdAt: Date.now(),
      },
      push
    );
  }

  /** פותח נושא לפי מפתח (יוצר אם צריך, ומביא שאלה מהמאגר). */
  async function openTopicByKey(key) {
    let topic = topicsState.topics.find((t) => t.kind === key);
    if (!topic) {
      topic = createTopic(key, key);
      topicsState.topics.unshift(topic);
    }
    topicsState.currentTopicId = topic.id;
    switchToTopic(topic.id);
    if (!getCurrentProblem(topic)) await loadBankProblem(topic, true);
  }

  /** מציג את דירוג הקושי של השאלה ככוכבים (1–10) עם חלונית הסבר. */
  function renderDifficulty(diff) {
    if (!u.difficultyPill) return;
    const d = clamp(Math.round(diff || 1), 1, 10);
    u.difficultyPill.title = `רמת קושי: ${d} מתוך 10 (1 = קל, 10 = קשה)`;
    u.difficultyPill.innerHTML = `⭐ ${d}<span class="diffMax">/10</span>`;
  }

  // בוחר את מצב הקלט לפי סוג השאלה: ציור צורה / מספר / שעה / שעון אינטראקטיבי
  function applyAnswerMode(p) {
    const dd = p && p.diagramData;
    const isShapeCreate = !!(p && p.interactive === "shape-create");
    const isClockSet = !!(p && (p.interactive === "clock-set" || (dd && dd.type === "clock-set")));
    const isTime = !isClockSet && !isShapeCreate && !!(p && p.answerKind === "time");

    // ציור צורה — לוח גדול במקום הכרטיס הרגיל
    if (u.lessonCard) u.lessonCard.hidden = isShapeCreate;
    if (u.shapeCreatorCard) u.shapeCreatorCard.hidden = !isShapeCreate;
    if (isShapeCreate) {
      if (u.shapeRequest) u.shapeRequest.textContent = p.text;
      renderShapeBoard(u.shapeBoard, p.shapeTarget || { label: "צורה", sides: 4 });
      return;
    }

    if (u.answerRowNumeric) u.answerRowNumeric.hidden = isClockSet || isTime;
    if (u.answerRowTime) u.answerRowTime.hidden = !isTime;
    if (u.answerRowInteractive) u.answerRowInteractive.hidden = !isClockSet;
    if (isTime) {
      if (u.timeHour) u.timeHour.value = "";
      if (u.timeMin) u.timeMin.value = "";
    }
    if (isClockSet) {
      renderInteractiveClock(u.problemDiagram);
    }
  }

  function setProblemOnTopic(topic, p, push = true) {
    ensureTopicHasProblem(topic);
    if (push) {
      topic.problems.push(p);
      topic.currentProblemIndex = topic.problems.length - 1;
    } else {
      topic.problems[topic.currentProblemIndex] = p;
    }
    u.problemText.textContent = p.text;
    showProblemVisual(u, p);
    applyAnswerMode(p);
    renderDifficulty(p.difficulty);
    u.answerInput.value = "";
    setFeedback(u.feedbackBox, "", null);
    u.feedbackBox.hidden = true;
    u.feedbackBox.classList.add("feedback--hidden");
    renderStats(u, topic);
    renderTopicLabel();
    saveAll();
  }

  // משוב כן/לא על התשובה; אם נכון — מעבר אוטומטי לשאלה הבאה
  function showAnswerFeedback(isCorrect) {
    u.feedbackBox.classList.remove("feedback--hidden");
    u.feedbackBox.hidden = false;
    if (isCorrect) {
      setFeedback(u.feedbackBox, "✅ נכון! עוברים לשאלה הבאה…", "feedback--ok");
      launchConfetti();
      // מעבר שקט לשאלה הבאה — בדיוק כמו כפתור "שאלה הבאה", בלי הודעה בצ'אט
      window.setTimeout(() => u.nextProblemBtn?.click(), 1200);
    } else {
      setFeedback(u.feedbackBox, "❌ לא מדויק — נסה/י שוב, או בקש/י רמז.", "feedback--danger");
    }
  }

  function renderTopicLabel() {
    const topic = getCurrentTopic();
    if (u.topicLabel) u.topicLabel.textContent = `— ${topic.title}`;
  }

  // רשימת הנושאים שכבר נפתחו — מעבר בלחיצה, מחיקה בנפרד
  function renderTopicsList() {
    if (!u.topicsList) return;
    u.topicsList.innerHTML = "";
    const topics = topicsState.topics || [];
    if (!topics.length) {
      const empty = document.createElement("div");
      empty.className = "topicItem__meta";
      empty.textContent = 'עדיין לא פתחת נושאים. לחצ/י על "נושא חדש".';
      u.topicsList.appendChild(empty);
      return;
    }
    const currentId = topicsState.currentTopicId;
    for (const t of topics) {
      const row = document.createElement("div");
      row.className = `topicItem${t.id === currentId ? " topicItem--active" : ""}`;

      const main = document.createElement("button");
      main.type = "button";
      main.className = "topicItem__main";
      main.innerHTML = `<span class="topicItem__title">${t.title}</span>`;
      main.addEventListener("click", () => {
        switchToTopic(t.id);
        closeTopicsDrawer();
      });

      const actions = document.createElement("div");
      actions.className = "topicItem__actions";
      const del = document.createElement("button");
      del.type = "button";
      del.className = "iconBtn iconBtn--danger";
      del.setAttribute("aria-label", `מחיקת הנושא ${t.title}`);
      del.innerHTML = '<span class="iconBtn__icon" aria-hidden="true">🗑</span>';
      del.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteTopic(t.id);
      });
      actions.appendChild(del);

      row.appendChild(main);
      row.appendChild(actions);
      u.topicsList.appendChild(row);
    }
  }

  // בורר נושאי הכיתה — נפתח מ"נושא חדש". רק נושאי הכיתה, עם תתי-נושאים בעת הצורך.
  function renderTopicPicker() {
    if (!u.topicPicker) return;
    u.topicPicker.innerHTML = "";
    if (!GRADE_TOPICS.length) {
      const empty = document.createElement("div");
      empty.className = "topicItem__meta";
      empty.textContent = "אין נושאים מוגדרים לכיתה שלך.";
      u.topicPicker.appendChild(empty);
      return;
    }
    const openedKeys = new Set((topicsState.topics || []).map((t) => t.kind));
    for (const gt of GRADE_TOPICS) {
      const key = gt.key;
      const sub = Array.isArray(gt.sub) ? gt.sub : [];

      const pickLeaf = (leafKey) => {
        openTopicByKey(leafKey);
        showTopicListView();
        closeTopicsDrawer();
      };

      const item = document.createElement("button");
      item.type = "button";
      item.className = `catItem${openedKeys.has(key) ? " catItem--active" : ""}`;
      item.innerHTML = `<span class="catItem__title">${key}</span>${
        sub.length ? '<span class="catItem__chev" aria-hidden="true">▾</span>' : ""
      }`;

      if (sub.length) {
        const subWrap = document.createElement("div");
        subWrap.className = "catSub";
        subWrap.hidden = true;
        for (const sk of sub) {
          const sb = document.createElement("button");
          sb.type = "button";
          sb.className = `catItem catItem--sub${openedKeys.has(sk) ? " catItem--active" : ""}`;
          sb.textContent = sk;
          sb.addEventListener("click", () => pickLeaf(sk));
          subWrap.appendChild(sb);
        }
        item.addEventListener("click", () => {
          subWrap.hidden = !subWrap.hidden;
        });
        u.topicPicker.appendChild(item);
        u.topicPicker.appendChild(subWrap);
      } else {
        item.addEventListener("click", () => pickLeaf(key));
        u.topicPicker.appendChild(item);
      }
    }
  }

  function showTopicPickerView() {
    renderTopicPicker();
    if (u.topicsListView) u.topicsListView.hidden = true;
    if (u.topicPickerView) u.topicPickerView.hidden = false;
  }
  function showTopicListView() {
    if (u.topicPickerView) u.topicPickerView.hidden = true;
    if (u.topicsListView) u.topicsListView.hidden = false;
  }

  function deleteTopic(topicId) {
    const topic = topicsState.topics.find((x) => x.id === topicId);
    if (!topic) return;

    const ok = confirm(`למחוק את הנושא "${topic.title}"?\nזה ימחק גם את היסטוריית השאלות והצ’אט של הנושא.`);
    if (!ok) return;

    topicsState.topics = topicsState.topics.filter((t) => t.id !== topicId);

    if (topicsState.topics.length === 0) {
      // אין נושאים פתוחים — מצב ריק, פותחים נושא חדש מהבורר
      topicsState.currentTopicId = null;
      u.problemText.textContent = 'בחר/י נושא דרך "נושא חדש".';
      showProblemDiagram(u, null);
      renderStats(u, { attempts: 0, correct: 0, streak: 0 });
      renderChatForTopic({ chatHistory: [] });
      renderTopicsList();
      saveAll();
      return;
    }

    if (topicsState.currentTopicId === topicId) {
      topicsState.currentTopicId = topicsState.topics[0].id;
      switchToTopic(topicsState.currentTopicId);
      return;
    }

    renderTopicsList();
    saveAll();
  }

  function renderChatForTopic(topic) {
    u.chatLog.innerHTML = "";
    const history = Array.isArray(topic.chatHistory) ? topic.chatHistory : [];
    for (const m of history.slice(-22)) {
      if (m.role === "assistant" && isCannedBotMessage(m.content)) continue;
      appendMsg(u.chatLog, { from: m.role === "user" ? "user" : "bot", text: m.content });
    }
    if (history.length === 0) {
      topic.chatHistory = [];
    }
  }

  function switchToTopic(topicId) {
    topicsState.currentTopicId = topicId;
    const topic = getCurrentTopic();
    ensureTopicHasProblem(topic);
    const p = getCurrentProblem(topic);
    if (p) {
      u.problemText.textContent = p.text;
      showProblemVisual(u, p);
      applyAnswerMode(p);
      renderDifficulty(p.difficulty);
    }
    renderStats(u, topic);
    renderTopicLabel();
    renderChatForTopic(topic);
    renderTopicsList();
    saveAll();
  }

  function applyAnswerStats(topic, wasCorrect) {
    const nextTopic = estimateDifficultyNext(topic, wasCorrect);
    Object.assign(topic, nextTopic);
    renderStats(u, topic);
    saveAll();
  }

  function applyApiSideEffects(topic, api) {
    if (api?.newProblem?.text) {
      const np = {
        id: api.newProblem.id || crypto.randomUUID?.() || String(Date.now()),
        text: api.newProblem.text,
        answer: api.newProblem.answer,
        hints: api.newProblem.hints || [],
        explanation: api.newProblem.explanation || "",
        bankTopic: api.newProblem.bankTopic || null,
        gradeNum: api.newProblem.gradeNum || null,
        diagramSvg: api.diagramSvg || api.newProblem.diagramSvg || null,
        diagramAlt: api.diagramAlt || null,
        createdAt: Date.now(),
      };
      setProblemOnTopic(topic, np, true);
    } else if (api?.diagramSvg) {
      const p = getCurrentProblem(topic);
      if (p) {
        p.diagramSvg = api.diagramSvg;
        p.diagramAlt = api.diagramAlt;
        showProblemDiagram(u, api.diagramSvg, api.diagramAlt);
        saveAll();
      }
    }

    if (typeof api?.checkAnswerCorrect === "boolean") {
      applyAnswerStats(topic, api.checkAnswerCorrect);
    }
  }

  async function requestAi({ messageText, messageKind, studentAnswer, showUserBubble = true, shapeCheck = null }) {
    const topic = getCurrentTopic();
    const text = String(messageText ?? "").trim();
    if (!text) return null;

    if (showUserBubble) {
      appendMsg(u.chatLog, { from: "user", text });
      topic.chatHistory = Array.isArray(topic.chatHistory) ? topic.chatHistory : [];
      topic.chatHistory.push({ role: "user", content: text });
      topic.chatHistory = topic.chatHistory.slice(-40);
      saveAll();
    }

    setAiIndicator(u, "thinking");
    showTyping(u.chatLog);

    const intent = { kind: messageKind };
    const payload = buildTutorPayload(topic, intent, text, topic.chatHistory.slice(-14), {
      studentAnswer,
      shapeCheck,
    });

    const api = await callTutorApi(payload);
    hideTyping(u.chatLog);
    renderAgentDebug(u, api?.agentDebug);

    // המורה החליט שהתלמיד מתקשה → חושפים הדמיית חפצים
    if (api?.showVisual) revealArithViz(u, getCurrentProblem(getCurrentTopic()));

    if (api?.reply && !isCannedBotMessage(api.reply)) {
      appendMsg(u.chatLog, { from: "bot", text: api.reply });
      topic.chatHistory.push({ role: "assistant", content: api.reply });
      topic.chatHistory = topic.chatHistory.slice(-40);
      applyApiSideEffects(topic, api);
      saveAll();
      // בציור צורה — הקונפטי והמעבר מטופלים ע"י כפתור "סיימתי", לא כאן (מניעת כפילות)
      const isShapeCreate = shapeCheck != null;
      if (!isShapeCreate && messageKind === "CheckAnswer" && typeof api.checkAnswerCorrect === "boolean") {
        showAnswerFeedback(api.checkAnswerCorrect);
      }
    }

    if (api?.reply && isCannedBotMessage(api.reply)) {
      const errText = "התקבלה תשובה ישנה מהמערכת — הפעל/י מחדש את השרת (node server.js) ורענן/י את הדף.";
      appendMsg(u.chatLog, { from: "bot", text: `⚠️ ${errText}`, isError: true });
      topic.chatHistory.push({ role: "assistant", content: errText });
      saveAll();
    } else if (!api?.reply && (api?.error || api?.aiFailed)) {
      const errText = api?.error || "לא התקבלה תשובה מה-AI. נסה/י שוב.";
      appendMsg(u.chatLog, { from: "bot", text: `⚠️ ${errText}`, isError: true });
      topic.chatHistory.push({ role: "assistant", content: errText });
      saveAll();
    }

    await refreshAiStatus(u);
    return api;
  }

  async function checkAnswerText(answerText) {
    const raw = String(answerText ?? "").trim();
    if (!raw) return;
    await requestAi({
      messageText: `בדוק את התשובה שלי: ${raw}`,
      messageKind: "CheckAnswer",
      studentAnswer: raw,
    });
  }

  async function requestHint(level) {
    await requestAi({
      messageText: level === 1 ? "תן לי רמז קטן לתרגיל" : "תן לי רמז גדול יותר",
      messageKind: "HintRequest",
    });
  }

  async function requestExplain() {
    await requestAi({
      messageText: "תסביר לי את התרגיל שלב אחר שלב",
      messageKind: "ExplainRequest",
    });
  }

  async function requestNewProblem() {
    await requestAi({
      messageText: "תרגיל חדש בבקשה",
      messageKind: "NewProblem",
    });
  }

  async function handleChatSend() {
    const text = String(u.chatInput.value ?? "").trim();
    if (!text) return;
    u.chatInput.value = "";

    const intent = classifyUserMessage(text);
    const topic = getCurrentTopic();

    if (intent.kind === "AnswerAttempt") {
      await requestAi({
        messageText: text,
        messageKind: "CheckAnswer",
        studentAnswer: String(intent.answer),
        showUserBubble: true,
      });
      return;
    }

    await requestAi({
      messageText: text,
      messageKind: intent.kind,
      showUserBubble: true,
    });
  }

  // רינדור ראשוני — פותח את נושא הכיתה הנוכחי/הראשון מהמאגר
  let startKey = null;
  const curT = topicsState.topics.find((t) => t.id === topicsState.currentTopicId);
  if (curT && gradeKeys.includes(curT.kind)) startKey = curT.kind;
  else if (topicsState.topics[0]) startKey = topicsState.topics[0].kind;
  else if (gradeKeys[0]) startKey = gradeKeys[0];

  renderTopicsList();
  if (startKey) {
    await openTopicByKey(startKey);
  } else {
    u.problemText.textContent = "אין נושאים מוגדרים לכיתה שלך עדיין.";
  }
  saveAll();

  setChatWidth(uiState.chatWidth);
  renderChatCollapsed();

  refreshAiStatus(u);

  u.agentDebugToggle?.addEventListener("click", () => {
    const open = u.agentDebugBody.hidden;
    u.agentDebugBody.hidden = !open;
    u.agentDebugToggle.setAttribute("aria-expanded", open ? "true" : "false");
    u.agentDebug?.classList.toggle("agentDebug--open", open);
    document.body.classList.toggle("agent-debug-open", open);
  });

  // events
  u.checkBtn.addEventListener("click", () => {
    const raw = String(u.answerInput.value ?? "").trim();
    if (!raw) return;
    u.answerInput.value = "";
    checkAnswerText(raw);
  });

  // הדמיית חיסור אינטראקטיבית — לחיצה על חפץ "מורידה" אותו (ושוב מחזירה)
  u.problemDiagram?.addEventListener("click", (e) => {
    const obj = e.target.closest(".obj--clickable");
    if (obj) obj.classList.toggle("obj--removed");
  });

  u.answerInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      u.checkBtn.click();
    }
  });

  // קלט שעה (שעות:דקות)
  u.checkTimeBtn?.addEventListener("click", () => {
    const h = String(u.timeHour?.value ?? "").trim();
    const m = String(u.timeMin?.value ?? "").trim();
    if (h === "" || m === "") return;
    const mm = String(parseInt(m, 10)).padStart(2, "0");
    checkAnswerText(`${parseInt(h, 10)}:${mm}`);
  });
  [u.timeHour, u.timeMin].forEach((inp) =>
    inp?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        u.checkTimeBtn.click();
      }
    })
  );

  // שעון אינטראקטיבי — "סיימתי" בודק את השעה שכוונן הילד
  u.doneBtn?.addEventListener("click", () => {
    const st = u.problemDiagram && u.problemDiagram._clockState;
    if (!st) return;
    const mm = String(st.minute).padStart(2, "0");
    checkAnswerText(`${st.hour}:${mm}`);
  });

  // ציור צורות — "סיימתי" בודק את הצורה שצוירה; "התחלה מחדש" מנקה את הלוח
  u.shapeClearBtn?.addEventListener("click", () => {
    const topic = getCurrentTopic();
    const p = getCurrentProblem(topic);
    if (p) renderShapeBoard(u.shapeBoard, p.shapeTarget || { label: "צורה", sides: 4 });
  });

  u.shapeDoneBtn?.addEventListener("click", async () => {
    const st = u.shapeBoard && u.shapeBoard._shapeState;
    if (!st || !st.target) return;
    const verts = st.gridVerts || (st.verts || []).map((v) => v);
    const verdict = analyzeDrawnShape(verts, st.target, st.closed);
    if (verdict.correct) launchConfetti();
    await requestAi({
      messageText: verdict.summary,
      messageKind: "CheckAnswer",
      studentAnswer: verdict.summary,
      showUserBubble: true,
      shapeCheck: {
        correct: verdict.correct,
        reason: verdict.reason,
        requested: st.target.label,
        summary: verdict.summary,
      },
    });
    if (verdict.correct) {
      // מעבר שקט לצורה הבאה
      window.setTimeout(() => u.nextProblemBtn?.click(), 1500);
    } else {
      // נסה שוב — מנקים את הלוח
      renderShapeBoard(u.shapeBoard, st.target);
    }
  });

  u.hint1Btn.addEventListener("click", () => requestHint(1));
  u.hint2Btn.addEventListener("click", () => requestHint(2));
  u.explainBtn.addEventListener("click", () => requestExplain());
  u.newProblemBtn.addEventListener("click", () => requestNewProblem());

  u.prevProblemBtn?.addEventListener("click", () => {
    const topic = getCurrentTopic();
    topic.currentProblemIndex = clamp((topic.currentProblemIndex ?? 0) - 1, 0, (topic.problems?.length ?? 1) - 1);
    const p = getCurrentProblem(topic);
    if (p) {
      u.problemText.textContent = p.text;
      showProblemVisual(u, p);
      applyAnswerMode(p);
      renderDifficulty(p.difficulty);
    }
    saveAll();
  });

  u.nextProblemBtn?.addEventListener("click", () => {
    const topic = getCurrentTopic();
    const nextIndex = (topic.currentProblemIndex ?? 0) + 1;
    if (nextIndex < (topic.problems?.length ?? 0)) {
      topic.currentProblemIndex = nextIndex;
      const p = getCurrentProblem(topic);
      if (p) {
        u.problemText.textContent = p.text;
        showProblemVisual(u, p);
        applyAnswerMode(p);
        renderDifficulty(p.difficulty);
      }
      saveAll();
      return;
    }
    // אין עוד בהיסטוריה → טוען שאלה חדשה מהמאגר
    loadBankProblem(topic, true);
  });

  u.sendBtn.addEventListener("click", handleChatSend);
  u.chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleChatSend();
    }
  });

  u.resetBtn.addEventListener("click", () => {
    // מאפס רק את הצ'אט של הנושא הנוכחי — כל ההתקדמות והנתונים נשמרים
    const topic = getCurrentTopic();
    if (!confirm("לאפס את הצ'אט בנושא הזה? (ההתקדמות, הרמה והניקוד יישמרו)")) return;
    topic.chatHistory = [];
    renderChatForTopic(topic);
    saveAll();
  });

  u.chatToggleBtn?.addEventListener("click", () => {
    uiState.chatCollapsed = !uiState.chatCollapsed;
    renderChatCollapsed();
    saveUi(uiState);
  });

  function openTopicsDrawer() {
    u.topicsOverlay.hidden = false;
    u.topicsDrawer.hidden = false;
    u.topicsBtn?.setAttribute("aria-expanded", "true");
    showTopicListView();
    renderTopicsList();
  }

  function closeTopicsDrawer() {
    u.topicsOverlay.hidden = true;
    u.topicsDrawer.hidden = true;
    u.topicsBtn?.setAttribute("aria-expanded", "false");
  }

  u.topicsBtn?.addEventListener("click", openTopicsDrawer);
  u.topicsCloseBtn?.addEventListener("click", closeTopicsDrawer);
  u.topicsOverlay?.addEventListener("click", closeTopicsDrawer);

  // "נושא חדש" פותח בורר עם נושאי הכיתה בלבד (לא הקלדה חופשית)
  u.newTopicBtn?.addEventListener("click", () => showTopicPickerView());
  u.pickerBackBtn?.addEventListener("click", () => showTopicListView());

  // Drag to resize chat
  if (u.chatResizeHandle) {
    let dragging = false;

    const onMove = (e) => {
      if (!dragging) return;
      const clientX = e.touches?.[0]?.clientX ?? e.clientX;
      setChatWidth(clientX);
      // keep chat open while resizing
      if (uiState.chatCollapsed) {
        uiState.chatCollapsed = false;
        renderChatCollapsed();
      }
      e.preventDefault?.();
    };

    const stop = () => {
      if (!dragging) return;
      dragging = false;
      document.body.classList.remove("chat-resizing");
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", stop);
      window.removeEventListener("touchmove", onMove, { passive: false });
      window.removeEventListener("touchend", stop);
      saveUi(uiState);
    };

    const start = (e) => {
      dragging = true;
      document.body.classList.add("chat-resizing");
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", stop);
      window.addEventListener("touchmove", onMove, { passive: false });
      window.addEventListener("touchend", stop);
      e.preventDefault?.();
    };

    u.chatResizeHandle.addEventListener("mousedown", start);
    u.chatResizeHandle.addEventListener("touchstart", start, { passive: false });
  }

  window.addEventListener("resize", () => setChatWidth(uiState.chatWidth));
}

document.addEventListener("DOMContentLoaded", main);

/* parallax עדין ל-VELA ברקע התרגול — אותו אפקט כמו בבית ובהתחברות */
(function appWordParallax() {
  const bg = document.querySelector(".appWord");
  if (!bg) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const MAX = 18;
  let tx = 0;
  let ty = 0;
  let cx = 0;
  let cy = 0;
  window.addEventListener("pointermove", (e) => {
    tx = -(e.clientX / window.innerWidth - 0.5) * MAX;
    ty = -(e.clientY / window.innerHeight - 0.5) * MAX;
  });
  (function tick() {
    cx += (tx - cx) * 0.15;
    cy += (ty - cy) * 0.15;
    bg.style.setProperty("--px", `${cx.toFixed(2)}px`);
    bg.style.setProperty("--py", `${cy.toFixed(2)}px`);
    requestAnimationFrame(tick);
  })();
})();
