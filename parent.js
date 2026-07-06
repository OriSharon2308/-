/* eslint-disable no-console */
// וֶלָה · אזור הורים — לוח מעקב על הילד. מדבר עם /api/parent/*.
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const bootView = $("#bootView");
  const loginView = $("#loginView");
  const appView = $("#app");
  const main = $("#main");

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
    try { data = await res.json(); } catch {}
    if (res.status === 403) { showLogin(); throw new Error("forbidden"); }
    return { ok: res.ok, data };
  }
  function fmtDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso.length <= 10 ? iso + "T00:00:00" : iso);
    if (isNaN(d)) return String(iso).slice(0, 10);
    return d.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });
  }
  function fmtDay(date) {
    const p = String(date).split("-");
    return p.length === 3 ? `${p[2]}/${p[1]}` : String(date);
  }
  function fmtMinutes(min) {
    if (!min) return "0 דק׳";
    if (min < 60) return `${min} דק׳`;
    const h = Math.floor(min / 60), m = min % 60;
    return m ? `${h} ש׳ ${m} דק׳` : `${h} שעות`;
  }
  function genderHe(g) { return g === "female" ? "בת" : "בן"; }
  // תווית סטטוס בלשון הנכונה לפי מין הילד — בלי לוכסנים
  let curGender = "male"; // נקבע אחרי הטעינה, לפי חשבון הילד
  function statusInfo(status) {
    const f = curGender === "female";
    const map = {
      mastered: ["pill--ok", f ? "שולטת" : "שולט"],
      in_progress: ["pill--info", "בתהליך"],
      struggling: ["pill--warn", "מתקשה"],
      not_started: ["pill--gray", f ? "טרם התחילה" : "טרם התחיל"],
    };
    return map[status] || ["pill--gray", status];
  }

  /* ---------------- תרשים קווי — הזמן משמאל (ישן) לימין (חדש), ציר-הערכים בשמאל ---------------- */
  function niceMax(v) {
    if (v <= 5) return 5;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
  }
  function lineChart(series, opts = {}) {
    const W = 680, H = 210, padL = 52, padR = 16, padT = 14, padB = 26;
    const allPts = series.flatMap((s) => s.points);
    if (!allPts.length || allPts.every((p) => !p.value)) return `<div class="empty">אין עדיין נתונים להצגה.</div>`;
    const max = opts.max || niceMax(Math.max(...allPts.map((p) => p.value), 1));
    const xLeft = padL, xRight = W - padR;
    const xAt = (i, len) => (len <= 1 ? (xLeft + xRight) / 2 : xLeft + (i / (len - 1)) * (xRight - xLeft));
    const yAt = (v) => padT + (1 - Math.min(v, max) / max) * (H - padT - padB);
    const grid = [0, 0.25, 0.5, 0.75, 1].map((f) => {
      const g = Math.round(f * max), y = yAt(g);
      return `<line x1="${xLeft}" y1="${y.toFixed(1)}" x2="${xRight}" y2="${y.toFixed(1)}" stroke="#eef1f4"/>` +
        `<text x="${xLeft - 9}" y="${(y + 3.5).toFixed(1)}" text-anchor="end" font-size="10" fill="#98a0ab">${g}${opts.unit || ""}</text>`;
    }).join("");
    const lp = series[0].points;
    const step = Math.max(1, Math.ceil(lp.length / 7));
    const xlabels = lp.map((p, i) => (i % step === 0 || i === lp.length - 1)
      ? `<text x="${xAt(i, lp.length).toFixed(1)}" y="${H - 8}" text-anchor="middle" font-size="9.5" fill="#98a0ab">${esc(fmtDay(p.label))}</text>` : "").join("");
    const body = series.map((s, si) => {
      const pts = s.points.map((p, i) => [xAt(i, s.points.length), yAt(p.value), p]);
      const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
      let area = "";
      if (si === 0 && pts.length > 1) {
        area = `<path d="M${pts[0][0].toFixed(1)},${yAt(0).toFixed(1)} ${pts.map((p) => `L${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ")} L${pts[pts.length - 1][0].toFixed(1)},${yAt(0).toFixed(1)} Z" fill="${s.color}" opacity="0.08"/>`;
      }
      const line = `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`;
      // נקודות + עיגול-פגיעה שקוף גדול עם tooltip (התאריך המדויק בריחוף)
      const dots = s.points.length <= 40 ? pts.map((p) => {
        const tip = p[2].tip || fmtDay(p[2].label);
        return `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.6" fill="#fff" stroke="${s.color}" stroke-width="1.6"/>` +
          `<circle class="hitDot" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="11" fill="transparent" data-tip="${esc(tip)}"/>`;
      }).join("") : "";
      return area + line + dots;
    }).join("");
    // עטיפה עם שכבת tooltip — כיוון LTR כדי שהציר יישאר משמאל
    return `<div class="chartWrap" dir="ltr"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.title || "תרשים")}">${grid}${xlabels}${body}</svg><div class="chartTip" dir="rtl"></div></div>`;
  }

  /** חלונית-ריחוף על נקודות התרשים — עוקבת אחרי העיגול, נעלמת ביציאה. */
  function wireTips(root) {
    root.querySelectorAll(".chartWrap").forEach((wrap) => {
      const tipEl = wrap.querySelector(".chartTip");
      wrap.addEventListener("pointerover", (e) => {
        const dot = e.target.closest(".hitDot");
        if (!dot) return;
        tipEl.textContent = dot.dataset.tip;
        const wr = wrap.getBoundingClientRect();
        const dr = dot.getBoundingClientRect();
        tipEl.style.left = dr.left - wr.left + dr.width / 2 + "px";
        tipEl.style.top = dr.top - wr.top + "px";
        tipEl.classList.add("show");
      });
      wrap.addEventListener("pointerout", (e) => {
        if (e.target.closest(".hitDot")) tipEl.classList.remove("show");
      });
    });
  }

  /* ---------------- פס-טעינה ירוק — מתמלא בהדרגה, והתוכן מוצג רק ב-100% ---------------- */
  async function withProgress(container, task) {
    container.innerHTML = `<div class="loadWrap"><div class="loadBar"><div class="loadBar__fill"></div></div></div>`;
    const fill = container.querySelector(".loadBar__fill");
    let v = 0;
    const iv = setInterval(() => {
      v += (90 - v) * 0.055; // מתקרב ל-90% בהדרגה, חלק
      if (fill) fill.style.width = v.toFixed(1) + "%";
    }, 110);
    try {
      const result = await task();
      clearInterval(iv);
      if (fill) fill.style.width = "100%";
      await new Promise((r) => setTimeout(r, 300)); // נותנים לפס להגיע ל-100 חלק
      return result;
    } catch (e) {
      clearInterval(iv);
      throw e;
    }
  }

  /* ---------------- אימות ---------------- */
  function showLogin() {
    bootView.hidden = true; appView.hidden = true; loginView.hidden = false;
    setTimeout(() => $("#pUser")?.focus(), 50);
  }
  function showApp() { bootView.hidden = true; loginView.hidden = true; appView.hidden = false; }
  async function checkAuth() {
    try {
      const { data } = await api("/api/parent/me");
      if (data.parent) { showApp(); render(); }
      else showLogin();
    } catch { showLogin(); }
  }
  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errEl = $("#loginErr"); errEl.hidden = true;
    const { ok, data } = await api("/api/parent/login", {
      method: "POST",
      body: { username: $("#pUser").value.trim(), password: $("#pPw").value },
    });
    if (ok && data.ok) { $("#pPw").value = ""; showApp(); render(); }
    else { errEl.textContent = data.error || "כניסה נכשלה."; errEl.hidden = false; }
  });
  $("#logoutBtn").addEventListener("click", async () => {
    await api("/api/parent/logout", { method: "POST" });
    showLogin();
  });

  /* ---------------- הלוח ---------------- */
  async function render() {
    main.innerHTML = `<div class="empty"><span class="spin"></span></div>`;
    const { data } = await api("/api/parent/overview");
    if (!data.ok) { main.innerHTML = `<div class="empty">${esc(data.error || "שגיאה בטעינה")}</div>`; return; }
    const { child, summary, daily, month, topicTime, timeOfDay, assessments } = data;
    curGender = child.gender === "female" ? "female" : "male";
    const fem = curGender === "female";
    const name = [child.firstName, child.lastName].filter(Boolean).join(" ") || child.username;
    const totalMin = timeOfDay.reduce((s, b) => s + b.minutes, 0);
    const timeByTopic = new Map(topicTime.map((t) => [t.topic, t.minutes]));

    main.innerHTML = `
      <div class="child">
        <div class="child__avatar">${esc((name.trim()[0] || "?"))}</div>
        <div>
          <div class="child__name">${esc(name)}</div>
          <div class="child__meta">${genderHe(child.gender)} · כיתה ${esc(child.grade || "—")} · גיל ${esc(child.age ?? "—")} · ${esc(child.school || "—")} · ${fem ? "הצטרפה" : "הצטרף"} ${fmtDate(child.createdAt)}</div>
        </div>
      </div>

      <div class="kpis">
        <div class="kpi"><div class="kpi__v accent">${summary.totalAttempts.toLocaleString("he-IL")}</div><div class="kpi__k">תרגילים</div></div>
        <div class="kpi"><div class="kpi__v">${summary.accuracy}%</div><div class="kpi__k">דיוק</div></div>
        <div class="kpi"><div class="kpi__v">${summary.currentMastery}%</div><div class="kpi__k">שליטה בחומר</div></div>
        <div class="kpi"><div class="kpi__v">${fmtMinutes(totalMin)}</div><div class="kpi__k">סה״כ זמן לימוד</div></div>
        <div class="kpi"><div class="kpi__v">${summary.activeDays}</div><div class="kpi__k">ימי פעילות</div></div>
        <div class="kpi"><div class="kpi__v">${summary.dayStreak}</div><div class="kpi__k">רצף ימים</div></div>
      </div>

      <section class="sect">
        <h2 class="sect__title">מה הצוות אומר</h2>
        <p class="sect__sub">חוות דעת המורה, עם מבט הפסיכולוג והמתמטיקאי — מתעדכנת כשמשהו משמעותי משתנה</p>
        <div class="card">${report(assessments)}</div>
      </section>

      <section class="sect">
        <h2 class="sect__title">התקדמות לאורך זמן</h2>
        <p class="sect__sub">שליטה מצטברת בחומר ודיוק יומי</p>
        <div class="card">
          ${lineChart([
            { color: "#16606f", points: daily.map((d) => ({ label: d.date, value: d.mastery, tip: `${fmtDate(d.date)} · שליטה ${d.mastery}%` })) },
            { color: "#c9d2da", points: daily.map((d) => ({ label: d.date, value: d.accuracy, tip: `${fmtDate(d.date)} · דיוק ${d.accuracy}%` })) },
          ], { max: 100, unit: "%", title: "התקדמות" })}
          <div class="legend"><span><i style="background:#16606f"></i>שליטה מצטברת</span><span><i style="background:#c9d2da"></i>דיוק יומי</span></div>
        </div>
      </section>

      <section class="sect">
        <h2 class="sect__title">כמה זמן ${genderHe(child.gender) === "בת" ? "היא לומדת" : "הוא לומד"}</h2>
        <p class="sect__sub">דקות לימוד בכל יום — 30 הימים האחרונים</p>
        <div class="card">
          ${lineChart([{ color: "#8d6f44", points: (month?.points || []).map((p) => ({ label: p.label, value: p.value, tip: p.detail || `${p.label} · ${p.value} דק׳` })) }], { unit: "׳", title: "זמן יומי" })}
        </div>
      </section>

      <section class="sect">
        <h2 class="sect__title">באילו שעות ביום</h2>
        <p class="sect__sub">חלוקת זמן הלימוד לאורך היום, מכל התקופה</p>
        <div class="card"><div class="tod">
          ${timeOfDay.map((b) => `
            <div class="tod__row">
              <div class="tod__label">${esc(b.label)}</div>
              <div class="tod__track"><div class="tod__fill" style="width:${b.pct}%"></div></div>
              <div class="tod__val">${fmtMinutes(b.minutes)} · ${b.pct}%</div>
            </div>`).join("")}
        </div></div>
      </section>

      <section class="sect">
        <h2 class="sect__title">הנושאים של${genderHe(child.gender) === "בת" ? "ה" : "ו"}</h2>
        <p class="sect__sub">לחיצה על נושא פותחת פירוט מלא עם חוות דעת המורה, הפסיכולוג והמתמטיקאי</p>
        ${summary.topics.length ? `<div class="topicGrid">
          ${summary.topics.map((t) => {
            const dot = { mastered: "ok", in_progress: "info", struggling: "warn" }[t.status] || "gray";
            const label = statusInfo(t.status)[1];
            return `<button class="topicBtn" data-topic="${esc(t.name)}">
              <span class="topicBtn__name">${esc(t.name)}</span>
              <span class="topicBtn__meta"><span class="tdot tdot--${dot}"></span>${label}</span>
            </button>`;
          }).join("")}
        </div>` : `<div class="empty">אין עדיין פעילות.</div>`}
      </section>`;
    main.querySelectorAll(".topicBtn").forEach((b) =>
      b.addEventListener("click", () => openTopic(b.dataset.topic))
    );
    wireTips(main);
  }

  /* ---------------- חלון פירוט נושא ---------------- */
  const modal = $("#modal");
  const modalBody = $("#modalBody");
  function openModal() { modal.hidden = false; document.body.style.overflow = "hidden"; }
  function closeModal() { modal.hidden = true; document.body.style.overflow = ""; modalBody.innerHTML = ""; }
  modal.addEventListener("click", (e) => { if (e.target.dataset.close !== undefined) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) closeModal(); });

  async function openTopic(name, refresh) {
    openModal();
    // פס-טעינה ירוק רק ברענון מפורש (יצירת חוות דעת חדשות); פתיחה רגילה — מהמטמון, מהירה
    const fetchTopic = () => api(`/api/parent/topic?name=${encodeURIComponent(name)}${refresh ? "&refresh=1" : ""}`);
    let res;
    if (refresh) {
      res = await withProgress(modalBody, fetchTopic);
    } else {
      modalBody.innerHTML = `<div class="empty" style="padding:70px"><span class="spin"></span></div>`;
      res = await fetchTopic();
    }
    const { data } = res;
    if (!data.ok) { modalBody.innerHTML = `<div class="empty">${esc(data.error || "שגיאה")}</div>`; return; }
    const { topic, minutes, days, recent, assessments } = data;
    const [cls, label] = statusInfo(topic.status);
    modalBody.innerHTML = `
      <div class="tHead">
        <div class="tHead__name">${esc(topic.name)}</div>
        <span class="pill ${cls}">${label}</span>
      </div>
      <div class="tKpis">
        <div class="kpi"><div class="kpi__v accent">${topic.accuracy}%</div><div class="kpi__k">דיוק</div></div>
        <div class="kpi"><div class="kpi__v">${topic.correct}/${topic.attempts}</div><div class="kpi__k">תרגילים</div></div>
        <div class="kpi"><div class="kpi__v">${fmtMinutes(minutes)}</div><div class="kpi__k">זמן בנושא</div></div>
        <div class="kpi"><div class="kpi__v">${topic.streak}</div><div class="kpi__k">רצף נכונות</div></div>
      </div>
      ${days.length > 1 ? `<div class="tSection">
        <div class="tSection__title">שליטה בנושא לאורך זמן</div>
        ${lineChart([{ color: "#16606f", points: days.map((d) => ({ label: d.date, value: d.mastery, tip: `${fmtDate(d.date)} · ${d.mastery}%` })) }], { max: 100, unit: "%", title: topic.name })}
      </div>` : ""}
      <div class="tSection">
        <div class="tSection__title">מה הצוות אומר על הנושא<span class="sp"></span><button class="btn btn--ghost btn--sm" id="tRefresh">רענון</button></div>
        ${report(assessments, "מתעדכן כשמשהו משתנה בנושא")}
      </div>
      ${recent.length ? `<div class="tSection">
        <div class="tSection__title">תרגילים אחרונים</div>
        <div class="recent">
          ${recent.map((r) => `<div class="recent__row ${r.correct ? "ok" : "no"}">
            <span class="recent__mark ${r.correct ? "ok" : "no"}">${r.correct ? "✓" : "✗"}</span>
            <div class="recent__main">
              <div class="recent__q" dir="auto">${esc(r.problem || "תרגיל")}</div>
              <div class="recent__meta">ענה: <b dir="auto">${esc(String(r.answer))}</b> · ${fmtDate(r.t)}</div>
            </div>
          </div>`).join("")}
        </div>
      </div>` : ""}`;
    $("#tRefresh")?.addEventListener("click", () => openTopic(name, true));
    wireTips(modalBody);
  }

  /* חוות דעת הצוות — שלושה בלוקים אחידים: מורה / פסיכולוג / מתמטיקאי (כמו באזור הניהול) */
  function report(a, footNote) {
    const upd = a?.updatedAt || a?.teacher?.updatedAt;
    const block = (color, roleName, text, first) => text ? `
      <div class="${first ? "" : "report__sub"}">
        <div class="report__role"><span class="dot" style="background:${color}"></span>${roleName}</div>
        ${esc(text)}
      </div>` : "";
    const t = a?.teacher?.text, p = a?.psychologist?.text, m = a?.mathematician?.text;
    if (!t && !p && !m) {
      return `<div class="report"><div class="report__lead">${curGender === "female" ? "אין עדיין חוות דעת — היא רק בתחילת הדרך." : "אין עדיין חוות דעת — הוא רק בתחילת הדרך."}</div></div>`;
    }
    return `<div class="report">
      ${block("#16606f", "המורה", t, true)}
      ${block("#6d5ba6", "הפסיכולוג", p)}
      ${block("#a23b3b", "המתמטיקאי", m)}
      ${upd ? `<div class="report__time">עודכן ${fmtDate(upd)}${footNote ? " · " + footNote : ""}</div>` : ""}
    </div>`;
  }

  checkAuth();
})();
