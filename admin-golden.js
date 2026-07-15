/* eslint-disable no-console */

/**
 * ────────────────────────────────────────────────────────────────────────
 *  סטודיו שיעורי-הזהב v2 — מערך-שיעור חי + עורך ויזואלי מלא
 * ────────────────────────────────────────────────────────────────────────
 *  מסך ראשי = מערך השיעור כמסמך: נושא, מטרה, שלבים (פתיחה→הסבר→מודרך→עצמאי→סיום),
 *  לכל שלב: הטקסט שהמורה אומר + המסך כפי שהילד יראה אותו (לוח אמיתי, ווידג'טים אמיתיים).
 *  לחיצה על מסך → עורך מלא: פלטת אלמנטים ויזואלית (רואים את האלמנט, לא שם),
 *  גרירה מהפלטה ללוח, קליק-ימני = חלונית הגדרות, ידית-פינה = הגדלה/הקטנה.
 *  בלי prompt() בכלל. מה שרואים כאן = מה שהילד יקבל, 1:1 (tidy:false בזמן-ריצה).
 */
(function () {
  "use strict";

  /* ── עזרים ── */
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const deep = (o) => JSON.parse(JSON.stringify(o));
  const cnum = (v, lo, hi, d) => { v = +v; if (!isFinite(v)) v = d; return Math.min(hi, Math.max(lo, v)); };
  function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  /* ── מבנה השיעור ── */
  const PHASES = [
    { key: "instruct", label: "הסבר", multi: true, chips: ["✓ להמשך"] },
    { key: "guided", label: "תרגול מודרך", multi: false, chips: null },
    { key: "independent", label: "תרגול עצמאי", multi: false, chips: null },
  ];
  const AUTO_OPEN = { label: "פתיחה", desc: "ברכה אישית — בשם הילד/ה, מספר השיעור בנושא ותזכורת מהשיעור הקודם. נוצרת אוטומטית ומיידית (0 טוקנים)." };
  const AUTO_CLOSE = { label: "סיום", desc: "סיכום קצר, מחמאה ופתק אוטומטי למחברת-המורה: מה עבד ומה כדאי בשיעור הבא." };

  /* ── ווידג'טים חיים: מיפוי כלי → ערכה + יחס טבעי ── */
  const KIT = {
    ten_frame: { key: "ten_frame", vw: 360, vh: 240 },
    count_objects: { key: "count_objects", vw: 360, vh: 220 },
    interactive_fraction: { key: "fraction", vw: 360, vh: 220 },
    base_ten_builder: { key: "base_ten_builder", vw: 360, vh: 220 },
    mult_array: { key: "mult_array", vw: 360, vh: 240 },
    mult_table: { key: "mult_table", vw: 360, vh: 360 },
    clock_interactive: { key: "clock_interactive", vw: 300, vh: 300 },
    money_coins: { key: "money_coins", vw: 380, vh: 300 },
    hundred_chart: { key: "hundred_chart", vw: 300, vh: 300 },
    number_line_interactive: { key: "number_line_interactive", vw: 360, vh: 180 },
  };

  /* ── הפלטה: רואים את האלמנט עצמו. sample = מה נזרק ללוח; thumb = מה מצויר בפלטה ── */
  const PALETTE = [
    { group: "כתיבה ושאלות", items: [
      { tool: "write_text", cap: "טקסט", sample: { text: "כותרת", size: 40 }, thumb: { text: "אבג", size: 52 } },
      { tool: "draw_exercise", cap: "תרגיל + תשובה", sample: { text: "4 + 3 =", answer: "7" }, thumb: { text: "4+3=", answer: "7" } },
    ] },
    { group: "הדמיות", items: [
      { tool: "draw_base_ten", cap: "בסיס-10", sample: { value: 34, label: "" }, thumb: { value: 23, label: "" } },
      { tool: "draw_number_line", cap: "ציר מספרים", sample: { from: 0, to: 10, step: 1 }, thumb: { from: 0, to: 5, step: 1 } },
      { tool: "draw_array", cap: "מערך נקודות", sample: { rows: 3, cols: 4, label: "" }, thumb: { rows: 2, cols: 3, label: "" } },
      { tool: "draw_fraction_bar", cap: "מוט שבר", sample: { parts: 4, shaded: 3, label: "" }, thumb: { parts: 4, shaded: 3, label: "" } },
      { tool: "draw_bar_model", cap: "חלק-שלם", sample: { parts: [{ value: 3 }, { value: 2 }], total: "5" }, thumb: { parts: [{ value: 3 }, { value: 2 }], total: "5" } },
      { tool: "draw_clock", cap: "שעון", sample: { hour: 3, minute: 0, r: 90 }, thumb: { hour: 3, minute: 0, r: 70 } },
    ] },
    { group: "כלים חיים", items: [
      { tool: "ten_frame", cap: "לוח-עשר", sample: { cells: 10, perRow: 5 } },
      { tool: "count_objects", cap: "ספירה", sample: { op: "+", item: "apple", left: 3, right: 2 } },
      { tool: "interactive_fraction", cap: "שבר לחיץ", sample: { shape: "circle", parts: 4, shaded: 1 } },
      { tool: "base_ten_builder", cap: "בונה בסיס-10", sample: {} },
      { tool: "number_line_interactive", cap: "סרגל חי", sample: { from: 0, to: 10, step: 1 } },
      { tool: "clock_interactive", cap: "שעון מחוגים", sample: { hour: 3, minute: 0 } },
      { tool: "money_coins", cap: "מטבעות ₪", sample: { target: 0 } },
      { tool: "hundred_chart", cap: "לוח מאה", sample: { skip: 0 } },
      { tool: "mult_array", cap: "מערך כפל", sample: { maxRows: 10, maxCols: 10 } },
      { tool: "mult_table", cap: "לוח הכפל", sample: { max: 10, hide: 6 } },
    ] },
    { group: "צורות", items: [
      { tool: "draw_circle", cap: "עיגול", sample: { r: 60 }, thumb: { r: 40 } },
      { tool: "draw_line", cap: "קו", sample: {}, thumb: {} },
      { tool: "draw_arrow", cap: "חץ", sample: {}, thumb: {} },
      { tool: "draw_polygon", cap: "משולש", sample: {}, thumb: {} },
      { tool: "draw_point", cap: "נקודה", sample: { label: "א" }, thumb: { label: "א" } },
    ] },
  ];

  /* ── קליק-ימני: השדות של כל אלמנט (חיים — משתנים ורואים מיד) ── */
  const COLOR_CHOICES = [["", "#0d9488"], ["#ef4444", "#ef4444"], ["#3b82f6", "#3b82f6"], ["#22c55e", "#22c55e"], ["#f59e0b", "#f59e0b"], ["#111827", "#111827"]];
  const FIELDS = {
    write_text: [{ k: "text", t: "text", l: "הטקסט", max: 40 }, { k: "color", t: "color", l: "צבע" }],
    draw_exercise: [{ k: "text", t: "text", l: "התרגיל", max: 80 }, { k: "answer", t: "text", l: "התשובה הנכונה", max: 20 }],
    draw_base_ten: [{ k: "value", t: "int", l: "המספר", min: 1, max: 999 }],
    draw_number_line: [{ k: "from", t: "int", l: "מ-", min: -100, max: 1000 }, { k: "to", t: "int", l: "עד", min: -100, max: 1000 }, { k: "step", t: "int", l: "קפיצה", min: 1, max: 100 }],
    draw_array: [{ k: "rows", t: "int", l: "שורות", min: 1, max: 12 }, { k: "cols", t: "int", l: "עמודות", min: 1, max: 12 }],
    draw_fraction_bar: [{ k: "parts", t: "int", l: "חלקים", min: 2, max: 12 }, { k: "shaded", t: "int", l: "צבועים", min: 0, max: 12 }],
    draw_bar_model: [{ k: "parts", t: "parts", l: "חלקים (בפסיקים: 3,2)" }, { k: "total", t: "text", l: "סה\"כ (מספר או ?)", max: 12 }],
    draw_clock: [{ k: "hour", t: "int", l: "שעה", min: 0, max: 12 }, { k: "minute", t: "int", l: "דקות", min: 0, max: 55 }],
    draw_circle: [{ k: "color", t: "color", l: "צבע" }],
    draw_line: [{ k: "color", t: "color", l: "צבע" }],
    draw_arrow: [{ k: "color", t: "color", l: "צבע" }],
    draw_polygon: [{ k: "color", t: "color", l: "צבע" }],
    draw_point: [{ k: "label", t: "text", l: "תווית", max: 16 }, { k: "color", t: "color", l: "צבע" }],
    ten_frame: [{ k: "cells", t: "int", l: "משבצות", min: 1, max: 20 }, { k: "perRow", t: "int", l: "בשורה", min: 5, max: 10 }],
    count_objects: [{ k: "left", t: "int", l: "קבוצה ראשונה", min: 0, max: 12 }, { k: "right", t: "int", l: "קבוצה שנייה", min: 0, max: 12 },
      { k: "op", t: "choice", l: "פעולה", opts: [["+", "חיבור +"], ["-", "חיסור −"]] },
      { k: "item", t: "choice", l: "חפצים", opts: [["apple", "תפוחים"], ["star", "כוכבים"], ["balloon", "בלונים"]] }],
    interactive_fraction: [{ k: "parts", t: "int", l: "חלקים", min: 2, max: 12 }, { k: "shaded", t: "int", l: "צבועים", min: 0, max: 12 },
      { k: "shape", t: "choice", l: "צורה", opts: [["circle", "עיגול"], ["bar", "מוט"]] }],
    base_ten_builder: [],
    mult_array: [{ k: "maxRows", t: "int", l: "שורות מקס'", min: 2, max: 12 }, { k: "maxCols", t: "int", l: "עמודות מקס'", min: 2, max: 12 }],
    mult_table: [{ k: "max", t: "int", l: "עד", min: 5, max: 12 }, { k: "hide", t: "int", l: "להסתיר (0=כלום)", min: 0, max: 12 }],
    hundred_chart: [{ k: "skip", t: "int", l: "לסמן כפולות של (0=בלי)", min: 0, max: 12 }],
    number_line_interactive: [{ k: "from", t: "int", l: "מ-", min: -100, max: 1000 }, { k: "to", t: "int", l: "עד", min: -100, max: 1000 }, { k: "step", t: "int", l: "קפיצה", min: 1, max: 100 }],
    clock_interactive: [{ k: "hour", t: "int", l: "שעה", min: 0, max: 12 }, { k: "minute", t: "int", l: "דקות", min: 0, max: 55 }],
    money_coins: [{ k: "target", t: "int", l: "סכום-יעד (0=חופשי)", min: 0, max: 200 }],
  };

  /* ── מצב ── */
  let st = null;      // {topic, lesson, title, plan, phases, cur, board, sel, dirty, _previews}
  let overlay = null; // שורש הסטודיו
  let pop = null;     // חלונית ההגדרות הפתוחה

  const isWidgetTool = (t) => !!KIT[t];

  function normScreens(raw) {
    const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return arr.map((s) => ({
      reply: String(s.reply || ""),
      steps: (s.toolCalls || []).filter((t) => t && t.name).map((t) => {
        const input = deep(t.input || {});
        // ווידג'ט עם מיקום מפורש מקבל exact — הלוח לא יזיז אותו (נאמנות לעיצוב)
        if (isWidgetTool(t.name) && isFinite(+input.x) && isFinite(+input.y)) input.exact = true;
        return { name: t.name, input, ref: null };
      }),
    }));
  }

  /* ══════════════ פתיחה ══════════════ */
  async function open(topic, lesson, title) {
    let data = null;
    try { data = await (await fetch(`/api/admin/golden?topic=${encodeURIComponent(topic)}&lesson=${lesson}`)).json(); } catch (e) {}
    if (!data || !data.ok) { toastGlobal("שגיאה בטעינת שיעור-הזהב"); return; }
    const g = data.golden;
    st = {
      topic, lesson,
      title: g.title || (data.plan && data.plan.title) || title || "",
      plan: data.plan || null,
      phases: {
        instruct: normScreens(g.phases && g.phases.instruct).length ? normScreens(g.phases.instruct) : [{ reply: "", steps: [] }],
        guided: normScreens(g.phases && g.phases.guided).length ? normScreens(g.phases.guided) : [{ reply: "", steps: [] }],
        independent: normScreens(g.phases && g.phases.independent).length ? normScreens(g.phases.independent) : [{ reply: "", steps: [] }],
      },
      cur: null, board: null, sel: null, dirty: false, _previews: [],
    };
    buildOverlay();
    renderPlan();
    document.addEventListener("keydown", onKey);
  }

  function buildOverlay() {
    if (overlay) overlay.remove();
    overlay = el("div", "gs");
    document.body.appendChild(overlay);
  }
  function closeStudio() {
    if (st && st.dirty && !confirm("יש שינויים שלא נשמרו — לצאת בכל זאת?")) return;
    document.removeEventListener("keydown", onKey);
    closePop();
    if (overlay) { overlay.remove(); overlay = null; }
    st = null;
  }
  function onKey(e) {
    if (!st) return;
    if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); saveAll(); return; }
    if (e.key === "Escape") {
      if (pop) { closePop(); return; }
      if (st.cur) { syncScreen(); openPlanFromEditor(); } else closeStudio();
      return;
    }
    const tag = document.activeElement && document.activeElement.tagName;
    if ((e.key === "Delete" || e.key === "Backspace") && st.cur && st.sel && tag !== "TEXTAREA" && tag !== "INPUT") { e.preventDefault(); deleteSelected(); }
  }
  function openPlanFromEditor() { closePop(); st.cur = null; st.board = null; st.sel = null; renderPlan(); }

  /* ══════════════ מסך 1: מערך השיעור ══════════════ */
  function renderPlan() {
    st._previews = [];
    const plan = st.plan;
    overlay.innerHTML = `
      <header class="gs-bar">
        <button class="gs-x" id="gsClose" title="סגירה">✕</button>
        <div class="gs-crumb">שיעור-זהב · ${esc(st.topic)}</div>
        <span class="gs-sp"></span>
        <button class="gs-save" id="gsSave">שמירת השיעור</button>
      </header>
      <main class="gs-doc">
        <section class="gs-head">
          <div class="gs-kicker">מערך שיעור · שיעור ${st.lesson}${plan && plan.total ? ` מתוך ${plan.total}` : ""} בנושא ${esc(st.topic)}</div>
          <input class="gs-title" id="gsTitle" value="${esc(st.title)}" placeholder="שם השיעור…" maxlength="60" />
        </section>
        ${plan && plan.goal ? `
        <section class="gs-goal">
          <div class="gs-goal-ico">◎</div>
          <div>
            <div class="gs-goal-t">מטרת השיעור</div>
            <div class="gs-goal-x">${esc(plan.goal)}</div>
            ${plan.teach ? `<details class="gs-teach"><summary>גישת ההוראה המומלצת</summary><p>${esc(plan.teach)}</p></details>` : ""}
          </div>
        </section>` : ""}
        <ol class="gs-stages" id="gsStages"></ol>
      </main>`;
    $("#gsClose", overlay).addEventListener("click", closeStudio);
    $("#gsSave", overlay).addEventListener("click", saveAll);
    $("#gsTitle", overlay).addEventListener("input", (e) => { st.title = e.target.value; st.dirty = true; });

    const list = $("#gsStages", overlay);
    let stageN = 1;
    list.appendChild(autoStage(stageN++, AUTO_OPEN));
    PHASES.forEach((ph) => {
      st.phases[ph.key].forEach((scr, idx) => list.appendChild(stageCard(stageN, ph, scr, idx)));
      if (ph.multi && st.phases[ph.key].length < 8) { // תקרת-השרת: עד 8 מסכים לשלב
        const add = el("li", "gs-stage gs-stage--add");
        add.innerHTML = `<div class="gs-rail"><span class="gs-dotline"></span></div><button class="gs-addscreen">+ מסך הסבר נוסף</button>`;
        add.querySelector("button").addEventListener("click", () => { st.phases[ph.key].push({ reply: "", steps: [] }); st.dirty = true; renderPlan(); });
        list.appendChild(add);
      }
      stageN++;
    });
    list.appendChild(autoStage(stageN, AUTO_CLOSE));
    // גובה תיבות-הטקסט נמדד רק אחרי חיבור ל-DOM ופריסה/פונט (מדידה מוקדמת מדי מחזירה 0 והטקסט נעלם)
    const growAll = () => { if (overlay) overlay.querySelectorAll(".gs-say").forEach((ta) => autoGrow(ta)); };
    requestAnimationFrame(growAll);
    setTimeout(growAll, 160);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(growAll);
  }

  function autoStage(n, meta) {
    const li = el("li", "gs-stage gs-stage--auto");
    li.innerHTML = `
      <div class="gs-rail"><span class="gs-num">${n}</span><span class="gs-line"></span></div>
      <div class="gs-card gs-card--auto">
        <div class="gs-chiprow"><span class="gs-chip gs-chip--phase">${esc(meta.label)}</span><span class="gs-chip gs-chip--auto">✦ אוטומטי</span></div>
        <p class="gs-autodesc">${esc(meta.desc)}</p>
      </div>`;
    return li;
  }

  function stageCard(n, ph, scr, idx) {
    const many = ph.multi && st.phases[ph.key].length > 1;
    const exN = scr.steps.filter((s) => s.name === "draw_exercise" || s.name === "ask_answer").length;
    const chips = ph.key === "instruct" ? `<span class="gs-chip gs-chip--btn">✓ להמשך</span>`
      : `<span class="gs-chip gs-chip--btn">🖊 כתיבה על הלוח</span>${exN ? `<span class="gs-chip gs-chip--btn">אזורי-תשובה · ${exN}</span>` : ""}`;
    const li = el("li", "gs-stage");
    li.innerHTML = `
      <div class="gs-rail"><span class="gs-num">${n}${many ? `<i>.${idx + 1}</i>` : ""}</span><span class="gs-line"></span></div>
      <div class="gs-card">
        <div class="gs-chiprow">
          <span class="gs-chip gs-chip--phase">${esc(ph.label)}${many ? ` · מסך ${idx + 1}` : ""}</span>
          <span class="gs-sp"></span>
          <button class="gs-iconbtn" data-edit title="עריכה במסך מלא">✎ עריכת המסך</button>
          ${many ? `<button class="gs-iconbtn gs-iconbtn--del" data-del title="מחיקת המסך">🗑</button>` : ""}
        </div>
        <textarea class="gs-say" placeholder="מה המורה אומר/ת בשלב הזה… (מוכן/ה מוטה אוטומטית לפי הילד)" rows="1">${esc(scr.reply)}</textarea>
        <div class="gs-screen" title="לחיצה — עריכה במסך מלא">
          <canvas></canvas>
          <div class="gs-screen-cta">✎ עריכה במסך מלא</div>
        </div>
        <div class="gs-childbtns"><span class="gs-childbtns-l">הילד רואה:</span>${chips}</div>
      </div>`;
    const say = li.querySelector(".gs-say");
    autoGrow(say);
    say.addEventListener("input", () => { scr.reply = say.value; st.dirty = true; autoGrow(say); });
    li.querySelector("[data-edit]").addEventListener("click", () => openEditor(ph.key, idx));
    li.querySelector(".gs-screen").addEventListener("click", () => openEditor(ph.key, idx));
    const delBtn = li.querySelector("[data-del]");
    if (delBtn) delBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!delBtn.dataset.arm) { delBtn.dataset.arm = "1"; delBtn.textContent = "בטוח?"; setTimeout(() => { if (delBtn.isConnected) { delete delBtn.dataset.arm; delBtn.textContent = "🗑"; } }, 2200); return; }
      st.phases[ph.key].splice(idx, 1); st.dirty = true; renderPlan();
    });
    makePreview(li.querySelector(".gs-screen"), scr);
    return li;
  }

  function autoGrow(ta) { ta.style.height = "auto"; ta.style.height = Math.min(220, Math.max(30, ta.scrollHeight)) + "px"; }

  // תצוגת-מסך חיה: לוח אמיתי + הווידג'טים האמיתיים (iframes סטטיים) — לא מתאר, הדבר עצמו
  function makePreview(container, scr) {
    const canvas = container.querySelector("canvas");
    requestAnimationFrame(() => {
      const b = new window.VelaBoard(canvas, { fit: "fill", background: "grid", grid: 42, mode: "idle", pan: false, zoom: false });
      scr.steps.forEach((s) => { try { b.tool(s.name, s.input); } catch (e) {} });
      const bb = b._contentBBox && b._contentBBox();
      const wrects = b.getWidgetRects ? b.getWidgetRects() : [];
      if (bb || (wrects && wrects.length)) {
        const full = bb ? { ...bb } : { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
        (wrects || []).forEach((r) => {
          full.minX = Math.min(full.minX, r.x); full.minY = Math.min(full.minY, r.y);
          full.maxX = Math.max(full.maxX, r.x + r.w); full.maxY = Math.max(full.maxY, r.y + r.h);
        });
        if (isFinite(full.minX)) b.fitView(full, 40, 0);
      }
      b.onRender(() => positionPreviewWidgets(b, container));
      b.render();
      st._previews.push(b);
    });
  }
  function positionPreviewWidgets(b, container) {
    if (!container.isConnected) return;
    const cRect = container.getBoundingClientRect();
    const live = {};
    (b.getWidgetRects() || []).forEach((r) => {
      live[r.id] = 1;
      let f = container.querySelector(`iframe[data-wid="${r.id}"]`);
      if (!f) {
        const wd = (b.widgets || []).find((w) => w.id === r.id);
        f = widgetFrame(wd ? wd.html : "", r.id);
        container.appendChild(f);
      }
      f.style.left = (r.left - cRect.left) + "px";
      f.style.top = (r.top - cRect.top) + "px";
      f.style.width = (r.w * r.scale) + "px";
      f.style.height = (r.h * r.scale) + "px";
    });
    container.querySelectorAll("iframe[data-wid]").forEach((f) => { if (!live[f.dataset.wid]) f.remove(); });
  }
  // iframe סטטי (בלי סקריפטים) — מציג את הוויזואליה האמיתית של הווידג'ט, בלי אינטראקציה
  function widgetFrame(html, id) {
    const f = document.createElement("iframe");
    f.className = "gs-wframe";
    f.dataset.wid = id;
    f.setAttribute("sandbox", "");
    f.setAttribute("tabindex", "-1");
    f.srcdoc = `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#fff;overflow:hidden">${html}</body></html>`;
    return f;
  }

  /* ══════════════ מסך 2: העורך המלא ══════════════ */
  function openEditor(phaseKey, screenIdx) {
    closePop();
    st._previews = [];
    st.cur = { phase: phaseKey, screen: screenIdx };
    const ph = PHASES.find((p) => p.key === phaseKey);
    const many = ph.multi && st.phases[phaseKey].length > 1;
    overlay.innerHTML = `
      <header class="gs-bar">
        <button class="gs-back" id="gsBack">→ למערך השיעור</button>
        <div class="gs-crumb"><span class="gs-chip gs-chip--phase">${esc(ph.label)}${many ? ` · מסך ${screenIdx + 1}/${st.phases[phaseKey].length}` : ""}</span></div>
        <span class="gs-sp"></span>
        <button class="gs-iconbtn" id="gsBubbleBtn" title="הטקסט שהמורה אומר">💬</button>
        <button class="gs-save" id="gsSave2">שמירה</button>
      </header>
      <div class="gs-ed">
        <div class="gs-wrap" id="gsWrap">
          <canvas id="gsCanvas"></canvas>
          <div class="gs-zoom">
            <button data-z="in" title="הגדלת תצוגה">+</button>
            <button data-z="reset" id="gsZoomPct">100%</button>
            <button data-z="out" title="הקטנת תצוגה">−</button>
          </div>
          <div class="gs-bubble" id="gsBubble" hidden>
            <div class="gs-bubble-t">💬 מה המורה אומר במסך הזה</div>
            <textarea id="gsReply" rows="4" placeholder="הטקסט שהמורה יגיד לילד…"></textarea>
          </div>
          <div class="gs-emptyhint" id="gsEmpty" hidden>גררו אלמנט מהמדף למטה — או לחצו עליו</div>
        </div>
        <footer class="gs-dock" id="gsDock"></footer>
      </div>`;
    $("#gsBack", overlay).addEventListener("click", () => { syncScreen(); openPlanFromEditor(); });
    $("#gsSave2", overlay).addEventListener("click", saveAll);
    const bubble = $("#gsBubble", overlay), reply = $("#gsReply", overlay);
    reply.value = curScreen().reply;
    reply.addEventListener("input", () => { curScreen().reply = reply.value; st.dirty = true; });
    $("#gsBubbleBtn", overlay).addEventListener("click", () => { bubble.hidden = !bubble.hidden; if (!bubble.hidden) reply.focus(); });
    overlay.querySelectorAll("[data-z]").forEach((b) => b.addEventListener("click", () => {
      if (!st.board) return;
      if (b.dataset.z === "in") st.board.zoomIn(); else if (b.dataset.z === "out") st.board.zoomOut(); else st.board.resetView();
    }));
    buildDock($("#gsDock", overlay));
    rebuildBoard();
  }

  function curScreen() { return st.phases[st.cur.phase][st.cur.screen]; }

  /* ── בניית הלוח מהצעדים + ref לכל צעד ── */
  function rebuildBoard() {
    const wrap = $("#gsWrap", overlay);
    wrap.querySelectorAll(".gs-w, .gs-wframe, .gs-sel").forEach((n) => n.remove());
    const canvas = $("#gsCanvas", overlay);
    const b = new window.VelaBoard(canvas, { fit: "fill", background: "grid", grid: 42, mode: "idle", pan: false, zoom: true });
    st.board = b; st.sel = null;
    curScreen().steps.forEach((s) => { s.ref = runStep(b, s); });
    b.onRender(() => { layoutWidgetLayer(); drawSelection(); updateZoomPct(); updateEmptyHint(); });
    bindCanvas(canvas, b);
    b.render();
  }
  function runStep(b, s) {
    const eN = b.answerBoxes.length, wN = b.widgets.length, oN = b.objects.length;
    try { b.tool(s.name, s.input); } catch (e) { console.warn("step failed", s.name, e); }
    if (b.answerBoxes.length > eN) return { kind: "e", id: b.answerBoxes[b.answerBoxes.length - 1].id };
    if (b.widgets.length > wN) return { kind: "w", id: b.widgets[b.widgets.length - 1].id };
    if (b.objects.length > oN) { const o = b.objects[b.objects.length - 1]; return { kind: "g", gid: o.gid, id: o.id }; }
    return null;
  }
  function updateZoomPct() {
    const p = $("#gsZoomPct", overlay);
    if (p && st.board) p.textContent = Math.round(st.board.getView().scale * 100) + "%";
  }
  function updateEmptyHint() {
    const h = $("#gsEmpty", overlay);
    if (h) h.hidden = curScreen().steps.length > 0;
  }

  /* ── שכבת הווידג'טים בעורך: התוכן האמיתי (iframe סטטי) + שכבת-גרירה שקופה ── */
  function layoutWidgetLayer() {
    if (!st || !st.cur || !st.board) return;
    const wrap = $("#gsWrap", overlay);
    if (!wrap) return;
    const wRect = wrap.getBoundingClientRect();
    const live = {};
    (st.board.getWidgetRects() || []).forEach((r) => {
      live[r.id] = 1;
      let f = wrap.querySelector(`iframe[data-wid="${r.id}"]`);
      if (!f) {
        const wd = (st.board.widgets || []).find((w) => w.id === r.id);
        f = widgetFrame(wd ? wd.html : "", r.id);
        wrap.appendChild(f);
      }
      let ov = wrap.querySelector(`.gs-w[data-id="${r.id}"]`);
      if (!ov) {
        ov = el("div", "gs-w");
        ov.dataset.id = r.id;
        wrap.appendChild(ov);
        bindWidgetOverlay(ov, r.id);
      }
      const x = r.left - wRect.left, y = r.top - wRect.top, w = r.w * r.scale, h = r.h * r.scale;
      [f, ov].forEach((n) => { n.style.left = x + "px"; n.style.top = y + "px"; n.style.width = w + "px"; n.style.height = h + "px"; });
      ov.classList.toggle("is-sel", !!(st.sel && st.sel.kind === "w" && st.sel.id === r.id));
    });
    wrap.querySelectorAll("iframe[data-wid], .gs-w").forEach((n) => {
      const id = n.dataset.wid || n.dataset.id;
      if (!live[id]) n.remove();
    });
  }
  function bindWidgetOverlay(ov, id) {
    let drag = null;
    ov.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const r = (st.board.getWidgetRects() || []).find((x) => x.id === id);
      if (!r) return;
      drag = { sx: e.clientX, sy: e.clientY, wx: r.x, wy: r.y, sc: r.scale || 1 };
      select({ kind: "w", id });
      try { ov.setPointerCapture(e.pointerId); } catch (err) {}
    });
    ov.addEventListener("pointermove", (e) => {
      if (!drag) return;
      st.board.setWidgetPos(id, drag.wx + (e.clientX - drag.sx) / drag.sc, drag.wy + (e.clientY - drag.sy) / drag.sc);
      st.dirty = true;
    });
    const end = () => { drag = null; };
    ov.addEventListener("pointerup", end);
    ov.addEventListener("pointercancel", end);
    ov.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      select({ kind: "w", id });
      openPopFor({ kind: "w", id }, e.clientX, e.clientY);
    });
  }

  /* ── אינטראקציות על הקנבס: בחירה, גרירה, קליק-ימני, לחיצה-כפולה ── */
  function toWorld(b, canvas, e) {
    const rect = canvas.getBoundingClientRect();
    const v = b.getView();
    return { x: (e.clientX - rect.left - v.x) / v.scale, y: (e.clientY - rect.top - v.y) / v.scale };
  }
  function bindCanvas(canvas, b) {
    let drag = null;
    canvas.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      closePop();
      const w = toWorld(b, canvas, e);
      const ex = b._exAt && b._exAt(w);
      if (ex) { select({ kind: "e", id: ex.id }); st.dirty = true; return; } // הלוח גורר תרגילים בעצמו
      const hit = hitGroup(b, w);
      if (hit) {
        drag = { gid: hit.gid, id: hit.id, last: w };
        select({ kind: "g", id: hit.id, gid: hit.gid });
        e.preventDefault(); e.stopPropagation();
        return;
      }
      select(null);
    }, true);
    canvas.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const w = toWorld(b, canvas, e);
      if (drag.gid) b._translateGroup(drag.gid, w.x - drag.last.x, w.y - drag.last.y);
      else { const o = b._objById(drag.id); if (o) b._translateObject(o, w.x - drag.last.x, w.y - drag.last.y); }
      drag.last = w; st.dirty = true; b.render();
    }, true);
    const end = () => { drag = null; };
    canvas.addEventListener("pointerup", end, true);
    canvas.addEventListener("pointercancel", end, true);
    canvas.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      const w = toWorld(b, canvas, e);
      const ex = b._exAt && b._exAt(w);
      if (ex) { select({ kind: "e", id: ex.id }); openPopFor({ kind: "e", id: ex.id }, e.clientX, e.clientY); return; }
      const hit = hitGroup(b, w);
      if (hit) { select({ kind: "g", id: hit.id, gid: hit.gid }); openPopFor({ kind: "g", id: hit.id, gid: hit.gid }, e.clientX, e.clientY); return; }
      closePop();
    });
    canvas.addEventListener("dblclick", (e) => {
      const w = toWorld(b, canvas, e);
      const L = b.getLayout().filter((it) => it.kind === "text");
      for (let i = L.length - 1; i >= 0; i--) {
        const it = L[i];
        if (w.x >= it.x && w.x <= it.x + it.w && w.y >= it.y && w.y <= it.y + it.h) { inlineTextEdit(it.id); return; }
      }
    });
  }
  function hitGroup(b, w) {
    const L = b.getLayout().filter((it) => it.kind !== "widget" && it.kind !== "exercise");
    for (let i = L.length - 1; i >= 0; i--) {
      const it = L[i];
      if (w.x >= it.x - 4 && w.x <= it.x + it.w + 4 && w.y >= it.y - 4 && w.y <= it.y + it.h + 4) {
        const obj = b._objById(it.id);
        return { id: it.id, gid: obj && obj.gid };
      }
    }
    return null;
  }

  /* ── בחירה: מסגרת + ידית הגדלה/הקטנה בפינה ── */
  function select(sel) { st.sel = sel; drawSelection(); layoutWidgetLayer(); }
  function selBBoxScreen() {
    if (!st.sel || !st.board) return null;
    const b = st.board;
    let bb = null;
    if (st.sel.kind === "e") return null; // ללוח יש בחירה+ידית-הגדלה מובנות לתרגילים — לא מציירים כפול
    else if (st.sel.kind === "g") bb = st.sel.gid ? b._groupBBox(st.sel.gid) : (b._objById(st.sel.id) && b._objBBox(b._objById(st.sel.id)));
    else if (st.sel.kind === "w") { const r = (b.getWidgetRects() || []).find((x) => x.id === st.sel.id); if (r) return { x: r.left, y: r.top, w: r.w * r.scale, h: r.h * r.scale }; }
    if (!bb || !isFinite(bb.minX)) return null;
    const p1 = b.worldToScreen(bb.minX, bb.minY), p2 = b.worldToScreen(bb.maxX, bb.maxY);
    return { x: p1.x, y: p1.y, w: p2.x - p1.x, h: p2.y - p1.y };
  }
  function drawSelection() {
    const wrap = $("#gsWrap", overlay);
    if (!wrap) return;
    let box = wrap.querySelector(".gs-sel");
    const r = selBBoxScreen();
    if (!r) { if (box) box.remove(); return; }
    if (!box) {
      box = el("div", "gs-sel", `<span class="gs-selh" title="גרירה — הגדלה/הקטנה"></span>`);
      wrap.appendChild(box);
      bindResizeHandle(box.querySelector(".gs-selh"));
    }
    const wRect = wrap.getBoundingClientRect();
    box.style.left = (r.x - wRect.left - 7) + "px";
    box.style.top = (r.y - wRect.top - 7) + "px";
    box.style.width = (r.w + 14) + "px";
    box.style.height = (r.h + 14) + "px";
  }

  // עוגן קנה-מידה לקבוצה — לפי אותו כלל של הלוח (input.x/y → x1/y1 → נקודה ראשונה → מרכז)
  function ensureGroupAnchor(step) {
    const b = st.board, input = step.input;
    let ax = null, ay = null;
    if (isFinite(+input.x) && isFinite(+input.y)) { ax = +input.x; ay = +input.y; }
    else if (isFinite(+input.x1) && isFinite(+input.y1)) { ax = +input.x1; ay = +input.y1; }
    else if (input.points && input.points[0]) { ax = +input.points[0][0]; ay = +input.points[0][1]; }
    if (ax == null && step.ref && step.ref.gid) { const g = b._groupBBox(step.ref.gid); if (g) { ax = (g.minX + g.maxX) / 2; ay = (g.minY + g.maxY) / 2; } }
    if (ax == null) return null;
    let k = 1;
    b.objects.forEach((o) => { if (step.ref && o.gid === step.ref.gid) { if (o._k) k = o._k; } });
    b.objects.forEach((o) => { if (step.ref && o.gid === step.ref.gid) { o._k = k; o._kax = ax; o._kay = ay; } });
    return { k };
  }
  function bindResizeHandle(handle) {
    let rz = null;
    handle.addEventListener("pointerdown", (e) => {
      if (!st.sel || !st.board) return;
      e.preventDefault(); e.stopPropagation();
      syncScreen(); // מקבע מיקומים לפני המתיחה — העוגן נלקח מהקלט העדכני
      const r = selBBoxScreen();
      if (!r) return;
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      const d0 = Math.max(24, Math.hypot(e.clientX - cx, e.clientY - cy));
      rz = { cx, cy, d0, sel: st.sel, step: findStep(st.sel) };
      if (st.sel.kind === "w") { const wd = st.board.widgets.find((x) => x.id === st.sel.id); rz.w0 = wd ? wd.w : 300; }
      else if (st.sel.kind === "e") { const a = st.board._exById(st.sel.id); rz.s0 = (a && a.scale) || 1; }
      else if (st.sel.kind === "g" && rz.step) { const a = ensureGroupAnchor(rz.step); rz.k0 = a ? a.k : 1; }
      try { handle.setPointerCapture(e.pointerId); } catch (err) {}
    });
    handle.addEventListener("pointermove", (e) => {
      if (!rz) return;
      const f = Math.hypot(e.clientX - rz.cx, e.clientY - rz.cy) / rz.d0;
      const b = st.board;
      if (rz.sel.kind === "w") b.setWidgetSize(rz.sel.id, Math.round(rz.w0 * f));
      else if (rz.sel.kind === "e") { const a = b._exById(rz.sel.id); if (a) { a.scale = cnum(rz.s0 * f, 0.4, 3, 1); b.render(); } }
      else if (rz.sel.kind === "g" && rz.step && rz.step.ref) {
        const k = cnum(rz.k0 * f, 0.35, 3, 1);
        b.objects.forEach((o) => { if (o.gid === rz.step.ref.gid) o._k = k; });
        b.render();
      }
      st.dirty = true;
    });
    const end = () => {
      if (!rz) return;
      const b = st.board, step = rz.step;
      if (step) {
        if (rz.sel.kind === "w") { const wd = b.widgets.find((x) => x.id === rz.sel.id); if (wd) { step.input.w = wd.w; step.input.h = wd.h; } }
        else if (rz.sel.kind === "e") { const a = b._exById(rz.sel.id); if (a) step.input.scale = Math.round(a.scale * 100) / 100; }
        else if (rz.sel.kind === "g" && step.ref) { const o = b.objects.find((x) => x.gid === step.ref.gid); if (o && o._k) step.input.scale = Math.round(o._k * 100) / 100; }
      }
      rz = null;
    };
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);
  }

  function findStep(sel) {
    if (!sel) return null;
    return curScreen().steps.find((s) => s.ref && (
      (sel.kind === "e" && s.ref.kind === "e" && s.ref.id === sel.id) ||
      (sel.kind === "w" && s.ref.kind === "w" && s.ref.id === sel.id) ||
      (sel.kind === "g" && s.ref.kind === "g" && (s.ref.gid ? s.ref.gid === sel.gid : s.ref.id === sel.id))
    ));
  }
  function deleteSelected() {
    if (!st.sel || !st.board) return;
    const step = findStep(st.sel);
    st.board.tool("remove_item", { id: st.sel.id });
    if (step) curScreen().steps = curScreen().steps.filter((s) => s !== step);
    st.dirty = true;
    closePop();
    select(null);
    st.board.render();
  }

  /* ══════════════ המדף: אלמנטים ויזואליים + גרירה ללוח ══════════════ */
  function buildDock(dock) {
    PALETTE.forEach((grp) => {
      const g = el("div", "gs-palgroup");
      g.appendChild(el("div", "gs-palgroup-t", esc(grp.group)));
      const row = el("div", "gs-palrow");
      grp.items.forEach((item) => row.appendChild(paletteItem(item)));
      g.appendChild(row);
      dock.appendChild(g);
    });
  }
  function paletteItem(item) {
    const card = el("div", "gs-pal");
    card.title = item.cap;
    const fig = el("div", "gs-pal-fig");
    card.appendChild(fig);
    card.appendChild(el("div", "gs-pal-cap", esc(item.cap)));
    renderThumb(fig, item);
    bindPaletteDrag(card, item);
    return card;
  }
  function renderThumb(fig, item) {
    const kit = KIT[item.tool];
    if (kit && window.VelaWidgets && window.VelaWidgets[kit.key]) {
      // ווידג'ט: הוויזואליה האמיתית, מוקטנת
      let html = "";
      try { html = window.VelaWidgets[kit.key](item.sample || {}); } catch (e) {}
      const s = Math.min(88 / kit.vw, 60 / kit.vh);
      const f = widgetFrame(html, "thumb");
      f.removeAttribute("data-wid");
      f.style.cssText = `position:absolute;top:50%;left:50%;width:${kit.vw}px;height:${kit.vh}px;transform:translate(-50%,-50%) scale(${s});border:0;pointer-events:none;`;
      fig.appendChild(f);
      return;
    }
    // אלמנט-קנבס: מציירים אותו באמת על לוח זעיר. התצוגה מחושבת ידנית —
    // fitView/‏setView נועלים ל-minScale ול-clamp של לוח-ילד, וזה חותך תמונות-ממוזערות.
    const canvas = document.createElement("canvas");
    fig.appendChild(canvas);
    requestAnimationFrame(() => {
      try {
        const b = new window.VelaBoard(canvas, { fit: "fill", background: "blank", mode: "idle", pan: false, zoom: false });
        const input = deep(item.thumb || item.sample || {});
        centerInput(item.tool, input, Math.round(b.W / 2), Math.round(b.H / 2));
        b.tool(item.tool, input);
        const bb = b._contentBBox && b._contentBBox();
        if (bb && isFinite(bb.minX)) {
          const pad = 6, bw = bb.maxX - bb.minX + pad * 2, bh = bb.maxY - bb.minY + pad * 2;
          const s = Math.min(b.W / Math.max(1, bw), b.H / Math.max(1, bh));
          b.view = { x: b.W / 2 - ((bb.minX + bb.maxX) / 2) * s, y: b.H / 2 - ((bb.minY + bb.maxY) / 2) * s, scale: s };
        }
        b.render();
      } catch (e) {}
    });
  }
  // משלים קואורדינטות לאלמנט סביב נקודה (לפלטה ולזריקה על הלוח)
  function centerInput(tool, input, x, y) {
    if (tool === "draw_line") { input.x1 = x - 80; input.y1 = y; input.x2 = x + 80; input.y2 = y; return; }
    if (tool === "draw_arrow") { input.x1 = x - 80; input.y1 = y; input.x2 = x + 80; input.y2 = y; return; }
    if (tool === "draw_polygon") { input.points = [[x, y - 62], [x + 68, y + 48], [x - 68, y + 48]]; return; }
    input.x = Math.round(x); input.y = Math.round(y);
  }

  function bindPaletteDrag(card, item) {
    let pd = null, ghost = null;
    card.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      pd = { x: e.clientX, y: e.clientY, moved: false };
      const move = (ev) => {
        if (!pd) return;
        if (!pd.moved && Math.hypot(ev.clientX - pd.x, ev.clientY - pd.y) < 7) return;
        if (!pd.moved) { pd.moved = true; ghost = makeGhost(card); document.body.appendChild(ghost); card.classList.add("is-drag"); }
        ghost.style.left = ev.clientX + "px";
        ghost.style.top = ev.clientY + "px";
        const wrap = $("#gsWrap", overlay);
        const r = wrap.getBoundingClientRect();
        const over = ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
        ghost.classList.toggle("is-over", over);
      };
      const up = (ev) => {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
        card.classList.remove("is-drag");
        if (ghost) { ghost.remove(); ghost = null; }
        if (!pd) return;
        const wasDrag = pd.moved;
        pd = null;
        const canvas = $("#gsCanvas", overlay);
        const r = canvas.getBoundingClientRect();
        if (wasDrag) {
          if (ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) {
            const w = toWorld(st.board, canvas, ev);
            addElementAt(item, w.x, w.y);
          }
        } else {
          // לחיצה בלי גרירה — מוסיף במרכז, במדורג כדי שלא ייערמו
          const n = curScreen().steps.length;
          addElementAt(item, st.board.W / 2 + ((n % 3) - 1) * 60, st.board.H * 0.42 + (n % 4) * 46);
        }
      };
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", up);
    });
  }
  function makeGhost(card) {
    const g = el("div", "gs-ghost");
    const fig = card.querySelector(".gs-pal-fig");
    const cnv = fig.querySelector("canvas");
    if (cnv) { const img = document.createElement("img"); try { img.src = cnv.toDataURL(); } catch (e) {} g.appendChild(img); }
    else { const f = fig.querySelector("iframe"); if (f) { const c = f.cloneNode(); c.srcdoc = f.srcdoc; g.appendChild(c); } }
    g.appendChild(el("span", "gs-ghost-cap", card.querySelector(".gs-pal-cap").textContent));
    return g;
  }

  function addElementAt(item, wx, wy) {
    const input = deep(item.sample || {});
    const kit = KIT[item.tool];
    if (kit) {
      const w = input.w || kit.vw;
      const h = Math.round(w / (kit.vw / kit.vh));
      input.x = Math.round(wx - w / 2);
      input.y = Math.round(wy - h / 2);
      input.exact = true;
    } else {
      centerInput(item.tool, input, Math.round(wx), Math.round(wy));
      if (item.tool === "draw_exercise") input.kind = /^-?\d+([.,]\d+)?$/.test(String(input.answer || "").trim()) ? "number" : "text";
    }
    const step = { name: item.tool, input, ref: null };
    step.ref = runStep(st.board, step);
    curScreen().steps.push(step);
    st.dirty = true;
    st.board.render();
    if (step.ref) select(step.ref.kind === "g" ? { kind: "g", id: step.ref.id, gid: step.ref.gid } : { kind: step.ref.kind, id: step.ref.id });
  }

  /* ══════════════ קליק-ימני: חלונית הגדרות חיה ══════════════ */
  function closePop() { if (pop) { pop.remove(); pop = null; document.removeEventListener("pointerdown", popOutside, true); } }
  function popOutside(e) { if (pop && !pop.contains(e.target)) closePop(); }

  function openPopFor(sel, cx, cy) {
    closePop();
    const step = findStep(sel);
    if (!step) return;
    const fields = FIELDS[step.name] || [];
    pop = el("div", "gs-pop");
    const cap = capFor(step.name);
    pop.appendChild(el("div", "gs-pop-t", esc(cap)));

    // גודל — לכל דבר (המחוון חי: רואים את השינוי תוך-כדי)
    const sizeRow = el("div", "gs-field");
    sizeRow.appendChild(el("label", null, "גודל"));
    const range = document.createElement("input");
    range.type = "range"; range.min = "40"; range.max = "250"; range.className = "gs-range";
    range.value = String(Math.round(currentScalePct(sel, step)));
    sizeRow.appendChild(range);
    pop.appendChild(sizeRow);
    range.addEventListener("input", () => applyScalePct(sel, step, +range.value));
    range.addEventListener("change", () => commitScale(sel, step));

    fields.forEach((f) => {
      const row = el("div", "gs-field");
      row.appendChild(el("label", null, esc(f.l)));
      if (f.t === "int") {
        const inp = document.createElement("input");
        inp.type = "number"; inp.min = f.min; inp.max = f.max;
        inp.value = step.input[f.k] != null ? step.input[f.k] : "";
        inp.addEventListener("change", () => { step.input[f.k] = cnum(inp.value, f.min, f.max, f.min); rerunStep(step, sel); });
        row.appendChild(inp);
      } else if (f.t === "text") {
        const inp = document.createElement("input");
        inp.type = "text"; if (f.max) inp.maxLength = f.max;
        inp.value = step.input[f.k] != null ? step.input[f.k] : "";
        inp.addEventListener("change", () => {
          step.input[f.k] = inp.value;
          if (step.name === "draw_exercise" && f.k === "answer") step.input.kind = /^-?\d+([.,]\d+)?$/.test(inp.value.trim()) ? "number" : "text";
          rerunStep(step, sel);
        });
        row.appendChild(inp);
      } else if (f.t === "parts") {
        const inp = document.createElement("input");
        inp.type = "text";
        inp.value = (step.input.parts || []).map((p) => p.value).join(",");
        inp.addEventListener("change", () => {
          step.input.parts = inp.value.split(",").map((v) => ({ value: +v.trim() || 0 })).filter((p) => p.value > 0).slice(0, 8);
          rerunStep(step, sel);
        });
        row.appendChild(inp);
      } else if (f.t === "choice") {
        const box = el("div", "gs-choices");
        f.opts.forEach(([v, l]) => {
          const b = el("button", "gs-choice" + (String(step.input[f.k]) === v ? " is-on" : ""), esc(l));
          b.addEventListener("click", () => { step.input[f.k] = v; rerunStep(step, sel); box.querySelectorAll(".gs-choice").forEach((x) => x.classList.remove("is-on")); b.classList.add("is-on"); });
          box.appendChild(b);
        });
        row.appendChild(box);
      } else if (f.t === "color") {
        const box = el("div", "gs-swatches");
        COLOR_CHOICES.forEach(([v, show]) => {
          const b = el("button", "gs-swatch" + ((step.input.color || "") === v ? " is-on" : ""));
          b.style.background = show;
          b.addEventListener("click", () => { if (v) step.input.color = v; else delete step.input.color; rerunStep(step, sel); box.querySelectorAll(".gs-swatch").forEach((x) => x.classList.remove("is-on")); b.classList.add("is-on"); });
          box.appendChild(b);
        });
        row.appendChild(box);
      }
      pop.appendChild(row);
    });

    const btns = el("div", "gs-popbtns");
    const dup = el("button", "gs-popbtn", "⧉ שכפול");
    dup.addEventListener("click", () => duplicateStep(step));
    const del = el("button", "gs-popbtn gs-popbtn--del", "🗑 מחיקה");
    del.addEventListener("click", () => { st.sel = sel; deleteSelected(); });
    btns.appendChild(dup); btns.appendChild(del);
    pop.appendChild(btns);

    document.body.appendChild(pop);
    const pw = pop.offsetWidth, phh = pop.offsetHeight;
    pop.style.left = Math.max(10, Math.min(window.innerWidth - pw - 10, cx - pw / 2)) + "px";
    pop.style.top = Math.max(10, Math.min(window.innerHeight - phh - 10, cy + 14)) + "px";
    setTimeout(() => document.addEventListener("pointerdown", popOutside, true), 0);
  }
  function capFor(tool) {
    for (const grp of PALETTE) for (const it of grp.items) if (it.tool === tool) return it.cap;
    return tool;
  }

  /* מחוון-הגודל: חי על הלוח, נכתב לקלט רק בסיום */
  function currentScalePct(sel, step) {
    const b = st.board;
    if (sel.kind === "w") { const wd = b.widgets.find((x) => x.id === sel.id); const kit = KIT[step.name]; return wd && kit ? (wd.w / kit.vw) * 100 : 100; }
    if (sel.kind === "e") { const a = b._exById(sel.id); return ((a && a.scale) || 1) * 100; }
    if (sel.kind === "g") { const o = b.objects.find((x) => step.ref && x.gid === step.ref.gid); return ((o && o._k) || 1) * 100; }
    return 100;
  }
  function applyScalePct(sel, step, pct) {
    const b = st.board, f = pct / 100;
    if (sel.kind === "w") { const kit = KIT[step.name]; if (kit) b.setWidgetSize(sel.id, Math.round(kit.vw * f)); }
    else if (sel.kind === "e") { const a = b._exById(sel.id); if (a) { a.scale = cnum(f, 0.4, 3, 1); b.render(); } }
    else if (sel.kind === "g" && step.ref) {
      ensureGroupAnchor(step);
      const k = cnum(f, 0.35, 3, 1);
      b.objects.forEach((o) => { if (o.gid === step.ref.gid) o._k = k; });
      b.render();
    }
    st.dirty = true;
  }
  function commitScale(sel, step) {
    const b = st.board;
    if (sel.kind === "w") { const wd = b.widgets.find((x) => x.id === sel.id); if (wd) { step.input.w = wd.w; step.input.h = wd.h; } }
    else if (sel.kind === "e") { const a = b._exById(sel.id); if (a) step.input.scale = Math.round(a.scale * 100) / 100; }
    else if (sel.kind === "g" && step.ref) { const o = b.objects.find((x) => x.gid === step.ref.gid); if (o && o._k) step.input.scale = Math.round(o._k * 100) / 100; }
  }

  // הרצה-מחדש של צעד במקומו (אחרי שינוי שדה) — שומר מיקום, בוחר מחדש, מעדכן ווידג'ט
  function rerunStep(step, sel) {
    syncScreen();
    const b = st.board;
    if (step.ref) {
      if (step.ref.kind === "w") {
        const wrap = $("#gsWrap", overlay);
        const f = wrap && wrap.querySelector(`iframe[data-wid="${step.ref.id}"]`);
        if (f) f.remove(); // ה-iframe ייבנה מחדש עם התוכן החדש
        const ov = wrap && wrap.querySelector(`.gs-w[data-id="${step.ref.id}"]`);
        if (ov) ov.remove();
      }
      b.tool("remove_item", { id: step.ref.id });
    }
    step.ref = runStep(b, step);
    st.dirty = true;
    b.render();
    if (step.ref) {
      const ns = step.ref.kind === "g" ? { kind: "g", id: step.ref.id, gid: step.ref.gid } : { kind: step.ref.kind, id: step.ref.id };
      st.sel = ns;
      if (sel) { sel.kind = ns.kind; sel.id = ns.id; sel.gid = ns.gid; }
      drawSelection(); layoutWidgetLayer();
    }
  }
  function duplicateStep(orig) {
    syncScreen();
    const step = { name: orig.name, input: deep(orig.input), ref: null };
    if (step.input.x != null) step.input.x += 34;
    if (step.input.y != null) step.input.y += 34;
    if (step.input.x1 != null) { step.input.x1 += 34; step.input.x2 += 34; step.input.y1 += 34; step.input.y2 += 34; }
    if (step.input.points) step.input.points = step.input.points.map((p) => [+p[0] + 34, +p[1] + 34]);
    step.ref = runStep(st.board, step);
    curScreen().steps.push(step);
    st.dirty = true;
    st.board.render();
    closePop();
    if (step.ref) select(step.ref.kind === "g" ? { kind: "g", id: step.ref.id, gid: step.ref.gid } : { kind: step.ref.kind, id: step.ref.id });
  }

  /* ── עריכת-טקסט במקום (בלי prompt) ── */
  function inlineTextEdit(objId) {
    const b = st.board, o = b._objById(objId);
    if (!o) return;
    const step = findStep({ kind: "g", id: objId, gid: o.gid });
    const bb = b._objBBox(o);
    if (!bb) return;
    const wrap = $("#gsWrap", overlay), wRect = wrap.getBoundingClientRect();
    const p1 = b.worldToScreen(bb.minX, bb.minY), p2 = b.worldToScreen(bb.maxX, bb.maxY);
    const inp = document.createElement("input");
    inp.type = "text"; inp.className = "gs-inline"; inp.maxLength = 40;
    inp.value = o.text || "";
    const fs = Math.max(14, (o.size || 32) * (o._k || 1) * b.getView().scale);
    inp.style.cssText = `left:${p1.x - wRect.left - 8}px;top:${(p1.y + p2.y) / 2 - wRect.top - fs * 0.8}px;min-width:${Math.max(120, p2.x - p1.x + 40)}px;font-size:${fs}px;`;
    wrap.appendChild(inp);
    inp.focus(); inp.select();
    let done = false;
    const commit = (ok) => {
      if (done) return; done = true;
      if (ok && step) { o.text = inp.value.slice(0, 40); step.input.text = o.text; st.dirty = true; }
      inp.remove(); b.render();
    };
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") commit(true);
      if (e.key === "Escape") commit(false);
      e.stopPropagation();
    });
    inp.addEventListener("blur", () => commit(true));
  }

  /* ══════════════ סנכרון ושמירה ══════════════ */
  function syncScreen() {
    if (!st || !st.cur || !st.board) return;
    const b = st.board;
    curScreen().steps.forEach((s) => {
      if (!s.ref) return;
      if (s.ref.kind === "e") {
        const a = b._exById(s.ref.id);
        if (a) { s.input.x = Math.round(a.x); s.input.y = Math.round(a.y); if (a.scale && a.scale !== 1) s.input.scale = Math.round(a.scale * 100) / 100; }
      } else if (s.ref.kind === "w") {
        const w = b.widgets.find((x) => x.id === s.ref.id);
        if (w) { s.input.x = Math.round(w.x); s.input.y = Math.round(w.y); s.input.w = Math.round(w.w); s.input.h = Math.round(w.h); s.input.exact = true; }
      } else if (s.ref.kind === "g") {
        const o = s.ref.gid ? b.objects.find((x) => x.gid === s.ref.gid) : b._objById(s.ref.id);
        if (!o) return;
        if (s.name === "draw_line" || s.name === "draw_arrow") {
          s.input.x1 = Math.round(o.x1); s.input.y1 = Math.round(o.y1); s.input.x2 = Math.round(o.x2); s.input.y2 = Math.round(o.y2);
        } else if (s.name === "draw_polygon" && o.points) {
          s.input.points = o.points.map((p) => [Math.round(p.x), Math.round(p.y)]);
        } else if (o.x != null && o.y != null) {
          s.input.x = Math.round(o.x); s.input.y = Math.round(o.y);
        }
        if (o._k && o._k !== 1) s.input.scale = Math.round(o._k * 100) / 100;
      }
    });
  }
  async function saveAll() {
    syncScreen();
    const phases = {};
    PHASES.forEach((ph) => {
      const scrs = st.phases[ph.key]
        .map((s) => ({ reply: s.reply || "", toolCalls: s.steps.map((x) => ({ name: x.name, input: x.input })) }))
        .filter((s) => s.reply.trim() || s.toolCalls.length);
      if (scrs.length) phases[ph.key] = scrs.length === 1 ? scrs[0] : scrs;
    });
    let out = null;
    try {
      const res = await fetch("/api/admin/golden/save", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ topic: st.topic, lesson: st.lesson, data: { title: st.title, phases } }),
      });
      out = await res.json().catch(() => null);
    } catch (e) {}
    if (out && out.ok) { st.dirty = false; toast("השיעור נשמר — זה מה שהילדים יקבלו ✓"); }
    else toast("השמירה נכשלה" + (out && out.error ? ": " + out.error : ""), true);
  }
  function toast(msg, bad) {
    if (!overlay) return;
    overlay.querySelectorAll(".gs-toast").forEach((t) => t.remove());
    const t = el("div", "gs-toast" + (bad ? " gs-toast--bad" : ""), esc(msg));
    overlay.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }
  function toastGlobal(msg) {
    const t = el("div", "gs-toast gs-toast--bad", esc(msg));
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }

  window.VelaGoldenEditor = { open };
})();
