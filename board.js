/* eslint-disable no-var */
/**
 * ────────────────────────────────────────────────────────────────────────
 *  VelaBoard — לוח הציור המשותף של אזור הלמידה (רכיב לשימוש חוזר)
 * ────────────────────────────────────────────────────────────────────────
 *  מציירים: המורה (Claude) דרך board.tool(name,input); הילד בציור חופשי.
 *  ניווט: גרירה (יד) + זום (גלגלת/צביטה). מצבי גודל fixed/fill.
 *
 *  כלים/מצבים (setMode): 'idle' (סמן: בחירה + הזזת תצוגה), 'child' (עיפרון),
 *  'eraser' (מחק ריבוע).
 *
 *  עריכת אובייקטים (במצב 'idle'): ריחוף על קו/צורה/קשקוש → ידיות; לחיצה →
 *  בחירה (פותחת תפריט מאפיינים בעמוד); גרירת גוף → הזזה; גרירת ידית → שינוי
 *  גודל/מתיחה. API: setSelectedColor / setSelectedWidth / toggleSelectedFill /
 *  deleteSelected, ו-onSelectionChange(cb).
 */
(function (global) {
  "use strict";

  var COLORS = {
    surface: "#ffffff",
    gridLine: "rgba(13,148,136,0.14)",
    gridDot: "rgba(13,148,136,0.34)",
    teacher: "#0d9488",
    child: "#f97316",
    text: "#0f3b36",
    sel: "#0d9488",
  };
  var HANDLE_PX = 11; // גודל ידית על המסך
  var ERASER_PX = 28; // גודל ריבוע המחק על המסך
  var ERASER_CURSOR =
    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28'><rect x='2' y='2' width='24' height='24' rx='3' fill='rgba(255,255,255,0.5)' stroke='%230f3b36' stroke-width='2'/></svg>\") 14 14, crosshair";
  // מצבי ציור — כולם נשמרים כ-childStrokes (פוליגון), כך שהבחירה/עריכה עובדת עליהם.
  var DRAW_MODES = { child: 1 }; // עיפרון בלבד = ציור-בגרירה
  var TWO_CLICK_MODES = { line: 1, angle: 1, shape: 1 }; // קו/זווית/צורה = שתי לחיצות (או גרירה)
  var ALLOWED_MODES = { idle: 1, child: 1, eraser: 1, line: 1, angle: 1, shape: 1, text: 1 };

  function clamp(v, lo, hi) { v = Number(v); if (!isFinite(v)) return lo; return v < lo ? lo : v > hi ? hi : v; }
  function hypot(a, b) { return Math.sqrt(a * a + b * b); }
  function clonePts(pts) { return pts.map(function (p) { return { x: p.x, y: p.y }; }); }
  function isClosed(pts) { var n = pts.length; return n > 2 && Math.abs(pts[0].x - pts[n - 1].x) < 1e-6 && Math.abs(pts[0].y - pts[n - 1].y) < 1e-6; }
  function roundRectPath(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function hexToRgba(hex, a) {
    var h = String(hex || "").replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    if (!isFinite(n)) return "rgba(249,115,22," + a + ")";
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }

  /* ---------- גאומטריה (טהורה — נבדקת ב-Node) ---------- */
  function dist2(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
  function distToSeg(p, a, b) {
    var l2 = dist2(a.x, a.y, b.x, b.y);
    if (l2 === 0) return Math.sqrt(dist2(p.x, p.y, a.x, a.y));
    var t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return Math.sqrt(dist2(p.x, p.y, a.x + t * (b.x - a.x), a.y + t * (b.y - a.y)));
  }
  function nearPolyline(p, pts, thr) {
    if (!pts.length) return false;
    if (pts.length === 1) return Math.sqrt(dist2(p.x, p.y, pts[0].x, pts[0].y)) <= thr;
    for (var i = 1; i < pts.length; i++) if (distToSeg(p, pts[i - 1], pts[i]) <= thr) return true;
    return false;
  }
  function pointInPoly(p, pts) {
    var inside = false;
    for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      var xi = pts[i].x, yi = pts[i].y, xj = pts[j].x, yj = pts[j].y;
      if (((yi > p.y) !== (yj > p.y)) && (p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }
  function bboxOf(pts) {
    var b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    for (var i = 0; i < pts.length; i++) {
      var q = pts[i];
      if (q.x < b.minX) b.minX = q.x; if (q.y < b.minY) b.minY = q.y;
      if (q.x > b.maxX) b.maxX = q.x; if (q.y > b.maxY) b.maxY = q.y;
    }
    return b;
  }
  // מחק "נקי": מסיר רק את מה שבתוך ריבוע המחק. דוגם לאורך כל קטע (לא רק
  // קודקודים), כך שגם קו שעובר דרך הריבוע בלי נקודה באמצע נחתך נקי בדיוק בגבול.
  function eraseStroke(stroke, cx, cy, r, mkId) {
    var pts = stroke.points;
    if (!pts.length) return [];
    if (stroke.type === "text") {
      var tb = bboxOf(pts);
      var hit = !(tb.maxX < cx - r || tb.minX > cx + r || tb.maxY < cy - r || tb.minY > cy + r);
      return hit ? [] : [stroke]; // מחיקת טקסט = הכל-או-כלום
    }
    var b = bboxOf(pts), pad = (stroke.width || 5) / 2;
    // דחייה מהירה — הקו כולו מחוץ לאזור המחק
    if (b.maxX < cx - r - pad || b.minX > cx + r + pad || b.maxY < cy - r - pad || b.minY > cy + r + pad) return [stroke];
    function inside(p) { return Math.abs(p.x - cx) <= r && Math.abs(p.y - cy) <= r; }
    var step = Math.max(1, r / 2.5); // צפיפות דגימה לאורך הקו
    var runs = [], cur = [], touched = false;
    function add(p) { if (inside(p)) { touched = true; if (cur.length > 1) runs.push(cur); cur = []; } else cur.push(p); }
    if (pts.length === 1) add(pts[0]);
    else {
      for (var i = 0; i < pts.length - 1; i++) {
        var a = pts[i], c = pts[i + 1], segLen = Math.sqrt(dist2(a.x, a.y, c.x, c.y)), n = Math.max(1, Math.ceil(segLen / step));
        for (var k = 0; k < n; k++) { var t = k / n; add({ x: a.x + (c.x - a.x) * t, y: a.y + (c.y - a.y) * t }); }
      }
      add(pts[pts.length - 1]);
    }
    if (cur.length > 1) runs.push(cur);
    if (!touched) return [stroke]; // לא נגע באזור — מחזירים כמו שהוא (בלי דגימה)
    // מקטע חתוך הוא פוליגון פתוח — אסור שיירש fill (אחרת ימולא בצורה שגויה); וגם בלי kind.
    return runs.map(function (run) {
      return { who: "child", type: "stroke", points: run, color: stroke.color, width: stroke.width, fill: false, id: mkId() };
    });
  }

  // זווית בקודקוד b (ברדיאנים)
  function angleAt(a, b, c) {
    var v1x = a.x - b.x, v1y = a.y - b.y, v2x = c.x - b.x, v2y = c.y - b.y;
    var m1 = Math.sqrt(v1x * v1x + v1y * v1y), m2 = Math.sqrt(v2x * v2x + v2y * v2y);
    if (m1 === 0 || m2 === 0) return Math.PI;
    return Math.acos(Math.max(-1, Math.min(1, (v1x * v2x + v1y * v2y) / (m1 * m2))));
  }
  // פישוט פוליגון (Ramer–Douglas–Peucker) — להורדת רעש מציור-יד
  function rdp(points, eps) {
    if (points.length < 3) return points.slice();
    var dmax = 0, idx = 0, end = points.length - 1;
    for (var i = 1; i < end; i++) { var d = distToSeg(points[i], points[0], points[end]); if (d > dmax) { dmax = d; idx = i; } }
    if (dmax > eps) {
      var l = rdp(points.slice(0, idx + 1), eps), r = rdp(points.slice(idx), eps);
      return l.slice(0, -1).concat(r);
    }
    return [points[0], points[end]];
  }
  // סיווג קשקוש חופשי לפי מספר הצלעות אחרי פישוט: עיגול/משולש/מרובע/מצולע/קו/עקומה
  function classifyStroke(pts) {
    if (!pts || pts.length < 2) return { kind: "dot", corners: 0, closed: false };
    var bb = bboxOf(pts), diag = Math.sqrt(dist2(bb.minX, bb.minY, bb.maxX, bb.maxY)) || 1;
    var closed = Math.sqrt(dist2(pts[0].x, pts[0].y, pts[pts.length - 1].x, pts[pts.length - 1].y)) < 0.25 * diag;
    var simp = rdp(pts, diag * 0.07);
    var nv = closed && simp.length > 2 ? simp.length - 1 : simp.length; // צלעות (בלי נקודת הסגירה הכפולה)
    if (closed) {
      if (nv <= 2) return { kind: "circle", corners: 0, closed: true };
      if (nv === 3) return { kind: "triangle", corners: 3, closed: true };
      if (nv === 4) return { kind: "quad", corners: 4, closed: true };
      if (nv === 5 || nv === 6) return { kind: "polygon", corners: nv, closed: true };
      return { kind: "circle", corners: 0, closed: true };
    }
    return nv <= 2 ? { kind: "line", corners: 0, closed: false } : { kind: "curve", corners: nv, closed: false };
  }

  function VelaBoard(canvas, options) {
    options = options || {};
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.background = options.background === "dots" ? "dots" : "grid";
    this.mode = options.mode || "idle";
    this.fit = options.fit === "fill" ? "fill" : "fixed";
    this.GRID = options.grid || 40;

    this.pan = !!options.pan;
    this.zoom = !!options.zoom;
    this.minScale = options.minScale || 0.3;
    this.maxScale = options.maxScale || 4;
    this.view = { x: 0, y: 0, scale: 1 };

    this.W = options.width || 800;
    this.H = options.height || 560;

    this.objects = [];
    this.childStrokes = [];
    this.penWidth = options.penWidth || 5;
    this.penColor = COLORS.child; // צבע הציור הנוכחי (נשלט ע"י בורר הקשת)
    this.shapeKind = "square"; // square | circle | triangle (לכלי הצורות)
    this._currentStroke = null;
    this._twoClick = null; // מצב מיקום בשתי לחיצות
    this._onChildStroke = null;
    this._sid = 0;

    // בחירה/עריכה
    this.selectedId = null;
    this.hoverId = null;
    this._onSelect = null;
    this._onDraw = null;
    this._drawStart = null;
    this._resize = null;
    this._move = null;

    // תיבות-תשובה (שאלות/תרגילים) + אנימציית הופעה + callbacks
    this.answerBoxes = [];
    this._abid = 0;   // מזהה רץ לתיבות
    this._exSlot = 0; // שורת התרגיל הבא (לסידור אוטומטי)
    this._vertex = null;        // גרירת קודקוד פעילה
    this._onAnswerBoxes = null;
    this._onTextEdit = null;    // עריכת טקסט inline
    this._onRenderCbs = [];     // כמה מאזינים לרינדור (תיבות, עורך טקסט)
    this._animScheduled = false;

    this._pointers = {};
    this._gesture = "none"; // none|pan|draw|pinch|erase|move|resize
    this._panLast = null;
    this._pinch = null;

    this._dpr = global.devicePixelRatio || 1;
    this._resizeCanvas();
    this._bindPointer();
    this._applyCursor();
    this.render();

    var self = this;
    if (global.ResizeObserver) {
      this._ro = new ResizeObserver(function () { self._dpr = global.devicePixelRatio || 1; self._resizeCanvas(); self.render(); });
      this._ro.observe(this.fit === "fill" ? canvas.parentNode || canvas : canvas);
    }
  }

  VelaBoard.prototype._nid = function () { return "s" + (++this._sid); };
  VelaBoard.prototype._byId = function (id) {
    for (var i = 0; i < this.childStrokes.length; i++) if (this.childStrokes[i].id === id) return this.childStrokes[i];
    return null;
  };

  /* ---------- קנבס/צירים ---------- */
  VelaBoard.prototype._resizeCanvas = function () {
    if (this.fit === "fill") {
      var w = this.canvas.clientWidth || (this.canvas.parentNode && this.canvas.parentNode.clientWidth) || this.W;
      var h = this.canvas.clientHeight || (this.canvas.parentNode && this.canvas.parentNode.clientHeight) || this.H;
      this.W = Math.max(1, Math.round(w)); this.H = Math.max(1, Math.round(h));
    }
    this.canvas.width = this.W * this._dpr;
    this.canvas.height = this.H * this._dpr;
  };
  VelaBoard.prototype._screen = function (evt) {
    var rect = this.canvas.getBoundingClientRect();
    return { x: ((evt.clientX - rect.left) / rect.width) * this.W, y: ((evt.clientY - rect.top) / rect.height) * this.H };
  };
  VelaBoard.prototype._toWorld = function (s) { return { x: (s.x - this.view.x) / this.view.scale, y: (s.y - this.view.y) / this.view.scale }; };

  /* ---------- זום/גרירה ---------- */
  VelaBoard.prototype._zoomAt = function (sp, ns) {
    ns = clamp(ns, this.minScale, this.maxScale);
    var wx = (sp.x - this.view.x) / this.view.scale, wy = (sp.y - this.view.y) / this.view.scale;
    this.view.scale = ns; this.view.x = sp.x - wx * ns; this.view.y = sp.y - wy * ns;
  };
  VelaBoard.prototype.zoomIn = function () { this._zoomAt({ x: this.W / 2, y: this.H / 2 }, this.view.scale * 1.2); this.render(); };
  VelaBoard.prototype.zoomOut = function () { this._zoomAt({ x: this.W / 2, y: this.H / 2 }, this.view.scale / 1.2); this.render(); };
  VelaBoard.prototype.resetView = function () { this.view = { x: 0, y: 0, scale: 1 }; this.render(); };
  VelaBoard.prototype.getView = function () { return { x: this.view.x, y: this.view.y, scale: this.view.scale }; };

  /* ---------- רקע ---------- */
  VelaBoard.prototype.setBackground = function (m) { this.background = m === "dots" ? "dots" : "grid"; this.render(); return this.background; };
  VelaBoard.prototype.toggleBackground = function () { return this.setBackground(this.background === "grid" ? "dots" : "grid"); };

  /* ---------- רינדור ---------- */
  var REVEAL_DUR = 380; // משך אנימציית ההופעה (ms)
  VelaBoard.prototype.render = function () {
    var ctx = this.ctx, dpr = this._dpr, v = this.view;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.direction = "ltr"; // תרגילים ומספרים נכתבים משמאל לימין (לא RTL)
    ctx.fillStyle = COLORS.surface; ctx.fillRect(0, 0, this.W, this.H);
    ctx.setTransform(dpr * v.scale, 0, 0, dpr * v.scale, dpr * v.x, dpr * v.y);

    this._drawGrid();
    var now = (typeof Date !== "undefined" && Date.now) ? Date.now() : 0;
    var animating = false;
    for (var i = 0; i < this.objects.length; i++) {
      var o = this.objects[i], pr = this._revealProgress(o, now);
      if (pr < 1) { animating = true; this._drawObjectReveal(o, pr); }
      else this._drawObject(o);
    }
    for (var j = 0; j < this.childStrokes.length; j++) this._drawStroke(this.childStrokes[j]);
    if (this._currentStroke) this._drawStroke(this._currentStroke);
    if (this._twoClick) this._drawTwoClickPreview();
    for (var ai = 0; ai < this.answerBoxes.length; ai++) this._drawAnswerBox(this.answerBoxes[ai]);

    var act = this.selectedId || this.hoverId;
    if (act) { var s = this._byId(act); if (s) this._drawHandles(s, this.selectedId === act); }

    for (var ri = 0; ri < this._onRenderCbs.length; ri++) this._onRenderCbs[ri](); // ללקוח — למקם אלמנטי HTML על הלוח
    if (animating) this._scheduleAnim();
  };

  // אנימציית הופעה (fade + scale) לאובייקטי המורה — אפקט חשיפה כשאלמנט מצויר.
  VelaBoard.prototype._revealProgress = function (o, now) {
    if (!o || o._t0 == null) return 1;
    var t = (now - o._t0) / REVEAL_DUR;
    if (t >= 1) return 1; if (t <= 0) return 0;
    return 1 - Math.pow(1 - t, 3); // ease-out
  };
  VelaBoard.prototype._objCenter = function (o) {
    if (o.points && o.points.length) { var b = bboxOf(o.points); return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 }; }
    if (o.type === "circle" || o.type === "point" || o.type === "text") return { x: o.x, y: o.y };
    if (o.type === "line" || o.type === "arrow") return { x: (o.x1 + o.x2) / 2, y: (o.y1 + o.y2) / 2 };
    if (o.type === "number_line") return { x: o.x, y: o.y };
    return { x: o.x || 0, y: o.y || 0 };
  };
  VelaBoard.prototype._drawObjectReveal = function (o, e) {
    var ctx = this.ctx, c = this._objCenter(o), sc = 0.74 + 0.26 * e;
    ctx.save();
    ctx.globalAlpha = e;
    ctx.translate(c.x, c.y); ctx.scale(sc, sc); ctx.translate(-c.x, -c.y);
    this._drawObject(o);
    ctx.restore();
  };
  VelaBoard.prototype._scheduleAnim = function () {
    if (this._animScheduled || !global.requestAnimationFrame) return;
    this._animScheduled = true;
    var self = this;
    global.requestAnimationFrame(function () { self._animScheduled = false; self.render(); });
  };

  VelaBoard.prototype._drawGrid = function () {
    var ctx = this.ctx, G = this.GRID, s = this.view.scale;
    var left = (0 - this.view.x) / s, top = (0 - this.view.y) / s, right = (this.W - this.view.x) / s, bottom = (this.H - this.view.y) / s;
    var x0 = Math.floor(left / G) * G, y0 = Math.floor(top / G) * G;
    if (this.background === "grid") {
      ctx.strokeStyle = COLORS.gridLine; ctx.lineWidth = 1 / s; ctx.beginPath();
      for (var x = x0; x <= right; x += G) { ctx.moveTo(x, top); ctx.lineTo(x, bottom); }
      for (var y = y0; y <= bottom; y += G) { ctx.moveTo(left, y); ctx.lineTo(right, y); }
      ctx.stroke();
    } else {
      ctx.fillStyle = COLORS.gridDot; var r = 1.8 / s;
      for (var gx = x0; gx <= right; gx += G) for (var gy = y0; gy <= bottom; gy += G) { ctx.beginPath(); ctx.arc(gx, gy, r, 0, Math.PI * 2); ctx.fill(); }
    }
  };

  VelaBoard.prototype._drawObject = function (o) {
    var ctx = this.ctx, color = o.color || COLORS.teacher;
    if (o.type === "circle") { ctx.strokeStyle = color; ctx.lineWidth = o.width || 4; ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2); ctx.stroke(); }
    else if (o.type === "line") { ctx.strokeStyle = color; ctx.lineWidth = o.width || 4; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(o.x1, o.y1); ctx.lineTo(o.x2, o.y2); ctx.stroke(); }
    else if (o.type === "text") { ctx.fillStyle = color === COLORS.teacher ? COLORS.text : color; var sz = o.size || 32; ctx.font = "700 " + sz + "px Fredoka, Assistant, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(o.text), o.x, o.y); }
    else if (o.type === "polygon") {
      var pp = o.points || []; if (pp.length < 2) return;
      ctx.beginPath(); ctx.moveTo(pp[0].x, pp[0].y);
      for (var pi = 1; pi < pp.length; pi++) ctx.lineTo(pp[pi].x, pp[pi].y);
      ctx.closePath();
      if (o.fill) { ctx.fillStyle = hexToRgba(o.color || COLORS.teacher, 0.18); ctx.fill(); }
      ctx.strokeStyle = color; ctx.lineWidth = o.width || 4; ctx.lineJoin = "round"; ctx.stroke();
    }
    else if (o.type === "arrow") {
      ctx.strokeStyle = color; ctx.lineWidth = o.width || 4; ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath(); ctx.moveTo(o.x1, o.y1); ctx.lineTo(o.x2, o.y2); ctx.stroke();
      var aa = Math.atan2(o.y2 - o.y1, o.x2 - o.x1), ah = 12 + (o.width || 4) * 1.6;
      ctx.beginPath();
      ctx.moveTo(o.x2, o.y2); ctx.lineTo(o.x2 - ah * Math.cos(aa - Math.PI / 7), o.y2 - ah * Math.sin(aa - Math.PI / 7));
      ctx.moveTo(o.x2, o.y2); ctx.lineTo(o.x2 - ah * Math.cos(aa + Math.PI / 7), o.y2 - ah * Math.sin(aa + Math.PI / 7));
      ctx.stroke();
    }
    else if (o.type === "point") {
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(o.x, o.y, 6, 0, Math.PI * 2); ctx.fill();
      if (o.label) { ctx.fillStyle = COLORS.text; ctx.font = "700 22px Fredoka, Assistant, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.fillText(String(o.label), o.x, o.y - 11); }
    }
    else if (o.type === "number_line") {
      var nf = o.from, nt = o.to, nstep = o.step || 1;
      var steps = Math.abs(Math.round((nt - nf) / nstep)) || 1;
      var L = o.length || Math.min(640, Math.max(120, steps * 52));
      var nx = o.x, ny = o.y;
      ctx.strokeStyle = color; ctx.lineWidth = o.width || 3; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(nx + L, ny); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(nx + L, ny); ctx.lineTo(nx + L - 11, ny - 7); ctx.moveTo(nx + L, ny); ctx.lineTo(nx + L - 11, ny + 7); ctx.stroke();
      ctx.fillStyle = COLORS.text; ctx.font = "600 18px Fredoka, Assistant, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "top";
      for (var nk = 0; nk <= steps; nk++) {
        var tx = nx + (L * nk) / steps;
        ctx.strokeStyle = color; ctx.beginPath(); ctx.moveTo(tx, ny - 7); ctx.lineTo(tx, ny + 7); ctx.stroke();
        ctx.fillText(String(nf + nk * nstep), tx, ny + 11);
      }
    }
  };

  VelaBoard.prototype._drawStroke = function (st) {
    var pts = st.points; if (!pts || !pts.length) return;
    var ctx = this.ctx;
    if (st.type === "text") {
      var tb = bboxOf(pts), fs = Math.max(6, (tb.maxY - tb.minY) / 1.25);
      ctx.fillStyle = st.color || COLORS.text;
      ctx.font = "700 " + fs + "px Fredoka, Assistant, sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(String(st.text || ""), (tb.minX + tb.maxX) / 2, (tb.minY + tb.maxY) / 2);
      return;
    }
    if (st.fill && pts.length > 2) {
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
      for (var k = 1; k < pts.length; k++) ctx.lineTo(pts[k].x, pts[k].y);
      ctx.closePath(); ctx.fillStyle = hexToRgba(st.color || COLORS.child, 0.22); ctx.fill();
    }
    ctx.strokeStyle = st.color || COLORS.child; ctx.lineWidth = st.width || 5; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    if (pts.length === 1) ctx.lineTo(pts[0].x + 0.1, pts[0].y + 0.1);
    else for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  };

  VelaBoard.prototype._corners = function (s) {
    var b = bboxOf(s.points), pad = 6 / this.view.scale;
    return [
      { x: b.minX - pad, y: b.minY - pad }, { x: b.maxX + pad, y: b.minY - pad },
      { x: b.maxX + pad, y: b.maxY + pad }, { x: b.minX - pad, y: b.maxY + pad },
    ];
  };
  // טקסט וקשקוש-חופשי (הרבה נקודות) → ידיות bbox (שינוי גודל); צורה גאומטרית → ידיות קודקוד.
  VelaBoard.prototype._editMode = function (s) {
    return (s.type === "text" || (s.points && s.points.length > 16)) ? "bbox" : "vertex";
  };
  // קודקודי הצורה (בלי הנקודה הסוגרת הכפולה), עם אינדקס הנקודה.
  VelaBoard.prototype._vertices = function (s) {
    var pts = s.points, out = [], last = isClosed(pts) ? pts.length - 1 : pts.length;
    for (var i = 0; i < last; i++) out.push({ x: pts[i].x, y: pts[i].y, idx: i });
    return out;
  };
  VelaBoard.prototype._drawHandles = function (s, solid) {
    var ctx = this.ctx, sc = this.view.scale, hr = (HANDLE_PX / 2) / sc;
    var pts = this._editMode(s) === "bbox" ? this._corners(s) : this._vertices(s);
    ctx.save();
    ctx.globalAlpha = solid ? 1 : 0.6;
    ctx.fillStyle = COLORS.sel; ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.6 / sc; // עיגול מלא בצבע הרשת, מסגרת לבנה דקה
    for (var i = 0; i < pts.length; i++) {
      ctx.beginPath(); ctx.arc(pts[i].x, pts[i].y, hr, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  };

  /* ---------- כלי המורה ---------- */
  VelaBoard.prototype._tools = {
    draw_circle: function (i) { this.objects.push({ who: "teacher", type: "circle", x: +i.x, y: +i.y, r: clamp(i.r, 1, 5000), color: i.color || null, width: i.width || null }); },
    draw_line: function (i) { this.objects.push({ who: "teacher", type: "line", x1: +i.x1, y1: +i.y1, x2: +i.x2, y2: +i.y2, color: i.color || null, width: i.width || null }); },
    write_text: function (i) { this.objects.push({ who: "teacher", type: "text", x: +i.x, y: +i.y, text: String(i.text == null ? "" : i.text).slice(0, 40), size: i.size ? clamp(i.size, 8, 400) : null, color: i.color || null }); },
    draw_polygon: function (i) { this.objects.push({ who: "teacher", type: "polygon", points: (i.points || []).map(function (p) { return { x: +p[0], y: +p[1] }; }), color: i.color || null, width: i.width || null, fill: !!i.fill }); },
    draw_arrow: function (i) { this.objects.push({ who: "teacher", type: "arrow", x1: +i.x1, y1: +i.y1, x2: +i.x2, y2: +i.y2, color: i.color || null, width: i.width || null }); },
    draw_point: function (i) { this.objects.push({ who: "teacher", type: "point", x: +i.x, y: +i.y, label: i.label ? String(i.label).slice(0, 16) : "", color: i.color || null }); },
    draw_number_line: function (i) { this.objects.push({ who: "teacher", type: "number_line", x: +i.x, y: +i.y, from: +i.from, to: +i.to, step: i.step ? +i.step : 1, length: i.length ? +i.length : null, color: i.color || null }); },
    ask_answer: function (i) {
      var kind = i.kind === "text" ? "text" : "number";
      var dim = kind === "text" ? { w: 300, h: 86 } : { w: 88, h: 74 };
      this.answerBoxes.push({ id: "ab" + (++this._abid), x: +i.x, y: +i.y, kind: kind, answer: i.answer == null ? "" : String(i.answer), w: dim.w, h: dim.h, status: "open" });
      if (this._onAnswerBoxes) this._onAnswerBoxes(this.answerBoxes);
    },
    // תבנית מהירה: תרגיל שלם + תיבת-תשובה, ממוקם אוטומטית בצד שמאל, מוערם בשורות.
    draw_exercise: function (i) {
      var size = 40, top = 130, rowH = 116, colW = 430, rightMargin = 30;
      var perCol = Math.max(1, Math.floor((this.H - top) / rowH)); // כמה תרגילים נכנסים בעמודה
      var slot = this._exSlot || 0, col = Math.floor(slot / perCol), row = slot % perCol;
      var y = top + row * rowH;
      var text = String(i.text == null ? "" : i.text).slice(0, 60);
      var kind = i.kind === "text" ? "text" : "number";
      this.ctx.font = "700 " + size + "px Fredoka, Assistant, sans-serif";
      var tw = this.ctx.measureText(text).width;
      var boxW = kind === "text" ? 300 : 88, boxH = kind === "text" ? 86 : 74;
      // עוגן לצד ימין: התיבה ליד הקצה הימני, הטקסט משמאל לה. עמודות נוספות נערמות שמאלה.
      var boxX = this.W - rightMargin - boxW / 2 - col * colW;
      var textCx = boxX - boxW / 2 - 30 - tw / 2;
      if (textCx - tw / 2 < 20) textCx = 20 + tw / 2; // הגנה: לא לצאת משמאל
      this.objects.push({ who: "teacher", type: "text", x: textCx, y: y, text: text, size: size, color: null });
      this.answerBoxes.push({ id: "ab" + (++this._abid), x: boxX, y: y, kind: kind, answer: i.answer == null ? "" : String(i.answer), w: boxW, h: boxH, status: "open" });
      this._exSlot = slot + 1;
      if (this._onAnswerBoxes) this._onAnswerBoxes(this.answerBoxes);
    },
    // תבנית מהירה: שעון שלם (עיגול + 12 מספרים + מחוגים) בקריאה אחת.
    draw_clock: function (i) {
      var cx = +i.x, cy = +i.y, r = i.r ? +i.r : 110, col = i.color || null;
      var hour = (((+i.hour) % 12) + 12) % 12, minute = i.minute ? +i.minute : 0;
      this.objects.push({ who: "teacher", type: "circle", x: cx, y: cy, r: r, color: col, width: 4 });
      for (var n = 1; n <= 12; n++) {
        var na = ((n * 30 - 90) * Math.PI) / 180;
        this.objects.push({ who: "teacher", type: "text", x: cx + Math.cos(na) * (r - 24), y: cy + Math.sin(na) * (r - 24), text: String(n), size: 22, color: col });
      }
      var ha = (((hour % 12) * 30 + minute * 0.5 - 90) * Math.PI) / 180, ma = ((minute * 6 - 90) * Math.PI) / 180;
      this.objects.push({ who: "teacher", type: "line", x1: cx, y1: cy, x2: cx + Math.cos(ha) * (r * 0.5), y2: cy + Math.sin(ha) * (r * 0.5), color: col, width: 6 });
      this.objects.push({ who: "teacher", type: "line", x1: cx, y1: cy, x2: cx + Math.cos(ma) * (r * 0.78), y2: cy + Math.sin(ma) * (r * 0.78), color: col, width: 4 });
      this.objects.push({ who: "teacher", type: "point", x: cx, y: cy, label: "", color: col });
    },
    clear_board: function () { this.objects = []; this.childStrokes = []; this._currentStroke = null; this.answerBoxes = []; this._exSlot = 0; this._select(null); if (this._onAnswerBoxes) this._onAnswerBoxes(this.answerBoxes); },
  };
  VelaBoard.prototype.tool = function (name, input) {
    var h = this._tools[name]; if (!h) { console.warn("VelaBoard: כלי לא מוכר —", name); return { ok: false, error: "unknown_tool" }; }
    try {
      h.call(this, input || {});
      var t0 = Date.now ? Date.now() : 0; // חותמת זמן לאנימציית ההופעה
      for (var i = 0; i < this.objects.length; i++) if (this.objects[i]._t0 == null) this.objects[i]._t0 = t0;
      this.render();
      return { ok: true };
    } catch (e) { console.error("VelaBoard tool error:", name, e); return { ok: false, error: String(e && e.message) }; }
  };
  VelaBoard.prototype.runTools = function (calls) { if (Array.isArray(calls)) for (var i = 0; i < calls.length; i++) if (calls[i] && calls[i].name) this.tool(calls[i].name, calls[i].input || {}); };
  VelaBoard.prototype.registerTool = function (name, h) { if (name && typeof h === "function") this._tools[name] = h; };

  /* ---------- תיבת-תשובה (שאלה/תרגיל) ---------- */
  VelaBoard.prototype.onAnswerBoxes = function (cb) { this._onAnswerBoxes = typeof cb === "function" ? cb : null; };
  VelaBoard.prototype.onRender = function (cb) { if (typeof cb === "function") this._onRenderCbs.push(cb); };
  VelaBoard.prototype.clearAnswerBoxes = function () { this.answerBoxes = []; this._exSlot = 0; if (this._onAnswerBoxes) this._onAnswerBoxes(this.answerBoxes); this.render(); };
  VelaBoard.prototype.setAnswerStatusById = function (id, status) { for (var i = 0; i < this.answerBoxes.length; i++) if (this.answerBoxes[i].id === id) { this.answerBoxes[i].status = status; this.render(); return; } };
  // עולם → פיקסלי-מסך (CSS) — למיקום תיבת ה-HTML מעל הלוח (עוקב אחרי זום/גרירה)
  VelaBoard.prototype.worldToScreen = function (wx, wy) {
    var rect = this.canvas.getBoundingClientRect();
    var fx = rect.width / this.W, fy = rect.height / this.H;
    return {
      x: rect.left + (wx * this.view.scale + this.view.x) * fx,
      y: rect.top + (wy * this.view.scale + this.view.y) * fy,
      sx: this.view.scale * fx, sy: this.view.scale * fy,
    };
  };
  VelaBoard.prototype.getAnswerBoxRects = function () {
    var out = [];
    for (var i = 0; i < this.answerBoxes.length; i++) {
      var a = this.answerBoxes[i], c = this.worldToScreen(a.x - a.w / 2, a.y - a.h / 2);
      out.push({ id: a.id, left: c.x, top: c.y, width: a.w * c.sx, height: a.h * c.sy, kind: a.kind, status: a.status });
    }
    return out;
  };
  VelaBoard.prototype._drawAnswerBox = function (a) {
    var ctx = this.ctx, col = a.status === "correct" ? "#22c55e" : a.status === "wrong" ? "#ef4444" : COLORS.teacher;
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    roundRectPath(ctx, a.x - a.w / 2, a.y - a.h / 2, a.w, a.h, 14); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.setLineDash(a.status === "open" ? [8, 6] : []);
    roundRectPath(ctx, a.x - a.w / 2, a.y - a.h / 2, a.w, a.h, 14); ctx.stroke();
    ctx.restore();
  };

  /* ---------- מצב + סמן ---------- */
  VelaBoard.prototype.setMode = function (mode) {
    this.mode = ALLOWED_MODES[mode] ? mode : "idle";
    this._twoClick = null; // לבטל מיקום שתי-לחיצות שלא הושלם בעת מעבר כלי
    if (this.mode !== "idle") { this.hoverId = null; this._select(null); }
    this._applyCursor(); this.render(); return this.mode;
  };
  VelaBoard.prototype._applyCursor = function (dragging) {
    var c = "default";
    if (this.mode === "eraser") c = ERASER_CURSOR;
    else if (this.mode === "idle") c = this.pan ? (dragging ? "grabbing" : "grab") : "default";
    else c = "crosshair"; // child / line / angle / shape / text
    this.canvas.style.cursor = c;
  };
  VelaBoard.prototype.onDraw = function (cb) { this._onDraw = typeof cb === "function" ? cb : null; };

  // נקודות הצורה לפי מצב הציור (קו/זווית/מלבן). זווית = שתי קרניים מהקודקוד.
  VelaBoard.prototype._shapePts = function (mode, a, b) {
    if (mode === "line") return [{ x: a.x, y: a.y }, { x: b.x, y: b.y }];
    if (mode === "angle") {
      var len = Math.sqrt(dist2(a.x, a.y, b.x, b.y)) || 1;
      return [{ x: a.x + len, y: a.y }, { x: a.x, y: a.y }, { x: b.x, y: b.y }];
    }
    if (mode === "shape") {
      var x1 = Math.min(a.x, b.x), y1 = Math.min(a.y, b.y), x2 = Math.max(a.x, b.x), y2 = Math.max(a.y, b.y);
      var kind = this.shapeKind || "square";
      if (kind === "triangle") {
        return [{ x: (x1 + x2) / 2, y: y1 }, { x: x2, y: y2 }, { x: x1, y: y2 }, { x: (x1 + x2) / 2, y: y1 }];
      }
      if (kind === "circle") {
        var cx = (x1 + x2) / 2, cy = (y1 + y2) / 2, rx = (x2 - x1) / 2, ry = (y2 - y1) / 2, N = 28, out = [];
        for (var k = 0; k <= N; k++) { var ang = (k / N) * Math.PI * 2; out.push({ x: cx + Math.cos(ang) * rx, y: cy + Math.sin(ang) * ry }); }
        return out; // >16 נקודות → עריכת bbox (אין קודקודים)
      }
      return [{ x: x1, y: y1 }, { x: x2, y: y1 }, { x: x2, y: y2 }, { x: x1, y: y2 }, { x: x1, y: y1 }]; // square/rect
    }
    return [{ x: a.x, y: a.y }];
  };

  VelaBoard.prototype.setShapeKind = function (k) { if (k === "square" || k === "circle" || k === "triangle") this.shapeKind = k; };
  // משיכה עדינה לקודקודי הרשת — אם קרוב לקודקוד (בתוך סף), מצמיד אליו.
  VelaBoard.prototype._snap = function (w) {
    var G = this.GRID, thr = G * 0.25;
    var gx = Math.round(w.x / G) * G, gy = Math.round(w.y / G) * G;
    return { x: Math.abs(w.x - gx) <= thr ? gx : w.x, y: Math.abs(w.y - gy) <= thr ? gy : w.y };
  };
  // סיום צורה (לחיצה שנייה או סיום גרירה)
  VelaBoard.prototype._finalizeShape = function (end) {
    var tc = this._twoClick; if (!tc) return;
    this._twoClick = null;
    var start = tc.start;
    if (Math.max(Math.abs(end.x - start.x), Math.abs(end.y - start.y)) < 4 / this.view.scale) { this.render(); return; } // זעיר → ביטול
    var pts = this._shapePts(tc.mode, start, end);
    var stroke = {
      who: "child", type: "stroke", points: pts, color: this.penColor, width: this.penWidth,
      kind: tc.mode === "shape" ? "shape_" + (this.shapeKind || "square") : tc.mode, id: this._nid(),
    };
    this.childStrokes.push(stroke);
    if (this._onChildStroke) this._onChildStroke(stroke, this.childStrokes);
    if (this._onDraw) this._onDraw(stroke);
    this.render();
  };

  // צבע הציור הנוכחי (מבורר הקשת). משפיע על עיפרון/קווים/זוויות/צורות/טקסט חדשים.
  VelaBoard.prototype.setPenColor = function (hex) {
    if (typeof hex === "string" && hex) this.penColor = hex;
    var s = this.selectedId ? this._byId(this.selectedId) : null; // אם משהו נבחר — צבע אותו מיד
    if (s && s.who === "child") { s.color = this.penColor; this.render(); }
  };

  // תצוגה מקדימה (מקווקו, חצי-שקוף) של הצורה בזמן מיקום בשתי לחיצות + נקודת ההצמדה.
  VelaBoard.prototype._drawTwoClickPreview = function () {
    var tc = this._twoClick, ctx = this.ctx, sc = this.view.scale;
    var pts = this._shapePts(tc.mode, tc.start, tc.cur);
    ctx.save();
    ctx.globalAlpha = 0.55; ctx.strokeStyle = this.penColor; ctx.lineWidth = (this.penWidth || 5) / sc;
    ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.setLineDash([6 / sc, 5 / sc]);
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    ctx.setLineDash([]);
    // נקודת התחלה + נקודה נוכחית (מסומנות בצבע הרשת אם הוצמדו)
    var hr = 5 / sc;
    [tc.start, tc.cur].forEach(function (p) {
      ctx.globalAlpha = 0.9; ctx.fillStyle = COLORS.sel;
      ctx.beginPath(); ctx.arc(p.x, p.y, hr, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  };

  // טקסט: שואל מה לכתוב וממקם כאובייקט (תיבה בת 4 פינות — נבחר/נגרר/נמחק כמו השאר).
  // כלי הטקסט: פותח עורך inline בלקוח (בלי חלונית prompt).
  VelaBoard.prototype._placeText = function (w) { if (this._onTextEdit) this._onTextEdit({ x: w.x, y: w.y }); };
  VelaBoard.prototype.onTextEdit = function (cb) { this._onTextEdit = typeof cb === "function" ? cb : null; };
  // יוצר אובייקט טקסט (פינה שמאלית-עליונה ב-(x,y)) — נקרא מעורך ה-inline בסיום הכתיבה.
  VelaBoard.prototype.addTextObject = function (x, y, text) {
    text = String(text == null ? "" : text).slice(0, 60); if (!text) return;
    var size = 30;
    this.ctx.font = "700 " + size + "px Fredoka, Assistant, sans-serif";
    var tw = Math.max(24, this.ctx.measureText(text).width), th = size * 1.25;
    var item = {
      id: this._nid(), who: "child", type: "text", text: text, color: this.penColor, kind: "text",
      points: [{ x: x, y: y }, { x: x + tw, y: y }, { x: x + tw, y: y + th }, { x: x, y: y + th }],
    };
    this.childStrokes.push(item);
    if (this._onChildStroke) this._onChildStroke(item, this.childStrokes);
    if (this._onDraw) this._onDraw(item);
    this.render();
  };
  VelaBoard.prototype.onChildStroke = function (cb) { this._onChildStroke = typeof cb === "function" ? cb : null; };

  /* ---------- בחירה ועריכה ---------- */
  VelaBoard.prototype.onSelectionChange = function (cb) { this._onSelect = typeof cb === "function" ? cb : null; };
  VelaBoard.prototype._emitSel = function () {
    if (!this._onSelect) return;
    var s = this._byId(this.selectedId);
    this._onSelect(s ? { id: s.id, type: s.type || "stroke", color: s.color || COLORS.child, width: s.width || this.penWidth, fill: !!s.fill } : null);
  };
  VelaBoard.prototype._select = function (id) {
    if (this.selectedId === (id || null)) return;
    this.selectedId = id || null; this._emitSel();
  };
  VelaBoard.prototype.getSelected = function () { var s = this._byId(this.selectedId); return s ? { id: s.id, color: s.color, width: s.width, fill: !!s.fill } : null; };
  VelaBoard.prototype.setSelectedColor = function (c) { if (c) this.penColor = c; var s = this._byId(this.selectedId); if (s) { s.color = c; this.render(); this._emitSel(); } };
  VelaBoard.prototype.setSelectedWidth = function (w) { var s = this._byId(this.selectedId); if (s) { s.width = +w; this.render(); this._emitSel(); } };
  VelaBoard.prototype.toggleSelectedFill = function () { var s = this._byId(this.selectedId); if (s) { s.fill = !s.fill; this.render(); this._emitSel(); } };
  VelaBoard.prototype.deleteSelected = function () {
    if (!this.selectedId) return;
    var id = this.selectedId;
    this.childStrokes = this.childStrokes.filter(function (s) { return s.id !== id; });
    this.selectedId = null; this.hoverId = null; this._emitSel(); this.render();
  };

  VelaBoard.prototype._hitTest = function (p) {
    for (var i = this.childStrokes.length - 1; i >= 0; i--) {
      var s = this.childStrokes[i];
      if (s.type === "text") { if (pointInPoly(p, s.points)) return s.id; continue; }
      var thr = (s.width || 5) / 2 + 8 / this.view.scale;
      if (s.fill && s.points.length > 2 && pointInPoly(p, s.points)) return s.id;
      if (nearPolyline(p, s.points, thr)) return s.id;
    }
    return null;
  };
  // מחזיר { type:'bbox', corner } או { type:'vertex', idx } או null.
  VelaBoard.prototype._handleAt = function (p, s) {
    var hr = (HANDLE_PX + 6) / this.view.scale / 2;
    if (this._editMode(s) === "bbox") {
      var c = this._corners(s);
      for (var i = 0; i < 4; i++) if (Math.abs(p.x - c[i].x) <= hr && Math.abs(p.y - c[i].y) <= hr) return { type: "bbox", corner: i };
    } else {
      var v = this._vertices(s);
      for (var j = 0; j < v.length; j++) if (Math.abs(p.x - v[j].x) <= hr && Math.abs(p.y - v[j].y) <= hr) return { type: "vertex", idx: v[j].idx };
    }
    return null;
  };
  VelaBoard.prototype._vertexTo = function (w) {
    var v = this._vertex, s = this._byId(v.id); if (!s) return;
    w = this._snap(w); // משיכה עדינה לקודקודי הרשת
    s.points[v.idx] = { x: w.x, y: w.y };
    if (v.closed && v.idx === 0) s.points[s.points.length - 1] = { x: w.x, y: w.y }; // לשמור צורה סגורה
    this.render();
  };
  VelaBoard.prototype._eraseAt = function (cx, cy) {
    var r = ERASER_PX / 2 / this.view.scale, self = this, next = [];
    for (var i = 0; i < this.childStrokes.length; i++) {
      var res = eraseStroke(this.childStrokes[i], cx, cy, r, function () { return self._nid(); });
      for (var k = 0; k < res.length; k++) next.push(res[k]);
    }
    this.childStrokes = next;
    if (this.selectedId && !this._byId(this.selectedId)) { this.selectedId = null; this._emitSel(); }
  };
  VelaBoard.prototype._resizeTo = function (w) {
    var r = this._resize, bb = r.bb;
    var corners = [[bb.minX, bb.minY], [bb.maxX, bb.minY], [bb.maxX, bb.maxY], [bb.minX, bb.maxY]];
    var anchor = corners[(r.corner + 2) % 4], orig = corners[r.corner];
    var dx0 = orig[0] - anchor[0], dy0 = orig[1] - anchor[1];
    var sx = dx0 !== 0 ? (w.x - anchor[0]) / dx0 : 1, sy = dy0 !== 0 ? (w.y - anchor[1]) / dy0 : 1;
    if (!isFinite(sx)) sx = 1; if (!isFinite(sy)) sy = 1;
    var MIN = 0.05;
    if (Math.abs(sx) < MIN) sx = sx < 0 ? -MIN : MIN;
    if (Math.abs(sy) < MIN) sy = sy < 0 ? -MIN : MIN;
    var s = this._byId(r.id); if (!s) return;
    // טקסט מתרחב אחיד (גודל הגופן נגזר מגובה התיבה) — בוחרים את הציר שזז יותר.
    if (s.type === "text") {
      var k = Math.abs(Math.abs(sx) - 1) >= Math.abs(Math.abs(sy) - 1) ? sx : sy;
      sx = k; sy = k;
    }
    s.points = r.orig.map(function (p) { return { x: anchor[0] + (p.x - anchor[0]) * sx, y: anchor[1] + (p.y - anchor[1]) * sy }; });
    this.render();
  };
  VelaBoard.prototype._moveTo = function (w) {
    var m = this._move, s = this._byId(m.id); if (!s) return;
    var dx = w.x - m.start.x, dy = w.y - m.start.y;
    s.points = m.orig.map(function (p) { return { x: p.x + dx, y: p.y + dy }; });
    this.render();
  };

  /* ---------- מצביע ---------- */
  VelaBoard.prototype._ids = function () { return Object.keys(this._pointers); };
  VelaBoard.prototype._midDist = function () { var ids = this._ids(), a = this._pointers[ids[0]], b = this._pointers[ids[1]]; return { mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, dist: hypot(a.x - b.x, a.y - b.y) }; };
  VelaBoard.prototype._startPinch = function () { var md = this._midDist(); this._pinch = { startDist: md.dist || 1, startScale: this.view.scale, midWorld: this._toWorld(md.mid) }; };
  VelaBoard.prototype._updatePinch = function () {
    var md = this._midDist(), ns = clamp(this._pinch.startScale * (md.dist / this._pinch.startDist), this.minScale, this.maxScale);
    this.view.scale = ns; this.view.x = md.mid.x - this._pinch.midWorld.x * ns; this.view.y = md.mid.y - this._pinch.midWorld.y * ns; this.render();
  };

  VelaBoard.prototype._bindPointer = function () {
    var self = this;
    function down(evt) {
      var s = self._screen(evt); self._pointers[evt.pointerId] = s;
      if (self.canvas.setPointerCapture && evt.pointerId != null) { try { self.canvas.setPointerCapture(evt.pointerId); } catch (e) {} }
      var n = self._ids().length, w = self._toWorld(s);
      if (self.zoom && n === 2) { if (self._gesture === "draw") self._currentStroke = null; self._gesture = "pinch"; self._startPinch(); return; }
      if (n !== 1) return;
      if (DRAW_MODES[self.mode]) { // עיפרון — ציור חופשי בגרירה
        evt.preventDefault(); self._gesture = "draw"; self._drawStart = w;
        self._currentStroke = { who: "child", type: "stroke", points: [w], color: self.penColor, kind: "scribble" };
        return;
      }
      if (TWO_CLICK_MODES[self.mode]) { // קו/זווית/צורה — לחיצה ראשונה=התחלה, שנייה=סיום (או גרירה)
        evt.preventDefault();
        var sp = self._snap(w);
        if (self._twoClick) self._finalizeShape(sp);
        else { self._twoClick = { mode: self.mode, start: sp, cur: sp, downScreen: s, dragging: false }; self.render(); }
        return;
      }
      if (self.mode === "text") { evt.preventDefault(); self._placeText(w); return; }
      if (self.mode === "eraser") { evt.preventDefault(); self._gesture = "erase"; self._eraseAt(w.x, w.y); self.render(); return; }
      // mode idle = בחירה + הזזת תצוגה
      var act = self.selectedId || self.hoverId, actS = act ? self._byId(act) : null;
      if (actS) {
        var h = self._handleAt(w, actS);
        if (h) {
          evt.preventDefault(); self._select(actS.id);
          if (h.type === "bbox") { self._gesture = "resize"; self._resize = { id: actS.id, corner: h.corner, orig: clonePts(actS.points), bb: bboxOf(actS.points) }; }
          else { self._gesture = "vertex"; self._vertex = { id: actS.id, idx: h.idx, closed: isClosed(actS.points) }; }
          return;
        }
      }
      var hit = self._hitTest(w);
      if (hit) { evt.preventDefault(); self._select(hit); var hs = self._byId(hit); self._gesture = "move"; self._move = { id: hit, orig: clonePts(hs.points), start: w }; self.render(); return; }
      if (self.selectedId) { self._select(null); self.render(); }
      if (self.pan) { evt.preventDefault(); self._gesture = "pan"; self._panLast = s; self._applyCursor(true); }
    }
    function move(evt) {
      // ריחוף (idle, בלי מחווה) → ידיות + סמן
      if (self.mode === "idle" && self._gesture === "none") {
        var wp = self._toWorld(self._screen(evt));
        var hv = self._hitTest(wp);
        var overHandle = false;
        if (self.selectedId || hv) { var os = self._byId(self.selectedId || hv); if (os && self._handleAt(wp, os)) overHandle = true; }
        if (hv !== self.hoverId) { self.hoverId = hv; self.render(); }
        self.canvas.style.cursor = overHandle ? "pointer" : (hv ? "move" : (self.pan ? "grab" : "default"));
      }
      // תצוגה מקדימה למצב שתי-לחיצות (קו/זווית/צורה) — עוקבת אחרי הסמן גם בין הלחיצות.
      if (self._twoClick) {
        var s2 = self._screen(evt);
        self._twoClick.cur = self._snap(self._toWorld(s2));
        if ((evt.pointerId in self._pointers) && self._twoClick.downScreen &&
            Math.abs(s2.x - self._twoClick.downScreen.x) + Math.abs(s2.y - self._twoClick.downScreen.y) > 6) {
          self._twoClick.dragging = true; // המשתמש מחזיק וגורר → יצירה בגרירה
        }
        self.render();
        if (!(evt.pointerId in self._pointers)) { evt.preventDefault(); return; } // עכבר חופשי בין הלחיצות
      }
      if (!(evt.pointerId in self._pointers)) return;
      var s = self._screen(evt); self._pointers[evt.pointerId] = s; var w = self._toWorld(s);
      if (self._gesture === "pinch") { evt.preventDefault(); self._updatePinch(); return; }
      if (self._gesture === "draw" && self._currentStroke) {
        evt.preventDefault();
        if (self.mode === "child") {
          var pts = self._currentStroke.points, last = pts[pts.length - 1];
          if (!last || Math.abs(w.x - last.x) + Math.abs(w.y - last.y) >= 1.2) { pts.push(w); self.render(); }
        } else { self._currentStroke.points = self._shapePts(self.mode, self._drawStart, w); self.render(); }
      } else if (self._gesture === "erase") { evt.preventDefault(); self._eraseAt(w.x, w.y); self.render(); }
      else if (self._gesture === "resize") { evt.preventDefault(); self._resizeTo(w); }
      else if (self._gesture === "vertex") { evt.preventDefault(); self._vertexTo(w); }
      else if (self._gesture === "move") { evt.preventDefault(); self._moveTo(w); }
      else if (self._gesture === "pan") { evt.preventDefault(); self.view.x += s.x - self._panLast.x; self.view.y += s.y - self._panLast.y; self._panLast = s; self.render(); }
    }
    function up(evt) {
      if (!(evt.pointerId in self._pointers)) return;
      delete self._pointers[evt.pointerId];
      var n = self._ids().length;
      // שתי-לחיצות: אם המשתמש החזיק וגרר → סיים את הצורה; אחרת השאר פתוח ללחיצה השנייה.
      if (self._twoClick && self._twoClick.dragging) { self._finalizeShape(self._twoClick.cur); }
      if (self._gesture === "draw") {
        var stroke = self._currentStroke; self._currentStroke = null;
        var minPts = stroke && stroke.kind === "scribble" ? 1 : 2;
        // לחיצה בלי גרירה (קו/זווית/צורה) יוצרת אובייקט זעיר שלא ניתן למתוח — נוטשים אותו.
        var tiny = false;
        if (stroke && stroke.kind !== "scribble") {
          var gb = bboxOf(stroke.points);
          tiny = Math.max(gb.maxX - gb.minX, gb.maxY - gb.minY) < 3 / self.view.scale;
        }
        if (stroke && !tiny && stroke.points.length >= minPts) {
          stroke.id = self._nid(); stroke.width = self.penWidth;
          self.childStrokes.push(stroke);
          if (self._onChildStroke) self._onChildStroke(stroke, self.childStrokes);
          if (self._onDraw) self._onDraw(stroke);
        }
        self.render();
      }
      if (self._gesture === "pan") { self._panLast = null; self._applyCursor(false); }
      if (self._gesture === "resize") self._resize = null;
      if (self._gesture === "vertex") self._vertex = null;
      if (self._gesture === "move") self._move = null;
      if (self._gesture === "pinch" && n < 2) self._pinch = null;
      if (n === 0) self._gesture = "none"; else if (self._gesture === "pinch" && n < 2) self._gesture = "none";
    }
    function wheel(evt) { if (!self.zoom) return; evt.preventDefault(); self._zoomAt(self._screen(evt), self.view.scale * (evt.deltaY < 0 ? 1.12 : 1 / 1.12)); self.render(); }
    on(this.canvas, "pointerdown", down); on(this.canvas, "pointermove", move);
    on(this.canvas, "pointerup", up); on(this.canvas, "pointercancel", up); on(this.canvas, "wheel", wheel);
  };
  function on(el, t, fn) { el.addEventListener(t, fn, { passive: false }); }

  /* ---------- נתונים ---------- */
  VelaBoard.prototype.getChildStrokes = function () { return JSON.parse(JSON.stringify(this.childStrokes)); };
  VelaBoard.prototype.clearChildStrokes = function () { this.childStrokes = []; this._currentStroke = null; this._select(null); this.render(); };
  VelaBoard.prototype.getScene = function () {
    return { geometry: { width: this.W, height: this.H, grid: this.GRID, fit: this.fit }, view: this.getView(), background: this.background, teacherObjects: JSON.parse(JSON.stringify(this.objects)), childStrokes: this.getChildStrokes() };
  };

  // ייצוא הציור כתמונת PNG (data-URL), חתוכה לתוכן + רקע לבן + רשת קלה — למורה שיראה.
  VelaBoard.prototype.exportPNG = function (opts) {
    opts = opts || {};
    var all = this.objects.concat(this.childStrokes);
    if (!all.length) return null;
    var b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    function ext(x, y) { if (x < b.minX) b.minX = x; if (y < b.minY) b.minY = y; if (x > b.maxX) b.maxX = x; if (y > b.maxY) b.maxY = y; }
    for (var i = 0; i < all.length; i++) {
      var o = all[i];
      if (o.points && o.points.length) { for (var j = 0; j < o.points.length; j++) ext(o.points[j].x, o.points[j].y); }
      else if (o.type === "circle") { ext(o.x - o.r, o.y - o.r); ext(o.x + o.r, o.y + o.r); }
      else if (o.type === "line" || o.type === "arrow") { ext(o.x1, o.y1); ext(o.x2, o.y2); }
      else if (o.type === "point") { ext(o.x - 14, o.y - 28); ext(o.x + 14, o.y + 14); }
      else if (o.type === "number_line") {
        var nlS = Math.abs(Math.round((o.to - o.from) / (o.step || 1))) || 1;
        var nlL = o.length || Math.min(640, Math.max(120, nlS * 52));
        ext(o.x - 8, o.y - 18); ext(o.x + nlL + 14, o.y + 34);
      }
      else if (o.type === "text") {
        // מדידה אמיתית של טקסט המורה (במקום הערכה קבועה) — שלא ייחתך בייצוא
        var tsz = o.size || 32;
        this.ctx.font = "700 " + tsz + "px Fredoka, Assistant, sans-serif";
        var thw = this.ctx.measureText(String(o.text || "")).width / 2 + 8, thh = tsz * 0.75;
        ext(o.x - thw, o.y - thh); ext(o.x + thw, o.y + thh);
      }
    }
    if (!isFinite(b.minX)) return null;
    var pad = opts.pad != null ? opts.pad : 40;
    b.minX -= pad; b.minY -= pad; b.maxX += pad; b.maxY += pad;
    var w = b.maxX - b.minX, h = b.maxY - b.minY;
    // רזולוציה: עד פי-3 לציורים קטנים (פירוט) × DPR (חדות), והקצה הארוך חסום ל~maxPx.
    var dpr = Math.min(2, global.devicePixelRatio || 1);
    var sCss = Math.min(3, (opts.maxPx || 900) / Math.max(w, h, 1));
    var s = sCss * dpr;
    var cw = Math.max(1, Math.round(w * s)), ch = Math.max(1, Math.round(h * s));
    var doc = global.document;
    if (!doc || !doc.createElement) return null;
    var off = doc.createElement("canvas"); off.width = cw; off.height = ch;
    var octx = off.getContext("2d");
    octx.direction = "ltr";
    octx.fillStyle = COLORS.surface; octx.fillRect(0, 0, cw, ch);
    if (opts.grid !== false) {
      octx.strokeStyle = COLORS.gridLine; octx.lineWidth = 1;
      var G = this.GRID, gx, gy;
      for (gx = Math.ceil(b.minX / G) * G; gx <= b.maxX; gx += G) { var px = (gx - b.minX) * s; octx.beginPath(); octx.moveTo(px + 0.5, 0); octx.lineTo(px + 0.5, ch); octx.stroke(); }
      for (gy = Math.ceil(b.minY / G) * G; gy <= b.maxY; gy += G) { var py = (gy - b.minY) * s; octx.beginPath(); octx.moveTo(0, py + 0.5); octx.lineTo(cw, py + 0.5); octx.stroke(); }
    }
    var realCtx = this.ctx;
    this.ctx = octx;
    octx.setTransform(s, 0, 0, s, -b.minX * s, -b.minY * s);
    for (var k = 0; k < this.objects.length; k++) this._drawObject(this.objects[k]);
    for (var t = 0; t < this.childStrokes.length; t++) this._drawStroke(this.childStrokes[t]);
    octx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx = realCtx;
    try { return off.toDataURL("image/png"); } catch (e) { return null; }
  };

  VelaBoard.COLORS = COLORS;
  // ייצוא פונקציות גאומטריה לבדיקה ב-Node
  VelaBoard._geom = { distToSeg: distToSeg, nearPolyline: nearPolyline, pointInPoly: pointInPoly, bboxOf: bboxOf, eraseStroke: eraseStroke, hexToRgba: hexToRgba, classifyStroke: classifyStroke, rdp: rdp, angleAt: angleAt };
  global.VelaBoard = VelaBoard;
})(typeof window !== "undefined" ? window : this);
