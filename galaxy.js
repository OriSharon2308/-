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

  /* ---------- רקע: שמיים קבועים ----------
     זרע קבוע → אותו פיזור בכל כניסה: שמיים "מעוצבים" ולא רעש אקראי. רוב
     הכוכבים סטטיים ורק מעטים מנצנצים — פחות אלמנטים מונפשים, פחות עבודה. */
  function seeded(seed) {
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function paintSky() {
    const r = seeded(20260917);
    const star = (size, opacity, twinkle) =>
      `<i class="star${twinkle ? " star--tw" : ""}" style="left:${(r() * 100).toFixed(1)}%;top:${(r() * 100).toFixed(1)}%;` +
      `width:${size}px;height:${size}px;opacity:${opacity}${twinkle ? `;animation-delay:${(-r() * 4).toFixed(1)}s` : ""}"></i>`;
    // מסך קטן מקבל פחות כוכבים מהבהבים — אותה אווירה, פחות עבודה למכשיר
    const lite = Math.min(innerWidth, innerHeight) < 600;
    let far = "", mid = "";
    for (let i = 0; i < (lite ? 55 : 90); i++) far += star((0.8 + r() * 0.9).toFixed(1), (0.25 + r() * 0.4).toFixed(2), false);
    for (let i = 0; i < (lite ? 20 : 34); i++) mid += star((1.6 + r() * 1.2).toFixed(1), (0.5 + r() * 0.35).toFixed(2), i % (lite ? 4 : 3) === 0);
    $("#starsFar").innerHTML = far;
    $("#starsMid").innerHTML = mid;
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

  /* ---------- כוכב: גוף, סימני-משחק ושלט ---------- */
  const mixHex = (hex, to, a) => {
    const n = parseInt(String(hex).slice(1), 16), m = parseInt(to.slice(1), 16);
    const ch = (s) => Math.round(((n >> s) & 255) * (1 - a) + ((m >> s) & 255) * a);
    return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
  };
  // לכל כוכב משטח קבוע משלו (לפי שם-הקוד), כדי שלא ייראו כולם אותו עיגול
  const TEXTURES = ["tex1", "tex2", "tex3"];
  const textureOf = (slug) => TEXTURES[[...String(slug)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % TEXTURES.length];

  /** גוף הכוכב — אותו HTML לכוכב שבמסלול ולעותק שמתקרב. כל המידות יחסיות
      ל---d, ולכן הוא נראה זהה בכל גודל. image → האיור הסופי; אחרת כדור מצויר
      (הצללה, משטח, אור-שפה) עם אייקון-הנושא — רק אם הקובץ קיים (בלי 404). */
  function planetBodyHtml(p, state, extra = "") {
    const hasIcon = !p.image && (window.GALAXY_ICONS || []).includes(p.art);
    const ring = p.accent === "ring";
    const style = `--hue:${esc(p.hue)};--hue-hi:${mixHex(p.hue, "#ffffff", 0.45)};--hue-lo:${mixHex(p.hue, "#101a44", 0.42)}`;
    // האייקון מעל ההצללה והעמעום — הגוף מתעמעם, האייקון נשאר קריא
    return `<span class="pbody pbody--${state} pbody--${textureOf(p.art)}${extra}" style="${style}">` +
      `<span class="pbody__halo"></span><span class="pbody__glow"></span>` +
      (ring ? `<span class="pbody__ring pbody__ring--back"></span>` : "") +
      (p.image ? `<img class="pbody__art" src="${esc(p.image)}" alt="" />` : `<span class="pbody__base"></span>`) +
      `<span class="pbody__shade"></span>` +
      (p.image ? "" : `<span class="pbody__rim"></span>`) +
      (hasIcon ? `<img class="pbody__icon" src="/images/topics/${esc(p.art)}.png" alt="" />` : "") +
      (ring ? `<span class="pbody__ring pbody__ring--front"></span>` : "") +
      `</span>`;
  }

  /** סימני-משחק (ממשק, לא חלק מהכוכב): טבעת-התקדמות, כוכב-השלמה, "מומלץ
      עכשיו". כל אחד מוחלף באמנות סופית אם הוגדרה ב-GALAXY_ART.marks. */
  function planetMarksHtml(st) {
    const art = (window.GALAXY_ART && window.GALAXY_ART.marks) || {};
    let html = "";
    if (st.pct > 0 && st.pct < 100) {
      html += `<svg class="pmark pmark--ring" viewBox="0 0 100 100" aria-hidden="true">` +
        `<circle class="pmark__track" cx="50" cy="50" r="46"/>` +
        `<circle class="pmark__glow" cx="50" cy="50" r="46" pathLength="100" stroke-dasharray="${st.pct} 100"/>` +
        `<circle class="pmark__arc" cx="50" cy="50" r="46" pathLength="100" stroke-dasharray="${st.pct} 100"/></svg>`;
    }
    if (st.state === "done") {
      html += art.star
        ? `<img class="pmark pmark--star" src="${esc(art.star)}" alt="" />`
        : `<svg class="pmark pmark--star" viewBox="0 0 24 24" aria-hidden="true"><use href="#g-star"/></svg>`;
    }
    if (st.recommended) {
      const icon = art.recommended
        ? `<img src="${esc(art.recommended)}" alt="" />`
        : `<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#g-spark"/></svg>`;
      html += `<span class="pmark pmark--rec">${icon}<span>מומלץ עכשיו</span></span>`;
    }
    return html;
  }

  function planetHtml(p, st) {
    const sub = st.state === "done" ? "הושלם" : st.pct > 0 ? `${st.pct}%` : "טרם התחלנו";
    return `<button class="planet planet--${st.state}" type="button"
       data-key="${esc(p.key)}" data-state="${st.state}" data-angle="${p.angle}" data-ring="${p.ring}"
       aria-label="${esc(p.key)} — ${esc(sub)}${st.recommended ? " — מומלץ עכשיו" : ""}">
      <span class="planet__orb" style="--dur:${(6 + Math.random() * 3).toFixed(1)}s;--delay:${(Math.random() * 3).toFixed(1)}s">
        ${planetBodyHtml(p, st.state)}${planetMarksHtml(st)}
      </span>
      <span class="planet__label"><span class="planet__name">${esc(p.key)}</span><span class="planet__sub">${esc(sub)}</span></span>
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

  /* ---------- גאומטריה מותאמת-מסך ----------
     מבט אלכסוני = עיגול שנמעך אנכית (tilt). על מסך רחב המעיכה היא זו של
     הכיתה; על מסך לאורך אותה מעיכה דוחסת את כל המערכת לפס צר באמצע, ולכן
     האליפסה נפתחת אנכית — בדיוק כמה שהגובה הפנוי מרשה, ולא יותר. אין
     breakpoint: הערך נגזר מהמסך, ולכן המעבר רציף (כולל מסך כמעט-מרובע).
     בנוסף, חוק גאומטרי אחד לכל הטבעות: אם כוכב היה יושב על השמש, כל
     הטבעות נדחפות יחד החוצה — עד כמה שאפשר בלי לחרוג מהמסך. */
  const TILT_TALL = 0.66;  // התקרה למסך לאורך (הכיתה מגדירה את ערך-הבסיס)
  const FILL_V = 0.72;     // חלק הגובה שהמערכת אמורה למלא לפני שהתקרה עוצרת
  const GROW_MAX = 1.12;   // כמה מותר להגדיל את המערכת כשנשאר גובה פנוי
  const SUN_MIN_K = 0.80;  // עד כמה מותר להקטין את השמש כדי לפנות מקום לכוכב
  const SUN_HALO = 1.06;   // הכוכבים מתרחקים מהכותרת הזוהרת של השמש, לא רק מהדיסק
  const SUN_VMIN = 0.27;   // גודל-השמש שב-galaxy.css (--sun-size ברירת-מחדל 27vmin)

  function geometry(vp) {
    const { w, h } = vp;
    const small = Math.min(w, h) < 600;
    const min = Math.min(w, h);
    const list = [...document.querySelectorAll(".planet")].map((el) => ({
      el, a: (+el.dataset.angle * Math.PI) / 180, r: +el.dataset.ring,
    }));
    const dOf = (depth) => min * ((small ? 0.070 : 0.082) + depth * (small ? 0.042 : 0.052));
    const depthOf = (r, a) => (r * Math.sin(a) + 1) / 2; // 0 = רחוק (מאחורי השמש), 1 = קרוב
    const maxRing = Math.max(...list.map((p) => p.r), ...(CFG.rings || [0]));
    const EDGE = Math.max(8, min * 0.015);
    const plate = min * 0.075;   // מקום לשלט של הכוכב הקצה
    const clear = min * 0.02;    // המרווח המינימלי בין כוכב לשמש
    list.forEach((p) => { p.d = dOf(depthOf(p.r, p.a)); p.cos = Math.abs(Math.cos(p.a)); p.sin = Math.abs(Math.sin(p.a)); });
    const reach = (a, t) => Math.hypot(Math.cos(a), t * Math.sin(a)); // מרחק מהמרכז ל-r=1

    // 1) המעיכה: פותחים את האליפסה עד שהמערכת ממלאת את הגובה הפנוי
    const rx0b = Math.min(w * 0.455, h * 0.95); // חצי-הרוחב הבסיסי (כמו בשולחן)
    const edgeY = dOf(1) / 2 + min * 0.11;      // הכוכב הקצה + מקום לשלט שלו
    const want = ((h * FILL_V) / 2 - edgeY) / (rx0b * maxRing);
    let tilt = Math.min(TILT_TALL, Math.max(CFG.tilt || 0.42, want));

    // 2) אם המעיכה נעצרה בתקרה, נשאר גובה פנוי — ואז המערכת גדלה מעט, עד
    //    שהטבעת החיצונית או כוכב מתקרבים לשולי המסך. במסך רחב spare = 0.
    const spare = Math.max(0, want / TILT_TALL - 1);
    let rx0 = rx0b * Math.min(GROW_MAX, 1 + spare * 0.5);
    const RIM = Math.max(EDGE, min * 0.03); // הטבעת החיצונית לא נוגעת בזכוכית
    rx0 = Math.min(rx0, (w / 2 - RIM) / maxRing, (h / 2 - RIM) / (maxRing * tilt));
    list.forEach((p) => {
      if (p.cos > 0.001) rx0 = Math.min(rx0, (w / 2 - EDGE - p.d / 2) / (p.r * p.cos));
      if (p.sin > 0.001) rx0 = Math.min(rx0, (h / 2 - EDGE - p.d / 2 - plate) / (p.r * tilt * p.sin));
    });
    rx0 = Math.max(rx0, rx0b); // לעולם לא קטן מהבסיס

    // 3) מרווח מהשמש — אף כוכב לא יושב עליה. שלושה כלים, בסדר הזה:
    //    (א) השמש מתכווצת מעט (עד SUN_MIN_K), (ב) האליפסה נפתחת עוד — זה
    //    בדיוק מה שמרחיק את הכוכבים ש"מעל" ו"מתחת" לשמש, (ג) ורק אם נשאר
    //    לחץ — כל הטבעות נדחפות יחד החוצה. חוק אחד, בלי נושא מיוחד.
    const sunR0 = (min * SUN_VMIN) / 2;
    // התקרה לפתיחת האליפסה: הכוכבים והטבעות נשארים על המסך
    let fitTilt = (h / 2 - RIM) / (rx0 * maxRing);
    list.forEach((p) => { if (p.sin > 0.05) fitTilt = Math.min(fitTilt, (h / 2 - EDGE - p.d / 2 - plate) / (rx0 * p.r * p.sin)); });
    let sunR = sunR0;
    for (let i = 0; i < 5; i++) {
      sunR = sunR0;
      list.forEach((p) => {
        const allow = (rx0 * p.r * reach(p.a, tilt) - p.d / 2 - clear) / SUN_HALO; // רדיוס-שמש שהכוכב הזה מרשה
        sunR = Math.min(sunR, Math.max(allow, sunR0 * SUN_MIN_K));
      });
      let need = tilt;
      list.forEach((p) => {
        if (p.sin < 0.05) return;
        const t2 = ((sunR * SUN_HALO + p.d / 2 + clear) / (rx0 * p.r)) ** 2 - p.cos * p.cos; // = (tilt·sin)²
        if (t2 > 0) need = Math.max(need, Math.sqrt(t2) / p.sin);
      });
      const next = Math.min(TILT_TALL, Math.max(tilt, Math.min(need, fitTilt)));
      if (Math.abs(next - tilt) < 0.002) break;
      tilt = next;
    }
    // (ג) דחיפת הטבעות — רק אם אחרי הכל עוד יש כוכב על השמש
    let push = 0, room = 1;
    list.forEach((p) => {
      if (p.r >= 1) return;
      const needR = (sunR * SUN_HALO + p.d / 2 + clear) / (rx0 * reach(p.a, tilt));
      const fit = Math.min(
        p.cos > 0.001 ? (w / 2 - EDGE - p.d / 2) / (rx0 * p.cos) : Infinity,
        p.sin > 0.001 ? (h / 2 - EDGE - p.d / 2) / (rx0 * tilt * p.sin) : Infinity,
      );
      if (needR > p.r) push = Math.max(push, (needR - p.r) / (1 - p.r));
      room = Math.min(room, Math.max(0, (fit - p.r) / (1 - p.r)));
    });
    push = Math.min(push, room);
    const remap = (r) => r + (1 - r) * push;
    return { small, rx0, tilt, push, remap, list, dOf, depthOf, sunPx: sunR * 2 };
  }

  /** המקום שבו החללית "חונה": על הציר של השמש, מתחתיה, במרחק הקבוע —
      וזזה משם רק אם כוכב באמת יושב עליה. קודם מנסים הזזה קטנה הצידה (כדי
      שתישאר "מסלול-שיגור" מתחת לשמש), ורק אם אין מקום — יורדים. חוק אחד
      לכל המסכים; על מסך לאורך המסלולים יורדים, ולכן גם המרחק מהשמש גדל. */
  function shipPark(vp, items) {
    const min = Math.min(vp.w, vp.h);
    const sunEl = $("#sun");
    const sunR = (sunEl && sunEl.offsetWidth ? sunEl.offsetWidth : min * 0.27) / 2;
    const sh = ship.offsetHeight || min * 0.16, sw = ship.offsetWidth || min * 0.11;
    const shipR = sw / 2; // גוף החללית (בלי הלהבה שמתחתיה)
    const base = Math.max(min * 0.19, sunR + sh * 0.45 + min * 0.02);
    const limit = Math.max(base, vp.h / 2 - sh * 0.6);
    // נגיעה קלה בשפה מותרת (כך זה נראה גם בשולחן מאז 2B); רק כיסוי אמיתי מזיז.
    // הפתרון רציף: בגובה נתון כל כוכב חוסם קטע סימטרי סביב ה-x שלו, ואנחנו
    // בוחרים את ה-x הפנוי הקרוב ביותר לציר השמש. כשכוכב רק נוגע ההסחה היא
    // אפס, והיא גדלה איתו בהדרגה — ולכן שינוי של פיקסל לא מקפיץ את החללית.
    const xMax = vp.w / 2 - min * 0.02 - sw / 2;
    const blocked = (y) => items
      .map((it) => {
        const R = (shipR + it.d / 2) * 0.92, dy = it.y - y, s2 = R * R - dy * dy;
        return s2 > 0 ? [it.x - Math.sqrt(s2), it.x + Math.sqrt(s2)] : null;
      })
      .filter(Boolean);
    const nearestFree = (y) => {
      const iv = blocked(y);
      const free = (x) => iv.every(([l, r]) => x <= l || x >= r);
      if (free(0)) return 0;
      let best = null;
      iv.forEach((pair) => pair.forEach((x) => {
        if (Math.abs(x) <= xMax && free(x) && (best == null || Math.abs(x) < Math.abs(best))) best = x;
      }));
      return best;
    };
    const x0 = nearestFree(base);
    if (x0 != null) return { x: x0, y: base };
    for (let y = base; y <= limit; y += min * 0.015) {
      const x = nearestFree(y);
      if (x != null) return { x, y };
    }
    return { x: 0, y: base };
  }

  /** ההרכב יושב נמוך מהמרכז, כי השלטים התחתונים והחללית תלויים מתחת לשמש
      ואילו למעלה יש רק שלט או שניים. מחשבים מרכז-כובד לפי שטח (כוכבים,
      שלטים, חללית) ומחזירים כמה להזיז את העולם כדי שהוא יפול במרכז השטח
      הפנוי שבין ה-HUD לשורת-ההסבר. חוק אחד לכל המסכים, ותמיד קטן. */
  const WORLD_SHIFT_MAX = 0.035; // עד 3.5% מגובה המסך
  function compositionOffset(vp, items, park, plates) {
    const { w, h } = vp;
    let mass = 0, sum = 0;
    const add = (cyEl, area) => { mass += area; sum += cyEl * area; };
    items.forEach((it) => add(h / 2 + it.y, Math.PI * (it.d / 2) ** 2));
    plates.forEach((a) => add((a.t + a.b) / 2, (a.r - a.l) * (a.b - a.t)));
    add(h / 2 + park.y, ship.offsetWidth * ship.offsetHeight * 0.5);
    if (!mass) return 0;
    const hud = $(".hud"), hint = $("#hint");
    const top = hud ? hud.getBoundingClientRect().bottom : 0;
    const bottom = h - (hint && hint.offsetHeight ? hint.offsetHeight + Math.min(w, h) * 0.05 : Math.min(w, h) * 0.03);
    // רק מסך גבוה: שם ההרכב באמת "תלוי" נמוך. במסך רחב או כמעט-מרובע
    // ההרכב נשאר בדיוק כפי שהיה (הרמפה מגיעה ל-0 ביחס 1.2)
    const tall = Math.min(1, Math.max(0, (h / w - 1.2) / 0.2));
    if (!tall) return 0;
    const wanted = ((top + bottom) / 2 - sum / mass) * tall; // לאן להזיז את מרכז-הכובד
    const cap = h * WORLD_SHIFT_MAX;
    const off = Math.min(cap, Math.max(-cap, wanted));
    return Math.abs(off) < 3 ? 0 : off; // תזוזה זעירה לא שווה את זה
  }

  function layout() {
    const vp = viewport();
    if (!vp.ok || !CFG) return false;
    const { w, h } = vp;
    const geo = geometry(vp);
    const { rx0, tilt, remap } = geo;
    const sunEl = $("#sun");
    if (sunEl) sunEl.style.setProperty("--sun-size", `${geo.sunPx.toFixed(0)}px`);

    // טבעות-המסלול עצמן — אותה גאומטריה בדיוק
    // SVG כדי שהקו יידהה כלפי מעלה: החצי הרחוק של המסלול חיוור מהקרוב
    const rings = document.getElementById("rings");
    if (rings) {
      const ell = (CFG.rings || [])
        .map((r0) => {
          const r = remap(r0);
          return `<ellipse cx="${(w / 2).toFixed(0)}" cy="${(h / 2).toFixed(0)}" rx="${(rx0 * r).toFixed(0)}" ry="${(rx0 * r * tilt).toFixed(0)}" />`;
        })
        .join("");
      rings.innerHTML = `<svg class="rings__svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">${ell}</svg>`;
    }

    const items = geo.list.map((p) => {
      const r = remap(p.r);
      const x = Math.cos(p.a) * rx0 * r;
      const y = Math.sin(p.a) * rx0 * r * tilt;
      const depth = geo.depthOf(r, p.a);
      const d = geo.dOf(depth);
      const el = p.el;

      el.style.setProperty("--tx", `${x.toFixed(1)}px`);
      el.style.setProperty("--ty", `${y.toFixed(1)}px`);
      el.style.zIndex = String(10 + Math.round(depth * 40)); // קרוב מסתיר רחוק
      el.style.opacity = (0.68 + depth * 0.32).toFixed(2);   // אווירת-מרחק
      el.style.setProperty("--d", `${d.toFixed(0)}px`); // גם לשלט (הגשר של ה-hover)
      el.style.setProperty("--hit", "0px"); // מתמלא אחרי שכל המקומות ידועים
      el.querySelector(".planet__orb").style.setProperty("--d", `${d.toFixed(0)}px`);
      return { el, x, y, d, depth };
    });
    // שטח-נגיעה נוח לילד גם כשהכוכב קטן — שקוף, ותמיד חצי-דרך לשכן הקרוב
    items.forEach((it) => {
      const near = Math.min(...items.filter((o) => o !== it).map((o) => Math.hypot(o.x - it.x, o.y - it.y) - (o.d + it.d) / 2), Infinity);
      const room = Number.isFinite(near) ? near / 2 - 2 : 12;
      it.el.style.setProperty("--hit", `${Math.max(0, Math.min((HIT_MIN - it.d) / 2, room)).toFixed(0)}px`);
    });
    parked = shipPark(vp, items);
    // ההרכב (כוכבים + שלטים + חללית) מתמרכז בין ה-HUD לשורת-ההסבר: מחשבים
    // מרכז-כובד לפי שטח, ומזיזים את כל העולם כיחידה אחת. פריסה ראשונה רק כדי
    // לדעת איפה נופלים השלטים, ואז פריסה סופית עם ההיסט.
    const probe = placeLabels(items, vp, parked, 0) || [];
    const worldY = compositionOffset(vp, items, parked, probe);
    const world = $("#world");
    if (world) world.style.setProperty("--world-y", `${worldY.toFixed(0)}px`);
    const plates = placeLabels(items, vp, parked, worldY) || [];
    const platesBottom = plates.length ? Math.max(...plates.map((a) => a.b)) : 0;

    // שורת-ההסבר יושבת באמצע הרווח שמתחת למערכת, כדי שלא תיראה כמו כתובית
    // מנותקת בתחתית של מסך גבוה
    const hint = $("#hint");
    if (hint && hint.offsetHeight) {
      // הכל מהמקום המחושב (לא מהכדור שמרחף למעלה-למטה ולא מסגנון שעוד לא
      // הוחל), כדי שהשורה תיפול תמיד באותו מקום
      const low = Math.max(
        h / 2 + worldY + parked.y + ship.offsetHeight / 2,
        platesBottom,
        ...items.map((it) => h / 2 + worldY + it.y + it.d / 2),
      );
      const free = h - low; // הרווח שמתחת לכל מה שמצויר
      hint.style.setProperty("--hint-bottom", `${Math.max(Math.min(w, h) * 0.024, free / 2 - hint.offsetHeight / 2).toFixed(0)}px`);
    }
    return true;
  }

  const HIT_MIN = 44; // שטח-נגיעה מינימלי מומלץ (CSS px)

  /** שלטים ותגית "מומלץ עכשיו": כל אחד בוחר מקום — מתחת, מעל, בצד, או
      מתחת/מעל בהזזה הצידה — שבו הוא מכסה הכי מעט. לכסות כוכב אחר (שגם
      לוחצים עליו) או שלט אחר כמעט אסור; החללית, ה-HUD ושם הכיתה מסתירים או
      נסתרים, ולכן יקרים; שולי השמש זולים (השלטים מצוירים מעליה). הכוכבים
      הקרובים בוחרים ראשונים. רק השלטים זזים, לא הכוכבים. */
  function placeLabels(items, vp, park, worldY = 0) {
    if (sky.hidden) return; // שלט מוסתר נמדד כ-0; נקרא שוב אחרי שהשמיים מוצגים
    const gap = Math.max(6, Math.min(vp.w, vp.h) * 0.009);
    const cx = vp.w / 2, cy = vp.h / 2 + worldY; // מרכז העולם על המסך
    const EDGE = Math.max(12, Math.min(vp.w, vp.h) * 0.04); // שוליים שהשלטים לא חורגים מהם
    const box = (x, y, w, h) => ({ l: x - w / 2, r: x + w / 2, t: y - h / 2, b: y + h / 2 });
    const grow = (a, m) => ({ l: a.l - m, r: a.r + m, t: a.t - m, b: a.b + m });
    const fromRect = (r) => ({ l: r.left, r: r.right, t: r.top, b: r.bottom });
    const overlap = (a, b) => Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t));

    // קודם כל המדידות, ואז כל הכתיבות — בלי חישוב-פריסה חוזר לכל כוכב
    const core = $(".sun__core") || $("#sun"), sunR = core ? (core.offsetWidth / 2) * 1.08 : 0; // כולל הכותרת הזוהרת
    const obstacles = [
      { area: box(cx + park.x, cy + park.y, ship.offsetWidth, ship.offsetHeight * 1.35), weight: 10 }, // החללית מצוירת מעל השלטים
      { area: fromRect($(".hud").getBoundingClientRect()), weight: 20 },      // ה-HUD מעל השלטים — שלט מתחתיו לא נקרא
      { area: fromRect($("#sunLabel").getBoundingClientRect()), weight: 40 }, // שם הכיתה לא מתכסה, כמו כוכב
      { area: fromRect($("#hint span").getBoundingClientRect()), weight: 3 },
      // הכוכב עם ההילה והטבעת שסביבו, לא רק הכדור עצמו
      ...items.map((it) => ({ area: box(cx + it.x, cy + it.y, it.d * 1.2 + gap * 2, it.d * 1.2 + gap * 2), weight: 40, owner: it })),
    ];
    const plates = items.map((it) => {
      const label = it.el.querySelector(".planet__label"), rec = it.el.querySelector(".pmark--rec");
      return { it, label, lw: label.offsetWidth, lh: label.offsetHeight, rec, rw: rec ? rec.offsetWidth : 0, rh: rec ? rec.offsetHeight : 0 };
    });

    // כמה מהמלבן בתוך עיגול השמש (דגימה של 10×5 נקודות)
    const inSun = (a) => {
      let n = 0;
      for (let i = 0; i < 10; i++) for (let j = 0; j < 5; j++) {
        const x = a.l + ((a.r - a.l) * (i + 0.5)) / 10 - cx, y = a.t + ((a.b - a.t) * (j + 0.5)) / 5 - cy;
        if (x * x + y * y < sunR * sunR) n++;
      }
      return (n / 50) * (a.r - a.l) * (a.b - a.t);
    };
    const spotsFor = (it, w, h) => {
      const px = cx + it.x, py = cy + it.y, off = it.d / 2 + gap;
      const below = py + off + h / 2, above = py - off - h / 2;
      // מעל/מתחת השלט יכול לזוז הצידה, ותמיד נשאר בתוך שולי-המסך
      const lo = EDGE + w / 2 - px, hi = vp.w - EDGE - w / 2 - px;
      const fit = (sh) => (lo > hi ? (lo + hi) / 2 : Math.min(Math.max(sh, lo), hi));
      const s = w / 2 - it.d / 4; // בהזזה השלט עדיין נוגע בעמודה של הכוכב
      const shifts = s > 2 ? [0, s, -s] : [0];
      const spots = [];
      ["bottom", "top"].forEach((side) => shifts.forEach((sh) => {
        const shift = fit(sh);
        spots.push({ side, shift, area: box(px + shift, side === "bottom" ? below : above, w, h) });
      }));
      spots.splice(1, 0, { side: "right", shift: 0, area: box(px + off + w / 2, py, w, h) });
      spots.splice(2, 0, { side: "left", shift: 0, area: box(px - off - w / 2, py, w, h) });
      return spots;
    };
    // בחירה חמדנית (הקרובים קודם), ואז כמה סבבי שיפור: כל שלט בוחר שוב כשכל
    // השאר כבר במקומם — כך שלט שנבחר מוקדם מפנה מקום לתגית שבאה אחריו
    const slots = [];
    plates.sort((a, b) => b.it.depth - a.it.depth).forEach((p) => {
      slots.push({ p, el: p.label, spots: spotsFor(p.it, p.lw, p.lh), h: p.lh });
      if (p.rec) slots.push({ p, el: p.rec, spots: spotsFor(p.it, p.rw, p.rh), h: p.rh, rec: true });
    });
    const pick = slots.map(() => null);
    const cost = (k, sp, i) => {
      const a = sp.area, it = slots[k].p.it, h = slots[k].h;
      let score = i * h * 2 + inSun(a) * 24; // העדפה עדינה כשאין הבדל: מתחת > מעל > צד > מוזז
      obstacles.forEach((o) => { if (o.owner !== it) score += overlap(a, o.area) * o.weight; });
      pick.forEach((q, j) => { if (q && j !== k) score += overlap(a, grow(q.area, gap / 2)) * 20; });
      const out = Math.max(0, EDGE - a.l) + Math.max(0, a.r - (vp.w - EDGE)) + Math.max(0, EDGE - a.t) + Math.max(0, a.b - (vp.h - EDGE));
      return score + out * h * 40;
    };
    for (let round = 0, changed = true; changed && round < 4; round++) {
      changed = false;
      slots.forEach((slot, k) => {
        let best = null, bestScore = Infinity;
        slot.spots.forEach((sp, i) => { const c = cost(k, sp, i); if (c < bestScore) { bestScore = c; best = sp; } });
        if (best !== pick[k]) { pick[k] = best; changed = true; }
      });
    }

    $("#planets").style.setProperty("--label-gap", `${gap.toFixed(1)}px`);
    slots.forEach((slot, k) => {
      slot.p.it.el.dataset[slot.rec ? "rec" : "label"] = pick[k].side;
      slot.el.style.setProperty("--plate-shift", `${pick[k].shift.toFixed(1)}px`);
    });
    return pick.map((p) => p.area); // המלבנים שנבחרו — לשימוש בהרכב ובשורת-ההסבר
  }

  /** קודם כל המיקומים נכתבים כשהשמיים עוד מוסתרים — כך הסגנון הראשון שהדפדפן
      מחשב כבר סופי, ושום דבר (החללית, הכוכבים) לא "מחליק" למקומו בטעינה.
      אחר כך השמיים מוצגים ופורסים שוב (אותם ערכים) רק כדי למדוד ולהניח שלטים. */
  function layoutWhenReady(tries = 0) {
    if (layout()) {
      parkShip();
      sky.hidden = false;
      // עכשיו אפשר למדוד באמת (השלטים והחללית נמדדים רק כשהם מוצגים), ומה
      // שיוצא נכתב בלי מעבר — כך הסגנון הראשון שנצבע הוא כבר הסופי
      ship.style.transition = "none";
      layout();
      parkShip();
      void ship.offsetWidth;
      ship.style.transition = "";
      return;
    }
    if (tries > 120) { sky.hidden = false; return; }
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
      if (e.pointerType !== "mouse") return; // במגע אין ריחוף — והיסט שנשאר היה מזיז את העולם לכל הביקור
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
    if (!parked.y) parked = { x: 0, y: Math.min(vp.w, vp.h) * 0.19 }; // לפני הפריסה הראשונה
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
  const T_TURN = 195;    // פנייה אל הכוכב
  const T_LEAN = 135;    // הירתעות קטנה לאחור...
  const T_LAUNCH = 255;  // ...ואז הזינוק (חופף לסוף הפנייה — תנועה אחת רצופה)
  const T_FADE = 1075;    // החללית מתכווצת אל הכוכב; נעלמת כשהכוכב המתקרב בולע אותה (או כאן, אם אין)
  const T_ARRIVE = 1160;
  const SAMPLE_MS = 20;  // צפיפות ה-keyframes; הדפדפן מחבר ביניהם בקו ישר
  const CURVE = 0.055;   // גובה הקשת — 5.5% מאורך הדרך (עד 40px, ובמסך קטן עד 20px)
  const SUN_MARGIN = 12; // מרווח-נשימה סביב השמש, מעבר לחצי רוחב החללית
  const CURVE_MAX_BLOCKED = 130, CURVE_MAX_BLOCKED_SMALL = 62; // קשת חריגה — רק כשהשמש חוסמת
  const BANK = 5;        // הטיה נוספת לתוך הפנייה, במעלות

  // מצבי-המנוע: להבה (רוחב × אורך — מתארכת יותר משהיא מתרחבת) וזוהר.
  // ENGINE_AT קובע מתי כל מצב מגיע.
  // הערכים מרוסנים בכוונה: הלהבה האמיתית כבר זזה מבפנים (WebP מונפש), והקוד
  // רק מספר באיזה מצב המנוע נמצא. אנכית זז יותר מאופקית — לא להבת-גומי.
  const ENGINE = {
    idle:     { flameX: 0.94, flameY: 0.72, flameO: 0.80, glow: 0.12, glowScale: 0.70 },
    aim:      { flameX: 0.96, flameY: 0.80, flameO: 0.90, glow: 0.22, glowScale: 0.80 },
    ignition: { flameX: 1.00, flameY: 0.98, flameO: 1,    glow: 0.85, glowScale: 1 },
    boost:    { flameX: 1.06, flameY: 1.22, flameO: 1,    glow: 1,    glowScale: 1.12 },
    arrival:  { flameX: 0.96, flameY: 0.78, flameO: 0.35, glow: 0.20, glowScale: 0.85 },
  };
  const ENGINE_AT = [[0, "idle"], [110, "aim"], [255, "ignition"], [465, "boost"], [925, "boost"], [1110, "arrival"], [1160, "arrival"]];

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
  // מאיצה מהזינוק והלאה, אבל בלי "זינוק בסוף": חצי הדרך נעשה כבר ב-q≈0.54
  // של הטיסה (במקום q≈0.71), והפריים הגדול ביותר קטן ב-25% — כך התנועה נראית
  // רצופה ולא כמו המתנה ואז ריצה. q הוא ההתקדמות בתוך T_LAUNCH→T_ARRIVE, ולכן
  // הערך שורד שינויי-תזמון. עדיין עוברת ~70% מהדרך לפני שהיא מתחילה להיעלם.
  const boostEase = cubicBezier(0.35, 0.05, 0.6, 0.75);

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
    // נמדד ולא נקרא מ---tx: שכבת-הכוכבים נושאת את היסט ה-parallax והחללית לא,
    // וכך הטיסה, ה"תפיסה" והעותק-הגיבור מחושבים באותו מרחב בדיוק
    const wb = (ship.parentElement || sky).getBoundingClientRect();
    const eb = el.getBoundingClientRect(); // הכפתור עצמו — לא הכדור שמרחף בתוכו
    const T = { x: eb.left + eb.width / 2 - (wb.left + wb.width / 2), y: eb.top + eb.height / 2 - (wb.top + wb.height / 2) };
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

  /** מיקום החללית בזמן t לפי "צילום" הטיסה: חנייה → הירתעות → קשת מואצת. */
  function shipPos(f, t) {
    if (t <= T_LEAN) return { x: f.P.x, y: f.P.y };
    if (t < T_LAUNCH) {
      const k = (t - T_LEAN) / (T_LAUNCH - T_LEAN);
      const e = 1 - (1 - k) * (1 - k);
      return { x: f.P.x + (f.S.x - f.P.x) * e, y: f.P.y + (f.S.y - f.P.y) * e };
    }
    const p = boostEase((t - T_LAUNCH) / (T_ARRIVE - T_LAUNCH));
    return { x: bez(f.S.x, f.C.x, f.T.x, p), y: bez(f.S.y, f.C.y, f.T.y, p) };
  }

  /** פנייה → הירתעות → זינוק בקשת → כניסה לכוכב, ומנוע שמתעורר בהתאם.
      hp — תכנון הכוכב המתקרב (planHero): החללית נעלמת ברגע שהוא "בולע" אותה. */
  function flightAnimations(el, r0, hp, f = planFlight(el)) {
    const a0 = nearAngle(headingAt(f, 0), r0);
    const bankDir = Math.sign(nearAngle(headingAt(f, 1), a0) - a0) || 1;
    const posAt = (t) => shipPos(f, t);
    // החללית והכוכב נעים זה אל זה (הכוכב אל המרכז, החללית ממנו). הרגע שבו שפת
    // הכוכב עוברת עליה הוא רגע הכניסה: משם היא "נוסעת" בתוכו, מוסתרת מאחוריו,
    // ונעלמת — כך היא לא יוצאת מהצד השני ולא נעלמת באמצע החלל.
    let tIn = null;
    if (hp) {
      for (let t = T_HERO - 60; t <= T_ARRIVE; t += 5) {
        const s = posAt(t), c = hp.at(t);
        if (Math.hypot(s.x - c.x, s.y - c.y) < hp.r(t) - ship.offsetWidth * 0.15) { tIn = t; break; }
      }
      if (tIn == null) tIn = hp.tCatch; // רשת-ביטחון: הרגע שבו הכוכב עוד חיכה לה במקומו
    }
    const inside = (t) => tIn != null && t > tIn;
    const anchor = tIn != null ? posAt(tIn) : null;
    const hIn = tIn != null ? hp.at(tIn) : null;
    const where = (t) => {
      if (!inside(t)) return posAt(t);
      // נמשכת מהר פנימה, אל לב הכוכב — כך גם אם הכוכב מאחר בפריים, היא לא מבצבצת מהשפה
      const c = hp.at(t), k = 1 - 0.7 * Math.min(1, (t - tIn) / 90);
      return { x: c.x + (anchor.x - hIn.x) * k, y: c.y + (anchor.y - hIn.y) * k };
    };
    let fadeFrom = tIn == null ? T_FADE : tIn - 30;
    let fadeTo = tIn == null ? T_ARRIVE : Math.min(T_ARRIVE, tIn + 60);
    // כבר חופפת לכוכב ברגע ההחלפה (כוכב קרוב לחנייה)? נמוגה לפניה — אחרת העותק,
    // שנמצא מעל השמיים, היה "חותך" אותה בבת אחת
    if (hp) {
      const cH = hp.at(T_HERO), sH = posAt(T_HERO);
      if (Math.hypot(sH.x - cH.x, sH.y - cH.y) < hp.r(T_HERO) + ship.offsetHeight * 0.5 && fadeTo > T_HERO) {
        fadeTo = T_HERO;
        fadeFrom = Math.min(fadeFrom, T_HERO - 90);
      }
    }
    const frames = [];
    let heading = a0;
    for (let i = 0; ; i++) {
      const t = Math.min(i * SAMPLE_MS, T_ARRIVE);
      const { x, y } = where(t);
      let rot = a0, s = 1;
      const o = t <= fadeFrom ? 1 : t >= fadeTo ? 0 : 1 - (t - fadeFrom) / (fadeTo - fadeFrom);
      if (t < T_TURN) rot = r0 + (a0 - r0) * turnEase(t / T_TURN);
      if (t >= T_LAUNCH) {
        const q = (t - T_LAUNCH) / (T_ARRIVE - T_LAUNCH);
        if (!inside(t)) heading = nearAngle(headingAt(f, boostEase(q)), heading); // בפנים — כבר לא פונה
        rot = heading + bankDir * BANK * Math.sin(Math.PI * q); // חוזרת לאפס ליד הכוכב
        s = flightScale(q);
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
      anims.push(flame.animate(ENGINE_AT.map(at).map((k) => ({ offset: k.offset, easing: k.easing, opacity: k.flameO,
        transform: `scale(${k.flameX}, ${k.flameY})` })), { duration: T_ARRIVE, fill: "forwards" }));
    }
    if (glow) {
      anims.push(glow.animate(ENGINE_AT.map(at).map((k) => ({ offset: k.offset, easing: k.easing, opacity: k.glow,
        transform: `translate(-50%, -50%) scale(${k.glowScale})` })), { duration: T_ARRIVE, fill: "forwards" }));
    }
    return anims;
  }

  /** הכוכב "מקבל" את החללית: ברבע-השנייה האחרון גדל מעט וזוהר. */
  function receiveAnimations(el) {
    const from = T_ARRIVE - 305;
    const out = [el.animate([{ transform: planetTransform(el, 1.07) }, { transform: planetTransform(el, 1.125) }],
      { delay: from, duration: 250, easing: "cubic-bezier(.2,.8,.3,1)", fill: "forwards" })];
    const g = el.querySelector(".pbody__halo");
    if (g) out.push(g.animate([{ opacity: 0 }, { opacity: 0.85 }], { delay: from, duration: 250, easing: "ease-out", fill: "forwards" }));
    // השלט הוא ממשק, לא חלק מהכוכב — לא גדל איתו, נעלם כשהעולם מתחיל להתקרב
    el.querySelectorAll(".planet__label").forEach((n) =>
      out.push(n.animate([{ opacity: 1 }, { opacity: 0 }], { delay: 855, duration: 185, fill: "forwards" })));
    // סימני-המשחק (טבעת, כוכב, "מומלץ") — נעלמים רגע לפני שהעותק מחליף את הכוכב
    el.querySelectorAll(".pmark").forEach((n) =>
      out.push(n.animate([{ opacity: 1 }, { opacity: 0 }], { delay: T_HERO - 145, duration: 145, fill: "forwards" })));
    return out;
  }

  /* ---------- כניסה לעולם ----------
     לקראת סוף הטיסה נוצר עותק "גיבור" של הכוכב שנבחר: בגודלו הסופי (כדי
     שיישאר חד), מוקטן בדיוק למקום ולגודל של הכוכב המקורי, ומשם מתקרב אל
     המצלמה (FLIP). העותק מעתיק את הסגנון המחושב של הכדור ואת התמונות שבו,
     ולכן עובד כמו שהוא גם עם מציין-המקום של היום וגם עם איור עתידי. מאחוריו
     הצבע של הכוכב מתפשט עד שממלא את המסך, ומעל הכל — כיסוי-הניווט.       */
  const T_HERO = 925;       // העותק מחליף את הכוכב
  const T_FILL = 1015;      // הצבע יוצא מאחורי הכוכב
  const T_HERO_FULL = 1295; // הכוכב בגודלו, והצבע כבר מכסה את כל המסך
  const T_END = 1390;       // כיסוי-הניווט אטום → ניווט
  const T_MOVE_LATEST = 1135; // הכוכב יוצא אל המרכז כשהחללית נכנסת — לכל המאוחר כאן
  const HERO_VMIN = 0.38;   // קוטר סופי: 38vmin (בין 120 ל-520px)
  const HERO_BIAS = 0.035;  // קצת מתחת למרכז — כאילו מתקרבים אל פני הכוכב
  const HERO_SPIN = 4;      // סיבוב עדין כולל, במעלות. 0 = בלי סיבוב (לאיור עם כיוון ברור)
  const heroMoveEase = cubicBezier(0.2, 0.75, 0.25, 1); // התנועה אל המרכז
  const heroNearEase = cubicBezier(0, 0, 0.58, 1);      // ההתקרבות בעומק
  const fillGrow = cubicBezier(0.6, 0, 0.4, 1);         // הצבע: הילה צמודה, ואז מתפרץ לכל המסך
  const hero = $("#warpHero");
  const fill = $("#warpFill");

  /** לאן ובאיזה גודל הכוכב יתקרב — מחושב כבר ברגע הלחיצה, כדי שהחללית תדע
      מתי הוא בולע אותה. at(t) = המרכז בזמן t, r(t) = הרדיוס, בקואורדינטות של
      החללית (יחסית למרכז המסך). */
  function planHero(el, f) {
    const vp = viewport();
    const orb = el.querySelector(".planet__orb");
    const rc = orb.getBoundingClientRect();
    const c0 = { x: rc.left + rc.width / 2, y: rc.top + rc.height / 2 };
    const D = Math.min(520, Math.max(120, Math.min(vp.w, vp.h) * HERO_VMIN));
    const cf = { x: vp.w / 2, y: vp.h / 2 + vp.h * HERO_BIAS };
    const d0 = orb.offsetWidth * 1.1; // הכדור ברגע ההחלפה, אחרי הפולס של "קבלת החללית"
    const z0 = D / d0;
    const qn = (t) => Math.min(1, Math.max(0, (t - T_HERO) / (T_HERO_FULL - T_HERO)));
    const r = (t) => (D / 2) / (z0 + (1 - z0) * heroNearEase(qn(t)));
    // הכוכב גדל במקומו עד שהחללית מגיעה אליו, ורק אז נע אל המרכז — אחרת הוא
    // עוזב לפני שהיא נכנסת, והיא נעלמת במקום ריק. לכל שיגור הרגע שלו.
    // מרכז העולם, לא מרכז המסך: shipPos מחזיר קואורדינטות של #ship שיושב
    // בתוך .world ונושא איתו את --world-y
    const wb = (ship.parentElement || sky).getBoundingClientRect();
    const home = { x: c0.x - (wb.left + wb.width / 2), y: c0.y - (wb.top + wb.height / 2) };
    let tMove = T_MOVE_LATEST, tCatch = null;
    if (f) {
      for (let t = T_HERO - 60; t <= T_MOVE_LATEST; t += 5) {
        const s = shipPos(f, t);
        if (Math.hypot(s.x - home.x, s.y - home.y) < r(t) - ship.offsetWidth * 0.15) { tCatch = t; tMove = Math.max(T_HERO, t - 20); break; }
      }
    }
    const move = (t) => heroMoveEase(Math.min(1, Math.max(0, (t - tMove) / (T_HERO_FULL - tMove))));
    const at = (t) => { const k = move(t); return { x: home.x + (cf.x - c0.x) * k, y: home.y + (cf.y - c0.y) * k }; };
    return { vp, D, cf, at, r, move, tMove, tCatch };
  }

  /** העותק מחליף את הכוכב באותו פריים — אף פעם לא רואים שני כוכבים. */
  function spawnHero(el, plan, cue) {
    const { vp, D, cf } = plan;
    // השעון של הטיסה: כל מה שנוצר כאן מתחיל בזמן-השיגור T_HERO, לא ברגע שהקוד
    // רץ (ההבטחה נפתרת פריים מאוחר, ואנימציה חדשה מתחילה עוד פריים אחרי) — כך
    // הכוכב, הצבע והחללית ש"נוסעת" בתוכו זזים יחד. e = כמה מהזמן הזה כבר עבר.
    const base = cue && cue.startTime != null ? cue.startTime + T_HERO : null;
    const e = base == null ? 0 : Math.min(60, Math.max(0, (document.timeline.currentTime || base) - base));
    const onClock = (a) => { if (base != null) a.startTime = base; return a; };
    const orb = el.querySelector(".planet__orb");
    const cs = getComputedStyle(orb);
    const r = orb.getBoundingClientRect();
    const c0 = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    const pm = new DOMMatrixReadOnly(getComputedStyle(el).transform); // הפולס של הכוכב
    const d0 = orb.offsetWidth * Math.hypot(pm.a, pm.b);
    const om = cs.transform && cs.transform !== "none" ? new DOMMatrixReadOnly(cs.transform) : null;
    const rot0 = om ? (Math.atan2(om.b, om.a) * 180) / Math.PI : 0;
    const planet = byKey.get(el.dataset.key) || {};
    const hue = planet.hue || "#0e4a63";

    // אותו רכיב-גוף בדיוק כמו בכוכב שבמסלול, בקוטר D (כל המידות שלו יחסיות
    // ל---d) — ולכן ברגע ההחלפה הם זהים, עם איור סופי או עם מציין-המקום
    hero.style.cssText = `left:${(cf.x - D / 2).toFixed(1)}px;top:${(cf.y - D / 2).toFixed(1)}px;` +
      `width:${D.toFixed(1)}px;height:${D.toFixed(1)}px;--d:${D.toFixed(1)}px`;
    hero.innerHTML = planetBodyHtml(planet, el.dataset.state || "new", " pbody--picked");
    const heroGlow = hero.querySelector(".pbody__halo");
    const liveGlow = el.querySelector(".pbody__halo");
    const g0 = liveGlow ? Number(getComputedStyle(liveGlow).opacity) || 0 : 0;
    hero.hidden = false;
    orb.style.opacity = "0";

    // הגודל לפי עומק (1/z): מתקרב כמו עצם אמיתי, לא כמו כרטיס שגדל. הפריים הראשון
    // שמוצג הוא בזמן e (לא 0) — ולכן הפרמטרים מכוילים כך שדווקא בו העותק זהה לכוכב.
    const span = T_HERO_FULL - T_HERO;
    const ne = heroNearEase(e / span), me = plan.move(T_HERO + e);
    const z0 = ne < 1 ? (D / d0 - ne) / (1 - ne) : D / d0;
    const dx = (c0.x - cf.x) / (1 - me || 1), dy = (c0.y - cf.y) / (1 - me || 1);
    const rotStart = rot0 - HERO_SPIN * 0.8 * (e / span);
    const heroAt = (t) => {
      if (t <= T_HERO_FULL) {
        // גדל במקום מההתחלה; נע אל המרכז מרגע הכניסה של החללית (plan.tMove)
        const q = (t - T_HERO) / span, m = plan.move(t);
        return { x: dx * (1 - m), y: dy * (1 - m), s: 1 / (z0 + (1 - z0) * heroNearEase(q)), rot: rotStart + HERO_SPIN * 0.8 * q };
      }
      const q = (t - T_HERO_FULL) / (T_END - T_HERO_FULL); // ממשיך "לעבור דרכנו" בזמן שהצבע נסגר
      return { x: 0, y: 0, s: 1 + 0.07 * q, rot: rotStart + HERO_SPIN * (0.8 + 0.2 * q) };
    };
    const frames = [];
    for (let t = T_HERO; ; t += SAMPLE_MS) {
      const tt = Math.min(t, T_END), h = heroAt(tt);
      frames.push({ offset: (tt - T_HERO) / (T_END - T_HERO),
        transform: `translate(${h.x.toFixed(1)}px, ${h.y.toFixed(1)}px) scale(${h.s.toFixed(4)}) rotate(${h.rot.toFixed(2)}deg)` });
      if (tt >= T_END) break;
    }
    launchAnims.push(onClock(hero.animate(frames, { duration: T_END - T_HERO, fill: "forwards" })));
    launchAnims.push(onClock(heroGlow.animate([{ opacity: g0 }, { opacity: 0.9 }],
      { duration: T_HERO_FULL - T_HERO, easing: "ease-out", fill: "forwards" })));

    // הצבע: עיגול שמרכזו תמיד מאחורי הכוכב המתקרב. ב-T_FILL הוא עוד מוסתר
    // מאחוריו, ומשם גדל עד שהוא מכסה את הפינה הרחוקה ביותר מהמיקום הסופי —
    // רדיוס מחושב, לא scale קבוע מנוחש. (לפני T_FILL הוא שקוף — ב-CSS.)
    // מרכז אטום ושוליים רכים — אור שמתפשט מהכוכב, לא עיגול קשיח. החלק האטום
    // (FILL_SOLID מהרדיוס) הוא זה שחייב להגיע לפינה הרחוקה.
    const FILL_SOLID = 0.86;
    const far = Math.max(Math.hypot(cf.x, cf.y), Math.hypot(vp.w - cf.x, cf.y), Math.hypot(cf.x, vp.h - cf.y), Math.hypot(vp.w - cf.x, vp.h - cf.y));
    const R = far / FILL_SOLID + 4;
    fill.style.cssText = `left:${(cf.x - R).toFixed(1)}px;top:${(cf.y - R).toFixed(1)}px;` +
      `width:${(2 * R).toFixed(1)}px;height:${(2 * R).toFixed(1)}px;` +
      `background:radial-gradient(closest-side, ${hue} ${FILL_SOLID * 100}%, transparent)`;
    fill.hidden = false;
    const fillFrames = [];
    for (let t = T_FILL; ; t += SAMPLE_MS) {
      const tt = Math.min(t, T_HERO_FULL), h = heroAt(tt);
      const g = fillGrow((tt - T_FILL) / (T_HERO_FULL - T_FILL));
      const rNow = (D / 2) * h.s * 0.92 * (1 - g) + R * g;
      fillFrames.push({ offset: (tt - T_FILL) / (T_HERO_FULL - T_FILL), opacity: 1,
        transform: `translate(${h.x.toFixed(1)}px, ${h.y.toFixed(1)}px) scale(${(rNow / R).toFixed(4)})` });
      if (tt >= T_HERO_FULL) break;
    }
    launchAnims.push(onClock(fill.animate(fillFrames, { delay: T_FILL - T_HERO, duration: T_HERO_FULL - T_FILL, fill: "forwards" })));

    // השמיים נסוגים בהדרגה — עד כמעט שקופים כשהכוכב בגודלו
    const recede = (node, to) => node && launchAnims.push(onClock(node.animate([{ opacity: getComputedStyle(node).opacity }, { opacity: to }],
      { duration: T_HERO_FULL - T_HERO, easing: "ease-in", fill: "forwards" })));
    document.querySelectorAll("#sky .layer").forEach((n) => recede(n, 0.1));
    recede($("#rings"), 0);
    recede($("#sun"), 0.2);
    recede($("#planets"), 0.3); // הכוכבים האחרים: .28 × .3 ≈ .08
    recede(hud, 0);
  }

  /* ---------- שיגור: מכונת-מצבים קטנה ----------
     לחיצה ראשונה נועלת את היעד ומתחילה רצף אחד. לחיצה נוספת — בכל מקום
     במסך — מדלגת על מה שנשאר ונכנסת מיד לשיעור של הכוכב הראשון.
     navigationStarted מבטיח שהניווט קורה פעם אחת בלבד.                */
  const TRANSITION_KEY = "velaGalaxyTransition"; // נקרא ב-learn-board.html
  const COVER_AT = 1245;    // כיסוי-הניווט השטוח — רק בסוף, מעל הכוכב והצבע שכבר ממלא
  const COVER_MS = 145;     // ...ואטום לגמרי ב-1390, באותו צבע שבו learn-board נפתח
  const SKIP_MS = 110;      // דילוג: נסגר כמעט מיד, בלי הבזק לבן
  const REDUCED_MS = 140;   // תנועה מופחתת: רק מעבר-צבע קצר
  const WATCHDOG_MS = 2800; // רשת-ביטחון אם אנימציה לא מסתיימת (למשל לשונית ברקע)
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
      הכדור לא נוגעים. מתחילים מהגודל שיש לו ברגע הלחיצה (hover מגדיל אותו). */
  function planetTransform(el, s) {
    const tx = el.style.getPropertyValue("--tx") || "0px";
    const ty = el.style.getPropertyValue("--ty") || "0px";
    return `translate(calc(50% + ${tx}), calc(-50% + ${ty})) scale(${s})`;
  }
  function pressFrames(el) {
    const at = (s) => planetTransform(el, s);
    const t = getComputedStyle(el).transform, m = t && t !== "none" ? new DOMMatrixReadOnly(t) : null;
    const from = m ? Math.hypot(m.a, m.b) : 1;
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
      // הכדור מפסיק לצוף — כך העותק יתחיל בדיוק במקום שבו הוא נמצא
      el.querySelector(".planet__orb").style.animationPlayState = "paused";
      const flight = planFlight(el);
      const hp = planHero(el, flight);
      pressAnim = el.animate(pressFrames(el), { duration: 150, fill: "forwards" });
      launchAnims = flightAnimations(el, r0, hp, flight).concat(receiveAnimations(el));
      // שעון על ציר-האנימציות (לא setTimeout): דילוג משהה אותו, והעותק פשוט לא נוצר
      const cue = hero.animate([], { duration: T_HERO });
      launchAnims.push(cue);
      cue.finished.then(() => { if (launching && !skipped && !navigationStarted) spawnHero(el, hp, cue); }, () => { /* בוטל */ });
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
  function resetLaunch(keepHandoff) {
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
    // הכוכב המתקרב והצבע — מתפרקים; הכוכב המקורי חוזר לצוף ולהיראות
    hero.hidden = true;
    hero.innerHTML = "";
    hero.style.cssText = "";
    fill.hidden = true;
    fill.style.cssText = "";
    document.querySelectorAll(".planet__orb").forEach((o) => { o.style.opacity = ""; o.style.animationPlayState = ""; });
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
    // הניווט כבר יצא? המפתח שייך לדף שנפתח עכשיו — לא מוחקים אותו
    if (!keepHandoff) { try { sessionStorage.removeItem(TRANSITION_KEY); } catch (e) { /* לא קריטי */ } }
  }
  // יוצאים מהדף: מנקים את שכבות-השיגור עוד לפני ההקפאה, כדי שהתמונה שהדפדפן
  // שומר (bfcache) תהיה הגלקסיה ולא מסך צבוע
  addEventListener("pagehide", () => { if (launching) resetLaunch(navigationStarted); });
  addEventListener("pageshow", (e) => { if (e.persisted) resetLaunch(); });

  /** אמנות סופית (galaxy-data.js → GALAXY_ART): כל קובץ שהוגדר מחליף את
      מציין-המקום שלו. בלי קבצים — הכל נשאר מצויר ב-CSS/SVG. */
  function applyArt() {
    const A = window.GALAXY_ART || {};
    const img = (src, cls) => `<img class="${cls}" src="${esc(src)}" alt="" decoding="async" />`;
    // הקובץ מחליף את הציור — ואם הוא לא נטען, הציור חוזר בדיוק כפי שהיה
    const swap = (sel, src, cls, flag) => {
      const host = $(sel);
      if (!host || !src) return;
      const fallback = host.innerHTML;
      host.innerHTML = img(src, cls);
      if (flag) ship.classList.add(flag); // הגאומטריה של האיור; בלעדיו נשארת זו של הציור
      host.firstElementChild.addEventListener("error", () => {
        host.innerHTML = fallback;
        if (flag) ship.classList.remove(flag);
      }, { once: true });
    };
    swap(".ship__body", A.ship && A.ship.body, "ship__body-art", "ship--art");
    // הלהבה: תמונה מונפשת אחת שנשארת מותקנת. מצבי-המנוע מזיזים את השכבה
    // שמסביבה (scale/opacity) ולא נוגעים ב-src — כך הלולאה לא מתחילה מחדש.
    swap(".ship__flame", A.ship && A.ship.flame, "ship__flame-art", "ship--flame-art");
    if (A.sun) {
      const core = $(".sun__core");
      core.style.background = `url("${encodeURI(A.sun)}") center / contain no-repeat`;
      core.style.boxShadow = "none";
    }
    if (A.background) sky.style.setProperty("--bg", `url("${encodeURI(A.background)}")`);
  }

  /** אין מה להציג (אין הגדרת-מראה לכיתה, או שהשרת לא ענה) — הודעה ברורה
      במקום ספינר שמסתובב לנצח. */
  function unavailable() {
    $("#boot").innerHTML =
      `<p class="boot__msg">הגלקסיה של הכיתה שלך עוד בבנייה ✨<br /><a href="/learn">חזרה לנושאים</a></p>`;
  }

  /* ---------- עלייה ---------- */
  async function boot() {
    paintSky();
    applyArt();

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
    // רשת-ביטחון: תמונה שלא נטענה נעלמת — נשאר הכדור המצויר, בלי אייקון שבור
    document.querySelectorAll(".pbody__icon, .pbody__art").forEach((img) => img.addEventListener("error", () => img.remove()));
    $("#sunLabel").textContent = cfg.label;
    const doneN = states.filter((s) => s.state === "done").length;
    $("#hudSub").textContent = `${cfg.label} · ${planets.length} נושאים`;
    const starArt = window.GALAXY_ART && window.GALAXY_ART.marks && window.GALAXY_ART.marks.star;
    const stat = $("#hudStat");
    // <bdi dir="ltr"> — בלי זה ה-RTL הופך את "0 / 7" ל-"7 / 0"
    stat.innerHTML = (starArt ? `<img src="${esc(starArt)}" alt="" />` : `<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#g-star"/></svg>`) +
      `<bdi dir="ltr">${doneN} / ${planets.length}</bdi>`;
    stat.setAttribute("role", "img");
    stat.setAttribute("aria-label", `הושלמו ${doneN} מתוך ${planets.length} נושאים`);

    $("#boot").hidden = true;
    layoutWhenReady(); // מציג את השמיים אחרי שהמיקומים כבר כתובים
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

    // תגובה מיידית למגע: הכוכב נלחץ ברגע האצבע, בלי להמתין ל-click
    const press = (el, on) => { if (!launching) el.classList.toggle("is-press", on); };
    document.querySelectorAll(".planet").forEach((el) => {
      el.addEventListener("pointerdown", () => press(el, true));
      ["pointerup", "pointercancel", "pointerleave", "blur"].forEach((e) => el.addEventListener(e, () => press(el, false)));
      el.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") faceTo(el); });
      el.addEventListener("focus", () => faceTo(el));
      el.addEventListener("click", () => {
        if (launching) return skipLaunch(); // לחיצה שנייה (גם במקלדת) = דילוג; היעד לא משתנה
        startLaunch(el);
      });
    });
    sky.addEventListener("pointerleave", () => { if (!launching) setShip(parked.x, parked.y, 0); });
    // הגופנים (Fredoka/Rubik) משנים את רוחב השלטים — ממקמים שוב כשהם מוכנים
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!launching) layout(); });
  }

  boot();
})();
