/* eslint-disable no-console */
/**
 * vela · אזור הורים — דף אחד. עיצוב Calm Premium.
 *
 * מבנה: מעבר-כניסה → Hero (שם + טבעת דיוק) → נתוני-משנה → 3 דברים שכדאי
 *        לדעת → מילה מהצוות → גרף התקדמות (טאבים) → מתי לומדים → אזורי עומק.
 * הלוגיקה (API, חוות-דעת בעצלתיים, פתיחת נושאים) זהה לגרסה הקודמת —
 * השתנתה רק שכבת-התצוגה. הגרסה הקודמת שמורה ב-backup/parent-pre-redesign-*.
 */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const bootView = $("#bootView");
  const loginView = $("#loginView");
  const appView = $("#app");
  const main = $("#main");

  const FACE = "/teacher-character/faces/";
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

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

  /* מעבר-כניסה: פעם אחת, קצר ומרגש; מדלגים עליו כשמבקשים פחות תנועה. */
  let enterPlayed = false;
  function showApp() {
    bootView.hidden = true;
    loginView.hidden = true;
    appView.hidden = false;
    if (!enterPlayed && !REDUCED) {
      enterPlayed = true;
      const fx = $("#enterFx");
      fx.hidden = false;
      setTimeout(() => fx.classList.add("is-out"), 1000);
      setTimeout(() => { fx.hidden = true; }, 1680);
    }
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

  const CHART = { W: 720, H: 170, padR: 8, padL: 8, padT: 16, padB: 26 };
  let chartState = null; // { daily, labels, series: "mastery"|"motivation" }

  /** עקומה חלקה (Catmull-Rom → Bezier) — שהקו ייראה כמו מוצר, לא כמו Excel. */
  function smoothPath(xs, ys) {
    if (xs.length < 3) return xs.map((x, i) => `${i ? "L" : "M"}${x},${ys[i]}`).join(" ");
    let d = `M${xs[0]},${ys[0]}`;
    for (let i = 0; i < xs.length - 1; i++) {
      const x0 = xs[Math.max(0, i - 1)], y0 = ys[Math.max(0, i - 1)];
      const x1 = xs[i], y1 = ys[i];
      const x2 = xs[i + 1], y2 = ys[i + 1];
      const x3 = xs[Math.min(xs.length - 1, i + 2)], y3 = ys[Math.min(ys.length - 1, i + 2)];
      const c1x = x1 + (x2 - x0) / 6, c1y = y1 + (y2 - y0) / 6;
      const c2x = x2 - (x3 - x1) / 6, c2y = y2 - (y3 - y1) / 6;
      d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`;
    }
    return d;
  }

  function chartSvg(values, labels) {
    const { W, H, padR, padL, padT, padB } = CHART;
    const n = values.length;
    // RTL: הזמן זורם מימין לשמאל — הנקודה הראשונה בימין
    const x = (i) => W - padR - (i / (n - 1)) * (W - padL - padR);
    const y = (v) => padT + (1 - Math.max(0, Math.min(100, v)) / 100) * (H - padT - padB);
    const xs = values.map((_, i) => x(i));
    const ys = values.map((v) => y(v));

    const grid = [0, 50, 100]
      .map((v) => `<line x1="${padL}" y1="${y(v)}" x2="${W - padR}" y2="${y(v)}"
        stroke="var(--line-soft)" stroke-width="1" />
        <text x="${W - padR}" y="${y(v) - 5}" class="chart__tick">${v}%</text>`)
      .join("");

    const line = smoothPath(xs, ys);
    const area = `${line} L${xs[n - 1].toFixed(1)},${y(0)} L${xs[0].toFixed(1)},${y(0)} Z`;
    const last = values[n - 1];

    const xLabels = labels && labels.length
      ? `<text x="${x(0)}" y="${H - 6}" class="chart__tick chart__tick--start">${esc(labels[0])}</text>
         <text x="${x(n - 1)}" y="${H - 6}" class="chart__tick chart__tick--end">${esc(labels[labels.length - 1])}</text>`
      : "";

    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="התקדמות לאורך זמן">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(18,165,160,0.16)" />
          <stop offset="100%" stop-color="rgba(18,165,160,0)" />
        </linearGradient>
      </defs>
      ${grid}
      <path d="${area}" fill="url(#areaGrad)" stroke="none" />
      <path class="chart__line" d="${line}" fill="none" stroke="var(--accent)" stroke-width="2.6"
        vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"
        pathLength="1" stroke-dasharray="1" stroke-dashoffset="${REDUCED ? 0 : 1}" />
      <circle cx="${xs[n - 1].toFixed(1)}" cy="${ys[n - 1].toFixed(1)}" r="4.5" fill="var(--accent)" />
      ${xLabels}
    </svg>`;
  }

  function paintChart() {
    const wrap = $("#chartWrap");
    if (!wrap || !chartState) return;
    const vals = chartState.daily.map((d) => (chartState.series === "motivation" ? d.motivation : d.mastery));
    wrap.innerHTML = chartSvg(vals, chartState.labels) + `<div class="chart__tip" id="chartTip"></div>`;
    // ציור הקו נכנס אחרי פריים — שה-transition יתפוס
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const line = wrap.querySelector(".chart__line");
        if (line) line.style.strokeDashoffset = "0";
      })
    );
    wireTooltip(wrap, vals);
  }

  function wireTooltip(wrap, vals) {
    const tip = $("#chartTip");
    const svg = wrap.querySelector("svg");
    if (!tip || !svg) return;
    const { W, padR, padL } = CHART;
    const n = vals.length;
    svg.addEventListener("mousemove", (e) => {
      const r = svg.getBoundingClientRect();
      const vx = ((e.clientX - r.left) / r.width) * W;
      const i = Math.round(((W - padR - vx) / (W - padL - padR)) * (n - 1));
      if (i < 0 || i > n - 1) return;
      const xPct = ((W - padR - (i / (n - 1)) * (W - padL - padR)) / W) * 100;
      const v = vals[i];
      const yPct = ((CHART.padT + (1 - v / 100) * (CHART.H - CHART.padT - CHART.padB)) / CHART.H) * 100;
      tip.style.right = `${100 - xPct}%`;
      tip.style.top = `${yPct}%`;
      tip.innerHTML = `${v}%<small>${esc(chartState.labels[i] || "")}</small>`;
      tip.classList.add("is-on");
    });
    svg.addEventListener("mouseleave", () => tip.classList.remove("is-on"));
  }

  /* ---------------- תבניות ---------------- */

  const AREAS = [
    {
      key: "learn",
      title: "אזור הלמידה",
      lede: "כאן המורה מלמד נושא מההתחלה — הסבר, דוגמאות ובדיקת הבנה תוך כדי.",
      emptyText: "עדיין לא התחילו שיעור באזור הלמידה.",
    },
    {
      key: "practice",
      title: "אזור התרגול",
      lede: "כאן פותרים תרגילים באופן עצמאי, לפי נושא ולפי רמה, והמורה זמין לשאלות.",
      emptyText: "עדיין לא נפתרו תרגילים באזור התרגול.",
    },
  ];

  function ringHtml(pct) {
    const R = 74;
    const C = 2 * Math.PI * R;
    const off = C * (1 - Math.max(0, Math.min(100, pct)) / 100);
    return `<div class="ring" role="img" aria-label="דיוק כללי ${pct}%">
      <svg width="168" height="168" viewBox="0 0 168 168">
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#17b8b2" />
            <stop offset="100%" stop-color="#0b7f7c" />
          </linearGradient>
        </defs>
        <circle class="ring__bg" cx="84" cy="84" r="${R}" />
        <circle class="ring__val" cx="84" cy="84" r="${R}"
          stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${REDUCED ? off.toFixed(1) : C.toFixed(1)}"
          data-off="${off.toFixed(1)}" />
      </svg>
      <div class="ring__center"><div>
        <div class="ring__num"><span class="cnt" data-n="${pct}">0</span><small>%</small></div>
        <div class="ring__k">דיוק כללי</div>
      </div></div>
    </div>`;
  }

  function pulseHtml(s, totalMinutes) {
    const cells = [
      { n: s.totalAttempts, k: "תרגילים נפתרו" },
      { n: s.activeDays, k: "ימי פעילות" },
      { n: s.masteredCount, unit: `מתוך ${s.topicsCount}`, k: "נושאים בשליטה" },
      { n: totalMinutes, unit: "דק׳", k: "זמן למידה כולל" },
    ];
    return `<section class="pulse rv">${cells
      .map(
        (c) => `<div class="pulse__cell">
          <div class="pulse__k">${esc(c.k)}</div>
          <div class="pulse__n"><span class="cnt" data-n="${c.n || 0}">0</span>${c.unit ? `<small>${esc(c.unit)}</small>` : ""}</div>
        </div>`
      )
      .join("")}</section>`;
  }

  /**
   * "3 דברים שכדאי לדעת" — נגזר בצד הלקוח מהנתונים הקיימים:
   * התחזק = נושא עם פעילות טרייה ודיוק גבוה; יציב = הרבה תרגול ודיוק גבוה;
   * לחזק = הדיוק הנמוך ביותר עם מספיק ניסיונות.
   */
  function insightsHtml(d) {
    const areas = d.areas || {};
    const all = [];
    for (const k of ["learn", "practice"]) {
      for (const t of (areas[k] && areas[k].topics) || []) {
        all.push(t);
      }
    }
    const seen = new Set();
    const topics = all.filter((t) => {
      if (seen.has(t.name)) return false;
      seen.add(t.name);
      return t.attempts >= 2;
    });
    const fresh = (t) => t.last && (Date.now() - new Date(t.last).getTime()) < 8 * 86400000;

    const up = topics.filter((t) => fresh(t) && t.accuracy >= 72)
      .sort((a, b) => b.accuracy - a.accuracy)[0];
    const firm = topics.filter((t) => t !== up && t.accuracy >= 80)
      .sort((a, b) => b.attempts - a.attempts)[0];
    const care = topics.filter((t) => t !== up && t !== firm && t.accuracy < 72 && t.attempts >= 3)
      .sort((a, b) => a.accuracy - b.accuracy)[0];

    const item = (chip, cls, topic, note) => `<div class="know__item">
      <span class="know__chip know__chip--${cls}">${chip}</span>
      <span class="know__topic">${esc(topic)}</span>
      <span class="know__note">${esc(note)}</span>
    </div>`;

    const one = up
      ? item("התחזק לאחרונה", "up", up.name, `דיוק של ${up.accuracy}% ופעילות ${whenHe(up.last)} — הכיוון מצוין.`)
      : item("התחזק לאחרונה", "up", "עוד מוקדם לדעת", "צריך עוד קצת תרגול כדי לזהות מגמה.");
    const two = firm
      ? item("יציב מאוד", "firm", firm.name, `${firm.attempts} תרגילים עם ${firm.accuracy}% דיוק — אפשר לסמוך על זה.`)
      : item("יציב מאוד", "firm", "עוד מוקדם לדעת", "נושא שמתורגל הרבה ובהצלחה יופיע כאן.");
    const three = care
      ? item("כדאי לחזק", "care", care.name, `הדיוק עומד על ${care.accuracy}% — שווה לחזור לזה יחד עם המורה.`)
      : item("כדאי לחזק", "care", "אין נקודות אדומות", "כרגע אין נושא שדורש חיזוק מיוחד. כל הכבוד!");

    return `<section class="know rv">
      <h2 class="know__title">3 דברים שכדאי לדעת</h2>
      <div class="know__row">${one}<div class="know__sep"></div>${two}<div class="know__sep"></div>${three}</div>
    </section>`;
  }

  /** מתג-מומחים: שלושה כפתורים בפס-גלולה, הפעיל לבן ומורם. */
  function rolesTabsHtml(active = "teacher") {
    return `<div class="roles" role="tablist">${ROLES.map(
      (r) => `<button class="roles__b${r.key === active ? " is-on" : ""}" type="button"
        role="tab" aria-selected="${r.key === active}" data-role="${r.key}">${esc(r.label)}</button>`
    ).join("")}</div>`;
  }

  function chartBlockHtml(daily) {
    if (!Array.isArray(daily) || daily.length < 2) return "";
    return `<section class="block rv">
      <h2 class="block__title">ההתקדמות לאורך זמן</h2>
      <p class="block__lede">כל נקודה היא יום שבו ${"התלמיד/ה"} תרגל. <b>שליטה</b> היא אחוז התשובות
        הנכונות המצטבר; <b>מוטיבציה</b> משקללת את כמות התרגול וההצלחה באותו יום.</p>
      <div class="chart__tabs" id="chartTabs">
        <button class="chart__tab is-on" type="button" data-series="mastery">שליטה</button>
        <button class="chart__tab" type="button" data-series="motivation">מוטיבציה</button>
      </div>
      <div class="chart__wrap" id="chartWrap"></div>
    </section>`;
  }

  function timeOfDayHtml(rows) {
    const list = (rows || []).filter((r) => r.minutes > 0);
    if (!list.length) return "";
    const top = list.reduce((a, b) => (b.minutes > a.minutes ? b : a));
    return `<section class="block rv">
      <h2 class="block__title">מתי לומדים</h2>
      <p class="block__lede">רוב זמן הלמידה נופל ב${esc(top.label.replace(/\s*\(.*\)/, ""))}.</p>
      <div class="clock">${list
        .map(
          (r) => `<div class="clock__row">
            <span class="clock__label">${esc(r.label)}</span>
            <span class="clock__track"><i data-w="${r.pct}"></i></span>
            <span class="clock__val">${esc(minutesHe(r.minutes))}</span>
          </div>`
        )
        .join("")}</div>
    </section>`;
  }

  // קצב-למידה: רצף ימים + זמן השבוע/החודש + מפת-חום של 30 הימים האחרונים.
  // משתמש בנתונים שכבר נשלחים מהשרת (d.month, s.dayStreak) ולא הוצגו עד היום.
  function rhythmHtml(d, s) {
    const pts = (d.month && d.month.points) || [];
    if (!pts.length) return "";
    const weekMin = pts.slice(-7).reduce((a, p) => a + (p.value || 0), 0);
    const monthMin = pts.reduce((a, p) => a + (p.value || 0), 0);
    const max = Math.max(1, ...pts.map((p) => p.value || 0));
    const lvl = (v) => (!v ? 0 : v >= max * 0.66 ? 4 : v >= max * 0.4 ? 3 : v >= max * 0.15 ? 2 : 1);
    const streak = s.dayStreak || 0;
    const cells = pts
      .map((p) => `<i class="heat heat--${lvl(p.value)}" title="${esc(p.detail || "")}"></i>`)
      .join("");
    return `<section class="block rhythm rv">
      <h2 class="block__title">קצב הלמידה</h2>
      <p class="block__lede">עקביות חשובה יותר מכמות — כמה דקות ובאילו ימים היו תרגולים ב-30 הימים האחרונים.</p>
      <div class="rhythm__stats">
        <div class="rhythm__stat rhythm__stat--fire">
          <div class="rhythm__big"><span class="cnt" data-n="${streak}">0</span></div>
          <div class="rhythm__k">🔥 ימים ברצף</div>
        </div>
        <div class="rhythm__stat">
          <div class="rhythm__big"><span class="cnt" data-n="${weekMin}">0</span><small>דק׳</small></div>
          <div class="rhythm__k">השבוע</div>
        </div>
        <div class="rhythm__stat">
          <div class="rhythm__big"><span class="cnt" data-n="${monthMin}">0</span><small>דק׳</small></div>
          <div class="rhythm__k">החודש</div>
        </div>
      </div>
      <div class="heatmap" role="img" aria-label="פעילות 30 הימים האחרונים">${cells}</div>
      <div class="heatmap__legend"><span>פחות</span><i class="heat heat--1"></i><i class="heat heat--2"></i><i class="heat heat--3"></i><i class="heat heat--4"></i><span>יותר</span></div>
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
    return `<section class="domain rv">
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
      <section class="hero rv">
        <div class="hero__id">
          <img class="hero__face" src="${FACE}friendly.png" alt="" />
          <div>
            <p class="hero__hi">שלום! הנה תמונת-המצב של</p>
            <h1 class="hero__name">${esc(c.username || "התלמיד/ה")}</h1>
            <p class="hero__meta">${meta.map((x) => `<span>${esc(x)}</span>`).join("")}</p>
          </div>
        </div>
        ${ringHtml(s.accuracy || 0)}
      </section>
      ${pulseHtml(s, (d.topicTime || []).reduce((a, t) => a + (t.minutes || 0), 0))}
      ${insightsHtml(d)}
      <section class="overall verdict is-open rv" id="overall" hidden>
        <div class="verdict__inner"><div class="verdict__body">
          <img class="verdict__face" src="${FACE}friendly.png" alt="" />
          <div>
            ${rolesTabsHtml()}
            <div class="verdict__slot"></div>
          </div>
        </div></div>
      </section>
      ${chartBlockHtml(d.daily)}
      ${rhythmHtml(d, s)}
      ${timeOfDayHtml(d.timeOfDay)}
      <div class="domains">
        ${AREAS.map((a) => areaHtml(a, areas[a.key] || { attempts: 0, topics: [] }, minutes)).join("")}
      </div>
    `;

    // "התלמיד/ה" בהסבר הגרף → השם האמיתי
    const lede = main.querySelector(".block__lede");
    if (lede && c.username) lede.innerHTML = lede.innerHTML.replace("התלמיד/ה", esc(c.username));

    $("#footNote").textContent =
      "חוות הדעת נכתבות על-ידי צוות vela לפי הפעילות בפועל, ומתעדכנות כשיש התקדמות משמעותית.";

    // גרף: מצב פנימי + טאבים
    if (Array.isArray(d.daily) && d.daily.length >= 2) {
      chartState = { daily: d.daily, labels: d.daily.map((x) => shortDate(x.date)), series: "mastery" };
      const tabs = $("#chartTabs");
      if (tabs) {
        tabs.querySelectorAll(".chart__tab").forEach((b) =>
          b.addEventListener("click", () => {
            tabs.querySelectorAll(".chart__tab").forEach((x) => x.classList.toggle("is-on", x === b));
            chartState.series = b.dataset.series;
            paintChart();
          })
        );
      }
    }

    wire();
    animateIn();
    loadOverall(); // רצה אחרי שהדף כבר על המסך — היצירה במודל עלולה לקחת זמן
  }

  /* ---------------- תנועה: reveal, count-up, טבעת, פסים ---------------- */

  function countUp(el) {
    const target = Number(el.dataset.n) || 0;
    if (REDUCED || target === 0) {
      el.textContent = String(target);
      return;
    }
    const t0 = performance.now();
    const dur = 850;
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(target * e));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function animateIn() {
    const sections = main.querySelectorAll(".rv");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          const el = en.target;
          io.unobserve(el);
          requestAnimationFrame(() => el.classList.add("is-in"));
          // רשת-ביטחון: אם ה-transition לא רץ (לשונית ברקע), מקבעים מצב סופי
          setTimeout(() => {
            if (getComputedStyle(el).opacity !== "1") {
              el.style.opacity = "1";
              el.style.transform = "none";
            }
          }, 900);
          el.querySelectorAll(".cnt").forEach(countUp);
          el.querySelectorAll(".clock__track i").forEach((i) => {
            i.style.width = `${i.dataset.w}%`;
          });
          const ring = el.querySelector(".ring__val");
          if (ring) requestAnimationFrame(() => { ring.style.strokeDashoffset = ring.dataset.off; });
          if (el.querySelector("#chartWrap")) paintChart();
        });
      },
      { threshold: 0.18 }
    );
    // כניסה מדורגת לחלק העליון; השאר נחשף בגלילה
    sections.forEach((el, i) => {
      el.style.transitionDelay = `${Math.min(i, 3) * 90}ms`;
      io.observe(el);
    });
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
    requestAnimationFrame(() => box.classList.add("is-in"));
    paintRole(box, overallRoles, "teacher");
    box.querySelectorAll(".roles__b").forEach((b) => {
      b.addEventListener("click", () => switchOverallRole(box, b.dataset.role));
    });
  }

  /**
   * מעבר בין מומחים בחוות-הדעת הכוללת.
   * השרת מייצר עכשיו רק את המורה מראש; הפסיכולוג והמתמטיקאי נוצרים בקריאה
   * הראשונה שבה באמת לוחצים עליהם. הלחיצה מסמנת מיד את הלשונית ומראה
   * "כותב…" — היצירה במודל לוקחת כמה שניות.
   */
  async function switchOverallRole(box, roleKey) {
    if (overallRoles[roleKey]) return paintRole(box, overallRoles, roleKey);

    markActiveRole(box, roleKey);
    const role = ROLES.find((r) => r.key === roleKey) || ROLES[0];
    box.querySelector(".verdict__face").src = FACE + role.face;
    box.querySelector(".verdict__slot").innerHTML =
      `<p class="verdict__none">${esc(role.label)} כותב/ת עכשיו…</p>`;

    let text = "";
    try {
      const { ok, data } = await api(`/api/parent/verdict?role=${encodeURIComponent(roleKey)}`);
      text = (ok && data.assessments && data.assessments[roleKey] && data.assessments[roleKey].text) || "";
    } catch {
      return;
    }
    overallRoles[roleKey] = text;
    // רק אם ההורה לא עבר בינתיים ללשונית אחרת
    const still = box.querySelector(".roles__b.is-on");
    if (still && still.dataset.role === roleKey) paintRole(box, overallRoles, roleKey);
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
          markActiveRole(topic.querySelector(".verdict"), b.dataset.role); // עוד נטען — רק הדגשה
          return;
        }
        switchTopicRole(topic, key, b.dataset.role);
      });
    });
  }

  /** מעבר בין מומחים בתוך נושא — מייצר את התפקיד רק בלחיצה הראשונה עליו. */
  async function switchTopicRole(topic, key, roleKey) {
    const verdict = topic.querySelector(".verdict");
    const texts = topicRoles.get(key) || {};
    if (texts[roleKey]) return paintRole(verdict, texts, roleKey);

    markActiveRole(verdict, roleKey);
    const role = ROLES.find((r) => r.key === roleKey) || ROLES[0];
    verdict.querySelector(".verdict__face").src = FACE + role.face;
    verdict.querySelector(".verdict__slot").innerHTML =
      `<p class="verdict__none">${esc(role.label)} כותב/ת עכשיו…</p>`;

    const name = topic.dataset.topic;
    let text = "";
    try {
      const { ok, data } = await api(
        `/api/parent/topic?name=${encodeURIComponent(name)}&role=${encodeURIComponent(roleKey)}`
      );
      const a = (ok && data.assessments) || {};
      text = (a[roleKey] && a[roleKey].text) || "";
    } catch {
      return;
    }
    texts[roleKey] = text;
    topicRoles.set(key, texts);
    const still = verdict.querySelector(".roles__b.is-on");
    if (still && still.dataset.role === roleKey) paintRole(verdict, texts, roleKey);
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
