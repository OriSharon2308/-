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
        ${ring}${badge}${tip}${orb}
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
  function initParallax() {
    if (REDUCED) return;
    const layers = [...document.querySelectorAll("[data-depth]")];
    let raf = 0, mx = 0, my = 0;
    sky.addEventListener("pointermove", (e) => {
      const vp = viewport();
      if (!vp.ok) return;
      mx = (e.clientX / vp.w - 0.5) * 2;
      my = (e.clientY / vp.h - 0.5) * 2;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
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
    if (REDUCED) return;
    const tx = parseFloat(el.style.getPropertyValue("--tx")) || 0;
    const ty = parseFloat(el.style.getPropertyValue("--ty")) || 0;
    // 0° של החללית = אף כלפי מעלה; ולכן +90
    const deg = (Math.atan2(ty - parked.y, tx - parked.x) * 180) / Math.PI + 90;
    setShip(parked.x, parked.y, deg);
  }
  function flyTo(el, done) {
    const tx = parseFloat(el.style.getPropertyValue("--tx")) || 0;
    const ty = parseFloat(el.style.getPropertyValue("--ty")) || 0;
    if (REDUCED) return done();
    const deg = (Math.atan2(ty - parked.y, tx - parked.x) * 180) / Math.PI + 90;
    ship.classList.add("ship--warp");
    setShip(tx, ty, deg);
    setTimeout(done, 900);
  }

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
    $("#planets").innerHTML = planets.map((p, i) => planetHtml(p, states[i])).join("");
    // איור מציין-מקום שעוד לא קיים (למשל thinking.png) — נשאר כדור צבעוני נקי, בלי אייקון שבור
    document.querySelectorAll(".planet__art").forEach((img) => img.addEventListener("error", () => img.remove()));
    $("#sunLabel").textContent = cfg.label;
    const doneN = states.filter((s) => s.state === "done").length;
    $("#hudSub").textContent = `${cfg.label} · ${planets.length} נושאים`;
    $("#hudStat").innerHTML = `⭐ <span>${doneN} / ${planets.length}</span>`;

    layoutWhenReady();
    initParallax();
    addEventListener("resize", () => { layout(); parkShip(); });
    // גם שינוי-גודל של האלמנט עצמו (פאנל שנפתח, סיבוב מכשיר) מפעיל פריסה מחדש
    if (window.ResizeObserver) new ResizeObserver(() => { layout(); parkShip(); }).observe(document.body);

    document.querySelectorAll(".planet").forEach((el) => {
      el.addEventListener("pointerenter", () => faceTo(el));
      el.addEventListener("focus", () => faceTo(el));
      el.addEventListener("click", () => {
        $("#hint").classList.add("hint--gone");
        flyTo(el, () => {
          location.href = `/learn-board?topic=${encodeURIComponent(el.dataset.key)}`;
        });
      });
    });
    sky.addEventListener("pointerleave", () => setShip(parked.x, parked.y, 0));

    $("#boot").hidden = true;
    sky.hidden = false;
  }

  boot();
})();
