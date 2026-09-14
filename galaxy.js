/* eslint-disable no-console */
/**
 * vela · גלקסיית הנושאים.
 *
 * אילו כוכבים יש — קובע השרת: /api/topics?area=learn מחזיר את נושאי
 * אזור-הלמידה של הכיתה. איך כל כוכב נראה ואיפה הוא עומד — galaxy-data.js.
 *
 * ההתקדמות אמיתית: אותה תשובה מחזירה כמה שאלות יש בכל רמה וכמה נפתרו.
 * הכוכב לא נעול לעולם — הצבע והסימון מספרים את הסיפור, אבל כל נושא
 * פתוח לבחירה תמיד.
 */
(function () {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sky = $("#sky");

  /* ---------- עזרים ---------- */
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  async function api(path) {
    const r = await fetch(path, { cache: "no-store" });
    if (r.status === 401) { location.href = "/auth"; throw new Error("auth"); }
    return r.json();
  }

  /* ---------- רקע: כוכבים ---------- */
  function seedStars(el, n, maxR) {
    let html = "";
    for (let i = 0; i < n; i++) {
      const s = (Math.random() * maxR + 0.6).toFixed(1);
      html += `<i style="left:${(Math.random() * 100).toFixed(1)}%;top:${(Math.random() * 100).toFixed(1)}%;
        width:${s}px;height:${s}px;opacity:${(Math.random() * 0.55 + 0.3).toFixed(2)};
        animation-delay:${(Math.random() * 3.6).toFixed(1)}s"></i>`;
    }
    el.innerHTML = html;
  }

  /* ---------- חישוב מצב הנושא מנתונים אמיתיים ---------- */
  function statusOf(pct, attempts) {
    if (pct >= 100) return "done";
    if (attempts > 0) return "now";
    return "new";
  }

  /** התקדמות של נושא. היא נשמרת רק על נושאי-עלה, ולכן נושא-אב (עם sub)
      הוא סכום תתי-הנושאים שלו. נספרות רק רמות שיש בהן שאלות במאגר, וכל
      רמה מוגבלת למספר השאלות שבה — רשומה ברמה אחרת לא מנפחת את האחוז. */
  function progressOf(topic, solved, levels) {
    const keys = Array.isArray(topic.sub) && topic.sub.length ? topic.sub.map((s) => s.key) : [topic.key];
    let got = 0, tot = 0;
    for (const k of keys) {
      const s = solved[k] || {};
      const l = levels[k] || {};
      for (const lv of Object.keys(l)) {
        const n = Math.max(0, Number(l[lv]) || 0);
        tot += n;
        got += Math.min(Math.max(0, Number(s[lv]) || 0), n);
      }
    }
    // floor: 100% רק כשבאמת הכל נפתר, לא בעיגול של 99.6
    const pct = tot > 0 ? Math.min(100, Math.max(0, Math.floor((got / tot) * 100))) : 0;
    return { pct, attempts: got };
  }

  /* ---------- בניית כוכב ---------- */
  function planetHtml(p, st) {
    const C = 2 * Math.PI * 47;
    const ring =
      st.pct > 0 && st.pct < 100
        ? `<svg class="ring" viewBox="0 0 100 100"><circle cx="50" cy="50" r="47" stroke="rgba(255,255,255,.18)"/>
           <circle cx="50" cy="50" r="47" stroke="#3fd6c4" stroke-dasharray="${C.toFixed(0)}"
           stroke-dashoffset="${(C * (1 - st.pct / 100)).toFixed(0)}"/></svg>`
        : "";
    const badge = st.state === "done" ? `<span class="badge">⭐</span>` : "";
    const tip = st.recommended ? `<span class="tip">מומלץ עכשיו</span>` : "";
    // מציין-מקום עד שיגיעו איורי הכוכבים; image !== null → משתמשים בקובץ הסופי
    const orb = p.image
      ? `<img src="${esc(p.image)}" alt="" />`
      : `<img class="planet__art" src="/images/topics/${esc(p.art)}.png" alt="" />`;
    const sub =
      st.state === "done" ? "הושלם" : st.pct > 0 ? `${st.pct}%` : "טרם התחלנו";

    return `<button class="planet planet--${st.state}" type="button"
       data-key="${esc(p.key)}" data-angle="${p.angle}" data-ring="${p.ring}"
       style="--hue:${esc(p.hue)}" aria-label="${esc(p.key)} — ${esc(sub)}">
      <span class="planet__orb ${p.image ? "" : "planet__orb--ph"}"
            style="--dur:${(6 + Math.random() * 3).toFixed(1)}s;--delay:${(Math.random() * 3).toFixed(1)}s">
        <span class="planet__glow"></span>${ring}${badge}${tip}${orb}
      </span>
      <span class="planet__name">${esc(p.key)}</span>
      <span class="planet__sub">${esc(sub)}</span>
    </button>`;
  }

  /* ---------- פריסה: מערכת-שמש במבט אלכסוני ----------
     המסלול הוא עיגול שנמעך אנכית ב-tilt, ולכן נראה כאליפסה. הכוכב
     בתחתית האליפסה קרוב לצופה — גדול ובהיר; בראשה רחוק — קטן ועמום.
     הכל נכנס למסך אחד; אין גלילה ואין גרירה.                        */
  let CFG = null;

  /** מידות הצפייה, עם נפילה-לאחור. חלק מהדפדפנים/מסגרות מחזירים 0 לפני
      הצביעה הראשונה, ואז כל החישוב מתאפס והכוכבים נערמים במרכז. */
  function viewport() {
    const d = document.documentElement;
    const w = innerWidth || d.clientWidth || document.body.clientWidth || 0;
    const h = innerHeight || d.clientHeight || document.body.clientHeight || 0;
    return { w, h, ok: w > 120 && h > 120 };
  }

  function layout() {
    const vp = viewport();
    if (!vp.ok || !CFG) return false;
    const { w, h } = vp;
    const small = Math.min(w, h) < 600;
    const rx0 = Math.min(w * 0.455, h * 0.95); // חצי-רוחב המערכת
    const tilt = CFG.tilt || 0.42;

    // טבעות-המסלול עצמן
    const rings = document.getElementById("rings");
    if (rings) {
      rings.innerHTML = (CFG.rings || [])
        .map((r) => {
          const rw = rx0 * r * 2, rh = rx0 * r * tilt * 2;
          return `<span class="ring-o" style="width:${rw.toFixed(0)}px;height:${rh.toFixed(0)}px"></span>`;
        })
        .join("");
    }

    document.querySelectorAll(".planet").forEach((el) => {
      const a = (+el.dataset.angle * Math.PI) / 180;
      const r = +el.dataset.ring;
      const x = Math.cos(a) * rx0 * r;
      const y = Math.sin(a) * rx0 * r * tilt;
      // 0 = הרחוק ביותר (מאחורי השמש), 1 = הקרוב ביותר (לפנים)
      const depth = (y / (rx0 * tilt) + 1) / 2;
      const d = Math.min(w, h) * ((small ? 0.070 : 0.082) + depth * (small ? 0.042 : 0.052));

      el.style.setProperty("--tx", `${x.toFixed(1)}px`);
      el.style.setProperty("--ty", `${y.toFixed(1)}px`);
      el.style.setProperty("--s", "1");
      el.style.zIndex = String(10 + Math.round(depth * 40)); // קרוב מסתיר רחוק
      el.style.opacity = (0.68 + depth * 0.32).toFixed(2);   // אווירת-מרחק
      el.querySelector(".planet__orb").style.setProperty("--d", `${d.toFixed(0)}px`);
    });
    return true;
  }

  function layoutWhenReady(tries = 0) {
    if (layout()) { parkShip(); return; }
    if (tries > 120) return;
    requestAnimationFrame(() => layoutWhenReady(tries + 1));
  }

  /* ---------- parallax עדין ----------
     המערכת נשארת במקום; רק השכבות נעות מעט עם העכבר כדי לתת עומק. */
  // בזמן שיגור השכבות קופאות בדיוק איפה שהן — בלי לקפוץ חזרה ל-0
  let parallaxPaused = false;

  function initParallax() {
    if (REDUCED) return;
    const layers = [...document.querySelectorAll("[data-depth]")];
    let raf = 0, mx = 0, my = 0;
    sky.addEventListener("pointermove", (e) => {
      if (parallaxPaused) return;
      const vp = viewport();
      if (!vp.ok) return;
      mx = (e.clientX / vp.w - 0.5) * 2;
      my = (e.clientY / vp.h - 0.5) * 2;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (parallaxPaused) return; // פריים שהוזמן רגע לפני השיגור — לא נכתב
        for (const l of layers) {
          const d = +l.dataset.depth * 90;
          const base = l.classList.contains("sun") ? "translate(50%,-50%) " : "";
          l.style.transform = `${base}translate3d(${(-mx * d).toFixed(1)}px, ${(-my * d).toFixed(1)}px, 0)`;
        }
      });
    });
  }

  /* ---------- החללית ---------- */
  const ship = $("#ship");
  let parked = { x: 0, y: 0 };

  function parkShip() {
    const vp = viewport();
    if (!vp.ok) return;
    const r = Math.min(vp.w, vp.h) * 0.19;
    parked = { x: 0, y: r };
    setShip(parked.x, parked.y, 0);
  }
  function setShip(x, y, rot) {
    ship.style.setProperty("--sx", `${x.toFixed(0)}px`);
    ship.style.setProperty("--sy", `${y.toFixed(0)}px`);
    ship.style.setProperty("--sr", `${rot.toFixed(1)}deg`);
  }
  /** מפנה את החללית אל כוכב מרוחף — בלי לעוף אליו. */
  function faceTo(el) {
    if (REDUCED || launching) return;
    const tx = parseFloat(el.style.getPropertyValue("--tx")) || 0;
    const ty = parseFloat(el.style.getPropertyValue("--ty")) || 0;
    // 0° של החללית = אף כלפי מעלה; ולכן +90
    const deg = (Math.atan2(ty - parked.y, tx - parked.x) * 180) / Math.PI + 90;
    setShip(parked.x, parked.y, deg);
  }
  /* ---------- טיסת החללית ----------
     כל התנועה נבנית מראש כ-keyframes של transform ו-opacity על מיכל החללית
     (#ship), לפי "צילום" של נקודת-המוצא והיעד ברגע הלחיצה: אין חישוב באמצע
     הטיסה, ושינוי-גודל לא מעקם את המסלול. אמנות חללית עתידית צריכה רק את
     .ship__flame ואת .ship__glow — הלוגיקה לא נוגעת ב-SVG עצמו.           */
  const T_TURN = 200;    // פנייה אל הכוכב
  const T_LEAN = 150;    // הירתעות קטנה לאחור...
  const T_LAUNCH = 250;  // ...ואז הזינוק
  const T_FADE = 830;    // החללית נכנסת לכוכב: נעלמת ומתכווצת
  const T_ARRIVE = 950;
  const SAMPLE_MS = 20;  // צפיפות ה-keyframes; הדפדפן מחבר ביניהם בקו ישר
  const CURVE = 0.055;   // גובה הקשת — 5.5% מאורך הדרך (עד 40px, ובמסך קטן עד 20px)
  const SUN_MARGIN = 12; // מרווח-נשימה סביב השמש, מעבר לחצי רוחב החללית
  const CURVE_MAX_BLOCKED = 130, CURVE_MAX_BLOCKED_SMALL = 62; // קשת חריגה — רק כשהשמש חוסמת
  const BANK = 5;        // הטיה נוספת לתוך הפנייה, במעלות

  // מצבי-המנוע: להבה (רוחב × אורך — מתארכת יותר משהיא מתרחבת) וזוהר.
  // ENGINE_AT קובע מתי כל מצב מגיע.
  const ENGINE = {
    idle:     { flameX: 1,    flameY: 1,    glow: 0, glowScale: 0.7 },
    aim:      { flameX: 1,    flameY: 1.08, glow: 0, glowScale: 0.7 },
    ignition: { flameX: 1.12, flameY: 1.5,  glow: 1, glowScale: 1 },
    boost:    { flameX: 1.18, flameY: 1.7,  glow: 1, glowScale: 1.12 },
    arrival:  { flameX: 1,    flameY: 1.1,  glow: 0, glowScale: 0.85 },
  };
  const ENGINE_AT = [[0, "idle"], [120, "aim"], [270, "ignition"], [450, "boost"], [760, "boost"], [920, "arrival"], [950, "arrival"]];

  /** כמו cubic-bezier של CSS — כדי לחשב את התאוצה בתוך ה-keyframes. */
  function cubicBezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const X = (t) => ((ax * t + bx) * t + cx) * t;
    const Y = (t) => ((ay * t + by) * t + cy) * t;
    const dX = (t) => (3 * ax * t + 2 * bx) * t + cx;
    return (x) => {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let t = x;
      for (let i = 0; i < 8; i++) {
        const d = dX(t);
        if (Math.abs(d) < 1e-6) break;
        t = Math.min(1, Math.max(0, t - (X(t) - x) / d));
      }
      return Y(t);
    };
  }
  const turnEase = cubicBezier(0.2, 0.8, 0.3, 1);
  // איטי בהתחלה ו-BOOST בחצי השני. רכה מעט מ-(.55,.05,.75,.35), כדי שהחללית
  // תעבור ~70% מהדרך לפני שהיא מתחילה להיעלם — ולא תימוג באמצע החלל.
  const boostEase = cubicBezier(0.45, 0, 0.7, 0.45);

  const bez = (a, c, b, p) => (1 - p) * (1 - p) * a + 2 * (1 - p) * p * c + p * p * b;
  const bezD = (a, c, b, p) => 2 * (1 - p) * (c - a) + 2 * p * (b - c);
  /** כיוון החללית בנקודה p של המסלול. 0° = אף למעלה. */
  const headingAt = (f, p) =>
    (Math.atan2(bezD(f.S.y, f.C.y, f.T.y, p), bezD(f.S.x, f.C.x, f.T.x, p)) * 180) / Math.PI + 90;
  /** אותה זווית, בגרסה הקרובה ביותר ל-ref — הפנייה תמיד הקצרה (לא 300° סביב). */
  const nearAngle = (a, ref) => ref + ((((a - ref) % 360) + 540) % 360) - 180;

  /** הזווית שרואים עכשיו — גם באמצע סיבוב ה-hover. */
  function currentRotation() {
    const tr = getComputedStyle(ship).transform;
    if (!tr || tr === "none" || !window.DOMMatrixReadOnly) return 0;
    const m = new DOMMatrixReadOnly(tr);
    return (Math.atan2(m.b, m.a) * 180) / Math.PI;
  }

  /** "צילום" של הטיסה: מוצא, נקודת-זינוק, יעד, ונקודת-שליטה לקשת עדינה. */
  function planFlight(el) {
    const vp = viewport();
    const small = Math.min(vp.w, vp.h) < 600;
    const P = { x: parked.x, y: parked.y };
    const T = { x: parseFloat(el.style.getPropertyValue("--tx")) || 0, y: parseFloat(el.style.getPropertyValue("--ty")) || 0 };
    const dist = Math.hypot(T.x - P.x, T.y - P.y) || 1;
    const u = { x: (T.x - P.x) / dist, y: (T.y - P.y) / dist }; // כיוון הזינוק
    const n = { x: -u.y, y: u.x };                              // ניצב לו
    // הקשת פונה לצד שבו כבר נמצא אמצע הדרך — הרחק מהשמש שבמרכז (0,0).
    // דטרמיניסטי: אותו כוכב, אותה קשת, בכל שיגור.
    const mid = ((P.x + T.x) / 2) * n.x + ((P.y + T.y) / 2) * n.y;
    const side0 = Math.abs(mid) > 1 ? Math.sign(mid) : T.x >= 0 ? 1 : -1;
    const hBase = Math.min(dist * CURVE, small ? 20 : 40);
    const lean = small ? 2 : 3;
    const S = { x: P.x - u.x * lean, y: P.y - u.y * lean };
    // בקשת ריבועית הסטייה המרבית היא חצי מהזזת נקודת-השליטה — ולכן 2h
    const ctrl = (side, h) => ({ x: (S.x + T.x) / 2 + n.x * side * 2 * h, y: (S.y + T.y) / 2 + n.y * side * 2 * h });

    // אזור-ביטחון סביב השמש: רדיוס השמש + חצי חללית + מרווח. אם המוצא או היעד
    // עצמם בתוכו (מסך קטן, כוכב שמאחורי השמש), דורשים רק לא להתקרב יותר מהם.
    const sun = $("#sun");
    const zone = Math.min((sun ? sun.offsetWidth / 2 : 0) + ship.offsetWidth / 2 + SUN_MARGIN,
      Math.hypot(S.x, S.y) - 1, Math.hypot(T.x, T.y) - 1);
    const clearance = (C) => {
      let m = Infinity;
      for (let i = 0; i <= 48; i++) {
        const p = i / 48;
        m = Math.min(m, Math.hypot(bez(S.x, C.x, T.x, p), bez(S.y, C.y, T.y, p)) - zone);
      }
      return m;
    };
    // הקשת הרגילה אם היא לא חותכת את השמש. אחרת מגדילים אותה בהדרגה, בשני
    // הצדדים, עד הקשת הקטנה ביותר שעוקפת; אם אין כזו עד התקרה — זו שהכי רחוקה.
    // כלל גאומטרי בלבד: אין כאן שום שם של נושא.
    const hMax = Math.max(hBase, small ? CURVE_MAX_BLOCKED_SMALL : CURVE_MAX_BLOCKED);
    let pick = null, widest = null;
    search: for (let h = hBase; h <= hMax + 1e-6; h += 2) {
      for (const side of [side0, -side0]) {
        const cl = clearance(ctrl(side, h));
        if (cl >= 0) { pick = { h, side }; break search; }
        if (!widest || cl > widest.cl) widest = { h, side, cl };
      }
    }
    const { h, side } = pick || widest;
    return { P, S, C: ctrl(side, h), T, h, hBase, side, zone, clear: !!pick, dist };
  }

  /** קנה-מידה בזמן הטיסה: גדל מעט, ואז קטן כשהחללית "מתרחקת" אל הכוכב. */
  function flightScale(q) {
    const qFade = (T_FADE - T_LAUNCH) / (T_ARRIVE - T_LAUNCH);
    if (q < 0.35) return 1 + 0.03 * Math.sin(((q / 0.35) * Math.PI) / 2);
    if (q < qFade) {
      const k = (q - 0.35) / (qFade - 0.35);
      return 1.03 - 0.11 * k * k * (3 - 2 * k);
    }
    return 0.92 - 0.17 * ((q - qFade) / (1 - qFade));
  }

  /** פנייה → הירתעות → זינוק בקשת → כניסה לכוכב, ומנוע שמתעורר בהתאם. */
  function flightAnimations(el, r0) {
    const f = planFlight(el);
    const a0 = nearAngle(headingAt(f, 0), r0);
    const bankDir = Math.sign(nearAngle(headingAt(f, 1), a0) - a0) || 1;
    const frames = [];
    let heading = a0;
    for (let i = 0; ; i++) {
      const t = Math.min(i * SAMPLE_MS, T_ARRIVE);
      let x = f.P.x, y = f.P.y, rot = a0, s = 1, o = 1;
      if (t < T_TURN) rot = r0 + (a0 - r0) * turnEase(t / T_TURN);
      if (t > T_LEAN && t < T_LAUNCH) {
        const k = (t - T_LEAN) / (T_LAUNCH - T_LEAN);
        const e = 1 - (1 - k) * (1 - k);
        x = f.P.x + (f.S.x - f.P.x) * e;
        y = f.P.y + (f.S.y - f.P.y) * e;
      }
      if (t >= T_LAUNCH) {
        const q = (t - T_LAUNCH) / (T_ARRIVE - T_LAUNCH);
        const p = boostEase(q);
        x = bez(f.S.x, f.C.x, f.T.x, p);
        y = bez(f.S.y, f.C.y, f.T.y, p);
        heading = nearAngle(headingAt(f, p), heading);
        rot = heading + bankDir * BANK * Math.sin(Math.PI * q); // חוזרת לאפס ליד הכוכב
        s = flightScale(q);
        if (t > T_FADE) o = 1 - (t - T_FADE) / (T_ARRIVE - T_FADE);
      }
      frames.push({
        offset: t / T_ARRIVE,
        transform: `translate(50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${rot.toFixed(2)}deg) scale(${s.toFixed(3)})`,
        opacity: +o.toFixed(3),
      });
      if (t >= T_ARRIVE) break;
    }
    const anims = [ship.animate(frames, { duration: T_ARRIVE, fill: "forwards" })];
    const at = ([t, state]) => ({ offset: t / T_ARRIVE, easing: "ease-out", ...ENGINE[state] });
    const flame = ship.querySelector(".ship__flame");
    const glow = ship.querySelector(".ship__glow");
    if (flame) {
      anims.push(flame.animate(ENGINE_AT.map(at).map((k) => ({ offset: k.offset, easing: k.easing, transform: `scale(${k.flameX}, ${k.flameY})` })),
        { duration: T_ARRIVE, fill: "forwards" }));
    }
    if (glow) {
      anims.push(glow.animate(ENGINE_AT.map(at).map((k) => ({ offset: k.offset, easing: k.easing, opacity: k.glow,
        transform: `translate(-50%, -50%) scale(${k.glowScale})` })), { duration: T_ARRIVE, fill: "forwards" }));
    }
    return anims;
  }

  /** הכוכב "מקבל" את החללית: ברבע-השנייה האחרון גדל מעט וזוהר. */
  function receiveAnimations(el) {
    const from = T_ARRIVE - 250;
    const out = [el.animate([{ transform: planetTransform(el, 1.07) }, { transform: planetTransform(el, 1.125) }],
      { delay: from, duration: 250, easing: "cubic-bezier(.2,.8,.3,1)", fill: "forwards" })];
    const g = el.querySelector(".planet__glow");
    if (g) out.push(g.animate([{ opacity: 0 }, { opacity: 0.85 }], { delay: from, duration: 250, easing: "ease-out", fill: "forwards" }));
    return out;
  }

  /* ---------- שיגור: מכונת-מצבים קטנה ----------
     לחיצה ראשונה נועלת את היעד ומתחילה רצף אחד. לחיצה נוספת — בכל מקום
     במסך — מדלגת על מה שנשאר ונכנסת מיד לשיעור של הכוכב הראשון.
     navigationStarted מבטיח שהניווט קורה פעם אחת בלבד.                */
  const TRANSITION_KEY = "velaGalaxyTransition"; // נקרא ב-learn-board.html
  const COVER_AT = 700;     // הכיסוי מתחיל להתמלא — אחרי שרואים את ה-BOOST
  const COVER_MS = 380;     // ...ואטום לגמרי ב-1080 (החללית כבר נעלמה ב-950)
  const SKIP_MS = 110;      // דילוג: נסגר כמעט מיד, בלי הבזק לבן
  const REDUCED_MS = 140;   // תנועה מופחתת: רק מעבר-צבע קצר
  const WATCHDOG_MS = 2500; // רשת-ביטחון אם אנימציה לא מסתיימת (למשל לשונית ברקע)
  const RETRY_MS = 1500;    // עדיין כאן אחרי הניווט (Stop / שרת רדום)? הקשה מנסה שוב
  const STUCK_MS = 10000;   // ...ואם עדיין כאן — הגלקסיה חוזרת, לא נשארים מול מסך צבעוני

  const cover = $("#warpCover");
  const hud = $(".hud");
  const byKey = new Map(); // שם-נושא → הגדרת-המראה (hue, art)
  let launching = false;
  let launchTarget = null;
  let navigationStarted = false;
  let skipped = false;
  let navUrl = "", navAt = 0;
  let pressAnim = null, coverAnim = null, watchdog = 0, stuckTimer = 0;
  let launchAnims = [];  // החללית, המנוע והכוכב שמקבל אותה
  let launchVp = null;   // גודל המסך ברגע השיגור

  /** "כן — בחרת את העולם הזה": פולס קצר על הכוכב עצמו. ה-translate נכתב
      במספרים ולא ב-var() כדי שהמיקום יישמר בדיוק; את --d ואת ה-float של
      הכדור לא נוגעים. מתחילים מ-1.12 אם העכבר כבר הגדיל אותו ב-hover. */
  function planetTransform(el, s) {
    const tx = el.style.getPropertyValue("--tx") || "0px";
    const ty = el.style.getPropertyValue("--ty") || "0px";
    return `translate(calc(50% + ${tx}), calc(-50% + ${ty})) scale(${s})`;
  }
  function pressFrames(el) {
    const at = (s) => planetTransform(el, s);
    const from = el.matches(":hover") && matchMedia("(hover: hover) and (pointer: fine)").matches ? 1.12 : 1;
    return [
      { transform: at(from), easing: "cubic-bezier(.2,.9,.3,1.25)" },
      { transform: at(1.13), offset: 70 / 150, easing: "ease-out" },
      { transform: at(1.07) },
    ];
  }

  function startLaunch(el) {
    launching = true;
    launchTarget = el;
    navigationStarted = false;
    skipped = false;
    launchVp = viewport();
    parallaxPaused = true;
    sky.classList.add("is-launching"); // מעמעם את השאר, חוסם לחיצות על כוכבים (CSS)
    hud.inert = true; // גם כפתור-החזרה: לחיצה עליו היא "דילוג", לא ניווט שני ל-/learn
    el.classList.add("is-picked");
    cover.style.background = (byKey.get(el.dataset.key) || {}).hue || "#0e4a63";
    cover.hidden = false;
    // נרשם אחרי ה-pointerdown של הלחיצה הראשונה, ולכן תופס רק את השנייה
    document.addEventListener("pointerdown", skipLaunch, true);
    watchdog = setTimeout(navigate, WATCHDOG_MS);

    if (REDUCED) return fillCover(0, REDUCED_MS, "ease-out");
    if (el.animate) {
      const r0 = currentRotation(); // לפני שמבטלים את מעבר-ה-hover — מתחילים מהזווית שרואים
      ship.style.transition = "none"; // מעבר CSS שרץ היה גובר על אנימציית-הטיסה
      pressAnim = el.animate(pressFrames(el), { duration: 150, fill: "forwards" });
      launchAnims = flightAnimations(el, r0).concat(receiveAnimations(el));
    }
    fillCover(COVER_AT, COVER_MS, "cubic-bezier(.65,0,.35,1)");
  }

  /** ממלא את הכיסוי עד אטימות מלאה ומנווט כשהוא אטום. קריאה נוספת (דילוג)
      ממשיכה מהאטימות הנוכחית ומחליפה את האנימציה — לא שרשרת שנייה. */
  function fillCover(delay, duration, easing) {
    if (!cover.animate) { cover.style.opacity = "1"; return navigate(); }
    const from = coverAnim ? Number(getComputedStyle(cover).opacity) || 0 : 0;
    if (coverAnim) coverAnim.cancel();
    const a = cover.animate({ opacity: [from, 1] }, { delay, duration, easing, fill: "forwards" });
    coverAnim = a;
    a.finished.then(() => { if (coverAnim === a) navigate(); }, () => { /* בוטלה: דילוג או חזרה */ });
  }

  /** לחיצה שנייה בזמן השיגור: קדימה מיד לשיעור של הכוכב הראשון. */
  function skipLaunch() {
    if (!launching) return;
    if (navigationStarted) {
      // הניווט כבר יצא ועדיין אנחנו כאן (הילד עצר את הטעינה, או שהשרת מתעורר):
      // הקשה מנסה שוב — לאותו כוכב, ולא יותר מפעם ב-1.5 שניות
      if (performance.now() - navAt > RETRY_MS) { navAt = performance.now(); location.href = navUrl; }
      return;
    }
    if (skipped) return;
    skipped = true;
    launchAnims.forEach((a) => a.pause()); // החללית קופאת במקומה — בלי לקפוץ חזרה
    fillCover(0, SKIP_MS, "ease-out");
  }

  function navigate() {
    if (navigationStarted || !launchTarget) return;
    navigationStarted = true;
    clearTimeout(watchdog);
    cover.style.opacity = "1"; // גם אם הגענו לכאן מרשת-הביטחון — לא יוצאים מדף שקוף-למחצה
    const key = launchTarget.dataset.key;
    const v = byKey.get(key) || {};
    try {
      sessionStorage.setItem(TRANSITION_KEY, JSON.stringify({ hue: v.hue, art: v.art, topic: key, timestamp: Date.now() }));
    } catch (e) { /* פרטיות/מכסה — השיעור ייפתח בלי כיסוי-הגעה */ }
    navUrl = `/learn-board?topic=${encodeURIComponent(key)}`;
    navAt = performance.now();
    // אם הדף עדיין חי אחרי 10 שניות, הניווט נעצר או תקוע — מחזירים את הגלקסיה
    stuckTimer = setTimeout(resetLaunch, STUCK_MS);
    location.href = navUrl;
  }

  /** מחזיר את הגלקסיה למצב שמיש לגמרי. נקרא כש-Safari משחזר את הדף מה-bfcache
      אחרי "חזרה" (אחרת הילד היה רואה מסך צבעוני קפוא), וגם כשניווט נתקע. */
  function resetLaunch() {
    clearTimeout(watchdog);
    clearTimeout(stuckTimer);
    document.removeEventListener("pointerdown", skipLaunch, true);
    hud.inert = false;
    navUrl = "";
    if (coverAnim) coverAnim.cancel();
    if (pressAnim) pressAnim.cancel();
    coverAnim = pressAnim = null;
    cover.hidden = true;
    cover.style.opacity = "";
    sky.classList.remove("is-launching");
    document.querySelectorAll(".planet.is-picked").forEach((p) => p.classList.remove("is-picked"));
    // החללית חוזרת לחנייה מיד — בלי לטוס אחורה מול הילד. הפריסה מתעדכנת
    // למקרה שהמסך השתנה בזמן השיגור (אז לא פרסנו מחדש).
    ship.style.transition = "none";
    launchAnims.forEach((a) => a.cancel());
    launchAnims = [];
    launchVp = null;
    layout();
    parkShip();
    void ship.offsetWidth;
    ship.style.transition = "";
    launching = false;
    launchTarget = null;
    navigationStarted = false;
    skipped = false;
    parallaxPaused = false;
    try { sessionStorage.removeItem(TRANSITION_KEY); } catch (e) { /* לא קריטי */ }
  }
  addEventListener("pageshow", (e) => { if (e.persisted) resetLaunch(); });

  /** אין מה להציג (אין הגדרת-מראה לכיתה, או שהשרת לא ענה) — הודעה ברורה
      במקום ספינר שמסתובב לנצח. */
  function unavailable() {
    $("#boot").innerHTML =
      `<p class="boot__msg">הגלקסיה של הכיתה שלך עוד בבנייה ✨<br /><a href="/learn">חזרה לנושאים</a></p>`;
  }

  /* ---------- עלייה ---------- */
  async function boot() {
    seedStars($("#starsFar"), 110, 1.6);
    seedStars($("#starsMid"), 60, 2.4);

    let data;
    try { data = await api("/api/topics?area=learn"); } catch (e) {
      if (e.message !== "auth") unavailable(); // ב-401 כבר עוברים ל-/auth
      return;
    }
    const gradeNum = data.gradeNum;
    const cfg = (window.GALAXY || {})[gradeNum];

    // אילו כוכבים יש = השרת. איך הם נראים = galaxy-data.js.
    const topics = Array.isArray(data.topics) ? data.topics : [];
    const visuals = (cfg && cfg.visuals) || {};
    const planets = [];
    const noVisual = [];
    for (const t of topics) {
      const v = visuals[t.key];
      if (v) planets.push({ ...v, key: t.key, topic: t });
      else noVisual.push(t.key);
    }
    if (noVisual.length) {
      console.warn(`[galaxy] לנושאים האלה של כיתה ${gradeNum} אין הגדרת-מראה ב-galaxy-data.js, ולכן הם לא מוצגים:`, noVisual);
    }
    const extra = Object.keys(visuals).filter((k) => !topics.some((t) => t.key === k));
    if (extra.length) {
      console.warn("[galaxy] הגדרת-מראה לנושא שאינו באזור הלמידה — לא נוצר כוכב:", extra);
    }
    if (!cfg || !planets.length) return unavailable();

    const solved = data.solved || {};
    const levels = data.topicLevels || {};
    const states = planets.map((p) => {
      const { pct, attempts } = progressOf(p.topic, solved, levels);
      return { pct, attempts, state: statusOf(pct, attempts), recommended: false };
    });
    // מומלץ = הראשון שהתחילו ולא סיימו; אחרת הראשון שטרם התחיל
    let rec = states.findIndex((s) => s.state === "now");
    if (rec < 0) rec = states.findIndex((s) => s.state === "new");
    if (rec >= 0) states[rec].recommended = true;

    CFG = cfg;
    planets.forEach((p) => byKey.set(p.key, p));
    $("#planets").innerHTML = planets.map((p, i) => planetHtml(p, states[i])).join("");
    // איור מציין-מקום שעוד לא קיים (למשל thinking.png) — נשאר כדור צבעוני נקי, בלי אייקון שבור
    document.querySelectorAll(".planet__art").forEach((img) => img.addEventListener("error", () => img.remove()));
    $("#sunLabel").textContent = cfg.label;
    const doneN = states.filter((s) => s.state === "done").length;
    $("#hudSub").textContent = `${cfg.label} · ${planets.length} נושאים`;
    $("#hudStat").innerHTML = `⭐ <span>${doneN} / ${planets.length}</span>`;

    layoutWhenReady();
    initParallax();
    // בזמן שיגור לא פורסים מחדש — המסלול נשען על "צילום" מרגע הלחיצה. שינוי
    // ממשי (סיבוב מכשיר) באמצע השיגור = דילוג לשיעור, במקום מסלול שבור.
    const relayout = () => {
      if (launching) {
        const vp = viewport();
        const moved = launchVp && (Math.abs(vp.w - launchVp.w) > launchVp.w * 0.08 || Math.abs(vp.h - launchVp.h) > launchVp.h * 0.08);
        if (moved) skipLaunch();
        return;
      }
      layout();
      parkShip();
    };
    addEventListener("resize", relayout);
    // גם שינוי-גודל של האלמנט עצמו (פאנל שנפתח, סיבוב מכשיר) מפעיל פריסה מחדש
    if (window.ResizeObserver) new ResizeObserver(relayout).observe(document.body);

    document.querySelectorAll(".planet").forEach((el) => {
      el.addEventListener("pointerenter", () => faceTo(el));
      el.addEventListener("focus", () => faceTo(el));
      el.addEventListener("click", () => {
        if (launching) return skipLaunch(); // לחיצה שנייה (גם במקלדת) = דילוג; היעד לא משתנה
        startLaunch(el);
      });
    });
    sky.addEventListener("pointerleave", () => { if (!launching) setShip(parked.x, parked.y, 0); });

    $("#boot").hidden = true;
    sky.hidden = false;
  }

  boot();
})();
