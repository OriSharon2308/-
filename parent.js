/* eslint-disable no-console */
/**
 * vela · אזור הורים — דף אחד.
 *
 * מבנה: שם הילד → חוות דעת הצוות → מספרים → גרף התקדמות → מתי לומדים
 *        → אזור הלמידה → אזור התרגול.
 * כל תחום נפתח "לעומק" לרשימת נושאים, וכל נושא נפתח לחוות דעת הצוות עליו.
 *
 * חוות הדעת נטענות בעצלתיים: הכוללת אחרי שהדף כבר על המסך, ושל נושא רק
 * כשההורה פותח אותו. הן מגיעות ממודל שפה, ולכן טעינה מראש של 14 נושאים
 * הייתה משלמת טוקנים על מה שאיש לא יקרא.
 */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const bootView = $("#bootView");
  const loginView = $("#loginView");
  const appView = $("#app");
  const main = $("#main");

  const FACE = "/teacher-character/faces/";

  /* שלושת המומחים. כל אחד מקבל הבעה אחרת של אותה דמות — כך ההורה מזהה
     במבט מי מדבר, בלי להמציא שלוש דמויות שלא קיימות. */
  const ROLES = [
    { key: "teacher", label: "המורה", face: "friendly.png" },
    { key: "psychologist", label: "הפסיכולוג", face: "tilt.png" },
    { key: "mathematician", label: "המתמטיקאי", face: "idea.png" },
  ];

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

  function shortDate(iso) {
    if (!iso) return "";
    const d = new Date(iso.length <= 10 ? iso + "T00:00:00" : iso);
    if (isNaN(d)) return "";
    return `${d.getDate()}.${d.getMonth() + 1}`;
  }

  /** "היום" / "אתמול" / "לפני 4 ימים" — קריא להורה, בלי ISO. */
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

  function minutesHe(m) {
    if (!m) return "";
    if (m < 60) return `${m} דקות`;
    const h = Math.floor(m / 60);
    const r = m % 60;
    const hh = h === 1 ? "שעה" : h === 2 ? "שעתיים" : `${h} שעות`;
    return r ? `${hh} ו-${r} דק׳` : hh;
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

  function markedHtml(text) {
    const { lead, rest } = splitLead(text);
    return `<p class="verdict__text">${
      lead ? `<span class="verdict__lead">${esc(lead)}</span> ` : ""
    }${esc(rest)}</p>`;
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

  /* ---------------- גרף ---------------- */

  /**
   * גרף-קו של אחוזים לאורך זמן. SVG טהור, בלי ספרייה.
   * viewBox קבוע + width:100% → מתאים את עצמו לכל רוחב בלי לחשב מחדש.
   * ציר-ה-x הוא *מיקום ברשימת הימים הפעילים*, לא זמן אמיתי — כך שבוע של
   * הפסקה לא מותח את הגרף לקו שטוח ארוך.
   */
  function lineChart(series, opts = {}) {
    const W = 720;
    const H = 150; // נמוך בכוונה — ציר האחוזים מעוגן ב-0 (כך זה כנה), ובגובה
                   // גדול יותר החצי התחתון היה נשאר ריק ברוב המקרים.
    const padR = 8;
    const padL = 8;
    const padT = 14;
    const padB = 26;
    const pts = series.filter((s) => Array.isArray(s.values) && s.values.length);
    if (!pts.length || pts[0].values.length < 2) return "";

    const n = pts[0].values.length;
    // RTL: הזמן זורם מימין לשמאל — הנקודה הראשונה בימין
    const x = (i) => W - padR - (i / (n - 1)) * (W - padL - padR);
    const y = (v) => padT + (1 - Math.max(0, Math.min(100, v)) / 100) * (H - padT - padB);

    const grid = [0, 50, 100]
      .map((v) => `<line x1="${padL}" y1="${y(v)}" x2="${W - padR}" y2="${y(v)}"
        stroke="var(--line-soft)" stroke-width="1" />
        <text x="${W - padR}" y="${y(v) - 5}" class="chart__tick">${v}%</text>`)
      .join("");

    const paths = pts
      .map((s) => {
        const d = s.values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
        const last = s.values[s.values.length - 1];
        // non-scaling-stroke: עובי הקו נשאר קבוע בפיקסלים בכל רוחב מסך.
        // בלעדיו הקו נעלם כמעט לגמרי במובייל, כי ה-SVG מתכווץ פי ~2.
        return `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${s.width || 2.2}"
            vector-effect="non-scaling-stroke"
            stroke-linecap="round" stroke-linejoin="round"${s.dash ? ` stroke-dasharray="${s.dash}"` : ""} />
          <circle cx="${x(n - 1).toFixed(1)}" cy="${y(last).toFixed(1)}" r="4.5" fill="${s.color}" />`;
      })
      .join("");

    const labels = opts.labels || [];
    const xLabels = labels.length
      ? `<text x="${x(0)}" y="${H - 6}" class="chart__tick chart__tick--start">${esc(labels[0])}</text>
         <text x="${x(n - 1)}" y="${H - 6}" class="chart__tick chart__tick--end">${esc(labels[labels.length - 1])}</text>`
      : "";

    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img"
      aria-label="${esc(opts.aria || "גרף התקדמות")}">
      ${grid}${paths}${xLabels}
    </svg>`;
  }

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
      { n: s.masteredCount, unit: `מתוך ${s.topicsCount}`, k: "נושאים בשליטה" },
    ];
    // הכותרת קודם ואז המספר — אורי: "נתון עם כותרת קטנה מתחתיו זה לא טוב"
    return `<section class="pulse">${cells
      .map(
        (c) => `<div class="pulse__cell">
          <div class="pulse__k">${esc(c.k)}</div>
          <div class="pulse__n">${c.n}${c.unit ? `<small>${c.unit}</small>` : ""}</div>
        </div>`
      )
      .join("")}</section>`;
  }

  /** מתג-מומחים: שלושה כפתורי-טקסט שקטים, הפעיל בקו-תחתון. */
  function rolesTabsHtml(active = "teacher") {
    return `<div class="roles" role="tablist">${ROLES.map(
      (r) => `<button class="roles__b${r.key === active ? " is-on" : ""}" type="button"
        role="tab" aria-selected="${r.key === active}" data-role="${r.key}">${esc(r.label)}</button>`
    ).join("")}</div>`;
  }

  function chartHtml(daily) {
    if (!Array.isArray(daily) || daily.length < 2) return "";
    const labels = daily.map((d) => shortDate(d.date));
    const svg = lineChart(
      [
        { values: daily.map((d) => d.mastery), color: "var(--accent)", width: 2.4 },
        { values: daily.map((d) => d.motivation), color: "var(--muted)", width: 1.6, dash: "4 5" },
      ],
      { labels, aria: "שליטה ומוטיבציה לאורך זמן" }
    );
    if (!svg) return "";
    const last = daily[daily.length - 1];
    return `<section class="block">
      <h2 class="block__title">ההתקדמות לאורך זמן</h2>
      <p class="block__lede">כל נקודה היא יום שבו ${"התלמיד/ה"} תרגל. <b>שליטה</b> היא אחוז התשובות הנכונות המצטבר —
        היא מטפסת לאט ומראה את הכיוון הכללי. <b>מוטיבציה</b> מורכבת מכמות התרגול באותו יום ומההצלחה בו, ולכן היא קופצנית יותר.</p>
      <div class="chart__wrap">${svg}</div>
      <div class="legend">
        <span class="legend__i"><i class="legend__k legend__k--solid"></i>שליטה — ${last.mastery}% כרגע</span>
        <span class="legend__i"><i class="legend__k legend__k--dash"></i>מוטיבציה — ${last.motivation}% כרגע</span>
      </div>
    </section>`;
  }

  function timeOfDayHtml(rows) {
    const list = (rows || []).filter((r) => r.minutes > 0);
    if (!list.length) return "";
    const top = list.reduce((a, b) => (b.minutes > a.minutes ? b : a));
    return `<section class="block">
      <h2 class="block__title">מתי לומדים</h2>
      <p class="block__lede">רוב זמן הלמידה נופל ב${esc(top.label.replace(/\s*\(.*\)/, ""))}.</p>
      <div class="clock">${list
        .map(
          (r) => `<div class="clock__row">
            <span class="clock__label">${esc(r.label)}</span>
            <span class="clock__track"><i style="width:${r.pct}%"></i></span>
            <span class="clock__val">${esc(minutesHe(r.minutes))}</span>
          </div>`
        )
        .join("")}</div>
    </section>`;
  }

  function topicHtml(t, areaKey, minutes) {
    const acc = t.accuracy;
    const warn = acc < 70;
    const bits = [`${t.attempts} תרגילים`];
    if (minutes) bits.push(minutesHe(minutes));
    if (t.last) bits.push(whenHe(t.last));
    return `<div class="topic" data-topic="${esc(t.name)}" data-area="${areaKey}">
      <button class="topic__row" type="button" aria-expanded="false">
        <span>
          <span class="topic__name">${esc(t.name)}</span>
          <span class="topic__sub">${esc(bits.join(" · "))}</span>
        </span>
        <span class="topic__bar${warn ? " topic__bar--warn" : ""}" aria-hidden="true"><i style="width:${acc}%"></i></span>
        <span class="topic__acc">${acc}<small>%</small></span>
        <span class="topic__chev" aria-hidden="true"></span>
      </button>
      <div class="verdict"><div class="verdict__inner">
        <div class="verdict__body">
          <img class="verdict__face" src="${FACE}friendly.png" alt="" />
          <div>
            ${rolesTabsHtml()}
            <div class="verdict__slot"><p class="verdict__none">טוען…</p></div>
          </div>
        </div>
      </div></div>
    </div>`;
  }

  function areaHtml(area, data, topicMinutes) {
    const has = data.attempts > 0;
    return `<section class="domain">
      <h2 class="domain__title">${esc(area.title)}</h2>
      <p class="domain__lede">${esc(area.lede)}</p>
      ${
        has
          ? `<div class="domain__figs">
              <span><em>תרגילים</em><b>${data.attempts}</b></span>
              <span><em>דיוק</em><b>${data.accuracy}%</b></span>
              <span><em>נושאים</em><b>${data.topics.length}</b></span>
              <span><em>ימי פעילות</em><b>${data.activeDays}</b></span>
            </div>
            <button class="depth" type="button" aria-expanded="false" data-area="${area.key}">
              <span class="depth__label">לעומק — נושא אחרי נושא</span>
              <span class="depth__chev" aria-hidden="true"></span>
            </button>
            <div class="topics" id="topics-${area.key}"><div class="topics__inner">
              <div class="topics__list">${data.topics
                .map((t) => topicHtml(t, area.key, topicMinutes.get(t.name)))
                .join("")}</div>
            </div></div>`
          : `<p class="empty">${esc(area.emptyText)}</p>`
      }
    </section>`;
  }

  function render(d) {
    const c = d.child || {};
    const s = d.summary || {};
    const areas = d.areas || { learn: {}, practice: {} };
    const minutes = new Map((d.topicTime || []).map((t) => [t.topic, t.minutes]));

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
            ${rolesTabsHtml()}
            <div class="verdict__slot"></div>
          </div>
        </div></div>
      </section>
      ${pulseHtml(s)}
      ${chartHtml(d.daily)}
      ${timeOfDayHtml(d.timeOfDay)}
      ${AREAS.map((a) => areaHtml(a, areas[a.key] || { attempts: 0, topics: [] }, minutes)).join("")}
    `;

    // "התלמיד/ה" בהסבר הגרף → השם האמיתי
    const lede = main.querySelector(".block__lede");
    if (lede && c.username) lede.innerHTML = lede.innerHTML.replace("התלמיד/ה", esc(c.username));

    $("#footNote").textContent =
      "חוות הדעת נכתבות על-ידי צוות vela לפי הפעילות בפועל, ומתעדכנות כשיש התקדמות משמעותית.";

    wire();
    loadOverall(); // רצה אחרי שהדף כבר על המסך — היצירה במודל עלולה לקחת זמן
  }

  /* ---------------- חוות דעת ---------------- */

  const overallRoles = {}; // key → טקסט
  const topicRoles = new Map(); // "area::topic" → {teacher, psychologist, mathematician}

  /** מסמן איזו לשונית פעילה, בלי לגעת בטקסט. */
  function markActiveRole(box, roleKey) {
    box.querySelectorAll(".roles__b").forEach((b) => {
      const on = b.dataset.role === roleKey;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-selected", String(on));
    });
  }

  /** מצייר את חוות הדעת של תפקיד מסוים לתוך בלוק (כללי או של נושא). */
  function paintRole(box, texts, roleKey) {
    const role = ROLES.find((r) => r.key === roleKey) || ROLES[0];
    const slot = box.querySelector(".verdict__slot");
    const face = box.querySelector(".verdict__face");
    face.src = FACE + role.face;
    const text = texts && texts[roleKey];
    slot.innerHTML = text
      ? markedHtml(text)
      : `<p class="verdict__none">אין עדיין חוות דעת מ${esc(role.label)} — צריך קצת יותר פעילות.</p>`;
    markActiveRole(box, roleKey);
    // ההדגשה נמתחת מחדש בכל החלפת מומחה
    box.classList.remove("is-marked");
    requestAnimationFrame(() => box.classList.add("is-marked"));
  }

  /** חוות הדעת הכוללת — נכנסת מתחת לשם ברגע שהיא מוכנה. */
  async function loadOverall() {
    const box = $("#overall");
    if (!box) return;
    let a = null;
    try {
      const { ok, data } = await api("/api/parent/verdict");
      a = (ok && data.assessments) || null;
    } catch {
      return; // 403 כבר החזיר למסך הכניסה
    }
    if (!a) return;
    let any = false;
    for (const r of ROLES) {
      overallRoles[r.key] = (a[r.key] && a[r.key].text) || "";
      if (overallRoles[r.key]) any = true;
    }
    if (!any) return; // אין עדיין מספיק פעילות — פשוט לא מציגים כלום
    box.hidden = false;
    paintRole(box, overallRoles, "teacher");
    box.querySelectorAll(".roles__b").forEach((b) => {
      b.addEventListener("click", () => paintRole(box, overallRoles, b.dataset.role));
    });
  }

  /* ---------------- אינטראקציה ---------------- */

  function wire() {
    // פתיחת תחום
    main.querySelectorAll(".depth").forEach((btn) => {
      btn.addEventListener("click", () => {
        const box = $(`#topics-${btn.dataset.area}`);
        const open = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", open ? "false" : "true");
        btn.querySelector(".depth__label").textContent = open ? "לעומק — נושא אחרי נושא" : "סגירה";
        box.classList.toggle("is-open", !open);
      });
    });

    // פתיחת נושא → חוות דעת
    main.querySelectorAll(".topic__row").forEach((row) => {
      row.addEventListener("click", () => openTopic(row));
    });

    // מתג-מומחים בתוך נושא. אם הטקסט עוד בדרך רק זוכרים את הבחירה —
    // בלי זה הלחיצה הייתה מוחקת את "טוען…" ומציגה "אין חוות דעת" בטעות.
    main.querySelectorAll(".topic .roles__b").forEach((b) => {
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        const topic = b.closest(".topic");
        topic.dataset.role = b.dataset.role;
        const key = `${topic.dataset.area}::${topic.dataset.topic}`;
        if (!topicRoles.has(key)) {
          markActiveRole(topic.querySelector(".verdict"), b.dataset.role); // רק הדגשת הלשונית
          return;
        }
        paintRole(topic.querySelector(".verdict"), topicRoles.get(key), b.dataset.role);
      });
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
    const wanted = () => topic.dataset.role || "teacher";
    if (topicRoles.has(key)) {
      paintRole(verdict, topicRoles.get(key), wanted());
      return;
    }

    const { ok, data } = await api(`/api/parent/topic?name=${encodeURIComponent(name)}`);
    const a = (ok && data.assessments) || {};
    const texts = {};
    for (const r of ROLES) texts[r.key] = (a[r.key] && a[r.key].text) || "";
    topicRoles.set(key, texts);
    if (!ok) {
      topicRoles.delete(key); // כשל רשת — לא לשמור במטמון, שהפתיחה הבאה תנסה שוב
      verdict.querySelector(".verdict__slot").innerHTML =
        `<p class="verdict__none">לא הצלחנו לטעון את חוות הדעת כרגע.</p>`;
      return;
    }
    paintRole(verdict, texts, wanted()); // המומחה שההורה בחר בזמן ההמתנה
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
