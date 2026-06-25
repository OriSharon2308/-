/* eslint-disable no-console */

const llm = require("../lib/llm");
const memory = require("../lib/memory");
const learnerProfile = require("../lib/learner-profile"); // פרופיל מתומצת משותף לכל המערכת
const users = require("../lib/users");
const { gradeToNum, CURRICULUM } = require("../lib/curriculum");
const { teacherReply } = require("./teacher-agent");
const { psychologistAdvise } = require("./psychologist-agent");
const { mathematicianCreate } = require("./mathematician-agent");
const { designerDiagram } = require("./designer-agent");

/* ---------- בחירת נושא: כיתה, סטטיסטיקה, מיפוי ---------- */

// סטטיסטיקת הצלחה לכל נושא מתוך זיכרון המתמטיקאי
function computeTopicStats(mem) {
  const out = {};
  const tl = mem && Array.isArray(mem.timeline) ? mem.timeline : [];
  for (const ev of tl) {
    if (!ev.topic || typeof ev.correct !== "boolean") continue;
    const s = out[ev.topic] || { attempts: 0, correct: 0 };
    s.attempts += 1;
    if (ev.correct) s.correct += 1;
    out[ev.topic] = s;
  }
  return out;
}

// מיפוי נושא ה-UI לנושא בתכנית הלימוד של הכיתה
function mapUiToCurriculum(uiTopic, gradeNum) {
  if (!gradeNum || !CURRICULUM[gradeNum]) return null;
  const keys = CURRICULUM[gradeNum].topics.map((t) => t.key);
  const title = String(uiTopic?.title || "").trim();
  if (keys.includes(title)) return title;
  const KIND_MAP = { equations: "מבוא לנעלם", variables: "מבוא לנעלם" };
  const mapped = KIND_MAP[uiTopic?.kind];
  return mapped && keys.includes(mapped) ? mapped : null;
}

function pickRandom(arr) {
  return arr.length ? arr[Math.floor(Math.random() * arr.length)] : null;
}

/* ---------- השוואת תשובות ---------- */

