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
      cache: "no-store", // תמיד נתונים טריים מהשרת — בלי קאש
      signal: opts.signal,
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

  /* ---------------- שלדי-טעינה (skeleton) ---------------- */
  function skelMain() {
    const rows = Array.from({ length: 6 }, () => `<div class="skel skelRow"></div>`).join("");
    return `<div class="viewHead"><div class="skel" style="height:30px;width:210px;border-radius:8px"></div></div>
      <div class="skel skelStat" style="border-radius:13px;margin-bottom:18px"></div>
      <div class="tableWrap" style="padding:8px">${rows}</div>`;
  }
  function skelModal() {
    return `<div style="padding:28px 32px">
      <div style="display:flex;gap:18px;align-items:center;margin-bottom:26px">
        <div class="skel" style="width:60px;height:60px;border-radius:13px"></div>
        <div style="flex:1">
          <div class="skel" style="height:22px;width:190px;margin-bottom:9px;border-radius:6px"></div>
          <div class="skel" style="height:13px;width:120px;border-radius:6px"></div>
        </div>
      </div>
      <div class="skel" style="height:76px;border-radius:9px;margin-bottom:22px"></div>
      <div class="skel" style="height:200px;border-radius:9px"></div>
    </div>`;
  }

  /* ---------------- תרשים קווי ---------------- */
  function niceMax(v) {
    if (v <= 5) return 5;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / p;
    const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
    return m * p;
  }
  function lineChart(series, opts = {}) {
    // RTL: ציר-הערכים מימין (שם מתחילים), הזמן זורם מימין (ישן) לשמאל (חדש)
    const W = 680, H = 200, padL = 16, padR = 70, padT = 12, padB = 26;
    const allPts = series.flatMap((s) => s.points);
    if (!allPts.length) return `<div class="empty">אין עדיין נתונים להצגה.</div>`;
    const max = opts.max || niceMax(Math.max(...allPts.map((p) => p.value), 1));
    const xLeft = padL, xRight = W - padR, axisX = xRight + 24; // תוויות הערך מימין, בתעלה נקייה
    const xAt = (i, len) => (len <= 1 ? (xLeft + xRight) / 2 : xRight - (i / (len - 1)) * (xRight - xLeft));
    const yAt = (v) => padT + (1 - Math.min(v, max) / max) * (H - padT - padB);
    const grid = [0, 0.25, 0.5, 0.75, 1].map((f) => {
      const g = Math.round(f * max), y = yAt(g);
      return `<line x1="${xLeft}" y1="${y.toFixed(1)}" x2="${xRight}" y2="${y.toFixed(1)}" stroke="#eef2f5"/>` +
        `<text x="${axisX}" y="${(y + 3.5).toFixed(1)}" text-anchor="start" font-size="10" fill="#868d99">${g}${opts.unit || ""}</text>`;
    }).join("");
    const lp = series[0].points;
    const step = Math.max(1, Math.ceil(lp.length / 7));
    const xlabels = lp.map((p, i) => (i % step === 0 || i === lp.length - 1)
      ? `<text x="${xAt(i, lp.length).toFixed(1)}" y="${H - 8}" text-anchor="middle" font-size="9.5" fill="#868d99">${esc(fmtDay(p.label))}</text>` : "").join("");
    const body = series.map((s, si) => {
      const pts = s.points.map((p, i) => [xAt(i, s.points.length), yAt(p.value), p]);
      const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
      let area = "";
      if (si === 0 && opts.fill !== false && pts.length > 1) {
        area = `<path d="M${pts[0][0].toFixed(1)},${yAt(0).toFixed(1)} ${pts.map((p) => `L${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ")} L${pts[pts.length - 1][0].toFixed(1)},${yAt(0).toFixed(1)} Z" fill="${s.color}" opacity="0.08"/>`;
      }
      const line = `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`;
      const dots = (opts.tips || s.points.length <= 40) ? pts.map((p) => {
        const hit = opts.tips && p[2] && p[2].detail ? `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="12" fill="transparent" data-d="${esc(p[2].detail)}"/>` : "";
        return `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.6" fill="#fff" stroke="${s.color}" stroke-width="1.6"/>${hit}`;
      }).join("") : "";
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
  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errEl = $("#loginErr"); errEl.hidden = true;
    const { ok, data } = await api("/api/admin/login", { method: "POST", body: { password: $("#adminPw").value } });
    if (ok && data.ok) {
      $("#adminPw").value = "";
      showApp(); navigate("overview"); // נכנסים לאזור הניהול באותו דף — בלי חלון קופץ
    } else { errEl.textContent = data.error || "כניסה נכשלה."; errEl.hidden = false; }
  });
  $("#logoutBtn").addEventListener("click", async () => { await api("/api/admin/logout", { method: "POST" }); showLogin(); });

  /* ---------------- ניווט ---------------- */
  const nav = $("#nav");
  let navUserClick = false;
  nav.addEventListener("click", (e) => { const b = e.target.closest(".navBtn"); if (!b) return; navUserClick = true; navigate(b.dataset.view); setTimeout(() => { navUserClick = false; }, 380); });
  function setNav(v) {
    nav.querySelectorAll(".navBtn").forEach((b) => b.classList.toggle("is-active", b.dataset.view === v));
    positionNavSel();
  }
  // האינדיקטור מחליק (אנימציה) רק כשהמשתמש לוחץ; בכל מקרה אחר נצמד מיידית למקומו —
  // כך הוא תמיד יושב נכון גם אחרי רענון/טעינת-פונט (תיקון באג המיקום).
  function positionNavSel() {
    const active = nav.querySelector(".navBtn.is-active");
    const sel = nav.querySelector(".navSel");
    if (!active || !sel || !active.offsetWidth) return;
    if (!navUserClick) sel.style.transition = "none";
    sel.style.left = active.offsetLeft + "px";
    sel.style.width = active.offsetWidth + "px";
    sel.style.opacity = "1";
    if (!navUserClick) { void sel.offsetWidth; sel.style.transition = ""; }
  }
  window.addEventListener("resize", positionNavSel);
  window.addEventListener("load", positionNavSel);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(positionNavSel);
  // ResizeObserver — ממקם מחדש בכל שינוי פריסה (כולל reflow אחרי טעינת הפונט)
  if (window.ResizeObserver) { try { new ResizeObserver(() => positionNavSel()).observe(nav); } catch (e) { /* noop */ } }
  let currentView = "overview";
  function navigate(view) {
    currentView = view;
    document.body.classList.remove("contentPicker");
    setNav(view);
    main.innerHTML = skelMain();
    if (view === "overview") renderOverview();
    else if (view === "students") renderStudents();
    else if (view === "content") renderContent();
  }
  // רענון-חי: תמיד נתונים עדכניים — בכל חזרה לחלון/לשונית, וכל 20 שניות (סקירה)
  function liveRefresh(fromInterval) {
    if (!modal.hidden || appView.hidden) return; // מודאל פתוח / לא מחוברים — לא מפריעים
    const ae = document.activeElement;
    if (ae && /^(INPUT|SELECT|TEXTAREA)$/.test(ae.tagName)) return; // לא קוטעים הקלדה/עריכה
    if (currentView === "overview") renderOverview();
    else if (currentView === "students" && !fromInterval) renderStudents();
  }
  window.addEventListener("focus", () => liveRefresh(false));
  document.addEventListener("visibilitychange", () => { if (!document.hidden) liveRefresh(false); });
  setInterval(() => liveRefresh(true), 20000);

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
        ${stat("דיוק ממוצע", (o.accuracy ?? 0) + "%")}
        ${stat("עלות כוללת (AI)", usdFmt(o.usage?.costUSD), tokFmt(o.usage?.tokens) + " טוקנים")}
      </div>
      <div class="note">בלשונית <b>תלמידים</b> מופיעה רשימת כל המשתמשים — לחיצה על תלמיד פותחת חלון עם כל הנתונים שלו: פרטים אישיים, גרף התקדמות, גרף זמן לימוד יומי וחוות דעת הצוות. בלשונית <b>תוכן</b> ניתן לערוך את חומר השאלות לכל כיתה ונושא.</div>`;
  }
  function stat(label, value, sub, accent) {
    return `<div class="stat"><div class="stat__label">${esc(label)}</div><div class="stat__value ${accent ? "accent" : ""}">${esc(value)}</div>${sub ? `<div class="stat__sub">${esc(sub)}</div>` : ""}</div>`;
  }
  // עלות $ עד דיוק סנט (0.01); טוקנים בקיצור K/M
  function usdFmt(n) { return "$" + (Number(n) || 0).toFixed(2); }
  function tokFmt(n) {
    n = Number(n) || 0;
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + "K";
    return String(n);
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
    modalBody.innerHTML = skelModal();
    const { data } = await api(`/api/admin/user?id=${encodeURIComponent(id)}${refresh ? "&refresh=1" : ""}`);
    if (!data.ok) { modalBody.innerHTML = `<div class="empty">${esc(data.error || "לא נמצא")}</div>`; return; }
    cur = data;
    drawStudent();
  }
  function drawStudent() {
    const { user, summary, daily, time, assessments, usage } = cur;
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username;
    const initials = (name.trim()[0] || "?");
    modalBody.innerHTML = `
      <div class="pHead">
        <div class="pHead__avatar">${esc(initials)}</div>
        <div><div class="pHead__name">${esc(name)}</div><div class="pHead__handle">@${esc(user.username)}</div></div>
      </div>

      <div class="pSection">
        <div class="pSection__title">פרטים אישיים<span class="spacer"></span>
          ${editMode || user.demo ? "" : `<button class="btn btn--ghost btn--sm" id="editBtn">עריכה</button>`}
        </div>
        ${editMode ? detailsEdit(user) : detailsRead(user)}
        ${pwBlock(user)}
      </div>

      <div class="kpis">
        ${kpi(summary.totalAttempts.toLocaleString("he-IL"), "תרגילים", true)}
        ${kpi(summary.accuracy + "%", "דיוק")}
        ${kpi(summary.currentMastery + "%", "שליטה")}
        ${kpi(summary.currentMotivation, "מוטיבציה")}
        ${kpi(summary.dayStreak, "רצף ימים")}
        ${kpi(summary.masteredCount + "/" + summary.topicsCount, "נושאים נשלטים")}
      </div>

      ${costSection(usage)}

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
        <div class="chartTitle">זמן פעילות</div>
        <div class="chartSub">דקות פעילות לפי טווח · ריחוף על נקודה מציג פירוט</div>
        <div class="rangeSel" id="rangeSel">
          <button class="rangeBtn" data-r="day">יום</button>
          <button class="rangeBtn is-on" data-r="week">שבוע</button>
          <button class="rangeBtn" data-r="month">חודש</button>
          <button class="rangeBtn" data-r="quarter">3 חודשים</button>
        </div>
        <div class="chartWrap" id="actWrap"><div class="empty" style="padding:44px"><span class="spin"></span></div><div class="chartTip" id="actTip" hidden></div></div>
      </div>

      <div class="pSection">
        <div class="pSection__title">חוות דעת הצוות</div>
        ${assessScaffold()}
      </div>

      ${summary.topics.length ? `<div class="pSection">
        <div class="pSection__title">שליטה לפי נושא<span class="spacer"></span><span class="muted" style="font-weight:600;font-size:11px">לחיצה על נושא — פירוט וחוות דעת</span></div>
        <table class="miniTable"><thead><tr><th>נושא</th><th>סטטוס</th><th>דיוק</th><th>תרגילים</th></tr></thead>
        <tbody>${summary.topics.map((t, i) => { const [c, l] = STATUS_PILL[t.status] || ["pill--gray", t.status];
          return `<tr class="topicRow" data-ti="${i}"><td style="font-weight:600">${esc(t.name)}${t.note ? `<div class="cell-sub">${esc(t.note)}</div>` : ""}</td><td><span class="pill ${c}">${l}</span></td><td>${t.accuracy}%</td><td>${t.correct}/${t.attempts}</td></tr><tr class="topicDetail" data-ti="${i}" hidden><td colspan="4">${topicDetail(t, c, l)}</td></tr>`; }).join("")}</tbody></table>
      </div>` : ""}

      <div class="pSection" style="border-bottom:0;display:flex;align-items:center">
        <span class="muted" style="font-size:12.5px">נרשם ${fmtDate(user.createdAt)}${user.demo ? " · חשבון הדגמה (קריאה בלבד)" : ""}</span>
        <span style="flex:1"></span>
        ${user.demo ? "" : `<button class="btn btn--danger btn--sm" id="delUser">מחיקת תלמיד</button>`}
      </div>`;
    $("#editBtn")?.addEventListener("click", () => { editMode = true; drawStudent(); });
    $("#cancelEdit")?.addEventListener("click", () => { editMode = false; drawStudent(); });
    $("#saveDetails")?.addEventListener("click", saveDetails);
    $("#delUser")?.addEventListener("click", () => delUser(user, name));
    $("#pwToggle")?.addEventListener("click", () => { const f = $("#pwForm"); if (f) { f.hidden = !f.hidden; if (!f.hidden) $("#pwAdmin")?.focus(); } });
    $("#pwCancel")?.addEventListener("click", () => { const f = $("#pwForm"); if (f) f.hidden = true; });
    $("#pwSave")?.addEventListener("click", () => savePassword(user.id));
    $("#rangeSel")?.addEventListener("click", (e) => {
      const b = e.target.closest(".rangeBtn"); if (!b) return;
      $("#rangeSel").querySelectorAll(".rangeBtn").forEach((x) => x.classList.toggle("is-on", x === b));
      loadActivity(user.id, b.dataset.r);
    });
    loadAssessments(user.id);
    loadActivity(user.id, "week");
    modalBody.querySelectorAll(".topicRow").forEach((tr) => tr.addEventListener("click", () => {
      const det = modalBody.querySelector(`.topicDetail[data-ti="${tr.dataset.ti}"]`);
      if (det) { det.hidden = !det.hidden; tr.classList.toggle("open", !det.hidden); }
    }));
  }
  function pwBlock(user) {
    if (user.demo) {
      return `<div class="pwBlock"><div class="detail__k">סיסמת התלמיד</div>
        <div class="pwRow"><span class="pwDots">••••••••</span><span class="muted" style="font-size:12.5px">חשבון הדגמה</span></div></div>`;
    }
    return `<div class="pwBlock">
      <div class="detail__k">סיסמת התלמיד</div>
      <div class="pwRow">
        <span class="pwDots" title="מוצפנת — לא ניתנת להצגה">••••••••••</span>
        <button class="btn btn--ghost btn--sm" id="pwToggle">שינוי סיסמה</button>
      </div>
      <div class="pwForm" id="pwForm" hidden>
        <p class="pwHint">הסיסמה מאוחסנת מוצפנת ולא ניתנת להצגה. כדי לקבוע לתלמיד סיסמה חדשה — אמת/י קודם את סיסמת האדמין שלך:</p>
        <div class="pwFields">
          <input type="password" id="pwAdmin" placeholder="סיסמת האדמין שלך" autocomplete="off"/>
          <input type="text" id="pwNew" placeholder="סיסמה חדשה לתלמיד" autocomplete="off"/>
          <button class="btn btn--primary btn--sm" id="pwSave">שמירה</button>
          <button class="btn btn--ghost btn--sm" id="pwCancel">ביטול</button>
        </div>
        <span class="saveNote" id="pwNote"></span>
      </div>
    </div>`;
  }
  async function savePassword(id) {
    const note = $("#pwNote");
    const adminPassword = ($("#pwAdmin") || {}).value || "";
    const password = ($("#pwNew") || {}).value || "";
    if (note) { note.textContent = ""; note.className = "saveNote"; }
    if (!adminPassword || !password) { if (note) { note.textContent = "יש למלא את שני השדות."; note.className = "saveNote err"; } return; }
    const { ok, data } = await api("/api/admin/user/set-password", { method: "POST", body: { id, adminPassword, password } });
    if (ok && data.ok) {
      toast("הסיסמה עודכנה ✓");
      const f = $("#pwForm"); if (f) f.hidden = true;
      const a = $("#pwAdmin"); if (a) a.value = "";
      const n = $("#pwNew"); if (n) n.value = "";
    } else if (note) { note.textContent = (data && data.error) || "שגיאה"; note.className = "saveNote err"; }
  }
  /* ---- גרף פעילות לפי טווח, עם טולטיפ-פירוט בריחוף ---- */
  async function loadActivity(id, range) {
    const wrap = $("#actWrap"); if (!wrap) return;
    wrap.innerHTML = `<div class="empty" style="padding:44px"><span class="spin"></span></div>`;
    let act = null;
    try { const { data } = await api(`/api/admin/user/activity?id=${encodeURIComponent(id)}&range=${encodeURIComponent(range)}`); act = data && data.activity; } catch {}
    if (!cur || cur.user.id !== id || modal.hidden) return;
    if (!act || !act.points || !act.points.length) { wrap.innerHTML = `<div class="empty">אין נתוני פעילות לטווח זה.</div>`; return; }
    wrap.innerHTML = lineChart([{ name: "פעילות", color: "#8d6f44", points: act.points }], { unit: act.unit || " דק׳", title: "פעילות", tips: true }) + `<div class="chartTip" hidden></div>`;
    wireTips(wrap);
  }
  function wireTips(wrap) {
    const tip = wrap.querySelector(".chartTip");
    const svg = wrap.querySelector("svg");
    if (!tip || !svg) return;
    svg.addEventListener("mousemove", (e) => {
      const det = e.target && e.target.getAttribute && e.target.getAttribute("data-d");
      if (det) {
        const r = wrap.getBoundingClientRect();
        tip.textContent = det; tip.hidden = false;
        let x = e.clientX - r.left + 14, y = e.clientY - r.top + 12;
        if (x + tip.offsetWidth + 8 > r.width) x = e.clientX - r.left - tip.offsetWidth - 14;
        tip.style.left = Math.max(2, x) + "px"; tip.style.top = y + "px";
      } else { tip.hidden = true; }
    });
    svg.addEventListener("mouseleave", () => { tip.hidden = true; });
  }
  function kpi(v, k, accent) { return `<div><div class="kpi__v ${accent ? "accent" : ""}">${esc(v)}</div><div class="kpi__k">${esc(k)}</div></div>`; }

  // עלות ה-AI של התלמיד: כמה טוקנים וכמה $ — עד דיוק סנט, עם פירוט לפי-סוכן
  function costSection(u) {
    const t = u && u.tokens;
    if (!t || !t.total) {
      return `<div class="costCard"><div class="costCard__head"><span class="costCard__label">עלות ה-AI של התלמיד</span></div>
        <div class="costCard__empty">עדיין לא נצברה עלות — המעקב נספר מהרגע שהופעל.</div></div>`;
    }
    const agents = (u.byAgent || []).filter((a) => a.tokens > 0)
      .map((a) => `<div class="costAgent"><span>${esc(a.name)}</span><span class="costAgent__v">${usdFmt(a.costUSD)} · ${tokFmt(a.tokens)} טוקנים</span></div>`).join("");
    return `<div class="costCard">
      <div class="costCard__head"><span class="costCard__label">עלות ה-AI של התלמיד</span><span class="costCard__total">${usdFmt(u.costUSD)}</span></div>
      <div class="costCard__sub">${tokFmt(t.total)} טוקנים · ${(u.calls || 0).toLocaleString("he-IL")} קריאות</div>
      <div class="costChips">
        <span class="costChip">קלט ${tokFmt(t.input)}</span>
        <span class="costChip">פלט ${tokFmt(t.output)}</span>
        <span class="costChip">מטמון ${tokFmt(t.cacheRead)}</span>
      </div>
      ${agents ? `<div class="costAgents">${agents}</div>` : ""}
    </div>`;
  }
  /* פירוט-נושא בלחיצה: נתונים + חוות דעת קצרה של מורה/פסיכולוג/מתמטיקאי (נגזר מהסטטוס והדיוק) */
  function topicOpinions(t) {
    const acc = t.accuracy, st = t.status;
    if (st === "mastered") return {
      teacher: `שליטה יפה — ${acc}% דיוק. אפשר להעלות רמת קושי.`,
      psychologist: "ביטחון גבוה בנושא; חוזרת אליו בהנאה.",
      mathematician: "הבסיס מוצק; מוכנה לנושאים שנשענים עליו.",
    };
    if (st === "struggling") return {
      teacher: `מתקשה כאן (${acc}%) — כדאי תרגול קצר וממוקד.`,
      psychologist: "ייתכן תסכול קל; חשוב משוב מעודד ולא שיפוטי.",
      mathematician: "פער במיומנות הבסיס — לחזק לפני שממשיכים.",
    };
    if (st === "in_progress") return {
      teacher: `בתהליך טוב (${acc}%) — עוד תרגול והנושא יישלט.`,
      psychologist: "מגלה התמדה; הקצב מתאים לה.",
      mathematician: "ההבנה נבנית; כדאי לגוון סוגי תרגילים.",
    };
    return {
      teacher: "טרם התחילה — אפשר לפתוח בהיכרות עדינה.",
      psychologist: "אין עדיין רגש שלילי; התחלה נקייה.",
      mathematician: "נושא חדש; להתחיל מהבסיס בהדרגה.",
    };
  }
  function topicDetail(t, c, l) {
    const o = topicOpinions(t);
    return `<div class="topicCard">
      <div class="topicCard__stats">
        <span>סטטוס: <span class="pill ${c}">${l}</span></span>
        <span>דיוק: <b>${t.accuracy}%</b></span>
        <span>תרגילים: <b>${t.correct}/${t.attempts}</b></span>
      </div>
      <div class="topicOp"><span class="topicOp__role" style="color:#ff8c1a">מורה</span>${esc(o.teacher)}</div>
      <div class="topicOp"><span class="topicOp__role" style="color:#00e000">פסיכולוג</span>${esc(o.psychologist)}</div>
      <div class="topicOp"><span class="topicOp__role" style="color:#00d5ff">מתמטיקאי</span>${esc(o.mathematician)}</div>
    </div>`;
  }

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
  /* ---- חוות דעת הצוות: שלד עם נקודות-טעינה, טעינה אסינכרונית, וחשיפת טקסט שורה-אחר-שורה ---- */
  const ASSESS_ROLES = [
    { key: "teacher", label: "מבט המורה", color: "#ff8c1a" },
    { key: "psychologist", label: "מבט הפסיכולוג", color: "#00e000" },
    { key: "mathematician", label: "מבט המתמטיקאי", color: "#00d5ff" },
  ];
  function assessScaffold() {
    const items = ASSESS_ROLES.map((r) => `
      <div class="reportItem" data-role="${r.key}">
        <div class="report__role" style="color:${r.color}">${esc(r.label)}<span class="typing" aria-label="כותב/ת…"><span></span><span></span><span></span></span></div>
        <div class="report__txt" aria-live="polite"></div>
      </div>`).join("");
    return `<div class="report" id="reportBox">${items}</div>`;
  }
  function splitLines(text) {
    const s = String(text || "").trim();
    if (!s) return [];
    const byNl = s.split(/\n+/).map((x) => x.trim()).filter(Boolean);
    if (byNl.length > 1) return byNl;
    return s.split(/(?<=[.!?…])\s+/).map((x) => x.trim()).filter(Boolean);
  }
  function fillAssessments(a) {
    const box = $("#reportBox"); if (!box) return;
    ASSESS_ROLES.forEach((r) => {
      const item = box.querySelector(`.reportItem[data-role="${r.key}"]`); if (!item) return;
      item.querySelector(".typing")?.remove();
      const fallback = r.key === "teacher" ? "אין עדיין חוות דעת — אין מספיק פעילות." : "";
      const lines = splitLines(a && a[r.key] && a[r.key].text ? a[r.key].text : fallback);
      if (!lines.length) { item.style.display = "none"; return; }
      item.querySelector(".report__txt").innerHTML =
        lines.map((ln, i) => `<span class="revLine" style="--i:${i}">${esc(ln)}</span>`).join("");
    });
    const ts = a && a.teacher && a.teacher.updatedAt;
    if (ts && !box.querySelector(".report__time")) {
      const t = document.createElement("div");
      t.className = "report__time";
      t.textContent = `עודכן ${fmtDate(ts)} · מתעדכן אוטומטית כשמשהו משמעותי משתנה`;
      box.appendChild(t);
    }
  }
  async function loadAssessments(id) {
    if (!$("#reportBox")) return;
    if (cur && cur.assessmentsData) { fillAssessments(cur.assessmentsData); return; } // כבר נטען — מהמטמון
    let assessments = null;
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 45000);
      const { data } = await api(`/api/admin/user/assessments?id=${encodeURIComponent(id)}`, { signal: ctrl.signal });
      clearTimeout(to);
      assessments = data && data.assessments;
    } catch { assessments = null; }
    if (!cur || cur.user.id !== id || modal.hidden) return; // המשתמש/המודאל השתנה בינתיים
    cur.assessmentsData = assessments || {};
    fillAssessments(cur.assessmentsData);
  }
  async function delUser(user, name) {
    if (!confirm(`למחוק לצמיתות את ${name} ואת כל הנתונים שלו/ה? פעולה בלתי הפיכה.`)) return;
    const { ok, data } = await api("/api/admin/user/delete", { method: "POST", body: { id: user.id } });
    if (ok && data.ok) { toast("התלמיד/ה נמחק/ה"); closeModal(); renderStudents(); }
    else toast(data.error || "מחיקה נכשלה", true);
  }

  /* ---------------- תוכן ---------------- */
  const GRADE_COLORS = {
    1: "#00e000", 2: "#00d5ff", 3: "#ff45c8", 4: "#ff9a16", 5: "#9d5cff", 6: "#ff5a5a",
    7: "#00c2a8", 8: "#ffd21a", 9: "#5c8cff", 10: "#ff7a3d", 11: "#b04dff", 12: "#2ee66e",
  };
  const cs = { tree: [], gradeNum: null, gradeLabel: "", topic: null, data: null, allQ: null, q: "" };

  async function renderContent() {
    const { data } = await api("/api/admin/content");
    cs.tree = data.tree || [];
    cs.gradeNum = null; cs.topic = null; cs.data = null; cs.q = ""; cs.allQ = null;
    drawContent();
  }
  function drawContent() {
    if (cs.gradeNum == null) drawGradePicker();
    else drawGradeScreen();
  }

  /* בורר כיתות — עיגולים בלבד, עם הילה עדינה שעוקבת אחרי הסמן ב-hover */
  function drawGradePicker() {
    document.body.classList.add("contentPicker");
    const circles = cs.tree.map((g) => {
      const color = GRADE_COLORS[g.gradeNum] || "#00d5ff";
      const letter = String(g.grade || g.gradeNum).trim()[0] || g.gradeNum;
      return `<button class="gradeCircle" data-grade="${g.gradeNum}" style="--gc:${color}" aria-label="כיתה ${esc(g.grade)}"><span class="gradeCircle__ltr">${esc(letter)}</span></button>`;
    }).join("");
    main.innerHTML = `
      <div class="viewHead"><h1>בקרת תוכן</h1><span class="spacer"></span><span class="muted">בחר/י כיתה</span></div>
      <div class="gradePicker">${circles || '<div class="empty">אין כיתות.</div>'}</div>`;
    const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    main.querySelectorAll(".gradeCircle").forEach((b) => {
      b.addEventListener("click", () => {
        const gn = Number(b.dataset.grade);
        if (reduceMotion) { openGrade(gn); return; }
        // פופ-קפיץ חלק, ואז כניסה לכיתה בדיוק כשהאנימציה מסתיימת (לא חותכים אותה)
        b.classList.remove("is-pop"); void b.offsetWidth; b.classList.add("is-pop");
        let done = false;
        const go = () => { if (done) return; done = true; openGrade(gn); };
        b.addEventListener("animationend", go, { once: true });
        setTimeout(go, 450); // גיבוי אם animationend לא נורה
      });
    });
  }

  async function openGrade(gradeNum) {
    cs.gradeNum = gradeNum;
    const g = cs.tree.find((x) => x.gradeNum === gradeNum);
    cs.gradeLabel = g ? g.grade : ""; cs.topic = null; cs.data = null; cs.q = ""; cs.allQ = null;
    drawGradeScreen();
    // טוענים את כל שאלות הכיתה (כל הנושאים) כדי לאפשר חיפוש מיידי
    const topics = g ? g.topics : [];
    const results = await Promise.all(topics.map((t) =>
      api(`/api/admin/content/topic?grade=${gradeNum}&topic=${encodeURIComponent(t.key)}`)
        .then((r) => ({ t, qs: (r.data && r.data.questions) || [] }))
        .catch(() => ({ t, qs: [] }))
    ));
    if (cs.gradeNum !== gradeNum) return; // המשתמש עבר כיתה בינתיים
    const all = [];
    for (const { t, qs } of results) for (const q of qs) all.push({ q, topicKey: t.key, topicLabel: t.label });
    cs.allQ = all;
    const s = $("#qSearch");
    if (s) { s.disabled = false; s.placeholder = "הקלד/י טקסט של שאלה, או מספר רמה (1–10)…"; }
  }

  function drawGradeScreen() {
    document.body.classList.remove("contentPicker");
    const g = cs.tree.find((x) => x.gradeNum === cs.gradeNum);
    const tn = g ? g.topics.length : 0;
    const qn = g ? g.topics.reduce((a, t) => a + (t.bankCount || 0), 0) : 0;
    const color = GRADE_COLORS[cs.gradeNum] || "#00d5ff";
    const area = cs.area || "practice";
    main.innerHTML = `
      <div class="viewHead" style="align-items:center">
        <button class="btn btn--ghost btn--sm" id="backGrades">→ כל הכיתות</button>
        <h1 style="display:flex;align-items:center;gap:11px"><span class="gradeDot" style="background:${color}"></span>כיתה ${esc(cs.gradeLabel)}</h1>
        <span class="spacer"></span>
        <span class="muted">${tn} נושאים · ${qn.toLocaleString("he-IL")} שאלות</span>
      </div>
      ${area === "learning" && cs.learnTopic ? "" : `<div class="areaTabs" role="tablist">
        <button class="areaTab ${area === "practice" ? "is-active" : ""}" data-area="practice" role="tab">🎯 אזור תרגול</button>
        <button class="areaTab ${area === "learning" ? "is-active" : ""}" data-area="learning" role="tab">📖 אזור למידה</button>
        <button class="areaTab ${area === "curriculum" ? "is-active" : ""}" data-area="curriculum" role="tab">📚 נושאי תלמיד</button>
      </div>`}
      ${area === "practice" ? `<div class="toolbar"><div class="field" style="flex:1;min-width:240px"><label>חיפוש שאלה או רמה</label>
        <input class="input search" id="qSearch" value="${esc(cs.q)}" placeholder="${cs.allQ ? "הקלד/י טקסט של שאלה, או מספר רמה (1–10)…" : "טוען חיפוש…"}" ${cs.allQ ? "" : "disabled"}/></div></div>` : ""}
      <div id="gradeBody"></div>`;
    $("#backGrades").addEventListener("click", () => { cs.gradeNum = null; cs.topic = null; cs.data = null; cs.q = ""; cs.allQ = null; cs.learn = null; cs.learnTopic = null; drawContent(); });
    main.querySelectorAll(".areaTab").forEach((b) => b.addEventListener("click", () => { cs.area = b.dataset.area; cs.topic = null; cs.learnTopic = null; drawGradeScreen(); }));
    const qs = $("#qSearch");
    if (qs) qs.addEventListener("input", (e) => { cs.q = e.target.value; drawGradeBody(); });
    drawGradeBody();
  }

  function drawGradeBody() {
    const body = $("#gradeBody"); if (!body) return;
    if ((cs.area || "practice") === "learning") { drawLearningBody(body); return; }
    if ((cs.area || "practice") === "curriculum") {
      if (window.VelaCurriculumUI) window.VelaCurriculumUI.render(body, cs.gradeNum, cs.gradeLabel);
      else body.innerHTML = `<div class="curEmpty"><div class="curEmpty__ico">📚</div><div class="curEmpty__t">הדפדפן לא נטען — רענן/י את הדף</div></div>`;
      return;
    }
    if (cs.q.trim()) {
      body.innerHTML = searchResultsHtml();
      body.querySelectorAll(".searchRow").forEach((b) => b.addEventListener("click", () => { cs.q = ""; cs.topic = b.dataset.topic; drawGradeScreen(); }));
      return;
    }
    const g = cs.tree.find((x) => x.gradeNum === cs.gradeNum);
    const sidebar = (g ? g.topics : []).map((t) => `<button class="topicBtn ${cs.topic === t.key ? "is-active" : ""}" data-topic="${esc(t.key)}"><span>${esc(t.label)}${t.gen ? ` <span class="gen">מחולל</span>` : ""}</span><span class="count">${t.bankCount}</span></button>`).join("");
    body.innerHTML = `<div class="contentLayout"><div class="sidebar">${sidebar || '<div class="empty">אין נושאים.</div>'}</div>
      <div id="topicEditor"><div class="card"><div class="empty">בחר/י נושא מהרשימה כדי לערוך את השאלות.</div></div></div></div>`;
    body.querySelectorAll(".topicBtn").forEach((b) => b.addEventListener("click", () => openTopic(b.dataset.topic)));
    if (cs.topic) openTopic(cs.topic);
  }

  /* ── אזור למידה: כרטיסי-נושאים (מסך לבן נקי) → לחיצה פותחת מסך-נושא מלא עם מפת-הדרכים.
       לכל שלב: מטרה, שיעור-הזהב הקבוע, והכלים (שם בלבד; לחיצה חושפת תיאור). מקור: course.js. ── */
  async function drawLearningBody(body) {
    if (!cs.learn || cs.learn.grade !== cs.gradeNum) {
      body.innerHTML = `<div class="learnLoad"><span class="spin"></span> טוען את אזור-הלמידה…</div>`;
      try {
        const { data } = await api(`/api/admin/course?grade=${cs.gradeNum}`);
        cs.learn = { grade: cs.gradeNum, topics: data.topics || [] };
      } catch (e) {
        body.innerHTML = `<div class="learnLoad learnLoad--empty">אזור הלמידה לכיתה זו עדיין בהכנה.</div>`;
        return;
      }
      if ((cs.area || "practice") !== "learning" || !$("#gradeBody")) return; // המשתמש עבר בינתיים
    }
    if (cs.learnTopic && cs.learn.topics.find((t) => t.key === cs.learnTopic)) renderLearnRoadmap(body);
    else renderLearnTopics(body);
  }

  // מסך 1 — כרטיסי הנושאים (נקי, לבן)
  function renderLearnTopics(body) {
    const topics = cs.learn.topics;
    const cards = topics.map((t) => {
      const n = t.stages.length;
      return `<button class="topicCard ${n ? "" : "is-soon"}" data-topic="${esc(t.key)}" ${n ? "" : "disabled"}>
          <span class="topicCard__name">${esc(t.key)}</span>
          <span class="topicCard__meta">${n ? n + " שלבים במפת-הדרכים" : "בקרוב"}</span>
          <span class="topicCard__go" aria-hidden="true">←</span>
        </button>`;
    }).join("");
    body.innerHTML = `<div class="learnIntro">בחרו נושא כדי לראות את <b>מפת-הדרכים</b> שלו — רצף השלבים שמביא את הילד להבנה מלאה, הכלים בכל שלב, ושיעור-הזהב הקבוע.</div>
      <div class="topicCards">${cards || '<div class="empty">אין נושאים לכיתה זו.</div>'}</div>`;
    body.querySelectorAll(".topicCard").forEach((b) => b.addEventListener("click", () => {
      if (b.disabled) return;
      cs.learnTopic = b.dataset.topic;
      drawGradeScreen();
    }));
  }

  // מסך 2 — מפת-הדרכים של הנושא (מסך מלא)
  function renderLearnRoadmap(body) {
    const t = cs.learn.topics.find((x) => x.key === cs.learnTopic);
    if (!t) { cs.learnTopic = null; renderLearnTopics(body); return; }
    const stages = t.stages.map((s) => {
      const tools = (s.tools || []).map((tool, ti) =>
        `<button class="toolChip" data-tool="${s.n}:${ti}"><span class="toolChip__dot"></span>${esc(tool.label)}</button>`).join("");
      const toolsBlock = (s.tools && s.tools.length) ? `
        <div class="stageBlock">
          <div class="stageBlock__label">הכלים בשלב הזה <span class="stageBlock__hint">· לחצו לתיאור</span></div>
          <div class="toolChips">${tools}</div>
          <div class="toolDesc" data-for="${s.n}"></div>
        </div>` : "";
      const gold = String(s.teach || "").trim();
      return `<section class="roadStage" data-n="${s.n}">
          <div class="roadStage__rail"><span class="roadStage__num">${s.n}</span></div>
          <div class="roadStage__card">
            <div class="roadStage__head">
              <h3 class="roadStage__title">${esc(s.title)}</h3>
              <button class="gStudioBtn" data-studio="${s.n}" title="עיצוב ויזואלי של מסכי השיעור">🖊 עיצוב בסטודיו</button>
              ${s.goal ? `<div class="roadStage__goal"><span class="roadStage__goalTag">מטרה</span><span>${esc(s.goal)}</span></div>` : ""}
            </div>
            ${toolsBlock}
            ${gold ? `<div class="stageBlock">
              <div class="stageBlock__label goldLabel"><span class="goldStar">★</span> שיעור-הזהב הקבוע${s.golden ? ` <span class="goldLive">🏆 פעיל — רץ בלי AI (${s.golden.map((x) => ({ instruct: "הוראה", guided: "מודרך", independent: "עצמאי" })[x] || x).join(" · ")})</span>` : ""}</div>
              <div class="goldLesson">${esc(gold)}</div>
              ${s.golden ? `<div class="goldEditHint">עריכת המיקומים והנוסח: golden/${esc(t.key).replace(/ /g, "_")}#${s.n}.json</div>` : ""}
            </div>` : ""}
          </div>
        </section>`;
    }).join("");
    body.innerHTML = `<div class="roadmap">
      <div class="roadmap__top">
        <button class="btn btn--ghost btn--sm" id="backTopics">→ כל הנושאים</button>
        <div class="roadmap__titles">
          <h2 class="roadmap__h">${esc(t.key)}</h2>
          <span class="roadmap__sub">מפת-דרכים · ${t.stages.length} שלבים · מהמוחשי אל המופשט</span>
        </div>
      </div>
      <div class="roadStages">${stages || '<div class="empty">לנושא הזה עוד אין מפת-דרכים מובנית.</div>'}</div>
    </div>`;
    $("#backTopics").addEventListener("click", () => { cs.learnTopic = null; drawGradeScreen(); });
    // סטודיו שיעורי-הזהב: עיצוב ויזואלי מלא של מסכי השלב (admin-golden.js)
    body.querySelectorAll(".gStudioBtn").forEach((btn) => btn.addEventListener("click", () => {
      const n = Number(btn.dataset.studio);
      const stage = t.stages.find((s) => s.n === n);
      if (window.VelaGoldenEditor) window.VelaGoldenEditor.open(t.key, n, stage ? stage.title : "");
      else alert("הסטודיו לא נטען — רענן/י את הדף");
    }));
    body.querySelectorAll(".toolChip").forEach((chip) => chip.addEventListener("click", () => {
      const [nStr, tiStr] = chip.dataset.tool.split(":");
      const stage = t.stages.find((s) => String(s.n) === nStr);
      const tool = stage && stage.tools[Number(tiStr)];
      const descBox = body.querySelector(`.toolDesc[data-for="${nStr}"]`);
      if (!tool || !descBox) return;
      const already = chip.classList.contains("is-open");
      chip.closest(".stageBlock").querySelectorAll(".toolChip").forEach((c) => c.classList.remove("is-open"));
      if (already) { descBox.className = "toolDesc"; descBox.innerHTML = ""; return; }
      chip.classList.add("is-open");
      descBox.className = "toolDesc is-open";
      descBox.innerHTML = `<span class="toolDesc__name">${esc(tool.label)}</span>${esc(tool.desc)}`;
    }));
  }

  function searchResultsHtml() {
    if (cs.allQ == null) return `<div class="card"><div class="empty"><span class="spin"></span></div></div>`;
    const q = cs.q.trim().toLowerCase();
    const asNum = Number(q);
    const isNum = q !== "" && Number.isFinite(asNum);
    const res = cs.allQ.filter(({ q: item, topicLabel }) => {
      const lvl = item.level || item.difficulty || 1;
      if (isNum && lvl === asNum) return true;
      const hay = `${item.text || ""} ${item.answer || ""} ${item.explanation || ""} ${topicLabel || ""}`.toLowerCase();
      return hay.includes(q);
    });
    const rows = res.map(({ q: item, topicKey, topicLabel }) => `
      <button class="searchRow" data-topic="${esc(topicKey)}">
        <span class="searchRow__q">${esc(item.text || "(ללא טקסט)")}</span>
        <span class="searchRow__meta"><span class="pill pill--gray">${esc(topicLabel)}</span><span class="pill pill--info">רמה ${esc(item.level || item.difficulty || 1)}</span></span>
      </button>`).join("");
    return `<div class="card">
      <div class="muted" style="margin-bottom:14px">${res.length} תוצאות עבור “${esc(cs.q)}”</div>
      ${rows || '<div class="empty">לא נמצאו שאלות תואמות.</div>'}</div>`;
  }

  async function openTopic(topicKey) {
    cs.topic = topicKey;
    const body = $("#gradeBody");
    if (body) body.querySelectorAll(".topicBtn").forEach((b) => b.classList.toggle("is-active", b.dataset.topic === topicKey));
    const ed = $("#topicEditor"); if (ed) ed.innerHTML = `<div class="card"><div class="empty">טוען…</div></div>`;
    const { data } = await api(`/api/admin/content/topic?grade=${cs.gradeNum}&topic=${encodeURIComponent(topicKey)}`);
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
    const { ok, data } = await api("/api/admin/content/save", { method: "POST", body: { gradeNum: cs.gradeNum, topic: cs.topic, questions } });
    if (ok && data.ok) {
      toast(`נשמרו ${data.count} שאלות`); cs.data.questions = questions;
      const t = cs.tree.flatMap((g) => g.topics).find((x) => x.key === cs.topic); if (t) t.bankCount = data.count;
      const tLabel = t ? t.label : cs.topic;
      // רענון מטמון החיפוש לנושא שנשמר
      if (cs.allQ) { cs.allQ = cs.allQ.filter((x) => x.topicKey !== cs.topic); for (const q of questions) cs.allQ.push({ q, topicKey: cs.topic, topicLabel: tLabel }); }
      $("#gradeBody")?.querySelectorAll(".topicBtn").forEach((b) => { if (b.dataset.topic === cs.topic) { const c = b.querySelector(".count"); if (c) c.textContent = data.count; } });
    } else toast(data.error || "שמירה נכשלה", true);
  }

  checkAuth();
})();
