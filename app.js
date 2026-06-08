const STORAGE_KEY = "learning-prototype-v1";
const UI_KEY = "learning-prototype-ui-v1";
const USER_KEY = "learning-prototype-user-id";

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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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
    localStorage.setItem(UI_KEY, JSON.stringify(uiState));
  } catch {
    // ignore
  }
}

function loadUi() {
  try {
    const raw = localStorage.getItem(UI_KEY);
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

function answersMatch(givenText, expected) {
  if (expected == null) return false;
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
    topicLabel: document.getElementById("topicLabel"),
    problemText: document.getElementById("problemText"),
    answerInput: document.getElementById("answerInput"),
    checkBtn: document.getElementById("checkBtn"),
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

function isCannedBotMessage(text) {
  const t = String(text ?? "");
  return CANNED_BOT_PHRASES.some((p) => t.includes(p));
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
  u.difficultyPill.textContent = `רמה: ${state.level ?? 1}`;
}

function main() {
  const u = ui();
  const loaded = loadState();
  const uiLoaded = loadUi();

  // Topics model (migrates old single-topic state)
  /** @type {{ currentTopicId: string, topics: any[] }} */
  let topicsState;
  if (loaded?.topicsState?.topics?.length) {
    topicsState = loaded.topicsState;
    if (purgeCannedFromTopics(topicsState)) saveState({ topicsState });
  } else {
    const t = createTopic("regular", "תרגילים רגילים");
    // migrate old stats if exist
    t.level = loaded?.level ?? 1;
    t.attempts = loaded?.attempts ?? 0;
    t.correct = loaded?.correct ?? 0;
    t.streak = loaded?.streak ?? 0;
    t.wrongStreak = loaded?.wrongStreak ?? 0;
    const p = loaded?.problem ?? makeProblem(t.level);
    t.problems = [p];
    t.currentProblemIndex = 0;
    topicsState = { currentTopicId: t.id, topics: [t] };
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
    if (!Array.isArray(topic.problems) || topic.problems.length === 0) {
      topic.problems = [generateTopicProblem(topic.kind, topic.level)];
      topic.currentProblemIndex = 0;
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
    showProblemDiagram(u, p.diagramSvg || null, p.diagramAlt || null);
    u.answerInput.value = "";
    setFeedback(u.feedbackBox, "", null);
    renderStats(u, topic);
    renderTopicLabel();
    saveAll();
  }

  function renderTopicLabel() {
    const topic = getCurrentTopic();
    if (u.topicLabel) u.topicLabel.textContent = `— ${topic.title}`;
  }

  function renderTopicsList() {
    if (!u.topicsList) return;
    u.topicsList.innerHTML = "";
    for (const t of topicsState.topics) {
      const el = document.createElement("div");
      el.className = `topicItem ${t.id === topicsState.currentTopicId ? "topicItem--active" : ""}`;
      const left = document.createElement("div");
      const title = document.createElement("div");
      title.className = "topicItem__title";
      title.textContent = t.title;
      const meta = document.createElement("div");
      meta.className = "topicItem__meta";
      meta.textContent = `${topicKindLabel(t.kind)} · רמה ${t.level ?? 1} · ${t.attempts ?? 0} ניסיונות`;
      left.appendChild(title);
      left.appendChild(meta);

      const actions = document.createElement("div");
      actions.className = "topicItem__actions";

      const openBtn = document.createElement("button");
      openBtn.className = "miniBtn";
      openBtn.type = "button";
      openBtn.textContent = "פתח";
      openBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        topicsState.currentTopicId = t.id;
        switchToTopic(t.id);
        closeTopicsDrawer();
      });

      const delBtn = document.createElement("button");
      delBtn.className = "miniBtn miniBtn--danger";
      delBtn.type = "button";
      delBtn.textContent = "מחק";
      delBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteTopic(t.id);
      });

      actions.appendChild(openBtn);
      actions.appendChild(delBtn);

      el.appendChild(left);
      el.appendChild(actions);
      el.addEventListener("click", () => {
        topicsState.currentTopicId = t.id;
        switchToTopic(t.id);
        closeTopicsDrawer();
      });
      u.topicsList.appendChild(el);
    }
  }

  function deleteTopic(topicId) {
    const topic = topicsState.topics.find((x) => x.id === topicId);
    if (!topic) return;

    const ok = confirm(`למחוק את הנושא "${topic.title}"?\nזה ימחק גם את היסטוריית השאלות והצ’אט של הנושא.`);
    if (!ok) return;

    topicsState.topics = topicsState.topics.filter((t) => t.id !== topicId);

    if (topicsState.topics.length === 0) {
      const t = createTopic("regular", "תרגילים רגילים");
      t.problems = [generateTopicProblem(t.kind, 1)];
      t.currentProblemIndex = 0;
      topicsState.topics = [t];
      topicsState.currentTopicId = t.id;
      switchToTopic(t.id);
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
    if (p) u.problemText.textContent = p.text;
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

  async function requestAi({ messageText, messageKind, studentAnswer, showUserBubble = true }) {
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

    const intent = { kind: messageKind };
    const payload = buildTutorPayload(topic, intent, text, topic.chatHistory.slice(-14), {
      studentAnswer,
    });

    const api = await callTutorApi(payload);
    renderAgentDebug(u, api?.agentDebug);

    if (api?.reply && !isCannedBotMessage(api.reply)) {
      appendMsg(u.chatLog, { from: "bot", text: api.reply });
      topic.chatHistory.push({ role: "assistant", content: api.reply });
      topic.chatHistory = topic.chatHistory.slice(-40);
      applyApiSideEffects(topic, api);
      saveAll();
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

  // initial render
  // Ensure at least 1 topic exists
  if (!topicsState.topics?.length) {
    const t = createTopic("regular", "תרגילים רגילים");
    t.problems = [makeProblem(1)];
    topicsState = { currentTopicId: t.id, topics: [t] };
  }

  // Ensure topics have at least one problem
  for (const t of topicsState.topics) ensureTopicHasProblem(t);
  const current = getCurrentTopic();
  u.problemText.textContent = getCurrentProblem(current)?.text ?? "טוען…";
  renderStats(u, current);
  renderTopicLabel();
  renderChatForTopic(current);
  renderTopicsList();
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

  u.answerInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      u.checkBtn.click();
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
    if (p) u.problemText.textContent = p.text;
    saveAll();
  });

  u.nextProblemBtn?.addEventListener("click", () => {
    const topic = getCurrentTopic();
    const nextIndex = (topic.currentProblemIndex ?? 0) + 1;
    if (nextIndex < (topic.problems?.length ?? 0)) {
      topic.currentProblemIndex = nextIndex;
      const p = getCurrentProblem(topic);
      if (p) u.problemText.textContent = p.text;
      saveAll();
      return;
    }
    setProblemOnTopic(topic, generateTopicProblem(topic.kind, topic.level), true);
  });

  u.sendBtn.addEventListener("click", handleChatSend);
  u.chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleChatSend();
    }
  });

  u.resetBtn.addEventListener("click", () => {
    // reset current topic only
    const topic = getCurrentTopic();
    const keepId = topic.id;
    const keepKind = topic.kind;
    const keepTitle = topic.title;
    const fresh = createTopic(keepKind, keepTitle);
    Object.assign(topic, fresh);
    topic.id = keepId; // keep id stable so currentTopicId stays valid
    topic.kind = keepKind;
    topic.title = keepTitle;
    topic.problems = [generateTopicProblem(topic.kind, 1)];
    topic.currentProblemIndex = 0;
    topic.chatHistory = [];
    renderStats(u, topic);
    u.problemText.textContent = getCurrentProblem(topic)?.text ?? "טוען…";
    renderChatForTopic(topic);
    renderTopicsList();
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

  u.newTopicBtn?.addEventListener("click", () => {
    const kind = prompt("איזה נושא לפתוח?\nאפשר: משוואות / הסתברות / פונקציות / תרגילים רגילים / נעלמים", "משוואות");
    if (!kind) return;
    const normalized = kind.trim();
    const map = {
      "תרגילים רגילים": "regular",
      "רגיל": "regular",
      "משוואות": "equations",
      "הסתברות": "probability",
      "פונקציות": "functions",
      "נעלמים": "variables",
      "גאומטריה": "geometry",
    };
    const topicKind = map[normalized] || "regular";
    const title = prompt("שם לנושא (אפשר להשאיר ריק)", topicKindLabel(topicKind)) || topicKindLabel(topicKind);
    const t = createTopic(topicKind, title);
    t.problems = [generateTopicProblem(t.kind, 1)];
    t.currentProblemIndex = 0;
    topicsState.topics.unshift(t);
    topicsState.currentTopicId = t.id;
    switchToTopic(t.id);
  });

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