function parseNum(text) {
  const s = String(text ?? "").trim().replace(/\s+/g, "");
  if (!s) return null;
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

// שעה "H:MM" → דקות מתחילת מחזור 12 שעות (לטיפול בשאלות שעון עם דקות)
function parseTime(s) {
  const m = String(s ?? "").trim().match(/^(\d{1,2})\s*[:.]\s*(\d{1,2})$/);
  if (!m) return null;
  const h = parseInt(m[1], 10) % 12;
  const min = parseInt(m[2], 10);
  if (min > 59) return null;
  return h * 60 + min;
}

function answersMatch(given, expected) {
  if (expected == null) return false;
  // תשובת שעה (שעות:דקות)
  const et = parseTime(expected);
  if (et != null) {
    const gt = parseTime(given);
    return gt != null && gt === et;
  }
  const e = typeof expected === "number" ? expected : parseNum(expected);
  const g = parseNum(given);
  if (e != null && g != null) return Math.abs(e - g) < 1e-3;
  return String(given ?? "").trim() === String(expected).trim();
}

/* ---------- עזר ויזואלי (הדמיית חפצים לחיבור/חיסור) ---------- */

const VIZ_OBJECTS = ["🍎", "✏️", "⭐", "🍌", "🎈", "🌸", "🍪", "⚽", "🐠", "🧸"];
const VIZ_NAMES = {
  "🍎": "תפוחים",
  "✏️": "עפרונות",
  "⭐": "כוכבים",
  "🍌": "בננות",
  "🎈": "בלונים",
  "🌸": "פרחים",
  "🍪": "עוגיות",
  "⚽": "כדורים",
  "🐠": "דגים",
  "🧸": "דובונים",
};

function vizObjectFor(text) {
  let h = 0;
  for (const ch of String(text)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return VIZ_OBJECTS[h % VIZ_OBJECTS.length];
}

// מחזיר שם החפץ אם התרגיל מתאים להדמיה (חיבור/חיסור עם מספרים קטנים), אחרת null
function arithVizInfo(text) {
  const m = String(text ?? "").match(/(\d+)\s*([+\-−])\s*(\d+)/);
  if (!m) return null;
  const a = +m[1];
  const b = +m[3];
  const op = m[2];
  if (op === "+" ? a + b > 50 : a > 50) return null;
  return { name: VIZ_NAMES[vizObjectFor(text)] || "איורים" };
}

/* ---------- עדכון פרופיל מילולי (ה"הבנה" של המורה על התלמיד) ---------- */

async function updateTeacherProfile(userId) {
  if (!userId || !llm.isEnabled()) return;
  const mem = memory.getUserMemory("teacher", userId);
  const tl = Array.isArray(mem.timeline) ? mem.timeline.slice(-20) : [];
  if (!tl.length) return;
  const events = tl
    .map((e) => {
      const date = String(e.t || "").slice(0, 10);
      const res = e.correct === true ? "נכון" : e.correct === false ? "טעות" : "";
      return `- ${date} ${e.topic || ""} ${e.problem || ""} ${res} ${e.note || ""}`.trim();
    })
    .join("\n");
  const system =
    "אתה מנהל פרופיל לומד תמציתי במערכת ללימוד מתמטיקה. כתוב פסקה אחת קצרה (2-3 משפטים) בעברית על התלמיד: רמה במתמטיקה, חוזקות, קשיים בנושאים ספציפיים, והעדפות למידה. שים לב: 'חיבור', 'חיסור', 'כפל' הם פעולות חשבון. בלי רשימות, בלי שם התלמיד.";
  const user = `פרופיל קודם: ${mem.profile || "(אין עדיין)"}\n\nאירועים אחרונים:\n${events}\n\nכתוב פרופיל מעודכן.`;
  try {
    const text = await llm.complete({
      system,
      messages: [{ role: "user", content: user }],
      maxTokens: 180,
    });
    if (text) memory.updateProfile("teacher", userId, text);
  } catch {
    /* ignore — עדכון רקע, לא קריטי */
  }
}

/* ---------- runChat ---------- */

async function runChat(payload = {}) {
  const userId = payload.userId || null;
  const {
    messageKind = "Question",
    messageText = "",
    studentAnswer = null,
    topic = {},
    problem = null,
    student = {},
    history = [],
    gender = "male",
    voice = false,
  } = payload;

  const topicLabel = topic.title || topic.kind || "";
  const agentDebug = [];

  // בדיקת נכונות (אם רלוונטי)
  // לתרגיל ציור צורה — הוורדיקט הגאומטרי מחושב בלקוח (דטרמיניסטי) ומגיע ב-shapeCheck.
  const shapeCheck = payload.shapeCheck || null;
  let correct = null;
  if (shapeCheck && typeof shapeCheck.correct === "boolean") {
    correct = shapeCheck.correct;
  } else if (messageKind === "CheckAnswer" && problem) {
    correct = answersMatch(studentAnswer ?? messageText, problem.answer);
  }
  // הערה למורה כדי שיבין בדיוק מה התלמיד צייר (ולא יסתור את הוורדיקט)
  const shapeFacts =
    "עובדות גאומטריות (חשוב לדייק!): מרובע = כל מצולע בעל 4 צלעות, בלי שום דרישה לזוויות ישרות או לצלעות שוות. " +
    "ריבוע ומלבן הם מקרים פרטיים של מרובע — אבל לא כל מרובע הוא ריבוע או מלבן. " +
    "ריבוע = 4 צלעות שוות וגם 4 זוויות ישרות. מלבן = 4 זוויות ישרות (וצלעות נגדיות שוות). " +
    "אסור להגיד שמרובע עם צלעות לא-שוות הוא 'מלבן' — זה פשוט מרובע.";
  const shapeNote = shapeCheck
    ? `התלמיד בתרגיל ציור צורה. התבקש: ${shapeCheck.requested || "צורה"}. מה שצויר: ${
        shapeCheck.summary || messageText
      } הערכת המערכת (סופית — אל תסתור/י): ${correct ? "נכון" : "שגוי"}. ${shapeFacts} אם שגוי — הסבר/י בעדינות מה צריך לתקן ובקש/י לנסות שוב; אל תכריז/י 'נכון'.`
    : null;

  // כיתת התלמיד + נושאי תכנית הלימוד שלה
  const userRec = userId ? users.getUserById(userId) : null;
  const gradeNum = gradeToNum(userRec?.grade) || null;
  const candidateTopics =
    gradeNum && CURRICULUM[gradeNum] ? CURRICULUM[gradeNum].topics.map((t) => t.key) : [];
  const topicStats = userId
    ? computeTopicStats(memory.getUserMemory("mathematician", userId))
    : {};

  // פסיכולוג — נימה רגשית + המלצה על נושא לחיזוק
  const psy = psychologistAdvise({ student, lastCorrect: correct, topicStats, candidateTopics });
  const focusNote = psy.focusTopic ? ` | מיקוד: ${psy.focusTopic}` : "";
  agentDebug.push({
    agentId: "psychologist",
    nameHe: "פסיכולוג",
    text: `${psy.mood} — ${psy.advice}${focusNote}`,
  });

  // זיכרון רלוונטי למורה
  const ctx = memory.buildContext("teacher", userId, {
    query: messageText,
    topic: topicLabel,
  });
  let contextText = memory.contextToText(ctx);
  // מקדימים את הפרופיל המתומצת המשותף (סטטוס לכל נושא) — זה הזיכרון שהמורה
  // נושא איתו לכל אזור באפליקציה. עטוף: פרופיל לא קריטי, לא מפיל את הצ'אט.
  try {
    const profileText = learnerProfile.toPromptText(userId);
    if (profileText) contextText = `${profileText}\n\n${contextText}`.trim();
  } catch (e) {
    /* ignore — הזיכרון המובנה הוא תוספת, לא תלות */
  }

  const response = { agentDebug };

  // נושא חדש → המתמטיקאי בונה תרגיל + המעצב מאייר
  let activeProblem = problem;
  let chosenTopic = null;
  if (messageKind === "NewProblem") {
    // הפסיכולוג מכוון לנושא לחיזוק; אחרת מיפוי מה-UI; אחרת נושא אקראי מהכיתה
    const requestedTopic =
      psy.focusTopic || mapUiToCurriculum(topic, gradeNum) || pickRandom(candidateTopics);
    const math = await mathematicianCreate({
      gradeNum,
      topic: requestedTopic,
      level: student.level || 1,
    });
    activeProblem = math.problem;
    chosenTopic = math.topic;
    agentDebug.push({
      agentId: "mathematician",
      nameHe: "מתמטיקאי",
      text: `[${math.mode}] ${chosenTopic || ""}: ${math.problem.text}`,
    });

    let diagramSvg = null;
    let diagramAlt = null;
    if (math.problem.needsDiagram) {
      const diagram = await designerDiagram(math.problem);
      if (diagram) {
        diagramSvg = diagram.svg;
        diagramAlt = diagram.alt;
        agentDebug.push({ agentId: "designer", nameHe: "מעצב", text: `איור: ${diagram.alt}` });
      }
    }

    response.newProblem = {
      id: math.problem.id,
      text: math.problem.text,
      answer: math.problem.answer,
      hints: math.problem.hints || [],
      explanation: math.problem.explanation || "",
      bankTopic: chosenTopic || null,
      gradeNum: math.gradeNum || null,
      diagramSvg,
      diagramAlt,
    };
    if (diagramSvg) {
      response.diagramSvg = diagramSvg;
      response.diagramAlt = diagramAlt;
    }
  }

  // עזר ויזואלי זמין לתרגיל הנוכחי? (חיבור/חיסור עד 50). המורה יחליט בעצמו מתי לפתוח אותו.
  const vizRelevant = ["CheckAnswer", "HintRequest", "ExplainRequest", "Question"].includes(
    messageKind
  );
  const vizInfo = vizRelevant && problem ? arithVizInfo(problem.text) : null;

  // המורה עונה
  const teacher = await teacherReply({
    messageKind,
    messageText,
    problem: activeProblem,
    student,
    advice: psy.advice,
    contextText,
    history,
    correct,
    vizName: vizInfo ? vizInfo.name : null,
    shapeNote,
    gender,
    voice,
  });

  // המורה יכול לשלוח [[SHOW_VISUAL]] כדי שהמערכת תפתח את ההדמיה — מזהים, מסירים מהטקסט
  let reply = teacher.reply || "";
  if (reply.includes("[[SHOW_VISUAL]]")) {
    response.showVisual = true;
    reply = reply.replace(/\[\[\s*SHOW_VISUAL\s*\]\]/g, "").replace(/\n{3,}/g, "\n\n").trim();
  }
  response.reply = reply;
  response.mode = teacher.mode;
  agentDebug.push({ agentId: "teacher", nameHe: "מורה", text: `(${teacher.mode}) ${teacher.reply}` });

  if (correct != null) response.checkAnswerCorrect = correct;

  // כתיבת זיכרון מלא
  if (userId) {
    if (messageKind === "CheckAnswer" && problem) {
      memory.appendEvent("teacher", userId, {
        topic: topicLabel,
        problem: problem.text,
        studentAnswer: studentAnswer ?? messageText,
        correct,
      });
      memory.appendEvent("mathematician", userId, {
        topic: problem.bankTopic || topicLabel,
        problem: problem.text,
        correct,
      });
      // עדכון הפרופיל המתומצת המשותף — דטרמיניסטי, זול, מתעדכן מכל אזור באפליקציה
      try {
        learnerProfile.record(userId, { topic: problem.bankTopic || topicLabel, correct });
      } catch (e) {
        /* ignore — רישום פרופיל לא חוסם את התשובה */
      }
      // עדכון הפרופיל המילולי ברקע — לא חוסם את התשובה לתלמיד
      void updateTeacherProfile(userId);
    } else if (messageKind === "NewProblem" && activeProblem) {
      memory.appendEvent("mathematician", userId, {
        topic: chosenTopic || topicLabel,
        problem: activeProblem.text,
        note: "תרגיל חדש",
      });
    } else if (messageKind === "ExplainRequest" || messageKind === "HintRequest") {
      memory.appendEvent("teacher", userId, {
        topic: topicLabel,
        problem: problem?.text,
        note: messageKind === "HintRequest" ? "ביקש רמז" : "ביקש הסבר",
      });
    }
  }

  return response;
}

/* ---------- סטטוס ---------- */

function getAgentStatus() {
  const i = llm.info();
  return {
    ok: true,
    build: true,
    aiEnabled: i.aiEnabled,
    provider: i.provider,
    model: i.model,
    agents: ["teacher", "psychologist", "mathematician", "designer"],
  };
}

module.exports = { runChat, getAgentStatus };
