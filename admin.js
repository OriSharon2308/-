/* eslint-disable no-console */
// וֶלָה · מערכת ניהול — לוגיקת צד-לקוח (vanilla). מדבר עם /api/admin/*.
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const bootView = $("#bootView");
  const loginView = $("#loginView");
  const appView = $("#app");
  const main = $("#main");
  const modal = $("#modal");
  const modalBody = $("#modalBody");

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
    });
    let data = {};
    try { data = await res.json(); } catch {}
    if (res.status === 403) { showLogin(); throw new Error("forbidden"); }
    return { ok: res.ok, status: res.status, data };
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
  function daysAgo(date) {
    if (!date) return "—";
    const d = new Date(date + "T00:00:00");
    const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (diff <= 0) return "היום";
    if (diff === 1) return "אתמול";
    if (diff < 30) return `לפני ${diff} ימים`;
    return fmtDate(date);
  }
  function genderHe(g) { return g === "female" ? "בת" : "בן"; }
  let toastEl = null;
  function toast(msg, isErr) {
    if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "toast"; document.body.appendChild(toastEl); }
    toastEl.textContent = msg;
    toastEl.classList.toggle("err", !!isErr);
    toastEl.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toastEl.classList.remove("show"), 2600);
  }
  const STATUS_PILL = {
    mastered: ["pill--ok", "נשלט"], in_progress: ["pill--info", "בתהליך"],
    struggling: ["pill--warn", "מתקשה"], not_started: ["pill--gray", "טרם התחיל"],
  };

  /* ---------------- תרשים קווי ---------------- */
  function niceMax(v) {
    if (v <= 5) return 5;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / p;
    const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
    return m * p;
  }
  function lineChart(series, opts = {}) {
    const W = 680, H = 200, padL = 40, padR = 16, padT = 12, padB = 26;
    const allPts = series.flatMap((s) => s.points);
    if (!allPts.length) return `<div class="empty">אין עדיין נתונים להצגה.</div>`;
    const max = opts.max || niceMax(Math.max(...allPts.map((p) => p.value), 1));
    const xAt = (i, len) => padL + (len <= 1 ? (W - padL - padR) / 2 : (i / (len - 1)) * (W - padL - padR));
    const yAt = (v) => padT + (1 - Math.min(v, max) / max) * (H - padT - padB);
    const grid = [0, 0.25, 0.5, 0.75, 1].map((f) => {
      const g = Math.round(f * max), y = yAt(g);
      return `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}" stroke="#eef1f4"/>` +
        `<text x="${padL - 7}" y="${(y + 3.5).toFixed(1)}" text-anchor="end" font-size="10" fill="#a7adb8">${g}${opts.unit || ""}</text>`;
    }).join("");
    const lp = series[0].points;
    const step = Math.max(1, Math.ceil(lp.length / 7));
    const xlabels = lp.map((p, i) => (i % step === 0 || i === lp.length - 1)
      ? `<text x="${xAt(i, lp.length).toFixed(1)}" y="${H - 8}" text-anchor="middle" font-size="9.5" fill="#a7adb8">${esc(fmtDay(p.label))}</text>` : "").join("");
    const body = series.map((s, si) => {
      const pts = s.points.map((p, i) => [xAt(i, s.points.length), yAt(p.value)]);
      const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
      let area = "";
      if (si === 0 && opts.fill !== false && pts.length > 1) {
        area = `<path d="M${pts[0][0].toFixed(1)},${yAt(0).toFixed(1)} ${pts.map((p) => `L${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ")} L${pts[pts.length - 1][0].toFixed(1)},${yAt(0).toFixed(1)} Z" fill="${s.color}" opacity="0.07"/>`;
      }
      const line = `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`;
      const dots = s.points.length <= 40 ? pts.map((p) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.4" fill="#fff" stroke="${s.color}" stroke-width="1.6"/>`).join("") : "";
      return area + line + dots;
    }).join("");
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.title || "תרשים")}">${grid}${xlabels}${body}</svg>`;
  }

  /* ---------------- אימות + פתיחת חלון ---------------- */
  function showLogin(notConfigured) {
    bootView.hidden = true; appView.hidden = true; loginView.hidden = false;
    $("#loginNotConfigured").hidden = !notConfigured;
    setTimeout(() => $("#adminPw")?.focus(), 50);
  }
  function showApp() { bootView.hidden = true; loginView.hidden = true; appView.hidden = false; }
  async function checkAuth() {
    try {
      const { data } = await api("/api/admin/me");
      if (data.admin) { showApp(); navigate("overview"); }
      else showLogin(!data.configured);
    } catch { showLogin(); }
  }
  let adminWin = null;
  function openAppWindow() {
    adminWin = window.open(location.pathname, "velaAdmin", "width=1280,height=880");
    return adminWin && !adminWin.closed;
  }
  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errEl = $("#loginErr"); errEl.hidden = true;
    const { ok, data } = await api("/api/admin/login", { method: "POST", body: { password: $("#adminPw").value } });
    if (ok && data.ok) {
      $("#adminPw").value = "";
      if (openAppWindow()) { $("#loginOpened").hidden = false; }
      else { showApp(); navigate("overview"); } // נחסם חלון קופץ → נפתח באותו מסך
    } else { errEl.textContent = data.error || "כניסה נכשלה."; errEl.hidden = false; }
  });
  $("#reopenBtn")?.addEventListener("click", () => { if (adminWin && !adminWin.closed) adminWin.focus(); else openAppWindow(); });
  $("#logoutBtn").addEventListener("click", async () => { await api("/api/admin/logout", { method: "POST" }); showLogin(); });

  /* ---------------- ניווט ---------------- */
  const nav = $("#nav");
  nav.addEventListener("click", (e) => { const b = e.target.closest(".navBtn"); if (b) navigate(b.dataset.view); });
  function setNav(v) { nav.querySelectorAll(".navBtn").forEach((b) => b.classList.toggle("is-active", b.dataset.view === v)); }
  function navigate(view) {
    setNav(view);
    main.innerHTML = `<div class="empty">טוען…</div>`;
    if (view === "overview") renderOverview();
    else if (view === "students") renderStudents();
    else if (view === "content") renderContent();
  }

  /* ---------------- סקירה ---------------- */
  async function renderOverview() {
    const { data } = await api("/api/admin/overview");
    const o = data.overview || {};
    main.innerHTML = `
      <div class="viewHead"><h1>סקירה כללית</h1></div>
      <div class="statRow">
        ${stat("תלמידים רשומים", o.totalUsers ?? 0, "", true)}
        ${stat("פעילים היום", o.activeToday ?? 0)}
        ${stat("סה״כ תרגילים", (o.totalAttempts ?? 0).toLocaleString("he-IL"))}
        ${stat("תשובות נכונות", (o.totalCorrect ?? 0).toLocaleString("he-IL"))}
        ${stat("דיוק ממוצע", (o.accuracy ?? 0) + "%")}
      </div>
      <div class="note">בלשונית <b>תלמידים</b> מופיעה רשימת כל המשתמשים — לחיצה על תלמיד פותחת חלון עם כל הנתונים שלו: פרטים אישיים, גרף התקדמות, גרף זמן לימוד יומי וחוות דעת הצוות. בלשונית <b>תוכן</b> ניתן לערוך את חומר השאלות לכל כיתה ונושא.</div>`;
  }
  function stat(label, value, sub, accent) {
    return `<div class="stat"><div class="stat__label">${esc(label)}</div><div class="stat__value ${accent ? "accent" : ""}">${esc(value)}</div>${sub ? `<div class="stat__sub">${esc(sub)}</div>` : ""}</div>`;
  }

  /* ---------------- רשימת תלמידים (מינימלית) ---------------- */
  const ss = { list: [], sortKey: "name", sortDir: 1, q: "", grade: "", school: "" };
  async function renderStudents() {
    const { data } = await api("/api/admin/users");
    ss.list = data.users || [];
    drawStudents();
  }
  function drawStudents() {
    const grades = [...new Set(ss.list.map((u) => u.grade).filter(Boolean))];
    const schools = [...new Set(ss.list.map((u) => u.school).filter(Boolean))].sort();
    let rows = ss.list.slice();
    if (ss.q) { const q = ss.q.toLowerCase(); rows = rows.filter((u) => [u.username, u.firstName, u.lastName, u.email, u.school].some((v) => String(v || "").toLowerCase().includes(q))); }
    if (ss.grade) rows = rows.filter((u) => u.grade === ss.grade);
    if (ss.school) rows = rows.filter((u) => u.school === ss.school);
    rows.sort((a, b) => { const av = sortVal(a, ss.sortKey), bv = sortVal(b, ss.sortKey); return av < bv ? -ss.sortDir : av > bv ? ss.sortDir : 0; });
    const ar = (k) => (ss.sortKey === k ? `<span class="arrow">${ss.sortDir < 0 ? "▼" : "▲"}</span>` : "");
    main.innerHTML = `
      <div class="viewHead"><h1>תלמידים</h1><span class="spacer"></span><span class="muted">${rows.length} מתוך ${ss.list.length}</span></div>
      <div class="toolbar">
        <div class="field"><label>חיפוש</label><input class="input search" id="fSearch" placeholder="שם · מייל · בית ספר" value="${esc(ss.q)}"/></div>
        <div class="field"><label>כיתה</label><select class="select" id="fGrade">${opts(grades, ss.grade)}</select></div>
        <div class="field"><label>בית ספר</label><select class="select" id="fSchool">${opts(schools, ss.school)}</select></div>
      </div>
      <div class="tableWrap"><table>
        <thead><tr>
          <th data-k="name">שם ${ar("name")}</th>
          <th data-k="grade">כיתה ${ar("grade")}</th>
          <th data-k="age">גיל ${ar("age")}</th>
          <th data-k="school">בית ספר ${ar("school")}</th>
          <th data-k="created">תאריך הרשמה ${ar("created")}</th>
          <th data-k="lastActive">פעילות אחרונה ${ar("lastActive")}</th>
        </tr></thead>
        <tbody>${rows.length ? rows.map(row).join("") : `<tr><td colspan="6" class="empty">לא נמצאו תלמידים.</td></tr>`}</tbody>
      </table></div>`;
    const s = $("#fSearch");
    s.addEventListener("input", (e) => { ss.q = e.target.value; drawStudents(); const n = $("#fSearch"); n.focus(); n.setSelectionRange(n.value.length, n.value.length); });
    $("#fGrade").addEventListener("change", (e) => { ss.grade = e.target.value; drawStudents(); });
    $("#fSchool").addEventListener("change", (e) => { ss.school = e.target.value; drawStudents(); });
    main.querySelectorAll("thead th[data-k]").forEach((th) => th.addEventListener("click", () => {
      const k = th.dataset.k;
      if (ss.sortKey === k) ss.sortDir *= -1; else { ss.sortKey = k; ss.sortDir = ["age"].includes(k) ? -1 : ["created", "lastActive"].includes(k) ? -1 : 1; }
      drawStudents();
    }));
    main.querySelectorAll("tbody tr.clickable").forEach((tr) => tr.addEventListener("click", () => openStudent(tr.dataset.id)));
  }
  function sortVal(u, k) {
    if (k === "name") return ([u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || "").toLowerCase();
    if (k === "school") return (u.school || "").toLowerCase();
    if (k === "grade") return u.grade || "";
    if (k === "age") return u.age || 0;
    if (k === "created") return u.createdAt || "";
    if (k === "lastActive") return u.stats?.lastActive || "";
    return "";
  }
  function opts(items, sel) { return `<option value="">הכל</option>` + items.map((i) => `<option ${i === sel ? "selected" : ""}>${esc(i)}</option>`).join(""); }
  function row(u) {
    const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username;
    return `<tr class="clickable" data-id="${esc(u.id)}">
      <td><div class="cell-name">${esc(name)}</div><div class="cell-sub">@${esc(u.username)}</div></td>
      <td>${esc(u.grade || "—")}</td><td>${esc(u.age ?? "—")}</td><td>${esc(u.school || "—")}</td>
      <td class="cell-sub">${fmtDate(u.createdAt)}</td>
      <td class="cell-sub">${u.stats?.lastActive ? daysAgo(u.stats.lastActive) : "—"}</td>
    </tr>`;
  }

  /* ---------------- חלון תלמיד (modal) ---------------- */
  function openModal() { modal.hidden = false; document.body.style.overflow = "hidden"; }
  function closeModal() { modal.hidden = true; document.body.style.overflow = ""; modalBody.innerHTML = ""; }
  modal.addEventListener("click", (e) => { if (e.target.dataset.close !== undefined) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) closeModal(); });

  let cur = null; // { user, summary, daily, time, mastery, assessments }
  let editMode = false;
  async function openStudent(id, refresh) {
    editMode = false;
    openModal();
    modalBody.innerHTML = `<div class="empty" style="padding:80px"><span class="spin"></span></div>`;
    const { data } = await api(`/api/admin/user?id=${encodeURIComponent(id)}${refresh ? "&refresh=1" : ""}`);
    if (!data.ok) { modalBody.innerHTML = `<div class="empty">${esc(data.error || "לא נמצא")}</div>`; return; }
    cur = data;
    drawStudent();
  }
  function drawStudent() {
    const { user, summary, daily, time, assessments } = cur;
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username;
    const initials = (name.trim()[0] || "?");
    modalBody.innerHTML = `
      <div class="pHead">
        <div class="pHead__avatar">${esc(initials)}</div>
        <div><div class="pHead__name">${esc(name)}</div><div class="pHead__handle">@${esc(user.username)}</div></div>
      </div>

      <div class="pSection">
        <div class="pSection__title">פרטים אישיים<span class="spacer"></span>
          ${editMode ? "" : `<button class="btn btn--ghost btn--sm" id="editBtn">עריכה</button>`}
        </div>
        ${editMode ? detailsEdit(user) : detailsRead(user)}
      </div>

      <div class="kpis">
        ${kpi(summary.totalAttempts.toLocaleString("he-IL"), "תרגילים", true)}
        ${kpi(summary.accuracy + "%", "דיוק")}
        ${kpi(summary.currentMastery + "%", "שליטה")}
        ${kpi(summary.currentMotivation, "מוטיבציה")}
        ${kpi(summary.dayStreak, "רצף ימים")}
        ${kpi(summary.masteredCount + "/" + summary.topicsCount, "נושאים נשלטים")}
      </div>

      <div class="chartCard">
        <div class="chartTitle">התקדמות לאורך זמן</div>
        <div class="chartSub">שליטה מצטברת בחומר (%) לפי יום</div>
        ${lineChart([
          { name: "שליטה", color: "#134e5e", points: daily.map((d) => ({ label: d.date, value: d.mastery })) },
          { name: "דיוק יומי", color: "#c9d2da", points: daily.map((d) => ({ label: d.date, value: d.accuracy })) },
        ], { max: 100, unit: "%", title: "התקדמות" })}
        <div class="legend"><span><i style="background:#134e5e"></i>שליטה מצטברת</span><span><i style="background:#c9d2da"></i>דיוק יומי</span></div>
      </div>

      <div class="chartCard">
        <div class="chartTitle">זמן לימוד יומי</div>
        <div class="chartSub">דקות פעילות מוערכות לכל יום</div>
        ${lineChart([{ name: "דקות", color: "#9a7b4f", points: time.map((d) => ({ label: d.date, value: d.minutes })) }], { unit: " דק׳", title: "זמן יומי" })}
      </div>

      <div class="pSection">
        <div class="pSection__title">חוות דעת הצוות<span class="spacer"></span><button class="btn btn--soft btn--sm" id="refreshAssess">רענון</button></div>
        ${report(assessments)}
      </div>

      ${summary.topics.length ? `<div class="pSection">
        <div class="pSection__title">שליטה לפי נושא</div>
        <table class="miniTable"><thead><tr><th>נושא</th><th>סטטוס</th><th>דיוק</th><th>תרגילים</th></tr></thead>
        <tbody>${summary.topics.map((t) => { const [c, l] = STATUS_PILL[t.status] || ["pill--gray", t.status];
          return `<tr><td style="font-weight:600">${esc(t.name)}${t.note ? `<div class="cell-sub">${esc(t.note)}</div>` : ""}</td><td><span class="pill ${c}">${l}</span></td><td>${t.accuracy}%</td><td>${t.correct}/${t.attempts}</td></tr>`; }).join("")}</tbody></table>
      </div>` : ""}

      <div class="pSection" style="border-bottom:0;display:flex;align-items:center">
        <span class="muted" style="font-size:12.5px">נרשם ${fmtDate(user.createdAt)}</span>
        <span style="flex:1"></span>
        <button class="btn btn--danger btn--sm" id="delUser">מחיקת תלמיד</button>
      </div>`;
    $("#editBtn")?.addEventListener("click", () => { editMode = true; drawStudent(); });
    $("#cancelEdit")?.addEventListener("click", () => { editMode = false; drawStudent(); });
    $("#saveDetails")?.addEventListener("click", saveDetails);
    $("#refreshAssess")?.addEventListener("click", () => openStudent(user.id, true));
    $("#delUser")?.addEventListener("click", () => delUser(user, name));
  }
  function kpi(v, k, accent) { return `<div><div class="kpi__v ${accent ? "accent" : ""}">${esc(v)}</div><div class="kpi__k">${esc(k)}</div></div>`; }

  const DETAILS = [
    { k: "firstName", label: "שם פרטי" }, { k: "lastName", label: "שם משפחה" },
    { k: "gender", label: "מין", type: "gender" }, { k: "grade", label: "כיתה" },
    { k: "age", label: "גיל", type: "number" }, { k: "dob", label: "תאריך לידה", type: "date" },
    { k: "school", label: "בית ספר" }, { k: "email", label: "מייל" },
    { k: "parentName", label: "שם הורה" }, { k: "parentPhone", label: "טלפון הורה" }, { k: "parentEmail", label: "מייל הורה" },
  ];
  function detailVal(u, f) {
    if (f.k === "gender") return genderHe(u.gender);
    if (f.k === "dob") return u.dob ? fmtDate(u.dob) + ` · שנתון ${String(u.dob).slice(0, 4)}` : "—";
    return u[f.k] || u[f.k] === 0 ? u[f.k] : "—";
  }
  function detailsRead(u) {
    const cells = DETAILS.map((f) => `<div class="detail"><div class="detail__k">${esc(f.label)}</div><div class="detail__v">${esc(detailVal(u, f))}</div></div>`).join("");
    const reg = `<div class="detail"><div class="detail__k">תאריך הרשמה</div><div class="detail__v">${fmtDate(u.createdAt)}</div></div>`;
    const notes = u.notes ? `<div class="detail" style="grid-column:1/-1"><div class="detail__k">הערות</div><div class="detail__v" style="font-weight:500">${esc(u.notes)}</div></div>` : "";
    return `<div class="detailGrid">${cells}${reg}${notes}</div>`;
  }
  function detailsEdit(u) {
    const cells = DETAILS.map((f) => {
      let input;
      if (f.type === "gender") input = `<select data-k="gender"><option value="male" ${u.gender !== "female" ? "selected" : ""}>בן</option><option value="female" ${u.gender === "female" ? "selected" : ""}>בת</option></select>`;
      else input = `<input data-k="${f.k}" type="${f.type || "text"}" value="${esc(u[f.k] ?? "")}"/>`;
      return `<div class="detail"><div class="detail__k">${esc(f.label)}</div>${input}</div>`;
    }).join("");
    const notes = `<div class="detail" style="grid-column:1/-1"><div class="detail__k">הערות (פרטי)</div><input data-k="notes" type="text" value="${esc(u.notes ?? "")}"/></div>`;
    return `<div class="detailGrid">${cells}${notes}</div>
      <div class="editActions"><button class="btn btn--primary btn--sm" id="saveDetails">שמירה</button><button class="btn btn--ghost btn--sm" id="cancelEdit">ביטול</button><span class="saveNote" id="saveNote"></span></div>`;
  }
  async function saveDetails() {
    const patch = {};
    modalBody.querySelectorAll("[data-k]").forEach((i) => { patch[i.dataset.k] = i.value; });
    const { ok, data } = await api("/api/admin/user/update", { method: "POST", body: { id: cur.user.id, patch } });
    if (ok && data.ok) { cur.user = data.user; editMode = false; drawStudent(); toast("הפרטים נשמרו"); refreshListRow(data.user); }
    else { const n = $("#saveNote"); if (n) { n.textContent = data.error || "שגיאה"; n.className = "saveNote err"; } }
  }
  function refreshListRow(u) { const i = ss.list.findIndex((x) => x.id === u.id); if (i >= 0) ss.list[i] = { ...ss.list[i], ...u }; }
  function report(a) {
    const t = a?.teacher?.text, p = a?.psychologist?.text, m = a?.mathematician?.text;
    return `<div class="report">
      <div class="report__lead">${esc(t || "אין עדיין חוות דעת — אין מספיק פעילות.")}</div>
      ${p ? `<div class="report__sub"><div class="report__role"><span class="dot" style="background:#6d5ba6"></span>מבט הפסיכולוג</div>${esc(p)}</div>` : ""}
      ${m ? `<div class="report__sub"><div class="report__role"><span class="dot" style="background:#a23b3b"></span>מבט המתמטיקאי</div>${esc(m)}</div>` : ""}
      ${a?.teacher?.updatedAt ? `<div class="report__time">עודכן ${fmtDate(a.teacher.updatedAt)} · מתעדכן אוטומטית רק כשמשהו משמעותי משתנה</div>` : ""}
    </div>`;
  }
  async function delUser(user, name) {
    if (!confirm(`למחוק לצמיתות את ${name} ואת כל הנתונים שלו/ה? פעולה בלתי הפיכה.`)) return;
    const { ok, data } = await api("/api/admin/user/delete", { method: "POST", body: { id: user.id } });
    if (ok && data.ok) { toast("התלמיד/ה נמחק/ה"); closeModal(); renderStudents(); }
    else toast(data.error || "מחיקה נכשלה", true);
  }

  /* ---------------- תוכן ---------------- */
  const cs = { tree: [], grade: null, topic: null, data: null };
  async function renderContent() {
    const { data } = await api("/api/admin/content");
    cs.tree = data.tree || [];
    drawContent();
  }
  function drawContent() {
    const sidebar = cs.tree.map((g) => `<div class="gradeBlock"><p class="gradeBlock__title">כיתה ${esc(g.grade)}</p>${g.topics.map((t) => `<button class="topicBtn ${cs.grade === g.gradeNum && cs.topic === t.key ? "is-active" : ""}" data-grade="${g.gradeNum}" data-topic="${esc(t.key)}"><span>${esc(t.label)}${t.gen ? ` <span class="gen">מחולל</span>` : ""}</span><span class="count">${t.bankCount}</span></button>`).join("")}</div>`).join("");
    main.innerHTML = `
      <div class="viewHead"><h1>בקרת תוכן</h1><span class="spacer"></span><span class="muted">עריכת בנק השאלות לכל כיתה ונושא</span></div>
      <div class="contentLayout"><div class="sidebar">${sidebar || '<div class="empty">אין נושאים.</div>'}</div>
      <div id="topicEditor"><div class="card"><div class="empty">בחר/י נושא מהרשימה כדי לערוך את השאלות.</div></div></div></div>`;
    main.querySelectorAll(".topicBtn").forEach((b) => b.addEventListener("click", () => openTopic(Number(b.dataset.grade), b.dataset.topic)));
    if (cs.grade && cs.topic) openTopic(cs.grade, cs.topic);
  }
  async function openTopic(gradeNum, topic) {
    cs.grade = gradeNum; cs.topic = topic;
    main.querySelectorAll(".topicBtn").forEach((b) => b.classList.toggle("is-active", Number(b.dataset.grade) === gradeNum && b.dataset.topic === topic));
    $("#topicEditor").innerHTML = `<div class="card"><div class="empty">טוען…</div></div>`;
    const { data } = await api(`/api/admin/content/topic?grade=${gradeNum}&topic=${encodeURIComponent(topic)}`);
    cs.data = data;
    drawEditor();
  }
  function drawEditor() {
    const d = cs.data, qs = d.questions || [];
    $("#topicEditor").innerHTML = `<div class="card">
      <div class="viewHead" style="margin-bottom:14px"><h1 style="font-size:18px">${esc(d.topic)} · כיתה ${esc(d.grade)}</h1><span class="spacer"></span>
        <button class="btn btn--ghost btn--sm" id="addQ">+ שאלה</button><button class="btn btn--primary btn--sm" id="saveQ">שמירה</button></div>
      <div>${qs.map((q, i) => qRow(q, i)).join("") || '<div class="empty">אין עדיין שאלות.</div>'}</div></div>`;
    $("#addQ").addEventListener("click", () => { cs.data.questions = cs.data.questions || []; cs.data.questions.push({ text: "", answer: "", level: 1, hints: [], explanation: "", source: "manual" }); drawEditor(); });
    $("#saveQ").addEventListener("click", saveTopic);
    $("#topicEditor").querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => { cs.data.questions.splice(Number(b.dataset.del), 1); drawEditor(); }));
  }
  function qRow(q, i) {
    const special = q.diagramData || q.interactive || q.shapeTarget;
    const hints = Array.isArray(q.hints) ? q.hints.join("\n") : "";
    return `<div class="qRow" data-i="${i}">
      <div class="qRow__top">
        <div class="field"><label>שאלה</label><input class="ta q-text" value="${esc(q.text)}"/></div>
        <div class="field"><label>תשובה</label><input class="ta q-answer" value="${esc(q.answer)}"/></div>
        <div class="field"><label>רמה</label><input class="ta q-level" type="number" min="1" max="10" value="${esc(q.level || q.difficulty || 1)}"/></div>
        <button class="btn btn--danger btn--sm" data-del="${i}">מחק</button>
      </div>
      <div class="field"><label>רמזים (שורה לכל רמז)</label><textarea class="ta q-hints" rows="2">${esc(hints)}</textarea></div>
      <div class="field"><label>הסבר</label><textarea class="ta q-expl" rows="2">${esc(q.explanation || "")}</textarea></div>
      ${special ? `<div class="special">⚠ שאלה מיוחדת (שרטוט/אינטראקטיבית) — הטקסט והתשובה ניתנים לעריכה, השרטוט נשמר.</div>` : ""}
    </div>`;
  }
  function collect() {
    const out = (cs.data.questions || []).map((q) => ({ ...q }));
    main.querySelectorAll(".qRow").forEach((r) => {
      const i = Number(r.dataset.i); if (!out[i]) return;
      out[i].text = $(".q-text", r).value;
      out[i].answer = $(".q-answer", r).value;
      const l = parseInt($(".q-level", r).value, 10); out[i].level = Number.isFinite(l) ? l : 1; out[i].difficulty = out[i].level;
      out[i].hints = $(".q-hints", r).value.split("\n").map((s) => s.trim()).filter(Boolean);
      out[i].explanation = $(".q-expl", r).value;
    });
    return out;
  }
  async function saveTopic() {
    const questions = collect();
    const { ok, data } = await api("/api/admin/content/save", { method: "POST", body: { gradeNum: cs.grade, topic: cs.topic, questions } });
    if (ok && data.ok) {
      toast(`נשמרו ${data.count} שאלות`); cs.data.questions = questions;
      const t = cs.tree.flatMap((g) => g.topics).find((x) => x.key === cs.topic); if (t) t.bankCount = data.count;
      main.querySelectorAll(".topicBtn").forEach((b) => { if (Number(b.dataset.grade) === cs.grade && b.dataset.topic === cs.topic) { const c = b.querySelector(".count"); if (c) c.textContent = data.count; } });
    } else toast(data.error || "שמירה נכשלה", true);
  }

  checkAuth();
})();
