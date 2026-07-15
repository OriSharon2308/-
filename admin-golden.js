/* eslint-disable no-console */

/**
 * ────────────────────────────────────────────────────────────────────────
 *  סטודיו שיעורי-הזהב — עריכה ויזואלית מלאה של כל מסך בשיעור
 * ────────────────────────────────────────────────────────────────────────
 *  הרעיון: אותו מנוע-לוח של הילד (VelaBoard) משמש כמשטח-עיצוב לאורי:
 *  סקירה עם תצוגה-מקדימה חיה לכל שלב → לחיצה מגדילה לעורך מסך-מלא →
 *  פלטת-אלמנטים, גרירה חופשית, עריכת-טקסט, מסכי-הוראה מרובים → שמירה
 *  ל-golden/<נושא>#<שיעור>.json. מה שרואים כאן = מה שהילד יקבל, 1:1.
 */
(function () {
  "use strict";
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const PHASES = [
    { key: "instruct", label: "הוראה", hint: "ההסבר — אפשר כמה מסכים (✓ בין מסך למסך)", multi: true },
    { key: "guided", label: "תרגול מודרך", hint: "תרגיל אחד + עזר צמוד", multi: false },
    { key: "independent", label: "תרגול עצמאי", hint: "2–3 תרגילים לבד", multi: false },
  ];

  // פלטת האלמנטים: [תווית, כלי, ברירות-מחדל (x,y יושלמו למרכז), שדות-לשאול]
  const PALETTE = [
    ["📝 טקסט", "write_text", { size: 34 }, [["text", "מה לכתוב?"], ["size", "גודל (למשל 34)", "34"]]],
    ["❓ תרגיל + תשובה", "draw_exercise", {}, [["text", "טקסט התרגיל (למשל: 4 + 3 =)"], ["answer", "התשובה הנכונה"]]],
    ["🔢 בלוקי בסיס-10", "draw_base_ten", { label: "" }, [["value", "איזה מספר? (1–999)", "34"]]],
    ["📏 ציר מספרים", "draw_number_line", { step: 1 }, [["from", "מאיזה מספר?", "0"], ["to", "עד איזה מספר?", "10"]]],
    ["🔵 מערך נקודות", "draw_array", { label: "" }, [["rows", "שורות", "3"], ["cols", "עמודות", "4"]]],
    ["🍫 מוט שבר", "draw_fraction_bar", { label: "" }, [["parts", "חלקים (מכנה)", "4"], ["shaded", "צבועים (מונה)", "3"]]],
    ["🕒 שעון (סטטי)", "draw_clock", { minute: 0, r: 80 }, [["hour", "איזו שעה?", "3"]]],
    ["🔟 לוח-עשר", "ten_frame", { cells: 10, perRow: 5, w: 380, h: 250 }, []],
    ["🟩 מערך כפל (גרירה)", "mult_array", { maxRows: 10, maxCols: 10, w: 380, h: 260 }, []],
    ["✖️ לוח הכפל", "mult_table", { max: 10, hide: 6, w: 380, h: 380 }, []],
    ["💯 לוח מאה", "hundred_chart", { w: 340, h: 340 }, [["skip", "לסמן כפולות של (0=בלי)", "0"]]],
    ["📐 סרגל אינטראקטיבי", "number_line_interactive", { step: 1, w: 400, h: 200 }, [["from", "מ-", "0"], ["to", "עד", "10"]]],
    ["⏰ שעון (מחוגים)", "clock_interactive", { minute: 0, w: 320, h: 320 }, [["hour", "שעה התחלתית", "3"]]],
    ["🪙 כסף ₪", "money_coins", { w: 400, h: 320 }, [["target", "סכום-יעד (0=חופשי)", "0"]]],
    ["🍎 ספירת אובייקטים", "count_objects", { op: "+", item: "apple", w: 420, h: 260 }, [["left", "בקבוצה הראשונה", "3"], ["right", "בשנייה", "2"]]],
    ["🍕 שבר לחיץ", "interactive_fraction", { shape: "circle", w: 360, h: 240 }, [["parts", "חלקים", "4"], ["shaded", "צבועים בהתחלה", "0"]]],
  ];
  const WIDGET_TOOLS = { ten_frame: 1, mult_array: 1, mult_table: 1, hundred_chart: 1, number_line_interactive: 1, clock_interactive: 1, money_coins: 1, count_objects: 1, interactive_fraction: 1, base_ten_builder: 1 };

  /* ── מצב העורך ── */
  let st = null; // {topic, lesson, title, phases:{key:[{reply, steps:[{name,input,ref}]}]}, cur:{phase,screen}, board, sel}
  let overlay = null;

  function normScreens(raw) {
    const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return arr.map((s) => ({ reply: String(s.reply || ""), steps: (s.toolCalls || []).map((t) => ({ name: t.name, input: JSON.parse(JSON.stringify(t.input || {})), ref: null })) }));
  }

  async function open(topic, lesson, title) {
    const res = await fetch(`/api/admin/golden?topic=${encodeURIComponent(topic)}&lesson=${lesson}`);
    const data = await res.json();
    if (!data.ok) { alert("שגיאה בטעינת שיעור-הזהב"); return; }
    const g = data.golden;
    st = {
      topic, lesson, title: g.title || title || "",
      phases: {
        instruct: normScreens(g.phases.instruct).length ? normScreens(g.phases.instruct) : [{ reply: "", steps: [] }],
        guided: normScreens(g.phases.guided).length ? normScreens(g.phases.guided) : [{ reply: "", steps: [] }],
        independent: normScreens(g.phases.independent).length ? normScreens(g.phases.independent) : [{ reply: "", steps: [] }],
      },
      cur: null, board: null, sel: null, dirty: false,
    };
    buildOverlay();
    renderOverview();
  }

  function buildOverlay() {
    if (overlay) overlay.remove();
    overlay = document.createElement("div");
    overlay.className = "gstudio";
    document.body.appendChild(overlay);
  }
  function closeStudio() {
    if (st && st.dirty && !confirm("יש שינויים שלא נשמרו — לצאת בכל זאת?")) return;
    cleanupBoard();
    if (overlay) { overlay.remove(); overlay = null; }
    st = null;
  }
  function cleanupBoard() {
    document.querySelectorAll(".gwidget, .gsel").forEach((el) => el.remove());
    if (st) st.board = null;
  }

  /* ── מסך הסקירה: תצוגה-מקדימה חיה לכל שלב; לחיצה מגדילה לעורך ── */
  function renderOverview() {
    cleanupBoard();
    st.cur = null;
    overlay.innerHTML = `
      <div class="gstudio__bar">
        <button class="gbtn gbtn--ghost" id="gClose">✕ סגירה</button>
        <div class="gstudio__title">🏆 סטודיו שיעור-הזהב · <b>${esc(st.topic)}</b> · שיעור ${st.lesson}${st.title ? ` — ${esc(st.title)}` : ""}</div>
        <span class="gspacer"></span>
        <button class="gbtn gbtn--primary" id="gSaveAll">💾 שמירת השיעור</button>
      </div>
      <div class="gstudio__hint">לחיצה על תצוגה-מקדימה פותחת את העורך המלא — שם גוררים אלמנטים, מוסיפים מהפלטה, ועורכים את דברי-המורה. מה שרואים = מה שהילד יקבל.</div>
      <div class="gstudio__cards" id="gCards"></div>`;
    $("#gClose", overlay).addEventListener("click", closeStudio);
    $("#gSaveAll", overlay).addEventListener("click", saveAll);
    const cards = $("#gCards", overlay);
    PHASES.forEach((ph) => {
      st.phases[ph.key].forEach((scr, idx) => {
        const card = document.createElement("div");
        card.className = "gcard";
        card.innerHTML = `
          <div class="gcard__head">
            <b>${ph.label}${ph.multi && st.phases[ph.key].length > 1 ? ` · מסך ${idx + 1}` : ""}</b>
            <span class="gcard__hint">${esc(ph.hint)}</span>
            ${ph.multi && st.phases[ph.key].length > 1 ? `<button class="gbtn gbtn--tiny" data-del-screen="1">🗑</button>` : ""}
          </div>
          <div class="gcard__preview"><canvas></canvas><div class="gcard__zoom">🔍 לעריכה</div></div>
          <div class="gcard__reply">${esc((scr.reply || "(עדיין אין טקסט למורה)").slice(0, 120))}</div>`;
        cards.appendChild(card);
        card.querySelector(".gcard__preview").addEventListener("click", () => openEditor(ph.key, idx));
        const delBtn = card.querySelector("[data-del-screen]");
        if (delBtn) delBtn.addEventListener("click", (e) => { e.stopPropagation(); if (confirm("למחוק את המסך הזה?")) { st.phases[ph.key].splice(idx, 1); st.dirty = true; renderOverview(); } });
        drawPreview(card.querySelector("canvas"), scr);
      });
      if (ph.multi) {
        const add = document.createElement("button");
        add.className = "gcard gcard--add";
        add.textContent = "+ מסך הסבר נוסף";
        add.addEventListener("click", () => { st.phases[ph.key].push({ reply: "", steps: [] }); st.dirty = true; renderOverview(); });
        cards.appendChild(add);
      }
    });
  }

  // תצוגה-מקדימה: לוח אמיתי קטן (קריאה בלבד) + מסגרות-ווידג'טים מצוירות על הקנבס
  function drawPreview(canvas, scr) {
    const b = new window.VelaBoard(canvas, { fit: "fill", background: "grid", grid: 42, mode: "idle", pan: false, zoom: false });
    scr.steps.forEach((s) => { try { b.tool(s.name, s.input); } catch (e) {} });
    const bb = b._contentBBox && b._contentBBox();
    if (bb) b.fitView(bb, 46, 0);
    // מסגרות-ווידג'טים על הקנבס (בתצוגה הקטנה אין iframes — רק מתאר + שם)
    b.onRender(() => {
      const ctx = b.ctx, dpr = window.devicePixelRatio || 1;
      ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const rect = canvas.getBoundingClientRect();
      (b.getWidgetRects() || []).forEach((r) => {
        const x = r.left - rect.left, y = r.top - rect.top, w = r.w * r.scale, h = r.h * r.scale;
        ctx.strokeStyle = "rgba(13,148,136,.75)"; ctx.setLineDash([6, 5]); ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, w, h); ctx.setLineDash([]);
        ctx.fillStyle = "rgba(13,148,136,.9)"; ctx.font = "600 11px Assistant, sans-serif"; ctx.textAlign = "center";
        ctx.fillText(r.title || "כלי", x + w / 2, y + h / 2);
      });
      ctx.restore();
    });
    b.render();
  }

  /* ── העורך המלא של מסך אחד ── */
  function openEditor(phaseKey, screenIdx) {
    cleanupBoard();
    st.cur = { phase: phaseKey, screen: screenIdx };
    const ph = PHASES.find((p) => p.key === phaseKey);
    const scr = st.phases[phaseKey][screenIdx];
    overlay.innerHTML = `
      <div class="gstudio__bar">
        <button class="gbtn gbtn--ghost" id="gBack">→ לסקירה</button>
        <div class="gstudio__title">🖊 ${ph.label}${ph.multi && st.phases[phaseKey].length > 1 ? ` · מסך ${screenIdx + 1}/${st.phases[phaseKey].length}` : ""} · ${esc(st.topic)} #${st.lesson}</div>
        <span class="gspacer"></span>
        <button class="gbtn" id="gDelSel" disabled>🗑 מחק נבחר</button>
        <button class="gbtn" id="gClear">נקה מסך</button>
        <button class="gbtn gbtn--primary" id="gSave">💾 שמירה</button>
      </div>
      <div class="gstudio__body">
        <div class="gside">
          <label class="gside__label">💬 מה המורה אומר במסך הזה (מוכן/ה מוטה אוטומטית)</label>
          <textarea id="gReply" class="gside__reply" placeholder="הטקסט שהמורה יגיד לילד…">${esc(scr.reply)}</textarea>
          <label class="gside__label">➕ הוספת אלמנט ללוח</label>
          <div class="gpalette" id="gPalette"></div>
          <div class="gside__tip">גרירה: תפסו כל אלמנט והזיזו. טקסט — לחיצה-כפולה לעריכה. תרגיל נגרר חופשי (מיקום מדויק נשמר).</div>
        </div>
        <div class="gboardWrap"><canvas id="gCanvas"></canvas></div>
      </div>`;
    $("#gBack", overlay).addEventListener("click", () => { syncScreen(); renderOverview(); });
    $("#gSave", overlay).addEventListener("click", saveAll);
    $("#gClear", overlay).addEventListener("click", () => { if (confirm("לנקות את כל המסך?")) { scr.steps = []; rebuildBoard(); st.dirty = true; } });
    $("#gDelSel", overlay).addEventListener("click", deleteSelected);
    $("#gReply", overlay).addEventListener("input", (e) => { scr.reply = e.target.value; st.dirty = true; });

    const pal = $("#gPalette", overlay);
    PALETTE.forEach(([label, tool, defaults, asks]) => {
      const btn = document.createElement("button");
      btn.className = "gpal";
      btn.textContent = label;
      btn.addEventListener("click", () => addElement(tool, defaults, asks));
      pal.appendChild(btn);
    });
    rebuildBoard();
    document.addEventListener("keydown", onKey);
  }
  function onKey(e) {
    if (!st || !st.cur) return;
    if ((e.key === "Delete" || e.key === "Backspace") && st.sel && document.activeElement.tagName !== "TEXTAREA" && document.activeElement.tagName !== "INPUT") deleteSelected();
    if (e.key === "Escape") { syncScreen(); renderOverview(); }
  }

  function curScreen() { return st.phases[st.cur.phase][st.cur.screen]; }

  // בונה את הלוח מחדש מהצעדים של המסך הנוכחי, ורושם ref לכל צעד (לגרירה/מחיקה/שמירה)
  function rebuildBoard() {
    document.querySelectorAll(".gwidget, .gsel").forEach((el) => el.remove());
    const canvas = $("#gCanvas", overlay);
    const b = new window.VelaBoard(canvas, { fit: "fill", background: "grid", grid: 42, mode: "idle", pan: false, zoom: true });
    st.board = b; st.sel = null; updateDelBtn();
    curScreen().steps.forEach((s) => { s.ref = runStep(b, s); });
    placeWidgets();
    b.onWidgets(placeWidgets);
    b.onRender(placeWidgets);
    bindDrag(canvas, b);
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

  /* ── שכבת הווידג'טים: כרטיסים-דמה נגררים (בלי iframes — עיצוב, לא הפעלה) ── */
  function placeWidgets() {
    if (!st || !st.board) return;
    const rects = st.board.getWidgetRects() || [];
    const live = {};
    rects.forEach((r) => {
      live[r.id] = 1;
      let el = document.querySelector(`.gwidget[data-id="${r.id}"]`);
      if (!el) {
        el = document.createElement("div");
        el.className = "gwidget";
        el.dataset.id = r.id;
        el.innerHTML = `<span class="gwidget__ttl">${esc(r.title || "כלי")}</span>`;
        overlay.appendChild(el);
        bindWidgetDrag(el, r.id);
      }
      el.style.left = r.left + "px"; el.style.top = r.top + "px";
      el.style.width = r.w * r.scale + "px"; el.style.height = r.h * r.scale + "px";
      el.classList.toggle("is-sel", !!(st.sel && st.sel.kind === "w" && st.sel.id === r.id));
    });
    document.querySelectorAll(".gwidget").forEach((el) => { if (!live[el.dataset.id]) el.remove(); });
    drawSelection();
  }
  function bindWidgetDrag(el, id) {
    let drag = null;
    el.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      const r = (st.board.getWidgetRects() || []).find((x) => x.id === id);
      if (!r) return;
      drag = { sx: e.clientX, sy: e.clientY, wx: r.x, wy: r.y, sc: r.scale || 1 };
      select({ kind: "w", id });
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
    });
    el.addEventListener("pointermove", (e) => {
      if (!drag) return;
      st.board.setWidgetPos(id, drag.wx + (e.clientX - drag.sx) / drag.sc, drag.wy + (e.clientY - drag.sy) / drag.sc);
      st.dirty = true;
    });
    const end = () => { drag = null; };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
  }

  /* ── גרירת אובייקטים/בחירה על הקנבס (תרגילים נגררים ע"י הלוח עצמו) ── */
  function toWorld(b, canvas, e) {
    const rect = canvas.getBoundingClientRect();
    const v = b.getView();
    return { x: (e.clientX - rect.left - v.x) / v.scale, y: (e.clientY - rect.top - v.y) / v.scale };
  }
  function bindDrag(canvas, b) {
    let drag = null;
    canvas.addEventListener("pointerdown", (e) => {
      const w = toWorld(b, canvas, e);
      // תרגיל? נותנים ללוח לטפל (גרירה מובנית) — רק מסמנים בחירה
      const ex = b._exAt && b._exAt(w);
      if (ex) { select({ kind: "e", id: ex.id }); st.dirty = true; return; }
      // קבוצת-ציור: מהאחרון (עליון) לראשון
      const L = b.getLayout().filter((it) => it.kind !== "widget" && it.kind !== "exercise");
      for (let i = L.length - 1; i >= 0; i--) {
        const it = L[i];
        if (w.x >= it.x && w.x <= it.x + it.w && w.y >= it.y && w.y <= it.y + it.h) {
          const obj = b._objById(it.id);
          drag = { gid: obj && obj.gid, id: it.id, last: w };
          select({ kind: "g", id: it.id, gid: drag.gid });
          e.preventDefault(); e.stopPropagation();
          return;
        }
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
    canvas.addEventListener("dblclick", (e) => {
      const w = toWorld(b, canvas, e);
      const L = b.getLayout().filter((it) => it.kind === "text");
      for (let i = L.length - 1; i >= 0; i--) {
        const it = L[i];
        if (w.x >= it.x && w.x <= it.x + it.w && w.y >= it.y && w.y <= it.y + it.h) {
          const o = b._objById(it.id);
          const nt = prompt("עריכת הטקסט:", o ? o.text : "");
          if (nt != null && o) {
            o.text = String(nt).slice(0, 60);
            const step = findStep({ kind: "g", id: it.id, gid: o.gid });
            if (step) step.input.text = o.text;
            st.dirty = true; b.render();
          }
          return;
        }
      }
    });
  }

  /* ── בחירה + מחיקה ── */
  function select(sel) { st.sel = sel; updateDelBtn(); drawSelection(); placeWidgets(); }
  function updateDelBtn() { const btn = $("#gDelSel", overlay); if (btn) btn.disabled = !st.sel; }
  function drawSelection() {
    let box = document.querySelector(".gsel");
    if (!st || !st.sel || !st.board) { if (box) box.remove(); return; }
    let bb = null;
    if (st.sel.kind === "e") { const a = st.board._exById(st.sel.id); if (a) bb = st.board._exBBox(a); }
    else if (st.sel.kind === "g") bb = st.sel.gid ? st.board._groupBBox(st.sel.gid) : (st.board._objById(st.sel.id) && st.board._objBBox(st.board._objById(st.sel.id)));
    else if (st.sel.kind === "w") { if (box) box.remove(); return; } // לווידג'ט יש הדגשה משלו
    if (!bb || !isFinite(bb.minX)) { if (box) box.remove(); return; }
    const p1 = st.board.worldToScreen(bb.minX, bb.minY), p2 = st.board.worldToScreen(bb.maxX, bb.maxY);
    if (!box) { box = document.createElement("div"); box.className = "gsel"; overlay.appendChild(box); }
    box.style.left = p1.x - 6 + "px"; box.style.top = p1.y - 6 + "px";
    box.style.width = p2.x - p1.x + 12 + "px"; box.style.height = p2.y - p1.y + 12 + "px";
  }
  function findStep(sel) {
    return curScreen().steps.find((s) => s.ref && (
      (sel.kind === "e" && s.ref.kind === "e" && s.ref.id === sel.id) ||
      (sel.kind === "w" && s.ref.kind === "w" && s.ref.id === sel.id) ||
      (sel.kind === "g" && s.ref.kind === "g" && (s.ref.gid ? s.ref.gid === sel.gid : s.ref.id === sel.id))
    ));
  }
  function deleteSelected() {
    if (!st.sel) return;
    const step = findStep(st.sel);
    const rmId = st.sel.kind === "g" ? st.sel.id : st.sel.id;
    st.board.tool("remove_item", { id: rmId });
    if (step) curScreen().steps = curScreen().steps.filter((s) => s !== step);
    st.dirty = true;
    select(null);
    st.board.render();
  }

  /* ── הוספת אלמנט מהפלטה ── */
  function addElement(tool, defaults, asks) {
    const input = JSON.parse(JSON.stringify(defaults || {}));
    for (const [field, q, dflt] of asks || []) {
      const v = prompt(q, dflt || "");
      if (v == null) return; // ביטול
      input[field] = /^-?\d+(\.\d+)?$/.test(v.trim()) ? +v.trim() : v.trim();
    }
    if (tool === "draw_exercise") {
      input.kind = /^-?\d+([.,]\d+)?$/.test(String(input.answer || "").trim()) ? "number" : "text";
      input.x = Math.round(st.board.W / 2); input.y = 160 + curScreen().steps.length * 30;
    } else if (!WIDGET_TOOLS[tool]) {
      if (input.x == null) input.x = Math.round(st.board.W / 2);
      if (input.y == null) input.y = Math.round(st.board.H / 2);
      if (tool === "draw_number_line") { input.x = Math.round(st.board.W / 2) - 220; }
    } else {
      input.x = Math.round((st.board.W - (input.w || 380)) / 2);
      input.y = Math.round((st.board.H - (input.h || 260)) / 2);
    }
    const step = { name: tool, input, ref: null };
    step.ref = runStep(st.board, step);
    curScreen().steps.push(step);
    st.dirty = true;
    st.board.render();
    if (step.ref) select(step.ref.kind === "g" ? { kind: "g", id: step.ref.id, gid: step.ref.gid } : { kind: step.ref.kind, id: step.ref.id });
  }

  /* ── סנכרון מיקומים חיים → steps, וסריאליזציה לשמירה ── */
  function syncScreen() {
    if (!st || !st.cur || !st.board) return;
    const b = st.board;
    curScreen().steps.forEach((s) => {
      if (!s.ref) return;
      if (s.ref.kind === "e") {
        const a = b._exById(s.ref.id);
        if (a) { s.input.x = Math.round(a.x); s.input.y = Math.round(a.y); }
      } else if (s.ref.kind === "w") {
        const w = b.widgets.find((x) => x.id === s.ref.id);
        if (w) { s.input.x = Math.round(w.x); s.input.y = Math.round(w.y); s.input.w = Math.round(w.w); s.input.h = Math.round(w.h); }
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
    const res = await fetch("/api/admin/golden/save", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ topic: st.topic, lesson: st.lesson, data: { title: st.title, phases } }),
    });
    const out = await res.json().catch(() => null);
    if (out && out.ok) { st.dirty = false; toast("💾 שיעור-הזהב נשמר — זה מה שהילדים יקבלו"); }
    else alert("שמירה נכשלה: " + ((out && out.error) || res.status));
  }
  function toast(msg) {
    const t = document.createElement("div");
    t.className = "gtoast"; t.textContent = msg;
    overlay.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }

  window.VelaGoldenEditor = { open };
})();
