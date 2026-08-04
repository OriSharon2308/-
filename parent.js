/* eslint-disable no-console */
/**
 * vela · אזור הורים — דף אחד.
 *
 * מבנה: שם הילד → שורת מספרים → שני תחומים (למידה, תרגול).
 * כל תחום נפתח "לעומק" לרשימת נושאים, וכל נושא נפתח לחוות דעת המורה.
 *
 * חוות הדעת נטענת רק כשההורה פותח נושא (/api/parent/topic) — היא מגיעה
 * ממודל שפה ולכן יקרה; טעינה מראש של 14 נושאים הייתה מבזבזת טוקנים על
 * מה שאיש לא יקרא. אחרי הטעינה היא נשמרת בזיכרון הדף.
 */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const bootView = $("#bootView");
  const loginView = $("#loginView");
  const appView = $("#app");
  const main = $("#main");

  const FACE = "/teacher-character/faces/";

  /* ---------------- עזרים ---------------- */
  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  async function api(path, opts = {}) {
    const res = await fetch(path, {
      method: opts.method || "GET",
      headers: opts.body ? { "content-type": "application/json" } : {},
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      cache: "no-store",
    });
    let data = {};
    try {
      data = await res.json();
    } catch {
      /* גוף לא-JSON — נשאר {} */
    }
    if (res.status === 403) {
      showLogin();
      throw new Error("forbidden");
    }
    return { ok: res.ok, data };
  }

  const MONTHS = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי",
    "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];

  function monthYear(iso) {
    if (!iso) return "";
    const d = new Date(iso.length <= 10 ? iso + "T00:00:00" : iso);
    if (isNaN(d)) return "";
    return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }

  /** "היום" / "אתמול" / "לפני 4 ימים" / תאריך — קריא להורה, בלי ISO. */
  function whenHe(iso) {
    if (!iso) return "";
    const d = new Date(iso.length <= 10 ? iso + "T00:00:00" : iso);
    if (isNaN(d)) return "";
    const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const diff = Math.round((day(new Date()) - day(d)) / 86400000);
    if (diff <= 0) return "היום";
    if (diff === 1) return "אתמול";
    if (diff < 7) return `לפני ${diff} ימים`;
    if (diff < 14) return "לפני שבוע";
    if (diff < 31) return `לפני ${Math.round(diff / 7)} שבועות`;
    return `${d.getDate()} ב${MONTHS[d.getMonth()]}`;
  }

  function genderWord(g) {
    return g === "female" ? "בת" : "בן";
  }

  /**
   * מפריד את הפתיחה שתסומן במרקר מהשאר.
   * המשפט הראשון הוא היחידה הטבעית, אבל משפט של 3 שורות מסומן במלואו נראה
   * כמו הדגשת-יתר ולא כמו סימון ביד. לכן חותכים בגבול-מילה סביב 95 תווים.
   */
  const LEAD_MAX = 95;
  function splitLead(text) {
    const t = String(text || "").trim();
    const m = t.match(/^[\s\S]*?[.!?](\s|$)/);
    let lead = m ? m[0].trim() : "";
    if (!lead) return { lead: "", rest: t };
    if (lead.length > LEAD_MAX) {
      const cut = lead.slice(0, LEAD_MAX);
      const sp = cut.lastIndexOf(" ");
      lead = (sp > 40 ? cut.slice(0, sp) : cut).trim();
    }
    return { lead, rest: t.slice(lead.length).trim() };
  }

  function showLogin() {
    bootView.hidden = true;
    appView.hidden = true;
    loginView.hidden = false;
  }
  function showApp() {
    bootView.hidden = true;
    loginView.hidden = true;
    appView.hidden = false;
  }

  /* ---------------- כניסה ---------------- */
  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = $("#loginErr");
    err.hidden = true;
    const username = $("#pUser").value.trim();
    const password = $("#pPw").value;
    if (!username || !password) {
      err.textContent = "צריך שם משתמש וסיסמה.";
      err.hidden = false;
      return;
    }
    const { ok, data } = await api("/api/parent/login", { method: "POST", body: { username, password } });
    if (!ok || !data.ok) {
      err.textContent = data.error || "שם המשתמש או הסיסמה שגויים.";
      err.hidden = false;
      return;
    }
    $("#pPw").value = "";
    boot();
  });

  $("#logoutBtn").addEventListener("click", async () => {
    await api("/api/parent/logout", { method: "POST" });
    location.reload();
  });

  /* ---------------- תבניות ---------------- */

  const AREAS = [
    {
      key: "learn",
      title: "אזור הלמידה",
      lede: "כאן המורה מלמד נושא מההתחלה — הסבר, דוגמאות ובדיקת הבנה תוך כדי. המספרים למטה הם שאלות ההבנה שנשאלו במהלך השיעורים עצמם.",
      emptyText: "עדיין לא התחילו שיעור באזור הלמידה.",
    },
    {
      key: "practice",
      title: "אזור התרגול",
      lede: "כאן פותרים תרגילים באופן עצמאי, לפי נושא ולפי רמה, והמורה זמין לשאלות. זה החלק שבו נצבר רוב הניסיון.",
      emptyText: "עדיין לא נפתרו תרגילים באזור התרגול.",
    },
  ];

  function pulseHtml(s) {
    const cells = [
      { n: s.totalAttempts, k: "תרגילים נפתרו" },
      { n: s.accuracy, unit: "%", k: "דיוק כללי" },
      { n: s.activeDays, k: "ימי פעילות" },
      { n: s.masteredCount, k: `נושאים בשליטה מתוך ${s.topicsCount}` },
    ];
    return `<section class="pulse">${cells
      .map(
        (c) => `<div class="pulse__cell">
          <div class="pulse__n">${c.n}${c.unit ? `<small>${c.unit}</small>` : ""}</div>
          <div class="pulse__k">${esc(c.k)}</div>
        </div>`
      )
      .join("")}</section>`;
  }

  function topicHtml(t, areaKey) {
    const acc = t.accuracy;
    const warn = acc < 70;
    return `<div class="topic" data-topic="${esc(t.name)}" data-area="${areaKey}">
      <button class="topic__row" type="button" aria-expanded="false">
        <span>
          <span class="topic__name">${esc(t.name)}</span>
          <span class="topic__sub">${t.attempts} תרגילים · ${whenHe(t.last)}</span>
        </span>
        <span class="topic__bar${warn ? " topic__bar--warn" : ""}" aria-hidden="true"><i style="width:${acc}%"></i></span>
        <span class="topic__acc">${acc}<small>%</small></span>
      </button>
      <div class="verdict"><div class="verdict__inner">
        <div class="verdict__body">
          <img class="verdict__face" src="${FACE}friendly.png" alt="" />
          <div>
            <p class="verdict__who">חוות דעת המורה</p>
            <div class="verdict__slot"><p class="verdict__none">טוען…</p></div>
          </div>
        </div>
      </div></div>
    </div>`;
  }

  function areaHtml(area, data) {
    const has = data.attempts > 0;
    return `<section class="domain">
      <h2 class="domain__title">${esc(area.title)}</h2>
      <p class="domain__lede">${esc(area.lede)}</p>
      ${
        has
          ? `<div class="domain__figs">
              <span><b>${data.attempts}</b>תרגילים</span>
              <span><b>${data.accuracy}%</b>דיוק</span>
              <span><b>${data.topics.length}</b>נושאים</span>
              <span><b>${data.activeDays}</b>ימי פעילות</span>
            </div>
            <button class="depth" type="button" aria-expanded="false" data-area="${area.key}">
              <span class="depth__label">לעומק — נושא אחרי נושא</span>
              <span class="depth__chev" aria-hidden="true"></span>
            </button>
            <div class="topics" id="topics-${area.key}"><div class="topics__inner">
              <div class="topics__list">${data.topics.map((t) => topicHtml(t, area.key)).join("")}</div>
            </div></div>`
          : `<p class="empty">${esc(area.emptyText)}</p>`
      }
    </section>`;
  }

  function render(d) {
    const c = d.child || {};
    const s = d.summary || {};
    const areas = d.areas || { learn: {}, practice: {} };

    const meta = [
      c.age ? `${genderWord(c.gender)} ${c.age}` : "",
      c.grade ? `כיתה ${c.grade}` : "",
      c.school || "",
      c.createdAt ? `אצלנו מאז ${monthYear(c.createdAt)}` : "",
      s.lastActive ? `פעילות אחרונה ${whenHe(s.lastActive)}` : "",
    ].filter(Boolean);

    main.innerHTML = `
      <section class="hero">
        <h1 class="hero__name">${esc(c.username || "התלמיד/ה")}</h1>
        <p class="hero__meta">${meta.map((x) => `<span>${esc(x)}</span>`).join("")}</p>
      </section>
      <section class="overall verdict is-open" id="overall" hidden>
        <div class="verdict__inner"><div class="verdict__body">
          <img class="verdict__face" src="${FACE}friendly.png" alt="" />
          <div>
            <p class="verdict__who">המורה על ${esc(c.username || "התלמיד/ה")}</p>
            <div class="verdict__slot"></div>
          </div>
        </div></div>
      </section>
      ${pulseHtml(s)}
      ${AREAS.map((a) => areaHtml(a, areas[a.key] || { attempts: 0, topics: [] })).join("")}
    `;

    $("#footNote").textContent =
      "חוות הדעת נכתבות על-ידי המורה של vela לפי הפעילות בפועל, ומתעדכנות כשיש התקדמות משמעותית.";

    wire();
    loadOverall(); // רצה אחרי שהדף כבר על המסך — היצירה במודל עלולה לקחת זמן
  }

  /** חוות הדעת הכוללת — נכנסת מתחת לשם ברגע שהיא מוכנה. */
  async function loadOverall() {
    const box = $("#overall");
    if (!box) return;
    let text = "";
    try {
      const { ok, data } = await api("/api/parent/verdict");
      text = (ok && data.assessments && data.assessments.teacher && data.assessments.teacher.text) || "";
    } catch {
      return; // 403 כבר החזיר למסך הכניסה
    }
    if (!text) return; // אין עדיין מספיק פעילות — פשוט לא מציגים כלום
    const { lead, rest } = splitLead(text);
    box.querySelector(".verdict__slot").innerHTML = `<p class="verdict__text">${
      lead ? `<span class="verdict__lead">${esc(lead)}</span> ` : ""
    }${esc(rest)}</p>`;
    box.hidden = false;
    // ההדגשה נמתחת רק אחרי שהאלמנט באמת נמדד — אחרת ה-transition לא נורה
    requestAnimationFrame(() => box.classList.add("is-marked"));
  }

  /* ---------------- אינטראקציה ---------------- */

  const verdictCache = new Map(); // "area::topic" → HTML מוכן

  function wire() {
    // פתיחת תחום
    main.querySelectorAll(".depth").forEach((btn) => {
      btn.addEventListener("click", () => {
        const box = $(`#topics-${btn.dataset.area}`);
        const open = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", open ? "false" : "true");
        btn.querySelector(".depth__label").textContent = open
          ? "לעומק — נושא אחרי נושא"
          : "סגירה";
        box.classList.toggle("is-open", !open);
      });
    });

    // פתיחת נושא → חוות דעת
    main.querySelectorAll(".topic__row").forEach((row) => {
      row.addEventListener("click", () => openTopic(row));
    });
  }

  async function openTopic(row) {
    const topic = row.closest(".topic");
    const verdict = topic.querySelector(".verdict");
    const open = row.getAttribute("aria-expanded") === "true";

    row.setAttribute("aria-expanded", open ? "false" : "true");
    verdict.classList.toggle("is-open", !open);
    if (open) return;

    const name = topic.dataset.topic;
    const key = `${topic.dataset.area}::${name}`;
    const slot = topic.querySelector(".verdict__slot");
    if (verdictCache.has(key)) {
      slot.innerHTML = verdictCache.get(key);
      return;
    }

    const { ok, data } = await api(`/api/parent/topic?name=${encodeURIComponent(name)}`);
    const text = (ok && data.assessments && data.assessments.teacher && data.assessments.teacher.text) || "";
    let html;
    if (!text) {
      html = `<p class="verdict__none">${
        ok
          ? "עוד אין מספיק פעילות בנושא הזה כדי לכתוב חוות דעת."
          : "לא הצלחנו לטעון את חוות הדעת כרגע."
      }</p>`;
    } else {
      const { lead, rest } = splitLead(text);
      html = `<p class="verdict__text">${
        lead ? `<span class="verdict__lead">${esc(lead)}</span> ` : ""
      }${esc(rest)}</p>`;
    }
    verdictCache.set(key, html);
    slot.innerHTML = html;
  }

  /* ---------------- עלייה ---------------- */
  async function boot() {
    const me = await api("/api/parent/me");
    if (!me.data.parent) return showLogin();
    const { ok, data } = await api("/api/parent/overview");
    if (!ok || !data.ok) return showLogin();
    showApp();
    render(data);
  }

  boot().catch(() => showLogin());
})();
